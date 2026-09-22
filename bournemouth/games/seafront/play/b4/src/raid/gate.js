// THE HARBOUR MOUTH - the corsair level's objective (tr145). Pure rules: no DOM, no GL, no
// clock, no Math.random. Mixed into RaidGame exactly as SiegeMethods and AllyMethods are.
//
// WHY THIS IS A MODULE AND NOT siege.js WITH A DIFFERENT TARGET.
// siege.js is 847 lines of PIER: SECTIONS with hp, fire, char and collapse; SLOTS with
// mooring, ladders and boarders; pierAt/pierFrame/pierEdges derived from pier.js's HEAD and
// TIP; a water cannon that puts fires out; and a lose condition (loseCollapsed) counting
// COLLAPSED STRUCTURE. Old Harry's chalk has none of that and cannot be given any of it: it
// does not burn, it has no sections, there is nothing to moor to and nothing to collapse.
// Reusing siege.js here would have meant either inventing seven fake burnable sections in a
// cliff, or gutting the file the pier raid still depends on.
//
// What the corsair level DOES reuse from siege.js is the GUNNERY - _broadside, _bsTarget,
// _nearestEnemyShip, _gun, _movePierShots, _roundHitsPlayer, _roundHitsShip - which is
// objective-agnostic already and stays mixed into RaidGame unchanged. So the split is:
// siege.js keeps the guns, gate.js owns the objective. Nothing is duplicated.
//
// THE OBJECTIVE IS A LINE, and that is the reuse that matters. The raid's bones are "sink them
// before they get there": _makeShip gives every hull a target (s.tx/s.tz) and a time-to-target
// (s.ttb), _moveShip steers to it, threats() sorts by it, objective() points the HUD compass at
// it and pilot.js flies at it. A gate keeps every one of those: the target is a point on the
// line, ttb is the distance still to run. Nothing in the raid had to learn a new shape.
//
// THE LINE. A half-plane, not a segment, anchored on the chalk:
//
//        run > 0   THROUGH - Studland Bay and a clear run to the harbour mouth
//   ~~~~~~~~~X~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  the gate: through the Old Harry stacks,
//        Old Harry  <-- the channel -->        bearing 060/240, out to sea
//        run < 0   the corsairs, standing in from the south-east
//
// A HALF-PLANE IS SAFE HERE ONLY BECAUSE OF THE GEOMETRY, and it was checked rather than
// assumed. The run direction is bearing 330 (the way into Studland Bay), so its X component is
// NEGATIVE: a corsair who tries to dodge the player by standing further out to sea moves ALONG
// the line, not through it, and her run gets slightly LONGER, not shorter. The other flank is
// the chalk itself. So there is no way round, no segment bookkeeping, and no "she sailed past
// the end of the gate and never came back" state to get wrong. The crossing offsets are
// recorded on every run (gate.crossings) so the claim stays measured and not asserted.
//
// NO NATIONS. The attackers are corsairs. Nothing in this file names, flags or colours a
// country, and there is no lettering anywhere: this project has no text renderer and none was
// added. The historical flavour is the 1405 retaliation on Poole and stays in the HUD's HTML.

import { ARENA_GRID, ARENA_STACKS } from '../gl/arena-oldharry-data.js';
// >>> LASTTAIL
// tmp-tr179: the ONE run-length decode and sea flood fill, from the file that owns the survey.
// `decodeSea` below used to be a third hand-written copy of it; it is now a four-line frame
// shift over this. SAFE FOR THE SAME REASON THE GATE_LINE IMPORT BELOW IS, and traced rather
// than argued (work/imports.mjs on this tree): arena-oldharry.js was ALREADY in this file's
// transitive import set through gate-buoys.js, so naming it adds no module to the graph, and
// its own subtree is arena-oldharry-data.js alone - it reaches back to neither this file nor
// coast.js. 21 modules reachable from here before, 21 after, and no new cycle.
import { decode } from '../gl/arena-oldharry.js';
// <<< LASTTAIL
import { COAST } from '../gl/coast.js';
// >>> CLEANUP
// tmp-tr174: the ONE definition of the gate line, in the coast frame. See GATE below for why
// this import cannot cycle. It was already reached through coast.js.
import { GATE_LINE } from '../gl/gate-buoys.js';
// <<< CLEANUP

