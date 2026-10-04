/* 365 Eclipse - the 3D world (5 Oct 2026): three.js draws the land, the sea, the sky, every craft and the explosions;
 * eclipse.js draws the bullets, shots, items and the panel over the top in 2D (so they are always crisp and on top).
 *
 * The camera looks down at the play area from behind at a slant (orthographic, so nothing changes size), and every
 * object is placed so that it shows exactly where the rules say it is: a craft at height h over the game point (x, y)
 * sits at world (x - 120, h, (h * COS - (160 - y)) / SIN). The ground scrolls by moving the land group; the rules move
 * ground units with it. Shadows fall on the land from a low sun, as in the arcade games. All drawings are our own. */
import * as THREE from '../common/vendor/three-r185/three.module.min.js';
import * as MD from './models3d.js?v=1';

const SIN = 0.85, COS = 0.527, GW = 240, GH = 320;
export function wz(y, h) { return (h * COS - (160 - y)) / SIN; }
function place(o, x, y, h) { o.position.set(x - GW / 2, h, wz(y, h)); }
// screen heading a (0 = right, pi/2 = down the screen) -> a turn about the vertical for a model whose nose is -Z
function yawOf(a) { return Math.atan2(-Math.cos(a), -Math.sin(a) / SIN); }   // down the screen is +Z, stretched by 1 / SIN
function toAir(o, on) { o.traverse((c) => { if (on) c.layers.set(1); else c.layers.set(0); }); }
function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, rep, srgb) { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; }

// ---------------------------------------------------------------- textures made on the spot
function waveNormals(size, seed) {   // a tileable normal map of little waves, from a sum of sines with whole-number frequencies
  const c = canvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size), r = rnd(seed), W = [];
  for (let i = 0; i < 14; i++) W.push({ fx: Math.round(1 + r() * 7) * (r() < 0.5 ? -1 : 1), fy: Math.round(1 + r() * 9), a: 0.6 / (1 + i * 0.35), p: r() * 6.28 });
  const H = (u, v) => { let s = 0; for (const w of W) s += Math.sin((w.fx * u + w.fy * v) * Math.PI * 2 + w.p) * w.a; return s; };
  const e = 1 / size;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = i / size, v = j / size, dx = (H(u + e, v) - H(u - e, v)) * 3.2, dy = (H(u, v + e) - H(u, v - e)) * 3.2;
    const n = Math.hypot(dx, dy, 1), k = (j * size + i) * 4;
    img.data[k] = (-dx / n * 0.5 + 0.5) * 255; img.data[k + 1] = (-dy / n * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / n * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return tex(c, true, false);
}
function noiseFill(x, w, h, base, spread, seed, cell) {   // a mottled fill (sand, rock, grass)
  const r = rnd(seed); x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / (cell * cell) * 1.4; i++) { x.globalAlpha = 0.05 + r() * 0.12; x.fillStyle = r() < 0.5 ? spread[0] : spread[1]; const s = cell * (0.5 + r()); x.fillRect(r() * w, r() * h, s, s * (0.5 + r())); }
  x.globalAlpha = 1;
}
function radial(size, stops) { const c = canvas(size, size), x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach((s) => g.addColorStop(s[0], s[1])); x.fillStyle = g; x.fillRect(0, 0, size, size); return tex(c); }
function cloudTex(seed) {
  const s = 256, c = canvas(s, s), x = c.getContext('2d'), r = rnd(seed);
  for (let i = 0; i < 46; i++) {
    const a = r() * 6.28, d = r() * s * 0.28, cx = s / 2 + Math.cos(a) * d, cy = s / 2 + Math.sin(a) * d * 0.7, rr = s * (0.08 + r() * 0.14);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rr, 0, 6.3); x.fill();
  }
  return tex(c);
}
function townTex(seed) {   // the town seen from above: a street grid, pavements, and blocks of roofs and gardens
  const c = canvas(256, 512), x = c.getContext('2d'), r = rnd(seed * 13 + 1);
  x.fillStyle = '#54585c'; x.fillRect(0, 0, 256, 512);
  for (let by = 0; by < 512; by += 128) for (let bx = 0; bx < 256; bx += 128) {
    x.fillStyle = '#a8a69c'; x.fillRect(bx + 8, by + 8, 112, 112);   // pavement
    for (let i = 0; i < 6; i++) {   // plots
      const px = bx + 12 + (i % 3) * 36, py = by + 12 + ((i / 3) | 0) * 54;
      x.fillStyle = r() < 0.35 ? '#5e8a48' : ['#8c8a80', '#9a968a', '#7e7c74'][(r() * 3) | 0]; x.fillRect(px, py, 32, 50);
      if (r() < 0.4) { x.fillStyle = '#4a7a3a'; x.beginPath(); x.arc(px + 8 + r() * 16, py + 10 + r() * 30, 5 + r() * 4, 0, 6.3); x.fill(); }
    }
  }
  x.fillStyle = '#e8e0b0'; for (let y = 0; y < 512; y += 16) { x.fillRect(126, y, 3, 8); x.fillRect(254, y, 2, 8); }
  return c;
}
function strataTex() {   // bands of red and ochre rock, for the canyon walls
  const c = canvas(64, 256), x = c.getContext('2d'), r = rnd(77);
  for (let y = 0; y < 256; y += 4) { const k = r(); x.fillStyle = k < 0.33 ? '#a0603e' : k < 0.66 ? '#b87a50' : '#8a4e34'; x.fillRect(0, y, 64, 4 + r() * 6); }
  x.fillStyle = 'rgba(40,20,10,0.2)'; for (let i = 0; i < 90; i++) x.fillRect(r() * 64, r() * 256, 1 + r() * 2, 4 + r() * 18);
  return tex(c, true);
}
function roofPrism() {   // a pitched roof, 1 x 1 x 1, ridge along Z
  const g = new THREE.BufferGeometry(), v = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, 0, 1, 0.5];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex([0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4]);
  const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
}
function windows(seed, night) {   // a building face: rows of windows, some lit
  const c = canvas(64, 64), x = c.getContext('2d'), r = rnd(seed);
  x.fillStyle = night ? '#2a2f3c' : '#7c8494'; x.fillRect(0, 0, 64, 64);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { x.fillStyle = night ? (r() < 0.4 ? '#ffd98a' : '#141822') : (r() < 0.3 ? '#a8c4dc' : '#3c4656'); x.fillRect(i * 8 + 2, j * 8 + 2, 4, 5); }
  x.fillStyle = night ? '#232733' : '#6c7484'; x.fillRect(0, 0, 3, 3);   // the roof's colour, in the corner
  return tex(c, true);
}

