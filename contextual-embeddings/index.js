#!/usr/bin/env node
const fs = require('fs');
const { tokenize } = require('../lib/tokenize');
const C = require('./core');
if (!process.argv[2]) {
  console.error('Usage: node contextual-embeddings/index.js <corpus> [target] [sentence-a] [sentence-b]');
  process.exit(1);
}
const words = tokenize(fs.readFileSync(process.argv[2], 'utf8'));
const target = process.argv[3] || 'fair';
const a = tokenize(process.argv[4] || 'thy fair face is bright');
const b = tokenize(process.argv[5] || 'a fair judgement and honest mind');
const model = C.build(words, { topN: 300, window: 3 });
const result = C.compare(model, a, b, target, 2);
if (!result) throw new Error(`"${target}" and its context words must occur in the top-300 corpus vocabulary`);
console.log('Contextual embeddings — one word, two representations');
console.log('─'.repeat(62));
console.log(`Static lookup: "${target}" → the same stored row in both sentences (similarity 1.000)`);
console.log(`A: ${a.join(' ')}`);
console.log(`B: ${b.join(' ')}`);
console.log(`Contextual similarity: ${result.similarity.toFixed(3)}`);
console.log(`A vector (first 8): [${Array.from(result.a.vector.slice(0, 8)).map(v => v.toFixed(3)).join(', ')}]`);
console.log(`B vector (first 8): [${Array.from(result.b.vector.slice(0, 8)).map(v => v.toFixed(3)).join(', ')}]`);
