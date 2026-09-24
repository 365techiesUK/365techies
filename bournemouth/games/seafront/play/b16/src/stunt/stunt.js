// THE STUNT STAGE - freestyle score attack (tmp-tr173), the seventh level.
//
// The owner asked for "a stunt stage where you can do stunts on a jet ski", and, asked what
// kind of stage, chose FREESTYLE SCORE ATTACK. So: an open marked course (gl/stunt-arena.js),
// a clock, no route, no target, no weapon, and a score built out of what the engine can
// honestly measure about a jump.
//
// ---------------------------------------------------------------------------------------
// WHAT IT SCORES, AND WHY EACH AXIS IS HERE
//
//   airtime    ui/juice.js's AirTracker, IMPORTED - the physics' own airborne test
//              (hull.js sets airTicks only when no spring point is wetted and none is
//              aground). Not a threshold this file invented.
//   height     the rise AFTER leaving the deck, which is what a launch adds and a skip
//              across a trough does not. Also AirTracker's, also imported.
//   rotation   net yaw swept while airborne. The one genuinely new measurement here, and
//              the one to be careful about - see ROTATION below.
//   landing    ui/juice.js's rateLanding(), reached through its own AirTracker, which is
//              what calls it - so there is one grading function in the build, not two.
//   combo      a multiplier that builds across linked landings and decays when you stop.
//
// ---------------------------------------------------------------------------------------
// ⚠️ ROTATION - WHAT THIS LEVEL CAN AND CANNOT DETECT
//
// hull.js integrates `heading` with no wrapping, so yaw is an unwrapped accumulator and a
// spin is exactly heading(touchdown) - heading(launch). It is NET, not the integral of
// |dheading|: integrating the absolute rate would turn a wobble into a score.
//
// ⚠️ 2026-09-20 (STUNTBAL): WHAT STOOD HERE IS NOW FALSE AND IS REPLACED RATHER THAN LEFT.
// It said that a full rotation could not be reached in this model and that nothing here
// pretended otherwise, with the tmp-tr173 measurement behind it (|spin| p50 0.4 deg, MAX
// 34.3 deg on a jetski). The superseded sentence is DESCRIBED rather than quoted, because
// this project has been bitten by prose that reintroduces the very string it removes. That
// was true of the model it was written against. src/air-spin.js (tmp-tr176) then added an
// arcade air-rotation assist - the steering input drives the heading directly while the hull
// is airborne off a ramp deck - and a full rotation became reachable. Re-measured on this
// tree, through this level's own rules:
//
//     test-stunt's envelope probe, real hull, real ramp  417.2 deg
//     landed and BANKED in a real 120 s ride, jetski     381.9 deg
//     landed and BANKED in a real 120 s ride, speedboat  215.2 deg
//     eFoil                                               27.0 deg
//
// THE NAMING RULE HAS NOT CHANGED, only what satisfies it: this level names no trick the
// model cannot earn. A 360 is earned above, so the HUD may print one and now does, at
// STUNT_RUN.spinFull. Nothing else is named. There is no backflip, no barrel roll and no
// flip of any kind in this file, because pitch and roll have NO air control at all and
// hull.js clamps them to +-51.6 and +-45.8 deg - so those remain names the model cannot
// earn and this file must not print.
//
// ⚠️ AND THE eFOIL CANNOT EARN EITHER NAME. air-spin.js is a hull assist; plant.js is a
// longitudinal point mass whose heading IS its direction of travel, so driving that heading
// would fly the craft round a circle rather than rotate it. raid/tuning.js's ROTATION block
// carries the same note from the other end.
//
// ---------------------------------------------------------------------------------------
// ⚠️ THE LANDING GRADE IS REUSED, BUT NOT THE AXIS THAT CARRIES IT
//
// ⚠️ 2026-09-20 (UITAIL): THE OLD REASON FOR THIS IS DEAD. RE-MEASURED, AND THE CODE STAYS.
// What stood here said juice.js's `fall` axis (vertical speed at touchdown) "reads 1.00 on
// 100% of ramp landings on this course", so `grade` called a clean big air a BELLY FLOP and
// this level had to read attitude instead. That WAS true. It is now false, and a comment
// that contradicts the code is how three defects hid on this project in one day, so it is
// replaced rather than left standing.
//
// tmp-tr174 re-derived rateLanding from 14,184 landings: with the flight known, `fall` now
// grades only the arrival speed that free flight does NOT explain. Re-measured on this
// course through this level's own fastForward() - 221 real landings, 3 craft x 3 sea states
// x 18 approaches, work/landsweep.mjs in tmp-tr177/uitail:
//
//     fall = 1.00 on   0 of 221     (it was 100%)      BELLY FLOP printed   0 times
//     fall >  0   on   2 of 221     max 0.728
//
// SO WHY DOES THE LEVEL STILL READ att = max(nose, tilt) RATHER THAN grade? Three reasons,
// and none of them is the old one:
//
//   1. THE TWO DO NOT AGREE, AND THEY DISAGREE WHERE IT MATTERS. Over the same 221
//      landings, `grade >= 1` and `att <= landOk` agree 91.9% (eFoil 100%, jetski 87.7%,
//      speedboat 94.2%). Every single one of the 18 disagreements runs one way - `grade` is
//      the more forgiving - and they concentrate on the big jumps: of the 65 landings that
//      gained 1.5 m or more, 15 differ (23.1%). The canonical one is the gate-kicker at
//      1.97 s and 4.36 m of rise, arriving 26.5 deg nose-up: att 1.000, so this level calls
//      it BLOWN, while rateLanding calls it ROUGH LANDING and banks points. That is the
//      showpiece jump on the course, and the two judgements differ on it.
//   2. ui/juice.js NOW DEPENDS ON THIS READING. Its own re-derivation header says so:
//      "THE UPPER TWO ARE ALSO PINNED FROM DOWNSTREAM ... src/stunt/ reads THESE axes".
//      noseBad 24 and rollBad 44 were chosen over the 20/40 the distribution alone gives
//      precisely to keep this level's cut working, with 0.026 of margin. Reading `grade`
//      here would strand that choice with nothing left holding it.
//   3. score1() NEEDS A CONTINUOUS AXIS. The landing multiplier is
//      1 + (landMultMax-1) * (1 - att/landOk) - it grades HOW level, not whether. `grade` is
//      a four-value integer and cannot express it; swapping would be a scoring redesign.
//
// So: SAME function, SAME thresholds, one judgement in the build; only the cut point is
// this level's, and it is now a deliberate stricter cut rather than a way round a broken
// axis. Measured against ui/juice.js sha1 bd4208a2 and raid/tuning.js sha1 8b478638 - if
// either moves, re-run work/landsweep.mjs before trusting the rates above.
//
// ⚠️ AND THE OVERLAY IS MUTED WHILE THIS LEVEL RUNS, through juice.js's own public mute()
// API - the one the raid's intro card already uses. ITS REASON ALSO CHANGED. It used to be
// that juice.js would print "BELLY FLOP · no score" beside this HUD's "+223 x3"; it prints
// no belly flop at all now. It is kept because of point 1 above: unmuted, the overlay puts
// its own verdict AND its own running point total on the left of the screen while this HUD
// prints a different verdict and a different score at the top, and on 8.1% of landings -
// 23.1% of the big ones - the two words contradict each other outright. Two readouts that
// disagree is worse than one, which is the rule juice.js's own header states about the
// raid's combo. Restored on exit, exactly as it was.
//
// ---------------------------------------------------------------------------------------
// CONTENT
//
// No swimmer, no casualty, no weapon, no damage, no gore, and nothing to sink - there is
// nothing in this level to hit but the water, the ramps and the course marking. No lettering
// or branding anywhere in the world geometry (gl/stunt-arena.js says the same from its end);
// the only text in this level is this HUD, which is DOM on an overlay and can never reach
// the calibration corpus.
//
// HOW IT IS KEPT OUT OF A CALIBRATION RENDER, three independent ways, the same three
// ui/juice.js uses:
//   1. initStunt() does not build the HUD at all when the URL carries ?cal=.
//   2. `body.clean-render #st-root { display: none }` below, the rule every overlay here
//      carries, so ?clean=1 hides it even if it were built.
//   3. tick() is called from inside main.js's `!paused && !__calFrozen` block, so ?hold=1
//      freezes it with the sim.
// The three judged stunt views are ?arena=stunt&cal=...&clean=1&hold=1 renders: the COURSE
// is built (it is world geometry and it is the thing being measured) and this HUD is not.
//
// UI RULES (project standard): no text below 16 real px. ⚠️ 2026-09-20 (UITAIL): the note
// that used to sit here said index.html sets the page font to 12px, so a floor written in
// `rem` would render a quarter under it. tmp-tr174 RE-BASED THE ROOT TO 16px, so that is no
// longer true and the warning it carried no longer describes this build. Every size below
// is still in PIXELS - not because rem lies now, but because absolute px is what the rest of
// this layer already uses and mixing the two is how a floor goes unnoticed. No accordion, no
// carousel, no drag, and the whole layer is pointer-events:none so it can neither be pressed
// nor block a control underneath it.

