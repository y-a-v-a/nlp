# Levenshtein Edit Distance

*Vladimir Levenshtein, 1965 · string algorithms*

Every technique before this one treated the **word** as the smallest unit. Edit
distance is the first to drop below it and work on **characters** — measuring how
similar two strings are by how much editing it takes to turn one into the other.
That makes it the natural foundation for a spell-checker.

## The idea

The **Levenshtein distance** between two strings is the minimum number of
single-character edits — **insertions**, **deletions**, and **substitutions** —
needed to transform one into the other. For example:

```
loue → love   distance 1   (substitute u → v)
beautie → beauty   distance 2   (substitute i → y, delete e)
kitten → sitting   distance 3   (k→s, e→i, insert g)
```

Counting edits by hand is error-prone, and trying every possible sequence of
edits is exponential. The trick — the reason this is a landmark algorithm — is
**dynamic programming**: build the answer up from the answers to smaller
sub-problems and reuse them.

## The data structure: a DP matrix

We fill an `(m+1) × (n+1)` grid where `matrix[i][j]` is the edit distance between
the first `i` characters of the source and the first `j` characters of the
target. The first row and column are the base cases — turning a prefix into the
empty string costs one deletion per character; building it from nothing costs one
insertion per character.

Every other cell is the cheapest of three moves into it:

```
matrix[i][j] = min(
  matrix[i-1][j]   + 1,                 // delete a character from the source
  matrix[i][j-1]   + 1,                 // insert a character into the source
  matrix[i-1][j-1] + (chars differ?1:0) // substitute (or copy if equal, free)
)
```

The answer to the whole problem ends up in the bottom-right cell. Here is the
real matrix the program prints for `loue → love`:

```
       l   o   v   e
   0   1   2   3   4
l  1   0   1   2   3
o  2   1   0   1   2
u  3   2   1   1   2
e  4   3   2   2   1
```

Read the diagonal: `l`, `o` match (cost stays 0), `u` vs `v` differ (one
substitution, cost climbs to 1), `e` matches again (stays 1). The bottom-right
cell, **1**, is the distance. Trace the cheapest path back from that corner and
you recover the actual alignment of the two words.

(The demo on the project's `index.html` page shows the same matrix for `loue →
love` instead of `loue → lose` — both are genuine, both cost exactly 1 edit;
`lose` is simply the alphabetically-first of the three real words that sit at
distance 1 from `loue`, which is what the program below reports by default.)

## Worked example (real output)

Running the demo over Shakespeare's sonnets:

```
$ node edit-distance/index.js corpora/sonnets-shakespeare.txt
Corpus vocabulary: 3170 unique words (17608 tokens).
Input word: "loue"

Dynamic-programming matrix for "loue" → "lose" (closest word, distance 1):
...
Closest words to "loue" in the vocabulary:

  distance  word
  ──────────────────────
         1  lose
         1  loud
         1  love
         2  alone
         2  bore
         2  cloud
```

The misspelling `loue` sits **one edit** away from three real words at once:
`lose`, `loud`, and `love`. Edit distance alone cannot pick between them — they
are equidistant — which is exactly why real spell-checkers add a second signal
(word frequency, a language model) on top of distance to break such ties. The
program reports the first alphabetically, `lose`, as the single closest word and
prints its matrix; the intended `love` is in the same distance-1 tier.

Try a different misspelling and the tiers shift accordingly:

```
$ node edit-distance/index.js corpora/sonnets-shakespeare.txt beautie
...
Closest words to "beautie" in the vocabulary:

  distance  word
  ──────────────────────
         1  beauties
         2  beauty
         2  beautys
         3  beast
```

Here `beautie` is one deletion from `beauties` and two edits from the modern
`beauty`. Note that `beautys` also appears at distance 2 — the tokenizer strips
the apostrophe from `beauty's`, so possessives survive as their own forms in the
vocabulary.

## Where it falls short

- **It only sees surface form, never meaning.** `car` and `automobile` are
  synonyms but sit eight edits apart, while `cat` and `cot` are one edit apart
  yet completely unrelated. Distance on letters is a poor proxy for distance in
  meaning — the central limitation that distributional and embedding methods
  later exist to fix.
- **It is O(m × n) per comparison.** Filling the matrix costs the product of the
  two lengths. To spell-check one word against a 3,170-word vocabulary we run it
  3,170 times; over a real dictionary of hundreds of thousands of words a naive
  scan is far too slow, and production systems reach for tries, BK-trees, or
  finite-state automata instead.
- **All edits cost the same.** Substituting `u→v` (adjacent on neither layout
  but a classic OCR/early-modern confusion) costs exactly as much as `u→z`.
  Real applications weight edits — by keyboard adjacency, phonetic similarity, or
  observed typo frequencies — which plain Levenshtein cannot express.

## Usage

```bash
# Default: spell-check the misspelling "loue" against the sonnet vocabulary
node edit-distance/index.js corpora/sonnets-shakespeare.txt

# Supply your own (mis)spelled word
node edit-distance/index.js corpora/sonnets-shakespeare.txt beautie

# Works on any corpus
node edit-distance/index.js corpora/sonnets-browning.txt thes
```

The program prints the corpus vocabulary size, the full DP matrix for the input
word against its closest vocabulary match (the data structure), and a ranked list
of the ten nearest words by edit distance (the spell-checker result).
