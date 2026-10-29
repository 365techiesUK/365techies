/* 365 Pinball Hero - the printed playfield for the 3D look (15 Oct 2026, milestone 2a; v2 the same day: high-key and
 * saturated, so it reads at a glance in a brightly lit 3D view). Painted once, at load, from the table data - nothing to
 * download, our own art only, no AI pictures:
 *  - deep space, but bright: a saturated blue-violet gradient, nebula clouds (fractal noise worked out small and scaled
 *    up smoothly), thousands of stars and a few bright ones with soft spikes;
 *  - printed colour over it, as a real playfield's art: a magenta and violet sunburst from the middle of the inserts, an
 *    energy burst behind the pop bumpers, green at the hangar's mouth;
 *  - the planet the hero defends, big and low behind the flippers: a sunrise on its rim, atmosphere, clouds, the night
 *    side's city lights and the hero's shield over it; a moon (seen through the warp ramp) and a ringed planet;
 *  - 365 Invaders' own pixel art: the Mothership printed over the loop at the top, invaders in the hangar;
 *  - the lanes as clean printed panels with bright edges (one loop lane from orbit to orbit, gold inlanes, red outlanes,
 *    the pink ramp lane), the printed bands under every wall, the walls' contact shadows and soft pools of light round
 *    the bumpers, slings and posts (blurred with shadowBlur - the canvas filter property does nothing on iPhones);
 *  - every insert in PinLamps.list printed UNLIT as tinted glass in a white printed ring, so the table reads with every
 *    lamp off; PinLamps.tags printed beside them (WARP RAMP, SPINNER, ORBIT, KICKBACK, BALL SAVE, BONUS); the apron
 *    with 365 and HERO; our name.
 * window.PinArt:
 *  - paint({ scale }) -> { color, glow, scale, ms }. color: the printed playfield, scale px per table unit (4 by default:
 *    1080 x 1784), its top left corner the table's (0, 0). glow: the parts that give off light themselves (city lights,
 *    the sunrise, the atmosphere, the brightest stars) on black, at half the scale - for an emissive map, so they still
 *    glow when the table's lights dim. Cached: a second call with the same scale costs nothing.
 *  - lampSprite(lamp, scale) -> a canvas: that insert LIT (a saturated core, white-hot centre, its own soft glow) on
 *    transparent. Lay it as a quad CENTRED on (lamp.x, lamp.y), square to the table (the insert's turn is already drawn
 *    in), canvas.qw x canvas.qh table units (= its size / scale). PinArt.quad(lamp) gives that size without painting.
 *  - plastic('slingL' | 'slingR'[, scale]) -> a canvas: that slingshot's plastic as a glowing energy shield in 365
 *    Invaders' colours (hexagons, an energy arc along the kicking face, an invader), transparent outside it; it covers
 *    the table rectangle canvas.x0, y0, qw, qh (see the function). For a colour and an emissive map.
 * Needs engine.js and lamps.js first. Plain ES5. */
