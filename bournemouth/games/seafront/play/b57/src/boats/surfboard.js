// THE SURFBOARD (26 Sep 2026). The owner: "could we do a realistic surfing level by Bournemouth
// Pier? ... surfers actually sort of go under the water" - then "do the pier surfing, one first,
// and see how that comes out". This is that first one: a paddle board you lie on, push through
// the whitewater under, and stand up on when a wave takes you.
//
// A FOURTH HUB CRAFT, not an eFoil and not a hull.js spec. hull.js assumes an engine (spool,
// rpm, porpoising, and `boost` is its astern gear), so the board is its own small class that
// exposes the fields the hub, the chase camera, the pose provider and the juice read, and
// nothing else. It is never in the K / craft-bar cycle: only the surfing level selects it.
//
// THE PHYSICS IS THE SEA'S, not a script. Every push comes from the same sampler every other
// craft reads (src/sea.js, slot 2 - the hulls' slot; only one craft steps at a time):
//   * GRAVITY DOWN THE FACE. The surface slope times g, along the surface. On the front of a
//     shoaling wave that is what closes the gap between a paddler (~1.5 m/s) and the wave
//     (~3.5 m/s over the bank) - the catch is emergent, not a flag.
//   * THE WATER'S OWN VELOCITY. Drag is on the board's speed RELATIVE to the water, and the
//     water under a breaking wave runs shoreward (sea-surf.js BORE): that is what washes a
//     paddler back when the whitewater hits them, and what a duck-dive gets under.
//   * PADDLING, capped at the sourced human numbers: 1.10-2.00 m/s in the studies, 1.15 m/s
//     held by competitive surfers over six minutes, 1.46-1.52 m/s sprint peak (PMC7907393).
//     Full effort here settles at 1.5 m/s and adds nothing above 2.4 m/s - hands cannot push
//     water that is already going past faster than they move.
//
// FOUR STATES. PRONE (lying down, paddling or waiting), DUCK (under the whitewater, ~1.3 s),
// RIDE (standing, carving) and WIPE (off the board and tumbling, ~1.6 s, then back on it).
// SPACE does the thing that fits the moment: duck-dive when a wave is coming at you, pop up
// when one is carrying you, kick out when you are riding.
//
// STANDING (27 Sep 2026, the revamp's stage 2, "surf the wave, not the foam"): the rail grips, so
// a turn keeps its speed; the paddle control PUMPS on a live face; leaning back STALLS; a turn winds
// on and banks by the speed it is made at. What a ride is worth is surfer/judge.js's to say - where
// on the wave you are and the moves you make - and every ride ending has a name (fadeWhy, below).
//
// FLOATERS AND AIRS (27 Sep 2026, stage 6: a skill ceiling for players who have mastered the rest,
// without making the default game harder). Both are moves the judge scores (surfer/judge.js):
//   FLOATER  along the line over the breaking crest for 0.6 s; while on it the board feels only
//            BOARD.floatSlope of the down-slope pull, so it rides OVER the lip rather than off it.
//   AIR      a sub-state of RIDE (this.air, null on the water). Hit the lip going seaward at speed and
//            the board leaves it (_takeOff); A / D spin it; come down facing down the face and it is
//            an AIR (AIR 180, AIR 360 by the spin), come down any other way and it is a wipe-out
//            ('landing'). See BOARD.air* for the numbers and _takeOff for the lip's throw.
// Neither can happen by accident to a new player: an air wants 5.5 m/s AND the board going seaward
// over the ground as it reaches the lip - a line up the face, not along it - and never during a
// kick-out (MEASURED: tmp-audit/stage6-air/novice-air.mjs).
//
// NOBODY IS IN DANGER. A wipeout is a tumble and a climb back on. No rip, no injury, nothing
// about the real beach's history; see SPEC-SURF.md's do-not list.
// No Math.random: nothing here may disturb the seeded simulation.

import { surfSample, makeSurfSlot, shoreCoords } from '../sea-surf.js';
import { RideJudge, JUDGE, multAt } from '../surfer/judge.js';

const G = 9.81;
export const PRONE = 0, DUCK = 1, RIDE = 2, WIPE = 3;
const sstep = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

// RIDE POINTS are the JUDGE's now (27 Sep 2026, the revamp's stage 2 - surfer/judge.js): points for
// where on the wave you are and the moves you make, the multiplier building on QUALITY seconds (face
// and pocket, not foam). The seconds-up rule (10 a second, x2/x3/x4 at 5/10/15 s up) paid a hands-off
// ride straight at the beach in the whitewater 214% of a trimmed line on the face, and 25 a "carve"
// paid a wiggled mouse 16,479 points in ten minutes (tmp-audit/loop/exploit.mjs).
// COMPATIBILITY ALIASES ONLY, until surfer-hud.js and mode.js read the judge's own numbers (B.ride.pts,
// .q, .mult and the 'move' events): the same names, computed from the judge's table. rideMult() takes
// QUALITY seconds now (B.ride.q), not seconds up.
export const RIDE_PTS = Object.freeze({ perSec: JUDGE.perSec, steps: JUDGE.steps, carve: JUDGE.move.CARVE, kick: JUDGE.kick });
export const rideMult = multAt;
export const STATE_NAME = ['PADDLING', 'DUCK DIVE', 'RIDING', 'WIPEOUT'];

// Along-board and lateral drag per state: a = -(C|v| + C0) v on the velocity relative to the
// water. Prone: a body in the water. Ride: a planing board, fins and rail holding the line.
const DRAG = [
  { cu: 0.30, cu0: 0.25, cv: 1.2, cv0: 1.5 },   // PRONE
  { cu: 0.60, cu0: 0.50, cv: 1.5, cv0: 1.5 },   // DUCK: board and body under water
  // RIDE's lateral terms are only the fins' residual since stage 2 (27 Sep 2026): the RAIL (step())
  // turns the flow. At 2.0 / 3.0 they did the turning, and cost 40% of the speed in any 90 deg turn.
  { cu: 0.025, cu0: 0.05, cv: 0.3, cv0: 0.5 },  // RIDE
  { cu: 0.80, cu0: 0.80, cv: 0.8, cv0: 0.8 },   // WIPE: tumbling, goes where the water goes
];
// How much of the down-slope pull each state feels. Under water there is no surface to slide
// down; tumbling you are mostly just water.
const K_SLOPE = [0.85, 0, 1.0, 0.3];
// Where on the face the pocket pulls: 0 behind the crest (chi >= 0), peaking on the upper face
// (chi ~ -0.7), gone at the bottom (chi <= -2.4).
function pocketAt(chi) {
  if (chi >= 0 || chi <= -2.4) return 0;
  const x = -chi;                        // 0 at the crest, 2.4 at the bottom of the face
  return x < 0.7 ? x / 0.7 : Math.max(0, 1 - (x - 0.7) / 1.7);
}

