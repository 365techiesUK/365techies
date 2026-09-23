// VIKING RAID - crews (tr67 rebuild of the tr59 "Hollywood epic" figures).
//
// tr59's crew were blobs and the owner said so: they "look really blocky". They are now built
// out of raid-body.js, which gives every figure a human silhouette at arcade distance - boots,
// tapered legs that bend at the knee, a waist under a chest with rounded shoulders, a neck, a
// head with a jaw under a domed helmet with a nasal bar and cheek guards, a shaped beard and
// braids, a fur mantle with a ragged edge, arms that bend at the elbow, and fists that close
// round an oar handle or a haft.
//
// ROWERS AND THEIR OARS (tr59's "rower arms only approximately meet the oar handles").
// A rower is no longer a body leaning on one timer beside an oar swinging on another. Every
// vertex of him carries a weight: 0 at the seat, ~0.55 at the shoulders, 1.0 at the fists.
// The shader (anim 17, weight packed in the fraction of the anim code) applies that fraction
// of the oar's OWN stroke rotation about the oar's own port, so his seat stays put, his back
// swings through the stroke and his fists stay welded to the handle. The arms extend at the
// catch and draw in at the finish because the weight ramps along them.
//
// Local figure frame: +X facing, +Y up, +Z the figure's right. Built at human size and placed
// with Kit.addT (T.s carries 1/shipScale so crews stay human on the big hulls).
// CONTENT: no blood, no gore, no death animation. When a ship starts to sink the crew
// vertices are hidden and the rules' swimmers take over (they are never harmed).
import { PAINT, CREW, ZERO } from './raid-kit.js';
import { revolve, plate, limb, fist, boot, skull, neck, beard, faceSkin, faceDark, helm, horns, hat, torso, hem, mantle, belt, roundShield, axeHead, greatAxe, spearHead } from './raid-body.js';

const pick = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];
export const HEAD_Y = 1.795;        // standing figure: head centre. Helmet top ~2.0, feet at 0.
export const SHOULDER_Y = 1.475;
const I = { x: 0, y: 0, z: 0, a: 0, s: 1 };

// point in figure frame -> mesh frame (matches Kit.addT)
function xf(T, x, y, z) {
  const c = Math.cos(T.a || 0), s = Math.sin(T.a || 0), k = T.s || 1;
  return [T.x + (x * c - z * s) * k, T.y + y * k, T.z + (x * s + z * c) * k];
}
// mesh frame -> figure frame (the inverse of xf; hands a rower his own oar handle)
export function unxf(T, p) {
  const c = Math.cos(T.a || 0), s = Math.sin(T.a || 0), k = T.s || 1;
  const dx = (p[0] - T.x) / k, dy = (p[1] - T.y) / k, dz = (p[2] - T.z) / k;
  return [dx * c + dz * s, dy, -dx * s + dz * c];
}
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------------------------------------------------------------------------
// Head: skin (skull + neck), war paint, hair (beard, moustache, braids), headgear.
// `A` is the full anim code (CREW is already folded in by the caller).
//
// tr128 (PIRATE RAID) made the HEADGEAR the only faction-specific thing about a figure, which
// is what the tr125 audit found it to be: this function's unconditional helm() call was the
// whole Norse tell. `o.headgear` dispatches - undefined (every existing Viking call site)
// takes the else branch and emits byte-identical geometry, proved by tmp-tr128/test-pirate.mjs.
// `o.hairs` / `o.hats` let a faction bring its own palette without touching PAINT.hair.
function headParts(k, T, o, y, A, pv) {
  const hair = pick(o.hairs || PAINT.hair, o.hair);
  k.addT(T, PAINT.skin, (b) => { skull(b, y); neck(b, y - 0.33, y - 0.13, 0.086); faceSkin(b, y); }, A, pv);
  // tr73: a face in the band of skin the helmet leaves. NEAR LOD ONLY - headParts() is never
  // called for figureLo() or the far impostor, so nothing past ~190 m gains a triangle.
  k.addT(T, PAINT.dark, (b) => faceDark(b, y), A, pv);
  if (o.paint) k.addT(T, PAINT.woad, (b) => {
    plate(b, [0.121, y + 0.075, -0.112], [0.138, y + 0.035, 0], [0.121, y + 0.075, 0.112], [0.10, y - 0.01, 0]);
  }, A, pv);
  k.addT(T, hair, (b) => beard(b, y - 0.115, o.beard || 1), A, pv);
  if (o.headgear) {
    k.addT(T, pick(o.hats || PAINT.pHats, o.hat ?? o.hair), (b) => hat(b, y + 0.075, { kind: o.headgear }), A, pv);
    return;                       // no horns on anything that is not wearing a Norse helmet
  }
  k.addT(T, o.gold ? PAINT.gold : PAINT.metal, (b) => helm(b, y + 0.075), A, pv);
  if (o.horns) k.addT(T, o.gold ? PAINT.gold : PAINT.ivory, (b) => horns(b, y + 0.125), A, pv);
}

