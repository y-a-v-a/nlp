(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NLP = root.NLP || {}; root.NLP.crfTagger = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  const TAGS = ['Noun', 'Verb', 'Adjective', 'Pronoun', 'Determiner'];
  const START = '<START>';
  function key() { return Array.from(arguments).join('|'); }
  function defaultWeights() {
    const w = {};
    const add = (n, v) => { w[n] = (w[n] || 0) + v; };
    ['the','a','an'].forEach(x => add(key('word','Determiner',x), 4));
    ['they','we','i','you','he','she'].forEach(x => add(key('word','Pronoun',x), 4));
    ['is','are','was','were','rose','present','love'].forEach(x => add(key('word','Verb',x), 1.4));
    ['rose','love','time','mind','face','present'].forEach(x => add(key('word','Noun',x), 1.2));
    ['fair','bright','honest','present'].forEach(x => add(key('word','Adjective',x), 1.5));
    add(key('suffix','Verb','ing'), 1.3); add(key('suffix','Verb','ed'), 1.1);
    add(key('suffix','Adjective','ful'), 1.3); add(key('suffix','Adjective','ous'), 1.3);
    const transitions = [
      [START,'Pronoun',1.5],[START,'Determiner',1.5],[START,'Noun',.4],
      ['Pronoun','Verb',2.2],['Determiner','Noun',1.5],['Determiner','Adjective',1.7],
      ['Adjective','Noun',2],['Verb','Noun',.8],['Noun','Verb',.7],
    ];
    transitions.forEach(x => add(key('transition',x[0],x[1]),x[2]));
    return w;
  }
  function localScore(weights, words, i, tag, prev) {
    const word = words[i];
    let s = weights[key('transition', prev, tag)] || 0;
    s += weights[key('word', tag, word)] || 0;
    ['ing','ed','ful','ous'].forEach(suf => { if (word.endsWith(suf)) s += weights[key('suffix',tag,suf)] || 0; });
    return s;
  }
  function viterbi(words, weights) {
    weights = weights || defaultWeights();
    let column = {}; TAGS.forEach(t => { column[t] = { score: localScore(weights,words,0,t,START), prev:null }; });
    const trellis = [column];
    for (let i=1;i<words.length;i++) {
      const next={};
      TAGS.forEach(tag => {
        let best={score:-Infinity,prev:null};
        TAGS.forEach(prev => { const score=column[prev].score+localScore(weights,words,i,tag,prev); if(score>best.score)best={score,prev}; });
        next[tag]=best;
      });
      trellis.push(next); column=next;
    }
    let last=TAGS.reduce((a,b)=>column[a].score>column[b].score?a:b);
    const tags=Array(words.length); tags[words.length-1]=last;
    for(let i=words.length-1;i>0;i--) tags[i-1]=trellis[i][tags[i]].prev;
    return { tags, score: column[last].score, trellis };
  }
  function logSumExp(values) { const m=Math.max(...values); return m+Math.log(values.reduce((s,v)=>s+Math.exp(v-m),0)); }
  function logPartition(words, weights) {
    weights=weights||defaultWeights();
    let alpha={}; TAGS.forEach(t=>{alpha[t]=localScore(weights,words,0,t,START);});
    for(let i=1;i<words.length;i++){const next={};TAGS.forEach(tag=>{next[tag]=logSumExp(TAGS.map(prev=>alpha[prev]+localScore(weights,words,i,tag,prev)));});alpha=next;}
    return logSumExp(TAGS.map(t=>alpha[t]));
  }
  function decode(words, weights) {
    const best=viterbi(words,weights); const logZ=logPartition(words,weights);
    return Object.assign(best,{logZ,probability:Math.exp(best.score-logZ)});
  }
  return { TAGS, defaultWeights, localScore, viterbi, logPartition, decode };
});
