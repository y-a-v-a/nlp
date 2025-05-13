# Markov Chain DADA Poetry Generator

A simple Node.js application that generates random text inspired by Tristan Tzara's DADA poetry technique. The program uses Markov chains to create associations between words from an input text file and generates new, randomized output.

## How It Works

1. The app reads a text file provided as a command-line argument
2. Converts the text into a Markov chain model where each word points to possible following words
3. Generates a new sequence of words by randomly walking through the chain
4. Outputs the result to the console as a DADA-style poem

```js
{
 william: [ 'shakespeare' ],
  shakespeare: [ 'from' ],
  from: [
    'fairest',   'highmost', 'the',     'his',    'that',
    'youth',     'heat',     'the',     'thine',  'thyself',
    'you',       'fair',     'the',     'faring', 'the',
    'far',       'thee',     'sullen',  'woe',    'mine',
    'the',       'me',       'me',      'love’s', 'thy',
    'thy',       'limits',   'thee',    'thee',   'hands',
    'whence',    'the',      'thy',     'thee',   'thee',
    'where',     'thee',     'thee',    'home',   'me',
    'memory',    'time’s',   'these',   'this',   'you',
    'variation', 'thy',      'thy',     'hence',  'hence',
    'thence',    'thy',      'expense', 'thee',   'you',
    'their',     'my',       'thee',    'the',    'his',
    'my',        'my',       'your',    'your',   'limbecks',
    'me',        'accident', 'my',      'myself', 'my',
    'their',     'serving',  'those',   'thee',   'my',
    'me',        'heaven',   'hate',    'the',    'what',
    'this',      'love’s'
  ],
  fairest: [ 'creatures', 'wights', 'and', 'in', 'votary' ],
  creatures: [ 'we', 'broke' ],
  we: [
    'desire',    'two',
    'must',      'know',
    'it',        'are',
    'which',     'our',
    'sicken',    'purge',
    'admire',    'before',
    'see',       'prove',
    'flatter’d'
  ],
  // ...
}
```

## Usage

```bash
node index.js <path-to-text-file> [output-length]
```

Examples:

```bash
# Default output length (30 words)
node index.js sample.txt

# Custom output length (50 words)
node index.js sample.txt 50
```

## Requirements

- Node.js

## Technical Details

The Markov chain implementation:

- Splits input text into words, removing punctuation
- Creates a dictionary where each word maps to an array of words that follow it in the original text
- Generates new text by randomly selecting words from these arrays based on the previous word
- When a word has no followers, a new random word is selected

The generated poem is 30 words long by default, but you can specify a custom length as the second command-line argument.

(c) 2025 Vincent Bruijn <vebruijn@gmail.com>
