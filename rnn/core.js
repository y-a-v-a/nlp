/**
 * Character-level RNN core, shared by the CLI and the in-browser demo. UMD:
 * require() in Node, window.NLP.rnn in the browser.
 *
 * Exposed as a STEPPABLE trainer: createModel() builds it and each step() runs
 * one backprop-through-time iteration, returning the smoothed loss. The CLI
 * loops; the browser runs steps in small batches per frame so the tab stays
 * responsive. Same code both ways — the demo and CLI train the identical net.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NLP = root.NLP || {};
    root.NLP.rnn = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function mulberry32(seed) {
    let a = seed;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Build a clean character stream from raw text via the shared word tokenizer
  // (letters a-z + space). Kept here so the CLI and demo derive it identically.
  function toCharStream(tokenizeFn, raw) {
    return tokenizeFn(raw).join(' ');
  }

  function createModel(charStream, opts) {
    opts = opts || {};
    const H = opts.H || 64;
    const seqLen = opts.seqLen || 25;
    const lr = opts.lr || 0.1;
    const rng = opts.rng || (opts.seed != null ? mulberry32(opts.seed) : Math.random);

    const chars = [...new Set(charStream)].sort();
    const Vc = chars.length;
    const charToId = new Map(chars.map((c, i) => [c, i]));
    const data = [...charStream].map((c) => charToId.get(c));

    const init = (n) => {
      const arr = new Float64Array(n);
      for (let i = 0; i < n; i++) arr[i] = (rng() * 2 - 1) * 0.01;
      return arr;
    };
    const Wxh = init(H * Vc);
    const Whh = init(H * H);
    const Why = init(Vc * H);
    const bh = new Float64Array(H);
    const by = new Float64Array(Vc);

    function lossFun(inputs, targets, hprev) {
      const xs = inputs.length;
      const hs = [];
      const ps = [];
      let loss = 0;
      let prev = hprev;
      for (let t = 0; t < xs; t++) {
        const h = new Float64Array(H);
        const inId = inputs[t];
        for (let i = 0; i < H; i++) {
          let s = bh[i] + Wxh[i * Vc + inId];
          const base = i * H;
          for (let j = 0; j < H; j++) s += Whh[base + j] * prev[j];
          h[i] = Math.tanh(s);
        }
        const y = new Float64Array(Vc);
        let max = -Infinity;
        for (let k = 0; k < Vc; k++) {
          let s = by[k];
          const base = k * H;
          for (let i = 0; i < H; i++) s += Why[base + i] * h[i];
          y[k] = s;
          if (s > max) max = s;
        }
        let sum = 0;
        for (let k = 0; k < Vc; k++) {
          y[k] = Math.exp(y[k] - max);
          sum += y[k];
        }
        for (let k = 0; k < Vc; k++) y[k] /= sum;
        loss += -Math.log(y[targets[t]] + 1e-12);
        hs[t] = h;
        ps[t] = y;
        prev = h;
      }

      const dWxh = new Float64Array(H * Vc);
      const dWhh = new Float64Array(H * H);
      const dWhy = new Float64Array(Vc * H);
      const dbh = new Float64Array(H);
      const dby = new Float64Array(Vc);
      const dhnext = new Float64Array(H);

      for (let t = xs - 1; t >= 0; t--) {
        const h = hs[t];
        const hprevT = t === 0 ? hprev : hs[t - 1];
        const dy = ps[t];
        dy[targets[t]] -= 1;
        const dh = new Float64Array(H);
        for (let k = 0; k < Vc; k++) {
          const g = dy[k];
          dby[k] += g;
          const base = k * H;
          for (let i = 0; i < H; i++) {
            dWhy[base + i] += g * h[i];
            dh[i] += Why[base + i] * g;
          }
        }
        for (let i = 0; i < H; i++) dh[i] += dhnext[i];
        const inId = inputs[t];
        const dhraw = new Float64Array(H);
        for (let i = 0; i < H; i++) {
          dhraw[i] = (1 - h[i] * h[i]) * dh[i];
          dbh[i] += dhraw[i];
          dWxh[i * Vc + inId] += dhraw[i];
          const base = i * H;
          for (let j = 0; j < H; j++) dWhh[base + j] += dhraw[i] * hprevT[j];
        }
        for (let j = 0; j < H; j++) {
          let s = 0;
          for (let i = 0; i < H; i++) s += Whh[i * H + j] * dhraw[i];
          dhnext[j] = s;
        }
      }

      const clip = (arr) => {
        for (let i = 0; i < arr.length; i++) {
          if (arr[i] > 5) arr[i] = 5;
          else if (arr[i] < -5) arr[i] = -5;
        }
      };
      clip(dWxh); clip(dWhh); clip(dWhy); clip(dbh); clip(dby);

      return { loss, grads: { dWxh, dWhh, dWhy, dbh, dby }, hlast: hs[xs - 1] };
    }

    const mem = {
      dWxh: new Float64Array(H * Vc),
      dWhh: new Float64Array(H * H),
      dWhy: new Float64Array(Vc * H),
      dbh: new Float64Array(H),
      dby: new Float64Array(Vc),
    };
    const paramOf = { dWxh: Wxh, dWhh: Whh, dWhy: Why, dbh: bh, dby: by };

    let p = 0;
    let hprev = new Float64Array(H);
    let smoothLoss = Math.log(Vc); // uniform-guesser baseline
    let iter = 0;

    // One backprop-through-time iteration. Returns the smoothed loss/char.
    function step() {
      if (p + seqLen + 1 >= data.length) {
        p = 0;
        hprev = new Float64Array(H);
      }
      const inputs = data.slice(p, p + seqLen);
      const targets = data.slice(p + 1, p + seqLen + 1);
      const { loss, grads, hlast } = lossFun(inputs, targets, hprev);
      hprev = hlast;
      smoothLoss = smoothLoss * 0.999 + (loss / seqLen) * 0.001;
      for (const key of Object.keys(grads)) {
        const g = grads[key];
        const m = mem[key];
        const param = paramOf[key];
        for (let i = 0; i < g.length; i++) {
          m[i] += g[i] * g[i];
          param[i] -= (lr * g[i]) / Math.sqrt(m[i] + 1e-8);
        }
      }
      p += seqLen;
      iter++;
      return smoothLoss;
    }

    // Sample n characters starting from seedId (fresh zero hidden state).
    function sample(seedId, n) {
      let h = new Float64Array(H);
      let id = seedId;
      let out = chars[id];
      for (let s = 0; s < n; s++) {
        const hn = new Float64Array(H);
        for (let i = 0; i < H; i++) {
          let acc = bh[i] + Wxh[i * Vc + id];
          const base = i * H;
          for (let j = 0; j < H; j++) acc += Whh[base + j] * h[j];
          hn[i] = Math.tanh(acc);
        }
        const y = new Float64Array(Vc);
        let max = -Infinity;
        for (let k = 0; k < Vc; k++) {
          let acc = by[k];
          const base = k * H;
          for (let i = 0; i < H; i++) acc += Why[base + i] * hn[i];
          y[k] = acc;
          if (acc > max) max = acc;
        }
        let sum = 0;
        for (let k = 0; k < Vc; k++) { y[k] = Math.exp(y[k] - max); sum += y[k]; }
        let r = rng() * sum;
        let pick = 0;
        for (let k = 0; k < Vc; k++) { r -= y[k]; if (r <= 0) { pick = k; break; } }
        out += chars[pick];
        id = pick;
        h = hn;
      }
      return out;
    }

    // Run the trained net over a probe string; return per-character hidden
    // activations (first `dims` units) — the recurrent memory in motion.
    function hiddenTrace(probe, dims) {
      const n = dims || 4;
      let h = new Float64Array(H);
      const trace = [];
      for (const ch of probe) {
        const id = charToId.get(ch);
        if (id === undefined) continue;
        const hn = new Float64Array(H);
        for (let i = 0; i < H; i++) {
          let acc = bh[i] + Wxh[i * Vc + id];
          const base = i * H;
          for (let j = 0; j < H; j++) acc += Whh[base + j] * h[j];
          hn[i] = Math.tanh(acc);
        }
        const row = [];
        for (let d = 0; d < n; d++) row.push(hn[d]);
        trace.push({ ch: ch, h: row });
        h = hn;
      }
      return trace;
    }

    return {
      chars, Vc, H, seqLen,
      dataLength: data.length,
      idOf: (c) => charToId.get(c),
      get smoothLoss() { return smoothLoss; },
      get iter() { return iter; },
      step, sample, hiddenTrace,
    };
  }

  return { createModel: createModel, mulberry32: mulberry32, toCharStream: toCharStream };
});
