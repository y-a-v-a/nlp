#!/usr/bin/env node
const { tokenize } = require('../lib/tokenize');
const C = require('./core');
const sentence = process.argv[2] || 'they rose';
const words = tokenize(sentence);
if (!words.length) {
  console.error(`Error: "${sentence}" contains no taggable words.`);
  process.exit(1);
}
const weights = C.defaultWeights();
const r = C.decode(words, weights);
console.log('Linear-chain CRF — discriminative sequence labelling');
console.log('─'.repeat(62));
console.log(`Sentence: "${sentence}"`);
console.log(`Features: ${Object.keys(weights).length} non-zero weights`);
console.log('\nword          best tag');
words.forEach((w,i)=>console.log(`${w.padEnd(13)} ${r.tags[i]}`));
console.log(`\nBest sequence score: ${r.score.toFixed(3)}`);
console.log(`log Z(x):            ${r.logZ.toFixed(3)}`);
console.log(`P(best tags | words): ${r.probability.toFixed(3)}`);
console.log('\nData structure — final Viterbi column:');
Object.entries(r.trellis[r.trellis.length-1]).forEach(([tag,v])=>console.log(`  ${tag.padEnd(11)} score=${v.score.toFixed(2)}  prev=${v.prev}`));
