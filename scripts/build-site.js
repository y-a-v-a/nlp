#!/usr/bin/env node

/**
 * Build the NLP Journey website layer.
 *
 * This is a DEV tool, not a runtime dependency: it (1) generates the root
 * `index.html` homepage/timeline and (2) injects a small, self-contained
 * navigation header + prev/next footer into every explainer page. Once run, the
 * pages are fully static — no build step is needed to view them, and each page
 * remains openable on its own (the nav uses relative links and literal palette
 * colours, so it does not depend on any shared asset).
 *
 * Re-running is idempotent: injected nav lives between HTML comment markers and
 * is replaced in place. Edit the PAGES manifest below and re-run when adding a
 * technique.
 *
 *   node scripts/build-site.js
 */

const fs = require('fs');
const path = require('path');
const posix = path.posix;

const ROOT = path.resolve(__dirname, '..');

// Palette (kept literal so the nav renders identically on every page,
// regardless of how that page defines its own CSS variables).
const ACCENT = '#C4622D';
const TEXT = 'rgb(21,20,20)';
const MUTED = 'rgba(21,20,20,0.48)';
const HAIR = 'rgba(21,20,20,0.12)';
const SANS = "system-ui,-apple-system,'Segoe UI',sans-serif";

// Docs and source render best on GitHub (Markdown rendered, JS highlighted), so
// the README / source / OVERVIEW / TASKS links point there rather than serving
// raw text from the static host.
const REPO = 'https://github.com/y-a-v-a/nlp/blob/main';

// The canonical timeline. Order here defines prev/next everywhere.
const PAGES = [
  // — Counting & Retrieval —
  { file: 'markov/index.html', title: 'Markov Chain', date: '1913 / 1948', kind: 'run', era: 'stat', desc: 'Generate text from what word tends to follow what.' },
  { file: 'ngram-markov/index.html', title: 'N-gram Markov Chain', date: '1948', kind: 'run', era: 'stat', desc: 'Wider multi-word context for more coherent text.' },
  { file: 'probability-markov/index.html', title: 'Probability Markov Chain', date: '1948', kind: 'run', era: 'stat', desc: 'Weight each next word by how often it follows.' },
  { file: 'ngram-probability-markov/index.html', title: 'N-gram + Probability', date: '1948', kind: 'run', era: 'stat', desc: 'Combine wider context with weighted selection.' },
  { file: 'zipf/index.html', title: "Zipf's Law", date: '1935–49', kind: 'run', era: 'stat', desc: 'A few words do almost all the work — predictably.' },
  { file: 'edit-distance/index.html', title: 'Edit Distance', date: '1965', kind: 'run', era: 'stat', desc: 'Fewest edits between strings; a spell-checker.' },
  { file: 'tfidf/index.html', title: 'TF-IDF', date: '1972', kind: 'run', era: 'stat', desc: 'Rank documents by how distinctive their words are.' },
  { file: 'pmi/index.html', title: 'Pointwise Mutual Information', date: '1990', kind: 'run', era: 'stat', desc: 'Which words co-occur more than chance? Collocations.' },
  { file: 'naive-bayes/index.html', title: 'Naive Bayes', date: '1990s', kind: 'run', era: 'stat', desc: 'Supervised text classification by word likelihoods.' },
  { file: 'word-vectors/index.html', title: 'Co-occurrence Word Vectors', date: 'early 1990s', kind: 'run', era: 'stat', desc: 'Know a word by the company it keeps.' },
  { file: 'bpe/index.html', title: 'Byte Pair Encoding', date: '1994 / 2016', kind: 'run', era: 'stat', desc: 'Build subword tokens by merging frequent pairs.' },
  // — Learning Representations —
  { file: 'neural-lm/index.html', title: 'Neural Language Model', date: '2003', kind: 'run', era: 'neural', desc: 'Stop counting words; learn what they mean.' },
  { file: 'rnn/index.html', title: 'Recurrent Neural Network', date: '1990 / 1997', kind: 'run', era: 'neural', desc: 'A hidden state that remembers as it reads.' },
  { file: 'attention/index.html', title: 'Attention', date: '2014–17', kind: 'run', era: 'neural', desc: 'Let every token look directly at every other.' },
  // — The Frontier —
  { file: 'modern/transformer/index.html', title: 'The Transformer', date: '2017', kind: 'concept', era: 'modern', desc: 'The full architecture built from attention.' },
  { file: 'modern/pretraining/index.html', title: 'Pretraining & Transfer Learning', date: '2018', kind: 'concept', era: 'modern', desc: 'Train once on raw text, then adapt to anything.' },
  { file: 'modern/scaling/index.html', title: 'Scaling Laws & In-Context Learning', date: '2020', kind: 'concept', era: 'modern', desc: 'Capability becomes a predictable function of scale.' },
  { file: 'modern/alignment/index.html', title: 'Alignment', date: '2022', kind: 'concept', era: 'modern', desc: 'Instruction tuning and RLHF: do what you ask.' },
  { file: 'rag/index.html', title: 'Retrieval-Augmented Generation', date: '2020→', kind: 'run', era: 'modern', desc: "Don't memorise the world — look it up." },
  { file: 'modern/reasoning/index.html', title: 'Reasoning & Test-Time Compute', date: '2024–25', kind: 'concept', era: 'modern', desc: 'Think longer before answering.' },
  { file: 'modern/agents/index.html', title: 'Tool Use & Agents', date: '2023→', kind: 'concept', era: 'modern', desc: 'From what a model can say to what it can do.' },
];

