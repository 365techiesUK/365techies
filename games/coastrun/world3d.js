/* 365 Coast Run - the 3D world (5 Oct 2026). three.js draws the road, the land and sea, the sky, the roadside, the
 * traffic and your car; coastrun.js draws the dashboard over the top. The rules (engine.js) hold the road as a line of
 * segments, each with a bend and a height; here each segment is given its place in the world (poses()), and the road,
 * verges, cliffs, beach and hills are built in chunks of CH segments as the car comes to them. Everything is our own:
 * shapes from models3d.js, textures painted on the spot.
 *
 * World axes: y up; a road heading th runs along (sin th, 0, -cos th) and its right is (cos th, 0, sin th), so a bend
 * to the right (k > 0) turns th up. At a fork the two roads are the main line moved out sideways by forkOff on each
 * side; the next stretch starts at the end of the road taken. */
import * as THREE from '../common/vendor/three-r185/three.module.min.js';
import * as MD from './models3d.js?v=1';

const E = window.CREngine, ART = window.CRArt, PAL = ART.PAL;
const SEG = E.SEG, HALF = E.HALF, RUM = E.RUMBLE, CH = 20;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function hash2(x, z) { let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf); const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z) { return vnoise(x, z) * 0.6 + vnoise(x * 2.1 + 7.3, z * 2.1 + 3.1) * 0.28 + vnoise(x * 4.3 + 11.7, z * 4.3 + 5.9) * 0.12; }
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, rep) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const COL = new THREE.Color();
function lin(hex, out, off) { COL.set(hex); out[off] = COL.r; out[off + 1] = COL.g; out[off + 2] = COL.b; }

// ---------------------------------------------------------------- what each place looks like beyond the road
const LOOK = {
  bournemouth: { sun: [0.6, 0.85], sunCol: '#fff4e0', sunI: 2.3, hemi: ['#d8eeff', '#8aa070', 1.7], fog: [160, 1300], cliff: '#d9a066', beach: '#ecd7a1', beachY: 1.2, cliffK: 0.75, hills: 14, rise: 70, edge: 'rail', sea: '#2b90cc' },
  purbeck: { sun: [0.3, 0.7], sunCol: '#fff4e0', sunI: 2.3, hemi: ['#dcecff', '#7a9a60', 1.6], fog: [150, 1250], hills: 40, rise: 120, wall: true },
  forest: { sun: [-0.4, 0.5], sunCol: '#ffe2b0', sunI: 2.2, hemi: ['#f8ecd0', '#8a7a50', 1.6], fog: [110, 950], hills: 14, rise: 80, trees: true },
  jurassic: { sun: [-0.15, 0.22], sunCol: '#ffb070', sunI: 2.6, hemi: ['#ffc896', '#8a6a58', 1.7], fog: [140, 1250], cliff: '#efe9dc', beach: '#e8dfc8', beachY: 0.5, cliffK: 0.3, hills: 22, rise: 90, edge: 'fence', sea: '#4a5f90' },
  harbour: { sun: [0.5, 0.6], sunCol: '#8d9cd8', sunI: 0.9, hemi: ['#6a7ab8', '#3a3e58', 2.2], fog: [70, 700], cliff: '#55585f', beach: '#3a3d44', beachY: -1, cliffK: 0.12, hills: 6, rise: 50, edge: 'quay', sea: '#0d2140', night: true },
  needles: { sun: [0.25, 0.2], sunCol: '#ffc8b0', sunI: 2.2, hemi: ['#ffd8d0', '#7a8a70', 1.6], fog: [120, 1150], cliff: '#f3eee4', beach: '#e8e2d6', beachY: 0.4, cliffK: 0.3, hills: 20, rise: 90, edge: 'fence', sea: '#6f90b8' }
};
const SIGNS = { gate: 1, gantry: 1, nose: 1, board: 1, chev: 1, warn: 1 };

