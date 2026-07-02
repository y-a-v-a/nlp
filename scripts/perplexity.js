#!/usr/bin/env node

/**
 * The journey's scoreboard — held-out perplexity for every generative model
 * in this repository, measured on the same corpus with the same split.
 *
 *   node scripts/perplexity.js [path-to-corpus] [--write]
 *
 * With --write, the results are saved to scripts/perplexity.json, which
 * scripts/build-site.js reads to render the scoreboard on the homepage.
 * Everything is deterministic (fixed split, seeded PRNG), so re-running
 * reproduces the checked-in numbers exactly.
 *
 * WHAT IS BEING MEASURED
 *
 * Perplexity asks each model the same question at every position of text it
 * has never seen: "what probability did you give the word that actually came
 * next?" Averaging the surprise (see entropy/ — perplexity is just entropy
 * un-logged) gives a single number with a friendly reading: a perplexity of
 * 300 means the model is, on average, as uncertain as if it were choosing
 * uniformly among 300 words. Lower is better. Because every model here is
 * trained on the same text and asked about the same held-out text, the
 * numbers are directly comparable — a scoreboard across 70 years of ideas.
 *
 * THE RULES (the same for every word-level model)
 *
 * 1. Deterministic split. Every 5th sonnet is held out (the same convention
 *    as naive-bayes/); the models train on the remaining 4/5.
 * 2. One shared vocabulary: the words of the training split, plus a single
 *    <unk> ("unknown") token that stands for any held-out word never seen in
 *    training. Every word model pays the same price at those positions.
 * 3. Smoothing — the teachable moment. A raw counting model assigns
 *    probability ZERO to any transition it never saw, and a single zero makes
 *    the whole product zero: perplexity = infinity. The fix, standard in
 *    speech recognition since the 1980s, is to never quite say "impossible" —
 *    blend each model with a simpler fallback:
 *      - The unigram fallback is add-one (Laplace) smoothed:
 *          P(w) = (count(w) + 1) / (N + V + 1)
 *      - Counting models use Witten-Bell interpolation: for a context seen
 *        `total` times with `distinct` different continuations,
 *          λ = total / (total + distinct)
 *          P(w | context) = λ · P_model(w | context) + (1 − λ) · P_fallback(w)
 *        A context seen 200 times with 30 continuations earns trust
 *        (λ ≈ 0.87); one seen twice with two different continuations barely
 *        any (λ = 0.5) — the model trusts itself in proportion to its
 *        evidence, with no hand-tuned constants.
 *      - The fallback ladder mirrors the models: trigram-class models fall
 *        back to the smoothed bigram, which falls back to the unigram.
 *      - The neural LM has no counts to compute λ from (generalising to
 *        unseen contexts is precisely its trick), so it gets a fixed
 *        λ = 0.75 against the same bigram fallback.
 *
 * THE ASTERISKS (read before comparing rows)
 *
 * - The neural LM only models its 200 most frequent words: contexts it cannot
 *   represent fall back to the counting ladder, and targets outside its
 *   vocabulary get only the fallback share. Its in-vocabulary training
 *   perplexity (the number on the neural-lm/ page) is much lower — here it is
 *   graded on the WHOLE stream, like everyone else.
 * - The RNN is character-level, so it has no <unk> escape hatch: it must
 *   spell every rare word letter by letter while the word models pay one flat
 *   <unk> penalty. Its per-word figure is exact — total surprise over the
 *   held-out characters divided by the number of held-out words — but keep
 *   that asymmetry in mind when reading the table.
 */

const fs = require('fs');
const path = require('path');

const { tokenize } = require('../lib/tokenize');
const markov = require('../markov/core');
const ngramMarkov = require('../ngram-markov/core');
const probabilityMarkov = require('../probability-markov/core');
const ngramProbabilityMarkov = require('../ngram-probability-markov/core');
const neuralLm = require('../neural-lm/core');
const rnn = require('../rnn/core');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2).filter((a) => a !== '--write');
const WRITE = process.argv.includes('--write');
const corpusPath = args[0] || path.join(ROOT, 'corpora/sonnets-shakespeare.txt');

