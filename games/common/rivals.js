/* 365 Games - the card table for games against the computer (5 Oct 2026; Hearts and Gin Rummy - owner: "more ultra
 * popular card games"). The patience games have table.js; this is its sibling for games with other players at the
 * table. It shares the cards (Table365.cardMarkup), the felt, the bar and the sheets (table.css + rivals.css) and adds
 * seats, a panel in the middle of the table that says what to do (with its buttons), and the computer's turns, one at a
 * time with a pause so you can follow them. Cards are played by TAPPING (no dragging needed).
 *
 * The game's def supplies: id, store, title, cards (52), face(c) -> {r, s}, E (rules: newMatch(seed, lv),
 * apply(S, m) -> fx | false, auto(S) -> the next move nobody has to choose (a computer's turn, a trick taken in) | null,
 * hint(S), valid(S), clone(S)), levels {options [[lv, name]], def, info(lv), hint(lv)}, layout(W, H, S) -> L {cw, ch,
 * deck {x, y}, panel {x, y, w}} (panelAt(S, L) may move the panel), positions(S, L, U) -> {card: {x, y, z, up, rot, sc, cls}}, plates(S, L, U) ->
 * [{key, x, y, html, cls, center | right}], panel(S, U) -> html (buttons carry data-act), tap(S, c, U) and press(S, id, U) -> {m} (a
 * move) | {say} | {ui: true} (what you were choosing changed) | null, wait(S, m) -> ms before a computer move,
 * fx(fx, K) -> sounds and words for what happened, over(S), result(S) -> {won, title, sub, tiles, badges, best},
 * chips(S) -> [[label, value]], dealOrder(S), hintShow(S, m, U) -> {cards, say}, newHand(S, U), help, bestTiles.
 * U is what you are in the middle of choosing (Hearts: the cards to pass; Gin: knocking) - it is saved with the game.
 * The Hall of Fame (5 Oct 2026; D.hof, D.hofWhat): your moves are logged as E.code(m) (G.log, saved with the game); a win
 * of Today's match sends them, and the server replays the whole match - the computer players too - before it counts.
 * The Journey (5 Oct 2026; D.journey = the levels, D.jr = the game's goals): 100 levels, each ONE HAND on a set deal
 * with three targets (tools/journeys/make-rival-journeys.cjs proves each one can be reached). When the hand ends the
 * level is scored (D.jr.result) and common/journey.js gives the stars; the hand's "Next" button shows them instead.
 * Journey hands don't count as matches in My scores.
 * Every timed step checks `gen` (bumped by a new game) and stops if it changed. */
