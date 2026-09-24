// Procedural triangle meshes: board, foil, and a rider.
//
// No model files, no textures, no motion capture - this project ships no
// binaries, so every vertex here is generated from numbers. That sets a real
// ceiling on "realistic" for the human figure: proportion, stance, silhouette
// and lighting are all reachable; skin, cloth and hair are not. At the chase
// camera's 3.4 m, seen from behind, the rider is essentially a wetsuit
// silhouette - which is what the reference footage shows - so the reachable
// part is most of what matters at this distance.
//
// Everything is built into one interleaved buffer per mesh:
//   position.xyz, normal.xyz
//
// Local frame for all parts: +X forward (nose), +Y up, +Z to the rider's right.

const TAU = Math.PI * 2;

export class MeshBuilder {
  constructor() { this.v = []; this.n = []; this.i = []; }

  get vertexCount() { return this.v.length / 3; }

  push(x, y, z, nx, ny, nz) {
    this.v.push(x, y, z);
    this.n.push(nx, ny, nz);
    return this.v.length / 3 - 1;
  }

  tri(a, b, c) { this.i.push(a, b, c); }
  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }

  // A tapered tube from A to B. Limbs, mast, fuselage, pier piles - most of the
  // world is one of these.
  tube(ax, ay, az, bx, by, bz, r0, r1, seg = 10, capA = true, capB = true) {
    let dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.hypot(dx, dy, dz) || 1e-6;
    dx /= len; dy /= len; dz /= len;
    // any perpendicular
    let ux = 0, uy = 1, uz = 0;
    if (Math.abs(dy) > 0.9) { ux = 1; uy = 0; }
    let px = uy * dz - uz * dy, py = uz * dx - ux * dz, pz = ux * dy - uy * dx;
    const pl = Math.hypot(px, py, pz) || 1; px /= pl; py /= pl; pz /= pl;
    const qx = dy * pz - dz * py, qy = dz * px - dx * pz, qz = dx * py - dy * px;

    const base = this.vertexCount;
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * TAU;
      const ca = Math.cos(a), sa = Math.sin(a);
      const nx = px * ca + qx * sa, ny = py * ca + qy * sa, nz = pz * ca + qz * sa;
      this.push(ax + nx * r0, ay + ny * r0, az + nz * r0, nx, ny, nz);
      this.push(bx + nx * r1, by + ny * r1, bz + nz * r1, nx, ny, nz);
    }
    for (let s = 0; s < seg; s++) {
      const a0 = base + s * 2, a1 = base + ((s + 1) % seg) * 2;
      this.quad(a0, a0 + 1, a1 + 1, a1);
    }
    if (capA) this._cap(ax, ay, az, -dx, -dy, -dz, r0, base, seg, 0);
    if (capB) this._cap(bx, by, bz, dx, dy, dz, r1, base, seg, 1);
  }

  // BUG FIX 2026-08-03: these two triangles were wound the opposite way round
  // to the side wall of the very tube they close, so a capped tube was not a
  // consistently wound surface at all. Measured: an octagonal prism r=0.2 h=1
  // has volume 0.1131 m^3, and the divergence theorem over this mesh returned
  // -0.0377 - which is exactly (sides -0.0754) + (cap +0.0377). With backface
  // culling on, the cap is therefore culled from the outside and drawn from
  // the inside, so you can see straight through the end of every capped tube.
  // Invisible on the foil fuselage (28 mm, underwater), very visible on a
  // rider whose limbs are chains of capped tubes: it puts a see-through patch
  // at every elbow, knee and ankle. Now wound to match the side wall.
  _cap(cx, cy, cz, nx, ny, nz, r, base, seg, off) {
    const c = this.push(cx, cy, cz, nx, ny, nz);
    for (let s = 0; s < seg; s++) {
      const a = base + s * 2 + off;
      const b = base + ((s + 1) % seg) * 2 + off;
      if (off) this.tri(c, b, a); else this.tri(c, a, b);
    }
  }

  // Ellipsoid. Head, torso mass, board volume.
  ellipsoid(cx, cy, cz, rx, ry, rz, seg = 14, rings = 9) {
    const base = this.vertexCount;
    for (let i = 0; i <= rings; i++) {
      const v = (i / rings) * Math.PI;
      const sv = Math.sin(v), cv = Math.cos(v);
      for (let j = 0; j <= seg; j++) {
        const u = (j / seg) * TAU;
        const su = Math.sin(u), cu = Math.cos(u);
        const nx = sv * cu, ny = cv, nz = sv * su;
        this.push(cx + nx * rx, cy + ny * ry, cz + nz * rz,
          nx / rx, ny / ry, nz / rz);
      }
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < seg; j++) {
        const a = base + i * (seg + 1) + j;
        const b = a + seg + 1;
        this.quad(a, b, b + 1, a + 1);
      }
    }
  }

  // A wing: symmetric aerofoil section, swept and tapered along the span.
  // Used for the front wing, the rear stabiliser and the mast, which really are
  // all the same object at different scales.
  wing(opts) {
    const {
      span, rootChord, tipChord, sweep = 0, thickness = 0.12,
      cx = 0, cy = 0, cz = 0, vertical = false, sections = 7, chordPts = 9,
    } = opts;
    const base = this.vertexCount;
    for (let s = 0; s <= sections; s++) {
      const t = s / sections;                 // 0 = root, 1 = tip
      const half = (t - 0.5) * span;
      const chord = rootChord + (tipChord - rootChord) * Math.abs(t * 2 - 1);
      const xOff = Math.abs(t * 2 - 1) * sweep;
      for (let c = 0; c <= chordPts; c++) {
        const u = c / chordPts;
        // NACA-ish symmetric half-thickness
        const th = 5 * thickness * chord * (0.2969 * Math.sqrt(u) - 0.1260 * u
          - 0.3516 * u * u + 0.2843 * u * u * u - 0.1015 * u * u * u * u);
        const px = cx - xOff + (0.25 - u) * chord;
        for (const sgn of [1, -1]) {
          if (vertical) this.push(px, cy + half, cz + th * sgn, 0, 0, sgn);
          else this.push(px, cy + th * sgn, cz + half, 0, sgn, 0);
        }
      }
    }
    const perSec = (chordPts + 1) * 2;
    const triBase = this.i.length;
    for (let s = 0; s < sections; s++) {
      for (let c = 0; c < chordPts; c++) {
        const a = base + s * perSec + c * 2;
        const b = a + perSec;
        this.quad(a, a + 2, b + 2, b);           // upper
        this.quad(a + 1, b + 1, b + 3, a + 3);   // lower
      }
    }
    // BUG FIX 2026-08-03: `vertical` swaps which axis carries the SPAN and
    // which carries the THICKNESS, and that swap flips the handedness of the
    // (chord, span, thickness) triad - so the one index order above wound a
    // horizontal wing outward and a vertical one INWARD. MEASURED, on an
    // identical span=1 aerofoil: horizontal, 90 of 90 upper-skin triangles face
    // outward; vertical, 0 of 90 do. On the real mast: -0.000597 m^3 against
    // the front wing's +0.001526.
    //
    // craft.js draws the foil with cullFace(BACK), so the mast's near skin was
    // culled and the far one drawn: the mast wrote depth ~15 mm behind itself
    // and lost its leading edge into whatever was behind it. It also made the
    // foil a MIXED-winding mesh - mast inside-out, wings not - which is the
    // kind of thing that never looks like one bug. Nothing else calls wing()
    // with vertical:true, so there is no caller depending on the old handedness.
    if (vertical) flipWinding(this, triBase);
    this.smoothNormals(base);
  }

  // Recompute normals by area-weighted averaging from `from` onward. Cheaper
  // than getting analytic normals right for every primitive, and it is what
  // stops the aerofoil reading as a folded piece of paper.
  smoothNormals(from = 0) {
    const acc = new Float64Array(this.v.length);
    for (let t = 0; t < this.i.length; t += 3) {
      const [a, b, c] = [this.i[t], this.i[t + 1], this.i[t + 2]];
      if (a < from && b < from && c < from) continue;
      const ax = this.v[a * 3], ay = this.v[a * 3 + 1], az = this.v[a * 3 + 2];
      const bx = this.v[b * 3], by = this.v[b * 3 + 1], bz = this.v[b * 3 + 2];
      const cx = this.v[c * 3], cy = this.v[c * 3 + 1], cz = this.v[c * 3 + 2];
      const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
      const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;
      for (const idx of [a, b, c]) {
        acc[idx * 3] += nx; acc[idx * 3 + 1] += ny; acc[idx * 3 + 2] += nz;
      }
    }
    for (let k = from; k < this.vertexCount; k++) {
      const x = acc[k * 3], y = acc[k * 3 + 1], z = acc[k * 3 + 2];
      const l = Math.hypot(x, y, z);
      if (l > 1e-9) { this.n[k * 3] = x / l; this.n[k * 3 + 1] = y / l; this.n[k * 3 + 2] = z / l; }
    }
  }

  build() {
    const n = this.vertexCount;
    const data = new Float32Array(n * 6);
    for (let k = 0; k < n; k++) {
      data[k * 6] = this.v[k * 3];
      data[k * 6 + 1] = this.v[k * 3 + 1];
      data[k * 6 + 2] = this.v[k * 3 + 2];
      data[k * 6 + 3] = this.n[k * 3];
      data[k * 6 + 4] = this.n[k * 3 + 1];
      data[k * 6 + 5] = this.n[k * 3 + 2];
    }
    return { data, index: new Uint16Array(this.i), count: this.i.length };
  }
}

