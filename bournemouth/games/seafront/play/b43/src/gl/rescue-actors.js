// RESCUE ARCADE MODE - the people, boats and markers on the water (tr42).
//
// COST. One program, SEVEN instanced draw calls whatever the wave size (swimmer,
// seated figure, dinghy, paddleboard, sled, beacon, buoy). Every mesh is built
// once at construction; a frame only rewrites small per-instance buffers
// (12 floats each). Nothing here is created lazily inside a draw.
//
// FIGURES are neutral and generic: a swim cap, a bright buoyancy aid, a plain
// face tone. No organisation, livery, flag or text appears on anything.
//
// It draws AFTER SeaRenderer.draw() has returned, into the same frame and depth
// buffer, using the renderer's own view-projection (seaGL.vpM). renderer.js is
// not edited and draws nothing new when the mode is off, because this object
// does not exist then.
//
// Local mesh frame, matching craft.js: +X forward, +Y up, +Z right; the sim's
// heading convention (x += cos h, z += sin h) is the instance yaw.
//
// ⚠️ No backtick may appear inside the GLSL template literals below.

import { link, uniforms, buffer } from './core.js';
import { MeshBuilder } from './meshes.js';
import { SKY_GLSL } from './shaders.js';

const ATTR = { aPos: 0, aNormal: 1, aColor: 2, aAnim: 3, aInst0: 4, aInst1: 5, aInst2: 6 };
const MAX_INST = 96;
const INST_FLOATS = 12;

const VERT = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aNormal;
in vec4 aColor;
in float aAnim;
in vec4 aInst0;   // x, y, z, yaw
in vec4 aInst1;   // pitch, roll, phase, scale
in vec4 aInst2;   // tint rgb, tint amount
uniform mat4 uViewProj;
uniform float uTime;
uniform vec3 uPivot;
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

