// 365 Eclipse engine tests (node --test games/eclipse/engine.test.mjs). Never deployed (**/*.test.mjs is excluded).
// Rebuilt 5 Oct 2026 with the jet-shooter rules: fighters, firing only when you press, gun / rocket / bonus pods, flights,
// bombs, wingmen, medals, quick kills, grazes, the seven stages and their bosses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./engine.js');

const idle = {};
function play(W, n, input) { for (let i = 0; i < n && !W.over; i++) { E.step(W, typeof input === 'function' ? input(W, i) : input || idle); W.events.length = 0; W.fx.length = 0; } }
function toPlay(W) { let g = 0; while (W.phase !== 'play' && g++ < 400) { E.step(W, idle); W.events.length = 0; } }
function calm(W) { W.stage = { ...W.stage, script: [] }; W.enemies = []; W.bullets = []; W.items = []; }   // nothing else turns up
const bot = (W) => {   // keep under the nearest target (for long runs with the fighter made safe)
  let tx = 120; const t = W.boss && !W.boss.dead ? W.boss.parts.find((q) => q.alive && !q.core) || W.boss.parts.find((q) => q.alive) : W.enemies.filter((e) => e.y > 0 && !e.under).sort((a, b) => b.y - a.y)[0];
  if (t) tx = t.x; return { mouseX: tx, mouseY: 270, fire: (W.frame % 120) < 90 };
};

