#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');

// Validate arguments
if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> ["a short phrase"]');
  process.exit(1);
}

const filePath = process.argv[2];
// Default phrase: every word is in the top-200 vocabulary of the sonnets, so
// each token gets a real co-occurrence embedding and the attention is
// interpretable. "thy" / "love" / "is" / "as" / "fair" / "as" all co-occur in
// the sonnets, so the routing reflects genuine corpus structure.
const phrase = (process.argv[3] || 'thy love is as fair').toLowerCase();

// Tunable parameters of the model.
const VOCAB_SIZE = 200; // top-N words become both tokens and embedding dimensions
const WINDOW = 3; // symmetric co-occurrence window: ±3 words (matches word-vectors/)

// The scaling temperature, standing in for the √d denominator in the formula.
// The √d term exists to keep the softmax inputs at unit scale so the weights
// are neither uniform nor saturated. Our embeddings are L2-normalised, so a raw
// dot product is a cosine in [-1, 1] and the real spread between sonnet words
// is only ~0.1 wide — dividing by the literal √200 ≈ 14 would crush every score
// to ~0 and make every row uniform. TEMPERATURE is that √d denominator retuned
// to the actual scale of these unit-vector scores, so the genuine cosine
// differences in the corpus become visible attention weights.
const TEMPERATURE = 0.1;

