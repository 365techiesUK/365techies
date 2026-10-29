// 365 Star Run engine tests (node --test games/starrun/engine.test.mjs). Never deployed (**/*.test.mjs is excluded).
// 27 Oct 2026, second rework: speed control, rolls, head-on squadrons that shoot, lock-on salvos, the Warden, free flight
// round the warship (generators, bridge, turrets, her main gun and your carrier).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./engine.js');

const idle = {};
function play(W, n, input) { for (let i = 0; i < n && !W.over; i++) { E.step(W, typeof input === 'function' ? input(W, i) : input || idle); W.events.length = 0; W.fx.length = 0; } }
function until(W, cond, max = 20000, input) { let g = 0; while (!cond(W) && g++ < max && !W.over) { E.step(W, typeof input === 'function' ? input(W) : input || idle); W.events.length = 0; W.fx.length = 0; } return cond(W); }
function toPlay(W) { until(W, (w) => w.phase === 'play', 2000, (w) => ({ tap: w.phaseT === 70 })); }
function quiet(W) { W.cue = W.cue.filter((c) => !c.wave && !c.boss); W.objs = W.objs.filter((o) => o.k !== 'turret' && o.k !== 'drone'); }
function aimAt(W, o) { const p = E.project(W, o.x, o.y, o.z); return p ? { mouseX: p.x, mouseY: p.y, fire: true } : idle; }
function steerTo(W, ox, oy) {   // the cursor that flies the ship to valley offsets (ox, oy)
  const C = E.corridor(W), ux = Math.max(-1, Math.min(1, (ox - (C.c || 0)) / ((C.x || 1) * E.REACH))), uy = Math.max(-1, Math.min(1, 1 - 2 * (oy - C.y0) / (C.y1 - C.y0)));
  return { mouseX: E.CX + ux * (E.CX - E.AIM.x0), mouseY: (E.AIM.y0 + E.AIM.y1) / 2 + uy * (E.AIM.y1 - E.AIM.y0) / 2 };
}
function nearestTarget(W, maxZ = 700) {
  let best = null, bz = 1e9;
  for (const o of W.eshots.filter((q) => q.k === 'missile').concat(W.objs)) {
    if (!o.alive || !o.r || o.wait > 0 || o.shielded) continue;
    const p = E.project(W, o.x, o.y, o.z);
    if (p && p.z < maxZ && p.x > 0 && p.x < E.GW && p.y > 0 && p.y < 250 && p.z < bz) { bz = p.z; best = o; }
  }
  return best;
}
// a careful pilot for the valley: steers through gates, under arches, round pillars and the ridge; otherwise shoots
function railBot(W) {
  if (W.phase !== 'play') return { tap: W.phaseT % 40 === 39 };
  if (W.outrun) return { ...steerTo(W, 0, 0), boost: true };   // (chapter 3) its blast behind you: full thrust
  if (W.valley.shoals) {   // (chapter 3) an asteroid - or a big rock, or a thrown one about to land - in your way: steer round it, shooting as you go
    const C0 = E.corridor(W), lim = C0.x * E.REACH - 2;
    const ast = W.objs.filter((o) => o.alive && (o.k === 'asteroid' || (o.k === 'rock' && o.r > 8.5) || (o.k === 'boulder' && o.rs - W.s < 90)) && o.rs - W.s > -2 && o.rs - W.s < 260 && Math.hypot(W.ox - o.lx, W.oy - o.ly) < o.r + 12).sort((a, b) => a.rs - b.rs)[0];
    if (ast) {
      const opts = [[ast.lx - ast.r - 13, W.oy], [ast.lx + ast.r + 13, W.oy], [W.ox, ast.ly - ast.r - 13], [W.ox, ast.ly + ast.r + 13]].filter((p) => Math.abs(p[0] - C0.c) < lim && p[1] > C0.y0 + 1 && p[1] < C0.y1 - 1);
      const best = opts.sort((a, b) => Math.hypot(a[0] - W.ox, a[1] - W.oy) - Math.hypot(b[0] - W.ox, b[1] - W.oy))[0];
      if (best) return { ...steerTo(W, best[0], best[1]), fire: true };
    }
  }
  const R = W.valley.ridge(W.s + 120), C = E.corridor(W), R0 = W.valley.ridge(W.s), side = W.ox >= (R0 || R || { x: 0 }).x ? 1 : -1;
  const mySide = (o) => { const Ro = W.valley.ridge(o.rs); return !Ro || Ro.w < 1 || (o.lx - Ro.x) * side > 0; };   // where the ridge splits the canyon, stay on your side of it
  const bt = W.objs.find((o) => o.alive && o.k === 'butte' && o.rs - W.s > -o.pr && o.rs - W.s < 230 + o.pr && Math.abs(W.ox - o.lx) < o.pr + 22);
  if (bt) { const half = E.corridor(W).x, gx = bt.lx + (bt.lx > 0 ? -1 : 1) * (bt.pr + 24); return steerTo(W, Math.abs(gx) < half - 4 ? gx : bt.lx + (bt.lx > 0 ? 1 : -1) * (bt.pr + 24), 10); }
  const next = W.objs.filter((o) => o.alive && !o.passed && (o.k === 'gate' || o.k === 'arch' || o.k === 'pillar' || o.k === 'rockfall') && o.rs - W.s > 0 && o.rs - W.s < 190 && mySide(o)).sort((a, b) => a.rs - b.rs)[0];
  if (next) {
    if (next.k === 'gate') return steerTo(W, next.lx, next.ly);
    if (next.k === 'rockfall') return steerTo(W, W.ox, next.ly + next.h + 9);
    if (next.k === 'arch') return steerTo(W, next.aw < 900 ? next.lx : W.ox * 0.5, Math.max(C.y0 + 1, next.y0 - 9));
    const side = next.lx > 0 ? -1 : 1; let x = next.lx + side * (next.pr + 12);
    if (R && Math.abs(x - R.x) < R.w + 8) x = next.lx - side * (next.pr + 12);
    return steerTo(W, x, 8);
  }
  if (R && R.w > 0) { const t2 = W.lane ? nearestTarget(W) : null; if (t2) return aimAt(W, t2); return { ...steerTo(W, R.x + R.w + 20, 8), fire: true }; }   // (once its channel is chosen, it is kept to it: shoot)
  const t = nearestTarget(W);
  if (t) return aimAt(W, t);
  return { ...steerTo(W, 0, 8), boost: W.ct % 300 < 150 };   // (a clear stretch: some thrust)
}
// a pilot for the warship: turns towards the nearest thing worth shooting, then shoots it
function freeBot(W) {
  if (W.phase !== 'play') return { tap: W.phaseT % 40 === 39 };
  const S = W.ship, key = (o) => Math.hypot(o.x - S.x, o.y - S.y, o.z - S.z) - (o.k === 'gen' || o.k === 'bridge' ? 900 : 0);
  const goal = W.objs.filter((o) => o.alive && o.r && !o.shielded && !(o.wait > 0) && (o.k === 'gen' || o.k === 'bridge' || o.k === 'dart' || o.k === 'heavy' || o.k === 'gun')).sort((a, b) => key(a) - key(b))[0];
  if (!goal) return { mouseX: E.CX, mouseY: E.CY };
  const d = Math.hypot(goal.x - S.x, goal.y - S.y, goal.z - S.z);
  if (d < 90 && (goal.k === 'gen' || goal.k === 'bridge' || goal.k === 'gun')) return { mouseX: E.AIM.x1, mouseY: E.AIM.y0, fire: true };   // too close: pull away
  const p = E.project(W, goal.x, goal.y, goal.z);
  if (p && p.x > 60 && p.x < 340 && p.y > 40 && p.y < 220) return { mouseX: p.x, mouseY: p.y, fire: true, brake: d < 300 };
  const v = E.view(W, goal.x, goal.y, goal.z), a = Math.atan2(-v[1], v[0]);
  return { mouseX: E.CX + Math.cos(a) * 200, mouseY: 127 + Math.sin(a) * 120 };
}

test('a route is smooth, measured by distance, and carries straight on past its ends', () => {
  const R = E.makeRail([[0, 0, 0], [0, 0, 100], [50, 0, 200], [50, 20, 300]], false);
  let prev = E.railPos(R, -40), worst = 0;
  for (let s = -39; s <= R.len + 40; s += 1) { const p = E.railPos(R, s), d = Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]); worst = Math.max(worst, Math.abs(d - 1)); prev = p; }
  assert.ok(worst < 0.06, 'a step of 1 along it is 1 in the world: ' + worst);
  assert.ok(E.bankAt(E.makeRail([[0, 0, 0], [0, 0, 200], [200, 0, 400], [400, 0, 400]], false), 200) > 0.05, 'a right turn banks right');
});

test('the camera and the screen agree: straight ahead is the middle of the screen', () => {
  const W = E.newWorld(2, 7, 1); toPlay(W); play(W, 30);
  const c = W.cam, p = E.project(W, c.x + W.camF.x * 100, c.y + W.camF.y * 100, c.z + W.camF.z * 100);
  assert.ok(Math.abs(p.x - E.CX) < 0.01 && Math.abs(p.y - E.CY) < 0.01, JSON.stringify(p));
});

test('the same seed and the same hands play the same game', () => {
  const A = E.newWorld(2, 99, 1), B = E.newWorld(2, 99, 1);
  play(A, 4000, railBot); play(B, 4000, railBot);
  assert.equal(A.score, B.score); assert.equal(A.s, B.s); assert.equal(A.shields, B.shields);
});

test('The Valley: gates, drones, arches, pillars, rim guns, a tunnel, a ridge, checkpoints', () => {
  const W = E.newWorld(2, 4242, 1);
  const kinds = {}; W.objs.forEach((o) => { kinds[o.k] = (kinds[o.k] || 0) + 1; });
  assert.ok(kinds.gate >= 20 && kinds.drone >= 8 && kinds.arch >= 5 && kinds.pillar >= 5 && kinds.turret >= 10, JSON.stringify(kinds));
  assert.ok(W.rail.len > 28000, 'a long valley: ' + Math.round(W.rail.len));
  const V = W.valley; assert.ok(V.tunnel[1] - V.tunnel[0] > 2000, 'a real tunnel');
  const mid = (V.ridgeSpan[0] + V.ridgeSpan[1]) / 2; assert.ok(V.ridge(mid).w > 15, 'the ridge splits the canyon');
  assert.ok(W.cue.some((c) => c.wave === 'headon') && W.cue.some((c) => c.wave === 'heavy') && W.cue.some((c) => c.boss), 'squadrons, heavy fighters and the boss are on the way');
  const first = Math.min(...W.objs.map((o) => o.rs));
  play(W, 420);
  assert.equal(W.phase, 'play'); assert.ok(W.s < first - 100, 'nothing is passed during the briefing');
});

