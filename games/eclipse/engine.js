/* 365 Eclipse - the rules (4 Oct 2026). Our own vertical-scrolling shooter (owner: "a hybrid ... along the lines of"
 * Raiden Fighters, Raiden Fighters Jet, Radiant Silvergun and Ikaruga - "ultra amazing graphics ... really addictive").
 * Ideas from the genre, all our own names, art and sounds. No drawing here, so the tests run it in node.
 * 60 steps a second; the game's own pixels on a 240 x 320 screen.
 *
 *  Polarity  the ship is LIGHT or DARK (one button switches). Bullets of your own colour are ABSORBED - they fill the
 *            Flare meter; the other colour hurts. Your shots do double damage to enemies of the other colour.
 *  Chains    destroy enemies in threes of one colour: each set of three raises the chain and its bonus (doubling).
 *  Flare     the absorbed energy: the second button releases it as homing lasers (and at 100 it goes by itself);
 *            with too little flare, the second button drops a bomb instead (clears the bullets, hurts everything).
 *  Medals    some enemies drop gold medals: catch them in a row and each is worth more (up to 10,000); miss one and
 *            the value starts again.
 *  Ships     Swift (fast, focused lasers), Striker (all-round, spread gun), Titan (slow, wide shot + homing missiles).
 *            Power items raise the weapon to level 4. Auto-fire is always on.
 *  Stages    COASTLINE (the battleship LEVIATHAN), ORBIT (the ring station HALO), ECLIPSE (twin cores) - a mid-boss in
 *            each, multi-part bosses whose turrets can be shot off first; then round again, quicker.
 * The game reports what happened in world.events (sounds, {say}) and world.fx (where, for the picture). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EclEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var WIDTH = 240, HEIGHT = 320, LIGHT = 0, DARK = 1;
  var DIFF = {
    1: { name: 'Gentle', lives: 5, shield: 3, bspd: 0.62, brate: 0.55, ehp: 0.85, inv: 150, absorb: 1.5 },
    2: { name: 'Classic', lives: 3, shield: 1, bspd: 0.85, brate: 0.85, ehp: 1, inv: 120, absorb: 1 },
    3: { name: 'Fast', lives: 3, shield: 0, bspd: 1.1, brate: 1.15, ehp: 1.15, inv: 110, absorb: 1 }
  };
  var SHIPS = {
    swift: { name: 'Swift', speed: 2.9, weapon: 'laser', bombs: 2 },
    striker: { name: 'Striker', speed: 2.35, weapon: 'vulcan', bombs: 2 },
    titan: { name: 'Titan', speed: 1.85, weapon: 'wide', bombs: 3 }
  };
  var MEDALS = [100, 200, 300, 500, 800, 1000, 2000, 3000, 5000, 8000, 10000];
  var HIT_R = 2.6, ABSORB_R = 11, EXTRA_EVERY = 300000;
  // what each enemy is: hit points, size, points, how it shoots, what it drops
  var TYPES = {
    dart: { hp: 3, r: 7, score: 100, fire: { p: 'aim', every: 95, n: 1, speed: 1.7, start: 35 } },
    swirl: { hp: 2, r: 6, score: 80 },
    wasp: { hp: 5, r: 8, score: 150, fire: { p: 'aim', every: 75, n: 3, spread: 0.3, speed: 1.5, start: 40 } },
    kami: { hp: 4, r: 7, score: 200 },
    turret: { hp: 14, r: 9, score: 500, fire: { p: 'aim', every: 64, n: 1, speed: 1.8, start: 24 }, drop: 'M', ground: true },
    drone: { hp: 12, r: 9, score: 400, fire: { p: 'spiral', every: 7, speed: 1.3, start: 50, on: 110, off: 110 }, drop: 'M' },
    lancer: { hp: 26, r: 11, score: 1200, fire: { p: 'laser', every: 230, start: 70 } },
    carrier: { hp: 34, r: 13, score: 1000, drop: 'PB' },
    gunship: { hp: 70, r: 16, score: 2500, fire: { p: 'ring', every: 85, n: 12, speed: 1.2, start: 60 }, drop: 'PM' },
    midboss: { hp: 340, r: 24, score: 20000, fire: { p: 'mid' }, drop: 'PBM' }
  };

  function rngOf(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fx(W, o) { if (W.fx.length >= 400) W.fx.shift(); W.fx.push(o); }
  function ev(W, o) { W.events.push(o); }
  function say(W, s) { W.events.push({ say: s }); }

  // ---------------------------------------------------------------- the stages: [step, what, settings]
  // what: snake (swirls in a column), vee (darts), swoop (darts from a side), wasps, kami, turrets, drones, lancers,
  // carrier, gunship, midboss, boss. pol 0 light, 1 dark; groups come in threes so they can be chained.
  var STAGES = [
    { name: 'COASTLINE', scroll: 0.55, boss: 'leviathan', script: [
      [60, 'snake', { x: 60, pol: 0 }], [150, 'snake', { x: 180, pol: 1 }], [250, 'vee', { x: 120, pol: 0 }], [340, 'vee', { x: 120, pol: 1 }],
      [430, 'carrier', { x: 120 }], [500, 'snake', { x: 50, pol: 0 }], [500, 'snake', { x: 190, pol: 1 }], [640, 'turrets', { xs: [60, 180], pol: [0, 1] }],
      [720, 'wasps', { pol: 0 }], [800, 'wasps', { pol: 1 }], [900, 'swoop', { side: -1, pol: 1 }], [960, 'swoop', { side: 1, pol: 0 }],
      [1060, 'gunship', { x: 120, pol: 0 }], [1250, 'kami', { pol: 1 }], [1330, 'turrets', { xs: [40, 120, 200], pol: [1, 0, 1] }],
      [1430, 'snake', { x: 80, pol: 1 }], [1430, 'snake', { x: 160, pol: 0 }], [1560, 'midboss', { pol: 1 }],
      [1640, 'vee', { x: 80, pol: 1 }], [1720, 'vee', { x: 160, pol: 0 }], [1820, 'lancers', { xs: [70, 170], pol: [0, 1] }], [1960, 'carrier', { x: 80 }],
      [2020, 'wasps', { pol: 1 }], [2100, 'wasps', { pol: 0 }], [2200, 'drones', { xs: [60, 180], pol: [1, 0] }], [2420, 'turrets', { xs: [40, 100, 140, 200], pol: [0, 1, 0, 1] }],
      [2560, 'snake', { x: 60, pol: 0 }], [2600, 'snake', { x: 120, pol: 1 }], [2640, 'snake', { x: 180, pol: 0 }], [2860, 'boss', {}]
    ] },
    { name: 'ORBIT', scroll: 0.7, boss: 'halo', script: [
      [60, 'vee', { x: 120, pol: 1 }], [140, 'vee', { x: 120, pol: 0 }], [240, 'drones', { xs: [70, 170], pol: [0, 1] }], [420, 'snake', { x: 40, pol: 1 }],
      [420, 'snake', { x: 200, pol: 0 }], [540, 'carrier', { x: 160 }], [600, 'lancers', { xs: [50, 120, 190], pol: [1, 0, 1] }], [780, 'swoop', { side: -1, pol: 0 }],
      [820, 'swoop', { side: 1, pol: 1 }], [940, 'gunship', { x: 80, pol: 1 }], [1000, 'gunship', { x: 160, pol: 0 }], [1240, 'kami', { pol: 0 }],
      [1300, 'kami', { pol: 1 }], [1400, 'wasps', { pol: 0 }], [1460, 'wasps', { pol: 1 }], [1560, 'midboss', { pol: 0 }],
      [1640, 'drones', { xs: [40, 120, 200], pol: [1, 0, 1] }], [1880, 'snake', { x: 60, pol: 0 }], [1920, 'snake', { x: 180, pol: 1 }], [2000, 'carrier', { x: 120 }],
      [2080, 'lancers', { xs: [60, 180], pol: [1, 0] }], [2220, 'vee', { x: 120, pol: 1 }], [2280, 'vee', { x: 120, pol: 0 }], [2400, 'swoop', { side: -1, pol: 1 }],
      [2440, 'swoop', { side: 1, pol: 0 }], [2700, 'boss', {}]
    ] },
    { name: 'ECLIPSE', scroll: 0.85, boss: 'eclipse', script: [
      [60, 'snake', { x: 60, pol: 0 }], [60, 'snake', { x: 180, pol: 1 }], [200, 'wasps', { pol: 1 }], [260, 'wasps', { pol: 0 }],
      [380, 'gunship', { x: 120, pol: 1 }], [560, 'drones', { xs: [50, 190], pol: [0, 1] }], [700, 'carrier', { x: 60 }], [760, 'lancers', { xs: [40, 100, 140, 200], pol: [0, 1, 0, 1] }],
      [940, 'kami', { pol: 1 }], [1000, 'kami', { pol: 0 }], [1100, 'swoop', { side: -1, pol: 0 }], [1100, 'swoop', { side: 1, pol: 1 }],
      [1260, 'gunship', { x: 70, pol: 0 }], [1260, 'gunship', { x: 170, pol: 1 }], [1500, 'midboss', { pol: 1 }], [1580, 'snake', { x: 40, pol: 1 }],
      [1620, 'snake', { x: 120, pol: 0 }], [1660, 'snake', { x: 200, pol: 1 }], [1800, 'drones', { xs: [60, 120, 180], pol: [0, 1, 0] }], [2000, 'carrier', { x: 180 }],
      [2060, 'wasps', { pol: 0 }], [2120, 'wasps', { pol: 1 }], [2240, 'vee', { x: 80, pol: 0 }], [2300, 'vee', { x: 160, pol: 1 }], [2520, 'boss', {}]
    ] }
  ];

  // ---------------------------------------------------------------- a new game
  function newWorld(diff, seed, ship) {
    diff = DIFF[diff] ? diff : 1;
    ship = SHIPS[ship] ? ship : 'striker';
    var d = DIFF[diff], sh = SHIPS[ship];
    var W = {
      diff: diff, d: d, shipId: ship, ship: sh, rng: rngOf(seed == null ? (Date.now() ^ (Math.random() * 1e9)) : seed),
      score: 0, lives: d.lives, frame: 0, events: [], fx: [], over: false, overT: 0, loop: 0, stageIdx: -1, stageNo: 0, nextExtra: EXTRA_EVERY,
      p: { x: WIDTH / 2, y: HEIGHT - 40, pol: LIGHT, inv: 0, shield: d.shield, power: 1, bombs: sh.bombs, flare: 0, dead: 0, fireT: 0, misT: 0, vx: 0, vy: 0, swT: 0 },
      shots: [], enemies: [], bullets: [], items: [], beams: [], homing: [],
      chain: 0, chainPol: -1, chainN: 0, medal: 0, clock: 0, si: 0, scrollY: 0, phase: 'intro', phaseT: 120, boss: null, mid: null,
      bombT: 0, freeze: 0, deaths: 0, stageDeaths: 0, touchAnchor: null, id: 0
    };
    nextStage(W);
    return W;
  }
  function nextStage(W) {
    W.stageIdx++;
    if (W.stageIdx >= STAGES.length) { W.stageIdx = 0; W.loop++; }
    W.stageNo++;
    var S = STAGES[W.stageIdx];
    W.stage = S; W.clock = 0; W.si = 0; W.boss = null; W.mid = null; W.stageDeaths = 0;
    W.enemies = []; W.bullets = []; W.beams = []; W.items = []; W.homing = [];
    W.phase = 'intro'; W.phaseT = 150;
    ev(W, { sfx: 'stage' }); say(W, 'Stage ' + W.stageNo + ': ' + S.name.charAt(0) + S.name.slice(1).toLowerCase());
    fx(W, { k: 'stage', n: W.stageNo, name: S.name, idx: W.stageIdx });
  }
  function speedMul(W) { return W.d.bspd * (1 + 0.15 * W.loop); }
  function rateMul(W) { return W.d.brate * (1 + 0.12 * W.loop); }

  // ---------------------------------------------------------------- spawning
  function spawn(W, type, x, y, pol, mv, extra) {
    var T = TYPES[type], hp = Math.ceil(T.hp * W.d.ehp * (1 + 0.25 * W.loop));
    var e = { id: ++W.id, type: type, x: x, y: y, pol: pol, hp: hp, max: hp, r: T.r, t: 0, mv: mv || { m: 'down', vy: 1 }, fireT: 0, flash: 0, spin: 0, vx: 0, vy: 0 };
    if (extra) for (var k in extra) e[k] = extra[k];
    W.enemies.push(e);
    return e;
  }
  var FORM = {
    snake: function (W, a) { for (var i = 0; i < 6; i++) spawn(W, 'swirl', a.x, -12 - i * 18, a.pol, { m: 'sine', x0: a.x, amp: 34, f: 0.045, vy: 1.15, ph: i * 0.55 }); },
    vee: function (W, a) { var off = [0, -1, 1, -2, 2]; for (var i = 0; i < 5; i++) spawn(W, 'dart', a.x + off[i] * 20, -14 - Math.abs(off[i]) * 14, a.pol, { m: 'swoop', vy: 1.5, turn: 90 + Math.abs(off[i]) * 6, dir: off[i] < 0 ? -1 : off[i] > 0 ? 1 : (W.rng() < 0.5 ? -1 : 1) }); },
    swoop: function (W, a) { for (var i = 0; i < 6; i++) spawn(W, 'dart', a.side < 0 ? -14 - i * 16 : WIDTH + 14 + i * 16, 40 + i * 6, a.pol, { m: 'arc', vx: -a.side * 1.8, vy: 0.2, curl: a.side * 0.012 }); },
    wasps: function (W, a) { for (var i = 0; i < 3; i++) spawn(W, 'wasp', 50 + i * 70, -14 - i * 10, a.pol, { m: 'stop', tx: 50 + i * 70, ty: 50 + (i % 2) * 22, hold: 200, out: i % 2 ? 1 : -1 }); },
    kami: function (W, a) { for (var i = 0; i < 4; i++) spawn(W, 'kami', 30 + W.rng() * 180, -12 - i * 22, a.pol, { m: 'dive', wait: 20 + i * 14 }); },
    turrets: function (W, a) { a.xs.forEach(function (x, i) { spawn(W, 'turret', x, -14, a.pol[i], { m: 'ground' }); }); },
    drones: function (W, a) { a.xs.forEach(function (x, i) { spawn(W, 'drone', x, -14, a.pol[i], { m: 'stop', tx: x, ty: 70 + (i % 2) * 30, hold: 360, out: 1 }); }); },
    lancers: function (W, a) { a.xs.forEach(function (x, i) { spawn(W, 'lancer', x, -16, a.pol[i], { m: 'stop', tx: x, ty: 34 + (i % 2) * 14, hold: 420, out: -1 }); }); },
    carrier: function (W, a) { spawn(W, 'carrier', a.x, -16, W.rng() < 0.5 ? LIGHT : DARK, { m: 'down', vy: 0.45 }); },
    gunship: function (W, a) { spawn(W, 'gunship', a.x, -22, a.pol, { m: 'stop', tx: a.x, ty: 76, hold: 420, out: 1 }); },
    midboss: function (W, a) { W.mid = spawn(W, 'midboss', 120, -30, a.pol, { m: 'stop', tx: 120, ty: 74, hold: 1500, out: -1 }, { sway: true }); ev(W, { sfx: 'warning' }); say(W, 'Watch out - a gunship!'); fx(W, { k: 'warn', text: 'GUNSHIP' }); },
    boss: function (W) { makeBoss(W, W.stage.boss); }
  };

  // ---------------------------------------------------------------- the bosses: parts you can shoot off, and a core
  function makeBoss(W, kind) {
    var mul = W.d.ehp * (1 + 0.3 * W.loop), B = { kind: kind, x: 120, y: -70, t: 0, phase: 1, enter: 160, dead: 0, parts: [], name: '' };
    function part(id, dx, dy, r, hp, pol, fire, core) { B.parts.push({ id: id, dx: dx, dy: dy, r: r, hp: Math.round(hp * mul), max: Math.round(hp * mul), pol: pol, fire: fire, core: !!core, alive: true, fireT: 30 + B.parts.length * 13, flash: 0, x: 0, y: 0, spin: 0 }); }
    if (kind === 'leviathan') {
      B.name = 'LEVIATHAN';
      part('t1', -36, -26, 9, 70, LIGHT, { p: 'aim', n: 3, spread: 0.32, every: 70, speed: 1.6 });
      part('t2', 36, -26, 9, 70, DARK, { p: 'aim', n: 3, spread: 0.32, every: 70, speed: 1.6 });
      part('t3', -36, 22, 9, 70, DARK, { p: 'fan', n: 5, spread: 0.9, every: 90, speed: 1.4 });
      part('t4', 36, 22, 9, 70, LIGHT, { p: 'fan', n: 5, spread: 0.9, every: 90, speed: 1.4 });
      part('core', 0, -6, 15, 520, LIGHT, { p: 'ring', n: 16, every: 120, speed: 1.15 }, true);
    } else if (kind === 'halo') {
      B.name = 'HALO';
      for (var i = 0; i < 6; i++) part('pod' + i, 0, 0, 9, 55, i % 2, { p: 'aim', n: 1, every: 80, speed: 1.7 });
      part('core', 0, 0, 17, 620, LIGHT, { p: 'ring', n: 18, every: 110, speed: 1.1 }, true);
      B.flipT = 300;
    } else {
      B.name = 'ECLIPSE';
      part('sun', 0, 0, 15, 480, LIGHT, { p: 'spiral', every: 6, speed: 1.25 }, true);
      part('moon', 0, 0, 15, 480, DARK, { p: 'aim', n: 5, spread: 0.7, every: 75, speed: 1.6 }, true);
    }
    W.boss = B;
    ev(W, { sfx: 'warning' }); say(W, 'Warning: ' + B.name.charAt(0) + B.name.slice(1).toLowerCase() + ' approaching');
    fx(W, { k: 'warn', text: B.name, boss: true });
  }
  function bossStep(W) {
    var B = W.boss, p = W.p;
    B.t++;
    if (B.dead) {
      if (B.dead % 7 === 0) fx(W, { k: 'boom', x: B.x + (W.rng() - 0.5) * 90, y: B.y + (W.rng() - 0.5) * 60, size: 2 });
      if (--B.dead === 0) { W.boss = null; stageClear(W); }
      return;
    }
    if (B.enter > 0) { B.enter--; B.y += (70 - B.y) * 0.04; }
    else if (B.kind === 'leviathan') { B.x = 120 + Math.sin(B.t / 130) * 34; B.y = 70 + Math.sin(B.t / 90) * 6; }
    else if (B.kind === 'halo') { B.x = 120 + Math.sin(B.t / 160) * 26; B.y = 92 + Math.sin(B.t / 110) * 10; }
    else { B.x = 120 + Math.sin(B.t / 150) * 20; B.y = 96 + Math.cos(B.t / 120) * 10; }
    var coreAlive = B.parts.filter(function (q) { return q.core && q.alive; }), turretsAlive = B.parts.some(function (q) { return !q.core && q.alive; });
    var hurt = coreAlive.some(function (q) { return q.hp < q.max / 2; }) || (B.kind === 'eclipse' && coreAlive.length === 1);
    if (hurt && B.phase === 1) { B.phase = 2; ev(W, { sfx: 'rage' }); say(W, B.name.charAt(0) + B.name.slice(1).toLowerCase() + ' is angry!'); fx(W, { k: 'rage', x: B.x, y: B.y }); }
    // where each part is now
    B.parts.forEach(function (q, i) {
      if (B.kind === 'halo' && !q.core) { var a = B.t * (B.phase === 2 ? 0.022 : 0.012) + i * Math.PI / 3; q.x = B.x + Math.cos(a) * 56; q.y = B.y + Math.sin(a) * 34; }
      else if (B.kind === 'eclipse') { var b = B.t * (B.phase === 2 ? 0.028 : 0.016) + (q.id === 'moon' ? Math.PI : 0); q.x = B.x + Math.cos(b) * 44; q.y = B.y + Math.sin(b) * 22; }
      else { q.x = B.x + q.dx; q.y = B.y + q.dy; }
      if (q.flash) q.flash--;
    });
    if (B.kind === 'halo' && --B.flipT <= 0) {   // the core changes colour now and then
      B.flipT = B.phase === 2 ? 200 : 300;
      var core = B.parts[B.parts.length - 1]; core.pol ^= 1;
      ev(W, { sfx: 'flip' }); fx(W, { k: 'polflip', x: core.x, y: core.y, pol: core.pol });
    }
    if (B.enter > 0) return;
    B.parts.forEach(function (q) {
      if (!q.alive || !q.fire) return;
      var f = q.fire;
      if (q.core && turretsAlive && B.kind === 'leviathan' && B.t % 2) return;   // the bridge fires slowly while guarded
      if (--q.fireT > 0) return;
      var every = f.every / rateMul(W) * (B.phase === 2 ? 0.7 : 1);
      if (f.p === 'spiral') {
        q.fireT = Math.max(3, Math.round(every));
        q.spin += B.phase === 2 ? 0.42 : 0.33;
        for (var k = 0; k < (B.phase === 2 ? 3 : 2); k++) bullet(W, q.x, q.y, q.spin + k * Math.PI * 2 / (B.phase === 2 ? 3 : 2), f.speed, q.pol, 'orb');
      } else {
        q.fireT = Math.round(every * (0.85 + W.rng() * 0.3));
        pattern(W, q.x, q.y, f, q.pol, B.phase === 2);
      }
      if (B.phase === 2 && q.core && B.kind === 'leviathan' && W.rng() < 0.4) addBeam(W, q.x, q.y + 12, q.pol ^ 1);
    });
  }
  function bossPartHit(W, q, dmg, x, y) {
    var B = W.boss;
    if (!q.alive || B.enter > 0 || B.dead) return false;
    var turrets = B.parts.some(function (o) { return !o.core && o.alive; });
    var d = dmg * (q.core && turrets && B.kind !== 'halo' ? 0.5 : 1) * (q.core && turrets && B.kind === 'halo' ? 0.35 : 1);
    q.hp -= d; q.flash = 3;
    if (q.hp <= 0) {
      q.alive = false;
      addScore(W, q.core ? 0 : 5000 * (1 + W.loop));
      ev(W, { sfx: q.core ? 'bigboom' : 'boom', x: q.x });
      fx(W, { k: 'boom', x: q.x, y: q.y, size: q.core ? 3 : 2, pol: q.pol });
      if (!q.core) { fx(W, { k: 'points', x: q.x, y: q.y, pts: 5000 * (1 + W.loop) }); dropItems(W, q.x, q.y, 'M'); }
      if (!B.parts.some(function (o) { return o.core && o.alive; })) bossDown(W);
    }
    return true;
  }
  function bossDown(W) {
    var B = W.boss, bonus = 50000 * (1 + W.loop);
    B.dead = 150; W.bullets = []; W.beams = [];
    addScore(W, bonus); W.freeze = 24;
    ev(W, { sfx: 'bossdie', x: B.x }); say(W, B.name.charAt(0) + B.name.slice(1).toLowerCase() + ' destroyed! +' + bonus);
    fx(W, { k: 'bossdie', x: B.x, y: B.y, pts: bonus });
  }

  // ---------------------------------------------------------------- bullets and patterns
  function bullet(W, x, y, ang, speed, pol, kind) {
    if (W.bullets.length > 700) return;
    var s = speed * speedMul(W);
    W.bullets.push({ x: x, y: y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, pol: pol, kind: kind || 'orb', r: kind === 'big' ? 4.5 : kind === 'needle' ? 2.2 : 3, t: 0 });
  }
  function aimAt(W, x, y) { return Math.atan2(W.p.y - y, W.p.x - x); }
  function pattern(W, x, y, f, pol, angry) {
    var i, a;
    if (f.p === 'aim') { a = aimAt(W, x, y); var n = f.n + (angry ? 2 : 0), sp = (f.spread || 0) + (angry ? 0.2 : 0); for (i = 0; i < n; i++) bullet(W, x, y, a + (n > 1 ? (i / (n - 1) - 0.5) * sp : 0), f.speed, pol, 'needle'); }
    else if (f.p === 'fan') { var m = f.n + (angry ? 2 : 0); for (i = 0; i < m; i++) bullet(W, x, y, Math.PI / 2 + (i / (m - 1) - 0.5) * (f.spread || 1), f.speed, pol, 'orb'); }
    else if (f.p === 'ring') { var k = f.n + (angry ? 6 : 0), off = W.rng() * Math.PI; for (i = 0; i < k; i++) bullet(W, x, y, off + i * Math.PI * 2 / k, f.speed, pol, i % 2 ? 'orb' : 'big'); }
  }
  function addBeam(W, x, y, pol) { W.beams.push({ x: x, y: y, pol: pol, warn: 55, life: 40, w: 7 }); ev(W, { sfx: 'beamwarn', x: x }); }

  // ---------------------------------------------------------------- the player's weapons
  function shoot(W) {
    var p = W.p, lv = p.power, wpn = W.ship.weapon, pol = p.pol;
    function s(x, y, ang, sp, dmg, kind) { W.shots.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, dmg: dmg, pol: pol, kind: kind }); }
    var up = -Math.PI / 2, i;
    if (wpn === 'laser') {
      s(p.x - 4, p.y - 8, up, 9, lv >= 4 ? 3 : 2.4, 'laser'); s(p.x + 4, p.y - 8, up, 9, lv >= 4 ? 3 : 2.4, 'laser');
      if (lv >= 2) s(p.x, p.y - 12, up, 9.5, 2.4, 'laser');
      if (lv >= 3) { s(p.x - 9, p.y - 4, up - 0.08, 9, 1.8, 'laser'); s(p.x + 9, p.y - 4, up + 0.08, 9, 1.8, 'laser'); }
    } else if (wpn === 'vulcan') {
      var n = [3, 5, 7, 7][lv - 1], spread = [0.14, 0.3, 0.46, 0.5][lv - 1];
      for (i = 0; i < n; i++) s(p.x, p.y - 8, up + (i / (n - 1) - 0.5) * spread, 7.5, lv >= 4 ? 1.7 : 1.45, 'vulcan');
    } else {
      var m = lv >= 3 ? 5 : 3;
      for (i = 0; i < m; i++) s(p.x + (i - (m - 1) / 2) * 5, p.y - 6, up + (i / (m - 1) - 0.5) * 0.7, 7, 1.5, 'wide');
    }
    // homing missiles: the Titan from level 2, everyone at level 4
    if ((wpn === 'wide' && lv >= 2) || lv >= 4) {
      if (--p.misT <= 0) {
        p.misT = 20;
        var nm = wpn === 'wide' && lv >= 4 ? 4 : 2;
        for (i = 0; i < nm; i++) W.shots.push({ x: p.x + (i % 2 ? 8 : -8), y: p.y, vx: (i % 2 ? 1.6 : -1.6), vy: -1.2, dmg: 3.2, pol: pol, kind: 'missile', target: 0, life: 120 });
        ev(W, { sfx: 'missile', x: p.x });
      }
    }
  }
  function nearestEnemy(W, x, y) {
    var best = null, bd = 1e9;
    W.enemies.forEach(function (e) { if (e.hp > 0 && e.y > -10) { var d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y); if (d < bd) { bd = d; best = { x: e.x, y: e.y, e: e }; } } });
    if (W.boss && !W.boss.dead && W.boss.enter <= 0) W.boss.parts.forEach(function (q) { if (q.alive) { var d = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y); if (d < bd) { bd = d; best = { x: q.x, y: q.y, q: q }; } } });
    return best;
  }
  function moveShots(W) {
    for (var i = W.shots.length - 1; i >= 0; i--) {
      var s = W.shots[i];
      if (s.kind === 'missile' || s.kind === 'homing') {
        var tg = nearestEnemy(W, s.x, s.y);
        if (tg) { var a = Math.atan2(tg.y - s.y, tg.x - s.x), cur = Math.atan2(s.vy, s.vx), d = Math.atan2(Math.sin(a - cur), Math.cos(a - cur)), turn = s.kind === 'homing' ? 0.16 : 0.09; cur += clamp(d, -turn, turn); var sp = Math.min(s.kind === 'homing' ? 7.5 : 5, Math.hypot(s.vx, s.vy) + 0.25); s.vx = Math.cos(cur) * sp; s.vy = Math.sin(cur) * sp; }
        else s.vy -= 0.2;
        if (--s.life <= 0) { W.shots.splice(i, 1); continue; }
      }
      s.x += s.vx; s.y += s.vy;
      if (s.y < -16 || s.y > HEIGHT + 16 || s.x < -16 || s.x > WIDTH + 16) { W.shots.splice(i, 1); continue; }
      if (shotHits(W, s)) W.shots.splice(i, 1);
    }
  }
  function shotHits(W, s) {
    for (var j = 0; j < W.enemies.length; j++) {
      var e = W.enemies[j]; if (e.hp <= 0 || e.y < -8) continue;
      var dx = e.x - s.x, dy = e.y - s.y, rr = e.r + (s.kind === 'laser' ? 2 : 1);
      if (dx * dx + dy * dy < rr * rr) { damage(W, e, s.dmg * (s.pol !== e.pol ? 2 : 1), s.pol); fx(W, { k: 'hit', x: s.x, y: s.y - 2, pol: s.pol }); return true; }
    }
    var B = W.boss;
    if (B && !B.dead) for (var k = 0; k < B.parts.length; k++) {
      var q = B.parts[k]; if (!q.alive) continue;
      var qx = q.x - s.x, qy = q.y - s.y;
      if (qx * qx + qy * qy < (q.r + 2) * (q.r + 2)) { if (bossPartHit(W, q, s.dmg * (s.pol !== q.pol ? 2 : 1), s.x, s.y)) { fx(W, { k: 'hit', x: s.x, y: s.y - 2, pol: s.pol }); return true; } }
    }
    return false;
  }
  function damage(W, e, dmg, byPol) {
    e.hp -= dmg; e.flash = 3;
    if (e.hp > 0) return;
    var T = TYPES[e.type];
    addScore(W, T.score * (1 + W.loop));
    killChain(W, e.pol);
    ev(W, { sfx: e.r >= 13 ? 'bigboom' : 'boom', x: e.x, size: e.r });
    fx(W, { k: 'boom', x: e.x, y: e.y, size: e.r >= 20 ? 3 : e.r >= 12 ? 2 : 1, pol: e.pol, type: e.type });
    if (T.drop) dropItems(W, e.x, e.y, T.drop);
    if (e === W.mid) { W.mid = null; W.freeze = 10; fx(W, { k: 'points', x: e.x, y: e.y, pts: T.score * (1 + W.loop) }); }
  }
  // chains: kills in threes of one colour
  function killChain(W, pol) {
    if (W.chainN === 0 || pol === W.chainPol) { W.chainPol = pol; W.chainN++; }
    else { if (W.chain > 0) { ev(W, { sfx: 'chainbreak' }); fx(W, { k: 'chainbreak' }); } W.chain = 0; W.chainPol = pol; W.chainN = 1; }
    if (W.chainN === 3) {
      W.chain++; W.chainN = 0;
      var bonus = 100 * Math.pow(2, Math.min(8, W.chain - 1));
      addScore(W, bonus);
      ev(W, { sfx: 'chain', n: W.chain }); fx(W, { k: 'chain', n: W.chain, pts: bonus, pol: pol });
    }
  }
  function dropItems(W, x, y, kinds) {
    for (var i = 0; i < kinds.length; i++) {
      var k = kinds.charAt(i);
      if (k === 'B' && W.rng() < 0.5) continue;
      W.items.push({ x: x + (i - (kinds.length - 1) / 2) * 12, y: y, vy: -1.2, kind: k, t: 0 });
    }
  }

  // ---------------------------------------------------------------- the player
  function movePlayer(W, input) {
    var p = W.p, sp = W.ship.speed, dx = 0, dy = 0;
    if (input.touch && input.tx != null) {   // a finger: the ship moves as the finger moves (it stays visible above it)
      if (!W.touchAnchor) W.touchAnchor = { fx: input.tx, fy: input.ty, sx: p.x, sy: p.y };
      var tx = W.touchAnchor.sx + (input.tx - W.touchAnchor.fx) * 1.25, ty = W.touchAnchor.sy + (input.ty - W.touchAnchor.fy) * 1.25;
      dx = clamp(tx - p.x, -sp * 2.2, sp * 2.2); dy = clamp(ty - p.y, -sp * 2.2, sp * 2.2);
    } else {
      W.touchAnchor = null;
      if (input.mouseX != null && input.mouseY != null) { dx = clamp(input.mouseX - p.x, -sp * 1.7, sp * 1.7); dy = clamp(input.mouseY - p.y, -sp * 1.7, sp * 1.7); if (Math.abs(dx) < 0.3) dx = 0; if (Math.abs(dy) < 0.3) dy = 0; }
      else {
        if (input.left && !input.right) dx = -sp; else if (input.right && !input.left) dx = sp;
        if (input.up && !input.down) dy = -sp; else if (input.down && !input.up) dy = sp;
        if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
      }
    }
    p.x = clamp(p.x + dx, 8, WIDTH - 8); p.y = clamp(p.y + dy, 20, HEIGHT - 12);
    p.vx = dx; p.vy = dy;
  }
  function switchPol(W) {
    var p = W.p;
    if (p.swT > 0) return;
    p.pol ^= 1; p.swT = 8;
    ev(W, { sfx: 'switch', pol: p.pol }); fx(W, { k: 'switch', x: p.x, y: p.y, pol: p.pol });
  }
  function special(W) {   // the second button: release the flare as homing lasers, or a bomb
    var p = W.p;
    if (p.flare >= 25) release(W);
    else if (p.bombs > 0 && W.bombT <= 0) bomb(W);
    else ev(W, { sfx: 'empty' });
  }
  function release(W) {
    var p = W.p, n = Math.min(12, Math.floor(p.flare / 25) * 3);
    p.flare = 0;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (i / Math.max(1, n - 1) - 0.5) * 2.6;
      W.shots.push({ x: p.x, y: p.y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, dmg: 7, pol: p.pol, kind: 'homing', life: 160 });
    }
    ev(W, { sfx: 'release', n: n }); say(W, 'Flare released!'); fx(W, { k: 'release', x: p.x, y: p.y, pol: p.pol, n: n });
  }
  function bomb(W) {
    var p = W.p;
    p.bombs--; W.bombT = 70; p.inv = Math.max(p.inv, 110);
    var cleared = W.bullets.length;
    W.bullets.forEach(function (b) { fx(W, { k: 'pop', x: b.x, y: b.y, pol: b.pol }); });
    addScore(W, cleared * 10);
    W.bullets = []; W.beams = [];
    W.enemies.forEach(function (e) { if (e.y > -6) damage(W, e, 40, p.pol); });
    W.enemies = W.enemies.filter(function (e) { return e.hp > 0; });
    if (W.boss && !W.boss.dead) W.boss.parts.forEach(function (q) { if (q.alive) bossPartHit(W, q, 30, q.x, q.y); });
    ev(W, { sfx: 'bomb' }); fx(W, { k: 'bomb', x: p.x, y: p.y, pol: p.pol });
  }
  function playerHit(W) {
    var p = W.p;
    if (p.inv > 0 || p.dead) return;
    if (p.shield > 0) {
      p.shield--; p.inv = 90; W.bullets = W.bullets.filter(function (b) { return Math.hypot(b.x - p.x, b.y - p.y) > 40; });
      ev(W, { sfx: 'shield' }); say(W, p.shield ? 'Shield hit - ' + p.shield + ' left' : 'Shield gone!'); fx(W, { k: 'shieldhit', x: p.x, y: p.y, left: p.shield });
      return;
    }
    p.dead = 80; W.lives--; W.deaths++; W.stageDeaths++;
    W.chain = 0; W.chainN = 0;
    W.bullets = W.bullets.filter(function (b) { return Math.hypot(b.x - p.x, b.y - p.y) > 70; });
    ev(W, { sfx: 'die', x: p.x }); fx(W, { k: 'die', x: p.x, y: p.y, pol: p.pol });
    // a little of the power is dropped where the ship went down
    if (p.power > 1) W.items.push({ x: p.x, y: p.y, vy: -1.6, kind: 'P', t: 0 });
  }
  function respawn(W) {
    var p = W.p;
    p.x = WIDTH / 2; p.y = HEIGHT - 30; p.inv = W.d.inv; p.power = Math.max(1, p.power - 1); p.bombs = Math.max(p.bombs, W.ship.bombs); p.shield = W.d.shield; p.flare = 0;
    ev(W, { sfx: 'respawn' }); fx(W, { k: 'respawn', x: p.x, y: p.y, pol: p.pol });
  }
  function addScore(W, pts) {
    W.score += pts;
    while (W.score >= W.nextExtra) { W.nextExtra += EXTRA_EVERY; W.lives = Math.min(9, W.lives + 1); ev(W, { sfx: 'extra' }); say(W, 'Extra ship!'); fx(W, { k: 'extra' }); }
  }

  // ---------------------------------------------------------------- the step
  function step(W, input) {
    W.frame++;
    input = input || {};
    if (W.over) return;
    if (W.freeze > 0) { W.freeze--; return; }
    var p = W.p;
    W.scrollY += W.stage.scroll * (W.phase === 'clear' ? 2.2 : 1);
    if (p.swT) p.swT--;
    if (p.inv) p.inv--;
    if (W.bombT) W.bombT--;
    if (p.dead) {
      if (--p.dead === 0) { if (W.lives <= 0) { W.over = true; ev(W, { sfx: 'over' }); return; } respawn(W); }
    } else {
      movePlayer(W, input);
      if (input.tap) switchPol(W);
      if (input.altTap) special(W);
      if (--p.fireT <= 0 && W.phase !== 'clear') { p.fireT = W.ship.weapon === 'laser' ? 4 : 5; shoot(W); }
    }
    if (W.phase === 'intro') { if (--W.phaseT <= 0) W.phase = 'play'; }
    else if (W.phase === 'clear') { if (--W.phaseT <= 0) nextStage(W); }
    // the script runs on, paused while a mid-boss or boss is about
    if (W.phase === 'play' && !W.mid && !W.boss) {
      W.clock++;
      var sc = W.stage.script;
      while (W.si < sc.length && sc[W.si][0] <= W.clock) { var s = sc[W.si++]; FORM[s[1]](W, s[2]); }
    }
    moveEnemies(W);
    if (W.boss) bossStep(W);
    moveShots(W);
    moveBullets(W);
    moveBeams(W);
    moveItems(W);
    W.enemies = W.enemies.filter(function (e) { return e.hp > 0 && !e.gone; });
  }

  function moveEnemies(W) {
    var p = W.p;
    W.enemies.forEach(function (e) {
      e.t++; if (e.flash) e.flash--;
      var m = e.mv, ox = e.x, oy = e.y;
      if (m.m === 'down') { e.y += m.vy; e.x += m.vx || 0; }
      else if (m.m === 'sine') { e.y += m.vy; e.x = m.x0 + Math.sin(e.t * m.f + m.ph) * m.amp; }
      else if (m.m === 'swoop') {
        if (e.t < m.turn) { e.vx = 0; e.vy = m.vy; }
        else { var ang = Math.atan2(e.vy, e.vx) - m.dir * 0.035; e.vx = Math.cos(ang) * 1.9; e.vy = Math.sin(ang) * 1.9; }
        e.x += e.vx; e.y += e.vy;
      } else if (m.m === 'arc') { var a2 = Math.atan2(m.vy, m.vx) + m.curl; var spd = Math.hypot(m.vx, m.vy); m.vx = Math.cos(a2) * spd; m.vy = Math.sin(a2) * spd; e.x += m.vx; e.y += m.vy; }
      else if (m.m === 'stop') {
        if (e.t < 400 && Math.abs(e.y - m.ty) + Math.abs(e.x - m.tx) > 0.5 && !e.held) { e.x += (m.tx - e.x) * 0.05; e.y += (m.ty - e.y) * 0.05; }
        else { e.held = (e.held || 0) + 1; if (e.sway) e.x = m.tx + Math.sin(e.held / 70) * 40; if (e.held > m.hold) { e.y += m.out < 0 ? -1.2 : 1.4; e.leaving = true; } }
      } else if (m.m === 'dive') {
        if (e.t < m.wait) e.y += 0.8;
        else { if (!e.vy) { var a3 = aimAt(W, e.x, e.y); e.vx = Math.cos(a3) * 1.2; e.vy = Math.sin(a3) * 1.2; } e.vx *= 1.035; e.vy *= 1.035; e.x += e.vx; e.y += e.vy; }
      } else if (m.m === 'ground') e.y += W.stage.scroll;
      e.dx = e.x - ox; e.dy = e.y - oy;
      if (e.y > HEIGHT + 30 || e.y < -60 || e.x < -40 || e.x > WIDTH + 40) { if (e.t > 30) { e.gone = true; if (e === W.mid) W.mid = null; } return; }
      // shooting
      var T = TYPES[e.type], f = T.fire;
      if (f && e.y > 4 && e.y < HEIGHT - 60 && !e.leaving && !p.dead) {
        if (e.fireT === 0) e.fireT = Math.round(f.start / rateMul(W) * (0.7 + W.rng() * 0.6));
        if (--e.fireT <= 0) {
          if (f.p === 'spiral') {
            var on = f.on, cyc = (e.t % (f.on + f.off));
            e.fireT = Math.max(3, Math.round(f.every / rateMul(W)));
            if (cyc < on) { e.spin += 0.35; bullet(W, e.x, e.y, e.spin, f.speed, e.pol, 'orb'); bullet(W, e.x, e.y, e.spin + Math.PI, f.speed, e.pol, 'orb'); }
          } else if (f.p === 'laser') { e.fireT = Math.round(f.every / rateMul(W)); addBeam(W, e.x, e.y + 10, e.pol); }
          else if (f.p === 'mid') {
            e.fireT = Math.round(60 / rateMul(W));
            var c = (e.held || 0) % 360;
            if (c < 120) pattern(W, e.x, e.y + 10, { p: 'aim', n: 5, spread: 0.6, speed: 1.6 }, e.pol, false);
            else if (c < 240) pattern(W, e.x, e.y, { p: 'ring', n: 16, speed: 1.1 }, e.pol ^ (W.rng() < 0.5 ? 1 : 0), false);
            else pattern(W, e.x, e.y + 10, { p: 'fan', n: 7, spread: 1.1, speed: 1.4 }, e.pol, false);
          } else { e.fireT = Math.round(f.every / rateMul(W) * (0.8 + W.rng() * 0.4)); pattern(W, e.x, e.y, f, e.pol, false); }
        }
      }
      // ramming the player
      if (!p.dead && p.inv <= 0 && e.type !== 'turret') { var dx = e.x - p.x, dy = e.y - p.y; if (dx * dx + dy * dy < (e.r + HIT_R) * (e.r + HIT_R)) { if (e.type === 'kami' || e.type === 'swirl' || e.type === 'dart') damage(W, e, 99, p.pol); playerHit(W); } }
    });
  }
  function moveBullets(W) {
    var p = W.p, alive = !p.dead;
    for (var i = W.bullets.length - 1; i >= 0; i--) {
      var b = W.bullets[i];
      b.x += b.vx; b.y += b.vy; b.t++;
      if (b.x < -10 || b.x > WIDTH + 10 || b.y < -10 || b.y > HEIGHT + 10) { W.bullets.splice(i, 1); continue; }
      if (!alive) continue;
      var dx = b.x - p.x, dy = b.y - p.y, d2 = dx * dx + dy * dy;
      if (b.pol === p.pol) {   // your own colour: drawn in and absorbed
        if (d2 < ABSORB_R * ABSORB_R) {
          W.bullets.splice(i, 1);
          p.flare = Math.min(100, p.flare + W.d.absorb); addScore(W, 10);
          ev(W, { sfx: 'absorb', pol: b.pol }); fx(W, { k: 'absorb', x: b.x, y: b.y, pol: b.pol });
          if (p.flare >= 100) release(W);
        }
      } else if (d2 < (HIT_R + b.r * 0.6) * (HIT_R + b.r * 0.6)) { W.bullets.splice(i, 1); playerHit(W); if (p.dead) alive = false; }
    }
  }
  function moveBeams(W) {
    var p = W.p;
    for (var i = W.beams.length - 1; i >= 0; i--) {
      var b = W.beams[i];
      if (b.warn > 0) { b.warn--; if (!b.warn) ev(W, { sfx: 'beam', x: b.x }); continue; }
      if (--b.life <= 0) { W.beams.splice(i, 1); continue; }
      if (!p.dead && Math.abs(p.x - b.x) < b.w / 2 + 3 && p.y > b.y) {
        if (b.pol === p.pol) { p.flare = Math.min(100, p.flare + 0.6 * W.d.absorb); if (b.life % 4 === 0) ev(W, { sfx: 'absorb', pol: b.pol }); if (p.flare >= 100) release(W); }
        else playerHit(W);
      }
    }
  }
  function moveItems(W) {
    var p = W.p;
    for (var i = W.items.length - 1; i >= 0; i--) {
      var it = W.items[i];
      it.t++; it.vy = Math.min(1, it.vy + 0.05); it.y += it.vy; it.x += Math.sin(it.t / 12) * 0.3;
      var dx = p.x - it.x, dy = p.y - it.y, d = Math.hypot(dx, dy);
      if (!p.dead && d < 34) { it.x += dx / d * 2.4; it.y += dy / d * 2.4; }   // drawn to the ship when close
      if (!p.dead && d < 10) { W.items.splice(i, 1); pickUp(W, it); continue; }
      if (it.y > HEIGHT + 8) { W.items.splice(i, 1); if (it.kind === 'M') { if (W.medal > 0) { ev(W, { sfx: 'medalmiss' }); fx(W, { k: 'medalmiss' }); } W.medal = 0; } }
    }
  }
  function pickUp(W, it) {
    var p = W.p;
    if (it.kind === 'P') {
      if (p.power < 4) { p.power++; ev(W, { sfx: 'power' }); say(W, p.power === 4 ? 'Full power!' : 'Power up!'); fx(W, { k: 'item', x: it.x, y: it.y, text: p.power === 4 ? 'MAX POWER' : 'POWER UP', kind: 'P' }); }
      else { addScore(W, 2000); ev(W, { sfx: 'medal', n: 5 }); fx(W, { k: 'item', x: it.x, y: it.y, text: '2000', kind: 'P' }); }
    } else if (it.kind === 'B') {
      p.bombs = Math.min(6, p.bombs + 1); ev(W, { sfx: 'power' }); fx(W, { k: 'item', x: it.x, y: it.y, text: 'BOMB', kind: 'B' });
    } else {
      var v = MEDALS[Math.min(MEDALS.length - 1, W.medal)];
      W.medal++; addScore(W, v);
      ev(W, { sfx: 'medal', n: W.medal }); fx(W, { k: 'item', x: it.x, y: it.y, text: String(v), kind: 'M', v: v });
    }
  }
  function stageClear(W) {
    var bonus = 10000 * (1 + W.loop) + (W.stageDeaths === 0 ? 20000 : 0);
    addScore(W, bonus);
    W.phase = 'clear'; W.phaseT = 260; W.items.forEach(function (it) { pickUp(W, it); }); W.items = [];
    ev(W, { sfx: 'clear' }); say(W, 'Stage clear! +' + bonus);
    fx(W, { k: 'clear', n: W.stageNo, pts: bonus, perfect: W.stageDeaths === 0 });
  }

  function hud(W) { return { score: W.score, lives: Math.max(0, W.lives), wave: W.stageNo }; }

  return {
    WIDTH: WIDTH, HEIGHT: HEIGHT, LIGHT: LIGHT, DARK: DARK, DIFF: DIFF, SHIPS: SHIPS, TYPES: TYPES, STAGES: STAGES, MEDALS: MEDALS, HIT_R: HIT_R, ABSORB_R: ABSORB_R,
    newWorld: newWorld, step: step, hud: hud, spawn: spawn, makeBoss: makeBoss, nextStage: nextStage, special: special, killChain: killChain
  };
});
