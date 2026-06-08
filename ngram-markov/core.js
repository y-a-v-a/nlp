/**
 * N-gram Markov chain core — the shared algorithm behind both the CLI
 * (index.js) and the in-browser "Try it" demo. UMD: require() in Node,
 * window.NLP.ngramMarkov in the browser. Keeping one implementation means the
 * demo and the CLI can never disagree about what an n-gram chain does.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.ngramMarkov = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Build the n-gram chain: each key is a sequence of (ngramSize - 1) words
  // joined by spaces, mapping to the list of words seen to follow that context
  // (with repeats, so more frequent transitions are naturally more likely when
  // picked uniformly at random).
  function buildChain(words, ngramSize) {
    var chain = {};
    for (var i = 0; i <= words.length - ngramSize; i++) {
      // Create the n-gram key (a sequence of n-1 words)
      var ngramKey = words.slice(i, i + ngramSize - 1).join(' ');
      // The word that follows this n-gram
      var nextWord = words[i + ngramSize - 1];

      if (!chain[ngramKey]) {
        chain[ngramKey] = [];
      }

      chain[ngramKey].push(nextWord);
    }
    return chain;
  }

  // Walk the chain to generate up to `length` words. `rng` defaults to
  // Math.random so the CLI and demo can pass a seeded generator for
  // reproducibility. Start from a random prefix; if a context has no recorded
  // followers, jump to a random new prefix.
  function generate(chain, ngramSize, length, options) {
    options = options || {};
    var rng = options.rng || Math.random;
    var ngramKeys = Object.keys(chain);
    if (ngramKeys.length === 0) return [];

    var currentNgram = ngramKeys[Math.floor(rng() * ngramKeys.length)];
    var output = currentNgram.split(' ');

    for (var i = 0; i < length - output.length; i++) {
      // If the current n-gram has no followers, pick a random new n-gram
      if (!chain[currentNgram] || chain[currentNgram].length === 0) {
        currentNgram = ngramKeys[Math.floor(rng() * ngramKeys.length)];
        var newWords = currentNgram.split(' ');
        output.push.apply(output, newWords);
      } else {
        // Otherwise choose one of the followers
        var possibleNextWords = chain[currentNgram];
        var nextWord =
          possibleNextWords[Math.floor(rng() * possibleNextWords.length)];
        output.push(nextWord);

        // Update the current n-gram by removing the first word and adding the new word
        var ngramWords = currentNgram.split(' ');
        ngramWords.shift();
        ngramWords.push(nextWord);
        currentNgram = ngramWords.join(' ');
      }

      // Safety check in case we've reached our desired length
      if (output.length >= length) {
        break;
      }
    }

    return output;
  }

  return { buildChain: buildChain, generate: generate };
});
