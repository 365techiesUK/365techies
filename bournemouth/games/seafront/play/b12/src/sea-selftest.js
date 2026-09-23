// SEA ASSERTIONS.
//
// seaChecks() -> [{ name, pass, detail }], the same shape src/selftest.js uses,
// so the browser V key and node tools/gate-check.mjs run one implementation and
// cannot disagree.
//
// Builds its own Sea instances. Imports nothing from sim.js, plant.js or
// src/gl/* - these checks are about the water, not about the boat.
//
// Note on the one clock reference: check 20 has to MEASURE table build time, so
// it reads globalThis.performance (present in both node and the browser) with a
// fallback. sea.js, sea-state.js and sea-glsl.js contain no clock reference at
// all, which is the property that actually matters for determinism.

import { Sea, DEFAULT_SEED, UBO_FLOATS } from './sea.js';
// tmp-tr147: the shore model. sea-shore.js is data and arithmetic only - it
// pulls in the arena's baked DSM but nothing that draws - so this file's
// standing rule (no sim.js, no plant.js, no src/gl builder) still holds.
import { SHORE, SHORE_ON, SHORE_PACK, shoreField } from './sea-shore.js';
import {
  MAX_WAVES, N_PHYS, N_VERTEX, G, TWO_PI,
  SEA_PRESETS, DEFAULT_PRESET, SEA_TABLE_HASH_POOLE, REFERENCE_POOLE,
} from './sea-state.js';
import {
  SURF, LADDER, surfChunk, surfSample, makeSurfSlot, setFactor, surfTimePhase, shoreCoords,
} from './sea-surf.js';

const SLOT_KEYS = ['height', 'slopeX', 'slopeZ', 'orbX', 'orbY', 'orbZ',
  'nx', 'ny', 'nz', 'jac', 'x0', 'z0'];

// ---------------------------------------------------------------------------
// WHERE THE SURF IS, in whichever shore model is live (tmp-tr147).
//
// Two checks below sample "the surf zone" by hard-coded Bournemouth world
// coordinates. Under EFOIL_ARENA that water is 8.7 km away and open, so they
// silently measured NOTHING - 0 in-surf samples and a vacuous pass. A check
// that cannot fail is worse than no check, so the points come from here.
function surfZonePoints(n) {
  const pts = [];
  if (SHORE_ON) {
    for (let i = 0; i < n * 40 && pts.length < n; i++) {
      const x = SHORE.x0 + ((i * 137.7) % (SHORE.x1 - SHORE.x0));
      const z = SHORE.z0 + ((i * 91.3) % (SHORE.z1 - SHORE.z0));
      const d = shoreField(x, z)[0];
      if (d > 1 && d < SURF.D_FADE1 - 5) pts.push([x, z]);
    }
  } else {
    for (let i = 0; i < n; i++) {
      pts.push([-390 + ((i * 7.31) % 320), -298 + ((i * 3.97) % 230)]);
    }
  }
  return pts;
}

const PRESET_KEYS = Object.keys(SEA_PRESETS).filter((k) => SEA_PRESETS[k] !== null);

function now() {
  const p = globalThis.performance;
  return p && typeof p.now === 'function' ? p.now() : 0;
}

// The Gerstner surface at an UNDISPLACED coordinate, written out longhand from
// the same arrays the sampler reads. Used to prove the sampler inverts, and
// that its orbital velocity really is d/dt of the particle it claims.
function lagrangian(sea, x0, z0, t, d, out) {
  let Dx = 0, Dz = 0, H = 0;
  for (let i = 0; i < sea.nPhys; i++) {
    const psi = sea.k[i] * (sea.dx[i] * x0 + sea.dz[i] * z0) - sea.omega[i] * t + sea.phase[i];
    const dec = Math.exp(-sea.k[i] * d);
    const qa = sea.Q[i] * sea.amp[i] * dec;
    Dx += qa * sea.dx[i] * Math.sin(psi);
    Dz += qa * sea.dz[i] * Math.sin(psi);
    H += sea.amp[i] * dec * Math.cos(psi);
  }
  out[0] = x0 - Dx; out[1] = sea.tide + H; out[2] = z0 - Dz;
  return out;
}

// A JS transcription of the emitted seaSurface(), reading the PACKED UBO rather
// than the Float64 table, restricted to tier 0. If this agrees with the CPU
// sampler then the shader and the sampler are the same surface - which is the
// entire point of "ONE WAVE TABLE".
function glslEmulateTier0(ubo, p0x, p0z, tide, out) {
  let Dx = 0, Dz = 0, H = 0, Ex = 0, Ez = 0, Jxx = 0, Jzz = 0, Jxz = 0;
  for (let i = 0; i < N_PHYS; i++) {
    const ax = ubo[i * 4], az = ubo[i * 4 + 1], a = ubo[i * 4 + 3];
    const ph = ubo[MAX_WAVES * 4 + i * 4];
    const Q = ubo[MAX_WAVES * 4 + i * 4 + 1];
    const k = ubo[MAX_WAVES * 4 + i * 4 + 2];
    const invk = k > 0 ? 1 / k : 0;
    const dx = ax * invk, dz = az * invk;
    const psi = ax * p0x + az * p0z + ph;
    const S = Math.sin(psi), C = Math.cos(psi);
    const qa = Q * a, qak = qa * k;
    Dx += qa * dx * S; Dz += qa * dz * S;
    H += a * C;
    Ex += a * k * dx * S; Ez += a * k * dz * S;
    Jxx += qak * dx * dx * C; Jzz += qak * dz * dz * C; Jxz += qak * dx * dz * C;
  }
  out[0] = p0x - Dx; out[1] = tide + H; out[2] = p0z - Dz;
  out[3] = Ex * (1 - Jzz) + Ez * Jxz;
  out[4] = (1 - Jxx) * (1 - Jzz) - Jxz * Jxz;
  out[5] = Ez * (1 - Jxx) + Ex * Jxz;
  return out;
}

