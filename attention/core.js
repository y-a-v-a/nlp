/**
 * Attention core — shared by the CLI (index.js) and the in-browser demo. UMD:
 * require() in Node, window.NLP.attention in the browser. One implementation, so
 * the live heatmap and the command line route tokens identically.
 *
 * The model is a deliberately simplified, single-head scaled dot-product
 * self-attention: each token's embedding is a real ±WINDOW-word co-occurrence
 * vector over the top-N words of the corpus (L2-normalised), and Q = K = V = those
 * embeddings (no learned projection matrices). TEMPERATURE stands in for the √d
 * denominator, retuned to the unit-vector scale of these cosine scores.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.attention = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Tunable defaults — must match index.js so the CLI and demo never drift.
  var VOCAB_SIZE = 200; // top-N words become both tokens and embedding dimensions
  var WINDOW = 3; // symmetric co-occurrence window: ±3 words (matches word-vectors/)

  // The scaling temperature, standing in for the √d denominator in the formula.
  // Our embeddings are L2-normalised, so a raw dot product is a cosine in
  // [-1, 1] and the real spread between sonnet words is only ~0.1 wide —
  // dividing by the literal √200 ≈ 14 would crush every score to ~0. TEMPERATURE
  // is that √d denominator retuned to the actual scale of these unit vectors.
  var TEMPERATURE = 0.1;

  function l2normalise(vec) {
    var norm = Math.sqrt(vec.reduce(function (s, v) { return s + v * v; }, 0));
    if (norm === 0) return vec.slice();
    return vec.map(function (v) { return v / norm; });
  }

  function dot(a, b) {
    var s = 0;
    for (var k = 0; k < a.length; k++) s += a[k] * b[k];
    return s;
  }

  function softmax(row) {
    var max = Math.max.apply(null, row);
    var exps = row.map(function (v) { return Math.exp(v - max); });
    var sum = exps.reduce(function (a, b) { return a + b; }, 0);
    return exps.map(function (e) { return e / sum; });
  }

  // Build the co-occurrence embeddings from already-tokenized corpus words.
  // Returns a model: { vocab, embedding (Map word -> vector), dim (Map word ->
  // index), vocabSize, window, totalTokens, uniqueWords }.
  function buildEmbeddings(words, opts) {
    opts = opts || {};
    var topN = opts.topN || VOCAB_SIZE;
    var window = opts.window || WINDOW;

    var counts = {};
    for (var i = 0; i < words.length; i++) {
      counts[words[i]] = (counts[words[i]] || 0) + 1;
    }
    var ranked = Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; });
    var vocab = ranked.slice(0, topN).map(function (e) { return e[0]; });

    var dim = new Map();
    vocab.forEach(function (word, i) { dim.set(word, i); });

    var matrix = vocab.map(function () { return new Array(topN).fill(0); });
    for (var p = 0; p < words.length; p++) {
      var target = words[p];
      if (!dim.has(target)) continue;
      var ti = dim.get(target);
      var lo = Math.max(0, p - window);
      var hi = Math.min(words.length - 1, p + window);
      for (var j = lo; j <= hi; j++) {
        if (j === p) continue;
        var ctx = words[j];
        if (!dim.has(ctx)) continue;
        matrix[ti][dim.get(ctx)] += 1;
      }
    }

    var embedding = new Map();
    vocab.forEach(function (word, i) { embedding.set(word, l2normalise(matrix[i])); });

    return {
      vocab: vocab,
      embedding: embedding,
      dim: dim,
      vocabSize: topN,
      window: window,
      totalTokens: words.length,
      uniqueWords: ranked.length,
    };
  }

  // Filter phrase tokens to those in vocabulary, reporting any skips.
  // Returns { tokens, skipped }.
  function selectTokens(model, phraseTokens) {
    var tokens = [];
    var skipped = [];
    for (var i = 0; i < phraseTokens.length; i++) {
      var t = phraseTokens[i];
      if (model.embedding.has(t)) tokens.push(t);
      else skipped.push(t);
    }
    return { tokens: tokens, skipped: skipped };
  }

  // Compute the attention-weight matrix for a phrase. Out-of-vocab tokens are
  // skipped. Returns { tokens, weights, scores } where weights[i][j] is how much
  // query token i attends to key token j (each row sums to 1), plus the skipped
  // out-of-vocab tokens.
  function attend(model, phraseTokens) {
    var sel = selectTokens(model, phraseTokens);
    var tokens = sel.tokens;
    var scale = TEMPERATURE; // the √d denominator, retuned to the unit-vector scale

    var vecs = tokens.map(function (t) { return model.embedding.get(t); });

    // Raw scores: Q·Kᵀ / √d
    var scores = vecs.map(function (q) {
      return vecs.map(function (k) { return dot(q, k) / scale; });
    });

    // Row-wise softmax -> attention weights (each row sums to 1).
    var weights = scores.map(softmax);

    return { tokens: tokens, weights: weights, scores: scores, skipped: sel.skipped };
  }

  return {
    buildEmbeddings: buildEmbeddings,
    selectTokens: selectTokens,
    attend: attend,
    VOCAB_SIZE: VOCAB_SIZE,
    WINDOW: WINDOW,
    TEMPERATURE: TEMPERATURE,
  };
});
