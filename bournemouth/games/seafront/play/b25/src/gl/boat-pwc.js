// The PWC (jetski): a modern sit-down runabout, rebuilt tmp-tr95 because the
// tmp-tr51 model read as a flat wedge with a black slab on it (its own RESULT
// says so). No brand, badge, logo or livery anywhere - the shape is read from
// PUBLISHED GENERAL PROPORTIONS for the 3.3-3.5 m three-seat performance class,
// not from any one machine:
//   LOA 3.35-3.45 m, beam 1.22-1.27 m, dry mass 330-390 kg, draft ~0.25 m.
//   Hull depth ~0.40 m at the transom, ~0.78 m at the stem: the sheer RISES
//     about 0.45 m from stern to bow, which is the single thing the old model
//     did not do and the reason it looked like a wedge.
//   Deadrise 21-24 deg at the transom opening to ~50 deg at the forefoot, a
//     hard chine with a chine flat, one lifting strake per side, and a step in
//     the keel about 1.25 m forward of the transom.
//   Seat top 0.85-0.92 m above the keel, bar grips 1.08-1.18 m above it,
//     deck-mounted mirrors, footwell floor ~0.55 m above the keel.
//   Rear platform 0.40-0.50 m long; sponsons ~0.5 m long set aft of amidships
//     and standing 25-40 mm proud; intake grate ~0.36 x 0.16 m in the keel;
//     pump nozzle ~0.16 m across, steering about +/-24 deg.
//
// LIVERY (tr153). This ski, and only this ski, wears the OWNER'S OWN BRAND. The
// project's no-branding rule is not relaxed by it: the rule exists so the model
// does not put a real business's name on someone else's property - it is why
// eight ROCKREEF letter blocks were deleted and why the Haven Hotel's parapet
// is deliberately blank. The player's craft is the owner's own, in the owner's
// own game, so a mark on it is advertising and not impersonation. NOTHING in
// here may be copied onto a longship, a brig, the pier, a building, a hut, a
// sail or a flag. The proportions above are unchanged; only paint and four
// decals were added.
// The hull here is 3.52 m end to end and 1.20 m in the beam because it has to
// match the PHYSICS hull in src/boats/jetski.js (length 3.4, beam 1.2, the
// spring points out to +/-0.62 and the outline to x 1.85 / -1.65). Nothing in
// this file touches physics.
//
// Frame: +X forward, +Y up, +Z right; y 0 = the static waterline; the keel sits
// at y -0.235 at the transom (draft 0.235). Everything is shifted by -cgX last.
//
// MOVING PARTS. Parts that carry `skin` are transformed on the CPU each frame
// from the bone list below - no extra draw call, the same VAO, one
// bufferSubData. Bone 0 is the identity, so a part can mix moving and static
// vertices (the bars live in the same black part as the seat handle).

import { MeshBuilder, RIDER_MAT } from './meshes.js';
import { V3, box, DEG, cl, sm, mix, cross, grid, sweep, blob, spline, mirror, ring } from './boat-meshes.js';
import { DecalSheet, LIVERY_UV } from './boat-meshes.js';
import { buildRider, riderMats, rigidMat, identityMat, RIDER_BONES, riderVestDecal } from './boat-rider.js';

export const PWC_FX = { transom: -1.62, nozzle: [-1.8, -0.08], bow: 1.8, chine: 0.58, tube: 0.6, poses: 1, rig: true };

// Bone slots shared by the whole craft.
export const PB = { STATIC: 0, BARS: 1, NOZZLE: 2, RIDER: 3 };
export const PWC_BONES = PB.RIDER + RIDER_BONES;

// ---------------------------------------------------------------------------
// Hull curves. Piecewise tables, smoothstep between the knots.
function curve(tab) {
  return (x) => {
    if (x <= tab[0][0]) return tab[0][1];
    for (let i = 0; i + 1 < tab.length; i++) {
      if (x <= tab[i + 1][0]) return mix(tab[i][1], tab[i + 1][1], sm(tab[i][0], tab[i + 1][0], x));
    }
    return tab[tab.length - 1][1];
  };
}

// Keel line. The 18 mm break at x -0.35 is the hull STEP: the aft running
// surface is deeper, and the step face shows as a hard line under the hull.
const keel = curve([[-1.65, -0.235], [-0.9, -0.240], [-0.38, -0.234], [-0.34, -0.216], [0.2, -0.190],
  [0.8, -0.098], [1.25, 0.080], [1.55, 0.268], [1.75, 0.435], [1.90, 0.560]]);