export const BOARD = {
  name: 'surfboard', label: 'SURFBOARD', unit: 'mph', unitScale: 2.23694,
  // Paddling: accel at rest, and the speed at which paddling stops adding anything.
  paddleA: 2.8, paddleTop: 2.4,
  // Pop-up: the board has to be carried at least this fast. Under it you are still being
  // overtaken by the wave and standing up just stops you ("too early").
  popU: 2.2,
  // Too late: the nose buries (pearl) on a face steeper than this along the board, or you are
  // in the lip itself (over the falls).
  pearlSlope: 0.62, lipChi: 0.35, lipBrk: 0.9,
  // On the big day's wall the limit rises by up to this (to 2.02, 64 deg, on a full wall): the
  // drop is steep because the wave is. MEASURED in tmp-tr203/catch.mjs - a player sitting in the
  // big-day line-up, standing up on the POP UP cue: 0 -> 16% of 3 m+ take-offs rode (the rest
  // pearled), 0.8 -> 54%, 1.3 -> 88%, 1.4 -> 94%, 1.5 -> 99%, 1.8 -> 100% (nothing left to get
  // wrong). At 1.4 a straight-in drop on the very steepest walls can still bury the nose, and
  // the lip still sends you over the falls.
  pearlWall: 1.4,
  // THE PRESS BUFFER (27 Sep 2026, stage 1). A press a beat early, or while the face is still too
  // steep, is HELD for up to this long and stands you up the moment it would work, instead of being
  // wasted - or worse, silently duck-diving you under your own wave (a press 0.25 / 0.5 / 1 s before
  // the big day's cue did that 42 / 83 / 99% of the time). On the big day: on-cue presses ride 78% ->
  // 100%. 0 = today's exact rules (the suite's REAL setting).
  popBuffer: 1.2,
  // DUCK: you stay under until the wave has gone over you (+ duckAfter), but not for longer than
  // duckMax - dive too early and you are back up before it arrives, and it takes you anyway.
  duckMin: 0.6, duckMax: 2.4, duckAfter: 0.25, duckDepth: 0.8, duckKeep: 0.3,
  // THE ASSISTS (27 Sep 2026, stage 3 - surfer/mode.js SURF_LEVELS picks them: EASY / NORMAL / REAL).
  // All off here, so a board built from BOARD alone is exactly the sim without help.
  //   autoPaddle  s of full paddling once a SET WAVE is 10 m out and you face the beach (EASY 4)
  //   autoTrim    how much of a pocket-seeking steer is added while you ride, never more than your
  //               hands leave free (EASY 0.3): a nudge, you can always out-steer it
  //   duckWait    a dive toward a breaking crest stays under until it has passed, up to duckWaitMax
  //               (EASY, NORMAL) - dive a little early and it still works
  autoPaddle: 0, autoTrim: 0, duckWait: false, duckWaitMax: 3.5,
  // THE KICK-OUT IS A MOVE (27 Sep 2026, stage 4): the button turns you kickTurn rad up the face, for
  // at most kickT s. Over the crest in that time is a clean kick-out (the judge's bonus); still on the
  // wave at the end of it, you step off with none; with no wave under you, you step off at once.
  // 1.6 s, not the plan's 0.8: the 1.35 rad turn alone takes most of 0.8, and new players kicking from
  // the face went over 31% of the time. At 1.6 s: from the face or pocket 90%, from the foam or the
  // flat under 20% (tmp-audit/stage3-me/kickrate.mjs) - the bonus is for kicking out ON the wave.
  kickT: 1.6, kickTurn: 1.35,
  // RISK WHILE RIDING (27 Sep 2026, stage 6): a ride can end in a fall - only where `risk` is on (the
  // level's REAL: mode.js SURF_LEVELS) and only once the level arms it (riskOn: two waves into a run).
  // Each is called riskWarn s before it takes you, and each can be got out of:
  //   CLOSEOUT  the wave walls up and breaks at you (brk rises through closeBrk) on the face while you
  //             ride along it (more than closeAng off straight in) - straighten out and you ride it out
  //             in the foam; still across it riskWarn later, it takes you
  //   LIP       up in the lip (chi > riskLipChi) as it throws (brk > lipThrow), slower toward the beach
  //             than lipSlow x the wave - drop down the face or pick up speed; else over the falls
  //             (riskLipChi, NOT lipChi: that one is the pop-up's, above - a second `lipChi` key here
  //             overrode it and no take-off could go over the falls any more; the b53 review)
  //   RAIL      full lock (|turn| >= railTurn) held railHold s below railV m/s on a live wave - the rail digs in and
  //             catches. (A g test could not fire: below 2.5 m/s the turn rate is capped, so the most a
  //             slow board pulls is ~0.3 g against a 1.5 g limit - the review measured 0.22 of it.)
  risk: false, riskWarn: 0.4, closeBrk: 0.85, closeAng: 35 * Math.PI / 180,
  riskLipChi: -0.25, lipThrow: 0.9, lipSlow: 0.9, railTurn: 0.9, railV: 2.0, railHold: 0.6,
  // FLOATERS AND AIRS (27 Sep 2026, stage 6 - see the header):
  //   floatSlope  the share of K_SLOPE's down-slope pull while on a floater (the judge's `floating`)
  //   airChi      the board leaves the lip as chi rises through -airChi...
  //   airV        ...at airV m/s or more over the ground, going seaward over the ground...
  //   airAmp      ...on a wave more than airAmp m high there
  //   airVy0, airVyK  the lift: airVy0 + airVyK x speed m/s (the line-up's own law, gl/surfers.js 'air')
  //   airCarry    the lip's throw: across the wave the board goes shoreward at airCarry x the wave's
  //               speed, keeping its speed along the line (_takeOff)
  //   airSpin, airSlew  A / D spin at airSpin rad/s, reached at airSlew rad/s^2
  //   airLand     land within this of straight down the face, or it is a wipe-out ('landing')
  //   landT       s the knees take the landing (the body's fx.comp)
  // airV 4.5, not the plan's 5.5: no skilled line reached the lip faster than 5.48 m/s on the default
  // surf (a 96-policy scan, tmp-audit/stage6-air), so airs were a big-day-only move. At 4.5 skilled riders
  // landed 88 in the scan and 360 new players x 5 minutes still never left the water by accident.
  floatSlope: 0.3, airChi: 0.1, airV: 4.5, airAmp: 0.4, airVy0: 1.3, airVyK: 0.18, airCarry: 1.1,
  airSpin: 6, airSlew: 60, airLand: 50 * Math.PI / 180, landT: 0.45,
  // A REAL WAVE UNDER YOU (28 Sep 2026). The owner: "it seems to be able to surf on small waves and even
  // surf against the waves which seems strange". Two rules, both what the sea does to a real surfer:
  //   catchAmp  the wave has to be at least this high (amplitude, m) to stand up on it - it was 0.12 m,
  //             a ripple of ~25 cm. 0.25 is a half-metre face. (Measured, tmp-audit/bigwaves/novice.mjs:
  //             on the big day - PIER SURF's size now - no wave at the peak is under 0.4, so the floor
  //             changes nothing there; at 1x, free ride's sea, 0.4 left new players NO waves at all and
  //             0.3 half of them, while 0.25 keeps them all and still refuses the ripples.)
  //   backChi, backMax, backT  OVER THE BACK: on the back of the wave (chi between backChi and backMax)
  //             for backT s, and not in the air or on a floater, the ride is over - the wave has gone on
  //             without you. Before this the back of a wave was just another slope: turn and ride down
  //             it, and you surfed out to sea against the waves until you slowed down. Past backMax is
  //             the trough - the flats a board reaches by OUTRUNNING its wave (chi wraps through -pi), where
  //             a cutback brings it back to the pocket; that is left to the slow-down rule, as before
  catchAmp: 0.25, backChi: 0.5, backMax: 2.2, backT: 0.35,
  // THE POCKET. The sampled surf train is a smooth single-frequency wave whose front face never
  // passes ~13 deg (sea-surf.js: slope a*k*(1+q) <= ~0.23). A real face near the curl is 30-40
  // deg, and that unresolved steep strip is what actually carries a surfer at wave speed. This
  // stands in for it and is written down as a stand-in: an extra down-face pull along the wave's
  // direction of travel, strongest on the upper face just ahead of the crest, fading to nothing at
  // the bottom of the face and behind the crest, and steeper where the wave is breaking. Because
  // it fades as you run ahead of the crest and vanishes behind it, a rider settles where the pull
  // matches the drag - in the pocket - and falls off the back if they slow down.
  pocket: 0.34, pocketProne: 0.6,
  wipeSec: 1.6,
  // (A CARVE used to be counted here - |r| >= 0.55 rad/s held 0.35 s at 3 m/s, 11 degrees of heading.
  // The judge's moves replaced it: 55 degrees swept or it is not a turn - surfer/judge.js.)
  // STANDING (stage 2, step()). Turn rate: v / rateV rad/s at full lock, up to rateMax; reached at
  // slewKey rad/s^2 from keys, slewAnalog from a mouse / stick / thumb (input.js `analog`).
  rateMax: 2.2, rateV: 2.2, slewKey: 9, slewAnalog: 20,
  // The rail: grip to gripG + gripGv * v (in g), rotating the flow at railK /s for railLoss of the
  // speed per radian turned; past the grip it skids, and railSkid more per radian at a full skid.
  gripG: 1.0, gripGv: 0.08, railK: 14, railLoss: 0.05, railSkid: 0.35,
  // The pump: m/s^2 on a live face, fading out at pumpTop x the wave speed + pumpTop0. The stall:
  // m/s^2 of along-board drag leaning back.
  pumpA: 1.4, pumpTop: 1.6, pumpTop0: 2.0, stallA: 0.9,
  // The whitewater takes a prone paddler off the board if it is breaking this hard as it passes.
  washBrk: 0.72,
  cam: { dist: 5.2, distSpeed: 2.0, height: 1.9, lookAhead: 2.5, lookH: 0.45, side: 7, fpv: [0.1, 0.9] },
  wake: { stern: -1.1, halfBeam: 0.3, sprayX: 0 },
  // The hub's HUD reads these off every craft; a board has no engine.
  rpmIdle: 0, rpmMax: 0, uHump: 99, uPlane: 99,
};

