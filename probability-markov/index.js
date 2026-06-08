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

  // Build Markov chain with probabilities
  const markovChain = {};

  for (let i = 0; i < words.length - 1; i++) {
    const currentWord = words[i];
    const nextWord = words[i + 1];

    if (!markovChain[currentWord]) {
      markovChain[currentWord] = {};
    }

    if (!markovChain[currentWord][nextWord]) {
      markovChain[currentWord][nextWord] = 1;
    } else {
      markovChain[currentWord][nextWord]++;
    }
  }

  // Calculate probabilities for each following word
  for (const word in markovChain) {
    const followers = markovChain[word];
    const totalOccurrences = Object.values(followers).reduce(
      (sum, count) => sum + count,
      0
    );

    // Convert counts to probabilities
    for (const follower in followers) {
      markovChain[word][follower] = {
        word: follower,
        probability: followers[follower] / totalOccurrences,
      };
    }
  }

  // Display the Markov chain with probabilities (limited to first 10 entries)
  console.log('Sample of Markov chain with probabilities:');
  let count = 0;
  for (const word in markovChain) {
    if (count >= 10) break;
    console.log(`"${word}" can be followed by:`);
    for (const follower in markovChain[word]) {
      const { word: nextWord, probability } = markovChain[word][follower];
      console.log(`  - "${nextWord}" (probability: ${probability.toFixed(4)})`);
    }
    console.log();
    count++;
  }

  // Generate output
  const outputLength = isNaN(userOutputLength) ? 30 : userOutputLength; // Default to 30 if not specified
  let currentWord = words[Math.floor(Math.random() * words.length)];
  let output = [currentWord];

  for (let i = 0; i < outputLength - 1; i++) {
    // If the current word has no followers or isn't in our chain,
    // pick a random new word
    if (!markovChain[currentWord] || Object.keys(markovChain[currentWord]).length === 0) {
      currentWord = words[Math.floor(Math.random() * words.length)];
    } else {
      // Choose next word based on probabilities
      const followers = markovChain[currentWord];
      const rand = Math.random();
      let cumulativeProbability = 0;
      
      for (const follower in followers) {
        cumulativeProbability += followers[follower].probability;
        if (rand < cumulativeProbability) {
          currentWord = followers[follower].word;
          break;
        }
      }
    }

    output.push(currentWord);
  }

  // Print the generated text
  console.log('Generated text using probability-based Markov chain:');
  console.log(output.join(' '));
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}