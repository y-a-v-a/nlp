# Markov Chain Text Generators

This repository contains different implementations of Markov chain text generators, each showcasing different approaches to text generation.

## Directory Structure

- **corpora/**: Contains text files used as inputs for the generators
  - `sonnets-shakespeare.txt`
  - `sonnets-shakespeare-pg.txt`

- **markov/**: Simple Markov chain implementation
  - A basic word-to-word Markov chain
  - Uses simple arrays for next-word selection
  - Random selection from possible next words

- **ngram-markov/**: N-gram based Markov chain implementation
  - Uses sequences of words (n-grams) as context
  - Preserves more coherent phrases and language patterns
  - Configurable n-gram size

- **probability-markov/**: Probability-based Markov chain implementation
  - Uses probability distributions for next-word selection
  - Words that more frequently follow others have higher probability
  - Produces more natural-sounding text

- **ngram-probability-markov/**: Combined n-gram and probability approach
  - Most sophisticated implementation
  - Uses context of multiple words with probability-based selection
  - Produces the most coherent and natural-sounding generated text

## Usage

Each implementation is a standalone Node.js script that can be run from its directory:

```bash
# Simple Markov chain
cd markov
node index.js ../corpora/sonnets-shakespeare.txt [output-length]

# N-gram Markov chain
cd ngram-markov
node index.js ../corpora/sonnets-shakespeare.txt [ngram-size] [output-length]

# Probability-based Markov chain
cd probability-markov
node index.js ../corpora/sonnets-shakespeare.txt [output-length]

# N-gram probability-based Markov chain
cd ngram-probability-markov
node index.js ../corpora/sonnets-shakespeare.txt [context-size] [output-length]
```

See each implementation's README for detailed usage instructions and examples.