# The Attention Mechanism

*Bahdanau et al. 2014 → Vaswani et al. 2017 · the Transformer*

Every technique before this one looked at words through a fixed window: a Markov
chain sees the last *n* tokens, TF-IDF sees a bag with no order at all, a
co-occurrence vector sees a ±3 neighbourhood. **Attention** removes the window.
It lets every token look directly at every other token in the sequence and decide,
for itself, which ones matter — and by how much.

Attention did not arrive in one piece. Bahdanau et al. (2014) introduced it first,
as **cross-attention**: a translation decoder, generating one word at a time,
learning to look back at the relevant encoder states instead of relying on a
single fixed summary vector. Vaswani et al. (2017) then showed that attention
alone — with no recurrence at all — was enough, and generalised it to
**self-attention**: every token in *the same* sequence attending to every other.
This page and demo build self-attention, the 2017 mechanism; where the two differ
is *what* gets attended to (another sequence vs. this one), not the underlying
Q/K/V mechanic.

## The idea

For each token attention asks one question: *given my **query**, which other
tokens' **keys** are most relevant, and how should I blend their **values**?*

- **Query (Q)** — what this token is looking for.
- **Key (K)** — what each token offers as a match.
- **Value (V)** — the information each token carries, to be mixed in.

Score every query against every key with a dot product, scale, turn the scores
into weights that sum to 1 with a softmax, then use those weights to average the
values:

```
Attention(Q, K, V)  =  softmax( Q·Kᵀ / √d ) · V
```

The dot product `Q·Kᵀ` measures similarity between a query and every key. The
`√d` keeps those scores at a sane scale before the softmax (without it, large
dimensionality makes the scores explode and the softmax collapses to one-hot).
The softmax turns the row of scores into a probability distribution — the
**attention weights**. The final `· V` blends the value vectors in those
proportions, producing a new representation for the token that is informed by the
whole sequence.

### The simplification used here

A real Transformer learns three separate projection matrices (one each for Q, K,
V) and runs several attention "heads" in parallel. This demo strips that away to
expose the routing mechanic on its own: **Q = K = V = the token embeddings**, a
single head, no learned weights. So the attention weight from token *i* to token
*j* is simply the softmax of their scaled embedding similarity — words that
genuinely keep each other's company in the sonnets end up attending to one
another.

The embeddings are not random. Each is a real **co-occurrence vector** over the
top 200 words of the corpus (symmetric ±3 window, L2-normalised) — exactly the
representation built in [`../word-vectors/`](../word-vectors/). Because the
numbers come from corpus counts, the demo is fully **deterministic**: two runs
produce identical attention weights.

## What the program builds

The heart of the output is the **attention-weight matrix**: rows are the query
token, columns are the key token, and each cell is how much of the query token's
new representation is drawn from that key token. Every row sums to 1. This is the
real matrix for the default phrase `"thy love is as fair"` over Shakespeare's
sonnets:

```
query \ key      thy    love      is      as    fair
────────────────────────────────────────────────────
thy            0.718   0.112   0.068   0.038   0.064
love           0.104   0.665   0.101   0.071   0.060
is             0.066   0.105   0.695   0.057   0.077
as             0.041   0.081   0.062   0.763   0.053
fair           0.065   0.066   0.082   0.051   0.735
```

## Worked example

Read the matrix one row at a time — each row is one token deciding where to look.

- Every token attends most strongly to **itself** (the diagonal: 0.665–0.763),
  which is expected, since a vector is always most similar to itself. The
  interesting signal is the off-diagonal routing.
- **`thy` attends to `love` (0.112)** more than to any other key, and **`love`
  attends back to `thy` (0.104)**. In the sonnets these two words constantly sit
  near each other ("thy love", "love of thee"), so their co-occurrence vectors
  point in similar directions and the attention links them.
- **`is` attends to `love` (0.105)** — the copula gravitates to the noun it most
  often joins.
- **`fair` attends to `is` (0.082)**, the strongest of its weak off-diagonal
  links, reflecting the frequent "is fair" construction.

The per-token readout the program prints (excluding the self-link) makes the
routing explicit:

```
"thy"   attends most to "love" (0.112)   [self: 0.718]
"love"  attends most to "thy"  (0.104)   [self: 0.665]
"is"    attends most to "love" (0.105)   [self: 0.695]
"as"    attends most to "love" (0.081)   [self: 0.763]
"fair"  attends most to "is"   (0.082)   [self: 0.735]
```

Each token's output vector is then the attention-weighted blend of all the value
vectors (the `· V` step). That blended vector — not the original embedding — is
what a real Transformer would pass up to the next layer.

> **A note on scaling.** With L2-normalised embeddings a dot product is a cosine
> in [-1, 1], and the genuine spread between sonnet words is only ~0.1 wide.
> Dividing by the literal `√200 ≈ 14` would crush every score toward zero and
> make every row uniform. The program therefore sets the `√d` denominator to a
> `TEMPERATURE` retuned to this unit-vector scale (0.1), so the real cosine
> differences in the corpus surface as visible attention weights. The mechanic is
> exactly the formula; only the denominator is matched to the embedding scale.

## Where it falls short

- **It is O(n²).** Every token attends to every other token, so the
  attention-weight matrix is n × n. Double the sequence length and you quadruple
  the work and the memory. This quadratic cost is the central engineering
  constraint of every Transformer.
- **It is order-blind.** Attention sees a *set*, not a *sequence*: shuffle the
  tokens and the weights between any given pair are unchanged. Real Transformers
  must **add positional encodings** to the embeddings precisely because attention
  alone cannot tell position 1 from position 100.
- **This demo shows only the routing.** With no learned Q/K/V projections and a
  single head, you see *which* tokens talk to which — not the representational
  power that training provides. Real attention learns *what* to look for; here the
  "what" is fixed to raw co-occurrence similarity.
- **One layer is not enough.** A single attention step is a weighted average.
  Usefulness comes from stacking dozens of attention+feed-forward layers and
  training them on enormous corpora — far beyond what a laptop demo can show.

## Usage

```bash
# Default phrase: "thy love is as fair"
node attention/index.js corpora/sonnets-shakespeare.txt

# Supply your own phrase (use common sonnet words so each token has an embedding)
node attention/index.js corpora/sonnets-shakespeare.txt "my love is fair"

# Words outside the top-200 vocabulary are skipped with a warning
node attention/index.js corpora/sonnets-shakespeare.txt "thou art more lovely"

# Try the contrasting corpus
node attention/index.js corpora/sonnets-browning.txt "my heart and soul"
```

The program prints the embedding setup, the full attention-weight matrix (the
data structure), and the per-token "attends most to" readout (the readable
result). All numbers come straight from the corpus, so every run is identical.

Attention is the sole architectural primitive behind GPT, BERT, and Claude. It is
where this repository's runnable history hands off to models too large to train
on a laptop — see the "Modern Era" section of the top-level `OVERVIEW.md`.
