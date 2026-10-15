/* 365 Pinball Hero - the effects (15 Oct 2026, milestone 2a): what the table does when something happens - sparks off a
 * bumper, a lamp chase along a sling, the score popping up where it was won, light shows for the big moments, the
 * background light (GI) dipping on a drain and going out on a tilt, and the cabinet shaking on a nudge.
 *
 * window.PinFX (the shared contract; the 3D look draws this state, the flat look may ignore it):
 *   PinFX.events(W, list)    after every engine step, with that step's events (pinball.js; demo.js on the title screen)
 *   PinFX.update(W, t, mode) once per drawn frame (t in ms); advances everything by real time, NEVER changes the world
 *   PinFX.state = {
 *     gi: 0..1        the background light (1 = normal)
 *     flash: 0..1     a whole-table flash (at most 3 a second; never with reduced motion), flashColor its colour (never red)
 *     shake: {x, y}   the table's shake in table units (|x|, |y| <= 1.5; none with reduced motion)
 *     pops: [{x, y, z, text, color, a, s, big}]  score pop-ups (a alpha, s scale; big = a big moment's)
 *     sparks: [{x, y, z, color, a, size}]
 *     lamps: {lampId: 0..1}  extra brightness on top of PinLamps.level (ids are PinLamps.list's)
 *     base: 0..1      (optional) how much of PinLamps.level to show: a whole-table light show takes the table over,
 *                     so it dips while one runs (1 = all of it)
 *   }
 * Positions are table units (x 0..270, y 0..446 down the table, z height). Light shows are DATA (SHOWS below): each
 * has a priority, and a whole-table one ('wide') overrides everything of a lower priority until it ends. The lamps a
 * show uses are found by WHERE they are (near the bumper, along the sling, up the ramp), so new lamps from lamps.js
 * join in without changes here.
 *
 * Plain ES5. In node: require('./fx.js') (it loads lamps.js and engine.js itself) - tools/pinball/fx-test.cjs. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'), function () { return require('./lamps.js'); }, null);
  else root.PinFX = factory(root.PinEngine, function () { return root.PinLamps; }, root);
})(typeof self !== 'undefined' ? self : this, function (E, getLamps, win) {
  'use strict';
  if (!E) return null;
  var T = E.TABLE, TW = E.W, TH = E.H, MID = T.MID, fmt = E.fmt;
  var C = { pink: '#ff5cc8', cyan: '#3fe0ff', yellow: '#ffd84a', green: '#5cff6b', orange: '#ff9a2e', blue: '#59b4ff', white: '#ffffff', violet: '#b48cff' };
  var BUMPC = [C.pink, C.cyan, C.yellow], DROPC = [C.yellow, C.cyan, C.pink, C.cyan, C.yellow];   // the orbs' and the invader targets' own colours

  // ------------------------------------------------------------------ the light shows, as data
  // pri: a higher one wins; wide: takes over the whole table (local shows below it pause, the base lamps dip);
  // ms: how long; look: how each lamp's level is worked out (LOOKS); gi: the background light dips to this meanwhile;
  // flash: a whole-table flash this bright (rate limited), flashes: how many (a third of a second apart);
  // shake: a knock to the cabinet; sparks: how many; pop: the score pop's size; word: a pop with words; color: sparks'
  var SHOWS = {
    bumper:   { pri: 1, ms: 380, look: 'ring', r: 32, sparks: 12, shake: 0.22, pop: 'small' },
    sling:    { pri: 1, ms: 340, look: 'chase', sparks: 8, shake: 0.12, pop: 'small', color: C.cyan },
    drop:     { pri: 2, ms: 560, look: 'ring', r: 30, sparks: 16, pop: 'small' },
    spin:     { pri: 1, ms: 320, look: 'ring', r: 30, sparks: 3, pop: 'small', color: C.yellow },
    lane:     { pri: 1, ms: 420, look: 'ring', r: 28, sparks: 8, pop: 'small', color: C.yellow },
    inlane:   { pri: 1, ms: 340, look: 'ring', r: 24, sparks: 5, pop: 'small', color: C.cyan },
    outlane:  { pri: 1, ms: 340, look: 'ring', r: 24, sparks: 5, pop: 'small', color: C.orange },
    eject:    { pri: 2, ms: 420, look: 'ring', r: 36, sparks: 14, color: C.green },
    reset:    { pri: 2, ms: 700, look: 'chase', color: C.green },
    launch:   { pri: 1, ms: 500, look: 'chase', sparks: 8, color: C.white },
    rampin:   { pri: 2, ms: 600, look: 'chase', color: C.pink },
    kickback: { pri: 4, ms: 800, look: 'column', sparks: 18, pop: 'small', color: C.orange, word: 'KICKBACK' },
    saucer:   { pri: 3, ms: 900, look: 'ring', r: 52, sparks: 22, pop: 'big', color: C.green },
    orbit:    { pri: 3, ms: 800, look: 'column', sparks: 14, pop: 'big', color: C.cyan },
    ramp:     { pri: 4, ms: 1200, look: 'chase', sparks: 26, pop: 'big', gi: 0.8, color: C.pink },
    drops:    { pri: 5, ms: 1500, wide: true, look: 'burst', sparks: 36, pop: 'big', gi: 0.55, flash: 0.35, color: C.green },
    newball:  { pri: 3, ms: 1100, wide: true, look: 'sweepUp', color: C.cyan },
    drain:    { pri: 5, ms: 1200, wide: true, look: 'sweepDown', gi: 0.3 },
    ballend:  { pri: 4, ms: 1400, wide: true, look: 'sweepDown', gi: 0.6 },
    combo:    { pri: 6, ms: 1500, wide: true, look: 'spiral', sparks: 34, pop: 'big', gi: 0.5, flash: 0.45, shake: 0.4, color: C.pink },
    loop:     { pri: 6, ms: 1500, wide: true, look: 'sides', sparks: 30, pop: 'big', gi: 0.5, flash: 0.4, color: C.cyan },
    mult:     { pri: 6, ms: 1500, wide: true, look: 'sweepUp', sparks: 24, pop: 'big', gi: 0.5, flash: 0.4, color: C.orange },
    save:     { pri: 7, ms: 1300, wide: true, look: 'sweepUp', only: 'blue', sparks: 30, gi: 0.6, color: C.blue, word: 'BALL SAVED' },
    skill:    { pri: 7, ms: 1800, wide: true, look: 'rain', sparks: 40, pop: 'big', gi: 0.45, flash: 0.6, shake: 0.5, color: C.green },
    jackpot:  { pri: 8, ms: 2200, wide: true, look: 'burst', sparks: 60, pop: 'big', gi: 0.35, flash: 0.7, flashes: 2, shake: 0.9, color: C.yellow },
    extra:    { pri: 9, ms: 2400, wide: true, look: 'spiral', sparks: 60, gi: 0.35, flash: 0.7, flashes: 2, shake: 0.6, color: C.yellow, word: 'EXTRA BALL' }
  };
  // which shows a score is credited to first (the pop goes where the best of them happened)
  var RANK = { extra: 0, bumper: 1, spin: 1, sling: 1, inlane: 1, outlane: 1, lane: 2, drop: 3, eject: 1, orbit: 5, saucer: 6, drops: 6, ramp: 7, loop: 7, mult: 4, skill: 8, combo: 8, jackpot: 9 };

  // ------------------------------------------------------------------ where things are on the table
  var B = E.BUMPERS, D = E.DROPS, SAU = T.saucer, SH = T.shooter;
  function sensor(id) { var s = null; T.sensors.circles.forEach(function (c) { if (c[0] === id) s = { x: c[1], y: c[2] }; }); return s; }
  function line(id) { var s = null; T.sensors.lines.forEach(function (c) { if (c[0] === id) s = { x: (c[1] + c[3]) / 2, y: (c[2] + c[4]) / 2 }; }); return s; }
  var P = {
    spinL: line('spin') || { x: 18, y: 196 }, orbR: line('orbR') || { x: 232, y: 196 },
    lanes: [sensor('lane0'), sensor('lane1'), sensor('lane2')],
    kick: sensor('kick') || { x: 16, y: 424 }, save: { x: MID, y: T.flippers[0].y + 8 }, mid: { x: MID, y: 250 },
    bank: { x: (D[0].ax + D[D.length - 1].bx) / 2, y: (D[0].ay + D[D.length - 1].by) / 2 },
    rampTop: E.rampAt(E.RAMP.L * 0.2)
  };
  function slingAt(side) { var s = T.slings[side < 0 ? 0 : 1]; return { x: (s.a[0] + s.c[0]) / 2 + (side < 0 ? 4 : -4), y: (s.a[1] + s.c[1]) / 2, s: s }; }
  function nearestOf(pts, b) {
    var best = pts[0], bd = 1e9;
    if (!b) return best;
    pts.forEach(function (p) { if (!p) return; var d = (p.x - b.x) * (p.x - b.x) + (p.y - b.y) * (p.y - b.y); if (d < bd) { bd = d; best = p; } });
    return best;
  }
  function ballOf(W) {   // the ball that most likely just did something: the first one on the playfield
    for (var i = 0; i < W.balls.length; i++) if (W.balls[i].m === 'free') return W.balls[i];
    return W.balls[0] || null;
  }

  // ------------------------------------------------------------------ the lamps
  var LL = null, LLn = -1;
  function lampList() {
    var Lm = null;
    try { Lm = getLamps(); } catch (e) { Lm = null; }
    var list = Lm && Lm.list || [];
    if (list !== LL || list.length !== LLn) { LL = list; LLn = list.length; }
    return LL;
  }
  function blue(l) {   // a blue or cyan lamp (the ball save's sweep uses only these)
    var c = String(l.color || ''), m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c);
    if (!m) return false;
    var r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    return b > 160 && b > r + 40;
  }
  // lamps along a path (a list of points), in order along it: id -> position 0..n-1
  function along(path, width) {
    var L = lampList(), hits = [];
    var acc = 0, segs = [];
    for (var i = 1; i < path.length; i++) {
      var a = path[i - 1], b = path[i], dx = b.x - a.x, dy = b.y - a.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
      segs.push({ a: a, dx: dx, dy: dy, l: l, s0: acc }); acc += l;
    }
    L.forEach(function (lp) {
      var best = 1e9, bs = 0;
      segs.forEach(function (s) {
        var t = ((lp.x - s.a.x) * s.dx + (lp.y - s.a.y) * s.dy) / (s.l * s.l); t = t < 0 ? 0 : t > 1 ? 1 : t;
        var qx = s.a.x + s.dx * t - lp.x, qy = s.a.y + s.dy * t - lp.y, d = Math.sqrt(qx * qx + qy * qy);
        if (d < best) { best = d; bs = s.s0 + t * s.l; }
      });
      if (best <= width) hits.push({ id: lp.id, s: bs });
    });
    hits.sort(function (p, q) { return p.s - q.s; });
    var order = {};
    hits.forEach(function (h, k) { order[h.id] = k; });
    return { order: order, n: hits.length };
  }
  function nearLamps(x, y, r, min) {   // lamps within r of a point (at least `min` of the nearest)
    var L = lampList(), all = L.map(function (l) { var dx = l.x - x, dy = l.y - y; return { id: l.id, d: Math.sqrt(dx * dx + dy * dy) }; });
    all.sort(function (p, q) { return p.d - q.d; });
    var set = {};
    all.forEach(function (o, k) { if (o.d <= r || k < (min || 0)) set[o.id] = o.d; });
    return set;
  }
  // the path each chase runs along
  var RAMP_PATH = (function () {
    var en = T.ramp.entry, rx = (en.x0 + en.x1) / 2, pts = [{ x: rx, y: en.y + 62 }, { x: rx, y: en.y }];
    for (var s = 0; s <= E.RAMP.L; s += 12) { var r = E.rampAt(s); pts.push({ x: r.x, y: r.y }); }
    return pts;
  })();
  function slingPath(side) { var s = T.slings[side < 0 ? 0 : 1]; return [{ x: s.a[0], y: s.a[1] - 14 }, { x: s.a[0], y: s.a[1] }, { x: s.c[0], y: s.c[1] }, { x: s.c[0] + (side < 0 ? 8 : -8), y: s.c[1] + 18 }]; }
  var DROP_PATH = [{ x: D[0].ax, y: D[0].ay }, { x: D[D.length - 1].bx, y: D[D.length - 1].by }];
  var SHOOT_PATH = [{ x: SH.cx, y: SH.tip }, { x: SH.cx, y: 150 }, { x: 215, y: 60 }];

  // ------------------------------------------------------------------ how a show lights each lamp: (lamp, phase 0..1, show) -> 0..1
  function band(d, f, w) { var e = Math.abs(d - f); return e < w ? 1 - e / w : 0; }
  function hashf(i, n) { var h = Math.imul(i + 11, 374761393) + Math.imul(n + 5, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  var LOOKS = {
    // the lamps round a point blink (a bumper's ring, a target's lamps) and fade
    ring: function (l, p, s) {
      var d = s.set[l.id]; if (d == null) return 0;
      return (Math.floor(p * 6) % 2 === 0 ? 1 : 0.3) * (1 - 0.6 * p) * (1 - 0.4 * Math.min(1, d / s.r));
    },
    // a light runs along a line of lamps, with a short tail
    chase: function (l, p, s) {
      var k = s.order[l.id]; if (k == null) return 0;
      var f = p * (s.n + 2) - 1, e = f - k;
      return e >= -0.6 && e < 2.2 ? (e < 0 ? 1 + e / 0.6 : 1 - e / 2.2) : 0;
    },
    // a wave up a strip of the table (the kickback's side, an orbit)
    column: function (l, p, s) {
      if (Math.abs(l.x - s.x) > 34) return 0;
      return band(1 - l.y / TH, -0.1 + 1.25 * p, 0.14);
    },
    // rings out from a point across the whole table
    burst: function (l, p, s) {
      var dx = l.x - s.x, dy = l.y - s.y, d = Math.sqrt(dx * dx + dy * dy) / 380, f = p * 1.5;
      return Math.max(band(d, f, 0.13), 0.8 * band(d, f - 0.45, 0.13), 0.6 * band(d, f - 0.9, 0.13));
    },
    // a line of light up the table from the flippers to the arch (twice), or down it
    sweepUp: function (l, p, s) {
      if (s.only === 'blue' && !blue(l)) return 0;
      var d = 1 - l.y / TH, f = (p * 2) % 1 * 1.3 - 0.15;
      return band(d, f, 0.16) * (p < 0.5 ? 1 : 0.85);
    },
    sweepDown: function (l, p, s) {
      var d = l.y / TH, f = p * 1.3 - 0.15;
      return band(d, f, 0.18) * (1 - 0.5 * p);
    },
    // left to right and back, twice
    sides: function (l, p) {
      var q = (p * 2) % 1, x = q < 0.5 ? q * 2 : 2 - q * 2;
      return band(l.x / TW, -0.1 + 1.2 * x, 0.12);
    },
    // three arms turning round the middle of the table
    spiral: function (l, p, s) {
      var a = Math.atan2(l.y - s.y, l.x - s.x), v = Math.cos(3 * (a - p * Math.PI * 4));
      return v > 0.55 ? (v - 0.55) / 0.45 * (p < 0.85 ? 1 : (1 - p) / 0.15) : 0;
    },
    // lamps light at random, then all fade together (a sparkle, never all at once)
    rain: function (l, p) {
      var tick = Math.floor(p * 22);
      return hashf(l.i != null ? l.i : 0, tick) > 0.55 + 0.25 * p ? 1 - 0.4 * p : 0;
    }
  };

  // ------------------------------------------------------------------ the state
  var S = {
    W: null, frame: 0, score: 0, clock: 0, last: -1, seed: 12345,
    shows: [], flashAt: -1e9, flashQ: [], dipAt: -1e9, dipTo: 1, warnAt: -1e9,
    sh: { x: 0, y: 0, vx: 0, vy: 0 }, reducedAt: -1e9, reduced: false
  };
  var state = { gi: 1, flash: 0, flashColor: C.white, shake: { x: 0, y: 0 }, pops: [], sparks: [], lamps: {}, base: 1 };
  var MAXPOP = 8, MAXSPARK = 240, FLASH_GAP = 340;   // FLASH_GAP: never more than 3 whole-table flashes a second

  function rnd() { S.seed = (S.seed * 1103515245 + 12345) & 0x7fffffff; return S.seed / 0x7fffffff; }
  function reduced() {
    if (api.reduce === true || api.reduce === false) return api.reduce;
    if (S.clock - S.reducedAt < 1000) return S.reduced;
    S.reducedAt = S.clock;
    try {
      S.reduced = win && win.A11y365 ? !!win.A11y365.reduce() : !!(win && win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { S.reduced = false; }
    return S.reduced;
  }
  function clear() {
    S.shows.length = 0; S.flashQ.length = 0; S.dipAt = -1e9; S.warnAt = -1e9;
    state.pops.length = 0; state.sparks.length = 0; state.flash = 0; state.base = 1;
    S.sh.x = S.sh.y = S.sh.vx = S.sh.vy = 0; state.shake.x = state.shake.y = 0;
    for (var k in state.lamps) if (Object.prototype.hasOwnProperty.call(state.lamps, k)) state.lamps[k] = 0;
  }
  function adopt(W) {   // a new world (a new game, or the title screen's demo starting again in the same object)
    clear(); S.W = W; S.frame = W ? W.frame : 0; S.score = W ? W.score : 0; state.gi = 1;
  }

  // ------------------------------------------------------------------ making things happen
  function startShow(name, at, extra) {
    var d = SHOWS[name]; if (!d) return null;
    // a wide show only starts if nothing wide of a higher priority is running; it replaces lower or equal ones
    if (d.wide) {
      for (var i = S.shows.length - 1; i >= 0; i--) {
        var o = S.shows[i];
        if (!o.d.wide) continue;
        if (o.d.pri > d.pri) return null;
        S.shows.splice(i, 1);
      }
    }
    for (i = S.shows.length - 1; i >= 0; i--) if (S.shows[i].name === name && S.shows[i].key === (extra && extra.key)) S.shows.splice(i, 1);   // the same show restarts
    var s = { name: name, d: d, t0: S.clock, x: at.x, y: at.y, r: d.r || 30, only: d.only, key: extra && extra.key };
    if (d.look === 'ring') s.set = nearLamps(at.x, at.y, s.r, 2);
    if (d.look === 'chase') { var a = along(extra && extra.path || [at, at], extra && extra.width || 20); s.order = a.order; s.n = a.n; }
    S.shows.push(s);
    if (S.shows.length > 24) S.shows.shift();
    if (d.gi != null && d.gi < 1) { /* read from the running shows in update() */ }
    if (d.flash) { flash(d.flash, at.color || d.color); if (d.flashes > 1) S.flashQ.push({ at: S.clock + FLASH_GAP + 10, v: d.flash * 0.8, c: d.color }); }
    if (d.shake) knock((at.x < MID ? -1 : 1) * d.shake * 0.6, -d.shake);
    return s;
  }
  function flash(v, color) {
    if (reduced()) return false;
    if (S.clock - S.flashAt < FLASH_GAP) return false;
    S.flashAt = S.clock; state.flash = Math.max(state.flash, Math.min(1, v));
    state.flashColor = safeColor(color);
    return true;
  }
  function safeColor(c) {   // never a red flash: anything reddish becomes white
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(String(c || ''));
    if (!m) return C.white;
    var r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    return r > 150 && g < 140 && b < 200 ? C.white : '#' + m[1] + m[2] + m[3];
  }
  function knock(x, y) {   // a push to the cabinet (the shake is a spring)
    if (reduced()) return;
    S.sh.vx += x * 40; S.sh.vy += y * 40;
  }
  function sparks(n, x, y, z, color, power) {
    power = power || 1;
    for (var i = 0; i < n; i++) {
      var a = rnd() * Math.PI * 2, sp = (40 + rnd() * 110) * power, life = 320 + rnd() * 420;
      state.sparks.push({ x: x, y: y, z: z, color: rnd() < 0.25 ? C.white : color, a: 1, size: 1 + rnd() * 1.6,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: (60 + rnd() * 140) * power, age: 0, life: life });
    }
    if (state.sparks.length > MAXSPARK) state.sparks.splice(0, state.sparks.length - MAXSPARK);
  }
  function pop(text, x, y, z, color, big, key) {
    if (typeof text === 'number') {   // quick repeats in the same place (a spinner, a bumper rattle) add up in one pop - and so
      // do points scored close together by different parts (the lead, 15 Oct 2026: pops were piling up on each other at the hangar)
      for (var i = state.pops.length - 1; i >= 0; i--) {
        var o = state.pops[i];
        if (o.word || o.age >= 500) continue;
        if ((key && o.key === key && o.age < 380) || (Math.abs(o.x - x) < 26 && Math.abs(o.y - y) < 26)) {
          o.value += text; o.text = fmt(o.value); o.age = Math.min(o.age, 60); return o;
        }
      }
    }
    x = Math.max(26, Math.min(232, x));   // (kept clear of the cabinet's sides, so the words never run off the table)
    var p = { x: x, y: y, z0: z, z: z, text: typeof text === 'number' ? fmt(text) : String(text), value: typeof text === 'number' ? text : 0,
      color: color || C.white, a: 0, s: 0, big: !!big, age: 0, life: big ? 1500 : 760, key: key || '', word: typeof text !== 'number' };
    state.pops.push(p);
    if (state.pops.length > MAXPOP) state.pops.splice(0, state.pops.length - MAXPOP);
    return p;
  }

  // what an event is, where it happened and in what colour
  function where(W, e) {
    var name = typeof e === 'string' ? e : e && e.sfx, b = ballOf(W), at, color, key = '', ex = null;
    switch (name) {
      case 'bumper': { var bb = B[e.i] || B[0]; at = { x: bb.x, y: bb.y, z: 20 }; color = BUMPC[e.i % 3]; key = 'b' + e.i; break; }
      case 'sling': { var sa = slingAt(e.side); at = { x: sa.x, y: sa.y, z: 8 }; ex = { path: slingPath(e.side), width: 22, key: 's' + e.side }; key = 's' + e.side; break; }
      case 'drop': { var dd = D[e.i] || D[0]; at = { x: (dd.ax + dd.bx) / 2, y: (dd.ay + dd.by) / 2, z: 10 }; color = DROPC[e.i % 5]; key = 'd' + e.i; break; }
      case 'drops': at = { x: P.bank.x, y: P.bank.y, z: 12 }; break;
      case 'reset': at = P.bank; ex = { path: DROP_PATH, width: 26 }; break;
      case 'spin': at = { x: P.spinL.x, y: P.spinL.y, z: 12 }; key = 'spin'; break;
      case 'orbit': case 'loop': { var o = nearestOf([P.spinL, P.orbR], b); at = { x: o.x, y: o.y, z: 14 }; if (name === 'loop') at = { x: MID, y: 200, z: 16, px: o.x }; break; }
      case 'lane': case 'mult': { var ln = nearestOf(P.lanes, b); at = { x: ln.x, y: ln.y, z: 8 }; break; }
      case 'skill': { var sk = P.lanes[W.skill] || nearestOf(P.lanes, b); at = { x: sk.x, y: sk.y, z: 10 }; break; }
      case 'inlane': { var il = nearestOf([sensor('inL'), sensor('inR')], b); at = { x: il.x, y: il.y, z: 6 }; key = 'in'; break; }
      case 'outlane': { var ol = nearestOf([sensor('outL'), sensor('outR')], b); at = { x: ol.x, y: ol.y, z: 6 }; break; }
      case 'kickback': at = { x: P.kick.x, y: P.kick.y, z: 6 }; break;
      case 'saucer': case 'jackpot': case 'eject': at = { x: SAU.x, y: SAU.y, z: 10 }; break;
      case 'rampin': at = { x: RAMP_PATH[1].x, y: RAMP_PATH[1].y, z: 4 }; ex = { path: RAMP_PATH.slice(0, 6), width: 18 }; break;
      case 'ramp': case 'combo': at = { x: P.rampTop.x, y: P.rampTop.y, z: P.rampTop.z + 14 }; ex = { path: RAMP_PATH, width: 20 }; break;
      case 'launch': at = { x: SH.cx, y: SH.tip - 10, z: 4 }; ex = { path: SHOOT_PATH, width: 22 }; break;
      case 'extra': at = { x: P.mid.x, y: P.mid.y, z: 20 }; break;
      case 'save': at = { x: P.save.x, y: P.save.y, z: 10 }; break;
      case 'newball': case 'ballend': case 'drain': at = { x: MID, y: 300, z: 0 }; break;
      default: return null;
    }
    return { name: name, at: at, color: color, key: key, ex: ex };
  }

  // ------------------------------------------------------------------ PinFX.events: one engine step's events
  function events(W, list) {
    if (!W) return;
    if (W !== S.W || W.frame < S.frame) adopt(W);
    var delta = W.score - S.score;
    S.score = W.score; S.frame = W.frame;
    if (!list || !list.length) return;
    var names = {}, best = null, bestRank = -1, i, e, n;
    for (i = 0; i < list.length; i++) { e = list[i]; n = typeof e === 'string' ? e : e && e.sfx; if (n) names[n] = true; }
    for (i = 0; i < list.length; i++) {
      e = list[i]; n = typeof e === 'string' ? e : e && e.sfx;
      if (!n) continue;
      if (n === 'nudge') { knock((W.frame & 1 ? 1 : -1) * 1.1, -0.5); continue; }
      if (n === 'warn') { S.warnAt = S.clock; continue; }
      if ((n === 'wall' || n === 'rubber') && e.v > 700) { var hb = ballOf(W); if (hb) sparks(Math.min(10, Math.round(e.v / 220)), hb.x, hb.y, 5, n === 'wall' ? C.white : C.yellow, 0.7); continue; }
      if (n === 'drain' && (names.save || W.balls.length > 0)) continue;   // saved, or other balls still in play: no dip
      if (n === 'drain') S.dipAt = S.clock;
      if (n === 'tick' || n === 'flip' || n === 'search' || n === 'rampfail' || n === 'over' || n === 'tilt') continue;
      var w = where(W, e); if (!w) continue;
      var d = SHOWS[n], col = w.color || d && d.color || C.white;
      w.at.color = col;
      if (d) {
        startShow(n, w.at, w.ex || (w.key ? { key: w.key } : null));
        if (d.sparks) sparks(reduced() ? Math.ceil(d.sparks / 2) : d.sparks, w.at.px != null ? w.at.px : w.at.x, w.at.y, w.at.z || 6, col, d.pri >= 5 ? 1.6 : 1);
        var word = d.word === 'BALL SAVED' || d.word === 'EXTRA BALL' || d.word === 'KICKBACK' ? d.word : n === 'mult' ? 'BONUS X' + W.mult : null;
        if (word) pop(word, w.at.x, w.at.y - (d.pop ? 18 : 0), (w.at.z || 6) + (d.pop ? 22 : 6), col, true);   // (above the points, when there are some)
      }
      var rk = RANK[n];
      if (rk != null && rk > bestRank) { bestRank = rk; best = { w: w, d: d, col: col }; }
    }
    // the points this step won pop up where the best of it happened (not while the bonus counts up)
    if (delta > 0 && best && W.state === 'play') {
      var big = best.d && best.d.pop === 'big';
      pop(delta, best.w.at.x, best.w.at.y, (best.w.at.z || 6) + 4, best.col, big, big ? '' : best.w.key || best.w.name);
    }
  }

  // ------------------------------------------------------------------ PinFX.update: once a frame, by real time
  function update(W, t, mode) {
    t = +t || 0;
    if (W && (W !== S.W || W.frame < S.frame)) adopt(W);
    var dt = S.last < 0 ? 0 : Math.max(0, Math.min(100, t - S.last));
    S.last = t;
    if (mode === 'paused') dt = 0;
    S.clock += dt;
    var k = dt / 1000, i, red = reduced();
    // points scored with no event to say where (a lit lane rolled again): at the ball
    if (W && W.score > S.score && W.state === 'play') { var bb = ballOf(W); if (bb) pop(W.score - S.score, bb.x, bb.y, 8, C.yellow, false, 'quiet'); }
    if (W) { S.score = W.score; S.frame = W.frame; }

    // the shows: drop the finished ones; the wide one in charge (if any) sets the background light
    var top = 0, giShow = 1;
    for (i = S.shows.length - 1; i >= 0; i--) {
      var s = S.shows[i];
      if (S.clock - s.t0 >= s.d.ms) { S.shows.splice(i, 1); continue; }
      if (s.d.wide && s.d.pri > top) top = s.d.pri;
      if (s.d.gi != null) giShow = Math.min(giShow, s.d.gi + (1 - s.d.gi) * Math.pow((S.clock - s.t0) / s.d.ms, 3));
    }
    // the lamps
    var L = lampList(), out = state.lamps;
    for (var id in out) if (Object.prototype.hasOwnProperty.call(out, id)) out[id] = 0;
    for (i = 0; i < S.shows.length; i++) {
      s = S.shows[i];
      if (top && s.d.pri < top) continue;   // a whole-table show pauses everything below it
      var look = LOOKS[s.d.look]; if (!look) continue;
      var p = (S.clock - s.t0) / s.d.ms;
      for (var j = 0; j < L.length; j++) {
        var v = look(L[j], p, s);
        if (v > 0 && v > (out[L[j].id] || 0)) out[L[j].id] = Math.min(1, v);
      }
    }
    var dark = W && (W.tilted || W.over);
    if (dark) for (id in out) if (Object.prototype.hasOwnProperty.call(out, id)) out[id] = 0;
    state.base += ((top ? 0.3 : 1) - state.base) * Math.min(1, k * (top ? 14 : 5));

    // the background light: off on a tilt, low at game over, dimmed while the bonus counts, dips on a drain, the shows'
    var gi = 1;
    if (W && W.tilted) gi = 0;
    else if (mode === 'over' || (W && W.over)) gi = 0.35;
    else {
      if (W && W.state === 'bonus') gi = 0.6;
      var since = S.clock - S.dipAt;
      if (since < 1700) gi = Math.min(gi, since < 200 ? 0.3 : 0.3 + 0.7 * smooth((since - 200) / 1500));
      if (S.clock - S.warnAt < 260) gi = Math.min(gi, 0.65);
      gi = Math.min(gi, giShow);
    }
    var gk = gi < state.gi ? 1 - Math.exp(-dt / 50) : 1 - Math.exp(-dt / 220);
    state.gi += (gi - state.gi) * gk;
    if (Math.abs(state.gi - gi) < 0.002) state.gi = gi;

    // the flash (and a jackpot's second one, a third of a second later)
    for (i = S.flashQ.length - 1; i >= 0; i--) if (S.clock >= S.flashQ[i].at) { flash(S.flashQ[i].v, S.flashQ[i].c); S.flashQ.splice(i, 1); }
    state.flash = red ? 0 : state.flash * Math.exp(-dt / 85);
    if (state.flash < 0.01) state.flash = 0;

    // the shake: a stiff spring that rings down in about a quarter of a second
    var sh = S.sh;
    if (red) { sh.x = sh.y = sh.vx = sh.vy = 0; }
    else {
      var n = Math.max(1, Math.ceil(dt / 8)), h = k / n;
      for (i = 0; i < n; i++) {
        sh.vx += (-1100 * sh.x - 22 * sh.vx) * h; sh.vy += (-1100 * sh.y - 22 * sh.vy) * h;
        sh.x += sh.vx * h; sh.y += sh.vy * h;
      }
      sh.x = Math.max(-1.5, Math.min(1.5, sh.x)); sh.y = Math.max(-1.5, Math.min(1.5, sh.y));
      if (Math.abs(sh.x) + Math.abs(sh.y) + (Math.abs(sh.vx) + Math.abs(sh.vy)) * 0.01 < 0.005) sh.x = sh.y = sh.vx = sh.vy = 0;
    }
    state.shake.x = sh.x; state.shake.y = sh.y;

    // the pops rise, swell and fade
    var pops = state.pops;
    for (i = pops.length - 1; i >= 0; i--) {
      var o = pops[i]; o.age += dt;
      var q = o.age / o.life;
      if (q >= 1) { pops.splice(i, 1); continue; }
      var base = o.big ? 1.6 : 1, sw = o.age < 110 ? 0.5 + 0.8 * (o.age / 110) : 1.3 - 0.3 * Math.min(1, (o.age - 110) / 160);
      o.s = base * sw;
      o.a = o.age < 60 ? o.age / 60 : q > 0.65 ? (1 - q) / 0.35 : 1;
      o.z = o.z0 + (o.big ? 26 : 16) * (1 - Math.pow(1 - q, 2));
    }
    // the sparks fly, fall on to the table and bounce
    var sp = state.sparks;
    for (i = sp.length - 1; i >= 0; i--) {
      var c = sp[i]; c.age += dt;
      if (c.age >= c.life) { sp.splice(i, 1); continue; }
      var drag = Math.exp(-k * 2.2);
      c.vx *= drag; c.vy *= drag; c.vz -= 520 * k;
      c.x += c.vx * k; c.y += c.vy * k; c.z += c.vz * k;
      if (c.z < 0) { c.z = 0; c.vz = -c.vz * 0.35; c.vx *= 0.7; c.vy *= 0.7; }
      c.a = 1 - Math.pow(c.age / c.life, 1.6);
    }
    return state;
  }
  function smooth(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

  var api = {
    events: events, update: update, state: state, SHOWS: SHOWS, LOOKS: LOOKS,
    reduce: null,   // null: follow the site's Reduce motion / the system setting; true or false to force it (tests)
    reset: function () { adopt(null); S.clock = 0; S.last = -1; S.flashAt = -1e9; state.gi = 1; },
    show: function (name, x, y) { return startShow(name, { x: x == null ? MID : x, y: y == null ? 223 : y }); },   // start a show by name
    debug: function () { return { clock: S.clock, shows: S.shows.map(function (s) { return s.name; }), flashAt: S.flashAt }; },
    version: 1
  };
  return api;
});
