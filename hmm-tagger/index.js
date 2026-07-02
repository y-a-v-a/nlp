#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');
const { TAGS, baselineTag, train, viterbi } = require('./core');

if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [sentence]');
  process.exit(1);
}

const filePath = process.argv[2];
const sentence = process.argv[3] || 'they rose';

try {
  const text = fs.readFileSync(filePath, 'utf8');
  const words = tokenize(text);
  if (words.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  const model = train(words);
  console.log(
    `Corpus: ${model.trainingTokens} tokens, ${model.vocabSize} vocabulary words. ` +
      `Tags: ${TAGS.join(', ')}.\n`,
  );

  console.log('DATA STRUCTURE — sample of the trained tables');
  console.log('─'.repeat(64));
  console.log('Transition counts out of "Pronoun" (what tag tends to follow a pronoun):');
  const pronounRow = model.transitionCounts['Pronoun'];
  Object.entries(pronounRow).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([tag, c]) => {
    console.log(`  Pronoun -> ${tag.padEnd(11)} ${c}`);
  });
  console.log('\nEmission counts for "rose" (which tags it was seen under):');
  TAGS.forEach((tag) => {
    const c = (model.emissionCounts[tag] && model.emissionCounts[tag].rose) || 0;
    if (c > 0) console.log(`  P(rose | ${tag.padEnd(11)}) built from ${c} counts`);
  });
  console.log(
    '  (The Verb counts above are hand-authored seeds — see AMBIGUITY_SEEDS in core.js. ' +
      'Every occurrence of "rose" in the sonnets themselves is the flower.)\n',
  );

  console.log('READABLE RESULT — Viterbi decoding vs. the context-free baseline');
  console.log('─'.repeat(64));
  const tokens = tokenize(sentence);
  const baseline = tokens.map(baselineTag);
  const result = viterbi(model, tokens);

  console.log(`Sentence: "${sentence}"\n`);
  console.log('  word        baseline (pos-markov)   HMM + Viterbi');
  for (let i = 0; i < tokens.length; i++) {
    const flag = baseline[i] !== result.tags[i] ? '  <- differ' : '';
    console.log(
      `  ${tokens[i].padEnd(11)} ${baseline[i].padEnd(23)} ${result.tags[i]}${flag}`,
    );
  }

  console.log('\nTrellis (log-probability of the best path reaching each cell):');
  console.log('  ' + 'tag'.padEnd(11) + tokens.map((w) => w.padStart(10)).join(''));
  TAGS.forEach((tag) => {
    const row = result.trellis.map((col) => col[tag].logProb.toFixed(2).padStart(10));
    console.log('  ' + tag.padEnd(11) + row.join(''));
  });
  console.log(
    `\nWinning path score: ${result.score.toFixed(3)} (log-probability; ` +
      'the tag sequence with the highest log-probability, summed over the whole sentence).',
  );
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
