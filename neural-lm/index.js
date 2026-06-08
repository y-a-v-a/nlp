#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');

// Validate arguments
if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [epochs] [output-length]');
  process.exit(1);
}

const filePath = process.argv[2];
const epochs = parseInt(process.argv[3]) || 15;
const outputLength = parseInt(process.argv[4]) || 40;

// A small deterministic PRNG (mulberry32) so weight initialisation, example
// shuffling, and sampling are reproducible — the numbers in the README and the
// HTML explainer come from a fixed seed.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

try {
  const text = fs.readFileSync(filePath, 'utf8');
  const words = tokenize(text);

  if (words.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Vocabulary: keep the V most frequent words. The model predicts a
  // probability distribution over exactly these words, so a smaller V keeps the
  // output layer (and therefore training) fast enough to run on a laptop.
  // -------------------------------------------------------------------------
  const V = 200;
  const counts = {};
  for (const w of words) counts[w] = (counts[w] || 0) + 1;
  const vocab = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, V)
    .map((e) => e[0]);
  const wordToId = new Map(vocab.map((w, i) => [w, i]));

  // Training examples are trigrams: predict word t from words (t-2, t-1).
  // We only keep trigrams whose three words are all in the vocabulary.
  const data = [];
  for (let i = 0; i < words.length - 2; i++) {
    const a = wordToId.get(words[i]);
    const b = wordToId.get(words[i + 1]);
    const c = wordToId.get(words[i + 2]);
    if (a !== undefined && b !== undefined && c !== undefined) {
      data.push([a, b, c]); // [context word 1, context word 2, target]
    }
  }

  // -------------------------------------------------------------------------
  // Network dimensions. This is Bengio et al. (2003) in miniature:
  //   word ids -> embedding lookup -> tanh hidden layer -> softmax over vocab
  // -------------------------------------------------------------------------
  const m = 24; // embedding dimension
  const H = 48; // hidden units
  const lr = 0.05; // learning rate

  // Parameter initialisation (small uniform random values).
  const initArray = (n, scale) => {
    const arr = new Float64Array(n);
    for (let i = 0; i < n; i++) arr[i] = (rand() * 2 - 1) * scale;
    return arr;
  };
  const C = initArray(V * m, 0.1); // embeddings: V rows of length m
  const W1 = initArray(H * 2 * m, 0.1); // hidden weights: H x 2m
  const b1 = new Float64Array(H);
  const W2 = initArray(V * H, 0.1); // output weights: V x H
  const b2 = new Float64Array(V);

  console.log('Neural language model (feedforward, Bengio 2003)');
  console.log('─'.repeat(56));
  console.log(`Vocabulary:        ${V} words (most frequent)`);
  console.log(`Training trigrams: ${data.length}`);
  console.log(
    `Architecture:      2×${m}-dim embeddings → tanh(${H}) → softmax(${V})`,
  );
  const params = C.length + W1.length + b1.length + W2.length + b2.length;
  console.log(`Trainable values:  ${params}\n`);

  // Reusable scratch buffers
  const x = new Float64Array(2 * m);
  const hid = new Float64Array(H);

  // Forward pass for one example; returns probability row and fills hid/x.
  function forward(w1, w2) {
    for (let d = 0; d < m; d++) {
      x[d] = C[w1 * m + d];
      x[m + d] = C[w2 * m + d];
    }
    for (let h = 0; h < H; h++) {
      let s = b1[h];
      const base = h * 2 * m;
      for (let j = 0; j < 2 * m; j++) s += W1[base + j] * x[j];
      hid[h] = Math.tanh(s);
    }
    const logits = new Float64Array(V);
    let max = -Infinity;
    for (let v = 0; v < V; v++) {
      let s = b2[v];
      const base = v * H;
      for (let k = 0; k < H; k++) s += W2[base + k] * hid[k];
      logits[v] = s;
      if (s > max) max = s;
    }
    let sum = 0;
    for (let v = 0; v < V; v++) {
      logits[v] = Math.exp(logits[v] - max);
      sum += logits[v];
    }
    for (let v = 0; v < V; v++) logits[v] /= sum;
    return logits; // now a probability distribution
  }

  // -------------------------------------------------------------------------
  // Training: stochastic gradient descent with backpropagation.
  // -------------------------------------------------------------------------
  const order = data.map((_, i) => i);
  const lossCurve = [];
  for (let epoch = 0; epoch < epochs; epoch++) {
    // Deterministic Fisher–Yates shuffle each epoch
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = order[i];
      order[i] = order[j];
      order[j] = t;
    }

    let totalLoss = 0;
    for (const ei of order) {
      const [w1, w2, target] = data[ei];
      const p = forward(w1, w2);
      totalLoss += -Math.log(p[target] + 1e-12);

      // Gradient of cross-entropy through softmax: dL/dlogits = p - onehot
      const dLogits = p; // reuse the buffer in place
      dLogits[target] -= 1;

      // Backprop into the hidden layer, then update W2/b2.
      const dHid = new Float64Array(H);
      for (let k = 0; k < H; k++) {
        let s = 0;
        for (let v = 0; v < V; v++) s += W2[v * H + k] * dLogits[v];
        dHid[k] = s; // uses pre-update W2
      }
      for (let v = 0; v < V; v++) {
        const g = dLogits[v];
        b2[v] -= lr * g;
        const base = v * H;
        for (let k = 0; k < H; k++) W2[base + k] -= lr * g * hid[k];
      }

      // Through the tanh, then update W1/b1 and accumulate dx for embeddings.
      const dx = new Float64Array(2 * m);
      for (let h = 0; h < H; h++) {
        const da1 = dHid[h] * (1 - hid[h] * hid[h]);
        b1[h] -= lr * da1;
        const base = h * 2 * m;
        for (let j = 0; j < 2 * m; j++) {
          dx[j] += W1[base + j] * da1; // uses pre-update W1
          W1[base + j] -= lr * da1 * x[j];
        }
      }

      // Update the two context-word embeddings.
      for (let d = 0; d < m; d++) {
        C[w1 * m + d] -= lr * dx[d];
        C[w2 * m + d] -= lr * dx[m + d];
      }
    }

    const avg = totalLoss / data.length;
    lossCurve.push(avg);
    const ppl = Math.exp(avg);
    console.log(
      `epoch ${String(epoch + 1).padStart(2)}/${epochs}  ` +
        `avg loss ${avg.toFixed(4)}   perplexity ${ppl.toFixed(1)}`,
    );
  }

  // -------------------------------------------------------------------------
  // Data structure: a slice of the LEARNED embedding matrix. Each row is a
  // word's position in a 24-dimensional space the network discovered on its own.
  // -------------------------------------------------------------------------
  console.log('\nLearned embedding (first 6 of 24 dims) for a few words:');
  for (const w of ['love', 'my', 'thou', 'beauty']) {
    if (!wordToId.has(w)) continue;
    const id = wordToId.get(w);
    const row = [];
    for (let d = 0; d < 6; d++) row.push(C[id * m + d].toFixed(2).padStart(6));
    console.log(`  ${w.padEnd(8)} [${row.join(' ')} … ]`);
  }

  // Nearest neighbours in embedding space (cosine), to show the vectors encode
  // relationships the network was never explicitly told about.
  function nearest(word, topK) {
    if (!wordToId.has(word)) return [];
    const id = wordToId.get(word);
    const vecOf = (i) => C.subarray(i * m, i * m + m);
    const cos = (a, b) => {
      let dot = 0,
        na = 0,
        nb = 0;
      for (let d = 0; d < m; d++) {
        dot += a[d] * b[d];
        na += a[d] * a[d];
        nb += b[d] * b[d];
      }
      return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
    };
    const q = vecOf(id);
    return vocab
      .map((w, i) => ({ w, s: cos(q, vecOf(i)) }))
      .filter((o) => o.w !== word)
      .sort((a, b) => b.s - a.s)
      .slice(0, topK);
  }

  console.log('\nNearest neighbours in the learned embedding space (cosine):');
  for (const w of ['love', 'thou', 'my']) {
    const nn = nearest(w, 5);
    if (nn.length) {
      console.log(
        `  ${w.padEnd(8)} → ${nn
          .map((o) => `${o.w} ${o.s.toFixed(2)}`)
          .join(',  ')}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Readable result: generate text by repeatedly predicting the next word and
  // sampling from the model's distribution (seeded, so it is reproducible).
  // -------------------------------------------------------------------------
  function sample(p) {
    const r = rand();
    let acc = 0;
    for (let v = 0; v < V; v++) {
      acc += p[v];
      if (r < acc) return v;
    }
    return V - 1;
  }

  // Seed with a real trigram's first two words.
  let [g1, g2] = data[Math.floor(rand() * data.length)];
  const out = [vocab[g1], vocab[g2]];
  for (let i = 0; i < outputLength - 2; i++) {
    const next = sample(forward(g1, g2));
    out.push(vocab[next]);
    g1 = g2;
    g2 = next;
  }
  console.log('\nGenerated text (sampled from the trained model):');
  console.log(out.join(' '));
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
