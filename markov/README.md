# Markov Chain

*Andrei Markov, 1913 → Claude Shannon, 1948 · sequence modelling*

This is the first stop on the journey, and the simplest possible answer to a
basic question: if you know what a word tends to follow, can you generate more
of it? Andrei Markov analysed letter sequences in Pushkin's *Eugene Onegin* in
1913; Claude Shannon's 1948 paper *A Mathematical Theory of Communication*
turned the same idea into a language model by applying it to words, and
effectively started this whole field. Every variant in this repository's
Markov family — n-grams, probability weighting, POS-tagging — is an
elaboration of that one 1948 idea, not a separate invention.

There is a well-known 20th-century footnote here too: poets of the DADA
movement, notably Tristan Tzara, generated poems by pulling words from a hat —
a manual, unweighted random process with the same flavour as a uniform Markov
walk. It is a nice historical echo, but the mechanism below is Shannon's, not
Tzara's.

## The idea

A Markov chain is a graph. Every unique word in the corpus becomes a node,
and for each time word B follows word A in the text, a directed edge is
recorded from A to B. To generate text, start at any word and at each step
pick a random follower from the edges leaving the current node.

The governing assumption is the **Markov property**: the next word depends
only on the current word. Nothing before it matters. This makes the model
trivially cheap to build — one pass through the text, one lookup table — and
it already produces output that feels faintly language-like, because real
language does have local regularities.

## What the program builds

The data structure is a dictionary mapping each word to the *distinct* words
that ever follow it in the source text:

```js
{
  william: [ 'shakespeare' ],
  shakespeare: [ 'from' ],
  from: [
    'fairest',  'highmost',  'the',    'his',
    'that',     'youth',     'heat',   'thine',
    'thyself',  'you',       'fair',   'faring',
    'far',      'thee',      'sullen', 'woe',
    'mine',     'me',        'loves',  'thy',
    // ... 44 distinct followers in all
  ],
  fairest: [ 'creatures', 'wights', 'and', 'in', 'votary' ],
  creatures: [ 'we', 'broke' ],
  // ...
}
```

"From thee" appears ten times in the sonnets and "from fairest" once, but the
chain stores each follower once: `thee` and `fairest` are equally likely next
steps out of the 44 recorded for `from`. Transition frequency is thrown away —
that blindness is this model's defining limitation, and exactly what
[`../probability-markov/`](../probability-markov/) fixes.

## Where it falls short

- **No memory.** After choosing "fairest" as the word following "from", the
  model immediately forgets "from". The next word is chosen knowing only
  "fairest" — the full phrase built so far is invisible.
- **Uniform selection.** Every distinct follower gets an equal share of the
  draw regardless of how often that transition actually occurred in the
  corpus.
- **No semantics.** The model cannot tell the difference between a word that
  makes sense in context and one that does not. It only knows adjacency —
  which words have appeared next to which, never why.
- **One output mode.** Markov chains can only generate. They cannot search,
  classify, summarise, or answer any question about what the text means.

## Usage

```bash
node markov/index.js <path-to-text-file> [output-length]
```

Examples:

```bash
# Default output length (30 words)
node markov/index.js corpora/sonnets-shakespeare.txt

# Custom output length (50 words)
node markov/index.js corpora/sonnets-shakespeare.txt 50

# Try the contrasting corpus
node markov/index.js corpora/sonnets-browning.txt 50
```

The program prints a sample of the chain (word → possible next words) and the
generated text.

The immediate responses to this model's limits are the other four members of
the family: n-grams add context before the current word
([`../ngram-markov/`](../ngram-markov/)), probability weighting uses frequency
during selection ([`../probability-markov/`](../probability-markov/)), the two
combine ([`../ngram-probability-markov/`](../ngram-probability-markov/)), and
POS-tagging steers the walk with grammar
([`../pos-markov/`](../pos-markov/)) — before the whole sequence-modelling
approach is abandoned in favour of document-level statistics in
[`../tfidf/`](../tfidf/).

(c) 2025 Vincent Bruijn <vebruijn@gmail.com>
