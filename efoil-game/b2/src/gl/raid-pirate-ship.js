// PIRATE RAID (tr128) - the second faction's hulls. Built only from RaidActors on raid entry,
// exactly like raid-longship.js, and ONLY when the pirate faction is the one in play.
//
// CONTENT. Cartoon historical fantasy, on the same licence as the Viking raid and under the
// same rules. Generic pirates: NO nationality, NO modern group, NO place of origin and NO
// crossing is referred to; NO real flag, arms, badge or insignia of any kind; NO lettering
// anywhere - this model has no text renderer and must never gain one; NO ship name. The
// flags are plain fields of colour and carry no device at all. People in the water are the
// rules' swimmers and are never targets: this file adds no hit test, and every crew vertex
// carries +CREW so the crew are hidden the moment a hull starts going down (raid-kit.js:21).
// ANACHRONISM, DISCLOSED: a two-masted square rig is ~1690-1730 and the Viking material is
// ~800-1100. They never meet - the two factions are separate runs - but the brig is a
// deliberate, stated anachronism chosen because it is the silhouette the word "pirate" puts
// in a player's head.
//
// FRAME. Identical to raid-longship.js: every hull is built in the 16 m reference frame (L0)
// and scaled by L/16 per instance. THE HALF-BEAM IS 1.70 AND THAT NUMBER IS LOAD-BEARING:
// src/raid/collide.js:22 and src/raid/raid.js:52 both hardcode the collision capsule radius
// as 1.7 x L/16, and src/raid/siege.js:97 moors a ship centre 2.9-3.0 m off the pier edge.
// Drawing to 1.70 makes the planking and the capsule the same surface and changes nothing in
// any of those three files. A wider brig needs a per-kind BEAM there first.
//
// NEAR  carvel hull (flush strakes, no clinker lap), painted wale and sheer band, closed
//       bulwarks, waist deck with a raised quarterdeck and forecastle, transom and counter,
//       stem and bowsprit, two masts with tops, four yards, standing and running rigging,
//       twelve guns run out through their ports, deck clutter, and a 32-strong crew that
//       MIXES LODs inside one hull: 8 full warrior() figures and 24 figureLo().
// MID   fewer stations and strakes, two bare masts and four yards, no rigging, blob crew.
// FAR   impostor silhouette: hull band, two masts, four yards, a coarse striped sail.
import { Kit, PAINT, ZERO, CREW } from './raid-kit.js';
import { warrior, figureLo } from './raid-crew.js';
import { L0, MAST_FOOT, slotsOf } from './raid-longship.js';

export { L0 };
const PERSON = 1.12;            // same cartoon over-size the longship crews use

// ---------------------------------------------------------------------------
// HULL PROFILES, 16 m reference frame. t = x / 8 in [-1, +1]; +X is the bow.
export const HALF_BEAM = 1.70;  // see the capsule note in the header
export const pHalfBeam = (t) => HALF_BEAM * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(t)), 2.8)), 0.42);
// sheer: a low waist rising to the head and a little more aft, so the quarterdeck reads
export const pSheer = (t) => 1.28 + 0.80 * Math.pow(Math.min(1, Math.abs(t)), 2.6) + (t < 0 ? 0.22 * Math.pow(Math.min(1, -t), 1.6) : 0);
// The keel stays UNDER the water all the way to the ends. A longship is double-ended and its
// keel rises clear at stem and stern, which is right for that hull; on a transom-sterned brig
// the same curve let the camera see underneath the counter (tr128 render P1_stern, first pass).
export const pKeel = (t) => -1.10 + 0.85 * Math.pow(Math.min(1, Math.abs(t)), 2.4);
const WAIST_Y = 0.46, QD_Y = 1.06, FC_Y = 0.98;      // waist deck, quarterdeck, forecastle
const QD_T = -0.40, FC_T = 0.60;                      // where each raised deck begins
export const pDeckY = (t) => (t <= QD_T ? QD_Y : t >= FC_T ? FC_Y : WAIST_Y);

const SEC_Y = 0.70, SEC_Z = 0.85;
// a station's outline: v = 0 at the sheer, 1 at the keel
const pSection = (t, v, side) => {
  const ys = pSheer(t), yk = pKeel(t), r = Math.pow(Math.min(1, v), 1 / SEC_Y);
  return [t * 8, ys - (ys - yk) * v, side * pHalfBeam(t) * Math.pow(Math.max(0, 1 - r * r), SEC_Z / 2)];
};
// half-breadth at (t, y)
const pZAt = (t, y) => {
  const ys = pSheer(t), yk = pKeel(t), r = Math.min(1, Math.max(0, (ys - y) / (ys - yk)));
  return pHalfBeam(t) * Math.pow(Math.cos(Math.asin(Math.pow(r, 1 / SEC_Y))), SEC_Z);
};

