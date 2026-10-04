/* 365 Games - the card table shared by Solitaire, FreeCell and Spider (3 Oct 2026; Solitaire's screen made general).
 * A game page loads its rules (engine.js), its deal list, its layout file (which calls Table365.start(def)) and this.
 * This file does everything a card game looks and feels like: the bar and buttons, real card elements moved with CSS
 * transforms (dealing, 3D flips, flying to the piles), tap-to-move and drag, Undo, Hint, "No more moves", moving cards
 * up by themselves, the automatic finish, the bouncing-cards win, sounds made on the spot, the pop-up sheets, personal
 * scores, Today's deal and saving the game in this browser. Nothing is sent anywhere.
 *
 * The game's def supplies: id, store (localStorage prefix), title, cards (52/104), face(c, S) -> {r, s}, E (rules:
 * deal, clone, legal, apply, smartMove, hint, stuck, optional finishable/finishStep), layout(W, H, S) -> L {cw, ch,
 * slots: [{key, x, y, cls, text}]}, positions(S, L) -> {card: {x, y, z, up, pile}}, where(S, c) -> {p:'stock'} | from |
 * null, picked(S, from), targets(S, from, L, P) -> [{to, x, y}], dealOrder(S), deckPos(L), cascade(S, L) -> [{c, x, y}],
 * hintLights(S, m) -> {cards, slots}, optional: variant, deals(v), daily(v), autoNext(S, keepDown), slotHtml(key, S),
 * winBonus(S, secs), describe(S), help, valid(s), faceKey(S), noTap(from), bestLabel(v), whyNot(S, from, to|null) and
 * cantPick(S, c) - a plain-words reason when a move is refused or a card won't lift.
 * Pyramid (4 Oct 2026): pairs: true - a tap picks a card up and a second tap on its partner plays the pair (a King, or
 * anything E.smartMove takes on its own, goes at once); partnerCards(S, from) -> the cards that would go with it (they
 * glow when the level allows a Hint), pickSay(S, from) -> what to tell the player. An fx with big: true (a peak or a
 * row cleared) gets the big burst.
 * Every timed step checks `gen` (bumped by a new game, or Undo while cards are still moving) and stops if it changed. */
