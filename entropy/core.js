/**
 * Shannon entropy core — shared by the CLI (index.js) and the in-browser
 * guessing-game demo. UMD: require() in Node, window.NLP.entropy in browser.
 *
 * Works on the character stream: the tokenized words rejoined with single
 * spaces, so the "alphabet" is the 26 letters plus space (Claude Shannon's
 * own 27-symbol simplification of English in his 1951 paper). Two measures:
 *
 *   - Zero-order entropy: how many bits it takes to encode one character if
 *     you only know the overall letter frequencies (no context at all).
 *   - First-order (conditional) entropy: how many bits it takes once you
 *     also know the *previous* character — the same trick a bigram Markov
 *     chain uses to narrow down what comes next.
 *
 * The gap between the two is a direct, measurable demonstration of "context
 * reduces uncertainty" — the intuition every Markov chain in this repo
 * depends on, made quantitative.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.entropy = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Turn a token list into Shannon's 27-symbol character stream: lowercase
  // letters plus a single space between words (tokenize.js has already
  // stripped everything else).
  function charStream(words) {
    return words.join(' ');
  }

  // Shannon entropy (bits) of a frequency distribution given as counts.
  function entropyFromCounts(counts) {
    var total = 0;
    for (var k in counts) total += counts[k];
    if (total === 0) return 0;
    var h = 0;
    for (var key in counts) {
      var p = counts[key] / total;
      if (p > 0) h -= p * Math.log2(p);
    }
    return h;
  }

  // Zero-order entropy: no context, just overall symbol frequency.
  function zeroOrderEntropy(stream) {
    var counts = {};
    for (var i = 0; i < stream.length; i++) {
      counts[stream[i]] = (counts[stream[i]] || 0) + 1;
    }
    return { entropy: entropyFromCounts(counts), counts: counts, alphabetSize: Object.keys(counts).length };
  }

  // Build a context -> { nextChar: count } table for a given context length
  // ("order"). order=1 means "the table is keyed by the single previous
  // character"; order=0 falls back to one shared context (equivalent to
  // zero-order counts, provided so the same table shape can drive both the
  // entropy calculation and the guessing game).
  function buildContextTable(stream, order) {
    var table = {};
    for (var i = 0; i < stream.length; i++) {
      var ctx = order === 0 ? '' : stream.slice(Math.max(0, i - order), i);
      if (order > 0 && ctx.length < order) continue; // not enough history yet
      var next = stream[i];
      if (!table[ctx]) table[ctx] = {};
      table[ctx][next] = (table[ctx][next] || 0) + 1;
    }
    return table;
  }

  // Conditional entropy H(X | context) = weighted average, over every
  // context, of the entropy of what follows it — weighted by how often that
  // context occurs. Lower than the zero-order entropy whenever context
  // actually narrows down what comes next (which, for English, it always
  // does).
  function conditionalEntropy(stream, order) {
    var table = buildContextTable(stream, order);
    var totalObservations = 0;
    var contextCounts = {};
    for (var ctx in table) {
      var n = 0;
      for (var c in table[ctx]) n += table[ctx][c];
      contextCounts[ctx] = n;
      totalObservations += n;
    }
    var h = 0;
    for (var ctx2 in table) {
      var weight = contextCounts[ctx2] / totalObservations;
      h += weight * entropyFromCounts(table[ctx2]);
    }
    return { entropy: h, table: table, contexts: Object.keys(table).length };
  }

  // Perplexity: 2^H, the "effective number of equally-likely choices" a
  // model with this entropy is choosing among. The same quantity neural-lm
  // reports over words; here it's over single characters.
  function perplexity(bitsPerSymbol) {
    return Math.pow(2, bitsPerSymbol);
  }

  // Rank the possible next characters after `context`, most frequent first.
  // Falls back to the zero-order table (context '') if this exact context
  // was never observed, mirroring how a bigram Markov chain handles an
  // unseen state.
  function rankGuesses(table, context, fallbackTable) {
    var counts = table[context];
    if (!counts && fallbackTable) counts = fallbackTable[''];
    if (!counts) return [];
    return Object.entries(counts)
      .sort(function (a, b) { return b[1] - a[1]; })
      .map(function (e) { return { char: e[0], count: e[1] }; });
  }

  // Shannon's guessing game: walk the stream, and at each position ask "how
  // many guesses, ranked by frequency, would it take to name the actual next
  // character?" order=0 uses no context (overall letter frequency only);
  // order=1 uses the single preceding character. Returns per-position ranks
  // plus the average — a direct, countable measure of predictability.
  function guessGame(stream, order) {
    var table = buildContextTable(stream, order);
    var zeroTable = order === 0 ? table : buildContextTable(stream, 0);
    var ranks = [];
    var start = order;
    for (var i = start; i < stream.length; i++) {
      var ctx = order === 0 ? '' : stream.slice(i - order, i);
      var guesses = rankGuesses(table, ctx, zeroTable);
      var actual = stream[i];
      var rank = guesses.findIndex(function (g) { return g.char === actual; }) + 1;
      ranks.push(rank > 0 ? rank : guesses.length + 1);
    }
    var avg = ranks.reduce(function (a, b) { return a + b; }, 0) / ranks.length;
    return { ranks: ranks, average: avg };
  }

  return {
    charStream: charStream,
    entropyFromCounts: entropyFromCounts,
    zeroOrderEntropy: zeroOrderEntropy,
    buildContextTable: buildContextTable,
    conditionalEntropy: conditionalEntropy,
    perplexity: perplexity,
    rankGuesses: rankGuesses,
    guessGame: guessGame,
  };
});
