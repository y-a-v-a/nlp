/**
 * Bigram HMM part-of-speech tagger with Viterbi decoding — shared by the CLI
 * (index.js) and the in-browser trellis demo. UMD: require() in Node,
 * window.NLP.hmmTagger in the browser.
 *
 * pos-markov/'s baseline tagger looks at one word in isolation: "rose" is
 * always tagged the same way, everywhere, because the tagger has no notion
 * of "everywhere" — it is a pure function of the word's spelling. A Hidden
 * Markov Model fixes exactly this by scoring a whole *sequence* of tags at
 * once: P(tag sequence) x P(words | tags), so a word that can plausibly be
 * two different tags gets resolved by what surrounds it, not just by itself.
 *
 * This file intentionally re-implements (rather than requires) the baseline
 * lexicon/suffix tagger from pos-markov/core.js — every core.js in this repo
 * is self-contained so it can be dropped into a <script> tag on its own; see
 * rag/core.js for the same pattern with tfidf's retrieval logic.
 *
 * Training data problem: this repo has no hand-annotated corpus, and adding
 * one is out of scope for a zero-dependency project. So the HMM is trained
 * two ways at once, and both are named honestly:
 *   1. Transition counts come from auto-tagging the real sonnets with the
 *      baseline tagger. Individual word tags are sometimes wrong, but the
 *      *sequence* patterns of English (a Pronoun is usually followed by a
 *      Verb, a Determiner by a Noun or Adjective) are still real signal.
 *   2. Emission counts come from the same auto-tagged corpus, PLUS a small,
 *      explicitly hand-authored set of ambiguity seeds (AMBIGUITY_SEEDS)
 *      for a few classic ambiguous words. Without this, the model could
 *      never learn that "rose" can be anything but a Noun: the baseline
 *      tagger that generated its training data never once called it
 *      anything else, anywhere in the corpus. This is not a training
 *      trick to hide — it is the whole lesson: an HMM is only as
 *      disambiguating as the labelled data it is shown.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.hmmTagger = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var TAGS = ['Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun', 'Determiner', 'Preposition', 'Conjunction'];
  var START = 'START';
  var END = 'END';

  // --- The baseline tagger (mirrors pos-markov/core.js) --------------------
  var LEXICON = {
    Determiner: ['the', 'a', 'an', 'this', 'that', 'these', 'those', 'thy', 'thine',
      'my', 'mine', 'his', 'her', 'its', 'our', 'your', 'their', 'no',
      'every', 'each', 'some', 'any', 'all', 'both', 'such', 'which', 'what'],
    Pronoun: ['i', 'thou', 'thee', 'he', 'she', 'it', 'we', 'ye', 'you', 'they',
      'him', 'them', 'me', 'us', 'who', 'whom', 'whose', 'myself', 'thyself',
      'himself', 'herself', 'itself', 'ourselves', 'yourself', 'themselves',
      'none', 'one', 'aught', 'naught', 'whoever'],
    Preposition: ['in', 'on', 'of', 'to', 'with', 'by', 'for', 'from', 'at', 'as',
      'into', 'onto', 'upon', 'against', 'beneath', 'below', 'within',
      'without', 'through', 'throughout', 'before', 'after', 'behind',
      'beside', 'between', 'beyond', 'among', 'amongst', 'about', 'above',
      'across', 'around', 'toward', 'towards', 'till', 'until', 'unto', 'off',
      'over', 'under', 'near', 'since', 'despite', 'during', 'than'],
    Conjunction: ['and', 'but', 'or', 'nor', 'yet', 'so', 'if', 'because', 'although',
      'though', 'while', 'whilst', 'whereas', 'unless', 'lest', 'ere',
      'whether', 'either', 'neither', 'therefore', 'wherefore'],
    Verb: ['is', 'was', 'are', 'were', 'be', 'been', 'being', 'am', 'art', 'wast',
      'wert', 'hath', 'hast', 'has', 'have', 'had', 'having', 'do', 'does',
      'did', 'done', 'doth', 'dost', 'shall', 'will', 'would', 'should',
      'could', 'may', 'might', 'must', 'can', 'cannot', 'let'],
    Adverb: ['not', 'never', 'ever', 'always', 'often', 'here', 'there', 'where',
      'when', 'then', 'now', 'thus', 'hence', 'thence', 'whence', 'still',
      'too', 'very', 'more', 'most', 'less', 'least', 'almost', 'even',
      'only', 'also', 'again', 'away', 'forth', 'indeed', 'perhaps', 'how'],
  };
  var SUFFIX_RULES = [
    ['ly', 4, 'Adverb'], ['ing', 5, 'Verb'], ['eth', 5, 'Verb'], ['ed', 4, 'Verb'],
    ['ous', 5, 'Adjective'], ['ful', 5, 'Adjective'], ['ive', 5, 'Adjective'],
    ['ish', 5, 'Adjective'], ['less', 5, 'Adjective'], ['able', 6, 'Adjective'],
    ['ible', 6, 'Adjective'], ['al', 5, 'Adjective'], ['ness', 5, 'Noun'],
    ['ment', 6, 'Noun'], ['tion', 6, 'Noun'], ['ity', 5, 'Noun'],
    ['ship', 6, 'Noun'], ['hood', 6, 'Noun'],
  ];
  var TAG_MAP = (function () {
    var map = {};
    var order = ['Determiner', 'Pronoun', 'Preposition', 'Conjunction', 'Verb', 'Adverb'];
    for (var t = 0; t < order.length; t++) {
      var words = LEXICON[order[t]];
      for (var i = 0; i < words.length; i++) if (!(words[i] in map)) map[words[i]] = order[t];
    }
    return map;
  })();

  function baselineTag(word) {
    if (word in TAG_MAP) return TAG_MAP[word];
    for (var i = 0; i < SUFFIX_RULES.length; i++) {
      var rule = SUFFIX_RULES[i];
      if (word.length >= rule[1] && word.slice(-rule[0].length) === rule[0]) return rule[2];
    }
    return 'Noun';
  }

  // Hand-authored ambiguity seeds: [word, tag, count]. These are the only
  // hand-written numbers in the whole model — everything else is counted
  // from the corpus. Without them the emission table would never contain a
  // second tag for these words, because the baseline tagger that trains the
  // emission table is itself context-free and would tag every occurrence
  // identically.
  var AMBIGUITY_SEEDS = [
    ['rose', 'Verb', 6], // "they rose", "the sun rose" — vs. the corpus's flower-noun "rose"
    ['light', 'Verb', 4], ['light', 'Adjective', 4], // "light a candle" / "a light touch" — vs. corpus's noun "light"
    ['still', 'Adjective', 5], ['still', 'Verb', 3], // "the still water" / "still the storm" — vs. lexicon's adverb "still"
  ];

  // --- Training: counts -> smoothed log-probabilities -----------------------
  // Laplace (add-1) smoothing, same as naive-bayes/core.js, so an unseen
  // transition or emission gets a small nonzero probability instead of
  // zeroing out the whole sequence.
  function train(words) {
    var transitionCounts = {}; // transitionCounts[prevTag][tag] = count
    var emissionCounts = {}; // emissionCounts[tag][word] = count
    var tagTotals = {};
    TAGS.forEach(function (t) { transitionCounts[t] = {}; emissionCounts[t] = {}; tagTotals[t] = 0; });
    transitionCounts[START] = {};

    function bump(obj, key) { obj[key] = (obj[key] || 0) + 1; }

    var prev = START;
    var autoTags = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      var t = baselineTag(w);
      autoTags.push(t);
      bump(transitionCounts[prev], t);
      bump(emissionCounts[t], w);
      tagTotals[t]++;
      prev = t;
    }
    bump(transitionCounts[prev], END);

    AMBIGUITY_SEEDS.forEach(function (seed) {
      var word = seed[0], tag = seed[1], count = seed[2];
      emissionCounts[tag][word] = (emissionCounts[tag][word] || 0) + count;
      tagTotals[tag] += count;
    });

    // Vocabulary size, for emission smoothing's denominator (like naive-bayes).
    var vocab = {};
    words.forEach(function (w) { vocab[w] = true; });
    AMBIGUITY_SEEDS.forEach(function (s) { vocab[s[0]] = true; });
    var V = Object.keys(vocab).length;

    return {
      transitionCounts: transitionCounts,
      emissionCounts: emissionCounts,
      tagTotals: tagTotals,
      vocabSize: V,
      trainingTokens: words.length,
      autoTags: autoTags,
    };
  }

  function logTransitionProb(model, prevTag, tag) {
    var counts = model.transitionCounts[prevTag] || {};
    var total = 0;
    for (var k in counts) total += counts[k];
    var allTags = TAGS.concat([END]);
    var c = counts[tag] || 0;
    return Math.log((c + 1) / (total + allTags.length));
  }

  function logEmissionProb(model, tag, word) {
    var counts = model.emissionCounts[tag] || {};
    var c = counts[word] || 0;
    return Math.log((c + 1) / (model.tagTotals[tag] + model.vocabSize + 1));
  }

  // Viterbi decoding in log space. Returns { tags, trellis, score } where
  // trellis[t][tag] = { logProb, back } for every position t and tag — the
  // full dynamic-programming grid, so the caller can render it (the same
  // "matrix with a highlighted winning path" idea as edit-distance/'s DP
  // matrix, reused here for sequences of tags instead of sequences of edits).
  function viterbi(model, words) {
    var n = words.length;
    if (n === 0) return { tags: [], trellis: [], score: -Infinity };
    var trellis = [];

    for (var t = 0; t < n; t++) {
      var col = {};
      TAGS.forEach(function (tag) {
        var emit = logEmissionProb(model, tag, words[t]);
        if (t === 0) {
          col[tag] = { logProb: logTransitionProb(model, START, tag) + emit, back: null };
        } else {
          var best = -Infinity, bestPrev = null;
          TAGS.forEach(function (prevTag) {
            var score = trellis[t - 1][prevTag].logProb + logTransitionProb(model, prevTag, tag);
            if (score > best) { best = score; bestPrev = prevTag; }
          });
          col[tag] = { logProb: best + emit, back: bestPrev };
        }
      });
      trellis.push(col);
    }

    var lastCol = trellis[n - 1];
    var bestFinal = -Infinity, bestTag = null;
    TAGS.forEach(function (tag) {
      var score = lastCol[tag].logProb + logTransitionProb(model, tag, END);
      if (score > bestFinal) { bestFinal = score; bestTag = tag; }
    });

    var tags = new Array(n);
    tags[n - 1] = bestTag;
    for (var i = n - 1; i > 0; i--) tags[i - 1] = trellis[i][tags[i]].back;

    return { tags: tags, trellis: trellis, score: bestFinal };
  }

  return {
    TAGS: TAGS, START: START, END: END,
    baselineTag: baselineTag,
    AMBIGUITY_SEEDS: AMBIGUITY_SEEDS,
    train: train,
    logTransitionProb: logTransitionProb,
    logEmissionProb: logEmissionProb,
    viterbi: viterbi,
  };
});