// ---------------------------------------------------------------------------
// The board: 1.63 m, the length already used by the physics.
// ---------------------------------------------------------------------------
export function buildBoard() {
  const m = new MeshBuilder();
  const L = 1.63, W = 0.62, T = 0.13;
  const rings = 11, seg = 14;
  const base = m.vertexCount;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const x = (t - 0.42) * L;
    // Plan taper: pointed nose, square-ish tail.
    //
    // ⚠️ UNRESOLVED 2026-08-03, recorded rather than guessed. The comment says
    // square-ish tail; the code does not deliver one. MEASURED half-widths per
    // ring, tail to nose:
    //   0.000 0.201 0.294 0.310 0.310 0.310 0.310 0.310 0.288 0.230 0.157 0.000
    // The nose tapers over 0.45 m, which is a nose. The TAIL goes 0.201 -> 0 in
    // 0.148 m, i.e. it comes to a hard point as well, and that point costs 14
    // zero-area triangles (14 more at the nose; 28 of 308 tris, 9%, draw
    // nothing). A real eFoil board has a squared or diamond tail, and the tail
    // is the part of the board NEAREST the chase camera at 3.4 m, so this is a
    // silhouette error and not a detail one.
    //
    // Not fixed here because it is a judgement, not a defect with one right
    // answer: `tail` would need a floor (something like Math.min(1, 0.62 + t*4))
    // and the value of that floor is a board-design decision. There is no eFoil
    // board in the reference stills - they are all pier - and SPEC/SPEC-SURF
    // give the board a length and nothing else. Picking a number here would be
    // inventing a measurement. Owner/reference call needed.
    const nose = Math.min(1, (1 - t) * 3.2);
    const tail = Math.min(1, t * 5.0);
    const w = (W / 2) * Math.pow(Math.min(nose, tail), 0.55);
    const th = (T / 2) * Math.pow(Math.min(Math.min(1, (1 - t) * 4), tail), 0.6);
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * TAU;
      // Superellipse: flat deck, rounded rails, flat-ish hull.
      const ca = Math.cos(a), sa = Math.sin(a);
      const k = 2.6;
      const sx = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / k);
      const sy = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / k);
      m.push(x, sy * th - 0.02, sx * w, 0, sy, sx);
    }
  }
  const triBase = m.i.length;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < seg; j++) {
      const a = base + i * (seg + 1) + j;
      const b = a + seg + 1;
      m.quad(a, a + 1, b + 1, b);
    }
  }
  // BUG FIX 2026-08-03: this loop wound the whole board INWARD. Measured with
  // the divergence theorem, the finished board came out at -0.0787 m^3 - the
  // right magnitude, the wrong sign. craft.js draws it with cullFace(BACK), so
  // GL culled the deck and drew the HULL, and the board wrote its depth 128 mm
  // (the full thickness) below where the deck actually is.
  //
  // It never looked wrong, which is why it survived: the fragment shader does
  // `if (dot(N, V) < 0.0) N = -N`, so the hull's inward normal got flipped back
  // to face the eye and shaded exactly like a deck, and a convex board has the
  // same silhouette either way round. Only the DEPTH gave it away, and depth is
  // invisible until something else is near it. Three things were:
  //   - the rider's soles sit 10 mm inside the deck, so they drew THROUGH it;
  //   - the mast top (y -0.060) is buried 24 mm inside the hull (bottom
  //     y -0.084), so the mast's open top end drew through the deck too;
  //   - the sea surface at y 0 is above the hull bottom, so on a settled board
  //     the water drew over the deck instead of round it.
  // It also broke the shadow pass, which culls FRONT faces to push acne onto
  // the back ones (shadow.js): with the winding reversed that bias landed on
  // the lit side, and the board self-shadowed.
  //
  // Flip BEFORE smoothNormals(), which derives normals from the winding.
  flipWinding(m, triBase);
  m.smoothNormals(base);
  return m.build();
}

// The rig below the board: mast, fuselage, front wing, rear stabiliser.
export function buildFoil(mastLength) {
  const m = new MeshBuilder();
  const mastTop = -0.06, mastBot = mastTop - mastLength;
  // Mast: a vertical aerofoil, not a cylinder - it is a lifting section too.
  m.wing({
    span: mastLength, rootChord: 0.135, tipChord: 0.115, thickness: 0.11,
    cx: -0.05, cy: (mastTop + mastBot) / 2, cz: 0, vertical: true, sections: 5,
  });
  // Fuselage.
  // BUG FIX 2026-08-03: MeshBuilder.tube() winds INWARD - measured, an
  // octagonal prism r=0.2 h=1 has a true volume of 0.11314 m^3 and this mesh
  // reports -0.11314. (The magnitudes match exactly, which is the separate,
  // useful news that the cap fix above really did leave the caps consistent
  // with the side wall.) The wings either side of it wind OUTWARD, so the foil
  // shipped as a mixed-winding mesh: under cullFace(BACK) the near half of the
  // fuselage was culled and the far interior wall drawn in its place, writing
  // depth 56 mm too far back. The mast's bottom edge sits ON the fuselage axis,
  // i.e. buried under 28 mm of skin, so it drew straight through - and a
  // wing() is an open shell, so what showed was the inside of the mast.
  //
  // Flipped here rather than inside tube(): buildRider ends with one global
  // flipWinding(m), and correcting tube() at source would silently invert the
  // rider's neck. tube()'s own vertex normals already point outward, so only
  // the index order needs reversing.
  const fuseTri = m.i.length;
  m.tube(-0.34, mastBot, 0, 0.34, mastBot, 0, 0.028, 0.018, 10);
  flipWinding(m, fuseTri);
  // Front wing: high aspect, swept, tapered
  m.wing({
    span: 0.92, rootChord: 0.20, tipChord: 0.10, sweep: 0.09, thickness: 0.13,
    cx: -0.19, cy: mastBot, cz: 0, sections: 11,
  });
  // Rear stabiliser
  m.wing({
    span: 0.40, rootChord: 0.11, tipChord: 0.06, sweep: 0.04, thickness: 0.10,
    cx: 0.30, cy: mastBot + 0.005, cz: 0, sections: 7,
  });
  return m.build();
}

// ---------------------------------------------------------------------------
// Small vector helpers. The rider is the only thing in this file built from a
// skeleton rather than from axis-aligned numbers, and a skeleton needs these.
// ---------------------------------------------------------------------------
const V = {
  add: (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  unit: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1e-9; return [a[0] / l, a[1] / l, a[2] / l]; },
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
};

