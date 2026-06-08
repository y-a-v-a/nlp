#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');
const { createModel, mulberry32 } = require('./core');

// Validate arguments
if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [iterations] [sample-length]');
  process.exit(1);
}

const filePath = process.argv[2];
const iterations = parseInt(process.argv[3]) || 5000;
const sampleLength = parseInt(process.argv[4]) || 200;

// Seeded PRNG so the run is reproducible. The network (weights, BPTT, Adagrad,
// sampling) lives in the shared core — the same code the in-browser demo trains.
const rand = mulberry32(42);

try {
  const raw = fs.readFileSync(filePath, 'utf8');

  // Character level: reuse the word tokenizer to normalise (lowercase, strip
  // punctuation) then rejoin with spaces — a clean stream over ~27 symbols.
  const charStream = tokenize(raw).join(' ');
  if (charStream.length === 0) {
    console.error('No text found in the file.');
    process.exit(1);
  }

  const model = createModel(charStream, { rng: rand });

  console.log('Character-level recurrent neural network (RNN)');
  console.log('─'.repeat(56));
  console.log(`Characters in stream: ${model.dataLength}`);
  console.log(`Symbol vocabulary:    ${model.Vc}  (${model.chars.join('')})`);
  console.log(`Hidden units:         ${model.H}`);
  console.log(`Backprop length:      ${model.seqLen} chars\n`);

  console.log(`Sample before training (iteration 0):`);
  console.log(`  "${model.sample(model.idOf(' '), 120)}"\n`);

  const reportEvery = Math.max(1, Math.floor(iterations / 10));
  for (let n = 0; n < iterations; n++) {
    const smoothLoss = model.step();
    if (n % reportEvery === 0 || n === iterations - 1) {
      console.log(
        `iter ${String(n).padStart(5)}  smoothed loss/char ${smoothLoss.toFixed(4)}`,
      );
    }
  }

  // Data structure: the hidden state IS the memory.
  const trace = model.hiddenTrace('shall i compare', 4);
  console.log('\nHidden state (first 4 of 64 units) as it reads "shall i compare":');
  console.log("  char │  h0     h1     h2     h3");
  console.log('  ─────┼───────────────────────────');
  for (const stepRow of trace) {
    const label = stepRow.ch === ' ' ? '␣' : stepRow.ch;
    console.log(
      `   ${label}   │ ${stepRow.h.map((v) => v.toFixed(2).padStart(6)).join(' ')}`,
    );
  }

  console.log(`\nSample after ${iterations} iterations:`);
  console.log(`  "${model.sample(model.idOf(' '), sampleLength)}"`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
