// A Pyramid solver (4 Oct 2026), for picking deals that can be won at each level: today's deal, the Hall of Fame's deals
// and the Journey's levels. Depth-first, remembering positions that led nowhere. A position is (which of the 28 places
// are empty, which of the 24 deck cards are gone, how far through the deck, how many times through): the pile is the
// deck cards still here that have been turned, the deck the ones not yet turned. A King is always taken at once - it
// pairs with nothing, so taking it can only help.
// solve(seed, lv, limit) -> { won, moves: [engine moves], nodes }; replay() checks a line with the real engine.
const E = require('../../games/pyramid/engine.js');

// Fewer times through the deck first: a win that needs only two is a win at any level that allows two or more, and
// the search stays small. Easy (no limit) tries up to four.
function solve(seed, lv, limit) {
  limit = limit || 300000;
  const most = E.deal(seed, lv).limit || 4;
  let nodes = 0, gave = false;
  for (let mp = 1; mp <= most; mp++) {
    const r = solveWith(seed, lv, Math.round(limit / most), mp);
    nodes += r.nodes; gave = gave || r.gaveUp;
    if (r.won) return { won: true, moves: r.moves, nodes, passes: mp, gaveUp: false };
  }
  return { won: false, moves: null, nodes, gaveUp: gave };
}
function solveWith(seed, lv, limit, maxPass) {
  const s0 = E.deal(seed, lv);
  const R = s0.tab.map(E.rank), O = s0.stock.slice().reverse(), RO = O.map(E.rank), N = O.length;   // O[0] is turned first
  const COVER = E.COVER, ROW = E.ROW, FULL = (1 << 28) - 1, seen = new Set(), path = [];
  const freeAt = (pm, i) => !(pm & (1 << i)) && (!COVER[i].length || ((pm & (1 << COVER[i][0])) && (pm & (1 << COVER[i][1]))));
  let nodes = 0, out = false;
  function wasteTop(dm, ptr) { for (let q = ptr - 1; q >= 0; q--) if (!(dm & (1 << q))) return q; return -1; }
  function nextUp(dm, ptr) { for (let q = ptr; q < N; q++) if (!(dm & (1 << q))) return q; return -1; }
  const take = (a) => ({ p: 't', i: a }), W = { p: 'w' };
  function dfs(pm, dm, ptr, pass) {
    if (pm === FULL) return true;
    if (++nodes > limit) { out = true; return false; }
    const key = pm + ',' + dm + ',' + ptr + ',' + pass;
    if (seen.has(key)) return false;
    seen.add(key);
    const fr = []; for (let i = 0; i < 28; i++) if (freeAt(pm, i)) fr.push(i);
    const wt = wasteTop(dm, ptr);
    // Kings: take one and go on (no choice needed)
    for (const i of fr) if (R[i] === 13) { path.push({ t: 'move', from: take(i), to: { p: 'f' } }); if (dfs(pm | (1 << i), dm, ptr, pass)) return true; path.pop(); return false; }
    if (wt >= 0 && RO[wt] === 13) { path.push({ t: 'move', from: W, to: { p: 'f' } }); if (dfs(pm, dm | (1 << wt), ptr, pass)) return true; path.pop(); return false; }
    // pairs: two in the pyramid first (lower rows free more), then one with the pile
    const pairs = [];
    for (let a = 0; a < fr.length; a++) for (let b = a + 1; b < fr.length; b++) if (R[fr[a]] + R[fr[b]] === 13) pairs.push([fr[a], fr[b], ROW[fr[a]] + ROW[fr[b]] + 20]);
    if (wt >= 0) for (const i of fr) if (R[i] + RO[wt] === 13) pairs.push([i, -1, ROW[i]]);
    pairs.sort((x, y) => x[2] - y[2]);
    for (const [a, b] of pairs) {
      if (b >= 0) { path.push({ t: 'move', from: take(a), to: take(b) }); if (dfs(pm | (1 << a) | (1 << b), dm, ptr, pass)) return true; }
      else { path.push({ t: 'move', from: W, to: take(a) }); if (dfs(pm | (1 << a), dm | (1 << wt), ptr, pass)) return true; }
      path.pop(); if (out) return false;
    }
    // the deck: turn the next card, or turn the pile over again if the level allows
    const nx = nextUp(dm, ptr);
    if (nx >= 0) { path.push({ t: 'draw' }); if (dfs(pm, dm, nx + 1, pass)) return true; path.pop(); }
    else if (wt >= 0 && pass + 1 < maxPass) { path.push({ t: 'draw' }); if (dfs(pm, dm, 0, pass + 1)) return true; path.pop(); }
    return false;
  }
  const won = dfs(0, 0, 0, 0);
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
