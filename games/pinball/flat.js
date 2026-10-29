/* 365 Pinball Hero - the flat 8-bit look (15 Oct 2026, milestone 1). An honest 8-bit pinball table drawn by us: dark
 * space with dithered bands and twinkling stars, the planet the hero defends low behind the flippers, the Mothership on
 * the playfield under the arch, invaders from 365 Invaders on the drop targets, the pop bumpers as glowing orbs, and a
 * dot-matrix display (DMD) along the top. This is the "then" picture that the 3D look swings out of in milestone 2.
 *
 * The cabinet (../common/arcade.js) calls PinFlat.draw(g, world, t, mode, info) every frame on the 270 x 480 game-pixel
 * canvas and blows it up with square pixels. The top 34 rows are the DMD; the table (the engine's own units, 270 x 446)
 * is drawn under it. Every part is drawn FROM THE TABLE DATA (table.js, and the engine's measured walls, drop targets,
 * gates and ramp), so if the physics lane moves something the picture follows. It only ever reads the world.
 *
 * Why it is drawn pixel by pixel: canvas paths anti-alias, which turns pixel art to mush when it is blown up. So every
 * shape here is worked out at pixel centres into our own pixel buffers (ImageData) - each pixel either is or isn't,
 * in an exact colour from a small palette, shaded with ordered (Bayer) dithering like the old machines. Everything
 * that doesn't move is built once into layers; the flippers are built once per whole degree as they are needed; so a
 * frame is a handful of image copies (well under a millisecond on a PC). */
