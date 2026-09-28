// THE RIDE JUDGE (27 Sep 2026, the PIER SURF revamp's stage 2: "the ride - surf the wave, not the
// foam"). What a ride is worth, decided by WHERE on the wave you are and WHAT you do on it - not by
// the wall clock. Pure: no DOM, no Math.random, no clock of its own. boats/surfboard.js makes one in
// _popUp and ticks it every RIDE step; it replaced the board's own carve counter and its RIDE_PTS
// seconds rule, which the loop audit showed paid for the wrong things:
//   * riding straight at the beach in the whitewater, hands off, scored 214% of a trimmed line on the
//     face at the default surf and 272% on the big day (tmp-audit/feel/lab1.mjs 'none' vs
//     feel/pump.mjs chi -0.8) - the longest rides were the worst surfing;
//   * a mouse wiggled side to side every 0.36 s made 200 "carves" and 16,479 points in ten minutes,
//     87% of them carves (tmp-audit/loop/exploit.mjs), against 1,745 for a clean trimmed line.
//
// WHERE YOU ARE (the zone, every tick; two extra surf samples 6 m either side of you along the shore,
// ~1.2 us each - MEASURED +1.8 to 2.2 us a RIDE tick in all, tmp-audit/stage2-ride/cost.mjs):
//   POCKET  the unbroken face (brk < 0.5, chi -1.6..-0.1) with the breaking part of the wave beside
//           you (curlK > 0.5, curlK = smoothstep(0.5, 0.95, the harder-breaking probe's brk))   x1.5
//   FACE    the unbroken face anywhere else                                                     x1.0
//   FOAM    the whitewater (brk >= 0.5)                                                         x0.15
//   FLAT    anywhere else: the bottom of the wave, over the back, the flat ahead of it          x0.05
// Points build at JUDGE.perSec x the zone's weight x the multiplier. The multiplier steps up at 4, 8
// and 12 s of QUALITY time (FACE + POCKET: the ladder climbs on the wave, not in the mush) to x2, x3,
// x4, and every 2.5 s of unbroken foam knocks one step off it again ('foam_drop').
//
// WHAT YOU DO (the moves; the loop audit's tracker, tmp-audit/loop/judge2.mjs). A TURN is a run of
// yaw rate |r| >= 0.3 rad/s one way; a 0.12 s lull or a change of direction closes it. It is a MOVE
// only if it swept 55 degrees or more, at 3 m/s or more on average, and started on a live face (the
// wave at least 0.2 m high there, from the bottom of the face up to just behind the lip). Named by
// where it went (up = it ends facing further out to sea than it started):
//   CUTBACK      130 degrees or more, or it reversed your travel along the shore       350
//   BOTTOM TURN  up the face, from low on it (chi < -1.0)                              150
//   OFF THE LIP  down the face, off the top (behind the crest, or in a lip breaking > 0.6) 350
//   SNAP         down the face from high on it, the rail broken loose (skid >= 0.15)   250
//                (the plan left a snap's price open: between a top turn and an off the lip)
//   TOP TURN     down the face from high on it (chi > -0.5)                            200
//   CARVE        anything else that big                                               80
// Worth base x clamp(sweep / 90, 0.6, 1.5) x clamp(speed / 4, 0.75, 1.5) x the repeat factor for the
// n-th of that name this ride [1, 0.6, 0.35, 0.2, 0.1] x the multiplier - and it only BANKS if you are
// still up JUDGE.bank s later ('move'); lose the wave first and it is 'move_lost' (LOST IT) - unless
// the ride ended on your own terms, a kick-out or riding it into the shallows, and then it banks. Each
// DIFFERENT move after the first banked pays a variety bonus of 100 x the multiplier (in its 'move'
// event as `bonus`). A wiggle never sweeps 55 degrees, so it earns nothing but the zone it is in.
//
// EVERY RIDE ENDING HAS A NAME (RIDE_ENDS below). There is no 'faded' any more.
//
// FLOATERS AND AIRS (27 Sep 2026, stage 6 - a skill ceiling that leaves the default game alone). Two
// moves that are not turns, scored through the same pending / bank / repeat / variety machinery, so
// the level pops them like every move ('move', name 'FLOATER' / 'AIR' / 'AIR 180' / 'AIR 360'):
//   FLOATER  along the line OVER the breaking crest: chi -0.15..0.25 where it is breaking hard
//            (brk > 0.8), moving along the shore (at least JUDGE.float.v m/s of it, and float.along of
//            your speed) for float.t s without a break longer than JUDGE.gap. 60 x the repeat factor x
//            the multiplier; one per visit to the lip. While you are on it (this.floating) the board
//            feels only surfboard.js BOARD.floatSlope of the down-slope pull: it rides over the lip.
//   AIR      the board's (surfboard.js _takeOff: off the lip at speed, going seaward); landed facing
//            down the face it is 150 x (1 + spin / 180 deg) x the repeat factor x the multiplier, named
//            by the spin in the air: AIR, AIR 180 (180 deg or more), AIR 360 (360 or more). Its `sweep`
//            is the spin. A bad landing is the board's to call: a wipe-out, 'landing' (RIDE_ENDS).
// While the board is in the air (B.air) the turn tracker sees no turn - the spin is the air's, not a
// carve - and no floater.
import { surfSample, makeSurfSlot, shoreCoords } from '../sea-surf.js';

