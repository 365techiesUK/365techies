// THE SEA - Gerstner sum-of-sines, CPU sampler side.
//
// SPEC section 3, the key engineering decision: "Gerstner sum-of-sines. Not
// FFT. The foil's ride-height loop runs at 120 Hz and needs surface height,
// normal AND sub-surface orbital velocity at the wing (~0.75 m down) every
// substep. FFT gives you a texture, not a formula."
//
// And the non-negotiable rule: ONE WAVE TABLE. The component arrays below are
// the only wave table in the program. src/sea-state.js fills them; the CPU
// sampler in this file reads them; src/sea-glsl.js emits the shader that reads
// them through packUBO(). There is no second array to drift.
//
// ---------------------------------------------------------------------------
// COORDINATES AND CONVENTIONS
// ---------------------------------------------------------------------------
//   +X = east   +Z = south   +Y = up            world metres
//   heading h (rad): direction of travel = (cos h, sin h) in (X, Z). h = 0 is +X
//   depth d: positive DOWNWARDS from mean water level. decay = exp(-k*d)
//   compass bearing B (0 = N, 90 = E) -> unit direction (sin B, -cos B)
//
// Sea state direction is meteorological ("from"), so the direction of TRAVEL is
// dirFromDeg + 180. The default 191 deg gives travel toward 11 deg =
// (0.19081, -0.98163) - i.e. a short chop running up the beach from the
// south-south-west, which is what Poole Bay actually does.
//
// ---------------------------------------------------------------------------
// DOCUMENTED TOLERANCES  (SPEC section 3: "a documented tolerance, not a bug")
// ---------------------------------------------------------------------------
// 1. lambda < 1.5 m is ABSENT FROM PHYSICS. On the default Poole Bay state that
//    band is 0.29% of the variance but ~65% of the surface slope. A 1.63 m board
//    and a 0.15 m^2 wing do not respond to 40 cm ripples, so the physics loop
//    runs on the 8 longest components and the renderer runs on all 32 plus
//    tiled detail normals. Height agrees; fine slope deliberately does not.
//
// 2. The wing is sampled at the hull's (x, z), not at x - mast*sin(pitch)
//    (~0.12 m aft at full lean). About 0.7 cm of height error at default
//    steepness - below the 3.35 cm rms residual the foil already sees.
//
// 3. Orbital velocity uses the UNCLAMPED a*omega while horizontal displacement
//    uses Q*a. Identical while Q = 1, which is every preset up to
//    'fresh-sw-breeze'. Q < 1 is an anti-looping rendering device, not physics,
//    so it is deliberately kept out of the velocity field.
//
// 4. DEEP WATER ONLY: omega^2 = g*k, decay = exp(-k*d), no shoaling. Poole Bay
//    400 m out is h ~ 5-8 m and the modal lambda is 25 m, which is genuinely
//    intermediate depth - so this is a real omission, not a cosmetic one. It is
//    kept behind the single function decay(k, depth) below so that swapping to
//    cosh/sinh is a local change.
//
// 5. Stokes drift (0.029 m/s at the surface, 0.011 m/s at the wing on the
//    default state) is NOT modelled. Written down here so it is not later
//    rediscovered as mysterious downwind creep.
//
// Node-safe: no DOM, no WebGL, no clock read, no unseeded randomness.
// tools/gate-check.mjs imports this transitively and must keep working.

import {
  MAX_WAVES, N_PHYS, N_VERTEX, G, TWO_PI, INV_TWO_PI,
  SEA_PRESETS, DEFAULT_PRESET, DEFAULT_SEED, seedFromDate,
  resolveState, buildWaveTable, zeroWaveTable, hashWaveTable,
} from './sea-state.js';
import { SEA_GLSL, packWaveUBO, UBO_FLOATS } from './sea-glsl.js';
import {
  SURF, surfSample, makeSurfSlot, setFactor, surfTimePhase, surfBed,
} from './sea-surf.js';

export {
  MAX_WAVES, N_PHYS, N_VERTEX, G,
  SEA_PRESETS, DEFAULT_PRESET, DEFAULT_SEED, seedFromDate, UBO_FLOATS,
  SURF, setFactor, surfTimePhase, surfBed,
};

