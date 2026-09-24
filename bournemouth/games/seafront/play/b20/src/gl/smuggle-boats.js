// THE DORSET SMUGGLING RUN (tmp-tr170) - the smugglers' craft, and the GL pass that draws them.
//
// WHY THIS FILE HAS ITS OWN PROGRAM AND IS NOT A THIRD FACTION OF raid-actors.js.
// The raid's cast is built around a fleet you SINK: its shader carries hull damage, torn
// sails, a hull breaking in two, crews vanishing into the water as a ship goes down, sharks
// and projectiles. None of that exists in this level and none of it may exist in this level -
// nothing here is destroyed and nobody is in the water at any point - so inheriting that
// machinery would have meant shipping the code paths this level's whole premise rules out.
// This program is the small half: place, oars, canvas, a ring on the water and the light.
//
// It costs nothing while the level is off. Every mesh below is built inside a function that
// only the SmuggleActors constructor calls, and that constructor only runs when the level is
// entered (the same rule tmp-tr51 wrote for the raid: a mesh built at page load changed the
// default eFoil renders). Import this module and nothing happens.
//
// Local mesh frame, matching craft.js and raid-actors.js: +X forward (the bow), +Y up,
// +Z starboard; instance yaw is the sim heading (x += cos h, z += sin h).
//
// CONTENT. Cartoon historical fantasy, same licence as the Viking and corsair material.
// No lettering, no name, no flag, no badge, no arms, no branding of any kind on any hull -
// the one approved name in this level lives in the HUD and nowhere else. No weapon is
// modelled on either craft and there is no damage state, no wreck, no body and no person in
// the water anywhere in this file: a boat that has been taken simply lowers her canvas.
//
// THE TWO CRAFT, and why they are these two.
//   LUGGER  - the workhorse. Beamy, carvel-planked, tarred black, two masts raked aft under
//             dipping lug sails, and DEEP: she is drawn with about a third of the freeboard
//             her sheer line would give her light, because she is carrying. Her tubs are on
//             deck where you can count them, strung on their sinking rope.
//   GALLEY  - long, narrow, open, no rig worth the name, twelve oars. Quiet and quick and
//             she carries half what the lugger does. Recorded on the Kent coast rather than
//             this one (see the briefing card, which says so).
//
// ⚠️ No backtick may appear inside the GLSL template literals below.

import { link, uniforms, buffer } from './core.js';
import { Kit, PAINT, ZERO } from './raid-kit.js';
import { figureLo } from './raid-crew.js';
import { buildBowWave, buildWakeChevron } from './raid-longship.js';
import { SKY_GLSL } from './shaders.js';

const ATTR = { aPos: 0, aNormal: 1, aColor: 2, aAnim: 3, aPivot: 4, aInst0: 5, aInst1: 6, aInst2: 7, aInst3: 8 };
const MAX_INST = 128;
const INST_FLOATS = 16;
const VFLOATS = 14;

// Reference lengths. A mesh is built at its own length and the instance scale is b.L / this,
// so tuning a boat's length in tuning.js needs no change here.
export const LUG_L = 13.5;
export const GAL_L = 11.0;

// ANIM CODES read by the vertex shader below (int(aAnim + 0.5)):
//   0  static
//   1  oar shaft  (pivot = the oar's own port; sweep + lift from the stroke curve)
//   2  canvas     (lug sail: billow and luff; hidden outright once aInst3.y > 0.5)
//   3  ring       (radius aInst3.x, height aInst3.y - the gauge on the water)
//   4  float bob  (a marker keg riding the surface)
//  16  shimmer    (raid-longship's own bow wave and wake chevron, imported unchanged)
// 100+ anything figureLo() builds: a crew member. Treated as static - nothing in this level
//      ever hides a person, which is the opposite of the rule the raid's shader needs.
const OAR = 1, CANVAS = 2, RING = 3, BOB = 4;

// The smugglers' palette. Tarred, salted and deliberately dull: these are boats built to
// not be seen at four in the morning, and against the raid's reds and golds that reads
// immediately as a different fleet before a single shape is recognised.
export const DARK = {
  tar: [0.038, 0.036, 0.040],            // hull topsides: Stockholm tar over oak
  tarLit: [0.062, 0.058, 0.060],
  boot: [0.075, 0.062, 0.048],           // the boot-top band at the waterline
  belowW: [0.028, 0.030, 0.029],
  wale: [0.020, 0.019, 0.021],
  oak: [0.135, 0.092, 0.052],            // bare wood inboard: thwarts, gunwale cap, tiller
  oakDark: [0.088, 0.060, 0.034],
  deck: [0.115, 0.082, 0.050],
  cask: [0.232, 0.146, 0.070],           // a tub: a half-anker cask
  caskEnd: [0.288, 0.196, 0.104],
  hoop: [0.115, 0.118, 0.125],           // iron hoops
  rope: [0.255, 0.215, 0.145],
  canvasA: [0.268, 0.182, 0.108],        // barked canvas - tanned red-brown, never white
  canvasB: [0.214, 0.146, 0.090],
  canvasHem: [0.128, 0.086, 0.054],
  spar: [0.150, 0.105, 0.060],
  oarLoom: [0.215, 0.160, 0.092],
  oarBlade: [0.170, 0.120, 0.066],
  keg: [0.235, 0.155, 0.072],            // the marker keg on a sown crop
  kegDark: [0.120, 0.078, 0.038],
  cork: [0.470, 0.400, 0.280],
  smock: [0.105, 0.115, 0.125],          // crew: a fisherman's slop, not a uniform
  smockB: [0.135, 0.120, 0.100],
  hatBand: [0.085, 0.080, 0.078],
};

