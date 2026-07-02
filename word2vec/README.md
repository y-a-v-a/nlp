# Word2Vec

*Mikolov et al., 2013 · Google · learned dense embeddings*

[`../word-vectors/`](../word-vectors/) represents a word as a row of raw
co-occurrence *counts* — one number per context word, most of them zero.
Word2Vec keeps the same underlying idea (the distributional hypothesis: a
word is known by the company it keeps) but changes *how* the vector is
produced. Instead of counting, it **trains a tiny classifier** to predict
context words from a target word, and the by-product of that training — the
classifier's own internal weights — becomes the word's vector. The result is
dense (every dimension is a real number, not a mostly-zero count), small (16
numbers instead of 200), and, as you'll see below, noticeably cleaner. This is
the model that popularized the phrase "word embedding," and the *king − man +
woman ≈ queen* demo that became NLP's most famous party trick.

## The idea

Skip-gram with negative sampling — SGNS, Word2Vec's most common training
mode — turns "predict the context" into a question a simple binary classifier
can answer: **for a given (target, context) pair, is this a real pairing that
actually occurred in the text, or a fake one?**

Every word gets two vectors, initialised as random noise: an "in" vector (used
when the word is the target) and an "out" vector (used when the word is being
predicted as context). For each real `(target, context)` pair pulled from a
sliding window over the corpus:

- Score the pair by the dot product of their vectors, squashed through a
  sigmoid into a 0–1 "probability this pairing is real."
- Push that probability toward **1** for the real pair (gradient descent
  nudges the two vectors closer together).
- Pick a handful of **negative** pairs — the same target word with a few
  random words that did *not* appear nearby — and push their probability
  toward **0** (nudging those vector pairs apart).

```
positive:  target = "heart", context = "sight"    (really co-occurred)   -> push toward 1
negative:  target = "heart", context = "unto"      (paired at random)     -> push toward 0
```

Repeat this millions of times and a word's vector drifts toward wherever the
words it actually keeps company with cluster — without ever building an
explicit count table. "Negative sampling" is the practical trick that makes
this cheap: rather than comparing a target against *every* other word in the
vocabulary at each step (which is what full softmax prediction would cost),
you only ever score it against one real context word and a handful of random
decoys.

## What the program builds

Two `200 × 16` tables of learned numbers — 6,400 parameters total, a fraction
of `word-vectors/`'s `200 × 200` count matrix. A real learned row from
Shakespeare's sonnets, after training:

```
"heart" -> [ -0.138, -0.057, 0.814, 0.544, 0.167, 0.539, ... ]
```

Unlike a count vector, no single dimension here means anything on its own —
"0.814" is not a count of anything. Meaning only exists in the *relationships
between* vectors: which other words' vectors point in a similar direction.

## Worked example: learned neighbours vs. counted neighbours (real output)

Nearest neighbours of **"heart"**, trained by prediction instead of counted
directly, on the same corpus and the same 200-word vocabulary as
`word-vectors/`:

```
word2vec (learned)          word-vectors (counted)
  loves       0.833            love        0.857
  sight       0.770            mind        0.848
  eye         0.688            sight       0.834
  dear        0.688            thoughts    0.818
  thy         0.678            loves       0.810
  thoughts    0.663            and         0.792   <- function word
  let         0.654            is          0.780   <- function word
  might       0.651            hath        0.778
```

Both lists agree on the genuinely meaningful neighbours — `sight`, `loves`,
`thoughts` appear in both. But look at what's *missing* from the learned
list: `and` and `is`. The counting method's biggest weakness (documented in
`word-vectors/`) is that ultra-frequent function words co-occur with
*everything*, so they inflate raw counts and leak into every neighbour list.
Word2Vec's negative-sampling objective doesn't reward raw co-occurrence
frequency the same way — a word only ends up close to "heart" if predicting
it *specifically* from "heart" outperforms predicting a handful of random
alternatives, which "and" and "is" are too generic to do reliably. Learning
the vector, rather than tallying it, is itself a form of the reweighting PMI
does by hand.

## The analogy, honestly