// ---------------------------------------------------------------- the seven places
// Each: sky (background), light settings, and chunk(k) - a stretch of land CL game pixels long, numbered from the start.
// A chunk's own coordinates are the game's (x across, gy along: gy = 320 at the bottom of the first screen, going up
// towards minus); chunks live in the land group, which slides down as the ground scrolls.
const CL = 320;
function G(gx, gy, h) { return new THREE.Vector3(gx - GW / 2, h || 0, (gy - 160) / SIN); }
function track(k, gy) { return 320 - gy; }   // how far along the stage a point is
const LOOK = {
  harbour: { sky: ['#8ec5ff', '#d8ecff'], hemi: ['#cfe6ff', '#3a5a4a', 0.6], sun: ['#fff1d8', 2.0], dir: [-0.45, 1, -0.35], exp: 0.95, sea: '#16607a', seaRough: 0.16 },
  city: { sky: ['#2a2450', '#f08a5a'], hemi: ['#8a8ad0', '#3a2a3a', 0.95], sun: ['#ffb27a', 2.2], dir: [-0.8, 0.55, -0.25], exp: 1.1, night: 1 },
  desert: { sky: ['#7ab4f0', '#f4e4c4'], hemi: ['#d8e8ff', '#8a6a40', 0.6], sun: ['#fff4e0', 2.2], dir: [-0.35, 1, -0.45], exp: 0.9 },
  sky: { sky: ['#2a6ad8', '#bfe0ff'], hemi: ['#d8ecff', '#6a8ab8', 0.85], sun: ['#ffffff', 2.0], dir: [-0.4, 1, -0.3], exp: 1.0, noGround: 1 },
  arctic: { sky: ['#6a8cb0', '#e0eaf4'], hemi: ['#dfeaf8', '#4a5a6a', 0.7], sun: ['#e8f0ff', 1.7], dir: [-0.5, 0.8, -0.4], exp: 0.92, sea: '#0b2c3c', seaRough: 0.2 },
  canyon: { sky: ['#e8a060', '#ffe0b0'], hemi: ['#ffe0c0', '#5a3a2a', 0.55], sun: ['#ffd0a0', 2.2], dir: [-0.6, 0.75, -0.3], exp: 0.92 },
  orbit: { sky: ['#000005', '#02030c'], hemi: ['#3a4a6a', '#000000', 0.5], sun: ['#ffffff', 3.2], dir: [-0.6, 0.7, -0.45], exp: 1.0, noGround: 1, space: 1 }
};
function coastX(T) {   // the harbour's shore: the town on the left, the sea on the right, then open sea
  const x = 92 + Math.sin(T / 170) * 18 + Math.sin(T / 53) * 7;
  if (T < 1500) return x;
  if (T < 2100) return x - (T - 1500) / 600 * 170;
  return -80;
}