test('the throttle (28 Oct, v18): it pulls you up to speed like a car and holds it as long as you like; let go and you coast; the brake bites; through the sound barrier, a bang and a bonus', () => {
  const W = E.newWorld(2, 3, 1); toPlay(W); quiet(W); W.objs = []; play(W, 200);
  const cruise = W.v;
  play(W, 30, { boost: true }); const v30 = W.v / cruise; play(W, 90, { boost: true }); const v120 = W.v / cruise; play(W, 60, { boost: true }); const v180 = W.v / cruise;
  assert.ok(v30 > 1.2 && v30 < 1.6, 'it gathers speed - not a jump: ' + v30.toFixed(2)); assert.ok(v120 > 2.25, 'and pulls up to nearly two and a half times cruise in two seconds: ' + v120.toFixed(2));
  assert.ok(v180 - v120 < 0.15, 'easing off as it nears the top: ' + v120.toFixed(2) + ' then ' + v180.toFixed(2));
  let bang = false; const pts0 = W.score;
  for (let i = 0; i < 600; i++) { E.step(W, { boost: true }); if (W.events.includes('sonic')) bang = true; W.events.length = 0; W.fx.length = 0; }
  assert.ok(W.v > cruise * 2.35 && W.boosting, 'ten seconds more at full thrust - it holds, nothing runs out: ' + (W.v / cruise).toFixed(2));
  assert.ok(W.sonic && W.mach > 1, 'supersonic'); assert.ok(W.score > pts0 && W.ms.sonic > 500, 'and the supersonic bonus ticks up');
  assert.ok(W.focal < 215, 'the view widens with your speed: ' + W.focal.toFixed(0));
  const W2 = E.newWorld(2, 3, 1); toPlay(W2); quiet(W2); W2.objs = []; play(W2, 200); let bang2 = false;
  for (let i = 0; i < 200; i++) { E.step(W2, { boost: true }); if (W2.events.includes('sonic')) bang2 = true; W2.events.length = 0; W2.fx.length = 0; }
  assert.ok(bang2, 'the bang as you go through it');
  play(W, 30); assert.ok(W.v > cruise * 1.8, 'let go: you coast, you do not stop dead: ' + (W.v / cruise).toFixed(2));
  play(W, 400); assert.ok(W.v < cruise * 1.1 && !W.sonic, 'then settle back to cruise');
  play(W, 60, { brake: true }); assert.ok(W.v < cruise * 0.55, 'the brake bites: ' + (W.v / cruise).toFixed(2));
});

test('fly through a gate for points; miss it and you get nothing', () => {
  const W = E.newWorld(2, 11, 1); toPlay(W); quiet(W);
  const gates = W.objs.filter((o) => o.k === 'gate'), g = gates[0], g2 = gates[1];
  until(W, () => g.passed, 4000, (w) => steerTo(w, g.lx, g.ly));
  assert.equal(g.passed, 1); assert.equal(W.ms.gates, 1);
  const s1 = W.score;
  until(W, () => g2.passed, 4000, (w) => steerTo(w, g2.lx > 0 ? -40 : 40, 25));
  assert.equal(g2.passed, -1); assert.equal(W.score, s1);
});

test('arches, pillars, the tunnel roof and the ridge: fly into rock and you blow up (v20b); brush the tunnel roof and it costs a shield', () => {
  const W = E.newWorld(2, 11, 1); toPlay(W); quiet(W);
  const arch = W.objs.find((o) => o.k === 'arch' && o.aw > 900), sh = W.shields;
  W.objs = [arch];
  W.s = arch.rs - 400; until(W, () => arch.passed, 4000, (w) => steerTo(w, 0, -9)); assert.equal(W.shields, sh, 'under the arch is safe');
  const W2 = E.newWorld(2, 11, 1); toPlay(W2); quiet(W2); const a2 = W2.objs.find((o) => o.k === 'arch' && o.aw > 900); W2.objs = [a2];
  const lv2 = W2.lives; W2.s = a2.rs - 400; until(W2, () => a2.passed, 4000, (w) => steerTo(w, 0, 30)); assert.equal(W2.phase, 'retry', 'over the top of it: you hit it'); assert.equal(W2.lives, lv2 - 1, 'a ship gone');
  const W3 = E.newWorld(2, 11, 1); toPlay(W3); quiet(W3); W3.objs = [];
  W3.s = (W3.valley.tunnel[0] + W3.valley.tunnel[1]) / 2; play(W3, 2); W3.oy = 30; play(W3, 1); assert.equal(W3.shields, sh - 1, 'the tunnel roof');
  const W4 = E.newWorld(2, 11, 1); toPlay(W4); quiet(W4); W4.objs = [];
  const mid = (W4.valley.ridgeSpan[0] + W4.valley.ridgeSpan[1]) / 2; W4.s = mid; play(W4, 2); W4.ox = W4.valley.ridge(W4.s).x; play(W4, 1);
  const Rg = W4.valley.ridge(W4.s); assert.ok(Math.abs(W4.ox - Rg.x) > Rg.w, 'the ridge: you are kept in your channel'); assert.equal(W4.shields, sh, 'without a scrape');
});

test('enemy lasers: you can be hit - unless you roll', () => {
  const W = E.newWorld(2, 5, 1); toPlay(W); quiet(W); W.objs = []; play(W, 120);
  const shooter = () => { const p = E.local(E.frame(W.rail, W.s + 200), W.ox, W.oy); return { rs: W.s + 200, lx: W.ox, ly: W.oy, vs: W.v, vlx: 0, vly: 0, x: p.x, y: p.y, z: p.z }; };
  W.sp = { ...W.sp, err: 0, rerr: 0 };
  let o = shooter(); E.fireBolt(W, o, o.x, o.y, o.z); const sh = W.shields;
  play(W, 80); assert.equal(W.shields, sh - 1, 'a laser straight at you hits');
  play(W, 60); o = shooter(); E.fireBolt(W, o, o.x, o.y, o.z);
  play(W, 22); play(W, 1, { rollR: true }); play(W, 60); assert.equal(W.shields, sh - 1, 'a roll shrugs it off');
});

test('squadrons fly in from ahead, hold in front of you firing, then break away', () => {
  const W = E.newWorld(2, 8, 1); toPlay(W); quiet(W); W.objs = []; play(W, 60);
  E.spawnWave(W, 'headon', 3);
  const foes = W.objs.filter((o) => o.k === 'dart');
  assert.equal(foes.length, 3); assert.ok(foes.every((o) => o.rs > W.s + 600), 'they start well ahead of you');
  let held = false, fired = 0, minRel = 1e9;
  for (let i = 0; i < 1600 && foes.some((o) => o.alive); i++) {
    E.step(W, steerTo(W, 0, 8)); W.events.length = 0; W.fx.length = 0; W.shields = 99;
    foes.forEach((o) => { if (o.alive) { if (o.st === 'hold') held = true; minRel = Math.min(minRel, o.rs - W.s); } });
    fired = Math.max(fired, W.eshots.filter((b) => b.k === 'bolt').length);
  }
  assert.ok(held, 'they hold in front of you'); assert.ok(fired > 0, 'and fire'); assert.ok(foes.every((o) => !o.alive), 'then they are gone'); assert.ok(minRel > -60, 'never from behind');
});

test('hold the rocket button to lock several targets, let go for a salvo - all down is a bonus', () => {
  const W = E.newWorld(2, 8, 1); toPlay(W); quiet(W); W.objs = []; play(W, 60);
  E.spawnWave(W, 'headon', 3);
  until(W, () => W.objs.filter((o) => o.k === 'dart').every((o) => o.st === 'hold'), 600, (w) => { w.shields = 99; return steerTo(w, 0, 8); });
  const foes = W.objs.filter((o) => o.k === 'dart'), rk = W.rk;
  for (let i = 0; i < 90 && W.locks.length < 3; i++) { const t = foes.find((o) => !W.locks.includes(o)); E.step(W, { ...aimAt(W, t), fire: false, alt: true }); W.events.length = 0; W.shields = 99; }
  assert.equal(W.locks.length, 3, 'three locked');
  const s0 = W.score; E.step(W, { alt: false }); W.events.length = 0;
  assert.equal(W.rk, rk - 3); assert.ok(W.rockets.length === 3);
  until(W, () => !W.rockets.length, 400, (w) => { w.shields = 99; return idle; });
  assert.ok(foes.every((o) => !o.alive), 'the salvo got them all'); assert.ok(W.score - s0 >= 3000 + E.PTS.salvo * 9, 'with the salvo bonus: ' + (W.score - s0));
});

test('the Warden: guns and engines first, then the core', () => {
  const W = E.newWorld(2, 8, 1); toPlay(W); quiet(W); W.objs = []; W.s = W.rail.len * E.VSEC.boss + 200; play(W, 2);
  E.spawnWarden(W); const B = W.warden, core = B.parts.find((p) => p.name === 'core');
  until(W, () => B.st === 'fight', 900, (w) => { w.shields = 99; return idle; });
  until(W, () => W.paceMul < 0.8, 300, (w) => { w.shields = 99; return idle; });
  assert.ok(W.paceMul < 0.8, 'the valley slows for the fight');
  E.hitObj(W, core, 3); assert.equal(core.hp, core.max, 'the core is shielded at first');
  B.parts.filter((p) => p.name !== 'core').forEach((p) => { while (p.alive) { p.shielded = false; E.hitObj(W, p, 3); } });   // (v20: pods and engines open only at times - here, opened)
  until(W, () => !core.shielded, 400, (w) => { w.shields = 99; return idle; });
  assert.equal(core.shielded, false, 'engines out: the core charges, then opens');
  const s0 = W.score; while (core.alive) E.hitObj(W, core, 3);
  assert.equal(B.st, 'beaten', 'beaten - it limps off burning'); assert.equal(W.ms.warden, 1); assert.ok(W.score - s0 >= E.PTS.wardenDown);
});

test('free flight: the cursor in the middle only aims; towards the edge it turns the ship; too far out it turns back', () => {
  const W = E.newWorld(2, 5, 2, { warship: 'free' }); assert.equal(W.mode, 'free'); toPlay(W); quiet(W);
  const y0 = W.ship.yaw; play(W, 60, { mouseX: E.CX + 30, mouseY: 127 }); assert.ok(Math.abs(W.ship.yaw - y0) < 0.02, 'near the middle: no turn');
  play(W, 60, { mouseX: E.AIM.x1, mouseY: 127 }); assert.ok(W.ship.yaw - y0 > 0.6, 'at the right edge: a right turn ' + (W.ship.yaw - y0));
  const p0 = W.ship.pitch; play(W, 30, { mouseX: E.CX, mouseY: E.AIM.y0 }); assert.ok(W.ship.pitch > p0 + 0.2, 'up at the top');
  W.ship.x = 0; W.ship.y = 0; W.ship.z = E.ARENA + 300; W.ship.yaw = 0; W.ship.pitch = 0; play(W, 200, { mouseX: E.CX, mouseY: 127 });
  assert.ok(Math.abs(Math.abs(W.ship.yaw) - Math.PI) < 1, 'turned back towards the warship: ' + W.ship.yaw);
});