// THE RIG, in one place. Both the spars (mast(), which draws the yards) and the sail mesh
// (buildPirateSail(), a separate instance drawn with the same transform) read these numbers,
// so a yard and its sail can never drift apart. `tr` is that mast's truck height, `i` its
// index from forward. Measured against the first render pass: the courses were 7.1 m wide and
// hung to 1.8 m, which walled the deck off and hid the boarding party - the whole point of the
// faction. They are now narrower, set higher, and STRIPED so four sails do not read as one
// white slab.
export const RIG = (tr, i) => ({
  cY: tr * 0.53, cHw: 3.15 - i * 0.10, cFoot: tr * 0.53 - 2.95,
  tY: tr * 0.82, tHw: 2.35 - i * 0.08, tFoot: tr * 0.82 - 2.35,
});

// Per-kind layout. `s` is the crew scale (16 / L), so a pirate stays human-sized on the big
// hulls, exactly as LAYOUT in raid-longship.js does. The thrower slots are REUSED FROM THE
// LONGSHIP unchanged (slotsOf), so RaidScene's throw-event -> slot mapping needs no edit.
export const P_LAYOUT = {
  ship: { s: 1, band: 'pBandShip', guns: 6, heroes: 8, crowd: 24, masts: [3.30, -1.70], truck: [10.40, 11.80] },
  jarl: { s: 16 / 21, band: 'pBandJarl', guns: 7, heroes: 10, crowd: 26, masts: [3.40, -1.80], truck: [10.60, 12.00] },
  boss: { s: 16 / 30, band: 'pBandBoss', guns: 8, heroes: 14, crowd: 34, masts: [4.40, 0.20, -4.20], truck: [10.20, 12.10, 9.60] },
};

// ---------------------------------------------------------------------------
// CARVEL planking: flush strakes, one quad per patch. The longship draws every strake twice
// (face + shadow lap, raid-longship.js:65-69); dropping the lap halves the shell.
function hullShellP(k, NS, K, band) {
  for (const side of [-1, 1]) {
    for (let j = 0; j < K; j++) {
      for (let i = 0; i < NS; i++) {
        const t0 = -1 + (2 * i) / NS, t1 = -1 + (2 * (i + 1)) / NS;
        const A = pSection(t0, j / K, side), B = pSection(t1, j / K, side), C = pSection(t1, (j + 1) / K, side), D = pSection(t0, (j + 1) / K, side);
        const ym = (A[1] + C[1]) * 0.5;
        const c = j === 0 ? band : ym < -0.18 ? PAINT.antifoul : ym < 0.12 ? PAINT.bootTop : [PAINT.oakA, PAINT.oakB, PAINT.oakC][j % 3];
        k.quad(c, A, B, C, D);
      }
    }
  }
}

// The main wale: one dark band of thicker planking along the topsides, the line that says
// "ship of force" at 200 m. Two quads a station, both sides.
function wale(k, n) {
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const t0 = -0.97 + (1.94 * i) / n, t1 = -0.97 + (1.94 * (i + 1)) / n;
      const A = pSection(t0, 0.30, side), B = pSection(t1, 0.30, side), C = pSection(t1, 0.40, side), D = pSection(t0, 0.40, side);
      k.quad(PAINT.wale, A, B, C, D);
    }
  }
}

function capRail(k, n, r, seg) {
  for (const side of [-1, 1]) {
    const pts = [], rad = [];
    for (let i = 0; i <= n; i++) { const t = -0.97 + (1.94 * i) / n; pts.push([t * 8, pSheer(t) + 0.03, side * (pHalfBeam(t) + 0.02)]); rad.push(r); }
    k.path(PAINT.tar, pts, rad, seg, 0, ZERO, false);
  }
}

// Waist deck, quarterdeck and forecastle, with a riser at each break.
function decks(k, n) {
  for (let i = 0; i < n; i++) {
    const t0 = -0.93 + (1.86 * i) / n, t1 = -0.93 + (1.86 * (i + 1)) / n;
    const y0 = pDeckY(t0), y1 = pDeckY(t1);
    const w0 = Math.max(0.12, pZAt(t0, y0)), w1 = Math.max(0.12, pZAt(t1, y1));
    k.quad(i % 2 ? PAINT.deck : PAINT.oakC, [t0 * 8, y0, -w0], [t1 * 8, y1, -w1], [t1 * 8, y1, w1], [t0 * 8, y0, w0]);
    if (y0 !== y1) {                                   // the break: a riser across the ship
      const hi = Math.max(y0, y1), lo = Math.min(y0, y1), x = t1 * 8, w = Math.max(w0, w1);
      k.quad(PAINT.oakB, [x, lo, -w], [x, lo, w], [x, hi, w], [x, hi, -w]);
    }
  }
}

