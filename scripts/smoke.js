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
  ['markov', [SHK, '20']],
  ['ngram-markov', [SHK, '3', '20']],
  ['probability-markov', [SHK, '20']],
  ['ngram-probability-markov', [SHK, '2', '20']],
  ['tfidf', [SHK, 'love']],
  ['zipf', [SHK, '15']],
  ['edit-distance', [SHK, 'beautie']],
  ['pmi', [SHK, '3']],
  ['naive-bayes', [SHK, BRW]],
  ['word-vectors', [SHK, 'heart']],
  ['bpe', [SHK, '100', 'fairest']],
  ['neural-lm', [SHK, '3', '12']],
  ['rnn', [SHK, '300', '80']],
  ['attention', [SHK]],
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

// ---------------------------------------------------------------------------
console.log('\n2. Core sanity (invariants)');
const { tokenize } = require('../lib/tokenize');
const words = tokenize(fs.readFileSync(SHK, 'utf8'));

assert(tokenize("Beauty’s rose").join(' ') === 'beautys rose', 'tokenize keeps possessives whole');

const zipf = require('../zipf/core');
const ranked = zipf.rank(words);
assert(ranked[0].freq >= ranked[1].freq && ranked[0].rank === 1, 'zipf ranks by frequency');
const prods = ranked.slice(0, 30).map(zipf.rankFreq);
assert(Math.max(...prods) / Math.min(...prods) < 10, 'zipf rank×freq within one order of magnitude');

const ed = require('../edit-distance/core');
assert(ed.editDistance('love', 'love').distance === 0, 'edit distance of identical = 0');
assert(ed.editDistance('loue', 'love').distance === 1, 'edit distance loue→love = 1');

const tf = require('../tfidf/core');
const tmodel = tf.buildModel(tf.splitDocuments(fs.readFileSync(SHK, 'utf8')).map(tokenize));
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

const rnn = require('../rnn/core');
const rm = rnn.createModel(rnn.toCharStream(tokenize, fs.readFileSync(SHK, 'utf8')), { seed: 1 });
let rl;
for (let i = 0; i < 200; i++) rl = rm.step();
assert(rl < Math.log(rm.Vc), 'rnn loss falls below the uniform baseline', `${rl.toFixed(3)} < ${Math.log(rm.Vc).toFixed(3)}`);

const att = require('../attention/core');
const am = att.buildEmbeddings(words, { topN: 200, window: 3 });
const aw = att.attend(am, tokenize('thy love is as fair'));
const rowSum = aw.weights[0].reduce((a, b) => a + b, 0);
assert(Math.abs(rowSum - 1) < 1e-6, 'attention rows are a probability distribution', `row sum ${rowSum}`);

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