test('crash into the warship: a shield, and you are pushed clear', () => {
  const W = E.newWorld(2, 5, 2, { warship: 'free' }); toPlay(W); quiet(W);
  const sh = W.shields; W.ship.x = 0; W.ship.y = 0; W.ship.z = E.WARSHIP.boxes[4][2] - 120; W.ship.yaw = 0; W.ship.pitch = 0;   // (behind her stern, heading for it)
  until(W, () => W.shields < sh, 300, { mouseX: E.CX, mouseY: 127 });
  assert.equal(W.shields, sh - 1); assert.equal(E.boxHit(W.ship.x, W.ship.y, W.ship.z, 0), null, 'not inside her');
});

test('her turrets fire on you, her main gun shells your carrier, and it can be silenced', () => {
  const W = E.newWorld(2, 5, 2, { warship: 'free' }); toPlay(W); W.cue = W.cue.filter((c) => !c.wave);
  let flak = 0, bolts = 0;
  for (let i = 0; i < 400; i++) { W.ship.x = 0; W.ship.y = 260; W.ship.z = 0; E.step(W, { mouseX: E.CX, mouseY: 127 }); W.events.length = 0; W.shields = 99; flak += W.eshots.filter((b) => b.k === 'flak').length; bolts += W.eshots.filter((b) => b.k === 'bolt').length; }
  assert.ok(flak > 0 && bolts > 0, 'flak and lasers: ' + flak + ' ' + bolts);
  until(W, () => W.carrier.hp < 100, 2000, (w) => { w.shields = 99; return idle; }); assert.equal(W.carrier.hp, 94, 'a shell hits the carrier');
  const gun = W.objs.find((o) => o.k === 'gun'); while (gun.alive) E.hitObj(W, gun, 3);
  assert.equal(W.ms.gun, 1); W.eshots = []; const hp = W.carrier.hp; play(W, 1500, (w) => { w.shields = 99; return idle; }); assert.equal(W.carrier.hp, hp, 'no more shells');
});

test('four generators bring her shields down; the bridge then breaks her up', () => {
  const W = E.newWorld(2, 5, 2, { warship: 'free' }); toPlay(W); W.cue = W.cue.filter((c) => !c.wave);
  const bridge = W.objs.find((o) => o.k === 'bridge');
  E.hitObj(W, bridge, 3); assert.equal(bridge.hp, bridge.max, 'the bridge is shielded at first');
  W.objs.filter((o) => o.k === 'gen').forEach((g, i) => { while (g.alive) E.hitObj(W, g, 3); assert.equal(W.gensLeft, 3 - i); });
  assert.equal(bridge.shielded, false);
  while (bridge.alive) E.hitObj(W, bridge, 3);
  until(W, () => W.phase === 'clear', 900, (w) => { w.shields = 99; return idle; });
  assert.equal(W.phase, 'clear'); assert.ok(W.tally.some((l) => /^GENERATORS 4 OF 4/.test(l[0])) && W.tally.some((l) => l[0] === 'MEDAL'));
});

test('lose a ship: you carry on from where it went down, with a moment of grace (v20b) - her damage stays', () => {
  const W = E.newWorld(2, 3, 1); toPlay(W); quiet(W);
  W.s = W.checkpoints[2] + 200; play(W, 2); assert.equal(W.checkpoint, W.checkpoints[2]);
  const all = W.ms.gatesAll, lives = W.lives;
  while (W.phase === 'play') { W.ox = 300; W.scrapeT = 0; play(W, 1); }
  assert.equal(W.phase, 'retry'); assert.equal(W.lives, lives - 1);
  const sDown = W.s; play(W, 160); assert.equal(W.phase, 'play'); assert.equal(W.shields, W.sp.shields); assert.ok(W.s >= sDown && W.s - sDown < 260, 'the same spot (just on): ' + Math.round(W.s - sDown)); assert.ok(W.ms.gatesAll >= all, 'gates counted as they are passed');
  assert.ok(W.graceT > 0, 'grace'); const sh0 = W.shields; W.ox = 300; play(W, 3); assert.equal(W.shields, sh0, 'no harm during the grace');
  const V = E.newWorld(2, 3, 2, { warship: 'free' }); toPlay(V); V.cue = [];
  const g = V.objs.find((o) => o.k === 'gen'); while (g.alive) E.hitObj(V, g, 3);
  V.shields = 1; V.ship.x = 0; V.ship.y = 0; V.ship.z = -700; V.ship.yaw = 0; V.ship.pitch = 0; V.scrapeT = 0;
  until(V, () => V.phase === 'retry', 400, { mouseX: E.CX, mouseY: 127 });
  play(V, 160); assert.equal(V.phase, 'play'); assert.equal(V.gensLeft, 3, 'the generator you knocked out stays down');
});

test('the whole sample can be flown: all three chapters, tallies, medals', () => {
  for (const sp of [1, 2, 3]) {
    const W = E.newWorld(sp, 2026 + sp, 1), seen = [];
    let g = 0;
    while (!W.over && g++ < 60 * 60 * 15) {
      W.shields = Math.max(W.shields, 3); if (W.carrier) W.carrier.hp = Math.max(W.carrier.hp, 50);   // (this test is about getting through, not about dodging)
      E.step(W, W.mode === 'rail' ? railBot(W) : freeBot(W));
      if (W.phase === 'clear' && W.phaseT === 1) seen.push({ ch: W.stage, secs: W.results[W.results.length - 1].secs, medal: W.medal, warden: W.ms.warden });
      W.events.length = 0; W.fx.length = 0;
    }
    assert.equal(W.done, true, 'speed ' + sp + ' finished (chapter ' + W.stage + ', phase ' + W.phase + ', gens left ' + W.gensLeft + ')');
    assert.deepEqual(seen.map((q) => q.ch), [1, 2, 3]);
    assert.ok(seen[0].secs > 100 && seen[0].secs < 300, 'the valley takes a couple of minutes: ' + JSON.stringify(seen));
    assert.ok(seen[1].secs > 45, 'the warship takes a while: ' + JSON.stringify(seen));
    assert.ok(seen.every((q) => ['GOLD', 'SILVER', 'BRONZE'].includes(q.medal)));
  }
});

test('the divide: take the left channel and your steering and the camera centre on it', () => {
  const W = E.newWorld(2, 11, 1); toPlay(W); quiet(W); W.objs = [];
  const V = W.valley; W.s = V.ridgeSpan[0] - 600; play(W, 2);
  until(W, () => W.s > V.ridgeSpan[0] + 400, 3000, (w) => (w.s < V.ridgeSpan[0] - 300 ? steerTo(w, -40, 8) : { mouseX: E.CX, mouseY: 127 }));
  const Ln = E.laneAt(W, W.s), R = V.ridge(W.s);
  assert.equal(W.lane, -1, 'the left channel'); assert.ok(Math.abs(W.ox - Ln.c) < 6, 'the cursor in the middle keeps you in the middle of it: ' + W.ox + ' vs ' + Ln.c);
  assert.ok(W.ox < R.x - R.w - 5, 'clear of the ridge'); assert.equal(W.shields, W.sp.shields, 'no scrapes');
  until(W, () => W.s > V.ridgeSpan[1] + 500, 4000, { mouseX: E.CX, mouseY: 127 }); assert.equal(W.lane, 0, 'free again after it');
});

test('a controller: in the valley the ship moves progressively (gathers speed, eases to a stop); in free flight the turn builds up; the flip turns you round', () => {
  const W = E.newWorld(2, 5, 1); toPlay(W); quiet(W); W.objs = [];
  play(W, 30, { ctrl: 'pad', sx: 0, sy: 0 });
  const C = E.corridor(W), edge = C.c + C.x * E.REACH, x0 = W.aim.x;
  play(W, 1, { ctrl: 'pad', sx: 1, sy: 0 }); const d1 = W.aim.x - x0; play(W, 7, { ctrl: 'pad', sx: 1, sy: 0 }); const d8 = W.aim.x - x0;
  assert.ok(d1 < 1.5 && d8 > d1 * 4 && d8 < 40, 'push the stick: the sight sets off gently and gathers speed (' + d1.toFixed(2) + ' then ' + d8.toFixed(1) + ')');
  play(W, 40, { ctrl: 'pad', sx: 1, sy: 0 }); assert.ok(W.ox > edge * 0.8, 'held, the ship gets across: ' + W.ox.toFixed(1) + ' of ' + edge.toFixed(1));
  const W2 = E.newWorld(2, 5, 1); toPlay(W2); quiet(W2); W2.objs = []; play(W2, 30, { ctrl: 'pad' }); play(W2, 14, { ctrl: 'pad', sx: 1, sy: 0 });
  const xr = W2.aim.x; play(W2, 6, { ctrl: 'pad', sx: 0, sy: 0 }); const coast = W2.aim.x - xr; play(W2, 40, { ctrl: 'pad', sx: 0, sy: 0 }); const rest = W2.aim.x;
  play(W2, 10, { ctrl: 'pad', sx: 0, sy: 0 });
  assert.ok(coast > 2, 'let go: it eases to a stop, not a dead halt (' + coast.toFixed(1) + ')'); assert.ok(Math.abs(W2.aim.x - rest) < 0.05 && rest > E.CX + 30, 'and stays where you left it');
  const Q = E.newWorld(2, 5, 1); toPlay(Q); quiet(Q); Q.objs = []; play(Q, 30, { ctrl: 'pad' }); const q0 = Q.aim.x; play(Q, 8, { ctrl: 'pad', sx: 1, padQuick: true });
  assert.ok(Q.aim.x - q0 > d8 * 1.5, 'the Quick setting is livelier');
  const V = E.newWorld(2, 5, 2, { warship: 'free' }); toPlay(V); quiet(V); V.cue = [];
  const y0 = V.ship.yaw; play(V, 40, { ctrl: 'pad', sx: 1, sy: 0 }); assert.ok(V.ship.yaw - y0 > 0.8, 'a right turn: ' + (V.ship.yaw - y0));
  const sm = V.steerMode; assert.equal(sm, 'stick');
  play(V, 30, { ctrl: 'pad' }); const yb = V.ship.yaw, g = V.gauge;
  E.step(V, { ctrl: 'pad', flip: true }); play(V, E.FLIP + 2, { ctrl: 'pad' });
  const turned = Math.abs(Math.abs(((V.ship.yaw - yb + Math.PI * 3) % (Math.PI * 2)) - Math.PI));
  assert.ok(turned > 2.9, 'the flip turns you right round: ' + turned); assert.ok(V.gauge < g, 'it costs gauge');
  play(V, 25, { ctrl: 'pad' }); assert.ok(V.v > V.pace * 1.2, 'and you burst out of it: ' + V.v / V.pace);
  const B = E.newWorld(2, 5, 2, { warship: 'free' }); toPlay(B); quiet(B); B.cue = []; play(B, 60, { ctrl: 'pad' }); const cruise = B.v;
  play(B, 40, { ctrl: 'pad', brake: true }); assert.ok(B.v < cruise * 0.5, 'the brake slows you right down');
  const yb2 = B.ship.yaw; play(B, 30, { ctrl: 'pad', brake: true, sx: 1 }); const yA = B.ship.yaw - yb2;
  const C2 = E.newWorld(2, 5, 2, { warship: 'free' }); toPlay(C2); quiet(C2); C2.cue = []; play(C2, 100, { ctrl: 'pad' }); const yc = C2.ship.yaw; play(C2, 30, { ctrl: 'pad', sx: 1 });
  assert.ok(yA > (C2.ship.yaw - yc) * 1.4, 'and braking tightens the turn');
});

