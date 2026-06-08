#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');

// Validate arguments
if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [input-word]');
  process.exit(1);
}

const filePath = process.argv[2];
// Default to a plausible misspelling of a real sonnet word: "loue" -> "love"
// ("u" for "v" is exactly the kind of slip that early-modern spelling and a
// careless typist both produce).
const inputWord = (process.argv[3] || 'loue').toLowerCase();

/**
 * Classic Levenshtein edit distance via the dynamic-programming matrix.
 *
 * Returns both the final distance and the full (m+1) x (n+1) matrix, so the
 * caller can print the table and make the mechanic visible. Cell [i][j] holds
 * the minimum number of single-character insertions, deletions, and
 * substitutions needed to turn the first i characters of `a` into the first j
 * characters of `b`.
 *
 * @param {string} a source string (rows)
 * @param {string} b target string (columns)
 * @returns {{distance: number, matrix: number[][]}}
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;

  // matrix[i][j] = edit distance between a[0..i) and b[0..j)
  const matrix = [];
  for (let i = 0; i <= m; i++) {
    matrix.push(new Array(n + 1).fill(0));
  }

  // Base cases: turning a prefix into the empty string costs one deletion per
  // character; building a prefix from the empty string costs one insertion.
  for (let i = 0; i <= m; i++) matrix[i][0] = i;
  for (let j = 0; j <= n; j++) matrix[0][j] = j;

  // Fill the rest. Each cell is the cheapest of three moves:
  //   - delete a[i-1]        -> matrix[i-1][j]   + 1
  //   - insert b[j-1]        -> matrix[i][j-1]   + 1
  //   - substitute (or copy) -> matrix[i-1][j-1] + (chars differ ? 1 : 0)
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return { distance: matrix[m][n], matrix };
}

/**
 * Pretty-print the DP matrix with both strings labelling the axes, so the
 * filled grid reads like the tables in the README and the HTML explainer.
 */
function printMatrix(a, b, matrix) {
  const W = 4; // column width
  const pad = (s) => String(s).padStart(W);

  // Header row: an empty corner cell, then the empty-string column, then the
  // characters of `b` (the target across the top).
  const header = ['', ''].concat(b.split('')).map(pad).join('');
  console.log(header);

  for (let i = 0; i <= a.length; i++) {
    // Left label: empty-string row gets a blank, otherwise the i-th char of a.
    const rowLabel = i === 0 ? '' : a[i - 1];
    const cells = matrix[i].map(pad).join('');
    console.log(pad(rowLabel) + cells);
  }
}

try {
  const text = fs.readFileSync(filePath, 'utf8');

  // Use the shared tokenizer, then collapse to the unique vocabulary. Edit
  // distance is a property of distinct word forms, so duplicates add nothing.
  const tokens = tokenize(text);

  if (tokens.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  const vocabulary = Array.from(new Set(tokens));

  // Score every vocabulary word against the input by edit distance. Sort by
  // distance, then alphabetically, so the output is fully deterministic.
  const scored = vocabulary
    .map((word) => ({ word, distance: levenshtein(inputWord, word).distance }))
    .sort((a, b) => a.distance - b.distance || (a.word < b.word ? -1 : 1));

  const best = scored[0];

  console.log(
    `Corpus vocabulary: ${vocabulary.length} unique words ` +
      `(${tokens.length} tokens).`,
  );
  console.log(`Input word: "${inputWord}"\n`);

  // (1) THE DATA STRUCTURE: the full DP matrix for the input vs its closest
  // vocabulary word. The bottom-right cell is the edit distance.
  console.log(
    `Dynamic-programming matrix for "${inputWord}" → "${best.word}" ` +
      `(closest word, distance ${best.distance}):\n`,
  );
  const { matrix } = levenshtein(inputWord, best.word);
  printMatrix(inputWord, best.word, matrix);
  console.log(
    `\nThe bottom-right cell (${best.distance}) is the edit distance: the ` +
      `minimum\nnumber of insertions, deletions, and substitutions to turn ` +
      `"${inputWord}" into "${best.word}".\n`,
  );

  // (2) THE READABLE RESULT: a spell-checker. Rank the closest vocabulary
  // words to the input by edit distance. Ties are broken alphabetically.
  const topN = 10;
  console.log(`Closest words to "${inputWord}" in the vocabulary:\n`);
  console.log('  distance  word');
  console.log('  ' + '─'.repeat(22));
  for (let i = 0; i < Math.min(topN, scored.length); i++) {
    const { word, distance } = scored[i];
    console.log(`  ${String(distance).padStart(8)}  ${word}`);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
