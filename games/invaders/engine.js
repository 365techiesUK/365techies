/* 365 Invaders - the rules (3 Oct 2026; Enhanced added the same evening; the REBOOT's new play 9 Oct 2026). Our own game
 * in the style of the 1978 arcade classics: our own names, pixel art and sounds. No drawing here, so the tests run it in
 * node (engine.test.mjs, engine-enh.test.mjs). 60 steps a second; sizes in the game's own pixels on a 224 x 256 screen.
 *
 * Both styles: a formation of 5 rows of 11 invaders that ripples sideways one invader at a time (so it speeds up as it
 * thins out), drops at the edges and fires bombs; four shields that wear away pixel by pixel; a mystery ship across the
 * top; waves start a little lower each time.
 * Classic ('classic', the default here): exactly that - one shot at a time, one extra life at 1,500.
 * Enhanced ('enh', the page's default): the same game plus falling power-up capsules (rapid fire, spread shot, a shield
 * bubble, a LASER beam, SLOW TIME), a combo multiplier for hitting without missing (up to x4), a bonus for a wave cleared
 * without losing a ship, an extra life every 5,000 after the first - and, since the reboot:
 *   - DIVERS (from wave 2): invaders peel off the formation in a loop, dive at the ship dropping bombs, and fly back to
 *     their place if they miss; worth double; one that flies into the ship costs a life (unless the shield is up);
 *   - ARMOURED invaders (from wave 2; more rows later): the first hit knocks the armour off;
 *   - SPLITTERS (from wave 3): a few invaders burst into two small fast ones that home in on the ship;
 *   - the MOTHERSHIP every 5th wave, in three stages: two gun turrets shield the core and fire at you; with both blown off
 *     the core is open and sends down little ones; weakened, it turns angry - faster, with wider fans of plasma.
 * The game reports what happened in world.events (sounds and {say}) for the arcade cabinet, and in world.fx (where
 * things happened, for explosions and the like) for the Enhanced pictures (flat and 3D). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.InvEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var WIDTH = 224, HEIGHT = 256, PY = 216, GROUND = 239, ROWS = 5, COLS = 11, CELL_X = 16, CELL_Y = 16;
  var LEFT = 8, RIGHT = 216, SAUCER_Y = 26, EXTRA_AT = 1500, EXTRA_EVERY = 5000, BOSS_EVERY = 5;
  // the three speeds: 1 Gentle (slower, 5 lives), 2 Classic (the old arcade pace), 3 Fast
  var SPEEDS = {
    1: { name: 'Gentle', lives: 5, rate: 0.6, ship: 1.5, bomb: 1.0, bombs: 2, reload: 80, saucer: 0.6, cap: 0.10, power: 900, bossHp: 24, bossSpeed: 0.45, bossFire: 120, dive: 1.15, diveEvery: 270 },
    2: { name: 'Classic', lives: 3, rate: 1.0, ship: 1.0, bomb: 1.25, bombs: 3, reload: 50, saucer: 0.75, cap: 0.07, power: 660, bossHp: 34, bossSpeed: 0.6, bossFire: 90, dive: 1.45, diveEvery: 210 },
    3: { name: 'Fast', lives: 3, rate: 1.4, ship: 1.5, bomb: 1.6, bombs: 3, reload: 34, saucer: 1.0, cap: 0.06, power: 540, bossHp: 44, bossSpeed: 0.8, bossFire: 70, dive: 1.8, diveEvery: 160 }
  };
  // the reboot's new play, per speed - balanced by the playtest farm (9 Oct 2026: thousands of bot games against the
  // live game; Gentle ~1.5x as hard for a beginner or a steady player, Classic ~2x, Fast more). Divers from which wave, how many at
  // once (waves 2-3, 4-6, 7+), how hard they and the little ones steer, how fast the little ones go, splitters from which
  // wave, how often the Mothership sends little ones (core open, angry; 0 = never), how far above the ship divers and
  // little ones stop steering and commit to their line (so a side-step at the end can still dodge them), the waves
  // from which the top one, two and three rows wear armour, and each of the Mothership's guns' share of its strength
  var REBOOT = {
    1: { diveFrom: 3, diveMax: [1, 1, 2], diveEvery: 360, diveTurn: 0.03, miniTurn: 0.03, miniVx: 1.0, miniVy: 0.9, splitFrom: 5, bossMinis: [0, 300], diveCommit: 70, miniCommit: 50, armour: [4, 7, 10], bossGun: 0.18, snipe: 300, wander: 2.0, enter: 1 },
    2: { diveFrom: 3, diveMax: [1, 1, 2], diveEvery: 360, diveTurn: 0.03, miniTurn: 0.035, miniVx: 1.3, miniVy: 1.0, splitFrom: 4, bossMinis: [0, 300], diveCommit: 70, miniCommit: 50, armour: [4, 7, 10], bossGun: 0.18, snipe: 170, wander: 2.6, enter: 1 },
    3: { diveFrom: 2, diveMax: [1, 2, 2], diveEvery: 220, diveTurn: 0.05, miniTurn: 0.06, miniVx: 1.6, miniVy: 1.15, splitFrom: 4, bossMinis: [300, 220], diveCommit: 50, miniCommit: 36, armour: [3, 6, 9], bossGun: 0.18, snipe: 120, wander: 3.2, enter: 1 }
  };
  Object.keys(REBOOT).forEach(function (k) { var R = REBOOT[k]; for (var q in R) SPEEDS[k][q] = R[q]; });
  // ---------------------------------------------------------------- THE WAVES (Enhanced; 10 Oct 2026, owner: "each level a
  // different group of baddies ... keeps you hooked"): ten waves, each with its own formation and its own kind of
  // invader to learn - then round again, harder (lower down, more divers, splitters and armour, as before). The
  // Mothership stays every fifth wave. Retro is always the plain block.
  //   snipers: red eyes - they aim their shots at you; phantoms: fade out (shots pass through them) and back in;
  //   carriers: take three hits, then burst into little ones; the BONUS STAGE: no formation and nobody fires - groups
  //   swoop across on flight paths; shoot as many as you can (a bonus for a whole group, a big one for all of them).
  var SHAPES = {
    block: ['11111111111', '11111111111', '11111111111', '11111111111', '11111111111'],
    chevron: ['11111111111', '01111111110', '00111111100', '00011111000', '00001110000'],
    diamond: ['00001110000', '00111111100', '01111111110', '00111111100', '00001110000'],
    checker: ['10101010101', '01010101010', '10101010101', '01010101010', '10101010101'],
    split: ['11110001111', '11110001111', '11110001111', '11110001111', '11110001111'],
    pyramid: ['00011111000', '00111111100', '01111111110', '11111111111', '11111111111']
  };
  var WAVES = [
    { name: 'First contact', shape: 'block' },
    { name: 'Chevron', shape: 'chevron', sniper: 'ends', tip: 'Snipers aim at you', hint: 'Snipers - the red-eyed ones - aim at you' },
    { name: 'Bonus stage', bonus: 1, tip: "They can't fire - get them all", hint: "They can't fire back - shoot as many as you can" },
    { name: 'Fortress', shape: 'diamond', carrier: 'core', armour: 'shell', tip: 'Carriers take 3 hits', hint: 'Carriers take three hits' },
    { name: 'Mothership', boss: true },
    { name: 'Phantoms', shape: 'checker', phantom: 'odd', tip: 'Shoot them when solid', hint: "Phantoms fade - shoot them when they're solid" },
    { name: 'Twin fleet', shape: 'split', sniper: 'top', tip: 'Snipers along the top', hint: 'Two fleets, with snipers along the top' },
    { name: 'Bonus stage', bonus: 2, tip: "They can't fire - get them all", hint: "They can't fire back - shoot as many as you can" },
    { name: 'Armada', shape: 'pyramid', carrier: 'base', phantom: 'row1', sniper: 'ends', tip: 'Everything at once', hint: 'Snipers, phantoms and carriers together' },
    { name: 'Mothership', boss: true }
  ];
  var KIND_PTS = { sniper: 40, phantom: 30, carrier: 60 };
  // the bonus stage's flight paths (game pixels, the centre of each invader): smooth curves through these points,
  // mirrored for some groups; 5 groups of 8 follow one another in a line
  var PATHS = {
    1: [[[-16, 36], [40, 58], [92, 118], [134, 150], [164, 112], [146, 72], [104, 70], [84, 104], [112, 140], [172, 124], [240, 62]],
      [[-16, 150], [36, 120], [80, 70], [124, 52], [160, 76], [150, 120], [110, 132], [76, 104], [96, 64], [160, 40], [240, 20]]],
    2: [[[112, -16], [112, 40], [64, 88], [76, 148], [148, 152], [168, 92], [112, 62], [66, 100], [112, 172], [168, 190], [240, 182]],
      [[-16, 100], [50, 100], [90, 60], [130, 100], [90, 140], [50, 100], [90, 60], [150, 50], [190, 110], [150, 166], [240, 186]]]
  };
  var GROUPS = 5, PER_GROUP = 8, SEG = 34;   // (SEG: steps per stretch of curve - about 1.5 px a step)
  function curve(pts, u) {   // a Catmull-Rom curve through the points, u from 0 to (points - 1)
    var n = pts.length, i = Math.min(n - 2, Math.floor(u)), t = u - i;
    var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    function cr(a, b, c, d) { return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t); }
    return { x: cr(p0[0], p1[0], p2[0], p3[0]), y: cr(p0[1], p1[1], p2[1], p3[1]) };
  }
  function phased(W, v) { if (v.kind !== 'phantom') return false; var ph = (W.frame + v.c * 37 + v.r * 53) % 160; return ph >= 118 && ph < 154; }   // a phantom faded out: shots pass through it
  var POINTS = [30, 20, 20, 10, 10];   // by row, top to bottom
  var TYPE = [0, 1, 1, 2, 2];          // the three kinds of invader, by row
  // each kind's width in pixels and where its picture starts inside the 12-pixel cell (to hit what you see)
  var BOX = [{ x0: 2, x1: 10 }, { x0: 0, x1: 12 }, { x0: 0, x1: 12 }];
  // the shield: 22 x 16, rounded top, an arch underneath
  var SHIELD = [
    '....##############....',
    '...################...',
    '..##################..',
    '.####################.',
    '######################',
    '######################',
    '######################',
    '######################',
    '######################',
    '######################',
    '######################',
    '#######........#######',
    '######..........######',
    '#####............#####',
    '#####............#####',
    '#####............#####'
  ];
  var SHIELD_W = 22, SHIELD_H = 16, SHIELD_Y = 190;
  var MYSTERY = [50, 100, 100, 150, 50, 100, 300, 100, 150, 50];
  var BOSS_W = 48, BOSS_H = 20, BOSS_Y = 40;
  var BOSS_GUN_L = 15, BOSS_GUN_R = 33;   // the Mothership: its left gun is x 0-14 across it, the core 15-32, the right gun 33-47
  var MINI_W = 6, MINI_H = 5, MINI_PTS = 15, ARMOUR_PTS = 5;
  var POWER_NAMES = { rapid: 'Rapid fire!', spread: 'Spread shot!', shield: 'Shield on!', laser: 'Laser!', slow: 'Slow time!' };

  function rngOf(seed) {   // mulberry32: the same seed, the same game (for the tests)
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function newWorld(speed, seed, style, opts) {   // opts.calm: no flying in, no weaving (the mechanics tests)
    speed = SPEEDS[speed] ? speed : 1;
    var sp = SPEEDS[speed], enh = style === 'enh';
    if (opts && opts.calm) { var cs = {}; for (var q in sp) cs[q] = sp[q]; cs.wander = 0; cs.enter = 0; sp = cs; }
    var W = {
      speed: speed, sp: sp, style: enh ? 'enh' : 'classic', enh: enh,
      rng: rngOf(seed == null ? (Date.now() ^ (Math.random() * 1e9)) : seed),
      score: 0, lives: sp.lives, wave: 0, frame: 0, events: [], fx: [], over: false, landed: false,
      extraGiven: false, nextExtra: EXTRA_AT,
      player: { x: 104, dead: 0 }, shots: [], bombs: [], booms: [], pops: [], saucer: null, saucerT: 1200, shotsFired: 0,
      invaders: [], order: [], shields: [], phase: 'spawn', phaseT: 0, spawnN: 0, spawnAt: 0, dir: 1, drop: false, ptr: 0, acc: 0,
      bombT: 90, beatN: 0, lastBeat: -99, hold: 0, intro: 0, ufoN: 0,
      caps: [], power: null, shieldUp: false, combo: 0, mult: 1, boss: null, waveDeaths: 0,
      minis: [], diveT: 300, slow: 0, beam: null
    };
    nextWave(W);
    return W;
  }
  function fx(W, o) { if (W.fx.length >= 300) W.fx.shift(); W.fx.push(o); }

  function nextWave(W) {
    W.wave++; W.waveDeaths = 0;
    var bossWave = W.enh && W.wave % BOSS_EVERY === 0;
    var top = 48 + 8 * Math.min(W.wave - 1, 5);   // each wave starts a row lower, up to five rows
    W.invaders = []; W.order = [];
    var plan = W.plan || WAVES, th = W.enh && !bossWave ? plan[(W.wave - 1) % plan.length] : null;
    if (th && th.boss) th = WAVES[0];   // (a plan with a Mothership on a wave that isn't a fifth)
    W.theme = th || (bossWave ? { name: 'Mothership', boss: true } : null);
    W.stage = th && th.bonus ? { bonus: th.bonus, hits: 0, gone: 0, total: GROUPS * PER_GROUP, pts: 0, groups: [] } : null;
    if (W.stage) {   // the BONUS STAGE: groups that fly in along their paths, one after another
      for (var g = 0; g < GROUPS; g++) {
        W.stage.groups.push({ hit: 0, gone: 0 });
        for (var q = 0; q < PER_GROUP; q++)
          W.invaders.push({ r: g % ROWS, c: q, type: g % 3, kind: 'std', hp: 1, x: -60, y: -60, alive: true, f: 0, armor: 0, split: false, fly: true,
            dv: { ph: 'fly', g: g, path: g % 2, mir: Math.floor(g / 2) % 2 === 1, t: -(30 + g * 140 + q * 9), x: -60, y: -60, vx: 0, vy: 0, on: false } });
      }
    } else if (!bossWave) {
      // Enhanced: armour on the top row, then two rows, then three (from the waves in sp.armour); some waves an armoured shell
      var AR = W.sp.armour || [2, 4, 7], armoured = !W.enh ? 0 : W.wave >= AR[2] ? 3 : W.wave >= AR[1] ? 2 : W.wave >= AR[0] ? 1 : 0;
      var mask = SHAPES[th ? th.shape : 'block'], at = [];
      var cell = function (rr, cc) { return rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && mask[rr].charAt(cc) === '1'; };
      for (var r = 0; r < ROWS; r++) {
        at.push([]);
        var first = mask[r].indexOf('1'), last = mask[r].lastIndexOf('1');
        for (var c = 0; c < COLS; c++) {
          if (!cell(r, c)) { at[r].push(-1); continue; }
          var kind = 'std';
          if (th) {
            if (th.carrier === 'core' && r === 2 && c >= 4 && c <= 6) kind = 'carrier';
            else if (th.carrier === 'base' && r === 4 && (c === 1 || c === 5 || c === 9)) kind = 'carrier';
            else if ((th.phantom === 'odd' && r % 2 === 1) || (th.phantom === 'row1' && r === 1)) kind = 'phantom';
            else if ((th.sniper === 'top' && r === 0) || (th.sniper === 'ends' && r <= 1 && (c === first || c === last))) kind = 'sniper';
          }
          var shell = th && th.armour === 'shell' && (!cell(r - 1, c) || !cell(r + 1, c) || !cell(r, c - 1) || !cell(r, c + 1));
          at[r].push(W.invaders.length);
          W.invaders.push({ r: r, c: c, type: kind === 'std' ? TYPE[r] : 1, kind: kind, hp: kind === 'carrier' ? 3 : 1, x: 26 + c * CELL_X, y: top + r * CELL_Y, alive: true, f: 0,
            armor: kind !== 'carrier' && (r < armoured || shell) ? 1 : 0, split: false, dv: null });
        }
      }
      // the ripple moves the bottom row first, left to right, then the row above
      for (r = ROWS - 1; r >= 0; r--) for (c = 0; c < COLS; c++) if (at[r][c] >= 0) W.order.push(at[r][c]);
      // (the ripple moves one at a time, so a smaller formation would march faster: it marches at a full block's pace)
      W.rateK = W.enh ? W.order.length / (ROWS * COLS) : 1;
      // Enhanced: splitters among the ordinary ones in the bottom two rows (one more every other wave, up to five)
      if (W.enh && W.wave >= W.sp.splitFrom) {
        var want = Math.min(5, 1 + Math.floor((W.wave - W.sp.splitFrom) / 2)), lowRows = W.invaders.filter(function (v) { return v.r >= 3 && v.kind === 'std'; });
        for (var k = 0; k < want && lowRows.length; k++) { var pick = Math.floor(W.rng() * lowRows.length); lowRows[pick].split = true; lowRows.splice(pick, 1); }
      }
    }
    W.shields = [];
    for (var s = 0; s < 4; s++) {
      var px = new Uint8Array(SHIELD_W * SHIELD_H);
      for (var y = 0; y < SHIELD_H; y++) for (var x = 0; x < SHIELD_W; x++) px[y * SHIELD_W + x] = SHIELD[y].charAt(x) === '#' ? 1 : 0;
      W.shields.push({ x: 33 + s * 45, y: SHIELD_Y, w: SHIELD_W, h: SHIELD_H, px: px, ver: 0 });
    }
    W.dir = 1; W.drop = false; W.ptr = 0; W.acc = 0; W.bombs = []; W.shots = []; W.saucer = null; W.caps = [];
    W.phase = 'spawn'; W.phaseT = 0; W.spawnN = 0; W.spawnAt = W.frame; W.bombT = 90;
    W.boss = null; W.intro = 0; W.minis = []; W.beam = null;
    W.diveT = Math.round(W.sp.diveEvery * 1.4); W.snipeT = 150;
    if (W.stage) W.shields = [];   // (the bonus stage: open sky)
    // Enhanced: the swarm FLIES IN (10 Oct 2026; owner: "they swarm ... they're coming in and you've got to deal with
    // them") - streams from both sides swoop low over the ship, loop and settle into their places; the march waits for
    // them; they can be shot on the way in (double points)
    W.entering = 0; W.wt = W.wt || 0;
    if (W.enh && W.sp.enter && !bossWave && !W.stage) {
      W.invaders.forEach(function (v) {
        var sd = v.c <= 5 ? -1 : 1, X = v.x + 6, Y = v.y + 4, idx = sd < 0 ? v.c : COLS - 1 - v.c;
        var pts = [[112 + sd * 150, 30 + (v.r % 2) * 26], [112 + sd * 70, 112], [112 + sd * 8, 160], [112 - sd * 46, 124], [X, Y - 24]];
        v.dv = { ph: 'enter', entry: true, path: pts, t: -(20 + v.r * 34 + idx * 5), x: pts[0][0] - 6, y: pts[0][1] - 4, vx: 0, vy: 0, on: false };
      });
      W.entering = W.invaders.length; W.spawnN = W.invaders.length; W.phase = 'play';   // (no appearing one by one: they fly in)
      W.events.push({ sfx: 'swarm' }); if (W.wave > 1) W.events.push({ say: 'Wave ' + W.wave + ' – here they come' });
    }
    if (bossWave) {
      var hp = W.sp.bossHp + 8 * (W.wave / BOSS_EVERY - 1);   // each Mothership a little tougher
      var gun = Math.max(3, Math.round(hp * (W.sp.bossGun || 0.25))), core = Math.max(6, hp - 2 * gun);   // (sp.bossGun: each gun's share)
      W.boss = { x: (WIDTH - BOSS_W) / 2, y: BOSS_Y, w: BOSS_W, h: BOSS_H, hp: gun * 2 + core, max: gun * 2 + core, dir: 1, t: 0, fireT: 100, phase: 1, dead: 0, flash: 0, drops: 0,
        L: { hp: gun, max: gun, flash: 0 }, R: { hp: gun, max: gun, flash: 0 }, C: { hp: core, max: core }, gun: 0, miniT: 200 };
      W.intro = 150;
      W.events.push('warning'); W.events.push({ say: 'Wave ' + W.wave + ': the Mothership is coming! Shoot its two guns off first.' });
    }
    if (th && W.wave > 1) W.events.push({ say: 'Wave ' + W.wave + ': ' + th.name + (th.hint ? '. ' + th.hint : '') });
    fx(W, { k: 'wave', n: W.wave, boss: bossWave, name: W.theme ? W.theme.name : '', tip: th && th.tip ? th.tip : '', hint: th && th.hint ? th.hint : '', bonus: !!W.stage });
  }

  function alive(W) { var n = 0; for (var i = 0; i < W.invaders.length; i++) if (W.invaders[i].alive) n++; return n; }
  function pos(inv) {   // where an invader is now: diving or flying in, or at its place in the formation and weaving about it
    return inv.dv ? inv.dv : (inv.wx || inv.wy) ? { x: inv.x + (inv.wx || 0), y: inv.y + (inv.wy || 0) } : inv;
  }
  function wanderStep(W, f) {   // in formation each one weaves about its place (the last few wildly) - and that's where it really is
    var A = W.sp.wander || 0, i, v; if (!A || !W.enh || W.stage) return;
    var n = 0; for (i = 0; i < W.invaders.length; i++) if (W.invaders[i].alive && !W.invaders[i].dv) n++;
    var wild = n > 0 && n <= 4 && !W.boss ? 2.2 : 1;
    W.wt = (W.wt || 0) + f * (wild > 1 ? 1.6 : 1);
    var F = W.wt;
    for (i = 0; i < W.invaders.length; i++) {
      v = W.invaders[i]; if (!v.alive) continue;
      var k = v.c * 1.7 + v.r * 0.9;
      var nx = A * wild * (0.6 * Math.sin(F * 0.021 + k) + 0.4 * Math.sin(F * 0.047 + v.c * 0.6));
      v.wvx = nx - (v.wx || 0); v.wx = nx;   // (and how fast, so the pictures can bank it)
      v.wy = A * wild * 0.7 * Math.sin(F * 0.033 + v.r * 1.3 + v.c * 0.8);
    }
  }
  function box(inv) { var b = BOX[inv.type], p = pos(inv); return { x: p.x + b.x0, y: p.y, w: b.x1 - b.x0, h: 8 }; }
  function slotBox(inv) { var b = BOX[inv.type]; return { x: inv.x + b.x0, y: inv.y, w: b.x1 - b.x0, h: 8 }; }   // its place in the formation
  function overlap(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
  var SHIP = function (W) { return { x: W.player.x + 1, y: PY + 1, w: 11, h: 7 }; };

  // ---------------------------------------------------------------- shields
  function shieldAt(W, x, y, w, h) {   // the first shield pixel inside the box, or null
    for (var s = 0; s < W.shields.length; s++) {
      var S = W.shields[s];
      if (x + w <= S.x || x >= S.x + S.w || y + h <= S.y || y >= S.y + S.h) continue;
      var x0 = Math.max(0, Math.floor(x - S.x)), x1 = Math.min(S.w, Math.ceil(x + w - S.x));
      var y0 = Math.max(0, Math.floor(y - S.y)), y1 = Math.min(S.h, Math.ceil(y + h - S.y));
      for (var yy = y0; yy < y1; yy++) for (var xx = x0; xx < x1; xx++) if (S.px[yy * S.w + xx]) return { s: S, x: xx, y: yy };
    }
    return null;
  }
  function splat(W, hit) {   // knock a ragged hole round the spot
    var S = hit.s;
    for (var dy = -3; dy <= 3; dy++) for (var dx = -3; dx <= 3; dx++) {
      var d = Math.abs(dx) + Math.abs(dy), x = hit.x + dx, y = hit.y + dy;
      if (d > 3 || x < 0 || y < 0 || x >= S.w || y >= S.h) continue;
      if (d <= 1 || W.rng() < 0.55) S.px[y * S.w + x] = 0;
    }
    S.ver++;
    fx(W, { k: 'shield', x: S.x + hit.x, y: S.y + hit.y });
  }
  function clearUnder(W, b) {   // an invader marching through a shield wipes it out
    for (var s = 0; s < W.shields.length; s++) {
      var S = W.shields[s], hit = false;
      if (!overlap(b, S)) continue;
      for (var y = Math.max(0, b.y - S.y); y < Math.min(S.h, b.y + b.h - S.y); y++)
        for (var x = Math.max(0, b.x - S.x); x < Math.min(S.w, b.x + b.w - S.x); x++) if (S.px[y * S.w + x]) { S.px[y * S.w + x] = 0; hit = true; }
      if (hit) S.ver++;
    }
  }

  // ---------------------------------------------------------------- the formation's ripple (a diver's place keeps moving with it)
  function moveOne(W) {
    var n = W.order.length;
    for (var tries = 0; tries <= n; tries++) {
      if (W.ptr >= n) { endCycle(W); if (W.over || W.phase !== 'play') return; }
      var inv = W.invaders[W.order[W.ptr++]];
      if (!inv.alive) continue;
      if (W.drop) inv.y += 8; else inv.x += 2 * W.dir;
      inv.f ^= 1;
      var b = slotBox(inv);
      if (!inv.dv) clearUnder(W, b);
      if (b.y + b.h >= PY + 2) { landed(W); }
      return;
    }
  }
  function endCycle(W) {
    W.ptr = 0;
    if (W.drop) W.drop = false;
    else {
      var minX = 999, maxX = -999;
      for (var i = 0; i < W.invaders.length; i++) {
        var v = W.invaders[i]; if (!v.alive) continue;
        var b = slotBox(v); minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.x + b.w);
      }
      if ((W.dir > 0 && maxX + 2 > RIGHT) || (W.dir < 0 && minX - 2 < LEFT)) { W.drop = true; W.dir = -W.dir; }
    }
    beat(W, 6);
  }
  function beat(W, gap) {
    if (W.frame - W.lastBeat >= gap) { W.lastBeat = W.frame; W.events.push({ sfx: 'beat', n: W.beatN }); W.beatN = (W.beatN + 1) & 3; }
  }
  function landed(W) {
    if (W.landed) return;
    W.landed = true; W.lives = 1; W.shieldUp = false; killPlayer(W, 'landed');
  }

  // ---------------------------------------------------------------- the player
  function killPlayer(W, cause) {   // cause: what got the ship (for the playtest farm): bomb, divebomb, diver, mini, plasma, landed
    if (W.player.dead) return;
    W.player.dead = 100; W.lives--; W.bombs = []; W.waveDeaths++;
    W.power = null; W.shieldUp = false; W.beam = null; W.minis = []; breakCombo(W);
    for (var i = 0; i < W.invaders.length; i++) { var d = W.invaders[i].dv; if (d && d.ph !== 'back') d.ph = 'back'; }   // divers fly home
    W.events.push({ sfx: 'boom', x: W.player.x + 6 });
    fx(W, { k: 'die', x: W.player.x + 6.5, y: PY + 4, cause: cause || 'bomb' });
  }
  function shieldOrDie(W, x, cause) {   // something flew into the ship: the shield takes it, or the ship is lost
    if (W.shieldUp) { W.shieldUp = false; W.events.push({ sfx: 'shieldpop', x: x }); W.events.push({ say: 'Your shield took that one' }); fx(W, { k: 'shieldpop', x: W.player.x + 6.5, y: PY + 2 }); return false; }
    killPlayer(W, cause); return true;
  }
  function addScore(W, pts) {
    W.score += pts;
    if (W.enh) {
      while (W.score >= W.nextExtra) {
        W.nextExtra = W.nextExtra === EXTRA_AT ? EXTRA_AT + EXTRA_EVERY : W.nextExtra + EXTRA_EVERY;
        W.extraGiven = true; W.lives = Math.min(9, W.lives + 1);
        W.events.push('extra'); W.events.push({ say: 'Extra life!' }); fx(W, { k: 'extra' });
      }
    } else if (!W.extraGiven && W.score >= EXTRA_AT) {
      W.extraGiven = true; W.lives = Math.min(9, W.lives + 1);
      W.events.push('extra'); W.events.push({ say: 'Extra life!' });
    }
  }
  // combo: every 6 hits in a row without a miss raises the multiplier, up to x4
  function hitCombo(W) {
    if (!W.enh) return 1;
    W.combo++;
    var m = 1 + Math.min(3, Math.floor(W.combo / 6));
    if (m > W.mult) { W.mult = m; W.events.push({ sfx: 'combo', n: m }); fx(W, { k: 'combo', n: m }); }
    return W.mult;
  }
  function breakCombo(W) {
    if (!W.combo) return;
    var had = W.mult; W.combo = 0; W.mult = 1;
    if (had > 1) { W.events.push('combobreak'); fx(W, { k: 'combobreak' }); }
  }

  function step(W, input) {
    W.frame++;
    input = input || {};
    var sp = W.sp, P = W.player, i;
    // explosions and floating scores fade whatever else is going on
    for (i = W.booms.length - 1; i >= 0; i--) if (--W.booms[i].t <= 0) W.booms.splice(i, 1);
    for (i = W.pops.length - 1; i >= 0; i--) if (--W.pops[i].t <= 0) W.pops.splice(i, 1);

    if (P.dead) {   // the player's ship is exploding: everything waits
      if (W.boss && W.boss.flash) W.boss.flash--;
      if (--P.dead === 0) {
        if (W.lives <= 0) { W.over = true; W.events.push('over'); return; }
        W.hold = 40; W.shots = [];
      }
      return;
    }

    // the ship moves (between waves too)
    var target = null;
    if (input.mouseX != null) target = input.mouseX - 6.5;
    var dx = 0;
    if (target != null) { var d = target - P.x; dx = Math.max(-sp.ship * 1.4, Math.min(sp.ship * 1.4, d)); if (Math.abs(d) < 0.5) dx = 0; }
    else if (input.left && !input.right) dx = -sp.ship;
    else if (input.right && !input.left) dx = sp.ship;
    P.x = Math.max(LEFT, Math.min(RIGHT - 13, P.x + dx));
    P.vx = dx;
    if (dx && target == null) W.touched = true;   // (keys or the touch buttons; a ship drifting to a resting mouse is not the player moving)
    if (W.power && --W.power.t <= 0) { W.power = null; W.beam = null; W.events.push('powerdown'); fx(W, { k: 'powerdown' }); }
    if (W.slow > 0 && --W.slow === 0) { W.events.push('slowoff'); fx(W, { k: 'slowoff' }); }
    moveCaps(W);

    if (W.hold > 0) { W.hold--; return; }
    if (W.intro > 0) { if (--W.intro === 0) W.phase = 'play'; return; }   // the Mothership coming down

    if (W.phase === 'spawn') {   // the new wave appears one invader at a time
      W.spawnN = Math.min(W.invaders.length, W.spawnN + 1);
      if (W.spawnN >= W.invaders.length) { W.phase = 'play'; if (W.wave > 1 && !W.boss) W.events.push({ say: 'Wave ' + W.wave + ' – here they come' }); }
      return;
    }
    if (W.phase === 'clear') {
      if (--W.phaseT <= 0) nextWave(W);
      return;
    }

    var f = W.slow > 0 ? 0.5 : 1;   // SLOW TIME: everything of theirs at half speed
    var laser = W.enh && W.power && W.power.kind === 'laser';
    if (laser) beamStep(W, input);
    else { W.beam = null; if (input.fire || input.tap) fire(W); }
    // the formation
    if (W.order.length && !W.entering) {
      W.acc += sp.rate * f * (W.rateK || 1);
      while (W.acc >= 1 && W.phase === 'play' && !P.dead) { W.acc -= 1; moveOne(W); }
      if (P.dead) return;
    }
    if (W.enh) {
      wanderStep(W, f);
      launchDivers(W); moveDivers(W, f); if (P.dead) return;
      moveMinis(W, f); if (P.dead) return;
    }

    moveShots(W);
    if (W.phase !== 'play') return;
    moveBombs(W, f);
    if (P.dead) return;
    if (W.boss) bossStep(W, f);
    else { if (!W.entering) dropBombs(W, f); moveSaucer(W, f); }   // (no bombs while the swarm is still flying in)

    if (!W.boss && alive(W) === 0 && !W.minis.length) {
      W.phase = 'clear'; W.phaseT = 150; W.bombs = []; W.shots = []; W.saucer = null; W.beam = null;
      if (W.stage) {   // the bonus stage's result: all of them is worth a lot
        var st = W.stage, extra = st.hits === st.total ? 10000 : 0;
        if (extra) addScore(W, extra);
        st.pts += extra; W.phaseT = 200;
        W.events.push(extra ? 'perfect' : 'wave'); W.events.push({ say: 'Bonus stage: ' + st.hits + ' of ' + st.total + ' hit' + (extra ? ' - all of them! +10,000' : '') });
        fx(W, { k: 'bonusresult', hits: st.hits, total: st.total, pts: st.pts, perfect: !!extra });
      } else if (W.enh && W.waveDeaths === 0) {
        addScore(W, 500);
        W.events.push('perfect'); W.events.push({ say: 'Perfect wave! +500' }); fx(W, { k: 'perfect', n: W.wave });
      } else { W.events.push('wave'); W.events.push({ say: 'Wave ' + W.wave + ' cleared!' }); }
      fx(W, { k: 'cleared', n: W.wave, bonus: !!W.stage });
    }
  }

  // ---------------------------------------------------------------- shots
  function fire(W) {
    var cx = Math.round(W.player.x + 6), y = PY - 4, k = W.enh && W.power ? W.power.kind : '';
    if (k === 'spread') {
      if (W.shots.length) return;
      addShot(W, cx, y, -0.7, 4, true); addShot(W, cx, y, 0, 4, true); addShot(W, cx, y, 0.7, 4, true);
    } else if (k === 'rapid') {
      if (W.shots.length >= 2 || (W.shots.length && W.shots[W.shots.length - 1].y > PY - 50)) return;
      addShot(W, cx, y, 0, 6, false);
    } else {
      if (W.shots.length) return;
      addShot(W, cx, y, 0, 4, false);
    }
    W.shotsFired++;
    W.events.push({ sfx: 'shoot', x: cx, kind: k });
    fx(W, { k: 'shot', x: cx, y: y, kind: k });
  }
  function addShot(W, x, y, dx, vy, spread) { W.shots.push({ x: x, y: y, dx: dx, vy: vy, spread: spread }); }
  function moveShots(W) {
    for (var i = W.shots.length - 1; i >= 0; i--) {
      var s = W.shots[i], res = moveShot(W, s);
      if (!res) continue;
      var j = W.shots.indexOf(s); if (j >= 0) W.shots.splice(j, 1);
      if (res === 'miss' && W.enh && !s.spread) breakCombo(W);
      if (W.phase !== 'play') return;
    }
  }
  // the things a shot (or the laser) can hit, one by one
  function hitInvader(W, v) {
    var p = pos(v);
    if (v.kind === 'carrier' && v.hp > 1) {   // a carrier: three hits
      v.hp--;
      var mc = hitCombo(W); addScore(W, 10 * mc);
      W.events.push({ sfx: 'carrierhit', x: p.x + 6 });
      fx(W, { k: 'carrierhit', x: p.x + 6, y: p.y + 4, hp: v.hp });
      return;
    }
    if (v.armor) {   // the first hit knocks the armour off
      v.armor = 0;
      var ma = hitCombo(W); addScore(W, ARMOUR_PTS * ma);
      W.events.push({ sfx: 'armor', x: p.x + 6 });
      fx(W, { k: 'armor', x: p.x + 6, y: p.y + 4, type: v.type, kind: v.kind, f: v.f });
      return;
    }
    v.alive = false;
    var flying = !!(v.dv && v.dv.ph === 'fly'), diving = !!v.dv && !flying, m = hitCombo(W);
    var base = KIND_PTS[v.kind] || POINTS[v.r], pts = flying ? 100 * m : base * m * (diving ? 2 : 1);
    addScore(W, pts);
    if (flying && W.stage) {   // the bonus stage: a whole group is worth more
      var G = W.stage.groups[v.dv.g]; W.stage.hits++; W.stage.pts += pts; G.hit++;
      if (G.hit === PER_GROUP) { addScore(W, 1000); W.stage.pts += 1000; W.events.push('groupbonus'); fx(W, { k: 'groupbonus', x: p.x + 6, y: p.y + 4 }); }
    }
    W.booms.push({ kind: 'inv', x: p.x, y: p.y, t: 16 });
    W.events.push({ sfx: 'hit', x: p.x + 6, type: v.type });
    fx(W, { k: 'kill', x: p.x + 6, y: p.y + 4, type: v.type, kind: v.kind, pts: pts, mult: m, dive: diving || flying, f: v.f });
    if (v.split) addMinis(W, p.x + 6, p.y + 4, 'split');
    if (v.kind === 'carrier') addMinis(W, p.x + 6, p.y + 4, 'carrier');
    maybeDrop(W, p.x + 6, p.y + 6);
    v.dv = null;
  }
  function hitMini(W, i) {
    var mn = W.minis[i]; W.minis.splice(i, 1);
    var m = hitCombo(W), pts = MINI_PTS * m; addScore(W, pts);
    W.events.push({ sfx: 'minihit', x: mn.x + 3 });
    fx(W, { k: 'minikill', x: mn.x + 3, y: mn.y + 2.5, pts: pts, mult: m });
  }
  function hitSaucer(W) {
    var U = W.saucer, mm = hitCombo(W), pts2 = MYSTERY[Math.floor(W.rng() * MYSTERY.length)] * mm;
    addScore(W, pts2); W.saucer = null; W.saucerT = 1500;
    W.booms.push({ kind: 'ufo', x: U.x, y: SAUCER_Y, t: 24 });
    W.pops.push({ text: String(pts2), x: U.x + 8, y: SAUCER_Y, t: 90 });
    W.events.push({ sfx: 'ufohit', x: U.x + 8 });
    fx(W, { k: 'ufo', x: U.x + 8, y: SAUCER_Y + 3, pts: pts2 });
    if (W.enh) maybeDrop(W, U.x + 8, SAUCER_Y + 6, 1);
  }
  function moveShot(W, s) {
    for (var k = 0; k < s.vy; k++) {   // a pixel at a time, so nothing is jumped over
      s.y -= 1; s.x += s.dx / s.vy;
      var sx = Math.round(s.x);
      if (s.y < 16) { W.booms.push({ kind: 'top', x: sx - 3, y: 14, t: 14 }); fx(W, { k: 'top', x: sx, y: 16 }); return 'miss'; }
      if (sx < 0 || sx >= WIDTH) return 'gone';
      // an invader (in the formation or diving)
      for (var i = 0; i < W.invaders.length; i++) {
        var v = W.invaders[i]; if (!v.alive || phased(W, v)) continue;
        var b = box(v);
        if (sx >= b.x && sx < b.x + b.w && s.y + 4 > b.y && s.y < b.y + b.h) { hitInvader(W, v); return 'hit'; }
      }
      // a little one
      for (i = 0; i < W.minis.length; i++) {
        var mn = W.minis[i];
        if (sx >= mn.x && sx < mn.x + MINI_W && s.y + 4 > mn.y && s.y < mn.y + MINI_H) { hitMini(W, i); return 'hit'; }
      }
      // the mystery ship
      var U = W.saucer;
      if (U && sx >= U.x && sx < U.x + 16 && s.y < SAUCER_Y + 7 && s.y + 4 > SAUCER_Y) { hitSaucer(W); return 'hit'; }
      // the Mothership: a gun, the core - or the gap where a gun was (the shot flies on)
      var B = W.boss;
      if (B && !B.dead && W.intro === 0 && sx >= B.x + 2 && sx < B.x + B.w - 2 && s.y < B.y + B.h - 2 && s.y + 4 > B.y + 2) {
        var r = bossHit(W, sx, s.y);
        if (r === 'hit') return 'hit';
        if (r === 'deflect') return 'gone';
      }
      // a bomb: both go
      for (var j = 0; j < W.bombs.length; j++) {
        var Bo = W.bombs[j];
        if (sx >= Bo.x - 1 && sx <= Bo.x + 3 && s.y < Bo.y + 7 && s.y + 4 > Bo.y) {
          W.bombs.splice(j, 1); W.booms.push({ kind: 'small', x: sx - 3, y: s.y - 2, t: 10 });
          fx(W, { k: 'cancel', x: sx, y: s.y }); W.events.push({ sfx: 'cancel', x: sx });
          return 'gone';
        }
      }
      // a shield
      var hit = shieldAt(W, sx, s.y, 1, 4);
      if (hit) { splat(W, hit); return 'miss'; }
    }
    return null;
  }

  // ---------------------------------------------------------------- the LASER (Enhanced power-up): hold fire for a beam
  // It reaches up to the first thing in its way (shields don't stop it) and burns through it every 6 steps.
  function beamStep(W, input) {
    if (!(input.fire || input.tap)) { W.beam = null; return; }
    var cx = Math.round(W.player.x + 6);
    if (!W.beam) { W.beam = { x: cx, t: 0, top: 16 }; W.events.push({ sfx: 'laseron', x: cx }); W.shotsFired++; }
    W.beam.x = cx; W.beam.t++;
    var best = null, by = -1, i;
    function consider(y, o) { if (y > by) { by = y; best = o; } }
    for (i = 0; i < W.invaders.length; i++) { var v = W.invaders[i]; if (!v.alive || phased(W, v)) continue; var b = box(v); if (cx >= b.x && cx < b.x + b.w && b.y < PY) consider(b.y + b.h, { k: 'inv', v: v }); }
    for (i = 0; i < W.minis.length; i++) { var mn = W.minis[i]; if (cx >= mn.x && cx < mn.x + MINI_W && mn.y < PY) consider(mn.y + MINI_H, { k: 'mini', m: mn }); }
    for (i = 0; i < W.bombs.length; i++) { var Bo = W.bombs[i]; if (cx >= Bo.x - 1 && cx <= Bo.x + 3 && Bo.y < PY) consider(Bo.y + 7, { k: 'bomb', b: Bo }); }
    var U = W.saucer; if (U && cx >= U.x && cx < U.x + 16) consider(SAUCER_Y + 7, { k: 'ufo' });
    var B = W.boss;
    if (B && !B.dead && W.intro === 0 && cx >= B.x + 2 && cx < B.x + B.w - 2) {
      var ox = cx - B.x, part = ox < BOSS_GUN_L ? 'L' : ox >= BOSS_GUN_R ? 'R' : 'C';
      if (part === 'C' || B[part].hp > 0) consider(B.y + B.h - 2, { k: 'boss' });
    }
    W.beam.top = best ? Math.max(16, by - 2) : 16;
    if (W.beam.t % 6 !== 1 || !best) return;
    W.events.push({ sfx: 'laser', x: cx });
    if (best.k === 'inv') hitInvader(W, best.v);
    else if (best.k === 'mini') { var mi = W.minis.indexOf(best.m); if (mi >= 0) hitMini(W, mi); }
    else if (best.k === 'bomb') { var bi = W.bombs.indexOf(best.b); if (bi >= 0) { W.bombs.splice(bi, 1); fx(W, { k: 'cancel', x: cx, y: best.b.y }); } }
    else if (best.k === 'ufo') hitSaucer(W);
    else if (best.k === 'boss') bossHit(W, cx, B.y + B.h - 4);
  }

  // ---------------------------------------------------------------- DIVERS (Enhanced, from wave 2)
  function launchDivers(W) {
    if (W.boss || W.stage || W.entering || W.phase !== 'play' || W.wave < W.sp.diveFrom) return;
    if ((W.diveT -= (W.slow > 0 ? 0.5 : 1)) > 0) return;
    var sp = W.sp, maxD = sp.diveMax[W.wave >= 7 ? 2 : W.wave >= 4 ? 1 : 0], n = 0, cand = [], i;
    W.diveT = Math.round(sp.diveEvery * Math.max(0.55, 1 - (W.wave - 2) * 0.05) * (0.7 + W.rng() * 0.6));
    for (i = 0; i < W.invaders.length; i++) { var v = W.invaders[i]; if (!v.alive) continue; if (v.dv) n++; else if (v.kind !== 'carrier') cand.push(v); }
    if (n >= maxD || cand.length <= 3) return;
    var minC = 99, maxC = -1;   // the old arcade shooters sent them from the edges of the formation
    cand.forEach(function (q) { minC = Math.min(minC, q.c); maxC = Math.max(maxC, q.c); });
    var edge = cand.filter(function (q) { return q.c === minC || q.c === maxC; }), pool = edge.length && W.rng() < 0.7 ? edge : cand;
    var d = pool[Math.floor(W.rng() * pool.length)], side = d.c <= 5 ? -1 : 1;
    d.dv = { t: 0, ph: 'peel', x: d.x, y: d.y, sx: d.x, sy: d.y, side: side, vx: 0, vy: 0, bombs: W.speed >= 3 ? 2 : 1 };
    W.events.push({ sfx: 'dive', x: d.x + 6 });
    fx(W, { k: 'dive', x: d.x + 6, y: d.y + 4, type: d.type, kind: d.kind });
  }
  function moveDivers(W, f) {
    var P = W.player, sp = W.sp, ent = 0;
    for (var i = 0; i < W.invaders.length; i++) {
      var v = W.invaders[i], d = v.dv; if (!v.alive || !d) continue;
      d.t += f;
      if (d.entry) ent++;
      if (d.ph === 'enter') {   // flying in along its stream
        if (d.t < 0) continue;
        var ep = d.path, eu = d.t / 22;
        if (eu >= ep.length - 1) { d.ph = 'back'; continue; }
        var eq = curve(ep, eu), ex = eq.x - 6, ey = eq.y - 4;
        if (d.on) { d.vx = ex - d.x; d.vy = ey - d.y; } d.on = true;
        d.x = ex; d.y = ey; if ((Math.floor(d.t) & 7) === 0) v.f ^= 1;
        continue;
      }
      if (d.ph === 'fly') {   // the bonus stage: along its flight path, and away off the screen
        if (d.t < 0) continue;
        var pts = PATHS[W.stage ? W.stage.bonus : 1][d.path], u = d.t / SEG;
        if (u >= pts.length - 1) { v.alive = false; v.dv = null; if (W.stage) { W.stage.gone++; W.stage.groups[d.g].gone++; } continue; }
        var q = curve(pts, u), nx = (d.mir ? WIDTH - q.x : q.x) - 6, ny = q.y - 4;
        if (d.on) { d.vx = nx - d.x; d.vy = ny - d.y; } d.on = true;
        d.x = nx; d.y = ny; if ((Math.floor(d.t) & 7) === 0) v.f ^= 1;
        continue;
      }
      if (d.ph === 'peel') {   // a loop up and out of the formation
        var a = Math.min(1, d.t / 44) * Math.PI, R = 14;
        d.x = d.sx + d.side * R * (1 - Math.cos(a)); d.y = d.sy - R * 0.9 * Math.sin(a);
        if (d.t >= 44) { d.ph = 'dive'; d.vx = d.side * 0.4; d.vy = 0.3; }
      } else if (d.ph === 'dive') {   // down at the ship, weaving, dropping its bombs
        var tx = P.x + 0.5;
        if (d.y < PY - sp.diveCommit) d.vx = clamp(d.vx + clamp((tx - d.x) * 0.0035, -sp.diveTurn, sp.diveTurn) * f, -1.3, 1.3);   // (low down it holds its line)
        d.vy = Math.min(sp.dive, d.vy + 0.03 * f);
        d.x = clamp(d.x + (d.vx + Math.sin(d.t / 11) * 0.35) * f, LEFT - 4, RIGHT - 8); d.y += d.vy * f;
        if (d.bombs > 0 && d.y > 96 && d.y < PY - 40 && Math.abs(d.x + 6 - (P.x + 6.5)) < 30 && W.bombs.length < sp.bombs + 2) {
          d.bombs--; W.bombs.push({ x: d.x + 5, y: d.y + 8, dx: d.vx * 0.3, kind: Math.floor(W.rng() * 3), f: 0, src: 'dive' });
        }
        if (overlap(box(v), SHIP(W))) {   // it flew into the ship
          var p = pos(v); v.alive = false; v.dv = null;
          W.events.push({ sfx: 'hit', x: p.x + 6, type: v.type }); fx(W, { k: 'kill', x: p.x + 6, y: p.y + 4, type: v.type, pts: 0, mult: 1, dive: true, f: v.f });
          if (shieldOrDie(W, p.x + 6, 'diver')) return;
          continue;
        }
        if (d.y > GROUND + 6) { d.ph = 'back'; d.y = -14; d.x = v.x; }   // missed: round the back of the world to the top
      } else {   // home to its place in the formation (where it weaves)
        var hx = v.x + (v.wx || 0) - d.x, hy = v.y + (v.wy || 0) - d.y, dist = Math.hypot(hx, hy), spd = (d.entry ? 1.9 : 1.6) * f;
        if (dist <= spd) { v.dv = null; continue; }
        d.vx = hx / dist * spd; d.vy = hy / dist * spd; d.x += d.vx; d.y += d.vy;
      }
    }
    W.entering = ent;
  }

  // ---------------------------------------------------------------- the little ones (splitters, and the Mothership's)
  function addMinis(W, cx, cy, why) {
    for (var k = -1; k <= 1; k += 2) W.minis.push({ x: cx - MINI_W / 2 + k * 4, y: cy - 2, vx: k * 0.9, vy: -0.6, t: 0, f: 0 });
    W.events.push({ sfx: 'split', x: cx }); fx(W, { k: 'split', x: cx, y: cy, why: why });
  }
  function moveMinis(W, f) {
    var P = W.player, sp = W.sp;
    for (var i = W.minis.length - 1; i >= 0; i--) {
      var m = W.minis[i];
      m.t += f; m.f = Math.floor(m.t / 8) & 1;
      var tx = P.x + 3.5;
      if (m.y < PY - sp.miniCommit) m.vx = clamp(m.vx + clamp((tx - m.x) * 0.004, -sp.miniTurn, sp.miniTurn) * f, -sp.miniVx, sp.miniVx);
      m.vy = Math.min(sp.dive * sp.miniVy, m.vy + 0.04 * f);
      m.x = clamp(m.x + m.vx * f, LEFT - 2, RIGHT - 4); m.y += m.vy * f;
      if (overlap({ x: m.x, y: m.y, w: MINI_W, h: MINI_H }, SHIP(W))) {
        W.minis.splice(i, 1); fx(W, { k: 'minikill', x: m.x + 3, y: m.y + 2.5, pts: 0, mult: 1 });
        if (shieldOrDie(W, m.x + 3, 'mini')) return;
        continue;
      }
      if (m.y > GROUND + 4) { W.minis.splice(i, 1); fx(W, { k: 'minigone', x: m.x + 3, y: GROUND }); }
    }
  }

  // ---------------------------------------------------------------- power-up capsules (Enhanced)
  function maybeDrop(W, x, y, chance) {
    if (!W.enh || W.caps.length) return;
    if (W.rng() >= (chance == null ? W.sp.cap : chance)) return;
    var r = W.rng(), kind = r < 0.28 ? 'rapid' : r < 0.54 ? 'spread' : r < 0.72 ? 'shield' : r < 0.88 ? 'laser' : 'slow';
    W.caps.push({ x: x, y: y, kind: kind, t: 0 });
    W.events.push({ sfx: 'capdrop', x: x }); fx(W, { k: 'capdrop', x: x, y: y, kind: kind });
  }
  function moveCaps(W) {
    var P = W.player;
    for (var i = W.caps.length - 1; i >= 0; i--) {
      var c = W.caps[i];
      c.y += 0.55; c.t++;
      if (overlap({ x: c.x - 3, y: c.y - 4, w: 7, h: 9 }, { x: P.x, y: PY, w: 13, h: 8 })) {
        W.caps.splice(i, 1);
        if (c.kind === 'shield') W.shieldUp = true;
        else if (c.kind === 'slow') W.slow = Math.round(W.sp.power * 0.6);
        else W.power = { kind: c.kind, t: c.kind === 'laser' ? Math.round(W.sp.power * 0.6) : W.sp.power, max: c.kind === 'laser' ? Math.round(W.sp.power * 0.6) : W.sp.power };
        W.events.push({ sfx: 'powerup', kind: c.kind }); W.events.push({ say: POWER_NAMES[c.kind] });
        fx(W, { k: 'collect', x: c.x, y: c.y, kind: c.kind });
      } else if (c.y > GROUND) { W.caps.splice(i, 1); fx(W, { k: 'capgone', x: c.x, y: GROUND }); }
    }
  }

  // ---------------------------------------------------------------- the Mothership (Enhanced, every 5th wave): three stages
  function bossHit(W, x, y) {   // 'hit', 'deflect' (the core while a gun still guards it) or 'pass' (the gap where a gun was)
    var B = W.boss, ox = x - B.x, part = ox < BOSS_GUN_L ? 'L' : ox >= BOSS_GUN_R ? 'R' : 'C';
    if (part !== 'C' && B[part].hp <= 0) return 'pass';
    if (part === 'C' && (B.L.hp > 0 || B.R.hp > 0)) {
      W.events.push({ sfx: 'deflect', x: x }); fx(W, { k: 'deflect', x: x, y: y });
      return 'deflect';
    }
    var Pt = B[part]; Pt.hp--; B.hp--; B.flash = 6; if (part !== 'C') Pt.flash = 6;
    var m = hitCombo(W);
    addScore(W, 10 * m);
    W.events.push({ sfx: 'bosshit', x: x });
    fx(W, { k: 'bosshit', x: x, y: y, part: part });
    if (part !== 'C' && Pt.hp <= 0) {   // a gun blown off
      var gx = B.x + (part === 'L' ? 8 : 40);
      addScore(W, 250 * m); B.drops++; maybeDrop(W, gx, B.y + B.h, 1);
      var both = B.L.hp <= 0 && B.R.hp <= 0;
      W.events.push({ sfx: 'bosspart', x: gx }); W.events.push({ say: both ? 'Both guns gone - hit the core!' : 'A gun blown off!' });
      fx(W, { k: 'bosspart', part: part, x: gx, y: B.y + B.h / 2 });
      if (both) { B.phase = 2; B.miniT = W.sp.bossMinis[0] ? 90 : 9e9; fx(W, { k: 'coreopen', x: B.x + B.w / 2, y: B.y + B.h / 2 }); }
    }
    if (part === 'C' && B.phase === 2 && B.C.hp <= B.C.max * 0.4) {
      B.phase = 3; if (B.miniT > W.sp.bossMinis[1]) B.miniT = 60; W.events.push('bossrage'); W.events.push({ say: 'The Mothership is angry!' }); fx(W, { k: 'rage', x: B.x + B.w / 2, y: B.y + B.h / 2 });
    }
    if (B.C.hp <= 0) {
      var bonus = 1000 * Math.max(1, Math.round(W.wave / BOSS_EVERY));
      B.dead = 150; W.bombs = []; W.minis = []; W.beam = null;
      addScore(W, bonus);
      W.events.push({ sfx: 'bossdie', x: B.x + B.w / 2 }); W.events.push({ say: 'Mothership destroyed! +' + bonus });
      fx(W, { k: 'bossdie', x: B.x + B.w / 2, y: B.y + B.h / 2, pts: bonus });
    }
    return 'hit';
  }
  function bossStep(W, f) {
    var B = W.boss, sp = W.sp, P = W.player;
    B.t += f;
    if (B.flash) B.flash--; if (B.L.flash) B.L.flash--; if (B.R.flash) B.R.flash--;
    if (B.dead) {
      if (B.dead % 9 === 0) fx(W, { k: 'bossboom', x: B.x + W.rng() * B.w, y: B.y + W.rng() * B.h });
      if (--B.dead === 0) W.boss = null;
      return;
    }
    var spd = sp.bossSpeed * (B.phase === 3 ? 1.5 : B.phase === 2 ? 1.1 : 1) * f;   // (the core is a small target: it mustn't race about - farm, 9 Oct)
    B.x += B.dir * spd;
    if (B.x < LEFT) { B.x = LEFT; B.dir = 1; }
    if (B.x + B.w > RIGHT) { B.x = RIGHT - B.w; B.dir = -1; }
    B.y = BOSS_Y + Math.sin(B.t / 45) * (B.phase === 3 ? 8 : 6);
    if ((B.fireT -= f) <= 0) {
      var by = B.y + B.h, cx;
      if (B.phase === 1) {   // the guns take turns, aimed at you
        B.fireT = Math.round(sp.bossFire * 0.55 * (0.8 + W.rng() * 0.4));
        var guns = []; if (B.L.hp > 0) guns.push(8); if (B.R.hp > 0) guns.push(40);
        cx = B.x + guns[B.gun++ % guns.length];
        W.bombs.push({ x: cx - 1, y: by - 2, dx: clamp((P.x + 6.5 - cx) / 90, -0.9, 0.9), kind: 3, f: 0 });
      } else {   // the core: fans of plasma, wider when it's angry
        B.fireT = Math.round(sp.bossFire * (B.phase === 3 ? 0.65 : 0.95) * (0.8 + W.rng() * 0.4));
        var n = B.phase === 3 ? 5 : 3; cx = B.x + B.w / 2 - 1;
        for (var k = 0; k < n; k++) W.bombs.push({ x: cx, y: by, dx: (k - (n - 1) / 2) * 0.45, kind: 3, f: 0 });
      }
      W.events.push({ sfx: 'bossfire', x: cx }); fx(W, { k: 'bossfire', x: cx + 1, y: by });
    }
    var every = sp.bossMinis[B.phase === 3 ? 1 : 0];
    if (B.phase >= 2 && every && (B.miniT -= f) <= 0 && W.minis.length < 6) {   // the open core sends down little ones
      B.miniT = every;
      addMinis(W, B.x + B.w / 2, B.y + B.h, 'boss');
    }
    beat(W, Math.round(14 + 30 * B.hp / B.max));   // the heartbeat quickens as it weakens
  }

  // ---------------------------------------------------------------- bombs
  function sniperFire(W, f) {   // a sniper (red eyes) now and then fires a bolt aimed at the ship
    if ((W.snipeT -= f) > 0) return;
    W.snipeT = Math.round((W.sp.snipe || 170) * (0.7 + W.rng() * 0.6));
    var bolts = 0, snip = [], i;
    for (i = 0; i < W.bombs.length; i++) if (W.bombs[i].kind === 4) bolts++;
    if (bolts >= 2) return;
    for (i = 0; i < W.invaders.length; i++) { var v = W.invaders[i]; if (v.alive && !v.dv && v.kind === 'sniper') snip.push(v); }
    if (!snip.length) return;
    var s = snip[Math.floor(W.rng() * snip.length)], sq = pos(s), x = sq.x + 5, y = sq.y + 8, T = Math.max(20, (PY - y) / W.sp.bomb);
    W.bombs.push({ x: x, y: y, dx: clamp((W.player.x + 6.5 - x - 1.5) / T, -1.1, 1.1), kind: 4, f: 0, src: 'snipe' });
    W.events.push({ sfx: 'snipe', x: x }); fx(W, { k: 'snipe', x: x + 1.5, y: y });
  }
  function dropBombs(W, f) {
    if (W.stage) return;
    if (W.enh) sniperFire(W, f == null ? 1 : f);
    // Gentle, first wave: no bombs until the player has moved or fired (or 10 seconds have gone) - a beginner lost a life
    // in 3-5 seconds while still finding the controls (games audit, 5 Oct 2026)
    if (W.wave === 1 && W.sp.name === 'Gentle' && !W.touched && !W.shotsFired && W.frame < 600) return;
    if ((W.bombT -= (f == null ? 1 : f)) > 0 || W.bombs.length >= W.sp.bombs) return;
    var reload = W.sp.reload * Math.max(0.6, 1 - (W.wave - 1) * 0.06);
    W.bombT = Math.round(reload * (0.6 + W.rng() * 0.8));
    // the lowest invader in each column can drop one (not one that is out diving); a third of the time it's the column above the ship
    var low = {};
    for (var i = 0; i < W.invaders.length; i++) { var v = W.invaders[i]; if (v.alive && !v.dv && (!low[v.c] || v.y > low[v.c].y)) low[v.c] = v; }
    var cols = Object.keys(low); if (!cols.length) return;
    var shooter = null;
    if (W.rng() < 0.34) {
      var px = W.player.x + 6.5, best = 999;
      cols.forEach(function (k) { var b = slotBox(low[k]), d = Math.abs(b.x + b.w / 2 - px); if (d < best) { best = d; shooter = low[k]; } });
    } else shooter = low[cols[Math.floor(W.rng() * cols.length)]];
    var sp0 = pos(shooter); W.bombs.push({ x: sp0.x + 5, y: sp0.y + 8, dx: 0, kind: Math.floor(W.rng() * 3), f: 0 });
  }

  function moveBombs(W, f) {
    var P = W.player, sp = W.sp; f = f == null ? 1 : f;
    for (var i = W.bombs.length - 1; i >= 0; i--) {
      var B = W.bombs[i];
      B.y += sp.bomb * f; B.x += (B.dx || 0) * f; B.f++;
      if (B.x < -4 || B.x > WIDTH + 1) { W.bombs.splice(i, 1); continue; }
      var hit = shieldAt(W, B.x, B.y + 4, 3, 3);
      if (hit) { splat(W, hit); W.bombs.splice(i, 1); continue; }
      // the ship: its body and its nose
      var bb = { x: B.x, y: B.y, w: 3, h: 7 };
      if (overlap(bb, { x: P.x + 1, y: PY + 3, w: 11, h: 5 }) || overlap(bb, { x: P.x + 5, y: PY, w: 3, h: 3 })) {
        W.bombs.splice(i, 1);
        if (W.shieldUp) { W.shieldUp = false; W.events.push({ sfx: 'shieldpop', x: P.x + 6 }); W.events.push({ say: 'Your shield took that one' }); fx(W, { k: 'shieldpop', x: P.x + 6.5, y: PY + 2 }); continue; }
        killPlayer(W, B.kind === 3 ? 'plasma' : B.kind === 4 ? 'snipe' : B.src === 'dive' ? 'divebomb' : 'bomb'); return;
      }
      if (B.y + 7 >= GROUND) { W.booms.push({ kind: 'small', x: B.x - 2, y: GROUND - 6, t: 10 }); fx(W, { k: 'ground', x: B.x + 1, y: GROUND }); W.bombs.splice(i, 1); }
    }
  }

  function moveSaucer(W, f) {
    if (W.stage) return;
    var U = W.saucer;
    if (!U) {
      if (--W.saucerT <= 0) {
        if (alive(W) >= 8) { var dir = W.shotsFired % 2 ? -1 : 1; W.saucer = { x: dir > 0 ? -16 : WIDTH, dir: dir }; }
        else W.saucerT = 600;
      }
      return;
    }
    U.x += U.dir * W.sp.saucer * (f == null ? 1 : f);
    if (W.frame % 7 === 0) W.events.push({ sfx: 'ufo', n: W.ufoN++, x: U.x + 8 });
    if (U.x < -18 || U.x > WIDTH + 2) { W.saucer = null; W.saucerT = 1500; }
  }

  function hud(W) { return { score: W.score, lives: Math.max(0, W.lives), wave: W.wave }; }

  return {
    WIDTH: WIDTH, HEIGHT: HEIGHT, PY: PY, GROUND: GROUND, ROWS: ROWS, COLS: COLS, SPEEDS: SPEEDS, POINTS: POINTS, MYSTERY: MYSTERY,
    SHIELD_Y: SHIELD_Y, SAUCER_Y: SAUCER_Y, EXTRA_AT: EXTRA_AT, EXTRA_EVERY: EXTRA_EVERY, BOSS_EVERY: BOSS_EVERY, BOSS_W: BOSS_W, BOSS_H: BOSS_H,
    BOSS_GUN_L: BOSS_GUN_L, BOSS_GUN_R: BOSS_GUN_R, MINI_W: MINI_W, MINI_H: MINI_H, MINI_PTS: MINI_PTS,
    POWER_NAMES: POWER_NAMES, SHAPES: SHAPES, WAVES: WAVES, KIND_PTS: KIND_PTS, PATHS: PATHS, GROUPS: GROUPS, PER_GROUP: PER_GROUP, phased: phased,
    newWorld: newWorld, step: step, hud: hud, alive: alive, box: box, slotBox: slotBox, pos: pos, shieldAt: shieldAt, nextWave: nextWave
  };
});
