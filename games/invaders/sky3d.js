/* 365 Invaders - the REBOOT's sky (10 Oct 2026; owner: "the background is supposed to be in space and it's just
 * static ... some kind of movement ... so it looks premium"). Everything behind the playfield moves: three depths of
 * stars stream past (the near ones faster), two layers of nebula drift, the planet turns under its own clouds, a moon
 * goes round, cube asteroids tumble by far behind, the odd comet crosses - and when a wave is cleared the whole sky
 * jumps to hyperspace, the stars stretching into streaks, and the next wave arrives in a new-coloured sector (the
 * Mothership's are red). Big explosions light the sky. It all moves only in the 3D look: the swing to flat lands on
 * the still black sky of the original. Reduced motion: no streaming, no jumps. Everything is drawn in code. */
import * as THREE from 'three';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const lerp = (a, b, k) => a + (b - a) * k;

// ---------------------------------------------------------------- pictures painted in code
function nebulaTex() {
  const c = canvas(1024, 1024), x = c.getContext('2d'), r = rng(365);
  const gr = x.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, '#05020f'); gr.addColorStop(0.6, '#090a26'); gr.addColorStop(1, '#03040b');
  x.fillStyle = gr; x.fillRect(0, 0, 1024, 1024);
  [[0.25, 0.32, 0.5, 'rgba(140,50,230,0.30)'], [0.8, 0.5, 0.42, 'rgba(30,160,230,0.22)'], [0.55, 0.15, 0.32, 'rgba(230,60,180,0.18)'], [0.15, 0.78, 0.3, 'rgba(50,100,240,0.16)'], [0.62, 0.7, 0.26, 'rgba(255,120,60,0.08)']].forEach((n) => {
    const g2 = x.createRadialGradient(n[0] * 1024, n[1] * 1024, 0, n[0] * 1024, n[1] * 1024, n[2] * 1024); g2.addColorStop(0, n[3]); g2.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g2; x.fillRect(0, 0, 1024, 1024);
  });
  for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(200,210,255,' + (0.05 + r() * 0.25).toFixed(2) + ')'; const s = r() < 0.06 ? 2 : 1; x.fillRect(r() * 1024, r() * 1024, s, s); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function wispTex() {   // soft clouds, white on black, that tile (the sector's colour tints them)
  const N = 512, c = canvas(N, N), x = c.getContext('2d'), r = rng(911);
  x.fillStyle = '#000'; x.fillRect(0, 0, N, N); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 120; i++) {
    const cx = r() * N, cy = r() * N, rad = 18 + Math.pow(r(), 2) * 160, a = (0.02 + r() * 0.07).toFixed(3);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {   // drawn wrapped round, so the picture tiles
      const px = cx + ox * N, py = cy + oy * N; if (px + rad < 0 || px - rad > N || py + rad < 0 || py - rad > N) continue;
      const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, 'rgba(255,255,255,' + a + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function planetTex() {   // oceans, land, cloud and the lights of the cities - our own made-up world
  const W = 1024, H = 512, c = canvas(W, H), x = c.getContext('2d'), r = rng(2026);
  const oc = x.createLinearGradient(0, 0, 0, H); oc.addColorStop(0, '#0b2c52'); oc.addColorStop(0.5, '#0d3b6a'); oc.addColorStop(1, '#082340');
  x.fillStyle = oc; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    const cx = r() * W, cy = H * (0.2 + r() * 0.6), rad = 20 + r() * 70;
    const g2 = x.createRadialGradient(cx, cy, 0, cx, cy, rad); const col = r() < 0.6 ? '58,120,70' : '150,130,80';
    g2.addColorStop(0, 'rgba(' + col + ',0.95)'); g2.addColorStop(0.7, 'rgba(' + col + ',0.6)'); g2.addColorStop(1, 'rgba(' + col + ',0)'); x.fillStyle = g2; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 600; i++) { x.fillStyle = 'rgba(255,214,140,' + (0.3 + r() * 0.6).toFixed(2) + ')'; x.fillRect(r() * W, H * (0.25 + r() * 0.5), 1.5, 1.5); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}
function cloudTex() {   // the planet's weather, on its own layer so it drifts over the land
  const W = 1024, H = 512, c = canvas(W, H), x = c.getContext('2d'), r = rng(77);
  for (let i = 0; i < 160; i++) {
    const cx = r() * W, cy = H * (0.1 + r() * 0.8), rw = 30 + r() * 140, rh = 5 + r() * 18, a = (0.08 + r() * 0.2).toFixed(2);
    for (const ox of [-W, 0, W]) { x.fillStyle = 'rgba(255,255,255,' + a + ')'; x.beginPath(); x.ellipse(cx + ox, cy, rw, rh, (r() - 0.5) * 0.3, 0, 6.3); x.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}
function moonTex() {
  const W = 512, H = 256, c = canvas(W, H), x = c.getContext('2d'), r = rng(808);
  x.fillStyle = '#8d8a86'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const cx = r() * W, cy = r() * H, rad = 3 + Math.pow(r(), 2) * 30;
    x.fillStyle = 'rgba(40,38,36,' + (0.15 + r() * 0.3).toFixed(2) + ')'; x.beginPath(); x.arc(cx, cy, rad, 0, 6.3); x.fill();
    x.strokeStyle = 'rgba(220,215,205,0.25)'; x.lineWidth = 1.5; x.beginPath(); x.arc(cx - 1, cy - 1, rad, 3.6, 5.6); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}

// each wave a new sector of space; the Mothership's are red
const SECTORS = ['#7c4dff', '#1fd1c1', '#ff3d78', '#ffae3a', '#3dff8a', '#3d8bff', '#ff4fd8', '#c8ff3d'];
const sectorOf = (wave) => (wave % 5 === 0 ? '#ff2a2a' : SECTORS[(wave - 1 - Math.floor(wave / 5)) % SECTORS.length]);

const STAR_V = 'attribute vec3 aCol; attribute float aPh; uniform float uScroll; uniform float uH; uniform float uSize; uniform float uTime;'
  + 'varying vec3 vC; varying float vA;'
  + 'void main(){ vec3 p = position; float par = 600.0 / -p.z; p.y = mod(p.y - uScroll * par + uH * 0.5, uH) - uH * 0.5;'
  + ' gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); gl_PointSize = uSize * (0.6 + 0.45 * min(par, 2.0));'
  + ' vC = aCol; vA = 0.7 + 0.3 * sin(uTime * (0.6 + aPh * 1.4) + aPh * 40.0); }';
const STAR_F = 'uniform float uOpacity; varying vec3 vC; varying float vA;'
  + 'void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(vC * vA, smoothstep(0.5, 0.05, d) * uOpacity); }';
const STREAK_V = 'attribute vec3 aCol; attribute float aEnd; uniform float uScroll; uniform float uH; uniform float uStreak;'
  + 'varying vec3 vC; varying float vE;'
  + 'void main(){ vec3 p = position; float par = 600.0 / -p.z; p.y = mod(p.y - uScroll * par + uH * 0.5, uH) - uH * 0.5;'
  + ' p.y += aEnd * uStreak * par; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); vC = aCol; vE = aEnd; }';
const STREAK_F = 'uniform float uWarp; varying vec3 vC; varying float vE; void main(){ gl_FragColor = vec4(vC * 1.5, uWarp * (1.0 - vE)); }';
// hyperspace: lines in a ring round the camera rushing at it - they burst out from the middle of the picture
const TUNNEL_V = 'attribute vec3 aA; attribute float aEnd; uniform float uT; uniform float uLen; varying float vE; varying float vZ;'
  + 'void main(){ float z = -3200.0 + mod(aA.z + uT, 3100.0); z -= aEnd * uLen; gl_Position = projectionMatrix * modelViewMatrix * vec4(aA.x, aA.y, z, 1.0); vE = aEnd; vZ = z; }';
const TUNNEL_F = 'uniform float uWarp; uniform vec3 uCol; varying float vE; varying float vZ;'
  + 'void main(){ float a = uWarp * (1.0 - vE) * smoothstep(-3200.0, -2500.0, vZ) * smoothstep(-20.0, -260.0, vZ); gl_FragColor = vec4(mix(uCol, vec3(1.0), 0.55) * 1.6, a); }';

export function createSky(scene, REDUCED, camera) {
  const r = rng(7);
  // ---- stars: three depths, streaming past; the nearest 1,000 also have streaks for hyperspace
  const NS = 2600, H = 2800, sp = new Float32Array(NS * 3), sc = new Float32Array(NS * 3), ph = new Float32Array(NS);
  for (let i = 0; i < NS; i++) {
    sp[i * 3] = (r() - 0.5) * 3000; sp[i * 3 + 1] = (r() - 0.5) * H; sp[i * 3 + 2] = -300 - Math.pow(r(), 0.8) * 1800;
    const b = 0.35 + r() * 0.65, tint = r(), cc = tint < 0.1 ? [1, 0.82, 0.62] : tint < 0.3 ? [0.7, 0.82, 1] : [0.92, 0.94, 1];
    sc[i * 3] = cc[0] * b; sc[i * 3 + 1] = cc[1] * b; sc[i * 3 + 2] = cc[2] * b; ph[i] = r();
  }
  const U = { uScroll: { value: 0 }, uH: { value: H }, uSize: { value: 2 }, uOpacity: { value: 0.9 }, uTime: { value: 0 }, uStreak: { value: 0 }, uWarp: { value: 0 } };
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('aCol', new THREE.BufferAttribute(sc, 3)); sg.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const stars = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: U, vertexShader: STAR_V, fragmentShader: STAR_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  stars.frustumCulled = false; scene.add(stars);
  const near = []; for (let i = 0; i < NS && near.length < 1000; i++) if (sp[i * 3 + 2] > -1200) near.push(i);
  const lp = new Float32Array(near.length * 6), lc = new Float32Array(near.length * 6), le = new Float32Array(near.length * 2);
  near.forEach((s, j) => { for (let e = 0; e < 2; e++) { for (let q = 0; q < 3; q++) { lp[j * 6 + e * 3 + q] = sp[s * 3 + q]; lc[j * 6 + e * 3 + q] = sc[s * 3 + q]; } le[j * 2 + e] = e; } });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lg.setAttribute('aCol', new THREE.BufferAttribute(lc, 3)); lg.setAttribute('aEnd', new THREE.BufferAttribute(le, 1));
  const streaks = new THREE.LineSegments(lg, new THREE.ShaderMaterial({ uniforms: U, vertexShader: STREAK_V, fragmentShader: STREAK_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  streaks.frustumCulled = false; streaks.visible = false; scene.add(streaks);
  const NT = 460, ta = new Float32Array(NT * 6), te = new Float32Array(NT * 2);
  for (let i = 0; i < NT; i++) {
    const a = r() * 6.2832, rad = 50 + Math.pow(r(), 0.7) * 950, z0 = r() * 3100;
    for (let e = 0; e < 2; e++) { ta[i * 6 + e * 3] = Math.cos(a) * rad; ta[i * 6 + e * 3 + 1] = Math.sin(a) * rad; ta[i * 6 + e * 3 + 2] = z0; te[i * 2 + e] = e; }
  }
  const TU = { uT: { value: 0 }, uLen: { value: 100 }, uWarp: { value: 0 }, uCol: { value: new THREE.Color(0x7c4dff) } };
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NT * 6), 3)); tg.setAttribute('aA', new THREE.BufferAttribute(ta, 3)); tg.setAttribute('aEnd', new THREE.BufferAttribute(te, 1));
  const tunnel = new THREE.LineSegments(tg, new THREE.ShaderMaterial({ uniforms: TU, vertexShader: TUNNEL_V, fragmentShader: TUNNEL_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  tunnel.frustumCulled = false; tunnel.visible = false; tunnel.renderOrder = 10;   // (after the nebula, which would cover it)
  if (camera) { camera.add(tunnel); scene.add(camera); }

  // ---- the nebula (far, square on to the 3D camera) and a nearer layer of drifting wisps in the sector's colour
  const D3 = new THREE.Vector3(0, -254, 274).normalize(), C3 = new THREE.Vector3(0, 22, -12);
  const face = (m, d) => { m.position.copy(C3).addScaledVector(D3, -d); m.lookAt(C3.clone().addScaledVector(D3, 373)); };
  const nebula = new THREE.Mesh(new THREE.PlaneGeometry(10000, 10000), new THREE.MeshBasicMaterial({ map: nebulaTex(), transparent: true, opacity: 0, depthWrite: false }));
  face(nebula, 3200); scene.add(nebula);
  const wt = wispTex(); wt.repeat.set(2.2, 2.2);
  const wisps = new THREE.Mesh(new THREE.PlaneGeometry(6200, 6200), new THREE.MeshBasicMaterial({ map: wt, color: 0x7c4dff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  face(wisps, 1900); scene.add(wisps);
  const wt2 = wispTex(); wt2.repeat.set(1.3, 1.3); wt2.offset.set(0.37, 0.61);
  const wisps2 = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshBasicMaterial({ map: wt2, color: 0x7c4dff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  face(wisps2, 2700); scene.add(wisps2);

  // ---- the planet below, its clouds, its glowing air; a moon
  const PR = 1500, PPOS = new THREE.Vector3(0, -1120, -1500);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(PR, 96, 48), new THREE.MeshStandardMaterial({ map: planetTex(), color: 0x7f8fa6, roughness: 1, metalness: 0, transparent: true, opacity: 0, emissive: 0x06182f, emissiveIntensity: 0.6 }));
  planet.position.copy(PPOS); planet.rotation.set(0.35, 0, 0.12); scene.add(planet);
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(PR * 1.012, 96, 48), new THREE.MeshStandardMaterial({ map: cloudTex(), transparent: true, opacity: 0, roughness: 1, depthWrite: false }));
  clouds.position.copy(PPOS); clouds.rotation.set(0.35, 0, 0.12); scene.add(clouds);
  const air = new THREE.Mesh(new THREE.SphereGeometry(PR * 1.035, 96, 48), new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 }, uCol: { value: new THREE.Color(0x5ab8ff) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uK; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 + dot(vN, vV), 0.0, 1.0), 2.2); gl_FragColor = vec4(uCol * f * 2.2, f * uK); }'
  }));
  air.position.copy(PPOS); scene.add(air);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(90, 48, 24), new THREE.MeshStandardMaterial({ map: moonTex(), roughness: 1, metalness: 0, transparent: true, opacity: 0 }));
  scene.add(moon);

  // ---- asteroids: tumbling shells of cubes, far behind the playfield, lit by the scene's lights
  const ROCK = ['#9b8b7b', '#8a7c6e', '#a89580', '#7a6e62', '#b3a08a', '#6c625a', '#c2ae96'].map((c) => new THREE.Color(c));
  const MAXA = 1800, rocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.1, emissive: 0x1a140f }), MAXA);
  rocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); rocks.frustumCulled = false; rocks.setColorAt(0, ROCK[0]); scene.add(rocks);
  function makeRock(seed) {
    const q = rng(seed), R = 2 + Math.floor(q() * 2.6), n0 = [q() * 6.3, q() * 6.3, q() * 6.3], cubes = [];
    for (let x = -R - 1; x <= R + 1; x++) for (let y = -R - 1; y <= R + 1; y++) for (let z = -R - 1; z <= R + 1; z++) {
      const d = Math.hypot(x, y * 1.15, z), edge = R * (0.82 + 0.3 * Math.sin(x * 1.3 + n0[0]) * Math.sin(y * 1.1 + n0[1]) * Math.sin(z * 1.7 + n0[2]));
      if (d <= edge && d > edge - 1.6) cubes.push({ x, y, z, c: ROCK[Math.floor(q() * ROCK.length)] });
    }
    return cubes;
  }
  const AST = [];
  const side = (q) => (q < 0.5 ? -1 : 1) * (300 + Math.random() * 420);   // out to the sides: never behind the formation, where a rock could pass for an invader
  for (let i = 0; i < 6; i++) AST.push({ cubes: makeRock(100 + i * 17), cs: 5 + r() * 4, x: (i % 2 ? 1 : -1) * (300 + r() * 420), y: -500 + r() * 1500, z: -430 - r() * 520,
    vx: (r() - 0.5) * 7, vy: (r() - 0.5) * 3, rx: r() * 6, ry: r() * 6, rz: r() * 6, ax: (r() - 0.5) * 0.35, ay: (r() - 0.5) * 0.35, az: (r() - 0.5) * 0.25 });

  // ---- comets: a bright head and a fading tail, now and then, far away
  const COM = [];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array([1, 1, 1, 0, 0, 0]), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    l.frustumCulled = false; l.visible = false; scene.add(l); COM.push({ l, life: 0 });
  }
  let nextComet = 4000;

  // ---- the state: how far we've flown, the jump to hyperspace, the sector's colour, a flash
  let scroll = 0, warp = 0, warpTarget = 0, warpOffAt = 0, flash = 0, lastT = 0, lastW = null;
  const sector = new THREE.Color(sectorOf(1)), sectorTo = new THREE.Color(sectorOf(1));
  const DEEP = new THREE.Color(0x3060ff), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3(), V = new THREE.Vector3();

  function onFx(f, t) {
    if (f.k === 'cleared') { if (!REDUCED) warpTarget = 1; warpOffAt = 0; }
    else if (f.k === 'wave') { sectorTo.set(sectorOf(f.n)); warpOffAt = t + (f.n === 1 ? 300 : 550); if (f.n > 1 && !REDUCED) warpTarget = 1; }
    else if (f.k === 'die') flash = Math.max(flash, 0.7);
    else if (f.k === 'bossdie') flash = 1.2;
    else if (f.k === 'bosspart' || f.k === 'coreopen' || f.k === 'rage') flash = Math.max(flash, 0.8);
    else if (f.k === 'ufo' || f.k === 'perfect') flash = Math.max(flash, 0.5);
  }
  function update(t, K, kN, kP, W, sizePx) {
    const dt = lastT ? Math.max(0, Math.min(0.1, (t - lastT) / 1000)) : 0; lastT = t;
    if (W !== lastW) {   // a new game arrives out of hyperspace
      lastW = W; sector.set(sectorOf(W.wave || 1)); sectorTo.copy(sector);
      if (!REDUCED && !W.demo) { warp = 1; warpTarget = 1; warpOffAt = t + 300; }
    }
    if (warpOffAt && t > warpOffAt) { warpTarget = 0; warpOffAt = 0; }
    warp += (warpTarget - warp) * (1 - Math.exp(-dt / (warpTarget > warp ? 0.35 : 0.45)));
    const move = REDUCED ? 0 : K;   // (the flat look is the still sky of the original)
    const speed = 16 * move * (1 + 46 * warp * warp) * (W.slow > 0 ? 0.5 : 1);
    scroll += speed * dt;
    U.uScroll.value = scroll; U.uTime.value = t / 1000;
    U.uSize.value = lerp(1.6, 2.3, K) * sizePx; U.uOpacity.value = lerp(0.55, 0.95, K);
    U.uStreak.value = Math.min(90, speed * 0.08); U.uWarp.value = Math.min(1, warp * 1.3) * K * 0.35;
    streaks.visible = U.uWarp.value > 0.01;
    TU.uT.value += 2800 * warp * warp * dt * move; TU.uLen.value = 140 + 1100 * warp; TU.uWarp.value = Math.min(1, warp * 1.2) * K * 0.85; TU.uCol.value.copy(sector);
    tunnel.visible = TU.uWarp.value > 0.01;
    // the colour of space
    sector.lerp(sectorTo, 1 - Math.exp(-dt / (warp > 0.3 ? 0.35 : 1.2)));
    flash *= Math.exp(-dt / 0.25); if (flash < 0.01) flash = 0;
    nebula.material.opacity = kN; nebula.visible = kN > 0.01;
    nebula.material.color.setRGB(1, 1, 1).lerp(sector, 0.35).multiplyScalar(1 + flash * 0.9 + warp * 0.3);
    const wo = (0.42 + 0.25 * warp + 0.45 * flash) * kN;
    wisps.material.opacity = wo; wisps2.material.opacity = wo * 0.7; wisps.visible = wisps2.visible = wo > 0.005;
    wisps.material.color.copy(sector); wisps2.material.color.copy(sector).lerp(DEEP, 0.35);
    wt.offset.y = -scroll * 0.00011; wt.offset.x = Math.sin(t / 23000) * 0.08;
    wt2.offset.y = 0.61 - scroll * 0.00005; wt2.offset.x = 0.37 + t / 400000;
    wisps.rotation.z = t / 900000;
    // the planet turns (faster as we fly), its clouds turn faster still
    planet.material.opacity = kP; clouds.material.opacity = kP * 0.85; air.material.uniforms.uK.value = kP;
    planet.visible = clouds.visible = air.visible = kP > 0.01;
    planet.rotation.y = t / 60000 + scroll * 0.00004; clouds.rotation.y = t / 34000 + scroll * 0.00006;
    air.material.uniforms.uCol.value.setRGB(0.35, 0.72, 1).lerp(sector, 0.2);
    const ma = t / 140000 + 2.2;
    moon.position.set(Math.cos(ma) * 1500, 420 + Math.sin(ma) * 160, -2350); moon.rotation.y = t / 50000;
    moon.material.opacity = kN; moon.visible = kN > 0.01;
    // the asteroids drift past with the stars at their depth
    let n = 0;
    rocks.visible = kN > 0.05;
    if (rocks.visible) {
      for (const a of AST) {
        const par = 600 / -a.z;
        a.x += a.vx * dt * move; a.y += (a.vy - speed * par) * dt * (REDUCED ? 0 : 1);
        if (a.y < -650) { a.y += 1700; a.x = side(Math.random()); }
        if (Math.abs(a.x) < 280 || Math.abs(a.x) > 760) a.vx = -a.vx;   // (drifting, they turn back before the middle)
        a.rx += a.ax * dt * move; a.ry += a.ay * dt * move; a.rz += a.az * dt * move;
        E.set(a.rx, a.ry, a.rz); Q.setFromEuler(E); const s = a.cs * kN;
        for (const c of a.cubes) {
          if (n >= MAXA) break;
          V.set(c.x * a.cs, c.y * a.cs, c.z * a.cs).applyQuaternion(Q); P.set(a.x + V.x, a.y + V.y, a.z + V.z); S.set(s, s, s);
          M.compose(P, Q, S); rocks.setMatrixAt(n, M); rocks.setColorAt(n, c.c); n++;
        }
      }
    }
    rocks.count = n; rocks.instanceMatrix.needsUpdate = true; if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
    // comets
    if (!REDUCED && t > nextComet && kN > 0.5) {
      const c = COM.find((q) => q.life <= 0);
      if (c) { const side = Math.random() < 0.5 ? -1 : 1; c.x = -side * 1300; c.y = 200 + Math.random() * 700; c.z = -1500 - Math.random() * 500; c.vx = side * (900 + Math.random() * 500); c.vy = -(200 + Math.random() * 300); c.life = c.max = 1.6 + Math.random() * 0.8; c.l.visible = true; }
      nextComet = t + 7000 + Math.random() * 9000;
    }
    for (const c of COM) {
      if (c.life <= 0) { c.l.visible = false; continue; }
      c.life -= dt; c.x += c.vx * dt; c.y += c.vy * dt;
      const p = c.l.geometry.attributes.position.array, k = Math.min(1, c.life / c.max * 3) * kN, len = 0.22;
      p[0] = c.x; p[1] = c.y; p[2] = c.z; p[3] = c.x - c.vx * len; p[4] = c.y - c.vy * len; p[5] = c.z;
      c.l.geometry.attributes.position.needsUpdate = true; c.l.material.opacity = k;
    }
    return warp;
  }
  return { update, onFx, get warp() { return warp; }, get sector() { return sector; } };
}
