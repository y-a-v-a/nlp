#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');
const {
  charStream, zeroOrderEntropy, conditionalEntropy, perplexity, guessGame,
} = require('./core');

if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [sample-line]');
  process.exit(1);
}

const filePath = process.argv[2];
const sampleLine = process.argv[3] || 'shall i compare thee to a summers day';

try {
  const text = fs.readFileSync(filePath, 'utf8');
  const words = tokenize(text);
  if (words.length === 0) {
    console.error('No words found in the file.');
    process.exit(1);
  }

  const stream = charStream(words);
  console.log(
    `Corpus: ${words.length} tokens, ${stream.length} characters ` +
      `(27-symbol alphabet: a-z + space).\n`,
  );

  // --- Character-level entropy: zero-order vs first-order (conditional) ---
  const h0 = zeroOrderEntropy(stream);
  const h1 = conditionalEntropy(stream, 1);
  const h2 = conditionalEntropy(stream, 2);

  console.log('DATA STRUCTURE — entropy at increasing context length');
  console.log('─'.repeat(64));
  console.log(
    `  order 0 (no context)        H = ${h0.entropy.toFixed(3)} bits/char   ` +
      `2^H = ${perplexity(h0.entropy).toFixed(1)} effective choices`,
  );
  console.log(
    `  order 1 (previous char)     H = ${h1.entropy.toFixed(3)} bits/char   ` +
      `2^H = ${perplexity(h1.entropy).toFixed(1)} effective choices   ` +
      `(${h1.contexts} contexts seen)`,
  );
  console.log(
    `  order 2 (previous 2 chars)  H = ${h2.entropy.toFixed(3)} bits/char   ` +
      `2^H = ${perplexity(h2.entropy).toFixed(1)} effective choices   ` +
      `(${h2.contexts} contexts seen)`,
  );
  console.log(
    `\n  Ceiling with no model at all: log2(27) = ${Math.log2(27).toFixed(3)} bits/char ` +
      `— a uniform guess over the whole alphabet.`,
  );
  console.log(
    `  Each extra character of context buys real bits back: ` +
      `${(h0.entropy - h1.entropy).toFixed(3)} bits saved by order 1, ` +
      `${(h1.entropy - h2.entropy).toFixed(3)} more by order 2.\n`,
  );

  // --- The guessing game: how many ranked guesses to name each character? ---
  const sampleStream = charStream(tokenize(sampleLine));
  const g0 = guessGame(sampleStream, 0);
  const g1 = guessGame(sampleStream, 1);

  console.log('READABLE RESULT — Shannon\'s guessing game');
  console.log('─'.repeat(64));
  console.log(`Line: "${sampleLine}"\n`);
  console.log('Cover the line and guess each next letter, ranked by frequency.');
  console.log('The number under each character is how many guesses it took:\n');

  const chars = sampleStream.split('');
  const printRankRow = (label, ranks, offset) => {
    const shown = chars.slice(offset).map((c) => (c === ' ' ? '·' : c));
    const rankRow = ranks.map((r) => (r > 9 ? '+' : String(r)));
    console.log(`  ${label}`);
    console.log('    ' + shown.join(''));
    console.log('    ' + rankRow.join(''));
  };
  printRankRow('order 0 (no context, overall letter frequency):', g0.ranks, 0);
  console.log();
  printRankRow('order 1 (previous character):', g1.ranks, 1);
  console.log(
    `\n  Average guesses needed — order 0: ${g0.average.toFixed(2)}, ` +
      `order 1: ${g1.average.toFixed(2)}.\n` +
      `  Knowing just the one previous letter cut the average number of ` +
      `guesses by ${(((g0.average - g1.average) / g0.average) * 100).toFixed(0)}% ` +
      `on this line — a measurable version of "context reduces uncertainty."`,
  );
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
