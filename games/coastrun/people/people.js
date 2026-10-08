// 365 Coast Run - the two of you, as people (8 Oct 2026). Built in Blender with MPFB 2 from MakeHuman's CC0 assets (bodies, faces, hair,
// clothes), skinned to a 53-bone game rig, and driven frame by frame by the game's own couple (world3d.js), which keeps running unseen
// underneath: their seat groups carry these models; heads, arms and faces copy the old couple's, with more laid on top - the start line and
// goal cameras, the kiss, laughs, the sing-along, her arm in the wind, the nitro, jumps and bends; her bikini, his Hawaiian shirt, the board.
// Loaded by coastrun.js only where the 3D runs at full quality; a slower PC, or one that drops to the plainer look, keeps the original couple
// (detach()). loaders/ and utils/ are three.js r185 add-ons (MIT, as ../../common/vendor/three-r185/LICENSE.txt).
import * as THREE from 'three';
import { GLTFLoader } from './loaders/GLTFLoader.js';

const SEATS = { him: { seat: [0.4, 0.58, 0.42], turn: 0, file: 'him.glb' }, her: { seat: [-0.4, 0.56, 0.6], turn: -0.15, file: 'her.glb' } };
const TINT = { him: { body: '#d9a47e', short: '#5a4433' }, her: { body: '#ebba95', long01: '#e2b46c' } };   // (a holiday tan, deeper: 8 Oct)
const WRIST = -0.27, FUN = { him: 0.32, her: 0.45 }, FINGERS = ['index', 'middle', 'ring', 'pinky'];
const v4 = new THREE.Vector3(), v5 = new THREE.Vector3();
const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion(), q4 = new THREE.Quaternion(), QI = new THREE.Quaternion();
const ease = (a, b, k) => a + (b - a) * k, cl = (x, a, b) => Math.min(b, Math.max(a, x)), win = (x, a, b, r) => cl(Math.min((x - a) / r, (b - x) / r), 0, 1);
const wp = (o) => o.getWorldPosition(new THREE.Vector3()), bell = (x) => { x = cl(x, 0, 1); return Math.sin(Math.PI * x); };

function findCar(scene) { let car = null; scene.traverse((o) => { if (!car && o.isGroup && o.children.some((c) => c.isGroup && Math.abs(c.position.x - 0.4) < 0.02 && Math.abs(c.position.y - 0.58) < 0.03 && Math.abs(c.position.z - 0.42) < 0.03)) car = o; }); return car; }
function oldRig(root) {
  const neck = root.children.filter((c) => c.isGroup && Math.abs(c.position.x) < 0.01 && c.position.y > 0.6).sort((a, b) => b.children.length - a.children.length)[0];
  const arms = root.children.filter((c) => c.isGroup && Math.abs(c.position.x) > 0.1 && c.children.some((e) => e.isGroup && e.position.y < -0.1)).map((sh) => ({ sh: sh, el: sh.children.find((e) => e.isGroup && e.position.y < -0.1) }));
  const mouth = neck ? neck.children.find((c) => c.isMesh && c.morphTargetInfluences && c.morphTargetInfluences.length >= 3) : null;
  const brows = neck ? neck.children.filter((c) => c.isGroup && c.userData && c.userData.y0 != null) : [];
  const eyes = neck ? neck.children.filter((c) => c.isGroup && c.userData.y0 == null && c.children.length === 3 && c.children[0].isGroup && c.children[0].children.some((m) => m.isMesh)).map((g) => g.children[0]) : [];
  return { neck: neck, arms: arms, mouth: mouth, brows: brows, eyes: eyes };
}
function setWorldQ(bone, worldQ) { bone.parent.getWorldQuaternion(q4); bone.quaternion.copy(q4.invert().multiply(worldQ)); bone.updateMatrixWorld(true); }
function aim(bone, from, child, to) { v4.subVectors(child, from).normalize(); v5.subVectors(to, from).normalize(); if (v4.lengthSq() < 1e-9 || v5.lengthSq() < 1e-9) return; q1.setFromUnitVectors(v4, v5); bone.getWorldQuaternion(q2); setWorldQ(bone, q1.multiply(q2)); }
function turnBy(bone, axisWorld, ang) { if (!ang) return; q1.setFromAxisAngle(axisWorld, ang); bone.getWorldQuaternion(q2); setWorldQ(bone, q1.multiply(q2)); }
function signedAngle(a, b, axis) { const x = a.clone().projectOnPlane(axis).normalize(), y = b.clone().projectOnPlane(axis).normalize(); return Math.atan2(axis.dot(x.clone().cross(y)), x.dot(y)); }

// the material changes, in one onBeforeCompile: a warm rim of low sunlight round their edges (the "cinematic" glow, on them only: no new
// scene light, so nothing else recompiles or costs more), and for her hair the wind
function dress(mat, rim, hairTop) {
  mat.userData.rim = { value: rim }; mat.userData.wind = { value: 0 }; mat.userData.time = { value: 0 };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uRim = mat.userData.rim; sh.uniforms.uWind = mat.userData.wind; sh.uniforms.uTime = mat.userData.time;
    sh.fragmentShader = 'uniform float uRim;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' +
      '{ vec3 nn = normalize(normal); float fr = 1.0 - clamp(dot(nn, normalize(vViewPosition)), 0.0, 1.0), back = clamp(dot(nn, normalize(vec3(0.35, 0.65, -0.68))) + 0.25, 0.0, 1.0);\n' +
      '  totalEmissiveRadiance += vec3(1.0, 0.62, 0.34) * pow(fr, 2.2) * back * uRim; }');   /* (a low sun from behind and above: hair and shoulders catch it, a fold facing you - a closed eyelid - does not) */
    if (hairTop != null) {
      const py = (hairTop - 0.13).toFixed(3), pz = '-0.050';
      sh.vertexShader = 'uniform float uWind; uniform float uTime;\n' + sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n' +
        '{ float d = clamp((' + py + ' - transformed.y) / 0.5, 0.0, 1.0), a = pow(d, 1.5);\n' +
        '  float f = sin(uTime * 8.0 - d * 14.0 + transformed.x * 11.0), g = sin(uTime * 13.7 + transformed.y * 37.0);\n' +
        '  float th = uWind * (1.05 * a + 0.16 * a * f), ry = transformed.y - ' + py + ', rz = transformed.z - (' + pz + ');\n' +
        '  transformed.y = ' + py + ' + ry * cos(th) - rz * sin(th); transformed.z = ' + pz + ' + ry * sin(th) + rz * cos(th);\n' +
        '  transformed.x += a * uWind * 0.03 * g; }');
    }
  };
  mat.customProgramCacheKey = () => 'mh' + (hairTop != null ? 'h' + hairTop.toFixed(3) : '');
  mat.needsUpdate = true;
}