const OX = -COAST.startX, OZ = -COAST.startZ;         // coast -> sim world
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------------------------------------------------------------------------------------------
// THE GATE, in the SIM WORLD frame.
//
// The anchor is the Old Harry stack group's centre - ARENA_BOUNDS.stacks, measured off the
// LIDAR connected components rather than taken from a gazetteer (arena-oldharry.js says why the
// sheet's own position for it lands in water). Taking the anchor from the survey means the gate
// cannot drift away from the rock the player is looking at.
//
// The normal is bearing 330 in the coast frame's axes (+X is bearing 079, +Z is bearing 169),
// i.e. the course from Handfast Point up Studland Bay toward the harbour mouth, 2.5 km beyond
// the north edge of the surveyed arena and therefore off in the haze, not drawn.
//
// >>> CLEANUP
// tmp-tr174: the anchor and the four direction components are no longer written here. They come
// from gl/gate-buoys.js's GATE_LINE, which is now the one definition of this line, and this is
// only its SIM WORLD restatement - the same axes shifted by (OX, OZ).
//
// WHY THE IMPORT IS SAFE, measured rather than argued. gate-buoys.js used to carry a second
// copy precisely because a cycle was feared: gate.js imports coast.js and coast.js imports
// gate-buoys.js. But that is the point - gate-buoys.js was ALREADY in this file's transitive
// import set through exactly that path, so naming it directly adds no module to the graph, and
// gate-buoys.js's own subtree (arena-oldharry.js -> arena-oldharry-data.js) reaches back to
// neither this file nor coast.js. Traced on this tree with work/imports.mjs, not assumed.
//
// WHAT THIS ALSO FIXES. The two copies were hand-rounded transcriptions of cos/sin(251 deg) to
// five decimals, which made the pair 1.948 ppm LONG: |n| = |d| = 1.000001947648103.
// Perpendicularity was already exact (d is (-nz, nx), so the cross terms cancel identically);
// only the length was wrong, and nothing in the level could see it, because gateRun and gateOff
// are only ever compared against metre-scale thresholds. It would have surfaced the first time
// anything normalised against them, fed one to an acos, or accumulated them over a long run.
// GATE_LINE now derives them from the bearing, so they are unit and perpendicular by
// construction in BOTH frames at once - which is the part that needed the duplication gone
// first. Normalising one copy and not the other would have opened a 2 mm disagreement between
// the rules and the marking that tmp-tr169's own 1e-9 m check was written to catch.
//
// MEASURED COST, and the honest comparison. The alternative was to rescale the rounded pair in
// place, keeping the authored direction and fixing only the length. Both, over the same
// 1600 x 1600 m box centred on the gate:
//     rescale in place   |n| = 1.00000000000000022   worst gateAt shift 2.204 mm
//     derive (shipped)   |n| = 1.00000000000000000   worst gateAt shift 2.638 mm
// Deriving is NOT the smaller move - it is 0.43 mm larger, and an earlier draft of this comment
// claimed the reverse from an arithmetic estimate instead of a measurement. It ships anyway
// because it is the only one of the two that lands on exactly 1.0 rather than one ulp above it,
// and because it removes the hand-rounded constants that caused this. Two millimetres is four
// orders of magnitude below anything this level measures.
export const GATE = {
  x: GATE_LINE.ax + OX, z: GATE_LINE.az + OZ,   // the stack group, coast -> world
  nx: GATE_LINE.nx, nz: GATE_LINE.nz,           // the way the corsairs are going
  dx: GATE_LINE.dx, dz: GATE_LINE.dz,           // along the line, seaward (perpendicular to n)
};
// <<< CLEANUP

// How far a point still has to run to be through (negative = short of the line).
export const gateRun = (x, z) => (x - GATE.x) * GATE.nx + (z - GATE.z) * GATE.nz;
// How far along the line a point is: 0 at the chalk, positive out to sea. This is the CHANNEL
// coordinate, and the whole level is played inside a few hundred metres of it.
export const gateOff = (x, z) => (x - GATE.x) * GATE.dx + (z - GATE.z) * GATE.dz;
export const gateAt = (run, off) => [GATE.x + GATE.nx * run + GATE.dx * off,
  GATE.z + GATE.nz * run + GATE.dz * off];

