// THE STUNT STAGE (tmp-tr173) - a marked watersports course, and the ONLY place in
// this game that has ramps in it.
//
// ---------------------------------------------------------------------------------------
// WHY THIS FILE EXISTS, in the owner's own words
//
//   "The ramps by the pier don't seem realistic because in real life there's no ramps by
//    Bournemouth Pier... I think maybe the ramps might be quite good if we could maybe do
//    like a stunt stage where you can do stunts on a jet ski."
//
// tmp-tr168 put fourteen pontoon wedges across the whole world, six of them ringing
// Bournemouth Pier, because the brief of the day said "everywhere, pier raid included".
// That was built correctly and it measured correctly, and it was still wrong: this project
// is built on photographic accuracy of that pier - protected palette values, measured deck
// heights, tone gates calibrated against real frames - and a floating pontoon 48 m off the
// pier head undercuts the one thing that makes the model worth having. So the ramps moved
// here, behind a flag, and `src/gl/ramps.js` now reads this file's table: with the flag
// clear the placement list is EMPTY, the hull physics has nothing to find, and the coast is
// the real coast again.
//
// ---------------------------------------------------------------------------------------
// IT IS OFF BY DEFAULT, exactly as gl/arena-oldharry.js is
//
// STUNT_ON below is the one switch. With it clear nothing here is built, nothing is
// allocated, the ramp table is empty and the 19 judged views come back bit-identical to the
// pre-ramps reference. That is not a hope: tmp-tr173/RESULT.md renders it.
//
// ---------------------------------------------------------------------------------------
// WHERE IT IS, AND WHY THERE
//
// Sim world (1440..1980, 150..560) - a 540 x 410 m rectangle of open water off the Boscombe
// end of the bay, 390-800 m offshore and just under 2 km east of Bournemouth Pier head.
// Three things picked that water and none of them is taste:
//
//   1. AWAY FROM THE PIER. The nearest corner of the course is 1,653 m from the pier tip
//      and its centre is 1,952 m away. The pier is a silhouette on the
//      skyline from here, which is the correct relationship: you can see where you are,
//      and there is no pontoon anywhere near the thing the model is calibrated on.
//   2. NO SWIMMER CAN REACH IT, and that is arithmetic rather than a promise. Every mode
//      that puts a person in the water is bounded in coast X: rescue's FIELD is 110..950,
//      the siege's SIEGE_FIELD is -650..750 and the smuggling run's field is world
//      -120..380. The nearest of those stops at world x 720. This course starts at world
//      x 1440 - 720 m further east than the furthest swimmer the game can create. The
//      check is in tmp-tr173/test-stunt.mjs, against the real tables, not against this
//      comment.
//   3. OPEN WATER, NOT THE SURF. The near edge is 390 m outside mean high water, so the
//      course never touches the bar, the break or the dry-sand wall.
//
// ---------------------------------------------------------------------------------------
// WHAT IS IN IT
//
// TWELVE RAMPS, all of them the tmp-tr168 profile UNCHANGED - 15.35 x 16.84 m, crest 1.6 m,
// face 20 deg, tail 14 deg, skirts 16.5 deg. ⚠️ THE ANGLES ARE NOT MINE TO RETUNE AND WERE
// NOT RETUNED. tmp-tr168 measured its first cut (30 deg back, 22 deg sides) and found that
// the best jump on the whole ramp was to drive at it BACKWARDS - 7.52 m off the tail against
// 3.32 m off the face - and fixed it by making the face the steepest surface on the object.
// Changing any of those three numbers here would silently reintroduce that, so the variety
// in this course is in HEADING AND LAYOUT, never in the wedge. One shape, learned once.
//
// A RING OF BOUNDARY MARKS, so the player can see where the course is, with taller posts at
// the four corners and a marked entrance gate on the shoreward edge.
//
// TWO MOORED PONTOON RAFTS outside the gate - the course's base. They are furniture, they
// are not jumpable, and nothing launches toward them.
//
// ⚠️ A BOUNDARY MARK IS SOLID, and saying so is better than discovering it. boats/
// obstacles.js rasterises every non-sand coast triangle between y -1.2 and +2.2 m into the
// blocked grid, so a mark is a hard obstacle in exactly the way the pier legs, the groynes
// and the Harbour Mouth gate buoys already are. That is the existing behaviour of every
// floating mark in this game, not a new class of thing - but it means the ring is 41 small
// walls. The gate below is what keeps that honest: the closest any ramp lands to any mark
// is 60.0 m, measured in test-stunt.mjs against a 50 m floor, so a jump cannot end on one.
//
// ---------------------------------------------------------------------------------------
// NO LETTERING, NO NUMBERING, NO BRANDING, NO SPONSOR MARKS
//
// There is no text on anything here and this model has no text renderer. There is no number
// on a mark, no banner, no hoarding, no logo and no third-party livery. The two signal
// colours are IMPORTED from gl/arena-oldharry.js's ARENA_PAL rather than copied, so the
// game speaks one marking language and the two cannot drift apart; that block already
// declares them AUTHORED signal colours and not measurements, and the same declaration
// applies here. One orange body on a dark spar is deliberately not a lateral pair, not a
// cardinal, and not any navigation authority's scheme.
//
// ---------------------------------------------------------------------------------------
// ⚠️ THIS FILE IMPORTS NOTHING FROM ramps.js, ON PURPOSE
//
// ramps.js imports STUNT_ON and STUNT_RAMPS from here. If this file imported RAMP back out
// of ramps.js the two would be a module cycle, and a cycle in which BOTH sides read the
// other's bindings at evaluation time is a ReferenceError that depends on which file the
// bundler reaches first - i.e. a bug that appears when an unrelated import order changes.
// So the dependency runs one way only: stunt-arena.js -> (nothing), ramps.js -> this file.
// The consequence is that the ramp footprint size is not available here, so every
// ramp-versus-mark clearance is asserted in tmp-tr173/test-stunt.mjs, which can import both
// files safely because it is a leaf.