import { AirTracker, JUICE, getJuice } from '../ui/juice.js';
import { STUNT_RUN } from '../raid/tuning.js';
import { STUNT_ON, STUNT_BOUNDS, STUNT_SPAWN, STUNT_RAMPS } from '../gl/stunt-arena.js';
// >>> PROGRESS
import * as prog from '../ui/progress-store.js';
// <<< PROGRESS

const RAD = 180 / Math.PI;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// The event vocabulary, exported so a harness can assert the whole set rather than the two
// cases somebody happened to think of.
export const STUNT_EVENTS = ['start', 'trick', 'blown', 'bank', 'combo', 'over'];

// ---------------------------------------------------------------------------------------
// THE RULES. Pure: no DOM, no clock, no `location`, no imports beyond juice.js and the
// tuning table, so a node harness can drive it with numbers (tmp-tr173/test-stunt.mjs).
// ---------------------------------------------------------------------------------------
export class StuntRun {
  constructor(T = STUNT_RUN) {
    this.T = T;
    this.air = new AirTracker(JUICE);
    this.reset();
  }

  reset() {
    this.air.reset();
    this.time = 0;
    this.left = this.T.runSec;
    this.phase = 'run';
    this.score = 0;
    this.combo = 1;             // LINKED LANDINGS, 1 = none yet. The multiplier is derived.
    this.comboT = 0;
    this.best = 0;              // best single trick
    this.bestAir = 0;
    this.bestSpin = 0;
    this.tricks = 0;
    this.blown = 0;
    this.pending = null;        // a trick rated at touchdown, not yet banked
    this.last = null;           // the last banked or blown trick, for the HUD
    this.hdg0 = null;           // heading at the moment the craft left the water
    this.wasUp = false;
    this.events = [];
  }

