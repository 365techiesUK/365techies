// VIKING RAID - longships, "Hollywood epic" pass (tr59). Built only from RaidActors on raid entry.
//
// FRAME. Every hull is built in the 16 m reference frame (L0) and scaled by L/16 per instance,
// exactly like the collision capsule in src/raid/collide.js (radius 1.7 x L/16, half-segment
// L/2 - 1.15 x L/16): the planked hull runs x = -8..+8 with a 1.8 m half-beam, so bounces
// still meet the planking. Only the carved posts and the dragon head overhang, high above
// the water. Crews on the 21 m and 30 m hulls are built at 16/L so they stay human-sized.
//
// NEAR  ship / shipJarl / shipBoss: clinker hull (lapped strakes with a shadow lip), rocker,
//       high stem and stern posts, carved snarling dragon head and tail curl, gunwale rail,
//       shields hung along the rail, oars through ports (stroke + feather in the shader),
//       steering oar on the starboard quarter, mast, yard, stays and shrouds, pennants, crew.
// MID   shipMid: fewer stations and strakes, simple dragon, hexagon shields, oars, blob crew.
// FAR   shipFar: impostor-level silhouette with its own striped sail (~60 tris).
// Sails: sail / sailJarl / sailBoss (near, billow + tear in the shader), sailMid.
import { Kit, PAINT, ZERO, CREW, shield } from './raid-kit.js';
import { warrior, rower, figureLo } from './raid-crew.js';

export const L0 = 16;
const PERSON = 1.12;   // cartoon crews a touch larger than life so they read at arcade distances
export const MAST_FOOT = [0.3, 1.0, 0.0];       // the shader's MAST_FOOT
export const OAR_DY = 0.48, OAR_DZ = 0.877;      // oar direction outboard: (0, -OAR_DY, side * OAR_DZ), unit length
export const halfBeam = (t) => 1.8 * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(t)), 2.2)), 0.7);
export const sheer = (t) => 1.15 + 1.55 * Math.pow(Math.min(1, Math.abs(t)), 3.2);
export const keel = (t) => -0.6 + 0.85 * Math.pow(Math.min(1, Math.abs(t)), 2.5);
export const deckY = (t) => Math.max(0.35, keel(t) + 0.95);
const SEC_Y = 0.65, SEC_Z = 0.9;
// strakes are spaced evenly in height (v = 0 at the sheer, 1 at the keel), so the painted sheer strake is a band
const section = (t, v, side) => {
  const ys = sheer(t), yk = keel(t), r = Math.pow(Math.min(1, v), 1 / SEC_Y);
  return [t * 8, ys - (ys - yk) * v, side * halfBeam(t) * Math.pow(Math.max(0, 1 - r * r), SEC_Z / 2)];
};
const zAt = (t, y) => {
  const ys = sheer(t), yk = keel(t), r = Math.min(1, Math.max(0, (ys - y) / (ys - yk)));
  return halfBeam(t) * Math.pow(Math.cos(Math.asin(Math.pow(r, 1 / SEC_Y))), SEC_Z);
};
const xf = (T, x, y, z) => {
  const c = Math.cos(T.a || 0), s = Math.sin(T.a || 0), k = T.s || 1;
  return [T.x + (x * c - z * s) * k, T.y + y * k, T.z + (x * s + z * c) * k];
};

// Per-kind layout. Thrower slots stand at the rail midway between oars; the scene maps a
// rules 'throw' event (ship-relative launch point) to the nearest slot on that side.
export const LAYOUT = {
  ship: { s: 1, oars: 5, x0: -4.5, dx: 2.0, slotsI: [0, 2, 4], dragon: 1.0, band: 'bandShip', sail: 'sail' },
  jarl: { s: 16 / 21, oars: 7, x0: -5.3, dx: 1.6, slotsI: [0, 2, 4, 6], dragon: 1.12, band: 'bandJarl', sail: 'sailJarl' },
  boss: { s: 16 / 30, oars: 11, x0: -5.8, dx: 1.1, slotsI: [0, 2, 5, 8, 10], dragon: 1.08, band: 'bandBoss', sail: 'sailBoss' },
};
// slot list: index = slot number (0..), {x, side}; starboard (+Z) slots first
export function slotsOf(kind) {
  const L = LAYOUT[kind] || LAYOUT.ship, out = [];
  for (const side of [1, -1]) for (const i of L.slotsI) out.push({ x: L.x0 + L.dx * i + L.dx * 0.5, side });
  return out;
}

