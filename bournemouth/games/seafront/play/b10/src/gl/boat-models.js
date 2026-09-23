// Detailed meshes for the driveable boats (tmp-tr51). Replaces the tr41 block
// models in speedboat.js / jetski.js (those functions are now unused; boats.js
// imports these instead, so the parameter files were not edited).
//
// No owner footage shows a RIB or PWC close enough to measure (checked:
// bournemouth-reference index, 3 clips with boats all distant/moored), so the
// proportions are CLASS-TYPICAL published figures, not one model's brochure:
//   RIB 5.8 m: beam 2.35-2.45, tube dia 0.50 aft tapering to ~0.40 at the bow,
//     deadrise 20-24 deg at the transom, centre console ~0.7 wide x 1.0 high with
//     a ~0.3 m screen, jockey seat ~0.7 m above the deck, 150 hp outboard on a
//     25" shaft (cowl top ~0.8 m above the transom, plate at keel depth).
//   PWC 3.4 m 3-seat: beam 1.2-1.25, seat ~0.85-0.9 m above the keel, bars
//     ~1.1-1.15 m above the keel, deadrise ~22 deg, rear platform ~0.45 m,
//     sponsons aft, steering nozzle + reverse bucket under the platform.
// Generic colours only, no brand, logo or livery.
//
// Frame: +X forward, +Y up, +Z right; y 0 = static waterline; x in the tr41
// design frame (RIB transom -2.6, PWC stern -1.62), shifted by -cgX at the end.
// PARTS: { mesh, color, rough } or { mesh, mat, pose } for the figure.

import { MeshBuilder } from './meshes.js';
import { V3, box } from './boat-meshes.js';

import { DEG, cl, sm, mix, cross, sc, grid, sweep, blob, spline, mirror, ring }
  from './boat-meshes.js';
import { DecalSheet, LIVERY_UV, LIVERY_ASPECT } from './boat-meshes.js';
import { buildRider, riderMats, riderVestDecal, rigidMat, identityMat, RIDER_BONES }
  from './boat-rider.js';
import { skinRange } from './boat-pwc.js';
export { pwcParts, PWC_FX } from './boat-pwc.js';

// ---------------------------------------------------------------------------
// THE RIB DRIVER IS THE SAME FIGURE AS THE SKI'S RIDER (tr162).
//
// She used to be BAKED: driverFigure() built her three times at tilt -7/0/+7
// deg, her back roundel was baked three times beside her, and boats.js drew
// whichever of the three the hull's roll was nearest. That is a three-step
// lean and nothing else - no rise onto the plane, no tuck at speed, no knees
// taking a landing - and it cost three copies of a 1.5k-vertex figure and
// three copies of the mark.
//
// She is now driven by the SKINNED rig in boat-rider.js, the same 16 bones the
// PWC rider has had since tr95, so there is one figure, one mark, one skin
// path and one place a rider-shape change has to be made. driverFigure() and
// driverVestDecal() are gone with the poses they existed to bake; the vest and
// wetsuit numbers they carried (RVEST / RTORSO) are gone too, because the rig
// owns those now and a second copy could only drift from it.
//
// WHY A SEPARATE BIND POSE AND NOT THE SKI'S. Same body, different boat: she
// sits higher on a jockey seat, her feet are flat on the deck rather than in
// footwells, and her hands are on a WHEEL and a THROTTLE rather than on one
// tube. The last of those is the only thing the rig needed adding to it - a
// per-hand grip axis - and the PWC passes neither, so its skeleton is
// arithmetically unchanged.

// The console dash plane, and the wheel on it. Hoisted out of ribParts because
// the bind pose and the per-frame pose both have to name the same wheel, and a
// wheel defined twice is a wheel that comes apart.
const D_A = [0.085, 0.911], D_B = [0.415, 1.108];
const D_N = [-0.53, 0.848, 0];                        // dash face normal, unit
const D_T = V3.unit([D_B[0] - D_A[0], D_B[1] - D_A[1], 0]);
const dashPt = (t, z, off) => [mix(D_A[0], D_B[0], t) + D_N[0] * off,
  mix(D_A[1], D_B[1], t) + D_N[1] * off, z];
