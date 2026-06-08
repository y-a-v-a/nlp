# TASKS — Building the NLP Journey Platform

This file is the working backlog that turns this repository from a collection of
standalone scripts into **the go-to educational platform for understanding how NLP
progressed** — from Markov chains to frontier models — with runnable example code
at every step.

It is derived directly from [`OVERVIEW.md`](./OVERVIEW.md), which is the canonical
narrative. OVERVIEW.md is the *story*; this file is the *build plan*. Keep them in
sync: every subproject below maps to a section in OVERVIEW.md, and any new section
added there should gain a corresponding task here.

---

## The End Goal

A static, dependency-free website — openable locally and deployable to GitHub
Pages — where a visitor can:

1. Follow the **historical arc** of NLP as a single navigable timeline.
2. Open any technique and read a focused **explainer** (the existing `index.html`
   convention).
3. **Run the example** for that technique, ideally right in the browser, against
   the real corpus.
4. Read the **deep-dive README** and inspect the **source** behind each demo.
5. Understand not just *how* each technique works but *why it was replaced* — the
   limitation that drove the next idea.

---

## Guiding Principles (do not violate without updating CLAUDE.md)

- **Zero runtime dependencies.** Pure Node.js for demos; vanilla HTML/CSS/JS for
  the site. No frameworks, no build step required to view a page, no CDN links.
- **The trinity per technique.** Every algorithm ships three artifacts:
  - `index.js` — runnable, commented, CLI-driven against a corpus.
  - `README.md` — deep dive (concept, data structure, worked example, usage).
  - `index.html` — self-contained explainer following the design convention in
    CLAUDE.md.
