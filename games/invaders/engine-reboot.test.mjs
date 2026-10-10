// 365 Invaders - the REBOOT's new play (9 Oct 2026): divers, armour, splitters, the laser, slow time and the three-stage
// Mothership. node --test games/invaders/engine-reboot.test.mjs. Never deployed (**/*.test.mjs is excluded).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E0 = createRequire(import.meta.url)('./engine.js');
// the mechanics tests run calm: no flying in, no weaving (the swarm has its own tests, engine-swarm.test.mjs)
const E = { ...E0, newWorld: (speed, seed, style) => E0.newWorld(speed, seed, style, { calm: true }) };

const idle = {};
function play(W, n, input) { for (let i = 0; i < n && !W.over; i++) { E.step(W, input || idle); W.events.length = 0; } }
// the mechanics tests keep the classic block on every wave (the ten different waves have their own tests, engine-waves.test.mjs)
function blockWorld(speed, seed) { const W = E.newWorld(speed, seed, 'enh'); W.plan = [E.WAVES[0]]; return W; }
function toPlay(W) { let g = 0; while (W.phase !== 'play' && g++ < 400) { E.step(W, idle); W.events.length = 0; } }
function only(W, keep) { W.invaders.forEach((v, i) => { v.alive = keep.includes(i); v.dv = null; }); }
function still(W) { W.sp = { ...W.sp, rate: 0 }; W.bombT = 1e9; W.saucerT = 1e9; W.diveT = 1e9; }
function toWave(W, n) { while (W.wave < n) { only(W, []); W.minis = []; W.boss = null; toPlay(W); W.boss = null; E.step(W, idle); play(W, 160); } toPlay(W); }   // (a Mothership on the way is dismissed)
function events(W, n, input) { const seen = []; for (let i = 0; i < n && !W.over; i++) { E.step(W, input || idle); seen.push(...W.events.map((e) => (typeof e === 'string' ? e : e.sfx || 'say'))); W.events.length = 0; } return seen; }
function shotAt(W, x, y) { W.shots.push({ x: x, y: y, dx: 0, vy: 4, spread: false }); }

test('Retro has none of the new play: no armour, no splitters, no divers, no little ones', () => {
  const C = E.newWorld(2, 4); toWave(C, 3);
  assert.ok(C.invaders.every((v) => !v.armor && !v.split));
  C.bombT = 1e9; C.saucerT = 1e9;
  for (let i = 0; i < 1500 && !C.over && C.phase === 'play'; i++) { E.step(C, idle); C.events.length = 0; assert.ok(C.invaders.every((v) => !v.dv)); }
  assert.equal(C.minis.length, 0);
});

// the waves the new play starts from are set per speed (the playtest farm's balance), so the tests read them
const C = E.SPEEDS[2];   // Classic

test('divers: from their wave an invader peels off, dives at the ship, and flies home to its place if it misses', () => {
  const B = blockWorld(2, 3); toWave(B, C.diveFrom - 1); B.diveT = 1; play(B, 5);
  assert.ok(B.invaders.every((q) => !q.dv), 'none the wave before');
  const W = blockWorld(2, 3); toWave(W, C.diveFrom); still(W); W.shields = [];
  W.diveT = 1; const ev = events(W, 2);
  const v = W.invaders.find((q) => q.dv);
  assert.ok(v, 'one has left the formation'); assert.ok(ev.includes('dive'));
  const phases = new Set();
  for (let i = 0; i < 1200 && v.dv; i++) {
    W.player.x = v.dv.x < 112 ? 190 : 10;   // keep the ship out of its way
    W.bombs = []; E.step(W, idle); W.events.length = 0; if (v.dv) phases.add(v.dv.ph);
  }
  assert.deepEqual([...phases], ['peel', 'dive', 'back']);
  assert.equal(v.dv, null, 'back in the formation'); assert.ok(v.alive);
  // shot while diving: double points
  W.diveT = 1; play(W, 2); const d = W.invaders.find((q) => q.dv); play(W, 60);
  assert.equal(d.dv.ph, 'dive');
  const far = W.invaders.reduce((a, q) => (Math.abs(q.x - d.dv.x) > Math.abs(a.x - d.dv.x) ? q : a), W.invaders[0]);
  W.invaders.forEach((q) => { if (q !== d && q !== far) q.alive = false; });   // nothing else in the shot's way
  const p = E.pos(d);
  W.shots = []; W.fx.length = 0; shotAt(W, p.x + 6, p.y + 12); play(W, 2);
  assert.equal(d.alive, false);
  const k = W.fx.find((e) => e.k === 'kill');
  assert.ok(k.dive); assert.equal(k.pts, E.POINTS[d.r] * 2, 'worth double');
});

