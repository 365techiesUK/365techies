// FLOATING LAUNCH RAMPS (tmp-tr168) - the structures the player jumps off.
//
// >>> STUNT
// ⚠️ 2026-09-19, tmp-tr173: THE PLACEMENT TABLE MOVED OUT OF THIS FILE AND BEHIND A FLAG.
// This file used to carry fourteen ramps spread across the whole world, six of them ringing
// Bournemouth Pier. The owner rode it and said: "The ramps by the pier don't seem realistic
// because in real life there's no ramps by Bournemouth Pier... maybe the ramps might be
// quite good if we could maybe do like a stunt stage where you can do stunts on a jet ski."
// Asked where ramps should live, they chose STUNT STAGE ONLY.
//
// So `RAMPS` below is now `STUNT_ON ? STUNT_RAMPS : []` - the table lives in
// gl/stunt-arena.js with the course it belongs to, and with the stunt flag clear this file
// places nothing. Everything downstream falls out of that with no second switch to get out
// of step: buildRamps() returns null on an empty table, rampSurface()/rampFootprint() find
// nothing, boats/ramp-collide.js's rampPoint() returns null on `!RAMPS.length` and
// wrapRampObstacles() hands the obstacle grid straight back unwrapped. Free ride, rescue,
// both raids, the Harbour Mouth and the smuggling run are the real coast again, and the 19
// judged views come back bit-identical to the pre-ramps reference.
//
// THE SHAPE, THE PHYSICS AND THE MESH BELOW ARE UNCHANGED. Nothing in this file was retuned
// - see the RAMP block's own warning about what happens if the angles are touched.
// <<< STUNT
//
// WHAT THIS IS. Moored timber pontoon wedges, in the water. They are ORDINARY WORLD
// GEOMETRY: built into the coast mesh by buildCoast(), drawn by the one coast draw call,
// lit and shadowed like the groynes beside them. There is no post-process, no overlay,
// nothing time- or speed-varying, and nothing here is an effect on the picture - a ramp is
// a thing in the world. ?cdbg=noramps removes both the geometry AND the physics.
//
// THE SHAPE, and why it is this shape.
//   A one-sided height field over a rectangular footprint:
//
//     deck(a, b) = min( -D0 + a*SF,            the JUMP FACE, 20 deg
//                        H,                    the flat crest, 1.5 m of it
//                       -D0 + (LT - a)*SB,     the BACK / TAIL, 14 deg
//                       -D0 + (HW - |b|)*SS )  the SIDE SKIRTS, 16.5 deg
//
//   with the four creases rounded by a smooth-min, so the surface is C1 and a
//   hull crossing one feels a fendered edge rather than a step.
//
//   * EVERY EDGE OF THE FOOTPRINT SITS D0 = 0.45 m UNDER MEAN WATER. At a = 0,
//     at a = LT and at |b| = HW the deck is at -0.45 m, which is below the keel
//     of both craft (jetski draft 0.24 m, speedboat 0.34 m). So the support a
//     hull feels rises CONTINUOUSLY from zero as it crosses the edge, from any
//     direction. There is no lip to catch and no step to trip on, which is what
//     makes a glancing hit survivable: clipping a corner puts one or two hull
//     points on a few centimetres of skirt and skids off.
//   * THE SIDES AND THE BACK ARE BOTH SHALLOWER THAN THE FACE (see RAMP below).
//     The lateral reaction a slope can apply is tan(angle) times the vertical
//     support, so a full-speed side hit is a firm shove and a smaller pop than
//     the face gives - it is not a launch, and it is never the better line.
//   * THE SURFACE IS CONVEX IN PLAN AND EVERYWHERE ONE-SIDED, so there is no
//     pocket to be trapped in: the only force it can apply is outward.
//   * The tail is rideable too. Coming at one from behind you climb a long
//     14 deg slope, which scrubs speed and gives about a third of the jump.
//
// NO LETTERING, NO BRANDING, ANYWHERE. Weathered marine ply and painted timber
// tones only; the crest lip is a pale paint band and the waterline a dark wet
// band, and both are colour, not symbols.
//
// SWIMMERS. Placement is constrained, not assumed - see PLACEMENT below and
// tmp-tr168/work/check-swim.mjs, which proves it against the rescue and raid
// rules rather than against this comment.

// >>> STUNT
// The stunt course owns the placement table now; this file owns the shape, the surface and
// the mesh. See the PLACEMENT block below for why the dependency runs only this way.
import { STUNT_ON, STUNT_RAMPS } from './stunt-arena.js';
// <<< STUNT

const DEG = Math.PI / 180;