import { ARENA_PAL } from './arena-oldharry.js';

// ---------------------------------------------------------------------------------------
// THE FLAG. Guarded on `typeof` exactly as arena-oldharry.js:105 guards ?arena=oldharry and
// coast-far.js:73 guards ?cdbg=nofar, so a node import (mesh-check, the suites, the physics
// probes) never touches `location`. It reads BOTH the URL and the environment so that:
//   * in a browser, ?arena=stunt turns it on and nothing else does;
//   * in node, with no EFOIL_ARENA set, it is OFF - so mesh-check, gate-check, module-check,
//     sea-check, the wipeout census and all 19 judged views see the real coast;
//   * EFOIL_ARENA=stunt node tools/mesh-check.mjs measures the course.
export const STUNT_ON = (() => {
  try {
    if (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined') {
      if ((new URLSearchParams(location.search).get('arena') || '') === 'stunt') return true;
    }
  } catch { /* a hostile location is not a reason to fail the build */ }
  try {
    if (typeof process !== 'undefined' && process.env && process.env.EFOIL_ARENA === 'stunt') return true;
  } catch { /* no process: browser */ }
  return false;
})();

// ---------------------------------------------------------------------------------------
// THE COURSE, in SIM WORLD metres - the frame ramps.js's table is written in, the frame
// boats/obstacles.js keys its grid on, and the frame the hull reads. One frame, no
// conversion to get wrong between the picture and the physics.
export const STUNT_BOUNDS = {
  x0: 1440, x1: 1980,
  z0: 150, z1: 560,
  // The entrance in the shoreward edge, and the two posts that flank it. 90 m of gap: wide
  // enough to enter at speed without threading a needle, narrow enough to read as a door.
  gate: { x0: 1660, x1: 1750, z: 150 },
};
STUNT_BOUNDS.cx = (STUNT_BOUNDS.x0 + STUNT_BOUNDS.x1) / 2;   // 1710
STUNT_BOUNDS.cz = (STUNT_BOUNDS.z0 + STUNT_BOUNDS.z1) / 2;   // 355

// Where a rider starts: shoreward of the gate, pointed through it. Set on the sim by
// src/stunt/stunt.js through sim.startX/startZ/startHeading - the same three fields
// raid-mode.js:164 uses to put a player at the Harbour Mouth, rather than a second spawn
// path that can get out of step.
export const STUNT_SPAWN = { x: 1705, z: 55, heading: Math.PI / 2 };

