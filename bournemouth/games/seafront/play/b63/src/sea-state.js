// SEA STATE -> ONE WAVE TABLE.
//
// SPEC section 3, the non-negotiable rule: "A single sea-state object generates
// one array of components; the JS sampler and the GLSL vertex shader are both
// generated from that same array (GLSL string-templated at load), so they cannot
// drift apart."
//
// This file is the *generator*. It owns the spectrum, the banding, the
// directional spreading and the seeded draws. It writes into a set of
// preallocated Float64Arrays owned by the Sea object; there is no array of
// component objects anywhere in the codebase, precisely so that a second table
// cannot come into existence by accident.
//
// Node-safe: no DOM, no WebGL, no clock read, no unseeded randomness (the only
// entropy is mulberry32 from ./rng.js, driven by an int32 seed).
// tools/gate-check.mjs imports this transitively.

import { mulberry32, hashString } from './rng.js';

// ---------------------------------------------------------------------------
// Table geometry. Fixed for all time - the tier boundaries are baked into the
// GLSL (#define) and into the physics loop bound, so they are constants, not
// configuration.
// ---------------------------------------------------------------------------
export const MAX_WAVES = 32;   // the whole table, always
export const N_PHYS    = 8;    // tier 0: physics + vertex displacement
export const N_VERTEX  = 16;   // tiers 0+1: everything that is displaced
export const G         = 9.81;

export const TWO_PI     = Math.PI * 2;
export const INV_TWO_PI = 1 / TWO_PI;
const DEG = Math.PI / 180;

// WHY the split at 1.5 m (SPEC section 3):
//
//   "Physics uses the 8 longest components (lambda > ~1.5 m) - a 1.63 m board
//    does not respond to 40 cm ripples. Visuals use all ~32 plus scrolling
//    detail normals. The disagreement below 1.5 m is a documented tolerance,
//    not a bug."
//
// The asymmetry is worth stating numerically, because it is what justifies
// paying for 32 components on the GPU and only 8 on the CPU: on the default
// Poole Bay state the sub-1.5 m band carries 0.29% of the variance (invisible
// to a 110 kg board) but ~65% of the surface slope (the entire visual texture
// of the water). Physics wants variance; eyes want slope.
const LAMBDA_PHYS_MIN   = 1.5;   // m - tier 0/1 boundary
const LAMBDA_DETAIL_MIN = 0.30;  // m - shortest component in the table at all

const N_EQ_BANDS = 5;            // indices 0-4, equal energy
const SIMPSON_N  = 4096;         // intervals for the cumulative spectrum
const F_LO = 0.02, F_HI = 12;    // Hz, integration range
const BAND_SIMPSON_N = 64;       // 65 nodes within a band
const SPREAD_N = 65;             // nodes in the directional inverse CDF

// Global steepness budget over the DISPLACED components (tiers 0+1). Gerstner
// loops (the surface folds through itself) once sum(Q*a*k) reaches 1; 0.70
// leaves headroom for the Newton inversion and keeps the Jacobian comfortably
// positive. Clamped globally, never per component - a per-component clamp
// reshapes the spectrum and therefore silently changes Hs.
const STEEPNESS_BUDGET = 0.70;

// ---------------------------------------------------------------------------
// Seeds
// ---------------------------------------------------------------------------
export const DEFAULT_SEED = (0x9E3779B9 ^ 20260801) | 0;

// 'YYYY-MM-DD' -> int32. SPEC section 5's seeded daily: everyone in the world
// gets the same Bournemouth sea today.
export function seedFromDate(iso) {
  return (parseInt(hashString(iso), 16) ^ 0x9E3779B9) | 0;
}

// ---------------------------------------------------------------------------
// Presets
//
// SPEC section 4: "Default sea = the real modal Poole Bay state: Hs 0.5 m,
// period 4 s, from 191 deg. Short, fast, small chop - not ocean swell. This
// single choice is what makes a local say 'that's Bournemouth'."
// ---------------------------------------------------------------------------
export const SEA_PRESETS = {
  'flat':              null,
  'glass':             { Hs: 0.2, Tp: 3.0, gamma: 3.3, dirFromDeg: 191, tide: 0 },
  'poole-bay-modal':   { Hs: 0.5, Tp: 4.0, gamma: 3.3, dirFromDeg: 191, tide: 0 },
  'clean-groundswell': { Hs: 0.5, Tp: 8.0, gamma: 7.0, dirFromDeg: 191, tide: 0 },
  'fresh-sw-breeze':   { Hs: 0.8, Tp: 4.5, gamma: 3.3, dirFromDeg: 225, tide: 0 },
  'lively':            { Hs: 1.2, Tp: 5.5, gamma: 3.3, dirFromDeg: 225, tide: 0 },
  'storm':             { Hs: 2.0, Tp: 6.5, gamma: 3.3, dirFromDeg: 225, tide: 0 },
};
export const DEFAULT_PRESET = 'poole-bay-modal';

