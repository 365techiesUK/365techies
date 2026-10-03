/* 365 Bat & Ball - the picture and the sound (3 Oct 2026; the "modern revamp" the same night - owner: "bring it up to
 * date ... make the effects a lot better ... considerably better and better graphics and more going on").
 * The rules are in engine.js (window.BBEngine); the cabinet is ../common/arcade.js; glows / sparks / pixel text are
 * ../common/arcade-fx.js. Everything is drawn straight onto the screen at full sharpness:
 *   depth   - bricks, ball, bat, capsules and invaders cast shadows on the scene behind
 *   light   - each ball lights up the bricks and the floor round it; explosive and gold bricks glow
 *   impact  - bricks shatter into spinning shards with a pop of light; explosions with smoke and a shockwave; the bat
 *             recoils; the floor ripples when the ball hits the bat; neon walls flash where they are struck
 *   motion  - the ball stretches with speed and leaves a comet trail; bricks drop into place at the start of a level;
 *             capsules spin; the bat's thrusters flare as it moves; the score rolls up
 *   scene   - a striped sun behind mountains, a rolling grid floor, drifting dust, a colour theme per level
 * Sound: glassy breaks with a rising tune, booming explosions, a punchy bat - and an optional synthwave track (Music,
 * off unless switched on). Every picture and sound is our own, made on the spot - nothing is downloaded. */
