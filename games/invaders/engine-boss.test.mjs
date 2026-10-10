// 365 Invaders - the Mothership as a real fight (11 Oct 2026): escorts, moves, the death beam, the Dreadnought, a life for
// the kill; and anger by depth. node --test games/invaders/engine-boss.test.mjs. Never deployed (**/*.test.mjs is excluded).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E0 = createRequire(import.meta.url)('./engine.js');
const E = { ...E0, newWorld: (speed, seed, style) => E0.newWorld(speed, seed, style, { calm: true }) };

const idle = {};
function play(W, n, input) { for (let i = 0; i < n && !W.over && !W.player.dead; i++) { E.step(W, input || idle); W.events.length = 0; } }
function toBoss(W, wave) {   // straight to a Mothership wave, past its entrance
  while (W.wave < wave - 1) { W.invaders.forEach((v) => { v.alive = false; v.dv = null; }); W.minis = []; W.boss = null; let g = 0; while (W.phase !== 'play' && g++ < 400) E.step(W, idle); E.step(W, idle); play(W, 220); }
  W.invaders.forEach((v) => { v.alive = false; v.dv = null; }); W.minis = []; E.step(W, idle); play(W, 220);
  assert.ok(W.boss, 'a boss wave'); let g = 0; while (W.intro > 0 && g++ < 400) { E.step(W, idle); W.events.length = 0; }
  W.bombT = 1e9; W.saucerT = 1e9;
}
const noFire = (W) => { W.boss.fireT = 1e9; W.boss.miniT = 1e9; };
const openCore = (W) => { const B = W.boss; B.L.hp = 0; B.R.hp = 0; B.phase = 2; B.hp = B.C.hp; };

test('the Mothership launches streams of escorts that swoop out and dive - and a missed dive flies off', () => {
  const W = E.newWorld(2, 11, 'enh'); toBoss(W, 5); noFire(W); W.player.x = 6; W.boss.rayT = 1e9;
  let saw = false, dived = false;
  for (let i = 0; i < 900 && !W.player.dead; i++) {
    E.step(W, idle); W.events.length = 0;
    const esc = W.invaders.filter((v) => v.alive && v.esc);
    if (esc.length) saw = true;
    if (esc.some((v) => v.dv && v.dv.ph === 'dive')) dived = true;
  }
  assert.ok(saw, 'escorts launched'); assert.ok(dived, 'they dive at the ship');
  W.player.x = 200;   // out of the way: every escort ends up gone, none left sitting about
  W.boss.escT = 1e9; play(W, 900);
  assert.ok(W.invaders.every((v) => !v.alive || v.dv), 'no escort settles into a formation');
});

test('shooting down a whole stream of escorts pays 500 and drops a capsule', () => {
  const W = E.newWorld(2, 12, 'enh'); toBoss(W, 5); noFire(W); W.boss.rayT = 1e9; W.boss.escT = 0;
  E.step(W, idle);
  const gid = Object.keys(W.escorts)[0]; assert.ok(gid, 'a stream');
  const stream = W.invaders.filter((v) => String(v.esc) === gid);
  const before = W.score; W.caps = [];
  stream.forEach((v) => { if (v.alive) { const b = E.box(v); W.shots.push({ x: b.x + b.w / 2, y: b.y + b.h / 2 + 4, dx: 0, vy: 4, spread: false }); E.step(W, idle); W.events.length = 0; } });
  // anything not hit by the aimed shot: finish by hand through the same rule
  const left = stream.filter((v) => v.alive).length;
  assert.equal(left, 0, 'all hit');
  assert.ok(W.score - before >= 500, 'the stream bonus');
  assert.ok(W.caps.length >= 1, 'a capsule');
});

test('the death beam: only once the core is open; charged first (harmless), then it sweeps and kills under it', () => {
  const W = E.newWorld(2, 13, 'enh'); toBoss(W, 5); noFire(W); W.boss.escT = 1e9;
  W.boss.rayT = 0; W.boss.mv = null; play(W, 60);
  assert.equal(W.boss.ray, null, 'no beam with both guns on (the Mothership)');
  openCore(W); W.boss.rayT = 0; W.boss.mv = null; W.boss.mvT = 1e9; E.step(W, idle);
  assert.ok(W.boss.ray && W.boss.ray.st === 'charge', 'it charges');
  const B = W.boss; W.player.x = B.x + B.w / 2 - 6.5;   // right under it while it charges: nothing happens yet
  for (let i = 0; i < 70; i++) { E.step(W, idle); W.events.length = 0; }
  assert.equal(W.player.dead, 0, 'charging does no harm');
  for (let i = 0; i < 20 && !W.player.dead; i++) { W.player.x = W.boss.x + W.boss.w / 2 - 6.5; E.step(W, idle); W.events.length = 0; }
  assert.ok(W.player.dead > 0, 'the beam kills under it');
});

