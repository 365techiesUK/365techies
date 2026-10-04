/* 365 Coast Run - the rules (rebuilt in 3D, 5 Oct 2026). A seaside road race in the style of the sit-down arcade racers:
 * a clock that runs down, a checkpoint at the end of each stretch that adds time, traffic to weave through, and a fork
 * after each stretch - keep left or right to choose where you go next. Bournemouth, then the Purbeck Hills or the New
 * Forest, then the Jurassic Coast, Poole Harbour (at night) or the Needles; the goal gives a time bonus and the run
 * starts again from Bournemouth, busier and quicker. Our own names, roads, cars and pictures.
 *
 * Units are metres and seconds. The road is a line of segments SEG long, each with its own bend (k, 1/metres: + turns
 * right) and height. The car is held relative to the road: s along it, x across it (+ right, the road is -HALF..HALF),
 * psi = which way it points and phi = which way it is actually going, both measured from the road's own direction.
 * Steering is the arcade kind: holding a key turns the car to an angle from the road (smaller the faster you go) and
 * letting go straightens it; a bend pushes the car outwards (more the faster you go), so you steer into it and ease off
 * for the sharp ones. A drift (tap brake while turning) turns the car much further, slides it (phi lags psi) and
 * pushes it out less, so you go round sideways. Over a sharp crest the road can fall away faster than gravity pulls the
 * car down, and it flies.
 * At a fork the road widens to twice its width, then splits into two roads that part (forkOff). Until the split x is
 * measured from the middle of the wide road; from the split on, from the middle of the road taken (W.fork.s -1 / 1).
 * Runs in a browser (window.CREngine; world3d.js draws it) and in node (require) for the tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CREngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var SEG = 4, HALF = 7, RUMBLE = 0.9, DT = 1 / 60, VMAX = 72, GRAV = 9.8 * 1.3;
  var VIEW = 900;                       // metres ahead the picture shows (the traffic lives within it)
  var CAR_W = 0.95, CAR_L = 2.2;        // half the player's car
  var LANES = [-4.6, 0, 4.6];
  var FA = 30, FB = 110, OFF0 = HALF, OFF_END = 130;   // a fork: FA segments widening, then FB of two roads parting
  var OFF2 = 2 * (OFF_END - OFF0) / Math.pow(FB * SEG, 2);   // how sharply each road of a split bends away (1/metres)

  function rnd(seed) {   // mulberry32: the same numbers every time for the same seed
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function ease(a, b, p) { return a + (b - a) * (-Math.cos(Math.PI * Math.max(0, Math.min(1, p))) / 2 + 0.5); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function forkOff(k) { var p = clamp(k, 0, FB) / FB; return OFF0 + (OFF_END - OFF0) * p * p; }   // k in segments from the split

  // ---------------------------------------------------------------- the stretches of road
  // t = seconds the stretch gives; len = segments before the fork or goal; sea = side of the sea (-1 left, 1 right);
  // band = the heights the road keeps to (metres above the sea); mix = traffic weights for VEH; next = [left, right]
  var STAGES = [
    { id: 0, key: 'bournemouth', name: 'BOURNEMOUTH', seed: 1103, t: 66, len: 700, curvy: 0.55, hilly: 0.45, sea: -1, band: [4, 16], next: [1, 2], mix: [5, 4, 2, 2, 3, 0, 0, 2] },
    { id: 1, key: 'purbeck', name: 'PURBECK HILLS', seed: 2207, t: 74, len: 730, curvy: 0.75, hilly: 1, sea: 0, band: [14, 95], next: [3, 4], mix: [5, 3, 2, 0, 3, 3, 1, 1] },
    { id: 2, key: 'forest', name: 'NEW FOREST', seed: 3301, t: 72, len: 730, curvy: 0.85, hilly: 0.55, sea: 0, band: [10, 50], next: [4, 5], mix: [5, 3, 2, 0, 3, 2, 1, 1] },
    { id: 3, key: 'jurassic', name: 'JURASSIC COAST', seed: 4409, t: 74, len: 760, curvy: 0.8, hilly: 0.85, sea: -1, band: [30, 80], next: null, mix: [5, 3, 1, 1, 3, 1, 0, 2] },
    { id: 4, key: 'harbour', name: 'POOLE HARBOUR', seed: 5503, t: 68, len: 730, curvy: 0.6, hilly: 0.25, sea: 1, band: [4, 14], next: null, mix: [5, 4, 3, 2, 1, 0, 2, 2] },
    { id: 5, key: 'needles', name: 'THE NEEDLES', seed: 6607, t: 74, len: 760, curvy: 0.75, hilly: 0.8, sea: 1, band: [22, 70], next: null, mix: [5, 3, 1, 1, 3, 0, 0, 2] }
  ];
  // the traffic: w = half its width, l = half its length (metres), v = its speed (share of full speed)
  var VEH = [
    { id: 'hatch', w: 0.9, l: 2.0, v: [0.4, 0.56] },
    { id: 'saloon', w: 0.95, l: 2.3, v: [0.42, 0.58] },
    { id: 'van', w: 1.0, l: 2.6, v: [0.36, 0.5] },
    { id: 'bus', w: 1.25, l: 5.5, v: [0.3, 0.38] },
    { id: 'camper', w: 1.05, l: 2.8, v: [0.33, 0.45] },
    { id: 'tractor', w: 1.2, l: 2.2, v: [0.17, 0.23] },
    { id: 'lorry', w: 1.25, l: 6, v: [0.33, 0.43] },
    { id: 'sports', w: 0.95, l: 2.2, v: [0.52, 0.64] }
  ];
  // the player's car: top speed, acceleration, grip, and how quickly it turns
  var CARS = {
    roadster: { top: 1, acc: 1, grip: 1, yaw: 1 },
    gt: { top: 1.07, acc: 0.92, grip: 0.86, yaw: 0.95 },
    hatch: { top: 0.94, acc: 1.15, grip: 1.15, yaw: 1.08 }
  };
  // the speeds: more time, fewer and slower cars, bends that push less (assist), bounces instead of crashes at Gentle;
  // psiTop = how far from the road's direction the car turns at full speed (radians)
  var DIFF = {
    1: { time: 1.3, gap: 170, tv: 0.9, assist: 0.55, psiTop: 0.24, crash: false, off: 0.55 },
    2: { time: 1, gap: 115, tv: 1, assist: 0.2, psiTop: 0.21, crash: true, off: 0.45 },
    3: { time: 0.9, gap: 85, tv: 1.08, assist: 0.05, psiTop: 0.2, crash: true, off: 0.4 }
  };

  function segIndex(s) { return Math.floor(s / SEG); }
  function segAt(W, i) { var g = W.segs[i - W.base]; return g || W.segs[i < W.base ? 0 : W.segs.length - 1]; }
  function lastIndex(W) { return W.base + W.segs.length - 1; }
  function heightAt(W, s) { var i = segIndex(s), g = segAt(W, i), p = clamp((s - i * SEG) / SEG, 0, 1); return g.y1 + (g.y2 - g.y1) * p; }
  function gradeAt(W, s) { var g = segAt(W, segIndex(s)); return (g.y2 - g.y1) / SEG; }

  // ---------------------------------------------------------------- building a stretch
  function add(B, k, extra) {
    var W = B.W, i = W.base + W.segs.length, s = { i: i, k: k, y1: 0, y2: 0, bank: 0, st: B.S.id, sea: 0, sh: 0, wl: 0, wr: 0, spr: null, coins: null, gate: null, fk: null };
    if (B.S.sea) {   // the shore wanders between right beside the road and well away from it
      if (B.k > B.S.len - 120) B.shT = 120;
      else if (B.k >= B.nextSh) { B.shT = [16, 19, 24, 32, 48, 80][(B.rng() * 6) | 0]; B.nextSh = B.k + 90 + ((B.rng() * 120) | 0); }
      B.sh += clamp(B.shT - B.sh, -0.35, 0.35);
      s.sea = B.S.sea; s.sh = B.sh;
    }
    if (B.wallL > 0) { s.wl = 10.5; B.wallL--; }
    if (B.wallR > 0) { s.wr = 10.5; B.wallR--; }
    if (extra) for (var key in extra) s[key] = extra[key];
    W.segs.push(s); B.k++;
    return s;
  }
  function bend(B, n0, n1, n2, k) {   // ease into a bend, hold it, ease out
    var first = B.W.base + B.W.segs.length, i;
    for (i = 0; i < n0; i++) add(B, ease(0, k, (i + 0.5) / n0));
    for (i = 0; i < n1; i++) add(B, k);
    for (i = 0; i < n2; i++) add(B, ease(k, 0, (i + 0.5) / n2));
    if (Math.abs(k) >= 1 / 140) B.bends.push({ from: first + n0 - 3, to: first + n0 + n1, dir: k > 0 ? 1 : -1, sharp: Math.abs(k) >= 1 / 85 });
  }
  function piece(B) {   // one bit of road, by the stretch's character (lengths in segments of 4 m)
    var S = B.S, r = B.rng, side = r() < 0.5 ? -1 : 1, p = r();
    if (p < 0.22 - S.curvy * 0.1) bend(B, 2, 20 + ((r() * 45) | 0), 2, 0);
    else if (p < 0.52) { var R = 260 + r() * 340, ang = 0.35 + r() * 0.7, n = Math.round(ang * R / SEG); bend(B, 12, Math.max(4, n - 12), 12, side / R); }
    else if (p < 0.76) { var R2 = 95 + r() * 80, ang2 = 0.6 + r() * 0.9, n2 = Math.round(ang2 * R2 / SEG); bend(B, 9, Math.max(4, n2 - 9), 9, side / R2); }
    else if (p < 0.88) { var R3 = 110 + r() * 120, a3 = 0.45 + r() * 0.5, n3 = Math.round(a3 * R3 / SEG); bend(B, 8, n3, 8, side / R3); bend(B, 8, n3, 8, -side / R3); }
    else { var R4 = 48 + r() * 30, a4 = 0.9 + r() * 0.9, n4 = Math.round(a4 * R4 / SEG); if (S.curvy > 0.7 || r() < 0.4) bend(B, 7, Math.max(3, n4 - 7), 7, side / R4); else bend(B, 3, 30, 3, 0); }
  }
  // the hills: a smooth line of heights laid over the road after the bends, kept within the place's band, with the odd
  // sharp crest (a jump at speed) on a straight
  function hills(W, S, from, to, r, y0) {
    var i = from, y = y0, band = S.band;
    while (i < to) {
      var len = 30 + ((r() * 70) | 0), target;
      if (y < band[0]) target = band[0] + r() * 12;
      else if (y > band[1]) target = band[1] - r() * 12;
      else target = clamp(y + (r() * 2 - 1) * (8 + 34 * S.hilly), band[0], band[1]);
      var maxDy = len * SEG * 0.15; target = clamp(target, y - maxDy, y + maxDy);
      for (var j = 0; j < len && i < to; j++, i++) { var g = segAt(W, i); g.y1 = ease(y, target, j / len); g.y2 = ease(y, target, (j + 1) / len); }
      y = target;
      if (i + 20 < to && r() < 0.22 + 0.3 * S.hilly) {   // a crest on a straight: up and over - a jump at speed
        var straight = true; for (var q = i; q < i + 16; q++) if (Math.abs(segAt(W, q).k) > 1 / 200) { straight = false; break; }
        if (straight) {
          var H = 2.6 + r() * 1.8, L = 22;   // gentle enough that the car leaves the road near the top, not on the way up
          for (j = 0; j < L; j++, i++) { var c = segAt(W, i); c.y1 = y + H * (0.5 - 0.5 * Math.cos(2 * Math.PI * j / L)); c.y2 = y + H * (0.5 - 0.5 * Math.cos(2 * Math.PI * (j + 1) / L)); c.crest = true; }
        }
      }
    }
    for (i = from; i < to; i++) { var a = segAt(W, i); a.bank = clamp(-a.k * 14, -0.11, 0.11); }
    return to > from ? segAt(W, to - 1).y2 : y0;
  }
  function putAt(W, i, t, x, h, o) {   // something at the roadside: t = what (world3d.js models it), x = across, h = how wide to hit (0 = can't)
    var s = W.segs[i - W.base]; if (!s) return null;
    var it = { t: t, x: x, h: h || 0, v: (o && o.v) || 0, b: (o && o.b) || 0 };
    if (o) { if (o.soft) it.soft = true; if (o.txt) it.txt = o.txt; }
    (s.spr || (s.spr = [])).push(it);
    return it;
  }
  var put = putAt;
  function land(s, x) { return !s.gate && (!s.sea || (x < 0 ? -1 : 1) !== s.sea || Math.abs(x) < s.sh - 2.5); }
  function water(s, x) { return s.sea && (x < 0 ? -1 : 1) === s.sea && Math.abs(x) > s.sh + 6; }

  function buildStage(W, id) {
    var S = STAGES[id], B = { W: W, S: S, rng: rnd(S.seed), k: 0, sh: S.sea ? 30 : 0, shT: 26, nextSh: 60, bends: [], wallL: 0, wallR: 0 };
    var s0 = W.base + W.segs.length, i, first = !W.stretch.length, rec = { id: id, from: s0, to: 0, fork: null, side: W.pendingSide || 0 };
    W.pendingSide = 0;
    for (i = 0; i < 40; i++) add(B, 0);   // the opening straight with its gate
    var gk = first ? 'start' : id === 0 ? 'round' : 'check';
    segAt(W, s0 + 8).gate = { kind: gk, st: id };
    put(W, s0 + 8, 'gate', 0, 0, { v: gk === 'start' ? 0 : gk === 'round' ? 1 : 2 });
    if (gk === 'start') segAt(W, s0 + 5).line = true;
    while (B.k < S.len) {
      if ((id === 1 || id === 3 || id === 5) && B.wallL <= 0 && B.wallR <= 0 && B.rng() < 0.3) {
        var side = S.sea ? -S.sea : (B.rng() < 0.5 ? -1 : 1), n = 25 + ((B.rng() * 40) | 0);
        if (side < 0) B.wallL = n; else B.wallR = n;
      }
      piece(B);
    }
    B.wallL = B.wallR = 0;
    var end;
    if (S.next) {   // the fork: the road widens, then splits
      var a0 = W.base + W.segs.length;
      for (i = 0; i < FA; i++) add(B, 0, { fk: { a: 1, w1: HALF + ease(0, HALF, i / FA), w2: HALF + ease(0, HALF, (i + 1) / FA) } });
      var b0 = W.base + W.segs.length;
      for (i = 0; i < FB; i++) add(B, 0, { fk: { b: 1, k: i, o1: forkOff(i), o2: forkOff(i + 1) } });
      end = W.base + W.segs.length;
      rec.fork = { a: a0, split: b0, end: end, next: S.next };
      var L = STAGES[S.next[0]].name, R = STAGES[S.next[1]].name;
      put(W, a0 - 40, 'gantry', 0, 0, { txt: L + '|' + R });
      put(W, a0 - 8, 'gantry', 0, 0, { txt: L + '|' + R });
      put(W, b0, 'nose', 0, 0, { txt: L + '|' + R });
      for (i = 2; i < FB; i += 3) { put(W, b0 + i, 'gpost', -9.2, 0, { b: 1 }); put(W, b0 + i, 'gpost', 9.2, 0, { b: -1 }); }
    } else {   // the goal
      for (i = 0; i < 30; i++) add(B, 0);
      end = W.base + W.segs.length;
      segAt(W, end - 18).gate = { kind: 'goal', st: id };
      put(W, end - 18, 'gate', 0, 0, { v: 3 });
      W.goalAt = end - 18;
    }
    // heights: carried on from the road before, kept level through gates and forks
    var y0 = s0 > W.base ? segAt(W, s0 - 1).y2 : S.band[0] + 6, flatTo = (S.next ? rec.fork.a : end) - 30;
    var yEnd = hills(W, S, s0 + 30, flatTo, rnd(S.seed * 3 + 7), y0);
    for (i = s0; i < s0 + 30; i++) { var g = segAt(W, i); g.y1 = g.y2 = y0; g.bank = 0; }
    for (i = flatTo; i < end; i++) { var g2 = segAt(W, i); g2.y1 = g2.y2 = yEnd; g2.bank = 0; g2.crest = false; }
    // the bends: arrows before, chevrons round the outside of the sharp ones
    B.bends.forEach(function (b) {
      var x = -b.dir * 10.5;
      if (land(segAt(W, b.from - 22), x)) put(W, b.from - 22, 'warn', x, 0.4, { v: b.dir });
      if (b.sharp) for (var j = b.from; j < b.to; j += 5) if (land(segAt(W, j), x)) put(W, j, 'chev', x, 0.3, { v: b.dir });
    });
    decorate(W, S, s0 + 40, end - 4, rnd(S.seed * 7 + 1));
    pickups(W, s0 + 50, s0 + S.len - 40, rnd(S.seed * 13 + 5));
    rec.to = end; W.stretch.push(rec);
    if (W.stretch.length > 12) W.stretch.shift();
    if (!S.next) buildStage(W, 0);   // after the goal the road goes on: Bournemouth again
  }
  // the first n segments of a stretch's bends, without building it: the road the other way at a fork, drawn going off
  // into the distance (world3d.js); heights level
  function peek(id, n) {
    var T = { base: 0, segs: [], stretch: [] }, S = STAGES[id], B = { W: T, S: S, rng: rnd(S.seed), k: 0, sh: S.sea ? 30 : 0, shT: 26, nextSh: 60, bends: [], wallL: 0, wallR: 0 };
    for (var i = 0; i < 40; i++) add(B, 0);
    while (T.segs.length < n) piece(B);
    T.segs.length = n;
    return T.segs;
  }

  // ---------------------------------------------------------------- what stands by the road (the models are in world3d.js)
  function decorate(W, S, from, to, r) {
    var i, s, k, x, sh, wide = 0;
    function both(f) { f(-1); f(1); }
    function put(W2, j, t, xx, h, o) {   // by a fork's wider road, everything stands that much further out (and nothing stands in the road)
      if (wide) { if (/^(lamp|hut|brolly|board|finger|forestsign|warn|chev)$/.test(t)) return null; xx += (xx < 0 ? -1 : 1) * wide; }
      return putAt(W2, j, t, xx, h, o);
    }
    for (i = from; i < to; i++) {
      s = segAt(W, i); k = i - from; sh = s.sh;
      wide = s.fk ? (s.fk.a ? s.fk.w2 - HALF + 3 : s.fk.o2 + 4) : 0;
      if (k % 140 === 70) { x = (S.sea || -1) * -13; if (land(s, x)) put(W, i, 'board', x, 1.6, { v: (k / 140) | 0 }); }
      switch (S.id) {
        case 0:   // Bournemouth: the prom, beach huts, umbrellas and the sea on the left; gardens, palms and hotels on the right
          if (k % 9 === 0) { if (land(s, -9.8)) put(W, i, 'lamp', -9.8, 0.25); put(W, i, 'lamp', 9.8, 0.25); }
          if (sh > 24 && k % 60 < 22 && k % 2 === 0 && land(s, -12.5)) put(W, i, 'hut', -12.5, 1.3, { v: (k / 2) % 6 });
          if (r() < 0.07 && sh > 20) { x = -(15 + r() * (sh - 18)); if (land(s, x)) put(W, i, 'brolly', x, 0.7, { soft: true, v: (r() * 4) | 0 }); }
          if (r() < 0.12) put(W, i, 'palm', 11 + r() * 9, 0.45, { v: (r() * 3) | 0 });
          if (r() < 0.05) put(W, i, 'bush', 11 + r() * 12, 0.9, { soft: true, v: 0 });
          if (r() < 0.035) put(W, i, 'hotel', 34 + r() * 30, 0, { v: (r() * 4) | 0 });
          if (r() < 0.03) { x = -(sh + 20 + r() * 120); if (water(s, x)) put(W, i, 'yacht', x, 0, { v: (r() * 3) | 0 }); }
          if (k === Math.round(S.len * 0.3) || k === Math.round(S.len * 0.72)) put(W, i, 'pier', -(Math.max(sh, 20) + 6), 0, { v: k > S.len / 2 ? 1 : 0 });
          break;
        case 1:   // the Purbeck Hills: stone walls, oaks, sheep, cottages, hay and a castle on a hill
          both(function (d) {
            if (r() < 0.07) put(W, i, 'oak', d * (13 + r() * 30), 0.8, { v: 0 });
            if (r() < 0.035) put(W, i, 'bush', d * (11.5 + r() * 12), 0.9, { soft: true, v: 1 });
            if (r() < 0.05) put(W, i, 'sheep', d * (16 + r() * 40), 0, { v: (r() * 2) | 0 });
            if (r() < 0.012) put(W, i, 'hay', d * (13 + r() * 14), 1, { soft: true });
          });
          if (r() < 0.007) { x = (r() < 0.5 ? -1 : 1) * (19 + r() * 10); put(W, i, 'cottage', x, 4, { v: (r() * 2) | 0 }); }
          if (k % 110 === 55) put(W, i, 'finger', (k % 220 ? -1 : 1) * 10.2, 0.2);
          if (k === Math.round(S.len * 0.42)) put(W, i, 'castle', 140, 0);
          break;
        case 2:   // the New Forest in autumn: oak, beech, pine and birch, ponies, heather and bracken
          both(function (d) {
            if (r() < 0.28) { var tt = ['oak', 'beech', 'pine', 'birch'][(r() * 4) | 0]; x = d * (12 + Math.pow(r(), 0.8) * 45); put(W, i, tt, x, tt === 'birch' ? 0.4 : 0.7, { v: 1 + ((r() * 2) | 0) }); }
            if (r() < 0.04) put(W, i, 'heather', d * (11 + r() * 16), 0.8, { soft: true, v: (r() * 2) | 0 });
            if (r() < 0.018) put(W, i, 'pony', d * (17 + r() * 30), 0, { v: (r() * 3) | 0 });
          });
          if (r() < 0.006) put(W, i, 'logs', (r() < 0.5 ? -1 : 1) * (12 + r() * 6), 1.3);
          if (k % 230 === 115) put(W, i, 'forestsign', 10.4, 0.3);
          break;
        case 3:   // the Jurassic Coast at sunset: downs, gorse and rocks; chalk cliffs, a lighthouse and a stone arch out at sea
          if (r() < 0.06) put(W, i, 'gorse', 11.5 + r() * 20, 0.8, { soft: true });
          if (r() < 0.035) { x = -(11.5 + r() * Math.max(2, sh - 14)); if (land(s, x)) put(W, i, 'gorse', x, 0.8, { soft: true }); }
          if (r() < 0.012) { x = (r() < 0.5 ? -1 : 1) * (12 + r() * 12); if (land(s, x)) put(W, i, 'rock', x, 1.1, { v: (r() * 3) | 0 }); }
          if (r() < 0.035) put(W, i, 'sheep', 18 + r() * 45, 0, { v: (r() * 2) | 0 });
          if (r() < 0.01) { x = -(sh + 25 + r() * 120); if (water(s, x)) put(W, i, 'stack', x, 0, { v: (r() * 3) | 0 }); }
          if (k === Math.round(S.len * 0.38)) put(W, i, 'lighthouse', -(Math.max(sh, 18) - 5), 0, { v: 0 });
          if (k === Math.round(S.len * 0.68)) put(W, i, 'arch', -(Math.max(sh, 18) + 70), 0);
          break;
        case 4:   // Poole Harbour at night: lamps, lit buildings and palms; the quay, boats and buoys on the right
          if (k % 7 === 0) { put(W, i, 'lamp', -9.8, 0.25, { v: 1 }); if (land(s, 9.8)) put(W, i, 'lamp', 9.8, 0.25, { v: 1 }); }
          if (r() < 0.05) put(W, i, 'building', -(22 + r() * 30), 0, { v: (r() * 4) | 0 });
          if (r() < 0.05) put(W, i, 'palm', -(11 + r() * 5), 0.45, { v: (r() * 3) | 0 });
          if (r() < 0.07) { x = sh + 8 + r() * 70; if (water(s, x)) put(W, i, 'yacht', x, 0, { v: 3 + ((r() * 3) | 0) }); }
          if (r() < 0.02) { x = sh + 10 + r() * 50; if (water(s, x)) put(W, i, 'buoy', x, 0, { v: (r() * 2) | 0 }); }
          if (k === Math.round(S.len * 0.55)) put(W, i, 'ferry', Math.max(sh, 16) + 40, 0);
          break;
        case 5:   // the Needles at dawn: downs and gorse, chalk stacks, boats, and the lighthouse at the end of the rocks
          if (r() < 0.05) put(W, i, 'gorse', -(11.5 + r() * 20), 0.8, { soft: true });
          if (r() < 0.025) { x = 11.5 + r() * Math.max(2, sh - 14); if (land(s, x)) put(W, i, 'gorse', x, 0.8, { soft: true }); }
          if (r() < 0.012) { x = (r() < 0.5 ? -1 : 1) * (12 + r() * 12); if (land(s, x)) put(W, i, 'rock', x, 1.1, { v: (r() * 3) | 0 }); }
          if (r() < 0.035) put(W, i, 'sheep', -(18 + r() * 45), 0, { v: (r() * 2) | 0 });
          if (r() < 0.012) { x = sh + 25 + r() * 120; if (water(s, x)) put(W, i, 'stack', x, 0, { v: (r() * 3) | 0 }); }
          if (r() < 0.01) { x = sh + 20 + r() * 100; if (water(s, x)) put(W, i, 'yacht', x, 0, { v: (r() * 3) | 0 }); }
          if (k === Math.round(S.len * 0.8)) put(W, i, 'needles', Math.max(sh, 18) + 90, 0);
          break;
      }
    }
  }
  function pickups(W, from, to, r) {   // lines of coins, and the odd nitro bottle
    var i = from + 15 + ((r() * 20) | 0), id = 0;
    while (i < to) {
      var lane = LANES[(r() * 3) | 0], kind = r(), n = kind < 0.6 ? 8 : 12;
      id++;
      for (var j = 0; j < n; j++) {
        var s = segAt(W, i + j * 2); if (!s || s.fk || s.gate) continue;
        var x = kind < 0.6 ? lane : clamp(Math.sin(j / (n - 1) * Math.PI * 2) * 4.4, -4.6, 4.6);
        (s.coins || (s.coins = [])).push({ x: x, line: id, of: n, got: 0 });
      }
      i += n * 2 + 30 + ((r() * 45) | 0);
      if (r() < 0.3) { var sn = segAt(W, i); if (sn && !sn.fk) (sn.coins || (sn.coins = [])).push({ x: LANES[(r() * 3) | 0], nitro: true, got: 0 }); i += 15; }
    }
  }

  // ---------------------------------------------------------------- a new game
  function newWorld(speed, set, seed) {
    var d = speed === 3 ? 3 : speed === 2 ? 2 : 1;
    set = set || {};
    var W = {
      diff: d, speed: d, D: DIFF[d], car: CARS[set.car] ? set.car : 'roadster', auto: set.pedal !== 'hold',
      seed: seed == null ? (Math.random() * 4294967296) >>> 0 : seed >>> 0,
      segs: [], base: 0, fork: null, goalAt: -1, stretch: [], pendingSide: 0,
      s: 0, x: 0, v: 0, psi: 0, phi: 0, steer: 0, yawRate: 0, h: 0, vh: 0, air: false, airT: 0, land: 0,
      boost: 0.4, boosting: false, wasBoost: false, drift: 0, driftT: 0, driftPts: 0, brakeT: 0, brakeHeld: false,
      time: 0, timeUp: false, overT: 0, count: 200, t: 0, score: 0, sAcc: 0,
      stageNo: 1, round: 1, stage: 0, route: [0], cars: [], carN: 1, crash: null,
      combo: 0, comboT: 0, coinRun: 0, coinLast: -99, lineGot: {}, slip: 0, slipOn: false, scrapeT: 0, off: false,
      shake: 0, events: [], fx: [], fxN: 0, pops: [], banner: null, over: false, demo: false, nearN: 0, coinsN: 0, airBest: 0
    };
    W.rng = rnd(W.seed);
    buildStage(W, 0); nextFork(W, 0);
    W.time = W.D.time * STAGES[0].t;
    W.s = 3 * SEG; W.h = heightAt(W, W.s);
    for (var z = W.s + 70; z < W.s + VIEW; z += W.D.gap * (0.6 + W.rng() * 0.8)) spawnCar(W, z);
    return W;
  }
  function bannerOf(W, txt, sub, kind) { W.banner = { txt: txt, sub: sub || '', kind: kind || '', t: W.t }; }
  function pop(W, txt, sub, x, kind) { W.pops.push({ txt: txt, sub: sub || '', x: x || 0, t: W.t, kind: kind || '' }); if (W.pops.length > 6) W.pops.shift(); }
  function fx(W, o) { o.t = W.t; o.n = ++W.fxN; W.fx.push(o); if (W.fx.length > 200) W.fx.shift(); }

  // ---------------------------------------------------------------- traffic
  function pick(mix, r) { var tot = 0, i; for (i = 0; i < mix.length; i++) tot += mix[i]; var p = r() * tot; for (i = 0; i < mix.length; i++) { p -= mix[i]; if (p < 0) return i; } return 0; }
  function spawnCar(W, z) {
    var i = segIndex(z); if (i > lastIndex(W) - 4 || i < W.base) return;
    var g = segAt(W, i), S = STAGES[g.st], t = pick(S.mix, W.rng), T = VEH[t], b = 0, x = LANES[(W.rng() * 3) | 0];
    if (g.gate || (g.fk && g.fk.a)) return;
    if (g.fk && g.fk.b) b = W.fork && W.fork.s ? W.fork.s : (W.rng() < 0.5 ? -1 : 1);
    for (var j = 0; j < W.cars.length; j++) { var o = W.cars[j]; if (o.b === b && Math.abs(o.s - z) < 40 && Math.abs(o.x - x) < 3) return; }
    var tv = W.D.tv * (1 + 0.06 * Math.min(4, W.round - 1)), v = VMAX * (T.v[0] + W.rng() * (T.v[1] - T.v[0])) * tv;
    W.cars.push({ id: W.carN++, s: z, x: x, tx: x, v: v, v0: v, t: t, b: b, col: (W.rng() * 8) | 0, lc: 60, hitT: -999, passed: false, ds: z - W.s, spin: 0 });
  }
  function sameRoad(W, c) { return !(W.fork && W.fork.s && c.b && c.b !== W.fork.s); }
  function laneFree(W, c, L) {
    if (sameRoad(W, c) && Math.abs(W.s - c.s) < 60 && Math.abs(W.x - L) < 3.2) return false;   // never pull out in front of the player
    for (var q = 0; q < W.cars.length; q++) { var o = W.cars[q]; if (o !== c && o.b === c.b && Math.abs(o.s - c.s) < 45 && Math.abs(o.x - L) < 3) return false; }
    return true;
  }
  function moveTraffic(W) {
    var cars = W.cars, i, j, c, o, F = W.fork;
    for (i = 0; i < cars.length; i++) {
      c = cars[i];
      if (c.spin > 0) { c.spin--; c.v *= 0.97; c.s += c.v * DT; continue; }
      var ahead = null, dmin = 1e9;
      for (j = 0; j < cars.length; j++) {
        o = cars[j]; if (o === c || o.b !== c.b) continue;
        var d = o.s - c.s; if (d > 0 && d < 45 && d < dmin && Math.abs(o.x - c.x) < 3) { dmin = d; ahead = o; }
      }
      c.lc--;
      if (ahead) {
        if (c.lc <= 0) {
          var tries = [c.tx - 4.6, c.tx + 4.6].filter(function (L) { return L > -5 && L < 5; });
          for (j = 0; j < tries.length; j++) if (laneFree(W, c, tries[j])) { c.tx = tries[j]; c.lc = 150; break; }
        }
        if (Math.abs(ahead.x - c.x) < 3) c.v = Math.min(c.v, ahead.v);
      } else c.v += (c.v0 - c.v) * 0.01;
      if (sameRoad(W, c)) { var dz = c.s - W.s; if (dz < 0 && dz > -30 && Math.abs(c.x - W.x) < 3) c.v = Math.min(c.v, W.v * 0.95); }
      var g = segAt(W, segIndex(c.s));
      if (g.fk && g.fk.a && Math.abs(c.tx) < 3) c.tx = (c.id % 2 ? 1 : -1) * 6.5;   // in the widening road the middle lane picks a side
      else if (c.lc < -400 && W.rng() < 0.004) { var nl = LANES[(W.rng() * 3) | 0]; if (laneFree(W, c, nl)) { c.tx = nl; c.lc = 120; } }
      c.x += clamp(c.tx - c.x, -2.6 * DT, 2.6 * DT);
      var z0 = c.s; c.s += c.v * DT;
      if (F && c.b === 0 && segIndex(c.s) >= F.split && segIndex(z0) < F.split) {   // this car reaches the split: it takes the road on its side
        c.b = c.x >= 0 ? 1 : -1; c.x -= c.b * OFF0; c.tx = clamp(Math.round(c.x / 4.6) * 4.6, -4.6, 4.6);
      }
    }
    for (i = cars.length - 1; i >= 0; i--) {
      c = cars[i];
      if (c.s < W.s - 120 || c.s > W.s + VIEW + 120 || segIndex(c.s) > lastIndex(W) - 2 || (F && F.s && c.b && c.b !== F.s && segIndex(c.s) >= F.end - 2) || (!F && c.b)) cars.splice(i, 1);
    }
    var want = Math.round(VIEW / (W.D.gap * Math.pow(0.92, Math.min(4, W.round - 1)))), n = 0;
    for (i = 0; i < cars.length; i++) if (cars[i].s > W.s) n++;
    if (n < want && W.t % 10 === 0) spawnCar(W, W.s + VIEW * (0.8 + W.rng() * 0.18));
  }

  // ---------------------------------------------------------------- the player
  function roadHalf(g) { return g.fk && g.fk.a ? (g.fk.w1 + g.fk.w2) / 2 : HALF; }
  function edges(W, g) {   // how far the car can go each way: fields, walls, the sea wall, and the barrier in a split
    var lo = -26, hi = 26, F = W.fork;
    if (g.fk && g.fk.a) { var w = roadHalf(g); lo = -(w + 18); hi = w + 18; }
    if (g.fk && g.fk.b && F && F.s) { if (F.s > 0) lo = -(9.2 - CAR_W); else hi = 9.2 - CAR_W; }
    if (g.sea && g.sh - 1.5 < 26) { if (g.sea < 0) lo = Math.max(lo, -(g.sh - 1.5)); else hi = Math.min(hi, g.sh - 1.5); }
    if (g.wl) lo = Math.max(lo, -(g.wl - CAR_W));
    if (g.wr) hi = Math.min(hi, g.wr - CAR_W);
    return [lo, hi];
  }
  function bendHere(W, g) {   // the bend under the car: the road's own, plus a split road's turn away from the middle
    var k = g.k, F = W.fork;
    if (g.fk && g.fk.b && F && F.s) k += F.s * OFF2;
    return k;
  }
  function crash(W, hard, why) {
    if (W.crash) return;
    var tx = clamp(Math.round(W.x / 4.6) * 4.6, -4.6, 4.6);
    W.crash = { t: 0, dur: hard ? 115 : 42, hard: hard, x0: W.x, tx: tx, spin: W.x < 0 ? 1 : -1, why: why || '' };
    W.combo = 0; W.comboT = 0; W.drift = 0; W.boosting = false; W.shake = hard ? 26 : 12;
    W.events.push({ sfx: hard ? 'crash' : 'bump', x: 0 });
    fx(W, { k: hard ? 'crash' : 'bump', x: W.x });
    if (hard) W.events.push({ say: 'Crash!' });
  }
  function endDrift(W) {
    if (W.driftT > 0.5) {
      var p = Math.round(W.driftPts / 10) * 10; W.score += p;
      pop(W, 'DRIFT', '+' + p.toLocaleString('en-GB'), W.drift, 'drift'); W.events.push({ sfx: 'driftend' });
    }
    W.drift = 0; W.driftT = 0; W.driftPts = 0;
  }
  function cross(W, i) {   // the car's nose passes into segment i
    var g = segAt(W, i), F = W.fork, j;
    if (F && i === F.split && !F.s) {   // the split: whichever side the car is on is the road it takes
      var sx = W.x >= 0 ? 1 : -1, nextId = F.next[sx < 0 ? 0 : 1];
      if (Math.abs(W.x) < CAR_W + 0.8) crash(W, W.D.crash && W.v > 25, 'sign');
      F.s = sx; W.x -= sx * OFF0; if (W.crash) W.crash.tx = 0;
      W.pendingSide = sx; buildStage(W, nextId); W.route.push(nextId);
      W.events.push({ sfx: 'fork' }); W.events.push({ say: 'You chose ' + STAGES[nextId].name.toLowerCase() });
      bannerOf(W, STAGES[nextId].name, 'Next checkpoint ahead', 'stage');
    }
    if (F && F.s && i >= F.end) {   // out of the split: one road again
      W.cars = W.cars.filter(function (c) { return !c.b || c.b === F.s; });
      W.cars.forEach(function (c) { c.b = 0; });
      F = null; nextFork(W, i);
    }
    if (g.gate) gate(W, g.gate);
    if (g.coins && !W.crash) for (j = 0; j < g.coins.length; j++) {
      var c = g.coins[j];
      if (!c.got && Math.abs(W.x - c.x) < 1.7 && W.h - heightAt(W, W.s) < 2.6) {
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
    if (g.spr && !W.crash && !W.air) for (j = 0; j < g.spr.length; j++) {
      var p = g.spr[j];
      if (!p.h || p.done) continue;
      if (p.b && !(W.fork && W.fork.s === p.b)) continue;
      if (Math.abs(W.x - p.x) < CAR_W + p.h) {
        if (p.soft) { p.done = W.t; W.v *= 0.84; W.events.push({ sfx: 'bush', x: p.x - W.x }); fx(W, { k: 'leaves', x: p.x, t2: p.t }); W.shake = Math.max(W.shake, 5); }
        else crash(W, W.D.crash && W.v > 22, p.t);
        break;
      }
    }
  }
  function nextFork(W, i) {
    for (var j = 0; j < W.stretch.length; j++) {
      var r = W.stretch[j], f = r.fork;
      if (f && !r.used && f.split > i) { r.used = true; W.fork = { a: f.a, split: f.split, end: f.end, s: 0, next: f.next }; return; }
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
  function topSpeed(W) { return VMAX * CARS[W.car].top; }
  var CF = 0.32;   // how hard a bend pushes the car outwards: k * v * v * CF metres a second
  function turnLimit(W, v) { return (0.6 + (W.D.psiTop - 0.6) * Math.pow(Math.min(1, v / VMAX), 0.8)) * CARS[W.car].yaw; }   // the angle a held key turns the car to
  function pushOut(W, k, v) { return k * v * v * CF * (1 - W.D.assist) * (W.drift ? 0.42 : 1) / CARS[W.car].grip; }

  function step(W, inp) {
    inp = inp || {};
    W.t++;
    if (W.shake > 0) W.shake--;
    if (W.comboT > 0 && --W.comboT === 0) W.combo = 0;
    var D = W.D, C = CARS[W.car], i0 = segIndex(W.s), g = segAt(W, i0), top = topSpeed(W);
    if (W.count > 0) {   // the lights: three reds, then green
      W.count--;
      if (W.count === 180 || W.count === 120 || W.count === 60) W.events.push({ sfx: 'count' });
      if (W.count === 0) {
        W.events.push({ sfx: 'go' }); bannerOf(W, 'GO!', '', 'go');
        if (inp.fire || inp.alt) { W.v = top * 0.32; W.boost = Math.min(1, W.boost + 0.25); W.score += 5000; pop(W, 'FLYING START', '+5,000', 0, 'gold'); W.events.push({ sfx: 'perfect' }); }
      }
      W.rev = (inp.fire || inp.alt || inp.up) ? Math.min(1, (W.rev || 0) + 0.05) : Math.max(0, (W.rev || 0) - 0.03);
      W.h = heightAt(W, W.s);
      moveTraffic(W);
      return;
    }
    if (!W.timeUp) {
      var before = Math.ceil(W.time);
      W.time -= DT;
      if (W.time <= 0) { W.time = 0; W.timeUp = true; W.events.push({ sfx: 'timeup' }); W.events.push({ say: 'Time up' }); bannerOf(W, 'TIME UP', '', 'red'); endDrift(W); }
      else if (Math.ceil(W.time) < before && before <= 11) W.events.push({ sfx: 'tick', n: before - 1 });
    }

    // ---- controls
    var L = !!inp.left, R = !!inp.right, brake = !!inp.down, out = !!W.crash;
    var wantBoost = !W.timeUp && !out && !!(inp.fire || inp.alt);
    var gas = !W.timeUp && !out && (W.auto ? !brake : !!inp.up);
    var target = out ? 0 : (R ? 1 : 0) - (L ? 1 : 0);
    W.steer += (target - W.steer) * (target === 0 ? 0.25 : 0.16);
    var pressed = (brake && !W.brakeHeld) || !!inp.brakeTap; W.brakeHeld = brake;   // a tap too quick to last a step still counts
    if (inp.brakeTap) inp.brakeTap = false;
    if (brake && !W.drift) W.brakeT += DT; else W.brakeT = 0;
    // a drift: brake (a tap is enough) while turning at speed; it lasts while you hold the turn or the car is still sliding
    if (!W.drift && !out && !W.air && target !== 0 && W.v > top * 0.42 && (pressed || (brake && W.brakeT < 0.3))) {
      W.drift = target; W.driftT = 0; W.driftPts = 0; W.events.push({ sfx: 'skid' });
      W.psi += target * 0.18;   // the back steps out
    }
    var slide = W.psi - W.phi;
    if (W.drift && (W.v < top * 0.3 || out || target !== W.drift)) endDrift(W);   // let go (or turn the other way) to straighten up
    void slide;
    W.boosting = wantBoost && W.boost > 0.005;
    if (W.boosting) { W.boost = Math.max(0, W.boost - 0.3 * DT); if (!W.wasBoost) W.events.push({ sfx: 'boost' }); }
    W.wasBoost = W.boosting;

    // ---- speed
    var hz = top * (W.boosting ? 1.22 : 1) * (W.slipOn ? 1.04 : 1);
    var v = W.v, accel = 16 * C.acc * Math.max(0, 1 - Math.pow(v / hz, 1.6)) + (W.boosting ? 9 : 0);
    if (out) v *= W.crash.hard ? 0.95 : 0.9;
    else if (W.drift) v -= (2.5 + (brake ? 2 : 0)) * DT;
    else if (brake) v -= 26 * DT;
    else if (gas || W.boosting) v += accel * DT;
    else v -= (3 + 0.0006 * v * v) * DT;
    if (!W.air) v -= GRAV * 0.35 * gradeAt(W, W.s) * DT;   // uphill slows you a little, downhill helps
    W.off = !W.air && Math.abs(W.x) > roadHalf(g) + RUMBLE;
    if (W.off) { var offTop = top * D.off; if (v > offTop) v = Math.max(offTop, v - 22 * DT); }
    if (v > hz) v = Math.max(hz, v - 12 * DT);
    W.v = v = Math.max(0, v);

    // ---- turning: where the car points (psi) and where it goes (phi), both measured from the road
    var k = bendHere(W, g), lim = turnLimit(W, v) * Math.min(1, v / 6), want;
    if (W.drift && !out) {
      // a drift: the car's line holds the bend (just enough to cancel its push, trimmed a little by the keys) while its
      // nose swings in; the slide grows over the first moment
      var hold = Math.asin(clamp(pushOut(W, k, v) / Math.max(5, v), -0.6, 0.6)) + W.drift * 0.04;
      if (!W.air) W.phi += (hold - W.phi) * Math.min(1, 4 * DT);
      want = W.phi + W.drift * Math.min(0.5, 0.25 + W.driftT * 0.6);
      if (!W.air) W.psi += (want - W.psi) * Math.min(1, 5 * DT);
    } else {
      want = out ? W.psi : W.steer * lim;
      if (!W.air) W.psi += (want - W.psi) * Math.min(1, 7 * DT);   // the car turns to the angle asked for
      var grip = 12 * C.grip * (W.off ? 0.7 : 1) * (W.air ? 0 : 1);
      W.phi += (W.psi - W.phi) * Math.min(1, grip * DT);
    }
    W.yawRate = (want - W.psi) * 7;
    if (out) { var cr = W.crash; cr.t++; if (cr.t > cr.dur * 0.55) { W.x += (cr.tx - W.x) * 0.1; W.psi *= 0.85; W.phi *= 0.85; } if (cr.t >= cr.dur) { W.crash = null; W.v = 0; W.x = cr.tx; W.psi = W.phi = 0; W.steer = 0; } }

    // ---- along and across; a bend pushes the car outwards
    W.s += v * Math.cos(W.phi) * DT;
    W.x += (v * Math.sin(W.phi) - (W.air || out ? 0 : pushOut(W, k, v))) * DT;
    var i1 = segIndex(W.s);
    for (var i = i0 + 1; i <= i1; i++) cross(W, i);
    g = segAt(W, i1);
    var e = edges(W, g);
    if (W.x < e[0] || W.x > e[1]) {   // against a wall, a fence, the sea wall or the barrier: scrape along it, turned straight
      var side = W.x < e[0] ? -1 : 1;
      W.x = clamp(W.x, e[0], e[1]);
      if (side * W.phi > 0) { W.phi *= 0.3; W.psi *= 0.5; }
      if (W.v > 6) { W.v *= 0.982; if (W.t - W.scrapeT > 8) { W.scrapeT = W.t; W.events.push({ sfx: 'scrape', x: side }); fx(W, { k: 'sparks', x: W.x + side * CAR_W }); } W.shake = Math.max(W.shake, 3); }
      if (W.drift) endDrift(W);
    }

    // ---- up and down: over a sharp crest the road falls away faster than the car can follow, and it flies
    var roadY = heightAt(W, W.s), roadVY = W.v * Math.cos(W.phi) * gradeAt(W, W.s);
    if (!W.air) {
      var need = (roadVY - W.vh) / DT;
      if (need < -GRAV && W.v > 20 && !W.crash) { W.air = true; W.airT = 0; W.vh = Math.min(W.vh, 7); W.h += W.vh * DT; }
      else { W.h = roadY; W.vh = roadVY; }
    }
    if (W.air) {
      W.vh -= GRAV * 1.5 * DT; W.h += W.vh * DT; W.airT += DT;   // a little heavier in the air: a short, punchy jump
      if (W.h <= roadY) {
        var hit = W.vh - roadVY; W.h = roadY; W.vh = roadVY; W.air = false; W.land = W.t;
        if (W.airT > 0.35) { var ap = Math.round(W.airT * 20) * 100; W.score += ap; W.airBest = Math.max(W.airBest, W.airT); pop(W, W.airT > 0.9 ? 'BIG AIR' : 'AIR', '+' + ap.toLocaleString('en-GB'), 0, 'gold'); }
        W.events.push({ sfx: 'land', n: Math.min(3, -hit / 6) }); W.shake = Math.max(W.shake, Math.min(14, -hit * 1.2)); fx(W, { k: 'land', x: W.x });
        if (Math.abs(W.psi - W.phi) > 0.5 && !W.drift) W.psi = W.phi + clamp(W.psi - W.phi, -0.3, 0.3);
      }
    }

    // ---- the traffic: bumps, near misses and slipstreams
    moveTraffic(W);
    out = !!W.crash;
    var slipping = false;
    for (var q = 0; q < W.cars.length; q++) {
      var car = W.cars[q];
      if (!sameRoad(W, car)) { car.ds = car.s - W.s; continue; }
      var V = VEH[car.t], dz = car.s - W.s, dxx = Math.abs(car.x - W.x), hitW = V.w + CAR_W - 0.1, hitL = V.l + CAR_L;
      if (!out && !W.air && Math.abs(dz) < hitL && dxx < hitW && W.t - car.hitT > 30) {
        car.hitT = W.t;
        if (W.v >= car.v) {
          var hard = D.crash && W.v - car.v > 30 && dxx < hitW * 0.7;
          if (hard) { crash(W, true, 'car'); W.s = Math.min(W.s, car.s - hitL - 0.5); car.spin = 60; }
          else {
            W.v = car.v * (W.diff === 1 ? 0.85 : 0.72); W.s = Math.min(W.s, car.s - hitL - 0.3);
            W.x += (W.x >= car.x ? 1 : -1) * 0.6; car.x += (car.x > W.x ? 1 : -1) * 0.3;
            W.shake = Math.max(W.shake, 10); W.combo = 0; W.comboT = 0; if (W.drift) endDrift(W);
            W.events.push({ sfx: 'bump', x: car.x - W.x }); fx(W, { k: 'bump', x: (car.x + W.x) / 2 });
          }
        } else { W.x += (W.x >= car.x ? 1 : -1) * 0.8; W.events.push({ sfx: 'bump', x: car.x - W.x }); }
        dz = car.s - W.s;
      }
      if (!car.passed && car.ds >= 0 && dz < 0) {
        car.passed = true;
        if (dxx < hitW + 2.2 && W.t - car.hitT > 60 && W.v > top * 0.55 && !out) {
          W.combo = W.comboT > 0 ? Math.min(W.combo + 1, 9) : 1; W.comboT = 200; W.nearN++;
          var pts = 500 * W.combo; W.score += pts; W.boost = Math.min(1, W.boost + 0.1);
          W.events.push({ sfx: 'near', x: car.x - W.x, n: W.combo });
          pop(W, W.combo > 1 ? 'NEAR MISS x' + W.combo : 'NEAR MISS', '+' + pts.toLocaleString('en-GB'), car.x - W.x, 'near');
        }
      }
      car.ds = dz;
      if (dz > 6 && dz < 45 && dxx < 1.4 && W.v > top * 0.5) slipping = true;
    }
    W.slip = slipping ? W.slip + DT : Math.max(0, W.slip - DT * 2);
    var on = W.slip > 0.6;
    if (on) W.boost = Math.min(1, W.boost + 0.16 * DT);
    if (on && !W.slipOn) { W.events.push({ sfx: 'slip' }); pop(W, 'SLIPSTREAM', 'BOOST FILLING', 0, 'slip'); }
    W.slipOn = on;

    // ---- drifting fills the boost and scores by speed and angle; points for speed
    if (W.drift) {
      var ang = Math.abs(W.psi - W.phi);
      W.driftT += DT; W.driftPts += W.v / VMAX * ang * 70; W.boost = Math.min(1, W.boost + ang * 0.75 * DT);
      if (W.t % 3 === 0) fx(W, { k: 'smoke', x: W.x, d: W.drift });
    }
    if (W.off && W.v > 10 && W.t % 4 === 0) fx(W, { k: 'dust', x: W.x });
    if (!W.timeUp && !out) { var p2 = W.v / VMAX; W.sAcc += p2 * p2 * 32 * (W.boosting ? 1.5 : 1); var whole = Math.floor(W.sAcc); W.score += whole; W.sAcc -= whole; }

    if (W.timeUp && W.v < 1.5) { if (++W.overT > 70) W.over = true; }
    if (W.t % 60 === 0) { var drop = i1 - 80 - W.base; if (drop > 300) { W.segs.splice(0, drop); W.base += drop; } }
  }

  // ---------------------------------------------------------------- a driver for the title screen and the tests
  function autopilot(W, side) {
    var inp = { left: false, right: false, up: true, down: false, fire: false, alt: false };
    if (W.count > 0) { inp.fire = W.count < 8; return inp; }
    var i = segIndex(W.s), F = W.fork, top = topSpeed(W), target = 0, k, c, j;
    if (F && !F.s && i > F.a - 60) target = (side || (W.route.length % 2 ? 1 : -1)) * 6.5;
    else {   // stay in lane, or move one lane over to the one with the most room ahead; boxed in, brake
      var cur = W.botLane == null ? 1 : W.botLane, best = -1e9, room = 1e9, close = 0, pickK = cur;
      for (k = Math.max(0, cur - 1); k <= Math.min(2, cur + 1); k++) {
        var L = LANES[k], free = 400, cl = 0, lo = Math.min(W.x, L) - 2.6, hi = Math.max(W.x, L) + 2.6;
        for (j = 0; j < W.cars.length; j++) {
          c = W.cars[j]; if (!sameRoad(W, c)) continue;
          var dz = c.s - W.s, closing = Math.max(0, W.v - c.v);
          if (k !== cur && dz > -10 && dz < 12 + closing * 0.6 && c.x > lo && c.x < hi) free = -1;
          else if (dz > -6 && dz < free && Math.abs(c.x - L) < 2.8) { free = dz; cl = closing; }
        }
        var sc = free + (k === cur ? 25 : 0);
        if (sc > best) { best = sc; target = L; room = free; close = cl; pickK = k; }
      }
      W.botLane = pickK;
      if (room < 14 + close * close / 40 + close * 0.3) W.botBrake = 4;
    }
    // aim for the lane, a little ahead, leaning into the bend by as much as it pushes
    var look = Math.max(12, W.v * 0.7), kAhead = 0;
    for (j = 0; j < 8; j++) kAhead += bendHere(W, segAt(W, i + j));
    kAhead /= 8;
    var lim = turnLimit(W, W.v);
    var need = Math.asin(clamp(pushOut(W, kAhead, W.v) / Math.max(5, W.v), -1, 1));
    var u = (Math.atan2(target - W.x, look) + need) / Math.max(0.05, lim);
    if (u > 0.3) inp.right = true; else if (u < -0.3) inp.left = true;
    var maxK = 0; for (j = 2; j < 30; j++) maxK = Math.max(maxK, Math.abs(segAt(W, i + j).k));
    var tooFast = pushOut(W, maxK, W.v) > W.v * Math.sin(lim) * 0.85;
    if (tooFast && W.v > 24) { if (W.auto) inp.down = true; else inp.up = false; }
    inp.fire = W.boost > 0.3 && maxK < 1 / 260 && W.v > top * 0.6 && !(W.botBrake > 0);
    if (W.botBrake > 0) { W.botBrake--; inp.down = true; inp.up = false; }
    if (inp.down && !W.drift) { inp.left = false; inp.right = false; }   // the driver brakes in a straight line, so it never drifts by accident
    return inp;
  }

  function hud(W) { return { score: W.score, lives: 1, wave: W.stageNo }; }
  function mph(W) { return Math.round(W.v * 2.237); }

  return {
    SEG: SEG, HALF: HALF, RUMBLE: RUMBLE, VMAX: VMAX, VIEW: VIEW, CAR_W: CAR_W, CAR_L: CAR_L, LANES: LANES, FA: FA, FB: FB, OFF0: OFF0, OFF_END: OFF_END, OFF2: OFF2,
    STAGES: STAGES, VEH: VEH, CARS: CARS, DIFF: DIFF,
    newWorld: newWorld, step: step, hud: hud, mph: mph, autopilot: autopilot, peek: peek, topSpeed: topSpeed,
    segAt: segAt, segIndex: segIndex, lastIndex: lastIndex, heightAt: heightAt, forkOff: forkOff, edges: edges, roadHalf: roadHalf, bendHere: bendHere, rnd: rnd
  };
});