- **Real data, not toy data.** Diagrams and demos use the actual corpus
  (Shakespeare's sonnets) so output is concrete and verifiable.
- **Each technique earns its place.** The explainer must end with the specific
  limitation that motivated whatever came next — the chain must never break.
- **Pedagogy over performance.** Code is written to be read and understood, not to
  be fast or production-grade.

---

## Definition of Done (per subproject)

A technique directory is "done" when **all** of the following are true:

- [ ] `index.js` runs with `node <dir>/index.js corpora/sonnets-shakespeare.txt [...]`
      and prints both the *data structure it built* and a *human-readable result*.
- [ ] Top-of-file usage comment and inline comments explain each step.
- [ ] `README.md` follows the documentation convention (concept → data structure →
      worked example → "why it was superseded" → usage).
- [ ] `index.html` follows the HTML Explainer Convention (colours, structure,
      one real-data visual, left-bordered shortcomings, forward-pointing footer).
- [ ] Entry exists/updated in `OVERVIEW.md`.
- [ ] Linked from the site homepage timeline and wired into prev/next navigation.
- [ ] Listed in the Subproject Status table below.

---

## Subproject Status

Legend: ✅ done · 🟡 partial · ⬜ not started

| # | Era | Dir | `index.js` | `README.md` | `index.html` | In site nav |
|---|-----|-----|:--:|:--:|:--:|:--:|
| — | 1940s–60s | `markov/` | ✅ | ✅ | ✅ | ⬜ |
| — | 1940s–60s | `ngram-markov/` | ✅ | ✅ | ✅ | ⬜ |
| — | 1940s–60s | `probability-markov/` | ✅ | ✅ | ✅ | ⬜ |
| — | 1940s–60s | `ngram-probability-markov/` | ✅ | ✅ | ✅ | ⬜ |
| — | 1970s–80s | `tfidf/` | ✅ | ✅ | ✅ | ⬜ |
| 1 | 1935–49 | `zipf/` | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | 1965 | `edit-distance/` | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | 1990 | `pmi/` | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | 1990s | `naive-bayes/` | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | early 1990s | `word-vectors/` | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | 1994/2016 | `bpe/` | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | 2003 | `neural-lm/` | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | 1997/2010s | `rnn/` | ⬜ | ⬜ | ⬜ | ⬜ |
| 9 | 2014–17 | `attention/` | ⬜ | ⬜ | ⬜ | ⬜ |
| 10 | 2020→ | `rag/` | ⬜ | ⬜ | ⬜ | ⬜ |
| 11 | 2017→ | modern-era explainers | n/a | n/a | ⬜ | ⬜ |

---

## Phase 0 — Foundation & Consistency ✅ COMPLETE

Get the existing five subprojects and the repo metadata into platform-ready shape
*before* adding new content.

- [x] **Rewrite the top-level `README.md`.** Was stale ("Markov Chain Text
      Generators", stopped at TF-IDF). Now reframed around the platform vision,
      pointing to `OVERVIEW.md` (narrative) and `TASKS.md` (backlog), and describing
      the trinity convention and the shared `lib/`.
- [x] **Audit the 5 existing subprojects** against the Definition of Done. Fixes
      applied: `markov` now prints a readable chain sample instead of dumping the
      whole object; `ngram-markov` now prints a data-structure sample (it printed
      none before); `ngram-probability-markov` had a raw full-object `console.log`
      removed. All five print a data structure **and** a readable result.
- [x] **Normalise tokenization.** Three divergent inline regexes replaced by one
      shared `lib/tokenize.js` (zero dependencies), now imported by all five demos.
      It also fixes a latent bug: the corpus uses curly apostrophes (U+2019), which
      none of the old regexes handled. Documented in CLAUDE.md.
- [x] **Add a second corpus.** `corpora/sonnets-browning.txt` — Elizabeth Barrett
      Browning's *Sonnets from the Portuguese* (44 sonnets, public domain, same
      format as the Shakespeare corpus). Chosen as a same-form/different-author
      contrast so future classification is about style, not structure.
- [x] **Verify every existing `index.html` matches the convention.** All five carry
      the convention markers (accent palette, `.era`, `.shortcomings`, `<footer>`);
      `tfidf/index.html` remains the reference implementation.
- [x] **Add an `.editorconfig`** (LF, UTF-8, 2-space, final newline; corpora exempt
      from reformatting) so contributed code stays consistent.

---

## Phase 1 — Classical / Statistical Era Content

Implement the six "What Could Come Next" techniques that are buildable in pure
Node. Each is one full trinity (`index.js` + `README.md` + `index.html`). These can
be worked on in parallel — they share no code.

- [ ] **`zipf/` — Zipf's Law (1935–49).** Count word frequencies, sort by rank,
      print the rank×frequency near-constant. Visual: log-log rank/frequency line
      from the real corpus. Stretch: show the law holds at the single-sonnet level.
- [ ] **`edit-distance/` — Levenshtein (1965).** DP matrix between two strings,
      displayed. Then a corpus-vocabulary spell-checker suggesting the closest word.
      Visual: the edit-distance matrix with the optimal path highlighted.
- [ ] **`pmi/` — Pointwise Mutual Information (1990).** Co-occurrence window over
      the sonnets, PMI for all pairs, top collocations. Visual: ranked collocation
      bars (e.g., "sweet self", "self love") from real output.
- [ ] **`naive-bayes/` — Naive Bayes classifier (1990s).** Train on two labeled
      groups (early vs. late sonnets, or sonnets vs. the second corpus); classify a
      held-out document. Visual: per-class word-likelihood comparison for a sample
      document. (Depends on Phase 0 corpus task if using a second corpus.)
- [ ] **`word-vectors/` — Co-occurrence vectors (early 1990s).** Co-occurrence
      matrix for the top ~200 words, cosine similarity, nearest neighbours. Visual:
      a small 2-D projection or a "nearest words" panel for "beauty", "winter".
- [ ] **`bpe/` — Byte Pair Encoding (1994/2016).** Learn a ~500-token vocabulary by
      iterative merges; show how a word like "fairest" tokenizes as the vocab grows.
      Visual: the merge sequence and a before/after tokenization of a real line.

---

## Phase 2 — Neural Era Content

The bridge from counting to learning. These are heavier (training loops in pure JS)
and should be kept deliberately small so they converge on a laptop.

- [ ] **`neural-lm/` — Bengio feedforward LM (2003).** Trigram model over the top
      ~300 words, embeddings → tanh hidden → softmax. Show loss decreasing and text
      slightly more coherent than a Markov chain. Visual: training-loss curve +
      learned nearest-neighbour embeddings.
- [ ] **`rnn/` — RNN / LSTM (1997, applied 2010s).** Minimal char-level recurrent
      net, no framework. Show it respecting longer-range structure than a Markov
      chain. Visual: hidden-state-over-time, or generated sample vs. Markov sample.
- [ ] **`attention/` — Attention mechanism (2014–17).** Self-attention over a short
      sentence with small (optionally random) vectors; no training required. Visual:
      the attention-weight matrix showing which words attend to which.

---

## Phase 3 — Modern Era (2017 → today)

Per OVERVIEW.md, most of this era cannot be honestly reproduced in an afternoon —
the defining feature is scale. So this phase is mostly **conceptual explainers**
(`index.html` only, no false "runnable" promise), with **one genuine build: RAG**,
which stacks on the existing `tfidf/` retriever.

- [ ] **`rag/` — Retrieval-Augmented Generation (2020→).** Full trinity. Use the
      `tfidf/` search to rank sonnets for a query, take the top-k, feed them as
      context to a generation step (a Markov/n-gram generator can stand in for an
      LLM). Demonstrates retrieve-then-generate end to end. Visual: query →
      retrieved sonnets → grounded output pipeline.
- [ ] **Modern-era conceptual explainers** (`index.html` each, grouped under a
      `modern/` directory or one per slug). One page per OVERVIEW.md milestone:
  - [ ] The Transformer (2017)
  - [ ] Pretraining & Transfer Learning — BERT/GPT (2018)
  - [ ] Scaling Laws & In-Context Learning — GPT-3 (2020)
  - [ ] Alignment — Instruction Tuning, RLHF, Constitutional AI (2022)
  - [ ] Reasoning & Test-Time Compute (2024–25)
  - [ ] Tool Use & Agents (2023→)
- [ ] **Mark conceptual pages clearly** in the UI as "concept, not runnable" so the
      visitor knows when there is no code to execute and why (scale/compute).

---

## Phase 4 — The Platform / Website Layer

This is what makes it a *platform* rather than a folder of pages.

- [ ] **Root `index.html` homepage.** A visual timeline of the whole journey,
      mirroring OVERVIEW.md's arc, with each technique as a card linking to its
      explainer. This is the front door.
- [ ] **Shared design system.** Extract the repeated CSS tokens (colours, type
      scale, `.visual` / `.shortcomings` / `.formula` components) used across all
      explainers. Decision needed (see Open Decisions): one shared stylesheet vs.
      keep each page self-contained. Whichever is chosen, document it in CLAUDE.md.
- [ ] **Consistent cross-page navigation.** A small header/footer on every explainer
      with: link home, prev technique, next technique, and current era. Keep it
      dependency-free.
- [ ] **Era grouping & progress.** Group the timeline by era (Statistical → Neural →
      Modern) so the structural shifts are visible at a glance.
- [ ] **Responsive layout.** Verify all explainers and the homepage read well on
      mobile widths (the current single-column max-width layout is a good base).
- [ ] **Accessibility pass.** Semantic landmarks, colour-contrast check on the
      accent palette, alt/desc text for SVG visuals, keyboard-navigable nav.
- [ ] **Source-viewing affordance.** From each explainer, a clear link to its
      `index.js` and `README.md` (e.g., to the file on GitHub) so the code is one
      click away.

---

## Phase 5 — Interactive Demos (in-browser)

The biggest leap in educational value: let visitors *run* each technique in the
browser, not just read about it. (See Open Decisions — this may change how demos
are authored.)

- [ ] **Decide the interactivity strategy** (Open Decisions): port each `index.js`
      to a browser-runnable module, or add a thin browser wrapper, keeping the Node
      CLI as the canonical reference.
- [ ] **Ship the corpus to the browser.** Make the sonnets loadable client-side
      (fetch a text file or inline) without a server beyond static hosting.
- [ ] **Add interactive controls per technique** where it teaches something:
      output length / n-gram size sliders (Markov), live query box (TF-IDF, RAG),
      two strings to diff (edit distance), window size (PMI), merge count (BPE).
- [ ] **Live output panels** that re-run on input change, showing both the data
      structure and the result — the same two things the CLI prints.
- [ ] **Guard against divergence.** Ensure the in-browser logic and the Node
      `index.js` stay faithful to each other (shared module, or a documented parity
      check).

---

## Phase 6 — Deployment, Quality & Sustainability

- [ ] **GitHub Pages deployment.** Serve the repo as a static site (root
      `index.html` as landing). Document the URL in README.
- [ ] **CI smoke tests.** A GitHub Action that runs each `index.js` against the
      corpus and asserts it exits 0 and produces output — catches regressions as
      content grows. (A SessionStart hook can mirror this for web sessions.)
- [ ] **Lightweight test harness.** Per-technique sanity assertions (e.g., Zipf
      ratios cluster; edit distance of identical strings is 0; TF-IDF of a
      universal word is 0). No heavy framework — a tiny `assert`-based runner.
- [ ] **Linting/formatting.** Adopt a zero-config formatter (or document a style)
      so contributions stay clean; wire it into CI.
- [ ] **`CONTRIBUTING.md`.** Explain the trinity, the Definition of Done, and how to
      add a new technique (including updating OVERVIEW.md, this table, and the nav).
- [ ] **Glossary & references.** A glossary page for recurring terms (token,
      embedding, softmax, context window) and a references list (Markov 1913, Salton,
      Church & Hanks, Bengio 2003, Vaswani 2017, Kaplan 2020, etc.).
- [ ] **SEO & sharing meta.** Page titles, descriptions, and Open Graph tags so the
      "go-to source" is findable and shareable.
- [ ] **Performance budget.** Keep pages light; inline visuals as CSS/SVG (already
      the convention) rather than images where possible.

---

## Open Decisions (resolve before the dependent phases)

These change the shape of later work; flagging rather than pre-deciding.

1. **Self-contained pages vs. shared site shell.** The current convention says each
   `index.html` is fully self-contained (no shared assets). A true *platform* wants
   shared CSS and nav. Recommendation: introduce a shared stylesheet + nav include
   for the site experience, while keeping each page degradable to standalone. This
   requires a CLAUDE.md amendment. *(Blocks Phase 4.)*
2. **In-browser demos: how.** Pure client-side JS ports (simple, no build) vs. a
   small bundling step vs. running the existing Node files via a playground.
   Recommendation: client-side ES-module ports sharing logic with the CLI where
   feasible. *(Blocks Phase 5.)*
3. **Modern-era code stand-ins.** For RAG and any "runnable" modern page, is a
   Markov/n-gram generator an acceptable stand-in for an LLM, or do we call a real
   model API (introducing a dependency and a key)? Recommendation: stand-in by
   default to honour the zero-dependency principle; clearly labelled. *(Affects
   Phase 3.)*
4. ~~**Second corpus choice.**~~ ✅ Resolved: Elizabeth Barrett Browning's *Sonnets
   from the Portuguese* (`corpora/sonnets-browning.txt`) — a same-form,
   different-author contrast to Shakespeare. Added in Phase 0.

---

## Suggested Sequencing

Phase 0 first (unblocks everything). Then Phases 1 and the homepage/nav of Phase 4
can proceed in parallel — building the site shell early lets each new technique
plug straight in. Phase 2 → Phase 3 follow the historical arc. Phase 5 (interactive
demos) and Phase 6 (deploy/quality) layer on once content exists, though stand up
GitHub Pages (Phase 6) as soon as the homepage exists so progress is visible.