test('mouse-aim: point the mouse somewhere and the ship flies there; the camera looks where you point', () => {
  const W = E.newWorld(2, 5, 2, { warship: 'free' }); toPlay(W); quiet(W); W.cue = [];
  const y0 = W.ship.yaw;
  E.step(W, { ctrl: 'mouseaim', mdx: 500, mdy: 0 }); W.events.length = 0;
  assert.ok(Math.abs(W.aimYaw - y0 - 1.2) < 0.01, 'the aim moved 1.2 radians right');
  play(W, 120, { ctrl: 'mouseaim', mdx: 0, mdy: 0 });
  const ang = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  assert.ok(ang(W.ship.yaw, W.aimYaw) < 0.05, 'the ship has come round to it'); assert.ok(ang(W.cam.yaw, W.aimYaw) < 0.05, 'and the camera looks there');
  const p = W.aim; assert.ok(Math.abs(p.x - E.CX) < 30 && Math.abs(p.y - E.CY) < 40, 'the gunsight is on the nose, near the middle: ' + JSON.stringify(p));
});

test('the end of the valley: the climb to space, your own course, boost climbs faster, then the tally', () => {
  const W = E.newWorld(2, 4, 1); toPlay(W); quiet(W); W.objs = []; W.cue = W.cue.filter((c) => c.ascent);
  W.s = E.secAt(W, 'out') + 200; until(W, () => W.phase === 'ascent', 200, { mouseX: E.CX, mouseY: 127 });
  assert.equal(W.phase, 'ascent'); assert.ok(W.ascending);
  const y0 = W.ship.y; play(W, 120, { mouseX: E.CX, mouseY: 127 }); assert.ok(W.ship.y - y0 > 150, 'climbing: ' + (W.ship.y - y0)); assert.ok(W.ship.pitch > 0.6, 'nose up');
  const V = E.newWorld(2, 4, 1); toPlay(V); quiet(V); V.objs = []; V.cue = V.cue.filter((c) => c.ascent); V.s = E.secAt(V, 'out') + 200; until(V, () => V.phase === 'ascent', 200, { mouseX: E.CX, mouseY: 127 }); play(V, 120, { mouseX: E.CX, mouseY: 127, boost: true });
  assert.ok(V.alt > W.alt + 60, 'boost climbs faster: ' + V.alt + ' vs ' + W.alt);
  until(W, () => W.phase === 'clear', 600, { mouseX: E.CX, mouseY: 127 }); assert.equal(W.phase, 'clear'); assert.ok(W.alt > 600, 'high up when the tally comes');
  until(W, () => W.chap === 1, 600, (w) => ({ tap: w.phaseT % 60 === 59 })); assert.equal(E.CHAPTERS[W.chap].id, 'warship', 'then on to the warship');
});

test('shields recharge when you keep out of trouble', () => {
  const W = E.newWorld(2, 4, 1); toPlay(W); quiet(W); W.objs = []; W.cue = [];
  W.shields = 3; play(W, W.sp.calm - 5, { mouseX: E.CX, mouseY: 127 }); assert.equal(W.shields, 3, 'not yet');
  play(W, W.sp.regen + 10, { mouseX: E.CX, mouseY: 127 });
  assert.equal(W.shields, 5, 'one after four seconds clear, then another');
  assert.equal(E.SPEEDS[1].calm, 240); assert.equal(E.SPEEDS[2].calm, 240);
});

test('the opening is busy: the first fighters by 10 seconds, and every squadron wave starts inside its own section', () => {
  const W = E.newWorld(2, 7, 1), at = (k) => E.secAt(W, k);
  const waves = W.cue.filter((c) => c.wave).map((c) => c.at);
  assert.ok(waves[0] < 2100, 'a wave in the first ten seconds (at ' + Math.round(waves[0]) + ')');
  const squad = waves.filter((a) => a >= at('squad') && a < at('boss') + 2000);
  assert.ok(squad.length >= 6, 'squadron waves: ' + squad.length);
  assert.ok(squad.every((a) => a < at('boss') - 200), 'none spill into the Gaoler fight');
  assert.ok(W.objs.filter((o) => o.k === 'turret' && o.rs > at('narrows') && o.rs < at('drop')).length >= 2, 'guns in the narrows');
});

test('fighters never ram you: one that flies right through you is a near miss - points, no damage', () => {
  const W = E.newWorld(2, 8, 1); toPlay(W); quiet(W); W.objs = [];
  play(W, 30, { mouseX: E.CX, mouseY: 127 });
  E.spawnWave(W, 'headon', 1); const o = W.objs.find((q) => q.k === 'dart'); o.fireT = 1e9; o.hold = -999;   // (it never stops, and never fires)
  const sh = W.shields, sc = W.score;
  until(W, () => !o.alive || o.rammed, 600, (w) => { o.lx = w.ox; o.ly = w.oy; o.lx0 = w.ox; o.ly0 = w.oy; return { mouseX: E.CX, mouseY: 127 }; });
  assert.ok(o.rammed, 'it went right through you'); assert.equal(W.shields, sh, 'no shield lost'); assert.ok(W.score >= sc + E.PTS.close, 'a near miss scores');
  const V = E.newWorld(2, 8, 2, { warship: 'free' }); toPlay(V); quiet(V); V.cue = []; play(V, 10, {});
  E.spawnWave(V, 'fighters', 1); const f = V.objs.find((q) => q.k === 'dart'); f.wait = 0; f.fireT = 1e9;
  const shv = V.shields; for (let i = 0; i < 300 && !f.nearT; i++) { f.x = V.ship.x + 4; f.y = V.ship.y; f.z = V.ship.z + 4; E.step(V, {}); V.events.length = 0; }
  assert.equal(V.shields, shv, 'nor in free flight');
});

test('every enemy burst glows first: the gun shows it is about to fire before the first shot', () => {
  const W = E.newWorld(2, 9, 1); toPlay(W); quiet(W); W.objs = [];
  play(W, 30, { mouseX: E.CX, mouseY: 127 }); E.spawnWave(W, 'headon', 1);
  const o = W.objs.find((q) => q.k === 'dart'); let told = -1, fired = -1;
  for (let i = 0; i < 900 && fired < 0; i++) { E.step(W, { mouseX: E.CX, mouseY: 127 }); if (o.tell > 0 && told < 0) told = W.t; if (W.eshots.some((b) => b.k === 'bolt') && fired < 0) fired = W.t; W.events.length = 0; W.fx.length = 0; }
  assert.ok(told > 0 && fired > 0 && fired - told >= 15, 'a glow, then the shot ' + (fired - told) + ' steps later');
});

test('a hit says what and where: the cause, the direction it came from; your chain drops one step, not to nothing', () => {
  const W = E.newWorld(2, 10, 1); toPlay(W); quiet(W); W.objs = [];
  play(W, 300, { mouseX: E.CX, mouseY: 127 }); W.chain = 12; W.mult = 3; W.chainT = 100; W.sp = { ...W.sp, err: 0, rerr: 0 };   // (up to cruising speed, and a dead shot, for the test)
  const S = W.ship; E.fireBolt(W, { k: 'turret', rs: W.s + 200, lx: -60, ly: 30, x: S.x - 60, y: S.y + 30, z: S.z + 200 }, S.x - 60, S.y + 30, S.z + 200);
  const sh = W.shields; until(W, () => W.shields < sh, 300, { mouseX: E.CX, mouseY: 127 });
  assert.equal(W.shields, sh - 1, 'hit'); assert.equal(W.hurtFrom.cause, 'LASER'); assert.ok(W.hurtFrom.x < S.x - 30, 'from the left');
  assert.equal(W.mult, 2, 'chain x3 drops to x2');
});

test('the Gaoler in three beats: gun pods and a wall of fire; then mines; then a core that charges, fires a beam and opens', () => {
  const W = E.newWorld(2, 12, 1); toPlay(W); quiet(W); W.objs = [];
  W.s = W.rail.len * E.VSEC.boss + 300; play(W, 2); W.cue = W.cue.filter((c) => c.ascent); E.spawnWarden(W);
  const G = W.warden, part = (n) => G.parts.find((q) => q.name === n);
  until(W, () => G.st === 'fight', 900, { mouseX: E.CX, mouseY: 127 });
  assert.ok(part('engL').shielded && part('core').shielded, 'the engines and core are shielded at first');
  let wall = 0; for (let i = 0; i < 400; i++) { const n = W.eshots.length; E.step(W, { mouseX: E.CX, mouseY: 127, rollL: i % 50 === 0 }); if (W.eshots.length - n >= 4) wall++; W.events.length = 0; W.fx.length = 0; W.shields = 8; }
  assert.ok(wall >= 1, 'a wall of fire');
  assert.ok(part('gunL').shielded, 'Classic: the pods are shielded until they glow');
  until(W, () => part('gunL').tell > 0, 400, (w) => { w.shields = 8; return { mouseX: E.CX, mouseY: 127 }; }); play(W, 1, { mouseX: E.CX, mouseY: 127 });
  assert.ok(!part('gunL').shielded, 'glowing: open'); const h0 = part('gunL').hp; E.hitObj(W, part('gunL'), 1); assert.equal(part('gunL').hp, h0 - 2, 'and a hit then counts twice');
  part('gunR').tell = 30; part('gunR').shielded = false; E.hitObj(W, part('gunL'), 99); E.hitObj(W, part('gunR'), 99);
  assert.equal(G.beat, 2); assert.ok(part('engL').shielded, 'pods gone: the engines stay shut a while');
  until(W, () => W.objs.some((o) => o.k === 'mine'), 600, { mouseX: E.CX, mouseY: 127 }); assert.ok(W.objs.filter((o) => o.k === 'mine').length >= 3, 'mines down the lane');
  const mine = W.objs.find((o) => o.k === 'mine'); assert.ok(E.hitObj(W, mine, 2), 'and you can shoot them');
  until(W, () => !part('engL').shielded, 500, (w) => { w.shields = 8; return { mouseX: E.CX, mouseY: 127 }; }); assert.ok(!part('engL').shielded, 'then the engines open');
  E.hitObj(W, part('engL'), 99); E.hitObj(W, part('engR'), 99);
  assert.equal(G.beat, 3);
  const seen = new Set(); for (let i = 0; i < 400; i++) { E.step(W, { mouseX: E.CX, mouseY: 127 }); W.shields = 8; seen.add(G.cst + (part('core').shielded ? '-shut' : '-open')); W.events.length = 0; W.fx.length = 0; }
  assert.ok(seen.has('charge-shut') && seen.has('beam-shut') && seen.has('open-open'), 'charge, beam, open: ' + [...seen]);
  until(W, () => !part('core').shielded, 300, { mouseX: E.CX, mouseY: 127 }); E.hitObj(W, part('core'), 99);
  assert.equal(G.st, 'beaten', 'beaten'); assert.equal(W.ms.warden, 1);
  assert.ok(W.cue.find((c) => c.ascent).at < W.s + 1200, 'and the climb comes soon after');
});