// A WAVE SCORE, 0-10, as contests judge a ride (27 Sep 2026, stage 3: heats). From the ride's points:
// 10 x (1 - exp(-pts / WAVE_K)), to the hundredth. WAVE_K = 1000 puts a clean trimmed line on the
// default day (~600 pts, tmp-audit/stage2-ride/gates.mjs) at about 4.5 and a well-surfed wave with
// turns (~1300) at about 7.3 - the plan's "4-5 clean, 7-8 well surfed" - and nothing ever reaches 10.
export const WAVE_K = 1000;
export function waveScore(pts) { return Math.min(999, Math.round(1000 * (1 - Math.exp(-Math.max(0, pts || 0) / WAVE_K)))) / 100; }

export const JUDGE = Object.freeze({
  // Points a second on the face at x1. The plan said "about 50"; at 50 a mouse wiggled every 0.40 s
  // on the big day (it holds the face by bleeding speed, 5% of it per radian turned) scored 86% of the
  // chi-driven surfer's bottom and top turns, and the gate is under half. With the move table fixed,
  // that needs 27 or less: at 25 it is 47% (34% at 1x) and a hands-off ride is still 38% / 23% of a
  // trimmed line (tmp-audit/stage2-ride/gates.mjs; the variants are g-p35.txt, g-p25.txt there).
  perSec: 25,
  zone: Object.freeze({ pocket: 1.5, face: 1.0, foam: 0.15, flat: 0.05 }),
  steps: Object.freeze([4, 8, 12]),                  // quality seconds for x2, x3, x4
  stepQ: 4,                                          // what one foam drop takes off (one step)
  foamDrop: 2.5,                                     // s of unbroken foam per step lost
  probe: 6,                                          // m either side along the shore
  curl0: 0.5, curl1: 0.95,                           // curlK = smoothstep(curl0, curl1, probe brk)
  turnR: 0.3, gap: 0.12, minSweep: 55, minV: 3.0,    // what makes a turn a move
  liveAmp: 0.2, chiLo: -2.4, chiHi: 0.3,             // ...started on a live face
  bank: 0.8,                                         // s still up before a move counts
  snapSkid: 0.15,
  move: Object.freeze({ 'BOTTOM TURN': 150, 'CARVE': 80, 'TOP TURN': 200, 'SNAP': 250, 'OFF THE LIP': 350, 'CUTBACK': 350,
    // (stage 6: not turns - see FLOATERS AND AIRS above; an air's base is x (1 + spin / 180 deg))
    'FLOATER': 60, 'AIR': 150, 'AIR 180': 150, 'AIR 360': 150 }),
  float: Object.freeze({ chi0: -0.15, chi1: 0.25, brk: 0.8, t: 0.6, v: 2.5, along: 0.6 }),
  // (28 Sep 2026) a move begun with the board this far into the bore (surfboard.js foamK) does not count; a
  // floater rides over the breaking section at the curl, not along the top of the whitewater
  foamMove: 0.5,
  // (28 Sep 2026) an OFF THE LIP is off a lip: the wave at the top of the turn at least this fraction of the
  // most its water can stand (sea-surf.js crit). Off a soft crest the same turn is a SNAP or a TOP TURN.
  lipCrit: 0.75,                                     // (the same bar as surfboard.js airCrit)
  repeat: Object.freeze([1, 0.6, 0.35, 0.2, 0.1]),
  variety: 100,
  // A clean kick-out - stepping off over the back on your own terms instead of being left behind by
  // the wave - pays two seconds of face at the multiplier (it was 25, 2.5 s, on the old 10 a second).
  kick: 50,
  // THE LATE DROP (the take-off grade, surfboard.js _popUp): 50 at x2, and the ride starts on x2.
  late: Object.freeze({ pts: 50, q: 4 }),
});