// Sweep a closed cross-section along a spine. Each ring is
//   { c, u, v, ru, rv, k }
// with c the centre, u/v the two section axes (u x v MUST point along the
// sweep, or the winding comes out inside-out and backface culling eats the
// mesh), ru/rv the radii on those axes and k a superellipse exponent:
// k=2 is a plain ellipse, k>2 squares it off - a ribcage and the sole of a
// boot are both flatter front-to-back than an ellipse.
//
// This is the one primitive a body actually needs. A tube can only be round
// and constant in section; every part of a person that reads as a person -
// the waist, the ribcage, the occiput, the arch of a foot - is an ellipse
// that changes shape as it travels.
//
// Module-level, not a MeshBuilder method: coast.js subclasses MeshBuilder and
// is being edited in parallel, so this file adds nothing to that surface.
function loft(m, rings, seg, capA = true, capB = true) {
  const base = m.vertexCount;
  for (const r of rings) {
    const k = r.k || 2;
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * TAU;
      const ca = Math.cos(a), sa = Math.sin(a);
      // superellipse in the section plane
      const sx = k === 2 ? ca : Math.sign(ca) * Math.pow(Math.abs(ca), 2 / k);
      const sy = k === 2 ? sa : Math.sign(sa) * Math.pow(Math.abs(sa), 2 / k);
      const n = V.unit([
        r.u[0] * (sx / r.ru) + r.v[0] * (sy / r.rv),
        r.u[1] * (sx / r.ru) + r.v[1] * (sy / r.rv),
        r.u[2] * (sx / r.ru) + r.v[2] * (sy / r.rv),
      ]);
      m.push(r.c[0] + r.u[0] * r.ru * sx + r.v[0] * r.rv * sy,
        r.c[1] + r.u[1] * r.ru * sx + r.v[1] * r.rv * sy,
        r.c[2] + r.u[2] * r.ru * sx + r.v[2] * r.rv * sy,
        n[0], n[1], n[2]);
    }
  }
  for (let i = 0; i < rings.length - 1; i++) {
    for (let s = 0; s < seg; s++) {
      const s1 = (s + 1) % seg;
      const a = base + i * seg, b = a + seg;
      m.quad(a + s, b + s, b + s1, a + s1);
    }
  }
  // Caps wound to match the BANDS above - which is the thing MeshBuilder._cap
  // got wrong (see the note there). Verify by measuring: a closed loft must
  // report a signed volume equal to its true volume, not some fraction of it.
  if (capA) {
    const r = rings[0];
    const c = m.push(r.c[0], r.c[1], r.c[2], 0, 0, 0);
    for (let s = 0; s < seg; s++) m.tri(c, base + s, base + ((s + 1) % seg));
  }
  if (capB) {
    const last = base + (rings.length - 1) * seg;
    const r = rings[rings.length - 1];
    const c = m.push(r.c[0], r.c[1], r.c[2], 0, 0, 0);
    for (let s = 0; s < seg; s++) m.tri(c, last + ((s + 1) % seg), last + s);
  }
}

// Reverse every triangle from `from` onward.
//
// WHY: MeshBuilder.tube() and .ellipsoid() both wind INWARD - measure it with
// the divergence theorem and a lone tube comes out at -0.0377 m^3, a lone
// sphere at -0.104. GL's default is frontFace(CCW) and craft.js draws with
// cullFace(BACK), so for anything built from those two primitives GL culls the
// near surface and draws the FAR interior wall instead. The silhouette
// survives, and smoothNormals() hands back inward normals that happen to shade
// the far wall as if it were the near one, which is why nobody caught it - but
// the DEPTH written is the far side, so every part of the rider shows through
// every other part. The neck draws through the chest, the trapezius draws
// through the ribcage, the shin draws through the bootie. That is a large part
// of what "blocky" looks like on a figure made of overlapping solids.
//
// The rider is flipped once here, at the end of buildRider, so it is a proper
// outward-CCW solid.
//
// 2026-08-03: buildBoard and buildFoil had the same inversion and were left
// alone on the reasoning that they are "single convex parts with nothing to
// self-occlude". That reasoning was wrong twice over. They do not self-occlude,
// but they occlude EACH OTHER and the rider - the mast is buried in the board,
// the mast's root is buried in the fuselage, the rider's soles are buried in
// the deck - and a mesh that writes its far side's depth cannot hide anything
// inside itself. And the foil was not uniformly inverted at all: its two
// horizontal wings wound outward while the mast and the fuselage wound inward,
// so it was a mixed-winding mesh. All three are now fixed at their source, each
// with the measured volume that proves it, and tools/verify-primitives.mjs
// asserts the signs so this cannot come back quietly.
//
// tube() and ellipsoid() are still inward by construction. That is deliberate,
// not an oversight: buildRider ends with one global flip and depends on it, so
// the sign lives at the call site. Any NEW caller of either must flip its own
// range - see the fuselage in buildFoil.
function flipWinding(m, from = 0) {
  for (let t = from; t < m.i.length; t += 3) {
    const b = m.i[t + 1]; m.i[t + 1] = m.i[t + 2]; m.i[t + 2] = b;
  }
}

// Sample a chain of joints into a spine with ROUNDED corners. A knee is a
// corner, but it is a corner with 40 mm of flesh and neoprene over it; a hard
// crease is a large part of what makes chained tubes read as sausage links.
// The fillet is clamped to 45% of the shorter adjacent bone so a short bone
// (wrist to knuckle) cannot be swallowed by its own fillet.
function spinePath(joints, fillet) {
  const pts = [joints[0]];
  for (let j = 1; j < joints.length - 1; j++) {
    const A = joints[j - 1], B = joints[j], C = joints[j + 1];
    const dA = V.sub(A, B), dC = V.sub(C, B);
    const lA = V.len(dA) || 1e-6, lC = V.len(dC) || 1e-6;
    const f = Math.min(fillet, lA * 0.45, lC * 0.45);
    const P = V.add(B, V.mul(dA, 1 / lA), f);
    const Q = V.add(B, V.mul(dC, 1 / lC), f);
    pts.push(P);
    for (let s = 1; s < 4; s++) {              // quadratic Bezier P -> B -> Q
      const t = s / 4, w = 1 - t;
      pts.push([
        w * w * P[0] + 2 * w * t * B[0] + t * t * Q[0],
        w * w * P[1] + 2 * w * t * B[1] + t * t * Q[1],
        w * w * P[2] + 2 * w * t * B[2] + t * t * Q[2],
      ]);
    }
    pts.push(Q);
  }
  pts.push(joints[joints.length - 1]);
  return pts;
}

// A whole limb as ONE lofted surface.
//
// WHY, and this is the main change in this pass: a limb built as four capped
// tubes is four separate closed solids that happen to touch. Each one ends in
// a flat disc at a slightly different angle from its neighbour, so every elbow,
// knee and wrist carries a visible rim - a hard ring of shading right where the
// eye looks for a joint. Measured on the old figure: eight such rims on the
// arms and legs plus a 76 mm-radius "knee barrel" (a 48 cm knee - a real one is
// 38 cm) that read as a doorknob. One loft has no interior rims at all, and it
// costs the same order of triangles.
//
// `prof` rows are [d, ru, rv, k, off]: d = DISTANCE ALONG THE LIMB IN METRES
// (negative counts back from the far end), ru = half-width across the joint
// axis, rv = half-depth in the bending plane, k = superellipse exponent, off =
// shift along +v, which is how a calf gets its belly at the back without
// moving the bone. Real units, so the radii can be checked against a tape:
// circumference = 2*pi*r.
//
// The section frame is parallel-transported rather than rebuilt from a fixed
// axis. A fixed axis blows up when the limb momentarily runs parallel to it -
// which the shoulder does, since the arm leaves the chest sideways and the
// elbow's bend axis is also sideways - and a blown-up frame collapses the
// section to a line.
function limb(m, joints, prof, seg, front, fillet = 0.075) {
  const P = spinePath(joints, fillet);
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + V.len(V.sub(P[i], P[i - 1])));
  const L = cum[cum.length - 1];

  // point + tangent at arc length d
  const at = (d) => {
    d = Math.max(0, Math.min(L, d));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const t = (d - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
    return {
      c: V.add(P[i - 1], V.sub(P[i], P[i - 1]), t),
      T: V.unit(V.sub(P[i], P[i - 1])),
    };
  };

  // u starts as the FIRST interior joint's bend axis - for a leg that is the
  // knee, the one joint whose section shape actually matters - orthogonalised
  // against the first tangent, then rides the curve by re-orthogonalising at
  // each ring.
  let axis = V.cross(V.sub(joints[0], joints[1]), V.sub(joints[2], joints[1]));
  if (V.len(axis) < 1e-5) axis = V.cross(V.sub(joints[1], joints[0]), front);
  axis = V.unit(axis);
  const first = at(0);
  let u = V.unit(V.sub(axis, V.mul(first.T, V.dot(axis, first.T))));
  // Point +v at the FRONT of the joint (patella, inside of the elbow) so a
  // profile row can say "8 mm toward the back" and mean it. Negating u negates
  // v with it, so u x v still points along the sweep and the winding holds.
  if (V.dot(V.cross(first.T, u), front) < 0) u = V.mul(u, -1);

  const rings = [];
  for (const [d, ru, rv, k, off] of prof) {
    // A negative d counts back from the far end. Object.is is not decoration:
    // -0.000 in a profile table is NEGATIVE ZERO, and `-0 < 0` is false, so a
    // row meant to sit at the ankle silently landed back at the hip. It cost
    // 45 mm off the bottom of both shins - a visible gap between the leg and
    // the top of the bootie - with no error anywhere.
    const dd = (d < 0 || Object.is(d, -0)) ? L + d : d;
    const { c, T } = at(dd);
    u = V.unit(V.sub(u, V.mul(T, V.dot(u, T))));   // parallel transport
    const v = V.unit(V.cross(T, u));
    rings.push({ c: off ? V.add(c, v, off) : c, u, v, ru, rv, k: k || 2 });
  }
  loft(m, rings, seg);
  return L;
}