// WHAT A PRESS WOULD DO RIGHT NOW, lying on the board (27 Sep 2026, the revamp's stage 1). ONE test
// for the board, the level's POP UP cue and the round touch button, so they can never disagree -
// before this the cue had no pearl test and on the big day a press ON the cue pearled 22% of the time
// (tmp-audit/ease/window.mjs, 180 big-day waves). Exactly the expressions step() always used:
//   'falls' in the lip (too late, whatever your speed)   'pearl' fast enough but the face is too steep
//   'ok'    stands you up                                 'early' a wave is lifting you, not fast enough yet
//   'duck'  anything else (facing out, or no wave under you)
export function popVerdict(P, W, slopeAlong, u0, toShore, face) {
  const goingIn = toShore > 0.35;
  const inLip = W.chi > -P.lipChi && W.chi < 0 && W.brk > P.lipBrk;
  const pearlLim = P.pearlSlope + (P.pearlWall || 0) * (W.wall || 0);
  const big = W.amp > (P.catchAmp === undefined ? 0.12 : P.catchAmp);   // (28 Sep: a real wave, not a ripple)
  if (goingIn && big && inLip) return 'falls';
  if (goingIn && big && u0 >= P.popU && slopeAlong < -pearlLim) return 'pearl';
  if (goingIn && u0 >= P.popU && big) return 'ok';
  if (goingIn && big && face) return 'early';
  return 'duck';
}

// HOW A RIDE THAT RAN OUT OF WAVE ENDED (27 Sep 2026, stage 2 - it was all 'faded'). Called when the
// board has been under 1.1 m/s for 0.6 s, or the wave under it is under 0.08 m. Named for what the
// player did (surfer/judge.js RIDE_ENDS has the whole set):
//   'outran'     still moving when the wave ran out under you (along the shore past where it breaks,
//                or out ahead of it), or stopped in the flat in front of the face (chi < -1.6);
//   'over_back'  everything else: stopped at or behind the crest, on the face, or in the whitewater -
//                the wave went on without you.
// MEASURED over 63 such endings, six riding policies at 1x and 3x (tmp-audit/stage2-ride): 28 were
// moving at 4-8 m/s as the wave's height fell under 0.08 m, 29 had stopped behind the crest.
export function fadeWhy(W, spd) {
  if (W.amp < 0.08) return spd >= 1.1 ? 'outran' : 'over_back';
  if (W.brk < 0.5 && W.chi < -1.6) return 'outran';
  return 'over_back';
}

// Points round the board, in its own frame (x forward), for the pier-leg test.
const OUTLINE = [1.1, 0, 0.55, 0.28, 0.55, -0.28, -1.1, 0.2, -1.1, -0.2];

export class SurfBoard {
  constructor(spec = BOARD) {
    this.spec = spec;
    this.cgX = 0;
    this.ss = makeSurfSlot();
    this._as = makeSurfSlot();       // the assists' own probe (never this.ss: that is W in step)
    this._autoT = -99;               // when auto-paddle last saw a set wave coming
    this.gradeAmp = 0.4;             // what a set wave is here (the level sets it: mode.js gradeAmp)
    this.assist = 0;                 // this tick: 1 auto-paddle, 2 auto-trim (the suite reads it)
    this.dyn = null;
    this.raidBoost = 0; this.raidStall = 0;
    this.reset(0, 0, 0, null, 0);
  }

  get speed() { return Math.hypot(this.vx, this.vz); }

  setDynamic(list) { this.dyn = list || null; }

  reset(x, z, heading, sea, t) {
    this.x = x; this.z = z; this.heading = heading;
    // (a reset is a new start: no auto-paddle timer or half-called risk carried over - the b53 review)
    this._autoT = -99; this._risk = null; this._latG = 0; this._gripLim = 1; this._turnIn = 0; this._railT = 0;
    this.vx = 0; this.vz = 0; this.u = 0; this.v = 0; this.r = 0;
    this.y = 0; this.vy = 0; this.yDraw = 0; this.pitch = 0; this.roll = 0;
    this.airTicks = 0; this.aground = 0; this.hits = 0; this.lastHitSpeed = 0;
    this.slams = 0; this.slamG = 0; this.ticks = 0; this.time = t || 0;
    this.wet = 1; this.thr = 0; this.rpm = 0; this.gear = 0;
    this.state = PRONE; this.stateT = 0; this.cool = 0;
    this.stroke = 0; this.boostWas = 0;
    // What the level reads: the wave under you, and what just happened.
    // zone / curlSide / curlDist / alongX,Z are the judge's (surfer/judge.js sense()), set every RIDE
    // tick: 'pocket' | 'face' | 'foam' | 'flat'; +1 / -1 = the breaking part is on the +o side (world
    // (alongX, alongZ), east, away from the pier on this bank) / the -o side (toward the pier); metres
    // to it (0 in it, Infinity if not within 6 m). Off a ride: zone null, curlSide 0, curlDist Infinity.
    this.wave = { c: 0, brk: 0, foam: 0, amp: 0, chi: 0, face: false, slope: 0, depth: 0,
      zone: null, curlSide: 0, curlDist: Infinity, curlK: 0, alongX: 1, alongZ: 0 };
    this.skid = 0;                    // 0..1: how far the rail has let go in a turn (RIDE only)
    // THE BODY SHOWS THE RIDE (27 Sep 2026, stage 4): what the rider's figure is told each tick
    // (gl/surfer-figure.js update()'s X, through gl/surfers.js) - banked: the board carries the lean.
    // (stage 6) wide: arms out on a floater; air: 0..1, the tuck of an air (gl/surfer-figure.js grab()).
    this.fx = { banked: 1, comp: 0.5, carve: 0, snap: 0, back: 0, wide: 0, air: 0, goofy: !!this.goofy };   // goofy: the level's locker
    this._kick = null; this._kickClean = true;
    // IN THE AIR (stage 6): { y, vy, t, spin, v } while off the water, else null; _landT the landing's knees.
    this.air = null; this._landT = 0;
    this._judge = null;               // the RideJudge while standing
    this.events = [];
    this.ride = null;                 // { t0, x0, z0, top } while standing
    this._duck = null;                // { chi0, crossed, brkMax } while under
    this._chiPrev = 0;
    this._popHold = 0; this._holdV = null;   // a held press (BOARD.popBuffer) and its last verdict
    this.popV = null;                 // what a press would do now (popVerdict), for the level's cue
    this._duckUpT = -9;               // when the last duck-dive came up (a wash soon after = too early)
    this.stats = { rides: 0, rideBest: 0, rideTime: 0, ducks: 0, ducksClean: 0, washed: 0, wipes: 0, early: 0 };
    // Read by the surf sound (engine-audio.js SURFER): every crest that goes past you, and how
    // hard it was breaking. Counters, not events - the level empties `events` each tick.
    this.crests = 0; this.crestBrk = 0; this.crestAmp = 0;
    if (sea) this._float(sea, t, 0);
  }