// ---------------------------------------------------------------------------------------
// hull sections
// ---------------------------------------------------------------------------------------
// t runs -1 (transom) .. +1 (stem). A lugger is a full-bodied working boat: she carries her
// beam well aft, so the half-beam curve is flat through the middle and only lets go near the
// ends, and the transom is cut off square rather than run to a point.
const lugHalfBeam = (t) => 1.72 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(Math.min(1, t * 0.97 + 0.05)), 3.1)), 0.55);
const lugSheer = (t) => 1.18 + 0.72 * Math.pow(Math.abs(t), 2.6) + (t > 0 ? 0.34 * Math.pow(t, 6) : 0);
const lugKeel = (t) => -1.05 + 0.92 * Math.pow(Math.abs(t), 2.4);
// A rowing galley is a different animal: nearly parallel-sided, very narrow, low all through.
const galHalfBeam = (t) => 0.78 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 4.2)), 0.45);
const galSheer = (t) => 0.62 + 0.40 * Math.pow(Math.abs(t), 3.0);
const galKeel = (t) => -0.54 + 0.44 * Math.pow(Math.abs(t), 2.2);

// One hull station, as a point on the section curve. v = 0 at the sheer, 1 at the keel.
function sectionOf(hb, sh, kl, t, v, side, halfL) {
  const ys = sh(t), yk = kl(t), r = Math.pow(Math.min(1, v), 1 / 0.62);
  return [t * halfL, ys - (ys - yk) * v, side * hb(t) * Math.pow(Math.max(0, 1 - r * r), 0.46)];
}

// Planked shell in K bands. The band that straddles the waterline is the boot-top, the ones
// below it are the wetted bottom: the eye reads "she is down to her marks" off that line
// sitting high on the hull, which is the whole point of a laden boat.
function shell(k, hb, sh, kl, halfL, NS, K, waterBand) {
  const P = (t, v, side) => sectionOf(hb, sh, kl, t, v, side, halfL);
  for (const side of [-1, 1]) {
    for (let j = 0; j < K; j++) {
      const c = j < waterBand ? (j % 2 ? DARK.tar : DARK.tarLit)
        : j === waterBand ? DARK.boot : DARK.belowW;
      for (let i = 0; i < NS; i++) {
        const t0 = -1 + (2 * i) / NS, t1 = -1 + (2 * (i + 1)) / NS;
        k.quad(c, P(t0, j / K, side), P(t1, j / K, side), P(t1, (j + 1) / K, side), P(t0, (j + 1) / K, side));
      }
    }
  }
}

// The square transom that closes a lugger's stern, and the deadwood under it.
function transom(k, hb, sh, kl, halfL, K) {
  const t = -1, ys = sh(t), yk = kl(t), w = hb(t);
  for (let j = 0; j < K; j++) {
    const v0 = j / K, v1 = (j + 1) / K;
    const y0 = ys - (ys - yk) * v0, y1 = ys - (ys - yk) * v1;
    const s0 = w * (1 - v0 * 0.55), s1 = w * (1 - v1 * 0.55);
    k.quad(j < K - 2 ? DARK.tar : DARK.boot, [t * halfL, y0, -s0], [t * halfL, y0, s0], [t * halfL, y1, s1], [t * halfL, y1, -s1]);
  }
}

// Gunwale cap: bare oak, the one light line on a black boat, so the sheer reads at distance.
function capRail(k, hb, sh, halfL, n, r) {
  for (const side of [-1, 1]) {
    const pts = [], rad = [];
    for (let i = 0; i <= n; i++) {
      const t = -0.985 + (1.97 * i) / n;
      pts.push([t * halfL, sh(t) + 0.02, side * (hb(t) + 0.015)]);
      rad.push(r);
    }
    k.path(DARK.oak, pts, rad, 5, 0, ZERO, false);
  }
}

// ---------------------------------------------------------------------------------------
// the cargo
// ---------------------------------------------------------------------------------------
// A TUB: a half-anker cask, flat on one side so it lies against a man's back, hooped in iron
// and - this is the part that matters to the level - already roped. Every tub on deck is
// strung on the same sinking line, because sowing the crop is not a decision taken at the
// rail: the boat is rigged for it before she ever leaves the far shore.
function tubAt(k, x, y, z, s, a, anim = 0, pv = ZERO) {
  const T = { x, y, z, a: a || 0, s };
  // The cask lies on its side, axis athwartships: a bulged barrel with flat heads.
  k.addT(T, DARK.cask, (b) => {
    b.tube(0, 0.30, -0.27, 0, 0.30, -0.09, 0.215, 0.300, 7, false, false);
    b.tube(0, 0.30, -0.09, 0, 0.30, 0.09, 0.300, 0.300, 7, false, false);
    b.tube(0, 0.30, 0.09, 0, 0.30, 0.27, 0.300, 0.215, 7, false, false);
  }, anim, pv);
  k.addT(T, DARK.caskEnd, (b) => {
    b.tube(0, 0.30, -0.28, 0, 0.30, -0.26, 0.215, 0.215, 7, true, true);
    b.tube(0, 0.30, 0.26, 0, 0.30, 0.28, 0.215, 0.215, 7, true, true);
  }, anim, pv);
  k.addT(T, DARK.hoop, (b) => {
    for (const dz of [-0.11, 0.11]) b.tube(0, 0.30, dz - 0.015, 0, 0.30, dz + 0.015, 0.315, 0.315, 7, false, false);
  }, anim, pv);
}