// THE NAMED ENDINGS. Every ride_end.why is one of these:
//   'kickout'    you stepped off on purpose (SPACE / right click / A / the round button)
//   'over_back'  the wave went on without you: stopped at or behind the crest (chi >= 0), on the
//                face, or in the whitewater
//   'outran'     you ran on ahead of the wave into flat water: still moving when the wave ran out
//                under you, or stopped in the flat in front of the face
// (surfboard.js fadeWhy() picks between those two; the old catch-all for both was 'faded'.)
//   'shallows'   the fins touched the sand
//   'pier'       a pier leg - the ride ends in a wipe-out (a tumble and a climb back on)
// ...and the wipe-out reasons, which today end a PRONE board, never a ride, but are named here so a
// ride that ever ends in one is still in the set: 'falls' (over the falls), 'pearl', 'washed'.
//   (stage 6, REAL only - surfboard.js BOARD.risk) 'closeout' the wave broke across you while you rode
//   along it; 'rail' a turn too hard for your speed caught the rail; 'falls' from a ride: pitched from the lip.
//   (stage 6, every level - surfboard.js _land) 'landing' you came down from an air more than
//   BOARD.airLand (50 deg) off straight down the face: a wipe-out, a tumble and a climb back on.
export const RIDE_ENDS = Object.freeze(['kickout', 'over_back', 'outran', 'shallows', 'pier', 'falls', 'pearl', 'washed', 'closeout', 'rail', 'landing']);
// Endings that are a finished ride, not a fall: a move still waiting its JUDGE.bank seconds banks.
const BANK_ON_END = new Set(['kickout', 'shallows']);

export const multAt = (q) => 1 + JUDGE.steps.filter((s) => q >= s).length;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const DEG = 180 / Math.PI;

// Where you are, from the wave under you and how hard it breaks beside you.
export function zoneOf(W, curlK) {
  if (W.brk >= 0.5) return 'foam';
  if (!(W.amp > 0.12 && W.chi > -1.6 && W.chi < -0.1)) return 'flat';
  return curlK > 0.5 ? 'pocket' : 'face';
}

// The move a closed turn was, or null. T: the turn's record (RideJudge.tick builds it as this.turn).
export function nameMove(T) {
  const sw = Math.abs(T.sw) * DEG, v = T.v / Math.max(1e-6, T.dur);
  if (sw < JUDGE.minSweep || v < JUDGE.minV) return null;
  if (!(T.amp0 >= JUDGE.liveAmp && T.chi0 >= JUDGE.chiLo && T.chi0 <= JUDGE.chiHi)) return null;
  // (28 Sep 2026) a turn begun in the whitewater is not a move: the bore is not a face (surfboard.js foamK)
  if ((T.foam0 || 0) > JUDGE.foamMove) return null;
  // up: the turn ends facing further out to sea (+Z on this coast) than it started.
  const up = Math.sin(T.h1) > Math.sin(T.h0);
  const reversed = Math.abs(T.al0) > 1 && Math.abs(T.al1) > 1 && Math.sign(T.al0) !== Math.sign(T.al1);
  if (sw >= 130 || reversed) return 'CUTBACK';
  if (up && T.chi0 < -1.0) return 'BOTTOM TURN';
  if (!up && (T.chiMax > 0 || T.brkMax > 0.6) && (T.critMax === undefined || T.critMax >= JUDGE.lipCrit)) return 'OFF THE LIP';
  if (!up && T.chiMax > -0.5 && T.skidMax >= JUDGE.snapSkid) return 'SNAP';
  if (!up && T.chiMax > -0.5) return 'TOP TURN';
  return 'CARVE';
}

export class RideJudge {
  // grade: the take-off ('late' | 'clean' | 'foam'); emit(type, extra): the board's event queue.
  constructor(grade, emit) {
    this.grade = grade || 'clean';
    this.emit = emit || (() => {});
    const late = this.grade === 'late';
    this.q = late ? JUDGE.late.q : 0;                // quality seconds (FACE + POCKET)
    this.mult = multAt(this.q);
    this.latePts = late ? JUDGE.late.pts * this.mult : 0;
    this.zonePts = 0; this.movePts = 0; this.kickPts = 0;
    this.zonePtsBy = { pocket: 0, face: 0, foam: 0, flat: 0 };
    this.zoneT = { pocket: 0, face: 0, foam: 0, flat: 0 };
    this.foamRun = 0;
    this.moves = []; this.pending = []; this.used = {}; this.bankedNames = {}; this.banked = 0;
    this.turn = null; this.gapT = 0;
    // The floater under way: s on it, s since it last held, whether this visit has scored; and
    // `floating`, read by the board next tick (BOARD.floatSlope).
    this.floatT = 0; this.floatGap = 0; this.floatDone = false; this.floating = false;
    this.zone = 'flat'; this.curlK = 0; this.curlSide = 1; this.curlDist = Infinity; this.alongX = 1; this.alongZ = 0;
    this.sL = makeSurfSlot(); this.sR = makeSurfSlot(); this.sc = { d: 0, o: 0, w: 0, gx: 0, gz: 1 };
    this.t = 0;
  }

