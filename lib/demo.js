/**
 * Shared browser runtime for the "Try it" demos.
 *
 * Loaded via <script src="../lib/demo.js"> (it is not used by Node). Exposes
 * window.NLP.demo with a corpus loader and a few tiny DOM helpers, so each
 * technique's inline init script stays short and consistent.
 *
 * The demos fetch the real corpus files, which browsers only allow over http,
 * not file:// — so loadCorpus reports a friendly error the pages can show,
 * telling the visitor to run a local server.
 *
 * It also implements the "your own text" option once for every demo:
 * customCorpus(select) appends the option and a paste-a-text panel to a
 * corpus <select>, and loadCorpus('custom') resolves to whatever the visitor
 * applied. The text never leaves the browser.
 */
(function (root) {
  root.NLP = root.NLP || {};

  var CORPORA = {
    shakespeare: '../corpora/sonnets-shakespeare.txt',
    browning: '../corpora/sonnets-browning.txt',
  };

  // ---- "Your own text" ------------------------------------------------------
  // Shared across all demos on a page (and, via sessionStorage, across pages,
  // so a visitor can carry their text through the whole journey). Bounds: below
  // ~1,000 words the statistical demos get repetitive, so we advise but don't
  // forbid; above MAX_CHARS we truncate so the heavier demos (the in-browser
  // training loops) stay comfortably responsive. 300k characters is ~50,000
  // words — Wittgenstein's Tractatus fits with room to spare.
  var MIN_WORDS_HARD = 150;
  var MIN_WORDS_ADVISED = 1000;
  var MAX_CHARS = 300000;
  var STORE_KEY = 'nlp-journey-custom-text';

  var customText = '';
  try {
    customText = root.sessionStorage.getItem(STORE_KEY) || '';
  } catch (e) { /* private mode etc. — the feature degrades to per-page */ }

  function countWords(text) {
    var t = root.NLP.tokenize ? root.NLP.tokenize(text) : text.split(/\s+/).filter(Boolean);
    return t.length;
  }

  // Fetch a corpus by key ('shakespeare' | 'browning' | 'custom'). Resolves to
  // the text, or rejects with a message suitable for display.
  function loadCorpus(key) {
    if (key === 'custom') {
      return customText
        ? Promise.resolve(customText)
        : Promise.reject(new Error('Paste some text first, then press “Use this text”.'));
    }
    var url = CORPORA[key] || key;
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }

  // Wire the "your own text" option into a corpus <select>. Call this BEFORE
  // the page registers its own 'change' listener on the select: when the
  // visitor picks the option with no text applied yet, this handler swallows
  // the event (the panel opens, the demo keeps its last output) — that only
  // works if it runs first.
  function customCorpus(select, opts) {
    opts = opts || {};
    var opt = document.createElement('option');
    opt.value = 'custom';
    opt.textContent = 'Your own text…';
    select.appendChild(opt);

    var panel = document.createElement('div');
    panel.className = 'demo-custom';
    panel.hidden = true;
    panel.innerHTML =
      '<textarea rows="7" spellcheck="false" placeholder="Paste your text here — an essay, a chapter, a heap of emails. ' +
      'The more the better; ~1,000 words is a sensible minimum."></textarea>' +
      '<div class="demo-custom-row">' +
      '<button type="button">Use this text</button>' +
      '<label class="demo-custom-file">or load a .txt file' +
      '<input type="file" accept=".txt,text/plain"></label>' +
      '</div>' +
      '<p class="demo-custom-note"></p>';
    // The select sits inside a .demo-field inside a .demo-controls row; the
    // panel goes directly under that row so it spans the demo's full width.
    var row = select.closest('.demo-controls') || select.parentNode;
    row.parentNode.insertBefore(panel, row.nextSibling);

    var ta = panel.querySelector('textarea');
    var note = panel.querySelector('.demo-custom-note');
    ta.value = customText;

    function setNote(msg, isWarn) {
      note.innerHTML = msg;
      note.className = 'demo-custom-note' + (isWarn ? ' warn' : '');
    }
    // Technique-specific advice, e.g. "blank lines separate documents" (tfidf).
    var privacyNote = (opts.hint ? opts.hint + ' ' : '') +
      'Nothing is uploaded — the text stays in this browser tab.';
    setNote(customText
      ? 'Using your text (' + countWords(customText).toLocaleString() + ' words). ' + privacyNote
      : privacyNote + ' Capped at ' + MAX_CHARS.toLocaleString() + ' characters (~50,000 words).');

    function apply() {
      var text = ta.value;
      var truncated = false;
      if (text.length > MAX_CHARS) {
        text = text.slice(0, MAX_CHARS);
        ta.value = text;
        truncated = true;
      }
      var n = countWords(text);
      if (n < MIN_WORDS_HARD) {
        setNote('That is only ' + n + ' word' + (n === 1 ? '' : 's') + ' — statistics need more to count. ' +
          'Please paste at least a few hundred (~1,000 works well).', true);
        return;
      }
      customText = text;
      try { root.sessionStorage.setItem(STORE_KEY, text); } catch (e) { /* ignore */ }
      var msg = 'Using your text (' + n.toLocaleString() + ' words). ' + privacyNote;
      if (truncated) msg += ' Kept the first ' + MAX_CHARS.toLocaleString() + ' characters.';
      if (n < MIN_WORDS_ADVISED) {
        msg += ' With under ' + MIN_WORDS_ADVISED.toLocaleString() +
          ' words expect repetitive output — every technique here is a creature of statistics.';
      }
      setNote(msg, n < MIN_WORDS_ADVISED);
      if (select.value !== 'custom') select.value = 'custom';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    panel.querySelector('button').addEventListener('click', apply);
    panel.querySelector('input[type="file"]').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { ta.value = String(reader.result || ''); apply(); };
      reader.readAsText(file);
      e.target.value = '';
    });

    select.addEventListener('change', function (e) {
      panel.hidden = select.value !== 'custom';
      if (select.value === 'custom' && !customText) {
        // Nothing applied yet: open the panel but keep the demo as it was.
        e.stopImmediatePropagation();
        setNote('Paste text below (or load a .txt file), then press <strong>Use this text</strong>. ' + privacyNote);
        ta.focus();
      }
    });
  }

  // Run an async setup, and if it fails (typically because the page was opened
  // from file:// rather than served), replace the demo body with a hint.
  function boot(rootEl, setup) {
    Promise.resolve()
      .then(setup)
      .catch(function (err) {
        rootEl.innerHTML =
          '<p class="demo-hint">This live demo needs the page to be <strong>served</strong>, ' +
          'not opened from a file. From the repo root run <code>npx serve</code> ' +
          '(or <code>python3 -m http.server</code>) and reload.<br>' +
          '<span class="demo-err">' + (err && err.message ? err.message : err) + '</span></p>';
      });
  }

  // Minimal helpers
  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  root.NLP.demo = {
    loadCorpus: loadCorpus,
    customCorpus: customCorpus,
    boot: boot,
    el: el,
    esc: esc,
    CORPORA: CORPORA,
  };
})(typeof self !== 'undefined' ? self : this);