// The deck load: tubs stacked in two rows with the sinking rope run along them.
function cargo(k, n, x0, dx, y, halfBeam, tiers = 2) {
  // TWO TIERS, and that is the whole reason a player can tell a laden boat from an empty one
  // at a hundred metres: the lower tier sits on the sole where it cannot be seen over the
  // rail, so a single tier made her look empty. The upper one stands proud of the gunwale.
  const perTier = Math.ceil(n / tiers);
  let placed = 0;
  for (let t = 0; t < tiers && placed < n; t++) {
    const ty = y + t * 0.70;
    const m = Math.min(perTier, n - placed);
    for (let i = 0; i < m; i++) {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
      tubAt(k, x0 + dx * row + (t % 2 ? dx * 0.35 : 0), ty, side * halfBeam * 0.42, 1, 0.22 * side);
      placed++;
    }
    const x1 = x0 + dx * Math.max(0, Math.ceil(m / 2) - 1);
    for (const side of [-1, 1]) {
      k.path(DARK.rope, [[x0 - 0.55, ty + 0.30, side * halfBeam * 0.42], [x1 + 0.6, ty + 0.30, side * halfBeam * 0.42]], [0.035, 0.035], 4, 0, ZERO, true);
    }
  }
}

// ---------------------------------------------------------------------------------------
// the rig
// ---------------------------------------------------------------------------------------
// A DIPPING LUG: one yard, slung well forward of the mast, carrying a four-sided sail whose
// luff runs down ahead of the mast. It is the rig that makes a lugger a lugger, it looks
// nothing whatever like a square rig or a Viking yard, and it is the reason this hull can
// never be mistaken for either at any distance.
function lugSail(k, mx, my, mh, rake, area) {
  const top = [mx + mh * Math.sin(rake), my + mh * Math.cos(rake), 0];
  // the yard: forward end high, after end low, canted across the mast
  const yf = [top[0] + area * 0.52, top[1] - area * 0.10, 0];
  const ya = [top[0] - area * 0.46, top[1] - area * 0.34, 0];
  k.path(DARK.spar, [yf, ya], [0.045, 0.055], 5, 0, ZERO, true);
  // the canvas, as a grid so the shader can move it
  const tack = [yf[0] - area * 0.06, my + 0.32, 0];
  const clew = [ya[0] - area * 0.34, my + 0.46, 0];
  const NX = 4, NY = 4;
  const P = (u, v) => {
    const a = [yf[0] + (ya[0] - yf[0]) * u, yf[1] + (ya[1] - yf[1]) * u, 0];
    const b = [tack[0] + (clew[0] - tack[0]) * u, tack[1] + (clew[1] - tack[1]) * u, 0];
    return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v, 0];
  };
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NY; j++) {
      const u0 = i / NX, u1 = (i + 1) / NX, v0 = j / NY, v1 = (j + 1) / NY;
      // CLOTHS, not squares: a sail is sewn from vertical panels, so the seam runs one way
      // only. The first pass alternated on (i + j) and read as a chequerboard at 40 m.
      const c = j === NY - 1 ? DARK.canvasHem : i % 2 ? DARK.canvasA : DARK.canvasB;
      k.quad(c, P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1), CANVAS, [mx, my, 0]);
    }
  }
  // sheet and halyard: two lines, and they are the only thing on the rig that is not dark
  k.path(DARK.rope, [clew, [ya[0] - area * 0.02, my + 0.18, 0]], [0.022, 0.022], 4, CANVAS, [mx, my, 0], false);
}

function mast(k, mx, my, mh, rake) {
  const top = [mx + mh * Math.sin(rake), my + mh * Math.cos(rake), 0];
  k.path(DARK.spar, [[mx, my - 0.5, 0], top], [0.085, 0.048], 6, 0, ZERO, true);
}

