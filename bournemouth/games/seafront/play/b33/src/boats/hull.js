// Planing-hull physics shared by the driveable SPEEDBOAT and JETSKI (tmp-tr41,
// handling realism pass tmp-tr50).
//
// NOT the eFoil. Nothing here imports plant.js, sim.js, assist.js or tuning.js;
// the eFoil path is untouched and this module only ever reads the SAME Sea
// object the eFoil sim owns, through sea.sample() on slot 2 (the plant uses the
// others, view3d uses 3) so the ocean a boat rides is the ocean the foil rides.
// sea-state.js is read only for the preset table (wind estimate, below).
//
// Model, per fixed 120 Hz tick (semi-implicit Euler):
//  - ENGINE: the throttle drives a SPOOL (power actually delivered) through an
//    asymmetric lag, and a normalised RPM that follows spool and propeller LOAD:
//    held down at the hole shot (prop slip), full at top speed, and flaring to
//    the limiter when the prop/jet VENTILATES or leaves the water (thrust lost).
//    GEAR: an outboard must pass through neutral and only engages reverse near
//    idle and slow (shiftU); a jet's reverse bucket (iBR class) drops at any speed.
//  - SURGE / SWAY / YAW in the body frame with the kinematic coupling
//    du = aF + v r, dv = aS - u r. Thrust is power-limited with a static cap
//    (T = spool * min(Tstatic, eta P / u)); resistance is a planing-hull curve:
//    a wave-making HUMP (2x^4/(1+x^6), x = u / uHump, peak at x = 1.12) plus a
//    planing induced term that ramps in over the hump, skin + aero and a
//    low-speed viscous term that fades out above the hump. The planing part is
//    scaled by a RUNNING-TRIM penalty (Savitsky: drag is U-shaped in trim with a
//    minimum near 4-6 deg), turning costs speed (turnDrag * m * |u r|) and so
//    does SKIDDING (skidDrag * v^2). Lateral grip is CAPPED (aGrip * wet): ask
//    for more yaw than the keel can hold and the hull slides. Aero drag is on
//    the RELATIVE wind; the sea's wave slope and orbital velocity push the hull
//    (a slow boat surges and drifts in chop and wind).
//  - HEAVE / PITCH / ROLL from N one-sided spring-dampers at hull points, each
//    reading the local sea height: the hull rides the real waves, can leave the
//    water on a crest (no suction) and slams back. Stiffness is rho g A_wp. Each
//    point re-entering the water also takes a WEDGE-IMPACT force
//    1/2 rho Cs A v^2 (von Karman/Wagner water entry), which is the thump; its
//    horizontal component scrubs speed (slamScrub).
//  - BOW RISE: a dynamic trim moment K_pitch * tau(u) - hump peak (bigger when
//    trimmed out), planing trim, thrust squat and driver trim - scaled by how
//    much of the hull is wet, so it vanishes in the air. Past a speed-dependent
//    critical trim (Day & Haag) the hull PORPOISES: a bounded limit cycle in pitch.
//    Roll into turns from the lateral acceleration actually being pulled.
//  - GROUND: an analytic beach floor (obstacles.ground) under every hull point,
//    sand friction, and a hard wall (obstacles.blocked) for dry beach, pier legs
//    and groynes: a move that would put the hull outline into a blocked cell is
//    undone and the velocity into the obstacle removed.
//
// Heading convention is the sim's: x += cos(h) ds, z += sin(h) ds; +turn is to
// the right (toward local +Z); roll > 0 is right side DOWN; pitch > 0 nose up.
// lean > 0 = S key / mouse up = trim OUT (bow up); lean < 0 = W = trim IN.

import { SEA_PRESETS } from '../sea-state.js';
// >>> RAMPS
// Launch ramps (tmp-tr168). The deflection is a one-sided spring-damper against
// a deck height field plus that deck's slope reaction, summed into the SAME
// accumulators as the water and the sand below - so it heaves, pitches and rolls
// the hull through the model that is already here and not beside it. The
// buoyancy fix at the top of this file is not touched by any of it.
import { rampPoint, rampConst, wrapRampObstacles } from './ramp-collide.js';
// <<< RAMPS
// >>> SPINCTRL
// AIR SPIN (tmp-tr176). An ARCADE ASSIST and not physics, which is why it lives in its own
// file beside src/assist.js rather than inside this one: src/air-spin.js carries the whole
// derivation, the rate, and the counters that let a probe audit what it granted. It writes
// the HEADING and counter-rotates the body velocity; it never touches `r`, so tmp-tr174's
// conservation of carried yaw still runs underneath it and the two add.
import { AirSpin } from '../air-spin.js';
// <<< SPINCTRL
// >>> AIRTRIM
// AIR TRIM (tmp-tr185). The same class of thing as the air spin above and in its own file for
// the same reason: src/air-trim.js carries the whole derivation, the rate, the gate and the
// counters that let a probe audit what it granted. It writes the PITCH ANGLE; it never touches
// `q`, so the rotation this hull carried off the crest goes on integrating underneath it and
// the two add, and the water model still meets the pitch rate the physics gave it.
import { AirTrim } from '../air-trim.js';
// <<< AIRTRIM

const G = 9.81;
const RHO = 1025;
// How far above its own waterline a hull point is allowed to be BEFORE the immersion term
// stops being tracked. Nothing depends on the value: once a point is clear of the water its
// force is zero (see the note in step()), so this only keeps d finite if a hull is ever put
// somewhere absurd. 20 m is well past any jump this model can produce.
const MAX_RISE = 20;
// >>> AIRFEEL
// What is left of the sand's grip once a beached rider is working the hull off. See the
// BEACHED-CRAFT ESCAPE note at the foot of step(): it must land under the beach's own
// gradient (0.064 on the seabed) for the slope reaction to be able to move her at all.
const BEACH_GRIP = 0.1;
const BEACH_GRIP_MIN = 0.02;
// <<< AIRFEEL
const RHO_AIR = 1.225;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fin = (v) => (Number.isFinite(v) ? v : 0);
const lag = (v, target, dt, tau) => v + (target - v) * Math.min(1, dt / Math.max(1e-3, tau));

