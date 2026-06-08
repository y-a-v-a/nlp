# The NLP Journey

A working museum of natural language processing. Each subdirectory is a small,
self-contained, dependency-free implementation of a technique that mattered in the
history of NLP — arranged in rough historical order so you can read the whole arc,
from Markov chains in the 1940s to the ideas behind today's frontier models, and
run every step yourself.

The long-term goal is an **educational platform**: the go-to source for
understanding *how we got here* in NLP, with runnable example code at every stage.

**Browse the site:** open [`index.html`](./index.html) in a browser — a timeline of
every technique, grouped by era, each linking to a self-contained explainer with a
real-data visual. (Regenerate the homepage and cross-page nav with
`node scripts/build-site.js` after adding a technique.)

- **[`OVERVIEW.md`](./OVERVIEW.md)** — the narrative. The full story of the field,
  why each technique arose, and the limitation that drove the next one. Start here.
- **[`TASKS.md`](./TASKS.md)** — the build plan. The phased backlog that turns this
  repository into the platform described above.

---

## How each technique is documented

Every technique ships the same three artifacts — the "trinity":

| Artifact | Purpose |
|----------|---------|
| `index.js` | A runnable, heavily commented Node.js script. Prints the data structure it builds **and** a human-readable result. Zero dependencies. |
| `README.md` | A deep dive: the concept, the data structure, a worked example, and why the technique was eventually superseded. |
| `index.html` | A self-contained single-page explainer, openable directly in a browser. Follows the design convention in [`CLAUDE.md`](./CLAUDE.md). |

Shared, dependency-free helpers live in **`lib/`** (currently `lib/tokenize.js`, the
one canonical tokenizer used by every demo so that differences in output come from
the algorithm, not from inconsistent preprocessing).

---

## Directory structure

```
corpora/                     Source texts (see below)
lib/                         Shared zero-dependency helpers (tokenizer, …)

# Text generation — Markov chains (1940s–60s)
markov/                      Simple word-to-word Markov chain
ngram-markov/                N-gram (multi-word context) Markov chain
probability-markov/          Weighted next-word selection by probability
ngram-probability-markov/    N-gram context + probability selection

# Statistical NLP
zipf/                        Zipf's law — the shape of word frequencies (1935–49)
edit-distance/               Levenshtein distance + spell-checker (1965)
tfidf/                       TF-IDF document search, bag-of-words retrieval (1970s–80s)
pmi/                         Pointwise mutual information collocations (1990)
naive-bayes/                 Supervised author classifier, Shakespeare vs Browning (1990s)
word-vectors/                Co-occurrence vectors + cosine similarity (early 1990s)
bpe/                         Byte-pair encoding subword tokenizer (1994/2016)

# Neural era — learning representations
neural-lm/                   Feedforward neural language model, Bengio (2003)
rnn/                         Char-level recurrent network with memory (1990/1997)
attention/                   Scaled dot-product self-attention (2014–17)

# Modern era
rag/                         Retrieval-augmented generation, TF-IDF + generator (2020→)
modern/                      Concept explainers (no code): Transformer → agents (2017→)
```

The runnable content now spans Markov chains (1913) to the attention mechanism
(2017), plus a buildable RAG demo. The `modern/` directory holds concept-only
explainers for the frontier era — the Transformer, pretraining, scaling laws,
alignment, reasoning, and agents — which are defined by scale beyond a laptop. The
remaining work is the **website layer** (a homepage timeline and navigation tying
the explainers together). See [`OVERVIEW.md`](./OVERVIEW.md) and
[`TASKS.md`](./TASKS.md).

## Corpora

- `corpora/sonnets-shakespeare.txt` — Shakespeare's 154 sonnets.
- `corpora/sonnets-browning.txt` — Elizabeth Barrett Browning's *Sonnets from the
  Portuguese* (44 sonnets). A stylistic contrast to Shakespeare, useful for the
  classification and retrieval techniques on the roadmap.

Both are public domain (via Project Gutenberg) and share the same format: a short
title header followed by 14-line sonnets separated by blank lines.

---

## Usage

Every implementation is a standalone Node.js script. Run from the repository root:

```bash
# Simple Markov chain
node markov/index.js corpora/sonnets-shakespeare.txt [output-length]

# N-gram Markov chain
node ngram-markov/index.js corpora/sonnets-shakespeare.txt [ngram-size] [output-length]

# Probability-based Markov chain
node probability-markov/index.js corpora/sonnets-shakespeare.txt [output-length]

# N-gram probability-based Markov chain
node ngram-probability-markov/index.js corpora/sonnets-shakespeare.txt [context-size] [output-length]

# TF-IDF document search
node tfidf/index.js corpora/sonnets-shakespeare.txt [query]
```

Swap in `corpora/sonnets-browning.txt` to see any technique behave on a different
author. See each implementation's `README.md` for detailed explanations and
examples.

---

## Contributing a new technique

The short version: add a directory with the full trinity (`index.js`, `README.md`,
`index.html`), reuse `lib/` rather than re-implementing preprocessing, add an entry
to `OVERVIEW.md`, and tick it off in `TASKS.md`. The conventions — including the
HTML explainer design system — are documented in [`CLAUDE.md`](./CLAUDE.md).