// ---------------------------------------------------------------------------
function hullShell(k, NS, K, band, lips) {
  const lap = 0.05;
  for (const side of [-1, 1]) {
    for (let j = 0; j < K; j++) {
      const c = j === 0 ? band : [PAINT.plankA, PAINT.plankB, PAINT.plankC][j % 3];
      for (let i = 0; i < NS; i++) {
        const t0 = -1 + (2 * i) / NS, t1 = -1 + (2 * (i + 1)) / NS;
        const A = section(t0, j / K, side), B = section(t1, j / K, side), C = section(t1, (j + 1) / K, side), D = section(t0, (j + 1) / K, side);
        if (!lips || j === K - 1) { k.quad(c, A, B, C, D); continue; }
        const o = (p, t) => { const f = Math.min(1, halfBeam(t) / 0.35); return [p[0], p[1] - lap * 0.5 * f, p[2] + side * lap * f]; };
        const Co = o(C, t1), Do = o(D, t0);
        k.quad(c, A, B, Co, Do);
        k.quad(PAINT.lap, Do, Co, C, D);
      }
    }
  }
}

function rail(k, n, r, seg) {
  for (const side of [-1, 1]) {
    const pts = [], rad = [];
    for (let i = 0; i <= n; i++) { const t = -0.96 + (1.92 * i) / n; pts.push([t * 8, sheer(t) + 0.03, side * (halfBeam(t) + 0.02)]); rad.push(r); }
    k.path(PAINT.gunwale, pts, rad, seg, 0, ZERO, false);
  }
}

function deck(k, n) {
  for (let i = 0; i < n; i++) {
    const t0 = -0.86 + (1.72 * i) / n, t1 = -0.86 + (1.72 * (i + 1)) / n, y0 = deckY(t0), y1 = deckY(t1);
    const w0 = zAt(t0, y0), w1 = zAt(t1, y1);
    k.quad(i % 2 ? PAINT.deck : PAINT.chest, [t0 * 8, y0, -w0], [t1 * 8, y1, -w1], [t1 * 8, y1, w1], [t0 * 8, y0, w0]);
  }
}

function posts(k, seg, lo) {
  const R = lo ? [0.24, 0.22, 0.19] : [0.25, 0.25, 0.23, 0.21, 0.19];
  const stem = lo ? [[8.0, 0.25], [8.55, 2.3], [8.7, 3.9]] : [[8.0, 0.25], [8.3, 1.2], [8.55, 2.3], [8.72, 3.2], [8.7, 3.95]];
  k.path(PAINT.post, stem.map(([x, y]) => [x, y, 0]), R, seg, 0, ZERO, false);
  k.path(PAINT.post, stem.map(([x, y]) => [-x, y, 0]), R, seg, 0, ZERO, false);
  // stern: the tail sweeps up and rolls into a spiral
  const cx = -8.12, cy = 4.1, pts = [[-8.7, 3.95, 0]], rad = [0.19];
  const N = lo ? 4 : 8;
  for (let i = 1; i <= N; i++) {
    const f = i / N, th = Math.PI - f * Math.PI * 1.75, r = 0.58 - 0.42 * f;
    pts.push([cx + Math.cos(th) * r, cy + Math.sin(th) * r, 0]); rad.push(0.19 - 0.13 * f);
  }
  k.path(PAINT.post, pts, rad, seg, 0, ZERO, true);
}

