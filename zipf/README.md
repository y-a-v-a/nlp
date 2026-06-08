# Zipf's Law

*George Zipf, 1935–1949 · quantitative linguistics*

Before you build any NLP system it helps to understand the statistical *shape* of
language itself. Zipf's law is the single most important fact about that shape, and
it explains — among other things — why TF-IDF works at all.

## The idea

Count how often each word appears in a body of text and rank the words from most to
least frequent. **Zipf's law** says that a word's frequency is roughly inversely
proportional to its rank:

```
frequency(word)  ≈  C / rank(word)
```

The most common word appears about twice as often as the second most common, three
times as often as the third, and so on. Equivalently, **rank × frequency is roughly
constant** for every word in the vocabulary. Plot rank against frequency on log-log
axes and you get a near-straight line — for virtually any natural-language corpus.

## What the program builds

The data structure is simply a frequency-ranked list of words. For each rank we show
the actual frequency, the product `rank × frequency` (which should hover around a
constant), and the frequency Zipf's law *predicts* (`frequency of the rank-1 word /
rank`):

```
rank  word           freq   rank×freq   Zipf-predicted
   1  and            490        490         490
   2  the            438        876         245
   3  to             415       1245         163
   4  my             372       1488         123
   5  of             370       1850          98
  ...
  50  (50th word)     54       ~2700         ~10
```

Two things to notice in the real output above (Shakespeare's sonnets, 17,608 tokens,
3,170 unique words):

- The vocabulary is dominated by a handful of function words — `and`, `the`, `to`,
  `my`, `of` — none of which tell you anything about *what a sonnet is about*.
- `rank × frequency` stays in the same ballpark (≈ 2,500 across the top 50 words)
  even though the raw frequencies fall from 490 down to ~50. That near-constancy is
  Zipf's law made concrete.

The fit is not perfect — poetry leans on `and` more than prose, so the rank-1 word
overshoots the simple prediction — but the overall power-law shape is unmistakable.

## Why it matters

- **It explains IDF.** Because a tiny number of words account for most of all
  tokens, raw frequency is a terrible relevance signal. The whole point of inverse
  document frequency (see [`../tfidf/`](../tfidf/)) is to discount exactly these
  high-rank Zipfian words. Zipf's law is the statistical justification for TF-IDF.
- **It explains the long tail.** Half the vocabulary of almost any corpus consists
  of words that appear only once (*hapax legomena*). This is why models trained on
  small corpora generalise poorly: the rare-word tail is enormous and never fully
  covered.
- **It is universal.** The same curve appears in English, Latin, source code, and
  city populations. Language is far from random, and its non-randomness has a
  predictable form.

## Where it falls short

Zipf's law is *descriptive*, not *useful* on its own. It tells you the distribution
of word frequencies but nothing about meaning, sequence, or relevance. It cannot
generate text, classify a document, or answer a query. It is a lens for
understanding why later techniques are shaped the way they are — not a technique you
deploy. The next step is to *do* something with these counts: weight them (TF-IDF),
relate them (PMI, word vectors), or predict them (language models).

## Usage

```bash
# Top 20 words by default
node zipf/index.js corpora/sonnets-shakespeare.txt

# Show the top 40 ranks
node zipf/index.js corpora/sonnets-shakespeare.txt 40

# Compare the curve on a different author
node zipf/index.js corpora/sonnets-browning.txt 20
```

The program prints the ranked frequency table, the average `rank × frequency` over
the top 50 words (the "constant"), and a small bar chart of the top 10 frequencies
so the steep head of the distribution is visible at a glance.
