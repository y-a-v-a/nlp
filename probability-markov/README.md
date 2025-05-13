# Probability-Based Markov Chain Text Generator

This implementation of a Markov chain text generator uses probability scores to determine the next word in the sequence, making the generation process more accurate to the original text's patterns.

## How It Works

1. The program reads a text file and builds a Markov chain model with probabilities.
2. For each word, it records all possible following words and their frequencies.
3. These frequencies are converted to probability scores (as float values from 0 to 1).
4. When generating text, it selects the next word based on these probability distributions.

```js
// Example of the Markov chain structure:
{
  "the": {
    "sonnets": {
      word: "sonnets",
      probability: 0.0385  // 3.85% chance of "the" being followed by "sonnets"
    },
    "world": {
      word: "world",
      probability: 0.0769  // 7.69% chance of "the" being followed by "world"
    },
    // ... other possible words that follow "the"
  },
  // ... other words in the corpus
}
```

## Usage

```bash
node index.js <path-to-text-file> [output-length]
```

### Parameters:

- `<path-to-text-file>`: Path to the input text file (required)
- `[output-length]`: Number of words to generate (default: 30)

### Example:

```bash
# Generate text using default settings (30 words)
node index.js ../corpora/sonnets-shakespeare.txt

# Generate text with 100 words
node index.js ../corpora/sonnets-shakespeare.txt 100
```

## Benefits of Probability-Based Selection

Using probability scores instead of random selection provides several advantages:

1. **More faithful to the original text**: Common word combinations in the source text will appear more frequently in the generated text.
2. **Better flow**: The text follows statistical patterns from the original text, producing more natural-sounding output.
3. **Weighted randomness**: Words that commonly follow others are more likely to be chosen, but less common combinations can still appear occasionally.

This approach strikes a balance between randomness and structure, creating output that feels both creative and coherent.