  // The live total: what the HUD shows while you ride (a move counts once it has banked).
  get pts() { return this.zonePts + this.latePts + this.movePts; }

  // THE TWO PROBES: JUDGE.probe m either side along the shore, at the same distance out (along the
  // local d contour - the shore normal is shoreCoords' gradient). +1 is the +o side: pier-space
  // alongshore, world direction (alongX, alongZ) = (D1, -D0)-ish = EAST, AWAY from the pier on this
  // (east) bank; -1 is toward the pier. curlDist: metres to where the breaking part starts (brk 0.5,
  // linear between you and the probe), 0 in it, Infinity when neither probe is breaking that hard.
  sense(x, z, t, ctl, W) {
    const sc = shoreCoords(x, z, this.sc);
    let tx = sc.gz, tz = -sc.gx; const n = Math.hypot(tx, tz) || 1; tx /= n; tz /= n;
    this.alongX = tx; this.alongZ = tz;
    const P = JUDGE.probe;
    const L = surfSample(x - tx * P, z - tz * P, t, 0, ctl, this.sL).brk;
    const R = surfSample(x + tx * P, z + tz * P, t, 0, ctl, this.sR).brk;
    const m = R >= L ? R : L;
    // (0 when neither side is breaking harder: no side to name - the level shows no arrow, EASY's trim
    // keeps your own line; the b53 review found a hands-off rider sent one fixed way by the tie)
    this.curlSide = R > L ? 1 : R < L ? -1 : 0;
    this.curlK = smooth(JUDGE.curl0, JUDGE.curl1, m);
    const b = W.brk;
    this.curlDist = b >= 0.5 ? 0 : m >= 0.5 ? P * (0.5 - b) / Math.max(1e-6, m - b) : Infinity;
    this.zone = zoneOf(W, this.curlK);
    return this.zone;
  }

  // One RIDE step: B the board (read only), W its surf sample this step, t the sim time.
  tick(B, W, t, dt, ctl) {
    this.t = t;
    const z = this.sense(B.x, B.z, t, ctl, W);
    this.zoneT[z] += dt;
    const was = this.mult;
    if (z === 'pocket' || z === 'face') { this.q += dt; this.foamRun = 0; }
    else if (z === 'foam') {
      this.foamRun += dt;
      if (this.foamRun >= JUDGE.foamDrop) {
        this.foamRun = 0;
        this.q = Math.max(0, this.q - JUDGE.stepQ);
      }
    }
    this.mult = multAt(this.q);
    if (this.mult > was) this.emit('ride_mult', { mult: this.mult, q: this.q, secs: B.ride ? t - B.ride.t0 : 0 });
    else if (this.mult < was) this.emit('foam_drop', { mult: this.mult, q: this.q });
    const p = JUDGE.perSec * JUDGE.zone[z] * this.mult * dt;
    this.zonePts += p; this.zonePtsBy[z] += p;

    // ---- the turn under way ----
    // The kick-out's own turn up the face is not a move (surfboard.js B._kick): it closes the one before.
    // Nor is a spin in the air (B.air): that is the air's own, scored when it lands.
    const r = B._kick || B.air ? 0 : (B.r || 0), s = Math.abs(r) >= JUDGE.turnR ? Math.sign(r) : 0, T = this.turn;
    const al = B.vx * this.alongX + B.vz * this.alongZ, sp = Math.hypot(B.vx, B.vz), sk = B.skid || 0;
    // ---- the floater under way (FLOATERS AND AIRS, above) ----
    const F = JUDGE.float;
    const fl = !B.air && W.chi > F.chi0 && W.chi < F.chi1 && W.brk > F.brk && Math.abs(al) >= F.v && Math.abs(al) >= F.along * sp
      && (B.foamK || 0) <= JUDGE.foamMove;
    if (fl) {
      this.floatT += dt; this.floatGap = 0;
      if (this.floatT >= F.t && !this.floatDone) { this.floatDone = true; this.trick('FLOATER', JUDGE.move.FLOATER, 0); }
    } else if (this.floatT > 0) {
      this.floatGap += dt;
      if (this.floatGap > JUDGE.gap) { this.floatT = 0; this.floatGap = 0; this.floatDone = false; }
    }
    this.floating = fl;
    if (s !== 0 && T && s === T.s) {
      T.sw += r * dt; T.dur += dt; T.v += sp * dt; T.h1 = B.heading; T.al1 = al;
      if (W.chi > T.chiMax) T.chiMax = W.chi;
      if (W.brk > T.brkMax) T.brkMax = W.brk;
      if ((W.crit || 0) > T.critMax) T.critMax = W.crit || 0;
      if (sk > T.skidMax) T.skidMax = sk;
      this.gapT = 0;
    } else if (s !== 0) {
      this._close();
      this.turn = { s, sw: r * dt, dur: dt, v: sp * dt, chi0: W.chi, chiMax: W.chi, brkMax: W.brk, amp0: W.amp, foam0: B.foamK || 0, critMax: W.crit || 0,
        h0: B.heading - r * dt, h1: B.heading, al0: al, al1: al, skidMax: sk };
      this.gapT = 0;
    } else if (T) { this.gapT += dt; if (this.gapT > JUDGE.gap) this._close(); }

    // ---- moves that have now been ridden out ----
    while (this.pending.length && this.pending[0].at <= t + 1e-9) this._bank(this.pending.shift());
  }

