// Facade detail for the East Cliff LANDMARK buildings (tr48, 2026-09-17).
//
// coast.js draws every real building (REAL_BLD, tmp-tr39) as plain massing
// boxes with stock window quads on each part's most seaward face only. This
// adds relief on the faces a player sees from the sea, beach and pier (the
// seaward face and the two ends; landward faces are culled), for a short list
// of landmarks at x >= 227. Everything is emitted the stock way: flat quads in
// the building's own palette colour or PAL.band, proud of the wall. Offsets are
// 8-22 cm, not the stock 6: at 300-500 m from the pier 4 cm steps depth-fight
// (seen in tr48's zoom renders), so each layer clears the one behind by >= 10 cm.
//   strip  - one PAL.band opening band per storey, on a visible face that has
//            no stock windows (0.08 m proud, on the stock storey grid)
//   pier   - a full-height body-colour quad 0.22 m proud that splits the stock
//            grouped openings (and the strips) into single windows
//   lip    - a storey band: a body-colour front 0.32-0.5 m proud plus its
//            downward soffit, which the sun leaves dark, so it reads as a line
//   vstrip - a full-height PAL.band recess line (the slab tower's centre)
//   curtain- a storey-high PAL.band band per floor (a glazed end)
// Nothing here changes a colour: trap 5, every usable frame is sunlit, so the
// bodies keep their REAL_BLD palette colour. Identities, frames and per-building
// triangle costs: tmp-tr48/RESULT.md.
//
// Every element is tested against every REAL_BLD box and dropped if it would
// sit inside another part (podiums, neighbouring slices), and floors hidden
// below the crest sightline are skipped the way the stock loop skips them.

// k = building index in the tmp-tr39 table (REAL_BLD column 10)
const STYLE = {
  80: 'hotel',   // Royal Bath Hotel w119347196
  84: 'slab',    // w244302197: white slab, balcony bands, glazed seaward end
  85: 'hotel',   // Russell Court Hotel w243577799
  86: 'hotel',   // Russell-Cotes w119347194
  93: 'grid',    // w244303451: the banded block (bands + piers)
  111: 'hotel',  // Carlton Hotel w199796413
  157: 'block',  // w244304816
  160: 'block',  // w244305310, the 59 m tower
  173: 'block',  // w244306104
  183: 'hotel',  // Chine Hotel w245243024
  185: 'hotel',  // Chine Hotel West Wing w245243026
  186: 'hotel',  // Chine Hotel w245181983
};
const P_ = {
  hotel: { pierW: 1.5, lipD: 0.32, lipH: 0.24 },
  block: { pierW: 0.8, lipD: 0.32, lipH: 0.24 },
  grid: { pierW: 1.0, lipD: 0.36, lipH: 0.42 },
  slab: { pierW: 0, lipD: 0.5, lipH: 0.34 },
};