const ERAS = [
  { id: 'stat', name: 'Counting & Retrieval', range: '1910s – 1990s', blurb: 'Language as statistics: what follows what, which words matter, which documents are relevant. No labels, no learning — just counts.' },
  { id: 'neural', name: 'Learning Representations', range: '2003 – 2017', blurb: 'Stop hand-counting; let a network learn the patterns. Embeddings, memory, and finally attention — the primitive behind everything modern.' },
  { id: 'modern', name: 'The Frontier', range: '2017 → today', blurb: 'The era of scale — from a laptop’s ~17,600 training words to a frontier model’s ~15 trillion, about a billion-fold more. Mostly concept pages, since these artifacts cannot be trained on a laptop, bridging attention to the assistant reading this with you.' },
];

// ---------------------------------------------------------------------------
// Nav injection
// ---------------------------------------------------------------------------
const NAV_START = '<!--journey-nav-start-->';
const NAV_END = '<!--journey-nav-end-->';
const FOOT_START = '<!--journey-foot-start-->';
const FOOT_END = '<!--journey-foot-end-->';
const SCALE_START = '<!--journey-scale-start-->';
const SCALE_END = '<!--journey-scale-end-->';

const SCALING_PAGE = 'modern/scaling/index.html';

function rel(fromFile, toFile) {
  return posix.relative(posix.dirname(fromFile), toFile) || posix.basename(toFile);
}

function stripBlock(html, start, end) {
  const s = html.indexOf(start);
  const e = html.indexOf(end);
  if (s !== -1 && e !== -1) return html.slice(0, s) + html.slice(e + end.length);
  return html;
}

function topNav(i) {
  const p = PAGES[i];
  const home = rel(p.file, 'index.html');
  const prev = i > 0 ? rel(p.file, PAGES[i - 1].file) : null;
  const next = i < PAGES.length - 1 ? rel(p.file, PAGES[i + 1].file) : null;
  const link = (href, label) =>
    `<a href="${href}" style="color:${ACCENT};text-decoration:none;">${label}</a>`;
  const muted = (label) => `<span style="color:${MUTED};">${label}</span>`;
  const prevEl = prev ? link(prev, '&larr; prev') : muted('&larr; prev');
  const nextEl = next ? link(next, 'next &rarr;') : muted('next &rarr;');
  return (
    `${NAV_START}\n` +
    `<nav aria-label="Journey" style="display:flex;justify-content:space-between;align-items:baseline;` +
    `flex-wrap:wrap;gap:0.5rem 1rem;` +
    `margin-bottom:1.75rem;font-size:0.8rem;font-family:${SANS};">` +
    `<a href="${home}" style="color:${ACCENT};text-decoration:none;font-weight:700;">&#8689; The NLP Journey</a>` +
    `<span style="display:flex;gap:0.9rem;">${prevEl}<span style="color:${MUTED};">${i + 1} / ${PAGES.length}</span>${nextEl}</span>` +
    `</nav>\n${NAV_END}`
  );
}