  _close() {
    const T = this.turn; this.turn = null; this.gapT = 0;
    if (!T) return;
    const name = nameMove(T);
    if (!name) return;
    const sweep = Math.abs(T.sw) * DEG, v = T.v / T.dur;
    const n = this.used[name] = (this.used[name] || 0) + 1;
    const rep = JUDGE.repeat[Math.min(n - 1, JUDGE.repeat.length - 1)];
    const pts = JUDGE.move[name] * cl(sweep / 90, 0.6, 1.5) * cl(v / 4, 0.75, 1.5) * rep * this.mult;
    this.pending.push({ name, sweep: Math.round(sweep), pts: Math.round(pts), n, mult: this.mult, at: this.t + JUDGE.bank });
  }

  // A move that is not a turn (a FLOATER, an AIR): base points, x the repeat factor for the n-th of that
  // name this ride, x the multiplier; it waits JUDGE.bank s to bank like any move. sweep: what it
  // carries as `sweep` (an air's spin, degrees).
  trick(name, base, sweep) {
    const n = this.used[name] = (this.used[name] || 0) + 1;
    const rep = JUDGE.repeat[Math.min(n - 1, JUDGE.repeat.length - 1)];
    this.pending.push({ name, sweep: Math.round(sweep || 0), pts: Math.round(base * rep * this.mult), n, mult: this.mult, at: this.t + JUDGE.bank });
    return name;
  }
  // AN AIR, LANDED (surfboard.js _land): spin, the degrees turned in the air. Returns its name.
  air(spin) {
    const name = spin >= 360 ? 'AIR 360' : spin >= 180 ? 'AIR 180' : 'AIR';
    return this.trick(name, JUDGE.move[name] * (1 + spin / 180), spin);
  }

  _bank(m) {
    const fresh = !this.bankedNames[m.name];
    const bonus = fresh && Object.keys(this.bankedNames).length >= 1 ? JUDGE.variety * m.mult : 0;
    this.bankedNames[m.name] = true;
    this.movePts += m.pts + bonus;
    this.banked++;
    this.moves.push({ name: m.name, pts: m.pts, bonus, sweep: m.sweep, mult: m.mult });
    this.emit('move', { name: m.name, sweep: m.sweep, pts: m.pts, n: m.n, bonus, mult: m.mult });
  }

  // The ride is over: close the turn under way, settle the moves still waiting, pay a kick-out.
  // Returns what ride_end carries (surfboard.js _endRide).
  end(why, clean = true) {
    this._close();
    for (const m of this.pending) {
      if (BANK_ON_END.has(why)) this._bank(m);
      else this.emit('move_lost', { name: m.name });
    }
    this.pending.length = 0;
    // A kick-out pays only when it went over the crest (surfboard.js BOARD.kickT; clean = false: stepped off).
    this.kickPts = why === 'kickout' && clean ? JUDGE.kick * this.mult : 0;
    return {
      score: Math.round(this.zonePts + this.latePts + this.movePts + this.kickPts),
      zonePts: this.zonePts, latePts: this.latePts, movePts: this.movePts, kickPts: this.kickPts,
      moves: this.moves.slice(), q: this.q, mult: this.mult, grade: this.grade,
      zoneT: { ...this.zoneT }, zonePtsBy: { ...this.zonePtsBy },
    };
  }
}
