// VIKING RAID - REAL GAPS WHERE A SECTION FALLS (tr64).
//
// Until now a burnt-out pier section was an overlay: a charred cap over a hall or a tower
// that still stood. The pier is one slice of the single coast mesh, drawn with ONE
// drawElements, and its triangles are ordered by KIND along the whole pier, so nothing can be
// skipped section by section as it stands.
//
// pier.js (// >>> RAID) tags every pier triangle with the section(s) it stands on
// (RAID_RANGES.mask). This module turns that into a PERMUTATION of the pier's own slice of
// the index buffer in which each section's above-deck triangles are one contiguous range, and
// hands craft.js / renderer.js the ranges to skip.
//
// WHY THE PERMUTATION IS APPLIED ON ENTRY AND NOT AT BUILD TIME. Reordering the built mesh
// keeps the triangle multiset and the vertex buffer bit-identical, but it flips which of two
// COPLANAR surfaces wins the depth tie: six of the 19 default views moved by 1 to 45 pixels
// (tmp-tr64/RESULT.md has the measurement). So the mesh, the index buffer and every render
// stay exactly as they were, and the permutation is uploaded to the GPU buffer on raid ENTRY
// and undone on exit. Nothing here runs, and nothing is allocated, until the raid starts.
//
// The kept bucket - everything at or below the deck, and everything off the sections - is
// never hidden, so a fallen section leaves its legs, stumps and bare deck standing in the
// water. Triangles built as one long box across several sections (the covered walkway runs)
// are only hidden when EVERY section they cross has gone.

import { RAID_RANGES } from '../gl/pier.js';

// How long after a section collapses its mesh stops being drawn. raid-mode.js hides the range
// at this moment and raid-pier.js swaps its overlay from "falling" to "ruin" at the same one,
// so the structure goes and the gap appears together, inside the dust the collapse threw up.
export const FALL_SEC = 1.7;

// Pure: mask (Int8Array, one per pier triangle) + the pier's original index slice ->
// the permuted slice and the ranges inside it. Exported so the tests can run it with no GL.
// >>> DECALTIER (tmp-tr136)
// `cls` is optional and one byte per triangle: bias tier in bits 0-2, culled in
// bit 3, must-not-cast in bit 4. With it absent this function is exactly what it
// was, which is what tmp-tr66's test asserts.
// <<< DECALTIER
export function planHide(mask, orig, i0, cls) {
  const n = mask.length, seen = new Set();
  for (let t = 0; t < n; t++) if (mask[t] > 0) seen.add(mask[t]);
  const one = [], many = [];
  for (const mk of seen) ((mk & (mk - 1)) === 0 ? one : many).push(mk);
  one.sort((a, b) => a - b); many.sort((a, b) => a - b);
  // kept first, then each section alone in section order, then the spanning groups, then the
  // visitors: with everything down the hidden ranges merge into ONE skip at the end.
  const order = [0, ...one, ...many, -1];
  const perm = new Uint32Array(orig.length);
  const range = new Map();
  let w = 0;
  // >>> DECALTIER  the second key. Class runs nest inside section runs, so the
  // section ranges below are unchanged and the class ranges are usable too.
  const keys = cls ? Array.from(new Set(cls)).sort((a, b) => a - b) : [0];
  const biased = [], culled = [], noCast = [];
  // <<< DECALTIER
  for (const want of order) {
    const start = i0 + w;
    for (const key of keys) {
      const cStart = i0 + w;
      for (let t = 0; t < n; t++) {
        if (mask[t] !== want) continue;
        if (cls && cls[t] !== key) continue;
        const b = t * 3;
        perm[w++] = orig[b]; perm[w++] = orig[b + 1]; perm[w++] = orig[b + 2];
      }
      // >>> DECALTIER
      if (key && i0 + w > cStart) {
        const tier = key & 7;
        if (tier) biased.push([cStart, i0 + w, tier]);
        if (key & 8) culled.push([cStart, i0 + w]);
        if (key & 16) noCast.push([cStart, i0 + w]);
      }
      // <<< DECALTIER
    }
    range.set(want, [start, i0 + w]);
  }
  const empty = [i0, i0];
  const NS = (RAID_RANGES.sectionS || []).length || 7;
  return {
    perm,
    sections: Array.from({ length: NS }, (_, i) => range.get(1 << i) || empty),
    shared: many.map((mk) => ({ mask: mk, range: range.get(mk) })),
    crowd: range.get(-1) || empty,
    kept: range.get(0) || empty,
    // >>> DECALTIER  the same ranges, in permuted coordinates.
    decal: { biased, culled, noCast },
    // <<< DECALTIER
  };
}

