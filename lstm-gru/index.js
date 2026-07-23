#!/usr/bin/env node

const { runTrial } = require('./core');

const delay = Math.max(0, parseInt(process.argv[2], 10) || 20);
const signal = process.argv[3] === '-1' ? -1 : 1;
const trial = runTrial(signal, delay);

console.log('LSTM & GRU — gated recurrent memory');
console.log('─'.repeat(58));
console.log(`Task: remember ${signal > 0 ? '+1' : '-1'} across ${delay} distractor steps, then recall it.\n`);

console.log('Recall after the delay:');
console.log(`  vanilla RNN  ${trial.recalled.rnn.toFixed(4)}`);
console.log(`  LSTM         ${trial.recalled.lstm.toFixed(4)}`);
console.log(`  GRU          ${trial.recalled.gru.toFixed(4)}`);

console.log('\nData structure — selected recurrent states and gates:');
console.log(' step  event    RNN h   LSTM c  forget  input   GRU h  update');
console.log(' ────  ──────  ──────  ──────  ──────  ──────  ──────  ──────');
const picks = [...new Set([0, 1, Math.floor(delay / 2) + 1, delay + 1])];
for (const t of picks) {
  const r = trial.traces.rnn[t];
  const l = trial.traces.lstm[t];
  const g = trial.traces.gru[t];
  console.log(
    `${String(t).padStart(5)}  ${r.kind.padEnd(6)}  ${r.h.toFixed(3).padStart(6)}` +
    `  ${l.cell.toFixed(3).padStart(6)}  ${l.forgetGate.toFixed(3).padStart(6)}` +
    `  ${l.inputGate.toFixed(3).padStart(6)}  ${g.h.toFixed(3).padStart(6)}` +
    `  ${g.updateGate.toFixed(3).padStart(6)}`,
  );
}

console.log('\nReadable result:');
console.log(
  `  The RNN retains ${Math.abs(trial.recalled.rnn * 100).toFixed(1)}% of its signed signal; ` +
  `the LSTM ${Math.abs(trial.recalled.lstm * 100).toFixed(1)}% and the GRU ` +
  `${Math.abs(trial.recalled.gru * 100).toFixed(1)}%.`,
);