test('a shield takes the whole beam; the beam burns a channel through a shield', () => {
  const W = E.newWorld(2, 14, 'enh'); toBoss(W, 5); noFire(W); W.boss.escT = 1e9; openCore(W);
  W.boss.mvT = 1e9; W.boss.rayT = 0; W.player.x = 4; E.step(W, idle);
  for (let i = 0; i < 76; i++) { E.step(W, idle); W.events.length = 0; }
  assert.equal(W.boss.ray.st, 'fire');
  const px0 = W.shields.reduce((n, S) => n + S.px.reduce((a, b) => a + b, 0), 0);
  W.player.x = W.boss.ray.dir > 0 ? 4 : 200; play(W, 100);
  const px1 = W.shields.reduce((n, S) => n + S.px.reduce((a, b) => a + b, 0), 0);
  assert.ok(px1 < px0, 'it burned through a shield: ' + px0 + ' -> ' + px1);
  W.boss.ray = null; W.boss.rayT = 0; W.boss.mv = null; E.step(W, idle); for (let i = 0; i < 76; i++) { E.step(W, idle); W.events.length = 0; }
  W.shieldUp = true; W.player.x = W.boss.x + W.boss.w / 2 - 6.5; E.step(W, idle);
  assert.equal(W.player.dead, 0, 'alive'); assert.equal(W.shieldUp, false, 'the shield went'); assert.equal(W.boss.ray, null, 'and the beam with it');
});

test('it moves with purpose: dashes, swoops down at you (and back), charges when angry', () => {
  const W = E.newWorld(2, 15, 'enh'); toBoss(W, 5); noFire(W); W.boss.escT = 1e9; W.boss.rayT = 1e9; W.player.x = 6;
  const kinds = new Set(); let lowest = 0;
  for (let i = 0; i < 1500; i++) { E.step(W, idle); W.events.length = 0; if (W.boss.mv) kinds.add(W.boss.mv.k); }
  assert.ok(kinds.has('dash'), 'a dash with its guns on');
  openCore(W);
  for (let i = 0; i < 2500; i++) { E.step(W, idle); W.events.length = 0; if (W.boss.mv) kinds.add(W.boss.mv.k); lowest = Math.max(lowest, W.boss.y); }
  assert.ok(kinds.has('swoop'), 'a swoop with the core open'); assert.ok(lowest > 60, 'down towards you: ' + lowest.toFixed(1));
  W.boss.phase = 3;
  for (let i = 0; i < 3000; i++) { E.step(W, idle); W.events.length = 0; if (W.boss.mv) kinds.add(W.boss.mv.k); }
  assert.ok(kinds.has('charge'), 'a charge when angry');
});

test('the Dreadnought (level 10) beams with its guns still on, and sends two streams at once when angry', () => {
  const W = E.newWorld(2, 16, 'enh'); toBoss(W, 10); noFire(W);
  assert.equal(W.boss.tier, 2); assert.equal(W.theme.name, 'Dreadnought');
  W.boss.rayT = 0; W.boss.mv = null; W.boss.mvT = 1e9; E.step(W, idle);
  assert.ok(W.boss.ray, 'a beam with both guns on');
  W.boss.ray = null; W.boss.rayT = 1e9; W.boss.escT = 0; E.step(W, idle);
  assert.equal(Object.keys(W.escorts).length, 1, 'one stream while its guns stand');
  openCore(W); W.boss.phase = 3; W.boss.escT = 0; W.invaders.forEach((v) => { v.alive = false; }); E.step(W, idle);
  assert.equal(Object.keys(W.escorts).length, 3, 'then two at once when it is angry');
});

