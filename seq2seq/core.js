(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NLP = root.NLP || {}; root.NLP.seq2seq = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  function tokens(text) { return String(text).trim().split(/\s+/).filter(Boolean); }
  function run(input, capacity) {
    const source = Array.isArray(input) ? input.slice() : tokens(input);
    const cap = Math.max(1, Math.floor(capacity));
    const context = source.slice(-cap);
    const target = source.slice().reverse();
    const known = context.slice().reverse();
    const output = known.concat(Array(Math.max(0, target.length - known.length)).fill('<?>'));
    let correct = 0;
    for (let i = 0; i < target.length; i++) if (output[i] === target[i]) correct++;
    return { source, capacity: cap, context, target, output, correct,
      accuracy: target.length ? correct / target.length : 0 };
  }
  function curve(maxLength, capacity) {
    const vocab = ['red', 'fox', 'jumps', 'over', 'the', 'quiet', 'moon', 'at'];
    return Array.from({ length: maxLength }, (_, i) => ({
      length: i + 1,
      accuracy: run(Array.from({ length: i + 1 }, (_, j) => vocab[j % vocab.length]), capacity).accuracy,
    }));
  }
  return { tokens, run, curve };
});
