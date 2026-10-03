// 365 Solitaire - a deal solver, used only to pick deals that can be won ("Deals you can always win").
// Not shipped to the site (tools/** is outside the deploy). It plays by the SAME rules file the page uses
// (games/solitaire/engine.js), every move goes through E.apply(), and make-deals.cjs replays each solution on a fresh
// deal before a deal number is kept - so a deal on the list has been won, move by move, under the real rules.
// It is allowed to give up (node limit): a deal it cannot crack is simply left off the list.
'use strict';
const E = require('../../games/solitaire/engine.js');

const LIMIT = Symbol('limit');

function key(s) {
  let k = '';
  for (const col of s.tab) { for (const x of col) k += (x.up ? '+' : '-') + x.c + ','; k += '|'; }
  // pile heights by suit (which slot a suit sits in does not matter)
  const h = [0, 0, 0, 0];
  for (const f of s.found) if (f.length) h[E.suit(f[0])] = f.length;
  k += h.join('.') + '#';
  // draw one: every stock card can be reached whatever the order, so the stock is just a set of cards
  if (s.draw === 1) k += s.stock.concat(s.waste).sort((a, b) => a - b).join(',');
  else k += s.stock.join(',') + '/' + s.waste.join(',');
  return k;
}

// the ways to bring each reachable stock card to the waste top: [{card, draws}]
function talon(s) {
  const out = [], seen = new Set(), t = E.clone(s);
  const total = t.stock.length + t.waste.length;
  if (!total) return out;
  if (t.waste.length) { const c = t.waste[t.waste.length - 1]; seen.add(c); out.push({ card: c, draws: 0 }); }
  for (let d = 1; d <= 2 * total + 4; d++) {
    E.apply(t, { t: 'draw' });
    if (!t.waste.length) continue;
    const c = t.waste[t.waste.length - 1];
    if (!seen.has(c)) { seen.add(c); out.push({ card: c, draws: d }); }
  }
  return out;
}

function candidates(s) {
  const seqs = [];
  const draws = (n) => Array.from({ length: n }, () => ({ t: 'draw' }));
  // 1. up to the piles: column tops, then stock cards
  for (let i = 0; i < 7; i++) {
    const col = s.tab[i]; if (!col.length) continue;
    const f = E.foundFor(s, col[col.length - 1].c);
    if (f >= 0) seqs.push({ w: 100 + (col.length > 1 && !col[col.length - 2].up ? 10 : 0), m: [{ t: 'move', from: { p: 't', i, n: 1 }, to: { p: 'f', i: f } }] });
  }
  const tal = talon(s);
  for (const { card, draws: d } of tal) {
    const f = E.foundFor(s, card);
    if (f >= 0) seqs.push({ w: 90 - d * 0.01, m: draws(d).concat([{ t: 'move', from: { p: 'w' }, to: { p: 'f', i: f } }]) });
  }
  // 2. whole runs that turn a hidden card over (or a King run into a space)
  for (let i = 0; i < 7; i++) {
    const col = s.tab[i], n = E.runLen(col); if (!n) continue;
    const base = col[col.length - n].c, below = col.length - n - 1;
    if (below < 0) continue;
    let usedEmpty = false;
    for (let j = 0; j < 7; j++) {
      if (j === i) continue;
      const empty = !s.tab[j].length;
      if (empty && (usedEmpty || E.rank(base) !== 13)) continue;
      if (!empty && !E.canStack(base, s.tab[j])) continue;
      if (empty) usedEmpty = true;
      seqs.push({ w: 80 + below, m: [{ t: 'move', from: { p: 't', i, n }, to: { p: 't', i: j } }] });
    }
  }
  // 3. stock cards onto columns
  for (const { card, draws: d } of tal) {
    let usedEmpty = false;
    for (let j = 0; j < 7; j++) {
      const empty = !s.tab[j].length;
      if (empty ? (E.rank(card) !== 13 || usedEmpty) : !E.canStack(card, s.tab[j])) continue;
      if (empty) usedEmpty = true;
      seqs.push({ w: 50 - d * 0.01, m: draws(d).concat([{ t: 'move', from: { p: 'w' }, to: { p: 't', i: j } }]) });
    }
  }
  // 4. part of a run, so the card under it can go up to a pile
  for (let i = 0; i < 7; i++) {
    const col = s.tab[i], n = E.runLen(col);
    for (let k = 1; k < n; k++) {
      const under = col[col.length - k - 1].c, mv = col[col.length - k].c;
      if (E.foundFor(s, under) < 0) continue;
      for (let j = 0; j < 7; j++) if (j !== i && s.tab[j].length && E.canStack(mv, s.tab[j])) { seqs.push({ w: 60, m: [{ t: 'move', from: { p: 't', i, n: k }, to: { p: 't', i: j } }] }); break; }
    }
  }
  // 5. a card back down from a pile, when something waiting could then go on it (rarely needed, last resort)
  for (let f = 0; f < 4; f++) {
    const pile = s.found[f]; if (!pile.length) continue;
    const c = pile[pile.length - 1]; if (E.rank(c) <= 2) continue;
    for (let j = 0; j < 7; j++) if (s.tab[j].length && E.canStack(c, s.tab[j])) { seqs.push({ w: 10, m: [{ t: 'move', from: { p: 'f', i: f }, to: { p: 't', i: j } }] }); break; }
  }
  seqs.sort((a, b) => b.w - a.w);
  return seqs.map((x) => x.m);
}

// -> {won: true, moves: [...]} | {won: false, gaveUp: bool, nodes}
function solve(seed, draw, limit) {
  const start = E.deal(seed, draw);
  const seen = new Set();
  let nodes = 0;
  function dfs(s0) {
    if (++nodes > limit) throw LIMIT;
    const s = E.clone(s0), forced = [];
    let m;
    while ((m = E.autoMove(s))) { if (!E.apply(s, m)) throw new Error('auto move refused'); forced.push(m); }
    if (s.won) return forced;
    const k = key(s);
    if (seen.has(k)) return null;
    seen.add(k);
    for (const seq of candidates(s)) {
      const t = E.clone(s);
      let ok = true;
      for (const mv of seq) if (!E.apply(t, mv)) { ok = false; break; }
      if (!ok) continue;
      const rest = dfs(t);
      if (rest) return forced.concat(seq, rest);
    }
    return null;
  }
  try {
    const moves = dfs(start);
    return moves ? { won: true, moves, nodes } : { won: false, gaveUp: false, nodes };
  } catch (e) {
    if (e === LIMIT) return { won: false, gaveUp: true, nodes };
    throw e;
  }
}

// replay a solution on a FRESH deal through the real rules; true only if every move is legal and the game is won
function replay(seed, draw, moves) {
  const s = E.deal(seed, draw);
  for (const m of moves) if (!E.apply(s, m)) return false;
  return s.won;
}

module.exports = { solve, replay, key, talon, candidates };