  _emit(type, extra) { this.events.push({ type, t: this.time, ...(extra || {}) }); }

  _set(state) { this.state = state; this.stateT = 0; }

  step(inp, dt, sea, t, obs) {
    const P = this.spec;
    this.ticks++; this.time = t; this._sea = sea;
    this.stateT += dt;
    if (this.cool > 0) this.cool -= dt;
    // PADDLING is the throttle (arrows, left mouse, scroll, the touch strip) OR leaning forward -
    // W, or the stick pushed up. Lying on a board, those are the same motion, and W is the key a
    // player reaches for. Lean arrives NEGATIVE for forward (input.js: W is -1, and since stage 1 the
    // stick pushed UP is -1 too on the board - it paddled when pulled down before). On touch only the
    // strip paddles (input.js zeroes the steering thumb's lean on the board). A dead zone keeps a
    // mouse resting near the middle of the screen from paddling on its own.
    let thr = Math.max(Math.max(0, Math.min(1, inp.throttle || 0)), Math.max(0, Math.min(1, (-(inp.lean || 0) - 0.3) / 0.7)));
    // LEANING BACK (27 Sep 2026, stage 2): S, or the stick pulled down (input.js flips the pad's lean
    // on the board, so down arrives +1 like S). Standing, it is weight on the tail - a STALL: along-board
    // drag that lets the wave catch back up to you (BOARD.stallA). Same dead zone as paddling. (A phone:
    // the paddle strip pulled below its detent - input.js passes it as lean.)
    const stall = Math.max(0, Math.min(1, ((inp.lean || 0) - 0.3) / 0.7));
    let turn = Math.max(-1, Math.min(1, inp.turn || 0));
    this._turnIn = Math.abs(turn);   // the player's own steering (RISK: a rail caught at full lock, slow)
    this.assist = 0;
    this.thrIn = thr;                // the player's own paddling, before any help (hub.js's end beat)
    // AUTO-PADDLE (P.autoPaddle, EASY): lying facing the beach, a set wave 10 m out (the level's own
    // grade: mode.js advise) paddles you flat out for up to autoPaddle s. Pulling back (a stall) stops it.
    if (P.autoPaddle > 0 && this.state === PRONE && -Math.sin(this.heading) > 0.35 && stall === 0) {
      const A = surfSample(this.x, this.z + 10, t, 0, sea.surfCtl, this._as);
      if (A.chi > -1.2 && A.chi < -0.2 && A.amp >= this.gradeAmp) this._autoT = t;
      if (t - this._autoT < P.autoPaddle && thr < 1) { thr = 1; this.assist = 1; }
    } else if (this.state !== PRONE) this._autoT = -99;
    const press = (inp.boost || 0) > 0.5 && !(this.boostWas > 0.5);
    this.boostWas = inp.boost || 0;
    this.thr = thr;

    // ---- the water here ------------------------------------------------------------------
    const S = sea.sample(this.x, this.z, t, this.state === DUCK ? P.duckDepth : 0, 2);
    const W = surfSample(this.x, this.z, t, 0, sea.surfCtl, this.ss);
    const ch = Math.cos(this.heading), sh = Math.sin(this.heading);
    const slopeAlong = S.slopeX * ch + S.slopeZ * sh;        // + = surface rises ahead
    const face = W.amp > 0.12 && W.chi > -2.6 && W.chi < -0.05;
    // +1 = facing the beach. Offshore is +Z on this coast (sea-surf.js shoreCoords: d grows with
    // z), and the crests run in within a few degrees of it. NOT the orbital velocity's direction,
    // which reverses every trough.
    const toShore = -sh;
    const wv = this.wave;
    wv.c = W.c; wv.brk = W.brk; wv.foam = W.foam; wv.amp = W.amp; wv.chi = W.chi; wv.face = face;
    wv.slope = slopeAlong; wv.depth = S.surfH || W.h; wv.toShore = toShore;
    wv.set = W.active ? W.amp : 0;

    // ---- SPACE: whatever fits the moment -----------------------------------------------------
    const u0 = ch * this.vx + sh * this.vz;
    // TOO LATE is asked FIRST (popVerdict): in the lip you go over the falls whatever speed you have,
    // and a player who waited too long must hear "too late", never "too early".
    // THE BIG DAY'S WALL (27 Sep 2026, the owner: "make the big waves catchable too"). A big-day
    // set stands its face up to 65 degrees in about a second (sea-surf.js wallChi), so by the time
    // it has carried the board to pop-up speed the face was past pearlSlope EVERY time - a
    // player who stood up on the cue pearled on every set wave. On a wall the drop is judged on
    // the wall's own terms: the nose-dive limit rises with how much of the wall this point of
    // the face carries (W.wall, 0 off the big day, so every other sea is judged as before).
    const V = this.state === PRONE ? popVerdict(P, W, slopeAlong, u0, toShore, face) : null;
    this.popV = V;
    if (this.state !== PRONE) this._popHold = 0;
    if (press) {
      if (this.state === RIDE) {
        // THE KICK-OUT (BOARD.kickT): up the face - whichever way turns you toward the sea (+Z) - and
        // over the back. With no live wave under you there is no back to go over: off at once, no bonus.
        // (In the air there is nothing to kick against: the press is let go.)
        if (!this._kick && !this.air) {
          if (W.amp < 0.12) { this._kickClean = false; this._endRide('kickout'); }
          else this._kick = { t: 0, h1: this.heading + (Math.cos(this.heading) >= 0 ? 1 : -1) * P.kickTurn };
        }
      } else if (this.state === PRONE && this.cool <= 0) {
        // Held (BOARD.popBuffer): early, too steep, or an eager press facing in as a wave comes -
        // it waits for the moment it works. The lip is never held: that is simply too late.
        const eager = V === 'duck' && toShore > 0.35 && W.amp > 0.12;
        if ((P.popBuffer || 0) > 0 && (V === 'early' || V === 'pearl' || eager)) {
          this._popHold = P.popBuffer; this._holdV = V; this._emit('hold', { why: V });
        } else this._pressNow(V, slopeAlong, W, u0);
      }
    } else if (this._popHold > 0 && this.state === PRONE) {
      if (V === 'ok') { this._popHold = 0; this._popUp(slopeAlong, W); }
      else if (V === 'falls') { this._popHold = 0; this._late(true); }
      else if (toShore <= 0.35) this._popHold = 0;     // turned away: the press is let go
      else {
        this._holdV = V;
        this._popHold -= dt;
        // Run out: the honest verdict for the last moment it was held - too steep is a pearl, too
        // slow is "too early", and only whitewater actually on you turns it into a duck-dive.
        if (this._popHold <= 0) {
          this._popHold = 0;
          if (V === 'pearl') this._late(false);
          else if (V === 'duck' && W.brk > 0.5) this._duckDive(W);
          else { this.stats.early++; this._emit('early', { u: u0, c: W.c, held: true }); this.cool = 0.4; }
        }
      }
    }

    // AUTO-TRIM (P.autoTrim, EASY): riding, a steer toward the pocket-seeking line - toward the open
    // shoulder (away from the curl, the judge's wave.curlSide), angled down the face when you are high
    // (chi above -0.9) and up it when you have run ahead - the robust.mjs controller's shape. Added only
    // in the room your own steering leaves ((1 - |turn|)), so a full turn of yours is always yours.
    if (P.autoTrim > 0 && this.state === RIDE && !this.air) {
      const w = this.wave;
      let ox = w.alongX !== undefined ? w.alongX : 1, oz = w.alongZ !== undefined ? w.alongZ : 0;
      if (w.curlSide) { ox *= -w.curlSide; oz *= -w.curlSide; }
      else if (ox * ch + oz * sh < 0) { ox = -ox; oz = -oz; }                 // no curl yet: the way you are going
      let th = Math.max(0.1, Math.min(1.3, 0.45 - 0.8 * (W.chi + 0.9)));      // 0 = straight in, pi/2 = along
      let dx = Math.sin(th) * ox, dz = -Math.cos(th) + Math.sin(th) * oz;     // shore is -Z
      // NEVER INTO THE PIER (the b53 review: EASY's hands-off rider rode into the pier head on 16-35% of
      // rides above 1.3x). Where you are going (your own velocity) and where it would trim you are looked
      // along, 4 to 20 m, in the pier's own obstacle grid (the one that ends a ride in its legs). A leg
      // there: it steers you along the wave AWAY from the pier (o grows away from it), with full say.
      let auth = P.autoTrim;
      if (obs && typeof obs.blocked === 'function') {
        const dl = Math.hypot(dx, dz) || 1, vl = Math.hypot(this.vx, this.vz) || 1;
        let hit = false;
        for (let m = 4; m <= 20 && !hit; m += 4) {
          hit = obs.blocked(this.x + dx / dl * m, this.z + dz / dl * m) || obs.blocked(this.x + this.vx / vl * m, this.z + this.vz / vl * m);
        }
        if (hit) {
          const so = shoreCoords(this.x, this.z, this._scT || (this._scT = {})).o, away = so < 0 ? -1 : 1;
          ox = (w.alongX !== undefined ? w.alongX : 1) * away; oz = (w.alongZ !== undefined ? w.alongZ : 0) * away;
          th = 0.9; dx = Math.sin(th) * ox; dz = -Math.cos(th) + Math.sin(th) * oz; auth = 1;
        }
      }
      let e = Math.atan2(dz, dx) - this.heading;
      while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
      const k = auth * (1 - Math.abs(turn)) * Math.max(-1, Math.min(1, e * 2.5));
      if (Math.abs(k) > 1e-3) { turn = Math.max(-1, Math.min(1, turn + k)); this.assist = 2; }
    }

    // KICKING OUT: the turn up the face is the board's (a hard turn to the kick's heading).
    if (this._kick && this.state === RIDE) {
      let e = this._kick.h1 - this.heading;
      while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
      turn = Math.max(-1, Math.min(1, e * 3));
    }

    // ---- steering -------------------------------------------------------------------------
    const sp = Math.hypot(this.vx, this.vz);
    const air = this.state === RIDE && !!this.air;
    if (air) {
      // IN THE AIR (stage 6): A / D spin the board, BOARD.airSpin rad/s at full lock, reached at airSlew -
      // and let go, it stops spinning as quickly. Its path through the air does not turn with it.
      const want = turn * P.airSpin, a = P.airSlew * dt;
      this.r += Math.max(-a, Math.min(a, want - this.r));
    } else if (this.state === RIDE) {
      // A TURN THAT RAMPS, TIGHTENS WITH SPEED (27 Sep 2026, stage 2). It was full rate the tick a key
      // went down (min(1.8, 0.45 v + 0.4)): a 0.1 s tap of A at 6 m/s swung the board ~10 degrees. Now
      // the rate you are asking for is reached at BOARD.slewKey rad/s^2 on keys (0.24 s to 95% of full
      // lock at 6 m/s; the same tap is under 3 degrees) and BOARD.slewAnalog on a mouse, stick or thumb,
      // whose own travel is already gradual. Easing off, letting go or going the other way unwinds at
      // once - a rail let go straightens the board; only winding a turn ON takes time. Full lock is
      // v / 2.2 rad/s up to 2.2: a 2.2 m radius up to 4.8 m/s, opening out above it (2.7 m at 6 m/s).
      const want = turn * Math.min(P.rateMax, sp / P.rateV);
      if (want * this.r < 0) this.r = 0;
      if (Math.abs(want) <= Math.abs(this.r)) this.r = want;
      else {
        const a = (inp.analog ? P.slewAnalog : P.slewKey) * dt;
        this.r += Math.max(-a, Math.min(a, want - this.r));
      }
    } else {
      let rate;
      if (this.state === PRONE) rate = 1.4 / (1 + 0.3 * Math.max(0, sp - 1.5));
      else if (this.state === DUCK) rate = 0.3;
      else rate = 0;
      this.r = turn * rate;
    }
    this.heading += this.r * dt;
    if (this.heading > Math.PI) this.heading -= 2 * Math.PI;
    if (this.heading < -Math.PI) this.heading += 2 * Math.PI;
    const c2 = Math.cos(this.heading), s2 = Math.sin(this.heading);

    // ---- forces ---------------------------------------------------------------------------
    // IN THE AIR (stage 6) nothing on the water pulls or drags: no slope, no drag, no pump, no rail, no
    // pocket - the board flies (its height is _airTick's). On a FLOATER (the judge's `floating`, last
    // tick) the down-slope pull is floatSlope of itself: the board rides over the lip.
    let ax = 0, az = 0;
    const kg = air ? 0 : K_SLOPE[this.state] * (this.state === RIDE && this._judge && this._judge.floating ? P.floatSlope : 1);
    ax -= G * S.slopeX * kg; az -= G * S.slopeZ * kg;
    // The water's own velocity. Under a duck-dive most of the bore passes over you.
    const keep = this.state === DUCK ? P.duckKeep : 1;
    const rx = this.vx - S.orbX * keep, rz = this.vz - S.orbZ * keep;
    const ur = c2 * rx + s2 * rz, vr = -s2 * rx + c2 * rz;
    const D = DRAG[this.state];
    const au = air ? 0 : -(D.cu * Math.abs(ur) + D.cu0) * ur;
    const av = air ? 0 : -(D.cv * Math.abs(vr) + D.cv0) * vr;
    ax += c2 * au - s2 * av; az += s2 * au + c2 * av;
    // Paddling: only lying down, and only while your hands are faster than the water.
    let paddle = 0;
    if (this.state === PRONE && thr > 0) {
      const u = c2 * this.vx + s2 * this.vz;
      paddle = thr * P.paddleA * Math.max(0, Math.min(1, 1 - u / P.paddleTop));
      ax += c2 * paddle; az += s2 * paddle;
    }
    if (this.state === RIDE && !air) {
      // THE PUMP (27 Sep 2026, stage 2; tmp-audit/feel/pump.mjs): the paddle control while standing -
      // W, up, the left button, the strip, RT - is weight driven down the face and let up again, and
      // the FACE turns it into speed: BOARD.pumpA at full effort on a live face, a third of it off
      // the face, nothing on flat water, fading out as you reach 1.6 x the wave's own speed + 2 m/s.
      // Before it the only speed was the slope's: a trimmed line at the default surf averaged 11.9
      // km/h and spent 8.7 s a ride in the whitewater it could not outrun.
      if (thr > 0) {
        const faceK = Math.min(1, Math.max(0, (W.amp - 0.1) / 0.3)) * (face ? 1 : 0.3);
        const u = c2 * this.vx + s2 * this.vz;
        const a = thr * P.pumpA * faceK * Math.max(0, 1 - u / (P.pumpTop * W.c + P.pumpTop0));
        ax += c2 * a; az += s2 * a;
      }
      // THE STALL (see `stall` above): along-board drag, never pushing the board backwards.
      if (stall > 0) {
        const a = -P.stallA * stall * Math.max(-1, Math.min(1, ur / 0.5));
        ax += c2 * a; az += s2 * a;
      }
    }
    this.stroke = this.state === PRONE ? Math.min(1, 0.15 + thr) : this.state === DUCK ? 0.2 : 0;
    this.vx += ax * dt; this.vz += az * dt;
    this.skid = 0;
    if (this.state === RIDE && !air) {
      // RAIL GRIP (27 Sep 2026, stage 2; tmp-audit/feel/surfboard-proto.mjs). A planing board goes
      // where it points: its rail and fins turn the water's flow, not scrub it off. The lateral drag
      // alone (cv 2.0, cv0 3.0) did the turning and took 40-41% of the speed in every 90 degree
      // full-lock turn, at any speed (feel/turn.mjs) - so turning was braking, and the only way to
      // keep speed was not to surf. Now the velocity through the water is rotated toward the heading
      // (time constant 1/14 s while the rail holds), for a small toll (5% of the angle turned) - and
      // past the rail's grip (1.0 g + 0.08 g per m/s) it lets go in proportion: `skid`, 0..1.
      const wx = S.orbX, wz = S.orbZ;
      const rx0 = this.vx - wx, rz0 = this.vz - wz, s = Math.hypot(rx0, rz0);
      if (s > 0.5) {
        const ang = Math.atan2(rz0, rx0);
        let e = this.heading - ang;
        while (e > Math.PI) e -= 2 * Math.PI;
        while (e < -Math.PI) e += 2 * Math.PI;
        const latG = s * Math.abs(this.r) / G, lim = P.gripG + P.gripGv * s;
        this._latG = latG; this._gripLim = lim;   // (RISK: a caught rail)
        const hold = latG <= lim ? 1 : lim / latG;
        const rot = e * (1 - Math.exp(-P.railK * hold * dt));
        const s3 = s * (1 - (P.railLoss + (1 - hold) * P.railSkid) * Math.abs(rot));
        this.vx = wx + Math.cos(ang + rot) * s3; this.vz = wz + Math.sin(ang + rot) * s3;
        this.skid = 1 - hold;
      }
    }
    // A hard ceiling no wave here can honestly exceed (the sourced 45 km/h riding peak).
    const vmag = Math.hypot(this.vx, this.vz);
    if (vmag > 12.5) { this.vx *= 12.5 / vmag; this.vz *= 12.5 / vmag; }

    const ox = this.x, oz = this.z;
    // THE POCKET (see BOARD.pocket): shoreward (-Z), standing or lying on the face of a live wave.
    if ((this.state === RIDE && !air) || this.state === PRONE) {
      const env = Math.min(1, Math.max(0, (W.amp - 0.1) / 0.3)) * (0.4 + 0.6 * W.brk);
      const k = this.state === RIDE ? 1 : P.pocketProne;
      this.vz -= G * P.pocket * k * env * pocketAt(W.chi) * dt;
    }
    this.x += this.vx * dt; this.z += this.vz * dt;
    this.u = c2 * this.vx + s2 * this.vz; this.v = -s2 * this.vx + c2 * this.vz;

    // ---- the pier legs and the beach ---------------------------------------------------------
    if (obs && this._hitsSomething(obs)) {
      const hit = Math.hypot(this.vx, this.vz);
      this.x = ox; this.z = oz;
      this.vx *= -0.2; this.vz *= -0.2;
      this.hits++; this.lastHitSpeed = hit;
      if (this.state === RIDE && hit > 2) { this._endRide('pier'); this._wipe('pier'); }
    }
    const depth = S.surfH || W.h;
    this.aground = depth < 0.3 && !air ? 1 : 0;   // (in the air the fins are not in the sand)
    if (this.aground) {
      // In the shallows the fins touch: a ride is over and the board stops.
      this.vx *= Math.exp(-dt * 3); this.vz *= Math.exp(-dt * 3);
      if (this.state === RIDE) this._endRide('shallows');
    }

    // ---- state machine ----------------------------------------------------------------------
    // The crest passing over you: chi wraps from just under 0 to just over it.
    const crossed = this._chiPrev < 0 && W.chi >= 0 && W.chi - this._chiPrev < 2;
    const chiWas = this._chiPrev;    // (stage 6: the lip an air leaves from)
    this._chiPrev = W.chi;
    if (crossed && W.amp > 0.1) { this.crests++; this.crestBrk = W.brk; this.crestAmp = W.amp; }
    if (this.state === DUCK) {
      const dk = this._duck;
      if (dk) { dk.brkMax = Math.max(dk.brkMax, W.brk); if (crossed && !dk.crossed) { dk.crossed = true; dk.tc = this.stateT; } }
      // P.duckWait: a dive with a breaking crest on its way stays down until the crest is past.
      const cap = dk && dk.wait && !dk.crossed ? P.duckWaitMax : P.duckMax;
      const done = this.stateT >= cap || (dk && dk.crossed && this.stateT >= Math.max(P.duckMin, dk.tc + P.duckAfter));
      if (done) {
        this._set(PRONE); this.cool = 0.3; this._duckUpT = this.time;
        if (dk && dk.crossed && dk.brkMax > 0.5) { this.stats.ducksClean++; this._emit('duck_clean'); }
        this._duck = null;
      }
    } else if (this.state === PRONE) {
      // The whitewater arrives and you are still on top: it takes you.
      if (crossed && W.brk > P.washBrk && toShore < 0.2 && W.amp > 0.25) {
        // early: a duck-dive that came up under a second before this - the dive went too soon.
        this.stats.washed++; this._emit('washed', { brk: W.brk, early: this.time - this._duckUpT < 1.0 });
        this._wipe('washed');
      }
    } else if (this.state === RIDE) {
      const R = this.ride;
      const spd = Math.hypot(this.vx, this.vz);
      R.top = Math.max(R.top, spd);
      R.slow = spd < 1.1 && !this.air ? (R.slow || 0) + dt : 0;
      // THE JUDGE (surfer/judge.js): the zone you are in, the moves you make, the multiplier.
      const J = this._judge;
      J.tick(this, W, t, dt, sea.surfCtl);
      R.pts = J.pts; R.q = J.q; R.mult = J.mult; R.movesBanked = J.banked;
      // (compatibility, until surfer-hud.js reads R.pts: timePts + carvePts is the same live total)
      R.timePts = J.zonePts + J.latePts; R.carvePts = J.movePts; R.carves = J.banked;
      wv.zone = J.zone; wv.curlSide = J.curlSide; wv.curlDist = J.curlDist; wv.curlK = J.curlK;
      wv.alongX = J.alongX; wv.alongZ = J.alongZ;
      // IN THE AIR (stage 6): the flight, the body's tuck and the landing (_airTick). Nothing that
      // needs the water under the board - the risk, a kick-out, running out of wave - applies up there.
      if (this.air) this._airTick(W, S, dt);
      else {
        // THE BODY (this.fx): down into the knees with the turn's g; a carve while a turn is under way
        // (the judge's own - 25 deg swept and more); the arm throw of a snap while the rail skids; and the
        // look back over the shoulder of a cutback, past 100 deg round. The figure springs each of them.
        // (Stage 6: the arms out along a floater; the knees taking a landing for BOARD.landT s.)
        const fx = this.fx, T = J.turn, swept = T ? Math.abs(T.sw) * 180 / Math.PI : 0;
        fx.goofy = !!this.goofy;
        fx.comp = 0.55 + 0.4 * Math.min(1, spd * Math.abs(this.r) / G);
        if (this._landT > 0) { this._landT = Math.max(0, this._landT - dt); fx.comp = Math.max(fx.comp, 0.55 + 0.55 * this._landT / P.landT); }
        fx.carve = swept > 25 ? 1 : 0;
        fx.snap = this.skid > 0.3 ? 1 : 0;
        fx.back = swept > 100 ? 1 : 0;
        fx.wide = J.floating ? 1 : 0; fx.air = 0;
        // RISK (BOARD.risk - REAL, from the third wave): a closeout, the lip, a caught rail. A threat is
        // called ('risk' event, the level's warning) and takes you riskWarn s later unless you got out of it.
        if (P.risk && this.riskOn && !this._kick) this._riskStep(W, spd, dt, toShore);
        else if (this._risk) this._risk.why = null;
        // THE KICK-OUT under way: over the crest is clean; the time up (or the wave gone) is stepping off.
        const K = this._kick;
        if (K) {
          K.t += dt;
          if (crossed) this._endRide('kickout');
          else if (K.t >= P.kickT || W.amp < 0.08) { this._kickClean = false; this._endRide('kickout'); }
        }
        // STALLING on a live face is not losing the wave: the wave is meant to catch you up.
        // OVER THE BACK (BOARD.backChi / backT, 28 Sep 2026): behind the crest - not up in the air, not on a
        // floater along the lip - the wave has gone on without you, and the ride is over.
        R.back = W.chi > P.backChi && W.chi < P.backMax && !K && !(J && J.floating) ? (R.back || 0) + dt : 0;
        if (this.state !== RIDE) { /* ended above */ }
        else if (R.back > P.backT) this._endRide('over_back');
        else if (stall > 0 && face && W.amp > 0.2) R.slow = 0;
        else if (R.slow > 0.6 || W.amp < 0.08) this._endRide(fadeWhy(W, spd));
        // AN AIR (stage 6, _takeOff): up through the lip (chi rising through -airChi), fast, going seaward
        // over the ground, on a real wave - and not on the way out over the back in a kick-out.
        if (this.state === RIDE && !this._kick && chiWas < -P.airChi && W.chi >= -P.airChi && W.chi - chiWas < 1
          && spd >= P.airV && W.amp > P.airAmp && this.vz * wv.alongX - this.vx * wv.alongZ > 0) this._takeOff(W, S, spd);
      }
    } else if (this.state === WIPE) {
      if (this.stateT >= P.wipeSec) { this._set(PRONE); this.cool = 0.3; this._emit('back_on'); }
    }

    this._float(sea, t, dt, S, slopeAlong, -S.slopeX * s2 + S.slopeZ * c2);
    if (this.state === RIDE) {
      const R = this.ride;
      R.dist += Math.hypot(this.x - ox, this.z - oz);
    }
  }

