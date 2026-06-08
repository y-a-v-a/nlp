/**
 * Edit-distance core — shared by the CLI (index.js) and the in-browser demo.
 * UMD: require() in Node, window.NLP.editDistance in the browser. One
 * implementation, so the live DP-matrix view and the command line compute the
 * exact same distances.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.editDistance = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  /**
   * Classic Levenshtein edit distance via the dynamic-programming matrix.
   *
   * Returns both the final distance and the full (m+1) x (n+1) matrix, so the
   * caller can print/render the table and make the mechanic visible. Cell
   * [i][j] holds the minimum number of single-character insertions, deletions,
   * and substitutions needed to turn the first i characters of `a` into the
   * first j characters of `b`.
   *
   * @param {string} a source string (rows)
   * @param {string} b target string (columns)
   * @returns {{distance: number, matrix: number[][]}}
   */
  function editDistance(a, b) {
    var m = a.length;
    var n = b.length;

    // matrix[i][j] = edit distance between a[0..i) and b[0..j)
    var matrix = [];
    for (var i = 0; i <= m; i++) {
      matrix.push(new Array(n + 1).fill(0));
    }

    // Base cases: turning a prefix into the empty string costs one deletion per
    // character; building a prefix from the empty string costs one insertion.
    for (var r = 0; r <= m; r++) matrix[r][0] = r;
    for (var c = 0; c <= n; c++) matrix[0][c] = c;

    // Fill the rest. Each cell is the cheapest of three moves:
    //   - delete a[i-1]        -> matrix[i-1][j]   + 1
    //   - insert b[j-1]        -> matrix[i][j-1]   + 1
    //   - substitute (or copy) -> matrix[i-1][j-1] + (chars differ ? 1 : 0)
    for (var ii = 1; ii <= m; ii++) {
      for (var jj = 1; jj <= n; jj++) {
        var cost = a[ii - 1] === b[jj - 1] ? 0 : 1;
        matrix[ii][jj] = Math.min(
          matrix[ii - 1][jj] + 1,
          matrix[ii][jj - 1] + 1,
          matrix[ii - 1][jj - 1] + cost
        );
      }
    }

    return { distance: matrix[m][n], matrix: matrix };
  }

  /**
   * Build a unique vocabulary array from already-tokenized words. Edit distance
   * is a property of distinct word forms, so duplicates add nothing.
   *
   * @param {string[]} tokens
   * @returns {string[]} unique tokens, in first-seen order
   */
  function buildVocab(tokens) {
    return Array.from(new Set(tokens));
  }

  /**
   * Spell-check helper: rank vocabulary words by edit distance to `word`.
   * Sorted by distance, then alphabetically, so the output is fully
   * deterministic. Returns the top `k` (all of them if `k` is omitted).
   *
   * @param {string} word the input (possibly misspelled) word
   * @param {string[]} vocabArray the vocabulary to search
   * @param {number} [k] how many results to keep
   * @returns {{word: string, distance: number}[]}
   */
  function closest(word, vocabArray, k) {
    var scored = vocabArray
      .map(function (w) {
        return { word: w, distance: editDistance(word, w).distance };
      })
      .sort(function (a, b) {
        return a.distance - b.distance || (a.word < b.word ? -1 : 1);
      });
    return typeof k === 'number' ? scored.slice(0, k) : scored;
  }

  return { editDistance: editDistance, buildVocab: buildVocab, closest: closest };
});