test('medals: each chapter is judged on its own score, at your speed', () => {
  const W = E.newWorld(2, 13, 2); W.score = 500000; E.startChapter(W, 1); W.ms.gens = 4; W.ct = 60 * 100;
  E.chapterDone(W); assert.equal(W.medal, 'BRONZE', 'a big score from chapter 1 does not buy chapter 2 its medal');
  assert.ok(/GOLD NEEDS [0-9,]+ MORE - TRY: /.test(W.tallyHint), 'and it tells you what gold needs, and the biggest things to try: ' + W.tallyHint);
});

test('the panel: score, lives, chapter', () => {
  const W = E.newWorld(1, 1, 2);
  assert.deepEqual(E.hud(W), { score: 0, lives: E.SPEEDS[1].lives, wave: 2 });
});

test('a controller flies and aims apart: the left stick flies the ship, the right stick moves the crosshair - the ship does not follow it', () => {
  const W = E.newWorld(2, 21, 1); toPlay(W); quiet(W); W.objs = [];
  play(W, 30, { ctrl: 'pad', split: true });
  play(W, 60, { ctrl: 'pad', split: true, ax: 1, ay: -0.6 });
  assert.ok(W.aim.x > E.CX + 120 && W.aim.y < E.CY - 40, 'the crosshair is up and to the right: ' + Math.round(W.aim.x) + ',' + Math.round(W.aim.y));
  assert.ok(Math.abs(W.ox) < 3, 'and the ship has not moved: ' + W.ox.toFixed(1));
  play(W, 50, { ctrl: 'pad', split: true, sx: -1, ax: 1 });
  assert.ok(W.ox < -15 && W.aim.x > W.helm.x + 100, 'fly left while aiming right: ship ' + W.ox.toFixed(1) + ', aim ' + Math.round(W.aim.x) + ', helm ' + Math.round(W.helm.x));
  play(W, 30, { ctrl: 'pad', split: true }); assert.ok(Math.abs(W.aim.x - W.helm.x) < 2, 'let the right stick go: the crosshair is back on your heading');
  const T = E.newWorld(2, 21, 1); toPlay(T); quiet(T); T.objs = []; play(T, 30, { ctrl: 'pad' }); play(T, 40, { ctrl: 'pad', ax: 1 });
  assert.ok(Math.abs(T.aim.x - T.helm.x) < 1, 'Together: the crosshair and the heading are one');
});

test('thrust on the trigger: as much as you squeeze; a key is a full squeeze', () => {
  const speed = (inp) => { const W = E.newWorld(2, 22, 1); toPlay(W); quiet(W); play(W, 200); play(W, 200, inp); return W.v / W.pace; };
  const cruise = speed({}), half = speed({ ctrl: 'pad', thr: 0.5 }), full = speed({ ctrl: 'pad', thr: 1 }), key = speed({ boost: true }), brake = speed({ ctrl: 'pad', brk: 1 });
  assert.ok(half > cruise * 1.5 && half < full * 0.8 && full > cruise * 2.3, 'cruise ' + cruise.toFixed(2) + ', half ' + half.toFixed(2) + ', full ' + full.toFixed(2));
  assert.ok(Math.abs(key - full) < 0.05, 'W is a full squeeze'); assert.ok(brake < cruise * 0.6, 'LT brakes: ' + brake.toFixed(2));
});

test('the shock bomb: flung at the crosshair, it blasts everything round it; a few each chapter, one more at each checkpoint', () => {
  const W = E.newWorld(2, 23, 1); toPlay(W); quiet(W); W.objs = []; play(W, 60);
  E.spawnWave(W, 'headon', 4); until(W, () => W.objs.filter((o) => o.k === 'dart' && o.st === 'hold').length >= 3, 900, {});
  const darts = W.objs.filter((o) => o.k === 'dart' && o.alive), p = E.project(W, darts[0].x, darts[0].y, darts[0].z), n0 = W.bombs;
  E.step(W, { mouseX: p.x, mouseY: p.y, bomb: true }); play(W, 40, { mouseX: p.x, mouseY: p.y });
  assert.equal(W.bombs, n0 - 1, 'one bomb gone'); assert.ok(darts.filter((o) => !o.alive).length >= 2, 'and the fighters round it: ' + darts.filter((o) => !o.alive).length + ' of ' + darts.length);
  W.bombs = 0; const sh = W.ms.shots; E.step(W, { bomb: true }); assert.equal(W.bombs, 0, 'none left: nothing happens');
  W.s = W.checkpoints[1] - 20; W.cue = W.cue.filter((c) => c.cp || c.ascent); play(W, 30); assert.equal(W.bombs, 1, 'a checkpoint gives one back'); void sh;
});

test('the warship on a set path: three different laps round her that never come near her hull, past every generator, looping till she is done', () => {
  const W = E.newWorld(2, 31, 2); assert.equal(W.mode, 'rail'); assert.ok(W.rail.loop, 'a loop');
  assert.equal(W.lapAt.length, 3, 'three laps'); assert.ok(W.lapAt[1] - W.lapAt[0] > 6000 && W.lapAt[2] - W.lapAt[1] > 6000 && W.rail.len - W.lapAt[2] > 6000, 'each a proper lap');
  assert.notDeepEqual(E.LAPS[0].slice(0, 6), E.LAPS[1].slice(0, 6), 'not the same way round');
  const R = W.rail, B = E.WARSHIP.boxes, C = E.corridor(W); let worst = 1e9;
  for (let s = 0; s < R.len; s += 3) { const F = E.frame(R, s); for (const ox of [-C.x, 0, C.x]) for (const oy of [C.y0, 0, C.y1]) { const p = E.local(F, ox, oy); for (const b of B) { const d = Math.hypot(Math.max(b[0] - p.x, 0, p.x - b[3]), Math.max(b[1] - p.y, 0, p.y - b[4]), Math.max(b[2] - p.z, 0, p.z - b[5])); if (d < worst) worst = d; } } }
  assert.ok(worst > 6, 'however you steer, you are clear of her: ' + worst.toFixed(1));
  for (const g of E.WARSHIP.gens) { let best = 1e9; for (let s = 0; s < R.len; s += 4) { const F = E.frame(R, s); best = Math.min(best, Math.hypot(F.x - g[0], F.y - g[1], F.z - g[2])); } assert.ok(best < 125, 'the path passes generator ' + g + ' within reach: ' + best.toFixed(0)); }
  toPlay(W); W.cue = W.cue.filter((c) => !c.wave); const seen = {};
  play(W, Math.ceil(R.len / W.pace / 0.75) + 200, (w) => { w.shields = 99; for (const o of w.objs) if (o.alive && o.beh) seen[o.beh + w.lapN] = true; return {}; });
  assert.ok(W.s > R.len && W.phase === 'play', 'round and round: no end until she is done'); assert.ok(W.lapN >= 4, 'laps counted: ' + W.lapN);
  assert.ok(seen.ace2, 'lap 2: the Magpie'); assert.ok(seen.flee3, 'lap 3: a few running from you');
  const F = E.newWorld(2, 31, 2, { warship: 'free' }); assert.equal(F.mode, 'free', 'Fly free is still there');
});

test('auto-aim: fire near a fighter and the shot locks on to it and hits it; with auto-aim off it does not', () => {
  for (const R of [70, 0]) {
    const W = E.newWorld(2, 8, 1); toPlay(W); quiet(W); W.objs = []; play(W, 60);
    E.spawnWave(W, 'headon', 1); const o = W.objs.find((q) => q.k === 'dart'); o.fireT = 1e9; o.holdT = 1e9;
    until(W, () => o.st === 'hold', 600, (w) => { w.shields = 99; return idle; });
    const near = (w) => { const p = E.project(w, o.x, o.y, o.z), off = o.r * (w.focal || E.FOCAL) / p.z + 22; return { mouseX: p.x + (p.x + off < E.AIM.x1 ? off : -off), mouseY: p.y, autoAim: R }; };
    play(W, 20, (w) => { w.shields = 99; return near(w); });
    assert.equal(E.pick(W, W.aim.x, W.aim.y), null, 'the crosshair is off the fighter');
    assert.equal(W.autoT, R ? o : null, R ? 'auto-aim has it' : 'no lock with auto-aim off');
    const hp = o.hp; E.step(W, { ...near(W), fire: true }); W.events.length = 0;
    assert.equal(W.shots[W.shots.length - 1].tgt, R ? o : null, 'the shot carries the lock');
    play(W, E.SHOT_T + 2, (w) => { w.shields = 99; return near(w); });
    if (R) assert.ok(!o.alive || o.hp < hp, 'and it hit');
  }
});

test('fly-throughs: fighters come down the lane at you firing, then roar past close beside your view - never through it', () => {
  for (const [chap, view] of [[1, 'chase'], [1, 'cockpit'], [2, 'chase']]) {
    const W = E.newWorld(2, 8, chap, { view }); toPlay(W); quiet(W); W.cue = []; play(W, 60);
    const had = new Set(W.objs); E.spawnWave(W, 'pass', 3);
    const foes = W.objs.filter((o) => o.k === 'dart' && !had.has(o)), tag = 'chapter ' + chap + ', ' + view + ': ';
    assert.equal(foes.length, 3);
    let fired = 0, minCam = 1e9, past = 0, edge = 0, look = 0;
    for (let i = 0; i < 1500 && foes.some((o) => o.alive); i++) {
      E.step(W, chap === 1 ? steerTo(W, 0, 8) : {}); W.events.length = 0; W.fx.length = 0; W.shields = 99;
      fired = Math.max(fired, W.eshots.filter((b) => b.k === 'bolt').length); look = Math.max(look, Math.abs(W.look || 0));
      foes.forEach((o) => { if (o.alive && o.wait <= 0 && o.t > 1) { const d = Math.hypot(o.x - W.cam.x, o.y - W.cam.y, o.z - W.cam.z); minCam = Math.min(minCam, d); if (d < 40) edge = Math.max(edge, Math.abs(o.roll)); if (o.rs < W.s - 30) past++; } });
    }
    assert.ok(fired > 0, tag + 'they fire on the way in'); assert.ok(past > 0, tag + 'they go right past you'); assert.ok(foes.every((o) => !o.alive), tag + 'and are gone');
    assert.ok(minCam > 11 && minCam < 30, tag + 'close past your view, never through it: ' + minCam.toFixed(1));
    assert.ok(edge > 1.1, tag + 'on their side as they go by (knife-edge): ' + edge.toFixed(2));
    assert.equal(new Set(foes.map((o) => o.side)).size, 1, tag + 'a stream down one side');
    if (view === 'chase') assert.ok(look > 0.08, tag + 'the camera turns to follow them: ' + look.toFixed(2));
  }
});

