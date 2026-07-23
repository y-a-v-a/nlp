# The NLP Journey

A working museum of natural language processing available at [nlp.vincentbruijn.nl](https://nlp.vincentbruijn.nl). Each subdirectory is a small,
self-contained, dependency-free implementation of a technique that mattered in the
history of NLP — arranged in rough historical order so you can read the whole arc,
from Markov chains in the 1940s to the ideas behind today's frontier models, and
run every step yourself.

The long-term goal is an **educational platform**: the go-to source for
understanding *how we got here* in NLP, with runnable example code at every stage.

**Browse the site:** open [`index.html`](./index.html) in a browser — a timeline of
every technique, grouped by era, each linking to a self-contained explainer with a
real-data visual. (Regenerate the homepage and cross-page nav with
`node scripts/build-site.js` after adding a technique.) The homepage ends with a
**scoreboard**: held-out perplexity for every generative model in the repo,
computed by `scripts/perplexity.js`. A [glossary & references
page](./glossary/index.html) defines the recurring terms and lists the papers
behind every stop. Every corpus-based in-browser demo has a **"Your own text…"**
option — paste (or load) up to ~50,000 words and watch each technique work on
your own writing; nothing leaves the browser.

- **[`OVERVIEW.md`](./OVERVIEW.md)** — the narrative. The full story of the field,
  why each technique arose, and the limitation that drove the next one. Start here.
- **[`TASKS.md`](./TASKS.md)** — the build plan. The phased backlog that turns this
  repository into the platform described above.
- **[`PLAN.md`](./PLAN.md)** — review follow-ups. Corrections, missing techniques
  (ELIZA, Word2Vec, Shannon entropy, HMM tagger, seq2seq), and educational
  upgrades from the July 2026 content review, plus the house tone-of-voice guide.

---

## How each technique is documented

Every technique ships the same three artifacts — the "trinity":

| Artifact | Purpose |
|----------|---------|
| `index.js` | A runnable, heavily commented Node.js script. Prints the data structure it builds **and** a human-readable result. Zero dependencies. |
| `README.md` | A deep dive: the concept, the data structure, a worked example, and why the technique was eventually superseded. |
| `index.html` | A self-contained single-page explainer, openable directly in a browser. Follows the design convention in [`CLAUDE.md`](./CLAUDE.md). |

Runnable techniques additionally keep their pure algorithm in a **`core.js`** (UMD):
the CLI `require`s it and the in-browser "Try it" demo loads the very same file, so
the two can never drift. Shared, dependency-free helpers live in **`lib/`**:
`tokenize.js` (the one canonical tokenizer, so output differences come from the
algorithm rather than preprocessing) plus `demo.js`/`demo.css` (the shared demo
runtime — corpus loading, the "Your own text…" panel, control styling).

---

## Directory structure

```
corpora/                     Source texts (see below)
lib/                         Shared zero-dependency helpers (tokenizer, demo runtime)
scripts/                     Dev tools: site generator, smoke tests, perplexity scoreboard
glossary/                    Glossary & references page (terms + the papers behind every stop)

# Rules vs. statistics
eliza/                       ELIZA — hand-written rules, the losing side of the debate (1966)

# Text generation — Markov chains (1940s–60s)
markov/                      Simple word-to-word Markov chain
ngram-markov/                N-gram (multi-word context) Markov chain
probability-markov/          Weighted next-word selection by probability
ngram-probability-markov/    N-gram context + probability selection
pos-markov/                  POS-tagged Markov chain — grammar-steered walk (1971)
hmm-tagger/                  HMM + Viterbi POS tagger — whole-sentence tagging (1966–70s)

# Statistical NLP
zipf/                        Zipf's law — the shape of word frequencies (1935–49)
entropy/                     Shannon entropy & the guessing game (1948/1951)
edit-distance/               Levenshtein distance + spell-checker (1965)
tfidf/                       TF-IDF document search, bag-of-words retrieval (1970s–80s)
pmi/                         Pointwise mutual information collocations (1990)
naive-bayes/                 Supervised author classifier, Shakespeare vs Browning (1990s)
word-vectors/                Co-occurrence vectors + cosine similarity (early 1990s)
bpe/                         Byte-pair encoding subword tokenizer (1994/2016)

# Neural era — learning representations
neural-lm/                   Feedforward neural language model, Bengio (2003)
word2vec/                    Skip-gram with negative sampling — learned embeddings (2013)
rnn/                         Char-level recurrent network with memory (1990/1997)
lstm-gru/                    LSTM/GRU gated recurrent memory (1997/2014)
seq2seq/                     Encoder–decoder & the bottleneck — concept page (2014)
attention/                   Scaled dot-product self-attention (2014–17)

# Modern era
rag/                         Retrieval-augmented generation, TF-IDF + generator (2020→)
modern/                      Concept explainers (no code): Transformer → agents (2017→)
```

The platform described in [`TASKS.md`](./TASKS.md) is built: 21 runnable stops from
ELIZA (1966) and Markov chains (1913) through attention and RAG, each with a live
in-browser demo; concept pages for the frontier era, which is defined by scale
beyond a laptop; a generated homepage timeline with cross-page navigation, the
perplexity scoreboard, and the glossary tying it all together. Deployment options
(Vercel, or rsync to a subdomain) are documented in [`DEPLOY.md`](./DEPLOY.md).
What remains is Phase 6 polish — linting, a `CONTRIBUTING.md`, SEO/sharing
metadata. See [`OVERVIEW.md`](./OVERVIEW.md) for the story and
[`TASKS.md`](./TASKS.md) for the full status.

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

# POS-tagged Markov chain
node pos-markov/index.js corpora/sonnets-shakespeare.txt [output-length]

# TF-IDF document search
node tfidf/index.js corpora/sonnets-shakespeare.txt [query]
```

Swap in `corpora/sonnets-browning.txt` to see any technique behave on a different
author. See each implementation's `README.md` for detailed explanations and
examples — and [`CLAUDE.md`](./CLAUDE.md) for the full command list covering all
21 runnable techniques, the smoke tests (`node scripts/smoke.js`), and the
perplexity scoreboard (`node scripts/perplexity.js`).

---

## Contributing a new technique

The short version: add a directory with the full trinity (`index.js`, `README.md`,
`index.html`), reuse `lib/` rather than re-implementing preprocessing, add an entry
to `OVERVIEW.md`, and tick it off in `TASKS.md`. The conventions — including the
HTML explainer design system — are documented in [`CLAUDE.md`](./CLAUDE.md).

---

© 2026 Vincent Bruijn