export class PlaneHull {
  constructor(P) {
    this.P = P;
    this.W = P.mass * G;
    const pts = P.springPts;
    const n = pts.length;
    // Centre the spring points on the CG so the static trim is level.
    let mx = 0; for (const p of pts) mx += p[0];
    mx /= n;
    this.px = new Float64Array(n); this.pz = new Float64Array(n);
    for (let i = 0; i < n; i++) { this.px[i] = pts[i][0] - mx; this.pz[i] = pts[i][1]; }
    this.n = n;
    this.kHeave = RHO * G * P.waterplane;          // N/m, whole hull
    this.k = this.kHeave / n;                      // per point
    let kp = 0, kr = 0;
    for (let i = 0; i < n; i++) { kp += this.k * this.px[i] ** 2; kr += this.k * this.pz[i] ** 2; }
    this.kPitch = kp; this.kRoll = kr;
    this.iPitch = P.mass * (P.length * P.length) / 16;   // k_yy ~ L/4
    this.iRoll = P.mass * (P.beam * P.beam) / 9;          // k_xx ~ B/3
    this.c = 2 * P.heaveZeta * Math.sqrt(this.kHeave * P.mass) / n;
    this.aSeg = P.waterplane / n;                  // bottom panel per point, m^2
    this.hPrev = new Float64Array(n);
    this.cgX = mx;   // design-frame x of the CG: meshes and outline shift by -cgX
    this.outline = buildOutline(P.outline.map(([ax, az]) => [ax - mx, az]), 0.35);
    this.windName = null; this.windX = 0; this.windZ = 0;
    // >>> RAMPS
    this.rampC = rampConst(P);          // stiffness / damping, scaled off this craft
    this.rampObsSrc = null; this.rampObs = null; this.onRamp = 0;
    // <<< RAMPS
    // >>> SPINCTRL
    this.airSpin = new AirSpin();
    // <<< SPINCTRL
    // >>> AIRTRIM
    this.airTrim = new AirTrim();
    // <<< AIRTRIM
    this.reset(0, 0, 0, null, 0);
  }

  reset(x, z, heading, sea, t) {
    Object.assign(this, {
      x, z, heading, u: 0, v: 0, r: 0, thr: 0, pitch: 0, q: 0, roll: 0, p: 0, vy: 0,
      wet: 1, airTicks: 0, maxAir: 0, aground: 0, hits: 0, lastHit: 0, lastHitSpeed: 0,
      nanTrips: 0, time: t || 0, ticks: 0, first: true, rev: 0,
      pitchMean: 0, spool: 0, rpm: 0, gear: 1, shiftT: 0, vent: 0, propWet: 1, trim: 0, tauEq: 0, porp: 0,
      nz: 1, slams: 0, slamG: 0, slamT: -9, inSlam: false, impact: 0, skid: 0, load: 0,
      pinT: 0,                                   // seconds pinned against an obstacle (escape, step())
      beachT: 0, beachRef: null,                 // seconds beached and going nowhere (escape, step())
    });
    // >>> SPINCTRL
    // The assist has no business carrying a rate, a flight time or a cheat total across a
    // craft reset. Guarded because reset() is also called from the constructor, before the
    // field exists.
    if (this.airSpin) this.airSpin.reset();
    // <<< SPINCTRL
    // >>> AIRTRIM
    // Same argument, same guard: reset() also runs from the constructor, before the field
    // exists, and an assist has no business carrying a rate or a cheat total across a reset.
    if (this.airTrim) this.airTrim.reset();
    // <<< AIRTRIM
    const h0 = sea ? sea.sample(x, z, t || 0, 0, 2).height : 0;
    this.y = h0 + (this.P.restLift || 0);
  }

  get speed() { return Math.hypot(this.u, this.v); }

  // Resistance at surge speed u >= 0, hydrodynamic part and aero part.
  resist(u) {
    const P = this.P, xh = u / P.uHump;
    const hump = 2 * xh ** 4 / (1 + xh ** 6);
    const hydro = this.W * (P.cHump * hump + P.cPlane * smooth(P.uHump, P.uPlane, u))
      + P.kFric * u * u + P.kVisc * u / (1 + xh * xh);
    return { hydro, aero: P.kAero * u * u };
  }

  thrust(u) {
    const P = this.P;
    // >>> RAID
    // Viking raid (tr57): a stall (thrust cut) or turbo factor set through CraftHub.raidHook;
    // both undefined/0 outside the raid, so this returns exactly what it did before.
    if (this.raidStall > 0) return 0;
    if (this.raidBoost > 0) return (1 + this.raidBoost) * Math.min(P.tStatic, P.etaP / Math.max(0.5, Math.abs(u)));
    // <<< RAID
    return Math.min(P.tStatic, P.etaP / Math.max(0.5, Math.abs(u)));
  }

  // Wind from the sea state: Pierson-Moskowitz fully developed sea, Hs = 0.21 U^2 / g,
  // blowing the way the waves travel (dirFromDeg is meteorological "from").
  _wind(sea) {
    const name = sea && sea.stateName;
    if (name === this.windName) return;
    this.windName = name;
    const S = name ? SEA_PRESETS[name] : null;
    if (!S || !(S.Hs > 0)) { this.windX = 0; this.windZ = 0; return; }
    const U = Math.sqrt(G * S.Hs / 0.21), b = (S.dirFromDeg + 180) * DEG;
    this.windX = U * Math.sin(b); this.windZ = -U * Math.cos(b);
  }

