# Retrieval-Augmented Generation (RAG)

*2020 onward · the full circle of this repository*

This is where the whole journey closes a loop. RAG bolts a **retriever** — the very
TF-IDF machinery from [`../tfidf/`](../tfidf/) — onto a **generator**. At question
time the retriever fetches the most relevant documents, and the generator is made to
answer *using only those documents*. It is how a model answers questions about
private, proprietary, or up-to-the-minute data it was never trained on, and how
modern systems reduce fabrication by grounding output in retrieved text.

Every technique in this repo that "did not die but became a component" is visible
here at once: TF-IDF ranking feeds a generative model. The old methods are the
infrastructure for the new ones.

## The idea: retrieve → augment → generate

```
query ──► [ retriever ]──► top-k documents ──► [ generator ]──► grounded answer
            TF-IDF              (context)         conditioned
            over the corpus                       on the context
```

1. **Retrieve.** Score every document against the query with TF-IDF; keep the top *k*.
2. **Augment.** Those *k* documents become the *context* — the only text the
   generator may draw on.
3. **Generate.** Produce an answer from that context. Here a bigram Markov model
   stands in for a large language model; the standin is deliberate, because the
   lesson is about *grounding*, not about the generator's fluency.

## Worked example

A real run (`node rag/index.js corpora/sonnets-shakespeare.txt "the passage of time"`):

```
STEP 1 — Retrieve: top 3 of 154 sonnets by TF-IDF relevance
  sonnet #49   (score 0.0583)  "Against that time, if ever that time come,"
  sonnet #19   (score 0.0433)  "Devouring Time, blunt thou the lion's paws,"
  sonnet #106  (score 0.0422)  "When in the chronicle of wasted time"

STEP 2 — Augment: context = those 3 sonnets (341 words)

STEP 3 — Generate (bigram model; seeded with "the")
  GROUNDED — trained only on the retrieved sonnets:
    the thing it was shall reasons find of wasted time despite thy love shall
    reasons find of wasted time when in thy wrong my defects when as thou fleets

  UNGROUNDED — trained on the whole corpus (ignores retrieval):
    the sea the rearward of love control o loves use is crownd but doth cover
    every one hath in doubt till now hes king are for they or wit or
```

The retriever nails the topic — sonnet 19 is literally *"Devouring Time"*, sonnet
106 speaks of *"wasted time"*. And the contrast is the whole point: the **grounded**
generator, fed only those three sonnets, produces text steeped in *time* (`wasted
time`, `thou fleets`), while the **ungrounded** model trained on all 154 sonnets
wanders off into seas and kings. Same generator, same seed — only the *context*
differs. That is RAG: the output is only as relevant, current, or accurate as what
you retrieve.

## Why it matters

- **It grounds generation in evidence.** The model "answers" from fetched documents
  rather than from whatever it happened to absorb in training — the standard fix for
  hallucination and for stale knowledge.
- **It needs no retraining.** Swap the corpus and the system instantly "knows" new
  material; nothing is fine-tuned. This is why RAG is the default way to put a model
  on top of private or constantly-changing data.
- **It is the clearest proof the old techniques live on.** A retrieval call inside a
  frontier system *is* TF-IDF (or its embedding-based cousin from
  [`../word-vectors/`](../word-vectors/)).

## Where it falls short

- **Garbage in, garbage out.** If retrieval surfaces the wrong documents, the
  generator confidently grounds its answer in irrelevant text. RAG is only as good
  as its retriever.
- **Lexical retrieval misses meaning.** TF-IDF matches on exact token overlap — a
  query for "automobile" will not retrieve a sonnet about "cars". Real systems use
  dense embedding retrieval to fix this, at the cost of needing trained vectors.
- **The generator can still ignore the context.** Conditioning is a nudge, not a
  guarantee; a real LLM may blend retrieved facts with its own priors and still
  fabricate. (Our bigram standin can only recombine context words, so it cannot be
  fluent — the opposite failure.)
- **Chunking and ranking are fiddly.** How you split documents, how many you fetch,
  and how you order them all change the answer.

## Usage

```bash
# Default query: "the passage of time"
node rag/index.js corpora/sonnets-shakespeare.txt

# Ask your own question
node rag/index.js corpora/sonnets-shakespeare.txt "beauty and youth"
node rag/index.js corpora/sonnets-shakespeare.txt "love and jealousy"

# Retrieve over the other author
node rag/index.js corpora/sonnets-browning.txt "my heart and soul"
```

The program prints the retrieved documents with their TF-IDF scores, the size of the
augmented context, and the grounded-vs-ungrounded generations side by side.