// Stem, transom and counter. The longship is double-ended with a carved post at each end;
// a brig has a raked stem forward and a flat transom aft, which is most of what tells the
// two hulls apart in silhouette from astern.
function stemAndTransom(k) {
  k.path(PAINT.tar, [[7.55, pKeel(0.94), 0], [7.95, 0.9, 0], [8.20, 2.05, 0], [8.28, 2.72, 0]], [0.16, 0.14, 0.12, 0.10], 5, 0, ZERO, true);
  const ts = -0.985, yb = pKeel(ts), yt = pSheer(ts) + 0.10, w = pHalfBeam(ts) + 0.06, wl = w * 0.62;
  k.quad(PAINT.oakB, [ts * 8, yb, -wl], [ts * 8, yb, wl], [ts * 8 - 0.45, yt, w], [ts * 8 - 0.45, yt, -w]);   // transom
  k.quad(PAINT.wale, [ts * 8 - 0.42, yt - 0.42, -w * 0.96], [ts * 8 - 0.42, yt - 0.42, w * 0.96], [ts * 8 - 0.45, yt - 0.16, w], [ts * 8 - 0.45, yt - 0.16, -w]);
  for (let i = 0; i < 3; i++) {                        // stern gallery lights: the read from astern
    const z0 = -w * 0.62 + (w * 1.24 * i) / 3 + 0.08, z1 = z0 + w * 0.30;
    k.quad(PAINT.gunport, [ts * 8 - 0.44, yt - 0.34, z0], [ts * 8 - 0.44, yt - 0.34, z1], [ts * 8 - 0.45, yt - 0.02, z1], [ts * 8 - 0.45, yt - 0.02, z0]);
  }
  for (const side of [-1, 1]) {                        // the counter, tucking the transom into the run
    k.quad(PAINT.oakA, [ts * 8, yb, side * wl], [ts * 8 - 0.45, yt, side * w], [-7.2, pSheer(-0.9), side * pHalfBeam(-0.9)], [-7.2, pKeel(-0.9), side * 0.10]);
  }
  // rudder, hung on the transom below the counter
  k.quad(PAINT.oakB, [ts * 8 + 0.1, yb + 0.1, 0.05], [ts * 8 - 0.35, yb + 0.1, 0.05], [ts * 8 - 0.30, -1.55, 0.05], [ts * 8 + 0.1, -1.45, 0.05]);
  k.quad(PAINT.oakB, [ts * 8 + 0.1, yb + 0.1, -0.05], [ts * 8 + 0.1, -1.45, -0.05], [ts * 8 - 0.30, -1.55, -0.05], [ts * 8 - 0.35, yb + 0.1, -0.05]);
}

// Bowsprit and jibboom: 15-60 triangles for the single cheapest "not a longship" cue there is.
function bowsprit(k, seg) {
  k.path(PAINT.spar, [[7.3, 1.85, 0], [9.4, 2.62, 0], [11.3, 3.30, 0]], [0.115, 0.075, 0.042], seg, 5, MAST_FOOT, true);
  k.add(PAINT.tar, (b) => {
    b.tube(8.30, 2.72, 0, 8.30, 2.10, 0, 0.022, 0.022, 3, false, false);      // bobstay
    b.tube(10.4, 3.01, 0, 8.24, 2.55, 0, 0.020, 0.020, 3, false, false);      // bowsprit shrouds, one each side
  }, 5, MAST_FOOT);
  for (const sd of [-1, 1]) k.quad(PAINT.oakC, [7.2, 2.00, sd * 0.30], [8.5, 2.52, sd * 0.10], [8.5, 2.18, sd * 0.10], [7.2, 1.62, sd * 0.34]);   // head timbers
}

