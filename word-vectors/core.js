/**
 * Count-based word vectors core — shared by the CLI (index.js) and the
 * in-browser demo. UMD: require() in Node, window.NLP.wordVectors in the
 * browser. One implementation, so the live "nearest neighbours" box and the
 * command line measure meaning identically.
 *
 * The model is a co-occurrence matrix over the top-N most frequent words: each
 * of those words becomes both a target (a row/vector) and a context dimension
 * (a column). Similarity is the cosine of the angle between two rows.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.wordVectors = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var DEFAULT_TOP_N = 200; // top-N words become both targets and context dims
  var DEFAULT_WINDOW = 3; // symmetric context window: ±3 words around each token

  // Build the co-occurrence model from a list of tokens.
  // Returns { vocab, dim, matrix, norms, topN, window, ranked }.
  //   vocab  — the top-N words, by descending frequency
  //   dim    — Map(word -> row/column index)
  //   matrix — matrix[i][j] = times vocab[j] sits within ±window of vocab[i]
  //   norms  — Euclidean length of each row, precomputed for cosine
  //   ranked — [word, count] for every unique word (for reporting vocab size)
  function build(words, options) {
    options = options || {};
    var topN = options.topN || DEFAULT_TOP_N;
    var window = options.window || DEFAULT_WINDOW;

    // Step 1: pick the vocabulary — the top-N most frequent words.
    var counts = {};
    for (var i = 0; i < words.length; i++) {
      counts[words[i]] = (counts[words[i]] || 0) + 1;
    }
    var ranked = Object.entries(counts).sort(function (a, b) {
      return b[1] - a[1];
    });
    var vocab = ranked.slice(0, topN).map(function (entry) { return entry[0]; });

    // Map each vocabulary word to its dimension index for fast lookups.
    var dim = new Map();
    vocab.forEach(function (word, idx) { dim.set(word, idx); });

    // Step 2: build the co-occurrence matrix. For every in-vocabulary token,
    // increment a cell for each in-vocabulary neighbour within ±window.
    var size = vocab.length;
    var matrix = vocab.map(function () { return new Array(size).fill(0); });

    for (var t = 0; t < words.length; t++) {
      var target = words[t];
      if (!dim.has(target)) continue;
      var ti = dim.get(target);
      var lo = Math.max(0, t - window);
      var hi = Math.min(words.length - 1, t + window);
      for (var j = lo; j <= hi; j++) {
        if (j === t) continue; // a word is not its own context
        var ctx = words[j];
        if (!dim.has(ctx)) continue;
        matrix[ti][dim.get(ctx)] += 1;
      }
    }

    // Precompute row norms for cosine similarity.
    var norms = matrix.map(function (vec) {
      var sum = 0;
      for (var k = 0; k < vec.length; k++) sum += vec[k] * vec[k];
      return Math.sqrt(sum);
    });

    return {
      vocab: vocab,
      dim: dim,
      matrix: matrix,
      norms: norms,
      topN: topN,
      window: window,
      ranked: ranked,
    };
  }

  // Cosine similarity between vocab rows i and j.  cos = (a·b)/(|a||b|)
  function cosine(model, i, j) {
    var norms = model.norms;
    if (norms[i] === 0 || norms[j] === 0) return 0;
    var a = model.matrix[i];
    var b = model.matrix[j];
    var dot = 0;
    for (var k = 0; k < a.length; k++) dot += a[k] * b[k];
    return dot / (norms[i] * norms[j]);
  }

  // Cosine similarity between two words, or null if either has no vector.
  function cosineWords(model, a, b) {
    if (!model.dim.has(a) || !model.dim.has(b)) return null;
    return cosine(model, model.dim.get(a), model.dim.get(b));
  }

  // Nearest neighbours of a word by cosine, excluding the word itself.
  // Returns [{ word, score }] sorted descending, or null if the word is not
  // in the vocabulary.
  function nearest(model, word, k) {
    if (!model.dim.has(word)) return null;
    var wi = model.dim.get(word);
    var scored = [];
    for (var j = 0; j < model.vocab.length; j++) {
      if (j === wi) continue;
      scored.push({ word: model.vocab[j], score: cosine(model, wi, j) });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return typeof k === 'number' ? scored.slice(0, k) : scored;
  }

  return {
    build: build,
    cosine: cosine,
    cosineWords: cosineWords,
    nearest: nearest,
    DEFAULT_TOP_N: DEFAULT_TOP_N,
    DEFAULT_WINDOW: DEFAULT_WINDOW,
  };
});
