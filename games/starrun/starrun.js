/* 365 Star Run - the screen and the sounds (rebuilt 27 Oct 2026 for the chapter game; reworked the same evening). The
 * picture is 3D, from sr3d.js (three.js); on top of it this draws the panel in our own vector letters, with a dark edge so it
 * reads over a bright desert: score, chapter, progress (gates and checkpoints; the warship's generators, bridge and your
 * carrier), a radar in free flight, shields, ships, rockets and the boost gauge, the cursor (gold and boxing the target when
 * you are on it), lock-on diamonds, missile warnings, markers and edge arrows for objectives, banners, the cinematic briefing
 * and the tally. Your own keys: W boost, S brake, Q / E roll, R flip (taken before the cabinet sees them). A CONTROLLER (the
 * browser's standard mapping - an Xbox pad): left stick steers, RT fires, LT locks rockets, A boost, B brake, Y flip, X / LB / RB
 * roll, Menu pauses - with rumble. In free flight a click takes the mouse (pointer lock) for mouse-aim; Esc lets go and pauses.
 * Whichever you touched last - mouse or controller - steers (input.ctrl). Medals are kept in this
 * browser (sr365c:medals): they set your rank and unlock paint schemes. A PC without WebGL gets a message instead.
 * The makeover (27 Oct, late): Harbourlight Control's radio captions; a red wedge towards whatever hit you, and what it was; hit
 * marks round the sight; a thicker boost gauge, no label under size 5; small banners kept off the fight; GEN 1-4 arrows with
 * distances; the lock-on taught once; A never fires; mouse speed in Settings; the tally says what gold needs.
 * 28 Oct: the controller smoothed (round dead zone, a gentle curve, a little smoothing; Smooth / Quick setting), and each frame drawn
 * part-way between the last two steps, so a 120 Hz screen no longer judders. */
