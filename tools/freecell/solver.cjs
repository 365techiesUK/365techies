// 365 FreeCell - a solver (4 Oct 2026), for the levels with fewer free cells (Hard 3, Expert 2): it proves which deals
// can be won, so Today's deal and the Journey only ever use winnable ones, and it sizes the Journey's goals.
// Best-first search over positions (the most promising first: cards up, cards not buried under higher ones, cells free),
// with the safe moves up to the piles made automatically, and every position seen once (columns in any order).
// solve(seed, lv, limit) -> { won, moves (engine moves, replayable), nodes }
const E = require('../../games/freecell/engine.js');

function key(s) {
  const f = [0, 0, 0, 0];
  for (const p of s.found) if (p.length) f[E.suit(p[0])] = p.length;
  const cells = s.cells.slice(0, s.ncell).filter((c) => c !== null).sort((a, b) => a - b).join(',');
  return f.join('.') + '#' + cells + '#' + s.tab.map((c) => c.join(',')).sort().join('|');
}
function score(s) {
  let found = 0, buried = 0;
  for (const p of s.found) found += p.length;
  for (const col of s.tab) {
    let low = 99;
    for (const c of col) { const r = E.rank(c); if (r > low) buried++; else low = r; }
  }
  let used = 0; for (let i = 0; i < s.ncell; i++) if (s.cells[i] !== null) used++;
  let empty = 0; for (const col of s.tab) if (!col.length) empty++;
  return (52 - found) * 4 + buried * 2 + used * 2 - empty * 3;
}
function candidates(s) {
  const out = [], froms = [];
  for (let i = 0; i < 8; i++) { const n = E.runLen(s.tab[i]); for (let k = 1; k <= n; k++) froms.push({ p: 't', i, n: k }); }
  for (let i = 0; i < s.ncell; i++) if (s.cells[i] !== null) froms.push({ p: 'c', i });
  for (const from of froms) {
    const cards = E.picked(s, from); if (!cards.length) continue;
    if (cards.length === 1) { const f = E.foundFor(s, cards[0]); if (f >= 0) out.push({ t: 'move', from, to: { p: 'f', i: f } }); }
    let emptyDone = false;
    for (let j = 0; j < 8; j++) {
      if (from.p === 't' && from.i === j) continue;
      const empty = !s.tab[j].length;
      if (empty && (emptyDone || (from.p === 't' && s.tab[from.i].length === cards.length))) continue;   // one empty column is as good as another; a whole column into one is pointless
      const m = { t: 'move', from, to: { p: 't', i: j } };
      if (E.legal(s, m)) { out.push(m); if (empty) emptyDone = true; }
    }
    if (from.p === 't' && from.n === 1) { const c = E.firstCell(s); if (c >= 0) out.push({ t: 'move', from, to: { p: 'c', i: c } }); }
  }
  return out;
}
function autos(s, path) { let m; while ((m = E.autoMove(s, null))) { E.apply(s, m); path.push(m); } }

// a binary heap of [priority, node]
function Heap() { this.a = []; }
Heap.prototype.push = function (p, v) { const a = this.a; a.push([p, v]); let i = a.length - 1; while (i > 0) { const j = (i - 1) >> 1; if (a[j][0] <= a[i][0]) break; [a[i], a[j]] = [a[j], a[i]]; i = j; } };
Heap.prototype.pop = function () {
  const a = this.a, top = a[0], last = a.pop();
  if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } }
  return top[1];
};

function solve(seed, lv, limit) {
  limit = limit || 60000;
  const start = E.deal(seed, lv), first = [];
  autos(start, first);
  const nodes = [{ s: start, parent: -1, moves: first, depth: 0 }], seen = new Set([key(start)]), heap = new Heap();
  heap.push(score(start), 0);
  let n = 0;
  while (heap.a.length) {
    if (++n > limit) return { won: false, gaveUp: true, nodes: n };
    const idx = heap.pop(), node = nodes[idx];
    if (node.s.won) {
      const path = []; let k = idx;
      while (k >= 0) { path.unshift(...nodes[k].moves); k = nodes[k].parent; }
      return { won: true, moves: path, nodes: n };
    }
    for (const m of candidates(node.s)) {
      const t = E.clone(node.s), mv = [m];
      if (!E.apply(t, m)) continue;
      autos(t, mv);
      const k = key(t); if (seen.has(k)) continue; seen.add(k);
      nodes.push({ s: t, parent: idx, moves: mv, depth: node.depth + 1 });
      heap.push(score(t) + (node.depth + 1) * 0.25, nodes.length - 1);
    }
  }
  return { won: false, gaveUp: false, nodes: n };
}
function replay(seed, lv, moves) { const s = E.deal(seed, lv); for (const m of moves) if (!E.apply(s, m)) return false; return s.won; }

module.exports = { solve, replay, key };
