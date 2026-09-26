// THE SURF — shoaling, breaking, and the two banks either side of the pier.
//
// Owner, 2026-09-17: "can we have the sea more realistic and with bigger waves
// either side of the pier as this is where people surf in real life".
//
// ---------------------------------------------------------------------------
// ONE SURF FIELD, exactly as src/sea-state.js is ONE WAVE TABLE
// ---------------------------------------------------------------------------
// Everything about the surf lives in this file: the bed (the existing shoreface
// law plus the two banks), the shoaling ladder, the break criterion, the set
// clock and the whitewater. src/sea.js adds surfSample()'s output to the
// Gerstner sum on the CPU. src/gl/shaders.js gets THE SAME FUNCTIONS as GLSL
// from surfChunk(), with the ladder baked in as a const array built by the very
// same code below. There is no second copy of any number here, in either
// language, and the ladder is generated once at module load in doubles.
//
// The deep-water table in sea-state.js is NOT touched. The surf is an ADDITIVE
// train on top of it, which is what keeps the settled, measured Poole Bay sea
// exactly where the last two months of colour work put it: outside the surf
// envelope this file contributes an arithmetic zero.
//
// ---------------------------------------------------------------------------
// WHY A SEPARATE TRAIN RATHER THAN SHOALING THE 32 COMPONENTS
// ---------------------------------------------------------------------------
// Shoaling the shared table would (a) make every component's k depend on
// position, which breaks the Newton inversion in sea.js (it assumes constant k
// per component), (b) move the open sea, which is measured and settled, and
// (c) change the table hash, which is asserted in sea-selftest.js. A single
// long-crested train carries everything the owner asked for — a wave that grows,
// steepens, breaks and can be ridden — at a cost of two sin/cos per sample.
//
// SPEC section 3's tolerance list gains one entry, stated here rather than
// discovered later:
//
//   6. THE SURF TRAIN IS ONE FREQUENCY. A real surf zone is a spectrum, and a
//      spectrum breaks over a range of depths rather than on one line. The
//      Rayleigh-tail breaking FRACTION in shaders.js still models that for the
//      foam; the ridden wave is monochromatic at Tp = 7.5 s. A rider therefore
//      gets a metronomic set rhythm that a real bank does not have. The set/lull
//      clock hides most of it and nothing else in the game reads wave-to-wave
//      height variation.
//
//   7. NO WAVE SETUP. Breaking waves pile water against the beach (~0.2 m at
//      this height), which would move the waterline. It is deliberately NOT
//      modelled: the waterline is where 19 judged views, the rescue drop-off
//      zone and the beach mesh all meet, and moving it for 0.2 m of realism is
//      a bad trade.
//
//   8. NO LONGSHORE CURRENT and no rip. A bar with a pier at one end has both.
//      They would need a second velocity field that nothing currently reads.
//
//   9. THE BORE'S UNDERTOW IS NOT MODELLED. The shoreward mass transport under a
//      breaking wave (SURF.BORE below) is real and is what carries a rider in,
//      but in a real surf zone it is balanced by a seaward return flow near the
//      bed. Here only the shoreward half exists, decaying with depth, so the
//      surf zone has a small net shoreward current. What that costs: a craft
//      left with no throttle inside the break drifts onto the sand instead of
//      sitting still. What it buys: the wave pushes. It is the right trade for
//      a game and the wrong one for a coastal model, and it is written down
//      here so nobody later reads the asymmetry as a bug.
//
// Node-safe: no DOM, no WebGL, no clock read, no randomness at all (the surf is
// a closed-form function of x, z and t). tools/gate-check.mjs imports this
// transitively through sea.js and must keep working.
// ---------------------------------------------------------------------------

import { mhwOffset, COAST } from './gl/coast.js';
import { DIR as PIER_DIR } from './gl/pier.js';
// tmp-tr147: the arena's shoreline. See sea-shore.js. With the flag off
// SHORE_ON is false, every branch below takes its Bournemouth arm and
// surfChunk() emits byte-for-byte the string it emitted before.
import { SHORE_ON, shoreField } from './sea-shore.js';

const G = 9.81;
const TWO_PI = Math.PI * 2;
const INV_TWO_PI = 1 / TWO_PI;

// ---------------------------------------------------------------------------
// ABLATION (tmp-tr131). Read ONCE at module load - from ?sdbg= in the browser,
// from SEA_ABLATE= in node - so the CPU sampler, the emitted GLSL and the
// headless gate are all generated from the SAME flags. That is the one-table
// rule applied to the switches: a flag that reached only one of the three would
// let the ridden wave and the drawn wave disagree, which is the single thing
// this file exists to prevent.
//
//   ?sdbg=nobeachbreak   the beach outside the two banks stops breaking again
//                        (the pre-tmp-tr131 behaviour: it never broke at all)
//   ?sdbg=nofoamlife     foam goes back to the 2.2 rad trail, 2.6 s at Tp
//   ?sdbg=nofoamwash     foam goes back to a hard brk >= 0.80 gate, so the
//                        trough between the two break lines is bare water
//
// Node-safe: no DOM access unless `location` exists.
// ---------------------------------------------------------------------------
const _ABL = (() => {
  let s = '';
  try {
    if (typeof process !== 'undefined' && process.env && process.env.SEA_ABLATE) {
      s = process.env.SEA_ABLATE;
    } else if (typeof location !== 'undefined' && location && location.search) {
      s = new URLSearchParams(location.search).get('sdbg') || '';
    }
  } catch (e) { s = ''; }
  return new Set(String(s).split(',').map((v) => v.trim()).filter(Boolean));
})();

export const SURF_ABL = Object.freeze({
  beachBreak: !_ABL.has('nobeachbreak'),
  foamLife: !_ABL.has('nofoamlife'),
  foamWash: !_ABL.has('nofoamwash'),
});

// The pre-tmp-tr131 foam numbers, restored as a set by ?sdbg=nofoamlife. Kept
// here rather than inline so the ablation is one object, not three edits.
const FOAM_OLD = { TAU: 2.2, AMP: 0.80, BASE: 0.12 };