const chineZ = curve([[-1.65, 0.600], [-1.2, 0.605], [-0.4, 0.600], [0.2, 0.585], [0.7, 0.552],
  [1.1, 0.492], [1.4, 0.400], [1.62, 0.300], [1.80, 0.180], [1.90, 0.045]]);
const sheerY = curve([[-1.65, 0.178], [-1.0, 0.208], [0, 0.288], [0.7, 0.372], [1.15, 0.462],
  [1.5, 0.552], [1.75, 0.608], [1.85, 0.632], [1.90, 0.646]]);
const crownY = curve([[0.30, 0.590], [0.55, 0.725], [0.80, 0.782], [1.05, 0.780], [1.3, 0.752],
  [1.55, 0.718], [1.72, 0.688], [1.84, 0.662], [1.90, 0.648]]);
const flare = curve([[-1.65, 0.014], [-0.4, 0.018], [0.4, 0.030], [1.0, 0.050], [1.5, 0.070], [1.90, 0.082]]);
const dead = (x) => (22 + 29 * sm(0.15, 1.7, x)) * DEG;
const sheerZ = (x) => chineZ(x) + flare(x);
const chineY = (x) => keel(x) + chineZ(x) * Math.tan(dead(x));

// Half section, centreline -> sheer, as [z, y]. Seven points, every station:
// keel, bottom panel, strake ledge (2), chine, chine flat, topside, sheer.
function hullSection(x) {
  const cz = chineZ(x), k = keel(x), tD = Math.tan(dead(x)), cy = chineY(x), sy = sheerY(x), sz = sheerZ(x);
  const sA = 0.58 * cz, sB = 0.66 * cz;
  return [
    [0, k],
    [0.30 * cz, k + 0.30 * cz * tD],
    [sA, k + sA * tD],
    [sB, k + sA * tD + 0.004],
    [cz, cy],
    [cz + 0.030 * (0.4 + 0.6 * cz / 0.6), cy + 0.008],
    [mix(cz, sz, 0.55) + 0.012, mix(cy, sy, 0.52)],
    [sz, sy],
  ];
}

// ---------------------------------------------------------------------------
// Deck profiles, centreline -> sheer, EIGHT points each so they interpolate.
const platProf = (x) => {
  const sz = sheerZ(x), sy = sheerY(x);
  return [[0, 0.252], [0.16, 0.252], [0.28, 0.250], [0.38, 0.248], [0.46, 0.246],
    [0.53, 0.244], [sz - 0.055, 0.248], [sz, sy]];
};
const wellProf = (x) => {
  const sz = sheerZ(x), sy = sheerY(x);
  const fl = mix(0.306, 0.468, sm(-1.00, -1.30, x));   // the well floor fills in aft
  return [[0, 0.556], [0.185, 0.556], [0.232, fl + 0.040], [0.278, fl + 0.002], [0.400, fl],
    [0.452, fl + 0.098], [sz - 0.075, 0.478], [sz, sy]];
};
const hoodProf = (x) => {
  const sz = sheerZ(x), sy = sheerY(x), cr = crownY(x), d = cr - sy;
  return [[0, cr], [0.20 * sz, cr - 0.015 * d / 0.3], [0.40 * sz, cr - 0.075 * d / 0.3],
    [0.60 * sz, cr - 0.185 * d / 0.3], [0.755 * sz, sy + 0.44 * d], [0.865 * sz, sy + 0.245 * d],
    [0.950 * sz, sy + 0.10 * d], [sz, sy]];
};
function deckProf(x) {
  const w = sm(-1.46, -1.28, x) * (1 - sm(0.16, 0.42, x)), b = sm(0.22, 0.62, x);
  const p = platProf(x), q = wellProf(x), h = hoodProf(x);
  return p.map((pt, i) => [mix(mix(pt[0], q[i][0], w), h[i][0], b), mix(mix(pt[1], q[i][1], w), h[i][1], b)]);
}
function deckY(x, z) {
  const pr = deckProf(x);
  for (let i = 0; i + 1 < pr.length; i++) {
    if (z <= pr[i + 1][0]) return mix(pr[i][1], pr[i + 1][1], cl((z - pr[i][0]) / Math.max(1e-4, pr[i + 1][0] - pr[i][0]), 0, 1));
  }
  return pr[pr.length - 1][1];
}

// ---------------------------------------------------------------------------
// LIVERY SURFACES (tr153). Two walkers that go along a section by ARC LENGTH
// rather than by z or by a fraction, because a mark parametrised in z comes out
// stretched wherever the panel is steep - which on a ski is most of it.