// Deep-water depth decay. Tolerance 4 lives here and nowhere else: replacing
// this one function with cosh(k*(h-d))/cosh(k*h) is the whole shoaling change.
function decay(k, depth) {
  return Math.exp(-k * depth);
}

// ---------------------------------------------------------------------------
// OPEN-SEA TRANSFORM (tmp-tr131). OPT-IN, DEFAULT OFF.
//
//   ?sea=depth   solve the table's wavenumbers from the FULL dispersion
//                relation at the course depth instead of the deep-water one
//   ?sea=crest   narrow the realised directional spread about its own energy
//                -weighted mean, so the sea reads as a train rather than a
//                criss-cross
//   ?sea=depth,crest   both
//
// WHY OFF. Both rewrite the ONE wave table in place, before the hash is taken,
// and both therefore move SEA_TABLE_HASH_POOLE - and `depth` also moves
// REFERENCE_POOLE.lambda / .k. Those three constants live in src/sea-state.js,
// which is outside this builder's fence, so the changes ship behind a flag with
// the measurement and the replacement numbers rather than as a fait accompli.
// tmp-tr131/RESULT.md has both, in the house style.
//
// WHY IT IS STILL ONE TABLE. The transform runs inside setState(), on the very
// arrays buildWaveTable() just filled, before _hash is computed and before any
// sampler or packUBO() can read them. There is no second table and no second
// wave loop: the CPU sampler, the emitted GLSL and the physics all read the
// transformed arrays, exactly as they read the untransformed ones.
// ---------------------------------------------------------------------------
const SEA_OPT = (() => {
  let s = '';
  try {
    if (typeof process !== 'undefined' && process.env && process.env.SEA_OPT) {
      s = process.env.SEA_OPT;
    } else if (typeof location !== 'undefined' && location && location.search) {
      s = new URLSearchParams(location.search).get('sea') || '';
    }
  } catch (e) { s = ''; }
  const f = new Set(String(s).split(',').map((v) => v.trim()).filter(Boolean));
  return Object.freeze({ depth: f.has('depth'), crest: f.has('crest') });
})();

// The depth the course actually sits in. The existing shoreface law in
// sea-surf.js, bedBase(d) = 0.155 d^(2/3) blended to 0.2792 sqrt(d), puts
// 5.58 m of water 400 m offshore, which is where the open-water part of the
// course is. MEASURED consequence of pretending that is deep water
// (tmp-tr131/m1.mjs), component by component at h = 5.58 m:
//
//   i   lambda deep   lambda true   error    k*h
//   0     33.124 m      28.090 m    +17.9%   1.25
//   1     25.917 m      23.443 m    +10.6%   1.50
//   2     22.723 m      21.137 m     +7.5%   1.66
//   3     18.234 m      17.574 m     +3.8%   2.00
//   4     10.536 m      10.509 m     +0.3%   3.34
//   5-7   unchanged to 4 dp                  >= 6.9
//
// Celerity carries the same error (c = omega/k and omega is untouched), so the
// longest wave on the default Poole Bay sea travels 7.19 m/s when it should
// travel 6.10 m/s. Closer in it is far worse: 39% at 150 m out, 58% at 80 m.
const H_REF = 5.58;

// Newton on g k tanh(k h) = omega^2, fixed iteration count for the same
// determinism reason the Newton inversion below has one.
function kFinite(omega, h) {
  const w2 = omega * omega;
  const kh0 = w2 * h / G;
  let kh = kh0 / Math.sqrt(Math.tanh(kh0));
  if (!(kh > 0)) kh = 1e-3;
  for (let i = 0; i < 6; i++) {
    const th = Math.tanh(kh);
    const f = G * kh * th / h - w2;
    const df = G * (th + kh * (1 - th * th)) / h;
    kh -= f / df;
    if (!(kh > 1e-9)) kh = 1e-9;
  }
  return kh / h;
}

