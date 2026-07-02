/**
 * RAG core — the shared algorithm behind both the CLI (index.js) and the
 * in-browser "Try it" demo. UMD: require() in Node, window.NLP.rag in the
 * browser. Keeping one implementation means the demo and the CLI can never
 * disagree about how retrieval-then-generation works.
 *
 * RAG = retrieve (rank documents by TF-IDF relevance to the query), augment
 * (use the retrieved documents as context), generate (a bigram Markov model
 * trained ONLY on that context — grounding it in the fetched evidence).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.rag = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Split a corpus into documents: blocks separated by blank lines, keeping
  // only blocks of at least 20 words (keeps every sonnet, drops title headers,
  // and accepts ordinary paragraphs when a visitor pastes their own text).
  // Same splitter as tfidf/ — RAG reuses the same retrieval substrate.
  function splitDocuments(text) {
    return text
      .replace(/\r\n/g, '\n')
      .split(/\n\n+/)
      .map(function (block) { return block.trim(); })
      .filter(function (block) { return block.split(/\s+/).length >= 20; });
  }

  // STEP 1 — RETRIEVE. Rank already-tokenized documents against a tokenized
  // query with TF-IDF, returning the top k as [{ index, score }] sorted
  // descending, dropping zero-score docs. If k is omitted, all positive-score
  // documents are returned.
  function retrieve(tokenizedDocs, queryTokens, k) {
    var N = tokenizedDocs.length;

    var df = {};
    var tfPerDoc = tokenizedDocs.map(function (words) {
      var counts = {};
      for (var i = 0; i < words.length; i++) {
        counts[words[i]] = (counts[words[i]] || 0) + 1;
      }
      for (var w in counts) df[w] = (df[w] || 0) + 1;
      var tf = {};
      var total = words.length;
      for (var t in counts) tf[t] = counts[t] / total;
      return tf;
    });

    var idf = {};
    for (var d in df) idf[d] = Math.log(N / df[d]);

    var ranked = tfPerDoc
      .map(function (tf, i) {
        var score = 0;
        for (var q = 0; q < queryTokens.length; q++) {
          var word = queryTokens[q];
          score += (tf[word] || 0) * (idf[word] || 0);
        }
        return { index: i, score: score };
      })
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });

    return typeof k === 'number' ? ranked.slice(0, k) : ranked;
  }

  // STEP 3 substrate — build a bigram chain: each word maps to the list of
  // words seen to follow it (with repeats, so frequent transitions are more
  // likely when picked uniformly at random).
  function buildBigrams(words) {
    var chain = {};
    for (var i = 0; i < words.length - 1; i++) {
      (chain[words[i]] || (chain[words[i]] = [])).push(words[i + 1]);
    }
    return chain;
  }

  // STEP 3 — GENERATE. Walk the chain to produce n words. options.rng defaults
  // to Math.random so the CLI can pass a seeded generator for reproducibility.
  // options.seed sets the starting word (if present in the chain); otherwise a
  // random key is chosen. If a word has no followers, jump to a random key.
  function generate(chain, seed, n, options) {
    options = options || {};
    var rng = options.rng || Math.random;
    var keys = Object.keys(chain);
    if (keys.length === 0) return '';
    var current = chain[seed] ? seed : keys[Math.floor(rng() * keys.length)];
    var out = [current];
    for (var i = 0; i < n - 1; i++) {
      var next = chain[current];
      current =
        next && next.length
          ? next[Math.floor(rng() * next.length)]
          : keys[Math.floor(rng() * keys.length)];
      out.push(current);
    }
    return out.join(' ');
  }

  return {
    splitDocuments: splitDocuments,
    retrieve: retrieve,
    buildBigrams: buildBigrams,
    generate: generate,
  };
});