const STATE_KEYS = ['Hs', 'Tp', 'gamma', 'dirFromDeg', 'tide'];

// Returns { spec, name }. spec === null means flat.
export function resolveState(state) {
  if (state === null || state === undefined || state === 'flat') {
    return { spec: null, name: 'flat' };
  }
  if (typeof state === 'string') {
    if (!Object.prototype.hasOwnProperty.call(SEA_PRESETS, state)) {
      throw new Error(`Sea: unknown preset '${state}'`);
    }
    const spec = SEA_PRESETS[state];
    return spec === null ? { spec: null, name: 'flat' } : { spec, name: state };
  }
  if (typeof state !== 'object') throw new Error('Sea: state must be null, a preset name or an object');
  for (let i = 0; i < STATE_KEYS.length; i++) {
    const key = STATE_KEYS[i];
    const v = state[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new Error(`Sea: state.${key} must be a finite number`);
    }
  }
  if (state.Hs <= 0 || state.Tp <= 0 || state.gamma <= 0) {
    throw new Error('Sea: Hs, Tp and gamma must be positive');
  }
  return { spec: state, name: 'custom' };
}

// ---------------------------------------------------------------------------
// JONSWAP
//
// Deterministic from (Hs, Tp, gamma) alone for frequency and amplitude; the
// seed drives ONLY directions and phases. That is what makes the whole ladder
// validate-once: the reference table in the contract is seed-independent.
// ---------------------------------------------------------------------------
function jonswap(f, fp, gamma) {
  if (f <= 0) return 0;
  const sig = f <= fp ? 0.07 : 0.09;
  const d = (f - fp) / (sig * fp);
  const r = Math.exp(-0.5 * d * d);
  const fr = f / fp;
  return Math.pow(f, -5) * Math.exp(-1.25 * Math.pow(fr, -4)) * Math.pow(gamma, r);
}

// Composite Simpson on SIMPSON_N intervals (SIMPSON_N+1 nodes, uniform in f),
// accumulated per Simpson pair so the partial sums form a usable cumulative
// array. cum[m] is the integral from F_LO to F_LO + m*2h.
function buildCumulative(fp, gamma) {
  const h = (F_HI - F_LO) / SIMPSON_N;
  const pairs = SIMPSON_N / 2;
  const cum = new Float64Array(pairs + 1);
  let acc = 0;
  let s0 = jonswap(F_LO, fp, gamma);
  for (let m = 0; m < pairs; m++) {
    const f0 = F_LO + 2 * m * h;
    const s1 = jonswap(f0 + h, fp, gamma);
    const s2 = jonswap(f0 + 2 * h, fp, gamma);
    acc += (h / 3) * (s0 + 4 * s1 + s2);
    cum[m + 1] = acc;
    s0 = s2;
  }
  return { cum, step: 2 * h };
}

function cumAt(cum, step, f) {
  const t = (f - F_LO) / step;
  if (t <= 0) return 0;
  const last = cum.length - 1;
  if (t >= last) return cum[last];
  const i = Math.floor(t);
  const frac = t - i;
  return cum[i] + (cum[i + 1] - cum[i]) * frac;
}

// Inverse of cumAt by binary search + linear interpolation.
function invCum(cum, step, target) {
  const last = cum.length - 1;
  if (target <= 0) return F_LO;
  if (target >= cum[last]) return F_LO + last * step;
  let lo = 0, hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= target) lo = mid; else hi = mid;
  }
  const c0 = cum[lo], c1 = cum[hi];
  const frac = c1 > c0 ? (target - c0) / (c1 - c0) : 0;
  return F_LO + (lo + frac) * step;
}

// 65-node Simpson inside one band. Returns [ integral S df, integral f*S df ].
function bandMoments(fa, fb, fp, gamma, out) {
  const n = BAND_SIMPSON_N;
  const h = (fb - fa) / n;
  let sS = 0, sFS = 0;
  for (let j = 0; j <= n; j++) {
    const f = fa + j * h;
    const w = (j === 0 || j === n) ? 1 : (j & 1 ? 4 : 2);
    const s = jonswap(f, fp, gamma);
    sS += w * s;
    sFS += w * f * s;
  }
  out[0] = sS * h / 3;
  out[1] = sFS * h / 3;
  return out;
}

// ---------------------------------------------------------------------------
// Directional spreading: D(theta) ~ cos^(2s)((theta - thetaBar)/2), Mitsuyasu.
// ---------------------------------------------------------------------------
function spreadExponent(f, fp) {
  const r = f / fp;
  const s = f <= fp ? 10 * Math.pow(r, 5) : 10 * Math.pow(r, -2.5);
  return s < 0.5 ? 0.5 : s;
}