// One mast: lower mast, top platform, topmast, truck, and its yards. anim 5 so the whole rig
// leans and topples together when the mast breaks (the shader rotates about its own const
// MAST_FOOT, so every mast on the ship falls as one rig - which is what a dismasting looks like).
function mast(k, x, truck, yards, seg) {
  const foot = pDeckY(x / 8) - 0.35, hound = truck * 0.62;
  k.add(PAINT.spar, (b) => {
    b.tube(x, foot, 0, x, hound + 0.55, 0, 0.165, 0.105, seg, false, false);
    b.tube(x, hound + 0.30, 0, x, truck, 0, 0.088, 0.055, Math.max(3, seg - 1), false, true);
  }, 5, MAST_FOOT);
  k.add(PAINT.oakB, (b) => b.tube(x, hound + 0.38, 0, x, hound + 0.52, 0, 0.52, 0.46, 6, true, true), 5, MAST_FOOT);   // the top
  k.add(PAINT.brass, (b) => b.ellipsoid(x, truck + 0.06, 0, 0.09, 0.09, 0.09, 4, 2), 5, MAST_FOOT);
  for (const [y, hw] of yards) {
    k.add(PAINT.spar, (b) => b.tube(x + 0.12, y, -hw, x + 0.12, y, hw, 0.072, 0.072, Math.max(4, seg - 1), true, true), 5, MAST_FOOT);
    k.add(PAINT.tar, (b) => {                                  // lifts and braces: the yard is held up and swung
      for (const sd of [-1, 1]) {
        b.tube(x + 0.12, y, sd * hw * 0.96, x, y + 1.35, 0, 0.018, 0.018, 3, false, false);
        b.tube(x + 0.12, y, sd * hw * 0.96, x - 2.5, y + 0.15, sd * 0.5, 0.018, 0.018, 3, false, false);
      }
    }, 5, MAST_FOOT);
  }
}

// STANDING RIGGING, and the arithmetic that keeps it affordable. A real brig has ~36 shroud
// runs and ~790 ratline rungs; drawn as tubes at seg 3 that is 4,956 triangles, 2.5x the hull.
// Here each gang is FIVE shrouds as seg-3 tubes (6 tris a run) with FOUR ratline quads across
// them (2 tris each): 5 x 6 + 4 x 2 = 38 tris a gang. A tube is chosen over a flat ribbon on
// purpose - a ribbon vanishes edge-on, and the player sees these hulls from every bearing.
function shrouds(k, x, truck, seg) {
  const hound = truck * 0.62, t = x / 8, sh = pSheer(t), hb = pHalfBeam(t) + 0.12;
  for (const side of [-1, 1]) {
    k.add(PAINT.tar, (b) => {
      for (let i = 0; i < 5; i++) {
        const f = i / 4;
        b.tube(x - 0.10 + 0.14 * f, hound + 0.30, side * 0.16, x + 1.05 - 2.10 * f, sh + 0.05, side * hb, 0.019, 0.019, 3, false, false);
      }
    }, 5, MAST_FOOT);
    for (let r = 0; r < 6; r++) {                     // ratlines: one quad across the whole gang
      const f0 = 0.14 + r * 0.135, f1 = f0 + 0.035;
      const P = (f, i) => {
        const g = i / 4;
        return [x - 0.10 + 0.14 * g + (x + 1.05 - 2.10 * g - (x - 0.10 + 0.14 * g)) * f,
          (hound + 0.30) + (sh + 0.05 - (hound + 0.30)) * f,
          side * (0.16 + (hb - 0.16) * f)];
      };
      k.quad(PAINT.tar, P(f0, 0), P(f0, 4), P(f1, 4), P(f1, 0), 5, MAST_FOOT);
    }
  }
  k.add(PAINT.tar, (b) => {                            // forestay and backstay
    b.tube(x, hound + 0.55, 0, x + 4.2, 2.45, 0, 0.020, 0.020, 3, false, false);
    b.tube(x, hound + 0.55, 0, x - 3.4, pSheer(-0.5) + 0.05, 0, 0.020, 0.020, 3, false, false);
  }, 5, MAST_FOOT);
}

// Guns run out through their ports. A carriage behind a closed bulwark is never seen, so it
// is not drawn: a gun is a tapered barrel and a dark port, 14 triangles.
// The muzzle stands 0.16 m proud of the planking in the reference frame, so the widest thing
// below the rail is 1.86 against the capsule's 1.70 - a smaller overhang than the longship's
// own planking (1.80) or its oars, and the capsule stays exactly as the rules hardcode it.
function guns(k, n) {
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const x = -4.6 + (9.0 * i) / Math.max(1, n - 1), t = x / 8, hb = pHalfBeam(t), y = pSheer(t) - 0.42;
      k.quad(PAINT.gunport, [x - 0.30, y - 0.26, side * (hb + 0.03)], [x + 0.30, y - 0.26, side * (hb + 0.03)], [x + 0.30, y + 0.26, side * (hb + 0.03)], [x - 0.30, y + 0.26, side * (hb + 0.03)]);
      k.add(PAINT.gunIron, (b) => b.tube(x, y, side * (hb - 0.34), x, y, side * (hb + 0.16), 0.105, 0.075, 4, false, true));
    }
  }
}

