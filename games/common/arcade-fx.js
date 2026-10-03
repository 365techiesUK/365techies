/* 365 Games - the arcade effects kit (3 Oct 2026, first for 365 Bat & Ball). What a game needs to draw an "enhanced"
 * picture straight onto the cabinet's screen (arcade.js, D.hires): crisp pixel art blown up to a whole number of screen
 * pixels per game pixel, soft glows made once and kept, a 5 x 7 pixel font, sparks, rings, flashes, floating labels,
 * banners and screen shake, and a watch for slow PCs that thins the extras out. Positions are in the game's own pixels.
 *
 *   var F = Arcade365FX.create();
 *   draw: F.begin(g, info, mode)  ...F.blit / F.glow / F.light / F.rect / F.text / F.emit...  F.end()
 *   F.step() once per game step (sparks move, rings grow) - F.steps(W.frame) works it out from the frame count.
 * Sprites: F.sprite(id, rows, palette) - rows of characters, '.' empty, other characters looked up in the palette. */
(function () {
  'use strict';
  var REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var FONT = {
    '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31], '3': [31, 2, 4, 2, 1, 17, 14],
    '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14], '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
    '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [28, 18, 17, 17, 17, 18, 28],
    E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31], '+': [0, 4, 4, 31, 4, 4, 0], '-': [0, 0, 0, 31, 0, 0, 0], '!': [4, 4, 4, 4, 4, 0, 4],
    'x': [0, 0, 17, 10, 4, 10, 17], ':': [0, 4, 4, 0, 4, 4, 0], '&': [12, 18, 20, 8, 21, 18, 13], ' ': [0, 0, 0, 0, 0, 0, 0]
  };
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
  function tinted(src, colour) { var c = canvas(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = colour; x.fillRect(0, 0, c.width, c.height); return c; }

  function create() {
    var G = null, S = 3, K = 0, DW = 0, DH = 0, OX = 0, OY = 0, LOW = false, MODE = 'title', SET = {};
    var SPR = {}, HALO = {}, HALON = 0, TXT = {}, TXTN = 0, DOTS = {};
    var PS = [], RINGS = [], FLASH = [], FLOAT = [], BANNER = null, SHAKE = 0, SCREEN = null, lastFrame = null;
    var lastT = 0, slow = 0;

    function setK(k) { if (k !== K) { K = k; SPR = {}; HALO = {}; HALON = 0; TXT = {}; TXTN = 0; DOTS = {}; F.onScale && F.onScale(); } }
    function sprite(id, rows, pal) {
      var c = SPR[id]; if (c) return c;
      var w = rows[0].length, h = rows.length; c = canvas(w * K, h * K); var x = c.getContext('2d');
      for (var r = 0; r < h; r++) for (var q = 0; q < w; q++) { var ch = rows[r].charAt(q); if (ch !== '.') { x.fillStyle = pal[ch] || pal.a; x.fillRect(q * K, r * K, K, K); } }
      return (SPR[id] = c);
    }
    function cached(id, make) { return SPR[id] || (SPR[id] = make(K)); }   // a picture the game paints itself at scale K
    function silhouette(id, src, colour) { var key = 'sil|' + id + '|' + colour; return SPR[key] || (SPR[key] = tinted(src, colour)); }
    function makeHalo(src, colour, blur) {
      var pad = Math.ceil(blur * 2.4), c = canvas(src.width + pad * 2, src.height + pad * 2), x = c.getContext('2d'), sil = tinted(src, colour);
      if ('filter' in x) { x.filter = 'blur(' + blur + 'px)'; x.drawImage(sil, pad, pad); x.filter = 'none'; x.globalAlpha = 0.6; x.drawImage(sil, pad, pad); }
      else { x.shadowColor = colour; x.shadowBlur = blur * 2; x.drawImage(sil, pad, pad); }
      return { cv: c, pad: pad };
    }
    function halo(key, src, colour, blur) {
      var h = HALO[key]; if (h) return h;
      if (++HALON > 500) { HALO = {}; HALON = 1; }
      return (HALO[key] = makeHalo(src, colour, blur == null ? K * 2.4 : blur));
    }
    function dot(colour) {
      var d = DOTS[colour]; if (d) return d;
      d = canvas(64, 64); var x = d.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, colour); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      return (DOTS[colour] = d);
    }
    function textCanvas(str, colour, m) {
      var key = str + '|' + colour + '|' + m, c = TXT[key]; if (c) return c;
      if (++TXTN > 400) { TXT = {}; TXTN = 1; }
      str = String(str);
      var px = K * m, w = str.length * 6 - 1;
      c = canvas(w * px, 7 * px); var x = c.getContext('2d'); x.fillStyle = colour;
      for (var i = 0; i < str.length; i++) {
        var ch = str.charAt(i), rows = FONT[ch] || FONT[ch.toUpperCase()] || FONT[' '];
        for (var r = 0; r < 7; r++) for (var q = 0; q < 5; q++) if (rows[r] & (16 >> q)) x.fillRect((i * 6 + q) * px, r * px, px, px);
      }
      return (TXT[key] = c);
    }

    // ---------------------------------------------------------------- drawing (game pixels in, screen pixels out)
    function sx(x) { return Math.round(x * S + OX); }
    function sy(y) { return Math.round(y * S + OY); }
    function blit(c, x, y, alpha) { G.imageSmoothingEnabled = false; G.globalAlpha = alpha == null ? 1 : alpha; G.drawImage(c, sx(x), sy(y)); }
    function glow(h, x, y, alpha) { if (LOW || alpha <= 0) return; G.imageSmoothingEnabled = true; G.globalCompositeOperation = 'lighter'; G.globalAlpha = Math.min(1, alpha); G.drawImage(h.cv, sx(x) - h.pad, sy(y) - h.pad); G.globalCompositeOperation = 'source-over'; }
    function rect(x, y, w, h, colour, alpha, add) {
      if (add) G.globalCompositeOperation = 'lighter';
      G.globalAlpha = alpha == null ? 1 : alpha; G.fillStyle = colour;
      G.fillRect(sx(x), sy(y), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * S)));
      if (add) G.globalCompositeOperation = 'source-over';
    }
    function light(x, y, r, colour, alpha) {
      if (alpha <= 0.01) return;
      var d = dot(colour), s = r * 2 * S;
      G.imageSmoothingEnabled = true; G.globalCompositeOperation = 'lighter'; G.globalAlpha = Math.min(1, alpha);
      G.drawImage(d, x * S + OX - s / 2, y * S + OY - s / 2, s, s); G.globalCompositeOperation = 'source-over';
    }
    function text(str, x, y, colour, m, align, glowA, alpha) {
      m = m || 1;
      var c = textCanvas(str, colour, m), w = c.width / S, lx = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
      if (glowA && !LOW) glow(halo('txt|' + str + '|' + colour + '|' + m, c, colour, K * 1.6), lx, y, glowA);
      blit(c, lx, y, alpha);
    }

    // ---------------------------------------------------------------- sparks, rings, flashes, labels, banners, shake
    function emit(x, y, n, cols, spd, life, o) {
      o = o || {};
      if (LOW) n = Math.ceil(n / 3); else if (REDUCED) n = Math.ceil(n / 2);
      var cap = LOW ? 220 : 900;
      for (var i = 0; i < n && PS.length < cap; i++) {
        var a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.cone || 0.6) : Math.random() * Math.PI * 2, v = spd * (0.25 + Math.random() * 0.85);
        PS.push({ x: x + (o.spread || 0) * (Math.random() - 0.5), y: y + (o.spreadY != null ? o.spreadY : o.spread || 0) * (Math.random() - 0.5),
          vx: Math.cos(a) * v + (o.vx || 0), vy: Math.sin(a) * v * (o.flat || 1) + (o.vy || 0),
          life: life * (0.6 + Math.random() * 0.6), max: life, col: cols[i % cols.length], size: o.size || 1, drag: o.drag || 0.94, grav: o.grav || 0, add: o.add !== false });
      }
    }
    function ring(x, y, r1, col, life, w) { RINGS.push({ x: x, y: y, r1: r1, col: col, life: life, max: life, w: w || 1 }); }
    function flash(x, y, r, col, life) { FLASH.push({ x: x, y: y, r: r, col: col, life: life, max: life }); }
    function floater(str, x, y, col, m, life, tag) {   // tag: a newer label with the same tag replaces the old one
      if (tag) FLOAT = FLOAT.filter(function (f) { return f.tag !== tag; });
      FLOAT.push({ s: str, x: x, y: y, col: col, m: m || 1, life: life || 70, max: life || 70, tag: tag });
    }
    function banner(a, b, col, life, warn) { BANNER = { a: a, b: b || '', col: col, life: life || 120, max: life || 120, warn: !!warn }; }
    function shake(a) { SHAKE = Math.max(SHAKE, a); }
    function screen(col, a, life) { SCREEN = { col: col, a: a, life: life, max: life }; }
    function reset() { PS = []; RINGS = []; FLASH = []; FLOAT = []; BANNER = null; SHAKE = 0; SCREEN = null; lastFrame = null; }
    function step() {
      var i, p;
      for (i = PS.length - 1; i >= 0; i--) { p = PS[i]; p.vx *= p.drag; p.vy = p.vy * p.drag + p.grav; p.x += p.vx; p.y += p.vy; if (--p.life <= 0) PS.splice(i, 1); }
      for (i = RINGS.length - 1; i >= 0; i--) if (--RINGS[i].life <= 0) RINGS.splice(i, 1);
      for (i = FLASH.length - 1; i >= 0; i--) if (--FLASH[i].life <= 0) FLASH.splice(i, 1);
      for (i = FLOAT.length - 1; i >= 0; i--) { p = FLOAT[i]; p.y -= 0.25; if (--p.life <= 0) FLOAT.splice(i, 1); }
      if (BANNER && --BANNER.life <= 0) BANNER = null;
      if (SCREEN && --SCREEN.life <= 0) SCREEN = null;
      SHAKE *= 0.88; if (SHAKE < 0.15) SHAKE = 0;
    }
    function steps(frame) {   // how many game steps since the last picture (0 when paused or on the title)
      if (lastFrame == null || frame < lastFrame) { lastFrame = frame; return 0; }
      var n = Math.max(0, Math.min(8, frame - lastFrame)); lastFrame = frame;
      for (var i = 0; i < n; i++) step();
      return n;
    }
    function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
    function drawFx() {
      for (var i = 0; i < PS.length; i++) {
        var p = PS[i], a = Math.max(0, p.life / p.max);
        if (p.add) G.globalCompositeOperation = 'lighter';
        G.globalAlpha = a; G.fillStyle = p.col;
        var z = Math.max(1, Math.round(p.size * S));
        G.fillRect(Math.round(p.x * S + OX - z / 2), Math.round(p.y * S + OY - z / 2), z, z);
        if (p.add) G.globalCompositeOperation = 'source-over';
      }
      G.globalCompositeOperation = 'lighter';
      RINGS.forEach(function (r) {
        var k = 1 - r.life / r.max, rad = 1 + (r.r1 - 1) * easeOut(k);
        G.globalAlpha = (1 - k) * 0.8; G.strokeStyle = r.col; G.lineWidth = Math.max(1, r.w * S * (1 - k * 0.5));
        G.beginPath(); G.arc(r.x * S + OX, r.y * S + OY, rad * S, 0, Math.PI * 2); G.stroke();
      });
      G.globalCompositeOperation = 'source-over';
      FLASH.forEach(function (f) { light(f.x, f.y, f.r * (0.6 + 0.4 * f.life / f.max), f.col, f.life / f.max); });
    }
    function drawLabels(width) {
      FLOAT.forEach(function (f) { var a = Math.min(1, f.life / f.max * 2); text(f.s, f.x, f.y, f.col, f.m, null, 0.6 * a, a); });
      var B = BANNER; if (!B) return;
      var k = 1 - B.life / B.max, a = Math.min(1, k * 6, (1 - k) * 4);
      if (B.warn && (B.life >> 3) & 1) a *= 0.35;
      var m = B.a.length <= 8 ? 3 : 2, y = 104 - (1 - Math.min(1, k * 5)) * 8;
      text(B.a, width / 2, y, B.col, m, null, 0.8 * a, a);
      if (B.b) text(B.b, width / 2, y + 7 * m + 8, '#ffffff', 1, null, 0.4 * a, a);
      if (B.warn) { rect(0, y - 8, width, 2, B.col, a * 0.6); rect(0, y + 7 * m + 20, width, 2, B.col, a * 0.6); }
    }

    function begin(g, info, mode) {
      G = g; S = info.scale; DW = info.dw; DH = info.dh; MODE = mode; SET = info.set || {};
      setK(Math.max(1, Math.round(S)));
      var t = performance.now();
      if (lastT) { var dt = t - lastT; if (dt > 26 && dt < 250 && mode === 'play') slow++; else if (slow > 0) slow -= 0.5; }
      lastT = t;
      if (slow > 120 && !LOW) { LOW = true; if (window.console) console.info('365 Games: a slower PC - fewer effects'); }
      OX = 0; OY = 0;
      if (SHAKE > 0 && SET.shake !== false && !REDUCED && mode === 'play') { OX = Math.round((Math.random() * 2 - 1) * SHAKE * S); OY = Math.round((Math.random() * 2 - 1) * SHAKE * S); }
      G.globalAlpha = 1; G.globalCompositeOperation = 'source-over'; G.imageSmoothingEnabled = false;
    }
    function end() {
      if (SCREEN) { G.globalCompositeOperation = 'lighter'; G.globalAlpha = SCREEN.a * SCREEN.life / SCREEN.max; G.fillStyle = SCREEN.col; G.fillRect(0, 0, DW, DH); G.globalCompositeOperation = 'source-over'; }
      G.globalAlpha = 1; G.globalCompositeOperation = 'source-over';
    }

    var F = {
      begin: begin, end: end, step: step, steps: steps, reset: reset,
      sprite: sprite, cached: cached, silhouette: silhouette, halo: halo, makeHalo: makeHalo, canvas: canvas,
      blit: blit, glow: glow, rect: rect, light: light, text: text, textCanvas: textCanvas,
      emit: emit, ring: ring, flash: flash, floater: floater, banner: banner, shake: shake, screen: screen,
      drawFx: drawFx, drawLabels: drawLabels, easeOut: easeOut,
      get g() { return G; }, get scale() { return S; }, get k() { return K; }, get dw() { return DW; }, get dh() { return DH; },
      get ox() { return OX; }, get oy() { return OY; }, get low() { return LOW; }, get reduced() { return REDUCED; }, get currentBanner() { return BANNER; },
      onScale: null
    };
    return F;
  }

  window.Arcade365FX = { create: create, FONT: FONT };
})();