const NEURAL_EPOCHS = 15; // the neural-lm CLI default
const RNN_ITERATIONS = 5000; // the rnn CLI default
const SEED = 42; // the CLI convention
const NEURAL_LAMBDA = 0.75; // the neural net's fixed blend weight (no counts to derive one)
const HOLDOUT_EVERY = 5; // same deterministic split as naive-bayes/

// ---------------------------------------------------------------------------
// Split: every 5th sonnet held out, the rest is training data.
// ---------------------------------------------------------------------------
const raw = fs.readFileSync(corpusPath, 'utf8');
const docs = raw.split(/\r?\n\s*\r?\n/).map((d) => d.trim()).filter(Boolean);
const trainDocs = [];
const heldDocs = [];
docs.forEach((doc, i) => {
  if ((i + 1) % HOLDOUT_EVERY === 0) heldDocs.push(doc);
  else trainDocs.push(doc);
});
const trainWords = tokenize(trainDocs.join('\n\n'));
const heldWords = tokenize(heldDocs.join('\n\n'));

// ---------------------------------------------------------------------------
// The shared fallback: add-one smoothed unigram over train vocabulary + <unk>.
// ---------------------------------------------------------------------------
const counts = new Map();
for (const w of trainWords) counts.set(w, (counts.get(w) || 0) + 1);
const N = trainWords.length;
const V1 = counts.size + 1; // vocabulary + <unk>
const unigramP = (w) => ((counts.get(w) || 0) + 1) / (N + V1);
const oovCount = heldWords.filter((w) => !counts.has(w)).length;

// The cores use plain {} maps; guard against prototype keys (a token
// literally spelled "constructor" would otherwise hit Object.prototype).
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// ---------------------------------------------------------------------------
// The models, straight from the cores the demos and CLIs use.
// ---------------------------------------------------------------------------
const chainUniform = markov.buildChain(trainWords); // word -> [distinct followers]
const chainWeighted = probabilityMarkov.buildChain(trainWords); // word -> {w: {probability}}
const chain3Uniform = ngramMarkov.buildChain(trainWords, 3); // "a b" -> [distinct followers]
const chain3Weighted = ngramProbabilityMarkov.buildChain(trainWords, 2); // "a b" -> {w: {probability}}

// The one statistic the cores don't store: how often each context occurred
// (Witten-Bell needs it to decide how much to trust the context).
const total2 = new Map();
for (let i = 0; i < trainWords.length - 1; i++) {
  total2.set(trainWords[i], (total2.get(trainWords[i]) || 0) + 1);
}
const total3 = new Map();
for (let i = 0; i < trainWords.length - 2; i++) {
  const key = trainWords[i] + ' ' + trainWords[i + 1];
  total3.set(key, (total3.get(key) || 0) + 1);
}

// Witten-Bell smoothed bigram: λ of the model's own estimate, the rest to the
// unigram. `uniform` selects the markov/ (equal shares) vs probability-markov/
// (counted shares) reading of the same context.
function p2(prev, w, uniform) {
  if (!own(chainUniform, prev)) return unigramP(w);
  const followers = chainUniform[prev];
  const distinct = followers.length;
  const total = total2.get(prev);
  const lambda = total / (total + distinct);
  const pModel = uniform
    ? (followers.indexOf(w) !== -1 ? 1 / distinct : 0)
    : (own(chainWeighted[prev], w) ? chainWeighted[prev][w].probability : 0);
  return lambda * pModel + (1 - lambda) * unigramP(w);
}

// Witten-Bell smoothed trigram, falling back to the smoothed bigram.
function p3(a, b, w, uniform) {
  const key = a + ' ' + b;
  const chain = uniform ? chain3Uniform : chain3Weighted;
  if (!own(chain, key)) return p2(b, w, uniform);
  const followers = chain[key];
  const distinct = uniform ? followers.length : Object.keys(followers).length;
  const total = total3.get(key);
  const lambda = total / (total + distinct);
  const pModel = uniform
    ? (followers.indexOf(w) !== -1 ? 1 / distinct : 0)
    : (own(followers, w) ? followers[w].probability : 0);
  return lambda * pModel + (1 - lambda) * p2(b, w, uniform);
}

