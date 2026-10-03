// Builds games/solitaire/deals.js: deal numbers that have been WON under the real rules (solver + fresh replay).
// Run: node tools/solitaire/make-deals.cjs [draw1Count] [draw3Count]
// The first few thousand deal numbers are tried in order, so the list is the same every time it is rebuilt.
'use strict';
const fs = require('fs'), path = require('path');
const S = require('./solver.cjs');

const want = { 1: +(process.argv[2] || 3000), 3: +(process.argv[3] || 1500) };
const LIMIT = 30000;
const out = { d1: [], d3: [] };
for (const draw of [1, 3]) {
  const list = out['d' + draw];
  let seed = 0, tried = 0;
  const t0 = Date.now();
  while (list.length < want[draw]) {
    seed++; tried++;
    const r = S.solve(seed, draw, LIMIT);
    if (!r.won) continue;
    if (!S.replay(seed, draw, r.moves)) throw new Error('replay failed for deal ' + seed + ' draw ' + draw);
    list.push(seed);
    if (list.length % 250 === 0) console.log('draw ' + draw + ': ' + list.length + ' winnable of ' + tried + ' tried, ' + Math.round((Date.now() - t0) / 1000) + ' s');
  }
  console.log('draw ' + draw + ' done: ' + list.length + ' of ' + tried + ' (' + Math.round(100 * list.length / tried) + '%)');
}
const stamp = new Date().toISOString().slice(0, 10);
const body = '/* 365 Solitaire - deal numbers proven winnable: each was solved and then replayed move by move on a fresh deal\n' +
  ' * under the rules in engine.js. Built ' + stamp + ' by tools/solitaire/make-deals.cjs (solver limit ' + LIMIT + ').\n' +
  ' * Rebuild it whenever the deal or the rules change - the tests check a sample still wins. */\n' +
  '(function (root) {\n  var D = { d1: [' + out.d1.join(',') + '],\n    d3: [' + out.d3.join(',') + '] };\n' +
  "  if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.SOL_DEALS = D;\n" +
  "})(typeof window !== 'undefined' ? window : this);\n";
const file = path.join(__dirname, '..', '..', 'games', 'solitaire', 'deals.js');
fs.writeFileSync(file, body);
console.log('wrote ' + file + ' (' + body.length + ' bytes)');
