# LSTM & GRU — Gated Recurrent Memory

*Hochreiter & Schmidhuber 1997 / Cho et al. 2014 · learning what to keep*

The vanilla recurrent network before this stop has one memory vector and rewrites
it at every step. In principle information can survive forever. In practice each
update repeatedly multiplies both the state and its gradient, so old information
usually fades. **Long Short-Term Memory (LSTM)** and the **Gated Recurrent Unit
(GRU)** put learned valves around that update: keep this, overwrite that, reveal
this part now.

This stop runs all three architectures on the same delayed-memory experiment.
A signal (`+1` or `−1`) appears once, a configurable number of blank distractor
steps follows, and a recall cue asks for the original value. It is intentionally
small: one scalar state makes every gate visible instead of burying the idea in
matrices.

## The LSTM

An LSTM separates long-lived **cell state** `c` from the exposed **hidden state**
`h`. Three sigmoid gates produce numbers from 0 (closed) to 1 (open):

```text
f = forget gate       how much old cell state survives
i = input gate        how much candidate memory enters
o = output gate       how much cell state becomes visible

c_t = f · c_(t−1) + i · candidate
h_t = o · tanh(c_t)
```

On the store step, the input gate opens and the forget gate clears the old cell.
Across distractors, forget stays near 1 and input near 0. The value therefore
travels down an almost unchanged additive path. At recall, the output gate opens.

## The GRU

A GRU combines cell and hidden state and uses two gates:

```text
z = update gate       how much state to replace
r = reset gate        how much old state enters the candidate

h_t = (1 − z) · h_(t−1) + z · candidate
```

Here `z` is near 1 on the store step and near 0 while waiting. The same underlying
idea needs fewer states and parameters than an LSTM, which is why GRUs are a useful
comparison rather than a wholly different chapter.

## What the program builds

The central data structure is a trace containing every recurrent state and gate:

```text
 step  event    RNN h   LSTM c  forget  input   GRU h  update
 ────  ──────  ──────  ──────  ──────  ──────  ──────  ──────
     0  store    0.885   0.958   0.007   0.993   0.958   0.993
     1  wait     0.620   0.951   0.993   0.007   0.954   0.007
    11  wait     0.069   0.889   0.993   0.007   0.915   0.007
    21  recall   0.009   0.832   0.993   0.007   0.880   0.007
```

The gate values are fixed, interpretable values standing in for a pattern that
training learns: open on the store cue, close across distractors, expose at recall.
The cells and recurrence equations are genuine; the omission is the expensive
process by which a larger network discovers those gate settings.

## Where it falls short

- **Gates help memory; they do not remove recurrence.** Step 20 still waits for
  step 19. Training cannot parallelize across a sequence as a Transformer can.
- **Memory is still compressed.** A fixed-size state must summarize everything
  read so far. An encoder–decoder makes that weakness stark by squeezing a whole
  source sentence into one vector.
- **This laboratory supplies the gate policy.** A real LSTM or GRU learns its
  gates with backpropagation through time. Fixing them here isolates the forward
  mechanism but does not demonstrate gate learning.
- **Long is not infinite.** A forget gate of `0.993` still leaks; even gated
  memory decays across sufficiently long sequences.

## Usage

```bash
# Remember +1 across 20 distractors
node lstm-gru/index.js 20

# Longer delay and a negative signal
node lstm-gru/index.js 80 -1
```

The next stop is seq2seq: two gated recurrent networks arranged as an encoder and
decoder. That architecture solves variable-length input/output, then exposes a
new failure—the one-vector bottleneck that attention was invented to remove.
