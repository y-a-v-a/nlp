#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');

// Validate arguments
if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [window-size]');
  process.exit(1);
}

const filePath = process.argv[2];
// Words within ±window of each other count as co-occurring. Default 3.
const window = parseInt(process.argv[3]) || 3;

// Minimum co-occurrence count before a pair is allowed into the ranking.
// PMI is biased toward rare events: a pair that appears exactly once, where
// both words are themselves rare, gets a huge PMI for no meaningful reason.
// Requiring at least this many joint observations filters out that noise and
// leaves genuine, repeated collocations. This threshold is the standard
// practical "hack" that makes PMI usable on real corpora.
const MIN_COOCCURRENCE = 4;

try {
  const text = fs.readFileSync(filePath, 'utf8');

  // Use the shared tokenizer so counts match every other demo
  const words = tokenize(text);

  if (words.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  // Step 1: count how often each word occurs on its own.
  // These single counts give us P(x) and P(y).
  const wordCounts = {};
  for (const word of words) {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  }

  // Step 2: count how often each unordered word pair co-occurs within the
  // window. For every word we look ahead up to `window` positions and record
  // the pair. Counting only forward pairs (and storing the pair sorted) keeps
  // each co-occurrence counted exactly once — PMI is symmetric, so the pair
  // {a,b} is the same as {b,a}.
  const pairCounts = {};
  let totalPairs = 0; // total number of co-occurrence observations
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j <= i + window && j < words.length; j++) {
      const a = words[i];
      const b = words[j];
      if (a === b) continue; // ignore a word co-occurring with itself
      const key = a < b ? a + '\t' + b : b + '\t' + a;
      pairCounts[key] = (pairCounts[key] || 0) + 1;
      totalPairs++;
    }
  }

  // Step 3: turn the single-word counts into the same "co-occurrence slot"
  // denominator. Each token participates in up to 2*window pair observations
  // (window neighbours on each side), so the marginal probability of a word
  // appearing in a co-occurrence slot is its count over the total slots.
  // Using the same totalPairs denominator for P(x), P(y) and P(x,y) keeps the
  // PMI ratio dimensionally consistent.
  const wordPairTotals = {};
  for (let i = 0; i < words.length; i++) {
    let neighbours = 0;
    for (let j = i + 1; j <= i + window && j < words.length; j++) neighbours++;
    for (let j = i - 1; j >= i - window && j >= 0; j--) neighbours++;
    wordPairTotals[words[i]] = (wordPairTotals[words[i]] || 0) + neighbours;
  }

  // Step 4: compute PMI for every pair that clears the count threshold.
  //   P(x,y) = pairCount / totalPairs
  //   P(x)   = wordPairTotals[x] / (2 * totalPairs)   (each pair has two ends)
  //   PMI    = log2( P(x,y) / (P(x) * P(y)) )
  const totalEnds = 2 * totalPairs;
  const scored = [];
  for (const key in pairCounts) {
    const count = pairCounts[key];
    if (count < MIN_COOCCURRENCE) continue;
    const [x, y] = key.split('\t');
    const pXY = count / totalPairs;
    const pX = wordPairTotals[x] / totalEnds;
    const pY = wordPairTotals[y] / totalEnds;
    const pmi = Math.log2(pXY / (pX * pY));
    scored.push({ x, y, count, pmi });
  }

  const totalTokens = words.length;
  const vocabSize = Object.keys(wordCounts).length;
  console.log(
    `Corpus: ${totalTokens} tokens, ${vocabSize} unique words.\n` +
      `Co-occurrence window: ±${window} words.  ` +
      `${totalPairs} pair observations, ` +
      `${Object.keys(pairCounts).length} distinct pairs.\n` +
      `Keeping only pairs seen ≥ ${MIN_COOCCURRENCE} times: ` +
      `${scored.length} pairs ranked.\n`,
  );

  // Step 5: show a sample of the data structure — a handful of pairs with
  // their joint counts and PMI, so the shape is visible before the ranking.
  console.log('Sample of the pair → {count, PMI} data structure:');
  console.log('─'.repeat(52));
  const sample = scored.slice(0, 6);
  for (const p of sample) {
    console.log(
      `  ${(p.x + ' + ' + p.y).padEnd(28)} ` +
        `count=${String(p.count).padStart(3)}  PMI=${p.pmi.toFixed(2)}`,
    );
  }
  console.log();

  // Step 6: the readable result — the strongest collocations by PMI.
  // High positive PMI means the two words occur together far more than chance
  // would predict: a genuine association rather than two common words bumping
  // into each other.
  const ranked = scored.slice().sort((a, b) => b.pmi - a.pmi);
  const topN = 20;
  console.log(`Top ${topN} collocations by PMI:`);
  console.log('rank  word pair                     count   PMI');
  console.log('─'.repeat(52));
  for (let i = 0; i < Math.min(topN, ranked.length); i++) {
    const p = ranked[i];
    console.log(
      `${String(i + 1).padStart(4)}  ` +
        `${(p.x + ' + ' + p.y).padEnd(28)}  ` +
        `${String(p.count).padStart(4)}  ` +
        `${p.pmi.toFixed(2).padStart(6)}`,
    );
  }

  // Step 7: a textual bar chart of the top 10 PMI scores so the ranking is
  // visible at a glance.
  console.log();
  const maxPmi = ranked[0].pmi;
  const unit = maxPmi / 32;
  console.log('Top 10 collocations (bar length ∝ PMI):');
  for (let i = 0; i < Math.min(10, ranked.length); i++) {
    const p = ranked[i];
    const bar = '▇'.repeat(Math.max(1, Math.round(p.pmi / unit)));
    console.log(`  ${(p.x + ' + ' + p.y).padEnd(24)} ${bar} ${p.pmi.toFixed(2)}`);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
