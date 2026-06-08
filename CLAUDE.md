# CLAUDE.md

## Project Information

This repository contains implementations of NLP techniques, from Markov chain text generators through TF-IDF document search, demonstrating the historical progression of statistical approaches to natural language.

## Key Directories

- **corpora/**: Contains source texts
  - `sonnets-shakespeare.txt` — Shakespeare's 154 sonnets (primary corpus)
  - `sonnets-browning.txt` — Elizabeth Barrett Browning's *Sonnets from the Portuguese* (44 sonnets), a stylistic contrast for classification/retrieval tasks
- **lib/**: Shared, dependency-free helpers used by every implementation
  - `tokenize.js` — the one canonical tokenizer. Normalises curly quotes, lowercases, removes apostrophes (so contractions/possessives stay whole), replaces other punctuation with spaces, and splits on whitespace. **Always reuse this** rather than re-implementing preprocessing, so output differences come from the algorithm, not from inconsistent tokenization.
- **markov/**: Simple Markov chain implementation
  - README explains basic Markov chain concepts
- **ngram-markov/**: N-gram based implementation
  - README explains how n-grams work, their benefits, and includes examples of the data structure used
- **probability-markov/**: Probability-based implementation
  - README details how probability scores are calculated and used, with examples of the weighted selection process
- **ngram-probability-markov/**: Combined n-gram and probability implementation
  - README clarifies the relationship between n-gram size and context size, and explains the combined approach in detail
- **tfidf/**: TF-IDF document search implementation
  - README explains TF, IDF, and their combination; covers the historical context and relationship to later NLP approaches

## Commands to Run

### Run text generators
```bash
# Simple Markov chain
node markov/index.js corpora/sonnets-shakespeare.txt [output-length]

# N-gram Markov chain
node ngram-markov/index.js corpora/sonnets-shakespeare.txt [ngram-size] [output-length]

# Probability-based Markov chain
node probability-markov/index.js corpora/sonnets-shakespeare.txt [output-length]

# N-gram probability-based Markov chain
node ngram-probability-markov/index.js corpora/sonnets-shakespeare.txt [context-size] [output-length]

# TF-IDF document search
node tfidf/index.js corpora/sonnets-shakespeare.txt [query]
```

### Run statistical-NLP demos
```bash
# Zipf's law
node zipf/index.js corpora/sonnets-shakespeare.txt [top-n]

# Edit distance + spell-checker
node edit-distance/index.js corpora/sonnets-shakespeare.txt [input-word]

# Pointwise mutual information collocations
node pmi/index.js corpora/sonnets-shakespeare.txt [window-size]

# Naive Bayes author classifier (needs two corpora)
node naive-bayes/index.js corpora/sonnets-shakespeare.txt corpora/sonnets-browning.txt

# Co-occurrence word vectors + cosine similarity
node word-vectors/index.js corpora/sonnets-shakespeare.txt [query-word]

# Byte-pair encoding tokenizer
node bpe/index.js corpora/sonnets-shakespeare.txt [num-merges] [word-to-trace]
```

### Run neural-era demos
```bash
# Feedforward neural language model (Bengio 2003)
node neural-lm/index.js corpora/sonnets-shakespeare.txt [epochs] [output-length]

# Char-level recurrent neural network
node rnn/index.js corpora/sonnets-shakespeare.txt [iterations] [sample-length]

# Scaled dot-product self-attention
node attention/index.js corpora/sonnets-shakespeare.txt ["short phrase"]
```

### Run modern-era demo
```bash
# Retrieval-augmented generation (TF-IDF retrieve + generate)
node rag/index.js corpora/sonnets-shakespeare.txt [query]
```

The `modern/` directory holds concept-only HTML explainers (Transformer, pretraining, scaling, alignment, reasoning, agents) — no runnable code, since this era is defined by scale beyond a laptop.

## Notes for Claude Code

- The project uses Node.js for all implementations
- Each implementation builds on concepts from previous ones
- No specific linting or testing commands are set up yet
- Parameter details:
  - `[output-length]`: Number of words to generate
  - `[ngram-size]`: Number of words in n-gram (in ngram-markov)
  - `[context-size]`: Size of context used (in ngram-probability-markov)

## HTML Explainer Convention

Each subproject contains an `index.html` — a self-contained single-page explainer openable directly in a browser. When adding a new subproject, create one following this approach:

- **Colours:** background `#F9F7F3`, text `rgb(21,20,20)`, one warm accent `#C4622D` and its alpha variants for borders/fills
- **Structure:** era + title + tagline → "How it works" (2–3 paragraphs) → one visual element → "Where it falls short" → footer pointing to what came next
- **Visual element:** one CSS/SVG diagram that makes the core mechanic immediately visible using real data from the corpus — not a generic flowchart. Examples: word-graph for Markov, probability bar chart for weighted selection, side-by-side word cards for TF-IDF
- **Shortcomings section:** left-bordered with accent colour; specific to this algorithm, not generic caveats
- **No external dependencies:** all CSS and any JS inline, no CDN links
- **Concept-only pages** (the `modern/` frontier-era explainers) have no runnable code: they carry a visually distinct note under the header saying so, and a conceptual diagram instead of corpus data.

## Website Layer (homepage + nav)

The root `index.html` is the front door: a timeline of every technique, grouped by era. It and the cross-page navigation are produced by **`scripts/build-site.js`** — the single source of truth for page order.

- **Pages stay self-contained.** There is deliberately no shared stylesheet. The generator injects a small nav (top: home + prev/next + position; bottom: prev/all/next, plus README + source links on runnable pages) using **literal palette colours**, so every page still opens standalone with no external asset.
- **Injection is idempotent**, fenced by `<!--journey-nav-start-->`/`-end-->` and `<!--journey-foot-start-->`/`-end-->` markers.
- **When you add a technique:** add its `index.html` (following the convention above), then add it to the `PAGES` manifest in `scripts/build-site.js` and run `node scripts/build-site.js` to regenerate the homepage and re-thread the nav. Do not hand-edit the injected nav blocks.

## README Documentation

Each implementation directory contains a detailed README.md that serves specific documentation purposes:

1. **markov/README.md**: 
   - Provides a basic introduction to Markov chains
   - Explains the simple implementation approach
   - Includes usage instructions

2. **ngram-markov/README.md**:
   - Explains the concept of n-grams in natural language processing
   - Shows examples of the n-gram data structure
   - Demonstrates how context improves text generation
   - Includes detailed usage examples with different n-gram sizes

3. **probability-markov/README.md**:
   - Explains probability-based selection vs. random selection
   - Shows the data structure with probability scores
   - Details how the weighted random selection works
   - Includes usage instructions

4. **ngram-probability-markov/README.md**:
   - Clarifies the important distinction between n-gram size and context size
   - Provides examples of the combined approach data structure
   - Explains the benefits of using both techniques together
   - Contains detailed usage examples with different parameter combinations

5. **tfidf/README.md**:
   - Explains TF (term frequency) and IDF (inverse document frequency) separately, then their combination
   - Shows the data structure with TF, IDF, and TF-IDF values side by side
   - Explains the bag-of-words shift from sequence-based Markov models
   - Places TF-IDF in historical context and connects it to later approaches like Word2Vec