// How much of the realised spread to keep. MEASURED on the shipped table
// (tmp-tr131/m1.mjs): the energy-weighted circular spread is 31.7 deg at EVERY
// tier, and the along-crest / cross-crest correlation-length ratio of the
// resulting surface is 1.47 - i.e. the crests are barely longer than they are
// wide. The owner's own frame dji_fly_20250928_163832_0021 at t = 15 s gives
// 5.27 in image space for the near-field water (perspective inflates that, so
// it is an upper bound, but 1.47 is below any reading of it). 0.694 takes 31.7
// to 22.0 deg, which is the middle of the 20-25 deg a fetch-limited wind sea
// carries at its peak.
const CREST_NARROW = 0.694;

// A slot object. FOUR of them, ownership fixed:
//   0  plant.js  surface query (also the post-integration re-sample, and DOWN)
//   1  plant.js  wing query at depth
//   2  render.js the side-on instrument, per column per frame
//   3  src/gl/*  the WebGL renderer, per frame, outside the tick
//
// Every field is declared HERE, in the literal. Adding a field later is a
// hidden-class transition on every tick, and the plant samples twice per
// substep at 120 Hz. Two slots existed in the flat stub for exactly this
// reason: a shared object silently aliases the surface answer into the wing
// answer, and flat water hides that bug completely.
function makeSlot() {
  return {
    height: 0,    // m, world Y of the displaced surface at (x, z)
    slopeX: 0,    // dy/dx, Eulerian, of the displaced surface
    slopeZ: 0,    // dy/dz
    orbX: 0,      // m/s, orbital velocity, world +X, at `depth`
    orbY: 0,      // m/s, world +Y (up)
    orbZ: 0,      // m/s, world +Z
    nx: 0, ny: 1, nz: 0,   // unit surface normal
    jac: 1,       // horizontal Jacobian. < 0.35 = whitecap. <= 0 = looping.
    x0: 0, z0: 0, // the resolved undisplaced (Lagrangian) coordinate

    // ---- SURF (tmp-tr71) --------------------------------------------------
    // The shoaling train from src/sea-surf.js, already folded into height /
    // slope / orb above. These are the SEPARATE read-outs a rider needs: how
    // hard this patch is breaking, how much whitewater is on it, how fast the
    // wave itself is travelling (what you have to match to catch it) and how
    // deep the water is. Declared HERE, in the literal, for the hidden-class
    // reason the rest of this object exists.
    surfBrk: 0,    // 0..1, breaking
    surfFoam: 0,   // 0..1, whitewater coverage
    surfC: 0,      // m/s, local wave celerity
    surfH: 0,      // m, still-water depth over the bed INCLUDING the banks
    surfAmp: 0,    // m, local surf-train amplitude
    surfEta: 0,    // m, the train's own contribution to `height`

    // TRANSITIONAL, remove once plant.js/render.js are on the 5-argument API
    // (Builder 3). The pre-Gerstner sampler returned { height, slope, orbU,
    // orbW }; keeping the three aliases in the literal keeps the existing
    // longitudinal call sites alive on a flat sea without a hidden-class
    // transition. They are written on both paths so they can never go stale.
    slope: 0, orbU: 0, orbW: 0,
  };
}

