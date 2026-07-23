/**
 * Linear-chain conditional random field, shared by the CLI and browser demo.
 * UMD: require() in Node, window.NLP.crfTagger in the browser.
 *
 * Where the HMM models P(words, tags) — a generative story in which tags
 * transition and then emit words — a CRF scores P(tags | words) directly.
 * That discriminative turn is the whole point: any number of overlapping
 * clues (the word itself, its suffix, the previous tag) may vote on a
 * position at once, with no pretence that they are independent.
 *
 * A "feature" here is just a named weight. Each candidate tag path collects
 * the weights of every feature it fires; the path with the biggest total
 * wins (Viterbi), and summing over ALL paths (the partition function Z)
 * turns that raw score into a proper conditional probability.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NLP = root.NLP || {}; root.NLP.crfTagger = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  var TAGS = ['Noun', 'Verb', 'Adjective', 'Pronoun', 'Determiner'];
  var START = '<START>';
  var SUFFIXES = ['ing', 'ed', 'ful', 'ous'];

  // Features live in a flat map keyed 'kind|tag|detail', e.g.
  // 'word|Verb|rose' or 'transition|Pronoun|Verb'. Flat names make it easy
  // to see that a CRF is nothing but a weighted feature inventory.
  function key() { return Array.from(arguments).join('|'); }

  // A real CRF learns these weights from an annotated corpus; here they are
  // set by hand so the demo stays dependency-free and inspectable. Note the
  // deliberate ambiguity: "rose", "present" and "love" carry weight as BOTH
  // noun and verb, so only context can settle them.
  function defaultWeights() {
    var w = {};
    var add = function (name, value) { w[name] = (w[name] || 0) + value; };

    // Word-identity features: how strongly a word argues for a tag.
    ['the', 'a', 'an'].forEach(function (x) { add(key('word', 'Determiner', x), 4); });
    ['they', 'we', 'i', 'you', 'he', 'she'].forEach(function (x) { add(key('word', 'Pronoun', x), 4); });
    ['is', 'are', 'was', 'were', 'rose', 'present', 'love'].forEach(function (x) { add(key('word', 'Verb', x), 1.4); });
    ['rose', 'love', 'time', 'mind', 'face', 'present'].forEach(function (x) { add(key('word', 'Noun', x), 1.2); });
    ['fair', 'bright', 'honest', 'present'].forEach(function (x) { add(key('word', 'Adjective', x), 1.5); });

    // Suffix features: morphology votes even for words never seen before.
    add(key('suffix', 'Verb', 'ing'), 1.3);
    add(key('suffix', 'Verb', 'ed'), 1.1);
    add(key('suffix', 'Adjective', 'ful'), 1.3);
    add(key('suffix', 'Adjective', 'ous'), 1.3);

    // Transition features: how plausible tag B is right after tag A.
    // These are what let "they rose" and "the rose" come out differently.
    var transitions = [
      [START, 'Pronoun', 1.5], [START, 'Determiner', 1.5], [START, 'Noun', 0.4],
      ['Pronoun', 'Verb', 2.2], ['Determiner', 'Noun', 1.5], ['Determiner', 'Adjective', 1.7],
      ['Adjective', 'Noun', 2], ['Verb', 'Noun', 0.8], ['Noun', 'Verb', 0.7],
    ];
    transitions.forEach(function (t) { add(key('transition', t[0], t[1]), t[2]); });
    return w;
  }

  // The score of putting `tag` at position i, given the previous tag: sum
  // every feature that fires there. Unknown features simply contribute 0.
  function localScore(weights, words, i, tag, prev) {
    var word = words[i];
    var s = weights[key('transition', prev, tag)] || 0;
    s += weights[key('word', tag, word)] || 0;
    SUFFIXES.forEach(function (suffix) {
      if (word.endsWith(suffix)) s += weights[key('suffix', tag, suffix)] || 0;
    });
    return s;
  }

  // Viterbi decoding: the same dynamic programme as the HMM tagger, but over
  // feature sums instead of log-probabilities. Column t holds, for each tag,
  // the best score of any path ending in that tag, plus a back-pointer.
  function viterbi(words, weights) {
    weights = weights || defaultWeights();
    if (!words.length) return { tags: [], score: 0, trellis: [] };

    // First column: every tag scored against the artificial START state.
    var column = {};
    TAGS.forEach(function (tag) {
      column[tag] = { score: localScore(weights, words, 0, tag, START), prev: null };
    });
    var trellis = [column];

    // Each later column keeps only the best way to arrive at each tag.
    for (var i = 1; i < words.length; i++) {
      var next = {};
      TAGS.forEach(function (tag) {
        var best = { score: -Infinity, prev: null };
        TAGS.forEach(function (prev) {
          var score = column[prev].score + localScore(weights, words, i, tag, prev);
          if (score > best.score) best = { score: score, prev: prev };
        });
        next[tag] = best;
      });
      trellis.push(next);
      column = next;
    }

    // Walk the back-pointers from the best final tag to recover the path.
    var last = TAGS.reduce(function (a, b) { return column[a].score > column[b].score ? a : b; });
    var tags = new Array(words.length);
    tags[words.length - 1] = last;
    for (var t = words.length - 1; t > 0; t--) tags[t - 1] = trellis[t][tags[t]].prev;
    return { tags: tags, score: column[last].score, trellis: trellis };
  }

  // log(Σ e^v) computed without overflow, by factoring out the maximum.
  function logSumExp(values) {
    var m = Math.max.apply(null, values);
    return m + Math.log(values.reduce(function (s, v) { return s + Math.exp(v - m); }, 0));
  }

  // The forward algorithm: where Viterbi keeps the MAX over incoming paths,
  // this keeps the log-SUM, so the final result is log Z(x) — the log of the
  // total score mass of every possible tag sequence for this sentence.
  function logPartition(words, weights) {
    weights = weights || defaultWeights();
    if (!words.length) return 0;
    var alpha = {};
    TAGS.forEach(function (tag) { alpha[tag] = localScore(weights, words, 0, tag, START); });
    for (var i = 1; i < words.length; i++) {
      var next = {};
      TAGS.forEach(function (tag) {
        next[tag] = logSumExp(TAGS.map(function (prev) {
          return alpha[prev] + localScore(weights, words, i, tag, prev);
        }));
      });
      alpha = next;
    }
    return logSumExp(TAGS.map(function (tag) { return alpha[tag]; }));
  }

  // Best path plus its normalized probability:
  // P(tags | words) = e^score / Z(x) = e^(score − log Z).
  function decode(words, weights) {
    if (!words.length) {
      return { tags: [], score: 0, trellis: [], logZ: 0, probability: 0 };
    }
    var best = viterbi(words, weights);
    var logZ = logPartition(words, weights);
    return Object.assign(best, { logZ: logZ, probability: Math.exp(best.score - logZ) });
  }

  return { TAGS: TAGS, defaultWeights: defaultWeights, localScore: localScore, viterbi: viterbi, logPartition: logPartition, decode: decode };
});
