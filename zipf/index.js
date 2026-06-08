#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');

// Validate arguments
if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [top-n]');
  process.exit(1);
}

const filePath = process.argv[2];
const topN = parseInt(process.argv[3]) || 20;

try {
  const text = fs.readFileSync(filePath, 'utf8');

  // Use the shared tokenizer so the frequency counts match every other demo
  const words = tokenize(text);

  if (words.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  // Step 1: count how often each word occurs
  const counts = {};
  for (const word of words) {
    counts[word] = (counts[word] || 0) + 1;
  }

  // Step 2: rank the words from most to least frequent.
  // Rank 1 is the single most common word, rank 2 the next, and so on.
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const totalTokens = words.length;
  const vocabSize = ranked.length;
  const topFrequency = ranked[0][1]; // frequency of the rank-1 word

  console.log(
    `Corpus: ${totalTokens} tokens, ${vocabSize} unique words.\n`,
  );

  // Step 3: the heart of Zipf's law.
  // If frequency is proportional to 1 / rank, then rank × frequency should be
  // roughly the same number for every word. And Zipf's law also predicts each
  // word's frequency directly: predicted = (frequency of rank-1 word) / rank.
  console.log(
    'rank  word           freq   rank×freq   Zipf-predicted',
  );
  console.log('─'.repeat(56));
  for (let i = 0; i < Math.min(topN, vocabSize); i++) {
    const [word, freq] = ranked[i];
    const rank = i + 1;
    const product = rank * freq;
    const predicted = Math.round(topFrequency / rank);
    console.log(
      `${String(rank).padStart(4)}  ` +
        `${word.padEnd(12)}  ` +
        `${String(freq).padStart(4)}  ` +
        `${String(product).padStart(9)}   ` +
        `${String(predicted).padStart(9)}`,
    );
  }

  // Step 4: show that rank × frequency really does cluster around a constant.
  // We measure it over the head of the distribution (ranks 1..50), where the
  // law is cleanest, and report the average and the spread around it.
  const sampleSize = Math.min(50, vocabSize);
  const products = [];
  for (let i = 0; i < sampleSize; i++) {
    products.push((i + 1) * ranked[i][1]);
  }
  const mean = products.reduce((a, b) => a + b, 0) / products.length;
  const min = Math.min(...products);
  const max = Math.max(...products);
  console.log('─'.repeat(56));
  console.log(
    `\nrank × frequency over the top ${sampleSize} words:\n` +
      `  average ≈ ${mean.toFixed(0)}   (ranges from ${min} to ${max})\n` +
      `Despite frequencies spanning ${topFrequency} down to ${ranked[sampleSize - 1][1]}, ` +
      `the product stays in the same ballpark — that is Zipf's law.`,
  );

  // Step 5: a quick textual bar chart of the top 10 frequencies, so the steep
  // "a few words dominate everything" shape is visible at a glance.
  console.log('\nFrequency of the top 10 words (each ▇ ≈ ' +
    `${Math.ceil(topFrequency / 40)} occurrences):`);
  const unit = topFrequency / 40;
  for (let i = 0; i < Math.min(10, vocabSize); i++) {
    const [word, freq] = ranked[i];
    const bar = '▇'.repeat(Math.max(1, Math.round(freq / unit)));
    console.log(`  ${word.padEnd(8)} ${bar} ${freq}`);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