  step(inp, dt, sea, t, obs) {
    const P = this.P, m = P.mass;
    // >>> RAMPS
    // A ramp is rideable structure, not wall. obstacles.js rasterises every
    // non-sand coast triangle in the -1.2..+2.2 m band into its blocked grid and
    // a ramp lives squarely in it, so without this each one would be a wall the
    // hull bounces off and can never climb. The wrapper reports `blocked` false
    // inside a ramp footprint ONLY; ground(), groundSlope() and every cell
    // outside a footprint are passed straight through. Wrapped once per grid and
    // cached, so a tick costs one pointer compare.
    if (obs && obs !== this.rampObsSrc) { this.rampObsSrc = obs; this.rampObs = wrapRampObstacles(obs); }
    if (obs) obs = this.rampObs;
    let rampN = 0, rampFx = 0, rampFz = 0;
    // <<< RAMPS
    const turn = clamp(fin(inp.turn), -1, 1);
    const lean = clamp(fin(inp.lean), -1, 1);
    const thrCmd = clamp(fin(inp.throttle), 0, 1);
    const wantRev = inp.boost ? 1 : 0;
    const u = this.u, au = Math.abs(u);

    // ---- engine, gear, trim ----
    const want = wantRev ? -1 : 1;
    if (this.gear !== want) {
      if (this.gear !== 0) { this.gear = 0; this.shiftT = 0; }
      else {
        this.shiftT += dt;
        if (this.shiftT >= P.shiftTime && this.spool < 0.3 && (want === 1 || au <= P.shiftU)) this.gear = want;
      }
    }
    const spoolT = this.gear === 1 ? thrCmd : this.gear === -1 ? Math.min(P.revCap, Math.max(P.revIdle, thrCmd)) : 0;
    this.spool = lag(this.spool, spoolT, dt, spoolT > this.spool ? P.spoolUp : P.spoolDown);
    this.thr = this.gear === 1 ? this.spool : 0;
    this.rev = this.gear === -1 ? 1 : 0;
    this.trim = lag(this.trim, lean, dt, P.trimTau);
    const trim = this.trim;

    const ch = Math.cos(this.heading), sh = Math.sin(this.heading);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const cr = Math.cos(this.roll), sr = Math.sin(this.roll);

    // ---- heave / pitch / roll from the hull points ----
    const n = this.n, k = this.k, base = this.W / n;
    let fy = 0, mp = 0, mr = 0, wetN = 0, sternWet = 0, gN = 0, gFx = 0, gFz = 0;
    let sternN = 0, fImp = 0;
    for (let i = 0; i < n; i++) {
      const lx = this.px[i], lz = this.pz[i];
      const wx = this.x + ch * lx - sh * lz, wz = this.z + sh * lx + ch * lz;
      const h = sea ? sea.sample(wx, wz, t, 0, 2).height : 0;
      const dh = this.first ? 0 : (h - this.hPrev[i]) / dt;
      this.hPrev[i] = h;
      const yi = this.y + lx * sp - lz * cp * sr;
      const vyi = this.vy + lx * this.q * cp - lz * this.p * cr;
      // d is the point's immersion MEASURED FROM ITS FLOATING WATERLINE, not from the
      // surface: at rest the hull settles until the mean d is 0, so f = base + k*d is the
      // point's share of the weight plus whatever extra buoyancy it has earned. That makes
      // `f > 0` exactly the test "this point is still in the water": it fails once the point
      // has risen more than the static draft base/k = W/(rho g A_wp), which is 0.162 m on the
      // jetski and 0.131 m on the speedboat - the two figures the spec files already quote.
      //
      // ⚠️ THE CLAMP BELOW IS DEFENSIVE; THE `else` IS THE FIX (tmp-tr165, round 2). d was
      // capped ABOVE by freeboard and not at all BELOW, and `fy += f` sat OUTSIDE this guard,
      // so a point out of the water went on contributing base + k*d with d hugely negative -
      // a spring that hauled the hull back down in proportion to its height, which is suction,
      // and this file's own header says at the top that these dampers are ONE-SIDED and that
      // the hull "can leave the water on a crest (no suction)". It could not.
      //
      // Measured before the fix: a jetski hull placed 3.5 m up came back in 0.23 s having
      // reached -25 m/s, against a free fall of 0.85 s and -8.3 m/s. kHeave is 26.6 kN/m
      // against a weight of 4.3 kN, so at 3.5 m the hull was being pulled down at about 17 g.
      // The craft could not jump at all, which is most of a jet ski.
      const d = clamp(h - yi, -MAX_RISE, P.freeboard);
      let f = base + k * d;
      if (f > 0) {
        const vrel = vyi - dh;
        f += -this.c * clamp(vrel, -P.slamV, P.slamV);
        // Water entry: a panel driven into the water faster than it can
        // displace it takes 1/2 rho Cs A v^2 while it is still shallow.
        if (vrel < 0 && d < P.entryDepth) {
          const fi = 0.5 * RHO * P.slamCs * this.aSeg * Math.min(vrel * vrel, P.slamVmax * P.slamVmax)
            * (1 - Math.max(0, d) / P.entryDepth);
          f += fi; fImp += fi;
        }
        f = Math.max(0, f);
        wetN++;
        if (lx < 0) sternWet++;
      } else {
        // OUT OF THE WATER. No spring, no damper, no suction, and no pitch or roll moment
        // either: Sum f*lx over a dry hull used to come to -kPitch*sin(pitch), a restoring
        // moment that levelled the craft in mid-air. A rider holds her own attitude up there,
        // which is what pitchDampAir is for.
        f = 0;
      }
      if (lx < 0) sternN++;
      // Sand under the keel.
      if (obs) {
        const gy = obs.ground(wx, wz);
        const pen = gy - (yi - P.draft);
        if (pen > 0) {
          const fg = Math.max(0, P.kGround * pen - P.cGround * vyi);
          f += fg; gN += fg;
          const s = obs.groundSlope;          // world d(ground)/dx, d/dz
          gFx -= fg * s[0]; gFz -= fg * s[1];
        }
      }
      // >>> RAMPS
      // Ramp deck under this point. Same shape as the sand block above: a
      // one-sided spring-damper plus the surface slope taken out of the
      // horizontal. The point's own world velocity is the CG velocity plus the
      // yaw term (body (u - r*lz, v + r*lx) rotated by the heading), because a
      // hull yawing across a face has very different speeds at bow and quarter.
      {
        const bu = this.u - this.r * lz, bv = this.v + this.r * lx;
        const R = rampPoint(this.rampC, P, wx, wz, yi, vyi, ch * bu - sh * bv, sh * bu + ch * bv);
        if (R) { f += R.f; rampN += R.f; rampFx += R.fx; rampFz += R.fz; }
      }
      // <<< RAMPS
      fy += f; mp += f * lx * cp; mr -= f * lz * cr;
    }
    this.first = false;
    const wet = wetN / n;
    this.wet = wet;
    this.impact = fImp / this.W;
    this.aground = gN > 1 ? 1 : 0;
    if (wetN === 0 && gN === 0) { this.airTicks++; this.maxAir = Math.max(this.maxAir, this.airTicks); }
    else this.airTicks = 0;
    // >>> RAMPS
    // On the deck is NOT in the air: the craft is supported. Without this a ramp
    // climb would read as a 0.4 s jump to the camera, the audio and every probe,
    // and the jump that follows it would be merged into the same event.
    this.onRamp = rampN > 0 ? 1 : 0;
    if (rampN > 0) this.airTicks = 0;
    // <<< RAMPS

    // Propulsor immersion and ventilation (outboard: trimmed out, hard turns, air).
    const propWet = sternN ? Math.min(1, (sternWet / sternN) * 1.5) : 1;
    this.propWet = propWet;
    const planeT = smooth(P.uHump * 0.6, P.uPlane, au);
    const ventT = clamp((1 - propWet) * 1.5 + P.ventTrim * clamp((trim - 0.55) / 0.45, 0, 1) * planeT
      + P.ventRoll * Math.max(0, Math.abs(this.roll) - 14 * DEG) * planeT, 0, 1);
    this.vent = lag(this.vent, ventT, dt, ventT > this.vent ? 0.05 : 0.35);

    // Dynamic lift and trim, only as much as the hull is in the water.
    const lift = this.W * P.liftMax * smooth(P.uHump * 0.5, P.uPlane * 1.3, au) * wet;
    const tU = this.thrust(u);
    const thrustMag = this.gear === 1 ? tU * this.spool * (1 - P.ventLoss * this.vent)
      : this.gear === -1 ? -tU * this.spool * P.reverseFrac : 0;
    const T = thrustMag * propWet;
    const bump = Math.exp(-(((au - P.uHump * 1.05) / (P.uHump * 0.45)) ** 2));
    const tauEq = P.tauHump * (1 + P.trimHump * trim) * bump + P.tauPlane * planeT + P.tauSquat * (T / this.W)
      + trim * P.tauTrim * smooth(P.uHump * 0.5, P.uPlane, au);
    this.tauEq = tauEq;
    mp += this.kPitch * tauEq * wet;
    // Bank into the turn from the lateral acceleration actually being pulled.
    const aLat = u * this.r;
    const phiT = clamp(P.bank * aLat / G, -P.bankMax, P.bankMax);
    mr += this.kRoll * phiT * wet;

    fy += lift - this.W;
    const vy0 = this.vy;
    // ADDED MASS IS ENTRAINED WATER, so it goes away with the water (tmp-tr165 round 2).
    // Scaled by `wet` it is IDENTICAL to what it was at wet = 1, which is every floating
    // tick; the only case it changes is the airborne one, and there it has to be zero or the
    // craft falls at g/(1 + addedMass) - 8.53 m/s^2 on the jetski, 7.85 on the speedboat -
    // and every jump reads 8-13% floaty. This file already scales `lift`, the trim moment
    // and the wave-slope term by wet for the same reason.
    this.vy += (fy / (m * (1 + P.addedMass * wet))) * dt;
    this.q += (mp / this.iPitch - this.q * P.pitchDampAir * (1 - wet)) * dt;
    // PORPOISING: past the critical running trim (falls with speed) a bounded
    // negative-damping limit cycle in pitch (van der Pol), seeded so it also
    // starts on flat water.
    //
    // ⚠️ TWO GUARDS, ADDED tmp-tr165 ROUND 2, AND THE FEEL OF THE LIMIT CYCLE IS UNCHANGED.
    // Both fix an explicit-integration failure that the old one-sided-spring bug had been
    // hiding: while the hull could not leave the water it also could not pitch far from its
    // own running mean, so `osc` stayed inside a couple of amplitudes and neither guard would
    // ever have fired. With the craft free to be thrown about by a storm sea it does not.
    //
    // Caught in the act (speedboat, storm, hard turn, t = 67.7 s): pitch 4 deg against a
    // running mean of 18, and A is only 0.8 deg when porp is small, so osc reached -17 and
    // (1 - osc^2) reached -300. The damping COEFFICIENT c = porp*porpGain*(1 - osc^2) hit
    // -462 per second. Explicit Euler is stable only while |c|*dt < 2, i.e. |c| < 240 at
    // 120 Hz; past that the "damping" changes q's sign every tick and grows it. Measured:
    // q went -3.2 -> +9.2 -> -8.3 on consecutive ticks and reached 5.8e59, pitch pinned on
    // its +-0.9 rad clamp for 28,388 ticks and the boat stopped dead. This is NOT the
    // porpoising model being wrong; it is an unbounded coefficient being integrated openly.
    //
    //  (1) osc is CLAMPED to +-3 amplitudes. A real limit cycle lives at |osc| ~ 1, so inside
    //      its own working range nothing changes at all. Outside it the hull's pitch is being
    //      driven by the sea and not by porpoising, and a term that reads pitch minus its
    //      running mean has no business claiming otherwise. This alone caps |c| at 112, which
    //      is stable at 120 Hz with room to spare.
    //  (2) the damping half is integrated EXPONENTIALLY rather than openly. exp(c*dt) equals
    //      1 + c*dt to first order, so the growth side of the cycle (c <= porpGain = 12-14,
    //      exp(14/120) = 1.1246 against 1.1167) is the same curve; but no negative c can ever
    //      flip q's sign, which is the whole failure above. The kick stays additive.
    const tauC = P.porpTau0 - P.porpSlope * Math.max(0, au - P.uPlane);
    const porp = planeT * wet * clamp((tauEq - tauC) / (2 * DEG), 0, 1);
    this.porp = porp;
    if (porp > 0) {
      const A = P.porpAmp * (0.3 + 0.7 * porp);
      const osc = clamp((this.pitch - this.pitchMean) / A, -3, 3);
      this.q = this.q * Math.exp(porp * P.porpGain * (1 - osc * osc) * dt)
        + porp * P.porpKick * Math.sin(t * 2 * Math.PI * P.porpHz) * dt;
    }
    this.pitchMean = this.pitchMean == null ? this.pitch : lag(this.pitchMean, this.pitch, dt, 0.8);
    // rollDamp acts in the air too: it is the driver balancing, not the water.
    this.p += (mr / this.iRoll - this.p * P.rollDamp) * dt;
    // Structural pitch/roll damping from the same dampers (keeps it critically sane).
    this.q *= 1 - Math.min(0.5, P.pitchDamp * wet * dt);
    this.p *= 1 - Math.min(0.5, P.rollDampLin * wet * dt);

    // Vertical load factor at the CG and slam events (for camera, audio, probes).
    this.nz = (this.vy - vy0) / dt / G + 1;
    if (!this.inSlam && this.nz > P.slamEventG) {
      this.inSlam = true; this.slams++; this.slamT = t; this.slamG = this.nz;
    } else if (this.inSlam) {
      if (t - this.slamT < 0.1) this.slamG = Math.max(this.slamG, this.nz);
      if (this.nz < 1.3) this.inSlam = false;
    }

    // ---- surge / sway / yaw ----
    this._wind(sea);
    let ow = 0, sw = 0, uw = 0, vw = 0;
    if (sea) {
      const S = sea.sample(this.x, this.z, t, 0, 2);
      ow = ch * S.slopeX + sh * S.slopeZ; sw = -sh * S.slopeX + ch * S.slopeZ;
      uw = ch * S.orbX + sh * S.orbZ; vw = -sh * S.orbX + ch * S.orbZ;
    }
    const R = this.resist(au);
    const hydroScale = Math.max(wet, 0.02);
    // >>> DRAG
    // ⚠️ THE `* wet` ON THE LIFT-INDUCED TERM IS CORRECT IN THIS MODEL. IT HAS BEEN
    // QUESTIONED THREE TIMES; HERE IS THE MEASUREMENT SO IT NEED NOT BE A FOURTH (tmp-tr179).
    //
    // The objection is sound as physics: `R.hydro` bundles four terms and `hydroScale`
    // multiplies all four, but one of them - W * cPlane * tau(u), Savitsky's W tan(trim) -
    // is the price of carrying the WEIGHT, not of wetting area, and a planing hull that
    // rides drier carries the same weight on a smaller patch. Scaling THAT term by wetted
    // area would be wrong.
    //
    // `wet` is not wetted area. It is the count of hull points in the water, and in this
    // model that tracks the LIFT THE WATER IS MAKING, which is exactly what induced drag
    // should ride on. Measured two independent ways that agree to four decimals in every
    // condition - from the published load factor, carried = 1 + (nz-1)(1 + addedMass*wet),
    // and from a tree instrumented to export the hull-point force sum directly - with the
    // wedge impulse subtracted, because slamScrub already charges its horizontal share:
    //
    //   steady lift / W, one free scale per shape, 420k planing ticks per craft over
    //   9 sea / steering / throttle cases, tick-weighted RMS:
    //       phi = wet   (what this line does)   0.036 speedboat   0.072 jetski
    //       phi = 1     (the proposed fix)      0.374             0.498
    //       phi = min(1, wet/wSup)              0.180             0.156
    //
    // And the case the objection describes - a hull riding drier while carrying the same
    // weight - does not occur here. On flat water the speedboat's `wet` is 0.6667 at EVERY
    // speed from 49.8 to 77.9 km/h and the jetski's is 1.0 up to 93 km/h: `wet` is
    // quantised to 1/9 and 1/7 and does not move as the hull trims out. Where `wet` does
    // fall, in a seaway, the water genuinely is carrying less - the hull is off a crest and
    // partly falling - and the induced term should fall with it, which is what this does.
    //
    // The residual is real but tiny. steadyLift/W divided by `wet` is 1.500 on flat water
    // and 1.355-1.582 across six sea states for the speedboat (so the constant, which is
    // cPlane and is free anyway, is right to about +-6%), and 1.023 flat against 1.15-1.50
    // in a seaway for the jetski. Scaling the induced term by the measured lift instead,
    // with cPlane re-derived to hold flat water exactly, was built and measured over 40
    // paired 150 s rides per condition: flat water 0.000 km/h on both craft, seaway
    // -0.15% to -0.40% speedboat and -0.89% to -1.45% jetski. That is the whole prize, and
    // there is no seaway speed reference in this project to judge it against. Not shipped.
    //
    // For scale: in a modal seaway the induced term is 12% of the speedboat's total hull
    // resistance and `slamScrub * fImp`, four lines below, is 45-48% of it.
    // <<< DRAG
    const tr = (tauEq - P.tauOpt) / P.tauOpt;
    const trimPen = 1 + P.trimDrag * tr * tr * planeT;
    const astern = u < 0 ? P.asternDrag : 1;
    // Relative wind, body frame; frontal and side windage.
    const wxb = ch * this.windX + sh * this.windZ, wzb = -sh * this.windX + ch * this.windZ;
    const ax = wxb - u, az = wzb - this.v, aw = Math.hypot(ax, az);
    const fAeroX = P.kAero * aw * ax, fAeroZ = P.kAeroSide * aw * az;
    const drag = R.hydro * hydroScale * trimPen * astern + P.turnDrag * m * Math.abs(u * this.r) * wet
      + P.skidDrag * m * this.v * this.v * wet + P.slamScrub * fImp;
    let aF = (T - Math.sign(u) * drag + fAeroX) / (m * (1 + P.addedMassX)) - G * ow * wet;
    // Sway: keel grip grows with flow over it, on the water relative to the orbit.
    const vr = this.v - vw;
    const latK = P.latLin * (0.1 + 0.9 * smooth(0.5, 4, au));
    let aS = -(latK * vr + P.latQuad * vr * Math.abs(vr)) * hydroScale;
    const grip = P.aGrip * wet * clamp(1.15 - 0.3 * (tauEq - P.tauOpt) / P.tauOpt, 0.6, 1.2) + 0.5;
    aS = clamp(aS, -grip, grip) + (fAeroZ / m) - G * sw * wet;
    aF += P.kVisc * uw / (1 + (au / P.uHump) ** 2) / m * hydroScale;
    this.skid = Math.atan2(Math.abs(this.v), Math.max(1, au));
    // Ground: friction on sand plus the slope pushing the hull back off it.
    if (gN > 0) {
      const vx = ch * u - sh * this.v, vz = sh * u + ch * this.v;
      const sp2 = Math.hypot(vx, vz);
      let fx = gFx, fz = gFz;
      // >>> AIRFEEL
      // Sand grip, released once the beached-craft escape at the foot of step() has decided
      // she is genuinely stuck. BEACH_GRIP has to take mu below the beach's own gradient or
      // the slope can never win: the seabed runs at 0.064 and mu is 0.6 / 0.55, so a tenth
      // leaves 0.060 / 0.055 and the hull creeps seaward instead of sitting there. `beachT`
      // is 0 on every tick that is not a sustained, powered, going-nowhere grounding, and
      // the line is then character for character what it was.
      // The grip keeps falling the longer she stays stuck, exactly as _collide pushes a
      // pinned hull harder the longer THAT runs: 1.5 s -> a tenth, 3 s -> a twentieth, and a
      // floor of a fiftieth. A rider who reverses off is gone in the first step and never
      // sees the rest; one who holds the throttle at the beach - or a bot that does not know
      // to reverse - is still returned to the water instead of sitting there for the run.
      const mu = this.beachT >= 1.5
        ? P.muGround * Math.max(BEACH_GRIP_MIN, BEACH_GRIP / (this.beachT / 1.5))
        : P.muGround;
      if (sp2 > 1e-3) { fx -= mu * gN * vx / sp2; fz -= mu * gN * vz / sp2; }
      // <<< AIRFEEL
      aF += (fx * ch + fz * sh) / m;
      aS += (-fx * sh + fz * ch) / m;
      // Friction may stop the hull but never drive it backwards.
      const stopF = Math.abs(u) / dt, stopS = Math.abs(this.v) / dt;
      if (Math.sign(aF) === -Math.sign(u) && Math.abs(aF) > stopF + Math.abs(T) / m) aF = -u / dt + T / m;
      if (Math.sign(aS) === -Math.sign(this.v) && Math.abs(aS) > stopS) aS = -this.v / dt;
    }
    // >>> RAMPS
    // The deck's slope reaction and its friction, in the body frame. This is
    // what the craft PAYS for the height it gains: ride a 19 deg face and the
    // same normal force that throws you up takes tan(19) of itself out of the
    // surge. Zero without ramps, so open-water physics is untouched.
    if (rampFx !== 0 || rampFz !== 0) {
      aF += (rampFx * ch + rampFz * sh) / m;
      aS += (-rampFx * sh + rampFz * ch) / m;
    }
    // <<< RAMPS
    const nu = u + (aF + this.v * this.r) * dt;
    const nv = this.v + (aS - u * this.r) * dt;
    // Yaw: an outboard's leg steers a little with no thrust; a jet steers by its
    // nozzle, so authority follows the power actually going through the pump.
    const rMax = Math.min(au / P.rMin, P.aSteer / Math.max(au, 0.1));
    const auth = (P.steerIdle + (1 - P.steerIdle) * Math.min(1, this.spool * P.steerSpool)) * smooth(0, 1.5, au);
    const pivot = P.pivotRate * this.spool * (1 - smooth(1, 4, au));
    const sgn = u >= -0.2 ? 1 : -1;
    // Directional stability: side force on the keel/intake aft of the CG yaws
    // the bow back toward the track, so a slide is bounded instead of a spin.
    const rT = turn * (rMax * auth * sgn + pivot) + P.yawStab * this.v / P.length * smooth(1, 4, au) * sgn;
    // >>> AIRFEEL
    // IN THE AIR THE YAW RATE IS CONSERVED (tmp-tr174).
    //
    // `Math.max(wet, 0.05)` put a floor under the yaw lag so that a hull with NOTHING
    // under it still crept 5% of the way toward whatever the handlebars were asking
    // for. That is steering with no water for the pump to push against. Measured on
    // the stunt course, it cost a jump about a fifth of the rotation it left the ramp
    // with (21.2 deg/s off the crest, 16.9 deg/s at touchdown over 1.73 s) and, worse,
    // it let a rider add rotation in mid-air by holding the wheel over - which is the
    // button-holding this pass exists to remove. Airborne, angular momentum is
    // conserved: whatever the rider carved onto the face is what she lands with.
    //
    // ⚠️ PROVABLY INERT WHILE ANY PART OF THE HULL IS IN THE WATER. `this.airTicks` is
    // set ~160 lines above from the model's OWN test - it is incremented only when
    // `wetN === 0 && gN === 0`, and cleared again immediately if `rampN > 0`. So
    // `airTicks > 0` is false whenever any hull point is in the water, whenever any
    // point is on sand, and whenever any point is on a ramp deck; in all three cases
    // yawGrip is `Math.max(wet, 0.05)`, character for character the old expression.
    // The raid, the rescue, the smuggling run and all of the free world are water-borne
    // or aground on every tick that steers, so none of them can observe this.
    const yawGrip = this.airTicks > 0 ? 0 : Math.max(wet, 0.05);
    this.r += (rT - this.r) * Math.min(1, dt / P.tauYaw) * yawGrip;
    // <<< AIRFEEL
    this.u = nu; this.v = nv;
    // Engine speed (0 idle .. 1 rated, >1 over-rev): load holds it down at the
    // hole shot, ventilation or air unloads it to the limiter.
    const load = (P.holeRpm + (1 - P.holeRpm) * smooth(0, P.uRated, au)) * (1 - this.vent) + 1.08 * this.vent;
    this.load = 1 - this.vent;
    const rpmT = this.gear === 0 ? Math.min(0.12, thrCmd * 0.12) : this.spool * load;
    this.rpm = lag(this.rpm, rpmT, dt, rpmT > this.rpm ? (this.vent > 0.5 ? 0.12 : P.rpmUp) : P.rpmDown);

    // ---- integrate pose, with the obstacle wall ----
    const ox = this.x, oz = this.z, oh = this.heading;
    this.heading += this.r * dt;
    const c2 = Math.cos(this.heading), s2 = Math.sin(this.heading);
    this.x += (c2 * this.u - s2 * this.v) * dt;
    this.z += (s2 * this.u + c2 * this.v) * dt;
    this.y += this.vy * dt;
    this.pitch = clamp(this.pitch + this.q * dt, -0.9, 0.9);
    this.roll = clamp(this.roll + this.p * dt, -0.8, 0.8);
    // >>> SPINCTRL
    // THE AIR SPIN ASSIST. src/air-spin.js has the derivation; this is the whole of its
    // effect on the model, and it is four lines.
    //
    // ⚠️ IT RETURNS EXACTLY 0 UNLESS `this.airTicks > 0`, which is the model's own airborne
    // test - set ~200 lines above from `wetN === 0 && gN === 0` and cleared again the moment
    // `rampN > 0`. So on every tick that any hull point is in the water, on sand, or on a
    // ramp deck, `dPsi` is 0, this whole block is a compare and a branch, and the tick is
    // character for character the tick that was here before. The raid, the rescue, the
    // smuggling run and all of the free world steer on water-borne ticks.
    //
    // ⚠️ IT IS PLACED AFTER THE POSITION INTEGRATION ON PURPOSE. The translation above used
    // this tick's heading with this tick's (u, v), which is consistent; the spin then turns
    // the craft and counter-rotates (u, v) by the SAME angle, so the world velocity handed
    // to the next tick is unchanged and the parabola is undisturbed. Put before the
    // integration it would translate the craft along a heading its velocity had not been
    // rotated into, and every spin would become a swerve.
    //
    // It writes `heading`, `u` and `v` and nothing else. In particular it does NOT write
    // `r`: the yaw rate tmp-tr174 conserves goes on integrating into `heading` underneath
    // this, the two add, and the hull touches down with the yaw rate the physics gave it.
    //
    // ⚠️ AND IT IS GATED ON THE LAUNCH, NOT ONLY ON BEING AIRBORNE. `this.onRamp` is passed
    // so the assist can latch whether the last supported tick had a ramp deck under it;
    // ungated it rewrote free riding, and air-spin.js carries the measurement. `RAMPS` is
    // empty outside the stunt stage, so `onRamp` is 0 on every tick of every other level and
    // this call returns 0 there for a second, independent reason.
    const dPsi = this.airSpin.step(turn, dt, this.airTicks > 0, this.onRamp > 0);
    if (dPsi !== 0) {
      this.heading += dPsi;
      const cs = Math.cos(dPsi), sn = Math.sin(dPsi);
      const u2 = this.u * cs + this.v * sn;
      this.v = -this.u * sn + this.v * cs;
      this.u = u2;
    }
    // <<< SPINCTRL
    // >>> AIRTRIM
    // THE AIR TRIM ASSIST. src/air-trim.js has the derivation; this is the whole of its effect
    // on the model, and it is three lines.
    //
    // ⚠️ IT RETURNS EXACTLY 0 UNLESS `this.airTicks > 0`, which is the model's own airborne
    // test - set ~200 lines above from `wetN === 0 && gN === 0` and cleared again the moment
    // `rampN > 0`. So on every tick that any hull point is in the water, on sand, or on a ramp
    // deck, `dPit` is 0, this whole block is a compare and a branch, and the tick is character
    // for character the tick that was here before. The raid, the rescue, the smuggling run and
    // all of the free world are water-borne or aground on every tick that trims.
    //
    // ⚠️ AND IT IS GATED ON THE LAUNCH, NOT ONLY ON BEING AIRBORNE, for the same reason the
    // spin above is: `RAMPS` is empty outside the stunt stage, so `onRamp` is 0 on every tick
    // of every other level and this call returns 0 there for a second, independent reason.
    //
    // It writes `pitch` and nothing else. In particular it does NOT write `q`: `pitchDampAir`
    // goes on acting on the rate the crest gave the hull, the two add, and the hull touches
    // down with the pitch RATE the physics gave it even though the rider chose the ANGLE.
    // The clamp is hull.js's own +-0.9 rad, re-applied here rather than widened.
    const dPit = this.airTrim.step(lean, dt, this.airTicks > 0, this.onRamp > 0);
    if (dPit !== 0) this.pitch = clamp(this.pitch + dPit, -0.9, 0.9);
    // <<< AIRTRIM
    if (obs) {
      // LAST RESORT: a hull pinned for 2 s (wedged under the pier head, or held against a leg by
      // a moored longship) stops colliding with the fixed world until its outline is clear again,
      // so the player can always drive out. The game is never winnable by hiding inside the pier:
      // the ghost ends the moment nothing is blocked, and it costs the speed cap below.
      this.ghost = this.pinT >= 2 && this.time - (this.touchT ?? -9) < 1.6;
      if (this.ghost) { this.u = clamp(this.u, -4, 4); this.v = clamp(this.v, -4, 4); }
      else this._collide(obs, ox, oz, oh, t);
      // PINNED-BOAT ESCAPE (2026-09-17, the owner got stuck beside the pier and could not move).
      // How long the hull has been commanded but effectively motionless against the wall; _collide
      // pushes harder the longer this runs, and a pinned hull ignores moving obstacles so a moored
      // longship cannot hold it against the pier. Zero without obstacles, so open-water physics is
      // untouched.
      // Net progress over half a second, not per-tick movement: a hull that jitters 5 cm against
      // a leg every tick is just as stuck as one frozen solid, and the nudge itself would keep
      // resetting a per-tick timer.
      // A boat under power covers far more than 3 m in 1.5 s; less than that, in contact, means it
      // is wedged or circling in a pocket - both are "stuck" to the player.
      if (!this.pinRef) this.pinRef = { x: this.x, z: this.z, t: this.time };
      if (this.time - this.pinRef.t >= 1.5) {
        const net = Math.hypot(this.x - this.pinRef.x, this.z - this.pinRef.z);
        const wants = thrCmd > 0.05 || Math.abs(this.r) > 0.05;
        // A hull whose move is undone every tick ends the tick OUTSIDE the wall, so "am I
        // overlapping?" never catches it: what matters is that it kept HITTING something
        // (touchT, set in _collide) and got nowhere.
        const touched = this.time - (this.touchT ?? -9) < 1.6;
        this.pinT = (wants && net < 3 && touched) ? this.pinT + 1.5 : 0;
        this.pinRef = { x: this.x, z: this.z, t: this.time };
      }
    }
    // >>> AIRFEEL
    // BEACHED-CRAFT ESCAPE (tmp-tr174). Same shape as the PINNED-BOAT ESCAPE above and for
    // the same class of fault: a state the player cannot drive out of.
    //
    // THE FAULT, measured on tmp-tr174/base. A craft driven up the beach settles at the
    // waterline - ground 0.00 m, hull 0.32 m - and the sea then runs over her stern and back
    // off it with every wave. Thrust is `thrustMag * propWet`, and propWet is the fraction of
    // the STERN points the water spring has wetted, so in every trough it is 0 and the engine
    // delivers nothing at all. On a crest it briefly reaches 1.00 and she twitches forward
    // (1.24 m/s was the best single tick observed), and then the sand takes it straight back.
    // Net result, driving at the beach from 120 m out on the modal sea:
    //     speedboat  aground at 13.1 s, NEVER free in the next 90 s on ANY of five escape
    //                inputs (ahead, astern, astern + hard over, rocking, ahead + hard over),
    //                stationary 99-100% of the time
    //     jetski     aground at 9.2 s, free only on full astern and only after 44.7 s
    //
    // THE FIX IS NOT EXTRA THRUST. A pump or a leg clear of the water really does make none,
    // and faking it would be a lie told in the one place the engine audio reads from. What is
    // missing is the rest of what a rider does: she rocks the hull and breaks the sand's grip.
    // So `beachT` below releases the GRIP, and the beach's own down-slope reaction - already
    // computed, already applied, and always pointing seaward because the beach slopes that way
    // - is what takes her off. She leaves under gravity and the waves, which is how a boat
    // actually comes off a beach.
    //
    // ⚠️ NOT observable anywhere else, by construction: it needs `aground` (a ground normal
    // force, which only the beach and the seabed produce), a throttle command, AND under 3 m
    // of net progress in 1.5 s. A hull sliding through the shallows under way moves far more
    // than that, so obstacles.js's "a boat can ground in the shallows and slide but can never
    // be driven up the beach" still holds - the released grip only ever lets the slope push
    // her DOWN the beach, never up it.
    //
    // ⚠️ `vent`, `propWet` and `airTicks` are untouched by all of this - not renamed, not
    // rescaled, not written to. The engine audio still hears a beached craft free-revving with
    // its propulsor out of the water, because that is what is happening.
    if (!this.beachRef) this.beachRef = { x: this.x, z: this.z, t: this.time };
    if (this.time - this.beachRef.t >= 1.5) {
      const net = Math.hypot(this.x - this.beachRef.x, this.z - this.beachRef.z);
      this.beachT = (this.aground > 0 && thrCmd > 0.05 && net < 3) ? this.beachT + 1.5 : 0;
      this.beachRef = { x: this.x, z: this.z, t: this.time };
    }
    // <<< AIRFEEL
    // >>> RAID
    if (this.dyn && !(this.pinT > 0.8)) this._collideDyn(t);
    // <<< RAID

    // Never NaN: a non-finite state is put back on the water at rest.
    if (!(Number.isFinite(this.x) && Number.isFinite(this.z) && Number.isFinite(this.y) &&
      Number.isFinite(this.u) && Number.isFinite(this.v) && Number.isFinite(this.heading) &&
      Number.isFinite(this.pitch) && Number.isFinite(this.roll) && Number.isFinite(this.vy) &&
      Number.isFinite(this.rpm) && Number.isFinite(this.q) && Number.isFinite(this.r))) {
      const x0 = Number.isFinite(ox) ? ox : 0, z0 = Number.isFinite(oz) ? oz : 0;
      const nt = this.nanTrips + 1;
      this.reset(x0, z0, Number.isFinite(oh) ? oh : 0, sea, t);
      this.pitchMean = 0;
      this.nanTrips = nt;
    }
    this.ticks++;
    this.time = t + dt;
  }