test('a diver that flies into the ship costs a life; with the shield up it is the diver that goes', () => {
  const W = blockWorld(2, 3); toWave(W, 2); still(W); W.shields = [];
  const P = W.player, v = W.invaders[44];
  v.dv = { t: 50, ph: 'dive', x: P.x + 0.5, y: E.PY - 9, sx: v.x, sy: v.y, side: 1, vx: 0, vy: 1.4, bombs: 0 };
  W.shieldUp = true; play(W, 8);
  assert.equal(P.dead, 0, 'the shield took it'); assert.equal(W.shieldUp, false); assert.equal(v.alive, false);
  const lives = W.lives, u = W.invaders[45];
  u.dv = { t: 50, ph: 'dive', x: P.x + 0.5, y: E.PY - 9, sx: u.x, sy: u.y, side: 1, vx: 0, vy: 1.4, bombs: 0 };
  play(W, 8);
  assert.equal(W.lives, lives - 1, 'a life lost');
});

test('armour: from its wave the top row needs two hits - the first knocks the armour off', () => {
  const A = blockWorld(2, 2); toWave(A, C.armour[0] - 1);
  assert.ok(A.invaders.every((v) => !v.armor), 'none the wave before');
  const W = blockWorld(2, 2); toWave(W, C.armour[0]); still(W); W.shields = [];
  assert.ok(W.invaders.filter((v) => v.r === 0).every((v) => v.armor === 1) && W.invaders.filter((v) => v.r > 0).every((v) => !v.armor), 'the top row only');
  only(W, [3, 50]); const v = W.invaders[3], b = E.box(v), s0 = W.score;
  W.player.x = b.x + b.w / 2 - 6; E.step(W, { fire: true }); play(W, 60);
  assert.ok(v.alive, 'still there'); assert.equal(v.armor, 0, 'armour off'); assert.equal(W.score - s0, 5);
  E.step(W, { fire: true }); play(W, 60);
  assert.equal(v.alive, false); assert.equal(W.score - s0, 5 + 30);
  const W4 = blockWorld(2, 2); toWave(W4, C.armour[1]);
  assert.ok(W4.invaders.filter((v) => v.r <= 1).every((v) => v.armor === 1), 'two rows later on');
});

test('splitters burst into two little ones that home in on the ship; the wave is not clear until they are gone', () => {
  const W = blockWorld(2, 6); toWave(W, C.splitFrom); still(W); W.shields = [];
  const s = W.invaders.find((v) => v.split);
  assert.ok(s, 'a splitter on its wave'); assert.ok(s.r >= 3, 'in the bottom rows');
  const idx = W.invaders.indexOf(s); only(W, [idx]); const b = E.box(s);
  W.player.x = b.x + b.w / 2 - 6; const ev = events(W, 1, { fire: true });
  for (let i = 0; i < 60 && s.alive; i++) ev.push(...events(W, 1));
  assert.equal(s.alive, false); assert.ok(ev.includes('split'));
  assert.equal(W.minis.length, 2, 'two little ones');
  W.player.x = 10; play(W, 30);   // the ship well off to the left
  assert.ok(W.minis.length && W.minis.every((q) => q.vx < 0), 'they steer towards the ship');
  W.minis.push({ x: 100, y: 60, vx: 0, vy: 0, t: 0, f: 0 }); W.minis.forEach((q) => { q.y = 60; q.vy = 0; });
  W.sp = { ...W.sp, dive: 0 };   // hold them up there
  play(W, 5); assert.equal(W.phase, 'play', 'not clear with little ones left');
  W.minis = []; play(W, 3); assert.equal(W.phase, 'clear');
});

test('the laser: hold fire for a beam that burns through what is above the ship - shields do not stop it', () => {
  const W = blockWorld(2, 7); toPlay(W); still(W);
  W.power = { kind: 'laser', t: 400, max: 400 };
  only(W, [47, 36, 0]);   // one above the other in the same column (and one elsewhere, so the wave isn't cleared)
  const b = E.box(W.invaders[47]); W.player.x = b.x + b.w / 2 - 6;
  const ev = events(W, 14, { fire: true });
  assert.ok(ev.includes('laseron') && ev.includes('laser'));
  assert.equal(W.shots.length, 0, 'no shots - a beam');
  assert.equal(W.invaders[47].alive, false, 'the lower one');
  assert.equal(W.invaders[36].alive, false, 'then the one above it');
  assert.ok(W.beam, 'the beam is on while fire is held'); play(W, 2); assert.equal(W.beam, null, 'and off when it is let go');
});

test('slow time: the formation, the bombs and the divers run at half speed', () => {
  const run = (slow) => { const W = blockWorld(2, 8); toPlay(W); W.bombT = 1e9; W.saucerT = 1e9; W.diveT = 1e9; W.shields = []; W.slow = slow;
    W.bombs.push({ x: 20, y: 60, dx: 0, kind: 0, f: 0 }); W.player.x = 180; const x0 = W.invaders[44].x; play(W, 30); return { bomb: W.bombs[0].y - 60, march: W.acc + (W.invaders.reduce((n, v) => n + Math.abs(v.x - (26 + v.c * 16)) / 2, 0)) }; };
  const fast = run(0), slow = run(400);
  assert.ok(Math.abs(slow.bomb - fast.bomb / 2) < 0.6, 'bombs at half speed: ' + slow.bomb + ' vs ' + fast.bomb);
  assert.ok(slow.march < fast.march * 0.7, 'the march slowed');
  const W = blockWorld(2, 8); toPlay(W); W.caps.push({ x: W.player.x + 6, y: E.PY - 6, kind: 'slow', t: 0 }); play(W, 8);
  assert.ok(W.slow > 0, 'a capsule turns it on'); assert.equal(W.power, null, 'and it does not take the weapon slot');
});

