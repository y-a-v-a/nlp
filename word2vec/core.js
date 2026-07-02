/**
 * Skip-gram with negative sampling (Word2Vec, Mikolov et al. 2013) — shared
 * by the CLI (index.js) and the in-browser demo. UMD: require() in Node,
 * window.NLP.word2vec in the browser.
 *
 * word-vectors/ COUNTS co-occurrences directly into a big sparse matrix.
 * This model instead LEARNS a small, dense vector per word by repeatedly
 * asking a tiny binary classifier one question: "does this context word
 * really appear near this target word, or is it one I made up?" Both words
 * start as random noise; gradient descent nudges genuine (target, context)
 * pairs' vectors together and made-up ("negative") pairs' vectors apart.
 * After enough of these nudges, words that keep similar company end up with
 * similar vectors — the same distributional hypothesis as word-vectors/,
 * reached by prediction instead of counting.
 *
 * Exposed as a STEPPABLE trainer, the same pattern as neural-lm/core.js:
 * createModel() builds it, trainEpoch() runs one epoch and returns the
 * average loss. The CLI loops over epochs; the browser can run one epoch per
 * animation frame so the tab never freezes.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.word2vec = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Deterministic PRNG (mulberry32), the same generator used by neural-lm/
  // and rnn/, so seeded runs reproduce exactly.
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

  function sigmoid(x) {
    if (x > 20) return 1;
    if (x < -20) return 0;
    return 1 / (1 + Math.exp(-x));
  }

  function createModel(words, opts) {
    opts = opts || {};
    const V = opts.V || 200; // vocabulary size
    const dim = opts.dim || 16; // embedding dimensionality
    const window = opts.window || 3; // symmetric context window
    const negatives = opts.negatives || 5; // negative samples per positive pair
    const lr = opts.lr || 0.05;
    const rng = opts.rng || (opts.seed != null ? mulberry32(opts.seed) : Math.random);

    // Vocabulary: the V most frequent words, same convention as word-vectors/
    // and neural-lm/ so nearest-neighbour comparisons are apples-to-apples.
    const counts = {};
    for (const w of words) counts[w] = (counts[w] || 0) + 1;
    const vocab = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, V)
      .map((e) => e[0]);
    const wordToId = new Map(vocab.map((w, i) => [w, i]));

    // Training pairs: every (target, context) pair within the window, both
    // in-vocabulary. This is the same sliding-window idea word-vectors/
    // counts directly; here each pair becomes one training example instead
    // of one matrix increment.
    const pairs = [];
    const ids = words.map((w) => (wordToId.has(w) ? wordToId.get(w) : -1));
    for (let i = 0; i < ids.length; i++) {
      if (ids[i] === -1) continue;
      const lo = Math.max(0, i - window);
      const hi = Math.min(ids.length - 1, i + window);
      for (let j = lo; j <= hi; j++) {
        if (j === i || ids[j] === -1) continue;
        pairs.push([ids[i], ids[j]]);
      }
    }

    // The negative-sampling noise distribution: word frequency raised to the
    // 3/4 power (Mikolov et al.'s own tweak — flattens the distribution so
    // rare words get sampled as negatives more often than raw frequency
    // would give them, which trains better vectors for the whole vocabulary,
    // not just the handful of most common words).
    const freqPow = vocab.map((w) => Math.pow(counts[w], 0.75));
    const freqTotal = freqPow.reduce((a, b) => a + b, 0);
    const cumulative = [];
    let acc = 0;
    for (let i = 0; i < freqPow.length; i++) {
      acc += freqPow[i] / freqTotal;
      cumulative.push(acc);
    }
    function sampleNegative(excludeId) {
      for (let tries = 0; tries < 10; tries++) {
        const r = rng();
        let lo = 0, hi = cumulative.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (cumulative[mid] < r) lo = mid + 1; else hi = mid;
        }
        if (lo !== excludeId) return lo;
      }
      return (excludeId + 1) % V; // extremely unlikely fallback
    }

    // Two embedding tables, per the standard SGNS setup: "in" vectors (a
    // word as a target) and "out" vectors (a word as a context/prediction).
    // Using two separate tables — rather than one shared one — is what
    // makes the positive/negative logistic objective well-behaved; the "in"
    // table is the one reported as each word's embedding.
    const initArray = (n, scale) => {
      const arr = new Float64Array(n);
      for (let i = 0; i < n; i++) arr[i] = (rng() * 2 - 1) * scale;
      return arr;
    };
    const IN = initArray(V * dim, 0.5 / dim);
    const OUT = initArray(V * dim, 0.5 / dim);

    const order = pairs.map((_, i) => i);
    let epoch = 0;

    function trainEpoch() {
      // Shuffle (Fisher-Yates) so each epoch sees pairs in a different order.
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const t = order[i]; order[i] = order[j]; order[j] = t;
      }
      let totalLoss = 0;
      for (const idx of order) {
        const [target, ctx] = pairs[idx];
        const tBase = target * dim, cBase = ctx * dim;

        // Positive example: target should predict this real context word.
        let dot = 0;
        for (let d = 0; d < dim; d++) dot += IN[tBase + d] * OUT[cBase + d];
        const posP = sigmoid(dot);
        totalLoss += -Math.log(posP + 1e-12);
        const posGrad = (posP - 1) * lr; // d(loss)/d(dot) * lr
        for (let d = 0; d < dim; d++) {
          const inD = IN[tBase + d], outD = OUT[cBase + d];
          IN[tBase + d] -= posGrad * outD;
          OUT[cBase + d] -= posGrad * inD;
        }

        // Negative examples: target should NOT predict a handful of random
        // words drawn from the noise distribution.
        for (let n = 0; n < negatives; n++) {
          const neg = sampleNegative(ctx);
          const nBase = neg * dim;
          let ndot = 0;
          for (let d = 0; d < dim; d++) ndot += IN[tBase + d] * OUT[nBase + d];
          const negP = sigmoid(ndot);
          totalLoss += -Math.log(1 - negP + 1e-12);
          const negGrad = negP * lr;
          for (let d = 0; d < dim; d++) {
            const inD = IN[tBase + d], outD = OUT[nBase + d];
            IN[tBase + d] -= negGrad * outD;
            OUT[nBase + d] -= negGrad * inD;
          }
        }
      }
      epoch++;
      return totalLoss / (pairs.length * (1 + negatives));
    }

    function vecOf(id) { return IN.subarray(id * dim, id * dim + dim); }

    function cosine(a, b) {
      let dot = 0, na = 0, nb = 0;
      for (let d = 0; d < a.length; d++) {
        dot += a[d] * b[d]; na += a[d] * a[d]; nb += b[d] * b[d];
      }
      return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
    }

    function nearest(word, topK) {
      if (!wordToId.has(word)) return null;
      const q = vecOf(wordToId.get(word));
      return vocab
        .map((w, i) => ({ word: w, score: cosine(q, vecOf(i)) }))
        .filter((o) => o.word !== word)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    }

    // Analogy: "a is to b as c is to ___" via vec(b) - vec(a) + vec(c),
    // nearest neighbour excluding a, b, c themselves. The classic demo
    // ("king - man + woman = queen") needs words this small a corpus
    // usually doesn't have enough of; see README for what does work here.
    function analogy(a, b, c, topK) {
      if (!wordToId.has(a) || !wordToId.has(b) || !wordToId.has(c)) return null;
      const va = vecOf(wordToId.get(a)), vb = vecOf(wordToId.get(b)), vc = vecOf(wordToId.get(c));
      const target = new Float64Array(dim);
      for (let d = 0; d < dim; d++) target[d] = vb[d] - va[d] + vc[d];
      return vocab
        .map((w, i) => ({ word: w, score: cosine(target, vecOf(i)) }))
        .filter((o) => o.word !== a && o.word !== b && o.word !== c)
        .sort((x, y) => y.score - x.score)
        .slice(0, topK || 5);
    }

    return {
      V, dim, window, negatives,
      vocab,
      vocabSize: vocab.length,
      trainingPairs: pairs.length,
      paramCount: IN.length + OUT.length,
      hasWord: (w) => wordToId.has(w),
      get epoch() { return epoch; },
      trainEpoch, nearest, analogy, cosine,
      embeddingRow: (word) => (wordToId.has(word) ? Array.from(vecOf(wordToId.get(word))) : null),
    };
  }

  return { createModel: createModel, mulberry32: mulberry32 };
});