(function () {
  'use strict';
  var E = window.BBEngine, A = window.Arcade365, F = window.Arcade365FX.create();
  var GW = E.WIDTH, GH = E.HEIGHT, L = E.L, R = E.R, T = E.T, BAT_Y = E.BAT_Y, BAT_H = E.BAT_H, BALL = E.BALL, NET_Y = E.NET_Y;
  var reducedMotion = F.reduced, HZ = 150;   // the horizon

  // ---------------------------------------------------------------- colours
  var BRICK = { w: '#eef1ff', y: '#ffd84a', o: '#ff9a3d', g: '#5cff8a', c: '#3fe0ff', b: '#4f7bff', p: '#ff4fc8', r: '#ff3f55', s: '#c9d2e6', x: '#5a6275', '*': '#ffcc33', e: '#ff4a1a' };
  var CAPCOL = { W: '#3fe0ff', M: '#ff4fc8', L: '#ff3f55', S: '#ffb020', C: '#5cff8a', F: '#ff7a1a', N: '#9fdcff', B: '#ff6a3d', '+': '#a0a8ff' };
  var CAPWORD = { W: 'WIDE', M: 'MULTI', L: 'LASER', S: 'SLOW', C: 'CATCH', F: 'FIRE', N: 'NET', B: 'BLAST', '+': '1UP' };
  var THEMES = [   // per level: sky top, sky bottom, accent (grid, walls), sun, mountains
    ['#12032e', '#3b0b5e', '#ff3fd2', '#ffb347', '#1a0630'], ['#03122e', '#0b3d7a', '#36d6ff', '#bff3ff', '#04152c'], ['#020b1f', '#0a2a4a', '#3fe0ff', '#e8f0ff', '#03101e'],
    ['#1a0012', '#4a0034', '#ff4fc8', '#ff9ad6', '#1c0016'], ['#1a0c00', '#4a2800', '#ffb020', '#ffe08a', '#1c0e00'], ['#2a0a3a', '#b8402a', '#ffd84a', '#ff8a3d', '#2a0a22'],
    ['#08080e', '#262838', '#cfd6ff', '#ffffff', '#0b0b12'], ['#24001a', '#5a0030', '#ff6b9a', '#ffc2d6', '#22001a'], ['#001a28', '#004a6a', '#7fe8ff', '#e0fbff', '#00141f'],
    ['#0a0018', '#2a0050', '#8f63ff', '#ff4060', '#0c0020'], ['#04140a', '#163a1c', '#5cff8a', '#d0ffd8', '#04120a'], ['#100026', '#2a0050', '#ffffff', '#ffd84a', '#0e0022'],
    ['#140010', '#3a0030', '#ff9a3d', '#ffd84a', '#160010'], ['#06162e', '#2a5a9a', '#ff3f55', '#fff0c0', '#081830'], ['#06121e', '#1a4a6a', '#e8f4ff', '#fff6d0', '#08141e'],
    ['#00140e', '#003a2a', '#5cff8a', '#c8ffd8', '#00100a'], ['#1a0600', '#4a1400', '#ff6a1a', '#ffc040', '#160500'], ['#020818', '#0a2048', '#ffd84a', '#ffffff', '#020614'],
    ['#00121e', '#00405a', '#3fe0ff', '#bff3ff', '#000e18'], ['#140008', '#3a0018', '#ff3060', '#ff8a3d', '#120006']
  ];
  function theme(W) { return THEMES[(W.level - 1) % THEMES.length]; }
  function mix(hex, to, k) {
    var a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
    var r = Math.round(((a >> 16) & 255) * (1 - k) + ((b >> 16) & 255) * k), g = Math.round(((a >> 8) & 255) * (1 - k) + ((b >> 8) & 255) * k), bl = Math.round((a & 255) * (1 - k) + (b & 255) * k);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------------------------------------------------------------- our own pixel art: drifters and the Mothership
  function mirror(half) { return half.map(function (r) { return r + r.split('').reverse().join(''); }); }
  var ART = {
    d00: ['..aaaaaa..', '.abbaabba.', 'aaeaaaaeaa', 'aaaaaaaaaa', '.a.aaaa.a.', 'a..a..a..a', '.a......a.', '..........'],
    d01: ['..aaaaaa..', '.abbaabba.', 'aaeaaaaeaa', 'aaaaaaaaaa', '.a.aaaa.a.', '.a.a..a.a.', 'a........a', '..........'],
    d10: ['...aaaa...', '..aaaaaa..', '.aeeaaeea.', 'aaaaaaaaaa', 'aaa.aa.aaa', '..a....a..', '.a.a..a.a.', '..........'],
    d11: ['...aaaa...', '..aaaaaa..', '.aeeaaeea.', 'aaaaaaaaaa', 'aaa.aa.aaa', '.a......a.', 'a.a....a.a', '..........'],
    d20: ['....aa....', '..aaaaaa..', '.aaeaaeaa.', 'aaaaaaaaaa', '..aa..aa..', '.aa.aa.aa.', 'a........a', '..........'],
    d21: ['....aa....', '..aaaaaa..', '.aaeaaeaa.', 'aaaaaaaaaa', '..aa..aa..', '..a.aa.a..', '.a......a.', '..........'],
    boss: mirror([
      '......................bb', '...................bbbaa', '................bbbaaaaa', '..............bbaaaaaaaa',
      '............baaaaaaaaaaa', '..........baaaaaccaaaaee', '........baaaaaaccaaaaeee', '......baaaaaaaaaaaaaeeee',
      '....bbaaaaaaaaaaaaaaaeee', '..bbaaalaaaalaaaalaaaaaa', 'bbaaaaaaaaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaaaaaaaaaa',
      'caaaaaaaaaaaaaaaaaaaaaaa', '.ccaaaaaaaaaaaaaaaaaaaaa', '...cccaaaaaaaaaaaaaaaaaa', '......cccaaacccaaacccaaa',
      '........c..c...c...c..cc', '.......c..c....c....c.c.', '......c...c.........c..c', '......................c.'
    ])
  };
  var DRIFT = [{ a: '#ff4fc8', b: '#ffc2f0', e: '#fff7b0' }, { a: '#36d6ff', b: '#c4f6ff', e: '#ff4a6e' }, { a: '#ffc23a', b: '#fff1b8', e: '#ff3b3b' }];
  var BOSSPAL = { a: '#7b4dff', b: '#d2c2ff', c: '#3a1f8f', e: '#ff3fd2', l: '#ffe14a' };
  var BOSSPAL2 = { a: '#d0304a', b: '#ffc0c8', c: '#6a0a1a', e: '#ffd84a', l: '#ffffff' };

  // ---------------------------------------------------------------- pictures painted at full sharpness (kept until the size changes)
  function rrect(x, w, h, r) { x.beginPath(); x.moveTo(r, 0); x.lineTo(w - r, 0); x.quadraticCurveTo(w, 0, w, r); x.lineTo(w, h - r); x.quadraticCurveTo(w, h, w - r, h); x.lineTo(r, h); x.quadraticCurveTo(0, h, 0, h - r); x.lineTo(0, r); x.quadraticCurveTo(0, 0, r, 0); x.closePath(); }
  function brickPic(t, k) {
    return F.cached('brick|' + t, function () {
      var w = 16 * k, h = 8 * k, c = F.canvas(w, h), x = c.getContext('2d'), base = BRICK[t], gap = Math.max(1, Math.round(k * 0.6)), bw = w - gap, bh = h - gap, rr = Math.max(1, k * 1.1);
      var g = x.createLinearGradient(0, 0, 0, bh);
      if (t === 's') { g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#d4dcee'); g.addColorStop(0.55, '#8792a8'); g.addColorStop(1, '#e2e8f4'); }
      else if (t === 'x') { g.addColorStop(0, '#80889c'); g.addColorStop(0.5, '#4b5263'); g.addColorStop(1, '#2a2f3b'); }
      else if (t === '*') { g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, '#ffcc33'); g.addColorStop(1, '#a86e00'); }
      else if (t === 'e') { g.addColorStop(0, '#5a1408'); g.addColorStop(1, '#260402'); }
      else { g.addColorStop(0, mix(base, '#ffffff', 0.55)); g.addColorStop(0.42, base); g.addColorStop(1, mix(base, '#000000', 0.5)); }
      rrect(x, bw, bh, rr); x.fillStyle = g; x.fill();
      x.save(); rrect(x, bw, bh, rr); x.clip();
      if (t === 'e') {   // hazard stripes and a hot core
        x.fillStyle = '#ffcc33';
        for (var s = -bh; s < bw; s += k * 3) { x.beginPath(); x.moveTo(s, bh); x.lineTo(s + k * 1.4, bh); x.lineTo(s + k * 1.4 + bh, 0); x.lineTo(s + bh, 0); x.closePath(); x.globalAlpha = 0.55; x.fill(); }
        x.globalAlpha = 1; var cg = x.createRadialGradient(bw / 2, bh / 2, 0, bw / 2, bh / 2, bh * 0.55); cg.addColorStop(0, '#fff2b0'); cg.addColorStop(0.4, '#ff8a1a'); cg.addColorStop(1, 'rgba(255,60,0,0)');
        x.fillStyle = cg; x.fillRect(0, 0, bw, bh);
      }
      // bevel: light top-left edge, dark bottom-right edge, and a soft specular sheen
      x.globalAlpha = 0.6; x.fillStyle = '#ffffff'; x.fillRect(0, 0, bw, Math.max(1, k * 0.45)); x.fillRect(0, 0, Math.max(1, k * 0.35), bh);
      x.globalAlpha = 0.45; x.fillStyle = '#000000'; x.fillRect(0, bh - Math.max(1, k * 0.5), bw, Math.max(1, k * 0.5)); x.fillRect(bw - Math.max(1, k * 0.4), 0, Math.max(1, k * 0.4), bh);
      var sh = x.createRadialGradient(bw * 0.28, bh * 0.2, 0, bw * 0.28, bh * 0.2, bw * 0.5); sh.addColorStop(0, 'rgba(255,255,255,0.55)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
      x.globalAlpha = t === 'x' ? 0.3 : 1; x.fillStyle = sh; x.fillRect(0, 0, bw, bh * 0.6);
      x.restore();
      x.globalAlpha = 1;
      if (t === 'x') { x.fillStyle = '#b4bccc'; [[2.5, 3.6], [12.3, 3.6]].forEach(function (p) { x.beginPath(); x.arc(p[0] * k, p[1] * k, k * 0.7, 0, 6.3); x.fill(); }); }
      if (t === '*') { x.fillStyle = '#ffffff'; x.fillRect(7 * k, 1.5 * k, k, 4 * k); x.fillRect(5.5 * k, 3 * k, 4 * k, k); }
      return c;
    });
  }
  function shadowPic(k) {   // a soft shadow the size of a brick
    return F.cached('bshadow', function () {
      var pad = Math.ceil(k * 1.5), c = F.canvas(16 * k + pad * 2, 8 * k + pad * 2), x = c.getContext('2d');
      if ('filter' in x) x.filter = 'blur(' + (k * 0.9) + 'px)';
      x.fillStyle = 'rgba(0,0,0,0.55)'; rrect(x, 15 * k, 7 * k, k); x.save(); x.translate(pad, pad); rrect(x, 15 * k, 7 * k, k); x.fill(); x.restore();
      c.pad = pad; return c;
    });
  }
  function crackPic(n, k) {
    return F.cached('crack|' + n, function () {
      var c = F.canvas(16 * k, 8 * k), x = c.getContext('2d');
      x.strokeStyle = 'rgba(30,36,50,0.8)'; x.lineWidth = Math.max(1, k * 0.45);
      var lines = [[[3, 1], [5, 4], [4, 7]], [[11, 1], [10, 3], [12, 6]], [[7, 0], [8, 3], [7, 7]], [[1, 4], [4, 5], [7, 4]]];
      for (var i = 0; i < n && i < lines.length; i++) { x.beginPath(); lines[i].forEach(function (p, j) { if (j) x.lineTo(p[0] * k, p[1] * k); else x.moveTo(p[0] * k, p[1] * k); }); x.stroke(); }
      return c;
    });
  }
  function ballPic(k) {   // white, tinted at draw time by the light round it
    return F.cached('ball', function () {
      var s = Math.round(BALL * k * 1.15), c = F.canvas(s, s), x = c.getContext('2d'), g = x.createRadialGradient(s * 0.36, s * 0.3, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#eaf6ff'); g.addColorStop(1, '#9ab8d8');
      x.fillStyle = g; x.beginPath(); x.arc(s / 2, s / 2, s / 2, 0, 6.3); x.fill();
      return c;
    });
  }

  // ---------------------------------------------------------------- the scene: sky, sun, mountains, floor (kept), grid (moving)
  var BG = null, BGkey = '', VIG = null;
  function ridge(seed, n, base, amp) {
    var a = seed, pts = []; function rnd() { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }
    var v = 0; for (var i = 0; i <= n; i++) { v = v * 0.55 + (rnd() - 0.5) * amp; pts.push(base - Math.abs(v) - rnd() * amp * 0.3); }
    return pts;
  }
  function sky(W) {
    var th = theme(W), key = W.level + '|' + F.dw + 'x' + F.dh;
    if (BG && BGkey === key) return BG;
    BGkey = key; BG = F.canvas(F.dw, F.dh);
    var x = BG.getContext('2d'), S = F.scale, hz = HZ * S, g = x.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, th[0]); g.addColorStop(1, th[1]); x.fillStyle = g; x.fillRect(0, 0, F.dw, hz);
    var a = 97 + W.level; function rnd() { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }
    [[0.25, 0.3, 0.5, th[2]], [0.8, 0.18, 0.4, th[3]]].forEach(function (n) {   // a faint nebula
      var cx = n[0] * F.dw, cy = n[1] * hz, r = n[2] * F.dw, ng = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      ng.addColorStop(0, n[3]); ng.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = 0.12; x.fillStyle = ng; x.fillRect(0, 0, F.dw, hz);
    });
    x.globalAlpha = 1;
    for (var i = 0; i < 110; i++) { x.globalAlpha = 0.15 + rnd() * 0.6; x.fillStyle = '#ffffff'; var sz = rnd() < 0.12 ? 2 : 1; x.fillRect(rnd() * F.dw, rnd() * hz * 0.8, sz, sz); }
    x.globalAlpha = 1;
    // the striped sun (on its own canvas, so the stripes cut only the sun)
    var cx2 = GW / 2 * S, sr = Math.round(50 * S), sun = F.canvas(sr * 2, sr), su = sun.getContext('2d'), sg = su.createLinearGradient(0, 0, 0, sr);
    sg.addColorStop(0, th[3]); sg.addColorStop(1, th[2]);
    su.fillStyle = sg; su.beginPath(); su.arc(sr, sr, sr, Math.PI, 0); su.fill();
    su.globalCompositeOperation = 'destination-out';
    for (var s = 0; s < 7; s++) { var yy = sr - sr * 0.07 - s * sr * 0.12, hh = Math.max(1, sr * 0.022 * (7 - s) / 3); su.fillRect(0, yy, sr * 2, hh); }
    x.globalAlpha = 0.62; x.drawImage(sun, cx2 - sr, hz - sr); x.globalAlpha = 1;
    // two ranges of mountains in front of the sun, the nearer one rim-lit
    [[0.65, 26, 0.55, mix(th[4], th[1], 0.35)], [1, 18, 1, th[4]]].forEach(function (m, li) {
      var pts = ridge(500 + W.level * 7 + li * 31, 28, HZ - 2, m[1]);
      x.beginPath(); x.moveTo(0, F.dh);
      pts.forEach(function (py, j) { x.lineTo(j / 28 * F.dw, py * S); });
      x.lineTo(F.dw, F.dh); x.closePath(); x.globalAlpha = m[2]; x.fillStyle = m[3]; x.fill();
      if (li === 1) { x.globalAlpha = 0.5; x.strokeStyle = th[2]; x.lineWidth = Math.max(1, S * 0.4); x.beginPath(); pts.forEach(function (py, j) { if (j) x.lineTo(j / 28 * F.dw, py * S); else x.moveTo(0, py * S); }); x.stroke(); }
    });
    x.globalAlpha = 1;
    var hg = x.createLinearGradient(0, hz - 26 * S, 0, hz + 4 * S); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(1, th[2]);
    x.globalAlpha = 0.22; x.fillStyle = hg; x.fillRect(0, hz - 26 * S, F.dw, 30 * S); x.globalAlpha = 1;
    var fg = x.createLinearGradient(0, hz, 0, F.dh); fg.addColorStop(0, '#05010c'); fg.addColorStop(1, mix(th[0], '#000000', 0.2));
    x.fillStyle = fg; x.fillRect(0, hz, F.dw, F.dh - hz);
    VIG = F.canvas(F.dw, F.dh);
    var v = VIG.getContext('2d'), vg = v.createRadialGradient(F.dw / 2, F.dh / 2, Math.min(F.dw, F.dh) * 0.38, F.dw / 2, F.dh / 2, Math.max(F.dw, F.dh) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)'); v.fillStyle = vg; v.fillRect(0, 0, F.dw, F.dh);
    return BG;
  }
  var RIPPLES = [];
  function grid(W, t) {
    var g = F.g, S = F.scale, th = theme(W), cx = GW / 2, ox = F.ox, oy = F.oy;
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = th[2]; g.lineWidth = Math.max(1, S * 0.35);
    for (var i = -9; i <= 9; i++) { g.globalAlpha = 0.24; g.beginPath(); g.moveTo((cx + i * 4) * S + ox, HZ * S + oy); g.lineTo((cx + i * 34) * S + ox, GH * S + oy); g.stroke(); }
    var ph = reducedMotion ? 0 : (t / 900) % 1;
    for (var j = 0; j < 10; j++) {
      var k = (j + ph) / 10, y = HZ + (GH - HZ) * k * k, boost = 0;
      RIPPLES.forEach(function (r) { var front = 0.95 - r.t / 45; boost += Math.exp(-Math.pow((k - front) / 0.07, 2)) * (1 - r.t / 45); });
      g.globalAlpha = Math.min(1, 0.07 + 0.28 * k + boost * 0.8); g.lineWidth = Math.max(1, S * (0.35 + boost * 0.5));
      g.beginPath(); g.moveTo(ox, y * S + oy); g.lineTo(GW * S + ox, y * S + oy); g.stroke();
    }
    // a ring spreading over the floor from where the ball met the bat
    RIPPLES.forEach(function (r) {
      var kk = r.t / 45; g.globalAlpha = (1 - kk) * 0.6; g.lineWidth = Math.max(1, S * 0.6);
      g.beginPath(); g.ellipse(r.x * S + ox, (BAT_Y + 7) * S + oy, (6 + kk * 80) * S, (2 + kk * 16) * S, 0, 0, Math.PI * 2); g.stroke();
    });
    g.restore();
  }
  var DUST = (function () { var out = [], a = 77; function r() { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; } for (var i = 0; i < 26; i++) out.push({ x: r() * GW, y: r() * GH, v: 0.004 + r() * 0.008, p: r() * 6.3, s: r() }); return out; })();
  function dust(W, t) {
    if (F.low || reducedMotion) return;
    var th = theme(W);
    DUST.forEach(function (d) { var y = (d.y - t * d.v) % GH; if (y < 0) y += GH; F.rect(d.x + Math.sin(t / 2000 + d.p) * 4, y, 1, 1, d.s > 0.6 ? th[2] : '#ffffff', 0.12 + 0.12 * Math.sin(t / 700 + d.p), true); });
  }
  var WALLHITS = [];
  function walls(W, t) {
    var th = theme(W);
    F.rect(0, T - 8, GW, 8, '#151824', 1); F.rect(0, T - 8, L, GH, '#151824', 1); F.rect(R, T - 8, GW - R, GH, '#151824', 1);
    F.rect(0, T - 7, GW, 1, '#2f3548', 1); F.rect(2, T - 8, 1, GH, '#2f3548', 1); F.rect(GW - 3, T - 8, 1, GH, '#2f3548', 1);
    var pulse = 0.55 + 0.15 * Math.sin(t / 500);
    // the neon tubes: a soft wide glow and a bright core
    F.rect(L - 2, T - 2, 2, GH, th[2], 0.18 * pulse, true); F.rect(R, T - 2, 2, GH, th[2], 0.18 * pulse, true); F.rect(L - 2, T - 2, R - L + 4, 2, th[2], 0.18 * pulse, true);
    F.rect(L - 1, T - 1, 1, GH, th[2], 0.85 * pulse, true); F.rect(R, T - 1, 1, GH, th[2], 0.85 * pulse, true); F.rect(L - 1, T - 1, R - L + 2, 1, th[2], 0.85 * pulse, true);
    WALLHITS.forEach(function (h) { F.light(h.x, h.y, 10, th[2], (1 - h.t / 18) * 0.9); });
    E.GATES.forEach(function (gx, i) {
      var open = gateOpen[i] > 0 ? Math.min(1, gateOpen[i] / 10, (60 - gateOpen[i]) / 10 + 0.0001) : 0;
      F.rect(gx - 8, T - 7, 16, 6, '#07080d', 1);
      F.rect(gx - 8, T - 7, 8 * (1 - open), 6, '#454d62', 1); F.rect(gx + 8 * open, T - 7, 8 * (1 - open), 6, '#454d62', 1);
      F.rect(gx - 1, T - 7, 2, 6, th[2], 0.3 + 0.7 * open, true);
      if (open) F.light(gx, T, 12, th[2], open * 0.8);
    });
  }

  // ---------------------------------------------------------------- impacts: shards, pops and the rest (from world.fx)
  var gateOpen = [0, 0], trails = new WeakMap(), lastW = null, shineT = 0, SH = [], POPS = [], recoil = 0, dispW = 0, dispScore = 0, comboFlash = 0;
  function shards(x, y, col, n, power) {
    if (F.low) n = Math.ceil(n / 2);
    for (var i = 0; i < n && SH.length < 260; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = (0.6 + Math.random() * 1.4) * (power || 1);
      SH.push({ x: x + (Math.random() - 0.5) * 12, y: y + (Math.random() - 0.5) * 5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: Math.random() * 6.3, va: (Math.random() - 0.5) * 0.4,
        w: 2 + Math.random() * 3, h: 1.2 + Math.random() * 2, col: Math.random() < 0.3 ? mix(col, '#ffffff', 0.5) : col, life: 40 + Math.random() * 25, max: 65 });
    }
  }
  function onFx(W, f) {
    var th = theme(W), col;
    switch (f.k) {
      case 'level': trails = new WeakMap(); SH = []; POPS = []; F.banner(f.boss ? 'WARNING' : 'LEVEL ' + f.n, f.boss ? (f.name === 'MOTHERSHIP II' ? 'THE MOTHERSHIP RETURNS' : 'THE MOTHERSHIP') : f.name, f.boss ? '#ff4060' : th[2], 140, !!f.boss); break;
      case 'brick':
        col = BRICK[f.t];
        shards(f.x, f.y, col, f.t === 's' ? 9 : 7, f.by === 'blast' ? 1.6 : 1);
        F.emit(f.x, f.y, 6, ['#ffffff', mix(col, '#ffffff', 0.6)], 1.8, 14, { size: 0.7 });
        POPS.push({ x: f.x - 8, y: f.y - 4, t: 0, col: col });
        F.flash(f.x, f.y, 12, col, 12);
        break;
      case 'dent': F.emit(f.x, f.y, 7, ['#ffffff', '#c9d2e6'], 1.5, 14); F.ring(f.x, f.y, 8, '#ffffff', 10); break;
      case 'steel': F.emit(f.x, f.y, 6, ['#ffd0a0', '#ffffff'], 1.4, 12); F.flash(f.x, f.y, 6, '#ffd0a0', 6); break;
      case 'explode':
        F.emit(f.x, f.y, 34, ['#ffd84a', '#ff8a1a', '#ff3f1a', '#ffffff'], 2.4, 40, { spread: 10 });
        F.emit(f.x, f.y, 10, ['#3a3040', '#5a4a58', '#2a2430'], 0.6, 70, { spread: 10, grav: -0.015, add: false, size: 2.5, drag: 0.97 });
        F.ring(f.x, f.y, 30, '#ffb050', 26, 2); F.flash(f.x, f.y, 30, '#ff8a1a', 22);
        F.shake(3.5); F.screen('#ff7a1a', 0.1, 14); break;
      case 'combo': comboFlash = 30; F.floater('x' + f.n, R - 14, BAT_Y - 16, ['#ffffff', '#ffffff', '#ffe14a', '#ff9a3d', '#ff4fc8', '#7fe8ff'][f.n], 2, 60, 'combo'); break;
      case 'praise': F.floater(f.text, GW / 2, 158, '#ffffff', 3, 80, 'praise'); F.ring(GW / 2, 168, 40, th[2], 30, 1.5); break;
      case 'bat': F.flash(f.x, f.y, 7, th[2], 9); F.emit(f.x, f.y, 4, [th[2], '#ffffff'], 1, 12, { angle: -Math.PI / 2, cone: 1.6 }); recoil = 1; RIPPLES.push({ x: f.x, t: 0 }); break;
      case 'wall': WALLHITS.push({ x: f.side === 'l' ? L - 1 : f.side === 'r' ? R : f.x, y: f.side === 't' ? T - 1 : f.y, t: 0 }); F.emit(f.x, f.y, 3, ['#ffffff', th[2]], 0.9, 10); break;
      case 'launch': F.ring(f.x, f.y, 10, '#ffffff', 14); break;
      case 'capdrop': F.ring(f.x, f.y, 10, CAPCOL[f.kind], 18); break;
      case 'collect': F.ring(f.x, f.y, 20, CAPCOL[f.kind], 24, 1.5); F.emit(f.x, f.y, 24, [CAPCOL[f.kind], '#ffffff'], 1.7, 30); F.floater(CAPWORD[f.kind], f.x, f.y - 16, CAPCOL[f.kind], 1, 70); break;
      case 'laser': [f.x - f.w / 2 + 3, f.x + f.w / 2 - 4].forEach(function (lx) { F.flash(lx + 0.5, BAT_Y - 4, 6, '#ff6070', 8); }); break;
      case 'zap': F.emit(f.x, f.y, 3, ['#ff8090'], 0.8, 10); break;
      case 'gate': gateOpen[f.g] = 60; break;
      case 'enemy': col = DRIFT[f.kind].a; F.emit(f.x, f.y, 20, [col, DRIFT[f.kind].b, '#ffffff'], 1.7, 30, { spread: 6 }); F.ring(f.x, f.y, 14, col, 18); F.flash(f.x, f.y, 12, col, 12); F.floater('100', f.x, f.y - 6, '#ffffff', 1, 40); break;
      case 'bosshit': F.emit(f.x, f.y, 9, [BOSSPAL.b, '#ffffff', BOSSPAL.e], 1.5, 18); F.flash(f.x, f.y, 8, '#c08cff', 9); F.shake(1); F.screen('#a060ff', 0.05, 8); break;
      case 'bossfire': F.flash(f.x, f.y, 8, '#ff3fd2', 10); break;
      case 'rage': F.ring(f.x, f.y, 50, '#ff4060', 36, 2); F.screen('#ff2040', 0.16, 30); F.shake(3); F.floater('ANGRY!', f.x, f.y + 18, '#ff4060', 2, 80); break;
      case 'bossdie':
        F.emit(f.x, f.y, 110, [BOSSPAL.a, BOSSPAL.b, BOSSPAL.e, '#ffd84a', '#ffffff'], 3, 90, { spread: 30 });
        shards(f.x, f.y, '#8f63ff', 30, 2.2);
        F.ring(f.x, f.y, 70, '#ffffff', 44, 2.5); F.ring(f.x, f.y, 45, '#ff3fd2', 34, 2); F.flash(f.x, f.y, 70, '#ffb0f0', 44);
        F.shake(10); F.screen('#ffffff', 0.5, 44); F.floater('+' + f.pts, f.x, f.y + 16, '#ffe14a', 2, 130); break;
      case 'lost':
        F.emit(f.x, f.y, 46, ['#c8d0e0', '#ffffff', th[2], '#ff9a3d'], 2.2, 55, { spread: f.w, spreadY: 3 });
        shards(f.x, f.y, '#c8d0e0', 16, 1.6);
        F.flash(f.x, f.y, 28, '#ff7040', 24); F.shake(6); F.screen('#ff3b3b', 0.22, 24); break;
      case 'balllost': F.emit(f.x, GH - 2, 6, ['#ffffff', th[2]], 1, 16, { angle: -Math.PI / 2, cone: 1.4 }); break;
      case 'netsave': F.ring(f.x, NET_Y, 26, '#9fdcff', 26, 2); F.emit(f.x, NET_Y, 26, ['#9fdcff', '#ffffff'], 1.8, 30); F.floater('SAVED!', f.x, NET_Y - 14, '#9fdcff', 1, 60); break;
      case 'lastbrick': F.ring(f.x, f.y, 60, '#ffffff', 40, 2); F.flash(f.x, f.y, 40, '#ffffff', 30); F.shake(4); break;
      case 'clear':
        F.banner('LEVEL CLEAR', f.perfect ? '+' + f.pts + '  NO LIVES LOST' : '+' + f.pts, '#5cff8a', 140);
        for (var i = 0; i < 7; i++) F.emit(16 + i * 32, T + 4, 12, ['#ff4fc8', '#ffd84a', '#3fe0ff', '#5cff8a', '#ffffff'], 1.3, 120, { angle: Math.PI / 2, cone: 1.3, grav: 0.03, add: false, size: 1.4 });
        break;
      case 'extra': F.floater('1UP', 40, BAT_Y - 14, '#5cff8a', 2, 90); break;
      case 'catch': F.ring(f.x, f.y, 9, '#5cff8a', 14); break;
    }
  }
  function stepExtras(W) {   // once per game step
    if (gateOpen[0]) gateOpen[0]--; if (gateOpen[1]) gateOpen[1]--;
    shineT++;
    recoil *= 0.82; if (recoil < 0.02) recoil = 0;
    if (comboFlash) comboFlash--;
    var i;
    for (i = SH.length - 1; i >= 0; i--) { var s = SH[i]; s.vx *= 0.985; s.vy = s.vy * 0.985 + 0.085; s.x += s.vx; s.y += s.vy; s.a += s.va; if (--s.life <= 0 || s.y > GH + 4) SH.splice(i, 1); }
    for (i = POPS.length - 1; i >= 0; i--) if (++POPS[i].t > 10) POPS.splice(i, 1);
    for (i = RIPPLES.length - 1; i >= 0; i--) if (++RIPPLES[i].t > 45) RIPPLES.splice(i, 1);
    for (i = WALLHITS.length - 1; i >= 0; i--) if (++WALLHITS[i].t > 18) WALLHITS.splice(i, 1);
    W.balls.forEach(function (b) {
      var tr = trails.get(b); if (!tr) { tr = []; trails.set(b, tr); }
      tr.unshift({ x: b.x + BALL / 2, y: b.y + BALL / 2 }); if (tr.length > 14) tr.pop();
      if (b.stuck || F.low) return;
      if (W.fireT > 0) F.emit(b.x + 2, b.y + 2, 1, ['#ff7a1a', '#ffd84a', '#ff3f1a'], 0.5, 22, { vy: -0.2 });
      if (W.blast > 0 && W.frame % 2 === 0) F.emit(b.x + 2, b.y + 2, 1, ['#ff6a3d', '#ffd84a'], 0.7, 14);
    });
    if (!F.low && W.phase !== 'lost') {
      var B = W.bat, mv = Math.abs(B.vx || 0);
      if (mv > 0.5 && W.frame % 2 === 0) F.emit(B.x - Math.sign(B.vx) * dispW / 2, BAT_Y + 4, 1, ['#7fe8ff', '#ffffff'], 0.4, 14, { vx: -B.vx * 0.15, vy: 0.5 });
      if (W.batPower && W.frame % 6 === 0) F.emit(B.x + (Math.random() - 0.5) * B.w, BAT_Y + 3, 1, [CAPCOL[W.batPower]], 0.4, 18, { vy: 0.3 });
    }
  }

  // ---------------------------------------------------------------- the bricks: shadows and bricks (kept as one picture while still)
  var LAYER = null, LAYERkey = '';
  function easeOutBack(k) { var c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
  function brickDrop(W, br) {   // the bricks drop into place at the start of a level
    if (W.introT <= 0 || W.demo) return { y: 0, a: 1 };
    var el = 110 - W.introT, d = br.r * 5 + Math.abs(br.c - 6) * 1.6, k = clamp((el - d) / 24, 0, 1);
    return { y: -(1 - easeOutBack(k)) * 80, a: k > 0 ? 1 : 0 };
  }
  function paintBricks(g, W, k, S, ox, oy, direct) {
    var sp = shadowPic(k);
    W.bricks.forEach(function (br) {
      if (!br.alive) return;
      var d = direct ? brickDrop(W, br) : { y: 0, a: 1 };
      if (!d.a) return;
      g.globalAlpha = 0.9; g.drawImage(sp, Math.round((br.x + 2) * S + ox) - sp.pad, Math.round((br.y + 3 + d.y) * S + oy) - sp.pad);
    });
    W.bricks.forEach(function (br) {
      if (!br.alive) return;
      var d = direct ? brickDrop(W, br) : { y: 0, a: 1 };
      if (!d.a) return;
      g.globalAlpha = 1; g.drawImage(brickPic(br.t, k), Math.round(br.x * S + ox), Math.round((br.y + d.y) * S + oy));
      if (br.t === 's' && br.hp < br.max) g.drawImage(crackPic(br.max - br.hp, k), Math.round(br.x * S + ox), Math.round((br.y + d.y) * S + oy));
    });
  }
  function bricks(W, t) {
    var g = F.g, k = F.k, S = F.scale;
    g.imageSmoothingEnabled = true;
    var direct = W.moveAmp > 0 || (W.introT > 0 && !W.demo);
    if (direct) {   // (kept inside the play area while they drop in)
      g.save(); g.beginPath(); g.rect(L * S + F.ox, T * S + F.oy, (R - L) * S, (GH - T) * S); g.clip();
      paintBricks(g, W, k, S, F.ox, F.oy, true);
      g.restore();
    }
    else {
      var key = W.brickVer + '|' + W.level + '|' + k + '|' + F.dw + 'x' + F.dh + '|' + (W.demo ? 'd' : '');
      if (!LAYER || LAYER.width !== F.dw || LAYER.height !== F.dh) { LAYER = F.canvas(F.dw, F.dh); LAYERkey = ''; }
      if (key !== LAYERkey) { var lx = LAYER.getContext('2d'); lx.clearRect(0, 0, F.dw, F.dh); lx.imageSmoothingEnabled = true; paintBricks(lx, W, k, S, 0, 0, false); LAYERkey = key; }
      g.globalAlpha = 1; g.drawImage(LAYER, F.ox, F.oy);
    }
    // what changes every moment: the shine passing over, hit flashes, the glow of gold and explosive bricks
    var shineX = ((shineT % 480) / 480) * 420 - 110;
    W.bricks.forEach(function (br) {
      if (!br.alive) return;
      var dy = direct ? brickDrop(W, br).y : 0;
      if (br.t === 'e') F.light(br.x + 8, br.y + 4 + dy, 10, '#ff6a1a', 0.35 + 0.25 * Math.sin(t / 160 + br.c));
      if (br.t === '*') F.light(br.x + 8, br.y + 4 + dy, 10, '#ffcc33', 0.3 + 0.18 * Math.sin(t / 220));
      var dd = Math.abs(br.x + br.y * 0.6 - shineX);
      if (dd < 14 && !F.low && !dy) F.rect(br.x, br.y, 15, 7, '#ffffff', (1 - dd / 14) * 0.26, true);
      if (br.hit) F.rect(br.x, br.y + dy, 15, 7, '#ffffff', br.hit / 8 * 0.65, true);
    });
  }

  // ---------------------------------------------------------------- the bat: a hover paddle with thrusters
  function drawBat(W, t) {
    var B = W.bat, g = F.g, S = F.scale, th = theme(W);
    if (!dispW) dispW = B.w;
    dispW += (B.w - dispW) * 0.25;
    var w = dispW * (1 + 0.07 * recoil), h = BAT_H * (1 - 0.25 * recoil), x0 = B.x - w / 2, y0 = BAT_Y + 1.2 * recoil + (BAT_H - h) / 2;
    var px = x0 * S + F.ox, py = y0 * S + F.oy, pw = w * S, ph = h * S, r = ph / 2;
    var pcol = W.batPower ? CAPCOL[W.batPower] : th[2];
    // shadow on the floor, thrusters under it
    g.save();
    g.globalAlpha = 0.45; g.fillStyle = '#000000'; g.beginPath(); g.ellipse(B.x * S + F.ox + 2 * S, (BAT_Y + 11) * S + F.oy, w / 2 * S, 1.6 * S, 0, 0, 6.3); g.fill();
    [-0.32, 0.32].forEach(function (fr) {
      var jx = B.x + fr * w, len = 2.5 + Math.abs(B.vx || 0) * 0.35 + Math.random() * 1.6;
      F.rect(jx - 1, BAT_Y + BAT_H, 2, len, '#7fe8ff', 0.5, true); F.rect(jx - 0.5, BAT_Y + BAT_H, 1, len * 0.7, '#ffffff', 0.8, true);
      F.light(jx, BAT_Y + BAT_H + len * 0.6, 4, '#3fb8ff', 0.4);
    });
    F.light(B.x, BAT_Y + 3, w * 0.55, pcol, 0.22);
    // the body
    function cap() { g.beginPath(); g.moveTo(px + r, py); g.lineTo(px + pw - r, py); g.arc(px + pw - r, py + r, r, -Math.PI / 2, Math.PI / 2); g.lineTo(px + r, py + ph); g.arc(px + r, py + r, r, Math.PI / 2, Math.PI * 1.5); g.closePath(); }
    var bg = g.createLinearGradient(0, py, 0, py + ph); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.28, '#cfd6e4'); bg.addColorStop(0.62, '#5d6578'); bg.addColorStop(1, '#262a36');
    g.globalAlpha = 1; cap(); g.fillStyle = bg; g.fill();
    g.save(); cap(); g.clip();
    var endW = Math.max(ph * 1.1, 4 * S), eg = g.createLinearGradient(0, py, 0, py + ph);
    eg.addColorStop(0, mix(pcol, '#ffffff', 0.55)); eg.addColorStop(0.5, pcol); eg.addColorStop(1, mix(pcol, '#000000', 0.5));
    g.fillStyle = eg; g.fillRect(px, py, endW, ph); g.fillRect(px + pw - endW, py, endW, ph);
    // the energy strip with a light running along it
    var sy = py + ph * 0.42, shh = Math.max(1, ph * 0.22), run = ((t / 700) % 1), sg = g.createLinearGradient(px + endW, 0, px + pw - endW, 0);
    sg.addColorStop(0, pcol); sg.addColorStop(Math.max(0, run - 0.12), pcol); sg.addColorStop(run, '#ffffff'); sg.addColorStop(Math.min(1, run + 0.12), pcol); sg.addColorStop(1, pcol);
    g.globalAlpha = 0.9; g.fillStyle = sg; g.fillRect(px + endW, sy, pw - endW * 2, shh);
    g.globalAlpha = 0.75; g.fillStyle = '#ffffff'; g.fillRect(px + endW, py + Math.max(1, ph * 0.12), pw - endW * 2, Math.max(1, S * 0.4));
    g.restore();
    if (W.batPower === 'L') { F.rect(x0 + 2, y0 - 2.5, 2, 3, '#20232c', 1); F.rect(x0 + w - 4, y0 - 2.5, 2, 3, '#20232c', 1); F.rect(x0 + 2.5, y0 - 3, 1, 1, '#ff3f55', 1); F.rect(x0 + w - 3.5, y0 - 3, 1, 1, '#ff3f55', 1); }
    if (W.batPower === 'C') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.strokeStyle = '#5cff8a'; g.lineWidth = Math.max(1, S * 0.4); g.beginPath(); for (var i = 0; i <= 20; i++) { var xx = x0 + w * i / 20, yy = y0 - 2.5 + Math.sin(t / 90 + i) * 0.8; if (i) g.lineTo(xx * S + F.ox, yy * S + F.oy); else g.moveTo(xx * S + F.ox, yy * S + F.oy); } g.stroke(); g.globalCompositeOperation = 'source-over'; }
    g.restore();
  }

  // ---------------------------------------------------------------- the ball: stretched with speed, a comet tail, its own light
  function ballColour(W, b) {
    if (W.fireT > 0) return '#ff7a1a';
    var k = clamp((b.s - W.sp.ball) / (W.sp.max - W.sp.ball), 0, 1);
    return k < 0.5 ? mix('#7fd8ff', '#ffffff', k * 2) : mix('#ffffff', '#ffb050', (k - 0.5) * 2);
  }
  function drawBalls(W, t) {
    var g = F.g, S = F.scale, k = F.k, pic = ballPic(k);
    W.balls.forEach(function (b, bi) {
      var col = ballColour(W, b), cx = b.x + BALL / 2, cy = b.y + BALL / 2, tr = trails.get(b) || [];
      // light on everything round it (the first three balls)
      if (bi < 3) F.light(cx, cy, 30, col, 0.2);
      // shadow
      g.globalAlpha = 0.35; g.fillStyle = '#000000'; g.beginPath(); g.ellipse((cx + 2) * S + F.ox, (cy + 3) * S + F.oy, BALL * 0.55 * S, BALL * 0.45 * S, 0, 0, 6.3); g.fill();
      // the comet tail
      if (tr.length > 2 && !b.stuck) {
        g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.strokeStyle = col;
        for (var j = 1; j < tr.length; j++) {
          var f = 1 - j / tr.length;
          g.globalAlpha = f * 0.5; g.lineWidth = Math.max(1, BALL * S * f * 0.9);
          g.beginPath(); g.moveTo(tr[j - 1].x * S + F.ox, tr[j - 1].y * S + F.oy); g.lineTo(tr[j].x * S + F.ox, tr[j].y * S + F.oy); g.stroke();
        }
        g.restore();
      }
      F.light(cx, cy, W.fireT > 0 ? 10 : 7, col, 0.6);
      // stretched along its path, squashed for a moment after a bounce
      var sp = Math.hypot(b.vx, b.vy), ang = Math.atan2(b.vy, b.vx), st = b.stuck ? 1 : 1 + Math.min(0.45, sp * 0.1), sq = b.hitT != null && W.frame - b.hitT < 5 ? 0.78 : 1;
      var ax = st * sq, ay = (1 / st) * (sq < 1 ? 1.15 : 1), c = Math.cos(ang), s = Math.sin(ang);
      g.save(); g.imageSmoothingEnabled = true; g.globalAlpha = 1;
      g.setTransform(c * ax, s * ax, -s * ay, c * ay, cx * S + F.ox, cy * S + F.oy);
      g.drawImage(pic, -pic.width / 2, -pic.height / 2);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = W.fireT > 0 ? 0.6 : 0.25; g.fillStyle = col; g.beginPath(); g.arc(0, 0, pic.width / 2, 0, 6.3); g.fill();
      g.restore();
    });
  }

  // ---------------------------------------------------------------- the picture
  function draw(g, W, t, mode, info) {
    F.begin(g, info, mode);
    if (W !== lastW) { lastW = W; F.reset(); trails = new WeakMap(); gateOpen = [0, 0]; SH = []; POPS = []; RIPPLES = []; WALLHITS = []; recoil = 0; dispW = W.bat.w; dispScore = W.score; }
    var q = W.fx; if (!W.demo) for (var i = 0; i < q.length; i++) onFx(W, q[i]); q.length = 0;
    var n = F.steps(W.frame); for (i = 0; i < n; i++) stepExtras(W);
    var k = F.k, S = F.scale, th = theme(W);
    g.imageSmoothingEnabled = false; g.globalAlpha = 1;
    g.drawImage(sky(W), F.ox, F.oy);
    F.light(GW / 2, HZ - 22, 60, th[3], 0.12 + 0.04 * Math.sin(t / 900));   // the sun breathing
    grid(W, t);
    dust(W, t);
    walls(W, t);
    bricks(W, t);
    // pops of light where bricks broke
    POPS.forEach(function (p) { var kk = p.t / 10, sc = 1 + kk * 0.5; F.rect(p.x + 8 - 8 * sc, p.y + 4 - 4 * sc, 16 * sc, 8 * sc, '#ffffff', (1 - kk) * 0.55, true); });
    // the Mothership
    var M = W.boss;
    if (M) {
      var pal = M.fierce ? BOSSPAL2 : BOSSPAL, id = M.fierce ? 'boss2' : 'boss', mx = M.x, my = M.y, ma = 1;
      if (M.dead) { mx += (Math.random() - 0.5) * 2.5; my += (Math.random() - 0.5) * 2.5; ma = M.dead < 40 ? M.dead / 40 : 1; if (M.dead % 8 === 0) { F.emit(M.x + Math.random() * 48, M.y + Math.random() * 20, 18, [pal.a, pal.e, '#ffd84a'], 1.6, 32); shards(M.x + Math.random() * 48, M.y + 10, pal.a, 4, 1.5); F.shake(2); } }
      var bs = F.sprite(id, ART.boss, pal);
      F.blit(F.silhouette(id, bs, '#000000'), mx + 3, my + 4, 0.35 * ma);
      F.glow(F.halo('h|' + id + (M.hp < M.max / 2 ? 'r' : ''), bs, M.hp < M.max / 2 ? '#ff3060' : M.fierce ? '#ff6a3d' : '#8f63ff'), mx, my, 0.75 * ma);
      F.blit(bs, mx, my, ma);
      F.light(mx + 24, my + 7, 8 + 2 * Math.sin(t / 150), pal.e, 0.8 * ma);
      if (M.flash) F.blit(F.silhouette(id, bs, '#ffffff'), mx, my, M.flash / 6 * 0.8);
      if (!M.dead) { var kk = Math.max(0, M.hp / M.max); F.rect(63, 15, 98, 4, '#000000', 0.7); F.rect(64, 16, 96, 2, '#ffffff', 0.15); F.rect(64, 16, 96 * kk, 2, M.hp < M.max / 2 ? '#ff4060' : M.fierce ? '#ff8a3d' : '#c070ff', 1); F.rect(64, 16, 96 * kk, 1, '#ffffff', 0.3, true); }
    }
    W.bolts.forEach(function (z) { F.light(z.x + 1.5, z.y + 1.5, 7, '#ff3fd2', 0.9); F.rect(z.x + 0.5, z.y + 0.5, 2, 2, '#ffffff', 1); });
    // drifters, with shadows
    W.enemies.forEach(function (e) {
      var id = 'd' + e.kind + ((e.t >> 4) & 1), spr = F.sprite(id, ART[id], DRIFT[e.kind]);
      F.blit(F.silhouette(id, spr, '#000000'), e.x + 2, e.y + 3, 0.35);
      F.glow(F.halo('h|' + id, spr, DRIFT[e.kind].a), e.x, e.y, 0.75); F.blit(spr, e.x, e.y);
    });
    // capsules, spinning
    W.caps.forEach(function (c) {
      var col = CAPCOL[c.kind], spin = Math.cos(c.t * 0.11), sx = Math.max(0.22, Math.abs(spin)), w = 12 * sx;
      g.globalAlpha = 0.35; g.fillStyle = '#000000'; g.beginPath(); g.ellipse((c.x + 2) * S + F.ox, (c.y + 4) * S + F.oy, w / 2 * S, 2.2 * S, 0, 0, 6.3); g.fill();
      F.light(c.x, c.y, 10, col, 0.5);
      var px = (c.x - w / 2) * S + F.ox, py = (c.y - 3) * S + F.oy, pw = w * S, ph = 6 * S, rr = ph / 2, cg = g.createLinearGradient(0, py, 0, py + ph);
      cg.addColorStop(0, mix(col, '#ffffff', 0.6)); cg.addColorStop(0.5, col); cg.addColorStop(1, mix(col, '#000000', 0.45));
      g.globalAlpha = 1; g.fillStyle = cg; g.beginPath();
      if (pw > rr * 2) { g.moveTo(px + rr, py); g.lineTo(px + pw - rr, py); g.arc(px + pw - rr, py + rr, rr, -Math.PI / 2, Math.PI / 2); g.lineTo(px + rr, py + ph); g.arc(px + rr, py + rr, rr, Math.PI / 2, Math.PI * 1.5); }
      else g.ellipse(px + pw / 2, py + rr, pw / 2, rr, 0, 0, 6.3);
      g.fill();
      if (spin > 0.55) F.text(c.kind, c.x + 0.5, c.y - 3, '#10121a', 1, null, 0, 1);
    });
    // lasers and the net
    W.lasers.forEach(function (z) { F.rect(z.x - 0.5, z.y - 1, 2, 8, '#ff3f55', 0.45, true); F.rect(z.x, z.y, 1, 6, '#ffd0d6', 1); F.light(z.x + 0.5, z.y + 2, 4, '#ff3f55', 0.4); });
    if (W.net) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#9fdcff'; g.lineWidth = Math.max(1, S * 0.5);
      for (var pass = 0; pass < 2; pass++) {
        g.globalAlpha = pass ? 0.9 : 0.3; g.lineWidth = Math.max(1, S * (pass ? 0.45 : 1.6));
        g.beginPath(); for (var xi = 0; xi <= 52; xi++) { var xx = L + (R - L) * xi / 52, yy = NET_Y + 1 + Math.sin(t / 160 + xi * 0.7) * 0.6; if (xi) g.lineTo(xx * S + F.ox, yy * S + F.oy); else g.moveTo(xx * S + F.ox, yy * S + F.oy); }
        g.stroke();
      }
      g.restore();
    }
    // the bat, the balls, then everything flying about
    if (W.phase !== 'lost' && !W.over) drawBat(W, t);
    drawBalls(W, t);
    g.save(); g.imageSmoothingEnabled = true;
    SH.forEach(function (s) {
      var a = Math.min(1, s.life / s.max * 1.6), c = Math.cos(s.a), sn = Math.sin(s.a);
      g.setTransform(c * S, sn * S, -sn * S, c * S, s.x * S + F.ox, s.y * S + F.oy);
      g.globalAlpha = a; g.fillStyle = s.col; g.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
      g.globalAlpha = a * 0.6; g.fillStyle = '#ffffff'; g.fillRect(-s.w / 2, -s.h / 2, s.w, Math.min(0.6, s.h / 3));
    });
    g.restore();
    F.drawFx();
    // scores along the top (the score rolls up), the run meter, lives and powers along the bottom
    dispScore += Math.max(1, Math.ceil((W.score - dispScore) * 0.18)) * (W.score > dispScore ? 1 : 0); if (dispScore > W.score) dispScore = W.score;
    F.text('SCORE', 8, 4, '#8fa3d1', 1, 'left'); F.text(('00000' + Math.min(999999, dispScore)).slice(-6), 43, 4, '#ffffff', 1, 'left', 0.35);
    F.text('LEVEL ' + W.level, GW / 2 + 1, 4, th[2], 1, null, 0.35);
    F.text(('00000' + Math.min(999999, info ? info.best : W.score)).slice(-6), GW - 8, 4, '#ffd84a', 1, 'right', 0.35); F.text('BEST', GW - 49, 4, '#8fa3d1', 1, 'right');
    if (W.volley > 0 && !M) {   // the run: how close to the next multiplier
      var step = (W.volley - 1) % 4 + 1, mc = ['#ffffff', '#ffffff', '#ffe14a', '#ff9a3d', '#ff4fc8', '#7fe8ff'][W.mult];
      F.rect(72, 18, 80, 3, '#000000', 0.6);
      F.rect(72, 18, W.mult >= 5 ? 80 : 80 * step / 4, 3, mc, 0.9, true);
      if (comboFlash) F.rect(72, 18, 80, 3, '#ffffff', comboFlash / 30 * 0.6, true);
    }
    var lb = F.cached('lifebat|' + th[2], function (kk) {   // a little bat for each spare life
      var c = F.canvas(12 * kk, 3 * kk), x = c.getContext('2d'), gg = x.createLinearGradient(0, 0, 0, 3 * kk);
      gg.addColorStop(0, '#ffffff'); gg.addColorStop(0.5, '#9aa3b6'); gg.addColorStop(1, '#3a4050');
      x.fillStyle = gg; rrect(x, 12 * kk, 3 * kk, 1.5 * kk); x.fill(); x.fillStyle = th[2]; x.fillRect(0, 0, 2.5 * kk, 3 * kk); x.fillRect(9.5 * kk, 0, 2.5 * kk, 3 * kk); return c;
    });
    for (var li = 0; li < Math.min(7, W.lives - (W.phase === 'lost' ? 0 : 1)); li++) F.blit(lb, L + 3 + li * 15, GH - 6, 0.9);
    var chips = []; if (W.batPower) chips.push(W.batPower); if (W.fireT > 0) chips.push('F'); if (W.blast > 0) chips.push('B');
    chips.forEach(function (ch, ci) {
      var cx = R - 9 - ci * 15, col = CAPCOL[ch];
      F.rect(cx - 6, GH - 9, 12, 7, mix(col, '#000000', 0.4), 1); F.rect(cx - 6, GH - 9, 12, 2, mix(col, '#ffffff', 0.3), 1);
      F.text(ch, cx + 0.5, GH - 9, '#ffffff', 1);
      if (ch === 'F') F.rect(cx - 6, GH - 1.5, 12 * W.fireT / W.sp.fire, 1, col, 1);
      if (ch === 'B') F.rect(cx - 6, GH - 1.5, 12 * W.blast / 3, 1, col, 1);
    });
    F.drawLabels(GW);
    if (VIG && !F.low) { g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.drawImage(VIG, 0, 0); }
    F.end();
  }

  // ---------------------------------------------------------------- sound: glassy breaks with a rising tune, booms, a punchy bat
  var NOTES = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349];
  function pan(e) { return e && e.x != null ? Math.max(-0.8, Math.min(0.8, (e.x - GW / 2) / (GW / 2))) : 0; }
  function sound(name, S, e) {
    var p = pan(e), n;
    switch (name) {
      case 'bat': S.tone(140, 0.1, 0.13, { type: 'sine', to: 55, pan: p }); S.tone(392, 0.05, 0.03, { type: 'square', pan: p }); S.noise(0.03, 0.05, 5000, { type: 'highpass', to: 3000, pan: p }); break;
      case 'wall': S.tone(520, 0.03, 0.02, { type: 'square', pan: p }); S.noise(0.02, 0.02, 7000, { type: 'highpass', to: 4000, pan: p }); break;
      case 'brick':
        n = NOTES[Math.min(NOTES.length - 1, Math.max(0, ((e && e.n) || 1) - 1))];
        S.tone(n, 0.14, 0.045, { type: 'square', pan: p, verb: 0.22 }); S.tone(n * 2, 0.08, 0.014, { type: 'triangle', pan: p });
        S.noise(0.12, 0.05, 9500, { type: 'bandpass', q: 5, to: 4000, pan: p });
        break;
      case 'silver': S.tone(1250, 0.1, 0.04, { type: 'square', to: 1100, pan: p }); S.tone(2500, 0.12, 0.012, { type: 'triangle', pan: p, verb: 0.3 }); S.noise(0.05, 0.04, 9000, { type: 'bandpass', q: 8, pan: p }); break;
      case 'steel': S.tone(170, 0.12, 0.06, { type: 'square', to: 140, pan: p }); S.noise(0.07, 0.05, 3000, { type: 'bandpass', q: 4, pan: p }); break;
      case 'explode': S.noise(0.8, 0.26, 3200, { pan: p, verb: 0.45 }); S.tone(85, 0.55, 0.2, { type: 'sine', to: 28, pan: p }); S.tone(220, 0.3, 0.04, { type: 'sawtooth', to: 60, pan: p }); break;
      case 'launch': S.tone(440, 0.12, 0.05, { type: 'triangle', to: 880, pan: p }); S.noise(0.15, 0.03, 1500, { type: 'bandpass', q: 2, to: 6000, pan: p }); break;
      case 'catch': S.tone(660, 0.08, 0.04, { type: 'triangle', to: 440, pan: p }); break;
      case 'combo': n = (e && e.n) || 2; S.tone(659 * Math.pow(1.19, n - 2), 0.12, 0.04, { type: 'square', verb: 0.3 }); S.tone(988 * Math.pow(1.19, n - 2), 0.16, 0.035, { type: 'square', when: 0.07, verb: 0.3 }); break;
      case 'praise': [784, 988, 1175, 1568].forEach(function (f, k) { S.tone(f, 0.18, 0.04, { type: 'square', when: k * 0.05, verb: 0.45 }); }); break;
      case 'capdrop': S.tone(880, 0.1, 0.03, { type: 'triangle', to: 1320, pan: p, verb: 0.3 }); break;
      case 'powerup': [523, 659, 784, 1047, 1319].forEach(function (f, k) { S.tone(f, 0.12, 0.045, { type: 'square', when: k * 0.055, verb: 0.35 }); }); break;
      case 'laser': S.tone(1900, 0.1, 0.03, { type: 'sawtooth', to: 500, pan: p }); break;
      case 'netsave': S.tone(300, 0.3, 0.06, { type: 'sine', to: 700, pan: p, verb: 0.4 }); S.tone(900, 0.25, 0.02, { type: 'triangle', to: 1800, pan: p }); break;
      case 'gate': S.tone(140, 0.25, 0.04, { type: 'sawtooth', to: 90, pan: p }); break;
      case 'enemy': S.noise(0.22, 0.12, 5000, { pan: p, verb: 0.25 }); S.tone(700, 0.12, 0.03, { type: 'square', to: 1400, pan: p }); break;
      case 'fireout': S.tone(700, 0.25, 0.03, { type: 'triangle', to: 260 }); break;
      case 'bosshit': S.tone(430, 0.08, 0.045, { type: 'square', to: 360, pan: p }); S.noise(0.08, 0.07, 9000, { type: 'bandpass', q: 6, pan: p }); S.tone(90, 0.12, 0.08, { type: 'sine', to: 50, pan: p }); break;
      case 'bossfire': S.tone(280, 0.28, 0.045, { type: 'sawtooth', to: 110, pan: p, verb: 0.25 }); break;
      case 'bossrage': S.tone(110, 0.7, 0.09, { type: 'sawtooth', to: 220, verb: 0.4 }); S.tone(116, 0.7, 0.07, { type: 'sawtooth', to: 233, verb: 0.4 }); break;
      case 'bossdie':
        S.noise(2.6, 0.36, 3000, { verb: 0.6 }); S.tone(90, 2.3, 0.22, { type: 'sine', to: 22 });
        [784, 659, 523, 392, 523, 659, 784, 1047].forEach(function (f, k) { S.tone(f, 0.14, 0.04, { type: 'square', when: 0.6 + k * 0.09, verb: 0.4 }); });
        break;
      case 'lost': S.noise(0.9, 0.24, 2800, { pan: p, verb: 0.45 }); S.tone(160, 0.6, 0.1, { type: 'sine', to: 40 }); [392, 330, 262].forEach(function (f, k) { S.tone(f, 0.22, 0.05, { type: 'triangle', when: 0.2 + k * 0.18 }); }); break;
      case 'level': S.noise(0.9, 0.05, 300, { type: 'bandpass', q: 2, to: 7000 }); [392, 523, 659, 784].forEach(function (f, k) { S.tone(f, 0.12, 0.045, { type: 'triangle', when: 0.5 + k * 0.09, verb: 0.35 }); }); break;
      case 'warning': for (var k2 = 0; k2 < 6; k2++) S.tone(k2 % 2 ? 494 : 392, 0.22, 0.045, { type: 'square', when: k2 * 0.24, verb: 0.3 }); break;
      case 'clear': [523, 659, 784, 1047, 1319, 1568].forEach(function (f, k) { S.tone(f, 0.15, 0.05, { type: 'square', when: k * 0.08, verb: 0.45 }); }); break;
      case 'extra': [523, 659, 784, 1047, 784, 1047].forEach(function (f, k) { S.tone(f, 0.1, 0.05, { type: 'square', when: k * 0.09, verb: 0.3 }); }); break;
      case 'over': [392, 330, 262, 196].forEach(function (f, k) { S.tone(f, 0.3, 0.06, { type: 'triangle', when: k * 0.26, verb: 0.4 }); }); break;
    }
  }

  // ---------------------------------------------------------------- music (Settings > Music, off unless switched on): a synthwave loop
  var BPM = 112, STEP16 = 60 / BPM / 4, nextT = 0, stepN = 0;
  var CHORDS = [   // A minor, F, C, G - bass root, then the notes the arpeggio walks
    [55, [440, 523, 659, 880]], [43.65, [349, 440, 523, 698]], [65.41, [392, 523, 659, 784]], [49, [392, 494, 587, 784]]
  ];
  function frameAudio(W, S, mode, SET) {
    var want = !!(W && !W.demo && mode === 'play' && SET.sound && SET.music);
    if (!want) { nextT = 0; return; }
    var a = S.ctx(); if (!a) return;
    var now = a.currentTime;
    if (!nextT || nextT < now) { nextT = now + 0.06; stepN = 0; }
    while (nextT < now + 0.22) {
      var bar = Math.floor(stepN / 16) % 4, s16 = stepN % 16, ch = CHORDS[bar], when = nextT - now;
      if (s16 % 2 === 0) S.tone(ch[0] * (s16 % 8 === 6 ? 2 : 1), STEP16 * 1.8, 0.05, { type: 'sawtooth', when: when, attack: 0.005 });
      S.tone(ch[1][s16 % 4] * (s16 >= 8 ? 2 : 1), STEP16 * 0.9, 0.012, { type: 'square', when: when, verb: 0.3 });
      if (s16 % 4 === 0) S.tone(130, 0.14, 0.12, { type: 'sine', to: 42, when: when });
      if (s16 === 4 || s16 === 12) S.noise(0.12, 0.05, 2200, { type: 'bandpass', q: 1.2, when: when });
      if (s16 % 2 === 1) S.noise(0.03, 0.012, 9000, { type: 'highpass', to: 7000, when: when });
      nextT += STEP16; stepN++;
    }
  }

  A.start({
    id: 'batball', store: 'bb365', title: '365 Bat & Ball', width: GW, height: GH, waveWord: 'level',
    speeds: { options: [[1, 'Gentle'], [2, 'Classic'], [3, 'Fast']], def: 1 },
    settings: [
      { key: 'music', type: 'switch', label: 'Music', small: 'A synthwave backing track while you play.', def: false },
      { key: 'shake', type: 'switch', label: 'Screen shake', small: 'The screen shakes when something big blows up.', def: !reducedMotion }
    ],
    newWorld: function (speed) { return E.newWorld(speed); },
    hires: function () { return true; },
    step: E.step, hud: E.hud, draw: draw, sound: sound, frameAudio: frameAudio,
    quietSay: function () { return true; },   // the game shows its own banners and labels
    overText: function (W) { return 'Game over – level ' + W.level; },
    titleText: 'Keep the ball bouncing and clear every brick &mdash; 20 levels, explosive bricks that set each other off, capsules for a <b>wider bat</b>, <b>lasers</b>, <b>three balls</b> and more, and the Mothership on levels 10 and 20.',
    keysText: '<b>Mouse</b> or <b>&larr; &rarr;</b> to move &middot; <b>Space</b> or click to launch (and fire lasers) &middot; <b>P</b> to pause',
    touchText: 'Drag on the screen to move the bat and tap to launch &mdash; or use the buttons',
    help: [
      '<b>The aim:</b> keep the ball in play with your bat and break every brick to finish the level. There are 20 levels, then they come round again, quicker.',
      '<b>Move</b> the bat with the mouse (the easiest), the <b>&larr; &rarr;</b> keys, or by dragging on a tablet. <b>Space</b>, a click or a tap launches the ball.',
      '<b>Aim with the bat:</b> where the ball lands on it sets where it goes &mdash; near an end sends it off at an angle. Moving the bat as it lands steers it further.',
      '<b>Bricks:</b> coloured ones break at a touch. <b>Silver</b> takes a few hits, <b>steel</b> never breaks, <b>gold</b> always drops a capsule, and <b>explosive</b> ones (striped) blow up everything round them &mdash; even the next explosive. On some levels the bricks slide from side to side.',
      '<b>Capsules</b> fall from some bricks &mdash; catch them with the bat: <b>W</b> wider bat, <b>L</b> lasers (press fire), <b>C</b> catch (fire lets go), <b>S</b> slower ball, <b>M</b> three balls, <b>F</b> fireball, <b>N</b> a safety net for one lost ball, <b>B</b> blast (your next three hits explode), <b>+</b> an extra life.',
      '<b>Runs:</b> break bricks one after another before the ball comes back to the bat &mdash; the bar at the top fills, the points go up to five times, and the notes climb.',
      '<b>Little invaders</b> drift down from the hatches and knock the ball about &mdash; 100 points each. On <b>levels 10 and 20</b> the Mothership fires at your bat: dodge, and keep hitting it.',
      '<b>Settings:</b> <b>Gentle</b> has a slower ball, a wider bat and five lives. <b>Music</b> switches on a backing track. <b>P</b> pauses; the game also pauses itself if you click away.'
    ]
  });
})();