export class Sea {
  constructor() {
    // ---- THE ONE WAVE TABLE ------------------------------------------------
    // Parallel Float64Arrays, allocated once. setState() fills them in place.
    // There is no array of component objects, anywhere, deliberately.
    this.k = new Float64Array(MAX_WAVES);       // rad/m
    this.omega = new Float64Array(MAX_WAVES);   // rad/s, = sqrt(G*k)
    this.amp = new Float64Array(MAX_WAVES);     // m
    this.phase = new Float64Array(MAX_WAVES);   // rad, [0, 2pi)
    this.dx = new Float64Array(MAX_WAVES);      // unit direction, world +X
    this.dz = new Float64Array(MAX_WAVES);      // unit direction, world +Z
    this.Q = new Float64Array(MAX_WAVES);       // steepness; exactly 0 on tier 2
    this.lambda = new Float64Array(MAX_WAVES);  // m, 2pi/k

    this._n = 0;          // 0 when flat, else MAX_WAVES
    this._nPhys = 0;      // 0 when flat, else N_PHYS
    this._tide = 0;
    this._name = 'flat';
    this._seed = DEFAULT_SEED;
    this._hash = '00000000';
    this._qGlobal = 0;

    this._slots = [makeSlot(), makeSlot(), makeSlot(), makeSlot()];

    // ---- SURF (tmp-tr71) ---------------------------------------------------
    // The wave-height control the owner asked for. 1 = the modelled Bournemouth
    // bank (1.15 m over the bar); 0 turns the whole surf field off and restores
    // the pre-tmp-tr71 sea exactly. It is NOT part of the wave table and does
    // not touch the table hash.
    this._surfCtl = 1;
    this._surfOut = makeSurfSlot();

    // ---- two-call cache ---------------------------------------------------
    // The plant calls sample() twice per substep at the same (x, z, t) and two
    // different depths. A hit skips the 3-iteration Newton inversion entirely
    // and costs N_PHYS exponentials. ONE cache, not one per slot.
    //
    // Correctness rule: a hit must produce BYTE-IDENTICAL output to a miss, or
    // determinism dies. That is enforced structurally - _solve() writes only
    // into these fields, _finish() reads only from them, and both paths run the
    // same _finish().
    this._ckx = NaN; this._ckz = NaN; this._ckt = NaN;
    this._S = new Float64Array(N_PHYS);
    this._C = new Float64Array(N_PHYS);
    this._H = 0; this._Ex = 0; this._Ez = 0;
    this._Jxx = 0; this._Jzz = 0; this._Jxz = 0;
    this._x0 = 0; this._z0 = 0;
  }

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  get isFlat() { return this._n === 0; }
  get nActive() { return this._n; }
  get nPhys() { return this._nPhys; }
  get stateName() { return this._name; }
  get seed() { return this._seed; }
  get tableHash() { return this._hash; }
  get tide() { return this._tide; }
  get qGlobal() { return this._qGlobal; }
  get surfCtl() { return this._surfCtl; }

  // THE WAVE-HEIGHT CONTROL. Scales the surf train only; the deep-water table,
  // its hash and the open sea are untouched. 0 restores the pre-surf sea bit
  // for bit, which is what makes "the settled sea has not moved" provable by
  // ablation rather than by assertion (?surf=0 in the browser).
  setSurf(ctl) {
    const v = Number(ctl);
    this._surfCtl = Number.isFinite(v) ? (v < 0 ? 0 : v > 3 ? 3 : v) : 1;
    return this;
  }

  // Set/lull and the wrapped time phase, for the renderer's uniforms. Both are
  // closed forms of t, so the GPU cannot drift from the CPU.
  surfUniforms(t) { return { phase: surfTimePhase(t), set: setFactor(t), ctl: this._surfCtl }; }

  // Builds the table IN PLACE. Never called from a tick, never from reset(),
  // never from restart() - a rebuilt table is a different sea, and SPEC section
  // 5's "state reset, never a scene reload" means falling off must not restart
  // the ocean.
  //
  // A newly constructed Sea is FLAT (SPEC section 8: the v1 kill gate runs on
  // one flat grey plane). The wave table only exists after an explicit call.
  setState(state, seed) {
    const { spec, name } = resolveState(state);
    this._seed = (seed === undefined ? DEFAULT_SEED : seed) | 0;
    this._name = name;

    if (spec === null) {
      zeroWaveTable(this);
      this._n = 0; this._nPhys = 0; this._tide = 0; this._qGlobal = 0;
      this._hash = hashWaveTable(this, 0);
    } else {
      const r = buildWaveTable(this, spec, this._seed);
      this._n = r.nActive; this._nPhys = r.nPhys;
      this._tide = r.tide; this._qGlobal = r.qGlobal;
      // The open-sea transform, BEFORE the hash - see SEA_OPT above.
      if (SEA_OPT.depth || SEA_OPT.crest) this._qGlobal = this._transform();
      this._hash = hashWaveTable(this, this._n);
    }

    // Any cached inversion belongs to the old table.
    this._ckx = NaN; this._ckz = NaN; this._ckt = NaN;
    return this;
  }

