# Count-Based Word Vectors

*early 1990s · distributional semantics*

PMI asked whether two words keep each other company. Word vectors take that idea
all the way: represent **every** word as the full profile of the company it
keeps, then measure how similar two words are by comparing their profiles. This
is the first technique in the series where a single word becomes a point in a
geometric space — and where "meaning" becomes something you can *measure* with a
distance.

## The idea

The foundation is the **distributional hypothesis**, stated by the linguist John
Firth in 1957:

> You shall know a word by the company it keeps.

Words that appear in similar contexts tend to mean similar things. "heart" and
"mind" turn up beside the same neighbours — `love`, `thy`, `is`, `and` — so even
without a dictionary we can infer they are related, purely from co-occurrence
statistics.

To make this operational, slide a symmetric window across the text and, for each
target word, count how often every other word falls inside that window. Each word
becomes a **vector**: a long list of co-occurrence counts, one number per context
word. Two words are similar when their vectors point in the same direction. The
standard way to measure that is **cosine similarity** — the cosine of the angle
between two vectors, which ignores their lengths and looks only at direction:

```
cos(a, b)  =  (a · b) / (|a| · |b|)
```

A cosine of 1 means the two vectors point exactly the same way (identical
context profiles); 0 means they are orthogonal (no shared context). Using the
angle rather than raw distance is what lets a rare word and a common word still
count as "similar" if they keep the same kind of company.

## What the program builds

The vocabulary is the **top 200 most frequent words**. Those same 200 words serve
two roles at once: they are the target words we vectorise, *and* they are the 200
context dimensions of every vector. With a ±3-word window, each word becomes a
200-dimensional vector of co-occurrence counts.

The data structure is that co-occurrence matrix. Here is a real slice from
Shakespeare's sonnets — rows are target words, columns are context words, and
each cell is "how often the column word appears within ±3 of the row word":

```
              my    thy   love  sweet     is     in
───────────────────────────────────────────────────
love          56     25     14      6     21     19
beauty         4     17      1      2      3      2
eyes           6      8      5      1      1      6
heart         28     13      2      0      4      9
time           3      3      3      0      3      4
```

Read across a row and you have that word's (partial) vector. `love` and `heart`
both lean heavily on `my` (56 and 28) and `thy` (25 and 13); `time` keeps very
different company. Cosine similarity turns those row-shapes into a single number.

## Worked example

Asking for the nearest neighbours of **"heart"** (the default query) gives, from a
real run on the sonnets:

```
Nearest neighbours of "heart" by cosine similarity:
────────────────────────────────────────
  love         0.857  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇
  mind         0.848  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇
  sight        0.834  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇
  thoughts     0.818  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇
  loves        0.810  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇
  and          0.792  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇
  is           0.780  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇
  hath         0.778  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇
```

The top of that list is genuinely meaningful: `mind`, `sight`, and `thoughts` are
the other inner faculties Shakespeare pairs with the heart. But notice `and` and
`is` creeping in — that is the method's weakness showing through (see below).

The contrast the program reports makes the geometry concrete:

```
  cos("heart", "mind")  = 0.848   (intuitively related)
  cos("heart", "time")  = 0.583   (less related)
```

"heart" and "mind" sit much closer in the 200-dimensional space (0.848) than
"heart" and "time" (0.583), exactly as intuition predicts — and nothing about
that comparison required a dictionary, a grammar, or any human-supplied labels.
Only counts.

## Where it falls short

- **High-dimensional and sparse.** Each vector has one dimension per vocabulary
  word, and most cells are zero — most word pairs simply never co-occur. The
  representation is wasteful and grows with the vocabulary.
- **Raw counts are dominated by frequent words.** There is no PMI weighting here:
  `and`, `is`, and `the` co-occur with *everything*, so they inflate the dot
  product and push generic function words into the neighbour lists. Query "beauty"
  or "eyes" and you mostly get `in`, `with`, `and`, `thy` — noise, not synonyms.
  The companion [`../pmi/`](../pmi/) subproject is exactly the fix: weight each
  co-occurrence by how surprising it is. Here we vectorise the raw counts; PMI
  would re-weight them first.
- **Fixed vocabulary.** Only the top 200 words get vectors. Every rare word — and
  the rare words carry most of the distinguishing signal — is invisible, with no
  vector at all.
- **One vector per word, so polysemy is unresolved.** "bank" (river) and "bank"
  (money) are the same token and collapse into a single blended vector that is the
  average of both senses and faithful to neither.
- **A small corpus gives noisy estimates.** The sonnets are ~17,600 tokens; many
  co-occurrence counts are 0, 1, or 2, so a single coincidence can swing a cosine
  score. Distributional methods only stabilise on large corpora.

## Usage

```bash
# Nearest neighbours of "heart" (default query) in Shakespeare's sonnets
node word-vectors/index.js corpora/sonnets-shakespeare.txt

# Pick a different query word (must be among the top 200 words)
node word-vectors/index.js corpora/sonnets-shakespeare.txt love

# Compare the space learned from a different author
node word-vectors/index.js corpora/sonnets-browning.txt heart
```

The program prints the corpus stats, a slice of the co-occurrence matrix (the
data structure), the nearest-neighbour list for the query word with cosine
scores and a bar chart, and the related-vs-unrelated contrast.

## Where this leads

This count-based, distributional approach is the direct ancestor of modern word
embeddings. One intermediate step, skipped here but worth naming: **Latent
Semantic Analysis** (Deerwester et al., 1990) compresses a matrix exactly like
this one with a technique called SVD, folding 200 sparse count-columns down
into a few dozen dense dimensions — the first hint that a word's meaning could
live in a *small* vector rather than a long row of counts. The next move,
implemented in [`../word2vec/`](../word2vec/), is to stop *counting* contexts
and start *predicting* them: train a small network to guess a word from its
neighbours, and the weights it learns become dense, low-dimensional vectors —
**Word2Vec** (2013) and **GloVe**. Those in turn became the embedding layers
sitting at the input of every modern language model. The distributional
hypothesis, made operational here with
nothing but counts and a cosine, never went away — it just got better vectors.