// Two-bone IK. Given the ankle, the hip and a direction to bend towards,
// where is the knee? Solving this instead of hand-placing knees is what keeps
// the bones the right LENGTH across all 11 baked lean poses - hand-placed
// joints stretch the thigh every time the hips move, and a limb that changes
// length between poses is the thing the eye catches first.
function jointIK(a, b, bend, near, far) {
  const d = V.sub(b, a);
  const L = Math.min(V.len(d), near + far - 1e-4) || 1e-4;
  const u = V.mul(d, 1 / (V.len(d) || 1e-4));
  const along = (near * near + L * L - far * far) / (2 * L);
  const out = Math.sqrt(Math.max(0, near * near - along * along));
  let p = V.sub(bend, V.mul(u, V.dot(bend, u)));      // bend, orthogonalised
  if (V.len(p) < 1e-6) p = [0, 0, 1];
  p = V.unit(p);
  return V.add(V.add(a, u, along), p, out);
}

// ---------------------------------------------------------------------------
// The rider. Proportions for a ~1.80 m adult, in metres, standing on the board.
//
// Two things drive every number below.
//
// 1. It is ONE draw call in ONE flat dark colour (craft.js: 0.16/0.17/0.20,
//    rough 0.75) with backface culling on. There is no texture, no second
//    material, no wetsuit seam, no face. Everything the viewer gets is
//    SILHOUETTE and the way light falls across curvature - so every metre of
//    budget goes on outline and on section shape, and none on detail that
//    would need a colour change to be visible at all.
// 2. The stance is the eFoil one, which is a surf stance: feet ACROSS the
//    board one behind the other, regular-footed (left foot toward the nose),
//    hips square-ish to the rail and the chest opened maybe 15 deg further
//    round to look where it is going. The old figure stood square to the nose
//    with its feet fore-and-aft, which is a jet-ski stance, not this.
//
// Anthropometry is standard adult male (Dreyfuss/DINED band, ~50th pct):
// hip joint 0.53 x height, thigh 0.245 x, shin 0.24 x, head 0.13 x. The crouch
// is INFERRED from footage rather than measured: hips ~65 mm below standing
// height, which is a soft-knee riding stance rather than a deep carve.
// ---------------------------------------------------------------------------
// Only height/shoulderW/hipW/torso/thigh/shin and the twists are read by the
// builder; the rest are the dimensions the section tables further down were
// drawn to, kept here so the figure can be checked against one list rather than
// by reading four tables. If you change one, change the table with it.
export const RIDER = {
  height: 1.80,       // standing; the ridden crouch comes out at 1.73
  shoulderW: 0.46,    // deltoid to deltoid INCLUDING the muscle
  clavicleW: 0.36,    // bone width - the shoulders slope down to the deltoids
  hipW: 0.17,         // hip JOINT separation (not the width of the flesh)
  torso: 0.52,        // hip joint to clavicle
  neck: 0.075,        // clavicle to chin: the part of it that actually shows
  headW: 0.164, headD: 0.200, headH: 0.236,
  upperArm: 0.29,
  foreArm: 0.27,
  thigh: 0.44,
  shin: 0.43,
  footL: 0.276,
  // Body twist, radians off "square to the nose". PI/2 would be fully
  // sideways. Hips lead, chest opens ~15 deg further toward the direction of
  // travel - that counter-rotation is most of what makes a stance look ridden
  // rather than posed. INFERRED from footage, not measured.
  // 1.02 rad = 58 deg. A surfer is nearer 90; an eFoiler is not, because the
  // hand controller is held out front and the rider watches the water ahead,
  // so the chest stays part-open to the nose. It is also what the chase camera
  // needs - view3d.js frames this shot on the rider's BACK, and a fully
  // side-on figure gives it a narrow edge with both arms hidden behind a hip.
  hipTwist: 1.02,
  shoulderTwist: 0.80,
  headTwist: 0.26,    // the head is nearly square to the nose: you look ahead
};

const SEG_TORSO = 16, SEG_HEAD = 14, SEG_LIMB = 10, SEG_FOOT = 10;

// ---------------------------------------------------------------------------
// PER-PART MATERIALS FOR THE RIDER.
//
// WHY: until this pass the whole figure was ONE draw call in ONE colour
// (craft.js: part(this.rider, 0.16, 0.17, 0.20, 0.75)), so wetsuit, vest,
// skin, hair and booties all rendered at the same value and the same
// roughness. Measured on the rider mask (see tmp-tr4/rider/RESULT.md, the
// ?rdbg=norider difference method): the whole figure held ONE tonal region at
// the side camera and TWO at chase - and the two were the lit and shaded
// halves of a single material, not a material break. The head-band / torso-band
// luma ratio was 0.98, 1.07, 0.97 across the three cameras: i.e. NO value break
// at the head at all, which is why it read as a featureless ovoid.
//
// HOW, and why this and not a per-vertex attribute: the vertex format here is a
// fixed interleaved 6 floats (pos.xyz, normal.xyz) that craft.js, shadow.js and
// three verify-* tools all bind by stride. Adding a 7th float would touch all
// of them. Splitting by INDEX RANGE touches none: the vertices, their normals
// and the geometry are bit-for-bit what they were, and the only new thing is a
// list saying which run of triangles is which material. Triangles are reordered
// into material blocks at the end of the build (see regroup) so the whole
// figure still costs FIVE draw calls, not twenty-four.
//
// Zero triangles are added by any of this.
// ---------------------------------------------------------------------------
export const RIDER_MAT = { WETSUIT: 0, VEST: 1, SKIN: 2, HAIR: 3, BOOT: 4 };
const RM = RIDER_MAT;

// Index layout of ONE loft() or tube(), which both emit in the same order:
// (rings-1) BANDS of `seg` quads at 6 indices each, then capA's `seg`
// triangles, then capB's. Everything below addresses sub-parts of a single
// lofted surface through these three helpers, so a hairline or a wrist is a
// slice of an existing surface and not a new one. The layout is ASSERTED, not
// assumed: regroup() below fails the build if the ranges do not tile the index
// buffer exactly once.
const bandR = (start, seg, i0, n) => [start + i0 * seg * 6, n * seg * 6];
const quadR = (start, seg, i, s0, n) => [start + (i * seg + s0) * 6, n * 6];
const capR = (start, seg, rings, which) =>
  [start + (rings - 1) * seg * 6 + which * seg * 3, seg * 3];