// ---------------------------------------------------------------------------
// THE NUMBERS. Provenance on every line. tmp-tr71/RESULT.md §1 has the frames
// and the LIDAR transects these came off.
// ---------------------------------------------------------------------------
export const SURF = Object.freeze({
  // Period of the ridden train. Bournemouth surfs on groundswell, not on the
  // 4 s modal chop: the existing 'clean-groundswell' preset is Tp 8.0 s and the
  // owner's "Bournemouth Pier Surfers" reel (Nov 2025) shows long, parallel,
  // well-spaced crests. 7.5 s gives a deep-water celerity of 11.7 m/s and
  // sqrt(g*h) = 3.7 m/s over the bank, which is a speed an eFoil can match.
  TP: 7.5,

  // Deep-water height of the train, before shoaling, at control = 1. Shoals to
  // ~1.15 m over the bank, which is the height the footage shows: surfers
  // standing chest-deep at the take-off, a crest about head-high on them.
  H0: 0.92,

  // McCowan breaker index. The SAME 0.78 the foam in shaders.js already uses;
  // the two cannot disagree because both now read it from here.
  GAMMA_B: 0.78,

  // ---- the two banks -----------------------------------------------------
  // Alongshore offset from the pier axis, in pier-space metres. The reel puts
  // the line-up within about one pier-neck width of the structure, so 72 m
  // either side with a 46 m half-width covers a bank from o 26 to o 118.
  ZONE_O: 72,
  ZONE_W: 46,
  // The structure itself. Waves do run under a pier; foam and a breaking crest
  // drawn THROUGH the pile line read as a bug, so the bank envelope is notched.
  PIER_GAP: 15,
  // The rest of the beach still breaks — the drone frames show one continuous
  // white line the whole length of it — but at 30% of the banks' height, which
  // is the owner's "bigger waves either side of the pier" stated as a number.
  // (0.30 was tried first and MEASURED: it put a solid white band along the
  // whole beach - see tmp-tr71/ev/a0_first.png - i.e. it made the banks NOT
  // special, which is the one thing the owner asked for.)
  //
  // tmp-tr131: 0.18 -> 0.30, i.e. back to the number the line above always
  // claimed. It was dropped to 0.18 because at 0.30 "it put a solid white band
  // along the whole beach... it made the banks NOT special". That cannot have
  // been THIS path: with the old cap, a/lim collapsed to ENV_FLOOR near the
  // shore, so at 0.30 the plain beach still sat at 0.30 of its breaker limit,
  // brk = smoothstep(0.80, 1.00, 0.30) = 0, and this file contributed no foam
  // at all off the banks. The white band in that render came from elsewhere.
  //
  // With the cap fixed (see the ladder below) ENV_FLOOR no longer trades
  // against the banks at all - MEASURED, tmp-tr131/envsweep.py,
  // [foam band width m, peak wave H m]:
  //
  //   ENV_FLOOR   bank (o = 72 m)      plain beach (o = 300 m)
  //     0.18      138 m, 1.169 m         7 m, 0.304 m
  //     0.24      138 m, 1.169 m        11 m, 0.409 m
  //     0.30      138 m, 1.169 m        14 m, 0.508 m
  //     0.45      138 m, 1.169 m        23 m, 0.708 m
  //
  // The bank is IDENTICAL on every row. At 0.30 the banks' surf zone is ten
  // times wider than the rest of the beach's and the wave is 2.3x higher, so
  // "bigger waves either side of the pier" survives with room to spare, and
  // the rest of the shoreline gets the continuous break the owner's own Durley
  // frames show. ?sdbg=nobeachbreak puts both the cap and this number back.
  ENV_FLOOR: _ABL.has('nobeachbreak') ? 0.18 : 0.30,

  // ---- the banks' own bed profile ----------------------------------------
  // MEASURED, mostly. tmp-tr71/dsm_beach.txt: the EA LIDAR tile already in this
  // repo puts the lower intertidal at 1 : 47 and 1.0 m of water 57 m seaward of
  // the MSL contour. shaders.js bedDepth()'s inshore law, Dean A = 0.155, puts
  // 1.0 m only 16.4 m out - it is about 2.4x too steep, which is why the
  // existing surf line is a few metres wide instead of the ~100 m the owner's
  // footage shows.
  //
  // DEAN_BANK is that law re-fitted to the LIDAR: A = 1.08 / 60^(2/3) = 0.0705.
  // It joins the unchanged offshore law over 110-230 m, where the two cross.
  //
  // ⚠️ IT IS APPLIED ONLY INSIDE THE TWO BANKS, through zoneBed(). The steep law
  // stays everywhere else, because it is what the sand mesh, 19 judged views,
  // the rescue drop-off zone and the raid were all built and measured against.
  // Correcting it globally is the right thing to do one day and is NOT this
  // job; what is fixed here is the two places the owner asked about.
  DEAN_BANK: 0.0705, JOIN0: 110, JOIN1: 230,
  // A modest bar and trough on top, for the peak. These ARE inferred: nothing
  // below the LIDAR's low-water plane can be seen. They are small - 0.45 m of
  // relief - because the flatter measured profile is now doing the work the
  // first version's 1.45 m invented bar was doing, and that bar rendered as a
  // white blob in open water (tmp-tr71/ev/sheet_f.png).
  BAR_D: 88, BAR_AMP: 0.45, BAR_W: 26,
  TROUGH_D: 56, TROUGH_AMP: 0.25, TROUGH_W: 22,

  // The train fades out seaward of the bank so the open sea is untouched.
  D_FADE0: 130, D_FADE1: 205,

  // ---- set and lull ------------------------------------------------------
  // Two incommensurate periods so the rhythm does not read as a loop. 83 s is
  // about 11 waves at Tp, i.e. sets of 3-5 with a real lull between them.
  SET_T1: 83, SET_T2: 47, LULL: 0.42,

  // Snell's invariant: k*sin(theta) is conserved through refraction, so a
  // CONSTANT alongshore wavenumber is the physically correct way to make the
  // crests peel instead of arriving dead parallel. 15 deg at the deep-water k
  // of this period.
  KO: 0.0185,

  // MASS TRANSPORT UNDER A BREAKING WAVE, as a fraction of the textbook bore
  // flux c*H/(h+H). Linear theory's orbit is a CLOSED ellipse and carries no net
  // flow at all - which is why, before this, a breaking wave gave a rider a
  // shove and then took it straight back. A bore is different: the roller drags
  // the whole upper layer shoreward with it, and that steady push is what
  // actually carries a surfer (or a bodyboarder, or a foil) in.
  //
  // MEASURED consequence, tmp-tr71/ride.mjs: without it the eFoil at 0.18
  // throttle peaks at 3.73 m/s on the bank, just under its own 4.2 m/s takeoff,
  // so it can be nudged by a wave but can never get UP on the foil on one. With
  // it the wave can lift it onto the wing, which is the whole point.
  //
  // 0.95 of the textbook flux: MEASURED up from 0.60, which moved the eFoil at
  // 0.18 throttle from 3.08 to only 3.96 m/s - still under takeoff, so the wave
  // still could not lift it onto the foil. Only the layer above the trough moves
  // shoreward at c; see the tolerance note at the top of this file for the
  // undertow that balances it and is not modelled.
  BORE: 0.95,
  // How the bore flow decays with depth. exp(-BORE_DECAY * depth / h).
  BORE_DECAY: 0.85,

  // Depth floor for the dispersion and orbital maths. Below this the linear
  // theory blows up and nothing is riding anyway.
  H_MIN: 0.30,

  // ---- FOAM: how long whitewater lives, and how much of it there is -------
  // MEASURED, tmp-tr131. Owner's own clip
  //   G:\\DJI\\DJI FLY\\dji_fly_20250928_163318_0016_1759074148456_video.mp4
  // t = 20-100 s, 10 fps, foam fraction (luma > 185) in the mid-surf patch,
  // rows 140-162 / cols 300-450 of a 480x270 reduction:
  //
  //   in-set crest -> trough foam ratio   0.437 mean / 0.586 median (n = 7)
  //   what TAU = 2.2 + FOAM_BASE 0.12 gave  0.169 / 0.969 = 0.174
  //
  // i.e. the foam was decaying about 2.8x too fast and the surf strobed - a
  // bright band at each crest and near-bare water a second later. FOAM_TAU =
  // 9.0 rad with FOAM_BASE 0 gives 0.277 / 0.557 = 0.498, inside the bracket.
  //
  // FOAM_AMP is then set so the PHASE MEAN is unchanged: 0.28 * 9.0/(2pi) =
  // 0.401, against the old 0.80 * 2.2/(2pi) + 0.12 = 0.400. Deliberately - the
  // total amount of white on the screen is a judged, settled quantity and this
  // change is about its TIME STRUCTURE, not its level. What does drop is the
  // instantaneous crest peak, 0.968 -> 0.557, against a measured maximum of
  // 0.559 in the same patch.
  //
  // FOAM_BASE was the constant sheet that was covering for the short TAU. With
  // a correct TAU it is not needed, and it is zero.
  FOAM_TAU: 9.0, FOAM_AMP: 0.28, FOAM_BASE: 0.0,

  // The foam gate. `brk` (0.80..1.00 of the breaker limit) is the RIDER's
  // signal and is untouched. Foam is not the same quantity: whitewater from a
  // wave that broke on the bar is still on the water in the trough behind it,
  // where a/lim has fallen back to 0.62 and brk is exactly 0 - which is why the
  // trough rendered as a hard-edged bare stripe. MEASURED in the owner's frame
  // dji_fly_20250928_163832_0021 t = 15 s, full-res rows 2520-3060: the gap
  // between the two foam bands is 0.24 of the band peak, not 0.
  FOAM_BRK0: 0.47, FOAM_BRK1: 1.00,

  // Ladder geometry.
  N: 80, D_MAX: 260,
});

