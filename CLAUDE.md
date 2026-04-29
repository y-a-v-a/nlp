# CLAUDE.md

## Project Information

This repository contains implementations of NLP techniques, from Markov chain text generators through TF-IDF document search, demonstrating the historical progression of statistical approaches to natural language.

## Key Directories

- **corpora/**: Contains source texts for generation
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

## Notes for Claude Code

- The project uses Node.js for all implementations
- Each implementation builds on concepts from previous ones
- No specific linting or testing commands are set up yet
- Parameter details:
  - `[output-length]`: Number of words to generate
  - `[ngram-size]`: Number of words in n-gram (in ngram-markov)
  - `[context-size]`: Size of context used (in ngram-probability-markov)

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