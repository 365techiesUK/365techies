/* 365 Invaders - THE REBOOT: the same game in 3D (9 Oct 2026; owner: "develop the games ... to show the reboot").
 * Every invader, the ship, the mystery ship, the Mothership, the bombs and the shields are built from their OWN pixel art
 * (enhanced.js) as cubes. Face-on and unlit they look exactly like the flat game; the "look" k runs from 0 (flat: a far,
 * narrow camera, no lights) to 1 (3D: the camera swings in and tilts, the lights and the glow come up, the cubes stand out
 * and the planet and the nebula appear). Hits break things into their own cubes, which tumble and bounce on the ground.
 * All the art is our own. The rules are engine.js; the scores, banners and labels stay crisp on top (enhanced.js). */
import * as THREE from 'three';
import { EffectComposer } from '../common/vendor/three-r185/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../common/vendor/three-r185/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../common/vendor/three-r185/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../common/vendor/three-r185/addons/postprocessing/OutputPass.js';
import { createSky } from './sky3d.js?v=3';

const E = window.InvEngine, X = window.InvEnh, GW = E.WIDTH, GH = E.HEIGHT, PY = E.PY, GROUND = E.GROUND;
const KIND = ['orb', 'moth', 'bot'];
const artFx = (f) => (X.ARTK[f.kind] || KIND[f.type]);   // which picture a kill / dive / armour hit was (the new kinds have their own)
const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const Q = new URLSearchParams(location.search);
const BUDGET = Math.min(12e6, +(Q.get('px') || 2.6e6));   // pixels the 3D picture may use (?px= for recordings)
// game pixels (x right, y down, 224 x 256) -> the world (x right, y up, z towards you), centred on the screen
const wx = (x) => x - GW / 2, wy = (y) => GH / 2 - y;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

// ---------------------------------------------------------------- the cube shapes, from the pixel art
const CAPCOL = {}, CAPCH = {}; Object.keys(X.CAP).forEach((k) => { CAPCOL[k] = X.CAP[k].col; CAPCH[k] = X.CAP[k].ch; });   // the same capsules as the flat look
const TPL = {};
function palOf(id) { return id.indexOf('bomb') === 0 ? X.PAL['bomb' + id.charAt(4)] : X.PAL[id.replace(/[0-9]+$/, '')]; }
const STEEL = [new THREE.Color('#8e9db6'), new THREE.Color('#65728a')];   // (darker than the flat rim: bright cubes bloom white)
function tintOf(t, col, k) { const C2 = new THREE.Color(col); return { w: t.w, h: t.h, cubes: t.cubes.map((c) => Object.assign({}, c, { col: c.col.clone().lerp(C2, k) })) }; }
function armTemplate(id) {   // armour: a steel shell one cube round the invader (the flat look's rim)
  const rows = X.ART[id], w = rows[0].length, h = rows.length, cubes = [];
  const on = (q, r) => q >= 0 && r >= 0 && q < w && r < h && rows[r].charAt(q) !== '.';
  for (let r = -1; r <= h; r++) for (let q = -1; q <= w; q++) {
    if (on(q, r)) continue;
    let near = false; for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (on(q + dx, r + dy)) { near = true; break; }
    if (near) cubes.push({ x: q + 0.5 - w / 2, y: -(r + 0.5 - h / 2), dz: 0.3, col: STEEL[(q + r) & 1], hot: false });
  }
  return { w, h, cubes };
}
// the Mothership in parts: x is from its centre, so its left gun is x < -9, the core -9..9, its right gun x > 9
const inPart = (c, part) => (part === 'L' ? c.x < -9 : part === 'R' ? c.x > 9 : c.x >= -9 && c.x <= 9);
function template(id) {
  let t = TPL[id]; if (t) return t;
  if (id.indexOf('cap|') === 0) return (TPL[id] = capTemplate(id.slice(4)));
  if (id.indexOf('arm|') === 0) return (TPL[id] = armTemplate(id.slice(4)));
  if (id.indexOf('split|') === 0) return (TPL[id] = tintOf(template(id.slice(6)), '#8cff2a', 0.5));
  if (id.indexOf('bosspart|') === 0) { const b = template('boss'), part = id.slice(9); return (TPL[id] = { w: b.w, h: b.h, cubes: b.cubes.filter((c) => inPart(c, part)) }); }
  if (id === 'bossrage') return (TPL[id] = tintOf(template('bosspart|C'), '#ff3050', 0.45));
  if (id.indexOf('dread|') === 0) return (TPL[id] = tintOf(template(id.slice(6)), '#a00014', 0.6));   // the Dreadnought (11 Oct 2026)
  if (id === 'vent') return (TPL[id] = tintOf(template('bosspart|C'), '#ff5a08', 0.78));   // the core venting after its beam: red-hot
  if (id.indexOf('rage|') === 0) return (TPL[id] = tintOf(template(id.slice(5)), '#ff2a2a', 0.55));
  if (id.indexOf('fade|') === 0) return (TPL[id] = tintOf(template(id.slice(5)), '#141030', 0.72));   // a phantom faded out
  if (id.indexOf('dmg|') === 0) return (TPL[id] = tintOf(template(id.slice(4)), '#ff3a1a', 0.4));   // a damaged carrier
  const rows = X.ART[id], pal = palOf(id), w = rows[0].length, h = rows.length, cubes = [];
  for (let r = 0; r < h; r++) for (let q = 0; q < w; q++) {
    const ch = rows[r].charAt(q); if (ch === '.') continue;
    cubes.push({ x: q + 0.5 - w / 2, y: -(r + 0.5 - h / 2), dz: ch === 'b' ? 0.45 : ch === 'c' ? -0.45 : ch === 'e' || ch === 'l' ? 0.7 : 0, col: new THREE.Color(pal[ch] || pal.a), hot: ch === 'e' || ch === 'l' });
  }
  return (TPL[id] = { w, h, cubes });
}
function capTemplate(kind) {   // a power-up capsule: a frame with its letter inside, in cubes
  const col = new THREE.Color(CAPCOL[kind]), cubes = [], w = 7, h = 9, rows = X.FONT[CAPCH[kind]];
  for (let r = 0; r < h; r++) for (let q = 0; q < w; q++) {
    const edge = r === 0 || r === h - 1 || q === 0 || q === w - 1;
    const inLetter = r >= 1 && r <= 7 && q >= 1 && q <= 5 && (rows[r - 1] & (16 >> (q - 1)));
    if (edge || inLetter) cubes.push({ x: q + 0.5 - w / 2, y: -(r + 0.5 - h / 2), dz: inLetter ? 0.6 : 0, col: inLetter ? new THREE.Color('#ffffff') : col, hot: inLetter });
  }
  return { w, h, cubes };
}