// Everything below the neck that every standing figure shares.
function standingBody(k, T, o, A) {
  const tunic = pick(o.tunics || PAINT.tunics, o.tunic), fur = o.cloak || pick(o.furs || PAINT.furs, o.fur), bulk = o.bulk || 1;
  const legs = o.stance === 'square'
    ? [[1, 0.02, 0.01, 0.06], [-1, 0.02, 0.01, -0.06]]
    : [[1, 0.10, 0.07, 0.26], [-1, -0.03, -0.10, -0.20]];
  k.addT(T, PAINT.leather, (b) => { for (const [sd, , ax, ya] of legs) boot(b, ax, 0, sd * 0.16, 1, ya); }, A);
  k.addT(T, o.trews || PAINT.trews, (b) => {
    for (const [sd, kx, ax] of legs) limb(b, [[0, 0.95, sd * 0.145], [kx, 0.54, sd * 0.16], [ax, 0.18, sd * 0.165]], [0.135, 0.105, 0.078], 5);
  }, A);
  const shirt = o.noMail || o.pose === 'drum' || o.pose === 'horn' ? tunic : PAINT.mail;   // tr128: a pirate is not in mail
  k.addT(T, shirt, (b) => { torso(b, { bulk }); hem(b, 0.87, 0.30, 0.025, 0.07, bulk); }, A);
  k.addT(T, PAINT.leather, (b) => belt(b, 0, bulk), A);
  k.addT(T, fur, (b) => mantle(b, 1.54, 0.33, bulk), A);
  return { tunic, fur };
}