void main() {
  vec3 p = aPos;
  vec3 n = aNormal;
  if (aAnim > 0.0) {
    // A wave of the arm: rotate about the local X axis through the shoulder.
    float a = sin(uTime * 6.0 + aInst1.z) * 0.55 * aAnim;
    float c = cos(a), s = sin(a);
    vec2 d = p.yz - uPivot.yz;
    p.yz = uPivot.yz + vec2(d.x * c - d.y * s, d.x * s + d.y * c);
    n.yz = vec2(n.y * c - n.z * s, n.y * s + n.z * c);
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
uniform float uOvercast;

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
    // Marker paint: self-lit so it reads at 300 m, but still tone-mapped.
    col = base * 1.35;
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

// ---------------------------------------------------------------------------
// mesh assembly: MeshBuilder parts, each with one colour and an anim weight
// ---------------------------------------------------------------------------
class Kit {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.anim = []; this.idx = []; }
  add(color, fn, anim = 0, emissive = 0) {
    const b = new MeshBuilder();
    fn(b);
    const base = this.pos.length / 3;
    for (let i = 0; i < b.v.length; i += 3) {
      this.pos.push(b.v[i], b.v[i + 1], b.v[i + 2]);
      this.nrm.push(b.n[i], b.n[i + 1], b.n[i + 2]);
      this.col.push(color[0], color[1], color[2], emissive);
      this.anim.push(anim);
    }
    for (const k of b.i) this.idx.push(base + k);
    return this;
  }
  // raw triangles (for shapes MeshBuilder has no primitive for)
  tris(color, verts, emissive = 0) {
    for (let t = 0; t < verts.length; t += 9) {
      const ax = verts[t], ay = verts[t + 1], az = verts[t + 2];
      const bx = verts[t + 3], by = verts[t + 4], bz = verts[t + 5];
      const cx = verts[t + 6], cy = verts[t + 7], cz = verts[t + 8];
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const base = this.pos.length / 3;
      for (let k = 0; k < 3; k++) {
        this.pos.push(verts[t + k * 3], verts[t + k * 3 + 1], verts[t + k * 3 + 2]);
        this.nrm.push(nx, ny, nz);
        this.col.push(color[0], color[1], color[2], emissive);
        this.anim.push(0);
      }
      this.idx.push(base, base + 1, base + 2);
    }
    return this;
  }
  get tris3() { return this.idx.length / 3; }
}

// Linear-space paints. Plain, unbranded.
const PAINT = {
  face: [0.62, 0.40, 0.30],
  cap: [[0.80, 0.08, 0.06], [0.05, 0.22, 0.60], [0.85, 0.65, 0.05], [0.10, 0.45, 0.20]],
  suit: [0.06, 0.07, 0.09],
  vest: [0.95, 0.42, 0.02],
  vestAlt: [0.92, 0.80, 0.04],
  tube: [0.22, 0.24, 0.27],
  tubeDark: [0.08, 0.09, 0.10],
  floor: [0.05, 0.12, 0.14],
  board: [0.70, 0.74, 0.76],
  boardStripe: [0.02, 0.35, 0.45],
  sled: [0.95, 0.72, 0.02],
  sledDark: [0.10, 0.10, 0.11],
  rope: [0.85, 0.85, 0.80],
  marker: [1.0, 0.62, 0.10],
};

const SHOULDER = [0, 0.02, 0.19];   // swimmer's waving-arm pivot
const SEAT_SHOULDER = [0, 0.50, 0.19];

function buildSwimmer() {
  const k = new Kit();
  k.add(PAINT.suit, (b) => b.ellipsoid(0, -0.30, 0, 0.14, 0.34, 0.20, 10, 7));
  k.add(PAINT.vest, (b) => b.ellipsoid(0, -0.06, 0, 0.19, 0.16, 0.25, 10, 6));
  k.add(PAINT.face, (b) => b.ellipsoid(0, 0.20, 0, 0.10, 0.12, 0.09, 10, 7));
  k.add(PAINT.cap[0], (b) => b.ellipsoid(-0.01, 0.25, 0, 0.108, 0.09, 0.098, 10, 5));
  // waving arm
  k.add(PAINT.suit, (b) => { b.tube(0, 0.02, 0.19, 0.05, 0.30, 0.30, 0.05, 0.045, 6); b.tube(0.05, 0.30, 0.30, 0.02, 0.58, 0.26, 0.045, 0.04, 6); }, 1);
  k.add(PAINT.face, (b) => b.ellipsoid(0.02, 0.63, 0.26, 0.05, 0.06, 0.045, 6, 4), 1);
  // the other arm, reaching along the surface
  k.add(PAINT.suit, (b) => b.tube(0, 0.0, -0.19, 0.35, -0.02, -0.42, 0.05, 0.04, 6));
  return k;
}

function buildSeated() {
  const k = new Kit();
  k.add(PAINT.suit, (b) => b.ellipsoid(0, 0.30, 0, 0.13, 0.27, 0.17, 10, 7));
  k.add(PAINT.vestAlt, (b) => b.ellipsoid(0.01, 0.36, 0, 0.17, 0.19, 0.21, 10, 6));
  k.add(PAINT.face, (b) => b.ellipsoid(0.01, 0.72, 0, 0.09, 0.115, 0.085, 10, 7));
  k.add(PAINT.cap[1], (b) => b.ellipsoid(0, 0.77, 0, 0.098, 0.085, 0.09, 10, 5));
  k.add(PAINT.suit, (b) => {
    for (const s of [-1, 1]) {
      b.tube(0.02, 0.04, 0.09 * s, 0.40, 0.12, 0.11 * s, 0.07, 0.06, 6);
      b.tube(0.40, 0.12, 0.11 * s, 0.46, -0.28, 0.12 * s, 0.055, 0.045, 6);
    }
    b.tube(0, 0.50, -0.19, 0.25, 0.28, -0.22, 0.045, 0.04, 6);   // resting arm
  });
  k.add(PAINT.suit, (b) => { b.tube(0, 0.50, 0.19, 0.05, 0.78, 0.30, 0.045, 0.04, 6); b.tube(0.05, 0.78, 0.30, 0.02, 1.02, 0.26, 0.04, 0.035, 6); }, 1);
  k.add(PAINT.face, (b) => b.ellipsoid(0.02, 1.06, 0.26, 0.045, 0.055, 0.04, 6, 4), 1);
  return k;
}

// A swamped inflatable: a pointed-bow ring of tube segments, flooded floor.
function buildDinghy() {
  const k = new Kit();
  const pts = [];
  const N = 14, L = 1.55, W = 0.72;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    let x = Math.cos(a) * L, z = Math.sin(a) * W;
    if (x > 0) z *= 1 - 0.55 * Math.pow(x / L, 3);      // taper to the bow
    if (x < -L * 0.8) x = -L * 0.8;                       // square-ish transom
    pts.push([x, z]);
  }
  k.add(PAINT.tube, (b) => {
    for (let i = 0; i < N; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % N];
      b.tube(ax, 0.12, az, bx, 0.12, bz, 0.22, 0.22, 8, true, true);
    }
  });
  k.add(PAINT.tubeDark, (b) => {
    for (let i = 0; i < N; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % N];
      b.tube(ax * 1.1, 0.02, az * 1.18, bx * 1.1, 0.02, bz * 1.18, 0.05, 0.05, 5, false, false);
    }
  });
  k.tris(PAINT.floor, [
    -1.2, 0.02, -0.62, 1.2, 0.02, 0.0, 1.2, 0.02, -0.25,
    -1.2, 0.02, -0.62, -1.2, 0.02, 0.62, 1.2, 0.02, 0.0,
    -1.2, 0.02, 0.62, 1.2, 0.02, 0.25, 1.2, 0.02, 0.0,
  ]);
  return k;
}

