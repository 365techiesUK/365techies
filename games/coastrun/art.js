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
    { key: 'forest', sky: [[0, '#5d93d1'], [0.55, '#b4c9d9'], [1, '#f4e3bf']], fog: '#ecdcb6', grass: ['#7aa040', '#70963a'], verge: ['#9a7a3c', '#917238'], beach: null,
      sea: null, foam: null, road: ['#625f59', '#5d5a54'], rumble: ['#f2f2f2', '#2f7d43'], lane: '#efefe6', tint: ['#ffb24a', 0.08] },
    { key: 'jurassic', sky: [[0, '#1f2466'], [0.35, '#6a4a92'], [0.7, '#ff8f4a'], [1, '#ffd27e']], fog: '#f4ad6c', grass: ['#86a23e', '#7c9838'], verge: ['#6a8a38', '#617f33'], beach: ['#f3ead6', '#e9dfc9'],
      sea: ['#4a5f90', '#455987'], foam: '#ffe2bf', road: ['#6d5e5c', '#685957'], rumble: ['#fff3e6', '#d0362f'], lane: '#fff1df', edge: 'fence', tint: ['#ff7a2e', 0.2] },
    { key: 'harbour', sky: [[0, '#03071a'], [0.6, '#101a44'], [1, '#2f3570']], fog: '#1c2448', grass: ['#26343c', '#233138'], verge: ['#373b45', '#33373f'], beach: ['#2d3038', '#2a2d34'],
      sea: ['#0d2140', '#0b1d39'], foam: '#6b7fae', road: ['#2b2d34', '#282a30'], rumble: ['#cfcfcf', '#a8262a'], lane: '#e6dfa8', edge: 'quay', night: true, tint: ['#1a2a6a', 0.45] },
    { key: 'needles', sky: [[0, '#6878b8'], [0.5, '#c9a8c8'], [0.82, '#f6c3bd'], [1, '#ffe6c9']], fog: '#f1d2cc', grass: ['#80a65b', '#78a053'], verge: ['#7aa257', '#729b50'], beach: ['#f4efe4', '#ebe5d8'],
      sea: ['#6f90b8', '#6a8ab1'], foam: '#fff6ee', road: ['#78757b', '#737176'], rumble: ['#fafafa', '#3b6fd6'], lane: '#fbfbfb', edge: 'fence', tint: ['#ff9ab0', 0.12] },
    { key: 'sandbanks', sky: [[0, '#1f6fd0'], [0.55, '#63b3f0'], [1, '#d6effa']], fog: '#d2ecf8', grass: ['#7cc257', '#72b84e'], verge: ['#efdcab', '#e8d39e'], beach: ['#f0dfb0', '#e9d6a2'],
      sea: ['#1fa3c9', '#1b95ba'], foam: '#f4fdff', road: ['#73777e', '#6e7279'], rumble: ['#2a7fd6', '#f6f6f6'], lane: '#f6f6f6', edge: 'railing', tint: null },
    { key: 'christchurch', sky: [[0, '#3a80d6'], [0.6, '#86c0ee'], [1, '#e2f1f8']], fog: '#d8ebf3', grass: ['#78b94f', '#6fae48'], verge: ['#82b85a', '#78ad52'], beach: ['#dcc79a', '#d4be8f'],
      sea: ['#3a8fb8', '#3584ab'], foam: '#eef9ff', road: ['#6f7177', '#6a6c72'], rumble: ['#f4f4f4', '#2f8a4a'], lane: '#f4f4f4', edge: 'fence', tint: null },
    { key: 'swanage', sky: [[0, '#2c76d2'], [0.55, '#77b9ee'], [1, '#dff0f8']], fog: '#d6eaf4', grass: ['#7fbf55', '#76b44d'], verge: ['#7fbf55', '#76b44d'], beach: ['#f6f3ea', '#ede9de'],
      sea: ['#2390c4', '#1f85b6'], foam: '#ffffff', road: ['#76767a', '#717175'], rumble: ['#f6f6f6', '#1d4ed8'], lane: '#f6f6f6', edge: 'fence', tint: null },
    { key: 'weymouth', sky: [[0, '#3f7cc8'], [0.55, '#9cc6e4'], [0.85, '#f2e2c0'], [1, '#ffe9bf']], fog: '#f0e2c4', grass: ['#86b850', '#7cad49'], verge: ['#f0dcab', '#e8d29c'], beach: ['#f2d9a0', '#e9cf92'],
      sea: ['#2f86b8', '#2a7bab'], foam: '#fff8e8', road: ['#77736d', '#726e68'], rumble: ['#f6f2e8', '#d23a2f'], lane: '#f6f2e8', edge: 'railing', tint: ['#ffc070', 0.1] },
    { key: 'lymington', sky: [[0, '#4a76b8'], [0.5, '#c2a6c0'], [0.8, '#f6c894'], [1, '#ffe0a8']], fog: '#f2d6b0', grass: ['#7aa64c', '#719c45'], verge: ['#8aae58', '#80a450'], beach: ['#d6c193', '#cdb788'],
      sea: ['#4a7aa6', '#44709a'], foam: '#ffeedd', road: ['#716a68', '#6c6563'], rumble: ['#f6f0e6', '#1f4e8a'], lane: '#f6f0e6', edge: 'quay', tint: ['#ffa860', 0.15] },
    { key: 'lyme', sky: [[0, '#2a2f78'], [0.35, '#7a4f9a'], [0.65, '#f0809a'], [1, '#ffc79a']], fog: '#efa8a0', grass: ['#6a8c40', '#62823a'], verge: ['#6e8a42', '#66823c'], beach: ['#a59a8c', '#9b9082'],
      sea: ['#4c5a92', '#465488'], foam: '#ffe0e6', road: ['#6a5e66', '#655962'], rumble: ['#fff0f0', '#c0304a'], lane: '#fff0ea', edge: 'fence', tint: ['#ff6a8a', 0.18] },
    { key: 'portland', sky: [[0, '#141c4a'], [0.4, '#3b4a8a'], [0.75, '#a07aa8'], [1, '#f2b48a']], fog: '#9c86a6', grass: ['#5a7a46', '#53723f'], verge: ['#8a8676', '#827e6e'], beach: ['#c9c2b0', '#bfb8a6'],
      sea: ['#2c3e70', '#283866'], foam: '#d8d8f0', road: ['#55545c', '#504f57'], rumble: ['#f0f0f0', '#c62828'], lane: '#ece8d8', edge: 'fence', wall: ['#8a8676', '#827e6e'], tint: ['#4a5aa8', 0.25] },
    { key: 'goldencap', sky: [[0, '#25397e'], [0.45, '#7a6aa8'], [0.75, '#ffa868'], [1, '#ffd890']], fog: '#f2c08c', grass: ['#8eaa48', '#84a040'], verge: ['#7a9a46', '#71903f'], beach: ['#e8c070', '#deb664'],
      sea: ['#3f6496', '#3a5c8c'], foam: '#fff0d8', road: ['#6e625c', '#695d57'], rumble: ['#fff4e2', '#d8902a'], lane: '#fff2dc', edge: 'fence', tint: ['#ff9a40', 0.16] },
    { key: 'hengistbury', sky: [[0, '#060c2c'], [0.5, '#1c2a6a'], [0.82, '#5a4a8a'], [1, '#d07a6a']], fog: '#4a3f6a', grass: ['#2e3e30', '#2a382b'], verge: ['#4a4636', '#443f31'], beach: ['#7a6a5a', '#726252'],
      sea: ['#16244a', '#132042'], foam: '#a8b0e0', road: ['#35343c', '#313038'], rumble: ['#d8d8d8', '#2f6fd6'], lane: '#e8e2b8', edge: 'fence', night: true, tint: ['#2a2a7a', 0.35] }
  ];
  // in the engine's order of the places (CREngine.STAGES: the pyramid), so PAL[stage id] is that place's colours
  PAL = (function (byKey) { var m = {}; byKey.forEach(function (p) { m[p.key] = p; }); return window.CREngine.STAGES.map(function (S) { return m[S.key]; }); })(PAL);

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
  function clipPoly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.clip(); }
  function durdleDoor(c, x0) {   // a long limestone ridge sloping down to the sea, turf along its landward top, steeply tilted strata,
    // weathered, a rounded arch near its seaward end, dark at its wet foot (painted as a smooth cream wedge with a pointed door it
    // read as a hangar)
    c.save(); c.translate(x0, HZ); c.scale(1.05, 2.3); c.translate(-x0, -HZ);   // (the ring squashes the panorama's height: painted tall, it reads true)
    var hd = [x0 - 20, HZ, x0 - 4, HZ - 6.5, x0 + 6, HZ - 9.2, x0 + 14, HZ - 11.5, x0 + 24, HZ - 13.8, x0 + 32, HZ - 16.5, x0 + 40, HZ - 19.4, x0 + 46, HZ - 22.5, x0 + 52, HZ - 25.2,
      x0 + 56, HZ - 27.5, x0 + 61, HZ - 29.2, x0 + 64, HZ - 30, x0 + 68, HZ - 29.5, x0 + 72, HZ - 28.2, x0 + 76, HZ - 26.4, x0 + 79, HZ - 23.2, x0 + 81.5, HZ - 19, x0 + 83, HZ - 15, x0 + 84.6, HZ - 9, x0 + 85.6, HZ - 4, x0 + 87, HZ];
    var gr = c.createLinearGradient(x0 + 20, HZ - 30, x0 + 50, HZ); gr.addColorStop(0, '#e3d6bd'); gr.addColorStop(0.55, '#cdbfa5'); gr.addColorStop(1, '#a3978a');
    P(c, hd, gr);
    c.save(); clipPoly(c, hd);
    for (var b = -8; b < 30; b++) {   // the strata, tilted steeply
      var sx = x0 - 20 + b * 3.6; c.strokeStyle = b % 3 ? 'rgba(110,96,84,0.2)' : 'rgba(255,248,236,0.25)'; c.lineWidth = b % 3 ? 0.5 : 0.8;
      c.beginPath(); c.moveTo(sx, HZ + 2); c.lineTo(sx + 11, HZ - 34); c.stroke();
    }
    for (var w2 = 0; w2 < 16; w2++) { var wx = x0 - 10 + ((w2 * 37) % 92), wy = HZ - 3 - ((w2 * 23) % 22); c.fillStyle = 'rgba(80,70,62,0.13)'; c.beginPath(); c.ellipse(wx, wy, 2.6 + (w2 % 3), 1.2, 0.3, 0, Math.PI * 2); c.fill(); }   // weathered patches
    P(c, [x0 + 70, HZ - 28, x0 + 79, HZ - 23, x0 + 83, HZ - 15, x0 + 85, HZ - 6, x0 + 87, HZ, x0 + 74, HZ, x0 + 76, HZ - 14], 'rgba(84,80,104,0.3)');   // the seaward face in shade
    var fg = c.createLinearGradient(0, HZ - 4, 0, HZ); fg.addColorStop(0, 'rgba(70,62,55,0)'); fg.addColorStop(1, 'rgba(62,56,50,0.7)'); c.fillStyle = fg; c.fillRect(x0 - 20, HZ - 4, 110, 4);   // the wet, darker foot
    c.restore();
    P(c, [x0 - 4, HZ - 6.5, x0 + 14, HZ - 11.5, x0 + 32, HZ - 16.5, x0 + 46, HZ - 22.5, x0 + 56, HZ - 27.5, x0 + 61, HZ - 29.2, x0 + 58, HZ - 27.6, x0 + 48, HZ - 23.6, x0 + 34, HZ - 17.8, x0 + 16, HZ - 12.9, x0 - 2, HZ - 8], '#6c8c44');   // turf along the top
    var ax = x0 + 72, aw = 6, ah = 15;   // the arch: off-centre, its top rounded and a little ragged
    var arch = function () { c.beginPath(); c.moveTo(ax - aw, HZ); c.lineTo(ax - aw - 0.4, HZ - ah * 0.5); c.ellipse(ax - 0.3, HZ - ah * 0.5, aw * 0.97, ah * 0.5, 0, Math.PI, Math.PI * 2); c.lineTo(ax + aw - 0.8, HZ); c.closePath(); };
    c.save(); c.beginPath(); c.rect(x0 - 30, 0, 140, HZ - 0.3); c.clip(); c.globalCompositeOperation = 'destination-out'; arch(); c.fill(); c.restore();
    c.save(); arch(); c.clip();
    c.fillStyle = '#4f6f9a'; c.fillRect(ax - 10, HZ - 2.6, 20, 2.8); c.fillStyle = 'rgba(255,244,230,0.85)'; c.fillRect(ax - 10, HZ - 1.1, 20, 0.6);   // the sea and its foam through the arch
    c.restore();
    c.strokeStyle = 'rgba(70,60,58,0.45)'; c.lineWidth = 1; arch(); c.stroke();
    rr(c, x0 + 94, HZ - 6, 3.5, 6, 1, '#c6b6a2'); rr(c, x0 + 100, HZ - 3, 2.5, 3, 1, '#b9a994');   // stacks offshore
    c.restore();
  }
  function goldenCap(c, x0) {   // the highest cliff on the coast: grey-blue clay most of the way up, a band of golden sandstone near the top, a cap of dark heath
    c.save(); c.translate(x0, HZ); c.scale(0.95, 2.3); c.translate(-x0, -HZ);
    var cl = [x0, HZ, x0 + 5, HZ - 9, x0 + 9, HZ - 22, x0 + 15, HZ - 33, x0 + 25, HZ - 40, x0 + 40, HZ - 42.5, x0 + 55, HZ - 41, x0 + 67, HZ - 36, x0 + 80, HZ - 31, x0 + 92, HZ - 23, x0 + 104, HZ - 18, x0 + 116, HZ - 9, x0 + 126, HZ];
    P(c, cl, '#8a8590');
    c.save(); clipPoly(c, cl);
    c.fillStyle = 'rgba(70,72,90,0.28)'; for (var q = 0; q < 5; q++) { c.beginPath(); c.moveTo(x0, HZ - 4 - q * 5); for (var xx = 0; xx <= 130; xx += 10) c.lineTo(x0 + xx, HZ - 4 - q * 5 + Math.sin(xx * 0.11 + q) * 1.2); c.lineTo(x0 + 130, HZ - 2.6 - q * 5); c.lineTo(x0, HZ - 2.6 - q * 5); c.fill(); }   // wavy beds in the clay
    c.fillStyle = '#e8aa48'; c.beginPath(); c.moveTo(x0, HZ - 31); for (var xx = 0; xx <= 130; xx += 8) c.lineTo(x0 + xx, HZ - 31 - Math.sin(xx * 0.07) * 1.5); for (var xx = 130; xx >= 0; xx -= 8) c.lineTo(x0 + xx, HZ - 37.5 - Math.sin(xx * 0.07) * 1.5); c.fill();   // the golden sandstone band
    c.fillStyle = 'rgba(255,214,140,0.5)'; c.fillRect(x0, HZ - 36, 130, 1.4);
    for (var gx = 0; gx < 4; gx++) { var gx0 = x0 + 20 + gx * 26 + (gx % 2) * 6; P(c, [gx0, HZ, gx0 + 1.6, HZ - 14 - (gx % 3) * 5, gx0 + 3.6, HZ], 'rgba(60,58,72,0.16)'); P(c, [gx0 + 1.6, HZ - 18 - (gx % 3) * 6, gx0 + 2.2, HZ - 31, gx0 + 3, HZ - 18 - (gx % 3) * 6], 'rgba(190,130,60,0.16)'); }   // gullies, sand washed down them
    P(c, [x0 + 64, HZ - 37, x0 + 80, HZ - 31, x0 + 92, HZ - 23, x0 + 104, HZ - 18, x0 + 116, HZ - 9, x0 + 126, HZ, x0 + 96, HZ, x0 + 86, HZ - 10, x0 + 76, HZ - 20, x0 + 68, HZ - 28], '#6e7c3a');   // the long green slope inland
    for (var lx = 0; lx < 5; lx++) rr(c, x0 + 6 + lx * 9, HZ - 3.5 - (lx % 2), 6 + (lx % 3) * 2, 3.5, 1.2, '#7a7684');   // landslip lumps at its foot
    P(c, [x0 + 80, HZ - 31, x0 + 126, HZ, x0 + 96, HZ], 'rgba(110,80,140,0.3)');   // the far side in shadow
    P(c, [x0 + 17, HZ - 34.5, x0 + 25, HZ - 40, x0 + 40, HZ - 42.5, x0 + 55, HZ - 41, x0 + 67, HZ - 36, x0 + 54, HZ - 38.5, x0 + 40, HZ - 39.5, x0 + 26, HZ - 38], '#3e4e26');   // the dark heath on its summit
    c.restore(); c.restore();
  }
  function oldHarry(c, x0) {   // the chalk stacks off the end of the downs
    c.save(); c.translate(x0, HZ); c.scale(1, 2); c.translate(-x0, -HZ);
    rr(c, x0, HZ - 18, 8, 18, 1.5, '#f4f1e8'); rr(c, x0 + 12, HZ - 12, 6, 12, 1.5, '#ece8de'); rr(c, x0 + 22, HZ - 6, 4, 6, 1, '#e4e0d4');
    rr(c, x0 + 5, HZ - 18, 3, 18, 1, 'rgba(160,150,140,0.35)');
    c.restore();
  }
  var MARK = { purbeck: 520, jurassic: 455, goldencap: 530, swanage: 290, needles: 540, christchurch: 613, weymouth: 575, sandbanks: 848, lymington: 640, lyme: 700 };   // where each place's landmark is in its panorama
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
      P(far, [700, HZ, 760, HZ - 18, 860, HZ - 24, 960, HZ - 10, 1000, HZ], '#8a6658'); P(far, [100, HZ, 140, HZ - 10, 260, HZ - 14, 320, HZ], '#9a7462');
      seaBand(far, HZ, ['#c8967a', '#34587a'], null);
      durdleDoor(far, 380);
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
    },
    sandbanks: function (far) {   // across the harbour mouth: the Purbeck hills and the chalk stacks
      var r = rnd(707);
      hills(far, r, HZ, 16, 3, '#8fb39a', 0.6);
      P(far, [820, HZ, 830, HZ - 9, 846, HZ - 12, 860, HZ], '#f2efe6'); P(far, [866, HZ, 870, HZ - 8, 876, HZ], '#f2efe6');
      seaBand(far, HZ, ['#3fb4d8', '#24a0c8'], 'rgba(255,255,255,0.8)');
    },
    christchurch: function (far) {   // the harbour: low green hills, the headland, the priory tower
      var r = rnd(808);
      hills(far, r, HZ, 8, 3, '#9db896', 0.5);
      P(far, [180, HZ, 200, HZ - 10, 300, HZ - 12, 330, HZ], '#a7a07a');
      rr(far, 610, HZ - 24, 6, 24, 0.5, '#a89f8a'); P(far, [570, HZ, 570, HZ - 10, 612, HZ - 10, 612, HZ], '#b0a690');
      seaBand(far, HZ, ['#5aa2c8', '#3f90b8'], 'rgba(255,255,255,0.6)');
    },
    swanage: function (far) {   // chalk cliffs and green downs above a bright bay
      var r = rnd(909);
      hills(far, r, HZ, 20, 3, '#86b07a', 0.7);
      P(far, [100, HZ, 110, HZ - 18, 260, HZ - 22, 280, HZ], '#f4f1e8'); P(far, [700, HZ, 712, HZ - 14, 860, HZ - 18, 880, HZ], '#f4f1e8');
      oldHarry(far, 288);
      seaBand(far, HZ, ['#3aa0d0', '#2390c4'], 'rgba(255,255,255,0.8)');
    },
    weymouth: function (far) {   // the bay, and Portland's long flat-topped island across it
      var r = rnd(1010);
      hills(far, r, HZ, 10, 3, '#a8b88e', 0.5);
      P(far, [420, HZ, 440, HZ - 13, 700, HZ - 15, 730, HZ], '#9aa08a');
      seaBand(far, HZ, ['#4e9ac4', '#2f86b8'], 'rgba(255,240,210,0.8)');
    },
    lymington: function (far) {   // across the Solent: the Isle of Wight's hills in the golden light
      var r = rnd(1111);
      P(far, [0, HZ, 0, HZ - 10, 200, HZ - 16, 420, HZ - 12, 640, HZ - 18, 900, HZ - 10, 1152, HZ - 12, 1152, HZ], '#8f9c8a');
      hills(far, r, HZ, 6, 3, '#a6ad8a', 0.5);
      seaBand(far, HZ, ['#7a96b4', '#4a7aa6'], 'rgba(255,220,170,0.8)');
    },
    lyme: function (far) {   // the cliffs along the bay, dark below and gold above, in the sunset
      var r = rnd(1212);
      hills(far, r, HZ, 14, 3, '#7e6c70', 0.6);
      P(far, [600, HZ, 620, HZ - 20, 700, HZ - 26, 760, HZ - 20, 790, HZ], '#c8884a'); P(far, [600, HZ, 790, HZ, 770, HZ - 6, 620, HZ - 8], '#6a5a6a');
      seaBand(far, HZ, ['#c08a84', '#4c5a88'], 'rgba(255,200,190,0.7)');
    },
    portland: function (far) {   // open sea all round, the long shingle bank and the mainland far off
      var r = rnd(1313);
      hills(far, r, HZ, 6, 3, '#5a5a7a', 0.4);
      P(far, [200, HZ, 230, HZ - 2, 600, HZ - 3, 640, HZ], '#9a8f80');
      seaBand(far, HZ, ['#4a4a80', '#2c3e70'], 'rgba(240,200,190,0.5)');
    },
    goldencap: function (far) {   // the coast going west, cliff after golden cliff
      var r = rnd(1414);
      hills(far, r, HZ, 16, 3, '#8a9a5a', 0.6);
      for (var i = 0; i < 4; i++) { P(far, [80 + i * 270, HZ, 100 + i * 270, HZ - 16 - i * 2, 180 + i * 270, HZ - 18 - i * 2, 200 + i * 270, HZ], ['#d8a048', '#c8903e', '#e0aa52', '#cc9442'][i]);
        P(far, [150 + i * 270, HZ - 17 - i * 2, 180 + i * 270, HZ - 18 - i * 2, 200 + i * 270, HZ, 165 + i * 270, HZ], 'rgba(110,80,140,0.3)'); P(far, [96 + i * 270, HZ - 13 - i * 2, 100 + i * 270, HZ - 16 - i * 2, 180 + i * 270, HZ - 18 - i * 2, 176 + i * 270, HZ - 15 - i * 2], '#5f6e34'); }
      goldenCap(far, 470);
      seaBand(far, HZ, ['#6a7aa6', '#3f6496'], 'rgba(255,220,160,0.8)');
    },
    hengistbury: function (far) {   // twilight over the bay: the town's lights along the shore, the Needles far off
      var r = rnd(1515);
      hills(far, r, HZ, 6, 3, '#1c2238', 0.4);
      P(far, [900, HZ, 905, HZ - 6, 912, HZ], '#b0aac8'); P(far, [916, HZ, 920, HZ - 5, 925, HZ], '#b0aac8');
      for (var x = 0; x < BG_W; x += 2 + r() * 5) rr(far, x, HZ - 2 - r() * 3, 1, 1, 0.2, r() < 0.8 ? '#ffd27a' : '#cfe8ff');
      seaBand(far, HZ, ['#1c2a5a', '#16244a'], 'rgba(255,210,140,0.5)');
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
    (BG[key] || BG.bournemouth)(f[1], n[1]);
    out.far = f[0]; out.near = n[0];
    var keys = Object.keys(bgCache); if (keys.length > 4) delete bgCache[keys[0]];
    return (bgCache[k] = out);
  }
  function flush() { cache = {}; bgCache = {}; }

  window.CRArt = { PAL: PAL, SPR: SPR, sprite: sprite, bg: bg, BG_W: BG_W, BG_H: BG_H, HZ: HZ, MARK: MARK, flush: flush,
    mix: mix, shade: shade, hex: hex, rr: rr, P: P, circ: circ, ell: ell, lg: lg, rg: rg, text: text, FONT: FONT };
})();
