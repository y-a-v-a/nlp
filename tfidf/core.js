/**
 * TF-IDF core — shared by the CLI (index.js) and the in-browser demo. UMD:
 * require() in Node, window.NLP.tfidf in the browser. One implementation, so
 * the live search box and the command line rank documents identically.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.tfidf = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Split a corpus into documents: blocks separated by blank lines, keeping
  // only blocks of at least 20 words. On the sonnet corpora that keeps exactly
  // the 154/44 sonnets and drops the title header; on pasted "your own text"
  // it accepts ordinary paragraphs (the previous 10-line minimum, tuned to
  // sonnets, would silently reject them all).
  function splitDocuments(text) {
    return text
      .replace(/\r\n/g, '\n')
      .split(/\n\n+/)
      .map(function (block) { return block.trim(); })
      .filter(function (block) { return block.split(/\s+/).length >= 20; });
  }

  // Build the TF-IDF model from already-tokenized documents.
  // Returns { N, tf:[{w:freq}], idf:{w:val}, tfidf:[{w:val}] }.
  function buildModel(tokenizedDocs) {
    var N = tokenizedDocs.length;

    var tf = tokenizedDocs.map(function (words) {
      var counts = {};
      for (var i = 0; i < words.length; i++) {
        counts[words[i]] = (counts[words[i]] || 0) + 1;
      }
      var total = words.length || 1;
      var row = {};
      for (var w in counts) row[w] = counts[w] / total;
      return row;
    });

    var df = {};
    tf.forEach(function (row) {
      for (var w in row) df[w] = (df[w] || 0) + 1;
    });

    var idf = {};
    for (var w in df) idf[w] = Math.log(N / df[w]);

    var tfidf = tf.map(function (row) {
      var out = {};
      for (var w in row) out[w] = row[w] * idf[w];
      return out;
    });

    return { N: N, tf: tf, idf: idf, tfidf: tfidf };
  }

  // Rank documents for a tokenized query. Returns [{index, score}] sorted
  // descending, dropping zero-score docs.
  function search(model, queryTokens) {
    return model.tfidf
      .map(function (doc, i) {
        var score = 0;
        for (var k = 0; k < queryTokens.length; k++) {
          score += doc[queryTokens[k]] || 0;
        }
        return { index: i, score: score };
      })
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });
  }

  return { splitDocuments: splitDocuments, buildModel: buildModel, search: search };
});
