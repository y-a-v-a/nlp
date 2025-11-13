# CLAUDE.md

## Project Information

This repository contains multiple implementations of Markov chain text generators, each with different approaches and sophistication levels. The project demonstrates text generation techniques using stochastic models.

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
- **pos-markov/**: Part-of-Speech tagged Markov chain implementation
  - README explains POS tagging, how grammatical roles improve text generation, and includes examples of the enhanced data structure

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

# POS-tagged Markov chain
node pos-markov/index.js corpora/sonnets-shakespeare.txt [output-length]
```

## Notes for Claude Code

- The project uses Node.js for all implementations
- Each implementation builds on concepts from previous ones
- Dependencies are managed via package.json (run `npm install` before using pos-markov)
- The pos-markov implementation requires the `compromise` library for POS tagging
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

5. **pos-markov/README.md**:
   - Introduces Part-of-Speech (POS) tagging and its role in NLP
   - Explains how tracking grammatical roles improves text coherence
   - Shows the enhanced data structure with (word, POS) pairs
   - Demonstrates how POS-awareness creates more grammatically sound output
   - Discusses limitations and potential extensions