#!/usr/bin/env node

const fs = require('fs');

// Validate arguments
if (process.argv.length < 3) {
  console.error(
    'Usage: node index.js <path-to-text-file> [ngram-size] [output-length]',
  );
  process.exit(1);
}

// Get arguments
const filePath = process.argv[2];
const contextSize = parseInt(process.argv[3]) || 2; // Default context size is 2 (for trigrams)
const userOutputLength = parseInt(process.argv[4]) || 50; // Default output length

// Read and process the file
try {
  const text = fs.readFileSync(filePath, 'utf8');

  // Clean and split text into words
  const words = text
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  // Build n-gram Markov chain with probabilities
  const markovChain = {};
  
  // Note: In n-gram models, we use n-1 words as context to predict the nth word
  // So with contextSize=2, we have a trigram model (2 words -> 1 word)
  for (let i = 0; i <= words.length - (contextSize + 1); i++) {
    // Create the context key (a sequence of 'contextSize' words)
    const contextKey = words.slice(i, i + contextSize).join(' ');
    // The word that follows this context
    const nextWord = words[i + contextSize];

    if (!markovChain[contextKey]) {
      markovChain[contextKey] = {};
    }

    if (!markovChain[contextKey][nextWord]) {
      markovChain[contextKey][nextWord] = 1;
    } else {
      markovChain[contextKey][nextWord]++;
    }
  }

  // Calculate probabilities for each following word
  for (const ngram in markovChain) {
    const followers = markovChain[ngram];
    const totalOccurrences = Object.values(followers).reduce(
      (sum, count) => sum + count,
      0,
    );

    // Convert counts to probabilities
    for (const follower in followers) {
      markovChain[ngram][follower] = {
        word: follower,
        probability: followers[follower] / totalOccurrences,
      };
    }
  }

  console.log(markovChain);

  // Display a sample of the n-gram Markov chain with probabilities
  console.log(`Sample of ${contextSize+1}-gram Markov chain with probabilities:`);
  let count = 0;
  for (const ngram in markovChain) {
    if (count >= 5) break;
    console.log(`"${ngram}" can be followed by:`);
    for (const follower in markovChain[ngram]) {
      const { word: nextWord, probability } = markovChain[ngram][follower];
      console.log(`  - "${nextWord}" (probability: ${probability.toFixed(4)})`);
    }
    console.log();
    count++;
  }

  // Generate output
  // Start with a random context
  const contextKeys = Object.keys(markovChain);
  let currentContext = contextKeys[Math.floor(Math.random() * contextKeys.length)];
  let output = currentContext.split(' ');

  for (let i = 0; i < userOutputLength - output.length; i++) {
    // If the current context has no followers or isn't in our chain,
    // pick a random new context
    if (
      !markovChain[currentContext] ||
      Object.keys(markovChain[currentContext]).length === 0
    ) {
      currentContext = contextKeys[Math.floor(Math.random() * contextKeys.length)];
      const newWords = currentContext.split(' ');
      output.push(...newWords);
    } else {
      // Choose next word based on probabilities
      const followers = markovChain[currentContext];
      const rand = Math.random();
      let cumulativeProbability = 0;

      for (const follower in followers) {
        cumulativeProbability += followers[follower].probability;
        if (rand < cumulativeProbability) {
          const nextWord = followers[follower].word;
          output.push(nextWord);

          // Update the current context by removing the first word and adding the new word
          const contextWords = currentContext.split(' ');
          contextWords.shift();
          contextWords.push(nextWord);
          currentContext = contextWords.join(' ');
          break;
        }
      }
    }

    // Safety check in case we've reached our desired length
    if (output.length >= userOutputLength) {
      break;
    }
  }

  // Print the generated text
  console.log(
    `Generated text using ${contextSize+1}-gram probability-based Markov chain:`,
  );
  console.log(output.join(' '));
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