// Carved dragon head, facing +X, neck base at T. pal: {wood, horn, mane, eye}
function dragon(k, T, pal, lo) {
  if (lo) {
    k.path(pal.wood, [xf(T, 0, 0, 0), xf(T, 0.15, 0.6, 0), xf(T, 0.3, 0.98, 0)], [0.2 * T.s, 0.18 * T.s, 0.17 * T.s], 4, 0, ZERO, false);
    k.addT(T, pal.wood, (b) => { b.ellipsoid(0.45, 1.05, 0, 0.36, 0.25, 0.23, 5, 3); b.tube(0.6, 1.06, 0, 1.4, 1.0, 0, 0.18, 0.1, 4, false, true); b.tube(0.55, 0.9, 0, 1.2, 0.64, 0, 0.13, 0.06, 4, false, true); });
    k.addT(T, pal.horn, (b) => { for (const sd of [-1, 1]) { b.tube(0.35, 1.25, sd * 0.14, -0.05, 1.6, sd * 0.28, 0.09, 0.05, 3, false, false); b.tube(-0.05, 1.6, sd * 0.28, -0.55, 1.62, sd * 0.3, 0.05, 0.0, 3, false, false); } });
    k.addT(T, pal.eye, (b) => { for (const sd of [-1, 1]) b.ellipsoid(0.64, 1.2, sd * 0.19, 0.08, 0.07, 0.06, 4, 2); }, 0, ZERO, 1);
    return;
  }
  const W = pal.wood;
  k.path(W, [xf(T, 0, 0, 0), xf(T, 0.16, 0.36, 0), xf(T, 0.1, 0.7, 0), xf(T, 0.28, 0.98, 0)], [0.21 * T.s, 0.2 * T.s, 0.18 * T.s, 0.17 * T.s], 6, 0, ZERO, false);
  k.addT(T, W, (b) => {
    b.ellipsoid(0.44, 1.06, 0, 0.37, 0.27, 0.25, 7, 4);                 // skull
    b.tube(0.62, 1.09, 0, 1.36, 1.0, 0, 0.2, 0.12, 6, false, false);      // upper snout
    b.ellipsoid(1.36, 1.06, 0, 0.15, 0.11, 0.14, 6, 3);                  // nose knob, upturned
    b.tube(0.56, 0.9, 0, 1.22, 0.64, 0, 0.145, 0.07, 5, false, true);    // lower jaw, open in a snarl
    for (const sd of [-1, 1]) b.tube(0.8, 1.25, sd * 0.17, 0.4, 1.37, sd * 0.23, 0.065, 0.04, 4, false, true);   // brows
  });
  k.addT(T, pal.dark, (b) => { b.ellipsoid(1.47, 1.1, 0, 0.05, 0.05, 0.1, 4, 2); b.ellipsoid(0.9, 0.93, 0, 0.3, 0.07, 0.1, 5, 2); });
  k.addT(T, pal.eye, (b) => { for (const sd of [-1, 1]) b.ellipsoid(0.66, 1.2, sd * 0.2, 0.075, 0.065, 0.05, 5, 2); }, 0, ZERO, 1);
  k.addT(T, pal.horn, (b) => {
    for (const sd of [-1, 1]) {
      const P = [[0.36, 1.26, sd * 0.14], [0.06, 1.56, sd * 0.27], [-0.36, 1.72, sd * 0.33], [-0.66, 1.62, sd * 0.3]], R = [0.095, 0.075, 0.045, 0.006];
      for (let i = 0; i < 3; i++) b.tube(P[i][0], P[i][1], P[i][2], P[i + 1][0], P[i + 1][1], P[i + 1][2], R[i], R[i + 1], 5, false, false);
    }
  });
  // teeth: upper row down, lower row up, big fangs at the front
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const x = 0.78 + i * 0.13, yb = 1.02 - i * 0.012, z = sd * (0.15 - i * 0.012), L = i === 4 ? 0.2 : 0.12;
      k.tri(PAINT.ivory, xf(T, x - 0.045, yb - 0.08, z), xf(T, x + 0.045, yb - 0.08, z), xf(T, x + 0.01, yb - 0.08 - L, z));
    }
    for (let i = 0; i < 4; i++) {
      const x = 0.72 + i * 0.13, yb = 0.86 - i * 0.055, z = sd * (0.1 - i * 0.012);
      k.tri(PAINT.ivory, xf(T, x - 0.04, yb, z), xf(T, x + 0.04, yb, z), xf(T, x + 0.01, yb + 0.11, z));
    }
    // cheek frill
    k.tri(pal.mane, xf(T, 0.3, 1.0, sd * 0.2), xf(T, 0.05, 0.75, sd * 0.42), xf(T, 0.0, 1.05, sd * 0.3));
  }
  k.quad(PAINT.tongue, xf(T, 0.7, 0.86, 0), xf(T, 1.25, 0.8, 0.0), xf(T, 1.5, 0.66, 0.08), xf(T, 1.2, 0.73, 0.0));
  k.tri(PAINT.tongue, xf(T, 1.25, 0.8, 0), xf(T, 1.5, 0.66, -0.08), xf(T, 1.2, 0.73, 0));
  // mane spikes down the back of the neck
  const spine = [[0.05, 1.28], [-0.05, 1.0], [0.0, 0.7], [0.12, 0.42], [0.0, 0.12]];
  for (const [x, y] of spine) k.tri(pal.mane, xf(T, x - 0.1, y + 0.1, 0), xf(T, x - 0.1, y - 0.14, 0), xf(T, x - 0.48, y - 0.1, 0));
}

