/* 365 Coast Run - the 3D world (5 Oct 2026; the "premium" look the same day). three.js draws the road, the land and sea,
 * the sky, the roadside, the traffic and your car; coastrun.js draws the dashboard over the top. The rules (engine.js) hold
 * the road as a line of segments, each with a bend and a height; here each segment is given its place in the world
 * (poses()), and the road, verges, cliffs, beach and hills are built in chunks of CH segments as the car comes to them.
 * Everything is our own: shapes from models3d.js, textures painted on the spot, the sky and clouds worked out in a shader.
 *
 * The look: physically lit materials with the sky as their surroundings (so the paintwork, the glass and the sea reflect
 * it), a sky with a glowing sun and drifting clouds, a sea you can see the sandy shallows through, surf on the beaches,
 * then a soft glow on the bright things (bloom), a colour grade for each place and a speed blur on the boost. A slow PC
 * (quality(true)) skips the glow, the grade and the shadows.
 *
 * World axes: y up; a road heading th runs along (sin th, 0, -cos th) and its right is (cos th, 0, sin th), so a bend
 * to the right (k > 0) turns th up. At a fork the two roads are the main line moved out sideways by forkOff on each
 * side; the next stretch starts at the end of the road taken. */
import * as THREE from 'three';
import { EffectComposer } from '../common/vendor/three-r185/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../common/vendor/three-r185/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../common/vendor/three-r185/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../common/vendor/three-r185/addons/postprocessing/OutputPass.js';
import { ShaderPass } from '../common/vendor/three-r185/addons/postprocessing/ShaderPass.js';
import * as MD from './models3d.js?v=14';

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
// sun [across, up], hemi [sky, ground, strength], fog [near, far], cover = how much cloud, cloud [lit, shade],
// grade [saturation, contrast, tint], env = how strongly the sky lights things, dress = extra scenery far from the road
// [model, variants, how many per segment and side, nearest, furthest]
const LOOK = {
  bournemouth: { sun: [0.6, 0.85], sunCol: '#fff1dc', sunI: 2.6, hemi: ['#d8eeff', '#8aa070', 0.55], fog: [180, 1400], cliff: '#d9a066', beach: '#ecd7a1', beachY: 1.2, cliffK: 0.75, hills: 14, rise: 70, edge: 'rail', sea: '#1d8cc4', seaOp: 0.82,
    cover: 0.36, cloud: ['#ffffff', '#aebfd6'], grade: [1.14, 1.05, '#fff8ef'], env: 1.0, glow: 1,
    dress: [['palm', 3, 0.32, 15, 40], ['bush', 2, 0.25, 12, 30], ['tuft', 6, 2.08, 8.8, 28], ['hotel', 4, 0.035, 70, 130]] },
  purbeck: { hedge: 16, sun: [0.3, 0.7], sunCol: '#fff3e2', sunI: 2.6, hemi: ['#dcecff', '#7a9a60', 0.55], fog: [260, 1700], fogCol: '#c4daea', hills: 40, rise: 120, wall: true,
    cover: 0.44, cloud: ['#ffffff', '#a6b6cc'], grade: [1.18, 1.07, '#fffaf2'], env: 1.0, glow: 1,
    dress: [['oak', 1, 0.28, 18, 95], ['beech', 1, 0.14, 18, 95], ['sheep', 2, 0.22, 14, 60], ['hay', 1, 0.08, 14, 60], ['bush', 2, 0.2, 12, 40], ['tuft', 6, 2.08, 8.8, 28]] },
  forest: { sun: [-0.4, 0.5], sunCol: '#ffe0aa', sunI: 2.5, hemi: ['#f8ecd0', '#8a7a50', 0.55], fog: [120, 1000], hills: 14, rise: 80, trees: true,
    cover: 0.3, cloud: ['#fff4e2', '#bcae9e'], grade: [1.2, 1.06, '#fff2e0'], env: 0.95, glow: 1,
    dress: [['pine', 1, 0.55, 12, 80], ['beech', 2, 0.4, 12, 80], ['birch', 2, 0.25, 12, 60], ['oak', 3, 0.2, 14, 80], ['logs', 1, 0.03, 12, 20], ['tuft', 6, 1.56, 8.8, 24]] },
  jurassic: { roadK: '#ece2d6', lift: [0.02, 0.016, 0.02], rays: 1, sun: [-0.62, 0.2], sunCol: '#ffcc98', sunI: 2.2, hemi: ['#d8c4dc', '#b09a60', 1.4], exp: 1.2, fog: [280, 1750], fogCol: '#e4ae8e', cliff: '#efe9dc', beach: '#e8dfc8', beachY: 0.5, cliffK: 0.3, hills: 22, rise: 90, edge: 'fence', sea: '#3a5290', seaOp: 0.9,
    cover: 0.42, cloud: ['#ffd8b0', '#8a6a86'], grade: [1.18, 1.16, '#fff8f0'], env: 0.62, glow: 1.5,
    dress: [['gorse', 1, 0.28, 12, 60], ['heather', 2, 0.35, 12, 60], ['rock', 3, 0.08, 15, 60], ['tuft', 6, 1.82, 8.8, 28]] },
  harbour: { sun: [0.5, 0.6], sunCol: '#a8b0d0', sunI: 0.8, hemi: ['#7a80a0', '#3a3a40', 1.6], fog: [80, 750], cliff: '#55585f', beach: '#3a3d44', beachY: -1, cliffK: 0.12, hills: 6, rise: 50, edge: 'quay', sea: '#0b1d3a', seaOp: 0.94, night: true,
    cover: 0.2, cloud: ['#4a5478', '#161b2e'], grade: [1.12, 1.08, '#eaf0ff'], env: 0.55, glow: 0.3,
    dress: [['building', 4, 0.12, 40, 110]] },
  needles: { hedge: 16, roadK: '#ccd6ea', sun: [0.58, 0.2], sunCol: '#ffc6ac', sunI: 2.5, hemi: ['#ffd8d0', '#7a8a70', 0.55], fog: [140, 1250], cliff: '#f3eee4', beach: '#e8e2d6', beachY: 0.4, cliffK: 0.3, hills: 20, rise: 90, edge: 'fence', sea: '#5f88b8', seaOp: 0.84,
    cover: 0.36, cloud: ['#ffe0d6', '#9c86a6'], grade: [1.12, 1.05, '#fff4f2'], env: 1.0, glow: 1.4,
    dress: [['heather', 2, 0.35, 12, 60], ['gorse', 1, 0.22, 12, 60], ['pony', 3, 0.04, 15, 60], ['tuft', 6, 1.82, 8.8, 28]] }
};
Object.assign(LOOK, {
  sandbanks: { sun: [0.5, 0.8], sunCol: '#fff3de', sunI: 2.6, hemi: ['#d8eeff', '#9ab080', 0.55], fog: [200, 1450], cliff: '#e2c08a', beach: '#f0dfb0', beachY: 0.9, cliffK: 0.6, hills: 8, rise: 40, edge: 'rail', sea: '#18a0c6', seaOp: 0.78,
    cover: 0.28, cloud: ['#ffffff', '#b0c4dc'], grade: [1.15, 1.05, '#fff9f0'], env: 1.0, glow: 1,
    dress: [['palm', 3, 0.3, 14, 40], ['villa', 4, 0.05, 40, 90], ['tuft', 6, 1.82, 8.8, 26], ['bush', 2, 0.2, 12, 30]] },
  christchurch: { hedge: 15, sun: [0.4, 0.85], sunCol: '#fff3e2', sunI: 2.6, hemi: ['#dcecff', '#8aa070', 0.55], fog: [190, 1400], cliff: '#c9b088', beach: '#dcc79a', beachY: 0.6, cliffK: 0.4, hills: 8, rise: 40, edge: 'fence', sea: '#3a8fb8', seaOp: 0.8,
    cover: 0.4, cloud: ['#ffffff', '#a8b8cc'], grade: [1.12, 1.05, '#fffaf2'], env: 1.0, glow: 1,
    dress: [['oak', 1, 0.15, 18, 80], ['tuft', 6, 2.34, 8.8, 30], ['bush', 2, 0.25, 12, 40], ['cottage', 2, 0.03, 30, 80]] },
  swanage: { hedge: 15, sun: [0.3, 0.75], sunCol: '#fff3e2', sunI: 2.6, hemi: ['#dcecff', '#7a9a60', 0.55], fog: [190, 1400], cliff: '#f2efe6', beach: '#f6f3ea', beachY: 0.5, cliffK: 0.3, hills: 26, rise: 100, edge: 'fence', sea: '#1f8ec2', seaOp: 0.8,
    cover: 0.38, cloud: ['#ffffff', '#a6b6cc'], grade: [1.12, 1.05, '#fffaf2'], env: 1.0, glow: 1,
    dress: [['gorse', 1, 0.25, 12, 60], ['sheep', 2, 0.15, 14, 60], ['tuft', 6, 1.95, 8.8, 28], ['oak', 1, 0.1, 20, 90], ['balloon', 4, 0.004, 150, 420]] },
  weymouth: { sun: [-0.5, 0.45], sunCol: '#ffe2b0', sunI: 2.6, hemi: ['#c8d4f0', '#8a9070', 0.65], fog: [260, 1650], fogCol: '#eedcc0', cliff: '#d8b080', beach: '#f2d9a0', beachY: 1.0, cliffK: 0.6, hills: 10, rise: 50, edge: 'rail', sea: '#2f86b8', seaOp: 0.8,
    cover: 0.3, cloud: ['#fff2dc', '#c0a898'], grade: [1.14, 1.05, '#fff4e6'], env: 1.0, glow: 1.2,
    dress: [['tuft', 6, 1.3, 8.8, 24], ['palm', 3, 0.05, 14, 30], ['balloon', 4, 0.003, 150, 420]] },
  lymington: { hedge: 14, roadK: '#d4dcec', sun: [0.6, 0.3], sunCol: '#ffd2a0', sunI: 2.5, hemi: ['#b8c0e8', '#7a8068', 0.7], fog: [240, 1600], fogCol: '#e2cdb8', cliff: '#b89a78', beach: '#d6c193', beachY: 0.4, cliffK: 0.3, hills: 8, rise: 40, edge: 'quay', sea: '#4a7aa6', seaOp: 0.82,
    cover: 0.32, cloud: ['#ffe8cc', '#a890a0'], grade: [1.13, 1.05, '#fff0e2'], env: 0.95, glow: 1.3,
    dress: [['oak', 1, 0.2, 16, 80], ['cottage', 2, 0.03, 25, 80], ['tuft', 6, 1.69, 8.8, 26], ['bush', 2, 0.2, 12, 40]] },
  lyme: { roadK: '#e8e2e4', lift: [0.03, 0.025, 0.05], rays: 1, sun: [-0.58, 0.14], sunCol: '#ffb090', sunI: 2.3, hemi: ['#c4b8d8', '#6a7088', 0.95], exp: 1.08, fog: [250, 1650], fogCol: '#d8a8a8', cliff: '#5f6670', beach: '#a59a8c', beachY: 0.5, cliffK: 0.3, hills: 18, rise: 80, edge: 'fence', sea: '#4c5a92', seaOp: 0.86,
    cover: 0.38, cloud: ['#ffc8c0', '#7a5a86'], grade: [1.12, 1.06, '#fff0f0'], env: 0.95, glow: 1.6,
    dress: [['terrace', 6, 0.06, 30, 70], ['oak', 1, 0.12, 18, 80], ['tuft', 6, 1.56, 8.8, 26]] },
  portland: { sun: [0.3, 0.06], sunCol: '#ffb890', sunI: 1.4, hemi: ['#9aa0d8', '#4a4a60', 1.1], fog: [140, 1100], fogCol: '#9c86a6', cliff: '#b8b0a0', beach: '#c9c2b0', beachY: 0.4, cliffK: 0.3, hills: 14, rise: 60, edge: 'fence', wall: true, sea: '#2c3e70', seaOp: 0.9,
    cover: 0.3, cloud: ['#e8b0b8', '#4a4a78'], grade: [1.1, 1.07, '#f0f0ff'], env: 0.75, glow: 1.2, dusk: true,
    dress: [['rock', 3, 0.08, 14, 60], ['tuft', 6, 1.04, 8.8, 24], ['cottage', 2, 0.02, 25, 70]] },
  goldencap: { hedge: 17, roadK: '#ece4da', lift: [0.018, 0.014, 0.018], rays: 1, sun: [-0.62, 0.22], sunCol: '#ffc888', sunI: 2.4, hemi: ['#d8c6dc', '#b09a60', 1.3], bloomK: 0.7, exp: 1.14, fog: [260, 1700], fogCol: '#dcbcae', cliff: '#d8a040', beach: '#e8c070', beachY: 0.5, cliffK: 0.3, hills: 26, rise: 100, edge: 'fence', sea: '#3f6496', seaOp: 0.85,
    cover: 0.36, cloud: ['#ffd8a8', '#8a6880'], grade: [1.2, 1.14, '#fff2e2'], env: 0.66, glow: 1.5,
    dress: [['gorse', 1, 0.25, 12, 60], ['sheep', 2, 0.15, 14, 60], ['tuft', 6, 1.82, 8.8, 28], ['oak', 1, 0.08, 20, 90]] },
  hengistbury: { sun: [0.5, 0.5], sunCol: '#b0b0d8', sunI: 0.8, hemi: ['#8080a8', '#3a3842', 1.5], fog: [90, 850], cliff: '#8a6a4a', beach: '#7a6a5a', beachY: 0.5, cliffK: 0.2, hills: 8, rise: 40, edge: 'fence', sea: '#16244a', seaOp: 0.93, night: true,
    cover: 0.22, cloud: ['#5a5488', '#1c1a34'], grade: [1.12, 1.08, '#eceaff'], env: 0.55, glow: 0.4,
    dress: [['heather', 2, 0.3, 12, 50], ['gorse', 1, 0.2, 12, 50], ['pine', 1, 0.05, 20, 70]] }
});
const FIELDS = {
  bournemouth: { cols: ['#6fbd4b', '#62b044', '#86c95a', '#7fbf50', '#5aa040'], k: 0.3 },
  sandbanks: { cols: ['#7cc257', '#72b84e', '#8fcc60', '#80c058', '#6aae48'], k: 0.25 },
  christchurch: { cols: ['#7cbf55', '#68a848', '#a9cf6a', '#d2cf80', '#8fbf5c'], k: 0.85 },
  purbeck: { cols: ['#79bb50', '#5f9e3c', '#9ccc5a', '#e2cf58', '#b49a62'], k: 1.0 },
  swanage: { cols: ['#7fbf55', '#6fae48', '#9ccf68', '#cfc272', '#8fb85a'], k: 0.7 },
  forest: { cols: ['#82a040', '#749238', '#9a9a48', '#668a34', '#a0a450'], k: 0.3 },
  jurassic: { cols: ['#98aa44', '#82983c', '#b0b850', '#d4b456', '#a0ac48'], k: 0.75 },
  weymouth: { cols: ['#86b850', '#78ac48', '#a6c862', '#e0c870', '#b5a06a'], k: 0.75 },
  harbour: { cols: ['#1d2a26', '#1a2622', '#22302a', '#1d2a26', '#1a2622'], k: 0.0 },
  lymington: { cols: ['#78ac4c', '#6a9a44', '#9fbf62', '#d6be70', '#8aa850'], k: 0.85 },
  lyme: { cols: ['#6a8c40', '#5e8038', '#7e9c48', '#a89a50', '#74944a'], k: 0.6 },
  portland: { cols: ['#5a7a46', '#6a7a50', '#7a7a60', '#4e6a40', '#8a8a70'], k: 0.5 },
  goldencap: { cols: ['#90a644', '#7e963c', '#a8b450', '#d8b456', '#98a848'], k: 0.75 },
  hengistbury: { cols: ['#2e3e30', '#2a382b', '#34443a', '#2e3e30', '#2a382b'], k: 0.15 },
  needles: { cols: ['#80a65b', '#729a50', '#94b468', '#bcb474', '#86a85a'], k: 0.55 }
};
const FLOWERS = { purbeck: 1, christchurch: 0.9, swanage: 0.8, lymington: 0.8, goldencap: 0.8, needles: 0.7, jurassic: 0.5, lyme: 0.6, weymouth: 0.5, bournemouth: 0.35, sandbanks: 0.3, forest: 0.25, portland: 0.2 };   // wild flowers in the grass close by
const DRY = { forest: 0.9, jurassic: 0.8, goldencap: 0.8, weymouth: 0.7, portland: 0.9, purbeck: 0.45, christchurch: 0.4 };   // how much the grass has dried in patches
const SANDY = { bournemouth: 1, sandbanks: 1, weymouth: 1, hengistbury: 1 };   // a promenade, then sand down to the sea (not grass)
const BIG = { castle: 1.5, arch: 1.4, goldcap: 1.3, headland: 1.3, priory: 1.35, cobb: 1.2, clock: 1.2, needles: 1.3 };   // the landmarks, grown so they read from far off
const SIGNS = { gate: 1, gantry: 1, nose: 1, board: 1, chev: 1, warn: 1, banner: 1 };
const lit = (look) => !!(look.night || look.dusk);   // lamps and headlights on

// ---------------------------------------------------------------- the sky: the colours, the sun and its glow, the clouds
const SKY_VS = 'varying vec3 vp; void main(){ vp = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const SKY_FS = [
  'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 gnd; uniform vec3 sunCol; uniform vec3 cLit; uniform vec3 cDark; uniform vec3 sunDir;',
  'uniform float midAt; uniform float cover; uniform float time; uniform float sunSize; uniform float sunGlow; uniform float discI;',
  'varying vec3 vp;',
  'float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }',
  'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y); }',
  'float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < OCT; i++) { s += a * vn(p); p = p * 2.03 + vec2(3.1, 1.7); a *= 0.5; } return s; }',
  'void main(){',
  '  vec3 d = normalize(vp); float h = d.y;',
  '  vec3 c = mix(hor, mid, smoothstep(0.0, midAt, h)); c = mix(c, top, smoothstep(midAt, 1.0, h));',
  '  float cs = dot(d, sunDir), sd = max(cs, 0.0), ang = acos(clamp(cs, -1.0, 1.0));',
  '  c += sunCol * (pow(sd, 10.0) * 0.12 + pow(sd, 90.0) * 0.5) * sunGlow;',
  '  c += sunCol * discI * (1.0 - smoothstep(sunSize * 0.8, sunSize, ang));',
  '#ifdef CLOUDS',
  '  if (h > 0.0 && cover > 0.0) {',
  '    vec2 uv = d.xz / (h + 0.2) * 0.6 + vec2(time * 0.004, time * 0.0013);',
  '    float big = vn(uv * 0.42 + 5.3), n = fbm(uv) * 0.75 + big * 0.45 - 0.1;',   // big heaps of cloud with billowing edges
  '    float m = smoothstep(1.0 - cover, 1.0 - cover + 0.12, n);',
  '    float n2 = fbm(uv + normalize(sunDir.xz + 1e-4) * 0.06) * 0.75 + vn((uv + normalize(sunDir.xz + 1e-4) * 0.06) * 0.42 + 5.3) * 0.45 - 0.1;',
  '    float lit = clamp(0.85 - (n2 - n) * 6.0, 0.0, 1.0) * mix(1.0, 0.72, smoothstep(1.0 - cover + 0.1, 1.0 - cover + 0.5, n));',
  '    vec3 cc = mix(cDark, cLit * 1.25, lit) + sunCol * pow(sd, 6.0) * 0.22 * (1.0 - m * 0.5);',
  '    c = mix(c, cc, m * smoothstep(0.0, 0.16, h) * 0.96);',
  '  }',
  '#endif',
  '#ifdef ENV',
  '  if (h < 0.0) c = mix(hor, gnd, smoothstep(0.0, 0.2, -h));',
  '#else',
  '  if (h < 0.0) c = hor;',
  '#endif',
  '  gl_FragColor = vec4(c, 1.0);',
  '  #include <tonemapping_fragment>',
  '  #include <colorspace_fragment>',
  '}'
].join('\n');

// ---------------------------------------------------------------- the last step: saturation, contrast, the place's tint, a vignette, a speed blur, a flash
const GRADE = {
  uniforms: { tDiffuse: { value: null }, sat: { value: 1.12 }, con: { value: 1.05 }, vig: { value: 0.32 }, blur: { value: 0 }, tint: { value: new THREE.Color(1, 1, 1) }, flash: { value: 0 }, vib: { value: 0.2 }, curve: { value: 0.15 }, lift: { value: new THREE.Vector3() }, gpull: { value: 0.22 }, tone: { value: 1 }, grain: { value: 0.022 }, time: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse; uniform float sat; uniform float con; uniform float vig; uniform float blur; uniform vec3 tint; uniform float flash; uniform float vib; uniform float curve; uniform vec3 lift; uniform float gpull; uniform float tone; uniform float grain; uniform float time; varying vec2 vUv;',
    'void main(){',
    '  vec3 c = texture2D(tDiffuse, vUv).rgb;',
    '  if (blur > 0.002) { vec2 dd = (vUv - vec2(0.5, 0.52)) * blur * 0.009 * smoothstep(0.07, 0.22, length((vUv - vec2(0.5, 0.33)) * vec2(1.5, 1.0))); vec3 s = c; for (int i = 1; i < 8; i++) s += texture2D(tDiffuse, vUv - dd * float(i)).rgb; c = s / 8.0; }',
    '  float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, sat);',
    '  float sp = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, 1.0 + vib * (1.0 - clamp(sp * 2.0, 0.0, 1.0)) * clamp((max(c.g, c.b) - c.r) * 6.0, 0.0, 1.0) * smoothstep(0.08, 0.3, l));',   // vibrance: the duller colours (haze-washed greens and blues) lifted most
    '  c = (c - 0.5) * con + 0.5; c *= tint;',
    '  c = clamp(c, 0.0, 1.0); c = mix(c, c * c * (3.0 - 2.0 * c), curve);',
    '  c += lift * (1.0 - c);',   // a warm lift in the shadows (the sunset places)   // a gentle S-curve: richer shadows, cleaner highlights
    '  float L2 = dot(c, vec3(0.299, 0.587, 0.114)), gr = clamp((c.g - max(c.r, c.b)) * 5.0, 0.0, 1.0); c = mix(c, vec3(L2), gr * gpull);',   // the toy-bright greens calmer
    '  c += tone * ((1.0 - L2) * (1.0 - L2) * vec3(-0.012, 0.006, 0.022) + L2 * L2 * vec3(0.026, 0.01, -0.014));',   // cool shadows, warm highlights
    '  vec2 q = vUv - 0.5; c *= 1.0 - vig * dot(q, q) * 1.9;',
    '  c += grain * (fract(sin(dot(gl_FragCoord.xy + time * 61.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5);',   // a fine film grain
    '  c = mix(c, vec3(1.0), flash);',
    '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n')
};

