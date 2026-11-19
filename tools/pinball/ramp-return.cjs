/* 365 Pinball Hero - the heat ramp's return (ported 5 Nov 2026 from the wave 3 audit, 01 pinball designer). Never
 * deployed. Shoot the ramp (a ball at its entry going up at 8 speeds), measure the speed it leaves the ramp into the
 * right inlane, then try the right flipper: held up from the moment it lands (a live catch), flipped at every delay
 * 0-700 ms, or left alone. Wave 3 wants the exit at most T.ramp.exitMax (450 u/s Classic) and a held flipper to keep
 * at least 7 of 8 speeds.   node tools/pinball/ramp-return.cjs [speed=2] */
'use strict';
const E = require('../../games/pinball/engine.js');
const SPEED = +(process.argv[2] || 2), KS = Math.sqrt(E.SPEEDS[SPEED].g / 590);
function shoot(v, policy, delayF) {
  const W = E.newWorld(SPEED, null, 91, 'ember');
  v *= KS;
  W.balls.length = 0; const b = E.addBall(W, 141, 246); b.vx = 0; b.vy = -v; b.launched = true; W.saveArmed = false; W.kickback = false;
  let wasRamp = false, exitSub = null;   // (the speed at the substep it leaves the far end)
  W.onSub = (W2) => { const o = W2.balls[0]; if (!o) return; if (wasRamp && o.m === 'free' && exitSub == null) exitSub = Math.round(Math.hypot(o.vx, o.vy)); wasRamp = o.m === 'ramp'; };
  let out = null, exitV = null, rel = -1, res = null, cr = 0;
  for (let f = 0; f < 60 * 5 && !res; f++) {
    let inp = {};
    if (rel >= 0) {
      const t = f - rel;
      if (policy === 'hold') inp = { right: true };
      else if (policy === 'flip' && t >= delayF && t < delayF + 8) inp = { right: true };
    }
    E.step(W, inp);
    for (const e of W.events) {
      const n = typeof e === 'string' ? e : e && e.sfx;
      if ((n === 'ramp' || n === 'combo') && rel < 0) { rel = f; exitV = exitSub; }
      if (n === 'rampfail') res = 'rolled back';
      if (rel >= 0 && n === 'drain') res = 'drain';
      if (rel >= 0 && ['crater', 'orbit', 'loop', 'drop', 'crab', 'rampin', 'bumper', 'sling', 'spin', 'puff', 'lane'].includes(n) && !res && policy !== 'hold') res = 'hit ' + n;
    }
    W.events.length = 0;
    const B = W.balls[0];
    if (rel >= 0 && B && policy === 'hold' && E.nearRaisedFlipper(W, B) && Math.abs(B.vx) + Math.abs(B.vy) < 25) { if (++cr > 20) res = 'cradled'; } else cr = 0;
    if (rel >= 0 && B && policy === 'hold' && B.y < 330 && f - rel > 30) res = 'bounced back up';
  }
  return { exitV, res: res || 'alive', rel };
}
const speeds = [700, 800, 900, 1000, 1100, 1250, 1400, 1600];
const rows = [];
for (const v of speeds) {
  const none = shoot(v, 'none'), hold = shoot(v, 'hold');
  if (none.exitV == null) { rows.push({ v, made: false, none: none.res }); continue; }
  const flips = {}; let firstOK = null, lastOK = null;
  for (let d = 0; d <= 42; d++) { const r = shoot(v, 'flip', d).res; flips[r] = (flips[r] || 0) + 1; if (r !== 'drain') { if (firstOK == null) firstOK = d; lastOK = d; } }
  rows.push({ v, exitV: none.exitV, noFlip: none.res, holdUp: hold.res, flipDelays0to700ms: flips, safeFlipFrames: firstOK == null ? 'none' : (firstOK * 16.7).toFixed(0) + '-' + (lastOK * 16.7).toFixed(0) + ' ms after it leaves the ramp' });
}
console.log(JSON.stringify(rows, null, 0).replace(/\},\{/g, '},\n{'));
const made = rows.filter((r) => r.exitV != null), held = made.filter((r) => r.holdUp !== 'drain');
console.log('exit at most ' + Math.max.apply(null, made.map((r) => r.exitV)) + ' u/s (cap ' + Math.round(E.table('ember').T.ramp.exitMax * KS) + '); a held flipper keeps ' + held.length + ' of ' + made.length + ' ramp speeds (' + made.map((r) => r.v + ':' + r.holdUp).join(', ') + ')');
module.exports = { rows: rows, held: held.length, made: made.length };
