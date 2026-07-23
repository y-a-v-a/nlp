# Linear-Chain CRF Tagger

*Lafferty, McCallum & Pereira 2001 · score the labels given the words*

An HMM tells a generative story: tags produce words. A Conditional Random Field
asks the task-facing question directly: given these words, which tag sequence is
most plausible? That change permits overlapping evidence—word identity, suffixes,
capitalization, neighbouring observations—without pretending those features were
generated independently.

This tiny CRF scores a tag sequence with emission-style feature weights and
transition weights, uses Viterbi for the best path, and computes the forward
log-partition `log Z(x)` so the result is a genuine conditional probability
`P(tags | words)`. Its small weight table is supplied rather than trained; real
CRFs learn the same weights from an annotated corpus.

```bash
node crf-tagger/index.js "they rose"
node crf-tagger/index.js "the rose is fair"
node crf-tagger/index.js "the present time"
```

## Where it falls short

- Feature design is manual, even when weights are learned.
- Globally normalized training needs labelled sequences.
- Evidence is local unless increasingly elaborate features are engineered.

Neural sequence models replaced hand-designed features with learned
representations; contextual embeddings and Transformers pushed that replacement
much further.