// Standing warrior. o: {tunic, fur, hair, horns, paint, weapon: 'axe'|'spear', slot (thrower
// slot or -1), shieldPair, pose: 'stand'|'helm'|'drum'|'horn'|'jarl', cloak, gold}
export function warrior(k, T, o) {
  const C = CREW;
  const { tunic, fur } = standingBody(k, T, o, C);
  // cape from the mantle down the back, with a ragged hem instead of a flat slab
  const long = o.cloak ? 0.30 : 0.62;
  k.quad(fur, xf(T, -0.17, 1.55, -0.30), xf(T, -0.17, 1.55, 0.30), xf(T, -0.30, 1.02, 0.34), xf(T, -0.30, 1.02, -0.34), C);
  for (let i = 0; i < 4; i++) {
    const z0 = -0.34 + i * 0.17, z1 = z0 + 0.17, yl = long + (i % 2) * 0.10;
    k.quad(fur, xf(T, -0.30, 1.02, z0), xf(T, -0.30, 1.02, z1), xf(T, -0.345, yl, z1 * 0.97), xf(T, -0.345, yl, z0 * 0.97), C);
  }
  headParts(k, T, o, HEAD_Y, C, ZERO);
  const S = (sd) => [0, SHOULDER_Y, sd * 0.30];

  if (o.pose === 'stand') {
    // left arm braced on the rail (or carrying a shield); right arm raised with the weapon
    const W = [0.40, 1.24, -0.31];
    k.addT(T, tunic, (b) => limb(b, [S(-1), [0.19, 1.28, -0.375], W], [0.095, 0.078, 0.062], 6), C);
    k.addT(T, PAINT.skin, (b) => fist(b, W, [0, 0.2, 1], 0.082), C);
    if (o.heldShield) heldShield(k, T, 0.50, 1.26, -0.31, 0.42, o.shieldPair || PAINT.shieldPairs[0], C, ZERO);
    const slot = o.slot, armA = slot >= 0 ? 20 + slot + C : C, wpA = slot >= 0 ? 40 + slot + C : C, sh = S(1);
    const grip = [0.09, 2.14, 0.355];
    k.addT(T, tunic, (b) => limb(b, [sh, [-0.05, 1.86, 0.375], grip], [0.10, 0.082, 0.066], 6), armA, sh);
    k.addT(T, PAINT.skin, (b) => fist(b, grip, [-0.19, 1.0, 0], 0.085), armA, sh);
    if (o.weapon === 'spear') {
      k.addT(T, PAINT.oar, (b) => b.tube(0.22, 1.46, 0.355, 0.0, 3.02, 0.355, 0.034, 0.028, 5, true, false), wpA, sh);
      k.addT(T, PAINT.metal, (b) => spearHead(b, 0.0, 3.0, 0.355, 1.0), wpA, sh);
    } else {
      k.addT(T, PAINT.oar, (b) => b.tube(0.18, 1.72, 0.355, 0.0, 2.62, 0.355, 0.036, 0.03, 5, true, true), wpA, sh);
      k.addT(T, PAINT.metal, (b) => axeHead(b, 0.02, 2.40, 0.355, 0.62), wpA, sh);
    }
  } else if (o.pose === 'jarl') {
    // the jarl: red cloak, gold horns, a great two-handed axe pumped overhead (anim 13)
    const sh = [0, SHOULDER_Y, 0];
    k.addT(T, tunic, (b) => {
      for (const sd of [-1, 1]) {
        const g = [0.13, 2.00 + sd * 0.16, sd * 0.05];
        limb(b, [S(sd), [0.10, 1.80, sd * 0.30], g], [0.10, 0.085, 0.068], 6);
      }
    }, 13 + C, sh);
    k.addT(T, PAINT.skin, (b) => { for (const sd of [-1, 1]) fist(b, [0.13, 2.00 + sd * 0.16, sd * 0.05], [0.05, 1, 0], 0.088); }, 13 + C, sh);
    // tr73: a tapered haft with a butt knob, and a proper bearded head (raid-body.greatAxe)
    k.addT(T, PAINT.oar, (b) => {
      b.tube(0.090, 1.52, 0, 0.135, 2.30, 0, 0.050, 0.042, 5, false, false);
      b.tube(0.135, 2.30, 0, 0.175, 3.24, 0, 0.042, 0.032, 5, false, true);
      b.ellipsoid(0.088, 1.50, 0, 0.060, 0.042, 0.060, 5, 2);
    }, 13 + C, sh);
    k.addT(T, PAINT.iron, (b) => greatAxe(b, 0.168, 2.90, 0, 1.0), 13 + C, sh);
  } else if (o.pose === 'drum') {
    // drummer beating a big skin drum slung in front of him (arms anim 14, alternating)
    k.addT(T, PAINT.leather, (b) => b.tube(0.56, 0.58, 0, 0.56, 1.28, 0, 0.36, 0.36, 9, true, true), C);
    k.addT(T, PAINT.ivory, (b) => b.ellipsoid(0.56, 1.29, 0, 0.365, 0.02, 0.365, 9, 2), C);
    k.addT(T, PAINT.band, (b) => { b.tube(0.56, 0.74, 0, 0.56, 0.79, 0, 0.368, 0.368, 9, false, false); b.tube(0.56, 1.08, 0, 0.56, 1.13, 0, 0.368, 0.368, 9, false, false); }, C);
    for (const sd of [-1, 1]) {
      const sh = S(sd), g = [0.44, 1.52, sd * 0.20];
      k.addT(T, tunic, (b) => limb(b, [sh, [0.22, 1.30, sd * 0.31], g], [0.095, 0.078, 0.062], 6), 14 + C, sh);
      k.addT(T, PAINT.skin, (b) => fist(b, g, [0.6, 0.3, -sd * 0.3], 0.08), 14 + C, sh);
      k.addT(T, PAINT.oar, (b) => b.tube(0.40, 1.50, sd * 0.22, 0.58, 1.64, sd * 0.09, 0.026, 0.02, 4, true, true), 14 + C, sh);
    }
  } else if (o.pose === 'horn') {
    // horn blower: a long curved war horn raised to the lips
    for (const sd of [-1, 1]) {
      const g = [0.30, 1.76 + sd * 0.06, sd * 0.10];
      k.addT(T, tunic, (b) => limb(b, [S(sd), [0.20, 1.56, sd * 0.31], g], [0.095, 0.078, 0.062], 6), C);
      k.addT(T, PAINT.skin, (b) => fist(b, g, [0.7, 0.5, 0], 0.08), C);
    }
    k.path(PAINT.ivory, [xf(T, 0.16, 1.80, 0), xf(T, 0.52, 1.97, 0), xf(T, 0.92, 2.32, 0), xf(T, 1.17, 2.82, 0)],
      [0.032 * (T.s || 1), 0.062 * (T.s || 1), 0.1 * (T.s || 1), 0.17 * (T.s || 1)], 7, C, ZERO, false);
  } else {
    // helmsman: both hands out on the tiller in front of him
    for (const sd of [-1, 1]) {
      const g = [0.52, 1.16 + sd * 0.03, sd * 0.10];
      k.addT(T, tunic, (b) => limb(b, [S(sd), [0.27, 1.24, sd * 0.33], g], [0.095, 0.078, 0.062], 6), C);
      k.addT(T, PAINT.skin, (b) => fist(b, g, [1, -0.2, 0], 0.082), C);
    }
  }
}

