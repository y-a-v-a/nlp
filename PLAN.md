# PLAN — Review Follow-ups

Findings and suggestions from the full codebase review of July 2026, minus the
two items already fixed on this branch (the Markov uniform-selection
contradiction and the pos-markov doc sync). This file complements
[`TASKS.md`](./TASKS.md): TASKS.md is the phased build plan for the platform;
this is the punch list that came out of reviewing the finished content against
its target audience — college-educated readers who are *not* computer
scientists, who should be challenged but never need a CS degree.

Items are grouped by kind and ordered by value within each group. Every new
technique must ship the full trinity (`index.js` + `core.js`, `README.md`,
`index.html`) per the conventions in [`CLAUDE.md`](./CLAUDE.md), get a `PAGES`
entry in `scripts/build-site.js`, a section in `OVERVIEW.md`, and a row in
TASKS.md's status table.

---

## Tone of voice

The house style, distilled from the strongest existing pages (tfidf,
edit-distance, pmi, attention, alignment) — match it when writing anything new:

- **Museum docent, not lecturer.** Confident, warm, plain-spoken. The reader is
  smart and curious but has no CS background; nothing is dumbed down, nothing
  assumes prior jargon. Terms are defined in the sentence that first uses them.
- **Intuition before formula.** Every equation appears only after a
  plain-language account of what it does, and is immediately glossed in words
  ("IDF is essentially a measure of surprise"; softmax "turns the row of scores
  into weights that sum to 1"). A formula is never the explanation — it is the
  precise restatement of one.
- **Real numbers, real corpus.** Claims are demonstrated with actual output
  from the sonnets ("thy attends to love (0.112)"), never with `foo`/`bar` or
  invented toy data. If a page states a number, the code reproduces it.
- **Radical honesty about limits.** Every demo names its own simplifications
  ("Q = K = V, single head, no learned weights"); some deliberately show the
  method failing (word-vectors' noisy "beauty" neighbours). Shortcomings are
  specific to the algorithm, never generic caveats.
- **The chain never breaks.** Every page ends by naming the concrete
  limitation that motivated the next technique. History is told as cause and
  effect, not as a list.
- **Sentence craft.** Short declarative sentences; em-dash asides; bold for the
  first appearance of a key term; occasional second person ("you shall know a
  word by the company it keeps"); no hype words, no academic hedging, no
  exclamation marks. Wit is allowed in small doses ("Don't memorise the world —
  look it up").

---

## 1. Corrections & consistency (small, do first)

- [x] **Attention: 2014 vs 2017 conflation.** `attention/README.md` and
      `attention/index.html` head themselves "Bahdanau 2014 → Vaswani 2017" but
      describe only *self*-attention (every token attending to every other in
      the same sequence — Vaswani 2017). Bahdanau 2014 introduced
      *cross*-attention: a translation decoder attending over encoder states.
      Add a clarifying sentence — or resolve it properly with the seq2seq
      concept page (§2.5), which gives cross-attention its own home.
- [x] **Zipf: "constant" oversell.** `zipf/README.md` and `zipf/index.html`
      call rank×frequency "roughly constant… ≈2,500" while the displayed column
      visibly climbs 490 → 876 → 1245 → 1488 → 1850. Reframe honestly: same
      order of magnitude, with poetry's heavy function words bending the low
      ranks — the log-log line, not the ratio, is the law.
- [x] **Markov README voice.** `markov/README.md` still opens as a "DADA Poetry
      Generator" (Tzara framing, `node index.js sample.txt` examples) — a relic
      predating the museum voice. Rewrite in house style; keep the DADA
      connection as a historical aside if wanted (it is a nice hook), and point
      usage examples at `corpora/`.
- [x] **Markov-family era labels.** The five explainers carry distinct-looking
      per-page eras (1913–1960s / 1960s–1980s / 1970s–1980s / 1980s–1990s)
      implying a 60-year progression, but the variants are all elaborations of
      one 1948 idea (see Shannon, §2.3). Align the era lines with the homepage
      dates and say explicitly that these are variations on a theme, ordered
      conceptually.
- [x] **"Words" vs "tokens" in scale figures.** The scale-gap sidebar (injected
      by `build-site.js` into the modern pages) and `modern/scaling/index.html`
      say "words" where the honest unit is tokens (~0.75 words/token). One
      footnote in the injected block fixes all instances at once.
- [x] **Scaling page: Kaplan narrative, Chinchilla numbers.** The story on
      `modern/scaling/index.html` is pure Kaplan 2020, but the data ladder
      (Llama 3, ~15T) reflects the post-Chinchilla regime. Add one sentence:
      Hoffmann et al. 2022 showed the optimal recipe uses far more data per
      parameter than Kaplan estimated — which is why later models train on
      trillions of tokens.
- [x] **RNN: unpack the recurrence formula.** `h_t = tanh(Wxh·x_t + Whh·h_{t-1} + bh)`
      in `rnn/README.md`/`index.html` is the steepest notation cliff in the
      runnable set. Add one line before it: a matrix times a vector = "mix the
      numbers together with learned weights", so the formula reads as "new
      memory = squash(mix of current input + mix of previous memory)". Give
      Adagrad / gradient clipping / BPTT each a half-sentence gloss.
- [x] **Homepage: note the conceptual ordering.** The timeline is deliberately
      non-chronological in two places (Neural LM 2003 before RNN 1997; RAG
      2020→ after Alignment 2022). One line in the homepage intro or era blurb
      ("ordered by idea, not strictly by year") stops sharp readers from
      tripping.
- [x] **Minor nits.** `naive-bayes/README.md`: sort the "most
      Browning-indicative" table by its own logLR column (`angels` −2.79 is
      listed after `beloved` −2.64); soften "spam filters in the 1990s" to
      late-1990s–2000s (Sahami 1998, Graham 2002). `bpe/`: README numbers a
      merge #17 that the HTML's abbreviated list calls rule 5 — renumber or
      caption one of them. `edit-distance/`: README's worked matrix uses
      "loue → lose", the HTML "loue → love" — harmless, but one sentence
      acknowledging both are distance 1 would remove the flicker.

## 2. Missing developments (new stops on the journey)

Ranked by educational value to the "road to LLMs" arc. The first four are
buildable within the zero-dependency rules; the fifth is a concept page.

- [x] **2.1 ELIZA & the symbolic era — 1966. Runnable.** The story currently
      opens with "the statistical side won" but never shows the losing side.
      ELIZA is ~100 lines of dependency-free pattern-matching, the most famous
      NLP program ever written, and delightful in a browser. Watching it break
      teaches *why* hand-written rules don't scale — the premise of the whole
      arc. Directory `eliza/`; demo: a chat box (the one demo that needs no
      corpus — note the irony on the page: rules need no data, and that is
      exactly their problem). Sketch a Rogerian rule set; show the rules openly
      on the page. Chain forward: "you cannot write enough rules → count
      instead" → Markov. Consider a short Chomsky/rules-vs-statistics aside
      here so the debate paragraph in OVERVIEW.md has an anchor. Site position:
      new stop 1, before `markov/`.
- [x] **2.2 Word2Vec — 2013. Runnable.** The most conspicuous gap in the chain.
      `word-vectors/` is counting-era co-occurrence; the *learned* dense
      embeddings that popularized the idea — and the "king − man + woman ≈
      queen" result, the most famous demo in NLP history — appear only as
      forward references. A tiny skip-gram with negative sampling is buildable
      in pure JS on the sonnets (top ~200 vocab, small dims, seeded PRNG per
      the neural-era convention). The analogy may be weak on 17.5k words —
      show it honestly and explain why scale matters; nearest-neighbour quality
      vs `word-vectors/` counting will visibly improve. Directory `word2vec/`;
      visual: same nearest-words panels as `word-vectors/` side by side —
      counted vs learned. Site position: between `neural-lm/` and `rnn/` (it
      needs "learning from data" already established). Fixes the dangling
      "Word2Vec (2013)" pointers in tfidf/word-vectors/neural-lm.
- [x] **2.3 Shannon: entropy & the guessing game — 1948. Runnable.** The
      homepage dates the Markov stops "1948" but the repo never names the man
      or the paper that date refers to — and n-gram language modelling *is*
      Shannon's. A small demo: measure letter/word entropy of the sonnets;
      recreate Shannon's guessing game ("cover the line, guess the next
      letter") interactively. Grounds perplexity (currently used in
      `neural-lm/` without an ancestor) and plants "prediction = compression =
      understanding?", which pays off at the frontier pages. Directory
      `entropy/`; site position: beside Zipf in the "shape of language" cluster.
- [x] **2.4 HMM + Viterbi tagger — 1970s–80s. Runnable.** `pos-markov/`'s own
      shortcomings say "real taggers (HMMs, then neural models)" — close that
      loop. A bigram HMM POS tagger with Viterbi decoding over the baseline
      tagger's lexicon is small, and the visual writes itself: the trellis with
      the winning path highlighted (the edit-distance matrix's dynamic-
      programming idea, reused — say so). Show "they rose" tagged correctly
      where the baseline fails. Directory `hmm-tagger/`; site position: after
      `pos-markov/`.
- [x] **2.5 seq2seq / encoder–decoder — 2014. Concept page.** The missing link
      the attention page currently papers over: LSTMs → "squeeze the sentence
      into one vector" → the bottleneck → cross-attention (Bahdanau 2014) →
      "what if attention is all you need" (2017). One diagram: the shrinking
      vector between encoder and decoder, then the attention lines bypassing
      it. Either `modern/seq2seq/` — or, since it predates the frontier era, a
      concept-only page in the neural group (would be the first non-runnable
      page outside `modern/`; note the deviation in CLAUDE.md if so). Fixes
      §1's attention attribution properly.
- [x] **2.6 Low-priority mentions (no new pages).** A sentence each:
      Chinchilla on the scaling page (see §1); multimodality as a closing note
      on `modern/agents/`; LSA as a parenthetical on `word-vectors/`
      (SVD-compressed co-occurrence, the missing link to dense vectors —
      skippable).

## 3. Educational & technical additions

- [x] **3.1 Perplexity as the journey's scoreboard.** The repo has four
      generations of generative model trained on the same corpus (markov →
      ngram-markov → neural-lm → rnn) but no shared measure of progress;
      perplexity appears only in `neural-lm/`. Compute held-out perplexity for
      each generative stop (the counting models need only a few lines plus
      smoothing for unseen transitions — a teachable moment in itself) and show
      the number falling across 70 years of technique, e.g. a small table on
      the homepage or a banner stat per page. Quantifies the coherence-vs-
      variety tradeoff the prose describes. Depends nicely on §2.3 (entropy
      explains what perplexity *is*).
      *Shipped (`scripts/perplexity.js` + homepage scoreboard) — with an honest
      twist the plan didn't predict: on 14k training words the number does NOT
      fall; nothing beats bare word frequency overall, even with Witten-Bell
      smoothing (where a bigram's exact transition was seen, it wins 49 vs 234 —
      it just rarely applies). The scoreboard tells that data-hunger story
      straight, which is a better setup for the scaling-laws page than the
      textbook version would have been.*
- [x] **3.2 Paste-your-own-text demos.** Every demo runs only against the two
      bundled corpora. Add a third option to the corpus `<select>` — "your own
      text" — revealing a `<textarea>` (min ~1,000 words for sane output, with
      a friendly note), implemented once in `lib/demo.js` and inherited by all
      16 runnable pages. Watching a Markov chain babble in *your own* writing
      style converts "I watched a demo" into "I understood the mechanism" — the
      single strongest engagement upgrade available, and squarely in the
      spirit of "seeing things happen in front of you".
- [x] **3.3 Glossary.** Already on the Phase 6 backlog in TASKS.md — raise its
      priority for this audience. Recurring terms (token, embedding, softmax,
      parameter, context window, corpus, held-out) each get a two-sentence
      plain-language entry on one self-contained page; explainers link the
      first use. Keep per-page inline definitions — the glossary is a
      supplement, not a replacement, so pages stay standalone.

---

*Origin: full-repo review, July 2026 (branch
`claude/nlp-llms-codebase-review-1yroi2`). Already fixed on that branch: the
Markov cores' uniform-selection contradiction (followers deduplicated, pages
and demos corrected) and pos-markov's sync into OVERVIEW.md / TASKS.md / the
root README.*