// Pier-space transform, from the SAME axis pier.js builds the pier on.
const D0 = PIER_DIR[0], D1 = PIER_DIR[1];
const OX = -COAST.startX, OZ = -COAST.startZ;
const COAST_Z0 = COAST.startZ;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
// THE BED
//
// ⚠️ bedBase() is a line-for-line copy of the two-law profile in
// shaders.js bedDepth(), and that is not a duplicated constant by accident: the
// shader emits ITS copy from surfChunk() below now, so there is one source and
// two call sites, exactly like mhwOffset(). If this law changes, both move.
// ---------------------------------------------------------------------------
export function bedBase(d) {
  if (d > 0) {
    const hIn = 0.155 * Math.pow(d, 2 / 3);
    const hOff = 0.2792 * Math.sqrt(d);
    return hIn + (hOff - hIn) * smoothstep(18, 70, d);
  }
  return 0;   // landward of the waterline the ribbon's own ramp takes over
}

// The bank's own bed, absolute. LIDAR-fitted inshore, the unchanged offshore
// law further out, with the bar and trough on top.
export function bedBank(d) {
  if (d <= 0) return 0;
  const hIn = SURF.DEAN_BANK * Math.pow(d, 2 / 3);
  const hOff = 0.2792 * Math.sqrt(d);
  const h = hIn + (hOff - hIn) * smoothstep(SURF.JOIN0, SURF.JOIN1, d);
  const b = (d - SURF.BAR_D) / SURF.BAR_W;
  const t = (d - SURF.TROUGH_D) / SURF.TROUGH_W;
  return h - SURF.BAR_AMP * Math.exp(-b * b) + SURF.TROUGH_AMP * Math.exp(-t * t);
}

// The bank, as a PERTURBATION on the unchanged shoreface law - which is the form
// everything downstream wants, because it makes "outside the banks nothing
// moved" a multiplication by zero rather than a claim.
export function barDelta(d) {
  if (d <= 0) return 0;
  return bedBank(d) - bedBase(d);
}

// ---------------------------------------------------------------------------
// THE LADDER. Built ONCE, in doubles, at module load. Three parallel arrays
// sampled on offshore distance:
//
//   hTab   still-water depth over the BANK profile (base law + full bar)
//   kTab   wavenumber from the full dispersion relation w^2 = g k tanh(k h)
//   phiTab cumulative phase, integral of k from the waterline seaward
//   ksTab  shoaling coefficient sqrt(cg_ref / cg), Green's law generalised
//
// Why a table and not a closed form: k(h) has no closed form, and the phase of
// a shoaling wave is the INTEGRAL of k, which cannot be evaluated per fragment.
// 80 rungs over 260 m is 3.29 m, against a 27.6 m wavelength over the bank -
// 8.4 samples per wave on a quantity (phi) that is nearly linear in between.
// ---------------------------------------------------------------------------
function dispersion(omega, h) {
  // Newton on f(k) = g k tanh(k h) - w^2, started from the Guo/Hunt-style
  // explicit approximation so three iterations are plenty. Fixed iteration
  // count: a data-dependent loop is a data-dependent instruction count.
  const w2 = omega * omega;
  const kh0 = w2 * h / G;
  let kh = kh0 / Math.sqrt(Math.tanh(kh0)) || 1e-3;
  for (let i = 0; i < 4; i++) {
    const th = Math.tanh(kh);
    const f = G * kh * th / h - w2;
    const df = G * (th + kh * (1 - th * th)) / h;
    kh -= f / df;
    if (!(kh > 1e-6)) kh = 1e-6;
  }
  return kh / h;
}

function groupSpeed(omega, k, h) {
  const kh2 = 2 * k * h;
  const sh = Math.sinh(kh2 > 30 ? 30 : kh2);
  const n = 0.5 * (1 + (kh2 > 30 ? 0 : kh2 / sh));
  return n * omega / k;
}

const OMEGA = TWO_PI / SURF.TP;

// Foam decay, resolved ONCE so the CPU sampler and surfChunk() cannot pick up
// different values. ?sdbg=nofoamlife restores the pre-tmp-tr131 numbers exactly.
const FOAM_TAU = SURF_ABL.foamLife ? SURF.FOAM_TAU : FOAM_OLD.TAU;
const FOAM_AMP = SURF_ABL.foamLife ? SURF.FOAM_AMP : FOAM_OLD.AMP;
const FOAM_BASE = SURF_ABL.foamLife ? SURF.FOAM_BASE : FOAM_OLD.BASE;
const FOAM_NORM = 1 / (1 - Math.exp(-TWO_PI / FOAM_TAU));