  // multiplier = 1 + step * (linked - 1), capped.
  get mult() { return Math.min(this.T.comboMax, 1 + this.T.comboStep * (this.combo - 1)); }
  get comboFrac() { return this.T.comboWindow > 0 ? clamp(this.comboT / this.T.comboWindow, 0, 1) : 0; }

  _emit(e) { e.t = +this.time.toFixed(2); this.events.push(e); return e; }

  // What one landed trick is worth, before the combo. Pure and exported through score()
  // so the table in raid/tuning.js can be checked by hand.
  score1(air, rise, spin, att) {
    const base = air * JUICE.pointsPerSec
      + Math.max(0, rise) * this.T.risePts
      + Math.abs(spin) * this.T.spinPts;
    // Landing multiplier over the band that is left once `fall` has pinned: dead level is
    // worth landMultMax, and only just holding together is worth 1.
    const k = 1 + (this.T.landMultMax - 1) * clamp(1 - att / this.T.landOk, 0, 1);
    return base * k;
  }

  // dt seconds; `s` is ui/juice.js's craftSample() output, `heading` the craft's yaw in
  // radians (unwrapped). heading may be null - then the spin reads 0 and says so.
  update(dt, s, heading) {
    if (this.phase !== 'run') return null;
    this.time += dt;
    this.left = Math.max(0, this.T.runSec - this.time);
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) { this.comboT = 0; if (this.combo > 1) { this.combo = 1; this._emit({ type: 'combo', n: 1 }); } }
    }

    // Latch the heading at the instant the craft leaves the water. Done here rather than
    // inside AirTracker because the tracker is juice.js's and is not mine to extend; this
    // is a new measurement beside it, not a second copy of its state machine.
    const up = !!(s && s.airborne && !s.down);
    if (up && !this.wasUp) this.hdg0 = (heading === null || heading === undefined) ? null : heading;
    const spinNow = (up && this.hdg0 !== null && heading !== null && heading !== undefined)
      ? (heading - this.hdg0) * RAD : 0;
    this.wasUp = up;

    const ev = this.air.step(dt, s);
    let out = null;
    if (ev && ev.type === 'land') {
      // rateLanding has already run inside AirTracker and its axes are on the event.
      const att = Math.max(ev.nose, ev.tilt);
      const landed = att <= this.T.landOk;
      const spin = this.hdg0 !== null && heading !== null && heading !== undefined
        ? (heading - this.hdg0) * RAD : 0;
      const raw = landed ? this.score1(ev.air, ev.rise, spin, att) : 0;
      this.pending = {
        air: ev.air, rise: ev.rise, spin: +spin.toFixed(1), att: +att.toFixed(3),
        landed, raw: Math.round(raw), label: ev.label, grade: ev.grade,
        mult: this.mult, points: Math.round(raw * this.mult),
      };
      // A blown landing costs the combo AT TOUCHDOWN, not when the tracker banks it half a
      // second later: the HUD must not still be showing a multiplier under the word BLOWN.
      if (!landed) this._breakCombo();
      out = this._emit({ type: landed ? 'trick' : 'blown', ...this.pending });
      this.last = { ...this.pending };
    } else if (ev && ev.type === 'bank' && this.pending) {
      const p = this.pending; this.pending = null;
      if (p.landed) {
        this.score += p.points;
        this.tricks++;
        if (p.points > this.best) this.best = p.points;
        if (p.air > this.bestAir) this.bestAir = p.air;
        if (Math.abs(p.spin) > this.bestSpin) this.bestSpin = +Math.abs(p.spin).toFixed(1);
        this.combo = Math.min(this.combo + 1, 1 + (this.T.comboMax - 1) / this.T.comboStep);
        this.comboT = this.T.comboWindow;
        out = this._emit({ type: 'bank', ...p, score: this.score, combo: this.combo });
      } else {
        // The combo already went at touchdown; this only records the miss.
        this.blown++;
        out = this._emit({ type: 'blown', ...p, score: this.score, banked: true });
      }
    } else if (ev && ev.type === 'lost') {
      // The craft went down inside the grace window: the air was not survived. juice.js's
      // own rule, reused - "a clean landing scores, a belly-flop does not" applies to what
      // happens AFTER the hull is down too.
      this.pending = null;
      this.blown++;
      this._breakCombo();
      this.last = { air: ev.air, rise: 0, spin: 0, att: 1, landed: false, raw: 0, points: 0, label: 'WIPED OUT', grade: 0, mult: 1 };
      out = this._emit({ type: 'blown', air: ev.air, points: 0, label: 'WIPED OUT', wipe: true });
    }

    if (this.left <= 0) {
      this.phase = 'over';
      out = this._emit({
        type: 'over', score: this.score, tricks: this.tricks, blown: this.blown,
        best: this.best, bestAir: this.bestAir, bestSpin: this.bestSpin,
      });
    }
    this._spinNow = spinNow;
    return out;
  }

  _breakCombo() {
    if (this.combo > 1) this._emit({ type: 'combo', n: 1, broken: true });
    this.combo = 1; this.comboT = 0;
  }

  // Live read-out for the HUD, so the HUD never recomputes a rule.
  get live() {
    return {
      up: this.air.up, air: this.air.air, rise: this.air.rise,
      spin: this._spinNow || 0,
      left: this.left, score: this.score, combo: this.combo,
      mult: this.mult, frac: this.comboFrac, last: this.last, phase: this.phase,
    };
  }
}

