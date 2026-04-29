#!/usr/bin/env node

const fs = require('fs');

if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [query]');
  process.exit(1);
}

const filePath = process.argv[2];
const query = process.argv.slice(3).join(' ');

try {
  const text = fs.readFileSync(filePath, 'utf8');

  // Normalize line endings, then split into documents by blank lines
  const documents = text
    .replace(/\r\n/g, '\n')
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter((block) => block.split('\n').length >= 10);

  const N = documents.length;
  console.log(`Loaded ${N} documents (sonnets).\n`);

  // Tokenize: strip punctuation, lowercase, split on whitespace
  function tokenize(str) {
    return str
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"]/g, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0);
  }

  const tokenizedDocs = documents.map(tokenize);

  // Step 1: Term Frequency
  // TF(t, d) = (number of times t appears in d) / (total words in d)
  // Measures how often a word appears relative to the document length.
  function computeTF(words) {
    const counts = {};
    for (const word of words) {
      counts[word] = (counts[word] || 0) + 1;
    }
    const total = words.length;
    const tf = {};
    for (const word in counts) {
      tf[word] = counts[word] / total;
    }
    return tf;
  }

  const tfScores = tokenizedDocs.map(computeTF);

  // Step 2: Document Frequency
  // df(t) = number of documents that contain term t (at least once)
  const documentFrequency = {};
  for (const tf of tfScores) {
    for (const word in tf) {
      documentFrequency[word] = (documentFrequency[word] || 0) + 1;
    }
  }

  // Step 3: Inverse Document Frequency
  // IDF(t) = log(N / df(t))
  // Words appearing in many documents (like "the", "and") get a low IDF score.
  // Words appearing in only a few documents get a high IDF score.
  const idfScores = {};
  for (const word in documentFrequency) {
    idfScores[word] = Math.log(N / documentFrequency[word]);
  }

  // Step 4: TF-IDF
  // TFIDF(t, d) = TF(t, d) * IDF(t)
  // A word scores high only when it is frequent in this document AND rare across all documents.
  const tfidfScores = tfScores.map((tf) => {
    const tfidf = {};
    for (const word in tf) {
      tfidf[word] = tf[word] * idfScores[word];
    }
    return tfidf;
  });

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

    const results = tfidfScores
      .map((tfidf, i) => {
        const score = queryWords.reduce((sum, w) => sum + (tfidf[w] || 0), 0);
        return { index: i, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

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
