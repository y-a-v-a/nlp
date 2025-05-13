# N-Gram Probability-Based Markov Chain

This implementation combines the benefits of n-gram context with probability-based word selection to create a more sophisticated Markov chain text generator.

## How It Works

1. The program reads a text file and builds an n-gram Markov chain model with probabilities.
2. In an n-gram model, we use a context of (n-1) words to predict the nth word.
   - For example, in a trigram model (n=3), we use 2 words to predict the next word.
   - The "context size" parameter sets how many words to use as context.
3. For each context (sequence of words), it records all possible following words and their frequencies.
4. These frequencies are converted to probability scores (as float values from 0 to 1).
5. When generating text, it selects the next word based on these probability distributions.

```js
// Example of the n-gram Markov chain structure (for n=3):
{
  "from fairest creatures": {
    "we": {
      word: "we",
      probability: 1.0000  // 100% chance of this sequence being followed by "we"
    }
  },
  "the tender bloom": {
    "of": {
      word: "of",
      probability: 0.7500  // 75% chance of being followed by "of"
    },
    "appears": {
      word: "appears",
      probability: 0.2500  // 25% chance of being followed by "appears"
    }
  },
  // ... other n-grams in the corpus
}
```

## Usage

```bash
node index.js <path-to-text-file> [context-size] [output-length]
```

### Parameters:

- `<path-to-text-file>`: Path to the input text file (required)
- `[context-size]`: Size of context to use (default: 2)
  - A context size of 2 means a trigram model (n=3)
  - A context size of 3 means a 4-gram model (n=4)
- `[output-length]`: Number of words to generate (default: 50)

### Examples:

```bash
# Generate text using default settings (context size 2, which is trigrams, 50 words)
node index.js ../corpora/sonnets-shakespeare.txt

# Generate text using context size 3 (which is 4-grams) and 100 words
node index.js ../corpora/sonnets-shakespeare.txt 3 100

# Generate text using context size 4 (which is 5-grams) and 75 words
node index.js ../corpora/sonnets-shakespeare.txt 4 75
```

## Benefits of Combined Approach

This implementation combines the advantages of both n-grams and probability-based selection:

1. **Extended context**: Uses sequences of words rather than single words to provide better context.
2. **Statistical accuracy**: Selects words based on their probability of occurrence after a given sequence.
3. **Coherent output**: Produces text that more closely resembles natural language patterns.
4. **Weighted transitions**: More common patterns are more likely to appear, preserving the style of the original text.

The larger the n-gram size, the more coherent but less creative the output will be. A smaller n-gram size allows for more novel combinations while maintaining some statistical relevance.