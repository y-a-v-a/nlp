#!/usr/bin/env node

const { createState, respond, RULES } = require('./core');

// The one technique in this repo with no corpus argument — the rules are the
// whole model, so there is nothing to read from disk.
const CANNED_CONVERSATION = [
  'I need some help with my life.',
  "I can't sleep lately.",
  'I feel like nobody understands me.',
  'My mother never listens to me.',
  'Why don\'t you just tell me what to do?',
  'Because I never learned how.',
  'Are you even a real doctor?',
  'Sorry, that was rude.',
  'Yes, I think I should apologize more.',
];

function printExchange(userLine, result) {
  const tag = result.ruleIndex === -1 ? 'fallback' : `rule #${result.ruleIndex + 1}`;
  console.log(`  you    > ${userLine}`);
  console.log(`  eliza  > ${result.reply}   [${tag}]`);
}

const customLine = process.argv.slice(2).join(' ').trim();

console.log(`ELIZA — ${RULES.length} rules, no corpus needed.\n`);

if (customLine) {
  console.log('Single line, run in isolation (a fresh conversation state):\n');
  const state = createState();
  const result = respond(state, customLine);
  printExchange(customLine, result);
} else {
  console.log('Canned demo conversation (deterministic — same transcript every run):\n');
  const state = createState();
  for (const line of CANNED_CONVERSATION) {
    printExchange(line, respond(state, line));
  }
  console.log(
    '\nEvery reply above is produced by the first rule (in RULES, core.js) whose ' +
      'regular expression matches the line — nothing is learned, counted, or trained. ' +
      'Run again and you will get the identical transcript.',
  );
}
