#!/usr/bin/env node

/**
 * Smoke + sanity tests for The NLP Journey. Dependency-free; run with `node
 * scripts/smoke.js` (CI does this on every push/PR).
 *
 * Three layers:
 *   1. CLI smoke   — run every technique's index.js against the corpus and
 *                    assert it exits 0 with non-empty output.
 *   2. Core sanity — require each shared core and assert a few invariants that
 *                    "exit 0" wouldn't catch (loss falls, distances, etc.).
 *   3. Link check  — every relative href/src in every HTML page resolves to a
 *                    real file (catches broken nav, demo scripts, core.js, …).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SHK = path.join(ROOT, 'corpora/sonnets-shakespeare.txt');
const BRW = path.join(ROOT, 'corpora/sonnets-browning.txt');

let failures = 0;
function ok(name) { console.log(`  ✓ ${name}`); }
function fail(name, detail) { failures++; console.log(`  ✗ ${name}${detail ? '  — ' + detail : ''}`); }
function assert(cond, name, detail) { cond ? ok(name) : fail(name, detail); }

// ---------------------------------------------------------------------------
console.log('\n1. CLI smoke (each index.js exits 0 with output)');
const CLIS = [
  ['eliza', []],
  ['markov', [SHK, '20']],
  ['ngram-markov', [SHK, '3', '20']],
  ['probability-markov', [SHK, '20']],
  ['ngram-probability-markov', [SHK, '2', '20']],
  ['pos-markov', [SHK, '20']],
  ['hmm-tagger', [SHK, 'they rose']],
  ['tfidf', [SHK, 'love']],
  ['zipf', [SHK, '15']],
  ['entropy', [SHK]],
  ['edit-distance', [SHK, 'beautie']],
  ['pmi', [SHK, '3']],
  ['naive-bayes', [SHK, BRW]],
  ['word-vectors', [SHK, 'heart']],
  ['bpe', [SHK, '100', 'fairest']],
  ['neural-lm', [SHK, '3', '12']],
  ['word2vec', [SHK, '10']],
  ['rnn', [SHK, '300', '80']],
  ['lstm-gru', ['20']],
  ['seq2seq', ['one two three four five six', '4']],
  ['attention', [SHK]],
  ['contextual-embeddings', [SHK]],
  ['rag', [SHK, 'the passage of time']],
];
for (const [tech, args] of CLIS) {
  try {
    const out = execFileSync('node', [path.join(ROOT, tech, 'index.js'), ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert(out.trim().length > 0, `${tech} CLI`, 'no output');
  } catch (e) {
    fail(`${tech} CLI`, (e.message || '').split('\n')[0]);
  }
}

// The scoreboard script (trains the neural models; ~7s, deterministic).
try {
  const out = execFileSync('node', [path.join(ROOT, 'scripts/perplexity.js')], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert(/Held-out perplexity/.test(out), 'perplexity scoreboard runs');
} catch (e) {
  fail('perplexity scoreboard runs', (e.message || '').split('\n')[0]);
}

// ---------------------------------------------------------------------------
console.log('\n2. Core sanity (invariants)');
const { tokenize } = require('../lib/tokenize');
const words = tokenize(fs.readFileSync(SHK, 'utf8'));

assert(tokenize("Beauty’s rose").join(' ') === 'beautys rose', 'tokenize keeps possessives whole');
const metrics = require('../lib/metrics');
const metricSample = metrics.evaluate(['A', 'A', 'B', 'B'], ['A', 'B', 'B', 'B'], ['A', 'B']);
assert(metricSample.matrix.A.B === 1 && metricSample.accuracy === 0.75 &&
  metricSample.perLabel.A.recall === 0.5,
  'evaluation metrics preserve confusion direction and per-label recall');

const eliza = require('../eliza/core');
const elizaState = eliza.createState();
const elizaResult = eliza.respond(elizaState, 'I need some help with my life.');
assert(elizaResult.ruleIndex === 0 && /^Why do you need/.test(elizaResult.reply),
  'eliza matches the first rule and reflects pronouns');

const posm = require('../pos-markov/core');
assert(posm.tag('the') === 'Determiner' && posm.tag('quickly') === 'Adverb' &&
  posm.tag('running') === 'Verb' && posm.tag('sonnet') === 'Noun',
  'pos-markov tagger: lexicon, suffix rule, and noun fallback');
const posChain = posm.buildChain(posm.tagWords(words));
const posGen = posm.generate(posChain, 12);
assert(posGen.length === 12 && posGen.every((t) => t.word && t.tag),
  'pos-markov generates the requested length of tagged states');

const hmm = require('../hmm-tagger/core');
const hmmModel = hmm.train(words);
const hmmResult = hmm.viterbi(hmmModel, tokenize('they rose'));
assert(hmmResult.tags[1] === 'Verb' && hmm.baselineTag('rose') === 'Noun',
  'hmm-tagger resolves "rose" to Verb in context where the baseline always says Noun');

const zipf = require('../zipf/core');
const ranked = zipf.rank(words);
assert(ranked[0].freq >= ranked[1].freq && ranked[0].rank === 1, 'zipf ranks by frequency');
const prods = ranked.slice(0, 30).map(zipf.rankFreq);
assert(Math.max(...prods) / Math.min(...prods) < 10, 'zipf rank×freq within one order of magnitude');

const entropy = require('../entropy/core');
const charStream = entropy.charStream(words);
const h0 = entropy.zeroOrderEntropy(charStream).entropy;
const h1 = entropy.conditionalEntropy(charStream, 1).entropy;
assert(h1 < h0, 'entropy: one character of context lowers entropy', `${h1.toFixed(3)} < ${h0.toFixed(3)}`);

const ed = require('../edit-distance/core');
assert(ed.editDistance('love', 'love').distance === 0, 'edit distance of identical = 0');
assert(ed.editDistance('loue', 'love').distance === 1, 'edit distance loue→love = 1');

const tf = require('../tfidf/core');
const tdocs = tf.splitDocuments(fs.readFileSync(SHK, 'utf8'));
assert(tdocs.length === 154, 'tfidf splitDocuments keeps exactly the 154 sonnets', `${tdocs.length}`);
assert(tf.splitDocuments('one single paragraph of ordinary pasted prose that runs on to twenty words or a little more than that in one line').length === 1,
  'tfidf splitDocuments accepts a plain ≥20-word paragraph (your-own-text)');
const tmodel = tf.buildModel(tdocs.map(tokenize));
const res = tf.search(tmodel, tokenize('love'));
assert(res.length > 0 && res[0].score >= res[res.length - 1].score, 'tfidf search ranks descending');

const pmi = require('../pmi/core');
const coll = pmi.topCollocations(words, { window: 3, minCount: 4 });
assert(coll.length > 0 && coll[0].pmi > 0, 'pmi returns positive top collocation');

const nb = require('../naive-bayes/core');
const nbm = nb.train(
  nb.splitDocuments(fs.readFileSync(SHK, 'utf8')).map(tokenize),
  nb.splitDocuments(fs.readFileSync(BRW, 'utf8')).map(tokenize),
  'Shakespeare', 'Browning',
);
assert(nb.classify(nbm, tokenize('Shall I compare thee to a summers day')).label === 'Shakespeare',
  'naive-bayes classifies a Shakespeare line correctly');

const wv = require('../word-vectors/core');
const wvm = wv.build(words, { topN: 200, window: 3 });
const nn = wv.nearest(wvm, 'heart', 5);
assert(nn && nn.length === 5 && nn[0].score <= 1.0001, 'word-vectors nearest returns ranked neighbours');

const bpe = require('../bpe/core');
const learned = bpe.learn(words, 100);
assert(bpe.segment('fairest', learned.merges, 100).length < 8, 'bpe merges shrink the token count');

const nlm = require('../neural-lm/core');
const lm = nlm.createModel(words, { seed: 1 });
const l1 = lm.trainEpoch();
const l2 = lm.trainEpoch();
assert(l2 < l1, 'neural-lm loss decreases', `${l1.toFixed(3)} -> ${l2.toFixed(3)}`);
const pOf = lm.probOf('my', 'love', 'is');
assert(typeof pOf === 'number' && pOf > 0 && pOf < 1, 'neural-lm probOf returns a probability', `${pOf}`);
assert(lm.probOf('xyzzy-not-a-word', 'love', 'is') === null, 'neural-lm probOf null on unknown context');

const w2v = require('../word2vec/core');
const w2vModel = w2v.createModel(words, { V: 50, dim: 8, window: 3, negatives: 3, seed: 1 });
const w2vL1 = w2vModel.trainEpoch();
const w2vL2 = w2vModel.trainEpoch();
assert(w2vL2 < w2vL1, 'word2vec loss decreases', `${w2vL1.toFixed(3)} -> ${w2vL2.toFixed(3)}`);

const rnn = require('../rnn/core');
const rm = rnn.createModel(rnn.toCharStream(tokenize, fs.readFileSync(SHK, 'utf8')), { seed: 1 });
let rl;
for (let i = 0; i < 200; i++) rl = rm.step();
assert(rl < Math.log(rm.Vc), 'rnn loss falls below the uniform baseline', `${rl.toFixed(3)} < ${Math.log(rm.Vc).toFixed(3)}`);
const rnnEval = rm.evalNll('shall i compare thee');
assert(rnnEval.nll > 0 && rnnEval.scored === 19 && rnnEval.skipped === 0,
  'rnn evalNll scores every transition of a known-charset probe', JSON.stringify(rnnEval));

const gated = require('../lstm-gru/core');
const memoryTrial = gated.runTrial(1, 40);
assert(Math.abs(memoryTrial.recalled.rnn) < 0.01,
  'vanilla RNN signal fades across a long delay', memoryTrial.recalled.rnn.toFixed(4));
assert(memoryTrial.recalled.lstm > 0.6 && memoryTrial.recalled.gru > 0.6,
  'LSTM and GRU retain the delayed signal', JSON.stringify(memoryTrial.recalled));
assert(memoryTrial.traces.lstm.length === 42 && memoryTrial.traces.gru.length === 42,
  'gated cells return one trace row per store/wait/recall step');

const seq = require('../seq2seq/core');
assert(seq.run('one two three', 3).accuracy === 1,
  'seq2seq reproduces a sequence that fits through the context');
assert(seq.run('one two three four five', 3).accuracy === 0.6,
  'seq2seq exposes information loss beyond context capacity');

const att = require('../attention/core');
const am = att.buildEmbeddings(words, { topN: 200, window: 3 });
const aw = att.attend(am, tokenize('thy love is as fair'));
const rowSum = aw.weights[0].reduce((a, b) => a + b, 0);
assert(Math.abs(rowSum - 1) < 1e-6, 'attention rows are a probability distribution', `row sum ${rowSum}`);

const contextual = require('../contextual-embeddings/core');
const cm = contextual.build(words, { topN: 300, window: 3 });
const cc = contextual.compare(cm, tokenize('thy fair face is bright'),
  tokenize('a fair judgement and honest mind'), 'fair', 2);
assert(cc && cc.similarity < 0.999 && cc.similarity > 0,
  'context changes a static word vector', cc && cc.similarity.toFixed(3));

const rag = require('../rag/core');
const rdocs = rag.splitDocuments(fs.readFileSync(SHK, 'utf8')).map(tokenize);
const rret = rag.retrieve(rdocs, tokenize('the passage of time'), 3);
assert(rret.length === 3 && rret[0].score >= rret[2].score, 'rag retrieve ranks descending');

// ---------------------------------------------------------------------------
console.log('\n3. Link check (relative href/src resolve)');
function htmlFiles(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) htmlFiles(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}
let linkBroken = 0, linkChecked = 0;
for (const file of htmlFiles(ROOT, [])) {
  const html = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  const re = /(?:href|src)="([^"#]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1];
    if (/^(https?:|mailto:|data:|#)/.test(url)) continue;
    linkChecked++;
    if (!fs.existsSync(path.resolve(dir, url))) {
      linkBroken++;
      console.log(`  ✗ broken: ${path.relative(ROOT, file)} -> ${url}`);
    }
  }
}
assert(linkBroken === 0, `all ${linkChecked} relative links resolve`);

// ---------------------------------------------------------------------------
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)\n`);
process.exit(failures === 0 ? 0 : 1);
