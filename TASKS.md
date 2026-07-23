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
| — | 1966 | `eliza/` | ✅ | ✅ | ✅ | ✅ |
| — | 1940s–60s | `markov/` | ✅ | ✅ | ✅ | ✅ |
| — | 1940s–60s | `ngram-markov/` | ✅ | ✅ | ✅ | ✅ |
| — | 1940s–60s | `probability-markov/` | ✅ | ✅ | ✅ | ✅ |
| — | 1940s–60s | `ngram-probability-markov/` | ✅ | ✅ | ✅ | ✅ |
| — | 1971 | `pos-markov/` | ✅ | ✅ | ✅ | ✅ |
| — | 1966–70s | `hmm-tagger/` | ✅ | ✅ | ✅ | ✅ |
| — | 1970s–80s | `tfidf/` | ✅ | ✅ | ✅ | ✅ |
| 1 | 1935–49 | `zipf/` | ✅ | ✅ | ✅ | ✅ |
| 2 | 1948/1951 | `entropy/` | ✅ | ✅ | ✅ | ✅ |
| 3 | 1965 | `edit-distance/` | ✅ | ✅ | ✅ | ✅ |
| 4 | 1990 | `pmi/` | ✅ | ✅ | ✅ | ✅ |
| 5 | 1990s | `naive-bayes/` | ✅ | ✅ | ✅ | ✅ |
| 6 | early 1990s | `word-vectors/` | ✅ | ✅ | ✅ | ✅ |
| 7 | 1994/2016 | `bpe/` | ✅ | ✅ | ✅ | ✅ |
| 8 | 2003 | `neural-lm/` | ✅ | ✅ | ✅ | ✅ |
| 9 | 2013 | `word2vec/` | ✅ | ✅ | ✅ | ✅ |
| 10 | 1997/2010s | `rnn/` | ✅ | ✅ | ✅ | ✅ |
| 11 | 1997/2014 | `lstm-gru/` | ✅ | ✅ | ✅ | ✅ |
| 12 | 2014 | `seq2seq/` | n/a | n/a | ✅ | ✅ |
| 13 | 2014–17 | `attention/` | ✅ | ✅ | ✅ | ✅ |
| 14 | 2020→ | `rag/` | ✅ | ✅ | ✅ | ✅ |
| 15 | 2017→ | modern-era explainers | n/a | n/a | ✅ | ✅ |

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

## Phase 1 — Classical / Statistical Era Content ✅ COMPLETE

Implement the six "What Could Come Next" techniques that are buildable in pure
Node. Each is one full trinity (`index.js` + `README.md` + `index.html`), reusing
`lib/tokenize.js`, printing both a data structure and a readable result, with the
HTML visual drawn from real corpus numbers.

- [x] **`zipf/` — Zipf's Law (1935–49).** Ranked frequency table, rank×frequency
      near-constant (≈2,500 over the top 50 words), Zipf prediction, bar chart.
      Visual: log-log rank/frequency curve vs the ideal line, from the real corpus.
- [x] **`edit-distance/` — Levenshtein (1965).** DP matrix display + a
      corpus-vocabulary spell-checker. Default "loue" → distance-1 from `lose`,
      `loud`, and `love` at once. Visual: the edit-distance matrix with the optimal
      path highlighted.
- [x] **`pmi/` — Pointwise Mutual Information (1990).** Windowed co-occurrence, PMI
      with a ≥4-count threshold. Top collocations like "tied + tongue", "ten +
      times", "mine + own". Visual: ranked collocation bar chart from real output.
- [x] **`naive-bayes/` — Naive Bayes classifier (1990s).** Shakespeare vs Browning
      author classification using both corpora; deterministic every-5th-sonnet
      holdout; **94.7% held-out accuracy**. Visual: per-word P(word|class)
      comparison. (Used the Phase 0 second corpus.)
- [x] **`word-vectors/` — Co-occurrence vectors (early 1990s).** 200×200
      co-occurrence matrix, cosine similarity. Nearest to "heart": love, mind,
      sight, thoughts. Visual: "nearest words" panels, with function-word neighbours
      flagged to show the no-weighting shortcoming.
- [x] **`bpe/` — Byte Pair Encoding (1994/2016).** 300 merges, vocab 28 → 328.
      "fairest" → `fa i re st</w>` (8 chars → 4 subwords → 1 word). Visual: the merge
      sequence and the word fusing into subword boxes across stages.

---

## Phase 2 — Neural Era Content ✅ COMPLETE

The bridge from counting to learning — real training loops in pure JS, kept small so
they converge on a laptop in a few seconds. Each is deterministic (seeded PRNG) so
the documented numbers reproduce.

- [x] **`neural-lm/` — Bengio feedforward LM (2003).** 2×24-dim embeddings → tanh(48)
      → softmax(200), trained by backprop. Loss falls 4.90 → 3.12 (perplexity 134 →
      23) in 15 epochs; learned embeddings cluster related words (thou → hath,
      thyself). Visual: training-loss curve + nearest-neighbour embedding cards.
