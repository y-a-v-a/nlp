/**
 * PMI core — shared by the CLI (index.js) and the in-browser demo. UMD:
 * require() in Node, window.NLP.pmi in the browser. One implementation, so the
 * live collocation finder and the command line rank pairs identically.
 *
 * The algorithm: slide a ±window window across the token stream, count how
 * often each unordered word pair co-occurs and how often each word appears in a
 * co-occurrence slot, then score each pair (that clears a minimum joint count)
 * by Pointwise Mutual Information — the base-2 log of the ratio between the
 * pair's joint probability and the product of the two marginals.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.pmi = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Minimum co-occurrence count before a pair is allowed into the ranking.
  // PMI is biased toward rare events: a pair that appears exactly once, where
  // both words are themselves rare, gets a huge PMI for no meaningful reason.
  // Requiring at least this many joint observations filters out that noise and
  // leaves genuine, repeated collocations. This threshold is the standard
  // practical "hack" that makes PMI usable on real corpora.
  var MIN_COOCCURRENCE = 4;
  var DEFAULT_WINDOW = 3;

  // Score collocations for a token list. Returns:
  //   {
  //     window, minCount,
  //     totalTokens, vocabSize, totalPairs, distinctPairs,
  //     scored: [{ a, b, count, pmi }]   // pairs clearing minCount, input order
  //   }
  // `scored` is in the order pairs are first encountered (not yet ranked), to
  // match the CLI's "sample of the data structure" step; callers sort it.
  function computeCollocations(words, options) {
    options = options || {};
    var window = options.window || DEFAULT_WINDOW;
    var minCount =
      options.minCount === undefined || options.minCount === null
        ? MIN_COOCCURRENCE
        : options.minCount;

    // Step 1: count how often each word occurs on its own.
    // These single counts give us P(x) and P(y).
    var wordCounts = {};
    for (var i = 0; i < words.length; i++) {
      wordCounts[words[i]] = (wordCounts[words[i]] || 0) + 1;
    }

    // Step 2: count how often each unordered word pair co-occurs within the
    // window. For every word we look ahead up to `window` positions and record
    // the pair. Counting only forward pairs (and storing the pair sorted) keeps
    // each co-occurrence counted exactly once — PMI is symmetric, so the pair
    // {a,b} is the same as {b,a}.
    var pairCounts = {};
    var totalPairs = 0; // total number of co-occurrence observations
    for (var p = 0; p < words.length; p++) {
      for (var j = p + 1; j <= p + window && j < words.length; j++) {
        var a = words[p];
        var b = words[j];
        if (a === b) continue; // ignore a word co-occurring with itself
        var key = a < b ? a + '\t' + b : b + '\t' + a;
        pairCounts[key] = (pairCounts[key] || 0) + 1;
        totalPairs++;
      }
    }

    // Step 3: turn the single-word counts into the same "co-occurrence slot"
    // denominator. Each token participates in up to 2*window pair observations
    // (window neighbours on each side), so the marginal probability of a word
    // appearing in a co-occurrence slot is its count over the total slots.
    // Using the same totalPairs denominator for P(x), P(y) and P(x,y) keeps the
    // PMI ratio dimensionally consistent.
    var wordPairTotals = {};
    for (var k = 0; k < words.length; k++) {
      var neighbours = 0;
      for (var f = k + 1; f <= k + window && f < words.length; f++) neighbours++;
      for (var bk = k - 1; bk >= k - window && bk >= 0; bk--) neighbours++;
      wordPairTotals[words[k]] = (wordPairTotals[words[k]] || 0) + neighbours;
    }

    // Step 4: compute PMI for every pair that clears the count threshold.
    //   P(x,y) = pairCount / totalPairs
    //   P(x)   = wordPairTotals[x] / (2 * totalPairs)   (each pair has two ends)
    //   PMI    = log2( P(x,y) / (P(x) * P(y)) )
    var totalEnds = 2 * totalPairs;
    var scored = [];
    for (var key2 in pairCounts) {
      var count = pairCounts[key2];
      if (count < minCount) continue;
      var parts = key2.split('\t');
      var x = parts[0];
      var y = parts[1];
      var pXY = count / totalPairs;
      var pX = wordPairTotals[x] / totalEnds;
      var pY = wordPairTotals[y] / totalEnds;
      var pmi = Math.log2(pXY / (pX * pY));
      scored.push({ a: x, b: y, count: count, pmi: pmi });
    }

    return {
      window: window,
      minCount: minCount,
      totalTokens: words.length,
      vocabSize: Object.keys(wordCounts).length,
      totalPairs: totalPairs,
      distinctPairs: Object.keys(pairCounts).length,
      scored: scored,
    };
  }

  // Convenience: ranked collocations (PMI descending) for a token list.
  // Returns a sorted array of { a, b, count, pmi }.
  function topCollocations(words, options) {
    return computeCollocations(words, options).scored
      .slice()
      .sort(function (m, n) {
        return n.pmi - m.pmi;
      });
  }

  return {
    MIN_COOCCURRENCE: MIN_COOCCURRENCE,
    DEFAULT_WINDOW: DEFAULT_WINDOW,
    computeCollocations: computeCollocations,
    topCollocations: topCollocations,
  };
});
