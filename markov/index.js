#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');

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

  // Split text into words using the shared tokenizer
  const words = tokenize(text);

  if (words.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  // Build Markov chain
  const markovChain = {};

  for (let i = 0; i < words.length - 1; i++) {
    const currentWord = words[i];
    const nextWord = words[i + 1];

    if (!markovChain[currentWord]) {
      markovChain[currentWord] = [];
    }

    markovChain[currentWord].push(nextWord);
  }

  // Show a sample of the chain: the first 10 words and where they can lead
  console.log('Sample of the Markov chain (word -> possible next words):');
  let shown = 0;
  for (const word in markovChain) {
    if (shown >= 10) break;
    console.log(`  "${word}" -> ${markovChain[word].slice(0, 8).join(', ')}`);
    shown++;
  }
  console.log();

  // Generate output
  const outputLength = isNaN(userOutputLength) ? 30 : userOutputLength; // Default to 30 if not specified
  let currentWord = words[Math.floor(Math.random() * words.length)];
  let output = [currentWord];

  for (let i = 0; i < outputLength - 1; i++) {
    // If the current word has no followers or isn't in our chain,
    // pick a random new word
    if (!markovChain[currentWord] || markovChain[currentWord].length === 0) {
      currentWord = words[Math.floor(Math.random() * words.length)];
    } else {
      // Otherwise choose one of the followers
      const possibleNextWords = markovChain[currentWord];
      currentWord =
        possibleNextWords[Math.floor(Math.random() * possibleNextWords.length)];
    }

    output.push(currentWord);
  }

  // Print the generated text
  console.log('Generated DADA poem:');
  console.log(output.join(' '));
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