export function seaChecks() {
  const out = [];
  const add = (name, pass, detail) => out.push({ name, pass, detail: String(detail) });

  const sea = new Sea();

  // 2 first in construction order, reported in contract order below.
  const flatOk = sea.isFlat && sea.nActive === 0 && sea.nPhys === 0 && sea.stateName === 'flat';
  const f = sea.sample(12.5, -7.25, 3.5, 0.75, 0);
  let flatFields = f.height === sea.tide && f.slopeX === 0 && f.slopeZ === 0 &&
    f.orbX === 0 && f.orbY === 0 && f.orbZ === 0 &&
    f.nx === 0 && f.ny === 1 && f.nz === 0 && f.jac === 1 &&
    f.x0 === 12.5 && f.z0 === -7.25;
  for (let i = 0; i < SLOT_KEYS.length; i++) if (!Number.isFinite(f[SLOT_KEYS[i]])) flatFields = false;

  sea.setState(DEFAULT_PRESET, DEFAULT_SEED);

  // ---- 1. table hash -----------------------------------------------------
  add('sea table hash', sea.tableHash === SEA_TABLE_HASH_POOLE,
    `${sea.tableHash} (locked ${SEA_TABLE_HASH_POOLE}, ${DEFAULT_PRESET} @ seed ${DEFAULT_SEED})`);

  // ---- 2. flat by default -------------------------------------------------
  add('sea flat by default', flatOk && flatFields,
    `isFlat ${flatOk}, height === tide, no NaN across ${SLOT_KEYS.length} fields`);

  // ---- 3. lambda ordering -------------------------------------------------
  {
    let ok = true, worstAt = -1;
    for (let i = 1; i < MAX_WAVES; i++) {
      if (sea.lambda[i] > sea.lambda[i - 1]) { ok = false; worstAt = i; }
    }
    add('lambda monotonically non-increasing', ok,
      ok ? `${MAX_WAVES} components, ${sea.lambda[0].toFixed(2)} m -> ${sea.lambda[MAX_WAVES - 1].toFixed(3)} m`
         : `rises at index ${worstAt}`);
  }

  // ---- 4/5. tier boundary at 1.5 m ---------------------------------------
  {
    let ok = true, shortest = Infinity;
    for (let i = 0; i < N_PHYS; i++) { if (sea.lambda[i] < 1.5) ok = false; shortest = Math.min(shortest, sea.lambda[i]); }
    add('tier 0 all lambda >= 1.5 m', ok, `${N_PHYS} components, shortest ${shortest.toFixed(3)} m`);
  }
  {
    let ok = true, longest = 0;
    for (let i = N_PHYS; i < MAX_WAVES; i++) { if (sea.lambda[i] >= 1.5) ok = false; longest = Math.max(longest, sea.lambda[i]); }
    add('tier 1+2 all lambda < 1.5 m', ok, `${MAX_WAVES - N_PHYS} components, longest ${longest.toFixed(4)} m`);
  }

  // ---- 6. against the reference table -------------------------------------
  {
    let worst = 0;
    for (let i = 0; i < N_PHYS; i++) {
      worst = Math.max(worst, Math.abs(sea.lambda[i] - REFERENCE_POOLE.lambda[i]) / REFERENCE_POOLE.lambda[i]);
      worst = Math.max(worst, Math.abs(sea.amp[i] - REFERENCE_POOLE.amp[i]) / REFERENCE_POOLE.amp[i]);
    }
    add('default table matches reference', worst < 0.01,
      `max rel err on lambda[0..7] / amp[0..7] = ${(worst * 100).toFixed(3)}%`);
  }

  // ---- 7/8. Hs and the physics share of the variance ----------------------
  let m0 = 0, m0phys = 0;
  for (let i = 0; i < MAX_WAVES; i++) {
    const v = 0.5 * sea.amp[i] * sea.amp[i];
    m0 += v;
    if (i < N_PHYS) m0phys += v;
  }
  {
    const hs = 4 * Math.sqrt(m0);
    add('Hs reconstructed from 32 comps', Math.abs(hs - 0.5) <= 0.002, `${hs.toFixed(4)} m (target 0.500 +/- 0.002)`);
  }
  {
    const pct = 100 * m0phys / m0;
    add('physics band carries > 99% of m0', pct > 99,
      `${pct.toFixed(2)}% - the sub-1.5 m band is 0.29% of the variance and ~65% of the slope`);
  }

  // ---- 9. saturated tail: a*k constant per octave -------------------------
  {
    let lo = Infinity, hi = 0;
    for (let i = N_PHYS; i < MAX_WAVES; i++) {
      const ak = sea.amp[i] * sea.k[i];
      lo = Math.min(lo, ak); hi = Math.max(hi, ak);
    }
    const mid = 0.0147;
    const ok = lo >= mid * 0.95 && hi <= mid * 1.05;
    add('detail band a*k constant per octave', ok,
      `${lo.toFixed(5)} .. ${hi.toFixed(5)} over i = 8..31 (target 0.0147 +/- 5%)`);
  }

  // ---- 10/11. steepness and looping, on every preset ----------------------
  {
    let ok = true, worst = 0, worstName = '';
    for (const key of PRESET_KEYS) {
      const s = new Sea().setState(key, DEFAULT_SEED);
      let sak = 0;
      for (let i = 0; i < N_VERTEX; i++) sak += s.Q[i] * s.amp[i] * s.k[i];
      if (sak > worst) { worst = sak; worstName = key; }
      if (sak > 0.7 + 1e-9) ok = false;
    }
    add('steepness budget', ok, `worst sum Q*a*k over tiers 0-1 = ${worst.toFixed(4)} ('${worstName}'), budget 0.70`);
  }
  {
    let ok = true, worst = Infinity, worstName = '';
    const per = 200000;
    for (const key of PRESET_KEYS) {
      const s = new Sea().setState(key, DEFAULT_SEED);
      let mj = Infinity;
      for (let a = 0; a < 400; a++) {
        for (let b = 0; b < per / 400; b++) {
          const r = s.sample(a * 1.913 - 380, b * 1.117 - 280, (a % 13) * 2.9, 0, 0);
          if (r.jac < mj) mj = r.jac;
        }
      }
      if (mj < worst) { worst = mj; worstName = key; }
      if (!(mj > 0.3)) ok = false;
    }
    add('no Gerstner looping', ok, `min jac ${worst.toFixed(4)} ('${worstName}') over ${per} samples per preset`);
  }

  // ---- 12. the Newton inversion actually inverts --------------------------
  {
    const tmp = [0, 0, 0];
    let worst = 0;
    for (let i = 0; i < 20000; i++) {
      const x = (i * 7.31) % 900 - 450, z = (i * 11.17) % 900 - 450, t = (i * 0.137) % 300;
      const r = sea.sample(x, z, t, 0, 0);
      lagrangian(sea, r.x0, r.z0, t, 0, tmp);
      worst = Math.max(worst, Math.abs(tmp[0] - x), Math.abs(tmp[2] - z));
    }
    add('Newton inversion converged', worst < 1e-9, `|P(x0) - x| worst ${worst.toExponential(2)} m over 20k samples`);
  }

  // ---- 13. orbital velocity IS d/dt of the particle -----------------------
  {
    const h = 2e-5, p1 = [0, 0, 0], p2 = [0, 0, 0];
    let worst = 0;
    for (let i = 0; i < 4000; i++) {
      const x = (i * 3.71) % 500, z = (i * 5.13) % 500, t = (i * 0.373) % 120, d = (i % 7) * 0.25;
      const r = sea.sample(x, z, t, d, 0);
      lagrangian(sea, r.x0, r.z0, t + h, d, p1);
      lagrangian(sea, r.x0, r.z0, t - h, d, p2);
      worst = Math.max(worst,
        Math.abs((p1[0] - p2[0]) / (2 * h) - r.orbX),
        Math.abs((p1[1] - p2[1]) / (2 * h) - r.orbY),
        Math.abs((p1[2] - p2[2]) / (2 * h) - r.orbZ));
    }
    add('orbital velocity == d/dt displacement', worst < 1e-8,
      `central difference, max err ${worst.toExponential(2)} m/s (Q = 1, tolerance 3)`);
  }

  // ---- 14. the Eulerian slope IS d/dx of the sampled surface --------------
  {
    const h = 1e-4;
    let worst = 0;
    for (let i = 0; i < 4000; i++) {
      const x = (i * 3.71) % 500, z = (i * 5.13) % 500, t = (i * 0.373) % 120;
      const r = sea.sample(x, z, t, 0, 0);
      const sx = r.slopeX, sz = r.slopeZ;
      const hp = sea.sample(x + h, z, t, 0, 1).height, hm = sea.sample(x - h, z, t, 0, 1).height;
      const zp = sea.sample(x, z + h, t, 0, 1).height, zm = sea.sample(x, z - h, t, 0, 1).height;
      worst = Math.max(worst, Math.abs((hp - hm) / (2 * h) - sx), Math.abs((zp - zm) / (2 * h) - sz));
    }
    add('Eulerian slope == d/dx of surface', worst < 1e-8, `central difference, max err ${worst.toExponential(2)}`);
  }

  // ---- 15. the linear-limit identity w = -c * slope -----------------------
  // Only exact in the linear limit, so this runs on one deliberately tiny
  // component. It is the check that would catch a sign error or a swapped
  // sin/cos in the orbital loop, which nothing above would.
  {
    const s = new Sea()._debugSetTable([{ k: 0.1, amp: 1e-5, phase: 0.7, theta: 0, Q: 1 }], 0);
    const c = Math.sqrt(G / 0.1);
    let worst = 0;
    for (let i = 0; i < 5000; i++) {
      const r = s.sample(i * 0.913, 0, i * 0.037, 0, 0);
      worst = Math.max(worst, Math.abs(r.orbY - (-c * r.slopeX)));
    }
    add('w_orb(surface) == -c * slope', worst < 1e-9, `single component, max err ${worst.toExponential(2)} m/s`);
  }

  // ---- 16. no allocation --------------------------------------------------
  {
    const ids = [0, 1, 2, 3].map((i) => sea.sample(i, i, 0, 0, i));
    const keys0 = ids.map((o) => Object.keys(o).length);
    let identity = true, keysOk = true;
    for (let i = 0; i < 200000; i++) {
      const slot = i & 3;
      const r = sea.sample((i * 0.37) % 800, (i * 0.53) % 800, (i * 0.017) % 90, (i % 4) * 0.3, slot);
      if (r !== ids[slot]) identity = false;
    }
    for (let i = 0; i < 4; i++) if (Object.keys(ids[i]).length !== keys0[i]) keysOk = false;
    add('sample() allocates nothing', identity && keysOk,
      `same slot object identity + ${keys0[0]} keys unchanged over 200k calls`);
  }

  // ---- 17. cached path == uncached path, byte for byte --------------------
  {
    let bad = 0;
    for (let i = 0; i < 50000; i++) {
      const x = (i * 1.73) % 300, z = (i * 2.31) % 300, t = (i * 0.011) % 40, d = (i % 5) * 0.2;
      const a = sea.sample(x, z, t, d, 0);          // miss (or hit)
      const b = sea.sample(x, z, t, d, 1);          // guaranteed hit
      sea.sample(x + 1, z, t, d, 2);                // evict
      const c = sea.sample(x, z, t, d, 3);          // guaranteed miss
      for (let j = 0; j < SLOT_KEYS.length; j++) {
        const k = SLOT_KEYS[j];
        if (!Object.is(a[k], b[k]) || !Object.is(b[k], c[k])) bad++;
      }
    }
    add('sample() is a pure function', bad === 0, `cached and uncached byte-identical, ${bad} mismatches over 50k calls`);
  }

  // ---- 18. the emitted GLSL agrees with the table -------------------------
  {
    const g = sea.glsl();
    const m = /#define\s+SEA_N_WAVES\s+(\d+)/.exec(g.chunk);
    const mv = /#define\s+SEA_N_VERTEX\s+(\d+)/.exec(g.chunk);
    const mp = /#define\s+SEA_N_PHYS\s+(\d+)/.exec(g.chunk);
    const parsed = m ? parseInt(m[1], 10) : -1;
    const before = g.chunk;
    const probe = new Sea().setState('storm', 987654321);
    const invariant = probe.glsl().chunk === before && new Sea().glsl().chunk === before;
    const ok = parsed === MAX_WAVES && g.nWaves === MAX_WAVES && sea.nActive === MAX_WAVES &&
      mv && parseInt(mv[1], 10) === N_VERTEX && mp && parseInt(mp[1], 10) === N_PHYS && invariant;
    add('glsl() emits N_WAVES === nActive cap', !!ok,
      `SEA_N_WAVES ${parsed} / VERTEX ${mv && mv[1]} / PHYS ${mp && mp[1]}, string invariant to state+seed ${invariant}`);
  }

  // ---- 19. packUBO ---------------------------------------------------------
  {
    const g = sea.glsl();
    const n = g.nWaves * g.floatsPerWave;
    // ⚠️ THE BLOCK IS NO LONGER ONLY THE WAVE TABLE (tmp-tr147). When the arena
    // is on it also carries the shore distance field, so the guard floats go
    // past UBO_FLOATS rather than past the 256 the wave table occupies - and
    // the wave half is still checked at exactly the same offsets, so nothing
    // this check used to prove has been given up.
    const dst = new Float32Array(UBO_FLOATS + 2);
    dst[UBO_FLOATS] = -12345; dst[UBO_FLOATS + 1] = -12345;
    sea.packUBO(dst, 137.25);
    let nan = 0, phaseBad = 0;
    for (let i = 0; i < n; i++) if (!Number.isFinite(dst[i])) nan++;
    for (let i = 0; i < MAX_WAVES; i++) {
      const p = dst[MAX_WAVES * 4 + i * 4];
      if (!(p >= -Math.PI - 1e-5 && p <= Math.PI + 1e-5)) phaseBad++;
    }
    const untouched = dst[UBO_FLOATS] === -12345 && dst[UBO_FLOATS + 1] === -12345;

    const flat = new Sea();
    const fd = new Float32Array(UBO_FLOATS);
    flat.packUBO(fd, 9.5);
    let flatOkAmp = true;
    for (let i = 0; i < MAX_WAVES; i++) {
      if (fd[i * 4 + 3] !== 0 || fd[MAX_WAVES * 4 + i * 4 + 1] !== 0) flatOkAmp = false;
    }
    add('packUBO fills exactly 256 wave floats and writes past none of the block',
      n === 256 && nan === 0 && phaseBad === 0 && untouched && flatOkAmp,
      `${n} wave floats in a ${UBO_FLOATS}-float block, ${nan} NaN, phase wrapped to [-pi,pi], `
      + `nothing written past the block, flat sea amp = Q = 0`);
  }

  // ---- 20. build cost ------------------------------------------------------
  {
    let worst = 0, worstName = '';
    for (const key of PRESET_KEYS) {
      const s = new Sea();
      s.setState(key, DEFAULT_SEED);                 // warm
      const t0 = now();
      for (let r = 0; r < 5; r++) s.setState(key, DEFAULT_SEED);
      const ms = (now() - t0) / 5;
      if (ms > worst) { worst = ms; worstName = key; }
    }
    add('table build < 20 ms', worst < 20, `worst ${worst.toFixed(3)} ms ('${worstName}') over ${PRESET_KEYS.length} presets`);
  }

  // ---- 21. EXTRA: the shader and the sampler are the same surface ---------
  // Not in the required list, but it is the only check that actually proves the
  // "ONE WAVE TABLE" rule end to end: pack the table the way the GPU receives
  // it, run the emitted seaSurface() maths against the packed float32 values,
  // and require it to land on the CPU sampler's answer.
  {
    const g = sea.glsl();
    const ubo = new Float32Array(UBO_FLOATS);
    const e = [0, 0, 0, 0, 0, 0];
    let worstY = 0, worstN = 0;
    // The surf train is OFF for this check, and that is not a way of hiding it.
    // This check compares the shader's seaSurface() against the sampler's
    // GERSTNER half; the surf train is a separate additive field that
    // seaSurface() does not contain, and several of the sample points below
    // land inside the surf envelope. Check 22/23 does the same job for it.
    sea.setSurf(0);
    for (let i = 0; i < 3000; i++) {
      const t = (i * 0.213) % 60;
      sea.packUBO(ubo, t);
      const x = (i * 3.11) % 400 - 200, z = (i * 4.77) % 400 - 200;
      const r = sea.sample(x, z, t, 0, 0);
      glslEmulateTier0(ubo, r.x0, r.z0, sea.tide, e);
      worstY = Math.max(worstY, Math.abs(e[1] - r.height), Math.abs(e[0] - x), Math.abs(e[2] - z));
      const len = Math.hypot(e[3], e[4], e[5]);
      worstN = Math.max(worstN, Math.abs(e[3] / len - r.nx), Math.abs(e[4] / len - r.ny), Math.abs(e[5] / len - r.nz));
    }
    add('GLSL/UBO surface == CPU sampler (tier 0)', worstY < 2e-4 && worstN < 2e-4,
      `float32 round-trip: pos ${worstY.toExponential(2)} m, normal ${worstN.toExponential(2)}`);
    sea.setSurf(1);
  }

  // ---- 22-25. THE SURF TRAIN (tmp-tr71) ----------------------------------
  // Same discipline as 21, for the other half of the surface. The shader gets
  // the shoaling ladder BAKED IN as const arrays; if that bake ever falls out of
  // step with the ladder the CPU uses, the sea quietly splits in two and nothing
  // else in the project would notice. So: parse the emitted GLSL, compare the
  // numbers, then run the emitted maths against the sampler.
  const GRAB = (src, name) => {
    const m = src.match(new RegExp('const float ' + name +
      '\\[SURF_N\\]\\s*=\\s*float\\[SURF_N\\]\\(([^)]*)\\)'));
    return m ? m[1].split(',').map((v) => parseFloat(v)) : null;
  };

  {
    const src = surfChunk();
    const got = ['SURF_H', 'SURF_K', 'SURF_PHI', 'SURF_KS', 'SURF_C1', 'SURF_C0']
      .map((n) => GRAB(src, n));
    const L = LADDER;
    const want = [L.h, L.k, L.phi, L.ks, L.cap1, L.cap0];
    let ok = got.every((a) => a && a.length === L.n);
    let worst = 0;
    if (ok) {
      for (let j = 0; j < got.length; j++) {
        for (let i = 0; i < L.n; i++) worst = Math.max(worst, Math.abs(got[j][i] - want[j][i]));
      }
    }
    add('emitted surf ladder == built surf ladder', ok && worst < 1e-5,
      `${L.n} rungs x 6 arrays, worst ${worst.toExponential(2)} (printed at 5 dp)`);
  }

  {
    // The emitted surfTrain(), transcribed, reading the PARSED arrays - so this
    // is the shader's own copy of the ladder being asked for the sampler's
    // answer, not the sampler asking itself.
    const src = surfChunk();
    const A = {
      k: GRAB(src, 'SURF_K'), phi: GRAB(src, 'SURF_PHI'), ks: GRAB(src, 'SURF_KS'),
      c1: GRAB(src, 'SURF_C1'), c0: GRAB(src, 'SURF_C0'),
    };
    const N = SURF.N, STEP = SURF.D_MAX / (N - 1);
    const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
    const ss = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const lerp = (arr, u, i) => arr[i] + (arr[i + 1] - arr[i]) * u;
    const bedB = (d) => {
      if (d <= 0) return 0;
      const w = ss(18, 70, d);
      return 0.155 * Math.pow(d, 2 / 3) * (1 - w) + 0.2792 * Math.sqrt(d) * w;
    };
    const bedBk = (d) => {
      if (d <= 0) return 0;
      const w = ss(SURF.JOIN0, SURF.JOIN1, d);
      const h = SURF.DEAN_BANK * Math.pow(d, 2 / 3) * (1 - w) + 0.2792 * Math.sqrt(d) * w;
      const b = (d - SURF.BAR_D) / SURF.BAR_W, u = (d - SURF.TROUGH_D) / SURF.TROUGH_W;
      return h - SURF.BAR_AMP * Math.exp(-b * b) + SURF.TROUGH_AMP * Math.exp(-u * u);
    };
    const barD = (d) => (d <= 0 ? 0 : bedBk(d) - bedB(d));
    const gate = (o) => ss(SURF.PIER_GAP * 0.45, SURF.PIER_GAP, Math.abs(o));
    const bump = (o) => Math.exp(-Math.pow((Math.abs(o) - SURF.ZONE_O) / SURF.ZONE_W, 2));
    // The arena has no surveyed banks, so its emitted surfZoneBed/surfZoneEnv
    // are the constants 0 and 1 and SURF_KO is 0. Transliterated here too, or
    // this check would compare the shader against a Bournemouth it is not
    // running (see surfChunk() in sea-surf.js).
    const zBed = (o) => (SHORE_ON ? 0 : bump(o) * gate(o));
    const zEnv = (o) => (SHORE_ON ? 1
      : (SURF.ENV_FLOOR + (1 - SURF.ENV_FLOOR) * bump(o)) * gate(o));
    const KO = SHORE_ON ? 0 : SURF.KO;
    const amp = (d, o, set, ctl) => {
      if (d <= 0.2) return 0;
      const dF = 1 - ss(SURF.D_FADE0, SURF.D_FADE1, d);
      if (dF <= 0) return 0;
      const u = cl(d / STEP, 0, N - 1 - 0.001), i = u | 0, fr = u - i;
      const zb = zBed(o);
      const hL = Math.max(SURF.H_MIN, bedB(d) + barD(d) * zb);
      const c0 = lerp(A.c0, fr, i), c1 = lerp(A.c1, fr, i);
      const aDeep = Math.min(0.5 * SURF.H0 * set * ctl, c0 + (c1 - c0) * zb);
      const a = aDeep * lerp(A.ks, fr, i) * zEnv(o) * dF;
      const lim = 0.5 * SURF.GAMMA_B * hL;
      return a + (lim - a) * ss(0.85, 1.05, a / Math.max(lim, 1e-4));
    };

    const slot = makeSurfSlot();
    let worstE = 0, worstB = 0, nan = 0, n = 0;
    const zone = surfZonePoints(6000);
    for (let i = 0; i < zone.length; i++) {
      const t = (i * 0.173) % 90;
      const x = zone[i][0], z = zone[i][1];
      surfSample(x, z, t, 0, 1, slot);
      if (!slot.active) continue;
      n++;
      const d = slot.d, o = slot.o;
      const u = cl(d / STEP, 0, N - 1 - 0.001), ii = u | 0, fr = u - ii;
      const k = lerp(A.k, fr, ii), phi = lerp(A.phi, fr, ii);
      const hL = Math.max(SURF.H_MIN, bedB(d) + barD(d) * zBed(o));
      const a = amp(d, o, setFactor(t), 1);
      const lim = 0.5 * SURF.GAMMA_B * hL;
      const brk = ss(0.80, 1.00, a / Math.max(lim, 1e-4));
      const psi = phi + KO * o + surfTimePhase(t);
      const q = Math.min(0.85, 3.2 * a * k + 0.35 * brk);
      const chi = psi + q * Math.sin(psi);
      const j1 = q * 0.5 - q * q * q * 0.0625;
      const eta = a * (Math.cos(chi) + j1);
      if (!Number.isFinite(eta) || !Number.isFinite(slot.eta)) nan++;
      worstE = Math.max(worstE, Math.abs(eta - slot.eta));
      worstB = Math.max(worstB, Math.abs(brk - slot.brk));
    }
    add('GLSL surf train == CPU surf sampler', n > 500 && nan === 0 && worstE < 5e-4 && worstB < 5e-4,
      `${n} in-surf samples, worst eta ${worstE.toExponential(2)} m, breaking ${worstB.toExponential(2)}`);
  }

  {
    // The surf must not be able to fold the surface or produce a non-finite
    // number, at ANY control setting, anywhere on the map - the dry beach, the
    // bank, and 1 km out. 0.85 is the crest-skew cap; past 1.0 the crest folds.
    const sea3 = new Sea().setState(DEFAULT_PRESET);
    let nan = 0, worstSlope = 0, worstH = 0;
    for (const ctl of [0, 0.5, 1, 2, 3]) {
      sea3.setSurf(ctl);
      for (let i = 0; i < 6000; i++) {
        const t = (i * 0.0917) % 300;
        const x = -1200 + ((i * 17.3) % 2400);
        const z = -320 + ((i * 11.7) % 1200);
        const r = sea3.sample(x, z, t, (i % 5) * 0.4, 0);
        if (![r.height, r.slopeX, r.slopeZ, r.orbX, r.orbY, r.orbZ, r.nx, r.ny, r.nz]
          .every(Number.isFinite)) nan++;
        worstSlope = Math.max(worstSlope, Math.abs(r.slopeX), Math.abs(r.slopeZ));
        worstH = Math.max(worstH, Math.abs(r.height));
      }
    }
    add('surf finite and bounded at every control', nan === 0 && worstSlope < 12 && worstH < 4,
      `30k samples x 5 controls, max |slope| ${worstSlope.toFixed(2)}, max |height| ${worstH.toFixed(2)} m, ${nan} non-finite`);
  }

  {
    // ABLATION. setSurf(0) must restore the pre-surf sea BIT FOR BIT in open
    // water, which is what makes "the settled sea has not moved" a proof rather
    // than a claim: the renderer's ?surf=0 is this same switch.
    const a = new Sea().setState(DEFAULT_PRESET);
    const b = new Sea().setState(DEFAULT_PRESET);
    b.setSurf(0);
    let shoreMoved = 0, outside = 0;
    const zone = surfZonePoints(4000);
    for (let i = 0; i < zone.length; i++) {
      const t = (i * 0.211) % 60;
      if (a.sample(zone[i][0], zone[i][1], t, 0, 0).height
        !== b.sample(zone[i][0], zone[i][1], t, 0, 1).height) shoreMoved++;
    }
    // ...and open water, which must not move at all. At the arena that is
    // anywhere the field reads past D_FADE1; at Bournemouth it is 420 m+ out.
    let nOut = 0;
    for (let i = 0; i < 8000 && nOut < 4000; i++) {
      const t = (i * 0.211) % 60;
      let x, z;
      if (SHORE_ON) {
        x = SHORE.x0 - 600 + ((i * 53.1) % (SHORE.x1 - SHORE.x0 + 1200));
        z = SHORE.z0 - 600 + ((i * 37.9) % (SHORE.z1 - SHORE.z0 + 1200));
        if (shoreField(x, z)[0] < SURF.D_FADE1 + 20) continue;
      } else {
        x = -600 + ((i * 13.7) % 1200);
        z = 120 + ((i * 9.3) % 900);          // 420 m+ offshore: open water only
      }
      nOut++;
      if (a.sample(x, z, t, 0, 0).height !== b.sample(x, z, t, 0, 1).height) outside++;
    }
    add('setSurf(0) restores the open sea bit for bit', outside === 0 && shoreMoved > 1000,
      `${shoreMoved} of ${zone.length} surf-zone samples move with it on, ${outside} of ${nOut} open-water samples move`);
  }

  // =========================================================================
  // THE SHORE MODEL (tmp-tr147)
  //
  // Every check below runs in BOTH modes and asserts the right thing in each,
  // so the count does not drop when the arena is off and neither model is the
  // one nobody tests. The arena arm runs under EFOIL_ARENA=oldharry.
  // =========================================================================
  const ARENA_PTS = [];
  {
    // WHICH MODEL IS LIVE, and how big it is. A bare inventory check, but it is
    // the one that catches "the flag said arena and the field came out empty".
    const ok = SHORE_ON
      ? (SHORE.floats > 0 && SHORE_PACK.length === SHORE.floats)
      : (SHORE.floats === 0 && SHORE_PACK.length === 0);
    add('the live shore model matches the arena flag', ok,
      SHORE_ON
        ? `arena signed-distance field, ${SHORE.nx}x${SHORE.nz} over `
          + `${(SHORE.x1 - SHORE.x0).toFixed(0)}x${(SHORE.z1 - SHORE.z0).toFixed(0)} m `
          + `(${SHORE.hx.toFixed(1)}x${SHORE.hz.toFixed(1)} m cells), ${SHORE.floats} floats packed 2 to 1`
        : `Bournemouth mhw(x) table, no distance field (${SHORE_PACK.length} floats)`);
  }

  {
    // THE WATER SHADER'S UNIFORM BLOCK MUST FIT THE GUARANTEED MINIMUM.
    // GL ES 3.0 promises MAX_UNIFORM_BLOCK_SIZE >= 16,384 bytes and nothing
    // more. The shore field rides in that block - sea-shore.js has the measured
    // reason it is not a GLSL const array and cannot be a texture - so this is
    // the ceiling that sized the grid, and it is checked rather than remembered.
    const bytes = UBO_FLOATS * 4;
    add('the water uniform block fits GL ES 3.0 guaranteed 16,384 bytes', bytes <= 16384,
      `${UBO_FLOATS} floats = ${bytes} bytes, ${16384 - bytes} to spare`);
  }

  {
    // THE OFFSHORE COORDINATE OBEYS ITS OWN MODEL.
    //
    // Bournemouth's shoreD is z - (mhw(x) - Z0): a function of x, sea at +Z.
    // That has an exact signature - move 1 m in +Z and d rises by exactly 1 m,
    // everywhere - and this asserts it BITWISE, which is stronger than "close".
    //
    // The arena's is a distance field, whose signature is |grad d| = 1. Testing
    // for that is what proves it is a DISTANCE rather than some scalar that
    // merely happens to be zero at the shore: a field that failed it would put
    // the surf band at the wrong width on every oblique stretch of coast.
    let bad = 0, worst = 0, n = 0;
    if (SHORE_ON) {
      for (let i = 0; i < 12000; i++) {
        const x = SHORE.x0 + ((i * 137.7) % (SHORE.x1 - SHORE.x0));
        const z = SHORE.z0 + ((i * 91.3) % (SHORE.z1 - SHORE.z0));
        const d0 = shoreField(x, z)[0];
        // WATER ONLY, and inside the clamp. Landward the field is deliberately
        // clamped flat at -120 m (nothing draws water under the chalk), so
        // |grad d| is 0 there by construction and testing it would be testing
        // the clamp.
        if (d0 < 1 || d0 > 300) continue;
        n++;
        ARENA_PTS.push([x, z, d0]);
        const e = 2;
        const gx = (shoreField(x + e, z)[0] - shoreField(x - e, z)[0]) / (2 * e);
        const gz = (shoreField(x, z + e)[0] - shoreField(x, z - e)[0]) / (2 * e);
        const m = Math.hypot(gx, gz);
        // 0.80 is the medial axis and the shoreline's own corners, where a TRUE
        // distance field has a ridge and a central difference across it reads
        // low. That is a property of distance, not a slack tolerance.
        if (m < 0.80 || m > 1.10) bad++;
        worst = Math.max(worst, Math.abs(m - 1));
      }
      add('the offshore coordinate is a DISTANCE: |grad d| = 1', n > 2000 && bad / n < 0.08,
        `${n} points inside 300 m, ${bad} (${(100 * bad / n).toFixed(1)}%) outside 0.80-1.10, `
        + `worst ||grad|-1| ${worst.toFixed(3)}`);
    } else {
      const sc = { d: 0, o: 0, gx: 0, gz: 0 };
      for (let i = 0; i < 4000; i++) {
        const x = -900 + ((i * 17.3) % 3000);
        const z = -260 + ((i * 11.7) % 900);
        n++;
        shoreCoordsProbe(x, z, sc);
        const a = sc.d, gz = sc.gz;
        shoreCoordsProbe(x, z + 1, sc);
        // NOT "bitwise": d is computed as z - (w - Z0) and subtracting two
        // nearby doubles loses the last bit, so 1 m of +Z comes back as
        // 1 +/- 1 ulp. The EXACT part of the claim is the gradient - its z
        // component is the literal 1.0 - and that is asserted exactly.
        worst = Math.max(worst, Math.abs(sc.d - a - 1));
        if (Math.abs(sc.d - a - 1) > 1e-12) bad++;
        if (gz !== 1) bad++;
      }
      add('the offshore coordinate is +Z minus a function of X', bad === 0,
        `${n} points: d(x, z+1) - d(x, z) is 1 m to ${worst.toExponential(1)}, and the gradient z is exactly 1 at every one`);
    }
  }

  {
    // THE SHORELINE HAS TWO SIDES, OR IT HAS ONE.
    //
    // This is the check the whole job exists for. mhw(x) can only describe a
    // coast with ONE seaward direction; Handfast Point has sea on both sides.
    // So collect the shore normal over the model and ask how much of the
    // compass it covers. Bournemouth's must stay inside a narrow cone about +Z
    // - that is not a defect, it is what the model IS - and the arena's must
    // span more than half the compass or it has not expressed a headland.
    const dirs = [];
    if (SHORE_ON) {
      for (const [x, z, d] of ARENA_PTS) {
        if (d < 5 || d > 80) continue;
        const g = shoreField(x, z);
        dirs.push(Math.atan2(g[2], g[1]));
      }
    } else {
      const sc = { d: 0, o: 0, gx: 0, gz: 0 };
      for (let i = 0; i < 2000; i++) {
        shoreCoordsProbe(-900 + ((i * 17.3) % 3000), 40, sc);
        dirs.push(Math.atan2(sc.gz, sc.gx));
      }
    }
    dirs.sort((a, b) => a - b);
    let gap = dirs.length > 1 ? (dirs[0] + Math.PI * 2) - dirs[dirs.length - 1] : Math.PI * 2;
    for (let i = 1; i < dirs.length; i++) gap = Math.max(gap, dirs[i] - dirs[i - 1]);
    const span = (Math.PI * 2 - gap) * 180 / Math.PI;
    add(SHORE_ON ? 'the arena shoreline faces the sea on more than one side'
      : 'Bournemouth shoreline faces one way, as its model requires',
    SHORE_ON ? span > 180 : span < 10,
    `${dirs.length} shore normals, spanning ${span.toFixed(1)} deg of the compass`);
  }

  {
    // AND IT BREAKS. Open water right up to the land was the bug; a shoreline
    // no wave breaks on is the same bug wearing a distance field.
    const slot = makeSurfSlot();
    let inBand = 0, breaking = 0, foamy = 0, far = 0;
    if (SHORE_ON) {
      for (const [x, z, d] of ARENA_PTS) {
        if (d < 3 || d > 60) continue;
        inBand++;
        surfSample(x, z, (inBand * 0.37) % 90, 0, 1, slot);
        if (slot.brk > 0.2) breaking++;
        if (slot.foam > 0.05) foamy++;
        if (slot.d > 300) far++;
      }
    } else {
      for (let i = 0; i < 4000; i++) {
        const x = -900 + ((i * 17.3) % 2600);
        const z = -250 + ((i * 3.1) % 60);
        surfSample(x, z, (i * 0.37) % 90, 0, 1, slot);
        if (slot.d < 3 || slot.d > 60) continue;
        inBand++;
        if (slot.brk > 0.2) breaking++;
        if (slot.foam > 0.05) foamy++;
      }
    }
    // THE TWO THRESHOLDS ARE DIFFERENT AND THAT IS THE POINT. Bournemouth's
    // alongshore envelope has a 0.18 floor away from the two banks, so most of
    // its beach carries a small wave that does not reach the breaker limit at
    // every phase - measured here, 9% of the band is breaking at any instant
    // and 16% carries foam. Before tmp-tr131 those numbers were 0% over 82% of
    // the shoreline, so >5%/>10% is the gate that tells the fixed state from
    // the broken one. The arena's envelope is flat (no surveyed banks, so none
    // invented), so most of its band should be breaking, and the gate is 35%.
    const bFrac = breaking / Math.max(inBand, 1), fFrac = foamy / Math.max(inBand, 1);
    add('the shoreline in force actually breaks',
      inBand > 200 && (SHORE_ON ? (bFrac > 0.35 && fFrac > 0.5) : (bFrac > 0.05 && fFrac > 0.10)),
      `${inBand} samples 3-60 m offshore, ${breaking} (${(100 * bFrac).toFixed(0)}%) breaking, `
      + `${foamy} (${(100 * fFrac).toFixed(0)}%) carrying foam`
      + (SHORE_ON ? `, ${far} of them reading the old open-water distance` : ''));
  }

  {
    // THE GPU AND THE CPU READ THE SAME FIELD.
    //
    // Transliteration of the emitted GLSL - shNode() and shoreFieldAt() - run
    // in JS against the SAME packed array the uniform block is handed, and
    // compared with sea-shore.js's own sampler. This is the one-table rule for
    // the shore, exactly as 'GLSL surf train == CPU surf sampler' is for the
    // train: two implementations, one table, and they are not allowed merely to
    // look alike.
    if (SHORE_ON) {
      const NXs = SHORE.nx, QB = SHORE.qBits, SC = SHORE.qScale, BI = SHORE.dMin;
      const IHX = 1 / SHORE.hx, IHZ = 1 / SHORE.hz;
      const shNode = (i, j) => {
        const idx = j * NXs + i, fi = idx >> 1;
        const p = SHORE_PACK[fi];                 // shF[fi>>2][fi&3] in GLSL
        const hi = Math.floor(p * (1 / QB));
        return ((idx & 1) === 0 ? hi : p - hi * QB) * SC + BI;
      };
      const glsl = (px, pz) => {
        const cx = Math.min(Math.max(px, SHORE.x0), SHORE.x1);
        const cz = Math.min(Math.max(pz, SHORE.z0), SHORE.z1);
        const u = (cx - SHORE.x0) * IHX, v = (cz - SHORE.z0) * IHZ;
        const i = Math.trunc(Math.min(u, SHORE.nx - 2));
        const j = Math.trunc(Math.min(v, SHORE.nz - 2));
        const fu = u - i, fv = v - j;
        const a = shNode(i, j), b = shNode(i + 1, j);
        const c = shNode(i, j + 1), e = shNode(i + 1, j + 1);
        const lo = a + (b - a) * fu, up = c + (e - c) * fu;
        const d = lo + (up - lo) * fv;
        let gx = ((b - a) + ((e - c) - (b - a)) * fv) * IHX;
        let gz = ((c - a) + ((e - b) - (c - a)) * fu) * IHZ;
        const m = Math.max(Math.hypot(gx, gz), 1e-6);
        gx /= m; gz /= m;
        return [d + (px - cx) * gx + (pz - cz) * gz, gx, gz];
      };
      let worstD = 0, worstG = 0, n = 0;
      for (let i = 0; i < 4000; i++) {
        const x = SHORE.x0 - 400 + ((i * 137.7) % (SHORE.x1 - SHORE.x0 + 800));
        const z = SHORE.z0 - 400 + ((i * 91.3) % (SHORE.z1 - SHORE.z0 + 800));
        const A = glsl(x, z), B = shoreField(x, z);
        n++;
        worstD = Math.max(worstD, Math.abs(A[0] - B[0]));
        worstG = Math.max(worstG, Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2]));
      }
      add('GLSL shore field == CPU shore field', n === 4000 && worstD < 1e-9 && worstG < 1e-12,
        `${n} samples, worst distance delta ${worstD.toExponential(2)} m, `
        + `worst gradient delta ${worstG.toExponential(2)}`);
    } else {
      add('GLSL shore field == CPU shore field',
        SHORE_PACK.length === 0 && shoreField(0, 0)[0] === 0,
        'no distance field is emitted with the arena off, so there is nothing for the two to disagree about');
    }
  }

  return out;
}

// shoreCoords() is sea-surf.js's own world -> shore transform and is the ONE
// place either model is defined, so the checks above probe it directly rather
// than re-deriving it.
function shoreCoordsProbe(x, z, out) { return shoreCoords(x, z, out); }
