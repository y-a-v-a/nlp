/**
 * Probability-based Markov chain core — the shared algorithm behind both the
 * CLI (index.js) and the in-browser "Try it" demo. UMD: require() in Node,
 * window.NLP.probabilityMarkov in the browser. Keeping one implementation
 * means the demo and the CLI can never disagree about how transitions are
 * weighted.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.probabilityMarkov = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Build the chain: each word maps to an object of followers, each follower
  // being { word, probability }. The probability is the follower's raw count
  // divided by the total count of all followers for that key — i.e. a proper
  // probability distribution over what comes next.
  function buildChain(words) {
    var chain = {};

    // First pass: raw counts.
    for (var i = 0; i < words.length - 1; i++) {
      var currentWord = words[i];
      var nextWord = words[i + 1];
      if (!chain[currentWord]) chain[currentWord] = {};
      if (!chain[currentWord][nextWord]) {
        chain[currentWord][nextWord] = 1;
      } else {
        chain[currentWord][nextWord]++;
      }
    }

    // Second pass: counts -> probabilities.
    for (var word in chain) {
      var followers = chain[word];
      var totalOccurrences = 0;
      for (var f in followers) totalOccurrences += followers[f];
      for (var follower in followers) {
        chain[word][follower] = {
          word: follower,
          probability: followers[follower] / totalOccurrences,
        };
      }
    }

    return chain;
  }

  // Walk the chain to generate `length` words using a weighted random draw.
  // `rng` defaults to Math.random so the CLI and demo can pass a seeded
  // generator. If a word has no recorded followers, jump to a random key.
  function generate(chain, length, options) {
    options = options || {};
    var rng = options.rng || Math.random;
    var keys = Object.keys(chain);
    if (keys.length === 0) return [];

    var current =
      options.start && chain[options.start]
        ? options.start
        : keys[Math.floor(rng() * keys.length)];
    var output = [current];

    for (var i = 1; i < length; i++) {
      var followers = chain[current];
      if (!followers || Object.keys(followers).length === 0) {
        current = keys[Math.floor(rng() * keys.length)];
      } else {
        // Weighted random draw: roll [0,1) and walk the cumulative
        // probability until the threshold is crossed.
        var rand = rng();
        var cumulativeProbability = 0;
        for (var follower in followers) {
          cumulativeProbability += followers[follower].probability;
          if (rand < cumulativeProbability) {
            current = followers[follower].word;
            break;
          }
        }
      }
      output.push(current);
    }

    return output;
  }

  return { buildChain: buildChain, generate: generate };
});
