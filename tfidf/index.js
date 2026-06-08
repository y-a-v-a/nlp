#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');
const { splitDocuments, buildModel, search } = require('./core');

if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [query]');
  process.exit(1);
}

const filePath = process.argv[2];
const query = process.argv.slice(3).join(' ');

try {
  const text = fs.readFileSync(filePath, 'utf8');

  // Split into documents (sonnets) and tokenize — shared core, same code the
  // in-browser search box runs.
  const documents = splitDocuments(text);
  const N = documents.length;
  console.log(`Loaded ${N} documents (sonnets).\n`);

  const tokenizedDocs = documents.map(tokenize);
  const model = buildModel(tokenizedDocs);
  const tfScores = model.tf;
  const idfScores = model.idf;
  const tfidfScores = model.tfidf;

  // Show sample: top 5 most distinctive terms for the first 3 sonnets
  console.log('Sample TF-IDF scores — top 5 distinctive words per sonnet:\n');
  for (let i = 0; i < 3; i++) {
    const topTerms = Object.entries(tfidfScores[i])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const firstLine = documents[i].split('\n')[0].trim();
    console.log(`Sonnet ${i + 1}: "${firstLine}"`);
    for (const [word, score] of topTerms) {
      const tf = tfScores[i][word].toFixed(4);
      const idf = idfScores[word].toFixed(4);
      console.log(`  "${word}"  TF=${tf}  IDF=${idf}  TF-IDF=${score.toFixed(4)}`);
    }
    console.log();
  }

  // If a query is given, rank all sonnets by relevance
  if (query) {
    const queryWords = tokenize(query);
    console.log(`Searching for: "${query}"\n${'─'.repeat(40)}`);

    const results = search(model, queryWords).slice(0, 5);

    if (results.length === 0) {
      console.log('No matching documents found.');
    } else {
      console.log(`Top ${results.length} matching sonnet(s):\n`);
      for (const result of results) {
        console.log(`Sonnet ${result.index + 1}  (score: ${result.score.toFixed(4)})`);
        console.log(documents[result.index]);
        console.log();
      }
    }
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