  // >>> RAID
  // Dynamic obstacles (tr57, Viking raid): moving capsules {id, x, z, heading, half, r, vx, vz, e}
  // the hull bounces off - push out along the contact normal, reflect the velocity relative to
  // the obstacle (restitution e), scrape, yaw kick from the lever arm; each contact is pushed to
  // dynHits for the raid to read. setDynamic(null) is the default: step() never calls this.
  setDynamic(list) { this.dyn = list && list.length ? list : null; if (!this.dynHits) this.dynHits = []; }

  _collideDyn(t) {
    const o = this.outline;
    for (const d of this.dyn) {
      const reach = d.half + d.r + this.P.length;
      if ((this.x - d.x) ** 2 + (this.z - d.z) ** 2 > reach * reach) continue;
      const ax = Math.cos(d.heading), az = Math.sin(d.heading);
      const ch = Math.cos(this.heading), sh = Math.sin(this.heading);
      let pen = 0, nx = 0, nz = 0, lx = 0, lz = 0;
      for (let i = 0; i < o.length; i += 2) {
        const px = ch * o[i] - sh * o[i + 1], pz = sh * o[i] + ch * o[i + 1];
        const wx = this.x + px - d.x, wz = this.z + pz - d.z;
        const s = clamp(wx * ax + wz * az, -d.half, d.half);
        const ex = wx - ax * s, ez = wz - az * s, e = Math.hypot(ex, ez);
        const p = d.r - e;
        if (p > pen) { pen = p; if (e > 1e-6) { nx = ex / e; nz = ez / e; } else { nx = -az; nz = ax; } lx = px; lz = pz; }
      }
      if (pen <= 0) continue;
      this.x += nx * pen; this.z += nz * pen;
      let vx = ch * this.u - sh * this.v, vz = sh * this.u + ch * this.v;
      const vn = (vx - d.vx) * nx + (vz - d.vz) * nz;
      if (vn >= 0) continue;
      const sp0 = Math.hypot(vx, vz);
      vx -= (1 + d.e) * vn * nx; vz -= (1 + d.e) * vn * nz;
      const vt = (vx - d.vx) * -nz + (vz - d.vz) * nx;
      vx -= 0.25 * vt * -nz; vz -= 0.25 * vt * nx;
      this.r = clamp(this.r + (lx * nz - lz * nx) * -vn * 0.12, -2, 2);
      this.u = ch * vx + sh * vz; this.v = -sh * vx + ch * vz;
      // >>> RAMPS
      // A DYNAMIC COLLISION NOW REACHES THE IMPACT CAMERA. It never has.
      // view3d.js `boatEvents` rings the shake off `hits` / `lastHitSpeed`, and
      // until this line only `_collide` - the FIXED-world path, pier legs and the
      // shore - ever wrote them. Every published capsule goes through HERE, so
      // ramming a longship, a brig or a channel mark produced no camera impact at
      // all, on any hull, since the raid was built. Found and measured by the
      // BUOYS builder on two separate trees (tmp-tr171/RESULT.md section 4:
      // jetski into a longship, `hull.hits` reads 0); the fix belongs to this
      // file, which is why it is here and not there.
      //
      // SAME RULE, SAME MEANING, ONE INSTRUMENT. `-vn` is the closing speed, and
      // here it is closing speed RELATIVE TO THE OBSTACLE - which is what a moving
      // ship deserves and is already what `speed` on the dynHits record below
      // means. The "one impact per contact" debounce is `_collide`'s own and is
      // deliberately SHARED with it, so a hull scraping a pier leg while a
      // longship shoves it counts once, not twice. Nothing outside hull.js writes
      // these two fields: raid/collide.js and raid/buoy-collide.js were both left
      // without a private route into the camera precisely so that fixing it here
      // could not double-count.
      if (this.hits === 0 || t - this.lastHit > 0.5) { this.hits++; this.lastHitSpeed = -vn; }
      this.lastHit = t;
      // <<< RAMPS
      this.dynHits.push({ id: d.id, nx, nz, speed: -vn, craftSpeed: sp0, x: this.x + lx, z: this.z + lz, t });
    }
  }
  // <<< RAID

