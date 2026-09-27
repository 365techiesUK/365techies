// Minimal WebGL2 helpers. No library, no assets, no CDN.
//
// Everything here is defensive on purpose: this project has no way to catch a
// shader compile error at build time, so a failure has to report itself loudly
// and let the caller fall back to the canvas-2D renderer rather than showing a
// black screen.

export function getContext(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: true,
    depth: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  return gl || null;
}

// Compiles and reports the actual GLSL error with the offending line, because
// "compile failed" alone costs an hour every time.
export function compile(gl, type, src, label) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) || '';
    const lines = src.split('\n');
    const m = /ERROR:\s*\d+:(\d+)/.exec(log);
    let ctx = '';
    if (m) {
      const n = parseInt(m[1], 10);
      for (let i = Math.max(0, n - 4); i < Math.min(lines.length, n + 3); i++) {
        ctx += `${String(i + 1).padStart(4)} ${i + 1 === n ? '>>' : '  '} ${lines[i]}\n`;
      }
    }
    gl.deleteShader(sh);
    throw new Error(`[gl] ${label} compile failed\n${log}\n${ctx}`);
  }
  return sh;
}

// `attribs` pins attribute locations before linking. This matters the moment a
// VAO is shared between programs - the shadow depth pass reuses the same
// geometry VAOs as the lit passes, and if the linker assigns aPos a different
// index in each program the depth pass silently reads the wrong stream.
export function link(gl, vsSrc, fsSrc, label, attribs) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc, label + '.vert');
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc, label + '.frag');
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  if (attribs) for (const name in attribs) gl.bindAttribLocation(p, attribs[name], name);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(`[gl] ${label} link failed: ${log}`);
  }
  return p;
}

// Uniform locations, fetched once. A null location is silently ignored by
// gl.uniform*, which is how a typo becomes a black screen that takes an hour to
// find - so collect them and let the caller assert.
export function uniforms(gl, program, names) {
  const u = {};
  const missing = [];
  for (const n of names) {
    u[n] = gl.getUniformLocation(program, n);
    if (u[n] === null) missing.push(n);
  }
  u.$missing = missing;
  return u;
}

export function buffer(gl, target, data, usage) {
  const b = gl.createBuffer();
  gl.bindBuffer(target, b);
  gl.bufferData(target, data, usage || gl.STATIC_DRAW);
  return b;
}

// ---------------------------------------------------------------------------
// Just enough matrix maths, column-major to match WebGL's uniformMatrix4fv.
// ---------------------------------------------------------------------------
export function perspective(out, fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
  out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
  out[8] = 0; out[9] = 0; out[10] = (far + near) / (near - far); out[11] = -1;
  out[12] = 0; out[13] = 0; out[14] = (2 * far * near) / (near - far); out[15] = 0;
  return out;
}

// Camera convention matches view3d.js exactly, deliberately: forward is
// (cos p cos y, sin p, cos p sin y). If these two ever disagree the craft drawn
// by the 2D overlay slides off the water drawn by the GPU.
export function viewFromYawPitch(out, px, py, pz, yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const fx = cp * cy, fy = sp, fz = cp * sy;
  // right = normalize(cross(forward, worldUp)) = (-fz, 0, fx).
  //
  // This had the sign the other way round, which is cross(worldUp, forward).
  // With forward = +X that gives right = -Z and then up = cross(right, forward)
  // evaluates to (0,-1,0) - so the whole scene rendered mirrored AND upside
  // down, sky along the bottom edge.
  let rx = -fz, ry = 0, rz = fx;
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl; ry /= rl; rz /= rl;
  // up = cross(right, forward)
  const ux = ry * fz - rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy - ry * fx;
  out[0] = rx; out[4] = ry; out[8] = rz; out[12] = -(rx * px + ry * py + rz * pz);
  out[1] = ux; out[5] = uy; out[9] = uz; out[13] = -(ux * px + uy * py + uz * pz);
  out[2] = -fx; out[6] = -fy; out[10] = -fz; out[14] = (fx * px + fy * py + fz * pz);
  out[3] = 0; out[7] = 0; out[11] = 0; out[15] = 1;
  return out;
}

export function multiply(out, a, b) {
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
    out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
    out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
    out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
    out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
  }
  return out;
}