// ?cdbg=noramps: the ablation switch. Guarded on `typeof` exactly the way
// coast-far.js guards ?cdbg=nofar, so a node import (mesh-check, the suites,
// the physics probes) never touches `location`.
export const RAMPS_ON = (() => {
  try {
    if (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined') {
      if ((new URLSearchParams(location.search).get('cdbg') || '').split(',').includes('noramps')) return false;
    }
  } catch { /* a hostile location is not a reason to lose the world */ }
  try {
    if (typeof process !== 'undefined' && process.env && process.env.EFOIL_NORAMPS) return false;
  } catch { /* no process: browser */ }
  return true;
})();

// ---------------------------------------------------------------------------
// THE PROFILE. One shape, one size: a player has to learn a ramp once.
// THE FACE IS THE STEEPEST SURFACE ON THE RAMP, and that is the whole ordering
// rule: face 20 deg > sides 16.5 deg > back 14 deg. Launch speed off a slope is
// approach speed x tan(slope), so making the face the steepest makes the
// INTENDED line the biggest jump and every other way of meeting the ramp a
// smaller one. The first cut had a 30 deg back face and 22 deg sides, and
// measured, the best jump on the whole ramp was to drive at it BACKWARDS
// (7.5 m and 2.6 s, against 3.3 m off the face). That is the opposite of
// "survivable and unsurprising", so the tail was stretched to 14 deg and the
// skirts laid back to 16.5 deg. The footprint is 16.8 m wide because that is
// what a 16.5 deg skirt costs, not because a wide raft looked good.
export const RAMP = {
  D0: 0.45,                    // m: every footprint edge is this far UNDER mean water
  H: 1.6,                      // m: crest above mean water
  SF: Math.tan(20 * DEG),      // jump face   - the steepest surface
  SB: Math.tan(14 * DEG),      // back / tail - gentler than the face
  SS: Math.tan(16.5 * DEG),    // side skirts - gentler than the face
  CREST: 1.5,                  // m of flat crest
  TOPHALF: 1.5,                // m: half width of the flat crest (speedboat spring
                               //    points reach +-0.95 m, so this clears them)
  K: 0.35,                     // m: smooth-min radius on the four creases
  FLOOR: -1.6,                 // m: the pontoon's hidden bottom
};
RAMP.RISE = RAMP.H + RAMP.D0;                       // 2.05 m, skirt edge to crest
RAMP.FACE = RAMP.RISE / RAMP.SF;                    // 5.63 m
RAMP.BACK = RAMP.RISE / RAMP.SB;                    // 8.22 m
RAMP.LT = RAMP.FACE + RAMP.CREST + RAMP.BACK;       // 15.35 m overall
RAMP.HW = RAMP.RISE / RAMP.SS + RAMP.TOPHALF;       // 8.42 m half width
RAMP.CREST_A = RAMP.FACE;                           // a at the top of the face

// ---------------------------------------------------------------------------
// >>> STUNT
// PLACEMENT. THE TABLE IS NO LONGER IN THIS FILE.
//
// It is gl/stunt-arena.js's STUNT_RAMPS, twelve ramps laid out as a course, and it is
// EMPTY HERE unless that arena's flag is set (?arena=stunt, or EFOIL_ARENA=stunt in node).
// The import is one-directional on purpose - stunt-arena.js imports nothing back out of
// this file - because a module cycle in which both sides read the other's bindings at
// evaluation time is a ReferenceError that depends on import order. stunt-arena.js's own
// header says the same thing from the other end.
//
// `h` is still the heading a player rides UP the face on, in the sim's own convention
// (x += cos h, z += sin h), so it is also the launch direction, and (x, z) is still the
// CENTRE of the footprint. Nothing about the contract changed; only where the list lives.
//
// WHAT THE OLD TABLE HAD TO SOLVE AND THIS ONE NO LONGER DOES. The fourteen world ramps
// were constrained by the rescue casualty envelope (world x -120..320, z -200.7..179.3
// plus the beach drop-off circle) and by raid.js's 3 m swimmer exclusion, because they
// shared water with both. The stunt course does not: it starts at world x 1440, which is
// 720 m east of the furthest swimmer any mode in this game can place. stunt-arena.js
// carries the arithmetic and tmp-tr173/test-stunt.mjs asserts it against the real tables.
//
// ⚠️ ONE CONSTRAINT SURVIVED THE MOVE AND MUST NOT BE LOST: no ramp may sit on
// suites/test-raid.mjs's turbo track, which drives a real speedboat hull from the ORIGIN on
// heading +z for 15 s. A ramp at (0, 262) once cost that suite 1 km/h and it failed,
// correctly. With the table empty in every non-stunt level the track is clear by
// construction, and test-stunt.mjs proves the corridor is empty rather than assuming it.
export const RAMPS = (RAMPS_ON && STUNT_ON) ? STUNT_RAMPS : [];
// <<< STUNT

