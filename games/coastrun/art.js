/* 365 Coast Run - the artwork (5 Oct 2026): every picture is painted by code when the game first needs it, so nothing is
 * downloaded and nothing is anyone else's. The places' colours (PAL), the roadside things (SPR - painted at a set
 * resolution, then halved and halved again so a far tree is drawn from a small copy), the traffic seen from behind (VEH),
 * and the skies and hills behind each stretch (bg). Units inside a painter: tenths of the game's world units.
 * window.CRArt is read by coastrun.js. */
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

  // ---------------------------------------------------------------- the roadside things: w, h in world units; paint(c, v, night) in tenths
  var GREENS = ['#2f7d32', '#3f8f3a', '#4ea644'], AUTUMN = [['#c8641e', '#e08a2a', '#f2b237', '#9b4a1c'], ['#b8452a', '#d0622c', '#e8973a', '#7f3a1e']];
  function trunk(c, x, y0, y1, w0, w1, col) { P(c, [x - w0, y0, x + w0, y0, x + w1, y1, x - w1, y1], col); }
  function canopy(c, cx, cy, rx, ry, cols, seed, n) {   // a tree's leaves: overlapping blobs, dark underneath, lit on top
    var r = rnd(seed), i;
    for (i = 0; i < n; i++) { var a = r() * Math.PI * 2, d = Math.sqrt(r()); ell(c, cx + Math.cos(a) * rx * 0.7 * d, cy + Math.sin(a) * ry * 0.7 * d + ry * 0.12, rx * (0.32 + r() * 0.2), ry * (0.3 + r() * 0.18), cols[0]); }
    for (i = 0; i < n; i++) { var a2 = r() * Math.PI * 2, d2 = Math.sqrt(r()); ell(c, cx + Math.cos(a2) * rx * 0.62 * d2, cy + Math.sin(a2) * ry * 0.6 * d2 - ry * 0.05, rx * (0.26 + r() * 0.18), ry * (0.24 + r() * 0.16), cols[1]); }
    for (i = 0; i < n * 0.7; i++) { var a3 = -Math.PI / 2 + (r() - 0.5) * 2.2, d3 = Math.sqrt(r()); ell(c, cx + Math.cos(a3) * rx * 0.55 * d3 - rx * 0.1, cy + Math.sin(a3) * ry * 0.55 * d3 - ry * 0.12, rx * (0.16 + r() * 0.14), ry * (0.14 + r() * 0.12), cols[2]); }
    if (cols[3]) for (i = 0; i < n * 0.5; i++) { ell(c, cx + (r() - 0.5) * rx * 1.3, cy + (r() - 0.3) * ry * 1.1, rx * 0.08, ry * 0.06, cols[3]); }
  }
  function posts(c, x0, x1, y0, H, col) { rr(c, x0 - 1.6, y0, 3.2, H - y0, 1, col); rr(c, x1 - 1.6, y0, 3.2, H - y0, 1, col); }

  var SPR = {
    palm: { w: 900, h: 2300, paint: function (c, v) {
      var lean = [6, -8, 3][v % 3], top = 40;
      c.lineCap = 'round';
      for (var i = 0; i < 18; i++) {   // the ringed trunk, curving
        var p0 = i / 18, p1 = (i + 1) / 18, x0 = 45 + lean * p0 * p0 * 2, x1 = 45 + lean * p1 * p1 * 2, y0 = 230 - p0 * (230 - top), y1 = 230 - p1 * (230 - top), w = 6 - p0 * 2.4;
        P(c, [x0 - w, y0, x0 + w, y0, x1 + w * 0.92, y1, x1 - w * 0.92, y1], i % 2 ? '#8a6a45' : '#9c7a52');
        P(c, [x0 - w, y0, x0 - w * 0.3, y0, x1 - w * 0.3, y1, x1 - w * 0.92, y1], 'rgba(60,40,20,0.25)');
      }
      var tx = 45 + lean * 2, cols = ['#2e7a34', '#3d9440', '#57ad4a'];
      for (var k = 0; k < 9; k++) {   // fronds
        var a = -Math.PI / 2 + (k - 4) * 0.42 + (k % 2 ? 0.08 : -0.05), L = 34 + (k % 3) * 5, droop = Math.abs(k - 4) * 3.4 + 4;
        var ex = tx + Math.cos(a) * L * 1.05, ey = top + Math.sin(a) * L * 0.55 + droop * 1.6;
        c.beginPath(); c.moveTo(tx, top);
        c.quadraticCurveTo(tx + Math.cos(a) * L * 0.6, top + Math.sin(a) * L * 0.7 - 6, ex, ey);
        c.quadraticCurveTo(tx + Math.cos(a) * L * 0.55, top + Math.sin(a) * L * 0.55 + 4, tx, top + 3);
        c.fillStyle = cols[k % 3]; c.fill();
      }
      circ(c, tx - 3, top + 4, 3.4, '#6b4a22'); circ(c, tx + 3, top + 5, 3.2, '#7a5628'); circ(c, tx, top + 7, 3, '#5e4019');
    } },
    lamp: { w: 300, h: 1900, paint: function (c, v, night) {
      var col = night ? '#141a20' : '#1f4a3f';
      rr(c, 11, 182, 8, 8, 1.5, col); rr(c, 13.2, 40, 3.6, 146, 1, col);
      for (var i = 0; i < 3; i++) rr(c, 12.3, 60 + i * 40, 5.4, 2.4, 1, shade(col, 0.15));
      c.strokeStyle = col; c.lineWidth = 2.2; c.beginPath(); c.moveTo(15, 42); c.quadraticCurveTo(15, 26, 25, 26); c.stroke();
      P(c, [21, 26, 29, 26, 28, 20, 22, 20], col);
      P(c, [21.5, 27, 28.5, 27, 27.4, 36, 22.6, 36], night || v ? '#fff1b0' : '#e8f2f2');
      P(c, [20, 36, 30, 36, 29, 38.5, 21, 38.5], col);
    } },
    hut: { w: 900, h: 1100, paint: function (c, v) {
      var cols = ['#3fa7d6', '#f2c14e', '#e4572e', '#76b041', '#f4f1ea', '#d7263d'], col = cols[v % 6], trim = v % 6 === 4 ? '#3fa7d6' : '#ffffff';
      rr(c, 6, 104, 78, 6, 1, '#b99a6a');
      P(c, [10, 104, 80, 104, 80, 46, 10, 46], col);
      for (var x = 14; x < 80; x += 6) P(c, [x, 48, x + 0.8, 48, x + 0.8, 104, x, 104], 'rgba(0,0,0,0.08)');
      P(c, [2, 48, 45, 18, 88, 48, 83, 50, 45, 24, 7, 50], trim); P(c, [7, 50, 45, 24, 83, 50, 80, 50, 45, 27, 10, 50], shade(col, -0.25));
      P(c, [33, 104, 57, 104, 57, 60, 33, 60], shade(col, -0.12)); P(c, [44.4, 60, 45.6, 60, 45.6, 104, 44.4, 104], trim);
      rr(c, 30, 60, 30, 2.5, 0.5, trim); circ(c, 41, 84, 1.3, '#555');
      P(c, [10, 46, 80, 46, 80, 52, 10, 52], 'rgba(0,0,0,0.18)');
    } },
    brolly: { w: 700, h: 650, paint: function (c, v) {
      var cols = [['#e63946', '#ffffff'], ['#1d7fd6', '#ffffff'], ['#f4a261', '#2a9d8f'], ['#ffd23f', '#ee4266']][v % 4];
      rr(c, 34, 14, 2, 50, 0.5, '#e8e1d0');
      for (var i = 0; i < 6; i++) { var a0 = Math.PI + i * Math.PI / 6, a1 = a0 + Math.PI / 6; c.beginPath(); c.moveTo(35, 14); c.arc(35, 26, 32, a0, a1); c.closePath(); c.fillStyle = cols[i % 2]; c.fill(); }
      P(c, [3, 26, 67, 26, 64, 28, 6, 28], 'rgba(0,0,0,0.15)');
      ell(c, 35, 62, 22, 2.5, 'rgba(0,0,0,0.12)');
      P(c, [44, 62, 58, 62, 62, 44, 50, 44], cols[0]); P(c, [44, 62, 45, 62, 51, 46, 50, 44], '#7a5a3a'); P(c, [57, 62, 58, 62, 62.5, 45, 61.5, 44], '#7a5a3a');
    } },
    bush: { w: 900, h: 600, paint: function (c, v) {
      var cols = v ? ['#2b6a2e', '#357a35', '#3f8a3c'] : ['#3c8a3a', '#4fa246', '#64b852'];
      canopy(c, 45, 36, 42, 26, cols, 31 + v, 14);
      if (!v) { var r = rnd(9); for (var i = 0; i < 18; i++) circ(c, 10 + r() * 70, 22 + r() * 30, 1.6, ['#ff5fa2', '#ffd23f', '#ffffff', '#ff7b39'][i % 4]); }
    } },
    hotel: { w: 3600, h: 3000, paint: function (c, v) {
      var walls = ['#f2ead8', '#e9e2d6', '#f6efe0', '#dfe6ea'][v % 4], roof = ['#7d4b3a', '#5a6670', '#8a5a44', '#4f5d6a'][v % 4];
      P(c, [10, 300, 350, 300, 350, 70, 10, 70], walls); P(c, [10, 300, 40, 300, 40, 70, 10, 70], 'rgba(0,0,0,0.06)');
      P(c, [0, 72, 180, 22, 360, 72], roof);
      for (var f = 0; f < 6; f++) for (var w = 0; w < 9; w++) {
        var x = 28 + w * 36, y = 90 + f * 34;
        rr(c, x, y, 20, 22, 2, f === 0 && w % 3 === 1 ? '#c9e3f2' : '#9cc4dc'); rr(c, x, y + 20, 20, 3, 1, '#ffffff');
        if (f > 0 && w % 2 === 0) rr(c, x - 3, y + 22, 26, 2, 1, '#8b8f94');
      }
      rr(c, 140, 262, 80, 38, 3, '#6b4b34'); rr(c, 120, 252, 120, 9, 2, ['#1d4e89', '#7a1f2b', '#1f6f50', '#333'][v % 4]);
    } },
    yacht: { w: 1600, h: 2600, paint: function (c, v, night) {
      var nightBoat = v >= 3, hull = ['#ffffff', '#1d3557', '#f1faee'][v % 3];
      if (nightBoat) hull = '#202a3a';
      P(c, [10, 236, 150, 236, 140, 254, 22, 254], hull); P(c, [10, 236, 150, 236, 149, 240, 11, 240], nightBoat ? '#3c4a60' : '#cfd8dc');
      P(c, [40, 236, 110, 236, 104, 222, 50, 222], nightBoat ? '#2d394d' : '#e9eef0');
      rr(c, 79, 40, 2.4, 196, 1, nightBoat ? '#4a5568' : '#c8c8c8');
      if (!nightBoat) { P(c, [82, 46, 82, 222, 138, 222], '#fdfdfd'); P(c, [78, 60, 78, 220, 30, 220], '#f2f2f2'); P(c, [82, 46, 82, 222, 88, 222], 'rgba(0,0,0,0.06)'); }
      else { for (var i = 0; i < 4; i++) rr(c, 54 + i * 12, 226, 6, 4, 1, '#ffd98a'); }
      ell(c, 80, 256, 70, 3, 'rgba(255,255,255,0.35)');
    } },
    pier: { w: 9000, h: 1400, paint: function (c) {
      var deckY = 92;
      for (var x = 8; x < 880; x += 22) { rr(c, x, deckY, 3.4, 48, 1, '#5b4636'); P(c, [x - 2, deckY + 46, x + 5.4, deckY + 46, x + 3.4, deckY + 48, x, deckY + 48], 'rgba(255,255,255,0.6)'); }
      for (var x2 = 8; x2 < 870; x2 += 44) { c.strokeStyle = '#4a3a2e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x2, deckY + 4); c.lineTo(x2 + 22, deckY + 40); c.moveTo(x2 + 22, deckY + 4); c.lineTo(x2, deckY + 40); c.stroke(); }
      rr(c, 0, deckY - 4, 900, 7, 1, '#e8e0cf'); rr(c, 0, deckY - 12, 900, 1.6, 0.5, '#2e5d6b');
      for (var p = 0; p < 900; p += 8) rr(c, p, deckY - 12, 1, 8, 0, '#2e5d6b');
      // the pavilion at the end
      P(c, [640, deckY - 4, 880, deckY - 4, 880, deckY - 46, 640, deckY - 46], '#f4efe4');
      for (var w = 0; w < 9; w++) rr(c, 652 + w * 25, deckY - 38, 14, 22, 2, '#7fb4d1');
      P(c, [630, deckY - 46, 890, deckY - 46, 860, deckY - 66, 660, deckY - 66], '#3f7f8f');
      c.beginPath(); c.arc(760, deckY - 66, 26, Math.PI, 0); c.fillStyle = '#3f7f8f'; c.fill(); rr(c, 758, deckY - 104, 4, 14, 1, '#3f7f8f'); P(c, [760, deckY - 112, 766, deckY - 104, 754, deckY - 104], '#d62828');
      for (var l = 0; l < 900; l += 60) circ(c, l + 10, deckY - 16, 2, '#fff4c2');
    } },
    oak: { w: 2000, h: 2400, paint: function (c, v) {
      trunk(c, 100, 240, 120, 9, 5, '#5a4632'); P(c, [100, 160, 70, 115, 74, 112, 102, 150], '#5a4632'); P(c, [100, 150, 132, 108, 128, 106, 98, 140], '#5a4632');
      canopy(c, 100, 92, 92, 78, v ? AUTUMN[v - 1] : GREENS, 11 + v * 7, 22);
    } },
    beech: { w: 1800, h: 2600, paint: function (c, v) {
      trunk(c, 90, 260, 110, 7, 4, '#7d7b74');
      canopy(c, 90, 96, 80, 92, v ? ['#8a3a1c', '#b5522a', '#d9813a', '#6b2c14'] : GREENS, 21 + v * 5, 22);
    } },
    pine: { w: 1100, h: 2800, paint: function (c, v) {
      trunk(c, 55, 280, 60, 4.5, 2.5, '#9a5a32');
      var r = rnd(41 + v), cols = ['#1f4d2e', '#2a6136', '#3a7a40'];
      for (var i = 0; i < 6; i++) { var y = 34 + i * 26 + r() * 6, x = 55 + (r() - 0.5) * 34; ell(c, x, y, 26 + r() * 14, 13 + r() * 5, cols[0]); ell(c, x - 3, y - 4, 22 + r() * 10, 9 + r() * 4, cols[1]); ell(c, x - 6, y - 7, 12 + r() * 6, 5 + r() * 2, cols[2]); }
    } },
    birch: { w: 900, h: 2400, paint: function (c, v) {
      trunk(c, 45, 240, 50, 3.6, 2, '#ecebe6');
      var r = rnd(61 + v); for (var i = 0; i < 16; i++) rr(c, 41.5 + r() * 4, 60 + r() * 176, 3 + r() * 2.5, 1.4, 0.4, '#2d2d2d');
      canopy(c, 45, 72, 40, 66, v ? ['#b8901e', '#e0b830', '#f5d55a', '#8a6a18'] : GREENS, 71 + v, 18);
    } },
    sheep: { w: 420, h: 300, paint: function (c, v) {
      var f = v % 2 ? -1 : 1; c.save(); if (f < 0) { c.translate(42, 0); c.scale(-1, 1); }
      rr(c, 10, 18, 2.2, 12, 1, '#2b2b2b'); rr(c, 28, 18, 2.2, 12, 1, '#2b2b2b');
      ell(c, 20, 15, 15, 9, '#f2efe6'); ell(c, 17, 12, 9, 5, '#ffffff');
      ell(c, 36, 12, 4.6, 5.4, '#2b2b2b');
      c.restore();
    } },
    hay: { w: 600, h: 450, paint: function (c) {
      ell(c, 30, 24, 28, 20, '#d9b450'); ell(c, 30, 24, 20, 14, '#e8c86a'); c.strokeStyle = '#c29c3a'; c.lineWidth = 1.2;
      for (var r = 4; r < 20; r += 4) { c.beginPath(); c.ellipse(30, 24, r, r * 0.7, 0, 0, Math.PI * 2); c.stroke(); }
    } },
    cottage: { w: 2600, h: 1900, paint: function (c, v) {
      var wall = v ? '#f3ead2' : '#eee3c8';
      P(c, [20, 190, 240, 190, 240, 100, 20, 100], wall);
      rr(c, 196, 30, 16, 50, 2, '#8a7a6a');
      c.beginPath(); c.moveTo(6, 108); c.quadraticCurveTo(20, 50, 130, 36); c.quadraticCurveTo(240, 50, 254, 108); c.quadraticCurveTo(130, 118, 6, 108); c.fillStyle = '#c9a050'; c.fill();
      c.beginPath(); c.moveTo(10, 108); c.quadraticCurveTo(130, 116, 250, 108); c.lineTo(250, 112); c.quadraticCurveTo(130, 122, 10, 112); c.fillStyle = '#a07a34'; c.fill();
      for (var i = 0; i < 3; i++) { rr(c, 40 + i * 70, 128, 26, 26, 2, '#3d4f5c'); c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.strokeRect(40 + i * 70, 128, 26, 26); }
      rr(c, 118, 142, 24, 48, 3, '#3a5a3a');
      canopy(c, 30, 170, 20, 16, ['#2f7d32', '#4ea644', '#ff7eb6'], 5, 8);
    } },
    finger: { w: 400, h: 1100, paint: function (c) {
      rr(c, 18, 20, 4, 90, 1, '#f4f4f4');
      P(c, [4, 26, 30, 26, 37, 31, 30, 36, 4, 36], '#f4f4f4'); P(c, [36, 42, 10, 42, 3, 47, 10, 52, 36, 52], '#f4f4f4');
      text(c, 'CORFE', 18, 31.3, 6, '#222'); text(c, 'SWANAGE', 21, 47.3, 5, '#222');
    } },
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
    } },
    heather: { w: 1100, h: 380, paint: function (c, v) {
      var r = rnd(3 + v), cols = v ? ['#7a4a8a', '#9a5aa8', '#b77cc4'] : ['#a0662a', '#c27f34', '#7a4f22'];
      for (var i = 0; i < 26; i++) ell(c, 8 + r() * 94, 26 + r() * 10, 7 + r() * 6, 5 + r() * 4, cols[i % 3]);
    } },
    pony: { w: 900, h: 750, paint: function (c, v) {
      var col = ['#6b4423', '#3a2a1e', '#9a8a7a'][v % 3], dk = shade(col, -0.3);
      rr(c, 22, 44, 4, 28, 1.5, dk); rr(c, 32, 44, 4, 28, 1.5, col); rr(c, 60, 44, 4, 28, 1.5, dk); rr(c, 68, 44, 4, 28, 1.5, col);
      ell(c, 46, 40, 28, 13, col);
      P(c, [20, 34, 10, 58, 4, 62, 2, 56, 12, 32], col); ell(c, 5, 60, 5, 4, dk);
      P(c, [74, 32, 84, 36, 86, 54, 80, 50, 76, 40], dk);
      P(c, [14, 30, 26, 30, 22, 38, 12, 40], dk);
    } },
    logs: { w: 1300, h: 500, paint: function (c) {
      for (var row = 0; row < 3; row++) for (var i = 0; i < 4 - row; i++) {
        var x = 18 + i * 30 + row * 15, y = 40 - row * 13;
        circ(c, x, y, 7, '#7a5634'); circ(c, x, y, 5.4, '#d9b27a'); circ(c, x, y, 2.4, '#c49a62');
      }
    } },
    forestsign: { w: 800, h: 1100, paint: function (c) {
      rr(c, 37, 50, 6, 60, 1, '#9aa0a6');
      rr(c, 4, 4, 72, 52, 4, '#ffffff'); c.strokeStyle = '#d32f2f'; c.lineWidth = 3; c.strokeRect(6, 6, 68, 48);
      P(c, [40, 12, 56, 38, 24, 38], '#d32f2f'); P(c, [40, 17, 52, 35, 28, 35], '#ffffff');
      P(c, [33, 32, 46, 32, 47, 28, 42, 26, 34, 27], '#222');
      text(c, 'NEW FOREST', 40, 46, 7, '#222');
    } },
    gorse: { w: 1000, h: 600, paint: function (c) {
      canopy(c, 50, 36, 46, 24, ['#2f4f26', '#3e6330', '#4d7438'], 13, 14);
      var r = rnd(17); for (var i = 0; i < 40; i++) circ(c, 10 + r() * 80, 18 + r() * 34, 1.5, i % 3 ? '#ffd31a' : '#ffe766');
    } },
    rock: { w: 1000, h: 650, paint: function (c, v) {
      var col = ['#8b8f93', '#e9e4d6', '#9a7d62'][v % 3];
      P(c, [4, 65, 12, 30, 34, 10, 66, 8, 88, 26, 98, 65], col); P(c, [34, 10, 66, 8, 88, 26, 60, 30, 30, 32], shade(col, 0.18)); P(c, [4, 65, 12, 30, 30, 32, 40, 65], shade(col, -0.18));
    } },
    stack: { w: 2600, h: 3600, paint: function (c, v) {
      var w = [0.8, 1, 0.65][v % 3];
      P(c, [130 - 90 * w, 350, 130 - 70 * w, 120, 130 - 40 * w, 40, 130 + 30 * w, 30, 130 + 60 * w, 90, 130 + 85 * w, 350], '#f1ece0');
      P(c, [130 - 90 * w, 350, 130 - 70 * w, 120, 130 - 40 * w, 40, 130 - 20 * w, 40, 130 - 30 * w, 350], '#d8d0bd');
      P(c, [130 - 40 * w, 40, 130 + 30 * w, 30, 130 + 34 * w, 40, 130 - 36 * w, 48], '#6f9a45');
      ell(c, 130, 352, 110 * w, 8, 'rgba(255,255,255,0.7)');
    } },
    lighthouse: { w: 1000, h: 3600, paint: function (c) {
      P(c, [0, 360, 10, 320, 40, 300, 80, 304, 100, 360], '#6b6056'); P(c, [10, 320, 40, 300, 80, 304, 60, 316], '#857868');
      P(c, [38, 304, 62, 304, 58, 100, 42, 100], '#f6f3ee'); P(c, [38, 304, 46, 304, 45, 100, 42, 100], 'rgba(0,0,0,0.1)');
      P(c, [39.5, 240, 60.5, 240, 59.6, 200, 40.4, 200], '#c62828'); P(c, [40.8, 160, 59.2, 160, 58.4, 128, 41.6, 128], '#c62828');
      rr(c, 36, 96, 28, 5, 1, '#222'); rr(c, 41, 72, 18, 24, 2, '#fff4b3'); P(c, [38, 72, 62, 72, 50, 58], '#c62828'); rr(c, 49, 52, 2, 7, 1, '#222');
    } },
    arch: { w: 7000, h: 3600, paint: function (c) {
      var col = '#c9a77a', dk = '#a3835c';
      c.beginPath(); c.moveTo(0, 360); c.lineTo(40, 150); c.quadraticCurveTo(120, 60, 260, 70); c.quadraticCurveTo(470, 80, 600, 170); c.lineTo(700, 360);
      c.lineTo(470, 360); c.quadraticCurveTo(470, 200, 380, 200); c.quadraticCurveTo(300, 200, 290, 360); c.closePath(); c.fillStyle = col; c.fill();
      c.beginPath(); c.moveTo(0, 360); c.lineTo(40, 150); c.quadraticCurveTo(80, 110, 140, 100); c.lineTo(120, 360); c.closePath(); c.fillStyle = dk; c.fill();
      for (var i = 0; i < 6; i++) P(c, [60 + i * 100, 120 + i * 8, 140 + i * 100, 112 + i * 8, 150 + i * 100, 116 + i * 8, 64 + i * 100, 124 + i * 8], 'rgba(90,60,30,0.25)');
      c.beginPath(); c.moveTo(40, 150); c.quadraticCurveTo(120, 52, 260, 62); c.quadraticCurveTo(470, 72, 600, 168); c.quadraticCurveTo(470, 84, 260, 76); c.quadraticCurveTo(120, 70, 40, 150); c.fillStyle = '#6f9a45'; c.fill();
      ell(c, 380, 360, 110, 6, 'rgba(255,255,255,0.6)'); ell(c, 80, 360, 90, 6, 'rgba(255,255,255,0.6)');
    } },
    building: { w: 3200, h: 3600, paint: function (c, v) {
      var top = [60, 120, 30, 90][v % 4], r = rnd(91 + v);
      P(c, [0, 360, 320, 360, 320, top, 0, top], '#141a2c'); P(c, [0, 360, 30, 360, 30, top, 0, top], '#0e1322');
      for (var y = top + 16; y < 340; y += 22) for (var x = 18; x < 310; x += 26) rr(c, x, y, 14, 12, 1, r() < 0.55 ? (r() < 0.8 ? '#ffd27a' : '#bfe0ff') : '#1f2840');
      rr(c, 0, top - 4, 320, 6, 1, '#0a0e1a');
      if (v % 2) { rr(c, 120, 320, 90, 40, 3, '#ffd98a'); text(c, ['FISH & CHIPS', 'HARBOUR CAFE'][v % 4 === 1 ? 0 : 1], 165, 330, 10, '#5a2a10'); }
    } },
    bollard: { w: 160, h: 260, paint: function (c) { rr(c, 3, 6, 10, 20, 3, '#1b1d22'); ell(c, 8, 6, 6, 3, '#2a2d34'); } },
    buoy: { w: 300, h: 500, paint: function (c, v) { var col = v ? '#2e9e4a' : '#d32f2f'; P(c, [4, 46, 26, 46, 22, 20, 8, 20], col); P(c, [8, 20, 22, 20, 15, 6], col); rr(c, 13, 0, 4, 6, 1, '#ffef9a'); ell(c, 15, 47, 14, 3, 'rgba(255,255,255,0.4)'); } },
    ferry: { w: 6000, h: 2400, paint: function (c) {
      P(c, [20, 200, 580, 200, 560, 228, 40, 228], '#e9eef2'); P(c, [20, 200, 580, 200, 578, 206, 22, 206], '#2b4a7a');
      P(c, [0, 196, 60, 200, 30, 218], '#cfd6dc'); P(c, [600, 196, 540, 200, 570, 218], '#cfd6dc');
      rr(c, 220, 120, 160, 80, 4, '#f4f6f8'); for (var i = 0; i < 6; i++) rr(c, 232 + i * 24, 134, 16, 12, 2, '#ffd98a');
      rr(c, 250, 92, 100, 28, 4, '#f4f6f8'); rr(c, 290, 60, 20, 32, 2, '#2b4a7a');
      for (var j = 0; j < 8; j++) rr(c, 70 + j * 58, 186, 40, 14, 3, ['#d32f2f', '#1d7fd6', '#f2c14e', '#ffffff'][j % 4]);
      ell(c, 300, 230, 290, 6, 'rgba(255,255,255,0.3)');
    } },
    needles: { w: 9000, h: 3000, paint: function (c) {
      var col = '#f3eee4', dk = '#d6cdbb';
      P(c, [0, 300, 60, 120, 120, 90, 180, 140, 230, 300], col); P(c, [0, 300, 60, 120, 80, 112, 70, 300], dk);
      P(c, [250, 300, 300, 150, 330, 110, 370, 150, 400, 300], col); P(c, [250, 300, 300, 150, 312, 140, 300, 300], dk);
      P(c, [430, 300, 470, 170, 500, 150, 540, 190, 560, 300], col); P(c, [430, 300, 470, 170, 480, 165, 470, 300], dk);
      P(c, [600, 300, 610, 270, 680, 260, 720, 300], '#6b6056');
      P(c, [640, 266, 670, 266, 666, 140, 644, 140], '#f6f3ee'); P(c, [641.5, 220, 668.5, 220, 667.6, 190, 642.4, 190], '#c62828');
      rr(c, 642, 120, 26, 20, 2, '#fff4b3'); P(c, [638, 120, 672, 120, 655, 104], '#c62828');
      ell(c, 300, 300, 330, 7, 'rgba(255,255,255,0.65)');
    } },
    // ---- signs, gates and markers
    chev: { w: 450, h: 750, paint: function (c, v) {
      rr(c, 20, 32, 5, 43, 1, '#9aa0a6'); rr(c, 2, 2, 41, 32, 2, '#111');
      c.save(); c.translate(22.5, 18); c.scale(v > 0 ? 1 : -1, 1); P(c, [-9, -11, 3, 0, -9, 11, -3, 11, 9, 0, -3, -11], '#ffffff'); c.restore();
    } },
    warn: { w: 1300, h: 1100, paint: function (c, v) {
      rr(c, 20, 60, 6, 50, 1, '#9aa0a6'); rr(c, 104, 60, 6, 50, 1, '#9aa0a6'); rr(c, 2, 4, 126, 60, 4, '#111');
      c.save(); c.translate(65, 34); c.scale(v > 0 ? 1 : -1, 1);
      for (var i = -1; i <= 1; i++) P(c, [i * 34 - 13, -18, i * 34 + 5, 0, i * 34 - 13, 18, i * 34 - 4, 18, i * 34 + 14, 0, i * 34 - 4, -18], '#ffffff');
      c.restore();
    } },
    gpost: { w: 140, h: 520, paint: function (c) { rr(c, 3, 4, 8, 48, 1.5, '#f4f4f4'); rr(c, 3, 8, 8, 6, 1, '#d32f2f'); rr(c, 3, 18, 8, 3, 1, '#111'); } },
    board: { w: 2400, h: 1800, paint: function (c, v) {
      rr(c, 40, 100, 8, 80, 1, '#555b63'); rr(c, 192, 100, 8, 80, 1, '#555b63');
      rr(c, 4, 4, 232, 110, 6, '#0b1f3a'); rr(c, 8, 8, 224, 102, 4, lg(c, 0, 8, 0, 110, [[0, '#123a6b'], [1, '#0b1f3a']]));
      rr(c, 18, 18, 46, 46, 8, '#ffb000'); text(c, '365', 41, 41.5, 18, '#0b1f3a', 'center', 800);
      var msgs = [['365 TECHIES', 'Computer slow? Fixed remotely'], ['365 TECHIES', 'Free games - no adverts'], ['365 PC MANAGER', 'Free for your Windows PC'], ['365 TECHIES', 'Friendly local IT help']][v % 4];
      text(c, msgs[0], 150, 32, 19, '#ffffff', 'center', 800); fitText(c, msgs[1], 150, 56, 13, 150, '#bfe0ff', 600);
      rr(c, 18, 74, 204, 26, 5, '#ffb000'); text(c, 'Ring 01202 775566', 120, 87.5, 15, '#0b1f3a', 'center', 800);
    } },
    fsign: { w: 1600, h: 1500, paint: function (c, v, n, o) {
      rr(c, 30, 70, 7, 80, 1, '#9aa0a6'); rr(c, 123, 70, 7, 80, 1, '#9aa0a6');
      rr(c, 2, 2, 156, 76, 6, '#ffffff'); rr(c, 5, 5, 150, 70, 4, '#00703c');
      c.save(); c.translate(v < 0 ? 24 : 136, 40); c.scale(v < 0 ? -1 : 1, 1); P(c, [-12, -7, 2, -7, 2, -14, 14, 0, 2, 14, 2, 7, -12, 7], '#ffffff'); c.restore();
      var words = (o || 'ROAD').split(' ');
      if (words.length > 1) { fitText(c, words[0], v < 0 ? 92 : 68, 29, 17, 100, '#ffffff', 800); fitText(c, words.slice(1).join(' '), v < 0 ? 92 : 68, 51, 17, 100, '#ffd200', 800); }
      else fitText(c, words[0], v < 0 ? 92 : 68, 40, 18, 100, '#ffffff', 800);
    } },
    nose: { w: 2000, h: 1500, paint: function (c, v, n, o) {
      var names = (o || 'LEFT|RIGHT').split('|');
      rr(c, 60, 100, 8, 50, 1, '#9aa0a6'); rr(c, 132, 100, 8, 50, 1, '#9aa0a6');
      rr(c, 2, 2, 196, 100, 8, '#ffffff'); rr(c, 6, 6, 188, 92, 6, '#00703c');
      P(c, [100, 92, 106, 92, 106, 60, 128, 34, 136, 40, 140, 22, 122, 26, 128, 30, 102, 58, 76, 30, 82, 26, 64, 22, 68, 40, 76, 34, 98, 60, 98, 92], '#ffffff');
      fitText(c, names[0], 46, 64, 14, 80, '#ffd200', 800); fitText(c, names[1], 154, 64, 14, 80, '#ffd200', 800);
      text(c, 'KEEP LEFT', 46, 84, 8, '#ffffff', 'center', 600); text(c, 'KEEP RIGHT', 154, 84, 8, '#ffffff', 'center', 600);
      for (var i = 0; i < 8; i++) P(c, [i * 25, 140, i * 25 + 12, 140, i * 25 + 22, 150, i * 25 + 10, 150], i % 2 ? '#111' : '#ffd200');
    } },
    gate: { w: 5800, h: 2600, paint: function (c, v) {
      var kinds = [['START', '#d32f2f'], ['ROUND', '#1d4ed8'], ['CHECKPOINT', '#f59e0b'], ['GOAL', '#16a34a']], k = kinds[v % 4];
      rr(c, 6, 40, 24, 220, 3, '#e5e7eb'); rr(c, 550, 40, 24, 220, 3, '#e5e7eb'); rr(c, 6, 40, 8, 220, 2, '#c9cdd3'); rr(c, 550, 40, 8, 220, 2, '#c9cdd3');
      rr(c, 0, 20, 580, 66, 8, '#111827'); rr(c, 6, 26, 568, 54, 5, k[1]);
      for (var i = 0; i < 29; i++) { rr(c, 6 + i * 19.6, 26, 9.8, 6, 0, i % 2 ? '#111' : '#fff'); rr(c, 6 + i * 19.6 + 9.8, 74, 9.8, 6, 0, i % 2 ? '#111' : '#fff'); }
      text(c, k[0], 290, 54, 38, '#ffffff', 'center', 800);
      if (v === 0 || v === 3) for (var j = 0; j < 5; j++) { circ(c, 80 + j * 105, 14, 6, '#111'); circ(c, 80 + j * 105, 14, 4, v === 3 ? '#4ade80' : '#fca5a5'); }
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

  // ---------------------------------------------------------------- the traffic, seen from behind
  var CARCOL = ['#d62828', '#1d4ed8', '#f4f4f4', '#2b2d42', '#f2c14e', '#2a9d8f', '#8d99ae', '#e76f51'];
  function rearCar(c, o) {   // a generic car from behind, in a 100-wide box, ground at y = o.h
    var W = 100, H = o.h, body = o.col, dk = shade(body, -0.28), lt = shade(body, 0.25);
    ell(c, 50, H - 1, 52, 4, 'rgba(0,0,0,0.35)');
    rr(c, 6, H - o.wh - 2, 15, o.wh + 2, 3, '#151515'); rr(c, 79, H - o.wh - 2, 15, o.wh + 2, 3, '#151515');
    P(c, [2, H - 8, 98, H - 8, 99, H - o.bh, 1, H - o.bh], body);
    P(c, [2, H - 8, 98, H - 8, 98, H - 16, 2, H - 16], dk);
    P(c, [1, H - o.bh, 99, H - o.bh, 99, H - o.bh + 4, 1, H - o.bh + 4], lt);
    P(c, [8 + o.cab, H - o.bh, 92 - o.cab, H - o.bh, 88 - o.cab - o.slope, H - o.ch, 12 + o.cab + o.slope, H - o.ch], dk);
    P(c, [12 + o.cab, H - o.bh - 2, 88 - o.cab, H - o.bh - 2, 85 - o.cab - o.slope, H - o.ch + 3, 15 + o.cab + o.slope, H - o.ch + 3], lg(c, 0, H - o.ch, 0, H - o.bh, [[0, '#2a3440'], [1, '#56687a']]));
    rr(c, 5, H - o.bh + 7, 22, 6, 2, '#b3121b'); rr(c, 73, H - o.bh + 7, 22, 6, 2, '#b3121b');
    rr(c, 7, H - o.bh + 8, 8, 3, 1, '#ff5a5f'); rr(c, 85, H - o.bh + 8, 8, 3, 1, '#ff5a5f');
    rr(c, 38, H - 15, 24, 6, 1, '#f7d417'); rr(c, 39, H - 14.2, 22, 4.4, 0.5, '#f9e04a');
  }
  var VEH = {
    hatch: { w: 680, h: 560, cols: [0, 1, 2, 4, 5, 6], paint: function (c, col) { rearCar(c, { h: 82, col: col, wh: 12, bh: 48, ch: 80, cab: 6, slope: 6 }); } },
    saloon: { w: 720, h: 520, cols: [0, 1, 2, 3, 6, 7], paint: function (c, col) { rearCar(c, { h: 72, col: col, wh: 11, bh: 40, ch: 68, cab: 10, slope: 10 }); } },
    sports: { w: 720, h: 440, cols: [0, 4, 7, 1], paint: function (c, col) { rearCar(c, { h: 61, col: col, wh: 11, bh: 34, ch: 58, cab: 16, slope: 12 }); rr(c, 8, 61 - 40, 84, 4, 2, shade(col, -0.35)); } },
    van: { w: 780, h: 860, cols: [2, 2, 2, 6, 1], paint: function (c, col) {
      var H = 110; ell(c, 50, H - 1, 52, 4, 'rgba(0,0,0,0.35)');
      rr(c, 6, H - 16, 15, 16, 3, '#151515'); rr(c, 79, H - 16, 15, 16, 3, '#151515');
      rr(c, 1, 6, 98, H - 14, 6, col); rr(c, 1, H - 22, 98, 12, 2, shade(col, -0.25));
      P(c, [49.4, 10, 50.6, 10, 50.6, H - 24, 49.4, H - 24], shade(col, -0.2));
      rr(c, 8, 14, 36, 24, 3, '#3a4654'); rr(c, 56, 14, 36, 24, 3, '#3a4654');
      rr(c, 2, H - 52, 8, 22, 2, '#b3121b'); rr(c, 90, H - 52, 8, 22, 2, '#b3121b'); rr(c, 38, H - 20, 24, 6, 1, '#f7d417');
    } },
    bus: { w: 960, h: 1350, cols: [0, 4], paint: function (c, col) {   // an open-top seaside bus
      var H = 140, b = col === '#d62828' ? '#d62828' : '#f2c14e';
      ell(c, 50, H - 1, 52, 4, 'rgba(0,0,0,0.35)');
      rr(c, 5, H - 16, 17, 16, 3, '#151515'); rr(c, 78, H - 16, 17, 16, 3, '#151515');
      rr(c, 1, 30, 98, H - 38, 5, b); rr(c, 1, H - 24, 98, 14, 2, shade(b, -0.3)); rr(c, 1, 70, 98, 6, 1, '#ffffff');
      rr(c, 8, 82, 84, 26, 3, '#3a4654'); rr(c, 1, 30, 98, 8, 2, shade(b, -0.15));
      for (var i = 0; i < 5; i++) { circ(c, 16 + i * 17, 24, 5, ['#f1c27d', '#8d5524', '#ffdbac', '#c68642', '#e0ac69'][i]); rr(c, 10 + i * 17, 26, 12, 6, 2, ['#1d4ed8', '#d62828', '#2a9d8f', '#f4a261', '#ffffff'][i]); }
      rr(c, 0, 30, 100, 3, 1, '#ffffff');
      rr(c, 3, H - 50, 7, 14, 2, '#b3121b'); rr(c, 90, H - 50, 7, 14, 2, '#b3121b'); rr(c, 38, H - 20, 24, 6, 1, '#f7d417');
    } },
    camper: { w: 780, h: 900, cols: [5, 4, 1, 7], paint: function (c, col) {
      var H = 115; ell(c, 50, H - 1, 52, 4, 'rgba(0,0,0,0.35)');
      rr(c, 6, H - 15, 15, 15, 3, '#151515'); rr(c, 79, H - 15, 15, 15, 3, '#151515');
      rr(c, 1, 8, 98, H - 16, 12, '#f4f1ea'); rr(c, 1, 50, 98, H - 58, 6, col); rr(c, 1, 8, 98, 10, 8, '#e8e2d4');
      rr(c, 18, 22, 64, 24, 4, '#3a4654'); circ(c, 50, 70, 8, '#ffffff'); circ(c, 50, 70, 6, col);
      rr(c, 4, H - 40, 8, 14, 2, '#b3121b'); rr(c, 88, H - 40, 8, 14, 2, '#b3121b'); rr(c, 38, H - 20, 24, 6, 1, '#f7d417');
      rr(c, 20, 0, 60, 8, 2, '#5a4632');
    } },
    tractor: { w: 760, h: 950, cols: [5, 0], paint: function (c, col) {
      var H = 120, g = col === '#2a9d8f' ? '#2e8b3a' : '#c62828';
      ell(c, 50, H - 1, 54, 4, 'rgba(0,0,0,0.35)');
      rr(c, 0, H - 52, 26, 52, 6, '#1a1a1a'); rr(c, 74, H - 52, 26, 52, 6, '#1a1a1a');
      for (var i = 0; i < 6; i++) { rr(c, 0, H - 50 + i * 8.4, 26, 3, 1, '#2c2c2c'); rr(c, 74, H - 50 + i * 8.4, 26, 3, 1, '#2c2c2c'); }
      rr(c, 26, H - 56, 48, 34, 3, g); rr(c, 30, 12, 40, 50, 3, '#2a2a2a'); rr(c, 33, 16, 34, 36, 2, '#8fb3c9');
      rr(c, 28, 8, 44, 6, 2, g); rr(c, 40, H - 22, 20, 12, 2, '#555');
      circ(c, 30, 68, 3, '#ff8c00'); circ(c, 70, 68, 3, '#ff8c00');
    } },
    lorry: { w: 960, h: 1150, cols: [2, 1, 3], paint: function (c, col) {
      var H = 125; ell(c, 50, H - 1, 52, 4, 'rgba(0,0,0,0.35)');
      rr(c, 4, H - 16, 18, 16, 3, '#151515'); rr(c, 78, H - 16, 18, 16, 3, '#151515');
      rr(c, 0, 0, 100, H - 18, 3, col); rr(c, 0, H - 26, 100, 10, 1, '#3a3a3a');
      P(c, [49.4, 4, 50.6, 4, 50.6, H - 26, 49.4, H - 26], shade(col, -0.25));
      for (var i = 0; i < 8; i++) rr(c, 2 + i * 12.4, H - 22, 6.2, 4, 0, i % 2 ? '#d32f2f' : '#ffffff');
      rr(c, 3, H - 40, 8, 12, 2, '#b3121b'); rr(c, 89, H - 40, 8, 12, 2, '#b3121b'); rr(c, 38, H - 20, 24, 6, 1, '#f7d417');
      text(c, 'DORSET', 50, 40, 14, shade(col, -0.45), 'center', 800);
    } }
  };
  var VEH_ORDER = ['hatch', 'saloon', 'van', 'bus', 'camper', 'tractor', 'lorry', 'sports'];
  function vehicle(t, colIdx, tint) {
    var id = VEH_ORDER[t], V = VEH[id], col = CARCOL[V.cols[colIdx % V.cols.length]], key = 'veh|' + id + '|' + col + '|' + (tint ? tint[0] : '');
    var m = cache[key]; if (m) return m;
    var w = V.w * SPR_RES, h = V.h * SPR_RES, c0 = canvas(w, h), x = c0.getContext('2d');
    var boxH = { hatch: 82, saloon: 72, sports: 61, van: 110, bus: 140, camper: 115, tractor: 120, lorry: 125 }[id];
    x.scale(w / 100, h / boxH);
    V.paint(x, col);
    if (tint) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = tint[1] * 0.8; x.fillStyle = tint[0]; x.fillRect(0, 0, c0.width, c0.height); }
    m = [c0];
    while (m[m.length - 1].width > 24) { var p = m[m.length - 1], q = canvas(p.width / 2, p.height / 2), qx = q.getContext('2d'); qx.imageSmoothingQuality = 'high'; qx.drawImage(p, 0, 0, q.width, q.height); m.push(q); }
    m.lights = { y: { hatch: 0.65, saloon: 0.6, sports: 0.6, van: 0.65, bus: 0.68, camper: 0.68, tractor: 0.57, lorry: 0.73 }[id], x: id === 'tractor' ? 0.3 : 0.11 };
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
      for (var i = 0; i < 9; i++) cloud(far, r() * BG_W, 20 + r() * 40, 40 + r() * 60, '#ffffff', 'rgba(140,170,200,0.35)');
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
      for (var i = 0; i < 8; i++) cloud(far, r() * BG_W, 18 + r() * 34, 50 + r() * 60, '#ffffff', 'rgba(150,170,200,0.3)');
      hills(far, r, HZ, 26, 3, '#9cbf9a', 0.8);
      SPR_BG(far, 'castle', 520, HZ - 18, 120);
      hills(near, r, HZ + 6, 22, 4, '#6faa4f', 1);
      hills(near, r, HZ + 14, 12, 3, '#5f9c45', 1.5);
    },
    forest: function (far, near) {
      var r = rnd(303);
      for (var i = 0; i < 6; i++) cloud(far, r() * BG_W, 26 + r() * 30, 60 + r() * 50, '#fff8ea', 'rgba(200,170,130,0.3)');
      hills(far, r, HZ, 12, 3, '#8fa6b8', 0.6);
      treeline(near, r, HZ + 8, 30, ['#6b4a1e', '#a0561e', '#c47a26', '#7a6a22', '#3a4a22', '#b8902a'], 12);
    },
    jurassic: function (far, near) {
      var r = rnd(404), sx = 610, sy = HZ - 12;
      far.fillStyle = rg(far, sx, sy, 4, 160, [[0, 'rgba(255,240,180,0.95)'], [0.15, 'rgba(255,190,90,0.5)'], [1, 'rgba(255,140,60,0)']]); far.fillRect(0, 0, BG_W, BG_H);
      circ(far, sx, sy, 22, '#fff1c2'); circ(far, sx, sy, 19, '#ffe08a');
      for (var i = 0; i < 12; i++) { (function (y, x0, w, hh0) { wrap(x0, w, function (x) { ell(far, x, y, w, hh0, 'rgba(255,170,120,0.55)'); ell(far, x, y + 2, w * 0.9, 1.6, 'rgba(120,60,90,0.35)'); }); })(14 + r() * 60, r() * BG_W, 60 + r() * 140, 2.5 + r() * 2); }
      P(far, [700, HZ, 760, HZ - 18, 860, HZ - 24, 960, HZ - 10, 1000, HZ], '#7a4a6a'); P(far, [100, HZ, 140, HZ - 10, 260, HZ - 14, 320, HZ], '#8a5a72');
      seaBand(far, HZ, ['#6a5a8a', '#3f4f80'], null);
      var gr = rg(far, sx, HZ + 4, 2, 120, [[0, 'rgba(255,220,140,0.9)'], [1, 'rgba(255,160,80,0)']]); far.fillStyle = gr;
      for (var k = 0; k < 60; k++) { var yy = HZ + 1 + k * 0.42, ww = 6 + k * 2.2; far.fillRect(sx - ww / 2 + Math.sin(k * 7.1) * 6, yy, ww, 0.3); }
      hills(near, r, HZ + 10, 18, 3, '#4d5e2a', 0.7);
    },
    harbour: function (far, near) {
      var r = rnd(505);
      for (var i = 0; i < 220; i++) circ(far, r() * BG_W, Math.pow(r(), 1.6) * (HZ - 20), r() < 0.1 ? 0.9 : 0.5, 'rgba(255,255,255,' + (0.4 + r() * 0.6) + ')');
      circ(far, 860, 30, 10, '#f4f1e0'); circ(far, 856, 28, 10, 'rgba(16,26,68,0.0)');
      far.fillStyle = rg(far, 860, 30, 8, 60, [[0, 'rgba(240,240,220,0.35)'], [1, 'rgba(240,240,220,0)']]); far.fillRect(780, 0, 160, 100);
      far.fillStyle = rg(far, 400, HZ, 10, 300, [[0, 'rgba(255,170,90,0.35)'], [1, 'rgba(255,170,90,0)']]); far.fillRect(0, 0, BG_W, BG_H);
      for (var x = 0; x < BG_W - 20; x += 8 + r() * 14) {
        var h = 8 + Math.pow(r(), 2) * 40, w = 8 + r() * 16; rr(far, x, HZ - h, w, h, 0.5, '#0b1020');
        for (var wy = HZ - h + 3; wy < HZ - 2; wy += 4) for (var wx = x + 2; wx < x + w - 2; wx += 3) if (r() < 0.35) rr(far, wx, wy, 1.2, 1.4, 0.2, r() < 0.8 ? '#ffd27a' : '#cfe8ff');
      }
      seaBand(far, HZ, ['#0f2448', '#071530'], null);
      for (var k = 0; k < 300; k++) rr(far, r() * BG_W, HZ + 1 + r() * 24, 1 + r() * 5, 0.5, 0.2, r() < 0.7 ? 'rgba(255,200,110,0.6)' : 'rgba(180,220,255,0.5)');
    },
    needles: function (far, near) {
      var r = rnd(606);
      for (var i = 0; i < 14; i++) { (function (y, x0, w, hh0) { wrap(x0, w, function (x) { ell(far, x, y, w, hh0, 'rgba(255,230,235,0.45)'); }); })(14 + r() * 50, r() * BG_W, 80 + r() * 160, 3 + r() * 3); }
      far.fillStyle = rg(far, 300, HZ, 4, 200, [[0, 'rgba(255,230,190,0.8)'], [1, 'rgba(255,200,180,0)']]); far.fillRect(0, 0, BG_W, BG_H);
      P(far, [500, HZ, 540, HZ - 16, 700, HZ - 22, 820, HZ - 18, 900, HZ], '#d9c9d2'); P(far, [500, HZ, 540, HZ - 16, 560, HZ - 15, 548, HZ], '#f6efe8');
      seaBand(far, HZ, ['#9fb3d0', '#7b97bd'], 'rgba(255,240,230,0.7)');
      hills(near, r, HZ + 10, 16, 3, '#6f9a52', 0.7);
    }
  };
  function SPR_BG(c, t, x, y, w) { var S = SPR[t], m = sprite(t, 0, false, null)[0], h = w * S.h / S.w; c.drawImage(m, x - w / 2, y - h, w, h); }
  var bgCache = {};
  function bg(key, res) {   // {far, near} canvases for a place, painted at res pixels per game unit
    var k = key + '|' + res; if (bgCache[k]) return bgCache[k];
    var out = {}, mk = function () { var c = canvas(BG_W * res, BG_H * res), x = c.getContext('2d'); x.scale(res, res); return [c, x]; };
    var f = mk(), n = mk();
    BG[key](f[1], n[1]);
    out.far = f[0]; out.near = n[0];
    var keys = Object.keys(bgCache); if (keys.length > 4) delete bgCache[keys[0]];
    return (bgCache[k] = out);
  }
  function flush() { cache = {}; bgCache = {}; }

  window.CRArt = { PAL: PAL, SPR: SPR, VEH: VEH, VEH_ORDER: VEH_ORDER, sprite: sprite, vehicle: vehicle, bg: bg, BG_W: BG_W, BG_H: BG_H, HZ: HZ, flush: flush,
    mix: mix, shade: shade, hex: hex, rr: rr, P: P, circ: circ, ell: ell, lg: lg, rg: rg, text: text, FONT: FONT };
})();
