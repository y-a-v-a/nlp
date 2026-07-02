/**
 * POS-tagged Markov chain core — the shared algorithm behind both the CLI
 * (index.js) and the in-browser "Try it" demo. UMD: require() in Node,
 * window.NLP.posMarkov in the browser.
 *
 * The state of an ordinary Markov chain is a bare word. Here the state is a
 * (word, part-of-speech) pair, so "light" the noun and "light" the adjective
 * become different nodes and the walk is steered by grammar as well as by which
 * words happened to sit next to which.
 *
 * The whole repository is deliberately dependency-free, so rather than reach
 * for an off-the-shelf tagger we ship a tiny, transparent one: a lexicon of
 * closed-class function words plus a handful of suffix rules, defaulting to
 * Noun. This is the classic baseline tagger (TAGGIT, 1971; the unigram/affix
 * baseline every later tagger is measured against). It is wrong sometimes —
 * that imperfection is itself part of the lesson — but it is small enough to
 * read in one sitting and runs identically in Node and the browser.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.posMarkov = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Closed-class ("function") words. These are a near-fixed list in English, so
  // a lexicon nails them where suffix rules cannot. Listed tag-by-tag for
  // readability; the first tag a word appears under wins (see buildTagMap), so
  // order here encodes precedence for the handful of words that could be two
  // things ("so", "no", "what", "than"…).
  var LEXICON = {
    Determiner: [
      'the', 'a', 'an', 'this', 'that', 'these', 'those', 'thy', 'thine',
      'my', 'mine', 'his', 'her', 'its', 'our', 'your', 'their', 'no',
      'every', 'each', 'some', 'any', 'all', 'both', 'such', 'which', 'what',
    ],
    Pronoun: [
      'i', 'thou', 'thee', 'he', 'she', 'it', 'we', 'ye', 'you', 'they',
      'him', 'them', 'me', 'us', 'who', 'whom', 'whose', 'myself', 'thyself',
      'himself', 'herself', 'itself', 'ourselves', 'yourself', 'themselves',
      'none', 'one', 'aught', 'naught', 'whoever',
    ],
    Preposition: [
      'in', 'on', 'of', 'to', 'with', 'by', 'for', 'from', 'at', 'as',
      'into', 'onto', 'upon', 'against', 'beneath', 'below', 'within',
      'without', 'through', 'throughout', 'before', 'after', 'behind',
      'beside', 'between', 'beyond', 'among', 'amongst', 'about', 'above',
      'across', 'around', 'toward', 'towards', 'till', 'until', 'unto', 'off',
      'over', 'under', 'near', 'since', 'despite', 'during', 'than',
    ],
    Conjunction: [
      'and', 'but', 'or', 'nor', 'yet', 'so', 'if', 'because', 'although',
      'though', 'while', 'whilst', 'whereas', 'unless', 'lest', 'ere',
      'whether', 'either', 'neither', 'therefore', 'wherefore',
    ],
    Verb: [
      'is', 'was', 'are', 'were', 'be', 'been', 'being', 'am', 'art', 'wast',
      'wert', 'hath', 'hast', 'has', 'have', 'had', 'having', 'do', 'does',
      'did', 'done', 'doth', 'dost', 'shall', 'will', 'would', 'should',
      'could', 'may', 'might', 'must', 'can', 'cannot', 'let',
    ],
    Adverb: [
      'not', 'never', 'ever', 'always', 'often', 'here', 'there', 'where',
      'when', 'then', 'now', 'thus', 'hence', 'thence', 'whence', 'still',
      'too', 'very', 'more', 'most', 'less', 'least', 'almost', 'even',
      'only', 'also', 'again', 'away', 'forth', 'indeed', 'perhaps', 'how',
    ],
  };

  // Suffix rules for open-class words, tried in order (most specific first).
  // Each entry: [test-suffix, minimum-word-length, tag]. The length guard keeps
  // short words ("ed", "us", "in") from being mis-fired by a rule.
  var SUFFIX_RULES = [
    ['ly', 4, 'Adverb'],
    ['ing', 5, 'Verb'],
    ['eth', 5, 'Verb'], // archaic 3rd person: loveth, doteth
    ['ed', 4, 'Verb'],
    ['ous', 5, 'Adjective'],
    ['ful', 5, 'Adjective'],
    ['ive', 5, 'Adjective'],
    ['ish', 5, 'Adjective'],
    ['less', 5, 'Adjective'],
    ['able', 6, 'Adjective'],
    ['ible', 6, 'Adjective'],
    ['al', 5, 'Adjective'],
    ['ness', 5, 'Noun'],
    ['ment', 6, 'Noun'],
    ['tion', 6, 'Noun'],
    ['ity', 5, 'Noun'],
    ['ship', 6, 'Noun'],
    ['hood', 6, 'Noun'],
  ];

  // Flatten the lexicon into one word -> tag map, first listing wins.
  function buildTagMap() {
    var map = {};
    var tags = ['Determiner', 'Pronoun', 'Preposition', 'Conjunction', 'Verb', 'Adverb'];
    for (var t = 0; t < tags.length; t++) {
      var words = LEXICON[tags[t]];
      for (var i = 0; i < words.length; i++) {
        if (!(words[i] in map)) map[words[i]] = tags[t];
      }
    }
    return map;
  }

  var TAG_MAP = buildTagMap();

  // Tag a single (already lowercased) token. Lexicon first, then suffix rules,
  // then default to Noun — the standard baseline-tagger fallback, since nouns
  // are the largest open class.
  function tag(word) {
    if (word in TAG_MAP) return TAG_MAP[word];
    for (var i = 0; i < SUFFIX_RULES.length; i++) {
      var rule = SUFFIX_RULES[i];
      if (word.length >= rule[1] && word.slice(-rule[0].length) === rule[0]) {
        return rule[2];
      }
    }
    return 'Noun';
  }

  // Tag a stream of tokens, returning [{ word, tag, key }], where key is the
  // "word|Tag" string used as the Markov state.
  function tagWords(words) {
    var out = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      var tg = tag(w);
      out.push({ word: w, tag: tg, key: w + '|' + tg });
    }
    return out;
  }

  // Build the chain: each (word, POS) state maps to the list of states seen to
  // follow it, with repeats — so uniform random selection naturally favours
  // more frequent transitions. Note this differs from the plain Markov core
  // (which keeps only distinct followers): coming after the probability-based
  // chains in the journey, this one keeps the frequency-weighting idea folded
  // in via the repeats.
  function buildChain(tagged) {
    var chain = {};
    for (var i = 0; i < tagged.length - 1; i++) {
      var key = tagged[i].key;
      if (!chain[key]) chain[key] = [];
      chain[key].push(tagged[i + 1]);
    }
    return chain;
  }

  // Walk the chain to generate `length` states. Returns [{ word, tag }]. `rng`
  // defaults to Math.random so the CLI/demo can pass a seeded generator. If a
  // state has no recorded followers, jump to a random state in the vocabulary.
  function generate(chain, length, options) {
    options = options || {};
    var rng = options.rng || Math.random;
    var keys = Object.keys(chain);
    if (keys.length === 0) return [];
    var startKey =
      options.start && chain[options.start]
        ? options.start
        : keys[Math.floor(rng() * keys.length)];
    var parts = startKey.split('|');
    var out = [{ word: parts[0], tag: parts[1] }];
    var current = startKey;
    for (var i = 1; i < length; i++) {
      var followers = chain[current];
      if (followers && followers.length) {
        var next = followers[Math.floor(rng() * followers.length)];
        out.push({ word: next.word, tag: next.tag });
        current = next.key;
      } else {
        current = keys[Math.floor(rng() * keys.length)];
        var p = current.split('|');
        out.push({ word: p[0], tag: p[1] });
      }
    }
    return out;
  }

  // Collapse a state's follower list into unique followers with counts, sorted
  // most-frequent first. Used by both the CLI sample and the demo explorer.
  function followers(chain, key) {
    var list = chain[key] || [];
    var counts = {};
    for (var i = 0; i < list.length; i++) {
      var k = list[i].key;
      if (!counts[k]) counts[k] = { word: list[i].word, tag: list[i].tag, count: 0 };
      counts[k].count++;
    }
    return Object.keys(counts)
      .map(function (k) { return counts[k]; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  return {
    tag: tag,
    tagWords: tagWords,
    buildChain: buildChain,
    generate: generate,
    followers: followers,
    TAGS: ['Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun', 'Determiner', 'Preposition', 'Conjunction'],
  };
});
