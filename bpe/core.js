/**
 * Byte-pair-encoding core — shared by the CLI (index.js) and the in-browser
 * demo. UMD: require() in Node, window.NLP.bpe in the browser. One
 * implementation, so the live tracer and the command line learn and segment
 * identically.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.bpe = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // The end-of-word marker. Appending it to every word lets BPE distinguish a
  // piece that ends a word ("est</w>") from the same letters mid-word ("est"),
  // and stops merges from ever crossing a word boundary.
  var EOW = '</w>';

  /**
   * Split a word into its starting symbol sequence: one symbol per character,
   * plus the end-of-word marker as a final symbol.
   *   "fairest" -> ["f", "a", "i", "r", "e", "s", "t", "</w>"]
   */
  function toSymbols(word) {
    return word.split('').concat(EOW);
  }

  /**
   * Count every adjacent symbol pair across all words, weighting each word's
   * pairs by how often that word appears in the corpus.
   * Returns a Map from "left\tright" -> total weighted frequency.
   */
  function countPairs(vocab) {
    var pairs = new Map();
    for (var v = 0; v < vocab.length; v++) {
      var symbols = vocab[v].symbols;
      var freq = vocab[v].freq;
      for (var i = 0; i < symbols.length - 1; i++) {
        var key = symbols[i] + '\t' + symbols[i + 1];
        pairs.set(key, (pairs.get(key) || 0) + freq);
      }
    }
    return pairs;
  }

  /**
   * Pick the most frequent pair. Ties are broken by lexical order of the joined
   * pair so that runs are fully deterministic and reproducible.
   */
  function bestPair(pairs) {
    var best = null;
    var bestFreq = -1;
    pairs.forEach(function (freq, key) {
      if (freq > bestFreq || (freq === bestFreq && key < best)) {
        best = key;
        bestFreq = freq;
      }
    });
    return best === null ? null : { key: best, freq: bestFreq };
  }

  /**
   * Apply one merge rule (left + right -> leftright) to a symbol sequence.
   */
  function applyMerge(symbols, left, right) {
    var merged = left + right;
    var out = [];
    var i = 0;
    while (i < symbols.length) {
      if (
        i < symbols.length - 1 &&
        symbols[i] === left &&
        symbols[i + 1] === right
      ) {
        out.push(merged);
        i += 2;
      } else {
        out.push(symbols[i]);
        i += 1;
      }
    }
    return out;
  }

  /**
   * Learn an ordered list of merge rules from a list of word tokens.
   *
   * Counts word frequencies, represents each UNIQUE word as a character
   * sequence ending in </w> (weighted by occurrence), then repeatedly finds the
   * most frequent adjacent pair and merges it everywhere, recording the ordered
   * rule and growing the subword vocabulary.
   *
   * @param {string[]} words token stream (e.g. from tokenize())
   * @param {number} numMerges maximum number of merges to learn
   * @returns {{
   *   merges: {left:string, right:string, freq:number}[],
   *   wordFreq: Object,
   *   uniqueWords: string[],
   *   baseSymbolCount: number,
   *   vocabSize: number,
   *   tokenCount: number,
   *   EOW: string
   * }}
   */
  function learn(words, numMerges) {
    var wordFreq = {};
    for (var w = 0; w < words.length; w++) {
      wordFreq[words[w]] = (wordFreq[words[w]] || 0) + 1;
    }
    var uniqueWords = Object.keys(wordFreq).sort(); // sorted for determinism
    var vocab = uniqueWords.map(function (word) {
      return { symbols: toSymbols(word), freq: wordFreq[word] };
    });

    // The starting vocabulary is the set of distinct symbols (characters + </w>).
    var baseSymbols = new Set();
    for (var b = 0; b < vocab.length; b++) {
      var syms = vocab[b].symbols;
      for (var s = 0; s < syms.length; s++) baseSymbols.add(syms[s]);
    }

    // Run BPE: repeatedly find the most frequent adjacent pair and merge it
    // everywhere, recording the ordered merge rule and growing the vocabulary.
    var merges = [];
    var subwordVocab = new Set(baseSymbols);
    for (var iter = 0; iter < numMerges; iter++) {
      var pairs = countPairs(vocab);
      if (pairs.size === 0) break;
      var best = bestPair(pairs);
      if (!best || best.freq < 1) break;
      var parts = best.key.split('\t');
      var left = parts[0];
      var right = parts[1];
      merges.push({ left: left, right: right, freq: best.freq });
      subwordVocab.add(left + right);
      vocab = vocab.map(function (entry) {
        return {
          symbols: applyMerge(entry.symbols, left, right),
          freq: entry.freq,
        };
      });
    }

    return {
      merges: merges,
      wordFreq: wordFreq,
      uniqueWords: uniqueWords,
      baseSymbolCount: baseSymbols.size,
      vocabSize: subwordVocab.size,
      tokenCount: words.length,
      EOW: EOW,
    };
  }

  /**
   * Segment a single word using the first `k` learned merge rules, in order.
   * Used to trace how a word's tokenization evolves as merges accumulate — pass
   * a learned merge list once and vary `k` to watch the word fuse without
   * relearning.
   *
   * @param {string} word
   * @param {{left:string, right:string}[]} merges learned merge rules
   * @param {number} k how many of the learned merges to apply
   * @returns {string[]} the symbol sequence after applying k merges
   */
  function segment(word, merges, k) {
    var symbols = toSymbols(word);
    var upTo = Math.min(k, merges.length);
    for (var m = 0; m < upTo; m++) {
      symbols = applyMerge(symbols, merges[m].left, merges[m].right);
    }
    return symbols;
  }

  return {
    EOW: EOW,
    toSymbols: toSymbols,
    countPairs: countPairs,
    bestPair: bestPair,
    applyMerge: applyMerge,
    learn: learn,
    segment: segment,
  };
});
