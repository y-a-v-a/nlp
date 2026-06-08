#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');

// Validate arguments
if (process.argv.length < 3) {
  console.error(
    'Usage: node index.js <path-to-text-file> [num-merges] [word-to-trace]',
  );
  process.exit(1);
}

const filePath = process.argv[2];
const numMerges = parseInt(process.argv[3]) || 300;
const wordToTrace = process.argv[4] || 'fairest';

// The end-of-word marker. Appending it to every word lets BPE distinguish a
// piece that ends a word ("est</w>") from the same letters mid-word ("est"),
// and stops merges from ever crossing a word boundary.
const EOW = '</w>';

/**
 * Split a word into its starting symbol sequence: one symbol per character,
 * plus the end-of-word marker as a final symbol.
 *   "fairest" -> ["f", "a", "i", "r", "e", "s", "t", "</w>"]
 */
function toSymbols(word) {
  return word.split('').concat(EOW);
}

/**
 * Count every adjacent symbol pair across all words, weighting each word's
 * pairs by how often that word appears in the corpus.
 * Returns a Map from "left\tright" -> total weighted frequency.
 */
function countPairs(vocab) {
  const pairs = new Map();
  for (const { symbols, freq } of vocab) {
    for (let i = 0; i < symbols.length - 1; i++) {
      const key = symbols[i] + '\t' + symbols[i + 1];
      pairs.set(key, (pairs.get(key) || 0) + freq);
    }
  }
  return pairs;
}

/**
 * Pick the most frequent pair. Ties are broken by lexical order of the joined
 * pair so that runs are fully deterministic and reproducible.
 */
function bestPair(pairs) {
  let best = null;
  let bestFreq = -1;
  for (const [key, freq] of pairs) {
    if (
      freq > bestFreq ||
      (freq === bestFreq && key < best)
    ) {
      best = key;
      bestFreq = freq;
    }
  }
  return best === null ? null : { key: best, freq: bestFreq };
}

/**
 * Apply one merge rule (left + right -> leftright) to a symbol sequence.
 */
function applyMerge(symbols, left, right) {
  const merged = left + right;
  const out = [];
  let i = 0;
  while (i < symbols.length) {
    if (i < symbols.length - 1 && symbols[i] === left && symbols[i + 1] === right) {
      out.push(merged);
      i += 2;
    } else {
      out.push(symbols[i]);
      i += 1;
    }
  }
  return out;
}

/**
 * Segment a single word using the first `upTo` learned merge rules, in order.
 * Used to trace how a word's tokenization evolves as merges accumulate.
 */
function segment(word, merges, upTo) {
  let symbols = toSymbols(word);
  for (let m = 0; m < Math.min(upTo, merges.length); m++) {
    symbols = applyMerge(symbols, merges[m].left, merges[m].right);
  }
  return symbols;
}

// Render a symbol sequence in a readable way, keeping the </w> marker visible.
function show(symbols) {
  return symbols.join(' ');
}

try {
  const text = fs.readFileSync(filePath, 'utf8');

  // Step 1: use the shared tokenizer so the word set matches every other demo.
  const words = tokenize(text);

  if (words.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  // Step 2: count word frequencies, then represent each UNIQUE word as a
  // character sequence ending in </w>, weighted by how often it occurs. BPE
  // operates on this frequency-weighted set, not on the raw token stream.
  const wordFreq = {};
  for (const word of words) {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  }
  const uniqueWords = Object.keys(wordFreq).sort(); // sorted for determinism
  let vocab = uniqueWords.map((word) => ({
    symbols: toSymbols(word),
    freq: wordFreq[word],
  }));

  // The starting vocabulary is the set of distinct symbols (characters + </w>).
  const baseSymbols = new Set();
  for (const { symbols } of vocab) {
    for (const s of symbols) baseSymbols.add(s);
  }

  // Step 3: run BPE. Repeatedly find the most frequent adjacent pair and merge
  // it everywhere, recording the ordered merge rule and growing the vocabulary.
  const merges = [];
  const subwordVocab = new Set(baseSymbols);
  for (let iter = 0; iter < numMerges; iter++) {
    const pairs = countPairs(vocab);
    if (pairs.size === 0) break;
    const best = bestPair(pairs);
    if (!best || best.freq < 1) break;
    const [left, right] = best.key.split('\t');
    merges.push({ left, right, freq: best.freq });
    subwordVocab.add(left + right);
    vocab = vocab.map(({ symbols, freq }) => ({
      symbols: applyMerge(symbols, left, right),
      freq,
    }));
  }

  // ----------------------------------------------------------------------
  // OUTPUT (1): DATA STRUCTURE — the learned merge rules and vocab size.
  // ----------------------------------------------------------------------
  console.log(
    `Corpus: ${words.length} tokens, ${uniqueWords.length} unique words.`,
  );
  console.log(
    `Starting symbols: ${baseSymbols.size} (characters + ${EOW}).`,
  );
  console.log(
    `Ran ${merges.length} merges -> final subword vocabulary: ${subwordVocab.size} units.\n`,
  );

  const ruleCount = Math.min(20, merges.length);
  console.log(`First ${ruleCount} learned merge rules (in order):`);
  console.log('  #   pair                 ->  new token            (freq)');
  console.log('  ' + '─'.repeat(60));
  for (let i = 0; i < ruleCount; i++) {
    const { left, right, freq } = merges[i];
    const pair = `${left} ${right}`;
    const result = left + right;
    console.log(
      `  ${String(i + 1).padStart(2)}  ` +
        `${pair.padEnd(18)}  ->  ` +
        `${result.padEnd(18)}  (${freq})`,
    );
  }

  // ----------------------------------------------------------------------
  // OUTPUT (2): READABLE RESULT — trace one word as merges accumulate.
  // ----------------------------------------------------------------------
  console.log(`\nTracing the word "${wordToTrace}" as merges accumulate:`);
  console.log('  ' + '─'.repeat(60));
  const stages = [0, 50, 150, merges.length];
  // De-duplicate and clamp stages, keep ascending order.
  const seen = new Set();
  const cleanStages = stages
    .map((s) => Math.min(s, merges.length))
    .filter((s) => (seen.has(s) ? false : (seen.add(s), true)))
    .sort((a, b) => a - b);

  for (const stage of cleanStages) {
    const seg = segment(wordToTrace, merges, stage);
    const label =
      stage === 0
        ? 'characters (0 merges)'
        : `after ${stage} merges`;
    console.log(
      `  ${label.padEnd(22)}  ${seg.length} tokens   ${show(seg)}`,
    );
  }

  // Final comparison: subword vs naive char-level vs word-level token counts.
  const finalSeg = segment(wordToTrace, merges, merges.length);
  const charLevel = toSymbols(wordToTrace).length; // chars + </w>
  console.log('\n  Token count for "' + wordToTrace + '":');
  console.log(`    character-level : ${charLevel}`);
  console.log(`    BPE subword     : ${finalSeg.length}  (${show(finalSeg)})`);
  console.log(`    word-level      : 1`);
  console.log(
    '\nBPE lands between the two extremes: fewer tokens than raw characters,\n' +
      'but — unlike a fixed word vocabulary — it can still spell out any unseen\n' +
      'word from the subword pieces it has learned, so nothing is ever "unknown".',
  );
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
