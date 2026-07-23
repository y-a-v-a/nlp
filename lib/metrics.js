(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NLP = root.NLP || {}; root.NLP.metrics = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  function evaluate(truth, predicted, labels) {
    if (truth.length !== predicted.length) throw new Error('truth and predicted lengths differ');
    const names = labels || [...new Set(truth.concat(predicted))];
    if (labels) {
      const known = new Set(names);
      const stray = truth.concat(predicted).find(l => !known.has(l));
      if (stray !== undefined) throw new Error(`label "${stray}" appears in the data but not in the label list`);
    }
    const matrix = {};
    names.forEach(a => { matrix[a] = {}; names.forEach(p => { matrix[a][p] = 0; }); });
    truth.forEach((actual, i) => { matrix[actual][predicted[i]]++; });
    const perLabel = {};
    let correct = 0;
    names.forEach(label => {
      const tp = matrix[label][label]; correct += tp;
      const fp = names.reduce((s, actual) => s + (actual === label ? 0 : matrix[actual][label]), 0);
      const fn = names.reduce((s, guess) => s + (guess === label ? 0 : matrix[label][guess]), 0);
      const precision = tp + fp ? tp / (tp + fp) : 0;
      const recall = tp + fn ? tp / (tp + fn) : 0;
      perLabel[label] = { precision, recall, f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0, support: tp + fn };
    });
    const macroF1 = names.reduce((s, l) => s + perLabel[l].f1, 0) / names.length;
    return { labels: names, matrix, perLabel, accuracy: truth.length ? correct / truth.length : 0, macroF1, total: truth.length };
  }
  function format(result) {
    const w = Math.max(9, ...result.labels.map(x => x.length + 1));
    const lines = ['actual \\ predicted'.padEnd(19) + result.labels.map(x => x.padStart(w)).join('')];
    result.labels.forEach(a => lines.push(a.padEnd(19) + result.labels.map(p => String(result.matrix[a][p]).padStart(w)).join('')));
    lines.push('');
    result.labels.forEach(l => {
      const m = result.perLabel[l];
      lines.push(`${l.padEnd(14)} precision ${m.precision.toFixed(3)}  recall ${m.recall.toFixed(3)}  F1 ${m.f1.toFixed(3)}  n=${m.support}`);
    });
    lines.push(`accuracy ${result.accuracy.toFixed(3)}  macro-F1 ${result.macroF1.toFixed(3)}`);
    return lines.join('\n');
  }
  return { evaluate, format };
});
