/**
 * ELIZA core — a small Rogerian pattern-matcher in the spirit of Weizenbaum
 * (1966), shared by the CLI (index.js) and the in-browser chat demo. UMD:
 * require() in Node, window.NLP.eliza in the browser.
 *
 * This is the one technique in the repo with no corpus: the rules are the
 * whole model. Each rule is a regular expression with a captured "content"
 * group and a small list of response templates; the first rule whose pattern
 * matches the input wins, and its captured content is pronoun-reflected
 * ("I need help" -> "you need help") before being spliced into the reply.
 * When nothing matches, a cycling list of generic prompts keeps the
 * conversation going without ever touching what was actually said.
 *
 * Response selection cycles deterministically (round-robin per rule) rather
 * than drawing randomly, so a transcript reproduces exactly on every run —
 * no seed needed, because there is nothing to seed.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.eliza = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Pronoun/verb swaps applied to the text captured by a rule, so "I need
  // help" reflects to "you need help" before it's echoed back as a question.
  var REFLECTIONS = {
    am: 'are', was: 'were', i: 'you', "i'm": 'you are', "i'd": 'you would',
    "i've": 'you have', "i'll": 'you will', my: 'your', are: 'am',
    "you're": 'I am', "you've": 'I have', "you'll": 'I will', your: 'my',
    yours: 'mine', you: 'I', me: 'you', myself: 'yourself',
    yourself: 'myself', mine: 'yours',
  };

  function reflect(text) {
    return text
      .split(/\s+/)
      .map(function (word) {
        var clean = word.toLowerCase();
        return REFLECTIONS.hasOwnProperty(clean) ? REFLECTIONS[clean] : word;
      })
      .join(' ');
  }

  // Each rule: a regex with one capturing group (the part to reflect and
  // splice into the response), and a list of response templates. "{1}" in a
  // template is replaced by the reflected capture; templates with no "{1}"
  // ignore the capture entirely (useful when only the keyword matters).
  var RULES = [
    { pattern: /\bi need (.*)/i, responses: [
      'Why do you need {1}?',
      'Would it really help you to get {1}?',
      'Are you sure you need {1}?',
    ] },
    { pattern: /\bi (?:am|'m) (.*)/i, responses: [
      'How long have you been {1}?',
      'Why do you think you are {1}?',
      'Do you enjoy being {1}?',
    ] },
    { pattern: /\bi can'?t (.*)/i, responses: [
      "How do you know you can't {1}?",
      'Have you tried?',
      'Perhaps you could {1} if you tried.',
    ] },
    { pattern: /\bi feel (.*)/i, responses: [
      'Tell me more about that feeling.',
      'Do you often feel {1}?',
      'What do you think is behind feeling {1}?',
    ] },
    { pattern: /\bi (?:want|wish) (.*)/i, responses: [
      'What would it mean to you if you got {1}?',
      'Why do you want {1}?',
    ] },
    { pattern: /\bwhy don'?t you (.*)/i, responses: [
      'Do you really think I don’t {1}?',
      'Perhaps eventually I will {1}.',
      'Do you really want me to {1}?',
    ] },
    { pattern: /\bwhy can'?t i (.*)/i, responses: [
      'Do you think you should be able to {1}?',
      'What is stopping you from {1}?',
    ] },
    { pattern: /\bare you (.*)/i, responses: [
      'Why does it matter whether I am {1}?',
      'Would you prefer if I weren’t {1}?',
    ] },
    { pattern: /^\s*(?:what|how|who|where|when)\b.*/i, responses: [
      'Why do you ask?',
      'What is it you really want to know?',
      'What answer would please you most?',
    ] },
    { pattern: /\bbecause (.*)/i, responses: [
      'Is that the real reason?',
      'What other reasons come to mind?',
    ] },
    { pattern: /.*\b(?:mother|father|sister|brother|family|parents)\b.*/i, responses: [
      'Tell me more about your family.',
      'How do you get along with your family?',
      'Who else in your family is involved?',
    ] },
    { pattern: /.*\bsorry\b.*/i, responses: [
      'Please don’t apologize.',
      'Apologies are not necessary.',
      'What feelings do you have when you apologize?',
    ] },
    { pattern: /.*\bcomputer(s)?\b.*/i, responses: [
      'Do computers worry you?',
      'Are you talking about me in particular?',
      'Does it seem strange to talk to a computer?',
    ] },
    { pattern: /.*\bdream(s|t)?\b.*/i, responses: [
      'What does that dream suggest to you?',
      'Do you dream often?',
    ] },
    { pattern: /^\s*(?:hi|hello|hey)\b.*/i, responses: [
      'How do you do. Please state your problem.',
      'Hello. What’s on your mind?',
    ] },
    { pattern: /^\s*yes\b/i, responses: [
      'You seem quite positive.',
      'You are sure?',
      'I see.',
    ] },
    { pattern: /^\s*no\b/i, responses: [
      'Why not?',
      'Are you saying no just to be negative?',
      'You are being a bit negative.',
    ] },
  ];

  // Generic prompts used when no rule's pattern matches. Cycled, not random,
  // so "I have no keyword to hook onto" is still fully deterministic.
  var FALLBACKS = [
    'Please go on.',
    'What does that suggest to you?',
    'I see. Tell me more.',
    'Does talking about this bother you?',
    'How does that make you feel?',
  ];

  // A fresh, independent conversation. Every rule and the fallback list gets
  // its own cycling counter, so two rules firing at different points in a
  // conversation don't perturb each other's response order.
  function createState() {
    return { ruleCounters: RULES.map(function () { return 0; }), fallbackCounter: 0 };
  }

  // Produce ELIZA's reply to one line of input, advancing `state` in place.
  // Returns { reply, ruleIndex } where ruleIndex is the index into RULES, or
  // -1 if no rule matched and a fallback prompt was used.
  function respond(state, input) {
    var text = String(input || '').trim();
    for (var i = 0; i < RULES.length; i++) {
      var rule = RULES[i];
      var m = text.match(rule.pattern);
      if (!m) continue;
      var n = state.ruleCounters[i] % rule.responses.length;
      state.ruleCounters[i]++;
      var template = rule.responses[n];
      var capture = m[1] ? reflect(m[1].replace(/[?.!]+$/, '').trim()) : '';
      var reply = template.replace('{1}', capture);
      return { reply: reply, ruleIndex: i };
    }
    var f = state.fallbackCounter % FALLBACKS.length;
    state.fallbackCounter++;
    return { reply: FALLBACKS[f], ruleIndex: -1 };
  }

  return {
    REFLECTIONS: REFLECTIONS,
    RULES: RULES,
    FALLBACKS: FALLBACKS,
    reflect: reflect,
    createState: createState,
    respond: respond,
  };
});