function buildBoard() {
  const k = new Kit();
  k.add(PAINT.board, (b) => b.ellipsoid(0, 0.02, 0, 1.55, 0.07, 0.40, 14, 5));
  k.add(PAINT.boardStripe, (b) => b.ellipsoid(0, 0.035, 0, 1.2, 0.06, 0.10, 10, 4));
  return k;
}

// The rescue sled: a flat buoyant platform with grab rails and a short bridle
// line to the craft (see RescueScene.fill for where it rides).
export const SLED_ROPE = 4.2;
function buildSled() {
  const k = new Kit();
  k.add(PAINT.sled, (b) => b.ellipsoid(0, 0.05, 0, 1.25, 0.12, 0.80, 12, 5));
  k.add(PAINT.sledDark, (b) => {
    for (const s of [-1, 1]) b.tube(-0.9, 0.22, 0.78 * s, 0.9, 0.22, 0.78 * s, 0.035, 0.035, 5);
    b.tube(0.9, 0.22, -0.78, 0.9, 0.22, 0.78, 0.035, 0.035, 5);
  });
  // bridle to the board's starboard rail (the sled sits 2.2 m out, 0.8 m aft)
  k.add(PAINT.rope, (b) => b.tube(-0.3, 0.22, -0.75, -0.9, 0.30, -2.1, 0.02, 0.02, 4, false, false));
  return k;
}

// A tall self-lit column with a downward chevron: visible over the horizon of
// a chop, and unmistakably a game marker rather than an object in the scene.
function buildBeacon() {
  const k = new Kit();
  k.add([1, 1, 1], (b) => b.tube(0, 2.2, 0, 0, 13.0, 0, 0.22, 0.10, 8, false, true), 0, 1);
  const y0 = 13.6, y1 = 15.4, r = 0.9;
  const v = [];
  for (let i = 0; i < 4; i++) {
    const a0 = (i / 4) * Math.PI * 2, a1 = ((i + 1) / 4) * Math.PI * 2;
    const x0 = Math.cos(a0) * r, z0 = Math.sin(a0) * r, x1 = Math.cos(a1) * r, z1 = Math.sin(a1) * r;
    v.push(0, y0, 0, x1, y1, z1, x0, y1, z0);
    v.push(0, y1 + 0.35, 0, x0, y1, z0, x1, y1, z1);
  }
  k.tris([1, 1, 1], v, 1);
  return k;
}

function buildBuoy() {
  const k = new Kit();
  k.add([1, 1, 1], (b) => b.ellipsoid(0, 0.05, 0, 0.26, 0.13, 0.26, 8, 5), 0, 1);
  return k;
}

