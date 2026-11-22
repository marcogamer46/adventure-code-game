// scenes.js — the tutorial's scene scripts.
// Step fields:
//   a  action tag (see runner in record.js)
//   c  caption text (optional; shown at this moment)
//   w  post-action dwell in ms (drives gap <= caption pacing)
//   s  CSS selector (click/select/focus)
//   i  index for nth-match clicks (clickN)
//   v  option value for <select>
//   k  key for keyboard.press
//   m  max iterations for auto-move actions
//   ms plain wait duration
// Caption text is kept <= ~50 chars so reading speed stays <=15 cps over the
// >=3.4s dwell the gaps below produce.
'use strict';

const URL = 'file:///home/chillinmalware/Documents/adventure-code-game/index.html';

module.exports = { URL, SCENES: [
  {
    id: '01-intro', touch: false, tail: 1200,
    steps: [
      { a: 'goto' },
      { a: 'wait', ms: 700 },
      { a: 'cap', c: 'A playable tour of your six Python components.', w: 2200 },
      { a: 'focus', w: 200 },
      { a: 'click', s: '.tab[data-t="story"]', w: 800 },
      { a: 'cap', c: 'Story & actions explains every move as it happens.', w: 2000 },
      { a: 'click', s: '.tab[data-t="log"]', w: 1000 },
      { a: 'cap', c: 'The AI log records each step and why.', w: 2100 },
      { a: 'click', s: '.tab[data-t="live"]', w: 900 },
      { a: 'cap', c: 'Live code follows the running Python line by line.', w: 2100 },
      { a: 'click', s: '.gbtn[data-g="learn"]', w: 900 },
      { a: 'cap', c: 'Learn: Data flow, code, reference, components.', w: 2100 },
      { a: 'clickN', s: '.flow .node', i: 0, w: 800 },
      { a: 'cap', c: 'Data flow shows how seed becomes a level.', w: 2100 },
      { a: 'click', s: '.tab[data-t="present"]', w: 800 },
      { a: 'cap', c: 'Components lists roles and what depends on each.', w: 2000 },
      { a: 'click', s: '.gbtn[data-g="test"]', w: 900 },
      { a: 'cap', c: 'Test yourself: Explain it back and Edge cases.', w: 1700 },
      { a: 'click', s: '.gbtn[data-g="play"]', w: 400 },
      { a: 'click', s: '.tab[data-t="story"]', w: 400 },
      { a: 'cap', c: 'Enough touring — let’s play.', w: 1200 },
    ]
  },
  {
    id: '02-play', touch: false, tail: 1200,
    steps: [
      { a: 'goto' },
      { a: 'wait', ms: 600 },
      { a: 'focus', w: 200 },
      { a: 'cap', c: 'Move with the arrow keys — or WASD.', w: 1200 },
      { a: 'mvOpen', w: 400 },
      { a: 'pressWall', w: 300 },
      { a: 'cap', c: 'Walls and obstacles gently stop you.', w: 1600 },
      { a: 'autoCollect', m: 4, w: 300 },
      { a: 'cap', c: 'Step onto a gem — the score ticks up.', w: 1800 },
      { a: 'autoEngage', m: 5, w: 300 },
      { a: 'cap', c: 'Get next to an enemy, press E to engage.', w: 2700 },
      { a: 'cap', c: 'It costs a turn plus the bounty penalty.', w: 3400 },
      { a: 'cap', c: 'That’s the core loop — try any level!', w: 900 },
    ]
  },
  {
    id: '03-dpad', touch: true, tail: 1000,
    steps: [
      { a: 'goto' },
      { a: 'wait', ms: 800 },
      { a: 'cap', c: 'On phones, a D-pad appears under the board.', w: 2000 },
      { a: 'dpadMove', m: 3, w: 400 },
      { a: 'cap', c: 'Tap the arrows to move around the grid.', w: 1900 },
      { a: 'dpadMove', m: 3, w: 400 },
      { a: 'cap', c: 'Everything else works exactly the same.', w: 1600 },
    ]
  },
  {
    id: '04-ai', touch: false, tail: 1200,
    steps: [
      { a: 'goto' },
      { a: 'wait', ms: 600 },
      { a: 'select', s: '#speed', v: '700', w: 500 },
      { a: 'cap', c: 'Slow the speed to 0.7s to follow along.', w: 2000 },
      { a: 'click', s: '#btnAI', w: 700 },
      { a: 'cap', c: 'Watch AI lets the planner run the level for you.', w: 2400 },
      { a: 'wait', ms: 2200 },
      { a: 'cap', c: 'Watch the frontier of states it explores.', w: 2300 },
      { a: 'click', s: '#btnRun', w: 600 },
      { a: 'cap', c: 'Pause to freeze and inspect a state.', w: 2400 },
      { a: 'click', s: '#btnStep', w: 500 },
      { a: 'cap', c: 'Step advances exactly one AI turn.', w: 2300 },
      { a: 'click', s: '#btnRun', w: 600 },
      { a: 'cap', c: 'Resume picks right back up.', w: 1900 },
      { a: 'over', w: 500 },
      { a: 'cap', c: 'At the exit, the summary card appears.', w: 2400 },
      { a: 'click', s: '.summarycard .sc-x', w: 700 },
      { a: 'cap', c: 'Close it anytime — the board stays live.', w: 1800 },
    ]
  },
  {
    id: '05-code', touch: false, tail: 1100,
    steps: [
      { a: 'goto' },
      { a: 'wait', ms: 600 },
      { a: 'click', s: '#btnAI', w: 600 },
      { a: 'wait', ms: 1500 },
      { a: 'click', s: '.tab[data-t="live"]', w: 700 },
      { a: 'cap', c: 'Live code highlights the currently executing line.', w: 2300 },
      { a: 'click', s: '#cvStepLine', w: 600 },
      { a: 'cap', c: 'Step line walks the cursor through the trace.', w: 2000 },
      { a: 'click', s: '#cvStepLine', w: 500 },
      { a: 'click', s: '#cvRunFn', w: 600 },
      { a: 'cap', c: 'Run-to-next-function jumps to the next call.', w: 2100 },
      { a: 'click', s: '#cvScrub', w: 300 },
      { a: 'press', k: 'ArrowRight', w: 300 },
      { a: 'press', k: 'ArrowRight', w: 300 },
      { a: 'cap', c: 'Scrub to replay any earlier moment.', w: 3400 },
      { a: 'cap', c: 'Variables panel tracks values as they change.', w: 3400 },
      { a: 'cap', c: 'That’s how you read the code visually.', w: 1200 },
    ]
  },
  {
    id: '06-learn', touch: false, tail: 1000,
    steps: [
      { a: 'goto' },
      { a: 'wait', ms: 600 },
      { a: 'click', s: '.gbtn[data-g="learn"]', w: 500 },
      { a: 'click', s: '.tab[data-t="flow"]', w: 700 },
      { a: 'cap', c: 'Data flow shows how a seed becomes a level.', w: 2200 },
      { a: 'clickN', s: '.flow .node', i: 0, w: 700 },
      { a: 'cap', c: 'Click any stage to see what it produces.', w: 1800 },
      { a: 'clickN', s: '.flow .node', i: 2, w: 600 },
      { a: 'clickN', s: '.flow .node', i: 4, w: 600 },
      { a: 'click', s: '.tab[data-t="code"]', w: 700 },
      { a: 'cap', c: 'Read code opens the annotated full source.', w: 2200 },
      { a: 'click', s: '.tab[data-t="ref"]', w: 700 },
      { a: 'cap', c: 'Reference gives printable per-file sheets.', w: 2200 },
      { a: 'click', s: '.tab[data-t="present"]', w: 700 },
      { a: 'cap', c: 'Components lays out roles and dependencies.', w: 1600 },
    ]
  },
  {
    id: '07-explain', touch: false, tail: 1000,
    steps: [
      { a: 'goto' },
      { a: 'wait', ms: 600 },
      { a: 'click', s: '.gbtn[data-g="test"]', w: 500 },
      { a: 'click', s: '.tab[data-t="explain"]', w: 700 },
      { a: 'cap', c: 'Explain it back quizzes you on each file.', w: 2100 },
      { a: 'clickN', s: '.exfile', i: 0, w: 800 },
      { a: 'cap', c: 'Pick a file and answer a question.', w: 2100 },
      { a: 'clickN', s: '.exopt', i: 0, w: 800 },
      { a: 'cap', c: 'Answer, then compare to the model answer.', w: 2200 },
      { a: 'click', s: '.btn.jump', w: 800 },
      { a: 'cap', c: 'Highlight jumps to the exact lines in the source.', w: 2100 },
      { a: 'click', s: '.gbtn[data-g="test"]', w: 400 },
      { a: 'click', s: '.tab[data-t="edge"]', w: 700 },
      { a: 'cap', c: 'Edge cases lists known quirks — tagged honestly.', w: 1800 },
    ]
  },
  {
    id: '08-customize', touch: false, tail: 1100,
    steps: [
      { a: 'goto' },
      { a: 'wait', ms: 600 },
      { a: 'cap', c: 'Customize the look to your taste.', w: 2100 },
      { a: 'click', s: '#btnTheme', w: 800 },
      { a: 'cap', c: 'Toggle light and dark theme.', w: 1700 },
      { a: 'click', s: '#btnTheme', w: 500 },
      { a: 'click', s: '#btnFit', w: 500 },
      { a: 'cap', c: 'Fit scales the board to your window.', w: 2300 },
      { a: 'click', s: '#btnRandom', w: 600 },
      { a: 'cap', c: 'Random generates a level from a fresh seed.', w: 2300 },
      { a: 'click', s: '#btnReset', w: 600 },
      { a: 'cap', c: 'Reset clears the run and starts clean.', w: 2300 },
      { a: 'select', s: '#levelSel', v: '3', w: 600 },
      { a: 'cap', c: 'Or pick one of seven baked levels.', w: 2400 },
      { a: 'click', s: '#btnAI', w: 500 },
      { a: 'cap', c: 'Then Watch AI solves it.', w: 1300 },
    ]
  },
  {
    id: '09-end', touch: false, tail: 1400,
    steps: [
      { a: 'goto' },
      { a: 'wait', ms: 600 },
      { a: 'click', s: '.tab[data-t="story"]', w: 400 },
      { a: 'cap', c: 'That’s the whole explainer.', w: 3400 },
      { a: 'cap', c: 'Play, watch, read, quiz, present — enjoy.', w: 3400 },
      { a: 'cap', c: 'Thanks for watching!', w: 1400 },
    ]
  }
] };