test('the Magpie: on your tail and firing; brake and he overshoots, close past you - then you are after him', () => {
  const W = E.newWorld(2, 8, 2); toPlay(W); W.cue = []; W.objs = W.objs.filter((o) => o.free); play(W, 30, {});
  E.spawnWave(W, 'ace', 1); const o = W.objs.find((q) => q.ace); assert.ok(o, 'he is there');
  let shots = 0; play(W, 200, (w) => { w.shields = 99; shots = Math.max(shots, w.eshots.filter((b) => b.k === 'bolt').length); return {}; });
  assert.equal(o.st, 'tail'); assert.ok(o.rs < W.s - 40, 'behind you'); assert.ok(shots > 0, 'firing at you');
  let minCam = 1e9;
  until(W, () => o.st === 'flee', 400, (w) => { w.shields = 99; if (o.t > 1) minCam = Math.min(minCam, Math.hypot(o.x - w.cam.x, o.y - w.cam.y, o.z - w.cam.z)); return { brake: true }; });
  assert.equal(o.st, 'flee', 'braking made him overshoot'); assert.ok(minCam > 11 && minCam < 35, 'close past your view: ' + minCam.toFixed(1));
  play(W, 120, (w) => { w.shields = 99; return {}; }); assert.ok(o.rs > W.s + 120, 'out in front, running');
  const sc = W.score; while (o.alive) E.hitObj(W, o, 1);
  assert.equal(W.ms.ace, 1); assert.ok(W.score - sc >= E.PTS.ace, 'the Magpie down is worth a lot');
});

test('the finale: when she goes, you see it - your ship runs, the camera looks back at her, she blows apart, then the tally', () => {
  const W = E.newWorld(2, 8, 2); toPlay(W); W.cue = [];
  W.objs.filter((o) => o.k === 'gen').forEach((g) => { while (g.alive) E.hitObj(W, g, 3); });
  const br = W.objs.find((o) => o.k === 'bridge'); while (br.alive) E.hitObj(W, br, 3);
  const d0 = Math.hypot(W.ship.x, W.ship.y, W.ship.z); let blew = false, wide = 0, look = 1;
  for (let i = 0; i < 900 && W.phase === 'play'; i++) {
    E.step(W, { fire: true }); W.shields = 99;
    if (W.fx.some((f) => f.k === 'wsblow')) blew = true;
    if (W.finale > 200 && W.phase === 'play') { wide = Math.max(wide, Math.hypot(W.cam.x, W.cam.y, W.cam.z)); const p = E.project(W, 0, 0, 0); look = p ? Math.min(look, Math.abs(p.x - E.CX) / E.CX) : 1; }
    W.events.length = 0; W.fx.length = 0;
  }
  assert.ok(W.esc, 'your ship ran'); assert.ok(Math.hypot(W.ship.x, W.ship.y, W.ship.z) > d0 + 800, 'well away from her');
  assert.ok(blew, 'she blew apart'); assert.ok(wide > 1500, 'a wide shot: ' + wide.toFixed(0)); assert.ok(look < 0.3, 'with her in the middle of it');
  assert.ok(!W.objs.some((o) => o.free && o.alive), 'nothing of her left'); assert.equal(W.shots.length, 0, 'no shooting in the finale');
  assert.equal(W.phase, 'clear', 'then the tally');
});

test('the valley goes up and down (v18): the drop into a deep gorge, a tunnel that climbs, out over the open desert, a plunge back in - never nearer the floor than it should be', () => {
  for (const seed of [4242, 9, 31]) {
    const W = E.newWorld(2, seed, 1), V = W.valley, sec = V.sec;
    assert.ok(W.rail.len > 42000, 'longer: ' + Math.round(W.rail.len));
    let worst = -99; for (let s = 0; s < sec.out; s += 6) worst = Math.max(worst, V.floorAt(s));
    assert.ok(worst <= -13.5, 'the route rides at least 14 above the floor everywhere: ' + worst.toFixed(1));
    let dive = 0; for (let s = sec.drop; s < sec.gorge + 200; s += 10) dive = Math.min(dive, E.frame(W.rail, s).pitch);
    assert.ok(dive < -0.4, 'the drop: a steep dive, ' + (dive * 57.3).toFixed(0) + ' degrees');
    const yAt = (s) => E.frame(W.rail, s).y;
    assert.ok(yAt(sec.gorge + 1500) < yAt(sec.drop - 100) - 100, 'the gorge is far below the narrows: ' + (yAt(sec.drop - 100) - yAt(sec.gorge + 1500)).toFixed(0));
    assert.ok(V.wallAt(sec.gorge + 1500) > 200, 'its walls stand over 200 high: ' + V.wallAt(sec.gorge + 1500).toFixed(0));
    assert.ok(yAt(V.tunnel[1]) > yAt(V.tunnel[0]) + 80, 'the tunnel climbs');
    const mid = (sec.mesa + sec.plunge) / 2;
    assert.ok(V.wallAt(mid) < 5 && V.width(mid) > 300 && V.openAt(mid) > 0.99, 'the mesas: no walls, wide open');
    assert.ok(E.corridor({ ...W, s: mid }).y0 < -18, 'and you may fly lower over the desert');
    assert.ok(yAt(sec.divide + 200) < yAt(sec.plunge - 200) - 90, 'then down again into the canyon');
  }
});

test('squeezes, rockfalls, buttes: thread a squeeze clean for points; hop a rockfall or hit it; round a butte - or over a low one', () => {
  const W = E.newWorld(2, 4242, 1); toPlay(W); quiet(W); W.objs = []; const V = W.valley, q = V.squeezes[0];
  assert.ok(V.width((q.s0 + q.s1) / 2) < 52, 'the walls close in: ' + V.width((q.s0 + q.s1) / 2).toFixed(0));
  W.s = q.s0 - 300; play(W, 2); const sc = W.score, sh = W.shields;
  until(W, () => W.s > q.s1 + 20, 3000, (w) => steerTo(w, 0, 8)); assert.ok(W.score >= sc + E.PTS.squeeze && W.shields === sh, 'threaded: points, no scrape');
  const W2 = E.newWorld(2, 4242, 1); toPlay(W2); quiet(W2); const rf = W2.objs.find((o) => o.k === 'rockfall' && o.w > 900); W2.objs = [rf]; W2.s = rf.rs - 400; play(W2, 2);
  until(W2, () => rf.passed, 3000, (w) => steerTo(w, 0, rf.ly + rf.h + 5)); assert.equal(W2.shields, sh, 'over the rocks is safe');
  const W3 = E.newWorld(2, 4242, 1); toPlay(W3); quiet(W3); const rf3 = W3.objs.find((o) => o.k === 'rockfall' && o.w > 900); W3.objs = [rf3]; W3.s = rf3.rs - 400; play(W3, 2);
  const lv3 = W3.lives; until(W3, () => rf3.passed, 3000, (w) => steerTo(w, 0, -12)); assert.equal(W3.lives, lv3 - 1, 'low into them: you blow up');
  const W4 = E.newWorld(2, 4242, 1); toPlay(W4); quiet(W4); const b = W4.objs.find((o) => o.k === 'butte' && o.bh > 80); W4.objs = [b]; W4.s = b.rs - 500; play(W4, 2);
  const lv4 = W4.lives; until(W4, () => W4.phase !== 'play' || W4.s > b.rs + b.pr + 10, 3000, (w) => steerTo(w, b.lx, 6)); assert.equal(W4.lives, lv4 - 1, 'fly into a butte: you blow up');
  const W5 = E.newWorld(2, 4242, 1); toPlay(W5); quiet(W5); const b5 = W5.objs.find((o) => o.k === 'butte' && o.bh > 80); W5.objs = [b5]; W5.s = b5.rs - 500; play(W5, 2);
  until(W5, () => W5.s > b5.rs + b5.pr + 10, 3000, (w) => steerTo(w, b5.lx + (b5.lx > 0 ? -1 : 1) * (b5.pr + 25), 6)); assert.equal(W5.shields, sh, 'round it: safe');
});

test('the first fork (v18): a fin of rock down the gorge - take the slot on the left and you are kept in it, gold gates and all', () => {
  const W = E.newWorld(2, 11, 1); toPlay(W); quiet(W); const V = W.valley, G = V.ridges[0];
  assert.ok(G.s0 < V.ridgeSpan[0] && V.ridge((G.s0 + G.s1) / 2).w > 12, 'two forks: one in the gorge, then the divide');
  const gold = W.objs.filter((o) => o.k === 'gate' && o.bonus === 2 && o.rs > G.s0 && o.rs < G.s1);
  assert.ok(gold.length >= 5 && gold.every((o) => o.lx < V.ridge(o.rs).x), 'gold gates down the slot: ' + gold.length);
  W.objs = []; W.s = G.s0 - 600; play(W, 2);
  until(W, () => W.s > G.s0 + 600, 3000, (w) => (w.s < G.s0 - 300 ? steerTo(w, -50, 8) : { mouseX: E.CX, mouseY: 127 }));
  const R = V.ridge(W.s); assert.equal(W.lane, -1, 'the slot'); assert.ok(W.ox < R.x - R.w - 3, 'clear of the fin');
  until(W, () => W.s > G.s1 - 100, 4000, { mouseX: E.CX, mouseY: 127 }); assert.equal(W.shields, W.sp.shields, 'down the whole slot, pinches and all, without a scrape');
  until(W, () => W.s > G.s1 + 500, 1000, { mouseX: E.CX, mouseY: 127 }); assert.equal(W.lane, 0, 'free again after it');
});

