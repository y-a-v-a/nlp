# Recurrent Neural Network (char-level)

*Elman 1990 / LSTM 1997 · the workhorse of NLP, ~2010–2016*

The neural language model just before this one had a fatal limitation: it could only
see a *fixed window* of previous words. A recurrent neural network removes that
limit. It reads a sequence one symbol at a time, carrying a **hidden state** that is
updated at every step — a running memory of everything seen so far. In principle, a
prediction can depend on something hundreds of steps back.

This implementation is a **character-level** RNN: it learns to produce text letter
by letter, with no notion of "word" given to it. That it nonetheless learns to spell
word-like sequences and place spaces sensibly is the whole point.

## The idea

At each step the network combines the current input character with its previous
hidden state to produce a new hidden state, then predicts the next character. Before
the formula, one piece of notation: a matrix (`W…`) times a vector just means "mix
the numbers together with learned weights" — a weighted recombination, nothing more
exotic. So the recurrence below reads as *new memory = squash(a mix of the current
input, plus a mix of the previous memory)*:

```
h_t = tanh( Wxh · x_t  +  Whh · h_{t-1}  +  bh )      ← the recurrence
y_t = softmax( Why · h_t + by )                        ← next-char prediction
```

The term `Whh · h_{t-1}` is what makes it recurrent: the past flows into the
present. Training uses **backpropagation through time** (BPTT) — the network is
conceptually unrolled into one layer per character, and gradients flow backward
through every one of those steps, all the way from the last character to the
first. Because repeatedly multiplying through so many steps makes gradients tend
to explode, they are **clipped** — capped at a maximum magnitude before each
update, a blunt but effective safety valve. We update weights with **Adagrad**, a
variant of gradient descent that shrinks the learning rate for parameters that
have already received large updates, so frequently-adjusted weights settle down
while rarely-adjusted ones keep moving.

## What the program builds

The data structure that matters is the **hidden state itself** — a 64-number vector
that changes as the network reads. Watching a few of its units while it reads a
phrase shows the memory at work (values are squashed to the range −1…1 by `tanh`):

```
char │  h0     h1     h2     h3
─────┼───────────────────────────
 s   │ -0.74  -0.18   0.13   0.21
 h   │ -0.62  -0.88  -0.98  -0.98
 a   │ -0.98  -0.99  -0.96  -0.81
 l   │  1.00  -0.78  -1.00  -0.84
...
```

Different units respond to different contexts; together the 64 numbers are the
network's compressed summary of "where am I in the text right now".

## Worked example

Trained on Shakespeare's sonnets (90,380 characters, 28 symbols, 64 hidden units,
5,000 iterations), the average loss per character falls from the uniform-guesser
baseline of `log(28) ≈ 3.33` down to `1.96` — the model is clearly learning:

```
iter     0  smoothed loss/char 3.3322
iter  2000  smoothed loss/char 2.3560
iter  4999  smoothed loss/char 1.9557
```

The generated samples tell the same story. **Before training**, output is uniform
noise:

```
wcabyncmcrsovw abypvdhsxgmiyarctymjtbybnzrgnsqdntjs cyjnoyvvbpgyzijonaelahflwt…
```

**After 5,000 iterations**, it has discovered letters cluster into word-shaped
chunks separated by spaces, and many chunks are real words:

```
bauths and bo pyorney by if lovk if hand ove douglk all at hice thus bite is all
the for ofnoor sid thind t unl dsor houf to gour wastiln cofong dell ay youvost
```

`and`, `by`, `if`, `hand`, `all at`, `thus`, `is all the for`, `to` — none of this
was possible for a character n-gram model of comparable size, because the RNN's
hidden state lets it remember how far into a word it is and what tends to come next.
Everything is seeded, so the run is reproducible.

## Where it falls short

- **Vanishing gradients / short effective memory.** In theory the hidden state can
  remember arbitrarily far back; in practice a *vanilla* RNN forgets quickly, because
  gradients shrink as they propagate backward through many `tanh` steps. The
  **LSTM** (1997) and GRU added gates specifically to fix this — they are the version
  that actually powered 2010s NLP.
- **Strictly sequential.** Step *t* cannot be computed until step *t−1* is done, so
  training cannot be parallelised across the sequence. This is the bottleneck that
  made RNNs slow to train and that the Transformer later removed.
- **One step at a time, one direction.** Compressing the entire past into a single
  fixed-size vector is lossy — the seq2seq "encode a sentence into one vector"
  pattern built on RNNs is exactly what the attention mechanism was invented to
  repair.
- **Small here.** 5,000 iterations on one short corpus gives word-like but not
  fluent text; real char-RNNs train far longer on far more data.

## Usage

```bash
# Defaults: 5000 iterations, 200-character sample
node rnn/index.js corpora/sonnets-shakespeare.txt

# Train longer for cleaner samples
node rnn/index.js corpora/sonnets-shakespeare.txt 12000 300

# Different author
node rnn/index.js corpora/sonnets-browning.txt 5000 200
```

The program prints the setup, a pre-training sample (gibberish), the loss every ~10%
of training, the hidden state evolving over a probe phrase, and a final sample.
