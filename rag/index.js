#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');

// Validate arguments
if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [query]');
  process.exit(1);
}

const filePath = process.argv[2];
const query = process.argv.slice(3).join(' ') || 'the passage of time';

// Deterministic PRNG so the generated text is reproducible.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(7);

const TOP_K = 3; // how many documents the retriever fetches

try {
  const text = fs.readFileSync(filePath, 'utf8');

  // Split the corpus into documents (sonnets) by blank-line blocks, exactly as
  // tfidf/ does — RAG reuses the same retrieval substrate.
  const documents = text
    .replace(/\r\n/g, '\n')
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter((block) => block.split('\n').length >= 10);

  const N = documents.length;
  if (N === 0) {
    console.error('No documents found in the file.');
    process.exit(1);
  }
  const tokenizedDocs = documents.map(tokenize);

  // -------------------------------------------------------------------------
  // STEP 1 — RETRIEVE.  Rank documents against the query with TF-IDF, the same
  // measure built in tfidf/.  (Re-implemented compactly here; the demos are
  // scripts, not importable modules.)
  // -------------------------------------------------------------------------
  const df = {};
  const tfPerDoc = tokenizedDocs.map((words) => {
    const counts = {};
    for (const w of words) counts[w] = (counts[w] || 0) + 1;
    for (const w in counts) df[w] = (df[w] || 0) + 1;
    const tf = {};
    for (const w in counts) tf[w] = counts[w] / words.length;
    return tf;
  });
  const idf = {};
  for (const w in df) idf[w] = Math.log(N / df[w]);

  const queryWords = tokenize(query);
  const ranked = tfPerDoc
    .map((tf, i) => {
      let score = 0;
      for (const w of queryWords) score += (tf[w] || 0) * (idf[w] || 0);
      return { i, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  console.log('RAG — retrieve, then generate');
  console.log('═'.repeat(60));
  console.log(`Query: "${query}"\n`);

  if (ranked.length === 0) {
    console.log('The retriever found no relevant documents for this query.');
    console.log('Try query words that appear in the corpus.');
    process.exit(0);
  }

  const retrieved = ranked.slice(0, TOP_K);
  console.log(`STEP 1 — Retrieve: top ${retrieved.length} of ${N} sonnets by TF-IDF relevance`);
  console.log('─'.repeat(60));
  for (const r of retrieved) {
    const firstLine = documents[r.i].split('\n').find((l) => l.trim()) || '';
    console.log(`  sonnet #${r.i + 1}  (score ${r.score.toFixed(4)})  "${firstLine.trim()}"`);
  }

  // -------------------------------------------------------------------------
  // STEP 2 — AUGMENT.  The retrieved documents become the *context*: the only
  // text the generator is allowed to draw on.  This is the "grounding" step.
  // -------------------------------------------------------------------------
  const contextWords = retrieved.flatMap((r) => tokenizedDocs[r.i]);
  console.log(`\nSTEP 2 — Augment: context = those ${retrieved.length} sonnets (${contextWords.length} words)`);

  // -------------------------------------------------------------------------
  // STEP 3 — GENERATE.  A bigram Markov model stands in for an LLM. The point
  // is the *grounding*: a model trained ONLY on the retrieved context can only
  // speak in the language of the fetched documents.
  // -------------------------------------------------------------------------
  function buildBigrams(words) {
    const chain = {};
    for (let i = 0; i < words.length - 1; i++) {
      (chain[words[i]] ||= []).push(words[i + 1]);
    }
    return chain;
  }
  function generate(chain, seed, n) {
    const keys = Object.keys(chain);
    if (keys.length === 0) return '';
    let current = chain[seed] ? seed : keys[Math.floor(rand() * keys.length)];
    const out = [current];
    for (let i = 0; i < n - 1; i++) {
      const next = chain[current];
      current =
        next && next.length
          ? next[Math.floor(rand() * next.length)]
          : keys[Math.floor(rand() * keys.length)];
      out.push(current);
    }
    return out.join(' ');
  }

  // Seed generation with a query word so the output starts on-topic.
  const seed = queryWords.find((w) => contextWords.includes(w)) || contextWords[0];

  const groundedChain = buildBigrams(contextWords);
  const grounded = generate(groundedChain, seed, 30);

  // For contrast: a model trained on the WHOLE corpus, ignoring the query —
  // the "ungrounded" baseline. Same seed, same length.
  const allWords = tokenizedDocs.flat();
  const ungroundedChain = buildBigrams(allWords);
  const ungrounded = generate(ungroundedChain, seed, 30);

  console.log(`\nSTEP 3 — Generate (bigram model; seeded with "${seed}")`);
  console.log('─'.repeat(60));
  console.log('  GROUNDED — trained only on the retrieved sonnets:');
  console.log(`    ${grounded}\n`);
  console.log('  UNGROUNDED — trained on the whole corpus (ignores retrieval):');
  console.log(`    ${ungrounded}`);

  console.log(
    '\nThe grounded output stays in the vocabulary of the fetched sonnets — it is\n' +
      '"answering" from retrieved evidence. That is the whole idea of RAG: the\n' +
      'generator is only as current, private, or accurate as what you retrieve.',
  );
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