// ---------------------------------------------------------------------------------------------
// WHERE THE CHALK IS - a signed distance field over the SAME baked survey the arena mesh is
// built from, so the rules and the geometry cannot disagree about where the land is.
//
// This replaces siege.js's pierFrame/pierEdges keep-out. tmp-tr141/RESULT.md section 10 named
// that as the second of the five things that would have to change to move the allies here, and
// this is it: one function, and both fleets plus the waypoint planner read it.
//
// It is built ONCE, LAZILY, on the first call - i.e. only when the corsair level is actually
// entered. A pier raid, every headless suite that does not ask for the gate, and the default
// game never allocate it. 30,072 + 3,078 cells, two chamfer passes; the build time is measured
// in the suite rather than claimed here.
// >>> LASTTAIL
// tmp-tr179: this WAS a third hand-written copy of arena-oldharry.js's decode() and flood
// fill - the run-length reader, the `wet` test and the four-neighbour fill, ~25 lines, written
// out again. It is now the one function plus the frame shift that is genuinely this file's
// own: gate.js works in the SIM WORLD, so x0/z0 move by (OX, OZ) and nothing else does.
//
// The returned object is exactly the shape it always was - { nx, nz, x0, z0, step, sea } -
// which is all signedField() reads. `h` and `ok` are deliberately NOT carried through: the
// chamfer never wanted them, and dropping them keeps this the same two arrays it always held.
//
// ⚠️ The previous copy's `wet` was `h[p] <= SEA_DM * 0.1`. It now inherits arena-oldharry.js's
// SEA_H, which classifies every node identically (proved node-for-node over both grids,
// work/exact.mjs) and no longer depends on a float32 rounding direction to do it.
const decodeSea = (g) => {
  const G = decode(g);
  return { nx: G.nx, nz: G.nz, x0: G.x0 + OX, z0: G.z0 + OZ, step: G.step, sea: G.sea };
};
// <<< LASTTAIL

// Two-pass chamfer, signed: metres to the nearest land node in the sea, minus metres to the
// nearest sea node inside the land (so the gradient still points out if a hull ever ends up in
// the chalk - which is exactly when a push has to work).
function signedField(G) {
  const { nx, nz, step, sea } = G, n = nx * nz, BIG = 1e9;
  const d = new Float32Array(n).fill(BIG), e = new Float32Array(n).fill(BIG);
  for (let p = 0; p < n; p++) { if (sea[p]) d[p] = 0; else e[p] = 0; }
  const a = step, b = step * Math.SQRT2;
  const pass = (f) => {
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const p = j * nx + i; let v = f[p];
      if (i > 0) v = Math.min(v, f[p - 1] + a);
      if (j > 0) v = Math.min(v, f[p - nx] + a);
      if (i > 0 && j > 0) v = Math.min(v, f[p - nx - 1] + b);
      if (i < nx - 1 && j > 0) v = Math.min(v, f[p - nx + 1] + b);
      f[p] = v;
    }
    for (let j = nz - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) {
      const p = j * nx + i; let v = f[p];
      if (i < nx - 1) v = Math.min(v, f[p + 1] + a);
      if (j < nz - 1) v = Math.min(v, f[p + nx] + a);
      if (i < nx - 1 && j < nz - 1) v = Math.min(v, f[p + nx + 1] + b);
      if (i > 0 && j < nz - 1) v = Math.min(v, f[p + nx - 1] + b);
      f[p] = v;
    }
  };
  pass(d); pass(e);
  const out = new Float32Array(n);
  for (let p = 0; p < n; p++) out[p] = sea[p] ? e[p] : -d[p];
  G.f = out;
  return G;
}

let FIELDS = null;
export function arenaFields() {
  if (!FIELDS) FIELDS = [signedField(decodeSea(ARENA_GRID)), signedField(decodeSea(ARENA_STACKS))];
  return FIELDS;
}
// Test seam only: forget the cached fields so a suite can time the build.
export function resetArenaFields() { FIELDS = null; }

