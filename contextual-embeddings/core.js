(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../word-vectors/core'));
  else { root.NLP = root.NLP || {}; root.NLP.contextualEmbeddings = factory(root.NLP.wordVectors); }
})(typeof self !== 'undefined' ? self : this, function (WV) {
  function contextualize(model, sentence, targetIndex, radius) {
    const words = sentence.slice();
    const baseId = model.dim.get(words[targetIndex]);
    if (baseId === undefined) return null;
    const vector = new Float64Array(model.vocab.length);
    let weight = 0;
    for (let i = Math.max(0, targetIndex - radius); i <= Math.min(words.length - 1, targetIndex + radius); i++) {
      const id = model.dim.get(words[i]);
      if (id === undefined) continue;
      const w = i === targetIndex ? 1 : 1.5;
      const row = model.matrix[id];
      const rowNorm = model.norms[id] || 1;
      for (let d = 0; d < vector.length; d++) vector[d] += (row[d] / rowNorm) * w;
      weight += w;
    }
    if (!weight) return null;
    let norm = 0;
    for (let d = 0; d < vector.length; d++) { vector[d] /= weight; norm += vector[d] * vector[d]; }
    norm = Math.sqrt(norm) || 1;
    for (let d = 0; d < vector.length; d++) vector[d] /= norm;
    return { word: words[targetIndex], sentence: words, targetIndex, vector };
  }
  function cosine(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }
  function compare(model, sentenceA, sentenceB, target, radius) {
    const ia = sentenceA.indexOf(target);
    const ib = sentenceB.indexOf(target);
    if (ia < 0 || ib < 0) return null;
    const a = contextualize(model, sentenceA, ia, radius || 2);
    const b = contextualize(model, sentenceB, ib, radius || 2);
    return a && b ? { target, a, b, similarity: cosine(a.vector, b.vector) } : null;
  }
  function build(words, opts) { return WV.build(words, opts || { topN: 200, window: 3 }); }
  return { build, contextualize, compare, cosine };
});