(function () {
  'use strict';
  var TW = 270, TH = 446, OY = 34, DW = 135, DH = 16;   // the table's size, where it starts, the DMD's dots
  var E = null, T = null, made = false, L = {};

  // ---------------------------------------------------------------- colours: '#rrggbb' -> one pixel (ImageData's byte order)
  function px(h) { var n = parseInt(h.slice(1), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0; }
  function mix(a, b, f) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    function ch(s) { var p = (x >> s) & 255, q = (y >> s) & 255; return Math.round(p + (q - p) * f); }
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }
  function darker(c, f) { var r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255; return (0xff000000 | (Math.round(b * f) << 16) | (Math.round(g * f) << 8) | Math.round(r * f)) >>> 0; }
  function ramp(list) { return list.map(px); }
  var STEEL = ramp(['#1a1f3d', '#363f6c', '#5f6b9f', '#93a0d0', '#cdd8f6', '#ffffff']);
  var RUBBER = ramp(['#55576e', '#9496ad', '#cfd1df', '#f1f2f8', '#ffffff']);
  var NEON = px('#1f86c9'), NEON2 = px('#5a2a9a'), INK = px('#07050f');
  var ORB = ['#ff5cc8', '#3fe0ff', '#ffd84a'];   // the invader colours of 365 Invaders: orb, moth, bot

  // ---------------------------------------------------------------- pixel buffers: a canvas we fill pixel by pixel
  function Buf(x0, y0, w, h) {
    var c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
    this.c = c; this.g = c.getContext('2d'); this.ox = x0; this.oy = y0; this.w = c.width; this.h = c.height;
    this.id = this.g.createImageData(this.w, this.h); this.p = new Uint32Array(this.id.data.buffer);
  }
  Buf.prototype.set = function (x, y, c) { x -= this.ox; y -= this.oy; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y * this.w + x] = c; };
  Buf.prototype.get = function (x, y) { x -= this.ox; y -= this.oy; return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.p[y * this.w + x] : 0; };
  Buf.prototype.done = function () { this.g.putImageData(this.id, 0, 0); return this; };
  Buf.prototype.draw = function (g, dx, dy) { g.drawImage(this.c, this.ox + (dx || 0), this.oy + OY + (dy || 0)); };
  function box(x0, y0, x1, y1) { x0 = Math.floor(x0); y0 = Math.floor(y0); return new Buf(x0, y0, Math.ceil(x1) - x0 + 1, Math.ceil(y1) - y0 + 1); }
  // copy one buffer's solid pixels into another (both in table pixels)
  function stampInto(dst, src) {
    for (var y = 0; y < src.h; y++) for (var x = 0; x < src.w; x++) { var c = src.p[y * src.w + x]; if (c) dst.set(x + src.ox, y + src.oy, c); }
  }

  // ---------------------------------------------------------------- geometry, at pixel centres
  function near(px_, py, ax, ay, bx, by) {   // the nearest point of a line to a point: distance, how far along, normal
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? ((px_ - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var ex = px_ - (ax + dx * t), ey = py - (ay + dy * t), d = Math.sqrt(ex * ex + ey * ey);
    return { d: d, t: t, nx: d ? ex / d : 0, ny: d ? ey / d : -1 };
  }
  function inPoly(x, y, p) {
    var inside = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) inside = !inside;
    }
    return inside;
  }
  var B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bay(x, y) { return (B4[((y & 3) << 2) | (x & 3)] + 0.5) / 16; }   // the ordered-dither threshold, 0-1
  // light from the top left: how bright a rounded surface is (nx, ny: which way it faces; s: 0 middle, 1 edge)
  function shade(nx, ny, s) { var z = Math.sqrt(Math.max(0, 1 - s * s)); return Math.max(0, -0.42 * nx * s - 0.62 * ny * s + 0.66 * z); }
  function pick(list, v) { var i = Math.floor(v * list.length); return list[i < 0 ? 0 : i >= list.length ? list.length - 1 : i]; }
  function rnd(seed) { var a = seed; return function () { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; }
  function hash(x, y) { var h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function noise(x, y) {   // smooth value noise, 0-1 (the planet's continents)
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // ---------------------------------------------------------------- pixel art (the invaders and the ship are 365 Invaders' own)
  var ART = {
    orb: [['....####....', '..########..', '.##..##..##.', '.##########.', '..########..', '...#....#...', '..#..##..#..', '.#........#.'],
      ['....####....', '..########..', '.##..##..##.', '.##########.', '..########..', '...#....#...', '...#.##.#...', '..#......#..']],
    moth: [['##........##', '.##..##..##.', '..########..', '.##.####.##.', '############', '#..######..#', '...#....#...', '..#......#..'],
      ['............', '#...####...#', '##.######.##', '.##.####.##.', '.##########.', '...######...', '..#.#..#.#..', '.#........#.']],
    bot: [['..#......#..', '...######...', '..#.####.#..', '..########..', '#.##.##.##.#', '#..######..#', '...#....#...', '..##....##..'],
      ['..#......#..', '...######...', '..#.####.#..', '..########..', '..##.##.##..', '.#.######.#.', '#..#....#..#', '...##..##...']],
    ship: ['......#......', '.....###.....', '.....###.....', '..#.#####.#..', '.###########.', '#############', '#############', '##.##...##.##'],
    boom: ['#...#..#...#', '.#...##...#.', '..#......#..', '##........##', '..#......#..', '.#..#..#..#.', '#...#..#...#', '............']
  };
  var DROPKIND = ['bot', 'moth', 'orb', 'moth', 'bot'], DROPCOL = { orb: ORB[0], moth: ORB[1], bot: ORB[2] };

  // ---------------------------------------------------------------- the fonts: 5 x 7 (from 365 Invaders, with more) and a tiny 3 x 5
  var G5 = {
    '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31], '3': [31, 2, 4, 2, 1, 17, 14],
    '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14], '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
    '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [28, 18, 17, 17, 17, 18, 28],
    E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31], '+': [0, 4, 4, 31, 4, 4, 0], '-': [0, 0, 0, 31, 0, 0, 0],
    '!': [16, 16, 16, 16, 16, 0, 16], ',': [0, 0, 0, 0, 0, 8, 16], '.': [0, 0, 0, 0, 0, 0, 16], ':': [0, 0, 16, 0, 0, 16, 0],
    '/': [1, 1, 2, 4, 8, 16, 16], "'": [16, 16, 0, 0, 0, 0, 0], '?': [14, 17, 1, 2, 4, 0, 4], ' ': [0, 0, 0, 0, 0, 0, 0]
  };
  var G3 = {
    '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [7, 1, 7, 4, 7], '3': [7, 1, 3, 1, 7], '4': [5, 5, 7, 1, 1],
    '5': [7, 4, 7, 1, 7], '6': [7, 4, 7, 5, 7], '7': [7, 1, 1, 2, 2], '8': [7, 5, 7, 5, 7], '9': [7, 5, 7, 1, 7],
    A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4],
    G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
    M: [5, 7, 7, 5, 5], N: [5, 7, 7, 7, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4], Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5],
    S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2], U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
    Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7], ',': [0, 0, 0, 2, 4], '.': [0, 0, 0, 0, 4], ':': [0, 4, 0, 4, 0], '!': [4, 4, 4, 0, 4],
    '-': [0, 0, 7, 0, 0], '+': [0, 2, 7, 2, 0], '/': [1, 1, 2, 4, 4], "'": [4, 4, 0, 0, 0], '?': [6, 1, 2, 0, 2], ' ': [0, 0, 0, 0, 0]
  };
  var F5 = { g: G5, h: 7, d: 5, w: { ',': 2, '.': 1, ':': 1, "'": 1, '!': 1, ' ': 3 } };
  var F3 = { g: G3, h: 5, d: 3, w: { ',': 2, '.': 1, ':': 1, '!': 1, "'": 1, ' ': 2 } };
  function gw(F, ch) { return F.w[ch] != null ? F.w[ch] : F.d; }
  function measure(F, s, k) { s = String(s).toUpperCase(); var n = 0; for (var i = 0; i < s.length; i++) n += (gw(F, s.charAt(i)) + 1) * k; return Math.max(0, n - k); }
  function letters(F, s, x, y, k, fn) {   // calls fn(x, y) for every lit pixel (k: each font pixel k x k)
    s = String(s).toUpperCase();
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i), rows = F.g[ch] || F.g[' '], w = gw(F, ch);
      for (var r = 0; r < F.h; r++) for (var c = 0; c < w; c++) {
        if (!(rows[r] & (1 << (F.d - 1 - c)))) continue;
        for (var a = 0; a < k; a++) for (var b = 0; b < k; b++) fn(x + c * k + a, y + r * k + b);
      }
      x += (w + 1) * k;
    }
  }
  function artEach(rows, x, y, k, fn) { for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].length; c++) if (rows[r].charAt(c) === '#') for (var a = 0; a < k; a++) for (var b = 0; b < k; b++) fn(x + c * k + a, y + r * k + b); }

  // ================================================================ building the layers (once, on the first frame)
  function make() {
    E = window.PinEngine; T = E.TABLE;
    var ms = {}, now = function () { return window.performance ? performance.now() : Date.now(); }, t0 = now();
    function time(name, fn) { var c0 = now(); fn(); ms[name] = Math.round((now() - c0) * 10) / 10; }
    L.bg = new Buf(0, 0, TW, TH);
    [['space', paintSpace], ['planet', paintPlanet], ['ringed', paintRinged], ['mother', paintMother], ['hangar', paintHangar], ['lane', paintShooterLane],
      ['apron', paintApron], ['shadow', paintRampShadow], ['inserts', makeInserts]].forEach(function (s) { time(s[0], s[1]); });   // (the inserts' unlit look goes into the background)
    L.twinkle = L.twinkle.filter(function (s) { return L.sky[L.bg.get(s.x, s.y)] && L.sky[L.bg.get(s.x - 1, s.y)] && L.sky[L.bg.get(s.x + 1, s.y)] && L.sky[L.bg.get(s.x, s.y - 1)] && L.sky[L.bg.get(s.x, s.y + 1)]; });   // only on open sky
    L.bg.done();
    [['walls', makeWalls], ['ramp', makeRamp], ['slings', makeSlings], ['bumpers', makeBumpers], ['drops', makeDrops], ['balls', makeBalls], ['saucer', makeSaucerRing]].forEach(function (s) { time(s[0], s[1]); });
    L.flip = {};
    ms.total = Math.round((now() - t0) * 10) / 10;
    window.PinFlat.buildMs = ms;   // what the first frame spent building each layer (for the test bench)
    made = true;
  }
  function inField(cx, cy) {   // on the playfield (inside the arch and the side walls)?
    var A = T.arch;
    if (cy < A.y) { var dx = cx - A.x, dy = cy - A.y; return dx * dx + dy * dy < A.R * A.R; }
    return cx > A.x - A.R && cx < A.x + A.R;
  }

  // ---- space: a deep dithered sky in bands, two faint nebulae, the stars; the cabinet's own metal outside the arch
  function paintSpace() {
    var B = L.bg, SKY = ramp(['#04051a', '#070922', '#0b0d2b', '#101235', '#16163f', '#1c1848', '#221a50']);
    var NEB = [{ x: 62, y: 262, r: 78, c: px('#24124a'), c2: px('#3a1a62') }, { x: 196, y: 214, r: 66, c: px('#0c2546'), c2: px('#123a5e') }];
    var CAB = [px('#0b0816'), px('#151027'), px('#211a3a')];
    L.sky = {}; SKY.concat([NEB[0].c, NEB[0].c2, NEB[1].c, NEB[1].c2]).forEach(function (c) { L.sky[c] = 1; });
    for (var y = 0; y < TH; y++) for (var x = 0; x < TW; x++) {
      var cx = x + 0.5, cy = y + 0.5, c;
      if (!inField(cx, cy)) { c = (x + y) % 6 === 0 || (x - y + 600) % 6 === 0 ? CAB[1] : CAB[0]; if ((x % 12 === 3) && (y % 12 === 3)) c = CAB[2]; B.set(x, y, c); continue; }
      var f = cy / TH * (SKY.length - 1), i = Math.floor(f);
      c = SKY[f - i > bay(x, y) ? Math.min(SKY.length - 1, i + 1) : i];
      for (var k = 0; k < NEB.length; k++) {
        var N = NEB[k], d = Math.sqrt((cx - N.x) * (cx - N.x) + (cy - N.y) * (cy - N.y)) / N.r;
        if (d >= 1) continue;
        var v = (1 - d) * (0.45 + 0.9 * noise(cx / 17 + k * 9, cy / 17)) - 0.35;
        if (v > bay(x, y)) c = v > 0.45 + bay(x, y) * 0.5 ? N.c2 : N.c;
      }
      B.set(x, y, c);
    }
    // the stars: most dim, a few bright, a handful with a twinkle cross (the twinkling ones are drawn each frame)
    var r = rnd(2026), DIM = px('#4a5384'), MID = px('#97a6e8'), WHITE = px('#ffffff'), WARM = px('#ffe7a3');
    for (var n = 0; n < 150; n++) {
      var sx = Math.floor(r() * TW), sy = Math.floor(r() * TH * 0.84), b = r();
      if (!inField(sx + 0.5, sy + 0.5) || sx > T.shooter.x0 - 3) continue;
      B.set(sx, sy, b < 0.7 ? DIM : b < 0.92 ? MID : b < 0.97 ? WARM : WHITE);
    }
    L.twinkle = [];
    for (n = 0; n < 60 && L.twinkle.length < 22; n++) {
      var tx = 12 + Math.floor(r() * (T.shooter.x0 - 24)), ty = 14 + Math.floor(r() * 300), ok = inField(tx + 0.5, ty + 0.5);
      if (ok) L.twinkle.push({ x: tx, y: ty, p: r() * 6.283, s: 0.6 + r() * 0.8 });
    }
  }

  // ---- the planet, low behind the flippers: oceans, continents, a few clouds, city lights, and a glowing rim
  function paintPlanet() {
    var B = L.bg, P = { x: T.MID, y: 604, R: 250 }, top = P.y - P.R;
    var SEA = ramp(['#5fb4ff', '#2f78d8', '#1d52a8', '#143c82', '#0e2c64']), LAND = ramp(['#7ee08a', '#3fb866', '#2a8c4e', '#1d683c', '#164f30']);
    var CLOUD = px('#dfeeff'), CITY = px('#ffd84a'), ATM = [px('#9ff0ff'), px('#3aa8ec'), px('#1d5db4')];
    for (var y = top - 4; y < TH; y++) for (var x = 0; x < T.shooter.x0 - 2; x++) {
      var cx = x + 0.5, cy = y + 0.5;
      if (!inField(cx, cy)) continue;
      var d = Math.sqrt((cx - P.x) * (cx - P.x) + (cy - P.y) * (cy - P.y)), e = P.R - d;
      if (e < 0) {   // the atmosphere, a dithered glow just outside the rim
        if (e > -1) B.set(x, y, ATM[0]); else if (e > -2.2) { if (bay(x, y) < 0.6) B.set(x, y, ATM[1]); } else if (e > -4) { if (bay(x, y) < 0.3) B.set(x, y, ATM[2]); }
        continue;
      }
      var depth = Math.min(1, e / 70), lu = cx / 26, lv = (cy - top) / 9 + cx / 60;
      var land = noise(lu, lv) * 0.65 + noise(lu * 2.3 + 7, lv * 2.3) * 0.35 > 0.56;
      var tone = depth * 0.95 + (bay(x, y) - 0.5) * 0.22;
      var c = pick(land ? LAND : SEA, e < 1.5 ? 0 : tone);
      var cl = noise(lu * 1.7 + 40, lv * 3);
      if (!land && (cl > 0.8 || (cl > 0.75 && bay(x, y) < 0.5))) c = CLOUD;
      if (land && e > 26 && hash(x, y) < 0.035) c = CITY;
      B.set(x, y, c);
    }
  }

  // ---- a ringed planet in the open space between the ramp's lane and the right orbit (playfield art, kept dim)
  function paintRinged() {
    var B = L.bg, M = T.MID, lx = M + 9, rx_ = M + 95;
    T.walls.forEach(function (w) {
      if (w[0] !== w[2] || Math.min(w[1], w[3]) > 200 || Math.max(w[1], w[3]) < 200) return;
      if (w[0] > M && w[0] < M + 30) lx = w[0];
      if (w[0] > M + 60 && w[0] < T.shooter.x0 - 4) rx_ = w[0];
    });
    var cx = (lx + rx_) / 2, cy = 242, r = 10, ca = Math.cos(-0.32), sa = Math.sin(-0.32);
    var BODY = ramp(['#24142c', '#43233a', '#6e3a40', '#9c5a46', '#c88456']), RING = [px('#4a4270'), px('#8a80b8')], OUT = px('#0a0716');
    for (var y = Math.floor(cy - 14); y <= cy + 14; y++) for (var x = Math.floor(cx - 25); x <= cx + 25; x++) {
      var dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.sqrt(dx * dx + dy * dy);
      var u = dx * ca + dy * sa, v = -dx * sa + dy * ca, e = Math.sqrt(u * u / (23 * 23) + v * v / (5.5 * 5.5));
      var ring = e > 0.74 && e <= 1, front = v > 0;
      if (d <= r && !(ring && front)) {
        var band = Math.floor((dy + r) / 3.2) % 2, lum = shade(dx / (d || 1), dy / (d || 1), d / r) * 0.95 - band * 0.12 + (bay(x, y) - 0.5) * 0.25;
        B.set(x, y, d > r - 0.9 ? OUT : pick(BODY, lum));
      } else if (ring && (front || d > r)) B.set(x, y, e < 0.86 ? RING[1] : RING[0]);
    }
  }

  // ---- the Mothership: our own pixel art (inspired by 365 Invaders' mystery ship) - a disc, a glass dome with an
  // invader at the controls, rim lights and three emitters. The lights are drawn each frame.
  function paintMother() {
    var B = L.bg, A = T.arch, cx = A.x, cy = A.y - A.R + 35, rx = 33, ry = 8;
    var HULL = ramp(['#262a52', '#454c82', '#7880b6', '#b7bfe6', '#eef1ff']), GLASS = ramp(['#0e3048', '#17506e', '#2a86a6', '#7fe6ff']);
    var OUT = px('#0b0c22'), BAND = px('#c42838'), BAND2 = px('#7a1626');
    L.mother = { x: cx, y: cy, ports: [], emit: [], ant: null };
    function inDisc(x, y) { var u = (x - cx) / rx, v = (y - cy) / ry; return u * u + v * v <= 1; }
    function inDome(x, y) { var u = (x - cx) / 14.5, v = (y - (cy - 5)) / 12; return y < cy - 2.5 && u * u + v * v <= 1; }
    for (var y = Math.floor(cy - 18); y <= cy + ry + 1; y++) for (var x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      var X = x + 0.5, Y = y + 0.5, c = 0;
      if (inDome(X, Y)) {
        var u = (X - cx) / 14.5, v = (Y - (cy - 5)) / 12, s = Math.min(1, Math.sqrt(u * u + v * v));
        c = pick(GLASS, shade(u / (s || 1), v / (s || 1), s) * 0.9 + (bay(x, y) - 0.5) * 0.25);
        if (!inDome(X - 1, Y) || !inDome(X + 1, Y) || !inDome(X, Y - 1)) c = OUT;
      } else if (inDisc(X, Y)) {
        var dv = (Y - cy) / ry, du = (X - cx) / rx;
        if (Math.abs(Y - cy) < 1.2) c = (x & 1) ? BAND : BAND2;
        else c = pick(HULL, (dv < 0 ? 0.85 - dv * -0.1 : 0.42 - dv * 0.4) - du * du * 0.35 + (bay(x, y) - 0.5) * 0.2);
        if (!inDisc(X - 1, Y) || !inDisc(X + 1, Y) || !inDisc(X, Y - 1) || !inDisc(X, Y + 1)) c = OUT;
      }
      if (c) B.set(x, y, c);
    }
    // the pilot: an orb invader inside the dome, then a glint across the glass in front of it
    var PIL = px('#ff5cc8');
    artEach(ART.orb[0], Math.round(cx - 6), Math.round(cy - 14), 1, function (x, y) { B.set(x, y, PIL); });
    B.set(Math.round(cx - 10), Math.round(cy - 9), px('#c8f6ff')); B.set(Math.round(cx - 9), Math.round(cy - 11), px('#c8f6ff')); B.set(Math.round(cx - 8), Math.round(cy - 13), px('#c8f6ff')); B.set(Math.round(cx - 6), Math.round(cy - 15), px('#c8f6ff'));
    // the antenna
    for (var a = 1; a <= 4; a++) B.set(Math.round(cx), Math.round(cy - 17 - a), STEEL[3]);
    L.mother.ant = { x: Math.round(cx), y: Math.round(cy - 22) };
    for (var k = -3; k <= 3; k++) L.mother.ports.push({ x: Math.round(cx + k * 8) - 1, y: Math.round(cy) - 1 });
    [-18, 0, 18].forEach(function (o) { L.mother.emit.push({ x: Math.round(cx + o) - 1, y: Math.round(cy + ry) - (o ? 1 : 0) }); });
  }

  // ---- the hangar: the bay behind the drop targets, a striped deck with the saucer's hole in it
  function paintHangar() {
    var B = L.bg, P = T.pocket, S = T.saucer, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    P.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    var D1 = px('#12152c'), D2 = px('#1b2042'), HZ = px('#6b5a12'), HOLE = px('#010104'), HOLE2 = px('#0b0b1c');
    for (var y = Math.floor(y0); y <= y1; y++) for (var x = Math.floor(x0); x <= x1; x++) {
      if (!inPoly(x + 0.5, y + 0.5, P)) continue;
      B.set(x, y, (x + y) % 7 < 3 ? D2 : D1);
    }
    // a hazard ring round the saucer, then the hole
    for (y = Math.floor(S.y - 12); y <= S.y + 12; y++) for (x = Math.floor(S.x - 12); x <= S.x + 12; x++) {
      var d = Math.sqrt((x + 0.5 - S.x) * (x + 0.5 - S.x) + (y + 0.5 - S.y) * (y + 0.5 - S.y));
      if (d < 6.6) B.set(x, y, d < 5 ? HOLE : HOLE2);
      else if (d < 11 && d > 9.5 && ((x + y) >> 1) % 2 === 0) B.set(x, y, HZ);
    }
  }

  // ---- the shooter lane's floor, with dim arrows pointing up
  function paintShooterLane() {
    var B = L.bg, S = T.shooter, F1 = px('#090a1c'), F2 = px('#0d0f26'), AR = px('#1e2350');
    for (var y = 0; y < TH; y++) for (var x = S.x0 + 2; x < S.x1 - 1; x++) {
      if (!inField(x + 0.5, y + 0.5) || y < 150) continue;
      B.set(x, y, bay(x, y) < 0.5 ? F1 : F2);
    }
    [250, 286, 322].forEach(function (ay) {
      for (var i = 0; i < 6; i++) { B.set(S.cx - i - 1, ay + i, AR); B.set(S.cx + i, ay + i, AR); B.set(S.cx - i - 1, ay + i + 1, AR); B.set(S.cx + i, ay + i + 1, AR); }
    });
  }

  // ---- the apron along the bottom: under the inlane guides and round the drain, with our name on it
  function paintApron() {
    var B = L.bg, M = T.MID, F = T.flippers[0], fl = null;
    T.walls.forEach(function (w) { if (w[1] < w[3] && w[0] < w[2] && w[2] < M && w[3] > 360 && Math.abs(w[2] - F.x) < 20) fl = w; });   // the left inlane's floor
    if (!fl) fl = [24, 380, 70, 399];
    var gap = 15, tipY = F.y + Math.sin(F.rest) * F.len + 7;
    var left = [[fl[0], fl[1] + 3], [fl[2], fl[3] + 3], [F.x + 2, F.y + 8], [M - gap - 6, tipY + 3], [M - gap, tipY + 6], [M - gap, TH + 1], [fl[0], TH + 1]];
    var right = left.map(function (p) { return [2 * M - p[0], p[1]]; });
    var BODY = ramp(['#151127', '#1c1733', '#241d40']), EDGE = px('#6d62b0'), EDGE2 = px('#3a3266'), DRAIN = px('#020206');
    for (var y = 370; y < TH; y++) for (var x = 0; x < T.shooter.x0; x++) {
      var cx = x + 0.5, cy = y + 0.5, l = inPoly(cx, cy, left), r = !l && inPoly(cx, cy, right);
      if (!l && !r) { if (Math.abs(cx - M) < gap && cy > tipY + 6) B.set(x, y, DRAIN); continue; }
      var poly = l ? left : right, up = !inPoly(cx, cy - 1, poly), up2 = !inPoly(cx, cy - 2, poly);
      B.set(x, y, up ? EDGE : up2 ? EDGE2 : pick(BODY, (cy - 380) / 70 + (bay(x, y) - 0.5) * 0.3));
    }
    var GOLD = px('#ffc94a'), GOLD2 = px('#8a6420');
    function word(s, cx, y) {
      var w = measure(F5, s, 1), x = Math.round(cx - w / 2);
      letters(F5, s, x + 1, y + 1, 1, function (a, b) { B.set(a, b, GOLD2); });
      letters(F5, s, x, y, 1, function (a, b) { B.set(a, b, GOLD); });
    }
    word('365', (fl[0] + M - gap) / 2 - 4, TH - 11);
    word('HERO', 2 * M - ((fl[0] + M - gap) / 2 - 4), TH - 11);
  }

  // ---- the warp ramp's shadow on the playfield (the higher it is, the further the shadow falls)
  function paintRampShadow() {
    var B = L.bg, R = E.RAMP, hw = T.ramp.width / 2 - 1, mark = new Uint8Array(TW * TH);
    for (var s = 0; s <= R.L; s += 1) {
      var p = E.rampAt(s); if (p.z < 3) continue;
      var sx = p.x + p.z * 0.2, sy = p.y + p.z * 0.28;
      for (var y = Math.floor(sy - hw); y <= sy + hw; y++) for (var x = Math.floor(sx - hw); x <= sx + hw; x++) {
        if (x < 0 || y < 0 || x >= TW || y >= TH) continue;
        if ((x + 0.5 - sx) * (x + 0.5 - sx) + (y + 0.5 - sy) * (y + 0.5 - sy) <= hw * hw) mark[y * TW + x] = 1;
      }
    }
    for (var i = 0; i < mark.length; i++) if (mark[i]) B.p[i] = darker(B.p[i], 0.62);
  }

  // ---------------------------------------------------------------- the inserts: lights set into the playfield
  // Each is built three ways: unlit (baked into the background), lit, and flashing white.
  function rrect(cx, cy, w, h, r) {
    return function (x, y) {
      var dx = Math.abs(x - cx) - (w / 2 - r), dy = Math.abs(y - cy) - (h / 2 - r);
      if (Math.abs(x - cx) > w / 2 || Math.abs(y - cy) > h / 2) return false;
      return dx <= 0 || dy <= 0 || dx * dx + dy * dy <= r * r;
    };
  }
  function circle(cx, cy, r) { return function (x, y) { return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r; }; }
  function arrow(cx, cy, dx, dy, len, wid) {
    var l = Math.sqrt(dx * dx + dy * dy); dx /= l; dy /= l;
    var nx = -dy, ny = dx, h = len / 2, hb = h - len * 0.5, sw = wid * 0.24;
    var P = [[cx + dx * h, cy + dy * h], [cx + dx * hb + nx * wid / 2, cy + dy * hb + ny * wid / 2], [cx + dx * hb + nx * sw, cy + dy * hb + ny * sw],
      [cx - dx * h + nx * sw, cy - dy * h + ny * sw], [cx - dx * h - nx * sw, cy - dy * h - ny * sw], [cx + dx * hb - nx * sw, cy + dy * hb - ny * sw],
      [cx + dx * hb - nx * wid / 2, cy + dy * hb - ny * wid / 2]];
    return function (x, y) { return inPoly(x, y, P); };
  }
  function artMask(rows, x0, y0, k) { return function (x, y) { var c = Math.floor((x - x0) / k), r = Math.floor((y - y0) / k); return r >= 0 && r < rows.length && c >= 0 && c < rows[r].length && rows[r].charAt(c) === '#'; }; }
  function insert(id, mask, x0, y0, x1, y1, col, opt) {
    opt = opt || {};
    var b0 = box(x0 - 3, y0 - 3, x1 + 3, y1 + 3), w = b0.w, h = b0.h, M = new Uint8Array(w * h), i, x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) M[y * w + x] = mask(b0.ox + x + 0.5, b0.oy + y + 0.5) ? 1 : 0;
    function m(x, y) { return x >= 0 && y >= 0 && x < w && y < h && M[y * w + x]; }
    var states = { off: b0, on: box(x0 - 3, y0 - 3, x1 + 3, y1 + 3), hot: box(x0 - 3, y0 - 3, x1 + 3, y1 + 3) };
    var C = {
      off: { rim: px(mix(col, '#000000', 0.84)), body: px(mix(col, '#05041a', 0.7)), top: px(mix(col, '#05041a', 0.55)), label: px(mix(col, '#05041a', 0.45)) },
      on: { rim: px(mix(col, '#000000', 0.35)), body: px(col), top: px(mix(col, '#ffffff', 0.55)), label: px(mix(col, '#000000', 0.72)), halo: px(mix(col, '#000000', 0.25)) },
      hot: { rim: px(mix(col, '#ffffff', 0.4)), body: px('#ffffff'), top: px('#ffffff'), label: px(mix(col, '#000000', 0.3)), halo: px(col) }
    };
    var lab = {};
    (opt.labels || []).forEach(function (Lb) {
      var lx = Math.round(Lb.x - measure(F3, Lb.s, 1) / 2), ly = Math.round(Lb.y);
      letters(F3, Lb.s, lx, ly, 1, function (a, b) { lab[(b - b0.oy) * w + (a - b0.ox)] = 1; });
    });
    ['off', 'on', 'hot'].forEach(function (k) {
      var B = states[k], c = C[k];
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        i = y * w + x;
        if (M[i]) {
          var edge = opt.rim !== false && (!m(x - 1, y) || !m(x + 1, y) || !m(x, y - 1) || !m(x, y + 1));
          var col_ = edge ? c.rim : (!m(x, y - 1) || !m(x, y - 2)) && !opt.flat ? c.top : c.body;
          if (lab[i]) col_ = c.label;
          B.p[i] = col_;
        } else if (opt.outline && (m(x - 1, y) || m(x + 1, y) || m(x, y - 1) || m(x, y + 1) || m(x - 1, y - 1) || m(x + 1, y + 1) || m(x + 1, y - 1) || m(x - 1, y + 1))) B.p[i] = INK;
        else if (c.halo && (m(x - 1, y) || m(x + 1, y) || m(x, y - 1) || m(x, y + 1) || (opt.outline && (m(x - 2, y) || m(x + 2, y) || m(x, y - 2) || m(x, y + 2)))) && ((x + y) & 1)) B.p[i] = c.halo;
      }
      if (k !== 'off') B.done();
    });
    if (opt.bake !== false) stampInto(L.bg, states.off);
    var I = { id: id, on: states.on, hot: states.hot };
    L.ins[id] = I;
    return I;
  }
  function makeInserts() {
    L.ins = {};
    var S = {}, M = T.MID;
    T.sensors.circles.forEach(function (c) { S[c[0]] = c; });
    // the top lanes: a round light under each lane (the lane guides' foot + 9)
    var guideFoot = 0;
    T.walls.forEach(function (w) { if (w[6] === 'post') guideFoot = Math.max(guideFoot, w[1], w[3]); });
    [0, 1, 2].forEach(function (i) {
      var c = S['lane' + i], y = guideFoot + 9;
      insert('lane' + i, circle(c[1], y, 4), c[1] - 4, y - 4, c[1] + 4, y + 4, '#ffd84a');
      insert('skill' + i, circle(c[1], y, 4), c[1] - 4, y - 4, c[1] + 4, y + 4, '#5cff6b', { bake: false });
    });
    // the shot arrows: the warp ramp, the hangar, both orbits
    var en = T.ramp.entry, rx = (en.x0 + en.x1) / 2;
    insert('ramp', arrow(rx, en.y + 31, 0, -1, 19, 13), rx - 7, en.y + 21, rx + 7, en.y + 41, '#ff5cc8', { labels: [] });
    var D = E.DROPS, d0 = D[0], d4 = D[D.length - 1], mx = (d0.ax + d4.bx) / 2, my = (d0.ay + d4.by) / 2, fx = d0.fx, fy = d0.fy;
    var hx = mx + fx * 27, hy = my + fy * 27;
    insert('hangar', arrow(hx, hy, -fx, -fy, 17, 12), hx - 10, hy - 10, hx + 10, hy + 10, '#5cff6b');
    var ow = null, og = null;   // the left orbit's inner wall (an upright wall high on the left) and the gate at its foot
    T.walls.forEach(function (w) { if (w[0] === w[2] && w[0] > 12 && w[0] < M - 40 && Math.min(w[1], w[3]) < 200) ow = w; });
    T.gates.forEach(function (g) { if (Math.max(g[0], g[2]) < M && Math.min(g[1], g[3]) > 180) og = g; });
    var ox = ow ? ow[0] : 30, oy = ow ? Math.max(ow[1], ow[3]) : 214, gy = og ? Math.min(og[1], og[3]) : oy + 48;
    var mY = (oy + gy) / 2, ax_ = ox + 17, ay_ = Math.max(mY + 20, gy - 2), adx = ox - ax_, ady = mY - ay_, al = Math.sqrt(adx * adx + ady * ady);
    insert('orbitL', arrow(ax_, ay_, adx / al, ady / al, 17, 12), ax_ - 10, ay_ - 10, ax_ + 10, ay_ + 10, '#3fe0ff');
    insert('orbitR', arrow(2 * M - ax_, ay_, -adx / al, ady / al, 17, 12), 2 * M - ax_ - 10, ay_ - 10, 2 * M - ax_ + 10, ay_ + 10, '#3fe0ff');
    // the bonus multiplier: 2X 3X 4X 5X in a row above the slings
    var sl = T.slings[0], my2 = sl.a[1] - 20;
    [2, 3, 4, 5].forEach(function (n, k) {
      var cx = M + (k - 1.5) * 14;
      insert('mult' + n, rrect(cx, my2, 12, 9, 2), cx - 6, my2 - 5, cx + 6, my2 + 5, '#ff9a2e', { labels: [{ s: n + 'X', x: cx + 0.5, y: my2 - 2 }], flat: true });
    });
    // the hero's ship: lights up while the ball save is on
    var shipY = sl.a[1] + 6;
    insert('hero', artMask(ART.ship, M - 13, shipY, 2), M - 13, shipY, M + 13, shipY + 16, '#5cff6b', { rim: false, outline: true });
    // SHOOT AGAIN, between the flippers
    var F = T.flippers[0], sy = F.y - 9;
    insert('save', rrect(M, sy, 25, 15, 3), M - 13, sy - 8, M + 13, sy + 8, '#ff4a4a', { labels: [{ s: 'SHOOT', x: M + 0.5, y: sy - 5.5 }, { s: 'AGAIN', x: M + 0.5, y: sy + 0.5 }], flat: true });
    // the kickback, in the left outlane
    var kx = S.kick ? S.kick[1] : 15, ky = S.outL ? S.outL[2] - 26 : 366;
    insert('kick', arrow(kx, ky, 0, -1, 14, 10), kx - 6, ky - 8, kx + 6, ky + 8, '#ff4a4a');
  }

  // ---------------------------------------------------------------- the walls: neon-lit metal guides, rubber posts, the arch
  function makeWalls() {
    var B = new Buf(0, 0, TW, TH), F = [], A = T.arch, i;
    T.walls.forEach(function (w) { F.push({ k: w[6] === 'post' || w[6] === 'rubber' ? w[6] : 'wall', ax: w[0], ay: w[1], bx: w[2], by: w[3], r: w[4] }); });
    T.posts.forEach(function (p) { F.push({ k: 'rpost', ax: p[0], ay: p[1], bx: p[0], by: p[1], r: p[2] + 0.6 }); });
    F.forEach(function (f) { f.x0 = Math.min(f.ax, f.bx) - f.r - 3; f.x1 = Math.max(f.ax, f.bx) + f.r + 3; f.y0 = Math.min(f.ay, f.by) - f.r - 3; f.y1 = Math.max(f.ay, f.by) + f.r + 3; });
    var GLOW = { wall: NEON, post: NEON2, arch: NEON, rpost: 0, rubber: 0 };
    var CAP = px('#ff5cc8');
    for (var y = 0; y < TH; y++) for (var x = 0; x < TW; x++) {
      var cx = x + 0.5, cy = y + 0.5, best = 1e9, bf = null, bn = null, q;
      for (i = 0; i < F.length; i++) {
        var f = F[i]; if (cx < f.x0 || cx > f.x1 || cy < f.y0 || cy > f.y1) continue;
        q = near(cx, cy, f.ax, f.ay, f.bx, f.by);
        if (q.d - f.r < best) { best = q.d - f.r; bf = f; bn = q; }
      }
      if (cy < A.y + 0.5) {   // the arch: the top half of a ring
        var dx = cx - A.x, dy = cy - A.y, dd = Math.sqrt(dx * dx + dy * dy), off = dd - A.R;
        if (Math.abs(off) - A.r < best) { best = Math.abs(off) - A.r; bf = { k: 'arch', r: A.r }; bn = { d: Math.abs(off), nx: off >= 0 ? dx / dd : -dx / dd, ny: off >= 0 ? dy / dd : -dy / dd }; }
      }
      if (!bf) continue;
      if (best <= 0) {
        var s = Math.min(1, bn.d / (bf.r + 0.01)), lum = shade(bn.nx, bn.ny, s);
        if (bf.k === 'rpost') B.set(x, y, bn.d < 1.1 ? STEEL[2] : pick(RUBBER, lum * 1.1));
        else if (bf.k === 'rubber') B.set(x, y, pick(RUBBER, lum * 1.15));
        else B.set(x, y, pick(STEEL, lum * 1.05));
        if (bf.k === 'post' && bn.t !== undefined && (bn.t === 0 || bn.t === 1) && bn.d < bf.r - 0.4 && lum > 0.5) B.set(x, y, CAP);
      } else if (best <= 1.15 && GLOW[bf.k]) B.set(x, y, GLOW[bf.k]);
      else if (best <= 1.15 && (bf.k === 'rpost' || bf.k === 'rubber')) B.set(x, y, INK);
    }
    // the gates (thin flaps on a hinge)
    var GATE = px('#d8e2ff'), HINGE = STEEL[1];
    E.GATES.forEach(function (g) {
      for (var yy = Math.floor(Math.min(g.ay, g.by) - 2); yy <= Math.max(g.ay, g.by) + 2; yy++) for (var xx = Math.floor(Math.min(g.ax, g.bx) - 2); xx <= Math.max(g.ax, g.bx) + 2; xx++) {
        if (near(xx + 0.5, yy + 0.5, g.ax, g.ay, g.bx, g.by).d <= 0.75) B.set(xx, yy, GATE);
      }
      B.set(Math.round(g.ax), Math.round(g.ay), HINGE); B.set(Math.round(g.ax) - 1, Math.round(g.ay), HINGE);
    });
    // rollover switches: a short wire in each lane; the right orbit's rollover is a dotted line across it
    var WIRE = px('#9aa8d8'), WIRE2 = px('#e6ecff');
    T.sensors.circles.forEach(function (c) {
      var x0 = Math.round(c[1]), y0 = Math.round(c[2]);
      if (c[0] === 'kick') return;
      for (var k = -3; k <= 3; k++) B.set(x0, y0 + k, k === -3 ? WIRE2 : WIRE);
    });
    T.sensors.lines.forEach(function (l) {
      if (l[0] === 'spin') return;
      for (var xx = Math.round(Math.min(l[1], l[3])) + 1; xx < Math.max(l[1], l[3]) - 1; xx += 2) B.set(xx, Math.round(l[2]), WIRE);
    });
    // the comet spinner's bracket, across the left orbit
    T.sensors.lines.forEach(function (l) {
      if (l[0] !== 'spin') return;
      var yy = Math.round(l[2]);
      [Math.round(l[1]), Math.round(l[3]) - 1].forEach(function (xx) { B.set(xx, yy - 1, STEEL[4]); B.set(xx, yy, STEEL[3]); B.set(xx, yy + 1, STEEL[1]); });
      L.spin = { x0: Math.round(l[1]) + 1, x1: Math.round(l[3]) - 2, y: yy };
    });
    // the kickback in the foot of the left outlane
    var K = null; T.sensors.circles.forEach(function (c) { if (c[0] === 'kick') K = c; });
    if (K) {
      var kx = Math.round(K[1]), ky = Math.round(K[2]) + 10;
      for (var yy = ky; yy < Math.min(TH, ky + 8); yy++) for (var xx = kx - 4; xx <= kx + 4; xx++) B.set(xx, yy, yy === ky ? STEEL[4] : xx === kx - 4 ? STEEL[3] : xx === kx + 4 ? STEEL[0] : STEEL[2]);
      L.kickPad = { x: kx - 3, y: ky - 2, w: 7 };
    }
    // the saucer's steel rim
    var SA = T.saucer;
    for (yy = Math.floor(SA.y - 9); yy <= SA.y + 9; yy++) for (xx = Math.floor(SA.x - 9); xx <= SA.x + 9; xx++) {
      var ex = xx + 0.5 - SA.x, ey = yy + 0.5 - SA.y, d = Math.sqrt(ex * ex + ey * ey);
      if (d >= 6.4 && d <= 8.6) B.set(xx, yy, pick(STEEL, 0.25 + 0.75 * Math.max(0, (-ex * 0.55 - ey * 0.8) / d) + (d < 7.2 ? -0.2 : 0)));
    }
    L.walls = B.done();
  }
  function makeSaucerRing() {   // the saucer's rim, lit
    var SA = T.saucer, B = box(SA.x - 10, SA.y - 10, SA.x + 10, SA.y + 10), C1 = px('#5cff6b'), C2 = px('#e8ffe8');
    for (var y = B.oy; y < B.oy + B.h; y++) for (var x = B.ox; x < B.ox + B.w; x++) {
      var d = Math.sqrt((x + 0.5 - SA.x) * (x + 0.5 - SA.x) + (y + 0.5 - SA.y) * (y + 0.5 - SA.y));
      if (d >= 6.4 && d <= 8.6) B.set(x, y, d < 7.4 ? C2 : C1); else if (d > 8.6 && d < 10 && ((x + y) & 1)) B.set(x, y, C1);
    }
    L.saucerLit = B.done();
  }

  // ---------------------------------------------------------------- the warp ramp: a see-through dithered band with rails
  function makeRamp() {
    var R = E.RAMP, P = R.P, hw = T.ramp.width / 2, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    P.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    var norm = box(x0 - hw - 1, y0 - hw - 1, x1 + hw + 1, y1 + hw + 1), lit = box(x0 - hw - 1, y0 - hw - 1, x1 + hw + 1, y1 + hw + 1);
    var RAIL = px('#c6f1ff'), RAIL2 = px('#3d8fd6'), LIP = px('#ffffff'), SKIN = px('#8edcff'), SKIN2 = px('#2a6cc4');
    var CHEV = px('#9c8230'), CHEVL = px('#ffe066'), RAILL = px('#ffffff'), SKINL = px('#c8f0ff');
    // the chevrons along it, pointing the way up: each one stamped square to the ramp where it sits
    var chev = [];
    for (var cs = 24; cs < R.L - 22; cs += 28) { var r0 = E.rampAt(cs); chev.push({ s: cs, x: r0.x, y: r0.y, tx: r0.tx, ty: r0.ty }); }
    var SG = [];   // the path's pieces, measured once
    for (var j = 1; j < P.length; j++) {
      var a = P[j - 1], b = P[j], dx = b[0] - a[0], dy = b[1] - a[1], l = R.s[j] - R.s[j - 1];
      SG.push({ ax: a[0], ay: a[1], dx: dx, dy: dy, l2: dx * dx + dy * dy || 1, l: l, s0: R.s[j - 1], z0: a[2], dz: b[2] - a[2], first: j === 1, last: j === P.length - 1 });
    }
    for (var y = norm.oy; y < norm.oy + norm.h; y++) for (var x = norm.ox; x < norm.ox + norm.w; x++) {
      var cx = x + 0.5, cy = y + 0.5, best = 1e9, bs = 0, bz = 0, bad = false;
      for (var i = 0; i < SG.length; i++) {
        var G = SG[i], raw = ((cx - G.ax) * G.dx + (cy - G.ay) * G.dy) / G.l2, t = raw < 0 ? 0 : raw > 1 ? 1 : raw;
        var ex = cx - G.ax - G.dx * t, ey = cy - G.ay - G.dy * t, d2 = ex * ex + ey * ey;
        if (d2 < best) {
          best = d2; bs = G.s0 + G.l * t; bz = G.z0 + G.dz * t;
          bad = (G.first && raw < 0) || (G.last && raw > 1);   // square ends: nothing beyond the entrance and the exit
        }
      }
      best = Math.sqrt(best);
      if (best > hw || bad) continue;
      var c = 0, cl = 0, bb = bay(x, y);
      if (best > hw - 1.2) { c = RAIL; cl = RAILL; }
      else if (best > hw - 2.3) { c = RAIL2; cl = RAIL; }
      else {
        // see-through plastic: a sparse screen of dots, a little denser the higher it climbs
        var cov = 0.19 + 0.13 * Math.min(1, bz / 40);
        if (bb < 0.07) { c = SKIN; cl = SKINL; } else if (bb < cov) { c = SKIN2; cl = SKIN2; }
        for (var k = 0; k < chev.length; k++) {
          var C = chev[k]; if (Math.abs(bs - C.s) > 12) continue;
          var ux = cx - C.x, uy = cy - C.y, u = ux * C.tx + uy * C.ty, v = Math.abs(-ux * C.ty + uy * C.tx);
          if (v < 6.5 && Math.abs(u - (2.5 - v * 0.85)) < 1.15) { c = CHEV; cl = CHEVL; }
        }
      }
      if (bs < 1.2 || bs > R.L - 1.2) { c = LIP; cl = LIP; }
      if (c) norm.set(x, y, c);
      if (cl) lit.set(x, y, cl);
    }
    L.ramp = norm.done(); L.rampLit = lit.done();
  }

  // ---------------------------------------------------------------- the slingshots: white rubber, a pink band on the kicking face
  function makeSlings() {
    L.sling = [];
    var r = 2.5;
    E.WALLS.forEach(function (w) { if (w.kind === 'sling') r = w.r; });
    T.slings.forEach(function (S) {
      var pts = [S.a, S.b, S.c], segs = [[S.a, S.b, 0], [S.b, S.c, 0], [S.a, S.c, 1]];
      var x0 = Math.min(S.a[0], S.b[0], S.c[0]) - r - 2, x1 = Math.max(S.a[0], S.b[0], S.c[0]) + r + 2;
      var y0 = Math.min(S.a[1], S.b[1], S.c[1]) - r - 2, y1 = Math.max(S.a[1], S.b[1], S.c[1]) + r + 2;
      var out = [];
      [0, 1].forEach(function (lit) {
        var B = box(x0, y0, x1, y1);
        var BAND = px(lit ? '#ffe07a' : '#ff3d7f'), BODY = ramp(lit ? ['#ff5cc8', '#ffa8ea'] : ['#2c0c3c', '#4a1660']), BOLT = px(lit ? '#ffffff' : '#c040b0');
        for (var y = B.oy; y < B.oy + B.h; y++) for (var x = B.ox; x < B.ox + B.w; x++) {
          var cx = x + 0.5, cy = y + 0.5, best = 1e9, bq = null, face = 0;
          segs.forEach(function (s) { var q = near(cx, cy, s[0][0], s[0][1], s[1][0], s[1][1]); if (q.d < best) { best = q.d; bq = q; face = s[2]; } });
          if (best <= r) {
            var sv = best / r, c = pick(RUBBER, shade(bq.nx, bq.ny, sv) * 1.15 + (lit ? 0.4 : 0));
            if (face && sv < 0.5) c = BAND;
            B.set(x, y, c);
          } else if (inPoly(cx, cy, pts)) {
            var fd = near(cx, cy, S.a[0], S.a[1], S.c[0], S.c[1]).d;
            B.set(x, y, fd < 6.5 && fd > 4.5 ? BOLT : pick(BODY, Math.floor(fd / 2.5) % 2 ? 0.2 : 0.8));
          } else if (best <= r + 1) B.set(x, y, INK);
        }
        out.push(B.done());
      });
      L.sling.push(out);
    });
  }

  // ---------------------------------------------------------------- the pop bumpers: glowing orbs (dim, glowing, struck)
  function makeBumpers() {
    L.bump = T.bumpers.map(function (b, i) {
      var C = ORB[i % ORB.length], R = b[2];
      return [0, 1, 2].map(function (st) {
        var B = box(b[0] - R - 4, b[1] - R - 4, b[0] + R + 4, b[1] + R + 4);
        var BODY = ramp([mix(C, '#000000', 0.82), mix(C, '#000000', 0.62), mix(C, '#000000', 0.4), mix(C, '#000000', 0.15), C, mix(C, '#ffffff', 0.55), '#ffffff']);
        var RING = st === 2 ? ramp(['#ffffff', mix(C, '#ffffff', 0.5)]) : ramp(['#1b1838', '#3a3f6a', '#6b78ad']), HALO = px(st === 2 ? C : mix(C, '#000000', 0.45));
        for (var y = B.oy; y < B.oy + B.h; y++) for (var x = B.ox; x < B.ox + B.w; x++) {
          var dx = x + 0.5 - b[0], dy = y + 0.5 - b[1], d = Math.sqrt(dx * dx + dy * dy);
          if (d <= R) {
            if (d > R - 1.6) { B.set(x, y, pick(RING, st === 2 ? (d > R - 0.8 ? 0.9 : 0.1) : 0.5 + (-dx * 0.42 - dy * 0.62) / d * 0.5)); continue; }
            var s = d / (R - 1.6), lum = shade(dx / (d || 1), dy / (d || 1), s);
            lum = lum * 0.82 + (st === 0 ? -0.08 : st === 1 ? 0.06 : 0.38) + (bay(x, y) - 0.5) * 0.18;
            if (d < 2.6 && st > 0) lum += 0.3;   // the hot core
            B.set(x, y, pick(BODY, lum));
          } else if (st > 0) {
            var e = d - R, reach = st === 2 ? 4 : 2;
            if (e < reach && bay(x, y) < (1 - e / reach) * (st === 2 ? 0.85 : 0.45)) B.set(x, y, HALO);
          }
        }
        return B.done();
      });
    });
  }

  // ---------------------------------------------------------------- the five drop targets: invaders standing guard on a steel bank
  function makeDrops() {
    L.drops = E.DROPS.map(function (D, i) {
      var kind = DROPKIND[i % DROPKIND.length], C = DROPCOL[kind], mx = (D.ax + D.bx) / 2, my = (D.ay + D.by) / 2;
      var ix = Math.round(mx - 6 - D.fx * 3.5), iy = Math.round(my - 4 - D.fy * 3.5);
      var x0 = Math.min(D.ax, D.bx, ix) - D.r - 2, x1 = Math.max(D.ax, D.bx, ix + 12) + D.r + 2, y0 = Math.min(D.ay, D.by, iy) - D.r - 2, y1 = Math.max(D.ay, D.by, iy + 8) + D.r + 2;
      function strip(B, down) {
        for (var y = B.oy; y < B.oy + B.h; y++) for (var x = B.ox; x < B.ox + B.w; x++) {
          var q = near(x + 0.5, y + 0.5, D.ax, D.ay, D.bx, D.by);
          if (q.d > D.r + 0.3) continue;
          if (down) B.set(x, y, q.d > D.r - 0.7 ? STEEL[1] : px('#04040c'));
          else B.set(x, y, pick(STEEL, shade(q.nx, q.ny, Math.min(1, q.d / D.r)) * 0.9));
        }
      }
      function figure(B, rows, col) {   // the invader with a dark outline, so it reads over the steel and the sky
        artEach(rows, ix, iy, 1, function (x, y) { for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) if (!isArt(rows, x + a - ix, y + b - iy)) B.set(x + a, y + b, INK); });
        artEach(rows, ix, iy, 1, function (x, y) { B.set(x, y, col); });
      }
      var up = [0, 1].map(function (f) { var B = box(x0, y0, x1, y1); strip(B, false); figure(B, ART[kind][f], px(C)); return B.done(); });
      var down = box(x0, y0, x1, y1); strip(down, true); down.done();
      var boom = box(x0, y0, x1, y1); strip(boom, true); artEach(ART.boom, ix, iy, 1, function (x, y) { boom.set(x, y, px('#ffffff')); }); boom.done();
      return { up: up, down: down, boom: boom };
    });
  }
  function isArt(rows, c, r) { return r >= 0 && r < rows.length && c >= 0 && c < rows[r].length && rows[r].charAt(c) === '#'; }

  // ---------------------------------------------------------------- the ball: a shiny steel ball (and bigger ones up on the ramp)
  function makeBalls() {
    var BALLC = ramp(['#1d2036', '#3c4262', '#666e93', '#9aa2c4', '#cdd3ea', '#f4f6ff', '#ffffff']), RIM = px('#121426'), SKY = px('#5c74c8');
    L.ball = {}; L.shadow = {};
    for (var r = E.BALL; r <= E.BALL + 3; r++) {
      var n = 2 * r + 1, B = new Buf(0, 0, n, n), S = new Buf(0, 0, n, n);
      for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
        var dx = (x + 0.5 - (r + 0.5)) / (r + 0.3), dy = (y + 0.5 - (r + 0.5)) / (r + 0.3), d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) continue;
        if (bay(x, y) < 0.75) S.p[y * n + x] = px('#000004');
        if (d > 0.9) { B.p[y * n + x] = RIM; continue; }
        var lum = shade(dx / (d || 1), dy / (d || 1), d), c = pick(BALLC, lum * 1.05 + (bay(x, y) - 0.5) * 0.16);
        if (dy > 0.45 && d > 0.55 && d < 0.85 && bay(x, y) < 0.4) c = SKY;   // the space it reflects
        if (dx > -0.62 && dx < -0.18 && dy > -0.66 && dy < -0.22) c = BALLC[6];   // the shine
        B.p[y * n + x] = c;
      }
      L.ball[r] = B.done(); L.shadow[r] = S.done();
    }
  }

  // ---------------------------------------------------------------- a flipper, built once for each whole degree it is drawn at
  function flipSprite(f, deg) {
    var key = f.side + ':' + deg, S = L.flip[key];
    if (S) return S;
    var a = deg * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), tx = f.x + ux * f.len, ty = f.y + uy * f.len;
    var B = box(Math.min(f.x - f.r0, tx - f.r1) - 1, Math.min(f.y - f.r0, ty - f.r1) - 1, Math.max(f.x + f.r0, tx + f.r1) + 1, Math.max(f.y + f.r0, ty + f.r1) + 1);
    var BODY = ramp(['#6f78a8', '#a9b2dc', '#dfe5fb', '#ffffff']), RUB = ramp(['#8e0f33', '#e0204e', '#ff5a7e']), PIV = px('#2a2f52'), PIV2 = px('#8f9ccf');
    for (var y = B.oy; y < B.oy + B.h; y++) for (var x = B.ox; x < B.ox + B.w; x++) {
      var dx = x + 0.5 - f.x, dy = y + 0.5 - f.y, t = (dx * ux + dy * uy) / f.len;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      var qx = f.x + ux * f.len * t, qy = f.y + uy * f.len * t, rr = f.r0 + (f.r1 - f.r0) * t, ex = x + 0.5 - qx, ey = y + 0.5 - qy, d = Math.sqrt(ex * ex + ey * ey);
      if (d > rr) continue;
      var nx = d ? ex / d : 0, ny = d ? ey / d : -1, lum = shade(nx, ny, d / rr);
      var c = rr - d < 1.3 ? pick(RUB, lum * 1.3) : pick(BODY, lum * 1.1 + 0.1);
      var pd = Math.sqrt(dx * dx + dy * dy);
      if (pd < 2.2) c = pd < 1.2 ? PIV2 : PIV;
      B.set(x, y, c);
    }
    L.flip[key] = B.done();
    return L.flip[key];
  }

  // ================================================================ the dot-matrix display
  var DOT = ['#2a1404', '#6e3608', '#c06a10', '#ffb21e', '#ffe39a'].map(px), GAP = px('#0c0603'), BEZ = px('#2a2238'), GLOWD = px('#4a2406');
  var dmd = { B: null, dots: new Uint8Array(DW * DH), key: '' };
  function dmdItems(W, t, mode, info) {
    var it = [], key, fmt = E.fmt, m = W.dmd;
    function put(s, F, k, y, lv, align, x) { it.push({ s: String(s), F: F, k: k, y: y, lv: lv, align: align || 'c', x: x }); }
    var reveal = 99;
    if (mode === 'title') {
      var alt = Math.floor(t / 2600) % 2;
      put('365 PINBALL HERO', F5, 1, 1, 4); put(alt ? (W.tableId && W.tableId !== 'orbit' ? theme(W.tableId).word : 'DEFEND THE PLANET') : 'BEST ' + fmt(info && info.best || 0), F3, 1, 10, 2);
      key = 't' + alt + (info && info.best);
    } else if (mode === 'over' || W.over) {
      var ph = Math.floor(t / 2200) % 2;
      if (!ph) put('GAME OVER', F5, 2, 1, 4);
      else { put('FINAL SCORE', F3, 1, 1, 3); put(fmt(W.score), F5, 1, 8, 4); }
      key = 'o' + ph + W.score;
    } else if (m) {
      reveal = (m.n + 1) * 10;
      var big = String(m.big || ''), small = String(m.small || '');
      if (small) { put(big, F5, 1, 1, 4); put(small, F3, 1, 10, 3); }
      else if (measure(F5, big, 2) <= DW - 4) put(big, F5, 2, 1, 4);
      else put(big, F5, 1, 4, 4);
      key = 'm' + big + '|' + small + '|' + Math.min(99, reveal);
    } else {
      put('BALL ' + W.ball, F3, 1, 2, 4, 'l', 2);
      if (W.mult > 1) put('X' + W.mult, F3, 1, 9, 4, 'l', 2);
      var sc = fmt(W.score), wide = measure(F5, sc, 2) <= DW - 30;
      if (wide) put(sc, F5, 2, 1, 4, 'c', 81); else put(sc, F5, 1, 4, 4, 'c', 81);
      key = 'n' + W.ball + '|' + W.mult + '|' + sc;
    }
    return { items: it, reveal: reveal, key: key };
  }
  function drawDmd(g, W, t, mode, info) {
    var spec = dmdItems(W, t, mode, info);
    if (spec.key !== dmd.key || !dmd.B) {
      dmd.key = spec.key;
      var D = dmd.dots; D.fill(0);
      spec.items.forEach(function (o) {
        var w = measure(o.F, o.s, o.k), x = o.align === 'l' ? o.x : Math.round((o.x != null ? o.x : DW / 2) - w / 2);
        letters(o.F, o.s, x, o.y, o.k, function (a, b) { if (a >= 0 && b >= 0 && a < DW && b < DH && Math.abs(a - DW / 2) <= spec.reveal) D[b * DW + a] = Math.max(D[b * DW + a], o.lv); });
      });
      if (!dmd.B) dmd.B = new Buf(0, -OY, TW, OY);
      var B = dmd.B, p = B.p;
      for (var i = 0; i < p.length; i++) p[i] = GAP;
      for (var y = 0; y < DH; y++) for (var x = 0; x < DW; x++) {
        var lv = D[y * DW + x], X = 2 * x, Y = 1 + 2 * y;
        p[Y * TW + X] = DOT[lv];
        if (lv >= 3) { p[Y * TW + X + 1] = GLOWD; p[(Y + 1) * TW + X] = GLOWD; }
      }
      for (x = 0; x < TW; x++) { p[x] = BEZ; p[(OY - 1) * TW + x] = BEZ; }
      B.done();
    }
    g.drawImage(dmd.B.c, 0, 0);
  }

  // ================================================================ every frame
  function blink(t, ms) { return Math.floor(t / ms) % 2 === 0; }
  function draw(g, W, t, mode, info) {
    if (W && W.tableId && W.tableId !== 'orbit') return drawAny(g, W, t, mode, info);   // any other table: generated
    if (!made) make();
    g.imageSmoothingEnabled = false;
    var lit = W.lit || {}, i, play = mode !== 'title', dark = W.tilted || W.over;
    L.bg.draw(g);
    // stars that twinkle
    for (i = 0; i < L.twinkle.length; i++) {
      var s = L.twinkle[i], v = Math.sin(t / 380 * s.s + s.p);
      if (v < 0.2) continue;
      g.fillStyle = v > 0.85 ? '#ffffff' : v > 0.55 ? '#c9d4ff' : '#6d78b0';
      g.fillRect(s.x, s.y + OY, 1, 1);
      if (v > 0.85) { g.fillStyle = '#7f8ccc'; g.fillRect(s.x - 1, s.y + OY, 1, 1); g.fillRect(s.x + 1, s.y + OY, 1, 1); g.fillRect(s.x, s.y + OY - 1, 1, 1); g.fillRect(s.x, s.y + OY + 1, 1, 1); }
    }
    // the Mothership's lights: a chase round the rim, the emitters pulsing, the antenna blinking
    var Mo = L.mother, chase = Math.floor(t / 110) % Mo.ports.length;
    for (i = 0; i < Mo.ports.length; i++) { g.fillStyle = i === chase ? '#ffffff' : (i + Math.floor(t / 330)) % 2 ? '#ffd84a' : '#a86a10'; g.fillRect(Mo.ports[i].x, Mo.ports[i].y + OY, 2, 2); }
    for (i = 0; i < Mo.emit.length; i++) { g.fillStyle = blink(t + i * 150, 300) ? '#ff5cc8' : '#6a1a58'; g.fillRect(Mo.emit[i].x, Mo.emit[i].y + OY, 3, 1); }
    g.fillStyle = blink(t, 500) ? '#ff4040' : '#5a1010'; g.fillRect(Mo.ant.x, Mo.ant.y + OY, 1, 1);

    // the lit inserts
    var on = {};
    if (!play) {   // the title screen: an attract show
      var order = ['save', 'hero', 'mult2', 'mult3', 'mult4', 'mult5', 'orbitL', 'hangar', 'ramp', 'orbitR', 'lane0', 'lane1', 'lane2', 'kick'];
      var ph = Math.floor(t / 85);
      order.forEach(function (id, k) { var q = (ph - k + 1400) % 18; if (q < 3) on[id] = q === 0 ? 2 : 1; });
    } else if (!dark) {
      for (i = 0; i < 3; i++) {
        if (lit.lane && lit.lane[i] > 0 && blink(t, 70)) on['lane' + i] = 2;
        else if (W.skillOpen && W.skill === i) { if (blink(t, 160)) on['skill' + i] = 1; }
        else if (W.lanes && W.lanes[i]) on['lane' + i] = 1;
      }
      if (lit.orbitL > 0) on.orbitL = 2; else if (W.orbitFrom && blink(t, 200)) on.orbitL = 1;   // a LOOP waiting: either orbit
      if (lit.orbitR > 0) on.orbitR = 2; else if (W.orbitFrom && blink(t, 200)) on.orbitR = 1;
      if (lit.ramp > 0) on.ramp = blink(t, 80) ? 2 : 1; else if (W.comboT > 0 && blink(t, 180)) on.ramp = 1;
      if (lit.saucer > 0) on.hangar = blink(t, 90) ? 2 : 1; else if (W.saucerLit && blink(t, 220)) on.hangar = 1;
      for (i = 2; i <= 5; i++) if (W.mult >= i) on['mult' + i] = 1;
      if (W.saveT > 0) { if (W.saveT > 150 || blink(t, 110)) on.save = 1; on.hero = 1; }
      if (lit.kick > 0) on.kick = blink(t, 80) ? 2 : 1; else if (W.kickback) on.kick = 1;
    }
    for (var id in on) { var I = L.ins[id]; if (I) (on[id] === 2 ? I.hot : I.on).draw(g); }

    // the table's metal
    L.walls.draw(g);
    if (play && !dark && (lit.saucer > 0 || (W.saucerLit && blink(t, 220)))) L.saucerLit.draw(g);
    if (!play && blink(t, 400)) L.saucerLit.draw(g);
    // the kickback's pad lights when it is armed
    if (L.kickPad && (play ? W.kickback && !dark : blink(t, 600))) { g.fillStyle = '#ff4a4a'; g.fillRect(L.kickPad.x, L.kickPad.y + OY, L.kickPad.w, 2); }
    // the comet spinner: a plate turning on its wire (face-on it shows the comet)
    if (L.spin) {
      var sp = L.spin, ca = Math.cos((W.spin ? W.spin.a : 0) * Math.PI * 2), hh = Math.round(Math.abs(ca) * 3);
      g.fillStyle = ca >= 0 ? '#ffd84a' : '#8f9ccf'; g.fillRect(sp.x0, sp.y - hh + OY, sp.x1 - sp.x0 + 1, hh * 2 + 1);
      if (hh >= 2 && ca >= 0) {
        g.fillStyle = '#ff8a2a'; g.fillRect(sp.x0 + 2, sp.y + OY, 9, 1); g.fillRect(sp.x0 + 6, sp.y - 1 + OY, 5, 1);
        g.fillStyle = '#ffffff'; g.fillRect(sp.x0 + 11, sp.y - 1 + OY, 3, 3);
      }
      g.fillStyle = '#e6ecff'; g.fillRect(sp.x0, sp.y - hh + OY, sp.x1 - sp.x0 + 1, 1);
    }
    // drop targets
    for (i = 0; i < L.drops.length; i++) {
      var Dd = L.drops[i];
      if (W.drops && !W.drops[i]) ((lit.drop && lit.drop[i] > 0) ? Dd.boom : Dd.down).draw(g);
      else Dd.up[(Math.floor(t / 520) + i) & 1].draw(g);
    }
    // the orbs
    for (i = 0; i < L.bump.length; i++) {
      var st = lit.bump && lit.bump[i] > 0 ? 2 : dark ? 0 : (Math.floor(t / 420) + i) % 3 === 0 ? 0 : 1;
      L.bump[i][st].draw(g);
    }
    // slingshots
    for (i = 0; i < L.sling.length; i++) L.sling[i][lit.sling && lit.sling[i] > 0 ? 1 : 0].draw(g);
    // the plunger and its power meter
    drawPlunger(g, W, t);
    // flippers
    for (i = 0; i < W.flippers.length; i++) { var f = W.flippers[i]; flipSprite(f, Math.round(f.a * 180 / Math.PI)).draw(g); }
    // the balls on the playfield, then the ramp, then any ball up on the ramp (with its shadow below)
    var balls = W.balls || [], up = [];
    for (i = 0; i < balls.length; i++) { if (balls[i].m === 'ramp') up.push(balls[i]); else ball(g, balls[i].x, balls[i].y, E.BALL); }
    for (i = 0; i < up.length; i++) { var z = up[i].z || 0; L.shadow[E.BALL].draw(g, Math.round(up[i].x - E.BALL - 0.5 + z * 0.2), Math.round(up[i].y - E.BALL - 0.5 + z * 0.28)); }
    var rampLit = play && !dark && lit.ramp > 0 && blink(t, 100);
    (rampLit ? L.rampLit : L.ramp).draw(g);
    for (i = 0; i < up.length; i++) { var rz = E.BALL + Math.min(3, Math.round((up[i].z || 0) / 13)); ball(g, up[i].x, up[i].y, rz); }
    drawDmd(g, W, t, mode, info);
  }
  function ball(g, x, y, r) { g.drawImage(L.ball[r].c, Math.round(x - r - 0.5), Math.round(y - r - 0.5) + OY); }
  function drawPlunger(g, W, t) {
    var S = T.shooter, P = W.plunger || { pull: 0 }, tip = Math.round(S.tip + P.pull * S.travel), cx = S.cx;
    // the power meter: six bars that fill as the plunger is pulled
    var any = (W.balls || []).some(function (b) { return b.x > S.x0 && b.y > S.tip - 60; });
    var COL = ['#2fd04a', '#7fe03a', '#d8e030', '#ffb21e', '#ff6a2a', '#ff2a3a'];
    for (var k = 0; k < 6; k++) {
      var y = S.tip - 22 - k * 6 + OY, lit = P.pull > k / 6 + 0.01;
      g.fillStyle = lit ? COL[k] : any ? '#1e2244' : '#14162e';
      g.fillRect(cx - 4, y, 8, 3);
    }
    // the rod and spring, then the tip
    g.fillStyle = '#5f6b9f'; g.fillRect(cx - 1, tip + 3 + OY, 3, TH - tip);
    g.fillStyle = '#93a0d0';
    for (var yy = tip + 4; yy < TH; yy += 2) g.fillRect(cx - 4, yy + OY, 9, 1);
    g.fillStyle = '#7a1626'; g.fillRect(cx - 6, tip + OY, 13, 3);
    g.fillStyle = '#ff4a4a'; g.fillRect(cx - 6, tip + OY, 13, 2);
    g.fillStyle = '#ffa0a0'; g.fillRect(cx - 5, tip + OY, 11, 1);
  }

  // ================================================================ any other table (16 Oct 2026): a clean flat look made from its data
  // Ember Peak and the tables after it are drawn straight from the table data with canvas shapes: everything that
  // never moves once into two layers (under the ball, and the ramp and wire rail over it), the moving parts every
  // frame. A table a little taller than the screen (Ember Peak is 470 units since 29 Oct 2026, the screen shows 446) is
  // drawn a touch smaller so all of it shows; a much taller one scrolls smoothly to follow the lowest ball. Colours come from the table's theme (THEMES; a table without one gets a neutral one). Nothing
  // here may throw on a table it has never seen: every part is drawn only if the table has it.
  var THEMES = {
    ember: { sky: ['#4fb6f0', '#a6e4ff'], rock: ['#3b302b', '#211a17'], sand: '#d8b46e', sea: ['#3ad6cf', '#1aa3bf'], bands: [120, 340, 470],
      steel: '#f1ede6', steel2: '#8b8f96', rubber: '#ff6a2a', cab: '#120d0b', lane: '#1e130f', lava: '#ff7a1a', lava2: '#ffd04a', glow: 'rgba(255,122,26,0.35)',
      insert: '#ffb21e', insOff: '#5a3a1a', bump: '#4a3c35', crab: '#ff5a1f', obs: '#20182a', obs2: '#8c6ad8', word: 'WAKE THE VOLCANO' },
    any: { sky: ['#20305a', '#2c4a7a'], rock: ['#28304a', '#1a2036'], sand: '#3a4a6a', sea: ['#2a3a64', '#1c2850'], bands: [120, 340, 470],
      steel: '#e8ecf4', steel2: '#7c8496', rubber: '#e0204e', cab: '#0b0d16', lane: '#11152a', lava: '#ff7a1a', lava2: '#ffd04a', glow: 'rgba(255,200,80,0.3)',
      insert: '#ffd84a', insOff: '#3a3a50', bump: '#3c4466', crab: '#ff5a1f', obs: '#20182a', obs2: '#8c6ad8', word: 'PLAY THE TABLE' }
  };
  function theme(id) { return THEMES[id] || THEMES.any; }
  var AL = { id: '', under: null, over: null, view: -1, lastT: -1, W: null };
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function strokePath(x, P, w, col) { x.lineWidth = w; x.strokeStyle = col; x.beginPath(); P.forEach(function (p, i) { if (i) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]); }); x.stroke(); }
  function buildAny(id) {
    var B = E.table(id), T = B.T, th = theme(id), Wd = T.W, Hd = T.H, A = T.arch;
    var u = canvas(Wd, Hd), x = u.getContext('2d'), b = th.bands;
    // the playfield: sky under the arch, black rock across the summit, then sand and the sea down to the flippers
    var gr = x.createLinearGradient(0, 0, 0, Hd);
    gr.addColorStop(0, th.sky[0]); gr.addColorStop(b[0] / Hd * 0.8, th.sky[1]); gr.addColorStop(b[0] / Hd, th.rock[0]);
    gr.addColorStop(b[1] / Hd, th.rock[1]); gr.addColorStop((b[1] + 30) / Hd, th.sand); gr.addColorStop(b[2] / Hd, th.sea[0]); gr.addColorStop(1, th.sea[1]);
    x.fillStyle = gr; x.fillRect(0, 0, Wd, Hd);
    // a little texture: dots of a darker shade, the same every time
    var r = rnd(9001 + id.length);
    for (var i = 0; i < 900; i++) { var px_ = r() * Wd, py = r() * Hd; x.fillStyle = 'rgba(0,0,0,' + (0.05 + r() * 0.08).toFixed(3) + ')'; x.fillRect(px_ | 0, py | 0, 1 + (r() * 2 | 0), 1); }
    // the closed spaces (no ball goes there): solid rock
    (T.voids || []).forEach(function (poly) {
      x.fillStyle = th.rock[1]; x.beginPath(); poly.forEach(function (p, k) { if (k) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]); }); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,140,60,0.35)'; x.lineWidth = 1; x.stroke();
    });
    // the lava lanes' floors glow faintly (they are hot even with the gates down)
    (T.lava ? T.lava.gates : []).forEach(function (gt) {
      var gx = gt[0] < T.MID ? Math.min(gt[0], gt[5]) - 26 : Math.max(gt[0], gt[5]) - 2;
      var lg = x.createLinearGradient(0, Math.min(gt[1], gt[3]), 0, Math.max(gt[1], gt[3]));
      lg.addColorStop(0, 'rgba(255,90,20,0.0)'); lg.addColorStop(0.5, 'rgba(255,110,30,0.45)'); lg.addColorStop(1, 'rgba(255,90,20,0.0)');
      x.fillStyle = lg; x.fillRect(gx, Math.min(gt[1], gt[3]) - 80, 28, Math.abs(gt[3] - gt[1]) + 80);
    });
    // the cabinet round the arch and beside the field
    x.fillStyle = th.cab; x.beginPath(); x.rect(0, 0, Wd, A.y); x.moveTo(A.x + A.R, A.y); x.arc(A.x, A.y, A.R, 0, Math.PI, true); x.closePath(); x.fill('evenodd');
    // the shooter lane
    var SH = T.shooter; x.fillStyle = th.lane; x.fillRect(SH.x0, A.y, SH.x1 - SH.x0, Hd - A.y);
    // the walls, posts, the arch and the one-way gates
    x.lineCap = 'round'; x.lineJoin = 'round';
    B.WALLS.forEach(function (s) {
      if (s.kind === 'apron' || s.kind === 'sling' || s.kind === 'rubber') return;
      x.lineWidth = 2 * s.r + 1.6; x.strokeStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.moveTo(s.ax + 1, s.ay + 1.5); x.lineTo(s.bx + 1, s.by + 1.5); x.stroke();
      x.lineWidth = 2 * s.r + 0.8; x.strokeStyle = s.kind === 'post' ? th.rubber : th.steel; x.beginPath(); x.moveTo(s.ax, s.ay); x.lineTo(s.bx, s.by); x.stroke();
    });
    B.POSTS.forEach(function (p) { x.fillStyle = th.rubber; x.beginPath(); x.arc(p.x, p.y, p.r + 0.6, 0, 6.2832); x.fill(); });
    x.lineWidth = 2 * A.r + 1; x.strokeStyle = th.steel; x.beginPath(); x.arc(A.x, A.y, A.R - 0.5, Math.PI, 2 * Math.PI); x.stroke();
    B.GATES.forEach(function (s) { x.lineWidth = 1.5; x.strokeStyle = th.steel2; x.beginPath(); x.moveTo(s.ax, s.ay); x.lineTo(s.bx, s.by); x.stroke(); });
    // over the ball: the ramp (a clear lane with rails) and the wire rail
    var o = canvas(Wd, Hd), y = o.getContext('2d');
    y.lineCap = 'round'; y.lineJoin = 'round';
    if (B.RAMP) {
      var P = B.RAMP.P, w = (T.ramp && T.ramp.width) || 20;
      strokePath(y, P, w + 3, 'rgba(20,10,8,0.55)'); strokePath(y, P, w - 1, 'rgba(255,255,255,0.16)');
      [-1, 1].forEach(function (sd) {
        var Q = P.map(function (p, k) { var q = P[Math.min(P.length - 1, k + 1)], pp = P[Math.max(0, k - 1)], dx = q[0] - pp[0], dy = q[1] - pp[1], l = Math.sqrt(dx * dx + dy * dy) || 1; return [p[0] - dy / l * sd * w / 2, p[1] + dx / l * sd * w / 2]; });
        strokePath(y, Q, 2.2, th.steel);
      });
    }
    Object.keys(B.CARRY || {}).forEach(function (k) {
      var C = B.CARRY[k]; if (C.railAt < 0) return;
      var R = C.P.filter(function (p) { return p[3] >= C.railAt; }).map(function (p) { return [p[0], p[1]]; });
      [-2.5, 2.5].forEach(function (d) { strokePath(y, R.map(function (p) { return [p[0] + d, p[1]]; }), 1.2, th.steel); });
    });
    return { under: u, over: o, T: T, B: B, th: th };
  }
  function lowest(W, T) {   // the ball the view follows: the lowest one on the playfield (else any)
    var best = null;
    (W.balls || []).forEach(function (b) { if (!best || b.y > best.y) best = b; });
    return best;
  }
  function flipperPath(x, f) {
    var a = f.a, c = Math.cos(a), s = Math.sin(a), tx = f.x + c * f.len, ty = f.y + s * f.len;
    x.beginPath(); x.arc(tx, ty, f.r1, a + Math.PI / 2, a - Math.PI / 2, true); x.arc(f.x, f.y, f.r0, a - Math.PI / 2, a + Math.PI / 2, true); x.closePath();
  }
  function drawAny(g, W, t, mode, info) {
    E = window.PinEngine;
    var id = W.tableId;
    if (AL.id !== id) { var L2 = buildAny(id); AL.id = id; AL.under = L2.under; AL.over = L2.over; AL.T = L2.T; AL.B = L2.B; AL.th = L2.th; AL.view = -1; }
    var T = AL.T, B = AL.B, th = AL.th, lit = W.lit || {}, play = mode !== 'title', dark = W.tilted || W.over, i;
    // the view: follow the lowest ball, smoothly; snap on a new world
    var fit = T.H > TH && T.H <= TH * 1.12 ? TH / T.H : 1;
    var maxTop = fit < 1 ? 0 : Math.max(0, T.H - TH), b0 = lowest(W, T), target = b0 ? Math.max(0, Math.min(maxTop, b0.y - TH * 0.45)) : maxTop;
    var dt = AL.lastT < 0 ? 1 : Math.max(0, Math.min(0.1, (t - AL.lastT) / 1000)); AL.lastT = t;
    if (AL.view < 0 || AL.W !== W) AL.view = target; else AL.view += (target - AL.view) * (1 - Math.exp(-dt * 7));
    AL.W = W;
    var vy = Math.round(AL.view);
    g.save();
    g.beginPath(); g.rect(0, OY, TW, TH); g.clip();
    if (fit < 1) { g.fillStyle = th.cab; g.fillRect(0, OY, TW, TH); g.translate((TW - T.W * fit) / 2, OY); g.scale(fit, fit); } else g.translate(0, OY - vy);
    g.imageSmoothingEnabled = false;
    g.drawImage(AL.under, 0, 0);
    g.lineCap = 'round'; g.lineJoin = 'round';
    function dot(cx, cy, r, col) { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fill(); }
    var bl = function (ms) { return blink(t, ms); };
    // the inserts: the top lanes (lit / the skill lane flashing), the kickback, the orbits, the ramp
    var SC = {}; T.sensors.circles.forEach(function (c) { SC[c[0]] = c; });
    for (i = 0; i < 3; i++) {
      var Ls = SC['lane' + i]; if (!Ls) continue;
      var on = !play ? (Math.floor(t / 160) + i) % 3 === 0 : !dark && ((lit.lane && lit.lane[i] > 0 && bl(70)) || (W.lanes && W.lanes[i]) || (W.skillOpen && W.skill === i && bl(160)));
      dot(Ls[1], Ls[2] + 14, 3.5, on ? th.insert : th.insOff);
    }
    if (SC.kick) dot(SC.kick[1], SC.kick[2] + 12, 3, (play ? W.kickback && !dark : bl(600)) ? '#ff4a4a' : th.insOff);
    if (B.RAMP && B.RAMP.entry) { var en = B.RAMP.entry, ron = play && !dark && (lit.ramp > 0 ? bl(80) : W.comboT > 0 && bl(180)); g.fillStyle = ron ? th.insert : th.insOff; g.beginPath(); g.moveTo((en.x0 + en.x1) / 2, en.y + 8); g.lineTo(en.x0 + 4, en.y + 18); g.lineTo(en.x1 - 4, en.y + 18); g.closePath(); g.fill(); }
    // the bumpers (fumaroles on Ember Peak): a vent that flares when hit
    B.BUMPERS.forEach(function (Bm, k) {
      var hot = lit.bump && lit.bump[k] > 0;
      dot(Bm.x, Bm.y, Bm.r, th.bump); dot(Bm.x, Bm.y, Bm.r - 3, hot ? th.lava2 : dark ? '#2a2220' : th.lava);
      dot(Bm.x, Bm.y, Bm.r * 0.35, hot ? '#ffffff' : th.lava2);
      g.lineWidth = 1.5; g.strokeStyle = th.steel; g.beginPath(); g.arc(Bm.x, Bm.y, Bm.r - 0.5, 0, 6.2832); g.stroke();
    });
    // the slingshots
    T.slings.forEach(function (S, k) {
      var hot = lit.sling && lit.sling[k] > 0;
      g.fillStyle = th.rock[0]; g.beginPath(); g.moveTo(S.a[0], S.a[1]); g.lineTo(S.b[0], S.b[1]); g.lineTo(S.c[0], S.c[1]); g.closePath(); g.fill();
      g.lineWidth = 4; g.strokeStyle = hot ? '#ffffff' : th.rubber; g.stroke();
    });
    // the drop targets (obsidian on Ember Peak)
    B.DROPS.forEach(function (s, k) {
      var up = !W.drops || W.drops[k];
      g.lineWidth = up ? 5 : 2; g.strokeStyle = up ? th.obs : 'rgba(0,0,0,0.5)'; g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); g.stroke();
      if (up) { g.lineWidth = 1.5; g.strokeStyle = lit.drop && lit.drop[k] > 0 ? '#ffffff' : th.obs2; g.beginPath(); g.moveTo(s.ax, s.ay - 1); g.lineTo(s.bx, s.by - 1); g.stroke(); }
    });
    var toys = W.toys || {};
    // the lava gates: dark when down, glowing as they rise
    (B.LAVA || []).forEach(function (s, k) {
      var gs = toys.lava && toys.lava.gates[k], h = gs ? gs.h : 0;
      if (h > 0.02) {
        g.lineWidth = 6; g.strokeStyle = th.glow; g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); g.stroke();
        g.lineWidth = 2; g.strokeStyle = th.lava2; g.globalAlpha = 0.4 + 0.6 * (1 - h); g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); g.stroke(); g.globalAlpha = 1;
      } else { g.lineWidth = 3; g.strokeStyle = '#7a1e08'; g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); g.stroke(); }
      if (lit.lava && lit.lava[k] > 0 && bl(80)) dot((s.ax + s.bx) / 2 + (s.ax < T.MID ? -12 : 12), (s.ay + s.by) / 2, 4, th.lava2);
    });
    // the geyser: a vent; puffing, a white plume; resting, dim
    if (T.geyser) {
      var Gy = T.geyser, gst = toys.geyser ? toys.geyser.st : 'ready';
      dot(Gy.x, Gy.y, Gy.r + 2, th.rock[0]); dot(Gy.x, Gy.y, Gy.r - 2, gst === 'cool' ? '#2b5560' : '#5ad8e6');
      if (gst === 'puff' || (lit.geyser > 0 && bl(60))) for (i = 0; i < 4; i++) dot(Gy.x + (i % 2 ? 4 : -4), Gy.y - 6 - i * 6 - (t / 40 % 6), 5 - i, 'rgba(255,255,255,' + (0.8 - i * 0.15) + ')');
    }
    // the volcano: a cone whose crater glows with the pressure (and flickers while it holds the ball)
    if (T.volcano) {
      var Vd = T.volcano, Vs = toys.volcano || { pressure: 0 }, pr = Math.min(1.5, Vs.pressure || 0), fl = Vs.busy ? 0.5 + 0.5 * Math.sin(t / 60) : 0;
      dot(Vd.x + 2, Vd.y + 3, Vd.r + 2, 'rgba(0,0,0,0.45)');
      var cg = g.createRadialGradient(Vd.x - 6, Vd.y - 6, 2, Vd.x, Vd.y, Vd.r); cg.addColorStop(0, '#6a5850'); cg.addColorStop(1, th.rock[1]);
      g.fillStyle = cg; g.beginPath(); g.arc(Vd.x, Vd.y, Vd.r, 0, 6.2832); g.fill();
      dot(Vd.x, Vd.y + 3, Vd.r * 0.55, pr >= 1 || Vs.busy ? (bl(120) || fl > 0.5 ? th.lava2 : th.lava) : pr > 0.5 ? th.lava : '#7a2a0a');
      g.lineWidth = 3; g.strokeStyle = Vs.red ? '#ff2a2a' : th.lava2; g.beginPath(); g.arc(Vd.x, Vd.y, Vd.r + 4, -Math.PI / 2, -Math.PI / 2 + 6.2832 * Math.min(1, pr / 1.5)); g.stroke();
    }
    // the crabs: little orange crabs walking (stunned: blinking)
    (toys.crabs || []).forEach(function (c, k) {
      var r0 = (T.crabs[k] && T.crabs[k].r) || 7, hot = lit.crab && lit.crab[k] > 0;
      if (c.stun > 0 && !bl(100)) return;
      g.strokeStyle = th.crab; g.lineWidth = 1.5;
      for (var lg = -1; lg <= 1; lg += 2) { var kx = Math.sin(t / 90 + k) * 1.5; g.beginPath(); g.moveTo(c.x + lg * 3, c.y + 2); g.lineTo(c.x + lg * (r0 + 2), c.y + 4 + kx); g.moveTo(c.x + lg * 3, c.y - 1); g.lineTo(c.x + lg * (r0 + 2), c.y - 3 - kx); g.stroke(); }
      dot(c.x, c.y, r0 - 1, hot ? '#ffffff' : th.crab);
      dot(c.x - 2.5, c.y - 3, 1.3, '#000'); dot(c.x + 2.5, c.y - 3, 1.3, '#000');
    });
    // the plunger
    var SH = T.shooter, Pl = W.plunger || { pull: 0 }, tip = SH.tip + Pl.pull * SH.travel;
    g.fillStyle = th.steel2; g.fillRect(SH.cx - 1, tip + 3, 3, T.H - tip);
    g.fillStyle = '#ff4a4a'; g.fillRect(SH.cx - 6, tip, 13, 3);
    for (i = 0; i < 6; i++) { g.fillStyle = Pl.pull > i / 6 + 0.01 ? ['#2fd04a', '#7fe03a', '#d8e030', '#ffb21e', '#ff6a2a', '#ff2a3a'][i] : '#1d1512'; g.fillRect(SH.cx - 4, SH.tip - 22 - i * 6, 8, 3); }
    // the flippers
    (W.flippers || []).forEach(function (f) {
      flipperPath(g, f); g.fillStyle = th.steel; g.fill(); g.lineWidth = 1.5; g.strokeStyle = th.rubber; g.stroke();
      dot(f.x, f.y, 1.8, th.steel2);
    });
    // the balls on the playfield, then the ramp and rail, then any ball up on them (bigger, with a shadow)
    var up = [], BRd = T.BALL;
    function ball(bx, by, rr) {
      var bg = g.createRadialGradient(bx - rr * 0.35, by - rr * 0.4, rr * 0.15, bx, by, rr);
      bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.45, '#c9d0da'); bg.addColorStop(1, '#5d6672');
      g.fillStyle = bg; g.beginPath(); g.arc(bx, by, rr, 0, 6.2832); g.fill();
    }
    (W.balls || []).forEach(function (b) { if (b.m === 'ramp' || (b.z || 0) > 2) up.push(b); else ball(b.x, b.y, BRd); });
    up.forEach(function (b) { var z = b.z || 0; dot(b.x + z * 0.2, b.y + z * 0.28, BRd, 'rgba(0,0,0,0.35)'); });
    g.drawImage(AL.over, 0, 0);
    up.forEach(function (b) { ball(b.x, b.y, BRd + Math.min(4, (b.z || 0) / 13)); });
    // tilted or over: the table dims
    if (dark && play) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-20, vy, T.W + 40, Math.max(TH, T.H)); }
    g.restore();
    // the scroll position, as a slim bar down the right edge (the table is taller than the screen)
    if (maxTop > 0) { var bh = Math.round(TH * TH / T.H); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(TW - 2, OY + Math.round(vy / T.H * TH), 2, bh); }
    drawDmd(g, W, t, mode, info);
  }
  // the dot-matrix display alone (the 3D look draws only this: no need to draw the whole flat table under it)
  function drawDmdOnly(g, W, t, mode, info) { if (!E) E = window.PinEngine; drawDmd(g, W, t, mode, info); }

  // prepare(): build the layers now (say while the page is idle) rather than on the first frame
  window.PinFlat = { draw: draw, dmd: drawDmdOnly, prepare: function () { if (!made && window.PinEngine) make(); }, view: function () { return AL.view; }, version: 2 };
})();
