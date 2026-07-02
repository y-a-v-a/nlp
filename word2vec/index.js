#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');
const { createModel } = require('./core');

if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [epochs] [query-word]');
  process.exit(1);
}

const filePath = process.argv[2];
const epochs = parseInt(process.argv[3]) || 80;
const query = process.argv[4] || 'heart';

try {
  const text = fs.readFileSync(filePath, 'utf8');
  const words = tokenize(text);
  if (words.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  const model = createModel(words, { V: 200, dim: 16, window: 5, negatives: 5, lr: 0.05, seed: 1 });
  console.log(
    `Corpus: ${words.length} tokens. Vocabulary: ${model.vocabSize} words. ` +
      `${model.dim}-dim embeddings, ${model.trainingPairs} training pairs, ` +
      `${model.paramCount} learned parameters (two ${model.V}x${model.dim} tables).\n`,
  );

  console.log(`Training ${epochs} epochs of skip-gram with negative sampling...`);
  const losses = [];
  for (let e = 0; e < epochs; e++) losses.push(model.trainEpoch());
  const checkpoints = [0, Math.floor(epochs / 4), Math.floor(epochs / 2), epochs - 1];
  for (const c of checkpoints) {
    console.log(`  epoch ${String(c + 1).padStart(3)}/${epochs}   loss ${losses[c].toFixed(4)}`);
  }
  console.log();

  console.log('DATA STRUCTURE — a learned embedding row (first 6 of 16 dims)');
  console.log('─'.repeat(56));
  const row = model.embeddingRow(query);
  if (row) {
    console.log(`  "${query}" -> [ ${row.slice(0, 6).map((x) => x.toFixed(3)).join(', ')}, ... ]\n`);
  }

  console.log(`READABLE RESULT — nearest neighbours of "${query}" (learned, cosine)`);
  console.log('─'.repeat(56));
  const neighbours = model.nearest(query, 8);
  if (!neighbours) {
    console.error(`"${query}" is not in the top ${model.V} words.`);
    process.exit(1);
  }
  const maxScore = neighbours[0].score;
  for (const n of neighbours) {
    const bar = '▇'.repeat(Math.max(1, Math.round((n.score / maxScore) * 24)));
    console.log(`  ${n.word.padEnd(12)} ${n.score.toFixed(3)}  ${bar}`);
  }

  console.log('\nAnalogy: "he is to his as she is to ___?" (vec(his) - vec(he) + vec(she))');
  const analogy = model.analogy('he', 'his', 'she', 5);
  if (analogy) {
    for (const a of analogy) console.log(`  ${a.word.padEnd(12)} ${a.score.toFixed(3)}`);
  } else {
    console.log('  One of "he", "his", "she" is outside the vocabulary.');
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