test('capsules now also bring the laser and slow time', () => {
  const W = blockWorld(2, 11); toPlay(W); still(W); W.shields = [];
  W.sp = { ...W.sp, cap: 1 }; const kinds = new Set();
  for (let i = 0; i < 44; i++) {
    if (i % 11 === 10) continue;   // (column 10 is behind the one kept alive)
    W.caps = []; W.fx.length = 0; only(W, [i, 54]); const b = E.box(W.invaders[i]); W.player.x = b.x + b.w / 2 - 6; W.power = null; W.slow = 0;
    E.step(W, { fire: true }); play(W, 70); W.fx.forEach((f) => { if (f.k === 'capdrop') kinds.add(f.kind); });
  }
  assert.equal(W.wave, 1, 'all on the one wave');
  ['rapid', 'spread', 'shield', 'laser', 'slow'].forEach((k) => assert.ok(kinds.has(k), k + ' dropped'));
});

test('every 5th wave is the Mothership, in three stages: guns first, then the core, then it turns angry', () => {
  const W = blockWorld(1, 5);
  toWave(W, 5);
  assert.ok(W.boss, 'the Mothership'); assert.equal(W.invaders.length, 0, 'no formation');
  assert.equal(W.phase, 'play');
  W.shields = []; W.sp = { ...W.sp, bossSpeed: 0 };   // held still, so a shot lands where it is aimed
  const B = W.boss, fire = (gx) => { W.bombs = []; W.minis = []; W.player.x = B.x + gx - 6; const ev = []; E.step(W, { fire: true }); ev.push(...W.events.map((e) => (typeof e === 'string' ? e : e.sfx || 'say'))); W.events.length = 0; return ev; };
  // the core is shielded while a gun is up
  const core0 = B.C.hp; let seen = [];
  for (let i = 0; i < 120; i++) seen.push(...fire(24));
  assert.equal(B.C.hp, core0, 'no damage to the core'); assert.ok(seen.includes('deflect'));
  // the left gun, then the right
  seen = []; for (let i = 0; i < 3000 && B.L.hp > 0; i++) seen.push(...fire(7));
  assert.equal(B.L.hp, 0); assert.ok(seen.includes('bosspart')); assert.equal(B.phase, 1, 'still guarded by the right gun');
  for (let i = 0; i < 3000 && B.R.hp > 0; i++) fire(41);
  assert.equal(B.phase, 2, 'both guns gone: the core is open');
  // a shot through the gap where a gun was flies on, to the top
  const hp0 = B.hp; W.fx.length = 0; for (let i = 0; i < 70; i++) fire(7);
  assert.equal(B.hp, hp0, 'nothing there to hit'); assert.ok(W.fx.some((e) => e.k === 'top'), 'it flew on to the top');
  // the core, until it turns angry, then until it goes
  seen = []; for (let i = 0; i < 6000 && W.boss && !B.dead; i++) seen.push(...fire(24));
  assert.ok(seen.includes('bossrage'), 'angry when weak'); assert.ok(B.dead > 0, 'destroyed'); assert.ok(seen.includes('bossdie'));
  assert.ok(W.score >= 1000, 'with the bonus');
  play(W, 400);
  assert.equal(W.wave, 6); assert.equal(W.invaders.length, 55, 'then a formation again');
});

test('the Mothership: its guns take turns firing at you; the open core fires fans of three, five when angry, and sends down little ones', () => {
  const W = blockWorld(2, 9); toPlay(W); still(W); W.invaders = []; W.order = []; W.shields = [];
  W.boss = { x: 88, y: 40, w: 48, h: 20, hp: 30, max: 30, dir: 1, t: 0, fireT: 3, phase: 1, dead: 0, flash: 0, drops: 0,
    L: { hp: 4, max: 4, flash: 0 }, R: { hp: 4, max: 4, flash: 0 }, C: { hp: 22, max: 22 }, gun: 0, miniT: 999 };
  W.player.x = 20; play(W, 5);
  assert.equal(W.bombs.length, 1, 'one aimed shot'); assert.ok(W.bombs[0].dx < 0, 'aimed at the ship (to its left)');
  W.bombs = []; W.boss.L.hp = 0; W.boss.R.hp = 0; W.boss.phase = 2; W.boss.fireT = 1; E.step(W, idle);
  assert.equal(W.bombs.length, 3, 'a fan of three');
  W.bombs = []; W.boss.phase = 3; W.boss.fireT = 1; E.step(W, idle);
  assert.equal(W.bombs.length, 5, 'five when angry');
  W.boss.miniT = 1; E.step(W, idle);
  assert.equal(W.minis.length, 2, 'two little ones');
});
