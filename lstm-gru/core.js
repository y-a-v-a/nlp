/**
 * Gated recurrent cells, shared by the CLI and browser demo. UMD:
 * require() in Node, window.NLP.lstmGru in the browser.
 *
 * This is deliberately a forward-pass laboratory rather than a language model.
 * A signal arrives once, followed by distractors, then a recall cue. Running the
 * same sequence through three cells isolates the architectural change: a vanilla
 * RNN repeatedly rewrites one state; LSTM and GRU learnable gates can preserve it.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.lstmGru = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  function sequence(signal, delay) {
    const value = signal < 0 ? -1 : 1;
    return [{ kind: 'store', x: value }]
      .concat(Array.from({ length: Math.max(0, delay) }, () => ({ kind: 'wait', x: 0 })))
      .concat([{ kind: 'recall', x: 0 }]);
  }

  // One deliberately leaky tanh recurrence. Its 0.82 recurrent weight is the
  // repeated multiplication through which both activations and gradients fade.
  function runRnn(seq) {
    let h = 0;
    return seq.map((step, t) => {
      h = Math.tanh(1.4 * step.x + 0.82 * h);
      return { t, kind: step.kind, x: step.x, h, output: h };
    });
  }

  // Scalar LSTM:
  // c_t = f*c_(t-1) + i*g; h_t = o*tanh(c_t)
  // Gate values stand in for what training learns from the input/cue. Keeping
  // them explicit makes the routing legible without hiding it in large matrices.
  function runLstm(seq) {
    let c = 0;
    let h = 0;
    return seq.map((step, t) => {
      const store = step.kind === 'store';
      const recall = step.kind === 'recall';
      const i = sigmoid(store ? 5 : -5);
      const f = sigmoid(store ? -5 : 5);
      const o = sigmoid(recall ? 5 : -1.5);
      const g = Math.tanh(2 * step.x);
      c = f * c + i * g;
      h = o * Math.tanh(c);
      return { t, kind: step.kind, x: step.x, inputGate: i, forgetGate: f,
        outputGate: o, candidate: g, cell: c, h, output: recall ? Math.tanh(c) : h };
    });
  }

  // Scalar GRU:
  // h_t = (1-z)*h_(t-1) + z*h~. Here z means "amount to update".
  function runGru(seq) {
    let h = 0;
    return seq.map((step, t) => {
      const store = step.kind === 'store';
      const z = sigmoid(store ? 5 : -5);
      const r = sigmoid(step.kind === 'recall' ? 5 : 0);
      const candidate = Math.tanh(2 * step.x + r * 0.8 * h);
      h = (1 - z) * h + z * candidate;
      return { t, kind: step.kind, x: step.x, updateGate: z, resetGate: r,
        candidate, h, output: h };
    });
  }

  function runTrial(signal, delay) {
    const seq = sequence(signal, delay);
    const rnn = runRnn(seq);
    const lstm = runLstm(seq);
    const gru = runGru(seq);
    const last = (xs) => xs[xs.length - 1].output;
    return {
      signal: signal < 0 ? -1 : 1,
      delay: Math.max(0, delay),
      sequence: seq,
      traces: { rnn, lstm, gru },
      recalled: { rnn: last(rnn), lstm: last(lstm), gru: last(gru) },
    };
  }

  return { sigmoid, sequence, runRnn, runLstm, runGru, runTrial };
});
