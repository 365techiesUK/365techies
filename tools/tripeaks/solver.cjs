// A TriPeaks solver (4 Oct 2026), for picking deals that can be won: today's deal, the Hall of Fame's deals and the
// Journey's levels. It sees every card (face-down ones too), so "won" means the deal CAN be won, not that it is easy.
// Depth-first, remembering positions that led nowhere: a position is (which of the 28 places are empty, how many cards
// have come off the deck, the rank on top of the pile) - nothing else matters to the rules.
// solve(seed, lv, limit) -> { won, moves: [engine moves], nodes }; replay() checks a line with the real engine.
const E = require('../../games/tripeaks/engine.js');

function solve(seed, lv, limit) {
  limit = limit || 300000;
  const s0 = E.deal(seed, lv), wrap = s0.wrap, R = s0.tab.map((x) => E.rank(x.c)), deck = s0.stock.slice(), D = deck.length;
  const COVER = E.COVER, FULL = (1 << 28) - 1, seen = new Set(), path = [];
  const fits = (r, t) => { const d = Math.abs(r - t); return d === 1 || (wrap && d === 12); };
  const freeAt = (mask, i) => !(mask & (1 << i)) && (!COVER[i].length || ((mask & (1 << COVER[i][0])) && (mask & (1 << COVER[i][1]))));
  let nodes = 0, out = false;
  function frees(mask, i) {   // how many places playing i would free
    let n = 0; const m2 = mask | (1 << i);
    for (let j = 0; j < 18; j++) if (!(m2 & (1 << j)) && (COVER[j][0] === i || COVER[j][1] === i) && freeAt(m2, j)) n++;
    return n;
  }
  function dfs(mask, k, t) {
    if (mask === FULL) return true;
    if (++nodes > limit) { out = true; return false; }
    const key = mask * 448 + k * 14 + t;
    if (seen.has(key)) return false;
    seen.add(key);
    const c = [];
    for (let i = 0; i < 28; i++) if (freeAt(mask, i) && fits(R[i], t)) c.push(i);
    c.sort((a, b) => frees(mask, b) - frees(mask, a) || a - b);
    for (const i of c) {
      path.push({ t: 'move', from: { p: 't', i }, to: { p: 'w' } });
      if (dfs(mask | (1 << i), k, R[i])) return true;
      path.pop();
      if (out) return false;
    }
    if (k < D) {
      path.push({ t: 'draw' });
      if (dfs(mask, k + 1, E.rank(deck[D - 1 - k]))) return true;
      path.pop();
    }
    return false;
  }
  const won = dfs(0, 0, E.rank(s0.waste[0]));
  return { won, moves: won ? path.slice() : null, nodes, gaveUp: out };
}
function replay(seed, lv, ms) {
  const s = E.deal(seed, lv);
  for (const m of ms) if (!E.apply(s, m)) return false;
  return s.won;
}
module.exports = { solve, replay };
if (require.main === module) {
  const lv = +(process.argv[2] || 1), n = +(process.argv[3] || 200), from = +(process.argv[4] || 1);
  let won = 0, gave = 0, t0 = Date.now(), lens = [];
  for (let seed = from; seed < from + n; seed++) {
    const r = solve(seed, lv), ok = r.won && replay(seed, lv, r.moves);
    if (r.won && !ok) console.log('#' + seed, 'LINE FAILS REPLAY');
    if (ok) { won++; lens.push(r.moves.length); }
    if (r.gaveUp) gave++;
  }
  console.log('lv ' + lv + ': ' + won + '/' + n + ' won, ' + gave + ' gave up, ' + ((Date.now() - t0) / 1000).toFixed(1) + 's; lines ' + Math.min(...lens) + '-' + Math.max(...lens));
}
