#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');

// Validate arguments
if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [query-word]');
  process.exit(1);
}

const filePath = process.argv[2];
// Default to a word with interpretable neighbours in the sonnets: "heart"
// returns "mind", "sight", "thoughts" — other inner faculties — rather than
// the function words that dominate noisier query words.
const queryWord = (process.argv[3] || 'heart').toLowerCase();

// Tunable parameters of the model.
const VOCAB_SIZE = 200; // top-N words become both targets and context dimensions
const WINDOW = 3; // symmetric context window: ±3 words around each token

try {
  const text = fs.readFileSync(filePath, 'utf8');

  // Reuse the shared tokenizer so counts line up with every other demo.
  const words = tokenize(text);

  if (words.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Step 1: pick the vocabulary — the TOP ~200 most frequent words.
  // These same words serve as the target words we vectorise AND as the context
  // dimensions of every vector, so each word becomes a 200-dimensional vector.
  // ---------------------------------------------------------------------------
  const counts = {};
  for (const word of words) {
    counts[word] = (counts[word] || 0) + 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const vocab = ranked.slice(0, VOCAB_SIZE).map(([word]) => word);

  // Map each vocabulary word to its dimension index for fast lookups.
  const dim = new Map();
  vocab.forEach((word, i) => dim.set(word, i));

  // ---------------------------------------------------------------------------
  // Step 2: build the co-occurrence matrix.
  // For every token in the corpus that is in the vocabulary, look at the words
  // within ±WINDOW of it. Each in-vocabulary neighbour increments one cell.
  // The matrix is symmetric (a near b means b near a) by construction.
  // matrix[i] is the vector for vocab[i]: how often vocab[j] sits in its window.
  // ---------------------------------------------------------------------------
  const matrix = vocab.map(() => new Array(VOCAB_SIZE).fill(0));

  for (let i = 0; i < words.length; i++) {
    const target = words[i];
    if (!dim.has(target)) continue;
    const ti = dim.get(target);
    const lo = Math.max(0, i - WINDOW);
    const hi = Math.min(words.length - 1, i + WINDOW);
    for (let j = lo; j <= hi; j++) {
      if (j === i) continue; // a word is not its own context
      const ctx = words[j];
      if (!dim.has(ctx)) continue;
      matrix[ti][dim.get(ctx)] += 1;
    }
  }

  // ---------------------------------------------------------------------------
  // Step 3: cosine similarity.   cos(a, b) = (a · b) / (|a| · |b|)
  // Two words are similar when they keep similar company — when their context
  // vectors point in the same direction, regardless of magnitude.
  // ---------------------------------------------------------------------------
  const norms = matrix.map((vec) =>
    Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)),
  );

  function cosine(i, j) {
    if (norms[i] === 0 || norms[j] === 0) return 0;
    let dot = 0;
    const a = matrix[i];
    const b = matrix[j];
    for (let k = 0; k < VOCAB_SIZE; k++) dot += a[k] * b[k];
    return dot / (norms[i] * norms[j]);
  }

  // Nearest neighbours of a word by cosine, excluding the word itself.
  function neighbours(word, n) {
    if (!dim.has(word)) return null;
    const wi = dim.get(word);
    const scored = [];
    for (let j = 0; j < vocab.length; j++) {
      if (j === wi) continue;
      scored.push([vocab[j], cosine(wi, j)]);
    }
    scored.sort((a, b) => b[1] - a[1]);
    return scored.slice(0, n);
  }

  console.log(
    `Corpus: ${words.length} tokens, ${ranked.length} unique words.\n` +
      `Vectorising the top ${vocab.length} words with a ±${WINDOW}-word ` +
      `context window.\n` +
      `Each word is a ${vocab.length}-dimensional co-occurrence vector.\n`,
  );

  // ---------------------------------------------------------------------------
  // OUTPUT 1 — DATA STRUCTURE: a small slice of the co-occurrence matrix so the
  // representation is visible. A few target words (rows) against a few context
  // words (columns).
  // ---------------------------------------------------------------------------
  const rowWords = ['love', 'beauty', 'eyes', 'heart', 'time'].filter((w) =>
    dim.has(w),
  );
  const colWords = ['my', 'thy', 'love', 'sweet', 'is', 'in'].filter((w) =>
    dim.has(w),
  );

  console.log('Co-occurrence matrix (slice) — rows are target words, ' +
    'columns are context words:');
  console.log('counts = times the column word appears within ±' + WINDOW +
    ' of the row word\n');
  const colHeader =
    ''.padEnd(9) + colWords.map((w) => w.padStart(7)).join('');
  console.log(colHeader);
  console.log('─'.repeat(colHeader.length));
  for (const rw of rowWords) {
    const ri = dim.get(rw);
    const cells = colWords
      .map((cw) => String(matrix[ri][dim.get(cw)]).padStart(7))
      .join('');
    console.log(rw.padEnd(9) + cells);
  }

  // ---------------------------------------------------------------------------
  // OUTPUT 2 — READABLE RESULT: nearest neighbours of the query word by cosine.
  // ---------------------------------------------------------------------------
  console.log('');
  if (!dim.has(queryWord)) {
    console.log(
      `"${queryWord}" is not among the top ${vocab.length} words, so it has ` +
        `no vector. Try one of: ${vocab.slice(0, 12).join(', ')}, ...`,
    );
  } else {
    const nn = neighbours(queryWord, 8);
    console.log(`Nearest neighbours of "${queryWord}" by cosine similarity:`);
    console.log('─'.repeat(40));
    const maxScore = nn.length ? nn[0][1] : 1;
    for (const [word, score] of nn) {
      const barLen = maxScore > 0 ? Math.round((score / maxScore) * 24) : 0;
      const bar = '▇'.repeat(Math.max(0, barLen));
      console.log(
        `  ${word.padEnd(12)} ${score.toFixed(3)}  ${bar}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // CONTRAST: show that an intuitively related pair scores higher than an
  // unrelated one. We report whatever the data actually produces.
  // ---------------------------------------------------------------------------
  function pair(a, b) {
    if (!dim.has(a) || !dim.has(b)) return null;
    return cosine(dim.get(a), dim.get(b));
  }

  console.log('\nContrast — a related pair vs. an unrelated pair:');
  const related = ['heart', 'mind'];
  const unrelated = ['heart', 'time'];
  const rScore = pair(related[0], related[1]);
  const uScore = pair(unrelated[0], unrelated[1]);
  if (rScore !== null) {
    console.log(
      `  cos("${related[0]}", "${related[1]}")  = ${rScore.toFixed(3)}  ` +
        '(intuitively related)',
    );
  }
  if (uScore !== null) {
    console.log(
      `  cos("${unrelated[0]}", "${unrelated[1]}")  = ${uScore.toFixed(3)}  ` +
        '(less related)',
    );
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