// Is a world point inside the marked course? Used only by the HUD's "off the course" nudge,
// and it is the arena's own rectangle, never a second copy of it.
export function insideCourse(x, z, pad = 0) {
  const B = STUNT_BOUNDS;
  return x >= B.x0 - pad && x <= B.x1 + pad && z >= B.z0 - pad && z <= B.z1 + pad;
}

// ---------------------------------------------------------------------------------------
// THE OVERLAY. Its own module and its own DOM, for the reason raid/raid-hud.js is not
// touched: that file belongs to another pass. The smuggling run built its HUD the same way
// and this follows it.
//
// PLACEMENT. The raid stylesheet owns top-centre (wave), top-right (score), bottom-left
// (stat card / the phone's steering stick) and bottom-right (FIRE and WATER), and ui/juice.js
// owns the left edge at mid height. In THIS level none of the raid is on screen and juice is
// muted, so the whole top band is free - and the top band is where a clock and a score
// belong, because they are the two things a score attack is read from. The trick line sits
// just under them so the eye does not have to travel.
// ---------------------------------------------------------------------------------------
const CSS = `
#st-root { position: absolute; inset: 0; pointer-events: none; z-index: 30; overflow: hidden;
  font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif; }
body.clean-render #st-root { display: none !important; }
/* ⚠️ THE LEVEL CAN BE TAKEN OVER MID-RUN. Shift+L starts a raid from anywhere, including
   from inside this course, and initStunt's frame hook then stands this level down. Its
   DOM does not go with it - the hook simply stops being called - so without this class
   the last painted clock and score sat frozen on top of the raid. Caught in a live
   browser, not by reading the code. exit() sets it, enter() clears it. */
#st-root.off { display: none; }
/* ⚠️ TOP-CENTRE IS NOT EMPTY ON A DESKTOP, and the first cut of this HUD sat on top of two
   other passes' controls. index.html puts #viewbar at top 12 and boats/hub.js puts #craftbar
   at top 52, both centred, and the craft bar is genuinely useful in this level - a player may
   want the speedboat. So this strip starts BELOW both of them at 86 px. On touch the view bar
   is hidden outright (index.html:130) and the craft bar moves to top 8, which frees the band
   from about 40 px down; the touch rules at the foot of this sheet take it. Measured on the
   live page at 1280x720 and at 844x390 rather than read off the stylesheet. */
#st-top { position: absolute; left: 50%; top: 86px; transform: translateX(-50%);
  display: flex; gap: 22px; align-items: baseline; white-space: nowrap;
  text-shadow: 0 2px 6px rgba(0,0,0,.92), 0 0 14px rgba(0,0,0,.6); }
#st-top .k { font: 800 16px/1 ui-sans-serif, system-ui, sans-serif; letter-spacing: .1em;
  color: #9fb3c4; margin-right: .45em; }
#st-clock { font: 900 34px/1 ui-monospace, "Cascadia Mono", Consolas, monospace; color: #e8f2fb; }
#st-clock.low { color: #ff8b80; }
#st-score { font: 900 34px/1 ui-monospace, "Cascadia Mono", Consolas, monospace; color: #ffd76a; }
#st-mult { font: 900 26px/1 ui-monospace, "Cascadia Mono", Consolas, monospace; color: #9df06a; opacity: 0; }
#st-mult.on { opacity: 1; }
#st-mult.hot { color: #ffe95a; }
#st-bar { position: absolute; left: 50%; top: 128px; transform: translateX(-50%);
  width: min(300px, 62vw); height: 4px; border-radius: 2px; background: rgba(255,255,255,.16); opacity: 0; }
#st-bar.on { opacity: 1; }
#st-bar i { display: block; height: 100%; border-radius: 2px; background: #9df06a; width: 0; }
#st-bar.hot i { background: #ffe95a; }
#st-trick { position: absolute; left: 50%; top: 142px; transform: translateX(-50%);
  text-align: center; white-space: nowrap; opacity: 0; transition: opacity .18s;
  text-shadow: 0 2px 6px rgba(0,0,0,.92); }
#st-trick.on { opacity: 1; }
#st-trick b { display: block; font: 900 22px/1.2 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: .05em; color: #ffe95a; }
#st-trick.bad b { color: #ff8b80; }
#st-trick span { display: block; font: 700 16px/1.35 ui-sans-serif, system-ui, sans-serif;
  color: #dfe9f3; letter-spacing: .02em; }
#st-air { position: absolute; left: 50%; top: 194px; transform: translateX(-50%);
  font: 800 16px/1.2 ui-sans-serif, system-ui, sans-serif; color: #8fe3ff; letter-spacing: .04em;
  opacity: 0; text-shadow: 0 2px 6px rgba(0,0,0,.92); white-space: nowrap; }
#st-air.on { opacity: 1; }
#st-air b { font: 900 26px/1.05 ui-monospace, "Cascadia Mono", Consolas, monospace; margin-right: .25em; }
#st-out { position: absolute; left: 50%; bottom: 74px; transform: translateX(-50%);
  font: 800 17px/1.3 ui-sans-serif, system-ui, sans-serif; color: #ffc86a; letter-spacing: .05em;
  opacity: 0; transition: opacity .2s; text-shadow: 0 2px 6px rgba(0,0,0,.92); white-space: nowrap; }
#st-out.on { opacity: 1; }
/* The two cards. Centred blocks, and they are the only thing on this layer that is a panel:
   a briefing and a result are read standing still, not at 70 km/h. */
#st-card { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  display: none; width: min(560px, calc(100% - 32px)); padding: 18px 20px 20px;
  border-radius: 12px; background: rgba(12,14,18,.94); border: 1px solid rgba(255,255,255,.14);
  backdrop-filter: blur(6px); }
#st-card.on { display: block; }
#st-card h3 { margin: 0 0 8px; font: 900 19px/1.2 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: .08em; color: #ffd76a; }
#st-card p { margin: 0 0 8px; font: 400 16px/1.45 ui-sans-serif, system-ui, sans-serif; color: #dfe9f3; }
#st-card .dim { color: #9fb3c4; font-size: 16px; }
#st-card table { border-collapse: collapse; margin: 4px 0 8px; }
#st-card td { padding: 2px 14px 2px 0; font: 700 16px/1.4 ui-sans-serif, system-ui, sans-serif; color: #dfe9f3; }
#st-card td.n { font: 900 18px/1.4 ui-monospace, "Cascadia Mono", Consolas, monospace; color: #ffd76a; }
/* The two buttons on the end card. The picker's own pill, so a player meets one shape in this
   game and not two: index.html's #tmode .body button is 700 12.5px on #ffc21a with a 10 px
   radius. Sized up to the 16 px floor this layer keeps, and 44 px tall because unlike the
   rest of this overlay these two ARE touch targets. */
#st-card button { min-height: 44px; margin: 4px 8px 0 0; padding: 0 18px; border: 0;
  border-radius: 10px; font: 700 16px ui-sans-serif, system-ui, sans-serif; letter-spacing: .06em;
  color: #0b1520; background: #ffc21a; cursor: pointer; }
#st-card button + button { background: rgba(255,255,255,.16); color: #e8edf4; }
/* A phone in portrait: the view bar is gone and the craft bar is at top 8, so the strip comes
   back up to 44 and everything under it follows. */
@media (max-width: 480px) {
  #st-clock, #st-score { font-size: 27px; }
  #st-top { gap: 14px; top: 44px; }
  #st-bar { top: 84px; } #st-trick { top: 98px; } #st-air { top: 150px; }
  #st-card { padding: 14px 15px 16px; }
}
/* Short landscape - the phone case. The raid hides its whole top strip here, so this band is
   free, but the card must not run off the bottom of a 390 px screen. */
/* Short landscape - the phone case the owner reported twice. index.html hides #viewbar under
   body.touch and hub.js moves #craftbar to top 8, where it is about 26 px tall, so this strip
   starts at 40 and the whole column fits above the middle of a 390 px screen. */
@media (max-height: 520px) and (pointer: coarse) {
  #st-top { top: 40px; gap: 14px; }
  #st-clock, #st-score { font-size: 25px; } #st-mult { font-size: 20px; }
  #st-bar { top: 72px; } #st-trick { top: 82px; } #st-air { top: 126px; }
  #st-trick b { font-size: 19px; }
  #st-out { bottom: 60px; }
  #st-card { max-height: calc(100% - 16px); overflow-y: auto; padding: 12px 14px 14px; }
}
@media (prefers-reduced-motion: reduce) {
  #st-trick, #st-out { transition: none; }
}
`;