(function (root) {
  'use strict';
  var E = root.PinEngine, LA = root.PinLamps;
  if (!E || !LA) throw new Error('art3d.js needs engine.js and lamps.js loaded first');
  function LAT(id) { return LA.forTable ? LA.forTable(id) : LA; }   // lamps.js's set for a table (PinLamps.list is the game's table's)
  var T = E.TABLE, TW = T.W, TH = T.H, M = T.MID, A = T.arch;
  var FONT = '"Arial Black", "Segoe UI Black", "Helvetica Neue", Helvetica, Arial, sans-serif';
  var cache = {};

  // ---------------------------------------------------------------- small helpers
  function now() { return root.performance ? performance.now() : Date.now(); }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mixc(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
  function css(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')'; }
  function mix(h1, h2, f, a) { return css(mixc(rgb(h1), rgb(h2), f), a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sstep(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function rng(seed) { var a = seed | 0; return function () { a = (Math.imul(a, 1103515245) + 12345) & 0x7fffffff; return a / 0x7fffffff; }; }
  function h2(x, y, s) { var h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function vn(x, y, s) {   // smooth value noise, 0-1
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    var a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct, s) {
    var sum = 0, amp = 0.5, norm = 0;
    for (var i = 0; i < oct; i++) { sum += amp * vn(x, y, s + i * 31); norm += amp; amp *= 0.5; x = x * 2.03 + 17.1; y = y * 2.03 - 9.7; }
    return sum / norm;
  }
  function unitT(g, S) { g.setTransform(S, 0, 0, S, 0, 0); }   // draw in table units
  // a soft shadow (or glow) of a shape without the shape: the shape is drawn far off the canvas and only its shadow lands
  var OFF = 20000;
  function softly(g, S, color, blurUnits, dx, dy, draw) {
    g.save();
    var m = g.getTransform();
    g.setTransform(m.a, m.b, m.c, m.d, m.e - OFF, m.f);   // moved off the canvas in screen pixels, whatever the drawing's own turn
    g.shadowColor = color; g.shadowBlur = blurUnits * S; g.shadowOffsetX = OFF + (dx || 0) * S; g.shadowOffsetY = (dy || 0) * S;
    draw(g);
    g.restore();
  }
  function wallSegs() {   // every printed guide: [ax, ay, bx, by, r, kind]
    var out = [];
    T.walls.forEach(function (w) { out.push([w[0], w[1], w[2], w[3], w[4], w[6]]); });
    T.slings.forEach(function (s) { out.push([s.a[0], s.a[1], s.b[0], s.b[1], 2.5, 'rubber'], [s.b[0], s.b[1], s.c[0], s.c[1], 2.5, 'rubber'], [s.a[0], s.a[1], s.c[0], s.c[1], 2.5, 'sling']); });
    return out;
  }
  function strokeSegs(g, segs, extra, filter) {
    segs.forEach(function (w) {
      if (filter && !filter(w)) return;
      g.lineWidth = 2 * w[4] + extra; g.beginPath(); g.moveTo(w[0], w[1]); g.lineTo(w[2], w[3]); g.stroke();
    });
  }
  function archPath(g, r) { g.beginPath(); g.arc(A.x, A.y, r, Math.PI, 2 * Math.PI); }

  // ---------------------------------------------------------------- shapes (in the insert's own frame: centred, pointing up)
  function shapePath(g, l) {
    var w = l.w, h = l.h;
    g.beginPath();
    if (l.shape === 'circle') g.arc(0, 0, w / 2, 0, Math.PI * 2);
    else if (l.shape === 'oval') g.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (l.shape === 'rect') {
      var r = Math.min(w, h) * 0.26, x0 = -w / 2, y0 = -h / 2;
      g.moveTo(x0 + r, y0); g.lineTo(x0 + w - r, y0); g.arcTo(x0 + w, y0, x0 + w, y0 + r, r); g.lineTo(x0 + w, y0 + h - r);
      g.arcTo(x0 + w, y0 + h, x0 + w - r, y0 + h, r); g.lineTo(x0 + r, y0 + h); g.arcTo(x0, y0 + h, x0, y0 + h - r, r);
      g.lineTo(x0, y0 + r); g.arcTo(x0, y0, x0 + r, y0, r); g.closePath();
    } else if (l.shape === 'triangle') { g.moveTo(0, -h / 2); g.lineTo(w / 2, h / 2); g.lineTo(-w / 2, h / 2); g.closePath(); }
    else if (l.shape === 'arrow') {   // a dart with a notched tail
      g.moveTo(0, -h / 2); g.lineTo(w / 2, h / 2); g.lineTo(0, h / 2 - h * 0.34); g.lineTo(-w / 2, h / 2); g.closePath();
    } else if (l.shape === 'chevron') {   // a V pointing along the insert, its arms a little over half its length thick
      var k = h * 0.58;
      g.moveTo(0, -h / 2); g.lineTo(w / 2, h / 2 - k); g.lineTo(w / 2, h / 2); g.lineTo(0, -h / 2 + k); g.lineTo(-w / 2, h / 2); g.lineTo(-w / 2, h / 2 - k); g.closePath();
    } else { g.rect(-w / 2, -h / 2, w, h); }
  }
  function glyphFont(l) { return '900 ' + (l.h * 1.08).toFixed(2) + 'px ' + FONT; }
  function insertText(g, l, color) {   // the words printed on an insert (two lines with |)
    if (!l.text || l.shape === 'text') return;
    var lines = l.text.split('|'), n = lines.length, fh = Math.min(l.h / n * 0.78, l.w * 0.5);
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 ' + fh.toFixed(2) + 'px ' + FONT;
    lines.forEach(function (s, i) {
      var y = (i - (n - 1) / 2) * fh * 1.08 + fh * 0.04, wm = g.measureText(s).width, k = Math.min(1, (l.w * 0.84) / (wm || 1));
      g.save(); g.translate(0, y); g.scale(k, 1); g.fillText(s, 0, 0); g.restore();
    });
  }
  function glyph(g, l, fill, stroke, lw) {
    g.font = glyphFont(l); g.textAlign = 'center'; g.textBaseline = 'middle';
    var wm = g.measureText(l.text).width, k = Math.min(1, l.w / (wm || 1));
    g.save(); g.scale(k, 1);
    if (fill) { g.fillStyle = fill; g.fillText(l.text, 0, l.h * 0.04); }
    if (stroke) { g.lineWidth = lw / k; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(l.text, 0, l.h * 0.04); }
    g.restore();
  }

  // ---------------------------------------------------------------- an insert, unlit: tinted glass in a printed ring
  // (clearly coloured, so the table reads with every lamp off, but well short of lit)
  function insertUnlit(g, l) {
    var c = rgb(l.color), big = Math.max(l.w, l.h), NAVY = [10, 8, 40];
    g.save(); g.translate(l.x, l.y); g.rotate(l.rot || 0);
    if (l.shape === 'text') {
      glyph(g, l, null, 'rgba(255,255,255,0.55)', 1.2);
      glyph(g, l, null, 'rgba(0,0,0,0.9)', 0.7);
      var gr0 = g.createLinearGradient(0, -l.h / 2, 0, l.h / 2);
      gr0.addColorStop(0, css(mixc(c, [0, 0, 0], 0.38))); gr0.addColorStop(1, css(mixc(c, NAVY, 0.68)));
      glyph(g, l, gr0, css(mixc(c, [255, 255, 255], 0.35), 0.9), 0.25);
      g.restore(); return;
    }
    g.lineJoin = 'round';
    // the printed ring: white, then a black hairline against the glass
    shapePath(g, l); g.lineWidth = 1.9; g.strokeStyle = 'rgba(255,255,255,0.62)'; g.stroke();
    g.lineWidth = 0.9; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.stroke();
    var gr = g.createRadialGradient(-big * 0.12, -big * 0.15, 0, 0, 0, big * 0.62);
    gr.addColorStop(0, css(mixc(c, [0, 0, 0], 0.22))); gr.addColorStop(0.6, css(mixc(c, [0, 0, 0], 0.45))); gr.addColorStop(1, css(mixc(c, NAVY, 0.68)));
    g.fillStyle = gr; g.fill();
    // a reflection across the top of the glass
    g.save(); g.clip();
    var gl = g.createLinearGradient(-big * 0.4, -big * 0.5, big * 0.15, big * 0.1);
    gl.addColorStop(0, 'rgba(255,255,255,0.32)'); gl.addColorStop(0.45, 'rgba(255,255,255,0.08)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.fillRect(-big, -big, big * 2, big * 2);
    insertText(g, l, 'rgba(255,255,255,0.88)');
    g.restore();
    shapePath(g, l); g.lineWidth = 0.35; g.strokeStyle = css(mixc(c, [255, 255, 255], 0.55), 0.9); g.stroke();
    g.restore();
  }
  // a printed label beside an insert (PinLamps.tags): bold capitals with a dark edge, so they read on bright art
  function paintTags(g, S) {
    unitT(g, S);
    (LAT('orbit').tags || []).forEach(function (t) {
      g.save(); g.translate(t.x, t.y); g.rotate(t.rot || 0);
      g.font = '900 ' + t.size + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
      var wm = g.measureText(t.text).width, max = t.text.length * t.size * 0.78, k = Math.min(1, max / (wm || 1));
      g.scale(k, 1);
      g.lineJoin = 'round'; g.lineWidth = t.size * 0.32 / k; g.strokeStyle = 'rgba(6,4,24,0.9)'; g.strokeText(t.text, 0, t.size * 0.04);
      g.fillStyle = t.color || '#ffffff'; g.fillText(t.text, 0, t.size * 0.04);
      g.restore();
    });
  }

  // ---------------------------------------------------------------- an insert, lit (for the renderer's quads)
  function quad(l) {
    var big = Math.max(l.w, l.h), glow = clamp(big * 0.42, 3, 8.5), pad = glow * 1.45, r = l.rot || 0;
    var cw = Math.abs(l.w * Math.cos(r)) + Math.abs(l.h * Math.sin(r)), ch = Math.abs(l.w * Math.sin(r)) + Math.abs(l.h * Math.cos(r));
    return { w: cw + pad * 2, h: ch + pad * 2, glow: glow, pad: pad };
  }
  function lampSprite(l, scale) {
    scale = scale || 4;
    var q = quad(l), c = canvas(Math.ceil(q.w * scale), Math.ceil(q.h * scale)), g = c.getContext('2d'), col = rgb(l.color);
    var hot = mixc(col, [255, 255, 255], 0.55), big = Math.max(l.w, l.h);
    g.setTransform(scale, 0, 0, scale, c.width / 2, c.height / 2); g.rotate(l.rot || 0);
    var body = function (fill) { if (l.shape === 'text') glyph(g, l, fill, null); else { shapePath(g, l); g.fillStyle = fill; g.fill(); } };
    // the halo: the shape's own glow, twice (wide and soft, then close and strong)
    g.save(); g.shadowColor = css(col, 0.9); g.shadowBlur = q.glow * 1.5 * scale; body(css(col)); g.restore();
    g.save(); g.shadowColor = css(mixc(col, [255, 255, 255], 0.25), 1); g.shadowBlur = q.glow * 0.55 * scale; body(css(col)); g.restore();
    // the lit glass: white-hot in the middle, saturated to the edge
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, big * 0.6);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.28, css(hot)); gr.addColorStop(0.75, css(col)); gr.addColorStop(1, css(mixc(col, [0, 0, 0], 0.12)));
    if (l.shape === 'text') { glyph(g, l, gr, css(mixc(col, [255, 255, 255], 0.7)), 0.3); }
    else {
      body(gr);
      g.save(); shapePath(g, l); g.clip(); insertText(g, l, css(mixc(col, [0, 0, 0], 0.78), 0.9)); g.restore();
      g.lineJoin = 'round'; shapePath(g, l); g.lineWidth = 0.4; g.strokeStyle = css(mixc(col, [255, 255, 255], 0.75)); g.stroke();
    }
    c.qw = c.width / scale; c.qh = c.height / scale;   // its size in table units
    c.cx = c.width / 2; c.cy = c.height / 2; c.rotated = true;   // centred on the lamp; the insert's turn is already drawn in
    return c;
  }

  // ---------------------------------------------------------------- the painting
  function paint(opts) {
    opts = opts || {};
    if (opts.table && opts.table !== 'orbit') return opts.table === 'ember' ? paintEmber(opts.scale || 4) : null;
    var S = opts.scale || 4, key = String(S);
    if (cache[key]) return cache[key];
    var ms = {}, t0 = now();
    var C = canvas(TW * S, TH * S), g = C.getContext('2d');
    var GS = S / 2, GC = canvas(TW * GS, TH * GS), gg = GC.getContext('2d');
    gg.fillStyle = '#000'; gg.fillRect(0, 0, GC.width, GC.height);
    ms.setup = Math.round((now() - t0) * 10) / 10;
    function step(name, fn) { var c0 = now(); g.save(); gg.save(); fn(); g.restore(); gg.restore(); ms[name] = Math.round((now() - c0) * 10) / 10; }
    var P = { cx: M, cy: 600, R: 285 };   // the planet
    var SUN = (function () { var x = 0.1, y = -0.6, z = -0.78, l = Math.sqrt(x * x + y * y + z * z); return [x / l, y / l, z / l]; })();
    var sunrise = (function () { var l = Math.sqrt(SUN[0] * SUN[0] + SUN[1] * SUN[1]); return { x: P.cx + P.R * SUN[0] / l, y: P.cy + P.R * SUN[1] / l }; })();

    step('space', function () { paintSpace(g, S); });
    step('nebula', function () { paintNebula(g, S); });
    step('zones', function () { paintZones(g, S); });
    step('stars', function () { paintStars(g, gg, S, GS); });
    step('moons', function () { paintMoon(g, S); paintRinged(g, S); });
    step('planet', function () { paintPlanet(g, gg, S, GS, P, SUN, sunrise); });
    step('lanes', function () { paintLanes(g, S); });
    step('mothership', function () { paintMothership(g, S); });
    step('hangar', function () { paintHangar(g, S); });
    step('light', function () { paintLight(g, S); });
    step('guides', function () { paintGuides(g, S); });
    step('words', function () { paintWords(g, S); });
    step('inserts', function () { unitT(g, S); LAT('orbit').list.forEach(function (l) { insertUnlit(g, l); }); });
    step('tags', function () { paintTags(g, S); });
    step('apron', function () { paintApron(g, S); });
    step('edge', function () { paintEdge(g, S); });
    var out = { color: C, glow: GC, scale: S, ms: ms, total: Math.round((now() - t0) * 10) / 10, table: 'orbit' };
    cache[key] = out;
    return out;
  }

  // ---- deep space: the gradient the nebula and the stars sit on
  function paintSpace(g, S) {
    unitT(g, S);
    var gr = g.createLinearGradient(0, 0, 0, TH);
    gr.addColorStop(0, '#22106a'); gr.addColorStop(0.3, '#2a1a8c'); gr.addColorStop(0.55, '#1d3aa8'); gr.addColorStop(0.78, '#1a4cb4'); gr.addColorStop(1, '#122f7a');
    g.fillStyle = gr; g.fillRect(0, 0, TW, TH);
    var v = g.createRadialGradient(M, 210, 90, M, 230, 320);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(8,0,30,0.28)');
    g.fillStyle = v; g.fillRect(0, 0, TW, TH);
  }

  // ---- the nebula: worked out at 1 pixel per 2 units (coarse clouds) and 1 per unit (wisps), scaled up smoothly
  function band(x, y) {   // the bright band of the galaxy, across the table from upper left to lower right
    var ax = 0, ay = 70, bx = TW, by = 330, dx = bx - ax, dy = by - ay, l = Math.sqrt(dx * dx + dy * dy);
    var d = ((x - ax) * dy - (y - ay) * dx) / l;
    return Math.exp(-(d * d) / (2 * 62 * 62));
  }
  function paintNebula(g, S) {
    var k = 2, w = Math.ceil(TW / k), h = Math.ceil(TH / k), c = canvas(w, h), cg = c.getContext('2d'), id = cg.createImageData(w, h), p = id.data;
    var dens = new Float32Array(w * h);
    var MAG = [230, 30, 190], VIO = [110, 40, 255], TEAL = [0, 170, 235], ROSE = [255, 70, 150];
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var x = (i + 0.5) * k, y = (j + 0.5) * k;
      var qx = fbm(x * 0.011, y * 0.011, 4, 11), qy = fbm(x * 0.011 + 5.2, y * 0.011 + 1.3, 4, 12);
      var d = fbm(x * 0.0085 + 2.4 * qx, y * 0.0085 + 2.4 * qy, 5, 13);
      var b = band(x, y), dn = sstep(0.36, 0.72, d) * (0.38 + 0.62 * b);
      var dust = sstep(0.52, 0.7, fbm(x * 0.026 + 3, y * 0.026 + 8, 4, 14));
      dn *= 1 - 0.55 * dust;
      var hue = fbm(x * 0.006 + 9, y * 0.006 + 3, 3, 15), col;
      col = hue < 0.5 ? mixc(TEAL, VIO, sstep(0.36, 0.5, hue)) : mixc(VIO, MAG, sstep(0.5, 0.64, hue));
      col = mixc(col, ROSE, sstep(0.7, 0.95, d) * 0.5);
      var e = dn * 1.65, o = (j * w + i) * 4;
      dens[j * w + i] = dn;
      p[o] = Math.min(255, col[0] * e); p[o + 1] = Math.min(255, col[1] * e); p[o + 2] = Math.min(255, col[2] * e); p[o + 3] = 255;
    }
    cg.putImageData(id, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.globalCompositeOperation = 'lighter';
    g.drawImage(c, 0, 0, w, h, 0, 0, w * k * S, h * k * S);
    // the wisps: finer noise, only where the clouds are
    var w2 = TW, h2_ = TH, c2 = canvas(w2, h2_), cg2 = c2.getContext('2d'), id2 = cg2.createImageData(w2, h2_), p2 = id2.data;
    for (var y2 = 0; y2 < h2_; y2++) for (var x2 = 0; x2 < w2; x2++) {
      var dd = dens[Math.min(h - 1, (y2 / k) | 0) * w + Math.min(w - 1, (x2 / k) | 0)];
      var o2 = (y2 * w2 + x2) * 4;
      if (dd < 0.04) { p2[o2 + 3] = 255; continue; }
      var f = fbm(x2 * 0.06, y2 * 0.06, 4, 21), ww = sstep(0.5, 0.78, f) * dd;
      p2[o2] = 170 * ww; p2[o2 + 1] = 90 * ww; p2[o2 + 2] = 255 * ww; p2[o2 + 3] = 255;
    }
    cg2.putImageData(id2, 0, 0);
    g.globalAlpha = 0.45;
    g.drawImage(c2, 0, 0, w2 * S, h2_ * S);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  // ---- printed colour: big saturated shapes under everything, as a real playfield's art (the space shows through)
  function paintZones(g, S) {
    unitT(g, S);
    g.save();
    g.beginPath(); g.moveTo(6, TH); g.lineTo(6, A.y); g.arc(A.x, A.y, A.R, Math.PI, 2 * Math.PI); g.lineTo(266, TH); g.closePath(); g.clip();
    var B = T.bumpers, bx = (B[0][0] + B[1][0] + B[2][0]) / 3, by = (B[0][1] + B[1][1] + B[2][1]) / 3;
    function disc(x, y, r0, r1, stops) {
      var z = g.createRadialGradient(x, y, r0, x, y, r1);
      stops.forEach(function (st) { z.addColorStop(st[0], st[1]); });
      g.fillStyle = z; g.fillRect(x - r1, y - r1, r1 * 2, r1 * 2);
    }
    // a sunburst from the middle of the inserts: magenta and violet rays, alternately, fading out
    var LO = LAT('orbit'), ra = LO.list[LO.byId.ramp], cx = ra.x, cy = ra.y + 30, n = 40;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, rg = g.createRadialGradient(cx, cy, 4, cx, cy, 160);
      if (i & 1) { rg.addColorStop(0, 'rgba(255,40,170,0.42)'); rg.addColorStop(0.55, 'rgba(255,40,170,0.16)'); rg.addColorStop(1, 'rgba(255,40,170,0)'); }
      else { rg.addColorStop(0, 'rgba(70,20,200,0.34)'); rg.addColorStop(0.55, 'rgba(70,20,200,0.12)'); rg.addColorStop(1, 'rgba(70,20,200,0)'); }
      g.fillStyle = rg; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 160, a0, a1 + 0.002); g.closePath(); g.fill();
    }
    // an energy burst behind the pop bumpers: magenta into violet
    disc(bx, by, 6, 80, [[0, 'rgba(255,40,190,0.6)'], [0.5, 'rgba(140,30,255,0.38)'], [1, 'rgba(140,30,255,0)']]);
    // green round the hangar's mouth, cyan up the right of the table
    disc(70, 208, 4, 50, [[0, 'rgba(30,230,110,0.42)'], [1, 'rgba(30,230,110,0)']]);
    disc(200, 225, 4, 55, [[0, 'rgba(0,200,255,0.3)'], [1, 'rgba(0,200,255,0)']]);
    // and a little light added at the hearts (the bright, high-key bits)
    g.globalCompositeOperation = 'lighter';
    disc(cx, cy, 0, 46, [[0, 'rgba(255,200,90,0.42)'], [0.5, 'rgba(255,120,80,0.14)'], [1, 'rgba(255,90,90,0)']]);
    disc(bx, by, 0, 40, [[0, 'rgba(255,120,230,0.3)'], [1, 'rgba(255,120,230,0)']]);
    g.restore();
  }

  // ---- stars: thousands of small ones (more along the galaxy's band), some with a glow, a few with spikes
  function paintStars(g, gg, S, GS) {
    var r = rng(365), COLS = [[255, 255, 255], [214, 226, 255], [170, 196, 255], [255, 236, 200], [255, 208, 240], [190, 255, 250]];
    g.setTransform(1, 0, 0, 1, 0, 0);
    var n = 0, tries = 0;
    while (n < 3400 && tries < 20000) {
      tries++;
      var x = r() * TW, y = r() * TH, b = band(x, y);
      if (r() > 0.3 + 0.7 * b) continue;
      n++;
      var m = Math.pow(r(), 3.2), sz = m > 0.5 ? 0.62 : m > 0.15 ? 0.42 : 0.28, c = COLS[(r() * COLS.length) | 0], a = 0.3 + 0.7 * Math.min(1, m * 1.6 + r() * 0.4);
      g.fillStyle = css(c, a);
      var s = Math.max(1, sz * S);
      g.fillRect(x * S - s / 2, y * S - s / 2, s, s);
    }
    unitT(g, S);
    // medium stars with a soft glow
    for (var i = 0; i < 70; i++) {
      var x1 = r() * TW, y1 = r() * 330, c1 = COLS[(r() * COLS.length) | 0], rad = 1.6 + r() * 2.2;
      var gr = g.createRadialGradient(x1, y1, 0, x1, y1, rad);
      gr.addColorStop(0, css(c1, 0.95)); gr.addColorStop(0.18, css(c1, 0.5)); gr.addColorStop(1, css(c1, 0));
      g.fillStyle = gr; g.fillRect(x1 - rad, y1 - rad, rad * 2, rad * 2);
    }
    // a few bright ones with diffraction spikes (into the glow map too)
    var BR = [[226, 34], [26, 40], [205, 250], [60, 300], [250, 120], [110, 108], [160, 196], [40, 228], [236, 330], [140, 44]];
    [g, gg].forEach(function (ctx, which) {
      var k = which ? GS : S, rr = rng(99);
      unitT(ctx, k);
      ctx.globalCompositeOperation = 'lighter';
      BR.forEach(function (p) {
        var c2 = COLS[(rr() * 3) | 0], L = 7 + rr() * 9, big = 0.8 + rr() * 0.6;
        var gl = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 7 * big);
        gl.addColorStop(0, css(c2, 0.9)); gl.addColorStop(0.12, css(c2, 0.45)); gl.addColorStop(0.4, css(c2, 0.1)); gl.addColorStop(1, css(c2, 0));
        ctx.fillStyle = gl; ctx.fillRect(p[0] - 8 * big, p[1] - 8 * big, 16 * big, 16 * big);
        [[1, 0], [0, 1]].forEach(function (d, q) {
          var len = q ? L : L * 1.25, sg = ctx.createLinearGradient(p[0] - d[0] * len, p[1] - d[1] * len, p[0] + d[0] * len, p[1] + d[1] * len);
          sg.addColorStop(0, css(c2, 0)); sg.addColorStop(0.5, css(c2, 0.85)); sg.addColorStop(1, css(c2, 0));
          ctx.fillStyle = sg;
          if (d[0]) ctx.fillRect(p[0] - len, p[1] - 0.22, len * 2, 0.44); else ctx.fillRect(p[0] - 0.22, p[1] - len, 0.44, len * 2);
        });
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p[0], p[1], 0.55 * big, 0, Math.PI * 2); ctx.fill();
      });
    });
  }

  // ---- 365 Invaders' pixel art (enhanced.js's shaded invaders and the Mothership): a body, b light, c shadow, e lights
  function mirror(half) { return half.map(function (r) { return r + r.split('').reverse().join(''); }); }
  var PIX = {
    orb: ['....bbbb....', '..bbaaaabb..', '.aaeeaaeeaa.', '.aaaaaaaaaa.', '..caaaaaac..', '...c....c...', '..c..cc..c..', '.c........c.'],
    moth: ['bb........bb', '.ab..bb..ba.', '..aaaaaaaa..', '.ac.eaae.ca.', 'aaaaaaaaaaaa', 'c..aaaaaa..c', '...c....c...', '..c......c..'],
    bot: ['..b......b..', '...bbbbbb...', '..a.eaae.a..', '..aaaaaaaa..', 'c.ac.aa.ca.c', 'c..aaaaaa..c', '...c....c...', '..cc....cc..'],
    ship: ['......e......', '.....beb.....', '.....aaa.....', '..c.baaab.c..', '.caaaaaaaaac.', 'aaaaaaaaaaaaa', 'abaaaaaaaaaba', 'cc.cc...cc.cc'],
    boss: mirror([
      '......................bb', '...................bbbaa', '................bbbaaaaa', '..............bbaaaaaaaa',
      '............baaaaaaaaaaa', '..........baaaaaccaaaaee', '........baaaaaaccaaaaeee', '......baaaaaaaaaaaaaeeee',
      '....bbaaaaaaaaaaaaaaaeee', '..bbaaalaaaalaaaalaaaaaa', 'bbaaaaaaaaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaaaaaaaaaa',
      'caaaaaaaaaaaaaaaaaaaaaaa', '.ccaaaaaaaaaaaaaaaaaaaaa', '...cccaaaaaaaaaaaaaaaaaa', '......cccaaacccaaacccaaa',
      '........c..c...c...c..cc', '.......c..c....c....c.c.', '......c...c.........c..c', '......................c.'
    ])
  };
  var PAL = {
    orb: { a: '#ff4fc8', b: '#ffc2f0', c: '#a3247f', e: '#fff7b0' }, moth: { a: '#36d6ff', b: '#c4f6ff', c: '#1677a8', e: '#ff4a6e' },
    bot: { a: '#ffc23a', b: '#fff1b8', c: '#b86d0c', e: '#ff3b3b' }, ship: { a: '#45f08a', b: '#d7ffe6', c: '#178a48', e: '#6ae8ff' },
    boss: { a: '#7b4dff', b: '#d2c2ff', c: '#3a1f8f', e: '#ff3fd2', l: '#ffe14a' }
  };
  function pixelArt(g, rows, pal, x0, y0, k, alpha, gap) {   // each pixel a k-unit tile (with a hairline gap, like a print)
    gap = gap == null ? k * 0.12 : gap;
    for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].length; c++) {
      var ch = rows[r].charAt(c);
      if (ch === '.' || !pal[ch]) continue;
      g.fillStyle = pal[ch]; g.globalAlpha = alpha;
      g.fillRect(x0 + c * k + gap / 2, y0 + r * k + gap / 2, k - gap, k - gap);
    }
    g.globalAlpha = 1;
  }

  // ---- the Mothership, a faint print high under the arch (it lives in the sky beyond the table; this is its shadow)
  function paintMothership(g, S) {
    unitT(g, S);
    var rows = PIX.boss, k = 2.15, w = rows[0].length * k, h = rows.length * k, x0 = A.x - w / 2 - 8, y0 = 13;
    softly(g, S, 'rgba(140,90,255,0.4)', 9, 0, 0, function (c) { pixelArt(c, rows, { a: '#7b4dff', b: '#7b4dff', c: '#7b4dff', e: '#7b4dff', l: '#7b4dff' }, x0, y0, k, 1, 0); });
    pixelArt(g, rows, PAL.boss, x0, y0, k, 0.3, k * 0.3);
    g.globalCompositeOperation = 'lighter';
    pixelArt(g, rows, { e: '#ff3fd2', l: '#ffe14a' }, x0, y0, k, 0.6);
    g.globalCompositeOperation = 'source-over';
  }

  // ---- a cratered moon (seen through the clear warp ramp) and a ringed planet; the sun is behind the big planet, up and right
  function paintMoon(g, S) {
    unitT(g, S);
    var x = 64, y = 104, r = 12.5;
    softly(g, S, 'rgba(160,190,255,0.45)', 6, 0, 0, function (c) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); });
    var gr = g.createRadialGradient(x + 4, y - 5, 1, x, y, r * 1.05);
    gr.addColorStop(0, '#e9eef8'); gr.addColorStop(0.5, '#9aa3b8'); gr.addColorStop(0.85, '#3d4258'); gr.addColorStop(1, '#1c1f30');
    g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = gr; g.fill(); g.clip();
    var rr = rng(7);
    for (var i = 0; i < 16; i++) {
      var a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * r * 0.9, cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d, cr = 0.7 + rr() * 2.4;
      g.beginPath(); g.arc(cx, cy, cr, 0, Math.PI * 2); g.fillStyle = 'rgba(30,34,52,0.35)'; g.fill();
      g.beginPath(); g.arc(cx + cr * 0.25, cy + cr * 0.3, cr * 0.8, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fill();
    }
    // the night side
    var sh = g.createLinearGradient(x + 6, y - 8, x - 10, y + 10);
    sh.addColorStop(0, 'rgba(5,6,20,0)'); sh.addColorStop(0.55, 'rgba(5,6,20,0.25)'); sh.addColorStop(1, 'rgba(5,6,20,0.85)');
    g.fillStyle = sh; g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
    g.beginPath(); g.arc(x, y, r, -Math.PI * 0.75, Math.PI * 0.1); g.lineWidth = 0.5; g.strokeStyle = 'rgba(230,240,255,0.7)'; g.stroke();
  }
  function paintRinged(g, S) {
    unitT(g, S);
    var x = 177, y = 214, r = 12, tilt = -0.32;
    function ring(front) {
      g.save(); g.translate(x, y); g.rotate(tilt);
      g.beginPath();
      if (front) g.ellipse(0, 0, 28, 6.5, 0, 0, Math.PI); else g.ellipse(0, 0, 28, 6.5, 0, Math.PI, Math.PI * 2);
      g.lineWidth = 3.2; g.strokeStyle = 'rgba(255,196,140,0.55)'; g.stroke();
      g.lineWidth = 1.1; g.strokeStyle = 'rgba(255,236,210,0.8)'; g.stroke();
      g.beginPath();
      if (front) g.ellipse(0, 0, 22.5, 5.1, 0, 0, Math.PI); else g.ellipse(0, 0, 22.5, 5.1, 0, Math.PI, Math.PI * 2);
      g.lineWidth = 1.4; g.strokeStyle = 'rgba(255,160,110,0.45)'; g.stroke();
      g.restore();
    }
    softly(g, S, 'rgba(255,150,90,0.5)', 7, 0, 0, function (c) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); });
    ring(false);
    g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
    var gr = g.createRadialGradient(x + 4, y - 5, 1, x, y, r * 1.1);
    gr.addColorStop(0, '#ffe2b8'); gr.addColorStop(0.5, '#e98a4f'); gr.addColorStop(0.85, '#7a2f3a'); gr.addColorStop(1, '#2a0e22');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    g.translate(x, y); g.rotate(tilt);
    for (var i = -5; i <= 5; i++) { g.fillStyle = i % 2 ? 'rgba(120,40,40,0.18)' : 'rgba(255,230,190,0.12)'; g.fillRect(-r, i * 2.3 - 1, r * 2, 1.6 + (i & 1) * 0.6); }
    g.setTransform(S, 0, 0, S, 0, 0);
    var sh = g.createLinearGradient(x + 6, y - 9, x - 10, y + 9);
    sh.addColorStop(0, 'rgba(10,4,20,0)'); sh.addColorStop(0.6, 'rgba(10,4,20,0.35)'); sh.addColorStop(1, 'rgba(10,4,20,0.9)');
    g.fillStyle = sh; g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
    ring(true);
  }

  // ---- the planet: worked out per pixel at half the scale (a lit rim, oceans, land, clouds; the night side dark), then
  // city lights, the atmosphere, the sunrise and the hero's shield on top
  function landAt(nx, ny, nz, x, y) {   // the same land for the picture and the city lights (a continent under our name)
    var lon = Math.atan2(nx, nz), lat = Math.asin(clamp(ny, -1, 1)), dx = (x - M) / 70, dy = (y - 402) / 26;
    return fbm(lon * 2.6 + 4, lat * 3.4 + 2, 4, 31) + 0.1 * Math.exp(-dx * dx - dy * dy);
  }
  function paintPlanet(g, gg, S, GS, P, SUN, sunrise) {
    var top = Math.floor(P.cy - P.R) - 1, k = 2, w = TW * k, h = (TH - top) * k;
    var c = canvas(w, h), cg = c.getContext('2d'), id = cg.createImageData(w, h), p = id.data;
    var OCEAN0 = [6, 28, 70], OCEAN1 = [26, 112, 186], LAND0 = [34, 92, 70], LAND1 = [178, 160, 98], NIGHT = [12, 20, 62], TWI = [255, 96, 120], NIGHT2 = [26, 40, 96], CLOUD = [235, 242, 255], ATM = [70, 170, 255];
    // the land, desert and cloud noise on a coarser grid (1 per unit; they are soft anyway), read back smoothly below
    var w1 = TW + 2, h1 = TH - top + 2, LF = new Float32Array(w1 * h1), DF = new Float32Array(w1 * h1), CF = new Float32Array(w1 * h1);
    for (var j1 = 0; j1 < h1; j1++) for (var i1 = 0; i1 < w1; i1++) {
      var x1 = i1, y1 = top + j1, ax = (x1 - P.cx) / P.R, ay = (y1 - P.cy) / P.R, az = Math.sqrt(Math.max(1e-4, 1 - ax * ax - ay * ay));
      var ld = landAt(ax, ay, az, x1, y1), lo = Math.atan2(ax, az), la = Math.asin(clamp(ay, -1, 1)), n1 = j1 * w1 + i1;
      LF[n1] = ld; DF[n1] = fbm(ax * 9, ay * 9, 2, 41); CF[n1] = fbm(lo * 5 + 2.2 * ld, la * 9, 4, 51);
    }
    function at(F, x, y) {
      var fx = clamp(x, 0, w1 - 1.001), fy = clamp(y - top, 0, h1 - 1.001), xi = fx | 0, yi = fy | 0, u = fx - xi, v = fy - yi, n = yi * w1 + xi;
      return F[n] + (F[n + 1] - F[n]) * u + (F[n + w1] - F[n]) * v + (F[n] - F[n + 1] - F[n + w1] + F[n + w1 + 1]) * u * v;
    }
    for (var j = 0; j < h; j++) {
      var y = top + (j + 0.5) / k, ny = (y - P.cy) / P.R;
      for (var i = 0; i < w; i++) {
        var x = (i + 0.5) / k, nx = (x - P.cx) / P.R, q = 1 - nx * nx - ny * ny, o = (j * w + i) * 4;
        if (q <= 0) { p[o + 3] = 0; continue; }
        var nz = Math.sqrt(q), dif = nx * SUN[0] + ny * SUN[1] + nz * SUN[2];
        var land = at(LF, x, y), isLand = sstep(0.5, 0.54, land), desert = sstep(0.55, 0.7, at(DF, x, y));
        var cloud = sstep(0.52, 0.72, at(CF, x, y)), day = sstep(-0.04, 0.3, dif), lightK = 0.18 + 1.05 * sstep(-0.05, 0.6, dif);
        // (worked out channel by channel - no little arrays in a loop this size)
        var lo = 0.35 + 0.65 * day, li = isLand * 0.9, cl = cloud * 0.85, nk = isLand * 0.35 + cloud * 0.3;
        var tt = (dif + 0.01) / 0.045, tw = Math.exp(-tt * tt) * 0.22 * (1 - cloud * 0.5);   // the twilight band
        var atm = Math.pow(1 - nz, 2.2) * (0.25 + 0.9 * sstep(-0.25, 0.4, dif));            // the atmosphere, thicker to the rim
        for (var ch = 0; ch < 3; ch++) {
          var oc = OCEAN0[ch] + (OCEAN1[ch] - OCEAN0[ch]) * lo, ld = LAND0[ch] + (LAND1[ch] - LAND0[ch]) * desert;
          var sf = oc + (ld - oc) * li; sf += (CLOUD[ch] - sf) * cl;
          var nt = NIGHT[ch] + (NIGHT2[ch] - NIGHT[ch]) * nk, v = nt + (sf * lightK - nt) * day;
          v += (TWI[ch] - v) * tw;
          p[o + ch] = Math.min(255, v + ATM[ch] * atm);
        }
        p[o + 3] = Math.round(255 * clamp((P.R - Math.sqrt(nx * nx + ny * ny) * P.R) * k + 0.5, 0, 1));   // a smooth edge
      }
    }
    cg.putImageData(id, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    // the outer atmosphere and the shield, behind the disc
    unitT(g, S);
    g.globalCompositeOperation = 'lighter';
    var halo = g.createRadialGradient(P.cx, P.cy, P.R - 4, P.cx, P.cy, P.R + 26);
    halo.addColorStop(0, 'rgba(90,190,255,0.75)'); halo.addColorStop(0.18, 'rgba(70,150,255,0.38)'); halo.addColorStop(0.5, 'rgba(60,90,255,0.1)'); halo.addColorStop(1, 'rgba(60,60,255,0)');
    g.fillStyle = halo; g.fillRect(0, top - 30, TW, TH - top + 30);
    paintShield(g, S, P);
    g.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(c, 0, top * S, w / k * S, h / k * S);
    // city lights on the night side's land, in clusters along coasts
    var rr = rng(2026), lightsOn = [g, gg];
    lightsOn.forEach(function (ctx, which) { unitT(ctx, which ? GS : S); ctx.globalCompositeOperation = 'lighter'; });
    var CL = [[255, 214, 120], [255, 176, 80], [255, 240, 200], [255, 150, 90]];
    for (var n = 0; n < 16000; n++) {
      var x = rr() * TW, y = top + 6 + rr() * (TH - top - 6), nx = (x - P.cx) / P.R, ny = (y - P.cy) / P.R, q = 1 - nx * nx - ny * ny;
      if (q <= 0.02) continue;
      var nz = Math.sqrt(q), dif = nx * SUN[0] + ny * SUN[1] + nz * SUN[2];
      if (dif > 0.02) continue;
      var land = landAt(nx, ny, nz, x, y);
      if (land < 0.45) continue;
      var coast = 1 - sstep(0.47, 0.6, land), city = fbm(x * 0.35, y * 0.35, 3, 61);
      if (city < 0.47 - coast * 0.14) continue;
      var dark = sstep(0.0, -0.1, dif), a = (0.45 + 0.55 * rr()) * dark, s = rr() < 0.12 ? 0.8 : 0.5, cc = CL[(rr() * CL.length) | 0];
      lightsOn.forEach(function (ctx) {
        ctx.fillStyle = css(cc, a); ctx.fillRect(x - s / 2, y - s / 2, s, s);
        if (s > 0.6) { var gl = ctx.createRadialGradient(x, y, 0, x, y, 2.6); gl.addColorStop(0, css(cc, a * 0.5)); gl.addColorStop(1, css(cc, 0)); ctx.fillStyle = gl; ctx.fillRect(x - 3, y - 3, 6, 6); }
      });
    }
    // the rim's light, and the sun coming up over it (into the glow map too)
    lightsOn.forEach(function (ctx, which) {
      unitT(ctx, which ? GS : S);
      ctx.globalCompositeOperation = 'lighter';
      ctx.save();
      ctx.beginPath(); ctx.arc(P.cx, P.cy, P.R - 0.6, Math.PI * 1.08, Math.PI * 1.92);
      ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(140,220,255,0.75)'; ctx.shadowColor = 'rgba(80,180,255,1)'; ctx.shadowBlur = 6 * (which ? GS : S); ctx.stroke();
      ctx.restore();
      var sx = sunrise.x, sy = sunrise.y;
      var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 46);
      sg.addColorStop(0, 'rgba(255,250,235,1)'); sg.addColorStop(0.06, 'rgba(255,226,170,0.9)'); sg.addColorStop(0.2, 'rgba(255,160,90,0.35)'); sg.addColorStop(0.55, 'rgba(255,90,90,0.08)'); sg.addColorStop(1, 'rgba(255,60,60,0)');
      ctx.fillStyle = sg; ctx.fillRect(sx - 46, sy - 46, 92, 92);
      // a long flare along the rim
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.atan2(SUN[0], -SUN[1]));
      var fl = ctx.createLinearGradient(-90, 0, 90, 0);
      fl.addColorStop(0, 'rgba(255,200,150,0)'); fl.addColorStop(0.5, 'rgba(255,236,200,0.85)'); fl.addColorStop(1, 'rgba(255,200,150,0)');
      ctx.fillStyle = fl; ctx.fillRect(-90, -0.6, 180, 1.2);
      var fv = ctx.createLinearGradient(0, -22, 0, 22);
      fv.addColorStop(0, 'rgba(255,220,180,0)'); fv.addColorStop(0.5, 'rgba(255,236,210,0.7)'); fv.addColorStop(1, 'rgba(255,220,180,0)');
      ctx.fillStyle = fv; ctx.fillRect(-0.35, -22, 0.7, 44);
      ctx.restore();
    });
    // and the atmosphere's band into the glow map
    unitT(gg, GS); gg.globalCompositeOperation = 'lighter';
    var gh = gg.createRadialGradient(P.cx, P.cy, P.R - 6, P.cx, P.cy, P.R + 18);
    gh.addColorStop(0, 'rgba(60,150,255,0)'); gh.addColorStop(0.25, 'rgba(70,170,255,0.45)'); gh.addColorStop(1, 'rgba(60,90,255,0)');
    gg.fillStyle = gh; gg.fillRect(0, top - 20, TW, TH - top + 20);
  }
  // the hero's shield over the planet: a faint hexagon grid in a band above the atmosphere, brightest at its foot
  function paintShield(g, S, P) {
    g.save();
    var r0 = P.R + 4, r1 = P.R + 40;
    g.beginPath(); g.arc(P.cx, P.cy, r1, 0, Math.PI * 2); g.arc(P.cx, P.cy, r0, 0, Math.PI * 2, true); g.clip('evenodd');
    var hs = 6.2, hw = hs * Math.sqrt(3);
    g.lineWidth = 0.32;
    for (var row = 0; row < 40; row++) {
      var y = P.cy - r1 + row * hs * 1.5;
      if (y > TH + 10) break;
      for (var col = -2; col < TW / hw + 2; col++) {
        var x = col * hw + (row & 1 ? hw / 2 : 0), d = Math.sqrt((x - P.cx) * (x - P.cx) + (y - P.cy) * (y - P.cy));
        if (d < r0 - hs || d > r1 + hs) continue;
        var f = 1 - (d - r0) / (r1 - r0), a = clamp(f, 0, 1) * 0.3;
        g.strokeStyle = 'rgba(110,220,255,' + a.toFixed(3) + ')';
        g.beginPath();
        for (var v = 0; v < 6; v++) { var an = Math.PI / 6 + v * Math.PI / 3, px = x + Math.cos(an) * hs, py = y + Math.sin(an) * hs; if (v) g.lineTo(px, py); else g.moveTo(px, py); }
        g.closePath(); g.stroke();
      }
    }
    g.restore();
  }

  // ---- the lanes the ball runs in: printed panels with chevrons showing which way they go
  function chevrons(g, pts, every, color, dir, size) {   // along a polyline; dir 1 = pointing along it, -1 back
    var acc = every / 2;
    for (var i = 1; i < pts.length; i++) {
      var ax = pts[i - 1][0], ay = pts[i - 1][1], bx = pts[i][0], by = pts[i][1], dx = bx - ax, dy = by - ay, l = Math.sqrt(dx * dx + dy * dy), ux = dx / l, uy = dy / l;
      for (var s = acc; s < l; s += every) {
        var x = ax + ux * s, y = ay + uy * s, fx = ux * dir, fy = uy * dir;
        g.beginPath();
        g.moveTo(x - fx * size * 0.5 - fy * size, y - fy * size * 0.5 + fx * size);
        g.lineTo(x + fx * size * 0.5, y + fy * size * 0.5);
        g.lineTo(x - fx * size * 0.5 + fy * size, y - fy * size * 0.5 - fx * size);
        g.strokeStyle = color; g.stroke();
      }
      acc = (acc - l) % every; if (acc < 0) acc += every;
    }
  }
  function lanePanel(g, pts, width, c1, c2) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
    if (c1) { g.lineWidth = width + 1.6; g.strokeStyle = c1; g.stroke(); }
    g.lineWidth = width; g.strokeStyle = c2; g.stroke();
  }
  // (the lanes' own lamps - chevrons, rollover lamps - are inserts now, so the printed chevrons stay clear of them)
  function paintLanes(g, S) {
    unitT(g, S);
    var mx = function (p) { return [2 * M - p[0], p[1]]; };
    // the loop round the top of the arch (both orbits join here): a saturated blue lane with bright edges
    var arcPts = [];
    for (var a = Math.PI; a <= 2 * Math.PI + 1e-6; a += Math.PI / 40) arcPts.push([A.x + Math.cos(a) * (A.R - 12), A.y + Math.sin(a) * (A.R - 12)]);
    // one lane from the foot of the left orbit, round the top and down the right orbit (which meets the arch higher up)
    var loopLane = [[18, 262], [18, A.y]].concat(arcPts.slice(1, 33), [[232, 262]]);
    lanePanel(g, loopLane, 21, 'rgba(120,235,255,0.95)', 'rgba(8,40,175,0.8)');
    g.lineWidth = 0.9; g.lineCap = 'round';
    chevrons(g, arcPts.slice(10, 24), 15, 'rgba(160,240,255,0.55)', 1, 3.2);
    // the inlanes (gold) and outlanes (red): tinted panels, chevrons only below their lamps
    var inL = [[38, 296], [38, 364], [62, 384]], outL = [[16.5, 300], [16.5, 446]];
    [inL, inL.map(mx)].forEach(function (pts) {
      lanePanel(g, pts, 15, 'rgba(255,214,90,0.85)', 'rgba(70,20,150,0.78)');
      g.lineWidth = 0.8; chevrons(g, [[pts[1][0], 334], pts[1], pts[2]], 13, 'rgba(255,224,140,0.6)', 1, 3);
    });
    [outL, outL.map(mx)].forEach(function (pts) { lanePanel(g, pts, 16, 'rgba(255,110,110,0.8)', 'rgba(120,10,70,0.78)'); });
    // the shooter lane: a steel channel with chevrons up it
    var sh = T.shooter, sx = sh.cx;
    var gr = g.createLinearGradient(sh.x0, 0, sh.x1, 0);
    gr.addColorStop(0, '#0d1430'); gr.addColorStop(0.5, '#2a3770'); gr.addColorStop(1, '#0d1430');
    g.fillStyle = gr; g.fillRect(sh.x0, 146, sh.x1 - sh.x0, TH - 146);
    g.lineWidth = 1.1;
    for (var y = TH - 40; y > 160; y -= 13) {
      var f = (y - 160) / (TH - 200), al = 0.3 + 0.5 * (1 - f);
      g.strokeStyle = 'rgba(92,255,107,' + al.toFixed(2) + ')';
      g.beginPath(); g.moveTo(sx - 5, y + 3); g.lineTo(sx, y - 1.5); g.lineTo(sx + 5, y + 3); g.stroke();
    }
    // the warp ramp's entrance lane (its chevrons are lamps)
    lanePanel(g, [[120, 216], [120, 152]], 26, 'rgba(255,150,230,0.95)', 'rgba(130,0,120,0.8)');
  }

  // ---- the hangar: a steel deck behind the drop targets, hazard stripes, its invaders and its name
  function paintHangar(g, S) {
    unitT(g, S);
    var poly = T.pocket, sau = T.saucer, D = E.DROPS, fx = D[0].fx, fy = D[0].fy;
    g.save();
    g.beginPath(); poly.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath();
    var gr = g.createLinearGradient(30, 130, 90, 200);
    gr.addColorStop(0, '#3a4688'); gr.addColorStop(0.6, '#232c62'); gr.addColorStop(1, '#161c46');
    g.fillStyle = gr; g.fill(); g.clip();
    // deck plates
    g.lineWidth = 0.35; g.strokeStyle = 'rgba(170,190,255,0.3)';
    for (var i = -10; i < 20; i++) { g.beginPath(); g.moveTo(20 + i * 9, 120); g.lineTo(20 + i * 9 + 60 * fx, 120 + 60 * fy * 1.6); g.stroke(); }
    for (var j = 0; j < 12; j++) { g.beginPath(); g.moveTo(20, 128 + j * 8); g.lineTo(120, 105 + j * 8); g.stroke(); }
    // hazard stripes along the target line (inside)
    var a0 = [D[0].ax, D[0].ay], b0 = [D[D.length - 1].bx, D[D.length - 1].by];
    g.save();
    g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(b0[0], b0[1]); g.lineTo(b0[0] - fx * 6, b0[1] - fy * 6); g.lineTo(a0[0] - fx * 6, a0[1] - fy * 6); g.closePath(); g.clip();
    g.fillStyle = '#ffc23a'; g.fillRect(20, 120, 100, 100);
    g.fillStyle = '#141018';
    for (var s = -20; s < 30; s++) { g.beginPath(); g.moveTo(20 + s * 5, 220); g.lineTo(23 + s * 5, 220); g.lineTo(73 + s * 5, 120); g.lineTo(70 + s * 5, 120); g.closePath(); g.fill(); }
    g.restore();
    // the saucer's landing ring
    g.globalCompositeOperation = 'lighter';
    var rg = g.createRadialGradient(sau.x, sau.y, 3, sau.x, sau.y, 18);
    rg.addColorStop(0, 'rgba(92,255,107,0)'); rg.addColorStop(0.45, 'rgba(92,255,107,0.35)'); rg.addColorStop(0.62, 'rgba(92,255,107,0.12)'); rg.addColorStop(1, 'rgba(92,255,107,0)');
    g.fillStyle = rg; g.fillRect(sau.x - 18, sau.y - 18, 36, 36);
    g.globalCompositeOperation = 'source-over';
    g.lineWidth = 0.6; g.strokeStyle = 'rgba(160,255,170,0.7)';
    g.setLineDash([2.2, 1.6]); g.beginPath(); g.arc(sau.x, sau.y, 12.5, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    // invaders parked in the hangar (365 Invaders' own)
    pixelArt(g, PIX.orb, PAL.orb, 93.2, 137.6, 0.95, 0.9);
    pixelArt(g, PIX.moth, PAL.moth, 93.2, 146.6, 0.95, 0.9);
    pixelArt(g, PIX.bot, PAL.bot, 93.2, 155.6, 0.95, 0.9);
    g.restore();
    // a printed invader behind each target (which kind it is)
    var KIND = ['bot', 'moth', 'orb', 'moth', 'bot'];
    D.forEach(function (d, k) {
      var cx = (d.ax + d.bx) / 2 - fx * 11, cy = (d.ay + d.by) / 2 - fy * 11, pal = PAL[KIND[k]];
      g.save(); g.translate(cx, cy); g.rotate(Math.atan2(-fx, fy) + Math.PI);
      pixelArt(g, PIX[KIND[k]], { a: pal.a, b: pal.b, c: pal.c, e: pal.e }, -3.6, -2.4, 0.6, 0.5, 0.05);
      g.restore();
    });
    // its name along the roof
    var r0 = poly[0], r1 = poly[1];
    g.save(); g.translate(r0[0] + (r1[0] - r0[0]) * 0.3, r0[1] + (r1[1] - r0[1]) * 0.3 + 9); g.rotate(Math.atan2(r1[1] - r0[1], r1[0] - r0[0]));
    g.font = '900 6px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText('HANGAR', 0.4, 0.5);
    g.fillStyle = '#9dffb0'; g.fillText('HANGAR', 0, 0);
    g.restore();
  }

  // ---- painted-in light: soft pools round the bumpers, slings, posts and lanes (the general lighting)
  function pool(g, x, y, r, c, a) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, css(c, a)); gr.addColorStop(0.35, css(c, a * 0.45)); gr.addColorStop(1, css(c, 0));
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function paintLight(g, S) {
    unitT(g, S);
    g.globalCompositeOperation = 'lighter';
    var BC = [[255, 92, 200], [63, 224, 255], [255, 216, 74]];
    T.bumpers.forEach(function (b, i) { pool(g, b[0], b[1], b[2] * 3.3, BC[i], 0.62); pool(g, b[0], b[1], b[2] * 1.6, [255, 255, 255], 0.16); });
    // the slings: warm light behind them, a coloured edge glow along each kicking face
    T.slings.forEach(function (s) {
      var cx = (s.a[0] + s.b[0] + s.c[0]) / 3, cy = (s.a[1] + s.b[1] + s.c[1]) / 3;
      pool(g, cx, cy, 30, [255, 190, 120], 0.32);
    });
    softly(g, S, 'rgba(255,90,60,0.9)', 5, 0, 0, function (c) {
      c.lineWidth = 3; c.lineCap = 'round'; c.strokeStyle = '#fff';
      T.slings.forEach(function (s) { c.beginPath(); c.moveTo(s.a[0], s.a[1]); c.lineTo(s.c[0], s.c[1]); c.stroke(); });
    });
    T.posts.forEach(function (p) { pool(g, p[0], p[1], 9, [220, 230, 255], 0.28); });
    // the top lanes and the inlanes' feet; the flippers' light
    [0, 1, 2].forEach(function (i) { var s = T.sensors.circles[i]; pool(g, s[1], s[2], 16, [255, 214, 120], 0.2); });
    T.flippers.forEach(function (f) { pool(g, f.x, f.y - 4, 34, [170, 200, 255], 0.16); });
    g.globalCompositeOperation = 'source-over';
  }

  // ---- the printed guides: contact shadows under the walls, then a dark band with bright edges under each one
  function paintGuides(g, S) {
    unitT(g, S);
    var segs = wallSegs();
    g.lineCap = 'round';
    softly(g, S, 'rgba(0,0,10,0.95)', 3.2, 0.4, 1.3, function (c) {
      c.strokeStyle = '#000'; c.lineCap = 'round'; strokeSegs(c, segs, 3);
      archPath(c, A.R); c.lineWidth = 2 * A.r + 3; c.stroke();
      T.posts.forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], p[2] + 2, 0, Math.PI * 2); c.fillStyle = '#000'; c.fill(); });
      T.bumpers.forEach(function (b) { c.beginPath(); c.arc(b[0], b[1], b[2] - 1, 0, Math.PI * 2); c.fillStyle = '#000'; c.fill(); });
    });
    // the band: gold edge, dark core (the metal guide stands on the core)
    var GOLD = 'rgba(255,224,150,1)', CORE = '#171b52';
    g.strokeStyle = GOLD; strokeSegs(g, segs, 3.9, function (w) { return w[5] !== 'sling'; });
    archPath(g, A.R); g.lineWidth = 2 * A.r + 3.9; g.stroke();
    g.strokeStyle = CORE; strokeSegs(g, segs, 2.6, function (w) { return w[5] !== 'sling'; });
    archPath(g, A.R); g.lineWidth = 2 * A.r + 2.6; g.stroke();
    // the slings' plastic outline (red trim) and the posts' rings
    g.lineJoin = 'round';
    T.slings.forEach(function (s) {
      g.beginPath(); g.moveTo(s.a[0], s.a[1]); g.lineTo(s.b[0], s.b[1]); g.lineTo(s.c[0], s.c[1]); g.closePath();
      g.fillStyle = 'rgba(10,6,24,0.85)'; g.fill();
      g.lineWidth = 6.6; g.strokeStyle = 'rgba(255,98,70,0.9)'; g.stroke();
      g.lineWidth = 5.2; g.strokeStyle = CORE; g.stroke();
    });
    T.posts.forEach(function (p) {
      g.beginPath(); g.arc(p[0], p[1], p[2] + 3.2, 0, Math.PI * 2); g.fillStyle = GOLD; g.fill();
      g.beginPath(); g.arc(p[0], p[1], p[2] + 2.4, 0, Math.PI * 2); g.fillStyle = CORE; g.fill();
    });
    // the bumpers' printed rings
    var BC = ['#ff5cc8', '#3fe0ff', '#ffd84a'];
    T.bumpers.forEach(function (b, i) {
      g.beginPath(); g.arc(b[0], b[1], b[2] + 3.4, 0, Math.PI * 2); g.lineWidth = 0.9; g.strokeStyle = BC[i]; g.globalAlpha = 0.9; g.stroke();
      g.beginPath(); g.arc(b[0], b[1], b[2] + 9.2, 0, Math.PI * 2); g.lineWidth = 0.35; g.strokeStyle = 'rgba(255,255,255,0.5)'; g.stroke();
      g.globalAlpha = 1;
    });
    // the drop targets' bank: a dark slot with a gold edge
    var D = E.DROPS, a0 = D[0], b0 = D[D.length - 1];
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(a0.ax, a0.ay); g.lineTo(b0.bx, b0.by); g.lineWidth = 9; g.strokeStyle = GOLD; g.stroke();
    g.lineWidth = 7.4; g.strokeStyle = '#05060e'; g.stroke();
    // the spinner's frame and the rollovers' outlines
    T.sensors.lines.forEach(function (l) {
      g.beginPath(); g.moveTo(l[1], l[2]); g.lineTo(l[3], l[4]); g.lineWidth = 3.4; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.stroke();
      g.lineWidth = 0.8; g.strokeStyle = 'rgba(200,215,255,0.8)'; g.stroke();
    });
    T.sensors.circles.forEach(function (c) {
      if (c[0].indexOf('lane') === 0) return;
      g.beginPath(); g.ellipse(c[1], c[2], 2.2, c[3] - 1.5, 0, 0, Math.PI * 2); g.lineWidth = 0.5; g.strokeStyle = 'rgba(220,230,255,0.3)'; g.stroke();
    });
  }

  // ---- the words: our name between the slings over the planet's rim, the shots' names, BONUS
  function label(g, s, x, y, size, rot, color, align) {
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    g.font = '900 ' + size + 'px ' + FONT; g.textAlign = align || 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillText(s, size * 0.07, size * 0.09);
    g.fillStyle = color; g.fillText(s, 0, 0);
    g.restore();
  }
  function paintWords(g, S) {
    unitT(g, S);
    var LO = LAT('orbit'), by = LO.byId, L = LO.list;
    // H-E-R-O-!: a printed bracket under the letters
    var h0 = L[by.hero0], h4 = L[by.hero4];
    g.lineWidth = 0.6; g.strokeStyle = 'rgba(89,180,255,0.6)'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(h0.x - 7, h0.y - 7); g.lineTo(h0.x - 9, h0.y - 7); g.lineTo(h0.x - 9, h0.y + 7); g.lineTo(h0.x - 7, h0.y + 7); g.stroke();
    g.beginPath(); g.moveTo(h4.x + 7, h4.y - 7); g.lineTo(h4.x + 9, h4.y - 7); g.lineTo(h4.x + 9, h4.y + 7); g.lineTo(h4.x + 7, h4.y + 7); g.stroke();
    // our name: 365 big, PINBALL HERO under it, over the planet's rim
    var cy = 348;
    g.save();
    g.font = 'italic 900 22px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    softly(g, S, 'rgba(255,170,60,0.85)', 7, 0, 0, function (c) { c.fillStyle = '#fff'; c.fillText('365', M, cy); });
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText('365', M + 0.8, cy + 1);
    var gr = g.createLinearGradient(0, cy - 17, 0, cy);
    gr.addColorStop(0, '#fff6d0'); gr.addColorStop(0.45, '#ffcf4a'); gr.addColorStop(0.55, '#e88a14'); gr.addColorStop(1, '#ffdd7a');
    g.fillStyle = gr; g.fillText('365', M, cy);
    g.lineWidth = 0.5; g.strokeStyle = 'rgba(80,30,0,0.8)'; g.strokeText('365', M, cy);
    g.restore();
    g.save();
    g.font = '900 7.2px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    var tw = g.measureText('PINBALL HERO').width, k = Math.min(1, 74 / tw);
    g.translate(M, cy + 9); g.scale(k, 1);
    softly(g, S, 'rgba(80,190,255,0.95)', 4, 0, 0, function (c) { c.fillStyle = '#fff'; c.fillText('PINBALL HERO', 0, 0); });
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText('PINBALL HERO', 0.5, 0.6);
    var g2 = g.createLinearGradient(0, -6, 0, 0); g2.addColorStop(0, '#ffffff'); g2.addColorStop(1, '#9fe0ff');
    g.fillStyle = g2; g.fillText('PINBALL HERO', 0, 0);
    g.restore();
    // the hero's ship under our name
    pixelArt(g, PIX.ship, PAL.ship, M - 6.5 * 1.3, cy + 14, 1.3, 0.9);
  }

  // ---- the apron: a dark plate over the bottom corners, 365 and HERO in gold
  function paintApron(g, S) {
    unitT(g, S);
    var F = T.flippers[0], fl = null;
    T.walls.forEach(function (w) { if (w[1] < w[3] && w[0] < w[2] && w[2] < M && w[3] > 360 && Math.abs(w[2] - F.x) < 20) fl = w; });
    if (!fl) fl = [27, 380, 76, 399];
    var gap = 15, tipY = F.y + Math.sin(F.rest) * F.len + 7;
    var left = [[fl[0], fl[1] + 3], [fl[2], fl[3] + 3], [F.x + 2, F.y + 8], [M - gap - 6, tipY + 3], [M - gap, tipY + 6], [M - gap, TH + 2], [fl[0] - 2, TH + 2], [fl[0] - 2, fl[1] + 3]];
    var right = left.map(function (p) { return [2 * M - p[0], p[1]]; });
    // the drain between them
    g.fillStyle = '#020208'; g.fillRect(M - gap, tipY + 4, gap * 2, TH - tipY);
    [left, right].forEach(function (poly, side) {
      g.save();
      softly(g, S, 'rgba(0,0,0,0.9)', 3, 0, -1, function (c) { c.beginPath(); poly.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); c.fillStyle = '#000'; c.fill(); });
      g.beginPath(); poly.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath();
      var gr = g.createLinearGradient(0, 380, 0, TH);
      gr.addColorStop(0, '#463a92'); gr.addColorStop(0.25, '#2c2366'); gr.addColorStop(1, '#17113a');
      g.fillStyle = gr; g.fill();
      g.lineWidth = 0.9; g.strokeStyle = 'rgba(232,186,92,0.9)'; g.lineJoin = 'round'; g.stroke();
      g.clip();
      // brushed lines
      g.lineWidth = 0.2;
      for (var y = 380; y < TH; y += 1.4) { g.strokeStyle = 'rgba(255,255,255,' + (0.025 + 0.02 * Math.sin(y * 3.1)).toFixed(3) + ')'; g.beginPath(); g.moveTo(0, y); g.lineTo(TW, y); g.stroke(); }
      g.restore();
      var cx = side ? 2 * M - ((fl[0] + M - gap) / 2 - 3) : (fl[0] + M - gap) / 2 - 3, word = side ? 'HERO' : '365';
      g.save();
      g.font = 'italic 900 11px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      var wm = g.measureText(word).width, k = Math.min(1, 40 / wm);
      g.translate(cx, TH - 4.5); g.scale(k, 1);
      g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillText(word, 0.6, 0.8);
      var gg = g.createLinearGradient(0, -9, 0, 0); gg.addColorStop(0, '#fff3c4'); gg.addColorStop(0.5, '#ffc23a'); gg.addColorStop(0.56, '#c47a10'); gg.addColorStop(1, '#ffd870');
      g.fillStyle = gg; g.fillText(word, 0, 0);
      g.restore();
    });
  }

  // ---- outside the arch and the side walls: the cabinet's own dark edge
  function paintEdge(g, S) {
    unitT(g, S);
    g.save();
    g.beginPath(); g.rect(0, 0, TW, TH);
    g.moveTo(4, TH + 2); g.lineTo(4, A.y); g.arc(A.x, A.y, A.R + 2, Math.PI, 2 * Math.PI); g.lineTo(268, TH + 2); g.closePath();
    g.fillStyle = '#05040c'; g.fill('evenodd');
    g.restore();
  }

  // ---------------------------------------------------------------- the slingshot plastics: glowing energy shields
  // plastic('slingL' | 'slingR'[, scale]) -> a canvas, transparent outside the plastic, seen from above. It covers the
  // table rectangle canvas.x0, canvas.y0 (top left, table units) by canvas.qw x canvas.qh, so a top face maps with
  // u = (x - x0) / qw, v = (y - y0) / qh (v down the table). The plastic's outline is the sling's triangle grown by
  // canvas.grow units with round corners (as world3d's offsetPoly(tri, 3.8)). Good as a colour and an emissive map.
  var plastics = {};
  function plastic(kind, scale, table) {
    scale = scale || 4;
    var EMB = table === 'ember', TT = EMB ? emberT() : T;
    if (!TT) return null;
    var key = kind + '@' + scale + (EMB ? '@ember' : ''); if (plastics[key]) return plastics[key];
    var right = kind === 'slingR', s = TT.slings[right ? 1 : 0], tri = [s.a, s.b, s.c], grow = 3.8, pad = 6;
    var xs = tri.map(function (p) { return p[0]; }), ys = tri.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs) - grow - pad, y0 = Math.min.apply(null, ys) - grow - pad;
    var qw = Math.max.apply(null, xs) + grow + pad - x0, qh = Math.max.apply(null, ys) + grow + pad - y0;
    var c = canvas(qw * scale, qh * scale), g = c.getContext('2d'), c2 = canvas(c.width, c.height), h = c2.getContext('2d');
    var main = rgb(EMB ? '#ff7a1a' : right ? '#3fe0ff' : '#ff5cc8'), other = rgb(EMB ? '#3fe0ff' : right ? '#ff5cc8' : '#3fe0ff'), YEL = rgb('#ffd84a');
    g.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale); h.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale);
    function outline(ctx) { ctx.beginPath(); ctx.moveTo(tri[0][0], tri[0][1]); ctx.lineTo(tri[1][0], tri[1][1]); ctx.lineTo(tri[2][0], tri[2][1]); ctx.closePath(); }
    function body(ctx, fill, extra) { outline(ctx); ctx.lineJoin = 'round'; ctx.lineWidth = grow * 2 + (extra || 0); ctx.strokeStyle = fill; ctx.stroke(); ctx.fillStyle = fill; ctx.fill(); }
    var cx = (s.a[0] + s.b[0] + s.c[0]) / 3, cy = (s.a[1] + s.b[1] + s.c[1]) / 3;
    var fdx = s.c[0] - s.a[0], fdy = s.c[1] - s.a[1], fl = Math.sqrt(fdx * fdx + fdy * fdy), nx = -fdy / fl, ny = fdx / fl;
    if ((cx - s.a[0]) * nx + (cy - s.a[1]) * ny > 0) { nx = -nx; ny = -ny; }   // the kicking face's normal, out of the triangle
    var fmx = (s.a[0] + s.c[0]) / 2, fmy = (s.a[1] + s.c[1]) / 2;
    // the inside, on its own canvas: deep colour, bright towards the kicking face, the shield's hexagons, an energy arc
    body(h, '#000'); h.globalCompositeOperation = 'source-atop';
    var lg = h.createLinearGradient(fmx + nx * 3, fmy + ny * 3, cx - nx * 10, cy - ny * 10);
    lg.addColorStop(0, css(mixc(main, [255, 255, 255], 0.35), 0.95)); lg.addColorStop(0.35, css(main, 0.9)); lg.addColorStop(1, css(mixc(main, EMB ? [90, 10, 0] : [40, 0, 110], 0.62), 0.88));
    h.fillStyle = lg; h.fillRect(x0, y0, qw, qh);
    var hs = 2.6, hw = hs * Math.sqrt(3);
    h.lineWidth = 0.28;
    for (var row = 0; row * hs * 1.5 < qh + hs * 2; row++) for (var col = -1; col * hw < qw + hw; col++) {
      var hx = x0 + col * hw + (row & 1 ? hw / 2 : 0), hy = y0 + row * hs * 1.5, d = (hx - fmx) * nx + (hy - fmy) * ny;
      h.strokeStyle = css(mixc(main, [255, 255, 255], 0.6), clamp(0.75 + d * 0.05, 0.14, 0.75));
      h.beginPath();
      for (var v = 0; v < 6; v++) { var an = Math.PI / 6 + v * Math.PI / 3, px = hx + Math.cos(an) * hs * 0.92, py = hy + Math.sin(an) * hs * 0.92; if (v) h.lineTo(px, py); else h.moveTo(px, py); }
      h.closePath(); h.stroke();
    }
    h.globalCompositeOperation = 'lighter';
    var rr = rng(right ? 11 : 7);
    h.lineJoin = 'round'; h.lineCap = 'round';
    for (var pass = 0; pass < 2; pass++) {
      h.beginPath();
      for (var k = 0; k <= 14; k++) {
        var t = k / 14, off = 1.6 + (rr() - 0.5) * 2.2 + pass * 1.2, px2 = s.a[0] + fdx * t - nx * off, py2 = s.a[1] + fdy * t - ny * off;
        if (k) h.lineTo(px2, py2); else h.moveTo(px2, py2);
      }
      h.lineWidth = pass ? 0.35 : 0.6; h.strokeStyle = css(pass ? YEL : other, 0.9);
      h.shadowColor = css(pass ? YEL : other, 1); h.shadowBlur = 1.8 * scale; h.stroke();
    }
    h.beginPath(); h.moveTo(s.a[0] - nx * 0.4, s.a[1] - ny * 0.4); h.lineTo(s.c[0] - nx * 0.4, s.c[1] - ny * 0.4);
    h.lineWidth = 0.9; h.strokeStyle = 'rgba(255,255,255,0.95)'; h.shadowColor = css(main, 1); h.shadowBlur = 2.5 * scale; h.stroke();
    h.globalCompositeOperation = 'source-over'; h.shadowBlur = 0;
    // 365 Invaders' own invader in the middle, glowing white
    if (EMB) {   // Ember Peak: our island's own mark - a peak with a glowing crater under a rising sun
      var ix = cx - nx * 1.5, iy = cy - ny * 1.5;
      h.save(); h.shadowColor = css(YEL, 1); h.shadowBlur = 2 * scale;
      h.fillStyle = '#fff6d0'; h.beginPath(); h.arc(ix, iy - 3.2, 2.6, 0, Math.PI * 2); h.fill();
      h.fillStyle = '#ffffff'; h.beginPath(); h.moveTo(ix - 6, iy + 3.5); h.lineTo(ix - 1.6, iy - 2); h.lineTo(ix + 1.6, iy - 2); h.lineTo(ix + 6, iy + 3.5); h.closePath(); h.fill();
      h.fillStyle = css(YEL); h.fillRect(ix - 1.4, iy - 2.2, 2.8, 1.1);
      h.restore();
    } else {
      var art = PIX[right ? 'moth' : 'orb'], ps = 0.95, iw = art[0].length * ps, ih = art.length * ps;
      h.save(); h.shadowColor = css(main, 1); h.shadowBlur = 2 * scale;
      pixelArt(h, art, { a: '#ffffff', b: '#ffffff', c: css(mixc(main, [255, 255, 255], 0.5)), e: css(YEL) }, cx - iw / 2 - nx * 1.5, cy - ih / 2 - ny * 1.5, ps, 0.95, 0.08);
      h.restore();
    }
    // on the plastic's own canvas: a soft glow just past the edge, a bright rim, then the inside over it
    g.save(); g.shadowColor = css(main, 0.9); g.shadowBlur = 3.5 * scale; body(g, css(main, 0.6), 0.9); g.restore();
    body(g, css(mixc(main, [255, 255, 255], 0.55), 1), 0.9);
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c2, 0, 0);
    c.x0 = x0; c.y0 = y0; c.qw = qw; c.qh = qh; c.scale = scale; c.grow = grow; c.kind = kind;
    plastics[key] = c;
    return c;
  }

  // ================================================================ EMBER PEAK (16 Oct 2026, the next-gen fast track)
  // A sunny volcano island seen from above, bright and saturated: black volcanic rock round the summit, glowing lava
  // veins running down from the crater, molten lava lanes, a turquoise hot spring round the geyser and sulphur crusts
  // round the fumaroles; down the table the rock gives way to a golden beach, a turquoise lagoon round the flippers (the
  // drain is the open sea), the right orbit a channel of clear water, the shooter lane deep water. Our own insert labels
  // and our own mark; nothing from any real table. paint({ scale, table: 'ember' }), plastic(kind, scale, 'ember'),
  // inserts('ember') (the inserts as lamp data: world3d lights them until lamps.js covers this table).
  var emberCache = {}, emberList = null, emberTags = null;
  // the lava river printed under the glass (one screen, 29 Oct 2026): [x, y, width] from the volcano's foot (past the
  // geyser's hot spring) down the middle of the lower field to the lagoon at the drain. world3d.js lays a flowing sheet
  // of lava along the same line.
  function river(table) {
    if (table !== 'ember') return null;
    return [[92, 142, 7], [86, 160, 8], [79, 182, 9], [75, 204, 10], [78, 226, 10], [88, 248, 11], [102, 270, 12], [113, 292, 12],
      [119, 316, 13], [122, 342, 13], [124, 366, 14], [125, 388, 15], [125, 410, 16]];
  }
  function emberB() { return E.table && E.TABLES && E.TABLES.ember ? E.table('ember') : null; }
  function emberT() { var B = emberB(); return B ? B.T : null; }
  function inserts(table) {
    if (table !== 'ember') return table === 'orbit' || !table ? LAT('orbit').list : [];
    var own = LA.forTable ? LA.forTable('ember') : null;
    if (own && own.list && own.list.length) return own.list;
    if (emberList) return emberList;
    var B = emberB(); if (!B) return [];
    var ET = B.T, L = [], MI = ET.MID, V = ET.volcano, k;
    function add(o) { o.i = L.length; L.push(o); return o; }
    [0, 1, 2].forEach(function (i) { var c = ET.sensors.circles[i]; add({ id: 'lane' + i, group: 'lanes', shape: 'circle', x: c[1], y: c[2] + 18, w: 8, h: 8, rot: 0, color: '#ffd84a', step: i }); });
    var PC = ['#ffe14a', '#ffcc3a', '#ffb02a', '#ff9a22', '#ff8a1a', '#ff7414', '#ff5e14', '#ff4a1a'];
    for (k = 0; k < 8; k++) {
      var a = (15 + k * 10) * Math.PI / 180;
      add({ id: 'press' + k, group: 'pressure', shape: 'triangle', x: V.x + Math.cos(a) * 36, y: V.y + Math.sin(a) * 36, w: 6.5, h: 7.5, rot: Math.atan2(Math.cos(a), -Math.sin(a)), color: PC[k], step: k });
    }
    add({ id: 'crater', group: 'crater', shape: 'arrow', x: V.x, y: V.y + V.r + 28, w: 12, h: 18, rot: 0, color: '#ff9a2e' });
    ET.lava.gates.forEach(function (g, i) {
      var left = g[5] > g[0];
      add({ id: i ? 'lavaR' : 'lavaL', group: 'lava', shape: 'arrow', x: g[0] + (left ? 14 : -14), y: (g[1] + g[3]) / 2 + 8, w: 10, h: 15, rot: Math.atan2(left ? -1 : 1, 0.35), color: '#ff5a1a' });
    });
    add({ id: 'geyser', group: 'geyser', shape: 'rect', x: ET.geyser.x, y: ET.geyser.y + 22, w: 24, h: 7, rot: 0, color: '#7ff0ff', text: 'GEYSER' });
    var re = ET.ramp.entry;
    add({ id: 'ramp', group: 'ramp', shape: 'arrow', x: (re.x0 + re.x1) / 2, y: re.y + 30, w: 13, h: 20, rot: 0, color: '#ff9a2e' });
    add({ id: 'orbitL', group: 'orbits', shape: 'arrow', x: 18, y: 258, w: 10, h: 15, rot: 0, color: '#ffd84a' });
    add({ id: 'orbitR', group: 'orbits', shape: 'arrow', x: 2 * MI - 18, y: 258, w: 10, h: 15, rot: 0, color: '#3fe0ff' });
    B.DROPS.forEach(function (d, i) {
      add({ id: 'drop' + i, group: 'drops', shape: 'rect', x: (d.ax + d.bx) / 2 + d.fx * 9, y: (d.ay + d.by) / 2 + d.fy * 9, w: 7, h: 4, rot: Math.atan2(d.fx, -d.fy), color: '#ff7a1a' });
    });
    add({ id: 'kick', group: 'kick', shape: 'arrow', x: 16, y: 430, w: 9, h: 14, rot: 0, color: '#ff4a3a' });
    var F0 = ET.flippers[0];
    add({ id: 'save', group: 'save', shape: 'rect', x: MI, y: F0.y + 8, w: 27, h: 13, rot: 0, color: '#ff3b4a', text: 'SHOOT|AGAIN' });
    var d0 = B.DROPS[2], dr = Math.atan2(B.DROPS[4].by - B.DROPS[0].ay, B.DROPS[4].bx - B.DROPS[0].ax);
    emberTags = [
      { text: 'CRATER', x: V.x, y: V.y + V.r + 45, rot: 0, size: 4.4, color: '#ffd27a' },
      { text: 'LAVA', x: L[12].x, y: L[12].y + 17, rot: 0, size: 3.8, color: '#ffb02a' },
      { text: 'LAVA', x: L[13].x, y: L[13].y + 17, rot: 0, size: 3.8, color: '#ffb02a' },
      { text: (ET.names && ET.names.ramp) || 'RAMP', x: (re.x0 + re.x1) / 2, y: re.y + 50, rot: 0, size: 4, color: '#ffd27a' },
      { text: 'ORBIT', x: 18, y: 196, rot: -Math.PI / 2, size: 4, color: '#3a1606' },
      { text: 'ORBIT', x: 2 * MI - 18, y: 196, rot: -Math.PI / 2, size: 4, color: '#ffffff' },
      { text: 'OBSIDIAN', x: (d0.ax + d0.bx) / 2 + d0.fx * 20, y: (d0.ay + d0.by) / 2 + d0.fy * 20, rot: dr, size: 4, color: '#ffb02a' },
      { text: 'KICKBACK', x: 16, y: 400, rot: -Math.PI / 2, size: 3.2, color: '#ff7a5a' }
    ];
    emberList = L;
    return L;
  }

  function emberTagsOf(t) {
    if (t !== 'ember') return LAT('orbit').tags || [];
    var own = LA.forTable ? LA.forTable('ember') : null;
    if (own && own.list && own.list.length) return own.tags || [];
    inserts('ember'); return emberTags || [];
  }
  function paintEmber(S) {
    var key = String(S);
    if (emberCache[key]) return emberCache[key];
    var B = emberB(); if (!B) return null;
    var ET = B.T, W0 = ET.W, H0 = ET.H, MI = ET.MID, AR = ET.arch, V = ET.volcano, t0 = now(), ms = {};
    var C = canvas(W0 * S, H0 * S), g = C.getContext('2d'), GS = S / 2, GC = canvas(W0 * GS, H0 * GS), gg = GC.getContext('2d');
    gg.fillStyle = '#000'; gg.fillRect(0, 0, GC.width, GC.height);
    var r = rng(365);
    function step(name, fn) { var c0 = now(); g.save(); gg.save(); fn(); g.restore(); gg.restore(); ms[name] = Math.round((now() - c0) * 10) / 10; }
    function both(fn) { unitT(g, S); unitT(gg, GS); fn(g, false); fn(gg, true); }
    function poly(c, P) { c.beginPath(); P.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); }
    var RIV = river('ember');
    function lagoon() {   // the lagoon round the flippers' drain: widening down to the open sea (one screen: from y 404)
      var L = [], R = [], y;
      for (y = 404; y <= H0 + 2; y += 3) {
        var hw = 9 + (y - 404) * 0.72 + 2 * Math.sin(y / 7);
        L.push([MI - hw, y]); R.unshift([MI + hw + 1.5 * Math.sin(y / 5), y]);
      }
      return L.concat(R);
    }
    function path(c, P) { c.beginPath(); P.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); }
    var veins = [];   // the lava veins: from the volcano's foot, meandering down and out across the rock (shared by both canvases)
    (function () {
      var rv = rng(77);
      [[0.35, 90], [0.9, 70], [2.3, 80], [2.8, 60], [-0.4, 50], [3.5, 46]].forEach(function (v) {
        var a = v[0], x = V.x + Math.cos(a) * (V.r + 5), y = V.y + Math.sin(a) * (V.r + 5), pts = [[x, y]], dir = a, n = Math.round(v[1] / 5);
        for (var k = 0; k < n; k++) {
          dir += (rv() - 0.5) * 0.7; dir = dir * 0.88 + (Math.PI / 2) * 0.12;
          x += Math.cos(dir) * 5; y += Math.sin(dir) * 5;
          if (x < 34 || x > 124 || y < 40 || y > 232) break;
          if (Math.hypot(x - ET.geyser.x, y - ET.geyser.y) < 20) break;
          pts.push([x, y]);
        }
        veins.push({ pts: pts, w: 2.2 - veins.length * 0.15 });
      });
    })();

    step('rock', function () {   // black volcanic rock: smooth noise worked out small and scaled up, speckles, cracks
      var w = Math.ceil(W0 / 2), h = Math.ceil(H0 / 2), c = canvas(w, h), x = c.getContext('2d'), d = x.createImageData(w, h);
      for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
        var n = fbm(i / 16, j / 16, 4, 11), m = fbm(i / 4.5, j / 4.5, 2, 23), ox = fbm(i / 30 + 9, j / 30, 3, 5), k = (j * w + i) * 4, v = 0.6 * n + 0.4 * m;
        var red = sstep(0.55, 0.75, ox);   // oxidised patches: rust red-brown in the black
        d.data[k] = 26 + v * 52 + red * 60; d.data[k + 1] = 23 + v * 44 + red * 14; d.data[k + 2] = 34 + v * 54 - red * 10; d.data[k + 3] = 255;
      }
      x.putImageData(d, 0, 0);
      g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, W0 * S, H0 * S);
      unitT(g, S);
      for (var q = 0; q < 6000; q++) { g.fillStyle = r() < 0.55 ? 'rgba(150,140,160,' + (0.08 + r() * 0.2) + ')' : 'rgba(0,0,0,' + (0.15 + r() * 0.3) + ')'; g.fillRect(r() * W0, r() * H0, 0.3 + r() * 0.6, 0.3 + r() * 0.5); }
      g.lineCap = 'round';
      for (q = 0; q < 40; q++) {
        var cx = r() * W0, cy = r() * H0, a = r() * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy);
        for (var s2 = 0; s2 < 6; s2++) { a += (r() - 0.5) * 1.2; cx += Math.cos(a) * 4; cy += Math.sin(a) * 4; g.lineTo(cx, cy); }
        g.lineWidth = 0.25 + r() * 0.35; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.stroke();
      }
    });
    step('glowfield', function () {   // the lower half lit by the lava: a warm wash up from the river, hot cracks in the rock
      unitT(g, S); unitT(gg, GS);
      var wash = g.createLinearGradient(0, 230, 0, 420); wash.addColorStop(0, 'rgba(255,90,20,0)'); wash.addColorStop(0.6, 'rgba(255,90,20,0.16)'); wash.addColorStop(1, 'rgba(255,120,30,0.24)');
      g.fillStyle = wash; g.fillRect(0, 230, W0, 190);
      var rc = rng(19);
      both(function (c, glow) {   // hot cracks branching off the river across the lower rock (both canvases: they glow)
        c.lineCap = 'round'; c.lineJoin = 'round';
        for (var k = 0; k < 18; k++) {
          var p = RIV[3 + Math.floor(rc() * (RIV.length - 5))], side = rc() < 0.5 ? -1 : 1, x = p[0] + side * p[2] * 0.4, y = p[1], a = side < 0 ? Math.PI + (rc() - 0.5) * 0.9 : (rc() - 0.5) * 0.9, pts = [[x, y]];
          for (var j = 0; j < 4 + rc() * 6; j++) { a += (rc() - 0.5) * 0.8; x += Math.cos(a) * 4.5; y += Math.sin(a) * 4.5; if (x < 60 || x > 190 || y > 400) break; pts.push([x, y]); }
          [[glow ? 2.4 : 1.8, glow ? 'rgba(255,80,10,0.55)' : 'rgba(30,6,2,0.8)'], [glow ? 1.1 : 0.8, glow ? '#ff8a1a' : '#ff6a10'], [0.3, glow ? '#ffe08a' : '#ffd060']].forEach(function (st) { path(c, pts); c.lineWidth = st[0]; c.strokeStyle = st[1]; c.stroke(); });
        }
      });
      // warm pools of light round the slings (the lava lights their plastics from below)
      ET.slings.forEach(function (s2) { var cx = (s2.a[0] + s2.b[0] + s2.c[0]) / 3, cy = (s2.a[1] + s2.b[1] + s2.c[1]) / 3; pool(g, cx, cy, 30, [255, 110, 30], 0.35); pool(gg, cx, cy, 26, [255, 100, 20], 0.4); });
    });
    step('river', function () {   // the lava river under the glass: a dark crust bank, molten core, a yellow heart (glows)
      unitT(g, S); unitT(gg, GS);
      function band(c, k, col) { c.lineCap = 'round'; c.lineJoin = 'round'; for (var i = 1; i < RIV.length; i++) { var a = RIV[i - 1], b = RIV[i]; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineWidth = (a[2] + b[2]) / 2 * k; c.strokeStyle = col; c.stroke(); } }
      softly(g, S, 'rgba(255,90,20,0.8)', 4, 0, 0, function (c) { band(c, 1.25, '#ff5a10'); });
      band(g, 1.15, '#2a0c04'); band(g, 0.9, '#a8300a'); band(g, 0.62, '#ff6a10'); band(g, 0.26, '#ffd060');
      var rl = rng(31);   // crust plates drifting on it
      for (var q = 0; q < 70; q++) { var i = 1 + Math.floor(rl() * (RIV.length - 2)), p = RIV[i], o = (rl() - 0.5) * p[2] * 0.6; g.fillStyle = 'rgba(40,10,4,' + (0.5 + rl() * 0.4) + ')'; g.beginPath(); g.ellipse(p[0] + o, p[1] + (rl() - 0.5) * 20, 0.8 + rl() * 1.8, 1.2 + rl() * 2.5, rl() * 3, 0, Math.PI * 2); g.fill(); }
      band(gg, 1.6, 'rgba(255,80,10,0.5)'); band(gg, 0.8, '#ff8a1a'); band(gg, 0.3, '#ffe08a');
    });
    step('water', function () {   // the lagoon (the drain is the open sea, a golden sand rim round it), the right orbit's channel, the shooter lane
      unitT(g, S); unitT(gg, GS);
      function water(P, top, bottom, deep) {
        g.save(); poly(g, P);
        var gr = g.createLinearGradient(0, top, 0, bottom); gr.addColorStop(0, '#6ff0e4'); gr.addColorStop(0.35, '#22cfd8'); gr.addColorStop(1, deep);
        g.fillStyle = gr; g.fill(); g.clip();
        g.globalCompositeOperation = 'lighter'; g.lineWidth = 0.3;
        for (var i = 0; i < 200; i++) { var x = r() * W0, y = top + r() * (bottom - top), l = 1.5 + r() * 4; g.strokeStyle = 'rgba(210,255,255,' + (0.12 + r() * 0.25) + ')'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 0.8, x + l, y); g.stroke(); }
        g.restore();
        softly(g, S, 'rgba(255,255,255,0.9)', 1.6, 0, 0, function (c) { poly(c, P); c.lineWidth = 1.2; c.strokeStyle = '#fff'; c.stroke(); });
        g.save(); poly(g, P); g.lineWidth = 0.9; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineJoin = 'round'; g.stroke(); g.restore();
      }
      var LG = lagoon();
      softly(g, S, 'rgba(0,0,0,0.6)', 3, 0, -1, function (c) { poly(c, LG); c.lineWidth = 9; c.strokeStyle = '#000'; c.stroke(); });
      g.save(); poly(g, LG); g.lineWidth = 8; g.lineJoin = 'round'; g.strokeStyle = '#f7c766'; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#ffd986'; g.stroke(); g.restore();
      water(LG, 404, H0, '#0a5fa8');
      var ch = [[221, 150], [243, 150], [243, 300], [221, 300]];
      water(ch, 150, 300, '#0e86c4');
      var sh = [[245, 150], [265, 150], [265, H0 + 2], [245, H0 + 2]];
      g.save(); poly(g, sh); var sg = g.createLinearGradient(0, 150, 0, H0); sg.addColorStop(0, '#1b78d8'); sg.addColorStop(1, '#0b3f8e'); g.fillStyle = sg; g.fill(); g.restore();
      g.lineWidth = 1.1; g.lineCap = 'round'; g.lineJoin = 'round';
      chevrons(g, [[255, H0 - 40], [255, 170]], 22, 'rgba(255,214,90,0.9)', 1, 3.4);
      // where the river pours into the lagoon: a glowing fan in the shallows
      var e = RIV[RIV.length - 1]; pool(g, e[0], e[1] + 4, 16, [255, 150, 60], 0.5); pool(gg, e[0], e[1] + 4, 18, [255, 120, 30], 0.55);
      // the hot spring round the geyser: silica terraces, a turquoise pool
      var G = ET.geyser;
      for (var k = 5; k >= 0; k--) { g.beginPath(); for (var a = 0; a <= 40; a++) { var an = a / 40 * Math.PI * 2, rr = G.r + 2 + k * 1.6 + Math.sin(an * 5 + k) * 0.8; if (a) g.lineTo(G.x + Math.cos(an) * rr, G.y + Math.sin(an) * rr); else g.moveTo(G.x + Math.cos(an) * rr, G.y + Math.sin(an) * rr); } g.closePath(); g.fillStyle = k % 2 ? '#b9ddd6' : '#d8eee8'; g.fill(); }
      var pg = g.createRadialGradient(G.x, G.y, 1, G.x, G.y, G.r + 2); pg.addColorStop(0, '#c8fbff'); pg.addColorStop(0.45, '#33d6e0'); pg.addColorStop(1, '#0b8fb8');
      g.fillStyle = pg; g.beginPath(); g.arc(G.x, G.y, G.r + 2, 0, Math.PI * 2); g.fill();
      pool(gg, G.x, G.y, G.r * 2.4, [60, 220, 240], 0.35);
    });
    step('summit', function () {   // the scorched ring round the volcano, lava veins, the lava lanes, the fumaroles' crusts
      unitT(g, S); unitT(gg, GS);
      // a pale ash field round the cone's foot, so the black cone stands out against it at the home view
      var sr = g.createRadialGradient(V.x, V.y, V.r + 4, V.x, V.y, V.r + 34); sr.addColorStop(0, 'rgba(196,180,168,0.95)'); sr.addColorStop(0.55, 'rgba(150,130,120,0.6)'); sr.addColorStop(1, 'rgba(120,100,90,0)');
      g.fillStyle = sr; g.fillRect(V.x - 60, V.y - 60, 120, 120);
      var ra = rng(9); for (var q = 0; q < 500; q++) { var aa = ra() * Math.PI * 2, dd = V.r + 6 + Math.pow(ra(), 1.5) * 26; g.fillStyle = ra() < 0.6 ? 'rgba(40,30,30,0.5)' : 'rgba(230,220,210,0.5)'; g.fillRect(V.x + Math.cos(aa) * dd, V.y + Math.sin(aa) * dd, 0.4 + ra() * 0.6, 0.4 + ra() * 0.6); }
      both(function (c, glow) {
        c.lineCap = 'round'; c.lineJoin = 'round';
        var rc = rng(5);
        for (var k = 0; k < 16; k++) { var a = k / 16 * Math.PI * 2 + rc() * 0.3, x = V.x + Math.cos(a) * (V.r + 6), y = V.y + Math.sin(a) * (V.r + 6); c.beginPath(); c.moveTo(x, y); for (var j = 0; j < 3; j++) { a += (rc() - 0.5) * 0.5; x += Math.cos(a) * 4; y += Math.sin(a) * 4; c.lineTo(x, y); } c.lineWidth = glow ? 1.6 : 0.9; c.strokeStyle = glow ? '#ff8a1a' : '#ff6a1a'; c.stroke(); }
        veins.forEach(function (v) {
          [[v.w * 2.2, glow ? 'rgba(255,80,10,0.5)' : 'rgba(30,6,2,0.85)'], [v.w, glow ? '#ff8a1a' : '#ff6a10'], [v.w * 0.4, glow ? '#ffe08a' : '#ffd060']].forEach(function (st) {
            path(c, v.pts); c.lineWidth = st[0]; c.strokeStyle = st[1]; c.stroke();
          });
        });
        // the lava lanes, molten (one screen: each gate lies across its lane's mouth; the lane runs up from it)
        ET.lava.gates.forEach(function (gt, gi) {
          var x0 = Math.min(gt[0], gt[2]), x1 = Math.max(gt[0], gt[2]), y1 = Math.min(gt[1], gt[3]), y0 = y1 - 76;
          var lg = c.createLinearGradient(x0, 0, x1, 0); lg.addColorStop(0, glow ? '#a02a06' : '#6a1606'); lg.addColorStop(0.5, glow ? '#ff7a10' : '#ff6a10'); lg.addColorStop(1, glow ? '#a02a06' : '#6a1606');
          c.fillStyle = lg; c.fillRect(x0, y0, x1 - x0, y1 - y0);
          var rl = rng(3 + gi);
          for (var q = 0; q < 22; q++) { var xx = x0 + 3 + rl() * (x1 - x0 - 6), yy = y0 + rl() * (y1 - y0); c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + (rl() - 0.5) * 3, yy + 6 + rl() * 12); c.lineWidth = 0.6 + rl() * 1.2; c.strokeStyle = glow ? '#ffe08a' : 'rgba(255,214,96,0.9)'; c.stroke(); }
          if (!glow) for (q = 0; q < 12; q++) { c.fillStyle = 'rgba(30,8,4,0.75)'; c.beginPath(); c.ellipse(x0 + 3 + rl() * (x1 - x0 - 6), y0 + rl() * (y1 - y0), 1 + rl() * 2, 2 + rl() * 3.5, 0, 0, Math.PI * 2); c.fill(); }
        });
      });
      ET.bumpers.forEach(function (b) {
        var cr = g.createRadialGradient(b[0], b[1], b[2], b[0], b[1], b[2] + 13); cr.addColorStop(0, 'rgba(240,214,70,0.8)'); cr.addColorStop(0.6, 'rgba(220,170,40,0.35)'); cr.addColorStop(1, 'rgba(200,140,30,0)');
        g.fillStyle = cr; g.beginPath(); g.arc(b[0], b[1], b[2] + 13, 0, Math.PI * 2); g.fill();
        pool(gg, b[0], b[1], b[2] * 2.6, [255, 120, 30], 0.3);
      });
      for (var i = 0; i < 3; i++) { var sx = 146 + i * 24; g.fillStyle = 'rgba(14,8,10,0.85)'; g.fillRect(sx + 2.5, 62, 19, 30); g.strokeStyle = 'rgba(255,207,106,0.8)'; g.lineWidth = 0.6; g.strokeRect(sx + 2.5, 62, 19, 30); }
    });
    step('lanes', function () {   // the left orbit (gold sand under the wire rail), the ramp lane, the inlanes and outlanes (lit: they glow)
      unitT(g, S); unitT(gg, GS);
      g.save(); var lg = g.createLinearGradient(6, 0, 30, 0); lg.addColorStop(0, '#d49a3a'); lg.addColorStop(0.5, '#ffd27a'); lg.addColorStop(1, '#d49a3a');
      g.fillStyle = lg; g.fillRect(7, 140, 22, 160); g.restore();
      g.lineWidth = 1.1; g.lineCap = 'round'; g.lineJoin = 'round';
      var re = ET.ramp.entry;
      g.save(); var rg = g.createLinearGradient(0, re.y - 34, 0, re.y + 6); rg.addColorStop(0, '#ff8a1a'); rg.addColorStop(1, '#c84a0a');
      g.fillStyle = rg; g.fillRect(re.x0 - 1, re.y - 34, re.x1 - re.x0 + 2, 40); g.restore();
      var F0 = ET.flippers[0], fy = F0.y, inX = 38, outX = 16;
      // the outlanes: shallow water running out to the sea (danger); the inlanes: lava-lit gold, glowing
      lanePanel(g, [[outX, fy - 86], [outX, fy + 20]], 15, 'rgba(255,255,255,0.9)', '#2fd0d8');
      lanePanel(g, [[2 * MI - outX, fy - 86], [2 * MI - outX, fy + 20]], 15, 'rgba(255,255,255,0.9)', '#2fd0d8');
      lanePanel(g, [[inX - 0.5, fy - 120], [inX - 0.5, fy - 30], [inX + 14, fy - 16]], 13, 'rgba(160,80,10,0.8)', '#ffcf6a');
      lanePanel(g, [[2 * MI - inX + 0.5, fy - 120], [2 * MI - inX + 0.5, fy - 30], [2 * MI - inX - 14, fy - 16]], 13, 'rgba(160,80,10,0.8)', '#ffcf6a');
      [inX - 0.5, 2 * MI - inX + 0.5].forEach(function (x) {   // the inlanes' glow (emissive), a hot line down each middle
        var lgg = gg.createLinearGradient(x - 6, 0, x + 6, 0); lgg.addColorStop(0, 'rgba(255,120,20,0)'); lgg.addColorStop(0.5, 'rgba(255,170,60,0.55)'); lgg.addColorStop(1, 'rgba(255,120,20,0)');
        gg.fillStyle = lgg; gg.fillRect(x - 6, fy - 120, 12, 92);
      });
      [outX, 2 * MI - outX].forEach(function (x) { var lgg = gg.createLinearGradient(x - 7, 0, x + 7, 0); lgg.addColorStop(0, 'rgba(40,200,220,0)'); lgg.addColorStop(0.5, 'rgba(60,220,240,0.35)'); lgg.addColorStop(1, 'rgba(40,200,220,0)'); gg.fillStyle = lgg; gg.fillRect(x - 7, fy - 86, 14, 106); });
    });
    step('guides', function () {   // contact shadows under the walls, then a printed band: gold edge, dark core
      unitT(g, S);
      var segs = [];
      ET.walls.forEach(function (w) { if (w[6] !== 'apron') segs.push([w[0], w[1], w[2], w[3], w[4], w[6]]); });
      ET.slings.forEach(function (s) { segs.push([s.a[0], s.a[1], s.b[0], s.b[1], 2.5, 'rubber'], [s.b[0], s.b[1], s.c[0], s.c[1], 2.5, 'rubber'], [s.a[0], s.a[1], s.c[0], s.c[1], 2.5, 'sling']); });
      softly(g, S, 'rgba(0,0,10,0.9)', 3.2, 0.4, 1.3, function (c) {
        c.strokeStyle = '#000'; c.lineCap = 'round'; strokeSegs(c, segs, 3);
        c.beginPath(); c.arc(AR.x, AR.y, AR.R, Math.PI, 2 * Math.PI); c.lineWidth = 2 * AR.r + 3; c.stroke();
        ET.posts.forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], p[2] + 2, 0, Math.PI * 2); c.fillStyle = '#000'; c.fill(); });
        ET.bumpers.forEach(function (b) { c.beginPath(); c.arc(b[0], b[1], b[2] - 1, 0, Math.PI * 2); c.fillStyle = '#000'; c.fill(); });
        c.beginPath(); c.arc(V.x, V.y, V.r + 1, 0, Math.PI * 2); c.fillStyle = '#000'; c.fill();
      });
      var GOLD = 'rgba(255,214,120,1)', CORE = '#24140e';
      g.lineCap = 'round';
      g.strokeStyle = GOLD; strokeSegs(g, segs, 3.9, function (w) { return w[5] !== 'sling'; });
      g.beginPath(); g.arc(AR.x, AR.y, AR.R, Math.PI, 2 * Math.PI); g.lineWidth = 2 * AR.r + 3.9; g.stroke();
      g.strokeStyle = CORE; strokeSegs(g, segs, 2.6, function (w) { return w[5] !== 'sling'; });
      g.beginPath(); g.arc(AR.x, AR.y, AR.R, Math.PI, 2 * Math.PI); g.lineWidth = 2 * AR.r + 2.6; g.stroke();
      g.lineJoin = 'round';
      ET.slings.forEach(function (s) {
        g.beginPath(); g.moveTo(s.a[0], s.a[1]); g.lineTo(s.b[0], s.b[1]); g.lineTo(s.c[0], s.c[1]); g.closePath();
        g.fillStyle = 'rgba(30,10,4,0.85)'; g.fill(); g.lineWidth = 6.6; g.strokeStyle = 'rgba(255,120,30,0.95)'; g.stroke(); g.lineWidth = 5.2; g.strokeStyle = CORE; g.stroke();
      });
      ET.posts.forEach(function (p) {
        g.beginPath(); g.arc(p[0], p[1], p[2] + 3.2, 0, Math.PI * 2); g.fillStyle = GOLD; g.fill();
        g.beginPath(); g.arc(p[0], p[1], p[2] + 2.4, 0, Math.PI * 2); g.fillStyle = CORE; g.fill();
      });
      ET.bumpers.forEach(function (b) { g.beginPath(); g.arc(b[0], b[1], b[2] + 3.4, 0, Math.PI * 2); g.lineWidth = 0.9; g.strokeStyle = '#ffb02a'; g.stroke(); });
      var D = B.DROPS, a0 = D[0], b0 = D[D.length - 1];
      g.beginPath(); g.moveTo(a0.ax, a0.ay); g.lineTo(b0.bx, b0.by); g.lineWidth = 9; g.strokeStyle = 'rgba(255,140,40,0.95)'; g.stroke(); g.lineWidth = 7.4; g.strokeStyle = '#08060c'; g.stroke();
      ET.sensors.lines.forEach(function (l) { g.beginPath(); g.moveTo(l[1], l[2]); g.lineTo(l[3], l[4]); g.lineWidth = 3.4; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.stroke(); g.lineWidth = 0.8; g.strokeStyle = 'rgba(255,240,200,0.8)'; g.stroke(); });
      // the closed spaces (the summit deck, the obsidian block): dark under the rock blocks the 3D look raises there
      (ET.voids || []).forEach(function (v) { poly(g, v); g.fillStyle = '#120e14'; g.fill(); });
    });
    step('inserts', function () {
      unitT(g, S); inserts('ember').forEach(function (l) { insertUnlit(g, l); });
      emberTagsOf('ember').forEach(function (t) {
        g.save(); g.translate(t.x, t.y); g.rotate(t.rot || 0);
        g.font = '900 ' + t.size + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
        var wm = g.measureText(t.text).width, max = t.text.length * t.size * 0.78, k = Math.min(1, max / (wm || 1));
        g.scale(k, 1); g.lineJoin = 'round';
        var dark = t.color === '#3a1606';
        g.lineWidth = t.size * 0.32 / k; g.strokeStyle = dark ? 'rgba(255,240,200,0.8)' : 'rgba(20,6,2,0.9)'; g.strokeText(t.text, 0, t.size * 0.04);
        g.fillStyle = t.color; g.fillText(t.text, 0, t.size * 0.04);
        g.restore();
      });
    });
    step('apron', function () {   // the apron: ocean-blue enamel with a gold edge, 365 on the left, our island's name on the right
      unitT(g, S);
      var F = ET.flippers[0], fl = null;
      ET.walls.forEach(function (w) { if (w[6] !== 'apron' && w[1] < w[3] && w[0] < w[2] && w[2] < MI && w[3] > F.y - 44 && w[3] < F.y && Math.abs(w[2] - F.x) < 20) fl = w; });
      if (!fl) fl = [27, F.y - 24, 76, F.y - 5];
      var gap = 15, tipY = F.y + Math.sin(F.rest) * F.len + 7;
      var left = [[fl[0], fl[1] + 3], [fl[2], fl[3] + 3], [F.x + 2, F.y + 8], [MI - gap - 6, tipY + 3], [MI - gap, tipY + 6], [MI - gap, H0 + 2], [fl[0] - 2, H0 + 2], [fl[0] - 2, fl[1] + 3]];
      var right = left.map(function (p) { return [2 * MI - p[0], p[1]]; });
      [left, right].forEach(function (P, side) {
        softly(g, S, 'rgba(0,0,0,0.85)', 3, 0, -1, function (c) { poly(c, P); c.fillStyle = '#000'; c.fill(); });
        g.save(); poly(g, P);
        var gr = g.createLinearGradient(0, fl[1], 0, H0); gr.addColorStop(0, '#2a7fe0'); gr.addColorStop(0.3, '#145cc0'); gr.addColorStop(1, '#0a3482');
        g.fillStyle = gr; g.fill(); g.lineWidth = 0.9; g.strokeStyle = 'rgba(255,214,120,0.95)'; g.lineJoin = 'round'; g.stroke(); g.clip();
        g.lineWidth = 0.5;
        for (var y = fl[1]; y < H0; y += 3.2) { g.strokeStyle = 'rgba(160,220,255,0.12)'; g.beginPath(); for (var x = 0; x <= W0; x += 4) { var yy = y + Math.sin(x / 9 + y) * 0.8; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); } g.stroke(); }
        g.restore();
        var cx = side ? 2 * MI - ((fl[0] + MI - gap) / 2 - 3) : (fl[0] + MI - gap) / 2 - 3, word = side ? 'EMBER PEAK' : '365';
        g.save(); g.font = 'italic 900 ' + (side ? 7 : 11) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        var wm = g.measureText(word).width, k = Math.min(1, 44 / wm);
        g.translate(cx, H0 - 5); g.scale(k, 1);
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(word, 0.6, 0.8);
        var gg2 = g.createLinearGradient(0, -9, 0, 0); gg2.addColorStop(0, '#fff3c4'); gg2.addColorStop(0.5, '#ffc23a'); gg2.addColorStop(0.56, '#c47a10'); gg2.addColorStop(1, '#ffd870');
        g.fillStyle = gg2; g.fillText(word, 0, 0); g.restore();
      });
    });
    step('edge', function () {   // outside the arch and the side walls: the cabinet's own dark edge
      unitT(g, S);
      g.save(); g.beginPath(); g.rect(0, 0, W0, H0);
      g.moveTo(4, H0 + 2); g.lineTo(4, AR.y); g.arc(AR.x, AR.y, AR.R + 2, Math.PI, 2 * Math.PI); g.lineTo(W0 - 2, H0 + 2); g.closePath();
      g.fillStyle = '#0a0810'; g.fill('evenodd'); g.restore();
    });
    var out = { color: C, glow: GC, scale: S, ms: ms, total: Math.round((now() - t0) * 10) / 10, table: 'ember' };
    emberCache[key] = out;
    return out;
  }

  root.PinArt = { paint: paint, lampSprite: lampSprite, quad: quad, plastic: plastic, inserts: inserts, tags: emberTagsOf, river: river, version: 4 };
})(typeof self !== 'undefined' ? self : this);