// ---------------------------------------------------------------------------------------
// the craft
// ---------------------------------------------------------------------------------------
export function buildLugger() {
  const k = new Kit(), halfL = LUG_L / 2;
  shell(k, lugHalfBeam, lugSheer, lugKeel, halfL, 14, 7, 4);
  transom(k, lugHalfBeam, lugSheer, lugKeel, halfL, 7);
  // wale: a heavy rubbing strake just under the sheer, in near-black
  for (const side of [-1, 1]) {
    const pts = [], rad = [];
    for (let i = 0; i <= 12; i++) { const t = -0.98 + (1.96 * i) / 12; pts.push([t * halfL, lugSheer(t) - 0.20, side * (lugHalfBeam(t) + 0.02)]); rad.push(0.055); }
    k.path(DARK.wale, pts, rad, 4, 0, ZERO, false);
  }
  capRail(k, lugHalfBeam, lugSheer, halfL, 12, 0.055);
  // deck / sole, flat and low: she is loaded and there is no cabin on her
  for (let i = 0; i < 10; i++) {
    const t0 = -0.86 + (1.66 * i) / 10, t1 = -0.86 + (1.66 * (i + 1)) / 10;
    const w0 = lugHalfBeam(t0) * 0.86, w1 = lugHalfBeam(t1) * 0.86, y = 0.16;
    k.quad(i % 2 ? DARK.deck : DARK.oakDark, [t0 * halfL, y, -w0], [t1 * halfL, y, -w1], [t1 * halfL, y, w1], [t0 * halfL, y, w0]);
  }
  // thwarts
  for (const tx of [-0.42, 0.06, 0.52]) {
    k.box(DARK.oak, tx * halfL - 0.14, 0.60, -lugHalfBeam(tx) * 0.92, tx * halfL + 0.14, 0.70, lugHalfBeam(tx) * 0.92);
  }
  cargo(k, 10, -2.3, 1.10, 0.34, 1.72, 2);
  mast(k, 3.05, 0.5, 7.4, -0.14);
  mast(k, -1.35, 0.5, 6.4, -0.16);
  lugSail(k, 3.05, 0.5, 7.4, -0.14, 3.5);
  lugSail(k, -1.35, 0.5, 6.4, -0.16, 3.0);
  // tiller, over the transom
  k.path(DARK.oak, [[-halfL + 0.15, 0.92, 0], [-halfL + 2.3, 1.02, 0.18]], [0.055, 0.04], 5, 0, ZERO, true);
  // the crew: a skipper at the tiller and two hands at the cargo. Nobody is armed.
  const CREWOPT = { headgear: 'scarf', tunics: [DARK.smock, DARK.smockB], hats: [DARK.hatBand], body: DARK.smock, trews: DARK.oakDark, furs: [DARK.smockB], hairs: [[0.10, 0.075, 0.055]] };
  figureLo(k, { x: -halfL + 1.5, y: 0.16, z: 0.32, a: Math.PI, s: 0.92 }, { ...CREWOPT, tunic: 0, hat: 0, hair: 0, fur: 0 }, true);
  figureLo(k, { x: 1.15, y: 0.16, z: -0.62, a: 0.6, s: 0.90 }, { ...CREWOPT, tunic: 1, hat: 0, hair: 0, fur: 0 }, true);
  figureLo(k, { x: 3.6, y: 0.16, z: 0.44, a: -1.1, s: 0.90 }, { ...CREWOPT, tunic: 0, hat: 0, hair: 0, fur: 0 }, true);
  return k;
}

export function buildGalley() {
  const k = new Kit(), halfL = GAL_L / 2;
  shell(k, galHalfBeam, galSheer, galKeel, halfL, 12, 6, 3);
  capRail(k, galHalfBeam, galSheer, halfL, 12, 0.040);
  for (let i = 0; i < 10; i++) {
    const t0 = -0.88 + (1.72 * i) / 10, t1 = -0.88 + (1.72 * (i + 1)) / 10;
    const w0 = galHalfBeam(t0) * 0.84, w1 = galHalfBeam(t1) * 0.84, y = -0.06;
    k.quad(i % 2 ? DARK.deck : DARK.oakDark, [t0 * halfL, y, -w0], [t1 * halfL, y, -w1], [t1 * halfL, y, w1], [t0 * halfL, y, w0]);
  }
  // six thwarts, twelve oars. The oars are the point of her, so they get the detail.
  const OARS = 6;
  for (let i = 0; i < OARS; i++) {
    const tx = -0.62 + (1.24 * i) / (OARS - 1), x = tx * halfL;
    k.box(DARK.oak, x - 0.10, 0.22, -galHalfBeam(tx) * 0.9, x + 0.10, 0.30, galHalfBeam(tx) * 0.9);
    for (const side of [-1, 1]) {
      const pv = [x, galSheer(tx) + 0.02, side * (galHalfBeam(tx) + 0.02)];
      // loom inboard of the port, blade outboard and down
      k.path(DARK.oarLoom, [[pv[0] - 0.85, pv[1] + 0.30, side * 0.10], pv, [pv[0] + 0.35, pv[1] - 0.72, side * (galHalfBeam(tx) + 2.05)]],
        [0.048, 0.055, 0.042], 5, OAR, pv, false);
      k.quad(DARK.oarBlade,
        [pv[0] + 0.20, pv[1] - 0.72, side * (galHalfBeam(tx) + 1.95)],
        [pv[0] + 0.52, pv[1] - 0.75, side * (galHalfBeam(tx) + 2.02)],
        [pv[0] + 0.52, pv[1] - 1.02, side * (galHalfBeam(tx) + 2.62)],
        [pv[0] + 0.20, pv[1] - 0.99, side * (galHalfBeam(tx) + 2.55)], OAR, pv);
    }
  }
  cargo(k, 6, -1.35, 0.95, 0.06, 0.78, 2);
  // a stump of a mast and no sail bent on: she is here to be rowed
  k.path(DARK.spar, [[0.9, -0.05, 0], [1.05, 2.5, 0]], [0.06, 0.04], 5, 0, ZERO, true);
  k.path(DARK.oak, [[-halfL + 0.10, 0.52, 0], [-halfL + 1.7, 0.62, 0.14]], [0.045, 0.034], 5, 0, ZERO, true);
  const CREWOPT = { headgear: 'scarf', tunics: [DARK.smock, DARK.smockB], hats: [DARK.hatBand], body: DARK.smock, trews: DARK.oakDark, furs: [DARK.smockB], hairs: [[0.10, 0.075, 0.055]] };
  figureLo(k, { x: -halfL + 1.0, y: -0.06, z: 0.0, a: Math.PI, s: 0.88 }, { ...CREWOPT, tunic: 0, hat: 0, hair: 0, fur: 0 }, true);
  return k;
}