// Round shield held on the forearm (its face looks along +X in the figure frame).
function heldShield(k, T, cx, cy, cz, r, pair, anim, pv) {
  const P = (a, rr, off) => xf(T, cx + off, cy + Math.sin(a) * rr, cz + Math.cos(a) * rr);
  roundShield(k, P, r, pair, anim, pv, 8);
}

// ---------------------------------------------------------------------------
// Seated rower. o.port = his oar's port and o.grip = the handle midpoint, both in MESH
// coords; o.side = +1 starboard. See the note at the top for how the weights work.
const ROW_DY = -0.88;                       // his seat is the figure frame's origin
const OAR_ANIM = 17 + CREW;
export const wcode = (w) => OAR_ANIM + Math.min(1, Math.max(0, w)) * 0.45;
export function rower(k, T, o) {
  const tunic = pick(PAINT.tunics, o.tunic), fur = pick(PAINT.furs, o.fur);
  const pv = unxf(T, o.port), g = unxf(T, o.grip);
  const seatY = ROW_DY + 0.87, shY = SHOULDER_Y + ROW_DY;
  const bodyW = (x, y) => wcode(0.55 * Math.min(1, Math.max(0, (y - seatY) / (shY - seatY))));
  k.addT(T, o.trews || PAINT.trews, (b) => {
    for (const sd of [-1, 1]) {          // thighs and shins only: his legs sit behind his sea chest
      b.tube(0.02, 0.03, sd * 0.15, 0.44, 0.0, sd * 0.16, 0.13, 0.105, 4, false, false);
      b.tube(0.44, 0.0, sd * 0.16, 0.52, -0.40, sd * 0.17, 0.105, 0.08, 4, false, true);
    }
  }, wcode(0), pv);
  k.addT(T, o.mail ? PAINT.mail : tunic, (b) => { torso(b, { dy: ROW_DY }); hem(b, 0.87 + ROW_DY, 0.30, 0.025, 0.07); }, bodyW, pv);
  k.addT(T, PAINT.leather, (b) => belt(b, ROW_DY), bodyW, pv);
  k.addT(T, fur, (b) => mantle(b, 1.54 + ROW_DY, 0.33), bodyW, pv);
  const ax = handleAxis(T, o.side);
  for (const sd of [-1, 1]) {
    const S = [0, shY, sd * 0.30];
    const H = [g[0] + ax[0] * 0.11 * sd, g[1] + ax[1] * 0.11 * sd, g[2] + ax[2] * 0.11 * sd];
    const E = mix3(S, H, 0.5); E[1] += 0.05; E[2] += sd * 0.15;
    const len = Math.hypot(H[0] - S[0], H[1] - S[1], H[2] - S[2]) || 1;
    const armW = (x, y, z) => wcode(0.55 + 0.45 * Math.min(1, Math.hypot(x - S[0], y - S[1], z - S[2]) / len));
    k.addT(T, tunic, (b) => limb(b, [S, E, H], [0.095, 0.08, 0.064], 6), armW, pv);
    k.addT(T, PAINT.skin, (b) => fist(b, H, ax, 0.082), wcode(1), pv);
  }
  headParts(k, T, o, HEAD_Y + ROW_DY, wcode(0.5), pv);
}
// the oar handle's direction, in the rower's own frame
function handleAxis(T, side) {
  const D = [0, -0.48, side * 0.877], c = Math.cos(T.a || 0), s = Math.sin(T.a || 0);
  return [D[0] * c + D[2] * s, D[1], -D[0] * s + D[2] * c];
}