function pennant(k, x, y, z, len, wid, color, segs) {
  const pv = [x, y, z];
  for (let i = 0; i < segs; i++) {
    const f0 = i / segs, f1 = (i + 1) / segs, w0 = wid * (1 - 0.8 * f0), w1 = wid * (1 - 0.8 * f1);
    k.quad(color, [x - len * f0, y, z], [x - len * f1, y, z], [x - len * f1, y - w1, z], [x - len * f0, y - w0, z], 15, pv);
  }
}

function rig(k, seg, lo, s) {
  k.add(PAINT.spar, (b) => {
    b.tube(0.3, 0.3, 0, 0.3, 10.6, 0, 0.17, 0.09, seg, false, true);
    b.tube(0.5, 9.55, -4.35, 0.5, 9.55, 4.35, 0.1, 0.1, Math.max(4, seg - 1), true, true);
  }, 5, MAST_FOOT);
  if (lo) return;
  k.add(PAINT.rope, (b) => {
    const top = [0.3, 10.35, 0];
    b.tube(...top, 8.45, 2.9, 0, 0.028, 0.028, 3, false, false);
    b.tube(...top, -8.45, 2.9, 0, 0.028, 0.028, 3, false, false);
    for (const sd of [-1, 1]) {
      for (const x of [-1.4, -2.9]) { const t = x / 8; b.tube(0.3, 9.9, 0, x, sheer(t) + 0.05, sd * halfBeam(t), 0.022, 0.022, 3, false, false); }
      b.tube(0.55, 9.6, sd * 4.3, 0.3, 3.5, sd * 3.9, 0.02, 0.02, 3, false, false);        // leech down to the foot
      const tb = -3.4 / 8; b.tube(0.95, 3.05, sd * 3.9, -3.4, sheer(tb) + 0.05, sd * halfBeam(tb), 0.022, 0.022, 3, false, false);   // sheets
    }
  }, 5, MAST_FOOT);
  k.add(PAINT.gold, (b) => b.ellipsoid(0.3, 10.7, 0, 0.14, 0.14, 0.14, 5, 2), 5, MAST_FOOT);
  pennant(k, 0.25, 10.65, 0, 2.6 * Math.max(0.8, s), 0.5, PAINT.banner, 4);
}

function oars(k, L, detail) {
  const s = L.s, ps = s * PERSON;
  for (const side of [-1, 1]) {
    for (let i = 0; i < L.oars; i++) {
      const xo = L.x0 + L.dx * i, t = xo / 8, P0 = [xo, sheer(t) - 0.12, side * halfBeam(t)];
      // INBOARD LENGTH (tr67): the handle sweeps 0.877 x Lin fore and aft over a stroke, and
      // the rower's shoulders swing about that far, so Lin is tied to his size. It also seats
      // him where his arms can reach the handle without the oar crossing his chest.
      const Lin = 0.80 * ps, Lout = (P0[1] + 0.3) / OAR_DY;
      const D = [0, -OAR_DY, side * OAR_DZ];
      const H = [xo, P0[1] - D[1] * Lin, P0[2] - D[2] * Lin], tip = [xo, P0[1] + D[1] * Lout, P0[2] + D[2] * Lout];
      const r = 0.05 * Math.max(0.62, s), bl = 1.0, w = 0.14 * Math.max(0.75, Math.sqrt(s));
      k.add(PAINT.oar, (b) => b.tube(H[0] - D[0] * 0.26 * ps, H[1] - D[1] * 0.26 * ps, H[2] - D[2] * 0.26 * ps, tip[0] - D[0] * bl * 0.5, tip[1] - D[1] * bl * 0.5, tip[2] - D[2] * bl * 0.5, r, r * 0.8, detail ? 5 : 3, true, false), 1, P0);
      const B0 = [xo, tip[1] - D[1] * bl, tip[2] - D[2] * bl];
      k.quad(PAINT.oarBlade, [B0[0] - w * 0.6, B0[1], B0[2]], [B0[0] + w * 0.6, B0[1], B0[2]], [tip[0] + w, tip[1], tip[2]], [tip[0] - w, tip[1], tip[2]], 9, P0);
      if (!detail) continue;
      // The rower sits inboard of and below his handle, on a sea chest, facing the stern.
      const hip = [xo + 0.30 * ps, H[1] - 0.72 * ps, H[2] - side * 0.34 * ps];
      const dy = deckY(t);
      k.box(PAINT.chest, hip[0] - 0.30 * s, dy, hip[2] - 0.26 * s, hip[0] + 0.30 * s, hip[1] - 0.02, hip[2] + 0.26 * s);
      const n = i * 2 + (side > 0 ? 1 : 0) + L.oars;
      rower(k, { x: hip[0], y: hip[1], z: hip[2], a: Math.PI, s: ps },
        { tunic: n * 3, fur: n, hair: n * 7, horns: n % 4 === 1, paint: n % 3 === 0, mail: n % 5 === 2, beard: 1 + (n % 3) * 0.12, port: P0, grip: H, side });
    }
  }
}