function sample(G, x, z) {
  const { nx, nz, x0, z0, step, f } = G;
  const fi = (x - x0) / step, fj = (z - z0) / step;
  if (fi < 0 || fj < 0 || fi > nx - 1 || fj > nz - 1) return null;   // outside the survey
  const i = fi | 0, j = fj | 0, u = fi - i, v = fj - j;
  const i1 = Math.min(nx - 1, i + 1), j1 = Math.min(nz - 1, j + 1);
  return (f[j * nx + i] * (1 - u) + f[j * nx + i1] * u) * (1 - v)
       + (f[j1 * nx + i] * (1 - u) + f[j1 * nx + i1] * u) * v;
}

// >>> CLEANUP
// tmp-tr174: the two lines below used to say "outside the surveyed grids there is no geometry
// in the mesh either, so open sea is the honest answer". THE SECOND HALF OF THAT WAS FALSE, and
// measurably so. The two grids do NOT nest: ARENA_GRID is 168x179 at 20 m covering world
// x -8470..-5130, and ARENA_STACKS is 57x54 at 2.5 m covering x -5145..-5005. They overlap in a
// 15 m strip and the stack group itself sits 45 m OUTSIDE the main grid. So a point that walks
// off the little stacks grid falls off BOTH, and `sample` returned null twice and the function
// answered 9999 m of clear water.
//
// Measured on this tree before the fix (work/item3_probe.mjs): sweeping 360 bearings out of the
// stack centre at 0.25 m, 259 of them stepped from a real reading straight to OPEN, and the
// worst went from 19.83 m of clear water to "open sea" in one 25 cm step. Over a 2 m lattice of
// the stacks neighbourhood, 6,457 sampled points read OPEN while lying within T.spawnClear
// (60 m) of chalk, the closest of them 2.00 m off the rock. `spawnClear` could not bite there.
//
// LATENT, NOT LIVE: `_gatePoint` draws from a run/offset arc that today lands inside ARENA_GRID,
// so nothing has ever actually spawned in the blind band. It is a trap for whoever next moves
// the arc, the stacks grid or the entry point.
//
// THE FIX - a bounded, one-sided extension of each field, and it is deliberately the
// pessimistic side. For a point outside grid G, let c be its clamp onto G's rectangle and
// dOut = |p - c|. Two things are then provably true, and both are LOWER bounds on the real
// distance to land:
//   * every land cell lies inside the rectangle, so nothing in G is nearer than dOut;
//   * the reverse triangle inequality on the chamfer field gives f(c) - dOut.
// The extension returns max(dOut, f(c) - dOut), which is the larger of two guaranteed lower
// bounds and therefore still a lower bound. It can only ever report LESS clear water than
// there is, never more - so this change cannot make a keep-out weaker anywhere, only firmer.
//
// BEYOND EDGE_MARGIN THE OLD ANSWER IS KEPT, AND THERE IT IS PROVABLE. All land in this arena
// lies inside one of the two rectangles, so a point further than EDGE_MARGIN from BOTH has at
// least EDGE_MARGIN metres of clear water. 250 m is comfortably above every threshold that
// reads this function (T.spawnClear 60, T.wpKeep, T.keep, and test-gate's own > 200), so OPEN
// stays exactly as true and as useful as it was, and the far field is untouched.
const EDGE_MARGIN = 250;

// `sample` with its indices clamped to the grid instead of refusing. Inside the grid this is
// `sample` term for term, so no in-grid reading moves.
function sampleClamped(G, x, z) {
  const { nx, nz, x0, z0, step, f } = G;
  const fi = clamp((x - x0) / step, 0, nx - 1), fj = clamp((z - z0) / step, 0, nz - 1);
  const i = Math.min(nx - 1, fi | 0), j = Math.min(nz - 1, fj | 0), u = fi - i, v = fj - j;
  const i1 = Math.min(nx - 1, i + 1), j1 = Math.min(nz - 1, j + 1);
  return (f[j * nx + i] * (1 - u) + f[j * nx + i1] * u) * (1 - v)
       + (f[j1 * nx + i] * (1 - u) + f[j1 * nx + i1] * u) * v;
}

