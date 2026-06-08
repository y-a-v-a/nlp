# Naive Bayes Text Classification

*1990s · Supervised Learning*

Every technique before this one was **unsupervised** — count words, rank them,
weight them, generate from them, all without ever being told an answer. Naive
Bayes is the turn toward **supervised learning**: we now hand the algorithm
*labeled* examples ("this sonnet is by Shakespeare, that one is by Browning")
and ask it to learn the difference. This is the same machinery that powered the
first practical spam filters in the 1990s.

## The idea

Bayes' theorem lets us flip a question we cannot answer directly — *what is the
probability this document belongs to class C?* — into one we can estimate from
counts: *how likely is this document's wording under each class?* For
classification we only need the part that varies between classes, so:

```
P(class | document)  ∝  P(class) · ∏ P(word | class)
```

- **P(class)** is the *prior* — how common the class is in the training data.
- **P(word | class)** is the *likelihood* — how often that word shows up in
  documents of that class. The product runs over every word in the document
  (counted with multiplicity, hence *multinomial*).

We compute the right-hand side for each class and pick the larger one.

### Why "naive"

The `∏` quietly assumes every word is **independent of every other word given
the class**. That is plainly false — "summer" and "day" co-occur, "thou" and
"art" travel together — but pretending otherwise makes the math a simple product
of per-word probabilities. The assumption is wrong yet the classifier works
surprisingly well, because for *picking the winning class* the errors tend to
wash out.

### Smoothing

If a word never appeared in class C's training data, its raw `P(word | class)`
would be zero, and a single such word would zero out the whole product. **Laplace
(add-1) smoothing** fixes this by pretending every word in the vocabulary was
seen one extra time:

```
P(word | class) = (count(word, class) + 1) / (totalWords(class) + V)
```

where `V` is the shared vocabulary size. We also do all arithmetic in **log
space** (sums of logs instead of a long product) to avoid floating-point
underflow on documents with dozens of words.

## What the program builds

The model is two count tables — one per class — turned into smoothed
probabilities. The most useful view is the **log-likelihood ratio** of a word
between the two classes, `log P(word|A) − log P(word|B)`: large and positive
means the word is a strong vote for class A, large and negative a strong vote
for class B. These are the real top words from a training run (every 5th sonnet
held out, V = 3,330 shared vocabulary):

```
Most Shakespeare-indicative          Most Browning-indicative
  word     P(w|Sh)   P(w|Br)  logLR    word      P(w|Br)   P(w|Sh)  logLR
  your    4.39e-3   1.33e-4  +3.49     drop     1.33e-3   5.70e-5  -3.15
  you     5.24e-3   2.67e-4  +2.98     its      1.20e-3   5.70e-5  -3.05
  beauty  2.57e-3   1.33e-4  +2.96     between  1.07e-3   5.70e-5  -2.93
  doth    3.99e-3   2.67e-4  +2.71     beloved  1.60e-3   1.14e-4  -2.64
  eye     1.94e-3   1.33e-4  +2.68     angels   9.33e-4   5.70e-5  -2.79
```

Notice the model learns *stylistic fingerprints*, not topic: Shakespeare's
direct-address "you/your" and the archaic "doth" versus Browning's "its",
"between", and her signature "Beloved". A genuinely shared word like `love`
sits near zero (`logLR ≈ −0.13`) — both poets use it constantly, so it carries
almost no discriminating power.

## A worked example

We split each corpus deterministically — **hold out every 5th sonnet** of each
class, train on the rest. That gives a training set of **160 sonnets** (124
Shakespeare + 36 Browning) and a held-out test set of **38 sonnets** (30 + 8).
No randomness, so these numbers reproduce exactly.

Classifying the 38 held-out sonnets:

```
Accuracy on held-out set: 36/38 = 94.7%
```

Only two sonnets are missed, both Browning poems short on her tell-tale words.
For one correctly classified test sonnet — *"Those hours, that with gentle work
did frame"* (true class Shakespeare) — the running decision looks like this:

```
log P(Shakespeare) prior  = -0.255      log P(Browning) prior  = -1.492
log score Shakespeare     = -610.14     log score Browning     = -659.90
⇒ predicted: Shakespeare  (log-odds margin 49.76)

Words that pushed hardest toward Shakespeare:
  beauty  ×2   +5.915
  doth    ×2   +5.413
  every   ×2   +3.353
  eye     ×1   +2.677
```

The prior already tilts toward Shakespeare (he has far more training sonnets),
and then content words like "beauty" and "doth" pile on a 49.76 log-odds
margin. Each word contributes `count × (log P(word|winner) − log P(word|loser))`,
so a single archaic word seen twice can be worth more than five neutral ones.

## Where it falls short

- **The independence assumption is false.** Words are correlated ("summer day",
  "thou art"), so the classifier double-counts evidence. It still picks the
  right class often, but its probability estimates are badly overconfident.
- **Bag of words discards order.** "love is not beauty" and "beauty is not love"
  produce identical scores. All syntax and negation are invisible.
- **It needs labeled data.** Unlike every earlier technique here, Naive Bayes
  cannot start cold — someone must label the training documents first. That
  human cost is the price of the jump to supervised learning.
- **It is sensitive to class imbalance.** With 154 Shakespeare sonnets to 44
  Browning, the prior leans heavily toward Shakespeare; both of our errors are
  Browning poems misread as Shakespeare.
- **The smoothing choice matters.** Add-1 is a blunt instrument; the constant
  silently sets how much an unseen word costs, and on a small vocabulary it can
  swamp the real signal.
- **Frequent function words can dominate.** Without care, ubiquitous words pile
  up tiny contributions that drown out the rare, genuinely indicative terms —
  the very problem TF-IDF was built to address.

## Usage

```bash
# Train on two corpora (the two classes) and report held-out accuracy
node naive-bayes/index.js corpora/sonnets-shakespeare.txt corpora/sonnets-browning.txt
```

### Parameters

- `<corpusA>` `<corpusB>` (both required): paths to the two class corpora. Each
  file is split into sonnet "documents" by blank lines; the document's class is
  the corpus it came from.

The program prints the train/test split, the most indicative words per class
with their `P(word | class)` values, a per-sonnet prediction table with overall
accuracy, and a word-by-word walkthrough of one decision.
