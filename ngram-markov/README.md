# N-Gram Markov Chain Text Generator

This is an advanced implementation of a Markov chain text generator that uses n-grams (sequences of n words) to generate more coherent text than a simple word-by-word Markov chain.

## How It Works

1. The program reads a text file and builds a Markov chain model.
2. Instead of using single words as states, it uses sequences of (n-1) words (n-grams).
3. For each n-gram, it tracks which words can follow that sequence.
4. When generating text, it uses the context of the previous (n-1) words to choose the next word.

```js
{
  'the sonnets by': [ 'william' ],
  'sonnets by william': [ 'shakespeare' ],
  'by william shakespeare': [ 'from' ],
  'william shakespeare from': [ 'fairest' ],
  'shakespeare from fairest': [ 'creatures' ],
  'from fairest creatures': [ 'we' ],
  'fairest creatures we': [ 'desire' ],
  // ...
}
```

## Usage

```bash
node index.js <path-to-text-file> [ngram-size] [output-length]
```

### Parameters:

- `<path-to-text-file>`: Path to the input text file (required)
- `[ngram-size]`: Size of n-grams to use (default: 2, which means bigrams)
- `[output-length]`: Number of words to generate (default: 50)

### Examples:

```bash
# Generate text using default settings (bigrams, 50 words)
node index.js ../corpora/sonnets-shakespeare.txt

# Generate text using trigrams (n=3) and 100 words
node index.js ../corpora/sonnets-shakespeare.txt 3 100

# Generate text using 4-grams (n=4) and 75 words
node index.js ../corpora/sonnets-shakespeare.txt 4 75
```

## Benefits of N-Gram Markov Chains

Using n-grams instead of single words provides several advantages:

1. **Better context awareness**: The generator considers more context when choosing the next word.
2. **More coherent output**: The generated text tends to be more grammatically correct and semantically meaningful.
3. **Preserved phrase structure**: Common phrases and patterns from the original text are more likely to be preserved.

The larger the n-gram size, the more closely the output will resemble the structure of the original text, but with less variation. Smaller n-gram sizes produce more random, creative output.