  // A press acted on at once: today's exact rules (popBuffer 0, or a verdict nothing can improve).
  _pressNow(V, slopeAlong, W, u0) {
    if (V === 'falls' || V === 'pearl') this._late(V === 'falls');
    else if (V === 'ok') this._popUp(slopeAlong, W);
    else if (V === 'early') { this.stats.early++; this._emit('early', { u: u0, c: W.c }); this.cool = 0.4; }
    else this._duckDive(W);
  }

  // Too late: up in the lip (over the falls), or so steep the nose goes under (a pearl).
  _late(inLip) {
    this._emit('pearl', { why: inLip ? 'falls' : 'pearl' });
    this._wipe(inLip ? 'falls' : 'pearl');
  }

  _popUp(slopeAlong, W) {
    this._set(RIDE);
    // THE TAKE-OFF, GRADED (27 Sep 2026, stage 2). A LATE DROP - up high on the face (chi > -0.9) where
    // it is steep (slopeAlong < -0.30, or the big day's wall) and not yet breaking hard - is the one a
    // surfer is proud of: +50 at x2, and the ride starts on x2 (4 quality seconds banked). A FOAM START
    // - standing up in the whitewater low on the wave - gets nothing extra. Anything else is CLEAN.
    // (What a press DOES is still popVerdict's alone: the grade never refuses or changes a take-off.)
    // MEASURED (feel/window.mjs rerun, tmp-audit/stage2-ride/after-window.txt): 16 of 474 big-day
    // take-offs were late drops, none at 0.7x or 1x - the sampled face there never passes a slope of
    // 0.26 along the board (sea-surf.js: ~13 deg), so below the big day only a wall would qualify.
    const grade = W.chi > -0.9 && (slopeAlong < -0.30 || (W.wall || 0) > 0.3) && W.brk < 0.9 ? 'late'
      : W.brk > 0.8 && W.chi < -1.5 ? 'foam' : 'clean';
    const J = this._judge = new RideJudge(grade, (type, extra) => this._emit(type, extra));
    // crest: which wave this is (the count of crests that have passed you). Standing up again on the
    // same face after a kick-out is the same wave - the level counts it once (loop audit: the level
    // was won 10 s after the first pop-up by kicking out and popping straight back up).
    // pts / q / mult / movesBanked: the judge's live numbers, refreshed every RIDE tick (see step()).
    this.ride = { t0: this.time, x0: this.x, z0: this.z, top: 0, dist: 0, slow: 0, crest: this.crests, grade,
      pts: J.pts, q: J.q, mult: J.mult, movesBanked: 0, timePts: J.latePts, carvePts: 0, carves: 0 };
    this._emit('popup', { u: this.u, c: W.c, grade, bonus: J.latePts });
  }