// Impostor LOD. A silhouette and a rig, ~40 triangles, for the hulls still out on the horizon.
function farHull(k, hb, sh, kl, halfL, NS) {
  for (const side of [-1, 1]) {
    for (let i = 0; i < NS; i++) {
      const t0 = -1 + (2 * i) / NS, t1 = -1 + (2 * (i + 1)) / NS;
      k.quad(DARK.tar,
        [t0 * halfL, sh(t0), side * hb(t0)], [t1 * halfL, sh(t1), side * hb(t1)],
        [t1 * halfL, kl(t1) + 0.15, side * hb(t1) * 0.3], [t0 * halfL, kl(t0) + 0.15, side * hb(t0) * 0.3]);
    }
  }
}

export function buildLuggerFar() {
  const k = new Kit(), halfL = LUG_L / 2;
  farHull(k, lugHalfBeam, lugSheer, lugKeel, halfL, 5);
  for (const [mx, mh, ar] of [[3.05, 7.4, 3.5], [-1.35, 6.4, 3.0]]) {
    const top = [mx + mh * Math.sin(-0.15), 0.5 + mh * Math.cos(-0.15), 0];
    k.quad(DARK.canvasA, [top[0] + ar * 0.5, top[1] - ar * 0.10, 0], [top[0] - ar * 0.45, top[1] - ar * 0.34, 0],
      [top[0] - ar * 0.78, 0.9, 0], [top[0] + ar * 0.44, 0.8, 0], CANVAS, [mx, 0.5, 0]);
  }
  return k;
}

export function buildGalleyFar() {
  const k = new Kit(), halfL = GAL_L / 2;
  farHull(k, galHalfBeam, galSheer, galKeel, halfL, 4);
  for (const side of [-1, 1]) {
    k.quad(DARK.oarLoom, [-2.6, 0.3, side * 0.5], [2.6, 0.3, side * 0.5], [2.2, -0.5, side * 2.6], [-3.0, -0.5, side * 2.6], OAR, [0, 0.3, side * 0.5]);
  }
  return k;
}

// ---------------------------------------------------------------------------------------
// the crop, and the gauges
// ---------------------------------------------------------------------------------------
// A loose tub in the water - what the player is actually seizing once the crop is sown.
export function buildLooseTub() {
  const k = new Kit();
  tubAt(k, 0, 0, 0, 1, 0);
  return k;
}

// THE MARKER. A smuggler who sinks his tubs has to be able to find them again, so the string
// is buoyed: a small keg, or a corked bladder, on a stray-line. It is the only thing on the
// surface once a crop is sown, and it is what the player creeps for.
export function buildMarker() {
  const k = new Kit();
  k.add(DARK.keg, (b) => { b.tube(0, -0.18, 0, 0, 0.18, 0, 0.22, 0.22, 7, true, true); }, BOB, ZERO);
  k.add(DARK.kegDark, (b) => { b.tube(0, 0.18, 0, 0, 0.24, 0, 0.16, 0.10, 6, false, true); }, BOB, ZERO);
  k.add(DARK.cork, (b) => { b.tube(0, 0.24, 0, 0.05, 0.62, 0.02, 0.035, 0.030, 5, false, true); }, BOB, ZERO);
  // the stray-line falling away below it
  k.add(DARK.rope, (b) => { b.tube(0, -0.18, 0, -0.10, -1.30, 0.06, 0.022, 0.018, 4, false, true); }, BOB, ZERO);
  return k;
}

// THE GAUGE. A flat ring on the water, radius and height driven per instance: it is the
// seizure gauge when it sits round a boat and the creeping gauge when it sits round a marker.
// THE GAUGE. A shallow ripple ring lying ON the water, radius per instance. The first pass
// built it as a VERTICAL band and at a 12 m creeping radius that is a 1 m wall of light
// across the shot - it read as a bug, not as a gauge. A flat annulus with a slight lift at
// its outer edge reads as a ring of water and never occludes the boat inside it.
export function buildRing() {
  const k = new Kit(), N = 28;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    const p = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
    k.quad([1, 1, 1], p(a0, 0.93, 0), p(a1, 0.93, 0), p(a1, 1.03, 1), p(a0, 1.03, 1), RING, ZERO, 1);
  }
  return k;
}