export function createWorld() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.4, 3000);
  const fog = new THREE.Fog('#cfe7f6', 150, 1300); scene.fog = fog;

  // ---------------------------------------------------------------- light
  const hemi = new THREE.HemisphereLight('#bfe3ff', '#6a8a50', 1.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4e0', 2.6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 400;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
  scene.add(sun); scene.add(sun.target);
  const headlight = new THREE.SpotLight('#fff1d0', 0, 140, 0.55, 0.5, 1.2); scene.add(headlight); scene.add(headlight.target);

  // ---------------------------------------------------------------- materials
  const litMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const groundMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const roadTex = roadTexture(), roadMat = new THREE.MeshLambertMaterial({ map: roadTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const rumbleMat = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const signMats = new Map();
  function signMat(key) { let m = signMats.get(key); if (!m) { m = new THREE.MeshLambertMaterial({ map: tex(paintSign(key)), side: THREE.DoubleSide }); signMats.set(key, m); } return m; }

  // ---------------------------------------------------------------- sky, sun, sea, the hills far away
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, midAt: { value: 0.4 } },
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform float midAt; varying vec3 vp; void main(){ float h = clamp(vp.y, 0.0, 1.0); vec3 c = h < midAt * 0.25 ? mix(hor, mid, h / (midAt * 0.25)) : mix(mid, top, clamp((h - midAt * 0.25) / (1.0 - midAt * 0.25), 0.0, 1.0)); if (vp.y < 0.0) c = hor; gl_FragColor = vec4(c, 1.0); }',
    side: THREE.BackSide, depthWrite: false, fog: false
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 24, 12), skyMat); sky.renderOrder = -10; scene.add(sky);
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial(128, [[0, 'rgba(255,255,240,1)'], [0.16, 'rgba(255,240,200,0.95)'], [0.3, 'rgba(255,200,120,0.35)'], [1, 'rgba(255,180,100,0)']]), fog: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  sunDisc.scale.set(520, 520, 1); sunDisc.renderOrder = -8; scene.add(sunDisc);
  const stars = makeStars(); stars.visible = false; scene.add(stars);
  const ringFar = new THREE.Mesh(new THREE.CylinderGeometry(2300, 2300, 1, 48, 1, true), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  ringFar.renderOrder = -7; scene.add(ringFar);
  const seaNorm = waveNormals();
  const seaMat = new THREE.MeshPhongMaterial({ color: '#2b90cc', specular: '#ffffff', shininess: 90, normalMap: seaNorm, normalScale: new THREE.Vector2(0.6, 0.6) });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), seaMat); sea.rotation.x = -Math.PI / 2; sea.receiveShadow = true; scene.add(sea);
  seaNorm.repeat.set(220, 220);

  // ---------------------------------------------------------------- your car, the traffic, coins, smoke and sparks
  const player = new THREE.Group(); scene.add(player);
  let playerCarId = null, wheels = [], carInfo = null;
  const traffic = new Map();
  const coinGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.14, 16); coinGeo.rotateX(Math.PI / 2);
  const coins = new THREE.InstancedMesh(coinGeo, new THREE.MeshLambertMaterial({ color: '#ffcf33', emissive: '#7a5200' }), 400); coins.count = 0; coins.frustumCulled = false; scene.add(coins);   // (their bounds change every frame)
  const nitroGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.3, 10);
  const nitros = new THREE.InstancedMesh(nitroGeo, new THREE.MeshLambertMaterial({ color: '#2f7cf6', emissive: '#0b2a6a' }), 40); nitros.count = 0; nitros.frustumCulled = false; scene.add(nitros);
  const smoke = particles(700, false), sparks = particles(500, true);
  scene.add(smoke.points); scene.add(sparks.points);
  const skid = skidMarks(); scene.add(skid.mesh);
  const glows = glowPoints(1200); scene.add(glows.points);

  // ---------------------------------------------------------------- state
  const R = { W: null, poseHi: -1, chunks: new Map(), stubs: [], look: null, lookKey: '', fade: 1, camPos: new THREE.Vector3(), camLook: new THREE.Vector3(), camYaw: 0, camInit: false,
    fxN: 0, low: false, view: E.VIEW, w: 0, h: 0, lastT: 0, wheelSpin: 0, prevSkid: null, demoAcc: 0, built: 0 };

  // ---------------------------------------------------------------- where each segment is in the world
  function poses(W, upto) {
    const last = Math.min(upto, E.lastIndex(W));
    let i = Math.max(W.base, R.poseHi + 1);
    for (; i <= last; i++) {
      const g = E.segAt(W, i);
      if (g.th !== undefined) continue;
      const p = i > W.base ? E.segAt(W, i - 1) : null;
      if (!p || p.th === undefined) { g.px = g.px || 0; g.pz = g.pz || 0; g.th = g.th || 0; continue; }   // nothing before it to go from (the start, or road tidied away unseen)
      let rec = null; for (let j = 0; j < W.stretch.length; j++) if (W.stretch[j].from === i && W.stretch[j].side) rec = W.stretch[j];
      if (rec && p.fk && p.fk.b) {   // the first segment after a split: at the end of the road taken
        const mx = p.px + Math.sin(p.th) * SEG, mz = p.pz - Math.cos(p.th) * SEG, o = E.OFF_END, sl = 2 * (E.OFF_END - E.OFF0) / (E.FB * SEG);
        g.px = mx + Math.cos(p.th) * rec.side * o; g.pz = mz + Math.sin(p.th) * rec.side * o; g.th = p.th + rec.side * Math.atan(sl);
      } else {
        const mid = p.th + p.k * SEG / 2;
        g.px = p.px + Math.sin(mid) * SEG; g.pz = p.pz - Math.cos(mid) * SEG; g.th = p.th + p.k * SEG;
      }
    }
    R.poseHi = Math.max(R.poseHi, last);
  }
  const AT = { x: 0, y: 0, z: 0, th: 0, bank: 0, g: null };
  function at(W, s, b, out) {   // the middle of the road (or of split road b) at s, and its heading
    out = out || AT;
    const i = Math.floor(s / SEG), g = E.segAt(W, i), f = clamp((s - i * SEG) / SEG, 0, 1.2);
    const th = g.th + g.k * SEG * f, mid = g.th + g.k * SEG * f * 0.5;
    out.x = g.px + Math.sin(mid) * SEG * f; out.z = g.pz - Math.cos(mid) * SEG * f; out.y = g.y1 + (g.y2 - g.y1) * f; out.th = th; out.bank = g.bank || 0; out.g = g;
    if (g.fk && g.fk.b && b) {
      const o = g.fk.o1 + (g.fk.o2 - g.fk.o1) * f, sl = (g.fk.o2 - g.fk.o1) / SEG;
      out.x += Math.cos(th) * b * o; out.z += Math.sin(th) * b * o; out.th = th + b * Math.atan(sl);
    }
    return out;
  }
  function place(W, s, lat, b, out) { at(W, s, b, out); out.x += Math.cos(out.th) * lat; out.z += Math.sin(out.th) * lat; out.y += lat * Math.sin(out.bank) * (Math.abs(lat) < HALF + RUM ? 1 : 0); return out; }

  // ---------------------------------------------------------------- the land in a chunk: rows across the road, columns out to the hills
  const LAND_COLS = [0.6, 3, 7, 13, 22, 35, 55, 85, 130, 200, 300, 450, 650];
  function sideCols(g, d, span) {   // [lateral distance from the middle, kind] for one side of a row
    const out = [];
    if (g.sea === d && g.sh) {
      const shore = Math.max(g.sh, span + 4);
      out.push([span + 0.6, 'verge']);
      for (let j = 1; j <= 3; j++) out.push([span + 0.6 + (shore - 0.5 - span - 0.6) * j / 3, j === 3 ? 'top' : 'verge']);
      out.push([shore + 6, 'foot'], [shore + 16, 'water'], [shore + 40, 'bed'], [shore + 100, 'bed'], [shore + 220, 'bed'], [shore + 400, 'bed'], [shore + 650, 'bed'], [shore + 900, 'bed'], [shore + 1200, 'bed']);
    } else for (const c of LAND_COLS) out.push([span + c, 'land']);
    return out;
  }
  function heightOf(W, look, S, g, kind, lat, roadY, wx, wz, dist) {
    if (kind === 'verge') return roadY - 0.15 + (dist > 4 ? (fbm(wx / 40, wz / 40) - 0.5) * 1.6 * smooth(4, 20, dist) : 0);
    if (kind === 'top') return roadY - 0.2 + (fbm(wx / 40, wz / 40) - 0.5) * 1.2;
    if (kind === 'foot') return look.beachY;
    if (kind === 'water') return -0.6;
    if (kind === 'bed') return -6 - dist * 0.01;
    // the land: from the road's own height out to hills that rise towards the far edge
    // hills relative to the road's own height (so the land never walls the road in), rising towards the far edge
    const hill = roadY + (fbm(wx / 300 + 40, wz / 300 + 17) - 0.42) * 2 * look.hills + Math.pow(dist / 650, 2) * look.rise;
    return roadY + (hill - roadY) * smooth(5, 110, dist) - (dist < 2 ? 0.25 : 0);
  }
  function colourOf(look, pal, kind, stripe, n) {
    if (kind === 'cliff') return look.cliff || '#8a7a6a';
    if (kind === 'beach') return look.beach || pal.verge[0];
    if (kind === 'bed') return look.night ? '#0b1a30' : '#2a5a70';
    if (kind === 'verge') return pal.verge[stripe] || pal.grass[stripe];
    const g = pal.grass[n > 0.55 ? 0 : 1];
    return n > 0.8 ? ART.shade(g, 0.06) : n < 0.2 ? ART.shade(g, -0.07) : g;
  }
  function buildChunk(W, c) {
    const i0 = c * CH, last = E.lastIndex(W), i1 = Math.min((c + 1) * CH, last);
    if (i1 <= i0) return null;
    poses(W, i1);
    const rows = [], P = { x: 0, y: 0, z: 0, th: 0, bank: 0, g: null };
    for (let i = i0; i <= i1; i++) {
      const g = E.segAt(W, i), S = E.STAGES[g.st], look = LOOK[S.key], pal = PAL[g.st];
      at(W, i * SEG, 0, P);
      const fa = g.fk && g.fk.a, fb = g.fk && g.fk.b;
      const span = fb ? g.fk.o1 + HALF + RUM + 1 : (fa ? g.fk.w1 : HALF) + RUM;
      // a bend: don't reach further in than the bend's own radius on the inside (the land would fold over itself)
      let kk = 0; for (let j = -8; j <= 8; j++) kk += E.segAt(W, i + j).k; kk /= 17;
      const inner = Math.abs(kk) > 1e-4 ? 0.85 / Math.abs(kk) : 1e9, innerSide = kk > 0 ? 1 : -1;
      const row = { pts: [], kinds: [], g: g, stripe: Math.floor(i / 2) % 2 };
      for (const d of [-1, 1]) {
        const cols = sideCols(g, d, span), list = [];
        let prevH = P.y;
        for (let j = 0; j < cols.length; j++) {
          let lat = cols[j][0]; const kind = cols[j][1];
          if (d === innerSide) lat = Math.min(lat, Math.max(span + 0.6, inner));
          const wx = P.x + Math.cos(P.th) * d * lat, wz = P.z + Math.sin(P.th) * d * lat;
          let h = heightOf(W, look, S, g, kind, lat, P.y + d * Math.min(lat, span) * Math.sin(P.bank) * (fa || fb ? 0 : 1), wx, wz, lat - span);
          if (kind === 'land' && j === 0) h = Math.min(h, prevH + 0.4);
          list.push([wx, h, wz, kind]); prevH = h;
        }
        row[d] = list;
      }
      // the flat band under the road (and between the roads of a split)
      row.cl = [P.x - Math.cos(P.th) * span, P.y + -span * Math.sin(P.bank) * (fa || fb ? 0 : 1), P.z - Math.sin(P.th) * span];
      row.cr = [P.x + Math.cos(P.th) * span, P.y + span * Math.sin(P.bank) * (fa || fb ? 0 : 1), P.z + Math.sin(P.th) * span];
      row.look = look; row.pal = pal;
      rows.push(row);
    }
    // ---- the ground: triangles between each row and the next
    const pos = [], col = [];
    const tri = (a, b, cc, hex) => { pos.push(a[0], a[1], a[2], b[0], b[1], b[2], cc[0], cc[1], cc[2]); const o = col.length; col.length += 9; lin(hex, col, o); col[o + 3] = col[o]; col[o + 4] = col[o + 1]; col[o + 5] = col[o + 2]; col[o + 6] = col[o]; col[o + 7] = col[o + 1]; col[o + 8] = col[o + 2]; };
    const quad = (nl, nr, fr, fl, hex, hex2) => { tri(nl, nr, fl, hex); tri(nr, fr, fl, hex2 || hex); };   // wound to face up
    for (let r = 0; r < rows.length - 1; r++) {
      const A = rows[r], B = rows[r + 1], pal = A.pal, look = A.look;
      quad(A.cl, A.cr, B.cr, B.cl, pal.verge[A.stripe] || pal.grass[0]);
      for (const d of [-1, 1]) {
        const a = A[d], b = B[d];
        let pa = d < 0 ? A.cl : A.cr, pb = d < 0 ? B.cl : B.cr;
        for (let j = 0; j < a.length; j++) {
          const qa = a[j], qb = b[j], kind = qa[3];
          let k2 = kind === 'land' || kind === 'verge' || kind === 'top' ? (j === 0 ? 'verge' : kind === 'land' ? 'land' : 'verge') : kind === 'foot' ? 'cliff' : kind === 'water' ? 'beach' : 'bed';
          const n = hash2(Math.round(qa[0] / 7), Math.round(qa[2] / 7)), hex = colourOf(look, pal, k2, A.stripe, n), hex2 = colourOf(look, pal, k2, A.stripe, hash2(Math.round(qa[0] / 7) + 1, Math.round(qa[2] / 7)));
          if (d < 0) quad(qa, pa, pb, qb, hex, hex2); else quad(pa, qa, qb, pb, hex, hex2);
          pa = qa; pb = qb;
        }
      }
    }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.computeVertexNormals();
    const ground = new THREE.Mesh(gg, groundMat); ground.receiveShadow = true;
    const group = new THREE.Group(); group.add(ground);
    // ---- the road (one, or two in a split) and its rumble strips
    for (const b of [0, -1, 1]) roadStrip(W, i0, i1, b, group);
    // ---- roadside things
    scenery(W, i0, i1, group);
    group.userData = { i0: i0, i1: i1 };
    return group;
  }
  function roadStrip(W, i0, i1, b, group) {
    const pos = [], uv = [], rpos = [], rcol = [], P = { x: 0, y: 0, z: 0, th: 0, bank: 0, g: null }, Q = { x: 0, y: 0, z: 0, th: 0, bank: 0, g: null };
    for (let i = i0; i < i1; i++) {
      const g = E.segAt(W, i), split = !!(g.fk && g.fk.b);
      if (split !== !!b) continue;   // the one road, or (in a split) each of the two
      at(W, i * SEG, b, P); at(W, (i + 1) * SEG - 0.001, b, Q);
      const w1 = g.fk && g.fk.a ? g.fk.w1 : HALF, w2 = g.fk && g.fk.a ? g.fk.w2 : HALF, bk = g.fk ? 0 : 1;
      const e = (p, lat, w) => [p.x + Math.cos(p.th) * lat, p.y + lat * Math.sin(p.bank) * bk + 0.03, p.z + Math.sin(p.th) * lat];
      const a1 = e(P, -w1), a2 = e(P, w1), b1 = e(Q, -w2), b2 = e(Q, w2), v0 = i * SEG / 9, v1 = (i + 1) * SEG / 9;
      pos.push(...a1, ...a2, ...b1, ...a2, ...b2, ...b1); uv.push(0, v0, 1, v0, 0, v1, 1, v0, 1, v1, 0, v1);
      const rc = (Math.floor(i / 2) % 2) ? PAL[g.st].rumble[0] : PAL[g.st].rumble[1];
      for (const d of [-1, 1]) {
        const c1 = e(P, d * w1), c2 = e(P, d * (w1 + RUM)), c3 = e(Q, d * (w2 + RUM)), c4 = e(Q, d * w2);
        if (d < 0) rpos.push(...c2, ...c1, ...c3, ...c1, ...c4, ...c3); else rpos.push(...c1, ...c2, ...c4, ...c2, ...c3, ...c4);
        for (let q = 0; q < 6; q++) { const o = rcol.length; rcol.length += 3; lin(rc, rcol, o); }
      }
      if (g.line) {   // the start line: a chequered band across
        for (let q = 0; q < 12; q++) { const l0 = -HALF + q * HALF / 6, l1 = l0 + HALF / 6, f1 = e(P, l0), f2 = e(P, l1), f3 = e(Q, l1), f4 = e(Q, l0); f1[1] += 0.01; f2[1] += 0.01; f3[1] += 0.01; f4[1] += 0.01; rpos.push(...f1, ...f2, ...f4, ...f2, ...f3, ...f4); for (let z = 0; z < 6; z++) { const o = rcol.length; rcol.length += 3; lin(q % 2 ? '#111111' : '#f4f4f4', rcol, o); } }
      }
    }
    if (pos.length) { const g1 = new THREE.BufferGeometry(); g1.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g1.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g1.computeVertexNormals(); const m = new THREE.Mesh(g1, roadMat); m.receiveShadow = true; group.add(m); }
    if (rpos.length) { const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(rpos, 3)); g2.setAttribute('color', new THREE.Float32BufferAttribute(rcol, 3)); g2.computeVertexNormals(); const m2 = new THREE.Mesh(g2, rumbleMat); m2.receiveShadow = true; group.add(m2); }
  }
  // ---- everything that stands by the road in a chunk, merged into a few meshes (one for the lit, one for the glowing,
  //      one per sign picture); things you can knock over keep their own little mesh so they can fly off
  const TMP = new THREE.Object3D();
  function scenery(W, i0, i1, group) {
    const lit = [], glow = [], signs = new Map(), lamps = [], P = { x: 0, y: 0, z: 0, th: 0, bank: 0, g: null };
    const addModel = (geo, list, x, y, z, ry, s) => { TMP.position.set(x, y, z); TMP.rotation.set(0, ry, 0); TMP.scale.setScalar(s || 1); TMP.updateMatrix(); list.push([geo, TMP.matrix.clone()]); };
    for (let i = i0; i < i1; i++) {
      const g = E.segAt(W, i), S = E.STAGES[g.st], look = LOOK[S.key];
      // walls, fences and the sea wall: pieces end to end
      const walls = [];
      if (g.wl) walls.push([-10.5, look.wall ? 'wall' : 'fence']);
      if (g.wr) walls.push([10.5, look.wall ? 'wall' : 'fence']);
      if (g.sea && g.sh - 1.5 < 26 && look.edge) walls.push([g.sea * (g.sh - 1.2), look.edge === 'rail' ? 'rail' : look.edge === 'quay' ? 'quay' : 'fence']);
      for (const wl of walls) { place(W, i * SEG + SEG / 2, wl[0], 0, P); const m = MD.model(wl[1], 0); addModel(m.lit, lit, P.x, P.y, P.z, -P.th); }
      if (!g.spr) continue;
      for (const it of g.spr) {
        if (it.done) continue;
        place(W, i * SEG, it.x, it.b, P);
        const d = it.x < 0 ? -1 : 1, faceRoad = Math.atan2(-d * Math.cos(P.th), -d * Math.sin(P.th));
        let ry = hash2(i, Math.round(it.x * 10)) * Math.PI * 2;
        if (/^(hut|cottage|hotel|building|board|finger|forestsign|lamp)$/.test(it.t)) ry = faceRoad;
        if (it.t === 'lamp') ry = faceRoad + Math.PI;   // the arm reaches over the road
        if (/^(gate|gantry|nose|chev|warn|gpost)$/.test(it.t)) ry = -P.th;
        if (it.t === 'board') ry = -P.th + d * 0.5;
        if (it.t === 'pier' || it.t === 'ferry') ry = faceRoad + Math.PI / 2;
        let y = P.y;
        if (/^(yacht|buoy|stack|arch|needles|ferry|pier)$/.test(it.t)) y = it.t === 'pier' ? 0 : 0;
        else if (it.t === 'lighthouse') y = P.y - 6;
        else if (Math.abs(it.x) > HALF + 2) y = groundAt(W, g, P, it.x);
        if (SIGNS[it.t]) { signParts(it, P, y, ry, lit, signs, addModel); if (it.t === 'gate' || it.t === 'gantry') continue; }
        const m = MD.model(it.t, it.v); if (!m) continue;
        if (it.soft) { const mesh = new THREE.Mesh(m.lit, litMat); mesh.position.set(P.x, y, P.z); mesh.rotation.y = ry; mesh.castShadow = true; mesh.userData.it = it; group.add(mesh); continue; }
        addModel(m.lit, lit, P.x, y, P.z, ry);
        if (m.glow) addModel(m.glow, glow, P.x, y, P.z, ry);
        if (look.night && it.t === 'lamp') { TMP.position.set(0, 5.95, -1.5); TMP.rotation.set(0, ry, 0); TMP.position.applyEuler(TMP.rotation); lamps.push(P.x + TMP.position.x, y + TMP.position.y, P.z + TMP.position.z); }
        if (look.night && (it.t === 'yacht' || it.t === 'buoy')) lamps.push(P.x, y + (it.t === 'yacht' ? 12.3 : 2.3), P.z);
      }
    }
    if (lit.length) { const mesh = new THREE.Mesh(mergeT(lit), litMat); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); }
    if (glow.length) group.add(new THREE.Mesh(mergeT(glow), glowMat));
    for (const [key, list] of signs) group.add(new THREE.Mesh(mergeT(list, true), signMat(key)));
    if (lamps.length) group.userData.lamps = lamps;
  }
  function groundAt(W, g, P, lat) {   // the land's height beside the road (the same sums as the chunk's ground)
    const S = E.STAGES[g.st], look = LOOK[S.key], d = lat < 0 ? -1 : 1, a = Math.abs(lat), span = HALF + RUM;
    const wx = P.x, wz = P.z;
    if (g.sea === d && g.sh) { if (a > g.sh + 4) return look.beachY; return P.y - 0.15; }
    return heightOf(W, look, S, g, 'land', a, P.y, wx, wz, a - span);
  }
  function signParts(it, P, y, ry, lit, signs, addModel) {
    const plane = (w, h, key, ox, oy, oz, flip) => {
      const g = new THREE.PlaneGeometry(w, h); if (flip) { const uv = g.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setX(q, 1 - uv.getX(q)); }
      TMP.position.set(ox, oy, oz); TMP.rotation.set(0, 0, 0); TMP.updateMatrix(); g.applyMatrix4(TMP.matrix);
      TMP.position.set(P.x, y, P.z); TMP.rotation.set(0, ry, 0); TMP.scale.setScalar(1); TMP.updateMatrix();
      (signs.get(key) || signs.set(key, []).get(key)).push([g, TMP.matrix.clone(), true]);
    };
    const box = (w, h, d, ox, oy, oz, col) => { const k = new MD.Kit(); k.box(w, h, d, ox, oy, oz, col); addModel(k.build().lit, lit, P.x, y, P.z, ry); };
    switch (it.t) {
      case 'gate': {
        const kinds = ['START', 'ROUND', 'CHECKPOINT', 'GOAL'], w = HALF + 2.5;
        box(1.2, 8, 1.2, -w, 0, 0, '#e5e7eb'); box(1.2, 8, 1.2, w, 0, 0, '#e5e7eb'); box(w * 2 + 1.6, 2.4, 0.8, 0, 8, 0, '#111827');
        plane(w * 2 + 1.2, 2.1, 'gate|' + it.v, 0, 9.2, 0.42); plane(w * 2 + 1.2, 2.1, 'gate|' + it.v, 0, 9.2, -0.42, true);
        void kinds; break;
      }
      case 'gantry': {
        const w = HALF + 2.5, names = (it.txt || '|').split('|');
        box(0.5, 7.5, 0.5, -w, 0, 0, '#9aa0a6'); box(0.5, 7.5, 0.5, w, 0, 0, '#9aa0a6'); box(w * 2, 0.4, 0.4, 0, 7.2, 0, '#9aa0a6');
        plane(6.4, 2.8, 'fsign|-1|' + names[0], -3.6, 6, 0.3); plane(6.4, 2.8, 'fsign|1|' + names[1], 3.6, 6, 0.3);
        break;
      }
      case 'nose': plane(6, 3.6, 'nose|' + it.txt, 0, 2.4, 0.1); box(0.2, 1.2, 0.2, -1.8, 0, 0, '#9aa0a6'); box(0.2, 1.2, 0.2, 1.8, 0, 0, '#9aa0a6'); break;
      case 'board': plane(8, 4, 'board|' + (it.v % 4), 0, 4.4, 0.08); plane(8, 4, 'boardback', 0, 4.4, -0.08, true); break;
      case 'chev': plane(1.1, 0.9, 'chev', 0, 1.65, 0.04, it.v < 0); break;
      case 'warn': plane(3.6, 1.5, 'warn', 0, 2.35, 0.05, it.v < 0); break;
    }
  }
  function mergeT(list, uvs) {   // geometries placed by matrices, joined into one
    let n = 0; for (const [g] of list) n += (g.index ? g.index.count : g.attributes.position.count);
    const pos = new Float32Array(n * 3), col = uvs ? null : new Float32Array(n * 3), uv = uvs ? new Float32Array(n * 2) : null; let o = 0;
    const v = new THREE.Vector3();
    for (const [g0, m] of list) {
      const g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position, c = g.attributes.color, u = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m); pos[(o + i) * 3] = v.x; pos[(o + i) * 3 + 1] = v.y; pos[(o + i) * 3 + 2] = v.z; if (col) { col[(o + i) * 3] = c.getX(i); col[(o + i) * 3 + 1] = c.getY(i); col[(o + i) * 3 + 2] = c.getZ(i); } if (uv) { uv[(o + i) * 2] = u.getX(i); uv[(o + i) * 2 + 1] = u.getY(i); } }
      o += p.count; if (g !== g0) g.dispose();
    }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3)); if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.computeVertexNormals(); out.computeBoundingSphere();
    return out;
  }
  function dropChunk(ch) { scene.remove(ch); ch.traverse((o) => { if (o.geometry && !o.userData.it) o.geometry.dispose(); }); }

  // ---------------------------------------------------------------- the road the other way at a fork, going off into the haze
  function stubs(W) {
    const F = W.fork, want = [];
    if (F && E.lastIndex(W) >= F.end - 1 && F.a - E.segIndex(W.s) < 260) for (const side of [-1, 1]) if (!F.s || F.s !== side) want.push(side);
    const key = F ? F.end + ':' + want.join(',') : '';
    if (key === R.stubKey) return; R.stubKey = key;
    R.stubs.forEach((m) => { scene.remove(m); m.geometry.dispose(); }); R.stubs = [];
    if (!F) return;
    poses(W, F.end - 1);
    const p = E.segAt(W, F.end - 1), sl = 2 * (E.OFF_END - E.OFF0) / (E.FB * SEG);
    for (const side of want) {
      const segs = E.peek(F.next[side < 0 ? 0 : 1], 70), pal = PAL[F.next[side < 0 ? 0 : 1]];
      let x = p.px + Math.sin(p.th) * SEG + Math.cos(p.th) * side * E.OFF_END, z = p.pz - Math.cos(p.th) * SEG + Math.sin(p.th) * side * E.OFF_END, th = p.th + side * Math.atan(sl);
      const y = p.y2 + 0.03, pos = [], col = [];
      const pushQ = (nl, fl, fr, nr, hex) => { pos.push(...nl, ...nr, ...fl, ...nr, ...fr, ...fl); for (let q = 0; q < 6; q++) { const o = col.length; col.length += 3; lin(hex, col, o); } };
      for (let i = 0; i < segs.length; i++) {
        const k = segs[i].k, mid = th + k * SEG / 2, nx = x + Math.sin(mid) * SEG, nz = z - Math.cos(mid) * SEG, nth = th + k * SEG;
        const L = (px, pz, t, lat, yy) => [px + Math.cos(t) * lat, yy, pz + Math.sin(t) * lat];
        pushQ(L(x, z, th, -HALF, y), L(nx, nz, nth, -HALF, y), L(nx, nz, nth, HALF, y), L(x, z, th, HALF, y), i % 4 < 2 ? pal.road[0] : pal.road[1]);
        pushQ(L(x, z, th, -40, y - 0.1), L(nx, nz, nth, -40, y - 0.1), L(nx, nz, nth, -HALF, y - 0.05), L(x, z, th, -HALF, y - 0.05), pal.grass[i % 2]);
        pushQ(L(x, z, th, HALF, y - 0.05), L(nx, nz, nth, HALF, y - 0.05), L(nx, nz, nth, 40, y - 0.1), L(x, z, th, 40, y - 0.1), pal.grass[(i + 1) % 2]);
        x = nx; z = nz; th = nth;
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, rumbleMat); m.receiveShadow = true; scene.add(m); R.stubs.push(m);
    }
  }

  function updateChunks(W) {
    const s = W.s, need0 = Math.floor(Math.max(0, E.segIndex(s) - 12) / CH), need1 = Math.floor(Math.min(E.lastIndex(W), E.segIndex(s + R.view)) / CH);
    for (const [c, ch] of R.chunks) if (c < need0 || c > need1 + 1) { dropChunk(ch); R.chunks.delete(c); }
    let made = 0;
    for (let c = need0; c <= need1; c++) {
      const ch = R.chunks.get(c), want = Math.min((c + 1) * CH, E.lastIndex(W));
      if (ch && ch.userData.i1 >= want && !ch.userData.dirty) continue;
      if (made >= (R.built ? 2 : 99)) break;
      if (ch) { dropChunk(ch); R.chunks.delete(c); }
      const g = buildChunk(W, c); if (g) { scene.add(g); R.chunks.set(c, g); }
      made++;
    }
    R.built = 1;
    stubs(W);
  }

  // ---------------------------------------------------------------- the place's light, sky and haze (fading from one place to the next)
  const TMPC = new THREE.Color(), TMPC2 = new THREE.Color();
  function setLook(st, k) {
    const pal = PAL[st], look = LOOK[pal.key], sk = pal.sky;
    const blend = (c, hex) => { TMPC.set(hex); c.lerp(TMPC, k); };
    blend(skyMat.uniforms.top.value, sk[0][1]); blend(skyMat.uniforms.mid.value, sk[Math.min(2, sk.length - 2)][1]); blend(skyMat.uniforms.hor.value, sk[sk.length - 1][1]);
    blend(fog.color, pal.fog);
    fog.near += (look.fog[0] - fog.near) * k; fog.far += (look.fog[1] * (R.low ? 0.8 : 1) - fog.far) * k;
    blend(hemi.color, look.hemi[0]); blend(hemi.groundColor, look.hemi[1]); hemi.intensity += (look.hemi[2] - hemi.intensity) * k;
    blend(sun.color, look.sunCol); sun.intensity += (look.sunI - sun.intensity) * k;
    R.sunDir = R.sunDir || new THREE.Vector3(0.3, 0.8, 0.3);
    TMPC2.setRGB(0, 0, 0);
    const dir = new THREE.Vector3(look.sun[0], look.sun[1], -0.7).normalize(); R.sunDir.lerp(dir, k).normalize();
    blend(seaMat.color, look.sea || '#2b90cc');
    stars.visible = !!look.night;
    headlight.intensity = look.night ? 2600 : 0;
    sunDisc.material.color.set(look.night ? '#c8d4ff' : '#ffffff'); sunDisc.scale.setScalar(look.night ? 160 : 520);
  }
  function setBackdrop(key) {
    const res = 2, B = ART.bg(key, res), t = new THREE.CanvasTexture(B.far); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
    if (ringFar.material.map) ringFar.material.map.dispose();
    ringFar.material.map = t; ringFar.material.needsUpdate = true;
    const H = 2 * Math.PI * 2300 / ART.BG_W * ART.BG_H * 0.55;   // the panorama wrapped once round, squashed so its hills sit low
    ringFar.scale.set(1, H, 1); ringFar.userData.hz = ((ART.BG_H - ART.HZ) / ART.BG_H - 0.5) * H;   // the horizon's height within the ring
  }

  // ---------------------------------------------------------------- the player's car
  function makePlayer(id) {
    player.clear(); const m = MD.playerCar(id); carInfo = m;
    const body = new THREE.Mesh(m.body.lit, litMat); body.castShadow = true; player.add(body);
    if (m.body.glow) { const gl = new THREE.Mesh(m.body.glow, glowMat); player.add(gl); }
    wheels = m.wheels.map((p) => { const w = new THREE.Mesh(m.wheel, litMat); w.position.set(p[0], p[1], p[2]); w.castShadow = true; player.add(w); return w; });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(m.width + 0.6, m.len * 2 + 0.6), new THREE.MeshBasicMaterial({ map: radial(64, [[0, 'rgba(0,0,0,0.55)'], [0.7, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.04; player.add(shadow); player.userData.shadow = shadow;
    playerCarId = id;
  }

  // ---------------------------------------------------------------- one picture
  const POS = { x: 0, y: 0, z: 0, th: 0, bank: 0, g: null }, V3 = new THREE.Vector3(), V4 = new THREE.Vector3();
  function render(W, t, mode) {
    const dt = R.lastT ? Math.min(0.1, (t - R.lastT) / 1000) : 1 / 60; R.lastT = t;
    if (R.W !== W) reset(W);
    poses(W, E.segIndex(W.s + E.VIEW + 240));
    updateChunks(W);
    // which place we're in: the light, the sky and the far hills follow it
    const here = E.segAt(W, E.segIndex(W.s)).st, key = PAL[here].key;
    if (key !== R.lookKey) { R.lookKey = key; R.fade = R.look === null ? 1 : 0; R.look = here; setBackdrop(key); }
    R.fade = Math.min(1, R.fade + dt / 2.5);
    setLook(here, R.fade >= 1 ? 1 : Math.min(1, dt * 1.2));

    // ---- the car
    if (playerCarId !== W.car) makePlayer(W.car);
    const F = W.fork, b = F && F.s && E.segIndex(W.s) >= F.split ? F.s : 0;
    place(W, W.s, W.x, b, POS);
    const cx = POS.x, cz = POS.z, roadTh = POS.th, cy = W.h + (POS.y - E.heightAt(W, W.s));
    const heading = roadTh + W.psi, travel = roadTh + W.phi;
    player.position.set(cx, cy, cz);
    const cr = W.crash;
    let yaw = -heading, roll = POS.bank * 0.8 + W.steer * W.v / 70 * 0.05, pitch = Math.atan(gradeAt(W)) * 0.9 + (W.air ? clamp(W.vh * 0.012, -0.25, 0.2) : 0), lift = 0;
    if (cr) {
      const p = cr.t / cr.dur;
      if (cr.hard) { const up = Math.sin(Math.min(1, p * 1.5) * Math.PI); lift = up * 2.6; roll += cr.spin * up * Math.PI * 1.6; yaw += cr.spin * p * 4; }
      else yaw += cr.spin * Math.sin(p * Math.PI) * 1.4;
    }
    player.position.y += lift;
    player.rotation.set(0, 0, 0); player.rotation.order = 'YXZ'; player.rotation.y = yaw; player.rotation.x = pitch; player.rotation.z = roll;
    R.wheelSpin += W.v * dt / 0.34;
    wheels.forEach((w, i) => { w.rotation.order = 'YXZ'; w.rotation.y = i < 2 ? -W.steer * 0.42 + (W.drift ? W.drift * 0.25 : 0) : 0; w.rotation.x = -R.wheelSpin; });
    const sh = player.userData.shadow; sh.position.y = 0.05 - (W.h - E.heightAt(W, W.s)) - lift; sh.material.opacity = Math.max(0.15, 1 - (W.h - E.heightAt(W, W.s) + lift) * 0.2);
    // ---- the camera: behind and above, swinging round late, wider as you go faster
    const spd = W.v / E.VMAX, camDist = 5.4 + spd * 1.3, camH = 1.95 + spd * 0.35;
    const yawTarget = travel * 0.55 + heading * 0.45;
    if (!R.camInit) { R.camYaw = yawTarget; }
    let dy = yawTarget - R.camYaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    R.camYaw += dy * Math.min(1, dt * (cr ? 1.5 : 5.5));
    const fx = Math.sin(R.camYaw), fz = -Math.cos(R.camYaw);
    // the camera rides on the road, not on the car: over a crest the car is seen to leave the ground
    const roadHere = POS.y - (W.h - E.heightAt(W, W.s)) * 0, groundY = Math.max(E.heightAt(W, W.s), E.heightAt(W, W.s - camDist)) + (cy - W.h);
    R.camY = R.camInit ? R.camY + (groundY - R.camY) * Math.min(1, dt * 6) : groundY;
    V3.set(cx - fx * camDist, R.camY + camH, cz - fz * camDist);
    if (!R.camInit) { R.camPos.copy(V3); R.camInit = true; }
    R.camPos.lerp(V3, Math.min(1, dt * (cr ? 2 : 12)));
    R.camPos.y = V3.y;
    camera.position.copy(R.camPos);
    void roadHere;
    if (W.shake > 0 && R.shakeOn !== false) camera.position.add(V4.set((Math.random() - 0.5) * W.shake * 0.02, (Math.random() - 0.5) * W.shake * 0.02, 0));
    V4.set(cx + fx * 7, R.camY + 1.05 + (cy - R.camY) * 0.35, cz + fz * 7);
    camera.lookAt(V4);
    camera.rotation.z += POS.bank * 0.35 - W.steer * spd * 0.02;
    if (R.debugCam) { camera.position.set(cx + R.debugCam[0], cy + R.debugCam[1], cz + R.debugCam[2]); camera.lookAt(cx + R.debugCam[3], cy, cz + R.debugCam[4]); }
    camera.fov += ((56 + spd * 10 + (W.boosting ? 7 : 0)) - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix();
    // the sky things go round with the camera
    sky.position.copy(camera.position); stars.position.copy(camera.position);
    ringFar.position.set(camera.position.x, camera.position.y - (ringFar.userData.hz || 0) - 30, camera.position.z);
    sea.position.set(Math.round(camera.position.x / 100) * 100, 0, Math.round(camera.position.z / 100) * 100);
    seaNorm.offset.x = (t / 1000) * 0.02; seaNorm.offset.y = (t / 1000) * 0.012;
    const sd = R.sunDir || V4.set(0.3, 0.8, -0.5);
    sunDisc.position.copy(camera.position).addScaledVector(sd, 2000);
    sun.position.set(cx + sd.x * 180, cy + sd.y * 180, cz + sd.z * 180); sun.target.position.set(cx, cy, cz);
    headlight.position.set(cx - fx * 0.5, cy + 1.1, cz - fz * 0.5); headlight.target.position.set(cx + fx * 30, cy, cz + fz * 30);

    // ---- traffic
    const seen = new Set();
    for (const c of W.cars) {
      let m = traffic.get(c.id);
      if (!m) {
        const mm = MD.trafficModel(c.t, c.col); m = new THREE.Group();
        const body = new THREE.Mesh(mm.lit, litMat); body.castShadow = true; m.add(body);
        if (mm.glow) m.add(new THREE.Mesh(mm.glow, glowMat));
        scene.add(m); traffic.set(c.id, m);
      }
      seen.add(c.id);
      place(W, c.s, c.x, c.b, POS);
      m.position.set(POS.x, POS.y, POS.z);
      m.rotation.order = 'YXZ'; m.rotation.y = -POS.th + (c.tx - c.x) * -0.04 + (c.spin > 0 ? c.spin * 0.15 : 0); m.rotation.z = POS.bank * 0.8;
      m.rotation.x = Math.atan((E.heightAt(W, c.s + 2) - E.heightAt(W, c.s - 2)) / 4);
    }
    for (const [id, m] of traffic) if (!seen.has(id)) { scene.remove(m); traffic.delete(id); }

    // ---- coins and nitro bottles near the car spin; a caught one flies up and vanishes
    let nc = 0, nn = 0; const i0 = E.segIndex(W.s) - 2, i1 = E.segIndex(W.s + 420);
    for (let i = Math.max(W.base, i0); i <= Math.min(i1, E.lastIndex(W)); i++) {
      const g = E.segAt(W, i); if (!g.coins) continue;
      for (const cn of g.coins) {
        let up = 1.1, sc = 1;
        if (cn.got) { const gt = W.t - cn.got; if (gt > 16) continue; up += gt * 0.25; sc = 1 + gt * 0.05; }
        place(W, i * SEG, cn.x, 0, POS);
        TMP.position.set(POS.x, POS.y + up + Math.sin(t / 300 + i) * 0.12, POS.z); TMP.rotation.set(0, t / 260 + i * 0.4, 0); TMP.scale.setScalar(sc); TMP.updateMatrix();
        if (cn.nitro) { if (nn < 40) nitros.setMatrixAt(nn++, TMP.matrix); }
        else if (nc < 400) coins.setMatrixAt(nc++, TMP.matrix);
      }
    }
    coins.count = nc; nitros.count = nn; coins.instanceMatrix.needsUpdate = true; nitros.instanceMatrix.needsUpdate = true;

    // ---- knocked-over things fly off; glows at night
    let ng = 0;
    for (const [, ch] of R.chunks) {
      ch.children.forEach((o) => { const it = o.userData.it; if (it && it.done) { const age = W.t - it.done; if (age > 50) o.visible = false; else { o.position.y += 0.25 - age * 0.012; o.rotation.x += 0.15; o.rotation.z += 0.1; } } });
      const L = ch.userData.lamps; if (L) for (let q = 0; q < L.length; q += 3) { if (ng >= 1200) break; glows.set(ng++, L[q], L[q + 1], L[q + 2], '#ffd98a', 14); }
    }
    glows.draw(ng);
    effects(W, t, dt, cx, cy, cz, heading, travel);
    smoke.update(dt); sparks.update(dt);
    renderer.render(scene, camera);
    return renderer.domElement;
  }
  function gradeAt(W) { const a = E.heightAt(W, W.s + 2), b2 = E.heightAt(W, W.s - 2); return (a - b2) / 4; }

  // ---------------------------------------------------------------- smoke from the tyres, dust off the road, sparks, flames
  function effects(W, t, dt, cx, cy, cz, heading, travel) {
    const fx = Math.sin(heading), fz = -Math.cos(heading), rx = Math.cos(heading), rz = Math.sin(heading), len = carInfo ? carInfo.len : 2;
    const rear = (side) => [cx - fx * len * 0.62 + rx * side * 0.8, cy + 0.3, cz - fz * len * 0.62 + rz * side * 0.8];
    if (W.drift && !W.air) for (const sd of [-1, 1]) { const p = rear(sd); smoke.emit(p[0], p[1], p[2], (Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2, 1.6, 2.4, '#eeeeee', 0.55, 1.6); }
    if (W.off && W.v > 8) { const p = rear(Math.random() < 0.5 ? -1 : 1), pal = PAL[E.segAt(W, E.segIndex(W.s)).st]; smoke.emit(p[0], p[1], p[2], -fx * W.v * 0.1, 1.5, -fz * W.v * 0.1, 1.2, 1.3, pal.verge[0] || pal.grass[0], 0.5, 1.3); }
    if (W.boosting) for (const sd of [-0.45, 0.45]) { const p = rear(sd); sparks.emit(p[0] - fx * 0.9, p[1] - 0.08, p[2] - fz * 0.9, -fx * 2 + (Math.random() - 0.5) * 0.6, 0.2, -fz * 2 + (Math.random() - 0.5) * 0.6, 0.22, 0.08, Math.random() < 0.5 ? '#ff9a3c' : '#5ab0ff', 1, 0.16); }
    // skid marks while drifting
    if (W.drift && !W.air) { const a = rear(-1), b = rear(1); skid.add(a, b, R.prevSkid); R.prevSkid = [a, b]; } else R.prevSkid = null;
    // what the rules say happened
    for (const f of W.fx) {
      if (f.n <= R.fxN) continue; R.fxN = f.n;
      const F = W.fork, b = F && F.s && E.segIndex(W.s) >= F.split ? F.s : 0; place(W, W.s + 1.5, f.x, b, POS);
      const x = POS.x, y = W.h + 0.8, z = POS.z;
      switch (f.k) {
        case 'coin': for (let i = 0; i < 10; i++) sparks.emit(x, y + 0.6, z, (Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 6, 0.25, 0.5, '#ffe066', 1, 0.6); break;
        case 'nitro': for (let i = 0; i < 18; i++) sparks.emit(x, y + 0.6, z, (Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8, 0.3, 0.6, '#5aa9ff', 1, 0.7); break;
        case 'leaves': for (let i = 0; i < 26; i++) smoke.emit(x, y, z, (Math.random() - 0.5) * 8, 2 + Math.random() * 6, (Math.random() - 0.5) * 8, 0.25, 1.2, ['#3c8a3a', '#64b852', '#c8641e', '#ffd31a', '#e63946'][i % 5], 1, 0.3, 9); break;
        case 'bump': for (let i = 0; i < 14; i++) sparks.emit(x, y, z, (Math.random() - 0.5) * 8, Math.random() * 4, (Math.random() - 0.5) * 8, 0.18, 0.4, '#ffd27a', 1, 0.5, 9); break;
        case 'sparks': for (let i = 0; i < 8; i++) sparks.emit(x, y - 0.4, z, (Math.random() - 0.5) * 3 - Math.sin(heading) * 6, Math.random() * 3, (Math.random() - 0.5) * 3 + Math.cos(heading) * 6, 0.16, 0.35, '#ffd27a', 1, 0.4, 9); break;
        case 'crash':
          for (let i = 0; i < 30; i++) sparks.emit(x, y, z, (Math.random() - 0.5) * 12, Math.random() * 8, (Math.random() - 0.5) * 12, 0.3, 0.8, ['#ffb347', '#ff6a3d', '#ffe08a'][i % 3], 1, 0.7, 9);
          for (let i = 0; i < 24; i++) smoke.emit(x, y, z, (Math.random() - 0.5) * 4, 1 + Math.random() * 3, (Math.random() - 0.5) * 4, 1.5, 3, '#777777', 0.6, 1.8);
          break;
        case 'land': for (let i = 0; i < 14; i++) smoke.emit(x + (Math.random() - 0.5) * 2, W.h + 0.2, z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 6, 1, (Math.random() - 0.5) * 6, 1.2, 1.2, '#d8d0c0', 0.5, 1.4); break;
        case 'fireworks': for (let b2 = 0; b2 < 6; b2++) { const ox = x + Math.sin(heading) * 60 + (Math.random() - 0.5) * 60, oz = z - Math.cos(heading) * 60 + (Math.random() - 0.5) * 60, oy = W.h + 30 + Math.random() * 20, cc = ['#ff5a5f', '#ffd23f', '#5aa9ff', '#7cff8a'][b2 % 4]; for (let i = 0; i < 50; i++) { const a = Math.random() * 6.28, e = Math.random() * 3.14 - 1.57, sp = 10 + Math.random() * 6; sparks.emit(ox, oy, oz, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp, Math.sin(a) * Math.cos(e) * sp, 0.7, 1.6, cc, 1, 1.2, 3); } } break;
      }
    }
  }

  function reset(W) {
    R.W = W; R.poseHi = -1; R.camInit = false; R.fxN = W.fxN || 0; R.lookKey = ''; R.look = null; R.built = 0; R.stubKey = null; R.prevSkid = null;
    for (const [, ch] of R.chunks) dropChunk(ch); R.chunks.clear();
    R.stubs.forEach((m) => { scene.remove(m); m.geometry.dispose(); }); R.stubs = [];
    for (const [, m] of traffic) scene.remove(m); traffic.clear();
    smoke.clear(); sparks.clear(); skid.clear();
    if (W.segs.length && W.segs[0].i === 0) { W.segs[0].px = 0; W.segs[0].pz = 0; W.segs[0].th = 0; }
  }
  function setSize(w, h) { if (w === R.w && h === R.h) return; R.w = w; R.h = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function quality(low) { R.low = low; renderer.shadowMap.enabled = !low; sun.castShadow = !low; R.view = low ? 650 : E.VIEW; renderer.shadowMap.needsUpdate = true; }
  return { render: render, setSize: setSize, quality: quality, reset: () => { R.W = null; }, setShake: (on) => { R.shakeOn = on; }, renderer: renderer, debugCam: (v) => { R.debugCam = v; } };
}

// ---------------------------------------------------------------- textures made on the spot
function radial(size, stops) { const c = canvas(size, size), x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach((s) => g.addColorStop(s[0], s[1])); x.fillStyle = g; x.fillRect(0, 0, size, size); return tex(c); }
function roadTexture() {   // asphalt with the lane lines: across = the road's width, along = 9 metres
  const c = canvas(256, 256), x = c.getContext('2d'), r = E.rnd(5);
  x.fillStyle = '#6a6e74'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { x.globalAlpha = 0.08 + r() * 0.12; x.fillStyle = r() < 0.5 ? '#585c62' : '#7c8086'; x.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); }
  x.globalAlpha = 1; x.fillStyle = 'rgba(40,42,46,0.25)'; x.fillRect(256 * 0.2, 0, 256 * 0.1, 256); x.fillRect(256 * 0.7, 0, 256 * 0.1, 256);   // the wheel tracks
  x.fillStyle = '#f4f4f4';
  for (const u of [1 / 3, 2 / 3]) x.fillRect(256 * u - 3, 0, 6, 256 * 0.42);   // lane dashes
  x.fillRect(4, 0, 5, 256); x.fillRect(247, 0, 5, 256);   // edge lines
  return tex(c, true);
}
function waveNormals() {
  const size = 128, c = canvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size), r = E.rnd(11), W = [];
  for (let i = 0; i < 12; i++) W.push({ fx: Math.round(1 + r() * 6) * (r() < 0.5 ? -1 : 1), fy: Math.round(1 + r() * 7), a: 0.6 / (1 + i * 0.35), p: r() * 6.28 });
  const H = (u, v) => { let s = 0; for (const w of W) s += Math.sin((w.fx * u + w.fy * v) * Math.PI * 2 + w.p) * w.a; return s; };
  const e = 1 / size;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = i / size, v = j / size, dx = (H(u + e, v) - H(u - e, v)) * 3, dy = (H(u, v + e) - H(u, v - e)) * 3, n = Math.hypot(dx, dy, 1), k = (j * size + i) * 4;
    img.data[k] = (-dx / n * 0.5 + 0.5) * 255; img.data[k + 1] = (-dy / n * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / n * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function paintSign(key) {   // the faces of the signs: gates, direction boards, the split, the 365 boards, chevrons
  const parts = key.split('|'), kind = parts[0];
  const T = (x, s, cx, cy, size, fill, weight) => { x.font = (weight || 800) + ' ' + size + 'px ' + ART.FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = fill; let w = x.measureText(s).width, max = x.canvas.width * 0.9; if (w > max) { x.font = (weight || 800) + ' ' + (size * max / w) + 'px ' + ART.FONT; } x.fillText(s, cx, cy); };
  if (kind === 'gate') {
    const c = canvas(1024, 128), x = c.getContext('2d'), k = [['START', '#d32f2f'], ['ROUND', '#1d4ed8'], ['CHECKPOINT', '#f59e0b'], ['GOAL', '#16a34a']][+parts[1] % 4];
    x.fillStyle = k[1]; x.fillRect(0, 0, 1024, 128);
    for (let i = 0; i < 32; i++) { x.fillStyle = i % 2 ? '#111' : '#fff'; x.fillRect(i * 32, 0, 32, 14); x.fillStyle = i % 2 ? '#fff' : '#111'; x.fillRect(i * 32, 114, 32, 14); }
    T(x, k[0], 512, 66, 80, '#ffffff'); return c;
  }
  if (kind === 'fsign') {
    const c = canvas(512, 224), x = c.getContext('2d'), d = +parts[1], name = parts.slice(2).join('|');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 512, 224); x.fillStyle = '#00703c'; x.fillRect(8, 8, 496, 208);
    x.save(); x.translate(d < 0 ? 70 : 442, 112); x.scale(d < 0 ? -1 : 1, 1); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(-40, -22); x.lineTo(6, -22); x.lineTo(6, -48); x.lineTo(46, 0); x.lineTo(6, 48); x.lineTo(6, 22); x.lineTo(-40, 22); x.closePath(); x.fill(); x.restore();
    const words = name.split(' ');
    if (words.length > 1) { T(x, words[0], d < 0 ? 300 : 212, 80, 64, '#ffffff'); T(x, words.slice(1).join(' '), d < 0 ? 300 : 212, 150, 64, '#ffd200'); }
    else T(x, name, d < 0 ? 300 : 212, 112, 70, '#ffffff');
    return c;
  }
  if (kind === 'nose') {
    const c = canvas(512, 308), x = c.getContext('2d'), names = parts.slice(1);
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 512, 308); x.fillStyle = '#00703c'; x.fillRect(8, 8, 496, 250);
    x.strokeStyle = '#fff'; x.lineWidth = 16; x.beginPath(); x.moveTo(256, 240); x.lineTo(256, 160); x.lineTo(180, 80); x.moveTo(256, 160); x.lineTo(332, 80); x.stroke();
    x.fillStyle = '#fff'; [[170, 70, -1], [342, 70, 1]].forEach((a) => { x.save(); x.translate(a[0], a[1]); x.rotate(a[2] * Math.PI / 4); x.beginPath(); x.moveTo(0, -26); x.lineTo(20, 8); x.lineTo(-20, 8); x.closePath(); x.fill(); x.restore(); });
    T(x, names[0] || '', 110, 190, 34, '#ffd200'); T(x, names[1] || '', 402, 190, 34, '#ffd200');
    for (let i = 0; i < 10; i++) { x.fillStyle = i % 2 ? '#111' : '#ffd200'; x.beginPath(); x.moveTo(i * 52, 308); x.lineTo(i * 52 + 26, 262); x.lineTo(i * 52 + 52, 262); x.lineTo(i * 52 + 26, 308); x.fill(); }
    return c;
  }
  if (kind === 'board' || kind === 'boardback') {
    const c = canvas(512, 256), x = c.getContext('2d');
    x.fillStyle = '#0b1f3a'; x.fillRect(0, 0, 512, 256);
    if (kind === 'boardback') return c;
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#123a6b'); g.addColorStop(1, '#0b1f3a'); x.fillStyle = g; x.fillRect(8, 8, 496, 240);
    x.fillStyle = '#ffb000'; x.beginPath(); if (x.roundRect) x.roundRect(28, 28, 100, 100, 18); else x.rect(28, 28, 100, 100); x.fill(); T(x, '365', 78, 80, 40, '#0b1f3a');
    const msgs = [['365 TECHIES', 'Computer slow? Fixed remotely'], ['365 TECHIES', 'Free games - no adverts'], ['365 PC MANAGER', 'Free for your Windows PC'], ['365 TECHIES', 'Friendly local IT help']][+parts[1] % 4];
    T(x, msgs[0], 320, 62, 44, '#ffffff'); T(x, msgs[1], 320, 110, 26, '#bfe0ff', 600);
    x.fillStyle = '#ffb000'; x.fillRect(28, 160, 456, 64); T(x, 'Ring 01202 775566', 256, 193, 40, '#0b1f3a');
    return c;
  }
  if (kind === 'chev') {
    const c = canvas(128, 104), x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, 128, 104);
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(36, 14); x.lineTo(80, 52); x.lineTo(36, 90); x.lineTo(56, 90); x.lineTo(100, 52); x.lineTo(56, 14); x.closePath(); x.fill(); return c;
  }
  if (kind === 'warn') {
    const c = canvas(384, 160), x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, 384, 160); x.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) { const o = 60 + i * 110; x.beginPath(); x.moveTo(o - 30, 24); x.lineTo(o + 20, 80); x.lineTo(o - 30, 136); x.lineTo(o - 4, 136); x.lineTo(o + 46, 80); x.lineTo(o - 4, 24); x.closePath(); x.fill(); }
    return c;
  }
  return canvas(4, 4);
}
function makeStars() {
  const n = 900, pos = new Float32Array(n * 3), r = E.rnd(21);
  for (let i = 0; i < n; i++) { const a = r() * 6.28, e = 0.05 + Math.pow(r(), 0.7) * 1.4; pos[i * 3] = Math.cos(a) * Math.cos(e) * 2400; pos[i * 3 + 1] = Math.sin(e) * 2400; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 2400; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false, depthWrite: false })); p.renderOrder = -9;
  return p;
}
function particles(n, add) {   // a pool of soft round blobs: smoke and dust (normal), sparks and flames (added light)
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n), P = [];
  for (let i = 0; i < n; i++) P.push({ life: 0, max: 0 });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('size', new THREE.BufferAttribute(size, 1)); g.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { scale: { value: 600 } }, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: 'attribute float size; attribute float alpha; varying vec3 vC; varying float vA; uniform float scale; void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d,d) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(vC, vA * (1.0 - r) * (1.0 - r)); }',
    vertexColors: true
  });
  const points = new THREE.Points(g, mat); points.frustumCulled = false;
  let next = 0;
  const C2 = new THREE.Color();
  return {
    points: points,
    emit(x, y, z, vx, vy, vz, s0, s1, hex, a0, life, grav) { const i = next; next = (next + 1) % n; const p = P[i]; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.s0 = s0; p.s1 = s1; p.a0 = a0; p.life = 0; p.max = life; p.g = grav || 0; C2.set(hex); col[i * 3] = C2.r; col[i * 3 + 1] = C2.g; col[i * 3 + 2] = C2.b; },
    update(dt) {
      for (let i = 0; i < n; i++) {
        const p = P[i];
        if (p.life >= p.max) { alpha[i] = 0; size[i] = 0; continue; }
        p.life += dt; const k = p.life / p.max; p.vy -= p.g * dt; p.vx *= 0.98; p.vz *= 0.98; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; size[i] = p.s0 + (p.s1 - p.s0) * k; alpha[i] = p.a0 * (1 - k);
      }
      g.attributes.position.needsUpdate = true; g.attributes.size.needsUpdate = true; g.attributes.alpha.needsUpdate = true; g.attributes.color.needsUpdate = true;
    },
    clear() { for (const p of P) p.life = p.max = 0; }
  };
}
function glowPoints(n) {   // halos round the lamps at night
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('size', new THREE.BufferAttribute(size, 1)); g.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { scale: { value: 600 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    vertexShader: 'attribute float size; attribute float alpha; varying vec3 vC; varying float vA; uniform float scale; void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d,d) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(vC, vA * (1.0 - r) * (1.0 - r)); }'
  });
  const points = new THREE.Points(g, mat); points.frustumCulled = false;
  const C2 = new THREE.Color();
  return { points: points, set(i, x, y, z, hex, s) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; C2.set(hex); col[i * 3] = C2.r; col[i * 3 + 1] = C2.g; col[i * 3 + 2] = C2.b; size[i] = s; alpha[i] = 0.55; },
    draw(count) { g.setDrawRange(0, count); points.visible = count > 0; for (const k of ['position', 'color', 'size', 'alpha']) g.attributes[k].needsUpdate = true; } };
}
function skidMarks() {   // dark stripes left on the road by a drift
  const N = 600, pos = new Float32Array(N * 18);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#111111', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  mesh.frustumCulled = false; let k = 0;
  const strip = (a, b, w) => { const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1, nx = -dz / L * w, nz = dx / L * w, o = (k % N) * 18; const y0 = a[1] - 0.26, y1 = b[1] - 0.26;
    pos.set([a[0] - nx, y0, a[2] - nz, b[0] - nx, y1, b[2] - nz, b[0] + nx, y1, b[2] + nz, a[0] - nx, y0, a[2] - nz, b[0] + nx, y1, b[2] + nz, a[0] + nx, y0, a[2] + nz], o); k++; };
  return { mesh: mesh, add(a, b, prev) { if (!prev) return; strip(prev[0], a, 0.14); strip(prev[1], b, 0.14); g.attributes.position.needsUpdate = true; }, clear() { pos.fill(0); g.attributes.position.needsUpdate = true; } };
}