// Mid-distance figure (~150 tris): the silhouette only - helmet dome, head, beard, shoulders
// over a tapered body, stub arms and legs. Used on the mid-LOD hulls.
//
// tr128: the SAME `o.headgear` / palette options warrior() takes. THIS is the figure that makes
// "lots of pirates" cheap - 130 tris (142 in a hat) against warrior()'s 730 - and it is not new
// code: it is the figure already drawn on every hull between 190 m and 480 m, now also used at
// the back of a NEAR deck, where it sits 25-35 m from the camera.
export function figureLo(k, T, o, standing, anim = 0, pv = ZERO) {
  const A = anim + CREW, dy = standing ? 0 : -0.82;
  const head = (b, y) => {                     // headgear dome: a helmet, or a hat with a brim
    if (!o.headgear) { revolve(b, 0, dy, 0, standing ? [[0.165, 1.80], [0.13, 1.90], [0, 1.99]] : [[0.165, 1.79], [0.155, 1.87], [0.115, 1.94], [0, 1.99]], 6, 1.04, 1.0); return; }
    revolve(b, 0, dy, 0, [[0.138, y], [0.098, y + 0.105], [0, y + 0.160]], 6, 1.04, 1.0);
    if (o.headgear !== 'scarf') revolve(b, 0, dy, 0, [[0.148, y + 0.015], [0.248, y - 0.005]], 6, 1.0, 1.0);
  };
  const headCol = o.headgear ? pick(o.hats || PAINT.pHats, o.hat ?? o.hair) : PAINT.metal;
  if (!standing) {                     // mid-LOD rower: only his head and shoulders clear the rail
    k.addT(T, pick(o.tunics || PAINT.tunics, o.tunic), (b) => revolve(b, 0, dy, 0, [[0.30, 1.22], [0.31, 1.44], [0.20, 1.56]], 5, 0.80, 1.0), A, pv);
    k.addT(T, PAINT.skin, (b) => b.ellipsoid(0.02, 1.78 + dy, 0, 0.125, 0.15, 0.125, 5, 2), A, pv);
    k.addT(T, pick(o.hairs || PAINT.hair, o.hair), (b) => b.tube(0.04, 1.74 + dy, 0, 0.10, 1.52 + dy, 0, 0.125, 0.05, 4, false, true), A, pv);
    k.addT(T, headCol, (b) => head(b, 1.795), A, pv);
    return;
  }
  k.addT(T, o.body || PAINT.mail, (b) => revolve(b, 0, 0, 0, [[0.30, 0.88], [0.26, 1.10], [0.32, 1.42], [0.20, 1.56]], 5, 0.78, 1.0), A, pv);
  k.addT(T, pick(o.furs || PAINT.furs, o.fur), (b) => revolve(b, -0.02, 0, 0, [[0.36, 1.40], [0.26, 1.60]], 5, 0.85, 1.0), A, pv);
  k.addT(T, o.trews || PAINT.trews, (b) => { for (const sd of [-1, 1]) b.tube(0, 0.95, sd * 0.15, 0.04, 0.12, sd * 0.17, 0.12, 0.075, 4, false, true); }, A, pv);
  k.addT(T, pick(o.tunics || PAINT.tunics, o.tunic), (b) => { for (const sd of [-1, 1]) b.tube(0, 1.44, sd * 0.29, 0.24, 1.18, sd * 0.34, 0.085, 0.065, 4, false, false); }, A, pv);
  k.addT(T, PAINT.skin, (b) => b.ellipsoid(0.02, 1.78, 0, 0.125, 0.15, 0.125, 5, 2), A, pv);
  k.addT(T, pick(o.hairs || PAINT.hair, o.hair), (b) => b.tube(0.04, 1.74, 0, 0.10, 1.50, 0, 0.125, 0.05, 4, false, true), A, pv);
  k.addT(T, headCol, (b) => head(b, 1.805), A, pv);
}

