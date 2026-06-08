/**
 * Feedforward neural language model core (Bengio 2003), shared by the CLI and
 * the in-browser demo. UMD: require() in Node, window.NLP.neuralLm in browser.
 *
 * The model is exposed as a STEPPABLE trainer: createModel() builds it, and each
 * call to trainEpoch() runs one epoch and returns the average loss. The CLI
 * loops over epochs; the browser runs one epoch per animation frame so the tab
 * never freezes. Both share this exact code, so the demo and the command line
 * train the identical network.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.neuralLm = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Deterministic PRNG (mulberry32) so seeded runs are reproducible.
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

  function createModel(words, opts) {
    opts = opts || {};
    const V = opts.V || 200; // vocabulary size
    const m = opts.m || 24; // embedding dim
    const H = opts.H || 48; // hidden units
    const lr = opts.lr || 0.05;
    const rng = opts.rng || (opts.seed != null ? mulberry32(opts.seed) : Math.random);

    // Vocabulary: the V most frequent words.
    const counts = {};
    for (const w of words) counts[w] = (counts[w] || 0) + 1;
    const vocab = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, V)
      .map((e) => e[0]);
    const wordToId = new Map(vocab.map((w, i) => [w, i]));

    // Training trigrams whose three words are all in-vocabulary.
    const data = [];
    for (let i = 0; i < words.length - 2; i++) {
      const a = wordToId.get(words[i]);
      const b = wordToId.get(words[i + 1]);
      const c = wordToId.get(words[i + 2]);
      if (a !== undefined && b !== undefined && c !== undefined) data.push([a, b, c]);
    }

    const initArray = (n, scale) => {
      const arr = new Float64Array(n);
      for (let i = 0; i < n; i++) arr[i] = (rng() * 2 - 1) * scale;
      return arr;
    };
    const C = initArray(V * m, 0.1); // embeddings V x m
    const W1 = initArray(H * 2 * m, 0.1);
    const b1 = new Float64Array(H);
    const W2 = initArray(V * H, 0.1);
    const b2 = new Float64Array(V);

    const x = new Float64Array(2 * m);
    const hid = new Float64Array(H);

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
      const p = new Float64Array(V);
      let max = -Infinity;
      for (let v = 0; v < V; v++) {
        let s = b2[v];
        const base = v * H;
        for (let k = 0; k < H; k++) s += W2[base + k] * hid[k];
        p[v] = s;
        if (s > max) max = s;
      }
      let sum = 0;
      for (let v = 0; v < V; v++) {
        p[v] = Math.exp(p[v] - max);
        sum += p[v];
      }
      for (let v = 0; v < V; v++) p[v] /= sum;
      return p;
    }

    const order = data.map((_, i) => i);
    let epoch = 0;

    function trainEpoch() {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const t = order[i];
        order[i] = order[j];
        order[j] = t;
      }
      let totalLoss = 0;
      for (const ei of order) {
        const [w1, w2, target] = data[ei];
        const p = forward(w1, w2);
        totalLoss += -Math.log(p[target] + 1e-12);
        const dLogits = p;
        dLogits[target] -= 1;

        const dHid = new Float64Array(H);
        for (let k = 0; k < H; k++) {
          let s = 0;
          for (let v = 0; v < V; v++) s += W2[v * H + k] * dLogits[v];
          dHid[k] = s;
        }
        for (let v = 0; v < V; v++) {
          const g = dLogits[v];
          b2[v] -= lr * g;
          const base = v * H;
          for (let k = 0; k < H; k++) W2[base + k] -= lr * g * hid[k];
        }
        const dx = new Float64Array(2 * m);
        for (let h = 0; h < H; h++) {
          const da1 = dHid[h] * (1 - hid[h] * hid[h]);
          b1[h] -= lr * da1;
          const base = h * 2 * m;
          for (let j = 0; j < 2 * m; j++) {
            dx[j] += W1[base + j] * da1;
            W1[base + j] -= lr * da1 * x[j];
          }
        }
        for (let d = 0; d < m; d++) {
          C[w1 * m + d] -= lr * dx[d];
          C[w2 * m + d] -= lr * dx[m + d];
        }
      }
      epoch++;
      return totalLoss / data.length;
    }

    function sample(p) {
      const r = rng();
      let acc = 0;
      for (let v = 0; v < V; v++) {
        acc += p[v];
        if (r < acc) return v;
      }
      return V - 1;
    }

    function generate(length) {
      let [g1, g2] = data[Math.floor(rng() * data.length)];
      const out = [vocab[g1], vocab[g2]];
      for (let i = 0; i < length - 2; i++) {
        const next = sample(forward(g1, g2));
        out.push(vocab[next]);
        g1 = g2;
        g2 = next;
      }
      return out;
    }

    function embeddingRow(word, dims) {
      if (!wordToId.has(word)) return null;
      const id = wordToId.get(word);
      const row = [];
      const n = dims || m;
      for (let d = 0; d < n; d++) row.push(C[id * m + d]);
      return row;
    }

    function nearest(word, topK) {
      if (!wordToId.has(word)) return null;
      const id = wordToId.get(word);
      const vecOf = (i) => C.subarray(i * m, i * m + m);
      const cos = (a, b) => {
        let dot = 0, na = 0, nb = 0;
        for (let d = 0; d < m; d++) {
          dot += a[d] * b[d];
          na += a[d] * a[d];
          nb += b[d] * b[d];
        }
        return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
      };
      const q = vecOf(id);
      return vocab
        .map((w, i) => ({ word: w, score: cos(q, vecOf(i)) }))
        .filter((o) => o.word !== word)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    }

    return {
      V, m, H,
      vocab,
      vocabSize: vocab.length,
      trainingExamples: data.length,
      paramCount: C.length + W1.length + b1.length + W2.length + b2.length,
      hasWord: (w) => wordToId.has(w),
      get epoch() { return epoch; },
      trainEpoch, generate, embeddingRow, nearest,
    };
  }

  return { createModel: createModel, mulberry32: mulberry32 };
});
