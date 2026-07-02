# Entropy & the Guessing Game

*Claude Shannon, 1948 / 1951 · information theory*

The homepage dates the Markov family "1948" without ever naming why: that year
Claude Shannon published *A Mathematical Theory of Communication*, the paper
that invented the vocabulary this whole repository has been using without
credit — **entropy** as a measure of uncertainty, and **n-gram modelling** as a
way to reduce it. Three years later, in *Prediction and Entropy of Printed
English* (1951), Shannon turned the idea into a party trick: cover a line of
text, guess the next letter, and use how many guesses it takes to estimate how
predictable English actually is. This page rebuilds both the number and the
game, on the sonnets.

## The idea

**Entropy** measures the average number of yes/no questions (bits) it takes to
pin down a value drawn from some distribution. A coin flip is 1 bit of entropy
— you need exactly one well-chosen question ("heads?") to resolve it. A fair
six-sided die is `log2(6) ≈ 2.58` bits. The formula, for any distribution over
outcomes with probabilities `p`:

```
H  =  − Σ  p(x) · log2( p(x) )
```

Rare outcomes contribute more surprise per occurrence (`log2` of a small
number is a large negative number), but they happen less often (small `p`), so
the two effects trade off. **Entropy is the expected surprise** — average how
surprised you'd be, weighted by how often each outcome actually happens.

Applied to English, entropy answers a concrete question: *if you had to guess
the next letter of a piece of English text, how many bits of uncertainty are
you actually facing?* And the answer changes depending on how much of the
preceding text you're allowed to look at:

- **Zero-order entropy** uses only the overall frequency of each letter — how
  often "e" or "z" show up across the whole corpus, ignoring position
  entirely. This is the *most* uncertain a well-informed guesser could be.
- **Conditional (first-order) entropy** uses the *one preceding character* —
  after "q", the next letter is almost always "u"; after a space, almost
  anything is possible. Context narrows the distribution, and a narrower
  distribution has lower entropy.

```
H(X | context)  =  Σ  p(context) · H(X | that one context)
```

This is exactly the assumption a bigram Markov chain makes — the next symbol
depends only on the one before it — restated as an amount of *uncertainty*
rather than a lookup table. Every extra character of context a Markov chain
is given is, quite literally, entropy being spent to buy certainty.

## What the program builds

The data structure is a set of context &rarr; next-character frequency tables,
one per context length ("order"), built the same way a Markov chain's
transition table is built — just measured in bits instead of used for
generation. Real numbers from Shakespeare's sonnets (90,380 characters, 27-symbol
alphabet: `a`–`z` plus space):

```
order 0 (no context)        H = 4.071 bits/char   2^H = 16.8 effective choices
order 1 (previous char)     H = 3.263 bits/char   2^H = 9.6 effective choices   (28 contexts seen)
order 2 (previous 2 chars)  H = 2.556 bits/char   2^H = 5.9 effective choices   (430 contexts seen)

Ceiling with no model at all: log2(27) = 4.755 bits/char — a uniform guess over the whole alphabet.
```

`2^H` is worth pausing on: it converts entropy back into an intuitive
**"effective number of choices"** — Shannon's own move, and the reason
`neural-lm/` reports **perplexity** rather than raw loss. A 4.071-bit
zero-order model is, in effect, choosing among 16.8 equally-likely letters at
every position; a first-order model narrows that to 9.6. Perplexity is just
entropy translated into "how many options does this model feel like it's
choosing from" — the exact same number `neural-lm/`'s loss-to-perplexity
conversion produces, at the word level instead of the character level.

Going from no context to one character of context recovers 0.808 bits; a
second character of context recovers another 0.706. Diminishing, but real —
and exactly the shape of the fidelity-vs-generativity tradeoff the whole
Markov family lives inside: more context, less uncertainty, less room for the
model to say anything you didn't already write.

## The guessing game (real output)

Shannon's original experiment: cover a line of text, and at each position ask
a human to guess the letter, ranking their guesses by likelihood, and record
*how many guesses it took*. Here the "human" is replaced by a perfect
frequency-ranked guesser (rank the possible next characters by how often they
followed this context in the sonnets, and see where the real letter lands),
run on the line **"shall i compare thee to a summers day"**:

```
order 0 (no context, overall letter frequency):
  shall·i·compare·thee·to·a·summers·day
  462771+1+85+2931+6331+81214+553941+2+

order 1 (previous character):
  hall·i·compare·thee·to·a·summers·day
  111122131111211112211224352123323614

Average guesses needed — order 0: 5.81, order 1: 1.97.
```

(`·` stands in for a space; `+` means the guess needed more than 9 tries.)
With zero context, letters like the "c" opening "compare" or the "s" opening
"summers" take dozens of guesses — nothing constrains them. With one letter of
context, most positions resolve in 1–2 guesses: after "s" in "shall", "h" is
overwhelmingly likely; after "q" anywhere in English, "u" would be a near
certainty. Knowing just the single previous letter cuts the average number of
guesses on this line by **66%** — a hands-on, countable demonstration of
"context reduces uncertainty," the exact intuition every Markov chain in this
repository is built on.

## Where it falls short

- **Entropy estimated from finite text is optimistic.** The order-2 table above
  is built from only 430 distinct two-character contexts drawn from 90,380
  characters — some of those contexts were seen only once or twice, so their
  measured "uncertainty" is artificially low. Real information-theoretic
  estimates of English entropy (Shannon's own, and later corrections) correct
  for this; this demo does not, so treat the order-2 number as a lower bound,
  not a precise measurement.
- **Character entropy isn't word entropy isn't meaning.** Bits per character
  tell you how compressible the *symbol stream* is, not whether the text makes
  sense. A model can have excellent (low) entropy while generating grammatical
  nonsense — entropy measures predictability, not truth or coherence.
  "Prediction = compression = understanding?" is a real open question, not one
  this page answers.
- **The guessing game used a perfect frequency table, not a human.** Shannon's
  original 1951 experiment used real human guessers and derived formal upper
  and lower entropy bounds from the distribution of their guess-ranks. This
  demo substitutes an exhaustive frequency count for the human, which is
  simpler to build and to reproduce, but it isn't the same estimator, and its
  numbers will differ from Shannon's own.

Entropy is a **ceiling**, not a technique — it tells you how much uncertainty
a perfect model of the data could not remove, but it does not build that
model. The Markov family that follows is one concrete way to spend context on
buying some of that uncertainty back; `neural-lm/`'s perplexity number is the
same idea applied to a learned model instead of a frequency table.

## Usage

```bash
# Default: analyse the corpus, run the guessing game on the default line
node entropy/index.js corpora/sonnets-shakespeare.txt

# Try your own line from (or near) the corpus
node entropy/index.js corpora/sonnets-shakespeare.txt "when in disgrace with fortune and mens eyes"

# Try the contrasting corpus
node entropy/index.js corpora/sonnets-browning.txt "how do i love thee let me count the ways"
```

The program prints the zero/first/second-order character entropy of the whole
corpus (the data structure), then the guessing game annotated letter-by-letter
on one line (the readable result), with the average number of guesses at each
context length.

(c) 2025 Vincent Bruijn <vebruijn@gmail.com>