export function createWorld() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;   // keeps the colours true (the filmic curve greyed them)
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.4, 3000);
  const fog = new THREE.Fog('#cfe7f6', 150, 1300); scene.fog = fog;

  // ---------------------------------------------------------------- the glow, the grade and the blur (not on a slow PC)
  const rt = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.6, 1.6); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GRADE); composer.addPass(grade);

  // ---------------------------------------------------------------- light
  const hemi = new THREE.HemisphereLight('#bfe3ff', '#6a8a50', 0.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4e0', 2.6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 400;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.5; sun.shadow.radius = 2;
  scene.add(sun); scene.add(sun.target);
  const headlight = new THREE.SpotLight('#fff1d0', 0, 120, 0.42, 0.65, 1.0); scene.add(headlight); scene.add(headlight.target);
  const glint = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glintTexture(), color: '#dfe6ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glint.rotation.order = 'YXZ'; glint.renderOrder = 2; glint.visible = false; scene.add(glint);   // the moon's path across the water
  const rays = new THREE.Sprite(new THREE.SpriteMaterial({ map: raysTexture(), color: '#ffd8a0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 }));
  rays.renderOrder = -6; rays.scale.setScalar(820); scene.add(rays);   // shafts of light fanning from a low sun (behind the hills, in front of the sky)
  const fill = new THREE.SpotLight('#fff0dc', 0, 9, 0.21, 0.5, 1.6); scene.add(fill); scene.add(fill.target);   // from just behind the camera onto the car
  const tailGlow = [-1, 1].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameGlow(), color: '#ff2030', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 })); s.scale.setScalar(0.75); return s; });
  const tailWash = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2), new THREE.MeshBasicMaterial({ map: radial(64, [[0, 'rgba(255,40,40,0.55)'], [0.5, 'rgba(255,30,30,0.18)'], [1, 'rgba(255,20,20,0)']]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  tailWash.rotation.x = -Math.PI / 2;
  const nitroLight = new THREE.PointLight('#ff8a30', 0, 4.2, 2);
  const cabinLight = new THREE.PointLight('#ffd8a8', 0, 1.5, 2);   // a dash light on the two of you after dark   // the jets light up the road behind
  const carGlow = new THREE.PointLight('#ffe2c0', 0, 10, 1.6); scene.add(carGlow);   // at night: the street lights' glow on the car (always there, so no shader rebuilds)   // at the front bumper, lighting the road ahead (never the car)

  // ---------------------------------------------------------------- the sky (and the same sky, with the land below, as everything's surroundings)
  const SU = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, gnd: { value: new THREE.Color('#5a7040') },
    sunCol: { value: new THREE.Color('#fff4e0') }, cLit: { value: new THREE.Color('#ffffff') }, cDark: { value: new THREE.Color('#aab8cc') }, sunDir: { value: new THREE.Vector3(0.3, 0.6, -0.7).normalize() },
    midAt: { value: 0.22 }, cover: { value: 0.35 }, time: { value: 0 }, sunSize: { value: 0.036 }, sunGlow: { value: 1 }, discI: { value: 14 } };
  const skyMat = new THREE.ShaderMaterial({ uniforms: SU, vertexShader: SKY_VS, fragmentShader: SKY_FS, defines: { CLOUDS: '', OCT: 5 }, side: THREE.BackSide, depthWrite: false, fog: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 32, 16), skyMat); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({ uniforms: SU, vertexShader: SKY_VS, fragmentShader: SKY_FS, defines: { CLOUDS: '', OCT: 3, ENV: '' }, side: THREE.BackSide, depthWrite: false, fog: false })));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial(128, [[0, 'rgba(255,255,250,1)'], [0.16, 'rgba(235,240,255,0.95)'], [0.3, 'rgba(180,200,255,0.3)'], [1, 'rgba(160,180,255,0)']]), fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  moon.scale.set(170, 170, 1); moon.renderOrder = -8; moon.visible = false; scene.add(moon);
  const stars = makeStars(); stars.visible = false; scene.add(stars);
  const ringFar = new THREE.Mesh(new THREE.CylinderGeometry(2300, 2300, 1, 64, 1, true), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  ringFar.renderOrder = -7; ringFar.frustumCulled = false; scene.add(ringFar);

  // ---------------------------------------------------------------- materials
  const leafy = (map) => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: map, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.88 });
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', '')); };   // the leaves keep their rounded normals on both faces
    m.customProgramCacheKey = () => 'leafy'; return m; };
  const MAT = {
    lit: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 }),
    shiny: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.26, metalness: 0.2 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.4, 2.4, 2.4) }),
    leaf: leafy(tex(MD.paintLeaves())), frond: leafy(tex(MD.paintFrond())), grass: leafy(tex(MD.paintGrass())),
    wave: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }),
    troof: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, emissive: '#3a3026' }),
    eyes: new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(0.7, 0.7, 0.66) }),
    twall: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, emissive: '#ffe2bc', emissiveIntensity: 0.38 }),
    stone: new THREE.MeshStandardMaterial({ vertexColors: true, map: stoneTexture(), roughness: 0.92 })
  };
  MAT.twall.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.rgb;'); };   // the lamps' light on the walls: brighter low down, by each part's own colour
  MAT.twall.customProgramCacheKey = () => 'twall';
  const KIT = (f) => { const k = new MD.Kit(); f(k); return k.build(); }, TW = E.TUN_W;
  const DECK = KIT((k) => k.box(2 * E.BRG_W + 0.9, 1.1, SEG + 0.06, 0, -1.2, 0, '#9a968c'));
  const TROOF = KIT((k) => { k.box(2 * TW + 2.4, 1.4, SEG + 0.7, 0, 5.7, 0, '#4f4a43', 0, 0, 0, 'troof'); k.box(2 * TW + 0.4, 0.35, 0.5, 0, 5.36, 0, '#3e3a34', 0, 0, 0, 'troof'); });
  const HEDGE = [0, 1, 2].map((v) => KIT((k) => {   // a length of hawthorn hedge: a dark body, lighter lumpy top
    const r = E.rnd(91 + v), cols = ['#3c6e2c', '#467a30', '#365f28'];
    k.box(1.1, 1.25, SEG + 0.5, 0, 0, 0, cols[v], 0, 0, 0, 'lit');
    for (let q = 0; q < 4; q++) k.ball(0.7 + r() * 0.25, (r() - 0.5) * 0.3, 1.15 + r() * 0.2, -1.6 + q * 1.05 + (r() - 0.5) * 0.4, ['#4e8a36', '#5a9640', '#447c30'][(q + v) % 3], 1, 0.62, 1.3, 'lit', 8);
    if (v === 1) k.ball(0.5, 0.2, 1.5, 0.4, '#e8e2d0', 1, 0.5, 1, 'lit', 6);   // may blossom
  }));
  const EYE = KIT((k) => k.box(0.1, 0.03, 0.07, 0, 0, 0, '#ffffff', 0, 0, 0, 'eyes'));
  const shade = (hex, f) => '#' + new THREE.Color(hex).multiplyScalar(f).getHexString();
  const TWALLS = [1.05, 0.74, 0.52, 0.74].map((f) => KIT((k) => { for (const sd of [-1, 1]) {
    k.box(0.3, 2.9, SEG + 0.06, sd * 8.1, 0, 0, shade('#dedcd4', f), 0, 0, 0, 'twall');   // the lower wall, in the lamps' light
    k.box(0.3, 2.8, SEG + 0.06, sd * 8.1, 2.9, 0, shade('#9c9a94', f), 0, 0, 0, 'twall');   // the upper wall, less lit
    k.box(0.5, 1.05, SEG + 0.06, sd * 8.0, 0, 0, '#a8a090', 0, 0, 0, 'twall');   // a concrete plinth along the foot of the wall
    k.box(0.04, 0.09, SEG + 0.06, sd * 7.94, 1.1, 0, '#fff2d0', 0, 0, 0, 'twall');   // a light line along the wall
    k.box(0.04, 0.34, SEG + 0.06, sd * 7.935, 1.45, 0, shade('#4f9aa6', f), 0, 0, 0, 'twall');   // a band of coloured tiles
  } }));
  const TRIB = KIT((k) => { for (const sd of [-1, 1]) k.box(0.42, 5.7, 0.5, sd * 7.92, 0, 0, '#6a645a', 0, 0, 0, 'twall'); k.box(2 * TW + 0.4, 0.5, 0.5, 0, 5.2, 0, '#6a645a', 0, 0, 0, 'twall'); });   // a rib: the walls' pillars and a beam across
  const TLAMP = KIT((k) => { for (const x of [-4.4, 4.4]) { k.box(0.56, 0.14, 3.4, x, 5.56, 0, '#2a2a2a', 0, 0, 0, 'troof'); k.box(0.4, 0.05, 3.1, x, 5.52, 0, '#ffd690', 0, 0, 0, 'glow'); } });
  const PORTAL = KIT((k) => { k.box(2 * TW + 22, 8.6, 1.6, 0, 5.7, 0, '#8f8879', 0, 0, 0, 'stone'); k.box(2 * TW + 1, 0.7, 1.75, 0, 5.7, 0, '#6d675b', 0, 0, 0, 'stone'); });   // the stone headwall, a darker lintel over the mouth
  const TCOVER = KIT((k) => {   // the hill the tunnel runs through: a grassy ridge over the roof, hollow where the road goes
    const sh = new THREE.Shape(); sh.moveTo(-48, -1.2); sh.quadraticCurveTo(-32, 2, -22, 7.5); sh.quadraticCurveTo(-12, 13.8, 0, 14.4); sh.quadraticCurveTo(12, 13.8, 22, 7.5); sh.quadraticCurveTo(32, 2, 48, -1.2);
    sh.lineTo(8.45, -1.2); sh.lineTo(8.45, 7.15); sh.lineTo(-8.45, 7.15); sh.lineTo(-8.45, -1.2); sh.lineTo(-48, -1.2);
    const g = new THREE.ExtrudeGeometry(sh, { depth: SEG + 0.8, bevelEnabled: false, curveSegments: 8 }); g.translate(0, 0, -(SEG + 0.8) / 2); g.computeVertexNormals();
    k.put(g, '#6a9442', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'lit');
    const list = k.parts.lit, G = list[list.length - 1], P2 = G.attributes.position, C3 = G.attributes.color;
    for (let i = 0; i < P2.count; i++) { const y = P2.getY(i), x = P2.getX(i), f = 0.88 + 0.16 * Math.sin(x * 0.37 + y * 0.6); C3.setXYZ(i, C3.getX(i) * f, C3.getY(i) * f * (y < 1 ? 0.92 : 1), C3.getZ(i) * f); }
  });
  const WAVE_T = { value: 0 };   // the crowd's raised arms bob up and down, each at its own beat (by where it is)
  MAT.wave.onBeforeCompile = (sh) => { sh.uniforms.uT = WAVE_T; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += sin(uT * 9.0 + position.x * 1.7 + position.z * 1.3) * 0.16;'); };
  MAT.wave.customProgramCacheKey = () => 'wave';
  const CAR = {
    paint: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.36, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.07, envMapIntensity: 1.25 }),
    plate: new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.4, metalness: 0.1 }),
    chrome: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 1, envMapIntensity: 1.0 }),
    glass: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.1, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.12, envMapIntensity: 1.3 }),
    tyre: new THREE.MeshStandardMaterial({ vertexColors: true, color: new THREE.Color(1.5, 1.5, 1.5), roughness: 0.82, metalness: 0, envMapIntensity: 0.5 }),
    trim: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 }),
    skin: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0 }),
    alloy: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.2, metalness: 0.85, envMapIntensity: 1.6, emissive: '#1a1b1e' }),
    brake: new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.6, 1.6, 1.6) }),
    screen: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.1, envMapIntensity: 0.4, depthWrite: false }),
    lit: MAT.lit, glow: MAT.glow
  };
  const RIM = { value: new THREE.Color(0, 0, 0) }, PLIT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });   // the two of you: a warm light round your edges, so you stand out from the road and from each other
  PLIT.onBeforeCompile = (sh) => { sh.uniforms.uRim = RIM; sh.fragmentShader = 'uniform vec3 uRim;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ float rf = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0); totalEmissiveRadiance += uRim * rf * rf; }'); };
  PLIT.customProgramCacheKey = () => 'plit';
  const PM = { lit: PLIT };
  const STARMAT = new THREE.SpriteMaterial({ map: starTex(), transparent: true, depthWrite: false });
  const STUB = new THREE.CylinderGeometry(0.13, 0.13, 0.12, 14);
  CAR.paint.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.b = mix(gl_FragColor.b, min(gl_FragColor.b, gl_FragColor.g + 0.05), 0.75);'); };   // a red that stays red: blue light on it reads grey, not magenta
  CAR.paint.customProgramCacheKey = () => 'paint';
  const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: groundDetail(), roughness: 0.95, metalness: 0 });
  const FU = { uF0: { value: new THREE.Color('#79bb50') }, uF1: { value: new THREE.Color('#5f9e3c') }, uF2: { value: new THREE.Color('#9ccc5a') }, uF3: { value: new THREE.Color('#e2cf58') }, uF4: { value: new THREE.Color('#b49a62') }, uFK: { value: 0.5 }, uFlow: { value: 0 }, uDry: { value: 0.5 }, uDap: { value: 0 } };
  groundMat.onBeforeCompile = (sh) => {   // far from the road the land is a patchwork of fields with dark hedge lines between them
    Object.assign(sh.uniforms, FU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aField; varying float vField; varying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvField = aField; vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', [
      '#include <common>', 'uniform vec3 uF0; uniform vec3 uF1; uniform vec3 uF2; uniform vec3 uF3; uniform vec3 uF4; uniform float uFK; uniform float uFlow; uniform float uDry; uniform float uDap; varying float vField; varying vec3 vWP;',
      'float fh(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }',
      'float fn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(fh(i), fh(i + vec2(1.0, 0.0)), u.x), mix(fh(i + vec2(0.0, 1.0)), fh(i + vec2(1.0, 1.0)), u.x), u.y); }'].join('\n'))
      .replace('#include <color_fragment>', [
      '#include <color_fragment>',
      '{ vec2 pv = vWP.xz; float gn = step(diffuseColor.r * 1.06, diffuseColor.g);',   // all the land: brightness in patches; grass a little varied in hue
      '  diffuseColor.rgb *= 0.9 + 0.12 * fn(pv / 3.1) + 0.07 * fn(pv / 0.9) - 0.06 * smoothstep(0.55, 0.85, fn(pv / 14.0));',
      '  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.08, 1.02, 0.78), gn * smoothstep(0.55, 0.9, fn(pv / 17.0 + 3.1)) * 0.45);',
      '  vec3 fN = normalize(cross(dFdx(vWP), dFdy(vWP))); float steep = 1.0 - smoothstep(0.6, 0.82, abs(fN.y));',   // steep: chalk and stone, in bands
      '  if (steep > 0.01) { vec3 rk = mix(vec3(0.66, 0.63, 0.57), vec3(0.8, 0.78, 0.71), fn(vec2((vWP.x + vWP.z) / 9.0, vWP.y * 0.9))) * (0.88 + 0.12 * sin(vWP.y * 2.7 + fn(pv / 6.0) * 2.0)); diffuseColor.rgb = mix(diffuseColor.rgb, rk, steep * 0.8); } }',
      'if (vField > 0.005) {',
      '  vec2 pm = vWP.xz; vec3 gc = diffuseColor.rgb;',
      '  gc *= 0.86 + 0.16 * fn(pm / 2.6) + 0.1 * fn(pm / 0.8) - 0.08 * smoothstep(0.55, 0.8, fn(pm / 11.0));',
      '  gc *= 0.84 + 0.3 * fn(pm / 23.0 + 1.7);',                                                                  // lusher and thinner stretches
      '  gc = mix(gc, gc * vec3(1.16, 1.08, 0.7), smoothstep(0.6, 0.86, fn(pm / 9.0 + 5.3)) * 0.5 * uDry);',        // dry, yellowing patches
      '  gc = mix(gc, gc * vec3(0.74, 0.88, 0.74), smoothstep(0.64, 0.9, fn(pm / 1.9 + 9.1)) * 0.45);',             // dark clumps of thicker grass
      '  float vd = length(vViewPosition), fk = uFlow * (1.0 - smoothstep(18.0, 42.0, vd)) * (1.0 - smoothstep(0.3, 0.6, vField));',
      '  if (fk > 0.01) { vec2 fp = pm * 1.6, fc2 = fract(fp) - 0.5; float fr = fh(floor(fp) + 0.71);',
      '    if (fr > 0.972) { float dd = 1.0 - smoothstep(0.09, 0.17, length(fc2)); vec3 col = fr > 0.991 ? vec3(1.0, 0.86, 0.25) : fr > 0.982 ? vec3(0.98, 0.98, 0.95) : vec3(0.85, 0.55, 0.85); gc = mix(gc, col, dd * fk); } }',   // daisies, buttercups, clover
      '  if (uDap > 0.01) gc *= 1.0 - uDap * 0.38 * (1.0 - smoothstep(0.03, 0.3, vField)) * smoothstep(0.44, 0.58, fn(pm / 3.4 + 11.0) * 0.55 + fn(pm / 11.0 + 2.0) * 0.45);',
      '  diffuseColor.rgb = gc;',
      '}',
      'if (vField > 0.03 && uFK > 0.01) {',
      '  vec2 p = vWP.xz, w = p + (vec2(fn(p / 140.0), fn(p / 140.0 + 7.3)) - 0.5) * 70.0;',
      '  vec2 q = vec2(w.x * 0.86 + w.y * 0.5, -w.x * 0.5 + w.y * 0.86) / vec2(88.0, 64.0), cell = floor(q), f = fract(q);',
      '  float h = fh(cell + 0.37);',
      '  vec3 fc = h < 0.34 ? uF0 : h < 0.58 ? uF1 : h < 0.78 ? uF2 : h < 0.9 ? uF3 : uF4;',
      '  float rows = 0.94 + 0.06 * sin((h > 0.5 ? q.x * 88.0 : q.y * 64.0) * 1.4);',   // a crop's rows or the mower's stripes
      '  fc *= (0.86 + 0.24 * fn(p / 7.0)) * rows;',
      '  float edge = min(min(f.x, 1.0 - f.x) * 88.0, min(f.y, 1.0 - f.y) * 64.0);',   // metres to the field's edge
      '  fc = mix(fc, uF1 * 0.55, (1.0 - smoothstep(0.9, 2.4, edge)) * 0.9);',          // the hedge between fields
      '  diffuseColor.rgb = mix(diffuseColor.rgb, fc, clamp(vField * uFK, 0.0, 1.0));',
      '}'].join('\n'));
  };
  const roadTex = roadTexture(), roadMat = new THREE.MeshStandardMaterial({ map: roadTex, emissiveMap: roadTex, emissive: '#000000', vertexColors: true, roughness: 0.6, metalness: 0, envMapIntensity: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });   // (darker in tunnels)
  const RU = { uDap: { value: 0 } };   // under trees: flecks of sun and shade on the road
  roadMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, RU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', ['#include <common>', 'varying vec3 vRW; uniform float uDap;',
      'float rh(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }',
      'float rn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(rh(i), rh(i + vec2(1.0, 0.0)), u.x), mix(rh(i + vec2(0.0, 1.0)), rh(i + vec2(1.0, 1.0)), u.x), u.y); }'].join('\n'))
      .replace('#include <color_fragment>', ['#include <color_fragment>',
      'vec2 rp = vRW.xz; float la = dot(diffuseColor.rgb, vec3(0.333));',
      'float age = 0.9 + 0.18 * rn(rp / 46.0) + 0.06 * rn(rp / 5.0);',                         // older, paler stretches and newer, darker ones
      'float rep = smoothstep(0.58, 0.66, rn(rp / 8.5 + 3.3)) * 0.2;',                        // darker repairs
      'float paint = smoothstep(0.55, 0.75, la);',                                              // (the white lines keep their brightness)
      'diffuseColor.rgb *= mix(age * (1.0 - rep), 1.0, paint);',
      'if (uDap > 0.01) diffuseColor.rgb *= 1.0 - uDap * 0.42 * smoothstep(0.44, 0.58, rn(rp / 3.4 + 11.0) * 0.55 + rn(rp / 11.0 + 2.0) * 0.45);'].join('\n'));
  };
  roadMat.customProgramCacheKey = () => 'road';
  const rumbleMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const slowMat = new THREE.MeshStandardMaterial({ map: slowTexture(), transparent: true, depthWrite: false, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const poolMat = new THREE.MeshBasicMaterial({ map: radial(64, [[0, 'rgba(255,212,150,0.5)'], [0.45, 'rgba(255,196,128,0.2)'], [1, 'rgba(255,186,120,0)']]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const foamTex = foamTexture(), foamMat = new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, depthWrite: false, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const signMats = new Map();
  function signMat(key) { let m = signMats.get(key); if (!m) { m = new THREE.MeshStandardMaterial({ map: tex(paintSign(key)), side: THREE.DoubleSide, roughness: 0.6 }); signMats.set(key, m); } return m; }

  // ---------------------------------------------------------------- the sea: glossy, see-through near the shore, rippling
  const seaNorm = waveNormals();
  const seaMat = new THREE.MeshStandardMaterial({ color: '#1d8cc4', roughness: 0.05, metalness: 0, normalMap: seaNorm, normalScale: new THREE.Vector2(0.32, 0.32), transparent: true, opacity: 0.82, envMapIntensity: 0.85 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), seaMat); sea.rotation.x = -Math.PI / 2; sea.receiveShadow = true; sea.renderOrder = 1; scene.add(sea);
  seaNorm.repeat.set(110, 110);

  // ---------------------------------------------------------------- your car, the traffic, coins, smoke and sparks
  const player = new THREE.Group(); scene.add(player);
  let playerCarId = null, wheels = [], carInfo = null;
  const traffic = new Map();
  const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), blobMat = new THREE.MeshBasicMaterial({ map: radial(64, [[0, 'rgba(0,0,0,0.55)'], [0.6, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false });
  const coinGeo = new THREE.LatheGeometry([[0, 0.045], [0.4, 0.045], [0.46, 0.085], [0.58, 0.085], [0.63, 0.03], [0.63, -0.03], [0.58, -0.085], [0.46, -0.085], [0.4, -0.045], [0, -0.045]].map((q) => new THREE.Vector2(q[0], q[1])), 28); coinGeo.rotateX(Math.PI / 2);
  coinGeo.scale(0.75, 0.75, 0.75);   // (smaller than they were: less like a toy)
  const coins = new THREE.InstancedMesh(coinGeo, new THREE.MeshStandardMaterial({ color: '#ffcf3a', emissive: '#7a5000', emissiveIntensity: 0.3, metalness: 0.85, roughness: 0.2, envMapIntensity: 1.4 }), 400); coins.count = 0; coins.frustumCulled = false; scene.add(coins);   // (their bounds change every frame)
  const OWN_ENV = [CAR.paint, CAR.chrome, CAR.glass, CAR.tyre, CAR.alloy, CAR.screen, roadMat, seaMat, coins.material];   // how strongly each reflects the sky is its own
  OWN_ENV.forEach((m) => { m.userData.envBase = m.envMapIntensity; });
  const pwMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.45, roughness: 0.22, emissive: '#ffffff', emissiveIntensity: 0.32 });
  pwMat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.rgb;'); };   // each part glows in its own colour
  pwMat.customProgramCacheKey = () => 'pw';
  const pwGeo = (f) => { const k = new MD.Kit(); f(k); const m = k.build(); return m.lit; };
  const PWGEO = {
    nitro: pwGeo((k) => {   // a nitrous bottle: blue, a white label with a red stripe, a chrome neck and valve
      k.cyl(0.27, 0.27, 0.86, 18, 0, -0.5, 0, '#1f6ff0', 0, 0, 'lit').ball(0.27, 0, 0.36, 0, '#1f6ff0', 1, 0.6, 1, 'lit', 14);
      k.cyl(0.275, 0.275, 0.26, 18, 0, -0.22, 0, '#f4f6f8', 0, 0, 'lit').cyl(0.278, 0.278, 0.06, 18, 0, -0.12, 0, '#e8263f', 0, 0, 'lit');
      k.cyl(0.08, 0.1, 0.16, 10, 0, 0.48, 0, '#d8dde2', 0, 0, 'lit').box(0.22, 0.07, 0.07, 0, 0.62, 0, '#d8dde2', 0, 0, 0, 'lit');
    }),
    magnet: pwGeo((k) => {   // a horseshoe magnet: red, with silver ends
      k.put(new THREE.TorusGeometry(0.36, 0.12, 10, 22, Math.PI), '#e02a2a', 0, 0.05, 0, 0, 0, 0, 1, 1, 1, 'lit');
      for (const sd of [-1, 1]) k.cyl(0.12, 0.12, 0.34, 12, sd * 0.36, -0.4, 0, '#e8eef2', 0, 0, 'lit');
    }),
    shield: pwGeo((k) => {   // a gold star
      const sh = new THREE.Shape(); for (let q = 0; q < 10; q++) { const a = q / 10 * Math.PI * 2 + Math.PI / 2, rr = q % 2 ? 0.24 : 0.58; if (q) sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2 }); g.translate(0, 0, -0.07);
      k.put(g, '#ffcc22', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'lit');
    }),
    double: pwGeo((k) => {   // a purple gem
      k.put(new THREE.OctahedronGeometry(0.5, 0), '#b04df0', 0, 0, 0, 0, 0, 0, 0.85, 1.15, 0.85, 'lit');
      k.put(new THREE.OctahedronGeometry(0.3, 0), '#e2b4ff', 0, 0, 0, 0, Math.PI / 4, 0, 0.9, 1.25, 0.9, 'lit');
    }),
    time: pwGeo((k) => {   // a clock: green rim, white face, two hands
      k.put(new THREE.CylinderGeometry(0.5, 0.5, 0.16, 24), '#22c06a', 0, 0, 0, Math.PI / 2, 0, 0, 1, 1, 1, 'lit');
      for (const sd of [-1, 1]) k.put(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 24), '#ffffff', 0, 0, sd * 0.08, Math.PI / 2, 0, 0, 1, 1, 1, 'lit');
      for (const sd of [-1, 1]) { k.box(0.05, 0.28, 0.02, 0, 0, sd * 0.095, '#1a1a1a', 0, 0, 0, 'lit'); k.box(0.2, 0.05, 0.02, 0.1, 0, sd * 0.095, '#1a1a1a', 0, 0, 0, 'lit'); }
    })
  };
  const PWMESH = {};
  for (const kk in PWGEO) { const im = new THREE.InstancedMesh(PWGEO[kk], pwMat, 40); im.count = 0; im.frustumCulled = false; im.castShadow = true; scene.add(im); PWMESH[kk] = im; }
  const nitros = PWMESH.nitro;
  // ---- the shield: a shimmering bubble round the car while it lasts
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 18), new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, a: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float t; uniform float a; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 3.4); float hex = 0.6 + 0.4 * sin(vP.x * 9.0 + t * 3.0) * sin(vP.y * 9.0 - t * 2.0) * sin(vP.z * 9.0); float band = 1.0 - smoothstep(0.02, 0.06, abs(vP.y)); vec3 col = mix(vec3(0.2, 0.78, 1.0), vec3(0.55, 0.92, 1.0), 0.5 + 0.5 * sin(t * 2.0 + vP.y * 3.0)); gl_FragColor = vec4((col * (f * 0.62 + 0.006) * smoothstep(-0.75, -0.2, vP.y) * hex + vec3(1.0, 0.78, 0.25) * band * 0.0) * a, 1.0); }' }));
  bubble.scale.set(1.45, 1.05, 2.75); bubble.visible = false; bubble.renderOrder = 4; scene.add(bubble);
  // ---- the nitro: flames out of the pipes
  const flameMat = new THREE.MeshBasicMaterial({ map: flameTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const flameCore = new THREE.MeshBasicMaterial({ map: flameMat.map, color: '#cfe6ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const flames = [-1, 1].map(() => { const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.85, 14, 1, true), flameMat); outer.rotation.x = Math.PI / 2; outer.position.z = 0.925; g.add(outer);   // the jet: wide at the pipe, streaming back
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.075, 1.0, 10, 1, true), flameCore); core.rotation.x = Math.PI / 2; core.position.z = 0.5; g.add(core);
    const glowT = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameGlow(), color: '#ffb060', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); glowT.scale.setScalar(0.7); g.add(glowT);   // a glow at the pipe
    g.visible = false; return g; });
  const smoke = particles(700, false), sparks = particles(500, true);
  scene.add(smoke.points); scene.add(sparks.points);
  const skid = skidMarks(); scene.add(skid.mesh);
  const glows = glowPoints(1200); scene.add(glows.points);

  // ---------------------------------------------------------------- state
  const R = { brakeK: 0, lastV: 0, slump: 0, flying: [], crashObj: null, hop: 0, crashK: 0, camShake: 0, hemiI: 0.6, sunI: 2.6, envI: 1, tunK: 0, flareK: 0, flareN: 0, lastBanner: null, pose: {}, W: null, poseHi: -1, chunks: new Map(), stubs: [], look: null, lookKey: '', fade: 1, camPos: new THREE.Vector3(), camLook: new THREE.Vector3(), camYaw: 0, camInit: false,
    fxN: 0, low: false, view: E.VIEW, w: 0, h: 0, lastT: 0, wheelSpin: 0, prevSkid: null, demoAcc: 0, built: 0, envT: -1e9, envRT: null, envDone: false, flash: 0, boostK: 0 };

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
  const faceRoad = (d, th) => Math.atan2(-d * Math.cos(th), -d * Math.sin(th));   // turns a model's front (+Z) towards the road from side d

  // ---------------------------------------------------------------- the land in a chunk: rows across the road, columns out to the hills
  const LAND_COLS = [0.6, 3, 7, 13, 22, 35, 55, 85, 130, 200, 300, 450, 650];
  function sideCols(g, d, span) {   // [lateral distance from the middle, kind] for one side of a row (always 13 of them)
    const out = [];
    if (g.brg) {   // a bridge: the deck's edge, a sheer drop to the water, the sea bed beyond
      out.push([span + 0.5, 'deck'], [span + 0.7, 'drop']);
      for (const c of [6, 15, 30, 60, 100, 160, 250, 400, 650, 900, 1200]) out.push([span + c, 'bed']);
      return out;
    }
    if (g.sea === d && g.sh && !g.tun) {
      const shore = Math.max(g.sh, span + 4);
      out.push([span + 0.6, 'verge']);
      for (let j = 1; j <= 3; j++) out.push([span + 0.6 + (shore - 0.5 - span - 0.6) * j / 3, j === 3 ? 'top' : 'verge']);
      out.push([shore + 6, 'foot'], [shore + 16, 'water'], [shore + 40, 'bed'], [shore + 100, 'bed'], [shore + 220, 'bed'], [shore + 400, 'bed'], [shore + 650, 'bed'], [shore + 900, 'bed'], [shore + 1200, 'bed']);
    } else for (const c of LAND_COLS) out.push([span + c, 'land']);
    return out;
  }
  // the far land's height depends only on where it is (plus the road's height smoothed over a long way), so the land
  // laid out from two bits of road that overlap (the far side of a tight bend) agrees, instead of one poking through the other
  const FBC = new Map();
  function farBase(W, i) {
    let f = FBC.get(i); if (f) return f;
    const lo = Math.max(W.base, i - 60), hi = Math.min(E.lastIndex(W), i + 60);
    let sy = 0, sh = 0, sr = 0, n = 0;
    for (let j = lo; j <= hi; j += 4) { const g = E.segAt(W, j), L = LOOK[E.STAGES[g.st].key]; sy += (g.y1 + g.y2) / 2; sh += L.hills; sr += L.rise; n++; }
    f = { B: sy / n, hills: sh / n, rise: sr / n };
    if (FBC.size > 6000) FBC.clear(); FBC.set(i, f); return f;
  }
  function heightOf(W, look, S, g, kind, lat, roadY, wx, wz, dist) {
    if (kind === 'verge') return roadY - 0.15 + (dist > 4 ? (fbm(wx / 40, wz / 40) - 0.5) * 1.6 * smooth(4, 20, dist) : 0);
    if (kind === 'top') return roadY - 0.2 + (fbm(wx / 40, wz / 40) - 0.5) * 1.2;
    if (kind === 'foot') return look.beachY;
    if (kind === 'water') return -0.6;
    if (kind === 'bed') return -6 - dist * 0.01;
    if (kind === 'deck') return roadY - 0.3;
    if (kind === 'drop') return -0.6;
    // the land: flat by the road, easing out to hills and higher ground that belong to the place, not to this bit of road
    const fb = farBase(W, g.i), far = fb.B + (fbm(wx / 300 + 40, wz / 300 + 17) - 0.4) * 2 * fb.hills + (vnoise(wx / 1100 + 3.7, wz / 1100 + 8.1) - 0.15) * fb.rise;
    return roadY + (far - roadY) * smooth(6, 160, dist) - (dist < 2 ? 0.25 : 0);
  }
  // the colours of the land, worked out at each corner from where it is (so neighbouring patches match and blend)
  const CC = new Map(), C1 = new THREE.Color(), C2 = new THREE.Color();
  function cols(st) {
    let c = CC.get(st); if (c) return c;
    const pal = PAL[st], look = LOOK[pal.key], L = (h) => new THREE.Color(h);
    const beach = L(look.beach || pal.verge[0]);
    c = { g0: L(pal.grass[0]), g1: L(pal.grass[1]), dry: L(look.night ? pal.grass[0] : ART.shade(pal.grass[0], 0.12)).lerp(L('#c8b070'), look.night ? 0 : 0.35), beach: beach, wet: beach.clone().multiplyScalar(0.62),
      cliff: L(look.cliff || '#8a7a6a'), shallow: beach.clone().multiplyScalar(0.8), deep: L(look.night ? '#06101e' : '#1c4a62') };
    CC.set(st, c); return c;
  }
  function colourAt(kind, st, x, y, z, out, dist) {
    if (kind === 'under') return out.copy(UNDERC);   // the filler under the road: asphalt-dark, so a hairline seam in the road never shows grass or sea
    const c = cols(st);
    if (kind === 'land') {
      out.copy(c.g0).lerp(c.g1, smooth(0.3, 0.7, fbm(x / 45, z / 45)));
      out.lerp(c.dry, smooth(0.62, 0.8, vnoise(x / 70 + 9, z / 70 + 3)) * 0.7);
      out.multiplyScalar(0.88 + vnoise(x / 8, z / 8) * 0.22);
      if (dist != null && dist < 2.4 && !LOOK[PAL[st].key].night) out.lerp(GRAVEL, (1 - smooth(0.4, 2.4, dist)) * 0.45);   // a strip of gravel and dust beside the road
    } else if (kind === 'sand') out.copy(c.beach).multiplyScalar(0.93 + vnoise(x / 5, z / 5) * 0.12).lerp(c.wet, smooth(1.5, -0.3, y) * 0.5);
    else if (kind === 'prom') out.copy(LOOK[PAL[st].key].night ? ROCK : PROM).multiplyScalar(0.9 + vnoise(x / 2, z / 2) * 0.12); else if (kind === 'beach') out.copy(c.wet).lerp(c.beach, smooth(-0.2, 0.7, y)).multiplyScalar(0.95 + vnoise(x / 6, z / 6) * 0.1);
    else if (kind === 'cliff') out.copy(c.cliff).multiplyScalar(0.8 + vnoise(x / 9 + y / 2.5, z / 9) * 0.3);
    else if (kind === 'rock') out.copy(ROCK).multiplyScalar(0.7 + vnoise(x / 3 + y, z / 3) * 0.35);
    else out.copy(c.shallow).lerp(c.deep, smooth(-1, -6, y));
    return out;
  }
  const QK = { land: 'land', verge: 'land', top: 'land', foot: 'cliff', water: 'beach', bed: 'bed', deck: 'rock', drop: 'rock', rock: 'rock', sand: 'sand', prom: 'prom' };
  const PROM = new THREE.Color('#d8d2c4'), GRAVEL = new THREE.Color('#7a7262'), UNDERC = new THREE.Color('#2c2f34');
  const ROCK = new THREE.Color('#8a8276');
  function rowAt(W, i) {   // the cross-section of the land at segment i, from far left to far right
    const g = E.segAt(W, i), S = E.STAGES[g.st], look = LOOK[S.key], P = { x: 0, y: 0, z: 0, th: 0, bank: 0, g: null };
    at(W, i * SEG, 0, P);
    const fa = g.fk && g.fk.a, fb = g.fk && g.fk.b, flat = fa || fb ? 0 : 1;
    const span = fb ? g.fk.o1 + HALF + RUM + 1 : (fa ? g.fk.w1 : HALF) + RUM;
    // a bend: don't reach further in than the bend's own radius on the inside (the land would fold over itself)
    let kk = 0; for (let j = -8; j <= 8; j++) kk += E.segAt(W, i + j).k; kk /= 17;
    const inner = Math.abs(kk) > 1e-4 ? 0.85 / Math.abs(kk) : 1e9, innerSide = kk > 0 ? 1 : -1;
    const side = {};
    for (const d of [-1, 1]) {
      const cs = sideCols(g, d, span), list = [];
      let prevH = P.y;
      for (let j = 0; j < cs.length; j++) {
        let lat = cs[j][0]; const kind = cs[j][1];
        if (d === innerSide) lat = Math.min(lat, Math.max(span + 0.6, inner));
        const wx = P.x + Math.cos(P.th) * d * lat, wz = P.z + Math.sin(P.th) * d * lat;
        let h = heightOf(W, look, S, g, kind, lat, P.y + d * Math.min(lat, span) * Math.sin(P.bank) * flat, wx, wz, lat - span);
        if (kind === 'land' && j === 0 && !g.tun) h = Math.min(h, prevH + 0.4);
        if (g.tun) h = Math.max(h, P.y + (j === 0 ? 7.4 : 10.5 - Math.max(0, lat - span - 3) * 0.035));   // a tunnel: a wall, then the hill over it
        let k2 = g.tun && j === 0 ? 'rock' : kind;
        if (SANDY[S.key] && g.sea === d && !g.tun && !g.brg && (kind === 'verge' || kind === 'top' || kind === 'foot')) k2 = j === 0 ? 'prom' : 'sand';
        list.push([wx, h, wz, k2, lat - span]); prevH = h;
      }
      side[d] = list;
    }
    const pts = [], kinds = [];
    for (let j = side[-1].length - 1; j >= 0; j--) { pts.push(side[-1][j]); kinds.push(QK[side[-1][j][3]]); }   // the gap inside each point on the left takes that point's kind
    pts.push([P.x - Math.cos(P.th) * span, P.y - span * Math.sin(P.bank) * flat, P.z - Math.sin(P.th) * span, 'verge', 0]); kinds.push('under');
    { const li = span - 0.6;   // the filler under the road sits a little below it (else, over a crest, a sliver of it pokes through the asphalt)
      pts.push([P.x - Math.cos(P.th) * li, P.y - li * Math.sin(P.bank) * flat - 0.3, P.z - Math.sin(P.th) * li, 'verge', 0]); kinds.push('under');
      pts.push([P.x + Math.cos(P.th) * li, P.y + li * Math.sin(P.bank) * flat - 0.3, P.z + Math.sin(P.th) * li, 'verge', 0]); kinds.push('under'); }
    pts.push([P.x + Math.cos(P.th) * span, P.y + span * Math.sin(P.bank) * flat, P.z + Math.sin(P.th) * span, 'verge', 0]);
    for (const q of side[1]) { kinds.push(QK[q[3]]); pts.push(q); }   // ... and on the right the point outside it
    return { pts: pts, kinds: kinds, g: g, st: g.st, look: look, sea: g.sea, P: { x: P.x, y: P.y, z: P.z, th: P.th } };
  }
  const NA = new THREE.Vector3(), NB = new THREE.Vector3(), NN = new THREE.Vector3();
  function bendStarts(W, j) {   // a sharp bend begins at j (and the 24 segments before it are gentle)
    if (Math.abs(E.segAt(W, j).k) <= 1 / 210) return false;
    for (let q = j - 24; q < j; q++) if (Math.abs(E.segAt(W, q).k) > 1 / 210) return false;
    return true;
  }
  function buildChunk(W, c) {
    const i0 = c * CH, last = E.lastIndex(W), i1 = Math.min((c + 1) * CH, last);
    if (i1 <= i0) return null;
    poses(W, Math.min(last, i1 + 1));
    const r0 = Math.max(W.base, i0 - 1), r1 = Math.min(last, i1 + 1), rows = [];
    for (let i = r0; i <= r1; i++) rows.push(rowAt(W, i));
    const off = i0 - r0, n = rows[0].pts.length;
    // smooth normals at each corner, from its neighbours along the road and across it
    const nrm = rows.map((row, r) => row.pts.map((p, k) => {
      const A = rows[Math.min(rows.length - 1, r + 1)].pts[k], B = rows[Math.max(0, r - 1)].pts[k], Lp = row.pts[Math.min(n - 1, k + 1)], Rp = row.pts[Math.max(0, k - 1)];
      NA.set(Lp[0] - Rp[0], Lp[1] - Rp[1], Lp[2] - Rp[2]); NB.set(A[0] - B[0], A[1] - B[1], A[2] - B[2]); NN.crossVectors(NA, NB);
      const L = NN.length(); if (L < 1e-6 || NN.y / L < 0.05) return [0, 1, 0];
      return [NN.x / L, NN.y / L, NN.z / L];
    }));
    // ---- the ground: two triangles per patch, wound to face up
    const pos = [], nor = [], col = [], uv = [], fld = [];
    const corner = (p, nv, kind, st) => {
      pos.push(p[0], p[1], p[2]); nor.push(nv[0], nv[1], nv[2]);
      colourAt(kind, st, p[0], p[1], p[2], C1, p[4]); col.push(C1.r, C1.g, C1.b); fld.push(kind === 'land' ? 0.02 + 0.98 * smooth(16, 52, p[4] || 0) : 0);   // (any land: mottled; far land: fields)
      if (kind === 'cliff' || kind === 'rock') uv.push((p[0] + p[2]) / 5, p[1] / 3); else uv.push(p[0] / 4.5, p[2] / 4.5);
    };
    const FN = [0, 1, 0];
    for (let r = off; r < off + (i1 - i0); r++) {
      const A = rows[r], B = rows[r + 1];
      for (let k = 0; k < n - 1; k++) {
        const kind = A.kinds[k], st = A.st;
        const nl = A.pts[k], nr = A.pts[k + 1], fl = B.pts[k], fr = B.pts[k + 1];
        let n1 = nrm[r][k], n2 = nrm[r][k + 1], n3 = nrm[r + 1][k], n4 = nrm[r + 1][k + 1];
        if (kind === 'cliff' || kind === 'rock') {   // cliffs and walls keep a hard edge
          NA.set(nr[0] - nl[0], nr[1] - nl[1], nr[2] - nl[2]); NB.set(fl[0] - nl[0], fl[1] - nl[1], fl[2] - nl[2]); NN.crossVectors(NA, NB).normalize();
          if (NN.y < 0) NN.negate(); FN[0] = NN.x; FN[1] = NN.y; FN[2] = NN.z; n1 = n2 = n3 = n4 = FN.slice();
        }
        corner(nl, n1, kind, st); corner(nr, n2, kind, st); corner(fl, n3, kind, st);
        corner(nr, n2, kind, st); corner(fr, n4, kind, st); corner(fl, n3, kind, st);
      }
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gg.setAttribute('aField', new THREE.Float32BufferAttribute(fld, 1)); gg.computeBoundingSphere();
    const ground = new THREE.Mesh(gg, groundMat); ground.receiveShadow = true;
    const group = new THREE.Group(); group.add(ground);
    surf(rows, off, i1 - i0, group);
    // ---- the road (one, or two in a split) and its rumble strips
    for (const b of [0, -1, 1]) roadStrip(W, i0, i1, b, group);
    // ---- roadside things
    scenery(W, i0, i1, group);
    group.userData = Object.assign(group.userData || {}, { i0: i0, i1: i1 });
    return group;
  }
  function surf(rows, off, count, group) {   // white water where a beach meets the sea
    const pos = [], uv = [];
    for (const d of [-1, 1]) {
      const fi = d < 0 ? rows[0].pts.length / 2 - 2 - 4 : rows[0].pts.length / 2 + 1 + 4;   // the cliff foot (the water is the next point out); the row's middle has 4 points (road edges, and the filler's two below the road)
      const wi = fi + d;
      const edge = (row) => {
        if (row.sea !== d || !(row.look.beachY > 0.05)) return null;
        const F = row.pts[fi], Wt = row.pts[wi]; if (!F || !Wt || F[3] !== 'foot') return null;
        const f = F[1] / (F[1] - Wt[1]), a = clamp(f - 0.13, 0, 1), b = clamp(f + 0.1, 0, 1);
        return [[F[0] + (Wt[0] - F[0]) * a, 0.05, F[2] + (Wt[2] - F[2]) * a], [F[0] + (Wt[0] - F[0]) * b, 0.05, F[2] + (Wt[2] - F[2]) * b]];
      };
      for (let r = off; r < off + count; r++) {
        const e1 = edge(rows[r]), e2 = edge(rows[r + 1]); if (!e1 || !e2) continue;
        const v0 = r * 0.37, v1 = (r + 1) * 0.37;
        const [p, q] = d > 0 ? [e1, e2] : [[e1[1], e1[0]], [e2[1], e2[0]]], u0 = d > 0 ? 0 : 1, u1 = 1 - u0;
        pos.push(...p[0], ...p[1], ...q[0], ...p[1], ...q[1], ...q[0]); uv.push(u0, v0, u1, v0, u0, v1, u1, v0, u1, v1, u0, v1);
      }
    }
    if (!pos.length) return;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, foamMat); m.renderOrder = 2; group.add(m);
  }
  function roadStrip(W, i0, i1, b, group) {
    const pos = [], uv = [], rpos = [], rcol = [], dcol = [], P = { x: 0, y: 0, z: 0, th: 0, bank: 0, g: null }, Q = { x: 0, y: 0, z: 0, th: 0, bank: 0, g: null };
    for (let i = i0; i < i1; i++) {
      const g = E.segAt(W, i), split = !!(g.fk && g.fk.b), dk = g.tun ? 0.62 : 1, dk2 = E.segAt(W, i + 1).tun ? 0.62 : 1;
      if (split !== !!b) continue;   // the one road, or (in a split) each of the two
      const gn = E.segAt(W, i + 1), same = !!(gn.fk && gn.fk.b) === split && !gn.fk === !g.fk;   // end exactly where the next piece starts (its own bank and height), so no hairline seam opens between them
      at(W, i * SEG, b, P); at(W, (i + 1) * SEG - (same ? 0 : 0.001), b, Q);
      const w1 = g.fk && g.fk.a ? g.fk.w1 : HALF, w2 = g.fk && g.fk.a ? g.fk.w2 : HALF, bk = g.fk ? 0 : 1;
      const e = (p, lat, w) => [p.x + Math.cos(p.th) * lat, p.y + lat * Math.sin(p.bank) * bk + 0.03, p.z + Math.sin(p.th) * lat];
      const a1 = e(P, -w1), a2 = e(P, w1), b1 = e(Q, -w2), b2 = e(Q, w2), v0 = i * SEG / 9, v1 = (i + 1) * SEG / 9;
      pos.push(...a1, ...a2, ...b1, ...a2, ...b2, ...b1); uv.push(0, v0, 1, v0, 0, v1, 1, v0, 1, v1, 0, v1);
      dcol.push(dk, dk, dk, dk, dk, dk, dk2, dk2, dk2, dk, dk, dk, dk2, dk2, dk2, dk2, dk2, dk2);
      let kb = 0; for (let j = -6; j <= 6; j++) kb = Math.max(kb, Math.abs(E.segAt(W, i + j).k));
      const plain = kb < 1 / 420 && !g.line && !g.gate, rc = plain ? (LOOK[PAL[g.st].key].night ? '#3a3c44' : '#b8b4aa') : (Math.floor(i / 2) % 2) ? PAL[g.st].rumble[0] : PAL[g.st].rumble[1];
      for (const d of [-1, 1]) {
        const c1 = e(P, d * w1), c2 = e(P, d * (w1 + RUM)), c3 = e(Q, d * (w2 + RUM)), c4 = e(Q, d * w2);
        c2[1] += 0.04; c3[1] += 0.04;   // a kerb, a touch proud of the road
        if (d < 0) rpos.push(...c2, ...c1, ...c3, ...c1, ...c4, ...c3); else rpos.push(...c1, ...c2, ...c4, ...c2, ...c3, ...c4);
        const rk = KERBC[rc] || (KERBC[rc] = '#' + new THREE.Color(rc).lerp(KERBG, 0.18).getHexString());   // (a touch toned down: it filled the bottom corner)
        for (let q = 0; q < 6; q++) { const o = rcol.length; rcol.length += 3; lin(rk, rcol, o); }
      }
      if (g.line) {   // the start line: a chequered band across
        for (let q = 0; q < 12; q++) { const l0 = -HALF + q * HALF / 6, l1 = l0 + HALF / 6, f1 = e(P, l0), f2 = e(P, l1), f3 = e(Q, l1), f4 = e(Q, l0); f1[1] += 0.01; f2[1] += 0.01; f3[1] += 0.01; f4[1] += 0.01; rpos.push(...f1, ...f2, ...f4, ...f2, ...f3, ...f4); for (let z = 0; z < 6; z++) { const o = rcol.length; rcol.length += 3; lin(q % 2 ? '#111111' : '#f4f4f4', rcol, o); } }
      }
    }
    if (pos.length) { const g1 = new THREE.BufferGeometry(); g1.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g1.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g1.setAttribute('color', new THREE.Float32BufferAttribute(dcol, 3)); g1.computeVertexNormals(); const m = new THREE.Mesh(g1, roadMat); m.receiveShadow = true; group.add(m); }
    if (rpos.length) { const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(rpos, 3)); g2.setAttribute('color', new THREE.Float32BufferAttribute(rcol, 3)); g2.computeVertexNormals(); const m2 = new THREE.Mesh(g2, rumbleMat); m2.receiveShadow = true; group.add(m2); }
  }
  // ---- everything that stands by the road in a chunk, merged into one mesh per material (and one per sign picture);
  //      things you can knock over keep their own little group so they can fly off
  const TMP = new THREE.Object3D();
  function scenery(W, i0, i1, group) {
    const L = {}, signs = new Map(), lamps = [], pools = [], slows = [], P = { x: 0, y: 0, z: 0, th: 0, bank: 0, g: null };
    const addModel = (geo, key, x, y, z, ry, s, temp) => { if (!geo) return; TMP.position.set(x, y, z); TMP.rotation.set(0, ry, 0); TMP.scale.setScalar(s || 1); TMP.updateMatrix(); (L[key] || (L[key] = [])).push([geo, TMP.matrix.clone(), temp]); };
    const addAll = (m, x, y, z, ry, s) => { for (const k in m) if (m[k] && MAT[k]) addModel(m[k], k, x, y, z, ry, s); };
    for (let i = i0; i < i1; i++) {
      const g = E.segAt(W, i), S = E.STAGES[g.st], look = LOOK[S.key];
      // walls, fences and the sea wall: pieces end to end
      const walls = [];
      if (g.wl) walls.push([-10.5, look.wall ? 'wall' : 'fence']);
      if (g.wr) walls.push([10.5, look.wall ? 'wall' : 'fence']);
      if (look.hedge && !g.tun && !g.brg && !g.fk && !g.gate && !R.low) for (const d of [-1, 1]) {
        if (g.sea === d || (d < 0 ? g.wl : g.wr) || hash2(i, d * 7 + 3) < 0.12) continue;
        let kk = 0; for (let j = -4; j <= 4; j++) kk += E.segAt(W, i + j).k; kk /= 9;
        const lat = look.hedge + hash2(Math.floor(i / 9), d) * 4; if (Math.abs(kk) > 1e-4 && d === (kk > 0 ? 1 : -1) && lat > 0.5 / Math.abs(kk)) continue;
        place(W, i * SEG + SEG / 2, d * lat, 0, P); addAll(HEDGE[i % 3], P.x, groundAt(W, g, P, d * lat) - 0.15, P.z, -P.th);
      }
      if (g.sea && g.sh - 1.5 < 26 && look.edge && !g.brg && !g.tun) walls.push([g.sea * (g.sh - 1.2), look.edge === 'rail' ? 'rail' : look.edge === 'quay' ? 'quay' : 'fence']);
      if (g.brg) walls.push([-E.BRG_W, 'rail'], [E.BRG_W, 'rail']);
      for (const wl of walls) { place(W, i * SEG + SEG / 2, wl[0], 0, P); addAll(MD.model(wl[1], 0), P.x, P.y, P.z, -P.th); }
      if (g.brg || g.tun) {   // the bridge's deck and its pillars down to the sea bed; the tunnel's roof, its lights and its portals
        place(W, i * SEG + SEG / 2, 0, 0, P);
        if (g.brg) {
          addAll(DECK, P.x, P.y, P.z, -P.th);
          if (i % 7 === 0) { const k = new MD.Kit(), hh = P.y + 7; for (const x of [-4.2, 4.2]) k.box(1.6, hh, 2.4, x, -hh - 0.2, 0, '#8e8a80'); const m = k.build(); addModel(m.lit, 'lit', P.x, P.y, P.z, -P.th, 1, true); }
        } else {
          addAll(TROOF, P.x, P.y, P.z, -P.th); addAll(TWALLS[i % 4], P.x, P.y, P.z, -P.th); addAll(TCOVER, P.x, P.y, P.z, -P.th);
          if (i % 4 === 0) addAll(TLAMP, P.x, P.y, P.z, -P.th);
          if (i % 3 === 1) addAll(TRIB, P.x, P.y, P.z, -P.th);
          if (i % 4 === 0) for (const d of [-1, 1]) pools.push([P.x + Math.cos(P.th) * d * 4.4, P.y + 0.06, P.z + Math.sin(P.th) * d * 4.4, 2.0, P.th, 2.6]);
          const a = E.segAt(W, i - 1), b = E.segAt(W, i + 1);
          if (!a.tun) { place(W, i * SEG, 0, 0, P); addAll(PORTAL, P.x, P.y, P.z, -P.th); }
          if (!b.tun) { place(W, (i + 1) * SEG, 0, 0, P); addAll(PORTAL, P.x, P.y, P.z, -P.th); }
        }
      }
      if (!g.fk && !g.tun && !g.brg && i + 14 <= E.lastIndex(W) && bendStarts(W, i + 14)) {   // SLOW in the two outer lanes, 56 m before a sharp bend
        for (const lat of [-HALF * 2 / 3, HALF * 2 / 3]) { place(W, i * SEG + SEG / 2, lat, 0, P); slows.push([P.x, P.y + 0.035, P.z, 1.35, P.th, 2.3]); }
      }
      if (g.spr) for (const it of g.spr) {
        if (it.done) continue;
        place(W, i * SEG, it.x, it.b, P);
        const d = it.x < 0 ? -1 : 1, fr = faceRoad(d, P.th);
        let ry = hash2(i, Math.round(it.x * 10)) * Math.PI * 2;
        if (/^(hut|cottage|hotel|building|board|finger|forestsign|lamp|villa|terrace|clock)$/.test(it.t)) ry = fr;
        if (it.t === 'lamp') ry = fr + Math.PI;   // the arm reaches over the road
        if (/^(gate|gantry|nose|chev|warn|gpost|footbridge|viaduct|banner)$/.test(it.t)) ry = -P.th;
        if (it.t === 'priory' || it.t === 'cobb' || it.t === 'goldcap' || it.t === 'headland') ry = fr;
        if (it.t === 'arch') ry = -P.th + (it.x < 0 ? Math.PI : 0);   // Durdle Door side-on from the road, its high end towards the shore
        if (it.t === 'board') ry = -P.th + d * 0.5;
        if (it.t === 'pier' || it.t === 'ferry') ry = fr + Math.PI / 2;
        let y = P.y;
        if (/^(yacht|buoy|stack|arch|needles|ferry|pier|cobb|goldcap|headland)$/.test(it.t)) y = 0;
        else if (/^(footbridge|viaduct)$/.test(it.t)) y = P.y;
        else if (it.t === 'lighthouse') y = P.y - 6;
        else if (Math.abs(it.x) > HALF + 2) y = groundAt(W, g, P, it.x);
        if (SIGNS[it.t]) { signParts(W, i, g, it, P, y, ry, signs, addModel, addAll); if (it.t === 'gate' || it.t === 'gantry' || it.t === 'banner') continue; }
        const m = MD.model(it.t, it.v); if (!m) continue;
        if (it.soft) {
          const grp = new THREE.Group();
          for (const k in m) if (m[k] && MAT[k]) { const mesh = new THREE.Mesh(m[k], MAT[k]); mesh.castShadow = k !== 'glow'; mesh.userData.keep = true; grp.add(mesh); }
          grp.position.set(P.x, y, P.z); grp.rotation.y = ry; grp.userData.it = it; group.add(grp); continue;
        }
        addAll(m, P.x, y, P.z, ry, BIG[it.t]);
        if (lit(look) && it.t === 'lamp') { TMP.position.set(0, 5.95, -1.5); TMP.rotation.set(0, ry, 0); TMP.position.applyEuler(TMP.rotation); lamps.push(P.x + TMP.position.x, y + TMP.position.y, P.z + TMP.position.z); { const dd = it.x < 0 ? -1 : 1; pools.push([P.x + TMP.position.x - Math.cos(P.th) * dd * 2, P.y + 0.06, P.z + TMP.position.z - Math.sin(P.th) * dd * 2, 5.2, P.th, 1.4]); } }
        if (look.night && (it.t === 'yacht' || it.t === 'buoy')) lamps.push(P.x, y + (it.t === 'yacht' ? 12.3 : 2.3), P.z);
      }
      if (i % 3 === 0 && !g.fk) for (const lat of [-HALF / 3, HALF / 3]) { place(W, i * SEG + SEG / 2, lat, 0, P); addAll(EYE, P.x, P.y + 0.03, P.z, -P.th); }   // a cat's eye on each lane line
      if (i % 12 === 0 && !g.tun && !g.brg && !g.fk && !g.gate) for (const d of [-1, 1]) { const mx = d * (HALF + RUM + 1.4); if (!(g.sea === d && g.sh < 14) && !(d < 0 ? g.wl : g.wr)) { place(W, i * SEG, mx, 0, P); addAll(MD.model('marker', 0), P.x, groundAt(W, g, P, mx) - 0.05, P.z, -P.th); } }
      dress(W, i, g, look, P, addAll);
    }
    for (const k in L) {
      const mesh = new THREE.Mesh(mergeT(L[k]), MAT[k]);
      mesh.castShadow = k !== 'glow' && k !== 'grass' && k !== 'twall'; mesh.receiveShadow = k !== 'glow' && k !== 'twall';
      group.add(mesh);
    }
    for (const [key, list] of signs) { const m = new THREE.Mesh(mergeT(list), signMat(key)); m.castShadow = true; group.add(m); }
    if (lamps.length) group.userData.lamps = lamps;
    if (slows.length) {   // the painted words, laid flat along the road
      const pos = [], uv = [];
      for (const q of slows) {
        const r = q[3], th = q[4], ra = r * q[5], ax = Math.sin(th) * ra, az = -Math.cos(th) * ra, bx = Math.cos(th) * r, bz = Math.sin(th) * r;
        const c = (sa, sb) => [q[0] + ax * sa + bx * sb, q[1], q[2] + az * sa + bz * sb];
        pos.push(...c(-1, -1), ...c(1, 1), ...c(1, -1), ...c(-1, -1), ...c(-1, 1), ...c(1, 1)); uv.push(0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1);
      }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); sg.computeVertexNormals();
      const sm = new THREE.Mesh(sg, slowMat); sm.renderOrder = 1; sm.receiveShadow = true; group.add(sm);
    }
    if (pools.length) {   // the light each lamp throws on the road
      const pos = [], uv = [];
      for (const q of pools) {   // [x, y, z, radius across, the road's heading, how much longer along it]
        const r = q[3] || 7.5, th = q[4] || 0, ra = r * (q[5] || 1), ax = Math.sin(th) * ra, az = -Math.cos(th) * ra, bx = Math.cos(th) * r, bz = Math.sin(th) * r;
        const c = (sa, sb) => [q[0] + ax * sa + bx * sb, q[1], q[2] + az * sa + bz * sb];
        pos.push(...c(-1, -1), ...c(1, 1), ...c(1, -1), ...c(-1, -1), ...c(-1, 1), ...c(1, 1)); uv.push(0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1);   // (wound to face up: the other way round they vanish)
      }
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const pm = new THREE.Mesh(pg, poolMat); pm.renderOrder = 2; group.add(pm);
    }
  }
  // more of the place, further from the road than anything you can hit: trees, palms, sheep, grass (the same every time)
  const DP = { x: 0, y: 0, z: 0, th: 0, bank: 0, g: null };
  function dress(W, i, g, look, P, addAll) {
    if (!look.dress || g.fk || g.tun || g.brg || R.low && i % 2) return;
    let kk = 0; for (let j = -6; j <= 6; j++) kk += E.segAt(W, i + j).k; kk /= 13;
    const inner = Math.abs(kk) > 1e-4 ? 0.55 / Math.abs(kk) : 1e9, innerSide = kk > 0 ? 1 : -1;
    for (const d of [-1, 1]) {
      if (g.sea === d) continue;
      look.dress.forEach((t, ti) => {
        const h0 = hash2(i * 7 + ti, d * 31 + 5), cnt = Math.floor(t[2]) + (h0 < t[2] % 1 ? 1 : 0);
        for (let q = 0; q < cnt; q++) {
          const h1 = hash2(i * 13 + q, ti * 17 + d), h2 = hash2(i * 3 + q * 11, ti * 5 - d), h3 = hash2(i + q * 29, ti * 37 + d * 3);
          const lat = t[3] + h1 * (t[4] - t[3]); if (d === innerSide && lat > inner) continue;
          place(W, i * SEG + h2 * SEG, d * lat, 0, DP);
          const y = groundAt(W, g, DP, d * lat) - (t[0] === 'tuft' ? 0.05 : 0.25) + (t[0] === 'balloon' ? 60 + h1 * 90 : 0);
          const ry = /^(hotel|building|villa|terrace)$/.test(t[0]) ? faceRoad(d, DP.th) : h3 * Math.PI * 2;
          addAll(MD.model(t[0], Math.floor(h3 * 997) % t[1]), DP.x, y, DP.z, ry, t[0] === 'tuft' || /^(hotel|building|villa|terrace|balloon)$/.test(t[0]) ? 1 : 0.8 + h2 * 0.45);
        }
      });
    }
  }
  function groundAt(W, g, P, lat) {   // the land's height beside the road (the same sums as the chunk's ground)
    const S = E.STAGES[g.st], look = LOOK[S.key], d = lat < 0 ? -1 : 1, a = Math.abs(lat), span = HALF + RUM;
    if (g.sea === d && g.sh) { if (a > g.sh + 4) return look.beachY; return P.y - 0.15; }
    return heightOf(W, look, S, g, 'land', a, P.y, P.x, P.z, a - span);
  }
  const P2 = { x: 0, y: 0, z: 0, th: 0, bank: 0, g: null };
  function signParts(W, i, g, it, P, y, ry, signs, addModel, addAll) {
    const plane = (w, h, key, ox, oy, oz, flip) => {
      const pg = new THREE.PlaneGeometry(w, h); if (flip) { const u = pg.attributes.uv; for (let q = 0; q < u.count; q++) u.setX(q, 1 - u.getX(q)); }
      TMP.position.set(ox, oy, oz); TMP.rotation.set(0, 0, 0); TMP.scale.setScalar(1); TMP.updateMatrix(); pg.applyMatrix4(TMP.matrix);
      TMP.position.set(P.x, y, P.z); TMP.rotation.set(0, ry, 0); TMP.updateMatrix();
      (signs.get(key) || signs.set(key, []).get(key)).push([pg, TMP.matrix.clone(), true]);
    };
    const box = (w, h, d, ox, oy, oz, col, key) => { const k = new MD.Kit(); k.box(w, h, d, ox, oy, oz, col, 0, 0, 0, key || 'shiny'); const m = k.build(); for (const kk in m) if (m[kk]) addModel(m[kk], kk, P.x, y, P.z, ry, 1, true); };
    switch (it.t) {
      case 'gate': {
        const w = HALF + 2.5;
        box(0.7, 8.4, 0.7, -w, 0, 0, '#d9dde3'); box(0.7, 8.4, 0.7, w, 0, 0, '#d9dde3'); box(w * 2 + 1.2, 1.7, 0.5, 0, 8.4, 0, '#1c2533');
        plane(w * 2 + 0.8, 1.45, 'gate|' + it.v, 0, 9.25, 0.27); plane(w * 2 + 0.8, 1.45, 'gate|' + it.v, 0, 9.25, -0.27, true);
        // people cheering behind the barriers either side, and flags
        poses(W, Math.min(E.lastIndex(W), i + 8));
        for (const d of [-1, 1]) {
          if (g.sea === d && g.sh < 20) continue;
          for (const [o, t, lat] of [[-7, 'crowd', 12.6], [9, 'crowd', 12.6], [-22, 'flags', 11.8], [24, 'flags', 11.8]]) {
            const s = i * SEG + o, si = E.segIndex(s); if (si < W.base || si > E.lastIndex(W) - 1) continue;
            const gg = E.segAt(W, si); if (gg.fk) continue;
            place(W, s, d * lat, 0, P2);
            addAll(MD.model(t, (i + o + d * 3) & 7), P2.x, groundAt(W, gg, P2, d * lat), P2.z, faceRoad(d, P2.th));
          }
        }
        break;
      }
      case 'gantry': {
        const w = HALF + 2.5, names = (it.txt || '|').split('|');
        box(0.5, 7.5, 0.5, -w, 0, 0, '#9aa0a6'); box(0.5, 7.5, 0.5, w, 0, 0, '#9aa0a6'); box(w * 2, 0.4, 0.4, 0, 7.2, 0, '#9aa0a6');
        plane(6.4, 2.8, 'fsign|-1|' + names[0], -3.6, 6, 0.3); plane(6.4, 2.8, 'fsign|1|' + names[1], 3.6, 6, 0.3);
        break;
      }
      case 'banner': {   // a banner right across the road on two posts
        const w = HALF + 3;
        box(0.5, 7.4, 0.5, -w, 0, 0, '#d8dde2'); box(0.5, 7.4, 0.5, w, 0, 0, '#d8dde2'); box(w * 2 + 0.6, 0.3, 0.3, 0, 7.4, 0, '#d8dde2');
        plane(w * 2 - 1, 1.8, 'banner|' + it.v, 0, 6.1, 0.12); plane(w * 2 - 1, 1.8, 'banner|' + it.v, 0, 6.1, -0.12, true);
        break;
      }
      case 'nose': plane(6, 3.6, 'nose|' + it.txt, 0, 2.4, 0.1); box(0.2, 1.2, 0.2, -1.8, 0, 0, '#9aa0a6'); box(0.2, 1.2, 0.2, 1.8, 0, 0, '#9aa0a6'); break;
      case 'board': plane(8, 4, 'board|' + (it.v % 4), 0, 4.4, 0.08); plane(8, 4, 'boardback', 0, 4.4, -0.08, true); break;
      case 'chev': plane(1.1, 0.9, 'chev', 0, 1.65, 0.04, it.v < 0); break;
      case 'warn': plane(3.6, 1.5, 'warn', 0, 2.35, 0.05, it.v < 0); break;
    }
  }
  const NM = new THREE.Matrix3(), VV = new THREE.Vector3();
  function mergeT(list) {   // [geometry, matrix, temporary?] joined into one geometry: positions and normals moved, colours and uvs kept when all have them
    let n = 0; for (const [g] of list) n += g.index ? g.index.count : g.attributes.position.count;
    const hasC = list.every((e) => e[0].attributes.color), hasU = list.every((e) => e[0].attributes.uv);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = hasC ? new Float32Array(n * 3) : null, uv = hasU ? new Float32Array(n * 2) : null; let o = 0;
    for (const [g0, m, temp] of list) {
      const g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position, nn = g.attributes.normal, c = g.attributes.color, u = g.attributes.uv;
      NM.getNormalMatrix(m);
      for (let i = 0; i < p.count; i++) {
        const k = (o + i) * 3;
        VV.fromBufferAttribute(p, i).applyMatrix4(m); pos[k] = VV.x; pos[k + 1] = VV.y; pos[k + 2] = VV.z;
        VV.fromBufferAttribute(nn, i).applyMatrix3(NM).normalize(); nor[k] = VV.x; nor[k + 1] = VV.y; nor[k + 2] = VV.z;
        if (col) { col[k] = c.getX(i); col[k + 1] = c.getY(i); col[k + 2] = c.getZ(i); }
        if (uv) { uv[(o + i) * 2] = u.getX(i); uv[(o + i) * 2 + 1] = u.getY(i); }
      }
      o += p.count; if (g !== g0) g.dispose(); if (temp) g0.dispose();
    }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3)); if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.computeBoundingSphere();
    return out;
  }
  function dropChunk(ch) { scene.remove(ch); ch.traverse((o) => { if (o.geometry && !o.userData.keep) o.geometry.dispose(); }); }

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
        const Lq = (px, pz, t, lat, yy) => [px + Math.cos(t) * lat, yy, pz + Math.sin(t) * lat];
        pushQ(Lq(x, z, th, -HALF, y), Lq(nx, nz, nth, -HALF, y), Lq(nx, nz, nth, HALF, y), Lq(x, z, th, HALF, y), i % 4 < 2 ? pal.road[0] : pal.road[1]);
        pushQ(Lq(x, z, th, -40, y - 0.1), Lq(nx, nz, nth, -40, y - 0.1), Lq(nx, nz, nth, -HALF, y - 0.05), Lq(x, z, th, -HALF, y - 0.05), pal.grass[i % 2]);
        pushQ(Lq(x, z, th, HALF, y - 0.05), Lq(nx, nz, nth, HALF, y - 0.05), Lq(nx, nz, nth, 40, y - 0.1), Lq(x, z, th, 40, y - 0.1), pal.grass[(i + 1) % 2]);
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
      if (made >= (R.built ? 2 : 4)) break;
      if (ch) { dropChunk(ch); R.chunks.delete(c); }
      const g = buildChunk(W, c); if (g) { scene.add(g); R.chunks.set(c, g); }
      made++;
    }
    R.built = 1;
    stubs(W);
  }

  // ---------------------------------------------------------------- the place's light, sky and haze (fading from one place to the next)
  const KERBC = {}, KERBG = new THREE.Color('#8a8580'), EYEC = new THREE.Color(1, 0.94, 0.78), TMPC = new THREE.Color(), SUNV = new THREE.Vector3(), ROADGREY = new THREE.Color('#6c7076'), HEMIC = hemi.color.clone(), TUNC = new THREE.Color('#ffc890');
  function setLook(st, k) {
    const pal = PAL[st], look = LOOK[pal.key], sk = pal.sky;
    const blend = (c, hex) => { TMPC.set(hex); c.lerp(TMPC, k); };
    const to = (v, x) => v + (x - v) * k;
    blend(SU.top.value, sk[0][1]); blend(SU.mid.value, sk[Math.min(2, sk.length - 2)][1]); blend(SU.hor.value, look.fogCol || sk[sk.length - 1][1]);
    TMPC.set(pal.grass[0]).lerp(ROADGREY, 0.9).multiplyScalar(0.55); SU.gnd.value.lerp(TMPC, k);   // what shiny things see below them: mostly road
    blend(SU.cLit.value, look.cloud[0]); blend(SU.cDark.value, look.cloud[1]); blend(SU.sunCol.value, look.sunCol);
    { const F = FIELDS[pal.key] || FIELDS.bournemouth; ['uF0', 'uF1', 'uF2', 'uF3', 'uF4'].forEach((u, i) => blend(FU[u].value, F.cols[i])); FU.uFK.value = to(FU.uFK.value, F.k); FU.uFlow.value = to(FU.uFlow.value, look.night ? 0 : (FLOWERS[pal.key] || 0)); FU.uDap.value = RU.uDap.value = to(FU.uDap.value, look.trees ? 1 : 0); FU.uDry.value = to(FU.uDry.value, look.dusk ? 0.3 : (DRY[pal.key] == null ? 0.6 : DRY[pal.key])); }
    SU.cover.value = to(SU.cover.value, look.cover); SU.sunGlow.value = to(SU.sunGlow.value, look.glow); SU.discI.value = to(SU.discI.value, look.night ? 0 : 14);
    blend(fog.color, look.fogCol || sk[sk.length - 1][1]);   // the haze is the sky's own colour at the horizon, never a grey
    const fogN = lit(look) ? 1 : 1.5, fogF = lit(look) ? 1 : 1.2;   // daytime: the haze starts twice as far out, so the middle distance keeps its colour
    fog.near += (look.fog[0] * fogN - fog.near) * k; fog.far += (look.fog[1] * fogF * (R.low ? 0.8 : 1) - fog.far) * k;
    blend(HEMIC, look.hemi[0]); blend(hemi.groundColor, look.hemi[1]); R.hemiI = to(R.hemiI, look.hemi[2] * (lit(look) ? 1 : 0.8));
    blend(sun.color, look.sunCol); R.sunI = to(R.sunI, look.sunI * (lit(look) ? 1 : 1.12));
    R.envI = to(R.envI, look.env * (lit(look) ? 1 : 0.85));
    const dark = R.tunK;   // in a tunnel the sun and sky hardly reach you
    hemi.intensity = R.hemiI * (1 - 0.55 * dark); sun.intensity = R.sunI * (1 - 0.9 * dark); scene.environmentIntensity = R.envI * (1 - 0.85 * dark);
    hemi.color.copy(HEMIC).lerp(TUNC, dark * 0.75); roadMat.emissive.setRGB(0.27 * dark, 0.22 * dark, 0.16 * dark);
    for (const m of OWN_ENV) m.envMapIntensity = m.userData.envBase * scene.environmentIntensity * (m === roadMat ? 1 - 0.9 * dark : 1);   // no sky to see reflected in a tunnel's road
    { const hz = Math.hypot(look.sun[0], 0.7); let az = Math.atan2(look.sun[0], 0.7);
      const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), hd = R.heading || 0;
      if (look.rays) { const cur = R.sunAz == null ? az : R.sunAz; az = hd + (wrap(cur - hd) < 0 ? -0.62 : 0.62); }
      else if (look.sun[1] < 0.45 && !look.night) { const cur = R.sunAz == null ? az : R.sunAz, d = wrap(az - hd); if (Math.abs(d) < 0.8) az = hd + (wrap(cur - hd) < 0 ? -0.8 : 0.8); }
      R.sunAz = R.sunAz == null || k >= 1 ? az : R.sunAz + wrap(az - R.sunAz) * Math.min(1, k * 0.4);
      SUNV.set(Math.sin(R.sunAz) * hz, look.sun[1], -Math.cos(R.sunAz) * hz).normalize(); SU.sunDir.value.lerp(SUNV, k).normalize(); }
    blend(roadMat.color, look.roadK || '#ffffff');   // where the sky is orange the asphalt gets a cool counter-tint, so it stays charcoal
    blend(seaMat.color, look.sea || '#1d8cc4'); seaMat.normalScale.setScalar(to(seaMat.normalScale.x, look.night ? 0.12 : 0.32)); seaMat.opacity = to(seaMat.opacity, look.seaOp || 0.85);
    const gr = GRADE_U; gr.sat.value = to(gr.sat.value, look.grade[0] * (lit(look) ? 1 : 1.07)); gr.con.value = to(gr.con.value, look.grade[1] + (lit(look) ? 0 : 0.05)); blend(gr.tint.value, look.grade[2]); gr.vib.value = to(gr.vib.value, lit(look) ? 0.1 : 0.22); { const lf = look.lift || [0, 0, 0]; gr.lift.value.set(to(gr.lift.value.x, lf[0]), to(gr.lift.value.y, lf[1]), to(gr.lift.value.z, lf[2])); } gr.curve.value = to(gr.curve.value, lit(look) ? 0.08 : 0.18);
    stars.visible = !!look.night; moon.visible = !!look.night;
    MAT.eyes.color.setScalar(look.night ? 2.6 : look.dusk ? 1.6 : R.tunK > 0.5 ? 1.2 : 0.5).multiply(EYEC);
    headlight.intensity = lit(look) ? 220 : 0; carGlow.intensity = look.night ? 9 : look.dusk ? 4 : 0; cabinLight.intensity = look.night ? 1.2 : look.dusk ? 0.6 : 0; RIM.value.set('#ffd9b0').multiplyScalar(look.night ? 0.6 : look.dusk ? 0.5 : 0.46); { const tg = look.night ? 1 : look.dusk ? 0.6 : 0; tailGlow.forEach((s) => { s.material.opacity = tg; }); tailWash.material.opacity = tg * 0.9; } fill.intensity = look.night ? 42 : look.dusk ? 22 : look.rays ? 12 : 0;   // (high above: close over their heads it blew them out into a glare)
    bloom.threshold = lit(look) ? 2.2 : 1.9; bloom.strength = (lit(look) ? 0.24 : 0.26) * (look.bloomK || 1);   // only the sun's disc and the lamps glow
    renderer.toneMappingExposure = to(renderer.toneMappingExposure, look.exp || 1);
    roadMat.roughness = to(roadMat.roughness, look.night ? 0.42 : look.rays ? 0.7 : look.glow >= 1.4 ? 0.55 : 0.6);   // wetter-looking at night, a sheen under a low sun
    R.gulls = !!(look.sea && !lit(look));
  }
  const GRADE_U = grade.uniforms;
  function updateEnv(t) {   // the sky as everything's surroundings: worked out again as one place fades into the next
    const rtE = pmrem.fromScene(envScene, 0, 0.1, 200);
    if (R.envRT) R.envRT.dispose(); R.envRT = rtE; scene.environment = rtE.texture; R.envT = t;
    for (const m of OWN_ENV) m.envMap = rtE.texture;   // (three ignores a material's own envMapIntensity under scene.environment: these hold the sky themselves so theirs counts)
  }
  function setBackdrop(key, W) {
    const res = 2, B = ART.bg(key, res, true), tx = new THREE.CanvasTexture(B.far); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = THREE.RepeatWrapping; tx.anisotropy = 8;
    if (ringFar.material.map) ringFar.material.map.dispose();
    ringFar.material.map = tx; ringFar.material.needsUpdate = true;
    const H = 2 * Math.PI * 2300 / ART.BG_W * ART.BG_H * 0.55;   // the panorama wrapped once round, squashed so its hills sit low
    ringFar.scale.set(1, H, 1); ringFar.userData.hz = ((ART.BG_H - ART.HZ) / ART.BG_H - 0.5) * H;   // the horizon's height within the ring
    const mk = ART.MARK && ART.MARK[key];
    R.markT = mk != null ? 2 * Math.PI * mk / ART.BG_W : null; R.ringSnap = true; if (mk == null) ringFar.rotation.y = 0;
  }
  function turnRing(W, dt) {   // the far panorama slides round slowly on the bends (like the old arcade backdrops), keeping the place's landmark ahead, off to the sea side
    if (R.markT == null || R.heading == null) return;
    const side = E.segAt(W, E.segIndex(W.s)).sea || 1, want = Math.PI - (R.heading + side * 0.36) - R.markT;   // a point at angle t round the ring lies at (sin t, cos t); the ring turned by r puts it at t + r
    const d = Math.atan2(Math.sin(want - ringFar.rotation.y), Math.cos(want - ringFar.rotation.y));
    ringFar.rotation.y += d * (R.ringSnap ? 1 : Math.min(1, dt * 0.6)); R.ringSnap = false;
  }

  // ---------------------------------------------------------------- the player's car
  const COUPLE = MD.people();
  function addParts(group, geo, mats) { for (const k in geo) if (geo[k] && (mats[k] || CAR[k])) { const mesh = new THREE.Mesh(geo[k], mats[k] || CAR[k]); mesh.castShadow = k !== 'glow'; group.add(mesh); } }
  function personOf(spec) {   // a body with a neck, two shoulders and two elbows that bend, and (hers) a streaming tail of hair
    const root = new THREE.Group(); root.position.set(spec.seat[0], spec.seat[1], spec.seat[2]); root.scale.setScalar(spec.scale || 1); addParts(root, spec.part.torso, PM);
    const neck = new THREE.Group(); neck.position.set(0, spec.neck, 0); neck.scale.setScalar(1.08); root.add(neck); addParts(neck, spec.part.head, PM);
    const arms = [-1, 1].map((sd) => {
      const sh = new THREE.Group(); sh.position.set(sd * spec.shoulder[0], spec.shoulder[1], spec.shoulder[2]); root.add(sh); addParts(sh, spec.part.upper, PM);
      const el = new THREE.Group(); el.position.set(0, -spec.elbow, 0); sh.add(el); addParts(el, spec.part.fore, PM);
      sh.rotation.order = 'YXZ'; return { sh: sh, el: el };   // out to the side, then forward, then turned
    });
    const locks = spec.part.locks ? spec.part.locks.map((L) => { const g = new THREE.Group(); g.position.set(L.at[0], L.at[1], L.at[2]); g.scale.setScalar(L.s); neck.add(g); addParts(g, L.geo, PM); return g; }) : null;
    let hair = null;
    if (spec.part.hair) {
      hair = []; let parent = new THREE.Group(); parent.position.set(spec.hairAt[0], spec.hairAt[1], spec.hairAt[2]); parent.scale.setScalar(0.905); neck.add(parent);
      spec.part.hair.forEach((geo, i) => { const g = new THREE.Group(); if (i) g.position.set(0, 0, 0.115); parent.add(g); addParts(g, geo, PM); hair.push(g); parent = g; });
    }
    let scarf = null;
    if (spec.part.scarf) {   // her scarf: tied at the neck, its end trailing back
      scarf = []; let parent = new THREE.Group(); parent.position.set(spec.scarfAt[0], spec.scarfAt[1], spec.scarfAt[2]); parent.scale.setScalar(0.905); neck.add(parent);
      spec.part.scarf.forEach((geo, i) => { const g = new THREE.Group(); g.position.set(0, 0, i ? 0.125 : 0.06); parent.add(g); addParts(g, geo, {}); scarf.push(g); parent = g; });
    }
    if (spec.lean) root.rotation.x = spec.lean;   // leaning back in her seat
    root.userData.home = { p: root.position.clone(), r: root.rotation.clone(), s: root.scale.clone() };
    const halo = new THREE.Group(); halo.position.set(0, 0.37, 0); halo.visible = false; neck.add(halo); root.userData.halo = halo;   // the stars you see after a crash
    for (let i = 0; i < 5; i++) { const s = new THREE.Sprite(STARMAT); const a = i / 5 * Math.PI * 2; s.position.set(Math.cos(a) * 0.34, Math.sin(a * 2) * 0.04, Math.sin(a) * 0.34); s.scale.setScalar(0.32); halo.add(s); }
    return { root: root, neck: neck, arms: arms, hair: hair, scarf: scarf, locks: locks };
  }
  function makePlayer(id) {
    restore(); player.clear(); const m = MD.playerCar(id); carInfo = m; R.couple = null;
    for (const k in m.body) if (m.body[k] && CAR[k]) { const mesh = new THREE.Mesh(m.body[k], CAR[k]); mesh.castShadow = k !== 'glow'; player.add(mesh); }
    wheels = m.wheels.map((p) => { const w = new THREE.Group(); for (const k in m.wheel) if (m.wheel[k] && CAR[k]) { const mesh = new THREE.Mesh(m.wheel[k], CAR[k]); mesh.castShadow = true; w.add(mesh); } w.position.set(p[0], p[1], p[2]); w.scale.x = p[0] < 0 ? -1 : 1; w.userData.home = { p: w.position.clone(), r: new THREE.Euler(), s: w.scale.clone() }; player.add(w); return w; });   // (mirrored on the left, so the spokes face out)
    R.hubs = m.wheels.map((p) => { const s = new THREE.Mesh(STUB, CAR.trim); s.position.set(p[0], p[1], p[2]); s.rotation.z = Math.PI / 2; s.visible = false; player.add(s); return s; });   // a hub, seen when a wheel's gone
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(m.width + 0.7, m.len * 2 + 0.7), new THREE.MeshBasicMaterial({ map: radial(64, [[0, 'rgba(0,0,0,0.6)'], [0.7, 'rgba(0,0,0,0.32)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.04; player.add(shadow); player.userData.shadow = shadow;
    if (m.open) {   // the roadster: the two of you, and the steering wheel
      const drv = personOf(COUPLE.driver), her = personOf(COUPLE.girl), sw = new THREE.Group();
      player.add(drv.root); player.add(her.root);
      sw.position.set(COUPLE.wheel.at[0], COUPLE.wheel.at[1], COUPLE.wheel.at[2]); sw.rotation.x = COUPLE.wheel.tilt; const inner = new THREE.Group(); sw.add(inner); addParts(inner, COUPLE.wheel.geo, {}); player.add(sw);
      const NS = 11, sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * NS * 2 * 3), 3));
      const idx = []; for (let tl = 0; tl < 2; tl++) for (let i = 0; i < NS - 1; i++) { const a = (tl * NS + i) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } sg.setIndex(idx);
      const scarf = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: '#f07aa0', roughness: 0.55, side: THREE.DoubleSide })); scarf.frustumCulled = false; player.add(scarf);
      R.couple = { drv: drv, her: her, wheel: inner, cur: {}, scarf: scarf, NS: NS };
    }
    flames.forEach((f, q) => { f.position.set((q ? 1 : -1) * 0.42, 0.36, m.len + 0.06); player.add(f); });
    tailGlow.forEach((s, q) => { s.position.set((q ? 1 : -1) * 0.6, 0.63, m.len + 0.08); player.add(s); });
    tailWash.position.set(0, 0.03, m.len + 1.4); player.add(tailWash);
    nitroLight.position.set(0, 0.5, m.len + 1.2); player.add(nitroLight);
    cabinLight.position.set(0, 1.2, -0.45); player.add(cabinLight);
    playerCarId = id;
  }

  // ---------------------------------------------------------------- a big crash: the car somersaults and barrel-rolls on down the road,
  // bouncing twice; the two of you and a wheel are thrown clear; sparks, smoke and bits of red; then a flash and you're
  // back in your seats on the road (engine.js puts the car back in a lane and stops it)
  const TG = 17;
  function tumble(cr) {
    const sec = cr.t / 60, v0 = cr.v0 || 40, vz0 = 7.5 + Math.min(5.5, v0 / 12), vz1 = vz0 * 0.42, vz2 = vz1 * 0.35;
    const T1 = 2 * vz0 / TG, T2 = 2 * vz1 / TG, T3 = 2 * vz2 / TG, Tf = T1 + T2 + T3;
    let lift = 0, hop = 3;
    if (sec < T1) { lift = vz0 * sec - TG / 2 * sec * sec; hop = 0; }
    else if (sec < T1 + T2) { const u = sec - T1; lift = vz1 * u - TG / 2 * u * u; hop = 1; }
    else if (sec < Tf) { const u = sec - T1 - T2; lift = vz2 * u - TG / 2 * u * u; hop = 2; }
    const e = Math.min(1, sec / Tf), ee = 1 - Math.pow(1 - e, 2.2), flips = 0, rolls = v0 > 62 ? 2 : 1;
    return { lift: Math.max(0, lift) + (hop < 3 ? 0.4 * Math.sin(Math.PI * ee) : 0), pitch: -flips * Math.PI * 2 * ee, roll: cr.spin * rolls * Math.PI * 2 * ee, yaw: cr.spin * 0.9 * ee, hop: hop, air: hop < 3 };
  }
  function debris(x, y, z, n, fx, fz, v) {   // bits of red bodywork, glass and trim, flying on with the car's speed; a burst of dust
    v = v || 0;
    const cols = ['#e8f4ff', '#ffffff'];
    for (let i = 0; i < n * 0.3; i++) sparks.emit(x, y + 0.6, z, fx * 6 + (Math.random() - 0.5) * 10, 3 + Math.random() * 7, fz * 6 + (Math.random() - 0.5) * 10, 0.12, 0.05, cols[i % 2], 1, 0.5 + Math.random() * 0.5, 14);   // glints of glass
    const nShard = Math.min(18, Math.round(n / 4));
    for (let i = 0; i < nShard; i++) {
      const kind = i % 6, sz = kind < 3 ? [0.14 + Math.random() * 0.14, 0.08, 0.1 + Math.random() * 0.1] : kind < 5 ? [0.22, 0.1, 0.1] : [0.12, 0.05, 0.12], fv = v * (0.4 + Math.random() * 0.35) + 5;
      shard(x, y + 0.6, z, fx * fv + (Math.random() - 0.5) * 11, 2.5 + Math.random() * 4.5, fz * fv + (Math.random() - 0.5) * 11, sz, kind < 3 ? '#c8101c' : kind < 5 ? '#4a4c50' : '#cfe6f4', y + 0.02);
    }
    const dust = R.W && R.W.off ? '#a49a7c' : '#c4bcb0';
    for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2; smoke.emit(x, y + 0.3, z, Math.cos(a) * 9, 0.4 + Math.random(), Math.sin(a) * 9, 2.2, 7.5, dust, 0.36, 2.8); }   // a ring of dust rolling out low
    for (let i = 0; i < 22; i++) smoke.emit(x + (Math.random() - 0.5) * 3, y + 0.4, z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 7 + fx * 3, 0.6 + Math.random() * 2, (Math.random() - 0.5) * 7 + fz * 3, 1.4, 4.6, dust, 0.28, 1.8);
  }
  const SH_N = 48, shards = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.15 }), SH_N), SHL = [], SHM = new THREE.Matrix4(), SHQ = new THREE.Quaternion(), SHE = new THREE.Euler(), SHS = new THREE.Vector3(), SHP = new THREE.Vector3(), SHC = new THREE.Color();
  shards.frustumCulled = false; shards.castShadow = true; shards.count = 0; scene.add(shards);
  for (let i = 0; i < SH_N; i++) { shards.setColorAt(i, SHC.set('#ffffff')); SHL.push({ life: 0, max: 0 }); }
  let shNext = 0;
  function shard(x, y, z, vx, vy, vz, sz, hex, floor) {
    const o = SHL[shNext]; shNext = (shNext + 1) % SH_N;
    Object.assign(o, { x: x, y: y, z: z, vx: vx, vy: vy, vz: vz, rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6, wx: (Math.random() - 0.5) * 24, wy: (Math.random() - 0.5) * 24, wz: (Math.random() - 0.5) * 24, sz: sz, col: hex, floor: floor, life: 0, max: 3.2 + Math.random() });
  }
  function updateShards(dt) {
    let n = 0;
    for (const o of SHL) {
      if (o.life >= o.max) continue;
      o.life += dt; o.vy -= 15 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; o.rx += o.wx * dt; o.ry += o.wy * dt; o.rz += o.wz * dt;
      if (o.y < o.floor) { o.y = o.floor; o.vy = Math.abs(o.vy) * 0.3; o.vx *= 0.55; o.vz *= 0.55; o.wx *= 0.4; o.wy *= 0.4; o.wz *= 0.4; if (Math.abs(o.vy) < 0.6) { o.vy = 0; o.rx = Math.round(o.rx / Math.PI) * Math.PI; o.rz = Math.round(o.rz / Math.PI) * Math.PI; } }
      const k = Math.min(1, (o.max - o.life) / 0.5);   // they shrink away at the end
      SHE.set(o.rx, o.ry, o.rz); SHQ.setFromEuler(SHE); SHS.set(o.sz[0] * k, o.sz[1] * k, o.sz[2] * k); SHP.set(o.x, o.y, o.z);
      if (camHide(SHP)) SHS.setScalar(0); SHM.compose(SHP, SHQ, SHS); shards.setMatrixAt(n, SHM); shards.setColorAt(n, SHC.set(o.col)); n++;
    }
    shards.count = n; shards.instanceMatrix.needsUpdate = true; if (shards.instanceColor) shards.instanceColor.needsUpdate = true;
  }
  const FWD = new THREE.Vector3();
  function crashScene(W, cr, T, dt, cx, cy, cz, heading, roadY) {
    const fx = Math.sin(heading), fz = -Math.cos(heading);
    if (R.pcx != null && dt > 0) { R.cvx = (cx - R.pcx) / dt; R.cvz = (cz - R.pcz) / dt; } R.pcx = cx; R.pcz = cz;
    if (cr && cr.hard && cr !== R.crashObj) {   // the moment of impact
      R.crashObj = cr; R.hop = 0; R.camShake = 0.9; R.flash = Math.max(R.flash, 0.55);
      debris(cx, cy, cz, 70, fx, fz, cr.v0 || W.v);
      for (let i = 0; i < 40; i++) sparks.emit(cx + fx * 2, cy + 0.6, cz + fz * 2, (Math.random() - 0.5) * 14, Math.random() * 9, (Math.random() - 0.5) * 14, 0.3, 0.1, ['#ffd27a', '#ffb347', '#ffffff'][i % 3], 1, 0.6 + Math.random() * 0.4, 9);
      eject(cx, cy, cz, heading, cr.v0 || 40);
    }
    if (cr && cr.hard && T) {
      if (T.hop > R.hop) {   // it lands, and bounces
        R.hop = T.hop; R.camShake = Math.max(R.camShake, 0.6 / T.hop);
        debris(cx, cy, cz, 30 / T.hop, fx, fz);
        for (let i = 0; i < 26; i++) smoke.emit(cx + (Math.random() - 0.5) * 3, cy + 0.3, cz + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 5, 1 + Math.random() * 2, (Math.random() - 0.5) * 5, 1.2, 3.2, '#c8c0b4', 0.55, 1.6);
        for (let i = 0; i < 30; i++) sparks.emit(cx, cy + 0.2, cz, (Math.random() - 0.5) * 12 + fx * 8, Math.random() * 4, (Math.random() - 0.5) * 12 + fz * 8, 0.22, 0.08, '#ffd27a', 1, 0.5, 9);
      }
      if (T.air && Math.random() < 0.7) smoke.emit(cx, cy + T.lift + 0.6, cz, (Math.random() - 0.5), 1, (Math.random() - 0.5), 0.8, 2.6, '#b4a894', 0.18, 1.4);
    }
    flyBits(W, dt, cx, cz, fx, fz, roadY);
    if (!cr && R.crashObj) { R.crashObj = null; restore(); R.flash = Math.max(R.flash, 0.9); }   // back on the road: a white flash, the two of you in your seats again
  }
  function eject(cx, cy, cz, heading, v0) {
    const fx = Math.sin(heading), fz = -Math.cos(heading), rx = Math.cos(heading), rz = Math.sin(heading);
    const toss = (obj, side, up, spin, kind) => {
      if (!obj || obj.parent !== player) return;
      obj.updateWorldMatrix(true, false); scene.attach(obj);
      const out = 2 + Math.random() * 2.5, fwd = 0.74; if (kind === 'person') { obj.userData.lead = 4.5 + Math.random() * 1.5; obj.userData.out = side * out; }
      if (kind === 'person') obj.rotateOnWorldAxis(UPV, Math.PI);   // turned to face the camera
      const w = kind === 'person' ? new THREE.Vector3((Math.random() < 0.5 ? -1 : 1) * spin * (0.7 + Math.random() * 0.3), 0, (Math.random() - 0.5) * spin * 0.7) : new THREE.Vector3((Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin);
      R.flying.push({ obj: obj, kind: kind, side: Math.random() < 0.5 ? -1 : 1, v: new THREE.Vector3(fx * v0 * fwd + rx * side * out, up, fz * v0 * fwd + rz * side * out), w: w, rest: false });
    };
    if (R.couple) { R.couple.drv.root.userData.arms = R.couple.drv.arms; R.couple.her.root.userData.arms = R.couple.her.arms; R.couple.her.root.userData.locks = R.couple.her.locks; toss(R.couple.drv.root, 1, 8 + Math.random() * 2, 7, 'person'); toss(R.couple.her.root, -1, 9 + Math.random() * 2, 7.5, 'person'); }
    const lw = wheels[2 + (Math.random() < 0.5 ? 0 : 1)]; R.lostSide = lw === wheels[2] ? 1 : -1; if (R.hubs) R.hubs[wheels.indexOf(lw)].visible = true; toss(lw, 0, 6.5, 0, 'wheel'); if (lw.parent === scene) lw.rotation.z += 0.38;   // tilted as it goes, its alloy face showing
  }
  const WQ = new THREE.Quaternion(), WV = new THREE.Vector3();
  function flyBits(W, dt, cx, cz, fx, fz, roadY) {   // the two of you and the wheel: thrown, bouncing, then sprawled on the road (or rolling away)
    for (const f of R.flying) {
      const o = f.obj, ahead = (o.position.x - cx) * fx + (o.position.z - cz) * fz, floor = E.heightAt(W, W.s + ahead) + (roadY - E.heightAt(W, W.s)) + (f.kind === 'wheel' ? 0.34 : 0.14);
      if (!f.rest) {
        if (f.kind === 'person' && R.cvx != null) {   // they keep pace with the car, a few metres ahead and to the side
          const u = o.userData; u.lead *= Math.pow(0.4, dt); u.out *= Math.pow(0.5, dt); const q = Math.min(1, dt * 3);
          f.v.x += (R.cvx + fx * u.lead - fz * u.out - f.v.x) * q; f.v.z += (R.cvz + fz * u.lead + fx * u.out - f.v.z) * q;
        }
        f.v.y -= TG * dt; o.position.addScaledVector(f.v, dt);
        if (f.kind === 'person' && o.userData.locks) o.userData.locks.forEach((g, i) => { g.rotation.x = -1 + Math.sin(W.t * 0.3 + i) * 0.25; });
        if (f.kind === 'person' && o.userData.arms) o.userData.arms.forEach((A, i) => { A.sh.rotation.y = 0; A.sh.rotation.x = Math.sin(W.t * 0.12 + i * 2.1) * 0.35; A.sh.rotation.z = (i ? 1 : -1) * (1.4 + Math.sin(W.t * 0.15 + i) * 0.3); A.el.rotation.x = 0.12 + Math.sin(W.t * 0.2 + i) * 0.1; });
        if (f.kind === 'person') { o.rotation.x += f.w.x * dt; o.rotation.y += f.w.y * dt; o.rotation.z += f.w.z * dt; } else o.rotation.x -= 20 * dt;
        o.visible = !nearCam(o);
        if (o.position.y < floor) {
          o.position.y = floor; f.v.y = Math.abs(f.v.y) * 0.32; f.v.x *= 0.62; f.v.z *= 0.62; f.w.multiplyScalar(0.45);
          for (let i = 0; i < 8; i++) smoke.emit(o.position.x, floor, o.position.z, (Math.random() - 0.5) * 3, 0.8, (Math.random() - 0.5) * 3, 0.5, 1.4, '#c8c0b4', 0.5, 1);
          if (f.v.y < 1.4) { f.rest = true; f.restT = 0; o.rotation.x = Math.atan2(Math.sin(o.rotation.x), Math.cos(o.rotation.x)); o.rotation.z = Math.atan2(Math.sin(o.rotation.z), Math.cos(o.rotation.z)); }
        }
      } else {
        const k = Math.pow(f.kind === 'wheel' ? 0.5 : 0.06, dt); f.v.x *= k; f.v.z *= k;
        if (f.kind === 'person' && R.cvx != null) { const u = o.userData; u.lead *= Math.pow(0.3, dt); f.v.x = R.cvx * 0.92 + fx * u.lead; f.v.z = R.cvz * 0.92 + fz * u.lead; }   // sliding on with the car
        o.position.x += f.v.x * dt; o.position.z += f.v.z * dt; o.position.y = floor;
        if (f.kind === 'person') {
          f.restT += dt; const up = f.restT > 0.35, tx = up ? -0.12 : -Math.PI / 2;
          o.rotation.x += (tx - o.rotation.x) * Math.min(1, dt * (up ? 4 : 7)); o.rotation.z += (0 - o.rotation.z) * Math.min(1, dt * 7);
          if (up) { o.position.y = floor - 0.12 * Math.min(1, (f.restT - 0.35) * 3);   // sitting up: arms down, hands in the lap
            const q = Math.min(1, dt * 4); if (o.userData.arms) o.userData.arms.forEach((A, i) => { A.sh.rotation.z += ((i ? 1 : -1) * 0.4 - A.sh.rotation.z) * q; A.sh.rotation.x += (0.55 - A.sh.rotation.x) * q; A.el.rotation.x += (0.95 - A.el.rotation.x) * q; }); }
          const h = o.userData.halo; if (h) { h.visible = f.restT > 0.6 && o.visible; h.rotation.y += dt * 5; STARMAT.rotation += dt * 4; o.rotation.y += Math.sin(f.restT * 7) * 0.4 * dt; }   // dazed: a wobble, stars round the head
        }
        else {
          const sp = Math.hypot(f.v.x, f.v.z);
          if (!f.q0) { if (sp > 3) o.rotation.x -= sp * dt / 0.34; else { f.q0 = o.quaternion.clone(); WV.set(1, 0, 0).applyQuaternion(o.quaternion); f.ax = new THREE.Vector3(WV.z, 0, -WV.x).normalize(); f.fall = 0;
            WV.set(Math.sign(o.scale.x) || 1, 0, 0).applyQuaternion(o.quaternion).applyQuaternion(WQ.setFromAxisAngle(f.ax, Math.PI / 2)); f.side = WV.y >= 0 ? 1 : -1; } }
          else {   // a wobble, then over it goes onto its side
            f.fall = Math.min(1, f.fall + dt * 1.3);
            WQ.setFromAxisAngle(f.ax, f.side * (Math.PI / 2) * f.fall * f.fall + Math.sin(f.fall * 14) * 0.1 * (1 - f.fall)); o.quaternion.copy(WQ).multiply(f.q0);
            o.position.y = floor - 0.22 * f.fall * f.fall;
          }
        }
      }
    }
  }
  function camHide(p) { const d = p.distanceTo(camera.position); if (d < 3.5) return true; if (d > 6) return false; SCV3.copy(p).project(camera); return SCV3.y < -0.3; }
  function nearCam(o) { o.getWorldPosition(SCV2); return camHide(SCV2); }
  const SCV2 = new THREE.Vector3(), SCV3 = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
  function restore() {   // everyone and everything back where it belongs in the car
    for (const f of R.flying) { const o = f.obj, h = o.userData.home; player.add(o); o.position.copy(h.p); o.rotation.copy(h.r); o.scale.copy(h.s); o.visible = true; if (o.userData.halo) o.userData.halo.visible = false; }
    R.pcx = R.cvx = null; if (R.hubs) R.hubs.forEach((s) => { s.visible = false; });
    R.flying.length = 0;
  }

  // ---------------------------------------------------------------- the two of you, moving: his hands on the wheel, her arms and head by her mood, her hair in the wind
  const SCV = new THREE.Vector3();
  const POSES = {   // [left shoulder forward, left out, left elbow, right forward, right out, right elbow, head turn, head nod, left turn, right turn]
    idle: [0.2, -0.8, 1.3, 0.14, -0.22, 0.9, 0, 0, 0.2, -0.35],
    ask: [0.55, 0.12, 1.05, 1.15, -0.25, 0.75, -0.55, -0.05, 0, -0.4],
    cheer: [0.3, -2.6, 0.7, 0.3, 2.6, 0.7, 0, -0.25, 0, 0],
    wave: [0.55, 0.12, 1.05, 0.2, 2.5, 0.6, -0.3, -0.1, 0, 0],
    scared: [1.5, 0.25, 2.3, 1.5, -0.25, 2.3, 0, 0.3, 0, 0],
    sad: [0.45, 0.05, 1.2, 0.45, -0.05, 1.2, 0, 0.35, 0, 0]
  };
  function animateCouple(W, dt, t) {
    const C = R.couple; if (!C) return;
    if (R.flying.length) { if (C.scarf) C.scarf.visible = false; return; }   // thrown clear: their limbs are the crash's to move
    const k = Math.min(1, dt * 9), cur = C.cur, her = W.her || { k: 'idle', side: 0, t: 0 };
    let tgt = (POSES[her.k] || POSES.idle).slice();
    if (her.k === 'point') { const d = her.side || 1; tgt = d < 0 ? [1.4, 0, 0.3, 0.14, -0.22, 0.9, 0.55, -0.1, 0.75, 0] : [0.14, 0.22, 0.9, 1.4, 0, 0.3, -0.55, -0.1, 0, -0.75]; }
    if (her.k === 'cheer' || her.k === 'wave') { const w = Math.sin(t / 90) * 0.3; tgt[4] += her.k === 'wave' ? w * 1.4 : w; if (her.k === 'cheer') tgt[1] -= w; }
    if (her.k === 'idle') { tgt[6] = Math.sin(t / 2300) * 0.45 + (W.drift ? -W.drift * 0.4 : 0); tgt[7] = Math.sin(t / 1700) * 0.06; }
    if (her.k === 'ask') tgt[7] += Math.sin(t / 120) * 0.08;
    for (let i = 0; i < 10; i++) cur[i] = cur[i] == null ? tgt[i] : cur[i] + (tgt[i] - cur[i]) * k;
    const H = C.her; H.arms[0].sh.rotation.x = cur[0]; H.arms[0].sh.rotation.z = cur[1]; H.arms[0].el.rotation.x = cur[2];
    H.arms[1].sh.rotation.x = cur[3]; H.arms[1].sh.rotation.z = cur[4]; H.arms[1].el.rotation.x = cur[5];
    H.neck.rotation.y = cur[6]; H.neck.rotation.x = cur[7]; H.neck.rotation.z = 0.05; H.arms[0].sh.rotation.y = cur[8]; H.arms[1].sh.rotation.y = cur[9];
    // her hair: hanging down when you're still, streaming out behind at speed, fluttering
    const sp = Math.min(1, W.v / 40);
    { const C = R.couple, sc = C.scarf; sc.visible = !R.flying.length;
      if (sc.visible) {   // the anchor at her neck, then each tail runs back (or down) in the car's own space, a wave travelling to its tip
        const P = sc.geometry.attributes.position, A = H.neck.localToWorld(SCV.set(-0.1, -0.035, 0.085)); player.worldToLocal(A);
        for (let tl = 0; tl < 2; tl++) {
          let x = A.x + tl * 0.03, y = A.y - tl * 0.015, z = A.z + 0.02;
          for (let i = 0; i < C.NS; i++) {
            const f = i / (C.NS - 1), seg = 0.058, dz = 0.25 + sp * 0.75, dy = -0.95 + sp * 0.85, n = Math.hypot(dz, dy);
            if (i) { const ph = t / 70 - i * 0.9 + tl * 1.7, amp = f * sp; x += Math.sin(ph) * 0.03 * amp - 0.006 - 0.006 * (1 - sp); y += dy / n * seg + Math.cos(ph * 1.3) * 0.022 * amp; z += dz / n * seg; if (y < A.y - 0.28) y = A.y - 0.28; }
            const w = 0.038 * (1 - f * 0.6), o = (tl * C.NS + i) * 2, tw = Math.sin(t / 60 - i * 0.8 + tl * 1.3) * 1.1 * f * sp, wx = Math.sin(tw) * w, wy = Math.cos(tw) * w;
            P.setXYZ(o, x + wx, y + wy, z); P.setXYZ(o + 1, x - wx, y - wy, z);
          }
        }
        P.needsUpdate = true; sc.geometry.computeVertexNormals(); sc.geometry.computeBoundingSphere();
      } }
    if (H.scarf) H.scarf.forEach((g, i) => { g.rotation.x = (i ? 0.04 : 1.35 - sp * 1.15) + Math.sin(t / 45 + i * 1.6) * 0.32 * sp; g.rotation.y = (i ? 0 : -0.08) + Math.sin(t / 70 + i * 1.3) * 0.42 * sp; g.rotation.z = Math.sin(t / 55 + i) * 0.4 * sp; });
    if (H.locks) H.locks.forEach((g, i) => { g.rotation.x = -sp * ((i > 4 ? 0.9 : 0.55) + 0.12 * Math.sin(t / (70 + i * 11) + i * 1.9)) - 0.04; g.rotation.z = Math.sin(t / (90 + i * 13) + i) * 0.08 * sp; });
    if (H.hair) H.hair.forEach((g, i) => { g.rotation.x = (i ? 0.13 + (1 - sp) * 0.14 : 1.3 - sp * 0.62) + Math.sin(t / 65 + i * 1.2) * 0.13 * sp; g.rotation.y = (i ? 0 : 0.14) + Math.sin(t / 100 + i * 0.9) * 0.12 * sp; });
    // him: both hands on the wheel, turning it; a fist in the air at the goal
    const D = C.drv, st = W.steer, gl = her.k === 'wave' || (her.k === 'cheer' && W.banner && W.banner.kind === 'goal');
    C.wheel.rotation.z = -st * 1.5;
    D.arms[0].sh.rotation.x = 0.7 - st * 0.2; D.arms[0].sh.rotation.z = 0.12; D.arms[0].sh.rotation.y = 0; D.arms[0].el.rotation.x = 0.55;
    D.arms[1].sh.rotation.x = gl ? 0.2 : 0.7 + st * 0.2; D.arms[1].sh.rotation.z = gl ? 2.7 + Math.sin(t / 100) * 0.2 : -0.12; D.arms[1].sh.rotation.y = 0; D.arms[1].el.rotation.x = gl ? 0.4 : 0.55;
    D.neck.rotation.y = -st * 0.22 + (her.k === 'ask' ? 0.3 : 0); D.neck.rotation.x = 0.09;
    // both lean a little into the bends
    if (!R.flying.length) D.root.rotation.z = H.root.rotation.z = -st * Math.min(1, W.v / 50) * 0.22;
  }

  // ---------------------------------------------------------------- one picture
  const POS = { x: 0, y: 0, z: 0, th: 0, bank: 0, g: null }, V3 = new THREE.Vector3(), V4 = new THREE.Vector3();
  function render(W, t, mode) {
    const dt = R.lastT ? Math.min(0.1, (t - R.lastT) / 1000) : 1 / 60; R.lastT = t;
    if (R.W !== W) reset(W);
    if (!R.warm && (R.frames = (R.frames || 0) + 1) > 3) warmUp();   // once the title is up and running
    poses(W, E.segIndex(W.s + E.VIEW + 240));
    updateChunks(W);
    // which place we're in: the light, the sky and the far hills follow it
    const here = E.segAt(W, E.segIndex(W.s)).st, key = PAL[here].key;
    if (key !== R.lookKey) { R.lookKey = key; R.fade = R.look === null ? 1 : 0; R.look = here; setBackdrop(key, W); R.envDone = false; }
    R.fade = Math.min(1, R.fade + dt / 2.5);
    R.tunK += ((E.segAt(W, E.segIndex(W.s)).tun ? 1 : 0) - R.tunK) * Math.min(1, dt * 3.5); WAVE_T.value = t / 1000;
    setLook(here, R.fade >= 1 && !R.envDone ? 1 : Math.min(1, dt * 1.2));
    if (!R.envDone && (R.fade >= 1 || t - R.envT > 350)) { updateEnv(t); if (R.fade >= 1) R.envDone = true; }
    SU.time.value = t / 1000;

    // ---- the car
    if (playerCarId !== W.car) makePlayer(W.car);
    const F = W.fork, b = F && F.s && E.segIndex(W.s) >= F.split ? F.s : 0;
    place(W, W.s, W.x, b, POS);
    const cx = POS.x, cz = POS.z, roadTh = POS.th, cy = W.h + (POS.y - E.heightAt(W, W.s));
    const heading = roadTh + W.psi, travel = roadTh + W.phi; R.heading = heading;
    player.position.set(cx, cy, cz);
    const cr = W.crash;
    let yaw = -heading, roll = POS.bank * 0.8 + W.steer * W.v / 70 * 0.05, pitch = Math.atan(gradeAt(W)) * 0.9 + (W.air ? clamp(W.vh * 0.012, -0.25, 0.2) : 0), lift = 0;
    let T = null;
    if (cr) {
      const p = cr.t / cr.dur;
      if (cr.hard) { T = tumble(cr); lift = T.lift; pitch += T.pitch; roll += T.roll; yaw += T.yaw;
        R.slump += ((T.hop >= 3 ? 1 : 0) - R.slump) * Math.min(1, dt * 5);   // settled: down on the corner that lost its wheel
        roll += (R.lostSide || 1) * 0.06 * R.slump; pitch += 0.03 * R.slump; }
      else yaw += cr.spin * Math.sin(p * Math.PI) * 1.4;
    }
    if (!cr || !cr.hard) R.slump = 0;
    crashScene(W, cr, T, dt, cx, cy, cz, heading, POS.y);
    player.position.y += lift;
    player.rotation.set(0, 0, 0); player.rotation.order = 'YXZ'; player.rotation.y = yaw; player.rotation.x = pitch; player.rotation.z = roll;
    R.wheelSpin += W.v * dt / 0.34;
    R.brakeK += (((W.v < R.lastV - 0.05 && !W.crash) || W.drift ? 1 : 0) - R.brakeK) * Math.min(1, dt * 12); R.lastV = W.v;
    CAR.brake.color.setScalar(1.05 + R.brakeK * 2.6);
    animateCouple(W, dt, t);
    wheels.forEach((w, i) => { if (w.parent !== player) return; w.rotation.order = 'YXZ'; w.rotation.y = i < 2 ? -W.steer * 0.42 + (W.drift ? W.drift * 0.25 : 0) : 0; w.rotation.x = -R.wheelSpin; });
    const sh = player.userData.shadow; sh.position.y = 0.05 - (W.h - E.heightAt(W, W.s)) - lift; sh.material.opacity = Math.max(0.15, 1 - (W.h - E.heightAt(W, W.s) + lift) * 0.2);
    // ---- the camera: behind and above, swinging round late, wider as you go faster
    R.crashK += ((cr && cr.hard ? 1 : 0) - R.crashK) * Math.min(1, dt * 2.5);
    const spd = W.v / E.VMAX, camDist = 4.4 + spd * 0.5 + R.crashK * 3.8, camH = 2.15 + spd * 0.2 + R.crashK * 1.7;   // high enough to see the road ahead over the two of you
    const yawTarget = travel * 0.55 + heading * 0.45;
    if (!R.camInit) { R.camYaw = yawTarget; }
    let dy = yawTarget - R.camYaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    R.camYaw += dy * Math.min(1, dt * (cr ? 1.5 : 5.5));
    const fx = Math.sin(R.camYaw), fz = -Math.cos(R.camYaw);
    // the camera rides on the road, not on the car: over a crest the car is seen to leave the ground
    const groundY = Math.max(E.heightAt(W, W.s), E.heightAt(W, W.s - camDist)) + (cy - W.h);
    R.camY = R.camInit ? R.camY + (groundY - R.camY) * Math.min(1, dt * 6) : groundY;
    V3.set(cx - fx * camDist, R.camY + camH, cz - fz * camDist);
    if (!R.camInit) { R.camPos.copy(V3); R.camInit = true; }
    R.camPos.lerp(V3, Math.min(1, dt * (cr ? (cr.hard ? 7 : 2) : 12)));   // a big crash: stay with the car as it tumbles away
    R.camPos.y = V3.y;
    camera.position.copy(R.camPos);
    if (W.shake > 0 && R.shakeOn !== false) camera.position.add(V4.set((Math.random() - 0.5) * W.shake * 0.02, (Math.random() - 0.5) * W.shake * 0.02, 0));
    V4.set(cx + fx * 12 * (1 - R.crashK * 0.9), R.camY + 1.55 + (cy - R.camY) * 0.35 + lift * 0.7 * R.crashK, cz + fz * 7 * (1 - R.crashK * 0.85));
    if (R.camShake > 0) { camera.position.add(V3.set((Math.random() - 0.5) * R.camShake, (Math.random() - 0.5) * R.camShake, (Math.random() - 0.5) * R.camShake)); R.camShake = Math.max(0, R.camShake - dt * 1.4); }
    camera.lookAt(V4);
    fill.position.copy(camera.position).add(V3.set(0, 0.6, 0)); fill.target.position.set(cx, cy + 1.62, cz);
    camera.rotation.z += POS.bank * 0.35 - W.steer * spd * 0.02;
    if (R.debugCam) { camera.position.set(cx + R.debugCam[0], cy + R.debugCam[1], cz + R.debugCam[2]); camera.lookAt(cx + R.debugCam[3], cy + (R.debugCam[5] || 0), cz + R.debugCam[4]); }
    camera.fov += ((53 + spd * 6 + (W.boosting ? 8 : 0)) - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix();
    // the sky things go round with the camera
    sky.position.copy(camera.position); stars.position.copy(camera.position);
    turnRing(W, dt); ringFar.position.set(camera.position.x, camera.position.y - (ringFar.userData.hz || 0) - 30, camera.position.z);
    sea.position.set(Math.round(camera.position.x / 100) * 100, 0, Math.round(camera.position.z / 100) * 100);
    seaNorm.offset.x = (t / 1000) * 0.012; seaNorm.offset.y = (t / 1000) * 0.008;
    foamTex.offset.x = Math.sin(t / 1300) * 0.12; foamTex.offset.y = t / 14000; foamMat.opacity = 0.75 + Math.sin(t / 1300 + 1.2) * 0.15;
    const sd = SU.sunDir.value;
    moon.position.copy(camera.position).addScaledVector(sd, 2000);
    { const LK = LOOK[R.lookKey] || {}, want = LK.rays && sd.y < 0.4 ? 0.8 * (1 - R.tunK) : 0; rays.material.opacity += (want - rays.material.opacity) * Math.min(1, dt * 2);
      rays.visible = rays.material.opacity > 0.01; if (rays.visible) { rays.position.copy(camera.position).addScaledVector(sd, 1900); rays.material.rotation = Math.sin(t / 9000) * 0.06; rays.material.color.copy(sun.color); } }
    { const LK = LOOK[R.lookKey] || {}, hh = Math.hypot(sd.x, sd.z) || 1, dx = sd.x / hh, dz = sd.z / hh;
      glint.visible = !!(LK.sea && (LK.night || (LK.glow >= 1.4 && !lit(LK)))); glint.material.color.set(LK.night ? '#dfe6ff' : '#ffb070'); glint.material.opacity = LK.night ? 1 : 0.85;
      if (glint.visible) { glint.scale.set(70, 1500, 1); glint.position.set(cx + dx * 830, 0.12, cz + dz * 830); glint.rotation.set(-Math.PI / 2, Math.atan2(-dx, -dz), 0); } }
    sun.position.set(cx + sd.x * 180, cy + sd.y * 180, cz + sd.z * 180); sun.target.position.set(cx, cy, cz);
    { const hx = Math.sin(heading), hz = -Math.cos(heading); headlight.position.set(cx + hx * 2.6, cy + 0.75, cz + hz * 2.6); carGlow.position.set(cx, cy + 5.5, cz); headlight.target.position.set(cx + hx * 34, cy, cz + hz * 34); }

    // ---- traffic
    const seen = new Set();
    for (const c of W.cars) {
      let m = traffic.get(c.id);
      if (!m) {
        const mm = MD.trafficModel(c.t, c.col); m = new THREE.Group();
        for (const k in mm) if (mm[k] && MAT[k]) { const mesh = new THREE.Mesh(mm[k], MAT[k]); mesh.castShadow = k !== 'glow'; m.add(mesh); }
        const V = E.VEH[c.t], blob = new THREE.Mesh(blobGeo, blobMat); blob.scale.set(V.w * 2.6, 1, V.l * 2.3); blob.position.y = 0.05; m.add(blob);
        if (V.rival) { const tg = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameGlow(), color: '#ff2a3a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.55 })); tg.scale.set(1.7, 0.55, 1); tg.position.set(0, 0.75, V.l + 0.15); m.add(tg); }   // its tail bar glows, so you can pick it out ahead
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
    let nc = 0, nn = 0; const PN = { magnet: 0, shield: 0, double: 0, time: 0 }, i0 = E.segIndex(W.s) - 2, i1 = E.segIndex(W.s + 420);
    for (let i = Math.max(W.base, i0); i <= Math.min(i1, E.lastIndex(W)); i++) {
      const g = E.segAt(W, i); if (!g.coins || i * SEG < W.s - 3) continue;   // the ones behind you are gone
      for (const cn of g.coins) {
        let up = 1.1, scl = 1;
        if (cn.got) { const gt = W.t - cn.got; if (gt > 6) continue; up += 1.2 + gt * 0.35; scl = 1 - gt / 7; }   // a caught one pops up a little and shrinks away (growing, it filled the camera)
        const pulled = cn.got && cn.gx != null && Math.abs(cn.x - cn.gx) > 2.2 ? Math.min(1, (W.t - cn.got) / 9) : 0;   // the magnet caught it: it flies across to you
        place(W, i * SEG, cn.x + (W.x - cn.x) * pulled, 0, POS);
        const big = cn.pw || cn.nitro ? 1.5 : 1;
        TMP.position.set(POS.x, POS.y + up + (big > 1 ? 0.25 : 0) + Math.sin(t / 300 + i) * 0.12, POS.z); TMP.rotation.set(0, t / 260 + i * 0.4, 0); TMP.scale.setScalar(scl * big); TMP.updateMatrix();
        if (cn.nitro) { if (nn < 40) nitros.setMatrixAt(nn++, TMP.matrix); }
        else if (cn.pw) { if (PN[cn.pw] < 40) PWMESH[cn.pw].setMatrixAt(PN[cn.pw]++, TMP.matrix); }
        else if (nc < 400) coins.setMatrixAt(nc++, TMP.matrix);
      }
    }
    coins.count = nc; nitros.count = nn; coins.instanceMatrix.needsUpdate = true; nitros.instanceMatrix.needsUpdate = true;
    for (const kk in PN) { PWMESH[kk].count = PN[kk]; PWMESH[kk].instanceMatrix.needsUpdate = true; }
    // the shield's bubble and the nitro's flames
    { const sl = W.pw ? W.pw.shield : 0; bubble.visible = sl > 0 && !W.crash; if (bubble.visible) { bubble.position.copy(player.position); bubble.position.y += 0.75; bubble.quaternion.copy(player.quaternion); bubble.material.uniforms.t.value = t / 1000; bubble.material.uniforms.a.value = sl < 120 ? (Math.floor(t / 110) % 2 ? 0.25 : 1) : 1; } }
    nitroLight.intensity = W.boosting ? 6 + Math.random() * 3 : 0;
    flames.forEach((f, q) => { f.visible = !!W.boosting; if (f.visible) { const fl = 0.85 + Math.random() * 0.3; f.scale.set(0.9 + Math.random() * 0.2, 0.9 + Math.random() * 0.2, fl * (0.6 + R.boostK * 0.5)); } });

    // ---- knocked-over things fly off; glows at night
    let ng = 0;
    for (const [, ch] of R.chunks) {
      ch.children.forEach((o) => { const it = o.userData.it; if (it && it.done) { const age = W.t - it.done; if (age > 50) o.visible = false; else { o.position.y += 0.25 - age * 0.012; o.rotation.x += 0.15; o.rotation.z += 0.1; } } });
      const Lp = ch.userData.lamps; if (Lp) for (let q = 0; q < Lp.length; q += 3) { if (ng >= 1200) break; glows.set(ng++, Lp[q], Lp[q + 1], Lp[q + 2], '#ffd98a', 1.5); }
    }
    glows.draw(ng);
    effects(W, t, dt, cx, cy, cz, heading, travel);
    flare(W); gulls(W, t, cx, cy, cz, fx, fz);
    if (W.banner && W.banner !== R.lastBanner) { R.lastBanner = W.banner; if (W.banner.kind === 'check' || W.banner.kind === 'goal' || W.banner.kind === 'go') confetti(cx, cy, cz, fx, fz, W.banner.kind === 'goal' ? 360 : 200); }
    { const LK = LOOK[R.lookKey] || {}; smoke.amb((1 - 0.62 * R.tunK) * (LK.night ? 0.42 : LK.dusk ? 0.72 : 1)); }   // smoke takes the light it's in
    smoke.update(dt); sparks.update(dt); updateShards(dt);
    // ---- draw: straight to the screen on a slow PC, otherwise through the glow, the grade and the blur
    R.boostK += ((W.boosting ? 1 : 0) - R.boostK) * Math.min(1, dt * 4); R.flash = Math.max(0, R.flash - dt * 2.2);
    if (R.low) renderer.render(scene, camera);
    else { GRADE_U.time.value = (t % 10000) / 1000; GRADE_U.blur.value = R.boostK * 0.3 + Math.max(0, W.v / E.VMAX - 0.88) * 1.1; GRADE_U.flash.value = R.flash * 0.5; composer.render(dt); }
    return renderer.domElement;
  }
  // the sun's glare: a chain of soft rings from the sun through the middle of the picture, hidden when a hill is in the way
  const FLARE = [[0, 3.2, '#fff4d8', 0.55], [0.35, 0.5, '#ffd27a', 0.22], [0.6, 0.9, '#ffc890', 0.1], [1.05, 0.35, '#ffb0a0', 0.16], [1.4, 1.4, '#ffd8a8', 0.06], [1.75, 0.6, '#ffe0a0', 0.15]];
  const flares = FLARE.map((f) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial(64, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.45)'], [0.75, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]), color: f[2], blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, fog: false })); sp.renderOrder = 20; sp.visible = false; scene.add(sp); return sp; });
  const RAY = new THREE.Raycaster(), SV = new THREE.Vector3(), SW = new THREE.Vector3();
  function flare(W) {
    const look = LOOK[R.lookKey] || {}, sd = SU.sunDir.value;
    let want = !R.low && !lit(look) && sd.y > 0.03 && R.tunK < 0.2 ? 1 : 0;
    SV.copy(camera.position).addScaledVector(sd, 1000).project(camera);
    if (SV.z > 1 || Math.abs(SV.x) > 1.25 || Math.abs(SV.y) > 1.25) want = 0;
    if (want && ++R.flareN % 6 === 0) {   // is a hill (or anything solid) in front of the sun?
      RAY.set(camera.position, sd); RAY.far = 1500; const hits = [];
      for (const [, ch] of R.chunks) if (ch.children[0]) hits.push(ch.children[0]);
      R.flareBlocked = RAY.intersectObjects(hits, false).length > 0;
    }
    if (R.flareBlocked) want = 0;
    R.flareK += (want - R.flareK) * 0.15;
    const edge = 1 - Math.min(1, Math.hypot(SV.x, SV.y) / 1.3);
    flares.forEach((sp, i) => {
      const f = FLARE[i], a = R.flareK * f[3] * (0.4 + edge * 0.6);
      sp.visible = a > 0.01; if (!sp.visible) return;
      SW.set(SV.x * (1 - f[0]), SV.y * (1 - f[0]), 0.5).unproject(camera).sub(camera.position).normalize();
      sp.position.copy(camera.position).addScaledVector(SW, 10); sp.scale.setScalar(f[1] * (i ? 1 : 1.4)); sp.material.opacity = a;
    });
  }
  // gulls wheeling over the sea side of the road
  const gullGeo = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.18, 0, 0, 0.22, 0.95, 0.12, 0.05, 0, 0, -0.18, 0.95, 0.12, 0.05, 0, 0, 0.22], 3)); g.computeVertexNormals(); return g; })();
  const gullMesh = new THREE.InstancedMesh(gullGeo, new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.7, side: THREE.DoubleSide }), 32); gullMesh.frustumCulled = false; gullMesh.count = 0; scene.add(gullMesh);
  const GM = new THREE.Object3D();
  function gulls(W, t, cx, cy, cz, fx, fz) {
    if (!R.gulls || R.low) { gullMesh.count = 0; return; }
    const sea = E.segAt(W, E.segIndex(W.s)).sea || 1, rx = -fz * sea, rz = fx * sea;
    const ox = cx + fx * 140 + rx * 70, oz = cz + fz * 140 + rz * 70; let n = 0;
    for (let i = 0; i < 16; i++) {
      const a = t / 3800 + i * 0.39 + Math.sin(i * 7.1) * 0.6, R2 = 26 + (i % 5) * 9, flap = Math.sin(t / (110 + (i % 4) * 25) + i) * 0.55;
      const x = ox + Math.cos(a) * R2, z = oz + Math.sin(a) * R2 * 0.6, y = cy + 22 + Math.sin(t / 900 + i) * 3 + (i % 3) * 5, head = Math.atan2(-Math.sin(a), Math.cos(a));
      for (const sdw of [-1, 1]) { GM.position.set(x, y, z); GM.rotation.set(0, head + Math.PI / 2, sdw * flap); GM.scale.set(sdw * 1.4, 1.4, 1.4); GM.updateMatrix(); gullMesh.setMatrixAt(n++, GM.matrix); }
    }
    gullMesh.count = n; gullMesh.instanceMatrix.needsUpdate = true;
  }
  function confetti(cx, cy, cz, fx, fz, n) {   // a shower of paper in all colours over the car
    const cols = ['#ff4d6d', '#ffd23f', '#3ec1ff', '#7cff8a', '#ffffff', '#ff9a3c', '#c77dff'];
    for (let i = 0; i < n; i++) smoke.emit(cx + fx * (6 + Math.random() * 20) + (Math.random() - 0.5) * 16, cy + 5 + Math.random() * 7, cz + fz * (6 + Math.random() * 20) + (Math.random() - 0.5) * 16,
      (Math.random() - 0.5) * 3, -0.5 - Math.random(), (Math.random() - 0.5) * 3, 0.16, 0.14, cols[i % cols.length], 1, 2.6 + Math.random() * 1.5, 0.9);
  }
  function gradeAt(W) { const a = E.heightAt(W, W.s + 2), b2 = E.heightAt(W, W.s - 2); return (a - b2) / 4; }

  // ---------------------------------------------------------------- smoke from the tyres, dust off the road, sparks, flames
  function effects(W, t, dt, cx, cy, cz, heading, travel) {
    const fx = Math.sin(heading), fz = -Math.cos(heading), rx = Math.cos(heading), rz = Math.sin(heading), len = carInfo ? carInfo.len : 2;
    const rear = (side) => [cx - fx * len * 0.62 + rx * side * 0.8, cy + 0.3, cz - fz * len * 0.62 + rz * side * 0.8];
    if (W.drift && !W.air) for (const sd of [-1, 1]) { const p = rear(sd); smoke.emit(p[0], p[1], p[2], (Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2, 1.2, 2.2, '#f2f2f2', 0.34, 1.5); }
    if (W.off && W.v > 8) { const p = rear(Math.random() < 0.5 ? -1 : 1), pal = PAL[E.segAt(W, E.segIndex(W.s)).st]; smoke.emit(p[0], p[1], p[2], -fx * W.v * 0.1, 1.5, -fz * W.v * 0.1, 1.2, 2.2, '#a89e88', 0.3, 1.3); }
    if (false) for (const sd of [-0.42, 0.42]) for (let q = 0; q < 1; q++) { const p = rear(sd); sparks.emit(p[0] - fx * 0.95, p[1] + 0.06, p[2] - fz * 0.95, -fx * (3 + Math.random() * 3) + (Math.random() - 0.5) * 0.5, 0.15, -fz * (3 + Math.random() * 3) + (Math.random() - 0.5) * 0.5, 0.34, 0.06, q ? '#8fd0ff' : (Math.random() < 0.5 ? '#ff9a3c' : '#4a9cff'), 1, 0.14); }
    if (W.drift && !R.wasDrift) for (const sd of [-0.9, 0.9]) for (let q = 0; q < 6; q++) { const p = rear(sd); smoke.emit(p[0], p[1], p[2], (Math.random() - 0.5) * 3, 1 + Math.random(), (Math.random() - 0.5) * 3, 0.9, 2.4, '#f4f4f4', 0.45, 1.3); }
    R.wasDrift = !!W.drift;
    // skid marks while drifting
    if (W.drift && !W.air) { const a = rear(-1), b = rear(1); skid.add(a, b, R.prevSkid); R.prevSkid = [a, b]; } else R.prevSkid = null;
    // what the rules say happened
    for (const f of W.fx) {
      if (f.n <= R.fxN) continue; R.fxN = f.n;
      const F = W.fork, b = F && F.s && E.segIndex(W.s) >= F.split ? F.s : 0; place(W, W.s + 1.5, f.x, b, POS);
      const x = POS.x, y = W.h + 0.8, z = POS.z;
      switch (f.k) {
        case 'coin': for (let i = 0; i < 10; i++) sparks.emit(x, y + 0.6, z, (Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 6, 0.25, 0.5, '#ffe066', 1, 0.6); break;
        case 'power': { const col = { magnet: '#ff5a5a', shield: '#ffd23f', double: '#f2e3b3', time: '#5dff9a' }[f.pw] || '#ffffff'; for (let i = 0; i < 26; i++) sparks.emit(x, y + 0.8, z, (Math.random() - 0.5) * 9, Math.random() * 7, (Math.random() - 0.5) * 9, 0.34, 0.6, col, 1, 0.8); R.flash = Math.max(R.flash, 0.2); break; }
        case 'smash': for (let i = 0; i < 30; i++) sparks.emit(x, y + 0.6, z, (Math.random() - 0.5) * 14, Math.random() * 8, (Math.random() - 0.5) * 14, 0.3, 0.6, i % 2 ? '#ffd23f' : '#ffffff', 1, 0.7, 9); R.camShake = Math.max(R.camShake || 0, 0.35); break;
        case 'nitro': for (let i = 0; i < 18; i++) sparks.emit(x, y + 0.6, z, (Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8, 0.3, 0.6, '#5aa9ff', 1, 0.7); R.flash = Math.max(R.flash, 0.25); break;
        case 'leaves': for (let i = 0; i < 26; i++) smoke.emit(x, y, z, (Math.random() - 0.5) * 8, 2 + Math.random() * 6, (Math.random() - 0.5) * 8, 0.25, 1.2, ['#3c8a3a', '#64b852', '#c8641e', '#ffd31a', '#e63946'][i % 5], 1, 0.3, 9); break;
        case 'bump': for (let i = 0; i < 14; i++) sparks.emit(x, y, z, (Math.random() - 0.5) * 8, Math.random() * 4, (Math.random() - 0.5) * 8, 0.18, 0.4, '#ffd27a', 1, 0.5, 9); break;
        case 'sparks': for (let i = 0; i < 8; i++) sparks.emit(x, y - 0.4, z, (Math.random() - 0.5) * 3 - Math.sin(heading) * 6, Math.random() * 3, (Math.random() - 0.5) * 3 + Math.cos(heading) * 6, 0.16, 0.35, '#ffd27a', 1, 0.4, 9); break;
        case 'crash':
          for (let i = 0; i < 30; i++) sparks.emit(x, y, z, (Math.random() - 0.5) * 12, Math.random() * 8, (Math.random() - 0.5) * 12, 0.3, 0.8, ['#ffb347', '#ff6a3d', '#ffe08a'][i % 3], 1, 0.7, 9);
          for (let i = 0; i < 24; i++) smoke.emit(x, y, z, (Math.random() - 0.5) * 4, 1 + Math.random() * 3, (Math.random() - 0.5) * 4, 1.5, 3, '#777777', 0.6, 1.8);
          R.flash = Math.max(R.flash, 0.5);
          break;
        case 'land': for (let i = 0; i < 14; i++) smoke.emit(x + (Math.random() - 0.5) * 2, W.h + 0.2, z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 6, 1, (Math.random() - 0.5) * 6, 1.2, 1.2, '#d8d0c0', 0.5, 1.4); break;
        case 'confetti': confetti(cx, cy, cz, Math.sin(heading), -Math.cos(heading), 300); break;
        case 'fireworks': for (let b2 = 0; b2 < 6; b2++) { const ox = x + Math.sin(heading) * 60 + (Math.random() - 0.5) * 60, oz = z - Math.cos(heading) * 60 + (Math.random() - 0.5) * 60, oy = W.h + 30 + Math.random() * 20, cc = ['#ff5a5f', '#ffd23f', '#5aa9ff', '#7cff8a'][b2 % 4]; for (let i = 0; i < 50; i++) { const a = Math.random() * 6.28, e = Math.random() * 3.14 - 1.57, sp = 10 + Math.random() * 6; sparks.emit(ox, oy, oz, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp, Math.sin(a) * Math.cos(e) * sp, 0.7, 1.6, cc, 1, 1.2, 3); } } break;
      }
    }
  }

  function reset(W) {
    restore(); R.crashObj = null; R.crashK = 0;
    R.W = W; R.poseHi = -1; R.camInit = false; FBC.clear(); R.tunK = 0; R.lastBanner = W.banner; R.fxN = W.fxN || 0; R.lookKey = ''; R.look = null; R.built = 0; R.stubKey = null; R.prevSkid = null; R.envDone = false; R.flash = 0;
    for (const [, ch] of R.chunks) dropChunk(ch); R.chunks.clear();
    R.stubs.forEach((m) => { scene.remove(m); m.geometry.dispose(); }); R.stubs = [];
    for (const [, m] of traffic) scene.remove(m); traffic.clear();
    smoke.clear(); sparks.clear(); skid.clear();
    if (W.segs.length && W.segs[0].i === 0) { W.segs[0].px = 0; W.segs[0].pz = 0; W.segs[0].th = 0; }
  }
  function setSize(w, h) { if (w === R.w && h === R.h) return; R.w = w; R.h = h; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function quality(low) {
    R.low = low; renderer.shadowMap.enabled = !low; sun.castShadow = !low; R.view = low ? 650 : E.VIEW; renderer.shadowMap.needsUpdate = true;
    skyMat.defines.OCT = low ? 3 : 5; skyMat.needsUpdate = true;
    for (const [, ch] of R.chunks) ch.userData.dirty = true;   // rebuilt with less far scenery
  }
  function warmUp() {
    if (R.warm) return; R.warm = true;
    const g = new THREE.Group(), box = new THREE.BoxGeometry(0.01, 0.01, 0.01), mats = [...Object.values(MAT), ...Object.values(CAR), roadMat, rumbleMat, slowMat, poolMat, groundMat, seaMat];
    for (const m of mats) if (m && m.isMaterial) g.add(new THREE.Mesh(box, m));
    g.position.set(0, -500, 0); scene.add(g);
    const hidden = [bubble, glint, ...flames, ...tailGlow, tailWash].filter(Boolean), was = hidden.map((o) => o.visible);
    hidden.forEach((o) => { o.visible = true; });
    const done = () => { scene.remove(g); hidden.forEach((o, i) => { o.visible = was[i]; }); R.warmed = true; };   // (the frame-rate watcher waits for this)
    try {   // for the picture as drawn through the glow and grade (into a render target: linear colour) and straight to the screen (a slow PC)
      const prev = renderer.getRenderTarget(); renderer.setRenderTarget(composer.readBuffer); renderer.compile(scene, camera); renderer.setRenderTarget(prev);
      if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(done, done); else { renderer.compile(scene, camera); done(); }
    } catch (e) { done(); }
    for (let tt = 0; tt < MD.TRAFFIC_ORDER.length; tt++) for (let cc = 0; cc < 6; cc++) MD.trafficModel(tt, cc);   // every car, van and bus built now, not as it first appears
    for (const m of mats) if (m && m.map) { try { renderer.initTexture(m.map); } catch (e) {} }
    for (const t of [flameMat.map, flameCore.map, rays.material.map, glint.material.map]) if (t) { try { renderer.initTexture(t); } catch (e) {} }
  }
  return { render: render, setSize: setSize, quality: quality, reset: () => { R.W = null; }, setShake: (on) => { R.shakeOn = on; }, renderer: renderer, scene: scene, camera: camera, debugCam: (v) => { R.debugCam = v; }, warmed: () => !!R.warmed };
}

// ---------------------------------------------------------------- textures made on the spot
function radial(size, stops) { const c = canvas(size, size), x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach((s) => g.addColorStop(s[0], s[1])); x.fillStyle = g; x.fillRect(0, 0, size, size); return tex(c); }
function roadTexture() {   // asphalt with the lane lines: across = the road's width, along = 9 metres
  const S = 1024, c = canvas(S, S), x = c.getContext('2d'), r = E.rnd(5);
  x.fillStyle = '#5c6066'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 70000; i++) { x.globalAlpha = 0.06 + r() * 0.16; x.fillStyle = r() < 0.5 ? '#50545a' : r() < 0.8 ? '#868a90' : '#9a9a96'; x.fillRect(r() * S, r() * S, 1 + r() * 2.5, 1 + r() * 2.5); }   // the stones in it
  for (let i = 0; i < 26; i++) { x.globalAlpha = 0.07 + r() * 0.05; x.fillStyle = '#34363a'; const w = 30 + r() * 90, h = 20 + r() * 110; x.fillRect(r() * S, r() * S, w, h); }   // patched repairs
  x.globalAlpha = 0.5; x.strokeStyle = '#3a3c40'; x.lineWidth = 1.4;
  for (let i = 0; i < 14; i++) { let px = r() * S, py = r() * S; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 40; py += r() * 40; x.lineTo(px, py); } x.stroke(); }   // cracks
  x.globalAlpha = 1;
  for (const u of [1 / 6, 1 / 2, 5 / 6]) { const g = x.createLinearGradient(S * (u - 0.07), 0, S * (u + 0.07), 0); g.addColorStop(0, 'rgba(30,30,34,0)'); g.addColorStop(0.5, 'rgba(30,30,34,0.28)'); g.addColorStop(1, 'rgba(30,30,34,0)'); x.fillStyle = g; x.fillRect(S * (u - 0.07), 0, S * 0.14, S); }   // the oily strip down each lane
  for (const u of [0.09, 0.25, 0.41, 0.59, 0.75, 0.91]) { x.fillStyle = 'rgba(30,32,36,0.2)'; x.fillRect(S * u - 14, 0, 28, S); }   // the tyres' darker tracks
  x.fillStyle = '#f6f6f2';
  for (const u of [1 / 3, 2 / 3]) x.fillRect(S * u - 10, 0, 20, S * 0.42);   // lane dashes
  x.fillRect(16, 0, 18, S); x.fillRect(S - 34, 0, 18, S);   // edge lines
  x.globalAlpha = 0.25; x.fillStyle = '#6c7076'; for (let i = 0; i < 2000; i++) x.fillRect(r() * S, r() * S, 2, 2);   // worn paint
  x.globalAlpha = 1;
  return tex(c, true);
}
function glintTexture() {   // broken flecks of moonlight: thick and bright towards the moon (the far end), sparse close by
  const W = 64, H = 512, c = canvas(W, H), x = c.getContext('2d'), r = E.rnd(57);
  for (let i = 0; i < 1400; i++) {
    const y = Math.pow(r(), 1.7) * H, f = y / H, spread = 5 + f * 22, g = (r() + r() + r() - 1.5) * spread;
    x.globalAlpha = (0.2 + r() * 0.5) * (1 - f * 0.8); x.fillStyle = '#ffffff'; x.fillRect(W / 2 + g - 1, y, 1.5 + r() * (4 + f * 6), 1 + f * 1.5);
  }
  return tex(c, false);
}
function raysTexture() {   // soft shafts radiating from the middle, fading out
  const S = 512, c = canvas(S, S), x = c.getContext('2d'), r = E.rnd(73);
  x.translate(S / 2, S / 2); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const a = (i + r() * 0.7) / 12 * Math.PI * 2, w = 0.035 + r() * 0.05, L = S * (0.3 + r() * 0.2), g = x.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L);
    g.addColorStop(0, 'rgba(255,255,255,' + (0.42 + r() * 0.25) + ')'); g.addColorStop(0.5, 'rgba(255,255,255,' + (0.14 + r() * 0.08) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a - w) * L, Math.sin(a - w) * L); x.lineTo(Math.cos(a + w) * L, Math.sin(a + w) * L); x.closePath(); x.fill();
  }
  const gl = x.createRadialGradient(0, 0, 0, 0, 0, S * 0.22); gl.addColorStop(0, 'rgba(255,255,255,0.35)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gl; x.fillRect(-S / 2, -S / 2, S, S);
  return tex(c, false);
}
function plateTexture() {   // a yellow rear plate: 365 CR
  const c = canvas(256, 56), x = c.getContext('2d');
  x.fillStyle = '#f7d417'; x.fillRect(0, 0, 256, 56); x.strokeStyle = '#1a1a1a'; x.lineWidth = 3; x.strokeRect(3, 3, 250, 50);
  x.fillStyle = '#111111'; x.font = '900 40px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('365 CR', 128, 30);
  const t = tex(c, false); return t;
}
let FGLOW = null;
let STARTEX = null;
function starTex() {   // a cartoon star, yellow with a white edge
  if (STARTEX) return STARTEX; const c = canvas(64, 64), x = c.getContext('2d'); x.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 12 : 28, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
  x.closePath(); x.fillStyle = '#ffd83a'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#fffbe8'; x.stroke(); return (STARTEX = tex(c, false));
}
function flameGlow() { if (FGLOW) return FGLOW; const c = canvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,200,120,0.6)'); g.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (FGLOW = tex(c, false)); }
function flameTexture() {   // a flame along its length: white-blue at the pipe, orange, then gone
  const W = 64, H = 256, c = canvas(W, H), x = c.getContext('2d');
  const g = x.createLinearGradient(0, H, 0, 0); g.addColorStop(0, 'rgba(210,235,255,1)'); g.addColorStop(0.18, 'rgba(90,170,255,0.95)'); g.addColorStop(0.45, 'rgba(255,170,60,0.75)'); g.addColorStop(1, 'rgba(255,90,20,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(W / 2, 0); x.quadraticCurveTo(W * 0.95, H * 0.55, W * 0.62, H); x.lineTo(W * 0.38, H); x.quadraticCurveTo(W * 0.05, H * 0.55, W / 2, 0); x.fill();
  return tex(c, false);
}
function slowTexture() {   // SLOW, as painted on the road: tall letters (they're read from a low angle, far off)
  const W = 256, H = 512, c = canvas(W, H), x = c.getContext('2d');
  x.fillStyle = 'rgba(246,246,240,0.92)'; x.font = '900 150px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.save(); x.translate(W / 2, H / 2); x.scale(0.62, 2.4); x.fillText('SLOW', 0, 2); x.restore();
  x.globalCompositeOperation = 'destination-out'; const r = E.rnd(61);
  for (let i = 0; i < 900; i++) { x.globalAlpha = 0.15 + r() * 0.4; x.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 2); }   // worn paint
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  const t = tex(c, false); t.anisotropy = 8; return t;
}
function stoneTexture() {   // coursed stone blocks (the texture's uv is in metres: one repeat = 6 m)
  const S = 256, c = canvas(S, S), x = c.getContext('2d'), r = E.rnd(29);
  x.fillStyle = '#d6cfbf'; x.fillRect(0, 0, S, S);
  const rows = 12, rh = S / rows;
  for (let j = 0; j < rows; j++) { let px = (j % 2) * 12 - 12; while (px < S) { const w = 22 + r() * 26, l = 175 + r() * 60; x.fillStyle = 'rgb(' + (l | 0) + ',' + ((l * 0.96) | 0) + ',' + ((l * 0.88) | 0) + ')'; x.fillRect(px + 1.2, j * rh + 1.2, w - 2.4, rh - 2.4); px += w; } }
  x.globalAlpha = 0.18; for (let i = 0; i < 3000; i++) { x.fillStyle = r() < 0.5 ? '#6a6458' : '#ffffff'; x.fillRect(r() * S, r() * S, 1.5, 1.5); }
  const t = tex(c, true); t.repeat.set(1 / 9, 1 / 9); return t;
}
function groundDetail() {   // a pale grain laid over the land's colours (grass blades, sand grains), the same everywhere
  const S = 256, c = canvas(S, S), x = c.getContext('2d'), r = E.rnd(17);
  x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const l = 175 + r() * 80, px = r() * S, py = r() * S, h = 3 + r() * 6, lean = (r() - 0.5) * 3;
    x.strokeStyle = 'rgba(' + (l | 0) + ',' + (l | 0) + ',' + (l | 0) + ',0.5)'; x.lineWidth = 1 + r();
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + lean, py - h); x.stroke();
    for (const o of [-S, S]) { if (px + o >= -10 && px + o <= S + 10) { x.beginPath(); x.moveTo(px + o, py); x.lineTo(px + o + lean, py - h); x.stroke(); } }
  }
  return tex(c, true);
}
function foamTexture() {   // white water: strongest at the water's edge (the middle, across), broken up along the shore
  const W = 64, H = 256, c = canvas(W, H), x = c.getContext('2d'), img = x.createImageData(W, H), r = E.rnd(23), bumps = [];
  for (let i = 0; i < 18; i++) bumps.push([r() * H, 6 + r() * 20, r()]);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = i / (W - 1); let n = 0; for (const b of bumps) { let dv = Math.abs(j - b[0]); dv = Math.min(dv, H - dv); n += Math.exp(-dv * dv / (b[1] * b[1])) * b[2]; }
    const band = Math.exp(-Math.pow((u - 0.55) / 0.18, 2)), lace = 0.5 + 0.5 * Math.sin(j * 0.31 + Math.sin(i * 0.4) * 2), a = clamp(band * (0.55 + n * 0.5) * (0.75 + lace * 0.25) + Math.exp(-Math.pow((u - 0.3) / 0.08, 2)) * 0.35 * lace, 0, 1);
    const k = (j * W + i) * 4; img.data[k] = 255; img.data[k + 1] = 255; img.data[k + 2] = 255; img.data[k + 3] = a * 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping; return t;
}
function waveNormals() {
  const size = 256, c = canvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size), r = E.rnd(11), W = [];
  for (let i = 0; i < 18; i++) W.push({ fx: Math.round(1 + r() * 9) * (r() < 0.5 ? -1 : 1), fy: Math.round(1 + r() * 10), a: 0.6 / (1 + i * 0.3), p: r() * 6.28 });
  const H = (u, v) => { let s = 0; for (const w of W) s += Math.sin((w.fx * u + w.fy * v) * Math.PI * 2 + w.p) * w.a; return s; };
  const e = 1 / size;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = i / size, v = j / size, dx = (H(u + e, v) - H(u - e, v)) * 2.4, dy = (H(u, v + e) - H(u, v - e)) * 2.4, n = Math.hypot(dx, dy, 1), k = (j * size + i) * 4;
    img.data[k] = (-dx / n * 0.5 + 0.5) * 255; img.data[k + 1] = (-dy / n * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / n * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function paintSign(key) {   // the faces of the signs: gates, direction boards, the split, the 365 boards, chevrons
  const parts = key.split('|'), kind = parts[0];
  const T = (x, s, cx, cy, size, fill, weight) => { x.font = (weight || 800) + ' ' + size + 'px ' + ART.FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = fill; let w = x.measureText(s).width, max = x.canvas.width * 0.9; if (w > max) { x.font = (weight || 800) + ' ' + (size * max / w) + 'px ' + ART.FONT; } x.fillText(s, cx, cy); };
  if (kind === 'gate') {
    const c = canvas(1024, 128), x = c.getContext('2d'), k = [['START', '#16233b'], ['ROUND', '#1d3557'], ['CHECKPOINT', '#6b4212'], ['GOAL', '#14532d']][+parts[1] % 4];
    x.fillStyle = k[1]; x.fillRect(0, 0, 1024, 128);
    x.fillStyle = '#e8dcc0'; x.fillRect(0, 10, 1024, 3); x.fillRect(0, 115, 1024, 3);   // fine cream rules
    for (const ex of [24, 1024 - 120]) for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#e8dcc0' : '#0d1422'; x.fillRect(ex + i * 16, 32 + j * 16, 16, 16); }   // a small chequer at each end
    x.save(); if ('letterSpacing' in x) x.letterSpacing = '14px'; T(x, k[0], 512, 66, 60, '#f2ead8', 700); x.restore(); return c;
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
  if (kind === 'banner') {
    const c = canvas(1024, 128), x = c.getContext('2d'), v = +parts[1] % 3;
    const bgc = ['#d32f2f', '#1d4ed8', '#0b1f3a'][v]; x.fillStyle = bgc; x.fillRect(0, 0, 1024, 128);
    x.fillStyle = '#ffffff'; x.fillRect(0, 8, 1024, 6); x.fillRect(0, 114, 1024, 6);
    T(x, ['365 COAST RUN', 'HAVE FUN \u00b7 DRIVE SAFELY', '365 TECHIES \u00b7 FRIENDLY LOCAL IT HELP'][v], 512, 66, 70, v === 2 ? '#ffb000' : '#ffffff');
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
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false, depthWrite: false })); p.renderOrder = -9; p.frustumCulled = false;
  return p;
}
const BLOB_FS = 'varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d,d) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(vC, vA * (1.0 - r) * (1.0 - r));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';
const PUFF_FS = 'uniform sampler2D puff; uniform float amb; varying vec3 vC; varying float vA; void main(){ vec4 t = texture2D(puff, gl_PointCoord); if (t.a < 0.02) discard; gl_FragColor = vec4(vC * amb * (0.72 + 0.4 * t.r), vA * t.a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';
let PUFF = null;
function puffTex() {   // a soft, lumpy puff of smoke (and a few hard-edged bits for confetti and debris don't use it)
  if (PUFF) return PUFF;
  const S = 128, c = canvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), r = E.rnd(41), blobs = [];
  for (let i = 0; i < 7; i++) blobs.push([S / 2 + (r() - 0.5) * S * 0.24, S / 2 + (r() - 0.5) * S * 0.24, S * (0.14 + r() * 0.1)]);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    let a = 0; for (const b of blobs) { const dd = Math.hypot(i - b[0], j - b[1]) / b[2]; a += Math.max(0, 1 - dd * dd) * 0.55; }
    const rr = Math.hypot(i - S / 2, j - S / 2) / (S / 2), fall = Math.max(0, 1 - rr * rr), k = (j * S + i) * 4, v = Math.min(1, a) * fall * fall;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = 190 + 65 * Math.min(1, a); img.data[k + 3] = v * 235;
  }
  x.putImageData(img, 0, 0); PUFF = new THREE.CanvasTexture(c); return PUFF;
}
const BLOB_VS = 'attribute float size; attribute float alpha; varying vec3 vC; varying float vA; uniform float scale; uniform vec4 fade; uniform float lift; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position + vec3(0.0, size * lift, 0.0), 1.0); float d = -mv.z; vA = alpha * smoothstep(fade.x, fade.y, d) * (1.0 - smoothstep(fade.z, fade.w, d)); gl_PointSize = min(size * scale / d, 260.0); gl_Position = projectionMatrix * mv; }';
function particles(n, add) {   // a pool of soft round blobs: smoke and dust (normal), sparks and flames (added light)
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n), P = [];
  for (let i = 0; i < n; i++) P.push({ life: 0, max: 0 });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('size', new THREE.BufferAttribute(size, 1)); g.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({ uniforms: { scale: { value: 600 }, puff: { value: add ? null : puffTex() }, amb: { value: 1 }, lift: { value: add ? 0 : 0.3 }, fade: { value: new THREE.Vector4(3, 10, 1e5, 1e6) } }, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, vertexShader: BLOB_VS, fragmentShader: add ? BLOB_FS : PUFF_FS, vertexColors: true });
  const points = new THREE.Points(g, mat); points.frustumCulled = false; points.renderOrder = 3;
  let next = 0;
  const C2 = new THREE.Color();
  return {
    points: points,
    emit(x, y, z, vx, vy, vz, s0, s1, hex, a0, life, grav) { const i = next; next = (next + 1) % n; const p = P[i]; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.s0 = s0; p.s1 = s1; p.a0 = !add && s1 > 1 ? Math.min(a0, 0.4) : a0; p.soft = !add && s1 > 1; p.life = 0; p.max = life; p.g = grav || 0; C2.set(hex); if (add) C2.multiplyScalar(2.2); col[i * 3] = C2.r; col[i * 3 + 1] = C2.g; col[i * 3 + 2] = C2.b; },
    update(dt) {
      for (let i = 0; i < n; i++) {
        const p = P[i];
        if (p.life >= p.max) { alpha[i] = 0; size[i] = 0; continue; }
        p.life += dt; const k = p.life / p.max; p.vy -= p.g * dt; p.vx *= 0.98; p.vz *= 0.98; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; size[i] = p.s0 + (p.s1 - p.s0) * (p.soft ? Math.sqrt(k) : k); alpha[i] = p.a0 * (1 - k) * (p.soft ? Math.min(1, k * 6) : 1);
      }
      g.attributes.position.needsUpdate = true; g.attributes.size.needsUpdate = true; g.attributes.alpha.needsUpdate = true; g.attributes.color.needsUpdate = true;
    },
    clear() { for (const p of P) p.life = p.max = 0; },
    amb(v) { mat.uniforms.amb.value = v; }
  };
}
function glowPoints(n) {   // halos round the lamps at night
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('size', new THREE.BufferAttribute(size, 1)); g.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({ uniforms: { scale: { value: 600 }, fade: { value: new THREE.Vector4(-1, 0, 70, 260) }, lift: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, vertexShader: BLOB_VS, fragmentShader: BLOB_FS });
  const points = new THREE.Points(g, mat); points.frustumCulled = false; points.renderOrder = 3;
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
  return { mesh: mesh, add(a, b, prev) { if (!prev || Math.hypot(a[0] - prev[0][0], a[2] - prev[0][2]) > 6) return; strip(prev[0], a, 0.14); strip(prev[1], b, 0.14); g.attributes.position.needsUpdate = true; }, clear() { pos.fill(0); g.attributes.position.needsUpdate = true; } };
}