// Capstan, wheel, binnacle, gratings, barrels, the ship's boat. Everything a boarding party
// stands between; ~180 triangles that stop the deck reading as a flat plank.
function deckGear(k) {
  k.add(PAINT.oakC, (b) => b.tube(-0.3, WAIST_Y, 0, -0.3, WAIST_Y + 0.95, 0, 0.30, 0.22, 6, false, true));        // capstan
  k.add(PAINT.oakB, (b) => b.tube(-5.9, QD_Y, 0, -5.9, QD_Y + 0.35, 0, 0.16, 0.16, 5, false, true));              // wheel stand
  k.add(PAINT.oakC, (b) => b.tube(-5.9, QD_Y + 0.70, -0.06, -5.9, QD_Y + 0.70, 0.06, 0.46, 0.46, 8, true, true));  // wheel
  k.box(PAINT.oakB, -6.7, QD_Y, -0.28, -6.2, QD_Y + 0.72, 0.28);                                                   // binnacle
  for (const x of [1.9, -2.6]) k.box(PAINT.oakA, x - 0.62, WAIST_Y, -0.72, x + 0.62, WAIST_Y + 0.10, 0.72);        // hatch gratings
  for (const [x, z] of [[-3.9, 1.05], [-3.9, -1.05], [4.6, 0.85], [4.6, -0.85]]) {
    k.add(PAINT.crate, (b) => b.tube(x, pDeckY(x / 8), z, x, pDeckY(x / 8) + 0.62, z, 0.26, 0.26, 4, true, true));  // water casks
  }
  for (const sd of [-1, 1]) k.quad(PAINT.oakC, [0.9, WAIST_Y + 0.15, sd * 0.05], [0.9, WAIST_Y + 0.62, sd * 0.55], [-1.5, WAIST_Y + 0.62, sd * 0.55], [-1.5, WAIST_Y + 0.15, sd * 0.05]);   // ship's boat
  k.quad(PAINT.oakB, [0.9, WAIST_Y + 0.15, -0.05], [0.9, WAIST_Y + 0.15, 0.05], [-1.5, WAIST_Y + 0.15, 0.05], [-1.5, WAIST_Y + 0.15, -0.05]);
}

// A plain streaming flag. NO DEVICE OF ANY KIND: a field of colour and nothing else. anim 15
// so it flutters; the pivot's y is above 9 so it falls with the rig when the mast goes.
function flag(k, x, y, len, wid, color, segs) {
  const pv = [x, y, 0];
  for (let i = 0; i < segs; i++) {
    const f0 = i / segs, f1 = (i + 1) / segs, w0 = wid * (1 - 0.55 * f0), w1 = wid * (1 - 0.55 * f1);
    k.quad(color, [x - len * f0, y, 0], [x - len * f1, y, 0], [x - len * f1, y - w1, 0], [x - len * f0, y - w0, 0], 15, pv);
  }
}

// ---------------------------------------------------------------------------
// CREW. The lever that makes "lots of pirates" cheaper than what ships today is NOT a cheaper
// pirate - it is refusing to spend a full warrior() on a figure standing 25 m from the camera
// behind two other figures. Measured: warrior() in a hat = 730 tris, figureLo() = 130, and
// figureLo is ALREADY the figure the player sees on every hull between 190 m and 480 m.
// A near longship carries 16 near-LOD figures for 11,736 tris; a near brig carries 8 + 24.
// ⚠️ THE STRIDES ARE COPRIME WITH THEIR ARRAY LENGTHS ON PURPOSE. pick() is a modulo, so a
// stride sharing a factor with the array length only ever reaches a few of the colours: the
// first render pass used `tunic: n * 3` against a 6-long table and produced a deck of pirates
// in two shades of purple. 5 vs 6, 3 vs 4, 7 vs 5, 3 vs 5 all walk the whole table.
const P_OPT = (n, extra = {}) => ({
  tunic: n * 5, fur: n * 3, hair: n * 7, horns: false, paint: false, beard: 0.55 + (n % 3) * 0.18,
  headgear: n % 3 === 0 ? 'scarf' : 'hat', hat: n * 3, noMail: true, trews: PAINT.pTrews,
  tunics: PAINT.pTunics, furs: PAINT.pCoats, hairs: PAINT.pHair, hats: PAINT.pHats,
  // figureLo's trunk is PAINT.mail unless told otherwise, and mail on a pirate turned the
  // whole crowd Viking blue-grey in the first render pass. Give it a coat.
  body: PAINT.pTunics[(n * 5) % PAINT.pTunics.length], ...extra,
});

