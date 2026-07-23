# Contextual Embeddings

*ELMo, 2018 · a word is not one thing in every sentence*

Word2Vec stores one vector per vocabulary item. That is useful, but structurally
incapable of representing polysemy: `bank` has the same coordinates beside
`river` and `loan`. ELMo changed the unit from a word lookup to a representation
computed from the whole sentence. BERT and modern language models made that idea
the default.

This small laboratory builds the repository's existing co-occurrence vectors,
then conditions a target word on the vectors around it. The target's static row is
identical in both sentences; its contextual vector is a weighted mixture of that
row and the current neighbours. This is not ELMo's bidirectional LSTM, but it
isolates ELMo's permanent conceptual move with real corpus numbers.

## Usage

```bash
node contextual-embeddings/index.js corpora/sonnets-shakespeare.txt
node contextual-embeddings/index.js corpora/sonnets-shakespeare.txt \
  fair "thy fair face is bright" "a fair judgement and honest mind"
```

## Where it falls short

- Averaging neighbours is fixed rather than learned.
- A small sonnet corpus supplies weak evidence for rare senses.
- The ±2 window still misses distant syntax and discourse.

The next development keeps the context-dependent representation but replaces
recurrent reading with the parallel Transformer, then pretrains it on raw text.