// `d` metres DOWN the hull section from the sheer, on the topside panel (the
// last three points of hullSection: chine flat, topside, sheer). Returns the
// 3D point; the decal sheet takes the normal from the surface itself.
function sidePt(x, d, sgn) {
  const pr = hullSection(x).slice(5).reverse();          // sheer first, going down
  let acc = 0;
  for (let i = 0; i + 1 < pr.length; i++) {
    const dz = pr[i + 1][0] - pr[i][0], dy = pr[i + 1][1] - pr[i][1], L = Math.hypot(dz, dy);
    if (acc + L >= d || i === pr.length - 2) {
      const t = cl((d - acc) / Math.max(1e-6, L), 0, 1);
      return [x, mix(pr[i][1], pr[i + 1][1], t), sgn * mix(pr[i][0], pr[i + 1][0], t)];
    }
    acc += L;
  }
  return [x, pr[0][1], sgn * pr[0][0]];
}

// The arc length of that topside panel at station x - the room a mark has.
function sideBand(x) {
  const pr = hullSection(x).slice(5);
  let acc = 0;
  for (let i = 0; i + 1 < pr.length; i++) acc += Math.hypot(pr[i + 1][0] - pr[i][0], pr[i + 1][1] - pr[i][1]);
  return acc;
}

// `s` metres OUTBOARD along the deck section from the centreline; s may be
// negative, which crosses the centreline cleanly because every deck profile
// starts at z = 0.
function deckArcPt(x, s) {
  const pr = deckProf(x), a = Math.abs(s), sg = s < 0 ? -1 : 1;
  let acc = 0;
  for (let i = 0; i + 1 < pr.length; i++) {
    const dz = pr[i + 1][0] - pr[i][0], dy = pr[i + 1][1] - pr[i][1], L = Math.hypot(dz, dy);
    if (acc + L >= a || i === pr.length - 2) {
      const t = cl((a - acc) / Math.max(1e-6, L), 0, 1);
      return [x, mix(pr[i][1], pr[i + 1][1], t), sg * mix(pr[i][0], pr[i + 1][0], t)];
    }
    acc += L;
  }
  return [x, pr[0][1], 0];
}

// A skin of the deck between two z fractions of the sheer, lifted clear: this
// is how the two-tone graphics are made, so they follow the moulding exactly.
// Lift a point off the deck along the SECTION normal, not straight up: on the
// steep shoulder of the hood a vertical lift buries the panel in the moulding
// and the graphic breaks into z-fighting zigzags (seen, tmp-tr95 first look).
function deckPt(x, z, lift, sgn) {
  const d = 0.012, y = deckY(x, z);
  const dy = (deckY(x, z + d) - deckY(x, Math.max(0, z - d))) / (z >= d ? 2 * d : d + z);
  const n = Math.hypot(1, dy);
  return [x, y + lift / n, sgn * (z - lift * dy / n)];
}
function deckPanel(m, xs, f0, f1, n, lift) {
  const side = (sgn) => xs.map((x) => {
    const sz = sheerZ(x), r = [];
    for (let k = 0; k <= n; k++) r.push(deckPt(x, mix(f0 * sz, f1 * sz, k / n), lift, sgn));
    return r;
  });
  if (f0 < 0.001) {
    grid(m, xs.map((x) => {
      const sz = sheerZ(x), r = [];
      for (let k = -n; k <= n; k++) { const p = deckPt(x, Math.abs(k / n) * f1 * sz, lift, k < 0 ? -1 : 1); r.push(p); }
      return r;
    }), () => [0, 1, 0]);
  } else {
    grid(m, side(1), () => [0, 1, 0]);
    grid(m, side(-1), () => [0, 1, 0]);
  }
}

// LINEAR colour, the same convention every other literal in this file uses.
// NAVY and BLUE are the owner's two brand colours - #042742 and #1173B3,
// MEASURED off logo.jpg, not sampled by eye - converted once with the exact
// sRGB transfer function. They replace the generic red deck and charcoal
// two-tone: a 0.5 m2 field of the right blue is read at 40 m, which is further
// out than any decal on this boat survives.
const NAVY = [0.00121, 0.02029, 0.05448];       // #042742
const BLUE = [0.00561, 0.17144, 0.45079];       // #1173B3
const WHITE = [0.84, 0.845, 0.85], CHAR = [0.035, 0.037, 0.042];
const MATT = [0.085, 0.088, 0.094], BLACK = [0.02, 0.02, 0.022], CUSH = [0.028, 0.030, 0.034];
const GREY = [0.115, 0.118, 0.126], STEEL = [0.30, 0.31, 0.32], TINT = [0.02, 0.028, 0.034];

