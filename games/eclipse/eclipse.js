/* 365 Eclipse - the picture and the sound (4 Oct 2026). The rules are in engine.js (window.EclEngine); the cabinet is
 * ../common/arcade.js; glows, sparks, labels and banners come from ../common/arcade-fx.js.
 * Everything is our own, drawn on the spot at full sharpness: vector ships and enemies in LIGHT (white hull, cyan glow)
 * or DARK (black hull, red glow); glowing bullets in the same two colours; three scrolling scenes (the sea past chalk
 * cliffs with clouds and their shadows; climbing from the sky into orbit over the Earth's edge; the alien core with its
 * black sun); explosions in layers (flash, fireball, shockwave, sparks, debris, smoke); homing lasers with trails;
 * beams that warn before they fire; big bosses whose turrets aim at you. Sounds are made on the spot; the music is an
 * optional synth track (Settings > Music, off unless switched on). */
(function () {
  'use strict';
  var E = window.EclEngine, A = window.Arcade365, F = window.Arcade365FX.create();
  var GW = E.WIDTH, GH = E.HEIGHT, LIGHT = E.LIGHT;
  var reducedMotion = F.reduced;
  var POL = [   // the two colours: hull light, hull dark, accent, glow
    { hull: '#f4f8ff', hull2: '#9fb8d8', edge: '#5a7aa0', acc: '#3fd8ff', glow: '#5ce0ff', core: '#ffffff' },
    { hull: '#4a4e62', hull2: '#0e0f18', edge: '#6a7088', acc: '#ff2a5c', glow: '#ff3a6a', core: '#1a0008' }
  ];
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(hex, to, k) {
    var a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
    var r = Math.round(((a >> 16) & 255) * (1 - k) + ((b >> 16) & 255) * k), g = Math.round(((a >> 8) & 255) * (1 - k) + ((b >> 8) & 255) * k), bl = Math.round((a & 255) * (1 - k) + (b & 255) * k);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }

  // ---------------------------------------------------------------- vector pictures, painted once at the screen's sharpness
  var VK = 0, VC = {};
  function vec(key, w, h, paint, flat) {   // w x h game pixels, painted with the origin in the middle
    var k = Math.max(1, Math.ceil(F.scale));
    if (k !== VK) { VK = k; VC = {}; }
    var c = VC[key]; if (c) return c;
    c = F.canvas(Math.ceil(w * k), Math.ceil(h * k)); c.gw = w; c.gh = h;
    var x = c.getContext('2d'); x.scale(k, k); x.translate(w / 2, h / 2); x.lineJoin = 'round';
    paint(x);
    if (flat) return (VC[key] = c);
    // a sheen of light across the top-left of everything, so even the black craft read as solid metal
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 1;
    var sh = x.createLinearGradient(0, 0, c.width * 0.8, c.height * 0.8); sh.addColorStop(0, 'rgba(255,255,255,0.28)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)');
    x.fillStyle = sh; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'source-over';
    return (VC[key] = c);
  }
  function put(c, x, y, alpha, rot, sx, sy) {   // draw a vector picture centred on (x, y), turned and sized if asked
    var g = F.g, S = F.scale;
    g.globalAlpha = alpha == null ? 1 : alpha; g.imageSmoothingEnabled = true;
    if (rot || sx != null) {
      g.save(); g.translate(x * S + F.ox, y * S + F.oy); if (rot) g.rotate(rot); if (sx != null) g.scale(sx, sy == null ? 1 : sy);
      g.drawImage(c, -c.gw * S / 2, -c.gh * S / 2, c.gw * S, c.gh * S); g.restore();
    } else g.drawImage(c, x * S + F.ox - c.gw * S / 2, y * S + F.oy - c.gh * S / 2, c.gw * S, c.gh * S);
  }
  function putGlow(key, c, col, x, y, a) {   // a soft glow round a vector picture, made once
    if (F.low || a <= 0) return;
    var h = F.halo('v|' + VK + '|' + key, c, col, Math.max(2, VK * 2.2)), S = F.scale, k = S / VK, g = F.g;
    g.imageSmoothingEnabled = true; g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, a);
    g.drawImage(h.cv, x * S + F.ox - (c.width / 2 + h.pad) * k, y * S + F.oy - (c.height / 2 + h.pad) * k, h.cv.width * k, h.cv.height * k);
    g.globalCompositeOperation = 'source-over';
  }
  function shadowOf(key, c) {   // the same picture as a dark shape, for its shadow on the ground below
    var k2 = 'sh|' + key, s = VC[k2]; if (s) return s;
    s = F.canvas(c.width, c.height); var x = s.getContext('2d');
    x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#000814'; x.fillRect(0, 0, s.width, s.height);
    s.gw = c.gw; s.gh = c.gh;
    return (VC[k2] = s);
  }
  function hullGrad(x, pol, y0, y1) { var P = POL[pol], g = x.createLinearGradient(-8, y0, 8, y1); g.addColorStop(0, P.hull); g.addColorStop(0.55, P.hull2); g.addColorStop(1, mix(P.hull2, '#000000', 0.4)); return g; }

  // the three ships (pointing up), in either colour, banked a little either way
  function shipPic(id, pol, bank) {
    return vec('ship|' + id + '|' + pol + '|' + bank, 30, 30, function (x) {
      var P = POL[pol];
      x.scale(1 - Math.abs(bank) * 0.12, 1);
      x.strokeStyle = P.edge; x.lineWidth = 0.6;
      if (id === 'swift') {
        x.beginPath(); x.moveTo(0, -13); x.lineTo(2.2, -4); x.lineTo(9, 4); x.lineTo(9, 7); x.lineTo(2.5, 5); x.lineTo(2, 10); x.lineTo(-2, 10); x.lineTo(-2.5, 5); x.lineTo(-9, 7); x.lineTo(-9, 4); x.lineTo(-2.2, -4); x.closePath();
        x.fillStyle = hullGrad(x, pol, -13, 10); x.fill(); x.stroke();
        x.fillStyle = P.acc; x.fillRect(-0.6, -9, 1.2, 12); x.fillRect(6.5, 3.5, 2, 3); x.fillRect(-8.5, 3.5, 2, 3);
      } else if (id === 'titan') {
        x.beginPath(); x.moveTo(0, -11); x.lineTo(4, -6); x.lineTo(13, 2); x.lineTo(13, 8); x.lineTo(6, 7); x.lineTo(5, 11); x.lineTo(-5, 11); x.lineTo(-6, 7); x.lineTo(-13, 8); x.lineTo(-13, 2); x.lineTo(-4, -6); x.closePath();
        x.fillStyle = hullGrad(x, pol, -11, 11); x.fill(); x.stroke();
        [-8, 8].forEach(function (ex) { x.fillStyle = P.hull2; x.beginPath(); x.ellipse(ex, 5, 2.6, 5, 0, 0, 6.3); x.fill(); x.stroke(); x.fillStyle = P.acc; x.fillRect(ex - 1, 7, 2, 2.5); });
        x.fillStyle = P.acc; x.fillRect(-10, 3, 20, 1.2);
      } else {
        x.beginPath(); x.moveTo(0, -12); x.lineTo(3, -5); x.lineTo(11, 3); x.lineTo(11, 6); x.lineTo(4, 5); x.lineTo(5, 10); x.lineTo(1.5, 8); x.lineTo(-1.5, 8); x.lineTo(-5, 10); x.lineTo(-4, 5); x.lineTo(-11, 6); x.lineTo(-11, 3); x.lineTo(-3, -5); x.closePath();
        x.fillStyle = hullGrad(x, pol, -12, 10); x.fill(); x.stroke();
        x.fillStyle = P.acc; x.fillRect(-10, 3.6, 5, 1.2); x.fillRect(5, 3.6, 5, 1.2);
      }
      // the canopy
      var cg = x.createLinearGradient(0, -8, 0, 0); cg.addColorStop(0, pol === LIGHT ? '#bff4ff' : '#ff8aa8'); cg.addColorStop(1, pol === LIGHT ? '#1a6aa0' : '#40000e');
      x.fillStyle = cg; x.beginPath(); x.ellipse(bank * 0.6, -3, 1.9, 4, 0, 0, 6.3); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.ellipse(bank * 0.6 - 0.6, -4.5, 0.6, 1.5, 0, 0, 6.3); x.fill();
      // light along the side facing up when it banks
      if (bank) { x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.22 * Math.abs(bank); x.fillStyle = '#000000'; x.fillRect(bank < 0 ? 0 : -16, -16, 16, 32); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
    });
  }
  // the enemies (pointing down), either colour
  function enemyPic(type, pol, f) {
    var size = { dart: 18, swirl: 16, wasp: 22, kami: 16, turret: 22, drone: 24, lancer: 28, carrier: 32, gunship: 42, midboss: 62 }[type] || 20;
    return vec('en|' + type + '|' + pol + '|' + (f || 0), size, size, function (x) {
      var P = POL[pol]; x.strokeStyle = P.edge; x.lineWidth = 0.6;
      var hg = hullGrad(x, pol, -size / 2, size / 2);
      if (type === 'dart') {
        x.beginPath(); x.moveTo(0, 8); x.lineTo(7, -6); x.lineTo(2, -3); x.lineTo(0, -7); x.lineTo(-2, -3); x.lineTo(-7, -6); x.closePath(); x.fillStyle = hg; x.fill(); x.stroke();
        x.fillStyle = P.acc; x.fillRect(-0.8, -2, 1.6, 6);
      } else if (type === 'swirl') {
        for (var i = 0; i < 3; i++) { x.save(); x.rotate(i * 2.094 + (f || 0) * 0.5); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(6, -2, 7, -7); x.quadraticCurveTo(2, -4, 0, 0); x.fillStyle = hg; x.fill(); x.stroke(); x.restore(); }
        x.fillStyle = P.acc; x.beginPath(); x.arc(0, 0, 2.6, 0, 6.3); x.fill();
      } else if (type === 'wasp') {
        x.fillStyle = hg; x.beginPath(); x.ellipse(0, 1, 3.4, 8, 0, 0, 6.3); x.fill(); x.stroke();
        [-1, 1].forEach(function (s) { x.beginPath(); x.moveTo(s * 2, -2); x.lineTo(s * 10, -6 + (f ? 2 : 0)); x.lineTo(s * 9, 2); x.closePath(); x.globalAlpha = 0.85; x.fill(); x.globalAlpha = 1; x.stroke(); });
        x.fillStyle = P.acc; x.fillRect(-1, 4, 2, 4);
      } else if (type === 'kami') {
        x.fillStyle = hg; x.beginPath(); for (var j = 0; j < 8; j++) { var a = j * Math.PI / 4, r = j % 2 ? 3.5 : 7; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill(); x.stroke();
        x.fillStyle = P.acc; x.beginPath(); x.arc(0, 0, 2, 0, 6.3); x.fill();
      } else if (type === 'turret') {
        x.fillStyle = pol === LIGHT ? '#c8d4e4' : '#24262e'; x.beginPath(); x.ellipse(0, 0, 10, 7, 0, 0, 6.3); x.fill(); x.stroke();
        x.fillStyle = hg; x.beginPath(); x.arc(0, 0, 5, 0, 6.3); x.fill(); x.stroke();
      } else if (type === 'drone') {
        x.fillStyle = hg; x.beginPath(); for (var h = 0; h < 6; h++) { var b = h * Math.PI / 3 + Math.PI / 6; x.lineTo(Math.cos(b) * 10, Math.sin(b) * 10); } x.closePath(); x.fill(); x.stroke();
        x.strokeStyle = P.acc; x.lineWidth = 1; x.beginPath(); x.arc(0, 0, 6, (f || 0), (f || 0) + 4.5); x.stroke();
        x.fillStyle = P.acc; x.beginPath(); x.arc(0, 0, 2.6, 0, 6.3); x.fill();
      } else if (type === 'lancer') {
        x.fillStyle = hg; x.beginPath(); x.moveTo(0, 13); x.lineTo(5, 4); x.lineTo(5, -10); x.lineTo(2, -13); x.lineTo(-2, -13); x.lineTo(-5, -10); x.lineTo(-5, 4); x.closePath(); x.fill(); x.stroke();
        [-1, 1].forEach(function (s) { x.beginPath(); x.moveTo(s * 5, -6); x.lineTo(s * 12, -2); x.lineTo(s * 5, 3); x.closePath(); x.fill(); x.stroke(); });
        x.fillStyle = P.acc; x.beginPath(); x.arc(0, 9, 2.2, 0, 6.3); x.fill();
      } else if (type === 'carrier') {
        x.fillStyle = hg; x.beginPath(); x.moveTo(0, 14); x.lineTo(9, 8); x.lineTo(10, -12); x.lineTo(-10, -12); x.lineTo(-9, 8); x.closePath(); x.fill(); x.stroke();
        [-1, 1].forEach(function (s) { x.fillStyle = POL[pol].hull2; x.fillRect(s * 13 - 3, -8, 6, 14); x.strokeRect(s * 13 - 3, -8, 6, 14); });
        x.fillStyle = '#ffd84a'; x.fillRect(-4, -6, 8, 8); x.fillStyle = P.acc; x.fillRect(-1, 8, 2, 3);
      } else {   // gunship / midboss: a heavy craft with wings and guns
        var s2 = type === 'midboss' ? 1.45 : 1;
        x.scale(s2, s2);
        x.fillStyle = hg; x.beginPath(); x.moveTo(0, 18); x.lineTo(7, 10); x.lineTo(19, 4); x.lineTo(19, -4); x.lineTo(8, -6); x.lineTo(6, -16); x.lineTo(-6, -16); x.lineTo(-8, -6); x.lineTo(-19, -4); x.lineTo(-19, 4); x.lineTo(-7, 10); x.closePath(); x.fill(); x.stroke();
        x.fillStyle = POL[pol].hull2; [-13, 13].forEach(function (gx) { x.fillRect(gx - 2, 2, 4, 9); });
        x.fillStyle = P.acc; x.fillRect(-15, -1, 30, 1.6); x.beginPath(); x.arc(0, 2, 4, 0, 6.3); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(-5, -14, 3, 18);
      }
    });
  }
  function bulletPic(pol, kind) {
    var r = kind === 'big' ? 5.5 : kind === 'needle' ? 3 : 4;
    return vec('b|' + pol + '|' + kind, r * 4, r * 4, function (x) {
      var P = POL[pol], g = x.createRadialGradient(0, 0, 0, 0, 0, r * 2);
      if (pol === LIGHT) { g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#ffffff'); g.addColorStop(0.5, P.glow); g.addColorStop(1, 'rgba(60,200,255,0)'); }
      else { g.addColorStop(0, '#000000'); g.addColorStop(0.32, '#1a0008'); g.addColorStop(0.45, '#ff2a5c'); g.addColorStop(0.62, 'rgba(255,40,90,0.55)'); g.addColorStop(1, 'rgba(255,40,90,0)'); }
      x.fillStyle = g;
      if (kind === 'needle') { x.scale(0.62, 1.4); }
      x.beginPath(); x.arc(0, 0, r * 2, 0, 6.3); x.fill();
    }, true);
  }

  // ---------------------------------------------------------------- the three scenes
  var SC = {}, SCkey = '';
  function rnd(seed) { var a = seed; return function () { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; }
  function scenes() {
    var key = F.dw + 'x' + F.dh;
    if (SCkey === key) return SC;
    SCkey = key; SC = {};
    var S = F.scale, w = Math.ceil(GW * S), h = Math.ceil(GH * S), r, x, i;
    // the sea: deep water with sunlit ripples, one screen tall, repeating
    SC.sea = F.canvas(w, h); x = SC.sea.getContext('2d');
    var sg = x.createLinearGradient(0, 0, 0, h); sg.addColorStop(0, '#0b3d5e'); sg.addColorStop(0.5, '#0e4b70'); sg.addColorStop(1, '#0b3d5e'); x.fillStyle = sg; x.fillRect(0, 0, w, h);
    r = rnd(11); x.globalCompositeOperation = 'lighter';
    for (i = 0; i < 260; i++) {
      var wx = r() * w, wy = r() * h, wl = (6 + r() * 22) * S; x.globalAlpha = 0.05 + r() * 0.12; x.strokeStyle = r() < 0.3 ? '#bff0ff' : '#5fb8d8'; x.lineWidth = Math.max(1, S * 0.5);
      for (var rep = -1; rep <= 1; rep++) { var yy = wy + rep * h; x.beginPath(); x.moveTo(wx, yy); x.quadraticCurveTo(wx + wl / 2, yy - 2 * S, wx + wl, yy); x.stroke(); }   // drawn three times so the join never shows
    }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    // chalk cliffs down the left side (and a little on the right), with green tops and a line of surf; the shape
    // repeats exactly, so the join between one copy and the next never shows
    SC.cliff = F.canvas(w, h * 2); x = SC.cliff.getContext('2d'); r = rnd(29);
    [[0, 1], [w, -1]].forEach(function (side, si) {
      var base = side[0], dir = side[1], pts = [], n = 48, amp = si ? 14 : 34;
      for (i = 0; i <= n; i++) pts.push((si ? 4 : 18) + Math.abs(Math.sin(i / n * Math.PI * 3 + si) * amp) + r() * 8);
      pts[n] = pts[0];
      var yAt = function (j) { return j / n * h * 2; }, inset = function (j) { return Math.max(2, pts[j] - (si ? 5 : 11) - Math.abs(Math.sin(j * 1.7)) * 4); };
      var shape = function (f) { x.beginPath(); x.moveTo(base, 0); for (var j = 0; j <= n; j++) x.lineTo(base + dir * f(j) * S, yAt(j)); x.lineTo(base, h * 2); x.closePath(); };
      // the chalk face, lit from the left
      shape(function (j) { return pts[j]; });
      var cg = x.createLinearGradient(base, 0, base + dir * 60 * S, 0); cg.addColorStop(0, '#fbf8ee'); cg.addColorStop(1, '#b9b29c'); x.fillStyle = cg; x.fill();
      // the grass on top, with fields and hedges
      shape(inset);
      var gg = x.createLinearGradient(base, 0, base + dir * 50 * S, 0); gg.addColorStop(0, '#2e6f34'); gg.addColorStop(1, '#4c9446'); x.fillStyle = gg; x.fill();
      x.save(); x.clip();
      for (i = 0; i < 26; i++) { var fy = r() * h * 2, fh = (20 + r() * 40) * S; x.fillStyle = r() < 0.5 ? 'rgba(170,200,90,0.22)' : 'rgba(20,60,20,0.25)'; for (var rp2 = -1; rp2 <= 1; rp2++) x.fillRect(0, fy + rp2 * h * 2, w, fh); }
      for (i = 0; i < (si ? 30 : 110); i++) {   // trees, each with its shadow and a lit top
        var tj = Math.floor(r() * n), ty = yAt(tj) + r() * h * 2 / n, tx = (2 + r() * Math.max(1, inset(tj) - 6)) * S, tr = (1.6 + r() * 2.2) * S;
        for (var rp3 = -1; rp3 <= 1; rp3++) {
          var yy3 = ty + rp3 * h * 2, X3 = base + dir * tx;
          x.fillStyle = 'rgba(0,30,0,0.45)'; x.beginPath(); x.arc(X3 + tr * 0.6, yy3 + tr * 0.7, tr, 0, 6.3); x.fill();
          x.fillStyle = '#245a28'; x.beginPath(); x.arc(X3, yy3, tr, 0, 6.3); x.fill();
          x.fillStyle = 'rgba(150,210,110,0.5)'; x.beginPath(); x.arc(X3 - tr * 0.35, yy3 - tr * 0.35, tr * 0.45, 0, 6.3); x.fill();
        }
      }
      x.restore();
      // the cliff edge and the surf where the sea meets it
      x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 1.6 * S; x.beginPath(); pts.forEach(function (px, j) { var X = base + dir * (px + 1.5) * S; if (j) x.lineTo(X, yAt(j)); else x.moveTo(X, yAt(j)); }); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.28)'; x.lineWidth = 5 * S; x.stroke();
      x.strokeStyle = 'rgba(180,235,255,0.25)'; x.lineWidth = 1 * S; x.beginPath(); pts.forEach(function (px, j) { var X = base + dir * (px + 6 + Math.sin(j * 2.1) * 1.5) * S; if (j) x.lineTo(X, yAt(j)); else x.moveTo(X, yAt(j)); }); x.stroke();
    });
    // soft clouds and their shadows
    SC.cloud = F.canvas(w, h * 2); x = SC.cloud.getContext('2d'); r = rnd(53);
    if ('filter' in x) x.filter = 'blur(' + (6 * S) + 'px)';
    for (i = 0; i < 9; i++) {
      var cx = r() * w, cy = r() * h * 2, cr = (18 + r() * 30) * S; x.fillStyle = 'rgba(255,255,255,' + (0.22 + r() * 0.2).toFixed(2) + ')';
      for (var k = 0; k < 5; k++) { var bx0 = cx + (r() - 0.5) * cr * 1.6, by0 = cy + (r() - 0.5) * cr * 0.7, br0 = cr * (0.5 + r() * 0.5); for (var rp = -1; rp <= 1; rp++) { x.beginPath(); x.arc(bx0, by0 + rp * h * 2, br0, 0, 6.3); x.fill(); } }
    }
    if ('filter' in x) x.filter = 'none';
    SC.cshadow = F.canvas(w, h * 2); x = SC.cshadow.getContext('2d');   // the clouds' shadows on the sea
    x.drawImage(SC.cloud, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#001522'; x.fillRect(0, 0, w, h * 2);
    // orbit: a starfield and the Earth's edge
    SC.stars = F.canvas(w, h); x = SC.stars.getContext('2d'); r = rnd(71);
    for (i = 0; i < 200; i++) { x.globalAlpha = 0.25 + r() * 0.75; x.fillStyle = r() < 0.2 ? '#cfe0ff' : '#ffffff'; var z = r() < 0.1 ? 2 : 1; x.fillRect(r() * w, r() * h, z, z); }
    x.globalAlpha = 1;
    SC.plate = F.canvas(Math.ceil(36 * S), h); x = SC.plate.getContext('2d'); r = rnd(91);
    var pg = x.createLinearGradient(0, 0, 36 * S, 0); pg.addColorStop(0, '#2a3040'); pg.addColorStop(0.6, '#4a5268'); pg.addColorStop(1, '#1a1e28'); x.fillStyle = pg; x.fillRect(0, 0, 36 * S, h);
    for (i = 0; i < 16; i++) { var py = i * h / 16; x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, py, 36 * S, Math.max(1, S * 0.6)); if (r() < 0.6) { x.fillStyle = r() < 0.5 ? '#ffd84a' : '#7fe8ff'; x.globalAlpha = 0.85; x.fillRect((6 + r() * 20) * S, py + 6 * S, 2 * S, 2 * S); x.globalAlpha = 1; } }
    // the alien core: hexagons with glowing seams
    var hr = 14 * S, rows = Math.ceil(h / (hr * Math.sqrt(3))), hh = h / rows;   // a whole number of rows, so it repeats cleanly
    SC.hex = F.canvas(w, h); x = SC.hex.getContext('2d');
    x.fillStyle = '#07040e'; x.fillRect(0, 0, w, h);
    for (var row = -1; row <= rows + 1; row++) for (var col = -1; col * hr * 1.5 < w + hr * 2; col++) {
      var hx = col * hr * 1.5, hy = row * hh + (col % 2 ? hh / 2 : 0), rw = ((row % rows) + rows) % rows;
      x.beginPath(); for (var q = 0; q < 6; q++) { var an = q * Math.PI / 3; x.lineTo(hx + Math.cos(an) * hr * 0.92, hy + Math.sin(an) * hh / Math.sqrt(3) * 0.92); } x.closePath();
      var hg = x.createLinearGradient(hx, hy - hr, hx, hy + hr); hg.addColorStop(0, '#1c1430'); hg.addColorStop(1, '#0c0818'); x.fillStyle = hg; x.fill();
      x.strokeStyle = (col * 7 + rw * 3) % 5 === 0 ? 'rgba(255,60,110,0.38)' : 'rgba(80,200,255,0.18)'; x.lineWidth = Math.max(1, S * 0.5); x.stroke();
    }
    SC.vig = F.canvas(F.dw, F.dh); x = SC.vig.getContext('2d');
    var vg = x.createRadialGradient(F.dw / 2, F.dh / 2, Math.min(F.dw, F.dh) * 0.4, F.dw / 2, F.dh / 2, Math.max(F.dw, F.dh) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)'); x.fillStyle = vg; x.fillRect(0, 0, F.dw, F.dh);
    return SC;
  }
  function tile(c, y, x0, alpha) {   // a picture repeating down the screen, shifted by y (screen pixels)
    var g = F.g, hgt = c.height, off = Math.round(((y % hgt) + hgt) % hgt);   // whole pixels, so the two copies meet without a line
    g.globalAlpha = alpha == null ? 1 : alpha;
    g.drawImage(c, (x0 || 0) + F.ox, off - hgt + F.oy); g.drawImage(c, (x0 || 0) + F.ox, off + F.oy);
  }
  function drawScene(W, t) {
    var g = F.g, S = F.scale, sc = scenes(), idx = W.stageIdx < 0 ? 0 : W.stageIdx, y = (W.demo ? t * 0.03 : W.scrollY) * S;
    g.imageSmoothingEnabled = true; g.globalCompositeOperation = 'source-over';
    if (idx === 0) {
      tile(sc.sea, y * 0.8);
      tile(sc.cliff, y);
      tile(sc.cshadow, y * 1.9 + 46 * S, 14 * S, 0.3);   // the clouds' shadows fall on the sea and the cliffs below them
      tile(sc.cloud, y * 1.9, 0, 0.5);
    } else if (idx === 1) {
      // high up already: the sky darkens to space as the stage goes on
      var k = W.demo ? 0.6 : clamp(0.5 + W.clock / 2200 * 0.5, 0.5, 1), sky = g.createLinearGradient(0, 0, 0, F.dh);
      sky.addColorStop(0, mix('#3a7bd5', '#02030c', k)); sky.addColorStop(1, mix('#9fd0ff', '#060a20', k));
      g.globalAlpha = 1; g.fillStyle = sky; g.fillRect(0, 0, F.dw, F.dh);
      tile(sc.stars, y * 0.25, 0, k);
      // the Earth's edge rising into view behind
      var er = GW * 2.2 * S, ecx = F.dw / 2 + F.ox, ecy = F.dh + er - (40 + 80 * k) * S + F.oy;
      var eg = g.createRadialGradient(ecx, ecy, er * 0.9, ecx, ecy, er); eg.addColorStop(0, '#0b3a7a'); eg.addColorStop(0.97, '#3aa0ff'); eg.addColorStop(1, 'rgba(120,200,255,0)');
      g.globalAlpha = 0.15 + 0.85 * k; g.fillStyle = eg; g.beginPath(); g.arc(ecx, ecy, er, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1 - k; tile(sc.cloud, y * 1.4, 0, (1 - k) * 0.9);
      g.globalAlpha = 1; tile(sc.plate, y * 1.1, 0, 0.35 + 0.65 * k); tile(sc.plate, y * 1.1, F.dw - sc.plate.width, 0.35 + 0.65 * k);
    } else {
      tile(sc.hex, y * 0.9);
      // the black sun far behind, with its corona
      var bx = F.dw * 0.5 + F.ox, by = F.dh * 0.32 + F.oy + Math.sin(t / 3000) * 6 * S, br = 46 * S;
      g.globalCompositeOperation = 'lighter';
      var cr = g.createRadialGradient(bx, by, br * 0.9, bx, by, br * 2.1); cr.addColorStop(0, 'rgba(255,220,180,0.7)'); cr.addColorStop(0.3, 'rgba(255,80,140,0.3)'); cr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.75 + 0.15 * Math.sin(t / 700); g.fillStyle = cr; g.fillRect(bx - br * 2.2, by - br * 2.2, br * 4.4, br * 4.4);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = '#000000'; g.beginPath(); g.arc(bx, by, br, 0, 6.3); g.fill();
      // conduits of light and dark pulsing down the sides
      for (var s = 0; s < 2; s++) { var px = (s ? GW - 14 : 14), col = s ? '#ff2a5c' : '#3fd8ff'; F.rect(px - 1, 0, 2, GH, col, 0.25 + 0.15 * Math.sin(t / 300 + s * 3), true); F.light(px, ((t * 0.12 + s * 160) % (GH + 60)) - 30, 18, col, 0.5); }
    }
  }

  // ---------------------------------------------------------------- explosions in layers
  var FIRE = [], DEBRIS = [], SMOKE = [], TRAILS = new WeakMap(), lastW = null, absorbGlow = 0, switchGlow = 0, bombRing = null, hitN = 0;
  function boom(x, y, size, pol) {
    var big = size >= 3, mid = size === 2, P = POL[pol == null ? 0 : pol];
    F.flash(x, y, big ? 60 : mid ? 30 : 16, '#ffd8a0', big ? 30 : 16);
    FIRE.push({ x: x, y: y, r: big ? 26 : mid ? 14 : 8, t: 0, max: big ? 40 : 26 });
    F.ring(x, y, big ? 60 : mid ? 30 : 16, big ? '#ffffff' : '#ffc890', big ? 30 : 18, big ? 2 : 1.2);
    F.emit(x, y, big ? 60 : mid ? 26 : 12, ['#ffd84a', '#ff8a1a', '#ffffff', P.glow], big ? 3 : 2, big ? 50 : 30, { spread: big ? 16 : 4 });
    for (var i = 0; i < (big ? 18 : mid ? 8 : 3) && DEBRIS.length < 200; i++) { var a = Math.random() * 6.3, v = (0.6 + Math.random() * 1.8) * (big ? 1.6 : 1); DEBRIS.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: Math.random() * 6.3, va: (Math.random() - 0.5) * 0.4, s: 1 + Math.random() * (big ? 3 : 1.6), life: 50 + Math.random() * 30, col: pol === 1 ? '#2a2c38' : '#9aa8c0' }); }
    for (i = 0; i < (big ? 10 : mid ? 4 : 1) && SMOKE.length < 120; i++) SMOKE.push({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10, r: (big ? 10 : 5) * (0.6 + Math.random() * 0.6), t: 0, max: 70 + Math.random() * 40 });
    if (big) { F.shake(6); F.screen('#ffffff', 0.25, 18); } else if (mid) F.shake(2.2);
  }
  function onFx(W, f) {
    var P = f.pol != null ? POL[f.pol] : POL[0];
    switch (f.k) {
      case 'stage': F.banner('STAGE ' + f.n, f.name, '#ffffff', 150); break;
      case 'warn': F.banner('WARNING', f.text, '#ff3a6a', 170, true); break;
      case 'boom': boom(f.x, f.y, f.size, f.pol); break;
      case 'hit': hitN++; F.emit(f.x, f.y, 2, [P.glow, '#ffffff'], 1.2, 8, { size: 0.7 }); break;
      case 'absorb': absorbGlow = Math.min(1, absorbGlow + 0.35); F.emit(f.x, f.y, 2, [P.glow, '#ffffff'], 0.6, 12, { size: 0.8 }); break;
      case 'switch': switchGlow = 1; F.ring(f.x, f.y, 20, P.glow, 16, 1.5); F.emit(f.x, f.y, 14, [P.glow, '#ffffff'], 1.6, 18); break;
      case 'release': F.ring(f.x, f.y, 34, P.glow, 24, 2); F.flash(f.x, f.y, 30, P.glow, 20); F.floater('FLARE x' + f.n, f.x, f.y - 22, P.glow, 1, 60, 'flare'); break;
      case 'bomb': bombRing = { x: f.x, y: f.y, t: 0, pol: f.pol }; F.screen('#ffffff', 0.55, 30); F.shake(7); break;
      case 'pop': F.emit(f.x, f.y, 1, [P.glow, '#ffffff'], 0.8, 14); break;
      case 'chain': F.floater('CHAIN ' + f.n + '  +' + f.pts, GW / 2, 64, P.glow === POL[0].glow ? '#7fe8ff' : '#ff6a8c', f.n >= 4 ? 2 : 1, 70, 'chain'); break;
      case 'chainbreak': break;
      case 'item': F.floater(f.text, f.x, f.y - 8, f.kind === 'M' ? '#ffd84a' : f.kind === 'P' ? '#ff9a4a' : '#9fdcff', 1, 50); F.ring(f.x, f.y, 10, f.kind === 'M' ? '#ffd84a' : '#ffffff', 12); break;
      case 'points': F.floater('+' + f.pts, f.x, f.y, '#ffd84a', 1, 70); break;
      case 'shieldhit': F.ring(f.x, f.y, 26, '#9fdcff', 22, 2); F.emit(f.x, f.y, 20, ['#9fdcff', '#ffffff'], 1.8, 22); F.shake(2.5); F.floater(f.left ? 'SHIELD ' + f.left : 'SHIELD GONE', f.x, f.y - 22, '#9fdcff', 1, 60); break;
      case 'die': boom(f.x, f.y, 3, f.pol); break;
      case 'respawn': F.ring(f.x, f.y, 30, '#ffffff', 26, 1.5); break;
      case 'polflip': F.ring(f.x, f.y, 40, P.glow, 24, 2); F.flash(f.x, f.y, 26, P.glow, 16); break;
      case 'rage': F.ring(f.x, f.y, 70, '#ff3a6a', 36, 2.5); F.screen('#ff2040', 0.14, 30); F.shake(3); break;
      case 'bossdie': boom(f.x, f.y, 3, 0); boom(f.x - 20, f.y + 8, 3, 1); F.screen('#ffffff', 0.6, 50); F.floater('+' + f.pts, f.x, f.y + 20, '#ffd84a', 2, 140); break;
      case 'clear': F.banner('STAGE CLEAR', f.perfect ? '+' + f.pts + '  NO SHIPS LOST' : '+' + f.pts, '#5cff8a', 200); break;
      case 'extra': F.floater('EXTRA SHIP', GW / 2, GH - 60, '#5cff8a', 2, 100); break;
      case 'medalmiss': F.floater('MEDAL MISSED', GW - 50, GH - 30, '#c8a040', 1, 50, 'medal'); break;
    }
  }
  function stepExtras(W) {
    var i;
    for (i = FIRE.length - 1; i >= 0; i--) if (++FIRE[i].t > FIRE[i].max) FIRE.splice(i, 1);
    for (i = DEBRIS.length - 1; i >= 0; i--) { var d = DEBRIS[i]; d.vx *= 0.97; d.vy = d.vy * 0.97 + 0.03; d.x += d.vx; d.y += d.vy + 0.3; d.a += d.va; if (--d.life <= 0) DEBRIS.splice(i, 1); }
    for (i = SMOKE.length - 1; i >= 0; i--) { var s = SMOKE[i]; s.t++; s.y += (W.stage ? W.stage.scroll : 0.5) * 0.6; s.r += 0.12; if (s.t > s.max) SMOKE.splice(i, 1); }
    absorbGlow *= 0.9; switchGlow *= 0.88;
    if (bombRing && ++bombRing.t > 50) bombRing = null;
    if (F.low) return;
    // engine trails and smoke from damaged craft, missile trails
    var p = W.p;
    if (!p.dead && W.frame % 2 === 0) F.emit(p.x, p.y + 10, 1, [POL[p.pol].glow, '#ffffff'], 0.4, 14, { vy: 1.4, size: 1.1 });
    W.enemies.forEach(function (e) { if (e.hp < e.max * 0.5 && e.max > 20 && W.frame % 5 === 0) SMOKE.push({ x: e.x + (Math.random() - 0.5) * 8, y: e.y, r: 3, t: 0, max: 50 }); });
    W.shots.forEach(function (s) { if (s.kind === 'missile' && W.frame % 2 === 0) SMOKE.push({ x: s.x, y: s.y + 2, r: 1.5, t: 0, max: 26 }); });
  }

  // ---------------------------------------------------------------- the picture
  var dispScore = 0;
  function draw(g, W, t, mode, info) {
    F.begin(g, info, mode);
    if (W !== lastW) { lastW = W; F.reset(); FIRE = []; DEBRIS = []; SMOKE = []; TRAILS = new WeakMap(); dispScore = W.score; bombRing = null; }
    var q = W.fx; if (!W.demo) for (var i = 0; i < q.length; i++) onFx(W, q[i]); q.length = 0;
    var n = F.steps(W.frame); for (i = 0; i < n; i++) stepExtras(W);
    var S = F.scale, p = W.p;
    g.fillStyle = '#000'; g.globalAlpha = 1; g.fillRect(0, 0, F.dw, F.dh);
    drawScene(W, t);
    // smoke under everything that flies
    SMOKE.forEach(function (s) { var k = s.t / s.max; g.globalAlpha = (1 - k) * 0.35; g.fillStyle = '#3a3a44'; g.beginPath(); g.arc(s.x * S + F.ox, s.y * S + F.oy, s.r * S, 0, 6.3); g.fill(); });
    // ground units (turrets ride on boats on the sea)
    W.enemies.forEach(function (e) { if (e.type === 'turret') drawEnemy(W, e, t); });
    // the boss
    if (W.boss) drawBoss(W, t);
    // the air: enemies
    W.enemies.forEach(function (e) { if (e.type !== 'turret') drawEnemy(W, e, t); });
    // beams
    W.beams.forEach(function (b) {
      var P = POL[b.pol];
      if (b.warn > 0) { if ((b.warn >> 2) & 1) F.rect(b.x - 0.5, b.y, 1, GH - b.y, P.glow, 0.5, true); F.light(b.x, b.y, 6 + (55 - b.warn) * 0.2, P.glow, 0.6); }
      else { var fl = 0.8 + Math.random() * 0.2; F.rect(b.x - b.w / 2 - 2, b.y, b.w + 4, GH - b.y, P.glow, 0.3 * fl, true); F.rect(b.x - b.w / 2, b.y, b.w, GH - b.y, P.glow, 0.7 * fl, true); F.rect(b.x - 1.2, b.y, 2.4, GH - b.y, b.pol === LIGHT ? '#ffffff' : '#ffc0d0', fl, true); F.light(b.x, b.y, 14, P.glow, 0.9); }
    });
    // items
    W.items.forEach(function (it) { drawItem(it, t); });
    // the player's shots
    W.shots.forEach(function (s) {
      var P = POL[s.pol];
      if (s.kind === 'laser') { F.rect(s.x - 2.2, s.y - 5, 4.4, 15, P.glow, 0.28, true); F.rect(s.x - 1.1, s.y - 4.5, 2.2, 14, P.glow, 0.6, true); F.rect(s.x - 0.5, s.y - 4, 1, 13, '#ffffff', 1, true); }
      else if (s.kind === 'vulcan') {   // a bolt along its line of flight, bright at the head
        var va = Math.atan2(s.vy, s.vx) + Math.PI / 2;
        g.save(); g.translate(s.x * S + F.ox, s.y * S + F.oy); g.rotate(va); g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.4; g.fillStyle = P.glow; g.fillRect(-1.6 * S, -4 * S, 3.2 * S, 10 * S);
        g.globalAlpha = 0.95; g.fillStyle = '#ffffff'; g.fillRect(-0.6 * S, -3.5 * S, 1.2 * S, 7 * S); g.restore();
      }
      else if (s.kind === 'wide') { F.light(s.x, s.y, 4, P.glow, 0.7); F.rect(s.x - 1, s.y - 1.5, 2, 3, '#ffffff', 0.9, true); }
      else if (s.kind === 'missile') { F.rect(s.x - 0.8, s.y - 2, 1.6, 4, '#e8e8f0', 1); F.light(s.x, s.y + 2, 4, '#ff9a3d', 0.7); }
      else {   // homing laser: a curving trail
        var tr = TRAILS.get(s); if (!tr) { tr = []; TRAILS.set(s, tr); }
        tr.unshift({ x: s.x, y: s.y }); if (tr.length > 14) tr.pop();
        g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.strokeStyle = P.glow;
        for (var j = 1; j < tr.length; j++) { var f2 = 1 - j / tr.length; g.globalAlpha = f2 * 0.8; g.lineWidth = Math.max(1, 2.6 * S * f2); g.beginPath(); g.moveTo(tr[j - 1].x * S + F.ox, tr[j - 1].y * S + F.oy); g.lineTo(tr[j].x * S + F.ox, tr[j].y * S + F.oy); g.stroke(); }
        g.restore(); F.light(s.x, s.y, 5, '#ffffff', 0.8);
      }
    });
    // the player
    if (!p.dead && !W.over && !(p.inv > 0 && (p.inv >> 2) & 1 && p.inv < 200)) drawPlayer(W, t);
    // fire and debris
    FIRE.forEach(function (f) {
      var k = f.t / f.max, r = f.r * (0.5 + F.easeOut(Math.min(1, k * 1.6)) * 0.9);
      g.globalCompositeOperation = 'lighter';
      var fg = g.createRadialGradient(f.x * S + F.ox, f.y * S + F.oy, 0, f.x * S + F.ox, f.y * S + F.oy, r * S);
      fg.addColorStop(0, 'rgba(255,255,230,' + (1 - k).toFixed(2) + ')'); fg.addColorStop(0.35, 'rgba(255,190,80,' + ((1 - k) * 0.9).toFixed(2) + ')'); fg.addColorStop(0.7, 'rgba(255,80,30,' + ((1 - k) * 0.6).toFixed(2) + ')'); fg.addColorStop(1, 'rgba(120,20,10,0)');
      g.globalAlpha = 1; g.fillStyle = fg; g.beginPath(); g.arc(f.x * S + F.ox, f.y * S + F.oy, r * S, 0, 6.3); g.fill();
      g.globalCompositeOperation = 'source-over';
    });
    g.save();
    DEBRIS.forEach(function (d) { var c = Math.cos(d.a), sn = Math.sin(d.a); g.setTransform(c * S, sn * S, -sn * S, c * S, d.x * S + F.ox, d.y * S + F.oy); g.globalAlpha = Math.min(1, d.life / 30); g.fillStyle = d.col; g.fillRect(-d.s, -d.s * 0.5, d.s * 2, d.s); });
    g.restore();
    // enemy bullets, on top of everything so they are never hidden
    W.bullets.forEach(function (b) {
      var bp = bulletPic(b.pol, b.kind);
      if (b.kind === 'needle') put(bp, b.x, b.y, 1, Math.atan2(b.vy, b.vx) - Math.PI / 2); else put(bp, b.x, b.y);
    });
    F.drawFx();
    // the bomb's ring of light
    if (bombRing) { var bk = bombRing.t / 50; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (1 - bk) * 0.9; g.strokeStyle = POL[bombRing.pol].glow; g.lineWidth = (8 - bk * 6) * S; g.beginPath(); g.arc(bombRing.x * S + F.ox, bombRing.y * S + F.oy, (10 + F.easeOut(bk) * 260) * S, 0, 6.3); g.stroke(); g.restore(); }
    drawHud(W, info, t);
    F.drawLabels(GW);
    if (SC.vig && !F.low) { g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.drawImage(SC.vig, 0, 0); }
    F.end();
  }
  function drawPlayer(W, t) {
    var p = W.p, P = POL[p.pol], g = F.g, S = F.scale;
    var bank = clamp(Math.round(p.vx / (W.ship.speed * 0.5)), -2, 2), pic = shipPic(W.shipId, p.pol, bank);
    // the absorbing field: always faintly there, bright while it drinks bullets
    F.light(p.x, p.y, E.ABSORB_R + 5, P.glow, 0.12 + absorbGlow * 0.5);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 + absorbGlow * 0.6 + switchGlow * 0.5; g.strokeStyle = P.glow; g.lineWidth = Math.max(1, S * 0.6);
    g.beginPath(); g.arc(p.x * S + F.ox, p.y * S + F.oy, (E.ABSORB_R + Math.sin(t / 150) * 0.8) * S, 0, 6.3); g.stroke(); g.restore();
    // engine flames
    var up = p.vy < 0 ? 1.6 : p.vy > 0 ? 0.6 : 1, fl = (3 + Math.random() * 2) * up, ex = W.shipId === 'titan' ? [-8, 8] : [-2.5, 2.5];
    ex.forEach(function (o) { F.rect(p.x + o - 0.9, p.y + 9, 1.8, fl, P.glow, 0.7, true); F.rect(p.x + o - 0.4, p.y + 9, 0.8, fl * 0.7, '#ffffff', 0.9, true); F.light(p.x + o, p.y + 10 + fl / 2, 4, P.glow, 0.5); });
    putGlow('ship|' + W.shipId + '|' + p.pol + '|' + bank, pic, P.glow, p.x, p.y, 0.55 + switchGlow * 0.4);
    put(pic, p.x, p.y);
    if (p.shield > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18 + 0.06 * Math.sin(t / 200); g.fillStyle = '#9fdcff'; g.beginPath(); g.arc(p.x * S + F.ox, p.y * S + F.oy, 15 * S, 0, 6.3); g.fill(); g.restore(); }
    F.light(p.x, p.y, 3.5, '#ffffff', 0.9); F.rect(p.x - 1.5, p.y - 1.5, 3, 3, '#000000', 0.6); F.rect(p.x - 1, p.y - 1, 2, 2, '#ffffff', 1);   // the true hit point: tiny and white
  }
  function drawEnemy(W, e, t) {
    var P = POL[e.pol], f = e.type === 'swirl' ? Math.floor(e.t / 3) % 4 : e.type === 'wasp' ? (e.t >> 2) & 1 : e.type === 'drone' ? Math.floor(e.t / 4) % 6 : 0;
    var pic = enemyPic(e.type, e.pol, e.type === 'drone' ? f : f), rot = 0;
    if (e.type === 'dart' && (Math.abs(e.dx || 0) + Math.abs(e.dy || 0) > 0.1)) rot = Math.atan2(e.dy, e.dx) - Math.PI / 2;
    if (e.type === 'turret') {   // a boat on the sea in stage 1, a platform elsewhere
      var g = F.g, S = F.scale;
      if (W.stageIdx === 0) { g.globalAlpha = 0.4; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(e.x * S + F.ox, (e.y + 9) * S + F.oy, 6 * S, 10 * S, 0, 0, 6.3); g.fill(); }
      put(pic, e.x, e.y);
      var a = Math.atan2(W.p.y - e.y, W.p.x - e.x);
      g.save(); g.translate(e.x * S + F.ox, e.y * S + F.oy); g.rotate(a); g.fillStyle = e.pol === LIGHT ? '#e8f0ff' : '#14151c'; g.fillRect(0, -1.3 * S, 9 * S, 2.6 * S); g.fillStyle = P.acc; g.fillRect(7 * S, -1.3 * S, 2 * S, 2.6 * S); g.restore();
    } else {
      if (W.stageIdx !== 1) put(shadowOf('en|' + e.type + '|' + e.pol + '|' + f, pic), e.x + 5, e.y + 9, 0.32, rot);   // its shadow on the ground below (none in orbit)
      putGlow('en|' + e.type + '|' + e.pol + '|' + f, pic, P.glow, e.x, e.y, 0.55);
      put(pic, e.x, e.y, 1, rot);
    }
    if (e.flash) F.light(e.x, e.y, e.r + 3, '#ffffff', 0.7);
    if (e.type === 'lancer') F.light(e.x, e.y + 9, 4 + Math.sin(t / 90) * 1.5, P.glow, 0.7);
    if (e.max >= 30 && e.hp < e.max) { F.rect(e.x - 10, e.y - e.r - 5, 20, 1.5, '#000000', 0.5); F.rect(e.x - 10, e.y - e.r - 5, 20 * e.hp / e.max, 1.5, P.glow, 0.9, true); }
  }
  function drawItem(it, t) {
    var g = F.g, S = F.scale, spin = Math.cos(it.t * 0.12), sx = Math.max(0.2, Math.abs(spin));
    if (it.kind === 'M') {
      F.light(it.x, it.y, 8, '#ffd84a', 0.5);
      g.save(); g.translate(it.x * S + F.ox, it.y * S + F.oy); g.scale(sx, 1);
      var cg = g.createRadialGradient(-1.5 * S, -1.5 * S, 0, 0, 0, 5 * S); cg.addColorStop(0, '#fff6c0'); cg.addColorStop(0.6, '#ffcc33'); cg.addColorStop(1, '#a87000');
      g.globalAlpha = 1; g.fillStyle = cg; g.beginPath(); g.arc(0, 0, 5 * S, 0, 6.3); g.fill(); g.strokeStyle = '#7a5000'; g.lineWidth = S * 0.5; g.stroke();
      if (spin > 0.5) { g.fillStyle = '#ffffff'; g.fillRect(-0.5 * S, -2.5 * S, S, 5 * S); g.fillRect(-2.5 * S, -0.5 * S, 5 * S, S); }
      g.restore();
    } else {
      var col = it.kind === 'P' ? '#ff7a2a' : '#4aa8ff';
      F.light(it.x, it.y, 10, col, 0.55);
      g.save(); g.translate(it.x * S + F.ox, it.y * S + F.oy); g.rotate(Math.PI / 4 + it.t * 0.04);
      var ig = g.createLinearGradient(-5 * S, -5 * S, 5 * S, 5 * S); ig.addColorStop(0, mix(col, '#ffffff', 0.6)); ig.addColorStop(1, mix(col, '#000000', 0.3));
      g.globalAlpha = 1; g.fillStyle = ig; g.fillRect(-4.5 * S, -4.5 * S, 9 * S, 9 * S); g.restore();
      F.text(it.kind, it.x + 0.5, it.y - 3.5, '#ffffff', 1);
    }
  }
  function drawBoss(W, t) {
    var B = W.boss, g = F.g, S = F.scale, dying = B.dead > 0, ja = dying ? (Math.random() - 0.5) * 3 : 0;
    var x = B.x + ja, y = B.y + ja;
    if (B.kind === 'leviathan') {
      // the battleship: a long hull with a wake behind it
      g.save(); g.translate(x * S + F.ox, y * S + F.oy);
      g.globalAlpha = 0.35; g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-24 * S, -60 * S); g.lineTo(24 * S, -60 * S); g.lineTo(40 * S, -120 * S); g.lineTo(-40 * S, -120 * S); g.fill();
      g.globalAlpha = 1;
      var hg = g.createLinearGradient(-30 * S, 0, 30 * S, 0); hg.addColorStop(0, '#2a3040'); hg.addColorStop(0.5, '#5a6478'); hg.addColorStop(1, '#22262f');
      var HULL = [[0, 66], [34, 36], [46, -8], [44, -52], [26, -70], [-26, -70], [-44, -52], [-46, -8], [-34, 36]];
      g.fillStyle = 'rgba(0,10,20,0.35)'; g.beginPath(); HULL.forEach(function (v) { g.lineTo((v[0] + 6) * S, (v[1] + 9) * S); }); g.fill();   // its shadow on the water
      g.fillStyle = hg; g.beginPath(); HULL.forEach(function (v) { g.lineTo(v[0] * S, v[1] * S); }); g.closePath(); g.fill();
      g.strokeStyle = '#11141a'; g.lineWidth = S; g.stroke();
      g.fillStyle = 'rgba(0,0,0,0.35)'; for (var i = -5; i <= 4; i++) g.fillRect(-36 * S, i * 12 * S, 72 * S, 0.8 * S);
      g.fillStyle = '#ff3a3a'; g.globalAlpha = 0.5 + 0.5 * Math.sin(t / 160); g.fillRect(-44 * S, -10 * S, 2 * S, 2 * S); g.fillRect(42 * S, -10 * S, 2 * S, 2 * S); g.globalAlpha = 1;
      g.fillStyle = '#3a4252'; g.fillRect(-12 * S, -30 * S, 24 * S, 40 * S); g.fillStyle = '#ffd84a'; for (i = 0; i < 4; i++) g.fillRect((-9 + i * 5) * S, -26 * S, 2 * S, 1.5 * S);
      g.restore();
    } else if (B.kind === 'halo') {
      g.save(); g.translate(x * S + F.ox, y * S + F.oy);
      g.strokeStyle = '#5a6478'; g.lineWidth = 7 * S; g.beginPath(); g.ellipse(0, 0, 56 * S, 34 * S, 0, 0, 6.3); g.stroke();
      g.strokeStyle = '#9aa8c0'; g.lineWidth = 2 * S; g.stroke();
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(127,232,255,0.4)'; g.lineWidth = S; g.setLineDash([4 * S, 6 * S]); g.lineDashOffset = -t / 30; g.stroke(); g.setLineDash([]);
      g.restore();
    } else {
      // tendrils of energy between the two cores
      var a = B.parts[0], b = B.parts[1];
      if (a.alive && b.alive) { g.save(); g.globalCompositeOperation = 'lighter'; for (var k = 0; k < 3; k++) { g.globalAlpha = 0.25; g.strokeStyle = k % 2 ? '#ff3a6a' : '#5ce0ff'; g.lineWidth = (2 - k * 0.5) * S; g.beginPath(); g.moveTo(a.x * S + F.ox, a.y * S + F.oy); g.quadraticCurveTo((x + Math.sin(t / 200 + k) * 30) * S + F.ox, (y + Math.cos(t / 260 + k) * 20) * S + F.oy, b.x * S + F.ox, b.y * S + F.oy); g.stroke(); } g.restore(); }
    }
    B.parts.forEach(function (q) {
      var P = POL[q.pol], qx = q.x + ja, qy = q.y + ja;
      if (!q.alive) { if (W.frame % 6 === 0 && !F.low) SMOKE.push({ x: qx, y: qy, r: 3, t: 0, max: 40 }); F.light(qx, qy, 6, '#ff6a1a', 0.4 + Math.random() * 0.2); return; }
      if (q.core) {
        var cg = g.createRadialGradient(qx * S + F.ox - q.r * 0.3 * S, qy * S + F.oy - q.r * 0.3 * S, 0, qx * S + F.ox, qy * S + F.oy, q.r * S);
        if (q.pol === LIGHT) { cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.6, '#bfe8ff'); cg.addColorStop(1, '#3a8ac0'); } else { cg.addColorStop(0, '#5a1020'); cg.addColorStop(0.6, '#1a0008'); cg.addColorStop(1, '#000000'); }
        F.light(qx, qy, q.r * 2.2, P.glow, 0.55 + 0.2 * Math.sin(t / 160));
        g.globalAlpha = 1; g.fillStyle = cg; g.beginPath(); g.arc(qx * S + F.ox, qy * S + F.oy, q.r * S, 0, 6.3); g.fill();
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = P.glow; g.lineWidth = 1.4 * S; g.globalAlpha = 0.8;
        g.beginPath(); g.arc(qx * S + F.ox, qy * S + F.oy, (q.r + 3) * S, t / 400, t / 400 + 4.2); g.stroke(); g.restore();
      } else {
        var bg = g.createRadialGradient(qx * S + F.ox, qy * S + F.oy, 0, qx * S + F.ox, qy * S + F.oy, q.r * S);
        bg.addColorStop(0, P.hull); bg.addColorStop(1, P.hull2);
        F.light(qx, qy, q.r + 6, P.glow, 0.35);
        g.globalAlpha = 1; g.fillStyle = bg; g.beginPath(); g.arc(qx * S + F.ox, qy * S + F.oy, q.r * S, 0, 6.3); g.fill(); g.strokeStyle = P.edge; g.lineWidth = 0.6 * S; g.stroke();
        var ang = Math.atan2(W.p.y - qy, W.p.x - qx);   // its gun follows you
        g.save(); g.translate(qx * S + F.ox, qy * S + F.oy); g.rotate(ang); g.fillStyle = q.pol === LIGHT ? '#dfe8f8' : '#14151c'; g.fillRect(0, -1.6 * S, (q.r + 5) * S, 3.2 * S); g.fillStyle = P.acc; g.fillRect((q.r + 3) * S, -1.6 * S, 2 * S, 3.2 * S); g.restore();
      }
      if (q.flash) F.light(qx, qy, q.r + 4, '#ffffff', 0.6);
    });
    // its strength along the top
    if (!dying && B.enter <= 0) {
      var tot = 0, left = 0; B.parts.forEach(function (q) { if (q.core) { tot += q.max; left += Math.max(0, q.hp); } });
      F.rect(40, 17, 160, 4, '#000000', 0.6); F.rect(41, 18, 158 * left / tot, 2, B.phase === 2 ? '#ff3a6a' : '#ffd84a', 1, true);
      F.text(B.name, GW / 2, 22, '#ffffff', 1, null, 0.3, 0.85);
    }
  }
  function drawHud(W, info, t) {
    var p = W.p;
    dispScore += Math.max(1, Math.ceil((W.score - dispScore) * 0.2)) * (W.score > dispScore ? 1 : 0); if (dispScore > W.score) dispScore = W.score;
    F.text(('0000000' + Math.min(99999999, dispScore)).slice(-8), 6, 4, '#ffffff', 1, 'left', 0.4);
    F.text(('0000000' + Math.min(99999999, info ? info.best : W.score)).slice(-8), GW - 6, 4, '#ffd84a', 1, 'right', 0.3);
    F.text('STAGE ' + W.stageNo, GW / 2, 4, '#8fa3d1', 1);
    // the chain: its level and the three of this set
    if (W.chain > 0 || W.chainN > 0) {
      var cc = W.chainPol === LIGHT ? '#7fe8ff' : '#ff6a8c';
      if (W.chain > 0) F.text('CHAIN ' + W.chain, GW - 6, 13, cc, 1, 'right', 0.5);
      for (var i = 0; i < 3; i++) F.rect(GW - 8 - (2 - i) * 5, 23, 3, 3, i < W.chainN ? cc : '#ffffff', i < W.chainN ? 1 : 0.15, i < W.chainN);
    }
    // the flare meter, up the left side, in four steps
    var fh = 120, fy = GH - 60 - fh, P = POL[p.pol];
    F.rect(3, fy - 1, 5, fh + 2, '#000000', 0.55);
    F.rect(4, fy + fh * (1 - p.flare / 100), 3, fh * p.flare / 100, P.glow, 0.9, true);
    for (i = 1; i < 4; i++) F.rect(3, fy + fh * i / 4, 5, 0.8, '#000000', 0.8);
    if (p.flare >= 25) F.text('FLARE', 3, fy - 10, P.glow, 1, 'left', 0.6, 0.6 + 0.4 * Math.sin(t / 150));
    // ships and bombs bottom left, power bottom right, the next medal's value
    for (i = 0; i < Math.min(6, W.lives - 1); i++) put(shipPic(W.shipId, LIGHT, 0), 10 + i * 11, GH - 9, 0.85, 0, 0.5, 0.5);
    for (i = 0; i < Math.min(6, p.bombs); i++) { F.light(12 + i * 9, GH - 20, 4, '#4aa8ff', 0.5); F.text('B', 12 + i * 9, GH - 23.5, '#cfe6ff', 1); }
    for (i = 0; i < 4; i++) F.rect(GW - 30 + i * 6, GH - 8, 4, 4, i < p.power ? '#ff9a4a' : '#ffffff', i < p.power ? 1 : 0.15, i < p.power);
    if (W.medal > 0) F.text(String(E.MEDALS[Math.min(E.MEDALS.length - 1, W.medal)]), GW - 6, GH - 20, '#ffd84a', 1, 'right', 0.4, 0.85);
  }

  // ---------------------------------------------------------------- sound
  var absorbRun = 0, absorbAt = 0, lastMissile = 0;
  function pan(e) { return e && e.x != null ? Math.max(-0.8, Math.min(0.8, (e.x - GW / 2) / (GW / 2))) : 0; }
  function sound(name, A, e) {
    var p = pan(e), now = performance.now(), n;
    switch (name) {
      case 'boom': A.noise(0.3, 0.14, 4000, { pan: p, verb: 0.2 }); A.tone(130, 0.2, 0.08, { type: 'sine', to: 40, pan: p }); break;
      case 'bigboom': A.noise(0.9, 0.26, 3000, { pan: p, verb: 0.45 }); A.tone(90, 0.7, 0.16, { type: 'sine', to: 25, pan: p }); A.tone(220, 0.3, 0.04, { type: 'sawtooth', to: 50, pan: p }); break;
      case 'absorb':
        absorbRun = now - absorbAt < 220 ? Math.min(14, absorbRun + 1) : 0; absorbAt = now;
        A.tone(e && e.pol ? 520 * Math.pow(1.06, absorbRun) : 880 * Math.pow(1.06, absorbRun), 0.07, 0.022, { type: 'sine', verb: 0.25 }); break;
      case 'switch': if (e && e.pol) A.tone(900, 0.16, 0.04, { type: 'sawtooth', to: 260 }); else A.tone(260, 0.16, 0.04, { type: 'sawtooth', to: 900 }); A.noise(0.12, 0.04, 2000, { type: 'bandpass', q: 1.5, to: 6000 }); break;
      case 'chain': n = (e && e.n) || 1; [0, 4, 7].forEach(function (s, k) { A.tone(523 * Math.pow(2, (s + Math.min(12, n * 2)) / 12), 0.14, 0.045, { type: 'square', when: k * 0.06, verb: 0.3 }); }); break;
      case 'chainbreak': A.tone(330, 0.18, 0.025, { type: 'triangle', to: 160 }); break;
      case 'medal': n = (e && e.n) || 1; A.tone(1046 * Math.pow(1.06, Math.min(12, n)), 0.08, 0.04, { type: 'square' }); A.tone(1568 * Math.pow(1.06, Math.min(12, n)), 0.16, 0.035, { type: 'square', when: 0.06, verb: 0.3 }); break;
      case 'medalmiss': A.tone(400, 0.2, 0.03, { type: 'triangle', to: 200 }); break;
      case 'power': [392, 523, 659, 784, 1047].forEach(function (f, k) { A.tone(f, 0.1, 0.04, { type: 'square', when: k * 0.045, verb: 0.3 }); }); break;
      case 'release': for (var k = 0; k < 6; k++) A.tone(1400 + k * 180, 0.25, 0.025, { type: 'sawtooth', to: 400, when: k * 0.03, verb: 0.35 }); A.noise(0.4, 0.08, 6000, { type: 'highpass', to: 1500 }); break;
      case 'bomb': A.noise(1.6, 0.34, 2600, { verb: 0.6 }); A.tone(70, 1.2, 0.22, { type: 'sine', to: 20 }); A.tone(400, 0.6, 0.05, { type: 'sawtooth', to: 60, verb: 0.4 }); break;
      case 'empty': A.tone(180, 0.08, 0.03, { type: 'square' }); break;
      case 'missile': if (now - lastMissile > 260) { lastMissile = now; A.noise(0.2, 0.03, 1500, { type: 'bandpass', q: 1, to: 600, pan: p }); } break;
      case 'shield': A.tone(1300, 0.3, 0.05, { type: 'sine', to: 400, verb: 0.3 }); A.noise(0.2, 0.08, 7000, { type: 'bandpass', q: 3 }); break;
      case 'die': A.noise(1.4, 0.32, 3000, { pan: p, verb: 0.5 }); A.tone(160, 1.1, 0.14, { type: 'sine', to: 30 }); [392, 330, 262].forEach(function (f, j) { A.tone(f, 0.2, 0.04, { type: 'triangle', when: 0.3 + j * 0.16 }); }); break;
      case 'respawn': [523, 784, 1047].forEach(function (f, j) { A.tone(f, 0.12, 0.04, { type: 'triangle', when: j * 0.07, verb: 0.3 }); }); break;
      case 'warning': for (var j2 = 0; j2 < 6; j2++) A.tone(j2 % 2 ? 494 : 392, 0.24, 0.05, { type: 'square', when: j2 * 0.26, verb: 0.3 }); break;
      case 'rage': A.tone(110, 0.8, 0.1, { type: 'sawtooth', to: 220, verb: 0.4 }); A.tone(116, 0.8, 0.08, { type: 'sawtooth', to: 233, verb: 0.4 }); break;
      case 'flip': A.tone(600, 0.2, 0.03, { type: 'sine', to: 300 }); break;
      case 'beamwarn': A.tone(200, 0.9, 0.03, { type: 'sawtooth', to: 900, pan: p }); break;
      case 'beam': A.noise(0.6, 0.08, 1200, { type: 'bandpass', q: 4, pan: p }); A.tone(110, 0.6, 0.05, { type: 'square', pan: p }); break;
      case 'bossdie': A.noise(3, 0.36, 3000, { verb: 0.7 }); A.tone(80, 2.6, 0.22, { type: 'sine', to: 18 }); [784, 659, 523, 392, 523, 659, 784, 1047, 1319].forEach(function (f, k3) { A.tone(f, 0.15, 0.045, { type: 'square', when: 0.9 + k3 * 0.09, verb: 0.45 }); }); break;
      case 'stage': A.noise(1, 0.05, 300, { type: 'bandpass', q: 2, to: 7000 }); [392, 523, 659, 784].forEach(function (f, k4) { A.tone(f, 0.14, 0.045, { type: 'triangle', when: 0.5 + k4 * 0.1, verb: 0.4 }); }); break;
      case 'clear': [523, 659, 784, 1047, 1319, 1568, 2093].forEach(function (f, k5) { A.tone(f, 0.18, 0.05, { type: 'square', when: k5 * 0.08, verb: 0.5 }); }); break;
      case 'extra': [523, 659, 784, 1047, 784, 1047].forEach(function (f, k6) { A.tone(f, 0.1, 0.05, { type: 'square', when: k6 * 0.09, verb: 0.3 }); }); break;
      case 'over': [392, 330, 262, 196].forEach(function (f, k7) { A.tone(f, 0.32, 0.06, { type: 'triangle', when: k7 * 0.26, verb: 0.4 }); }); break;
    }
  }
  // music (Settings > Music, off unless switched on): a driving synth line in a minor key
  var BPM = 138, ST16 = 60 / BPM / 4, nextT = 0, stepN = 0;
  var PROG = [[55, [440, 523, 659, 784]], [43.65, [349, 440, 523, 659]], [49, [392, 494, 587, 784]], [41.2, [330, 415, 494, 659]]];
  var lastTick = 0;
  function frameAudio(W, A, mode, SET) {
    var playing = !!(W && !W.demo && mode === 'play' && SET.sound), hits = hitN; hitN = 0;
    if (playing && hits) {   // a soft tick as your shots land - never more than one every 70 ms
      var pt = performance.now();
      if (pt - lastTick > 70) { lastTick = pt; A.tone(1800 + Math.random() * 300, 0.03, 0.012, { type: 'square', to: 900 }); }
    }
    if (!playing || !SET.music) { nextT = 0; return; }
    var a = A.ctx(); if (!a) return;
    var now = a.currentTime;
    if (!nextT || nextT < now) { nextT = now + 0.06; stepN = 0; }
    while (nextT < now + 0.2) {
      var bar = Math.floor(stepN / 16) % 4, s = stepN % 16, ch = PROG[bar], when = nextT - now;
      A.tone(ch[0] * (s % 4 === 2 ? 2 : 1), ST16 * 0.9, 0.05, { type: 'sawtooth', when: when, attack: 0.004 });
      if (s % 2 === 0) A.tone(ch[1][(s / 2) % 4] * 2, ST16 * 1.6, 0.011, { type: 'square', when: when, verb: 0.35 });
      if (s % 4 === 0) A.tone(140, 0.12, 0.13, { type: 'sine', to: 40, when: when });
      if (s === 4 || s === 12) A.noise(0.12, 0.06, 2400, { type: 'bandpass', q: 1.2, when: when });
      A.noise(0.025, 0.01, 9000, { type: 'highpass', to: 7000, when: when });
      nextT += ST16; stepN++;
    }
  }

  A.start({
    id: 'eclipse', store: 'ecl365', title: '365 Eclipse', width: GW, height: GH, waveWord: 'stage', alt: true, touchMove: true,
    pad: [{ act: 'fire', label: 'Switch', cls: 'fire' }, { act: 'alt', label: 'Bomb', cls: 'alt' }],
    speeds: { options: [[1, 'Gentle'], [2, 'Classic'], [3, 'Fast']], def: 1 },
    settings: [
      { key: 'ship', type: 'seg', label: 'Ship', small: 'Swift is quick with lasers, Striker all-round, Titan slow and tough with missiles. Changes from your next game.', options: [['swift', 'Swift'], ['striker', 'Striker'], ['titan', 'Titan']], def: 'striker' },
      { key: 'music', type: 'switch', label: 'Music', small: 'A synth track while you play.', def: false },
      { key: 'shake', type: 'switch', label: 'Screen shake', small: 'The screen shakes when something big blows up.', def: !reducedMotion }
    ],
    picker: { key: 'ship', label: 'Choose your ship', options: [['swift', 'Swift', 'Fast · lasers'], ['striker', 'Striker', 'All-round · spread'], ['titan', 'Titan', 'Tough · missiles']] },
    newWorld: function (speed, set) { return E.newWorld(speed, null, set && set.ship); },
    statKey: function (W) { return 'v' + W.diff; },
    hires: function () { return true; },
    step: E.step, hud: E.hud, draw: draw, sound: sound, frameAudio: frameAudio,
    quietSay: function () { return true; },
    overText: function (W) { return 'Game over – stage ' + W.stageNo; },
    titleText: 'Your ship is <b>light</b> or <b>dark</b>. Soak up bullets of your own colour, dodge the other &mdash; and hit enemies of the other colour for double damage.',
    keysText: '<b>Arrows</b> or the mouse to fly &middot; <b>Space</b> or click switches colour &middot; <b>B</b> or right-click: flare / bomb &middot; <b>P</b> pause',
    touchText: 'Drag anywhere to fly &middot; <b>Switch</b> changes colour &middot; <b>Bomb</b> releases your flare or a bomb',
    help: [
      '<b>Your guns fire by themselves.</b> Fly with the arrow keys (or W A S D), or move the mouse; on a tablet, drag anywhere on the screen.',
      '<b>Light and dark:</b> your ship is one colour at a time &mdash; press <b>Space</b> or click to switch. Bullets of <b>your</b> colour are soaked up harmlessly; the <b>other</b> colour hurts. Only the tiny white dot in the middle of your ship can be hit.',
      '<b>Double damage:</b> your shots do twice the damage to enemies of the <b>other</b> colour.',
      '<b>Flare:</b> soaking up bullets fills the meter on the left. Press <b>B</b> (or right-click, or the Bomb button) to release it as homing lasers &mdash; when it is full it goes by itself. With too little flare, the same button drops a <b>bomb</b> that clears the screen.',
      '<b>Chains:</b> destroy enemies in threes of one colour &mdash; three light, then three dark or light again &mdash; and each set doubles the bonus. The dots at the top right show the set.',
      '<b>Medals:</b> catch the gold medals in a row and each is worth more, up to 10,000. <b>P</b> powers up your weapon (to four levels), <b>B</b> adds a bomb.',
      '<b>Bosses:</b> shoot off their turrets for a bonus &mdash; their cores are tougher while the turrets stand. Gentle gives you a three-hit shield and five ships.'
    ]
  });
})();