Word2Vec's most famous result is vector arithmetic: `king − man + woman ≈
queen`. Shakespeare's sonnets don't have enough occurrences of "king,"
"queen," "man," or "woman" for that exact analogy — the corpus is 17,608
tokens, not the billions Mikolov trained on. The closest available substitute
is the corpus's most frequent gendered pair, the pronouns:

```
$ node word2vec/index.js corpora/sonnets-shakespeare.txt
Analogy: "he is to his as she is to ___?" (vec(his) - vec(he) + vec(she))
  her          0.724
  new          0.702
  before       0.688
  thus         0.685
  sight        0.668
```

`her` wins, and by a real margin — a genuine, reproducible analogy on 17.5
thousand words of 400-year-old poetry, using this program's defaults (±5-word
window, 80 epochs, seed 1). But it does not survive small, reasonable changes
to those settings. Retraining with everything else identical:

```
window ±3, 40 epochs    ->  loves  (wrong; her unranked in top 3)
window ±3, 60 epochs    ->  loves 0.678, her 0.676   (a near-tie)
window ±3, 80 epochs    ->  my, them, loves           (wrong; her 5th)
window ±5, 60 epochs    ->  her 0.847                 (right, and by more)
window ±5, 80 epochs    ->  her 0.724                 (right — this page's default)
window ±5, 100 epochs   ->  sight, new, true           (wrong; her unranked)
```

Sometimes "her" wins clearly, sometimes it loses outright, and there's no
obvious rule from these six rows for which — a single hyperparameter you
can't tell in advance will matter flips the answer. **The analogy trick is
real on this corpus, but it is not *stable*** — which is exactly why the
famous `king − man + woman ≈ queen` demo needed a corpus a million times
larger to look effortless every time. At web scale this instability
disappears, because there is enough data for the "he/his/she/her" pattern to
be reinforced from thousands of different sentences instead of a few dozen.
Scale doesn't just make the vectors better here; it makes the *result*
reproducible instead of a matter of luck.

## Where it falls short

- **One vector per word, still.** Exactly like `word-vectors/`, "light" the
  noun and "light" the adjective share a single blended vector. Learning the
  vector instead of counting it does nothing to fix polysemy — that needs
  context-sensitive embeddings (contextual representations, the kind
  Transformers produce), not a better training objective for static ones.
- **Fragile on a small corpus.** The analogy result above depends on window
  size in a way it wouldn't at web scale. Every number on this page is
  seeded and reproducible, but a different corpus, window, or dimensionality
  can flip a close analogy.
- **No interpretable dimensions.** A count vector's columns are literal
  context words — you can read a cell and know what it means. A learned
  vector's 16 dimensions are just wherever gradient descent happened to put
  them; no dimension corresponds to anything nameable on its own.
- **Needs many more (target, context) examples than distinct words to
  converge well.** This demo uses 73,812 training pairs to fit 6,400
  parameters — plenty here, but the ratio needed grows with vocabulary and
  dimensionality, which is one reason production Word2Vec models train on
  corpora many orders of magnitude larger than this one.

## Usage

```bash
# Default: 80 epochs, nearest neighbours of "heart", the he/his/she analogy
node word2vec/index.js corpora/sonnets-shakespeare.txt

# More epochs, a different query word
node word2vec/index.js corpora/sonnets-shakespeare.txt 150 love

# Try the contrasting corpus
node word2vec/index.js corpora/sonnets-browning.txt 80 heart
```

The program prints the model size and training-pair count, a sample of the
loss falling over training (the data structure being learned), the nearest
neighbours of the query word by cosine similarity (the readable result), and
the he/his/she analogy.

## Where this leads

A dense, learned vector per word — reached here by predicting neighbours with
a shallow classifier — is exactly the **embedding layer** sitting at the
input of every neural network from this point in the journey onward,
including [`../rnn/`](../rnn/) and [`../attention/`](../attention/). Word2Vec
didn't just produce better word vectors; it normalized the idea that the
*first thing* any neural language model does is look up a learned vector for
each token. Everything after this page assumes that step has already
happened.

(c) 2025 Vincent Bruijn <vebruijn@gmail.com>