const BRIEF = 'An offshore watersports course: twelve floating ramps, marked off with buoys, '
  + 'two kilometres east of the pier. There is nothing to chase and nothing to sink &mdash; '
  + 'ride it, jump it, and land what you jump.';
const HOWTO = 'Airtime, height and rotation all score. Land it and the combo climbs; blow one, '
  + 'or stop riding, and it goes.';

export class StuntHud {
  constructor(mount, { onAgain, onLevels } = {}) {
    const d = mount && mount.ownerDocument ? mount.ownerDocument : (typeof document !== 'undefined' ? document : null);
    this.el = null; this._k = {};
    if (!mount || !d) return;
    if (!d.getElementById('st-style')) {
      const st = d.createElement('style'); st.id = 'st-style'; st.textContent = CSS;
      d.head.appendChild(st);
    }
    const root = d.createElement('div'); root.id = 'st-root';
    root.innerHTML =
      '<div id="st-top">'
      + '<div><span class="k">TIME</span><span id="st-clock">2:00</span></div>'
      + '<div><span class="k">SCORE</span><span id="st-score">0</span></div>'
      + '<div><span id="st-mult"></span></div>'
      + '</div>'
      + '<div id="st-bar"><i></i></div>'
      + '<div id="st-trick"></div>'
      + '<div id="st-air"></div>'
      + '<div id="st-out"></div>'
      + '<div id="st-card"></div>';
    mount.appendChild(root);
    this.root = root;
    this.el = {
      clock: root.querySelector('#st-clock'), score: root.querySelector('#st-score'),
      mult: root.querySelector('#st-mult'), bar: root.querySelector('#st-bar'),
      barI: root.querySelector('#st-bar i'), trick: root.querySelector('#st-trick'),
      air: root.querySelector('#st-air'), out: root.querySelector('#st-out'),
      card: root.querySelector('#st-card'),
    };
    this.onAgain = onAgain; this.onLevels = onLevels;
    this.holdT = 0;
    // One listener on the card; the two buttons in it are created and destroyed with the
    // card's innerHTML, so a per-button listener would leak one per run.
    this.el.card.style.pointerEvents = 'auto';
    this.el.card.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.a === 'again' && this.onAgain) this.onAgain();
      if (b.dataset.a === 'levels' && this.onLevels) this.onLevels();
    });
  }

  // Shown while the level is running and hidden the instant it is not - see the `.off`
  // rule above for the failure this exists to stop.
  show(on) { if (this.root) this.root.classList.toggle('off', !on); }

  destroy() { if (this.root) this.root.remove(); }

  showIntro() {
    if (!this.el) return;
    this.el.card.innerHTML = `<h3>THE STUNT STAGE</h3><p>${BRIEF}</p><p class="dim">${HOWTO}</p>`;
    this.el.card.classList.add('on');
  }

  hideCard() { if (this.el) this.el.card.classList.remove('on'); }

  showOver(e) {
    if (!this.el) return;
    // >>> PROGRESS
    // The stunt stage has NO fail state - a run ends on the clock, not on a loss - so
    // reaching this card is the completion. Passing `true` is therefore correct here and
    // would be wrong in the raid, which is why the modes decide rather than the store.
    prog.complete('stunt', true);
    // <<< PROGRESS
    this.el.card.innerHTML = '<h3>RUN OVER</h3><table>'
      + `<tr><td>SCORE</td><td class="n">${e.score.toLocaleString()}</td></tr>`
      + `<tr><td>TRICKS LANDED</td><td class="n">${e.tricks}</td></tr>`
      + `<tr><td>BLOWN</td><td class="n">${e.blown}</td></tr>`
      + `<tr><td>BEST TRICK</td><td class="n">${e.best.toLocaleString()}</td></tr>`
      + `<tr><td>LONGEST AIR</td><td class="n">${e.bestAir.toFixed(2)} s</td></tr>`
      + `<tr><td>BIGGEST ROTATION</td><td class="n">${e.bestSpin.toFixed(0)}&deg;</td></tr>`
      + '</table><p class="dim">Enter to ride it again.</p>'
      + '<p><button type="button" data-a="again">RIDE AGAIN</button> '
      + '<button type="button" data-a="levels">LEVELS</button></p>';
    this.el.card.classList.add('on');
  }

  // The trick line, for T.overSec after a landing.
  flash(p, T) { this.hold = { p, t: T.overSec }; }

  // Cheap and idempotent: every write goes through a key, so an unchanged frame costs no
  // DOM work at all - the same discipline ui/juice.js's paint() uses.
  // `nudge` is the one line at the foot of the screen, or '' for none; the caller owns which
  // of the two it is, because which one is right depends on where the player has BEEN.
  update(g, dt, nudge) {
    const e = this.el;
    if (!e) return;
    const set = (k, el, prop, v) => { if (this._k[k] !== v) { this._k[k] = v; el[prop] = v; } };
    const cls = (k, el, v) => { if (this._k[k] !== v) { this._k[k] = v; el.className = v; } };
    const L = g.live;

    const mm = Math.floor(L.left / 60), ss = Math.floor(L.left % 60);
    set('clock', e.clock, 'textContent', `${mm}:${String(ss).padStart(2, '0')}`);
    cls('clockc', e.clock, L.left <= 15 ? 'low' : '');
    set('score', e.score, 'textContent', L.score.toLocaleString());

    const showM = L.combo >= 2;
    set('mult', e.mult, 'textContent', showM ? `x${L.mult.toFixed(1)}` : '');
    cls('multc', e.mult, showM ? 'on' + (L.mult >= 3 ? ' hot' : '') : '');
    cls('barc', e.bar, showM ? 'on' + (L.mult >= 3 ? ' hot' : '') : '');
    if (showM) e.barI.style.width = `${(L.frac * 100).toFixed(0)}%`;

    if (this.hold) {
      this.hold.t -= dt;
      if (this.hold.t <= 0) this.hold = null;
    }
    const p = this.hold ? this.hold.p : null;
    if (p) {
      const bits = [`${p.air.toFixed(2)} s air`];
      if (p.rise >= JUICE.riseShow) bits.push(`${p.rise.toFixed(1)} m`);
      if (Math.abs(p.spin) >= STUNT_RUN.spinShow) bits.push(`${Math.abs(p.spin).toFixed(0)}&deg; rotation`);
      // >>> STUNTBAL
      // The ladder is raid/tuning.js's, not this file's, and the only NAMED trick is the one
      // the model has been measured to earn. See the ROTATION block at the head of this file
      // and the one in raid/tuning.js: 360 is printed because 381.9 deg has been landed and
      // banked in a real ride; nothing above it is named because nothing above it is reached.
      const head = !p.landed ? (p.label === 'WIPED OUT' ? 'WIPED OUT' : 'LANDING BLOWN')
        : Math.abs(p.spin) >= STUNT_RUN.spinFull ? '360'
          : Math.abs(p.spin) >= STUNT_RUN.spinBig ? 'BIG ROTATION'
            : p.rise >= 3.0 ? 'BIG AIR' : 'LANDED';
      // <<< STUNTBAL
      const tail = p.landed
        ? `${bits.join(' &middot; ')} &middot; +${p.points}${p.mult > 1 ? ` (x${p.mult.toFixed(1)})` : ''}`
        : `${bits.join(' &middot; ')} &middot; no score`;
      set('trick', e.trick, 'innerHTML', `<b>${head}</b><span>${tail}</span>`);
      cls('trickc', e.trick, 'on' + (p.landed ? '' : ' bad'));
    } else {
      set('trick', e.trick, 'innerHTML', '');
      cls('trickc', e.trick, '');
    }

    const up = L.up && L.air > 0.12;
    const sp = Math.abs(L.spin) >= STUNT_RUN.spinShow ? ` &middot; ${Math.abs(L.spin).toFixed(0)}&deg;` : '';
    set('air', e.air, 'innerHTML', up ? `<b>${L.air.toFixed(1)}s</b>AIR${sp}` : '');
    cls('airc', e.air, up ? 'on' : '');

    // ⚠️ THE SPAWN IS DELIBERATELY OUTSIDE THE MARKS - it is 95 m shoreward of the gate, so
    // the first thing a rider does is ride in through it. So "off the course" would be the
    // very first thing this level ever said, which is both untrue and unwelcoming. `nudge` is
    // therefore two different messages and the caller decides which, on whether the player has
    // ever been inside.
    const msg = nudge || '';
    set('out', e.out, 'textContent', msg);
    cls('outc', e.out, msg ? 'on' : '');
  }
}