const WHEEL_C = dashPt(0.3, 0, 0.11), WHEEL_R = 0.17;
// The rim, as an angle round it: a = 0 points up the dash rake, a = +90 deg to
// starboard. The rim's own tangent is the derivative of that, and it is what
// the hand is wrapped around.
const wheelPt = (a) => V3.add(WHEEL_C, V3.add(sc(D_T, Math.cos(a)), [0, 0, Math.sin(a)]), WHEEL_R);
const wheelTan = (a) => V3.unit(V3.add(sc(D_T, -Math.sin(a)), [0, 0, Math.cos(a)]));
// Turning the wheel is a rotation about the shaft, and the shaft is the plane
// normal of (D_T, +z): rotating by +a about it maps the rim point at angle b to
// the one at b + a, which is what lets one number move rim, spokes and hand.
const WHEEL_AXIS = V3.unit(cross(D_T, [0, 0, 1]));

// Bone slots for the RIB, laid out the way boat-pwc.js lays out the ski's.
export const RPB = { STATIC: 0, WHEEL: 1, RIDER: 2 };
export const RIB_BONES = RPB.RIDER + RIDER_BONES;

// Where her left hand holds the rim: 10 o'clock seen from the seat.
const RIB_GRIP_A = -60 * DEG;
// Bind pose. footL/footR are ANKLES (the rig solves the foot from there), and
// gripR sits on the throttle knob at the starboard corner of the console.
const RIB_BIND = {
  hip: [-0.24, 1.00, 0], lean: 9 * DEG, tilt: 0, headUp: 0,
  footL: [-0.12, 0.32, -0.20], footR: [-0.08, 0.32, 0.20],
  gripL: wheelPt(RIB_GRIP_A), gripR: [0.12, 1.10, 0.43],
  axisL: wheelTan(RIB_GRIP_A), barAxis: [0, 0, 1],
};

// Built ONCE, lazily, exactly like the ski's. ⚠️ ribParts() shifts every mesh
// by -cgX in place, so this may be built and shifted once per process.
let RIB_RIG = null;
function ribRig() {
  if (!RIB_RIG) RIB_RIG = buildRider(RIB_BIND, { grip: 0.017, base: RPB.RIDER });
  return RIB_RIG;
}

// ---------------------------------------------------------------------------
// POSE. Every term is READ from the hull the physics publishes, through the
// smoothed rider state boats.js keeps; nothing is written back.
//   rise  coming onto the plane: up off the saddle, weight aft
//   tuck  at speed: down behind the screen, head lower
//   squat a landing or a hard wave: hips drop, the knees take it
//   tilt  leans INTO the turn, further over than the hull's own bank
//   bar   the wheel, and with it her left hand
//
// THE AMPLITUDES ARE SMALLER THAN THE SKI'S AND THAT IS NOT TIMIDITY. Her right
// arm is at 86% of its reach in the bind pose, because the throttle is a long
// way forward of a shoulder that is already aft of it; any stance that adds
// more than ~70 mm of reach pulls the wrist past elbow + forearm, and a
// two-bone IK that cannot reach its target puts the hand where it was asked
// and the forearm where it fits - which shows as the hand detaching from the
// arm. tmp-tr162/test-rig162.mjs sweeps the whole pose space and fails on any
// bone whose posed length differs from its bind length, so these numbers are
// measured against that rather than guessed.
export function ribBones(st, cgX, out) {
  identityMat(out, RPB.STATIC);
  rigidMat(out, RPB.WHEEL, WHEEL_AXIS, st.bar, WHEEL_C, cgX);
  const rise = st.rise, tuck = st.tuck, squat = st.squat, air = st.air, tilt = st.tilt;
  const a = RIB_GRIP_A + st.bar;
  const lean = (9 + 10 * tuck - 3 * rise + 5 * squat) * DEG;
  const hip = [-0.24 - 0.030 * rise + 0.040 * tuck + 0.015 * squat,
    1.00 + 0.045 * rise - 0.055 * squat + 0.015 * air,
    Math.sin(tilt) * 0.040];
  // Returns the POSED skeleton, the same way pwcBones does, for the harness.
  return riderMats(ribRig().bind, {
    hip, lean, tilt, headUp: -0.26 * tuck - 0.08 * rise,
    footL: RIB_BIND.footL, footR: RIB_BIND.footR,
    gripL: wheelPt(a), gripR: RIB_BIND.gripR,
    axisL: wheelTan(a), barAxis: RIB_BIND.barAxis,
  }, out, RPB.RIDER, cgX);
}

