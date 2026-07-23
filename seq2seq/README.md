# seq2seq & the Encoder–Decoder Bottleneck

*Sutskever et al. / Cho et al. 2014 · one sequence in, another sequence out*

A sequence-to-sequence system joins two recurrent networks. The encoder reads a
variable-length source into one fixed-size context vector; the decoder generates
a target from that vector. It made neural machine translation possible—and made
the cost of squeezing a sentence through one fixed point impossible to ignore.

This dependency-free laboratory uses sequence reversal, the classic diagnostic
task: every source token must reappear in the opposite order. Its encoder state is
shown as explicit token slots rather than opaque learned floats. Once the source
outgrows those slots, the decoder prints `<?>` for information that cannot cross
the bottleneck. The representation is simplified; the architectural constraint
is the genuine one.

## Usage

```bash
node seq2seq/index.js "the cat sat on the warm red mat" 5
node seq2seq/index.js "one two three four" 6
```

The output includes the context-vector data structure, target, decoded sequence,
and exact-token accuracy. The browser demo lets source length and context capacity
move independently, making the failure boundary visible.

## Where it falls short

- A fixed-size context must compress an arbitrarily long source.
- Encoder and decoder remain sequential recurrent networks.
- The laboratory exposes capacity with token slots; real seq2seq learns dense
  vectors and fails gradually rather than printing a literal unknown marker.

Bahdanau attention removed the first constraint by letting every decoder step look
back at all encoder states instead of relying on the final one alone.