// ---------------------------------------------------------------------------------------
// THE TWELVE RAMPS. `h` is the heading you ride UP THE FACE on, in the sim's own convention
// (x += cos h, z += sin h), so it is also the launch direction.
//
// THE LAYOUT IS THREE LINES A RIDER CAN LINK, which is the whole point of a freestyle
// course and is why they are not scattered:
//
//        z=560 ───────────── boundary ─────────────
//                                                        B = the seaward leg, ridden -x
//        z=500   B4 ←    B3 ←    B2 ←    B1 ←
//
//        z=400        W ↑          D ↗          E ↓      the cross ramps and the diagonal
//
//        z=300   A1 →    A2 →    A3 →    A4 →            A = the inshore leg, ridden +x
//
//        z=200                 G ↑                       the entry kicker
//        z=150 ───────── boundary ══ GATE ══ ─────────
//
//   * A then B is a circuit: run the inshore leg east, turn at the east boundary, run the
//     seaward leg west. Four jumps a lap, each one landed and set up for the next.
//   * W / E / D cut across it, so a lap is a choice rather than a rail.
//   * G is the first thing you meet coming through the gate.
//
// ⚠️ NO TWO CENTRES ARE CLOSER THAN 110 m, and that number is inherited rather than chosen.
// tmp-tr168 measured a pair 40 m apart and got a craft landing straight onto the next ramp
// at 9 g, which read as chaos, and set 90 m as its floor. A jetski off this profile carries
// about 32 m of air, so 110 m leaves ~78 m of water to land, settle and re-aim - which is
// what makes a line LINKABLE rather than a pinball table. The 110 m minimum is asserted in
// test-stunt.mjs against this table, not trusted to this comment.
export const STUNT_RAMPS = [
  // --- A, the inshore leg: ridden east ------------------------------------------------
  { id: 'inshore-1', x: 1540, z: 300, h: 0 },
  { id: 'inshore-2', x: 1650, z: 300, h: 0 },
  { id: 'inshore-3', x: 1760, z: 300, h: 0 },
  { id: 'inshore-4', x: 1870, z: 300, h: 0 },
  // --- B, the seaward leg: ridden west ------------------------------------------------
  { id: 'seaward-1', x: 1870, z: 500, h: Math.PI },
  { id: 'seaward-2', x: 1760, z: 500, h: Math.PI },
  { id: 'seaward-3', x: 1650, z: 500, h: Math.PI },
  { id: 'seaward-4', x: 1540, z: 500, h: Math.PI },
  // --- the cross ramps: they turn the two legs into a course rather than two lanes -----
  { id: 'cross-west', x: 1595, z: 400, h: Math.PI / 2 },
  { id: 'cross-east', x: 1815, z: 400, h: -Math.PI / 2 },
  // --- the diagonal, dead centre: the only 45 deg line on the course -------------------
  { id: 'centre-diagonal', x: 1705, z: 400, h: Math.PI / 4 },
  // --- the entry kicker, straight in front of the gate ---------------------------------
  { id: 'gate-kicker', x: 1705, z: 200, h: Math.PI / 2 },
];

// ---------------------------------------------------------------------------------------
// THE BOUNDARY MARKS, generated from STUNT_BOUNDS rather than typed out, so the ring and the
// rectangle cannot disagree. Walking each edge at ~45 m gives a mark every 2.4 s at course
// speed, which is close enough to read as a continuous line at 70 km/h and sparse enough
// that the ring is 97.5% open water by perimeter.
//
// Three classes, and the silhouettes do the work because there is no lettering to do it:
//   post    corner and gate marks - twice the height, a wide collar on top. These break the
//           horizon from inside the course, so a corner is visible before you reach it.
//   pin     the ordinary boundary mark - a small drum on a short mast.
// The gate is a GAP in the shoreward edge flanked by two posts: a doorway, not a fence end,
// which is the same distinction gl/gate-buoys.js had to make and for the same reason.
const MARK_STEP = 45;