try {
  const text = fs.readFileSync(filePath, 'utf8');

  // Reuse the shared tokenizer so the embeddings line up with every other demo.
  const words = tokenize(text);

  if (words.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Step 1: build a real vocabulary and a co-occurrence matrix, exactly like
  // word-vectors/. The top ~200 words are both the tokens we can embed AND the
  // dimensions of every embedding, so each in-vocabulary word becomes a real
  // 200-dimensional vector describing the company it keeps in the sonnets.
  // ---------------------------------------------------------------------------
  const counts = {};
  for (const word of words) {
    counts[word] = (counts[word] || 0) + 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const vocab = ranked.slice(0, VOCAB_SIZE).map(([word]) => word);

  const dim = new Map();
  vocab.forEach((word, i) => dim.set(word, i));

  const matrix = vocab.map(() => new Array(VOCAB_SIZE).fill(0));
  for (let i = 0; i < words.length; i++) {
    const target = words[i];
    if (!dim.has(target)) continue;
    const ti = dim.get(target);
    const lo = Math.max(0, i - WINDOW);
    const hi = Math.min(words.length - 1, i + WINDOW);
    for (let j = lo; j <= hi; j++) {
      if (j === i) continue;
      const ctx = words[j];
      if (!dim.has(ctx)) continue;
      matrix[ti][dim.get(ctx)] += 1;
    }
  }

  // L2-normalise each embedding so the dot product reflects direction (which
  // company a word keeps) rather than raw frequency. This keeps the scaled
  // scores in a sane range and stops common words from dominating purely by
  // magnitude.
  function l2normalise(vec) {
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (norm === 0) return vec.slice();
    return vec.map((v) => v / norm);
  }
  const embedding = new Map();
  vocab.forEach((word, i) => embedding.set(word, l2normalise(matrix[i])));

  // ---------------------------------------------------------------------------
  // Step 2: assemble the phrase tokens. Skip (with a warning) any token that is
  // out of vocabulary, since it has no embedding to attend with or be attended
  // to.
  // ---------------------------------------------------------------------------
  const allTokens = tokenize(phrase);
  const tokens = [];
  for (const t of allTokens) {
    if (embedding.has(t)) {
      tokens.push(t);
    } else {
      console.error(
        `(skipping "${t}" — not among the top ${VOCAB_SIZE} words, so it has ` +
          'no embedding)',
      );
    }
  }

  if (tokens.length < 2) {
    console.error(
      'Need at least two in-vocabulary words to show attention. Try a phrase ' +
        `built from common sonnet words, e.g.: ${vocab.slice(0, 12).join(', ')}, ...`,
    );
    process.exit(1);
  }

  const d = VOCAB_SIZE; // embedding dimensionality
  const scale = TEMPERATURE; // the √d denominator, retuned to the unit-vector scale

  console.log(
    `Corpus: ${words.length} tokens, ${ranked.length} unique words.\n` +
      `Embeddings: top ${vocab.length} words as ±${WINDOW}-word co-occurrence ` +
      `vectors (L2-normalised), ${d} dimensions each.\n` +
      `Phrase: "${tokens.join(' ')}"   (${tokens.length} tokens)\n` +
      'Simplified self-attention: Q = K = V = the token embeddings ' +
      '(single head, no learned projections).\n' +
      `Scaling the √d denominator to the unit-vector scale: TEMPERATURE = ${scale}.\n`,
  );

  // ---------------------------------------------------------------------------
  // Step 3: scaled dot-product self-attention.
  //   Attention(Q, K, V) = softmax( Q·Kᵀ / √d ) · V
  // Q = K = V = the token embeddings here, so the score from query token i to
  // key token j is just their scaled dot-product similarity. softmax over each
  // row turns those scores into weights that sum to 1.
  // ---------------------------------------------------------------------------
  function dot(a, b) {
    let s = 0;
    for (let k = 0; k < a.length; k++) s += a[k] * b[k];
    return s;
  }

  const vecs = tokens.map((t) => embedding.get(t));
  const n = tokens.length;

  // Raw scores: Q·Kᵀ / √d
  const scores = vecs.map((q) => vecs.map((k) => dot(q, k) / scale));

  // Row-wise softmax -> attention weights (each row sums to 1).
  function softmax(row) {
    const max = Math.max(...row);
    const exps = row.map((v) => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / sum);
  }
  const attention = scores.map(softmax);

  // Output vectors: each row of the attention matrix blends the value vectors.
  const outputs = attention.map((weights) => {
    const out = new Array(d).fill(0);
    for (let j = 0; j < n; j++) {
      const v = vecs[j];
      for (let k = 0; k < d; k++) out[k] += weights[j] * v[k];
    }
    return out;
  });

  // ---------------------------------------------------------------------------
  // OUTPUT 1 — DATA STRUCTURE: the attention-weight matrix. Rows are the query
  // token, columns are the key token; each cell is "how much of token i's new
  // representation is drawn from token j". Every row sums to 1.
  // ---------------------------------------------------------------------------
  const colW = 8;
  console.log(
    'Attention-weight matrix  softmax(Q·Kᵀ / √d)  — rows = query token, ' +
      'cols = key token:',
  );
  console.log('each row sums to 1 (how much the query token attends to each key)\n');
  const header =
    'query \\ key'.padEnd(12) +
    tokens.map((t) => t.padStart(colW)).join('');
  console.log(header);
  console.log('─'.repeat(header.length));
  for (let i = 0; i < n; i++) {
    const cells = attention[i]
      .map((w) => w.toFixed(3).padStart(colW))
      .join('');
    console.log(tokens[i].padEnd(12) + cells);
  }

  // ---------------------------------------------------------------------------
  // OUTPUT 2 — READABLE RESULT: for each token, which OTHER token it attends to
  // most strongly. A token's strongest attention is usually itself (its
  // embedding is most similar to itself), so we report the strongest neighbour
  // as the interesting routing signal.
  // ---------------------------------------------------------------------------
  console.log('\nWhat each token attends to most (excluding itself):');
  console.log('─'.repeat(48));
  for (let i = 0; i < n; i++) {
    let best = -1;
    let bestW = -Infinity;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      if (attention[i][j] > bestW) {
        bestW = attention[i][j];
        best = j;
      }
    }
    const self = attention[i][i];
    console.log(
      `  "${tokens[i]}"`.padEnd(14) +
        `attends most to "${tokens[best]}" (${bestW.toFixed(3)})` +
        `   [self: ${self.toFixed(3)}]`,
    );
  }

  // A note tying the output vectors back to the mechanic: each output is a
  // weighted blend of the value vectors, so its length tells you how
  // "concentrated" that token's attention was.
  console.log(
    '\nEach output vector is the attention-weighted blend of all value ' +
      'vectors\n(the · V step). That blended vector — not the original ' +
      'embedding — is what\na real Transformer passes to the next layer.',
  );
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