// ---------------------------------------------------------------------------------------
// THE LEVEL. Same shape as raid/smuggle.js's initSmuggle(), for the same reasons: one place
// that owns enter/exit, everything saved and restored rather than assumed, and a headless
// handle so a suite can drive it.
// ---------------------------------------------------------------------------------------
export function initStunt(ctx) {
  const { sim, seaGL, FIXED_DT } = ctx;
  const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const isCal = q.has('cal');
  const mount = (typeof document !== 'undefined' && (document.querySelector('#stagewrap') || document.body)) || null;

  const S = {
    active: false, game: new StuntRun(), hud: null, runs: 0, introT: 0,
    lastSimTick: 0, prevHeading: sim ? sim.startHeading : 0,
    prevX: sim ? sim.startX : 0, prevZ: sim ? sim.startZ : 0,
    bounds: STUNT_BOUNDS, ramps: STUNT_RAMPS.length, beenIn: false,
  };

  const hullOf = () => { const c = ctx.craft; return c && c.active ? c.hull : null; };
  const headingOf = () => {
    const h = hullOf();
    if (h) return h.heading;
    // The eFoil is a longitudinal point mass with no hull; sim.world carries its heading.
    return sim && sim.world ? sim.world.heading : null;
  };

  function leaveOthers() {
    const R = typeof window !== 'undefined' ? window.efoilRaid : null;
    if (R && R.active && R.exit) R.exit();
    const Q = typeof window !== 'undefined' ? window.efoilRescue : null;
    if (Q && Q.active) { const b = document.querySelector('#rq-over [data-a=exit]'); if (b) b.click(); }
    const G = typeof window !== 'undefined' ? window.efoilSmuggle : null;
    if (G && G.active && G.exit) G.exit();
  }

  function newRun() {
    S.game.reset();
    S.beenIn = false;
    S.runs++;
    if (S.hud) { S.hud.hideCard(); S.hud.showIntro(); S.hud.hold = null; }
    S.introT = STUNT_RUN.introSec;
  }

  function enter() {
    if (S.active) return;
    if (!STUNT_ON) {
      if (ctx.toast) ctx.toast('the stunt stage is a separate world — pick it from LEVELS');
      return;
    }
    leaveOthers();
    if (!S.hud && mount) S.hud = makeHud();
    if (S.hud) S.hud.show(true);
    S.active = true;
    if (typeof document !== 'undefined') document.body.classList.add('stunt');
    // ⚠️ 2026-09-20: THE EFOIL CAN TAKE A RAMP NOW, AND THIS LINE USED TO DENY IT.
    // What stood here forced any player arriving on the eFoil onto the jetski, and the reason
    // it gave - "boats/ramp-collide.js wraps the HULL obstacle grid and the plant has no path
    // into it, so an eFoil rides straight through every ramp" - was true when it was written
    // and is false now. src/foil-ramp.js gives the foil its own contact against the deck: the
    // wing is the contact patch and the mast is a leg, one contact point rather than a hull's
    // seven. Its author measured 1.01-1.20 s of air against a 0.00-0.27 s control, 0 stuck and
    // 0 NaN over 96 runs, with every ramp-free level bit-identical.
    //
    // So the forced swap is gone and `craftOk` in ui/levels.js carries all three craft. A
    // player who reaches this level on the eFoil now RIDES it on the eFoil - which, in a game
    // called 365 eFoil, is the behaviour that needed no defending.
    //
    // ⚠️ 2026-09-20 (UITAIL): one more saved field stood here - the craft's kind, stashed on
    // S beside prevHeading/prevX/prevZ - with a note saying nothing read it. Nothing did:
    // swept across index.html, src/, tools/ and suites/, the only hits were the write itself
    // and the note. exit() restores the sea, the spawn and the heading but has never
    // restored the craft. It was written to pair with the forced jetski swap this level used
    // to do on entry; that swap went when the eFoil learned to take a ramp, and the saved
    // value went with its purpose. Removed rather than left, because a `prev*` field sitting
    // beside three that ARE restored reads as a restore the next author has to go and check.
    // If the craft should be put back on exit, that is a new decision and needs a new field.
    // Mute the feel overlay - see the header. Restored in exit().
    const J = getJuice(); if (J) J.mute(true);
    S.prevHeading = sim.startHeading; S.prevX = sim.startX; S.prevZ = sim.startZ;
    sim.startX = STUNT_SPAWN.x; sim.startZ = STUNT_SPAWN.z; sim.startHeading = STUNT_SPAWN.heading;
    if (ctx.setSea) ctx.setSea(STUNT_RUN.sea);
    if (ctx.takeInput) ctx.takeInput(null);
    if (ctx.restart) ctx.restart();
    S.lastSimTick = sim.tick;
    newRun();
    if (ctx.toast) ctx.toast('the stunt stage — ride it, jump it, land it');
  }

  function exit() {
    if (!S.active) return;
    S.active = false;
    if (typeof document !== 'undefined') document.body.classList.remove('stunt');
    const J = getJuice(); if (J) J.mute(false);
    if (S.hud) { S.hud.hideCard(); S.hud.hold = null; S.hud.show(false); }
    sim.startHeading = S.prevHeading; sim.startX = S.prevX; sim.startZ = S.prevZ;
    if (ctx.setSea) ctx.setSea(ctx.defaultSea);
    if (ctx.takeInput) ctx.takeInput(null);
    if (ctx.restart) ctx.restart();
  }

  function again() { if (ctx.restart) ctx.restart(); S.lastSimTick = sim.tick; newRun(); }

  function makeHud() {
    return new StuntHud(mount, {
      onAgain: again,
      onLevels: () => { const b = document.querySelector('#btn-mode'); if (b) b.click(); },
    });
  }

  // ---- hooks main.js calls ---------------------------------------------------------------
  // `sample` is ui/juice.js's craftSample() output - main.js already builds one for the feel
  // layer, so this level reads the same object rather than sampling the craft a second time.
  S.tick = function (dt, sample) {
    if (sim.tick < S.lastSimTick) {
      if (globalThis.__modeCraftSwitch) globalThis.__modeCraftSwitch = false;
      else newRun();
    }
    S.lastSimTick = sim.tick;
    if (S.introT > 0) {
      S.introT -= dt;
      if (S.introT <= 0 && S.hud) S.hud.hideCard();
    }
    const ev = S.game.update(dt, sample, headingOf());
    if (ev && S.hud) {
      if (ev.type === 'trick' || (ev.type === 'blown' && !ev.banked)) S.hud.flash(S.game.last, STUNT_RUN);
      if (ev.type === 'over') S.hud.showOver(ev);
    }
    if (S.game.events.length > 400) S.game.events.length = 0;   // the HUD reads `last`, not the log
  };

  const framePose = () => {
    const h = hullOf();
    if (h) return [h.x, h.z];
    const w = sim && sim.world ? sim.world : null;
    return w ? [w.x, w.z] : [0, 0];
  };

  S.frame = function () {
    if (!S.hud) return;
    // Mutual exclusion, re-checked every frame exactly as smuggle.js does: another mode
    // coming up underneath ends this one rather than both drawing.
    const R = typeof window !== 'undefined' ? window.efoilRaid : null;
    const Q = typeof window !== 'undefined' ? window.efoilRescue : null;
    const G = typeof window !== 'undefined' ? window.efoilSmuggle : null;
    if ((R && R.active) || (Q && Q.active) || (G && G.active)) { exit(); return; }
    const [x, z] = framePose();
    const inside = insideCourse(x, z, 25);
    if (inside) S.beenIn = true;
    // Nothing is said while the briefing card is up, and nothing is said once the run is over.
    const nudge = (S.introT > 0 || S.game.phase !== 'run' || inside) ? ''
      : S.beenIn ? 'OFF THE COURSE — back inside the marks'
        : 'RIDE IN THROUGH THE GATE';
    S.hud.update(S.game, 1 / 60, nudge);
  };

  S.enter = enter;
  S.exit = exit;
  S.again = again;

  // Headless handle, same shape as smuggle's fastForward: advance the real sim and the rules
  // for n ticks with a supplied control, so a suite can score a real run without a browser.
  S.fastForward = (ticks, control, sampleFn) => {
    for (let i = 0; i < ticks; i++) {
      const out = typeof control === 'function' ? control(i) : control;
      const c = ctx.craft;
      if (c && c.active) { c.step(out, FIXED_DT); c.effects(FIXED_DT); } else sim.step(out, FIXED_DT);
      S.game.update(FIXED_DT, sampleFn ? sampleFn() : null, headingOf());
    }
    return S.game;
  };

  if (typeof addEventListener === 'function') {
    const isField = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA');
    addEventListener('keydown', (e) => {
      if (isField(e)) return;
      if (e.code === 'KeyT' && e.shiftKey) { S.active ? exit() : enter(); return; }
      if (S.active && e.code === 'Enter' && S.game.phase === 'over') again();
    }, { capture: true });
  }

  if (!isCal && q.get('mode') === 'stunt') enter();
  if (typeof window !== 'undefined') window.efoilStunt = S;
  return S;
}
