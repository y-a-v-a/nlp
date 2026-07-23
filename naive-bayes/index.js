#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');
const nb = require('./core');
const metrics = require('../lib/metrics');

// Multinomial Naive Bayes text classifier.
//
// Given two corpora (two CLASSES), we learn P(word | class) from labeled
// training documents, then classify held-out documents by Bayes' theorem:
//
//   P(class | doc)  ∝  P(class) · ∏ P(word | doc) ^ count(word)
//
// "Naive" because we assume each word is independent of the others given the
// class. We use Laplace (add-1) smoothing and work in log-space throughout.
//
// The pure algorithm (document splitting, training, classification, indicative
// words) lives in ./core.js so the CLI and the in-browser demo stay in sync.
// This file keeps only the corpus loading, the deterministic train/test split,
// and the console presentation.

if (process.argv.length < 4) {
  console.error(
    'Usage: node index.js <corpusA> <corpusB>\n' +
      '  e.g. node index.js corpora/sonnets-shakespeare.txt corpora/sonnets-browning.txt',
  );
  process.exit(1);
}

const pathA = process.argv[2];
const pathB = process.argv[3];

try {
  // ---------------------------------------------------------------------------
  // Step 0: load each corpus and split it into sonnet "documents".
  // Same approach as tfidf: normalize line endings, split on blank lines, and
  // keep only blocks with >= 10 lines so the title/author header is dropped.
  // The class label of each document is simply which corpus it came from.
  // ---------------------------------------------------------------------------
  function loadDocs(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    return nb.splitDocuments(text);
  }

  // Derive a short class label from the filename (e.g. "sonnets-shakespeare").
  function labelFor(filePath) {
    const base = filePath.split('/').pop().replace(/\.[^.]+$/, '');
    const m = base.match(/-([a-z0-9]+)$/i);
    return m ? m[1][0].toUpperCase() + m[1].slice(1) : base;
  }

  const labelA = labelFor(pathA);
  const labelB = labelFor(pathB);

  const docsA = loadDocs(pathA).map((text) => ({ text, label: labelA }));
  const docsB = loadDocs(pathB).map((text) => ({ text, label: labelB }));

  if (docsA.length === 0 || docsB.length === 0) {
    console.error('Each corpus must contain at least one document.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Step 1: DETERMINISTIC train/test split.
  // No Math.random — so the README numbers stay reproducible. We hold out every
  // 5th sonnet of EACH class as the test set and train on the remaining 4/5.
  // ---------------------------------------------------------------------------
  const HOLDOUT_EVERY = 5;
  const train = [];
  const test = [];
  for (const docs of [docsA, docsB]) {
    docs.forEach((doc, i) => {
      if ((i + 1) % HOLDOUT_EVERY === 0) test.push(doc);
      else train.push(doc);
    });
  }

  console.log('Multinomial Naive Bayes — author/style classification');
  console.log('═'.repeat(58));
  console.log(`Classes: ${labelA} (${docsA.length} sonnets), ` +
    `${labelB} (${docsB.length} sonnets)`);
  console.log(
    `Deterministic split: hold out every ${HOLDOUT_EVERY}th sonnet per class.`,
  );
  console.log(`  Training set: ${train.length} sonnets   ` +
    `Test set: ${test.length} sonnets\n`);

  // ---------------------------------------------------------------------------
  // Step 2: TRAIN. Tokenize the training docs and let the core build a shared
  // vocabulary, per-class word counts, log priors, and smoothed likelihoods.
  // ---------------------------------------------------------------------------
  const trainA = train
    .filter((doc) => doc.label === labelA)
    .map((doc) => tokenize(doc.text));
  const trainB = train
    .filter((doc) => doc.label === labelB)
    .map((doc) => tokenize(doc.text));

  const model = nb.train(trainA, trainB, labelA, labelB);
  const V = model.V;
  const logPrior = model.logPrior;

  // Laplace-smoothed likelihood, via the core (same numbers as training).
  const pWordGivenClass = (word, cls) => nb.pWordGivenClass(model, word, cls);

  // ---------------------------------------------------------------------------
  // Step 3: DATA STRUCTURE sample — the most indicative words per class.
  // We rank words by the log-likelihood RATIO between the two classes:
  //   logLR(word) = log P(word|A) - log P(word|B)
  // Large positive ⇒ strongly signals class A; large negative ⇒ class B.
  // We restrict to words that actually appear a few times so single rare tokens
  // don't dominate the smoothed ratio.
  // ---------------------------------------------------------------------------
  const indicative = nb.indicativeWords(model, 10, 3);
  const topA = indicative[labelA];
  const topB = indicative[labelB];

  console.log(`DATA STRUCTURE — most indicative words (V = ${V} shared vocab)`);
  console.log('─'.repeat(58));

  function printIndicative(title, rows, cls, other) {
    console.log(`\nMost ${title}-indicative words (by log-likelihood ratio):`);
    console.log(
      `  word            P(w|${cls.padEnd(9)}) P(w|${other.padEnd(9)}) logLR`,
    );
    for (const r of rows) {
      const pCls = pWordGivenClass(r.word, cls);
      const pOther = pWordGivenClass(r.word, other);
      console.log(
        `  ${r.word.padEnd(14)}  ${pCls.toExponential(3)}    ` +
          `${pOther.toExponential(3)}   ${r.logLR.toFixed(2)}`,
      );
    }
  }

  printIndicative(labelA, topA, labelA, labelB);
  printIndicative(labelB, topB, labelB, labelA);

  // ---------------------------------------------------------------------------
  // Step 4: CLASSIFY the held-out set. The core scores every class:
  //   logScore(class) = log P(class) + Σ_word count(word,doc) · log P(word|class)
  // and predicts the argmax. Words not in the vocabulary are skipped.
  // ---------------------------------------------------------------------------
  console.log('\n\nREADABLE RESULT — classifying the held-out sonnets');
  console.log('─'.repeat(58));

  let correct = 0;
  const truth = [];
  const predictedLabels = [];
  test.forEach((doc, i) => {
    const tokens = tokenize(doc.text);
    const predicted = nb.classify(model, tokens).label;
    const ok = predicted === doc.label;
    if (ok) correct++;
    truth.push(doc.label);
    predictedLabels.push(predicted);
    const firstLine = doc.text.split('\n')[0].trim().slice(0, 38);
    console.log(
      `  [${ok ? '✓' : '✗'}] true=${doc.label.padEnd(10)} ` +
        `pred=${predicted.padEnd(10)} "${firstLine}…"`,
    );
  });

  const accuracy = correct / test.length;
  console.log('─'.repeat(58));
  console.log(
    `Accuracy on held-out set: ${correct}/${test.length} = ` +
      `${(accuracy * 100).toFixed(1)}%`,
  );
  console.log('\nCONFUSION MATRIX & PER-CLASS METRICS');
  console.log(metrics.format(metrics.evaluate(truth, predictedLabels, [labelA, labelB])));

  // ---------------------------------------------------------------------------
  // Step 5: WALK THROUGH ONE decision. For a single test sonnet, show the
  // running log-probability for both classes and the words that pushed it
  // hardest toward the predicted class (largest per-word logLR contribution,
  // weighted by how often the word appears in the document).
  // ---------------------------------------------------------------------------
  const sample = test[0];
  const sampleTokens = tokenize(sample.text);
  const result = nb.classify(model, sampleTokens);
  const sA = result.scores[labelA];
  const sB = result.scores[labelB];
  const winner = result.label;

  console.log('\n\nWALKTHROUGH — one decision, word by word');
  console.log('─'.repeat(58));
  console.log(`Test sonnet (true class ${sample.label}):`);
  console.log(`  "${sample.text.split('\n')[0].trim()}"`);
  console.log(
    `\n  log P(${labelA}) prior  = ${logPrior[labelA].toFixed(3)}` +
      `      log P(${labelB}) prior  = ${logPrior[labelB].toFixed(3)}`,
  );
  console.log(
    `  Final  log score ${labelA} = ${sA.toFixed(2)}` +
      `   log score ${labelB} = ${sB.toFixed(2)}`,
  );
  console.log(
    `  ⇒ predicted: ${winner}  ` +
      `(log-odds margin ${result.margin.toFixed(2)} toward ${winner})`,
  );

  // Per-word push toward the winner, from the core's contributions.
  const pushers = result.contributions.slice(0, 8);

  console.log(`\n  Words that pushed hardest toward ${winner}:`);
  console.log('    word           count   push (log-odds toward ' + winner + ')');
  for (const p of pushers) {
    console.log(
      `    ${p.word.padEnd(14)}  ${String(p.n).padStart(3)}     ` +
        `${p.push >= 0 ? '+' : ''}${p.push.toFixed(3)}`,
    );
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