- [x] **`rnn/` — RNN (1990/1997, applied 2010s).** Char-level vanilla RNN with
      backprop-through-time, Adagrad, gradient clipping. Loss/char 3.33 → 1.96 over
      5,000 iters; samples go from noise to word-shaped text. Visual: hidden-state
      heatmap as it reads "shall i compare".
- [x] **`lstm-gru/` — Gated recurrent memory (1997/2014).** One controlled
      delayed-memory task compares vanilla recurrence with scalar LSTM and GRU
      forward equations. Visual: memory retention across an adjustable distractor
      delay, plus exposed gate values at recall.
- [x] **`attention/` — Attention mechanism (2014–17).** Scaled dot-product
      self-attention over a phrase, using real co-occurrence embeddings (Q=K=V,
      single head, no training). Visual: the attention-weight matrix heatmap. Note:
      the √d denominator is retuned to the unit-vector scale (documented) so the
      cosine differences are visible rather than flattened.

---

## Phase 3 — Modern Era (2017 → today) ✅ COMPLETE

Per OVERVIEW.md, most of this era cannot be honestly reproduced in an afternoon —
the defining feature is scale. So this phase is mostly **conceptual explainers**
(`index.html` only, no false "runnable" promise), with **one genuine build: RAG**,
which stacks on the existing `tfidf/` retriever.

- [x] **`rag/` — Retrieval-Augmented Generation (2020→).** Full trinity. TF-IDF
      retrieves the top-3 sonnets for a query; a bigram generator (LLM standin) is
      trained only on that context. The grounded-vs-ungrounded contrast is stark:
      "the passage of time" retrieves sonnet 19 ("Devouring Time") and the grounded
      output speaks of "wasted time" while the ungrounded baseline wanders. Visual:
      the query → retrieved sonnets → grounded output pipeline.
- [x] **Modern-era conceptual explainers** (`index.html` each, grouped under
      `modern/<slug>/`, with a `modern/README.md` framing the section). One page per
      OVERVIEW.md milestone, each with a conceptual diagram and forward-pointing
      footer chaining to the next:
  - [x] The Transformer (2017) — block-stack diagram + RNN-vs-Transformer parallelism
  - [x] Pretraining & Transfer Learning — BERT/GPT (2018) — two-phase recipe diagram
  - [x] Scaling Laws & In-Context Learning — GPT-3 (2020) — log-log power-law curve
  - [x] Alignment — Instruction Tuning, RLHF, Constitutional AI (2022) — RLHF loop + before/after
  - [x] Reasoning & Test-Time Compute (2024–25) — direct-vs-reasoned contrast
  - [x] Tool Use & Agents (2023→) — observe-decide-act loop with tool calls
- [x] **Mark conceptual pages clearly** as "concept, not runnable": each carries a
      visually distinct note under the header explaining there is no code to run
      because this era is defined by scale beyond a laptop.
- [x] **Make the scale concrete.** A "scale gap" callout (injected by
      `build-site.js` into the 5 non-scaling concept pages) contrasts the repo's
      `neural-lm` (~17.6K words / ~17K params / ~4s) with GPT-3 (175B params / ~300B
      words) and a frontier model (~15T words, ~10²⁵ ops) — ~a billion-fold more
      data, plus the human undertaking (teams, months, millions). The `scaling/`
      page hosts the full log-scale "training data" ladder; OVERVIEW.md and the
      homepage carry the one-line version.

---

## Phase 4 — The Platform / Website Layer 🟡 MOSTLY COMPLETE

This is what makes it a *platform* rather than a folder of pages. A single generator,
[`scripts/build-site.js`](./scripts/build-site.js), owns the canonical page order,
writes the homepage, and injects the nav — re-run it after adding a technique.

- [x] **Root `index.html` homepage.** A vertical timeline of all 28 stops grouped by
      era, each a card (with a Runnable/Concept badge) linking to its explainer.
- [x] **Shared design system.** Open Decision resolved: pages stay **self-contained**
      (each keeps its own inline CSS, so it opens standalone), and the nav is injected
      with literal palette colours rather than a shared stylesheet — no page depends
      on an external asset. Documented in CLAUDE.md.
- [x] **Consistent cross-page navigation.** Every explainer gets a top nav (home +
      prev/next + position) and a bottom nav (prev/all/next), injected idempotently,
      using relative links so it works locally and when deployed.
- [x] **Era grouping & progress.** The timeline is grouped Rules vs. Statistics →
      Counting & Retrieval → Learning Representations → The Frontier, each with a blurb.
- [x] **Source-viewing affordance.** Runnable pages link to their `README.md` and
      `index.js` (same directory) from the bottom nav; concept pages omit it.
- [x] **Responsive layout.** The single-column max-width layout and flex navs are
      mobile-friendly by construction, but no device testing has been done yet.
- [x] **Accessibility pass.** Pages use semantic landmarks (`header`/`nav`/`footer`,
      heading order) and SVGs carry `aria-label`s; a formal contrast + keyboard audit
      is still pending.

---