(function () {
  'use strict';
  var T = window.Table365, ICON = T.ICON, esc = T.esc;
  var SPEED = { 1: 1.6, 2: 1, 3: 0.55 };

  function start(D) {
    var E = D.E, $ = function (id) { return document.getElementById(id); };
    var reduce = window.A11y365 ? A11y365.reduce() : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);   // (the site's own Reduce motion too - a11y365.js)
    var LVS = D.levels;

    // ------------------------------------------------------------ what this browser remembers (per game)
    function load(k, d) { try { var v = localStorage.getItem(D.store + ':' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
    function save(k, v) { try { localStorage.setItem(D.store + ':' + k, JSON.stringify(v)); } catch (e) {} }
    var SET = { lv: LVS.def, speed: 2, sound: true, fx: true, felt: 'green', back: 'navy', seenHelp: false, win: 'mix' };
    (function () { var s = load('settings', null); if (s && typeof s === 'object') for (var k in SET) if (k in s) SET[k] = s[k]; })();
    if (!LVS.options.some(function (o) { return o[0] === SET.lv; })) SET.lv = LVS.def;
    // tables and card backs (5 Oct 2026): one choice for every card game (looks.js keeps it as cards365:look)
    if (window.Looks) {
      var lk = Looks.shared();
      if (lk) { if (Looks.known('felt', lk.felt)) SET.felt = lk.felt; if (Looks.known('back', lk.back)) SET.back = lk.back; }
      if (!Looks.known('felt', SET.felt)) SET.felt = 'green';
      if (!Looks.known('back', SET.back)) SET.back = 'navy';
    }
    function blankStats() { return { v: 1, played: 0, won: 0, streak: 0, bestStreak: 0, best: {}, daily: {}, recent: [] }; }
    var ST = blankStats();
    (function () { var s = load('stats', null); if (s && s.v === 1) for (var k in ST) if (k in s) ST[k] = s[k]; if (!ST.best || typeof ST.best !== 'object') ST.best = {}; })();

    var S = null, G = null, U = {}, busy = false, gen = 0, goT = 0;
    function newG(mode, day) { return { mode: mode || 'match', day: day || '', started: false, counted: false, ms: 0, log: [], lg: true }; }   // lg: logged from the start

    // ------------------------------------------------------------ the page
    buildUI();
    var board = $('board'), panelEl = $('rvPanel'), cardEl = [], plateEl = {};
    document.documentElement.classList.add('rv365');   // (table.js shows each card's suit under its rank in the hand)
    for (var c0 = 0; c0 < D.cards; c0++) {
      var f0 = D.face(c0), k0 = T.cardMarkup(f0.r, f0.s), el0 = document.createElement('div');
      el0._base = 'card ' + k0.cls; el0.className = el0._base + ' down'; el0.setAttribute('data-c', c0); el0.setAttribute('aria-hidden', 'true'); el0.innerHTML = k0.html;
      board.appendChild(el0); cardEl[c0] = el0;
    }
    var L = { cw: 80, ch: 112 };
    function layout() {
      L = D.layout(board.clientWidth, board.clientHeight, S);
      document.documentElement.style.setProperty('--cw', L.cw + 'px');
      document.documentElement.style.setProperty('--ch', L.ch + 'px');
    }
    var lastP = {};
    function endT(p) { return 'translate3d(' + Math.round(p.x) + 'px,' + Math.round(p.y) + 'px,0)' + (p.rot ? ' rotate(' + p.rot + 'deg)' : '') + (p.sc && p.sc !== 1 ? ' scale(' + p.sc + ')' : ''); }
    function arcsOn() { return SET.fx && !reduce && T.canFly; }
    function render(instant) {
      if (!S) return;
      var P = D.positions(S, L, U), arcs = !instant && arcsOn(), my = gen, n = 0;
      if (instant) board.classList.add('instant');
      for (var c = 0; c < D.cards; c++) {
        var p = P[c], el = cardEl[c], old = lastP[c];
        if (!p) { el.style.display = 'none'; continue; }
        el.style.display = '';
        var cls = el._base + (p.up ? '' : ' down') + (p.cls ? ' ' + p.cls : '') + (el._hint ? ' hint' : '');
        var dist = old ? Math.abs(old.x - p.x) + Math.abs(old.y - p.y) : 0, turning = !instant && old && !old.up && p.up;
        // a card going somewhere (into the trick, to the winner of a trick, passed across) flies in an arc and turns over
        // in the air; little shuffles along a hand just slide
        if (arcs && old && dist > L.cw * 0.9) {
          el.className = turning ? cls + ' down' : cls;   // (fly() adds .flight) - a card turning over stays face down until mid-air
          el.style.zIndex = 900 + p.z;
          var an = T.fly(el, { x: old.x, y: old.y, r: old.rot || 0, s: old.sc || 1 }, { x: p.x, y: p.y, r: p.rot || 0, s: p.sc || 1 }, { end: endT(p), delay: Math.min(240, n++ * 45), lift: Math.min(56, 10 + dist * 0.12) });
          var t = T.flightTime(an);
          (function (el, cls, z, turning) {
            setTimeout(function () { if (my !== gen) return; el.style.zIndex = z; }, t + 30);
            if (turning) setTimeout(function () { if (my !== gen) return; el.className = cls + (el.classList.contains('flight') ? ' flight' : ''); turnOn(el); }, t * 0.42);
          })(el, cls, p.z, turning);
          continue;
        }
        el.style.transform = endT(p);
        if (el.className !== cls) {
          if (turning && SET.fx && !reduce) { el.className = cls; turnOn(el); }
          else el.className = cls;
        }
        el.style.zIndex = p.z;
        if (!instant && old && (Math.abs(old.x - p.x) > 2 || Math.abs(old.y - p.y) > 2) && SET.fx && !reduce && !arcs) flyOn(el);
      }
      lastP = P;
      // the name plates round the table, and the panel in the middle
      var seen = {};
      (D.plates(S, L, U) || []).forEach(function (q) {
        var e = plateEl[q.key];
        if (!e) { e = plateEl[q.key] = document.createElement('div'); board.appendChild(e); }
        e.className = 'rv-plate ' + (q.cls || '');
        if (e._h !== q.html) { e.innerHTML = q.html; e._h = q.html; }
        e.style.transform = 'translate3d(' + Math.round(q.x) + 'px,' + Math.round(q.y) + 'px,0)' + (q.center ? ' translate(-50%,0)' : q.right ? ' translate(-100%,0)' : '');
        e.style.display = ''; seen[q.key] = 1;
      });
      for (var k in plateEl) if (!seen[k]) plateEl[k].style.display = 'none';
      if (S.phase !== sayPh) { if (sayPh != null && Date.now() - sayAt > 700) sayClear(); sayPh = S.phase; }   // a new stage: last stage's messages go
      var ph = D.panel(S, U) || '';
      panelEl.hidden = !ph;
      if (ph) {
        if (panelEl._h !== ph) { panelEl.innerHTML = ph; panelEl._h = ph; }
        var pa = D.panelAt ? D.panelAt(S, L) : L.panel;   // a game may move the panel (Gin: over the deck once a hand is shown)
        panelEl.style.left = Math.round(pa.x) + 'px'; panelEl.style.top = Math.round(pa.y) + 'px'; panelEl.style.width = Math.round(pa.w) + 'px';
        // never over your own hand (a short screen - a phone on its side, a browser zoomed to 200%): slide up above it
        // (games audit, 5 Oct 2026; critic: at 200% the crib panel hid half of the cards you were choosing from)
        if (L.handY != null) { var pH = panelEl.offsetHeight; if (Math.round(pa.y) + pH > L.handY - 6) panelEl.style.top = Math.max(4, Math.round(L.handY - 6 - pH)) + 'px'; }
        if (jLevel()) { var nb = panelEl.querySelector('[data-act="next"]'); if (nb && nb.getAttribute('data-j') !== '1') { nb.setAttribute('data-j', '1'); nb.textContent = 'See your stars \u2605'; } }
      }
      if (instant) { void board.offsetWidth; board.classList.remove('instant'); }
      bar();
    }
    function flyOn(el) { el.classList.remove('fly'); void el.offsetWidth; el.classList.add('fly'); clearTimeout(el._ft); el._ft = setTimeout(function () { el.classList.remove('fly'); }, 420); }
    // a card turned over rises off the table as it turns, then catches the light
    function turnOn(el) {
      if (!SET.fx || reduce) return;
      el.classList.remove('turn'); void el.offsetWidth; el.classList.add('turn');
      clearTimeout(el._tt); el._tt = setTimeout(function () { el.classList.remove('turn'); }, 480);
      clearTimeout(el._st); el._st = setTimeout(function () { el.classList.add('shine'); el._st = setTimeout(function () { el.classList.remove('shine'); }, 800); }, 220);
    }
    function jLevel() { return G && G.mode === 'journey' && D.jr && window.Journey ? Journey.level(G.jl) : null; }
    function bar() {
      var jl = jLevel(), ch = jl ? [['Level', G.jl + 1]].concat(D.jr.chips(S, jl)) : D.chips(S);
      for (var i = 0; i < 3; i++) {
        var chip = $('rvChip' + i);
        if (ch[i]) { chip.style.display = ''; chip.firstChild.textContent = ch[i][0]; chip.lastChild.textContent = ch[i][1]; } else chip.style.display = 'none';
      }
      $('bHint').disabled = !LVS.hint(S.lv);
      $('bHint').title = LVS.hint(S.lv) ? 'Show me a good move (H)' : 'No hints at this level';
    }

    // ------------------------------------------------------------ tapping
    var gestured = false;
    board.addEventListener('pointerdown', function (e) {
      gestured = true;
      if ((e.button && e.button > 0) || openSheet || !S) return;
      var hit = e.target.closest ? e.target.closest('.card') : null; if (!hit) return;
      e.preventDefault();
      unhint(); unhov();
      if (SET.fx && !reduce && !hit.classList.contains('down')) { hit.classList.add('press'); setTimeout(function () { hit.classList.remove('press'); }, 160); }
      var tc = +hit.getAttribute('data-c');
      if (e.pointerType === 'touch' && liftFirst(tc, hit)) return;
      unlift();
      handle(D.tap(S, tc, U), hit);
    });
    // a phone: a hand card showing only a thin edge is lifted by the first tap and played by the second, where a tap
    // plays it for good (games audit, 5 Oct 2026; critic: one unsteady tap played the card next to it, with no Undo)
    var lifted = null, liftT = 0;
    function unlift() { clearTimeout(liftT); if (lifted != null && cardEl[lifted]) cardEl[lifted].classList.remove('lift'); lifted = null; }
    function liftFirst(c, el) {
      if (!D.commits || !D.commits(S) || !el.classList.contains('ok') || busy) { unlift(); return false; }
      if (lifted === c) return false;   // the second tap: play it
      var p = lastP[c], narrow = false; if (!p) return false;
      for (var k in lastP) { var q = lastP[k]; if (+k !== c && q && Math.abs(q.y - p.y) < 3 && q.x > p.x && q.x - p.x < 46 && (q.z || 0) > (p.z || 0)) { narrow = true; break; } }
      if (!narrow) { unlift(); return false; }
      unlift(); lifted = c; el.classList.add('lift'); sfx('lift');
      var f = D.face(c), tips = +(load('lifttips', 0) || 0);   // the tip only the first three times (critic 3: up to 13 a hand)
      if (tips < 3) { say('Tap the ' + T.cardName(f.r, f.s) + ' again to ' + (D.liftWord || 'play it'), 'tip'); save('lifttips', tips + 1); }
      liftT = setTimeout(unlift, 6000);
      return true;
    }
    var hovEl = null;
    function unhov() { if (hovEl) hovEl.classList.remove('hov'); hovEl = null; }
    board.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse' || !S || busy || !SET.fx || reduce) return;
      var h = e.target.closest ? e.target.closest('.card') : null;
      if (h === hovEl) return;
      unhov();
      // only a card you could play now (the games mark those .ok)
      if (!h || !h.classList.contains('ok') || h.classList.contains('flight')) return;
      h.classList.add('hov'); hovEl = h;
    });
    board.addEventListener('pointerleave', unhov);
    board.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // the keyboard: the cards the game marks as ready to use (.ok), each played as a tap (games audit, 5 Oct 2026)
    if (T.kbd) T.kbd(board, {
      busy: function () { return busy || !!openSheet || !S; },
      list: function () {
        var out = [];
        for (var c = 0; c < D.cards; c++) {
          var el = cardEl[c], p = lastP[c]; if (!el || !p || !(el.classList.contains('ok') || el.classList.contains('take')) || el.classList.contains('flight')) continue;   // (Gin's deck is .take)
          var f = D.face(c), nm = el.classList.contains('down') ? 'The deck: take the top card' : T.cardName(f.r, f.s) + (el.classList.contains('take') ? ', on the pile: take it' : '') + (el.classList.contains('sel') ? ', chosen' : '');
          out.push({ c: c, el: el, x: p.x, y: p.y, name: nm });
        }
        return out;
      },
      play: function (it) { unhint(); unhov(); handle(D.tap(S, it.c, U), it.el); }
    });
    panelEl.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-act]') : null; if (!b || b.disabled) return;
      unhint();
      handle(D.press(S, b.getAttribute('data-act'), U), b);
      // the button usually goes with its stage: keep a keyboard player's place on the cards (games audit, 5 Oct 2026)
      [0, 400, 1000, 2000, 3500].forEach(function (t) { setTimeout(function () { var a = document.activeElement; if (!openSheet && (!a || a === document.body || !document.body.contains(a))) { try { board.focus({ preventScroll: true }); } catch (er) {} } }, t); });   // (the button goes once the cards have moved)
    });
    function handle(r, el) {
      if (!r) return;
      if (sayHint && (r.m || r.ui)) sayNext();   // the player acted: the Hint's (or tip's) message has done its job
      if (r.say) { if (el && el.classList.contains('card')) nope(el); sfx('nope'); say(r.say); }
      if (r.ui) { sfx(r.sfx || 'lift'); render(); persist(); }
      if (r.m) { if (busy) { say('One moment – the others are still playing'); return; } act(r.m, true); }
      if (r.newGame) openNew();
    }
    function nope(el) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); setTimeout(function () { el.classList.remove('nope'); }, 360); }

    // ------------------------------------------------------------ moves, and the computer's turns
    function act(m, mine) {
      if (m.t === 'next' && jLevel()) { levelOver(); return false; }   // a Journey level is one hand: show its stars
      var fx = E.apply(S, m);
      if (!fx) { sfx('nope'); render(); return false; }
      if (mine) { G.started = true; if (E.code && G.log) G.log.push(E.code(m)); }
      if (fx.t === 'next') { U = {}; if (D.newHand) D.newHand(S, U); dealOut(); effects(fx); persist(); return fx; }
      effects(fx); render(); persist();
      if (jDone()) levelOver(); else if (D.over(S)) matchOver(); else go();
      return fx;
    }
    function go() {
      clearTimeout(goT);
      var m = E.auto(S);
      if (!m) { busy = false; render(); return; }
      busy = true;
      var my = gen;
      goT = setTimeout(function () {
        if (my !== gen) return;
        var fx = E.apply(S, m);
        if (!fx) { busy = false; render(); return; }
        effects(fx); render(); persist();
        if (jDone()) { busy = false; levelOver(); } else if (D.over(S)) { busy = false; matchOver(); } else go();
      }, reduce ? 300 : Math.round(D.wait(S, m) * SPEED[SET.speed]));   // (never quicker than the Hall of Fame allows: 0.2 s a move)
    }
    function effects(fx) {
      var K = { sfx: sfx, say: say, burst: burstAt, cardEl: cardEl, stamp: stamp };
      D.fx(fx, K, S);
    }
    // sparkles where a card is (a moon shot, a gin, the Queen)
    function burstAt(c, big) {
      if (!SET.fx || reduce || !cardEl[c]) return;
      var my = gen;
      setTimeout(function () {
        if (my !== gen) return;
        var r = cardEl[c].getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        Spark.burst(cx, cy, big ? 70 : 18, big ? ['#ffe08a', '#ffffff', '#ffb347', '#8ff0ff', '#ff8ad8'] : ['#ffe08a', '#ffffff', '#ffd257'], big ? 5.5 : 2.6, big ? 90 : 46);
        Spark.ring(cx, cy, big ? r.width * 1.4 : r.width * 0.7, '#ffe08a', big ? 40 : 22);
      }, 280);
    }

    // ------------------------------------------------------------ the hint
    var hintT = 0;
    function hint() {
      if (!S || !LVS.hint(S.lv)) { say('No hints at this level – you’re on your own!'); return; }
      if (busy) return;
      unhint();
      var m = E.hint(S); if (!m) { say('Nothing to do just now – wait for your turn'); return; }
      var lit = D.hintShow(S, m, U) || {};
      (lit.cards || []).forEach(function (c) { if (cardEl[c]) { cardEl[c]._hint = true; cardEl[c].classList.add('hint'); } });
      if (lit.say) say(lit.say, 'hint');
      hintT = setTimeout(unhint, 3200);
    }
    function unhint() { clearTimeout(hintT); cardEl.forEach(function (el) { if (el._hint) { el._hint = false; el.classList.remove('hint'); } }); }

    // ------------------------------------------------------------ new games
    function today(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function dayNumber(d) { return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 864e5); }
    function recordLoss() {
      if (!G || G.mode === 'journey' || !G.started || G.counted || !S || D.over(S)) return;
      ST.played++; ST.streak = 0; G.counted = true; save('stats', ST);
    }
    function newGame(mode, ji) {
      gen++; busy = false; clearTimeout(goT); unhint();
      recordLoss();
      var lv = SET.lv, seed, day = '', jl = null;
      if (mode === 'again') { seed = S.seed; lv = S.lv; mode = G.mode; day = G.day; ji = G.jl; }
      if (mode === 'journey') { jl = window.Journey && D.journey ? Journey.level(ji) : null; if (jl) { seed = jl.seed; lv = jl.lv; } else mode = 'match'; }
      else if (mode === 'shared') { seed = shared.seed; lv = shared.v; mode = 'match'; }
      else if (mode === 'daily') { day = today(); seed = 900000 + ((dayNumber(new Date()) * 7919) % 90000 + 90000) % 90000; }
      else if (!jl) { seed = 1 + Math.floor(Math.random() * 899999); }
      S = E.newMatch(seed, lv);
      G = newG(mode, day); U = {}; if (D.newHand) D.newHand(S, U);
      if (jl) G.jl = ji;
      else { ST.recent.push(seed); if (ST.recent.length > 60) ST.recent.shift(); save('stats', ST); }
      closeSheets(); layout();
      sfx('shuffle');
      dealOut();
      effects({ t: 'deal' });   // a game may say something about the first deal (Whist: what trumps are)
      if (jl) { var my = gen; setTimeout(function () { if (my === gen) say('Level ' + (ji + 1) + ' \u2013 ' + D.jr.goals(jl)[0] + ' for a star'); }, reduce ? 0 : 1700); }
      persist();
    }
    function dealOut() {   // every card starts on the deck, then they fly out one by one
      var P = D.positions(S, L, U), deck = L.deck, c, my = gen;
      board.classList.add('instant');
      for (c = 0; c < D.cards; c++) { var el = cardEl[c]; el.style.display = P[c] ? '' : 'none'; el.style.transform = 'translate3d(' + deck.x + 'px,' + deck.y + 'px,0)'; el.className = el._base + ' down'; el.style.zIndex = 10 + c; }
      void board.offsetWidth; board.classList.remove('instant');
      lastP = {};
      panelEl.hidden = true;
      if (reduce) { render(true); go(); return; }
      busy = true;
      var order = D.dealOrder(S), step = Math.max(14, Math.min(40, 1300 / order.length)), arcs = arcsOn();
      order.forEach(function (c, k) {
        setTimeout(function () {
          if (my !== gen) return;
          var p = P[c], el = cardEl[c];
          el.style.zIndex = 600 + k;
          if (k % 2 === 0) sfx('deal');
          if (arcs) {
            var an = T.fly(el, { x: deck.x, y: deck.y }, { x: p.x, y: p.y, r: p.rot || 0, s: p.sc || 1 }, { end: endT(p), dur: 300 + Math.min(180, (Math.abs(p.x - deck.x) + Math.abs(p.y - deck.y)) * 0.12), lift: 22, tilt: (p.x > deck.x ? 1 : -1) * 7, land: false });
            if (p.up) setTimeout(function () { if (my !== gen) return; el.classList.remove('down'); turnOn(el); }, T.flightTime(an) * 0.5);
            return;
          }
          el.style.transform = endT(p);
        }, 80 + k * step);
      });
      setTimeout(function () { if (my !== gen) return; busy = false; render(); go(); }, 80 + order.length * step + 560);
    }

    // ------------------------------------------------------------ the end of a match
    function matchOver() {
      var my = gen;
      if (G.counted) return;
      var r = D.result(S), badges = (r.badges || []).slice();
      ST.played++; G.counted = true;
      if (r.won) {
        ST.won++; ST.streak++;
        if (ST.won === 1) badges.unshift('Your first win!');
        if ([10, 25, 50, 100, 250, 500].indexOf(ST.won) >= 0) badges.push(ST.won + ' matches won!');
        if (ST.streak > ST.bestStreak) { ST.bestStreak = ST.streak; if (ST.streak >= 2) badges.push('Your longest winning run: ' + ST.streak + ' in a row'); }
        else if (ST.streak >= 2) badges.push(ST.streak + ' wins in a row');
      } else ST.streak = 0;
      if (r.best) {   // your best (e.g. Hearts: your lowest score in a win) at this level
        var key = 'v' + S.lv, b = ST.best[key] || (ST.best[key] = {});
        r.best.forEach(function (x) {
          var cur = b[x.k], better = cur == null || (x.low ? x.v < cur : x.v > cur);
          if (better) { if (cur != null && x.say) badges.push(x.say); b[x.k] = x.v; }
        });
      }
      if (G.mode === 'daily' && G.day) { ST.daily[G.day] = { won: r.won ? 1 : 0, d: S.lv, s: r.score }; badges.push('Today’s match: done!'); }
      save('stats', ST); persist();
      setTimeout(function () {
        if (my !== gen) return;
        if (r.won && SET.fx && !reduce) { sfx('win'); fireworks(true); celebrate(T.pickFinale(SET.win), function () { if (my !== gen) return; fireworks(false); showOver(); }); return; }
        if (r.won) { sfx('win'); fireworks(true); setTimeout(function () { if (my === gen) fireworks(false); }, 4200); }
        else sfx('lose');
        showOver();
      }, r.won ? 900 : 700);
      function showOver() {
        $('dOverH').textContent = r.title;
        $('oSub').textContent = r.sub + (G.mode === 'daily' ? ' · today’s match' : '');
        $('oTiles').innerHTML = (r.tiles || []).map(function (t) { return '<div class="tile"><b>' + esc(t[0]) + '</b><span>' + esc(t[1]) + '</span></div>'; }).join('');
        $('oBadges').innerHTML = badges.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
        $('oDaily').hidden = !!(ST.daily[today()]);
        $('oJour').hidden = true; $('oRow').hidden = false; $('oRow').style.display = '';
        openD('dOver');
        Array.prototype.forEach.call($('oTiles').querySelectorAll('.tile b'), function (b) { T.countUp(b, b.textContent); });   // the numbers count up
        var hb = $('oHof'); hb.hidden = true; hb.innerHTML = '';
        if (window.HallOfFame && D.hof && G.mode === 'daily' && r.won && G.lg) HallOfFame.daily(hb, { day: G.day, lv: S.lv, secs: Math.max(1, Math.round(G.ms / 1000)), log: G.log });
      }
    }
    // the win celebration (table.js finale): a whole pack bursts from the middle of the table
    function celebrate(kind, done) {
      var sp = $('spark'); sp.style.zIndex = '4550';
      return T.finale(kind, { cards: T.packAtCentre(L.cw, L.ch), cw: L.cw, ch: L.ch,
        burst: function (x, y, cols, big) { if (!SET.fx) return; Spark.burst(x, y, big ? 64 : 14, cols, big ? 5.4 : 2, big ? 80 : 30, { grav: 0.05, size: 6 }); if (big) Spark.ring(x, y, 70, cols[0], 26); },
        trail: function (x, y, cols) { if (SET.fx) Spark.burst(x, y, 2, cols, 0.9, 22, { grav: 0.02, size: 4 }); },
        sfx: sfx, max: 9000, done: function () { sp.style.zIndex = ''; if (done) done(); } });   // (fades out by 9 s - games audit)
    }
    // a big moment stamped on the table - a Gin, the Queen of spades, a moon shot, a perfect hand (the games call K.stamp)
    // o: { tone: 'gold' | 'dark' | 'red' | 'blue', sub: a smaller line, small: a lesser moment, big: sparks and a shake, moon }
    var stampEl = null;
    function stamp(text, o) {
      o = o || {};
      if (stampEl) stampEl.remove();
      var el = stampEl = document.createElement('div'), r = board.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.42;
      var pr = !panelEl.hidden && panelEl.getBoundingClientRect();   // above the panel, never over its words (games audit, 5 Oct 2026)
      if (pr && pr.height && cy > pr.top - 56) cy = Math.max(r.top + 56, pr.top - 56);
      el.className = 'st365 ' + (o.tone || 'gold') + (o.small ? ' small' : '') + (o.moon ? ' moon' : '');
      el.innerHTML = '<b>' + esc(text) + '</b>' + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '');
      el.style.left = cx + 'px'; el.style.top = cy + 'px';
      document.body.appendChild(el);
      // the panel often appears just after the stamp (the end of a hand): check again once it's drawn (critic 2: Gin's
      // 'Sam scores 5' sat on the result panel)
      requestAnimationFrame(function () { var p2 = !panelEl.hidden && panelEl.getBoundingClientRect(), er = el.getBoundingClientRect(); if (p2 && p2.height && er.bottom > p2.top - 6 && er.top < p2.bottom) el.style.top = Math.max(r.top + er.height / 2 + 6, p2.top - er.height / 2 - 12) + 'px'; });
      if (SET.fx && !reduce && !o.small) {
        var cols = o.tone === 'dark' ? ['#c9d2ff', '#ffffff', '#8a96c9'] : o.tone === 'red' ? ['#ff6b7a', '#ffd257', '#ffffff'] : o.tone === 'blue' ? ['#8ff0ff', '#ffffff', '#5cc2ff'] : ['#ffe08a', '#ffffff', '#ffb347', '#ff8ad8'];
        Spark.burst(cx, cy, o.big ? 90 : 40, cols, o.big ? 6.2 : 3.8, o.big ? 90 : 60, { grav: 0.05, size: 6 }); Spark.ring(cx, cy, o.big ? 200 : 130, cols[0], 34);
      }
      if (o.big && SET.fx && !reduce) { board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake'); setTimeout(function () { board.classList.remove('shake'); }, 500); }
      var stay = o.small ? 1100 : 1700;
      setTimeout(function () { el.classList.add('out'); }, stay);
      setTimeout(function () { el.remove(); if (stampEl === el) stampEl = null; }, stay + 520);
    }

    // ------------------------------------------------------------ the end of a Journey level (one hand)
    function jDone() { return !!(jLevel() && (S.phase === 'handEnd' || S.phase === 'over')); }
    function levelOver() {
      clearTimeout(goT); busy = false;
      var first = !G.jRes, my = gen;
      if (first) { G.jRes = D.jr.result(S); G.counted = true; persist(); render(); }
      setTimeout(function () { if (my === gen) showLevel(first); }, first ? 1500 : 0);   // a moment to see how the hand ended
    }
    function showLevel(first) {
      $('dOverH').textContent = 'Level ' + (G.jl + 1);
      $('oSub').textContent = D.jr.sayResult(G.jRes);
      $('oTiles').innerHTML = ''; $('oBadges').innerHTML = '';
      $('oHof').hidden = true; $('oRow').hidden = true; $('oRow').style.display = 'none';   // (.row's own display beats [hidden])
      openD('dOver');
      var n = Journey.win($('oJour'), G.jl, G.jRes);
      var f = $('oJour').querySelector('button'); if (f) try { f.focus(); } catch (e) {}
      if (!first) return;
      if (n) { sfx(n === 3 ? 'win' : 'fanfare'); if (n === 3) { fireworks(true); var my = gen; setTimeout(function () { if (my === gen) fireworks(false); }, 3600); } }
      else sfx('lose');
    }

    // ------------------------------------------------------------ sparkles and fireworks
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
          var a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random() * 0.9);
          P.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), max: life, col: cols[i % cols.length], s: (o.size || 7) * (0.6 + Math.random() * 0.8), g: o.grav == null ? 0.06 : o.grav, star: Math.random() < 0.35 });
        }
        if (!run) run = requestAnimationFrame(frame);
      }
      function ring(px, py, r1, col, life) { ensure(); RINGS.push({ x: px, y: py, r1: r1, col: col, life: life, max: life }); if (!run) run = requestAnimationFrame(frame); }
      function frame() {
        run = 0;
        x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, cv.width, cv.height); x.globalCompositeOperation = 'lighter';
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
        if (P.length || RINGS.length) run = requestAnimationFrame(frame);
      }
      return { burst: burst, ring: ring };
    })();
    var fwT = 0;
    function fireworks(on) {
      clearInterval(fwT); fwT = 0;
      var big = $('winBig');
      if (!on) { $('spark').style.zIndex = ''; big.hidden = true; return; }
      $('spark').style.zIndex = '4550';
      big.innerHTML = 'You won!<small>' + esc(D.title) + '</small>'; big.hidden = false;
      if (!SET.fx || reduce) return;
      var cols = [['#ffe08a', '#ffffff', '#ffb347'], ['#ff8ad8', '#ffffff', '#ff4fc8'], ['#8ff0ff', '#ffffff', '#3fe0ff'], ['#9dff9a', '#ffffff', '#5cff8a']];
      var shoot = function () {
        var cx = window.innerWidth * (0.15 + Math.random() * 0.7), cy = window.innerHeight * (0.12 + Math.random() * 0.35);
        Spark.burst(cx, cy, 60, cols[Math.floor(Math.random() * cols.length)], 5.2, 85, { grav: 0.05, size: 6 }); Spark.ring(cx, cy, 60, '#ffffff', 24); sfx('firework');
      };
      shoot(); fwT = setInterval(shoot, 650);
    }

    // ------------------------------------------------------------ sound: soft, made on the spot, nothing downloaded
    var AC = null, NOISE = null, OUT = null, ROOM = null;
    function ac() {
      if (!SET.sound || !gestured) return null;
      try {
        if (!AC) {
          var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C();
          var comp = AC.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = 0.005; comp.release.value = 0.2;
          OUT = AC.createGain(); OUT.gain.value = 0.95; OUT.connect(comp); comp.connect(AC.destination);
          // the room echo is built a moment later, not on the first tap (critic 3: a 130-170 ms stall on a phone's first
          // card - 65 ms of it making this echo); the first sounds just play dry
          setTimeout(function () { try {
            var cv = AC.createConvolver(), len = Math.floor(AC.sampleRate * 1.3), ir = AC.createBuffer(2, len, AC.sampleRate);
            for (var ch = 0; ch < 2; ch++) { var dd = ir.getChannelData(ch); for (var j = 0; j < len; j++) dd[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 2.8); }
            cv.buffer = ir; var rm = AC.createGain(); rm.gain.value = 0.28; rm.connect(cv); cv.connect(OUT); ROOM = rm;
          } catch (er) { ROOM = null; } }, 600);
        }
        if (AC.state === 'suspended') AC.resume();
      } catch (e) { return null; }
      return AC;
    }
    function out(a, node, verb) { node.connect(OUT || a.destination); if (verb && ROOM) { var s = a.createGain(); s.gain.value = verb; node.connect(s); s.connect(ROOM); } }
    function tick(freq, dur, gain, q, when, to, type) {
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
    function sfx(k, n) {
      if (!SET.sound) return;
      var i;
      if (k === 'place') { tick(700, 0.07, 0.6, 0.7, 0, 0, 'lowpass'); tone(150, 0.06, 0.05); }
      else if (k === 'slide') tick(2600, 0.16, 0.16, 0.8, 0, 900);
      else if (k === 'lift') tick(1800, 0.06, 0.12, 1.2, 0, 3000);
      else if (k === 'flip') { tick(3300, 0.04, 0.32, 1.6); tick(1600, 0.03, 0.18, 1); }
      else if (k === 'deal') tick(2300, 0.05, 0.26, 1.3, 0, 1400);
      else if (k === 'shuffle') { for (i = 0; i < 14; i++) tick(1800 + Math.random() * 1600, 0.035, 0.16, 1.3, i * 0.03); tick(900, 0.25, 0.12, 0.8, 0.45, 0, 'lowpass'); }
      else if (k === 'gather') { for (i = 0; i < 4; i++) tick(2000 + i * 300, 0.05, 0.14, 1.2, i * 0.04, 1200); }
      else if (k === 'chime') { var f = [1047, 1319, 1568, 2093][Math.min(3, n || 0)]; tone(f, 0.5, 0.045, 0.01, 'sine', 0.5); tone(f * 2, 0.3, 0.015, 0.02, 'triangle', 0.3); }
      else if (k === 'thud') { tone(98, 0.5, 0.11, 0, 'sine'); tone(147, 0.35, 0.05, 0.02, 'triangle', 0.3); tick(400, 0.3, 0.2, 0.7, 0, 120, 'lowpass'); }
      else if (k === 'fanfare') [1047, 1319, 1568, 2093].forEach(function (fq, j) { tone(fq, 0.6, 0.05, 0.08 + j * 0.09, 'triangle', 0.55); });
      else if (k === 'nope') tone(196, 0.13, 0.06, 0, 'triangle');
      else if (k === 'firework') { tick(900, 0.5, 0.22, 0.6, 0, 120, 'lowpass'); tone(70, 0.3, 0.08, 0, 'sine'); for (i = 0; i < 6; i++) tick(5000 + Math.random() * 3000, 0.04, 0.05, 3, 0.25 + Math.random() * 0.35); }
      else if (k === 'win') { [523, 659, 784, 1047, 1319].forEach(function (fq, j) { tone(fq, 0.5, 0.06, j * 0.11, 'triangle', 0.5); tone(fq / 2, 0.5, 0.03, j * 0.11, 'sine'); }); tone(1568, 1.2, 0.05, 0.6, 'sine', 0.7); }
      else if (k === 'lose') [392, 349, 330, 262].forEach(function (fq, j) { tone(fq, 0.45, 0.045, j * 0.18, 'triangle', 0.4); });
    }

    // ------------------------------------------------------------ pop-up sheets
    var openSheet = null, lastFocus = null;
    // Tab stays inside whichever dialog is open on top - ours, the Hall of Fame, the Journey, Looks, Share
    // (games audit, 5 Oct 2026); the last visible aria-modal in the page is the one on top
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var dl = [].filter.call(document.querySelectorAll('[aria-modal="true"]'), function (x) { return x.getClientRects().length > 0; }).pop();
      if (!dl) return;
      var f = [].filter.call(dl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && x.getClientRects().length > 0; });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey ? i <= 0 : (i < 0 || i === f.length - 1)) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
    }, true);
    function openD(id) {
      closeSheets();
      var d = $(id); d.hidden = false; openSheet = d; lastFocus = document.activeElement;
      // focus the main button without scrolling to it: on a phone a long sheet (How to play) would open at the bottom
      var f = d.querySelector('.btn.go') || d.querySelector('button'); if (f) f.focus({ preventScroll: true });
      var sh = d.querySelector('.sheet'); if (sh) sh.scrollTop = 0;
    }
    function closeSheets() {
      if (!openSheet) return;
      openSheet.hidden = true; openSheet = null;
      if (lastFocus && lastFocus.focus && lastFocus !== document.body && document.body.contains(lastFocus)) { try { lastFocus.focus(); } catch (e) {} }
      else { try { board.focus({ preventScroll: true }); } catch (e) {} }   // (a sheet that opened by itself: back to the cards)
    }
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest && t.closest('[data-close]')) { closeSheets(); return; }
      if (t.classList && t.classList.contains('scrim')) closeSheets();
    });
    function openNew() {
      var inPlay = G && G.started && !D.over(S), dd = ST.daily[today()];
      $('dNewNote').textContent = jLevel() && !G.jRes ? 'Leave this Journey level? You can play it again from the map.' : inPlay && !jLevel() ? 'The match you’re playing will count as not won.' : 'Choose a level, then deal.';
      $('nDailyS').textContent = (dd ? 'Done today ✔ — play it again if you like' : 'The same cards for everyone today') + (D.hof ? ' · race the Hall of Fame' : '');
      $('nAgainS').textContent = 'Match #' + S.seed + ', from the first hand';
      syncControls(); openD('dNew');
    }
    function tile(v, label) { return '<div class="tile"><b>' + esc(v) + '</b><span>' + esc(label) + '</span></div>'; }
    function openStats() {
      var rate = ST.played ? Math.round(100 * ST.won / ST.played) + '%' : '–', days = 0, k;
      for (k in ST.daily) if (ST.daily[k]) days++;
      $('sTiles').innerHTML = tile(ST.won, 'Matches won') + tile(rate, 'Win rate') + tile(ST.played, 'Matches played') + tile(ST.streak, 'Winning streak') + tile(ST.bestStreak, 'Longest streak') + tile(days, 'Today’s matches played');
      var out = '';
      LVS.options.forEach(function (o, n) {
        var b = ST.best['v' + o[0]];
        if (!b) return;
        (D.bestTiles || []).forEach(function (bt) { if (b[bt.k] != null) out += tile(bt.fmt ? bt.fmt(b[bt.k]) : b[bt.k], bt.label + ', ' + o[1].toLowerCase()); });
      });
      $('sBest').innerHTML = out;
      openD('dStats');
    }
    function syncControls() {
      Array.prototype.forEach.call(document.querySelectorAll('[data-lv]'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-lv') === SET.lv)); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-speed]'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-speed') === SET.speed)); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-set]'), function (b) { b.setAttribute('aria-checked', String(!!SET[b.getAttribute('data-set')])); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-felt]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-felt') === SET.felt)); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-back') === SET.back)); });
      document.body.className = 'felt-' + SET.felt + ' back-' + SET.back + (SET.fx ? '' : ' nofx') + ' rivals';
      if ($('sWin')) $('sWin').value = SET.win;
      var pv = $('sLookPv'); if (pv) { pv.className = 'lkpv lk-f-' + SET.felt; pv.firstChild.className = 'lk-b-' + SET.back; }
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-lv],[data-speed],[data-set],[data-felt],[data-back]') : null; if (!b) return;
      if (b.hasAttribute('data-lv')) SET.lv = +b.getAttribute('data-lv');
      else if (b.hasAttribute('data-speed')) SET.speed = +b.getAttribute('data-speed');
      else if (b.hasAttribute('data-set')) { var k = b.getAttribute('data-set'); SET[k] = !SET[k]; }
      else if (b.hasAttribute('data-back')) SET.back = b.getAttribute('data-back');
      else SET.felt = b.getAttribute('data-felt');
      if ((b.hasAttribute('data-felt') || b.hasAttribute('data-back')) && window.Looks) Looks.remember(SET.felt, SET.back);
      save('settings', SET); syncControls();
    });

    // ------------------------------------------------------------ buttons and keys
    // Settings > Win celebration: the choice, and Watch - a whole pack does it in the middle of the table
    $('sWin').addEventListener('change', function () { SET.win = $('sWin').value; save('settings', SET); });
    $('sWinTry').onclick = function () { closeSheets(); celebrate(T.pickFinale(SET.win)); };
    if (window.Looks) $('sLooks').onclick = function () {
      closeSheets();
      Looks.open({ felt: SET.felt, back: SET.back, pick: function (kind, id) { if (kind === 'felt') SET.felt = id; else SET.back = id; save('settings', SET); syncControls(); } });
    };
    $('bNew').onclick = openNew;
    $('bHint').onclick = hint;
    $('bStats').onclick = openStats;
    $('bSet').onclick = function () { syncControls(); openD('dSet'); };
    $('bHelp').onclick = function () { openD('dHelp'); };
    // the site's Text size / High contrast / Reduce motion, in Settings too (a11y365.js; games audit, 5 Oct 2026)
    if (window.A11y365) { A11y365.mount($('dSet').querySelector('.sheet')); A11y365.onReduce = function (on) { reduce = on || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }; }
    $('skip365').onclick = function (e) { e.preventDefault(); board.focus(); };   // the first Tab stop (games audit, 5 Oct 2026)
    // More (phones): the bar's tucked-away buttons, as big buttons with words (games audit, 5 Oct 2026)
    $('bMore').onclick = function () {
      $('moreL').innerHTML = ['bStats', 'bSet', 'bShare', 'bFeed', 'bFull'].filter(function (id) { return $(id) && !$(id).hidden && !$(id).getClientRects().length; }).map(function (id) {
        var b = $(id); return '<button class="btn wide morei" type="button" data-for="' + id + '">' + b.querySelector('svg').outerHTML + '<span>' + esc(b.querySelector('.lbl').textContent) + '</span></button>';
      }).join('');
      openD('dMore');
    };
    $('moreL').onclick = function (e) { var b = e.target.closest && e.target.closest('[data-for]'); if (!b) return; closeSheets(); var t = $(b.getAttribute('data-for')); setTimeout(function () { t.click(); }, 0); };
    $('bBrand').onclick = function () { $('bGames').click(); };
    $('nDeal').onclick = function () { newGame('match'); };
    $('nDaily').onclick = function () { newGame('daily'); };
    $('nAgain').onclick = function () { newGame('again'); };
    $('oAgain').onclick = function () { newGame('match'); };
    $('oDaily').onclick = function () { newGame('daily'); };
    $('oStats').onclick = openStats;
    if (D.hof && window.HallOfFame) {
      var hofOpen = function () { closeSheets(); HallOfFame.open({}); };
      $('nHof').onclick = hofOpen; $('sHof').onclick = hofOpen;
      HallOfFame.init({ game: D.id, title: D.title, kind: 'match', what: D.hofWhat || {}, levels: LVS.options.map(function (o) { return [o[0], o[1]]; }),
        level: function () { return SET.lv; }, sfx: function (k) { sfx(k === 'suit' ? 'fanfare' : 'chime', 3); },
        burst: function (x, y, place) { if (SET.fx && !reduce) { Spark.burst(x, y, place === 1 ? 90 : 50, ['#ffe08a', '#ffffff', '#ffb347', '#8ff0ff'], 6, 90); Spark.ring(x, y, 120, '#ffe08a', 40); } },
        onPlay: function () { newGame('daily'); } });
    }
    if (D.journey && window.Journey) {
      Journey.init({ game: D.id, store: D.store, title: D.title, data: D.journey, rules: D.jr,
        lvName: function (lv) { var o = LVS.options.filter(function (x) { return x[0] === lv; })[0]; return o ? 'The computer plays at ' + o[1] : ''; },
        onPlay: function (i) { closeSheets(); newGame('journey', i); },
        onLeave: function () { closeSheets(); },
        onWin: function (n) { if (n === 3 && SET.fx && !reduce) { var r = document.querySelector('#oJour .bigst'); if (r) { var b = r.getBoundingClientRect(); setTimeout(function () { Spark.burst(b.left + b.width / 2, b.top + b.height / 2, 70, ['#ffe08a', '#ffffff', '#ffb347'], 5, 80); }, 1000); } } } });
      $('nJourney').onclick = function () { closeSheets(); Journey.open(); };
    }
    if (window.GameSocial) GameSocial.init({ id: D.id, title: D.title });
    $('bShare').onclick = function () { if (window.GameSocial) GameSocial.share(); };
    $('bGames').onclick = function () { if (window.GameSocial && GameSocial.openGames) GameSocial.openGames(); else location.href = '/games/'; };
    $('bFeed').onclick = function () { if (window.GameSocial) GameSocial.openFeedback('feedback'); };
    if (!window.GameSocial) { $('bShare').hidden = true; $('bFeed').hidden = true; $('oShare').hidden = true; }
    $('oShare').onclick = function () {
      if (!window.GameSocial || !S) return;
      var r = D.result(S), name = LVS.options.filter(function (o) { return o[0] === S.lv; })[0][1];
      GameSocial.share({ text: (r.share || ('I played ' + D.title)) + ' (' + name + ') – can you beat me with the same cards? Free, with no adverts:', query: '?deal=' + S.seed + '&v=' + S.lv });
    };
    $('sReset').onclick = function () { openD('dReset'); };
    $('rYes').onclick = function () { ST = blankStats(); save('stats', ST); if (G) G.counted = true; closeSheets(); say('Your scores have been cleared'); };
    function toggleFull() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {} }
    $('bFull').onclick = toggleFull;
    if (!document.fullscreenEnabled) $('bFull').hidden = true;
    document.addEventListener('fullscreenchange', function () { $('bFullL').textContent = document.fullscreenElement ? 'Leave full screen' : 'Full screen'; });
    document.addEventListener('keydown', function (e) {
      gestured = true;
      if (e.defaultPrevented || (window.GameSocial && GameSocial.isOpen()) || (window.HallOfFame && HallOfFame.isOpen()) || (window.Journey && Journey.isOpen()) || (window.Looks && Looks.isOpen())) return;   // typing feedback or initials
      if (e.key === 'Escape') { if (openSheet) closeSheets(); return; }
      if (openSheet || e.altKey || e.ctrlKey || e.metaKey) return;
      var k = (e.key || '').toLowerCase();
      if (k === 'h') hint(); else if (k === 'n') openNew(); else if (k === 'f') toggleFull();
    });

    // ------------------------------------------------------------ little messages, the clock, saving
    var sayT = 0;
    // messages (games audit, 5 Oct 2026; critic: scoring messages were gone in 1.2 s even on Slow): each stays at least
    // 1.7 s and about a quarter of a second a word (half as long again on Slow); a new one waits for that minimum
    // instead of wiping the last; a Hint's message goes as soon as the player acts
    var sayAt = 0, sayQ = [], sayOn = false, sayHint = false, sayPh = null;
    function spdF() { return SET.speed === 1 ? 1.5 : SET.speed === 3 ? 0.8 : 1; }
    function sayShow(t) {
      var el = $('toast');
      el.textContent = t; el.classList.add('on'); sayAt = Date.now(); sayOn = true;
      // never over the panel (its buttons and the count): just above it instead; on a phone, at the top of the table,
      // over the other players' cards rather than the piles, the trick or your hand (critic 3)
      if (innerWidth < 600) { el.style.top = Math.round(board.getBoundingClientRect().top + 8) + 'px'; el.style.bottom = 'auto'; }
      else { el.style.top = ''; var pr = !panelEl.hidden && panelEl.getBoundingClientRect(); el.style.bottom = pr && pr.height && pr.top < innerHeight - 177 ? Math.round(innerHeight - pr.top + 10) + 'px' : ''; }
      clearTimeout(sayT); sayT = setTimeout(sayNext, Math.min(9000, 1700 + t.split(/\s+/).length * 260) * spdF());
    }
    function sayNext() { if (sayQ.length) sayShow(sayQ.shift()); else sayClear(); }
    function sayClear() { clearTimeout(sayT); sayQ = []; sayOn = false; sayHint = false; $('toast').classList.remove('on'); }
    // kind: 'hint' (gives way to anything, goes when the player acts) or 'tip' (shows at once, the message it covers
    // comes back after it); a plain message waits its turn and is read in full (critic 3: queued ones were cut short)
    function say(t, kind) {
      if (!t) return;
      if (kind === 'tip') { if (sayOn && !sayHint) sayQ.unshift($('toast').textContent); sayHint = true; sayShow(t); return; }
      if (!sayOn || sayHint) { sayHint = kind === 'hint'; sayShow(t); return; }   // nothing showing, or only a hint/tip: show it now
      if (sayQ[sayQ.length - 1] === t || (!sayQ.length && $('toast').textContent === t)) return;
      sayQ.push(t); if (sayQ.length > 4) sayQ.shift();
    }
    function persist() { if (S) save('game', { s: S, g: G, u: U }); }
    var lastTick = Date.now();
    setInterval(function () { var now = Date.now(), d = Math.min(2000, now - lastTick); lastTick = now; if (G && G.started && S && !D.over(S) && !document.hidden && !openSheet && !(window.HallOfFame && HallOfFame.isOpen())) G.ms += d; }, 1000);
    document.addEventListener('visibilitychange', function () { if (document.hidden) persist(); });
    window.addEventListener('pagehide', persist);
    var rz = 0;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { layout(); render(true); }, 120); });

    // ------------------------------------------------------------ start
    syncControls();
    var shared = null;
    try {
      var q = new URLSearchParams(location.search), dn = parseInt(q.get('deal'), 10), dv = parseInt(q.get('v'), 10);
      if (dn > 0 && dn < 10000000) shared = { seed: dn, v: LVS.options.some(function (o) { return o[0] === dv; }) ? dv : SET.lv };
      if (q.has('deal') && window.history && history.replaceState) history.replaceState(null, '', location.pathname);
    } catch (e) {}
    // from the Games page: ?daily=1 plays Today's match, ?hof=1 opens the Hall of Fame
    var ask = {};
    try {
      var qa = new URLSearchParams(location.search); ask.daily = qa.get('daily') === '1'; ask.hof = qa.get('hof') === '1';
      if ((qa.has('daily') || qa.has('hof')) && window.history && history.replaceState) history.replaceState(null, '', location.pathname);
    } catch (e) {}
    var saved = load('game', null);
    if (!shared && saved && saved.s && saved.g && E.valid(saved.s) && !D.over(saved.s)) {
      S = saved.s; G = newG(saved.g.mode, saved.g.day); G.started = !!saved.g.started; G.counted = !!saved.g.counted; G.ms = +saved.g.ms || 0;
      G.log = Array.isArray(saved.g.log) ? saved.g.log : []; G.lg = !!saved.g.lg;   // a game saved before moves were logged can't go to the Hall of Fame
      if (G.mode === 'journey') { G.jl = saved.g.jl; G.jRes = saved.g.jRes || null; if (!jLevel()) G.mode = 'match'; }
      U = saved.u && typeof saved.u === 'object' ? saved.u : {};
      layout(); render(true); go();
    } else if (shared) { S = E.newMatch(shared.seed, shared.v); G = newG(); layout(); newGame('shared'); say('Match #' + shared.seed + ' – the same cards your friend played. Good luck!'); }
    else { S = E.newMatch(1, SET.lv); G = newG(); layout(); newGame('match'); }
    if (!shared && ask.daily && !(G.mode === 'daily' && G.day === today())) newGame('daily');   // today's match already under way: carry on with it
    if (!SET.seenHelp) { SET.seenHelp = true; save('settings', SET); if (!ask.hof) openD('dHelp'); }
    if (ask.hof && D.hof && window.HallOfFame) { closeSheets(); HallOfFame.open({}); }
    // read-only, for the tests (and PC Manager): the game as it stands, and whether the computer is mid-turn
    window.GAME365 = { get state() { return E.clone(S); }, get busy() { return busy; }, get ui() { return JSON.parse(JSON.stringify(U)); }, get won() { return !!(S && D.over(S) && D.result(S).won); },
      get mode() { return G ? G.mode : ''; }, get level() { return G && G.mode === 'journey' ? G.jl : -1; }, get levelResult() { return G && G.jRes ? JSON.parse(JSON.stringify(G.jRes)) : null; } };

    // ------------------------------------------------------------ the page's bar, table and sheets
    function buildUI() {
      var tb = function (id, icon, label, title, cls) { return '<button class="tb' + (cls ? ' ' + cls : '') + '" id="' + id + '" type="button" title="' + esc(title) + '">' + ICON[icon] + '<span class="lbl"' + (id === 'bFull' ? ' id="bFullL"' : '') + '>' + esc(label) + '</span>'
        + ({ bNew: 'New', bGames: 'Games', bUndo: 'Undo', bHint: 'Hint', bHelp: 'Help', bPause: 'Pause', bMore: 'More' }[id] ? '<span class="sl" aria-hidden="true">' + { bNew: 'New', bGames: 'Games', bUndo: 'Undo', bHint: 'Hint', bHelp: 'Help', bPause: 'Pause', bMore: 'More' }[id] + '</span>' : '') + '</button>'; };
      var lvls = LVS.options.map(function (o, i) {
        var stars = ''; for (var k = 1; k <= LVS.options.length; k++) stars += '<i class="' + (k <= i + 1 ? 'on' : '') + '"></i>';
        return '<button type="button" data-lv="' + o[0] + '" style="--i:' + i + '"><span class="lvtop"><b>' + esc(o[1]) + '</b><span class="lvst" aria-hidden="true">' + stars + '</span></span><small>' + esc(LVS.info(o[0])) + '</small></button>';
      }).join('');
      var chip = function (i) { return '<div class="chip" id="rvChip' + i + '"><small></small><span></span></div>'; };
      var html = '<a class="skip365" href="#board" id="skip365">Skip to the cards</a><div id="app"><header class="bar"><h1 class="brand"><button class="brandb" type="button" id="bBrand" title="All our games"><b>365</b> <span>' + esc(D.title) + '</span><i class="caret" aria-hidden="true">&#9662;</i></button></h1>'
        + '<div class="info" aria-live="off">' + chip(0) + chip(1) + chip(2) + '</div>'
        + '<nav class="tools" aria-label="Game">' + tb('bNew', 'new', 'New game', 'New game (N)', 'main') + tb('bGames', 'games', 'Games', 'Switch to another of our games', 'tb3') + tb('bHint', 'hint', 'Hint', 'Show me a good move (H)')
        + tb('bStats', 'stats', 'My scores', 'My scores', 'tb3 tbx') + tb('bSet', 'set', 'Settings', 'Settings', 'tb3 tbx') + tb('bHelp', 'help', 'How to play', 'How to play')
        + tb('bShare', 'share', 'Share', 'Share this game with a friend', 'tb2 tbx') + tb('bFeed', 'feedback', 'Feedback', 'Tell us what you think, or ask for a new game', 'tb2 tbx') + tb('bFull', 'full', 'Full screen', 'Full screen (F)', 'tb2 tbx') + tb('bMore', 'more', 'More', 'More: my scores, settings, share, feedback', 'tbmore') + '</nav></header>'
        + '<main id="board" aria-label="The card table"><div id="rvPanel" hidden></div></main></div>'
        + '<div id="toast" role="status" aria-live="polite"></div><canvas id="spark" aria-hidden="true"></canvas><div id="winBig" hidden aria-hidden="true"></div>'
        + sheet('dNew', 'New game', '<p class="soft" id="dNewNote"></p><div class="lvls" role="group" aria-label="Level">' + lvls + '</div>'
          + '<div class="choice"><button class="btn go" type="button" id="nDeal">New match<small>Fresh cards</small></button>'
          + '<button class="btn" type="button" id="nDaily">Today&rsquo;s match<small id="nDailyS">The same cards for everyone today</small></button>'
          + '<button class="btn" type="button" id="nAgain">Play this match again<small id="nAgainS"></small></button></div>'
          + (D.hof || D.journey ? '<p class="chalh">Challenges</p><div class="choice chals">'
            + (D.journey ? '<button class="btn jourbtn" type="button" id="nJourney">&#129517; The Journey<small>100 levels ' + esc(D.journey.where || 'around Dorset') + ' &mdash; one hand at a time</small></button>' : '')
            + (D.hof ? '<button class="btn hofbtn" type="button" id="nHof">&#127942; Hall of Fame<small>Today&rsquo;s match: the best wins in Dorset and beyond</small></button>' : '') + '</div>' : '')
          + '<div class="row"><button class="btn wide" type="button" data-close>Keep playing</button></div>')
        + sheet('dOver', 'You won!', '<p class="soft" id="oSub"></p><div class="tiles" id="oTiles"></div><ul class="badges" id="oBadges"></ul><div id="oHof" hidden></div><div id="oJour" hidden></div>'
          + '<div class="row" id="oRow"><button class="btn go wide" type="button" id="oAgain">New match</button><button class="btn wide" type="button" id="oShare">Challenge a friend</button><button class="btn wide" type="button" id="oDaily">Today&rsquo;s match</button><button class="btn wide" type="button" id="oStats">My scores</button></div>')
        + sheet('dStats', 'My scores', (D.hof ? '<button class="btn hofbtn wide" type="button" id="sHof" style="width:100%;margin:2px 0 12px">&#127942; The Hall of Fame<small>Today&rsquo;s match: the best wins, this week, all time</small></button>' : '') + '<p class="soft">Kept on this computer only &mdash; nothing is sent anywhere unless you join the Hall of Fame.</p><div class="tiles" id="sTiles"></div><div class="tiles" id="sBest"></div>'
          + '<div class="row"><button class="btn go wide" type="button" data-close>Close</button><button class="btn" type="button" id="sReset">Clear my scores</button></div>')
        + sheet('dSet', 'Settings', '<div class="set"><div><label>How fast the others play</label><small>Slow gives you time to watch every card.</small></div><div class="seg" role="group" aria-label="How fast the others play"><button type="button" data-speed="1">Slow</button><button type="button" data-speed="2">Normal</button><button type="button" data-speed="3">Quick</button></div></div>'
          + sw('sound', 'Sounds', 'Soft card sounds and chimes.') + sw('fx', 'Extra effects', 'Sparkles and fireworks when you win. Switch off on a slower computer.')
          + '<div class="set"><div><label for="sWin">Win celebration</label><small>Surprise me picks a different one each time.</small></div><div class="wincel"><select id="sWin">' + T.FINALE_NAMES.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select><button class="btn" type="button" id="sWinTry">Watch</button></div></div>'
          + (window.Looks ? '<div class="set"><div><label>Tables and card backs</label><small>Twelve of each &ndash; the specials are won with Journey stars.</small></div><button class="btn lkbtn" type="button" id="sLooks"><span class="lkpv" id="sLookPv"><i></i></span>Choose</button></div>' : ''
            + '<div class="set"><div><label>Table</label></div><div class="felts" role="group" aria-label="Table"><button type="button" data-felt="green" style="background:#1f7a45" aria-label="Green baize"></button><button type="button" data-felt="blue" style="background:#1f5f9c" aria-label="Blue"></button><button type="button" data-felt="red" style="background:#8e2537" aria-label="Red"></button><button type="button" data-felt="slate" style="background:#45526a" aria-label="Grey"></button>'
          + '<button type="button" data-felt="oak" style="background:repeating-linear-gradient(91deg,#6b4220 0 3px,#7a4c26 3px 6px)" aria-label="Oak table"></button><button type="button" data-felt="night" style="background:radial-gradient(#2a3670,#060918)" aria-label="Night"></button></div></div>'
          + '<div class="set"><div><label>Card backs</label></div><div class="backs" role="group" aria-label="Card backs"><button type="button" data-back="navy" style="background:linear-gradient(155deg,#17447a,#0a2245)" aria-label="365 navy"></button><button type="button" data-back="royal" style="background:linear-gradient(155deg,#8e1d2c,#4a0712)" aria-label="Royal red"></button><button type="button" data-back="sea" style="background:linear-gradient(180deg,#ff9a6a,#ffcf8a 30%,#2aa3c4 52%,#0b5e86)" aria-label="Seaside"></button></div></div>')
          + '<p class="foot">' + esc(D.title) + ' is made by <a href="https://365techies.co.uk/" target="_blank" rel="noopener">365 Techies</a> in Bournemouth. No adverts, no sign-in, nothing to install. Computer playing up? Ring us on <b>01202 775566</b>.</p>'
          + '<div class="row"><button class="btn go wide" type="button" data-close>Done</button></div>')
        + sheet('dMore', 'More', '<div class="morel" id="moreL"></div>')
        + sheet('dHelp', 'How to play', '<ol class="how">' + (D.help || []).map(function (h) { return '<li>' + h + '</li>'; }).join('') + '</ol>'
          + '<p class="soft keys365">Keys, if you like them: arrow keys choose a card and Enter plays it; Tab reaches the buttons; N new game, H hint, F full screen.</p><div class="row"><button class="btn go wide" type="button" data-close>Let&rsquo;s play</button></div>')
        + sheet('dReset', 'Clear my scores?', '<p>Your matches won, winning runs and best scores for ' + esc(D.title) + ' on this computer go back to nothing. This can&rsquo;t be undone.</p><div class="row"><button class="btn wide" type="button" data-close>Keep them</button><button class="btn go wide" type="button" id="rYes" style="background:#a3242f;border-color:#a3242f">Clear them</button></div>');
      var holder = document.createElement('div'); holder.innerHTML = html;
      var frag = document.createDocumentFragment();
      while (holder.firstChild) frag.appendChild(holder.firstChild);
      document.body.insertBefore(frag, document.body.firstChild);
    }
    function sheet(id, title, body) { return '<div class="scrim" id="' + id + '" hidden><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="' + id + 'H"><h2 id="' + id + 'H">' + esc(title) + '</h2><button class="x365" type="button" data-close aria-label="Close">&times;</button>' + body + '</div></div>'; }
    function sw(key, label, small) { return '<div class="set"><div><label id="l_' + key + '">' + label + '</label><small>' + small + '</small></div><button class="sw" type="button" role="switch" aria-labelledby="l_' + key + '" data-set="' + key + '"></button></div>'; }
  }

  window.Rivals365 = { start: start };
})();