// The shield row. SPACING IS LOAD-BEARING and must not change: the centres are laid out at
// L.dx/2, half a bay out of phase with the oar ports, so every port sits exactly midway
// between two shields (the nearest shield centre is L.dx/4 away in x). Any other spacing
// brings a shield on top of a port and the oar cannot clear it at the catch.
//
// tr67 shrank these to r = 0.40 x (L.dx/2) to win that clearance and left a 0.1 x L.dx gap
// between every pair of rims - a dashed row instead of a shield wall. tr73 puts the row back
// together WITHOUT touching the spacing: r = 0.56 x (L.dx/2), so each disc overlaps its
// neighbours by 12% of the spacing and the rims read as a continuous line along the sheer,
// and the whole row is hung higher (SHIELD_Y below) so the oar still passes under it.
// Clearance is now +37 / +20 / +17 mm (ship / jarl / boss), better than tr67's +14 / +9 / +23:
//   node tmp-tr67/shieldclear.mjs <root> 0.56 <that hull's y offset>
export const SHIELD_R = (L) => (L.dx / 2) * 0.56;
export const SHIELD_Y = (L) => SHIELD_R(L) * 0.75 - 0.04;
function shields(k, L, detail) {
  const dx = L.dx / 2, r = SHIELD_R(L), yo = SHIELD_Y(L);
  let n = 0;
  for (const side of [-1, 1]) {
    for (let x = L.x0 - dx * 0.5 - dx * Math.floor((L.x0 + 6.7) / dx); x <= 6.75; x += dx, n++) {
      const t = x / 8;
      if (Math.abs(t) > 0.86) continue;
      const pair = PAINT.shieldPairs[(n * 5 + (side > 0 ? 2 : 0)) % PAINT.shieldPairs.length];
      if (detail) shield(k, x, sheer(t) + yo, side * (halfBeam(t) + 0.06), r, pair, side, 8, true);
      else shield(k, x, sheer(t) + yo, side * (halfBeam(t) + 0.06), r * 1.05, pair, side, 6, false);
    }
  }
}

function steering(k, s0, detail) {
  const s = s0 * PERSON;
  const t = -0.8, hb = halfBeam(t), top = [-6.15, sheer(t) + 0.55, hb + 0.12], bot = [-6.95, -0.95, hb + 0.4];
  k.add(PAINT.oar, (b) => { b.tube(...top, ...bot, 0.1, 0.09, detail ? 5 : 3, true, false); b.ellipsoid(bot[0] + 0.05, bot[1] + 0.35, bot[2], 0.3, 0.75, 0.05, detail ? 6 : 4, 3); });
  if (!detail) return;
  const dy = deckY(-6.7 / 8), hx = -6.95, hz = 0.1;
  const hand = xf({ x: hx, y: dy + 0.1, z: hz, a: 0, s }, 0.5, 1.15, 0);
  k.add(PAINT.oar, (b) => b.tube(top[0], top[1] - 0.1, top[2], hand[0] + 0.05, hand[1], hand[2], 0.05, 0.04, 4, false, true));
  warrior(k, { x: hx, y: dy + 0.1, z: hz, a: 0, s }, { pose: 'helm', tunic: 3, fur: 1, hair: 2, horns: false, paint: false, slot: -1 });
}