function bottomNav(i) {
  const p = PAGES[i];
  const home = rel(p.file, 'index.html');
  const prev = i > 0 ? PAGES[i - 1] : null;
  const next = i < PAGES.length - 1 ? PAGES[i + 1] : null;
  const cell = (align, html) =>
    `<span style="flex:1;text-align:${align};">${html}</span>`;
  const a = (href, label) =>
    `<a href="${href}" style="color:${ACCENT};text-decoration:none;">${label}</a>`;
  // External (GitHub) links open in a new tab.
  const aExt = (href, label) =>
    `<a href="${href}" target="_blank" rel="noopener" style="color:${ACCENT};text-decoration:none;">${label}</a>`;
  const prevEl = prev
    ? a(rel(p.file, prev.file), `&larr; ${prev.title}`)
    : `<span style="color:${MUTED};">&larr; start</span>`;
  const nextEl = next
    ? a(rel(p.file, next.file), `${next.title} &rarr;`)
    : `<span style="color:${MUTED};">end &rarr;</span>`;
  // Runnable pages link their README and source on GitHub (rendered Markdown /
  // highlighted JS). Concept pages have neither.
  const dir = posix.dirname(p.file);
  const sep = `<span style="color:${MUTED};"> &middot; </span>`;
  const source =
    p.kind === 'run'
      ? sep + aExt(`${REPO}/${dir}/README.md`, 'README') + sep + aExt(`${REPO}/${dir}/index.js`, 'source')
      : '';
  return (
    `${FOOT_START}\n` +
    `<nav aria-label="Page" style="display:flex;flex-wrap:wrap;gap:0.5rem 1rem;align-items:baseline;` +
    `margin-top:2.5rem;padding-top:1.1rem;` +
    `border-top:1px solid ${HAIR};font-size:0.82rem;font-family:${SANS};">` +
    cell('left', prevEl) +
    cell('center', a(home, 'All techniques') + source) +
    cell('right', nextEl) +
    `</nav>\n${FOOT_END}`
  );
}

// A concrete "scale gap" callout, injected into concept pages so every
// frontier-era page makes the magnitude — and the human undertaking — explicit,
// anchored to numbers the visitor just ran. Skipped on the scaling page, which
// carries the full scale-ladder visual instead. Numbers are public anchors
// (GPT-3: 175B params / ~300B tokens; Llama 3: ~15T tokens); compute, team size,
// and cost for closed models are necessarily approximate and marked as such.
function scaleStrip(i) {
  const p = PAGES[i];
  const ladder = rel(p.file, SCALING_PAGE);
  return (
    `${SCALE_START}\n` +
    `<aside style="border-left:3px solid ${ACCENT};background:rgba(196,98,45,0.07);` +
    `border-radius:0 6px 6px 0;padding:0.85rem 1.05rem;margin-bottom:1.9rem;` +
    `font-size:0.82rem;line-height:1.6;font-family:${SANS};color:${TEXT};">` +
    `<strong style="color:${ACCENT};">How big is &ldquo;beyond a laptop&rdquo;?</strong> ` +
    `The network you can run in this repo (<code>neural-lm/</code>) learns from ` +
    `<strong>~17,600 words</strong> with <strong>~17,000 parameters</strong> in ` +
    `<strong>~4 seconds</strong> on one CPU core. GPT-3 (2020): <strong>175 billion</strong> ` +
    `parameters trained on <strong>~300 billion</strong> words. A current open frontier ` +
    `model such as Llama 3: <strong>~15 trillion</strong> words and compute on the order of ` +
    `<strong>10<sup>25</sup> operations</strong>, across tens of thousands of specialised ` +
    `chips for weeks. That is roughly <strong>ten-million times</strong> the parameters and ` +
    `<strong>a billion times</strong> the data: a person reading non-stop at 200 words a ` +
    `minute would finish this repo&rsquo;s training text in about <strong>1.5 hours</strong> ` +
    `&mdash; and a frontier model&rsquo;s in about <strong>140,000 years</strong>. Beyond the ` +
    `hardware it takes large research teams, months of work, and energy and money ` +
    `<em>estimated in the millions</em>. ` +
    `That gap is why this page explains the idea instead of running it. ` +
    `<a href="${ladder}" style="color:${ACCENT};">See the scale ladder &rarr;</a>` +
    `</aside>\n${SCALE_END}`
  );
}