test('the keel gun (v18): under her it runs along its track to stay with you and fires heavy bolts; it can be shot off it', () => {
  const W = E.newWorld(2, 5, 2, { warship: 'free' }); toPlay(W); quiet(W); W.cue = []; W.objs = W.objs.filter((o) => o.k === 'keel'); const K = W.objs[0];
  assert.ok(K && K.z1 - K.z0 > 1000 && K.y < E.WARSHIP.boxes[0][1], 'her keel gun, on a long track under her');
  K.z = K.z0 + 50; const S = W.ship; S.x = 0; S.y = K.y - 70; S.z = K.z0 + 150; S.yaw = 0; S.pitch = 0; W.aimYaw = 0; W.aimPitch = 0;
  let fired = 0; const z0 = K.z;
  for (let i = 0; i < 240; i++) { const n = W.eshots.length; E.step(W, { ctrl: 'pad' }); if (W.eshots.length > n) fired++; S.y = K.y - 70; S.x = 0; S.yaw = 0; S.pitch = 0; W.events.length = 0; W.fx.length = 0; }
  assert.ok(K.z > z0 + 300 && K.z > S.z && K.z - S.z < 450, 'it runs along its track ahead of you: ' + Math.round(K.z - z0) + ' along, ' + Math.round(K.z - S.z) + ' ahead of you');
  assert.ok(fired > 0 && K.awake, 'and fires');
  const sc = W.score; while (K.alive) E.hitObj(W, K, 1); assert.ok(W.score - sc >= E.PTS.keel, 'shot off it: ' + (W.score - sc));
});

// ---------------------------------------------------------------- v20 (panel 2): kills land, warnings you can count on, fighters with two beats, no dead air
test('v20: a kill holds the world still for a beat - but not every kill in a run', () => {
  const W = E.newWorld(2, 7, 1); toPlay(W); quiet(W); play(W, 30);
  E.spawnWave(W, 'headon', 3); const d = W.objs.filter((o) => o.k === 'dart');
  W.freeze = 0; W.freezeCD = 0; E.hitObj(W, d[0], 9); assert.equal(W.freeze, 3, 'a Shrike: three steps');
  W.freeze = 0; E.hitObj(W, d[1], 9); assert.equal(W.freeze, 0, 'another kill straight after: no second stop');
});
test('v26: Shrikes take three hits on Classic and Fast, two on Gentle (chips first, then the kill)', () => {
  for (const [sp, hp] of [[1, 2], [2, 3], [3, 3]]) {
    const W = E.newWorld(sp, 7, 1); toPlay(W); quiet(W); play(W, 30); E.spawnWave(W, 'headon', 1);
    const d = W.objs.find((o) => o.k === 'dart'); assert.equal(d.hp, hp, E.SPEEDS[sp].name);
    for (let i = 1; i < hp; i++) assert.equal(E.hitObj(W, d, 1), false, 'hit ' + i + ' chips it');
    assert.equal(E.hitObj(W, d, 1), true, 'the last brings it down');
  }
});
test('v26: a fighter far down the lane cannot be hit or locked - only once it has come in close', () => {
  const W = E.newWorld(2, 8, 1); toPlay(W); quiet(W); W.objs = []; play(W, 60);
  E.spawnWave(W, 'headon', 1); const o = W.objs.find((q) => q.k === 'dart'); o.fireT = 1e9; o.holdT = 1e9;
  until(W, () => o.wait <= 0 && o.x != null && E.project(W, o.x, o.y, o.z) && E.project(W, o.x, o.y, o.z).z > 700, 300, (w) => { w.shields = 99; return idle; });
  const p = E.project(W, o.x, o.y, o.z); assert.ok(p && p.z > 700, 'it starts far off (' + (p && p.z | 0) + ')');
  assert.equal(E.pick(W, p.x, p.y), null, 'right under the sight but too far: no hit');
  assert.equal(E.autoPick(W, p.x, p.y, 70), null, 'and no lock');
  until(W, () => o.st === 'hold', 900, (w) => { w.shields = 99; return idle; });
  const q = E.project(W, o.x, o.y, o.z); assert.ok(q.z < 340, 'holding in front of you, close (' + (q.z | 0) + ')');
  assert.equal(E.pick(W, q.x, q.y), o, 'close: under the sight is a hit');
});
test('v20: a fighter glows for its whole warning before its first shot', () => {
  for (const sp of [1, 2, 3]) {
    const W = E.newWorld(sp, 21, 1); toPlay(W); quiet(W); play(W, 30); E.spawnWave(W, 'headon', 1);
    const d = W.objs.find((o) => o.k === 'dart'); let maxTell = 0, b0 = 0, shot = false;
    for (let i = 0; i < 900 && !shot && d.alive; i++) {
      if (d.burst > 0 && !b0) b0 = d.burst; maxTell = Math.max(maxTell, d.tell || 0);
      E.step(W, { mouseX: E.CX, mouseY: 127 }); W.shields = 99; W.events.length = 0; W.fx.length = 0;
      if (b0 && d.burst < b0) { shot = true; assert.equal(d.tell, 0, 'it fires only when the glow is done'); }
    }
    assert.ok(shot, E.SPEEDS[sp].name + ': it fired'); assert.ok(maxTell >= E.SPEEDS[sp].tell - 1, E.SPEEDS[sp].name + ': glowed ' + maxTell + ' of ' + E.SPEEDS[sp].tell);
  }
});
test('v20: no dead air - nowhere in the valley (bar the basin before the Gaoler) goes 5 s with nothing to shoot or fly through', () => {
  const W = E.newWorld(2, 37, 1), sec = W.valley.sec; let quietT = 0, worst = 0, at = 0;
  until(W, (w) => w.chap !== 0 || w.warden, 60 * 60 * 5, (w) => {
    if (w.phase === 'play' && w.s > 600 && w.s < sec.boss - 200) { if (w.chainLive === false) { quietT++; if (quietT > worst) { worst = quietT; at = w.s; } } else quietT = 0; }
    return railBot(w);
  });
  assert.ok(worst < 300, 'longest quiet stretch ' + (worst / 60).toFixed(1) + ' s at ' + Math.round(at));
});
test('v20: the Gaoler fight takes the pilot 30 s or more on Classic - not 12', () => {
  const W = E.newWorld(2, 11, 1); let t0 = null;
  until(W, (w) => w.ms.warden || w.chap !== 0, 60 * 60 * 6, (w) => { if (w.warden && t0 == null) t0 = w.ct; return railBot(w); });
  assert.equal(W.ms.warden, 1, 'beaten'); const secs = (W.ct - t0) / 60; assert.ok(secs >= 30 && secs <= 50, secs.toFixed(1) + ' s');
});
test('v20: gates and guns are counted on the side of a fork you took - nothing to miss on the other', () => {
  const W = E.newWorld(2, 11, 1); until(W, (w) => w.chap !== 0 || w.phase === 'clear', 60 * 60 * 6, railBot);
  const all = W.objs.length; assert.ok(W.ms.gatesAll < 52 && W.ms.gatesAll >= W.ms.gates, 'gates ' + W.ms.gates + ' of ' + W.ms.gatesAll);
  assert.ok(W.tally.some((l) => /^GATES \d+ OF \d+$/.test(l[0]) && /^[0-9,]+$/.test(l[1])), 'the tally: what you did, and its points');
});

test('v20b: grinding along the canyon wall blows you up; a brush costs a shield', () => {
  const W = E.newWorld(2, 3, 1); toPlay(W); quiet(W); W.objs = []; W.s = W.checkpoints[2] + 200; play(W, 2);
  const sh = W.shields, lv = W.lives; W.ox = 300; play(W, 1); assert.equal(W.shields, sh - 1, 'a brush: a shield'); assert.equal(W.lives, lv);
  until(W, () => W.phase !== 'play', 200, (w) => { w.ox = 300; return idle; }); assert.equal(W.lives, lv - 1, 'held against it: a ship');
});
test('v20b: a roll timed right sends a laser back; a laser that only just misses pays a graze', () => {
  const W = E.newWorld(2, 7, 1); toPlay(W); quiet(W); play(W, 30); E.spawnWave(W, 'headon', 1);
  const d = W.objs.find((o) => o.k === 'dart'); play(W, 1);
  const hp = d.hp, s0 = W.score; W.rollT = 22; E.fireBolt(W, d, d.x, d.y, d.z); const b = W.eshots[W.eshots.length - 1];
  b.rs = W.s + 3; b.lx = W.ox; b.ly = W.oy; b.vs = -4; b.vlx = 0; b.vly = 0;
  play(W, 2); assert.ok(W.ms.deflects >= 1, 'deflected'); assert.ok(!d.alive || d.hp < hp, 'back into its shooter'); assert.ok(W.score > s0, 'for points');
});
test('v22: at the tally, short of gold, a flip (R / Y / right-click) flies the chapter again - its score back where it began', () => {
  const W = E.newWorld(2, 13, 2); toPlay(W); const s0 = W.score0, n = W.results.length;
  W.ms.gens = 4; W.ct = 60 * 100; E.chapterDone(W); assert.equal(W.phase, 'clear'); assert.notEqual(W.medal, 'GOLD');
  play(W, 130); E.step(W, { flip: true }); W.events.length = 0;
  assert.equal(W.phase, 'brief', 'the chapter again, from its briefing'); assert.equal(W.chap, 1); assert.equal(W.score, s0, 'score as it began'); assert.equal(W.results.length, n, 'that result struck out');
});
test('v22: the other side on the radio - the Magpie speaks first, then Control', () => {
  const W = E.newWorld(2, 8, 2); toPlay(W); W.cue = []; W.objs = W.objs.filter((o) => o.free); play(W, 30, {});
  E.spawnWave(W, 'ace', 1); assert.equal(W.radio.who, 'MAGPIE');
  let ctl = false; play(W, 400, (w) => { w.shields = 99; if (w.radio && w.radio.id === 'ace_on') ctl = true; return {}; }); assert.ok(ctl, 'and Control answers');
});

