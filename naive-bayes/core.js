/**
 * Multinomial Naive Bayes core — the shared algorithm behind both the CLI
 * (index.js) and the in-browser "Try it" demo. UMD: require() in Node,
 * window.NLP.naiveBayes in the browser. One implementation, so the live
 * classifier and the command line learn and decide identically.
 *
 * The model learns P(word | class) from labeled, already-tokenized training
 * documents, then classifies new documents by Bayes' theorem:
 *
 *   P(class | doc)  ∝  P(class) · ∏ P(word | class) ^ count(word)
 *
 * "Naive" because each word is assumed independent given the class. Laplace
 * (add-1) smoothing is used and everything is done in log-space.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.naiveBayes = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Split a corpus into documents: blocks separated by blank lines, keeping
  // only blocks of at least 20 words (keeps every sonnet, drops title headers,
  // and accepts ordinary paragraphs from pasted text). Same approach as the
  // tfidf core.
  function splitDocuments(text) {
    return text
      .replace(/\r\n/g, '\n')
      .split(/\n\n+/)
      .map(function (block) { return block.trim(); })
      .filter(function (block) { return block.split(/\s+/).length >= 20; });
  }

  // Train the classifier from two sets of already-tokenized documents — each
  // an array of token arrays. Returns a model carrying everything classify()
  // and indicativeWords() need:
  //
  //   {
  //     labels:   [labelA, labelB],
  //     logPrior: { labelA, labelB },               // log P(class)
  //     wordCounts: { labelA:{w:n}, labelB:{w:n} },  // count(word, class)
  //     totalWords: { labelA, labelB },              // tokens per class
  //     docCount:   { labelA, labelB },              // #docs per class
  //     vocab:    [w, ...],                          // shared vocabulary
  //     V:        vocab size,
  //     logLikelihood: { labelA:{w:logp}, labelB:{w:logp} } // smoothed, in-vocab
  //   }
  //
  // logLikelihood holds the Laplace-smoothed log P(word | class) for every
  // in-vocabulary word; out-of-vocabulary words are handled on demand via
  // logPWordGivenClass so classify() can skip them cheaply.
  function train(tokenizedDocsA, tokenizedDocsB, labelA, labelB) {
    var wordCounts = {};
    wordCounts[labelA] = {};
    wordCounts[labelB] = {};
    var totalWords = {};
    totalWords[labelA] = 0;
    totalWords[labelB] = 0;
    var docCount = {};
    docCount[labelA] = 0;
    docCount[labelB] = 0;
    var vocabSet = {};

    function tally(docs, label) {
      for (var d = 0; d < docs.length; d++) {
        var tokens = docs[d];
        docCount[label]++;
        for (var i = 0; i < tokens.length; i++) {
          var w = tokens[i];
          wordCounts[label][w] = (wordCounts[label][w] || 0) + 1;
          totalWords[label]++;
          vocabSet[w] = true;
        }
      }
    }

    tally(tokenizedDocsA, labelA);
    tally(tokenizedDocsB, labelB);

    var vocab = Object.keys(vocabSet);
    var V = vocab.length;
    var totalDocs = docCount[labelA] + docCount[labelB];

    var logPrior = {};
    logPrior[labelA] = Math.log(docCount[labelA] / totalDocs);
    logPrior[labelB] = Math.log(docCount[labelB] / totalDocs);

    var model = {
      labels: [labelA, labelB],
      logPrior: logPrior,
      wordCounts: wordCounts,
      totalWords: totalWords,
      docCount: docCount,
      vocab: vocab,
      V: V,
    };

    // Precompute smoothed log-likelihoods for every in-vocabulary word.
    var logLikelihood = {};
    logLikelihood[labelA] = {};
    logLikelihood[labelB] = {};
    for (var v = 0; v < vocab.length; v++) {
      var word = vocab[v];
      logLikelihood[labelA][word] = logPWordGivenClass(model, word, labelA);
      logLikelihood[labelB][word] = logPWordGivenClass(model, word, labelB);
    }
    model.logLikelihood = logLikelihood;

    return model;
  }

  // Laplace-smoothed likelihood:
  //   P(word | class) = (count(word,class) + 1) / (totalWords(class) + V)
  function pWordGivenClass(model, word, cls) {
    var c = model.wordCounts[cls][word] || 0;
    return (c + 1) / (model.totalWords[cls] + model.V);
  }

  function logPWordGivenClass(model, word, cls) {
    return Math.log(pWordGivenClass(model, word, cls));
  }

  // Score a tokenized document under one class:
  //   logScore(class) = log P(class) + Σ_word log P(word|class)
  // Words not in the vocabulary carry no signal and are skipped.
  function scoreDoc(model, tokens, cls) {
    var logScore = model.logPrior[cls];
    var ll = model.logLikelihood[cls];
    for (var i = 0; i < tokens.length; i++) {
      var w = tokens[i];
      if (ll[w] === undefined) continue; // unseen word
      logScore += ll[w];
    }
    return logScore;
  }

  // Classify a tokenized document. Returns:
  //   {
  //     label:  predicted class (argmax, ties go to labelA),
  //     scores: { labelA: logScore, labelB: logScore },
  //     margin: |scoreA - scoreB|  (log-odds toward the winner),
  //     contributions: [{ word, n, push }, ...]  sorted by push desc
  //   }
  // contributions lists in-vocabulary words by how hard they pushed toward the
  // winning class: push = count(word,doc) · (logP(w|winner) - logP(w|loser)).
  function classify(model, tokens) {
    var labelA = model.labels[0];
    var labelB = model.labels[1];
    var sA = scoreDoc(model, tokens, labelA);
    var sB = scoreDoc(model, tokens, labelB);
    var label = sA >= sB ? labelA : labelB;
    var loser = label === labelA ? labelB : labelA;

    var scores = {};
    scores[labelA] = sA;
    scores[labelB] = sB;

    // Per-word push toward the winner, weighted by in-document count.
    var docTokenCounts = {};
    for (var i = 0; i < tokens.length; i++) {
      var w = tokens[i];
      if (model.logLikelihood[label][w] !== undefined) {
        docTokenCounts[w] = (docTokenCounts[w] || 0) + 1;
      }
    }
    var contributions = [];
    for (var word in docTokenCounts) {
      var n = docTokenCounts[word];
      var push =
        n * (model.logLikelihood[label][word] - model.logLikelihood[loser][word]);
      contributions.push({ word: word, n: n, push: push });
    }
    contributions.sort(function (a, b) { return b.push - a.push; });

    return {
      label: label,
      scores: scores,
      margin: Math.abs(sA - sB),
      contributions: contributions,
    };
  }

  // Top-k most indicative words per class, ranked by the log-likelihood RATIO
  // between the two classes:
  //   logLR(word) = log P(word|A) - log P(word|B)
  // Large positive ⇒ strongly signals class A; large negative ⇒ class B.
  // Words must occur >= minCount times in the class they're indicative of, so
  // single rare tokens don't dominate the smoothed ratio.
  // Returns { labelA: [{word, cA, cB, logLR}], labelB: [...] }.
  function indicativeWords(model, k, minCount) {
    if (k === undefined) k = 10;
    if (minCount === undefined) minCount = 3;
    var labelA = model.labels[0];
    var labelB = model.labels[1];

    var ratios = [];
    for (var i = 0; i < model.vocab.length; i++) {
      var word = model.vocab[i];
      var cA = model.wordCounts[labelA][word] || 0;
      var cB = model.wordCounts[labelB][word] || 0;
      var logLR =
        model.logLikelihood[labelA][word] - model.logLikelihood[labelB][word];
      ratios.push({ word: word, cA: cA, cB: cB, logLR: logLR });
    }

    var topA = ratios
      .filter(function (r) { return r.cA >= minCount; })
      .sort(function (a, b) { return b.logLR - a.logLR; })
      .slice(0, k);
    var topB = ratios
      .filter(function (r) { return r.cB >= minCount; })
      .sort(function (a, b) { return a.logLR - b.logLR; })
      .slice(0, k);

    var out = {};
    out[labelA] = topA;
    out[labelB] = topB;
    return out;
  }

  return {
    splitDocuments: splitDocuments,
    train: train,
    classify: classify,
    indicativeWords: indicativeWords,
    pWordGivenClass: pWordGivenClass,
    logPWordGivenClass: logPWordGivenClass,
    scoreDoc: scoreDoc,
  };
});