export function buildLongship(kind) {
  const L = LAYOUT[kind] || LAYOUT.ship, s = L.s, k = new Kit();
  const band = PAINT[L.band];
  hullShell(k, 22, 6, band, true);
  rail(k, 12, 0.075, 4);
  deck(k, 14);
  posts(k, 6, false);
  const boss = kind === 'boss';
  const pal = boss ? { wood: PAINT.dragonBoss, horn: PAINT.dragonBossDark, mane: PAINT.dragonBossDark, eye: [1.0, 0.35, 0.08], dark: PAINT.dark }
    : { wood: PAINT.dragonWood, horn: kind === 'jarl' ? PAINT.gold : PAINT.ivory, mane: band, eye: PAINT.eye, dark: PAINT.dark };
  dragon(k, { x: 8.62, y: 3.85, z: 0, a: 0, s: L.dragon }, pal, false);
  rig(k, 6, false, 1);
  oars(k, L, true);
  shields(k, L, true);
  steering(k, s, true);
  // standing warriors at the rail (thrower slots), facing outboard
  slotsOf(kind).forEach((sl, i) => {
    const t = sl.x / 8, z = sl.side * Math.max(0.5, zAt(t, sheer(t) - 0.35) - 0.42);
    warrior(k, { x: sl.x, y: deckY(t) + 0.18, z, a: sl.side > 0 ? Math.PI / 2 : -Math.PI / 2, s: s * PERSON },
      { pose: 'stand', slot: i, weapon: i % 3 === 1 ? 'spear' : 'axe', tunic: i * 2 + 1, fur: i + 2, hair: i * 3 + 1, horns: i % 2 === 0, paint: i % 3 !== 2,
        shieldPair: PAINT.shieldPairs[(i * 2 + 1) % PAINT.shieldPairs.length] });
  });
  if (kind !== 'ship') {
    const x = boss ? 6.0 : 5.7, t = x / 8;
    warrior(k, { x, y: deckY(t) + 0.1, z: 0, a: 0, s: s * PERSON * 1.12 }, { pose: 'jarl', cloak: PAINT.cloakJarl, tunic: 0, hair: 1, horns: true, gold: boss, paint: true, slot: -1 });
  }
  if (boss) {
    warrior(k, { x: -5.6, y: deckY(-0.7) + 0.1, z: 0, a: 0, s: s * PERSON }, { pose: 'drum', tunic: 2, fur: 0, hair: 3, horns: true, paint: true, slot: -1 });
    warrior(k, { x: -1.6, y: deckY(0) + 0.1, z: 0, a: 0, s: s * PERSON }, { pose: 'horn', tunic: 4, fur: 2, hair: 2, horns: false, paint: true, slot: -1 });
    for (const sg of [1, -1]) pennant(k, sg * 8.7, 3.9, 0, 2.2, 0.55, PAINT.bannerBoss, 4);
  }
  return k;
}

export function buildShipMid() {
  const L = LAYOUT.ship, k = new Kit();
  hullShell(k, 12, 3, PAINT.bandShip, false);
  posts(k, 4, true);
  dragon(k, { x: 8.62, y: 3.85, z: 0, a: 0, s: 1.05 }, { wood: PAINT.dragonWood, horn: PAINT.ivory, eye: PAINT.eye }, true);
  rig(k, 4, true, 1);
  oars(k, L, false);
  shields(k, L, false);
  steering(k, 1, false);
  for (const side of [-1, 1]) {
    for (let i = 0; i < L.oars; i++) {
      const xo = L.x0 + L.dx * i, t = xo / 8, z = side * (halfBeam(t) - 0.85);
      const y = sheer(t) + 0.4 - 0.72, n = i * 2 + (side > 0 ? 1 : 0);
      figureLo(k, { x: xo + 0.4, y, z, a: Math.PI, s: 1 }, { tunic: n, fur: n, hair: n * 3 }, false, 2, ZERO);
    }
  }
  slotsOf('ship').forEach((sl, i) => {
    const t = sl.x / 8, T = { x: sl.x, y: deckY(t) + 0.18, z: sl.side * Math.max(0.5, zAt(t, sheer(t) - 0.35) - 0.42), a: sl.side > 0 ? Math.PI / 2 : -Math.PI / 2, s: 1 };
    figureLo(k, T, { tunic: i, fur: i, hair: i * 3 }, true);
    k.addT(T, PAINT.mail, (b) => { b.tube(0, 1.5, 0.3, 0.08, 2.14, 0.38, 0.07, 0.05, 3, false, false); b.tube(0.1, 1.9, 0.38, 0.06, 2.66, 0.38, 0.05, 0.05, 3, false, false); }, 20 + i + CREW, [0, 1.5, 0.3]);
  });
  return k;
}