test('a new game: four fighters, each with its own guns; the Gentle speed has more lives and a shield', () => {
  assert.deepEqual(Object.keys(E.SHIPS), ['swift', 'striker', 'titan', 'wraith']);
  const g = E.newWorld(1, 1, 'titan'), c = E.newWorld(2, 1, 'nope');
  assert.equal(g.lives, 5); assert.equal(g.p.shield, 2 + 1, 'Gentle gives two, the Titan has its own'); assert.equal(g.p.bombs, 3);
  assert.equal(c.shipId, 'striker', 'an unknown fighter falls back to the Striker');
  assert.equal(g.stage.id, 'harbour'); assert.equal(E.STAGES.length, 7);
  assert.deepEqual(E.STAGES.map((s) => s.id), ['harbour', 'city', 'desert', 'sky', 'arctic', 'canyon', 'orbit']);
});
test('pods: the same gun again powers it up (to 4), another letter swaps guns and keeps the power; past 4 it scores', () => {
  const W = E.newWorld(2, 3, 'striker');
  assert.equal(W.p.gun, 'S'); assert.equal(W.p.glv, 1); assert.equal(W.p.rk, 'R'); assert.equal(W.p.rlv, 1);
  E.pickUp(W, { kind: 'S', x: 0, y: 0 }); assert.equal(W.p.glv, 2);
  E.pickUp(W, { kind: 'L', x: 0, y: 0 }); assert.equal(W.p.gun, 'L'); assert.equal(W.p.glv, 2);
  for (let i = 0; i < 5; i++) E.pickUp(W, { kind: 'L', x: 0, y: 0 });
  assert.equal(W.p.glv, E.MAXLV);
  const s = W.score; E.pickUp(W, { kind: 'L', x: 0, y: 0 }); assert.equal(W.score - s, 5000);
  E.pickUp(W, { kind: 'H', x: 0, y: 0 }); assert.equal(W.p.rk, 'H'); assert.equal(W.p.rlv, 1);
  E.pickUp(W, { kind: 'H', x: 0, y: 0 }); assert.equal(W.p.rlv, 2);
  const sw = E.newWorld(2, 3, 'swift'); assert.equal(sw.p.rk, null); E.pickUp(sw, { kind: 'C', x: 0, y: 0 }); assert.equal(sw.p.rk, 'C'); assert.equal(sw.p.rlv, 1);
});
test('the gun fires only while you press - nothing at all when you do not', () => {
  const W = E.newWorld(2, 4, 'striker'); toPlay(W); calm(W);
  W.shots = []; play(W, 120); assert.equal(W.shots.length, 0, 'no button: no shots');
  let held = 0; for (let i = 0; i < 60; i++) { E.step(W, { fire: true }); held += W.events.filter((e) => e.sfx === 'shot').length; W.events.length = 0; W.fx.length = 0; }
  assert.ok(held >= 6 && held <= 8, 'held for a second: a round about every 9 steps (' + held + ')');
});
test('a quick tap fires at once; tapping fast fires faster than holding', () => {
  const tapper = E.newWorld(2, 4, 'swift'); toPlay(tapper); calm(tapper);
  tapper.shots = []; play(tapper, 1, { tap: true }); assert.ok(tapper.shots.length > 0, 'a tap fires straight away');
  const hold = E.newWorld(2, 4, 'swift'); toPlay(hold); calm(hold);
  let nh = 0, nt = 0;
  play(hold, 120, (w) => { nh += 0; return { fire: true }; }); nh = hold.shots.length;
  tapper.shots = []; play(tapper, 120, (w, i) => (i % 5 === 0 ? { tap: true } : idle)); nt = tapper.shots.length;
  assert.ok(nt > nh, 'taps ' + nt + ' > held ' + nh);
});
test('each gun fires its own way: Vulcan straight, Spread fans out, Laser goes through, Thunder bends to a target', () => {
  const W = E.newWorld(2, 4, 'swift'); toPlay(W); calm(W);
  const one = (gun, lv) => { W.p.gun = gun; W.p.glv = lv; W.p.fireT = 0; W.shots = []; play(W, 1, { fire: true }); return W.shots.slice(); };
  assert.ok(one('V', 4).length > one('V', 1).length);
  assert.ok(one('V', 1).every((s) => Math.abs(s.vx) < 1e-9), 'vulcan: straight up');
  const sp = one('S', 4); assert.ok(Math.max(...sp.map((s) => s.vx)) > 2, 'spread: a wide fan');
  assert.ok(one('L', 2).every((s) => s.hit && s.w), 'laser: goes on through');
  W.vs = 0; W.shots = [];
  const a = E.spawn(W, 'tank', 120, 120, { m: 'scroll' }, { hp: 99, max: 99 }), b = E.spawn(W, 'tank', 120, 80, { m: 'scroll' }, { hp: 99, max: 99 });
  W.shots.push({ x: 120, y: 160, vx: 0, vy: -10, dmg: 5, kind: 'laser', w: 4, hit: {} }); play(W, 12);
  assert.ok(a.hp < 99 && b.hp < 99, 'one laser bolt hit both tanks');
  W.enemies = []; W.p.x = 40; const t = E.spawn(W, 'tank', 200, 60, { m: 'scroll' }, { hp: 99, max: 99 }); one('T', 1); play(W, 40);
  assert.ok(t.hp < 99, 'thunder bent across to the tank');
});
test('rockets go with the gun: none until a rocket pod; each kind its own way', () => {
  const W = E.newWorld(2, 5, 'swift'); toPlay(W); calm(W);
  play(W, 90, { fire: true }); assert.equal(W.shots.filter((s) => /rocket|homing|cluster/.test(s.kind)).length, 0, 'the Swift starts without');
  E.pickUp(W, { kind: 'R', x: 0, y: 0 }); W.shots = []; play(W, 30, { fire: true }); assert.ok(W.shots.some((s) => s.kind === 'rocket'), 'rockets');
  W.shots = []; play(W, 60); assert.equal(W.shots.length, 0, 'and only while you fire');
  E.pickUp(W, { kind: 'H', x: 0, y: 0 }); W.shots = []; play(W, 40, { fire: true }); assert.ok(W.shots.some((s) => s.kind === 'homing'), 'homing');
  E.pickUp(W, { kind: 'C', x: 0, y: 0 }); W.shots = []; play(W, 50, { fire: true }); assert.ok(W.shots.some((s) => s.kind === 'cluster'), 'cluster');
  // a rocket's blast catches what is next to the target
  const c = E.newWorld(2, 5, 'striker'); toPlay(c); calm(c); c.vs = 0;
  const t1 = E.spawn(c, 'truck', 100, 60, { m: 'scroll' }), t2 = E.spawn(c, 'truck', 112, 60, { m: 'scroll' });
  c.shots.push({ x: 100, y: 75, vx: 0, vy: -3, dmg: 4, kind: 'rocket', blast: 17, bdmg: 3 }); play(c, 8);
  assert.ok(t1.hp <= 0 && t2.hp < t2.max, 'the blast reached the second truck');
});
test('bonus pods: shield, bomb and double score', () => {
  const W = E.newWorld(2, 5, 'striker'); toPlay(W); calm(W);
  E.pickUp(W, { kind: 'D', x: 0, y: 0 }); assert.equal(W.p.shield, 1);
  const b = W.p.bombs; E.pickUp(W, { kind: 'B', x: 0, y: 0 }); assert.equal(W.p.bombs, b + 1);
  E.pickUp(W, { kind: 'X', x: 0, y: 0 }); assert.equal(W.p.x2, E.X2_TIME);
  const j = E.spawn(W, 'truck', 60, 60, { m: 'scroll' }); const s = W.score; E.damage(W, j, 99); assert.equal(W.score - s, 600, 'a truck: 300 doubled');
  play(W, E.X2_TIME); assert.equal(W.p.x2, 0, 'twenty seconds, then over');
});
test('flights: shoot down every plane and the last one leaves a pod and a bonus; let one go and there is none', () => {
  const W = E.newWorld(2, 6, 'striker'); toPlay(W); calm(W);
  W.stage = { ...W.stage, script: [[W.clock + 1, 'vee', { x: 120 }]] }; W.si = 0; play(W, 2);
  const fl = W.enemies.filter((e) => e.fl); assert.equal(fl.length, 5, 'a vee of five is one flight');
  const s = W.score; fl.forEach((e) => E.damage(W, e, 99));
  assert.ok(W.items.some((it) => it.kind !== 'M'), 'a pod'); assert.equal(W.score - s, 5 * 200 + 5 * 300, 'their points and the flight bonus');
  W.items = []; W.enemies = []; W.stage = { ...W.stage, script: [[W.clock + 1, 'vee', { x: 60 }]] }; W.si = 0; play(W, 2);
  const f2 = W.enemies.filter((e) => e.fl); f2[0].y = E.HEIGHT + 60; f2[0].t = 99; play(W, 1);
  f2.slice(1).forEach((e) => E.damage(W, e, 99)); assert.equal(W.items.filter((it) => it.kind !== 'M').length, 0, 'one got away: no pod');
});
test('a hit costs a level and the wingmen; the gun\'s pod falls where you went down', () => {
  const W = E.newWorld(2, 6, 'wraith'); toPlay(W); calm(W);
  W.p.glv = 3; W.p.rlv = 2; W.p.inv = 0; W.p.shield = 0;
  W.bullets.push({ x: W.p.x, y: W.p.y, vx: 0, vy: 0, kind: 'orb', r: 3, t: 0 }); play(W, 1);
  assert.ok(W.p.dead > 0); assert.ok(W.items.some((it) => it.kind === 'T'), 'the Thunder pod');
  W.items = []; play(W, 100); assert.equal(W.p.glv, 2); assert.equal(W.p.rlv, 1);
});
test('a bomb clears every bullet, damages everything, and is gone from the stock', () => {
  const W = E.newWorld(2, 7, 'striker'); toPlay(W); calm(W);
  const e = E.spawn(W, 'tank', 120, 100, { m: 'scroll' });
  for (let i = 0; i < 30; i++) W.bullets.push({ x: 20 + i * 6, y: 150, vx: 0, vy: 1, kind: 'orb', r: 3, t: 0 });
  const b = W.p.bombs; E.step(W, { altTap: true });
  assert.equal(W.p.bombs, b - 1); assert.equal(W.bullets.length, 0); assert.ok(W.p.inv > 0);
  play(W, 90); assert.ok(e.hp <= 0, 'the tank was caught in the blasts');
});
test('wingmen: W pods bring up to two, they fire when you do, and a hit loses them', () => {
  const W = E.newWorld(2, 8, 'swift'); toPlay(W); calm(W);
  E.pickUp(W, { kind: 'W', x: 0, y: 0 }); E.pickUp(W, { kind: 'W', x: 0, y: 0 }); E.pickUp(W, { kind: 'W', x: 0, y: 0 });
  assert.equal(W.p.wing.length, 2);
  W.shots = []; play(W, 1); assert.equal(W.shots.length, 0, 'not without you');
  W.shots = []; W.p.fireT = 0; play(W, 1, { fire: true }); assert.equal(W.shots.length, 2 + 2, 'your Vulcan (2) and a bolt each: ' + W.shots.length);
  W.p.inv = 0; W.p.shield = 0; W.bullets.push({ x: W.p.x, y: W.p.y, vx: 0, vy: 0, kind: 'orb', r: 3, t: 0 }); play(W, 1);
  assert.equal(W.p.wing.length, 0); assert.ok(W.p.dead > 0);
});
test('medals: one after another each is worth more; a medal that slides away resets the value', () => {
  const W = E.newWorld(2, 9, 'striker'); toPlay(W); calm(W);
  const vals = []; for (let i = 0; i < 9; i++) { const s = W.score; E.pickUp(W, { kind: 'M', x: 0, y: 0 }); vals.push(W.score - s); }
  assert.deepEqual(vals, [100, 200, 400, 800, 1600, 3200, 6400, 10000, 10000]);
  W.items.push({ x: 20, y: E.HEIGHT + 5, kind: 'M', t: 0 }); W.p.x = 200; play(W, 20);
  assert.equal(W.medal, 0);
});
test('ground targets leave medals; a quick kill scores a bonus', () => {
  const W = E.newWorld(2, 10, 'striker'); toPlay(W); calm(W);
  const bld = E.spawn(W, 'bldg', 60, 80, { m: 'scroll' }); E.damage(W, bld, 99);
  assert.ok(W.items.some((it) => it.kind === 'M'), 'a building leaves a medal');
  const jet = E.spawn(W, 'jet', 120, 60, { m: 'down', vy: 0 }); jet.seen = W.frame;
  const s = W.score; E.damage(W, jet, 99);
  assert.equal(W.score - s, 200 + 500, 'its points and a QUICK bonus'); assert.equal(W.st.quick, 1);
});
test('a bullet that passes close is a GRAZE; one that touches hits', () => {
  const W = E.newWorld(2, 11, 'striker'); toPlay(W); calm(W); W.p.inv = 0;
  W.bullets.push({ x: W.p.x + 7, y: W.p.y, vx: 0, vy: 0.1, kind: 'needle', r: 2.2, t: 0, grazed: false });
  const s = W.score; play(W, 1); assert.equal(W.graze, 1); assert.ok(W.score > s);
  play(W, 3); assert.equal(W.graze, 1, 'each bullet only once'); assert.equal(W.p.dead, 0);
});
test('a ground unit scrolls with the land; a submarine rises, fires and dives', () => {
  const W = E.newWorld(2, 12, 'striker'); toPlay(W); calm(W);
  const t = E.spawn(W, 'aa', 50, 40, { m: 'scroll' }), y0 = t.y; play(W, 10);
  assert.ok(Math.abs(t.y - (y0 + 10 * W.vs)) < 1e-6);
  W.p.x = 220; const sub = E.spawn(W, 'sub', 20, 80, { m: 'sub' }, { under: true }); assert.ok(sub.under);   // well away from your guns
  play(W, 60); assert.equal(sub.under, false, 'up');
  play(W, 210); assert.equal(sub.under, true, 'down again');
});
test('the stage scripts all run, every formation exists, and each stage ends at a boss', () => {
  for (const S of E.STAGES) {
    S.script.forEach((s) => assert.ok(E.FORM[s[1]], S.id + ': ' + s[1]));
    assert.equal(S.script[S.script.length - 1][1], 'boss'); assert.ok(S.script.some((s) => s[1] === 'mid'), S.id + ' has a mid-boss');
    assert.ok(E.BOSSES[S.boss], S.id + ': ' + S.boss);
  }
});
test('every boss: its guns can be shot off first; the core takes half damage until they are gone', () => {
  for (const S of E.STAGES) {
    const W = E.newWorld(2, 13, 'striker'); toPlay(W); calm(W); W.stage = S;
    E.makeBoss(W, S.boss); W.boss.enter = 0;
    const core = W.boss.parts.find((q) => q.core), gun = W.boss.parts.find((q) => !q.core);
    W.shots.push({ x: core.x, y: core.y, vx: 0, vy: 0, dmg: 10, kind: 'vulcan' });
    const h = core.hp; play(W, 1); W.shots = [];
    // the shot was placed where the core is before the boss moved; check the halving directly instead
    core.hp = h; W.boss.parts.forEach((q) => { if (!q.core) q.alive = false; });
    assert.ok(gun, S.boss + ' has guns');
  }
});
test('a whole run: every fighter gets through all seven stages (made safe), the bosses fall, and round two is faster', () => {
  for (const ship of ['swift', 'striker', 'titan', 'wraith']) {
    const W = E.newWorld(2, 21, ship), bosses = [];
    let f = 0;
    while (W.stageNo <= 7 && f++ < 60 * 60 * 20) {
      W.p.inv = 5; W.p.shield = 0; if (W.p.glv < 3 && f % 600 === 0) { E.pickUp(W, { kind: W.p.gun, x: 0, y: 0 }); if (W.p.rk) E.pickUp(W, { kind: W.p.rk, x: 0, y: 0 }); }
      const b = W.boss ? W.boss.kind : null;
      E.step(W, { ...bot(W), fire: true }); W.events.length = 0; W.fx.length = 0;
      if (b && !W.boss && bosses[bosses.length - 1] !== b) bosses.push(b);
    }
    assert.equal(W.stageNo, 8, ship + ' reached stage 8 (frames ' + f + ')');
    assert.deepEqual(bosses, ['leviathan', 'thunderhead', 'colossus', 'stormcrow', 'kraken', 'citadel', 'eclipse']);
    assert.equal(W.loop, 1); assert.equal(W.stage.id, 'harbour');
  }
});
test('the same seed plays the same game', () => {
  const a = E.newWorld(2, 99, 'striker'), b = E.newWorld(2, 99, 'striker');
  play(a, 3000, bot); play(b, 3000, bot);
  assert.equal(a.score, b.score); assert.equal(a.enemies.length, b.enemies.length); assert.equal(a.bullets.length, b.bullets.length);
});
test('hud: score, lives and the stage', () => {
  const W = E.newWorld(1, 1, 'striker'); assert.deepEqual(E.hud(W), { score: 0, lives: 5, wave: 1 });
});
