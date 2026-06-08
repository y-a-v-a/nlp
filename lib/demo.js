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
 */
(function (root) {
  root.NLP = root.NLP || {};

  var CORPORA = {
    shakespeare: '../corpora/sonnets-shakespeare.txt',
    browning: '../corpora/sonnets-browning.txt',
  };

  // Fetch a corpus by key ('shakespeare' | 'browning'). Resolves to the text,
  // or rejects with a message suitable for display.
  function loadCorpus(key) {
    var url = CORPORA[key] || key;
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
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

  root.NLP.demo = { loadCorpus: loadCorpus, boot: boot, el: el, esc: esc, CORPORA: CORPORA };
})(typeof self !== 'undefined' ? self : this);
