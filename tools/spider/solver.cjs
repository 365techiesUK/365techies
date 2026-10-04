// A Spider solver (4 Oct 2026), for picking deals that can be won: today's deal, the Hall of Fame's deals and the Journey's
// levels. A position is rebuilt from its key alone: face-down cards never move, so a column's count of them says which
// they are (the deal's own), and the deck is always the deal's deck less what has gone out. Face-up cards are kept as
// rank + suit, since two cards alike are as good as each other.
// The game splits into stretches between deals of the deck. For each stretch it searches best-first for the positions
// worth dealing from (or a win), keeps the best few, and goes on to the next stretch from each in turn, backing up when
// a later stretch leads nowhere.
// solve(seed, lv, limit) -> { won, moves: [engine moves], nodes }. Every line is replayed with the real engine (replay())
// before anyone uses it.
const E = require('../../games/spider/engine.js');

function solve(seed, lv, limit, opt) {
  limit = limit || 400000; opt = opt || {};
  const KEEP = opt.keep || 4, STRETCH = opt.stretch || 12000, LAST = opt.last || 60000;
  const s0 = E.deal(seed, lv), suits = s0.suits;
  const downs0 = s0.tab.map((col) => col.filter((x) => !x.up).map((x) => x.c));
  const deck = s0.stock.slice();
  const R = (c) => E.rank(c), S = (c) => E.suitOf(c, suits);
  const keyOf = (p) => p.cols.map((c) => c.down + ':' + c.up.map((x) => x[0].toString(36) + x[1]).join('')).join('|') + '/' + p.stock + '/' + p.done;
  const start = { cols: s0.tab.map((col, i) => ({ down: downs0[i].length, up: col.filter((x) => x.up).map((x) => [R(x.c), S(x.c)]) })), stock: deck.length, done: 0 };
  const turnUp = (p, i) => { const c = p.cols[i]; if (!c.up.length && c.down > 0) { c.down--; const card = downs0[i][c.down]; c.up.push([R(card), S(card)]); } };
  const runLen = (up) => { if (!up.length) return 0; let n = 1; for (let k = up.length - 1; k > 0; k--) { if (up[k - 1][1] === up[k][1] && up[k - 1][0] === up[k][0] + 1) n++; else break; } return n; };
  const copy = (p) => ({ cols: p.cols.map((c) => ({ down: c.down, up: c.up.slice() })), stock: p.stock, done: p.done });
  const clearRuns = (p, i) => { const up = p.cols[i].up; if (up.length >= 13 && runLen(up) >= 13 && up[up.length - 1][0] === 1) { up.splice(up.length - 13, 13); p.done++; turnUp(p, i); } };
  // how good a position is to play on from: suits cleared, cards turned up, cards sitting in suit order, empty columns
  function score(p) {
    let down = 0, same = 0, links = 0, empty = 0, kingRuns = 0;
    for (const c of p.cols) {
      down += c.down; if (!c.up.length && !c.down) empty++;
      for (let k = 1; k < c.up.length; k++) if (c.up[k - 1][0] === c.up[k][0] + 1) { links++; if (c.up[k - 1][1] === c.up[k][1]) same++; }
      if (!c.down && c.up.length && c.up[0][0] === 13 && runLen(c.up) === c.up.length) kingRuns += c.up.length;   // a clean run from a King: settled
    }
    return p.done * 2000 - down * 40 + same * 20 + links * 4 + empty * 30 + kingRuns * 3;
  }
  function moves(p) {
    const out = [], empties = [];
    for (let j = 0; j < 10; j++) if (!p.cols[j].up.length && !p.cols[j].down) empties.push(j);
    for (let i = 0; i < 10; i++) {
      const src = p.cols[i], rl = runLen(src.up); if (!rl) continue;
      const base = src.up[src.up.length - rl], wholeCol = rl === src.up.length && src.down === 0;
      const under = src.up.length > rl ? src.up[src.up.length - rl - 1] : null;
      const onParent = under && under[0] === base[0] + 1;
      for (let j = 0; j < 10; j++) {
        if (j === i) continue;
        const t = p.cols[j].up[p.cols[j].up.length - 1];
        if (!t || t[0] !== base[0] + 1) continue;
        if (onParent && t[1] !== base[1]) continue;   // from one step-higher card to another of a different suit: pointless
        out.push({ i, n: rl, j });
        // part of a run onto its own suit elsewhere, so the rest can go somewhere better
      }
      if (rl > 1) for (let n = 1; n < rl; n++) {
        const b = src.up[src.up.length - n];
        for (let j = 0; j < 10; j++) { if (j === i) continue; const t = p.cols[j].up[p.cols[j].up.length - 1]; if (t && t[0] === b[0] + 1 && t[1] === b[1]) out.push({ i, n, j }); }
      }
      if (empties.length && !wholeCol) out.push({ i, n: rl, j: empties[0] });
      if (empties.length && wholeCol && rl > 1 && p.stock) for (let n = 1; n < rl; n++) out.push({ i, n, j: empties[0] });   // the deck needs every column filled
    }
    return out;
  }
  function play(p, m) {
    const q = copy(p);
    const moved = q.cols[m.i].up.splice(q.cols[m.i].up.length - m.n, m.n);
    q.cols[m.j].up.push(...moved);
    turnUp(q, m.i); clearRuns(q, m.j);
    return q;
  }
  function dealOut(p) {   // the engine pops the deck's last card onto column 0 first
    const q = copy(p);
    for (let i = 0; i < 10; i++) { const card = deck[q.stock - 1 - i]; q.cols[i].up.push([R(card), S(card)]); }
    q.stock -= 10;
    for (let i = 0; i < 10; i++) clearRuns(q, i);
    return q;
  }
  const canDeal = (p) => p.stock > 0 && p.cols.every((c) => c.up.length || c.down);
  let nodes = 0;
  // one stretch: best-first from p without dealing; returns a win, or the best positions to deal from (with their lines)
  function stretch(p, budget) {
    const heap = [], seen = new Map(), states = new Map();
    const push = (sc, k) => { heap.push([sc, k]); let i = heap.length - 1; while (i > 0) { const pa = (i - 1) >> 1; if (heap[pa][0] >= heap[i][0]) break; [heap[pa], heap[i]] = [heap[i], heap[pa]]; i = pa; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let b = i; if (l < heap.length && heap[l][0] > heap[b][0]) b = l; if (r < heap.length && heap[r][0] > heap[b][0]) b = r; if (b === i) break; [heap[b], heap[i]] = [heap[i], heap[b]]; i = b; } } return top; };
    const line = (k) => { const out = []; for (let e = seen.get(k); e; e = seen.get(e[0])) out.push(e[1]); return out.reverse(); };
    const k0 = keyOf(p); seen.set(k0, null); states.set(k0, p); push(score(p), k0);
    const best = [];   // [score, key, position] of positions the deck can be dealt from
    let n = 0;
    while (heap.length && n < budget) {
      const [sc, k] = pop(); const q = states.get(k); states.delete(k); if (!q) continue;
      n++; nodes++;
      if (q.done === 8) return { win: line(k) };
      if (canDeal(q)) { best.push([sc, k, q]); }
      for (const m of moves(q)) {
        const r = play(q, m), rk = keyOf(r);
        if (seen.has(rk)) continue;
        seen.set(rk, [k, m]); states.set(rk, r); push(score(r), rk);
      }
    }
    // the best few, and not near-copies: different counts of cards still face down or in order
    best.sort((a, b) => b[0] - a[0]);
    const pick = [], sig = new Set();
    for (const b of best) { const g = b[0]; if (sig.has(g)) continue; sig.add(g); pick.push({ line: line(b[1]), pos: b[2] }); if (pick.length >= KEEP) break; }
    return { deal: pick };
  }
  const toMoves = (ls) => ls.map((m) => ({ t: 'move', from: { p: 't', i: m.i, n: m.n }, to: { p: 't', i: m.j } }));
  function go(p) {
    if (nodes > limit) return null;
    const r = stretch(p, p.stock ? STRETCH : LAST);
    if (r.win) return toMoves(r.win);
    for (const c of r.deal) {
      if (nodes > limit) return null;
      const rest = go(dealOut(c.pos));
      if (rest) return toMoves(c.line).concat([{ t: 'draw' }], rest);
    }
    return null;
  }
  const ms = go(start);
  return { won: !!ms, moves: ms, nodes };
}
// does the line really win with the real rules?
function replay(seed, lv, ms) {
  const s = E.deal(seed, lv);
  for (const m of ms) if (!E.apply(s, m)) return false;
  return s.won;
}
module.exports = { solve, replay };
if (require.main === module) {
  const lv = +(process.argv[2] || 1), n = +(process.argv[3] || 10), limit = +(process.argv[4] || 400000), from = +(process.argv[5] || 1);
  let won = 0, t0 = Date.now(), lens = [];
  for (let seed = from; seed < from + n; seed++) {
    const t = Date.now(), r = solve(seed, lv, limit), ok = r.won && replay(seed, lv, r.moves);
    if (ok) { won++; lens.push(r.moves.length); }
    console.log('#' + seed, r.won ? (ok ? 'won ' + r.moves.length + ' moves' : 'LINE FAILS REPLAY') : 'not found', r.nodes + ' nodes', (Date.now() - t) + 'ms');
  }
  console.log('lv ' + lv + ': ' + won + '/' + n + ' in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's; lines ' + Math.min(...lens) + '-' + Math.max(...lens));
}
