#!/usr/bin/env node

const fs = require('fs');
const { tokenize } = require('../lib/tokenize');

// Validate arguments
if (process.argv.length < 3) {
  console.error('Usage: node index.js <path-to-text-file> [iterations] [sample-length]');
  process.exit(1);
}

const filePath = process.argv[2];
const iterations = parseInt(process.argv[3]) || 5000;
const sampleLength = parseInt(process.argv[4]) || 200;

// Deterministic PRNG (mulberry32) so weight init, Adagrad, and sampling are
// reproducible — the README/HTML numbers come from this fixed seed.
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
const rand = mulberry32(42);

try {
  const raw = fs.readFileSync(filePath, 'utf8');

  // We work at the CHARACTER level. Reuse the shared word tokenizer to normalise
  // (lowercase, strip punctuation), then rejoin with single spaces. The result
  // is a clean stream over ~27 symbols: the letters a–z plus space.
  const charStream = tokenize(raw).join(' ');
  if (charStream.length === 0) {
    console.error('No text found in the file.');
    process.exit(1);
  }

  const chars = [...new Set(charStream)].sort();
  const Vc = chars.length;
  const charToId = new Map(chars.map((c, i) => [c, i]));
  const data = [...charStream].map((c) => charToId.get(c));

  // -------------------------------------------------------------------------
  // Vanilla RNN:  h_t = tanh(Wxh·x_t + Whh·h_{t-1} + bh),  y_t = Why·h_t + by
  // The hidden state h carries information forward, so a prediction can depend
  // on characters seen many steps earlier — a memory an n-gram model lacks.
  // -------------------------------------------------------------------------
  const H = 64; // hidden units
  const seqLen = 25; // characters of backprop-through-time per step
  const lr = 0.1;

  const init = (n) => {
    const arr = new Float64Array(n);
    for (let i = 0; i < n; i++) arr[i] = (rand() * 2 - 1) * 0.01;
    return arr;
  };
  const Wxh = init(H * Vc);
  const Whh = init(H * H);
  const Why = init(Vc * H);
  const bh = new Float64Array(H);
  const by = new Float64Array(Vc);

  console.log('Character-level recurrent neural network (RNN)');
  console.log('─'.repeat(56));
  console.log(`Characters in stream: ${data.length}`);
  console.log(`Symbol vocabulary:    ${Vc}  (${chars.join('')})`);
  console.log(`Hidden units:         ${H}`);
  console.log(`Backprop length:      ${seqLen} chars\n`);

  // Forward + backward through time over one length-seqLen window.
  function lossFun(inputs, targets, hprev) {
    const xs = inputs.length;
    const hs = []; // hs[t] = hidden state after step t
    const ps = []; // ps[t] = softmax distribution at step t
    let loss = 0;

    let prev = hprev;
    for (let t = 0; t < xs; t++) {
      const h = new Float64Array(H);
      const inId = inputs[t];
      for (let i = 0; i < H; i++) {
        let s = bh[i] + Wxh[i * Vc + inId]; // x_t is one-hot → pick one column
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

    // Backward through time
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
      dy[targets[t]] -= 1; // dL/dlogits = p - onehot

      const dh = new Float64Array(H);
      for (let k = 0; k < Vc; k++) {
        const g = dy[k];
        dby[k] += g;
        const base = k * H;
        for (let i = 0; i < H; i++) {
          dWhy[base + i] += g * h[i];
          dh[i] += Why[base + i] * g; // uses pre-update Why
        }
      }
      for (let i = 0; i < H; i++) dh[i] += dhnext[i];

      const inId = inputs[t];
      const dhraw = new Float64Array(H);
      for (let i = 0; i < H; i++) {
        dhraw[i] = (1 - h[i] * h[i]) * dh[i]; // tanh derivative
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

    // Clip gradients to mitigate exploding gradients (a real RNN pain point).
    const clip = (arr) => {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] > 5) arr[i] = 5;
        else if (arr[i] < -5) arr[i] = -5;
      }
    };
    clip(dWxh);
    clip(dWhh);
    clip(dWhy);
    clip(dbh);
    clip(dby);

    return {
      loss,
      grads: { dWxh, dWhh, dWhy, dbh, dby },
      hlast: hs[xs - 1],
    };
  }

  // Generate text by sampling from the model, one character at a time.
  function sampleText(seedId, h0, n) {
    let h = Float64Array.from(h0);
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
      for (let k = 0; k < Vc; k++) {
        y[k] = Math.exp(y[k] - max);
        sum += y[k];
      }
      let r = rand() * sum;
      let pick = 0;
      for (let k = 0; k < Vc; k++) {
        r -= y[k];
        if (r <= 0) {
          pick = k;
          break;
        }
      }
      out += chars[pick];
      id = pick;
      h = hn;
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Training with Adagrad (per-parameter adaptive learning rate).
  // -------------------------------------------------------------------------
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
  let smoothLoss = Math.log(Vc); // per-character loss of a uniform guesser

  console.log(`Sample before training (iteration 0):`);
  console.log(`  "${sampleText(charToId.get(' '), new Float64Array(H), 120)}"\n`);

  const reportEvery = Math.max(1, Math.floor(iterations / 10));
  for (let n = 0; n < iterations; n++) {
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

    if (n % reportEvery === 0 || n === iterations - 1) {
      console.log(
        `iter ${String(n).padStart(5)}  smoothed loss/char ${smoothLoss.toFixed(4)}`,
      );
    }
    p += seqLen;
  }

  // -------------------------------------------------------------------------
  // Data structure: the hidden state IS the memory. Run the trained network
  // over a short phrase and show a few hidden units changing character by
  // character — the recurrent state in motion.
  // -------------------------------------------------------------------------
  const probe = 'shall i compare';
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
    trace.push({ ch, h: [hn[0], hn[1], hn[2], hn[3]] });
    h = hn;
  }
  console.log('\nHidden state (first 4 of 64 units) as it reads "shall i compare":');
  console.log("  char │  h0     h1     h2     h3");
  console.log('  ─────┼───────────────────────────');
  for (const step of trace) {
    const label = step.ch === ' ' ? '␣' : step.ch;
    console.log(
      `   ${label}   │ ${step.h.map((v) => v.toFixed(2).padStart(6)).join(' ')}`,
    );
  }

  // Readable result: a sample from the trained model.
  console.log(`\nSample after ${iterations} iterations:`);
  console.log(`  "${sampleText(charToId.get(' '), new Float64Array(H), sampleLength)}"`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