// Perplexity of a fully smoothed per-position probability function.
function perplexityOf(pFn) {
  let sumLn = 0;
  for (let i = 0; i < heldWords.length; i++) sumLn += Math.log(pFn(i));
  return Math.exp(-sumLn / heldWords.length);
}

// Support stats for the honest telling: how often does the weighted bigram's
// exact transition actually appear in training ("hits"), and how much better
// is it than the unigram at precisely those positions? This is the promise
// (context works) and the problem (it rarely applies at this scale) in two
// numbers.
function bigramStory() {
  let hits = 0;
  let lnBigramAtHits = 0;
  let lnUnigramAtHits = 0;
  for (let i = 1; i < heldWords.length; i++) {
    const prev = heldWords[i - 1];
    if (!own(chainUniform, prev)) continue;
    if (chainUniform[prev].indexOf(heldWords[i]) === -1) continue;
    hits++;
    lnBigramAtHits += Math.log(p2(prev, heldWords[i], false));
    lnUnigramAtHits += Math.log(unigramP(heldWords[i]));
  }
  return {
    hitShare: hits / (heldWords.length - 1),
    pplAtHits: Math.exp(-lnBigramAtHits / hits),
    unigramPplAtHits: Math.exp(-lnUnigramAtHits / hits),
  };
}

// Shared entry ladder: the first word of the stream has no context (unigram),
// the second only one word (bigram); from the third on, each model applies.
const w = (i) => heldWords[i];

// 1. Unigram baseline — no context at all, just word frequency.
const pplUnigram = perplexityOf((i) => unigramP(w(i)));

// 2. markov/ — one word of context, every distinct follower equally likely.
const pplMarkov = perplexityOf((i) => (i === 0 ? unigramP(w(i)) : p2(w(i - 1), w(i), true)));

// 3. probability-markov/ — one word of context, followers weighted by count.
const pplProbMarkov = perplexityOf((i) => (i === 0 ? unigramP(w(i)) : p2(w(i - 1), w(i), false)));

// 4. ngram-markov/ — two words of context (ngramSize 3), uniform followers.
const pplNgramMarkov = perplexityOf((i) =>
  i === 0 ? unigramP(w(i)) : i === 1 ? p2(w(0), w(1), true) : p3(w(i - 2), w(i - 1), w(i), true)
);

// 5. ngram-probability-markov/ — two words of context, weighted followers.
const pplNgramProb = perplexityOf((i) =>
  i === 0 ? unigramP(w(i)) : i === 1 ? p2(w(0), w(1), false) : p3(w(i - 2), w(i - 1), w(i), false)
);

// 6. neural-lm/ — two words of context, learned embeddings, vocab capped at
// the 200 most frequent training words. No counts to derive a Witten-Bell λ
// from (generalising to unseen contexts is precisely its trick), so it gets a
// fixed λ against the same smoothed-bigram fallback the trigram models use.
console.error(`training neural-lm (${NEURAL_EPOCHS} epochs, seed ${SEED})...`);
const lm = neuralLm.createModel(trainWords, { rng: neuralLm.mulberry32(SEED) });
for (let e = 0; e < NEURAL_EPOCHS; e++) lm.trainEpoch();
const pplNeural = perplexityOf((i) => {
  if (i === 0) return unigramP(w(i));
  if (i === 1) return p2(w(0), w(1), false);
  const pNn = lm.probOf(w(i - 2), w(i - 1), w(i));
  const fallback = p2(w(i - 1), w(i), false);
  if (pNn === null) return fallback; // context outside the net's vocabulary
  return NEURAL_LAMBDA * pNn + (1 - NEURAL_LAMBDA) * fallback;
});

