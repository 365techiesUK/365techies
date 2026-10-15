/* 365 Pinball Hero - the lamps (the coloured inserts set into the playfield), 15 Oct 2026, milestone 2a.
 * Two things for the 3D look (and anything else that wants them):
 *  - PinLamps.list: every insert - where it sits, its shape and colour - worked out FROM THE TABLE DATA (engine.js and
 *    table.js), so if a part moves its lamps move with it. Units are the table's own (x 0-270 left to right, y 0-446 down
 *    the table towards the flippers). rot is in radians, 0 = pointing UP the table (towards smaller y), turning clockwise
 *    as seen from above; w is the insert's width across that direction and h its length along it.
 *  - PinLamps.level(W, t, mode[, out]): how bright each lamp should be right now (0-1, a Float32Array in list order),
 *    from the world alone. It only reads the world. The renderer fades each bulb towards it (real bulbs take a moment
 *    to warm up and cool down), so this can switch hard on and off. t is the clock in milliseconds; mode is the
 *    cabinet's ('title' plays the attract show; 'over', a tilt or the end of the game turn everything off).
 * Plain ES5. In node: require('./lamps.js') (it loads engine.js itself), for tools/pinball/art-lamps.test.cjs. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.PinLamps = factory(root.PinEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';
  if (!E) throw new Error('lamps.js needs engine.js loaded first');
  var T = E.TABLE, M = T.MID, TH = T.H;
  var COL = {   // 365 Invaders' own colours, and a few of ours
    lane: '#ffd84a', skill: '#5cff6b', ramp: '#ff4fc8', orbit: '#3fe0ff', hangar: '#5cff6b', kick: '#ff4a3a',
    save: '#ff3b4a', mult: '#ff9a2e', hero: '#59b4ff', orb: '#ff5cc8', moth: '#3fe0ff', bot: '#ffd84a'
  };
  var list = [];
  function rotOf(dx, dy) { return Math.atan2(dx, -dy); }   // a direction on the table -> rot (0 = up the table)
  function add(o) { o.i = list.length; list.push(o); return o; }
  function sensor(id) { var s = null; T.sensors.circles.forEach(function (c) { if (c[0] === id) s = c; }); return s; }

  // ---------------------------------------------------------------- the top lanes: a lamp under each lane, and a green
  // skill-shot arrow above it (pointing down into the lane)
  var guideTop = 1e9, guideFoot = 0;
  T.walls.forEach(function (w) { if (w[6] === 'post') { guideTop = Math.min(guideTop, w[1], w[3]); guideFoot = Math.max(guideFoot, w[1], w[3]); } });
  [0, 1, 2].forEach(function (i) {
    var s = sensor('lane' + i);
    add({ id: 'lane' + i, group: 'lanes', shape: 'circle', x: s[1], y: guideFoot + 9.5, w: 9, h: 9, rot: 0, color: COL.lane });
  });
  [0, 1, 2].forEach(function (i) {
    var s = sensor('lane' + i);
    add({ id: 'skill' + i, group: 'skill', shape: 'triangle', x: s[1], y: guideTop - 9, w: 9, h: 8, rot: Math.PI, color: COL.skill });
  });

  // ---------------------------------------------------------------- the hangar: a lamp in front of each drop target,
  // then the shot's arrow (pointing into the hangar) with three progress lamps behind it
  var D = E.DROPS, KIND = ['bot', 'moth', 'orb', 'moth', 'bot'], fx = D[0].fx, fy = D[0].fy, toHangar = rotOf(-fx, -fy);
  D.forEach(function (d, i) {
    var cx = (d.ax + d.bx) / 2, cy = (d.ay + d.by) / 2;
    add({ id: 'drop' + i, group: 'drops', shape: 'rect', x: cx + fx * 10, y: cy + fy * 10, w: 9, h: 5, rot: toHangar, color: COL[KIND[i]], kind: KIND[i] });
  });
  var bank = { x: (D[0].ax + D[D.length - 1].bx) / 2, y: (D[0].ay + D[D.length - 1].by) / 2 };
  function shot(id, x, y, dx, dy, color, label, gap) {   // an arrow at (x, y) pointing along (dx, dy), lamps behind it
    var l = Math.sqrt(dx * dx + dy * dy); dx /= l; dy /= l;
    add({ id: id, group: id, shape: 'arrow', x: x, y: y, w: 13, h: 20, rot: rotOf(dx, dy), color: color, label: label });
    for (var k = 0; k < 3; k++) {
      var d = (gap || 16) + k * 9;
      add({ id: id + '.p' + k, group: id, shape: 'circle', x: x - dx * d, y: y - dy * d, w: 6, h: 6, rot: 0, color: color, step: k });
    }
  }
  shot('hangar', bank.x + fx * 33, bank.y + fy * 33, -fx, -fy, COL.hangar, 'HANGAR');

  // ---------------------------------------------------------------- the warp ramp: an arrow under its mouth, pointing up it
  var en = T.ramp.entry, rx = (en.x0 + en.x1) / 2;
  shot('ramp', rx, en.y + 36, 0, -1, COL.ramp, 'WARP RAMP');

  // ---------------------------------------------------------------- the orbits: an arrow at the foot of each, pointing up
  // into its mouth (worked out from the left orbit's inner wall and the one-way gate at its foot, then mirrored)
  var ow = null, og = null;
  T.walls.forEach(function (w) { if (w[0] === w[2] && w[0] > 12 && w[0] < M - 40 && Math.min(w[1], w[3]) < 200) ow = w; });
  T.gates.forEach(function (g) { if (Math.max(g[0], g[2]) < M && Math.min(g[1], g[3]) > 180) og = g; });
  var ox = ow ? ow[0] : 30, oy = ow ? Math.max(ow[1], ow[3]) : 206, gy = og ? Math.min(og[1], og[3]) : oy + 56;
  var mY = (oy + gy) / 2, ax = ox + 17, ay = Math.max(mY + 20, gy - 2), adx = ox - ax, ady = mY - ay;
  shot('orbitL', ax, ay, adx, ady, COL.orbit, 'COMET');
  shot('orbitR', 2 * M - ax, ay, -adx, ady, COL.orbit, 'ORBIT');

  // ---------------------------------------------------------------- the kickback, in the left outlane
  var kick = sensor('kick'), outL = sensor('outL');
  add({ id: 'kick', group: 'kick', shape: 'arrow', x: kick ? kick[1] + 0.5 : 16.5, y: outL ? outL[2] - 30 : 362, w: 10, h: 15, rot: 0, color: COL.kick, label: 'KICKBACK' });

  // ---------------------------------------------------------------- SHOOT AGAIN between the flippers (just below their pivots)
  var F = T.flippers[0];
  add({ id: 'save', group: 'save', shape: 'rect', x: M, y: F.y + 8, w: 27, h: 13, rot: 0, color: COL.save, text: 'SHOOT|AGAIN' });

  // ---------------------------------------------------------------- the H-E-R-O-! letters and the bonus multiplier, in the
  // middle of the table above the slings
  var sl = T.slings[0], heroY = sl.a[1] - 22, multY = sl.a[1] - 3.5;
  ['H', 'E', 'R', 'O', '!'].forEach(function (ch, k) {
    add({ id: 'hero' + k, group: 'hero', shape: 'text', text: ch, x: M + (k - 2) * 15, y: heroY, w: 11, h: 12, rot: 0, color: COL.hero });
  });
  [2, 3, 4, 5].forEach(function (n, k) {
    add({ id: 'mult' + n, group: 'mult', shape: 'rect', text: n + 'X', x: M + (k - 1.5) * 14, y: multY, w: 12, h: 9, rot: 0, color: COL.mult });
  });

  // ---------------------------------------------------------------- the pop bumpers: a lamp in each gap between two of them
  var B = T.bumpers, bc = { x: (B[0][0] + B[1][0] + B[2][0]) / 3, y: (B[0][1] + B[1][1] + B[2][1]) / 3 }, BCOL = ['orb', 'moth', 'bot'];
  [[0, 1], [1, 2], [2, 0]].forEach(function (p, i) {
    var x = (B[p[0]][0] + B[p[1]][0]) / 2, y = (B[p[0]][1] + B[p[1]][1]) / 2, dx = x - bc.x, dy = y - bc.y;
    add({ id: 'bump' + i, group: 'bumpers', shape: 'triangle', x: x, y: y, w: 7, h: 6, rot: rotOf(dx, dy), color: COL[BCOL[i]] });
  });

  // ---------------------------------------------------------------- lookups
  var byId = {}, groups = {};
  list.forEach(function (l) { byId[l.id] = l.i; (groups[l.group] = groups[l.group] || []).push(l.i); });
  var N = list.length;

  // ---------------------------------------------------------------- how bright each lamp should be
  function blink(t, ms) { return Math.floor(t / ms) % 2 === 0 ? 1 : 0; }
  function frac(v) { return v - Math.floor(v); }
  function hash(i, n) { var h = Math.imul(i + 1, 374761393) + Math.imul(n, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  // a shot's arrow and its three progress lamps: off; 'idle' (a slow, dim chase up into the arrow, so the table always
  // shows where the shots are); 'lit' (the arrow blinks and the lamps race in); 'made' (everything flashes)
  function shotLamps(out, id, t, state, count) {
    var a = byId[id], p0 = byId[id + '.p0'];
    if (state === 'made') { var f = blink(t, 70); out[a] = f; out[p0] = out[p0 + 1] = out[p0 + 2] = f; return; }
    if (state === 'lit') {
      out[a] = blink(t, 180) ? 1 : 0.3;
      var q = Math.floor(t / 85) % 5;   // far lamp, middle, near, then two beats on the arrow
      for (var k = 0; k < 3; k++) out[p0 + k] = (count != null ? (2 - k) < count : false) || q === 2 - k ? 1 : 0.12;
      return;
    }
    if (state === 'idle') {
      var r = Math.floor(t / 300) % 6;
      out[a] = r === 3 ? 0.45 : 0.06;
      for (var j = 0; j < 3; j++) out[p0 + j] = r === 2 - j ? 0.35 : 0;
      return;
    }
    out[a] = 0; out[p0] = out[p0 + 1] = out[p0 + 2] = 0;
  }
  function attract(out, t) {
    // a 16-second show: waves sweeping up the table; a sweep from side to side and back; then the shots racing in
    // while the rest sparkles
    var c = t % 16000, i, l;
    if (c < 8000) {
      var front = -0.25 + 1.6 * frac(t / 1300);
      for (i = 0; i < N; i++) { l = list[i]; var d = front - (1 - l.y / TH); out[i] = d >= 0 && d < 0.3 ? 1 - d / 0.3 : 0; }
    } else if (c < 11000) {
      var s = (c - 8000) / 1500, fxp = s < 1 ? s : 2 - s, sx = -0.2 + 1.4 * fxp;
      for (i = 0; i < N; i++) { l = list[i]; var e = Math.abs(sx - l.x / T.W); out[i] = e < 0.14 ? 1 - e / 0.14 : 0; }
    } else {
      var tick = Math.floor(t / 110);
      for (i = 0; i < N; i++) out[i] = hash(i, tick) > 0.8 ? 0.9 : 0.05;
      ['hangar', 'ramp', 'orbitL', 'orbitR'].forEach(function (id) { shotLamps(out, id, t, 'lit'); });
      groups.hero.forEach(function (k, n) { out[k] = Math.floor(t / 160) % 6 === n ? 1 : 0.2; });
    }
  }
  function level(W, t, mode, out) {
    out = out || new Float32Array(N);
    var i;
    t = t || 0;
    if (mode === 'title') { attract(out, t); return out; }
    for (i = 0; i < N; i++) out[i] = 0;
    if (!W || mode === 'over' || W.over || W.tilted) return out;
    var lit = W.lit || {};
    // the top lanes and the skill shot
    for (i = 0; i < 3; i++) {
      var ln = byId['lane' + i];
      if (lit.lane && lit.lane[i] > 0) out[ln] = blink(t, 70);
      else if (W.lanes && W.lanes[i]) out[ln] = 1;
      if (W.skillOpen && W.skill === i) out[byId['skill' + i]] = blink(t, 160);
    }
    // the drop targets: a target that's down lights its lamp; one just hit flashes
    for (i = 0; i < 5; i++) {
      var dl = byId['drop' + i];
      if (lit.drop && lit.drop[i] > 0) out[dl] = blink(t, 60);
      else if (W.drops && !W.drops[i]) out[dl] = 1;
    }
    // the four shots
    shotLamps(out, 'hangar', t, lit.saucer > 0 ? 'made' : W.saucerLit ? 'lit' : 'idle');
    shotLamps(out, 'ramp', t, lit.ramp > 0 ? 'made' : W.comboT > 0 ? 'lit' : 'idle', W.comboT > 0 ? W.combo : null);
    var loop = !!W.orbitFrom;
    shotLamps(out, 'orbitL', t, lit.orbitL > 0 ? 'made' : loop ? 'lit' : 'idle');
    shotLamps(out, 'orbitR', t, lit.orbitR > 0 ? 'made' : loop ? 'lit' : 'idle');
    // kickback, ball save, the bonus multiplier
    if (lit.kick > 0) out[byId.kick] = blink(t, 80); else if (W.kickback) out[byId.kick] = 1;
    if (W.saveT > 150) out[byId.save] = 1; else if (W.saveT > 0) out[byId.save] = blink(t, 110);
    for (i = 2; i <= 5; i++) if (W.mult >= i) out[byId['mult' + i]] = 1;
    // H-E-R-O-!: unlit until the missions come (milestone 3)
    // the bumper lamps: a soft glow that wanders round the three, full on a hit
    for (i = 0; i < 3; i++) {
      var bl = byId['bump' + i], hit = lit.bump && (lit.bump[i] > 0 || lit.bump[(i + 1) % 3] > 0);
      out[bl] = hit ? 1 : (Math.floor(t / 420) + i) % 3 === 0 ? 0.35 : 0.1;
    }
    return out;
  }

  return { list: list, level: level, byId: byId, groups: groups, colors: COL, version: 1 };
});