test('a Mothership shot down is worth a life, and its escorts go with it', () => {
  const W = E.newWorld(2, 17, 'enh'); toBoss(W, 5); noFire(W); W.boss.rayT = 1e9; W.boss.escT = 0; E.step(W, idle);
  assert.ok(W.invaders.some((v) => v.alive && v.esc), 'escorts out');
  openCore(W); W.boss.C.hp = 1; W.boss.hp = 1; const lives = W.lives;
  const B = W.boss; let g = 0;
  while (!B.dead && g++ < 400) { B.mv = null; B.mvT = 1e9; W.shots.push({ x: B.x + B.w / 2, y: B.y + B.h + 2, dx: 0, vy: 4, spread: false }); E.step(W, idle); W.events.length = 0; }
  assert.ok(B.dead, 'shot down');
  assert.equal(W.lives, lives + 1, 'an extra life');
  assert.ok(W.invaders.every((v) => !v.alive), 'its escorts went with it');
});

test('anger: the lower they are, the angrier - and the harder they weave', () => {
  const W = E0.newWorld(2, 18, 'enh'); let g = 0; while (W.entering && g++ < 2000) { E0.step(W, idle); W.events.length = 0; }
  W.sp = { ...W.sp, rate: 0 }; W.bombT = 1e9; W.saucerT = 1e9; W.diveT = 1e9; W.snipeT = 1e9;
  play(W, 60); const top = W.invaders.find((v) => v.alive && v.r === 0), weaveTop = Math.max(...Array.from({ length: 200 }, () => { E0.step(W, idle); W.events.length = 0; return Math.abs(top.wx); }));
  assert.ok(top.ang < 0.2, 'calm near the top: ' + top.ang.toFixed(2));
  W.invaders.forEach((v) => { v.y += 96; }); play(W, 4);
  assert.ok(top.ang > 0.6, 'angry low down: ' + top.ang.toFixed(2)); assert.ok(W.deep > 0.6, 'the formation reads deep');
  const weaveLow = Math.max(...Array.from({ length: 200 }, () => { E0.step(W, idle); W.events.length = 0; return Math.abs(top.wx); }));
  assert.ok(weaveLow > weaveTop * 1.3, 'weaves harder: ' + weaveLow.toFixed(2) + ' vs ' + weaveTop.toFixed(2));
});

test('the same seed plays the same boss fight', () => {
  const run = () => { const W = E0.newWorld(2, 99, 'enh'); W.wave = 4; E0.nextWave(W); for (let f = 0; f < 4000 && !W.over; f++) { E0.step(W, { fire: f % 20 < 10, mouseX: 112 + Math.sin(f / 50) * 90 }); W.events.length = 0; } return [W.score, W.lives, W.wave, W.boss ? W.boss.hp : -1].join(); };
  assert.equal(run(), run());
});

test('after its beam the core vents: it holds its fire, and a hit on it counts double', () => {
  const W = E.newWorld(2, 19, 'enh'); toBoss(W, 5); W.boss.escT = 1e9; openCore(W);
  W.boss.mvT = 1e9; W.boss.rayT = 0; W.player.x = 4; E.step(W, idle);
  for (let i = 0; i < 200 && W.boss.ray; i++) { W.player.x = W.boss.ray && W.boss.ray.dir > 0 ? 4 : 200; E.step(W, idle); W.events.length = 0; }
  assert.equal(W.boss.ray, null); assert.ok(W.boss.vent > 0, 'venting');
  W.boss.fireT = 0; W.bombs = []; E.step(W, idle);
  assert.equal(W.bombs.filter((b) => b.kind === 3).length, 0, 'no plasma while it vents');
  const hp = W.boss.C.hp, B = W.boss;
  W.shots.push({ x: B.x + B.w / 2, y: B.y + B.h + 2, dx: 0, vy: 4, spread: false }); for (let i = 0; i < 4; i++) { E.step(W, idle); W.events.length = 0; }
  assert.equal(W.boss.C.hp, hp - 2, 'double damage');
});

test('with both guns shot off in play, the Mothership gets its beam (soon)', () => {
  const W = E.newWorld(2, 21, 'enh'); toBoss(W, 5); noFire(W); W.boss.escT = 1e9; W.player.x = 4;
  const B = W.boss; B.L.hp = 1; B.R.hp = 1;
  for (const gx of [B.x + 8, B.x + 40]) { W.shots.push({ x: gx, y: B.y + B.h + 2, dx: 0, vy: 4, spread: false }); for (let i = 0; i < 6; i++) { B.mv = null; B.mvT = 1e9; E.step(W, idle); W.events.length = 0; } }
  assert.equal(B.phase, 2, 'core open');
  let saw = false; for (let i = 0; i < 400 && !saw; i++) { B.mv = null; B.mvT = 1e9; E.step(W, idle); W.events.length = 0; if (B.ray) saw = true; }
  assert.ok(saw, 'its beam came');
});
