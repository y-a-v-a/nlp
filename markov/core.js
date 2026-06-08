/**
 * Markov chain core — the shared algorithm behind both the CLI (index.js) and
 * the in-browser "Try it" demo. UMD: require() in Node, window.NLP.markov in
 * the browser. Keeping one implementation means the demo and the CLI can never
 * disagree about what a Markov chain does.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.markov = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Build the chain: each word maps to the list of words seen to follow it
  // (with repeats, so more frequent transitions are naturally more likely when
  // picked uniformly at random).
  function buildChain(words) {
    var chain = {};
    for (var i = 0; i < words.length - 1; i++) {
      var w = words[i];
      if (!chain[w]) chain[w] = [];
      chain[w].push(words[i + 1]);
    }
    return chain;
  }

  // Walk the chain to generate `length` words. `rng` defaults to Math.random so
  // the CLI and demo can pass a seeded generator for reproducibility. If a word
  // has no recorded followers, jump to a random word in the vocabulary.
  function generate(chain, length, options) {
    options = options || {};
    var rng = options.rng || Math.random;
    var keys = Object.keys(chain);
    if (keys.length === 0) return [];
    var current =
      options.start && chain[options.start]
        ? options.start
        : keys[Math.floor(rng() * keys.length)];
    var out = [current];
    for (var i = 1; i < length; i++) {
      var next = chain[current];
      current =
        next && next.length
          ? next[Math.floor(rng() * next.length)]
          : keys[Math.floor(rng() * keys.length)];
      out.push(current);
    }
    return out;
  }

  return { buildChain: buildChain, generate: generate };
});
