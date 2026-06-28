#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');
const { tagWords, buildChain, generate, followers } = require('./core');

// Validate arguments
if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [output-length]');
  process.exit(1);
}

// Get file path and output length from arguments
const filePath = process.argv[2];
const userOutputLength = parseInt(process.argv[3]);

// Read and process the file
try {
  const text = fs.readFileSync(filePath, 'utf8');

  // Split text into words using the shared tokenizer, then attach a part of
  // speech to each (shared core — the same code the in-browser demo runs).
  const words = tokenize(text);

  if (words.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  const tagged = tagWords(words);
  const chain = buildChain(tagged);

  // Show a sample of the chain: the first 10 states and where they can lead,
  // with the part of speech on every word so the grammar pattern is visible.
  console.log('Sample of the POS-tagged Markov chain (word|POS -> possible next states):');
  let shown = 0;
  for (const key in chain) {
    if (shown >= 10) break;
    const [word, pos] = key.split('|');
    const tops = followers(chain, key)
      .slice(0, 6)
      .map((f) => `${f.word} (${f.tag})${f.count > 1 ? ' ×' + f.count : ''}`)
      .join(', ');
    console.log(`  "${word}" (${pos}) -> ${tops}`);
    shown++;
  }
  console.log();

  // Generate output
  const outputLength = isNaN(userOutputLength) ? 30 : userOutputLength; // Default to 30
  const output = generate(chain, outputLength);

  // Print the generated text, then the same sequence annotated with POS tags.
  console.log('Generated text using POS-tagged Markov chain:');
  console.log(output.map((t) => t.word).join(' '));
  console.log('\nWith POS tags:');
  console.log(output.map((t) => `${t.word} (${t.tag})`).join('  '));
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