  // Undo a move that puts any outline point into a blocked cell, and take the
  // velocity into the obstacle out (restitution 0.2, 15% scrape loss).
  _collide(obs, ox, oz, oh, t) {
    const hit = this._outlineHit(obs, this.x, this.z, this.heading);
    if (!hit) return;
    this.touchT = t;                                  // last contact with the fixed world (pin escape)
    let nx = this.x - hit.x, nz = this.z - hit.z;
    const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    const ch = Math.cos(this.heading), sh = Math.sin(this.heading);
    let vx = ch * this.u - sh * this.v, vz = sh * this.u + ch * this.v;
    const vn = vx * nx + vz * nz;
    if (vn < 0) {
      // One impact per contact: pressing on against a leg is not a new hit.
      if (this.hits === 0 || t - this.lastHit > 0.5) { this.hits++; this.lastHitSpeed = -vn; }
      this.lastHit = t;
      vx -= 1.2 * vn * nx; vz -= 1.2 * vn * nz;
      vx *= 0.85; vz *= 0.85;
    }
    // SLIDE, DON'T FREEZE (2026-09-17). Undoing the whole move on any contact pinned the hull:
    // once a leg (or a longship pushing it in) put one outline point in a blocked cell, every
    // later move was undone too - position AND heading identical every frame, and the player
    // could not drive out. Now the move is projected onto the wall's tangent, then the rotation
    // is given up, and only if both are still blocked is the pose reverted with a push-out that
    // grows while pinT says the hull is stuck.
    const dx = this.x - ox, dz = this.z - oz;
    const tx = -nz, tz = nx, dtan = dx * tx + dz * tz;
    const sx = ox + tx * dtan, sz = oz + tz * dtan;
    const was = this._outlineHit(obs, ox, oz, oh);
    this.r *= 0.3;
    if (!this._outlineHit(obs, sx, sz, this.heading)) {
      this.x = sx; this.z = sz;                                  // slid along the wall, kept the turn
    } else if (!this._outlineHit(obs, sx, sz, oh)) {
      this.x = sx; this.z = sz; this.heading = oh;               // the rotation was what fouled
    } else {
      const push = this.pinT > 0.8 ? 0.30 : 0.06;
      const px = ox + nx * push, pz = oz + nz * push;
      const still = this._outlineHit(obs, px, pz, oh);
      const better = !still || !was || still.n < was.n;          // fewer points inside = progress
      this.x = better ? px : ox; this.z = better ? pz : oz; this.heading = oh;
      // Deeply inside (pushed under the pier head by a longship, or the outline's blocked
      // centroid sits on the hull so the normal is degenerate): there is no "out" direction to
      // push along, so look for one. Sixteen bearings x three ranges, nearest free pose wins,
      // capped at 2 m a tick and only once the hull has been pinned for a while. Deterministic.
      if (!better && this.pinT >= 1.0) {
        let done = false;
        const reach = this.pinT >= 3 ? 6 : 2;                    // under the pier head, 2 m is not enough
        for (let step = 0.5; step <= reach && !done; step += 0.75) {
          for (let k = 0; k < 16 && !done; k++) {
            const a = k * Math.PI / 8;
            const ex = this.x + Math.cos(a) * step, ez = this.z + Math.sin(a) * step;
            const h3 = this._outlineHit(obs, ex, ez, oh);
            if (!h3 || (was && h3.n < was.n)) {
              this.x = ex; this.z = ez;
              if (!h3) { this.u = Math.max(this.u, 0); this.pinT = 0; }
              done = true;
            }
          }
        }
      }
    }
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    this.u = c * vx + s * vz; this.v = -s * vx + c * vz;
  }

  _outlineHit(obs, x, z, h) {
    const ch = Math.cos(h), sh = Math.sin(h), o = this.outline;
    let n = 0, sx = 0, sz = 0;
    for (let i = 0; i < o.length; i += 2) {
      const wx = x + ch * o[i] - sh * o[i + 1], wz = z + sh * o[i] + ch * o[i + 1];
      if (obs.blocked(wx, wz)) { n++; sx += wx; sz += wz; }
    }
    return n ? { x: sx / n, z: sz / n, n } : null;
  }
}

// Dense outline samples (<= step apart) round a closed polygon in the hull's
// CG frame, so a 0.7 m pier leg can never slip between two of them.
function buildOutline(poly, step) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length];
    const segs = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let s = 0; s < segs; s++) {
      const f = s / segs;
      out.push(ax + (bx - ax) * f, az + (bz - az) * f);
    }
  }
  return new Float64Array(out);
}