const LAD = (() => {
  const n = SURF.N;
  const step = SURF.D_MAX / (n - 1);
  const h = new Float64Array(n), k = new Float64Array(n);
  const phi = new Float64Array(n), ks = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const d = i * step;
    const hh = Math.max(SURF.H_MIN, bedBase(d) + barDelta(d));
    h[i] = hh;
    k[i] = dispersion(OMEGA, hh);
  }
  const cgRef = groupSpeed(OMEGA, k[n - 1], h[n - 1]);
  for (let i = 0; i < n; i++) ks[i] = Math.sqrt(cgRef / groupSpeed(OMEGA, k[i], h[i]));
  // phi(0) = 0 at the waterline, integrating seaward with the trapezoid rule.
  phi[0] = 0;
  for (let i = 1; i < n; i++) phi[i] = phi[i - 1] + 0.5 * (k[i] + k[i - 1]) * step;

  // ---- A BROKEN WAVE DOES NOT UN-BREAK ----------------------------------
  // Without this the height clip is LOCAL, so a wave that saturates on the bar
  // recovers its full unbroken height in the trough behind it and breaks all
  // over again at full size. Real waves reform in the trough SMALLER: the break
  // has taken the energy and it does not come back.
  //
  // cap[i] is the largest DEEP-WATER amplitude that could have survived to
  // rung i, i.e. the running minimum of lim/Ks over every rung the wave has
  // already passed through (seaward of i, since the train travels shoreward).
  // Two of them, over the two bed profiles the alongshore envelope blends
  // between, so the bank's cap does not leak onto the plain shoreface.
  const cap1 = new Float64Array(n), cap0 = new Float64Array(n);
  const GB2 = 0.5 * SURF.GAMMA_B;
  let m1 = Infinity, m0 = Infinity;
  // ---- THE ENVELOPE HAS TO BE INSIDE THE CAP (tmp-tr131) ------------------
  // The cap bounds the DEEP-WATER amplitude, and ampAt() spends it as
  //   a = aDeep * Ks * zoneEnv(o)
  // i.e. the alongshore envelope is applied AFTER the cap. So the cap has to be
  // the bound for the wave that is actually there, not for a wave of full
  // height. It was not, and the consequence was measured
  // (tmp-tr131/m3.mjs, o = 300 m, i.e. any part of the beach outside the banks):
  //
  //   H / h = 0.140 at EVERY offshore distance from 2 m to 162 m
  //   brk   = 0.000 everywhere, foam = 0.000 everywhere
  //
  // against a breaker index of 0.78. Once the cap binds - which it does over
  // the whole inshore half - the algebra collapses to a/lim === ENV_FLOOR, so
  // the ~82% of the shoreline that is not a bank could not break AT ALL, at any
  // wave-height control, ever. The owner's own frames of Durley Chine
  // (dji_fly_20250928_163832_0021 t=15 s; dji_fly_..._0016 t=5/40/80 s), about
  // 800 m west of the pier and nowhere near either bank, show a continuous
  // break with two foam bands - which is also what this file's own note on
  // ENV_FLOOR claims is happening.
  //
  // Dividing the plain cap by the envelope it is about to be multiplied by
  // makes each cap the bound for its own wave: the banks are untouched
  // (zoneEnv = 1 at the bank centre, so cap1 was already right), and the rest
  // of the beach now shoals a 0.18x wave up to ITS OWN breaker line and breaks
  // there - closer in, in shallower water, in a narrower band. The banks stay
  // special by geometry instead of by a clamp.
  const ENV_REF = SURF_ABL.beachBreak ? SURF.ENV_FLOOR : 1;
  for (let i = n - 1; i >= 0; i--) {
    const d = i * step;
    const hBank = Math.max(SURF.H_MIN, bedBase(d) + barDelta(d));
    const hPlain = Math.max(SURF.H_MIN, bedBase(d));
    const ksBank = ks[i];
    // The plain shoreface has its own ladder for Ks; over the depths that
    // matter the two differ by under 10%, and using the bank's Ks here is a
    // deliberate simplification that keeps ONE ladder. Stated, not hidden.
    m1 = Math.min(m1, GB2 * hBank / ksBank);
    m0 = Math.min(m0, GB2 * hPlain / (ksBank * ENV_REF));
    cap1[i] = m1; cap0[i] = m0;
  }
  return { n, step, h, k, phi, ks, cap1, cap0 };
})();

export const LADDER = LAD;

// ---------------------------------------------------------------------------
// SET AND LULL. Closed form, no state, so CPU and GPU agree bit for bit and a
// replay is identical. Two sinusoids, softened by a smoothstep so the lulls are
// longer than the sets, which is what a real groundswell does.
// ---------------------------------------------------------------------------
export function setFactor(t) {
  const g1 = Math.sin(TWO_PI * t / SURF.SET_T1);
  const g2 = Math.sin(TWO_PI * t / SURF.SET_T2 + 1.7);
  const s = 0.5 + 0.5 * (0.65 * g1 + 0.35 * g2);
  return SURF.LULL + (1 - SURF.LULL) * smoothstep(0.30, 0.86, s);
}

// The phase the shader is handed. TIME NEVER ENTERS THE SHADER, for exactly the
// reason sea-glsl.js gives: a float32 "phi - omega*t" decays to phase noise
// inside a long session. Wrapped here, in doubles.
export function surfTimePhase(t) {
  let p = OMEGA * t;
  p -= TWO_PI * Math.round(p * INV_TWO_PI);
  return p;
}

// ---------------------------------------------------------------------------
// THE ALONGSHORE ENVELOPE — where the banks are.
//
// o is pier-space offset: 0 on the pier centreline, positive east (the Boscombe
// side). Two raised-cosine banks at +/-ZONE_O, a notch over the structure, and
// a floor everywhere else so the rest of the beach still has surf.
// ---------------------------------------------------------------------------
export function zoneEnv(o) {
  // THE ARENA HAS NO SURVEYED BANKS AND NONE WERE INVENTED. Bournemouth's two
  // banks are a real feature of a real beach, measured off the owner's frames;
  // at Handfast Point there is no bathymetry at all (sea-shore.js), so the
  // envelope is flat and the train has the same height everywhere along the
  // shore. That is the honest default, not a gap left open.
  if (SHORE_ON) return 1;
  const a = (Math.abs(o) - SURF.ZONE_O) / SURF.ZONE_W;
  const bank = Math.exp(-a * a);
  const notch = smoothstep(SURF.PIER_GAP * 0.45, SURF.PIER_GAP, Math.abs(o));
  return (SURF.ENV_FLOOR + (1 - SURF.ENV_FLOOR) * bank) * notch;
}

// How much of the BED perturbation applies here. The banks are local: outside
// them the bed is the unchanged shoreface law, so every judged pixel away from
// the pier sits over the same seabed it always did.
export function zoneBed(o) {
  if (SHORE_ON) return 0;             // no banks: the bed is the shoreface law
  const a = (Math.abs(o) - SURF.ZONE_O) / SURF.ZONE_W;
  return Math.exp(-a * a) * smoothstep(SURF.PIER_GAP * 0.45, SURF.PIER_GAP, Math.abs(o));
}

