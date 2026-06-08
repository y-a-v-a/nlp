# Pointwise Mutual Information (PMI)

*Kenneth Church & Patrick Hanks, 1990 · lexical statistics*

TF-IDF and Zipf's law are about counting words in isolation. PMI is the first
step toward *relationships between words*: it asks whether two words appear
together more often than pure chance would predict. That question — "which words
keep each other company?" — is the seed of every later notion of word meaning,
from co-occurrence matrices to word embeddings.

## The idea

Slide a small window across the text and count how often each pair of words
co-occurs inside it. Then compare the pair's joint probability against the
product of the two words' individual probabilities. If the words were
independent, those two quantities would be equal. **Pointwise Mutual
Information** is the (base-2) log of their ratio:

```
PMI(x, y)  =  log2( P(x, y) / ( P(x) · P(y) ) )
```

- **PMI ≫ 0** — the words occur together far more than chance: a real
  association or collocation (`ten times`, `tied tongue`).
- **PMI ≈ 0** — the words are statistically independent; seeing one tells you
  nothing about the other.
- **PMI < 0** — the words actively avoid each other (rare and noisy in small
  corpora).

`P(x)` and `P(y)` are estimated from how often each word participates in *any*
co-occurrence, and `P(x,y)` from how often the specific pair does. PMI is
**symmetric**: `PMI(x,y) = PMI(y,x)`.

## What the program builds

The core data structure is a map from each unordered word pair to its joint
count and its PMI score. Here is a real sample from Shakespeare's sonnets
(window ±3), showing that common-word pairs like `by + the` co-occur often but
score *low* PMI — frequency alone is not association:

```
  pair                 count   PMI
  by + the                15    1.09
  but + the               16    0.39
  as + the                16    0.82
  by + his                 8    2.22
  ten + times              5    7.38
  tied + tongue            4    8.28
```

Notice `but + the` co-occurs 16 times yet scores only 0.39, while
`ten + times` co-occurs just 5 times but scores 7.38. PMI rewards the *surprise*
of seeing two words together, not the raw count.

## A worked example (real numbers)

Running on Shakespeare's 154 sonnets — **17,608 tokens, 3,170 unique words**,
window ±3 — produces **52,533 pair observations** across **34,847 distinct
pairs**. After keeping only pairs seen at least 4 times, **1,641 pairs** remain
to rank. The strongest collocations by PMI:

```
rank  word pair          count    PMI
   1   tied + tongue         4    8.28
   2   again + back          4    8.02
   3   fulfil + will         4    7.51
   4   ten + times           5    7.38
   5   much + too            5    6.58
   6   knows + well          4    6.35
   7   as + fast             7    6.08
   8   lip + of              4    5.98
   9   done + have           4    5.96
  10   or + whether          4    5.89
  ...
  18   mine + own           14    5.43
  20   eye + mine           16    5.32
```

These are recognisable English collocations and fixed phrases — `ten times`,
`much too`, `as fast`, `mine own` — recovered purely from co-occurrence
statistics, with no grammar, no dictionary, and no notion of meaning. That is
the power of PMI: association falls out of counting alone.

## The count threshold (why it is there)

PMI is mathematically biased toward **rare events**. A pair that appears exactly
once, made of two otherwise-rare words, gets an enormous PMI — not because it is
a meaningful collocation but because the denominator `P(x)·P(y)` is tiny. Left
unfiltered, the top of the ranking would be dominated by one-off accidents.

The fix is a blunt but standard one: ignore any pair seen fewer than a minimum
number of times. This implementation uses **`MIN_COOCCURRENCE = 4`** (a clearly
commented constant in `index.js`). Raise it for cleaner, more frequent
collocations; lower it to surface rarer associations at the cost of noise.

## Where it falls short

- **Biased toward rare events.** The count threshold above is a patch, not a
  cure. Variants like *Positive PMI* and *PMI with add-k smoothing* exist
  precisely to tame this bias.
- **Symmetric and direction-free.** PMI says `tied` and `tongue` are associated
  but not that "tied" modifies "tongue", nor which comes first. It carries no
  syntax and no directionality.
- **Window co-occurrence ignores sentence structure.** A flat ±k window treats
  a word three positions away the same whether or not a clause or sentence
  boundary sits between them. Grammar is invisible.
- **It scores pairs, not meaning.** PMI characterises a *relationship between two
  specific words*. It still gives you no representation of a single word's
  overall meaning — you cannot ask "what is this word like?", only "do these two
  go together?".

## Usage

```bash
# Default window of ±3 words
node pmi/index.js corpora/sonnets-shakespeare.txt

# Widen the window to ±5 (looser, more topical associations)
node pmi/index.js corpora/sonnets-shakespeare.txt 5

# Tighten to ±1 (adjacent words only — strict collocations)
node pmi/index.js corpora/sonnets-shakespeare.txt 1

# Compare associations in a different author
node pmi/index.js corpora/sonnets-browning.txt
```

The program prints the corpus statistics, a sample of the pair → {count, PMI}
data structure, the top collocations ranked by PMI, and a small bar chart of the
top 10 scores. Output is fully deterministic.