// A cartoon Viking in the water, built to read from ANY angle (tr59 only ever checked them
// from behind): domed helmet with a nasal bar and cheek guards, beard and braids, shoulders
// at the waterline, two paddling arms with fists (anim 6), horns on some (anim 10 flag), and
// a round shield he lies on to paddle away (anim 11 flag).
// tr128: `o.headgear` gives the pirate faction its own swimmer. NOTHING ELSE CHANGES - a
// swimmer is still what the rules put in the water and is still read by no hit test at all.
export function buildSwimmer(k, lo, o = {}) {
  const dy = -1.24;                                  // the waterline crosses his chest
  const shirt = o.headgear ? PAINT.pTunics[0] : PAINT.tunics[0];
  const coat = o.headgear ? PAINT.pCoats[0] : PAINT.furs[0];
  const headCol = o.headgear ? PAINT.pHats[1] : PAINT.metal;
  if (lo) {
    k.add(shirt, (b) => revolve(b, 0, dy, 0, [[0.30, 1.02], [0.34, 1.34], [0.22, 1.52]], 5, 0.85, 1.0));
    k.add(PAINT.skin, (b) => b.ellipsoid(0.02, 1.76 + dy, 0, 0.14, 0.16, 0.14, 5, 2));
    k.add(o.headgear ? PAINT.pHair[1] : PAINT.hair[1], (b) => b.tube(0.05, 1.72 + dy, 0, 0.11, 1.48 + dy, 0, 0.13, 0.05, 4, true, true));
    k.add(headCol, (b) => (o.headgear
      ? revolve(b, 0, dy, 0, [[0.145, 1.785], [0.105, 1.89], [0, 1.945]], 6, 1.04, 1.0)
      : revolve(b, 0, dy, 0, [[0.175, 1.78], [0.165, 1.86], [0.12, 1.93], [0, 1.99]], 6, 1.04, 1.0)));
    for (const sd of [-1, 1]) k.add(PAINT.skin, (b) => b.ellipsoid(0.16, 1.55 + dy, sd * 0.44, 0.1, 0.09, 0.1, 4, 2), 6, [0, 1.35 + dy, sd * 0.28]);
    return k;
  }
  k.add(shirt, (b) => torso(b, { dy, top: 1.56 }));
  k.add(coat, (b) => mantle(b, 1.52 + dy, 0.28));
  headParts(k, I, { hair: 1, paint: !o.headgear, horns: false, beard: 1.05, headgear: o.headgear, hat: 1, hairs: o.headgear ? PAINT.pHair : null }, HEAD_Y + dy, 0, ZERO);
  // horns (anim 10) and the round shield he paddles on (anim 11) are Norse kit; a pirate
  // gets neither, and the two shader flags simply go unused on his instances.
  if (!o.headgear) {
    k.add(PAINT.ivory, (b) => horns(b, HEAD_Y + dy + 0.125), 10, [0, HEAD_Y + dy + 0.07, 0]);
  }
  // arms reaching forward at the surface, sweeping as he paddles (anim 6)
  for (const sd of [-1, 1]) {
    const sh = [0, 1.40 + dy, sd * 0.29], H = [0.46, 1.42 + dy, sd * 0.40];
    k.add(shirt, (b) => limb(b, [sh, [0.24, 1.36 + dy, sd * 0.44], H], [0.095, 0.08, 0.064], 6), 6, sh);
    k.add(PAINT.skin, (b) => fist(b, H, [1, 0.1, 0.15 * sd], 0.085), 6, sh);
  }
  const P = (a, rr, off) => [-0.35 + Math.cos(a) * rr, -0.16 + off, Math.sin(a) * rr];
  if (o.headgear) k.add(PAINT.oakC, (b) => b.tube(-0.62, -0.16, -0.42, -0.08, -0.16, 0.42, 0.13, 0.13, 5, true, true), 11, [-0.35, -0.16, 0]);   // a floating spar instead
  else roundShield(k, P, 0.5, PAINT.shieldPairs[1], 11, [-0.35, -0.16, 0], 8);
  return k;
}

// The raider on a siege ladder (raid-pier.js draws him through its own vertex kit): the same
// body, both hands gripping a rung overhead, square stance on the rung below.
export function buildClimber(k, opt = {}) {
  const T = { x: 0, y: -0.95, z: 0, a: 0, s: 0.92 };
  const o = { tunic: 0, fur: 0, hair: 1, horns: false, paint: true, beard: 1, stance: 'square' };
  // tr128: the same boarder in a hat, so a pirate ship does not send Vikings up its ladders.
  if (opt.headgear) Object.assign(o, { headgear: opt.headgear, hat: 2, paint: false, noMail: true, trews: PAINT.pTrews, tunics: PAINT.pTunics, furs: PAINT.pCoats, hairs: PAINT.pHair, hats: PAINT.pHats });
  const { tunic } = standingBody(k, T, o, 0);
  headParts(k, T, o, HEAD_Y, 0, ZERO);
  for (const sd of [-1, 1]) {
    const S = [0, SHOULDER_Y, sd * 0.30], H = [0.30, 2.06 + sd * 0.20, sd * 0.24];
    k.addT(T, tunic, (b) => limb(b, [S, [0.10, 1.80, sd * 0.44], H], [0.10, 0.082, 0.066], 6), 0, ZERO);
    k.addT(T, PAINT.skin, (b) => fist(b, H, [0, 0, 1], 0.085), 0, ZERO);
  }
  return k;
}
