// The Solitaire Journey (4 Oct 2026, owner: "levels ... challenges ... the next generation solitaire, so it keeps them on
// there"; chapters named after Dorset places). 100 levels, 10 chapters along the coast. Every level is a deal from the
// proven-winnable lists (deals.js), and its star goals are sized from the solver's own winning line (L moves):
//   star 1 - win it;  star 2 - win inside a time;  star 3 - fewer than so many moves, or no Undo, or no Hint.
// The goals tighten chapter by chapter, and the later chapters turn three cards (Normal).
// Run: node tools/solitaire/make-journey.cjs   ->  games/solitaire/journey.js
const fs = require('fs'), path = require('path');
const E = require('../../games/solitaire/engine.js');
const S = require('./solver.cjs');
const D = require('../../games/solitaire/deals.js');
const CH = ['Bournemouth Pier', 'Hengistbury Head', 'Christchurch Quay', 'Sandbanks', 'Brownsea Island',
  'Old Harry Rocks', 'Swanage', 'Corfe Castle', 'Lulworth Cove', 'Durdle Door'];
const used = new Set(), levels = [];
function pick(list, i) { for (let k = 0; k < list.length; k++) { const s = list[(i * 37 + 11 + k * 7) % list.length]; if (!used.has(s)) { used.add(s); return s; } } throw new Error('ran out'); }
for (let c = 0; c < 10; c++) {
  for (let k = 0; k < 10; k++) {
    const i = c * 10 + k;
    // turn one card for the first chapters; three from Sandbanks on, with the odd turn-one breather
    const lv = c < 3 ? 1 : c < 5 ? (k % 3 === 2 ? 3 : 1) : (k % 4 === 3 ? 1 : 3);
    const list = lv === 1 ? D.d1 : D.d3;
    let seed, r;
    for (let tries = 0; tries < 40; tries++) { seed = pick(list, i + tries * 101); r = S.solve(seed, lv, 30000); if (r.won) break; }
    if (!r.won) throw new Error('no winnable deal for level ' + (i + 1));
    const L = r.moves.length, tight = 1.7 - c * 0.07;   // 1.7 in the first chapter down to 1.07 in the last
    const secs = Math.ceil((L * 2.4 + 50 + (lv === 3 ? 40 : 0)) * tight / 15) * 15;
    const third = k === 9 ? 'nohint' : (k % 3 === 1 ? 'noundo' : 'moves');
    const lvl = { seed, lv, secs, L };
    if (third === 'moves') lvl.moves = Math.ceil(L * (1.65 - c * 0.05)); else lvl.goal = third;
    levels.push(lvl);
  }
}
const out = '/* 365 Solitaire - the Journey (made by tools/solitaire/make-journey.cjs on ' + new Date().toISOString().slice(0, 10) + '; do not edit by hand).\n'
  + ' * 10 chapters x 10 levels: {seed, lv (1 turn one / 3 turn three), secs (the two-star time), moves (the three-star move limit)\n'
  + ' * or goal: "noundo" | "nohint" (three stars without it), L (the solver\'s winning line, for reference)}. */\n'
  + '(function (root) {\n  var J = { chapters: ' + JSON.stringify(CH) + ',\n    levels: [\n'
  + levels.map((l) => '      ' + JSON.stringify(l)).join(',\n') + '\n    ] };\n'
  + "  if (typeof module !== 'undefined' && module.exports) module.exports = J; else root.SOL_JOURNEY = J;\n})(typeof window !== 'undefined' ? window : this);\n";
fs.writeFileSync(path.join(__dirname, '../../games/solitaire/journey.js'), out);
const byLv = levels.reduce((a, l) => (a[l.lv] = (a[l.lv] || 0) + 1, a), {});
console.log('levels', levels.length, 'turn one', byLv[1], 'turn three', byLv[3], 'two-star times', Math.min(...levels.map((l) => l.secs)) + '-' + Math.max(...levels.map((l) => l.secs)) + 's');