## Phase 5 — Interactive Demos (in-browser) ✅ COMPLETE

All 21 runnable techniques now have a "Try it" section. Decision (resolved): demos
run **served** (`npx serve` / GitHub Pages), not from `file://`; the static reading
content still works standalone.

- [x] **Interactivity strategy.** Each technique has a UMD `core.js` holding the
      pure algorithm; the Node CLI `require`s it and the browser loads the same file
      via `<script src>` (`window.NLP.<tech>`). One source → CLI and demo cannot
      drift. Shared `lib/tokenize.js` (UMD), `lib/demo.js`, `lib/demo.css`.
- [x] **Ship the corpus to the browser.** `lib/demo.js` `loadCorpus()` fetches the
      real corpus files; works on any static host. Graceful "run a local server"
      hint when opened unserved.
- [x] **Interactive controls per technique.** Markov family: length / n-gram / context
      sliders + regenerate + chain explorers. TF-IDF & RAG: live query. Zipf: top-N
      ranked bars. Edit distance: live DP matrix + spell-checker. PMI: window /
      min-count. Word-vectors: nearest neighbours. BPE: merges slider + token boxes.
      Attention: phrase → live heatmap. Naive Bayes: live classifier. **Neural LM and
      RNN: train live in the browser** via a steppable core (one epoch / batch per
      frame, live loss curve + sample) so the tab never freezes.
- [x] **Live output panels** re-run on input change.
- [x] **Guard against divergence.** Single shared core per technique; CLI output
      verified byte-identical (deterministic ones) or format-identical after the
      refactor; browser UMD path exercised in a sandbox for every core.
- [x] **Bring your own text.** Every demo with a corpus `<select>` (18 pages,
      including a new select on `attention/`) has a "Your own text…" option —
      paste or load a `.txt`, soft minimum ~1,000 words, hard cap 300,000
      characters (~50k words). Implemented once in `lib/demo.js`
      (`customCorpus()`); the text persists across pages via `sessionStorage`
      and never leaves the browser. The tfidf/rag/naive-bayes document splitter
      now accepts ≥20-word paragraphs (same 154/44 docs on the sonnet corpora)
      so pasted prose splits into documents.

---

## Phase 6 — Deployment, Quality & Sustainability

- [x] **Deployment.** Self-hosted at a subdomain (`nlp.vincentbruijn.nl`) via a
      manual-dispatch GitHub Actions workflow (`.github/workflows/deploy.yml`) that
      rsyncs the static tree over SSH. Setup, secrets, DNS, and a manual fallback
      are documented in `DEPLOY.md`. (Chosen over GitHub Pages so it can sit
      alongside the author's site and a blog post.)
- [x] **CI smoke tests.** A GitHub Action that runs each `index.js` against the
      corpus and asserts it exits 0 and produces output — catches regressions as
      content grows. (A SessionStart hook can mirror this for web sessions.)
- [x] **Lightweight test harness.** Per-technique sanity assertions (e.g., Zipf
      ratios cluster; edit distance of identical strings is 0; TF-IDF of a
      universal word is 0). No heavy framework — a tiny `assert`-based runner.
- [ ] **Linting/formatting.** Adopt a zero-config formatter (or document a style)
      so contributions stay clean; wire it into CI.
- [ ] **`CONTRIBUTING.md`.** Explain the trinity, the Definition of Done, and how to
      add a new technique (including updating OVERVIEW.md, this table, and the nav).
- [x] **Glossary & references.** `glossary/index.html` — a self-contained page
      with plain-language entries for the recurring terms (token, embedding,
      softmax, parameter, context window, corpus, held-out, perplexity, …) and
      a references list from Markov 1913 to Bai 2022, each pointing at its stop.
      Linked from every page's injected bottom nav; explainers link the first
      use of a term to its anchor. Per-page inline definitions stay — the
      glossary is a supplement, not a replacement.
- [x] **Perplexity scoreboard.** `scripts/perplexity.js` grades every generative
      model on the same held-out sonnets (deterministic split, shared vocab,
      Witten-Bell smoothing); `--write` refreshes `scripts/perplexity.json`,
      which `build-site.js` renders as the homepage scoreboard — including the
      honest verdict that at this scale nothing beats word frequency, the
      data-hunger lesson that sets up the scaling-laws page.
- [ ] **SEO & sharing meta.** Page titles, descriptions, and Open Graph tags so the
      "go-to source" is findable and shareable.
- [ ] **Performance budget.** Keep pages light; inline visuals as CSS/SVG (already
      the convention) rather than images where possible.

---

## Open Decisions (resolve before the dependent phases)

These change the shape of later work; flagging rather than pre-deciding.

1. ~~**Self-contained pages vs. shared site shell.**~~ ✅ Resolved (Phase 4): pages
   stay fully self-contained. Rather than a shared stylesheet, a generator
   (`scripts/build-site.js`) injects nav with literal palette colours, so every page
   still opens standalone and depends on no external asset. Modern-era concept
   stand-in (#3) also confirmed: Markov/n-gram generators stand in for an LLM,
   clearly labelled.
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