// ---------------------------------------------------------------- the canvas the 3D picture is drawn on
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ---------------------------------------------------------------- the world
export function createWorld() {
  const cv = canvas(16, 16);
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' });   // throws with no WebGL: the caller falls back to the flat picture
  renderer.setPixelRatio(1); renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, GW / GH, 10, 12000);

  // lights (all at 0 in the flat look)
  const amb = new THREE.HemisphereLight(0x8090ff, 0x200830, 0); scene.add(amb);
  const key = new THREE.DirectionalLight(0xfff2e0, 0); key.position.set(-120, 180, 260); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff4fd8, 0); rim.position.set(160, -60, -220); scene.add(rim);
  const PL = []; for (let i = 0; i < 4; i++) { const p = new THREE.PointLight(0xffffff, 0, 90, 1.6); scene.add(p); PL.push({ p, life: 0, max: 1, pow: 0 }); }

  // the cubes: one material whose glow is each cube's own colour (uEmis = how much: 1 flat, low in 3D)
  const uEmis = { value: 1 }, uHot = { value: 1 };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.15 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uEmis = uEmis;
    sh.fragmentShader = 'uniform float uEmis;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance = vColor.rgb * uEmis;\n#endif');
  };
  const box = new THREE.BoxGeometry(1, 1, 1);
  const MAXV = 7000, MAXD = 3500;
  const vox = new THREE.InstancedMesh(box, mat, MAXV); vox.instanceMatrix.setUsage(THREE.DynamicDrawUsage); vox.frustumCulled = false; scene.add(vox);
  const deb = new THREE.InstancedMesh(box, mat, MAXD); deb.instanceMatrix.setUsage(THREE.DynamicDrawUsage); deb.frustumCulled = false; scene.add(deb);
  const hot = new THREE.Color(); vox.setColorAt(0, hot); deb.setColorAt(0, hot);   // (creates the per-cube colours)
  // the ship's shield bubble and the ground's energy line
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: 0x7fe8ff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
  bubble.scale.set(11, 9, 9); scene.add(bubble);
  // the Mothership's core shield (while a gun stands) and the laser's glow
  const coreShield = new THREE.Mesh(bubble.geometry, new THREE.MeshBasicMaterial({ color: 0x7fe8ff, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false }));
  coreShield.scale.set(10, 7.5, 7); scene.add(coreShield);
  let shieldPing = 0;
  const beamGlow = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xff4f7a, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(beamGlow);
  // the Mothership's death beam (11 Oct 2026): a burning column, its glow round it
  const rayGlow = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xff2a50, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  rayGlow.visible = false; scene.add(rayGlow);
  let lastBossX = null, bossRoll = 0;
  const groundLine = new THREE.Mesh(new THREE.BoxGeometry(GW, 0.7, 0.7), new THREE.MeshBasicMaterial({ color: 0x3fd94f })); groundLine.position.set(0, wy(GROUND), 0); scene.add(groundLine);

  // the sky: streaming stars, nebulae, the planet and its moon, asteroids, comets, the jump to hyperspace (sky3d.js)
  const sky = createSky(scene, REDUCED, camera);

  // shockwave rings and bright pops where things blow up (a small pool, reused)
  const ringGeo = new THREE.RingGeometry(0.82, 1, 56), popGeo = new THREE.SphereGeometry(1, 16, 10);
  const FXM = [];
  for (let i = 0; i < 20; i++) {
    const pop = i >= 14, m = new THREE.Mesh(pop ? popGeo : ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.visible = false; scene.add(m); FXM.push({ m, pop, life: 0, max: 1, r1: 1 });
  }

  // ---------------------------------------------------------------- the thrusters (10 Oct 2026; owner: "the alien spaceships need
  // like thrusters ... fire sort of thrusters come out underneath them"): every invader hovers on two jets of fire out of
  // its underside; a diver, or one flying in, roars along nose first on a long plume out of its back; the little ones on
  // one; the Mothership on four big engines (an outer one sputters once its gun is gone); the mystery ship out of its tail;
  // your ship on a cool blue flame. Soft additive flames - white-hot at the nozzle, through the fire's colour, to red at
  // the tip - that flicker. None in the flat look (the original).
  const flameGeo = new THREE.LatheGeometry([[0.55, 0], [0.92, -0.12], [1, -0.28], [0.82, -0.5], [0.5, -0.7], [0.2, -0.88], [0.001, -1]].map((q) => new THREE.Vector2(q[0], q[1])), 14);
  const uFK = { value: 0 };
  const flameMat = new THREE.ShaderMaterial({
    uniforms: { uK: uFK },
    vertexShader: [
      'varying float vT; varying vec3 vCol; varying float vRim;',
      'void main() {',
      '  vT = -position.y;',
      '  mat4 m = modelMatrix * instanceMatrix;',
      '  vec4 wp = m * vec4(position, 1.0);',
      '  vRim = abs(dot(normalize(mat3(m) * normal), normalize(cameraPosition - wp.xyz)));',
      '#ifdef USE_INSTANCING_COLOR',
      '  vCol = instanceColor;',
      '#else',
      '  vCol = vec3(1.0, 0.55, 0.15);',
      '#endif',
      '  gl_Position = projectionMatrix * viewMatrix * wp;',
      '}'].join('\n'),
    fragmentShader: [
      'uniform float uK; varying float vT; varying vec3 vCol; varying float vRim;',
      'void main() {',
      '  float a = pow(clamp(1.0 - vT, 0.0, 1.0), 1.1) * pow(vRim, 1.1);',
      '  vec3 c = mix(vec3(1.0, 0.86, 0.6), vCol, smoothstep(0.0, 0.28, vT));',
      '  c = mix(c, vec3(0.85, 0.12, 0.04), smoothstep(0.55, 1.0, vT));',
      '  gl_FragColor = vec4(c * a * uK * 1.25, 1.0);',
      '}'].join('\n'),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  });
  const MAXF = 900;
  const flames = new THREE.InstancedMesh(flameGeo, flameMat, MAXF); flames.instanceMatrix.setUsage(THREE.DynamicDrawUsage); flames.frustumCulled = false; flames.renderOrder = 5; scene.add(flames);
  flames.setColorAt(0, new THREE.Color());
  let nf = 0;
  const FM = new THREE.Matrix4(), FQ = new THREE.Quaternion(), FD = new THREE.Vector3(), FP = new THREE.Vector3(), FS = new THREE.Vector3(), DOWN = new THREE.Vector3(0, -1, 0);
  const CORE = new THREE.Color('#ffc870'), FIRE = new THREE.Color('#ff7a1f'), ICE = new THREE.Color('#5fd8ff'), FCOL = {};
  function fireOf(art) { let c = FCOL[art]; if (!c) { c = FCOL[art] = FIRE.clone().lerp(new THREE.Color((X.PAL[art] && X.PAL[art].glow) || '#ff7a1f'), 0.22); } return c; }
  function flame(x, y, z, dx, dy, dz, r, len, col) {   // one jet at a world point, pointing (dx, dy, dz), with its white-hot core
    if (len <= 0.05) return;
    FD.set(dx, dy, dz).normalize(); FQ.setFromUnitVectors(DOWN, FD);
    if (nf < MAXF) { FP.set(x, y, z); FS.set(r, len, r); FM.compose(FP, FQ, FS); flames.setMatrixAt(nf, FM); flames.setColorAt(nf, col); nf++; }
    if (nf < MAXF) { FS.set(r * 0.34, len * 0.42, r * 0.34); FM.compose(FP, FQ, FS); flames.setMatrixAt(nf, FM); flames.setColorAt(nf, CORE); nf++; }
  }
  const JQ = new THREE.Quaternion(), JV = new THREE.Vector3(), JD = new THREE.Vector3();
  const flick = () => (REDUCED ? 1 : 0.9 + Math.random() * 0.2);   // (a jet burns steadily: only a slight flicker)
  // (11 Oct 2026; owner: "too many thrusters ... more realistic ... like the game") - one small steady jet under each
  // invader as it hovers; flying, one short plume straight back along its flight, longer the faster it goes
  function jets(id, cx, cy, o, mode, thr, col, size, vel) {
    if (K < 0.02) return;
    const t = template(id), sc = (o.scale == null ? 1 : o.scale) * (size || 1), bx = wx(cx), by = wy(cy), bz = o.z || 0;
    if (mode === 'hover') {
      EU.set(o.pitch || 0, o.yaw || 0, o.roll || 0); JQ.setFromEuler(EU);
      JV.set(0, -t.h * 0.5 * sc + 0.6, -0.4).applyQuaternion(JQ);
      JD.set(0, -0.96, -0.28).applyQuaternion(JQ);
      flame(bx + JV.x, by + JV.y, bz + JV.z, JD.x, JD.y, JD.z, 0.95 * sc, (2.2 + 2.0 * thr) * flick() * K, col);
    } else {
      let vx = vel ? vel[0] : 0, vy = vel ? vel[1] : 1; const m = Math.hypot(vx, vy);
      if (m < 0.05) { vx = 0; vy = 1; } else { vx /= m; vy /= m; }   // (game pixels, y down)
      const dx = -vx, dy = vy;   // the plume, in the world: straight back from where it's going
      flame(bx + dx * t.h * 0.42 * sc, by + dy * t.h * 0.42 * sc, bz - 0.5, dx, dy, -0.22, 1.15 * sc, (3.2 + 6 * thr) * flick() * K, col);
    }
  }
  function ringAt(cx, cy, col, r1, life, pop) {
    let F = null; for (const q of FXM) if (q.pop === !!pop && (!F || q.life < F.life)) F = q;
    F.m.material.color.set(col); F.m.position.set(wx(cx), wy(cy), pop ? 2 : 0.5); F.life = F.max = life; F.r1 = r1; F.m.visible = true;
  }

  // the glow, and the size of the picture
  const composer = new EffectComposer(renderer); composer.setPixelRatio(1);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0, 0.55, 0.62); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let RW = 0, RH = 0, LOW = false, slow = 0, lastT = 0;
  function setSize(dw, dh) {
    const cap = Math.min(1, Math.sqrt((LOW ? BUDGET * 0.45 : BUDGET) / (dw * dh))), w = Math.max(64, Math.round(dw * cap)), h = Math.max(64, Math.round(dh * cap));
    if (w === RW && h === RH) return; RW = w; RH = h;
    renderer.setSize(w, h, false); composer.setSize(w, h); bloom.resolution.set(w / 2, h / 2); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- the debris: every cube flies on its own
  const D = [];   // {x,y,z, vx,vy,vz, rx,ry,rz, ax,ay,az, s, life, max, col}
  function burst(id, cx, cy, pow, o) {   // break a picture into its cubes, from its centre (game pixels)
    o = o || {}; const t = template(id), n0 = D.length;
    for (let i = 0; i < t.cubes.length && D.length < MAXD; i++) {
      const c = t.cubes[i]; if (o.thin && Math.random() > o.thin) continue;
      const dx = c.x, dy = c.y, d = Math.hypot(dx, dy) || 1, sp2 = pow * (0.4 + Math.random() * 0.9);
      D.push({ x: wx(cx) + dx, y: wy(cy) + dy, z: c.dz, vx: dx / d * sp2 + (Math.random() - 0.5) * pow * 0.6, vy: dy / d * sp2 + (Math.random() - 0.2) * pow * 0.7, vz: (0.3 + Math.random() * 1.6) * pow * (o.toward || 1),
        rx: 0, ry: 0, rz: 0, ax: (Math.random() - 0.5) * 0.4, ay: (Math.random() - 0.5) * 0.4, az: (Math.random() - 0.5) * 0.4, s: o.size || 1, life: (o.life || 80) * (0.6 + Math.random() * 0.7), max: o.life || 80, col: c.col });
    }
    return D.length - n0;
  }
  function sparks(cx, cy, n, col, pow, life, size) {
    const C = new THREE.Color(col);
    for (let i = 0; i < n && D.length < MAXD; i++) {
      const a = Math.random() * 6.283, v = pow * (0.3 + Math.random());
      D.push({ x: wx(cx), y: wy(cy), z: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: (Math.random() - 0.3) * v, rx: 0, ry: 0, rz: 0, ax: Math.random() * 0.4, ay: Math.random() * 0.4, az: 0, s: size || 0.6, life: life * (0.6 + Math.random() * 0.6), max: life, col: C });
    }
  }
  function flashLight(cx, cy, col, pow, life) {
    let L = PL[0]; for (const p of PL) if (p.life < L.life) L = p;
    L.p.color.set(col); L.p.position.set(wx(cx), wy(cy), 14); L.life = L.max = life; L.pow = pow;
  }
  const FLOOR = wy(GROUND) + 0.5;
  function stepDebris() {
    for (let i = D.length - 1; i >= 0; i--) {
      const p = D[i];
      p.vx *= 0.985; p.vy = p.vy * 0.985 - 0.045; p.vz *= 0.985;
      p.x += p.vx; p.y += p.vy; p.z += p.vz; p.rx += p.ax; p.ry += p.ay; p.rz += p.az;
      if (p.y < FLOOR && p.vy < 0 && Math.abs(p.z) < 40) { p.y = FLOOR; p.vy = -p.vy * 0.42; p.vx *= 0.75; p.vz *= 0.75; p.ax *= 0.7; p.ay *= 0.7; }   // bounce on the ground
      if (--p.life <= 0) D.splice(i, 1);
    }
    for (const L of PL) if (L.life > 0) L.life--;
  }
  function onFx(f, W, t) {
    sky.onFx(f, t);
    switch (f.k) {
      case 'kill':
        burst(artFx(f) + '0', f.x, f.y, 1.25, { life: 90 }); sparks(f.x, f.y, 8, '#ffffff', 1.6, 18, 0.45); flashLight(f.x, f.y, X.PAL[artFx(f)].glow, 5, 14);
        ringAt(f.x, f.y, X.PAL[artFx(f)].glow, f.dive ? 22 : 15, f.dive ? 24 : 18); ringAt(f.x, f.y, '#ffffff', 5, 7, true);
        flinch(W, f.x, f.y, 30); break;
      case 'ufo': burst('saucer0', f.x, f.y, 1.6, { life: 110 }); sparks(f.x, f.y, 14, '#ffe24a', 2, 24, 0.6); flashLight(f.x, f.y, '#ff4060', 9, 20); ringAt(f.x, f.y, '#ff6070', 26, 24); ringAt(f.x, f.y, '#ffffff', 8, 9, true); break;
      case 'die': burst('ship', f.x, f.y, 2.0, { life: 130, toward: 1.3 }); sparks(f.x, f.y, 30, '#ffd84a', 2.4, 40, 0.7); flashLight(f.x, f.y, '#ff9a3d', 12, 30); ringAt(f.x, f.y, '#ffb347', 40, 32); ringAt(f.x, f.y, '#ffffff', 22, 20); ringAt(f.x, f.y, '#ffffff', 11, 12, true); break;
      case 'shield': sparks(f.x, f.y, 4, '#62f07e', 0.9, 40, 0.8); break;
      case 'ground': sparks(f.x, f.y, 5, '#ffb15c', 0.9, 26, 0.6); break;
      case 'cancel': sparks(f.x, f.y, 6, '#ffd0a0', 1.2, 20, 0.5); flashLight(f.x, f.y, '#ffd0a0', 3, 8); break;
      case 'top': sparks(f.x, f.y, 4, '#ff7a7a', 0.8, 16, 0.5); break;
      case 'collect': sparks(f.x, f.y, 18, CAPCOL[f.kind], 1.6, 30, 0.6); flashLight(f.x, f.y, CAPCOL[f.kind], 6, 18); ringAt(f.x, f.y, CAPCOL[f.kind], 20, 22); break;
      case 'capgone': sparks(f.x, f.y - 2, 5, '#8090b0', 0.6, 16, 0.5); break;
      case 'bosshit': sparks(f.x, f.y, 4, '#d2c2ff', 1.2, 16, 0.5); break;
      case 'bossboom': sparks(f.x, f.y, 14, '#ff3fd2', 1.6, 30, 0.8); flashLight(f.x, f.y, '#ff9ae8', 7, 16); break;
      case 'bossdie': burst('bosspart|C', f.x, f.y, 2.6, { life: 160, size: 1.1 }); sparks(f.x, f.y, 60, '#ffd84a', 3, 60, 0.9); flashLight(f.x, f.y, '#ffb0f0', 18, 50); ringAt(f.x, f.y, '#ffffff', 70, 44); ringAt(f.x, f.y, '#ff3fd2', 46, 36); ringAt(f.x, f.y, '#ffffff', 20, 16, true); break;
      case 'shot': if (f.kind === 'rapid') flashLight(f.x, f.y + 3, '#ffd84a', 1.2, 4); break;
      // the reboot's new play
      case 'armor': burst('arm|' + artFx(f) + (f.f || 0), f.x, f.y, 1.1, { life: 70, toward: 1.4 }); sparks(f.x, f.y, 6, '#ffffff', 1.4, 14, 0.4); flashLight(f.x, f.y, '#cfe0ff', 3, 10); ringAt(f.x, f.y, '#cfe0ff', 10, 12); knock(W, f.x, f.y); break;
      case 'dive': sparks(f.x, f.y, 6, X.PAL[artFx(f)].glow, 1, 16, 0.45); break;
      case 'snipe': sparks(f.x, f.y + 2, 4, '#ff5050', 0.9, 12, 0.4); flashLight(f.x, f.y + 2, '#ff3030', 2.5, 8); break;
      case 'carrierhit': sparks(f.x, f.y, 10, '#9fc0ff', 1.5, 22, 0.5); flashLight(f.x, f.y, '#5a8cff', 4, 10); ringAt(f.x, f.y, '#5a8cff', 11, 12); knock(W, f.x, f.y); break;
      case 'groupbonus': sparks(f.x, f.y, 24, '#ffe14a', 1.9, 34, 0.6); flashLight(f.x, f.y, '#ffe14a', 8, 20); ringAt(f.x, f.y, '#ffe14a', 26, 26); break;
      case 'split': sparks(f.x, f.y, 16, '#8cff2a', 1.6, 26, 0.6); flashLight(f.x, f.y, '#8cff2a', 5, 14); ringAt(f.x, f.y, '#8cff2a', 16, 20); break;
      case 'minikill': burst('mini0', f.x, f.y, 1.1, { life: 60 }); sparks(f.x, f.y, 4, '#ffffff', 1.2, 12, 0.4); flashLight(f.x, f.y, '#8cff2a', 3, 10); ringAt(f.x, f.y, '#8cff2a', 10, 14); break;
      case 'minigone': sparks(f.x, f.y - 2, 4, '#8cff2a', 0.6, 14, 0.5); break;
      case 'deflect': sparks(f.x, f.y, 5, '#7fe8ff', 1.2, 12, 0.4); shieldPing = 10; break;
      case 'bosspart':
        burst('bosspart|' + f.part, f.part === 'L' ? f.x + 16 : f.x - 16, f.y, 2.0, { life: 140, toward: 1.2 });
        sparks(f.x, f.y, 30, '#ffb03a', 2.2, 40, 0.7); flashLight(f.x, f.y, '#ffb03a', 14, 30); ringAt(f.x, f.y, '#ffd84a', 34, 30); ringAt(f.x, f.y, '#ffffff', 12, 12, true); break;
      case 'coreopen': sparks(f.x, f.y, 36, '#ff3fd2', 2, 36, 0.6); flashLight(f.x, f.y, '#ff3fd2', 12, 30); ringAt(f.x, f.y, '#ff3fd2', 44, 34); break;
      case 'rage': flashLight(f.x, f.y, '#ff2850', 10, 30); break;
    }
  }

  // ---------------------------------------------------------------- the invaders' life (10 Oct 2026; owner: "when they're coming
  // down and you're shooting them ... they do more"): each one hops as the march steps it along (so the classic ripple
  // runs through the formation as a wave), all pulse on the heartbeat, squash when the formation drops a row (the
  // camera thumps), kick back when they fire, flinch when a neighbour is blown up, rock back when their armour is hit,
  // warp in from deep space at the start of a wave, and the last few turn red and shake. All in game steps, so a
  // pause freezes them; none of it in the flat look (the original) or with reduced motion.
  const LIFE = new WeakMap(), SEEN = new WeakSet();
  let beatAt = -99, lastBeatN = -1, thump = 0, groundFlash = 0;
  function life(v) { let L = LIFE.get(v); if (!L) { L = { x: v.x, y: v.y, hop: -99, dir: 1, drop: -99, fl: -99, fdx: 0, fdy: 0, rc: -99, kn: -99 }; LIFE.set(v, L); } return L; }
  function flinch(W, x, y, rad) {
    if (!W || !W.invaders) return;
    for (const v of W.invaders) {
      if (!v.alive || v.dv) continue;
      const dx = v.x + 6 - x, dy = v.y + 4 - y, d = Math.hypot(dx, dy);
      if (d > rad || d < 1) continue;
      const L = life(v), k = 1 - d / rad; L.fl = W.frame; L.fdx = dx / d * (0.6 + k); L.fdy = dy / d * (0.6 + k);
    }
  }
  function knock(W, x, y) {
    if (!W || !W.invaders) return;
    let best = null, bd = 12;
    for (const v of W.invaders) { if (!v.alive) continue; const p = E.pos(v), d = Math.hypot(p.x + 6 - x, p.y + 4 - y); if (d < bd) { bd = d; best = v; } }
    if (best) life(best).kn = W.frame;
  }
  function watchFormation(W) {   // what the engine just did, read from the world: a march step, a drop, a beat, a bomb fired
    if (W.beatN !== lastBeatN) { if (lastBeatN >= 0) { beatAt = W.frame; groundFlash = 1; } lastBeatN = W.beatN; }
    let dropped = false;
    for (const v of W.invaders) {
      if (!v.alive) continue;
      const L = life(v);
      if (v.y !== L.y) { L.drop = W.frame; dropped = true; } else if (v.x !== L.x) { L.hop = W.frame; L.dir = Math.sign(v.x - L.x); }
      L.x = v.x; L.y = v.y;
    }
    if (dropped) thump = Math.max(thump, 1);
    for (const b of W.bombs) {
      if (SEEN.has(b)) continue; SEEN.add(b);
      if (b.kind === 3 || b.src === 'dive') continue;
      for (const v of W.invaders) { if (!v.alive || v.dv) continue; const q = E.pos(v); if (Math.abs(q.x + 5 - b.x) < 0.6 && Math.abs(q.y + 8 - b.y) < 4) { life(v).rc = W.frame; sparks(b.x + 1.5, b.y + 1, 3, b.kind === 4 ? '#ff4040' : X.PAL['bomb' + b.kind].a, 0.7, 10, 0.4); break; } }
    }
  }

  // ---------------------------------------------------------------- one picture
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), S = new THREE.Vector3(), R = new THREE.Quaternion(), EU = new THREE.Euler(), C = new THREE.Color();
  let n = 0, K = 1, depth = 1, gap = 1;
  function cube(x, y, z, sx, sy, sz, col, rq) {
    if (n >= MAXV) return;
    P.set(x, y, z); S.set(sx, sy, sz); M.compose(P, rq || R.identity(), S); vox.setMatrixAt(n, M); vox.setColorAt(n, col); n++;
  }
  const YAW = new THREE.Quaternion(), V3 = new THREE.Vector3();
  function sprite(id, cx, cy, o) {   // a picture's cubes at its centre (game pixels); o: {yaw, pitch, roll, scale, sy (squash), white, z}
    o = o || {}; const t = template(id), sc = (o.scale == null ? 1 : o.scale), sz = sc * gap, sy = o.sy || 1;
    EU.set(o.pitch || 0, o.yaw || 0, o.roll || 0); YAW.setFromEuler(EU);
    const baseX = wx(cx), baseY = wy(cy), baseZ = o.z || 0;
    for (let i = 0; i < t.cubes.length; i++) {
      const c = t.cubes[i]; V3.set(c.x * sc, c.y * sc * sy, c.dz * K * 1.2 * sc).applyQuaternion(YAW);
      cube(baseX + V3.x, baseY + V3.y, baseZ + V3.z, sz, sz * sy, sz * depth, o.white ? hot.set(0xffffff) : c.col, YAW);
    }
  }
  const SHC = [new THREE.Color('#c8ffd2'), new THREE.Color('#62f07e'), new THREE.Color('#3fd463'), new THREE.Color('#2aa24c')];
  let lastFrame = -1, camShake = new THREE.Vector3();
  const DIR3 = new THREE.Vector3(0, -254, 274).normalize();
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  // the demo's director camera (demo.js): cam = { zoom, fx, fy (a game point to look at), yaw, pitch } or null for the
  // standard view. It only acts in the 3D look (scaled by K), so the swing to flat always lands on the flat picture.
  const CT = new THREE.Vector3(), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
  // full screen on a phone (11 Oct 2026): info.frame = where the game screen sits in a bigger picture (fractions of it);
  // the playfield is drawn exactly as on the game screen, under it, with the space carrying on all round it
  let FR = null;
  function render(W, t, mode, info, look, fxList, cam) {
    K = ease(clamp(look, 0, 1));
    setSize(info.dw, info.dh);
    // a slow PC: a smaller picture and no glow
    if (lastT) { const dt = t - lastT; if (dt > 26 && dt < 250) slow++; else if (slow > 0) slow -= 0.5; } lastT = t;
    if (slow > 120 && !LOW) { LOW = true; RW = 0; setSize(info.dw, info.dh); if (window.console) console.info('365 Invaders 3D: a slower PC - a smaller picture'); }
    // what happened since the last picture (the title screen's demo stays still, as in the flat look)
    if (W !== render.lastW) { D.length = 0; render.lastW = W; lastFrame = W.frame; lastBeatN = -1; }
    if (!W.demo) { for (const f of fxList) onFx(f, W, t); watchFormation(W); }
    const steps = clamp(W.frame - lastFrame, 0, 8); lastFrame = W.frame;
    for (let i = 0; i < steps; i++) {
      stepDebris();
      // the laser burns where it ends; the Mothership smokes where a gun was
      if (W.beam && !W.player.dead) { sparks(W.beam.x + 0.5, W.beam.top + 1, 2, Math.random() < 0.5 ? '#ff9ab4' : '#ffffff', 1.1, 14, 0.4); flashLight(W.beam.x + 0.5, W.beam.top + 2, '#ff4f7a', 3, 3); }
      const B = W.boss;
      if (B && !B.dead && W.intro === 0 && (W.frame + i) % 4 === 0) {
        if (B.L.hp <= 0) sparks(B.x + 15, B.y + 10, 1, Math.random() < 0.6 ? '#3a3f4c' : '#ff8a3d', 0.5, 30, 0.8);
        if (B.R.hp <= 0) sparks(B.x + 33, B.y + 10, 1, Math.random() < 0.6 ? '#3a3f4c' : '#ff8a3d', 0.5, 30, 0.8);
      }
      if (shieldPing > 0) shieldPing--;
      for (const q of FXM) if (q.life > 0) q.life--;
      thump *= 0.8; groundFlash *= 0.86;
    }
    depth = lerp(0.18, 1.5, K); gap = lerp(1.0, 0.88, K); uEmis.value = lerp(1.0, 0.3, K);
    // the camera: far and narrow (flat) -> close, low and tilted (3D) - a dolly zoom as it swings in
    // a dolly zoom: the lens widens as the camera tilts and comes in, keeping the playfield framed the whole way
    const fov = Math.exp(lerp(Math.log(5), Math.log(42), K)) + (REDUCED ? 0 : sky.warp * 9 * K), drift = REDUCED ? 0 : 1;
    const tgt = new THREE.Vector3(0, lerp(0, 22, K), lerp(0, -12, K));
    const dir = new THREE.Vector3(0, 0, 1).lerp(DIR3, K).normalize();
    let dist = (lerp(GH + 6, 292, K) / 2) / Math.tan(fov * Math.PI / 360);
    if (cam && K > 0.001) {   // the director's shot: look at a point, come in closer, turn about it
      if (cam.fx != null) { CT.set(wx(cam.fx), wy(cam.fy), 0); tgt.lerp(CT, K); }
      if (cam.pitch) dir.applyAxisAngle(AX, cam.pitch * K);
      if (cam.yaw) dir.applyAxisAngle(AY, cam.yaw * K);
      dist /= lerp(1, cam.zoom || 1, K);
    }
    const pos = tgt.clone().addScaledVector(dir, dist); pos.x += Math.sin(t / 4200) * 8 * drift * K;
    const dF = dist;
    const sh = X.shake ? X.shake() : 0;
    if (sh > 0 && info.set && info.set.shake && !REDUCED && mode === 'play') camShake.set((Math.random() * 2 - 1) * sh * 0.8, (Math.random() * 2 - 1) * sh * 0.8, 0); else camShake.set(0, 0, 0);
    if (thump > 0.02 && !REDUCED && info.set && info.set.shake) camShake.y -= thump * 1.6 * K;
    camera.fov = fov; camera.position.copy(pos).add(camShake); camera.lookAt(tgt.add(camShake)); camera.updateProjectionMatrix();
    camera.near = Math.max(2, dF - 700); camera.far = dF + 5200; camera.updateProjectionMatrix();
    FR = info.frame || null;
    if (FR) {   // the same lens for the game screen's part of the picture, carried on out to the edges of the whole screen
      const nr = camera.near, t0 = nr * Math.tan(fov * Math.PI / 360), r0 = t0 * (FR.w * RW) / (FR.h * RH), sx = 2 * r0 / FR.w, sy = 2 * t0 / FR.h;
      camera.projectionMatrix.makePerspective(-r0 - FR.x * sx, r0 + (1 - FR.x - FR.w) * sx, t0 + FR.y * sy, -t0 - (1 - FR.y - FR.h) * sy, nr, camera.far);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    }
    // the lights, the glow, the sky
    amb.intensity = 0.55 * K; key.intensity = 1.9 * K; rim.intensity = 1.5 * K;
    amb.color.set(W.slow > 0 && !W.demo ? 0xb48cff : 0x8090ff);   // slow time: a violet cast
    for (const L of PL) L.p.intensity = L.life > 0 ? L.pow * 220 * (L.life / L.max) * K : 0;
    bloom.strength = LOW ? 0 : lerp(0.15, 0.7, K); bloom.threshold = lerp(0.92, 0.8, K);
    const kN = smooth(0.35, 1, K), kP = smooth(0.72, 1, K);   // the sky arrives at the end of the swing (narrow lenses magnify it)
    sky.update(t, K, kN, kP, W, Math.max(1, RH / 760));
    groundLine.material.color.set(K > 0.5 ? 0x45f08a : 0x3fd94f).lerp(C.set(0xd8ffe0), groundFlash * 0.7 * K);   // (it flashes on the heartbeat)
    // ---- the cubes
    n = 0; nf = 0; R.identity(); uFK.value = K;
    const sway = REDUCED ? 0 : K;
    // the mystery ship
    if (W.saucer) {
      const U = W.saucer, so = { yaw: Math.sin(t / 300) * 0.5 * sway };
      sprite('saucer' + ((W.frame >> 3) & 1), U.x + 8, E.SAUCER_Y + 3.5, so);
      if (K > 0.02) flame(wx(U.x + 8 - U.dir * 8), wy(E.SAUCER_Y + 4), -0.5, -U.dir, -0.05, -0.25, 1.2, (4.5 + Math.random() * 1.2) * K, fireOf('saucer'));
    }
    // the Mothership: its body and core, and whichever guns it still has (each flashes on its own when hit)
    coreShield.visible = false;
    if (!W.boss) { rayGlow.visible = false; lastBossX = null; }
    if (W.boss) {
      const B = W.boss; let x = B.x + 24, y = B.y + 10;
      if (W.intro > 0) y -= (W.intro / 150) * 75;
      if (B.dead) { x += (Math.random() - 0.5) * 2; y += (Math.random() - 0.5) * 2; }
      const bvx = lastBossX == null ? 0 : B.x - lastBossX; lastBossX = B.x;
      bossRoll += (clamp(-bvx * 0.22, -0.42, 0.42) - bossRoll) * 0.15;   // (it banks into a dash or a charge)
      const o = { yaw: Math.sin(t / 900) * 0.25 * sway, pitch: -0.2 * K + (B.oy || 0) * 0.007 * K, roll: bossRoll * sway }, gunHit = B.L.flash > 3 || B.R.flash > 3;
      const rage = B.phase === 3 && !B.dead && ((t / 140) | 0) % 2 === 0, pre = B.tier === 2 ? 'dread|' : '';
      sprite(B.vent > 0 && ((t / 90) | 0) % 2 === 0 ? 'vent' : pre + (rage ? 'bossrage' : 'bosspart|C'), x, y, Object.assign({ white: B.flash > 3 && !gunHit }, o));
      if (B.L.hp > 0) sprite(pre + 'bosspart|L', x, y, Object.assign({ white: B.L.flash > 3 }, o));
      if (B.R.hp > 0) sprite(pre + 'bosspart|R', x, y, Object.assign({ white: B.R.flash > 3 }, o));
      rayGlow.visible = false;
      if (!B.dead && W.intro === 0) {
        const R = B.ray, cx = B.x + B.w / 2, by = B.y + B.h - 2;
        if (R && R.st === 'charge') {   // charging: a glow gathering under it, and the line it will fire down, flickering
          const k = R.t / R.n;
          if (W.frame % 3 === 0) flashLight(cx, by, '#ff3050', 2 + 6 * k, 6);
          if (K > 0.02 && (W.frame >> 1) & 1) cube(wx(cx), wy((by + GROUND) / 2), 0, 0.35, GROUND - by, 0.35, C.set(0xff6070));
          if (!REDUCED && W.frame % 2 === 0) sparks(cx + (Math.random() - 0.5) * 12, by + 2, 1, Math.random() < 0.5 ? '#ff3050' : '#ffffff', 0.4, 12, 0.35);
        } else if (R && R.st === 'fire') {   // firing: a white-hot core in a red glow, burning where it meets the ground
          const h = GROUND - by, fl = 0.85 + 0.15 * Math.sin(t / 22);
          cube(wx(cx), wy(by + h / 2), 0, 1.4, h, 1.4, hot.set(0xffffff));
          rayGlow.visible = true; rayGlow.position.set(wx(cx), wy(by + h / 2), 0); rayGlow.scale.set(4.2 * fl, h, 4.2 * fl); rayGlow.material.opacity = 0.42 + 0.12 * fl;
          if (W.frame % 2 === 0) { sparks(cx, GROUND - 2, 2, Math.random() < 0.5 ? '#ffb070' : '#ff4030', 1.6, 20, 0.5); flashLight(cx, GROUND - 4, '#ff5030', 6, 4); }
        }
        if (B.vent > 0 && !REDUCED && W.frame % 4 === 0) sparks(cx + (Math.random() - 0.5) * 18, B.y + 6, 1, Math.random() < 0.6 ? '#b8b8c4' : '#ffb070', 0.35, 30, 0.6);   // steam off it
      }
      if (K > 0.02 && !B.dead) {   // four big engines under it (coming down: full burn); an outer one sputters once its gun is gone
        const bt = template('boss'), burn = W.intro > 0 ? 2.4 : 1 + (B.phase === 3 ? 0.5 : 0) + (B.mv && B.mv.k !== 'swoop' ? 0.9 : 0);   // (full burn in a dash or a charge)
        EU.set(o.pitch || 0, o.yaw || 0, o.roll || 0); JQ.setFromEuler(EU);
        [-0.36, -0.13, 0.13, 0.36].forEach((u, j) => {
          const gone = (j === 0 && B.L.hp <= 0) || (j === 3 && B.R.hp <= 0);
          if (gone && Math.random() < 0.6) return;
          JV.set(u * bt.w, -bt.h * 0.5 + 1, -1).applyQuaternion(JQ); JD.set(0, -0.85, -0.5).applyQuaternion(JQ);
          flame(wx(x) + JV.x, wy(y) + JV.y, JV.z, JD.x, JD.y, JD.z, (gone ? 1.2 : 2.1), (gone ? 3 : 5 + 4 * burn) * flick() * K, gone ? FIRE : fireOf('boss'));
        });
      }
      if (B.phase === 1 && !B.dead) {
        coreShield.visible = true; coreShield.position.set(wx(x), wy(y + 1), 3 * K);
        coreShield.material.opacity = (0.1 + 0.05 * Math.sin(t / 140) + shieldPing * 0.03) * (0.4 + 0.6 * K);
      }
    }
    // the invaders: alive (see "the invaders' life"); armour is a steel shell, splitters glow green
    const list = W.order.length ? W.order : null, nInv = list ? list.length : W.invaders.length;   // (the bonus stage has no formation: everyone flies)
    const shown = W.demo || !list ? W.invaders.length : W.phase === 'spawn' ? W.spawnN : W.invaders.length, fr = W.frame, lv = REDUCED ? 0 : K;
    let left = 0; if (!W.boss) for (const v of W.invaders) if (v.alive && !v.dv) left++;
    const angry = left > 0 && left <= 4 && W.phase === 'play', ab = fr - beatAt, beat = ab >= 0 && ab < 12 ? Math.exp(-ab / 3) : 0;
    for (let i = 0; i < nInv; i++) {
      const v = W.invaders[list ? list[i] : i]; if (!v.alive || i >= shown) continue;
      const ag = !v.dv && !W.demo ? (v.ang || 0) : 0;   // ANGER (11 Oct 2026): 0 at the top, 1 just above the shields
      if (v.dv && (v.dv.ph === 'fly' || v.dv.ph === 'enter') && (!v.dv.on || v.dv.t < 0)) continue;   // (a bonus-stage flyer, or one of the swarm, not yet on its way)
      const art = X.artOf(v), id = art + v.f;
      let o;
      if (v.dv) {   // a diver (or a bonus-stage flyer): turned down its path, banking, lifted towards you
        const ang = X.diveAngle(v), d = v.dv;
        const swoop = d.ph === 'enter' ? smooth(90, 160, d.y + 4) : 0;   // (the swarm swoops low and close past you)
        const face = d.entry || d.ph === 'fly';   // (the swarm and the bonus flyers face you and bank; a diver turns down its path)
        o = { cx: d.x + 6, cy: d.y + 4, roll: -ang, yaw: Math.sin(ang) * (face ? 0.3 : 0.7) * K, pitch: -0.25 * K, z: (7 + 9 * swoop) * K };
        if (!W.demo && (fr + v.c * 3 + v.r) % (d.entry || d.ph === 'fly' ? 6 : 3) === 0 && lv) sparks(d.x + 6 - (d.vx || 0) * 2, d.y + 4 - (d.vy || 0) * 2, 1, d.entry || d.ph === 'dive' ? (Math.random() < 0.5 ? '#ffb347' : '#ff7a2a') : X.PAL[art].glow, 0.18, 12, 0.35);   // its trail: an ember now and then, off the back
      } else {
        const L = life(v);
        let dx = 0, dy = 0, dz = 0, roll = 0, pitch = 0, sy = 1, sc2 = 1 + 0.07 * beat * lv, white = false;
        // warp in from deep space (the flat look keeps the old drop from above)
        if (!W.demo) {
          const age = fr - (W.spawnAt + i + 1);
          if (age < 34) {
            const k2 = Math.max(0, age) / 34, e = 1 - Math.pow(1 - k2, 3);
            dy = -(1 - e) * 46 * (1 - K); dz = -(1 - e) * 460 * K; dx = (v.c - 5) * 16 * (1 - e) * K; sc2 *= 0.35 + 0.65 * e;
            if (K > 0.05 && age >= 0 && age < 30) cube(wx(v.x + 6 + dx), wy(v.y + 4), dz - 30 * (1 - e) - 4, 0.5, 0.5, 70 * (1 - e) + 2, C.set(X.PAL[art].glow));   // (its light trail)
            if (age === 33 && K > 0.05) ringAt(v.x + 6, v.y + 4, X.PAL[art].glow, 9, 12);
          }
        }
        // the march: a hop with each step, tipping the way it goes; a squash when the formation drops a row
        const ah = fr - L.hop; if (ah >= 0 && ah < 8) { const k3 = ah / 8, s = Math.sin(k3 * Math.PI); dy -= 1.5 * s * lv; sy *= 1 + 0.12 * s * lv; roll -= L.dir * 0.2 * (1 - k3) * lv; }
        const ad = fr - L.drop; if (ad >= 0 && ad < 14) { const s = Math.sin(ad / 14 * Math.PI); sy *= 1 - 0.3 * s * lv; sc2 *= 1 + 0.08 * s * lv; }
        // firing: a kick; a neighbour blown up: a flinch away; armour hit: rocked back with a flash
        const ar = fr - L.rc; if (ar >= 0 && ar < 10) { const k3 = 1 - ar / 10; sy *= 1 + 0.32 * k3 * Math.cos(ar * 0.9) * lv; dy -= 1.4 * k3 * lv; }
        const af = fr - L.fl; if (af >= 0 && af < 16) { const e = Math.exp(-af / 4) * Math.cos(af * 0.8); dx += L.fdx * 2.4 * e * lv; dy += L.fdy * 2.4 * e * lv; roll += L.fdx * 0.35 * e * lv; }
        const ak = fr - L.kn; if (ak >= 0 && ak < 16) { const e = Math.exp(-ak / 4); dz -= 7 * e * lv; pitch += 0.7 * e * lv; white = ak < 3; }
        // the last few: red, shaking, faster
        if (angry && lv) { dx += (Math.random() - 0.5) * 0.9 * lv; dy += (Math.random() - 0.5) * 0.9 * lv; }
        // the lower they get, the angrier (owner: "shaking and thrashing ... as they get closer"): shaking, thrashing, straining
        if (ag > 0.02 && lv) {
          dx += (Math.random() - 0.5) * (0.4 + 2.4 * ag) * ag * lv; dy += (Math.random() - 0.5) * 1.8 * ag * lv;
          roll += Math.sin(t / (60 - 34 * ag) + v.c * 1.3) * 0.5 * ag * lv; pitch += Math.sin(t / 75 + v.r) * 0.25 * ag * lv;
          sy *= 1 + 0.1 * ag * Math.sin(t / 42 + v.c) * lv; sc2 *= 1 + 0.06 * ag;
          if (ag > 0.55 && (fr + v.c * 7) % 11 === 0) sparks(v.x + 6 + (v.wx || 0), v.y + 8 + (v.wy || 0), 1, Math.random() < 0.5 ? '#ff4030' : '#ffb347', 0.3, 14, 0.4);   // (sparks off them)
        }
        // the weave: where the engine says it is, banking into it
        dx += v.wx || 0; dy += v.wy || 0; roll -= clamp((v.wvx || 0) * 3, -0.3, 0.3) * lv;
        o = { cx: v.x + 6 + dx, cy: v.y + 4 + dy, yaw: Math.sin(t / 520 + v.c * 0.55 + v.r) * 0.38 * sway, pitch: Math.sin(t / 700 + v.r) * 0.12 * sway + pitch,
          roll: roll, scale: sc2, sy: sy, white: white, z: Math.sin(t / 480 + v.c * 0.4) * 2.2 * sway + dz };
      }
      if (v.split) o.scale = (o.scale == null ? 1 : o.scale) * (1 + 0.06 * Math.sin(t / 120 + v.c * 1.7));
      const rage = (angry && !v.dv && lv && ((t / 130) | 0) % 2 === 0) || (ag > 0.35 && lv && (ag > 0.82 || ((t / (230 - 160 * ag)) | 0) % 2 === 0));   // (red with rage: flashing, then solid)
      let tpl = rage ? 'rage|' + id : v.split ? 'split|' + id : v.kind === 'carrier' && v.hp < 3 && (v.hp === 1 || ((t / 200) | 0) % 2) ? 'dmg|' + id : id;
      const pa = X.phantomAlpha(W, v);
      if (pa < 0.99) {   // a phantom fading: it flickers out as a dark ghost (shots go through it)
        if (pa < 0.5 && ((t / 70) | 0) % 3 === 0) continue;
        tpl = pa < 0.5 ? 'fade|' + id : ((t / 50) | 0) % 2 ? 'fade|' + id : id; o.scale = (o.scale == null ? 1 : o.scale) * (0.9 + 0.1 * pa);
      }
      sprite(tpl, o.cx, o.cy, o);
      if (v.armor) sprite('arm|' + id, o.cx, o.cy, o);
      if (K > 0.02 && pa > 0.5) {   // its thrusters
        const d = v.dv;
        if (d) { const spd = Math.hypot(d.vx || 0, d.vy || 0); jets(id, o.cx, o.cy, o, 'rocket', clamp(spd / 3.5, 0.2, 1), fireOf(art), v.kind === 'carrier' ? 1.2 : 1, [d.vx || 0, d.vy || 1]); }
        else jets(id, o.cx, o.cy, o, 'hover', (angry ? 0.8 : 0.25) + 0.25 * beat * lv + Math.min(0.3, Math.abs(v.wvx || 0) * 3) + 0.9 * ag, fireOf(art), v.kind === 'carrier' ? 1.2 : 1);   // (engines revving as they get angry)
      }
    }
    // the little ones
    for (const mn of W.minis) {
      const mo = { roll: clamp(-mn.vx * 0.35, -0.6, 0.6), yaw: Math.sin(t / 160 + mn.x) * 0.5 * K, z: 4 * K };
      sprite('mini' + mn.f, mn.x + 3, mn.y + 2.5, mo);
      jets('mini' + mn.f, mn.x + 3, mn.y + 2.5, mo, 'rocket', 0.5, fireOf('mini'), 0.7, [mn.vx || 0, mn.vy || 1]);
    }
    // the shields, cube by cube (they wear away as they are hit)
    for (const Sh of W.shields) for (let yy = 0; yy < Sh.h; yy++) for (let xx = 0; xx < Sh.w; xx++) {
      if (!Sh.px[yy * Sh.w + xx]) continue;
      const edge = yy === 0 || !Sh.px[(yy - 1) * Sh.w + xx];
      cube(wx(Sh.x + xx + 0.5), wy(Sh.y + yy + 0.5), 0, gap, gap, gap * depth * 1.6, edge ? SHC[0] : yy < 5 ? SHC[1] : yy < 11 ? SHC[2] : SHC[3]);
    }
    // the power-up capsules
    for (const c of W.caps) sprite('cap|' + c.kind, c.x, c.y, { yaw: (t / 300) * K + Math.sin(c.t / 9) * 0.3, z: 2 * K });
    // bombs
    for (const b of W.bombs) {
      if (b.kind === 3) { cube(wx(b.x + 1.5), wy(b.y + 2), 0, 2.4, 2.4, 2.4, hot.set(0xff3fd2)); continue; }
      if (b.kind === 4) { R.setFromEuler(EU.set(0, 0, Math.atan2(b.dx || 0, 1))); cube(wx(b.x + 1.5), wy(b.y + 3), 0, 1.1, 6, 1.1, hot.set(0xff3030), R); R.identity(); continue; }   // a sniper's bolt, along its line
      sprite('bomb' + b.kind + ((b.f >> 3) & 1), b.x + 1.5, b.y + 3.5, { yaw: t / 120 * K });
    }
    // your shots: thin bright beams
    const pc = W.power && W.power.kind === 'rapid' ? C.set(0xffe48a) : C.set(0xbff6ff);
    for (const s of W.shots) { cube(wx(s.x + 0.5), wy(s.y + 2.5), 0, 0.7, 5, 0.7, s.spread ? hot.set(0x9ff2ff) : pc); if (K > 0.05) cube(wx(s.x + 0.5), wy(s.y + 9), -0.3, 0.4, 8 * K, 0.4, C.set(0x2a6a80)); }
    // the laser: a white-hot core in a pink glow, from the ship to what it is burning
    const Bm = W.beam; beamGlow.visible = !!(Bm && !W.player.dead);
    if (beamGlow.visible) {
      const h = PY - 1 - Bm.top, fl = 0.85 + 0.15 * Math.sin(t / 25);
      cube(wx(Bm.x + 0.5), wy(Bm.top + h / 2), 0, 1.1, h, 1.1, hot.set(0xffffff));
      beamGlow.position.set(wx(Bm.x + 0.5), wy(Bm.top + h / 2), 0); beamGlow.scale.set(2.4 * fl, h, 2.4 * fl); beamGlow.material.opacity = 0.35 + 0.15 * fl;
    }
    // the ship, its engine and its shield bubble
    const Pl = W.player, showShip = !Pl.dead && !W.over && !(W.hold > 0 && (W.hold >> 2) & 1);
    if (showShip) {
      const lean = REDUCED ? 0 : clamp(-(Pl.vx || 0) * 0.25, -0.35, 0.35) * K;
      sprite('ship', Pl.x + 6.5, PY + 4, { roll: lean, pitch: -0.15 * K });
      const fl = 1.5 + Math.random() * 2 + Math.abs(Pl.vx || 0);
      if (K < 0.5) cube(wx(Pl.x + 6.5), wy(PY + 8.5 + fl / 2), -0.5, 1.6, fl * (1 - K * 2), 1.6, hot.set(0xffb347));   // (the flat look's flicker)
      if (K > 0.02) flame(wx(Pl.x + 6.5), wy(PY + 7.5), -0.5, -lean * 0.6, -1, -0.35, 1.5, (3.5 + fl * 0.9) * K, ICE);
    }
    bubble.visible = !!(showShip && W.shieldUp); if (bubble.visible) { bubble.position.set(wx(Pl.x + 6.5), wy(PY + 3.5), 0); bubble.material.opacity = 0.14 + 0.08 * Math.sin(t / 160); }
    vox.count = n; vox.instanceMatrix.needsUpdate = true; if (vox.instanceColor) vox.instanceColor.needsUpdate = true;
    flames.count = nf; flames.instanceMatrix.needsUpdate = true; if (flames.instanceColor) flames.instanceColor.needsUpdate = true;
    // the debris
    let m = 0;
    for (const p of D) {
      const fade = p.life < 18 ? p.life / 18 : 1, s = p.s * fade * lerp(1, 0.92, K);
      EU.set(p.rx, p.ry, p.rz); R.setFromEuler(EU); P.set(p.x, p.y, p.z); S.set(s, s, s * lerp(0.3, 1, K)); M.compose(P, R, S);
      deb.setMatrixAt(m, M); deb.setColorAt(m, p.col); m++;
    }
    deb.count = m; deb.instanceMatrix.needsUpdate = true; if (deb.instanceColor) deb.instanceColor.needsUpdate = true;
    for (const q of FXM) {
      if (q.life <= 0) { q.m.visible = false; continue; }
      const k = 1 - q.life / q.max, e = 1 - Math.pow(1 - k, 3);
      if (q.pop) { const s = q.r1 * (1 - k * 0.7); q.m.scale.set(s, s, s); q.m.material.opacity = (1 - k) * 0.9; }
      else { const s = 1 + (q.r1 - 1) * e; q.m.scale.set(s, s, 1); q.m.material.opacity = (1 - k) * 0.85; }
    }
    R.identity();
    composer.render();
    return cv;
  }
  // where a game point is on the screen now (game pixels), so labels and scores can sit over the 3D picture
  const PV = new THREE.Vector3();
  function project(x, y) {
    PV.set(wx(x), wy(y), 0).project(camera); let sx = (PV.x + 1) / 2, sy = (1 - PV.y) / 2;
    if (FR) { sx = (sx - FR.x) / FR.w; sy = (sy - FR.y) / FR.h; }   // (full screen: back to the game screen's own pixels)
    return { x: sx * GW, y: sy * GH };
  }
  return { render, project, canvas: cv };
}