export function buildShipFar() {
  const k = new Kit(), T = [-1, -0.6, 0, 0.6, 1];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const a = T[i], b = T[i + 1];
      k.quad(i % 2 ? PAINT.plankA : PAINT.plankB, [a * 8, sheer(a), side * halfBeam(a)], [b * 8, sheer(b), side * halfBeam(b)], [b * 8, -0.2, side * halfBeam(b) * 0.7], [a * 8, -0.2, side * halfBeam(a) * 0.7]);
    }
    const x0 = -5.5, x1 = 5.5;
    k.quad(PAINT.shieldPairs[side > 0 ? 0 : 1][0], [x0, sheer(x0 / 8) + 0.3, side * (halfBeam(x0 / 8) + 0.05)], [x1, sheer(x1 / 8) + 0.3, side * (halfBeam(x1 / 8) + 0.05)], [x1, sheer(x1 / 8) - 0.5, side * (halfBeam(x1 / 8) + 0.05)], [x0, sheer(x0 / 8) - 0.5, side * (halfBeam(x0 / 8) + 0.05)]);
  }
  for (const sg of [1, -1]) {
    k.quad(PAINT.post, [sg * 7.9, 0.2, 0], [sg * 8.35, 0.2, 0], [sg * 8.95, 4.1, 0], [sg * 8.5, 4.1, 0]);
    k.quad(PAINT.post, [sg * 8.1, 1.5, -0.2], [sg * 8.1, 1.5, 0.2], [sg * 8.7, 4.0, 0.2], [sg * 8.7, 4.0, -0.2]);
  }
  k.quad(PAINT.dragonWood, [8.5, 4.0, 0], [8.95, 4.1, 0], [10.1, 4.6, 0], [8.6, 5.2, 0]);
  k.tri(PAINT.dragonWood, [-8.5, 4.0, 0], [-7.6, 4.5, 0], [-8.3, 4.9, 0]);
  k.quad(PAINT.spar, [0.15, 0.3, 0], [0.45, 0.3, 0], [0.4, 10.6, 0], [0.2, 10.6, 0], 5, MAST_FOOT);
  k.quad(PAINT.spar, [0.5, 9.4, -4.35], [0.5, 9.4, 4.35], [0.5, 9.7, 4.35], [0.5, 9.7, -4.35], 5, MAST_FOOT);
  sailGrid(k, 4, 2, PAINT.sailA, PAINT.sailB, null, 2);
  return k;
}

// ---------------------------------------------------------------------------
const SW = 8.4, TOP = 9.45, FOOT = 3.0, SX = 0.62;
export const sailBelly = (z, y) => 1.15 * Math.pow(Math.sin((Math.PI * (z + SW / 2)) / SW), 0.85) * Math.sin(Math.PI * 0.62 * Math.min(1, (TOP - y) / (TOP - FOOT)));
const sailPt = (z, y, off = 0) => [SX + sailBelly(z, y) + off, y, z];
const sailPv = (z, y) => [sailBelly(z, y), TOP, 0];

function sailGrid(k, cols, rows, cA, cB, hem, stripeW) {
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const z0 = -SW / 2 + (SW * c) / cols, z1 = -SW / 2 + (SW * (c + 1)) / cols, y0 = TOP - ((TOP - FOOT) * r) / rows, y1 = TOP - ((TOP - FOOT) * (r + 1)) / rows;
    const col = hem && (r === rows - 1 || r === 0) ? hem : Math.floor(c / stripeW) % 2 ? cB : cA;
    const p = [[z0, y0], [z1, y0], [z1, y1], [z0, y1]];
    k.quad(col, ...p.map(([z, y]) => sailPt(z, y)), 3, (q) => sailPv(q[2], q[1]));
  }
}