function injectNav() {
  let count = 0;
  PAGES.forEach((p, i) => {
    const abs = path.join(ROOT, p.file);
    if (!fs.existsSync(abs)) {
      console.warn(`  ! missing: ${p.file}`);
      return;
    }
    let html = fs.readFileSync(abs, 'utf8');
    html = stripBlock(html, NAV_START, NAV_END);
    html = stripBlock(html, FOOT_START, FOOT_END);
    html = stripBlock(html, SCALE_START, SCALE_END);

    // Insert top nav as the first thing inside <body>.
    html = html.replace(/<body>\s*/, `<body>\n${topNav(i)}\n`);
    // On concept pages (except the scaling page, which has the full ladder),
    // insert the scale-gap callout just before "How it works" — after the page
    // title and its own concept note, so it reads in context.
    if (p.kind === 'concept' && p.file !== SCALING_PAGE) {
      // Match preceding whitespace too, so repeated runs don't accumulate blank
      // lines before the first <h2> (keeps injection idempotent).
      html = html.replace(/\s*<h2/, `\n\n${scaleStrip(i)}\n\n<h2`);
    }
    // Insert bottom nav just before </body>.
    html = html.replace(/\s*<\/body>/, `\n${bottomNav(i)}\n</body>`);

    fs.writeFileSync(abs, html);
    count++;
  });
  console.log(`  injected nav into ${count} pages`);
}

// ---------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------
function homepage() {
  const stop = (p) => {
    const badge =
      p.kind === 'run'
        ? '<span class="badge run">Runnable</span>'
        : '<span class="badge concept">Concept</span>';
    return `      <a class="stop" href="${p.file}">
        <div class="stop-body">
          <div class="stop-meta"><span class="stop-date">${p.date}</span>${badge}</div>
          <div class="stop-title">${p.title}</div>
          <div class="stop-desc">${p.desc}</div>
        </div>
      </a>`;
  };

  const groups = ERAS.map((era) => {
    const stops = PAGES.filter((p) => p.era === era.id).map(stop).join('\n');
    return `    <section class="era-group" aria-label="${era.name}">
      <div class="era-head">
        <h2 class="era-name">${era.name}</h2>
        <span class="era-range">${era.range}</span>
      </div>
      <p class="era-blurb">${era.blurb}</p>
      <div class="stops">
${stops}
      </div>
    </section>`;
  }).join('\n\n');

  const runCount = PAGES.filter((p) => p.kind === 'run').length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The NLP Journey — from Markov chains to frontier models</title>
<meta name="description" content="A runnable, self-contained tour of how natural language processing progressed, from Markov chains in the 1940s to today's tool-using agents — with example code at every step.">
<meta name="theme-color" content="#F9F7F3">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #F9F7F3;
  --text: rgb(21, 20, 20);
  --accent: #C4622D;
  --accent-faint: rgba(196, 98, 45, 0.07);
  --accent-border: rgba(196, 98, 45, 0.28);
  --muted: rgba(21, 20, 20, 0.48);
  --hair: rgba(21, 20, 20, 0.12);
  --mono: 'Courier New', monospace;
}
body {
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: 16px;
  line-height: 1.7;
  max-width: 720px;
  margin: 0 auto;
  padding: 3.5rem 1.75rem 5rem;
}
header { margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 2px solid var(--accent); }
.kicker { font-size: 0.75rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); font-weight: 700; margin-bottom: 0.7rem; }
h1 { font-size: 2.6rem; font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 0.6rem; }
.lede { color: var(--muted); font-size: 1.05rem; max-width: 42rem; }
.intro { margin: 1.75rem 0 0.5rem; }
.intro a { color: var(--accent); }
.meta-line { font-size: 0.85rem; color: var(--muted); margin-top: 1rem; }