// Bind pose of the rider, and the hardware she holds.
const GRIP_R = 0.033;
const BAR_PIVOT = [0.345, 0.885, 0];
const BAR_AXIS = V3.unit([-Math.sin(32 * DEG), Math.cos(32 * DEG), 0]);
const GRIP = [0.300, 0.905, 0.288];
const BIND = {
  hip: [-0.24, 0.752, 0], lean: 20 * DEG, tilt: 0, headUp: 0,
  footL: [0.06, 0.378, -0.330], footR: [0.06, 0.378, 0.330],
  gripL: [GRIP[0], GRIP[1], -GRIP[2]], gripR: GRIP, barAxis: [0, 0, 1],
};

let RIG = null;
function rig() { if (!RIG) RIG = buildRider(BIND, { grip: GRIP_R, base: PB.RIDER }); return RIG; }

// ---------------------------------------------------------------------------
export function pwcParts(cgX) {
  const parts = [];
  const add = (name, mesh, color, rough, skin) => parts.push({ name, mesh, color, rough, skin });
  const JX = [-1.62, -1.45, -1.2, -0.9, -0.62, -0.38, -0.34, -0.05, 0.25, 0.55, 0.85, 1.1,
    1.3, 1.45, 1.58, 1.70, 1.80, 1.86, 1.90];

  // ---- hull: deep-V bottom, strake, chine flat, flared topside -----------
  const hull = new MeshBuilder();
  grid(hull, JX.map((x) => ring(x, hullSection(x))), (p) => [0, p[1] - 0.45, p[2]]);
  // Transom: the hull ring closed off, and the deck edge above it.
  const tb = ring(-1.62, hullSection(-1.62));
  grid(hull, [tb, tb.map((p) => [p[0], 0.252, p[2] * 0.985])], () => [-1, 0, 0]);
  // Bow flash: the white carries up onto the deck shoulder so the two-tone is
  // a hull colour, not a sticker.
  deckPanel(hull, [0.40, 0.62, 0.84, 1.05, 1.24, 1.42, 1.58, 1.72, 1.84], 0.610, 0.880, 3, 0.010);
  // The chase camera sees the AFT deck, not the hood, so the flash runs back
  // along the gunwale shoulder as well (checked on the 852x393 phone shot).
  deckPanel(hull, [-1.52, -1.34, -1.12, -0.85, -0.55, -0.25, 0.05, 0.30], 0.760, 0.930, 2, 0.010);
  // The seat's own two-tone: a WHITE base under a black cushion. Grey-on-black
  // was invisible at 20 m and the seat went back to reading as one slab.
  for (const s of [1, -1]) {
    blob(hull, [-0.38, 0.514, s * 0.197], 0.430, 0.046, 0.026, { e1: 0.35, e2: 0.45, seg: 12, rings: 5,
      deform: (lx, ly, lz) => [lx, ly, lz * (1 - 0.15 * cl(lx / 0.45, 0, 1))] });
    blob(hull, [-1.06, 0.556, s * 0.194], 0.300, 0.046, 0.026, { e1: 0.35, e2: 0.45, seg: 10, rings: 5 });
  }
  add('hull + seat base + flash', hull, WHITE, 0.26, null);

  // ---- deck moulding -----------------------------------------------------
  const DX = [-1.62, -1.48, -1.34, -1.22, -1.10, -0.85, -0.55, -0.25, 0, 0.16, 0.30, 0.44, 0.58,
    0.75, 0.95, 1.15, 1.32, 1.48, 1.62, 1.74, 1.84, 1.90];
  const deck = new MeshBuilder();
  grid(deck, DX.map((x) => ring(x, deckProf(x))), (p) => [0, 1, p[2] * 0.35]);
  // Seat base under the passenger section: without it the rear cushion floats
  // over the boarding platform (seen, tmp-tr95 second look).
  blob(deck, [-1.06, 0.428, 0], 0.350, 0.150, 0.196, { e1: 0.28, e2: 0.35, seg: 12, rings: 6,
    deform: (lx, ly, lz) => [lx, ly, lz * (1 - 0.30 * cl(-lx / 0.35, 0, 1))] });
  // Steering-pod fairing where the column leaves the hood.
  blob(deck, [0.44, 0.60, 0], 0.20, 0.135, 0.20, { e1: 0.35, e2: 0.35, seg: 12, rings: 7 });
  add('deck', deck, BLUE, 0.28, null);

  // ---- two-tone: charcoal crown, charcoal hood flanks --------------------
  const hood = new MeshBuilder();
  deckPanel(hood, [0.38, 0.58, 0.80, 1.02, 1.22, 1.42, 1.60, 1.74, 1.86], 0, 0.44, 3, 0.011);
  deckPanel(hood, [0.88, 1.10, 1.30, 1.48, 1.64, 1.78], 0.890, 0.985, 1, 0.010);
  deckPanel(hood, [-1.60, -1.50, -1.40, -1.30], 0, 0.62, 3, 0.011);
  add('two-tone', hood, NAVY, 0.30, null);

  // ---- traction mats -----------------------------------------------------
  const mats = new MeshBuilder();
  for (const s of [1, -1]) {
    grid(mats, [-1.00, -0.75, -0.45, -0.15, 0.06, 0.20].map((x) =>
      [0.275, 0.330, 0.392].map((z) => [x, deckY(x, z) + 0.006, s * z])), () => [0, 1, 0]);
  }
  grid(mats, [-1.58, -1.45, -1.32, -1.22].map((x) =>
    [-0.42, -0.14, 0.14, 0.42].map((z) => [x, deckY(x, Math.abs(z)) + 0.006, z])), () => [0, 1, 0]);
  add('mats', mats, MATT, 0.94, null);

  // ---- rubbing strake on the hull/deck joint, bond line, spray rail ------
  const blk = new MeshBuilder();
  const joint = [];
  for (let k = 0; k <= 24; k++) { const x = mix(-1.61, 1.895, (k / 24) ** 0.9); joint.push([x, sheerY(x) - 0.010, sheerZ(x) + 0.012]); }
  sweep(blk, [...joint, ...mirror(joint).reverse().slice(1)], (i, n) => (Math.abs(i - (n - 1) / 2) < 1.2 ? 0.014 : 0.021), 5);

  // ---- seat: stepped, two-tone, grab handle ------------------------------
  const seat = new MeshBuilder(), grey = new MeshBuilder(), steel = new MeshBuilder(), glass = new MeshBuilder();
  blob(seat, [-0.34, 0.600, 0], 0.455, 0.064, 0.232, { e1: 0.40, e2: 0.35, seg: 14, rings: 7,
    deform: (lx, ly, lz) => [lx, ly, lz * (1 - 0.13 * cl(lx / 0.455, 0, 1))] });
  blob(seat, [-1.06, 0.668, 0], 0.300, 0.064, 0.222, { e1: 0.40, e2: 0.35, seg: 12, rings: 6 });
  blob(seat, [-0.80, 0.644, 0], 0.078, 0.090, 0.229, { e1: 0.30, e2: 0.35, seg: 10, rings: 6 });
  blob(seat, [-1.285, 0.628, 0], 0.090, 0.050, 0.190, { e1: 0.40, e2: 0.40, seg: 10, rings: 5 });
  add('seat cushions', seat, CUSH, 0.62, null);
  // Spray rail: the line along the chine flat. Without it the topside is one
  // unbroken white slab from 10 m out.
  const rail = [];
  for (let k = 0; k <= 20; k++) { const x = mix(-1.61, 1.87, (k / 20) ** 0.92); rail.push([x, chineY(x) + 0.010, chineZ(x) + 0.030]); }
  sweep(grey, [...rail, ...mirror(rail).reverse().slice(1)], (i, n) => (Math.abs(i - (n - 1) / 2) < 1.2 ? 0.005 : 0.009), 4);

  // ---- sponsons, ride plate, intake grate, pump, boarding step -----------
  for (const s of [1, -1]) {
    blob(grey, [-0.95, 0.045, s * (chineZ(-0.95) + 0.030)], 0.400, 0.036, 0.055,
      { e1: 0.30, e2: 0.45, seg: 10, rings: 5, deform: (lx, ly, lz) => [lx, ly - 0.05 * cl(lx / 0.4, 0, 1), lz * (1 - 0.55 * cl(lx / 0.4, 0, 1))] });
    box(grey, -1.05, 0.02, s * (chineZ(-1.0) - 0.004), -0.85, 0.105, s * (chineZ(-1.0) + 0.022));
  }
  box(grey, -1.64, keel(-1.35) - 0.006, -0.155, -1.28, keel(-1.35) + 0.012, 0.155);   // ride plate
  for (let k = -2; k <= 2; k++) {                                                      // intake grate bars
    box(grey, -1.50, keel(-1.28) - 0.004, k * 0.052 - 0.011, -1.16, keel(-1.28) + 0.014, k * 0.052 + 0.011);
  }
  grey.tube(-1.54, -0.095, 0, -1.74, -0.085, 0, 0.085, 0.066, 10);                     // pump housing
  blob(grey, [-1.79, -0.082, 0], 0.045, 0.105, 0.105, { e1: 0.45, e2: 0.45, seg: 10, rings: 6 }); // bucket shell
  // Steering nozzle: the one piece of hardware that follows the bars. It lives
  // in the SAME part as the rest of the grey hardware (one draw call), tagged
  // onto the nozzle bone by vertex range.
  const statGrey = grey.vertexCount;
  grey.tube(-1.745, -0.088, 0, -1.845, -0.086, 0, 0.068, 0.050, 10);
  blob(grey, [-1.855, -0.086, 0], 0.016, 0.062, 0.062, { e1: 0.4, e2: 0.4, seg: 10, rings: 5 });
  add('sponsons/plate/pump/nozzle', grey, GREY, 0.38, skinRange(grey, statGrey, PB.NOZZLE));

  // ---- black: bumper (done), seat seams, handle, bars, grips, levers -----
  for (const s of [1, -1]) {                                     // seat shoulder seams
    const ln = [];
    for (let k = 0; k <= 9; k++) { const x = mix(-1.40, 0.10, k / 9); ln.push([x, (x < -0.80 ? 0.724 : 0.656) - 0.006, s * (x < -0.80 ? 0.212 : 0.218)]); }
    sweep(blk, ln, 0.007, 4);
  }
  sweep(blk, spline([[-1.42, 0.672, -0.15], [-1.53, 0.712, -0.125], [-1.575, 0.728, 0], [-1.53, 0.712, 0.125], [-1.42, 0.672, 0.15]], 2), 0.018, 6);
  blob(blk, [0.545, 0.700, -0.235], 0.045, 0.030, 0.052, { e1: 0.3, e2: 0.35, seg: 8, rings: 5 });   // fuel filler
  box(blk, 0.47, 0.678, -0.11, 0.62, 0.742, 0.11);                                                   // dash pod body
  for (const s of [1, -1]) {                                                                         // mirrors (deck mounted)
    blk.tube(0.475, 0.640, s * 0.315, 0.452, 0.752, s * 0.415, 0.011, 0.010, 5, false, false);
    blob(blk, [0.448, 0.766, s * 0.437], 0.022, 0.048, 0.080, { e1: 0.35, e2: 0.4, seg: 8, rings: 5 });
  }
  const statBlk = blk.vertexCount;
  // Bars and everything that turns with them.
  blk.tube(0.455, 0.585, 0, 0.360, 0.880, 0, 0.055, 0.040, 9);                                       // column boot
  const barPath = spline([[0.268, 0.918, -0.340], [0.318, 0.898, -0.190], [0.345, 0.888, 0],
    [0.318, 0.898, 0.190], [0.268, 0.918, 0.340]], 3);
  sweep(steel, barPath, 0.016, 6);
  box(blk, 0.318, 0.876, -0.044, 0.372, 0.906, 0.044);                                               // bar clamp
  const statSteel = steel.vertexCount;
  for (const s of [1, -1]) {
    blk.tube(0.300, 0.906, s * 0.232, 0.270, 0.916, s * 0.342, GRIP_R, GRIP_R - 0.002, 9);           // grip
    blob(blk, [0.266, 0.917, s * 0.352], 0.016, 0.040, 0.040, { e1: 0.4, e2: 0.4, seg: 8, rings: 4 });
    box(blk, 0.296, 0.856, s * 0.200, 0.352, 0.880, s * 0.228);                                      // lever
  }
  add('black trim + bars', blk, BLACK, 0.48, skinRange(blk, statBlk, PB.BARS));

  // ---- steel fittings: bow eye, cleat, tow eye ---------------------------
  sweep(steel, spline([[1.845, 0.470, -0.045], [1.868, 0.452, -0.028], [1.874, 0.446, 0], [1.868, 0.452, 0.028], [1.845, 0.470, 0.045]], 2), 0.011, 5);
  sweep(steel, spline([[1.44, 0.690, -0.060], [1.455, 0.716, -0.040], [1.458, 0.722, 0], [1.455, 0.716, 0.040], [1.44, 0.690, 0.060]], 2), 0.010, 5);
  sweep(steel, spline([[-1.615, 0.130, -0.048], [-1.648, 0.112, -0.030], [-1.654, 0.106, 0], [-1.648, 0.112, 0.030], [-1.615, 0.130, 0.048]], 2), 0.011, 5);
  box(steel, -1.60, 0.055, 0.105, -1.50, 0.070, 0.300);                                              // boarding step
  steel.tube(-1.545, 0.070, 0.145, -1.545, 0.225, 0.145, 0.010, 0.010, 5);

  // ---- glass: windscreen / visor and the dash face -----------------------
  const vb = [], vt = [];
  for (let k = 0; k <= 5; k++) {
    const z = -0.235 + 0.094 * k, f = 1 - 0.78 * (z / 0.235) * (z / 0.235);
    vb.push([0.640 + 0.085 * (1 - f), 0.700 + 0.020 * (1 - f), z]);
    vt.push([0.548 + 0.105 * (1 - f), 0.822 - 0.028 * (1 - f), z * 1.06]);
  }
  grid(glass, [vb, vt], () => [1, 0.55, 0]);
  sweep(steel, vt, 0.008, 5);
  box(glass, 0.487, 0.686, -0.095, 0.497, 0.736, 0.095);
  add('glass', glass, TINT, 0.05, null);
  add('bar tube + fittings', steel, STEEL, 0.22, skinRange(steel, 0, PB.BARS, statSteel));

  // ---- the rider ---------------------------------------------------------
  for (const f of rig().parts) parts.push({ name: 'rider mat ' + f.mat, mesh: f.mesh, mat: f.mat, skin: f.skin, bone: PB.RIDER });

  // ---- LIVERY (tr153) ----------------------------------------------------
  // FOUR marks, placed by where the camera actually is rather than by where
  // there is room. Measured off a 657-frame capture of live play:
  //   the chase camera sits BEHIND and slightly above, so the rider's back and
  //   the aft deck are near face-on and the hull flanks are nearly edge-on.
  // So the roundel - the symmetrical mark, the one that survives being small -
  // goes on the back and on the two decks, and the wordmark - 7.4:1, and the
  // first thing to die at distance - goes on the flanks where it is seen in
  // reels, in replays and from the quarter, and where its shape fits the panel.
  //
  // TWO sheets, because they have different jobs: the rider's mark is on a body
  // that is hidden in FPV, the ski's marks are not.
  const R_UV = LIVERY_UV.roundel, W_UV = LIVERY_UV.wordmark;

  const skiDec = new DecalSheet();
  // 1-2. WORDMARK on each topside flank. A ribbon of constant height hung 30 mm
  // under the sheer, aft where the topside is deep: the panel shallows to 43 mm
  // by x 1.0, so anything carried forward of amidships would be squeezed.
  //
  // MEASURED, not guessed. The topside's arc length runs 0.164 m at the transom
  // to 0.252 m at x 0.30 and back to 0.187 m by x 0.60; the sponsons stand
  // proud from x -1.35 to -0.55 and would cut the bottom off anything over
  // them. So the ribbon is amidships, x -0.45 to 0.55, where the shallowest
  // station still measures 0.203 m and nothing crosses it.
  const WORD_L = 1.00, WORD_H = WORD_L * 30 / 222;      // the atlas tile's 7.400:1
  for (const sgn of [1, -1]) {
    skiDec.patch((a, b) => sidePt(mix(-0.45, 0.55, a), 0.040 + b * WORD_H, sgn), W_UV,
      // b runs DOWN the section, so d/da x d/db comes out pointing INBOARD on
      // the starboard side. Caught by check-livery.mjs's ray cast, not by eye:
      // the first render simply had no wordmark on it, because a 9 mm lift
      // along an inward normal puts the mark 9 mm inside the hull.
      { nu: 10, nv: 2, lift: 0.009, flipN: sgn > 0, uvOf: (a, b) => [sgn > 0 ? a : 1 - a, b] });
  }
  // 3. ROUNDEL on the hood crown, reading for someone ASTERN - the camera's
  // side up, not a bystander's. Seen in FPV, where the hood fills the bottom
  // third of the screen, from the side camera, and whenever the nose lifts.
  // 0.20 m and not larger: the hood is a RIDGE, and a patch wide enough to look
  // generous wraps over the crown far enough that the disc reads as a lozenge
  // in FPV, where it is biggest. Seen, then cut.
  skiDec.patch((a, b) => deckArcPt(mix(1.31, 1.11, a), mix(-0.10, 0.10, b)), R_UV,
    { nu: 4, nv: 4, lift: 0.019, uvOf: (a, b) => [1 - b, a] });
  //
  // THERE IS NO STERN BADGE, and that is a decision rather than an oversight.
  // The boarding platform looks like the obvious place for one - it is what the
  // chase camera is pointed at - but MEASURED, the deck section is only flat
  // from the transom to x -1.46: deckProf blends into the footwell over -1.46
  // to -1.28 and climbs 0.31 m up the seat base, and the two-tone panel that
  // covers it is tessellated at 0.10 m stations that cut that corner. Anything
  // large enough to read draped over the step; anything that fitted the flat
  // was 0.12 m, which is a dot at chase range. The mark that carries the brand
  // from behind is the one on the rider's back, which is 225 mm and face-on.
  // NO skin table, deliberately. All three patches ride sidePt/deckArcPt, which
  // are HULL surfaces, and the hull is bone STATIC - a skin table here would buy
  // an identity transform over every vertex and a bufferSubData every frame for
  // not one pixel of difference. The rider's mark below is the one that moves.
  parts.push({ name: 'livery ski', ...skiDec.build(), color: WHITE, rough: 0.22 });

  // 5. ROUNDEL on the rider's back. See boat-rider.js: this is the surface.
  const ridDec = new DecalSheet();
  const ridInfo = riderVestDecal(rig().bind, ridDec, R_UV);
  parts.push({ name: 'livery rider', ...ridDec.build(), color: WHITE, rough: 0.5, rider: true, info: ridInfo,
    // The SAME base her own mesh is built with (rig() passes base: PB.RIDER),
    // so the roundel indexes the identical bone slot the torso it is stuck to
    // does. riderVestDecal tagged the range; this turns it into the table.
    skin: ridDec.skin(PB.RIDER) });

  for (const p of parts) for (let i = 0; i < p.mesh.v.length; i += 3) p.mesh.v[i] -= cgX;
  return parts;
}

