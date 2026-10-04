/* 365 Coast Run - the rules (5 Oct 2026). Our own seaside road race in the style of the 80s and 90s sit-down racers: a
 * road drawn in slices that curves and climbs (coastrun.js draws it), a clock that runs down, a checkpoint at the end of
 * each stretch that adds time, traffic to weave through, and a fork in the road after each stretch - keep left or right
 * and you choose where you go next. Three stretches make a run: Bournemouth, then the Purbeck Hills or the New Forest,
 * then the Jurassic Coast, Poole Harbour (at night) or the Needles; the goal gives a time bonus and the run starts again
 * from Bournemouth, busier and quicker. Our own names, roads, cars and pictures - nothing taken from anyone's game.
 *
 * Units: the road is made of segments SEG long; x is across the road in half-road widths (the road runs -1..1, the verge
 * beyond); speeds are world units a second (MAXS = full speed = 160 mph on the dial). 60 steps a second.
 * At a fork the road widens to twice its width, then splits into two roads that drift apart. Until the player reaches the
 * split, x is measured from the middle of the wide road; from the split on, from the middle of the road they chose
 * (W.fork.s = -1 left / 1 right), and the other road is drawn moving away. Cars and roadside things in the split carry
 * b = the road they are on.
 * Runs in a browser (window.CREngine) and in node (require) for the tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CREngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var SEG = 200, ROAD = 2000, MAXS = 12000, DT = 1 / 60;
  var DRAW = 210;                    // segments the picture looks ahead (the traffic lives within it)
  var CAR_HALF = 0.18;               // half the player's car, in half-road widths
  var LANES = [-2 / 3, 0, 2 / 3];
  var FA = 70, FB = 130, OFF_END = 16;   // a fork: FA segments of widening road, then FB of two roads parting

  function rnd(seed) {   // mulberry32: the same numbers every time for the same seed
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function easeIn(a, b, p) { return a + (b - a) * p * p; }
  function easeInOut(a, b, p) { return a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function forkOff(k) { return 1 + (OFF_END - 1) * Math.pow(clamp(k, 0, FB) / FB, 2); }   // how far each road of a split is from the middle

  // ---------------------------------------------------------------- the stretches of road
  // t = seconds the stretch gives you (the first one starts the clock, the others are added at their checkpoint);
  // len = segments before the fork or the goal; sea = which side the sea is on (-1 left, 1 right, 0 none);
  // mix = the traffic, as weights for VEH below; next = [left, right] at the fork (none = the goal)
  var STAGES = [
    { id: 0, key: 'bournemouth', name: 'BOURNEMOUTH', seed: 1103, t: 66, len: 2500, curvy: 0.5, hilly: 0.25, sea: -1, next: [1, 2], mix: [5, 4, 2, 2, 3, 0, 0, 2] },
    { id: 1, key: 'purbeck', name: 'PURBECK HILLS', seed: 2207, t: 66, len: 2700, curvy: 0.6, hilly: 1, sea: 0, next: [3, 4], mix: [5, 3, 2, 0, 3, 3, 1, 1] },
    { id: 2, key: 'forest', name: 'NEW FOREST', seed: 3301, t: 66, len: 2700, curvy: 0.8, hilly: 0.35, sea: 0, next: [4, 5], mix: [5, 3, 2, 0, 3, 2, 1, 1] },
    { id: 3, key: 'jurassic', name: 'JURASSIC COAST', seed: 4409, t: 70, len: 2900, curvy: 0.7, hilly: 0.65, sea: -1, next: null, mix: [5, 3, 1, 1, 3, 1, 0, 2] },
    { id: 4, key: 'harbour', name: 'POOLE HARBOUR', seed: 5503, t: 68, len: 2800, curvy: 0.55, hilly: 0.2, sea: 1, next: null, mix: [5, 4, 3, 2, 1, 0, 2, 2] },
    { id: 5, key: 'needles', name: 'THE NEEDLES', seed: 6607, t: 70, len: 2900, curvy: 0.65, hilly: 0.55, sea: 1, next: null, mix: [5, 3, 1, 1, 3, 0, 0, 2] }
  ];
  // the traffic: hit = half its width (half-road widths), v = its speed (share of full speed)
  var VEH = [
    { id: 'hatch', hit: 0.17, v: [0.42, 0.58] },
    { id: 'saloon', hit: 0.18, v: [0.45, 0.6] },
    { id: 'van', hit: 0.19, v: [0.38, 0.52] },
    { id: 'bus', hit: 0.23, v: [0.3, 0.38] },
    { id: 'camper', hit: 0.19, v: [0.34, 0.46] },
    { id: 'tractor', hit: 0.18, v: [0.18, 0.24] },
    { id: 'lorry', hit: 0.23, v: [0.34, 0.44] },
    { id: 'sports', hit: 0.17, v: [0.55, 0.66] }
  ];
  // the player's car: top speed, acceleration and grip (grip eases the pull of a bend)
  var CARS = {
    roadster: { top: 1, acc: 1, grip: 1 },
    gt: { top: 1.07, acc: 0.9, grip: 0.88 },
    hatch: { top: 0.94, acc: 1.18, grip: 1.16 }
  };
  // the three speeds: more time, fewer and slower cars, gentler bends and bumps rather than crashes at Gentle
  var DIFF = {
    1: { time: 1.3, gap: 46, tv: 0.9, cf: 0.16, crash: false, off: 0.5 },
    2: { time: 1, gap: 30, tv: 1, cf: 0.26, crash: true, off: 0.42 },
    3: { time: 0.88, gap: 22, tv: 1.08, cf: 0.3, crash: true, off: 0.38 }
  };

  function segIndex(z) { return Math.floor(z / SEG); }
  function segAt(W, i) { var s = W.segs[i - W.base]; return s || W.segs[i < W.base ? 0 : W.segs.length - 1]; }
  function lastIndex(W) { return W.base + W.segs.length - 1; }

  // ---------------------------------------------------------------- building a stretch
  function add(B, curve, y2, extra) {
    var W = B.W, i = W.base + W.segs.length, s = { i: i, y1: W.lastY, y2: y2, c: curve, st: B.S.id, sea: 0, sh: 0, wl: 0, wr: 0, spr: null, coins: null, gate: null, fk: null };
    if (B.S.sea) {   // the sea: how far the shore is from the middle of the road wanders between right by the road and well away
      if (B.k > B.S.len - 340) B.shT = 11;
      else if (B.k >= B.next) { B.shT = [1.9, 2.1, 2.4, 2.8, 4, 7][(B.rng() * 6) | 0]; B.next = B.k + 260 + ((B.rng() * 360) | 0); }
      B.sh += clamp(B.shT - B.sh, -0.025, 0.025);
      s.sea = B.S.sea; s.sh = B.sh;
    }
    if (B.wallL > 0) { s.wl = 1.36; B.wallL--; }
    if (B.wallR > 0) { s.wr = 1.36; B.wallR--; }
    if (extra) for (var k in extra) s[k] = extra[k];
    W.segs.push(s); W.lastY = y2; B.k++;
    return s;
  }
  function road(B, enter, hold, leave, curve, dy) {
    var W = B.W, y0 = W.lastY, y1 = y0 + dy * SEG, n = enter + hold + leave, k = 0, first = W.base + W.segs.length, i;
    for (i = 0; i < enter; i++, k++) add(B, easeIn(0, curve, i / enter), easeInOut(y0, y1, (k + 1) / n));
    for (i = 0; i < hold; i++, k++) add(B, curve, easeInOut(y0, y1, (k + 1) / n));
    for (i = 0; i < leave; i++, k++) add(B, easeInOut(curve, 0, i / leave), easeInOut(y0, y1, (k + 1) / n));
    if (Math.abs(curve) >= 3.4) B.bends.push({ from: first + enter - 4, to: first + enter + hold, dir: curve > 0 ? 1 : -1 });
  }
  function piece(B) {   // one bit of road, chosen by the stretch's character
    var S = B.S, r = B.rng, side = r() < 0.5 ? -1 : 1, hill = function (n) { return r() < S.hilly * 0.75 ? Math.round((r() * 2 - 1) * Math.min(0.32 * n, 14 + 34 * S.hilly)) : 0; };
    var p = r();
    if (p < 0.24 - S.curvy * 0.1) { var n0 = 40 + ((r() * 70) | 0); road(B, 10, n0, 10, 0, hill(n0 + 20)); }
    else if (p < 0.55) { var e = 25 + ((r() * 25) | 0), h = 40 + ((r() * 80) | 0); road(B, e, h, e, side * (1.6 + r() * 2.2), hill(2 * e + h)); }
    else if (p < 0.75) { var e2 = 18 + ((r() * 18) | 0), h2 = 22 + ((r() * 40) | 0); road(B, e2, h2, e2, side * (3.6 + r() * 2.4), hill(2 * e2 + h2)); }
    else if (p < 0.9) {   // an S-bend
      var e3 = 18 + ((r() * 14) | 0), c3 = 2.6 + r() * 3;
      road(B, e3, 20 + ((r() * 25) | 0), e3, side * c3, 0); road(B, e3, 20 + ((r() * 25) | 0), e3, -side * c3, hill(60));
    } else {   // a run of crests
      var m = 2 + ((r() * 3) | 0), cc = r() < 0.5 ? 0 : side * (1 + r() * 1.5);
      for (var j = 0; j < m; j++) { var len = 24 + ((r() * 16) | 0), dy = Math.round((10 + r() * 16) * (0.5 + S.hilly)); road(B, 6, len, 6, cc, dy); road(B, 6, len, 6, cc, -dy); }
    }
  }
  function put(W, i, t, x, h, o) {   // something at the roadside: t = what (coastrun.js draws it), x = where, h = how wide it is to hit (0 = it can't be hit)
    var s = W.segs[i - W.base]; if (!s) return null;
    var it = { t: t, x: x, h: h || 0, v: (o && o.v) || 0, b: (o && o.b) || 0 };
    if (o) { if (o.soft) it.soft = true; if (o.txt) it.txt = o.txt; if (o.s) it.s = o.s; }
    (s.spr || (s.spr = [])).push(it);
    return it;
  }
  function land(s, x) { return !s.fk && !s.gate && (!s.sea || (x < 0 ? -1 : 1) !== s.sea || Math.abs(x) < s.sh - 0.42); }
  function water(s, x) { return s.sea && (x < 0 ? -1 : 1) === s.sea && Math.abs(x) > s.sh + 0.7; }

  function buildStage(W, id) {
    var S = STAGES[id], B = { W: W, S: S, rng: rnd(S.seed), k: 0, sh: S.sea ? 2.4 : 0, shT: 2.2, next: 200, bends: [], wallL: 0, wallR: 0 };
    var s0 = W.base + W.segs.length, i, first = !W.stretch.length, rec = { id: id, from: s0, to: 0, fork: null };
    // the opening straight with its gate: START for the first run, ROUND n for the others, CHECKPOINT after a fork
    for (i = 0; i < 90; i++) add(B, 0, W.lastY);
    var gk = first ? 'start' : id === 0 ? 'round' : 'check';
    segAt(W, s0 + 14).gate = { kind: gk, st: id };
    put(W, s0 + 14, 'gate', 0, 0, { v: gk === 'start' ? 0 : gk === 'round' ? 1 : 2 });
    if (gk === 'start') segAt(W, s0 + 10).line = true;
    // the road itself, with walls and fences along some stretches
    while (B.k < S.len) {
      if ((id === 1 || id === 3 || id === 5) && B.wallL <= 0 && B.wallR <= 0 && B.rng() < 0.35) {
        var side = S.sea ? -S.sea : (B.rng() < 0.5 ? -1 : 1), n = 60 + ((B.rng() * 100) | 0);
        if (side < 0) B.wallL = n; else B.wallR = n;
      }
      piece(B);
    }
    B.wallL = B.wallR = 0;
    var end;
    if (S.next) {   // the fork: the road widens, then splits
      var a0 = W.base + W.segs.length;
      for (i = 0; i < FA; i++) add(B, 0, W.lastY, { fk: { a: 1, w1: 1 + easeInOut(0, 1, i / FA), w2: 1 + easeInOut(0, 1, (i + 1) / FA) } });
      var b0 = W.base + W.segs.length;
      for (i = 0; i < FB; i++) add(B, 0, W.lastY, { fk: { b: 1, o1: forkOff(i), o2: forkOff(i + 1) } });
      end = W.base + W.segs.length;
      rec.fork = { a: a0, split: b0, end: end, next: S.next };
      var L = STAGES[S.next[0]].name, R = STAGES[S.next[1]].name;
      [a0 - 90, a0 - 20, a0 + 15].forEach(function (j) { put(W, j, 'fsign', -1.5, 0.1, { txt: L, v: -1 }); put(W, j, 'fsign', 1.5, 0.1, { txt: R, v: 1 }); });
      put(W, b0, 'nose', 0, 0, { txt: L + '|' + R });
      for (i = 2; i < FB; i += 4) { put(W, b0 + i, 'gpost', 1.32, 0, { b: -1 }); put(W, b0 + i, 'gpost', -1.32, 0, { b: 1 }); }
    } else {   // the goal
      for (i = 0; i < 40; i++) add(B, 0, W.lastY);
      end = W.base + W.segs.length;
      segAt(W, end - 24).gate = { kind: 'goal', st: id };
      put(W, end - 24, 'gate', 0, 0, { v: 3 });
      W.goalAt = end - 24;
    }
    // the bends: arrows before, chevrons round the outside
    B.bends.forEach(function (b) {
      var x = -b.dir * 1.34;
      if (land(segAt(W, b.from - 36), x * 1.05)) put(W, b.from - 36, 'warn', x * 1.05, 0.05, { v: b.dir });
      for (var j = b.from; j < b.to; j += 7) if (land(segAt(W, j), x)) put(W, j, 'chev', x, 0.04, { v: b.dir });
    });
    decorate(W, S, s0 + 90, s0 + 90 + S.len, rnd(S.seed * 7 + 1));
    pickups(W, s0 + 150, s0 + 90 + S.len - 160, rnd(S.seed * 13 + 5));
    rec.to = end; W.stretch.push(rec);
    if (W.stretch.length > 12) W.stretch.shift();
    if (!S.next) buildStage(W, 0);   // after the goal the road goes on: Bournemouth again
  }

  // ---------------------------------------------------------------- what stands by the road (the pictures are in coastrun.js)
  function decorate(W, S, from, to, r) {
    var i, s, k, x, sh;
    function both(f) { f(-1); f(1); }
    for (i = from; i < to; i++) {
      s = segAt(W, i); k = i - from; sh = s.sh;
      if (s.fk) continue;
      if (s.wl && k % 2 === 0) put(W, i, S.id === 1 ? 'wall' : 'fence', -1.4, 0);
      if (s.wr && k % 2 === 0) put(W, i, S.id === 1 ? 'wall' : 'fence', 1.4, 0);
      if (k % 420 === 210) { x = (S.sea || -1) * -1.75; if (land(s, x)) put(W, i, 'board', x, 0.16, { v: (k / 420) | 0 }); }
      switch (S.id) {
        case 0:   // Bournemouth: the prom, beach huts and the sea on the left; gardens, palms and hotels on the right
          if (k % 22 === 0) { if (land(s, -1.34)) put(W, i, 'lamp', -1.34, 0.03); put(W, i, 'lamp', 1.34, 0.03); }
          if (sh > 2.45 && k % 150 < 60 && k % 5 === 0 && land(s, -1.62)) put(W, i, 'hut', -1.62, 0.15, { v: (k / 5) % 6 });
          if (r() < 0.05 && sh > 2.2) { x = -(1.9 + r() * (sh - 2.3)); if (land(s, x)) put(W, i, 'brolly', x, 0.06, { soft: true, v: (r() * 4) | 0 }); }
          if (r() < 0.08) put(W, i, 'palm', 1.35 + r() * 0.8, 0.06, { v: (r() * 3) | 0 });
          if (r() < 0.035) put(W, i, 'bush', 1.5 + r() * 1.6, 0.1, { soft: true, v: 0 });
          if (r() < 0.03) put(W, i, 'hotel', 3.7 + r() * 2.5, 0, { v: (r() * 4) | 0 });
          if (r() < 0.02) { x = -(sh + 2 + r() * 10); if (water(s, x)) put(W, i, 'yacht', x, 0, { v: (r() * 3) | 0 }); }
          if (k === Math.round(S.len * 0.32) || k === Math.round(S.len * 0.74)) put(W, i, 'pier', -(Math.max(sh, 2) + 4.2), 0, { v: k > S.len / 2 ? 1 : 0 });
          break;
        case 1:   // the Purbeck Hills: stone walls, oaks, sheep, cottages, hay and a castle on a hill
          both(function (d) {
            if (r() < 0.05) put(W, i, 'oak', d * (1.6 + r() * 1.8), 0.09, { v: 0 });
            if (r() < 0.03) put(W, i, 'bush', d * (1.45 + r() * 1.5), 0.1, { soft: true, v: 1 });
            if (r() < 0.04) put(W, i, 'sheep', d * (3.5 + r() * 5), 0, { v: (r() * 2) | 0 });
            if (r() < 0.012) put(W, i, 'hay', d * (1.7 + r() * 1.3), 0.12, { soft: true });
          });
          if (r() < 0.005) { x = (r() < 0.5 ? -1 : 1) * (2.3 + r() * 0.8); put(W, i, 'cottage', x, 0.3, { v: (r() * 2) | 0 }); }
          if (k % 300 === 150) put(W, i, 'finger', (k % 600 ? -1 : 1) * 1.32, 0.03);
          if (k === Math.round(S.len * 0.45)) put(W, i, 'castle', 9, 0);
          break;
        case 2:   // the New Forest in autumn: oak, beech, pine and birch, ponies, heather and bracken
          both(function (d) {
            if (r() < 0.2) { var tt = ['oak', 'beech', 'pine', 'birch'][(r() * 4) | 0]; x = d * (1.45 + Math.pow(r(), 0.7) * 3.4); put(W, i, tt, x, tt === 'birch' ? 0.05 : 0.08, { v: 1 + ((r() * 2) | 0) }); }
            if (r() < 0.035) put(W, i, 'heather', d * (1.35 + r() * 1.6), 0.08, { soft: true, v: (r() * 2) | 0 });
            if (r() < 0.016) put(W, i, 'pony', d * (3.4 + r() * 3), 0, { v: (r() * 3) | 0 });
          });
          if (r() < 0.006) put(W, i, 'logs', (r() < 0.5 ? -1 : 1) * (1.6 + r() * 0.8), 0.13);
          if (k % 650 === 325) put(W, i, 'forestsign', 1.34, 0.04);
          break;
        case 3:   // the Jurassic Coast at sunset: chalk, gorse, rocks, a lighthouse and a stone arch out at sea
          if (r() < 0.05) put(W, i, 'gorse', 1.45 + r() * 1.8, 0.08, { soft: true });
          if (r() < 0.03) { x = -(1.45 + r() * Math.max(0.2, sh - 2)); if (land(s, x)) put(W, i, 'gorse', x, 0.08, { soft: true }); }
          if (r() < 0.012) { x = (r() < 0.5 ? -1 : 1) * (1.5 + r() * 1.4); if (land(s, x)) put(W, i, 'rock', x, 0.13, { v: (r() * 3) | 0 }); }
          if (r() < 0.025) put(W, i, 'sheep', 3.5 + r() * 5, 0, { v: (r() * 2) | 0 });
          if (r() < 0.008) { x = -(sh + 3 + r() * 10); if (water(s, x)) put(W, i, 'stack', x, 0, { v: (r() * 3) | 0 }); }
          if (k === Math.round(S.len * 0.4)) put(W, i, 'lighthouse', -(Math.max(sh, 2.2) + 3.5), 0, { v: 0 });
          if (k === Math.round(S.len * 0.7)) put(W, i, 'arch', -(Math.max(sh, 2.2) + 7), 0);
          break;
        case 4:   // Poole Harbour at night: lamps, lit buildings and palms on the left, the quay, boats and buoys on the right
          if (k % 14 === 0) { put(W, i, 'lamp', -1.34, 0.03, { v: 1 }); if (land(s, 1.34)) put(W, i, 'lamp', 1.34, 0.03, { v: 1 }); }
          if (r() < 0.045) put(W, i, 'building', -(2.4 + r() * 2.6), 0.3, { v: (r() * 4) | 0 });
          if (r() < 0.04) put(W, i, 'palm', -(1.4 + r() * 0.6), 0.06, { v: (r() * 3) | 0 });
          if (k % 6 === 0 && sh && sh < 3.3) put(W, i, 'bollard', sh - 0.32, 0);
          if (r() < 0.05) { x = sh + 1 + r() * 9; if (water(s, x)) put(W, i, 'yacht', x, 0, { v: 3 + ((r() * 3) | 0) }); }
          if (r() < 0.015) { x = sh + 1.5 + r() * 6; if (water(s, x)) put(W, i, 'buoy', x, 0, { v: (r() * 2) | 0 }); }
          if (k === Math.round(S.len * 0.55)) put(W, i, 'ferry', Math.max(sh, 2) + 5, 0);
          break;
        case 5:   // the Needles at dawn: downs and gorse, chalk stacks, boats, and the lighthouse at the end of the rocks
          if (r() < 0.045) put(W, i, 'gorse', -(1.45 + r() * 1.8), 0.08, { soft: true });
          if (r() < 0.02) { x = 1.45 + r() * Math.max(0.2, sh - 2); if (land(s, x)) put(W, i, 'gorse', x, 0.08, { soft: true }); }
          if (r() < 0.012) { x = (r() < 0.5 ? -1 : 1) * (1.5 + r() * 1.4); if (land(s, x)) put(W, i, 'rock', x, 0.13, { v: (r() * 3) | 0 }); }
          if (r() < 0.025) put(W, i, 'sheep', -(3.5 + r() * 5), 0, { v: (r() * 2) | 0 });
          if (r() < 0.01) { x = sh + 3 + r() * 10; if (water(s, x)) put(W, i, 'stack', x, 0, { v: (r() * 3) | 0 }); }
          if (r() < 0.01) { x = sh + 2 + r() * 9; if (water(s, x)) put(W, i, 'yacht', x, 0, { v: (r() * 3) | 0 }); }
          if (k === Math.round(S.len * 0.82)) put(W, i, 'needles', Math.max(sh, 2.2) + 6, 0);
          break;
      }
    }
  }
  function pickups(W, from, to, r) {   // lines of coins to collect, and the odd nitro bottle
    var i = from + 40 + ((r() * 60) | 0), id = 0;
    while (i < to) {
      var lane = LANES[(r() * 3) | 0], kind = r(), n = kind < 0.6 ? 8 : 12;
      id++;
      for (var j = 0; j < n; j++) {
        var s = segAt(W, i + j * 3); if (!s || s.fk || s.gate) continue;
        var x = kind < 0.6 ? lane : clamp(Math.sin(j / (n - 1) * Math.PI * 2) * 0.62, -0.7, 0.7);
        (s.coins || (s.coins = [])).push({ x: x, line: id, of: n, got: 0 });
      }
      i += n * 3 + 70 + ((r() * 110) | 0);
      if (r() < 0.3) { var sn = segAt(W, i); if (sn && !sn.fk) (sn.coins || (sn.coins = [])).push({ x: LANES[(r() * 3) | 0], nitro: true, got: 0 }); i += 40; }
    }
  }

  // ---------------------------------------------------------------- a new game
  function newWorld(speed, set, seed) {
    var d = speed === 3 ? 3 : speed === 2 ? 2 : 1;
    set = set || {};
    var W = {
      diff: d, speed: d, D: DIFF[d], car: CARS[set.car] ? set.car : 'roadster', auto: set.pedal !== 'hold',
      seed: seed == null ? (Math.random() * 4294967296) >>> 0 : seed >>> 0,
      segs: [], base: 0, lastY: 0, fork: null, goalAt: -1, stretch: [],
      z: 0, x: 0, v: 0, steer: 0, boost: 0.4, boosting: false, wasBoost: false, drift: 0, driftT: 0, driftPts: 0,
      time: 0, timeUp: false, overT: 0, count: 200, t: 0, score: 0, sAcc: 0,
      stageNo: 1, round: 1, stage: 0, route: [0], cars: [], carN: 1, crash: null,
      combo: 0, comboT: 0, coinRun: 0, coinLast: -99, lineGot: {}, slip: 0, slipOn: false, scrapeT: 0, off: false,
      skyX: 0, shake: 0, events: [], fx: [], fxN: 0, pops: [], banner: null, over: false, demo: false, nearN: 0, coinsN: 0
    };
    W.rng = rnd(W.seed);
    buildStage(W, 0); nextFork(W, 0);
    W.time = W.D.time * STAGES[0].t;
    W.z = 6 * SEG;
    var gap = W.D.gap * SEG;
    for (var z = W.z + 30 * SEG; z < W.z + DRAW * SEG; z += gap * (0.6 + W.rng() * 0.8)) spawnCar(W, z);
    return W;
  }
  function bannerOf(W, txt, sub, kind) { W.banner = { txt: txt, sub: sub || '', kind: kind || '', t: W.t }; }
  function pop(W, txt, sub, x, kind) { W.pops.push({ txt: txt, sub: sub || '', x: x || 0, t: W.t, kind: kind || '' }); if (W.pops.length > 6) W.pops.shift(); }
  function fx(W, o) { o.t = W.t; o.n = ++W.fxN; W.fx.push(o); if (W.fx.length > 200) W.fx.shift(); }

  // ---------------------------------------------------------------- traffic
  function pick(mix, r) { var tot = 0, i; for (i = 0; i < mix.length; i++) tot += mix[i]; var p = r() * tot; for (i = 0; i < mix.length; i++) { p -= mix[i]; if (p < 0) return i; } return 0; }
  function spawnCar(W, z) {
    var i = segIndex(z); if (i > lastIndex(W) - 6 || i < W.base) return;
    var s = segAt(W, i), S = STAGES[s.st], t = pick(S.mix, W.rng), T = VEH[t], b = 0, x = LANES[(W.rng() * 3) | 0];
    if (s.gate || (s.fk && s.fk.a)) return;
    if (s.fk && s.fk.b) { if (W.fork && W.fork.s) b = W.fork.s; else b = W.rng() < 0.5 ? -1 : 1; }
    for (var j = 0; j < W.cars.length; j++) { var o = W.cars[j]; if (o.b === b && Math.abs(o.z - z) < 900 && Math.abs(o.x - x) < 0.5) return; }
    var tv = W.D.tv * (1 + 0.06 * (W.round - 1)), v = MAXS * (T.v[0] + W.rng() * (T.v[1] - T.v[0])) * tv;
    W.cars.push({ id: W.carN++, z: z, x: x, tx: x, v: v, v0: v, t: t, b: b, col: (W.rng() * 8) | 0, lc: 60, hitT: -999, passed: false, dz: z - W.z });
  }
  function sameRoad(W, c) { return !(W.fork && W.fork.s && c.b && c.b !== W.fork.s); }
  function moveTraffic(W) {
    var cars = W.cars, i, j, c, o, F = W.fork;
    for (i = 0; i < cars.length; i++) {
      c = cars[i];
      var ahead = null, dmin = 1e9;
      for (j = 0; j < cars.length; j++) {
        o = cars[j]; if (o === c || o.b !== c.b) continue;
        var d = o.z - c.z; if (d > 0 && d < 1000 && d < dmin && Math.abs(o.x - c.x) < 0.4) { dmin = d; ahead = o; }
      }
      c.lc--;
      if (ahead) {
        if (c.lc <= 0) {   // try a free lane beside
          var tries = [c.tx - 2 / 3, c.tx + 2 / 3].filter(function (L) { return L > -0.75 && L < 0.75; });
          for (j = 0; j < tries.length; j++) {
            var free = !(sameRoad(W, c) && Math.abs(W.z - c.z) < 1400 && Math.abs(W.x - tries[j]) < 0.5);   // never pull out in front of the player
            for (var q = 0; free && q < cars.length; q++) { o = cars[q]; if (o !== c && o.b === c.b && Math.abs(o.z - c.z) < 1100 && Math.abs(o.x - tries[j]) < 0.45) free = false; }
            if (free) { c.tx = tries[j]; c.lc = 150; break; }
          }
        }
        if (c.tx === ahead.tx || Math.abs(ahead.x - c.x) < 0.4) c.v = Math.min(c.v, ahead.v);
      } else c.v += (c.v0 - c.v) * 0.01;
      if (sameRoad(W, c)) {   // never drive into the back of the player
        var dz = c.z - W.z;
        if (dz < 0 && dz > -800 && Math.abs(c.x - W.x) < 0.42) c.v = Math.min(c.v, W.v * 0.95);
      }
      var si = segIndex(c.z), s = segAt(W, si);
      if (s.fk && s.fk.a && Math.abs(c.tx) < 0.5) c.tx = (c.id % 2 ? 1 : -1) * 0.9;   // in the widening road the middle lane picks a side
      else if (c.lc < -400 && W.rng() < 0.004) { var nl = LANES[(W.rng() * 3) | 0]; if (!(sameRoad(W, c) && Math.abs(W.z - c.z) < 1400 && Math.abs(W.x - nl) < 0.5)) { c.tx = nl; c.lc = 120; } }
      c.x += clamp(c.tx - c.x, -0.6 * DT, 0.6 * DT);
      var z0 = c.z; c.z += c.v * DT;
      if (F && c.b === 0 && segIndex(c.z) >= F.split && segIndex(z0) < F.split) {   // this car reaches the split: it takes the road on its side
        c.b = c.x >= 0 ? 1 : -1; c.x -= c.b; c.tx = clamp(Math.round(c.x * 1.5) / 1.5, -2 / 3, 2 / 3);
      }
    }
    // cars left far behind, driven off down the other road, or out of sight ahead go; new ones come into view
    for (i = cars.length - 1; i >= 0; i--) {
      c = cars[i];
      if (c.z < W.z - 3200 || c.z > W.z + (DRAW + 30) * SEG || segIndex(c.z) > lastIndex(W) - 2 || (F && F.s && c.b && c.b !== F.s && segIndex(c.z) >= F.end - 2) || (!F && c.b)) cars.splice(i, 1);
    }
    var want = Math.round(DRAW / (W.D.gap * Math.pow(0.92, W.round - 1))), n = 0;
    for (i = 0; i < cars.length; i++) if (cars[i].z > W.z) n++;
    if (n < want && W.t % 10 === 0) spawnCar(W, W.z + (DRAW * (0.8 + W.rng() * 0.18)) * SEG);
  }

  // ---------------------------------------------------------------- the player
  function edges(W, s) {   // how far the car can go each way: the verge, walls, the sea wall, and the barrier in a split
    var lo = -3.2, hi = 3.2, F = W.fork;
    if (s.fk && s.fk.a) { var w = (s.fk.w1 + s.fk.w2) / 2; lo = -(w + 2.2); hi = w + 2.2; }
    if (s.fk && s.fk.b && F && F.s) { if (F.s > 0) lo = -1.42; else hi = 1.42; }
    if (s.sea && s.sh - 0.3 < 3.2) { if (s.sea < 0) lo = Math.max(lo, -(s.sh - 0.3)); else hi = Math.min(hi, s.sh - 0.3); }
    if (s.wl) lo = Math.max(lo, -(s.wl - CAR_HALF));
    if (s.wr) hi = Math.min(hi, s.wr - CAR_HALF);
    return [lo, hi];
  }
  function roadHalf(s) { return s.fk && s.fk.a ? (s.fk.w1 + s.fk.w2) / 2 : 1; }
  function crash(W, hard, why) {
    if (W.crash) return;
    var tx = clamp(W.x, -0.66, 0.66);
    W.crash = { t: 0, dur: hard ? 110 : 40, hard: hard, x0: W.x, tx: tx, spin: W.x < 0 ? 1 : -1, why: why || '' };
    W.combo = 0; W.comboT = 0; W.drift = 0; W.boosting = false; W.shake = hard ? 24 : 12;
    W.events.push({ sfx: hard ? 'crash' : 'bump', x: 0 });
    fx(W, { k: hard ? 'crash' : 'bump', x: W.x });
    if (hard) W.events.push({ say: 'Crash!' });
  }
  function endDrift(W) {
    if (W.driftT > 0.6) {
      var p = Math.round(W.driftPts / 10) * 10; W.score += p;
      pop(W, 'DRIFT', '+' + p.toLocaleString('en-GB'), W.drift, 'drift'); W.events.push({ sfx: 'driftend' });
    }
    W.drift = 0; W.driftT = 0; W.driftPts = 0;
  }
  function cross(W, i) {   // the car's nose passes into segment i
    var s = segAt(W, i), F = W.fork, j;
    if (F && i === F.split && !F.s) {   // the split: whichever side the car is on is the road it takes
      var sx = W.x >= 0 ? 1 : -1, nextId = F.next[sx < 0 ? 0 : 1];
      if (Math.abs(W.x) < CAR_HALF + 0.12) crash(W, W.D.crash && W.v > MAXS * 0.3, 'sign');
      F.s = sx; W.x -= sx; if (W.crash) W.crash.tx = 0; F.beta = 0;
      buildStage(W, nextId); W.route.push(nextId);
      W.events.push({ sfx: 'fork' }); W.events.push({ say: 'You chose ' + STAGES[nextId].name.toLowerCase() });
      bannerOf(W, STAGES[nextId].name, 'Next checkpoint ahead', 'stage');
    }
    if (F && F.s && i >= F.end) {   // out of the split: one road again
      W.cars = W.cars.filter(function (c) { return !c.b || c.b === F.s; });
      W.cars.forEach(function (c) { c.b = 0; });
      F = null; nextFork(W, i);   // the next fork ahead is now the one to watch
    }
    if (s.gate) gate(W, s.gate);
    if (s.coins) for (j = 0; j < s.coins.length; j++) {
      var c = s.coins[j];
      if (!c.got && Math.abs(W.x - c.x) < 0.3 && !W.crash) {
        c.got = W.t;
        if (c.nitro) { W.boost = Math.min(1, W.boost + 0.45); W.events.push({ sfx: 'nitro', x: c.x - W.x }); pop(W, 'NITRO', '+45% BOOST', c.x - W.x, 'nitro'); fx(W, { k: 'nitro', x: c.x }); W.score += 500; }
        else {
          W.coinRun = W.t - W.coinLast < 40 ? W.coinRun + 1 : 1; W.coinLast = W.t; W.coinsN++;
          W.score += 100 * Math.min(W.coinRun, 10); W.boost = Math.min(1, W.boost + 0.012);
          W.events.push({ sfx: 'coin', n: W.coinRun, x: c.x - W.x }); fx(W, { k: 'coin', x: c.x });
          W.lineGot[c.line] = (W.lineGot[c.line] || 0) + 1;
          if (W.lineGot[c.line] === c.of) { W.score += 2500; pop(W, 'PERFECT LINE', '+2,500', c.x - W.x, 'gold'); W.events.push({ sfx: 'line' }); }
        }
      }
    }
    if (s.spr && !W.crash) for (j = 0; j < s.spr.length; j++) {
      var p = s.spr[j];
      if (!p.h || p.done) continue;
      if (p.b && !(W.fork && W.fork.s === p.b)) continue;
      if (Math.abs(W.x - p.x) < CAR_HALF + p.h) {
        if (p.soft) { p.done = W.t; W.v *= 0.82; W.events.push({ sfx: 'bush', x: p.x - W.x }); fx(W, { k: 'leaves', x: p.x, t2: p.t }); W.shake = Math.max(W.shake, 5); }
        else crash(W, W.D.crash && W.v > MAXS * 0.3, p.t);
        break;
      }
    }
  }
  function nextFork(W, i) {   // the next fork in the road ahead (after a split, or at the start)
    for (var j = 0; j < W.stretch.length; j++) {
      var r = W.stretch[j], f = r.fork;
      if (f && !r.used && f.split > i) { r.used = true; W.fork = { a: f.a, split: f.split, end: f.end, s: 0, beta: 0, next: f.next }; return; }
    }
    W.fork = null;
  }
  function gate(W, g) {
    if (g.kind === 'check' || g.kind === 'round') {
      var S = STAGES[g.st], add = Math.round(S.t * W.D.time * Math.max(0.8, Math.pow(0.95, W.round - 1)));
      W.stageNo++; W.stage = g.st;
      if (g.kind === 'round') { W.route = [0]; bannerOf(W, 'ROUND ' + W.round, 'Bournemouth again - busier and quicker', 'stage'); W.events.push({ say: 'Round ' + W.round }); }
      else { W.time += add; bannerOf(W, 'CHECKPOINT', 'EXTENDED TIME +' + add + ' SEC', 'check'); W.events.push({ sfx: 'check' }); W.events.push({ say: 'Checkpoint: ' + add + ' more seconds' }); }
    } else if (g.kind === 'goal') {
      var bonus = Math.ceil(W.time) * 1000 * Math.min(W.round, 3);
      W.score += bonus; W.round++;
      W.time = W.D.time * STAGES[0].t * Math.max(0.8, Math.pow(0.95, W.round - 1)) + 4;
      bannerOf(W, 'GOAL!', 'TIME BONUS +' + bonus.toLocaleString('en-GB'), 'goal');
      W.events.push({ sfx: 'goal' }); W.events.push({ say: 'Goal! Time bonus ' + bonus });
      fx(W, { k: 'fireworks', x: 0 });
    }
  }

  function step(W, inp) {
    inp = inp || {};
    W.t++;
    if (W.shake > 0) W.shake--;
    if (W.comboT > 0 && --W.comboT === 0) W.combo = 0;
    var D = W.D, C = CARS[W.car], i0 = segIndex(W.z), s = segAt(W, i0), pct;
    if (W.count > 0) {   // the lights: three reds, then green
      W.count--;
      if (W.count === 180 || W.count === 120 || W.count === 60) W.events.push({ sfx: 'count' });
      if (W.count === 0) {
        W.events.push({ sfx: 'go' }); bannerOf(W, 'GO!', '', 'go');
        if (inp.fire || inp.alt) { W.v = MAXS * 0.32; W.boost = Math.min(1, W.boost + 0.25); W.score += 5000; pop(W, 'FLYING START', '+5,000', 0, 'gold'); W.events.push({ sfx: 'perfect' }); }
      }
      W.rev = (inp.fire || inp.alt || inp.up) ? Math.min(1, (W.rev || 0) + 0.05) : Math.max(0, (W.rev || 0) - 0.03);
      moveTraffic(W);
      return;
    }
    if (!W.timeUp) {
      var before = Math.ceil(W.time);
      W.time -= DT;
      if (W.time <= 0) { W.time = 0; W.timeUp = true; W.events.push({ sfx: 'timeup' }); W.events.push({ say: 'Time up' }); bannerOf(W, 'TIME UP', '', 'red'); endDrift(W); }
      else if (Math.ceil(W.time) < before && before <= 11) W.events.push({ sfx: 'tick', n: before - 1 });
    }
    if (W.fork && W.fork.s && W.fork.beta < 1) W.fork.beta = Math.min(1, W.fork.beta + 1 / 40);

    // ---- controls
    var L = !!inp.left, R = !!inp.right, brake = !!inp.down, wantBoost = !W.timeUp && !W.crash && !!(inp.fire || inp.alt);
    var gas = !W.timeUp && !W.crash && (W.auto ? !brake : !!inp.up);
    var target = W.crash ? 0 : (R ? 1 : 0) - (L ? 1 : 0);
    pct = W.v / MAXS;
    W.steer += (target - W.steer) * (target === 0 ? 0.3 : 0.2);
    if (!W.drift && !W.crash && brake && target !== 0 && pct > 0.55) { W.drift = target; W.driftT = 0; W.driftPts = 0; W.events.push({ sfx: 'skid' }); }
    if (W.drift && (!brake || target !== W.drift || pct < 0.4 || W.crash)) endDrift(W);
    W.boosting = wantBoost && W.boost > 0.005 && !W.drift;
    if (W.boosting) { W.boost = Math.max(0, W.boost - 0.3 * DT); if (!W.wasBoost) W.events.push({ sfx: 'boost' }); }
    W.wasBoost = W.boosting;

    // ---- speed
    var top = MAXS * C.top * (W.boosting ? 1.25 : 1) * (W.slipOn ? 1.04 : 1), acc = MAXS / 4.6 * C.acc;
    if (W.crash) W.v *= W.crash.hard ? 0.93 : 0.86;
    else if (W.drift) W.v -= MAXS * 0.28 * DT;
    else if (brake) W.v -= MAXS * 1.05 * DT;
    else if (W.boosting) W.v += acc * 2.4 * DT;
    else if (gas) W.v += acc * (1.15 - 0.55 * pct) * DT;
    else W.v -= MAXS / 5 * DT;
    W.off = Math.abs(W.x) > roadHalf(s) + 0.04;
    if (W.off) { var offTop = MAXS * D.off; if (W.v > offTop) W.v = Math.max(offTop, W.v - MAXS * 0.9 * DT); }
    if (W.v > top) W.v = Math.max(top, W.v - MAXS * 0.35 * DT);
    if (W.v < 0) W.v = 0;
    pct = W.v / MAXS;

    // ---- along the road
    W.z += W.v * DT;
    var i1 = segIndex(W.z);
    for (var i = i0 + 1; i <= i1; i++) cross(W, i);
    s = segAt(W, i1);
    W.skyX += s.c * (W.v * DT / SEG) * 0.0011;

    // ---- across the road: steering, and the bend pulling the car outwards
    if (W.crash) {
      var c = W.crash; c.t++;
      if (c.t > c.dur * 0.5) W.x += (c.tx - W.x) * 0.09;
      if (c.t >= c.dur) { W.crash = null; W.v = 0; W.x = c.tx; W.steer = 0; }
    } else {
      var dx = DT * 2.6 * Math.min(1, pct * 1.4);
      W.x += W.steer * dx * (W.drift ? 1.3 : 1);
      W.x -= DT * 2.5 * pct * pct * s.c * (D.cf / C.grip) * (W.drift ? 0.35 : 1);
    }
    var e = edges(W, s);
    if (W.x < e[0] || W.x > e[1]) {   // against a wall, a fence, the sea wall or the barrier: scrape along it
      var side = W.x < e[0] ? -1 : 1;
      W.x = clamp(W.x, e[0], e[1]) - side * 0.01;
      if (W.v > MAXS * 0.1) { W.v *= 0.985; if (W.t - W.scrapeT > 8) { W.scrapeT = W.t; W.events.push({ sfx: 'scrape', x: side }); fx(W, { k: 'sparks', x: W.x + side * CAR_HALF }); } W.shake = Math.max(W.shake, 3); }
    }

    // ---- the traffic: bumps, near misses and slipstreams
    moveTraffic(W);
    var slipping = false;
    for (var k = 0; k < W.cars.length; k++) {
      var car = W.cars[k];
      if (!sameRoad(W, car)) { car.dz = car.z - W.z; continue; }
      var dz = car.z - W.z, dxx = Math.abs(car.x - W.x), hit = VEH[car.t].hit + CAR_HALF - 0.03;
      if (!W.crash && Math.abs(dz) < 300 && dxx < hit && W.t - car.hitT > 30) {
        car.hitT = W.t;
        if (W.v >= car.v) {
          var hard = D.crash && W.v - car.v > MAXS * 0.6 && dxx < hit * 0.7;
          if (hard) { crash(W, true, 'car'); W.z = Math.min(W.z, car.z - 320); }
          else {
            W.v = car.v * (W.diff === 1 ? 0.85 : 0.72); W.z = Math.min(W.z, car.z - 320);
            W.x += (W.x >= car.x ? 1 : -1) * 0.1; car.x += (car.x > W.x ? 1 : -1) * 0.04;
            W.shake = Math.max(W.shake, 10); W.combo = 0; W.comboT = 0; if (W.drift) { W.drift = 0; W.driftT = 0; }
            W.events.push({ sfx: 'bump', x: car.x - W.x }); fx(W, { k: 'bump', x: (car.x + W.x) / 2 });
          }
        } else { W.x += (W.x >= car.x ? 1 : -1) * 0.12; W.events.push({ sfx: 'bump', x: car.x - W.x }); }
        dz = car.z - W.z;
      }
      if (!car.passed && car.dz >= 0 && dz < 0) {
        car.passed = true;
        if (dxx < hit + 0.3 && W.t - car.hitT > 60 && pct > 0.55 && !W.crash) {
          W.combo = W.comboT > 0 ? Math.min(W.combo + 1, 9) : 1; W.comboT = 200; W.nearN++;
          var pts = 500 * W.combo; W.score += pts; W.boost = Math.min(1, W.boost + 0.1);
          W.events.push({ sfx: 'near', x: car.x - W.x, n: W.combo });
          pop(W, W.combo > 1 ? 'NEAR MISS x' + W.combo : 'NEAR MISS', '+' + pts.toLocaleString('en-GB'), car.x - W.x, 'near');
        }
      }
      car.dz = dz;
      if (dz > 200 && dz < 1800 && dxx < 0.2 && pct > 0.5) slipping = true;
    }
    W.slip = slipping ? W.slip + DT : Math.max(0, W.slip - DT * 2);
    var on = W.slip > 0.6;
    if (on) W.boost = Math.min(1, W.boost + 0.16 * DT);
    if (on && !W.slipOn) { W.events.push({ sfx: 'slip' }); pop(W, 'SLIPSTREAM', 'BOOST FILLING', 0, 'slip'); }
    W.slipOn = on;

    // ---- drifting fills the boost; points for speed
    if (W.drift) {
      W.driftT += DT; W.driftPts += pct * 25; W.boost = Math.min(1, W.boost + 0.2 * DT);
      if (W.t % 3 === 0) fx(W, { k: 'smoke', x: W.x, d: W.drift });
    }
    if (W.off && W.v > MAXS * 0.15 && W.t % 4 === 0) fx(W, { k: 'dust', x: W.x });
    if (!W.timeUp && !W.crash) { W.sAcc += pct * pct * 32 * (W.boosting ? 1.5 : 1); var whole = Math.floor(W.sAcc); W.score += whole; W.sAcc -= whole; }

    // ---- the end: the clock ran out and the car has rolled to a stop
    if (W.timeUp && W.v < MAXS * 0.03) { if (++W.overT > 70) W.over = true; }

    // ---- tidy away the road behind
    if (W.t % 60 === 0) {
      var drop = i1 - 60 - W.base;
      if (drop > 400) { W.segs.splice(0, drop); W.base += drop; }
    }
  }

  // ---------------------------------------------------------------- a driver for the title screen and the tests
  function autopilot(W, side) {
    var inp = { left: false, right: false, up: true, down: false, fire: false, alt: false };
    if (W.count > 0) { inp.fire = W.count < 8; return inp; }
    var i = segIndex(W.z), F = W.fork, pct = W.v / MAXS, target, k, c;
    if (F && !F.s && i > F.a - 140) target = (side || (W.route.length % 2 ? 1 : -1)) * 1.0;
    else {   // stay in lane or move one lane over, whichever has the most room ahead; boxed in, brake
      var cur = W.botLane == null ? 1 : LANES.indexOf(W.botLane), best = -1e9, room = 6000, close = 0;
      if (cur < 0) cur = 1;
      for (k = Math.max(0, cur - 1); k <= Math.min(2, cur + 1); k++) {
        var L = LANES[k], free = 6000, cl = 0, lo = Math.min(W.x, L) - 0.4, hi = Math.max(W.x, L) + 0.4;
        for (var j = 0; j < W.cars.length; j++) {
          c = W.cars[j]; if (!sameRoad(W, c)) continue;
          var dz = c.z - W.z, closing = Math.max(0, W.v - c.v);
          if (k !== cur && dz > -450 && dz < 350 + closing * 0.45 && c.x > lo && c.x < hi) free = -1;   // in the way while moving across
          else if (dz > -300 && dz < free && Math.abs(c.x - L) < 0.42) { free = dz; cl = closing; }
        }
        var sc = free + (k === cur ? 500 : 0);
        if (sc > best) { best = sc; target = L; room = free; close = cl; }
      }
      W.botLane = target;
      if (room < 450 + close * close / 25200 + close * 0.08 && !W.boosting) W.botBrake = 4;
    }
    var maxC = 0, ahead = segAt(W, i + 10);
    for (k = 3; k < 40; k++) maxC = Math.max(maxC, Math.abs(segAt(W, i + k).c));
    target += clamp(ahead.c, -6, 6) * 0.03;
    var d = target - W.x;
    if (d > 0.05) inp.right = true; else if (d < -0.05) inp.left = true;
    var tooFast = maxC * pct * pct * 2.5 * (W.D.cf / CARS[W.car].grip) > 2.4;
    if (tooFast) { if (W.auto) inp.down = pct > 0.62; else inp.up = false; }
    inp.fire = W.boost > 0.3 && maxC < 2.6 && pct > 0.6 && !(W.botBrake > 0);
    if (W.botBrake > 0) { W.botBrake--; inp.down = true; inp.up = false; inp.left = inp.right = false; }
    return inp;
  }

  function hud(W) { return { score: W.score, lives: 1, wave: W.stageNo }; }
  function mph(W) { return Math.round(W.v / MAXS * 160); }

  return {
    SEG: SEG, ROAD: ROAD, MAXS: MAXS, DRAW: DRAW, CAR_HALF: CAR_HALF, LANES: LANES, FA: FA, FB: FB,
    STAGES: STAGES, VEH: VEH, CARS: CARS, DIFF: DIFF,
    newWorld: newWorld, step: step, hud: hud, mph: mph, autopilot: autopilot,
    segAt: segAt, segIndex: segIndex, lastIndex: lastIndex, forkOff: forkOff, edges: edges, roadHalf: roadHalf, rnd: rnd
  };
});