// ---------------------------------------------------------------------------
// THE SURFACE.
// Polynomial smooth-min: C1 everywhere, and exactly min() outside the band.
const smin = (x, y, k) => {
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (y - x) / k));
  return y + (x - y) * h - k * h * (1 - h);
};

// Deck height in the ramp's own frame. `a` runs along the axis from the toe,
// `b` across. Returns null outside the footprint - and because every footprint
// edge sits at -D0, the height at the boundary is already below both keels, so
// the null is never a step.
export function deckLocal(a, b) {
  const R = RAMP;
  if (a < 0 || a > R.LT || b < -R.HW || b > R.HW) return null;
  const face = -R.D0 + a * R.SF;
  const back = -R.D0 + (R.LT - a) * R.SB;
  const side = -R.D0 + (R.HW - Math.abs(b)) * R.SS;
  let y = smin(face, R.H, R.K);
  y = smin(y, back, R.K);
  y = smin(y, side, R.K);
  return y;
}

// World point -> ramp-local (a, b) for one ramp.
export function toLocal(r, wx, wz) {
  const c = Math.cos(r.h), s = Math.sin(r.h);
  const dx = wx - r.x, dz = wz - r.z;
  return [c * dx + s * dz + RAMP.LT / 2, -s * dx + c * dz];
}

// Is this world point inside ANY ramp's footprint? The hull needs this to stop
// treating a ramp as a WALL: obstacles.js rasterises every non-sand coast
// triangle in the -1.2..+2.2 m band into its blocked grid, and a ramp lives
// squarely inside that band. `pad` widens the test.
export function rampFootprint(wx, wz, pad = 0) {
  for (const r of RAMPS) {
    const [a, b] = toLocal(r, wx, wz);
    if (a >= -pad && a <= RAMP.LT + pad && Math.abs(b) <= RAMP.HW + pad) return r;
  }
  return null;
}

// Deck height and world gradient under a point, over ALL ramps; null in open
// water. The gradient is a central difference of the same smooth-min surface -
// accurate at 5 cm, and guaranteed consistent with the value the spring in
// ramp-collide.js reads, which is what keeps the contact from making energy.
const GH = 0.05;
export function rampSurface(wx, wz) {
  for (const r of RAMPS) {
    const [a, b] = toLocal(r, wx, wz);
    if (a < 0 || a > RAMP.LT || b < -RAMP.HW || b > RAMP.HW) continue;
    const y = deckLocal(a, b);
    if (y === null) continue;
    const c = Math.cos(r.h), s = Math.sin(r.h);
    const at = (da, db) => {
      const v = deckLocal(a + da, b + db);
      return v === null ? -RAMP.D0 : v;
    };
    const dA = (at(GH, 0) - at(-GH, 0)) / (2 * GH);
    const dB = (at(0, GH) - at(0, -GH)) / (2 * GH);
    return { ramp: r, y, gx: dA * c - dB * s, gz: dA * s + dB * c };
  }
  return null;
}

// ---------------------------------------------------------------------------
// GEOMETRY. One closed solid per ramp: the deck as a grid over the height
// field, a vertical pontoon side from the -D0 footprint edge down to a hidden
// flat bottom, and the bottom itself. Winding CCW seen from outside.
const NA = 17, NB = 19;            // deck grid, about 0.72 x 0.79 m cells

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Weathered off-white deck paint, in LINEAR light like the rest of the palette
// (about 195/195/188 once it is encoded). A plain tone, never a symbol.
const PAINT = [0.52, 0.51, 0.47];

// Colour of a deck point, and it is doing a job: "reads as jumpable before you
// hit them" is a REQUIREMENT, and a wedge in bare timber is a dark slab on
// bright water at 100 m. So:
//   - the running surface is pale weathered marine ply, not dark timber;
//   - three broad transverse anti-slip bands cross the face, which is what a
//     real slipway carries and what gives the thing scale at a distance;
//   - the crest lip is a brighter band again, so the top edge catches the sun
//     and the player can see WHERE the ramp ends;
//   - the side skirts are darker, so the silhouette is a pale top between dark
//     flanks and reads as raised rather than flat;
//   - the waterline carries a dark wet/weed band.
// Colour only. No lettering, numbers, arrows or marks of any kind.
function deckColour(C, a, b, y) {
  const R = RAMP;
  const plank = (Math.floor(a / 0.55) & 1) ? 0.0 : 0.13;
  const grain = (Math.floor(b / 1.1) & 1) ? 0.05 : 0.0;
  let col = mix(mix(C.timberWeathered, C.timberNew, 0.30 - plank - grain), PAINT, 0.55);
  // is the SIDE SKIRT the surface here? (the side term is the active minimum)
  const side = -R.D0 + (R.HW - Math.abs(b)) * R.SS;
  const top = Math.min(-R.D0 + a * R.SF, R.H, -R.D0 + (R.LT - a) * R.SB);
  if (side < top - 0.05) col = mix(col, C.timberWet, 0.60);
  else {
    for (const ab of [1.5, 3.1, 4.7]) {                        // anti-slip bands
      if (Math.abs(a - ab) < 0.34) col = mix(col, PAINT, 0.92);
    }
    if (a > R.CREST_A - 0.9 && a < R.CREST_A + R.CREST + 0.4) {  // crest lip
      col = mix(col, PAINT, 1.0);
    }
  }
  if (y < 0.28) col = mix(col, C.timberWet, Math.min(1, (0.28 - y) / 0.52));
  return col;
}