  // -------------------------------------------------------------------------
  // The open-sea transform, in place, on the one table. Returns the re-derived
  // global steepness factor. Never called unless a ?sea= flag asked for it.
  // -------------------------------------------------------------------------
  _transform() {
    const n = MAX_WAVES;
    if (SEA_OPT.depth) {
      // omega is set by the JONSWAP spectrum and does not move; only the
      // wavenumber does. That is the point: the PERIOD of every component is
      // measured, the WAVELENGTH was assumed.
      for (let i = 0; i < n; i++) {
        if (!(this.omega[i] > 0)) continue;
        const k = kFinite(this.omega[i], H_REF);
        this.k[i] = k;
        this.lambda[i] = TWO_PI / k;
      }
    }
    if (SEA_OPT.crest) {
      // Energy-weighted mean direction, then squeeze every component's angle
      // about it. Amplitudes, frequencies and the seeded draw ORDER are all
      // untouched, so the daily seed still gives everyone the same sea - it is
      // the same draw, read through a narrower spreading function.
      let mx = 0, mz = 0;
      for (let i = 0; i < n; i++) {
        const e = 0.5 * this.amp[i] * this.amp[i];
        mx += e * this.dx[i]; mz += e * this.dz[i];
      }
      const th0 = Math.atan2(mz, mx);
      for (let i = 0; i < n; i++) {
        let d = Math.atan2(this.dz[i], this.dx[i]) - th0;
        d -= TWO_PI * Math.round(d * INV_TWO_PI);
        const th = th0 + d * CREST_NARROW;
        this.dx[i] = Math.cos(th);
        this.dz[i] = Math.sin(th);
      }
    }
    // The global steepness clamp has to be re-derived: `depth` raises every
    // long component's k, and the budget is a sum over a*k. Same rule as
    // sea-state.js - global, never per component.
    let sak = 0;
    for (let i = 0; i < N_VERTEX; i++) sak += this.amp[i] * this.k[i];
    const q = Math.min(1, 0.70 / (sak > 0 ? sak : 1));
    for (let i = 0; i < n; i++) this.Q[i] = i < N_VERTEX ? q : 0;
    return q;
  }

  // -------------------------------------------------------------------------
  // THE SAMPLER
  //
  //   sample(x, z, t, depth, slot) -> the preallocated slot object
  //
  // Never returns a new object. Never allocates. All five arguments are
  // required at every call site.
  // -------------------------------------------------------------------------
  sample(x, z, t, depth, slot) {
    const OUT = this._slots[slot & 3];

    if (this._n === 0) {
      // FLAT. Byte-identical to the pre-Gerstner stub, which is what keeps the
      // seven original gate assertions valid.
      OUT.height = this._tide;
      OUT.slopeX = 0; OUT.slopeZ = 0;
      OUT.orbX = 0; OUT.orbY = 0; OUT.orbZ = 0;
      OUT.nx = 0; OUT.ny = 1; OUT.nz = 0;
      OUT.jac = 1;
      OUT.x0 = x; OUT.z0 = z;
      OUT.slope = 0; OUT.orbU = 0; OUT.orbW = 0;
      OUT.surfBrk = 0; OUT.surfFoam = 0; OUT.surfC = 0;
      OUT.surfH = 0; OUT.surfAmp = 0; OUT.surfEta = 0;
      return OUT;
    }

    const d = depth >= 0 ? depth : 0;      // also catches undefined / NaN
    if (this._ckx !== x || this._ckz !== z || this._ckt !== t) {
      this._solve(x, z, t);
    }
    return this._finish(OUT, d);
  }