// flat shape in the sail plane (u = z, v = y), drawn on both faces just off the cloth
function sailShape(k, color, tris, cu, cv, sc) {
  for (const off of [0.07, -0.07]) {
    for (const [a, b, c] of tris) {
      const P = (q) => { const z = cu + q[0] * sc, y = cv + q[1] * sc; return sailPt(z, y, off); };
      k.tri(color, P(a), P(b), P(c), 3, (q) => sailPv(q[2], q[1]));
    }
  }
}
const fan = (cx, cy, pts) => pts.map((p, i) => [[cx, cy], p, pts[(i + 1) % pts.length]]);
const disc = (cx, cy, r, n) => fan(cx, cy, Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * 6.2832) * r, cy + Math.sin((i / n) * 6.2832) * r]));
const ringTris = (r0, r1, n) => Array.from({ length: n }, (_, i) => {
  const p = (a, r) => [Math.cos(a) * r, Math.sin(a) * r], a0 = (i / n) * 6.2832, a1 = ((i + 1) / n) * 6.2832;
  return [[p(a0, r0), p(a0, r1), p(a1, r1)], [p(a0, r0), p(a1, r1), p(a1, r0)]];
}).flat();
// generic raven, wings raised (no real-world device)
const RAVEN = [
  ...fan(0.1, -0.1, [[-0.55, 0.35], [-0.35, 0.05], [-0.1, -0.35], [0.4, -0.5], [0.8, -0.45], [0.7, -0.15], [0.3, 0.15], [-0.2, 0.35]]),
  ...disc(-0.72, 0.5, 0.26, 8),
  [[-0.92, 0.6], [-1.45, 0.42], [-0.9, 0.38]],
  [[0.7, -0.3], [1.45, -0.75], [1.25, -0.95]], [[0.65, -0.4], [1.25, -0.95], [0.95, -1.0]],
  ...fan(0.0, 0.55, [[-0.35, 0.25], [-0.7, 1.2], [-0.45, 1.05], [-0.25, 1.55], [-0.02, 1.2], [0.25, 1.6], [0.35, 1.15], [0.72, 1.45], [0.6, 0.9], [0.35, 0.12]]).slice(0, 9),
  ...fan(0.6, 0.2, [[0.3, 0.1], [1.05, 0.75], [0.95, 0.45], [1.35, 0.5], [1.0, 0.1], [0.45, -0.2]]).slice(0, 5),
  [[0.1, -0.35], [0.0, -0.8], [0.06, -0.35]], [[0.3, -0.45], [0.28, -0.9], [0.36, -0.45]],
];

export function buildSail(kind) {
  const k = new Kit();
  if (kind === 'boss') {
    sailGrid(k, 14, 7, PAINT.bossA, PAINT.bossB, PAINT.bossHem, 2);
    sailShape(k, PAINT.roundel, disc(0, 0, 2.05, 18), 0, 6.15, 1);
    sailShape(k, PAINT.bossHem, ringTris(2.05, 2.3, 18), 0, 6.15, 1);
    sailShape(k, PAINT.raven, RAVEN, 0.05, 6.35, 1.2);
    sailShape(k, PAINT.bossB, [[[-0.84, 0.56], [-0.64, 0.6], [-0.72, 0.46]]], 0.05, 6.35, 1.2);
  } else if (kind === 'jarl') {
    sailGrid(k, 12, 6, PAINT.jarlA, PAINT.jarlB, PAINT.jarlHem, 2);
  } else {
    sailGrid(k, 12, 6, PAINT.sailA, PAINT.sailB, PAINT.sailHem, 2);
  }
  return k;
}

// wake chevron laid at each foam-trail point: two diverging streaks and a churned centre strip (flat, self-lit)
export function buildWakeChevron() {
  const k = new Kit();
  for (const side of [-1, 1]) k.quad(PAINT.wake, [0.9, 0.0, side * 0.95], [0.9, 0.0, side * 1.25], [-0.9, 0.0, side * 2.0], [-0.9, 0.0, side * 1.7], 0, ZERO, 1);
  k.quad(PAINT.foam, [0.9, 0.0, -0.45], [0.9, 0.0, 0.45], [-0.9, 0.0, 0.3], [-0.9, 0.0, -0.3], 0, ZERO, 1);
  return k;
}

export function buildSailMid() { const k = new Kit(); sailGrid(k, 6, 3, PAINT.sailA, PAINT.sailB, null, 1); return k; }

// bow wave: two curling white ribbons from the stem, sized per instance by speed (anim 16 shimmer)
export function buildBowWave() {
  const k = new Kit();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const P = (j) => {
        const x = -0.5 * j, h = 0.2 * Math.exp(-j * 0.4) * (j % 2 ? 0.55 : 1), zc = side * (0.15 + 0.42 * Math.pow(j, 0.9));
        return { inner: [x + 0.05, -0.08, zc * 0.85], crest: [x - 0.1, h, zc + side * 0.08], outer: [x - 0.35, 0.02, zc + side * (0.45 + 0.16 * j)] };
      };
      const a = P(i), b = P(i + 1);
      k.quad(PAINT.white, a.inner, b.inner, b.crest, a.crest, 16, ZERO, 1);
      k.quad(PAINT.wake, a.crest, b.crest, b.outer, a.outer, 16, ZERO, 1);
    }
  }
  return k;
}
