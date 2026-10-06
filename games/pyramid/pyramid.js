/* 365 Pyramid on the shared card table, games/common/table.js (4 Oct 2026; owner: "yes build TriPeaks and Pyramid").
 * The rules are in engine.js (window.PyEngine), the proven-winnable deal numbers in deals.js (window.PY_DEALS), the
 * Journey in journey.js (window.PY_JOURNEY). Cards are taken away in pairs, so the table runs in its two-tap mode
 * (pairs: true): tap a card, then the one that makes 13 with it - or drag one onto the other. A King goes on one tap. */
(function () {
  'use strict';
  var E = window.PyEngine, PD = window.PY_DEALS || { p1: [], p2: [], p3: [], p4: [] };
  // each row of the pyramid sits half a card below the one above; on a phone held upright (tall) the cards overlap
  // sideways a little - the corner still shows - so they come out bigger

  function colX(L, c) { return Math.round(L.left + c * L.unit); }
  function layout(W, H) {
    var tall = H > W * 1.25, gap = Math.max(5, Math.min(16, Math.round(W * 0.011))), rs = tall ? 0.56 : 0.5, step = tall ? 0.84 : 1;
    var byW = tall ? (W - gap * 2) / (1 + 6 * step) : (W - gap * 8) / 7, byH = (H - gap * 3) / (1 + 6 * rs) / 1.4;
    var cw = Math.max(Math.min(30, Math.floor(byW)), Math.floor(Math.min(byW, byH, 160))), ch = Math.round(cw * 1.4), unit = tall ? Math.round(cw * step) : cw + gap;
    var need = ch * (1 + 6 * rs) + gap * 2;
    var L = { cw: cw, ch: ch, gap: gap, W: W, H: H, rs: rs, unit: unit, left: Math.round((W - (cw + 6 * unit)) / 2), top: gap + Math.round(Math.max(0, H - need - gap) * (tall ? 0.4 : 0.3)) };
    L.slots = [{ key: 'stock', x: colX(L, 0), y: L.top, cls: 'stock', text: '' }, { key: 'w', x: colX(L, 1), y: L.top, cls: 'tab', text: '' },
               { key: 'f', x: colX(L, 6), y: L.top, cls: 'found', text: 'K' }];
    return L;
  }
  function placeXY(L, i) { var r = E.ROW[i], k = i - r * (r + 1) / 2; return { x: colX(L, 3 - r / 2 + k), y: Math.round(L.top + r * L.rs * L.ch), z: 500 + r * 20 + k }; }
  function positions(S, L) {
    var P = {};
    S.stock.forEach(function (c, i) { var k = Math.min(3, Math.floor(i / 6)); P[c] = { x: colX(L, 0) + k, y: L.top - k, z: 10 + i, up: false, pile: 's' }; });
    S.waste.forEach(function (c, i) { P[c] = { x: colX(L, 1), y: L.top, z: 100 + i, up: true, pile: 'w' }; });
    S.done.forEach(function (c, i) { P[c] = { x: colX(L, 6), y: L.top, z: 300 + i, up: true, pile: 'f' }; });
    S.tab.forEach(function (c, i) { if (c != null) { var q = placeXY(L, i); P[c] = { x: q.x, y: q.y, z: q.z, up: true, pile: 't' + i }; } });
    return P;
  }
  function where(S, c) {
    if (S.stock.indexOf(c) >= 0) return { p: 'stock' };
    if (S.waste.length && S.waste[S.waste.length - 1] === c) return { p: 'w' };
    var i = S.tab.indexOf(c);
    return i >= 0 && E.free(S, i) ? { p: 't', i: i } : null;
  }
  function picked(S, from) { var c = E.cardAt(S, from); return c == null ? [] : [c]; }
  function targets(S, from, L, P) {
    var out = [{ to: { p: 'f' }, x: colX(L, 6), y: L.top }];
    E.avail(S).forEach(function (pos) { if (!E.same(pos, from)) { var c = E.cardAt(S, pos); out.push({ to: pos, x: P[c].x, y: P[c].y }); } });
    return out;
  }
  function partnerCards(S, from) { return E.partners(S, from).filter(function (p) { return p.p !== 'f'; }).map(function (p) { return E.cardAt(S, p); }); }
  function hintLights(S, m) {
    if (m.t === 'draw') return S.stock.length ? { cards: [S.stock[S.stock.length - 1]], say: 'Turn a card over from the deck' } : { slots: ['stock'], say: 'Turn the pile over and go through the deck again' };
    var out = { cards: [E.cardAt(S, m.from)], slots: [] };
    if (m.to.p === 'f') out.slots.push('f'); else out.cards.push(E.cardAt(S, m.to));
    return out;
  }
  // in plain words: what goes with what
  var WORD = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  function a(r) { return (r === 1 || r === 8 ? 'an ' : 'a ') + WORD[r]; }
  function pickSay(S, from) {
    var r = E.rank(E.cardAt(S, from)), need = 13 - r;
    return partnerCards(S, from).length ? 'Now tap ' + a(need) + ' to go with it - together they make 13' : 'No free ' + WORD[need] + ' to go with it yet - turn the deck, or tap another card';
  }
  function whyNot(S, from, to) {
    var c = E.cardAt(S, from); if (c == null) return 'No move for that card yet';
    var r = E.rank(c);
    if (to && to.p === 'f') return 'Only a King goes on its own - ' + a(r) + ' needs ' + a(13 - r);
    var b = to ? E.cardAt(S, to) : null;
    if (b != null) return a(r).replace(/^a/, 'A') + ' and ' + a(E.rank(b)) + ' make ' + (r + E.rank(b)) + ' - a pair has to make 13';
    return a(r).replace(/^a/, 'A') + ' goes with ' + a(13 - r);
  }
  function cantPick(S, c) {
    if (S.done.indexOf(c) >= 0) return 'Those cards are finished with';
    if (S.waste.indexOf(c) >= 0) return 'Only the top card of the pile can be used';
    if (S.tab.indexOf(c) >= 0) return 'This card is still covered - take away the two cards on top of it first';
    return '';
  }
  function valid(s) {
    var seen = {}, n = 0;
    try {
      s.tab.forEach(function (c) { if (c != null) { seen[c] = 1; n++; } });
      s.stock.concat(s.waste, s.done).forEach(function (c) { seen[c] = 1; n++; });
    } catch (e) { return false; }
    return n === 52 && Object.keys(seen).length === 52 && s.tab.length === 28 && E.LIMIT.hasOwnProperty(s.lv);
  }

  var LV = {
    1: { name: 'Easy', stars: 1, stat: 'e', line: 'Through the deck as often as you like · Undo and Hint' },
    3: { name: 'Normal', stars: 2, stat: 'n', line: 'Three times through the deck · Undo and Hint' },
    5: { name: 'Hard', stars: 3, stat: 'h', line: 'Twice through the deck · no Hint' },
    7: { name: 'Expert', stars: 4, stat: 'x', line: 'Once through the deck · no Undo, no Hint' }
  };
  function lvOf(S) { return LV[S.lv] ? S.lv : 1; }
  function list(v) { var l = { 1: PD.p4, 3: PD.p3, 5: PD.p2, 7: PD.p1 }[v] || PD.p4; return l && l.length ? l : null; }

  Table365.start({
    id: 'pyramid', store: 'py365', title: 'Pyramid', cards: 52, hasStock: true, pairs: true,
    face: function (c) { return { r: E.rank(c), s: E.suit(c) }; },
    E: E, layout: layout, positions: positions, where: where, picked: picked, targets: targets, hintLights: hintLights, valid: valid,
    whyNot: whyNot, cantPick: cantPick, partnerCards: partnerCards, pickSay: pickSay,
    variant: { key: 'lv', stateKey: 'lv', label: 'Difficulty', small: 'Changes from your next game.', options: [[1, 'Easy'], [3, 'Normal'], [5, 'Hard'], [7, 'Expert']], def: 1,
               newLabel: function (v) { return LV[v] ? LV[v].name : 'Easy'; }, info: function (v) { return LV[v] ? LV[v].line : ''; },
               stars: function (v) { return LV[v] ? LV[v].stars : 1; },
               statKey: function (v) { return LV[v] ? LV[v].stat : 'e'; }, bestLabel: function (v) { return LV[v] ? LV[v].name : 'easy'; } },
    deals: list,
    rules: function (S) { var v = lvOf(S); return { undo: v !== 7, hint: v <= 3 }; },
    winBonus: function (S, secs) { return Math.round(((S.stock.length + S.waste.length) * 10 + Math.max(0, 900 - secs) / 2) * ({ 1: 1, 3: 1.25, 5: 1.6, 7: 2 }[lvOf(S)] || 1)); },
    describe: function (S) { return LV[lvOf(S)].name + ' level'; },
    noDrawSay: function (S) { return !S.stock.length && S.waste.length ? 'That was your last time through the deck at ' + LV[lvOf(S)].name + ' level' : 'The deck is empty'; },
    slotHtml: function (key, S) { return key === 'stock' ? (!S.stock.length ? (S.waste.length && E.canRecycle(S) ? Table365.RECYCLE : '<span class="spent" title="No more times through the deck">&#10005;</span>') : '') : null; },
    noTap: function (from) { return from.p === 'f'; },
    // the Hall of Fame (games/common/hof.js; api/games-hof.php replays every win with api/games-py-lib.php), the 3-minute
    // sprint and the Journey. ⚠ sprintSeed must match py_sprint_seed there; foundCount must match py_found_count.
    hof: true, sprintLevel: 1,
    sprintSeed: function (n) { var l = PD.p4.length ? PD.p4 : [1]; return l[((n * 104729 + 17) % l.length + l.length) % l.length]; },
    foundCount: function (S) { return 28 - E.left(S); },
    sprintWords: { pill: 'cleared', sub: 'cleared from the pyramid', line: 'As many cards off the pyramid as you can', board: 'the most cards cleared from the pyramid in three minutes (all 28 wins it)' },
    journey: window.PY_JOURNEY ? Object.assign({ where: 'through the New Forest to the Solent' }, window.PY_JOURNEY) : null,
    journeyLevelName: function (lv) { return LV[lv] ? LV[lv].name + ' · ' + LV[lv].line : ''; },
    winnableSmall: 'Every deal has been played through to a win by our solver first, at that level.',
    dealOrder: function (S) { var o = [], i; for (i = 0; i < 28; i++) o.push(S.tab[i]); return o; },
    deckPos: function (L) { return { x: colX(L, 0), y: L.top }; },
    cascade: function (S, L) { return S.done.slice().reverse().map(function (c) { return { c: c, x: colX(L, 6), y: L.top }; }); },
    help: [
      '<b>The aim:</b> clear the whole pyramid.',
      '<b>Take away two cards that add up to 13.</b> An Ace counts 1, a Jack 11 and a Queen 12 &mdash; so a 6 with a 7, a 5 with an 8, a 2 with a Jack, an Ace with a Queen. A <b>King</b> is 13 on its own.',
      '<b>Tap a card, then tap the card to go with it.</b> Or drag one onto the other. Tap a King and it goes straight away.',
      'A card can only be used once <b>both cards on top of it</b> have gone.',
      '<b>Tap the deck</b> to turn a card onto the pile beside it &mdash; the top card of the pile pairs too. When the deck is empty, tap it to turn the pile over again.',
      '<b>Pick how hard</b> under <b>New game</b>: <b>Easy</b> lets you go through the deck as often as you like; <b>Normal</b> three times; <b>Hard</b> twice, with no Hint; <b>Expert</b> once, with no Undo either.',
      'Stuck? Press <b>Hint</b> (Easy and Normal). On Easy and Normal, the cards that go with the one you pick light up.'
    ]
  });
})();