  // AN AIR (stage 6): the board leaves the lip. THE LIP'S THROW: a board run up through the lip does not
  // sail on out over the back of the wave - the lip is water going shoreward at the wave's speed, and it
  // takes the board with it. So across the wave (along the shore normal) the board now goes shoreward
  // at BOARD.airCarry x the wave's speed, while along the line it keeps the speed it had; what carried
  // it up the face goes into the lift, airVy0 + airVyK x the speed it hit the lip at (the line-up's own
  // law, gl/surfers.js steer() 'air'). It comes down on the face it left, not behind the wave.
  _takeOff(W, S, spd) {
    const P = this.spec, wv = this.wave, ax = wv.alongX, az = wv.alongZ;
    const al = this.vx * ax + this.vz * az, sea = -P.airCarry * W.c;     // seaward, per the unit (-az, ax)
    this.vx = al * ax - az * sea; this.vz = al * az + ax * sea;
    this.air = { y: S.height, vy: P.airVy0 + P.airVyK * spd, t: 0, spin: 0, v: spd };
    this.airTicks = 0; this._landT = 0;
    // Out of the lip is out of its threat (REAL's 'falls' can have been called on the way up to it).
    if (this._risk && this._risk.why) { this._emit('risk_clear', { why: this._risk.why }); this._risk.why = null; this._risk.t = 0; }
    this._emit('air', { v: spd, vy: this.air.vy });
  }

