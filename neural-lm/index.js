#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');
const { createModel, mulberry32 } = require('./core');

// Validate arguments
if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [epochs] [output-length]');
  process.exit(1);
}

const filePath = process.argv[2];
const epochs = parseInt(process.argv[3]) || 15;
const outputLength = parseInt(process.argv[4]) || 40;

// Seeded PRNG so the run is reproducible. The model (vocabulary, network, and
// training) lives in the shared core — the exact same code the in-browser demo
// trains — so the CLI and the demo can never disagree.
const rand = mulberry32(42);

try {
  const text = fs.readFileSync(filePath, 'utf8');
  const words = tokenize(text);

  if (words.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  const model = createModel(words, { rng: rand });

  console.log('Neural language model (feedforward, Bengio 2003)');
  console.log('─'.repeat(56));
  console.log(`Vocabulary:        ${model.V} words (most frequent)`);
  console.log(`Training trigrams: ${model.trainingExamples}`);
  console.log(
    `Architecture:      2×${model.m}-dim embeddings → tanh(${model.H}) → softmax(${model.V})`,
  );
  console.log(`Trainable values:  ${model.paramCount}\n`);

  // Train, one epoch at a time (the steppable core the browser also drives).
  for (let epoch = 0; epoch < epochs; epoch++) {
    const avg = model.trainEpoch();
    const ppl = Math.exp(avg);
    console.log(
      `epoch ${String(epoch + 1).padStart(2)}/${epochs}  ` +
        `avg loss ${avg.toFixed(4)}   perplexity ${ppl.toFixed(1)}`,
    );
  }

  // Data structure: a slice of the LEARNED embedding matrix.
  console.log('\nLearned embedding (first 6 of 24 dims) for a few words:');
  for (const w of ['love', 'my', 'thou', 'beauty']) {
    const row = model.embeddingRow(w, 6);
    if (!row) continue;
    const cells = row.map((v) => v.toFixed(2).padStart(6));
    console.log(`  ${w.padEnd(8)} [${cells.join(' ')} … ]`);
  }

  // Nearest neighbours in embedding space (cosine).
  console.log('\nNearest neighbours in the learned embedding space (cosine):');
  for (const w of ['love', 'thou', 'my']) {
    const nn = model.nearest(w, 5);
    if (nn && nn.length) {
      console.log(
        `  ${w.padEnd(8)} → ${nn.map((o) => `${o.word} ${o.score.toFixed(2)}`).join(',  ')}`,
      );
    }
  }

  // Readable result: generate text by sampling from the trained model.
  console.log('\nGenerated text (sampled from the trained model):');
  console.log(model.generate(outputLength).join(' '));
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
