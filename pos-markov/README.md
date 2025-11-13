# POS-Tagged Markov Chain Text Generator

This implementation combines Markov chains with Part-of-Speech (POS) tagging to generate more grammatically coherent text. By tracking both words and their grammatical roles, this generator produces output that better respects linguistic structure.

## What are Parts of Speech?

Parts of speech are grammatical categories that describe how words function in sentences:

- **Nouns**: People, places, things (e.g., "cat", "Shakespeare", "beauty")
- **Verbs**: Actions or states (e.g., "run", "is", "create")
- **Adjectives**: Describe nouns (e.g., "beautiful", "quick", "dark")
- **Adverbs**: Describe verbs, adjectives, or other adverbs (e.g., "quickly", "very")
- **Pronouns**: Replace nouns (e.g., "he", "she", "it")
- **Prepositions**: Show relationships (e.g., "in", "on", "with")
- **Conjunctions**: Connect words/phrases (e.g., "and", "but", "or")
- **Determiners**: Introduce nouns (e.g., "the", "a", "this")

## How It Works

1. **POS Tagging**: The program uses the `compromise` library to analyze each word and assign it a grammatical role (part of speech).

2. **Enhanced State Space**: Instead of tracking just words, the Markov chain tracks (word, POS) pairs. For example:
   - "run" as a verb is different from "run" as a noun
   - "light" as an adjective is different from "light" as a noun

3. **Grammar-Aware Transitions**: The chain learns which POS patterns commonly follow each other, creating more grammatically sound sequences.

4. **Structured Generation**: When generating text, the algorithm respects both word choice and grammatical structure.

## Data Structure Example

```js
{
  'the|Determiner': [
    { word: 'world', tag: 'Noun' },
    { word: 'sun', tag: 'Noun' },
    { word: 'beautiful', tag: 'Adjective' }
  ],
  'beautiful|Adjective': [
    { word: 'day', tag: 'Noun' },
    { word: 'night', tag: 'Noun' },
    { word: 'rose', tag: 'Noun' }
  ],
  'day|Noun': [
    { word: 'begins', tag: 'Verb' },
    { word: 'is', tag: 'Verb' },
    { word: 'of', tag: 'Preposition' }
  ]
}
```

Notice how determiners tend to be followed by nouns or adjectives, adjectives by nouns, and nouns by verbs or prepositions—reflecting natural English grammar patterns.

## Usage

```bash
node index.js <path-to-text-file> [output-length]
```

### Parameters:

- `<path-to-text-file>`: Path to the input text file (required)
- `[output-length]`: Number of words to generate (default: 30)

### Examples:

```bash
# Generate 30 words (default) from Shakespeare's sonnets
node index.js ../corpora/sonnets-shakespeare.txt

# Generate 50 words
node index.js ../corpora/sonnets-shakespeare.txt 50

# Generate 100 words
node index.js ../corpora/sonnets-shakespeare.txt 100
```

## Benefits of POS-Tagged Markov Chains

1. **Grammatical Coherence**: By respecting parts of speech, the generated text follows grammatical patterns more closely.

2. **Context Disambiguation**: Words with multiple meanings are distinguished by their grammatical role.

3. **Better Structure**: The output maintains basic sentence structure (e.g., determiner → adjective → noun → verb).

4. **Educational Value**: Visualizing POS tags helps understand how language structure works.

## Example Output

**Simple Markov chain might produce:**
```
the beauty and the beauty and the beauty
```

**POS-tagged Markov chain produces:**
```
the beautiful day begins with gentle light and soft whispers
```

The POS-aware approach reduces repetitive patterns and maintains better grammatical flow.

## Limitations

- **Single-word Context**: Like the simple Markov chain, this still only looks at the immediately preceding word.
- **Not Perfect Grammar**: While better than simple chains, it doesn't guarantee perfect sentences.
- **Tagging Accuracy**: POS tagging depends on the `compromise` library's accuracy.

## Potential Extensions

- Combine with n-grams for longer context
- Add probability weighting
- Implement sentence boundary detection for more natural starts/ends
- Add punctuation handling for more natural text flow