function buildChunk(id, k, M) {
  const grp = new THREE.Group(), r = rnd(k * 7919 + id.length * 31 + 5), y0 = 320 - (k + 1) * CL, y1 = 320 - k * CL;   // gy from y0 (far) to y1 (near)
  const T0 = track(k, y1), T1 = track(k, y0);
  const box = (w, h, d, mat, gx, gy, hy, ry) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.copy(G(gx, gy, hy + h / 2)); if (ry) m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; grp.add(m); return m; };
  const ground = (gx0, gx1, mat, hy, seg) => {   // a flat strip of ground across the chunk
    const pg = new THREE.PlaneGeometry(gx1 - gx0, CL / SIN, 1, seg || 1); const m = new THREE.Mesh(pg, mat);
    m.rotation.x = -Math.PI / 2; m.position.copy(G((gx0 + gx1) / 2, (y0 + y1) / 2, hy || 0)); m.receiveShadow = true; grp.add(m); return m;
  };
  if (id === 'harbour') {
    // the town: a shore line, a quay wall, roads and roofs painted on, then warehouses, cranes, containers and trees
    const pts = []; for (let i = 0; i <= 32; i++) { const gy = y1 - i * CL / 32; pts.push([coastX(track(k, gy)), gy]); }
    if (pts.some((p) => p[0] > -60)) {
      const sh = new THREE.Shape(); sh.moveTo(-80 - GW / 2, -(y1 - 160) / SIN);
      pts.forEach((p) => sh.lineTo(Math.max(-80, p[0]) - GW / 2, -(p[1] - 160) / SIN));
      sh.lineTo(-80 - GW / 2, -(y0 - 160) / SIN);
      const tc = townTex(k);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 4, bevelEnabled: false });
      g.rotateX(-Math.PI / 2); g.translate(0, -4, 0);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 160, uv.getY(i) / 320);
      const t = tex(tc, true);
      const land = new THREE.Mesh(g, [new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 }), new THREE.MeshStandardMaterial({ color: '#8c8a82', roughness: 0.9 })]);
      land.receiveShadow = true; land.castShadow = false; grp.add(land);
      // surf along the shore
      const foam = new THREE.BufferGeometry().setFromPoints(pts.map((p) => G(p[0] + 2.5, p[1], -2.6)));
      grp.add(new THREE.Line(foam, new THREE.LineBasicMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.7 })));
      // the quay: warehouses and cranes along the water, containers in stacks, houses and trees inland
      for (let i = 0; i < 6; i++) {
        const gy = y1 - (i + 0.5) * CL / 6, cx = coastX(track(k, gy));
        if (cx < 30) continue;
        if (r() < 0.55) { const w = 16 + r() * 10; box(w, 7 + r() * 5, 12 + r() * 6, M.ware[(r() * 3) | 0], cx - 14 - w / 2, gy, 0); }
        if (r() < 0.5) {   // a crane at the water's edge
          const c = box(2, 26, 2, M.crane, cx - 3, gy - 6, 0); box(2, 26, 2, M.crane, cx - 3, gy + 6, 0); box(30, 2.4, 2.4, M.crane, cx + 6, gy, 24).castShadow = true; c.castShadow = true;
        }
        for (let s = 0; s < 4; s++) if (r() < 0.6) box(9, 4.2 * (1 + ((r() * 3) | 0)), 4, M.box[(r() * 5) | 0], cx - 40 - r() * 20, gy + (r() - 0.5) * 30, 0);
        if (r() < 0.4) { const p = box(26, 1.4, 5, M.pier, cx + 13, gy + 14, -2.2); p.castShadow = false; }
      }
      for (let i = 0; i < 30; i++) {
        const gy = y0 + r() * CL, cx = coastX(track(k, gy)); const gx = -10 + r() * Math.max(4, cx - 50); if (gx > cx - 46) continue;
        if (r() < 0.4) { const t2 = new THREE.Mesh(M.treeGeo, M.tree); t2.position.copy(G(gx, gy, 3)); t2.scale.setScalar(0.7 + r() * 0.6); t2.castShadow = true; grp.add(t2); }
        else { const w = 7 + r() * 6, d = 8 + r() * 5, hh = 4 + r() * 4, ry = (r() < 0.5 ? 0 : Math.PI / 2); box(w, hh, d, M.house[(r() * 3) | 0], gx, gy, 0, ry); const rf = new THREE.Mesh(M.roofGeo, M.roofs[(r() * 4) | 0]); rf.position.copy(G(gx, gy, hh)); rf.scale.set(w + 1, 3.2, d + 1); rf.rotation.y = ry; rf.castShadow = true; rf.receiveShadow = true; grp.add(rf); }
      }
    } else if (r() < 0.6) {   // open sea: a rocky islet now and then
      const rock = new THREE.Mesh(M.rockGeo, M.rock); rock.position.copy(G(r() < 0.5 ? 14 + r() * 20 : 200 + r() * 26, y0 + r() * CL, -3)); rock.scale.set(10 + r() * 8, 5 + r() * 5, 10 + r() * 8); rock.rotation.y = r() * 6; rock.castShadow = true; rock.receiveShadow = true; grp.add(rock);
    }
  } else if (id === 'city') {
    // asphalt with avenues at x 60 and 180, cross streets, lit windows on every block
    // the canvas is 280 x 512 for the ground's -20..260 across and the chunk's 320 along (1.6 canvas pixels a game pixel)
    const tc = canvas(280, 512), tx = tc.getContext('2d'), cy = (gy) => (gy - y0) / CL * 512;
    tx.fillStyle = '#7a7a80'; tx.fillRect(0, 0, 280, 512);   // pavements; the roads are painted over them
    tx.fillStyle = '#2c2c32'; [80, 200].forEach((x) => tx.fillRect(x - 14, 0, 28, 512)); [y1 - 10, y1 - 170].forEach((g) => tx.fillRect(0, cy(g) - 10, 280, 20));
    tx.fillStyle = '#e8e0b0'; for (let y = 0; y < 512; y += 24) [80, 200].forEach((x) => tx.fillRect(x - 0.8, y, 1.6, 12));
    tx.fillStyle = '#ffffff'; [y1 - 10, y1 - 170].forEach((g) => { for (let x = 0; x < 280; x += 6) tx.fillRect(x, cy(g) - 10, 3, 2); });
    const gm = new THREE.MeshStandardMaterial({ map: tex(tc), roughness: 0.85 });
    ground(-20, 260, gm, 0);
    // the blocks: towers of glass and concrete, lower near the avenues so the tanks can be seen
    const cells = [[-18, 44], [76, 164], [196, 258]];
    for (let row = 0; row < 2; row++) {
      const gyA = y1 - row * 160 - 18, gyB = gyA - 124;
      cells.forEach(([a, b]) => {
        let x = a; while (x < b - 6) {
          const w = Math.min(b - x, 14 + r() * 16), d = 26 + r() * 50;
          let gy2 = gyA; while (gy2 - 20 > gyB) {
            const dd = Math.min(d, gy2 - gyB), h = 8 + r() * (b - a > 60 ? 30 : 18), bw = w - 3, bd = dd / SIN - 3;
            const m = box(bw, h, bd, M.towers[(r() * 4) | 0], x + w / 2, gy2 - dd / 2, 0); fixUV(m.geometry, bw, h, bd);
            box(bw - 1.5, 0.8, bd - 1.5, M.roofs2[(r() * 5) | 0], x + w / 2, gy2 - dd / 2, h);
            const roll = r(), cx2 = x + w / 2, cy2 = gy2 - dd / 2;
            if (roll < 0.12 && bw > 12) { const pd = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.4, 20), M.pad); pd.position.copy(G(cx2, cy2, h + 1)); grp.add(pd); const hm = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 0.9), M.padMark); hm.position.copy(G(cx2, cy2, h + 1.3)); grp.add(hm); }
            else if (roll < 0.24) { const wt = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 4, 10), M.tankTop); wt.position.copy(G(cx2 + bw * 0.25, cy2, h + 2.8)); wt.castShadow = true; grp.add(wt); }
            else if (roll < 0.7) { box(3, 2, 3, M.roofbox, cx2 + (r() - 0.5) * bw * 0.5, cy2, h + 0.8); box(2.5, 1.6, 2.5, M.roofbox, cx2 - (r() - 0.2) * bw * 0.4, cy2 + 6, h + 0.8); }
            if (r() < 0.15) { const l = new THREE.Mesh(M.lampGeo, M.red); l.position.copy(G(x + w / 2, gy2 - dd / 2, h + 3)); grp.add(l); }
            gy2 -= dd + 5;
          }
          x += w;
        }
      });
    }
    // street lamps along the avenues
    for (let i = 0; i < 8; i++) [44, 76, 164, 196].forEach((x) => { const l = new THREE.Mesh(M.lampGeo, M.lamp); l.position.copy(G(x, y1 - i * 40, 9)); grp.add(l); });
    for (let i = 0; i < 14; i++) {   // traffic: white lights coming, red going
      const lane = r() < 0.5 ? (r() < 0.5 ? 54 : 66) : (r() < 0.5 ? 174 : 186), gy = y0 + r() * CL, up = lane === 54 || lane === 174;
      const car = box(3.4, 1.8, 6, M.cars[(r() * 4) | 0], lane, gy, 0); car.castShadow = false;
      const hl = new THREE.Mesh(M.carLightGeo, up ? M.lamp : M.red); hl.position.copy(G(lane, gy, 1)); hl.position.z += up ? -3.2 : 3.2; grp.add(hl);
    }
  } else if (id === 'desert') {
    const tc = canvas(256, 512), tx = tc.getContext('2d');
    noiseFill(tx, 256, 512, '#d2a466', ['#b0844c', '#e8c48e'], k + 11, 8);
    for (let i = 0; i < 8; i++) { const gx = r() * 256, gy = r() * 512, gr = tx.createRadialGradient(gx, gy, 0, gx, gy, 60 + r() * 60); gr.addColorStop(0, 'rgba(120,80,40,0.22)'); gr.addColorStop(1, 'rgba(120,80,40,0)'); tx.fillStyle = gr; tx.fillRect(0, 0, 256, 512); }
    tx.strokeStyle = 'rgba(150,110,60,0.25)'; tx.lineWidth = 2; for (let i = 0; i < 30; i++) { tx.beginPath(); const yy = r() * 512; tx.moveTo(0, yy); tx.bezierCurveTo(80, yy + 20, 160, yy - 20, 256, yy + 10); tx.stroke(); }
    const base = T0 > 200 && T1 < 2400;
    if (base) {   // the air base: a runway down the middle, aprons either side
      tx.fillStyle = '#56544e'; tx.fillRect(96, 0, 64, 512); tx.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 40; i++) tx.fillRect(100 + r() * 56, r() * 512, 2 + r() * 10, 1 + r() * 3); tx.fillStyle = '#e8e8e0'; for (let y = 0; y < 512; y += 40) tx.fillRect(126, y, 4, 22);
      tx.fillRect(98, 0, 2, 512); tx.fillRect(156, 0, 2, 512);
      tx.fillStyle = 'rgba(160,156,146,0.85)'; tx.fillRect(14, 0, 70, 512); tx.fillRect(172, 0, 70, 512);
    }
    const gm = new THREE.MeshStandardMaterial({ map: tex(tc), roughness: 0.95 });
    ground(-20, 260, gm, 0);
    for (let i = 0; i < 10; i++) { const gy = y0 + r() * CL, gx = r() < 0.5 ? r() * 14 : 226 + r() * 14; if (r() < 0.5) { const rk = new THREE.Mesh(M.rockGeo, M.sandrock); rk.position.copy(G(gx, gy, 0)); rk.scale.set(5 + r() * 6, 3 + r() * 4, 5 + r() * 6); rk.castShadow = true; grp.add(rk); } }
    if (base) {
      for (let i = 0; i < 3; i++) { const gy = y0 + 40 + r() * (CL - 80); const side = r() < 0.5 ? 6 : 234; [0, 1, 2].forEach((j) => { const tk = new THREE.Mesh(M.tankGeo, M.fuel); tk.position.copy(G(side, gy + j * 13, 4.5)); tk.castShadow = true; tk.receiveShadow = true; grp.add(tk); }); }
      if (r() < 0.5) { const tw = box(8, 22, 8, M.tower, r() < 0.5 ? 6 : 234, y0 + CL / 2, 0); box(12, 5, 12, M.glassbox, tw.position.x + GW / 2, y0 + CL / 2, 22); }
    }
  } else if (id === 'arctic') {
    // ice floes on the dark sea; snowy shelves along both edges
    [[-6, 30], [246, 30]].forEach(([x, w]) => {
      const dir = x < 120 ? 1 : -1, wg = new THREE.BoxGeometry(w, 14, CL / SIN, 3, 4, 16), p = wg.attributes.position;
      for (let i = 0; i < p.count; i++) { const n = Math.sin(p.getZ(i) * 0.07 + k * 5) * 5 + Math.sin(p.getZ(i) * 0.23) * 2; if (p.getX(i) * dir > 0) p.setX(i, p.getX(i) + n * dir); }
      wg.computeVertexNormals();
      const wm = new THREE.Mesh(wg, M.snow); wm.position.copy(G(x, (y0 + y1) / 2, 4)); wm.castShadow = true; wm.receiveShadow = true; grp.add(wm);
    });
    for (let i = 0; i < 10; i++) {
      const gy = y0 + r() * CL, gx = 30 + r() * 180, s = 6 + r() * 16, pts = [];
      for (let j = 0; j < 7; j++) { const a = j / 7 * 6.28, rr = s * (0.6 + r() * 0.5); pts.push(new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr)); }
      const fg = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 1.6, bevelEnabled: false }); fg.rotateX(-Math.PI / 2);
      const fl = new THREE.Mesh(fg, M.ice); fl.position.copy(G(gx, gy, -3)); fl.receiveShadow = true; grp.add(fl);
    }
    if (r() < 0.7) { const b = new THREE.Mesh(M.bergGeo, M.berg); b.position.copy(G(r() < 0.5 ? 30 + r() * 30 : 180 + r() * 30, y0 + r() * CL, -3)); b.scale.set(10 + r() * 8, 8 + r() * 10, 10 + r() * 8); b.rotation.y = r() * 6; b.castShadow = true; b.receiveShadow = true; grp.add(b); }

  } else if (id === 'canyon') {
    // the canyon floor, the river down the middle, the walls at the edges, a bridge now and then
    const tc = canvas(256, 512), tx = tc.getContext('2d');
    noiseFill(tx, 256, 512, '#b07a52', ['#8a5a3a', '#cc966a'], k + 21, 10);
    tx.fillStyle = 'rgba(70,40,25,0.35)'; for (let i = 0; i < 40; i++) tx.fillRect(r() * 256, r() * 512, 2 + r() * 8, 1);
    ground(-20, 260, new THREE.MeshStandardMaterial({ map: tex(tc), roughness: 0.95 }), 0);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(52, CL / SIN), M.riverW); river.rotation.x = -Math.PI / 2; river.position.copy(G(120, (y0 + y1) / 2, 0.25)); river.receiveShadow = true; grp.add(river);
    [93.5, 146.5].forEach((x) => { const bank = new THREE.Mesh(new THREE.BoxGeometry(3, 1, CL / SIN), M.bank); bank.position.copy(G(x, (y0 + y1) / 2, 0.4)); grp.add(bank); });
    [[-6, 30], [246, 30]].forEach(([x, w]) => {   // the walls: rough rock, high at the very edges
      const dir = x < 120 ? 1 : -1, wg = new THREE.BoxGeometry(w, 56, CL / SIN, 3, 8, 16), p = wg.attributes.position;
      for (let i = 0; i < p.count; i++) { const n = Math.sin(p.getZ(i) * 0.09 + k * 3) * 4 + Math.sin(p.getZ(i) * 0.31 + p.getY(i) * 0.2) * 2 - p.getY(i) * 0.08; if (p.getX(i) * dir > 0) p.setX(i, p.getX(i) + n * dir); }
      wg.computeVertexNormals();
      const uvw = wg.attributes.uv; for (let i = 0; i < uvw.count; i++) uvw.setXY(i, p.getZ(i) / 60, p.getY(i) / 56);
      const wm = new THREE.Mesh(wg, M.strata); wm.position.copy(G(x, (y0 + y1) / 2, 28)); wm.castShadow = true; wm.receiveShadow = true; grp.add(wm);
    });
    if (r() < 0.7) { const gy = y0 + 60 + r() * (CL - 120); box(70, 3, 9, M.bridge, 120, gy, 3); box(70, 3, 1, M.bridgeRail, 120, gy - 4, 6); box(70, 3, 1, M.bridgeRail, 120, gy + 4, 6); }
    for (let i = 0; i < 4; i++) { const rk = new THREE.Mesh(M.rockGeo, M.cliff); rk.position.copy(G(r() < 0.5 ? 6 + r() * 10 : 224 + r() * 10, y0 + r() * CL, 0)); rk.scale.set(6 + r() * 6, 6 + r() * 12, 6 + r() * 6); rk.castShadow = true; grp.add(rk); }
  } else if (id === 'orbit') {
    // the station: a lattice of girders, plating and lights, with the Earth showing between
    for (let i = 0; i < 4; i++) {
      const gy = y1 - i * 80 - 40;
      const beam = box(260, 3, 5, M.girder, 120, gy, -3); beam.castShadow = true;
      for (let x = 10; x < 240; x += 40) { box(18, 1.2, 18, M.plate, x + (i % 2) * 20, gy, -2.4); const l = new THREE.Mesh(M.lampGeo, M.blue); l.position.copy(G(x + (i % 2) * 20, gy, 0)); grp.add(l); }
    }
    [16, 224].forEach((x) => box(5, 3, CL / SIN, M.girder, x, (y0 + y1) / 2, -3));
    for (let i = 0; i < 3; i++) if (r() < 0.6) { const gy = y0 + r() * CL; const sp = box(40, 0.6, 22, M.solar, r() < 0.5 ? -6 : 246, gy, -1); sp.castShadow = true; }
  }
  return grp;
}
function fixUV(g, w, h, d) {   // repeat the window pattern by the face's real size; the roof shows the plain corner
  const uv = g.attributes.uv, faces = [[d, h], [d, h], [0, 0], [0, 0], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; if (f === 2 || f === 3) uv.setXY(i, 0.02, 0.98); else uv.setXY(i, uv.getX(i) * faces[f][0] / 10, uv.getY(i) * faces[f][1] / 8); }
  uv.needsUpdate = true;
}