function buildSpreadCdf(sVal, cdf) {
  const half = Math.PI / 2;
  const dth = (2 * half) / (SPREAD_N - 1);
  let acc = 0;
  cdf[0] = 0;
  let prev = Math.pow(Math.cos(-half * 0.5), 2 * sVal);
  for (let j = 1; j < SPREAD_N; j++) {
    const th = -half + j * dth;
    const v = Math.pow(Math.cos(th * 0.5), 2 * sVal);
    acc += 0.5 * (prev + v) * dth;
    cdf[j] = acc;
    prev = v;
  }
  const inv = acc > 0 ? 1 / acc : 0;
  for (let j = 0; j < SPREAD_N; j++) cdf[j] *= inv;
}

function invSpread(cdf, u) {
  const half = Math.PI / 2;
  const dth = (2 * half) / (SPREAD_N - 1);
  let lo = 0, hi = SPREAD_N - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid] <= u) lo = mid; else hi = mid;
  }
  const c0 = cdf[lo], c1 = cdf[hi];
  const frac = c1 > c0 ? (u - c0) / (c1 - c0) : 0;
  return -half + (lo + frac) * dth;
}

// ---------------------------------------------------------------------------
// THE BUILD
//
// T is the Sea's set of parallel Float64Array(MAX_WAVES): k, omega, amp, phase,
// dx, dz, Q, lambda. Filled IN PLACE - setState() must never allocate a table.
// (It allocates a few small scratch arrays here, which is fine: setState is
// never called from a tick, from reset() or from restart().)
// ---------------------------------------------------------------------------
export function buildWaveTable(T, spec, seed) {
  const fp = 1 / spec.Tp;
  const gamma = spec.gamma;
  const m0Target = (spec.Hs / 4) * (spec.Hs / 4);

  const { cum, step } = buildCumulative(fp, gamma);
  const rawTotal = cum[cum.length - 1];
  const scale = m0Target / rawTotal;

  // ---- band edges -------------------------------------------------------
  // Hybrid banding. This is the decision that stops one component owning half
  // the variance: equal-energy bands across the peak (where a log grid would
  // hand the modal band everything), log bands above it (where the f^-5 tail
  // wants equal ratio, not equal energy).
  const fEq0 = 0.5 * fp;
  const fEq1 = 2.0 * fp;
  const fMid = Math.sqrt(G / (TWO_PI * LAMBDA_PHYS_MIN));    // lambda = 1.5 m
  const fTop = Math.sqrt(G / (TWO_PI * LAMBDA_DETAIL_MIN));  // lambda = 0.30 m

  const edges = new Float64Array(MAX_WAVES + 1);
  const eLo = cumAt(cum, step, fEq0);
  const eHi = cumAt(cum, step, fEq1);
  for (let j = 1; j < N_EQ_BANDS; j++) {
    edges[j] = invCum(cum, step, eLo + (eHi - eLo) * (j / N_EQ_BANDS));
  }
  edges[0] = fEq0;
  edges[N_EQ_BANDS] = fEq1;
  for (let j = 1; j <= 3; j++) edges[N_EQ_BANDS + j] = fEq1 * Math.pow(fMid / fEq1, j / 3);
  for (let j = 1; j <= 24; j++) edges[N_VERTEX / 2 + j] = fMid * Math.pow(fTop / fMid, j / 24);

  // ---- per-band centroid frequency and amplitude ------------------------
  const mom = [0, 0];
  const fC = new Float64Array(MAX_WAVES);
  let sumVar = 0;
  for (let i = 0; i < MAX_WAVES; i++) {
    bandMoments(edges[i], edges[i + 1], fp, gamma, mom);
    const den = mom[0];
    // Energy centroid, not the geometric middle: with a steep f^-5 tail the
    // two differ enough to move lambda by several per cent.
    const f = den > 0 ? mom[1] / den : 0.5 * (edges[i] + edges[i + 1]);
    fC[i] = f;
    const a = Math.sqrt(2 * scale * den);
    T.amp[i] = a;
    sumVar += 0.5 * a * a;
  }

  // Rescale all 32 so Hs comes out exact. The table covers
  // [0.5 fp, f(0.30 m)]; the energy outside that range is real but has nowhere
  // to go, so it is folded back in rather than quietly lost.
  const fix = sumVar > 0 ? Math.sqrt(m0Target / sumVar) : 0;
  for (let i = 0; i < MAX_WAVES; i++) T.amp[i] *= fix;

  // ---- dispersion (deep water) ------------------------------------------
  for (let i = 0; i < MAX_WAVES; i++) {
    const w = TWO_PI * fC[i];
    const k = (w * w) / G;
    T.omega[i] = w;
    T.k[i] = k;
    T.lambda[i] = TWO_PI / k;
  }

  // ---- seeded draws -----------------------------------------------------
  // FIXED DRAW ORDER. Changing it changes every historical daily seed and every
  // stored ghost, so it is an invariant, not an implementation detail:
  //   1. physics group (n=8):  8 permutation draws, then 8 stratum jitters
  //   2. detail group (n=24):  24 permutation draws, then 24 stratum jitters
  //   3. phases: 32 draws, in index order
  const rng = mulberry32(seed >>> 0);
  const uArr = new Float64Array(MAX_WAVES);
  drawGroup(rng, uArr, 0, N_PHYS);
  drawGroup(rng, uArr, N_PHYS, MAX_WAVES - N_PHYS);
  for (let i = 0; i < MAX_WAVES; i++) T.phase[i] = rng() * TWO_PI;

  // Direction of TRAVEL. Sea state direction is meteorological ("from"), so
  // travel = dirFromDeg + 180. Compass bearing B -> unit (sin B, -cos B) in
  // world (X = east, Z = south). Default 191 deg from -> travel toward 11 deg.
  const bTravel = (spec.dirFromDeg + 180) * DEG;
  const thetaTravel = Math.atan2(-Math.cos(bTravel), Math.sin(bTravel));

  const cdf = new Float64Array(SPREAD_N);
  for (let i = 0; i < MAX_WAVES; i++) {
    buildSpreadCdf(spreadExponent(fC[i], fp), cdf);
    const th = thetaTravel + invSpread(cdf, uArr[i]);
    T.dx[i] = Math.cos(th);
    T.dz[i] = Math.sin(th);
  }

  // ---- global steepness clamp -------------------------------------------
  let sak = 0;
  for (let i = 0; i < N_VERTEX; i++) sak += T.amp[i] * T.k[i];
  const qGlobal = Math.min(1, STEEPNESS_BUDGET / (sak > 0 ? sak : 1));
  for (let i = 0; i < MAX_WAVES; i++) T.Q[i] = i < N_VERTEX ? qGlobal : 0;

  return { nActive: MAX_WAVES, nPhys: N_PHYS, tide: spec.tide, qGlobal, sak };
}

