// Sun shadows.
//
// The single biggest missing realism cue in the scene, and the one that keeps
// paying at 300 m where texture detail does not. Without it nothing is
// grounded: the rider floats, the pier does not occlude the low sun, and the
// eye reads the whole thing as a diagram.
//
// Plain shadow mapping: render scene depth from the sun's point of view into a
// depth texture, then in the main passes project each fragment into that space
// and compare. Orthographic, because the sun is a directional light.
//
// The map follows the camera rather than covering the whole 3 km course - at
// 20 cm per texel a course-wide map would need 16k x 16k. It is SNAPPED to
// whole texels, which is what stops shadow edges crawling as you move.

import { link, uniforms } from './core.js';

// Pinned attribute locations, shared by every program that draws geometry the
// shadow pass also has to draw. Change these in one place only.
export const ATTRIBS = { aPos: 0, aNormal: 1, aColor: 2, aMat: 3 };

export const SHADOW_SIZE = 2048;
const EXTENT = 140;        // m, half-width of the shadowed region around the camera
const DEPTH_RANGE = 500;   // m along the light direction

// ?wdbg=noshadow (2026-09-16, tmp-tr22): ablation - sunShadow() returns 1.0
// (fully lit) everywhere, so every shadow-map lookup in the water, craft, coast
// and pier shaders is switched off at shader build time. Same device as the
// wdbg() flags in shaders.js. With the flag ABSENT the interpolation below is an
// empty string, so the GLSL is character-identical to the pre-change file and
// renders are byte-identical. The shadow depth pass itself still runs.
const NOSHADOW = (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined'
  ? (new URLSearchParams(location.search).get('wdbg') || '') : '').split(',').includes('noshadow');

// Depth bias in NORMALISED units, so its world size is bias * DEPTH_RANGE.
// This was 0.0035 against a 900 m range = 3.1 m of slack, which is taller than
// the rider - so the rider could never occlude anything and shadows barely
// registered. At 500 m these are 12 cm grazing / 2.5 cm face-on.
const BIAS_MAX = 0.00025;
const BIAS_MIN = 0.00005;

const DEPTH_VERT = `#version 300 es
precision highp float;
in vec3 aPos;
uniform mat4 uLightViewProj;
uniform mat4 uModel;
void main() { gl_Position = uLightViewProj * uModel * vec4(aPos, 1.0); }
`;

const DEPTH_FRAG = `#version 300 es
precision highp float;
void main() {}
`;

// Sampling snippet shared by every lit shader. PCF over 3x3 with a slope-scaled
// bias - a constant bias either detaches the shadow from its caster or produces
// acne on the water, which is nearly flat and therefore the worst case.
export const SHADOW_GLSL = `
// GLSL ES 3.00 gives sampler2D a default precision but NOT sampler2DShadow, so
// this qualifier is mandatory - without it every shader including this chunk
// fails to compile.
uniform highp sampler2DShadow uShadowMap;
uniform mat4 uLightViewProj;
uniform float uShadowTexel;
const float BIAS_MAX = ${BIAS_MAX.toFixed(6)};
const float BIAS_MIN = ${BIAS_MIN.toFixed(6)};
// Normalised depth is worldDistance / DEPTH_RANGE along the light, so a
// world-space slack converts at 1/${DEPTH_RANGE} - see the bias note above.
const float SHADOW_INV_RANGE = ${(1 / DEPTH_RANGE).toFixed(6)};

// slackWorld: extra depth slack in METRES along the light ray, on top of the
// acne bias. 0 keeps exact shadows. A receiver passes a positive value to
// ADMIT direct light when its occluder is nearer than the slack - used by the
// coast shader for the pier substructure's outer sunlit band (photo 763);
// see the scoped call site in craft.js. Slack can only ever add light, never
// shadow, so it cannot introduce acne.
float sunShadow(vec3 worldPos, vec3 N, vec3 L, float slackWorld) {
${NOSHADOW ? '  return 1.0;\n' : ''}  vec4 lp = uLightViewProj * vec4(worldPos, 1.0);
  vec3 p = lp.xyz / lp.w * 0.5 + 0.5;
  if (p.x < 0.001 || p.x > 0.999 || p.y < 0.001 || p.y > 0.999 || p.z > 0.999) return 1.0;

  float ndl = max(dot(N, L), 0.0);
  float bias = mix(BIAS_MAX, BIAS_MIN, ndl) + slackWorld * SHADOW_INV_RANGE;
  p.z -= bias;

  float s = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      s += texture(uShadowMap, vec3(p.xy + vec2(float(i), float(j)) * uShadowTexel, p.z));
    }
  }
  return s / 9.0;
}

float sunShadow(vec3 worldPos, vec3 N, vec3 L) {
  return sunShadow(worldPos, N, L, 0.0);
}
`;

