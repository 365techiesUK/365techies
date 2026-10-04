/* 365 Solitaire (Klondike) on the shared card table, games/common/table.js (3 Oct 2026). The rules are in engine.js
 * (window.SolEngine), the proven-winnable deal numbers in deals.js (window.SOL_DEALS). This file only says where the
 * piles sit and how a card is picked up; everything else - dealing, dragging, Undo, Hint, the win, scores - is the
 * table's. The storage names (sol365:*) and score keys (best.d1 / best.d3) are the ones Solitaire has always used, so
 * players keep their saved game and scores. */
(function () {
  'use strict';
  var E = window.SolEngine, DEALS = window.SOL_DEALS || null;

  function colX(L, i) { return L.left + i * (L.cw + L.gap); }
  function layout(W, H) {
    var gap = Math.max(6, Math.min(18, Math.round(W * 0.012)));
    var byW = (W - gap * 8) / 7, byH = (H - gap * 3) / 4.25 / 1.4;
    var cw = Math.max(32, Math.floor(Math.min(byW, byH, 170))), ch = Math.round(cw * 1.4);
    var L = { cw: cw, ch: ch, gap: gap, W: W, H: H, left: Math.round((W - (7 * cw + 6 * gap)) / 2), top: gap, tabY: gap + ch + Math.round(gap * 1.6) };
    L.slots = [{ key: 'stock', x: colX(L, 0), y: L.top, cls: 'stock', text: '' }];
    for (var f = 0; f < 4; f++) L.slots.push({ key: 'f' + f, x: colX(L, 3 + f), y: L.top, cls: 'found', text: 'A' });
    for (var t = 0; t < 7; t++) L.slots.push({ key: 't' + t, x: colX(L, t), y: L.tabY, cls: 'tab', text: 'K' });
    return L;
  }
  function colGaps(L, col) {   // face-down cards close together, face-up ones far enough apart to read; squeezed if long
    var tall = L.H > L.W * 1.25, fd = L.ch * (tall ? 0.15 : 0.11), fu = L.ch * (tall ? 0.42 : 0.3), downs = 0, ups = 0, avail = L.H - L.tabY - L.gap;
    col.forEach(function (x) { if (x.up) ups++; else downs++; });
    var need = L.ch + downs * fd + Math.max(0, ups - 1) * fu;
    if (need > avail && ups > 1) { fu = Math.max(L.ch * 0.16, (avail - L.ch - downs * fd) / (ups - 1)); need = L.ch + downs * fd + (ups - 1) * fu; }
    if (need > avail && downs > 0) fd = Math.max(L.ch * 0.05, (avail - L.ch - Math.max(0, ups - 1) * fu) / downs);
    return { fd: fd, fu: fu };
  }
  function positions(S, L) {
    var P = {};
    S.stock.forEach(function (c, i) { var k = Math.min(3, Math.floor(i / 8)); P[c] = { x: colX(L, 0) + k, y: L.top - k, z: 10 + i, up: false, pile: 's' }; });
    var n = S.waste.length, start = Math.max(0, n - (S.draw === 3 ? 3 : 1)), fan = Math.round(L.cw * 0.28);
    S.waste.forEach(function (c, i) { P[c] = { x: colX(L, 1) + (i >= start ? i - start : 0) * fan, y: L.top, z: 100 + i, up: true, pile: 'w' }; });
    S.found.forEach(function (f, fi) { f.forEach(function (c, i) { P[c] = { x: colX(L, 3 + fi), y: L.top, z: 300 + fi * 20 + i, up: true, pile: 'f' + fi }; }); });
    S.tab.forEach(function (col, ci) {
      var g = colGaps(L, col), y = L.tabY;
      col.forEach(function (x, i) { P[x.c] = { x: colX(L, ci), y: Math.round(y), z: 500 + i, up: x.up, pile: 't' + ci }; y += x.up ? g.fu : g.fd; });
    });
    return P;
  }
  function where(S, c) {   // where a card is, and how it could be picked up; null if it can't be
    if (S.stock.indexOf(c) >= 0) return { p: 'stock' };
    var wi = S.waste.indexOf(c); if (wi >= 0) return wi === S.waste.length - 1 ? { p: 'w' } : null;
    for (var f = 0; f < 4; f++) { var fi = S.found[f].indexOf(c); if (fi >= 0) return fi === S.found[f].length - 1 ? { p: 'f', i: f } : null; }
    for (var t = 0; t < 7; t++) {
      var col = S.tab[t];
      for (var k = 0; k < col.length; k++) if (col[k].c === c) return col[k].up ? { p: 't', i: t, n: col.length - k } : null;
    }
    return null;
  }
  function picked(S, from) {
    if (from.p === 'w') return S.waste.length ? [S.waste[S.waste.length - 1]] : [];
    if (from.p === 'f') return S.found[from.i].length ? [S.found[from.i][S.found[from.i].length - 1]] : [];
    if (from.p === 't') return S.tab[from.i].slice(S.tab[from.i].length - from.n).map(function (x) { return x.c; });
    return [];
  }
  function targets(S, from, L, P) {
    var out = [], j;
    if (picked(S, from).length === 1) for (var f = 0; f < 4; f++) out.push({ to: { p: 'f', i: f }, x: colX(L, 3 + f), y: L.top });
    for (j = 0; j < 7; j++) { var col = S.tab[j]; out.push({ to: { p: 't', i: j }, x: colX(L, j), y: col.length ? P[col[col.length - 1].c].y : L.tabY }); }
    return out;
  }
  function autoNext(S, keepDown) {   // the next card that can safely go up to its pile
    var cands = [], i, k, x, f;
    if (S.waste.length) cands.push({ c: S.waste[S.waste.length - 1], from: { p: 'w' } });
    for (i = 0; i < 7; i++) { var col = S.tab[i]; if (col.length && col[col.length - 1].up) cands.push({ c: col[col.length - 1].c, from: { p: 't', i: i, n: 1 } }); }
    for (k = 0; k < cands.length; k++) {
      x = cands[k]; if (x.c === keepDown) continue;
      f = E.foundFor(S, x.c);
      if (f >= 0 && E.safeToFound(S, x.c)) return { t: 'move', from: x.from, to: { p: 'f', i: f } };
    }
    return null;
  }
  function hintLights(S, m) {
    if (m.t === 'draw') return S.stock.length ? { cards: [S.stock[S.stock.length - 1]], say: 'Turn over a card from the deck' } : { slots: ['stock'], say: 'Turn the deck over' };
    var out = { cards: picked(S, m.from).slice(), slots: [] };
    if (m.to.p === 'f') { var fp = S.found[m.to.i]; if (fp.length) out.cards.push(fp[fp.length - 1]); else out.slots.push('f' + m.to.i); }
    else { var col = S.tab[m.to.i]; if (col.length) out.cards.push(col[col.length - 1].c); else out.slots.push('t' + m.to.i); }
    return out;
  }
  // 3 Oct 2026 (owner, on the Dell: the Kings "just come back"): when a move is refused, say why in plain words
  var WORD = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  function colour(c) { return E.red(c) ? 'red' : 'black'; }
  function pileNeeds(S, to) {
    var f = S.found[to.i];
    if (!f.length) return 'Each pile starts with an Ace';
    var t = f[f.length - 1];
    return E.rank(t) === 13 ? 'That pile is finished' : 'Each pile goes up in one suit - this one needs the ' + WORD[E.rank(t) + 1] + ' of ' + E.SUIT_NAME[E.suit(t)] + ' next';
  }
  function whyNot(S, from, to) {
    var cards = picked(S, from); if (!cards.length) return 'No move for that card yet';
    var c = cards[0], r = E.rank(c), empty = S.tab.some(function (col) { return !col.length; });
    var king = 'A King can only go in an empty column - move every card out of a column first';
    if (to && to.p === 'f') return cards.length > 1 ? 'Only one card at a time goes up to a pile' : pileNeeds(S, to);
    if (to && to.p === 't') {
      var col = S.tab[to.i];
      if (!col.length) return 'Only a King can go in an empty column';
      if (r === 13) return king;
      return 'A ' + colour(c) + ' ' + WORD[r] + ' goes on a ' + (E.red(c) ? 'black' : 'red') + ' ' + WORD[r + 1];
    }
    if (r === 13 && !empty) return king;   // a tap with nowhere to go
    return 'No move for that card yet - try turning over a card from the deck';
  }
  function cantPick(S, c) {
    if (S.waste.indexOf(c) >= 0) return 'Only the top card of that pile can be played';
    for (var t = 0; t < 7; t++) for (var k = 0; k < S.tab[t].length; k++) if (S.tab[t][k].c === c && !S.tab[t][k].up) return 'This card turns over once the cards on top of it have moved';
    return '';
  }
  function valid(s) {
    var n = 0, seen = {};
    try {
      s.stock.concat(s.waste).forEach(function (c) { seen[c] = 1; n++; });
      s.found.forEach(function (f) { f.forEach(function (c) { seen[c] = 1; n++; }); });
      s.tab.forEach(function (col) { col.forEach(function (o) { seen[o.c] = 1; n++; }); });
    } catch (e) { return false; }
    if (!(n === 52 && Object.keys(seen).length === 52 && (s.draw === 1 || s.draw === 3))) return false;
    if (!LV[s.lv]) s.lv = s.draw;                          // saved before 4 Oct: the old one-card / three-card game
    if (typeof s.limit !== 'number') s.limit = E.LIMIT[s.lv] || 0;
    return true;
  }

  // 4 Oct 2026 - difficulty (owner: "levels ... so they can pick hardness ... easy, and all that business"). The values are
  // the engine's: 1 and 3 are the old one-card and three-card games, so saved games, settings, scores (best.d1 / best.d3)
  // and shared links carry on unchanged.
  var LV = {
    1: { name: 'Easy', stars: 1, stat: 'd1', line: 'Turn one card · every deal can be won · Undo and Hint' },
    3: { name: 'Normal', stars: 2, stat: 'd3', line: 'Turn three cards · every deal can be won · Undo and Hint' },
    5: { name: 'Hard', stars: 3, stat: 'h', line: 'Turn three · three times through the deck · no Hint · not every deal can be won' },
    7: { name: 'Expert', stars: 4, stat: 'x', line: 'Turn three · once through the deck · no Undo, no Hint' }
  };
  function lvOf(S) { return LV[S.lv] ? S.lv : (S.draw === 3 ? 3 : 1); }

  Table365.start({
    id: 'solitaire', store: 'sol365', title: 'Solitaire', cards: 52, hasStock: true,
    face: function (c) { return { r: E.rank(c), s: E.suit(c) }; },
    E: E, layout: layout, positions: positions, where: where, picked: picked, targets: targets, autoNext: autoNext, hintLights: hintLights, valid: valid,
    whyNot: whyNot, cantPick: cantPick,
    variant: { key: 'draw', stateKey: 'lv', label: 'Difficulty', small: 'Changes from your next game.', options: [[1, 'Easy'], [3, 'Normal'], [5, 'Hard'], [7, 'Expert']], def: 1,
               newLabel: function (v) { return LV[v] ? LV[v].name : 'Easy'; }, info: function (v) { return LV[v] ? LV[v].line : ''; },
               stars: function (v) { return LV[v] ? LV[v].stars : 1; },
               statKey: function (v) { return LV[v] ? LV[v].stat : 'd1'; }, bestLabel: function (v) { return LV[v] ? LV[v].name.toLowerCase() : 'easy'; } },
    deals: DEALS ? function (v) { return v === 1 ? DEALS.d1 : v === 3 ? DEALS.d3 : null; } : null,   // Hard and Expert: any deal at all
    // 4 Oct 2026 - the Hall of Fame (games/common/hof.js + api/games-hof.php) and its two races: Today's deal, and the
    // 3-minute sprint on one turn-one deal for everyone. ⚠ sprintSeed must match sol_sprint_seed in api/games-sol-lib.php.
    hof: true, sprintLevel: 1,
    sprintSeed: function (n) { var l = DEALS && DEALS.d1; return l && l.length ? l[((n * 104729 + 17) % l.length + l.length) % l.length] : 700000 + ((n % 90000) + 90000) % 90000; },
    foundCount: function (S) { return S.found[0].length + S.found[1].length + S.found[2].length + S.found[3].length; },
    winnableSmall: 'On Easy and Normal, every deal has been played through to a win first. Hard and Expert can be any deal.',
    rules: function (S) { var v = lvOf(S); return { undo: v !== 7, hint: v === 1 || v === 3 }; },
    noDrawSay: function (S) { return !S.stock.length && S.waste.length ? 'That was your last time through the deck at ' + LV[lvOf(S)].name + ' level' : ''; },
    winBonus: function (S, secs) { return Math.round((100 + Math.max(0, 1200 - secs) / 2) * ({ 1: 1, 3: 1.25, 5: 1.6, 7: 2 }[lvOf(S)] || 1)); },
    dealOrder: function (S) { var o = [], row, col; for (row = 0; row < 7; row++) for (col = row; col < 7; col++) o.push(S.tab[col][row].c); return o; },
    deckPos: function (L) { return { x: colX(L, 0), y: L.top }; },
    cascade: function (S, L) { var q = [], r, f; for (r = 13; r >= 1; r--) for (f = 0; f < 4; f++) { var c = S.found[f][r - 1]; if (c != null) q.push({ c: c, x: colX(L, 3 + f), y: L.top }); } return q; },
    slotHtml: function (key, S) { return key === 'stock' ? (!S.stock.length && S.waste.length ? (E.canRecycle(S) ? Table365.RECYCLE : '<span class="spent" title="No more times through the deck">&#10005;</span>') : '') : null; },
    noTap: function (from) { return from.p === 'f'; },
    describe: function (S) { return LV[lvOf(S)].name + ' level'; },
    help: [
      '<b>The aim:</b> build the four piles at the top, one for each suit, from Ace up to King.',
      '<b>In the seven columns</b>, put each card on one a step higher of the other colour &mdash; a red 6 on a black 7.',
      '<b>Tap a card</b> and it moves to the best place for it. You can drag cards too, if you prefer.',
      '<b>Tap the deck</b> at the top left to turn over new cards. When it&rsquo;s empty, tap it to start again.',
      '<b>Pick how hard</b> under <b>New game</b>: <b>Easy</b> turns one card at a time; <b>Normal</b> turns three; <b>Hard</b> lets you go through the deck only three times, with no Hint; <b>Expert</b> only once, with no Undo or Hint. Harder levels score more.',
      '<b>Only a King</b> can go in an empty column.',
      'Stuck? Press <b>Hint</b> and the next move lights up. <b>Undo</b> takes back as many moves as you like (on Easy and Normal).'
    ]
  });
})();