const GRP = [0.80, 0.81, 0.82], STEEL = [0.56, 0.58, 0.6], BLACK = [0.02, 0.02, 0.022], VINYL = [0.06, 0.063, 0.068];
// The owner's brand navy, #042742, converted once with the exact sRGB transfer
// function - the same literal boat-pwc.js uses. It replaces the generic dark
// grey on the tubes, which are 5.8 m long and the largest single surface on
// this boat: that is the colour a viewer reads before any mark resolves. The
// white GRP hull is left alone, so the boat is navy-on-white like the logo.
const NAVY = [0.00121, 0.02029, 0.05448];
const TINT = [0.02, 0.028, 0.034], MAT = [0.1, 0.104, 0.11];

// ---------------------------------------------------------------------------
// RIB 5.8 m, 150 hp.
// poses: 1 because the driver is SKINNED now, not baked in three leans. _pose()
// in boats.js still divides by (poses - 1) safely - it comes out 0 - and no RIB
// part carries a `pose` tag any more, so nothing is filtered by it.
export const RIB_FX = { transom: -2.62, prop: [-3.27, -0.46], bow: 3.1, chine: 0.84, tube: 1.2, poses: 1, rig: true };

export function ribParts(cgX) {
  const parts = [];
  const add = (mesh, color, rough, skin, name) => parts.push({ mesh, color, rough, skin, name });

  // Hull: deep-V bottom with two lifting strakes and a chine flat, then a short
  // flared topside up under the tubes; transom plate.
  const hull = new MeshBuilder();
  const HX = [-2.6, -2.3, -1.8, -1.1, -0.3, 0.5, 1.2, 1.8, 2.3, 2.7, 3.0, 3.2];
  const bottom = (x) => {
    const bow = sm(0.4, 3.25, x), yk = -0.34 + 0.46 * Math.pow(bow, 1.8);
    const bc = Math.max(0.03, 0.84 * Math.sqrt(Math.max(0, 1 - bow * bow))), tD = Math.tan((21 + 22 * bow) * DEG);
    const w = 0.03 * bc / 0.84, s1 = bc * 0.36, s2 = bc * 0.7;
    const y = (z, k) => yk + z * tD - k * w * tD;
    return [[0, yk], [s1, y(s1, 0)], [s1 + w, y(s1, 0)], [s2, y(s2, 1)], [s2 + w, y(s2, 1)], [bc, y(bc, 2)],
      [bc + 0.06 * bc / 0.84, y(bc, 2) + 0.006]];
  };
  const topside = (x) => { const b = bottom(x), c = b[b.length - 1], bow = sm(0.4, 3.25, x);
    return [c, [c[0] + 0.02, mix(c[1], 0.17 + 0.3 * bow, 0.5)], [c[0] + 0.035, 0.17 + 0.3 * bow]]; };
  const outDir = (p) => [0, p[1] - 0.4, p[2]];
  grid(hull, HX.map((x) => ring(x, bottom(x))), outDir);
  for (const s of [1, -1]) grid(hull, HX.map((x) => topside(x).map(([z, y]) => [x, y, s * z])), outDir);
  const tr = [...ring(-2.6, bottom(-2.6)).map((p) => p), [-2.6, topside(-2.6)[2][1], topside(-2.6)[2][0]]];
  grid(hull, [[[-2.6, topside(-2.6)[2][1], -topside(-2.6)[2][0]], ...tr],
    [[-2.6, 0.5, -0.9], ...tr.map((p) => [-2.6, Math.abs(p[2]) < 0.62 ? 0.52 : 0.5, p[2]]).slice(0, -1), [-2.6, 0.5, 0.9]]],
  () => [-1, 0, 0]);
  add(hull, GRP, 0.3);

  // Tubes: one continuous sweep, port cone -> bow -> starboard cone, tapering.
  const TP = [[-3.2, 0.36, 0.955, 0.06], [-3.12, 0.355, 0.955, 0.17], [-2.96, 0.345, 0.96, 0.232], [-2.5, 0.34, 0.965, 0.25],
    [-1.5, 0.345, 0.975, 0.25], [-0.5, 0.355, 0.98, 0.248], [0.5, 0.375, 0.965, 0.242], [1.3, 0.41, 0.92, 0.235],
    [1.95, 0.46, 0.8, 0.228], [2.45, 0.52, 0.63, 0.22], [2.82, 0.575, 0.44, 0.212], [3.05, 0.615, 0.23, 0.205], [3.14, 0.63, 0, 0.2]];
  const half = spline(TP, 3);
  const path = [...mirror(half.map((p) => [p[0], p[1], p[2]])), ...half.slice(0, -1).reverse().map((p) => [p[0], p[1], p[2]])];
  const radii = [...half.map((p) => p[3]), ...half.slice(0, -1).reverse().map((p) => p[3])];
  const tubes = new MeshBuilder();
  sweep(tubes, path, (i) => radii[i], 14);
  add(tubes, NAVY, 0.55);
  // Rubbing strake and lifelines ride the same path, pushed outboard.
  const outH = (i) => { const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    let o = V3.unit([-(b[2] - a[2]), 0, b[0] - a[0]]); if (V3.dot(o, [path[i][0] - 1, 0, path[i][2]]) < 0) o = sc(o, -1); return o; };
  const rub = new MeshBuilder(), trim = new MeshBuilder();
  sweep(rub, path.map((p, i) => V3.add(V3.add(p, outH(i), radii[i] * 0.93), [0, -0.05, 0], 1)), (i) => (radii[i] > 0.15 ? 0.03 : 0.012), 6);
  const lineIdx = path.map((p, i) => i).filter((i) => path[i][0] > -2.4 && path[i][0] < 2.9);
  let arc = 0;
  const line = lineIdx.map((i, k) => {
    if (k) arc += V3.len(V3.sub(path[i], path[lineIdx[k - 1]]));
    const sag = 0.045 * Math.sin(Math.PI * ((arc / 0.62) % 1));
    const o = outH(i), r = radii[i];
    const p = V3.add(V3.add(path[i], o, r * 0.78 + sag * 0.5), [0, 1, 0], r * 0.62 - sag);
    if (Math.abs(Math.sin(Math.PI * ((arc / 0.62) % 1))) < 0.2) {
      const q = V3.add(V3.add(path[i], o, r * 0.72), [0, 1, 0], r * 0.7);
      box(trim, q[0] - 0.03, q[1] - 0.015, q[2] - 0.03, q[0] + 0.03, q[1] + 0.015, q[2] + 0.03);
    }
    return p;
  });
  sweep(trim, line, 0.009, 4);
  add(rub, BLACK, 0.6);
  add(trim, [0.3, 0.31, 0.32], 0.8);

  // Deck inside the tubes.
  const tubeAt = (x) => { let i = 3; while (i < TP.length - 2 && TP[i + 1][0] < x) i++;
    const a = TP[i], b = TP[i + 1], t = cl((x - a[0]) / (b[0] - a[0]), 0, 1); return [mix(a[2], b[2], t), mix(a[3], b[3], t)]; };
  const deck = new MeshBuilder();
  grid(deck, [-2.58, -2.0, -1.0, 0, 1.0, 1.8, 2.3, 2.7].map((x) => {
    const [tz, tr2] = tubeAt(x), z = Math.max(0.08, tz - tr2 * 0.82), y = 0.24 + 0.2 * sm(1.8, 2.9, x);
    return [[x, y, -z], [x, y + 0.01, 0], [x, y, z]];
  }), () => [0, 1, 0]);
  add(deck, [0.2, 0.205, 0.21], 0.92);

  const grp = new MeshBuilder(), vinyl = new MeshBuilder(), steel = new MeshBuilder(), black = new MeshBuilder();
  // Bow locker with its cushion, tapering to the bow.
  const taper = (rx, k) => (lx, ly, lz) => [lx, ly + 0.06 * lx / rx, lz * (1 - k * (lx / rx + 1) / 2)];
  blob(grp, [1.55, 0.44, 0], 0.62, 0.2, 0.5, { e1: 0.25, e2: 0.35, deform: taper(0.62, 0.45) });
  blob(vinyl, [1.52, 0.67, 0], 0.57, 0.06, 0.44, { e1: 0.4, e2: 0.3, deform: taper(0.57, 0.45) });
  // Centre console: rounded body with the aft top raked into a dash.
  blob(grp, [0.42, 0.66, 0], 0.34, 0.44, 0.36, { e1: 0.2, e2: 0.25, seg: 14,
    deform: (lx, ly, lz) => [lx, ly > 0 ? ly * (1 - 0.45 * cl(-lx / 0.34, 0, 1)) : ly, lz * (1 + 0.06 * cl(-ly / 0.44, 0, 1))] });
  // The dash plane and the wheel now come from the module-scope constants at
  // the top of this file, so the bind pose, the per-frame pose and the mesh all
  // name ONE wheel. `dn`/`dt`/`dash` are kept as local aliases so the lines
  // below read exactly as they did.
  const dn = D_N, dt = D_T, dash = dashPt;
  grid(black, [[dash(0, -0.29, 0), dash(0, 0.29, 0)], [dash(1, -0.29, 0), dash(1, 0.29, 0)]], () => dn);
  const screen = new MeshBuilder();
  grid(screen, [[dash(0.55, -0.2, 0.008), dash(0.55, 0.2, 0.008)], [dash(0.92, -0.2, 0.008), dash(0.92, 0.2, 0.008)]], () => dn);
  // Wheel on a raked shaft, three spokes. The rim and the spokes are TAGGED
  // onto the wheel bone - one contiguous vertex range in `black`, between the
  // dash face before it and the throttle box after it - so the wheel turns with
  // the driver's hand instead of her hand sliding round a wheel that is welded
  // to the console.
  const wc = WHEEL_C, wheel = wheelPt;
  const statBlack = black.vertexCount;
  const rim = []; for (let k = 0; k <= 20; k++) rim.push(wheel((k / 20) * 2 * Math.PI));
  sweep(black, rim, 0.015, 6);
  for (const a of [0, 2.1, -2.1]) { const p = wheel(a); black.tube(wc[0], wc[1], wc[2], p[0], p[1], p[2], 0.01, 0.008, 5, false, false); }
  const wheelEnd = black.vertexCount;
  const w0 = dash(0.3, 0, 0);
  steel.tube(w0[0], w0[1], w0[2], wc[0], wc[1], wc[2], 0.022, 0.035, 8);
  // Wraparound screen on the console top, stainless top edge.
  const glass = new MeshBuilder();
  const sp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  const sb = [], st = [];
  for (let k = 0; k <= 8; k++) {
    const a = (-100 + 25 * k) * DEG, bx = 0.42 + 0.34 * sp(Math.cos(a), 0.25), bz = 0.36 * sp(Math.sin(a), 0.25);
    sb.push([bx, 1.1, bz]); st.push([bx - 0.14, 1.4, bz * 1.06]);
  }
  grid(glass, [sb, st], (p) => [p[0] - 0.2, 0.3, p[2]]);
  sweep(steel, st, 0.009, 5);
  // Grab rail round the console, throttle box and lever on the starboard side.
  const rail = [[0.08, 0.78, 0.42], [0.06, 1.02, 0.43], [0.12, 1.17, 0.44], [0.4, 1.23, 0.45], [0.68, 1.22, 0.41], [0.84, 1.18, 0.26], [0.88, 1.16, 0]];
  sweep(steel, spline([...rail, ...mirror(rail).reverse().slice(1)], 3), 0.016, 6);
  box(black, 0.17, 0.8, 0.355, 0.35, 0.95, 0.43);
  steel.tube(0.26, 0.93, 0.42, 0.15, 1.1, 0.45, 0.011, 0.011, 6);
  blob(black, [0.14, 1.12, 0.45], 0.03, 0.03, 0.03, { seg: 8, rings: 5 });
  // Jockey seat: pedestal, saddle, rear bolster, grab bar.
  blob(grp, [-0.58, 0.5, 0], 0.3, 0.26, 0.21, { e1: 0.25, e2: 0.3 });
  blob(vinyl, [-0.55, 0.84, 0], 0.4, 0.09, 0.24, { e1: 0.5, e2: 0.35 });
  blob(vinyl, [-0.88, 0.95, 0], 0.09, 0.08, 0.22, { e1: 0.5, e2: 0.35 });
  sweep(steel, spline([[-0.9, 0.8, -0.2], [-0.99, 1.0, -0.2], [-1.0, 1.06, -0.1], [-1.0, 1.07, 0], [-1.0, 1.06, 0.1], [-0.99, 1.0, 0.2], [-0.9, 0.8, 0.2]], 2), 0.016, 6);
  // Stainless A-frame over the transom with a nav light and a raked whip.
  for (const s of [1, -1]) sweep(steel, spline([[-2.5, 0.56, s * 0.79], [-2.46, 1.3, s * 0.68], [-2.4, 1.92, s * 0.52], [-2.4, 1.95, s * 0.3]], 3), 0.028, 7);
  steel.tube(-2.4, 1.95, -0.3, -2.4, 1.95, 0.3, 0.028, 0.028, 7, false, false);
  steel.tube(-2.4, 1.95, 0, -2.42, 2.12, 0, 0.018, 0.018, 6);
  blob(grp, [-2.42, 2.16, 0], 0.035, 0.045, 0.035, { seg: 8, rings: 5 });
  black.tube(-2.4, 1.95, 0.42, -2.72, 3.05, 0.46, 0.012, 0.006, 5);
  // Outboard: bracket, swivel, chaps, split line, cowl, leg, plate, gearcase, skeg, prop.
  const ob = new MeshBuilder(), cowl = new MeshBuilder(), lower = new MeshBuilder();
  box(lower, -2.74, 0.18, -0.15, -2.6, 0.58, 0.15);
  blob(ob, [-2.8, 0.45, 0], 0.09, 0.2, 0.1, { e1: 0.4, e2: 0.4, seg: 8, rings: 6 });
  blob(ob, [-2.98, 0.62, 0], 0.32, 0.1, 0.24, { e1: 0.35, e2: 0.5 });
  blob(steel, [-2.99, 0.725, 0], 0.345, 0.018, 0.252, { e1: 0.2, e2: 0.5, rings: 4 });
  blob(cowl, [-3.0, 0.98, 0], 0.38, 0.28, 0.27, { e1: 0.5, e2: 0.55, seg: 14, rings: 9,
    deform: (lx, ly, lz) => [lx, ly > 0 && lx < 0 ? ly * (1 - 0.22 * (-lx / 0.38)) : ly, lz * (1 - 0.18 * Math.max(0, lx / 0.38))] });
  blob(lower, [-2.93, 0.15, 0], 0.15, 0.4, 0.07, { e1: 0.15, e2: 0.65, deform: (lx, ly, lz) => [lx, ly, lz * (1 - 0.35 * Math.max(0, -lx / 0.15))] });
  blob(lower, [-3.0, -0.27, 0], 0.26, 0.014, 0.13, { e1: 0.2, e2: 0.4, rings: 4, deform: (lx, ly, lz) => [lx, ly, lz * (1 - 0.5 * Math.max(0, -lx / 0.26))] });
  blob(lower, [-2.95, -0.36, 0], 0.13, 0.1, 0.05, { e1: 0.2, e2: 0.6, rings: 5 });
  blob(lower, [-2.97, -0.46, 0], 0.25, 0.075, 0.075, { seg: 10, rings: 6 });
  blob(lower, [-3.02, -0.62, 0], 0.09, 0.12, 0.013, { e1: 0.3, e2: 0.5, seg: 8, rings: 5 });
  const prop = new MeshBuilder();
  prop.tube(-3.2, -0.46, 0, -3.34, -0.46, 0, 0.05, 0.035, 10);
  for (let k = 0; k < 3; k++) {
    const a = k * 2.094 + 0.26, R = [0, Math.cos(a), Math.sin(a)], Tg = [0, -Math.sin(a), Math.cos(a)];
    const C = V3.unit(V3.add(sc(Tg, Math.cos(25 * DEG)), [1, 0, 0], Math.sin(25 * DEG)));
    blob(prop, V3.add([-3.26, -0.46, 0], R, 0.12), 0.07, 0.11, 0.012, { X: C, Y: R, Z: cross(C, R), seg: 8, rings: 5 });
  }
  add(grp, GRP, 0.3); add(vinyl, VINYL, 0.7); add(steel, STEEL, 0.18);
  add(black, BLACK, 0.5, skinRange(black, statBlack, RPB.WHEEL, wheelEnd), 'black trim + wheel');
  add(screen, [0.01, 0.012, 0.016], 0.06); add(glass, TINT, 0.05);
  add(ob, [0.035, 0.035, 0.04], 0.35); add(cowl, [0.018, 0.018, 0.02], 0.16); add(lower, [0.07, 0.072, 0.076], 0.35);
  add(prop, [0.42, 0.43, 0.45], 0.2);

  // Driver perched on the jockey seat: left hand at 10 o'clock on the wheel,
  // right hand on the throttle, feet flat on the deck. ONE figure on the rig
  // (see the top of this file), not three baked leans, so she rises onto the
  // plane, tucks at speed and takes a landing on her knees.
  for (const f of ribRig().parts) {
    parts.push({ name: 'driver mat ' + f.mat, mesh: f.mesh, mat: f.mat, skin: f.skin, bone: RPB.RIDER });
  }
  // Her back roundel, on the same rig and therefore on the same bone as the
  // buoyancy aid it is stuck to - ONE copy now, where there were three.
  const ds = new DecalSheet();
  const info = riderVestDecal(ribRig().bind, ds, LIVERY_UV.roundel);
  parts.push({ name: 'livery driver', ...ds.build(), color: GRP, rough: 0.5, rider: true, info,
    skin: ds.skin(RPB.RIDER) });

  // ---- LIVERY (tr153): the WORDMARK on each tube ------------------------
  // The tube is this boat's flank - 5.8 m of it, the one surface a side-on
  // camera sees whole - so it takes the wide mark, exactly as the ski's hull
  // topside does. It takes the PLATED tile rather than the ink one because the
  // tubes are now navy and bare navy ink on navy is nothing.
  //
  // MEASURED, and this is what sets the size: the rubbing strake rides the
  // tube 12.1 deg BELOW the outboard equator and stands 18 mm proud of it, and
  // the lifeline with its mounting blocks sits about 38 deg ABOVE. The clear
  // band between them is 0.52 rad, which at r 0.248 is 0.129 m of skin - so the
  // plate is 0.129 x 6.263 = 0.808 m long and sits from the equator upward.
  const tubeStation = (x) => {
    let i = 3; while (i < TP.length - 2 && TP[i + 1][0] < x) i++;
    const a = TP[i], b = TP[i + 1], t = cl((x - a[0]) / (b[0] - a[0]), 0, 1);
    return [mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t)];   // y, z, r
  };
  const ribDec = new DecalSheet();
  const PLATE_H = 0.129, PLATE_L = PLATE_H * LIVERY_ASPECT.wordplate;
  for (const sgn of [1, -1]) {
    ribDec.patch((a, b) => {
      const x = mix(-0.35 - PLATE_L / 2, -0.35 + PLATE_L / 2, a);
      const [ty, tz, tr] = tubeStation(x), th = mix(-0.50, 0.02, b);
      return [x, ty - tr * Math.sin(th), sgn * (tz + tr * Math.cos(th))];
    }, LIVERY_UV.wordplate,
    // Same inboard-normal trap as the ski's flank: b runs DOWN the tube.
    { nu: 10, nv: 3, lift: 0.010, flipN: sgn > 0, uvOf: (a, b) => [sgn > 0 ? a : 1 - a, b] });
  }
  parts.push({ name: 'livery rib', ...ribDec.build(), color: GRP, rough: 0.5 });
  for (const p of parts) for (let i = 0; i < p.mesh.v.length; i += 3) p.mesh.v[i] -= cgX;
  return parts;
}

// The PWC (jetski) lives in boat-pwc.js (tmp-tr95) and is re-exported above.