// Vertices [from, to) belong to `bone`; everything else is static (bone 0).
// Exported because the RIB's steering wheel is tagged exactly the same way.
export function skinRange(m, from, bone, to) {
  const n = m.vertexCount, end = to == null ? n : to;
  const b0 = new Uint8Array(n), b1 = new Uint8Array(n), w1 = new Float32Array(n);
  for (let k = from; k < end; k++) { b0[k] = bone; b1[k] = bone; }
  return { b0, b1, w1 };
}

// ---------------------------------------------------------------------------
// POSE. Everything here is read from the hull the physics already publishes -
// roll, pitch, u, thr, wet, airTicks, vy, r - and nothing is written back.
// `st` is the smoothed rider state kept by boats.js.
export function pwcBones(st, cgX, out) {
  identityMat(out, PB.STATIC);
  rigidMat(out, PB.BARS, BAR_AXIS, -st.bar, BAR_PIVOT, cgX);
  rigidMat(out, PB.NOZZLE, [0, 1, 0], -st.bar * 0.75, [-1.745, -0.088, 0], cgX);

  // Where the grips have gone: the hands follow the bar, so the arms do too.
  const c = Math.cos(-st.bar), s = Math.sin(-st.bar), t = 1 - c, A = BAR_AXIS;
  const rot = (p) => {
    const d = [p[0] - BAR_PIVOT[0], p[1] - BAR_PIVOT[1], p[2] - BAR_PIVOT[2]];
    const k = cross(A, d), dd = V3.dot(A, d);
    return [BAR_PIVOT[0] + d[0] * c + k[0] * s + A[0] * dd * t,
      BAR_PIVOT[1] + d[1] * c + k[1] * s + A[1] * dd * t,
      BAR_PIVOT[2] + d[2] * c + k[2] * s + A[2] * dd * t];
  };
  const gR = rot(GRIP), gL = rot([GRIP[0], GRIP[1], -GRIP[2]]);
  const barAxis = V3.unit(V3.sub(gR, gL));

  // Stance. rise: weight back and up over the hump. tuck: down over the bars
  // at speed. squat: the knees taking a landing. lean: into the turn.
  const rise = st.rise, tuck = st.tuck, squat = st.squat, air = st.air;
  const lean = (20 + 13 * tuck - 4 * rise + 5 * squat) * DEG;
  const tilt = st.tilt;
  const hip = [-0.24 - 0.085 * rise + 0.045 * tuck + 0.02 * squat,
    0.752 + 0.070 * rise - 0.060 * squat + 0.020 * air,
    Math.sin(tilt) * 0.045];
  const pose = {
    hip, lean, tilt, headUp: -0.30 * tuck - 0.12 * rise,
    footL: [0.06 + 0.02 * rise, 0.378 - 0.012 * squat, -0.330],
    footR: [0.06 + 0.02 * rise, 0.378 - 0.012 * squat, 0.330],
    gripL: gL, gripR: gR, barAxis,
  };
  // Hands back the POSED skeleton skeleton() solved, so a harness can hold
  // every bone's length against its bind length without reaching into the
  // module. Nothing in the renderer reads it.
  return riderMats(rig().bind, pose, out, PB.RIDER, cgX);
}
