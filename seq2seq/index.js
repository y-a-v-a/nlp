#!/usr/bin/env node
const S = require('./core');
const input = process.argv[2] || 'the cat sat on the warm red mat';
const capacity = parseInt(process.argv[3], 10) || 5;
const r = S.run(input, capacity);
console.log('seq2seq — the fixed-vector bottleneck');
console.log('─'.repeat(52));
console.log(`Source (${r.source.length} tokens):  ${r.source.join(' ')}`);
console.log(`Context (${r.capacity} slots): ${JSON.stringify(r.context)}`);
console.log(`Target:                 ${r.target.join(' ')}`);
console.log(`Decoded:                ${r.output.join(' ')}`);
console.log(`Accuracy:               ${(r.accuracy * 100).toFixed(1)}%`);
