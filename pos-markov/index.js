#!/usr/bin/env node

const fs = require('fs');
const nlp = require('compromise');

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

  // Use compromise to parse and tag the text
  const doc = nlp(text);

  // Extract sentences to maintain better structure
  const sentences = doc.sentences().out('array');

  // Build an array of tagged words
  const taggedWords = [];

  sentences.forEach(sentence => {
    const sentenceDoc = nlp(sentence);
    const terms = sentenceDoc.terms().out('array');

    terms.forEach(term => {
      const termDoc = nlp(term);
      // Get the primary POS tag
      let tag = 'Unknown';

      if (termDoc.nouns().length > 0) tag = 'Noun';
      else if (termDoc.verbs().length > 0) tag = 'Verb';
      else if (termDoc.adjectives().length > 0) tag = 'Adjective';
      else if (termDoc.adverbs().length > 0) tag = 'Adverb';
      else if (termDoc.pronouns().length > 0) tag = 'Pronoun';
      else if (termDoc.prepositions().length > 0) tag = 'Preposition';
      else if (termDoc.conjunctions().length > 0) tag = 'Conjunction';
      else if (termDoc.match('#Determiner').length > 0) tag = 'Determiner';

      taggedWords.push({
        word: term.toLowerCase(),
        tag: tag
      });
    });
  });

  if (taggedWords.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  // Build POS-aware Markov chain
  // The chain maps from (word, POS) pairs to possible next (word, POS) pairs
  const markovChain = {};

  for (let i = 0; i < taggedWords.length - 1; i++) {
    const current = taggedWords[i];
    const next = taggedWords[i + 1];

    const currentKey = `${current.word}|${current.tag}`;
    const nextKey = `${next.word}|${next.tag}`;

    if (!markovChain[currentKey]) {
      markovChain[currentKey] = [];
    }

    markovChain[currentKey].push({
      word: next.word,
      tag: next.tag,
      key: nextKey
    });
  }

  // Display sample of the chain structure
  console.log('Sample of POS-tagged Markov chain:');
  console.log('(showing first 10 entries)\n');

  let count = 0;
  for (const key in markovChain) {
    if (count >= 10) break;
    const [word, tag] = key.split('|');
    console.log(`"${word}" (${tag}) can be followed by:`);

    // Show unique followers
    const uniqueFollowers = {};
    markovChain[key].forEach(follower => {
      const followerKey = `${follower.word}|${follower.tag}`;
      if (!uniqueFollowers[followerKey]) {
        uniqueFollowers[followerKey] = { word: follower.word, tag: follower.tag, count: 0 };
      }
      uniqueFollowers[followerKey].count++;
    });

    for (const followerKey in uniqueFollowers) {
      const { word, tag, count: occurrences } = uniqueFollowers[followerKey];
      console.log(`  - "${word}" (${tag}) - ${occurrences} time(s)`);
    }
    console.log();
    count++;
  }

  // Generate output
  const outputLength = isNaN(userOutputLength) ? 30 : userOutputLength;

  // Start with a random word
  const chainKeys = Object.keys(markovChain);
  let currentKey = chainKeys[Math.floor(Math.random() * chainKeys.length)];
  const [startWord, startTag] = currentKey.split('|');

  let output = [startWord];
  let outputTags = [startTag];

  for (let i = 0; i < outputLength - 1; i++) {
    // If the current key has no followers, pick a random new key
    if (!markovChain[currentKey] || markovChain[currentKey].length === 0) {
      currentKey = chainKeys[Math.floor(Math.random() * chainKeys.length)];
      const [word, tag] = currentKey.split('|');
      output.push(word);
      outputTags.push(tag);
    } else {
      // Choose one of the followers
      const possibleNext = markovChain[currentKey];
      const next = possibleNext[Math.floor(Math.random() * possibleNext.length)];

      output.push(next.word);
      outputTags.push(next.tag);
      currentKey = next.key;
    }
  }

  // Print the generated text with POS tags
  console.log('\nGenerated text using POS-tagged Markov chain:');
  console.log(output.join(' '));
  console.log('\nWith POS tags:');
  for (let i = 0; i < output.length; i++) {
    console.log(`${output[i]} (${outputTags[i]})`);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
