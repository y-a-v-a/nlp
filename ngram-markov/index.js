#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');

// Validate arguments
if (process.argv.length < 3) {
  console.error(
    'Usage: node index.js <path-to-text-file> [ngram-size] [output-length]',
  );
  process.exit(1);
}

// Get arguments
const filePath = process.argv[2];
const ngramSize = parseInt(process.argv[3]) || 2; // Default n-gram size is 2 (bigram)
const userOutputLength = parseInt(process.argv[4]) || 50; // Default output length

// Read and process the file
try {
  const text = fs.readFileSync(filePath, 'utf8');

  // Clean and split text into words using the shared tokenizer
  const words = tokenize(text);

  if (words.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  // Build n-gram Markov chain
  const markovChain = {};

  for (let i = 0; i <= words.length - ngramSize; i++) {
    // Create the n-gram key (a sequence of n-1 words)
    const ngramKey = words.slice(i, i + ngramSize - 1).join(' ');
    // The word that follows this n-gram
    const nextWord = words[i + ngramSize - 1];

    if (!markovChain[ngramKey]) {
      markovChain[ngramKey] = [];
    }

    markovChain[ngramKey].push(nextWord);
  }

  // Show a sample of the chain: the first 10 prefixes and what can follow them
  console.log(
    `Sample of the ${ngramSize}-gram chain (prefix -> possible next words):`,
  );
  let shown = 0;
  for (const key in markovChain) {
    if (shown >= 10) break;
    console.log(`  "${key}" -> ${markovChain[key].slice(0, 8).join(', ')}`);
    shown++;
  }
  console.log();

  // Generate output
  // Start with a random n-gram prefix
  const ngramKeys = Object.keys(markovChain);
  let currentNgram = ngramKeys[Math.floor(Math.random() * ngramKeys.length)];
  let output = currentNgram.split(' ');

  for (let i = 0; i < userOutputLength - output.length; i++) {
    // If the current n-gram has no followers, pick a random new n-gram
    if (!markovChain[currentNgram] || markovChain[currentNgram].length === 0) {
      currentNgram = ngramKeys[Math.floor(Math.random() * ngramKeys.length)];
      const newWords = currentNgram.split(' ');
      output.push(...newWords);
    } else {
      // Otherwise choose one of the followers
      const possibleNextWords = markovChain[currentNgram];
      const nextWord =
        possibleNextWords[Math.floor(Math.random() * possibleNextWords.length)];
      output.push(nextWord);

      // Update the current n-gram by removing the first word and adding the new word
      const ngramWords = currentNgram.split(' ');
      ngramWords.shift();
      ngramWords.push(nextWord);
      currentNgram = ngramWords.join(' ');
    }

    // Safety check in case we've reached our desired length
    if (output.length >= userOutputLength) {
      break;
    }
  }

  // Print the generated text
  console.log('Generated text using n-gram Markov chain:');
  console.log(output.join(' '));
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
