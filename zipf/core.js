/**
 * Zipf's law core — shared by the CLI (index.js) and the in-browser demo. UMD:
 * require() in Node, window.NLP.zipf in the browser. One implementation, so the
 * live ranked list and the command line count and rank words identically.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.zipf = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Count how often each word occurs. Returns { word: freq }.
  function count(words) {
    var counts = {};
    for (var i = 0; i < words.length; i++) {
      counts[words[i]] = (counts[words[i]] || 0) + 1;
    }
    return counts;
  }

  // Rank words from most to least frequent. Rank 1 is the single most common
  // word, rank 2 the next, and so on. Returns [{ rank, word, freq }] sorted
  // descending by frequency.
  function rank(words) {
    var counts = count(words);
    var entries = Object.keys(counts).map(function (word) {
      return [word, counts[word]];
    });
    entries.sort(function (a, b) { return b[1] - a[1]; });
    return entries.map(function (entry, i) {
      return { rank: i + 1, word: entry[0], freq: entry[1] };
    });
  }

  // The heart of Zipf's law: rank × frequency, which stays roughly constant
  // across the vocabulary if frequency is proportional to 1 / rank.
  function rankFreq(entry) {
    return entry.rank * entry.freq;
  }

  return { count: count, rank: rank, rankFreq: rankFreq };
});
