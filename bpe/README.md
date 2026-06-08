# Byte Pair Encoding (BPE)

*1994 (compression) / 2016 (NLP) · Subword Tokenization*

Every model before this point had to pick a unit and live with its limits:
characters are universal but carry no meaning, words carry meaning but explode
into a huge vocabulary with an enormous tail of rare and unseen forms. **Byte
Pair Encoding** refuses to choose. It *learns* its units from the data, building
subword pieces that sit between the two extremes — and in doing so it makes the
"token" of every modern large language model concrete.

## The idea

BPE began life in 1994 as a dead-simple data-compression trick: repeatedly find
the most common adjacent pair of bytes and replace it with a new symbol. In 2016
it was repurposed for NLP tokenization, and it is now the workhorse behind GPT,
BERT, and Claude-style models.

Start by breaking every word into individual characters, with a special marker
`</w>` appended so the algorithm knows where a word ends:

```
"fairest"  ->  f a i r e s t </w>
```

Then repeat a single move, `num-merges` times:

1. Count every adjacent pair of symbols across the whole corpus, weighting each
   word's pairs by how often that word appears.
2. Merge the single most frequent pair into one new symbol, everywhere.
3. Record that merge as an ordered rule and add the new symbol to the vocabulary.

The most common letter pairs fuse first, then those fuse into longer chunks, and
gradually whole common words and word-endings emerge as single tokens. The output
is an **ordered list of merge rules**; applying them in order is exactly how text
gets tokenized at inference time.

## The data structure

The learned model is just that ordered list. Here are the first 20 rules from a
real run on Shakespeare's 154 sonnets (17,608 tokens, 3,170 unique words),
with the frequency that won each merge:

```
 #   pair         ->  new token     (freq)
  1  e </w>       ->  e</w>         (3471)
  2  t h          ->  th           (2824)
  3  t </w>       ->  t</w>        (2133)
  4  s </w>       ->  s</w>        (1920)
  5  d </w>       ->  d</w>        (1551)
  6  y </w>       ->  y</w>        (1405)
  7  i n          ->  in           (1299)
  8  r </w>       ->  r</w>        (1054)
  9  o u          ->  ou            (984)
 10  a n          ->  an            (947)
 11  o </w>       ->  o</w>         (848)
 12  e n          ->  en            (698)
 13  e a          ->  ea            (667)
 14  l </w>       ->  l</w>         (623)
 15  f </w>       ->  f</w>         (558)
 16  o n          ->  on            (539)
 17  an d</w>     ->  and</w>       (530)
 18  e r          ->  er            (525)
 19  th </w>      ->  th</w>        (483)
 20  w h          ->  wh            (482)
```

Notice rule 17: by the time `an` and `d</w>` already exist as units, their
combination `and</w>` — the whole word *and*, the most common word in the corpus —
becomes a single token. Common whole words "fall out" of the process for free.

The starting vocabulary is just 28 symbols (the alphabet plus `</w>`). After 300
merges the vocabulary holds **328 units** — still tiny, yet every one of the 3,170
distinct words can be spelled from them.

## Worked example: the real evolution of "fairest"

This is the actual segmentation our program produces for `fairest` as merges
accumulate — watch the pieces fuse:

```
characters (0 merges)   8 tokens   f a i r e s t </w>
after 50 merges         5 tokens   f a i re st</w>
after 150 merges        4 tokens   fa i re st</w>
after 300 merges        4 tokens   fa i re st</w>
```

By 50 merges the endings `re` and `st</w>` have formed; by 150 the opening `fa`
has fused too, and the word settles at four tokens. Compared with the extremes:

```
character-level : 8   (f a i r e s t </w>)
BPE subword     : 4   (fa i re st</w>)
word-level      : 1   (fairest)
```

BPE lands in between. It is more compact than spelling everything out character by
character, but — crucially, and unlike a fixed word vocabulary — it can still
represent *any* word, including ones never seen in training, by falling back on
smaller pieces all the way down to single characters. The out-of-vocabulary
problem disappears.

## Where it falls short

- **Merges are chosen by frequency, not meaning.** The split `fa · i · re · st</w>`
  is statistically sensible but linguistically arbitrary — the morpheme here is
  *fair* + *-est* (superlative), and BPE recovers neither cleanly. Whether a tidy
  suffix like `est` or `ing` emerges as its own token is an accident of corpus
  frequency, not grammar.
- **The vocabulary is frozen after training.** The merge list is fixed once
  learned. A domain shift (new jargon, a new language, emoji) is handled only by
  shredding the unfamiliar text back into short pieces or single characters.
- **It depends on a pre-tokenization convention.** BPE here runs *inside* words,
  using the shared whitespace/punctuation tokenizer and the `</w>` marker. Change
  that convention — how whitespace, casing, or punctuation are handled — and you
  get different tokens. The units are not canonical.
- **It still carries no semantics.** BPE decides *what the units are*, never *what
  they mean*. `fa`, `re`, and `st</w>` are opaque ID-bearing strings. Turning these
  tokens into meaning is the job of the neural models that come next.

## Usage

```bash
# Default: 300 merges, trace the word "fairest"
node bpe/index.js corpora/sonnets-shakespeare.txt

# Choose the number of merges
node bpe/index.js corpora/sonnets-shakespeare.txt 500

# Choose the number of merges and the word to trace
node bpe/index.js corpora/sonnets-shakespeare.txt 300 beauty

# Watch how a different author's text gets carved up
node bpe/index.js corpora/sonnets-browning.txt 300 portuguese
```

The program prints the learned merge rules and the final vocabulary size (the
**data structure**), then traces how the chosen word's tokenization evolves at 0,
50, 150, and `num-merges` merges, comparing the subword token count against the
character-level and word-level extremes (the **readable result**). Output is fully
deterministic: ties between equally frequent pairs are broken in lexical order.