// Where the 24-34 crowd figures stand: both gangways, the forecastle, the quarterdeck rail
// and the two tops. Deterministic - the same ship is the same ship every run.
function crowdSpots(kind, n) {
  const out = [], L = P_LAYOUT[kind];
  for (let i = 0; i < 40 && out.length < n; i++) {
    const row = i % 4, j = Math.floor(i / 4);
    if (row < 2) {                                      // the two gangways, inboard of the guns
      const side = row === 0 ? 1 : -1, x = -5.2 + j * 1.35;
      const t = Math.max(-0.95, Math.min(0.95, x / 8));
      out.push({ x, y: pDeckY(t), z: side * Math.max(0.55, pZAt(t, pSheer(t) - 0.55) - 0.62), a: side > 0 ? Math.PI / 2 : -Math.PI / 2 });
    } else if (row === 2) {                             // down the centreline, facing the pier
      const x = 5.6 - j * 1.55, t = Math.max(-0.95, Math.min(0.95, x / 8));
      out.push({ x, y: pDeckY(t), z: (j % 2 ? 0.30 : -0.30), a: 0 });
    } else {                                            // the tops and the quarterdeck rail
      const m = L.masts[j % L.masts.length], tr = L.truck[j % L.masts.length];
      if (j < 2) out.push({ x: m + 0.35, y: tr * 0.62 + 0.52, z: (j % 2 ? 0.26 : -0.26), a: 0, top: true });
      else { const x = -6.4 + (j % 3) * 0.9; out.push({ x, y: QD_Y, z: (j % 2 ? 1.0 : -1.0), a: j % 2 ? Math.PI / 2 : -Math.PI / 2 }); }
    }
  }
  return out.slice(0, n);
}

function crew(k, kind) {
  const L = P_LAYOUT[kind], s = L.s, ps = s * PERSON;
  const slots = slotsOf(kind);
  // 1) the throwers: full figures at the rail, wired to the rules' throw events by slot index
  slots.forEach((sl, i) => {
    const t = sl.x / 8, z = sl.side * Math.max(0.55, pZAt(t, pSheer(t) - 0.40) - 0.40);
    warrior(k, { x: sl.x, y: pDeckY(t) + 0.02, z, a: sl.side > 0 ? Math.PI / 2 : -Math.PI / 2, s: ps },
      P_OPT(i * 2 + 1, { pose: 'stand', slot: i, weapon: i % 3 === 1 ? 'spear' : 'axe' }));
  });
  // 2) the helmsman at the wheel
  warrior(k, { x: -5.15, y: QD_Y + 0.02, z: 0, a: 0, s: ps }, P_OPT(4, { pose: 'helm' }));
  // 3) the captain, aft on the quarterdeck. Same pose the jarl uses; a different hat.
  if (kind !== 'ship') warrior(k, { x: -7.0, y: QD_Y + 0.02, z: 0, a: 0, s: ps * 1.10 }, P_OPT(0, { pose: 'jarl', cloak: PAINT.pCoatCapt, headgear: 'hat', hat: 0 }));
  else warrior(k, { x: -7.0, y: QD_Y + 0.02, z: 0, a: 0, s: ps * 1.06 }, P_OPT(0, { pose: 'stand', slot: -1, weapon: 'axe', cloak: PAINT.pCoatCapt }));
  if (kind === 'boss') {
    warrior(k, { x: -2.9, y: WAIST_Y + 0.02, z: 0, a: 0, s: ps }, P_OPT(2, { pose: 'drum' }));
    warrior(k, { x: 1.1, y: WAIST_Y + 0.02, z: 0, a: 0, s: ps }, P_OPT(7, { pose: 'horn' }));
  }
  // 4) the crowd: figureLo, already shipping, 130 tris each and no new code at all
  crowdSpots(kind, L.crowd).forEach((p, i) => {
    figureLo(k, { x: p.x, y: p.y, z: p.z, a: p.a, s: ps }, P_OPT(i + 3), true, 0, ZERO);
  });
}