// ---------------------------------------------------------------------------
export class RescueActors {
  constructor(gl) {
    this.gl = gl;
    this.prog = link(gl, VERT, FRAG, 'rescueActors', ATTR);
    this.u = uniforms(gl, this.prog, ['uViewProj', 'uTime', 'uPivot', 'uCamPos', 'uSunDir', 'uExposure', 'uOvercast']);
    this.types = {};
    const defs = {
      swimmer: [buildSwimmer(), SHOULDER],
      seated: [buildSeated(), SEAT_SHOULDER],
      dinghy: [buildDinghy(), null],
      board: [buildBoard(), null],
      sled: [buildSled(), null],
      beacon: [buildBeacon(), null],
      buoy: [buildBuoy(), null],
    };
    for (const name in defs) this.types[name] = this._upload(defs[name][0], defs[name][1]);
    this.lastStats = { draws: 0, tris: 0, instances: 0 };
  }

  _upload(kit, pivot) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const nv = kit.pos.length / 3;
    const data = new Float32Array(nv * 11);
    for (let i = 0; i < nv; i++) {
      data.set([kit.pos[i * 3], kit.pos[i * 3 + 1], kit.pos[i * 3 + 2],
        kit.nrm[i * 3], kit.nrm[i * 3 + 1], kit.nrm[i * 3 + 2],
        kit.col[i * 4], kit.col[i * 4 + 1], kit.col[i * 4 + 2], kit.col[i * 4 + 3],
        kit.anim[i]], i * 11);
    }
    buffer(gl, gl.ARRAY_BUFFER, data);
    gl.enableVertexAttribArray(ATTR.aPos); gl.vertexAttribPointer(ATTR.aPos, 3, gl.FLOAT, false, 44, 0);
    gl.enableVertexAttribArray(ATTR.aNormal); gl.vertexAttribPointer(ATTR.aNormal, 3, gl.FLOAT, false, 44, 12);
    gl.enableVertexAttribArray(ATTR.aColor); gl.vertexAttribPointer(ATTR.aColor, 4, gl.FLOAT, false, 44, 24);
    gl.enableVertexAttribArray(ATTR.aAnim); gl.vertexAttribPointer(ATTR.aAnim, 1, gl.FLOAT, false, 44, 40);

    const inst = new Float32Array(MAX_INST * INST_FLOATS);
    const ibo = buffer(gl, gl.ARRAY_BUFFER, inst, gl.DYNAMIC_DRAW);
    for (let j = 0; j < 3; j++) {
      const loc = ATTR.aInst0 + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 48, j * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
    const index = nv > 65535 ? new Uint32Array(kit.idx) : new Uint16Array(kit.idx);
    buffer(gl, gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bindVertexArray(null);
    return {
      vao, ibo, inst, n: 0, count: kit.idx.length, tris: kit.tris3,
      type: nv > 65535 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, pivot: pivot || [0, 0, 0],
    };
  }

  begin() { for (const k in this.types) this.types[k].n = 0; }

  // x, y, z, yaw, pitch, roll, phase, scale, tint [r, g, b, amount]
  add(type, x, y, z, yaw, pitch = 0, roll = 0, phase = 0, scale = 1, tint = null) {
    const t = this.types[type];
    if (t.n >= MAX_INST) return;
    const o = t.n * INST_FLOATS, a = t.inst;
    a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = yaw;
    a[o + 4] = pitch; a[o + 5] = roll; a[o + 6] = phase; a[o + 7] = scale;
    if (tint) { a[o + 8] = tint[0]; a[o + 9] = tint[1]; a[o + 10] = tint[2]; a[o + 11] = tint[3]; }
    else { a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = 0; a[o + 11] = 0; }
    t.n++;
  }

  // Called after SeaRenderer.draw(): vp = seaGL.vpM, same frame, same depth.
  draw(cam, vp, sunDir, exposure, overcast, time) {
    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.u.uViewProj, false, vp);
    gl.uniform1f(this.u.uTime, time);
    gl.uniform3f(this.u.uCamPos, cam.x, cam.y, cam.z);
    gl.uniform3f(this.u.uSunDir, sunDir[0], sunDir[1], sunDir[2]);
    gl.uniform1f(this.u.uExposure, exposure);
    if (this.u.uOvercast) gl.uniform1f(this.u.uOvercast, overcast);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.CULL_FACE);
    let draws = 0, tris = 0, instances = 0;
    for (const name in this.types) {
      const t = this.types[name];
      if (!t.n) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, t.ibo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, t.inst, 0, t.n * INST_FLOATS);
      gl.uniform3f(this.u.uPivot, t.pivot[0], t.pivot[1], t.pivot[2]);
      gl.bindVertexArray(t.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, t.count, t.type, 0, t.n);
      draws++; tris += t.tris * t.n; instances += t.n;
    }
    gl.bindVertexArray(null);
    this.lastStats = { draws, tris, instances };
  }

  meshTris() {
    const o = {};
    for (const k in this.types) o[k] = this.types[k].tris;
    return o;
  }
}