// ---------------------------------------------------------------------------
// WORLD -> SHORE COORDINATES
// ---------------------------------------------------------------------------
// d = metres seaward of mean high water, the SAME quantity shaders.js calls
//     shoreD, from the SAME mhwOffset() table.
// o = pier-space alongshore offset.
const _sf = [0, 0, 0];
export function shoreCoords(x, z, out) {
  if (SHORE_ON) {
    // ARENA. d is the signed distance to the surveyed waterline and gx/gz is
    // its unit gradient - the shore normal - which the caller needs to turn a
    // cross-shore slope into a world one. o is 0 and stays 0: the alongshore
    // coordinate only ever fed the two banks and the peel, and neither survives
    // at a headland. SURF.KO is dropped with it, which is not a simplification
    // but the shallow-water refraction limit: crests become iso-distance
    // contours of the shoreline and wrap the point, which is what a real swell
    // does round a headland.
    shoreField(x, z, _sf);
    out.d = _sf[0];
    out.o = 0;
    out.w = 40;
    out.gx = _sf[1];
    out.gz = _sf[2];
    return out;
  }
  const w = mhwOffset(x + COAST.startX);
  const u = x - OX, v = z - OZ;
  out.d = z - (w - COAST_Z0);
  out.o = u * D1 - v * D0;
  out.w = w;
  out.gx = -(mhwOffset(x + COAST.startX + 4) - mhwOffset(x + COAST.startX - 4)) / 8;
  out.gz = 1;
  return out;
}

// Local seabed depth, bank included. This is what the surf breaks on.
export function surfBed(x, z) {
  if (SHORE_ON) {
    const d = shoreField(x, z, _sf)[0];
    return d <= 0 ? 0 : Math.max(0, bedBase(d));
  }
  const w = mhwOffset(x + COAST.startX);
  const d = z - (w - COAST_Z0);
  if (d <= 0) return 0;
  const u = x - OX, v = z - OZ;
  const o = u * D1 - v * D0;
  return Math.max(0, bedBase(d) + barDelta(d) * zoneBed(o));
}

// ---------------------------------------------------------------------------
// THE SAMPLER
//
//   surfSample(x, z, t, depth, ctl, out)
//
// Never allocates; `out` is a caller-owned struct. All six arguments required.
// Returns out with:
//   eta    m, elevation above still water
//   sx, sz d(eta)/dx, d(eta)/dz  (Eulerian, of this train alone)
//   ux,uy,uz  m/s orbital velocity at `depth` below the surface
//   h      m, local still-water depth (bank included)
//   amp    m, the train's local amplitude AFTER the breaker clip
//   brk    0..1, how hard this patch is breaking
//   foam   0..1, whitewater coverage from this train
//   c      m/s, local wave celerity - what a rider has to match
// ---------------------------------------------------------------------------
export function makeSurfSlot() {
  return {
    eta: 0, sx: 0, sz: 0, ux: 0, uy: 0, uz: 0,
    h: 0, amp: 0, brk: 0, foam: 0, foamMean: 0, c: 0, d: 0, o: 0, chi: 0, active: 0,
  };
}

const _sc = { d: 0, o: 0, w: 0, gx: 0, gz: 1 };

// Table read, linear, clamped. Fills the module-local rung. ⚠️ CALLERS MUST
// COPY what they need out before calling ampAt(), which reads the ladder again
// at a different d.
let _th = 0, _tk = 0, _tphi = 0, _tks = 0, _tc1 = 0, _tc0 = 0;
function ladderAt(d) {
  const L = LAD;
  const u = d / L.step;
  const last = L.n - 1;
  if (u <= 0) {
    _th = L.h[0]; _tk = L.k[0]; _tphi = u * L.step * L.k[0]; _tks = L.ks[0];
    _tc1 = L.cap1[0]; _tc0 = L.cap0[0];
    return;
  }
  if (u >= last) {
    _th = L.h[last]; _tk = L.k[last];
    _tphi = L.phi[last] + (d - last * L.step) * L.k[last]; _tks = L.ks[last];
    _tc1 = L.cap1[last]; _tc0 = L.cap0[last];
    return;
  }
  const i = u | 0, f = u - i;
  _th = L.h[i] + (L.h[i + 1] - L.h[i]) * f;
  _tk = L.k[i] + (L.k[i + 1] - L.k[i]) * f;
  _tphi = L.phi[i] + (L.phi[i + 1] - L.phi[i]) * f;
  _tks = L.ks[i] + (L.ks[i + 1] - L.ks[i]) * f;
  _tc1 = L.cap1[i] + (L.cap1[i + 1] - L.cap1[i]) * f;
  _tc0 = L.cap0[i] + (L.cap0[i + 1] - L.cap0[i]) * f;
}

// Amplitude envelope at (d, o) for a given set factor and control. Split out
// because the cross-shore SLOPE of the amplitude matters near the break, where
// it falls faster than the phase term - a central difference on this is two
// table reads and no trig.
function ampAt(d, o, sc, ctl) {
  if (d <= 0.2) return 0;
  const dFade = 1 - smoothstep(SURF.D_FADE0, SURF.D_FADE1, d);
  if (dFade <= 0) return 0;
  ladderAt(d);
  const zb = zoneBed(o);
  const hLoc = Math.max(SURF.H_MIN, bedBase(d) + barDelta(d) * zb);
  // Deep-water amplitude in this column, then the "has already broken" cap,
  // then shoaling, then the local breaker clip. That order matters: the cap is
  // on the deep-water equivalent, so it travels with the wave.
  const aDeep = Math.min(0.5 * SURF.H0 * sc * ctl, _tc0 + (_tc1 - _tc0) * zb);
  let a = aDeep * _tks * zoneEnv(o) * dFade;
  // BREAKER CLIP. Height cannot pass gamma*h; the transition is smoothed over
  // 0.85..1.05 of the limit so the crest rounds over instead of cornering.
  const lim = 0.5 * SURF.GAMMA_B * hLoc;
  if (a > lim * 0.85) {
    const s = smoothstep(0.85, 1.05, a / Math.max(lim, 1e-4));
    a = a * (1 - s) + lim * s;
  }
  return a;
}