// The face is an ARC of the head loft, not a band of it: a band split alone
// would put hair across the forehead AND across the chin. loft() lays segment
// s at angle s/seg of a turn from +u, and the head's frame is u = rider's
// right, v = facing - so the front of the face is at s = seg/4 = 3.5 and the
// symmetric arc about it is s = 2,3,4. That is 3/14 of a turn = 77 deg of the
// skull's section, against a real face's ~90-110 deg between the temples; the
// deliberate 20 deg of slack is hair wrapping the temples, which is what wet
// hair does and what makes the mass read at 30 px of head width.
const FACE_S0 = 2, FACE_N = 3;
// And the same trick at the BACK of the head, one band lower. Measured off the
// first cut (r/Z_A_tight.png): with hair starting only at h = 0.124 the chase
// camera - which frames the rider's BACK - showed a pale band of jaw-level skin
// under the hair right across the width of the head, reading as a swim cap with
// a bare nape below it. Hair reaches the nape on a real head, so band 1 gets a
// 77 deg arc of hair at the back (s = 9,10,11 is symmetric about 3/4 of a turn,
// which is -v = directly behind) while the sides stay skin at the sideburn.
const NAPE_S0_OLD = 9, NAPE_N_OLD = 3;

// >>> RIDER
// ---------------------------------------------------------------------------
// THE HAIRLINE WAS A STAIRCASE WITH ONE ENORMOUS STEP, AND THAT STEP IS THE
// SINGLE MOST VISIBLE THING ON THE HEAD. Measured by rendering the head from
// eight directions 45 deg apart at 1.6 m (tmp-tr196/ring/sheet.png): a hard
// square notch where one band's hair arc ends and the next one's begins shows
// at SIX of the eight. It is not a shading artefact - it is the material
// boundary itself.
//
// The cause is arithmetic. Counting BARE (skin) segments per band up the head,
// the old assignment went
//        band 0 (under the chin)   14 of 14
//        band 1 (the jaw)          11 of 14   <- NAPE_S0 9, NAPE_N 3
//        band 2 (cheekbone/ear)     3 of 14   <- the FACE arc
//        band 3 and above           0 of 14
// so the bare arc loses EIGHT segments - 206 deg - between two rings 46 mm
// apart. A hairline cannot do that. Four segments either side of the head have
// hair directly above bare skin with nothing in between, and that right angle
// is the notch. A first attempt here only moved the step down a band; the
// pictures showed it was still a right angle, which is why the rule below is a
// LADDER and not a wider arc.
//
// The rule: ONE BARE ARC PER BAND, ALWAYS CENTRED ON THE FACE, NARROWING BY
// ONE SEGMENT PER BAND.
//        band 0     7 of 14 bare   the front half, ear to ear
//        band 1     5 of 14 bare   the hair has reached the sideburn
//        band 2     3 of 14 bare   unchanged - this IS the old FACE arc
//        band 3+    0 of 14 bare   unchanged
// Steps of 1, 1, 1.5 segments per side instead of 1.5, 4, 1.5. The boundary
// becomes a regular diagonal stair, which is what a hairline sweeping from the
// nape up past the ear to the temple actually is, instead of one right angle.
//
// THE FIX COSTS NOTHING. Not one triangle, not one vertex, not one byte of the
// vertex buffer - verified in node against tmp-tr191/base: 1,900 triangles
// before and after, buffers bit-identical, 26 triangles moving from the SKIN
// group to the HAIR group. This file assigns materials by INDEX RANGE (see
// regroup), so the whole change is which run of existing triangles is called
// hair.
//
// The arcs are centred, not eyeballed: loft() lays segment s at s/seg of a turn
// from +u = the rider's right, so +v = facing is s = SEG_HEAD/4 = 3.5 and
// directly behind is s = 10.5. bare(b, n) starts the arc at
// round(SEG_HEAD/4 - n/2), which for n = 7, 5, 3 gives s0 = 0, 1, 2 - every arc
// symmetric about the face. The ears sit at s = 0 and s = 7.
//
// ABLATION: ?rdbg=oldhair emits the pre-2026-09-20 assignment verbatim - the
// old lines are kept as their own arm rather than reconstructed from the new
// rule, for the reason craft.js gives about ablations that are really second
// implementations. Verified: with it set, and with ?rpaint= restoring the three
// old colours, all six judged renders are BIT-IDENTICAL to the pre-edit tree
// (tmp-tr196/abl vs tmp-tr196/mat, 0 px over 24 views).
//
// WHAT WAS DELIBERATELY NOT DONE, and each is a measurement not a preference:
//  * NO FACE. The game draws the rider at exactly one 3D camera - chase. FPV
//    skips the figure in both craft (craft.js `if (!fpv ...)`, boats.js
//    `mode === 'fpv'`) and the SIDE button is the 2D instrument view. Measured
//    at 1280x720 through an exact ?rpaint= mask, the head is 25x22 px on the
//    eFoil and 21x28 px on the jetski, seen from BEHIND; across the real chase
//    distance and FOV range (view3d.js: 3.4-4.9 m and 4.6-6.2 m, fovY 62 at
//    rest opening to 84) it spans 15 to 42 px and sits under 25 for most of it.
//    A nose is about 2 px of silhouette and it is on the far side of the head.
//    A face would cost triangles at eleven baked poses and return nothing.
//  * NO HOOD OR HELMET EITHER, which is how the surfers were solved. At 22 px
//    from behind this head ALREADY reads as a dark cap; a hood would change
//    nothing there and would cost the one value break the head does have.
//  * NO EAR. The ears sit at s = 0 and s = 7, which bands 1 and 2 now paint
//    HAIR. An ear there renders as a hair-coloured bump 2 px across.
//  * THE NECK IS NOT TOO THICK, which is what it looks like. Tube base radius
//    0.066 = 132 mm across against headW 164 mm, a ratio of 0.80. Fiftieth-
//    percentile adult male is a 38-40 cm neck circumference (121-127 mm) on a
//    152 mm head breadth = 0.79-0.84. It is inside the band. What reads as
//    thickness is the absence of a trapezius line and of any shadow under the
//    jaw, which is shading, not radius.
// ---------------------------------------------------------------------------
const HDBG = (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined'
  ? (new URLSearchParams(location.search).get('rdbg') || '') : '').split(',');
const OLD_HAIR = HDBG.includes('oldhair');
// NAPE_S0_OLD / NAPE_N_OLD are used only by the ?rdbg=oldhair arm below.
const BARE_CHIN = 7, BARE_JAW = 5;
// <<< RIDER

// Reorder triangles into material blocks and return the draw groups.
//
// Reordering is free and safe: an index buffer is an unordered SET of triangles
// as far as the rasteriser is concerned (the craft shader is opaque, depth
// tested, and does no blending), so moving whole triangles changes no pixel.
// It is done LAST, after flipWinding and smoothNormals, so neither of those
// sees anything different from before this pass.
//
// The coverage assert is the point of the function as much as the reorder: an
// off-by-one in any range above would otherwise paint some other part's
// triangles and only show up as a stray coloured facet on a render.
function regroup(m, ranges) {
  const nTri = m.i.length / 3;
  const mat = new Int8Array(nTri).fill(-1);
  for (const { mat: k, start, count } of ranges) {
    if (start % 3 || count % 3) throw new Error('rider group not triangle-aligned');
    for (let t = start / 3; t < (start + count) / 3; t++) {
      if (t < 0 || t >= nTri) throw new Error('rider group out of range');
      if (mat[t] !== -1) throw new Error('rider group overlap at tri ' + t);
      mat[t] = k;
    }
  }
  for (let t = 0; t < nTri; t++) {
    if (mat[t] === -1) throw new Error('rider triangle ' + t + ' has no material');
  }
  const out = [], groups = [];
  for (let k = 0; k < 5; k++) {
    const start = out.length;
    for (let t = 0; t < nTri; t++) {
      if (mat[t] === k) out.push(m.i[t * 3], m.i[t * 3 + 1], m.i[t * 3 + 2]);
    }
    if (out.length > start) groups.push({ mat: k, start, count: out.length - start });
  }
  m.i = out;
  return groups;
}