// ---------------------------------------------------------------------------
// scene assembly from the game state (visual only; never feeds back into play)
// ---------------------------------------------------------------------------
const TINT = {
  amber: [1.0, 0.55, 0.06, 1], green: [0.15, 1.0, 0.35, 1], red: [1.0, 0.18, 0.12, 1],
  dimGreen: [0.10, 0.55, 0.22, 1], white: [0.9, 0.95, 1.0, 1],
};
// Dinghy seats on the tubes, facing inboard: [x, z, yaw offset].
const DINGHY_SEATS = [[0.55, -0.62, Math.PI / 2], [0.55, 0.62, -Math.PI / 2], [-0.75, -0.62, Math.PI / 2], [-0.75, 0.62, -Math.PI / 2]];
const SLED_SEATS = [[0.45, -0.35], [0.45, 0.35], [-0.45, -0.35], [-0.45, 0.35]];

export class RescueScene {
  constructor() { this.sled = null; }

  reset() { this.sled = null; }

  // Surface height and a gentle tilt at (x, z). Sea slot 3: the plant uses 0/1,
  // and sample() is a pure function of (x, z, t), so this cannot perturb physics.
  _surf(sea, x, z, t) {
    const s = sea.sample(x, z, t, 0, 3);
    return { y: s.height, nx: s.nx, nz: s.nz };
  }

  fill(actors, game, sim, pose, T) {
    const sea = sim.sea, t = sim.time;
    actors.begin();
    const obj = game.objective(pose);

    for (const g of game.groups) {
      const sf = this._surf(sea, g.x, g.z, t);
      const ch = Math.cos(g.yaw), sh = Math.sin(g.yaw);
      const pitch = -(sf.nx * ch + sf.nz * sh) * 0.8;
      const roll = (-sf.nx * sh + sf.nz * ch) * 0.8;
      const bob = Math.sin(t * 1.4 + g.id) * 0.04;
      if (g.kind === 'swimmer') {
        const p = g.people[0];
        if (p.state === 'water') actors.add('swimmer', g.x, sf.y + bob, g.z, g.yaw, 0, 0, p.phase);
      } else if (g.kind === 'board') {
        actors.add('board', g.x, sf.y - 0.02, g.z, g.yaw, pitch, roll);
        const p = g.people[0];
        if (p.state === 'water') actors.add('seated', g.x, sf.y + 0.09, g.z, g.yaw + Math.PI / 2, pitch, roll, p.phase);
      } else {
        actors.add('dinghy', g.x, sf.y - 0.10, g.z, g.yaw, pitch, roll);
        for (const p of g.people) {
          if (p.state !== 'water') continue;
          const [sx, sz, yo] = DINGHY_SEATS[p.seat % 4];
          actors.add('seated', g.x + ch * sx - sh * sz, sf.y + 0.20, g.z + sh * sx + ch * sz, g.yaw + yo, 0, 0, p.phase);
        }
      }
      if (!g.inWater) continue;
      const isObj = obj && obj.kind === 'group' && obj.group === g;
      const here = game.nearGroup === g;
      const tint = here ? (game.status === 'picking' ? TINT.green : game.status === 'tooFast' ? TINT.red : TINT.amber) : TINT.amber;
      // Markers grow with range so they keep a readable width on screen (a
      // 0.2 m column is sub-pixel at 180 m): x1 inside 60 m, up to x4.
      const dist = Math.hypot(pose.x - g.x, pose.z - g.z);
      // ... and shrink right beside you, where the float ring does the job.
      const far = dist < 30 ? 0.45 + dist / 55 : Math.min(4, Math.max(1, dist / 60));
      actors.add('beacon', g.x, sf.y, g.z, t * 0.8, 0, 0, 0, (isObj ? 1.15 : 0.85) * far, tint);
      // A ring of floats at the pickup radius once you are close enough to need it.
      if (Math.hypot(pose.x - g.x, pose.z - g.z) < 90) {
        const R = T.pickupRadius, n = 10;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + t * 0.25;
          const bx = g.x + Math.cos(a) * R, bz = g.z + Math.sin(a) * R;
          actors.add('buoy', bx, this._surf(sea, bx, bz, t).y, bz, 0, 0, 0, 0, 0.8, tint);
        }
      }
    }