// ---------------------------------------------------------------- the world
export function createWorld() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }); }
  catch (e) { return null; }
  if (!renderer.getContext()) return null;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(1);
  renderer.shadowMap.autoUpdate = false;   // made once a picture, before the first of its two passes
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-GW / 2, GW / 2, GH / 2, -GH / 2, 1, 4000);
  camera.position.set(0, SIN * 1500, COS * 1500); camera.lookAt(0, 0, 0);
  const hemi = new THREE.HemisphereLight('#ffffff', '#444444', 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 2.5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6; sun.shadow.radius = 2.5;
  Object.assign(sun.shadow.camera, { left: -300, right: 300, top: 300, bottom: -300, near: 10, far: 2000 });
  sun.shadow.camera.layers.enableAll();   // the shadows come from the land AND the air
  sun.layers.enableAll(); hemi.layers.enableAll();   // and the lights light both passes
  scene.add(sun); scene.add(sun.target);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const land = new THREE.Group(), ents = new THREE.Group(), fxg = new THREE.Group(), backg = new THREE.Group();
  scene.add(backg); scene.add(land); scene.add(ents); scene.add(fxg);
  const fxLayer = () => toAir(fxg, true);

  // shared materials and shapes for the scenery
  const S = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    ware: [S({ color: '#a8907a', roughness: 0.8 }), S({ color: '#7d8a96', roughness: 0.7 }), S({ color: '#b8a080', roughness: 0.8 })],
    crane: S({ color: '#e8a020', roughness: 0.5, metalness: 0.4 }), pier: S({ color: '#6e6a62', roughness: 0.9 }),
    box: ['#c8402a', '#2a6ac8', '#e8c030', '#3a8a4a', '#d8d8d0'].map((c) => S({ color: c, roughness: 0.6, metalness: 0.2 })),
    house: [S({ color: '#e8dcc8', roughness: 0.9 }), S({ color: '#d8c8b0', roughness: 0.9 }), S({ color: '#f0e8dc', roughness: 0.9 })],
    roofs: ['#b4553a', '#8a4a3a', '#5a5e66', '#c8703a'].map((c) => S({ color: c, roughness: 0.75 })), roofGeo: roofPrism(),
    roofs2: ['#9aa0aa', '#a89e90', '#8890a0', '#b0a89c', '#6a8a5a'].map((c) => S({ color: c, roughness: 0.8 })), pad: S({ color: '#3a3e44', roughness: 0.7 }), padMark: new THREE.MeshBasicMaterial({ color: '#f0d040' }), tankTop: S({ color: '#8a6a4a', roughness: 0.8 }), walk: S({ color: '#6c6c72', roughness: 0.9 }),
    cars: ['#c83a2a', '#e8e8e0', '#2a4a8a', '#1a1a1e'].map((c) => S({ color: c, roughness: 0.4, metalness: 0.5 })), carLightGeo: new THREE.BoxGeometry(2.6, 0.6, 0.6), red: new THREE.MeshBasicMaterial({ color: '#ff3a2a' }),
    strata: S({ map: strataTex(), roughness: 0.95 }),
    tree: S({ color: '#3a6a34', roughness: 0.9 }), treeGeo: new THREE.IcosahedronGeometry(4, 0),
    rock: S({ color: '#6a6a64', roughness: 0.95, flatShading: true }), rockGeo: new THREE.IcosahedronGeometry(1, 1),
    towers: [0, 1, 2, 3].map((i) => S({ map: windows(40 + i, true), emissiveMap: windows(40 + i, true), emissive: '#ffd8a0', emissiveIntensity: 1.4, roughness: 0.4, metalness: 0.4 })),
    roofbox: S({ color: '#6a6e78', roughness: 0.6 }), lamp: new THREE.MeshBasicMaterial({ color: '#ffd8a0' }), lampGeo: new THREE.SphereGeometry(1.2, 6, 4),
    sandrock: S({ color: '#b08a5a', roughness: 0.95, flatShading: true }), fuel: S({ color: '#e8e8e0', roughness: 0.4, metalness: 0.5 }), tankGeo: new THREE.CylinderGeometry(5, 5, 9, 16),
    tower: S({ color: '#c8c0b0', roughness: 0.8 }), glassbox: S({ color: '#2a4a6a', roughness: 0.1, metalness: 0.8 }),
    snow: S({ color: '#eef4fa', roughness: 0.7 }), ice: S({ color: '#dce9f4', roughness: 0.35, metalness: 0.05 }), cliffice: S({ color: '#c8d8e8', roughness: 0.6 }),
    berg: S({ color: '#e4f0fa', roughness: 0.3, flatShading: true }), bergGeo: new THREE.IcosahedronGeometry(1, 1),
    cliff: S({ color: '#9a6a48', roughness: 0.95, flatShading: true }), river: S({ color: '#2a6a7a', roughness: 0.15, metalness: 0.1 }), bank: S({ color: '#7a5a3a', roughness: 1 }),
    bridge: S({ color: '#6a6e72', roughness: 0.7, metalness: 0.3 }), bridgeRail: S({ color: '#c8402a', roughness: 0.6 }),
    girder: S({ color: '#8a909c', roughness: 0.5, metalness: 0.7 }), plate: S({ color: '#5a606c', roughness: 0.6, metalness: 0.6 }), solar: S({ color: '#1d3a7a', roughness: 0.2, metalness: 0.6 }),
    blue: new THREE.MeshBasicMaterial({ color: '#7fd8ff' })
  };
  // the sea (a big sheet under everything, its waves moving with the land)
  const seaNorm = waveNormals(256, 7);
  const riverNorm = waveNormals(128, 19); riverNorm.repeat.set(0.6, 1.5);
  const riverMat = new THREE.MeshStandardMaterial({ color: '#1e5a68', roughness: 0.12, metalness: 0.05, normalMap: riverNorm, normalScale: new THREE.Vector2(0.7, 0.7) }); riverMat.userData.keep = true; M.riverW = riverMat;
  seaNorm.repeat.set(3, 4);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 1400), S({ color: '#1b6a84', roughness: 0.16, metalness: 0.0, normalMap: seaNorm, normalScale: new THREE.Vector2(0.9, 0.9) }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -3, 0); sea.receiveShadow = true; scene.add(sea);
  // clouds: a deep layer for the sky stage, and a few drifting high over everything elsewhere
  const cloudMats = [0, 1, 2].map((i) => new THREE.MeshStandardMaterial({ map: cloudTex(91 + i), transparent: true, depthWrite: false, roughness: 1, opacity: 1 }));
  const cloudGeo = new THREE.PlaneGeometry(1, 1);
  const highCloud = new THREE.MeshBasicMaterial({ map: cloudMats[1].map, transparent: true, depthWrite: false, opacity: 0.32 });
  const clouds = [];   // { mesh, layer, gx, T }
  let cloudId = 0;

  // ---------------------------------------------------------------- stage set-up
  let stageId = '', chunks = new Map(), look = LOOK.harbour, earth = null, starPts = null, corona = null;
  function setStage(id) {
    stageId = id; look = LOOK[id] || LOOK.harbour;
    chunks.forEach((c) => disposeGroup(c)); chunks.clear(); SCORCH.forEach((q) => { q.m.visible = false; });
    clouds.forEach((c) => scene.remove(c.mesh)); clouds.length = 0;
    backg.clear(); earth = null; starPts = null; corona = null;
    const env = canvas(256, 128), ex = env.getContext('2d'), eg = ex.createLinearGradient(0, 0, 0, 128);
    eg.addColorStop(0, look.sky[0]); eg.addColorStop(0.5, look.sky[1]); eg.addColorStop(1, look.space ? '#000' : '#4a4a48');
    ex.fillStyle = eg; ex.fillRect(0, 0, 256, 128);
    const et = tex(env); et.mapping = THREE.EquirectangularReflectionMapping;
    if (scene.environment) scene.environment.dispose();
    scene.environment = pmrem.fromEquirectangular(et).texture; et.dispose();
    const bg = canvas(4, 64), bx = bg.getContext('2d'), bgr = bx.createLinearGradient(0, 0, 0, 64); bgr.addColorStop(0, look.sky[0]); bgr.addColorStop(1, look.sky[1]); bx.fillStyle = bgr; bx.fillRect(0, 0, 4, 64);
    scene.background = tex(bg);
    hemi.color.set(look.hemi[0]); hemi.groundColor.set(look.hemi[1]); hemi.intensity = look.hemi[2];
    sun.color.set(look.sun[0]); sun.intensity = look.sun[1];
    const d = new THREE.Vector3(look.dir[0], look.dir[1], look.dir[2]).normalize();
    sun.position.copy(d.multiplyScalar(900)); sun.target.position.set(0, 0, 0);
    renderer.toneMappingExposure = look.exp;
    sea.visible = !!look.sea; if (look.sea) { sea.material.color.set(look.sea); sea.material.roughness = look.seaRough; }
    if (id === 'sky') for (let i = 0; i < 26; i++) addCloud(i * 37 % 240, -i * 60 + 300, i % 3 === 0 ? 1 : 0);
    else if (id !== 'orbit' && id !== 'city') for (let i = 0; i < 5; i++) addCloud((i * 97) % 240, -i * 300 + 200, 2);   // a few thin clouds passing high over everything
    if (id === 'orbit') {
      // the Earth far below (its blue curve fills the lower screen), the stars, and the eclipse: the moon over the sun
      const ec = canvas(512, 256), x2 = ec.getContext('2d'), rr = rnd(5);
      x2.fillStyle = '#123a7a'; x2.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 60; i++) { x2.fillStyle = r2(rr, ['#3a7a3a', '#6a8a4a', '#b8a070']); x2.beginPath(); x2.ellipse(rr() * 512, 40 + rr() * 176, 10 + rr() * 50, 6 + rr() * 26, rr() * 3, 0, 6.3); x2.fill(); }
      for (let i = 0; i < 120; i++) { x2.fillStyle = 'rgba(255,255,255,' + (0.2 + rr() * 0.5) + ')'; x2.beginPath(); x2.ellipse(rr() * 512, rr() * 256, 8 + rr() * 40, 2 + rr() * 6, rr() * 0.4, 0, 6.3); x2.fill(); }
      earth = new THREE.Mesh(new THREE.SphereGeometry(900, 72, 36), S({ map: tex(ec), roughness: 0.8 }));
      earth.position.set(0, -1765, 0); backg.add(earth);   // its outline's top shows about 190 game pixels down the screen
      const atm = new THREE.Mesh(new THREE.SphereGeometry(922, 72, 36), new THREE.MeshBasicMaterial({ color: '#4aa0ff', transparent: true, opacity: 0.3, side: THREE.BackSide, depthWrite: false }));
      atm.position.copy(earth.position); backg.add(atm);
      const sp = new THREE.BufferGeometry(), pos = []; const rs = rnd(9);
      for (let i = 0; i < 700; i++) { const v = -200 + rs() * 380, Y = -600; pos.push((rs() - 0.5) * 300, Y, (COS * Y - v) / SIN); }
      sp.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      starPts = new THREE.Points(sp, new THREE.PointsMaterial({ color: '#ffffff', size: 1.4, sizeAttenuation: false })); backg.add(starPts);
      corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial(256, [[0, 'rgba(0,0,0,1)'], [0.36, 'rgba(0,0,0,1)'], [0.4, 'rgba(255,250,230,1)'], [0.5, 'rgba(255,200,150,0.6)'], [0.75, 'rgba(255,120,160,0.15)'], [1, 'rgba(0,0,0,0)']]), depthWrite: false }));
      corona.scale.set(150, 150, 1); place(corona, 170, 70, -300); backg.add(corona);
    }
  }
  function r2(r, list) { return list[(r() * list.length) | 0]; }
  function addCloud(gx, T, deep) {
    const m = new THREE.Mesh(cloudGeo, cloudMats[cloudId++ % 3]); m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
    const high = deep === 2, s = deep === 1 ? 220 : high ? 170 : 140; m.scale.set(s, s, 1);
    if (high) { m.material = highCloud; m.receiveShadow = false; m.layers.set(1); }
    scene.add(m); clouds.push({ mesh: m, gx: gx, T: T, h: deep === 1 ? -90 : high ? 118 : -20, speed: deep === 1 ? 0.65 : high ? 1.6 : 1 });
  }
  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
      [].concat(o.material || []).forEach((m) => { if (!m.userData.keep) { if (m.map) m.map.dispose(); m.dispose(); } });
    });
    land.remove(g);
  }
  Object.values(M).forEach((v) => { if (v && v.isMaterial) v.userData.keep = true; if (Array.isArray(v)) v.forEach((m) => { if (m.isMaterial) m.userData.keep = true; }); if (v && v.isBufferGeometry) v.userData.keep = true; });

  function updateLand(dist) {
    land.position.z = dist / SIN;
    if (look.noGround) return;
    const kmin = Math.max(0, Math.floor((dist - 100) / CL)), kmax = Math.floor((dist + 420) / CL) + 1;
    for (const [k, g] of chunks) if (k < kmin - 1 || k > kmax) { disposeGroup(g); chunks.delete(k); }
    for (let k = kmin; k <= kmax; k++) if (!chunks.has(k)) { const g = buildChunk(stageId, k, M); land.add(g); chunks.set(k, g); }
  }

  // ---------------------------------------------------------------- the craft: one model per thing in the rules
  const proto = new Map(), live = new Map(), pools = new Map();
  const flashMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  function protoOf(key, make) { let p = proto.get(key); if (!p) { p = make(); proto.set(key, p); } return p; }
  function take(key, make) {
    const pool = pools.get(key);
    if (pool && pool.length) { const o = pool.pop(); o.visible = true; return o; }
    const o = protoOf(key, make).clone(); o.userData.key = key; o.rotation.order = 'YXZ';
    o.traverse((c) => { if (c.isMesh) { c.userData.mat = c.material; } });
    return o;
  }
  function give(o) { o.visible = false; ents.remove(o); let pool = pools.get(o.userData.key); if (!pool) pools.set(o.userData.key, pool = []); if (pool.length < 40) pool.push(o); }
  function flash(o, on) { o.traverse((c) => { if (c.isMesh && c.userData.mat && c.userData.mat !== MD.materials().glow && !c.material.transparent) c.material = on ? flashMat : c.userData.mat; }); }
  function altOf(e) {
    if (e.type === 'rocket') return MD.HEIGHT.rocket;
    if (e.ground) return e.sea ? (e.under ? -12 : -3) : 0;
    if (e.type === 'heli') return MD.HEIGHT.heli; if (e.type === 'bomber' || e.type === 'carrier' || e.type === 'gunship') return MD.HEIGHT.bomber; if (e.type === 'mid') return MD.HEIGHT.mid;
    return MD.HEIGHT.air;
  }
  let player = null, playerId = '', wings = [], bossObj = null, bossKind = '';
  function syncEnemies(W) {
    const seen = new Set();
    for (const e of W.enemies) {
      seen.add(e.id);
      let o = live.get(e.id);
      if (!o) {
        const key = e.type + '|' + (e.look || '');
        o = take(key, () => MD.enemy(e.type, e.look)); ents.add(o); live.set(e.id, o); toAir(o, !e.ground);
        o.userData.ang = e.ang; o.userData.h = altOf(e); o.userData.bank = 0;
      }
      const h = altOf(e);
      o.userData.h += (h - o.userData.h) * 0.08;   // a submarine rises and sinks
      place(o, e.x, e.y, o.userData.h);
      // which way it points; air craft bank into their turns
      let da = Math.atan2(Math.sin(e.ang - o.userData.ang), Math.cos(e.ang - o.userData.ang));
      o.userData.ang += da * 0.25; o.userData.bank += (Math.max(-0.8, Math.min(0.8, da * 6)) - o.userData.bank) * 0.15;
      o.rotation.y = yawOf(o.userData.ang); o.rotation.z = e.ground ? 0 : -o.userData.bank;
      o.traverse((c) => {
        if (c.name === 'turret') c.rotation.y = yawOf(e.tur) - o.rotation.y;
        else if (c.name === 'rotor') c.rotation.y += 0.55; else if (c.name === 'rotor2') c.rotation.x += 0.9; else if (c.name === 'prop') c.rotation.z += 0.8;
        else if ((c.name === 'g0' || c.name === 'g1')) c.rotation.y = yawOf(e.tur) - o.rotation.y;
      });
      flash(o, e.flash > 0);
    }
    for (const [id, o] of live) if (!seen.has(id)) { live.delete(id); flash(o, false); give(o); }
  }
  function syncPlayer(W, t) {
    const p = W.p;
    if (playerId !== W.shipId) { if (player) ents.remove(player); player = MD.fighter(W.shipId); player.rotation.order = 'YXZ'; toAir(player, true); ents.add(player); playerId = W.shipId; wings.forEach((w) => ents.remove(w)); wings = []; }
    const blink = p.inv > 0 && p.inv < 400 && (p.inv >> 2) & 1;
    player.visible = !p.dead && !W.over && !blink;
    place(player, p.x, p.y, MD.HEIGHT.player);
    player.userData.bank = (player.userData.bank || 0) + ((-p.vx / (W.ship.speed || 2)) * 0.6 - (player.userData.bank || 0)) * 0.2;
    player.rotation.set(0, 0, player.userData.bank); player.rotation.x = (p.vy < 0 ? 0.08 : p.vy > 0 ? -0.06 : 0);
    while (wings.length < p.wing.length) { const w = MD.wingman(W.shipId); w.rotation.order = 'YXZ'; toAir(w, true); ents.add(w); wings.push(w); }
    while (wings.length > p.wing.length) ents.remove(wings.pop());
    wings.forEach((w, i) => { w.visible = !p.dead; place(w, p.wing[i].x, p.wing[i].y, MD.HEIGHT.wing); w.rotation.z = player.userData.bank * 0.8; });
  }
  function syncBoss(W, t) {
    const B = W.boss;
    if (!B) { if (bossObj) { ents.remove(bossObj); bossObj = null; bossKind = ''; } return; }
    if (bossKind !== B.kind) { if (bossObj) ents.remove(bossObj); bossObj = MD.boss(B.kind); toAir(bossObj, !B.ground); ents.add(bossObj); bossKind = B.kind; bossObj.traverse((c) => { if (c.isMesh) c.userData.mat = c.material; }); }
    const h = B.sea ? -3 + (B.kind === 'kraken' ? Math.min(0, -14 + (190 - B.enter) * 0.09) : 0) : B.ground ? 0 : MD.HEIGHT.boss;
    const shake = B.dead ? (Math.random() - 0.5) * 3 : 0;
    place(bossObj, B.x + shake, B.y + shake, h);
    if (B.kind === 'citadel') bossObj.rotation.y = 0;
    else if (!B.sea && !B.ground) { bossObj.rotation.z = Math.sin(B.t / 120) * 0.05; }
    B.parts.forEach((q) => {
      const c = bossObj.getObjectByName(q.id); if (!c) return;
      if (B.kind === 'eclipse' && !q.core) c.position.set(q.x - B.x, 0, (q.y - B.y) / SIN);
      if (q.core && B.kind === 'eclipse') c.rotation.y += 0.01;
      else if (!q.core || B.kind === 'colossus' || B.kind === 'citadel') c.rotation.y = yawOf(q.tur) - bossObj.rotation.y;
      if (c.getObjectByName('rotor')) c.getObjectByName('rotor').rotation.y += 0.35;
      const dead = !q.alive;
      c.traverse((m) => { if (m.isMesh && m.userData.mat) m.material = dead ? MD.materials().wreck : (q.flash > 0 && !m.material.transparent ? flashMat : m.userData.mat); });
      if (dead && c.userData.part && W.frame % 9 === 0) smoke(c.getWorldPosition(new THREE.Vector3()), 3, 60);
    });
  }

  // ---------------------------------------------------------------- explosions: fire, smoke, flying pieces, scorch marks, a flash of light
  const fireTex = radial(128, [[0, 'rgba(255,255,240,1)'], [0.25, 'rgba(255,220,120,0.95)'], [0.55, 'rgba(255,110,30,0.6)'], [1, 'rgba(120,20,0,0)']]);
  const smokeTex = radial(128, [[0, 'rgba(60,58,56,0.85)'], [0.6, 'rgba(50,48,46,0.45)'], [1, 'rgba(40,40,40,0)']]);
  const scorchTex = radial(128, [[0, 'rgba(10,8,6,0.85)'], [0.55, 'rgba(20,16,12,0.55)'], [1, 'rgba(0,0,0,0)']]);
  const FIRE = [], SMOKE = [], DEB = [], SCORCH = [], RINGS = [], LIGHTS = [];
  for (let i = 0; i < 90; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.visible = false; fxg.add(s); FIRE.push({ s, life: 0 }); }
  for (let i = 0; i < 70; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, depthWrite: false, transparent: true })); s.visible = false; fxg.add(s); SMOKE.push({ s, life: 0 }); }
  const debGeo = new THREE.BoxGeometry(1, 0.5, 1.6), debMat = new THREE.MeshStandardMaterial({ color: '#3a3a3c', roughness: 0.6, metalness: 0.5 });
  for (let i = 0; i < 100; i++) { const m = new THREE.Mesh(debGeo, debMat); m.visible = false; m.castShadow = true; fxg.add(m); DEB.push({ m, life: 0, v: new THREE.Vector3(), r: new THREE.Vector3() }); }
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: scorchTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; land.add(m); SCORCH.push({ m, n: 0 }); }
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color: '#ffe8c0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.visible = false; fxg.add(m); RINGS.push({ m, life: 0 }); }
  for (let i = 0; i < 4; i++) { const l = new THREE.PointLight('#ffb060', 0, 160, 1.6); fxg.add(l); LIGHTS.push({ l, life: 0 }); }
  fxLayer(); LIGHTS.forEach((L) => L.l.layers.enableAll());   // the explosions draw over everything (the lights still light both passes: lights ignore layers)
  let scorchN = 0;
  let landV = 0, groundFx = false;   // how far the land moves each step (world z), and whether the blast being made is on the ground
  function fire(pos, size, life, vel) { const f = FIRE.find((q) => q.life <= 0) || FIRE[(Math.random() * FIRE.length) | 0]; f.s.visible = true; f.s.position.copy(pos); f.life = f.max = life; f.size = size; f.v = vel || new THREE.Vector3(); f.g = groundFx; f.s.material.rotation = Math.random() * 6; }
  function smoke(pos, size, life) { const f = SMOKE.find((q) => q.life <= 0); if (!f) return; f.s.visible = true; f.s.position.copy(pos); f.life = f.max = life; f.size = size; f.g = groundFx; f.s.material.rotation = Math.random() * 6; }
  function boom(x, y, size, ground, wet) {
    groundFx = !!ground;
    const h = ground ? 2 : MD.HEIGHT.air, base = new THREE.Vector3(x - GW / 2, h, wz(y, h));
    const n = size >= 3 ? 18 : size === 2 ? 11 : 6, s = size >= 3 ? 32 : size === 2 ? 19 : 11;
    for (let i = 0; i < n; i++) { const o = new THREE.Vector3((Math.random() - 0.5) * s * 0.9, (Math.random() - 0.3) * s * 0.5, (Math.random() - 0.5) * s * 0.9); fire(base.clone().add(o), s * (0.6 + Math.random() * 0.7), 22 + Math.random() * 18 + size * 6, o.clone().multiplyScalar(0.03)); }
    for (let i = 0; i < n * 0.7; i++) smoke(base.clone().add(new THREE.Vector3((Math.random() - 0.5) * s, Math.random() * s * 0.4, (Math.random() - 0.5) * s)), s * (0.8 + Math.random() * 0.6), 60 + Math.random() * 50);
    for (let i = 0; i < n * 1.4; i++) { const d = DEB.find((q) => q.life <= 0); if (!d) break; d.m.visible = true; d.m.position.copy(base); const a = Math.random() * 6.28, v = (0.4 + Math.random() * 1.4) * (size >= 3 ? 1.6 : 1); d.v.set(Math.cos(a) * v, 0.6 + Math.random() * 1.6, Math.sin(a) * v); d.r.set(Math.random() * 0.4, Math.random() * 0.4, Math.random() * 0.4); d.life = 70 + Math.random() * 40; d.m.scale.setScalar(0.6 + Math.random() * (size >= 2 ? 2.2 : 1)); }
    if (wet) { const rg = RINGS.find((q) => q.life <= 0); if (rg) { rg.m.visible = true; rg.m.position.set(base.x, -2.5, base.z); rg.life = rg.max = 40; rg.size = s * 2.2; } }   // on the sea: a ring of foam, no scorch
    else if (ground) { const sc = SCORCH[scorchN++ % SCORCH.length]; sc.m.visible = true; sc.m.position.set(base.x, 0.15 + (scorchN % 10) * 0.01, base.z - land.position.z); sc.m.scale.setScalar(s * 1.6); }
    if (size >= 2) { const rg = RINGS.find((q) => q.life <= 0); if (rg) { rg.m.visible = true; rg.m.position.set(base.x, ground ? 1 : h, base.z); rg.life = rg.max = 26; rg.size = s * 3; } }
    groundFx = false;
    const L = LIGHTS.find((q) => q.life <= 0) || LIGHTS[0]; L.l.position.copy(base).add(new THREE.Vector3(0, 12, 0)); L.life = L.max = size >= 3 ? 30 : 16; L.peak = size >= 3 ? 600 : size === 2 ? 260 : 110; L.l.color.set(size >= 3 ? '#ffd080' : '#ff9a50');
  }
  function stepFx(dist) {
    FIRE.forEach((f) => { if (f.life <= 0) return; f.life--; const k = 1 - f.life / f.max; f.s.position.add(f.v); if (f.g) f.s.position.z += landV; f.s.scale.setScalar(f.size * (0.5 + Math.sqrt(k) * 0.9)); f.s.material.opacity = Math.min(1, (1 - k) * 1.6); f.s.material.color.setRGB(1, 1 - k * 0.5, 1 - k * 0.8); if (f.life <= 0) f.s.visible = false; });
    SMOKE.forEach((f) => { if (f.life <= 0) return; f.life--; const k = 1 - f.life / f.max; f.s.position.y += 0.12; f.s.position.z += f.g ? landV : 0.25; f.s.scale.setScalar(f.size * (0.6 + k * 1.2)); f.s.material.opacity = (1 - k) * 0.55; if (f.life <= 0) f.s.visible = false; });
    DEB.forEach((d) => { if (d.life <= 0) return; d.life--; d.v.y -= 0.06; d.m.position.add(d.v); if (d.m.position.y < 0.5) { d.m.position.y = 0.5; d.v.multiplyScalar(0.5); d.v.y = Math.abs(d.v.y) * 0.3; } d.m.rotation.x += d.r.x; d.m.rotation.y += d.r.y; if (d.life <= 0) d.m.visible = false; });
    RINGS.forEach((g) => { if (g.life <= 0) return; g.life--; const k = 1 - g.life / g.max; g.m.scale.setScalar(4 + g.size * (1 - Math.pow(1 - k, 3))); g.m.material.opacity = (1 - k) * 0.8; if (g.life <= 0) g.m.visible = false; });
    LIGHTS.forEach((L) => { if (L.life <= 0) { L.l.intensity = 0; return; } L.life--; L.l.intensity = L.peak * Math.pow(L.life / L.max, 1.5); });
  }

  // ---------------------------------------------------------------- one picture
  let size = [0, 0], lastFrame = -1, lastStageKey = '';
  function setSize(w, h) { if (w !== size[0] || h !== size[1]) { renderer.setSize(w, h, false); size = [w, h]; } }
  function render(W, t, demo) {
    const sid = W.stage ? W.stage.id : 'harbour';
    const key = sid + '|' + W.stageNo;
    if (key !== lastStageKey) { lastStageKey = key; setStage(sid); for (const [id, o] of live) { give(o); } live.clear(); }
    const dist = demo ? t * 0.03 : W.dist;
    landV = demo ? 0 : (W.vs || 0) / SIN;
    updateLand(dist);
    // the sea's waves slide with the land, and ripple on their own
    riverNorm.offset.y = -t * 0.00012;
    if (sea.visible) { seaNorm.offset.y = -(dist / SIN) / (1400 / 4) + t * 0.00002; seaNorm.offset.x = Math.sin(t / 4000) * 0.02; }
    clouds.forEach((c) => { const y = (dist * c.speed) - c.T; c.mesh.position.set(c.gx - GW / 2, c.h, wz(((y % 1560) + 1560) % 1560 - 300, c.h)); });
    if (earth) { earth.rotation.y = t * 0.00002; earth.rotation.x = 0.3; }
    if (starPts) starPts.position.x = Math.sin(t / 20000) * 6;
    const steps = demo ? 1 : Math.max(0, Math.min(6, W.frame - lastFrame)); lastFrame = W.frame;
    if (!demo) {
      syncEnemies(W); syncPlayer(W, t); syncBoss(W, t);
      for (let i = 0; i < steps; i++) stepFx(dist);
      // engine flames flicker
      if (player) player.traverse((c) => { if (c.isMesh && c.material === MD.materials().glow) c.scale.z = 0.85 + Math.random() * 0.3; });
    } else {
      if (playerId !== W.shipId) syncPlayer(W, t);
      if (player) { player.visible = true; place(player, 120 + Math.sin(t / 900) * 40, 240 + Math.sin(t / 1300) * 20, MD.HEIGHT.player); player.rotation.set(0, 0, Math.cos(t / 900) * 0.4); }
      for (const [id, o] of live) give(o); live.clear(); if (bossObj) { ents.remove(bossObj); bossObj = null; bossKind = ''; }
    }
    renderer.autoClear = false; renderer.clear();
    renderer.shadowMap.needsUpdate = true;
    camera.layers.set(0); renderer.render(scene, camera);
    const bgk = scene.background; scene.background = null;
    renderer.clearDepth(); camera.layers.set(1); renderer.render(scene, camera);
    scene.background = bgk;
    return renderer.domElement;
  }
  function onFx(f) {
    if (f.k === 'boom') boom(f.x, f.y, f.size || 1, !!f.ground, !!f.sea || (f.ground && stageId === 'arctic'));
    else if (f.k === 'die') boom(f.x, f.y - 6, 3, false);
    else if (f.k === 'bossdie') { const wet = stageId === 'harbour' || stageId === 'arctic'; boom(f.x, f.y, 3, !!f.ground, wet); boom(f.x - 30, f.y + 10, 3, !!f.ground, wet); boom(f.x + 30, f.y - 10, 3, !!f.ground, wet); }
    else if (f.k === 'napalm') { boom(f.x, f.y, 3, true); boom(f.x - 20, f.y + 10, 2, true); boom(f.x + 20, f.y - 6, 2, true); }
    else if (f.k === 'surface') { const p = new THREE.Vector3(f.x - GW / 2, -2, wz(f.y, -2)); for (let i = 0; i < 6; i++) smoke(p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 16, 0, (Math.random() - 0.5) * 20)), 10, 40); }
  }
  function reset() {
    for (const [id, o] of live) give(o); live.clear();
    FIRE.forEach((f) => { f.life = 0; f.s.visible = false; }); SMOKE.forEach((f) => { f.life = 0; f.s.visible = false; }); DEB.forEach((d) => { d.life = 0; d.m.visible = false; });
    SCORCH.forEach((s) => { s.m.visible = false; }); RINGS.forEach((g) => { g.life = 0; g.m.visible = false; }); LIGHTS.forEach((L) => { L.life = 0; L.l.intensity = 0; });
    lastStageKey = ''; lastFrame = -1;
  }
  function quality(low) {   // a slower PC: softer, smaller shadows (and the caller draws at a lower size)
    sun.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    sun.shadow.radius = low ? 1 : 2.5;
  }
  return { canvas: renderer.domElement, setSize, render, onFx, reset, quality, renderer };
}