export class ShadowMap {
  constructor(gl) {
    this.gl = gl;
    this.size = SHADOW_SIZE;

    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, this.size, this.size, 0,
      gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Comparison mode: sampler2DShadow returns the PCF result directly, which
    // gets hardware bilinear filtering of the comparison for free.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);

    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.tex, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('[gl] shadow FBO incomplete: 0x' + st.toString(16));

    this.prog = link(gl, DEPTH_VERT, DEPTH_FRAG, 'shadowDepth', ATTRIBS);
    this.u = uniforms(gl, this.prog, ['uLightViewProj', 'uModel']);

    this.lightVP = new Float32Array(16);
    this.identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }

  // Orthographic light matrix centred on (cx, cz), snapped to whole texels.
  update(cx, cz, sunDir) {
    const texelWorld = (EXTENT * 2) / this.size;
    const sx = Math.round(cx / texelWorld) * texelWorld;
    const sz = Math.round(cz / texelWorld) * texelWorld;

    // Light basis: look along -sunDir (the sun is a direction TO the light).
    let fx = -sunDir[0], fy = -sunDir[1], fz = -sunDir[2];
    const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
    let rx = -fz, ry = 0, rz = fx;                 // cross(f, worldUp)
    const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
    const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;

    // Eye placed back along the light so the whole depth range is in front.
    const back = DEPTH_RANGE * 0.5;
    const ex = sx - fx * back, ey = -fy * back, ez = sz - fz * back;

    const V = [
      rx, ux, -fx, 0,
      ry, uy, -fy, 0,
      rz, uz, -fz, 0,
      -(rx * ex + ry * ey + rz * ez),
      -(ux * ex + uy * ey + uz * ez),
      (fx * ex + fy * ey + fz * ez), 1,
    ];
    const n = 1, f = DEPTH_RANGE;
    const P = [
      1 / EXTENT, 0, 0, 0,
      0, 1 / EXTENT, 0, 0,
      0, 0, -2 / (f - n), 0,
      0, 0, -(f + n) / (f - n), 1,
    ];
    const o = this.lightVP;
    for (let c = 0; c < 4; c++) {
      const b0 = V[c * 4], b1 = V[c * 4 + 1], b2 = V[c * 4 + 2], b3 = V[c * 4 + 3];
      o[c * 4] = P[0] * b0 + P[4] * b1 + P[8] * b2 + P[12] * b3;
      o[c * 4 + 1] = P[1] * b0 + P[5] * b1 + P[9] * b2 + P[13] * b3;
      o[c * 4 + 2] = P[2] * b0 + P[6] * b1 + P[10] * b2 + P[14] * b3;
      o[c * 4 + 3] = P[3] * b0 + P[7] * b1 + P[11] * b2 + P[15] * b3;
    }
    return o;
  }

  // Render the casters. Front-face culling while filling the map pushes acne to
  // the back faces, where it is hidden.
  begin() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.size, this.size);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.u.uLightViewProj, false, this.lightVP);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);
  }

  // `offset` (bytes) defaults to 0 - every existing call is unchanged; the Viking pier siege
  // passes one to skip the hidden pier crowd's index range (renderer.js // >>> RAID).
  drawCaster(vao, count, indexType, model, offset = 0) {
    const gl = this.gl;
    gl.uniformMatrix4fv(this.u.uModel, false, model || this.identity);
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, count, indexType, offset);
    gl.bindVertexArray(null);
  }

  end(viewportW, viewportH) {
    const gl = this.gl;
    gl.cullFace(gl.BACK);
    gl.disable(gl.CULL_FACE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, viewportW, viewportH);
  }

  // Bind for reading in the lit passes.
  bind(gl, prog, u, unit = 4) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    if (u.uShadowMap) gl.uniform1i(u.uShadowMap, unit);
    if (u.uLightViewProj) gl.uniformMatrix4fv(u.uLightViewProj, false, this.lightVP);
    if (u.uShadowTexel) gl.uniform1f(u.uShadowTexel, 1 / this.size);
  }
}
