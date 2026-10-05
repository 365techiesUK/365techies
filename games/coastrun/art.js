/* 365 Coast Run - the colours and the far hills (5 Oct 2026; the 3D models are in models3d.js). Painted by code when
 * the game first needs them, so nothing is downloaded and nothing is anyone else's: each place's colours (PAL: sky,
 * haze, grass, verge, beach, road, rumble strips) and the panorama of hills, sea, clouds and skyline that goes round the
 * horizon (bg - world3d.js wraps it round a ring far away). Units inside a painter: tenths of the game's world units.
 * window.CRArt is read by world3d.js and coastrun.js. */
(function () {
  'use strict';
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function P(c, pts, fill) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fillStyle = fill; c.fill(); }
  function lg(c, x0, y0, x1, y1, stops) { var g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }
  function rg(c, x, y, r0, r1, stops) { var g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }
  function rr(c, x, y, w, h, r, fill) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); c.fillStyle = fill; c.fill(); }
  function circ(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
  function ell(c, x, y, rx, ry, fill, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
  function hex(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, k) { var A = hex(a), B = hex(b); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * k) + ',' + Math.round(A[1] + (B[1] - A[1]) * k) + ',' + Math.round(A[2] + (B[2] - A[2]) * k) + ')'; }
  function shade(a, k) { return k >= 0 ? mix(a, '#ffffff', k) : mix(a, '#000000', -k); }
  function rnd(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var FONT = 'Archivo, "Segoe UI", Arial, sans-serif';
  function text(c, s, x, y, size, fill, align, weight) { c.font = (weight || 700) + ' ' + size + 'px ' + FONT; c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.fillStyle = fill; c.fillText(s, x, y); }
  function fitText(c, s, x, y, size, maxW, fill, weight) { c.font = (weight || 700) + ' ' + size + 'px ' + FONT; var w = c.measureText(s).width; if (w > maxW) size *= maxW / w; text(c, s, x, y, size, fill, 'center', weight); }

  // ---------------------------------------------------------------- the places' colours
  var PAL = [
    { key: 'bournemouth', sky: [[0, '#2a78d4'], [0.55, '#6db6ef'], [1, '#d4ecfa']], fog: '#cfe7f6', grass: ['#6fbd4b', '#66b244'], verge: ['#ecd7a1', '#e5ce95'], beach: ['#d9bf88', '#d2b77f'],
      sea: ['#2b90cc', '#2786c0'], foam: '#f2fbff', road: ['#6d7178', '#686c73'], rumble: ['#d8262c', '#f6f6f6'], lane: '#f6f6f6', edge: 'railing', tint: null },
    { key: 'purbeck', sky: [[0, '#3e86d8'], [0.6, '#8cc2ee'], [1, '#e6f2f6']], fog: '#dbeaf0', grass: ['#79bb50', '#6fb049'], verge: ['#79bb50', '#6fb049'], beach: null,
      sea: null, foam: null, road: ['#77756f', '#72706a'], rumble: ['#f4f4f4', '#cf2f2b'], lane: '#f2f2f2', wall: ['#a39d90', '#958f82'], tint: null },
    { key: 'forest', sky: [[0, '#5d93d1'], [0.55, '#b4c9d9'], [1, '#f4e3bf']], fog: '#ecdcb6', grass: ['#8e9c3e', '#849238'], verge: ['#9a7a3c', '#917238'], beach: null,
      sea: null, foam: null, road: ['#625f59', '#5d5a54'], rumble: ['#f2f2f2', '#2f7d43'], lane: '#efefe6', tint: ['#ffb24a', 0.08] },
    { key: 'jurassic', sky: [[0, '#2c2f6e'], [0.35, '#8a4f8a'], [0.7, '#ff8f4a'], [1, '#ffd27e']], fog: '#f4ad6c', grass: ['#6f8c3a', '#668235'], verge: ['#6a8a38', '#617f33'], beach: ['#f3ead6', '#e9dfc9'],
      sea: ['#4a5f90', '#455987'], foam: '#ffe2bf', road: ['#6d5e5c', '#685957'], rumble: ['#fff3e6', '#d0362f'], lane: '#fff1df', edge: 'fence', tint: ['#ff7a2e', 0.2] },
    { key: 'harbour', sky: [[0, '#03071a'], [0.6, '#101a44'], [1, '#2f3570']], fog: '#1c2448', grass: ['#1d2a26', '#1a2622'], verge: ['#373b45', '#33373f'], beach: ['#2d3038', '#2a2d34'],
      sea: ['#0d2140', '#0b1d39'], foam: '#6b7fae', road: ['#2b2d34', '#282a30'], rumble: ['#cfcfcf', '#a8262a'], lane: '#e6dfa8', edge: 'quay', night: true, tint: ['#1a2a6a', 0.45] },
    { key: 'needles', sky: [[0, '#6878b8'], [0.5, '#c9a8c8'], [0.82, '#f6c3bd'], [1, '#ffe6c9']], fog: '#f1d2cc', grass: ['#80a65b', '#78a053'], verge: ['#7aa257', '#729b50'], beach: ['#f4efe4', '#ebe5d8'],
      sea: ['#6f90b8', '#6a8ab1'], foam: '#fff6ee', road: ['#78757b', '#737176'], rumble: ['#fafafa', '#3b6fd6'], lane: '#fbfbfb', edge: 'fence', tint: ['#ff9ab0', 0.12] }
  ];

  // ---------------------------------------------------------------- the castle on the Purbeck skyline (painted into its panorama)
  var SPR = {
    castle: { w: 7000, h: 4200, paint: function (c) {
      c.beginPath(); c.moveTo(0, 420); c.quadraticCurveTo(160, 230, 350, 200); c.quadraticCurveTo(540, 230, 700, 420); c.fillStyle = '#5f9a45'; c.fill();
      c.beginPath(); c.moveTo(60, 420); c.quadraticCurveTo(200, 270, 350, 250); c.quadraticCurveTo(450, 260, 520, 420); c.fillStyle = '#6ea84f'; c.fill();
      var st = '#8e8c84', dk = '#6f6d66';
      P(c, [300, 214, 300, 70, 312, 60, 318, 74, 330, 62, 340, 80, 352, 58, 360, 76, 370, 64, 380, 214], st);
      P(c, [300, 214, 300, 70, 312, 60, 318, 74, 322, 214], dk);
      rr(c, 334, 110, 10, 22, 4, '#3b3a36'); rr(c, 334, 160, 10, 18, 4, '#3b3a36');
      P(c, [200, 236, 210, 190, 228, 196, 240, 180, 260, 200, 300, 200, 300, 232], st);
      P(c, [380, 210, 420, 196, 440, 210, 470, 200, 490, 238, 380, 238], st);
      P(c, [470, 238, 476, 160, 486, 150, 496, 166, 500, 240], dk);
    } }
  };
  var SPR_RES = 0.32;   // pixels per world unit for the biggest copy of each picture
  var cache = {};
  function sprite(t, v, night, tint, txt) {   // [biggest, half, quarter, ...] copies of a picture
    var key = t + '|' + v + '|' + (night ? 1 : 0) + '|' + (tint ? tint[0] : '') + '|' + (txt || '');
    var m = cache[key]; if (m) return m;
    var S = SPR[t]; if (!S) return null;
    var w = S.w * SPR_RES, h = S.h * SPR_RES, c0 = canvas(w, h), x = c0.getContext('2d');
    x.scale(w / (S.w / 10), h / (S.h / 10));
    S.paint(x, v, night, txt);
    if (tint) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = tint[1]; x.fillStyle = tint[0]; x.fillRect(0, 0, c0.width, c0.height); }
    m = [c0];
    while (m[m.length - 1].width > 24 && m[m.length - 1].height > 24) {
      var p = m[m.length - 1], q = canvas(p.width / 2, p.height / 2), qx = q.getContext('2d');
      qx.imageSmoothingEnabled = true; qx.imageSmoothingQuality = 'high'; qx.drawImage(p, 0, 0, q.width, q.height); m.push(q);
    }
    return (cache[key] = m);
  }

  // ---------------------------------------------------------------- skies and hills behind each stretch
  var BG_W = 1152, BG_H = 132;   // a panorama three screens wide; the horizon is 26 from its bottom
  var HZ = BG_H - 26;
  function hills(c, r, y, amp, n, col, wav) {   // a wrapping line of hills across the panorama
    var pts = [], k, seeds = [];
    for (k = 0; k < n; k++) seeds.push([r() * 6.28, 0.5 + r() * 1.5]);
    c.beginPath(); c.moveTo(0, BG_H);
    for (var x = 0; x <= BG_W; x += 4) {
      var h = 0; for (k = 0; k < n; k++) h += Math.sin(x / BG_W * Math.PI * 2 * Math.max(1, Math.round((k + 1) * (wav || 1))) + seeds[k][0]) * seeds[k][1] / (k + 1);   // whole waves: it joins up
      c.lineTo(x, y - Math.abs(h) * amp);
    }
    c.lineTo(BG_W, BG_H); c.closePath(); c.fillStyle = col; c.fill();
    void pts;
  }
  function wrap(x, w, f) { f(x); if (x - w < 0) f(x + BG_W); if (x + w > BG_W) f(x - BG_W); }   // drawn again across the join
  function cloud(c, x0, y, w, col, sh) { wrap(x0, w, function (x) { cloud1(c, x, y, w, col, sh); }); }
  function cloud1(c, x, y, w, col, sh) {
    for (var i = 0; i < 7; i++) { var px = x + (i / 6 - 0.5) * w, py = y - Math.sin(i / 6 * Math.PI) * w * 0.18; ell(c, px, py + 2, w * 0.2, w * 0.12, sh); }
    for (var j = 0; j < 7; j++) { var qx = x + (j / 6 - 0.5) * w, qy = y - Math.sin(j / 6 * Math.PI) * w * 0.2; ell(c, qx, qy, w * 0.19, w * 0.13, col); }
  }
  function treeline(c, r, y, h, cols, gap) {
    for (var x0 = 0; x0 < BG_W; x0 += gap * (0.6 + r() * 0.8)) { (function (x0, hh, col) { wrap(x0, gap, function (x) { ell(c, x, y - hh * 0.5, gap * 0.9, hh * 0.6, col); }); })(x0, h * (0.6 + r() * 0.6), cols[(r() * cols.length) | 0]); }
    c.fillStyle = cols[0]; c.fillRect(0, y - 2, BG_W, BG_H - y + 2);
  }
  function seaBand(c, top, cols, glint) {
    c.fillStyle = lg(c, 0, top, 0, BG_H, [[0, cols[0]], [1, cols[1]]]); c.fillRect(0, top, BG_W, BG_H - top);
    if (glint) { var r = rnd(5); for (var i = 0; i < 160; i++) { var y = top + 1 + Math.pow(r(), 1.5) * (BG_H - top - 1); rr(c, r() * BG_W, y, 1 + r() * 4, 0.5, 0.2, glint); } }
  }
  var BG = {
    bournemouth: function (far, near) {
      var r = rnd(101);
      for (var i = 0; i < 9; i++) { var c0 = [r() * BG_W, 20 + r() * 40, 40 + r() * 60]; if (!SKY3D) cloud(far, c0[0], c0[1], c0[2], '#ffffff', 'rgba(140,170,200,0.35)'); }
      hills(far, r, HZ, 10, 3, '#9fb7a6', 0.5);
      far.fillStyle = '#a7c3b4'; far.fillRect(0, HZ - 3, BG_W, 3);
      P(far, [80, HZ, 120, HZ - 14, 190, HZ - 18, 240, HZ - 6, 250, HZ], '#b6cbb9'); P(far, [240, HZ - 6, 250, HZ, 244, HZ, 238, HZ - 5], '#f2efe6');
      seaBand(far, HZ, ['#5aa7d8', '#3b92c8'], 'rgba(255,255,255,0.7)');
      P(near, [0, HZ, 0, HZ - 14, 60, HZ - 22, 140, HZ - 20, 200, HZ - 10, 260, HZ], '#c9b48a');
      treeline(near, r, HZ - 14, 12, ['#3f8a46', '#4f9a4a', '#2f7a3a'], 10);
      for (var h = 0; h < 9; h++) {   // the clifftop hotels
        var hx = 330 + h * 58 + (h % 2) * 8, hh = 14 + (h % 3) * 6, hw = 30 + (h % 2) * 10;
        rr(near, hx, HZ - 8 - hh, hw, hh, 1, ['#f2ead8', '#e6e0d4', '#f8f2e4'][h % 3]);
        P(near, [hx - 2, HZ - 8 - hh, hx + hw + 2, HZ - 8 - hh, hx + hw - 4, HZ - 14 - hh, hx + 4, HZ - 14 - hh], ['#9a5b45', '#6d7a86', '#8a4f3c'][h % 3]);
        for (var wy = HZ - 4 - hh; wy < HZ - 10; wy += 4.5) for (var wx = hx + 3; wx < hx + hw - 3; wx += 4) rr(near, wx, wy, 2.2, 2.2, 0.3, 'rgba(80,120,150,0.6)');
      }
    },
    purbeck: function (far, near) {
      var r = rnd(202);
      for (var i = 0; i < 8; i++) { var c0 = [r() * BG_W, 18 + r() * 34, 50 + r() * 60]; if (!SKY3D) cloud(far, c0[0], c0[1], c0[2], '#ffffff', 'rgba(150,170,200,0.3)'); }
      hills(far, r, HZ, 26, 3, '#9cbf9a', 0.8);
      SPR_BG(far, 'castle', 520, HZ - 18, 120);
      hills(near, r, HZ + 6, 22, 4, '#6faa4f', 1);
      hills(near, r, HZ + 14, 12, 3, '#5f9c45', 1.5);
    },
    forest: function (far, near) {
      var r = rnd(303);
      for (var i = 0; i < 6; i++) { var c0 = [r() * BG_W, 26 + r() * 30, 60 + r() * 50]; if (!SKY3D) cloud(far, c0[0], c0[1], c0[2], '#fff8ea', 'rgba(200,170,130,0.3)'); }
      hills(far, r, HZ, 12, 3, '#8fa6b8', 0.6);
      treeline(near, r, HZ + 8, 30, ['#6b4a1e', '#a0561e', '#c47a26', '#7a6a22', '#3a4a22', '#b8902a'], 12);
    },
    jurassic: function (far, near) {
      var r = rnd(404), sx = 610, sy = HZ - 12;
      if (!SKY3D) { far.fillStyle = rg(far, sx, sy, 4, 160, [[0, 'rgba(255,240,180,0.95)'], [0.15, 'rgba(255,190,90,0.5)'], [1, 'rgba(255,140,60,0)']]); far.fillRect(0, 0, BG_W, BG_H);
      circ(far, sx, sy, 22, '#fff1c2'); circ(far, sx, sy, 19, '#ffe08a'); }
      for (var i = 0; i < 12; i++) { (function (y, x0, w, hh0) { if (!SKY3D) wrap(x0, w, function (x) { ell(far, x, y, w, hh0, 'rgba(255,170,120,0.55)'); ell(far, x, y + 2, w * 0.9, 1.6, 'rgba(120,60,90,0.35)'); }); })(14 + r() * 60, r() * BG_W, 60 + r() * 140, 2.5 + r() * 2); }
      P(far, [700, HZ, 760, HZ - 18, 860, HZ - 24, 960, HZ - 10, 1000, HZ], '#7a4a6a'); P(far, [100, HZ, 140, HZ - 10, 260, HZ - 14, 320, HZ], '#8a5a72');
      seaBand(far, HZ, ['#6a5a8a', '#3f4f80'], null);
      var gr = rg(far, sx, HZ + 4, 2, 120, [[0, 'rgba(255,220,140,0.9)'], [1, 'rgba(255,160,80,0)']]); far.fillStyle = gr;
      for (var k = 0; k < 60; k++) { var yy = HZ + 1 + k * 0.42, ww = 6 + k * 2.2; far.fillRect(sx - ww / 2 + Math.sin(k * 7.1) * 6, yy, ww, 0.3); }
      hills(near, r, HZ + 10, 18, 3, '#4d5e2a', 0.7);
    },
    harbour: function (far, near) {
      var r = rnd(505);
      for (var i = 0; i < 220; i++) { var s0 = [r() * BG_W, Math.pow(r(), 1.6) * (HZ - 20), r() < 0.1 ? 0.9 : 0.5, 0.4 + r() * 0.6]; if (!SKY3D) circ(far, s0[0], s0[1], s0[2], 'rgba(255,255,255,' + s0[3] + ')'); }
      if (!SKY3D) { circ(far, 860, 30, 10, '#f4f1e0'); circ(far, 856, 28, 10, 'rgba(16,26,68,0.0)');
      far.fillStyle = rg(far, 860, 30, 8, 60, [[0, 'rgba(240,240,220,0.35)'], [1, 'rgba(240,240,220,0)']]); far.fillRect(780, 0, 160, 100);
      far.fillStyle = rg(far, 400, HZ, 10, 300, [[0, 'rgba(255,170,90,0.35)'], [1, 'rgba(255,170,90,0)']]); far.fillRect(0, 0, BG_W, BG_H); }
      for (var x = 0; x < BG_W - 20; x += 8 + r() * 14) {
        var h = 8 + Math.pow(r(), 2) * 40, w = 8 + r() * 16; rr(far, x, HZ - h, w, h, 0.5, '#0b1020');
        for (var wy = HZ - h + 3; wy < HZ - 2; wy += 4) for (var wx = x + 2; wx < x + w - 2; wx += 3) if (r() < 0.35) rr(far, wx, wy, 1.2, 1.4, 0.2, r() < 0.8 ? '#ffd27a' : '#cfe8ff');
      }
      seaBand(far, HZ, ['#0f2448', '#071530'], null);
      for (var k = 0; k < 300; k++) rr(far, r() * BG_W, HZ + 1 + r() * 24, 1 + r() * 5, 0.5, 0.2, r() < 0.7 ? 'rgba(255,200,110,0.6)' : 'rgba(180,220,255,0.5)');
    },
    needles: function (far, near) {
      var r = rnd(606);
      for (var i = 0; i < 14; i++) { (function (y, x0, w, hh0) { if (!SKY3D) wrap(x0, w, function (x) { ell(far, x, y, w, hh0, 'rgba(255,230,235,0.45)'); }); })(14 + r() * 50, r() * BG_W, 80 + r() * 160, 3 + r() * 3); }
      if (!SKY3D) { far.fillStyle = rg(far, 300, HZ, 4, 200, [[0, 'rgba(255,230,190,0.8)'], [1, 'rgba(255,200,180,0)']]); far.fillRect(0, 0, BG_W, BG_H); }
      P(far, [500, HZ, 540, HZ - 16, 700, HZ - 22, 820, HZ - 18, 900, HZ], '#d9c9d2'); P(far, [500, HZ, 540, HZ - 16, 560, HZ - 15, 548, HZ], '#f6efe8');
      seaBand(far, HZ, ['#9fb3d0', '#7b97bd'], 'rgba(255,240,230,0.7)');
      hills(near, r, HZ + 10, 16, 3, '#6f9a52', 0.7);
    }
  };
  function SPR_BG(c, t, x, y, w) { var S = SPR[t], m = sprite(t, 0, false, null)[0], h = w * S.h / S.w; c.drawImage(m, x - w / 2, y - h, w, h); }
  var bgCache = {};
  var SKY3D = false;   // the 3D game draws its own sky (clouds, sun, moon, stars): the panorama is then just the land and sea
  function bg(key, res, sky3d) {   // {far, near} canvases for a place, painted at res pixels per game unit
    var k = key + '|' + res + '|' + !!sky3d; if (bgCache[k]) return bgCache[k];
    SKY3D = !!sky3d;
    var out = {}, mk = function () { var c = canvas(BG_W * res, BG_H * res), x = c.getContext('2d'); x.scale(res, res); return [c, x]; };
    var f = mk(), n = mk();
    BG[key](f[1], n[1]);
    out.far = f[0]; out.near = n[0];
    var keys = Object.keys(bgCache); if (keys.length > 4) delete bgCache[keys[0]];
    return (bgCache[k] = out);
  }
  function flush() { cache = {}; bgCache = {}; }

  window.CRArt = { PAL: PAL, SPR: SPR, sprite: sprite, bg: bg, BG_W: BG_W, BG_H: BG_H, HZ: HZ, flush: flush,
    mix: mix, shade: shade, hex: hex, rr: rr, P: P, circ: circ, ell: ell, lg: lg, rg: rg, text: text, FONT: FONT };
})();