  // ONE TICK IN THE AIR (stage 6): the arc, the body, and the landing once it is back down to the water.
  _airTick(W, S, dt) {
    const A = this.air, fx = this.fx;
    A.t += dt; A.vy -= G * dt; A.y += A.vy * dt; A.spin += this.r * dt;
    this.vy = A.vy; this.airTicks++; this.wet = 0;
    // The body (gl/surfer-figure.js grab()): tucked up as the board leaves the lip, the legs reaching
    // down again for the water in the last half metre - so it is standing again as it lands.
    fx.air = sstep(A.t / 0.12) * (A.vy > 0 ? 1 : sstep((A.y - S.height - 0.05) / 0.45));
    fx.comp = 0.9; fx.carve = 0; fx.snap = 0; fx.back = 0; fx.wide = 0;
    if (A.y <= S.height && (A.vy < 0 || A.t > 0.15)) this._land();
  }

  // DOWN (stage 6). Within BOARD.airLand of straight down the face - shoreward across the wave, the
  // judge's (alongZ, -alongX) - it is an air, scored by the judge on its spin, and the knees take it;
  // any other way round it is a wipe-out ('landing').
  _land() {
    const P = this.spec, A = this.air, wv = this.wave;
    this.air = null; this.airTicks = 0; this.vy = 0; this.wet = 1; this.fx.air = 0;
    this.r = Math.max(-P.rateMax, Math.min(P.rateMax, this.r));     // the rail takes over the spin
    let e = this.heading - Math.atan2(-wv.alongX, wv.alongZ);
    while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
    const spin = Math.abs(A.spin) * 180 / Math.PI, off = Math.abs(e), ok = off <= P.airLand;
    const name = ok ? this._judge.air(spin) : null;
    this._emit('land', { ok, name, spin: Math.round(spin), secs: A.t, off: Math.round(off * 180 / Math.PI) });
    if (ok) this._landT = P.landT;
    else this._wipe('landing');
  }

  _duckDive(W) {
    this._set(DUCK);
    this.stats.ducks++;
    this._duck = { chi0: W.chi, crossed: false, brkMax: W.brk, wait: false };
    if (this.spec.duckWait) {
      // A breaking crest here or up to 11 m seaward: worth waiting under for (not a dive in flat water).
      const A = surfSample(this.x, this.z + 11, this.time, 0, this._sea ? this._sea.surfCtl : 1, this._as);
      this._duck.wait = (W.brk > 0.25 && W.chi < 0.2) || (A.brk > 0.25 && A.chi > -1.4 && A.chi < 0.2);
    }
    this._emit('duck');
  }