export function buildClifftopFacades(m, REAL_BLD, RS, PAL, MAT, OX, OZ, FLOOR, crestYExact, crestZExact) {
  const BODY = [PAL.white, PAL.render, PAL.cream, PAL.brick, PAL.stone];
  const V = (x, y, z, nx, ny, nz, c) => m.pushC(x + OX, y, z + OZ, nx, ny, nz, c, MAT.CONCRETE);
  const boxes = [];
  for (let q = 0; q < REAL_BLD.length; q += RS) {
    const [x, z, hu, hv, angM, gy, h, roof, rh, col, k] = REAL_BLD.slice(q, q + RS);
    const ang = angM / 1000;
    boxes.push({ x, z, hu, hv, ca: Math.cos(ang), sa: Math.sin(ang), gy, h, roof, col, k,
      ylo: gy - (gy < 4 ? 1.5 : 6), yhi: gy + h + (roof ? rh : 0) });
  }
  const inside = (px, py, pz, self) => {
    for (const b of boxes) {
      if (b === self || py <= b.ylo || py >= b.yhi) continue;
      const dx = px - b.x, dz = pz - b.z;
      if (Math.abs(dx * b.ca + dz * b.sa) < b.hu - 0.01 && Math.abs(-dx * b.sa + dz * b.ca) < b.hv - 0.01) return true;
    }
    return false;
  };
  const stats = {};
  for (const b of boxes) {
    const style = STYLE[b.k];
    if (!style) continue;
    const S = P_[style];
    const i0 = m.i.length;
    const { x, z, hu, hv, ca, sa, gy, h } = b;
    const body = BODY[b.col >> 1];
    const P = (u, v) => [x + u * ca - v * sa, z + u * sa + v * ca];
    const low = gy < 4, yT = gy + h;
    const F = [[P(-hu, hv), P(hu, hv), -sa, ca, 2 * hu], [P(hu, -hv), P(-hu, -hv), sa, -ca, 2 * hu],
      [P(hu, hv), P(hu, -hv), ca, sa, 2 * hv], [P(-hu, -hv), P(-hu, hv), -ca, -sa, 2 * hv]];
    let best = null;
    for (const f of F) if (!best || f[3] > best[3]) best = f;
    const nf = Math.max(1, Math.floor((h - 0.6) / FLOOR));
    const cy = crestYExact(x), cz = crestZExact(x);
    for (const f of F) {
      const [A, B, nx, nz, w] = f;
      if (nz < -0.45 || h < 4 || w < 3) continue;          // landward faces are never seen
      const tx = (B[0] - A[0]) / w, tz = (B[1] - A[1]) / w;
      // point on this face at along-face s, height y, d metres proud
      const pt = (s, d) => [A[0] + tx * s + nx * d, A[1] + tz * s + nz * d];
      const exposed = (s, y, d) => { const p = pt(s, d); return !inside(p[0], y, p[1], b); };
      // DEPTH ORDER IS LOAD-BEARING HERE (tmp-tr136). renderer.js:103 sets
      // depthFunc(LEQUAL) for the whole scene, so when two layers land on the
      // SAME depth value the one drawn LAST wins. At the 300-900 m these
      // buildings are seen from, the layers are 0-2 depth steps apart - the
      // 8 cm strip TIES with the wall behind it at 46-48% of distances
      // (tmp-tr136/depthsim.py, modelling renderer.js's own float32 matrix) -
      // so "last wins" decides a large share of facade pixels, and which
      // pixels tie moves whenever the projection moves.
      //
      // Emitting in ascending `d` makes the tie winner the layer that is
      // genuinely most proud, under every projection. Before this the slab's
      // vstrip (lipD + 0.05 = 0.55) was emitted BEFORE its lip (0.50) and so
      // lost every tie to a band 5 cm BEHIND it.
      //
      // This orders the layers; it does not separate them. The separation is
      // a metric offset and shrinks as 1/d^2, which no ordering can fix - see
      // tmp-tr136/RESULT.md for what does.
      const pend = [];
      const quad = (s0, s1, ya, yb, d, c) => {
        const a = pt(s0, d), e = pt(s1, d);
        pend.push([d, () => m.quad(V(a[0], ya, a[1], nx, 0, nz, c), V(e[0], ya, e[1], nx, 0, nz, c),
          V(e[0], yb, e[1], nx, 0, nz, c), V(a[0], yb, a[1], nx, 0, nz, c))]);
      };
      const soffit = (s0, s1, y, d, c) => {
        const a0 = pt(s0, 0.02), b0 = pt(s1, 0.02), b1 = pt(s1, d), a1 = pt(s0, d);
        pend.push([d, () => m.quad(V(a0[0], y, a0[1], 0, -1, 0, c), V(b0[0], y, b0[1], 0, -1, 0, c),
          V(b1[0], y, b1[1], 0, -1, 0, c), V(a1[0], y, a1[1], 0, -1, 0, c))]);
      };
      // Stable sort on `d`: equal-offset layers keep the order they were
      // written in, so nothing but the proud-ness ordering changes.
      const flushFace = () => {
        pend.map((e, i) => [e[0], i, e[1]])
          .sort((p, q) => (p[0] - q[0]) || (p[1] - q[1]))
          // setProud puts each layer in the depth tier for how proud it is, so
          // the depth buffer separates them by a fixed number of steps instead
          // of by centimetres that vanish with range (coast.js DECAL_TIER).
          // Ascending `d` still matters: two layers in the SAME tier carry the
          // same bias, so a tie between them is still settled by draw order.
          .forEach((e) => { m.setProud(e[0]); e[2](); });
        m.setProud(0);
        pend.length = 0;
      };
      const zf = (A[1] + B[1]) * 0.5;
      const sight = (low || zf > cz) ? -Infinity : cy + Math.max(0, cz - zf) * (cy - 2) / (300 - cz) - 2;
      const nwS = Math.floor((w - 1.2) / 3.1);
      const isStock = f === best && best[3] >= 0.45 && nwS >= 1;
      const pitch = nwS >= 1 ? (w - 1.2) / nwS : 0;
      // which storeys of this face are open to view (not inside a podium or a
      // neighbouring slice, not under the crest sightline)
      const open = [];
      for (let fl = 0; fl < nf; fl++) {
        const sy = gy + fl * FLOOR + 0.8, ym = sy + 0.95;
        open.push(sy + 1.9 >= sight && exposed(w * 0.5, ym, 0.05) && exposed(0.8, ym, 0.05) && exposed(w - 0.8, ym, 0.05));
      }
      const first = open.indexOf(true), last = open.lastIndexOf(true);
      if (first < 0) continue;
      const curtain = style === 'slab' && nz > 0.8;
      // 1. openings on faces the stock left blank (or a glazed end)
      if (curtain) {
        for (let fl = first; fl <= last; fl++) if (open[fl]) {
          const y0 = gy + fl * FLOOR;
          quad(0.3, w - 0.3, y0 + 0.2, Math.min(y0 + 2.85, yT - 0.5), 0.12, PAL.band);
        }
      } else if (!isStock && nwS >= 1) {
        for (let fl = first; fl <= last; fl++) if (open[fl]) {
          const sy = gy + fl * FLOOR + 0.8;
          quad(1.0, w - 1.0, sy, sy + 1.9, 0.08, PAL.band);
        }
      }
      // 2. piers: split the bands into single windows (grouped stock faces >= 14 m
      //    and the strips above; stock faces < 14 m already have single windows)
      if (!curtain && S.pierW > 0 && nwS >= 2 && (!isStock || w >= 14)) {
        const ya = gy + first * FLOOR + 0.7, yb = gy + last * FLOOR + 2.8;
        for (let j = 1; j < nwS; j++) {
          const s = 0.6 + pitch * j;
          if (!exposed(s, ya + 0.5, 0.24) || !exposed(s, yb - 0.5, 0.24)) continue;
          quad(s - S.pierW * 0.5, s + S.pierW * 0.5, ya, yb, 0.22, body);
        }
      }
      // 3. the slab tower's centre recess line
      if (style === 'slab' && !curtain && w > 30) {
        const ya = gy + first * FLOOR + 0.3, yb = yT - 0.4;
        if (exposed(w * 0.5, ya + 0.5, 0.5)) quad(w * 0.5 - 1.6, w * 0.5 + 1.6, ya, yb, S.lipD + 0.05, PAL.band);
      }
      // 4. storey bands: one per floor line, and a cornice under the roof
      const lines = [];
      for (let fl = first; fl <= last; fl++) {
        const yL = gy + (fl + 1) * FLOOR;
        if (open[fl] && yL < yT - 0.9) lines.push(yL);
      }
      lines.push(yT - 0.35);
      if (curtain) lines.length = 0;                     // a glazed end has no bands
      for (const yL of lines) {
        const ya = yL - S.lipH * 0.5, yb = yL + S.lipH * 0.5;
        if (yb < sight) continue;
        if (!exposed(0.4, yL, S.lipD) || !exposed(w - 0.4, yL, S.lipD) || !exposed(w * 0.5, yL, S.lipD)) continue;
        quad(0.15, w - 0.15, ya, yb, S.lipD, body);
        soffit(0.15, w - 0.15, ya, S.lipD, body);
      }
      flushFace();
    }
    stats[b.k] = (stats[b.k] || 0) + (m.i.length - i0) / 3;
  }
  return stats;
}