// A short arc of the same ring, used to draw the gauge FILLING: `frac` of the circle.
export function buildArc() {
  const k = new Kit(), N = 36;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    const p = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
    // the fill test lives in the shader: aPivot.x carries this segment's fraction round
    const f = (i + 1) / N;
    k.quad([1, 1, 1], p(a0, 0.90, 0), p(a1, 0.90, 0), p(a1, 1.04, 1), p(a0, 1.04, 1), RING, [f, 0, 0], 1);
  }
  return k;
}

// ---------------------------------------------------------------------------------------
// GL
// ---------------------------------------------------------------------------------------
const VERT = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aNormal;
in vec4 aColor;
in float aAnim;
in vec3 aPivot;
in vec4 aInst0;   // x, y, z, yaw
in vec4 aInst1;   // pitch, roll, phase, scale
in vec4 aInst2;   // tint rgb, tint amount
in vec4 aInst3;   // x: stroke rate | ring radius, y: canvas down | ring height, z: gauge fill 0..1, w: spare
uniform mat4 uViewProj;
uniform float uTime;
out vec3 vWorld;
out vec3 vNormal;
out vec4 vColor;

vec3 place(vec3 p) {
  float cp = cos(aInst1.x), sp = sin(aInst1.x);
  float cr = cos(aInst1.y), sr = sin(aInst1.y);
  float ch = cos(aInst0.w), sh = sin(aInst0.w);
  vec3 q = vec3(p.x * cp - p.y * sp, p.x * sp + p.y * cp, p.z);
  q = vec3(q.x, q.y * cr - q.z * sr, q.y * sr + q.z * cr);
  return vec3(ch * q.x - sh * q.z, q.y, sh * q.x + ch * q.z);
}
vec3 rotX(vec3 d, float a) { float c = cos(a), s = sin(a); return vec3(d.x, d.y * c + d.z * s, -d.y * s + d.z * c); }
vec3 rotY(vec3 d, float a) { float c = cos(a), s = sin(a); return vec3(d.x * c - d.z * s, d.y, d.x * s + d.z * c); }

// One oar stroke, the same shape the raid uses: catch forward, pull, feather, recover.
vec3 stroke(float phi) {
  float s = fract(phi / 6.2831853);
  if (s < 0.5) return vec3(mix(-0.42, 0.38, smoothstep(0.04, 0.5, s)), mix(0.13, -0.03, smoothstep(0.0, 0.07, s)), 0.0);
  return vec3(mix(0.38, -0.42, smoothstep(0.55, 0.98, s)), mix(-0.03, 0.15, smoothstep(0.5, 0.58, s)), 0.0);
}

