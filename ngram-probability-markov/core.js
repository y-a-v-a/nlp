/**
 * N-gram + probability Markov core — the shared algorithm behind both the CLI
 * (index.js) and the in-browser "Try it" demo. UMD: require() in Node,
 * window.NLP.ngramProbabilityMarkov in the browser. Keeping one implementation
 * means the demo and the CLI can never disagree about what this model does.
 *
 * Note on terminology: `contextSize` is the number of words used as the lookup
 * key (the N-1 of an N-gram). With contextSize=2 this is a trigram model:
 * two words of context predict the third.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.ngramProbabilityMarkov = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Build the chain: each context key (a sequence of `contextSize` words joined
  // by spaces) maps to an object of followers. Each follower is stored as
  // { word, probability }, where probability is that follower's share of all
  // continuations seen for the context.
  function buildChain(words, contextSize) {
    contextSize = contextSize || 2;
    var chain = {};

    for (var i = 0; i <= words.length - (contextSize + 1); i++) {
      var contextKey = words.slice(i, i + contextSize).join(' ');
      var nextWord = words[i + contextSize];

      if (!chain[contextKey]) chain[contextKey] = {};
      if (!chain[contextKey][nextWord]) {
        chain[contextKey][nextWord] = 1;
      } else {
        chain[contextKey][nextWord]++;
      }
    }

    // Convert raw counts into { word, probability } records.
    for (var ngram in chain) {
      var followers = chain[ngram];
      var total = 0;
      for (var w in followers) total += followers[w];
      for (var follower in followers) {
        chain[ngram][follower] = {
          word: follower,
          probability: followers[follower] / total,
        };
      }
    }

    return chain;
  }

  // Walk the chain to generate `length` words. `rng` defaults to Math.random so
  // the CLI and demo can pass a seeded generator for reproducibility. Start from
  // a random context; at each step do a weighted draw over the followers of the
  // current context. If the current context has no followers, jump to a random
  // context key.
  function generate(chain, contextSize, length, options) {
    options = options || {};
    contextSize = contextSize || 2;
    var rng = options.rng || Math.random;
    var contextKeys = Object.keys(chain);
    if (contextKeys.length === 0) return [];

    var currentContext = contextKeys[Math.floor(rng() * contextKeys.length)];
    var output = currentContext.split(' ');

    for (var i = 0; i < length - output.length; i++) {
      if (
        !chain[currentContext] ||
        Object.keys(chain[currentContext]).length === 0
      ) {
        currentContext = contextKeys[Math.floor(rng() * contextKeys.length)];
        output.push.apply(output, currentContext.split(' '));
      } else {
        var followers = chain[currentContext];
        var rand = rng();
        var cumulative = 0;
        for (var follower in followers) {
          cumulative += followers[follower].probability;
          if (rand < cumulative) {
            var nextWord = followers[follower].word;
            output.push(nextWord);

            var contextWords = currentContext.split(' ');
            contextWords.shift();
            contextWords.push(nextWord);
            currentContext = contextWords.join(' ');
            break;
          }
        }
      }

      if (output.length >= length) break;
    }

    return output;
  }

  return { buildChain: buildChain, generate: generate };
});