// Builds every ramp into the colour mesh. The table is already in the SIM
// frame, which is the frame the coast mesh is built in, so there is
// deliberately no OX/OZ translation here.
export function buildRamps(m, C, MAT) {
  if (!RAMPS.length) return null;
  const R = RAMP;
  const v0 = m.vertexCount, i0 = m.i.length;
  for (const r of RAMPS) {
    const c = Math.cos(r.h), s = Math.sin(r.h);
    const W = (a, b, y) => {
      const lx = a - R.LT / 2;
      return [r.x + c * lx - s * b, y, r.z + s * lx + c * b];
    };
    // --- deck ------------------------------------------------------------
    const grid = [];
    for (let i = 0; i <= NA; i++) {
      const row = [];
      const a = (i / NA) * R.LT;
      for (let j = 0; j <= NB; j++) {
        const b = -R.HW + (j / NB) * 2 * R.HW;
        const y = deckLocal(a, b);
        const e = 0.06;
        const a1 = Math.min(R.LT, a + e), a0 = Math.max(0, a - e);
        const b1 = Math.min(R.HW, b + e), b0 = Math.max(-R.HW, b - e);
        const da = (deckLocal(a1, b) - deckLocal(a0, b)) / (a1 - a0);
        const db = (deckLocal(a, b1) - deckLocal(a, b0)) / (b1 - b0);
        const nl = Math.hypot(da, 1, db);
        const na = -da / nl, nb = -db / nl;
        const p = W(a, b, y);
        row.push(m.pushC(p[0], p[1], p[2], c * na - s * nb, 1 / nl, s * na + c * nb,
          deckColour(C, a, b, y), MAT.TIMBER));
      }
      grid.push(row);
    }
    for (let i = 0; i < NA; i++) {
      for (let j = 0; j < NB; j++) {
        m.quad(grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]);
      }
    }
    // --- pontoon side: the -D0 footprint edge down to the hidden bottom ----
    const edge = [];
    for (let i = 0; i <= NA; i++) edge.push([(i / NA) * R.LT, -R.HW]);
    for (let j = 1; j <= NB; j++) edge.push([R.LT, -R.HW + (j / NB) * 2 * R.HW]);
    for (let i = NA - 1; i >= 0; i--) edge.push([(i / NA) * R.LT, R.HW]);
    for (let j = NB - 1; j >= 1; j--) edge.push([0, -R.HW + (j / NB) * 2 * R.HW]);
    const wet = mix(C.timberWet, C.timberWeathered, 0.22);
    const botIdx = [];
    for (let k = 0; k < edge.length; k++) {
      const [a, b] = edge[k];
      const [a2, b2] = edge[(k + 1) % edge.length];
      let ox = b2 - b, oz = -(a2 - a);
      const ol = Math.hypot(ox, oz) || 1; ox /= ol; oz /= ol;
      const nx = c * ox - s * oz, nz = s * ox + c * oz;
      const p0 = W(a, b, -R.D0), p1 = W(a2, b2, -R.D0);
      const q0 = W(a, b, R.FLOOR), q1 = W(a2, b2, R.FLOOR);
      const j0 = m.pushC(p0[0], p0[1], p0[2], nx, 0, nz, wet, MAT.TIMBER);
      const j1 = m.pushC(p1[0], p1[1], p1[2], nx, 0, nz, wet, MAT.TIMBER);
      const j2 = m.pushC(q1[0], q1[1], q1[2], nx, 0, nz, C.timberWet, MAT.TIMBER);
      const j3 = m.pushC(q0[0], q0[1], q0[2], nx, 0, nz, C.timberWet, MAT.TIMBER);
      m.quad(j0, j3, j2, j1);
      botIdx.push(m.pushC(q0[0], q0[1], q0[2], 0, -1, 0, C.timberWet, MAT.TIMBER));
    }
    for (let k = 1; k + 1 < botIdx.length; k++) m.tri(botIdx[0], botIdx[k + 1], botIdx[k]);
  }
  return { ramps: RAMPS.length, verts: m.vertexCount - v0, tris: (m.i.length - i0) / 3 };
}