    // drop-off zone
    const Z = game.zone;
    const zoneHot = game.aboard.length > 0;
    const ztint = game.inZone && game.status === 'dropping' ? TINT.amber : zoneHot ? TINT.green : TINT.dimGreen;
    const zs = this._surf(sea, Z.x, Z.z, t);
    const zfar = Math.min(4, Math.max(1, Math.hypot(pose.x - Z.x, pose.z - Z.z) / 60));
    actors.add('beacon', Z.x, zs.y, Z.z, -t * 0.6, 0, 0, 0, (zoneHot ? 1.5 : 1.0) * zfar, ztint);
    const nb = 20;
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * Math.PI * 2;
      const bx = Z.x + Math.cos(a) * Z.r, bz = Z.z + Math.sin(a) * Z.r;
      actors.add('buoy', bx, this._surf(sea, bx, bz, t).y, bz, 0, 0, 0, 0, 1.3 * Math.min(2.5, zfar), ztint);
    }

    // THE SLED rides alongside, not behind. The chase camera sits 3.4-4.9 m
    // behind the rider (view3d.js), so anything towed astern is under or behind
    // the lens and the player never sees who they picked up (tried: a 5.4 m
    // stern tow rendered only its rope). Held on a short bridle 2.4 m to
    // starboard and 0.9 m ahead - level with the rider in the chase frame -
    // and eased toward that point so it swings wide in a turn.
    const hx = Math.cos(pose.heading), hz = Math.sin(pose.heading);
    const tx = pose.x + hx * 0.9 - hz * 2.4, tz = pose.z + hz * 0.9 + hx * 2.4;
    const dtf = Math.max(0, Math.min(0.1, t - (this.lastT ?? t)));
    this.lastT = t;
    if (!this.sled || !Number.isFinite(this.sled.x) || Math.hypot(this.sled.x - tx, this.sled.z - tz) > 12) {
      this.sled = { x: tx, z: tz, yaw: pose.heading };
    }
    const s = this.sled;
    const k = Math.min(1, dtf * 6);
    s.x += (tx - s.x) * k; s.z += (tz - s.z) * k;
    let dy = pose.heading - s.yaw; dy -= Math.PI * 2 * Math.round(dy / (Math.PI * 2));
    s.yaw += dy * Math.min(1, dtf * 4);
    const syaw = s.yaw;
    const ss = this._surf(sea, s.x, s.z, t);
    const cy = Math.cos(syaw), sy = Math.sin(syaw);
    actors.add('sled', s.x, ss.y, s.z, syaw, -(ss.nx * cy + ss.nz * sy) * 0.8, (-ss.nx * sy + ss.nz * cy) * 0.8);
    for (let i = 0; i < game.aboard.length && i < SLED_SEATS.length; i++) {
      const [ox, oz] = SLED_SEATS[i];
      actors.add('seated', s.x + cy * ox - sy * oz, ss.y + 0.14, s.z + sy * ox + cy * oz, syaw, 0, 0, game.aboard[i].phase, 0.95);
    }
    return obj;
  }
}