export function surfSample(x, z, t, depth, ctl, out) {
  out.eta = 0; out.sx = 0; out.sz = 0;
  out.ux = 0; out.uy = 0; out.uz = 0;
  out.brk = 0; out.foam = 0; out.foamMean = 0; out.active = 0;

  shoreCoords(x, z, _sc);
  const d = _sc.d, o = _sc.o;
  out.d = d; out.o = o;

  if (d <= 0.2 || d >= SURF.D_FADE1 || ctl <= 0) {
    out.h = Math.max(0, bedBase(d)); out.amp = 0; out.c = 0; out.chi = 0;
    return out;
  }

  ladderAt(d);
  const k = _tk, phi = _tphi;
  const hLoc = Math.max(SURF.H_MIN, bedBase(d) + barDelta(d) * zoneBed(o));
  out.h = hLoc;
  out.c = Math.sqrt(G * hLoc);

  const sc = setFactor(t);
  const a = ampAt(d, o, sc, ctl);
  out.amp = a;
  if (a <= 1e-5) { out.chi = 0; return out; }
  out.active = 1;

  // How close to breaking, as a fraction of the limit. Drives the crest skew,
  // the foam and the "you are about to be dumped" signal the rider reads.
  const lim = 0.5 * SURF.GAMMA_B * hLoc;
  const brk = smoothstep(0.80, 1.00, a / Math.max(lim, 1e-4));
  out.brk = brk;
  // The FOAM gate, which is deliberately not the rider's `brk`. See
  // SURF.FOAM_BRK0 for the measurement that sets it.
  const brkF = SURF_ABL.foamWash
    ? smoothstep(SURF.FOAM_BRK0, SURF.FOAM_BRK1, a / Math.max(lim, 1e-4))
    : brk;

  // PHASE. psi runs with offshore distance (so the wave travels shoreward) and
  // carries a constant alongshore wavenumber, which is Snell's refraction
  // invariant and is what makes the crests peel rather than arrive parallel.
  let psi = phi + SURF.KO * o + OMEGA * t;
  psi -= TWO_PI * Math.round(psi * INV_TWO_PI);

  // CREST SKEW. chi = psi + q sin psi sharpens the crest and flattens the
  // trough, which is what a shoaling wave does, without the folding a Gerstner
  // displacement would risk (dchi/dpsi = 1 + q cos psi > 0 for q < 1).
  const q = Math.min(0.85, 3.2 * a * k + 0.35 * brk);
  const sp = Math.sin(psi);
  const chi = psi + q * sp;
  out.chi = chi;
  const cc = Math.cos(chi), ss = Math.sin(chi);
  // Zero-mean: the mean of cos(psi + q sin psi) over a period is -J1(q).
  const j1 = q * 0.5 - q * q * q * 0.0625;

  out.eta = a * (cc + j1);

  // ---- slope -------------------------------------------------------------
  // d(chi)/d(psi), and d(psi) in each of the two shore coordinates.
  const dchi = 1 + q * Math.cos(psi);
  const dEta_dpsi = -a * ss * dchi;
  // Cross-shore amplitude gradient. It is NOT negligible at the break, where a
  // falls by half over a wavelength; away from it the phase term is ~10x bigger.
  const dA = (ampAt(d + 3, o, sc, ctl) - ampAt(d - 3, o, sc, ctl)) / 6;
  const dEta_dd = dEta_dpsi * k + dA * (cc + j1);
  const dEta_do = dEta_dpsi * SURF.KO;

  // d and o in world terms. The gradient of d came out of shoreCoords() and is
  // the one number that differs between the two shore models: Bournemouth's is
  // (-mhw', 1) - the beach's own along-X tilt, 0.023 at its steepest, carried
  // rather than dropped so the surf line follows the sand - and the arena's is
  // the distance field's unit gradient, i.e. the local shore normal.
  const gdx = _sc.gx, gdz = _sc.gz;
  out.sx = dEta_dd * gdx + dEta_do * D1;
  out.sz = dEta_dd * gdz + dEta_do * (-D0);

  // ---- orbital velocity --------------------------------------------------
  // Linear theory in finite depth, which is the whole point of shoaling: in
  // shallow water u -> a*omega/(k*h), i.e. the shoreward surge grows as the
  // bed comes up. That surge is what pushes a rider along.
  const kh = Math.min(6, k * hLoc);
  const shk = Math.sinh(kh);
  const dd = depth > 0 ? depth : 0;
  const zz = Math.max(0, hLoc - dd);
  const kz = Math.min(6, k * zz);
  let Ru = Math.cosh(kz) / (shk > 1e-4 ? shk : 1e-4);
  let Rw = Math.sinh(kz) / (shk > 1e-4 ? shk : 1e-4);
  // Cap the horizontal orbit at the celerity: u = c IS the breaking condition,
  // and past it the linear expression is meaningless rather than merely wrong.
  const uMax = 1.15 * out.c;
  const uAmp = a * OMEGA * Ru;
  if (uAmp > uMax) { const s = uMax / uAmp; Ru *= s; Rw *= s; }

  // The bore's steady shoreward drift, on top of the oscillating orbit.
  const H = 2 * a;
  const uBore = brk * SURF.BORE * out.c * H / (hLoc + H)
    * Math.exp(-SURF.BORE_DECAY * dd / Math.max(hLoc, 0.3));

  const u = a * OMEGA * Ru * cc + uBore;
  const w = a * OMEGA * Rw * ss;
  // The wavenumber VECTOR in world terms: k along the cross-shore axis (which
  // is +Z, tilted by the beach's own along-X gradient) plus SURF.KO along the
  // pier-space alongshore axis. Travel is along -(kx, kz)/|k| - shoreward.
  const kxw = SURF.KO * D1 + k * gdx;
  const kzw = k * gdz - SURF.KO * D0;
  const kmag = Math.hypot(kxw, kzw) || 1;
  out.ux = -u * (kxw / kmag);
  out.uz = -u * (kzw / kmag);
  out.uy = w;

  // ---- whitewater --------------------------------------------------------
  // Born at the crest of a breaking wave, trailing SEAWARD of it (the wave runs
  // on shoreward and leaves the foam behind) and decaying with phase age.
  //
  // ⚠️ THE FIRST VERSION OF THIS ADDED A CONSTANT RESIDUAL SHEET and it was
  // wrong in a way that only showed up in a render: because the amplitude is
  // CLIPPED to the breaker limit, a/lim is exactly 1 everywhere inside the
  // break, so the sheet was a flat 0.55 over the whole inner surf zone and the
  // beach rendered as one solid white band 100 m wide with no structure in it
  // (tmp-tr71/ev/a0_first.png). The reference shows the opposite: bright BANDS
  // with dark green water between them.
  //
  // So the residual is not a constant - it is the sum of the trails of all the
  // PREVIOUS crests, which is a geometric series in the decay and has the
  // banding built in. TAU = 2.2 rad leaves 6% of a crest's foam behind by the
  // time the next one arrives, so the series converges in three waves and the
  // steady-state closed form below is exact rather than truncated.
  //
  // FOAM_BASE is the part that is not phase-locked at all: churned water the
  // bores have left in the trough, which the footage does show as a permanent
  // pale wash inside the break even between crests.
  //
  // tmp-tr131 changed two things here and nothing else. (a) TAU 2.2 -> 9.0 rad,
  // MEASURED - see SURF.FOAM_TAU above; the amplitude moves with it so the
  // phase mean is unchanged to 3 decimal places and only the time structure
  // differs. (b) the gate: foam now ramps from FOAM_BRK0, not from brk's 0.80,
  // so whitewater survives across the trough between the two break lines
  // instead of stopping dead at a hard edge.
  let ph = chi;
  ph -= TWO_PI * Math.round(ph * INV_TWO_PI);
  const age = ph >= 0 ? ph : ph + TWO_PI;         // rad since the crest passed
  const trail = Math.exp(-age / FOAM_TAU) * FOAM_NORM;
  out.foam = Math.min(1, brkF * (trail * FOAM_AMP + FOAM_BASE));
  // Its own phase average, for callers that are looking at more than a
  // wavelength of sea per pixel and must not latch onto whichever phase the
  // sample centre landed on.
  // The mean of exp(-u/tau)/(1-exp(-2pi/tau)) over a full period is exactly
  // tau/2pi, so this is closed form, not a fit.
  out.foamMean = brkF * (FOAM_AMP * (FOAM_TAU / TWO_PI) + FOAM_BASE);

  return out;
}