export async function attach(opt) {
  opt = Object.assign({ sc: 0.93, dx: 0, dy: -0.055, dz: 0.02, fun: 1, cheek: 1, rim: 0.42, cine: 1, board: 1 }, opt || {});
  const W3 = window.COAST3D.world, scene = W3.scene, renderer = W3.renderer, L = new GLTFLoader(), base = new URL('.', import.meta.url).href;
  const files = {}; for (const who in SEATS) files[who] = await L.loadAsync(base + SEATS[who].file);
  const state = { people: [], car: null, last: 0, t0: performance.now(), calm: 0, relax: 0, touch: 0, flirt: 0, lastV: 0, acc: 0, lat: 0, latDir: new THREE.Vector3(), lastFwd: null,
    boostT: 99, wasBoost: false, airK: 0, landT: 99, lastLand: null, wind: 0, laugh: { him: 0, her: 0 }, laughUntil: { him: 0, her: 0 } };

  // her coral headscarf (sceptic r3: "a coral headscarf with streaming tails"): a band round her head fitted to her hair (the hair and skin
  // vertices near a plane tilted up at the front, the furthest out in each direction), a knot at the nape; the tails are drawn each frame
  function dots() { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); g.fillStyle = '#ec5b55'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff6ec';
    [[16, 16], [48, 48]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 12, 0, 6.2832); g.fill(); }); const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.colorSpace = THREE.SRGBColorSpace; return tx; }
  function headscarf(P, car) {
    const hd = P.head; let hair = null, body = null;
    P.model.traverse((o) => { if (!o.isSkinnedMesh) return; const n = o.name + ' ' + (o.material.name || ''); if (/long01/.test(n)) hair = o; else if (/body/.test(n)) body = o; });
    if (!hd || !hair) return;
    const pts = [], v = new THREE.Vector3();
    for (const o of [hair, body]) { if (!o) continue; const pa = o.geometry.attributes.position; o.updateMatrixWorld(true);
      for (let k = 0; k < pa.count; k++) { v.fromBufferAttribute(pa, k); o.applyBoneTransform(k, v); hd.worldToLocal(v.applyMatrix4(o.matrixWorld)); if (v.length() < 0.3) pts.push(v.clone()); } }
    hd.getWorldQuaternion(q3); car.getWorldQuaternion(q4); const Y = new THREE.Vector3(0, 1, 0).applyQuaternion(q4).applyQuaternion(q3.clone().invert()).normalize();
    const em = P.eyes.length ? P.eyes.map((e) => hd.worldToLocal(wp(e))).reduce((a, b) => a.add(b)).multiplyScalar(1 / P.eyes.length) : new THREE.Vector3(0, 0.09, 0.09);
    const F = em.clone().sub(Y.clone().multiplyScalar(em.dot(Y))).normalize(), tilt = 0.6, N = Y.clone().multiplyScalar(Math.cos(tilt)).sub(F.clone().multiplyScalar(Math.sin(tilt)));
    const C = Y.clone().multiplyScalar(em.dot(Y) + 0.045).add(F.clone().multiplyScalar(em.dot(F) - 0.09)), F2 = F.clone().sub(N.clone().multiplyScalar(F.dot(N))).normalize(), S = N.clone().cross(F2);
    const NB = 64, rows = [-0.026, 0, 0.026], R = rows.map((o) => {
      const Co = C.clone().add(N.clone().multiplyScalar(o)), r = new Array(NB).fill(0);
      for (const p of pts) { v.subVectors(p, Co); const dn = v.dot(N); if (Math.abs(dn) > 0.009) continue; v.sub(N.clone().multiplyScalar(dn)); const rr = v.length(); if (rr > 0.16) continue;
        const b = Math.min(NB - 1, Math.floor((Math.atan2(v.dot(S), v.dot(F2)) + Math.PI) / (2 * Math.PI) * NB)); if (rr > r[b]) r[b] = rr; }
      for (let it = 0; it < NB && r.some((x) => !x); it++) for (let b = 0; b < NB; b++) if (!r[b]) r[b] = Math.max(r[(b + 1) % NB], r[(b + NB - 1) % NB]);
      const m = r.map((x, b) => Math.max(x, r[(b + 1) % NB], r[(b + NB - 1) % NB])); return { Co: Co, r: m.map((x, b) => (m[(b + 1) % NB] + x + m[(b + NB - 1) % NB]) / 3 + 0.006) };
    });
    const pos = [], uv = [], idx = [], at = (row, b) => { const th = -Math.PI + (b + 0.5) / NB * 2 * Math.PI, rr = R[row].r[b % NB]; return R[row].Co.clone().add(F2.clone().multiplyScalar(Math.cos(th) * rr)).add(S.clone().multiplyScalar(Math.sin(th) * rr)); };
    for (let row = 0; row < rows.length; row++) for (let b = 0; b <= NB; b++) { const q = at(row, b); pos.push(q.x, q.y, q.z); uv.push(b / NB * 9, row / (rows.length - 1) * 0.78); }
    for (let row = 0; row < rows.length - 1; row++) for (let b = 0; b < NB; b++) { const a = row * (NB + 1) + b, c = a + NB + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: dots(), roughness: 0.55, side: THREE.DoubleSide }), band = new THREE.Mesh(geo, mat);
    band.castShadow = true; band.frustumCulled = false; band.userData.mh = true; hd.add(band);
    const bk = R[1].r[0] > R[1].r[NB - 1] ? 0 : NB - 1, knot = at(1, bk).add(F2.clone().multiplyScalar(-0.012));   /* (behind: theta = -pi) */
    { const Yp = Y.clone().sub(F.clone().multiplyScalar(F.dot(Y))).normalize(), Sp = Yp.clone().cross(F), half = P.eyes.length === 2 ? hd.worldToLocal(wp(P.eyes[0])).sub(em).dot(Sp) : 0.031;
      const fr = new THREE.MeshStandardMaterial({ color: '#f7f4ec', roughness: 0.3 }), lensM = new THREE.MeshStandardMaterial({ color: '#17161d', roughness: 0.08, metalness: 0.5, side: THREE.DoubleSide });
      const cat = [[-0.024, 0.006], [-0.012, 0.014], [0.01, 0.016], [0.031, 0.025], [0.028, 0.004], [0.018, -0.012], [0, -0.017], [-0.016, -0.013], [-0.025, -0.004]];   /* (a cat-eye: the outer top corner swept up) */
      const shp = (sc) => { const sh = new THREE.Shape(); sh.moveTo(cat[0][0] * sc, cat[0][1] * sc); sh.splineThru(cat.slice(1).concat([cat[0]]).map(([x, y]) => new THREE.Vector2(x * sc, y * sc))); return sh; };
      const sun = new THREE.Group(), e = Math.abs(half) || 0.031;
      for (const sd of [1, -1]) {
        const f0 = new THREE.Mesh(new THREE.ExtrudeGeometry(shp(1.0), { depth: 0.004, bevelEnabled: false }), fr), l0 = new THREE.Mesh(new THREE.ShapeGeometry(shp(0.8)), lensM);
        for (const m of [f0, l0]) { m.position.x = sd * e; m.scale.x = sd; m.userData.mh = true; sun.add(m); } l0.position.z = 0.0045; l0.position.y = -0.001;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.005, 0.1), fr); arm.position.set(sd * (e + 0.03), 0.012, -0.05); arm.userData.mh = true; sun.add(arm);
      }
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.004, 0.004), fr); br.position.set(0, 0.008, 0.002); sun.add(br);
      const basis = new THREE.Matrix4().makeBasis(Sp, Yp, F), q0 = new THREE.Quaternion().setFromRotationMatrix(basis), p0 = em.clone().add(F.clone().multiplyScalar(0.03)).add(Yp.clone().multiplyScalar(0.002));
      const p1 = at(1, NB / 2).add(F2.clone().multiplyScalar(0.014)), q1 = q0.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -1.2));
      sun.position.copy(p0); sun.quaternion.copy(q0); sun.traverse((o) => { o.castShadow = true; o.userData.mh = true; }); hd.add(sun); P.sun = { g: sun, p0: p0, q0: q0, p1: p1, q1: q1 }; P.sunK = 1; }
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), mat); kn.scale.set(1.25, 0.85, 0.7); kn.position.copy(knot); kn.userData.mh = true; hd.add(kn); P.knot = knot;
    if (!car.userData.mhTails) {
      const NS = 11, g = new THREE.BufferGeometry(), tuv = [], ti = []; g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * NS * 2 * 3), 3));
      for (let tl = 0; tl < 2; tl++) for (let i = 0; i < NS; i++) { tuv.push(i / (NS - 1) * 8, 0, i / (NS - 1) * 8, 0.66); if (i < NS - 1) { const a = (tl * NS + i) * 2; ti.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      g.setAttribute('uv', new THREE.Float32BufferAttribute(tuv, 2)); g.setIndex(ti);
      const tails = new THREE.Mesh(g, mat); tails.frustumCulled = false; tails.castShadow = true; tails.userData.mh = true; tails.userData.NS = NS; car.add(tails); car.userData.mhTails = tails;
    }
  }

  function build() {
    for (const P of state.people) if (P.model.parent) P.model.parent.remove(P.model);
    state.people = []; const car = findCar(scene); state.car = car; if (!car) return;
    for (const who in SEATS) {
      const S = SEATS[who], root = car.children.find((c) => c.isGroup && Math.abs(c.position.x - S.seat[0]) < 0.03 && Math.abs(c.position.y - S.seat[1]) < 0.03 && Math.abs(c.position.z - S.seat[2]) < 0.03);
      if (!root) continue;
      const model = files[who].scene.clone(true);
      model.traverse((o) => { if (o.isSkinnedMesh) { const bones = o.skeleton.bones.map((b) => model.getObjectByName(b.name)); o.bind(new THREE.Skeleton(bones, o.skeleton.boneInverses.map((m) => m.clone())), o.bindMatrix.clone()); } });
      const faces = [], mats = [];
      model.traverse((o) => {
        if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.userData.mh = true;
        const mt = o.material = o.material.clone(), n = (mt.name || '') + ' ' + o.name;
        for (const k in TINT[who]) if (n.includes(k)) mt.color.set(TINT[who][k]);
        if (/short|long|eyebrow|eyelash/.test(n)) { mt.alphaTest = 0.45; mt.transparent = false; mt.depthWrite = true; mt.side = THREE.DoubleSide; } else { mt.transparent = false; mt.depthWrite = true; mt.alphaTest = 0; }
        if (/body/.test(n)) mt.roughness = 0.5;
        if (/sunglasses/.test(n)) mt.envMapIntensity = 1.6;
        if (!/eyelash|eyebrow|low-poly|teeth|tongue|sunglasses/.test(n)) { let top = null; if (/long01/.test(n)) { o.geometry.computeBoundingBox(); top = o.geometry.boundingBox.max.y; } dress(mt, opt.rim * (/body/.test(n) ? 1 : 0.8), top); mats.push({ mt: mt, hair: top != null }); }
        if (o.morphTargetDictionary) faces.push(o);
        mt.needsUpdate = true;
      });
      const home = root.userData.home || { p: root.position, r: root.rotation, s: root.scale };
      const mHome = new THREE.Matrix4().compose(home.p, new THREE.Quaternion().setFromEuler(home.r), home.s);
      const mWant = new THREE.Matrix4().compose(new THREE.Vector3(S.seat[0] + opt.dx, S.seat[1] + opt.dy, S.seat[2] + opt.dz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI + S.turn, 0)), new THREE.Vector3(opt.sc, opt.sc, opt.sc));
      mHome.invert().multiply(mWant).decompose(model.position, model.quaternion, model.scale);
      root.add(model); model.updateMatrixWorld(true);
      const old = oldRig(root), bone = (n) => model.getObjectByName(n);
      const hide = []; root.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh) && !o.userData.mh) hide.push(o); });
      const P = { who: who, root: root, model: model, base: model.position.clone(), old: old, hide: hide, faces: faces, mats: mats, neck: bone('neck_01'), head: bone('head'),
        sp1: bone('spine_01'), sp2: bone('spine_02'), sp3: bone('spine_03'), pelvis: bone('pelvis'), arms: [], eyes: ['eye_l', 'eye_r'].map(bone).filter(Boolean), glasses: bone('glasses'),
        blinkAt: performance.now() + 1500 + Math.random() * 3000, face: { s: 0, o: 0, p: 0, bu: 0, bd: 0 }, gp: 0, gv: 0, rollS: 0 };
      P.rest = new Map(); model.traverse((o) => { if (o.isBone) P.rest.set(o, o.quaternion.clone()); });
      if (P.glasses) P.gl0 = P.glasses.position.clone();
      P.root.getWorldQuaternion(q3); const fw0 = new THREE.Vector3(0, 0, -1).applyQuaternion(q3);
      for (const sd of ['l', 'r']) {
        const up = bone('upperarm_' + sd), lo = bone('lowerarm_' + sd), ha = bone('hand_' + sd), clav = bone('clavicle_' + sd);
        const sp = wp(up), O = old.arms.slice().sort((a, b) => wp(a.sh).distanceTo(sp) - wp(b.sh).distanceTo(sp))[0];
        const inner = S.seat[0] > 0 ? O.sh.position.x < 0 : O.sh.position.x > 0;
        const y0 = wp(up).y; turnBy(clav, fw0, 0.2); const sgn = wp(up).y > y0 ? 1 : -1; clav.quaternion.copy(P.rest.get(clav)); clav.updateMatrixWorld(true);
        P.arms.push({ sd: sd, up: up, lo: lo, ha: ha, clav: clav, shrugSign: sgn, fingers: FINGERS.map((f) => [1, 2, 3].map((j) => bone(f + '_0' + j + '_' + sd))), L1: wp(up).distanceTo(wp(lo)), L2: wp(lo).distanceTo(wp(ha)), oldEl: O.el, oldSh: O.sh, inner: inner, thigh: bone('thigh_' + sd), calf: bone('calf_' + sd) });
      }
      if (who === 'him') {   // the top of his door (for an elbow out over it): a ray dropped onto the car beside his seat
        const body = car.children.filter((c) => c.isMesh && !c.userData.mh), rc = new THREE.Raycaster(), from = car.localToWorld(new THREE.Vector3(S.seat[0] + 0.5, 2.5, S.seat[2] - 0.05)), down = new THREE.Vector3(0, -1, 0).transformDirection(car.matrixWorld);
        rc.set(from, down); const hit = rc.intersectObjects(body, false).find((h) => car.worldToLocal(h.point.clone()).y > 0.75); P.door = hit ? car.worldToLocal(hit.point.clone()) : new THREE.Vector3(S.seat[0] + 0.5, 0.98, S.seat[2] - 0.05);
      }
      state.people.push(P);
    }
    state.him = state.people.find((P) => P.who === 'him'); state.her = state.people.find((P) => P.who === 'her');
    for (const P of state.people) {   // (each mouth in head space, from the eyes: for the kiss)
      const hd = P.head; hd.getWorldQuaternion(q3); car.getWorldQuaternion(q4); const Y = new THREE.Vector3(0, 1, 0).applyQuaternion(q4).applyQuaternion(q3.clone().invert()).normalize();
      const em = P.eyes.length ? P.eyes.map((e) => hd.worldToLocal(wp(e))).reduce((a, b) => a.add(b)).multiplyScalar(1 / P.eyes.length) : new THREE.Vector3(0, 0.09, 0.09);
      const F = em.clone().sub(Y.clone().multiplyScalar(em.dot(Y))).normalize(); P.faceF = F; P.mouth = em.clone().sub(Y.clone().multiplyScalar(0.064)).add(F.clone().multiplyScalar(0.02)); }
    state.kOff = { him: new THREE.Vector3(), her: new THREE.Vector3() }; state.mouthW = {};
    if (state.her) headscarf(state.her, car);
    if (opt.board && !car.userData.mhBoard) {   // a striped surfboard standing up out of the back behind her seat
      const cv2 = document.createElement('canvas'); cv2.width = 64; cv2.height = 256; const g2 = cv2.getContext('2d');
      g2.fillStyle = '#f6f0df'; g2.fillRect(0, 0, 64, 256); g2.fillStyle = '#ef6248'; for (const x of [16, 48]) g2.fillRect(x - 4, 0, 8, 256);   /* (one stripe down the middle of each face: u 0.25 and 0.75 - at 0 and 0.5 it ran down the rails) */
      const tex = new THREE.CanvasTexture(cv2); tex.colorSpace = THREE.SRGBColorSpace;
      const geo = new THREE.CapsuleGeometry(0.17, 1.5, 6, 18); geo.scale(1, 1, 0.16);   /* (slim) */
      const board = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.05 })); board.castShadow = true; board.userData.mh = true;
      { const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.6, 0.026, 0, 0.75, 0.026, 0, 0.78, 0.13, 0, 0.6, 0.026, 0, 0.78, 0.13, 0, 0.7, 0.11], 3)); fg.computeVertexNormals();   /* (the fin: raked back, at the tail, out of the back face) */
        const fin = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: '#16808c', roughness: 0.4, side: THREE.DoubleSide })); fin.castShadow = true; fin.userData.mh = true; board.add(fin); }
      board.position.set(-0.72, 1.0, 1.28); board.rotation.set(0.26, 0.15, -0.1); board.scale.setScalar(0.62);   /* (upright behind her seat, the fin to the chase camera) */ car.add(board); car.userData.mhBoard = board;   /* (smaller, leaning well back out of the boot: it towered over her from the front and hid her from behind) */
    }
  }

  function armTo(A, dirUp, wrist) { const S = wp(A.up); aim(A.up, S, wp(A.lo), S.clone().add(dirUp.clone().normalize().multiplyScalar(A.L1))); const E1 = wp(A.lo); aim(A.lo, E1, wp(A.ha), wrist); }
  function armIK(A, T, pole) {
    const S = wp(A.up), dv = T.clone().sub(S), u = dv.clone().normalize(), d = cl(dv.length(), Math.abs(A.L1 - A.L2) + 1e-3, A.L1 + A.L2 - 1e-3);
    const b = pole.clone().sub(S); b.sub(u.clone().multiplyScalar(b.dot(u))); if (b.lengthSq() < 1e-8) b.set(0, -1, 0); b.normalize();
    const a = (A.L1 * A.L1 - A.L2 * A.L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, A.L1 * A.L1 - a * a));
    aim(A.up, S, wp(A.lo), S.clone().add(u.clone().multiplyScalar(a)).add(b.multiplyScalar(h))); const E1 = wp(A.lo); aim(A.lo, E1, wp(A.ha), S.clone().add(u.multiplyScalar(d)));
  }
  function lookAngles(P, target) { P.old.neck.getWorldQuaternion(q3); const d = target.clone().sub(wp(P.head)).applyQuaternion(q3.clone().invert()); return [cl(Math.atan2(-d.x, -d.z), -0.6, 0.6), cl(Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.35, 0.35)]; }
  const laughAt = (who, secs) => { state.laughUntil[who] = Math.max(state.laughUntil[who], (performance.now() - state.t0) / 1000 + secs); };

  function update() {
    const car = state.car, now = performance.now(), dt = Math.min(0.1, (now - (state.tick || now)) / 1000), t = (now - state.t0) / 1000; state.tick = now;
    if (!car || !car.parent || state.people.some((P) => !P.model.parent || P.model.parent.parent !== car)) build();
    if (!state.people.length) return;
    const W = window.ARCADE365 && window.ARCADE365.world; if (!W) return;
    const live = W.count <= 0 && !W.goalSeq && !W.crash && !W.ferry, her = W.her || { k: 'idle' }, idle = her.k === 'idle', cnt = W.count, cam = wp(W3.camera);
    const speaking = W.voiceT != null && W.t - W.voiceT < 80, ccheek = opt.cheek ? 1 : 0;
    car.updateWorldMatrix(true, true);
    // ---- what the car is doing: speeding up, the g in a bend (from its own turning), nitro, the air
    { const a = (W.v - state.lastV) / Math.max(1e-3, dt); state.acc = ease(state.acc, cl(a, -30, 30), Math.min(1, dt * 4)); state.lastV = W.v;
      const e = car.matrixWorld.elements, f = new THREE.Vector3(-e[8], 0, -e[10]).normalize();
      if (state.lastFwd && dt > 0) { const df = f.clone().sub(state.lastFwd).divideScalar(dt), lat = df.length() * W.v; state.lat = ease(state.lat, cl(lat, 0, 30), Math.min(1, dt * 5)); if (df.lengthSq() > 1e-8) state.latDir.lerp(df.clone().normalize().negate(), Math.min(1, dt * 5)); }
      state.lastFwd = f; }
    if (W.boosting && !state.wasBoost) state.boostT = 0; state.wasBoost = !!W.boosting; state.boostT += dt;
    state.airK = ease(state.airK, W.air && W.airT > 0.12 ? 1 : 0, Math.min(1, dt * 8));
    if (W.land != null && W.land !== state.lastLand) { if (state.lastLand != null && (W.airT || 0) > 0.3) { state.landT = 0; laughAt('her', 1.3); laughAt('him', 1.1); } state.lastLand = W.land; } state.landT += dt;
    if (state.boostT > 0.3 && state.boostT < 0.3 + dt * 1.5) { laughAt('her', 2.2); laughAt('him', 1.2); }
    const nitro = live ? bell(state.boostT / 2.4) * (state.boostT < 2.4 ? 1 : 0) : 0, snap = live && state.boostT < 0.3 ? bell(state.boostT / 0.3) : 0;
    // ---- the moods of the moment
    const calmNow = live && W.v > 15 && Math.abs(W.steer || 0) < 0.12 && !W.drift && !W.boosting;
    state.calm = calmNow ? state.calm + dt : 0;
    state.relax = ease(state.relax, state.calm > 1.6 && nitro < 0.05 ? 1 : 0, Math.min(1, dt * (state.calm > 1.6 ? 2.2 : 6)));
    const ph = t % 62, touchNow = live && idle && !speaking && W.v > 12 && ph > 20 && ph < 25 && nitro < 0.05 && (state.sing || 0) < 0.1;   // (the hand on his shoulder: once a minute, for 5 s)
    state.touch = ease(state.touch, touchNow ? 1 : 0, Math.min(1, dt * 2.5));
    const fph = (t + 4) % 34, flirtNow = ccheek && live && idle && !speaking && W.v > 12 && fph > 17 && fph < 18.6 && state.touch < 0.1;   // (the look: 1.6 s, both smiling, she laughs and looks away first)
    state.flirt = ease(state.flirt, flirtNow ? 1 : 0, Math.min(1, dt * 5)); state.flirtT = flirtNow ? (state.flirtT || 0) + dt : 0;
    if (state.flirtT > 1.15 && state.flirtT < 1.15 + dt * 1.5) laughAt('her', 1.0);
    const sph = (t + 1) % 13, singNow = live && W.v > 15 && !speaking && sph > 5 && sph < 7.9 && nitro < 0.05 && state.touch < 0.1 && state.flirt < 0.1;   // (singing along to the radio: every 13 s, ~3 s)
    state.sing = ease(state.sing || 0, singNow ? 1 : 0, Math.min(1, dt * 4)); state.singT = singNow ? (state.singT || 0) + dt : Math.max(0, (state.singT || 0) - dt * 3);
    const wph = (t + 4) % 9, windNow = !singNow && state.sing < 0.2 && live && W.v > 45 && Math.abs(W.steer || 0) < 0.3 && wph > 2 && wph < 6.2 && nitro < 0.05 && state.touch < 0.1 && state.flirt < 0.1;   // (her arm riding the wind)
    state.wind = ease(state.wind, windNow ? 1 : 0, Math.min(1, dt * 2.2));
    if (live && idle && speaking && Math.random() < dt * 0.25) laughAt('her', 0.9);   // (she makes him laugh, now and then, and herself)
    if (live && W.v > 20 && Math.random() < dt / 9) { laughAt('her', 1.0); if (Math.random() < 0.6) laughAt('him', 0.8); }
    state.seat = ease(state.seat || 0, live && state.airK < 0.05 && nitro < 0.05 && state.touch < 0.05 && (idle || her.k === 'ask' || her.k === 'look' || her.k === 'hold') ? 1 : 0, Math.min(1, dt * 2));   // (her arm along the back of his seat: the resting pose)
    const gT = W.goalSeq ? (state.gReal != null ? state.gReal : W.goalSeq.t) : null, gHold = gT != null ? cl((gT - 110) / 40, 0, 1) : 0;   // (the real goal clock; the end pose from ~2 s)
    if (gT != null && gT > 205 && gT < 215) { laughAt('her', 1.4); laughAt('him', 1.1); }
    const best = gT != null && (W.goalSeq.rank === 'S' || W.goalSeq.rank === 'A'), kissK = best ? win(gT, 124, 196, 12) : 0, kissArm = best ? win(gT, 100, 200, 14) : 0;   // (the kiss ~2.1-3.3 s, held ~0.8 s; his arm down from ~1.7 s)
    const goalUp2 = gT != null ? win(gT, 198, 300, 14) : 0;   // (then both arms up, ~+3.3 s)
    const shadesUp = best ? win(gT, 96, 470, 10) : 0, ready = W.count > 0 && W.count < 86;   // (his shades up from ~0.4 s before the kiss; the start line's 'ready' beat)
   // (the end pose: laughing together)
    const wink = ccheek * (cnt > 0 ? win(cnt, 104, 122, 3) : 0), smirkStart = ccheek * (cnt > 0 ? win(cnt, 86, 136, 10) : 0), dip = ccheek * (cnt > 0 ? win(cnt, 84, 146, 12) : 0);
    const beat = Math.sin(t * 2 * Math.PI * 1.9), grooveOn = live && W.v > 8 && nitro < 0.05;   // (the music: both of them, together)
    const bend = live ? cl((state.lat - 10) / 14, 0, 1) : 0;   // (0 on the straight and the seafront's gentle curves (~10 m/s/s at speed), 1 in a hard bend)

    for (const P of state.people) {
      for (const o of P.hide) o.visible = false;
      for (const [b, q] of P.rest) b.quaternion.copy(q);
      if (P.glasses) P.glasses.position.copy(P.gl0);
      if (P.sun) { P.sunK = ease(P.sunK, W.count > 0 || W.goalSeq ? 1 : 0, Math.min(1, dt * 3)); P.sun.g.position.lerpVectors(P.sun.p0, P.sun.p1, P.sunK); P.sun.g.quaternion.slerpQuaternions(P.sun.q0, P.sun.q1, P.sunK); }   // (her shades: on at speed, up in the scarf at the start and the goal)
      const me = P.who === 'her', other = me ? state.him : state.her;
      P.model.position.copy(P.base); P.model.position.y += 0.05 * state.airK - 0.035 * (state.landT < 0.15 ? bell(state.landT / 0.15) : 0);   // (lifted in the air, a squash on landing)
      if (other) { const sl = me ? 0.08 * (state.seat || 0) : 0; if (kissK > 0.001 && state.kOff) { const o = state.kOff[P.who].clone().applyQuaternion(car.getWorldQuaternion(new THREE.Quaternion())); o.applyQuaternion(P.root.getWorldQuaternion(new THREE.Quaternion()).invert()).divide(P.root.getWorldScale(new THREE.Vector3())); P.model.position.addScaledVector(o, kissK); P.model.updateMatrixWorld(true); } if (sl > 0.001) { const dv = P.root.worldToLocal(other.root.getWorldPosition(new THREE.Vector3())); dv.y = 0; P.model.position.addScaledVector(dv.normalize(), sl); P.model.updateMatrixWorld(true); } }   // (closer: she slides in on her seat)
      P.model.updateMatrixWorld(true);
      P.root.getWorldQuaternion(q3); const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q3), upw = new THREE.Vector3(0, 1, 0).applyQuaternion(q3), fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q3);
      const toOther = other ? Math.sign(wp(other.pelvis).sub(wp(P.pelvis)).dot(right)) || 1 : 1;
      const laughing = cl((state.laughUntil[P.who] - t) / 0.25, 0, 1); state.laugh[P.who] = ease(state.laugh[P.who], laughing, Math.min(1, dt * 8)); const lg = state.laugh[P.who];
      // posture: reclined, her body turned to him; the g in a bend leans them out (she lands against him on a hard one); breathing; the laugh's shake
      turnBy(P.sp1, right, 0.12); turnBy(P.sp2, right, 0.08);
      if (me) { turnBy(P.sp2, upw, -0.13 * toOther); turnBy(P.sp3, upw, -0.12 * toOther); }   // (a turn about 'up' by a minus angle swings her front towards +x: him)
      const outward = state.latDir.dot(right), roll = cl(outward * bend * 0.32, -0.32, 0.32) + (me && outward * toOther > 0 ? toOther * 0.12 * bend : 0)
        + (live ? cl(state.lat * 0.004, 0, 0.05) * Math.sign(outward || 1) + Math.sin(t * 1.7 + (me ? 1 : 0)) * 0.012 : 0) + (me ? toOther * (0.2 * (state.seat || 0) + 0.3 * kissK) : toOther * 0.24 * kissK);   /* (+ her lean to him, ~11 deg; both in for the kiss) */   // (a constant 2-3 deg sway with the road)
      P.rollS = ease(P.rollS, roll, Math.min(1, dt * 6)); turnBy(P.sp1, fwd, P.rollS * 0.5); turnBy(P.sp2, fwd, P.rollS * 0.5);
      if (me && P.rollS * toOther - 0.2 * (state.seat || 0) > 0.15) laughAt('her', 0.4);
      turnBy(P.sp2, right, Math.sin(t * 2 * Math.PI / 4.3 + (me ? 1.7 : 0)) * 0.012 + lg * Math.sin(t * 2 * Math.PI * 4) * 0.02);
      // the head: the old head's turn (faded out by the look), level after the recline, the g, the nitro's snap, the groove, the laugh, the look
      if (P.old.neck) {
        const fl = me ? state.flirt * (state.flirtT > 1.15 ? cl(1 - (state.flirtT - 1.15) / 0.3, 0, 1) : 1) : state.flirt * cl((state.flirtT - 0.35) / 0.3, 0, 1); P.fl = fl;
        const Dw = q3.clone().multiply(P.old.neck.quaternion).multiply(q3.clone().invert()), half = QI.clone().slerp(Dw, 0.5 * (1 - 0.9 * fl));
        P.neck.getWorldQuaternion(q2); setWorldQ(P.neck, half.clone().multiply(q2)); P.head.getWorldQuaternion(q2); setWorldQ(P.head, half.clone().multiply(q2));
        turnBy(P.neck, right, -0.12);
        const gT2 = cl(state.acc * 0.005, -0.1, 0.12) + snap * 0.21; P.gv += ((gT2 - P.gp) * 60 - P.gv * 9) * dt; P.gp += P.gv * dt; turnBy(P.head, right, P.gp);
        turnBy(P.head, fwd, -P.rollS * 0.45);
        P.groove = ease(P.groove || 0, grooveOn ? (me ? 1 : 0.6) * (1 - fl) : 0, Math.min(1, dt * 1.5));
        if (P.groove > 0.01) { turnBy(P.head, right, beat * 0.085 * P.groove); turnBy(P.sp2, fwd, Math.sin(t * 2 * Math.PI * 0.95) * 0.03 * P.groove); turnBy(P.neck, fwd, Math.sin(t * 2 * Math.PI * 0.95) * 0.03 * P.groove); }
        if (lg > 0.01) turnBy(P.head, right, (me && (P.fl > 0.01 || (state.flirtT || 0) > 1.0) ? -0.13 : 0.26) * lg + Math.sin(t * 2 * Math.PI * 4) * 0.025 * lg);   // (laughing: head back - or, after the look, down)
        if (nitro > 0.01) turnBy(P.head, right, (me ? 0.26 : 0.2) * nitro);   // (the nitro: heads thrown back)
        if (state.sing > 0.01) { const sw = Math.sin(t * 2 * Math.PI * 0.95); turnBy(P.head, fwd, sw * 0.13 * state.sing); turnBy(P.neck, fwd, sw * 0.05 * state.sing); turnBy(P.head, right, (me ? 0.07 + Math.max(0, beat) * 0.05 : 0.015 + Math.max(0, beat) * 0.03) * state.sing);   // (singing: swaying together, chins up, the beat in the head)
          if (!me) { turnBy(P.sp2, right, 0.03 * state.sing); if (other) turnBy(P.head, upw, signedAngle(fwd, wp(other.head).sub(wp(P.head)), upw) * 0.24 * state.sing); }   // (he leans back a little, his head to her)
          if (me && other && state.singT > 1.3) { const want = signedAngle(fwd, wp(other.head).sub(wp(P.head)), upw); turnBy(P.head, upw, want * 0.32 * state.sing * cl((state.singT - 1.3) / 0.4, 0, 1)); } }   // (and she sings it at him)
        if (me && (state.seat || 0) > 0.01) turnBy(P.head, fwd, 0.21 * toOther * state.seat);   // (her head tipped towards him)
        if (me && gHold > 0) turnBy(P.head, fwd, 0.2 * toOther * gHold * (1 - kissK));   // (the end pose: her head to his shoulder)
        if (kissK > 0.01 && other && P.mouth && state.mouthW[other.who]) {   // the kiss: the face to the other's lips (the neck a third, the head the rest), tilted - each to their own right - so the noses pass
          const tgt = state.mouthW[other.who];
          for (const [b, w] of [[P.neck, 0.35], [P.head, 0.9]]) { P.head.updateMatrixWorld(true); const m0 = P.head.localToWorld(P.mouth.clone()), f0 = P.head.localToWorld(P.mouth.clone().add(P.faceF)).sub(m0).normalize(), d0 = wp(other.head).sub(wp(P.head)).normalize();   /* (along the line between the heads: aimed at the lips, the direction went undefined as they met and both faces swung round) */
            const qa = new THREE.Quaternion().setFromUnitVectors(f0, d0), qb = new THREE.Quaternion().slerp(qa, w * kissK), qw = b.getWorldQuaternion(new THREE.Quaternion()); setWorldQ(b, qb.multiply(qw)); }
          P.head.updateMatrixWorld(true); turnBy(P.head, wp(other.head).sub(wp(P.head)).normalize(), 0.24 * kissK); }
        turnBy(P.head, upw, Math.sin(t * 0.37 + (me ? 2 : 0)) * 0.02);
        if (fl > 0.01 && other) { const want = signedAngle(fwd, wp(other.head).sub(wp(P.head)), upw); turnBy(P.neck, upw, want * 0.35 * fl); turnBy(P.head, upw, want * (me ? 0.35 : 0.25) * fl); }
        if (me && wink > 0) turnBy(P.head, fwd, 0.14 * bell(wink));
        if (!me && dip > 0.01) turnBy(P.head, right, -0.17 * dip);
        if (me && P.rollS * toOther > 0.12) turnBy(P.head, fwd, toOther * 0.2 * cl((P.rollS * toOther - 0.12) / 0.15, 0, 1));
        P.head.scale.setScalar(P.old.neck.visible === false ? 0.001 : 1);
      }
      if (P.eyes.length && P.old.eyes.length && P.old.neck) {
        let yaw = 0, pit = 0; for (const e of P.old.eyes) { yaw += e.rotation.y; pit += e.rotation.x; } yaw /= P.old.eyes.length; pit /= P.old.eyes.length;
        const atYou = me ? smirkStart : dip; if (atYou > 0.01) { const [a, b] = lookAngles(P, cam); yaw = ease(yaw, a, atYou); pit = ease(pit, b, atYou); }
        if (P.fl > 0.01 && other) { const [a, b] = lookAngles(P, wp(other.head)); yaw = ease(yaw, a, P.fl); pit = ease(pit, b, P.fl); }
        P.old.neck.getWorldQuaternion(q2); const eu = new THREE.Vector3(0, 1, 0).applyQuaternion(q2), er = new THREE.Vector3(1, 0, 0).applyQuaternion(q2);
        for (const e of P.eyes) { turnBy(e, eu, yaw); turnBy(e, er, pit); e.scale.setScalar(1); }
      }
      // ---- arms
      const goalUp = gT != null ? win(gT, 15, 104, 16) : 0;
      for (const A of P.arms) {
        const oS = wp(A.oldSh), oE = wp(A.oldEl), S = wp(A.up);
        let dirUp = oE.clone().sub(oS), wrist = A.oldEl.localToWorld(new THREE.Vector3(0, WRIST, 0)), k = 0, rDir = null, rW = null, ik = null, point = 0, fist = 0, wave = 0, hold = 0;
        const away = right.clone().multiplyScalar(A.inner ? toOther : -toOther);   // (out from the body on this arm's side)
        const reachUp = (lift, w) => { const d = upw.clone().multiplyScalar(0.9).add(away.clone().multiplyScalar(0.38)).add(fwd.clone().multiplyScalar(-0.08)).normalize(); rDir = d; rW = S.clone().add(d.clone().multiplyScalar((A.L1 + A.L2) * 0.9)).add(upw.clone().multiplyScalar(lift)); k = w; ik = null; };
        const relaxW = !me && !A.inner ? Math.max(state.relax, kissArm, state.sing || 0) : state.relax;
        if (!me && !A.inner && relaxW > 0.01 && P.door) {   // his outside arm along the door on a straight, elbow on the sill (one-handed: the inside hand drives)
          const elb = car.localToWorld(new THREE.Vector3(SEATS.him.seat[0] + 0.33, P.door.y + 0.06, SEATS.him.seat[2] - 0.02)), hand = car.localToWorld(new THREE.Vector3(SEATS.him.seat[0] + 0.36, P.door.y + 0.09 + 0.08 * (state.sing || 0) * Math.pow(Math.max(0, Math.sin(t * 2 * Math.PI * 1.9)), 2), SEATS.him.seat[2] - 0.27));   /* (singing: his hand slaps the door top on the beat) */   // (the elbow on the door's inner edge, the forearm along it)
          ik = { T: wrist.clone().lerp(hand, relaxW), pole: oE.clone().lerp(elb.add(upw.clone().multiplyScalar(-0.1)), relaxW) }; }
        if (me && A.inner && (state.seat || 0) > 0.01 && other) {   // her inside arm round the back of his seat: upper arm down and back, the forearm along his seat top, her hand behind his neck - from the front it disappears behind him
          k = state.seat; rDir = right.clone().multiplyScalar(0.5 * toOther).add(fwd.clone().multiplyScalar(-0.65)).add(upw.clone().multiplyScalar(-0.55));
          rW = wp(other.neck).add(fwd.clone().multiplyScalar(-0.13)).add(upw.clone().multiplyScalar(-0.06)); ik = null; A.seatK = k; } else A.seatK = 0;
        if (me && !A.inner) {   // her outside arm at rest: on her leg
          const down = ready || (wrist.clone().sub(oS).dot(upw) < -0.15 && (!W.goalSeq || kissArm > 0.3) && !W.crash && (her.k === 'idle' || her.k === 'look' || her.k === 'ask' || her.k === 'hold'));
          A.rest = ease(A.rest || 0, down || kissArm > 0.3 ? 1 : 0, Math.min(1, dt * 3));
          if (A.rest > 0.01) { k = A.rest; const hip = wp(A.thigh), knee = wp(A.calf); rW = hip.clone().lerp(knee, 0.58).add(upw.clone().multiplyScalar(0.07)).add(away.clone().multiplyScalar(0.035)); rDir = upw.clone().multiplyScalar(-1).add(fwd.clone().multiplyScalar(0.25)).add(away.clone().multiplyScalar(0.18)); }
        }
        if (me && !A.inner && state.wind > 0.01) {   // her arm riding the wind: up and out over the door, the hand rolling like a wing
          const d = away.clone().multiplyScalar(0.78).add(upw.clone().multiplyScalar(0.55)).add(fwd.clone().multiplyScalar(-0.25)).normalize();
          ik = { T: wrist.clone().lerp(S.clone().add(d.multiplyScalar((A.L1 + A.L2) * 0.87)).add(upw.clone().multiplyScalar(0.05 * Math.sin(t * Math.PI))), state.wind), pole: S.clone().add(upw.clone().multiplyScalar(-0.4)).add(fwd.clone().multiplyScalar(-0.2)).add(away.clone().multiplyScalar(0.25)) };
          k = 0; rW = null; wave = state.wind; }
        if (me && !A.inner && state.sing > 0.01) {   // singing: her fist a microphone ~5 cm in front of her chin, the elbow up and out (a two-bone reach: aiming the upper arm left the fist at her chest)
          const mic = wp(P.head).add(fwd.clone().multiplyScalar(0.14)).add(upw.clone().multiplyScalar(-0.085)).add(away.clone().multiplyScalar(0.04));
          ik = { T: wrist.clone().lerp(mic, state.sing), pole: S.clone().add(away.clone().multiplyScalar(0.35)).add(fwd.clone().multiplyScalar(0.15)).add(upw.clone().multiplyScalar(-0.38)) }; k = 0; rW = null; fist = 1; wave = 0; }   /* (the elbow ~45 deg down-out: the forearm rises to the mouth) */
        if (me && A.inner && ready && other) {   // the start line's 'ready' beat: her hand on his shoulder (holding on with both hands read as covering her top)
          const sh = other.arms.find((B) => B.inner); if (sh) { A.readyK = ease(A.readyK || 0, 1, Math.min(1, dt * 5)); ik = { T: wrist.clone().lerp(wp(sh.up).add(upw.clone().multiplyScalar(0.03)).add(right.clone().multiplyScalar(-0.03 * toOther)), A.readyK), pole: S.clone().add(upw.clone().multiplyScalar(-0.5)).add(fwd.clone().multiplyScalar(0.2)) }; k = 0; rW = null; } } else if (me && A.inner) A.readyK = 0;
        if (me && A.inner && state.airK > 0.05 && other) { const hs = other.arms.find((B) => B.inner);   // in the air she grabs his arm
          if (hs) { k = state.airK; ik = { T: wrist.clone().lerp(wp(hs.up).lerp(wp(hs.lo), 0.4).add(upw.clone().multiplyScalar(0.03)), state.airK), pole: S.clone().add(upw.clone().multiplyScalar(-0.6)).add(away.clone().multiplyScalar(0.3)) }; } }
        if (me && nitro > 0.01) reachUp(0.04, nitro);   // nitro: both her arms up
        if (!me && A.inner && nitro > 0.01) { const p2 = cl(state.boostT / 0.25, 0, 1) * cl((1.3 - state.boostT) / 0.35, 0, 1); if (p2 > 0.01) { reachUp(0, p2); fist = 1; } }   // his fist, once
        if (me && Math.max(goalUp, goalUp2) > 0.01) reachUp(0.05, Math.max(goalUp, goalUp2));
        if (!me && goalUp2 > 0.01) reachUp(0.02, goalUp2);   // (after the kiss: both of them, arms up)
        if (me && A.inner && kissArm > 0.01 && other) {   // the kiss: her near hand to her lap as they lean in (reaching across read as a bar), up to his cheek once they're close
          const toHer = wp(P.head).sub(wp(other.head)).normalize(), ofc = other.head.localToWorld(other.mouth.clone().add(other.faceF)).sub(other.head.localToWorld(other.mouth.clone())).normalize();
          let ch = other.head.localToWorld(other.mouth.clone()).addScaledVector(toHer, 0.05).addScaledVector(ofc, -0.06).add(upw.clone().multiplyScalar(-0.05));
          const dv = ch.clone().sub(S), mx = (A.L1 + A.L2) * 0.85; if (dv.length() > mx) ch = S.clone().add(dv.setLength(mx));   /* (the elbow kept bent) */
          const lap = wp(A.thigh).lerp(wp(A.calf), 0.5).add(upw.clone().multiplyScalar(0.08)), hk = cl((kissK - 0.5) / 0.4, 0, 1);
          ik = { T: wrist.clone().lerp(lap.lerp(ch, hk), kissArm), pole: S.clone().add(upw.clone().multiplyScalar(-0.45)).add(fwd.clone().multiplyScalar(0.3)) }; k = 0; rW = null; }
        if (!me && A.inner && goalUp > 0.01) { const p3 = win(gT, 15, 70, 12); if (p3 > 0.01) { reachUp(0, p3); fist = 1; } }
        if (k > 0 && rW) { dirUp = dirUp.normalize().lerp(rDir.normalize(), k); wrist = wrist.lerp(rW, k); }
        const elev = (ik ? ik.T.clone().sub(S).normalize() : dirUp.clone().normalize()).dot(upw);
        turnBy(A.clav, fwd, A.shrugSign * (cl((elev + 0.15) / 1.15, 0, 1) * 0.32 - 0.07 - 0.06 * (A.seatK || 0) + lg * Math.sin(t * 2 * Math.PI * 4) * 0.05 + (P.groove || 0) * Math.sin(t * 2 * Math.PI * 0.95 + (A.sd === 'l' ? 0 : Math.PI)) * 0.05));   // (her shoulder down round his seat; shoulders shimmy to the music)
        if (ik) armIK(A, ik.T, ik.pole); else armTo(A, dirUp, wrist);
        const raise = cl((wp(A.ha).sub(wp(A.up)).dot(upw) + 0.02) / 0.18, 0, 1) * (1 - point) * (1 - fist) * (1 - wave) * (1 - hold);
        const ax = wp(A.ha).sub(wp(A.lo)).normalize();
        if ((raise > 0.01 || wave > 0.01) && A.fingers[1][0]) {
          const palm = wp(A.fingers[1][2]).sub(wp(A.fingers[1][0])).projectOnPlane(ax);
          if (palm.lengthSq() > 1e-8) { if (raise > 0.01) turnBy(A.ha, ax, signedAngle(palm, cam.clone().sub(wp(A.ha)), ax) * raise * 0.85);
            if (wave > 0.01) turnBy(A.ha, ax, (signedAngle(palm, upw.clone().negate().add(fwd.clone().multiplyScalar(0.15)), ax) + 0.35 * Math.sin(t * Math.PI)) * wave); }   // (palm down, rolling like a wing)
        }
        const open = Math.max(raise, wave);
        A.fingers.forEach((ch, fi) => { const o = fi === 0 && point > 0 ? point : open; if (o < 0.01 || !ch[0] || !ch[2]) return;
          const hd = wp(ch[0]).sub(wp(A.ha)).normalize();
          for (let j = 0; j < 2; j++) { const a = wp(ch[j]), b = wp(ch[j + 1]), len = a.distanceTo(b), d0 = j ? wp(ch[j]).sub(wp(ch[j - 1])).normalize() : hd; aim(ch[j], a, b, b.clone().lerp(a.clone().add(d0.multiplyScalar(len)), o)); } });
      }
      if (P.glasses && !me && shadesUp > 0.01) { const w0 = wp(P.glasses).add(upw.clone().multiplyScalar(0.072 * shadesUp)).add(fwd.clone().multiplyScalar(-0.02 * shadesUp)); P.glasses.position.copy(P.glasses.parent.worldToLocal(w0)); turnBy(P.glasses, right, -0.55 * shadesUp); }   // (the kiss: his shades pushed up onto his head first)
      if (P.glasses) { const g = Math.max(dip * win(cnt, 84, 136, 6), P.fl * 0.6); if (g > 0.01) { const w0 = wp(P.glasses).add(upw.clone().multiplyScalar(-0.026 * g)).add(fwd.clone().multiplyScalar(0.011 * g)); P.glasses.position.copy(P.glasses.parent.worldToLocal(w0)); } }
      // ---- the face
      const om = P.old.mouth ? P.old.mouth.morphTargetInfluences : [0.3, 0, 0], F = P.face, kf = Math.min(1, dt * 10);
      const fun = FUN[P.who] * opt.fun * (1 - Math.min(1, om[2] * 2)) * (W.crash ? 0 : 1);
      F.s = ease(F.s, Math.min(1, om[0] + (1 - om[0]) * fun), kf); F.o = ease(F.o, om[1], kf); F.p = ease(F.p, om[2], kf);
      let bu = 0; for (const g of P.old.brows) bu += (g.position.y - g.userData.y0) / 0.0045; if (P.old.brows.length) bu /= P.old.brows.length;
      const bd = Math.max(0, -bu * 2); bu = Math.max(0, bu); F.bu = ease(F.bu, Math.min(1, bu * 0.8 + F.o * 0.25), kf); F.bd = ease(F.bd, Math.min(1, bd + F.p * 0.4), kf);
      const cheek = me ? smirkStart * 0.7 : dip * 0.9, joy = Math.max(lg, nitro, me ? state.wind * 0.6 : 0, goalUp);
      if (now > P.blinkAt + 160) P.blinkAt = now + 2600 + Math.random() * 3400;
      const bl = now > P.blinkAt ? Math.sin(Math.PI * Math.min(1, (now - P.blinkAt) / 160)) : 0;
      const smile = Math.max(F.s * (1 - F.p * 0.8), 0.95 * joy, P.fl);
      const vals = { mouthSmileLeft: Math.min(1, smile * (1 - cheek * 0.35)), jawOpen: Math.max(F.o * 0.85, lg * (0.78 + 0.15 * Math.sin(t * 2 * Math.PI * 4)), nitro * (me ? 1.0 : 0.85), P.fl * (me ? 0.2 : 0.3)), mouthPucker: F.p * (1 - joy),
        eyeBlinkLeft: bl, eyeBlinkRight: bl, browInnerUp: Math.max(F.bu * (1 - cheek * 0.5), joy * 0.35), browDownLeft: F.bd * (1 - joy),
        mouthSmileRight: cheek * 0.8, browOuterUpLeft: cheek * (me ? 0.7 : 1), eyeSquintLeft: Math.min(1, smile * 0.3 + cheek * 0.3 + lg * 0.6 + (me ? 0.25 * cl(wink * 1.6, 0, 1) : 0)) };   // (no wink: her lids are pink and a closed eye read as a 'black eye' (sceptic) - a smile, a tilt and one eyebrow instead)
      if (state.sing > 0.01) { const mo = Math.max(0, Math.sin(t * 2 * Math.PI * 3.8 + (me ? 0 : 1.3))); vals.jawOpen = Math.max(vals.jawOpen, state.sing * (0.3 + 0.62 * mo)); vals.mouthSmileLeft = Math.max(vals.mouthSmileLeft, 0.65 * state.sing); vals.browInnerUp = Math.max(vals.browInnerUp, 0.5 * state.sing); vals.mouthPucker *= 1 - state.sing; }   // (singing along)
      if (kissK > 0.01) { const ec = 0.92 * cl((kissK - 0.45) / 0.4, 0, 1); vals.mouthPucker = Math.max(vals.mouthPucker, (me ? 0.75 : 0.45) * kissK); vals.mouthSmileLeft *= 1 - 0.75 * kissK; vals.mouthSmileRight *= 1 - kissK; vals.jawOpen *= 1 - kissK; vals.eyeBlinkLeft = Math.max(vals.eyeBlinkLeft, ec); vals.eyeBlinkRight = Math.max(vals.eyeBlinkRight, ec); }   // (the kiss: eyes closed, lips puckered)
      for (const m of P.faces) { const d = m.morphTargetDictionary, inf = m.morphTargetInfluences; for (const n in vals) if (d[n] != null) inf[d[n]] = vals[n]; }
      for (const M of P.mats) { M.mt.userData.time.value = t; if (M.hair) M.mt.userData.wind.value = Math.min(1.25, Math.min(1, W.v / 45) * (W.ferry ? 0.3 : 1) * (1 + 0.5 * state.wind + 0.3 * nitro)); }
    }
    if (state.kOff) {   // the kiss: the two mouths found; the bodies closed by a share of the gap each frame (she 62%, he 38%), capped; back to nothing after
      for (const P of state.people) if (P.mouth) { P.head.updateMatrixWorld(true); state.mouthW[P.who] = P.head.localToWorld(P.mouth.clone()); }
      if (kissK > 0.3 && state.mouthW.him && state.mouthW.her) {
        const gap = state.mouthW.him.clone().sub(state.mouthW.her), want = gap.clone().setLength(Math.max(0, gap.length() - 0.012));   /* (lips ~1 cm apart: touching) */
        want.applyQuaternion(car.getWorldQuaternion(new THREE.Quaternion()).invert()); const g = Math.min(1, dt * 7);
        const dz = car.worldToLocal(wp(state.him.head)).z - car.worldToLocal(wp(state.her.head)).z;   /* (she sits further back: her head brought level with his, so the kiss is across the car - both profiles from in front) */
        state.kOff.her.addScaledVector(want, 0.62 * g); state.kOff.her.z += dz * 0.6 * g; state.kOff.him.addScaledVector(want, -0.38 * g); state.kOff.him.z -= dz * 0.4 * g;
        state.kOff.her.clampLength(0, 0.36); state.kOff.him.clampLength(0, 0.22); state.kissGap = gap.length();
      } else if (kissK < 0.05) { state.kOff.her.multiplyScalar(0.9); state.kOff.him.multiplyScalar(0.9); }
    }
    { const H = state.her, TL = car.userData.mhTails;
      car.children.forEach((c) => { if (c.isMesh && c.material && c.material.color && c.material.color.getHexString() === 'e0505e' && c.material.side === THREE.DoubleSide) c.visible = false; });   /* (the game's own scarf hid behind her hair: the headscarf instead) */
      if (TL && H && H.knot) {
        const P2 = TL.geometry.attributes.position, A = car.worldToLocal(H.head.localToWorld(v4.copy(H.knot))), sp = Math.min(1, W.v / 40) * (W.ferry ? 0.3 : 1), tm = performance.now(), NS = TL.userData.NS;
        for (let tl = 0; tl < 2; tl++) {
          let x = A.x + (tl ? 0.01 : -0.01), y = A.y, z = A.z + 0.01;
          for (let i = 0; i < NS; i++) {
            const f = i / (NS - 1), seg = 0.058, dz = 0.32 + sp * 0.7, dy = -0.95 + sp * 0.85, n = Math.hypot(dz, dy);
            if (i) { const ph = tm / 60 - i * 0.95 + tl * 1.9, amp = f * (0.25 + sp); x += Math.sin(ph) * 0.028 * amp + (tl ? 0.006 : -0.006) * (0.4 + sp); y += dy / n * seg + Math.cos(ph * 1.3) * 0.02 * amp; z += dz / n * seg; }
            const w = 0.026 * (1 - f * 0.45), o = (tl * NS + i) * 2, tw = Math.sin(tm / 55 - i * 0.8 + tl * 1.3) * f * (0.2 + sp), wx = Math.sin(tw) * w, wy = Math.cos(tw) * w;
            P2.setXYZ(o, x + wx, y + wy, z); P2.setXYZ(o + 1, x - wx, y - wy, z);
          }
        }
        P2.needsUpdate = true; TL.geometry.computeVertexNormals(); TL.visible = true;
      } else if (TL) TL.visible = false; }
  }

  // ---- the cinematic cameras (sceptic, round 1: "low, front three-quarter, headlight height, a slow push-in; at the goal a slow low orbit and a
  // push-in on the kiss, the results card held back 3 s"): laid over the game's camera for the frame being drawn, then put back
  const camOld = { p: new THREE.Vector3(), q: new THREE.Quaternion(), fov: 0 }, cv = new THREE.Vector3(), lk = new THREE.Vector3(), mtx = new THREE.Matrix4(), qq = new THREE.Quaternion();
  function cine(cm) {
    const W = window.ARCADE365 && window.ARCADE365.world, car = state.car; if (!W || !car || !opt.cine) return false;
    let k = 0, pos = null, look = null, fov = cm.fov; state.hudOff = false;
    if (W.count > 0) {   // the start line: from low at the front-left corner, pushing in on their faces; the game's own camera back for GO
      const p = 1 - Math.min(1, Math.max(0, (W.count - 40) / 160)), e = p * p * (3 - 2 * p); k = W.count > 26 ? 1 : 0;   // (a CUT to the game's camera at GO: a blend swept through the car)
      pos = new THREE.Vector3(-1.55 + 0.75 * e, 0.88 + 0.12 * e, -3.5 + 1.55 * e); look = new THREE.Vector3(0.05, 1.16, 0.5); fov = 30;   // (low at the front-left corner, pushing in on their faces)
    } else if (W.goalSeq) {   // the goal (sceptic r4): the game's swing round from behind to the front, high over the windscreen; in for the kiss (~2.7 s); back to 3.6 m with the car at ~76% of the width when the card comes (left)
      const t = state.gReal != null ? state.gReal : W.goalSeq.t, ss = (a0, b0, x) => { const u = cl((x - a0) / (b0 - a0), 0, 1); return u * u * (3 - 2 * u); };
      const kk = ss(25, 130, t) * (1 - ss(400, 478, t)), card = ss(172, 212, t), ph = (1 - kk) * Math.PI + kk * (Math.PI / 4) * (1 - card), kiss = 0;   /* (round his side to 45 deg off the nose, low; to the front when the card comes) */
      const d = 4.0 - 0.4 * card + 2.2 * (1 - kk);
      pos = new THREE.Vector3(Math.sin(ph) * d * 0.95 + 0.3 * kk * card, 1.1 + 0.45 * card * kk + 1.1 * (1 - kk) + 0.06 * Math.sin(t / 140), -Math.cos(ph) * d);
      look = new THREE.Vector3(1.0 * card * kk + 0.02, 1.12 + 0.28 * (1 - kk) + 0.14 * kiss, 0.45); fov = 34; k = ss(0, 0.25, kk);   /* (look slid to +x = screen-left from the front: the car sits right of the card) */
      if (t > 118 && t < 180 && state.him && state.her) {   /* (out ~0.3 s before the arms go up at 198: the payoff wide) */   // the kiss: cut in close, in front at head height, a little to her side, both profiles; a slow push
        const fdir = (P) => { P.head.updateMatrixWorld(true); const m = car.worldToLocal(P.head.localToWorld(P.mouth.clone())); return [m, car.worldToLocal(P.head.localToWorld(P.mouth.clone().add(P.faceF))).sub(m)]; };
        const [mh, fh] = fdir(state.him), [mr, fr] = fdir(state.her), hm = mh.clone().add(mr).multiplyScalar(0.5), pu = cl((t - 118) / 80, 0, 1);
        const ax = fr.clone().sub(fh); ax.y = 0; ax.normalize(); const pp = new THREE.Vector3(ax.z, 0, -ax.x); if (pp.z > 0) pp.negate();   /* (square on to the line between their FACES (the heads' line was skewed by her tilt), from the front: both profiles) */
        state.hudOff = true; look = hm.clone().add(new THREE.Vector3(0, 0.02, 0)); pos = hm.clone().addScaledVector(pp, 1.5 - 0.1 * pu); pos.y -= 0.01; fov = 19; k = 1; }   /* (a long lens on their faces: the lips on the upper third, cropped at the collarbones) */
      if (W.result && t < 196) W.result.t = W.t;   // (the results card waits for the kiss: the celebration first)
    }
    if (k <= 0) return false;
    camOld.p.copy(cm.position); camOld.q.copy(cm.quaternion); camOld.fov = cm.fov;
    car.localToWorld(pos); car.localToWorld(look);
    cv.copy(cm.position).lerp(pos, k); mtx.lookAt(cv, look, new THREE.Vector3(0, 1, 0)); qq.setFromRotationMatrix(mtx);
    cm.position.copy(cv); cm.quaternion.slerp(qq, k); cm.fov = cm.fov + (fov - cm.fov) * k; cm.updateProjectionMatrix(); cm.updateMatrixWorld(true);
    return true;
  }
  // the goal, retimed (sceptic r4: "the kiss before the card; hold an end pose"): the high-five skipped, the lean in and the kiss from 1.7 s
  // (1.4x), then the lean held - her arm round him - for as long as the goal lasts. The game's own clock only, while the world draws
  const wr0 = W3.render;
  W3.render = function (W, t, mode) {
    const G = W && W.goalSeq; if (!G || !opt.cine) { state.gReal = null; return wr0.call(this, W, t, mode); }
    const g = G.t; state.gReal = g; G.t = g < 100 ? g : g < 400 ? Math.min(222 + (g - 100) * 1.4, 360) : Math.min(g, 360 + (g - 400) * 2);   /* (from 400 back to the real clock: the swing back, the next round) */
    try { return wr0.call(this, W, t, mode); } finally { G.t = g; }
  };
  build(); window.__mh = state;
  const renderOrig = renderer.render, render0 = renderer.render.bind(renderer);
  renderer.render = function (sc, cm) {
    if (sc !== scene) return render0(sc, cm);
    const t = performance.now();
    if (t - state.last > 3) { state.last = t; try { const t1 = performance.now(); update(); const ms = performance.now() - t1; state.ms = state.ms == null ? ms : state.ms * 0.95 + ms * 0.05; state.msMax = Math.max(state.msMax || 0, ms); } catch (e) { console.error('mh', e); } }
    let moved = false; if (cm === W3.camera) { try { moved = cine(cm); } catch (e) { console.error('mh cam', e); } }
    const r = render0(sc, cm);
    if (moved) { cm.position.copy(camOld.p); cm.quaternion.copy(camOld.q); cm.fov = camOld.fov; cm.updateProjectionMatrix(); cm.updateMatrixWorld(true); }
    return r;
  };
  state.detach = () => {   // back to the game's own couple (coastrun.js: when a slower PC drops to the plainer look)
    if (state.off) return; state.off = true; state.hudOff = false; renderer.render = renderOrig; W3.render = wr0;
    for (const P of state.people) { for (const o of P.hide) o.visible = true; if (P.model.parent) P.model.parent.remove(P.model); }
    const car = state.car; if (car) for (const k of ['mhBoard', 'mhTails']) if (car.userData[k]) { car.remove(car.userData[k]); car.userData[k] = null; }
    state.people = [];
  };
  window.COAST_PEOPLE = state;   // (coastrun.js reads hudOff: no dashboard over the kiss)
  return state;
}
