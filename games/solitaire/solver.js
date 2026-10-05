/*
 * 365 Solitaire - the Hint that plans ahead (games audit, 5 Oct 2026; critic: on Easy, doing exactly what the old Hint
 * said ran 4 deals in 11 - and Today's deal, the same for everyone - into "No more moves found", on deals sold as always
 * winnable). The old Hint took the best-looking move now; this one searches for a line that WINS from where the player
 * is, and hints its first move. Same search as tools/solitaire/solver.cjs (the one that picks the winnable deals), but
 * starting from the current position, and kept short: a node limit and a time limit, so a phone never waits long.
 * The line found is remembered, so pressing Hint again along it costs nothing.
 *
 * SolSolver.hint(s, greedy) -> a move (or greedy when the search gives up); when the search PROVES no win is left, the
 * move carries _note (table.js says it). Uses window.SolEngine; also loads under node for the tests.
 */
(function (root) {
  'use strict';
  var E = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.SolEngine;
  var LIMIT = {};

  function key(s) {   // positions that play the same (as the deal solver)
    var k = '', i, j;
    for (i = 0; i < s.tab.length; i++) { for (j = 0; j < s.tab[i].length; j++) k += (s.tab[i][j].up ? '+' : '-') + s.tab[i][j].c + ','; k += '|'; }
    var h = [0, 0, 0, 0];
    s.found.forEach(function (f) { if (f.length) h[E.suit(f[0])] = f.length; });
    k += h.join('.') + '#';
    if (s.draw === 1) k += s.stock.concat(s.waste).sort(function (a, b) { return a - b; }).join(',');
    else k += s.stock.join(',') + '/' + s.waste.join(',');
    return k + '#' + (s.passes || 0);
  }
  function exact(s) { return JSON.stringify([s.tab, s.found, s.stock, s.waste]); }   // the very same position (the plan)

  function talon(s) {
    var out = [], seen = {}, t = E.clone(s), total = t.stock.length + t.waste.length;
    if (!total) return out;
    if (t.waste.length) { var c0 = t.waste[t.waste.length - 1]; seen[c0] = 1; out.push({ card: c0, draws: 0 }); }
    for (var d = 1; d <= 2 * total + 4; d++) {
      if (!E.apply(t, { t: 'draw' })) break;
      if (!t.waste.length) continue;
      var c = t.waste[t.waste.length - 1];
      if (!seen[c]) { seen[c] = 1; out.push({ card: c, draws: d }); }
    }
    return out;
  }
  function draws(n) { var a = []; for (var i = 0; i < n; i++) a.push({ t: 'draw' }); return a; }
  function candidates(s) {
    var seqs = [], i, j, f, col, n;
    for (i = 0; i < 7; i++) {
      col = s.tab[i]; if (!col.length) continue;
      f = E.foundFor(s, col[col.length - 1].c);
      if (f >= 0) seqs.push({ w: 100 + (col.length > 1 && !col[col.length - 2].up ? 10 : 0), m: [{ t: 'move', from: { p: 't', i: i, n: 1 }, to: { p: 'f', i: f } }] });
    }
    var tal = talon(s);
    tal.forEach(function (x) { var f2 = E.foundFor(s, x.card); if (f2 >= 0) seqs.push({ w: 90 - x.draws * 0.01, m: draws(x.draws).concat([{ t: 'move', from: { p: 'w' }, to: { p: 'f', i: f2 } }]) }); });
    for (i = 0; i < 7; i++) {
      col = s.tab[i]; n = E.runLen(col); if (!n) continue;
      var base = col[col.length - n].c, below = col.length - n - 1;
      if (below < 0) continue;
      var usedEmpty = false;
      for (j = 0; j < 7; j++) {
        if (j === i) continue;
        var empty = !s.tab[j].length;
        if (empty && (usedEmpty || E.rank(base) !== 13)) continue;
        if (!empty && !E.canStack(base, s.tab[j])) continue;
        if (empty) usedEmpty = true;
        seqs.push({ w: 80 + below, m: [{ t: 'move', from: { p: 't', i: i, n: n }, to: { p: 't', i: j } }] });
      }
    }
    tal.forEach(function (x) {
      var usedE = false;
      for (var j2 = 0; j2 < 7; j2++) {
        var em = !s.tab[j2].length;
        if (em ? (E.rank(x.card) !== 13 || usedE) : !E.canStack(x.card, s.tab[j2])) continue;
        if (em) usedE = true;
        seqs.push({ w: 50 - x.draws * 0.01, m: draws(x.draws).concat([{ t: 'move', from: { p: 'w' }, to: { p: 't', i: j2 } }]) });
      }
    });
    for (i = 0; i < 7; i++) {
      col = s.tab[i]; n = E.runLen(col);
      for (var k = 1; k < n; k++) {
        var under = col[col.length - k - 1].c, mv = col[col.length - k].c;
        if (E.foundFor(s, under) < 0) continue;
        for (j = 0; j < 7; j++) if (j !== i && s.tab[j].length && E.canStack(mv, s.tab[j])) { seqs.push({ w: 60, m: [{ t: 'move', from: { p: 't', i: i, n: k }, to: { p: 't', i: j } }] }); break; }
      }
    }
    for (f = 0; f < 4; f++) {
      var pile = s.found[f]; if (!pile.length) continue;
      var pc = pile[pile.length - 1]; if (E.rank(pc) <= 2) continue;
      for (j = 0; j < 7; j++) if (s.tab[j].length && E.canStack(pc, s.tab[j])) { seqs.push({ w: 10, m: [{ t: 'move', from: { p: 'f', i: f }, to: { p: 't', i: j } }] }); break; }
    }
    seqs.sort(function (a, b) { return b.w - a.w; });
    return seqs.map(function (x) { return x.m; });
  }

  // from a position: {won, moves} | {won: false, gaveUp}
  function solveFrom(s0, limit, ms) {
    var seen = {}, nodes = 0, t0 = Date.now();
    function dfs(sIn) {
      if (++nodes > limit || ((nodes & 255) === 0 && Date.now() - t0 > ms)) throw LIMIT;
      var s = E.clone(sIn), forced = [], m;
      while ((m = E.autoMove(s))) { if (!E.apply(s, m)) return null; forced.push(m); }
      if (s.won) return forced;
      var k = key(s);
      if (seen[k]) return null;
      seen[k] = 1;
      var cs = candidates(s);
      for (var i = 0; i < cs.length; i++) {
        var t = E.clone(s), ok = true;
        for (var j = 0; j < cs[i].length; j++) if (!E.apply(t, cs[i][j])) { ok = false; break; }
        if (!ok) continue;
        var rest = dfs(t);
        if (rest) return forced.concat(cs[i], rest);
      }
      return null;
    }
    try { var mv = dfs(s0); return mv ? { won: true, moves: mv } : { won: false, gaveUp: false }; }
    catch (e) { if (e === LIMIT) return { won: false, gaveUp: true }; throw e; }
  }

  // the Hint: along the remembered line when the player is on it, else a fresh search
  var plan = null;
  function hint(s, greedy) {
    if (!s || s.won) return greedy;
    var here = exact(s);
    if (plan) { var at = plan.at.indexOf(here); if (at >= 0 && at < plan.moves.length) return plan.moves[at]; }
    var r = solveFrom(s, 25000, 450);
    if (r.gaveUp) r = solveFrom(s, 150000, 1600);   // a hard spot: one longer look before falling back (rare - about 1 deal in 50)
    if (r.won && r.moves.length) {
      var t = E.clone(s), at2 = [exact(t)];
      for (var i = 0; i < r.moves.length - 1; i++) { E.apply(t, r.moves[i]); at2.push(exact(t)); }
      plan = { moves: r.moves, at: at2 };
      return r.moves[0];
    }
    plan = null;
    if (!r.gaveUp) {   // searched it all: no win from here (the deal could be won, but not from this position)
      var g = greedy ? JSON.parse(JSON.stringify(greedy)) : null;
      if (g) g._note = 'Careful – this deal can’t be won from here any more. Undo back a few moves and try another way.';
      return g;
    }
    return greedy;
  }
  var api = { hint: hint, solveFrom: solveFrom, reset: function () { plan = null; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SolSolver = api;
})(typeof window !== 'undefined' ? window : this);