// 7. rnn/ — character-level, the whole preceding stream as context. Its
// per-word perplexity is exact by the chain rule: the total surprise of the
// held-out character stream, divided by the number of held-out words.
console.error(`training rnn (${RNN_ITERATIONS} iterations, seed ${SEED})...`);
const rnnModel = rnn.createModel(trainWords.join(' '), { rng: rnn.mulberry32(SEED) });
for (let i = 0; i < RNN_ITERATIONS; i++) rnnModel.step();
const rnnEval = rnnModel.evalNll(heldWords.join(' '));
const pplRnn = Math.exp(rnnEval.nll / heldWords.length);
const rnnBitsPerChar = rnnEval.nll / rnnEval.scored / Math.LN2;

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
const rows = [
  { id: 'unigram', title: 'Word frequency (baseline)', dir: null, year: '—', context: 'none', ppl: pplUnigram, note: 'No model at all — just how common each word is.' },
  { id: 'markov', title: 'Markov chain', dir: 'markov', year: '1948', context: '1 word', ppl: pplMarkov, note: 'Distinct followers, all equally likely.' },
  { id: 'probability-markov', title: 'Probability Markov chain', dir: 'probability-markov', year: '1948', context: '1 word', ppl: pplProbMarkov, note: 'Followers weighted by how often they occurred.' },
  { id: 'ngram-markov', title: 'N-gram Markov chain', dir: 'ngram-markov', year: '1948', context: '2 words', ppl: pplNgramMarkov, note: 'Wider context, but followers still unweighted.' },
  { id: 'ngram-probability-markov', title: 'N-gram + probability', dir: 'ngram-probability-markov', year: '1948', context: '2 words', ppl: pplNgramProb, note: 'Wider context and weighted followers.' },
  { id: 'neural-lm', title: 'Neural language model', dir: 'neural-lm', year: '2003', context: '2 words', ppl: pplNeural, note: 'Learned embeddings, but only the top 200 words.' },
  { id: 'rnn', title: 'Character-level RNN', dir: 'rnn', year: '1997', context: 'whole prefix', ppl: pplRnn, note: `Spells every word letter by letter (${rnnBitsPerChar.toFixed(2)} bits/character); no <unk> escape hatch.` },
];

const story = bigramStory();

console.log('\nHeld-out perplexity — lower is better');
console.log(`corpus: ${path.relative(ROOT, corpusPath)} · train ${trainWords.length.toLocaleString()} words / held out ${heldWords.length.toLocaleString()} words (every ${HOLDOUT_EVERY}th sonnet) · ${oovCount} held-out tokens are <unk>`);
console.log('─'.repeat(78));
for (const r of rows) {
  console.log(
    `${r.title.padEnd(28)} ${('context: ' + r.context).padEnd(22)} ${r.ppl.toFixed(1).padStart(9)}`
  );
}
console.log('─'.repeat(78));
console.log(
  `the promise vs the problem: where the exact bigram transition WAS seen in training ` +
  `(${(100 * story.hitShare).toFixed(0)}% of positions), the bigram scores ${story.pplAtHits.toFixed(0)} ` +
  `against the unigram's ${story.unigramPplAtHits.toFixed(0)} at the same spots — ` +
  `context works, it just rarely applies at this scale.`
);
console.log('method: shared vocab + <unk>; add-one unigram fallback; Witten-Bell interpolation');
console.log('(trigram → bigram → unigram). See the header of this file for the full rules.');

if (WRITE) {
  const out = {
    corpus: path.relative(ROOT, corpusPath),
    trainWords: trainWords.length,
    heldWords: heldWords.length,
    holdoutEvery: HOLDOUT_EVERY,
    oovTokens: oovCount,
    neuralLambda: NEURAL_LAMBDA,
    seed: SEED,
    neuralEpochs: NEURAL_EPOCHS,
    rnnIterations: RNN_ITERATIONS,
    rnnBitsPerChar: Number(rnnBitsPerChar.toFixed(2)),
    bigramStory: {
      hitShare: Number(story.hitShare.toFixed(3)),
      pplAtHits: Number(story.pplAtHits.toFixed(1)),
      unigramPplAtHits: Number(story.unigramPplAtHits.toFixed(1)),
    },
    rows: rows.map((r) => ({ ...r, ppl: Number(r.ppl.toFixed(1)) })),
  };
  fs.writeFileSync(path.join(__dirname, 'perplexity.json'), JSON.stringify(out, null, 2) + '\n');
  console.log('\nwrote scripts/perplexity.json (used by scripts/build-site.js)');
}