function drawGroup(rng, uArr, off, n) {
  const rank = new Int32Array(n);
  for (let i = 0; i < n; i++) rank[i] = i;
  // Fisher-Yates, n draws (the i = 0 pass still draws, so the count is exactly
  // n and the order is stable if the group size ever changes).
  for (let i = n - 1; i >= 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = rank[i]; rank[i] = rank[j]; rank[j] = t;
  }
  for (let i = 0; i < n; i++) {
    let u = (rank[i] + 0.5 + 0.7 * (rng() - 0.5)) / n;
    if (u < 0.001) u = 0.001; else if (u > 0.999) u = 0.999;
    uArr[off + i] = u;
  }
}

export function zeroWaveTable(T) {
  T.k.fill(0); T.omega.fill(0); T.amp.fill(0); T.phase.fill(0);
  T.dx.fill(0); T.dz.fill(0); T.Q.fill(0); T.lambda.fill(0);
}

// ---------------------------------------------------------------------------
// Table hash: 8-hex FNV-1a over (k, omega, amp, phase, dx, dz) quantised at
// 1e-6. Locks the generator against a silent regression.
// ---------------------------------------------------------------------------
export function hashWaveTable(T, n) {
  let h = 0x811c9dc5;
  const q = (v) => {
    let x = Math.round(v * 1e6) | 0;
    for (let b = 0; b < 4; b++) {
      h ^= (x >>> (b * 8)) & 0xff;
      h = Math.imul(h, 0x01000193);
    }
  };
  for (let i = 0; i < n; i++) {
    q(T.k[i]); q(T.omega[i]); q(T.amp[i]); q(T.phase[i]); q(T.dx[i]); q(T.dz[i]);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// The computed hash of the default table ('poole-bay-modal' at DEFAULT_SEED).
// Asserted in seaChecks() so a future edit to the generator cannot pass
// unnoticed. See the hand-off note: this is OUR value, measured, not the one
// quoted in the contract (9e626180), which came out of a different reference
// implementation.
export const SEA_TABLE_HASH_POOLE = 'bfc25a77';

// The reference table from the implementation contract, section B.11. Frequency
// and amplitude are seed-independent, so these are hard acceptance numbers.
export const REFERENCE_POOLE = {
  lambda: [33.118, 25.916, 22.730, 18.244, 10.538, 5.078, 3.160, 1.965],
  amp:    [0.07709, 0.07709, 0.07709, 0.07709, 0.07709, 0.03051, 0.01928, 0.01206],
  omega:  [1.36424, 1.54220, 1.64674, 1.83807, 2.41855, 3.48417, 4.41666, 5.60069],
  k:      [0.18972, 0.24244, 0.27643, 0.34439, 0.59627, 1.23745, 1.98847, 3.19753],
};