  // Eulerian inversion. Gerstner is parametric: the surface is defined at the
  // UNDISPLACED coordinate p0, but the plant asks "how high is the water at
  // world (x, z)". Invert it with a 2D Newton, EXACTLY three iterations, no
  // early exit and no convergence test - a data-dependent iteration count is a
  // data-dependent instruction count, and record/replay determinism is worth
  // more than the handful of iterations it saves.
  _solve(x, z, t) {
    const n = this._nPhys;
    const K = this.k, OM = this.omega, A = this.amp, PH = this.phase;
    const DX = this.dx, DZ = this.dz, QQ = this.Q;

    let px = x, pz = z;

    for (let it = 0; it < 3; it++) {
      let Dx = 0, Dz = 0, Jxx = 0, Jzz = 0, Jxz = 0;
      for (let i = 0; i < n; i++) {
        const ki = K[i], dxi = DX[i], dzi = DZ[i];
        // MANDATORY wrap before every sin/cos. k*x grows without bound as the
        // rider travels; sin() of a large argument loses precision long before
        // it loses meaning, and two engines lose it differently.
        let psi = ki * (dxi * px + dzi * pz) - OM[i] * t + PH[i];
        psi -= TWO_PI * Math.round(psi * INV_TWO_PI);
        const S = Math.sin(psi), C = Math.cos(psi);
        const qa = QQ[i] * A[i];
        const qak = qa * ki;
        Dx += qa * dxi * S;
        Dz += qa * dzi * S;
        Jxx += qak * dxi * dxi * C;
        Jzz += qak * dzi * dzi * C;
        Jxz += qak * dxi * dzi * C;
      }
      const Fx = px - Dx - x;
      const Fz = pz - Dz - z;
      let det = (1 - Jxx) * (1 - Jzz) - Jxz * Jxz;
      if (det < 0.25) det = 0.25;      // guard: never divide by a folded surface
      px -= ((1 - Jzz) * Fx + Jxz * Fz) / det;
      pz -= (Jxz * Fx + (1 - Jxx) * Fz) / det;
    }

    // One final accumulation at the converged p0, producing everything the
    // outputs need plus the per-component S/C the cache reuses.
    const S_ = this._S, C_ = this._C;
    let H = 0, Ex = 0, Ez = 0, Jxx = 0, Jzz = 0, Jxz = 0;
    for (let i = 0; i < n; i++) {
      const ki = K[i], dxi = DX[i], dzi = DZ[i], ai = A[i];
      let psi = ki * (dxi * px + dzi * pz) - OM[i] * t + PH[i];
      psi -= TWO_PI * Math.round(psi * INV_TWO_PI);
      const S = Math.sin(psi), C = Math.cos(psi);
      S_[i] = S; C_[i] = C;
      const ak = ai * ki;
      const qak = QQ[i] * ak;
      H += ai * C;
      Ex += ak * dxi * S;
      Ez += ak * dzi * S;
      Jxx += qak * dxi * dxi * C;
      Jzz += qak * dzi * dzi * C;
      Jxz += qak * dxi * dzi * C;
    }

    this._H = H; this._Ex = Ex; this._Ez = Ez;
    this._Jxx = Jxx; this._Jzz = Jzz; this._Jxz = Jxz;
    this._x0 = px; this._z0 = pz;
    this._ckx = x; this._ckz = z; this._ckt = t;
  }