void main() {
  vec3 p = aPos;
  vec3 n = aNormal;
  int anim = int(aAnim + 0.5);
  if (anim >= 100) anim -= 100;          // a crew member: drawn exactly as they stand
  float phi = uTime * aInst3.x + aInst1.z;

  if (anim == 1) {
    float side = aPivot.z >= 0.0 ? 1.0 : -1.0;
    vec3 st = stroke(phi);
    vec3 d = rotY(rotX(p - aPivot, side * st.y), side * st.x);
    n = rotY(rotX(n, side * st.y), side * st.x);
    p = aPivot + d;
  } else if (anim == 2) {
    // LUG CANVAS. Down and gone once she has been taken - a boat under seizure does not sail.
    if (aInst3.y > 0.5) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); vWorld = vec3(0.0); vNormal = vec3(0.0, 1.0, 0.0); vColor = vec4(0.0); return; }
    float drop = clamp((aPivot.y + 7.0 - p.y) / 7.0, 0.0, 1.0);
    p.z += (0.30 + 0.55 * drop) * sin(uTime * 1.15 + aInst1.z + p.y * 0.20);
    p.z += 0.14 * sin(uTime * 3.10 + p.x * 0.8 + aInst1.z);
    p.x += 0.07 * sin(uTime * 2.30 + p.y * 0.5);
  } else if (anim == 3) {
    // GAUGE. aPivot.x is this segment's fraction round the circle; segments past the fill
    // are simply not drawn, so one mesh draws any fill from empty to full.
    if (aPivot.x > 0.0 && aPivot.x > aInst3.z) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); vWorld = vec3(0.0); vNormal = vec3(0.0, 1.0, 0.0); vColor = vec4(0.0); return; }
    p.xz *= aInst3.x;
    p.y *= aInst3.y;
  } else if (anim == 4) {
    p.y += 0.16 * sin(uTime * 1.35 + aInst1.z) + 0.07 * sin(uTime * 2.7 + aInst1.z * 1.7);
    p = rotX(p, 0.10 * sin(uTime * 1.1 + aInst1.z));
  } else if (anim == 16) {
    p.y *= 0.8 + 0.2 * sin(uTime * 5.0 + p.x * 2.5 + p.z);
  }

  p *= aInst1.w;
  vec3 w = place(p) + aInst0.xyz;
  vWorld = w;
  vNormal = place(n);
  vColor = vec4(mix(aColor.rgb, aInst2.rgb, aInst2.a), aColor.a);
  gl_Position = uViewProj * vec4(w, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec4 vColor;
out vec4 fragColor;
uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform float uExposure;

${SKY_GLSL}

vec3 acesR(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

const vec3 EXTINCT = vec3(0.62, 0.16, 0.30);
const vec3 WATER_IN = vec3(0.012, 0.055, 0.041);

void main() {
  vec3 base = vColor.rgb;
  vec3 col;
  if (vColor.a > 0.5) {
    col = base * 1.35;                       // foam, wake and the gauges: flat, not lit
  } else {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCamPos - vWorld);
    if (dot(N, V) < 0.0) N = -N;
    float ndl = max(dot(N, uSunDir), 0.0);
    vec3 direct = base * (ndl * 0.85 + 0.15);
    vec3 ambient = base * skyColor(normalize(N + vec3(0.0, 0.35, 0.0)), uSunDir) * 0.55;
    col = direct * 0.55 + ambient;
    if (vWorld.y < 0.0) {
      float d = min(-vWorld.y, 3.0) * 2.0;
      vec3 t = exp(-EXTINCT * d);
      col = col * t + WATER_IN * (1.0 - t);
    }
  }
  fragColor = vec4(pow(acesR(col * uExposure), vec3(1.0 / 2.2)), 1.0);
}
`;

export class SmuggleActors {
  constructor(gl) {
    this.gl = gl;
    this.prog = link(gl, VERT, FRAG, 'smuggleActors', ATTR);
    this.u = uniforms(gl, this.prog, ['uViewProj', 'uTime', 'uCamPos', 'uSunDir', 'uExposure']);
    this.types = {};
    const defs = {
      lugger: buildLugger(), galley: buildGalley(),
      luggerFar: buildLuggerFar(), galleyFar: buildGalleyFar(),
      tub: buildLooseTub(), marker: buildMarker(),
      ring: buildRing(), arc: buildArc(),
      bowWave: buildBowWave(), foam: buildWakeChevron(),
    };
    for (const name in defs) this.types[name] = this._upload(defs[name]);
    this.lastStats = { draws: 0, tris: 0, instances: 0 };
  }

  _upload(kit) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const nv = kit.pos.length / 3;
    const data = new Float32Array(nv * VFLOATS);
    for (let i = 0; i < nv; i++) {
      const o = i * VFLOATS;
      data[o] = kit.pos[i * 3]; data[o + 1] = kit.pos[i * 3 + 1]; data[o + 2] = kit.pos[i * 3 + 2];
      data[o + 3] = kit.nrm[i * 3]; data[o + 4] = kit.nrm[i * 3 + 1]; data[o + 5] = kit.nrm[i * 3 + 2];
      data[o + 6] = kit.col[i * 4]; data[o + 7] = kit.col[i * 4 + 1]; data[o + 8] = kit.col[i * 4 + 2]; data[o + 9] = kit.col[i * 4 + 3];
      data[o + 10] = kit.anim[i];
      data[o + 11] = kit.piv[i * 3]; data[o + 12] = kit.piv[i * 3 + 1]; data[o + 13] = kit.piv[i * 3 + 2];
    }
    buffer(gl, gl.ARRAY_BUFFER, data);
    const S = VFLOATS * 4;
    gl.enableVertexAttribArray(ATTR.aPos); gl.vertexAttribPointer(ATTR.aPos, 3, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(ATTR.aNormal); gl.vertexAttribPointer(ATTR.aNormal, 3, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(ATTR.aColor); gl.vertexAttribPointer(ATTR.aColor, 4, gl.FLOAT, false, S, 24);
    gl.enableVertexAttribArray(ATTR.aAnim); gl.vertexAttribPointer(ATTR.aAnim, 1, gl.FLOAT, false, S, 40);
    gl.enableVertexAttribArray(ATTR.aPivot); gl.vertexAttribPointer(ATTR.aPivot, 3, gl.FLOAT, false, S, 44);
    const inst = new Float32Array(MAX_INST * INST_FLOATS);
    const ibo = buffer(gl, gl.ARRAY_BUFFER, inst, gl.DYNAMIC_DRAW);
    for (let j = 0; j < 4; j++) {
      const loc = ATTR.aInst0 + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, INST_FLOATS * 4, j * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
    const big = nv > 65535;
    buffer(gl, gl.ELEMENT_ARRAY_BUFFER, big ? new Uint32Array(kit.idx) : new Uint16Array(kit.idx));
    gl.bindVertexArray(null);
    return { vao, ibo, inst, n: 0, count: kit.idx.length, tris: kit.tris3, type: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
  }

  begin() { for (const k in this.types) this.types[k].n = 0; }

  add(type, x, y, z, yaw, pitch = 0, roll = 0, phase = 0, scale = 1, tint = null, rate = 0, down = 0, fill = 1) {
    const t = this.types[type];
    if (!t || t.n >= MAX_INST) return;
    const o = t.n * INST_FLOATS, a = t.inst;
    a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = yaw;
    a[o + 4] = pitch; a[o + 5] = roll; a[o + 6] = phase; a[o + 7] = scale;
    if (tint) { a[o + 8] = tint[0]; a[o + 9] = tint[1]; a[o + 10] = tint[2]; a[o + 11] = tint[3]; }
    else { a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = 0; a[o + 11] = 0; }
    a[o + 12] = rate; a[o + 13] = down; a[o + 14] = fill; a[o + 15] = 0;
    t.n++;
  }

  draw(cam, vp, sunDir, exposure, time) {
    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.u.uViewProj, false, vp);
    gl.uniform1f(this.u.uTime, time);
    gl.uniform3f(this.u.uCamPos, cam.x, cam.y, cam.z);
    gl.uniform3f(this.u.uSunDir, sunDir[0], sunDir[1], sunDir[2]);
    gl.uniform1f(this.u.uExposure, exposure);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.CULL_FACE);
    let draws = 0, tris = 0, instances = 0;
    for (const name in this.types) {
      const t = this.types[name];
      if (!t.n) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, t.ibo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, t.inst, 0, t.n * INST_FLOATS);
      gl.bindVertexArray(t.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, t.count, t.type, 0, t.n);
      draws++; tris += t.tris * t.n; instances += t.n;
    }
    gl.bindVertexArray(null);
    this.lastStats = { draws, tris, instances };
  }

  meshTris() { const o = {}; for (const k in this.types) o[k] = this.types[k].tris; return o; }
}

// ---------------------------------------------------------------------------------------
// scene assembly - pure except for the actors it writes into, so the LOD policy below can
// be read and checked without a GL context anywhere near it.
// ---------------------------------------------------------------------------------------
const NEAR_LOD = 260, NEAR_MAX = 6;
// The gauge colours. Amber while a boat is being taken, cold blue while a crop is being
// crept up: two verbs, two colours, and neither of them is the raid's red.
export const GAUGE = { seize: [1.0, 0.72, 0.16, 1], creep: [0.30, 0.78, 1.0, 1], warn: [1.0, 0.42, 0.20, 1] };
const TAKEN = [0.16, 0.20, 0.25, 0.30];     // a boat under seizure: cooled off, canvas down

export class SmuggleScene {
  constructor() { this.order = []; }
  reset() { this.order.length = 0; }

  fill(A, g, pose, cam) {
    A.begin();
    const px = cam ? cam.x : pose.x, pz = cam ? cam.z : pose.z;
    // nearest first, so the full-detail budget goes to the hulls the player is working
    const o = this.order;
    o.length = 0;
    for (const b of g.boats) { if (b.state !== 'gone') o.push(b); }
    o.sort((a, c) => ((a.x - px) ** 2 + (a.z - pz) ** 2) - ((c.x - px) ** 2 + (c.z - pz) ** 2));
    let near = 0;
    for (const b of o) {
      const d = Math.hypot(b.x - px, b.z - pz);
      const detail = near < NEAR_MAX && d < NEAR_LOD;
      if (detail) near++;
      const ref = b.kind === 'galley' ? GAL_L : LUG_L;
      const s = b.L / ref;
      const taken = b.state === 'seized';
      const type = b.kind === 'galley' ? (detail ? 'galley' : 'galleyFar') : (detail ? 'lugger' : 'luggerFar');
      const rate = b.kind === 'galley' ? (taken ? 0 : 2.1 + b.speed * 0.16) : 0;
      A.add(type, b.x, b.y || 0, b.z, b.heading, b.pitch || 0, b.roll || 0, b.phase || 0, s,
        taken ? TAKEN : null, rate, taken ? 1 : 0, 1);
      if (b.speed > 1.2 && !taken) {
        const bw = Math.min(1.6, 0.45 + b.speed * 0.12);
        A.add('bowWave', b.x + Math.cos(b.heading) * b.L * 0.44, 0.05, b.z + Math.sin(b.heading) * b.L * 0.44, b.heading, 0, 0, b.id * 0.7, bw * s);
        A.add('foam', b.x - Math.cos(b.heading) * b.L * 0.55, 0.04, b.z - Math.sin(b.heading) * b.L * 0.55, b.heading, 0, 0, 0, s * (0.8 + b.speed * 0.06));
      }
      // the seizure gauge: a ring that closes round the boat as she is taken
      if (b.hold > 0.02 && !taken) {
        A.add('arc', b.x, 0.10, b.z, 0, 0, 0, 0, 1, GAUGE.seize, Math.max(5, b.L * 0.58), 0.22, Math.min(1, b.hold / g.T.seizeSec));
      } else if (b.nerve > 0 && b.state === 'running') {
        // and the WARNING ring: she has seen you, and the clock on her nerve is running
        A.add('ring', b.x, 0.08, b.z, 0, 0, 0, 0, 1, GAUGE.warn, Math.max(6, b.L * 0.74), 0.14 + 0.10 * Math.sin(g.time * 9), 1);
      }
    }
    for (const c of g.crops) {
      if (c.done) continue;
      A.add('marker', c.x, 0.1, c.z, 0, 0, 0, c.id * 1.3, 1);
      if (c.hold > 0.02) A.add('arc', c.x, 0.09, c.z, 0, 0, 0, 0, 1, GAUGE.creep, g.T.creepR, 0.22, Math.min(1, c.hold / g.T.creepSec));
      // the tubs themselves, only once they are up and floating alongside
      for (let i = 0; i < c.floating; i++) {
        const a = (i / Math.max(1, c.floating)) * Math.PI * 2;
        A.add('tub', c.x + Math.cos(a) * 2.2, -0.20, c.z + Math.sin(a) * 2.2, a, 0, 0, i * 0.9, 1);
      }
    }
  }
}