// Metres from a world point to G's rectangle: 0 inside, the true gap outside.
function outsideDist(G, x, z) {
  const { nx, nz, x0, z0, step } = G;
  const dx = Math.max(x0 - x, 0, x - (x0 + (nx - 1) * step));
  const dz = Math.max(z0 - z, 0, z - (z0 + (nz - 1) * step));
  return Math.hypot(dx, dz);
}

// Metres of clear water at a WORLD point, from grid G, or null if G can say nothing about it.
function sampleNear(G, x, z) {
  const v = sample(G, x, z);
  if (v !== null) return v;
  const d = outsideDist(G, x, z);
  if (d > EDGE_MARGIN) return null;                 // genuinely out of this grid's reach
  return Math.max(d, sampleClamped(G, x, z) - d);   // the guaranteed lower bound, see above
}

// Metres of clear water at a WORLD point. Negative inside the chalk.
export const OPEN = 9999;
export function arenaClear(x, z) {
  const F = arenaFields();
  let best = OPEN, nearest = Infinity;
  for (const G of F) {
    const v = sampleNear(G, x, z);
    if (v !== null && v < best) best = v;
    const d = outsideDist(G, x, z);
    if (d < nearest) nearest = d;
  }
  // THE ASSERTION. OPEN is a claim about the world - "there is no land within reach of here" -
  // and the whole of this defect was that claim being made silently by two null returns. It may
  // now only be made when it is provable: every grid further away than EDGE_MARGIN. If some
  // later edit to `sample`, `sampleNear` or the grid metadata breaks the extension, this throws
  // where the bad value is produced instead of quietly handing a spawner an empty sea.
  if (best >= OPEN && nearest <= EDGE_MARGIN) {
    throw new Error(`arenaClear(${x}, ${z}) fell through to OPEN with a survey grid only `
      + `${nearest.toFixed(1)} m away (margin ${EDGE_MARGIN} m) - the edge extension is broken`);
  }
  return best;
}
// <<< CLEANUP

// The outward normal of the chalk at a world point, by central difference. Returns null in open
// water, where there is nothing to be pushed away from.
const G_EPS = 12;
export function arenaAway(x, z, out = [0, 0]) {
  const c = arenaClear(x, z);
  if (c >= OPEN) return null;
  const gx = arenaClear(x + G_EPS, z) - arenaClear(x - G_EPS, z);
  const gz = arenaClear(x, z + G_EPS) - arenaClear(x, z - G_EPS);
  const L = Math.hypot(gx, gz);
  if (L < 1e-6) return null;
  out[0] = gx / L; out[1] = gz / L;
  return out;
}

// The along-shore band sharks and power-ups are placed in - SIEGE_FIELD's opposite number. It
// is a COAST-X band because that is what _spawnPoint tests, and it is centred on the channel.
export const GATE_FIELD = { coastXMin: -5700, coastXMax: -3500 };

const _n = [0, 0];