  _finish(OUT, d) {
    const n = this._nPhys;
    const K = this.k, OM = this.omega, A = this.amp, DX = this.dx, DZ = this.dz;
    const S_ = this._S, C_ = this._C;
    const Jxx = this._Jxx, Jzz = this._Jzz, Jxz = this._Jxz;

    const nxp = this._Ex * (1 - Jzz) + this._Ez * Jxz;
    const nyp = (1 - Jxx) * (1 - Jzz) - Jxz * Jxz;   // this IS the Jacobian
    const nzp = this._Ez * (1 - Jxx) + this._Ex * Jxz;
    const inv = 1 / Math.sqrt(nxp * nxp + nyp * nyp + nzp * nzp);
    const nx = nxp * inv, ny = nyp * inv, nz = nzp * inv;

    // Orbital velocity at `depth`. Closed-form exp(-k*d) decay is exactly what
    // SPEC section 3 picked Gerstner for and exactly what FFT does not give.
    let ox = 0, oy = 0, oz = 0;
    for (let i = 0; i < n; i++) {
      const aw = A[i] * OM[i] * decay(K[i], d);
      const c = C_[i];
      ox += aw * c * DX[i];
      oz += aw * c * DZ[i];
      oy += aw * S_[i];
    }

    OUT.height = this._tide + this._H;
    OUT.slopeX = -nx / ny;
    OUT.slopeZ = -nz / ny;
    OUT.orbX = ox; OUT.orbY = oy; OUT.orbZ = oz;
    OUT.nx = nx; OUT.ny = ny; OUT.nz = nz;
    OUT.jac = nyp;
    OUT.x0 = this._x0; OUT.z0 = this._z0;

    // ---- THE SURF TRAIN (tmp-tr71) ----------------------------------------
    // Added on top of the Gerstner sum, AFTER the Newton inversion, because it
    // is an Eulerian elevation field rather than a displaced component: it
    // takes no part in the inversion and cannot fold it.
    //
    // Cost, measured: one ladder read and two sin/cos per sample. Outside the
    // surf envelope surfSample() returns before either, so open water pays a
    // depth lookup and nothing else.
    //
    // x, z and t come off the cache keys rather than being re-passed, so a
    // cache HIT and a cache MISS run the identical code on the identical
    // arguments - which is the rule that keeps sample() a pure function.
    if (this._surfCtl > 0) {
      const S = surfSample(this._ckx, this._ckz, this._ckt, d, this._surfCtl, this._surfOut);
      if (S.active) {
        OUT.height += S.eta;
        OUT.slopeX += S.sx;
        OUT.slopeZ += S.sz;
        OUT.orbX += S.ux; OUT.orbY += S.uy; OUT.orbZ += S.uz;
        // Rebuild the normal from the COMBINED slope so the two halves of the
        // surface cannot disagree. slopeX = -nx/ny is the definition above.
        const inv2 = 1 / Math.sqrt(OUT.slopeX * OUT.slopeX + 1 + OUT.slopeZ * OUT.slopeZ);
        OUT.nx = -OUT.slopeX * inv2;
        OUT.ny = inv2;
        OUT.nz = -OUT.slopeZ * inv2;
      }
      OUT.surfBrk = S.brk; OUT.surfFoam = S.foam; OUT.surfC = S.c;
      OUT.surfH = S.h; OUT.surfAmp = S.amp; OUT.surfEta = S.eta;
    } else {
      OUT.surfBrk = 0; OUT.surfFoam = 0; OUT.surfC = 0;
      OUT.surfH = 0; OUT.surfAmp = 0; OUT.surfEta = 0;
    }

    OUT.slope = OUT.slopeX; OUT.orbU = OUT.orbX; OUT.orbW = OUT.orbY;   // transitional
    return OUT;
  }

  // -------------------------------------------------------------------------
  // GPU side. Both of these read the same arrays the sampler above reads.
  // -------------------------------------------------------------------------

  // Invariant to the sea state and to the seed - see src/sea-glsl.js for why
  // that is the load-bearing property.
  glsl() { return SEA_GLSL; }

  // dst: Float32Array(MAX_WAVES * 8) = 256 floats = 1 KB. No allocation.
  packUBO(dst, t) { return packWaveUBO(dst, this, t); }

  // -------------------------------------------------------------------------
  // INTERNAL TEST HOOK - src/sea-selftest.js only. Never called at runtime.
  // Lets a check install a single hand-made component so identities that only
  // hold in the linear limit (w_orb = -c * slope) can be asserted tightly.
  // -------------------------------------------------------------------------
  _debugSetTable(comps, tide) {
    zeroWaveTable(this);
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i];
      this.k[i] = c.k;
      this.omega[i] = Math.sqrt(G * c.k);
      this.amp[i] = c.amp;
      this.phase[i] = c.phase || 0;
      this.dx[i] = Math.cos(c.theta || 0);
      this.dz[i] = Math.sin(c.theta || 0);
      this.Q[i] = c.Q === undefined ? 1 : c.Q;
      this.lambda[i] = TWO_PI / c.k;
    }
    this._n = MAX_WAVES;
    this._nPhys = comps.length;
    this._tide = tide || 0;
    this._name = 'custom';
    this._hash = hashWaveTable(this, this._n);
    this._ckx = NaN; this._ckz = NaN; this._ckt = NaN;
    return this;
  }
}
