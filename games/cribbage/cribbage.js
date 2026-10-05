/* 365 Cribbage on the shared table for games against the computer, games/common/rivals.js (5 Oct 2026; owner: "yes do
 * Cribbage and Whist next"). The rules and the computer player (Sam) are in engine.js (window.CribEngine).
 * Sam's cards lie face down along the top, with the peg board under his name; the deck (with the starter turned up)
 * sits on the left and the crib on the right; the cards played in the play lie in a row in front of each player, with
 * the count between them; your hand is along the bottom. In the show the hands are turned up and counted aloud the
 * old way - "fifteen two, fifteen four, and a pair is six" - one at a time, as you press on. */
(function () {
  'use strict';
  var E = window.CribEngine, OPP = 'Sam';
  var RW = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  var NUM = ['nought', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
    'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine'];
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function who(p, cap) { return p === 0 ? (cap ? 'You' : 'you') : OPP; }
  function nm(n) { return NUM[n] || String(n); }

  // ------------------------------------------------------------ where everything sits
  function layout(W, H) {
    var tall = H > W * 1.1, gap = clamp(Math.round(Math.min(W, H) * 0.016), 6, 16), stepK = tall ? 0.5 : 0.6;
    var byW = (W - gap * 2) / (1 + 5 * stepK), byH = (H - gap * 6 - 150) / 3.25 / 1.4, byMid = (W - gap * 6) / 4.2;
    var cw = Math.floor(clamp(Math.min(byW, byH, byMid), 40, 118)), ch = Math.round(cw * 1.4);
    var L = { W: W, H: H, cw: cw, ch: ch, gap: gap, tall: tall, step: Math.round(cw * stepK), osc: tall ? 0.6 : 0.64 };
    L.handY = H - gap - ch;
    L.oppY = Math.round(gap - ch * (1 - L.osc) / 2);
    L.cx = Math.round(W / 2);
    L.boardY = Math.round(gap + ch * L.osc + 40);
    L.bw = Math.min(W - gap * 2, 560);
    var top = L.boardY + (tall ? 92 : 58), bottom = L.handY - 46;
    L.midY = Math.round((top + bottom) / 2);                    // between the two rows played in the play
    L.rowOpp = Math.round(L.midY - ch - 6); L.rowYou = Math.round(L.midY + 6);
    L.deckX = gap; L.cribX = W - gap - cw; L.sideY = Math.round(L.midY - ch / 2);
    L.deck = { x: L.deckX, y: L.sideY };
    // the cards played lie between the deck and the crib: up to four each, overlapping as much as they must
    var avail = L.cribX - (L.deckX + cw) - gap * 2;
    L.pstep = Math.round(Math.min(cw * 0.58, (avail - cw) / 3));
    L.playX = Math.round(L.deckX + cw + gap + (avail - (cw + 3 * L.pstep)) / 2);
    var pw = Math.min(W - gap * 2 - (tall ? 0 : cw * 2 + gap * 2), tall ? 370 : 440);
    L.panel = { x: Math.round((W - pw) / 2), y: Math.round(L.midY - ch * 0.7), w: pw };
    return L;
  }
  function rowAt(L, cards, y, sc, step) {   // a row of cards centred across the table
    var n = cards.length, w = L.cw * sc + Math.max(0, n - 1) * step, left = L.cx - w / 2, out = {};
    cards.forEach(function (c, i) { out[c] = { x: left + i * step - L.cw * (1 - sc) / 2, y: y - L.ch * (1 - sc) / 2 }; });
    return out;
  }
  function positions(S, L, U) {
    var P = {}, z = 10, show = S.phase === 'show' || S.phase === 'handEnd' || (S.phase === 'over' && S.counts.length);
    var sel = (U && U.crib) || [], mine = S.phase === 'peg' && S.turn === 0, ok = mine ? E.legal(S, 0) : [];
    var counted = S.shown ? S.shown.cards : [], cribTime = show && S.shown && S.shown.crib;
    // in the show the starter goes with the hand being counted (the five cards that score together)
    var starterRow = show && S.shown && S.starter != null ? (cribTime ? S.dealer : S.shown.who) : -1;
    // the deck on the left, the starter turned up on top of it
    S.deck.forEach(function (c, i) { if (c === S.starter) return; var k = Math.min(5, Math.floor(i / 7)); P[c] = { x: L.deckX + k, y: L.sideY - k, z: 5 + i, up: false }; });
    if (S.starter != null && starterRow < 0) P[S.starter] = { x: L.deckX + 6, y: L.sideY - 4, z: 60, up: true, rot: -4 };
    // the crib on the right (face down) - in the show, when the crib is counted, it changes places with the dealer's hand
    var cribAt = function (cards) { cards.forEach(function (c, i) { P[c] = { x: L.cribX - i * 2, y: L.sideY - i * 2, z: 70 + i, up: false, rot: 3 - i * 2 }; }); };
    if (!cribTime) cribAt(S.crib);
    // Sam
    if (S.phase === 'discard') {
      S.hands[1].forEach(function (c, i) { P[c] = { x: L.cx - L.cw / 2 + (i - 2.5) * L.cw * L.osc * 0.42, y: L.oppY, z: 100 + i, up: false, sc: L.osc, rot: 180 }; });
    } else if (show) {
      var oppCards = cribTime && S.dealer === 1 ? S.crib : S.held[1];
      if (cribTime && S.dealer === 1) cribAt(S.held[1]);
      var oc = oppCards.concat(starterRow === 1 ? [S.starter] : []), ro = rowAt(L, oc, L.oppY + L.ch * (1 - L.osc) / 2, L.osc, L.cw * L.osc * 0.62);
      oc.forEach(function (c, i) { var st = c === S.starter; P[c] = { x: ro[c].x + (st ? L.gap * 2 : 0), y: ro[c].y, z: 100 + i, up: true, sc: L.osc, rot: st ? 4 : 0, cls: counted.indexOf(c) >= 0 || st ? 'won' : '' }; });
    } else {
      var oh = S.inHand[1];
      oh.forEach(function (c, i) { P[c] = { x: L.cx - L.cw / 2 + (i - (oh.length - 1) / 2) * L.cw * L.osc * 0.42, y: L.oppY, z: 100 + i, up: false, sc: L.osc, rot: 180 }; });
    }
    // the play: each player's cards in a row in front of them (from an earlier count: dimmed)
    if (!show) [1, 0].forEach(function (p) {
      var mineP = S.pegged.filter(function (x) { return x.p === p; }), y = p === 1 ? L.rowOpp : L.rowYou;
      mineP.forEach(function (x, i) { P[x.c] = { x: L.playX + i * L.pstep, y: y, z: 200 + S.pegged.indexOf(x), up: true, cls: x.r < S.run ? 'dim' : '' }; });
    });
    // your hand
    var yours = S.phase === 'discard' ? S.hands[0] : show ? (cribTime && S.dealer === 0 ? S.crib : S.held[0]) : S.inHand[0];
    if (show && cribTime && S.dealer === 0) cribAt(S.held[0]);
    var row = yours.slice().sort(function (a, b) { return E.rank(a) - E.rank(b) || a - b; }).concat(starterRow === 0 ? [S.starter] : []);
    var n = row.length, w = L.cw + (n - 1) * L.step + (starterRow === 0 ? L.gap * 2 : 0), left = L.cx - w / 2;
    row.forEach(function (c, i) {
      var st = c === S.starter, cls = S.phase === 'discard' ? (sel.indexOf(c) >= 0 ? 'sel ok' : 'ok') : mine ? (ok.indexOf(c) >= 0 ? 'ok' : 'dim') : '';
      if (show && (counted.indexOf(c) >= 0 || st)) cls = 'won';
      P[c] = { x: left + i * L.step + (st ? L.gap * 2 : 0), y: L.handY, z: 300 + i, up: true, cls: cls, rot: st ? 4 : 0 };
    });
    return P;
  }
  // the peg board: two lanes of holes, 0 to 121, a front peg and a back peg each (the back peg shows the last score)
  function board(S, L) {
    var bw = Math.round(L.bw), h = 46, x0 = 92, x1 = bw - 14, span = x1 - x0, out = '';
    function px(v) { return (x0 + span * v / E.GAME).toFixed(1); }
    out += '<svg width="' + bw + '" height="' + h + '" viewBox="0 0 ' + bw + ' ' + h + '" aria-hidden="true">';
    out += '<rect x="0.5" y="0.5" width="' + (bw - 1) + '" height="' + (h - 1) + '" rx="10" fill="#6b4220" stroke="#3d220c"/><rect x="3" y="3" width="' + (bw - 6) + '" height="' + (h - 6) + '" rx="8" fill="none" stroke="rgba(255,220,160,.25)"/>';
    [[1, 15, '#ffd257', OPP], [0, 32, '#5fd4ff', 'You']].forEach(function (lane) {
      var p = lane[0], y = lane[1];
      for (var v = 5; v <= E.GAME; v += 5) out += '<circle cx="' + px(v) + '" cy="' + y + '" r="' + (v % 30 === 0 ? 1.9 : 1.2) + '" fill="rgba(0,0,0,' + (v % 30 === 0 ? 0.6 : 0.4) + ')"/>';
      out += '<text x="10" y="' + (y + 4.5) + '" font-family="Archivo,sans-serif" font-weight="700" font-size="13" fill="' + lane[2] + '">' + lane[3] + ' ' + S.scores[p] + '</text>';
      if (S.back[p] > 0) out += '<circle cx="' + px(S.back[p]) + '" cy="' + y + '" r="4" fill="none" stroke="' + lane[2] + '" stroke-width="2" opacity=".75"/>';
      out += '<circle cx="' + px(S.scores[p]) + '" cy="' + y + '" r="5.5" fill="' + lane[2] + '" stroke="#2a1606" stroke-width="1.5"/>';
    });
    out += '<line x1="' + px(E.GAME) + '" y1="6" x2="' + px(E.GAME) + '" y2="' + (h - 6) + '" stroke="#ffd257" stroke-width="2"/>';
    return out + '</svg>';
  }
  function plates(S, L) {
    var mini = L.tall ? ' mini' : '', out = [];
    var crib = S.dealer === 0 ? 'Your crib' : OPP + '’s crib', dealtag = function (p) { return S.dealer === p ? ' &middot; deals' : ''; };
    out.push({ key: 'p1', x: L.cx, y: Math.round(L.gap + L.ch * L.osc + 4), center: true, html: '<span class="av">S</span><span>' + OPP + dealtag(1) + '<small>' + (S.phase === 'peg' ? S.inHand[1].length + (S.inHand[1].length === 1 ? ' card left' : ' cards left') : 'Score ' + S.scores[1]) + '</small></span>', cls: mini + (S.phase === 'peg' && S.turn === 1 ? ' turn' : '') });
    out.push({ key: 'p0', x: L.gap, y: L.handY - (L.tall ? 38 : 44), html: '<span class="av">Y</span><span>You' + dealtag(0) + '<small>Score <b class="pts">' + S.scores[0] + '</b></small></span>', cls: 'you' + mini + (S.phase === 'peg' && S.turn === 0 ? ' turn' : '') });
    out.push({ key: 'bd', x: L.cx, y: L.boardY, center: true, html: board(S, L), cls: 'board' });
    var showing = S.phase === 'show' || S.phase === 'handEnd' || (S.phase === 'over' && S.counts.length);   // the cards move about in the show
    if (S.crib.length && !showing) out.push({ key: 'cb', x: L.cribX + L.cw / 2, y: L.sideY + L.ch + 6, center: true, html: crib, cls: 'tag' + mini });
    if (S.starter != null && !showing) out.push({ key: 'st', x: L.deckX + L.cw / 2 + 6, y: L.sideY + L.ch + 6, center: true, html: 'Starter', cls: 'tag' + mini });
    if (S.phase === 'peg') {
      // the running count: above the rows on a phone; beside them (clear of the crib) on a wider screen
      if (L.tall) out.push({ key: 'ct', x: L.cx, y: L.rowOpp - 42, center: true, html: 'Count <b>' + S.count + '</b>', cls: 'tag gold count' });
      else out.push({ key: 'ct', x: Math.min(L.playX + L.cw + 3 * L.pstep + L.gap * 2, L.cribX - 130), y: L.midY - 17, html: 'Count <b>' + S.count + '</b>', cls: 'tag gold count' });
      if (S.turn === 0 && E.legal(S, 0).length) out.push({ key: 'yt', x: L.cx, y: L.handY - (L.tall ? 38 : 44), center: true, html: 'Your turn – tap a card', cls: 'tag gold' + mini });
    }
    return out;
  }
  // "fifteen two, fifteen four, and a pair is six ..." - the count of a hand in words, the way it's said at the table
  function sayCount(parts) {
    if (!parts.length) return 'Nineteen! (That means nothing at all &ndash; a hand can&rsquo;t make nineteen.)';
    var run = 0, bits = [], groups = { '15': [], pair: [], run: [], flush: [], nobs: [] };
    parts.forEach(function (x) { groups[x.k].push(x); });
    groups['15'].forEach(function () { run += 2; bits.push('fifteen ' + nm(run)); });
    if (groups.pair.length) { run += groups.pair.length * 2; bits.push((groups.pair.length === 1 ? 'a pair' : groups.pair.length === 3 ? 'three of a kind' : groups.pair.length === 6 ? 'four of a kind' : nm(groups.pair.length) + ' pairs') + ' is ' + nm(run)); }
    if (groups.run.length) { var len = groups.run[0].pts; run += len * groups.run.length; bits.push((groups.run.length === 1 ? 'a run of ' + nm(len) : nm(groups.run.length) + ' runs of ' + nm(len)) + ' is ' + nm(run)); }
    if (groups.flush.length) { run += groups.flush[0].pts; bits.push('a flush is ' + nm(run)); }
    if (groups.nobs.length) { run += 1; bits.push('and one for his nob is ' + nm(run)); }
    var s = bits.join(', ');
    return s.charAt(0).toUpperCase() + s.slice(1) + '.';
  }
  function panel(S, U) {
    if (S.phase === 'discard') {
      var n = (U.crib || []).length, mineCrib = S.dealer === 0;
      return '<h3>Choose two cards for the crib</h3><p>The crib is <b>' + (mineCrib ? 'yours' : OPP + '&rsquo;s') + '</b> this deal &ndash; it&rsquo;s counted for ' + (mineCrib ? 'you' : OPP) + ' at the end, so ' + (mineCrib ? 'give it something good.' : 'give it as little as you can.') + '</p>'
        + '<div class="acts"><button class="btn gold" type="button" data-act="crib"' + (n === 2 ? '' : ' disabled') + '>' + (n === 2 ? 'Put these 2 in the crib' : 'Choose ' + (2 - n) + ' more') + '</button></div>';
    }
    if ((S.phase === 'show' || S.phase === 'handEnd' || S.phase === 'over') && S.shown) {
      var sh = S.shown, title = sh.crib ? (sh.who === 0 ? 'Your crib' : OPP + '&rsquo;s crib') : (sh.who === 0 ? 'Your hand' : OPP + '&rsquo;s hand');
      var html = '<h3>' + title + ': ' + sh.total + '</h3><p>' + sayCount(sh.parts) + '</p>';
      if (S.phase === 'over') return html + '<p class="soft">' + (S.winner === 0 ? 'You reach 121 &ndash; you win!' : OPP + ' reaches 121.') + '</p><div class="acts"><button class="btn gold" type="button" data-act="new">New match</button></div>';
      var next = S.showStep === 1 ? (S.dealer === 0 ? 'Count your hand' : 'Count ' + OPP + '&rsquo;s hand') : S.showStep === 2 ? 'Count the crib' : 'Next deal';
      return html + '<div class="acts"><button class="btn gold" type="button" data-act="' + (S.showStep === 3 ? 'next' : 'count') + '">' + next + '</button></div>';
    }
    if (S.phase === 'over') return '<h3>' + (S.winner === 0 ? 'You win!' : OPP + ' wins') + '</h3><div class="acts"><button class="btn gold" type="button" data-act="new">New match</button></div>';
    return '';
  }

  // ------------------------------------------------------------ tapping
  function tap(S, c, U) {
    if (S.phase === 'discard') {
      if (S.hands[0].indexOf(c) < 0) return null;
      U.crib = U.crib || [];
      var i = U.crib.indexOf(c);
      if (i >= 0) { U.crib.splice(i, 1); return { ui: true, sfx: 'place' }; }
      if (U.crib.length >= 2) return { say: 'You’ve chosen two – tap one of them again to put it back' };
      U.crib.push(c); return { ui: true };
    }
    if (S.phase !== 'peg' || S.inHand[0].indexOf(c) < 0) return null;
    if (S.turn !== 0) return { say: 'Wait for ' + OPP + '’s card' };
    if (E.legal(S, 0).indexOf(c) >= 0) return { m: { t: 'play', c: c } };
    return { say: 'That would take the count past 31 – play a lower card' };
  }
  function press(S, id, U) {
    if (id === 'crib') return (U.crib || []).length === 2 ? { m: { t: 'discard', cards: U.crib.slice() } } : null;
    if (id === 'count') return { m: { t: 'count' } };
    if (id === 'next') return { m: { t: 'next' } };
    if (id === 'new') return { newGame: true };
    return null;
  }
  function wait(S, m) { return m.t === 'count' ? 1100 : m.t === 'go' ? 750 : 900; }
  function pegWords(parts) {
    return parts.map(function (x) {
      return x.k === '15' ? 'fifteen for 2' : x.k === '31' ? 'thirty-one for 2' : x.k === 'pair' ? 'a pair for 2' : x.k === 'three' ? 'three of a kind for 6' : x.k === 'four' ? 'four of a kind for 12' : 'a run of ' + x.n + ' for ' + x.pts;
    }).join(' and ');
  }
  function fx(f, K, S) {
    if (f.t === 'discard') { K.sfx('slide'); setTimeout(function () { K.sfx('flip'); }, 300); if (f.heels) { K.sfx('chime', 2); K.say('The starter is a Jack – his heels: 2 for ' + who(S.dealer)); if (K.stamp) K.stamp('His heels!', { tone: 'gold', small: true, sub: '2 for ' + who(S.dealer) }); } return; }
    if (f.t === 'play') {
      K.sfx('place');
      var w = pegWords(f.parts);
      if (f.pts) { K.sfx('chime', Math.min(3, Math.floor(f.pts / 2))); K.say((f.p === 0 ? 'You: ' : OPP + ': ') + w.charAt(0).toUpperCase() + w.slice(1) + (f.last ? ', and 1 for the last card' : '')); if (f.pts >= 6) K.burst(f.c, true);
        if (K.stamp) {   // the pegging's big moments, stamped (5 Oct 2026)
          var kind = f.parts.map(function (x) { return x.k === 'four' ? 'Double pair royal!' : x.k === 'three' ? 'Pair royal!' : x.k === 'run' && x.n >= 5 ? 'A run of ' + x.n + '!' : x.k === '31' ? 'Thirty-one!' : ''; }).filter(Boolean)[0];
          if (kind) K.stamp(kind, { tone: f.p === 0 ? 'gold' : 'blue', small: kind === 'Thirty-one!', big: f.p === 0 && f.pts >= 12, sub: (f.p === 0 ? 'You peg ' : OPP + ' pegs ') + f.pts });
        }
      }
      else if (f.last) K.say((f.p === 0 ? 'You get' : OPP + ' gets') + ' 1 for the last card');
      return;
    }
    if (f.t === 'go') {
      if (f.reset) { K.sfx('gather'); if (f.pts) K.say('Neither of you can play without going past 31 – ' + (f.to === 0 ? 'you get' : OPP + ' gets') + ' 1 for the last card. The count starts again at 0.'); }   // (plainer, games audit 5 Oct 2026: 'You can’t go – 1 to you' read as a contradiction)
      else K.say(f.p === 0 ? 'You can’t play without going past 31 – “Go”' : OPP + ' says “Go”');
      return;
    }
    if (f.t === 'count') {
      K.sfx(f.total ? 'chime' : 'place', Math.min(3, Math.floor(f.total / 4))); if (f.total >= 12) K.sfx('fanfare');
      if (K.stamp) {   // a big hand stamped on the table; a hand of nothing is "nineteen" (the old joke - you can't score 19)
        var whose = (f.who === 0 ? 'Your ' : OPP + '\u2019s ') + (f.crib ? 'crib' : 'hand');
        if (f.total === 29) K.stamp('A perfect 29!', { tone: 'gold', big: true, sub: whose });
        else if (f.total >= 12) K.stamp(f.total + ' points!', { tone: f.who === 0 ? 'gold' : 'blue', big: f.who === 0 && f.total >= 16, small: f.total < 16, sub: whose });
        else if (f.total === 0 && f.who === 0 && !f.crib) K.stamp('Nineteen!', { tone: 'dark', small: true, sub: 'A hand worth nothing' });
      }
    }
  }
  function result(S) {
    var won = S.winner === 0, lose = S.scores[1 - S.winner], badges = [];
    if (lose < 61) badges.push(won ? 'A double skunk! ' + OPP + ' didn’t reach 61' : 'Double skunked – you didn’t reach 61');
    else if (lose < 91) badges.push(won ? 'A skunk! ' + OPP + ' didn’t reach 91' : 'Skunked – you didn’t reach 91');
    if (S.best[0] >= 12) badges.push('Your best hand this match: ' + S.best[0]);
    return {
      won: won, score: S.scores[0],
      title: won ? 'You won!' : OPP + ' won this one',
      sub: 'Cribbage · ' + E.LV[S.lv] + ' · first to 121',
      tiles: [[S.scores[0], 'Your score'], [S.scores[1], OPP + '’s score'], [S.best[0], 'Your best hand']],
      badges: badges,
      best: [{ k: 'hand', v: S.best[0], say: 'Your best hand yet: ' + S.best[0] + '!' }],
      share: won ? 'I beat the computer at 365 Cribbage, ' + S.scores[0] + ' to ' + S.scores[1] : 'I just played 365 Cribbage'
    };
  }
  function chips(S) { return [['You', S.scores[0]], [OPP, S.scores[1]], ['Deal', S.hand + 1]]; }
  function dealOrder(S) { var o = []; for (var i = 0; i < 6; i++) { o.push(S.hands[1 - S.dealer][i]); o.push(S.hands[S.dealer][i]); } return o; }
  var HW = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'], HS = ['spades', 'hearts', 'diamonds', 'clubs'];
  function hname(c) { return HW[(c % 13) + 1] + ' of ' + HS[(c / 13) | 0]; }   // (for the Hint's reasons)
  // the Hint says why (games audit, 5 Oct 2026)
  function hintShow(S, m) {
    if (m.t === 'discard') return { cards: m.cards, say: S.dealer === 0 ? 'Put these two in your crib – they keep the best four for your hand, and the crib is yours too' : 'Give these two to ' + OPP + '’s crib – they keep your best four and give the crib the least' };
    var c = m.c, n = S.count + E.val(c), pts = E.pegPoints(S.seq.concat([c]), n).reduce(function (a, x) { return a + x.pts; }, 0), say;
    if (pts) say = 'Play the ' + hname(c) + ' – it scores ' + pts + (pts === 1 ? ' point' : ' points') + (n === 15 ? ' for fifteen' : n === 31 ? ' for 31' : '');
    else if (n === 5 || n === 21) say = 'Play the ' + hname(c) + ' – the safest card you have just now';
    else say = 'Play the ' + hname(c) + ' – it keeps the count at ' + n + ', hard for ' + OPP + ' to score from';
    return { cards: [c], say: say };
  }

  // The Journey (5 Oct 2026): a level is ONE HAND on a set deal with three targets, one per star - the levels are in
  // journey.js (made, and every target proved reachable, by tools/journeys/make-rival-journeys.cjs). r = this hand's result.
  function aimUp(v, t) { return v < t[0] ? '\u2605 ' + t[0] : v < t[1] ? '\u2605\u2605 ' + t[1] : v < t[2] ? '\u2605\u2605\u2605 ' + t[2] : '\u2605\u2605\u2605 \u2713'; }
  var JR = {
    result: function (S) { return { v: S.scores[0], o: S.scores[1] }; },
    got: function (l, r) { return l.t.map(function (t) { return r.v >= t; }); },
    goals: function (l) { return l.t.map(function (t) { return 'Score ' + t + ' points this deal'; }); },
    better: function (r, b) { return r.v > b.v; },
    bestText: function (b) { return b.v + ' points'; },
    sayResult: function (r) { return 'You scored ' + r.v + (r.v === 1 ? ' point' : ' points') + ' this deal (' + OPP + ' ' + r.o + ').'; },
    chips: function (S, l) { return [['Goal', aimUp(S.scores[0], l.t)], ['You', S.scores[0]]]; }
  };

  Rivals365.start({
    id: 'cribbage', store: 'cr365', title: 'Cribbage', cards: 52, E: E,
    journey: window.CR_JOURNEY || null, jr: JR,   // the Journey: 100 levels, one hand each (5 Oct 2026)
    hof: true, hofWhat: { today: 'Biggest winning margin first: 121 against Sam&rsquo;s score.', alltime: 'The biggest winning margins ever.', town: 'Biggest winning margin first: 121 against Sam&rsquo;s score.' },   // the Hall of Fame: Today's match (5 Oct 2026)
    face: function (c) { return { r: E.rank(c), s: E.suit(c) }; },
    levels: {
      options: [[1, 'Easy'], [3, 'Normal'], [5, 'Hard'], [7, 'Expert']], def: 3,
      info: function (lv) { return { 1: 'A relaxed player who misses things · Hint on', 3: 'A steady, sensible player · Hint on', 5: 'Thinks through every card that could turn up, plays safely · no Hint', 7: 'And thinks about your reply to every card · no Hint' }[lv]; },
      hint: function (lv) { return lv <= 3; }
    },
    layout: layout, positions: positions, plates: plates, panel: panel, tap: tap, press: press, wait: wait, fx: fx,
    commits: function (S) { return S.phase === 'peg'; },   // a tap plays the card for good (rivals.js lifts it first on a phone)
    over: function (S) { return S.phase === 'over'; }, result: result, chips: chips, dealOrder: dealOrder, hintShow: hintShow,
    newHand: function (S, U) { U.crib = []; },
    bestTiles: [{ k: 'hand', label: 'Best hand' }],
    help: [
      '<b>First to 121</b> wins. Your score and ' + OPP + '&rsquo;s are pegged on the board at the top.',
      '<b>The crib:</b> you get six cards &ndash; tap two to put in the crib, then press the button. The crib belongs to whoever dealt, and is counted for them at the end.',
      '<b>The starter</b> is turned up on the deck. If it&rsquo;s a Jack, the dealer pegs 2 (&ldquo;his heels&rdquo;).',
      '<b>The play:</b> take turns playing a card, adding up the count, which can&rsquo;t go past 31. Make the count 15 or 31 for 2, pair the last card for 2 (three of a kind 6), or make a run of three or more. If you can&rsquo;t play, it&rsquo;s a &ldquo;Go&rdquo; &ndash; the last to play scores 1 &ndash; and the count starts again. The last card of all scores 1.',
      '<b>The show:</b> each hand is counted with the starter &ndash; every 15 is 2, every pair 2, runs their length, four of a suit 4 (5 with the starter), and the Jack of the starter&rsquo;s suit 1 (&ldquo;his nob&rdquo;). It&rsquo;s counted for you, aloud: &ldquo;fifteen two, fifteen four&hellip;&rdquo;.',
      '<b>Levels</b> (New game) are how good ' + OPP + ' is; Easy and Normal have a Hint. ' + OPP + ' deals first, so you play first.'
    ]
  });
})();