// ---------------------------------------------------------------------------
export function buildBrig(kind) {
  const L = P_LAYOUT[kind] || P_LAYOUT.ship, k = new Kit();
  const band = PAINT[L.band];
  hullShellP(k, 22, 6, band);
  wale(k, 14);
  capRail(k, 12, 0.075, 4);
  decks(k, 16);
  stemAndTransom(k);
  bowsprit(k, 5);
  guns(k, L.guns);
  L.masts.forEach((x, i) => {
    const tr = L.truck[i], R = RIG(tr, i);
    mast(k, x, tr, [[R.cY, R.cHw], [R.tY, R.tHw]], 6);
    shrouds(k, x, tr, 6);
  });
  deckGear(k);
  flag(k, L.masts[0] - 0.10, L.truck[0] + 0.02, 2.5, 0.62, PAINT.flagBlack, 4);
  flag(k, L.masts[1] - 0.10, L.truck[1] + 0.02, 2.9, 0.70, kind === 'ship' ? PAINT.flagBlack : PAINT.flagRed, 4);
  crew(k, kind);
  return k;
}

export function buildBrigMid() {
  const L = P_LAYOUT.ship, k = new Kit();
  hullShellP(k, 12, 3, PAINT[L.band]);
  decks(k, 8);
  stemAndTransom(k);
  L.masts.forEach((x, i) => {
    const tr = L.truck[i], R = RIG(tr, i);
    k.add(PAINT.spar, (b) => { b.tube(x, 0.1, 0, x, tr, 0, 0.15, 0.06, 4, false, true); }, 5, MAST_FOOT);
    for (const [y, hw] of [[R.cY, R.cHw], [R.tY, R.tHw]]) {
      k.add(PAINT.spar, (b) => b.tube(x + 0.12, y, -hw, x + 0.12, y, hw, 0.07, 0.07, 4, true, true), 5, MAST_FOOT);
    }
  });
  crowdSpots('ship', 6).forEach((p, i) => figureLo(k, { x: p.x, y: p.y, z: p.z, a: p.a, s: 1 }, P_OPT(i + 3), true, 0, ZERO));
  slotsOf('ship').forEach((sl, i) => {
    const t = sl.x / 8, T = { x: sl.x, y: pDeckY(t), z: sl.side * Math.max(0.55, pZAt(t, pSheer(t) - 0.40) - 0.40), a: sl.side > 0 ? Math.PI / 2 : -Math.PI / 2, s: 1 };
    figureLo(k, T, P_OPT(i), true);
    k.addT(T, PAINT.gunIron, (b) => { b.tube(0, 1.5, 0.3, 0.08, 2.14, 0.38, 0.07, 0.05, 3, false, false); }, 20 + i + CREW, [0, 1.5, 0.3]);
  });
  return k;
}

export function buildBrigFar() {
  const k = new Kit(), T = [-1, -0.6, 0, 0.6, 1];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const a = T[i], b = T[i + 1];
      k.quad(i % 2 ? PAINT.oakA : PAINT.oakB, [a * 8, pSheer(a), side * pHalfBeam(a)], [b * 8, pSheer(b), side * pHalfBeam(b)], [b * 8, -0.3, side * pHalfBeam(b) * 0.7], [a * 8, -0.3, side * pHalfBeam(a) * 0.7]);
    }
    k.quad(PAINT.wale, [-5.5, pSheer(-0.69) - 0.25, side * (pHalfBeam(-0.69) + 0.04)], [5.5, pSheer(0.69) - 0.25, side * (pHalfBeam(0.69) + 0.04)],
      [5.5, pSheer(0.69) - 0.62, side * (pHalfBeam(0.69) + 0.04)], [-5.5, pSheer(-0.69) - 0.62, side * (pHalfBeam(-0.69) + 0.04)]);
  }
  k.quad(PAINT.tar, [7.4, 1.9, 0], [11.2, 3.3, 0], [11.2, 3.1, 0], [7.4, 1.5, 0]);          // bowsprit
  P_LAYOUT.ship.masts.forEach((x, i) => {
    const tr = P_LAYOUT.ship.truck[i], R = RIG(tr, i);
    k.quad(PAINT.spar, [x - 0.14, 0.3, 0], [x + 0.14, 0.3, 0], [x + 0.10, tr, 0], [x - 0.10, tr, 0], 5, MAST_FOOT);
    for (const [y, hw] of [[R.cY, R.cHw], [R.tY, R.tHw]]) {
      k.quad(PAINT.spar, [x + 0.12, y - 0.13, -hw], [x + 0.12, y - 0.13, hw], [x + 0.12, y + 0.13, hw], [x + 0.12, y + 0.13, -hw], 5, MAST_FOOT);
    }
  });
  pirateSailGrid(k, farPanel(0), 3, 2, PAINT.canvasA, PAINT.canvasRed, null, 1);
  pirateSailGrid(k, farPanel(1), 3, 2, PAINT.canvasA, PAINT.canvasRed, null, 1);
  return k;
}
const farPanel = (i) => {
  const x = P_LAYOUT.ship.masts[i], tr = P_LAYOUT.ship.truck[i], R = RIG(tr, i);
  return { cx: x + 0.55, top: R.cY, foot: R.cFoot, hw: R.cHw, bulge: 0.5 };
};