// >>> DECALTIER (tmp-tr136)
// The decal ranges, minus anything inside a section that has fallen - its mesh
// is hidden, and its decals must not come back through a second draw call.
// Class runs nest inside section runs, so a range is wholly in or wholly out;
// the clip is defensive, not load-bearing.
export function decalRanges(hidden) {
  if (!S || !S.decal) return null;
  const drop = (r) => {
    if (!hidden) return false;
    for (const h of hidden) if (r[0] >= h[0] && r[1] <= h[1]) return true;
    return false;
  };
  const f = (a) => a.filter((r) => !drop(r));
  return { biased: f(S.decal.biased), culled: f(S.decal.culled), noCast: f(S.decal.noCast) };
}
// <<< DECALTIER

let S = null;

// Read the pier slice back off the GPU, plan the permutation, keep the original to put back.
export function buildHide(coast) {
  if (S) return S;
  const R = RAID_RANGES;
  if (!R.mask || !R.pier || !coast || !coast.raidIndexRead) return null;
  const [i0, i1] = R.pier;
  let orig;
  try { orig = coast.raidIndexRead(i0, i1); } catch (e) { console.warn('[raid] index read failed:', e.message); return null; }
  if (!orig || orig.length !== i1 - i0 || orig.length !== R.mask.length * 3) return null;
  // >>> DECALTIER
  // One byte per pier triangle, from the renderer's own ranges, so the
  // permutation keeps each of them contiguous. Absent a CoastRenderer that
  // carries them (any mesh built before tmp-tr136) this stays all-zero and
  // planHide behaves exactly as it did.
  const cls = new Uint8Array(R.mask.length);
  const mark = (ranges, apply) => {
    for (const r of (ranges || [])) {
      const a = Math.max(i0, r[0]), b = Math.min(i1, r[1]);
      for (let k = a; k < b; k += 3) {
        const t = (k - i0) / 3;
        if (t >= 0 && t < cls.length) cls[t] = apply(cls[t], r);
      }
    }
  };
  mark(coast.fixedDecals, (c, r) => (c & ~7) | (r[2] & 7));
  mark(coast.culledRanges, (c) => c | 8);
  mark(coast.noCastPier, (c) => c | 16);
  S = planHide(R.mask, orig, i0, cls);
  // <<< DECALTIER
  S.i0 = i0; S.i1 = i1; S.orig = orig;
  return S;
}

export function enterHide(coast) {
  const s = buildHide(coast);
  if (s) { try { coast.raidIndexWrite(s.i0, s.perm); } catch (e) { console.warn('[raid] index swap failed:', e.message); return null; } }
  return s;
}

export function exitHide(coast) {
  if (S && coast && coast.raidIndexWrite) { try { coast.raidIndexWrite(S.i0, S.orig); } catch { /* the page is going away anyway */ } }
}

// The ranges craft.js and renderer.js skip: the visitors plus every fallen section, sorted and
// merged so touching ranges cost one draw call, not two.
export function hideRanges(down, hideCrowd = true) {
  if (!S) return null;
  let bits = 0;
  if (down) for (const i of down) bits |= 1 << i;
  const out = [];
  if (hideCrowd && S.crowd[1] > S.crowd[0]) out.push(S.crowd);
  for (let i = 0; i < S.sections.length; i++) if (bits & (1 << i)) { const r = S.sections[i]; if (r[1] > r[0]) out.push(r); }
  for (const g of S.shared) if ((g.mask & ~bits) === 0 && g.range[1] > g.range[0]) out.push(g.range);
  if (!out.length) return null;
  out.sort((a, b) => a[0] - b[0]);
  const merged = [out[0].slice()];
  for (let i = 1; i < out.length; i++) {
    const last = merged[merged.length - 1];
    if (out[i][0] <= last[1]) last[1] = Math.max(last[1], out[i][1]);
    else merged.push(out[i].slice());
  }
  return merged;
}

export function hideState() { return S; }
export function resetHide() { S = null; }