  _endRide(why) {
    const R = this.ride;
    if (!R) { if (this.state === RIDE) this._set(PRONE); return; }
    const secs = this.time - R.t0;
    this.ride = null;
    // How the last ride ended, for readers that cannot see the events (the ride camera's end beat,
    // boats/hub.js _rideView): a new object per ride end, so "a new one" is an identity check.
    this.lastEnd = { why, t: this.time, secs };
    this.stats.rides++; this.stats.rideTime += secs;
    if (secs > this.stats.rideBest) this.stats.rideBest = secs;
    // THE RIDE SCORE is the judge's (surfer/judge.js): zone points + banked moves (with their variety
    // bonuses) + a late drop + a clean kick-out. A move still waiting to bank is LOST unless the ride
    // ended on your own terms ('move_lost' events come out of end() before this ride_end).
    const J = this._judge; this._judge = null;
    const E = J.end(why, this._kickClean);
    this._kick = null; this._kickClean = true;
    // (stage 6) Off the board is off the air: the flight ends with the ride (a pier leg, in the air).
    this.air = null; this.airTicks = 0; this.vy = 0; this.wet = 1; this._landT = 0;
    // The body's ride moves end with the ride (the next pop-up must not start mid-carve).
    { const fx = this.fx; fx.comp = 0.5; fx.carve = 0; fx.snap = 0; fx.back = 0; fx.wide = 0; fx.air = 0; }
    // moves: [{ name, pts, bonus, sweep }]; zonePts; grade. carves / timePts / carvePts / kickPts are
    // kept for today's readers (mode.js, surfer-hud.js): score === round(timePts + carvePts + kickPts).
    this._emit('ride_end', { why, secs, dist: R.dist, top: R.top, score: E.score, mult: E.mult, crest: R.crest,
      moves: E.moves, zonePts: E.zonePts, latePts: E.latePts, grade: E.grade, q: E.q, zoneT: E.zoneT,
      carves: E.moves.length, timePts: E.zonePts + E.latePts, carvePts: E.movePts, kickPts: E.kickPts });
    const wv = this.wave;
    wv.zone = null; wv.curlSide = 0; wv.curlDist = Infinity; wv.curlK = 0;
    if (this.state === RIDE) { this._set(PRONE); this.cool = 0.4; }
  }

  // RISK, one tick (BOARD.risk). toShore: cos of the angle off straight in (+1 = at the beach).
  _riskStep(W, spd, dt, toShore) {
    const P = this.spec, K = this._risk || (this._risk = { why: null, t: 0, brkPrev: 1 });
    const off = Math.acos(Math.max(-1, Math.min(1, toShore)));
    const onFace = W.chi > -1.2 && W.chi < -0.05;
    let threat = null;
    // a closeout starts as the break rises through closeBrk under you, and lasts while it stays broken
    if (K.why === 'closeout' ? W.brk >= P.closeBrk && off > P.closeAng : K.brkPrev < P.closeBrk && W.brk >= P.closeBrk && onFace && off > P.closeAng) threat = 'closeout';
    else if (W.chi > P.riskLipChi && W.chi < 0.3 && W.brk > P.lipThrow && -this.vz < P.lipSlow * W.c && !(spd >= P.airV && this.vz > 0)) threat = 'falls';   // (fast and seaward: that is an air going up, not a stall in the lip)
    else {
      // (held: a keyboard steers at full lock every time it steers, so a moment of it is not a caught rail -
      // only full lock HELD railHold s at a crawl; 2.5 m/s and no hold warned on nearly every REAL ride)
      const railing = (this._turnIn || 0) >= P.railTurn && spd < P.railV && W.amp > 0.2 && W.chi > -2.4 && W.chi < 0;
      this._railT = railing ? (this._railT || 0) + dt : 0;
      if (this._railT >= P.railHold) threat = 'rail';
    }
    K.brkPrev = W.brk;
    if (threat) {
      if (K.why !== threat) { K.why = threat; K.t = 0; this._emit('risk', { why: threat }); }
      K.t += dt;
      if (K.t >= P.riskWarn) { K.why = null; K.t = 0; this._wipe(threat); }
    } else if (K.why) {
      // got out of it: a closeout straightened out of is RIDDEN OUT (the ride goes on, in the foam)
      if (K.why === 'closeout' && W.brk >= P.closeBrk) this._emit('rode_out');
      else this._emit('risk_clear', { why: K.why });
      K.why = null; K.t = 0;
    }
  }

  _wipe(why) {
    if (this.state === RIDE) this._endRide(why);
    this._set(WIPE);
    this.stats.wipes++;
    this._emit('wipe', { why });
  }

  _hitsSomething(obs) {
    const ch = Math.cos(this.heading), sh = Math.sin(this.heading);
    for (let i = 0; i < OUTLINE.length; i += 2) {
      const wx = this.x + ch * OUTLINE[i] - sh * OUTLINE[i + 1];
      const wz = this.z + sh * OUTLINE[i] + ch * OUTLINE[i + 1];
      if (obs.blocked(wx, wz)) return true;
    }
    return false;
  }

  // The board sits ON the water (a board with someone lying on it floats awash, deck at the
  // waterline - surfers.js REFERENCE); standing, it planes a little higher. `y` is what the
  // camera and the pose follow; `yDraw` is where the board is actually drawn, which differs only
  // under a duck-dive, so the camera never follows it under the surface.
  _float(sea, t, dt, S0, slopeAlong, slopeAcross) {
    const S = S0 || sea.sample(this.x, this.z, t, 0, 2);
    const sa = slopeAlong ?? 0, sc = slopeAcross ?? 0;
    const surf = S.height;
    if (this.air) {
      // IN THE AIR (stage 6): on its arc, not on the water (the camera and the replay follow yDraw up
      // it) - nose up leaving the lip, level over the top, nose down to meet the face; banked a little
      // into a spin, as the line-up's riders are (gl/surfers.js: x 0.3 in the air).
      const A = this.air, kA = dt > 0 ? Math.min(1, dt * 10) : 1;
      this.y = A.y; this.yDraw = A.y + 0.05;
      const pitA = 0.3 * Math.max(-1, Math.min(1, A.vy / 2.5));
      const rolA = 0.3 * Math.max(-0.75, Math.min(0.75, Math.atan(0.8 * Math.hypot(this.vx, this.vz) * this.r / G)));
      this.pitch += (pitA - this.pitch) * kA;
      this.roll += (rolA - this.roll) * kA;
      return;
    }
    this.y = surf;
    let dip = 0;
    if (this.state === DUCK) {
      const P = this.spec, k = this.stateT;
      const down = Math.min(1, k / 0.25);
      dip = P.duckDepth * down;
    }
    const off = this.state === RIDE ? 0.05 : this.state === WIPE ? -0.12 : -0.01;
    this.yDraw = surf + off - dip;
    // Nose-down while diving (the push under), otherwise the water's own tilt.
    const k = dt > 0 ? Math.min(1, dt * 10) : 1;
    let pit = Math.atan(sa) * 0.9;
    if (this.state === DUCK) pit = this.stateT < 0.45 ? -0.3 : 0;   // nose pushed under; not so steep the tail (and a leg) stands out of the water
    // (27 Sep: both signs were backwards - gl/surfers.js place() puts the RIGHT rail down for a
    // positive roll, and a positive r is a turn to the right - so the board banked OUT of every turn
    // and, lying on a slope, dipped its uphill rail into it. Into the turn, and with the water.)
    // STANDING, the bank a turn needs (stage 2, 27 Sep 2026): tan(bank) = 0.8 v r / g, as the line-up's
    // riders bank (gl/surfers.js - less a little: knees and hips do some of it), capped at 0.75 rad.
    // It was r x 0.35: 0.6 rad/s gave 12 degrees whether you were crawling or doing 25 km/h.
    const vRide = this.state === RIDE ? Math.hypot(this.vx, this.vz) : 0;
    const rol = this.state === RIDE ? Math.max(-0.75, Math.min(0.75, Math.atan(0.8 * vRide * this.r / G))) : -Math.atan(sc) * 0.7;
    this.pitch += (pit - this.pitch) * k;
    this.roll += (rol - this.roll) * k;
  }
}
