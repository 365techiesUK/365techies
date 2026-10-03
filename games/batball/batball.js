/* 365 Bat & Ball - the picture and the sound (3 Oct 2026). The rules are in engine.js (window.BBEngine); the cabinet -
 * bar, scores, settings, controls, the game loop - is ../common/arcade.js, and the glows / sparks / pixel text are
 * ../common/arcade-fx.js. Neon night look: a moving grid floor and a striped sun behind the bricks, a colour theme per
 * level, glossy bricks with a passing shine, a glowing ball with a trail, a chrome bat. Every picture and sound is our
 * own, made on the spot - nothing is downloaded. */
(function () {
  'use strict';
  var E = window.BBEngine, A = window.Arcade365, F = window.Arcade365FX.create();
  var GW = E.WIDTH, GH = E.HEIGHT, L = E.L, R = E.R, T = E.T, BAT_Y = E.BAT_Y, BAT_H = E.BAT_H, BALL = E.BALL;
  var reducedMotion = F.reduced;

  // ---------------------------------------------------------------- colours
  var BRICK = { w: '#eef1ff', y: '#ffd84a', o: '#ff9a3d', g: '#5cff8a', c: '#3fe0ff', b: '#4f7bff', p: '#ff4fc8', r: '#ff3f55', s: '#c9d2e6', x: '#5a6275', '*': '#ffcc33' };
  var CAPCOL = { W: '#3fe0ff', M: '#ff4fc8', L: '#ff3f55', S: '#ffb020', C: '#5cff8a', F: '#ff7a1a', '+': '#a0a8ff' };
  var CAPWORD = { W: 'WIDE', M: 'MULTI', L: 'LASER', S: 'SLOW', C: 'CATCH', F: 'FIRE', '+': '1UP' };
  var THEMES = [   // one per level: sky top, sky bottom, grid / accent, sun
    ['#12032e', '#3b0b5e', '#ff3fd2', '#ffb347'], ['#03122e', '#0b3d7a', '#36d6ff', '#bff3ff'], ['#020b1f', '#0a2a4a', '#3fe0ff', '#e8f0ff'],
    ['#1a0012', '#4a0034', '#ff4fc8', '#ff9ad6'], ['#1a0c00', '#4a2800', '#ffb020', '#ffe08a'], ['#2a0a3a', '#b8402a', '#ffd84a', '#ff8a3d'],
    ['#08080e', '#262838', '#cfd6ff', '#ffffff'], ['#24001a', '#5a0030', '#ff6b9a', '#ffc2d6'], ['#001a28', '#004a6a', '#7fe8ff', '#e0fbff'],
    ['#0a0018', '#2a0050', '#8f63ff', '#ff4060'], ['#04140a', '#163a1c', '#5cff8a', '#d0ffd8'], ['#100026', '#2a0050', '#ffffff', '#ffd84a']
  ];
  function theme(W) { return THEMES[(W.level - 1) % THEMES.length]; }
  function mix(hex, to, k) {   // blend a colour towards another (#rrggbb)
    var a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
    var r = Math.round(((a >> 16) & 255) * (1 - k) + ((b >> 16) & 255) * k), g = Math.round(((a >> 8) & 255) * (1 - k) + ((b >> 8) & 255) * k), bl = Math.round((a & 255) * (1 - k) + (b & 255) * k);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }

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

  // ---------------------------------------------------------------- pictures painted at full sharpness, kept until the size changes
  function brickPic(t, k) {
    return F.cached('brick|' + t, function () {
      var w = 16 * k, h = 8 * k, c = F.canvas(w, h), x = c.getContext('2d'), base = BRICK[t], gap = Math.max(1, Math.round(k * 0.6)), bw = w - gap, bh = h - gap, rr = Math.max(1, k * 0.9);
      function rrect() { x.beginPath(); x.moveTo(rr, 0); x.lineTo(bw - rr, 0); x.quadraticCurveTo(bw, 0, bw, rr); x.lineTo(bw, bh - rr); x.quadraticCurveTo(bw, bh, bw - rr, bh); x.lineTo(rr, bh); x.quadraticCurveTo(0, bh, 0, bh - rr); x.lineTo(0, rr); x.quadraticCurveTo(0, 0, rr, 0); x.closePath(); }
      var g = x.createLinearGradient(0, 0, 0, bh);
      if (t === 's') { g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#c9d2e6'); g.addColorStop(0.55, '#8d97ad'); g.addColorStop(1, '#dfe5f2'); }
      else if (t === 'x') { g.addColorStop(0, '#7a8296'); g.addColorStop(0.5, '#4b5263'); g.addColorStop(1, '#2c313d'); }
      else if (t === '*') { g.addColorStop(0, '#fff3b0'); g.addColorStop(0.4, '#ffcc33'); g.addColorStop(1, '#b07800'); }
      else { g.addColorStop(0, mix(base, '#ffffff', 0.45)); g.addColorStop(0.45, base); g.addColorStop(1, mix(base, '#000000', 0.45)); }
      rrect(); x.fillStyle = g; x.fill();
      x.globalAlpha = 0.55; x.fillStyle = '#ffffff'; x.fillRect(rr, Math.max(1, k * 0.5), bw - rr * 2, Math.max(1, Math.round(k * 0.6)));   // the gloss line
      x.globalAlpha = 1; x.lineWidth = Math.max(1, k * 0.35); x.strokeStyle = mix(t === 's' || t === 'x' || t === '*' ? (t === 'x' ? '#5a6275' : t === '*' ? '#ffcc33' : '#c9d2e6') : base, '#000000', 0.55); rrect(); x.stroke();
      if (t === 'x') { x.fillStyle = '#aab2c4'; [[2.5, 4], [12.5, 4]].forEach(function (p) { x.beginPath(); x.arc(p[0] * k, p[1] * k, k * 0.7, 0, 6.3); x.fill(); }); }
      if (t === '*') { x.fillStyle = '#ffffff'; x.fillRect(7 * k, 2 * k, k, 3 * k); x.fillRect(6 * k, 3 * k, 3 * k, k); }
      return c;
    });
  }
  function crackPic(n, k) {   // dents on a silver brick
    return F.cached('crack|' + n, function () {
      var c = F.canvas(16 * k, 8 * k), x = c.getContext('2d');
      x.strokeStyle = 'rgba(40,46,60,0.75)'; x.lineWidth = Math.max(1, k * 0.45);
      var lines = [[[3, 1], [5, 4], [4, 7]], [[11, 1], [10, 3], [12, 6]], [[7, 0], [8, 3], [7, 7]], [[1, 4], [4, 5], [7, 4]]];
      for (var i = 0; i < n && i < lines.length; i++) { x.beginPath(); lines[i].forEach(function (p, j) { if (j) x.lineTo(p[0] * k, p[1] * k); else x.moveTo(p[0] * k, p[1] * k); }); x.stroke(); }
      return c;
    });
  }
  function ballPic(col, k) {
    return F.cached('ball|' + col, function () {
      var s = BALL * k, c = F.canvas(s, s), x = c.getContext('2d'), g = x.createRadialGradient(s * 0.35, s * 0.3, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, mix(col, '#ffffff', 0.6)); g.addColorStop(1, col);
      x.fillStyle = g; x.beginPath(); x.arc(s / 2, s / 2, s / 2, 0, 6.3); x.fill();
      return c;
    });
  }
  function batPic(w, power, accent, k) {
    return F.cached('bat|' + w + '|' + power + '|' + accent, function () {
      var cw = w * k, ch = BAT_H * k, c = F.canvas(cw, ch), x = c.getContext('2d'), r = ch / 2, end = Math.max(r * 1.6, 4 * k);
      var endCol = power === 'L' ? '#ff3f55' : power === 'C' ? '#5cff8a' : power === 'W' ? '#3fe0ff' : accent;
      function cap() { x.beginPath(); x.moveTo(r, 0); x.lineTo(cw - r, 0); x.arc(cw - r, r, r, -Math.PI / 2, Math.PI / 2); x.lineTo(r, ch); x.arc(r, r, r, Math.PI / 2, Math.PI * 1.5); x.closePath(); }
      var g = x.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#c8d0e0'); g.addColorStop(0.6, '#6c7488'); g.addColorStop(1, '#2b3040');
      cap(); x.fillStyle = g; x.fill();
      x.save(); cap(); x.clip();
      var ge = x.createLinearGradient(0, 0, 0, ch); ge.addColorStop(0, mix(endCol, '#ffffff', 0.5)); ge.addColorStop(0.5, endCol); ge.addColorStop(1, mix(endCol, '#000000', 0.5));
      x.fillStyle = ge; x.fillRect(0, 0, end, ch); x.fillRect(cw - end, 0, end, ch);
      x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(end, Math.max(1, ch * 0.18), cw - end * 2, Math.max(1, k * 0.5));
      if (power === 'L') { x.fillStyle = '#20232c'; x.fillRect(k * 1.5, 0, k * 2, ch * 0.5); x.fillRect(cw - k * 3.5, 0, k * 2, ch * 0.5); }
      x.restore();
      return c;
    });
  }

  // ---------------------------------------------------------------- the night sky, the sun and the grid floor
  var BG = null, BGkey = '';
  function sky(W) {
    var th = theme(W), key = W.level + '|' + F.dw + 'x' + F.dh;
    if (BG && BGkey === key) return BG;
    BGkey = key; BG = F.canvas(F.dw, F.dh);
    var x = BG.getContext('2d'), S = F.scale, hz = 150 * S, g = x.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, th[0]); g.addColorStop(1, th[1]); x.fillStyle = g; x.fillRect(0, 0, F.dw, hz);
    var a = 97 + W.level; function rnd() { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }
    for (var i = 0; i < 90; i++) { x.globalAlpha = 0.2 + rnd() * 0.6; x.fillStyle = '#ffffff'; var sz = rnd() < 0.15 ? 2 : 1; x.fillRect(rnd() * F.dw, rnd() * hz * 0.85, sz, sz); }
    x.globalAlpha = 1;
    // the striped sun sitting on the horizon
    // (painted on its own so the stripes cut only the sun, never the sky behind it)
    var cx = GW / 2 * S, sr = Math.round(46 * S), sun = F.canvas(sr * 2, sr), su = sun.getContext('2d'), sg = su.createLinearGradient(0, 0, 0, sr);
    sg.addColorStop(0, th[3]); sg.addColorStop(1, th[2]);
    su.fillStyle = sg; su.beginPath(); su.arc(sr, sr, sr, Math.PI, 0); su.fill();
    su.globalCompositeOperation = 'destination-out';
    for (var s = 0; s < 6; s++) { var yy = sr - sr * 0.08 - s * sr * 0.14, hh = Math.max(1, sr * 0.025 * (6 - s) / 3); su.fillRect(0, yy, sr * 2, hh); }
    x.globalAlpha = 0.5; x.drawImage(sun, cx - sr, hz - sr); x.globalAlpha = 1;
    var hg = x.createLinearGradient(0, hz - 30 * S, 0, hz + 4 * S); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(1, th[2]);
    x.globalAlpha = 0.25; x.fillStyle = hg; x.fillRect(0, hz - 30 * S, F.dw, 34 * S); x.globalAlpha = 1;
    // the floor below the horizon
    var fg = x.createLinearGradient(0, hz, 0, F.dh); fg.addColorStop(0, '#05010c'); fg.addColorStop(1, th[0]);
    x.fillStyle = fg; x.fillRect(0, hz, F.dw, F.dh - hz);
    return BG;
  }
  function grid(W, t) {   // perspective lines that roll towards you
    var g = F.g, S = F.scale, th = theme(W), hz = 150, cx = GW / 2, ox = F.ox, oy = F.oy;
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = th[2]; g.lineWidth = Math.max(1, S * 0.35);
    for (var i = -9; i <= 9; i++) {
      g.globalAlpha = 0.28; g.beginPath(); g.moveTo((cx + i * 4) * S + ox, hz * S + oy); g.lineTo((cx + i * 34) * S + ox, GH * S + oy); g.stroke();
    }
    var ph = reducedMotion ? 0 : (t / 900) % 1;
    for (var j = 0; j < 9; j++) {
      var k = (j + ph) / 9, y = hz + (GH - hz) * k * k;
      g.globalAlpha = 0.08 + 0.3 * k; g.beginPath(); g.moveTo(0 + ox, y * S + oy); g.lineTo(GW * S + ox, y * S + oy); g.stroke();
    }
    g.restore();
  }
  function walls(W, t) {
    var th = theme(W), S = F.scale;
    F.rect(0, T - 8, GW, 8, '#1b1e2a', 1); F.rect(0, T - 8, L, GH, '#1b1e2a', 1); F.rect(R, T - 8, GW - R, GH, '#1b1e2a', 1);
    F.rect(0, T - 7, GW, 1, '#3a4054', 1); F.rect(1, T - 8, 1, GH, '#3a4054', 1); F.rect(GW - 2, T - 8, 1, GH, '#3a4054', 1);
    F.rect(L - 1, T - 1, 1, GH, th[2], 0.7, true); F.rect(R, T - 1, 1, GH, th[2], 0.7, true); F.rect(L - 1, T - 1, R - L + 2, 1, th[2], 0.7, true);
    E.GATES.forEach(function (gx, i) {   // the two hatches the drifters come out of
      var open = gateOpen[i] > 0 ? Math.min(1, gateOpen[i] / 10, (60 - gateOpen[i]) / 10 + 0.0001) : 0;
      F.rect(gx - 8, T - 7, 16, 6, '#0b0d14', 1);
      F.rect(gx - 8, T - 7, 8 * (1 - open), 6, '#4a5268', 1); F.rect(gx + 8 * open, T - 7, 8 * (1 - open), 6, '#4a5268', 1);
      if (open) F.light(gx, T - 4, 8, th[2], open * 0.7);
    });
  }

  // ---------------------------------------------------------------- what happened: sparks, banners, sounds' pictures
  var gateOpen = [0, 0], trails = new WeakMap(), lastW = null, shineT = 0;
  function onFx(W, f) {
    var th = theme(W), col;
    switch (f.k) {
      case 'level': trails = new WeakMap(); F.banner(f.boss ? 'WARNING' : 'LEVEL ' + f.n, f.boss ? 'THE MOTHERSHIP' : f.name, f.boss ? '#ff4060' : th[2], 140, !!f.boss); break;
      case 'brick':
        col = BRICK[f.t];
        F.emit(f.x, f.y, 14, [col, mix(col, '#ffffff', 0.5), mix(col, '#000000', 0.3)], 1.3, 40, { spread: 12, spreadY: 5, grav: 0.07, add: false, size: 1.2 });
        F.emit(f.x, f.y, 5, ['#ffffff'], 1.8, 14, { size: 0.7 });
        F.flash(f.x, f.y, 10, col, 10);   // (no points label per brick: with three balls they pile up - the score is at the top)
        break;
      case 'dent': F.emit(f.x, f.y, 6, ['#ffffff', '#c9d2e6'], 1.4, 14); F.ring(f.x, f.y, 7, '#ffffff', 10); break;
      case 'steel': F.emit(f.x, f.y, 5, ['#ffd0a0', '#ffffff'], 1.3, 12); break;
      case 'combo': F.floater('x' + f.n + ' COMBO', GW / 2, 132, ['#ffffff', '#ffffff', '#ffe14a', '#ff9a3d', '#ff4fc8'][f.n], f.n >= 3 ? 2 : 1, 70, 'combo'); break;
      case 'bat': F.flash(f.x, f.y, 6, th[2], 8); F.emit(f.x, f.y, 3, [th[2], '#ffffff'], 0.9, 10, { angle: -Math.PI / 2, cone: 1.6 }); break;
      case 'capdrop': F.ring(f.x, f.y, 9, CAPCOL[f.kind], 16); break;
      case 'collect': F.ring(f.x, f.y, 18, CAPCOL[f.kind], 22, 1.5); F.emit(f.x, f.y, 20, [CAPCOL[f.kind], '#ffffff'], 1.6, 28); F.floater(CAPWORD[f.kind], f.x, f.y - 16, CAPCOL[f.kind], 1, 70); break;
      case 'laser': [f.x - f.w / 2 + 3, f.x + f.w / 2 - 4].forEach(function (lx) { F.flash(lx + 0.5, BAT_Y - 4, 5, '#ff6070', 8); }); break;
      case 'zap': F.emit(f.x, f.y, 3, ['#ff8090'], 0.8, 10); break;
      case 'gate': gateOpen[f.g] = 60; break;
      case 'enemy': col = DRIFT[f.kind].a; F.emit(f.x, f.y, 18, [col, DRIFT[f.kind].b, '#ffffff'], 1.6, 30, { spread: 6 }); F.ring(f.x, f.y, 12, col, 16); F.flash(f.x, f.y, 10, col, 10); F.floater('100', f.x, f.y - 6, '#ffffff', 1, 40); break;
      case 'bosshit': F.emit(f.x, f.y, 7, [BOSSPAL.b, '#ffffff', BOSSPAL.e], 1.4, 16); F.flash(f.x, f.y, 6, '#c08cff', 8); F.shake(0.8); break;
      case 'bossfire': F.flash(f.x, f.y, 7, '#ff3fd2', 10); break;
      case 'bossdie':
        F.emit(f.x, f.y, 90, [BOSSPAL.a, BOSSPAL.b, BOSSPAL.e, '#ffd84a', '#ffffff'], 2.8, 80, { spread: 30 });
        F.ring(f.x, f.y, 60, '#ffffff', 40, 2); F.ring(f.x, f.y, 40, '#ff3fd2', 32, 2); F.flash(f.x, f.y, 60, '#ffb0f0', 40);
        F.shake(9); F.screen('#ffffff', 0.45, 40); F.floater('+' + f.pts, f.x, f.y + 14, '#ffe14a', 2, 120); break;
      case 'lost':
        F.emit(f.x, f.y, 40, ['#c8d0e0', '#ffffff', th[2], '#ff9a3d'], 2, 50, { spread: f.w, spreadY: 3 });
        F.flash(f.x, f.y, 24, '#ff7040', 22); F.shake(5); F.screen('#ff3b3b', 0.2, 22); break;
      case 'balllost': F.emit(f.x, GH - 2, 6, ['#ffffff', th[2]], 1, 16, { angle: -Math.PI / 2, cone: 1.4 }); break;
      case 'clear':
        F.banner('LEVEL CLEAR', f.perfect ? '+' + f.pts + '  NO LIVES LOST' : '+' + f.pts, '#5cff8a', 140);
        for (var i = 0; i < 6; i++) F.emit(20 + i * 37, T + 4, 10, ['#ff4fc8', '#ffd84a', '#3fe0ff', '#5cff8a', '#ffffff'], 1.2, 120, { angle: Math.PI / 2, cone: 1.2, grav: 0.03, add: false, size: 1.3 });
        break;
      case 'extra': F.floater('1UP', 40, BAT_Y - 14, '#5cff8a', 2, 90); break;
      case 'catch': F.ring(f.x, f.y, 8, '#5cff8a', 12); break;
    }
  }
  function stepExtras(W) {   // once per game step: hatches, trails of fire, the shine
    if (gateOpen[0]) gateOpen[0]--; if (gateOpen[1]) gateOpen[1]--;
    shineT++;
    W.balls.forEach(function (b) {
      var tr = trails.get(b); if (!tr) { tr = []; trails.set(b, tr); }
      tr.unshift({ x: b.x + BALL / 2, y: b.y + BALL / 2 }); if (tr.length > 9) tr.pop();
      if (W.fireT > 0 && !F.low && !b.stuck) F.emit(b.x + 2, b.y + 2, 1, ['#ff7a1a', '#ffd84a', '#ff3f1a'], 0.5, 20, { vy: -0.2 });
    });
    if (W.batPower && !F.low && W.frame % 6 === 0) F.emit(W.bat.x + (Math.random() - 0.5) * W.bat.w, BAT_Y + 3, 1, [CAPCOL[W.batPower]], 0.4, 18, { vy: 0.3 });
  }

  // ---------------------------------------------------------------- the picture
  function draw(g, W, t, mode, info) {
    F.begin(g, info, mode);
    if (W !== lastW) { lastW = W; F.reset(); trails = new WeakMap(); gateOpen = [0, 0]; }
    var q = W.fx; if (!W.demo) for (var i = 0; i < q.length; i++) onFx(W, q[i]); q.length = 0;
    var n = F.steps(W.frame); for (i = 0; i < n; i++) stepExtras(W);
    var k = F.k, th = theme(W);
    g.drawImage(sky(W), F.ox, F.oy);
    grid(W, t);
    walls(W, t);
    // bricks, with a shine that passes across now and then
    var shineX = ((shineT % 420) / 420) * 400 - 100;
    W.bricks.forEach(function (br) {
      if (!br.alive) return;
      F.blit(brickPic(br.t, k), br.x, br.y);
      if (br.t === 's' && br.hp < br.max) F.blit(crackPic(br.max - br.hp, k), br.x, br.y);
      if (br.t === '*') F.light(br.x + 8, br.y + 4, 9, '#ffcc33', 0.35 + 0.2 * Math.sin(t / 200));
      var d = Math.abs(br.x + br.y * 0.6 - shineX);
      if (d < 14 && !F.low) F.rect(br.x, br.y, 15, 7, '#ffffff', (1 - d / 14) * 0.28, true);
      if (br.hit) F.rect(br.x, br.y, 15, 7, '#ffffff', br.hit / 8 * 0.6, true);
    });
    // the Mothership and its plasma
    var M = W.boss;
    if (M) {
      var mx = M.x, my = M.y, ma = 1;
      if (M.dead) { mx += (Math.random() - 0.5) * 2; my += (Math.random() - 0.5) * 2; ma = M.dead < 40 ? M.dead / 40 : 1; if (M.dead % 9 === 0) { F.emit(M.x + Math.random() * 48, M.y + Math.random() * 20, 16, [BOSSPAL.a, BOSSPAL.e, '#ffd84a'], 1.5, 30); F.shake(2); } }
      var bs = F.sprite('boss', ART.boss, BOSSPAL);
      F.glow(F.halo('h|boss', bs, M.hp < M.max / 2 ? '#ff3060' : '#8f63ff'), mx, my, 0.7 * ma);
      F.blit(bs, mx, my, ma);
      F.light(mx + 24, my + 7, 7 + 2 * Math.sin(t / 150), '#ff3fd2', 0.75 * ma);
      if (M.flash) F.blit(F.silhouette('boss', bs, '#ffffff'), mx, my, M.flash / 6 * 0.8);
      if (!M.dead) { var kk = Math.max(0, M.hp / M.max); F.rect(63, 15, 98, 4, '#000000', 0.6); F.rect(64, 16, 96, 2, '#ffffff', 0.15); F.rect(64, 16, 96 * kk, 2, M.hp < M.max / 2 ? '#ff4060' : '#c070ff', 1); }
    }
    W.bolts.forEach(function (z) { F.light(z.x + 1.5, z.y + 1.5, 6, '#ff3fd2', 0.85); F.rect(z.x + 0.5, z.y + 0.5, 2, 2, '#ffffff', 1); });
    // drifters
    W.enemies.forEach(function (e) {
      var id = 'd' + e.kind + ((e.t >> 4) & 1), spr = F.sprite(id, ART[id], DRIFT[e.kind]);
      F.glow(F.halo('h|' + id, spr, DRIFT[e.kind].a), e.x, e.y, 0.7); F.blit(spr, e.x, e.y);
    });
    // capsules
    W.caps.forEach(function (c) {
      var col = CAPCOL[c.kind];
      F.light(c.x, c.y, 9, col, 0.45);
      F.rect(c.x - 6, c.y - 3, 12, 6, mix(col, '#000000', 0.35), 1); F.rect(c.x - 6, c.y - 3, 12, 2, mix(col, '#ffffff', 0.35), 1);
      F.rect(c.x - 6 + ((c.t >> 1) % 14) - 1, c.y - 3, 1, 6, '#ffffff', 0.5, true);
      F.text(c.kind, c.x + 0.5, c.y - 3, '#10121a', 1, null, 0, 1);
    });
    // lasers
    W.lasers.forEach(function (z) { F.rect(z.x - 0.5, z.y - 1, 2, 8, '#ff3f55', 0.4, true); F.rect(z.x, z.y, 1, 6, '#ffd0d6', 1); });
    // the bat
    if (W.phase !== 'lost' && !W.over) {
      var B = W.bat, bp = batPic(B.w, W.batPower, th[2], k);
      F.glow(F.halo('h|bat|' + B.w + '|' + W.batPower + '|' + th[2], bp, W.batPower ? CAPCOL[W.batPower] : th[2]), B.x - B.w / 2, BAT_Y, 0.55);
      F.blit(bp, B.x - B.w / 2, BAT_Y);
    }
    // balls and their trails
    var bcol = W.fireT > 0 ? '#ff7a1a' : '#bfefff';
    W.balls.forEach(function (b) {
      var tr = trails.get(b) || [];
      for (var j = tr.length - 1; j >= 1; j--) F.rect(tr[j].x - 1, tr[j].y - 1, 2, 2, bcol, (1 - j / tr.length) * 0.35, true);
      F.light(b.x + 2, b.y + 2, W.fireT > 0 ? 9 : 6, bcol, 0.55);
      F.blit(ballPic(W.fireT > 0 ? '#ff5a1a' : '#7fd8ff', k), b.x, b.y);
    });
    F.drawFx();
    // scores along the top, lives and powers along the bottom
    F.text('SCORE', 8, 4, '#8fa3d1', 1, 'left'); F.text(('00000' + Math.min(999999, W.score)).slice(-6), 43, 4, '#ffffff', 1, 'left', 0.35);
    F.text('LEVEL ' + W.level, GW / 2 + 1, 4, th[2], 1, null, 0.35);
    F.text(('00000' + Math.min(999999, info ? info.best : W.score)).slice(-6), GW - 8, 4, '#ffd84a', 1, 'right', 0.35); F.text('BEST', GW - 49, 4, '#8fa3d1', 1, 'right');
    var lb = batPic(14, '', th[2], k);
    for (var li = 0; li < Math.min(6, W.lives - (W.phase === 'lost' ? 0 : 1)); li++) F.blit(lb, L + 3 + li * 17, GH - 7, 0.85);
    var label = W.batPower ? CAPWORD[W.batPower] : '';
    if (W.fireT > 0) label = (label ? label + ' ' : '') + 'FIRE';
    if (label) F.text(label, R - 3, GH - 9, W.fireT > 0 ? '#ff9a3d' : CAPCOL[W.batPower], 1, 'right', 0.4);
    if (W.mult > 1) F.text('x' + W.mult, R - 3, BAT_Y - 12, '#ffe14a', 1, 'right', 0.5);
    F.drawLabels(GW);
    F.end();
  }

  // ---------------------------------------------------------------- sound: a run of bricks plays a rising tune
  var NOTES = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349];
  function pan(e) { return e && e.x != null ? Math.max(-0.8, Math.min(0.8, (e.x - GW / 2) / (GW / 2))) : 0; }
  function sound(name, S, e) {
    var p = pan(e), n;
    switch (name) {
      case 'bat': S.tone(196, 0.08, 0.09, { type: 'square', pan: p }); S.tone(98, 0.1, 0.07, { type: 'sine', pan: p }); break;
      case 'wall': S.tone(392, 0.035, 0.025, { type: 'square', pan: p }); break;
      case 'brick': n = NOTES[Math.min(NOTES.length - 1, Math.max(0, ((e && e.n) || 1) - 1))]; S.tone(n, 0.13, 0.05, { type: 'square', pan: p, verb: 0.2 }); S.tone(n * 2, 0.07, 0.014, { type: 'triangle', pan: p }); break;
      case 'silver': S.tone(1250, 0.09, 0.04, { type: 'square', to: 1120, pan: p }); S.noise(0.05, 0.04, 9000, { type: 'bandpass', q: 8, pan: p }); break;
      case 'steel': S.tone(170, 0.11, 0.06, { type: 'square', to: 140, pan: p }); S.noise(0.06, 0.05, 3000, { type: 'bandpass', q: 4, pan: p }); break;
      case 'launch': S.tone(440, 0.12, 0.05, { type: 'triangle', to: 880, pan: p }); break;
      case 'catch': S.tone(660, 0.08, 0.04, { type: 'triangle', to: 440, pan: p }); break;
      case 'combo': n = (e && e.n) || 2; S.tone(659 * Math.pow(1.26, n - 2), 0.12, 0.04, { type: 'square', verb: 0.3 }); S.tone(988 * Math.pow(1.26, n - 2), 0.16, 0.035, { type: 'square', when: 0.07, verb: 0.3 }); break;
      case 'capdrop': S.tone(880, 0.1, 0.03, { type: 'triangle', to: 1320, pan: p, verb: 0.3 }); break;
      case 'powerup': [523, 659, 784, 1047, 1319].forEach(function (f, k) { S.tone(f, 0.12, 0.045, { type: 'square', when: k * 0.055, verb: 0.35 }); }); break;
      case 'laser': S.tone(1900, 0.1, 0.03, { type: 'sawtooth', to: 500, pan: p }); break;
      case 'gate': S.tone(140, 0.25, 0.04, { type: 'sawtooth', to: 90, pan: p }); break;
      case 'enemy': S.noise(0.22, 0.12, 5000, { pan: p, verb: 0.25 }); S.tone(700, 0.12, 0.03, { type: 'square', to: 1400, pan: p }); break;
      case 'fireout': S.tone(700, 0.25, 0.03, { type: 'triangle', to: 260 }); break;
      case 'bosshit': S.tone(430, 0.08, 0.04, { type: 'square', to: 360, pan: p }); S.noise(0.07, 0.06, 9000, { type: 'bandpass', q: 6, pan: p }); break;
      case 'bossfire': S.tone(280, 0.28, 0.045, { type: 'sawtooth', to: 110, pan: p, verb: 0.25 }); break;
      case 'bossdie':
        S.noise(2.4, 0.34, 3000, { verb: 0.6 }); S.tone(90, 2.2, 0.2, { type: 'sine', to: 22 });
        [784, 659, 523, 392, 523, 659, 784, 1047].forEach(function (f, k) { S.tone(f, 0.14, 0.04, { type: 'square', when: 0.5 + k * 0.09, verb: 0.4 }); });
        break;
      case 'lost': S.noise(0.8, 0.22, 2800, { pan: p, verb: 0.4 }); [392, 330, 262].forEach(function (f, k) { S.tone(f, 0.22, 0.05, { type: 'triangle', when: 0.15 + k * 0.18 }); }); break;
      case 'level': [392, 523, 659, 784].forEach(function (f, k) { S.tone(f, 0.12, 0.045, { type: 'triangle', when: k * 0.09, verb: 0.35 }); }); break;
      case 'warning': for (var k2 = 0; k2 < 6; k2++) S.tone(k2 % 2 ? 494 : 392, 0.22, 0.045, { type: 'square', when: k2 * 0.24, verb: 0.3 }); break;
      case 'clear': [523, 659, 784, 1047, 1319, 1568].forEach(function (f, k) { S.tone(f, 0.15, 0.05, { type: 'square', when: k * 0.08, verb: 0.45 }); }); break;
      case 'extra': [523, 659, 784, 1047, 784, 1047].forEach(function (f, k) { S.tone(f, 0.1, 0.05, { type: 'square', when: k * 0.09, verb: 0.3 }); }); break;
      case 'over': [392, 330, 262, 196].forEach(function (f, k) { S.tone(f, 0.3, 0.06, { type: 'triangle', when: k * 0.26, verb: 0.4 }); }); break;
    }
  }

  A.start({
    id: 'batball', store: 'bb365', title: '365 Bat & Ball', width: GW, height: GH, waveWord: 'level',
    speeds: { options: [[1, 'Gentle'], [2, 'Classic'], [3, 'Fast']], def: 1 },
    settings: [{ key: 'shake', type: 'switch', label: 'Screen shake', small: 'The screen shakes when something big blows up.', def: !reducedMotion }],
    newWorld: function (speed) { return E.newWorld(speed); },
    hires: function () { return true; },
    step: E.step, hud: E.hud, draw: draw, sound: sound,
    quietSay: function () { return true; },   // the game shows its own banners and labels
    overText: function (W) { return 'Game over – level ' + W.level; },
    titleText: 'Keep the ball bouncing with your bat and clear every brick. Catch the falling capsules for a <b>wider bat</b>, <b>lasers</b>, <b>three balls</b> and more &mdash; and watch out for the Mothership on level 10.',
    keysText: '<b>Mouse</b> or <b>&larr; &rarr;</b> to move &middot; <b>Space</b> or click to launch (and fire lasers) &middot; <b>P</b> to pause',
    touchText: 'Drag on the screen to move the bat and tap to launch &mdash; or use the buttons',
    help: [
      '<b>The aim:</b> keep the ball in play with your bat and break every brick to finish the level.',
      '<b>Move</b> the bat with the mouse (the easiest), the <b>&larr; &rarr;</b> keys, or by dragging on a tablet. <b>Space</b>, a click or a tap launches the ball.',
      '<b>Where the ball lands on the bat</b> sets where it goes: near an end sends it off at an angle, the middle sends it nearly straight up.',
      '<b>Bricks:</b> coloured ones break at a touch. <b>Silver</b> takes a few hits, <b>steel</b> never breaks, and <b>gold</b> always drops a capsule.',
      '<b>Capsules</b> fall from some bricks &mdash; catch them with the bat: <b>W</b> wider bat, <b>L</b> lasers (press fire), <b>C</b> catch (the ball sticks; fire lets it go), <b>S</b> slower ball, <b>M</b> three balls, <b>F</b> fireball (straight through bricks), <b>+</b> an extra life.',
      '<b>Runs:</b> break bricks one after another before the ball comes back to the bat for double, triple and four times the points &mdash; listen for the notes climbing.',
      '<b>Little invaders</b> drift down from the hatches at the top and knock the ball about &mdash; hit them for 100 points. On <b>level 10</b> the Mothership fires at your bat: dodge, and keep hitting it.',
      '<b>Speed</b> is in Settings: <b>Gentle</b> has a slower ball, a wider bat and five lives. <b>P</b> pauses; the game also pauses itself if you click away.'
    ]
  });
})();
