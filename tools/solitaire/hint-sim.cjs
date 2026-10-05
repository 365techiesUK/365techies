// "Do exactly what Hint says": how often does a player who always follows the Hint win, with the old Hint (the best
// move now) and the planning Hint (games/solitaire/solver.js)? Plays like the page: after each move the safe moves to
// the piles are made for you (auto), Hint is pressed again. Easy (draw 1) and Normal (draw 3) deals from deals.js.
// node tools/solitaire/hint-sim.cjs [count]
'use strict';
const E = require('../../games/solitaire/engine.js');
const Sol = require('../../games/solitaire/solver.js');
const DEALS = require('../../games/solitaire/deals.js');
const N = +process.argv[2] || 40;
function play(seed, draw, smart) {
  const s = E.deal(seed, draw); Sol.reset();
  for (let i = 0; i < 900 && !s.won; i++) {
    let m; while ((m = E.autoMove(s))) E.apply(s, m);
    if (s.won) break;
    let h = E.hint(s); if (smart) h = Sol.hint(s, h);
    if (!h) return { won: false, at: i };
    if (!E.apply(s, h)) return { won: false, at: i, bad: true };
  }
  return { won: s.won };
}
for (const [draw, list] of [[1, DEALS.d1], [3, DEALS.d3]]) {
  const seeds = list.slice(0, N); let old = 0, neu = 0, t0 = Date.now(), lost = [];
  for (const sd of seeds) { if (play(sd, draw, false).won) old++; const r = play(sd, draw, true); if (r.won) neu++; else lost.push(sd + (r.bad ? '!' : '')); }
  console.log('draw ' + draw + ': ' + seeds.length + ' winnable deals - old Hint won ' + old + ', planning Hint won ' + neu + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)' + (lost.length ? ' lost: ' + lost.slice(0, 10).join(',') : ''));
}