(function () {
  'use strict';
  var E = window.SREngine, A = window.Arcade365;
  var GW = E.GW, GH = E.GH, CX = E.CX, CY = E.CY, FOCAL = E.FOCAL, NEAR = E.NEAR;
  var reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var C = {
    hud: '#33eeff', val: '#ffffff', gold: '#ffd633', warn: '#ff3b3b', good: '#22ff55', cursor: '#33eeff', lock: '#ffd633', dash: '#3366ff',
    card: '#33eeff', foe: '#ff4a3a', canyon: '#ffa040', white: '#ffffff', silver: '#d8e0ea', bronze: '#e09050', gen: '#7dffc8'
  };

  // ------------------------------------------------------------ colour helpers: a hot centre and dimmer copies of each colour
  var CORE = {}, DIM = {};
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function toHex(r, g, b) { return '#' + [r, g, b].map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function core(c) { if (!CORE[c]) { var h = hex(c); CORE[c] = toHex(h[0] + (255 - h[0]) * 0.7, h[1] + (255 - h[1]) * 0.7, h[2] + (255 - h[2]) * 0.7); } return CORE[c]; }
  function dim(c, k) { k = k || 0.45; var key = c + k; if (!DIM[key]) { var h = hex(c); DIM[key] = toHex(h[0] * k, h[1] * k, h[2] * k); } return DIM[key]; }

  // ------------------------------------------------------------ the line batches: a dark edge, the line, a hot centre
  var B = {}, ORDER = [], V1 = [0, 0, 0], XO = 0;   // XO: how far right to draw (a wide screen: its middle 4:3 is the game's own 400 x 300)
  function S(c) { var a = B[c]; if (!a) { a = B[c] = []; ORDER.push(c); } return a; }
  function seg(c, x1, y1, x2, y2) { S(c).push(x1 + XO, y1, x2 + XO, y2); }
  function poly(c, pts, closed) { for (var i = 0; i + 1 < pts.length; i++) seg(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); if (closed) seg(c, pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1]); }
  function circ(c, x, y, rx, ry, n) { n = n || 32; for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2; seg(c, x + Math.cos(a) * rx, y + Math.sin(a) * ry, x + Math.cos(b) * rx, y + Math.sin(b) * ry); } }
  function flush(g, later) {   // later: the letters are stamped afterwards, on the main canvas at the screen's full sharpness (stampAll)
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (!later) scaleTo(g);
    var paths = [];
    for (var i = 0; i < ORDER.length; i++) {
      var a = B[ORDER[i]]; if (!a.length) { paths.push(null); continue; }
      var p = new Path2D(); for (var j = 0; j < a.length; j += 4) { if (!(j && a[j] === a[j - 2] && a[j + 1] === a[j - 1])) p.moveTo(a[j], a[j + 1]); p.lineTo(a[j + 2], a[j + 3]); }   // (29 Oct: one line through a letter's joined strokes, not a cap at every piece - far quicker at 4K)
      paths.push(p); a.length = 0;
    }
    g.globalCompositeOperation = 'source-over'; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 2.9;   // a dark edge, so the letters read over sand and sky
    paths.forEach(function (p) { if (p) g.stroke(p); });
    if (!later) stamps(g, 0);   // (the letters' dark edges, with the lines')
    g.lineWidth = 1.15; paths.forEach(function (p, i) { if (p) { g.strokeStyle = ORDER[i]; g.stroke(p); } });
    if (!later) stamps(g, 1);   // (the letters themselves)
    g.globalCompositeOperation = 'lighter'; g.lineWidth = 0.42; g.globalAlpha = 0.55;
    paths.forEach(function (p, i) { if (p) { g.strokeStyle = core(ORDER[i]); g.stroke(p); } });
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (!later) GL.q.length = 0;
  }
  function scaleTo(g) { var S = g.getTransform().a; if (Math.abs(S - GL.s) > 0.01) { GL.s = S; GL.cache = {}; } }   // (the letters' stamps are made at the scale they are drawn at)
  function stampAll(g) { scaleTo(g); stamps(g, 0); stamps(g, 1); GL.q.length = 0; }
  // (29 Oct) the letters: each one drawn once - in its colour, at its size, at the panel's scale, with the same dark edge, line and hot centre as the
  // strokes - then stamped wherever it is wanted. At 4K, stroking every letter three times a frame was most of the panel's cost.
  var GL = { s: 0, cache: {}, q: [] }, PADU = 1.7;
  function glyph(c, ch, size, layer) {
    var key = layer + c + ch + size, im = GL.cache[key]; if (im) return im;
    var S = GL.s, k = size / 6, cv = document.createElement('canvas'), x = cv.getContext('2d'), gl = FONT[ch], p = new Path2D();
    cv.width = Math.ceil((4 * k + 2 * PADU) * S); cv.height = Math.ceil((6 * k + 2 * PADU) * S);
    for (var j = 0; j < gl.length; j++) { var st = gl[j]; p.moveTo(PADU + st[0] * k, PADU + st[1] * k); for (var m = 2; m < st.length; m += 2) p.lineTo(PADU + st[m] * k, PADU + st[m + 1] * k); }
    x.setTransform(S, 0, 0, S, 0, 0); x.lineCap = 'round'; x.lineJoin = 'round';
    if (!layer) { x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 2.9; x.stroke(p); }
    else { x.strokeStyle = c; x.lineWidth = 1.15; x.stroke(p); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.55; x.strokeStyle = core(c); x.lineWidth = 0.42; x.stroke(p); }
    return (GL.cache[key] = cv);
  }
  function stamps(g, layer) {
    if (!GL.q.length) return;
    var S = GL.s, sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true;
    for (var i = 0; i < GL.q.length; i++) {
      var q = GL.q[i], im = glyph(q.c, q.ch, q.size, layer);
      g.drawImage(im, Math.round((q.x - PADU) * S) / S, Math.round((q.y - PADU) * S) / S, im.width / S, im.height / S);   // (on whole pixels: crisp)
    }
    g.imageSmoothingEnabled = sm;
  }

  // ------------------------------------------------------------ our vector letters: strokes on a 4 x 6 grid
  var FONT_SRC = {
    A: ['06 02 20 42 46', '04 44'], B: ['06 00 30 41 42 33 03', '33 44 45 36 06'], C: ['41 30 10 01 05 16 36 45'], D: ['00 30 41 45 36 06 00'],
    E: ['40 00 06 46', '03 33'], F: ['40 00 06', '03 33'], G: ['41 30 10 01 05 16 36 45 43 23'], H: ['00 06', '40 46', '03 43'],
    I: ['10 30', '20 26', '16 36'], J: ['40 45 36 16 05'], K: ['00 06', '40 03 46', '13 46'], L: ['00 06 46'], M: ['06 00 23 40 46'],
    N: ['06 00 46 40'], O: ['10 30 41 45 36 16 05 01 10'], P: ['06 00 30 41 42 33 03'], Q: ['10 30 41 45 36 16 05 01 10', '24 46'],
    R: ['06 00 30 41 42 33 03', '23 46'], S: ['41 30 10 01 02 13 33 44 45 36 16 05'], T: ['00 40', '20 26'], U: ['00 05 16 36 45 40'],
    V: ['00 26 40'], W: ['00 16 23 36 40'], X: ['00 46', '40 06'], Y: ['00 23 40', '23 26'], Z: ['00 40 06 46'],
    0: ['10 30 41 45 36 16 05 01 10', '14 32'], 1: ['11 20 26', '16 36'], 2: ['01 10 30 41 42 06 46'], 3: ['01 10 30 41 42 33 13', '33 44 45 36 16 05'],
    4: ['36 30 04 44'], 5: ['40 00 02 32 43 45 36 06'], 6: ['30 10 01 05 16 36 45 43 32 03'], 7: ['00 40 41 26'],
    8: ['10 30 41 42 33 13 02 01 10', '13 04 05 16 36 45 44 33'], 9: ['43 13 02 01 10 30 41 45 36 16'],
    '-': ['03 43'], '+': ['03 43', '21 25'], '.': ['25 26'], ',': ['25 16'], '!': ['20 24', '25 26'], '?': ['01 10 30 41 42 23 24', '25 26'],
    ':': ['21 22', '24 25'], '/': ['06 40'], "'": ['20 21'], '%': ['06 40', '00 11', '35 46'], '&': ['46 02 01 10 20 31 32 05 06 36 44'], '>': ['00 43 06'], '<': ['40 03 46']
  };
  var FONT = {};
  Object.keys(FONT_SRC).forEach(function (k) { FONT[k] = FONT_SRC[k].map(function (s) { var o = []; s.split(' ').forEach(function (p) { o.push(+p.charAt(0), +p.charAt(1)); }); return o; }); });
  function txtW(s, size) { return String(s).length * size - size / 3; }
  function txt(c, s, x, y, size, align) {   // y = the top of the letters, size = how tall they are
    s = String(s).toUpperCase();
    var k = size / 6, w = txtW(s, size);
    if (align === 'c') x -= w / 2; else if (align === 'r') x -= w;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (FONT[ch]) GL.q.push({ c: c, ch: ch, size: size, x: x + XO, y: y });   // (stamped in flush)
      x += size;
    }
  }
  var num = E.num;

  // ------------------------------------------------------------ the screen's own effects: floating points, flashes, the chain
  var PS = null, lastW = null, lastT = -1, lastPh = '', prevPh = '';
  function reset() { PS = { flt: [], flash: null, chain: null, hm: null }; }
  reset();
  function spawn(W, e) {
    switch (e.k) {
      case 'pts': var p = E.project(W, e.x, e.y, e.z); if (p) PS.flt.push({ x: p.x, y: p.y - 10, s: num(e.v), life: 55 }); break;
      case 'note': var pn = E.project(W, e.x, e.y, e.z), ny = pn ? Math.max(60, Math.min(200, pn.y - 14)) : 150, nx = pn ? Math.max(50, Math.min(GW - 50, pn.x)) : CX;
        PS.flt.forEach(function (f) { if (f.life > 40 && Math.abs(f.y - ny) < 9 && Math.abs(f.x - nx) < 90) ny = f.y + 9; });   // (two at once: one under the other)
        PS.flt.push({ x: nx, y: ny, s: e.text, life: 70, c: C.good }); break;
      case 'hitmark': PS.hm = { x: e.sx, y: e.sy, t: e.kill ? 12 : 8, max: e.kill ? 12 : 8, kill: e.kill, big: e.big }; break;   // ticks round the sight: you hit it
      case 'chain': PS.chain = { m: e.m, life: 70 }; break;
      case 'hit': PS.flash = { c: '255,40,40', t: 20, max: 20, peak: 0.35, att: 4 }; break;
      case 'shieldup': PS.flash = PS.flash || { c: '80,255,150', t: 10, max: 10 }; break;
      case 'crash': case 'scrape': PS.flash = { c: '255,170,90', t: 12, max: 12 }; break;
      case 'rocketboom': PS.flash = PS.flash || { c: '255,240,200', t: 6, max: 6 }; break;
      case 'lost': PS.flash = { c: '255,255,255', t: 22, max: 22, sq: true }; break;
      case 'gatemiss': PS.flash = { c: '255,60,40', t: 8, max: 8 }; break;
      case 'sonic': PS.flash = { c: '235,245,255', t: 12, max: 12, peak: 0.3 }; break;
      case 'sonicpts': PS.sonic = { v: e.v, life: 40 }; break;
    }
  }
  function advance(n) {
    for (var s = 0; s < n; s++) {
      for (var i = PS.flt.length - 1; i >= 0; i--) { PS.flt[i].y -= 0.35; if (--PS.flt[i].life <= 0) PS.flt.splice(i, 1); }
      if (PS.flash && --PS.flash.t <= 0) PS.flash = null;
      if (PS.chain && --PS.chain.life <= 0) PS.chain = null;
      if (PS.hm && --PS.hm.t <= 0) PS.hm = null;
      if (PS.sonic && --PS.sonic.life <= 0) PS.sonic = null;
    }
  }

  // ------------------------------------------------------------ the panel
  function card(x0, y0, x1, y1, c) {
    var k = 8;
    poly(c, [[x0 + k, y0], [x1 - k, y0], [x1, y0 + k], [x1, y1 - k], [x1 - k, y1], [x0 + k, y1], [x0, y1 - k], [x0, y0 + k]], true);
    poly(dim(c, 0.45), [[x0 + k + 3, y0 + 3], [x1 - k - 3, y0 + 3], [x1 - 3, y0 + k + 3], [x1 - 3, y1 - k - 3], [x1 - k - 3, y1 - 3], [x0 + k + 3, y1 - 3], [x0 + 3, y1 - k - 3], [x0 + 3, y0 + k + 3]], true);
  }
  function blackPanel(g, x0, y0, x1, y1, a) { g.fillStyle = 'rgba(0,0,0,' + (a == null ? 0.72 : a) + ')'; g.fillRect(x0 + XO, y0, x1 - x0, y1 - y0); }
  function fullBar(g, y0, y1, a) { g.fillStyle = 'rgba(0,0,0,' + (a == null ? 1 : a) + ')'; g.fillRect(0, y0, WIDE.gw, y1 - y0); }   // (right across a wide screen)
  function brackets(c, x, y, s) { [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) { var px = x + q[0] * s, py = y + q[1] * s; seg(c, px, py, px - q[0] * 4, py); seg(c, px, py, px, py - q[1] * 4); }); }
  function hudTop(W, info) {
    var ch = E.CHAPTERS[W.chap];
    XO = 0;   // (the top left corner)
    txt(C.hud, 'SCORE', 10, 8, 5); txt(C.val, num(W.score), 10, 17, 9);
    if (info && info.best > W.score) txt(dim(C.hud, 0.75), 'BEST ' + num(info.best), 10, 31, 4);
    if (W.mult > 1) { var big = PS.chain && PS.chain.life > 40; txt(C.gold, 'CHAIN X' + W.mult, 10, 39, big ? 8 : 6); seg(dim(C.gold, 0.7), 10, big ? 50 : 47, 10 + 50 * W.chainT / 150, big ? 50 : 47); }
    XO = 2 * WIDE.ox;   // (the top right corner)
    if (W.phase !== 'play' || W.phaseT < 240) { txt(C.hud, 'CHAPTER ' + ch.n, GW - 10, 8, 5, 'r'); txt(C.val, ch.name, GW - 10, 17, 6, 'r'); }   // (v20: then the corner is clear for the fight)
    XO = WIDE.ox;
    var x0 = 145, x1 = 255, i;
    if (W.ascending) {   // the climb to space: how high you are
      var al = Math.max(0, Math.round(W.alt * 6));
      txt(C.hud, 'ALTITUDE', CX, 7, 4.5, 'c'); txt(C.val, num(al) + ' M', CX, 15, 7, 'c');
      seg(dim(C.hud, 0.5), 372, 240, 372, 80); seg(C.hud, 372, 240, 372, 240 - 160 * Math.min(1, W.alt / 1900)); seg(C.hud, 373.2, 240, 373.2, 240 - 160 * Math.min(1, W.alt / 1900));
      txt(dim(C.hud, 0.8), 'SPACE', 372, 72, 3.6, 'c');
    } else if (ch.id === 'valley' || ch.id === 'shoals') {   // how far down the valley (or through the Shoals), with the checkpoints marked
      var f = Math.max(0, Math.min(1, W.s / W.rail.len));
      var gk = W.ms.gates + '/' + W.ms.gatesAll + ' ' + W.ms.turrets + '/' + W.ms.turretsAll; if (gk !== PS.gk) { PS.gk = gk; PS.gkT = W.t; }
      if (W.t - PS.gkT < 180 || W.phase !== 'play') { txt(C.canyon, 'GATES ' + W.ms.gates + '/' + W.ms.gatesAll, CX - 6, 7, 4.5, 'r'); txt(C.foe, 'GUNS ' + W.ms.turrets + '/' + W.ms.turretsAll, CX + 6, 7, 4.5); }   // (the guns: shoot them all for a bonus; v20: shown for 3 s when one changes)
      seg(dim(C.canyon, 0.6), x0, 18, x1, 18);
      W.checkpoints.forEach(function (q, j) { if (j) { var x = x0 + (x1 - x0) * q / W.rail.len; seg(q <= W.checkpoint ? C.good : dim(C.canyon, 0.8), x, 15, x, 21); } });
      seg(C.canyon, x0, 18, x0 + (x1 - x0) * f, 18); seg(C.white, x0 + (x1 - x0) * f, 14, x0 + (x1 - x0) * f, 22);
      var MS = W.mill;
      if (MS && MS.st === 'fight') {   // (chapter 3) the Millstone's strength, and which beat it is in
        var mh = 0, mm = 0; MS.parts.forEach(function (q) { mm += q.max; mh += q.alive ? q.hp : 0; });
        txt(C.warn, 'THE MILLSTONE  -  ' + (MS.beat === 1 ? 'TRACTOR ARMS' : MS.beat === 2 ? 'CUTTER' : 'REACTOR'), CX, 25, 5, 'c');
        seg(dim(C.warn, 0.45), 120, 35, 280, 35); for (var mb = 0; mb < 3; mb++) seg(C.warn, 120, 34 + mb, 120 + 160 * mh / mm, 34 + mb);
      }
      if (W.outrun) {   // (chapter 3) its blast, behind you
        var gap = Math.max(0, Math.round(W.s - W.outrun.front)), gk = Math.min(1, gap / 900), bc = gap < 250 && (W.t >> 2) % 2 ? C.white : C.warn;
        txt(bc, W.outrun.caught ? 'CAUGHT IN THE BLAST' : 'BLAST ' + gap + ' M BEHIND  -  FULL THRUST', CX, 25, 6, 'c');
        seg(dim(C.warn, 0.45), 120, 37, 280, 37); for (var ob = 0; ob < 3; ob++) seg(bc, 120, 36 + ob, 120 + 160 * gk, 36 + ob);
      }
      if (W.warden && W.warden.st !== 'arrive' && W.warden.st !== 'beaten') {   // the Gaoler's strength, and which beat of the fight it is in
        var hp = 0, mx = 0, G = W.warden; G.parts.forEach(function (q) { mx += q.max; hp += q.alive ? q.hp : 0; });
        txt(C.warn, 'THE GAOLER  -  ' + (G.beat === 1 ? 'GUN PODS' : G.beat === 2 ? 'ENGINES' : 'CORE'), CX, 25, 5, 'c');
        seg(dim(C.warn, 0.45), 120, 35, 280, 35); for (var hb = 0; hb < 3; hb++) seg(C.warn, 120, 34 + hb, 120 + 160 * hp / mx, 34 + hb);
      }
    } else {
      var br = null, gun = null; W.objs.forEach(function (o) { if (o.k === 'bridge' && o.alive) br = o; if (o.k === 'gun' && o.alive) gun = o; });
      if (W.gensLeft > 0) {   // her shield generators: a box for each, filled when it is down
        txt(C.gen, 'SHIELD GENERATORS ' + (4 - W.gensLeft) + ' OF 4', CX, 6, 5, 'c');
        for (i = 0; i < 4; i++) { var bx = CX - 34 + i * 18; poly(C.gen, [[bx, 14], [bx + 12, 14], [bx + 12, 20], [bx, 20]], true); if (i < 4 - W.gensLeft) { seg(C.gen, bx + 2, 16, bx + 10, 16); seg(C.gen, bx + 2, 18, bx + 10, 18); } }
      } else if (br) { txt(C.warn, 'THE BRIDGE', CX, 6, 5, 'c'); for (var hb2 = 0; hb2 < 3; hb2++) seg(C.warn, x0, 16 + hb2, x0 + (x1 - x0) * br.hp / br.max, 16 + hb2); }
      if (W.carrier && !W.esc) {   // your carrier, Harbourlight - and, first of all, the main gun that is shelling her (not in the finale)
        var Cr = W.carrier, ch2 = Cr.hp, cc = Cr.lost ? C.warn : ch2 > 60 ? C.good : ch2 > 30 ? C.gold : C.warn, fl = Cr.hitT > 0 && (W.t >> 3) % 2;
        txt(fl ? C.warn : cc, Cr.lost ? 'HARBOURLIGHT HAS PULLED BACK' : gun ? 'FIRST: SILENCE THE MAIN GUN  -  HARBOURLIGHT ' + ch2 + '%' : 'HARBOURLIGHT ' + ch2 + '%', CX, 25, 5, 'c');
      }
      if (!W.esc) radar(W);
    }
  }
  function radar(W) {   // free flight: what is round you, seen from above, the way you are heading at the top
    XO = 2 * WIDE.ox;   // (in the top right corner)
    var cx = 371, cy = 56, R = 24, S = W.ship, cs = Math.cos(S.yaw), sn = Math.sin(S.yaw), k = R / 1700;
    circ(dim(C.hud, 0.55), cx, cy, R, R, 30); circ(dim(C.hud, 0.25), cx, cy, R / 2, R / 2, 20);
    function pt(x, z) { var dx = x - S.x, dz = z - S.z, rx = (dx * cs - dz * sn) * k, fz = (dx * sn + dz * cs) * k, d = Math.sqrt(rx * rx + fz * fz); if (d > R) { rx *= R / d; fz *= R / d; } return [cx + rx, cy - fz]; }
    var hull = [[-70, -540], [70, -540], [70, 540], [-70, 540]].map(function (q) { return pt(q[0], q[1]); }); poly(dim(C.foe, 0.6), hull, true);
    W.objs.forEach(function (o) {
      if (!o.alive || o.wait > 0) return;
      var col = o.k === 'gen' ? C.gen : o.k === 'bridge' ? C.white : o.k === 'gun' ? C.canyon : o.k === 'dart' || o.k === 'heavy' ? C.foe : null;
      if (!col) return; var p = pt(o.x, o.z), z = o.k === 'dart' || o.k === 'heavy' ? 1.2 : 1.8;
      seg(col, p[0] - z, p[1], p[0] + z, p[1]); seg(col, p[0], p[1] - z, p[0], p[1] + z);
    });
    W.eshots.forEach(function (b) { if (b.k === 'missile' && b.alive && (W.t >> 2) % 2) { var p = pt(b.x, b.z); seg(C.warn, p[0] - 1, p[1], p[0] + 1, p[1]); } });
    poly(C.val, [[cx, cy - 3], [cx + 2.2, cy + 2.5], [cx - 2.2, cy + 2.5]], true);
    XO = WIDE.ox;
  }
  function hudBottom(W) {
    var sh_ = Math.max(0, W.shields), mx = W.sp.shields, i;
    var gx0 = 132, gx1 = 268, gy0 = 262, gy1 = 284;   // the shield gauge
    poly(C.dash, [[gx0, gy0], [gx1, gy0], [gx1 - 8, gy1], [gx0 + 8, gy1]], true);
    var pw = (gx1 - gx0 - 20) / mx, col = sh_ <= 2 ? C.warn : sh_ <= mx / 3 ? C.gold : C.good, blink = sh_ <= 1 && (W.t >> 3) % 2;
    for (i = 0; i < mx; i++) {
      var x0 = gx0 + 10 + i * pw + 1, x1 = x0 + pw - 2.6, y0 = gy0 + 4, y1 = gy1 - 4;
      if (i < sh_) { if (!blink) for (var hx = x0; hx <= x1 + 0.01; hx += (x1 - x0) / 3) seg(col, hx, y0, hx - 1.5, y1); }
      else seg(dim(C.dash, 0.5), x0, y1, x1, y1);
    }
    txt(sh_ <= 2 ? C.warn : C.hud, 'SHIELD ' + sh_, CX, 252, 5, 'c');
    // your SPEED (28 Oct, v18: the throttle never runs out now): the bar fills with it, the gold tick is the speed of sound; miles an hour beside it
    var bx0 = gx0 + 8, bx1 = gx1 - 8, top = 1 + E.THRUST, sk = Math.max(0, Math.min(1, (W.v || 0) / (W.pace || 3) / top)), gl = bx0 + (bx1 - bx0) * sk, mx = bx0 + (bx1 - bx0) * E.MACH1 / top;
    var gc = W.braking ? C.white : W.sonic ? C.gold : W.boosting ? C.val : C.hud;
    poly(dim(C.dash, 0.6), [[gx0 + 7, 288.4], [gx1 - 7, 288.4], [gx1 - 7, 293.6], [gx0 + 7, 293.6]], true);   // (four units thick: easy to read at a glance)
    for (var gy = 289.4; gy < 293; gy += 1.1) seg(gc, bx0, gy, gl, gy);
    seg(W.sonic ? C.gold : dim(C.gold, 0.7), mx, 286.5, mx, 295.5);
    txt(gc, W.braking ? 'BRAKE' : W.sonic ? 'MACH ' + (W.mach || 0).toFixed(1) : 'THRUST', gx0 + 3, 288.5, 5, 'r');
    txt(gc, Math.round((W.v || 0) * 134.2) + ' MPH', gx1 - 3, 288.5, 5);   // (a game unit is about a metre, 60 steps a second)
    if (PS.sonic) txt(C.gold, '+' + num(PS.sonic.v) + ' SUPERSONIC', gx1 - 3, 280 - (40 - PS.sonic.life) * 0.15, 4.5);
    if (W.mode === 'free') { seg(dim(C.dash, 0.6), bx0, 296.5, bx1, 296.5); seg(W.gauge >= 0.3 ? C.gold : dim(C.gold, 0.5), bx0, 296.5, bx0 + (bx1 - bx0) * W.gauge, 296.5); txt(W.flipT ? C.gold : dim(C.gold, 0.8), 'FLIP', gx0 + 3, 295, 4, 'r'); }   // (the thruster flip's own gauge)
    XO = 0;   // (the bottom left corner)
    txt(C.hud, 'SHIPS', 12, 266, 4.5);   // your ships left
    for (i = 0; i < Math.min(6, W.lives); i++) { var sx = 16 + i * 14, sy = 281; poly(C.val, [[sx, sy - 6], [sx + 5, sy + 3], [sx + 1.5, sy + 1.5], [sx, sy + 4], [sx - 1.5, sy + 1.5], [sx - 5, sy + 3]], true); }
    XO = 2 * WIDE.ox;   // (the bottom right corner)
    txt(W.bombs ? C.hud : dim(C.hud, 0.5), 'BOMBS', 300, 252, 4.5);   // shock bombs (B)
    for (i = 0; i < W.sp.bombs; i++) circ(i < W.bombs ? '#bfefff' : dim(C.dash, 0.5), 333 + i * 8, 254.5, 2.6, 2.6, 10);
    txt(W.rk ? C.hud : dim(C.hud, 0.5), 'ROCKETS', 300, 266, 4.5);
    for (i = 0; i < W.sp.rockets; i++) { var rx = 302 + i * 9; poly(i < W.rk ? C.gold : dim(C.dash, 0.5), [[rx, 284], [rx, 276], [rx + 2, 273], [rx + 4, 276], [rx + 4, 284]], true); }
    XO = WIDE.ox;
  }
  function cursor(W) {
    var a = W.aim, on = E.pick(W, a.x, a.y), au = W.autoT && W.autoT.alive ? W.autoT : null, col = on || au ? C.lock : C.cursor, r = on ? 7 + Math.sin(W.t * 0.4) : 9;
    // flying one way, aiming another: a small marker where your ship is heading (the helm in the valley, the nose in free flight)
    var hx = W.mode === 'rail' ? W.helm.x : a.x - W.aimOff.x, hy = W.mode === 'rail' ? W.helm.y : a.y - W.aimOff.y;
    if (Math.abs(hx - a.x) + Math.abs(hy - a.y) > 14) { var hc = dim(C.cursor, 0.7); poly(hc, [[hx, hy - 4], [hx + 4, hy], [hx, hy + 4], [hx - 4, hy]], true); seg(dim(C.cursor, 0.35), hx, hy, a.x, a.y); }
    [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(function (q) { var x = a.x + q[0] * r, y = a.y + q[1] * r, px = -q[1], py = q[0]; poly(col, [[x + q[0] * 4 + px * 3, y + q[1] * 4 + py * 3], [x, y], [x + q[0] * 4 - px * 3, y + q[1] * 4 - py * 3]], false); });
    seg(col, a.x - 0.8, a.y, a.x + 0.8, a.y);
    if (on) { var p = E.project(W, on.x, on.y, on.z); if (p) brackets(dim(C.lock, 0.85), p.x, p.y, Math.max(7, on.r * W.focal / p.z + 3)); }
    if (au && au !== on) {   // auto-aim's lock: gold corners and a pip on what your lasers will go for, and a faint line back to the crosshair
      var q = E.project(W, au.x, au.y, au.z);
      if (q) { var bs = Math.max(8, au.r * W.focal / q.z + 4) + Math.sin(W.t * 0.3); seg(dim(C.lock, 0.3), a.x, a.y, q.x, q.y); brackets(C.lock, q.x, q.y, bs); poly(C.lock, [[q.x, q.y - 2], [q.x + 2, q.y], [q.x, q.y + 2], [q.x - 2, q.y]], true); }
    }
  }
  function edgeArrow(W, o, col, label, big) {   // something off the screen: an arrow at the edge, pointing to it (labelled, bigger for the nearest)
    var v = E.view(W, o.x, o.y, o.z, V1), ang = Math.atan2(-v[1], v[0]);
    if (v[2] < 0 && Math.abs(v[0]) < 2 && Math.abs(v[1]) < 2) ang = Math.PI / 2;
    var ex = CX + Math.cos(ang) * (176 + WIDE.ox), ey = 136 + Math.sin(ang) * 98, ca = Math.cos(ang), sa = Math.sin(ang), k = big ? 1.6 : 1;
    poly(col, [[ex + ca * 8 * k, ey + sa * 8 * k], [ex - sa * 5 * k, ey + ca * 5 * k], [ex + sa * 5 * k, ey - ca * 5 * k]], true);
    if (label) {   // (labels kept apart: nudged down until they clear the ones already placed this frame)
      var lw = txtW(label, 5), lx = Math.max(lw / 2 + 4 - WIDE.ox, Math.min(GW + WIDE.ox - lw / 2 - 4, ex - ca * (12 + lw / 2))), ly = Math.max(44, Math.min(228, ey - sa * 14 - 2.5));   // (just inside the arrow)
      for (var tries = 0; tries < 6 && LABELS.some(function (r) { return Math.abs(r[0] - lx) < (r[2] + lw) / 2 + 3 && Math.abs(r[1] - ly) < 7; }); tries++) ly += 7;
      LABELS.push([lx, ly, lw]); txt(col, label, lx, ly, 5, 'c');
    }
  }
  var LABELS = [];
  function onScreen(p) { return p && p.x > 14 - WIDE.ox && p.x < GW - 14 + WIDE.ox && p.y > 32 && p.y < 240; }
  function gunMarks(W) {   // the valley: every gun in range on the rims and in the walls gets red corners, so you see what to shoot
    for (var i = 0; i < W.objs.length; i++) {
      var o = W.objs[i], rel = o.rs - W.s; if (!o.alive || o.k !== 'turret' || rel < 25 || rel > 650) continue;
      var p = E.project(W, o.x, o.y, o.z); if (!onScreen(p)) continue;
      var sz = Math.max(6, o.r * W.focal / p.z + 2), pulse = o.tell > 0 && (W.t >> 2) % 2;
      brackets(pulse ? C.white : dim(C.foe, rel < 350 ? 1 : 0.7), p.x, p.y, sz);
    }
  }
  function marks(W) {   // free flight: the main gun, the generators and the bridge, boxed on the screen or arrowed at the edge; fighters near you bracketed
    if (E.CHAPTERS[W.chap].id !== 'warship') { gunMarks(W); return; }   // (the valley, the Shoals)   // (the warship, on her circuit or flown free: her targets below)
    LABELS.length = 0;
    var S = W.ship, dist = function (o) { return Math.round(Math.sqrt((o.x - S.x) * (o.x - S.x) + (o.y - S.y) * (o.y - S.y) + (o.z - S.z) * (o.z - S.z))); }, nearGen = null;
    W.objs.forEach(function (o) { if (o.alive && o.k === 'gen' && (!nearGen || dist(o) < dist(nearGen))) nearGen = o; });
    W.objs.forEach(function (o) {
      if (!o.alive) return;
      if (o.k === 'turret' && o.free) {   // one of her guns near you: red corners, white as it is about to fire
        if (dist(o) > 520) return; var pt = E.project(W, o.x, o.y, o.z);
        if (onScreen(pt)) brackets(o.tell > 0 && (W.t >> 2) % 2 ? C.white : dim(C.foe, 0.85), pt.x, pt.y, Math.max(5, o.r * W.focal / pt.z + 2));
        return;
      }
      if (o.k === 'dart' || o.k === 'heavy') {   // a fighter within 600: red corners, so it reads against space
        if (o.wait > 0 || dist(o) > 600) return; var pf = E.project(W, o.x, o.y, o.z);
        if (onScreen(pf)) brackets(dim(C.foe, 0.95), pf.x, pf.y, Math.max(5, o.r * W.focal / pf.z + 2));
        return;
      }
      if (o.k === 'keel') {   // (v18) her keel gun, once it is after you: red corners (white as it is about to fire), named
        if (!o.awake) return; var pk = E.project(W, o.x, o.y, o.z);
        if (onScreen(pk)) { var szk = Math.max(8, o.r * W.focal / pk.z + 4); brackets(o.tell > 0 && (W.t >> 2) % 2 ? C.white : C.warn, pk.x, pk.y, szk); txt(C.warn, 'KEEL GUN', pk.x, pk.y + szk + 3, 5, 'c'); }
        return;
      }
      if (o.k !== 'gen' && o.k !== 'bridge' && o.k !== 'gun') return;
      var label = o.k === 'gen' ? 'GEN ' + (o.n + 1) : o.k === 'gun' ? 'MAIN GUN' : o.shielded ? 'BRIDGE - SHIELDED' : 'BRIDGE';
      var col = o.k === 'gen' ? C.gen : o.k === 'gun' ? C.canyon : o.shielded ? dim(C.hud, 0.7) : C.warn, p = E.project(W, o.x, o.y, o.z), near = o === nearGen;
      if (onScreen(p)) { var sz = Math.max(9, o.r * W.focal / p.z + 4); brackets(col, p.x, p.y, sz); if (p.z < 650 || near || o.k === 'gun') txt(col, label, p.x, p.y + sz + 3, 5, 'c'); }
      else if (o.k === 'gen' || o.k === 'gun' || (o.k === 'bridge' && !o.shielded)) edgeArrow(W, o, col, near || o.k !== 'gen' ? label + '  ' + dist(o) + ' M' : null, near || o.k === 'gun');   // (only the nearest generator is named)
    });
    if (W.aimDot) { var d = W.aimDot; circ(dim(C.white, 0.9), d.x, d.y, 4, 4, 14); seg(dim(C.white, 0.5), d.x, d.y, W.aim.x, W.aim.y); }   // mouse-aim: where you are pointing
    if (W.steerMode !== 'cursor' || W.mode !== 'free') return;   // (free flight with the mouse cursor: how to take the mouse, and where turning starts)
    if (W.ctrl === 'mouse' && SETNOW.mouse !== 'cursor' && !MOUSE.locked && (W.t >> 5) % 3) txt(dim(C.white, 0.9), 'CLICK THE SCREEN TO FLY WITH THE MOUSE  -  ESC LETS GO', CX, W.view === 'cockpit' ? 100 : 222, 5, 'c');   // (until you have, once; never over the dash or the banners)
    var u = E.aimUnit(W);   // the middle of the screen aims; beyond the ring, you turn
    if (Math.abs(u[0]) > 0.2 || Math.abs(u[1]) > 0.2) for (var i = 0; i < 24; i += 2) { var a0 = i / 24 * Math.PI * 2, a1 = (i + 1) / 24 * Math.PI * 2, rx = 0.3 * (CX - E.AIM.x0), ry = 0.3 * (E.AIM.y1 - E.AIM.y0) / 2, my = (E.AIM.y0 + E.AIM.y1) / 2; seg(dim(C.hud, 0.35), CX + Math.cos(a0) * rx, my + Math.sin(a0) * ry, CX + Math.cos(a1) * rx, my + Math.sin(a1) * ry); }
  }
  function locks(W) {   // the rockets' lock-on: a diamond on each target, numbered; a ring round the cursor while you hold the button
    W.locks.forEach(function (o, i) { var p = E.project(W, o.x, o.y, o.z); if (!p) return; var sz = Math.max(8, o.r * W.focal / p.z + 5) + Math.sin(W.t * 0.3) * 1.5; poly(C.lock, [[p.x - sz, p.y], [p.x, p.y - sz], [p.x + sz, p.y], [p.x, p.y + sz]], true); txt(C.lock, String(i + 1), p.x + sz + 2, p.y - sz, 4.5); });
    if (W.altHeld > 5) { var a = W.aim, r = 15 + (W.altHeld % 5) * 1.6; circ(dim(C.lock, 0.8), a.x, a.y, r, r, 20); txt(C.lock, 'LOCK ' + W.locks.length + ' OF ' + Math.min(6, W.rk), a.x, a.y + 20, 4, 'c'); }
  }
  function threats(W) {   // a missile on its way: a warning, and a box (or an arrow) on it
    var near = null, nd = 1e9, S = W.ship;
    W.eshots.forEach(function (b) { if (b.k !== 'missile' || !b.alive || !b.homing) return; var d = Math.abs(b.x - S.x) + Math.abs(b.y - S.y) + Math.abs(b.z - S.z); if (d < nd) { nd = d; near = b; } });
    if (!near) return;
    if (nd < 700 && (W.t >> 3) % 2) txt(C.warn, W.ctrl === 'pad' ? 'MISSILE - LB OR RB TO ROLL' : W.ctrl === 'touch' ? 'MISSILE - TAP ROLL' : 'MISSILE - Q OR E TO ROLL', CX, 56, 6, 'c');
    var p = E.project(W, near.x, near.y, near.z);
    if (onScreen(p)) brackets(C.warn, p.x, p.y, 6); else edgeArrow(W, near, C.warn);
  }
  function speedLines(W) {   // (v18) really moving: faint lines streaming out past the edges of the screen, more and longer the faster you go
    var k = Math.max(0, Math.min(1, ((W.v || 0) / (W.pace || 3) - 1.5) / 0.9)); if (k <= 0) return;
    XO = WIDE.ox; var cy = W.view === 'cockpit' ? CY : CY - 10, n = Math.round(10 + 14 * k);
    for (var i = 0; i < n; i++) {
      var a = i * 2.399 + 0.4, r0 = 150 + ((W.t * (5 + 4 * k) + i * 53) % 110), L = 12 + 34 * k, ca = Math.cos(a), sa = Math.sin(a) * 0.72;
      if (Math.abs(sa) > 0.62 && Math.abs(ca) < 0.4) continue;   // (not across the panel up top or down below)
      seg(dim(C.white, 0.18 + 0.32 * k), CX + ca * r0, cy + sa * r0, CX + ca * (r0 + L), cy + sa * (r0 + L));
    }
    XO = 0;
  }
  var TL = { hint: false };
  function TS() { return SETNOW.textsize === 'large' ? 1.3 : 1; }   // (v22) the Text size setting   // (v20) this frame: is a hazard warning holding the middle of the screen? (then the title waits)
  function warnings(W, g) {
    if (W.mode !== 'rail') return;
    var ace = null; for (var j = 0; j < W.objs.length; j++) if (W.objs[j].alive && W.objs[j].ace) ace = W.objs[j];
    if (ace && ace.st === 'tail' && (W.t >> 3) % 3) {
      txt(C.warn, 'MAGPIE ON YOUR TAIL - HOLD ' + (W.ctrl === 'pad' ? 'LT' : W.ctrl === 'touch' ? 'BRAKE' : 'S') + ' TO BRAKE', CX, 194, 7, 'c');   // (the panel's font has no brackets)
    }
    if (ace && ace.st === 'tail') {   // (v20) a red chevron at the bottom, pulsing, the whole time he is behind you - not only in the blinks of the words
      var pc = (W.t >> 2) % 2 ? C.warn : dim(C.warn, 0.55);
      for (var q = 0; q < 3; q++) { var yy = 205 + q * 5; seg(pc, CX - 18 + q * 2, yy, CX, yy + 6); seg(pc, CX, yy + 6, CX + 18 - q * 2, yy); }
    }
    if (ace && ace.st === 'flee') { var ap = E.project(W, ace.x, ace.y, ace.z); if (onScreen(ap)) txt(C.gold, 'MAGPIE', ap.x, ap.y - Math.max(10, ace.r * W.focal / ap.z + 6), 5, 'c'); }
    var ar = null, at = 1e9, why = '', bad = false, reach = 340 + Math.max(0, (W.v || 0) - (W.pace || 3)) * 60;   // (further ahead the faster you fly)
    for (var i = 0; i < W.objs.length; i++) {
      var o = W.objs[i]; if (!o.alive || o.passed || o.rs <= W.s || o.rs - W.s > reach || o.rs >= at) continue;
      if (o.k === 'arch') { ar = o; at = o.rs; why = 'ARCH - FLY LOW'; bad = W.oy > o.y0 - 4; }
      else if (o.k === 'rockfall' && Math.abs(W.ox - o.lx) < o.w / 2 + 8) { ar = o; at = o.rs; why = 'ROCKFALL - FLY HIGH'; bad = W.oy < o.ly + o.h + 2; }
    }
    (W.valley.squeezes || []).forEach(function (q) { if (q.s0 > W.s && q.s0 < at && q.s0 - W.s < reach + 80) { at = q.s0; ar = q; why = 'SQUEEZE - HOLD THE MIDDLE'; bad = false; } });
    if (W.valley.shoals) for (var k5 = 0; k5 < W.objs.length; k5++) {   // (chapter 3) a rock in your way; a rock thrown at you
      var o5 = W.objs[k5], rel5 = o5.rs - W.s; if (!o5.alive || rel5 <= 0 || rel5 >= at) continue;
      if ((o5.k === 'asteroid' || (o5.k === 'rock' && o5.r > 8.5)) && rel5 < reach && Math.hypot(W.ox - o5.lx, W.oy - o5.ly) < o5.r + 6) { ar = o5; at = rel5; why = 'ROCK AHEAD - STEER ROUND'; bad = true; }
      else if (o5.k === 'boulder' && rel5 < 260) { ar = o5; at = rel5; why = 'THROWN ROCK - SHOOT IT OR DODGE'; bad = Math.hypot(W.ox - o5.lx, W.oy - o5.ly) < o5.r + 5; }
    }
    if (W.grindT > 4) { ar = {}; why = 'PULL AWAY FROM THE ROCK!'; bad = true; }   // (v20b: hold against it and you hit it)
    if (ar) { TL.hint = true; if ((W.t >> 3) % 4) { var hs = Math.min(7 * TS(), (WIDE.gw - 30) / why.length), hw2 = txtW(why, hs) / 2; blackPanel(g, CX - hw2 - 6, 88, CX + hw2 + 6, 96 + hs, 0.4); txt(bad ? C.warn : C.white, why, CX, 92, hs, 'c'); } }   // (v20: white on a dark plate - it read badly on red rock)
    (W.valley.ridges || []).forEach(function (g) {   // a fork coming up: which side is which, at the two edges of the screen
      if (!W.lane && W.s > g.s0 - 900 && W.s < g.s0 + 40) { txt(C.gold, g.tags[0], 14 - WIDE.ox, 140, 7); txt(C.warn, g.tags[1], GW - 14 + WIDE.ox, 140, 7, 'r'); }
    });
  }
  // the lock-on, taught once: the first time there are a few targets in front of you and a full rack of rockets
  var LOCKHINT = { shown: (function () { try { return localStorage.getItem('sr365c:lockhint') === '1'; } catch (e) { return false; } })(), t: 0 };
  function lockHint(W) {   // (v22) every game until you have locked on once (it was once per browser, ever); then the shock bomb's, once a game
    if (TL.hint || (W.banner && !W.banner.small)) return;   // (v20: one instruction at a time)
    if (W.lockShown == null) { W.lockT = 0; W.bombT2 = 0; W.lockShown = 0; }
    var crowd = function (k) { var n = 0; W.objs.forEach(function (o) { if (o.alive && !(o.wait > 0) && (o.k === 'dart' || o.k === 'heavy' || (k && o.k === 'turret')) && onScreen(E.project(W, o.x, o.y, o.z))) n++; }); return n; }, z = 6 * TS();
    if (!W.locked && W.lockShown < 2) {
      if (!W.lockT) { if (W.rk < W.sp.rockets || W.altHeld || crowd(true) < 2) return; W.lockT = 1; W.lockShown++; }
      if (++W.lockT > 260 || W.altHeld > 5) { W.lockT = 0; return; }
      var how = W.ctrl === 'pad' ? 'HOLD X' : W.ctrl === 'touch' ? 'HOLD ROCKET' : W.ctrl === 'keys' ? 'HOLD SHIFT' : 'HOLD RIGHT-CLICK OR SHIFT';
      if ((W.lockT >> 4) % 4) txt(C.lock, how + '  -  SWEEP OVER THEM  -  LET GO', CX, 206, Math.min(z, (WIDE.gw - 30) / 45), 'c');
      return;
    }
    if (!W.bombUsed && W.bombs > 0 && W.bombT2 >= 0) {
      if (!W.bombT2) { if (crowd(false) < 3) return; W.bombT2 = 1; }
      if (++W.bombT2 > 240 || W.bombUsed) { W.bombT2 = -1; return; }
      var bh = (W.ctrl === 'pad' ? 'B' : W.ctrl === 'touch' ? 'BOMB' : 'B') + ' - A SHOCK BOMB CLEARS THE LOT';
      if ((W.bombT2 >> 4) % 4) txt(C.gold, bh, CX, 206, z, 'c');
    }
  }
  function paceLine(W, g) {   // (v20b) at each section (or generator): how far ahead of, or behind, a gold run you are
    var P = W.paceNote; if (!P || W.phase !== 'play' || P.t > 200) return;
    var z = 6 * TS(), s = P.d >= 0 ? '+' + num(P.d) + ' AHEAD OF GOLD' : num(-P.d) + ' BEHIND GOLD', w = txtW(s, z) / 2, fade = P.t > 180;
    blackPanel(g, CX - w - 6, 84, CX + w + 6, 90 + z, 0.35); txt(fade ? dim(P.d >= 0 ? C.good : C.warn) : P.d >= 0 ? C.good : C.warn, s, CX, 87, z, 'c');
  }
  function words(W, g) {   // (v20) the titles sit on a soft dark plate so they read over rock and sky; a hazard warning in the middle comes first
    var b = W.banner;
    if (!b) { if (!TL.hint) paceLine(W, g); return; }
    var fade = b.dur - b.t < 22;
    if (b.small) { var st = b.text + (b.sub ? ' - ' + b.sub : ''), sz = Math.min(7 * TS(), (WIDE.gw - 40) / st.length), sw = txtW(st, sz) / 2; blackPanel(g, CX - sw - 6, 38, CX + sw + 6, 46 + sz, fade ? 0.15 : 0.32); txt(fade ? dim(C.gold) : C.gold, st, CX, 42, sz, 'c'); return; }   // one line, high up: off the fight
    if (TL.hint && W.phase === 'play') return;
    paceLine(W, g);
    var ts = b.text.length > 16 ? 11 : 14, us = b.sub ? Math.min(6 * TS(), (WIDE.gw - 30) / b.sub.length) : 6, pw = Math.max(txtW(b.text, ts), b.sub ? txtW(b.sub, us) : 0) / 2;
    blackPanel(g, CX - pw - 8, 45, CX + pw + 8, b.sub ? 74 + us : 54 + ts, fade ? 0.15 : 0.32);
    txt(fade ? dim(C.gold) : C.gold, b.text, CX, 50, ts, 'c'); if (b.sub) txt(fade ? dim(C.hud) : C.hud, b.sub, CX, 70, us, 'c');
  }
  function paw(g, x, y, s, col, a, rot) {   // (v33) a paw print: a pad and four toes
    g.save(); g.globalAlpha = Math.max(0, Math.min(1, a)); g.fillStyle = col; g.translate(x, y); g.rotate(rot || 0);
    g.beginPath(); g.ellipse(0, s * 0.22, s * 0.42, s * 0.34, 0, 0, 6.283); g.fill();
    [[-0.42, -0.14, 0.15], [-0.16, -0.42, 0.16], [0.16, -0.42, 0.16], [0.42, -0.14, 0.15]].forEach(function (q) { g.beginPath(); g.ellipse(q[0] * s, q[1] * s, q[2] * s, q[2] * s * 1.25, 0, 0, 6.283); g.fill(); });
    g.restore();
  }
  var PAWSKY = (function () { var r = 9137, a = []; function rn() { r = (r * 16807) % 2147483647; return r / 2147483647; } for (var i = 0; i < 16; i++) a.push([rn() * 2 - 1, 0.1 + rn() * 0.28, 4 + rn() * 6, rn() * 6.283, rn() * 0.8 - 0.4]); return a; })();
  function logoCard(g, W) {   // (v33) THE TITLE: 365 GAMES PRESENTS - then STAR PAWS slams in letter by letter, each landing with a flash; paw prints twinkle in for
    // stars and two big ones frame it; a shine sweeps across; THE RESCUE OF NOODLE DOODLES types itself out. Over a fast run down the valley at dawn.
    var t = W.phaseT, ox = WIDE.ox, out = 1 - Math.max(0, Math.min(1, (t - 318) / 40)), word = 'STAR PAWS', size = 30, ww = txtW(word, size), x0 = CX - ww / 2, y0 = 96;
    fullBar(g, 0, 22); fullBar(g, GH - 22, GH);
    if (t > 6 && t < 68) txt(C.hud, '365 GAMES PRESENTS', CX, 132, 6, 'c');
    if (t > 58) {   // a warm glow behind the letters
      var gk = Math.min(1, (t - 58) / 40) * out;   // (a dark plate behind the name, so it reads against a bright sky)
      g.save(); g.translate(CX + ox, y0 + 22); g.scale(1, 0.32); var gr = g.createRadialGradient(0, 0, 10, 0, 0, 230); gr.addColorStop(0, 'rgba(18,8,26,' + (0.72 * gk) + ')'); gr.addColorStop(0.6, 'rgba(18,8,26,' + (0.45 * gk) + ')'); gr.addColorStop(1, 'rgba(18,8,26,0)'); g.fillStyle = gr; g.fillRect(-240, -240, 480, 480); g.restore();
    }
    if (t > 120) {   // paw prints for stars, twinkling; two big ones either side of the name
      var pk = Math.min(1, (t - 120) / 40) * out;
      PAWSKY.forEach(function (q, i) { paw(g, CX + ox + q[0] * (CX + ox - 20), GH * q[1], q[2], '#fff1c4', pk * (0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.11 + q[3]))), q[4]); });
      var bk = Math.min(1, (t - 120) / 18); paw(g, x0 - 26 + ox, y0 + 15, 26 * (1 + 0.6 * (1 - bk)), '#ffb347', bk * out, -0.35); paw(g, x0 + ww + 26 + ox, y0 + 15, 26 * (1 + 0.6 * (1 - bk)), '#ffb347', bk * out, 0.35);
    }
    for (var i = 0; i < word.length; i++) {
      if (word[i] === ' ') continue;
      var ti = 62 + i * 7 - (i > 4 ? 7 : 0), k = Math.max(0, Math.min(1, (t - ti) / 9)); if (k <= 0.12 || out < 0.3) continue;
      var sz = size * (1 + 2.4 * (1 - k) * (1 - k)), cx = x0 + i * size + size * 0.33, flash = t - ti >= 9 && t - ti < 15;
      var sweep = x0 - 30 + (t - 160) / 55 * (ww + 60), shine = t > 160 && t < 215 && Math.abs(sweep - cx) < 13;
      var yy = y0 + (size - sz) / 2, lc = flash || shine ? C.white : C.gold;
      [[2.2, 2.8], [3.0, 3.6], [1.4, 3.4]].forEach(function (d) { txt('#5a1406', word[i], cx + d[0], yy + d[1], sz, 'c'); });   // (a deep shadow under it)
      [[0, 0], [0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]].forEach(function (d) { txt(lc, word[i], cx + d[0], yy + d[1], sz, 'c'); });   // (bold: the strokes laid down five times)
    }
    if (t > 168) { var sub = 'THE RESCUE OF NOODLE DOODLES', n = Math.min(sub.length, Math.floor((t - 168) * 0.8)); if (out > 0.3) txt(C.hud, sub.slice(0, n), CX, y0 + 44, 7, 'c'); }
    if (t > 236 && (t >> 4) % 2 && out > 0.5) txt(C.good, 'PRESS FIRE', CX, GH - 44, 6, 'c');
    if (t > 30) txt(dim(C.hud, 0.6), 'FIRE TO SKIP', WIDE.gw - ox - 10, 9, 4.5, 'r');
  }
  function storyCard(g, W) {   // (v31) the story's scenes: a film's letterbox, who is speaking and what they say along the bottom
    var T = W.story, cap = T && T.cap; fullBar(g, 0, 32); fullBar(g, GH - 48, GH);
    if (W.phase === 'intro' && W.phaseT < 150) txt(dim(C.gold, Math.min(1, W.phaseT / 40)), 'NOODLE DOODLES', CX, 11, 9, 'c');
    if (W.phaseT > 60) txt(dim(C.hud, 0.7), 'FIRE TO SKIP', WIDE.gw - WIDE.ox - 10, 12, 4.5, 'r');
    if (!cap) return;
    var size = 6, lines = [''], room = 54; cap.text.split(' ').forEach(function (wd) { var L = lines[lines.length - 1]; if (L && (L + ' ' + wd).length > room) lines.push(wd); else lines[lines.length - 1] = L ? L + ' ' + wd : wd; });
    var y = GH - 40, foe = cap.who === 'MAGPIE' || cap.who === 'GAOLER';
    if (cap.who) { txt(foe ? C.warn : C.gold, cap.who, CX, y - 1, 5, 'c'); y += 8; }
    lines.forEach(function (L, i) { txt(foe ? '#ffb4a4' : C.val, L, CX, y + i * 9, size, 'c'); });
  }
  function storyLine(W) {   // (v31) where Noodle Doodles is: how far ahead the Magpie is with her, or who has her now
    var T = W.story; if (!T) return;
    var s = T.holder === 'mag' ? (T.gap < 260 ? 'ON HIS TAIL - NOODLE DOODLES ' + Math.round(T.gap) + ' M' : 'NOODLE DOODLES ' + Math.round(T.gap) + ' M AHEAD')
      : T.holder === 'gaoler' ? 'NOODLE DOODLES - CAGED ON THE GAOLER' : T.holder === 'up' ? 'NOODLE DOODLES - TAKEN UP TO THE WARSHIP' : T.holder === 'brig' ? 'NOODLE DOODLES - IN THE WARSHIP BRIG'
      : T.holder === 'mill' ? 'NOODLE DOODLES - HELD BY THE MILLSTONE' : T.holder === 'free' ? 'NOODLE DOODLES - CATCH HER POD!' : 'NOODLE DOODLES - SAFE WITH YOU';
    var close = T.holder === 'mag' && T.gap < 260, col = close ? ((W.t >> 3) % 2 ? C.gold : C.white) : T.holder === 'free' ? C.good : C.gold;
    txt(col, s, CX, 41, 5, 'c');
    if (W.ms && W.ms.toysAll) txt(dim(C.white, 0.85), 'SQUEAKY TOYS ' + (W.ms.toys || 0) + '/' + W.ms.toysAll, CX, 49, 4.5, 'c');   // (v32)
    if (W.power) txt((W.t >> 3) % 2 || W.power.t > 180 ? C.good : C.white, 'SPREAD LASER ' + Math.ceil(W.power.t / 60), CX, 57, 5, 'c');
  }
  function radioLine(W, g) {   // Harbourlight Control on the radio: a caption above your ships, typed out as it comes in - (v20) bigger, on a dark plate,
    // and a long line wraps onto a second one instead of shrinking (the longest, most urgent lines used to come out smallest)
    var R = W.radio; if (!R || W.phase === 'brief' || W.phase === 'clear' || W.phase === 'end') return;
    var size = 6 * TS(), foe = !!R.who, tag = (R.who || 'SANDERLING') + ':', x = 12, tw = txtW(tag, size) + size, room = Math.max(20, Math.floor((WIDE.gw - 24 - tw) / size)), lines = [''], n = Math.min(R.text.length, Math.floor(R.t * 1.6));
    R.text.split(' ').forEach(function (wd) { var L = lines[lines.length - 1]; if (L && (L + ' ' + wd).length > room) lines.push(wd); else lines[lines.length - 1] = L ? L + ' ' + wd : wd; });
    var lh = size + 3, fade = R.dur - R.t < 24, y = 242 - lines.length * lh, wm = 0; lines.forEach(function (L) { wm = Math.max(wm, txtW(L, size)); });
    var tc = foe ? C.warn : C.gold, vc = foe ? '#ffb4a4' : C.val;   // (v22: the other side, intercepted, in red)
    XO = 0; blackPanel(g, x - 5, y - 4, x + tw + wm + 5, y + lines.length * lh + 1, fade ? 0.25 : 0.5);   // (from the left edge)
    txt(fade ? dim(tc) : tc, tag, x, y, size);
    var left = n; lines.forEach(function (L, i) { var sl = L.slice(0, Math.max(0, left)); left -= L.length + 1; if (sl) txt(fade ? dim(vc) : vc, sl, x + tw, y + i * lh, size); });
    XO = WIDE.ox;
  }
  function hurtMark(W) {   // a hit: a red wedge on the edge of the screen towards whatever fired, and what it was, by your shields
    var H = W.hurtFrom; if (!H) return;
    var k = H.t / 60, col = dim(C.warn, 0.35 + 0.65 * k);
    txt(col, H.cause + ' HIT', 226, 252, 5);
    if (H.x == null) return;
    var v = E.view(W, H.x, H.y, H.z, V1), ang = Math.atan2(-v[1], v[0]);
    if (v[2] < 0 && Math.abs(v[0]) < 2 && Math.abs(v[1]) < 2) ang = Math.PI / 2;
    var ca = Math.cos(ang), sa = Math.sin(ang), ex = CX + ca * (182 + WIDE.ox), ey = 128 + sa * 104, px = -sa, py = ca;
    for (var j = 0; j < 4; j++) {   // a chevron of four lines, 40 wide, pointing out to the attacker
      var r = 8 - j * 2.2; seg(col, ex - ca * r + px * 20, ey - sa * r + py * 20, ex + ca * (6 - r * 0.2), ey + sa * (6 - r * 0.2)); seg(col, ex + ca * (6 - r * 0.2), ey + sa * (6 - r * 0.2), ex - ca * r - px * 20, ey - sa * r - py * 20);
    }
  }
  function hitMark() {   // you hit it: four ticks round the sight - white on a hit, gold on a kill, longer on a big one
    var h = PS.hm; if (!h) return;
    var col = h.kill ? C.gold : C.white, r0 = 7 + (1 - h.t / h.max) * 3, len = h.big ? 7 : h.kill ? 5 : 3.5;
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (q) { seg(col, h.x + q[0] * r0 * 0.7, h.y + q[1] * r0 * 0.7, h.x + q[0] * (r0 + len) * 0.7, h.y + q[1] * (r0 + len) * 0.7); });
  }
  function floats() { for (var i = 0; i < PS.flt.length; i++) { var d = PS.flt[i], c = d.c || C.gold; txt(d.life < 18 ? dim(c) : c, d.s, d.x, d.y, 6, 'c'); } }
  function briefCard(g, W) {   // the cinematic briefing: bars top and bottom, the chapter's name, what to do
    var ch = E.CHAPTERS[W.chap], k = Math.min(1, W.phaseT / 24), top = (ch.why ? 44 : 34) * k, bot = 74 * k;
    fullBar(g, 0, top); fullBar(g, GH - bot, GH);
    if (k < 1) return;
    txt(C.hud, 'CHAPTER ' + ch.n, CX, 5, 5, 'c'); txt(C.gold, ch.name, CX, 15, 13, 'c');
    if (ch.why && W.phaseT > 40) txt(C.warn, ch.why, CX, 33, Math.min(5, (WIDE.gw - 30) / ch.why.length), 'c');   // (v22) why you are flying
    txt(C.val, ch.goal[0], CX, GH - 70, 6, 'c'); txt(C.hud, ch.goal[1], CX, GH - 59, 5, 'c');
    if (W.phaseT > 60 && (W.t >> 4) % 2) txt(C.good, 'PRESS FIRE', CX, GH - 46, 6, 'c');
    var touch = document.body.classList.contains('touchy'), pad = W.ctrl === 'pad', free = W.mode === 'free';
    // (v22) the three things you need, big; the rest underneath, smaller
    var split = SETNOW.aimstyle === 'split', how = pad ? (free ? ['LEFT STICK TURNS  -  RT THRUST  -  A FIRES', 'RIGHT STICK AIMS  -  LT BRAKE  -  X ROCKETS, HOLD TO LOCK  -  B SHOCK BOMB  -  Y FLIP']
        : ['LEFT STICK FLIES  -  RT THRUST  -  A FIRES', 'RIGHT STICK AIMS  -  LT BRAKE  -  X ROCKETS, HOLD TO LOCK  -  B SHOCK BOMB  -  LB / RB ROLL'])
      : touch ? ['DRAG TO STEER AND AIM  -  HOLD FIRE', 'HOLD ROCKET TO LOCK  -  BOOST, BRAKE, ROLL AND BOMB BUTTONS  -  DOUBLE-TAP BRAKE TO FLIP']
      : free ? ['POINT THE MOUSE  -  CLICK FIRES  -  W OR WHEEL-CLICK THRUST', 'CLICK THE SCREEN FIRST  -  S BRAKE, TIGHT TURNS  -  R FLIP  -  Q / E ROLL  -  B BOMB']
      : split ? ['ARROW KEYS FLY  -  MOUSE AIMS  -  CLICK FIRES', 'W / WHEEL-CLICK THRUST  -  S BRAKE  -  Q / E ROLL  -  HOLD RIGHT-CLICK: LOCK  -  B BOMB']
      : ['THE MOUSE FLIES  -  CLICK FIRES  -  W OR WHEEL-CLICK THRUST', 'S BRAKE  -  Q / E ROLL  -  HOLD RIGHT-CLICK: LOCK ROCKETS  -  B SHOCK BOMB'];
    txt(C.val, how[0], CX, GH - 31, Math.min(7, (WIDE.gw - 30) / how[0].length), 'c'); txt(dim(C.hud, 0.85), how[1], CX, GH - 18, Math.min(4.6, (WIDE.gw - 30) / how[1].length), 'c');
    txt(dim(C.val, 0.8), 'RANK: ' + rank().name, GW - 8, 6, 5, 'r');
  }
  function barsOut(g, W) {   // the bars slide away as the chapter starts
    if (prevPh !== 'brief' || W.phaseT > 30) return;
    var k = 1 - W.phaseT / 30; fullBar(g, 0, 34 * k); fullBar(g, GH - 74 * k, GH);
  }
  function tallyCard(g, W) {
    var lines = W.tally, ft = W.feats || [], RH = lines.length > 11 ? 13 : 14, y0 = 34, y1 = y0 + 40 + lines.length * RH + 58 + (ft.length ? 11 : 0), i, shown = Math.floor((W.phaseT - 30) / 30);
    blackPanel(g, 60, y0, 340, y1);
    card(60, y0, 340, y1, C.card);
    txt(C.gold, 'CHAPTER COMPLETE', CX, y0 + 12, 10, 'c');
    for (i = 0; i < lines.length && i < shown; i++) {
      var medal = lines[i][0] === 'MEDAL', mc = { GOLD: C.gold, SILVER: C.silver, BRONZE: C.bronze }[lines[i][1]] || C.val;
      txt(C.hud, lines[i][0], 78, y0 + 32 + i * RH, 6); txt(medal ? mc : C.val, lines[i][1], 322, y0 + 32 + i * RH, medal ? 7 : 6, 'r');
    }
    if (shown >= lines.length) {   // the total, and what gold needs (and what you missed)
      if (ft.length) { var fs = 'FEAT' + (ft.length > 1 ? 'S' : '') + ': ' + ft.map(function (k) { return E.FEATS[k]; }).join('  -  '); txt(C.good, fs, CX, y1 - 63, Math.min(5.5, 270 / fs.length), 'c'); }   // (v20b)
      txt(C.val, 'TOTAL SCORE ' + num(W.score), CX, y1 - 52, 7, 'c');
      if (W.tallyHint) txt(W.medal === 'GOLD' ? C.gold : C.hud, W.tallyHint, CX, y1 - 40, Math.min(5, 266 / W.tallyHint.length), 'c');
      if (newPaint) txt(C.gold, 'NEW PAINT UNLOCKED: ' + newPaint.toUpperCase() + ' - IN SETTINGS', CX, y1 - 30, 5, 'c');
    }
    if (W.phaseT > 120 && (W.t >> 4) % 2) {   // (v22) short of gold: fly it again, there and then
      var again = W.ctrl === 'pad' ? 'Y' : W.ctrl === 'keys' ? 'R' : W.ctrl === 'touch' ? 'DOUBLE-TAP BRAKE' : 'RIGHT-CLICK';
      txt(C.good, W.medal === 'GOLD' ? 'PRESS FIRE' : 'FIRE: GO ON  -  ' + again + ': FLY IT AGAIN FOR GOLD', CX, y1 - 17, W.medal === 'GOLD' ? 6 : 5.5, 'c');
    }
    var mi = -1; lines.forEach(function (l, j) { if (l[0] === 'MEDAL') mi = j; });
    if (mi >= 0 && shown > mi && PS.stamp !== W.tally) { PS.stamp = W.tally; W.events.push({ sfx: 'clear', rate: W.medal === 'GOLD' ? 1.26 : W.medal === 'SILVER' ? 1 : 0.84 }); W.events.push('chain'); }   // (v22) the medal lands
  }
  function endCard(g, W) {
    var y0 = 70, y1 = 200;
    blackPanel(g, 50, y0, 350, y1); card(50, y0, 350, y1, C.gold);
    txt(C.gold, 'SAMPLE COMPLETE', CX, y0 + 14, 11, 'c');
    txt(C.hud, 'FINAL SCORE', CX, y0 + 44, 6, 'c'); txt(C.val, num(W.score), CX, y0 + 56, 12, 'c');
    txt(dim(C.val, 0.85), 'MORE CHAPTERS ARE ON THE WAY', CX, y0 + 84, 5, 'c');
    if (W.story) txt(W.story.caught ? C.gold : C.warn, W.story.caught ? 'NOODLE DOODLES IS HOME' : 'NOODLE DOODLES IS STILL OUT THERE', CX, y0 + 100, 5.5, 'c');
    if (W.phaseT > 180 && (W.t >> 4) % 2) txt(C.good, 'PRESS FIRE', CX, y1 - 18, 6, 'c');
  }
  function overlays(g, W, ph) {   // a fade back in after a lost ship, the flashes, red when a ship is gone
    var FW = WIDE.gw;   // (right across a wide screen)
    if (ph === 'play' && prevPh === 'retry' && W.phaseT < 24) { g.fillStyle = 'rgba(0,0,0,' + (1 - W.phaseT / 24) + ')'; g.fillRect(0, 0, FW, GH); }
    if (ph === 'retry' && W.phaseT > 110) { g.fillStyle = 'rgba(0,0,0,' + Math.min(1, (W.phaseT - 110) / 36) + ')'; g.fillRect(0, 0, FW, GH); }
    if (PS.flash) {   // (a hit: a sharp red flash that comes up over a few frames and fades)
      var F = PS.flash, el = F.max - F.t, al = F.sq ? 0.8 * Math.pow(F.t / F.max, 2) : F.att ? F.peak * (el < F.att ? (el + 1) / F.att : F.t / (F.max - F.att)) : 0.22 * F.t / F.max;
      g.fillStyle = 'rgba(' + F.c + ',' + al + ')'; g.fillRect(0, 0, FW, GH);
    }
    if (ph === 'dead' || ph === 'retry') { g.fillStyle = 'rgba(255,30,30,' + (0.08 + 0.05 * Math.sin(W.t * 0.2)) + ')'; g.fillRect(0, 0, FW, GH); }
  }

  // ------------------------------------------------------------ medals (kept in this browser): your rank, and the paint they unlock
  var MEDAL_PTS = { BRONZE: 1, SILVER: 2, GOLD: 3 }, newPaint = '';
  function medals() { try { return JSON.parse(localStorage.getItem('sr365c:medals') || '{}') || {}; } catch (e) { return {}; } }
  function feats() { try { return JSON.parse(localStorage.getItem('sr365c:feats') || '{}') || {}; } catch (e) { return {}; } }
  var FEAT_PAINT = { sand: 'needle', ember: 'gaoler', navy: 'carrier', magpie: 'magpie', noodle: 'toys' }, ALL_PAINTS = ['crimson', 'stealth', 'gold', 'sand', 'ember', 'navy', 'magpie', 'noodle'];
  function unlocked(p, m, f) {
    if (FEAT_PAINT[p]) return !!(f || feats())[FEAT_PAINT[p]];   // (v20b) won with a feat
    m = m || medals(); var v = Object.keys(m).map(function (k) { return MEDAL_PTS[m[k]] || 0; });
    if (p === 'white') return true; if (p === 'crimson') return v.length > 0;
    var both = v.length >= 2; if (p === 'stealth') return both && v.every(function (q) { return q >= 2; }); if (p === 'gold') return both && v.every(function (q) { return q >= 3; });
    return false;
  }
  function rank() {   // (v20b) medals (gold 3, silver 2, bronze 1 a chapter) and feats (1 each): up to 18 with three chapters
    var m = medals(), p = Object.keys(feats()).length; Object.keys(m).forEach(function (k) { p += MEDAL_PTS[m[k]] || 0; });
    return { pts: p, name: p >= 16 ? 'ACE' : p >= 11 ? 'WING COMMANDER' : p >= 5 ? 'FLIGHT LEADER' : p >= 1 ? 'PILOT' : 'CADET' };
  }
  function recordMedal(W) {
    var m = medals(), f = feats(), before = ALL_PAINTS.filter(function (p) { return unlocked(p, m, f); }), n = W.stage, md = W.medal;
    if (!m[n] || (MEDAL_PTS[md] || 0) > (MEDAL_PTS[m[n]] || 0)) m[n] = md;
    (W.feats || []).forEach(function (k) { f[k] = 1; });
    try { localStorage.setItem('sr365c:medals', JSON.stringify(m)); localStorage.setItem('sr365c:feats', JSON.stringify(f)); } catch (e) {}
    var after = ALL_PAINTS.filter(function (p) { return unlocked(p, m, f); });
    newPaint = after.filter(function (p) { return before.indexOf(p) < 0; })[0] || '';
  }

  // ------------------------------------------------------------ one frame
  var R3 = null, R3tried = false, r3scale = 1, r3slow = 0, firstDraw = 0, demoMs = 0;
  function r3() { if (!R3tried && window.SR3D) { R3tried = true; try { R3 = window.SR3D(); window.SR3DLIVE = R3; } catch (e) { R3 = null; } } return R3; }
  function waiting(g, t) {   // the 3D picture has not started: still loading, or this PC can't do it
    if (!firstDraw) firstDraw = t;
    var failed = (R3tried && !R3) || t - firstDraw > 12000;
    if (failed) {
      txt(C.gold, 'THIS GAME NEEDS 3D GRAPHICS', CX, 110, 9, 'c');
      txt(C.val, 'YOUR BROWSER HAS 3D GRAPHICS (WEBGL) SWITCHED OFF,', CX, 140, 5, 'c');
      txt(C.val, 'OR THE GRAPHICS CARD IS TOO OLD FOR IT.', CX, 152, 5, 'c');
      txt(dim(C.hud, 0.85), 'TRY ANOTHER BROWSER, OR UPDATE THE GRAPHICS DRIVER', CX, 176, 4.5, 'c');
    } else if ((t >> 9) % 2) txt(C.hud, 'LOADING THE 3D PICTURE', CX, 140, 6, 'c');
  }
  // the whole screen (28 Oct, the owner: "full screen only shows a smaller area"). The arcade cabinet shows every game as a 4:3 box, so a wide
  // screen had black bands either side, and in full screen its bar stayed on top. Star Run fills the space it is given: the picture is drawn
  // wider (more of the canyon either side; the middle exactly as before), the panel's corners go to the screen's corners, the crosshair reaches
  // the edges - and in full screen, while you play, the bar goes (it comes back when you pause).
  var WIDE = { ox: 0, gw: GW };
  function widen() {   // the screen sized to fill the stage, as wide as 21:9; false (the cabinet's own 4:3 box) when there is no room for wider
    var cv = document.getElementById('screen'), stage = document.getElementById('stage'), wrap = document.getElementById('screenwrap'), pad = document.getElementById('pad');
    if (!cv || !stage || !wrap) return false;
    var imm = document.body.classList.contains('sr-immersive'), m = imm ? 0 : 16;
    var bw = stage.clientWidth - m, bh = stage.clientHeight - m - (pad && pad.offsetParent ? pad.offsetHeight + 10 : 0);
    if (bw < 120 || bh < 90 || bw / bh <= GW / GH + 0.02) return false;   // (a phone held upright, say)
    var A = Math.min(21 / 9, bw / bh), cssH = Math.floor(Math.min(bh, bw / A)), cssW = Math.floor(cssH * A), dpr = Math.min(3, window.devicePixelRatio || 1);
    if (cv.style.width !== cssW + 'px' || cv.style.height !== cssH + 'px' || cv.width !== Math.round(cssW * dpr)) {
      cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px'; cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
      wrap.style.width = cssW + 'px'; wrap.style.height = cssH + 'px';
    }
    WIDE.gw = GH * cssW / cssH; WIDE.ox = (WIDE.gw - GW) / 2;
    return true;
  }
  function draw(g, W, t, mode, info) {
    var t0 = performance.now(), set = info.set || {};
    SETNOW = set; pollPad(mode); GL.q.length = 0;
    document.body.classList.toggle('sr-immersive', !!document.fullscreenElement && mode === 'play');   // (full screen, playing: the cabinet's bar goes)
    if (!widen()) { WIDE.ox = 0; WIDE.gw = GW; }
    var dw = g.canvas.width, dh = g.canvas.height, sc = WIDE.ox ? dh / GH : info.scale;
    if (E.AIM.x0 !== 14 - WIDE.ox) { E.AIM.x0 = 14 - WIDE.ox; E.AIM.x1 = GW - 14 + WIDE.ox; }   // (the crosshair reaches the wide screen's edges)
    XO = WIDE.ox;
    if (document.pointerLockElement && (mode !== 'play' || W.mode !== 'free')) try { document.exitPointerLock(); } catch (e) {}
    if (W !== lastW) { reset(); lastW = W; lastT = W.t; lastPh = prevPh = W.phase; }
    var R = r3();
    if (mode === 'title' && W.demo) {   // the title: the game itself, cruising, at 60 steps a second
      var k = demoMs ? Math.min(4, Math.round((t - demoMs) / (1000 / 60))) : 1;
      if (k > 0) { demoMs = t; for (var d = 0; d < k; d++) E.demoStep(W); }
    } else demoMs = 0;
    for (var i = 0; i < W.fx.length; i++) { spawn(W, W.fx[i]); if (R) R.onFx(W, W.fx[i]); }
    W.fx.length = 0;
    var n = W.t - lastT; if (n > 0 && n < 12) advance(n); lastT = W.t;
    if (W.phase !== lastPh) { prevPh = lastPh; lastPh = W.phase; if (W.phase === 'clear' && !W.demo) recordMedal(W); if (W.phase === 'brief' && prevPh === 'clear') PS.flash = { c: '255,255,255', t: 34, max: 34, sq: true }; }
    W.view = set.view === 'cockpit' ? 'cockpit' : 'chase';
    g.setTransform(sc, 0, 0, sc, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, WIDE.gw, GH);
    if (!R) { waiting(g, t); flush(g); return; }
    if (R.setWide) R.setWide(WIDE.ox);
    var undo = lerpIn(W, between(t, mode));   // (drawn part-way between the last two steps; put back at the end)
    var shake = set.shake !== false && !reduced && mode === 'play' ? (W.hitT > 28 ? (W.hitT - 28) * 0.3 : 0) + (W.crashT > 0 ? W.crashT * 0.18 : 0) : 0;
    // (29 Oct, the owner: "put the resolution, the detail up ... a lot sharper") the 3D at as many pixels as this PC keeps smooth - on Sharp up to the
    // screen's own (4K) - drawn into a canvas at the screen's pixels and brought up to it sharply; Balanced and Fast cap it lower (Fast: no glow either)
    var pic = set.picture || 'sharp', px = resBudget(dw * dh, pic), k3 = Math.min(1, Math.sqrt(px / (dw * dh))), ko = Math.min(1, k3 * 1.6);
    if (RES.pic !== pic) { RES.pic = pic; R.detail && R.detail(pic === 'sharp' ? 2 : 1); R.quality(pic === 'fast' || FR.low); }
    R.setSize(Math.max(64, Math.round(dw * ko)), Math.max(64, Math.round(dh * ko)), Math.max(64, Math.round(dw * k3)), Math.max(64, Math.round(dh * k3)));
    var c3 = R.render(W, t, { paint: unlocked(set.paint || 'white') ? set.paint || 'white' : 'white', shake: set.shake !== false && !reduced, blur: set.blur !== false && !reduced });
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true;
    g.drawImage(c3, shake ? (Math.random() - 0.5) * shake * sc : 0, shake ? (Math.random() - 0.5) * shake * sc : 0, dw, dh);
    g.setTransform(sc, 0, 0, sc, 0, 0);
    if (mode === 'title' && W.demo) { if (undo) undo(); return; }
    // (29 Oct) the panel - thousands of glowing line strokes - is drawn on its own canvas at no more than HUDMAX lines and laid over the 3D: at 4K,
    // stroking it at the screen's own pixels cost more than the whole 3D picture (45 frames a second instead of 115)
    var hk = Math.min(1, HUDMAX / dh), h = g;
    if (hk < 1) { var hc = hudCanvas(Math.round(dw * hk), Math.round(dh * hk)); h = hc.getContext('2d'); h.setTransform(1, 0, 0, 1, 0, 0); h.clearRect(0, 0, hc.width, hc.height); h.setTransform(sc * hk, 0, 0, sc * hk, 0, 0); }
    var ph = W.phase;
    if (ph === 'brief') briefCard(h, W);
    else if (ph === 'logo') logoCard(h, W);   // (v33) the title
    else if (ph === 'intro' || ph === 'reunion') storyCard(h, W);   // (v31) the story's scenes
    else {
      barsOut(h, W);
      if (W.esc) { fullBar(h, 0, 30); fullBar(h, GH - 30, GH); }   // the warship's finale: a film's letterbox, nothing to aim
      hudTop(W, info); if (!W.esc && ph !== 'clear') hudBottom(W);   // (v25: the chapter card covers it - chapter 3's reaches the bottom, and its lines showed through)
      TL.hint = false;
      if (ph === 'play' && !W.esc) { marks(W); warnings(W, h); threats(W); locks(W); cursor(W); hitMark(); hurtMark(W); lockHint(W); }
      radioLine(W, h); if (ph === 'play' && !W.esc) storyLine(W);
      if (PAD.hello && performance.now() - PAD.hello < 2500) txt(C.good, 'CONTROLLER READY', CX, 228, 6, 'c');
      if (ph === 'play' && set.sound !== false && AUD.state !== 'running' && W.t > 90 && (W.t >> 5) % 2) txt(C.gold, 'CLICK OR PRESS ANY KEY FOR SOUND', CX, 204, 5, 'c');   // (a controller alone can't start sound)
      floats();
      if (ph === 'clear') tallyCard(h, W);
      else if (ph === 'end') endCard(h, W);
      else words(W, h);
    }
    flush(h, h !== g);
    overlays(h, W, ph);
    if (h !== g) { g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(h.canvas, 0, 0, dw, dh); g.setTransform(sc, 0, 0, sc, 0, 0); stampAll(g); }   // (the lines from the panel's canvas; the letters stamped sharp on top)
    if (undo) undo();
    var ms3 = performance.now() - t0, cine = !!W.esc; r3slow = ms3 > 22 && !cine ? r3slow + 1 : Math.max(0, r3slow - 2);   // (the warship's finale is heavy for a few seconds by design: it never counts against your PC)
    if (r3slow > 90) { r3slow = 0; resStep(0.75); }   // (the game itself is slow to draw on this PC: fewer pixels)
    // the frames themselves (a graphics card that cannot keep up does not show in the time above): averaged over about a third of a second. Slower
    // than about 55 a second for a second and a half: a step fewer pixels (at the floor, the glow goes too). Faster than about 80 a second for four
    // seconds (a 120 Hz screen shows it): a step more, up to the ceiling. It remembers where it settled.
    var fdt = FR.last ? t - FR.last : 0; FR.last = t;
    if (mode === 'play' && !cine && fdt > 0 && fdt < 100) {
      FR.avg = FR.avg ? FR.avg * 0.95 + fdt * 0.05 : fdt; if (RES.hold > 0) RES.hold--;
      FR.slow = FR.avg > 18.2 ? FR.slow + 1 : Math.max(0, FR.slow - 2); FR.fast = FR.avg < 12.4 ? FR.fast + 1 : 0;
      if (FR.slow > 90) { FR.slow = 0; FR.fast = 0; if (RES.px > RES.floor * 1.05) resStep(0.8); else if (!FR.low) { FR.low = true; R.quality(true); } }
      else if (FR.fast > 240 && !RES.hold && RES.px < RES.top * 0.98) { FR.fast = 0; resStep(1.18); }
    }
  }
  var FR = { last: 0, slow: 0, fast: 0, avg: 0, low: false };
  var HUDMAX = 1200, HC = null;   // (the panel's own canvas: at most 1200 lines tall - at 4K, 99 frames a second against 76 at 1440 and 45 at full size)
  function hudCanvas(w, hh) { if (!HC) HC = document.createElement('canvas'); if (HC.width !== w || HC.height !== hh) { HC.width = w; HC.height = hh; } return HC; }
  var RES = { px: 0, top: 0, floor: 6e5, hold: 0, pic: '' };   // the 3D's pixel budget
  function resBudget(native, pic) {
    RES.top = pic === 'fast' ? 9e5 : pic === 'balanced' ? 2.1e6 : Math.min(native, 8.3e6);
    if (!RES.px) { var sv = 0; try { sv = +localStorage.getItem('sr365c:res') || 0; } catch (e) {} RES.px = sv > 0 ? sv : 3.7e6; }   // (a first visit: 2560 x 1440's worth)
    RES.px = Math.max(RES.floor, Math.min(RES.top, RES.px)); return RES.px;
  }
  function resStep(k) {
    RES.px = Math.max(RES.floor, Math.min(RES.top || 8.3e6, RES.px * k)); RES.hold = k < 1 ? 1500 : 300;   // (after a step down, no step up for a while)
    try { localStorage.setItem('sr365c:res', String(Math.round(RES.px))); } catch (e) {}
  }

  // ------------------------------------------------------------ sounds and music from files (made ahead: tools/starrun/make_sfx.py for the
  // effects, ACE-Step for the music - gen_music.py); the little synth sounds below stand in until a file has loaded
  var SFX = ['laser1', 'laser2', 'laser3', 'zap', 'rocket', 'boom1', 'boom2', 'boom3', 'turret', 'bigboom2', 'bigboom', 'pop', 'hit', 'crash', 'warden', 'tower',
    'crack', 'chip', 'shielded', 'warp', 'vent', 'dead', 'brief', 'go', 'clear', 'section', 'chain', 'bonus', 'extra', 'dock', 'miss', 'tick', 'empty', 'alarm', 'warn',
    'engine', 'boost', 'brake', 'flip', 'roll', 'lock', 'lockon', 'elaser1', 'elaser2', 'elaser3', 'flak', 'mwarn', 'shieldhit', 'shieldup', 'wreck', 'ascent', 'gate',
    'flyby', 'charge', 'mine', 'radio', 'open', 'bomb', 'sonic', 'hum', 'wind', 'river', 'heart'];
  var PICK = { laser: ['laser1', 'laser2', 'laser3'], boom: ['boom1', 'boom2', 'boom3'], elaser: ['elaser1', 'elaser2', 'elaser3'] };
  var VOL = { sonic: 0.95, laser: 0.26, zap: 0.32, rocket: 0.7, boom: 0.85, turret: 0.6, bigboom2: 0.95, bigboom: 1, pop: 0.45, hit: 0.85, crash: 0.9, warden: 0.6, tower: 0.8,
    crack: 0.55, chip: 0.35, shielded: 0.5, warp: 0.55, vent: 0.9, dead: 0.9, brief: 0.45, go: 0.5, clear: 0.6, section: 0.5, chain: 0.4, bonus: 0.55, extra: 0.55,
    dock: 0.5, miss: 0.5, empty: 0.4, alarm: 0.45, warn: 0.35,
    boost: 0.75, brake: 0.5, flip: 0.75, roll: 0.55, lock: 0.45, lockon: 0.55, elaser: 0.32, flak: 0.7, mwarn: 0.5, shieldhit: 0.7, shieldup: 0.45, wreck: 0.55, ascent: 0.9, gate: 0.5, flyby: 0.8, charge: 0.6, mine: 0.6, radio: 0.7, open: 0.7, tick: 0.22, bomb: 0.8 };
  var VOLK = { quiet: 0.5, normal: 1, loud: 1.35 };
  var VARY = { laser: 1, boom: 1, pop: 1, turret: 1, crack: 1, chip: 1, zap: 1, elaser: 1, flak: 1, wreck: 1, flyby: 1 };
  var BUF = {}, SFX_ON = false, MBUF = {}, MLOAD = {};
  function loadSfx(ctx) {
    if (SFX_ON) return; SFX_ON = true;
    SFX.forEach(function (n) { fetch('sfx/' + n + '.mp3').then(function (r) { return r.ok ? r.arrayBuffer() : Promise.reject(r.status); }).then(function (b) { return ctx.decodeAudioData(b); }).then(function (buf) { BUF[n] = buf; }).catch(function () {}); });
  }
  function loadMusic(ctx, name) {
    if (MBUF[name] || MLOAD[name]) return; MLOAD[name] = true;
    fetch('music/' + name + '.mp3').then(function (r) { return r.ok ? r.arrayBuffer() : Promise.reject(r.status); }).then(function (b) { return ctx.decodeAudioData(b); }).then(function (buf) { MBUF[name] = buf; }).catch(function () { MLOAD[name] = false; });
  }
  function sample(k, name, e) {   // true when handled (played, or no sound possible)
    var ctx = k.ctx(); if (!ctx) return true;
    loadSfx(ctx);
    var list = PICK[name] || [name], b = BUF[list[Math.floor(Math.random() * list.length)]];
    if (!b) return false;
    try {
      var src = ctx.createBufferSource(), g = ctx.createGain(), node = g, pn = e && e.pan;
      src.buffer = b; if (VARY[name]) src.playbackRate.value = 0.93 + Math.random() * 0.14;
      var gv = VOL[name] == null ? 0.7 : VOL[name];
      if (e && e.tell) gv *= 0.55;                                                   // (v20) a gun about to fire: heard, not shouted
      if (e && e.d != null) gv *= Math.max(0.25, Math.min(1, 1 - e.d / 1600));         // (v20) far off is quieter
      if (e && e.n > 1 && name === 'lock') src.playbackRate.value = Math.pow(2, (e.n - 1) / 12);   // (v20) each lock a semitone higher
      if (e && e.vol) gv *= e.vol; if (e && e.rate) src.playbackRate.value = e.rate;
      gv *= VOLK[SETNOW.sfxvol] || 1;   // (v22) the Effects volume setting
      g.gain.value = gv; src.connect(g);
      if (pn && ctx.createStereoPanner) { var pp = ctx.createStereoPanner(); pp.pan.value = Math.max(-1, Math.min(1, pn)); g.connect(pp); node = pp; }
      node.connect(k.bus() || ctx.destination); src.start(ctx.currentTime + ((e && e.delay) || 0));
    } catch (er) {}
    return true;
  }
  // the music follows the game: the title theme, a calm theme for the briefings, battle music in the valley, more round the carrier, the fanfare, game over
  var LOOP = { title: true, chart: true, battle: true, assault: true }, MUS = { cur: null, gain: null, eng: null, hg: null }, AUD = { state: 'none', unlocked: false };
  function trackFor(W, mode) {
    if (mode === 'title') return 'title';
    if (mode === 'over') return 'gameover';
    var ph = W.phase;
    if (ph === 'logo') return 'title';
    if (ph === 'brief' || ph === 'intro') return 'chart';
    if (ph === 'reunion') return 'victory';
    if (ph === 'ascent') return 'title';   // the climb to space: the main theme
    if (ph === 'clear' || ph === 'end') return 'victory';
    if (ph === 'dead') return 'gameover';
    if (W.warden && W.warden.st !== 'beaten' && W.warden.st !== 'flee') return 'assault';   // (v20b) the Gaoler: its own, bigger theme
    if (W.mill || W.outrun) return 'assault';   // (chapter 3) the Millstone, and running from its blast
    return E.CHAPTERS[W.chap].id === 'valley' ? 'battle' : 'assault';
  }
  function voice(ctx, name, fadeIn) {
    var b = MBUF[name], src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = b; g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(1, ctx.currentTime + fadeIn);
    src.connect(g); g.connect(MUS.gain); src.start();
    return { name: name, src: src, g: g, t0: ctx.currentTime, dur: b.duration };
  }
  function hush(ctx, v, d) { try { v.g.gain.cancelScheduledValues(ctx.currentTime); v.g.gain.setValueAtTime(Math.max(0.0001, v.g.gain.value), ctx.currentTime); v.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d); v.src.stop(ctx.currentTime + d + 0.05); } catch (e) {} }
  function frameAudio(W, k, mode, SET) {
    var musicOn = SET.music !== false && SET.sound, ctx = SET.sound ? k.ctx() : k.existing();
    AUD.state = ctx ? ctx.state : 'none';
    if (!ctx) return;
    if (SET.sound) loadSfx(ctx);
    if (!MUS.gain) {
      var out = k.bus() || ctx.destination;
      MUS.gain = ctx.createGain(); MUS.gain.gain.value = 0.0001;
      MUS.lp = ctx.createBiquadFilter(); MUS.lp.type = 'lowpass'; MUS.lp.frequency.value = 18000; MUS.gain.connect(MUS.lp); MUS.lp.connect(out);   // (v20b)
      MUS.hg = ctx.createGain(); MUS.hg.gain.value = 0.0001; MUS.hg.connect(out);
    }
    var want = musicOn ? (mode === 'paused' && MUS.cur ? MUS.cur.name : trackFor(W, mode)) : null;
    var hush2 = W && W.finale >= 292 && W.finale < 330;   // (v20b) a breath of silence before she goes up
    MUS.gain.gain.setTargetAtTime(want && !hush2 ? (mode === 'paused' ? 0.1 : 0.4 * (VOLK[SET.musicvol] || 1) * (performance.now() < (AUD.duck || 0) ? 0.55 : 1)) : 0.0001, ctx.currentTime, hush2 ? 0.05 : 0.3);
    var quiet = mode === 'play' && W && W.phase === 'play' && W.chainLive === false && !W.warden && !W.sonic;   // (v20b) nothing to shoot: the score muffles; a fight opens it
    if (MUS.lp) MUS.lp.frequency.setTargetAtTime(quiet ? 1100 : 18000, ctx.currentTime, quiet ? 0.9 : 0.25);
    if (want) loadMusic(ctx, want);
    if (want !== (MUS.cur ? MUS.cur.name : null) && (!want || MBUF[want])) {
      if (MUS.cur) hush(ctx, MUS.cur, 1.6);
      MUS.cur = want ? voice(ctx, want, LOOP[want] ? 1.4 : 0.05) : null;
    }
    if (MUS.cur && LOOP[MUS.cur.name] && ctx.currentTime > MUS.cur.t0 + MUS.cur.dur - 2.6) {   // a seamless loop: the next copy fades in as this one ends
      var old = MUS.cur; MUS.cur = voice(ctx, old.name, 2.4); hush(ctx, old, 2.4);
    }
    // your engines: a loop that rises in pitch with your speed and roars when you boost
    var eng = SET.sound && mode === 'play' && (W.phase === 'play' || W.phase === 'ascent' || W.phase === 'brief');
    if (eng && !MUS.eng && BUF.engine) { try { var es = ctx.createBufferSource(); es.buffer = BUF.engine; es.loop = true; es.connect(MUS.hg); es.start(); MUS.eng = es; } catch (e) {} }
    var sp = Math.max(0.2, Math.min(2.6, (W.v || 0) / (W.pace || 3)));
    if (MUS.eng) MUS.eng.playbackRate.setTargetAtTime(0.62 + sp * 0.42, ctx.currentTime, 0.12);
    // (v20) out in space, a low hum under everything - the valley had wind and rock; space had nothing
    var amb = SET.sound && mode === 'play' && W.valley && W.valley.space && W.phase !== 'dead';
    if (amb && !MUS.amb && BUF.hum) { try { var as = ctx.createBufferSource(), ag = ctx.createGain(); as.buffer = BUF.hum; as.loop = true; ag.gain.value = 0.0001; as.connect(ag); ag.connect(k.bus() || ctx.destination); as.start(); MUS.amb = as; MUS.ag = ag; } catch (e) {} }
    if (MUS.ag) MUS.ag.gain.setTargetAtTime(amb ? 0.25 * (VOLK[SET.sfxvol] || 1) : 0.0001, ctx.currentTime, 0.6);
    // (v22) the valley's air: wind that rises with your speed, near the walls and when you scrape them (fading as you climb to space); the river
    // under you in the gorge; and on your last shield, your heart
    var V = W && W.valley, live = SET.sound && mode === 'play' && V && (W.phase === 'play' || W.phase === 'ascent' || W.phase === 'clear' || W.phase === 'retry'), vk = VOLK[SET.sfxvol] || 1, spd = Math.max(0, Math.min(1, (W.v || 0) / ((W.pace || 3) * 2.45)));
    var wind = 0, river = 0, heart = 0;
    if (live && !V.space) {
      var hw = V.width ? V.width(W.s) / 2 : 100, wall = V.wallAt ? V.wallAt(W.s) > 10 : true, near = wall ? Math.max(0, Math.min(1, 1 - (hw - Math.abs(W.ox || 0)) / 26)) : 0;
      wind = (0.05 + 0.2 * spd + 0.12 * near + (W.grindT > 0 ? 0.12 : 0)) * (W.ascending ? Math.max(0, 1 - (W.alt || 0) / 1500) : 1);
      (V.river || []).forEach(function (q) { var d = W.s < q[0] ? q[0] - W.s : W.s > q[1] ? W.s - q[1] : 0; river = Math.max(river, Math.max(0, 1 - d / 400) * 0.24); });
    }
    if (mode === 'play' && W && W.phase === 'play' && W.shields === 1) heart = 0.5;
    loopAt(ctx, k, 'wind', wind * vk, 0.85 + 0.4 * spd); loopAt(ctx, k, 'river', river * vk, 1); loopAt(ctx, k, 'heart', heart * vk, 1);
    MUS.hg.gain.setTargetAtTime(eng ? (W.phase === 'brief' ? 0.1 : 0.16 + 0.13 * (W.boostK || 0) + (W.sonic ? 0.05 : 0) + (W.flipT ? 0.08 : 0)) : 0.0001, ctx.currentTime, 0.25);
  }

  function loopAt(ctx, k, name, gain, rate) {   // (v22) a looping sound held at a level (started the first time it is wanted)
    var L = MUS.loops || (MUS.loops = {}), v = L[name];
    if (!v && gain > 0.001 && BUF[name]) { try { var src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = BUF[name]; src.loop = true; g.gain.value = 0.0001; src.connect(g); g.connect(k.bus() || ctx.destination); src.start(); v = L[name] = { src: src, g: g }; } catch (e) {} }
    if (!v) return;
    v.g.gain.setTargetAtTime(Math.max(0.0001, gain), ctx.currentTime, 0.35); v.src.playbackRate.setTargetAtTime(rate, ctx.currentTime, 0.3);
  }
  // ------------------------------------------------------------ sounds, made on the spot (until the files have loaded)
  function sound(name, k, e) {
    if (name === 'victory') name = 'bonus';
    if (name === 'radio' || name === 'bigboom' || name === 'hit') AUD.duck = performance.now() + 1200;   // (v20) the music dips under the radio, a big blast, a hit
    if (name === 'deflect') { sample(k, 'shielded', { rate: 1.45 }); sample(k, 'zap', { vol: 0.8 }); return; }   // (v20b) a laser sent back: a bright ring
    if (name === 'hit') sample(k, 'shieldhit', e);   // a hit: the crackle on your shields as well as the blow
    if (sample(k, name, e)) return;
    var pn = (e && e.pan) || 0;
    switch (name) {
      case 'laser': k.tone(1900, 0.14, 0.04, { type: 'sawtooth', to: 220, pan: -0.6 }); k.tone(1850, 0.14, 0.04, { type: 'sawtooth', to: 210, pan: 0.6, when: 0.012 }); k.tone(950, 0.08, 0.025, { type: 'square', to: 180 }); break;
      case 'boom': k.noise(0.9, 0.36, 2800, { to: 70, verb: 0.45, pan: pn }); k.tone(110, 0.6, 0.18, { type: 'sine', to: 30, pan: pn }); k.noise(0.25, 0.2, 6000, { type: 'highpass', to: 2000, pan: pn }); break;
      case 'pop': k.noise(0.22, 0.17, 5400, { type: 'bandpass', q: 3, to: 900, pan: pn }); k.tone(1300, 0.1, 0.04, { type: 'square', to: 2700, pan: pn }); break;
      case 'crack': k.noise(0.6, 0.3, 2200, { to: 90, verb: 0.35, pan: pn }); k.tone(160, 0.4, 0.1, { type: 'triangle', to: 50, pan: pn }); break;
      case 'chip': k.noise(0.12, 0.14, 4200, { type: 'bandpass', q: 4, to: 1800, pan: pn }); k.tone(700, 0.06, 0.03, { type: 'square', to: 500, pan: pn }); break;
      case 'shielded': k.tone(1500, 0.18, 0.04, { type: 'sine', to: 1100 }); k.tone(2250, 0.18, 0.025, { type: 'sine', to: 1650 }); break;
      case 'zap': k.tone(320, 0.28, 0.022, { type: 'triangle', to: 980, pan: pn }); break;
      case 'warn': k.tone(1320, 0.06, 0.03, { type: 'square' }); k.tone(1320, 0.06, 0.03, { type: 'square', when: 0.1 }); break;
      case 'hit': k.noise(0.55, 0.42, 1900, { to: 100 }); k.tone(150, 0.45, 0.15, { type: 'sawtooth', to: 48 }); break;
      case 'crash': k.noise(0.95, 0.5, 1000, { to: 55, verb: 0.3 }); k.tone(75, 0.65, 0.2, { type: 'square', to: 28 }); break;
      case 'tower': k.noise(1.1, 0.32, 1700, { to: 60, verb: 0.55, pan: pn }); k.tone(240, 0.7, 0.07, { type: 'triangle', to: 50, pan: pn }); k.tone(880, 0.12, 0.04, { type: 'square', to: 1760, pan: pn }); break;
      case 'turret': k.noise(0.5, 0.27, 3000, { to: 130, pan: pn }); k.tone(180, 0.32, 0.08, { type: 'square', to: 58, pan: pn }); break;
      case 'warden': k.tone(880, 0.3, 0.06, { type: 'square', to: 440 }); k.tone(1320, 0.3, 0.045, { type: 'triangle', to: 660, when: 0.05, verb: 0.4 }); break;
      case 'warp': k.noise(1.6, 0.18, 400, { type: 'bandpass', q: 2, to: 5000, verb: 0.5 }); k.tone(110, 1.4, 0.05, { type: 'sawtooth', to: 440, verb: 0.4 }); break;
      case 'brief': k.tone(523, 0.18, 0.04, { type: 'triangle', verb: 0.4 }); k.tone(784, 0.25, 0.04, { type: 'triangle', when: 0.12, verb: 0.4 }); break;
      case 'tick': k.tone(1760, 0.04, 0.025, { type: 'square' }); break;
      case 'bark': [0, 0.27].forEach(function (w, j) { k.noise(0.16, 0.42, 650 - j * 80, { type: 'bandpass', q: 1.3, to: 300, when: w, verb: 0.45 }); k.tone(175 - j * 20, 0.2, 0.16, { type: 'sawtooth', to: 92, when: w, verb: 0.45 }); k.tone(350 - j * 40, 0.12, 0.07, { type: 'square', to: 180, when: w }); }); break;   // (v36) WOOF WOOF: a boss turns up
      case 'slam': k.noise(0.3, 0.3, 1100, { to: 110, verb: 0.4 }); k.tone(98, 0.35, 0.14, { type: 'sine', to: 49 }); break;   // (v33) a title letter landing
      case 'shine': k.tone(1568, 0.6, 0.035, { type: 'sine', to: 2637, verb: 0.7 }); k.tone(2093, 0.5, 0.02, { type: 'triangle', when: 0.08, verb: 0.7 }); break;
      case 'howl': k.tone(300, 1.2, 0.06, { type: 'sawtooth', to: 640, verb: 0.7, pan: pn }); k.tone(450, 1.1, 0.04, { type: 'triangle', to: 900, when: 0.08, verb: 0.7, pan: pn }); break;   // (v32) a Howler
      case 'treat': [880, 1175, 1568].forEach(function (f, j) { k.tone(f, 0.16, 0.05, { type: 'triangle', when: j * 0.06, verb: 0.3 }); }); break;
      case 'squeak': k.tone(1700, 0.08, 0.05, { type: 'square', to: 2500 }); k.tone(2300, 0.1, 0.045, { type: 'square', to: 1600, when: 0.1 }); break;
      case 'yip': k.tone(1150, 0.07, 0.05, { type: 'square', to: 1650 }); k.tone(1250, 0.08, 0.045, { type: 'square', to: 1800, when: 0.13 }); k.noise(0.05, 0.05, 3000, { type: 'bandpass', q: 3 }); break;   // (v31) Noodle Doodles: yip-yip
      case 'dock': [392, 494, 587, 784].forEach(function (f, i) { k.tone(f, 0.3, 0.04, { type: 'sine', when: i * 0.12, verb: 0.5 }); }); break;
      case 'go': [392, 523, 659].forEach(function (f, i) { k.tone(f, 0.3, 0.045, { type: 'triangle', when: i * 0.07, verb: 0.4 }); }); break;
      case 'clear': [523, 659, 784, 1047, 1319].forEach(function (f, i) { k.tone(f, 0.26, 0.05, { type: 'square', when: i * 0.09, verb: 0.4 }); }); break;
      case 'section': k.tone(660, 0.16, 0.05, { type: 'square' }); k.tone(990, 0.22, 0.05, { type: 'square', when: 0.17 }); break;
      case 'chain': k.tone(880, 0.1, 0.04, { type: 'square', to: 1320 }); k.tone(1320, 0.12, 0.04, { type: 'square', to: 1760, when: 0.08 }); break;
      case 'alarm': for (var i = 0; i < 2; i++) { k.tone(880, 0.14, 0.04, { type: 'square', when: i * 0.34 }); k.tone(660, 0.14, 0.04, { type: 'square', when: i * 0.34 + 0.17 }); } break;
      case 'bonus': case 'extra': [784, 988, 1175, 1568].forEach(function (f, j) { k.tone(f, 0.2, 0.05, { type: 'square', when: j * 0.07, verb: 0.3 }); }); break;
      case 'vent': k.tone(220, 1.1, 0.1, { type: 'sawtooth', to: 1760 }); k.noise(1.3, 0.35, 6000, { to: 300, verb: 0.6 }); break;
      case 'bigboom': k.noise(3.4, 0.62, 1300, { to: 38, verb: 0.85 }); k.noise(2.0, 0.36, 5200, { type: 'bandpass', q: 1.5, to: 260, when: 0.1, verb: 0.5 }); k.tone(55, 3, 0.3, { type: 'sine', to: 22 }); k.tone(110, 1.8, 0.08, { type: 'sawtooth', to: 30, when: 0.2 }); break;
      case 'miss': [660, 523, 392].forEach(function (f, j) { k.tone(f, 0.22, 0.05, { type: 'triangle', when: j * 0.16 }); }); break;
      case 'dead': k.noise(2.2, 0.5, 1500, { to: 40, verb: 0.7 }); k.tone(330, 1.8, 0.1, { type: 'sawtooth', to: 40 }); break;
      case 'flip': k.noise(0.7, 0.24, 500, { type: 'bandpass', q: 1.2, to: 2600 }); k.tone(160, 0.6, 0.05, { type: 'sawtooth', to: 420 }); break;
      case 'roll': k.noise(0.4, 0.2, 700, { type: 'bandpass', q: 1.4, to: 3400 }); k.tone(300, 0.3, 0.03, { type: 'sine', to: 900 }); break;
      case 'rocket': k.noise(0.9, 0.22, 600, { type: 'bandpass', q: 1.2, to: 2400, pan: pn, verb: 0.3 }); k.tone(180, 0.5, 0.05, { type: 'sawtooth', to: 520, pan: pn }); break;
      case 'bigboom2': k.noise(1.6, 0.55, 1800, { to: 45, verb: 0.7, pan: pn }); k.tone(70, 1.2, 0.25, { type: 'sine', to: 26, pan: pn }); k.noise(0.4, 0.3, 7000, { type: 'highpass', to: 2500, pan: pn }); break;
      case 'empty': k.tone(220, 0.08, 0.04, { type: 'square', to: 160 }); break;
      case 'flyby': k.noise(0.7, 0.26, 3000, { type: 'bandpass', q: 1.2, to: 500, pan: pn }); k.tone(1400, 0.6, 0.04, { type: 'sawtooth', to: 500, pan: pn }); break;
      case 'charge': k.tone(160, 0.9, 0.05, { type: 'sawtooth', to: 1300 }); break;
      case 'radio': k.tone(1180, 0.05, 0.03, { type: 'sine' }); k.tone(1570, 0.06, 0.03, { type: 'sine', when: 0.05 }); break;
      case 'mine': [0, 0.13, 0.26].forEach(function (w) { k.tone(200, 0.12, 0.08, { type: 'square', to: 90, when: w }); }); break;
      case 'open': k.noise(0.6, 0.25, 4000, { type: 'highpass', to: 2000 }); k.tone(90, 0.4, 0.12, { type: 'sine', to: 60 }); break;
      case 'bomb': k.tone(60, 0.5, 0.25, { type: 'sine', to: 30 }); k.tone(400, 0.5, 0.05, { type: 'triangle', to: 1600 }); break;
    }
  }

  // ------------------------------------------------------------ sound: browsers allow it only after a click, a key or a touch on the page. The cabinet
  // counted only keys and clicks on the game screen itself (not the Play button, not a controller), so a game started any other way
  // stayed silent. The first real click, key or touch anywhere now switches its sound on (a key event it sees, with no key in it).
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function (e) { if (!e.isTrusted || AUD.unlocked) return; AUD.unlocked = true; try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Unidentified' })); } catch (er) {} }, true);
  });

  // ------------------------------------------------------------ a controller (an Xbox pad or any in the browser's standard mapping)
  var SETNOW = {}, PAD = { on: false, last: 0, b: [], ax: [0, 0, 0, 0], sm: [0, 0], sr: [0, 0], latch: {}, gp: null, hello: 0 }, MOUSE = { last: 0, dx: 0, dy: 0, locked: false }, PB = { t: 0, prev: false };
  function dz(v) { var a = Math.abs(v); return a < 0.12 ? 0 : Math.sign(v) * Math.pow((a - 0.12) / 0.88, 1.2); }   // (the right stick)
  // the left stick (28 Oct, after the owner found it snappy and jumpy): a ROUND dead zone - a square one snaps a slight diagonal to straight across
  // or straight up - then a curve that is gentle round the middle (small moves for fine aiming) and full at the edge. His pad rests at
  // 0.03 across, 0.07 up and down (read through Windows' XInput): well inside 0.16.
  var PAD_DZ = 0.16;
  function stickL(x, y) {
    var m = Math.sqrt(x * x + y * y); if (m < PAD_DZ) return [0, 0];
    var k = Math.min(1, (m - PAD_DZ) / (1 - PAD_DZ)), c = 0.4 * k + 0.6 * k * k * k; return [x / m * c, y / m * c];
  }
  function pollPad(mode) {   // once a frame: the first controller's sticks, triggers and buttons; presses are kept until a step uses them
    var list = navigator.getGamepads ? navigator.getGamepads() : null, gp = null, i;
    for (i = 0; list && i < list.length; i++) if (list[i] && list[i].connected) { gp = list[i]; break; }
    PAD.gp = gp;
    if (!gp) { PAD.on = false; return; }
    var b = Array.prototype.map.call(gp.buttons, function (q) { return q ? (q.value || (q.pressed ? 1 : 0)) : 0; }), edge = {};
    b.forEach(function (v, j) { if (v > 0.35 && !(PAD.b[j] > 0.35)) { edge[j] = true; PAD.latch[j] = true; } });
    var L0 = stickL(gp.axes[0] || 0, gp.axes[1] || 0), R0 = stickL(gp.axes[2] || 0, gp.axes[3] || 0);
    PAD.b = b; PAD.ax = [L0[0], L0[1], R0[0], R0[1]];
    if (b.some(function (v) { return v > 0.35; }) || PAD.ax.some(function (v) { return v !== 0; })) { if (!PAD.on) PAD.hello = performance.now(); PAD.on = true; PAD.last = performance.now(); }
    var A_ = window.ARCADE365;   // the menus: A or Menu starts a game; Menu pauses and carries on
    if (A_ && (edge[9] || edge[0])) {
      if (mode === 'title' || mode === 'over') A_.begin();
      else if (mode === 'paused') A_.resume();
      else if (mode === 'play' && edge[9]) A_.pause();
    }
  }
  function rumble(W) {   // the controller shakes when you are hit, crash, or something big goes up
    var gp = PAD.gp, s0 = 0, w0 = 0, d = 0;
    if (!gp || !gp.vibrationActuator || !PAD.on) return;
    W.events.forEach(function (e) { var k = typeof e === 'string' ? e : e && e.sfx; if (k === 'hit') { s0 = Math.max(s0, 0.55); w0 = Math.max(w0, 0.8); d = Math.max(d, 170); } else if (k === 'crash' || k === 'dead') { s0 = 1; w0 = 1; d = Math.max(d, 320); } else if (k === 'bigboom' || k === 'bigboom2') { s0 = Math.max(s0, 0.45); w0 = Math.max(w0, 0.3); d = Math.max(d, 220); } else if (k === 'warp') { w0 = Math.max(w0, 0.4); d = Math.max(d, 160); } else if (k === 'close') { w0 = Math.max(w0, 0.6); d = Math.max(d, 140); } else if (k === 'bomb') { s0 = Math.max(s0, 0.3); d = Math.max(d, 120); } else if (k === 'charge') { w0 = Math.max(w0, 0.2); d = Math.max(d, 400); } else if (k === 'boom') { w0 = Math.max(w0, 0.25); d = Math.max(d, 60); } else if (k === 'deflect') { s0 = Math.max(s0, 0.6); d = Math.max(d, 70); } else if (k === 'lock') { w0 = Math.max(w0, 0.12); d = Math.max(d, 30); } else if (k === 'rocket') { s0 = Math.max(s0, 0.35); d = Math.max(d, 50); } else if (k === 'sonic') { s0 = Math.max(s0, 0.7); w0 = Math.max(w0, 1); d = Math.max(d, 420); } });
    if (d) try { gp.vibrationActuator.playEffect('dual-rumble', { duration: d, strongMagnitude: s0, weakMagnitude: w0 }); } catch (e) {}
  }
  // the mouse in free flight: a click on the screen takes it (pointer lock) and it steers by how far it moves; Esc lets it go (and pauses)
  function screenEl() { return document.getElementById('screen'); }
  document.addEventListener('pointerdown', function (e) {
    var A_ = window.ARCADE365, W = A_ && A_.world, c = screenEl();
    if (e.pointerType !== 'mouse' || !W || A_.mode !== 'play' || W.mode !== 'free' || document.pointerLockElement || SETNOW.mouse === 'cursor' || !c || e.target !== c || !c.requestPointerLock) return;
    try { var pr = c.requestPointerLock(); if (pr && pr.catch) pr.catch(function () {}); } catch (er) {}
  }, true);
  document.addEventListener('mousemove', function (e) { if (document.pointerLockElement) { MOUSE.dx += e.movementX || 0; MOUSE.dy += e.movementY || 0; } MOUSE.last = performance.now(); });
  document.addEventListener('pointerlockchange', function () { var A_ = window.ARCADE365; if (document.pointerLockElement) MOUSE.locked = true; if (!document.pointerLockElement && A_ && A_.mode === 'play' && A_.world && A_.world.mode === 'free') A_.pause(); });

  var KB = { boost: false, brake: false, rollL: false, rollR: false, flip: false, bomb: false }, KMAP = { w: 'boost', s: 'brake', q: 'rollL', e: 'rollR', r: 'flip', b: 'bomb' };   // (B was a rocket key: now the shock bomb; Shift still locks)
  // (v20b, the owner: "when playing with the mouse, what's the thruster button?") the wheel button thrusts while held; side buttons: forward
  // thrusts, back brakes. Only over the game - never a link on the page; and the back button never takes the page back while you play.
  var MB = { thr: false, brk: false };
  function overGame(e) { return !!(document.pointerLockElement || (e.target && e.target.closest && e.target.closest('#stage, #screen, #screenwrap'))); }
  // (the cabinet cancels a press's mouse events, so the POINTER events are read: e.buttons says what is held - wheel 4, back 8, forward 16 - and
  // so fire and thrust can be held together; a press of those buttons alone is kept from the cabinet, where it would have fired)
  function mbRead(e) { if (e.pointerType !== 'mouse') return; MB.thr = !!(e.buttons & 20); MB.brk = !!(e.buttons & 8); }
  window.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || !overGame(e)) return; mbRead(e); if (e.button === 1 || e.button === 3 || e.button === 4) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  window.addEventListener('pointermove', mbRead, true);
  window.addEventListener('pointerup', function (e) { mbRead(e); if ((e.button === 1 || e.button === 3 || e.button === 4) && overGame(e)) e.preventDefault(); }, true);
  ['mouseup', 'auxclick'].forEach(function (t) { window.addEventListener(t, function (e) { if ((e.button === 1 || e.button === 3 || e.button === 4) && overGame(e)) e.preventDefault(); }, true); });
  window.addEventListener('blur', function () { MB.thr = false; MB.brk = false; });
  function typing(e) { var t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); }
  window.addEventListener('keydown', function (e) { var a = KMAP[(e.key || '').toLowerCase()]; if (!a || typing(e) || e.ctrlKey || e.altKey || e.metaKey) return; e.preventDefault(); if (a === 'bomb' && e.repeat) return; KB[a] = true; }, true);
  window.addEventListener('keyup', function (e) { var a = KMAP[(e.key || '').toLowerCase()]; if (a && a !== 'bomb' && a !== 'flip') KB[a] = false; }, true);   // (a one-press key - bomb, flip - counts once even if let go before the next step)
  window.addEventListener('blur', function () { KB.boost = KB.brake = KB.rollL = KB.rollR = false; });
  function step(W, input) {   // the cabinet's input, with ours added: our keys, the controller, the mouse's movement, the tablet's buttons
    var now = performance.now(), L = PAD.latch, pad = PAD.on && now - PAD.last < 8000 && PAD.last >= MOUSE.last, inp = {};
    for (var k in input) inp[k] = input[k];
    PAD.latch = {};
    if (WIDE.ox) { if (input.mouseX != null) inp.mouseX = input.mouseX / GW * WIDE.gw - WIDE.ox; if (input.tx != null) inp.tx = input.tx / GW * WIDE.gw - WIDE.ox; }   // (the cabinet counts 400 across the whole screen)
    inp.ctrl = document.pointerLockElement ? 'mouseaim' : pad ? 'pad' : input.touch ? 'touch' : input.mouseX == null ? 'keys' : 'mouse';
    inp.boost = KB.boost || !!input.pboost || MB.thr; inp.brake = KB.brake || !!input.pbrake || MB.brk; inp.rollL = KB.rollL; inp.rollR = KB.rollR; inp.roll = !!input.proll; inp.flip = KB.flip; KB.flip = false;
    if (input.pbrake && !PB.prev) { if (now - PB.t < 320) inp.flip = true; PB.t = now; }   // a tablet: double-tap Brake to flip
    PB.prev = !!input.pbrake;
    if (pad) {
      var b = PAD.b;
      var quick = SETNOW.padfeel === 'quick', ks = quick ? 0.55 : 0.3;   // the stick, smoothed a little each step: a twitch of the thumb is not a jolt
      PAD.sm[0] += (PAD.ax[0] - PAD.sm[0]) * ks; PAD.sm[1] += (PAD.ax[1] - PAD.sm[1]) * ks;
      if (!PAD.ax[0] && Math.abs(PAD.sm[0]) < 0.004) PAD.sm[0] = 0; if (!PAD.ax[1] && Math.abs(PAD.sm[1]) < 0.004) PAD.sm[1] = 0;
      inp.sx = PAD.sm[0]; inp.sy = SETNOW.invert ? -PAD.sm[1] : PAD.sm[1]; inp.padQuick = quick;
      // (28 Oct, the owner: the triggers should be thrust, the buttons the weapons; and fly one way while you shoot another)
      PAD.sr[0] += (PAD.ax[2] - PAD.sr[0]) * 0.35; PAD.sr[1] += (PAD.ax[3] - PAD.sr[1]) * 0.35;   // the RIGHT stick aims (a little smoothed)
      if (!PAD.ax[2] && Math.abs(PAD.sr[0]) < 0.004) PAD.sr[0] = 0; if (!PAD.ax[3] && Math.abs(PAD.sr[1]) < 0.004) PAD.sr[1] = 0;
      inp.ax = PAD.sr[0]; inp.ay = PAD.sr[1];
      inp.thr = b[7] > 0.05 ? b[7] : 0; inp.brk = b[6] > 0.05 ? b[6] : 0;   // RT thrust, LT brake: as much as you squeeze
      if (inp.thr > 0.1) inp.boost = true; if (inp.brk > 0.1) inp.brake = true;
      if (b[0] > 0.5) inp.fire = true; if (L[0]) inp.tap = true;           // A fires (and carries on past a briefing or a tally)
      if (b[2] > 0.5) inp.alt = true; if (L[2]) inp.altTap = true;         // X: a rocket, or hold to lock
      if (L[1]) inp.bomb = true;                                            // B: a shock bomb
      if (L[3]) inp.flip = true;                                            // Y flip
      if (L[4]) inp.rollL = true; if (L[5]) inp.rollR = true;               // LB / RB roll
    }
    inp.split = SETNOW.aimstyle === 'split' || (SETNOW.aimstyle !== 'together' && pad);   // fly and aim apart: a controller, unless Together; the mouse, if Separate
    inp.autoAim = { strong: 70, light: 36, off: 0 }[SETNOW.autoaim || 'strong'] || 0;   // auto-aim: how far from the crosshair it reaches
    if (KB.bomb) { inp.bomb = true; KB.bomb = false; }                      // B on the keyboard
    if (input.pbomb && !PB.bomb) inp.bomb = true; PB.bomb = !!input.pbomb;   // the tablet's Bomb button
    var ms = parseFloat(SETNOW.msens) || 1;                                  // the mouse speed setting
    inp.mdx = MOUSE.dx * ms; inp.mdy = MOUSE.dy * ms; MOUSE.dx = 0; MOUSE.dy = 0;
    keepPrev(W);
    E.step(W, inp);
    rumble(W);
  }

  // ------------------------------------------------------------ smooth motion on a fast screen (28 Oct). The game moves 60 times a second; the owner's screen
  // (like many now) shows 120 frames a second, so each step was shown twice - or, as frame timings wobble, once or three times: a judder you feel
  // most while turning. Each frame is now drawn part-way between the last two steps (how far: the same sum as the cabinet's own loop), then the
  // world is put back exactly as it was, before the next step.
  var STEP = 1000 / 60, IP = { acc: 0, last: 0, steps: 0, prev: null };
  function keepPrev(W) {   // (before each step) where everything is now
    var c = W.cam, S = W.ship, lists = [W.objs, W.eshots, W.rockets, W.bombsLive || []], i, j, o;
    IP.prev = { t: W.t, cam: [c.x, c.y, c.z, c.yaw, c.pitch, c.roll], ship: [S.x, S.y, S.z, S.yaw, S.pitch, S.roll], aim: [W.aim.x, W.aim.y], focal: W.focal || FOCAL };
    for (j = 0; j < 4; j++) for (i = 0; i < lists[j].length; i++) { o = lists[j][i]; o._pt = W.t; o._px = o.x; o._py = o.y; o._pz = o.z; }
    IP.steps++;
  }
  function between(t, mode) {   // how far between the last step and the next, 0..1 (1: no in-between)
    var dt = IP.last ? Math.min(250, t - IP.last) : 0, n = IP.steps; IP.last = t; IP.steps = 0;
    if (mode !== 'play' || n >= 8 || !IP.prev) { IP.acc = 0; return 1; }
    IP.acc += dt - n * STEP;
    if (IP.acc < -1 || IP.acc > STEP + 1) IP.acc = Math.max(0, Math.min(STEP - 0.01, IP.acc));   // (out of step with the cabinet's count: settle)
    return Math.max(0, Math.min(1, IP.acc / STEP));
  }
  function lerpIn(W, a) {   // the world drawn a fraction a of the way from the last step's start to its end; returns how to put it back
    var P = IP.prev; if (!P || P.t !== W.t - 1 || a >= 1) return null;
    var saved = [], c = W.cam, S = W.ship, f = 1 - a;
    function set(o, k, v) { saved.push(o, k, o[k]); o[k] = v; }
    set(W, '_ipA', a);   // (your laser streaks move smoothly between steps too)
    function near(x0, y0, z0, x1, y1, z1) { return (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0) + (z1 - z0) * (z1 - z0) < 3600; }   // (a jump - a checkpoint, a new chapter - is never smeared)
    function ang(a0, a1) { var d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a1 - d * f; }
    var q = P.cam;
    if (near(q[0], q[1], q[2], c.x, c.y, c.z)) {
      set(c, 'x', c.x - (c.x - q[0]) * f); set(c, 'y', c.y - (c.y - q[1]) * f); set(c, 'z', c.z - (c.z - q[2]) * f);
      set(c, 'yaw', ang(q[3], c.yaw)); set(c, 'pitch', ang(q[4], c.pitch)); set(c, 'roll', ang(q[5], c.roll));
      set(c, 'cy', Math.cos(c.yaw)); set(c, 'sy', Math.sin(c.yaw)); set(c, 'cp', Math.cos(c.pitch)); set(c, 'sp', Math.sin(c.pitch)); set(c, 'cr', Math.cos(c.roll)); set(c, 'sr', Math.sin(c.roll));
      set(W, 'focal', (W.focal || FOCAL) - ((W.focal || FOCAL) - P.focal) * f);
    }
    q = P.ship;
    if (near(q[0], q[1], q[2], S.x, S.y, S.z)) { set(S, 'x', S.x - (S.x - q[0]) * f); set(S, 'y', S.y - (S.y - q[1]) * f); set(S, 'z', S.z - (S.z - q[2]) * f); set(S, 'yaw', ang(q[3], S.yaw)); set(S, 'pitch', ang(q[4], S.pitch)); set(S, 'roll', ang(q[5], S.roll)); }
    set(W.aim, 'x', W.aim.x - (W.aim.x - P.aim[0]) * f); set(W.aim, 'y', W.aim.y - (W.aim.y - P.aim[1]) * f);
    [W.objs, W.eshots, W.rockets, W.bombsLive || []].forEach(function (list) {
      for (var i = 0; i < list.length; i++) { var o = list[i]; if (o._pt === P.t && o.x != null && near(o._px, o._py, o._pz, o.x, o.y, o.z)) { set(o, 'x', o.x - (o.x - o._px) * f); set(o, 'y', o.y - (o.y - o._py) * f); set(o, 'z', o.z - (o.z - o._pz) * f); } }
    });
    return function () { for (var i = saved.length - 3; i >= 0; i -= 3) saved[i][saved[i + 1]] = saved[i + 2]; };
  }

  A.start({
    id: 'starrun', store: 'sr365c', title: '365 Star Paws', width: GW, height: GH, waveWord: 'chapter', touchMove: true, alt: true,
    pad: [{ act: 'pbrake', label: 'Brake' }, { act: 'proll', label: 'Roll' }, { act: 'pbomb', label: 'Bomb' }, { act: 'fire', label: 'Fire', cls: 'fire' }, { act: 'alt', label: 'Rocket', cls: 'alt' }, { act: 'pboost', label: 'Boost' }],
    speeds: { options: [[1, 'Gentle'], [2, 'Classic'], [3, 'Fast']], def: 1 },
    settings: [
      { key: 'textsize', type: 'seg', label: 'Text size', small: 'Large: the radio, titles, warnings and tips half as big again.', options: [['normal', 'Normal'], ['large', 'Large']], def: 'normal' },
      { key: 'musicvol', type: 'seg', label: 'Music volume', small: 'How loud the soundtrack is against the effects.', options: [['quiet', 'Quiet'], ['normal', 'Normal'], ['loud', 'Loud']], def: 'normal' },
      { key: 'sfxvol', type: 'seg', label: 'Effects volume', small: 'Guns, engines, explosions, the radio, the wind.', options: [['quiet', 'Quiet'], ['normal', 'Normal'], ['loud', 'Loud']], def: 'normal' },
      { key: 'mouse', type: 'seg', label: 'Mouse in free flight (Fly free only)', small: 'Point to fly: click the screen, then point the mouse where you want to go and the ship flies there (Esc lets go). Edge turns: the cursor near the middle aims, towards the edge turns.', options: [['aim', 'Point to fly'], ['cursor', 'Edge turns']], def: 'aim' },
      { key: 'msens', type: 'seg', label: 'Mouse speed (Fly free only)', small: 'How far the ship turns for a move of the mouse, when you fly with the mouse (point to fly).', options: [['0.5', 'Slow'], ['0.75', 'Gentle'], ['1', 'Normal'], ['1.5', 'Quick'], ['2', 'Fastest']], def: '1' },
      { key: 'warship', type: 'seg', label: 'Strike the Warship', small: 'On a set path: your attack runs carry you round her - along her back, down each side past her generators - and you aim and shoot (easier). Fly free: go anywhere round her (harder).', options: [['path', 'On a set path'], ['free', 'Fly free']], def: 'path' },
      { key: 'aimstyle', type: 'seg', label: 'Flying and aiming', small: 'Separate: fly with the left stick (or the arrow keys) and aim with the right stick (or the mouse) - shoot one way while you fly another. Together: your ship follows the crosshair. Auto: separate with a controller, together with the mouse.', options: [['auto', 'Auto'], ['split', 'Separate'], ['together', 'Together']], def: 'auto' },
      { key: 'autoaim', type: 'seg', label: 'Auto-aim', small: 'Your lasers lock on to the target nearest the crosshair - a gold box shows it - and the bolts fly to it. Strong: a wide reach. Light: only near the crosshair. Off: you aim every shot yourself.', options: [['strong', 'Strong'], ['light', 'Light'], ['off', 'Off']], def: 'strong' },
      { key: 'picture', type: 'seg', label: 'Picture', small: 'Sharp: as many pixels as your PC keeps smooth, up to your screen\'s own (4K), with crisp shadows. Balanced: fewer pixels - for a laptop. Fast: fewer still and no glow, for an older PC.', options: [['sharp', 'Sharp'], ['balanced', 'Balanced'], ['fast', 'Fast']], def: 'sharp' },
      { key: 'blur', type: 'switch', label: 'Speed blur', small: 'At full thrust the picture streaks out from the middle, as a film camera would see it.', def: true },
      { key: 'padfeel', type: 'seg', label: 'Controller steering', small: 'Smooth: your ship gathers speed and eases to a stop, and turns build up and roll out - steady and easy. Quick: snappier, for practised players.', options: [['smooth', 'Smooth'], ['quick', 'Quick']], def: 'smooth' },
      { key: 'invert', type: 'switch', label: 'Invert up and down', small: 'For a controller or the keys: push up to dive, pull back to climb, like a plane.', def: false },
      { key: 'view', type: 'seg', label: 'View', small: 'Behind your ship (you see what you are dodging), or from its cockpit.', options: [['chase', 'Behind'], ['cockpit', 'Cockpit']], def: 'chase' },
      { key: 'paint', type: 'seg', label: 'Paint', small: 'Crimson: finish a chapter. Stealth: silver in both. Gold: gold in both. Sand: thread every squeeze. Ember: beat the Gaoler in under 40 s. Harbour: keep the carrier at 100%. Magpie: shoot down their ace. Noodle: find all three squeaky toys in a chapter.', options: [['white', 'White'], ['crimson', 'Crimson'], ['stealth', 'Stealth'], ['gold', 'Gold'], ['sand', 'Sand'], ['ember', 'Ember'], ['navy', 'Harbour'], ['magpie', 'Magpie'], ['noodle', 'Noodle']], def: 'white' },
      { key: 'music', type: 'switch', label: 'Music', small: 'An orchestral soundtrack made for the game: a calm theme for the briefings, battle music in the valley, more round the warship.', def: true },
      { key: 'shake', type: 'switch', label: 'Screen shake', small: 'The screen shakes when you are hit, scrape the rock or something big blows up nearby.', def: !reduced }
    ],
    newWorld: function (speed, set) { return E.newWorld(speed, null, 1, { view: set && set.view, warship: set && set.warship, intro: true }); },   // (v31: the opening scene first)
    hires: function () { return true; },
    step: step, hud: E.hud, draw: draw, sound: sound, frameAudio: frameAudio,
    quietSay: function () { return true; },
    overText: function (W) { return W.done ? 'Sample complete – all three chapters flown' : 'Game over – chapter ' + Math.max(1, W.stage); },   // (v20: a win no longer reads as a loss)
    titleText: 'The Magpie has stolen <b>Noodle Doodles</b>, your chihuahua &mdash; get her back. You are <b>Gull One</b>, flying the <b>Lancer</b> from the carrier <b>Harbourlight</b>: race down a winding red-rock valley at full throttle &mdash; down into a deep gorge, out over the open desert, squeezes, forks, a tunnel, the Curly Pack&rsquo;s cockapoo fighters coming at you and the <b>Gaoler</b> gunship &mdash; then make your attack runs round the Pack&rsquo;s <b>warship</b>, silence her main gun, knock out her shield generators and destroy her bridge. <b>A three-chapter sample</b> of a bigger game: then into <b>the Shoals</b>, a field of broken rock, after their ace, the Magpie - and the <b>Millstone</b>.',
    keysText: '<b>Mouse</b> to steer and aim &middot; <b>click</b> or <b>Space</b> to fire &middot; hold <b>W</b> (or the mouse&rsquo;s wheel button) for thrust, <b>S</b> brake, <b>R</b> flip &middot; <b>Q</b> / <b>E</b> roll &middot; <b>hold right-click</b> (or Shift) to lock rockets &middot; <b>B</b> shock bomb &middot; <b>P</b> pause &middot; or an <b>Xbox controller</b>',
    touchText: 'Drag anywhere to steer and aim &middot; hold <b>Fire</b> &middot; hold <b>Rocket</b> to lock several targets &middot; <b>Boost</b>, <b>Brake</b> and <b>Roll</b>',
    help: [
      '<b>The game:</b> a cinematic space shooter in chapters, each with its own briefing, its own place and its own way of flying. This sample has the first two; more are on the way.',
      '<b>A controller</b> (an Xbox pad, wired or Bluetooth - press a button once the page is open): the <b>left stick</b> flies your ship - push it and it gathers speed that way, let go and it eases to a stop (in free flight your turns build up and roll out). The <b>right stick</b> aims: push it and the crosshair moves away from where you are heading (a small diamond shows your heading), so you can fly one way and shoot another; let go and it comes back. <b>RT</b> is your <b>thrust</b> and <b>LT</b> your <b>brake</b>, as much as you squeeze. <b>A</b> fires the lasers, <b>X</b> a rocket (hold it to lock on), <b>B</b> a shock bomb, <b>Y</b> flips, <b>LB</b> / <b>RB</b> roll, <b>Menu</b> pauses. It rumbles when you are hit. In Settings: <b>Flying and aiming</b> (Separate or Together), <b>Controller steering</b> (Smooth or Quick), and up and down round like a plane.',
      '<b>Flying free (chapter 2):</b> click the screen and the mouse is yours: point it where you want to go and the ship flies there, the camera looking where you point; your guns fire at the dot when it is near the sight. <b>Mouse speed</b> is in Settings. <b>S</b> (or LT) brakes hard and tightens your turn; <b>R</b> (or Y) is the <b>thruster flip</b> &mdash; nose up and over and you come out facing the way you came, with a burst of speed. It costs a third of the gauge (the gold mark). <b>Esc</b> lets go of the mouse and pauses.',
      '<b>Speed:</b> hold <b>W</b> (or squeeze <b>RT</b>) for thrust: your ship pulls up to speed and holds it as long as you like - nearly two and a half times your cruise. Past the gold mark on the speed bar you go through the sound barrier: a bang, a cone of vapour, and a bonus that ticks up for as long as you stay supersonic. Let go and you coast back down; <b>S</b> (or <b>LT</b>) brakes for the tight bits. Faster is harder - and worth more.',
      '<b>Rolling:</b> <b>Q</b> or <b>E</b> (the Roll button on a tablet) throws your ship into a barrel roll: a quick dodge to the side that shrugs off lasers and shakes off a missile. Then a moment before you can roll again.',
      '<b>Rockets:</b> tap <b>right-click</b> (or Shift; X on a controller) for one homing rocket. <b>Hold</b> it and sweep the crosshair over up to six targets &mdash; each gets a gold diamond &mdash; then let go to fire them all. Get every one and you earn a salvo bonus.',
      '<b>Shock bombs:</b> <b>B</b> flings one at the crosshair; it bursts there and blasts everything round it &mdash; fighters, guns, mines, missiles and the lasers coming at you. You get a few in each chapter (the circles by ROCKETS) and one more at each checkpoint. <b>Flying and aiming</b> in Settings: Separate lets you fly with the arrow keys while the mouse aims.',
      '<b>Chapter 1, The Valley:</b> your ship follows the cursor. Fly through the <b>gates</b> (a run of them is worth more; gold ones double; line up near one and it draws you in), dive under the <b>arches</b>, weave round the pillars, through the dark <b>tunnel</b>, and pick a side where a ridge splits the canyon: left is tight with double points, right has the guns. The <b>Curly Pack</b>&rsquo;s cockapoo fighters come at you. <b>Yappers</b> fly in, dive from above or come in a V &mdash; the one with the <b>gold collar</b> leads the pack: down it and the rest scatter, and it drops a <b>treat</b> (spread laser, rockets and a bomb, or a shield bubble &mdash; fly through it). <b>Howlers</b> hang back and howl a shield over the whole pack &mdash; take them first (rockets break the shield). <b>Fetchers</b> throw balls &mdash; shoot them, dodge, or roll to bat them back. <b>Fluffball</b> heavies soak up lasers in their fur while they face you &mdash; use rockets, or hit them as they turn. Noodle Doodles dropped three <b>squeaky toys</b> in every chapter: find them all. At the end, the <b>Gaoler</b> gunship, in three beats: its <b>gun pods</b> glow, then fire a wall of lasers with one gap &mdash; fly for the gap or roll; then its <b>engines</b>, while it drops mines (shoot them or steer round); then its <b>core</b>: it glows, fires a beam where you were &mdash; move! &mdash; then opens for two seconds. Hit it then.',
      '<b>Chapter 2, Strike the Warship:</b> your attack runs carry you round the Pack&rsquo;s warship in a figure of eight &mdash; along her back (her <b>main gun</b>, then her <b>bridge</b>), down her left side past two <b>shield generators</b>, along her back again, then down her right side past the other two &mdash; round and round until she is done. You steer a little, aim and shoot, as in the valley; Harbourlight Control tells you what is coming. Her main gun is shelling your carrier, Harbourlight &mdash; silence it first. Knock out the four generators (green) and the bridge&rsquo;s shield drops: hit it on your next run along her back. Her guns (red corners) and waves of fighters shoot back. If Harbourlight takes too much she pulls back, and that costs you points. <b>Strike the Warship</b> in Settings can let you fly free round her instead (harder).',
      '<b>Chapter 3, the Shoals:</b> on rails through a field of broken rock. Shoot the small rocks to pieces; steer round the big ones - fly into one and you are gone. Into a hollowed-out quarry (mind its walls; at its far end a fork: the tight shaft or the guarded conveyor), after the <b>Magpie</b> through the densest rock, then the <b>Millstone</b>, a mining barge that throws rocks: its arms can only be hurt as they glow, then its cutter (find the gap in its wall of fire), then its reactor. When it goes critical, fly under it - then <b>full thrust</b> to outrun its blast.',
      '<b>Shields and ships:</b> lasers, flak, missiles, mines, crashes and scrapes each cost a shield &mdash; a red mark at the edge of the screen shows where a hit came from, and what it was. Every enemy gun <b>glows just before it fires</b>. Fighters never ram you: one that flies right past is a <b>close call</b>, worth points. Lose every shield and that ship is gone: back to the last checkpoint with fresh shields (round the warship, what you have already destroyed stays destroyed). On your last shield the enemy eases off for a few seconds.',
      '<b>The radio:</b> <b>Sanderling</b>, Harbourlight&rsquo;s controller, talks you through it &mdash; the words appear above your ships. The Pack&rsquo;s own chatter, picked up as you fly, shows in red.',
      '<b>The climb to space:</b> at the end of the valley you leave the canyon and climb &mdash; steer a little, and <b>boost</b> to climb faster &mdash; until the sky turns black and the stars come out. <b>Shields</b> recharge after four seconds clear of trouble.',
      '<b>Medals and rank:</b> each chapter ends with a tally &mdash; accuracy, time, no damage &mdash; and a bronze, silver or gold medal for that chapter&rsquo;s own score, at your speed; it tells you what gold needs and what you missed. Your best medals give you a rank and unlock <b>paint</b> for your ship (Settings): Crimson, Stealth and Gold. <b>View</b> in Settings switches between behind the ship and the cockpit.'
    ]
  });
})();