function edgeMarks(out, x0, z0, x1, z1, skip) {
  const L = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(L / MARK_STEP));
  for (let k = 1; k < n; k++) {
    const t = k / n;
    const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    if (skip && skip(x, z)) continue;
    out.push({ id: `pin${out.length}`, x, z, kind: 'pin' });
  }
}

export function stuntMarks() {
  const B = STUNT_BOUNDS;
  const out = [];
  // corners first, so a reader of the list sees the frame before the fill
  for (const [x, z] of [[B.x0, B.z0], [B.x1, B.z0], [B.x1, B.z1], [B.x0, B.z1]]) {
    out.push({ id: `post${out.length}`, x, z, kind: 'post' });
  }
  // the two gateposts
  out.push({ id: 'gateW', x: B.gate.x0, z: B.gate.z, kind: 'post' });
  out.push({ id: 'gateE', x: B.gate.x1, z: B.gate.z, kind: 'post' });
  // the four edges. The shoreward edge skips the doorway.
  const inGate = (x, z) => z === B.z0 && x > B.gate.x0 - MARK_STEP * 0.5 && x < B.gate.x1 + MARK_STEP * 0.5;
  edgeMarks(out, B.x0, B.z0, B.x1, B.z0, inGate);
  edgeMarks(out, B.x1, B.z0, B.x1, B.z1, null);
  edgeMarks(out, B.x1, B.z1, B.x0, B.z1, null);
  edgeMarks(out, B.x0, B.z1, B.x0, B.z0, null);
  return out;
}

// ---------------------------------------------------------------------------------------
// THE PONTOON RAFTS. Two, moored 30 m OUTSIDE the gate, which is where a course's base
// would be: you pass them on the way in. They are 14 x 5 m, deck 0.85 m above mean water,
// plain timber, and nothing on this course launches toward them - the nearest ramp (the
// entry kicker) is 80 m away and points the other way. That clearance is a gate in
// test-stunt.mjs, not a claim here.
export const STUNT_PONTOONS = [
  { id: 'raft-west', x: 1620, z: 120, h: 0, L: 14, W: 5 },
  { id: 'raft-east', x: 1790, z: 120, h: 0, L: 14, W: 5 },
];

// ---------------------------------------------------------------------------------------
// SIZES, in metres about the still-water plane. Same convention and the same stated
// limitation as gl/gate-buoys.js: these floats are STATIC and do not bob. A moored mark in a
// real swell moves; this one does not, because the marks are baked into the coast mesh at
// page load and there is no per-frame handle on them. tmp-tr172's integration record lists
// buoy bobbing as structurally out of reach for the same reason.
const PIN = { r: 0.95, y0: -0.65, y1: 1.15, mastR: 0.16, mastTop: 2.60, capR: 0.40, capTop: 3.20 };
const POST = { r: 1.55, y0: -0.85, y1: 1.70, sparR: 0.28, sparTop: 6.40,
  collarR: 1.05, collarTop: 7.05 };

// ---------------------------------------------------------------------------------------
// PRIMITIVES. Local and small for the reason gl/gate-buoys.js states in its own copy:
// ColourMesh.ctube() has no end caps and MeshBuilder.tube() calls push() rather than
// pushC(), which silently desynchronises the colour array. These go through pushC only.

// A vertical prism with smooth radial normals and a flat top cap. The bottom is left open:
// it is under water and a cap there is triangles nobody will ever see.
function prism(m, cx, cz, y0, y1, r, seg, col, mat) {
  const low = [], high = [];
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2;
    const nx = Math.cos(a), nz = Math.sin(a);
    const x = cx + nx * r, z = cz + nz * r;
    low.push(m.pushC(x, y0, z, nx, 0, nz, col, mat));
    high.push(m.pushC(x, y1, z, nx, 0, nz, col, mat));
  }
  for (let k = 0; k < seg; k++) {
    const k2 = (k + 1) % seg;
    m.quad(low[k], low[k2], high[k2], high[k]);
  }
  const cap = [];
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2;
    cap.push(m.pushC(cx + Math.cos(a) * r, y1, cz + Math.sin(a) * r, 0, 1, 0, col, mat));
  }
  for (let k = 1; k + 1 < seg; k++) m.tri(cap[0], cap[k], cap[k + 1]);
}

