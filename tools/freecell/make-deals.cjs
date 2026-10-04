// 365 FreeCell - the deals proven winnable with three free cells (Hard) and with two (Expert), by tools/freecell/solver.cjs,
// each solution replayed on a fresh deal before it counts. Run: node tools/freecell/make-deals.cjs -> games/freecell/deals.js
// (With four cells every deal from 1 to 32,000 can be won except #11982 - that list lives in freecell.js.)
const fs = require('fs'), path = require('path');
const S = require('./solver.cjs');
const N = +(process.argv[2] || 700), out = { c3: [], c2: [] };
for (const [lv, k] of [[5, 'c3'], [7, 'c2']]) {
  const t0 = Date.now();
  for (let seed = 1; seed <= N; seed++) { if (seed === 11982) continue; const r = S.solve(seed, lv, 60000); if (r.won && S.replay(seed, lv, r.moves)) out[k].push(seed); }
  console.log(k, out[k].length, 'of', N, 'in', Math.round((Date.now() - t0) / 1000) + 's');
}
fs.writeFileSync(path.join(__dirname, '../../games/freecell/deals.js'),
  '/* 365 FreeCell - deal numbers proven winnable with three free cells (c3, Hard) and two (c2, Expert): each was solved and\n'
  + ' * then replayed move by move on a fresh deal. Built ' + new Date().toISOString().slice(0, 10) + ' by tools/freecell/make-deals.cjs (deals 1-' + N + ', solver limit 60000). */\n'
  + '(function (root) {\n  var D = { c3: [' + out.c3.join(',') + '],\n    c2: [' + out.c2.join(',') + '] };\n'
  + "  if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.FC_DEALS = D;\n})(typeof window !== 'undefined' ? window : this);\n");
