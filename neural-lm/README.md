# Neural Language Model

*Yoshua Bengio et al., 2003 · the first useful neural net for language*

Every technique before this one *counts* things — frequencies, co-occurrences,
probabilities — and looks them up. This is the first that **learns**. Bengio and
colleagues showed in 2003 that a small feedforward neural network, trained to
predict the next word from the previous few, could beat n-gram language models. The
architecture is now obsolete, but the idea it introduced — *learn the
representations from data instead of hand-counting statistics* — is the foundation
of everything that followed.

## The idea

A plain Markov/n-gram model treats every word as an atomic symbol: "king" and
"queen" are as unrelated as "king" and "the". A neural LM instead gives each word a
dense **embedding** — a short vector of real numbers — and learns those vectors
while learning to predict. Words used in similar contexts drift toward similar
vectors, so the model can generalise: having seen "a warm summer day" it can give
reasonable probability to "a warm winter day" even if that exact trigram never
occurred.

The network here is a miniature of Bengio's: predict word *t* from words
*(t-2, t-1)*.

```
context word ids ──► embedding lookup (24 dims each)
                     │
        concatenate ─┤ 48 numbers
                     ▼
              tanh hidden layer (48 units)
                     ▼
              softmax over the 200-word vocabulary  ──►  P(next word)
```

It is trained by **backpropagation** and stochastic gradient descent: run the
forward pass, measure the cross-entropy loss against the true next word, push the
error backwards through every weight (including the embeddings), and nudge them all
to make the correct word slightly more likely next time.

## What the program builds

The data structure is the set of learned weights — most interestingly the
**embedding matrix**, one row per word, discovered entirely from the prediction task:

```
Learned embedding (first 6 of 24 dims):
  love     [  0.15   0.74  -0.20   0.84  -0.51  -0.89 … ]
  thou     [ -1.46  -0.13  -0.10   0.88   0.51   0.90 … ]
  beauty   [  0.45   0.37   0.41   0.38   0.13   0.67 … ]
```

## Worked example

Running on Shakespeare's sonnets (200-word vocabulary, 4,353 training trigrams,
16,952 trainable values), the loss falls steadily — the network is learning:

```
epoch  1/15  avg loss 4.9004   perplexity 134.3
epoch  5/15  avg loss 4.1060   perplexity  60.7
epoch 10/15  avg loss 3.5735   perplexity  35.6
epoch 15/15  avg loss 3.1249   perplexity  22.8
```

Perplexity — roughly "how many words the model is choosing between on average" —
drops from 134 to 23. Two honest caveats about that number: it is *training*
perplexity (the model is being graded on trigrams it trains on), and it only
covers the 200-word vocabulary. Graded like every other model in this
repository — on held-out sonnets, over the full vocabulary — the number is far
larger (see the homepage scoreboard, computed by `scripts/perplexity.js`); the
gap between those two gradings is the entire reason held-out evaluation
exists. The learned embeddings cluster related words without ever being told
they are related:

```
thou  →  hath, thyself, therefore, gentle
my    →  thy, his, whose, times
```

And sampling from the trained model produces text with a looser, more semantic
coherence than a pure Markov chain (which can only stitch together word pairs it has
literally seen):

```
my love and it no eyes not not to your fair eyes so if thy sweet self dost
dear the hand but in the eyes to all my best is no more can beauty shall live
```

Everything is seeded, so the loss curve and outputs are reproducible run to run.

## Where it falls short

- **Fixed, tiny context.** It still only sees the previous *two* words — the same
  fixed-window limitation as an n-gram model. Long-range dependencies are invisible.
  (Recurrent networks, next, were the first attempt to fix this.)
- **Slow and small.** Pure-JS training caps us at a 200-word vocabulary and a few
  thousand examples. Real neural LMs need far more data and compute; the sonnets are
  too small a corpus to learn rich embeddings.
- **The softmax is the bottleneck.** Computing a probability over the whole
  vocabulary every step is the expensive part — a problem later work (hierarchical
  softmax, negative sampling in Word2Vec) was invented to dodge.
- **No memory.** Each prediction is independent; the network has no notion of the
  sentence so far beyond the two-word window.

## Usage

```bash
# Defaults: 15 epochs, generate 40 words
node neural-lm/index.js corpora/sonnets-shakespeare.txt

# More epochs and a longer sample
node neural-lm/index.js corpora/sonnets-shakespeare.txt 25 60

# Try the other author
node neural-lm/index.js corpora/sonnets-browning.txt 15 40
```

The program prints the network setup, the per-epoch loss and perplexity, a slice of
the learned embeddings, nearest-neighbour words in embedding space, and a generated
sample.