// A closed box in the XZ plane, rotated by `h`. Used for the pontoon rafts.
function raft(m, cx, cz, h, L, W, y0, y1, colTop, colSide, mat) {
  const c = Math.cos(h), s = Math.sin(h);
  const P = (u, v) => [cx + c * u - s * v, cz + s * u + c * v];
  const hl = L / 2, hw = W / 2;
  const corner = [P(-hl, -hw), P(hl, -hw), P(hl, hw), P(-hl, hw)];
  const top = corner.map(([x, z]) => m.pushC(x, y1, z, 0, 1, 0, colTop, mat));
  m.quad(top[0], top[3], top[2], top[1]);
  for (let k = 0; k < 4; k++) {
    const k2 = (k + 1) & 3;
    const [ax, az] = corner[k], [bx, bz] = corner[k2];
    let nx = bz - az, nz = -(bx - ax);
    const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    const a1 = m.pushC(ax, y1, az, nx, 0, nz, colSide, mat);
    const b1 = m.pushC(bx, y1, bz, nx, 0, nz, colSide, mat);
    const a0 = m.pushC(ax, y0, az, nx, 0, nz, colSide, mat);
    const b0 = m.pushC(bx, y0, bz, nx, 0, nz, colSide, mat);
    m.quad(a0, b0, b1, a1);
  }
}

// ---------------------------------------------------------------------------------------
// THE BUILD. Draws the MARKS AND THE RAFTS ONLY - the ramps themselves are drawn by
// gl/ramps.js's buildRamps() off the STUNT_RAMPS table above, so the thing the player sees
// and the thing the player hits still come out of one file.
//
// Returns null and touches nothing unless STUNT_ON, which is why the 19 judged views, the
// three Old Harry views, the wipeout census and every Bournemouth gate are unaffected.
//
// NO OX/OZ, for the same reason buildRamps() takes none: this table is already in the sim
// world frame the coast mesh is built in once the coast-frame builders have been translated.
export function buildStuntArena(m, C, MAT) {
  if (!STUNT_ON) return null;
  const v0 = m.vertexCount, i0 = m.i.length;

  const orange = ARENA_PAL.markOrange;
  const spar = ARENA_PAL.markSpar;
  // The wet band at the waterline: the same darkening ramps.js paints on its own skirts, so
  // a mark and a ramp sit in the water the same way.
  const wet = [orange[0] * 0.42, orange[1] * 0.42, orange[2] * 0.42];

  let marks = 0;
  for (const k of stuntMarks()) {
    if (k.kind === 'post') {
      prism(m, k.x, k.z, POST.y0, 0.0, POST.r, 12, wet, MAT.PAINTED);
      prism(m, k.x, k.z, 0.0, POST.y1, POST.r, 12, orange, MAT.PAINTED);
      prism(m, k.x, k.z, POST.y1, POST.sparTop, POST.sparR, 8, spar, MAT.PAINTED);
      prism(m, k.x, k.z, POST.sparTop, POST.collarTop, POST.collarR, 10, orange, MAT.PAINTED);
    } else {
      prism(m, k.x, k.z, PIN.y0, 0.0, PIN.r, 10, wet, MAT.PAINTED);
      prism(m, k.x, k.z, 0.0, PIN.y1, PIN.r, 10, orange, MAT.PAINTED);
      prism(m, k.x, k.z, PIN.y1, PIN.mastTop, PIN.mastR, 6, spar, MAT.PAINTED);
      prism(m, k.x, k.z, PIN.mastTop, PIN.capTop, PIN.capR, 8, orange, MAT.PAINTED);
    }
    marks++;
  }

  for (const p of STUNT_PONTOONS) {
    raft(m, p.x, p.z, p.h, p.L, p.W, -0.40, 0.85, C.timberWeathered, C.timberWet, MAT.TIMBER);
  }

  return {
    marks, pontoons: STUNT_PONTOONS.length, ramps: STUNT_RAMPS.length,
    verts: m.vertexCount - v0, tris: (m.i.length - i0) / 3,
  };
}