(function () {
  'use strict';

  var SUIT_CH = ['♠', '♥', '♦', '♣'];
  var RANK_CH = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var TXT = '︎';   // keep the suit signs as plain text, never coloured emoji
  var PIPS = {
    2: [[50, 0], [50, 100]], 3: [[50, 0], [50, 50], [50, 100]], 4: [[0, 0], [100, 0], [0, 100], [100, 100]],
    5: [[0, 0], [100, 0], [50, 50], [0, 100], [100, 100]], 6: [[0, 0], [100, 0], [0, 50], [100, 50], [0, 100], [100, 100]],
    7: [[0, 0], [100, 0], [50, 25], [0, 50], [100, 50], [0, 100], [100, 100]],
    8: [[0, 0], [100, 0], [50, 25], [0, 50], [100, 50], [50, 75], [0, 100], [100, 100]],
    9: [[0, 0], [100, 0], [0, 33.3], [100, 33.3], [50, 50], [0, 66.7], [100, 66.7], [0, 100], [100, 100]],
    10: [[0, 0], [100, 0], [50, 16.7], [0, 33.3], [100, 33.3], [0, 66.7], [100, 66.7], [50, 83.3], [0, 100], [100, 100]]
  };
  var COURT = {   // a plume for the Jack, a tiara for the Queen, a crown for the King
    11: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20c1.5-7 6-12.5 15-15-2.5 2.6-3.8 5.2-4.3 8.4L18 14c-5.2.2-9.6 2-14 6z"/><circle cx="19" cy="4.6" r="1.7"/></svg>',
    12: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17 5.4 8.6l4 3.9L12 6.5l2.6 6 4-3.9L20 17z"/><circle cx="5.4" cy="7" r="1.5"/><circle cx="12" cy="4.6" r="1.5"/><circle cx="18.6" cy="7" r="1.5"/><rect x="4" y="18.2" width="16" height="2.4" rx="1"/></svg>',
    13: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.2 4.2 6.8l4.6 4.3L12 3.6l3.2 7.5 4.6-4.3L21 17.2z"/><rect x="3" y="18.4" width="18" height="2.8" rx="1"/></svg>'
  };
  var RECYCLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.4-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 21v-5h5"/></svg>';
  var ICON = {
    'new': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="11" height="15" rx="2"/><path d="M9 21h9a2 2 0 0 0 2-2V8"/><path d="M9.5 8v5M7 10.5h5"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    hint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
    stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.6-2.8 4.3M12 17.6h.01"/></svg>',
    games: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3"/></svg>',
    feedback: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-5 4V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5z"/><path d="M9 9.5h.01M15 9.5h.01M9.2 12.6a3.6 3.6 0 0 0 5.6 0"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>'
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  // one card's face and back, as classes and inner markup (shared with games/common/rivals.js, 5 Oct 2026)
  function cardMarkup(r, s) {
    var su = SUIT_CH[s] + TXT, red = s === 1 || s === 2, mid;
    if (r === 1) mid = '<div class="ace">' + su + (s === 0 ? '<i>365</i>' : '') + '</div>';
    else if (r > 10) mid = '<div class="court">' + COURT[r] + '<b>' + RANK_CH[r] + '</b><em>' + su + '</em></div>';
    else mid = '<div class="pips">' + PIPS[r].map(function (p) {
      return '<span class="pip' + (p[1] > 50 ? ' dn' : '') + '" style="left:' + p[0] + '%;top:' + p[1] + '%">' + su + '</span>';
    }).join('') + '</div>';
    return { cls: (red ? 'red' : 'blk') + ' r' + r, html: '<div class="wig"><div class="flip"><div class="face front"><span class="idx' + (r === 10 ? ' ten' : '') + '">' + RANK_CH[r]
      + '</span><span class="sui">' + su + '</span>' + mid + '<span class="cor"><i>' + su + '</i></span></div><div class="face back"></div></div></div>' };
  }

  function start(D) {
    var E = D.E;
    var $ = function (id) { return document.getElementById(id); };
    var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var V = D.variant || null;   // e.g. Solitaire's one or three cards, Spider's suits
    // what the sprint counts, in this game's words (Spider counts cards in suit order, not cards up to the piles)
    var SPW = D.sprintWords || { pill: 'cards up', sub: 'up to the piles', line: 'As many cards up as you can', board: 'the most cards up to the piles in three minutes' };

    // ------------------------------------------------------------ what this browser remembers (per game)
    function load(k, d) { try { var v = localStorage.getItem(D.store + ':' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
    function save(k, v) { try { localStorage.setItem(D.store + ':' + k, JSON.stringify(v)); } catch (e) {} }
    var SET = { winnable: true, auto: true, sound: true, timer: true, felt: 'green', back: 'navy', fx: true, seenHelp: false };
    if (V) SET[V.key] = V.def;
    (function () { var s = load('settings', null); if (s && typeof s === 'object') for (var k in SET) if (k in s) SET[k] = s[k]; })();
    if (V && !V.options.some(function (o) { return o[0] === SET[V.key]; })) SET[V.key] = V.def;
    function blankStats() { return { v: 1, played: 0, won: 0, streak: 0, bestStreak: 0, best: {}, daily: {}, recent: [] }; }
    var ST = blankStats();
    (function () { var s = load('stats', null); if (s && s.v === 1) for (var k in ST) if (k in s) ST[k] = s[k]; if (!ST.best || typeof ST.best !== 'object') ST.best = {}; })();
    function vKey(v) { return V ? (V.statKey ? V.statKey(v) : 'v' + v) : 'all'; }
    function vOf(s) { return V ? s[V.stateKey || V.key] : 0; }
    // what this game's level allows (4 Oct 2026: Solitaire's Hard has no Hint, Expert no Undo or Hint)
    function rules() { var r = D.rules && S ? D.rules(S) : null; return { undo: !r || r.undo !== false, hint: !r || r.hint !== false }; }

    var S = null, G = null, busy = false, gen = 0;
    function newG(mode, day) {
      // log: the moves, as codes (Solitaire's E.code), so the Hall of Fame can replay a win; limit: a challenge's clock
      return { undo: [], ms: 0, mode: mode || 'deal', day: day || '', started: false, counted: false, undid: 0, keepDown: null, log: [],
               limit: mode === 'clock' ? (D.clockMins ? D.clockMins(S) : 5) * 60000 : mode === 'sprint' ? 180000 : 0, timeUp: false, over: false };   // Spider's clock is longer
    }
    function logMove(m) { if (E.code && G && G.log) { G.log.push(E.code(m)); if (G.log.length > 3000) G.log.length = 3000; } }

    // ------------------------------------------------------------ the page
    buildUI();
    var board = $('board');
    var cardEl = [], slotEl = {}, faceKey = '';
    function makeCard(c) {
      var f = D.face(c, S), k = cardMarkup(f.r, f.s), el = cardEl[c] || document.createElement('div');
      el.className = 'card down ' + k.cls;
      el.setAttribute('data-c', c);
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = k.html;
      return el;
    }
    function faces() {   // (re)draw the faces when the game's card set changes (Spider's one, two or four suits)
      var k = D.faceKey ? D.faceKey(S) : 'x';
      if (k === faceKey && cardEl.length) return;
      faceKey = k; imgCache = {};
      for (var c = 0; c < D.cards; c++) { var el = makeCard(c); if (!el.parentNode) board.appendChild(el); cardEl[c] = el; }
    }

    // ------------------------------------------------------------ where everything sits
    var L = { cw: 90, ch: 126, slots: [] };
    function layout() {
      L = D.layout(board.clientWidth, board.clientHeight, S);
      document.documentElement.style.setProperty('--cw', L.cw + 'px');
      document.documentElement.style.setProperty('--ch', L.ch + 'px');
      var seen = {};
      (L.slots || []).forEach(function (s) {
        var el = slotEl[s.key];
        if (!el) { el = slotEl[s.key] = document.createElement('div'); board.insertBefore(el, board.querySelector('.card')); }   // in order, under the cards
        el.className = 'slot ' + (s.cls || ''); el.setAttribute('data-slot', s.key);
        if (s.text != null && !el.getAttribute('data-html')) el.textContent = s.text;
        el.style.transform = 'translate3d(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px,0)';
        el.style.display = '';
        seen[s.key] = 1;
      });
      for (var k in slotEl) if (!seen[k]) slotEl[k].style.display = 'none';
      imgCache = {};
    }
    var lastP = {};
    function render(instant) {
      var P = D.positions(S, L);
      if (instant) board.classList.add('instant');
      for (var c = 0; c < D.cards; c++) {
        var p = P[c], el = cardEl[c], old = lastP[c];
        if (!p) { el.style.display = 'none'; continue; }
        el.style.display = '';
        if (!el.classList.contains('drag')) el.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
        el.classList.toggle('down', !p.up);
        el._z = p.z;
        if (!instant && old && old.pile !== p.pile) {   // flying to another pile: on top of everything until it lands
          el.style.zIndex = 2000 + p.z; clearTimeout(el._zt);
          el._zt = setTimeout((function (e) { return function () { e.style.zIndex = e._z; e._zt = 0; }; })(el), 320);
          flyOn(el);
        } else if (!el._zt) el.style.zIndex = p.z;
        if (!instant && old && !old.up && p.up) shineOn(el);   // turned face up: it catches the light
      }
      lastP = P;
      if (D.slotHtml) for (var k in slotEl) { var h = D.slotHtml(k, S); if (h != null) { slotEl[k].setAttribute('data-html', '1'); if (slotEl[k]._h !== h) { slotEl[k].innerHTML = h; slotEl[k]._h = h; } } }
      if (instant) { void board.offsetWidth; board.classList.remove('instant'); }
      bar();
    }
    // a card lifts, tilts and settles as it flies; a card turned over catches the light (Extra effects)
    function flyOn(el) {
      if (!SET.fx || reduce) return;
      el.classList.remove('fly'); void el.offsetWidth; el.classList.add('fly');
      clearTimeout(el._ft); el._ft = setTimeout(function () { el.classList.remove('fly'); }, 420);
    }
    function shineOn(el) {
      if (!SET.fx || reduce) return;
      clearTimeout(el._st); el.classList.remove('shine');
      el._st = setTimeout(function () { el.classList.add('shine'); el._st = setTimeout(function () { el.classList.remove('shine'); }, 800); }, 240);
    }
    var shownScore = null;
    function bar() {
      $('vMoves').textContent = S.moves;
      $('vScore').textContent = S.score;
      if (shownScore != null && S.score > shownScore && SET.fx && !reduce) { var vs = $('vScore'); vs.classList.remove('bump'); void vs.offsetWidth; vs.classList.add('bump'); }
      shownScore = S.score;
      $('vTime').textContent = clock(G.ms);
      $('chipTime').style.display = SET.timer ? '' : 'none';
      var R = rules();
      $('bUndo').disabled = !G.undo.length || !R.undo; $('bHint').disabled = !R.hint;
      if (G.mode === 'journey') chal();
      $('bUndo').title = R.undo ? 'Undo (U or Ctrl+Z)' : 'No Undo at this level'; $('bHint').title = R.hint ? 'Show me a move (H)' : 'No hints at this level';
      $('stUndo').hidden = !R.undo;
    }
    function clock(ms) {
      var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
      return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x;
    }

    // ------------------------------------------------------------ touching the cards
    var drag = null, gestured = false;
    board.addEventListener('pointerdown', function (e) {
      gestured = true;
      if (busy || (e.button && e.button > 0) || openSheet) return;
      var hit = e.target.closest ? e.target.closest('.card, .slot') : null; if (!hit) return;
      unhint();
      if (hit.classList.contains('slot')) { if (hit.getAttribute('data-slot') === 'stock') { e.preventDefault(); act({ t: 'draw' }); } return; }
      var c = +hit.getAttribute('data-c'), from = D.where(S, c);
      if (!from) { var why = D.cantPick ? D.cantPick(S, c) : ''; if (why) { nope(hit); say(why); } return; }   // say why it won't lift
      e.preventDefault();
      if (from.p === 'stock') { act({ t: 'draw' }); return; }
      var cards = D.picked(S, from);
      if (!cards.length) return;
      if (sel && sel.c !== c && !D.pairs) selOff();
      drag = { from: from, cards: cards, c: c, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moved: false, id: e.pointerId, base: cards.map(function (k) { return lastP[k]; }) };
      try { board.setPointerCapture(e.pointerId); } catch (er) {}
    });
    board.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved) {
        if (Math.abs(dx) + Math.abs(dy) < 8) return;
        drag.moved = true;
        selOff();
        drag.cards.forEach(function (k, i) { var el = cardEl[k]; clearTimeout(el._zt); el._zt = 0; el.classList.add('drag'); el.style.zIndex = 3000 + i; });
        drag.pos = drag.base.map(function (b) { return { x: b.x, y: b.y }; });
        showCan(drag);
        sfx('lift');
      }
      drag.dx = dx; drag.dy = dy;
      if (SET.fx && !reduce) { if (!dragRAF) dragRAF = requestAnimationFrame(dragLoop); }   // the stack trails and tilts (dragLoop)
      else drag.cards.forEach(function (k, i) { var b = drag.base[i]; cardEl[k].style.transform = 'translate3d(' + (b.x + dx) + 'px,' + (b.y + dy) + 'px,0)'; });
    });
    // a stack in the hand: the top card follows the finger exactly, the ones under it a moment behind, all tilting
    // with the movement - like holding real cards
    var dragRAF = 0;
    function dragLoop() {
      dragRAF = 0;
      var d = drag; if (!d || !d.moved) return;
      var vx = d.dx - (d.pdx == null ? d.dx : d.pdx); d.pdx = d.dx; d.vs = (d.vs || 0) * 0.72 + vx * 0.28;
      var tilt = Math.max(-11, Math.min(11, d.vs * 0.9)), settled = Math.abs(d.vs) < 0.05;
      d.cards.forEach(function (k, i) {
        var b = d.base[i], tx = b.x + d.dx, ty = b.y + d.dy, p = d.pos[i], f = i === 0 ? 1 : 0.45;
        p.x += (tx - p.x) * f; p.y += (ty - p.y) * f;
        if (Math.abs(tx - p.x) > 0.3 || Math.abs(ty - p.y) > 0.3) settled = false;
        cardEl[k].style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0)';
        cardEl[k].firstChild.style.transform = 'scale(1.05) rotate(' + (tilt * (1 - i * 0.12) - 1).toFixed(2) + 'deg)';
      });
      if (!settled) dragRAF = requestAnimationFrame(dragLoop);
    }
    function endDragLook(d) {
      if (dragRAF) { cancelAnimationFrame(dragRAF); dragRAF = 0; }
      d.cards.forEach(function (k) { cardEl[k].classList.remove('drag'); cardEl[k].firstChild.style.transform = ''; });
      hideCan();
    }
    // while a card is dragged, the places it may legally go glow (a modern touch, and a help to anyone unsure)
    var canEls = [];
    function showCan(d) {
      hideCan();
      D.targets(S, d.from, L, lastP).forEach(function (t) {
        if (!E.legal(S, { t: 'move', from: d.from, to: t.to })) return;
        var best = null, bz = -1;
        for (var c = 0; c < D.cards; c++) {
          var q = lastP[c];
          if (q && d.cards.indexOf(c) < 0 && Math.abs(q.x - t.x) < 0.5 && Math.abs(q.y - t.y) < 0.5 && q.z > bz && cardEl[c].style.display !== 'none') { best = cardEl[c]; bz = q.z; }
        }
        if (!best) (L.slots || []).forEach(function (s) { if (!best && Math.abs(s.x - t.x) < 0.5 && Math.abs(s.y - t.y) < 0.5) best = slotEl[s.key]; });
        if (best) { best.classList.add('can'); canEls.push(best); }
      });
    }
    function hideCan() { canEls.forEach(function (el) { el.classList.remove('can'); }); canEls = []; }
    board.addEventListener('pointerup', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      if (!d.moved) { tap(d); return; }
      var drop = dropTarget(d);
      endDragLook(d);
      if (drop.m) act(drop.m);
      else {   // it slides back - and the player is told why, in plain words (owner, 3 Oct 2026: Kings "just come back")
        render(); sfx('nope');
        say(D.whyNot ? D.whyNot(S, d.from, drop.near) : 'That card can’t go there');
      }
    });
    board.addEventListener('pointercancel', function () { if (!drag) return; var d = drag; drag = null; if (d.moved) endDragLook(d); render(); });
    board.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // Pyramid: the card picked first, waiting for its partner (D.pairs)
    var sel = null;
    function selOff() {
      if (!sel) return;
      if (cardEl[sel.c]) cardEl[sel.c].classList.remove('sel');
      (sel.lit || []).forEach(function (c) { if (cardEl[c]) cardEl[c].classList.remove('can'); });
      sel = null;
    }
    function pairTap(d) {
      if (sel && sel.c === d.c) { selOff(); sfx('place'); return; }   // tapped again: put it down
      if (sel) { var pm = { t: 'move', from: sel.from, to: d.from }; if (E.legal(S, pm)) { selOff(); act(pm); return; } }
      var km = E.smartMove(S, d.from);
      if (km) { selOff(); act(km); return; }
      selOff();
      sel = { c: d.c, from: d.from, lit: rules().hint && D.partnerCards ? D.partnerCards(S, d.from) : [] };
      cardEl[d.c].classList.add('sel'); sfx('lift');
      sel.lit.forEach(function (c) { if (cardEl[c]) cardEl[c].classList.add('can'); });
      if (D.pickSay) say(D.pickSay(S, d.from));
    }
    function tap(d) {
      if (D.noTap && D.noTap(d.from)) return;   // e.g. cards come down from the piles by dragging only
      if (D.pairs) { pairTap(d); return; }
      var m = E.smartMove(S, d.from);
      if (m) act(m);
      else { nope(cardEl[d.c]); sfx('nope'); say(D.whyNot ? D.whyNot(S, d.from, null) : 'No move for that card yet'); }
    }
    function dropTarget(d) {   // the legal place the dragged card overlaps most; near = the place it overlaps most at all
      var b = d.base[0], x = b.x + d.dx, y = b.y + d.dy, best = null, bestA = 0, near = null, nearA = 0;
      D.targets(S, d.from, L, lastP).forEach(function (t) {
        var ox = Math.min(x + L.cw, t.x + L.cw) - Math.max(x, t.x), oy = Math.min(y + L.ch, t.y + L.ch) - Math.max(y, t.y);
        if (ox <= 0 || oy <= 0) return;
        if (ox * oy > nearA) { nearA = ox * oy; near = t.to; }
        if (ox * oy <= bestA) return;
        var m = { t: 'move', from: d.from, to: t.to };
        if (E.legal(S, m)) { best = m; bestA = ox * oy; }
      });
      return { m: best, near: near };
    }
    function nope(el) { if (!el) return; el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); setTimeout(function () { el.classList.remove('nope'); }, 360); }
    function pop(c) { var el = cardEl[c]; if (!el) return; setTimeout(function () { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); setTimeout(function () { el.classList.remove('pop'); }, 380); }, 240); }

    // ------------------------------------------------------------ making moves
    function act(m) {
      if (busy || !S || S.won || G.over) return;
      selOff();
      var snap = { s: E.clone(S), ms: G.ms, n: G.log ? G.log.length : 0 };
      var fx = E.apply(S, m);
      if (!fx) { if (fx === null && m.t === 'draw' && D.noDrawSay) say(D.noDrawSay(S)); sfx('nope'); render(); return; }
      G.undo.push(snap); if (G.undo.length > 400) G.undo.shift();
      logMove(m);
      G.started = true;
      G.keepDown = m.t === 'move' && m.from && m.from.p === 'f' ? fx.cards[0] : null;   // taken down on purpose: not straight back up
      hideStuck(); unhint();
      effects(fx);
      render();
      after();
    }
    var foundRun = 0;   // cards in a row to the piles: the chime climbs
    function effects(fx) {
      if (fx.t === 'draw') { foundRun = 0; sfx(fx.recycled ? 'shuffle' : (fx.dealt ? 'deal' : 'flip'));
        if (fx.recycled && typeof fx.left === 'number') say(fx.left ? 'Turned over – one more time through the deck after this' : 'Last time through the deck!'); }
      else if (fx.toFound) { foundRun++; sfx('found', foundRun); (fx.popCards || fx.cards).forEach(pop); celebrate(fx); }
      else { foundRun = 0; sfx('slide'); setTimeout(function () { sfx('place'); }, 230); }
      if (fx.flipped && fx.flipped.length) setTimeout(function () { sfx('flip'); }, 140);
      if (fx.say) say(fx.say);
    }
    // a card reaching the piles: gold sparkles where it lands and the points it earned floating up; a whole suit
    // finished: a bigger burst and a little fanfare
    function celebrate(fx) {
      var cards = fx.popCards || fx.cards, last = cards[cards.length - 1], gained = shownScore == null ? 0 : S.score - shownScore;
      var whole = typeof fx.big === 'boolean' ? fx.big : ((fx.popCards && fx.popCards.length >= 13) || (cards.length === 1 && D.face(last, S).r === 13)), my = gen;
      setTimeout(function () {
        if (my !== gen || !cardEl[last]) return;
        var r = cardEl[last].getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (SET.fx && !reduce) {
          Spark.burst(cx, cy, whole ? 70 : 16, whole ? ['#ffe08a', '#ffffff', '#ffb347', '#8ff0ff', '#ff8ad8'] : ['#ffe08a', '#ffffff', '#ffd257'], whole ? 5.5 : 2.6, whole ? 90 : 46);
          Spark.ring(cx, cy, whole ? r.width * 1.4 : r.width * 0.7, '#ffe08a', whole ? 40 : 22);
        }
        if (gained > 0 && SET.fx && !reduce) {
          var f = document.createElement('div'); f.className = 'floatpts'; f.textContent = '+' + gained;
          f.style.left = cx + 'px'; f.style.top = (r.top - 8) + 'px';
          document.body.appendChild(f); setTimeout(function () { f.remove(); }, 1200);
        }
        if (whole) { sfx('suit'); if (SET.fx && !reduce) pop(last); }
      }, 260);
    }

    // ------------------------------------------------------------ sparkles: a light layer over the table, running only while there are any
    var Spark = (function () {
      var cv = null, x = null, P = [], RINGS = [], run = 0, dpr = 1, DOT = {};
      function ensure() {
        if (!cv) { cv = $('spark'); x = cv.getContext('2d'); }
        var w = window.innerWidth, h = window.innerHeight, want = Math.min(2, window.devicePixelRatio || 1);
        if (cv.width !== Math.ceil(w * want) || cv.height !== Math.ceil(h * want)) { dpr = want; cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
      }
      function dot(col) {
        if (DOT[col]) return DOT[col];
        var c = document.createElement('canvas'); c.width = c.height = 32; var g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
        return (DOT[col] = c);
      }
      function burst(px, py, n, cols, spd, life, o) {
        ensure(); o = o || {};
        for (var i = 0; i < n && P.length < 1400; i++) {
          var a = o.up ? -Math.PI / 2 + (Math.random() - 0.5) * 2.2 : Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random() * 0.9);
          P.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), max: life, col: cols[i % cols.length],
            s: (o.size || 7) * (0.6 + Math.random() * 0.8), g: o.grav == null ? 0.06 : o.grav, star: Math.random() < 0.35 });
        }
        go();
      }
      function ring(px, py, r1, col, life) { ensure(); RINGS.push({ x: px, y: py, r1: r1, col: col, life: life, max: life }); go(); }
      function go() { if (!run) run = requestAnimationFrame(frame); }
      function frame() {
        run = 0;
        x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, cv.width, cv.height);
        x.globalCompositeOperation = 'lighter';
        for (var i = P.length - 1; i >= 0; i--) {
          var p = P[i]; p.vx *= 0.975; p.vy = p.vy * 0.975 + p.g; p.x += p.vx; p.y += p.vy;
          if (--p.life <= 0) { P.splice(i, 1); continue; }
          var a = Math.min(1, p.life / p.max * 1.5), s = p.s * (0.5 + 0.5 * p.life / p.max);
          x.globalAlpha = a; x.drawImage(dot(p.col), p.x - s, p.y - s, s * 2, s * 2);
          if (p.star) { x.fillStyle = '#ffffff'; x.fillRect(p.x - s * 0.9, p.y - 0.6, s * 1.8, 1.2); x.fillRect(p.x - 0.6, p.y - s * 0.9, 1.2, s * 1.8); }
        }
        for (i = RINGS.length - 1; i >= 0; i--) {
          var r = RINGS[i], k = 1 - r.life / r.max;
          if (--r.life <= 0) { RINGS.splice(i, 1); continue; }
          x.globalAlpha = (1 - k) * 0.8; x.strokeStyle = r.col; x.lineWidth = 3 * (1 - k) + 1;
          x.beginPath(); x.arc(r.x, r.y, r.r1 * (1 - Math.pow(1 - k, 3)), 0, Math.PI * 2); x.stroke();
        }
        x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
        if (P.length || RINGS.length || Spark.keep) run = requestAnimationFrame(frame);
      }
      return { burst: burst, ring: ring, go: go, keep: false, clear: function () { P = []; RINGS = []; } };
    })();
    function after() {
      if (S.won) return win();
      if (SET.auto && D.autoNext) {
        var m = D.autoNext(S, G.keepDown);
        if (m) {
          busy = true;
          var my = gen;
          setTimeout(function () { if (my !== gen) return; busy = false; var fx = E.apply(S, m); if (fx) { logMove(m); effects(fx); render(); } after(); }, reduce ? 0 : 170);
          return;
        }
      }
      if (E.finishable && E.finishable(S)) { busy = true; say('Finishing it off for you…'); finSteps = 0; var mg = gen; setTimeout(function () { finish(mg); }, reduce ? 0 : 420); return; }
      persist();
      if (G.started && E.stuck(S)) showStuck();
    }
    var finSteps = 0;
    function finish(my) {
      if (my !== gen) return;
      var m = E.finishStep(S);
      if (!m || ++finSteps > 900) { busy = false; persist(); return; }
      var fx = E.apply(S, m);
      if (fx) { logMove(m); effects(fx); render(); }
      if (S.won) { busy = false; return win(); }
      setTimeout(function () { finish(my); }, reduce ? 0 : (m.t === 'draw' ? 50 : 105));
    }
    function undo() {
      if (S && !S.won && !rules().undo) { say('No Undo at this level – every move counts!'); return; }
      if (!G.undo.length || !S || S.won || drag) return;   // after a win the scores are written: no taking it back
      if (busy) { gen++; busy = false; }   // cards still moving by themselves: stop them; the step comes back whole
      var u = G.undo.pop();
      selOff();
      S = u.s; G.undid++; G.keepDown = null;
      if (G.log) G.log.length = Math.min(G.log.length, u.n || 0);
      hideStuck(); unhint(); sfx('place');
      render(); persist();
    }

    // ------------------------------------------------------------ the hint
    var hintT = 0;
    function hint() {
      if (S && !S.won && !rules().hint) { say('No hints at this level – you’re on your own!'); return; }
      if (busy || !S || S.won) return;
      unhint();
      var m = E.hint(S);
      if (!m) { showStuck(); return; }
      G.hinted = (G.hinted || 0) + 1;
      var lit = D.hintLights(S, m);
      (lit.cards || []).forEach(function (c) { if (cardEl[c]) cardEl[c].classList.add('hint'); });
      (lit.slots || []).forEach(function (k) { if (slotEl[k]) slotEl[k].classList.add('hint'); });
      if (lit.say) say(lit.say);
      hintT = setTimeout(unhint, 2800);
    }
    function unhint() { clearTimeout(hintT); Array.prototype.forEach.call(board.querySelectorAll('.hint'), function (e) { e.classList.remove('hint'); }); }
    function showStuck() { $('stuck').hidden = false; }
    // ------------------------------------------------------------ the challenges (4 Oct 2026): Beat the clock, the 3-minute sprint
    function foundCount() { return D.foundCount ? D.foundCount(S) : 0; }
    function chal() {
      var el = $('chal'); if (!el) return;
      if (G && G.mode === 'journey' && window.Journey && !S.won && Journey.level(G.jl)) {
        el.hidden = false; el.className = 'chal jour';
        el.innerHTML = Journey.goalPill(G.jl, Math.round(G.ms / 1000), S.moves, G.undid, G.hinted);
        return;
      }
      if (!G || !G.limit || S.won) { el.hidden = true; return; }
      var left = Math.max(0, G.limit - G.ms), sp = G.mode === 'sprint';
      el.hidden = false;
      el.className = 'chal' + (left <= 30000 && !G.timeUp ? ' hurry' : '') + (G.timeUp ? ' done' : '');
      el.innerHTML = '<span class="ci" aria-hidden="true">' + (sp ? '&#9889;' : '&#9201;') + '</span><b>' + (G.timeUp ? (sp ? 'Sprint over' : 'Time&rsquo;s up') : clock(left + 999)) + '</b>'
        + '<span class="cl">' + (sp ? foundCount() + ' ' + SPW.pill : (G.timeUp ? 'keep playing for fun' : 'to beat the clock')) + '</span>';
    }
    function timeUp() {
      G.timeUp = true; chal(); persist();
      if (G.mode === 'sprint') {   // three minutes: the game stops and the cards are counted
        G.over = true; busy = false; gen++; hideStuck(); unhint(); sfx('win');
        var cards = foundCount();
        $('spCards').textContent = cards; $('spSub').textContent = 'Today\u2019s 3-minute sprint \u00b7 ' + (cards === 1 ? '1 card' : cards + ' cards') + ' ' + SPW.sub;
        openD('dSprint');
        if (window.HallOfFame && D.hof && cards > 0) HallOfFame.sprint($('spHof'), { day: G.day, secs: Math.round(G.limit / 1000), log: G.log, cards: cards });
        else $('spHof').hidden = true;
      } else { sfx('nope'); say('Time\u2019s up! The clock won this one \u2013 but you can keep playing.'); }
    }
    function hideStuck() { $('stuck').hidden = true; }

    // ------------------------------------------------------------ new games
    function today(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function dayNumber(d) { return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 864e5); }
    function dailySeed(v) {   // one deal for everyone today; a prime stride so the days don't run through the list in order
      var list = D.deals ? D.deals(v) : null, n = dayNumber(new Date());
      if (!list || !list.length) return 900000 + ((n % 90000) + 90000) % 90000;
      return list[((n * 7919) % list.length + list.length) % list.length];
    }
    function pickSeed(v) {
      var list = SET.winnable && D.deals ? D.deals(v) : null;
      if (!list || !list.length) return D.anySeed ? D.anySeed(v) : 1 + Math.floor(Math.random() * 999999);
      for (var tries = 0; tries < 25; tries++) { var s = list[Math.floor(Math.random() * list.length)]; if (ST.recent.indexOf(s) < 0) return s; }
      return list[Math.floor(Math.random() * list.length)];
    }
    function recordLoss() {
      if (!G || !G.started || G.counted || !S || S.won) return;
      ST.played++; ST.streak = 0; G.counted = true;
      save('stats', ST);
    }
    function newGame(mode, jl) {
      gen++; busy = false;   // stop anything still running from the last game
      selOff();
      recordLoss();
      var v = V ? SET[V.key] : 0, seed, day = '';
      if (mode === 'again') { seed = S.seed; v = vOf(S); if (G.mode === 'journey') jl = G.jl; mode = G.mode === 'daily' || G.mode === 'sprint' || G.mode === 'clock' || G.mode === 'journey' ? G.mode : 'deal'; day = mode === 'daily' || mode === 'sprint' ? G.day : ''; }
      else if (mode === 'journey' && window.Journey && Journey.level(jl)) { var jlv = Journey.level(jl); seed = jlv.seed; v = jlv.lv; }
      else if (mode === 'sprint') { day = today(); seed = D.sprintSeed ? D.sprintSeed(dayNumber(new Date())) : pickSeed(v); v = D.sprintLevel || v; }   // the same deal for everyone today
      else if (mode === 'shared') { seed = shared.seed; v = shared.v; mode = 'deal'; }
      else if (mode === 'daily') { day = today(); seed = dailySeed(v); }
      else seed = pickSeed(v);
      S = E.deal(seed, v);
      G = newG(mode, day);
      if (mode === 'journey') G.jl = jl;
      ST.recent.push(seed); if (ST.recent.length > 60) ST.recent.shift();
      save('stats', ST);
      closeSheets(); hideStuck(); unhint(); chal();
      faces(); layout();
      dealOut();
      persist();
    }
    function dealOut() {   // every card starts on the deck, then they fly out one by one
      var P = D.positions(S, L), deck = D.deckPos(L), c;
      board.classList.add('instant');
      for (c = 0; c < D.cards; c++) {
        var el = cardEl[c]; clearTimeout(el._zt); el._zt = 0;
        el.style.visibility = ''; el.style.display = P[c] ? '' : 'none';
        el.style.transform = 'translate3d(' + deck.x + 'px,' + deck.y + 'px,0)'; el.classList.add('down'); el.style.zIndex = 10 + c;
      }
      void board.offsetWidth; board.classList.remove('instant');
      lastP = {};
      if (reduce) { render(true); return; }
      busy = true; bar();
      var my = gen, order = D.dealOrder(S), step = order.length > 60 ? 26 : 44;
      order.forEach(function (c, k) {
        setTimeout(function () {
          if (my !== gen) return;
          var p = P[c], el = cardEl[c];
          el.style.zIndex = 600 + k; el.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
          flyOn(el);
          if (k % 2 === 0) sfx('deal');
          if (p.up) setTimeout(function () { if (my === gen) { el.classList.remove('down'); shineOn(el); } }, 200);
        }, 80 + k * step);
      });
      setTimeout(function () { if (my !== gen) return; busy = false; render(); }, 80 + order.length * step + 420);
    }

    // ------------------------------------------------------------ winning
    function win() {
      busy = false;
      var secs = Math.max(1, Math.round(G.ms / 1000));
      S.score += D.winBonus ? D.winBonus(S, secs) : 100 + Math.round(Math.max(0, 1200 - secs) / 2);   // more for a quick one
      var rec = recordWin(secs);
      persist(); bar();
      sfx('win');
      cascade(function () { showWin(rec); });
    }
    function recordWin(secs) {
      var key = vKey(vOf(S)), b = ST.best[key] || (ST.best[key] = {}), badges = [];
      ST.played++; ST.won++; ST.streak++;
      G.counted = true;
      if (ST.won === 1) badges.push('Your first win!');
      if ([10, 25, 50, 100, 250, 500, 1000].indexOf(ST.won) >= 0) badges.push(ST.won + ' games won!');
      if (ST.streak > ST.bestStreak) { ST.bestStreak = ST.streak; if (ST.streak >= 2) badges.push('Your longest winning streak: ' + ST.streak + ' in a row'); }
      else if (ST.streak >= 2) badges.push(ST.streak + ' wins in a row');
      if (b.time == null || secs < b.time) { if (b.time != null) badges.push('Your fastest win yet!'); b.time = secs; }
      if (b.moves == null || S.moves < b.moves) { if (b.moves != null) badges.push('Your fewest moves yet!'); b.moves = S.moves; }
      if (b.score == null || S.score > b.score) { if (b.score != null) badges.push('Your best score yet!'); b.score = S.score; }
      if (!G.undid) badges.push('Won without using Undo');
      if (G.mode === 'clock' && !G.timeUp) { ST.clocks = (ST.clocks || 0) + 1; badges.push('Beat the clock with ' + clock(G.limit - G.ms) + ' to spare!'); }
      if (G.mode === 'daily' && G.day) { ST.daily[G.day] = { won: 1, t: secs, m: S.moves, d: vOf(S) }; badges.push('Today’s deal: done!'); }
      save('stats', ST);
      return { secs: secs, badges: badges };
    }
    function showWin(rec) {
      $('dWinSub').textContent = 'Deal #' + S.seed + (D.describe ? ' · ' + D.describe(S) : '') + (G.mode === 'daily' ? ' · today’s deal' : '');
      $('wTime').textContent = clock(rec.secs * 1000); $('wMoves').textContent = S.moves; $('wScore').textContent = S.score;
      $('wBadges').innerHTML = rec.badges.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
      $('wDaily').hidden = !!(ST.daily[today()] && ST.daily[today()].won);
      chal(); openD('dWin');
      var hb = $('wHof'); hb.hidden = true; hb.innerHTML = '';
      if (window.HallOfFame && D.hof && G.mode === 'daily') HallOfFame.daily(hb, { day: G.day, lv: vOf(S), secs: rec.secs, log: G.log });
      else if (window.HallOfFame && D.hof && G.mode === 'sprint' && !G.timeUp) HallOfFame.sprint(hb, { day: G.day, secs: rec.secs, log: G.log, cards: foundCount() });
      var jb = $('wJour'); jb.hidden = true; jb.innerHTML = '';
      if (window.Journey && D.journey && G.mode === 'journey') Journey.win(jb, G.jl, { secs: rec.secs, moves: S.moves, undid: G.undid, hinted: G.hinted || 0 });
    }
    // the classic finish: the cards leap off the piles and bounce away, leaving trails
    var imgCache = {};
    function cardImg(c) {   // the card as a picture for the bouncing finish: the same paper, border, corners and centre
      var key = c + ':' + L.cw + ':' + faceKey; if (imgCache[key]) return imgCache[key];
      var f = D.face(c, S), dpr = Math.min(2, window.devicePixelRatio || 1), w = L.cw, h = L.ch, cv = document.createElement('canvas');
      cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
      var x = cv.getContext('2d'); x.scale(dpr, dpr);
      var r = w * 0.08, su = SUIT_CH[f.s] + TXT, red = f.s === 1 || f.s === 2, ink = red ? '#c6152f' : '#17191f';
      function rr(ix, iy, iw, ih, rad) { x.beginPath(); x.moveTo(ix + rad, iy); x.arcTo(ix + iw, iy, ix + iw, iy + ih, rad); x.arcTo(ix + iw, iy + ih, ix, iy + ih, rad); x.arcTo(ix, iy + ih, ix, iy, rad); x.arcTo(ix, iy, ix + iw, iy, rad); x.closePath(); }
      var pg = x.createRadialGradient(w * 0.3, h * 0.12, 0, w * 0.3, h * 0.12, h);
      pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.45, '#fffdf8'); pg.addColorStop(1, '#f1ebdc');
      rr(0.5, 0.5, w - 1, h - 1, r); x.fillStyle = pg; x.fill(); x.strokeStyle = '#bdb7a6'; x.lineWidth = 1; x.stroke();
      rr(w * 0.035, w * 0.035, w - w * 0.07, h - w * 0.07, r * 0.7); x.strokeStyle = 'rgba(0,0,0,0.08)'; x.stroke();
      x.fillStyle = ink; x.textBaseline = 'top'; x.textAlign = 'left';
      x.font = '700 ' + Math.round(w * 0.32) + 'px Archivo, Arial, sans-serif'; x.fillText(RANK_CH[f.r], w * 0.05, h * 0.03);
      x.textAlign = 'right'; x.font = Math.round(w * 0.29) + 'px "Segoe UI Symbol", Arial, sans-serif'; x.fillText(su, w * 0.95, h * 0.03);
      x.save(); x.translate(w * 0.9, h * 0.95); x.rotate(Math.PI); x.textAlign = 'center'; x.textBaseline = 'top';
      x.font = '700 ' + Math.round(w * 0.14) + 'px Archivo, Arial, sans-serif'; x.fillText(RANK_CH[f.r], 0, 0);
      x.font = Math.round(w * 0.13) + 'px "Segoe UI Symbol", Arial, sans-serif'; x.fillText(su, 0, w * 0.15); x.restore();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      if (f.r > 10) {   // a gold frame with the letter
        var fx0 = w * 0.13, fy0 = h * 0.31, fw = w * 0.74, fh = h * 0.58;
        x.fillStyle = red ? 'rgba(198,21,47,0.08)' : 'rgba(23,25,31,0.07)'; rr(fx0, fy0, fw, fh, w * 0.05); x.fill();
        x.lineWidth = w * 0.022; x.strokeStyle = '#c9a227'; x.stroke();
        x.fillStyle = ink; x.font = '700 ' + Math.round(w * 0.4) + 'px Georgia, serif'; x.fillText(RANK_CH[f.r], w / 2, h * 0.56);
        x.font = Math.round(w * 0.17) + 'px "Segoe UI Symbol", Arial, sans-serif'; x.fillText(su, w / 2, h * 0.78);
      } else { x.fillStyle = ink; x.font = Math.round(w * 0.56) + 'px "Segoe UI Symbol", Arial, sans-serif'; x.fillText(su, w / 2, h * 0.64); }
      return (imgCache[key] = cv);
    }
    // fireworks over the bouncing cards
    var fwT = 0;
    function fireworks(on) {
      clearInterval(fwT); fwT = 0;
      var big = $('winBig');
      if (!on) { Spark.keep = false; $('spark').style.zIndex = ''; big.hidden = true; return; }
      $('spark').style.zIndex = '4550';
      big.innerHTML = 'You won!<small>' + esc(D.title) + (S.moves ? ' in ' + S.moves + ' moves' : '') + '</small>'; big.hidden = false;
      if (!SET.fx) return;
      var cols = [['#ffe08a', '#ffffff', '#ffb347'], ['#ff8ad8', '#ffffff', '#ff4fc8'], ['#8ff0ff', '#ffffff', '#3fe0ff'], ['#9dff9a', '#ffffff', '#5cff8a']];
      var shoot = function () {
        var cx = window.innerWidth * (0.15 + Math.random() * 0.7), cy = window.innerHeight * (0.12 + Math.random() * 0.35);
        Spark.burst(cx, cy, 60, cols[Math.floor(Math.random() * cols.length)], 5.2, 85, { grav: 0.05, size: 6 });
        Spark.ring(cx, cy, 60, '#ffffff', 24);
        sfx('firework');
      };
      shoot(); fwT = setInterval(shoot, 650);
    }
    function cascade(done) {
      fireworks(true);
      var finishCascade = done; done = function () { fireworks(false); finishCascade(); };
      if (reduce) { done(); return; }
      var cv = $('fx'), tip = $('fxhint'), dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
      cv.hidden = false; cv.classList.add('on'); cv.style.opacity = '1'; cv.style.transition = '';
      cv.width = Math.ceil(W * dpr); cv.height = Math.ceil(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
      var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var br = board.getBoundingClientRect(), k = L.cw / 90, q = D.cascade(S, L).slice(), live = [], ended = false, last = 0;
      var every = q.length > 60 ? 115 : 230;   // Spider's 104 cards leave twice as fast
      setTimeout(function () { if (!ended) tip.hidden = false; }, 1200);
      function frame(now) {
        if (ended) return;
        if (q.length && now - last > every) {
          last = now; var n = q.shift();
          if (cardEl[n.c]) cardEl[n.c].style.visibility = 'hidden';
          live.push({ c: n.c, x: br.left + n.x, y: br.top + n.y, vx: (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 5) * k, vy: -(1 + Math.random() * 7) * k });
        }
        live.forEach(function (p) {
          p.vy += 0.42 * k; p.x += p.vx; p.y += p.vy;
          if (p.y + L.ch > H) { p.y = H - L.ch; p.vy = -p.vy * 0.8; }
          ctx.drawImage(cardImg(p.c), p.x, p.y, L.cw, L.ch);
        });
        live = live.filter(function (p) { return p.x > -L.cw - 4 && p.x < W + 4; });
        if (!q.length && !live.length) { end(); return; }
        requestAnimationFrame(frame);
      }
      function end() {
        if (ended) return; ended = true;
        cv.classList.remove('on'); tip.hidden = true;
        cv.style.transition = 'opacity .45s'; cv.style.opacity = '0';
        setTimeout(function () { cv.hidden = true; ctx.clearRect(0, 0, W, H); for (var i = 0; i < D.cards; i++) cardEl[i].style.visibility = ''; done(); }, 460);
        document.removeEventListener('keydown', end);
      }
      cv.onclick = end;
      document.addEventListener('keydown', end);
      setTimeout(end, 30000);
      requestAnimationFrame(frame);
    }

    // ------------------------------------------------------------ sound: soft, made on the spot, nothing downloaded
    var AC = null, NOISE = null, OUT = null, ROOM = null;
    function ac() {
      if (!SET.sound || !gestured) return null;
      try {
        if (!AC) {
          var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C();
          // one gentle limiter for everything, and a soft room echo for the chimes
          var comp = AC.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = 0.005; comp.release.value = 0.2;
          OUT = AC.createGain(); OUT.gain.value = 0.95; OUT.connect(comp); comp.connect(AC.destination);
          try {
            var cv = AC.createConvolver(), len = Math.floor(AC.sampleRate * 1.3), ir = AC.createBuffer(2, len, AC.sampleRate);
            for (var ch = 0; ch < 2; ch++) { var dd = ir.getChannelData(ch); for (var j = 0; j < len; j++) dd[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 2.8); }
            cv.buffer = ir; ROOM = AC.createGain(); ROOM.gain.value = 0.28; ROOM.connect(cv); cv.connect(OUT);
          } catch (er) { ROOM = null; }
        }
        if (AC.state === 'suspended') AC.resume();
      } catch (e) { return null; }
      return AC;
    }
    function out(a, node, verb) { node.connect(OUT || a.destination); if (verb && ROOM) { var s = a.createGain(); s.gain.value = verb; node.connect(s); s.connect(ROOM); } }
    function tick(freq, dur, gain, q, when, to, type) {   // a filtered burst of noise: cards on felt
      var a = ac(); if (!a) return;
      try {
        if (!NOISE) { var len = Math.floor(a.sampleRate * 0.5); NOISE = a.createBuffer(1, len, a.sampleRate); var d = NOISE.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
        var t = a.currentTime + (when || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
        s.buffer = NOISE; f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t); if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur); f.Q.value = q || 1;
        g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
        s.connect(f); f.connect(g); out(a, g); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.03);
      } catch (e) {}
    }
    function tone(freq, dur, gain, when, type, verb) {
      var a = ac(); if (!a) return;
      try {
        var t = a.currentTime + (when || 0), o = a.createOscillator(), g = a.createGain();
        o.type = type || 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); out(a, g, verb); o.start(t); o.stop(t + dur + 0.03);
      } catch (e) {}
    }
    var CHIME = [1047, 1175, 1319, 1397, 1568, 1760, 1976, 2093, 2349, 2637, 2794, 3136];   // up the scale, one card at a time
    function sfx(k, n) {
      if (!SET.sound) return;
      var i;
      if (k === 'place') { tick(700, 0.07, 0.6, 0.7, 0, 0, 'lowpass'); tone(150, 0.06, 0.05); }
      else if (k === 'slide') tick(2600, 0.16, 0.16, 0.8, 0, 900);
      else if (k === 'lift') tick(1800, 0.06, 0.12, 1.2, 0, 3000);
      else if (k === 'flip') { tick(3300, 0.04, 0.32, 1.6); tick(1600, 0.03, 0.18, 1); }
      else if (k === 'deal') tick(2300, 0.05, 0.26, 1.3, 0, 1400);
      else if (k === 'shuffle') { for (i = 0; i < 14; i++) tick(1800 + Math.random() * 1600, 0.035, 0.16, 1.3, i * 0.03); tick(900, 0.25, 0.12, 0.8, 0.45, 0, 'lowpass'); }
      else if (k === 'found') { var f = CHIME[Math.min(CHIME.length - 1, Math.max(0, (n || 1) - 1))]; tick(5200, 0.05, 0.2, 2); tone(f, 0.55, 0.045, 0.01, 'sine', 0.5); tone(f * 2, 0.3, 0.015, 0.02, 'triangle', 0.3); }
      else if (k === 'suit') [1047, 1319, 1568, 2093].forEach(function (fq, j) { tone(fq, 0.6, 0.045, 0.08 + j * 0.08, 'triangle', 0.55); });
      else if (k === 'nope') tone(196, 0.13, 0.06, 0, 'triangle');
      else if (k === 'firework') { tick(900, 0.5, 0.22, 0.6, 0, 120, 'lowpass'); tone(70, 0.3, 0.08, 0, 'sine'); for (i = 0; i < 6; i++) tick(5000 + Math.random() * 3000, 0.04, 0.05, 3, 0.25 + Math.random() * 0.35); }
      else if (k === 'win') { [523, 659, 784, 1047, 1319].forEach(function (fq, j) { tone(fq, 0.5, 0.06, j * 0.11, 'triangle', 0.5); tone(fq / 2, 0.5, 0.03, j * 0.11, 'sine'); }); tone(1568, 1.2, 0.05, 0.6, 'sine', 0.7); }
    }

    // ------------------------------------------------------------ pop-up sheets
    var openSheet = null, lastFocus = null;
    function openD(id) {
      closeSheets();
      var d = $(id); d.hidden = false; openSheet = d; lastFocus = document.activeElement;
      var f = d.querySelector('.btn.go') || d.querySelector('button'); if (f) f.focus();
    }
    function closeSheets() {
      if (!openSheet) return;
      openSheet.hidden = true; openSheet = null;
      if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) { try { lastFocus.focus(); } catch (e) {} }
    }
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest && t.closest('[data-close]')) { closeSheets(); return; }
      if (t.classList && t.classList.contains('scrim')) closeSheets();
    });
    function openNew() {
      var inPlay = G.started && !S.won, dd = ST.daily[today()];
      $('dNewNote').textContent = inPlay ? 'The game you’re playing will count as not won.' : 'Choose how you’d like to play.';
      $('nDealS').textContent = SET.winnable && D.deals ? 'A fresh shuffle you can win' : 'A fresh shuffle';
      $('nDailyS').textContent = (dd && dd.won ? 'Done today ✔ — play it again if you like' : 'The same deal for everyone today') + (D.hof ? ' · race the Hall of Fame' : '');
      $('nAgainS').textContent = 'Deal #' + S.seed + ', from the beginning';
      if (window.Journey && D.journey && $('nJourS')) { var jt = Journey.total(); $('nJourS').textContent = Journey.count() + ' levels ' + (D.journey.where || 'along the Dorset coast') + ' \u00b7 \u2605 ' + jt.stars + ' of ' + jt.max; }
      syncControls();
      openD('dNew');
    }
    function tile(v, label) { return '<div class="tile"><b>' + esc(v) + '</b><span>' + esc(label) + '</span></div>'; }
    function openStats() {
      var rate = ST.played ? Math.round(100 * ST.won / ST.played) + '%' : '–', days = 0, k;
      for (k in ST.daily) if (ST.daily[k] && ST.daily[k].won) days++;
      $('sTiles').innerHTML = tile(ST.won, 'Games won') + tile(rate, 'Win rate') + tile(ST.played, 'Games played')
        + tile(ST.streak, 'Winning streak') + tile(ST.bestStreak, 'Longest streak') + tile(days, 'Today’s deals done') + (D.hof ? tile(ST.clocks || 0, 'Clocks beaten') : '');
      var wk = '', d = new Date(), names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (var i = 6; i >= 0; i--) {
        var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i), key = today(x), won = ST.daily[key] && ST.daily[key].won;
        wk += '<div class="' + (won ? 'won' : '') + (i === 0 ? ' today' : '') + '"><b>' + (won ? '✔' : '•') + '</b>' + names[x.getDay()] + ' ' + x.getDate() + '</div>';
      }
      $('sWeek').innerHTML = wk;
      var dash = function (v, f) { return v == null ? '–' : (f ? f(v) : v); }, sec = function (s) { return clock(s * 1000); }, out = '';
      var opts = V ? V.options : [[0, '']];
      opts.forEach(function (o, n) {
        var b = ST.best[vKey(o[0])] || {}, lab = V ? ', ' + (V.bestLabel ? V.bestLabel(o[0]) : o[1].toLowerCase()) : '';
        if (n > 0 && b.time == null) return;   // the other options only once they have a win
        out += tile(dash(b.time, sec), 'Fastest win' + lab) + tile(dash(b.moves), 'Fewest moves' + lab) + tile(dash(b.score), 'Best score' + lab);
      });
      $('sBest').innerHTML = out;
      openD('dStats');
    }
    function syncControls() {
      if (V) Array.prototype.forEach.call(document.querySelectorAll('[data-var]'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-var') === SET[V.key])); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-set]'), function (b) { b.setAttribute('aria-checked', String(!!SET[b.getAttribute('data-set')])); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-felt]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-felt') === SET.felt)); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-back') === SET.back)); });
      document.body.className = 'felt-' + SET.felt + ' back-' + SET.back + (SET.fx ? '' : ' nofx');
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-var],[data-set],[data-felt],[data-back]') : null; if (!b) return;
      if (b.hasAttribute('data-var')) SET[V.key] = +b.getAttribute('data-var');
      else if (b.hasAttribute('data-set')) { var k = b.getAttribute('data-set'); SET[k] = !SET[k]; if (k === 'timer') bar(); }
      else if (b.hasAttribute('data-back')) SET.back = b.getAttribute('data-back');
      else SET.felt = b.getAttribute('data-felt');
      save('settings', SET); syncControls();
    });

    // ------------------------------------------------------------ buttons and keys
    $('bNew').onclick = openNew;
    $('bUndo').onclick = undo;
    $('bHint').onclick = hint;
    $('bStats').onclick = openStats;
    $('bSet').onclick = function () { syncControls(); openD('dSet'); };
    $('bHelp').onclick = function () { openD('dHelp'); };
    $('nDeal').onclick = function () { newGame('deal'); };
    $('nDaily').onclick = function () { newGame('daily'); };
    $('nAgain').onclick = function () { newGame('again'); };
    $('wAgain').onclick = function () { newGame('deal'); };
    $('wDaily').onclick = function () { newGame('daily'); };
    $('wStats').onclick = openStats;
    if (D.hof) {
      $('nClock').onclick = function () { newGame('clock'); };
      $('nSprint').onclick = function () { newGame('sprint'); };
      var hofOpen = function (o) { closeSheets(); if (window.HallOfFame) HallOfFame.open(o || {}); };
      $('nHof').onclick = function () { hofOpen(); };
      $('sHof').onclick = function () { hofOpen(); };
      $('spHofB').onclick = function () { hofOpen({ board: 'sprint' }); };
      $('spNew').onclick = openNew;
      if (D.journey && window.Journey) {
        Journey.init({ game: D.id, store: D.store, title: D.title, data: D.journey,
          lvName: function (lv) { return D.journeyLevelName ? D.journeyLevelName(lv) : ''; },
          onPlay: function (i) { closeSheets(); newGame('journey', i); },
          onWin: function (n) { if (n === 3 && SET.fx && !reduce) { var r = document.querySelector('#wJour .bigst'); if (r) { var b = r.getBoundingClientRect(); setTimeout(function () { Spark.burst(b.left + b.width / 2, b.top + b.height / 2, 80, ['#ffe08a', '#ffffff', '#ffb347'], 6, 90); }, 1100); } } } });
        $('nJourney').onclick = function () { closeSheets(); Journey.open(); };
      }
      if (window.HallOfFame) HallOfFame.init({ game: D.id, title: D.title, sprintBoard: SPW.board, levels: V ? V.options.map(function (o) { return [o[0], V.newLabel ? V.newLabel(o[0]) : o[1]]; }) : [[0, '']],
        level: function () { return V ? SET[V.key] : 0; }, sfx: function (k, n) { sfx(k, n); },
        burst: function (x, y, place) { if (SET.fx && !reduce) { Spark.burst(x, y, place === 1 ? 90 : 50, ['#ffe08a', '#ffffff', '#ffb347', '#8ff0ff'], 6, 90); Spark.ring(x, y, 120, '#ffe08a', 40); } },
        onPlay: function (m) { newGame(m === 'sprint' ? 'sprint' : 'daily'); } });
    }
    // sharing and feedback (social.js): the bar's two buttons, and the challenge on the win card - the same cards for a friend
    if (window.GameSocial) GameSocial.init({ id: D.id, title: D.title });
    $('bShare').onclick = function () { if (window.GameSocial) GameSocial.share(); };
    $('bGames').onclick = function () { if (window.GameSocial && GameSocial.openGames) GameSocial.openGames(); else location.href = '/games/'; };
    $('bFeed').onclick = function () { if (window.GameSocial) GameSocial.openFeedback('feedback'); };
    if (!window.GameSocial) { $('bShare').hidden = true; $('bFeed').hidden = true; $('wShare').hidden = true; }
    $('wShare').onclick = function () {
      if (!window.GameSocial || !S) return;
      var secs = Math.max(1, Math.round(G.ms / 1000)), daily = G.mode === 'daily';
      var lvl = V && V.info && V.newLabel ? ' (' + V.newLabel(vOf(S)) + ')' : '';
      var text = 'I won ' + (daily ? 'today’s ' + D.title + lvl + ' deal' : D.title + lvl + ' deal #' + S.seed) + ' in ' + clock(secs * 1000) + (S.moves ? ' with ' + S.moves + ' moves' : '')
        + ' – can you beat me? Play the same cards, free with no adverts:';
      GameSocial.share({ text: text, query: '?deal=' + S.seed + (V ? '&v=' + vOf(S) : '') });
    };
    $('stUndo').onclick = undo;
    $('stNew').onclick = openNew;
    $('sReset').onclick = function () { openD('dReset'); };
    $('rYes').onclick = function () { ST = blankStats(); save('stats', ST); G.counted = true; closeSheets(); say('Your scores have been cleared'); };
    function toggleFull() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {} }
    $('bFull').onclick = toggleFull;
    if (!document.fullscreenEnabled) $('bFull').hidden = true;
    document.addEventListener('fullscreenchange', function () { $('bFullL').textContent = document.fullscreenElement ? 'Leave full screen' : 'Full screen'; });
    document.addEventListener('keydown', function (e) {
      gestured = true;
      if (e.defaultPrevented || (window.GameSocial && GameSocial.isOpen()) || (window.HallOfFame && HallOfFame.isOpen()) || (window.Journey && Journey.isOpen())) return;   // typing feedback / initials, or a key a sheet used
      if (e.key === 'Escape') { if (openSheet) closeSheets(); return; }
      if (openSheet || e.altKey) return;
      var k = (e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); return; }
      if (e.ctrlKey || e.metaKey) return;
      if (k === 'u') undo();
      else if (k === 'h') hint();
      else if (k === 'n') openNew();
      else if (k === 'f') toggleFull();
      else if ((k === ' ' || k === 'd') && D.hasStock && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); act({ t: 'draw' }); }
    });

    // ------------------------------------------------------------ little messages, the clock, saving
    var sayT = 0;
    function say(t) {
      var el = $('toast'); if (!t) return;
      el.textContent = t; el.classList.add('on'); clearTimeout(sayT);
      sayT = setTimeout(function () { el.classList.remove('on'); }, Math.min(7000, 1800 + t.length * 55));   // time to read it
    }
    function persist() {
      save('game', { s: S, g: { undo: G.undo.slice(-60), ms: G.ms, mode: G.mode, day: G.day, started: G.started, counted: G.counted, undid: G.undid, log: G.log || [], timeUp: G.timeUp, over: G.over, jl: G.jl, hinted: G.hinted || 0 } });
    }
    var lastTick = Date.now();
    setInterval(function () {
      var now = Date.now(), d = Math.min(2000, now - lastTick); lastTick = now;
      if (!G || !G.started || S.won || G.over || document.hidden || openSheet || (window.GameSocial && GameSocial.isOpen()) || (window.HallOfFame && HallOfFame.isOpen()) || (window.Journey && Journey.isOpen())) return;
      G.ms += d;
      if (G.limit) { chal(); if (G.ms >= G.limit && !G.timeUp) timeUp(); }
      else if (G.mode === 'journey') chal();
      $('vTime').textContent = clock(G.ms);
    }, 1000);
    document.addEventListener('visibilitychange', function () { if (document.hidden && S) persist(); });
    window.addEventListener('pagehide', function () { if (S) persist(); });
    var rz = 0;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { layout(); render(true); }, 120); });

    // ------------------------------------------------------------ start
    syncControls();
    // a friend's challenge: ?deal=48213 (and &v= for Solitaire's draw or Spider's suits) opens exactly those cards
    var shared = null;
    try {
      var q = new URLSearchParams(location.search), dn = parseInt(q.get('deal'), 10), dv = parseInt(q.get('v'), 10);
      if (dn > 0 && dn < 10000000) shared = { seed: dn, v: V ? (V.options.some(function (o) { return o[0] === dv; }) ? dv : SET[V.key]) : 0 };
      if (q.has('deal') && window.history && history.replaceState) history.replaceState(null, '', location.pathname);   // a reload carries on, not restarts
    } catch (e) {}
    // from the Games page: ?daily=1 plays Today's deal, ?hof=1 opens the Hall of Fame
    var ask = {};
    try {
      var qa = new URLSearchParams(location.search); ask.daily = qa.get('daily') === '1'; ask.hof = qa.get('hof') === '1';
      if ((qa.has('daily') || qa.has('hof')) && window.history && history.replaceState) history.replaceState(null, '', location.pathname);
    } catch (e) {}
    var saved = load('game', null);
    if (saved && saved.s && saved.g && !saved.s.won && D.valid(saved.s)) {
      S = saved.s; G = newG(saved.g.mode, saved.g.day);
      G.undo = Array.isArray(saved.g.undo) ? saved.g.undo : []; G.ms = +saved.g.ms || 0; G.started = !!saved.g.started; G.counted = !!saved.g.counted; G.undid = +saved.g.undid || 0;
      G.log = Array.isArray(saved.g.log) ? saved.g.log : []; G.timeUp = !!saved.g.timeUp; G.over = !!saved.g.over;
      G.jl = typeof saved.g.jl === 'number' ? saved.g.jl : undefined; G.hinted = +saved.g.hinted || 0;
      faces(); layout(); render(true);
      if (G.started && E.stuck(S)) showStuck();
    } else {
      S = E.deal(1, V ? SET[V.key] : 0); G = newG('deal', '');   // a placeholder for the first layout; replaced straight away
      faces(); layout();
      newGame('deal');
    }
    if (shared) { newGame('shared'); say('Deal #' + shared.seed + ' – the same cards your friend played. Good luck!'); }
    else if (ask.daily && !(G.mode === 'daily' && G.day === today())) newGame('daily');   // today's deal already under way: carry on with it
    if (!SET.seenHelp) { SET.seenHelp = true; save('settings', SET); if (!ask.hof) openD('dHelp'); }
    if (ask.hof && D.hof && window.HallOfFame) { closeSheets(); HallOfFame.open({}); }
    // read-only, for the tests (and later PC Manager): the game as it stands, and whether an automatic run is going
    var hook = { get state() { return E.clone(S); }, get busy() { return busy || !!drag; }, get won() { return !!(S && S.won); } };
    window.GAME365 = hook;
    if (D.id === 'solitaire') window.SOL365 = hook;

    // ------------------------------------------------------------ the page's bar, table and sheets
    function buildUI() {
      var v = V ? V.options.map(function (o) { return '<button type="button" data-var="' + o[0] + '">' + esc(o[1]) + '</button>'; }).join('') : '';
      var vNew = V ? V.options.map(function (o, i) {
        if (!V.info) return '<button type="button" data-var="' + o[0] + '">' + esc(V.newLabel ? V.newLabel(o[0]) : o[1]) + '</button>';
        var st = V.stars ? V.stars(o[0]) : 0, stars = '';
        for (var k = 1; k <= V.options.length; k++) stars += '<i class="' + (k <= st ? 'on' : '') + '"></i>';
        return '<button type="button" data-var="' + o[0] + '" style="--i:' + i + '"><span class="lvtop"><b>' + esc(V.newLabel ? V.newLabel(o[0]) : o[1]) + '</b><span class="lvst" aria-hidden="true">' + stars + '</span></span><small>' + esc(V.info(o[0])) + '</small></button>';
      }).join('') : '';
      var tb = function (id, icon, label, title, cls) { return '<button class="tb' + (cls ? ' ' + cls : '') + '" id="' + id + '" type="button" title="' + esc(title) + '">' + ICON[icon] + '<span class="lbl"' + (id === 'bFull' ? ' id="bFullL"' : '') + '>' + esc(label) + '</span></button>'; };
      var html = '<div id="app"><header class="bar"><div class="brand"><b>365</b><span>' + esc(D.title) + '</span></div>'
        + '<div class="info" aria-live="off"><div class="chip" id="chipTime"><small>Time</small><span id="vTime">0:00</span></div><div class="chip"><small>Moves</small><span id="vMoves">0</span></div><div class="chip"><small>Score</small><span id="vScore">0</span></div></div>'
        + '<nav class="tools" aria-label="Game">' + tb('bNew', 'new', 'New game', 'New game (N)', 'main') + tb('bGames', 'games', 'Games', 'Switch to another of our games', 'tb3') + tb('bUndo', 'undo', 'Undo', 'Undo (U or Ctrl+Z)') + tb('bHint', 'hint', 'Hint', 'Show me a move (H)')
        + tb('bStats', 'stats', 'My scores', 'My scores', 'tb3') + tb('bSet', 'set', 'Settings', 'Settings', 'tb3') + tb('bHelp', 'help', 'How to play', 'How to play')
        + tb('bShare', 'share', 'Share', 'Share this game with a friend', 'tb2') + tb('bFeed', 'feedback', 'Feedback', 'Tell us what you think, or ask for a new game', 'tb2') + tb('bFull', 'full', 'Full screen', 'Full screen (F)', 'tb2') + '</nav></header>'
        + '<main id="board" aria-label="The card table"></main></div>'
        + '<div id="stuck" hidden role="status"><span>' + esc(D.stuckText || 'No more moves found.') + '</span><button class="btn" type="button" id="stUndo">Undo</button><button class="btn go" type="button" id="stNew">New game</button></div>'
        + '<div id="chal" class="chal" hidden role="timer" aria-live="off"></div><div id="toast" role="status" aria-live="polite"></div><canvas id="spark" aria-hidden="true"></canvas><canvas id="fx" hidden></canvas><div id="winBig" hidden aria-hidden="true"></div><div id="fxhint" hidden>Tap anywhere to carry on</div>'
        + sheet('dNew', 'New game', '<p class="soft" id="dNewNote"></p>' + (V ? (V.info ? '<div class="lvls" role="group" aria-label="' + esc(V.label) + '">' + vNew + '</div>' : '<div class="seg" role="group" aria-label="' + esc(V.label) + '">' + vNew + '</div>') : '')
          + '<div class="choice"><button class="btn go" type="button" id="nDeal">New deal<small id="nDealS">A fresh shuffle</small></button>'
          + '<button class="btn" type="button" id="nDaily">Today&rsquo;s deal<small id="nDailyS">The same deal for everyone today</small></button>'
          + '<button class="btn" type="button" id="nAgain">Play this deal again<small id="nAgainS">Start the same cards from the beginning</small></button></div>'
          + (D.hof ? '<p class="chalh">Challenges</p><div class="choice chals">' + (D.journey ? '<button class="btn jourbtn" type="button" id="nJourney">&#129517; The Journey<small id="nJourS">100 levels ' + esc(D.journey.where || 'along the Dorset coast') + '</small></button>' : '') + '<button class="btn" type="button" id="nClock">&#9201; Beat the clock<small>' + (D.clockText || 'Win a fresh deal in 5 minutes, at your level') + '</small></button>'
            + '<button class="btn" type="button" id="nSprint">&#9889; 3-minute sprint<small>' + SPW.line + ' &middot; the same deal for everyone today</small></button>'
            + '<button class="btn hofbtn" type="button" id="nHof">&#127942; Hall of Fame<small>Who&rsquo;s fastest today &mdash; in Dorset and beyond</small></button></div>' : '')
          + '<div class="row"><button class="btn wide" type="button" data-close>Keep playing</button></div>')
        + sheet('dWin', 'You won!', '<p class="soft" id="dWinSub"></p><div class="tiles"><div class="tile"><b id="wTime">0:00</b><span>Time</span></div><div class="tile"><b id="wMoves">0</b><span>Moves</span></div><div class="tile"><b id="wScore">0</b><span>Score</span></div></div>'
          + '<ul class="badges" id="wBadges"></ul><div id="wJour" hidden></div><div id="wHof" hidden></div><div class="row"><button class="btn go wide" type="button" id="wAgain">Play again</button><button class="btn wide" type="button" id="wShare">Challenge a friend</button><button class="btn wide" type="button" id="wDaily">Today&rsquo;s deal</button><button class="btn wide" type="button" id="wStats">My scores</button></div>')
        + sheet('dSprint', 'Time\u2019s up!', '<p class="soft" id="spSub"></p><div class="tiles"><div class="tile"><b id="spCards">0</b><span>Cards up</span></div></div><div id="spHof"></div>'
          + '<div class="row"><button class="btn go wide" type="button" id="spNew">New game</button><button class="btn wide" type="button" id="spHofB">Hall of Fame</button></div>')
        + sheet('dStats', 'My scores', (D.hof ? '<button class="btn hofbtn wide" type="button" id="sHof" style="width:100%;margin:2px 0 12px">&#127942; The Hall of Fame<small>Today&rsquo;s fastest, this week&rsquo;s best, all time</small></button>' : '') + '<p class="soft">Kept on this computer only &mdash; nothing is sent anywhere.</p><div class="tiles" id="sTiles"></div><h3 style="margin:16px 0 0;font-size:18px">Today&rsquo;s deal this week</h3><div class="week" id="sWeek"></div><div class="tiles" id="sBest"></div>'
          + '<div class="row"><button class="btn go wide" type="button" data-close>Close</button><button class="btn" type="button" id="sReset">Clear my scores</button></div>')
        + sheet('dSet', 'Settings', (V ? '<div class="set"><div><label>' + esc(V.label) + '</label><small>' + esc(V.small || 'Changes from your next game.') + '</small></div><div class="seg" role="group" aria-label="' + esc(V.label) + '">' + v + '</div></div>' : '')
          + (D.deals ? sw('winnable', 'Deals you can always win', D.winnableSmall || 'Every deal has been played through to a win.') : '')
          + (D.autoNext ? sw('auto', 'Move cards up to the piles for me', 'When it&rsquo;s plainly safe to.') : '')
          + sw('sound', 'Sounds', 'Soft card sounds and chimes.') + sw('timer', 'Show the clock', 'It still keeps your best time.')
          + sw('fx', 'Extra effects', 'Sparkles, cards that lift as they move, fireworks when you win. Switch off on a slower computer.')
          + '<div class="set"><div><label>Table</label></div><div class="felts" role="group" aria-label="Table"><button type="button" data-felt="green" style="background:#1f7a45" aria-label="Green baize"></button><button type="button" data-felt="blue" style="background:#1f5f9c" aria-label="Blue"></button><button type="button" data-felt="red" style="background:#8e2537" aria-label="Red"></button><button type="button" data-felt="slate" style="background:#45526a" aria-label="Grey"></button>'
          + '<button type="button" data-felt="oak" style="background:repeating-linear-gradient(91deg,#6b4220 0 3px,#7a4c26 3px 6px)" aria-label="Oak table"></button><button type="button" data-felt="night" style="background:radial-gradient(#2a3670,#060918)" aria-label="Night"></button></div></div>'
          + '<div class="set"><div><label>Card backs</label></div><div class="backs" role="group" aria-label="Card backs"><button type="button" data-back="navy" style="background:linear-gradient(155deg,#17447a,#0a2245)" aria-label="365 navy"></button><button type="button" data-back="royal" style="background:linear-gradient(155deg,#8e1d2c,#4a0712)" aria-label="Royal red"></button><button type="button" data-back="sea" style="background:linear-gradient(180deg,#ff9a6a,#ffcf8a 30%,#2aa3c4 52%,#0b5e86)" aria-label="Seaside"></button></div></div>'
          + '<p class="foot">' + esc(D.title) + ' is made by <a href="https://365techies.co.uk/" target="_blank" rel="noopener">365 Techies</a> in Bournemouth. No adverts, no sign-in, nothing to install. Computer playing up? Ring us on <b>01202 775566</b>.</p>'
          + '<div class="row"><button class="btn go wide" type="button" data-close>Done</button></div>')
        + sheet('dHelp', 'How to play', '<ol class="how">' + (D.help || []).map(function (h) { return '<li>' + h + '</li>'; }).join('') + '</ol>'
          + '<p class="soft">Keys, if you like them: N new game, U undo, H hint' + (D.hasStock ? ', space turns the deck' : '') + ', F full screen.</p><div class="row"><button class="btn go wide" type="button" data-close>Let&rsquo;s play</button></div>')
        + sheet('dReset', 'Clear my scores?', '<p>Your games won, streaks and best times for ' + esc(D.title) + ' on this computer go back to nothing. This can&rsquo;t be undone.</p><div class="row"><button class="btn wide" type="button" data-close>Keep them</button><button class="btn go wide" type="button" id="rYes" style="background:#a3242f;border-color:#a3242f">Clear them</button></div>');
      var holder = document.createElement('div'); holder.innerHTML = html;
      var frag = document.createDocumentFragment();
      while (holder.firstChild) frag.appendChild(holder.firstChild);
      document.body.insertBefore(frag, document.body.firstChild);   // the page first, in order; the scripts stay after it
    }
    function sheet(id, title, body) { return '<div class="scrim" id="' + id + '" hidden><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="' + id + 'H"><h2 id="' + id + 'H">' + esc(title) + '</h2>' + body + '</div></div>'; }
    function sw(key, label, small) { return '<div class="set"><div><label id="l_' + key + '">' + label + '</label><small>' + small + '</small></div><button class="sw" type="button" role="switch" aria-labelledby="l_' + key + '" data-set="' + key + '"></button></div>'; }
  }

  window.Table365 = { start: start, RECYCLE: RECYCLE, ICON: ICON, cardMarkup: cardMarkup, esc: esc, SUIT_CH: SUIT_CH, RANK_CH: RANK_CH, TXT: TXT };
})();
