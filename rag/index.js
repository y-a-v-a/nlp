#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');
const { splitDocuments, retrieve, buildBigrams, generate } = require('./core');

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
  const documents = splitDocuments(text);

  const N = documents.length;
  if (N === 0) {
    console.error('No documents found in the file.');
    process.exit(1);
  }
  const tokenizedDocs = documents.map(tokenize);

  // -------------------------------------------------------------------------
  // STEP 1 — RETRIEVE.  Rank documents against the query with TF-IDF, the same
  // measure built in tfidf/.
  // -------------------------------------------------------------------------
  const queryWords = tokenize(query);
  const ranked = retrieve(tokenizedDocs, queryWords);

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
    const firstLine = documents[r.index].split('\n').find((l) => l.trim()) || '';
    console.log(`  sonnet #${r.index + 1}  (score ${r.score.toFixed(4)})  "${firstLine.trim()}"`);
  }

  // -------------------------------------------------------------------------
  // STEP 2 — AUGMENT.  The retrieved documents become the *context*: the only
  // text the generator is allowed to draw on.  This is the "grounding" step.
  // -------------------------------------------------------------------------
  const contextWords = retrieved.flatMap((r) => tokenizedDocs[r.index]);
  console.log(`\nSTEP 2 — Augment: context = those ${retrieved.length} sonnets (${contextWords.length} words)`);

  // -------------------------------------------------------------------------
  // STEP 3 — GENERATE.  A bigram Markov model stands in for an LLM. The point
  // is the *grounding*: a model trained ONLY on the retrieved context can only
  // speak in the language of the fetched documents.
  // -------------------------------------------------------------------------

  // Seed generation with a query word so the output starts on-topic.
  const seed = queryWords.find((w) => contextWords.includes(w)) || contextWords[0];

  const groundedChain = buildBigrams(contextWords);
  const grounded = generate(groundedChain, seed, 30, { rng: rand });

  // For contrast: a model trained on the WHOLE corpus, ignoring the query —
  // the "ungrounded" baseline. Same seed, same length.
  const allWords = tokenizedDocs.flat();
  const ungroundedChain = buildBigrams(allWords);
  const ungrounded = generate(ungroundedChain, seed, 30, { rng: rand });

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