.era-group { margin: 3rem 0; }
.era-head { display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 0.3rem; }
.era-name { font-size: 1.15rem; font-weight: 700; letter-spacing: -0.01em; margin: 0; }
.era-range { font-family: var(--mono); font-size: 0.8rem; color: var(--accent); }
.era-blurb { font-size: 0.9rem; color: var(--muted); margin-bottom: 1.25rem; max-width: 40rem; }

.stops { position: relative; border-left: 2px solid var(--accent-border); margin-left: 5px; padding-left: 1.6rem; }
.stop { display: block; position: relative; padding: 0.85rem 0; text-decoration: none; color: var(--text); border-bottom: 1px solid var(--hair); }
.stop:last-child { border-bottom: none; }
.stop::before {
  content: ''; position: absolute; left: calc(-1.6rem - 6px); top: 1.35rem;
  width: 11px; height: 11px; border-radius: 50%;
  background: var(--bg); border: 2px solid var(--accent); transition: background 0.12s ease;
}
.stop:hover::before { background: var(--accent); }
.stop-meta { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.15rem; }
.stop-date { font-family: var(--mono); font-size: 0.74rem; color: var(--muted); }
.badge { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 700; padding: 0.08rem 0.45rem; border-radius: 10px; }
.badge.run { background: var(--accent); color: #fff; }
.badge.concept { background: rgba(21,20,20,0.08); color: var(--muted); }
.stop-title { font-size: 1.05rem; font-weight: 650; line-height: 1.3; }
.stop:hover .stop-title { color: var(--accent); }
.stop-desc { font-size: 0.88rem; color: var(--muted); }

footer { margin-top: 3.5rem; padding-top: 1.25rem; border-top: 1px solid var(--accent-border); font-size: 0.85rem; color: var(--muted); line-height: 1.65; }
footer a { color: var(--accent); }

/* keyboard focus + reduced motion */
a:focus-visible, .stop:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 3px; }
.stop:focus-visible::before { background: var(--accent); }
.stop:focus-visible .stop-title { color: var(--accent); }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; scroll-behavior: auto !important; } }
</style>
</head>
<body>

<header>
  <p class="kicker">A working museum of natural language processing</p>
  <h1>The NLP Journey</h1>
  <p class="lede">How we got from counting words to conversing with machines — told through ${runCount} small programs you can run, plus concept pages for the era that outgrew the laptop.</p>
</header>

<p class="intro">Each stop below is a self-contained explainer. The <span style="color:var(--accent);font-weight:650;">Runnable</span> ones come with commented code and a deep-dive README; the <span style="color:var(--muted);font-weight:650;">Concept</span> ones cover the frontier era, defined by a scale no laptop can reach. They are arranged in rough historical order — because each technique was a direct response to the limits of the one before. Start anywhere, or read the full story in <a href="${REPO}/OVERVIEW.md" target="_blank" rel="noopener">OVERVIEW.md</a>.</p>

${groups}

<footer>
  Built as a teaching resource — every diagram uses real output from the corpora in <code>corpora/</code>. The narrative lives in <a href="${REPO}/OVERVIEW.md" target="_blank" rel="noopener">OVERVIEW.md</a>; the build plan in <a href="${REPO}/TASKS.md" target="_blank" rel="noopener">TASKS.md</a>. The chain runs unbroken from Markov chains (1913) to tool-using agents — and the open question of whether any of it amounts to understanding.
</footer>

</body>
</html>
`;
}

// ---------------------------------------------------------------------------
console.log('Building the NLP Journey site...');
fs.writeFileSync(path.join(ROOT, 'index.html'), homepage());
console.log('  wrote index.html homepage');
injectNav();
console.log('Done.');