export function buildRider(lean = 0) {
  const R = RIDER;
  const m = new MeshBuilder();
  const cl = Math.cos(lean), sl = Math.sin(lean);
  // Material ranges, filled as each part is built. See RIDER_MAT above.
  const grp = [];
  const g = (k, r) => { if (r[1] > 0) grp.push({ mat: k, start: r[0], count: r[1] }); };

  // Body frame at a given twist, tilted fore/aft by `lean` about +Z. F is the
  // way the chest faces, Rt the rider's right, U their up. Rt x F = U, which
  // is the handedness loft() needs.
  const frame = (tw) => {
    const c = Math.cos(tw), s = Math.sin(tw);
    return { F: [c * cl, c * sl, s], Rt: [-s * cl, -s * sl, c], U: [-sl, cl, 0] };
  };
  const U = [-sl, cl, 0];

  // ---- stance ------------------------------------------------------------
  // Feet are nailed to the board and everything above is solved from them, so
  // no lean pose can lift a foot off the deck. Board deck top is y~0.045; the
  // sole sits 10 mm into it so no gap can open under the arch.
  const ANK = 0.125;
  const frontAnkle = [0.26, ANK, 0.02];    // rider's LEFT, toward the nose
  const backAnkle = [-0.30, ANK, -0.04];   // rider's RIGHT, over the tail
  // Toe angles off across-the-board. Back foot nearly square to the stringer,
  // front foot opened toward the nose - the standard surf foot placement.
  const frontToe = 0.72, backToe = 0.26;

  // Hips. MEASURED against the pose itself rather than picked: with the hips at
  // the old 0.885 the cosine rule puts the knees at 133 deg (front) and 143
  // deg (back), and 143 deg is a standing leg - the figure read as a stride,
  // not as a stance. Dropping to 0.845 gives 123/127 deg, which is a soft
  // riding crouch: clearly bent, not a squat. Anything under ~115 starts to
  // look like a carve, which is a different pose from the one the physics is
  // showing most of the time. Standing hip height would be 0.53 x 1.80 = 0.954
  // above the sole, so this is a 110 mm crouch. INFERRED from footage.
  // Still shifted back under lean exactly as the old rider did - that mapping
  // is what the baked pose set expects.
  const hipY = 0.845;
  const hipC = [0.005 - sl * 0.055, hipY - (1 - cl) * 0.03, -0.01];
  const fHip = frame(R.hipTwist);
  const fSh = frame(R.shoulderTwist);
  // The spine is not a post. It inclines toward the nose as it rises - hips
  // back, chest forward - which is the other half of a crouch and the thing
  // that stops the torso reading as a mast with a head on top. 75 mm of
  // forward shift over a 0.52 m torso is about 8 deg. INFERRED from footage.
  const FWD = [cl, sl, 0];                 // the nose direction under lean
  const SPINE_INCL = 0.075;
  const spineShift = (s) => Math.pow(Math.max(0, s) / R.torso, 1.6) * SPINE_INCL;
  const spineAt = (s) => V.add(V.add(hipC, U, s), FWD, spineShift(s));
  const shC = spineAt(R.torso);            // clavicle centre

  // ---- torso -------------------------------------------------------------
  // Sections up the spine. w = half-width across the back, d = half-depth
  // front-to-back, off = how far the section sits forward of the spine, k =
  // how square the section is. The waist pinch at s=0.20 and the ribcage
  // flare at s=0.40 are the whole reason this is a loft and not a cone.
  // Chest is 25 mm proud of bare ribs: eFoil riders wear an impact vest.
  // The bottom three rings matter more than they look: the pelvis has to stay
  // WIDE down to crotch level or the thighs appear to hang off a ball, which
  // is what the first cut of this did.
  const torsoSec = [
    [-0.120, 0.112, 0.086, -0.014, 2.4],   // crotch level, between the thighs
    [-0.075, 0.150, 0.104, -0.020, 2.6],   // seat
    [-0.028, 0.169, 0.114, -0.022, 2.6],   // glutes push back; widest point
    [0.030, 0.168, 0.114, -0.014, 2.6],    // hips
    [0.110, 0.161, 0.106, -0.002, 2.4],
    [0.200, 0.156, 0.101, 0.004, 2.2],     // waist - narrowest
    [0.310, 0.164, 0.107, 0.008, 2.3],     // lower ribs
    [0.400, 0.181, 0.117, 0.010, 2.5],     // ribcage
    [0.470, 0.194, 0.121, 0.008, 2.5],     // chest + vest
    [0.520, 0.180, 0.097, 0.004, 2.4],     // clavicle
    [0.556, 0.112, 0.068, 0.000, 2.2],     // top of the trapezius
    [0.580, 0.052, 0.040, 0.000, 2.0],     // closes small enough for the neck
  ];                                       //   to hide the cap - see below
  const torsoI = m.i.length;
  loft(m, torsoSec.map(([s, w, d, off, k]) => {
    // Twist interpolates hips -> shoulders up the spine. A body that turns as
    // it rises reads as a torso; a constant section reads as a post.
    const t = Math.max(0, Math.min(1, s / 0.52));
    const f = frame(R.hipTwist + (R.shoulderTwist - R.hipTwist) * (t * t * (3 - 2 * t)));
    return { c: V.add(spineAt(s), f.F, off), u: f.Rt, v: f.F, ru: w, rv: d, k };
  }), SEG_TORSO);
  // The buoyancy aid. Bands 5-8 span spine s = 0.200 (the waist, the narrowest
  // ring) to s = 0.520 (the clavicle) - the vest starts at the waist and stops
  // AT the collarbone, which is the cut of a buoyancy aid: they are scooped low
  // at the neck so they do not foul the chin. Bands 9-10 (clavicle -> top of
  // the trapezius -> the ring that closes under the neck) stay wetsuit and are
  // what gives the figure a dark neoprene yoke between the vest and the skin of
  // the neck. FIRST CUT RAN THE VEST TO BAND 9 AND IT WAS WRONG: with orange
  // reaching the trapezius the figure read as a hi-vis T-shirt, not a vest over
  // a suit (r/Z_A_tight.png). Bands 0-4 are crotch to waist.
  // Both caps are buried - capA between the thighs, capB inside the neck tube -
  // so they take the wetsuit value they cannot be seen in.
  const torsoHem = torsoI + 9 * SEG_TORSO * 6;
  g(RM.WETSUIT, bandR(torsoI, SEG_TORSO, 0, 5));
  g(RM.VEST, bandR(torsoI, SEG_TORSO, 5, 4));
  g(RM.WETSUIT, [torsoHem, m.i.length - torsoHem]);

  // ---- shoulders ---------------------------------------------------------
  // There is no shoulder primitive any more. The trapezius and the deltoid are
  // the first three rings of the ARM loft (see below), because that is the one
  // way to get them without a seam.
  //
  // What was here before: a tapered tube for the trapezius plus an ellipsoid
  // for the deltoid. The ellipsoid read as a ball bearing glued to the shoulder
  // and carried 40 degenerate triangles at its poles; the tube then surfaced
  // BETWEEN the torso and that ball as two flat facets, which shaded as a dark
  // angular wedge on top of each shoulder - the single worst artefact on the
  // whole figure at chase distance. Three surfaces crossing at the one place
  // the eye reads posture from.

  // ---- neck + head -------------------------------------------------------
  // The head is tilted a little forward and yawed most of the way back toward
  // the nose: a rider looks where they are going, not where their chest points.
  // Only 45% of the lean reaches the head - people keep their head level.
  const fH0 = frame(R.headTwist);
  const tilt = 0.10;
  const Uh = V.unit(V.add(V.mul(fH0.U, Math.cos(tilt)), fH0.F, Math.sin(tilt)));
  const Fh = V.unit(V.add(V.mul(fH0.F, Math.cos(tilt)), fH0.U, -Math.sin(tilt)));
  const Rh = fH0.Rt;
  // The neck starts INSIDE the chest and finishes INSIDE the skull. Ending it
  // flush against either one leaves a hard rim that reads as a collar - which
  // is exactly how the first cut of this looked.
  const neckBase = V.add(V.add(shC, U, 0.012), fSh.F, 0.004);
  const neckTop = V.add(V.add(neckBase, Uh, R.neck), Fh, 0.010);  // = chin height
  const neckEnd = V.add(neckTop, Uh, 0.055);
  const neckI = m.i.length;
  m.tube(neckBase[0], neckBase[1], neckBase[2], neckEnd[0], neckEnd[1], neckEnd[2],
    0.066, 0.049, SEG_LIMB, true, true);
  // The neck is SKIN. It is the whole reason a neck break can exist at all: it
  // sits between the wetsuit collar (torso band 10) and the jaw, so with three
  // different values in play the head stops being continuous with the shoulders.
  g(RM.SKIN, [neckI, m.i.length - neckI]);

  // Head sections from under the jaw to the crown. The negative offsets up top
  // are the occiput: a skull is mass BEHIND the ear, and a sphere has none,
  // which is exactly why the old head read as an egg on a stick.
  const headSec = [
    [0.000, 0.040, 0.050, 0.012, 2.0],   // under the chin
    [0.036, 0.062, 0.078, 0.010, 2.2],   // jaw
    [0.078, 0.079, 0.096, 0.002, 2.3],   // cheekbone / ear
    [0.124, 0.082, 0.100, -0.009, 2.3],  // widest part of the cranium
    [0.172, 0.074, 0.089, -0.015, 2.2],  // upper skull
    [0.212, 0.049, 0.056, -0.014, 2.0],  // crown
    [0.236, 0.014, 0.016, -0.011, 2.0],  // closes the top
  ];
  const headI = m.i.length;
  loft(m, headSec.map(([h, w, d, off, k]) => ({
    c: V.add(V.add(neckTop, Uh, h), Fh, off), u: Rh, v: Fh, ru: w, rv: d, k,
  })), SEG_HEAD);
  // >>> RIDER  ⚠️ THE NEXT TWO SENTENCES ARE STALE AS OF 20 SEP 2026. Bands 0
  // and 1 are no longer skin the whole way round: they carry bare arcs of 7 and
  // 5 segments centred on the face, so that the hairline steps by ONE segment a
  // band instead of four. See the block near FACE_S0 and the code below.
  // <<< RIDER
  // HAIR / FACE. Bands 0-1 (h 0.000 -> 0.078, under the chin to the jaw) are
  // skin the whole way round: the jaw and the nape carry no hair on anyone who
  // has just come off the water. Band 2 (0.078 -> 0.124, cheekbone/ear up to
  // the widest part of the cranium) is where the hairline crosses, so it splits
  // by arc - face in front, hair round the sides and back. Everything above
  // 0.124 - 52.5% of the way from chin to crown, which is just above the eye
  // line - is hair, which is where wet hair pushed back off the face actually
  // sits. capA is inside the neck tube and takes skin; capB is the crown and
  // takes hair.
  const headRings = headSec.length;
  const headBandsEnd = headI + (headRings - 1) * SEG_HEAD * 6;
  // >>> RIDER  start of band 3; was faceEnd, the end of band 2's face arc.
  const band3 = headI + 3 * SEG_HEAD * 6;
  // <<< RIDER
  // >>> RIDER
  // ONE BARE ARC PER BAND, CENTRED ON THE FACE, NARROWING BY ONE SEGMENT A BAND.
  // See the hairline block near FACE_S0. bare(b, n) paints n of SEG_HEAD
  // segments SKIN, centred on s = SEG_HEAD/4 (= 3.5, the front of the face),
  // and the rest HAIR. Coverage is asserted by regroup(), which fails the build
  // if the ranges do not tile the index buffer exactly once.
  const bare = (b, n) => {
    if (n <= 0) { g(RM.HAIR, bandR(headI, SEG_HEAD, b, 1)); return; }
    const s0 = Math.round(SEG_HEAD / 4 - n / 2);
    if (s0 > 0) g(RM.HAIR, quadR(headI, SEG_HEAD, b, 0, s0));
    g(RM.SKIN, quadR(headI, SEG_HEAD, b, s0, n));
    const rest = SEG_HEAD - s0 - n;
    if (rest > 0) g(RM.HAIR, quadR(headI, SEG_HEAD, b, s0 + n, rest));
  };
  if (OLD_HAIR) {
    // The pre-2026-09-20 assignment, verbatim: band 0 skin all round, band 1
    // skin except a 77 deg nape arc, band 2 hair except the face arc.
    g(RM.SKIN, bandR(headI, SEG_HEAD, 0, 1));
    g(RM.SKIN, quadR(headI, SEG_HEAD, 1, 0, NAPE_S0_OLD));
    g(RM.HAIR, quadR(headI, SEG_HEAD, 1, NAPE_S0_OLD, NAPE_N_OLD));
    g(RM.SKIN, quadR(headI, SEG_HEAD, 1, NAPE_S0_OLD + NAPE_N_OLD,
      SEG_HEAD - NAPE_S0_OLD - NAPE_N_OLD));
  } else {
    bare(0, BARE_CHIN);   // 7 of 14 - the whole front half, ear to ear
    bare(1, BARE_JAW);    // 5 of 14 - the hair has reached the sideburn
  }
  // Band 2 is the same in both arms - hair except the 77 deg face arc - so it
  // is written once. bare(2, FACE_N) puts s0 at FACE_S0 by construction:
  // round(14/4 - 3/2) = 2.
  bare(2, FACE_N);
  // Bands 3 and above are hair the whole way round: one range, not three.
  g(RM.HAIR, [band3, headBandsEnd - band3]);
  // <<< RIDER
  g(RM.SKIN, capR(headI, SEG_HEAD, headRings, 0));
  g(RM.HAIR, capR(headI, SEG_HEAD, headRings, 1));

  // ---- arms --------------------------------------------------------------
  // Positions in body space (x forward, y up, z rider's right) so the pose
  // survives any change to the twist. Back (right) hand holds the throttle
  // out in front of the hip; front (left) arm is out and low for balance.
  // Asymmetry is what stops a figure reading as a shop dummy.
  const bp = (x, y, z) => V.add(V.add(V.add(shC, fSh.F, x), U, y), fSh.Rt, z);
  // Bone lengths come out at 0.284/0.269 and 0.291/0.263 against RIDER's
  // 0.29/0.27 - within a centimetre, which is the point of writing them out
  // rather than eyeballing an elbow.
  // sh = the root, 34 mm off the centreline and buried inside the ribcage at
  // the base of the neck; dl = the deltoid apex, which has to be its OWN point
  // on the path. Run the arm straight from the socket to the elbow and the
  // widest ring lands 0.18 m off the centreline, so the figure comes out 0.37 m
  // across the shoulders instead of RIDER.shoulderW = 0.46 - a deltoid is
  // offset from the bone, not on it. Starting the path at the NECK instead of
  // the shoulder joint is what lets the same loft carry the trapezius, so the
  // slope from neck to deltoid is one unbroken surface.
  const arms = [
    { sh: bp(-0.012, 0.012, 0.034), dl: bp(0.000, -0.035, 0.165), el: bp(0.075, -0.300, 0.196), wr: bp(0.290, -0.455, 0.150), hd: bp(0.375, -0.470, 0.128) },
    { sh: bp(-0.012, 0.012, -0.034), dl: bp(0.000, -0.035, -0.165), el: bp(-0.018, -0.292, -0.276), wr: bp(0.132, -0.418, -0.452), hd: bp(0.208, -0.452, -0.516) },
  ];
  // ONE loft per arm, shoulder socket to knuckles. The socket sits INSIDE the
  // ribcage, so the deltoid is simply the first two fat rings of the arm -
  // which is what a deltoid anatomically is, a cap over the head of the
  // humerus, not a separate lump bolted on.
  //
  // Radii are half of a measured circumference (50th-percentile adult male)
  // plus ~3 mm for neoprene: deltoid 43 cm, biceps 32 cm, elbow 27 cm,
  // forearm max 27 cm, wrist 18 cm. The old figure's 0.058 shoulder and 0.049
  // forearm were 36 cm and 31 cm - it was wearing its arms a size up, and
  // fat limbs are half of what "blocky" means on a figure.
  // The first ring is deliberately FLAT: at the neck end the section plane is
  // vertical, so rv is the vertical half-height and ru the fore-and-aft one.
  // Round it off there and the figure grows a bolster across the top of the
  // shoulders. 0.048 keeps it just under the top of the torso loft.
  const armProf = [
    [0.000, 0.075, 0.048, 2.2],          // root at the neck, inside the chest
    [0.070, 0.076, 0.058, 2.1],          // trapezius, over the top of the arm
    [0.134, 0.070, 0.069, 2.0],          // deltoid apex - widest point
    [0.190, 0.058, 0.059, 2.0],
    [0.270, 0.051, 0.052, 2.0],          // biceps / triceps
    [0.350, 0.046, 0.047, 2.0],
    [0.403, 0.042, 0.045, 2.1, 0.004],   // elbow, a touch proud at the point
    [0.462, 0.043, 0.047, 2.1, -0.004],  // flexor swell just below it
    [0.535, 0.038, 0.040, 2.1],
    [0.615, 0.031, 0.033, 2.1],
    [0.671, 0.028, 0.030, 2.2],          // wrist
    [0.710, 0.039, 0.033, 2.4],          // fist: wider than deep, squared off
    [-0.014, 0.036, 0.031, 2.4],
    [-0.001, 0.019, 0.017, 2.2],         // rounds the end - no flat disc shows
  ];
  for (const a of arms) {
    // The fist runs on along the forearm. Fingers are far below what one flat
    // colour at 3.4 m can carry, and a splayed hand would only read as noise
    // on the silhouette.
    // `front` is the way the elbow point faces; it is what tells limb() which
    // side of the arm the signed `off` rows belong on.
    const armI = m.i.length;
    limb(m, [a.sh, a.dl, a.el, a.wr, a.hd], armProf, SEG_LIMB,
      V.unit(V.sub(a.el, V.mul(V.add(a.dl, a.wr), 0.5))), 0.055);
    // Bands 0-9 are neoprene sleeve, shoulder to wrist. NEGATIVE RESULT, kept:
    // the first cut painted bands 0-1 (the trapezius and the deltoid cap) VEST
    // on the reasoning that a buoyancy aid covers the shoulder. Rendered, that
    // put an orange cap sleeve on each shoulder and, with the torso vest also a
    // band too high, the figure read as someone in a T-shirt. A buoyancy aid's
    // armhole is at the shoulder JOINT; the deltoid is bare. Both were pulled
    // back and the vest is now torso-only.
    // Bands 10-12 start at the WRIST row (d = 0.671 m) and run to the end of the
    // fist, so the hand is skin and the cuff line is a real tonal edge - which
    // is the whole of what breaks the mitt silhouette, at zero triangles.
    // MEASURED reason for spending nothing on finger geometry: at the chase
    // camera the figure is 193 px for a 1.73 m crouch = 111 px/m, so the 0.10 m
    // fist is 11 px and a finger would be under 2 px.
    const armRings = armProf.length;
    g(RM.WETSUIT, bandR(armI, SEG_LIMB, 0, 10));
    g(RM.SKIN, bandR(armI, SEG_LIMB, 10, 3));
    g(RM.WETSUIT, capR(armI, SEG_LIMB, armRings, 0));
    g(RM.SKIN, capR(armI, SEG_LIMB, armRings, 1));
  }

  // ---- legs --------------------------------------------------------------
  // Hip joints, then solve each knee. Knees bend the way the rider faces and
  // splay slightly outward, which is what a wide surf stance does.
  for (const [side, ankle, toe] of [[1, backAnkle, backToe], [-1, frontAnkle, frontToe]]) {
    const hip = V.add(V.add(hipC, fHip.Rt, side * R.hipW / 2), U, -0.020);
    const bend = V.unit(V.add(fHip.F, fHip.Rt, side * 0.24));
    const knee = jointIK(ankle, hip, bend, R.shin, R.thigh);

    // ONE loft per leg, hip socket to inside the bootie. It STARTS inboard of
    // the hip joint so its end cap stays buried in the pelvis - drawn from the
    // joint itself, the cap breaks the surface as a bright disc.
    //
    // The knee used to be a separate 0.076 m "barrel" across the joint: a
    // 48 cm knee, when a real one measures 38. Between that and the flat end
    // discs of four stacked tubes, the leg read as a string of sausages with a
    // doorknob in the middle. Now it is one surface and the knee is simply the
    // ring where the profile is narrowest before the calf.
    //
    // Radii are half of a measured circumference plus ~3 mm of neoprene:
    // upper thigh 58 cm, mid thigh 53 cm, above knee 43 cm, knee 39 cm,
    // calf max 38 cm, above the bootie 24 cm. `off` is signed toward the
    // FRONT of the knee, so the calf belly is a negative row - that is the
    // profile a leg actually has and a tube cannot express at all.
    const thighRoot = V.add(hip, V.sub(hipC, hip), 0.42);
    const kd = V.unit(V.sub(ankle, knee));
    const cuff = [ankle[0] - kd[0] * 0.03, ankle[1] - kd[1] * 0.03, ankle[2] - kd[2] * 0.03];
    const legProf = [
      [0.000, 0.093, 0.093, 2.2],
      [0.060, 0.092, 0.095, 2.2],           // gluteal fold, top of the thigh
      [0.155, 0.085, 0.088, 2.2],
      [0.250, 0.077, 0.080, 2.2],
      [0.335, 0.070, 0.072, 2.2],
      [0.400, 0.063, 0.066, 2.2, 0.005],    // patella, proud of the joint
      [0.455, 0.062, 0.067, 2.2, -0.004],
      [0.520, 0.060, 0.066, 2.2, -0.011],   // calf belly, ~1/3 down the shin
      [0.610, 0.053, 0.057, 2.2, -0.007],
      [0.700, 0.044, 0.046, 2.2, -0.002],
      [-0.045, 0.039, 0.040, 2.2],
      [-0.001, 0.036, 0.037, 2.2],          // ends inside the bootie cuff
    ];
    const legI = m.i.length;
    limb(m, [thighRoot, knee, cuff], legProf, SEG_LIMB, bend, 0.085);
    // Full-length legs, all neoprene. NOT a shorty: the reference for what a
    // rider wears here is UK coastal water - the sea off this beach runs 8-18
    // degC through the year - and every wetsuited water user in the reference
    // library (bournemouth-reference, sandbanks) is in a full suit. A shorty
    // would put two more skin regions on the calves; it is not what is worn.
    g(RM.WETSUIT, [legI, m.i.length - legI]);

    // ---- foot: a wetsuit bootie, swept heel to toe ----------------------
    // Sections are squared off (k=2.6) so the sole is flat on the deck and the
    // instep is not a balloon. Toes point across the board at the stance angle.
    const T = [Math.sin(toe), 0, Math.cos(toe)];
    const su = V.unit(V.cross([0, 1, 0], T));     // side axis
    const sv = V.cross(T, su);                     // up  (su x sv = T)
    // Cuff height 0.17 above the deck is a real 3 mm bootie, and it has to
    // reach that high anyway to swallow the bottom of the shin.
    const footSec = [
      [-0.090, 0.031, 0.048, 0.086],   // [along T, half-width, half-height, centre y]
      [-0.048, 0.045, 0.060, 0.095],   // heel
      [0.006, 0.050, 0.070, 0.100],    // ankle / cuff
      [0.070, 0.049, 0.040, 0.075],    // instep
      [0.140, 0.045, 0.026, 0.061],    // ball
      [0.186, 0.028, 0.018, 0.053],    // toe
    ];
    const footI = m.i.length;
    loft(m, footSec.map(([d, w, h, cy]) => ({
      c: [ankle[0] + T[0] * d, cy, ankle[2] + T[2] * d],
      u: su, v: sv, ru: w, rv: h, k: 2.6,
    })), SEG_FOOT);
    // The bootie is its own material only because it is its own SHEEN: 3 mm
    // neoprene with a glued rubber sole is the flattest thing on the figure,
    // and giving it the wetsuit's roughness left the two indistinguishable at
    // the ankle. Nearly the same colour, deliberately - a bootie is not a
    // second garment colour, it is the same black with no gloss.
    g(RM.BOOT, [footI, m.i.length - footI]);
  }

  // Flip first, THEN recompute normals: smoothNormals() derives them from the
  // winding, so doing it in this order is what makes them point outward.
  flipWinding(m);
  m.smoothNormals(0);
  // LAST: sort the triangles into material blocks and hand craft.js the group
  // list. regroup() throws if the ranges above do not tile the index buffer
  // exactly once, so an off-by-one in any of them fails the build rather than
  // painting some other part's triangles.
  const groups = regroup(m, grp);
  const mesh = m.build();
  mesh.groups = groups;
  return mesh;
}