// ---------------------------------------------------------------------------
// GLSL. The same functions, emitted, with the ladder baked in as const arrays
// built by the code above - so the shader cannot hold a stale ladder.
//
// Uniforms the caller must set:
//   uSurfPhase  wrap(omega * t)        from surfTimePhase()
//   uSurfSet    setFactor(t)
//   uSurfCtl    the wave-height control
// ---------------------------------------------------------------------------
const f = (v) => {
  const s = v.toFixed(5);
  return s.indexOf('.') < 0 ? s + '.0' : s;
};

export function surfChunk() {
  const L = LAD;
  const hs = [], ks = [], ph = [], kk = [], c1 = [], c0 = [];
  for (let i = 0; i < L.n; i++) {
    hs.push(f(L.h[i])); ks.push(f(L.ks[i])); ph.push(f(L.phi[i])); kk.push(f(L.k[i]));
    c1.push(f(L.cap1[i])); c0.push(f(L.cap0[i]));
  }
  return `
// ---------------------------------------------------------------------------
// SURF - generated by src/sea-surf.js from the SAME ladder the CPU sampler uses.
// Do not hand-edit; do not duplicate. tmp-tr71/RESULT.md has the evidence.
// ---------------------------------------------------------------------------
#define SURF_N ${L.n}
const float SURF_STEP   = ${f(L.step)};
const float SURF_OMEGA  = ${f(OMEGA)};
const float SURF_GAMMAB = ${f(SURF.GAMMA_B)};
const float SURF_H0     = ${f(SURF.H0)};
const float SURF_KO     = ${f(SHORE_ON ? 0 : SURF.KO)};
const float SURF_HMIN   = ${f(SURF.H_MIN)};
const float SURF_BORE   = ${f(SURF.BORE)};
const float SURF_ZO     = ${f(SURF.ZONE_O)};
const float SURF_ZW     = ${f(SURF.ZONE_W)};
const float SURF_GAP    = ${f(SURF.PIER_GAP)};
const float SURF_FLOOR  = ${f(SURF.ENV_FLOOR)};
const float SURF_BARD   = ${f(SURF.BAR_D)};
const float SURF_BARA   = ${f(SURF.BAR_AMP)};
const float SURF_BARW   = ${f(SURF.BAR_W)};
const float SURF_TRD    = ${f(SURF.TROUGH_D)};
const float SURF_TRA    = ${f(SURF.TROUGH_AMP)};
const float SURF_TRW    = ${f(SURF.TROUGH_W)};
const float SURF_DEANB  = ${f(SURF.DEAN_BANK)};
const float SURF_JOIN0  = ${f(SURF.JOIN0)};
const float SURF_JOIN1  = ${f(SURF.JOIN1)};
const float SURF_FADE0  = ${f(SURF.D_FADE0)};
const float SURF_FADE1  = ${f(SURF.D_FADE1)};
const float SURF_FTAU   = ${f(FOAM_TAU)};
const float SURF_FNORM  = ${f(FOAM_NORM)};
const float SURF_FAMP   = ${f(FOAM_AMP)};
const float SURF_FBASE  = ${f(FOAM_BASE)};
const float SURF_FBRK0  = ${f(SURF_ABL.foamWash ? SURF.FOAM_BRK0 : 0.80)};
const float SURF_FBRK1  = ${f(SURF_ABL.foamWash ? SURF.FOAM_BRK1 : 1.00)};
const vec2  SURF_DIR    = vec2(${f(D0)}, ${f(D1)});
const float SURF_OXX    = ${f(OX)};
const float SURF_OZZ    = ${f(OZ)};

const float SURF_H[SURF_N]   = float[SURF_N](${hs.join(', ')});
const float SURF_K[SURF_N]   = float[SURF_N](${kk.join(', ')});
const float SURF_PHI[SURF_N] = float[SURF_N](${ph.join(', ')});
const float SURF_KS[SURF_N]  = float[SURF_N](${ks.join(', ')});
const float SURF_C1[SURF_N]  = float[SURF_N](${c1.join(', ')});
const float SURF_C0[SURF_N]  = float[SURF_N](${c0.join(', ')});

uniform float uSurfPhase;   // wrap(omega * t), computed on the CPU in doubles
uniform float uSurfSet;     // set/lull factor
uniform float uSurfCtl;     // wave-height control, 0 = off

float surfBedBase(float d) {
  if (d <= 0.0) return 0.0;
  float hIn  = 0.155 * pow(d, 0.66667);
  float hOff = 0.2792 * sqrt(d);
  return mix(hIn, hOff, smoothstep(18.0, 70.0, d));
}

float surfBedBank(float d) {
  if (d <= 0.0) return 0.0;
  float hIn  = SURF_DEANB * pow(d, 0.66667);
  float hOff = 0.2792 * sqrt(d);
  float h = mix(hIn, hOff, smoothstep(SURF_JOIN0, SURF_JOIN1, d));
  float b = (d - SURF_BARD) / SURF_BARW;
  float t = (d - SURF_TRD) / SURF_TRW;
  return h - SURF_BARA * exp(-b * b) + SURF_TRA * exp(-t * t);
}

float surfBarDelta(float d) {
  if (d <= 0.0) return 0.0;
  return surfBedBank(d) - surfBedBase(d);
}

float surfZoneBed(float o) {${SHORE_ON ? `
  // ARENA: no surveyed banks, so no bed perturbation. The bed is the shoreface
  // law and nothing else, and "outside the banks nothing moved" is a
  // multiplication by zero here rather than a claim.
  return 0.0;` : `
  float a = (abs(o) - SURF_ZO) / SURF_ZW;
  return exp(-a * a) * smoothstep(SURF_GAP * 0.45, SURF_GAP, abs(o));`}
}

float surfZoneEnv(float o) {${SHORE_ON ? `
  // ARENA: a flat alongshore envelope. SURF_KO is 0 to match, so the crests are
  // iso-distance contours of the shoreline and wrap the headland - the
  // shallow-water refraction limit, which is also the only thing a distance
  // field can say without a wave-ray solver. Bournemouth's peel is a real
  // measured feature of a straight beach and does not transfer.
  return 1.0;` : `
  float a = (abs(o) - SURF_ZO) / SURF_ZW;
  return (SURF_FLOOR + (1.0 - SURF_FLOOR) * exp(-a * a))
       * smoothstep(SURF_GAP * 0.45, SURF_GAP, abs(o));`}
}

// Pier-space alongshore offset.
float surfOffset(vec2 p) {
  vec2 uv = vec2(p.x - SURF_OXX, p.y - SURF_OZZ);
  return uv.x * SURF_DIR.y - uv.y * SURF_DIR.x;
}

// Ladder read. h, k, phi, ks packed into one vec4 so the four const arrays are
// indexed once each.
vec4 surfLadder(float d) {
  float u = clamp(d / SURF_STEP, 0.0, float(SURF_N - 1) - 0.001);
  int i = int(u);
  float fr = u - float(i);
  float extra = max(0.0, d - float(SURF_N - 1) * SURF_STEP) * SURF_K[SURF_N - 1];
  return vec4(
    mix(SURF_H[i],   SURF_H[i + 1],   fr),
    mix(SURF_K[i],   SURF_K[i + 1],   fr),
    mix(SURF_PHI[i], SURF_PHI[i + 1], fr) + extra,
    mix(SURF_KS[i],  SURF_KS[i + 1],  fr));
}

// The "has already broken" cap, same running minimum the CPU ladder carries.
vec2 surfCap(float d) {
  float u = clamp(d / SURF_STEP, 0.0, float(SURF_N - 1) - 0.001);
  int i = int(u);
  float fr = u - float(i);
  return vec2(mix(SURF_C0[i], SURF_C0[i + 1], fr), mix(SURF_C1[i], SURF_C1[i + 1], fr));
}

float surfAmp(float d, float o) {
  if (d <= 0.2) return 0.0;
  float dF = 1.0 - smoothstep(SURF_FADE0, SURF_FADE1, d);
  if (dF <= 0.0) return 0.0;
  vec4 L = surfLadder(d);
  float zb = surfZoneBed(o);
  float hLoc = max(SURF_HMIN, surfBedBase(d) + surfBarDelta(d) * zb);
  vec2 cap = surfCap(d);
  float aDeep = min(0.5 * SURF_H0 * uSurfSet * uSurfCtl, mix(cap.x, cap.y, zb));
  float a = aDeep * L.w * surfZoneEnv(o) * dF;
  float lim = 0.5 * SURF_GAMMAB * hLoc;
  float s = smoothstep(0.85, 1.05, a / max(lim, 1e-4));
  return mix(a, lim, s);
}

// ---------------------------------------------------------------------------
// FOAM TEXTURE. Whitewater is not a flat wash - it is cells and streaks, and
// without them a correct foam MASK still renders as fog (tmp-tr71/ev/sheet_g.png).
//
// Value noise on an integer lattice, two octaves, no texture fetch and no
// uniform: it has to be callable from a chunk that is shared with a CPU sampler
// that has no textures at all.
//
// ⚠️ IT IS STATIC IN WORLD SPACE, and that is a stated shortcut rather than an
// accident. Foam really drifts with the bore, and indexing the noise on the
// wave's own Lagrangian coordinate is the correct fix - but that coordinate is
// phi(d) + omega*t, and omega*t has to reach the shader WRAPPED (float32), so it
// jumps by one wavelength every period and the texture would pop. What moves
// here is the COVERAGE, which is phase-locked and does travel; the texture only
// breaks its edge up. At the scale it is used (1-4 m cells) that reads
// correctly, and a still frame cannot tell the difference.
float surfHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float surfNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = surfHash(i), b = surfHash(i + vec2(1.0, 0.0));
  float c = surfHash(i + vec2(0.0, 1.0)), d = surfHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Stretched ALONG the shore, because foam streaks lie along the crest that made
// them, not across it.
float surfFoamTex(vec2 p) {
  vec2 q = vec2(p.x * 0.40, p.y * 1.05);
  return surfNoise(q * 0.5) * 0.58 + surfNoise(q * 1.75) * 0.42;
}

// The phase AVERAGE of the foam below, for a pixel that spans more than a
// wavelength. Closed form: the mean of exp(-u/tau)/(1-exp(-2pi/tau)) over a full
// period is exactly tau/2pi.
float surfFoamMean(float brkF) { return brkF * (SURF_FAMP * (SURF_FTAU / 6.2831853) + SURF_FBASE); }

// The train, at world XZ. shoreD is passed in because the caller already has it
// (shaders.js computes it for the foam) and it is the one place the MHW table
// is read.
//   out x = eta, y = d(eta)/d(shoreD), z = breaking 0..1, w = foam 0..1
// chiOut carries the skewed phase so the caller can shape foam with it.
vec4 surfTrain(vec2 p, float shoreD, out float chiOut, out float hOut, out float ampOut) {
  float o = surfOffset(p);
  hOut = max(0.0, surfBedBase(shoreD));
  chiOut = 0.0; ampOut = 0.0;
  if (shoreD <= 0.2 || shoreD >= SURF_FADE1 || uSurfCtl <= 0.0) return vec4(0.0);
  vec4 L = surfLadder(shoreD);
  float k = L.y;
  float hLoc = max(SURF_HMIN, surfBedBase(shoreD) + surfBarDelta(shoreD) * surfZoneBed(o));
  hOut = hLoc;
  float a = surfAmp(shoreD, o);
  ampOut = a;
  if (a <= 1e-5) return vec4(0.0);
  float lim = 0.5 * SURF_GAMMAB * hLoc;
  float brk = smoothstep(0.80, 1.00, a / max(lim, 1e-4));
  float brkF = smoothstep(SURF_FBRK0, SURF_FBRK1, a / max(lim, 1e-4));

  float psi = L.z + SURF_KO * o + uSurfPhase;
  float q = min(0.85, 3.2 * a * k + 0.35 * brk);
  float sp = sin(psi);
  float chi = psi + q * sp;
  chiOut = chi;
  float cc = cos(chi), ss = sin(chi);
  float j1 = q * 0.5 - q * q * q * 0.0625;
  float eta = a * (cc + j1);
  float dchi = 1.0 + q * cos(psi);
  float dEta = -a * ss * dchi * k + (surfAmp(shoreD + 3.0, o) - surfAmp(shoreD - 3.0, o)) / 6.0 * (cc + j1);

  float ph = chi - 6.2831853 * floor(chi / 6.2831853 + 0.5);
  float age = ph >= 0.0 ? ph : ph + 6.2831853;
  float trail = exp(-age / SURF_FTAU) * SURF_FNORM;
  float foam = min(1.0, brkF * (trail * SURF_FAMP + SURF_FBASE));
  return vec4(eta, dEta, brk, foam);
}
`;
}
