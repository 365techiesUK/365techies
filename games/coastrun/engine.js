/* 365 Coast Run - the rules (rebuilt in 3D, 5 Oct 2026; the full arcade run the same day). A seaside road race in the
 * style of the sit-down arcade racers: a clock that runs down, a checkpoint at the end of each stretch that adds time,
 * traffic to weave through, and a fork after each stretch - keep left or right to choose where you go next. Five stretches
 * make a run, through fifteen places along the Dorset coast laid out like a pyramid (west to the left, east to the right):
 * Bournemouth; Sandbanks or Christchurch; Corfe Castle, Old Harry Rocks or the New Forest; Durdle Door, Weymouth, Poole
 * Harbour by night or Lymington; and one of five goals - Lyme Regis, Portland Bill, Golden Cap, Hengistbury Head or the
 * Needles. The goal gives a time bonus and a rank, and the run starts again from Bournemouth, busier and quicker.
 * Your passenger asks for things as you go ("drift for me!", "overtake those cars!") - do them for hearts.
 * Our own names, roads, cars, people and pictures.
 *
 * Units are metres and seconds. The road is a line of segments SEG long, each with its own bend (k, 1/metres: + turns
 * right) and height. The car is held relative to the road: s along it, x across it (+ right, the road is -HALF..HALF),
 * psi = which way it points and phi = which way it is actually going, both measured from the road's own direction.
 * Steering is the arcade kind: holding a key turns the car to an angle from the road (smaller the faster you go) and
 * letting go straightens it; a bend pushes the car outwards (more the faster you go), so you steer into it and ease off
 * for the sharp ones. A drift (tap brake while turning) turns the car much further, slides it (phi lags psi) and
 * pushes it out less, so you go round sideways. Over a sharp crest the road can fall away faster than gravity pulls the
 * car down, and it flies. Some stretches run through tunnels (tun) and over bridges (brg): walls and railings either side.
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
  var LEVELS = 5;                       // stretches in a run (the last one ends in a goal)
  var TUN_W = HALF + RUMBLE + 0.6, BRG_W = HALF + 1.25, VERGE = 14.2;   // (VERGE: the boundary along the land side of the road)   // a tunnel's walls, a bridge's railings (metres from the middle)

  function rnd(seed) {   // mulberry32: the same numbers every time for the same seed
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function ease(a, b, p) { return a + (b - a) * (-Math.cos(Math.PI * Math.max(0, Math.min(1, p))) / 2 + 0.5); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function forkOff(k) { var p = clamp(k, 0, FB) / FB; return OFF0 + (OFF_END - OFF0) * p * p; }   // k in segments from the split

  // ---------------------------------------------------------------- the places, a pyramid of five levels
  // t = seconds the stretch's checkpoint gives; len = segments before the fork or goal; sea = side of the sea (-1 left,
  // 1 right); band = the heights the road keeps to (metres above the sea); mix = traffic weights for VEH;
  // feat = tunnels, bridges and things over the road (over: models spanning it). id, level, pos and next are filled in below.
  var STAGES = [
    { key: 'bournemouth', name: 'BOURNEMOUTH', seed: 1103, t: 66, len: 700, curvy: 0.55, hilly: 0.12, sea: -1, band: [3, 6], shores: [38, 44, 50, 56, 60, 66, 72, 48], mix: [5, 4, 2, 2, 3, 0, 0, 2], feat: { over: ['banner'] } },   // (shores: a wide sandy beach)
    { key: 'sandbanks', name: 'SANDBANKS', seed: 1709, t: 64, len: 700, curvy: 0.6, hilly: 0.2, sea: -1, band: [3, 8], shores: [30, 34, 38, 42, 48, 54, 36, 40], mix: [5, 4, 1, 1, 3, 0, 0, 4], feat: { over: ['banner'] } },   // (no bridge: there is none on the spit)
    { key: 'christchurch', name: 'CHRISTCHURCH', seed: 1811, t: 64, len: 700, curvy: 0.65, hilly: 0.3, sea: 1, band: [4, 13], shores: [20, 22, 24, 28, 32, 26, 22, 36], mix: [5, 4, 2, 1, 3, 1, 0, 2], feat: { bridge: 2 } },
    { key: 'purbeck', name: 'CORFE CASTLE', seed: 2207, t: 70, len: 730, curvy: 0.75, hilly: 1, sea: 0, band: [14, 95], mix: [5, 3, 2, 0, 3, 3, 1, 1], feat: { tunnel: 1, over: ['viaduct'] } },
    { key: 'swanage', name: 'OLD HARRY ROCKS', seed: 2903, t: 70, len: 730, curvy: 0.7, hilly: 0.75, sea: -1, band: [22, 60], bands: [[0, [3, 9]], [0.26, [24, 40]], [0.62, [24, 40]], [0.7, [3, 9]]], shores: [26, 30, 34, 38, 44, 30, 36, 28], mix: [5, 3, 1, 1, 3, 1, 0, 2], feat: { over: ['viaduct'] } },   // (bands: low through Studland, up over the downs, down into Swanage)
    { key: 'forest', name: 'NEW FOREST', seed: 3301, t: 70, len: 730, curvy: 0.85, hilly: 0.55, sea: 0, band: [10, 50], mix: [5, 3, 2, 0, 3, 2, 1, 1], feat: { over: ['footbridge'] } },
    { key: 'jurassic', name: 'DURDLE DOOR', seed: 4409, t: 70, len: 740, curvy: 0.8, hilly: 0.85, sea: -1, band: [30, 80], mix: [5, 3, 1, 1, 3, 1, 0, 2], feat: { tunnel: 1 } },
    { key: 'weymouth', name: 'WEYMOUTH BAY', seed: 4513, t: 68, len: 720, curvy: 0.6, hilly: 0.35, sea: -1, band: [4, 14], mix: [5, 4, 2, 2, 3, 0, 0, 2], feat: { bridge: 1, over: ['banner'] } },
    { key: 'harbour', name: 'POOLE HARBOUR', seed: 5503, t: 68, len: 720, curvy: 0.6, hilly: 0.12, sea: 1, band: [3, 8], shores: [16.5, 17, 18, 17.5, 16.5, 19, 18, 17], mix: [5, 4, 3, 2, 1, 0, 2, 2], feat: { bridge: 1 } },
    { key: 'lymington', name: 'LYMINGTON', seed: 5617, t: 68, len: 720, curvy: 0.65, hilly: 0.3, sea: 1, band: [4, 13], mix: [5, 4, 2, 1, 3, 1, 0, 3], feat: { bridge: 1 } },
    { key: 'lyme', name: 'LYME REGIS', seed: 6101, t: 72, len: 750, curvy: 0.75, hilly: 0.8, sea: -1, band: [10, 50], mix: [5, 3, 1, 1, 3, 0, 0, 2], feat: { tunnel: 1 } },
    { key: 'portland', name: 'PORTLAND BILL', seed: 6203, t: 72, len: 750, curvy: 0.8, hilly: 0.7, sea: -1, band: [18, 60], mix: [5, 3, 2, 0, 3, 1, 1, 1], feat: { tunnel: 2 } },
    { key: 'goldencap', name: 'GOLDEN CAP', seed: 6307, t: 72, len: 760, curvy: 0.8, hilly: 0.9, sea: -1, band: [30, 90], mix: [5, 3, 1, 1, 3, 1, 0, 2], feat: { tunnel: 1 } },
    { key: 'hengistbury', name: 'HENGISTBURY HEAD', seed: 6409, t: 72, len: 740, curvy: 0.65, hilly: 0.4, sea: 1, band: [4, 22], shores: [30, 34, 38, 42, 46, 36, 40, 32], mix: [5, 4, 1, 1, 3, 0, 0, 3], feat: { bridge: 1 } },
    { key: 'needles', name: 'THE NEEDLES', seed: 6607, t: 72, len: 760, curvy: 0.75, hilly: 0.8, sea: 1, band: [22, 70], bands: [[0, [3, 9]], [0.24, [14, 36]], [0.68, [22, 44]], [0.86, [32, 54]]], shores: [22, 26, 30, 34, 28, 24, 32, 26], mix: [5, 3, 1, 1, 3, 0, 0, 2] }   // (bands: Yarmouth at the water, over West Wight, up to the Needles; no tunnel)
  ];
  (function () {   // the pyramid: level L (1..5) has L places; from place j of a level, left goes to j and right to j + 1 of the next
    var id = 0;
    for (var L = 1; L <= LEVELS; L++) for (var j = 0; j < L; j++, id++) {
      var S = STAGES[id]; S.id = id; S.level = L; S.pos = j;
      S.next = L < LEVELS ? [id + L, id + L + 1] : null;
    }
  })();
  // the traffic: w = half its width, l = half its length (metres), v = its speed (share of full speed)
  var VEH = [
    { id: 'hatch', w: 0.9, l: 2.0, v: [0.4, 0.56] },
    { id: 'saloon', w: 0.95, l: 2.3, v: [0.42, 0.58] },
    { id: 'van', w: 1.0, l: 2.6, v: [0.36, 0.5] },
    { id: 'bus', w: 1.25, l: 5.5, v: [0.3, 0.38] },
    { id: 'camper', w: 1.05, l: 2.8, v: [0.33, 0.45] },
    { id: 'tractor', w: 1.2, l: 2.2, v: [0.17, 0.23] },
    { id: 'lorry', w: 1.25, l: 6, v: [0.33, 0.43] },
    { id: 'sports', w: 0.95, l: 2.2, v: [0.52, 0.64] },
    { id: 'wedge', w: 1.0, l: 2.25, v: [1, 1], rival: true },   // the rivals (see rivals()): their pace is set there
    { id: 'lemans', w: 0.95, l: 2.1, v: [1, 1], rival: true },
    { id: 'coupe9', w: 0.95, l: 2.1, v: [1, 1], rival: true }, { id: 'gtbrit', w: 0.96, l: 2.2, v: [1, 1], rival: true }, { id: 'raging', w: 1.0, l: 2.2, v: [1, 1], rival: true },
    { id: 'trident', w: 0.95, l: 2.25, v: [1, 1], rival: true }, { id: 'barchetta', w: 0.97, l: 2.3, v: [1, 1], rival: true }
  ];
  // the player's car: top speed, acceleration, grip, and how quickly it turns
  var CARS = {
    roadster: { top: 1, acc: 1, grip: 1, yaw: 1 },
    gt: { top: 1.07, acc: 0.92, grip: 0.86, yaw: 0.95 },
    hatch: { top: 0.94, acc: 1.15, grip: 1.15, yaw: 1.08 }
  };
  // the speeds: more time, fewer and slower cars, bends that push less (assist), bounces instead of crashes at Gentle;
  // psiTop = how far from the road's direction the car turns at full speed (radians); req = which of a request's goals
  var DIFF = {
    1: { time: 1.06, gap: 170, tv: 0.9, assist: 0.55, psiTop: 0.24, crash: false, off: 0.55, req: 0, rv: 0.88 },
    2: { time: 1, gap: 115, tv: 1, assist: 0.2, psiTop: 0.21, crash: true, off: 0.45, req: 1, rv: 0.94 },
    3: { time: 0.9, gap: 85, tv: 1.08, assist: 0.05, psiTop: 0.2, crash: true, off: 0.4, req: 2, rv: 0.99 }
  };
  // what your passenger asks for: goal by speed (Gentle, Classic, Fast), seconds to do it in
  var REQ = {
    drift: { txt: 'Drift round the bends for me!', goal: [1.4, 2, 2.6], dur: 15, secs: true },
    near: { txt: 'Squeeze past the traffic - close!', goal: [2, 3, 4], dur: 16 },
    pass: { txt: 'Overtake those cars!', goal: [4, 6, 7], dur: 15 },
    coins: { txt: 'Grab the coins!', goal: [8, 11, 14], dur: 14 },
    clean: { txt: "Careful - don't hit anything!", goal: [1, 1, 1], dur: 12 },
    speed: { txt: 'Faster! Faster!', goal: [3.5, 4.5, 5.5], dur: 12, secs: true },
    air: { txt: 'Make us fly over the hill!', goal: [1, 1, 1], dur: 13 },
    slip: { txt: 'Tuck in behind a car - slipstream!', goal: [1, 1, 1], dur: 15 }
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
      else if (B.k >= B.nextSh) { B.shT = (B.S.shores || [14, 16, 17, 19, 22, 28, 44, 70])[(B.rng() * 8) | 0]; B.nextSh = B.k + 90 + ((B.rng() * 120) | 0); }
      B.sh += clamp(B.shT - B.sh, -0.35, 0.35);
      s.sea = B.S.sea; s.sh = B.sh;
    }
    if (B.cutN > 0) { B.cutN--; s.cut = B.cutSide; s.cutH = B.cutH * Math.min(1, Math.min(B.cutN, B.cutLen - B.cutN) / 14); }
    else if (B.S.hilly >= 0.7 && B.k > 60 && B.k < B.S.len - 80 && B.rng() < 0.012) { B.cutLen = B.cutN = 50 + ((B.rng() * 70) | 0); B.cutSide = B.S.sea ? -B.S.sea : (B.rng() < 0.5 ? -1 : 2); B.cutH = 8 + B.rng() * 8; }
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
      if (S.bands) { var fb = (i - from) / Math.max(1, to - from); for (var bq = 0; bq < S.bands.length; bq++) if (fb >= S.bands[bq][0]) band = S.bands[bq][1]; }   // (a stage whose height changes along it)
      var len = 30 + ((r() * 70) | 0), target;
      var bw = Math.min(12, band[1] - band[0]);   // (a narrow band - Bournemouth's flat promenade - is kept inside it)
      if (y < band[0]) target = band[0] + r() * bw;
      else if (y > band[1]) target = band[1] - r() * bw;
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
  // tunnels, bridges and the things that span the road, somewhere in the middle of the stretch (never on a crest, a
  // gate or a fork). A bridge lifts the road to at least 9 m over the water, easing up to it and down again.
  var OVERS = { bournemouth: ['pierarch', 'banner'], sandbanks: ['banner', 'footbridge'], christchurch: ['treearch', 'footbridge'], purbeck: ['treearch', 'viaduct'], swanage: ['footbridge', 'treearch'],
    forest: ['treearch', 'footbridge', 'treearch'], jurassic: ['rockarch', 'footbridge'], weymouth: ['banner', 'footbridge'], harbour: ['liftbridge', 'footbridge', 'banner'], lymington: ['treearch', 'banner'], lyme: ['banner', 'footbridge'],
    portland: ['craneway', 'footbridge'], goldencap: ['treearch', 'footbridge'], hengistbury: ['footbridge', 'treearch'], needles: ['chairlift', 'footbridge'] };   // what spans the road in each place (the natural arch only at Durdle Door, the one place that has one)
  function features(W, S, lo, hi, r) {
    var F = S.feat || {}, used = [], i, tries;
    function free(a, b) { if (a < lo || b > hi) return false; for (var u = 0; u < used.length; u++) if (a < used[u][1] + 50 && b > used[u][0] - 50) return false; for (var q = a; q < b; q++) if (segAt(W, q).crest) return false; return true; }
    function span(len) { for (tries = 0; tries < 40; tries++) { var a = lo + ((r() * (hi - lo - len)) | 0); if (free(a, a + len)) { used.push([a, a + len]); return a; } } return -1; }
    for (var t = 0; t < (F.tunnel || 0); t++) {
      var tl = 45 + ((r() * 40) | 0), ta = span(tl);
      if (ta >= 0) for (i = ta; i < ta + tl; i++) { var tg = segAt(W, i); tg.tun = 1; tg.bank *= 0.5; tg.wl = tg.wr = 0; }
    }
    for (var b = 0; b < (F.bridge || 0); b++) {
      var bl = 32 + ((r() * 26) | 0), ba = span(bl + 60);
      if (ba < 0) continue;
      ba += 30; var bz = ba + bl, H = 9, ramp = 28, Y = [];
      for (i = ba - ramp; i <= bz + ramp; i++) Y.push(segAt(W, i).y1);
      var lift = function (p) { var f = p < ba ? (p - (ba - ramp)) / ramp : p > bz ? 1 - (p - bz) / ramp : 1; f = clamp(f, 0, 1); f = f * f * (3 - 2 * f); return Math.max(0, H - Y[p - (ba - ramp)]) * f; };
      for (i = ba - ramp; i < bz + ramp; i++) { var g = segAt(W, i); g.y1 += lift(i); g.y2 += lift(i + 1); if (i >= ba && i < bz) { g.brg = 1; g.wl = g.wr = 0; g.bank = 0; } }
    }
    (F.over || []).forEach(function (t2, n) {
      for (tries = 0; tries < 30; tries++) {
        var oi = lo + 30 + ((r() * (hi - lo - 60)) | 0), og = segAt(W, oi);
        if (!og.tun && !og.brg && !og.crest && Math.abs(og.k) < 1 / 300 && free(oi - 4, oi + 4)) { used.push([oi - 4, oi + 4]); putAt(W, oi, t2, 0, 0, { v: n }); og.over = t2; for (var nq0 = oi - 9; nq0 <= oi + 9; nq0++) segAt(W, nq0).nearOver = 1; break; }
      }
    });
    var OV = OVERS[S.key] || [], n2 = 0;   // OutRun's way: something over the road every half a kilometre or so (a critic counted too few), placed in step (no dice)
    for (var oj = lo + 60; OV.length && oj < hi - 30; oj += 125) for (var d2 = 0; d2 < 30 && oj + d2 < hi; d2++) {
      var q2 = oj + d2, g2 = segAt(W, q2);
      if (!g2.tun && !g2.brg && !g2.crest && !g2.gate && !g2.fk && !g2.over && Math.abs(g2.k) < 1 / 250 && free(q2 - 3, q2 + 3)) { used.push([q2 - 3, q2 + 3]); putAt(W, q2, OV[n2 % OV.length], 0, 0, { v: n2 }); g2.over = OV[n2 % OV.length]; n2++; for (var nq = q2 - 9; nq <= q2 + 9; nq++) segAt(W, nq).nearOver = 1; break; }   // (nothing else stands in its legs)
    }
  }
  function putAt(W, i, t, x, h, o) {   // something at the roadside: t = what (world3d.js models it), x = across, h = how wide to hit (0 = can't)
    var s = W.segs[i - W.base]; if (!s) return null;
    var it = { t: t, x: x, h: h || 0, v: (o && o.v) || 0, b: (o && o.b) || 0 };
    if (o) { if (o.soft) it.soft = true; if (o.txt) it.txt = o.txt; }
    (s.spr || (s.spr = [])).push(it);
    return it;
  }
  var put = putAt;
  function land(s, x) { return !s.gate && !s.tun && !s.brg && !(s.nearOver && Math.abs(x) < 32) && (!s.sea || (x < 0 ? -1 : 1) !== s.sea || Math.abs(x) < s.sh - 2.5); }
  function water(s, x) { return (s.brg && Math.abs(x) > 14) || (s.sea && (x < 0 ? -1 : 1) === s.sea && Math.abs(x) > s.sh + 6); }

  var FERRY = { 'sandbanks>swanage': { k: 'chain', dur: 270, title: 'ALL ABOARD!', sub: 'The chain ferry across to Studland', land: 'STUDLAND', landSub: 'On to Old Harry Rocks' },
    'lymington>needles': { k: 'car', dur: 390, title: 'ALL ABOARD!', sub: 'The car ferry to the Isle of Wight', land: 'ISLE OF WIGHT', landSub: 'Off the ferry at Yarmouth' } };
  function buildStage(W, id) {
    var S = STAGES[id], prev = W.route && W.route.length && W.stretch.length ? STAGES[W.route[W.route.length - 1]].key : null, B = { W: W, S: S, rng: rnd(S.seed), k: 0, sh: S.sea ? 30 : 0, shT: 26, nextSh: 60, bends: [], wallL: 0, wallR: 0 };
    var s0 = W.base + W.segs.length, i, first = !W.stretch.length, rec = { id: id, from: s0, to: 0, fork: null, side: W.pendingSide || 0 };
    W.pendingSide = 0;
    for (i = 0; i < 40; i++) add(B, 0);   // the opening straight with its gate
    var gk = first ? 'start' : id === 0 ? 'round' : 'check';
    segAt(W, s0 + 8).gate = { kind: gk, st: id };
    if (prev && FERRY[prev + '>' + S.key]) segAt(W, s0).ferry = FERRY[prev + '>' + S.key];   // across the water: the ferry first
    put(W, s0 + 8, 'gate', 0, 0, { v: gk === 'start' ? 0 : gk === 'round' ? 1 : 2 });
    if (gk === 'start') segAt(W, s0 + 5).line = true;
    while (B.k < S.len) {
      if (S.hilly > 0.7 && B.wallL <= 0 && B.wallR <= 0 && B.rng() < 0.3) {
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
    var y0 = s0 > W.base ? segAt(W, s0 - 1).y2 : S.band[0] + Math.min(6, (S.band[1] - S.band[0]) / 2), flatTo = (S.next ? rec.fork.a : end) - 30;
    var yEnd = hills(W, S, s0 + 30, flatTo, rnd(S.seed * 3 + 7), y0);
    for (i = s0; i < s0 + 30; i++) { var g = segAt(W, i); g.y1 = g.y2 = y0; g.bank = 0; }
    for (i = flatTo; i < end; i++) { var g2 = segAt(W, i); g2.y1 = g2.y2 = yEnd; g2.bank = 0; g2.crest = false; }
    features(W, S, s0 + 70, flatTo - 40, rnd(S.seed * 5 + 3));
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

  // ---------------------------------------------------------------- what stands by the road (the models are in models3d.js)
  function decorate(W, S, from, to, r) {
    var i, s, k, x, sh, wide = 0, sea = S.sea || 0, landSide = sea ? -sea : 1;
    function both(f) { f(-1); f(1); }
    function put(W2, j, t, xx, h, o) {   // by a fork's wider road, everything stands that much further out (and nothing stands in the road)
      var g = segAt(W2, j);
      if (g.tun) return null;
      if (g.brg) { if (t !== 'lamp') return null; xx = (xx < 0 ? -1 : 1) * (BRG_W + 0.6); h = 0; }
      if (wide) { if (/^(lamp|hut|brolly|board|finger|forestsign|warn|chev|villa|terrace|clock)$/.test(t)) return null; xx += (xx < 0 ? -1 : 1) * wide; }
      return putAt(W2, j, t, xx, h, o);
    }
    function lamps(every, v, onSea) { if (k % every === 0) { if (land(s, -9.8) || (onSea && s.brg)) put(W, i, 'lamp', -9.8, 0.25, { v: v }); if (land(s, 9.8) || (onSea && s.brg)) put(W, i, 'lamp', 9.8, 0.25, { v: v }); } }
    function onWater(t, d0, d1, p, v) { if (r() < p) { x = sea * (sh + d0 + r() * d1); if (water(s, x)) put(W, i, t, x, 0, { v: v }); } }
    function onLand(t, d0, d1, p, h, o) { if (r() < p) { x = landSide * (d0 + r() * d1); if (land(s, x)) put(W, i, t, x, h, o); } }
    function plant(list, xx, h) { var t = list[(r() * list.length) | 0], soft = /^(bush|heather|gorse)$/.test(t); put(W, i, t, xx, soft ? 0.9 : h, { v: soft ? 1 : 0, soft: soft }); }
    function shore(t, p, h, o) { if (sea && r() < p && sh > 20) { x = sea * (12 + r() * (sh - 16)); if (land(s, x)) put(W, i, t, x, h, o); } }
    for (i = from; i < to; i++) {
      s = segAt(W, i); k = i - from; sh = s.sh;
      wide = s.fk ? (s.fk.a ? s.fk.w2 - HALF + 3 : s.fk.o2 + 4) : 0;
      if (k % 140 === 70) { x = (sea || -1) * -13; if (land(s, x)) put(W, i, 'board', x, 1.6, { v: (k / 140) | 0 }); }
      if (s.tun) continue;
      switch (S.key) {
        case 'bournemouth':   // the prom, beach huts, umbrellas and the sea on the left; gardens, palms and hotels on the right
          lamps(9, 2, true);   // the promenade (owner, 6 Oct): sand and sea on the left, the beach huts and the cliff on the right (world3d.js), blue lamps
          if (r() < 0.07 && sh > 20) { x = -(15 + r() * (sh - 18)); if (land(s, x)) put(W, i, 'brolly', x, 0.7, { soft: true, v: (r() * 4) | 0 }); }
          onWater('yacht', 20, 120, 0.03, (r() * 3) | 0);
          break;
        case 'sandbanks':   // the spit: smart white houses and palms on the right, the beach and umbrellas on the left, boats out on the water
          lamps(11, 0, true);   // the houses of Millionaires Row on the right (world3d.js), the harbour behind them; the beach and dunes on the left
          if (r() < 0.06) put(W, i, 'palm', 11 + r() * 5, 0.45, { v: (r() * 3) | 0 });
          if (r() < 0.08 && sh > 20) { x = -(14 + r() * (sh - 16)); if (land(s, x)) put(W, i, 'brolly', x, 0.7, { soft: true, v: (r() * 4) | 0 }); }
          onWater('yacht', 25, 140, 0.05, (r() * 3) | 0);
          break;
        case 'christchurch':   // the harbour on the right: reeds, saltmarsh, swans, boats (world3d.js); the town on the left, the Priory over it
          lamps(10, 0, true);
          if (r() < 0.12) shore('tuft', 1, 0, { v: (r() * 3) | 0 });
          if (r() < 0.06) plant(['oak', 'bush', 'cottage'], -(14 + r() * 24), 0.8);
          onWater('yacht', 15, 100, 0.06, (r() * 3) | 0);
          onWater('buoy', 10, 60, 0.02, (r() * 2) | 0);
          break;
        case 'purbeck':   // Corfe: stone walls, oaks, sheep, cottages, hay and the castle on its hill
          both(function (d) {
            if (r() < 0.07) put(W, i, 'oak', d * (13 + r() * 30), 0.8, { v: 0 });
            if (r() < 0.035) put(W, i, 'bush', d * (11.5 + r() * 12), 0.9, { soft: true, v: 1 });
            if (r() < 0.05) put(W, i, 'sheep', d * (16 + r() * 40), 0, { v: (r() * 2) | 0 });
            if (r() < 0.012) put(W, i, 'hay', d * (13 + r() * 14), 1, { soft: true });
          });
          if (r() < 0.007) { x = (r() < 0.5 ? -1 : 1) * (19 + r() * 10); put(W, i, 'cottage', x, 4, { v: (r() * 2) | 0 }); }
          if (k % 110 === 55) put(W, i, 'finger', (k % 220 ? -1 : 1) * 10.2, 0.2);
          break;
        case 'swanage': {   // in three parts (world3d.js ZONES): Studland's heath and beach off the ferry, the chalk downs past Old Harry, Swanage
          var fz = k / Math.max(1, to - from);
          if (fz < 0.27) { if (r() < 0.05) put(W, i, ['gorse', 'heather'][(r() * 2) | 0], 11.5 + r() * 20, 0.8, { soft: true, v: 1 }); }
          else if (fz < 0.7) {
            if (r() < 0.05) put(W, i, 'gorse', 11.5 + r() * 20, 0.8, { soft: true });
            if (r() < 0.03) { x = -(11.5 + r() * Math.max(2, sh - 14)); if (land(s, x)) put(W, i, 'gorse', x, 0.8, { soft: true }); }
            if (r() < 0.04) put(W, i, 'sheep', 16 + r() * 40, 0, { v: (r() * 2) | 0 });
            onWater('stack', 30, 100, 0.012, (r() * 3) | 0);
          } else lamps(9, 0, true);
          onWater('yacht', 30, 140, 0.015, (r() * 3) | 0);
          break;
        }
        case 'forest':   // the New Forest in autumn: oak, beech, pine and birch, ponies, heather and bracken
          both(function (d) {
            if (r() < 0.28) { var tt = ['oak', 'beech', 'pine', 'birch'][(r() * 4) | 0]; x = d * (12 + Math.pow(r(), 0.8) * 45); put(W, i, tt, x, tt === 'birch' ? 0.4 : 0.7, { v: 1 + ((r() * 2) | 0) }); }
            if (r() < 0.04) put(W, i, 'heather', d * (11 + r() * 16), 0.8, { soft: true, v: (r() * 2) | 0 });
            if (r() < 0.018) put(W, i, 'pony', d * (17 + r() * 30), 0, { v: (r() * 3) | 0 });
          });
          if (r() < 0.006) put(W, i, 'logs', (r() < 0.5 ? -1 : 1) * (12 + r() * 6), 1.3);
          if (k % 230 === 115) put(W, i, 'forestsign', 10.4, 0.3);
          break;
        case 'jurassic':   // Durdle Door at sunset: downs, gorse and rocks; chalk cliffs, a lighthouse and the stone arch out at sea
          if (r() < 0.06) put(W, i, 'gorse', 11.5 + r() * 20, 0.8, { soft: true });
          if (r() < 0.035) { x = -(11.5 + r() * Math.max(2, sh - 14)); if (land(s, x)) put(W, i, 'gorse', x, 0.8, { soft: true }); }
          if (r() < 0.012) { x = (r() < 0.5 ? -1 : 1) * (12 + r() * 12); if (land(s, x)) put(W, i, 'rock', x, 1.1, { v: (r() * 3) | 0 }); }
          if (r() < 0.035) put(W, i, 'sheep', 18 + r() * 45, 0, { v: (r() * 2) | 0 });
          onWater('stack', 25, 120, 0.01, (r() * 3) | 0);
          break;
        case 'weymouth':   // the seafront: a long terrace of painted houses on the right, the beach, the clock tower and sailing boats
          lamps(8, 0, true);
          if (k % 3 === 0 && r() < 0.8) put(W, i, 'terrace', 22 + r() * 3, 0, { v: (k / 3) % 6 });
          if (r() < 0.06 && sh > 20) { x = -(14 + r() * (sh - 16)); if (land(s, x)) put(W, i, 'brolly', x, 0.7, { soft: true, v: (r() * 4) | 0 }); }
          if (r() < 0.04 && sh > 24 && land(s, -12.5)) put(W, i, 'hut', -12.5, 1.3, { v: (r() * 6) | 0 });
          onWater('yacht', 20, 120, 0.06, (r() * 3) | 0);
          break;
        case 'harbour':   // Poole Harbour at night: lamps, lit buildings and palms; the quay, boats and buoys on the right
          lamps(7, 1, true);
          if (r() < 0.05) { x = sh + 40 + r() * 100; if (water(s, x)) put(W, i, 'yacht', x, 0, { v: 3 + ((r() * 3) | 0) }); }   // (the quay's buildings, bollards, kiosks and fishing boats: world3d.js)
          if (r() < 0.02) { x = sh + 36 + r() * 60; if (water(s, x)) put(W, i, 'buoy', x, 0, { v: (r() * 2) | 0 }); }
          break;
        case 'lymington':   // the marina on the right: a forest of masts, the island ferry; brick houses and oaks inland
          lamps(10, 0, true);
          if (r() < 0.16) { x = sh + 6 + r() * 60; if (water(s, x)) put(W, i, 'yacht', x, 0, { v: (r() * 3) | 0 }); }
          if (r() < 0.05) plant(['cottage', 'oak', 'oak'], -(15 + r() * 26), 0.8);
          if (r() < 0.04) put(W, i, 'bush', -(11.5 + r() * 8), 0.9, { soft: true, v: 1 });
          if (r() < 0.1) shore('tuft', 1, 0, { v: (r() * 3) | 0 });
          break;
        case 'lyme':   // Lyme Regis at sunset: grey-blue fossil cliffs, colourful houses climbing the hill, the curving harbour wall
          if (r() < 0.05) put(W, i, 'terrace', 20 + r() * 20, 0, { v: (r() * 6) | 0 });
          if (r() < 0.05) plant(['oak', 'bush'], 13 + r() * 25, 0.8);
          if (r() < 0.02) { x = -(11.5 + r() * Math.max(2, sh - 14)); if (land(s, x)) put(W, i, 'rock', x, 1.1, { v: 0 }); }
          onWater('yacht', 20, 100, 0.03, (r() * 3) | 0);
          break;
        case 'portland':   // Portland Bill at dusk: stone walls, quarry rocks and huts; the red and white lighthouse at the end
          if (r() < 0.025) { x = (r() < 0.5 ? -1 : 1) * (12 + r() * 14); if (land(s, x)) put(W, i, 'rock', x, 1.1, { v: 0 }); }
          if (r() < 0.01) put(W, i, 'cottage', 18 + r() * 20, 4, { v: 0 });
          if (r() < 0.03) put(W, i, 'gorse', 11.5 + r() * 20, 0.8, { soft: true });
          onWater('stack', 30, 100, 0.006, 1);
          break;
        case 'goldencap':   // Golden Cap: green downs falling to golden cliffs, gorse, sheep and a few cottages
          if (r() < 0.05) put(W, i, 'gorse', 11.5 + r() * 20, 0.8, { soft: true });
          if (r() < 0.04) put(W, i, 'sheep', 16 + r() * 45, 0, { v: (r() * 2) | 0 });
          if (r() < 0.02) put(W, i, 'oak', 14 + r() * 30, 0.8, { v: 0 });
          if (r() < 0.008) put(W, i, 'cottage', 20 + r() * 20, 4, { v: 1 });
          onWater('yacht', 30, 140, 0.012, (r() * 3) | 0);
          break;
        case 'hengistbury':   // Hengistbury Head at sunset: the beach huts on the sandbank, heath and gorse, the Long Groyne (world3d.js), the Head at the end
          lamps(7, 1, true);
          if (sh > 18 && k % 3 === 0 && land(s, 12.5)) put(W, i, 'hut', 12.5, 1.3, { v: 6 + (k / 3) % 6 });   // (lit up: at night the head was a dark blank)
          if (r() < 0.05) put(W, i, ['gorse', 'heather'][(r() * 2) | 0], -(11.5 + r() * 20), 0.8, { soft: true, v: 1 });
          if (r() < 0.02) put(W, i, 'pine', -(14 + r() * 30), 0.7, { v: 0 });
          onWater('yacht', 20, 120, 0.03, 3 + ((r() * 3) | 0));
          break;
        case 'needles': {   // the Isle of Wight at dawn in three parts (world3d.js ZONES): Yarmouth off the ferry, across West Wight, Alum Bay and the Needles
          var fn = k / Math.max(1, to - from);
          if (fn < 0.24) lamps(9, 0, true);
          else if (fn < 0.68) { if (r() < 0.035) put(W, i, 'sheep', -(18 + r() * 45), 0, { v: (r() * 2) | 0 }); }
          else {
            if (r() < 0.05) put(W, i, 'gorse', -(11.5 + r() * 20), 0.8, { soft: true });
            if (r() < 0.025) { x = 11.5 + r() * Math.max(2, sh - 14); if (land(s, x)) put(W, i, 'gorse', x, 0.8, { soft: true }); }
            if (r() < 0.012) { x = (r() < 0.5 ? -1 : 1) * (12 + r() * 12); if (land(s, x)) put(W, i, 'rock', x, 1.1, { v: (r() * 3) | 0 }); }
          }
          onWater('yacht', 20, 100, 0.01, (r() * 3) | 0);
          break;
        }
      }
    }
    // the landmarks, each on clear ground (never in a tunnel, on a bridge, at a gate or a fork) near its place in the stretch
    // (Corfe Castle, the Priory and Golden Cap are painted large far off now - world3d.js's hero layer: close up, the models read as floating
    // blocks, a squat block and a red mesa)
    function mark(t, f, xf, v) {
      for (var j = from + Math.round((to - from) * f), n = 0; n < 80; j++, n++) { var g = segAt(W, j); if (!g.tun && !g.brg && !g.gate && !g.fk && !g.over) { putAt(W, j, t, xf(g.sh), 0, { v: v || 0 }); return; } }
    }
    if (S.key === 'bournemouth') {   // the pier from the promenade's edge out to sea (and Boscombe's further on); the cliff lifts and zig-zag paths up the cliff
      var pj = -1, best = 0;   // Bournemouth Pier at the end of a bend AWAY from the sea: as the car comes round it, the pier swings across the view ahead
      for (var q = from + Math.round((to - from) * 0.16); q < from + Math.round((to - from) * 0.5); q++) {
        var kk = 0; for (var u = q - 70; u < q - 10; u++) kk += segAt(W, u).k * -S.sea;
        var g0 = segAt(W, q); if (kk > best && !g0.tun && !g0.brg && !g0.gate && !g0.fk && !g0.over) { best = kk; pj = q; }
      }
      if (best < 60 / 600) pj = -1;
      if (pj >= 0) putAt(W, pj, 'pier', -14.9, 0, { v: 0 }); else mark('pier', 0.24, function () { return -14.9; }, 0);
      mark('pier', 0.74, function () { return -14.9; }, 1);
      mark('clifflift', 0.14, function () { return 17.4; }, 0); mark('clifflift', 0.52, function () { return 17.4; }, 1);
      mark('zigzag', 0.36, function () { return 17.4; }, 0); mark('zigzag', 0.64, function () { return 17.4; }, 1); mark('zigzag', 0.88, function () { return 17.4; }, 2);
    }
    if (S.key === 'sandbanks') {   // a cross-Channel ferry going out through the harbour mouth; at the point, the hotel and the queue for the chain ferry
      mark('ferry', 0.5, function (h) { return -(Math.max(h, 20) + 70); });
      var fa = to; while (fa > from && segAt(W, fa).fk) fa--;
      putAt(W, fa - 30, 'haven', 31, 0, {}); putAt(W, fa - 62, 'ferryqueue', 17.4, 0, {});
    }
    if (S.key === 'swanage') { mark('needles', 0.33, function (h) { return -(Math.max(h, 18) + 80); }); mark('needles', 0.66, function (h) { return -(Math.max(h, 18) + 80); }); }
    if (S.key === 'jurassic') { mark('arch', 0.68, function (h) { return -(Math.max(h, 18) + 70); }); }   // (no lighthouse: there's none at Durdle Door)
    if (S.key === 'weymouth') { mark('clock', 0.4, function (h) { return -(Math.min(h, 22) - 4); }); }
    if (S.key === 'swanage') {   // the toll booths just off the ferry, the boardwalk to the lake on the heath, and at Swanage its pier and the clock
      // tower (Old Harry itself is the place's landmark painting: as a 3D model from the road it read as a grey box)
      mark('tollbooth', 0.04, function () { return 11.8; }); mark('tollbooth', 0.045, function () { return -11.8; });
      mark('littlesea', 0.15, function () { return 15.2; });
      mark('pier', 0.76, function () { return -14.9; }, 2); mark('clocktower', 0.735, function () { return -12.6; });   // (before the fork's banner, which would hide them)
    }
    if (S.key === 'christchurch') {   // the quay: the bandstand on the bank, rowing boats for hire, the old mill; the castle keep's ruin in the town
      mark('bandstand', 0.42, function (h) { return Math.max(14, h - 5.5); }); mark('rowboats', 0.445, function (h) { return h + 6; });
      mark('placemill', 0.5, function (h) { return Math.max(18, h - 6); }); mark('castlekeep', 0.62, function () { return -42; });
    }
    if (S.key === 'harbour') { mark('ferry', 0.55, function (h) { return Math.max(h, 16) + 190; }); mark('customhouse', 0.3, function () { return -27; }); }   // (the ferry at the terminal across the water; the old custom house on the quay)
    if (S.key === 'lymington') { mark('ferry', 0.5, function (h) { return Math.max(h, 16) + 60; }); }
    if (S.key === 'lyme') { mark('cobb', 0.32, function (h) { return -(Math.max(h, 18) + 34); }); }   // (earlier and nearer: the critic never saw it)
    if (S.key === 'portland') { mark('lighthouse', 0.84, function (h) { return -(Math.max(h, 18) - 5); }, 1); }
    if (S.key === 'hengistbury') {   // the Head itself; the visitor centre and its cafe, the land train at its stop, the Double Dykes
      mark('headland', 0.7, function (h) { return Math.max(h, 18) + 70; });
      mark('visitorcentre', 0.2, function () { return -26; }); mark('landtrain', 0.215, function () { return -16.4; }); mark('dykes', 0.34, function () { return -15.5; });
    }
    if (S.key === 'needles') {   // Yarmouth's castle by the slipway and its long pier; the Tennyson Monument up on the down; Alum Bay's coloured cliffs,
      // the visitor park, the Old Battery on the clifftop and the Needles off the end
      mark('yarmouthcastle', 0.05, function (h) { return h + 4; }); mark('pier', 0.13, function () { return 14.9; }, 3);
      mark('tennyson', 0.5, function () { return -64; });
      mark('alumcliffs', 0.74, function (h) { return h + 100; }); mark('landmarkpark', 0.78, function () { return -26; });
      mark('oldbattery', 0.9, function (h) { return Math.max(17, h - 12); });
      var nj = -1, nb = 1e9;   // the Needles off the straightest stretch near the end (from a bend, a big offset put a blade on the grass by the road)
      for (var q3 = from + Math.round((to - from) * 0.78); q3 < from + Math.round((to - from) * 0.92); q3++) {
        var b3 = 0; for (var u3 = q3 - 50; u3 < q3 + 30; u3++) b3 += Math.abs(segAt(W, u3).k);
        var g3 = segAt(W, q3); if (b3 < nb && !g3.tun && !g3.brg && !g3.gate && !g3.fk) { nb = b3; nj = q3; }
      }
      if (nj >= 0) putAt(W, nj, 'needles', Math.max(segAt(W, nj).sh, 18) + 4, 0, {});   // (the model's line starts 4 m past the shore and runs out to sea)
    }
  }
  var PW = { magnet: 480, shield: 480, double: 600 };   // how long each bonus lasts (steps; 60 a second)
  function pickups(W, from, to, r) {   // lines of coins, and between them the bonuses: nitro bottles, a magnet, a shield, double points, extra time
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
      var roll = r(), pw = roll < 0.34 ? 'nitro' : roll < 0.4 ? 'magnet' : roll < 0.45 ? 'shield' : roll < 0.5 ? 'double' : roll < 0.55 ? 'time' : null;   // (nitro the commonest bonus by far)
      if (pw) { var sn = segAt(W, i), px = LANES[(r() * 3) | 0]; if (sn && !sn.fk) (sn.coins || (sn.coins = [])).push(pw === 'nitro' ? { x: px, nitro: true, got: 0 } : { x: px, pw: pw, got: 0 }); i += 15; }
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
      boost: 0, bottles: BOTTLES0, nitroT: 0, autoDrift: set.drift !== 'manual', steerHold: 0, field: [], pos: FIELD_N + 1, posT: -999, boosting: false, wasBoost: false, pw: { magnet: 0, shield: 0, double: 0 }, drift: 0, driftT: 0, driftPts: 0, brakeT: 0, brakeHeld: false,
      time: 0, timeUp: false, overT: 0, count: 200, t: 0, score: 0, sAcc: 0,
      stageNo: 1, round: 1, stage: 0, route: [0], cars: [], carN: 1, crash: null,
      combo: 0, comboT: 0, coinRun: 0, coinLast: -99, lineGot: {}, slip: 0, slipOn: false, scrapeT: 0, off: false,
      shake: 0, events: [], fx: [], fxN: 0, pops: [], banner: null, over: false, demo: false, nearN: 0, coinsN: 0, airBest: 0,
      // your passenger's requests, her hearts, how she's feeling (world3d.js animates her), the stretches of this run
      req: null, reqNext: 60 * 7, reqLast: '', reqSide: null, reqDone: null, hearts: 0, runHearts: 0, runAsked: 0, legHearts: 0,
      her: { k: 'idle', side: 0, t: 0 }, voiceT: -999, legs: [], legT0: 0, result: null, passN: 0, rivalT: 60 * 14, rivalN: 0, rivalBeat: 0
    };
    W.rng = rnd(W.seed);
    buildStage(W, 0); nextFork(W, 0);
    W.time = W.D.time * STAGES[0].t;
    W.s = 3 * SEG; W.h = heightAt(W, W.s);
    for (var z = W.s + 320; z < W.s + VIEW; z += W.D.gap * (0.85 + W.rng() * 1.1)) spawnCar(W, z);   // (the road ahead of the grid clear)
    makeField(W);
    return W;
  }
  function bannerOf(W, txt, sub, kind) { W.banner = { txt: txt, sub: sub || '', kind: kind || '', t: W.t }; }
  function pop(W, txt, sub, x, kind) { W.pops.push({ txt: txt, sub: sub || '', x: x || 0, t: W.t, kind: kind || '' }); if (W.pops.length > 6) W.pops.shift(); }
  function fx(W, o) { o.t = W.t; o.n = ++W.fxN; W.fx.push(o); if (W.fx.length > 200) W.fx.shift(); }
  function mood(W, k, side) { W.her = { k: k, side: side || 0, t: W.t }; }
  function voice(W, id, must) {   // something she says (coastrun.js plays it): never on top of the last thing she said
    if (!must && W.t - W.voiceT < 150) return;
    W.voiceT = W.t; W.events.push({ sfx: 'v:' + id });
  }

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

  // ---------------------------------------------------------------- rivals: sports cars as quick as you, to keep up with and get past
  // One at a time. It turns up a way ahead already at speed; if you drop well back it eases off so you can always catch it; right
  // behind you after you've passed, it fights for its place back; stay clear of it and it's beaten (points), and another comes later.
  // THE FIELD (owner, 6 Oct: "cars that race you... start on a race line and all race off"): seven racers start on the grid with
  // you and race the whole run, through whichever fork you take. Near you each is a car on the road; out of sight it's carried
  // along at its own pace. They pace themselves off how far ahead or behind you they are, so there's always someone to catch.
  var FIELD_N = 7, BOTTLES0 = 10, BOTTLE_MAX = 30, NITRO_T = 150, SKILL = [1.04, 1.02, 1.0, 0.99, 0.97, 0.95, 0.93];
  var CSCHEME = [[0, 0, 0, 0, 1, 0, 0], [1, 1, 1, 0, 0, 1, 0], [0, 0, 0, 1, 1, 0, 1], [1, 0, 1, 2, 0, 1, 3], [3, 2, 0, 0, 1, 0, 0]];   // per racer (wedge, lemans, raging, coupe9, barchetta, gtbrit, trident): which of its colours (never more than two red, or two silver/white, on one grid)
  var POS_BONUS = [0, 100000, 60000, 40000, 25000, 15000, 8000, 4000, 0];
  function makeField(W) {
    W.field = [];
    var RT = [8, 9, 12, 10, 14, 11, 13];   // the fastest first: the wedge, the endurance racer, the sharp Italian, the turbo coupe, the open V12, the GT, the grand tourer
    for (var k = 0; k < FIELD_N; k++) W.field.push({ id: k, p: W.s + 70 - k * 8.5, x: k % 2 ? 4.6 : -4.6, v: 0, skill: SKILL[k], t: RT[k], col: CSCHEME[W.seed % CSCHEME.length][k], car: null });   // (a set colour scheme for the field: a mix, never more than two red cars)   // the grid: two columns, the fastest at the front; you at the back in the middle
    W.pos = FIELD_N + 1;
  }
  function racerPace(W, r) {
    var base = VMAX * W.D.rv * r.skill * (1 + 0.03 * Math.min(4, W.round - 1)), gap = r.p - W.s;
    if (gap > 0) return base * (1 - Math.min(0.16, gap / 2600));   // ahead: easing off the further ahead
    if (gap > -60 && r.car && !W.crash) return Math.min(VMAX * 1.03, Math.max(base * 0.97, W.v * 0.995));   // just behind you: hanging on, back past only if you slow
    return base * (1 + Math.min(0.22, -gap / 1400));   // behind: pushing to catch up
  }
  function fieldStep(W) {
    var F = W.fork, i, ahead = 0, lastSeg = lastIndex(W) - 40;
    for (i = 0; i < W.field.length; i++) {
      var r = W.field[i], c = r.car;
      if (c && W.cars.indexOf(c) < 0) c = r.car = null;   // (dropped from the road: carried on out of sight)
      if (c) { r.p = c.s; r.v = c.v; r.x = c.x; c.v0 = racerPace(W, r); if (Math.abs(c.s - W.s) > 340) { W.cars.splice(W.cars.indexOf(c), 1); r.car = null; } }
      else {
        r.v += (racerPace(W, r) - r.v) * 0.02; r.p = Math.min(r.p + r.v * DT, lastSeg * SEG);
        if (Math.abs(r.p - W.s) < 280 && !W.timeUp) {   // near you: on the road
          var si = segIndex(r.p), g = segAt(W, si); if (!g || si > lastSeg || g.gate) continue;
          var b = 0; if (g.fk && g.fk.b) { if (!F || !F.s) continue; b = F.s; }
          var L = null, lanes = W.count > 0 ? [r.x] : W.rng() < 0.5 ? [4.6, 0, -4.6] : [-4.6, 0, 4.6];
          for (var q = 0; q < lanes.length && L === null; q++) { var ok = W.count > 0 || !(Math.abs(r.p - W.s) < 30 && Math.abs(W.x - lanes[q]) < 3.2);   // (the grid: its places are set)
            for (var j = 0; j < W.cars.length && ok && W.count <= 0; j++) { var o = W.cars[j]; if (o.b === b && Math.abs(o.s - r.p) < 30 && Math.abs(o.x - lanes[q]) < 3) ok = false; }
            if (ok) L = lanes[q]; }
          if (L === null) continue;
          r.car = { id: W.carN++, s: r.p, x: L, tx: L, v: r.v, v0: racerPace(W, r), t: r.t, b: b, col: r.col, lc: 30, hitT: -999, passed: r.p < W.s, paid: true, ds: r.p - W.s, spin: 0, rival: true, racer: r.id };
          W.cars.push(r.car);
        }
      }
    }
    for (i = 0; i < W.field.length; i++) if (W.field[i].p > W.s) ahead++;
    var pos = ahead + 1;
    if (pos !== W.pos && W.count <= 0) {
      if (pos < W.pos) {
        var best = pos < (W.bestPos || 99); if (best && !W.crash) { W.score += 2000 * ((W.bestPos || W.pos) - pos); W.events.push({ sfx: 'overtake', x: 0 }); W.bestPos = pos; }
        if (best || W.t - W.posT > 90) { pop(W, pos === 1 ? 'INTO THE LEAD!' : 'UP TO P' + pos, best ? '+' + (2000 * 1).toLocaleString('en-GB') : '', 0, 'gold'); W.posT = W.t; }
        if (pos === 1 && best) { mood(W, 'cheer'); voice(W, 'great'); }
      } else if (W.t - W.posT > 120) { pop(W, 'DOWN TO P' + pos, '', 0, 'nitro'); W.posT = W.t; }
      W.pos = pos;
    }
  }
  function launchField(W) { for (var i = 0; i < W.field.length; i++) { var r = W.field[i]; r.v = 0; if (r.car) r.car.v0 = racerPace(W, r) * (0.92 + i * 0.012); } }
  function rebunch(W) {   // a new round: the field round you again, some ahead, some behind
    var off = [150, 95, 45, -35, -80, -130, 200];
    for (var i = 0; i < W.field.length; i++) { var r = W.field[i]; if (r.car && W.cars.indexOf(r.car) >= 0) W.cars.splice(W.cars.indexOf(r.car), 1); r.car = null; r.p = W.s + off[i]; r.v = W.v; }
  }
  function rivalOf(W) { for (var i = 0; i < W.cars.length; i++) if (W.cars[i].rival) return W.cars[i]; return null; }
  function nextAhead(W) { var best = null; for (var i = 0; i < W.field.length; i++) { var d = W.field[i].p - W.s; if (d > 0 && (best === null || d < best)) best = d; } return best; }   // metres to the racer just ahead
  function nextBehind(W) { var best = null; for (var i = 0; i < W.field.length; i++) { var d = W.s - W.field[i].p; if (d > 0 && (best === null || d < best)) best = d; } return best; }
  function rivals(W) {
    var r = rivalOf(W), i;
    if (!r) {
      if (W.rivalLive) { W.rivalLive = false; W.rivalT = W.t + 60 * 15; }   // it got away (or went down the other road)
      if (W.count > 0 || W.crash || W.timeUp || W.t < W.rivalT || (W.fork && !W.fork.s && segIndex(W.s) > W.fork.a - 160)) return;   // (not just before a fork)
      var z = W.s + 250 + W.rng() * 90, si = segIndex(z); if (si > lastIndex(W) - 40) return;
      var g = segAt(W, si); if (g.gate || g.fk) return;
      var L = LANES[(W.rng() * 3) | 0];
      for (i = 0; i < W.cars.length; i++) { var o = W.cars[i]; if (Math.abs(o.s - z) < 50 && Math.abs(o.x - L) < 3) return; }
      var v = VMAX * W.D.rv * 0.9;
      W.cars.push({ id: W.carN++, s: z, x: L, tx: L, v: v, v0: v, t: W.rivalN % 2 ? 9 : 8, b: 0, col: (W.rng() * 4) | 0, lc: 30, hitT: -999, passed: false, ds: z - W.s, spin: 0, rival: true, behind: 0, paid: false });
      W.rivalN++; W.rivalLive = true;
      W.events.push({ sfx: 'rival' }); pop(W, 'RIVAL AHEAD', 'CATCH IT', 0, 'gold');
      return;
    }
    if (r.spin > 0) return;
    var gap = r.s - W.s, base = VMAX * W.D.rv;
    // ahead of you it paces off your own speed, a touch slower the further back you are (it doesn't slow for the bends; you do),
    // so driving well always reels it in; just past you, it fights back
    var mine = Math.max(base * 0.55, W.v);
    r.v0 = gap > 0 ? Math.min(base, mine * (gap > 300 ? 0.8 : gap > 170 ? 0.88 : gap > 60 ? 0.96 : 0.99)) : gap > -60 ? Math.min(VMAX * 1.04, Math.max(base, W.v * 1.03)) : base * 0.92;
    r.behind = gap < -45 ? r.behind + 1 : 0;
    if (r.behind > 60 * 3 || gap < -105) {   // beaten: it drops away behind you
      W.cars.splice(W.cars.indexOf(r), 1); W.rivalLive = false; W.rivalT = W.t + 60 * 25; W.rivalBeat++;
      if (!W.crash && !W.timeUp) {
        W.score += 10000; pop(W, 'RIVAL BEATEN', '+10,000', 0, 'gold'); W.events.push({ sfx: 'beat' });
        mood(W, 'cheer'); voice(W, 'close');
      }
    }
  }
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
        var d = o.s - c.s; if (d > 0 && d < (c.rival ? 80 : 45) && d < dmin && Math.abs(o.x - c.x) < 3) { dmin = d; ahead = o; }
      }
      if (c.rival && sameRoad(W, c) && W.s > c.s && W.s - c.s < 40 && Math.abs(W.x - c.x) < 3 && W.s - c.s < dmin) { dmin = W.s - c.s; ahead = { s: W.s, x: W.x, v: W.v }; }   // you, just ahead of it
      c.lc--;
      if (ahead) {
        if (c.lc <= 0) {
          var tries = [c.tx - 4.6, c.tx + 4.6].filter(function (L) { return L > -5 && L < 5; });
          if (c.rival && W.rng() < 0.5) tries.reverse();
          for (j = 0; j < tries.length; j++) if (laneFree(W, c, tries[j])) { c.tx = tries[j]; c.lc = c.rival ? 40 : 150; break; }
        }
        if (Math.abs(ahead.x - c.x) < 3 && !c.rival) c.v = Math.min(c.v, ahead.v);
        else if (c.rival && Math.abs(ahead.x - c.x) < 3 && dmin < 34) c.v = dmin < 9 ? Math.min(c.v, ahead.v) : Math.max(Math.min(c.v, ahead.v + (dmin - 9) * 0.6), c.v - 11 * DT);   // a rival boxed in brakes hard but not all at once (no brake-checking you)
        else if (c.rival) c.v += Math.min((c.v0 - c.v) * 0.02, 12 * DT);
      } else c.v += c.rival ? Math.min((c.v0 - c.v) * 0.02, 12 * DT) : (c.v0 - c.v) * 0.01;
      if (sameRoad(W, c)) { var dz = c.s - W.s; if (dz < 0 && dz > -(c.rival ? 12 : 30) && Math.abs(c.x - W.x) < 3) c.v = Math.min(c.v, W.v * 0.95); }
      var g = segAt(W, segIndex(c.s));
      if (g.fk && g.fk.a && Math.abs(c.tx) < 3) c.tx = (c.id % 2 ? 1 : -1) * 6.5;   // in the widening road the middle lane picks a side
      else if (c.lc < -400 && W.rng() < 0.004) { var nl = LANES[(W.rng() * 3) | 0]; if (laneFree(W, c, nl)) { c.tx = nl; c.lc = 120; } }
      c.x += clamp(c.tx - c.x, -(c.rival ? 4.2 : 2.6) * DT, (c.rival ? 4.2 : 2.6) * DT);
      var z0 = c.s; c.s += c.v * DT;
      if (F && c.b === 0 && segIndex(c.s) >= F.split && segIndex(z0) < F.split) {   // this car reaches the split: it takes the road on its side
        c.b = c.x >= 0 ? 1 : -1; c.x -= c.b * OFF0; c.tx = clamp(Math.round(c.x / 4.6) * 4.6, -4.6, 4.6);
      }
    }
    for (i = cars.length - 1; i >= 0; i--) {
      c = cars[i];
      if (c.s < W.s - 120 || c.s > W.s + VIEW + 120 || segIndex(c.s) > lastIndex(W) - 2 || (F && F.s && c.b && c.b !== F.s && segIndex(c.s) >= F.end - 2) || (!F && c.b)) cars.splice(i, 1);
    }
    var want = Math.round(VIEW / (W.D.gap * Math.pow(0.92, Math.min(4, W.round - 1))) * (W.field.length ? 0.72 : 1)), n = 0;   // (the racers fill the road too: less traffic)
    for (i = 0; i < cars.length; i++) if (cars[i].s > W.s) n++;
    if (n < want && W.t % 10 === 0) spawnCar(W, W.s + VIEW * (0.8 + W.rng() * 0.18));
  }

  // ---------------------------------------------------------------- the player
  function roadHalf(g) { return g.fk && g.fk.a ? (g.fk.w1 + g.fk.w2) / 2 : HALF; }
  function edges(W, g) {   // how far the car can go each way: fields, walls, the sea wall, tunnel walls, railings and the barrier in a split
    var F = W.fork, open = g.gate, lo = open || g.sea < 0 ? -26 : -(VERGE - CAR_W), hi = open || g.sea > 0 ? 26 : VERGE - CAR_W;
    if (g.fk && g.fk.a) { var w = roadHalf(g) + VERGE - HALF - CAR_W; lo = g.sea < 0 ? -26 - w : -w; hi = g.sea > 0 ? 26 + w : w; }
    if (g.fk && g.fk.b && F && F.s) { if (F.s > 0) { lo = -(9.2 - CAR_W); if (g.sea <= 0) hi = VERGE - CAR_W; } else { hi = 9.2 - CAR_W; if (g.sea >= 0) lo = -(VERGE - CAR_W); } }
    if (g.sea && g.sh - 1.5 < 26) { if (g.sea < 0) lo = Math.max(lo, -(g.sh - 1.5)); else hi = Math.min(hi, g.sh - 1.5); }
    if (g.wl) lo = Math.max(lo, -(g.wl - CAR_W));
    if (g.wr) hi = Math.min(hi, g.wr - CAR_W);
    if (g.tun) { lo = Math.max(lo, -(TUN_W - CAR_W)); hi = Math.min(hi, TUN_W - CAR_W); }
    if (g.brg) { lo = Math.max(lo, -(BRG_W - CAR_W)); hi = Math.min(hi, BRG_W - CAR_W); }
    return [lo, hi];
  }
  function bendHere(W, g) {   // the bend under the car: the road's own, plus a split road's turn away from the middle
    var k = g.k, F = W.fork;
    if (g.fk && g.fk.b && F && F.s) k += F.s * OFF2;
    return k;
  }
  // a big crash: on Classic and Fast anything solid at speed; on Gentle only flat out (slower knocks just bounce you off)
  function hardHit(W, speed) { return W.D.crash ? speed > 22 : speed > 46; }
  function crash(W, hard, why) {
    if (W.crash) return;
    var tx = clamp(Math.round(W.x / 4.6) * 4.6, -4.6, 4.6);
    W.crash = { t: 0, dur: hard ? 185 : 42, hard: hard, x0: W.x, tx: tx, spin: W.x < 0 ? 1 : -1, why: why || '', v0: W.v };
    W.combo = 0; W.comboT = 0; W.drift = 0; W.boosting = false; W.shake = hard ? 26 : 12;
    W.events.push({ sfx: hard ? 'crash' : 'bump', x: 0 });
    fx(W, { k: hard ? 'crash' : 'bump', x: W.x });
    if (hard) W.events.push({ say: 'Crash!' });
    mood(W, 'scared'); voice(W, hard ? 'crash' : 'bump', hard);
    knock(W);
  }
  function bonus(W, c) {   // a bonus picked up
    var k = c.pw, dx = c.x - W.x;
    if (k === 'time') { if (!W.timeUp) W.time += 5; pop(W, 'EXTRA TIME', '+5 SECONDS', dx, 'time'); }
    else { W.pw[k] = PW[k]; pop(W, k === 'magnet' ? 'COIN MAGNET' : k === 'shield' ? 'SHIELD' : 'DOUBLE POINTS', k === 'double' ? '10 SECONDS' : '8 SECONDS', dx, k); }
    W.score += 500; W.events.push({ sfx: 'power', k: k, x: dx }); fx(W, { k: 'power', x: c.x, pw: k }); mood(W, 'cheer');
  }
  function smash(W, why) {   // shielded: whatever you hit goes flying, and you keep going
    W.v *= 0.94; W.shake = Math.max(W.shake, 9); W.score += 1000;
    W.events.push({ sfx: 'smash', x: 0 }); fx(W, { k: 'smash', x: W.x }); pop(W, 'SMASH!', '+1,000', 0, 'shield');
  }
  function knock(W) { if (W.req && W.req.k === 'clean') endReq(W, false); }   // any knock spoils a "careful" request
  function endDrift(W) {
    if (W.driftT > 0.5) {
      var p = Math.round(W.driftPts / 10) * 10; W.score += p;
      pop(W, 'DRIFT', '+' + p.toLocaleString('en-GB'), W.drift, 'drift'); W.events.push({ sfx: 'driftend' });
      if (W.driftT > 1.2) { mood(W, 'cheer'); if (W.rng() < 0.35) voice(W, 'wow'); }
    }
    W.drift = 0; W.driftT = 0; W.driftPts = 0;
  }
  function cross(W, i) {   // the car's nose passes into segment i
    var g = segAt(W, i), F = W.fork, j;
    if (F && i === F.split && !F.s) {   // the split: whichever side the car is on is the road it takes
      var sx = W.x >= 0 ? 1 : -1, nextId = F.next[sx < 0 ? 0 : 1];
      if (Math.abs(W.x) < CAR_W + 0.8) { if (W.pw.shield > 0) smash(W, 'sign'); else crash(W, hardHit(W, W.v - 3), 'sign'); }
      F.s = sx; W.x -= sx * OFF0; if (W.crash) W.crash.tx = 0;
      W.pendingSide = sx; buildStage(W, nextId); W.route.push(nextId);
      W.events.push({ sfx: 'fork' }); W.events.push({ say: 'You chose ' + STAGES[nextId].name.toLowerCase() });
      bannerOf(W, STAGES[nextId].name, 'Next checkpoint ahead', 'stage');
      if (W.reqSide) {   // she asked for this side (or not)
        var pleased = W.reqSide.side === sx, hs = pleased ? 2 : 0;
        giveHearts(W, hs, pleased ? 'THANK YOU!' : 'OH... OK', 'side');
        mood(W, pleased ? 'cheer' : 'sad'); voice(W, pleased ? 'yay' : 'aww', true);
        W.reqSide = null;
      }
    }
    if (F && F.s && i >= F.end) {   // out of the split: one road again
      W.cars = W.cars.filter(function (c) { return !c.b || c.b === F.s; });
      W.cars.forEach(function (c) { c.b = 0; });
      F = null; nextFork(W, i);
    }
    if (g.ferry && !W.crash && !W.ferry) {
      var fy = g.ferry; W.ferry = { k: fy.k, t: 0, dur: fy.dur, info: fy, th: 0 };
      W.s = i * SEG + 0.5; W.x = 0; W.v = 0; W.psi = W.phi = 0; W.steer = 0; endDrift(W);
      W.cars = W.cars.filter(function (c) { return c.s < W.s - 40 || c.s > W.s + 260; });   // the ramp clear
      bannerOf(W, fy.title, fy.sub, 'stage'); W.events.push({ sfx: 'horn' }); mood(W, 'wave'); voice(W, 'wow', true);
    }
    if (g.gate) gate(W, g.gate);
    if (g.coins && !W.crash) for (j = 0; j < g.coins.length; j++) {
      var c = g.coins[j];
      if (!c.got && Math.abs(W.x - c.x) < (W.pw.magnet > 0 && !c.nitro && !c.pw ? 9.5 : 1.7) && W.h - heightAt(W, W.s) < 2.6) {
        c.got = W.t; c.gx = W.x;
        if (c.pw) bonus(W, c);
        else if (c.nitro) { W.bottles = Math.min(BOTTLE_MAX, W.bottles + 3); W.events.push({ sfx: 'nitro', x: c.x - W.x }); pop(W, 'NITRO', '+3 BOTTLES', c.x - W.x, 'nitro'); fx(W, { k: 'nitro', x: c.x }); W.score += 500; }   // (owner, 6 Oct: three at a time, always plenty)
        else {
          W.coinRun = W.t - W.coinLast < 40 ? W.coinRun + 1 : 1; W.coinLast = W.t; W.coinsN++;
          W.score += 100 * Math.min(W.coinRun, 10); W.boost = Math.min(1, W.boost + 0.125);   // (eight coins: a bottle - one line of coins fills one)
          W.events.push({ sfx: 'coin', n: W.coinRun, x: c.x - W.x }); fx(W, { k: 'coin', x: c.x });
          W.lineGot[c.line] = (W.lineGot[c.line] || 0) + 1;
          if (W.req && W.req.k === 'coins') W.req.have++;
          if (W.lineGot[c.line] === c.of) { W.score += 2500; pop(W, 'PERFECT LINE', '+2,500', c.x - W.x, 'gold'); W.events.push({ sfx: 'line' }); }
        }
      }
    }
    if (g.spr && !W.crash && !W.air) for (j = 0; j < g.spr.length; j++) {
      var p = g.spr[j];
      if (!p.h || p.done) continue;
      if (p.b && !(W.fork && W.fork.s === p.b)) continue;
      if (Math.abs(W.x - p.x) < CAR_W + p.h) {
        if (p.soft) { p.done = W.t; W.v *= 0.84; W.events.push({ sfx: 'bush', x: p.x - W.x }); fx(W, { k: 'leaves', x: p.x, t2: p.t }); W.shake = Math.max(W.shake, 5); knock(W); }
        else if (W.pw.shield > 0) { p.done = W.t; smash(W, p.t); }
        else crash(W, hardHit(W, W.v), p.t);
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
  function endLeg(W) {   // a stretch done: its time and hearts go in the run's list
    W.legs.push({ st: W.stage, t: (W.t - W.legT0) / 60, hearts: W.legHearts });
    W.legT0 = W.t; W.legHearts = 0;
  }
  function gate(W, g) {
    if (g.kind === 'check' || g.kind === 'round') {
      var S = STAGES[g.st], add = Math.round(S.t * W.D.time * Math.max(0.8, Math.pow(0.95, W.round - 1)));
      if (g.kind === 'check') endLeg(W);
      W.stageNo++; W.stage = g.st; W.reqNext = Math.max(W.reqNext, W.t + 60 * 5);
      if (g.kind === 'round') {
        W.route = [0]; W.legs = []; W.legT0 = W.t; W.legHearts = 0; W.runHearts = 0; W.runAsked = 0; W.result = null; rebunch(W); W.bestPos = 99;
        bannerOf(W, 'ROUND ' + W.round, 'Bournemouth again - busier and quicker', 'stage'); W.events.push({ say: 'Round ' + W.round });
      } else {
        W.time += add; bannerOf(W, 'CHECKPOINT', 'EXTENDED TIME +' + add + ' SEC', 'check'); W.events.push({ sfx: 'check' }); W.events.push({ say: 'Checkpoint: ' + add + ' more seconds' });
        mood(W, 'cheer'); voice(W, 'check', true);
      }
    } else if (g.kind === 'goal') {
      endLeg(W);
      var bonus = Math.ceil(W.time) * 1000 * Math.min(W.round, 3), love = W.runHearts * 5000;
      var asked = Math.max(1, W.runAsked * 3), pct = W.runHearts / asked, mark = pct * 70 + Math.min(30, W.time);
      var rank = mark >= 88 ? 'S' : mark >= 72 ? 'A' : mark >= 55 ? 'B' : mark >= 38 ? 'C' : 'D';
      var placeB = POS_BONUS[W.pos] || 0;
      W.result = { t: W.t, route: W.route.slice(), legs: W.legs.slice(), hearts: W.runHearts, of: asked, timeBonus: bonus, love: love, rank: rank, round: W.round, goal: STAGES[g.st].name, pos: W.pos, of2: FIELD_N + 1, posBonus: placeB };
      W.score += bonus + love + placeB; W.round++;
      W.time = W.D.time * STAGES[0].t * Math.max(0.8, Math.pow(0.95, W.round - 1)) + 4;
      bannerOf(W, W.pos === 1 ? 'YOU WIN!' : 'GOAL!', 'FINISHED P' + W.pos + ' OF ' + (FIELD_N + 1) + '  -  TIME BONUS +' + bonus.toLocaleString('en-GB'), 'goal');
      W.events.push({ sfx: 'goal' }); W.events.push({ say: 'Goal! Time bonus ' + bonus + ', love bonus ' + love + ', rank ' + rank });
      fx(W, { k: 'fireworks', x: 0 }); fx(W, { k: 'confetti', x: 0 });
      mood(W, 'wave'); voice(W, 'goal', true);
      if (W.req) { W.req = null; } W.reqSide = null; W.reqNext = W.t + 60 * 12;
    }
  }
  function topSpeed(W) { return VMAX * CARS[W.car].top; }
  var CF = 0.32;   // how hard a bend pushes the car outwards: k * v * v * CF metres a second
  function turnLimit(W, v) { return (0.6 + (W.D.psiTop - 0.6) * Math.pow(Math.min(1, v / VMAX), 0.8)) * CARS[W.car].yaw; }   // the angle a held key turns the car to
  function pushOut(W, k, v) { return k * v * v * CF * (1 - W.D.assist) * (W.drift ? 0.42 : 1) / CARS[W.car].grip; }

  // ---------------------------------------------------------------- your passenger's requests
  // Every so often she asks for something; do it in time for hearts (3 if quick, 2 if not, 1 for half of it). Coming up to
  // a fork she says which way she'd like to go: 2 hearts if you take her road. Hearts score 1,000 each straight away and
  // 5,000 each again at the goal, and the share of hearts you won counts towards the rank.
  function canAsk(W, k) {
    var i = segIndex(W.s), ahead = Math.round(W.v * REQ[k].dur * 0.8 / SEG) + 20, j, n = 0, c;
    if (k === 'drift') { for (j = i + 10; j < i + ahead; j++) if (Math.abs(segAt(W, j).k) >= 1 / 160 && Math.abs(segAt(W, j + 8).k) >= 1 / 160) return true; return false; }
    if (k === 'air') { for (j = i + 15; j < i + ahead; j++) if (segAt(W, j).crest) return true; return false; }
    if (k === 'coins') { for (j = i + 10; j < i + ahead; j++) { c = segAt(W, j).coins; if (c) for (var q = 0; q < c.length; q++) if (!c[q].got && !c[q].nitro && !c[q].pw) n++; } return n >= REQ.coins.goal[W.D.req] + 3; }
    if (k === 'near' || k === 'pass' || k === 'slip') { for (j = 0; j < W.cars.length; j++) { c = W.cars[j]; if (sameRoad(W, c) && c.s > W.s + 20 && c.s < W.s + 600) n++; } return n >= (k === 'slip' ? 1 : k === 'near' ? 3 : 4); }
    return true;
  }
  function startReq(W) {
    var all = Object.keys(REQ).filter(function (k) { return k !== W.reqLast && canAsk(W, k); });
    if (!all.length) { W.reqNext = W.t + 90; return; }
    var k = all[(W.rng() * all.length) | 0], R = REQ[k];
    W.req = { k: k, txt: R.txt, t0: W.t, dur: R.dur * 60, goal: R.goal[W.D.req], have: 0, secs: !!R.secs };
    W.reqLast = k; W.runAsked++;
    mood(W, 'ask'); voice(W, k, true); W.events.push({ sfx: 'ask' }); W.events.push({ say: R.txt });
  }
  function giveHearts(W, n, word, kind) {
    W.hearts += n; W.runHearts += n; W.legHearts += n; W.score += n * 1000;
    W.reqDone = { n: n, word: word, kind: kind || '', t: W.t };
    if (n > 0) { pop(W, word, '+' + (n * 1000).toLocaleString('en-GB'), 0, 'heart'); W.events.push({ sfx: 'heart', n: n }); }
  }
  function endReq(W, ok) {
    var R = W.req; if (!R) return;
    var quick = W.t - R.t0 < R.dur * 0.6, n = ok ? (R.k === 'clean' || quick ? 3 : 2) : (R.have >= R.goal * 0.5 && R.goal > 1 ? 1 : 0);
    giveHearts(W, n, n === 3 ? 'AMAZING!' : n === 2 ? 'LOVELY!' : n === 1 ? 'NOT BAD' : 'OH WELL...', R.k);
    mood(W, n >= 2 ? 'cheer' : 'sad'); voice(W, n === 3 ? 'great' : n === 2 ? 'good' : 'fail', true);
    W.req = null; W.reqNext = W.t + 60 * (6 + W.rng() * 5);
  }
  function requests(W) {
    var i = segIndex(W.s), F = W.fork, R = W.req;
    if (W.timeUp || W.count > 0) return;
    // coming up to a fork, she picks a road
    if (F && !F.s && !W.reqSide && i > F.a - 80 && i < F.a - 10) {
      var side = W.rng() < 0.5 ? -1 : 1;
      W.reqSide = { side: side, t: W.t, name: STAGES[F.next[side < 0 ? 0 : 1]].name };
      mood(W, 'point', side); voice(W, side < 0 ? 'left' : 'right', true); W.events.push({ sfx: 'ask' });
      W.events.push({ say: 'Go ' + (side < 0 ? 'left' : 'right') + '!' });
    }
    if (W.reqSide && W.her.k !== 'point' && W.t - W.her.t > 50) mood(W, 'point', W.reqSide.side);
    if (!R) { if (W.t >= W.reqNext && !W.crash && !(F && !F.s && i > F.a - 130) && !(F && F.s && i < F.end)) startReq(W); return; }
    // the request under way
    if (R.k === 'drift' && W.drift && !W.air) R.have += DT;
    if (R.k === 'speed' && W.v > topSpeed(W) * 0.86 && !W.crash) R.have += DT;
    if (R.k === 'clean') { R.have = (W.t - R.t0) / R.dur; if (W.t - R.t0 >= R.dur) { endReq(W, true); return; } }
    if (R.k !== 'clean' && R.have >= R.goal) { endReq(W, true); return; }
    if (W.t - R.t0 >= R.dur) endReq(W, false);
  }

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
        W.events.push({ sfx: 'go' }); bannerOf(W, 'GO!', 'RACE THEM TO THE COAST', 'go'); mood(W, 'cheer'); voice(W, 'go', true); W.legT0 = W.t; launchField(W);
        if (inp.fire || inp.alt) { W.v = top * 0.32; W.bottles = Math.min(BOTTLE_MAX, W.bottles + 1); W.score += 5000; pop(W, 'FLYING START', '+5,000 +1 NITRO', 0, 'gold'); W.events.push({ sfx: 'perfect' }); }
      }
      W.rev = (inp.fire || inp.alt || inp.up) ? Math.min(1, (W.rev || 0) + 0.05) : Math.max(0, (W.rev || 0) - 0.03);
      W.h = heightAt(W, W.s);
      if (W.t === 2) fieldStep(W);   // (the grid on the road)
      for (var fi = 0; fi < W.field.length; fi++) if (W.field[fi].car) { W.field[fi].car.v = 0; W.field[fi].car.v0 = 0; }
      moveTraffic(W);
      return;
    }
    if (W.ferry) {
      var Fy = W.ferry; Fy.t++; W.v = 0; W.steer *= 0.8; W.h = heightAt(W, W.s); W.legT0++;
      if (Fy.t === Fy.dur - 50) W.events.push({ sfx: 'horn' });
      if (Fy.t >= Fy.dur) { W.ferry = null; W.v = 15; bannerOf(W, Fy.info.land, Fy.info.landSub, 'stage'); mood(W, 'cheer'); W.reqNext = Math.max(W.reqNext, W.t + 60 * 3); }
      return;
    }
    var score0 = W.score;
    for (var pk in W.pw) if (W.pw[pk] > 0 && --W.pw[pk] === 0) W.events.push({ sfx: 'powerEnd', k: pk });
    if (!W.timeUp) {
      var before = Math.ceil(W.time);
      W.time -= DT;
      if (W.time <= 0) { W.time = 0; W.timeUp = true; W.events.push({ sfx: 'timeup' }); W.events.push({ say: 'Time up' }); bannerOf(W, 'TIME UP', '', 'red'); endDrift(W); mood(W, 'sad'); voice(W, 'timeup', true); W.req = null; W.reqSide = null; }
      else if (Math.ceil(W.time) < before && before <= 11) { W.events.push({ sfx: 'tick', n: before - 1 }); if (before === 11) voice(W, 'hurry', true); }
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
    W.steerHold = target !== 0 && target === W.steerDir ? W.steerHold + 1 : 0; W.steerDir = target;
    var autoGo = W.autoDrift && W.steerHold >= 12 && W.v > top * 0.55 && target * bendHere(W, g) >= 1 / 170;
    if (!W.drift && !out && !W.air && target !== 0 && W.v > top * 0.42 && (pressed || (brake && W.brakeT < 0.3) || autoGo)) {
      W.drift = target; W.driftT = 0; W.driftPts = 0; W.events.push({ sfx: 'skid' });
      W.psi += target * 0.18;   // the back steps out
    }
    if (W.drift && (W.v < top * 0.3 || out || target !== W.drift)) endDrift(W);   // let go (or turn the other way) to straighten up
    if (W.nitroT > 0) W.nitroT--;
    if (wantBoost && W.nitroT <= 0 && W.bottles > 0) { W.bottles--; W.nitroT = NITRO_T; W.events.push({ sfx: 'boost' }); }
    W.boosting = !W.timeUp && !out && W.nitroT > 0;
    W.wasBoost = W.boosting;

    // ---- speed
    var hz = top * (W.boosting ? 1.4 : 1) * (W.slipOn ? 1.04 : 1);
    var v = W.v, accel = 16 * C.acc * Math.max(0, 1 - Math.pow(v / hz, 1.6)) + (W.boosting ? 15 : 0);
    if (out) v *= W.crash.hard ? (W.crash.t < W.crash.dur * 0.6 ? 0.986 : 0.9) : 0.9;
    else if (W.drift) v -= (2.5 + (brake ? 2 : 0)) * DT;
    else if (brake) v -= 26 * DT;
    else if (gas || W.boosting) v += accel * DT;
    else v -= (3 + 0.0006 * v * v) * DT;
    if (!W.air) v -= GRAV * 0.35 * gradeAt(W, W.s) * DT;   // uphill slows you a little, downhill helps
    var wasOff = W.off;
    W.off = !W.air && Math.abs(W.x) > roadHalf(g) + RUMBLE;
    if (W.off) { var offTop = top * D.off; if (v > offTop) v = Math.max(offTop, v - 22 * DT); if (!wasOff) knock(W); }
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
    if (out) { var cr = W.crash; cr.t++; if (cr.t > cr.dur * (cr.hard ? 0.88 : 0.55)) { W.x += (cr.tx - W.x) * 0.1; W.psi *= 0.85; W.phi *= 0.85; } if (cr.t >= cr.dur) { W.crash = null; W.v = 0; W.x = cr.tx; W.psi = W.phi = 0; W.steer = 0; } }

    // ---- along and across; a bend pushes the car outwards
    W.s += v * Math.cos(W.phi) * DT;
    W.x += (v * Math.sin(W.phi) - (W.air || out ? 0 : pushOut(W, k, v))) * DT;
    var i1 = segIndex(W.s);
    for (var i = i0 + 1; i <= i1; i++) cross(W, i);
    g = segAt(W, i1);
    var e = edges(W, g);
    if (W.x < e[0] || W.x > e[1]) {   // against a wall, a fence, the sea wall, a tunnel wall, a railing or the barrier: scrape along it, turned straight
      var side = W.x < e[0] ? -1 : 1;
      W.x = clamp(W.x, e[0], e[1]);
      if (side * W.phi > 0) { W.phi *= 0.3; W.psi *= 0.5; }
      if (W.v > 6) { W.v *= 0.982; if (W.t - W.scrapeT > 8) { W.scrapeT = W.t; W.events.push({ sfx: 'scrape', x: side }); fx(W, { k: 'sparks', x: W.x + side * CAR_W }); knock(W); } W.shake = Math.max(W.shake, 3); }
      if (W.drift) endDrift(W);
    }

    // ---- up and down: over a sharp crest the road falls away faster than the car can follow, and it flies
    var roadY = heightAt(W, W.s), roadVY = W.v * Math.cos(W.phi) * gradeAt(W, W.s);
    var under = segIndex(W.s), roofed = segAt(W, under).tun || segAt(W, under + 6).tun;   // never take off under (or just before) a tunnel's roof
    if (!W.air) {
      var need = (roadVY - W.vh) / DT;
      if (need < -GRAV && W.v > 20 && !W.crash && !roofed) { W.air = true; W.airT = 0; W.vh = Math.min(W.vh, 7); W.h += W.vh * DT; }
      else { W.h = roadY; W.vh = roadVY; }
    }
    if (W.air) {
      W.vh -= GRAV * 1.5 * DT; W.h += W.vh * DT; W.airT += DT;   // a little heavier in the air: a short, punchy jump
      if (roofed && W.h > roadY + 2.2) { W.h = roadY + 2.2; W.vh = Math.min(W.vh, 0); }   // and if you fly into one, the roof keeps you down
      if (W.h <= roadY) {
        var hit = W.vh - roadVY; W.h = roadY; W.vh = roadVY; W.air = false; W.land = W.t;
        if (W.airT > 0.35) {
          var ap = Math.round(W.airT * 20) * 100; W.score += ap; W.airBest = Math.max(W.airBest, W.airT); pop(W, W.airT > 0.9 ? 'BIG AIR' : 'AIR', '+' + ap.toLocaleString('en-GB'), 0, 'gold');
          if (W.req && W.req.k === 'air') W.req.have = 1;
          mood(W, 'cheer'); if (W.airT > 0.7) voice(W, 'wheee');
        }
        W.events.push({ sfx: 'land', n: Math.min(3, -hit / 6) }); W.shake = Math.max(W.shake, Math.min(14, -hit * 1.2)); fx(W, { k: 'land', x: W.x });
        if (Math.abs(W.psi - W.phi) > 0.5 && !W.drift) W.psi = W.phi + clamp(W.psi - W.phi, -0.3, 0.3);
      }
    }

    // ---- the traffic: bumps, near misses, overtakes and slipstreams
    moveTraffic(W); fieldStep(W);
    out = !!W.crash;
    var slipping = false;
    for (var q = 0; q < W.cars.length; q++) {
      var car = W.cars[q];
      if (!sameRoad(W, car)) { car.ds = car.s - W.s; continue; }
      var V = VEH[car.t], dz = car.s - W.s, dxx = Math.abs(car.x - W.x), hitW = V.w + CAR_W - 0.1, hitL = V.l + CAR_L;
      if (!out && !W.air && Math.abs(dz) < hitL && dxx < hitW && W.t - car.hitT > 30) {
        car.hitT = W.t;
        if (W.pw.shield > 0) { smash(W, 'car'); car.spin = 60; car.x += (car.x >= W.x ? 1 : -1) * 2.5; car.v *= 0.6; }
        else if (W.v >= car.v) {
          var hard = !car.racer && dxx < hitW * 0.7 && (D.crash ? W.v - car.v > 30 : W.v - car.v > 44);   // (a racer: always a bump and a shove, never a wreck)
          if (hard) { crash(W, true, 'car'); W.s = Math.min(W.s, car.s - hitL - 0.5); car.spin = 60; }
          else {
            W.v = car.v * (car.racer != null ? 0.92 : W.diff === 1 ? 0.85 : 0.72); W.s = Math.min(W.s, car.s - hitL - 0.3); if (car.racer != null) { car.tx = car.x + (car.x >= W.x ? 3 : -3); car.lc = 60; }
            W.x += (W.x >= car.x ? 1 : -1) * 0.6; car.x += (car.x > W.x ? 1 : -1) * 0.3;
            W.shake = Math.max(W.shake, 10); W.combo = 0; W.comboT = 0; if (W.drift) endDrift(W);
            W.events.push({ sfx: 'bump', x: car.x - W.x }); fx(W, { k: 'bump', x: (car.x + W.x) / 2 });
            mood(W, 'scared'); voice(W, 'bump'); knock(W);
          }
        } else { W.x += (W.x >= car.x ? 1 : -1) * 0.8; W.events.push({ sfx: 'bump', x: car.x - W.x }); knock(W); }
        dz = car.s - W.s;
      }
      if (car.rival && !out) {   // past the rival (a few metres clear, so side by side doesn't flicker), and back
        if (car.passed && dz > 4) { car.passed = false; if (!car.racer && W.t - (car.popT || -999) > 100) { pop(W, 'RIVAL BACK IN FRONT', '', 0, 'nitro'); car.popT = W.t; } }
        else if (!car.passed && dz < -4) {
          car.passed = true; W.passN++; if (W.req && W.req.k === 'pass') W.req.have++;
          if (!car.paid) { car.paid = true; W.score += 3000; pop(W, 'OVERTAKE!', '+3,000', car.x - W.x, 'gold'); W.events.push({ sfx: 'overtake', x: car.x - W.x }); mood(W, 'cheer'); car.popT = W.t; }
          else if (W.t - (car.popT || -999) > 100) { pop(W, 'OVERTAKE!', '', car.x - W.x, 'gold'); car.popT = W.t; }
        }
      }
      if (!car.rival && !car.passed && car.ds >= 0 && dz < 0) {
        car.passed = true;
        if (!out) { W.passN++; if (W.req && W.req.k === 'pass') W.req.have++; }
        if (dxx < hitW + 2.2 && W.t - car.hitT > 60 && W.v > top * 0.55 && !out) {
          W.combo = W.comboT > 0 ? Math.min(W.combo + 1, 9) : 1; W.comboT = 200; W.nearN++;
          var pts = 500 * W.combo; W.score += pts; W.boost = Math.min(1, W.boost + 0.1);
          W.events.push({ sfx: 'near', x: car.x - W.x, n: W.combo });
          pop(W, W.combo > 1 ? 'NEAR MISS x' + W.combo : 'NEAR MISS', '+' + pts.toLocaleString('en-GB'), car.x - W.x, 'near');
          if (W.req && W.req.k === 'near') W.req.have++;
          if (W.her.k !== 'point') mood(W, W.rng() < 0.5 ? 'cheer' : 'scared');
          if (W.rng() < 0.25) voice(W, 'close');
        }
      }
      car.ds = dz;
      if (dz > 6 && dz < 45 && dxx < 1.4 && W.v > top * 0.5) slipping = true;
    }
    W.slip = slipping ? W.slip + DT : Math.max(0, W.slip - DT * 2);
    var on = W.slip > 0.6;
    if (on) W.boost = Math.min(1, W.boost + 0.16 * DT);
    if (on && !W.slipOn) { W.events.push({ sfx: 'slip' }); pop(W, 'SLIPSTREAM', 'BOOST FILLING', 0, 'slip'); if (W.req && W.req.k === 'slip') W.req.have = 1; }
    W.slipOn = on;

    // ---- drifting fills the boost and scores by speed and angle; points for speed
    if (W.drift) {
      var ang = Math.abs(W.psi - W.phi);
      W.driftT += DT; W.driftPts += W.v / VMAX * ang * 70; W.boost = Math.min(1, W.boost + ang * 0.75 * DT);
      if (W.t % 3 === 0) fx(W, { k: 'smoke', x: W.x, d: W.drift });
    }
    if (W.off && W.v > 10 && W.t % 4 === 0) fx(W, { k: 'dust', x: W.x });
    if (W.boost >= 1 && W.bottles < BOTTLE_MAX) { W.boost -= 1; W.bottles++; pop(W, '+1 NITRO', 'A BOTTLE FILLED', 0, 'nitro'); W.events.push({ sfx: 'nitro', x: 0 }); }   // the meter full: another bottle
    else if (W.bottles >= BOTTLE_MAX) W.boost = Math.min(W.boost, 0.99);
    if (!W.timeUp && !out) { var p2 = W.v / VMAX; W.sAcc += p2 * p2 * 32 * (W.boosting ? 1.5 : 1); var whole = Math.floor(W.sAcc); W.score += whole; W.sAcc -= whole; }
    requests(W);
    if (W.her.k !== 'idle' && W.her.k !== 'point' && W.t - W.her.t > (W.her.k === 'ask' ? 70 : W.her.k === 'wave' ? 240 : 110)) mood(W, 'idle');

    if (W.timeUp && W.v < 1.5) { if (++W.overT > 70) W.over = true; }
    if (W.t % 60 === 0) { var drop = i1 - 80 - W.base; if (drop > 300) { W.segs.splice(0, drop); W.base += drop; } }
    if (W.pw.double > 0 && W.score > score0) W.score += W.score - score0;
  }

  // ---------------------------------------------------------------- a driver for the title screen and the tests
  function autopilot(W, side) {
    var inp = { left: false, right: false, up: true, down: false, fire: false, alt: false };
    if (W.count > 0) { inp.fire = W.count < 8; return inp; }
    var i = segIndex(W.s), F = W.fork, top = topSpeed(W), target = 0, k, c, j;
    if (F && !F.s && i > F.a - 60) target = (side || (W.reqSide ? W.reqSide.side : W.route.length % 2 ? 1 : -1)) * 6.5;
    else {   // stay in lane, or move one lane over to the one with the most room ahead; boxed in, brake
      var cur = W.botLane == null ? 1 : W.botLane, best = -1e9, room = 1e9, close = 0, pickK = cur;
      for (k = Math.max(0, cur - 1); k <= Math.min(2, cur + 1); k++) {
        var L = LANES[k], free = 400, cl = 0, lo = Math.min(W.x, L) - 2.6, hi = Math.max(W.x, L) + 2.6;
        for (j = 0; j < W.cars.length; j++) {
          c = W.cars[j]; if (!sameRoad(W, c)) continue;
          var dz = c.s - W.s, closing = Math.max(0, W.v - c.v);
          if (k !== cur && dz > -10 && dz < 12 + closing * 0.6 && c.x > lo && c.x < hi) free = -1;
          else if (dz > (k === cur ? 0.5 : -6) && dz < free && Math.abs(c.x - L) < 2.8) { free = dz; cl = closing; }   // (in its own lane, only what's ahead: a racer sitting behind it once held it stopped)
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
    inp.fire = W.bottles > 0 && W.nitroT <= 0 && maxK < 1 / 260 && W.v > top * 0.6 && !(W.botBrake > 0);
    if (W.botBrake > 0) { W.botBrake--; inp.down = true; inp.up = false; }
    if (inp.down && !W.drift) { inp.left = false; inp.right = false; }   // the driver brakes in a straight line, so it never drifts by accident
    return inp;
  }

  function hud(W) { return { score: W.score, lives: 1, wave: W.stageNo }; }
  function mph(W) { return Math.round(W.v * 2.237); }

  return {
    nextAhead: nextAhead, nextBehind: nextBehind, SEG: SEG, HALF: HALF, RUMBLE: RUMBLE, VERGE: VERGE, FIELD_N: FIELD_N, BOTTLE_MAX: BOTTLE_MAX, NITRO_T: NITRO_T, VMAX: VMAX, VIEW: VIEW, CAR_W: CAR_W, CAR_L: CAR_L, LANES: LANES, FA: FA, FB: FB, OFF0: OFF0, OFF_END: OFF_END, OFF2: OFF2,
    LEVELS: LEVELS, TUN_W: TUN_W, BRG_W: BRG_W, PW: PW,
    STAGES: STAGES, VEH: VEH, CARS: CARS, DIFF: DIFF, REQ: REQ, rivalOf: rivalOf,
    newWorld: newWorld, step: step, hud: hud, mph: mph, autopilot: autopilot, peek: peek, topSpeed: topSpeed, buildStage: buildStage,
    segAt: segAt, segIndex: segIndex, lastIndex: lastIndex, heightAt: heightAt, forkOff: forkOff, edges: edges, roadHalf: roadHalf, bendHere: bendHere, rnd: rnd
  };
});