export const GateMethods = {
  _initGate() {
    // `through` is the only score that ends this level. `closest` is for the HUD's nerve.
    this.gate = { through: 0, limit: this.T.gate.letThrough, closest: Infinity, crossings: [] };
  },

  get gateFrac() { return clamp(1 - this.gate.through / Math.max(1, this.gate.limit), 0, 1); },
  get gateLeft() { return Math.max(0, this.gate.limit - this.gate.through); },

  // ---- placement ---------------------------------------------------------------------------
  // A spawn point SHORT of the line, spread across the channel. The arc is the corsairs' own
  // quarter - to seaward and to the south - so they come up the cliff line and round the point,
  // which is the one approach that keeps Old Harry in the frame for the whole run.
  _gatePoint(rMin, rMax, oMin, oMax) {
    const rng = this.rng, T = this.T.gate;
    let x = 0, z = 0;
    for (let k = 0; k < 24; k++) {
      const run = -(rMin + rng() * (rMax - rMin));
      const off = oMin + rng() * (oMax - oMin);
      [x, z] = gateAt(run, off);
      if (arenaClear(x, z) < T.spawnClear) continue;                  // never inside the chalk
      if (this.player.valid && Math.hypot(x - this.player.x, z - this.player.z) < 45) continue;
      return { x, z };
    }
    return { x, z };
  },

  // ---- the corsairs' plan ------------------------------------------------------------------
  // The LANE she will try to cross in: a channel coordinate, clamped into the water between the
  // chalk and the open sea, held for `lanePick` seconds so a hull does not weave.
  _gateLane(s) {
    const T = this.T.gate, rng = this.rng;
    const here = gateOff(s.x, s.z);
    return clamp(here + (rng() - 0.5) * T.laneJitter, T.aimOff[0], T.aimOff[1]);
  },

  // Called from _moveShip in place of the siege steer. It writes s.tx/s.tz - the SAME waypoint
  // the ordinary rowing steer consumes - and NOTHING ELSE: no position is written here.
  _gateSteer(s, dt) {
    const T = this.T.gate;
    if (s.through) {                                   // past the line: she runs on and is gone
      s.awayT -= dt;
      if (s.awayT <= 0) s.state = 'gone';
      s.tx = s.x + GATE.nx * 500; s.tz = s.z + GATE.nz * 500; s.ttb = Infinity;
      return;
    }
    s.laneT = (s.laneT || 0) - dt;
    if (s.lane === undefined || s.laneT <= 0) { s.lane = this._gateLane(s); s.laneT = T.lanePick; }
    const [ax, az] = gateAt(T.crossBy, s.lane);
    s.tx = ax; s.tz = az;
    this._gateAvoid(s, T.wpKeep);
    s.ttb = Math.max(0, -gateRun(s.x, s.z)) / Math.max(0.5, s.cruise);
  },

  // Keep a WAYPOINT (never a hull) off the chalk. Same shape as allies.js's _allyAvoid, and it
  // is what that function becomes at this arena.
  _gateAvoid(s, keep) {
    const c = arenaClear(s.tx, s.tz);
    if (c >= keep) return;
    const n = arenaAway(s.tx, s.tz, _n);
    if (!n) return;
    s.tx += n[0] * (keep - c); s.tz += n[1] * (keep - c);
  },

  // ...and this is the hull, the counterpart of siege.js's _pierPush. A ship rammed into the
  // chalk is put back in the water along the field's own gradient.
  _arenaPush(s) {
    const r = this.T.gate.keep * (s.L / 16);
    const c = arenaClear(s.x, s.z);
    if (c >= r) return;
    const n = arenaAway(s.x, s.z, _n);
    if (!n) return;
    s.x += n[0] * (r - c); s.z += n[1] * (r - c);
  },

  // ---- through -----------------------------------------------------------------------------
  // WARNING: AN ALLY IS NEVER TESTED. The quay fleet arrives FROM the harbour and sails in
  // across the line - if this test read every hull the relief fleet would lose the level the
  // moment it appeared. `!s.ally` is the whole of it, and the suite asserts it with allies
  // spawned past the line for a full run.
  _gateTick(dt) {
    let closest = Infinity;
    for (const s of this.ships) {
      if (s.ally || s.state !== 'rowing' || s.through) continue;
      const r = gateRun(s.x, s.z);
      if (r < 0 && -r < closest) closest = -r;
      else if (r > 0) this._through(s);
    }
    this.gate.closest = closest;
  },

  _through(s) {
    s.through = true; s.awayT = this.T.gate.awaySec;
    s.cruise *= 1.25;                                   // she is away and she knows it
    this.gate.through++;
    this.stats.through++;
    this.gate.crossings.push(+gateOff(s.x, s.z).toFixed(1));
    this.combo = 0; this.comboT = 0;
    this._emit('through', { ship: s.id, kind: s.kind, through: this.gate.through,
      left: this.gateLeft, x: +s.x.toFixed(2), z: +s.z.toFixed(2), off: +gateOff(s.x, s.z).toFixed(1) });
    this._checkGate();
  },

  _checkGate() {
    if (!this.playing) return;
    if (this.gate.through >= this.gate.limit) {
      this.outcome = 'lost'; this.phase = 'lost'; this.phaseT = 0;
      this._emit('gateLost', { through: this.gate.through });
    }
  },

  gateSummary() {
    const g = this.gate || {};
    return { through: g.through || 0, limit: g.limit || 0, crossings: (g.crossings || []).slice() };
  },
};