// ---------------------------------------------------------------- chapter 3: THE SHOALS (28 Oct)
test('chapter 3, the Shoals: the pilot gets through - the rocks, the quarry, the Magpie, the Millstone - and outruns its blast, at every speed', () => {
  for (const sp of [1, 2, 3]) {
    const W = E.newWorld(sp, 11, 3); assert.equal(E.CHAPTERS[W.chap].id, 'shoals');
    until(W, (w) => w.results.length > 0, 60 * 60 * 8, railBot);
    assert.ok(W.results.length && !W.over, E.SPEEDS[sp].name + ': done'); assert.equal(W.ms.mill, 1, 'the Millstone finished'); assert.ok(!W.ms.caught, 'and its blast outrun');
    assert.ok(W.tally.some((l) => /^ROCKS BROKEN \d+$/.test(l[0])), 'rocks in the tally');
  }
});
test('chapter 3: fly into an asteroid and you blow up; a small rock costs a shield and breaks; a big one, shot, splits', () => {
  const W = E.newWorld(2, 11, 3); toPlay(W); W.objs = []; W.cue = []; play(W, 20);
  W.objs.push({ k: 'asteroid', rs: W.s + 60, lx: W.ox, ly: W.oy, r: 24, alive: true, spin: 0, v: 0 }); const lv = W.lives;
  until(W, (w) => w.phase !== 'play', 200, (w) => ({})); assert.equal(W.lives, lv - 1, 'an asteroid: a ship');
  const W2 = E.newWorld(2, 11, 3); toPlay(W2); W2.objs = []; W2.cue = []; play(W2, 20); const sh = W2.shields;
  const rk = { k: 'rock', rs: W2.s + 40, lx: W2.ox, ly: W2.oy, r: 4, hp: 1, alive: true, spin: 0, v: 0 }; W2.objs.push(rk);
  play(W2, 30); assert.equal(W2.shields, sh - 1, 'a small rock: a shield'); assert.equal(rk.alive, false);
  const big = { k: 'rock', rs: W2.s + 300, lx: 0, ly: 0, r: 10, hp: 1, alive: true, spin: 0, v: 0 }; W2.objs.push(big); E.hitObj(W2, big, 5);
  assert.ok(W2.objs.filter((o) => o.k === 'rock' && o.alive).length >= 2, 'a big rock shot: pieces');
});
test('chapter 3: inside the quarry its walls hold you in - a scrape, then grind and you hit them', () => {
  const W = E.newWorld(2, 11, 3); toPlay(W); W.objs = []; W.cue = []; const V = W.valley;
  W.s = (V.tube[0] + V.tube[1]) / 2 - 900; play(W, 2); const sh = W.shields; W.ox = 200; W.oy = 200; play(W, 1);   // (into a corner: the lane's box stops short of the walls on its flat sides)
  assert.ok(Math.hypot(W.ox, W.oy) < V.tubeAt(W.s), 'kept inside'); assert.equal(W.shields, sh - 1, 'a scrape: a shield');
});
test('chapter 3: the Millstone - arms that can only be hurt as they glow and throw rocks; its cutter; its reactor; then you outrun its blast', () => {
  const W = E.newWorld(2, 11, 3); toPlay(W); W.objs = []; W.cue = []; W.s = W.valley.sec.mill; play(W, 2); E.spawnMillstone(W); const M = W.mill;
  until(W, () => M.st === 'fight', 900, (w) => { w.shields = 99; return idle; });
  const arm = M.parts[0]; assert.ok(arm.shielded, 'an arm, not glowing: shielded');
  let thrown = false; until(W, () => thrown && M.parts[0].tell > 0, 900, (w) => { w.shields = 99; if (w.objs.some((o) => o.k === 'boulder')) thrown = true; return idle; });
  assert.ok(thrown, 'it throws rocks');
  M.parts.slice(0, 2).forEach((q) => { q.shielded = false; while (q.alive) E.hitObj(W, q, 3); }); assert.equal(M.beat, 2, 'arms gone: the cutter');
  const cut = M.parts[2]; cut.shielded = false; while (cut.alive) E.hitObj(W, cut, 3); assert.equal(M.beat, 3);
  until(W, () => !M.parts[3].shielded, 400, (w) => { w.shields = 99; return idle; }); const rea = M.parts[3]; while (rea.alive) E.hitObj(W, rea, 3);
  assert.equal(M.st, 'dying'); assert.equal(W.ms.mill, 1);
  until(W, (w) => w.outrun, 1500, (w) => { w.shields = 99; return idle; }); assert.ok(W.outrun, 'you fly under it and it blows');
  until(W, (w) => w.results.length, 900, (w) => { w.shields = 99; return { boost: true }; }); assert.ok(!W.ms.caught, 'full thrust: outrun'); assert.equal(W.phase, 'clear');
});

test('v28: the farm on the highlands - down every raider and it is saved (and pays); fly past and it is lost', () => {
  const calm = (w) => { w.cue = w.cue.filter((c) => !c.wave && !c.boss); w.objs = w.objs.filter((o) => o.raid || (o.k !== 'turret' && o.k !== 'drone')); w.objs.forEach((o) => { if (o.raid) o.armed = false; }); };
  const W = E.newWorld(2, 8, 1); toPlay(W); calm(W);
  assert.ok(W.farm, 'there is a farm'); const raid = W.objs.filter((o) => o.raid); assert.equal(raid.length, 4, 'four raiders');
  assert.ok(Math.abs(W.farm.lx) > W.valley.width(W.farm.rs) / 2, 'the farm is beside the lane, not in it');
  W.s = W.farm.rs - 600; play(W, 2); const sc = W.score;
  raid.forEach((o) => { while (o.alive) E.hitObj(W, o, 1); }); play(W, 2);
  assert.equal(W.ms.farm, 1, 'saved'); assert.ok(W.score - sc >= 5000, 'and paid');
  const W2 = E.newWorld(2, 8, 1); toPlay(W2); calm(W2); W2.s = W2.farm.rs + 400; play(W2, 2);
  assert.equal(W2.ms.farm, -1, 'flown past with its raiders still there: lost');
});

// ---------------------------------------------------------------- (v31) the story: Noodle Doodles
test('v31: the opening scene plays before the first briefing, and fire skips it', () => {
  const W = E.newWorld(2, 8, 1, { intro: true }); assert.equal(W.phase, 'logo', 'the title first'); play(W, 40); play(W, 1, { tap: true }); assert.equal(W.phase, 'intro');
  play(W, 100); assert.equal(W.phase, 'intro'); assert.ok(W.story.mag && W.story.cam && W.story.cap, 'the Magpie, the camera, the words');
  play(W, 1, { tap: true }); assert.equal(W.phase, 'brief'); assert.equal(W.story.holder, 'mag');
  const W2 = E.newWorld(2, 8, 1); assert.equal(W2.phase, 'brief', 'not asked for: no opening scene');
});
test('v31: the chase - cruise and the Magpie pulls away with her; thrust and you close on him (and score for staying on his tail)', () => {
  const W = E.newWorld(2, 8, 1); toPlay(W); quiet(W);
  const g0 = W.story.gap; play(W, 300, (w) => { w.shields = 99; return {}; }); assert.ok(W.story.gap > g0, 'cruising, he gets away (' + Math.round(W.story.gap) + ')');
  const sc = W.score; play(W, 600, (w) => { w.shields = 99; return { thr: 1 }; }); assert.ok(W.story.gap < 260, 'full thrust: on his tail (' + Math.round(W.story.gap) + ')');
  assert.ok(W.ms.chase > 0 && W.score > sc, 'points for staying on his tail');
  assert.ok(W.story.mag && W.story.pod, 'he is there to see, her pod under him');
});
test('v31: the story through the chapters - the Gaoler takes her, up to the warship, her brig; the Shoals: the Millstone has her, then she is rescued', () => {
  const W = E.newWorld(1, 8, 1); until(W, (w) => w.results.length > 0, 60 * 60 * 9, railBot);
  assert.equal(W.story.holder, 'up', 'the Gaoler took her up to the warship');
  const W2 = E.newWorld(2, 8, 2); assert.equal(W2.story.holder, 'brig');
  const W3 = E.newWorld(1, 11, 3); let sawMill = false;
  until(W3, (w) => { if (w.story.holder === 'mill') sawMill = true; return w.results.length > 0; }, 60 * 60 * 9, railBot);
  assert.ok(sawMill, 'the Magpie left her with the Millstone');
  assert.equal(W3.ms.rescued, 1, 'and she is rescued'); assert.equal(W3.story.holder, 'ship');
  assert.ok(W3.tally.some((l) => l[0] === 'NOODLE DOODLES RESCUED'));
});

// ---------------------------------------------------------------- (v32) the Curly Pack
const packWorld = () => { const W = E.newWorld(2, 8, 1); toPlay(W); quiet(W); W.objs = W.objs.filter((o) => o.k !== 'dart' && o.k !== 'heavy'); play(W, 30, (w) => { w.shields = 99; return {}; }); return W; };
test('v32: a pack of three or more has a gold-collar leader - down it and the rest scatter, it pays, and it drops a treat', () => {
  const W = packWorld(); E.spawnWave(W, 'headon', 3); const pk = W.objs.filter((o) => o.k === 'dart' && o.alive);
  const L = pk.find((o) => o.packLead); assert.ok(L, 'a leader'); assert.equal(pk.filter((o) => o.packLead).length, 1);
  const sc = W.score; while (L.alive) E.hitObj(W, L, 1);
  assert.ok(pk.filter((o) => o !== L).every((o) => o.scared), 'the rest scatter'); assert.equal(W.ms.packs, 1); assert.ok(W.score - sc > E.PTS.dart, 'a pack bonus');
  assert.ok(W.objs.some((o) => o.k === 'treat'), 'a treat dropped');
});
test('v32: a Howler shields its pack (lasers bounce off, rockets break it); down the Howler and the shields drop', () => {
  const W = packWorld(); E.spawnWave(W, 'howl', 4); const H = W.objs.find((o) => o.role === 'howl'); assert.ok(H);
  until(W, (w) => w.objs.some((o) => o.shieldT > 0), 1500, (w) => { w.shields = 99; return {}; }); const f = W.objs.find((o) => o.shieldT > 0); assert.ok(f, 'it howled: shields up');
  const hp = f.hp; assert.equal(E.hitObj(W, f, 1), false); assert.equal(f.hp, hp, 'a laser does nothing');
  const g = W.objs.find((o) => o.shieldT > 0 && o !== f); if (g) { E.hitObj(W, g, 3); assert.equal(g.shieldT, 0, 'a rocket breaks the shield'); }
  while (H.alive) E.hitObj(W, H, 3); assert.ok(W.objs.every((o) => !(o.shieldBy === H && o.shieldT > 0)), 'Howler down: shields down'); assert.equal(W.ms.howlers, 1);
});
test('v32: a Fluffball soaks up most lasers while it faces you; Fetchers lob balls you can shoot', () => {
  const W = packWorld(); E.spawnWave(W, 'heavy', 1); const F = W.objs.find((o) => o.k === 'heavy'); F.st = 'hold'; const hp = F.hp;
  E.hitObj(W, F, 1); E.hitObj(W, F, 1); E.hitObj(W, F, 1); assert.equal(F.hp, hp - 1, 'one laser in three gets through the fur');
  const W2 = packWorld(); E.spawnWave(W2, 'fetch', 2);
  assert.ok(until(W2, (w) => w.eshots.some((b) => b.ball), 1800, (w) => { w.shields = 99; return {}; }), 'a ball is thrown');
  const b = W2.eshots.find((q) => q.ball); assert.ok(b.r > 0 && b.alive, 'and it can be shot'); assert.equal(E.hitObj(W2, b, 1), true);
});
test('v32: treats and squeaky toys - fly through them', () => {
  const W = packWorld(); W.objs.push({ k: 'treat', rs: W.s + 40, lx: W.ox, ly: W.oy, kind: 'spread', alive: true, r: 0, t: 0 });
  play(W, 30, (w) => { w.shields = 99; return {}; }); assert.equal(W.power && W.power.k, 'spread', 'the spread laser');
  assert.equal(W.ms.toysAll, 3, 'three toys in the valley'); const toy = W.objs.find((o) => o.k === 'toy'); W.s = toy.rs - 60; W.ox = toy.lx; W.oy = toy.ly;
  play(W, 25, (w) => { w.shields = 99; w.ox = toy.lx; w.oy = toy.ly; return {}; }); assert.equal(W.ms.toys, 1, 'a toy found');
});