// ---------------------------------------------------------------------------
// SAILS. Reused wholesale from raid-longship.js in shape and in shader contract - anim 3,
// pivot = [belly, yard height, 0] - but parameterised so one mesh can hold four courses and
// topsails on two masts instead of one square sail on one. The belly is what the shader
// flattens on a furl (p.x -= pivot.x * furl) and what flutters.
function pirateSailGrid(k, P, cols, rows, cA, cB, hem, stripeW) {
  const belly = (z, y) => P.bulge * Math.pow(Math.sin((Math.PI * (z + P.hw)) / (2 * P.hw)), 0.85) * Math.sin(Math.PI * 0.62 * Math.min(1, (P.top - y) / Math.max(0.01, P.top - P.foot)));
  const pt = (z, y) => [P.cx + belly(z, y), y, z];
  const pv = (z, y) => [belly(z, y), P.top, 0];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const z0 = -P.hw + (2 * P.hw * c) / cols, z1 = -P.hw + (2 * P.hw * (c + 1)) / cols;
    const y0 = P.top - ((P.top - P.foot) * r) / rows, y1 = P.top - ((P.top - P.foot) * (r + 1)) / rows;
    const col = hem && (r === rows - 1 || r === 0) ? hem : Math.floor(c / stripeW) % 2 ? cB : cA;
    const q = [[z0, y0], [z1, y0], [z1, y1], [z0, y1]];
    k.quad(col, ...q.map(([z, y]) => pt(z, y)), 3, (p) => pv(p[2], p[1]));
  }
}

// The four square sails plus a jib, for one kind. The courses are striped; the topsails are
// plain canvas; nothing carries a device.
export function buildPirateSail(kind) {
  const L = P_LAYOUT[kind] || P_LAYOUT.ship, k = new Kit();
  const stripe = kind === 'boss' ? PAINT.flagBlack : kind === 'jarl' ? PAINT.canvasGreen : PAINT.canvasRed;
  L.masts.forEach((x, i) => {
    const R = RIG(L.truck[i], i);
    pirateSailGrid(k, { cx: x + 0.50, top: R.cY, foot: R.cFoot, hw: R.cHw, bulge: 0.95 }, 8, 4, PAINT.canvasA, stripe, PAINT.canvasHem, 2);
    pirateSailGrid(k, { cx: x + 0.42, top: R.tY, foot: R.tFoot, hw: R.tHw, bulge: 0.72 }, 6, 3, PAINT.canvasA, PAINT.canvasB, null, 3);
  });
  // Jib: a real triangle - head aloft at the fore topmast, tack out on the jibboom, clew aft
  // and to leeward. Head->tack is the luff along the stay, head->clew the leech; four panels
  // between them fill it. anim 3 with its own pivot so it furls and flutters like the squares.
  const jx = L.masts[0], jt = RIG(L.truck[0], 0).tY;
  const H = [jx + 0.15, jt * 0.80, 0.20], T = [10.10, 3.25, 0.12], C = [jx + 1.5, 2.55, 0.46];
  const lerp = (A, B, f) => [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f];
  for (let i = 0; i < 4; i++) {
    const f0 = i / 4, f1 = (i + 1) / 4;
    k.quad(PAINT.canvasA, lerp(H, T, f0), lerp(H, T, f1), lerp(H, C, f1), lerp(H, C, f0), 3, [0.35, jt, 0]);
  }
  return k;
}

export function buildPirateSailMid() {
  const k = new Kit(), L = P_LAYOUT.ship;
  L.masts.forEach((x, i) => {
    const R = RIG(L.truck[i], i);
    pirateSailGrid(k, { cx: x + 0.50, top: R.cY, foot: R.cFoot, hw: R.cHw, bulge: 0.9 }, 4, 2, PAINT.canvasA, PAINT.canvasRed, null, 1);
    pirateSailGrid(k, { cx: x + 0.42, top: R.tY, foot: R.tFoot, hw: R.tHw, bulge: 0.7 }, 2, 1, PAINT.canvasA, PAINT.canvasA, null, 1);
  });
  return k;
}
