/* 365 Star Run - the 3D picture (rebuilt 27 Oct 2026 for the chapter game; reworked the same evening after the owner played it).
 * three.js r185 from ../common/vendor/ (shared with 365 Eclipse). Everything is built in code here - our own designs, no
 * bought-in or downloaded models or textures:
 *   THE VALLEY  - a winding red-rock canyon made along the chapter's route: layered strata (worked out per pixel), gullies and
 *                 ledges, a sandy floor with boulders, the plateau running off to distant mesas, a desert sky; a rock TUNNEL
 *                 lit by crystals in its walls; the DIVIDE, a long rock fin splitting the canyon; the sun's shadows.
 *   SPACE       - stars, a gas giant, a blue star, the Iron Moon far off, your CARRIER in the distance, and the enemy
 *                 WARSHIP: armoured hull, superstructure, a bridge tower, outriggers with four shield generators, fifteen
 *                 turrets that turn to track you, a main gun, a lit hangar, hundreds of hull details.
 *   Your fighter, the LANCER (four paint schemes); the raiders' DART interceptors and HEAVY fighters (gunmetal and crimson),
 *   the WARDEN gunship with its gun pods, engines and shielded core; drones, rim guns, gates, arches, pillars; enemy lasers
 *   you can see coming, missiles, flak, rockets; explosions made of fireballs, smoke, debris, sparks, a shockwave and a flash.
 *   Behind your ship, or (a setting) from its cockpit: a canopy frame and a lit dashboard. A glow (bloom) pass, filmic tone mapping.
 * 28 Oct 2026 (v18): the valley drops into a deep GORGE (its dark heart of schist streaked with pink granite, a RIVER down it), climbs out onto
 *   the open desert among BUTTES, rock arches and dust devils; rockfalls, a second fork, crashed Rook fighters; a VAPOUR CONE and a ring when you
 *   go through the sound barrier; the warship's belly - a keel with a track and her KEEL GUN on it, radiators, floodlights, more guns.
 * 29 Oct (v27): the valley runs through different LANDS - desert canyon, a green river gorge with waterfalls, open highlands, pine canyon, burnt woods,
 *   a salt pan - with woods, grass and flowers, birds that burst up as you come, hawks circling, a murmuration, wild horses, deer, fires.
 * 29 Oct (v19), the owner: "put the resolution, the detail up ... a lot sharper and ... more cinematic". The 3D is drawn at as many pixels as the
 *   PC keeps smooth (starrun.js decides, up to the screen's own) and brought up to the screen sharply (Catmull-Rom, then a sharpen that cannot ring);
 *   a film grade (cool shadows, warm highlights), anamorphic streaks off bright lights, motion blur at speed, finer grain; 4096 shadows; textures
 *   filtered at the card's best angle.
 *
 * The camera is the engine's own (SREngine: x right, y up, z ahead) turned into three.js terms (z flipped, Euler YXZ =
 * pitch, -yaw, -roll) with the same off-centre projection (W.focal, CX, CY - it widens when you boost), so a shot aimed at a
 * ship on the screen is aimed at the ship the rules test. starrun.js puts this picture on the screen and draws the panel. */
import * as THREE from '../common/vendor/three-r185/three.module.min.js';

const E = window.SREngine;
const GW = E.GW, GH = E.GH, CX = E.CX, CY = E.CY, FOCAL = E.FOCAL;

export function createSR3D() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false }); } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  let W0 = 640, H0 = 480, low = !renderer.capabilities.isWebGL2;

  const scene = new THREE.Scene();
  // (v29, 29 Oct; the owner: "even better ... more realistic and better effects") CLOUD SHADOWS: big soft patches of shade lying across the valley
  // - the land, the walls, the trees, your ship - as under a real sky of broken cloud. Worked out per pixel inside three's own sunlight, only where
  // there is fog (the valley; never in space). World position from the view position: the view matrix's rotation, transposed, plus the camera.
  if (!THREE.ShaderChunk.lights_pars_begin.includes('srCloud')) {
    THREE.ShaderChunk.lights_pars_begin = [
      'float srCH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float srCN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(srCH(i), srCH(i + vec2(1.0, 0.0)), f.x), mix(srCH(i + vec2(0.0, 1.0)), srCH(i + vec2(1.0, 1.0)), f.x), f.y); }',
      'float srCloud(vec3 vp){',
      '#ifdef USE_FOG',
      '  vec3 wp = (vec4(vp, 0.0) * viewMatrix).xyz + cameraPosition; vec2 p = wp.xz * 0.0011 + vec2(3.1, 7.7);',
      '  float n = srCN(p) * 0.55 + srCN(p * 2.1 + 5.2) * 0.3 + srCN(p * 4.3 + 1.3) * 0.15;',
      '  return 1.0 - 0.62 * smoothstep(0.5, 0.7, n);',
      '#else',
      '  return 1.0;',
      '#endif',
      '}', ''].join('\n') + THREE.ShaderChunk.lights_pars_begin;   // (in front of three's own: its text ends inside an #ifdef, with no newline)
    THREE.ShaderChunk.lights_fragment_begin = THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= srCloud( geometryPosition );');
  }
  const cam = new THREE.PerspectiveCamera(60, GW / GH, 0.3, 12000);
  cam.rotation.order = 'YXZ';
  let curFocal = FOCAL;
  let OX = 0;   // a wide screen: how far the picture reaches beyond the game's own 400 x 300 on each side (the middle is unchanged)
  function setProj(f) {   // the engine's off-centre projection
    const n = cam.near;
    curFocal = f;
    cam.projectionMatrix.makePerspective(-(CX + OX) / f * n, (GW + OX - CX) / f * n, CY / f * n, -(GH - CY) / f * n, n, cam.far);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  }
  setProj(FOCAL);
  scene.add(cam);

  // ---------------------------------------------------------------- small helpers: canvases, random numbers, noise
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const MAXANI = Math.max(4, Math.min(16, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4));
  function tex(c, srgb) { const t = new THREE.CanvasTexture(c); if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAXANI; return t; }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function hash2(x, y) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, o) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < (o || 4); i++) { s += a * vnoise(x * f + i * 17.3, y * f - i * 9.1); n += a; f *= 2.03; a *= 0.5; } return s / n; }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // the valley's rock colours: a sandy floor, the plateau on top (the strata in the walls: COLUMN, below)
  const SAND = new THREE.Color('#c9915f'), TOP = new THREE.Color('#b8784c'), TOP2 = new THREE.Color('#99603d'), TOP3 = new THREE.Color('#d2a273'), SHADE = new THREE.Color(0.46, 0.5, 0.68);
  // the rock column of a real desert canyon, floor to rim (heights above the floor): dark inner-gorge rock, brown sandstone, a grey-green shale slope,
  // a red-stained limestone cliff, red ledges and slopes, an orange shale, a pale sandstone cliff, a grey-buff cap. The shader below has the same.
  const COLUMN = [[0, '#4a3f3c'], [7, '#7d5a44'], [14, '#8a8670'], [23, '#a0553b'], [36, '#b0603f'], [50, '#b8603c'], [57, '#e0cfa8'], [65, '#bfae92']];
  const SOFT = [[14, 23, 3.5], [36, 50, 4.5], [50, 57, 2.5]];   // the soft layers weather back into slopes: [from, to, how far back]
  function stepBack(hh) { let x = 0; for (let i = 0; i < SOFT.length; i++) x += SOFT[i][2] * smooth(SOFT[i][0], SOFT[i][1], hh); return x; }
  function strata(h, s, out) {   // the rock's colour at a height (boulders and broken rock)
    let i = COLUMN.length - 1; while (i > 0 && h < COLUMN[i][0]) i--;
    return out.set(COLUMN[i][1]).multiplyScalar(0.9 + fbm(s * 0.01, h * 0.1, 2) * 0.2);
  }
  function topCol(x, z, out) { const n = fbm(x * 0.005 + 7, z * 0.005, 3); out.copy(TOP).lerp(n < 0.5 ? TOP2 : TOP3, Math.abs(n - 0.5) * 1.7); out.multiplyScalar(0.88 + vnoise(x * 0.06, z * 0.06) * 0.2); return bioCol(x, z, out, false); }
  // (v27, 29 Oct; the owner: "it's just like a rocky valley ... a bit boring, all the same ... places where there's trees or green grass and different
  // sceneries ... some activity ... maybe there's animals") THE LANDS the valley runs through, by distance ahead (f = z / 260, as the engine lays it
  // out): the red desert canyon; over the drop into a GREEN GORGE (the river feeds moss, ferns and cottonwoods; waterfalls off the rim); out of the
  // tunnel onto the HIGHLANDS (grass, wild flowers, woods, wild horses); the plunge into PINE CANYON (grey granite, pines, golden aspens, deer); the
  // BURNT WOODS the Rooks set alight (still smouldering); the Gaoler's white SALT PAN. Columns: f, green, pine, burnt, salt. The rock shader reads
  // the same table from a texture (BIOT), so the walls, the buttes and the land all agree.
  const BIO = [[0, 0, 0, 0, 0], [21.3, 0, 0, 0, 0], [23.4, 1, 0, 0, 0], [42.4, 1, 0, 0, 0], [44, 0.45, 0, 0, 0], [55, 0.45, 0, 0, 0], [59.5, 1, 0.3, 0, 0], [85.2, 1, 0.3, 0, 0],
    [88.4, 0.55, 1, 0, 0], [107, 0.55, 1, 0, 0], [110.8, 0, 0, 1, 0], [133.6, 0, 0, 1, 0], [136.4, 0, 0, 0, 1], [158.5, 0, 0, 0, 1], [162, 0, 0, 0, 0]];
  const BW = [0, 0, 0, 0];
  function bioAt(z) {   // the lands' mix at a distance ahead (the engine's z) -> BW: green, pine, burnt, salt
    const f = z / 260; let i = 1; while (i < BIO.length - 1 && f > BIO[i][0]) i++;
    const a = BIO[i - 1], b = BIO[i], t = smooth(a[0], b[0], f);
    for (let k = 0; k < 4; k++) BW[k] = a[k + 1] + (b[k + 1] - a[k + 1]) * t;
    return BW;
  }
  const BIOT = (function () { const n = 1024, d = new Uint8Array(n * 4); for (let i = 0; i < n; i++) { bioAt(i / (n - 1) * 180 * 260); for (let k = 0; k < 4; k++) d[i * 4 + k] = Math.round(BW[k] * 255); } const t = new THREE.DataTexture(d, n, 1); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t; })();
  const GRASS = [new THREE.Color('#6f9a3c'), new THREE.Color('#4f7d2e'), new THREE.Color('#93a84a')], FOREST = [new THREE.Color('#3f5f2c'), new THREE.Color('#5b5a36')], ASH = [new THREE.Color('#3a3532'), new THREE.Color('#5e5853')], SALT = new THREE.Color('#e6e0d4');
  const BC = new THREE.Color(), BC2 = new THREE.Color();
  function bioCol(x, z, out, floor) {   // the land's colour where the lands change it (out comes in as the desert's colour)
    bioAt(z); const g = BW[0], p = BW[1], b = BW[2], s = floor ? BW[3] : 0, sum = g + p + b + s; if (sum < 0.002) return out;
    const n = fbm(x * 0.007 + 3.1, z * 0.007, 3), m = vnoise(x * 0.05, z * 0.05);
    BC.setRGB(0, 0, 0);
    if (g > 0) BC.add(BC2.copy(GRASS[0]).lerp(n < 0.5 ? GRASS[1] : GRASS[2], Math.abs(n - 0.5) * 1.8).multiplyScalar(g * (0.88 + m * 0.24)));
    if (p > 0) BC.add(BC2.copy(FOREST[0]).lerp(FOREST[1], n).multiplyScalar(p * (0.85 + m * 0.3)));
    if (b > 0) BC.add(BC2.copy(ASH[0]).lerp(ASH[1], Math.min(1, n * m * 1.5)).multiplyScalar(b));
    if (s > 0) BC.add(BC2.copy(SALT).multiplyScalar(s * (0.95 + m * 0.08)));
    out.lerp(BC.multiplyScalar(1 / sum), Math.min(1, sum));
    if (!floor && p > 0.6) out.lerp(SNOWC, smooth(0.6, 0.95, p) * smooth(0.32, 0.56, fbm(x * 0.012 + 4.4, z * 0.012, 3)) * 0.92);   // (v28) snow lying on pine canyon's rims
    return out;
  }
  function bioRock(z, c, k) {   // a boulder's colour: granite grey in pine canyon, mossy where it is green, sooty in the burnt woods, salt-crusted on the pan
    bioAt(z); const g = Math.min(1, BW[0] + BW[1]);
    if (BW[1] > 0) c.lerp(BC2.setRGB(0.36, 0.36, 0.34), BW[1] * 0.75);
    if (g > 0) c.lerp(BC2.setRGB(0.07, 0.12, 0.035), g * 0.5 * k);
    if (BW[2] > 0) c.multiplyScalar(1 - BW[2] * 0.6);
    if (BW[3] > 0) c.lerp(BC2.setRGB(0.62, 0.59, 0.53), BW[3] * 0.45);
    return c;
  }
  function bioBush(z, c, k) {   // a bush's or a tuft's colour: green where it is green, charred in the burnt woods, bleached on the salt
    bioAt(z); const g = Math.min(1, BW[0] + BW[1]); if (g + BW[2] + BW[3] < 0.02) return c;
    if (g > 0) c.lerp(BC2.setHSL(0.24 + k * 0.08, 0.42 + k * 0.2, 0.2 + k * 0.12, THREE.SRGBColorSpace), g);
    if (BW[2] > 0) c.lerp(BC2.setRGB(0.025, 0.022, 0.02), BW[2]);
    if (BW[3] > 0) c.lerp(BC2.setRGB(0.42, 0.4, 0.36), BW[3] * 0.8);
    return c;
  }
  function topY(V, x, z, far) { return carve(x, z, V.ground(z) + 56 + (fbm(x * 0.0035, z * 0.0035, 3) - 0.5) * 70 * far + (vnoise(x * 0.04, z * 0.04) - 0.5) * 3); }
  // (v28) places cut into the land: the highlands' LAKE and the salt pan's POOLS (the land dips under their water), the FARM's yard (levelled)
  const SITES = [], SNOWC = new THREE.Color(0.86, 0.89, 0.95);
  function siteAt(q, x, z) { const dx = x - q.x, dz = z - q.z; if (dx * dx + dz * dz > q.R2) return -1; const u = (dx * q.fx + dz * q.fz) / q.el, v = dx * q.rx + dz * q.rz, a = Math.atan2(v, u); q.rr = q.r * (0.82 + 0.36 * vnoise(Math.cos(a) * 2 + q.n, Math.sin(a) * 2 + 9)); return Math.hypot(u, v); }
  function carve(x, z, y) {
    for (let i = 0; i < SITES.length; i++) {
      const q = SITES[i], d = siteAt(q, x, z); if (d < 0) continue;
      if (q.k === 'flat') y = q.y + (y - q.y) * smooth(q.rr * 0.7, q.rr * 1.25, d);
      else y = Math.min(y, q.y - q.dep + smooth(q.rr * 0.85, q.rr * 1.3, d) * 90);
    }
    return y;
  }
  function siteHit(x, z, pad) { for (let i = 0; i < SITES.length; i++) { const q = SITES[i], d = siteAt(q, x, z); if (d >= 0 && d < q.rr * (q.k === 'flat' ? 1 : 1.02) + pad) return true; } return false; }
  function inWater(x, z) { for (let i = 0; i < SITES.length; i++) { const q = SITES[i]; if (q.k === 'flat') continue; const d = siteAt(q, x, z); if (d >= 0 && d < q.rr * 0.95) return q; } return null; }
  function planSites(W, floorOf) {
    SITES.length = 0; const R = W.rail, V = W.valley, sec = V.sec; if (!sec || sec.mesa == null || !V.sAtF) return;
    const mk = (k, s2, lc, r, el, dep, extra) => { const F = E.frame(R, s2); return Object.assign({ k, s: s2, x: F.x + F.rx * lc, z: F.z + F.rz * lc, fx: F.fx, fz: F.fz, rx: F.rx, rz: F.rz, r, el, dep, n: SITES.length * 3.7 + 1, R2: Math.pow(r * el * 1.6 + 10, 2), rr: r }, extra || {}); };
    if (W.farm) { const f = W.farm, F = E.frame(R, f.rs), hw = V.width(f.rs) / 2, X = F.x + F.rx * f.lx, Z = F.z + F.rz * f.lx; SITES.push(mk('flat', f.rs, f.lx, 190, 1.25, 0, { y: topY(V, X, Z, clamp((Math.abs(f.lx) - hw - 30) / 160, 0, 1)) })); }
    // the lake: on the open highlands, under the way through, clear of every butte, arch and pillar, nearest the middle of the highlands
    const blocks = (s2, lc) => W.objs.some((o) => (o.k === 'butte' || o.k === 'natarch' || o.k === 'pillar' || o.k === 'rockfall' || (o.k === 'turret' && o.top)) && Math.abs(o.rs - s2) < 110 * 1.5 + 80 && Math.abs(o.lx - lc) < 110 + (o.pr || o.span / 2 || 12) + 18);
    let best = null; const mid = (sec.mesa + sec.plunge) / 2;
    for (let s2 = sec.mesa + 700; s2 < sec.plunge - 900; s2 += 100) [-1, 1].forEach((sd) => {
      const lc = sd * (V.width(s2) / 2 + 30);   // (its near shore well inside the way through: skim it at the side)
      if (blocks(s2, lc) || (W.farm && Math.abs(W.farm.rs - s2) < 900)) return;
      if (!best || Math.abs(s2 - mid) < Math.abs(best[0] - mid)) best = [s2, lc];
    });
    if (best) { let lo = 1e9; for (let k = -200; k <= 200; k += 20) lo = Math.min(lo, floorOf(E.frame(R, best[0] + k).z)); SITES.push(mk('lake', best[0], best[1], 110, 1.5, 3.2, { y: lo - 1.0 })); }
    // the salt pools: pink with the salt's algae (one a clear blue-green), shallow
    [[139, -1, 34, true], [144.5, 1, 26, true], [150, -1, 40, false], [155.5, 1, 30, true]].forEach((p) => { const s2 = V.sAtF(p[0]), F = E.frame(R, s2); SITES.push(mk('pool', s2, p[1] * V.width(s2) / 2 * 0.42, p[2], 1.5, 1.2, { y: floorOf(F.z) - 0.25, pink: p[3] })); });
  }

  // ---------------------------------------------------------------- textures painted on the spot
  function glowTex(inner, mid, outer) {   // a soft round glow
    const c = canvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner); g.addColorStop(0.25, mid); g.addColorStop(1, outer); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return tex(c);
  }
  function fireTex(seed) {   // a lumpy fireball: hot white middle, yellow, orange, ragged red edge
    const c = canvas(128, 128), x = c.getContext('2d'), r = rng(seed);
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.28, d = r() * 26, px = 64 + Math.cos(a) * d, py = 64 + Math.sin(a) * d, rad = 18 + r() * 30;
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, 'rgba(255,250,220,0.55)'); g.addColorStop(0.35, 'rgba(255,190,60,0.4)'); g.addColorStop(0.7, 'rgba(230,70,20,0.18)'); g.addColorStop(1, 'rgba(120,20,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, 6.3); x.fill();
    }
    return tex(c);
  }
  function smokeTex(seed) {
    const c = canvas(128, 128), x = c.getContext('2d'), r = rng(seed);
    for (let i = 0; i < 22; i++) {
      const a = r() * 6.28, d = r() * 28, px = 64 + Math.cos(a) * d, py = 64 + Math.sin(a) * d, rad = 16 + r() * 28, v = 90 + r() * 60 | 0;
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, `rgba(${v},${v},${v + 8},0.32)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, 6.3); x.fill();
    }
    return tex(c);
  }
  function starTex() {   // a plasma star: eight spikes, magenta outside, yellow in, white core
    const c = canvas(128, 128), x = c.getContext('2d');
    x.translate(64, 64); x.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 8; k++) {
      x.rotate(Math.PI / 4); const L = k % 2 ? 40 : 60;
      const g = x.createLinearGradient(0, 0, L, 0); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,90,240,0.9)'); g.addColorStop(1, 'rgba(255,40,230,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(0, -5); x.lineTo(L, 0); x.lineTo(0, 5); x.fill();
    }
    const g2 = x.createRadialGradient(0, 0, 0, 0, 0, 26); g2.addColorStop(0, 'rgba(255,255,255,1)'); g2.addColorStop(0.35, 'rgba(255,240,120,0.9)'); g2.addColorStop(1, 'rgba(255,60,220,0)');
    x.fillStyle = g2; x.beginPath(); x.arc(0, 0, 26, 0, 6.3); x.fill();
    return tex(c);
  }
  function skyTex() {   // deep space: dark blue to violet, soft nebula clouds, a scatter of stars
    const w = 2048, h = 1024, c = canvas(w, h), x = c.getContext('2d'), r = rng(7);
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#02030a'); g.addColorStop(0.5, '#060818'); g.addColorStop(1, '#030208'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    const clouds = [[0.18, 0.42, '120,40,170'], [0.3, 0.55, '40,90,200'], [0.62, 0.36, '200,60,120'], [0.75, 0.6, '40,140,170'], [0.9, 0.45, '90,50,190']];
    clouds.forEach((cl) => { for (let i = 0; i < 70; i++) { const px = (cl[0] + (r() - 0.5) * 0.22) * w, py = (cl[1] + (r() - 0.5) * 0.3) * h, rad = 30 + r() * 140, a = 0.03 + r() * 0.04;
      [px, px - w, px + w].forEach((qx) => { if (qx + rad < 0 || qx - rad > w) return; const gg = x.createRadialGradient(qx, py, 0, qx, py, rad); gg.addColorStop(0, `rgba(${cl[2]},${a})`); gg.addColorStop(1, `rgba(${cl[2]},0)`); x.fillStyle = gg; x.beginPath(); x.arc(qx, py, rad, 0, 6.3); x.fill(); }); } });   // (a cloud that crosses an edge is drawn again across the other: the sky wraps with no seam)
    for (let i = 0; i < 2600; i++) { const v = 150 + r() * 105 | 0, s = r() < 0.04 ? 1.6 : 0.8; x.fillStyle = `rgba(${v},${v},255,${0.5 + r() * 0.5})`; x.fillRect(r() * w, r() * h, s, s); }
    return tex(c);
  }
  function moonTex() {   // the Iron Moon's armour: grey panels, darker seams, a band of trenches, lights in the gaps
    const w = 1024, h = 512, c = canvas(w, h), x = c.getContext('2d'), r = rng(11);
    const e = canvas(w, h), ex = e.getContext('2d'); ex.fillStyle = '#000'; ex.fillRect(0, 0, w, h);
    x.fillStyle = '#6b7079'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 1300; i++) { const pw = 5 + r() * 35, ph = 3 + r() * 17, px = r() * w, py = r() * h, v = 80 + r() * 70 | 0; x.fillStyle = `rgb(${v},${v + 4},${v + 10})`; x.fillRect(px, py, pw, ph); }
    x.fillStyle = 'rgba(18,20,26,0.95)'; x.fillRect(0, h * 0.495, w, 5);
    for (let i = 0; i < 900; i++) { ex.fillStyle = r() < 0.7 ? 'rgba(255,214,150,1)' : 'rgba(150,220,255,1)'; ex.fillRect(r() * w, r() * h, 1.5, 1.5); }
    for (let k = 0; k < 7; k++) { x.fillStyle = 'rgba(25,27,34,0.8)'; x.fillRect(0, h * (0.14 + k * 0.12), w, 2); }
    return { map: tex(c), emissive: tex(e) };
  }
  function ringTex() {
    const c = canvas(1024, 8), x = c.getContext('2d'), r = rng(3);
    for (let i = 0; i < 1024; i++) { const a = 0.25 + 0.6 * Math.abs(Math.sin(i * 0.05)) * r(); x.fillStyle = `rgba(255,${190 + r() * 40 | 0},${100 + r() * 60 | 0},${a})`; x.fillRect(i, 0, 1, 8); }
    return tex(c);
  }
  function grainTex() {   // rock grain for the canyon: blotches, pits and fine cracks around a light grey (it tints the rock's colour)
    const N = 512, c = canvas(N, N), x = c.getContext('2d'), r = rng(31);
    x.fillStyle = '#e4e4e4'; x.fillRect(0, 0, N, N);
    for (let i = 0; i < 900; i++) { const v = 170 + r() * 85 | 0, rad = 3 + r() * 26; x.fillStyle = `rgba(${v},${v},${v},0.35)`; x.beginPath(); x.ellipse(r() * N, r() * N, rad, rad * (0.3 + r() * 0.7), r() * 3, 0, 6.3); x.fill(); }
    for (let i = 0; i < 5000; i++) { const v = 120 + r() * 135 | 0; x.fillStyle = `rgba(${v},${v},${v},0.55)`; x.fillRect(r() * N, r() * N, 1 + r() * 2, 1 + r() * 2); }
    x.strokeStyle = 'rgba(70,70,70,0.45)'; x.lineWidth = 1;
    for (let i = 0; i < 60; i++) { let px = r() * N, py = r() * N; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 40; py += r() * 22; x.lineTo(px, py); } x.stroke(); }
    const t2 = tex(c); t2.wrapS = t2.wrapT = THREE.RepeatWrapping; t2.anisotropy = MAXANI; return t2;
  }
  function mesaTex() {   // far-off mesas and buttes round the horizon: talus slopes, a cliff band, a flat cap, in layers of haze
    const w = 4096, h = 512, c = canvas(w, h), x = c.getContext('2d'), r = rng(57);
    [[[214, 186, 176], [196, 166, 160], 0.66, 0.3], [[186, 146, 132], [170, 128, 118], 0.74, 0.36], [[160, 112, 94], [140, 96, 82], 0.83, 0.3]].forEach((L) => {
      const g = x.createLinearGradient(0, h * (L[2] - L[3]), 0, h); g.addColorStop(0, 'rgb(' + L[1].join(',') + ')'); g.addColorStop(1, 'rgb(' + L[0].join(',') + ')');
      x.fillStyle = g; x.beginPath(); x.moveTo(0, h);
      let px = 0; const base = h * L[2]; x.lineTo(0, base);
      while (px < w) {
        if (r() < 0.35) { px += 40 + r() * 160; x.lineTo(px, base - r() * 10); continue; }   // open ground
        const W2 = 70 + r() * 360, H2 = h * L[3] * (0.35 + r() * 0.65), tal = W2 * (0.16 + r() * 0.12), cliff = H2 * (0.45 + r() * 0.25), top = base - H2;
        x.lineTo(px + tal * 0.5, base - (H2 - cliff) * 0.35); x.lineTo(px + tal, base - (H2 - cliff)); x.lineTo(px + tal + 3 + r() * 6, top + r() * 4);
        for (let q = 0.2; q < 1; q += 0.2) x.lineTo(px + tal + (W2 - 2 * tal) * q, top + (r() - 0.5) * 4);
        x.lineTo(px + W2 - tal - 3 - r() * 6, top + r() * 4); x.lineTo(px + W2 - tal, base - (H2 - cliff)); x.lineTo(px + W2 - tal * 0.5, base - (H2 - cliff) * 0.35); x.lineTo(px + W2, base);
        px += W2;
      }
      x.lineTo(w, base); x.lineTo(w, h); x.closePath(); x.fill();
    });
    const t2 = tex(c); t2.wrapS = THREE.RepeatWrapping; t2.repeat.set(2, 1); return t2;
  }
  function deckTex() {   // the carrier's flight deck: dark plates, a centre line, edge lights and landing marks
    const w = 256, h = 1536, c = canvas(w, h), x = c.getContext('2d'), e = canvas(w, h), ex = e.getContext('2d'), r = rng(77);
    x.fillStyle = '#3a3f47'; x.fillRect(0, 0, w, h); ex.fillStyle = '#000'; ex.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { const v = 50 + r() * 22 | 0; x.fillStyle = `rgb(${v},${v + 3},${v + 8})`; x.fillRect((r() * 8 | 0) * 32, (r() * 48 | 0) * 32, 32, 32); }
    x.strokeStyle = 'rgba(15,17,20,0.8)'; x.lineWidth = 1.5; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, h); x.stroke(); }
    for (let j = 0; j <= 48; j++) { x.beginPath(); x.moveTo(0, j * 32); x.lineTo(w, j * 32); x.stroke(); }
    x.fillStyle = '#d8b440'; for (let j = 40; j < h - 40; j += 60) x.fillRect(w / 2 - 3, j, 6, 32);
    x.fillStyle = '#e8e8e8'; [[0.12, 1], [0.88, 1]].forEach((q) => { for (let j = 0; j < 6; j++) x.fillRect(q[0] * w - 2, 120 + j * 22, 4, 14); });
    for (let j = 10; j < h; j += 24) { ex.fillStyle = j % 72 < 24 ? '#ffffff' : '#ffcf7a'; ex.fillRect(6, j, 4, 4); ex.fillRect(w - 10, j, 4, 4); }
    for (let j = 300; j < 700; j += 20) { ex.fillStyle = '#3fd8ff'; ex.fillRect(w / 2 - 2, j, 4, 4); }
    return { map: tex(c), emissive: tex(e) };
  }
  function windowsTex() {   // rows of lit windows down a hull
    const w = 2048, h = 32, c = canvas(w, h), x = c.getContext('2d'), r = rng(91);
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 6) if (r() < 0.62) { x.fillStyle = r() < 0.85 ? '#ffd9a0' : '#bfe6ff'; x.fillRect(i, 8 + (r() < 0.5 ? 0 : 12), 3, 5); }
    return tex(c);
  }
  const T = { glowC: glowTex('rgba(200,255,255,1)', 'rgba(60,220,255,0.6)', 'rgba(0,120,255,0)'), glowO: glowTex('rgba(255,255,220,1)', 'rgba(255,160,40,0.7)', 'rgba(255,60,0,0)'),
    glowM: glowTex('rgba(255,230,255,1)', 'rgba(255,60,230,0.5)', 'rgba(160,0,200,0)'), spark: glowTex('rgba(255,255,255,1)', 'rgba(255,220,140,0.8)', 'rgba(255,120,0,0)'),
    glowR: glowTex('rgba(255,230,220,1)', 'rgba(255,50,30,0.6)', 'rgba(200,0,0,0)'),
    fire: [fireTex(1), fireTex(2), fireTex(3)], smoke: [smokeTex(4), smokeTex(5)], star: starTex() };
  const GRAIN = grainTex();

  // ---------------------------------------------------------------- materials (panel lines and rivets pressed into the metal; a clear coat on top)
  function panelTex(seed, base) {
    const c = canvas(512, 512), x = c.getContext('2d'), r = rng(seed);
    x.fillStyle = base || '#9a9a9a'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 70; i++) { const w = 30 + r() * 140, h = 20 + r() * 90, px = r() * 512, py = r() * 512, v = 120 + r() * 70 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(px, py, w, h); }
    x.strokeStyle = '#2a2a2a'; x.lineWidth = 2.2;
    for (let i = 0; i < 46; i++) { const px = r() * 512, py = r() * 512; x.beginPath(); if (r() < 0.5) { x.moveTo(px, py); x.lineTo(px + 60 + r() * 200, py); } else { x.moveTo(px, py); x.lineTo(px, py + 60 + r() * 200); } x.stroke(); }
    x.fillStyle = '#3a3a3a'; for (let i = 0; i < 420; i++) { x.beginPath(); x.arc(r() * 512, r() * 512, 1.6, 0, 6.3); x.fill(); }
    const t2 = new THREE.CanvasTexture(c); t2.wrapS = t2.wrapT = THREE.RepeatWrapping; t2.anisotropy = MAXANI; return t2;
  }
  const PANEL = panelTex(21), PANEL2 = panelTex(37, '#8a8a8a'), PANELB = panelTex(53);
  [PANEL, PANEL2].forEach((q) => q.repeat.set(0.35, 0.35));
  PANELB.repeat.set(0.03, 0.03);
  const S = (o) => new THREE.MeshStandardMaterial(o);
  const P = (o) => new THREE.MeshPhysicalMaterial(Object.assign({ clearcoat: 0.7, clearcoatRoughness: 0.18 }, o));
  const ADD = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }, o || {}));
  const MAT = {
    hull: P({ color: '#c8d0dc', metalness: 0.55, roughness: 0.38, bumpMap: PANEL, bumpScale: 1.4, roughnessMap: PANEL }), dark: P({ color: '#2f343d', metalness: 0.8, roughness: 0.34, bumpMap: PANEL2, bumpScale: 1.2 }),
    teal: S({ color: '#0a3a30', emissive: '#4dffc3', emissiveIntensity: 2.2, metalness: 0.2, roughness: 0.4 }),
    glass: S({ color: '#06121a', emissive: '#1a8a7a', emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.08 }),
    engine: S({ color: '#1a0a00', emissive: '#ff8a2a', emissiveIntensity: 3 }),
    gold: P({ color: '#d8a640', metalness: 0.9, roughness: 0.3, bumpMap: PANEL, bumpScale: 1.2 }), goldDark: P({ color: '#6a4a14', metalness: 0.9, roughness: 0.36, bumpMap: PANEL2, bumpScale: 1 }),
    amber: S({ color: '#3a2000', emissive: '#ffb43a', emissiveIntensity: 2.4 }),
    gun: P({ color: '#3a3f48', metalness: 0.9, roughness: 0.32, bumpMap: PANEL2, bumpScale: 0.6 }), gunLight: S({ color: '#001820', emissive: '#33eeff', emissiveIntensity: 2.5 }),
    wing: S({ color: '#c8402e', metalness: 0.45, roughness: 0.45 }),
    rocket: S({ color: '#e8e8ec', metalness: 0.3, roughness: 0.35 }), rocketRed: S({ color: '#c8302a', metalness: 0.3, roughness: 0.4 }),
    red: S({ color: '#300000', emissive: '#ff3a2a', emissiveIntensity: 3 }),
    // the Lancer
    white: P({ color: '#d6dbe2', metalness: 0.3, roughness: 0.3, bumpMap: PANEL, bumpScale: 0.9, roughnessMap: PANEL }),
    stripe: P({ color: '#ff6a1a', metalness: 0.25, roughness: 0.35 }),
    canopy: P({ color: '#0b1a2c', metalness: 0.5, roughness: 0.05, emissive: '#0a2a3a', emissiveIntensity: 0.5, clearcoat: 1, clearcoatRoughness: 0.03 }),
    engineBlue: S({ color: '#000000', emissive: '#a8dcff', emissiveIntensity: 3.5 }),
    // the carrier
    carrier: P({ color: '#a4adba', metalness: 0.55, roughness: 0.48, bumpMap: PANELB, bumpScale: 2.5, roughnessMap: PANELB, clearcoat: 0.3 }),
    carrierDark: P({ color: '#4a515c', metalness: 0.7, roughness: 0.4, bumpMap: PANELB, bumpScale: 2, clearcoat: 0.2 }),
    // rock
    rock: S({ vertexColors: true, map: GRAIN, bumpMap: GRAIN, bumpScale: 1.2, roughness: 0.95, metalness: 0 }),   // (smooth now: the relief is per pixel)
    scrub: S({ color: '#ffffff', roughness: 1, metalness: 0, flatShading: true }),
    grass: S({ color: '#ffffff', roughness: 1, metalness: 0, side: THREE.DoubleSide }),
    rockShard: S({ color: '#9a5a36', roughness: 0.95, flatShading: true }),
    // the raiders: dark gunmetal with crimson, amber visors, orange engines
    foe: P({ color: '#5e646f', metalness: 0.6, roughness: 0.36, bumpMap: PANEL2, bumpScale: 1.1, clearcoat: 0.5 }), foe2: P({ color: '#7c838f', metalness: 0.55, roughness: 0.4, bumpMap: PANEL, bumpScale: 1, clearcoat: 0.4 }),
    foeRed: P({ color: '#9e1018', metalness: 0.4, roughness: 0.4, emissive: '#3a0003', emissiveIntensity: 1 }), foeVisor: S({ color: '#200800', emissive: '#ff8a20', emissiveIntensity: 2.6, metalness: 0.6, roughness: 0.15 }),
    foeEngine: S({ color: '#000', emissive: '#ff7a24', emissiveIntensity: 5 }), magB: P({ color: '#16181d', metalness: 0.65, roughness: 0.3, bumpMap: PANEL2, bumpScale: 1, clearcoat: 0.8 }), magW: P({ color: '#e9ebef', metalness: 0.3, roughness: 0.32, bumpMap: PANEL, bumpScale: 0.8 }),
    magBlue: P({ color: '#1c3f9a', metalness: 0.5, roughness: 0.25, emissive: '#0c2470', emissiveIntensity: 0.8 }), foeGlass: P({ color: '#120804', metalness: 0.7, roughness: 0.06, emissive: '#ff6a10', emissiveIntensity: 0.55, clearcoat: 1, clearcoatRoughness: 0.03 }), foeCore: S({ color: '#200000', emissive: '#ff2a1a', emissiveIntensity: 5 }),
    foeHull: P({ color: '#8d94a1', metalness: 0.2, roughness: 0.55, bumpMap: PANELB, bumpScale: 2.5, roughnessMap: PANELB, clearcoat: 0.25, envMapIntensity: 0.6 }),   // (v20: less metal - it showed only the blue sky)
    foeHull2: P({ color: '#6a717d', metalness: 0.2, roughness: 0.55, bumpMap: PANELB, bumpScale: 2.2, clearcoat: 0.2, envMapIntensity: 0.6 }),
    genCore: S({ color: '#002a1c', emissive: '#4dffc3', emissiveIntensity: 4 }), bowl: S({ color: '#b9c2cc', metalness: 0.75, roughness: 0.28, side: THREE.DoubleSide }), bowlRed: S({ color: '#c3262a', roughness: 0.5, side: THREE.DoubleSide }), white2: S({ color: '#f2efe8', roughness: 0.6, side: THREE.DoubleSide }), crystal: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    boulder: S({ color: '#ffffff', map: GRAIN, bumpMap: GRAIN, bumpScale: 1.2, roughness: 0.95, flatShading: true })
  };
  function strataShader(sh) {   // the canyon's rock, worked out for every pixel: its layers by height above the floor, fine banding, weathering, dark
    // desert varnish streaking down the cliffs, darker hollows - and its relief (bedding lines, ledges, cracks, crags; on the floor, ripples and
    // pebbles) fed into the lighting as a bump. (28 Oct: the owner found the old evenly striped walls "basic and bland".)
    sh.uniforms.bioT = { value: BIOT };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float wall; attribute float hgt; attribute float base; varying float vWall; varying float vHgt; varying float vBase; varying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWall = wall; vHgt = hgt; vBase = base;\n#ifdef USE_INSTANCING\nvWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\n#else\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', ['#include <common>',
      'varying float vWall; varying float vHgt; varying float vBase; varying vec3 vWP;',
      'uniform sampler2D bioT; vec4 bio(){ return texture2D(bioT, vec2(clamp(-vWP.z / 46800.0, 0.0, 1.0), 0.5)); }',   // (v27) the lands here: green, pine, burnt, salt
      'float rh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float rn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(rh(i), rh(i + vec2(1.0, 0.0)), f.x), mix(rh(i + vec2(0.0, 1.0)), rh(i + vec2(1.0, 1.0)), f.x), f.y); }',
      'float fb(vec2 p){ return rn(p) * 0.5 + rn(p * 2.07 + 5.3) * 0.3 + rn(p * 4.31 + 1.7) * 0.2; }',
      'vec2 h22(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }',
      'float cracks(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;',   // dried mud: the cells' edges (Death Valley's playa)
      '  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); float d = length(g + h22(i + g) - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }',
      '  return d2 - d1; }',
      'float playa(){ vec4 bq = bio(); return vWall < 0.001 && vHgt < 9.0 ? smoothstep(0.56, 0.68, fb(vWP.xz * 0.0055 + 11.0)) * (1.0 - clamp(bq.x + bq.y + bq.z + bq.w, 0.0, 1.0)) : 0.0; }',   // (dried mud only in the desert)
      'float vec7(int j){ return j == 0 ? 7.0 : j == 1 ? 14.0 : j == 2 ? 23.0 : j == 3 ? 36.0 : j == 4 ? 50.0 : j == 5 ? 57.0 : 65.0; }',   // where the layers meet
      'vec3 layer(float h){',   // the column (sRGB), as COLUMN in the code above
      '  if (h < 7.0) return vec3(0.29, 0.25, 0.235); if (h < 14.0) return vec3(0.49, 0.353, 0.267); if (h < 23.0) return vec3(0.541, 0.525, 0.44);',
      '  if (h < 36.0) return vec3(0.627, 0.333, 0.231); if (h < 50.0) return mod(floor(h * 0.62), 2.0) < 1.0 ? vec3(0.69, 0.376, 0.247) : vec3(0.58, 0.29, 0.19);',
      '  if (h < 57.0) return vec3(0.72, 0.376, 0.235); if (h < 65.0) return vec3(0.878, 0.812, 0.659); return vec3(0.749, 0.682, 0.573); }',
      'vec3 schist(float h, float al){',   // (v18) below the old canyon floor, the gorge's dark heart: near-black schist, foliated, streaked with pink granite
      '  float fol = rn(vec2(al * 0.06 + h * 0.21, h * 0.05 - al * 0.02)); vec3 c = mix(vec3(0.13, 0.125, 0.135), vec3(0.26, 0.235, 0.225), fol);',
      '  float vein = smoothstep(0.76, 0.86, rn(vec2(al * 0.018 + h * 0.035, 3.7))) + 0.6 * smoothstep(0.8, 0.9, rn(vec2(al * 0.05 - h * 0.06, 9.1)));',
      '  return mix(c, vec3(0.68, 0.46, 0.41), clamp(vein, 0.0, 1.0) * 0.85); }',
      'float rockH(){',   // the surface relief
      '  float al = vWP.x * 0.71 + vWP.z * 0.71;',
      '  if (vWall > 0.001) { float hv = vHgt + vBase;',
      '    float bh = hv * 0.27 + fb(vec2(al * 0.015, hv * 0.06)) * 1.6;',
      '    float bed = abs(fract(bh) - 0.5) * 0.5 * rn(vec2(al * 0.04, floor(bh))) * (hv < 0.0 ? 0.4 : 1.0);',   // bedding lines: uneven, here and gone (faint in the schist)
      '    float lip = 0.0; for (int j = 0; j < 7; j++) { float e = vec7(j); lip += smoothstep(1.6, 0.0, abs(hv - e)) * 0.5; }',   // a ledge where layers meet
      '    float joint = pow(rn(vec2(al * 0.16, hv * 0.02)), 5.0) * 2.2 + pow(rn(vec2(al * 0.5, hv * 0.05)), 6.0) * 0.8;',   // vertical cracks
      '    float crag = fb(vec2(al * 0.22, hv * 0.22)) * 1.0 + rn(vec2(al * 1.4, hv * 1.2)) * 0.25 + (hv < 0.0 ? fb(vec2(al * 0.09 + hv * 0.1, hv * 0.12)) * 0.9 : 0.0);',
      '    return (bed + lip + joint + crag) * vWall; }',
      '  if (vHgt < 9.0) { float pl = playa(), ck = 1.0 - smoothstep(0.0, 0.07, cracks(vWP.xz * 0.32));',
      '    vec4 bq = bio(); float dz = 1.0 - clamp(bq.x + bq.y + bq.z + bq.w, 0.0, 1.0), sr = bq.w > 0.01 ? 1.0 - smoothstep(0.0, 0.05, cracks(vWP.xz * 0.09)) : 0.0;',   // (v27: no sand ripples off the desert; the salt crust's raised edges; grass)
      '    return mix(sin(dot(vWP.xz, vec2(0.55, 0.83)) * 1.6 + fb(vWP.xz * 0.05) * 6.0) * 0.08 * dz + pow(rn(vWP.xz * 2.2), 6.0) * 0.5 * (0.3 + 0.7 * dz) + rn(vWP.xz * 6.0) * 0.05 + sr * bq.w * 0.4 + rn(vWP.xz * 3.1) * 0.22 * (bq.x + bq.y), -ck * 0.35, pl); }',
      '  return fb(vWP.xz * 0.2) * 0.4; }',
      'vec2 srDH(){ float H = rockH(), k = 1.0 - smoothstep(300.0, 1400.0, length(vWP - cameraPosition)); return vec2(dFdx(H), dFdy(H)) * 0.85 * k; }'].join('\n'))
      .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace('dHdxy_fwd()', '( dHdxy_fwd() + srDH() )'))
      .replace('#include <color_fragment>', ['#include <color_fragment>',
      '{ float al = vWP.x * 0.71 + vWP.z * 0.71; vec4 bioV = bio(); vec3 gnF = normalize(cross(dFdx(vWP), dFdy(vWP))); float upF = abs(gnF.y);',
      'if (vWall > 0.001) {',
      '  float h = vHgt + vBase + (rn(vec2(al * 0.004, 0.0)) + 0.5 * rn(vec2(al * 0.013, 3.0)) - 0.75) * 5.0 + rn(vec2(vHgt * 0.8, al * 0.04)) * 0.6;',   // the layers wander a little
      '  vec3 sc = h < 0.0 ? schist(h, al) : layer(h);',
      '  sc *= 0.95 + 0.1 * (rn(vec2(al * 0.008, h * 0.9)) - 0.5) * 2.0 * rn(vec2(al * 0.02, h * 0.15));',   // faint, uneven banding within a layer
      '  sc *= 0.84 + 0.3 * fb(vec2(al * 0.06, h * 0.08));',   // weathering
      '  float varnish = smoothstep(0.55, 0.85, rn(vec2(al * 0.11, vHgt * 0.012))) * smoothstep(0.3, 0.7, rn(vec2(al * 0.031, 7.0)));',   // desert varnish
      '  sc *= 1.0 - 0.45 * varnish * (1.0 - 0.6 * bioV.y);',
      '  float rh0 = clamp(rockH(), 0.0, 1.0); sc *= 0.8 + 0.32 * rh0;',   // the hollows darker
      // (v27) the lands: grey granite in pine canyon; soot low down in the burnt woods; pale salt-stained rock round the pan; and wherever it is green,
      // moss and grass on every ledge and slope that faces up, ferns along the foot of the walls, creepers hanging down the cliffs
      '  if (bioV.y > 0.01) { vec3 gr = mix(vec3(0.5, 0.5, 0.49), vec3(0.72, 0.71, 0.68), fb(vec2(al * 0.025, h * 0.04))) * (0.86 + 0.24 * rn(vWP.xz * 1.9 + vWP.y * 1.3));',
      '    gr *= 1.0 - 0.38 * smoothstep(0.62, 0.9, rn(vec2(al * 0.07, vHgt * 0.004))); sc = mix(sc, gr * (0.8 + 0.32 * rh0), bioV.y * 0.9); }',
      '  if (bioV.z > 0.01) sc *= 1.0 - bioV.z * (0.18 + 0.5 * (1.0 - smoothstep(3.0, 45.0, vHgt)) * fb(vec2(al * 0.05, vHgt * 0.05)));',
      '  if (bioV.w > 0.01) sc = mix(sc, mix(sc, vec3(0.9, 0.87, 0.8), 0.5 * (1.0 - smoothstep(0.0, 30.0, vHgt)) + 0.15), bioV.w);',
      '  float lush = clamp(bioV.x + bioV.y * 0.85, 0.0, 1.0), nv = fb(vec2(al * 0.07, vHgt * 0.09));',
      '  float veg = lush * smoothstep(0.42, 0.8, upF + (nv - 0.5) * 0.6);',
      '  veg = max(veg, bioV.x * (1.0 - smoothstep(1.5, 12.0 + 8.0 * nv, vHgt)));',
      '  veg = max(veg, lush * smoothstep(0.7, 0.9, rn(vec2(al * 0.06, vHgt * 0.008))) * smoothstep(0.55, 0.7, nv) * 0.8);',
      '  vec3 moss = mix(vec3(0.22, 0.34, 0.1), vec3(0.36, 0.46, 0.16), rn(vec2(al * 0.35, vHgt * 0.35)));',
      '  moss = mix(moss, vec3(0.13, 0.22, 0.1), bioV.y * 0.7);',
      '  sc = mix(sc, moss * (0.75 + 0.4 * nv), clamp(veg, 0.0, 0.9));',
      '  sc = mix(sc, vec3(0.86, 0.88, 0.92) * (0.92 + 0.1 * rn(vWP.xz * 4.0)), smoothstep(0.6, 0.95, bioV.y) * smoothstep(46.0, 80.0, vHgt + (nv - 0.5) * 20.0) * smoothstep(0.42, 0.72, upF + (nv - 0.5) * 0.4));',   // (v28) snow on the high ledges
      '  diffuseColor.rgb *= mix(vec3(1.0), pow(sc, vec3(2.2)) * 1.25, vWall);',
      '} else {',
      '  vec3 grd = vec3(1.0); float lush = clamp(bioV.x + bioV.y, 0.0, 1.0);',
      '  if (vHgt < 9.0) {',   // the canyon floor: sand with gravel patches and scattered stones
      '    float g = fb(vWP.xz * 0.012), p = pow(rn(vWP.xz * 2.2), 6.0), pl = playa(), ck = 1.0 - smoothstep(0.0, 0.07, cracks(vWP.xz * 0.32));',
      '    vec3 sand = (0.9 + 0.2 * fb(vWP.xz * 0.15)) * mix(vec3(1.0), vec3(0.7, 0.62, 0.55), smoothstep(0.55, 0.75, g)) * (1.0 - 0.4 * p * (1.0 - lush)) * (0.94 + 0.12 * rn(vWP.xz * 4.0));',   // sand, gravel, stones, grit
      '    vec3 mud = vec3(1.16, 1.1, 1.02) * (1.0 - 0.55 * ck) * (0.95 + 0.1 * rn(floor(vWP.xz * 0.32) * 1.3));',   // pale dried mud, dark cracks
      '    grd = mix(sand, mud, pl); }',
      '  if (lush > 0.01) { float cl = fb(vWP.xz * 0.035), bl = rn(vWP.xz * 2.6), st = sin(dot(vWP.xz, vec2(0.6, 0.8)) * 0.3 + fb(vWP.xz * 0.02) * 8.0);',   // (v27) grass: clumps, blades, wind-combed stripes, drier patches
      '    vec3 gp = vec3(0.74 + 0.4 * cl) * (0.88 + 0.24 * bl) * (1.0 + 0.07 * st) * mix(vec3(1.0), vec3(1.15, 1.08, 0.8), smoothstep(0.6, 0.8, fb(vWP.xz * 0.011 + 4.0)));',
      '    float nk = 1.0 - smoothstep(40.0, 220.0, length(vWP - cameraPosition)); gp *= mix(1.0, 0.76 + 0.48 * rn(vec2(dot(vWP.xz, vec2(0.8, 0.6)) * 3.1, dot(vWP.xz, vec2(-0.6, 0.8)) * 0.55)), nk);',   // (v29) blades, close by
      '    grd = mix(grd, gp, lush); }',
      '  if (bioV.z > 0.01) { float em = pow(rn(vWP.xz * 1.4), 5.0); grd = mix(grd, vec3(0.8 + 0.4 * fb(vWP.xz * 0.06)) * (1.0 - 0.5 * em), bioV.z); }',   // ash
      '  if (bioV.w > 0.01 && vHgt < 9.0) { float sk = 1.0 - smoothstep(0.0, 0.05, cracks(vWP.xz * 0.09)); grd = mix(grd, vec3(0.94 + 0.1 * fb(vWP.xz * 0.08)) * (1.0 - 0.35 * sk) * (0.96 + 0.06 * rn(vWP.xz * 3.0)), bioV.w); }',   // the salt: a white crust in polygons
      '  diffuseColor.rgb *= grd;',
      '} }'].join('\n'));
  }
  MAT.rock.onBeforeCompile = strataShader; MAT.rock.customProgramCacheKey = () => 'sr-rock-strata';
  MAT.rockDS = S({ vertexColors: true, map: GRAIN, bumpMap: GRAIN, bumpScale: 1.6, roughness: 0.95, metalness: 0, flatShading: true, side: THREE.DoubleSide });
  MAT.rockDS.onBeforeCompile = strataShader; MAT.rockDS.customProgramCacheKey = () => 'sr-rock-strata-ds';
  function shieldMat(col, k) {   // a glowing edge, bright where you see a surface side-on: shields
    return new THREE.ShaderMaterial({ uniforms: { k: { value: k == null ? 1 : k }, col: { value: col } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float k; uniform vec3 col; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 2.2); gl_FragColor = vec4(col * f * k, 1.0); }' });
  }

  // ---------------------------------------------------------------- light, the two skies, reflections for the metal
  const sun = new THREE.DirectionalLight('#fff1dc', 3.2); sun.castShadow = true; scene.add(sun); scene.add(sun.target);
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.8;
  const rim = new THREE.DirectionalLight('#7fb8ff', 1.5); scene.add(rim);
  const hemi = new THREE.HemisphereLight('#3a4a88', '#120a1c', 0.9); scene.add(hemi);
  const SSUN = new THREE.Vector3(-0.7, 0.6, 0.35).normalize();        // space: the sun (three.js terms: z towards you)
  const VSUN = new THREE.Vector3(-0.51, 0.56, -0.65).normalize();     // the valley's sun: high on your left, AHEAD (v30: was a little behind - now you fly towards it)
  const VSUN_SKY = new THREE.Vector3(-0.58, 0.33, -0.745).normalize();  // (v30) where its disc, rays and flare are drawn: lower, so it comes into the view (the view reaches ~28 degrees up)
  const VSUN_E = { x: VSUN.x, y: VSUN.y, z: -VSUN.z };                // the same in the engine's terms (z ahead)
  const blueStar = new THREE.Vector3(0.62, 0.38, -0.69).normalize();

  function makeEnv(build) { const env = new THREE.Scene(), pm = new THREE.PMREMGenerator(renderer); build(env); const t2 = pm.fromScene(env, 0.04).texture; pm.dispose(); return t2; }
  const ENV_SPACE = makeEnv((env) => {
    env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ color: '#04060c', side: THREE.BackSide })));
    [[-28, 24, 14, '#fff2d8', 22, 3], [28, -24, -14, '#3a5cff', 9, 1]].forEach((p) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(p[4], p[4]), new THREE.MeshBasicMaterial({ color: new THREE.Color(p[3]).multiplyScalar(p[5]), side: THREE.DoubleSide })); m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); env.add(m); });
  });
  const ENV_VALLEY = makeEnv((env) => {
    const g = new THREE.SphereGeometry(50, 32, 16), cols = [], top = new THREE.Color('#5d8fd6'), hor = new THREE.Color('#ecc9a2'), bot = new THREE.Color('#9a5c36'), tc = new THREE.Color();
    const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 50; tc.copy(hor).lerp(y > 0 ? top : bot, Math.pow(Math.abs(y), 0.6)); cols.push(tc.r, tc.g, tc.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    env.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const s = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ color: '#fff0d0', side: THREE.DoubleSide })); s.position.copy(VSUN).multiplyScalar(40); s.lookAt(0, 0, 0); env.add(s);
  });

  // SPACE: stars and nebulae, a gas giant, a blue star, the Iron Moon far off
  const space = new THREE.Group(); scene.add(space);
  const SKYT = skyTex();
  const spaceSky = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), new THREE.MeshBasicMaterial({ map: SKYT, side: THREE.BackSide, depthWrite: false, fog: false }));
  spaceSky.renderOrder = -10; space.add(spaceSky);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glowO, color: '#ffe0b0', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sunGlow.scale.set(1400, 1400, 1); space.add(sunGlow);
  (function () {
    const c = canvas(1024, 512), x = c.getContext('2d'), r = rng(19);
    for (let y = 0; y < 512; y++) { const k = Math.sin(y * 0.05 + Math.sin(y * 0.013) * 3) * 0.5 + 0.5, v = r() * 10; x.fillStyle = `rgb(${150 + k * 70 + v | 0},${95 + k * 50 + v | 0},${70 + k * 30 | 0})`; x.fillRect(0, y, 1024, 1); }
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,230,200,${r() * 0.12})`; x.beginPath(); x.ellipse(r() * 1024, r() * 512, 40 + r() * 120, 4 + r() * 10, 0, 0, 6.3); x.fill(); }
    const giant = new THREE.Mesh(new THREE.SphereGeometry(620, 64, 32), new THREE.MeshStandardMaterial({ map: tex(c), roughness: 1, metalness: 0 }));
    giant.position.set(-5400, -2900, -8200); giant.rotation.z = 0.35; giant.userData.far = true; space.add(giant);
    const gr = new THREE.Mesh(new THREE.RingGeometry(760, 1080, 128), new THREE.MeshBasicMaterial({ map: ringTex(), color: '#c8a888', transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
    gr.position.copy(giant.position); gr.rotation.set(-1.2, 0.2, 0.4); space.add(gr);
    const haze = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glowO, color: '#ff9a60', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
    haze.scale.set(1650, 1650, 1); haze.position.copy(giant.position); space.add(haze);
  })();
  const starCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glowC, color: '#cfe8ff', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  starCore.scale.set(420, 420, 1); space.add(starCore);
  const MT = moonTex(), moon = new THREE.Group();   // the Iron Moon, the raiders' base, far off for now
  moon.add(new THREE.Mesh(new THREE.SphereGeometry(120, 64, 40), S({ map: MT.map, emissiveMap: MT.emissive, emissive: '#ffffff', emissiveIntensity: 1.4, metalness: 0.55, roughness: 0.62, bumpMap: MT.map, bumpScale: 1.2 })));
  (function () {
    const g = new THREE.RingGeometry(165, 235, 160, 1), uv = g.attributes.uv, pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - 165) / 70, 0.5); }
    const ring = new THREE.Mesh(g, S({ map: ringTex(), transparent: true, side: THREE.DoubleSide, emissive: '#ffb050', emissiveIntensity: 0.25, roughness: 0.6, metalness: 0.4, depthWrite: false }));
    ring.rotation.set(-1.32, 0, -0.2); moon.add(ring);
  })();
  moon.position.set(3400, 1100, -5600); moon.scale.setScalar(3.2); space.add(moon);

  // THE VALLEY: a desert sky (haze low down, deep blue overhead, high thin cloud, the sun), mesas round the horizon
  const HAZE = new THREE.Color('#e2bd96');
  const valley = new THREE.Group(); scene.add(valley);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: VSUN_SKY }, zenith: { value: new THREE.Color('#1a58d0') }, horizon: { value: new THREE.Color('#dcd6cc') }, ground: { value: new THREE.Color('#c99a74') }, sunCol: { value: new THREE.Color('#fff0d6') }, space: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform vec3 sunDir, zenith, horizon, ground, sunCol; uniform float space; varying vec3 vDir;',
      'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }',
      'float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * n(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }',
      'void main(){ vec3 d = normalize(vDir); float e = d.y;',
      '  vec3 c = e > 0.0 ? mix(horizon, zenith, pow(e, 0.34)) : mix(horizon, ground, pow(min(1.0, -e * 5.0), 0.7));',
      '  if (e > 0.0) { vec2 p = d.xz / (e + 0.12); float ci = fbm(p * vec2(1.1, 2.6) + 3.0); ci = smoothstep(0.55, 0.9, ci) * smoothstep(0.0, 0.18, e) * 0.3; c = mix(c, vec3(1.0, 0.97, 0.94) * 1.1, ci);',   // (thin high cloud)
      '    vec2 q = d.xz / (e + 0.08) * 0.55; float dn = fbm(q * 1.4 + 11.0) * 0.75 + fbm(q * 3.3 + 2.0) * 0.25, cov = smoothstep(0.52, 0.74, dn) * smoothstep(0.02, 0.2, e);',   // (v29) cumulus
      '    float ds = fbm((q + sunDir.xz * 0.18) * 1.4 + 11.0) * 0.75 + fbm((q + sunDir.xz * 0.18) * 3.3 + 2.0) * 0.25, lit = clamp(0.62 + (dn - ds) * 3.2, 0.35, 1.2);',
      '    vec3 cc = mix(vec3(0.56, 0.6, 0.7), vec3(1.06, 1.02, 0.97), lit) * 1.12 + sunCol * pow(max(dot(d, sunDir), 0.0), 6.0) * 0.5 * (1.0 - cov * 0.5);',
      '    c = mix(c, cc, cov * 0.92); }',
      '  float s = max(dot(d, sunDir), 0.0);',
      '  c += sunCol * (pow(s, 1400.0) * 14.0 + pow(s, 60.0) * 0.35 + pow(s, 7.0) * 0.1);',
      '  vec3 sp = mix(vec3(0.004, 0.006, 0.02), vec3(0.06, 0.17, 0.45), pow(1.0 - clamp(abs(e) * 3.0, 0.0, 1.0), 3.0)) + sunCol * (pow(s, 1400.0) * 40.0 + pow(s, 90.0) * 0.4);',
      '  c = mix(c, sp, space);',   // high up, the sky goes black with a thin blue rim at the horizon
      '  gl_FragColor = vec4(c, 1.0); }'].join('\n'),
    side: THREE.BackSide, depthWrite: false
  });
  const valleySky = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), skyMat); valleySky.renderOrder = -10; valley.add(valleySky);
  const valleyStars = new THREE.Mesh(new THREE.SphereGeometry(8800, 48, 24), new THREE.MeshBasicMaterial({ map: SKYT, side: THREE.BackSide, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  valleyStars.renderOrder = -9.5; valley.add(valleyStars);   // the stars, coming out as you climb
  const mesas = new THREE.Mesh(new THREE.CylinderGeometry(3300, 3300, 1000, 128, 1, true), new THREE.MeshBasicMaterial({ map: mesaTex(), transparent: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  mesas.renderOrder = -9; valley.add(mesas);
  const FOG = new THREE.Fog(HAZE.clone(), 380, 3100);
  const HZB = [new THREE.Color('#c4d2d2'), new THREE.Color('#b0c2cc'), new THREE.Color('#7d726c'), new THREE.Color('#f0ebe2')], HZC = new THREE.Color(), HZT = new THREE.Color(), HEMI_G = new THREE.Color('#9a5a34');   // (v27) the lands' haze
  const HAZE2 = new THREE.Color('#eaa878'), SUNC = [new THREE.Color('#ffe2bc'), new THREE.Color('#ffae6a')], GOLD = { g: 0 };   // (v22) the afternoon's end
  const SKYC = { h0: new THREE.Color('#dcd6cc'), h1: new THREE.Color('#f2c296'), z0: new THREE.Color('#1a58d0'), z1: new THREE.Color('#2c47a0'), s0: new THREE.Color('#fff0d6'), s1: new THREE.Color('#ffc080') };
  function smooth01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  // dust: specks streaming past the camera (space dust; in the valley, drifting sand), so you feel the speed
  const DUST = 420, dustPos = new Float32Array(DUST * 3), dustGeo = new THREE.BufferGeometry();
  for (let i = 0; i < DUST; i++) { dustPos[i * 3] = (Math.random() * 2 - 1) * 200; dustPos[i * 3 + 1] = (Math.random() * 2 - 1) * 130; dustPos[i * 3 + 2] = -Math.random() * 600; }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: '#9fb4ff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
  const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false; cam.add(dust);
  const streakPos = new Float32Array(DUST * 6), streakGeo = new THREE.BufferGeometry(); streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  const streakMat = new THREE.LineBasicMaterial({ color: '#7f9cff', transparent: true, opacity: 0.55, depthWrite: false, fog: false });
  const streaks = new THREE.LineSegments(streakGeo, streakMat); streaks.frustumCulled = false; cam.add(streaks);

  // ---------------------------------------------------------------- the models (forward is three.js -Z)
  function extrudeXZ(pts, depth, mat, bevel) {   // a flat outline (x, z) given thickness and bevelled edges
    const sh = new THREE.Shape(); pts.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: depth, bevelEnabled: true, bevelThickness: bevel || 0.08, bevelSize: bevel || 0.1, bevelSegments: 2, curveSegments: 8 });
    g.rotateX(Math.PI / 2); g.translate(0, depth / 2, 0);
    return new THREE.Mesh(g, mat);
  }
  function glowSprite(map, color, size, opacity) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: map, color: color || '#ffffff', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: opacity == null ? 1 : opacity })); s.scale.set(size, size, 1); return s; }
  function shadows(g, cast, receive) { g.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = !!receive; } }); return g; }
  function cyl(rt, rb, h, seg, mat) { const g = new THREE.CylinderGeometry(rt, rb, h, seg || 16); g.rotateX(Math.PI / 2); return new THREE.Mesh(g, mat); }   // along z: rt at +z (back), rb at -z (front)

  function extrudeYZ(pts, depth, mat, bevel) { const m = extrudeXZ(pts, depth, mat, bevel); m.geometry.rotateZ(Math.PI / 2); return m; }   // the same, stood on edge: points are (height, z)
  function bake(g) {   // (27 Oct) a ship's many small parts merged into one drawing per material: all that detail costs almost nothing to draw
    g.updateMatrixWorld(true);
    const by = new Map();
    g.traverse((o) => { if (o.isMesh) { if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(o); } });
    by.forEach((list, mat) => {
      if (list.length < 2) return;
      const parts = list.map((o) => { const q = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); q.applyMatrix4(o.matrixWorld); return q; });
      const out = new THREE.BufferGeometry();
      ['position', 'normal', 'uv'].filter((k) => parts.every((q) => q.attributes[k])).forEach((k) => {
        const n = parts[0].attributes[k].itemSize, arr = new Float32Array(parts.reduce((a, q) => a + q.attributes[k].count * n, 0));
        let at = 0; parts.forEach((q) => { const a = q.attributes[k]; for (let i = 0; i < a.count * n; i++) arr[at + i] = a.array[i]; at += a.count * n; });
        out.setAttribute(k, new THREE.BufferAttribute(arr, n));
      });
      list.forEach((o) => { o.parent.remove(o); o.geometry.dispose(); }); parts.forEach((q) => q.dispose());
      g.add(new THREE.Mesh(out, mat));
    });
    return g;
  }

  // the raiders' fighters (27 Oct, the owner: bigger, "more 3D, more realistic" - and not all the same). Our own designs: no film's ships.
  // Shaped to read HEAD-ON, the way you see them most: each has a silhouette from the front, not just from above.
  // (v32, 29 Oct; the owner: make the enemy "like a cockapoodle ... trying to stop you getting Noodle Doodles"; "slick fighters with like dog features,
  // like ears, nose, and a tail ... so they still look like a threat") THE CURLY PACK: the same sleek fighters, now with long floppy curly-furred ears
  // hanging from their heads, a glossy black button nose on the tip, a curled tail fin that wags (faster when they panic), a collar (gold on a pack
  // leader); fur in a cockapoo's colours, a different one per pack. A Howler carries a raised howling muzzle; a Fetcher a ball in its jaws; a
  // Fluffball a thick fur shield over its whole front. The Magpie's ears: one black, one white.
  const FURT = (function () {   // curls: little arcs, light on top and shadowed under - as a bump map and as colour variation
    const c = canvas(256, 256), x = c.getContext('2d'), r = rng(404); x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 950; i++) {
      const px = r() * 256, py = r() * 256, rad = 3 + r() * 6, a0 = r() * 6.28, v = 150 + r() * 100 | 0;
      x.strokeStyle = 'rgba(25,25,25,0.55)'; x.lineWidth = 1.2; x.beginPath(); x.arc(px + 1.2, py + 1.2, rad, a0, a0 + 3.2); x.stroke();
      x.strokeStyle = `rgb(${v},${v},${v})`; x.lineWidth = 1.4 + r() * 2; x.beginPath(); x.arc(px, py, rad, a0, a0 + 3.4 + r() * 2); x.stroke();
    }
    const b = tex(c, false), m = tex(c); [b, m].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); }); return { bump: b, map: m };
  })();
  MAT.fur = S({ color: '#d49a5c', map: FURT.map, bumpMap: FURT.bump, bumpScale: 3, roughness: 1, metalness: 0 });
  MAT.furTail = MAT.fur.clone(); MAT.furB = MAT.fur.clone(); MAT.furB.color.set('#1e1c1c'); MAT.furW = MAT.fur.clone(); MAT.furW.color.set('#ece8e2'); MAT.furTailB = MAT.furB.clone();
  MAT.dogNose = P({ color: '#0d0b0b', roughness: 0.12, metalness: 0.1, clearcoat: 1 });
  MAT.dogEye = P({ color: '#140a06', roughness: 0.06, metalness: 0.1, clearcoat: 1 }); MAT.dogPupil = S({ color: '#200800', emissive: '#ff8a20', emissiveIntensity: 2.8 });   // (v34) eyes with a glow in them
  MAT.dogTongue = S({ color: '#e0607a', roughness: 0.45 }); MAT.tooth = S({ color: '#f4f0e6', roughness: 0.3 });
  MAT.ballY = S({ color: '#d4e83a', roughness: 0.95, bumpMap: FURT.bump, bumpScale: 0.8 });
  MAT.biscuit = S({ color: '#c98d4a', roughness: 0.9, bumpMap: FURT.bump, bumpScale: 0.6 }); MAT.squeaky = P({ color: '#ff4fa8', roughness: 0.35, clearcoat: 0.6, emissive: '#5a0030', emissiveIntensity: 0.6 });
  function lumpy(geo, k, sd) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + (noise3(x * 2.4 + sd, y * 2.4, z * 2.4) - 0.5) * k; p.setXYZ(i, x * n, y * n, z * n); } geo.computeVertexNormals(); return geo; }
  function dogify(g, a) {   // (v34) a: head [x, y, z, r] - the front of the ship IS a cockapoo's head now; tail [x, y, z, k]; collar [y, z, rx, ry] | null;
    // back [x, y, z, sx, sy, sz] (a coat of fur over its back); ace (the Magpie: black, white muzzle); role (howl | fetch)
    // (29 Oct, the owner: the v32 fighters "don't look enough like a dog ... they just look like a spaceship". They come at you head-on, so it is
    // the FACE that has to say dog: a big round curly head where the cockpit was, a snout with a black nose, big eyes with a glow in them under
    // furry brows, little fangs and a tongue, long curly ears hanging down - a dog flying a fighter's wings and engines.)
    const fur = a.ace ? MAT.furB : MAT.fur, mz = a.ace ? MAT.furW : fur, H = a.head, R = H[3], hx = H[0], hy = H[1], hz = H[2];
    g.children.filter((q) => q.material === MAT.foeGlass).forEach((q) => g.remove(q));   // (the canopy and its glass go: the head is where the pilot was)
    const blob = (geo, mat, x, y, z, sx, sy, sz, rx, ry, rz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m; };
    const lump = (k, sd) => lumpy(new THREE.SphereGeometry(1, 22, 16), k, sd);
    blob(lump(0.28, 3), fur, hx, hy, hz, R, R * 0.92, R * 1.02);   // the head: round and curly
    [[-0.45, 0.85, 0.1], [0.4, 0.88, 0.2], [0, 0.95, -0.15], [-0.15, 0.8, 0.45], [0.3, 0.75, 0.5]].forEach((q, k) => blob(lump(0.4, 11 + k), fur, hx + q[0] * R, hy + q[1] * R, hz + q[2] * R, R * 0.42, R * 0.36, R * 0.42));   // a fluffy topknot
    blob(lump(0.22, 5), mz, hx, hy - R * 0.32, hz - R * 0.95, R * 0.58, R * 0.46, R * 0.62);   // the snout
    blob(new THREE.SphereGeometry(1, 16, 12), MAT.dogNose, hx, hy - R * 0.12, hz - R * 1.52, R * 0.27, R * 0.2, R * 0.18);   // the black button nose
    blob(new THREE.SphereGeometry(1, 12, 8), MAT.dogTongue, hx, hy - R * 0.72, hz - R * 1.28, R * 0.17, R * 0.07, R * 0.26, 0.5);   // its tongue, lolling
    [-1, 1].forEach((sd) => {
      blob(new THREE.ConeGeometry(1, 1, 8), MAT.tooth, hx + sd * R * 0.22, hy - R * 0.66, hz - R * 1.33, R * 0.07, R * 0.2, R * 0.07, Math.PI);   // little fangs
      blob(new THREE.SphereGeometry(1, 16, 12), MAT.dogEye, hx + sd * R * 0.42, hy + R * 0.22, hz - R * 0.86, R * 0.24, R * 0.26, R * 0.16);   // big dark eyes...
      blob(new THREE.SphereGeometry(1, 12, 8), MAT.dogPupil, hx + sd * R * 0.4, hy + R * 0.25, hz - R * 0.99, R * 0.1, R * 0.12, R * 0.05);   // ...with a glow in them
      blob(lump(0.3, 17 + sd), fur, hx + sd * R * 0.42, hy + R * 0.52, hz - R * 0.8, R * 0.3, R * 0.12, R * 0.16, 0, 0, -sd * 0.35);   // furry brows, frowning
      const L = R * (a.role === 'howl' ? 2.4 : 2.0), e = blob(lump(0.42, sd * 3 + 1), a.ace && sd > 0 ? MAT.furW : fur, hx + sd * R * 0.98, hy - L * 0.32, hz - R * 0.05, R * 0.3, L * 0.5, R * 0.62, 0.22, 0, sd * 0.22);   // long curly ears
      e.userData.ear = sd;
    });
    if (a.back) blob(lump(0.25, 23), fur, a.back[0], a.back[1], a.back[2], a.back[3], a.back[4], a.back[5]);   // a coat of fur down its back
    const k = a.tail[3], curve = new THREE.CatmullRomCurve3([[0, 0, 0], [0, 0.6, 0.9], [0, 1.3, 1.5], [0, 1.9, 1.3], [0, 2.1, 0.7], [0, 1.8, 0.3]].map((p) => new THREE.Vector3(p[0] * k, p[1] * k, p[2] * k)));
    const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.42 * k, 8, false), a.ace ? MAT.furTailB : MAT.furTail); tail.position.set(a.tail[0], a.tail[1], a.tail[2]); tail.userData.isTail = true; g.add(tail);
    if (a.collar) { const c = new THREE.Mesh(new THREE.TorusGeometry(1, 0.13, 8, 28), MAT.foeRed); c.scale.set(a.collar[2], a.collar[3], 1.5); c.position.set(0, a.collar[0], a.collar[1]); g.add(c);
      const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 14), MAT.foeRed); tag.rotation.x = Math.PI / 2; tag.position.set(0, a.collar[0] - a.collar[3] - 0.25, a.collar[1] - 0.1); g.add(tag); }
    if (a.role === 'howl') {   // a Howler: muzzle thrown up at the sky, a blue glow round its mouth
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 0.32, 0.12, 8, 18), MAT.engineBlue); ring.position.set(hx, hy + R * 0.2, hz - R * 1.45); ring.rotation.x = -0.3; g.add(ring);
      const gl = glowSprite(T.glowC, '#9fe4ff', R * 2.2, 0.85); gl.position.copy(ring.position); g.add(gl);
    }
    if (a.role === 'fetch') blob(new THREE.SphereGeometry(1, 16, 12), MAT.ballY, hx, hy - R * 0.62, hz - R * 1.45, R * 0.42, R * 0.42, R * 0.42);   // a Fetcher: the ball in its jaws
  }
  // (v35, 29 Oct; the owner: "the boss ones ... as a cock-a-poodle, a black one, with red eyes ... more like dog bones ... the spaceship that you blow
  // up ... more like a dog bone") the BOSSES' heads: huge, black, curly, eyes glowing red, a spiked collar - the Gaoler wears one on its armoured
  // front, the Millstone above its grinding wheel. sgn: which way the face looks along z (+1: towards +z).
  MAT.bossFur = MAT.fur.clone(); MAT.bossFur.color.set('#2e2a2a'); MAT.bossEye = S({ color: '#200000', emissive: '#ff1a10', emissiveIntensity: 4.2 });
  MAT.boneW = P({ color: '#ece2c9', roughness: 0.6, metalness: 0, clearcoat: 0.25 });
  function bossHead(g0, X, Y, Z, R, sgn, tilt) {   // (tilt: the face turned down towards you, radians)
    const g = new THREE.Group(); g.position.set(X, Y, Z); g.rotation.x = (tilt || 0) * sgn; g0.add(g);
    const hx = 0, hy = 0, hz = 0, fur = MAT.bossFur, F = (k) => hz + sgn * R * k;
    const blob = (geo, mat, x, y, z, sx, sy, sz, rx, rz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx || 0, 0, rz || 0); g.add(m); return m; };
    const lump = (k, sd) => lumpy(new THREE.SphereGeometry(1, 26, 18), k, sd);
    blob(lump(0.28, 41), fur, hx, hy, hz, R, R * 0.92, R);
    [[-0.45, 0.85, 0.1], [0.4, 0.88, 0.2], [0, 0.97, -0.15], [-0.15, 0.8, -0.45], [0.3, 0.75, -0.5]].forEach((q, k) => blob(lump(0.4, 43 + k), fur, hx + q[0] * R, hy + q[1] * R, hz - sgn * q[2] * R, R * 0.44, R * 0.38, R * 0.44));
    blob(lump(0.22, 49), fur, hx, hy - R * 0.32, F(0.95), R * 0.6, R * 0.48, R * 0.62);
    blob(new THREE.SphereGeometry(1, 16, 12), MAT.dogNose, hx, hy - R * 0.12, F(1.52), R * 0.28, R * 0.21, R * 0.18);
    [-1, 1].forEach((sd) => {
      blob(new THREE.ConeGeometry(1, 1, 8), MAT.tooth, hx + sd * R * 0.24, hy - R * 0.66, F(1.3), R * 0.08, R * 0.26, R * 0.08, Math.PI);   // fangs
      blob(new THREE.SphereGeometry(1, 16, 12), MAT.dogEye, hx + sd * R * 0.42, hy + R * 0.22, F(0.86), R * 0.25, R * 0.25, R * 0.16);
      blob(new THREE.SphereGeometry(1, 12, 8), MAT.bossEye, hx + sd * R * 0.4, hy + R * 0.22, F(0.98), R * 0.15, R * 0.12, R * 0.06);   // eyes glowing RED
      const gl = glowSprite(T.glowR, '#ff2a18', R * 0.9, 0.9); gl.position.set(hx + sd * R * 0.4, hy + R * 0.22, F(1.05)); g.add(gl);
      blob(lump(0.3, 51 + sd), fur, hx + sd * R * 0.42, hy + R * 0.5, F(0.82), R * 0.32, R * 0.12, R * 0.16, 0, sd * 0.42);   // brows, scowling
      blob(lump(0.42, 55 + sd), fur, hx + sd * R * 0.98, hy - R * 0.62, hz, R * 0.32, R * 1.05, R * 0.66, 0.12 * sgn, sd * 0.2);   // ears
    });
    const col = new THREE.Mesh(new THREE.TorusGeometry(R * 0.82, R * 0.09, 10, 36), MAT.gun); col.rotation.x = Math.PI / 2 - 0.35 * sgn; col.position.set(hx, hy - R * 0.72, hz - sgn * R * 0.1); g.add(col);   // a spiked collar
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, sp = new THREE.Mesh(new THREE.ConeGeometry(R * 0.07, R * 0.26, 6), MAT.foeRed); sp.position.set(hx + Math.cos(a) * R * 0.9, hy - R * 0.72 + Math.sin(a) * R * 0.12 * sgn, hz - sgn * R * 0.1 + Math.sin(a) * R * 0.9); sp.rotation.set(0, -a, -Math.PI / 2); sp.rotateZ(0); g.add(sp); }
  }
  function boneGeo() {   // a dog bone: a shaft and four knuckles (unit length along x)
    const parts = [[new THREE.CylinderGeometry(0.28, 0.28, 2.2, 14).rotateZ(Math.PI / 2), BC2.setRGB(1, 1, 1)]];
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => parts.push([new THREE.SphereGeometry(0.42, 14, 10).translate(sx * 1.15, 0, sz * 0.3), BC2])));
    return mergeCol(parts);
  }
  function findTail(g) { g.userData.tail = g.children.find((q) => q.userData && q.userData.isTail) || null; return g; }
  function makeBall() {   // a Fetcher's ball: a big yellow-green tennis ball, its seam in white
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), MAT.ballY));
    const seam = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.06, 6, 40), S({ color: '#f4f4f0', roughness: 0.8 })); seam.rotation.set(0.5, 0.3, 0); g.add(seam);
    g.scale.setScalar(3.8); return shadows(g, true);
  }
  function makeBone(toy) {   // a dog treat (a biscuit bone, glowing the colour of what it gives you) or one of Noodle Doodles' squeaky toys (pink)
    const g = new THREE.Group(), M = toy ? MAT.squeaky : MAT.biscuit;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.4, 14), M); bar.rotation.z = Math.PI / 2; g.add(bar);
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => { const k = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), M); k.position.set(sx * 1.25, 0, sz * 0.38); g.add(k); }));
    const gl = glowSprite(T.glowC, toy ? '#ff6ac0' : '#ffd070', toy ? 7 : 8, 0.75); g.add(gl); g.userData.glow = gl;
    g.scale.setScalar(toy ? 2.6 : 2.3); return g;
  }
  function makeDart(ace, role) {   // the Shrike: gull wings - up from the body, then down to a cannon at each tip, like a bird of prey - swept forward; twin engines, a glowing canopy
    // (ace: the Magpie's own - black and white like the bird, a blue sheen on its wings)
    const g = new THREE.Group(), BODY = ace ? MAT.magB : MAT.foe, WING = ace ? MAT.magW : MAT.foe, STRIPE = ace ? MAT.magBlue : MAT.foeRed;
    const prof = [[0.001, 7.0], [0.34, 6.1], [0.74, 4.5], [1.04, 2.5], [1.18, 0.3], [1.12, -1.9], [0.92, -3.7], [0.66, -4.5]].map((p) => new THREE.Vector2(p[0], p[1]));
    const fg = new THREE.LatheGeometry(prof, 8); fg.rotateX(-Math.PI / 2); fg.rotateZ(Math.PI / 8); fg.scale(1.1, 0.74, 1); g.add(new THREE.Mesh(fg, BODY));
    const can = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.foeGlass); can.scale.set(0.6, 0.6, 2.0); can.position.set(0, 0.55, -2.4); g.add(can);
    [-3.0, -2.0].forEach((z) => { const h = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 6, 18, Math.PI), MAT.gun); h.position.set(0, 0.55, z); g.add(h); });   // the canopy's frame
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 3.6), MAT.foe2); sp.position.set(0, 0.78, 0.9); g.add(sp);   // a spine down its back
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), MAT.foeGlass); chin.position.set(0, -0.62, -4.0); g.add(chin);   // a sensor under the nose
    [-1, 1].forEach((s) => {
      const M = (pts) => (s > 0 ? pts : pts.map((q) => [-q[0], q[1]]));
      const wi = new THREE.Group(); wi.position.set(s * 0.8, -0.1, 0); wi.rotation.z = s * 0.32; g.add(wi);   // the inner wing climbs...
      wi.add(extrudeXZ(M([[0, -0.6], [2.15, -1.5], [2.15, 1.1], [0, 2.6]]), 0.32, WING, 0.08));
      const sti = extrudeXZ(M([[0.3, -0.5], [2.0, -1.25], [2.0, -0.85], [0.3, -0.05]]), 0.04, STRIPE, 0.02); sti.position.y = 0.25; wi.add(sti);
      const wo = new THREE.Group(); wo.position.set(s * 2.79, 0.56, 0); wo.rotation.z = -s * 0.22; g.add(wo);   // ...the outer wing droops to the gun
      wo.add(extrudeXZ(M([[0, -1.5], [3.4, -2.9], [3.75, -2.4], [3.55, -1.3], [0, 1.1]]), 0.26, WING, 0.07));
      const sto = extrudeXZ(M([[0.2, -1.35], [3.1, -2.6], [3.25, -2.25], [0.2, -0.95]]), 0.04, STRIPE, 0.02); sto.position.y = 0.2; wo.add(sto);
      const gun = cyl(0.12, 0.15, 3.8, 10, MAT.gun); gun.position.set(s * 3.6, 0, -3.6); wo.add(gun);
      const hs = cyl(0.3, 0.3, 2.0, 12, MAT.foe2); hs.position.set(s * 3.6, 0, -1.9); wo.add(hs);
      const hc = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), MAT.foe2); hc.scale.z = 1.4; hc.position.set(s * 3.6, 0, -0.9); wo.add(hc);
      const mb = cyl(0.2, 0.2, 0.45, 10, MAT.dark); mb.position.set(s * 3.6, 0, -5.4); wo.add(mb);
      const mz = glowSprite(T.glowR, '#ffffff', 1.0, 0.8); mz.position.set(s * 3.6, 0, -5.8); wo.add(mz);
      const kn = cyl(0.34, 0.36, 3.2, 12, MAT.foe2); kn.position.set(s * 2.79, 0.42, 0.1); g.add(kn);   // a pod at each knee of the wing...
      const kc = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.9, 12), MAT.foeRed); kc.rotation.x = -Math.PI / 2; kc.position.set(s * 2.79, 0.42, -1.95); g.add(kc);   // ...red-nosed
      const ms = cyl(0.14, 0.14, 2.4, 8, MAT.rocket); ms.position.set(s * 2.79, -0.05, 0.4); g.add(ms);   // and a missile under it
      const mt = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 8), MAT.rocketRed); mt.rotation.x = -Math.PI / 2; mt.position.set(s * 2.79, -0.05, -1.07); g.add(mt);
      const cn = extrudeXZ(M([[0.7, -4.4], [2.3, -3.6], [2.3, -3.2], [0.8, -2.9]]), 0.1, MAT.foeRed, 0.03); cn.position.y = 0.05; cn.rotation.z = s * 0.15; g.add(cn);   // red canards
      const ik = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.48, 1.6), MAT.dark); ik.position.set(s * 1.0, -0.3, -1.3); g.add(ik);
      const ikm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.08), MAT.foeEngine); ikm.position.set(s * 1.0, -0.3, -2.12); g.add(ikm);
      const nac = cyl(0.6, 0.56, 4.6, 14, MAT.foe2); nac.position.set(s * 1.65, -0.2, 2.5); g.add(nac);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.1, 8, 18), MAT.gun); lip.position.set(s * 1.65, -0.2, 0.18); g.add(lip);
      const ink = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), MAT.dark); ink.rotation.y = Math.PI; ink.position.set(s * 1.65, -0.2, 0.12); g.add(ink);
      const noz = cyl(0.5, 0.42, 0.8, 14, MAT.gun); noz.position.set(s * 1.65, -0.2, 5.15); g.add(noz);
      const hot = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), MAT.foeEngine); hot.position.set(s * 1.65, -0.2, 5.61); g.add(hot);
      const ex = glowSprite(T.glowO, '#ffffff', 2.8); ex.position.set(s * 1.65, -0.2, 5.95); g.add(ex);
      const fq = new THREE.Group(); fq.position.set(s * 1.65, 0.35, 0); fq.rotation.z = -s * 0.42; g.add(fq);   // a fin on each engine, leaning out
      fq.add(extrudeYZ([[0, 2.7], [2.0, 3.7], [2.1, 4.4], [0, 4.8]], 0.14, MAT.foe, 0.04));
      const ft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 0.9), MAT.foeRed); ft.position.set(0, 2.0, 4.05); fq.add(ft);
    });
    const vf = extrudeYZ([[0, 2.9], [-1.2, 3.8], [-1.2, 4.3], [0, 4.6]], 0.12, MAT.foe, 0.03); vf.position.y = -0.55; g.add(vf);   // and one underneath
    g.userData.nav = [-1, 1].map((s) => { const n = glowSprite(T.spark, '#ff3020', 1.2); n.position.set(s * 6.35, -0.15, -1.9); g.add(n); return n; });
    const eye = glowSprite(T.glowO, '#ffb070', 2.4, 0.9); eye.position.set(0, 0.85, -3.9); g.add(eye);   // its canopy glows: you see it coming
    g.userData.ex = [-1, 1].map((s) => new THREE.Vector3(s * 1.65, -0.2, 5.8)); g.userData.exW = 1.9; g.userData.exL = 7;
    dogify(g, { head: [0, 0.75, -4.7, 2.1], back: [0, 0.75, -0.2, 1.25, 0.75, 3.2], tail: [0, 1.0, 3.6, 0.7], collar: [0.35, -2.3, 1.55, 1.25], ace: ace, role: role });   // (v34)
    bake(g); findTail(g); g.scale.setScalar(2.6);   // (was 2.3; 1.6 before that)
    return shadows(g, true);
  }
  function makeDart2(role) {   // the Shrike's other build: a manta - a broad body whose outer wings droop like a ray's, a gun pod slung under each tip, one big engine and two small
    const g = new THREE.Group();
    const half = [[0, -6.6], [1.1, -5.6], [2.3, -3.0], [2.4, 3.4], [1.6, 4.4]];
    g.add(extrudeXZ(half.concat(half.slice(1).reverse().map((p) => [-p[0], p[1]])), 0.8, MAT.foe, 0.36));
    const prof = [[0.001, 6.2], [0.5, 5.0], [0.95, 3.0], [1.25, 0.6], [1.2, -2.4], [0.95, -4.4]].map((p) => new THREE.Vector2(p[0], p[1]));
    const fg = new THREE.LatheGeometry(prof, 16); fg.rotateX(-Math.PI / 2); fg.scale(1, 0.8, 1); const hull = new THREE.Mesh(fg, MAT.foe2); hull.position.y = 0.35; g.add(hull);
    const can = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.foeGlass); can.scale.set(0.6, 0.55, 1.7); can.position.set(0, 1.05, -2.3); g.add(can);
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 1.8), MAT.foe); scoop.position.set(0, 1.35, 0.5); g.add(scoop);   // an intake on its back
    const sm = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, 0.06), MAT.dark); sm.position.set(0, 1.37, -0.42); g.add(sm);
    const ant = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.3, 0.05), MAT.gun); ant.position.set(0.45, 1.7, 2.2); ant.rotation.x = 0.35; g.add(ant);
    const noz = cyl(1.0, 0.86, 1.3, 18, MAT.gun); noz.position.set(0, 0.3, 5.0); g.add(noz);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.14, 8, 24), MAT.foeRed); ring.position.set(0, 0.3, 5.62); g.add(ring);
    const hot = new THREE.Mesh(new THREE.CircleGeometry(0.84, 20), MAT.foeEngine); hot.position.set(0, 0.3, 5.71); g.add(hot);
    const ex = glowSprite(T.glowO, '#ffffff', 4.4); ex.position.set(0, 0.3, 6.3); g.add(ex);
    [-1, 1].forEach((s) => {
      const M = (pts) => (s > 0 ? pts : pts.map((q) => [-q[0], q[1]]));
      const wl = new THREE.Group(); wl.position.set(s * 2.2, 0, 0); wl.rotation.z = -s * 0.36; g.add(wl);   // the outer wing, drooping
      wl.add(extrudeXZ(M([[0, -3.2], [2.0, -1.2], [3.9, 0.6], [4.1, 1.8], [3.0, 2.2], [0.8, 3.0], [0, 3.2]]), 0.5, MAT.foe, 0.22));
      const st = extrudeXZ(M([[0.4, -2.6], [2.0, -1.0], [3.7, 0.55], [3.5, 0.85], [1.8, -0.65], [0.2, -2.2]]), 0.04, MAT.foeRed, 0.02); st.position.y = 0.47; wl.add(st);   // red leading edges
      for (let k = 0; k < 3; k++) { const gl = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.14), MAT.amber); gl.position.set(s * 1.5, 0.48, 0.6 + k * 0.5); gl.rotation.y = s * 0.35; wl.add(gl); }   // glowing vents
      const pod = cyl(0.36, 0.4, 3.8, 14, MAT.foe2); pod.position.set(s * 3.75, -0.62, -0.2); wl.add(pod);
      const pc = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), MAT.foe2); pc.scale.z = 1.6; pc.position.set(s * 3.75, -0.62, -2.1); wl.add(pc);
      const gun = cyl(0.1, 0.13, 2.4, 8, MAT.gun); gun.position.set(s * 3.75, -0.62, -3.2); wl.add(gun);
      const mz = glowSprite(T.glowR, '#ffffff', 1.0, 0.8); mz.position.set(s * 3.75, -0.62, -4.7); wl.add(mz);
      const pr = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 6, 16), MAT.foeRed); pr.position.set(s * 3.75, -0.62, 1.2); wl.add(pr);
      const pf = extrudeYZ([[0, 0.2], [-1.0, 1.0], [-1.0, 1.6], [0, 1.7]], 0.1, MAT.foe, 0.03); pf.position.set(s * 3.75, -0.95, 0); wl.add(pf);   // a fin under each pod
      const tn = cyl(0.36, 0.3, 0.9, 12, MAT.gun); tn.position.set(s * 1.7, 0.1, 3.85); g.add(tn);
      const th = new THREE.Mesh(new THREE.CircleGeometry(0.3, 14), MAT.foeEngine); th.position.set(s * 1.7, 0.1, 4.36); g.add(th);
      const te = glowSprite(T.glowO, '#ffffff', 2.0); te.position.set(s * 1.7, 0.1, 4.7); g.add(te);
    });
    g.userData.nav = [-1, 1].map((s) => { const n = glowSprite(T.spark, '#ff3020', 1.3); n.position.set(s * 6.1, -1.0, 1.4); g.add(n); return n; });
    const eye = glowSprite(T.glowO, '#ffb070', 2.4, 0.9); eye.position.set(0, 1.25, -3.6); g.add(eye);
    g.userData.ex = [new THREE.Vector3(0, 0.3, 6.0), new THREE.Vector3(-1.7, 0.1, 4.5), new THREE.Vector3(1.7, 0.1, 4.5)]; g.userData.exW = 2.2; g.userData.exL = 7;
    dogify(g, { head: [0, 1.15, -4.4, 2.1], back: [0, 1.2, -0.3, 1.4, 0.7, 3.0], tail: [0, 1.7, 2.6, 0.7], collar: [0.75, -2.0, 1.6, 1.3], role: role });   // (v34)
    bake(g); findTail(g); g.scale.setScalar(2.5);
    return shadows(g, true);
  }
  function makeHeavy() {   // the Anvil: a six-sided armoured hull, sloped like a tank's; a missile pod each side with its warheads showing, a chin turret, a gun on its back, three engines
    const g = new THREE.Group();
    const prof = [[0.001, 7.0], [1.4, 6.4], [2.3, 5.0], [2.7, 2.8], [2.7, -3.0], [2.3, -5.2], [1.4, -5.8], [0.001, -5.8]].map((p) => new THREE.Vector2(p[0], p[1]));
    const hg = new THREE.LatheGeometry(prof, 6); hg.rotateX(-Math.PI / 2); hg.rotateZ(Math.PI / 6); hg.scale(1.15, 0.62, 1); g.add(new THREE.Mesh(hg, MAT.foe));
    const Y = 0.3;   // (what sits on its back, raised to the hull's flat top)
    const deck = extrudeXZ([[0, -4.4], [1.9, -2.6], [2.0, 3.8], [-2.0, 3.8], [-1.9, -2.6]], 0.8, MAT.foe2, 0.25); deck.position.y = 1.55 + Y; g.add(deck);
    const cab = extrudeXZ([[-0.9, -4.1], [0.9, -4.1], [1.25, -3.0], [1.25, -0.9], [-1.25, -0.9], [-1.25, -3.0]], 0.7, MAT.foe, 0.2); cab.position.y = 2.05 + Y; g.add(cab);   // the armoured cockpit
    const vis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.34, 0.8), MAT.foeVisor); vis.position.set(0, 2.2 + Y, -4.15); vis.rotation.x = -0.5; g.add(vis);
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 10), MAT.foe2); chin.position.set(0, -1.5, -4.0); g.add(chin);   // the chin turret
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.foe2); dome.position.set(0, 2.15 + Y, 1.8); g.add(dome);   // a gun on its back
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.06), MAT.gun); mast.position.set(0.9, 3.0 + Y, 2.8); g.add(mast);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 6, 0, Math.PI * 2, 0, Math.PI / 3), MAT.gun); dish.position.set(-1.1, 2.3 + Y, 2.9); dish.rotation.x = -0.9; g.add(dish);
    const cn = cyl(1.05, 0.92, 1.0, 18, MAT.gun); cn.position.set(0, 0.0, 6.2); g.add(cn);
    const ch = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), MAT.foeEngine); ch.position.set(0, 0.0, 6.76); g.add(ch);
    const ce = glowSprite(T.glowO, '#ffffff', 4.2); ce.position.set(0, 0.0, 7.3); g.add(ce);
    [-1, 1].forEach((s) => {
      const px = s * 4.7;
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 1.2), MAT.foeVisor); sw.position.set(s * 1.47, 2.2 + Y, -2.6); g.add(sw);   // side windows
      const b = cyl(0.14, 0.18, 3.4, 10, MAT.gun); b.position.set(s * 0.42, -1.6, -5.7); g.add(b);
      const mz = glowSprite(T.glowR, '#ffffff', 1.1, 0.8); mz.position.set(s * 0.42, -1.6, -7.6); g.add(mz);
      const db = cyl(0.1, 0.12, 2.6, 8, MAT.gun); db.position.set(s * 0.32, 2.75 + Y, 0.2); g.add(db);
      const pod = cyl(1.2, 1.25, 7.6, 18, MAT.foe2); pod.position.set(px, -0.2, 0.6); g.add(pod);
      const face = cyl(1.12, 1.12, 0.3, 18, MAT.dark); face.position.set(px, -0.2, -3.3); g.add(face);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.52, wh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.62, 10), MAT.foeRed); wh.rotation.x = -Math.PI / 2; wh.position.set(px + Math.cos(a) * 0.68, -0.2 + Math.sin(a) * 0.68, -3.7); g.add(wh); }   // the warheads in their tubes
      const mid = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), MAT.foeRed); mid.position.set(px, -0.2, -3.5); g.add(mid);
      [-2.3, 2.9].forEach((z) => { const r = cyl(1.34, 1.34, 0.45, 18, MAT.gun); r.position.set(px, -0.2, z); g.add(r); });
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 6.2), MAT.gun); rail.position.set(px + s * 1.2, -0.2, 0.6); g.add(rail);
      const noz = cyl(0.88, 0.76, 0.7, 16, MAT.gun); noz.position.set(px, -0.2, 4.7); g.add(noz);
      const hot = new THREE.Mesh(new THREE.CircleGeometry(0.76, 18), MAT.foeEngine); hot.position.set(px, -0.2, 5.11); g.add(hot);
      const ex = glowSprite(T.glowO, '#ffffff', 3.6); ex.position.set(px, -0.2, 5.6); g.add(ex);
      const strut = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 3.2), MAT.foe); strut.position.set(s * 3.5, -0.1, 0.8); g.add(strut);
      const pl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, 5.2), MAT.foe2); pl.position.set(s * 3.25, -0.15, 0.4); g.add(pl);   // side armour
      for (let k = 0; k < 4; k++) { const wn = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.5), MAT.amber); wn.position.set(s * 2.3, 1.62 + Y, -1.8 + k * 1.15); g.add(wn); }   // lit ports
      const fin = extrudeYZ([[0, 1.8], [1.6, 3.0], [1.7, 3.8], [0, 4.4]], 0.2, MAT.foe, 0.06); fin.position.set(px, 0.95, 0); g.add(fin);   // a fin on each pod
      const ft = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.8), MAT.foeRed); ft.position.set(px, 2.55, 3.4); g.add(ft);
    });
    g.userData.nav = [-1, 1].map((s) => { const n = glowSprite(T.spark, '#ff3020', 1.4); n.position.set(s * 6.0, 0.4, 0.6); g.add(n); return n; });
    const eye = glowSprite(T.glowO, '#ffb070', 3.0, 0.95); eye.position.set(0, 2.3 + Y, -4.5); g.add(eye);
    g.userData.ex = [new THREE.Vector3(-4.7, -0.2, 5.3), new THREE.Vector3(4.7, -0.2, 5.3), new THREE.Vector3(0, 0, 6.9)]; g.userData.exW = 2.8; g.userData.exL = 9;
    dogify(g, { head: [0, 1.0, -5.0, 3.0], back: [0, 1.6, 0.4, 2.6, 1.3, 4.2], tail: [0, 2.8, 4.8, 1.0], collar: [1.0, -2.4, 2.6, 2.1] });   // (v34) the Fluffball: all fluff
    bake(g); findTail(g); g.scale.setScalar(2.7);   // (was 2.35)
    return shadows(g, true);
  }
  function makeWarden() {   // the Warden: a gunship as wide as the canyon floor, its blunt armoured front towards you (+z), gun pods, engines, a core
    const g = new THREE.Group(), PT = {};
    g.add(extrudeXZ([[-13, 11], [13, 11], [20, 3], [20, -13], [11, -19], [-11, -19], [-20, -13], [-20, 3]], 9, MAT.foe, 1.4));
    const deck = extrudeXZ([[-8, 5], [8, 5], [11, -2], [11, -14], [-11, -14], [-11, -2]], 5, MAT.foe2, 0.8); deck.position.y = 6.5; g.add(deck);
    const win = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 0.4), MAT.foeVisor); win.position.set(0, 7.6, 5.4); win.rotation.x = -0.4; g.add(win);
    // (v20b, panel 2: at its new size the flat slab with one red bar read as a box) an armoured face - five ribs with glowing slits between,
    // a heavy jaw, two lamps for eyes - a bridge tower with its window strip and a mast, side sponsons, a keel, nav lights, a hot exhaust
    for (let i = -2; i <= 2; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(3.4, 6.4, 1.6), MAT.foe2); rib.position.set(i * 4.6, 4.2, 11.4); rib.rotation.x = -0.18; g.add(rib);
      if (i < 2) { const slit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.6, 0.5), MAT.red); slit.position.set(i * 4.6 + 2.3, 4.2, 11.5); slit.rotation.x = -0.18; g.add(slit); }
    }
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(28, 2.2, 3.6), MAT.foe); jaw.position.set(0, 0.2, 11.2); g.add(jaw);
    bossHead(g, 0, 3.5, 15.5, 9, 1, 0.62);   // (v35) the Gaoler: a huge black cockapoo's face on its front, eyes glowing red, a spiked collar (its core below the chin)
    const jawRed = new THREE.Mesh(new THREE.BoxGeometry(22, 0.5, 0.4), MAT.foeRed); jawRed.position.set(0, -0.5, 13.05); g.add(jawRed);
    [-1, 1].forEach((sx) => {
      const lampH = cyl(1.5, 1.8, 1.6, 12, MAT.gun); lampH.rotation.x = Math.PI / 2; lampH.position.set(sx * 11, 7.4, 11.6); g.add(lampH);
      const eye = glowSprite(T.glowO, '#ffd890', 4.2); eye.position.set(sx * 11, 7.4, 12.8); g.add(eye);
      const spon = extrudeXZ([[-2.5, 6], [2.5, 6], [3, -12], [-3, -12]], 5, MAT.foe, 0.6); spon.position.set(sx * 21.5, -0.5, 0); g.add(spon);
      for (let v = 0; v < 4; v++) { const vent = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.6, 2.2), MAT.gun); vent.position.set(sx * 24.2, 2, 3 - v * 3.4); g.add(vent); }
      const nav = glowSprite(T.glowR, sx < 0 ? '#ff3020' : '#30ff60', 2.2); nav.position.set(sx * 24, 4.8, 5.6); g.add(nav);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 9), MAT.foe2); fin.position.set(sx * 6, -3.2, -8); g.add(fin);
    });
    const tower = extrudeXZ([[-4, 2], [4, 2], [5, -6], [-5, -6]], 4.2, MAT.foe2, 0.5); tower.position.set(0, 10.6, -4); g.add(tower);
    const twin = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.8, 0.3), MAT.foeVisor); twin.position.set(0, 13.3, -1.85); twin.rotation.x = -0.25; g.add(twin);
    const mast = cyl(0.25, 0.35, 7, 6, MAT.gun); mast.position.set(2.4, 17.5, -6); g.add(mast);
    const mastL = glowSprite(T.glowR, '#ff4030', 2); mastL.position.set(2.4, 21.2, -6); g.add(mastL);
    const keel = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 24), MAT.gun); keel.position.set(0, -2, -4); g.add(keel);
    const exh = glowSprite(T.glowO, '#ffffff', 9); exh.position.set(0, 4, -20); g.add(exh);
    for (let i = 0; i < 18; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1 + (i % 3), 0.8, 1.5 + (i % 4)), MAT.gun); b.position.set(-16 + (i * 7.3) % 32, 5 + (i % 2) * 0.3, -16 + (i * 5.1) % 26); g.add(b); }
    function gunPod(x) {
      const q = new THREE.Group(); q.position.set(x, -4, 4);
      q.add(new THREE.Mesh(new THREE.SphereGeometry(3, 16, 10), MAT.foe2));
      [-0.9, 0.9].forEach((dx) => { const b = cyl(0.35, 0.45, 6, 10, MAT.gun); b.position.set(dx, 0, 3.4); q.add(b); const m = glowSprite(T.glowR, '#ffffff', 1.3); m.position.set(dx, 0, 6.6); q.add(m); });
      g.add(q); return q;
    }
    function engine(x) {
      const q = new THREE.Group(); q.position.set(x, 4, -12);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x) - 14, 1.6, 7), MAT.foe); wing.position.set(-Math.sign(x) * (Math.abs(x) - 14) / 2, -1, 0); q.add(wing);
      q.add(cyl(4.6, 5.2, 11, 18, MAT.foe2));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.7, 0.5, 8, 24), MAT.foeRed); ring.position.z = 5.6; q.add(ring);
      const fan = new THREE.Mesh(new THREE.CircleGeometry(4.2, 20), MAT.foeEngine); fan.position.z = -5.6; fan.rotation.y = Math.PI; q.add(fan);
      const ex = glowSprite(T.glowO, '#ffffff', 12); ex.position.z = -7; q.add(ex);
      g.add(q); return q;
    }
    PT.gunL = gunPod(-15); PT.gunR = gunPod(15); PT.engL = engine(-22); PT.engR = engine(22);
    const core = new THREE.Group(); core.position.set(0, -7, 6); g.add(core);
    core.add(new THREE.Mesh(new THREE.TorusGeometry(3.6, 1.1, 10, 20), MAT.foe2));
    core.add(new THREE.Mesh(new THREE.SphereGeometry(2.6, 18, 12), MAT.foeCore));
    core.add(glowSprite(T.glowR, '#ffffff', 9));
    const sh = new THREE.Mesh(new THREE.SphereGeometry(6.5, 24, 16), shieldMat(new THREE.Color(0.4, 1.5, 2.6), 1.2)); core.add(sh);
    PT.core = core; PT.shield = sh;
    g.userData.parts = PT;
    shadows(g, true); sh.castShadow = false;
    g.scale.setScalar(2.4);   // (v20: 1.6 x 1.5 - it fills a third of the picture; engine.js spawnWarden moved its parts out the same)
    return g;
  }
  function makeDrone() {   // (v35) a floating DOG BONE with a red eye in the middle (the eye faces +z: it is turned to look at you)
    const g = new THREE.Group();
    { const b = new THREE.Mesh(boneGeo(), MAT.boneW); b.scale.setScalar(2.3); g.add(b); const eye = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 10), MAT.red); eye.position.z = 0.75; g.add(eye); const glow = glowSprite(T.glowR, '#ffffff', 3.4); glow.position.z = 1.0; g.add(glow); g.scale.setScalar(1.3); return shadows(g, true); }
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), MAT.dark));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.24, 8, 32), MAT.hull); ring.rotation.x = Math.PI / 2; g.add(ring);
    for (let i = 0; i < 4; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 1.1), MAT.hull); const a = i * Math.PI / 2; v.position.set(Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9); v.rotation.y = -a; g.add(v); }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 10), MAT.red); eye.position.z = 1.3; g.add(eye);
    const glow = glowSprite(T.glowR, '#ffffff', 3.4); glow.position.z = 1.5; g.add(glow);
    g.scale.setScalar(1.3);
    return shadows(g, true);
  }
  function makeTurret() {   // a RIM GUN (28 Oct: bigger, up on a pylon right at the canyon's lip so you see it from below): a footing sunk in the rock, a
    // pylon, an armoured drum with a red band, a turning head with a long twin cannon (along +z: turned to aim at you), a red sensor eye, a lamp
    const g = new THREE.Group();
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 6.4, 3, 8), MAT.dark); foot.position.y = -10; g.add(foot);
    const pyl = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.6, 8, 8), MAT.gun); pyl.position.y = -5.2; g.add(pyl);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 7.5, 0.9), MAT.dark); b.position.set(Math.cos(a) * 3.4, -6.4, Math.sin(a) * 3.4); b.lookAt(Math.cos(a) * 6.4, -12, Math.sin(a) * 6.4); b.rotateX(Math.PI / 2); g.add(b); }
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 3.6, 14), MAT.foe2); drum.position.y = -0.6; g.add(drum);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(4.66, 4.66, 0.7, 14), MAT.foeRed); band.position.y = -1.7; g.add(band);
    const head = new THREE.Group(); head.position.y = 1.4; g.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(3.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.foe));
    const mant = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.6, 3.4), MAT.dark); mant.position.set(0, 1.2, 2.3); head.add(mant);
    [-1, 1].forEach((sd) => {
      const b = cyl(0.42, 0.52, 8.6, 12, MAT.gun); b.position.set(sd * 1.3, 1.2, 7.4); head.add(b);
      const sl = cyl(0.66, 0.66, 2.2, 12, MAT.dark); sl.position.set(sd * 1.3, 1.2, 4.6); head.add(sl);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12), MAT.red); m.rotation.x = Math.PI / 2; m.position.set(sd * 1.3, 1.2, 11.75); head.add(m);
    });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 10), MAT.red); eye.position.set(0, 2.7, 2.9); head.add(eye);
    const eg = glowSprite(T.glowR, '#ffffff', 3.4); eg.position.set(0, 2.7, 3.6); head.add(eg);
    const lamp = glowSprite(T.glowR, '#ffffff', 3); lamp.position.y = 5.6; g.add(lamp);
    g.userData.head = head; g.userData.lamp = lamp;
    return shadows(g, true, true);
  }
  function makeBunker() {   // a gun BUNKER set into the canyon wall (front -z, turned to face across the canyon): an angled armoured casemate running back
    // into the rock, a glowing firing slit, hazard stripes, a ball-mounted cannon that follows you, a red lamp
    const g = new THREE.Group();
    g.add(extrudeXZ([[-5, -2], [5, -2], [6.6, 4], [6.6, 22], [-6.6, 22], [-6.6, 4]], 7.5, MAT.dark, 0.5));
    const roof = extrudeXZ([[-4.4, -1.2], [4.4, -1.2], [6, 4], [6, 22], [-6, 22], [-6, 4]], 1.4, MAT.foe2, 0.35); roof.position.y = 4.3; g.add(roof);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.75, 0.3), MAT.red); slit.position.set(0, 2, -2.2); g.add(slit);
    [-1, 1].forEach((sd) => { for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.4, 0.25), k % 2 ? MAT.dark : MAT.foeRed); st.position.set(sd * (4.1 + k * 0.7), 0, -2.15); g.add(st); } });
    const head = new THREE.Group(); head.position.set(0, -0.8, -2.6); g.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(2.2, 18, 12), MAT.foe));
    const b = cyl(0.45, 0.58, 7.4, 12, MAT.gun); b.position.set(0, 0, 4); head.add(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.3, 12), MAT.red); m.rotation.x = Math.PI / 2; m.position.set(0, 0, 7.8); head.add(m);
    const lamp = glowSprite(T.glowR, '#ffffff', 2.8); lamp.position.set(5.6, 4.2, -2.4); g.add(lamp);
    g.userData.head = head; g.userData.lamp = lamp;
    return shadows(g, true, true);
  }
  function makeGate() {   // a ring of light hung in the valley, with four beacon housings
    const g = new THREE.Group(), mat = ADD(new THREE.Color(0.25, 2.4, 3.2));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 8, 72), mat); g.add(ring);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1, 0.13, 8, 72), ADD(new THREE.Color(0.05, 0.5, 0.8), { opacity: 0.5 })); g.add(halo);
    const film = new THREE.Mesh(new THREE.CircleGeometry(0.98, 48), ADD(new THREE.Color(0.05, 0.4, 0.6), { opacity: 0.12, side: THREE.DoubleSide })); g.add(film);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), MAT.dark); b.position.set(Math.cos(a) * 1.04, Math.sin(a) * 1.04, 0); b.rotation.z = a; g.add(b); }
    [0, 1, 2, 3].forEach((i) => {   // (v36) a paw print at each quarter of the ring
      const a = i * Math.PI / 2, pw = new THREE.Group(); pw.position.set(Math.cos(a + Math.PI / 4) * 1.3, Math.sin(a + Math.PI / 4) * 1.3, 0.02); pw.rotation.z = a + Math.PI / 4 - Math.PI / 2; pw.scale.setScalar(1.7); g.add(pw);
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), mat); pad.scale.set(1.15, 0.9, 1); pad.position.y = -0.02; pw.add(pad);
      [[-0.11, 0.07], [-0.04, 0.12], [0.04, 0.12], [0.11, 0.07]].forEach((q) => { const t = new THREE.Mesh(new THREE.CircleGeometry(0.038, 14), mat); t.scale.y = 1.2; t.position.set(q[0], q[1], 0); pw.add(t); });
    });
    g.userData.mats = [mat, halo.material, film.material];
    return g;
  }
  function rockColours(g, height, lift) {   // a piece of rock: a little light and shade in the vertices, the layers added per pixel by its height above the floor
    const pos = g.attributes.position, cols = new Float32Array(pos.count * 3), wall = new Float32Array(pos.count), hgt = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) { const v = 0.9 + vnoise(pos.getX(i) * 3, pos.getZ(i) * 3) * 0.18; cols[i * 3] = v; cols[i * 3 + 1] = v; cols[i * 3 + 2] = v; wall[i] = 1; hgt[i] = (pos.getY(i) + 0.5) * height + lift; }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.setAttribute('wall', new THREE.BufferAttribute(wall, 1)); g.setAttribute('hgt', new THREE.BufferAttribute(hgt, 1)); g.setAttribute('base', new THREE.BufferAttribute(new Float32Array(pos.count), 1));
  }
  const ARCH_GEO = (function () {   // a unit rock bridge: ends higher where it meets the walls, a rough top, a clean underside
    const g = new THREE.BoxGeometry(1, 1, 1, 30, 6, 4), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), lift = Math.pow(Math.abs(x * 2), 4) * 0.45;
      const n = fbm(x * 9 + 3, z * 5 + y * 3, 3) - 0.5, bottom = y < -0.45;
      pos.setXYZ(i, x + n * 0.01, y + lift + (bottom ? Math.max(0, n) * 0.08 : n * 0.16) + (y > 0.45 ? Math.abs(n) * 0.25 : 0), z * (1 + n * 0.5));
    }
    g.computeVertexNormals(); rockColours(g, 16, 18); return g;
  })();
  function makeArch() { const m = new THREE.Mesh(ARCH_GEO, MAT.rock); m.castShadow = true; m.receiveShadow = true; return m; }
  const PILLAR_GEO = (function () {   // a unit hoodoo: a rough column with a wider cap rock
    const g = new THREE.CylinderGeometry(1, 1.25, 1, 10, 16), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
      const k = 1 + (fbm(a * 1.6 + 4, y * 7, 3) - 0.5) * 0.55 + (y > 0.42 ? 0.45 : 0) - Math.max(0, 0.3 - Math.abs(y - 0.3)) * 0.4;
      pos.setXYZ(i, Math.cos(a) * r * k, y, Math.sin(a) * r * k);
    }
    g.computeVertexNormals(); rockColours(g, 95, -6); return g;
  })();
  function makePillar() { const m = new THREE.Mesh(PILLAR_GEO, MAT.rock); m.castShadow = true; m.receiveShadow = true; return m; }
  const BUTTE_GEO = [0, 1, 2, 3].map((v) => {   // (v18) a BUTTE, unit size: a skirt of fallen rock, a cliff of layered rock, a caprock ledge, a flat top - four outlines
    const g = new THREE.CylinderGeometry(1, 1, 1, 32, 24), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i) + 0.5, z = pos.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
      const prof = (y < 0.16 ? 1.7 - Math.pow(y / 0.16, 0.7) * 0.6 : y < 0.24 ? 1.1 - (y - 0.16) / 0.08 * 0.1 : y > 0.86 && y < 0.93 ? 0.94 : 1 - (Math.sin(y * 31 + v) > 0.55 ? 0.05 : 0)) * (1 - 0.12 * y);
      const gully = Math.pow(Math.abs(Math.sin(a * (5 + v) + fbm(a, v, 2) * 3)), 6) * 0.13 * (y > 0.2 ? 1 : 0);   // (vertical clefts down the cliffs)
      const lobe = 1 + (fbm(Math.cos(a) * 1.7 + v * 5.3, Math.sin(a) * 1.7 + v * 2.1, 4) - 0.5) * 1.0 + (vnoise(a * 6 + v * 9, y * 12) - 0.5) * 0.12 - gully;
      pos.setXYZ(i, Math.cos(a) * r * prof * lobe, y + (y > 0.99 ? (vnoise(a * 3, v) - 0.5) * 0.02 : 0), Math.sin(a) * r * prof * lobe);
    }
    g.computeVertexNormals(); rockColours(g, 82, -45); return g;   // (its layers run from the dark rock at its foot to the pale cap)
  });
  const WATER = (function () {   // (v18) the gorge's river: green water, white foam along its banks and over the rapids, ripples
    const c = canvas(256, 1024), x = c.getContext('2d'), r = rng(61); x.scale(2, 2);   // (drawn at twice the detail: at 4K the river is close)
    const g0 = x.createLinearGradient(0, 0, 128, 0); g0.addColorStop(0, '#5f6a4a'); g0.addColorStop(0.07, '#3d5a48'); g0.addColorStop(0.18, '#1f4a42'); g0.addColorStop(0.5, '#0d3431'); g0.addColorStop(0.82, '#1f4a42'); g0.addColorStop(0.93, '#3d5a48'); g0.addColorStop(1, '#5f6a4a'); x.fillStyle = g0; x.fillRect(0, 0, 128, 512);
    for (let yy = 0; yy < 512; yy++) for (let sd = 0; sd < 2; sd++) {   // (v22) a soft foam line along each bank, broken up row by row - no rectangles
      const w = 2.5 + 3.5 * (0.5 + 0.5 * Math.sin(yy * 0.07 + sd * 2.1)) * (0.6 + 0.4 * vnoise(yy * 0.05, sd * 9)), a = 0.22 + 0.3 * vnoise(yy * 0.11, sd * 5 + 3);
      const gf = x.createLinearGradient(sd ? 128 : 0, 0, sd ? 128 - w * 2 : w * 2, 0); gf.addColorStop(0, `rgba(232,240,236,${a})`); gf.addColorStop(1, 'rgba(232,240,236,0)'); x.fillStyle = gf; x.fillRect(sd ? 128 - w * 2 : 0, yy, w * 2, 1);
    }
    x.filter = 'blur(1.2px)';   // the current: faint, soft lines down the stream
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(150,200,190,${0.03 + r() * 0.05})`; x.beginPath(); x.ellipse(16 + r() * 96, r() * 512, 0.7 + r() * 0.8, 10 + r() * 34, 0, 0, Math.PI * 2); x.fill(); }
    x.filter = 'none';
    const map = tex(c); map.wrapS = THREE.ClampToEdgeWrapping; map.wrapT = THREE.RepeatWrapping;
    const n = canvas(256, 256), nx = n.getContext('2d'), img = nx.createImageData(256, 256), H = (a, b) => vnoise(a * 0.045, b * 0.0175) + 0.5 * vnoise(a * 0.105 + 7, b * 0.04 + 3) + 0.25 * vnoise(a * 0.24 + 1, b * 0.11 + 9);   // (v22: finer, three octaves)
    for (let yy = 0; yy < 256; yy++) for (let xx = 0; xx < 256; xx++) {
      const dx = H(xx + 1, yy) - H(xx - 1, yy), dy = H(xx, yy + 1) - H(xx, yy - 1), k = (yy * 256 + xx) * 4;
      img.data[k] = 128 + dx * 160; img.data[k + 1] = 128 + dy * 160; img.data[k + 2] = 255; img.data[k + 3] = 255;
    }
    nx.putImageData(img, 0, 0); const nrm = tex(n); nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping;
    return { map: map, nrm: nrm };
  })();
  MAT.water = S({ color: '#ffffff', map: WATER.map, normalMap: WATER.nrm, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.08, metalness: 0, envMapIntensity: 0.9 });
  MAT.wreck = P({ color: '#2b2725', metalness: 0.35, roughness: 0.75, bumpMap: PANEL2, bumpScale: 1, clearcoat: 0 });
  MAT.radiator = S({ color: '#200800', emissive: '#ff5a1a', emissiveIntensity: 1.7, metalness: 0.4, roughness: 0.5 });
  function makeKeelGun() {   // (v18) her KEEL GUN: a carriage on the track along her keel, a heavy ball turret hanging under it, two long barrels
    const g = new THREE.Group();
    const car = new THREE.Mesh(new THREE.BoxGeometry(26, 7, 34), MAT.foeHull2); car.position.y = 24; g.add(car);   // (the carriage up on the track: 24 above the gun)
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => { const w = cyl(2.4, 2.4, 3, 14, MAT.gun); w.rotation.y = Math.PI / 2; w.position.set(sx * 10.5, 27.6, sz * 12); g.add(w); }));
    const arm = cyl(3, 4, 19, 14, MAT.gun); arm.rotation.x = Math.PI / 2; arm.position.y = 12; g.add(arm);
    [-1, 1].forEach((sz) => { const brace = new THREE.Mesh(new THREE.BoxGeometry(2, 16, 2), MAT.foeHull2); brace.position.set(0, 14, sz * 9); brace.rotation.x = sz * 0.45; g.add(brace); });
    const head = new THREE.Group(); g.add(head);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(8, 24, 16), MAT.foe); ball.scale.y = 0.75; head.add(ball);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(9, 2, 1), MAT.foeVisor); visor.position.set(0, 2.2, 7.2); head.add(visor);
    [-2.6, 2.6].forEach((x) => { const b = cyl(1, 1.3, 22, 12, MAT.gun); b.position.set(x, -0.6, 13); head.add(b); const m = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.6, 12), MAT.red); m.rotation.x = Math.PI / 2; m.position.set(x, -0.6, 24); head.add(m); });
    const lamp = glowSprite(T.glowR, '#ffffff', 6); lamp.position.set(0, 30, 0); g.add(lamp);
    g.userData = { head: head, lamp: lamp };
    shadows(g, true); return g;
  }
  function makeRocket() {   // your rocket (27 Oct: bigger, a white-hot motor; its plume and smoke trail are drawn with it)
    const g = new THREE.Group();
    g.add(cyl(0.38, 0.38, 3.4, 12, MAT.rocket));
    const band = cyl(0.4, 0.4, 0.5, 12, MAT.rocketRed); band.position.z = -0.7; g.add(band);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.2, 12), MAT.rocketRed); nose.rotation.x = -Math.PI / 2; nose.position.z = -2.3; g.add(nose);
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 1.0), MAT.rocketRed); f.rotation.z = i * Math.PI / 2 + Math.PI / 4; f.position.z = 1.3; f.translateY(0.62); g.add(f); }
    const noz = cyl(0.34, 0.26, 0.4, 12, MAT.gun); noz.position.z = 1.9; g.add(noz);
    const fl = glowSprite(T.glowO, '#ffffff', 3.6); fl.position.z = 2.2; g.add(fl);
    const core = glowSprite(T.glowC, '#ffffff', 1.6); core.position.z = 2.15; g.add(core);
    g.userData.flame = fl;
    return g;
  }
  function makeMissile() {   // an enemy missile: a dark dart with a red head and a hot motor
    const g = new THREE.Group();
    g.add(cyl(0.3, 0.3, 3, 10, MAT.gun));
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1, 10), MAT.foeRed); nose.rotation.x = -Math.PI / 2; nose.position.z = -2; g.add(nose);
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.7), MAT.gun); f.rotation.z = i * Math.PI / 2; f.position.z = 1.2; f.translateY(0.45); g.add(f); }
    const fl = glowSprite(T.glowO, '#ffffff', 3.4); fl.position.z = 1.9; g.add(fl);
    const lamp = glowSprite(T.glowR, '#ffffff', 2.2); lamp.position.z = -2.4; g.add(lamp);
    g.userData.flame = fl; g.userData.lamp = lamp;
    return g;
  }
  function makeWTurret(kind) {   // a gun on the warship: an armoured base, a head that turns to follow you, two barrels (along +z)
    const g = new THREE.Group(), flak = kind === 'flak';
    const base = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 6.2, 3, 10), MAT.foe2); base.position.y = 0.5; g.add(base);
    const head = new THREE.Group(); head.position.y = 3.2; g.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(4, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.foe));
    const block = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4), MAT.foe); block.position.set(0, 1.4, 1.2); head.add(block);
    [-1.3, 1.3].forEach((x) => { const b = cyl(flak ? 0.7 : 0.35, flak ? 0.8 : 0.45, flak ? 6 : 9, 10, MAT.gun); b.position.set(x, 1.6, flak ? 5.5 : 7); head.add(b); const m = glowSprite(flak ? T.glowO : T.glowR, '#ffffff', flak ? 2 : 1.6, 0.8); m.position.set(x, 1.6, flak ? 8.6 : 11.6); head.add(m); });
    const lamp = glowSprite(T.glowR, '#ffffff', 3); lamp.position.y = 6.8; g.add(lamp);
    g.userData.head = head; g.userData.lamp = lamp;
    return shadows(g, true, true);
  }
  function makeGen() {   // (v36) a shield generator - now a giant DOG BOWL, steel with a red band and paw prints, heaped with glowing kibble, between the posts of an outrigger
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.LatheGeometry([[6, -9], [10, -9], [10.6, -8.2], [15.5, 4.5], [16, 5.6], [15.2, 6], [10.6, -6.6], [0.1, -7.2]].map((p) => new THREE.Vector2(p[0], p[1])), 40), MAT.bowl); g.add(bowl);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(14.3, 12.4, 3.4, 40, 1, true), MAT.bowlRed); band.position.y = 0.6; g.add(band);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5, pw = new THREE.Group(); pw.position.set(Math.cos(a) * 13.8, -3.4, Math.sin(a) * 13.8); pw.rotation.y = -a + Math.PI / 2; pw.rotation.x = 0.36; g.add(pw);
      const pad = new THREE.Mesh(new THREE.CircleGeometry(1.0, 18), MAT.white2); pad.scale.set(1.15, 0.9, 1); pw.add(pad); [[-1.1, 0.75], [-0.4, 1.25], [0.4, 1.25], [1.1, 0.75]].forEach((q) => { const t = new THREE.Mesh(new THREE.CircleGeometry(0.38, 12), MAT.white2); t.position.set(q[0], q[1], 0); pw.add(t); }); }
    const core = new THREE.Mesh(lumpy(new THREE.IcosahedronGeometry(9, 3), 0.5, 3), MAT.genCore.clone()); core.scale.y = 0.45; core.position.y = 2.5; g.add(core);   // the kibble, glowing
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(15.6, 0.7, 8, 48), MAT.foe2); r1.rotation.x = Math.PI / 2; r1.position.y = 5.8; g.add(r1);
    const r2 = new THREE.Group(); { const b = new THREE.Mesh(boneGeo(), MAT.boneW); b.scale.setScalar(2.8); b.position.set(0, 0, 0); r2.add(b); } r2.position.set(0, 10, 0); g.add(r2);   // a bone floating over it
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 34, 1.2), MAT.gun); b.position.set(Math.cos(a) * 13, 0, Math.sin(a) * 13); g.add(b); }
    const glow = glowSprite(T.glowC, '#9fffd8', 34, 0.9); g.add(glow);
    g.userData = { core: core, r1: r1, r2: r2, glow: glow };
    return g;
  }
  function makeMainGun() {   // her main gun: a big twin-barrelled turret on her back
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(14, 16, 6, 16), MAT.foe2));
    const house = new THREE.Group(); house.position.y = 6; g.add(house);
    house.add(new THREE.Mesh(new THREE.BoxGeometry(22, 10, 26), MAT.foe));
    const barrels = new THREE.Group(); barrels.position.set(0, 1, 10); house.add(barrels);
    [-4.5, 4.5].forEach((x) => { const b = cyl(1.6, 2, 42, 14, MAT.gun); b.position.set(x, 0, 21); barrels.add(b); const r = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.6, 8, 16), MAT.foeRed); r.position.set(x, 0, 40); barrels.add(r); });
    g.userData = { house: house, barrels: barrels, kick: 0 };
    return shadows(g, true, true);
  }

  // the Lancer: your fighter (white with orange stripes, swept wings with a cannon on each tip, twin tail fins, two blue engines)
  const LANCER = (function () {
    const g = new THREE.Group(), flames = [], glows = [];
    const prof = [[0, 7.2], [0.3, 6.7], [0.64, 5.6], [0.94, 3.8], [1.14, 1.6], [1.22, -0.6], [1.16, -2.6], [0.96, -3.9], [0.7, -4.3], [0.001, -4.35]].map((p) => new THREE.Vector2(p[0], p[1]));
    const fg = new THREE.LatheGeometry(prof, 28); fg.rotateX(-Math.PI / 2); fg.scale(1, 0.8, 1); g.add(new THREE.Mesh(fg, MAT.white));
    const bg = new THREE.LatheGeometry([new THREE.Vector2(0.99, 4.15), new THREE.Vector2(1.06, 3.15)], 28); bg.rotateX(-Math.PI / 2); bg.scale(1, 0.8, 1); g.add(new THREE.Mesh(bg, MAT.stripe));
    const can = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), MAT.canopy); can.scale.set(0.72, 0.62, 2.0); can.position.set(0, 0.7, -1.7); g.add(can);
    [-1, 1].forEach((s) => {
      const M = (pts) => (s > 0 ? pts : pts.map((q) => [-q[0], q[1]]));
      const wing = new THREE.Group(); wing.position.y = -0.25; wing.rotation.z = -s * 0.07; g.add(wing);
      wing.add(extrudeXZ(M([[0.9, -1.2], [5.4, 2.0], [6.5, 2.35], [6.5, 3.3], [0.95, 3.9]]), 0.28, MAT.white, 0.08));
      const st = extrudeXZ(M([[1.7, -0.35], [5.5, 2.25], [6.2, 2.5], [1.8, 0.35]]), 0.05, MAT.stripe, 0.02); st.position.y = 0.2; wing.add(st);
      const gun = cyl(0.12, 0.15, 4.0, 10, MAT.gun); gun.position.set(s * 6.55, 0, 1.0); wing.add(gun);
      const muz = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.16, 10), MAT.red); muz.rotation.x = Math.PI / 2; muz.position.set(s * 6.55, 0, -1.05); wing.add(muz);
      const nac = cyl(0.62, 0.7, 4.6, 18, MAT.white); nac.position.set(s * 2.5, -0.55, 2.3); g.add(nac);
      const intake = cyl(0.7, 0.7, 0.32, 18, MAT.dark); intake.position.set(s * 2.5, -0.55, 0.05); g.add(intake);
      const noz = cyl(0.55, 0.68, 0.6, 18, MAT.gun); noz.position.set(s * 2.5, -0.55, 4.85); g.add(noz);
      const core = new THREE.Mesh(new THREE.CircleGeometry(0.48, 20), MAT.engineBlue); core.position.set(s * 2.5, -0.55, 5.16); g.add(core);
      const fl = new THREE.Mesh((() => { const c = new THREE.ConeGeometry(0.42, 3.0, 16, 1, true); c.rotateX(Math.PI / 2); c.translate(0, 0, 1.5); return c; })(), ADD(new THREE.Color(0.22, 0.55, 1.5), { side: THREE.DoubleSide, opacity: 0.7 }));
      fl.position.set(s * 2.5, -0.55, 5.16); g.add(fl); flames.push(fl);
      const gl = glowSprite(T.glowC, '#8fc8ff', 2, 0.55); gl.position.set(s * 2.5, -0.55, 5.4); g.add(gl); glows.push(gl);
      const fin = new THREE.Shape(); [[1.4, 0], [3.9, 0], [4.3, 0.15], [3.95, 2.2], [3.15, 2.25]].forEach((p, i) => (i ? fin.lineTo(p[0], p[1]) : fin.moveTo(p[0], p[1])));
      const fgeo = new THREE.ExtrudeGeometry(fin, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.04, bevelSegments: 1 }); fgeo.rotateY(-Math.PI / 2); fgeo.translate(0.07, 0, 0);
      const fm = new THREE.Mesh(fgeo, MAT.white); fm.position.set(s * 0.72, 0.5, 0); fm.rotation.z = -s * 0.38; g.add(fm);
      const ftip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.9), MAT.stripe); ftip.position.set(s * (0.72 + 0.82), 0.5 + 2.05, 3.55); ftip.rotation.z = -s * 0.38; g.add(ftip);
      const nav = glowSprite(T.spark, s < 0 ? '#ff3020' : '#30ff60', 1.4); nav.position.set(s * 6.6, 0.1, 3.0); g.add(nav);
    });
    const shield = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), shieldMat(new THREE.Color(0.3, 1.6, 2.6), 0));
    shield.scale.set(7.6, 3.6, 7.8); shield.position.z = 0.6; shield.castShadow = false; g.add(shield);
    g.userData = { flames: flames, glows: glows, shield: shield, guns: [new THREE.Vector3(-6.55, -0.25, -1.15), new THREE.Vector3(6.55, -0.25, -1.15)] };
    shadows(g, true); shield.castShadow = false; flames.forEach((f) => { f.castShadow = false; });
    g.scale.setScalar(0.85);
    scene.add(g);
    return g;
  })();

  const VAPOR = (function () {   // (v18) the cone of vapour round your ship while it is supersonic (and a burst of it as you go through)
    const g = new THREE.ConeGeometry(1, 1, 48, 1, true); g.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({ uniforms: { k: { value: 0 }, t: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float k, t; varying vec3 vN; varying vec3 vV; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }' +
        'void main(){ float f = 1.0 - abs(dot(vN, vV)); float st = 0.5 + 0.5 * h(vec2(floor(vUv.x * 70.0), floor(t * 0.4))); float a = pow(f, 1.3) * k * st * smoothstep(0.0, 0.3, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y)); gl_FragColor = vec4(0.95, 0.97, 1.0, a * 0.9); }' });
    const m = new THREE.Mesh(g, mat); m.scale.set(8.2, 8.2, 11); m.position.set(0, 0, 0.6); m.renderOrder = 5; m.castShadow = false; m.visible = false; LANCER.add(m);
    return { m: m, mat: mat, k: 0, burst: 0 };
  })();
  const PAINTS = { white: ['#d6dbe2', '#ff6a1a'], crimson: ['#a81c26', '#f0f0f0'], stealth: ['#30343b', '#ff8a2a'], gold: ['#d8a640', '#1e1e22'],
    sand: ['#d9b78a', '#a8321e'], ember: ['#26221f', '#ff5a14'], navy: ['#1d2c4a', '#f2f2f2'], magpie: ['#16181d', '#e9ebef'], noodle: ['#7c8592', '#efeae4'] };   // (v32: Noodle - her blue-grey and white)   // (v20b: the last four are won with feats)
  let curPaint = 'white';
  function paint(p) { if (!PAINTS[p] || p === curPaint) return; curPaint = p; MAT.white.color.set(PAINTS[p][0]); MAT.stripe.color.set(PAINTS[p][1]); }

  // the carrier: our side's capital ship, 700 long, bow towards -z (three.js) - the engine's +z
  const CARRIER = (function () {
    const g = new THREE.Group(), r = rng(5);
    const outline = [[0, -372], [34, -300], [58, -190], [64, -60], [64, 250], [54, 330], [-54, 330], [-64, 250], [-64, -60], [-58, -190], [-34, -300]];
    g.add(extrudeXZ(outline, 34, MAT.carrier, 3));
    const keel = extrudeXZ(outline.map((p) => [p[0] * 0.72, p[1] * 0.9 + 10]), 22, MAT.carrierDark, 2); keel.position.y = -27; g.add(keel);
    const D = deckTex(), deck = new THREE.Mesh(new THREE.PlaneGeometry(96, 560), S({ map: D.map, emissiveMap: D.emissive, emissive: '#ffffff', emissiveIntensity: 2.2, roughness: 0.75, metalness: 0.35 }));
    deck.rotation.x = -Math.PI / 2; deck.position.set(-6, 20.1, -10); g.add(deck);
    // the island: a stack of decks, a lit bridge, a mast and a dish
    const isl = new THREE.Group(); isl.position.set(48, 20, 150); g.add(isl);
    const IP = PANELB.clone(); IP.repeat.set(2.5, 2); IP.needsUpdate = true;
    const islMat = P({ color: '#aab3c0', metalness: 0.55, roughness: 0.45, bumpMap: IP, bumpScale: 2, roughnessMap: IP, clearcoat: 0.3 });
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(20, 30, 74), islMat); b1.position.y = 15; isl.add(b1);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(16, 14, 50), islMat); b2.position.set(-1, 37, -6); isl.add(b2);
    const WIN = windowsTex(); WIN.wrapS = THREE.RepeatWrapping;
    [8, 15, 22].forEach((y) => { const wb = new THREE.Mesh(new THREE.BoxGeometry(20.3, 1.4, 74.3), S({ color: '#111', emissiveMap: WIN, emissive: '#ffffff', emissiveIntensity: 1.6, roughness: 0.4, metalness: 0.5 })); wb.position.y = y; isl.add(wb); });
    const fun = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 18), MAT.carrierDark); fun.position.set(0, 48, 14); isl.add(fun);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(16.4, 3, 50.4), S({ color: '#111', emissiveMap: WIN, emissive: '#ffffff', emissiveIntensity: 2.4, roughness: 0.3, metalness: 0.6 })); bridge.position.set(-1, 40, -6); isl.add(bridge);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.2, 34, 8), MAT.carrierDark); mast.position.set(0, 61, 0); isl.add(mast);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(6, 18, 8, 0, Math.PI * 2, 0, 1.1), MAT.carrier); dish.position.set(0, 50, 18); dish.rotation.x = -1.2; isl.add(dish);
    const beacon = glowSprite(T.glowR, '#ffffff', 10); beacon.position.set(0, 79, 0); isl.add(beacon);
    // engines at the stern
    const engines = [];
    [-34, 0, 34].forEach((x) => {
      const n = cyl(15, 13, 24, 28, MAT.carrierDark); n.position.set(x, -2, 344); g.add(n);
      const core = new THREE.Mesh(new THREE.CircleGeometry(12, 28), S({ color: '#000', emissive: '#9fd4ff', emissiveIntensity: 5 })); core.position.set(x, -2, 356.2); g.add(core);
      const gl = glowSprite(T.glowC, '#bfe0ff', 80, 0.9); gl.position.set(x, -2, 362); g.add(gl); engines.push(gl);
    });
    // lit windows along both sides, a lit hangar mouth on the port side
    [-1, 1].forEach((s) => {
      [-7, 6].forEach((y, k) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(470, 4), new THREE.MeshBasicMaterial({ map: WIN, color: k ? '#ffffff' : '#c8c8c8', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); w.rotation.y = s * Math.PI / 2; w.position.set(s * 67.2, y, 30 + k * 12); g.add(w); });
    });
    const hang = new THREE.Mesh(new THREE.PlaneGeometry(70, 16), S({ color: '#000', emissive: '#ffb066', emissiveIntensity: 1.6 })); hang.rotation.y = -Math.PI / 2; hang.position.set(-67.3, 2, -70); g.add(hang);
    // hull detail: hundreds of plates, pipes and boxes along the edges, sides and underneath
    const GN = 760, box = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), MAT.carrierDark, GN), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < GN; i++) {
      const z = -290 + r() * 600, where = r(), s = r() < 0.5 ? -1 : 1, edge = z < -190 ? 58 - (-190 - z) * 0.24 : 64;
      if (where < 0.35) v.set(s * (edge - 2 - r() * 6), 20 + r() * 2.5, z);                  // along the deck edges
      else if (where < 0.8) v.set(s * (edge + 3.2), -16 + r() * 32, z);                       // down the sides
      else v.set((r() * 2 - 1) * 40, -39 - r() * 2, z * 0.85);                                // underneath
      sc.set(2 + r() * 7, 1.5 + r() * 4, 3 + r() * 16); m4.compose(v, q, sc); box.setMatrixAt(i, m4);
    }
    g.add(box);
    // point defence guns along the deck edges
    for (let i = 0; i < 12; i++) { const s = i % 2 ? 1 : -1, z = -150 + (i >> 1) * 70, d = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.carrierDark); d.position.set(s * 60, 21.5, z); g.add(d); const bb = cyl(0.4, 0.5, 7, 8, MAT.gun); bb.position.set(s * 60, 23.5, z - 4); g.add(bb); }
    const nav = [];
    [[-64, 0, 250, '#ff3020'], [64, 0, 250, '#30ff60'], [0, 20, -370, '#ffffff'], [-64, 22, -60, '#ff3020'], [64, 22, -60, '#30ff60']].forEach((p) => { const n = glowSprite(T.spark, p[3], 9); n.position.set(p[0], p[1], p[2]); g.add(n); nav.push(n); });
    g.userData = { engines: engines, nav: nav, beacon: beacon };
    shadows(g, true, true);
    g.traverse((o) => { if (o.isMesh && (o.material.blending === THREE.AdditiveBlending || o === deck)) o.castShadow = false; });
    space.add(g);
    return g;
  })();

  // far off in space: your carrier (chapter 2), side-on to the fight
  CARRIER.position.set(E.WARSHIP.carrier[0], E.WARSHIP.carrier[1], -E.WARSHIP.carrier[2]); CARRIER.rotation.y = 0.9;

  // the cockpit (a setting): a canopy frame round the view and a lit dashboard below it, fixed to the camera
  const cockpit = new THREE.Group(); cam.add(cockpit);
  (function () {
    const frameMat = P({ color: '#262a31', metalness: 0.75, roughness: 0.38, clearcoat: 0.3 });
    const at = (sx, sy, d) => new THREE.Vector3((sx - CX) / FOCAL * d, (CY - sy) / FOCAL * d, -d);   // a point on the screen, at a depth
    const bar = (pts, r) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, r, 8, false), frameMat); cockpit.add(m); };
    bar([at(-50, 330, 0.9), at(-4, 200, 0.95), at(34, 60, 1.0), at(84, -40, 1.05)], 0.022);
    bar([at(450, 330, 0.9), at(404, 200, 0.95), at(366, 60, 1.0), at(316, -40, 1.05)], 0.022);
    const dash = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.5), P({ color: '#3a3f48', metalness: 0.6, roughness: 0.45, bumpMap: PANEL2, bumpScale: 0.4 })); dash.position.copy(at(200, 318, 0.95)); dash.rotation.x = 0.5; cockpit.add(dash);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, 0.03), MAT.stripe); lip.position.copy(at(200, 300, 0.92)); cockpit.add(lip);
    function screen(sx, sy, w, h, draw) {   // a lit display set into the dashboard
      const c = canvas(256, 160), x = c.getContext('2d'); x.fillStyle = '#020a0c'; x.fillRect(0, 0, 256, 160); draw(x);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex(c), color: new THREE.Color(1.6, 1.6, 1.6) }));
      m.position.copy(at(sx, sy, 0.86)); m.rotation.x = -0.5; cockpit.add(m);
    }
    screen(96, 302, 0.2, 0.12, (x) => { x.strokeStyle = '#2fe0c8'; x.lineWidth = 3; [30, 55, 75].forEach((r) => { x.beginPath(); x.arc(128, 80, r, 0, 6.3); x.stroke(); }); x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 160); x.moveTo(40, 80); x.lineTo(216, 80); x.stroke(); });
    screen(304, 302, 0.2, 0.12, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i < 6 ? '#ffb03a' : '#5a3a10'; x.fillRect(30 + i * 25, 120 - i * 10, 16, 20 + i * 10); } });
  })();  cockpit.traverse((o) => { o.renderOrder = 5; });

  // the enemy warship: built in the engine's terms (bow towards +z) inside a group flipped into three.js's
  function foeWindowsTex() {   // rows of small red and amber lights down a dark hull
    const w = 2048, h = 32, c = canvas(w, h), x = c.getContext('2d'), r = rng(131);
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 7) if (r() < 0.55) { x.fillStyle = r() < 0.75 ? '#ff9a50' : '#ff3a2a'; x.fillRect(i, 9 + (r() < 0.5 ? 0 : 10), 3, 4); }
    return tex(c);
  }
  MAT.boneHull = P({ color: '#e6dcc2', metalness: 0.15, roughness: 0.5, bumpMap: PANELB, bumpScale: 1.5, roughnessMap: PANELB, clearcoat: 0.3, envMapIntensity: 0.6 });   // (v35) her hull: bone
  const WS = (function () {
    const D = E.WARSHIP_BASE || E.WARSHIP, B = D.boxes, K = E.WS_K || 1, g = new THREE.Group(); g.scale.set(K, K, -K);   // (built to her old numbers, then made K times bigger, as the rules are)
    const CUT = [-160, 140], longs = [];   // (her long hull and superstructure are made in three pieces, cut here: stern, middle, bow - so she can break apart)
    function chamferBox(b, k, mat) {   // a box with its long edges cut off, run along z
      const x0 = b[0], y0 = b[1], x1 = b[3], y1 = b[4], sh = new THREE.Shape();
      [[x0 + k, y0], [x1 - k, y0], [x1, y0 + k], [x1, y1 - k], [x1 - k, y1], [x0 + k, y1], [x0, y1 - k], [x0, y0 + k]].forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
      const geo = new THREE.ExtrudeGeometry(sh, { depth: b[5] - b[2], bevelEnabled: false }); geo.translate(0, 0, b[2]);
      const m = new THREE.Mesh(geo, mat); g.add(m); return m;
    }
    function taper(b, tx, ty, mat) {   // a box that narrows towards +z: her prow
      const geo = new THREE.BoxGeometry(b[3] - b[0], b[4] - b[1], b[5] - b[2], 1, 1, 1), pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) if (pos.getZ(i) > 0) { pos.setX(i, pos.getX(i) * tx); pos.setY(i, pos.getY(i) * ty + (b[4] - b[1]) * (1 - ty) * 0.3); }
      geo.computeVertexNormals(); const m = new THREE.Mesh(geo, mat); m.position.set((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2); g.add(m); return m;
    }
    [[B[0][2], CUT[0]], CUT, [CUT[1], B[0][5]]].forEach((zz) => chamferBox([B[0][0], B[0][1], zz[0], B[0][3], B[0][4], zz[1]], 12, MAT.boneHull));
    taper(B[1], 0.3, 0.45, MAT.boneHull);
    {   // (v35) she is a giant DOG BONE: bone-white hull, a great rounded knuckle each side at either end
      const KN = new THREE.SphereGeometry(1, 30, 20); [[472, 39], [-490, 39]].forEach((q) => [-1, 1].forEach((sx) => { const m = new THREE.Mesh(KN, MAT.boneHull); m.scale.set(37, 32, 44); m.position.set(sx * q[1], -6, q[0]); g.add(m); }));
    }
    [[B[2][2], CUT[0]], CUT, [CUT[1], B[2][5]]].forEach((zz) => chamferBox([B[2][0], B[2][1], zz[0], B[2][3], B[2][4], zz[1]], 8, MAT.foeHull2));
    chamferBox([B[3][0], B[3][1], B[3][2], B[3][3], 78, B[3][5]], 4, MAT.foeHull2);
    chamferBox([-28, 78, 196, 28, 96, 276], 5, MAT.foeHull);
    const FW = foeWindowsTex(); FW.wrapS = THREE.RepeatWrapping;
    const bridgeWin = new THREE.Mesh(new THREE.BoxGeometry(50, 7, 0.8), S({ color: '#110000', emissiveMap: FW, emissive: '#ffffff', emissiveIntensity: 3, roughness: 0.3, metalness: 0.6 })); bridgeWin.position.set(0, 87, 276.4); g.add(bridgeWin);
    chamferBox(B[4], 10, MAT.foeHull2);
    const flames = [];
    [-36, -12, 12, 36].forEach((x) => {
      const n = new THREE.Mesh((() => { const c = new THREE.CylinderGeometry(9, 12, 18, 20, 1, true); c.rotateX(Math.PI / 2); return c; })(), MAT.gun); n.position.set(x, -5, -548); g.add(n);
      const core = new THREE.Mesh(new THREE.CircleGeometry(9, 20), S({ color: '#000', emissive: '#ff8a3a', emissiveIntensity: 5, side: THREE.DoubleSide })); core.position.set(x, -5, -545); g.add(core);
      const gl = glowSprite(T.glowO, '#ffffff', 70, 0.85); gl.position.set(x, -5, -565); g.add(gl); flames.push(gl);
    });
    for (let i = 5; i <= 8; i++) chamferBox(B[i], 3, MAT.foeHull2);
    for (let i = 9; i <= 12; i++) { const b = B[i]; chamferBox([b[0], 17, b[2], b[3], b[4], b[5]], 4, MAT.foeHull); chamferBox([b[0], b[1], b[2], b[3], -17, b[5]], 4, MAT.foeHull); const l = glowSprite(T.glowR, '#ffffff', 10); l.position.set((b[0] + b[3]) / 2, b[4] + 4, (b[2] + b[5]) / 2); g.add(l); }
    // lit windows down both sides of her hull and her superstructure
    [[-70.6, -1], [70.6, 1]].forEach((q) => { [-24, -10, 6].forEach((y, k) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(760, 5), new THREE.MeshBasicMaterial({ map: FW, color: '#ffffff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide })); w.rotation.y = q[1] * Math.PI / 2; w.position.set(q[0], y, -40 + k * 20); g.add(w); longs.push(w); }); });
    [[-42.6, -1], [42.6, 1]].forEach((q) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(480, 4), new THREE.MeshBasicMaterial({ map: FW, color: '#ffffff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide })); w.rotation.y = q[1] * Math.PI / 2; w.position.set(q[0], 36, -60); g.add(w); longs.push(w); });
    // her hangar, lit, underneath
    const hang = new THREE.Mesh(new THREE.PlaneGeometry(60, 90), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.1, 0.5), side: THREE.DoubleSide })); hang.rotation.x = Math.PI / 2; hang.position.set(0, -36.6, -20); g.add(hang);
    // (v18, the owner: "there should be guns underneath ... a big ship will be protected from underneath") her belly: a keel down the middle carrying
    // the track her keel gun runs along, lights racing down it; radiator vents glowing; floodlights; pipes and boxes
    chamferBox([-16, -41, -420, 16, -36, 340], 3, MAT.foeHull2);
    const trackLights = [];
    [-7, 7].forEach((x) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 735), MAT.gun); rail.position.set(x, -41.6, -35); g.add(rail); longs.push(rail);
      for (let z = -395; z <= 325; z += 18) { const l = glowSprite(T.glowR, '#ffffff', 4.2, 0.95); l.position.set(x * 1.65, -41.8, z); g.add(l); trackLights.push(l); longs.push(l); }
    });
    for (let z = -300; z <= 260; z += 80) [-44, 44].forEach((x) => { const v2 = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 34), MAT.radiator); v2.position.set(x, -36.6, z); g.add(v2); });
    [[-58, -300], [58, -300], [-58, -40], [58, -40], [-58, 200], [58, 200]].forEach((q) => { const l = glowSprite(T.glowO, '#fff0c8', 30, 0.45); l.position.set(q[0], -39, q[1]); g.add(l); longs.push(l); });
    {
      const rb = rng(31), NB2 = 300, belly = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), MAT.foeHull2, NB2), m5 = new THREE.Matrix4(), q5 = new THREE.Quaternion(), v5 = new THREE.Vector3(), s5 = new THREE.Vector3();
      for (let i = 0; i < NB2; i++) { const pipe = rb() < 0.4, x = (rb() < 0.5 ? -1 : 1) * (19 + rb() * 47), z = -430 + rb() * 800; v5.set(x, -36.6 - rb() * 2.2, z); s5.set(pipe ? 1.4 : 2 + rb() * 8, pipe ? 1.4 : 1 + rb() * 3, pipe ? 40 + rb() * 80 : 3 + rb() * 18); m5.compose(v5, q5, s5); belly.setMatrixAt(i, m5); }
      g.add(belly); longs.push(belly);
    }
    // hull detail: hundreds of plates, vents and boxes over her back and down her sides
    const r = rng(23), GN = 900, box = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), MAT.foeHull2, GN), m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < GN; i++) {
      const z = -440 + r() * 810, where = r(), sd = r() < 0.5 ? -1 : 1;
      if (where < 0.35) v.set(sd * (44 + r() * 22), 24 + r() * 2, z);                       // her back, either side of the superstructure
      else if (where < 0.55 && z > -320 && z < 200) v.set((r() * 2 - 1) * 36, 48 + r() * 2, z);   // the top of the superstructure
      else if (where < 0.85) v.set(sd * (70 + r() * 1.5), -30 + r() * 50, z);              // down her sides
      else v.set((r() * 2 - 1) * 56, -36 - r() * 2, z);                                     // underneath
      sc.set(2 + r() * 8, 1.5 + r() * 4, 3 + r() * 20); m4.compose(v, qt, sc); box.setMatrixAt(i, m4);
    }
    g.add(box); longs.push(box);
    shadows(g, true, true);
    g.traverse((o) => { if (o.isMesh && o.material && (o.material.blending === THREE.AdditiveBlending || o.material.isMeshBasicMaterial)) o.castShadow = false; });
    space.add(g);
    const bshield = new THREE.Mesh(new THREE.SphereGeometry(44 * K, 32, 20), shieldMat(new THREE.Color(0.3, 1.4, 2.4), 1)); bshield.position.set(D.bridge[0] * K, (D.bridge[1] - 4) * K, (-D.bridge[2] + 14) * K); space.add(bshield);
    return { group: g, bridgeWin: bridgeWin, flames: flames, shield: bshield, longs: longs, cut: CUT.map((z) => -z * K), K: K, broken: null, trackLights: trackLights };
  })();

  // she goes up (27 Oct night, the owner: "we want it so you see it blow up"): her three sections come apart and drift, burning
  function wsBreak() {
    if (WS.broken) return;
    const G = WS.group, saved = [], box = new THREE.Box3(), c = new THREE.Vector3(), K = WS.K;
    G.updateMatrixWorld(true);
    const secs = [[-480, 1.5, 0.25, 0.0018, 0.0005], [0, 0, -0.18, -0.0006, 0.0012], [300, -1.7, 0.32, -0.0022, -0.0009]].map((q) => {   // stern, middle, bow: where (her old numbers), drift, sink, pitch, roll
      const sg = new THREE.Group(); sg.position.set(0, 0, -q[0] * K); space.add(sg); return { g: sg, vz: q[1], vy: q[2], rx: q[3], rz: q[4], cutZ: 0 };
    });
    secs[0].cutZ = WS.cut[0] - secs[0].g.position.z; secs[2].cutZ = WS.cut[1] - secs[2].g.position.z;
    G.children.slice().forEach((ch) => {
      saved.push([ch, ch.position.clone(), ch.quaternion.clone(), ch.scale.clone(), ch.visible]);
      if (WS.longs.indexOf(ch) >= 0 || WS.flames.indexOf(ch) >= 0) { ch.visible = false; return; }   // (long windows, the greebles, her engines' glow: gone)
      box.setFromObject(ch); box.getCenter(c);
      secs[c.z > WS.cut[0] ? 0 : c.z < WS.cut[1] ? 2 : 1].g.attach(ch);
    });
    WS.broken = { saved: saved, secs: secs, t: -1 };
    damage.length = 0;
  }
  function wsMend() {   // a new game: put her back together
    const B = WS.broken; if (!B) return;
    B.saved.forEach((q) => { WS.group.add(q[0]); q[0].position.copy(q[1]); q[0].quaternion.copy(q[2]); q[0].scale.copy(q[3]); q[0].visible = q[4]; });
    B.secs.forEach((q) => space.remove(q.g)); WS.broken = null;
  }
  function wsDrift(W) {   // her pieces drifting apart, fire and smoke pouring from where they broke
    const B = WS.broken, n = B.t < 0 ? 1 : Math.min(10, W.t - B.t); B.t = W.t;
    for (let k = 0; k < n; k++) B.secs.forEach((q, i) => {
      q.g.position.z += q.vz; q.g.position.y -= q.vy; q.g.rotation.x += q.rx; q.g.rotation.z += q.rz;
      if (i !== 1 && (W.t + k + i) % 2 === 0) {
        v1.set((Math.random() - 0.5) * 140, (Math.random() - 0.5) * 70, q.cutZ); q.g.localToWorld(v1);
        puff('fire', v1.x, v1.y, -v1.z, { life: 26, s0: 36, s1: 12, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8 });
        if ((W.t + k) % 4 === 0) puff('smoke', v1.x, v1.y, -v1.z, { life: 150, s0: 40, s1: 170, a0: 0.6, drag: 0.99, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5 });
      }
    });
  }

  // ---------------------------------------------------------------- the valley's rock, built along the chapter's route
  let terrain = null, terrainKey = '';
  function buildTerrain(W) {
    if (terrain) { terrain.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); valley.remove(terrain); }
    terrain = new THREE.Group(); valley.add(terrain);
    const R = W.rail, V = W.valley, ds = 6, sA = -1500, sB = R.len + 1600, rows = Math.ceil((sB - sA) / ds) + 1;
    const PL = [180, 110, 60, 22], WALL = 22, FLOOR = [0.84, 0.66, 0.48, 0.3, 0.14], half = PL.length + 1 + WALL + 1 + FLOOR.length, cols = half * 2 + 1;
    const pos = new Float32Array(rows * cols * 3), col = new Float32Array(rows * cols * 3), uv = new Float32Array(rows * cols * 2), wallA = new Float32Array(rows * cols), hgtA = new Float32Array(rows * cols), baseA = new Float32Array(rows * cols), c = new THREE.Color(), c2 = new THREE.Color();
    // (v18) the floor where the rules put it (the drop, the gorge, the climbs, the open desert); how far below the old floor it lies; the river
    const floorOf = (z) => (V.floorW ? V.floorW(z) : V.ground(z) - 14), deepOf = (z) => (V.deepAt ? Math.max(-70, V.deepAt(z / 260)) : 0);
    const riverK = (s) => { let k = 0; (V.river || []).forEach((q) => { k = Math.max(k, Math.min(smooth(q[0], q[0] + 90, s), 1 - smooth(q[1] - 90, q[1], s))); }); return k; };
    planSites(W, floorOf);   // (v28)
    const chanDrop = (s, L, hw) => riverK(s) * 3.2 * (1 - smooth(0.42, 0.62, Math.abs(L) / Math.max(1, hw)));   // (the river's bed, below the sand)
    const lat = new Float32Array(cols), hy = new Float32Array(cols), kind = new Uint8Array(cols);   // kind: 0 plateau, 1 rim, 2 wall, 3 floor
    const table = [];   // the valley's middle by distance, for the far land
    for (let r = 0; r < rows; r++) {
      const s = sA + r * ds, F = E.frame(R, s), hw = V.width(clamp(s, 0, R.len + 1600)) / 2, floorY = floorOf(F.z), deep = deepOf(F.z), rk = riverK(s);
      if (r % 2 === 0) table.push([F.z, F.x, Math.cos(F.yaw), hw]);
      let dk = E.frame(R, s + 40).yaw - E.frame(R, s - 40).yaw; while (dk > Math.PI) dk -= 2 * Math.PI; while (dk < -Math.PI) dk += 2 * Math.PI;
      const kap = dk / 80, inside = kap > 0 ? 1 : -1, reach = Math.abs(kap) > 1e-5 ? 0.8 / Math.abs(kap) : 1e9;
      const sx = VSUN_E.x * F.rx + VSUN_E.z * F.rz, tanE = VSUN_E.y / Math.max(0.05, Math.abs(sx)), sunSide = sx > 0 ? 1 : -1;
      const dark = 1 - 0.8 * smooth(V.tunnel[0] - 30, V.tunnel[0] + 70, s) * (1 - smooth(V.tunnel[1] - 70, V.tunnel[1] + 30, s));   // inside the tunnel it is dark
      const rimY = {}, wx = (x) => F.x + F.rx * x, wz = (x) => F.z + F.rz * x;
      [-1, 1].forEach((sd) => { const x = sd * (hw + 16); rimY[sd] = topY(V, wx(x), wz(x), 0); });
      // one side, from far out to the middle (the right side is the mirror, read backwards)
      for (let sd = -1; sd <= 1; sd += 2) {
        const pts = [];
        PL.forEach((p) => { let L = hw + p; if (sd === inside) L = Math.max(hw + 24, Math.min(L, reach)); pts.push([L, 0]); });
        pts.push([hw + 16, 1]);
        for (let k = 1; k <= WALL; k++) {
          const t = k / (WALL + 1), y = rimY[sd] + (floorY - rimY[sd]) * t;
          const hh = y - floorY, gully = Math.pow(1 - Math.abs(2 * vnoise(s * 0.04, sd * 11.3) - 1), 3) * 7 * smooth(4, 30, hh);
          const bay = Math.max(0, fbm(s * 0.0045, sd * 7.7, 2) - 0.42) * 30 * smooth(2, 18, hh);   // a bay worn back into the cliff, here and there
          const wob = Math.max(-1.5, (fbm(s * 0.011, y * 0.045 + sd * 13, 3) - 0.5) * 12 + (vnoise(s * 0.07, y * 0.22 + sd * 7) - 0.5) * 3 + gully + bay);
          pts.push([hw + 2 + stepBack(hh - deep + (fbm(s * 0.004, sd * 3.1, 2) - 0.5) * 5) + 0.16 * Math.min(hh, Math.max(0, deep)) + 2.2 * (1 - t) + wob, 2, y]);   // (steps back as it rises: cliffs and slopes; the gorge's dark inner walls lean back)
        }
        pts.push([hw + 1, 3, floorY + 3.5 + vnoise(s * 0.05, sd * 3) * 2]);
        FLOOR.forEach((k, j) => pts.push([hw * k, 3, floorY + (fbm(s * 0.015 + j * 0.37, sd * 5 + 1 + j, 2) - 0.5) * 2.6 + Math.sin(s * 0.045 + j * 1.7 + sd) * 0.45 * (1 - k)   // gently rolling sand, low dunes
          + (k > 0.7 ? 1.2 * (k - 0.7) / 0.3 : 0) - chanDrop(s, hw * k, hw)]));   // (rising a little towards the foot of the wall; down into the river's bed)
        const list = sd < 0 ? pts : pts.slice().reverse(), base = sd < 0 ? 0 : half + 1;
        list.forEach((p, j) => { lat[base + j] = sd * p[0]; kind[base + j] = p[1]; hy[base + j] = p[2] != null ? p[2] : NaN; });
      }
      lat[half] = 0; kind[half] = 3; hy[half] = floorY + (fbm(s * 0.015, 2, 2) - 0.5) * 2 - chanDrop(s, 0, hw);
      const flat = 1 - smooth(6, 24, (rimY[-1] + rimY[1]) / 2 - floorY);   // (out on the open desert the floor takes the plateau's colours)
      for (let j = 0; j < cols; j++) {
        const x = lat[j], X = wx(x), Z = wz(x), i3 = (r * cols + j) * 3, i2 = (r * cols + j) * 2, kd = kind[j];
        const y = kd <= 1 ? topY(V, X, Z, kd === 0 ? clamp((Math.abs(x) - hw - 30) / 160, 0, 1) : 0) : carve(X, Z, hy[j]);
        pos[i3] = X; pos[i3 + 1] = y; pos[i3 + 2] = -Z;
        if (kd <= 1) topCol(X, Z, c);
        else if (kd === 2) c.setRGB(1, 1, 1).multiplyScalar(0.72 + 0.28 * clamp((y - floorY) / 26, 0, 1));   // the layers themselves are added per pixel
        else { c.copy(SAND).multiplyScalar(0.86 + fbm(X * 0.02, Z * 0.02, 2) * 0.26); bioCol(X, Z, c, true); if (flat > 0) c.lerp(topCol(X, Z, c2), flat * 0.85); if (rk > 0) c.multiplyScalar(1 - 0.3 * rk * (1 - smooth(0.5, 0.75, Math.abs(x) / hw))); }   // (wet sand by the river)
        if (kd >= 2) {   // the sun's shadow from the rim on its side, laid into the colour
          const xr = sunSide * (hw + 16), rimS = rimY[sunSide], reachY = y + Math.abs(xr - x) * tanE;
          c.lerp(SHADE.clone().multiply(c), (1 - smooth(rimS - 32, rimS + 10, reachY)) * (1 - flat));
          if (dark < 1) c.multiplyScalar(dark).lerp(new THREE.Color(0.05, 0.06, 0.12), (1 - dark) * 0.3);
        }
        col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b; wallA[r * cols + j] = kd === 2 ? 1 : 0; hgtA[r * cols + j] = y - floorY; baseA[r * cols + j] = kd === 2 ? -deep : 0;
        uv[i2] = s / 20; uv[i2 + 1] = (x < 0 ? -1 : 1) * (Math.abs(x) + (y - floorY)) / 20;
      }
    }
    const idx = new Uint32Array((rows - 1) * (cols - 1) * 6); let n = 0;
    for (let r = 0; r < rows - 1; r++) for (let j = 0; j < cols - 1; j++) { const a = r * cols + j, b = a + 1, cc = a + cols, d = cc + 1; idx[n++] = a; idx[n++] = b; idx[n++] = cc; idx[n++] = b; idx[n++] = d; idx[n++] = cc; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.setAttribute('wall', new THREE.BufferAttribute(wallA, 1)); geo.setAttribute('hgt', new THREE.BufferAttribute(hgtA, 1)); geo.setAttribute('base', new THREE.BufferAttribute(baseA, 1));
    geo.computeVertexNormals(); geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, MAT.rock); mesh.receiveShadow = true; mesh.frustumCulled = false; terrain.add(mesh);
    (V.river || []).forEach((q) => {   // the river down the gorge: water in its bed, narrowing to nothing at either end
      const rws = Math.ceil((q[1] - q[0]) / 8) + 1, NC = 7, wp = [], wu = [], wi = [];
      for (let r2 = 0; r2 < rws; r2++) {
        const s = q[0] + r2 * 8, F = E.frame(R, s), hw = V.width(s) / 2, half2 = hw * 0.64 * Math.max(0.04, riverK(s)), wy = floorOf(F.z) - 0.6;
        for (let j = 0; j < NC; j++) { const x = (j / (NC - 1) * 2 - 1) * half2; wp.push(F.x + F.rx * x, wy, -(F.z + F.rz * x)); wu.push(j / (NC - 1), s / 70); }
      }
      for (let r2 = 0; r2 < rws - 1; r2++) for (let j = 0; j < NC - 1; j++) { const a = r2 * NC + j, b = a + 1, cc = a + NC, d = cc + 1; wi.push(a, b, cc, b, d, cc); }
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(wu, 2)); wg.setIndex(wi); wg.computeVertexNormals();
      if (wg.attributes.normal.getY(0) < 0) { wg.index.array.reverse(); wg.computeVertexNormals(); }   // (facing up)
      const wm = new THREE.Mesh(wg, MAT.water); wm.receiveShadow = true; wm.frustumCulled = false; terrain.add(wm);
    });
    // the land beyond: a coarse grid, sunk out of sight wherever the valley is
    const GS = 60, xs = table.map((q) => q[1]), x0 = Math.min.apply(null, xs) - 2800, x1 = Math.max.apply(null, xs) + 2800, z0 = table[0][0] - 600, z1 = table[table.length - 1][0] + 800;
    const nx = Math.ceil((x1 - x0) / GS) + 1, nz = Math.ceil((z1 - z0) / GS) + 1, gp = new Float32Array(nx * nz * 3), gc = new Float32Array(nx * nz * 3), gu = new Float32Array(nx * nz * 2);
    let ti = 0;
    for (let k = 0; k < nz; k++) {
      const Z = z0 + k * GS; while (ti < table.length - 2 && table[ti + 1][0] < Z) ti++;
      const A = table[ti], B = table[ti + 1], f = clamp((Z - A[0]) / ((B[0] - A[0]) || 1), 0, 1), xc = A[1] + (B[1] - A[1]) * f, cs = A[2] + (B[2] - A[2]) * f, hw = A[3] + (B[3] - A[3]) * f;
      for (let i = 0; i < nx; i++) {
        const X = x0 + i * GS, L = Math.abs(X - xc) * cs, o3 = (k * nx + i) * 3, o2 = (k * nx + i) * 2;
        const y = topY(V, X, Z, clamp((L - hw - 30) / 160, 0, 1)) - 0.8 - (L < hw + 150 ? 260 : 0);
        gp[o3] = X; gp[o3 + 1] = y; gp[o3 + 2] = -Z; topCol(X, Z, c); gc[o3] = c.r; gc[o3 + 1] = c.g; gc[o3 + 2] = c.b; gu[o2] = X / 20; gu[o2 + 1] = Z / 20;
      }
    }
    const gi = new Uint32Array((nx - 1) * (nz - 1) * 6); n = 0;
    for (let k = 0; k < nz - 1; k++) for (let i = 0; i < nx - 1; i++) { const a = k * nx + i, b = a + 1, cc = a + nx, d = cc + 1; gi[n++] = a; gi[n++] = b; gi[n++] = cc; gi[n++] = b; gi[n++] = d; gi[n++] = cc; }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('wall', new THREE.BufferAttribute(new Float32Array(nx * nz), 1)); gg.setAttribute('hgt', new THREE.BufferAttribute(new Float32Array(nx * nz), 1)); gg.setAttribute('base', new THREE.BufferAttribute(new Float32Array(nx * nz), 1)); gg.setAttribute('position', new THREE.BufferAttribute(gp, 3)); gg.setAttribute('color', new THREE.BufferAttribute(gc, 3)); gg.setAttribute('uv', new THREE.BufferAttribute(gu, 2)); gg.setIndex(new THREE.BufferAttribute(gi, 1));
    gg.computeVertexNormals(); const land = new THREE.Mesh(gg, MAT.rock); land.frustumCulled = false; land.receiveShadow = true; terrain.add(land);
    // boulders: on the floor near the walls, and up on the plateau
    const rr = rng(W.seed + 3), NB = 1700, rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), MAT.boulder, NB), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler();
    for (let i = 0; i < NB; i++) {
      const s = -200 + rr() * (R.len + 1400), F = E.frame(R, s), hw = V.width(clamp(s, 0, R.len + 1600)) / 2, sd = rr() < 0.5 ? -1 : 1, onTop = rr() < 0.35;
      const L = onTop ? hw + 22 + rr() * 170 : hw * (0.6 + rr() * 0.42), size = onTop ? 2 + rr() * 8 : 0.7 + rr() * 2.8, X = F.x + F.rx * sd * L, Z = F.z + F.rz * sd * L;
      const y = onTop ? topY(V, X, Z, clamp((L - hw - 30) / 160, 0, 1)) : floorOf(F.z) + 1;
      v.set(X, y + size * 0.25, -Z); q.setFromEuler(e.set(rr() * 6, rr() * 6, rr() * 6)); sc.set(size * (0.8 + rr() * 0.6), size * (0.55 + rr() * 0.4), size * (0.8 + rr() * 0.6));
      m4.compose(v, q, sc); rocks.setMatrixAt(i, siteHit(X, Z, 3) ? ZERO4 : m4);
      if (onTop && bioAt(Z)[0] + BW[1] + BW[2] < 0.3) topCol(X, Z, c).multiplyScalar(0.8); else strata(4 + rr() * 30, s, c).multiplyScalar(0.85);
      bioRock(Z, c, rr()); rocks.setColorAt(i, c);
    }
    rocks.castShadow = true; rocks.receiveShadow = true; rocks.frustumCulled = false; terrain.add(rocks);
    // rubble fallen from the cliffs, heaped along the foot of each wall
    const NR = 1400, rub = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), MAT.boulder, NR), ru = rng(W.seed + 4);
    for (let i = 0; i < NR; i++) {
      const s = -200 + ru() * (R.len + 1400), F = E.frame(R, s), hw = V.width(clamp(s, 0, R.len + 1600)) / 2, sd = ru() < 0.5 ? -1 : 1, size = 0.8 + Math.pow(ru(), 2) * 4;
      const L = hw + 1 - ru() * 7, X = F.x + F.rx * sd * L, Z = F.z + F.rz * sd * L;
      v.set(X, floorOf(F.z) + size * 0.3, -Z); q.setFromEuler(e.set(ru() * 6, ru() * 6, ru() * 6)); sc.set(size * (0.8 + ru() * 0.6), size * (0.5 + ru() * 0.4), size * (0.8 + ru() * 0.6));
      m4.compose(v, q, sc); rub.setMatrixAt(i, m4); strata(ru() * 40, s, c).multiplyScalar(0.8); bioRock(Z, c, ru()); rub.setColorAt(i, c);
    }
    rub.castShadow = true; rub.receiveShadow = true; rub.frustumCulled = false; terrain.add(rub);
    // desert scrub: low grey-green bushes on the canyon floor and along the rim - for scale, and a sense of speed
    const bushGeo = new THREE.IcosahedronGeometry(1, 1), bp = bushGeo.attributes.position, br = rng(77);
    for (let i = 0; i < bp.count; i++) { const k = 0.55 + br() * 0.75; bp.setXYZ(i, bp.getX(i) * k, Math.max(-0.2, bp.getY(i)) * k, bp.getZ(i) * k); }   // ragged, flat-bottomed
    bushGeo.computeVertexNormals();
    const NS = 1800, scrub = new THREE.InstancedMesh(bushGeo, MAT.scrub, NS), sb = rng(W.seed + 5);
    for (let i = 0; i < NS; i++) {
      const s = -200 + sb() * (R.len + 1400), F = E.frame(R, s), hw = V.width(clamp(s, 0, R.len + 1600)) / 2, sd = sb() < 0.5 ? -1 : 1, onTop = sb() < 0.3;
      let L = onTop ? hw + 20 + sb() * 140 : Math.sqrt(sb()) * hw * 0.97; if (!onTop && riverK(s) > 0.3 && L < hw * 0.64) L = hw * (0.66 + sb() * 0.3);   // (no bushes in the river)
      const X = F.x + F.rx * sd * L, Z = F.z + F.rz * sd * L, size = 0.7 + sb() * 1.5;
      const y = onTop ? topY(V, X, Z, clamp((L - hw - 30) / 160, 0, 1)) : floorOf(F.z) + 0.4;
      v.set(X, y + size * 0.25, -Z); q.setFromEuler(e.set(0, sb() * 6, 0)); sc.set(size * (1 + sb() * 0.7), size * (0.5 + sb() * 0.35), size * (1 + sb() * 0.7));
      m4.compose(v, q, sc); scrub.setMatrixAt(i, siteHit(X, Z, 2) ? ZERO4 : m4); c.setHSL(0.1 + sb() * 0.12, 0.1 + sb() * 0.16, 0.2 + sb() * 0.13, THREE.SRGBColorSpace); bioBush(Z, c, sb()); scrub.setColorAt(i, c);   // sage, olive, dry brown
    }
    scrub.castShadow = true; scrub.receiveShadow = true; scrub.frustumCulled = false; terrain.add(scrub);
    // small stones scattered all over the floor (you see them stream past when you fly low), and tufts of dry grass
    const NP = 12000, pebbles = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), MAT.boulder, NP), pr = rng(W.seed + 6);
    for (let i = 0; i < NP; i++) {
      const s = -100 + pr() * (R.len + 1300), F = E.frame(R, s), hw = V.width(clamp(s, 0, R.len + 1600)) / 2, L = (pr() * 2 - 1) * hw * 0.98, size = 0.15 + Math.pow(pr(), 3) * 0.7;
      const X = F.x + F.rx * L, Z = F.z + F.rz * L; v.set(X, floorOf(F.z) + 0.3 + size * 0.2 - chanDrop(s, L, hw), -Z); q.setFromEuler(e.set(pr() * 6, pr() * 6, pr() * 6)); sc.set(size * (0.8 + pr() * 0.6), size * (0.5 + pr() * 0.4), size * (0.8 + pr() * 0.6));
      m4.compose(v, q, sc); pebbles.setMatrixAt(i, siteHit(X, Z, 1) ? ZERO4 : m4); strata(pr() * 70, s, c).multiplyScalar(0.75 + pr() * 0.3); bioRock(Z, c, 0.3); pebbles.setColorAt(i, c);
    }
    pebbles.receiveShadow = true; pebbles.frustumCulled = false; terrain.add(pebbles);
    const tuft = new THREE.BufferGeometry(), tp = [];   // a tuft: seven thin blades leaning out from one root
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + k, lean = 0.25 + (k % 3) * 0.12, h = 0.8 + (k % 4) * 0.18, bx = Math.cos(a + 1.57) * 0.05, bz = Math.sin(a + 1.57) * 0.05; tp.push(-bx, 0, -bz, bx, 0, bz, Math.cos(a) * lean, h, Math.sin(a) * lean); }
    tuft.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3)); tuft.computeVertexNormals();
    const NG = 6000, grass = new THREE.InstancedMesh(tuft, MAT.grass, NG), gr = rng(W.seed + 7);
    for (let i = 0; i < NG; i++) {
      const s = -100 + gr() * (R.len + 1300), F = E.frame(R, s), hw = V.width(clamp(s, 0, R.len + 1600)) / 2, size = 0.9 + gr() * 1.4;
      let L = (gr() * 2 - 1) * hw * (gr() < 0.6 ? 0.98 : 0.5); if (riverK(s) > 0.3 && Math.abs(L) < hw * 0.64) L = Math.sign(L || 1) * hw * (0.66 + gr() * 0.3);
      const X = F.x + F.rx * L, Z = F.z + F.rz * L; v.set(X, floorOf(F.z) + 0.2, -Z); q.setFromEuler(e.set(0, gr() * 6, 0)); sc.set(size, size * (0.8 + gr() * 0.5), size);
      m4.compose(v, q, sc); grass.setMatrixAt(i, siteHit(X, Z, 1) ? ZERO4 : m4); c.setHSL(0.1 + gr() * 0.04, 0.35 + gr() * 0.2, 0.42 + gr() * 0.18, THREE.SRGBColorSpace); bioBush(Z, c, gr()); grass.setColorAt(i, c);
    }
    grass.receiveShadow = true; grass.frustumCulled = false; terrain.add(grass);
    // the tunnel: a rock roof over the canyon, a cliff face round each mouth, crystals glowing in its walls
    const T0 = V.tunnel[0], T1 = V.tunnel[1], NA = 13, arch = (th, hw) => [Math.cos(th) * (hw + 30), 14 + 26 * Math.sin(th)];
    {
      const rows2 = Math.ceil((T1 - T0) / 6) + 1, rp = [], rc = [], rw = [], rh = [], ri = [];
      for (let r = 0; r < rows2; r++) {
        const s = T0 + r * 6, F = E.frame(R, s), hw = V.width(s) / 2, floorY = floorOf(F.z);
        for (let j = 0; j < NA; j++) {
          const a = arch(Math.PI * (1 - j / (NA - 1)), hw), x = a[0], y = floorY + a[1] + (vnoise(s * 0.08, j * 3.1) - 0.5) * 5;
          rp.push(F.x + F.rx * x, y, -(F.z + F.rz * x)); const k = 0.13 + 0.08 * vnoise(s * 0.05, j); rc.push(k, k * 0.9, k * 0.95); rw.push(1); rh.push(y - floorY);
        }
      }
      for (let r = 0; r < rows2 - 1; r++) for (let j = 0; j < NA - 1; j++) { const a = r * NA + j, b = a + 1, cc = a + NA, d = cc + 1; ri.push(a, cc, b, b, cc, d); }
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3)); tg.setAttribute('wall', new THREE.Float32BufferAttribute(rw, 1)); tg.setAttribute('hgt', new THREE.Float32BufferAttribute(rh, 1)); tg.setAttribute('base', new THREE.Float32BufferAttribute(rh.map(() => 0), 1));
      tg.setAttribute('uv', new THREE.Float32BufferAttribute(rp.map((q, i) => (i % 3 === 1 ? 0 : q / 20)).filter((q, i) => i % 3 !== 1), 2)); tg.setIndex(ri); tg.computeVertexNormals();
      const roof = new THREE.Mesh(tg, MAT.rockDS); roof.castShadow = true; roof.receiveShadow = true; roof.frustumCulled = false; terrain.add(roof);
      [T0, T1].forEach((s) => {   // the cliff face above each mouth, up to the plateau
        const F = E.frame(R, s), hw = V.width(s) / 2, floorY = floorOf(F.z), top = topY(V, F.x, F.z, 0) + 3, mp = [], mc = [], mw = [], mh = [], mi = [];
        for (let j = 0; j < NA; j++) { const a = arch(Math.PI * (1 - j / (NA - 1)), hw), X = F.x + F.rx * a[0], Z = F.z + F.rz * a[0]; mp.push(X, floorY + a[1], -Z, X, top, -Z); mc.push(0.9, 0.9, 0.9, 0.9, 0.9, 0.9); mw.push(1, 1); mh.push(a[1], top - floorY); }
        for (let j = 0; j < NA - 1; j++) { const a = j * 2; mi.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3)); mg.setAttribute('color', new THREE.Float32BufferAttribute(mc, 3)); mg.setAttribute('wall', new THREE.Float32BufferAttribute(mw, 1)); mg.setAttribute('hgt', new THREE.Float32BufferAttribute(mh, 1)); mg.setAttribute('base', new THREE.Float32BufferAttribute(mh.map(() => -deepOf(F.z)), 1));
        mg.setAttribute('uv', new THREE.Float32BufferAttribute(mp.map((q, i) => q / 20).filter((q, i) => i % 3 !== 2), 2)); mg.setIndex(mi); mg.computeVertexNormals();
        const face = new THREE.Mesh(mg, MAT.rockDS); face.castShadow = true; face.receiveShadow = true; terrain.add(face);
      });
      {   // a slab of rock over the tunnel at plateau height: the sun's shadow keeps the inside dark
        const rows4 = Math.ceil((T1 - T0) / 12) + 1, cp = [], cc2 = [], ci = [];
        for (let r = 0; r < rows4; r++) { const s = T0 + r * 12, F = E.frame(R, s), hw = V.width(s) / 2; [-1, 1].forEach((sd) => { const L = sd * (hw + 70), X = F.x + F.rx * L, Z = F.z + F.rz * L; cp.push(X, topY(V, F.x, F.z, 0) + 1.5, -Z); topCol(X, Z, c); cc2.push(c.r, c.g, c.b); }); }
        for (let r = 0; r < rows4 - 1; r++) { const a = r * 2; ci.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); cg.setAttribute('color', new THREE.Float32BufferAttribute(cc2, 3)); ['wall', 'hgt', 'base'].forEach((a) => cg.setAttribute(a, new THREE.BufferAttribute(new Float32Array(cp.length / 3), 1))); cg.setAttribute('uv', new THREE.Float32BufferAttribute(cp.map((q2) => q2 / 20).filter((q2, i) => i % 3 !== 1), 2)); cg.setIndex(ci); cg.computeVertexNormals();
        const cap = new THREE.Mesh(cg, MAT.rockDS); cap.castShadow = true; cap.receiveShadow = true; cap.frustumCulled = false; terrain.add(cap);
      }
      const NC = 240, crys = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), MAT.crystal, NC), cr = rng(W.seed + 9);
      for (let i = 0; i < NC; i++) {
        const s = T0 + 30 + cr() * (T1 - T0 - 60), F = E.frame(R, s), hw = V.width(s) / 2, sd = cr() < 0.5 ? -1 : 1, floorY = floorOf(F.z), L = hw + 2 + cr() * 4, X = F.x + F.rx * sd * L, Z = F.z + F.rz * sd * L;
        v.set(X, floorY + 2 + cr() * 26, -Z); q.setFromEuler(e.set((cr() - 0.5) * 1.2, cr() * 6, sd * (0.3 + cr() * 0.6))); const k = 0.6 + cr() * 1.2; sc.set(k, k * (2 + cr() * 3), k);
        m4.compose(v, q, sc); crys.setMatrixAt(i, m4); crys.setColorAt(i, cr() < 0.6 ? new THREE.Color(0.35, 1.5, 2.4) : new THREE.Color(1.5, 0.45, 2.5));
      }
      crys.frustumCulled = false; terrain.add(crys);
    }
    // the divide: a long fin of rock down the middle of the canyon (its layers per pixel, like the walls)
    (V.ridges || [{ s0: V.ridgeSpan[0], s1: V.ridgeSpan[1], top: 0 }]).forEach((RG) => {
      const RS = [RG.s0, RG.s1], rows3 = Math.ceil((RS[1] - RS[0]) / 6) + 1, NP = 10, gp2 = [], gc2 = [], gw2 = [], gh2 = [], gi2 = [], gu2 = [], gb2 = [];
      for (let r = 0; r < rows3; r++) {
        const s = RS[0] + r * 6, F = E.frame(R, s), Rg = V.ridge(s) || { x: 0, w: 0 }, floorY = floorOf(F.z), w = Rg.w, top = floorY + (RG.top ? RG.top * Math.min(1, w / 8) + 20 : 50 + Math.min(1, w / 8) * 28) + (fbm(s * 0.01, 3, 2) - 0.5) * 14;
        const prof = [[-w - 7, floorY - 1], [-w - 2, floorY + 18], [-w, floorY + 40], [-w * 0.75, top - 4], [-w * 0.3, top], [w * 0.3, top], [w * 0.75, top - 4], [w, floorY + 40], [w + 2, floorY + 18], [w + 7, floorY - 1]];
        prof.forEach((p, j) => { const wob = j > 0 && j < NP - 1 ? (fbm(s * 0.02, j * 1.7, 2) - 0.5) * 3 * Math.min(1, w / 6) : 0, x = Rg.x + p[0] + wob * (p[0] < 0 ? -1 : 1); gp2.push(F.x + F.rx * x, p[1], -(F.z + F.rz * x)); gc2.push(0.9, 0.9, 0.9); gw2.push(1); gh2.push(p[1] - floorY); gb2.push(-deepOf(F.z)); gu2.push(s / 20, (p[0] + (p[1] - floorY)) / 20); });
      }
      for (let r = 0; r < rows3 - 1; r++) for (let j = 0; j < NP - 1; j++) { const a = r * NP + j, b = a + 1, cc = a + NP, d = cc + 1; gi2.push(a, b, cc, b, d, cc); }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(gp2, 3)); rg.setAttribute('color', new THREE.Float32BufferAttribute(gc2, 3)); rg.setAttribute('wall', new THREE.Float32BufferAttribute(gw2, 1)); rg.setAttribute('hgt', new THREE.Float32BufferAttribute(gh2, 1)); rg.setAttribute('base', new THREE.Float32BufferAttribute(gb2, 1)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(gu2, 2)); rg.setIndex(gi2); rg.computeVertexNormals();
      const ridge = new THREE.Mesh(rg, MAT.rockDS); ridge.castShadow = true; ridge.receiveShadow = true; ridge.frustumCulled = false; terrain.add(ridge);
    });
    // (v18) BUTTES: the ones out on the desert that you fly round (from the rules), and more on the plateau all along - a skyline of them
    const bm4 = new THREE.Matrix4(), bq = new THREE.Quaternion(), bv = new THREE.Vector3(), bs = new THREE.Vector3(), be = new THREE.Euler(), BL = [[], [], [], []], br2 = rng(W.seed + 11);
    W.objs.forEach((o) => { if (o.k === 'butte' && o.x != null) BL[o.v % 4].push([o.x, o.y - 1.5, o.z, o.pr, o.bh, o.rs * 0.013]); });
    for (let i = 0; i < 90; i++) {
      const s = 200 + br2() * (R.len - 400), F = E.frame(R, s), hw = V.width(s) / 2, sd = br2() < 0.5 ? -1 : 1, L = hw + 90 + br2() * 760, X = F.x + F.rx * sd * L, Z = F.z + F.rz * sd * L;
      if (siteHit(X, Z, 70)) continue; BL[i % 4].push([X, topY(V, X, Z, clamp((L - hw - 30) / 160, 0, 1)) - 3, Z, 22 + br2() * 70, 40 + br2() * 170, br2() * 6]);
    }
    BL.forEach((list, v) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(BUTTE_GEO[v], MAT.rock, list.length);
      list.forEach((b, i) => { bv.set(b[0], b[1], -b[2]); bq.setFromEuler(be.set(0, b[5], 0)); bs.set(b[3], b[4], b[3]); bm4.compose(bv, bq, bs); im.setMatrixAt(i, bm4); });
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; terrain.add(im);
    });
    // ROCKFALLS (heaps of boulders across the floor) and the desert's ROCK ARCHES, built of the same tumbled blocks
    const heaps = [], hr = rng(W.seed + 12);
    W.objs.forEach((o) => {
      if (o.k === 'rockfall' && o.x != null) {
        const F = E.frame(R, o.rs), hw = V.width(o.rs) / 2, half = Math.min(o.w / 2, hw - 1), lc = clamp(o.lx, -hw + half, hw - half), fy = floorOf(F.z), n = Math.round(half * 1.1 + 12);
        for (let i = 0; i < n; i++) {
          const u = hr() * 2 - 1, zz = (hr() * 2 - 1) * 13, top = o.h * (1 - 0.3 * u * u) * (1 - 0.45 * (zz / 13) * (zz / 13)), size = 2 + hr() * 3.6, crest = hr() < 0.45;
          const y = fy + (crest ? Math.max(size * 0.5, top - size * 0.45) : hr() * top * 0.8) + size * 0.25, x = lc + u * half;
          heaps.push([F.x + F.rx * x + F.fx * zz, y, F.z + F.rz * x + F.fz * zz, size, hr() * (y - fy) * 1.6]);
        }
      } else if (o.k === 'natarch' && o.x != null) {
        const F = E.frame(R, o.rs), fy = floorOf(F.z);
        for (let i = 0; i <= 64; i++) {
          const th = Math.PI * i / 64, x = o.lx - Math.cos(th) * o.span / 2, legs = 1 - Math.sin(th), size = 6 + legs * 4 + hr() * 2.5, zz = (hr() - 0.5) * 5;
          heaps.push([F.x + F.rx * x + F.fx * zz, fy + Math.sin(th) * o.h + (hr() - 0.5) * 2, F.z + F.rz * x + F.fz * zz, size, 20 + Math.sin(th) * 40]);
        }
        [-1, 1].forEach((sd) => { for (let i = 0; i < 10; i++) { const x = o.lx + sd * (o.span / 2 + (hr() - 0.3) * 10), zz = (hr() - 0.5) * 14; heaps.push([F.x + F.rx * x + F.fx * zz, fy + hr() * 3, F.z + F.rz * x + F.fz * zz, 3 + hr() * 4, hr() * 10]); } });
      }
    });
    const SC = V.sec || {};
    if (SC.mesa != null) for (let i = 0; i < 700; i++) {   // the open desert: rocks strewn all over it
      const s = SC.mesa - 400 + hr() * (SC.plunge - SC.mesa + 300), F = E.frame(R, s), hw = V.width(s) / 2, L = (hr() * 2 - 1) * hw * 1.6, size = 0.8 + Math.pow(hr(), 2.5) * 6;
      heaps.push([F.x + F.rx * L, floorOf(F.z) + size * 0.2, F.z + F.rz * L, size, hr() * 60]);
    }
    if (heaps.length) {
      const hm = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), MAT.boulder, heaps.length);
      heaps.forEach((b, i) => { bv.set(b[0], b[1], -b[2]); bq.setFromEuler(be.set(hr() * 6, hr() * 6, hr() * 6)); bs.set(b[3] * (0.9 + hr() * 0.5), b[3] * (0.6 + hr() * 0.35), b[3] * (0.9 + hr() * 0.5)); bm4.compose(bv, bq, bs); hm.setMatrixAt(i, siteHit(b[0], b[2], 4) ? ZERO4 : bm4); strata(b[4], i * 7, c).multiplyScalar(0.82); bioRock(b[2], c, 0.5); hm.setColorAt(i, c); });
      hm.castShadow = true; hm.receiveShadow = true; hm.frustumCulled = false; terrain.add(hm);
    }
    // a few Rook fighters that did not make it: wrecks on the floor, still smoking - and out on the desert, dust devils
    TFX.length = 0;
    const wr = rng(W.seed + 13), sec = V.sec || {};
    [[sec.narrows, 0.4], [sec.gorge, 0.55], [sec.mesa, 0.35], [sec.squad, 0.6], [sec.squad, 0.25]].forEach((q, i) => {
      if (q[0] == null) return;
      const nxt = [sec.drop, sec.tunnel, sec.plunge, sec.boss, sec.boss][i], s = q[0] + (nxt - q[0]) * q[1] + wr() * 200, F = E.frame(R, s), hw = V.width(s) / 2, sd = wr() < 0.5 ? -1 : 1, L = hw * (0.5 + wr() * 0.35);
      const X = F.x + F.rx * sd * L, Z = F.z + F.rz * sd * L, Y = floorOf(F.z) + 1.2, m = makeDart(false);
      m.traverse((o2) => { if (o2.isMesh && !(o2.material && o2.material.blending === THREE.AdditiveBlending)) o2.material = MAT.wreck; if (o2.isSprite) o2.visible = false; });
      m.position.set(X, Y, -Z); m.rotation.set(0.25 + wr() * 0.3, wr() * 6, sd * (0.4 + wr() * 0.5)); shadows(m, true, true); terrain.add(m);
      TFX.push({ k: 'wreck', x: X, y: Y + 2, z: Z });
    });
    if (sec.mesa != null) [0.2, 0.55, 0.85].forEach((f) => { const s = sec.mesa + (sec.plunge - sec.mesa) * f, F = E.frame(R, s), sd = wr() < 0.5 ? -1 : 1, L = 200 + wr() * 260; if (bioAt(F.z)[0] > 0.3) return; TFX.push({ k: 'devil', x: F.x + F.rx * sd * L, y: floorOf(F.z), z: F.z + F.rz * sd * L, ph: wr() * 6 }); });
    buildLife(W, floorOf, riverK, deepOf);   // (v27) trees, grass, waterfalls, wildlife, fires
  }
  const TFX = [];   // the terrain's own smoke and dust: wrecks smoking, dust devils; (v27) mist off the waterfalls, fires in the burnt woods

  // ---------------------------------------------------------------- (v27, 29 Oct) THE LANDS' LIFE. The owner: "places where there's trees or green grass and
  // different sceneries ... have some activity with the scenery as well, maybe there's animals ... to get people's attention quicker". Woods on the rims
  // and along the walls (cottonwoods by the river, pines, golden aspens; dead trunks in the burnt woods), lush grass, wild flowers and ferns; waterfalls
  // off the gorge's rim with spray and a rainbow; birds that burst up off the ground as you come; hawks circling; a murmuration over the highlands; WILD
  // HORSES galloping beside you; DEER bounding away in pine canyon; fires still burning in the burnt woods, embers drifting. All of it scenery: nothing
  // here can hit you or be hit, and the engine knows nothing of it.
  const WIND = { value: 0 };
  function sway(mat, amp, key) {   // trees and grass lean in the wind, each its own way (by where it stands)
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uWind = WIND;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat swP = instanceMatrix[3].x * 0.031 + instanceMatrix[3].z * 0.017;\n#else\nfloat swP = 0.0;\n#endif\n' +
          'float swY = max(transformed.y, 0.0); transformed.x += (sin(uWind * 1.7 + swP) + 0.4 * sin(uWind * 4.3 + swP * 2.0)) * ' + amp.toFixed(4) + ' * swY * swY; transformed.z += cos(uWind * 1.3 + swP) * ' + (amp * 0.5).toFixed(4) + ' * swY * swY;');
    };
    mat.customProgramCacheKey = () => key;
    return mat;
  }
  MAT.tree = sway(S({ vertexColors: true, roughness: 0.92, metalness: 0 }), 0.03, 'sr-tree');
  {   // (v29) leaves: clusters of light and dark across every crown, per pixel (so they never look like a smooth ball or a cut gem)
    const sw = MAT.tree.onBeforeCompile;
    MAT.tree.onBeforeCompile = (sh) => {
      sw(sh);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float leaf; varying float vLeaf; varying vec3 vTW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLeaf = leaf;\n#ifdef USE_INSTANCING\nvTW = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;\n#else\nvTW = (modelMatrix * vec4(position, 1.0)).xyz;\n#endif');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vLeaf; varying vec3 vTW;\n' +
        'float tH(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\n' +
        'float tN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(tH(i), tH(i + vec3(1.0, 0.0, 0.0)), f.x), mix(tH(i + vec3(0.0, 1.0, 0.0)), tH(i + vec3(1.0, 1.0, 0.0)), f.x), f.y), mix(mix(tH(i + vec3(0.0, 0.0, 1.0)), tH(i + vec3(1.0, 0.0, 1.0)), f.x), mix(tH(i + vec3(0.0, 1.0, 1.0)), tH(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }')
        .replace('#include <color_fragment>', '#include <color_fragment>\nif (vLeaf > 0.5) { float lf = tN(vTW * 0.9) * 0.6 + tN(vTW * 2.7) * 0.4; diffuseColor.rgb *= 0.55 + 0.75 * lf; }');
    };
  }
  MAT.lush = sway(S({ color: '#ffffff', roughness: 1, metalness: 0, side: THREE.DoubleSide }), 0.14, 'sr-lush');
  function mergeCol(parts) {   // [geometry, colour or (x, y, z) => colour, (v29) its own normals (x, y, z) => [nx, ny, nz] for a soft rounded look, leaf 0/1] -> one geometry
    const P3 = [], C3 = [], L3 = [], soft = [];
    parts.forEach((pc) => {
      const q = pc[0].index ? pc[0].toNonIndexed() : pc[0], p = q.attributes.position, col = pc[1], nf = pc[2];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = typeof col === 'function' ? col(x, y, z) : col; P3.push(x, y, z); C3.push(k.r, k.g, k.b); L3.push(pc[3] ? 1 : 0);
        if (nf) { const n = nf(x, y, z), l = Math.hypot(n[0], n[1], n[2]); if (l > 1e-4) soft.push([P3.length / 3 - 1, n[0] / l, n[1] / l, n[2] / l]); }
      }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C3, 3)); g.setAttribute('leaf', new THREE.Float32BufferAttribute(L3, 1));
    g.computeVertexNormals(); const na = g.attributes.normal; soft.forEach((q) => na.setXYZ(q[0], q[1], q[2], q[3])); g.computeBoundingSphere();
    return g;
  }
  const TREE_GEO = (function () {   // unit height, standing on y = 0; the leaves white-ish (each tree's own colour comes per instance)
    const bark = new THREE.Color('#5a4030'), barkD = new THREE.Color('#2b2522'), out = {};
    const shade = (y0, y1) => (x, y, z) => new THREE.Color().setScalar(0.5 + 0.5 * smooth(y0, y1, y) + 0.1 * (noise3(x * 9, y * 9, z * 9) - 0.5));   // (darker low in the crown)
    const lump = (g, k, sd) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + (noise3(x * 2.2 + sd, y * 2.2, z * 2.2) - 0.5) * k; p.setXYZ(i, x * n, y * n, z * n); } return g; };
    // a broadleaf tree (cottonwood, oak, aspen): a trunk, a crown of five lumpy masses
    const TRK = (x, y, z) => [x, 0.08, z], BOUGH = (x, y, z) => [x, Math.hypot(x, z) * 0.55 + 0.04, z];   // (v29) round trunks; boughs that shade like foliage, not facets
    const bl = [[new THREE.CylinderGeometry(0.035, 0.065, 0.5, 6).translate(0, 0.25, 0), bark, TRK]];
    [[0, 0.62, 0, 0.3], [0.17, 0.55, 0.06, 0.22], [-0.15, 0.57, -0.08, 0.23], [0.04, 0.78, -0.12, 0.2], [-0.06, 0.74, 0.14, 0.21], [0.1, 0.47, -0.16, 0.17], [-0.12, 0.49, 0.16, 0.17], [0.0, 0.88, 0.02, 0.15]].forEach((b, i) => bl.push([lump(new THREE.IcosahedronGeometry(1, 1), 0.7, i * 3.7).scale(b[3], b[3] * 0.85, b[3]).translate(b[0], b[1], b[2]), shade(0.35, 0.95), (x, y, z) => [x - b[0], (y - b[1]) * 1.2 + b[3] * 0.35, z - b[2]], 1]));
    out.broad = mergeCol(bl);
    // a pine: a thin trunk, tiers of boughs narrowing to a spire
    const pn = [[new THREE.CylinderGeometry(0.018, 0.04, 0.3, 5).translate(0, 0.15, 0), bark, TRK]];
    [[0.2, 0.3, 0.27], [0.36, 0.27, 0.23], [0.5, 0.25, 0.18], [0.63, 0.22, 0.13], [0.75, 0.2, 0.08]].forEach((t, i) => { const c = lump(new THREE.ConeGeometry(t[2], t[1], 8), 0.35, i * 5.1); c.translate(0, t[0] + t[1] / 2, 0); pn.push([c, shade(0.1, 1.0), BOUGH, 1]); });
    out.pine = mergeCol(pn);
    // a tree the fire killed: a black trunk, a few bare branches; and a stump
    const dd = [[new THREE.CylinderGeometry(0.018, 0.05, 1, 5).translate(0, 0.5, 0), barkD]];
    [[0.45, 0.9, 0.3], [0.62, -1.1, 0.26], [0.75, 2.6, 0.22], [0.55, 4.0, 0.18]].forEach((b) => { const c = new THREE.CylinderGeometry(0.008, 0.018, b[2], 4).translate(0, b[2] / 2, 0); c.rotateZ(0.8); c.rotateY(b[1]); c.translate(0, b[0], 0); dd.push([c, barkD]); });
    out.dead = mergeCol(dd);
    {   // (v28) a pine with snow lying on its boughs, for pine canyon's rims
      const ps = [[new THREE.CylinderGeometry(0.018, 0.04, 0.3, 5).translate(0, 0.15, 0), bark, TRK]], PG = new THREE.Color('#2b5428'), SN = new THREE.Color(0.86, 0.89, 0.94);
      [[0.2, 0.3, 0.27], [0.36, 0.27, 0.23], [0.5, 0.25, 0.18], [0.63, 0.22, 0.13], [0.75, 0.2, 0.08]].forEach((t, i) => { const c = lump(new THREE.ConeGeometry(t[2], t[1], 8), 0.35, i * 5.1); c.translate(0, t[0] + t[1] / 2, 0); ps.push([c, (x, y, z) => ((y - t[0]) / t[1] > 0.32 && noise3(x * 13 + i, y * 13, z * 13) > 0.36 ? SN : PG).clone().multiplyScalar(0.8 + 0.3 * smooth(0.1, 1, y)), BOUGH, 1]); });
      out.pineS = mergeCol(ps);
    }
    out.stump = mergeCol([[new THREE.CylinderGeometry(0.08, 0.12, 0.14, 7).translate(0, 0.07, 0), barkD], [new THREE.CylinderGeometry(0.02, 0.05, 0.3, 4).rotateZ(1.2).translate(0.1, 0.05, 0), barkD]]);
    return out;
  })();
  const COVER = (function () {   // lush grass (nine blades), a fern (fronds arching out), wild flowers (little clusters of heads)
    const out = {}, gp = [], fp = [];
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + k * 0.7, lean = 0.2 + (k % 3) * 0.13, h = 0.7 + (k % 4) * 0.2, bx = Math.cos(a + 1.57) * 0.06, bz = Math.sin(a + 1.57) * 0.06; gp.push(-bx, 0, -bz, bx, 0, bz, Math.cos(a) * lean, h, Math.sin(a) * lean); }
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2 + (k % 2) * 0.3, ca = Math.cos(a), sa = Math.sin(a), wx = -sa * 0.09, wz = ca * 0.09, m = [ca * 0.42, 0.5, sa * 0.42], t = [ca * 0.95, 0.3, sa * 0.95];
      fp.push(0, 0, 0, m[0] + wx, m[1], m[2] + wz, m[0] - wx, m[1], m[2] - wz, m[0] + wx, m[1], m[2] + wz, t[0], t[1], t[2], m[0] - wx, m[1], m[2] - wz);
    }
    [['grass', gp], ['fern', fp]].forEach((q) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(q[1], 3)); g.computeVertexNormals(); out[q[0]] = g; });
    const fl = []; [[0, 0.5, 0], [0.18, 0.4, 0.1], [-0.15, 0.45, -0.12], [0.05, 0.36, -0.2]].forEach((h) => { const o = new THREE.OctahedronGeometry(0.09, 0).toNonIndexed(); o.translate(h[0], h[1], h[2]); fl.push(...o.attributes.position.array); });
    const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(fl, 3)); g2.computeVertexNormals(); out.flower = g2;
    return out;
  })();
  // waterfalls: a sheet of falling streaks (two layers sliding at different speeds), soft at the edges; a faint rainbow in the spray
  function fallTex(seed) {
    const c = canvas(128, 512), x = c.getContext('2d'), r = rng(seed);
    x.fillStyle = 'rgba(214,232,240,0.22)'; x.fillRect(0, 0, 128, 512);
    for (let i = 0; i < 300; i++) {
      const px = r() * 128, w = 1 + r() * 4, a = 0.1 + r() * 0.35, y0 = r() * 512, L = 40 + r() * 220;
      [y0, y0 - 512].forEach((yy) => { const g = x.createLinearGradient(0, yy, 0, yy + L); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(242,249,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(px, yy, w, L); });
    }
    x.globalCompositeOperation = 'destination-in';
    const e = x.createLinearGradient(0, 0, 128, 0); e.addColorStop(0, 'rgba(0,0,0,0)'); e.addColorStop(0.22, 'rgba(0,0,0,1)'); e.addColorStop(0.78, 'rgba(0,0,0,1)'); e.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = e; x.fillRect(0, 0, 128, 512);
    const t = tex(c); t.wrapT = THREE.RepeatWrapping; return t;
  }
  const FALLT = fallTex(91), FALLT2 = fallTex(92);
  function markWater(m) {   // (v30) water writes 0.5 into the picture's alpha (everything opaque writes 1): the reflection pass reflects only there
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.rgb = min(gl_FragColor.rgb, vec3(1.5)); gl_FragColor.a = 0.5;'); };
    m.customProgramCacheKey = () => 'sr-water';
  }
  const BLOB_GEO = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), UP3 = new THREE.Vector3(0, 1, 0);
  const BLOBT = (function () { const c = canvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return tex(c, false); })();
  MAT.blob = new THREE.MeshBasicMaterial({ color: '#0a1020', alphaMap: BLOBT, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  MAT.blob.onBeforeCompile = (sh) => {   // (faded out near you, where the real shadows are)
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vBD;').replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nvBD = length((modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz - cameraPosition);\n#else\nvBD = 0.0;\n#endif');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vBD;').replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= smoothstep(150.0, 260.0, vBD);');
  };
  MAT.blob.customProgramCacheKey = () => 'sr-blob';
  MAT.fall = new THREE.MeshBasicMaterial({ map: FALLT, color: '#e6f0f4', transparent: true, depthWrite: false, side: THREE.DoubleSide });
  MAT.fall2 = new THREE.MeshBasicMaterial({ map: FALLT2, color: '#ffffff', transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.75 });
  const RAINT = (function () { const c = canvas(256, 256), x = c.getContext('2d'); x.filter = 'blur(3px)'; ['255,70,70', '255,150,50', '255,235,90', '90,220,100', '80,150,255', '150,90,230'].forEach((cc, i) => { x.strokeStyle = `rgba(${cc},0.5)`; x.lineWidth = 6; x.beginPath(); x.arc(128, 210, 112 - i * 6, Math.PI * 1.08, Math.PI * 1.92); x.stroke(); }); return tex(c); })();
  // birds: a body and two wings that flap (the wings bend at the body, and again at the elbow; folded when it stands)
  const BIRD_GEO = (function () {
    const p = [], w = [], tri = (a, b, c, k) => { p.push(...a, ...b, ...c); w.push(k, k, k); };
    const N = [0, 0, 0.75], Tl = [0, 0, -0.55], U = [0, 0.13, 0.05], D = [0, -0.11, 0.05], Lb = [-0.12, 0, 0.08], Rb = [0.12, 0, 0.08];
    tri(N, U, Lb, 0); tri(N, Rb, U, 0); tri(N, Lb, D, 0); tri(N, D, Rb, 0); tri(Tl, Lb, U, 0); tri(Tl, U, Rb, 0); tri(Tl, D, Lb, 0); tri(Tl, Rb, D, 0);
    tri([0, 0, -0.45], [-0.2, 0, -0.8], [0.2, 0, -0.8], 0);
    [-1, 1].forEach((sd) => { const A = [0.09 * sd, 0.02, 0.28], B = [0.09 * sd, 0.02, -0.12], C = [0.62 * sd, 0.03, 0.12], Dd = [0.58 * sd, 0.02, -0.22], Tp = [1.15 * sd, 0, -0.32]; tri(A, B, C, 1); tri(B, Dd, C, 1); tri(C, Dd, Tp, 1); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('wk', new THREE.Float32BufferAttribute(w, 1)); g.computeVertexNormals(); return g;
  })();
  MAT.bird = S({ color: '#ffffff', roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
  MAT.bird.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float wk; attribute vec2 fl;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nif (wk > 0.5) { float ax = abs(transformed.x); transformed.x *= mix(1.0, 0.3, fl.y); transformed.y += (fl.x * ax + fl.x * max(ax - 0.55, 0.0) * 0.7) * (1.0 - fl.y) + fl.y * 0.06; }');
  };
  MAT.bird.customProgramCacheKey = () => 'sr-bird';
  const NBIRD = 660, birdFl = new THREE.InstancedBufferAttribute(new Float32Array(NBIRD * 2), 2);
  BIRD_GEO.setAttribute('fl', birdFl);
  const BIRDS = new THREE.InstancedMesh(BIRD_GEO, MAT.bird, NBIRD), ZERO4 = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < NBIRD; i++) { BIRDS.setMatrixAt(i, ZERO4); BIRDS.setColorAt(i, new THREE.Color(1, 1, 1)); }
  BIRDS.frustumCulled = false; BIRDS.castShadow = true; valley.add(BIRDS);
  // wild horses and deer: bodies (each its own coat), the legs drawn apart so they can gallop and leap
  const BEAST = (function () {
    const hide = new THREE.Color(1, 1, 1), dark = new THREE.Color(0.3, 0.27, 0.25), pale = new THREE.Color(1.6, 1.55, 1.5), hoof = new THREE.Color(0.15, 0.13, 0.12), along = (g) => g.rotateX(Math.PI / 2);
    const horse = mergeCol([
      [along(new THREE.CylinderGeometry(0.36, 0.38, 1.3, 9)).scale(1, 1.12, 1).translate(0, 1.18, 0), hide],
      [new THREE.SphereGeometry(0.41, 9, 7).translate(0, 1.16, 0.62), hide], [new THREE.SphereGeometry(0.43, 9, 7).translate(0, 1.2, -0.6), hide],
      [new THREE.CylinderGeometry(0.16, 0.27, 0.95, 8).rotateX(0.62).translate(0, 1.62, 0.98), hide],   // neck
      [new THREE.BoxGeometry(0.22, 0.26, 0.62).rotateX(0.95).translate(0, 1.92, 1.42), hide],   // head
      [new THREE.ConeGeometry(0.05, 0.16, 4).translate(-0.07, 2.22, 1.24), hide], [new THREE.ConeGeometry(0.05, 0.16, 4).translate(0.07, 2.22, 1.24), hide],   // ears
      [new THREE.BoxGeometry(0.07, 0.85, 0.12).rotateX(0.62).translate(0, 1.74, 0.84), dark],   // mane
      [new THREE.ConeGeometry(0.13, 0.9, 6).rotateX(Math.PI + 0.45).translate(0, 0.9, -1.19), dark]   // tail
    ]);
    const deer = mergeCol([
      [along(new THREE.CylinderGeometry(0.25, 0.27, 1.0, 9)).scale(1, 1.1, 1).translate(0, 1.12, 0), hide],
      [new THREE.SphereGeometry(0.29, 9, 7).translate(0, 1.12, 0.46), hide], [new THREE.SphereGeometry(0.3, 9, 7).translate(0, 1.15, -0.45), hide],
      [new THREE.CylinderGeometry(0.1, 0.17, 0.75, 7).rotateX(0.35).translate(0, 1.55, 0.62), hide],
      [new THREE.BoxGeometry(0.16, 0.2, 0.42).rotateX(1.2).translate(0, 1.9, 0.86), hide],
      [new THREE.ConeGeometry(0.06, 0.2, 4).rotateZ(0.6).translate(-0.12, 2.04, 0.74), hide], [new THREE.ConeGeometry(0.06, 0.2, 4).rotateZ(-0.6).translate(0.12, 2.04, 0.74), hide],
      [new THREE.ConeGeometry(0.07, 0.2, 5).rotateX(-2.2).translate(0, 1.22, -0.78), pale],   // the white tail
      ...[-1, 1].flatMap((sd) => [[new THREE.CylinderGeometry(0.018, 0.028, 0.6, 4).rotateZ(-sd * 0.45).translate(sd * 0.16, 2.28, 0.78), dark],   // antlers
        [new THREE.CylinderGeometry(0.012, 0.02, 0.3, 4).rotateZ(-sd * 0.1).rotateX(0.5).translate(sd * 0.24, 2.42, 0.86), dark], [new THREE.CylinderGeometry(0.012, 0.02, 0.28, 4).rotateZ(-sd * 0.9).translate(sd * 0.3, 2.5, 0.74), dark]])
    ]);
    const leg = mergeCol([[new THREE.CylinderGeometry(0.085, 0.055, 0.92, 5).translate(0, -0.46, 0), hide], [new THREE.CylinderGeometry(0.07, 0.08, 0.1, 5).translate(0, -0.96, 0), hoof]]);
    return { horse, deer, leg };
  })();
  const NHORSE = 30, NDEER = 24, beastMat = S({ vertexColors: true, roughness: 0.75, metalness: 0 });
  const HORSES = new THREE.InstancedMesh(BEAST.horse, beastMat, NHORSE), DEER = new THREE.InstancedMesh(BEAST.deer, beastMat, NDEER), LEGS = new THREE.InstancedMesh(BEAST.leg, beastMat, (NHORSE + NDEER) * 4);
  [HORSES, DEER, LEGS].forEach((m) => { for (let i = 0; i < m.count; i++) { m.setMatrixAt(i, ZERO4); m.setColorAt(i, new THREE.Color(1, 1, 1)); } m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; valley.add(m); });
  const LIFE = { flocks: [], herds: [], lastT: -1, lastZ: -1e9, floorOf: null };
  const FALLS = [];
  function buildLife(W, floorOf, riverK, deepOf) {
    const R = W.rail, V = W.valley, len = R.len, r = rng(W.seed + 41), T0 = V.tunnel[0] - 60, T1 = V.tunnel[1] + 60;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
    const topAt = (X, Z, L, hw) => topY(V, X, Z, clamp((L - hw - 30) / 160, 0, 1));
    // TREES: woods in clumps on the rims and over the open country, a line of them along the foot of each wall
    const TR = { broad: [], pine: [], pineS: [], dead: [], stump: [] };
    const LEAF = ['#4f8a2a', '#6a9f36', '#3f7428', '#7fae40', '#5b8f30'].map((h) => new THREE.Color(h)), GOLDL = ['#d6a62c', '#e3bd3e', '#c98c24', '#b9a03a'].map((h) => new THREE.Color(h)), PINEC = ['#2f5a2a', '#27502a', '#3b6732', '#21452a', '#355e36'].map((h) => new THREE.Color(h));
    for (let i = 0; i < 30000; i++) {
      const s = -300 + r() * (len + 1400); if (s > T0 && s < T1) continue;
      const F = E.frame(R, s); bioAt(F.z); const g = BW[0], p = BW[1], b = BW[2], tot = g + p + b;
      if (tot < 0.04 || r() > Math.min(1, tot)) continue;
      const hw = V.width(clamp(s, 0, len + 1600)) / 2, op = V.openAt ? V.openAt(s) : 0, sd = r() < 0.5 ? -1 : 1, where = r();
      let L, foot = false;
      if (op > 0.5) L = hw + 4 + Math.pow(r(), 1.5) * 560;   // the open highlands: woods beyond the way through
      else if (where < 0.3 && hw > 40) { L = hw - 7 + r() * 7; foot = true; }   // along the foot of a wall
      else L = hw + 20 + Math.pow(r(), 1.4) * 260;   // along the rims and back over the plateau
      const X = F.x + F.rx * sd * L, Z = F.z + F.rz * sd * L;
      if (siteHit(X, Z, 8)) continue;   // (v28: none in the lake, the pools or the farm's yard)
      if (!foot && fbm(X * 0.0042 + 9.3, Z * 0.0042 - 2.1, 3) < 0.46 - 0.08 * p - 0.1 * b) continue;   // (woods in clumps, glades between)
      const y = foot ? floorOf(F.z) : topAt(X, Z, L, hw), u = r() * tot, kk = foot ? 0.55 : 1;
      if (u < b) { if (r() < 0.3) TR.stump.push([X, y, Z, (4 + r() * 4) * kk, 1, c.setScalar(0.8 + r() * 0.5).clone(), s]); else TR.dead.push([X, y, Z, (12 + r() * 12) * kk, 1, c.setScalar(0.7 + r() * 0.6).clone(), s]); }
      else if (u < b + p && p > 0.6 && !foot) TR.pineS.push([X, y, Z, (18 + r() * 16), 0.8 + r() * 0.4, c.setScalar(0.85 + r() * 0.25).clone(), s]);
      else if (u < b + p) TR.pine.push([X, y, Z, (18 + r() * 16) * kk, 0.8 + r() * 0.4, PINEC[(r() * 5) | 0].clone().multiplyScalar(0.8 + r() * 0.4), s]);
      else TR.broad.push([X, y, Z, (15 + r() * 12) * kk, 0.9 + r() * 0.5, (p > 0.5 && r() < 0.55 ? GOLDL[(r() * 4) | 0] : LEAF[(r() * 5) | 0]).clone().multiplyScalar(0.68 + r() * 0.36), s]);   // (golden aspens among the pines)
    }
    const CH = 1500;
    const put = (geo, mat, list, cast, tilt, up) => {   // in blocks along the route, so the ones out of view are skipped
      const by = new Map(); list.forEach((t) => { const k = Math.floor(t[6] / CH); if (!by.has(k)) by.set(k, []); by.get(k).push(t); });
      by.forEach((Lst) => {
        const im = new THREE.InstancedMesh(geo, mat, Lst.length);
        Lst.forEach((t, i) => { v.set(t[0], t[1] + up, -t[2]); q.setFromEuler(e.set((r() - 0.5) * tilt, r() * 6.283, (r() - 0.5) * tilt)); sc.set(t[3] * t[4], t[3], t[3] * t[4]); m4.compose(v, q, sc); im.setMatrixAt(i, m4); im.setColorAt(i, t[5]); });
        im.computeBoundingSphere(); im.castShadow = !!cast; im.receiveShadow = true; terrain.add(im);
      });
    };
    {   // (v29) beyond the sun's shadow map (it follows your ship) every tree still throws a soft shadow on the ground
      const BL2 = [], dx0 = -VSUN_E.x, dz0 = -VSUN_E.z, dl = Math.hypot(dx0, dz0) || 1, sx = dx0 / dl, sz = dz0 / dl, ang = Math.atan2(sz, sx);
      TR.broad.concat(TR.pine, TR.pineS).forEach((t) => BL2.push([t[0] + sx * t[3] * 0.42, t[1] + 0.35, t[2] + sz * t[3] * 0.42, t[3], t[4], null, t[6]]));
      const by = new Map(); BL2.forEach((t) => { const k = Math.floor(t[6] / 1500); if (!by.has(k)) by.set(k, []); by.get(k).push(t); });
      by.forEach((Lst) => {
        const im = new THREE.InstancedMesh(BLOB_GEO, MAT.blob, Lst.length);
        Lst.forEach((t, i) => { v.set(t[0], t[1], -t[2]); q.setFromAxisAngle(UP3, ang); sc.set(t[3] * 1.05, 1, t[3] * 0.55 * t[4]); m4.compose(v, q, sc); im.setMatrixAt(i, m4); });
        im.computeBoundingSphere(); im.renderOrder = 1; terrain.add(im);
      });
    }
    put(TREE_GEO.broad, MAT.tree, TR.broad, true, 0.08, -0.3); put(TREE_GEO.pine, MAT.tree, TR.pine, true, 0.06, -0.3); put(TREE_GEO.dead, MAT.tree, TR.dead, true, 0.25, -0.3); put(TREE_GEO.stump, MAT.tree, TR.stump, false, 0.15, -0.2); put(TREE_GEO.pineS, MAT.tree, TR.pineS, true, 0.06, -0.3);
    // GROUND COVER: lush grass, ferns along the walls and under the pines, wild flowers in the meadows and on the gorge's banks
    const GL = [], FL = [], FN = [];
    const FLC = ['#f0d64a', '#f4f1e8', '#9a6ad0', '#d4503e', '#6f8fe0', '#f2a640'].map((h) => new THREE.Color(h).multiplyScalar(1.15)), GRC = ['#5d8f2c', '#77a336', '#4a7a26', '#8aa83e'].map((h) => new THREE.Color(h));
    for (let i = 0; i < 46000; i++) {
      const s = -100 + r() * (len + 1300); if (s > T0 + 40 && s < T1 - 40) continue;
      const F = E.frame(R, s); bioAt(F.z); const g = BW[0], p = BW[1], lush = Math.min(1, g + p * 0.7); if (lush < 0.05 || r() > lush) continue;
      const hw = V.width(clamp(s, 0, len + 1600)) / 2, op = V.openAt ? V.openAt(s) : 0, sd = r() < 0.5 ? -1 : 1, kind = r();
      let L = op > 0.5 ? r() * (hw + 200) : Math.sqrt(r()) * hw * 0.99;
      if (riverK(s) > 0.3 && L < hw * 0.66) L = hw * (0.66 + r() * 0.33);   // (none in the river)
      const X = F.x + F.rx * sd * L, Z = F.z + F.rz * sd * L, y = L > hw + 2 ? topAt(X, Z, L, hw) : floorOf(F.z);
      if (siteHit(X, Z, 1)) continue;
      if (kind < 0.14 && g > 0.5 && p < 0.6) FL.push([X, y, Z, 1.8 + r() * 1.6, 1, FLC[(r() * 6) | 0], s]);
      else if (kind < 0.25 && (L > hw * 0.72 || p > 0.6)) FN.push([X, y, Z, 2.5 + r() * 3, 1, c.copy(GRC[2]).multiplyScalar(0.55 + r() * 0.4).clone(), s]);
      else GL.push([X, y, Z, 1.6 + r() * 2.4, 1, GRC[(r() * 4) | 0].clone().multiplyScalar((0.75 + r() * 0.5) * (1 - 0.35 * p)), s]);
    }
    put(COVER.grass, MAT.lush, GL, false, 0.2, 0); put(COVER.fern, MAT.lush, FN, false, 0.2, 0); put(COVER.flower, MAT.lush, FL, false, 0.1, 0);
    // WATERFALLS off the gorge's rim, down the cliff into the river: spray where they land, a faint rainbow in it
    FALLS.length = 0;
    const fr = rng(W.seed + 42);
    (V.river || []).forEach((rq, qi) => (qi === 0 ? [0.22, 0.52, 0.8] : [0.3, 0.7]).forEach((u, jj) => {
      const s = rq[0] + (rq[1] - rq[0]) * u, sd = (qi + jj) % 2 ? 1 : -1, F = E.frame(R, s), hw = V.width(s) / 2, floorY = floorOf(F.z), deep = Math.max(0, deepOf(F.z));
      const X0 = F.x + F.rx * sd * (hw + 16), Z0 = F.z + F.rz * sd * (hw + 16), rimY = topY(V, X0, Z0, 0), H = rimY - floorY, NV = 28, wd = 9 + fr() * 7, pos = [], uv = [], idx = [];
      for (let k = 0; k <= NV; k++) {
        const t = k / NV, hh = H * (1 - t), Lw = hw + 2 + stepBack(hh - deep) + 0.16 * Math.min(hh, deep) + 2.2 * (hh / H), L = Math.min(hw + 14, Lw - 3.5), ww = wd * (0.8 + 0.5 * t);
        [-1, 1].forEach((ee) => { const X = F.x + F.rx * sd * L + F.fx * ee * ww / 2, Z = F.z + F.rz * sd * L + F.fz * ee * ww / 2; pos.push(X, floorY + hh, -Z); uv.push(ee < 0 ? 0 : 1, t * H / 26); });
      }
      for (let k = 0; k < NV; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); fg.setIndex(idx);
      const m1 = new THREE.Mesh(fg, MAT.fall), m2 = new THREE.Mesh(fg, MAT.fall2); m2.position.set(-F.rx * sd * 0.8, 0, F.rz * sd * 0.8); m1.renderOrder = 2; m2.renderOrder = 3; terrain.add(m1); terrain.add(m2);
      const bx = F.x + F.rx * sd * (hw - 2), bz = F.z + F.rz * sd * (hw - 2);
      const rb = glowSprite(RAINT, '#ffffff', 70, 0); rb.position.set(bx - F.rx * sd * 26, floorY + 22, -(bz - F.rz * sd * 26)); terrain.add(rb);
      TFX.push({ k: 'fall', x: bx, y: floorY + 1, z: bz, ix: -F.rx * sd, iz: -F.rz * sd, rb: rb });
      FALLS.push(s);
    }));
    buildSites(W, put, r);   // (v28) the lake and the pools, the farm
    if (V.sAtF) [25, 28.5, 39.5, 41.5, 91, 97, 103].forEach((f) => { const s2 = V.sAtF(f), F = E.frame(R, s2); TFX.push({ k: 'haze', x: F.x, y: floorOf(F.z) + 2, z: F.z, r: V.width(s2) * 0.4 }); });   // (v29) mist in the gorge and the pines
    // FIRES still burning in the burnt woods (on the floor by the walls and up on the rims); white dust devils out on the salt pan
    for (let i = 0, made = 0; i < 600 && made < 20; i++) {
      const s = r() * len, F = E.frame(R, s); bioAt(F.z); if (BW[2] < 0.75) continue;
      const hw = V.width(s) / 2, sd = r() < 0.5 ? -1 : 1, top = r() < 0.5, L = top ? hw + 24 + r() * 120 : hw - 5 - r() * 4, X = F.x + F.rx * sd * L, Z = F.z + F.rz * sd * L;
      TFX.push({ k: 'burn', x: X, y: (top ? topAt(X, Z, L, hw) : floorOf(F.z)) + 1, z: Z, big: 0.7 + r() * 0.8 }); made++;
    }
    if (V.sAtF) [143, 153].forEach((f) => { const s = V.sAtF(f), F = E.frame(R, s), sd = r() < 0.5 ? -1 : 1, hw = V.width(s) / 2, L = hw * (0.45 + r() * 0.4); TFX.push({ k: 'devil', x: F.x + F.rx * sd * L, y: floorOf(F.z), z: F.z + F.rz * sd * L, ph: r() * 6, white: true }); });
    // the WILDLIFE: flocks resting on the ground (up they go as you come), hawks circling, murmurations; herds of wild horses and deer
    LIFE.flocks.length = 0; LIFE.herds.length = 0; LIFE.floorOf = floorOf; LIFE.lastT = -1; LIFE.lastZ = -1e9;
    if (!V.sAtF) return;
    let bi = 0;
    const flock = (kind, f, L, n, size, cols, extra) => {
      if (bi + n > NBIRD) return;
      const s = V.sAtF(f), F = E.frame(R, s), hw = V.width(s) / 2, Lx = typeof L === 'function' ? L(hw) : L * hw, fl = floorOf(F.z);
      const fk = Object.assign({ kind, x: F.x + F.rx * Lx, z: F.z + F.rz * Lx, fl, n, i0: bi, size, side: Lx < 0 ? -1 : 1, rx: F.rx, rz: F.rz, fx: F.fx, fz: F.fz, w: 0.007 + r() * 0.004, b: [] }, extra || {});
      if (fk.hy === 'rim') fk.hy = V.wallAt(s) + 45;
      for (let k = 0; k < n; k++) { const col = cols[(r() * cols.length) | 0]; fk.b.push({ ox: (r() - 0.5) * 26, oz: (r() - 0.5) * 26, u: r() * 6.283, v: Math.acos(2 * r() - 1), r0: 0.5 + 0.5 * Math.cbrt(r()), ph: r() * 6.283, yaw: r() * 6.283, d0: (r() * 16) | 0 }); BIRDS.setColorAt(bi + k, col); }
      bi += n; LIFE.flocks.push(fk);
    };
    const WHITE = ['#f2f1ec', '#e4e6e8', '#9aa0a8'].map((h) => new THREE.Color(h)), DARKB = ['#17171b', '#24222a', '#3a3530'].map((h) => new THREE.Color(h)), BROWNB = ['#6a5038', '#8a7050', '#4a4038'].map((h) => new THREE.Color(h)), RAPT = ['#4a3424', '#3a2a20'].map((h) => new THREE.Color(h));
    [[24.6, 0.58], [27.4, -0.6], [38.6, 0.6], [41.6, -0.58]].forEach((a) => flock('rest', a[0], a[1], 12, 1.9, WHITE));   // egrets and herons by the river
    [[63.5, 0.35], [69, -0.5], [74.5, 0.6], [80.5, -0.25]].forEach((a) => flock('rest', a[0], a[1], 22, 1.4, DARKB));   // starlings and rooks on the highland grass
    [[92.5, 0.7], [99.5, -0.7], [104.5, 0.65]].forEach((a) => flock('rest', a[0], a[1], 12, 1.2, BROWNB));
    [[112.5, 0.5], [121.5, -0.5], [128.5, 0.4]].forEach((a) => flock('rest', a[0], a[1], 10, 1.5, DARKB));   // crows picking over the burnt ground
    [[140, 0.3], [150, -0.4]].forEach((a) => flock('rest', a[0], a[1], 16, 1.6, WHITE));   // gulls on the salt
    [[26, 110], [34.5, 130], [66, 120], [77, 140], [95, 'rim'], [102.5, 'rim'], [118, 95], [126, 95]].forEach((a) => flock('circle', a[0], 0, 2 + (r() < 0.5 ? 1 : 0), 3.6, a[0] > 110 ? DARKB : RAPT, { hy: a[1] }));   // hawks; vultures over the burnt woods
    const flockAt = (kind, X, Z, fl, F, n, size, cols, extra) => {   // (v28) a flock at a place (the lake, a pool)
      if (bi + n > NBIRD) return; const sp = (extra && extra.spread) || 26;
      const fk = Object.assign({ kind, x: X, z: Z, fl, n, i0: bi, size, side: 1, rx: F.rx, rz: F.rz, fx: F.fx, fz: F.fz, w: 0.008, b: [] }, extra || {});
      if (fk.flam) { fk.f0 = fi; fi += n; if (fi > NFLAM) { fi -= n; return; } }
      for (let k = 0; k < n; k++) { fk.b.push({ ox: (r() - 0.5) * sp, oz: (r() - 0.5) * sp * 1.6, u: r() * 6.283, v: 1, r0: 1, ph: r() * 6.283, yaw: r() * 6.283, d0: (r() * 22) | 0 }); BIRDS.setColorAt(bi + k, cols[(r() * cols.length) | 0]); }
      bi += n; LIFE.flocks.push(fk);
    };
    let fi = 0; for (let i = 0; i < NFLAM; i++) FLAMS.setMatrixAt(i, ZERO4);
    const PINKB = ['#f07d95', '#f59aab', '#e86a86'].map((h) => new THREE.Color(h)), DUCK = ['#6a5a44', '#4a5a3a', '#7a6a50', '#2f4a38'].map((h) => new THREE.Color(h));
    SITES.forEach((q) => {
      const F = E.frame(R, q.s);
      if (q.k === 'lake') { flockAt('rest', q.x + q.fx * 30, q.z + q.fz * 30, q.y, F, 8, 2.8, [WHITE[0], WHITE[1]], { spread: 70, sit: 0.05, wet: true, trig: 300 }); flockAt('rest', q.x - q.fx * 60, q.z - q.fz * 60, q.y, F, 14, 1.3, DUCK, { spread: 60, sit: 0.05, wet: true }); }
      else if (q.k === 'pool' && q.pink) flockAt('rest', q.x, q.z, q.y - 0.4, F, 13, 2.5, PINKB, { spread: q.r * 1.1, sit: 0, wet: true, flam: true, trig: 240 });
    });
    flock('murm', 70.5, (hw) => hw + 330, 130, 2.3, DARKB, { hy: 95 }); flock('murm', 81.5, (hw) => -(hw + 300), 120, 2.3, DARKB, { hy: 110 });
    for (let i = bi; i < NBIRD; i++) BIRDS.setMatrixAt(i, ZERO4);
    if (BIRDS.instanceColor) BIRDS.instanceColor.needsUpdate = true;
    const HORSEC = ['#7a3f1f', '#5a3420', '#1e1b1a', '#8f8c88', '#d6cfc4', '#b88a50', '#6b4a32'].map((h) => new THREE.Color(h)), DEERC = ['#9a6a42', '#8a5c38', '#a87a50'].map((h) => new THREE.Color(h));
    let hi = 0, di = 0;
    const herd = (kind, f, L, n, ang) => {
      const s = V.sAtF(f), F = E.frame(R, s), hw = V.width(s) / 2, X = F.x + F.rx * L * hw, Z = F.z + F.rz * L * hw, a = Math.atan2(F.fx, F.fz) + ang, horse = kind === 'horse';
      const H = { kind, x0: X, z0: Z, x: X, z: Z, dx: Math.sin(a), dz: Math.cos(a), st: 0, t: 0, spd: horse ? 1.75 : 1.35, run: horse ? 900 : 260, a: [] };
      for (let k = 0; k < n; k++) {
        const ix = horse ? hi++ : di++; if (ix >= (horse ? NHORSE : NDEER)) break;
        const col = (horse ? HORSEC[(r() * 7) | 0] : DEERC[(r() * 3) | 0]).clone().multiplyScalar(0.85 + r() * 0.3);
        H.a.push({ i: ix, ox: (r() - 0.5) * 34, oz: (r() - 0.5) * 46, ph: r() * 6.283, sp: 0.92 + r() * 0.16, yaw: r() * 6.283 });
        (horse ? HORSES : DEER).setColorAt(ix, col); for (let l = 0; l < 4; l++) LEGS.setColorAt((horse ? 0 : NHORSE * 4) + ix * 4 + l, col);
      }
      LIFE.herds.push(H);
    };
    herd('horse', 64.2, -0.5, 14, 0.22); herd('horse', 75.2, 0.45, 14, -0.18);
    herd('deer', 93.2, -0.86, 8, 0.2); herd('deer', 100.6, 0.86, 8, -0.2); herd('deer', 105.4, -0.86, 7, 0.18);
    [HORSES, DEER, LEGS].forEach((m) => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    lifeReset();
  }
  function lifeReset() {
    LIFE.flocks.forEach((fk) => { fk.b.forEach((b) => { b.fl0 = false; }); fk.up = false; fk.t = 0; fk.done = false; fk.hid = false; });
    LIFE.herds.forEach((H) => { H.x = H.x0; H.z = H.z0; H.st = 0; H.t = 0; });
    LIFE.lastT = -1; LIFE.lastZ = -1e9;
    FARM.spots.forEach((p) => { p.burn = 0; }); FARM.lostDone = false;
  }
  const KM = new THREE.Matrix4(), KM2 = new THREE.Matrix4(), KM3 = new THREE.Matrix4(), KQ = new THREE.Quaternion(), KQ2 = new THREE.Quaternion(), KV = new THREE.Vector3(), KV2 = new THREE.Vector3(), KS = new THREE.Vector3(), KO = new THREE.Vector3(), KUP = new THREE.Vector3(0, 1, 0), KZ = new THREE.Vector3(0, 0, 1), KX = new THREE.Vector3(1, 0, 0), KE = new THREE.Euler(0, 0, 0, 'YXZ');
  function birdAt(i, x, y, z, dx, dy, dz, size, bank, flap, fold) {   // (the engine's terms) a bird, nose along its way
    KV.set(dx, dy, -dz); if (KV.lengthSq() < 1e-8) KV.set(0, 0, 1); KV.normalize();
    KM.lookAt(KV, KO, KUP); KQ.setFromRotationMatrix(KM); if (bank) KQ.multiply(KQ2.setFromAxisAngle(KZ, bank));
    KM.compose(KV2.set(x, y, -z), KQ, KS.set(size, size, size)); BIRDS.setMatrixAt(i, KM); birdFl.setXY(i, flap, fold);
  }
  const HIPS = { horse: [[-0.2, 1.0, 0.6], [0.2, 1.0, 0.6], [-0.2, 1.02, -0.62], [0.2, 1.02, -0.62]], deer: [[-0.14, 0.95, 0.45], [0.14, 0.95, 0.45], [-0.14, 0.97, -0.45], [0.14, 0.97, -0.45]] }, GAIT = [0, 0.55, 3.3, 3.85];
  function stepLife(W, c) {
    if (!LIFE.floorOf) return;
    if (LIFE.lastT >= 0 && (W.t < LIFE.lastT || c.z < LIFE.lastZ - 500)) lifeReset();   // (that stretch flown again - a retry, the chapter again: all back where it was)
    const n = LIFE.lastT < 0 ? 1 : Math.min(8, W.t - LIFE.lastT); LIFE.lastT = W.t; LIFE.lastZ = c.z;
    const fo = LIFE.floorOf, t = W.t;
    LIFE.flocks.forEach((fk) => {
      if (fk.done || Math.abs(fk.z - c.z) > 3300) { if (!fk.hid) { for (let k = 0; k < fk.n; k++) { BIRDS.setMatrixAt(fk.i0 + k, ZERO4); if (fk.flam) FLAMS.setMatrixAt(fk.f0 + k, ZERO4); } fk.hid = true; } return; }
      fk.hid = false;
      if (fk.kind === 'rest') {
        if (!fk.up && c.z > fk.z - (fk.trig || 430)) {   // up they go
          fk.up = true; fk.t = 0;
          fk.b.forEach((b) => { b.x = fk.x + fk.rx * b.ox + fk.fx * b.oz; b.z = fk.z + fk.rz * b.ox + fk.fz * b.oz; b.y = fk.fl + (fk.sit != null ? fk.sit : 0.3) * fk.size; const out = b.ox / 13 * 0.4 + fk.side * 0.45 + (Math.random() - 0.5) * 0.3, fw = 0.4 + Math.random() * 0.8;
            b.vx = fk.rx * out + fk.fx * fw; b.vz = fk.rz * out + fk.fz * fw; b.vy = 0.8 + Math.random() * 0.7; b.d = b.d0; });
        }
        if (fk.up) fk.t += n;
        if (fk.up && fk.t > 460) { fk.done = true; return; }
        fk.b.forEach((b, k) => {
          if (!fk.up || b.d > 0) {
            if (fk.up) b.d -= n;
            const x = fk.x + fk.rx * b.ox + fk.fx * b.oz, z = fk.z + fk.rz * b.ox + fk.fz * b.oz, peck = Math.max(0, Math.sin(t * 0.13 + b.ph * 3)) > 0.97 ? 0.4 : 0;
            if (fk.flam) { BIRDS.setMatrixAt(fk.i0 + k, ZERO4); flamAt(fk.f0 + k, x, fk.fl, z, b.yaw, t, b.ph); }   // (v28) flamingos stand in the pool
            else birdAt(fk.i0 + k, x, fk.fl + (fk.sit != null ? fk.sit : 0.3) * fk.size, z, Math.cos(b.yaw), -peck, Math.sin(b.yaw), fk.size, 0, 0, 1);
            return;
          }
          if (!b.fl0) {   // (v28) off it goes: off the water with a splash
            b.fl0 = true; if (fk.flam) FLAMS.setMatrixAt(fk.f0 + k, ZERO4);
            if (fk.wet) for (let q3 = 0; q3 < 3; q3++) puff(q3 ? 'spark' : 'mist', b.x + (Math.random() - 0.5) * 2, fk.fl + 0.3, b.z + (Math.random() - 0.5) * 2, { vx: (Math.random() - 0.5) * 0.4, vy: 0.3 + Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.4, life: q3 ? 24 : 60, s0: q3 ? 0.7 : 4, s1: q3 ? 0.2 : 10, a0: 0.6, g: q3 ? 0.03 : 0 }).s.material.color.set('#eaf6ff');
          }
          for (let q2 = 0; q2 < n; q2++) { b.x += b.vx; b.y += b.vy; b.z += b.vz; b.vy = b.vy * 0.985 + 0.006; b.vx += (Math.random() - 0.5) * 0.06; b.vz += (Math.random() - 0.5) * 0.06; b.ph += 0.62; }
          birdAt(fk.i0 + k, b.x, b.y, b.z, b.vx, b.vy * 0.6, b.vz, fk.size, 0, Math.sin(b.ph) * 0.95, 0);
        });
      } else if (fk.kind === 'circle') {   // hawks: wide slow circles, gliding, a few wingbeats now and then
        fk.b.forEach((b, k) => {
          const a = t * fk.w + b.u, Rr = 45 + b.r0 * 35, cx = fk.x + Math.sin(t * 0.002 + b.u) * 20, cy = fk.fl + fk.hy + b.r0 * 18 + Math.sin(a * 0.7) * 4;
          const fl = Math.sin(t * 0.05 + b.ph) > 0.86 ? Math.sin(t * 0.45 + b.ph) * 0.75 : 0.12;
          birdAt(fk.i0 + k, cx + Math.cos(a) * Rr, cy, fk.z + Math.sin(a) * Rr, -Math.sin(a), 0, Math.cos(a), fk.size, -0.38, fl, 0);
        });
      } else {   // a murmuration: thousands in life, a hundred here - a cloud that swirls, stretches and folds over the highlands
        const Ax = 55 + 25 * Math.sin(t * 0.007), Ay = 18 + 10 * Math.sin(t * 0.011 + 1), Az = 40 + 30 * Math.cos(t * 0.005), th = t * 0.012;
        const cx = fk.x + Math.sin(t * 0.004) * 60, cy = fk.fl + fk.hy + Math.sin(t * 0.006) * 20, cz = fk.z + Math.cos(t * 0.003) * 50;
        fk.b.forEach((b, k) => {
          const u = b.u + th, sv = Math.sin(b.v), x = cx + Ax * Math.cos(u) * sv * b.r0, y = cy + Ay * Math.cos(b.v) * b.r0 + 8 * Math.sin(t * 0.02 + b.u * 3), z = cz + Az * Math.sin(u) * sv * b.r0;
          const dx = b.px != null ? x - b.px : 1, dy = b.px != null ? y - b.py : 0, dz = b.px != null ? z - b.pz : 0; b.px = x; b.py = y; b.pz = z;
          birdAt(fk.i0 + k, x, y, z, dx, dy, dz, fk.size, 0, Math.sin(t * 0.9 + b.ph) * 0.9, 0);
        });
      }
    });
    BIRDS.instanceMatrix.needsUpdate = true; birdFl.needsUpdate = true; FLAMS.instanceMatrix.needsUpdate = true;
    stepFarm(W, c, n);   // (v28)
    LIFE.herds.forEach((H) => {
      if (Math.abs(H.z - c.z) > 3300) return;
      if (H.st === 0 && c.z > H.z - 760) { H.st = 1; H.t = 0; }   // they bolt
      if (H.st === 1) for (let k = 0; k < n; k++) { H.t++; H.x += H.dx * H.spd; H.z += H.dz * H.spd; if (H.t > H.run) H.st = 2; }
      const run = H.st === 1, deer = H.kind === 'deer', SC = deer ? 3.4 : 4.0, mesh = deer ? DEER : HORSES, l0 = deer ? NHORSE * 4 : 0, hips = HIPS[H.kind];
      H.a.forEach((a) => {
        if (run) a.ph += n * (deer ? 0.2 : 0.3) * a.sp;
        const oz = a.oz + (run ? (a.sp - 1) * H.t * H.spd * 0.6 : 0), px = H.x + H.dz * a.ox + H.dx * oz, pz = H.z - H.dx * a.ox + H.dz * oz;
        const yaw = run ? Math.atan2(H.dx, -H.dz) : a.yaw, s1 = Math.sin(a.ph);
        const lift = run ? (deer ? Math.max(0, s1) * 2.6 : Math.abs(s1) * 0.35) : 0, pitch = run ? (deer ? -Math.cos(a.ph) * 0.22 * (s1 > 0 ? 1 : 0) : s1 * 0.07) : 0.12;
        KE.set(pitch, yaw, 0); KQ.setFromEuler(KE); KM.compose(KV2.set(px, fo(pz) + lift - 0.15, -pz), KQ, KS.set(SC, SC, SC)); mesh.setMatrixAt(a.i, KM);
        for (let l = 0; l < 4; l++) {
          let ang = 0;
          if (run) ang = deer ? (s1 > 0 ? (l < 2 ? -0.95 : 0.95) * s1 : (l < 2 ? 0.45 : -0.45) * -s1) : Math.sin(a.ph + GAIT[l]) * 0.75;
          const h = hips[l]; KQ2.setFromAxisAngle(KX, ang); KM3.compose(KV.set(h[0], h[1], h[2]), KQ2, KS.set(deer ? 0.7 : 1, 1, deer ? 0.7 : 1)); KM2.multiplyMatrices(KM, KM3); LEGS.setMatrixAt(l0 + a.i * 4 + l, KM2);
        }
      });
      if (run && !deer && t % 3 === 0 && H.a.length) {   // dust kicked up behind the herd
        const a = H.a[(Math.random() * H.a.length) | 0], oz = a.oz + (a.sp - 1) * H.t * H.spd * 0.6, px = H.x + H.dz * a.ox + H.dx * oz - H.dx * 6, pz = H.z - H.dx * a.ox + H.dz * oz - H.dz * 6;
        const pd = puff('dust', px, fo(pz) + 1, pz, { vy: 0.05, vx: (Math.random() - 0.5) * 0.2, life: 70, s0: 4, s1: 15, a0: 0.3, drag: 0.96 }); groundDust(pd, pz);
      }
      mesh.instanceMatrix.needsUpdate = true; LEGS.instanceMatrix.needsUpdate = true;
    });
    bioAt(c.z);
    if (BW[2] > 0.25 && W.rail) for (let k = 0; k < n; k++) if (Math.random() < BW[2] * 0.9) {   // embers drifting in the burnt woods
      const F = E.frame(W.rail, W.s + 60 + Math.random() * 280), hw = W.valley.width(W.s) / 2, L = (Math.random() * 2 - 1) * hw * 1.1, X = F.x + F.rx * L, Z = F.z + F.rz * L;
      const pe = puff('spark', X, fo(Z) + 2 + Math.random() * 38, Z, { vx: (Math.random() - 0.5) * 0.3, vy: 0.12 + Math.random() * 0.25, vz: (Math.random() - 0.5) * 0.3, life: 120, s0: 1.0, s1: 0.35, drag: 0.995 });
      if (pe) pe.s.material.color.set(Math.random() < 0.7 ? '#ff9a3a' : '#ffd070');
    }
  }

  // ---------------------------------------------------------------- (v28, 29 Oct; the owner: "the ideas for next time ... do those and make it really good")
  // a LAKE on the highlands you skim across (swans and ducks on it, mist on the water), the FARM the Rooks are raiding (a farmhouse, a barn, a silo, a
  // windmill turning, wheat fields, sheep - the raiders' lasers setting it alight until you drive them off), pink brine POOLS on the salt pan with
  // FLAMINGOS standing in them (up they go as you come), and SNOW on pine canyon's rims and its pines, falling as you fly through.
  const LAKEN = WATER.nrm.clone(); LAKEN.wrapS = LAKEN.wrapT = THREE.RepeatWrapping; LAKEN.needsUpdate = true;
  MAT.lake = S({ color: '#163f52', roughness: 0.1, metalness: 0.1, normalMap: LAKEN, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 0.75 });
  MAT.poolPink = S({ color: '#d4919b', roughness: 0.12, metalness: 0.05, normalMap: LAKEN, normalScale: new THREE.Vector2(0.15, 0.15), envMapIntensity: 1.1 });
  MAT.poolBlue = S({ color: '#6cbcb4', roughness: 0.12, metalness: 0.05, normalMap: LAKEN, normalScale: new THREE.Vector2(0.15, 0.15), envMapIntensity: 1.1 });
  [MAT.water, MAT.lake, MAT.poolPink, MAT.poolBlue].forEach(markWater);   // (v30)
  MAT.fWall = S({ color: '#ddd3bc', roughness: 0.9 }); MAT.fRoof = S({ color: '#7d3426', roughness: 0.8 }); MAT.fBarn = S({ color: '#8c2e22', roughness: 0.85 }); MAT.fDark = S({ color: '#3b3633', roughness: 0.85 });
  MAT.fMetal = S({ color: '#a3aab0', metalness: 0.6, roughness: 0.4 }); MAT.fWhite = S({ color: '#ebe8e1', roughness: 0.8 }); MAT.fHay = S({ color: '#d9b55e', roughness: 1 }); MAT.fWood = S({ color: '#6b5038', roughness: 0.9 });
  MAT.fGlass = S({ color: '#1d2630', emissive: '#ffb860', emissiveIntensity: 0.3, roughness: 0.2 });
  const FLAMINGO = (function () {
    const pink = new THREE.Color('#f0849a'), pale = new THREE.Color('#e8a0aa'), blk = new THREE.Color(0.05, 0.04, 0.04);
    return mergeCol([
      [new THREE.SphereGeometry(0.42, 10, 8).scale(0.8, 0.7, 1.3).translate(0, 1.95, 0), pink], [new THREE.ConeGeometry(0.22, 0.6, 6).rotateX(-1.9).translate(0, 2.0, -0.62), pink],
      [new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6).rotateX(0.35).translate(0, 2.45, 0.42), pink], [new THREE.CylinderGeometry(0.055, 0.06, 0.6, 6).rotateX(-0.3).translate(0, 3.0, 0.45), pink],
      [new THREE.SphereGeometry(0.13, 8, 6).translate(0, 3.32, 0.42), pink], [new THREE.ConeGeometry(0.06, 0.32, 5).rotateX(2.3).translate(0, 3.2, 0.62), blk],
      [new THREE.CylinderGeometry(0.025, 0.025, 1.7, 4).translate(-0.1, 0.85, 0), pale], [new THREE.CylinderGeometry(0.025, 0.025, 1.7, 4).translate(0.1, 0.85, 0.05), pale]
    ]);
  })();
  const NFLAM = 60, FLAMS = new THREE.InstancedMesh(FLAMINGO, beastMat, NFLAM);
  for (let i = 0; i < NFLAM; i++) { FLAMS.setMatrixAt(i, ZERO4); FLAMS.setColorAt(i, new THREE.Color(1, 1, 1)); }
  FLAMS.frustumCulled = false; FLAMS.castShadow = true; valley.add(FLAMS);
  function flamAt(i, x, y, z, yaw, t, ph) { KE.set(Math.max(0, Math.sin(t * 0.021 + ph)) * 0.35, yaw, 0); KQ.setFromEuler(KE); KM.compose(KV2.set(x, y, -z), KQ, KS.set(2.6, 2.6, 2.6)); FLAMS.setMatrixAt(i, KM); }   // (now and then a head goes down to feed)
  const SHEEP = mergeCol([[new THREE.SphereGeometry(0.6, 8, 6).scale(1, 0.8, 1.3).translate(0, 0.95, 0), new THREE.Color(0.95, 0.93, 0.88)], [new THREE.BoxGeometry(0.3, 0.32, 0.42).translate(0, 1.05, 0.82), new THREE.Color(0.12, 0.11, 0.1)],
    ...[[-0.25, 0.4], [0.25, 0.4], [-0.25, -0.4], [0.25, -0.4]].map((p) => [new THREE.CylinderGeometry(0.07, 0.06, 0.55, 4).translate(p[0], 0.28, p[1]), new THREE.Color(0.12, 0.11, 0.1)])]);
  function prism(len, w, h) { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.lineTo(-w / 2, 0); const g = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2); g.rotateY(Math.PI / 2); return g; }
  const FARM = { g: null, sails: null, spots: [], beams: [], x: 0, z: 0, lostDone: false };
  function buildSites(W, put, r) {   // the lake's water and the salt pools; the farm
    const R = W.rail, V = W.valley;
    SITES.forEach((q) => {
      if (q.k === 'flat') return;
      const N = 72, pos = [q.x, q.y, -q.z], uv = [q.x / 40, q.z / 40], idx = [];
      for (let k = 0; k <= N; k++) { const a = k / N * Math.PI * 2, u = Math.cos(a) * q.r * q.el * 1.45, v = Math.sin(a) * q.r * 1.45, X = q.x + q.fx * u + q.rx * v, Z = q.z + q.fz * u + q.rz * v; pos.push(X, q.y, -Z); uv.push(X / 40, Z / 40); if (k) idx.push(0, k, k + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      if (g.attributes.normal.getY(0) < 0) { g.index.array.reverse(); g.computeVertexNormals(); }
      const m = new THREE.Mesh(g, q.k === 'lake' ? MAT.lake : q.pink ? MAT.poolPink : MAT.poolBlue); m.receiveShadow = true; terrain.add(m);
      if (q.k === 'lake') for (let k = 0; k < 3; k++) TFX.push({ k: 'haze', x: q.x + q.fx * (k - 1) * q.r * 0.9, y: q.y, z: q.z + q.fz * (k - 1) * q.r * 0.9, r: q.r * 0.6 });
    });
    FARM.g = null; FARM.sails = null; FARM.spots.length = 0; FARM.lostDone = false;
    const f = W.farm; if (!f) return;
    const F = E.frame(R, f.rs), sd = f.side, CX0 = F.x + F.rx * f.lx, CZ0 = F.z + F.rz * f.lx, site = SITES.find((q) => q.k === 'flat'), base = site ? site.y : topY(V, CX0, CZ0, 0);
    const g0 = new THREE.Group(), FS = 2, g = new THREE.Group(); g.scale.setScalar(FS); g0.add(g); FARM.g = g0; FARM.x = CX0; FARM.z = CZ0; terrain.add(g0);   // (built at twice life size, like the horses: it has to read at speed)
    g0.matrixAutoUpdate = false; g0.matrix.makeBasis(new THREE.Vector3(F.fx, 0, -F.fz).normalize(), new THREE.Vector3(0, 1, 0), new THREE.Vector3(F.rx, 0, -F.rz).normalize()).setPosition(CX0, base - 0.4, -CZ0);
    const wpos = (u, y, v) => ({ x: CX0 + (F.fx * u + F.rx * sd * v) * FS, y: base + y * FS, z: CZ0 + (F.fz * u + F.rz * sd * v) * FS });
    const add = (geo, mat, u, y, v, ry) => { const m = new THREE.Mesh(geo, mat); m.position.set(u, y, sd * v); if (ry) m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    // the farmhouse: whitewashed walls, a red tiled roof, a chimney, lit windows
    add(new THREE.BoxGeometry(20, 9, 12), MAT.fWall, -28, 4.5, 0); add(prism(21, 13.4, 6), MAT.fRoof, -28, 9, 0); add(new THREE.BoxGeometry(1.6, 5, 1.6), MAT.fDark, -22, 13, -2);
    [-34, -28, -22].forEach((u) => [-6.05, 6.05].forEach((v) => add(new THREE.BoxGeometry(2.2, 2.2, 0.3), MAT.fGlass, u, 5.5, v)));
    add(new THREE.BoxGeometry(0.3, 4.5, 2.4), MAT.fWood, -38.1, 2.25, 2);
    // the barn, its big doors; the silo; round bales
    add(new THREE.BoxGeometry(28, 12, 17), MAT.fBarn, 22, 6, 14); add(prism(29, 18.6, 8), MAT.fDark, 22, 12, 14); add(new THREE.BoxGeometry(0.4, 8.5, 7.5), MAT.fWhite, 7.85, 4.25, 14); add(new THREE.BoxGeometry(0.3, 7, 6), MAT.fWood, 7.75, 3.6, 14);
    add(new THREE.CylinderGeometry(5, 5, 24, 16), MAT.fMetal, 44, 12, 30); add(new THREE.SphereGeometry(5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.fMetal, 44, 24, 30);
    [[0, -16], [8, -22], [14, -14], [-6, -24], [4, -30]].forEach((p) => add(new THREE.CylinderGeometry(3, 3, 3.6, 14).rotateX(Math.PI / 2), MAT.fHay, p[0], 3, p[1], r() * 3));
    // the windmill: a white tower, a dark cap, four sails turning to face the lane
    add(new THREE.CylinderGeometry(2.6, 4.2, 26, 10), MAT.fWhite, -6, 13, 48); add(new THREE.ConeGeometry(3.4, 4, 10), MAT.fDark, -6, 28, 48);
    const sails = new THREE.Group(); sails.position.set(-6, 25, sd * (48 - 3.8)); g.add(sails); FARM.sails = sails;
    add(new THREE.CylinderGeometry(0.6, 0.6, 2, 8).rotateX(Math.PI / 2), MAT.fDark, -6, 25, 46);
    for (let k = 0; k < 4; k++) { const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 2; sails.add(arm); const a = new THREE.Mesh(new THREE.BoxGeometry(0.5, 13, 0.4), MAT.fWood); a.position.y = 6.8; arm.add(a); const cl = new THREE.Mesh(new THREE.BoxGeometry(2.6, 10, 0.15), MAT.fWhite); cl.position.set(1.5, 7.6, 0); arm.add(cl); a.castShadow = cl.castShadow = true; }
    // fences round the fields
    const post = new THREE.BoxGeometry(0.4, 2.2, 0.4), rail = (L) => new THREE.BoxGeometry(L, 0.25, 0.2);
    [[-82, -36, -14], [50, 94, -18]].forEach((fd) => { for (let u = fd[0]; u <= fd[1]; u += 4.6) add(post, MAT.fWood, u, 1.1, fd[2]); add(rail(fd[1] - fd[0]), MAT.fWood, (fd[0] + fd[1]) / 2, 1.6, fd[2]); add(rail(fd[1] - fd[0]), MAT.fWood, (fd[0] + fd[1]) / 2, 0.8, fd[2]); });
    g0.updateMatrixWorld(true);
    // the wheat, standing in its fields (a lighter gold where the wind combs it); sheep grazing beyond the yard
    const WH = ['#d8b24a', '#c9a23c', '#e2c260', '#cfa94a'].map((h) => new THREE.Color(h)), wl = [];
    [[-80, -38, -12, 64], [52, 92, -16, 44]].forEach((fd) => { for (let u = fd[0]; u < fd[1]; u += 1.5) for (let v = fd[2]; v < fd[3]; v += 1.5) { const p = wpos(u + (r() - 0.5) * 1.4, 0, v + (r() - 0.5) * 1.4); wl.push([p.x, topY(V, p.x, p.z, 0) - 0.3, p.z, 4.2 + r() * 1.4, 0.8, WH[(r() * 4) | 0].clone().multiplyScalar(0.85 + r() * 0.3), f.rs]); } });
    put(COVER.grass, MAT.lush, wl, false, 0.12, 0);
    const sl = []; for (let k = 0; k < 16; k++) { const p = wpos(-24 + r() * 48, 0, 62 + r() * 34); sl.push([p.x, topY(V, p.x, p.z, 0) - 0.1, p.z, 3.2 + r() * 0.5, 1, new THREE.Color(1, 1, 1).multiplyScalar(0.85 + r() * 0.2), f.rs]); }
    put(SHEEP, beastMat, sl, true, 0.05, 0);
    // where the raiders' fire lands (and where it burns)
    [[-28, 12, 0], [-22, 15, -2], [22, 16, 14], [30, 13, 10], [44, 24, 30], [-6, 22, 48], [6, 4, -18]].forEach((p) => { const w = wpos(p[0], p[1], p[2]); FARM.spots.push({ x: w.x, y: w.y, z: w.z, burn: 0 }); });
  }
  function stepFarm(W, c, n) {   // the raid: red bolts from each raider into the buildings, fires that spread; saved - the fires die to smoke; lost - it all burns
    const fm = W.farm; if (!fm || !FARM.spots.length || Math.abs(FARM.z - c.z) > 2800) return;
    const t = W.t;
    if (FARM.sails) FARM.sails.rotation.z += 0.022 * n;
    if (!fm.done) W.objs.forEach((o, j) => {
      if (!o.raid || !o.alive || o.x == null || (t + j * 17) % 46 >= n) return;
      const p = FARM.spots[(Math.random() * FARM.spots.length) | 0];
      let b = FARM.beams.find((q) => q.life <= 0); if (!b) { b = { tr: trailNew(), life: 0 }; FARM.beams.push(b); }
      b.life = 9; b.tr.pts.length = 0; for (let k = 0; k <= 7; k++) { const u = k / 7; b.tr.pts.push(new THREE.Vector3(p.x + (o.x - p.x) * u, p.y + (o.y - p.y) * u, -(p.z + (o.z - p.z) * u))); }
      puff('glow', o.x, o.y, o.z, { life: 8, s0: 7, s1: 2, a0: 0.9 }).s.material.color.set('#ff4a2a');
      for (let k = 0; k < 4; k++) puff(k < 2 ? 'fire' : 'spark', p.x + (Math.random() - 0.5) * 3, p.y, p.z + (Math.random() - 0.5) * 3, { vx: (Math.random() - 0.5) * 0.8, vy: 0.3 + Math.random() * 0.6, vz: (Math.random() - 0.5) * 0.8, life: 18, s0: k < 2 ? 6 : 1, s1: 1, g: k < 2 ? 0 : 0.03 }).s.material.color.set(k < 2 ? '#ffffff' : '#ffb060');
      p.burn = Math.min(1.6, p.burn + 0.35);
    });
    if (fm.lost && !FARM.lostDone) { FARM.lostDone = true; FARM.spots.forEach((p) => { p.burn = 3; }); }
    if (fm.saved) FARM.spots.forEach((p) => { p.burn = Math.max(0, p.burn - 0.004 * n); });
    if (t % 3 === 0) FARM.spots.forEach((p) => {
      if (p.burn < 0.05) return;
      if (p.burn > 0.3 && !fm.saved) puff('fire', p.x + (Math.random() - 0.5) * 4 * p.burn, p.y + Math.random() * 2, p.z + (Math.random() - 0.5) * 4 * p.burn, { vy: 0.35, life: 18, s0: 4 + 3 * p.burn, s1: 1.5, a0: 0.9 });
      if (t % 9 === 0) puff('smoke', p.x, p.y + 3, p.z, { vy: 0.3, vx: 0.07, life: 200, s0: 5, s1: 26 + 14 * p.burn, a0: 0.42, drag: 0.996 });
    });
  }
  function drawBeams() { FARM.beams.forEach((b) => { if (b.life > 0) { b.life--; trailDraw(b.tr, 1.3, 1, '#ff3a26'); if (b.life <= 0) b.tr.m.visible = false; } }); }
  const DUSTC = new THREE.Color(), DUSTT = new THREE.Color();
  function groundDust(p, z) {   // dust in the land's own colour: not sand over grass, ash or salt
    if (!p) return; bioAt(z); const g = Math.min(1, BW[0] + BW[1]); if (g + BW[2] + BW[3] < 0.02) return;
    DUSTC.setRGB(1.25, 0.92, 0.7).lerp(DUSTT.setRGB(0.72, 0.8, 0.6), g).lerp(DUSTT.setRGB(0.32, 0.3, 0.29), BW[2]).lerp(DUSTT.setRGB(1.45, 1.42, 1.38), BW[3]);
    p.col = p.cb || (p.cb = new THREE.Color()); p.col.copy(DUSTC); p.a0 *= 1 - 0.45 * g;
  }


  // ---------------------------------------------------------------- chapter 3: THE SHOALS (28 Oct) - asteroids, the quarry, the Millstone
  // (v25, the owner: "improve the Millstone and the asteroids") the rocks: shaped in 3D - lumps, ridges, flat faces where they broke off something
  // bigger, craters with raised rims - and welded, so they shade smooth (three's sphere comes as loose triangles, which shade flat: that was the
  // faceted look); darker down in their hollows; their grit drawn on in 3D, so no seams and no stretching; three levels of detail
  function noise3(x, y, z) {   // value noise in 3D, 0..1
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const h = (a, b, c) => { const n = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return n - Math.floor(n); };
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
      l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
  }
  const ROCKS = { hi: [], mid: [], lo: [], chunk: [], all: new Set() }, SPHERE = {};
  function sphereAt(detail) {   // a unit sphere, its corners shared
    if (SPHERE[detail]) return SPHERE[detail];
    const src = new THREE.IcosahedronGeometry(1, detail), p = src.attributes.position, seen = new Map(), pos = [], idx = [];
    for (let i = 0; i < p.count; i++) {
      const k = Math.round(p.getX(i) * 1e4) + ',' + Math.round(p.getY(i) * 1e4) + ',' + Math.round(p.getZ(i) * 1e4);
      let j = seen.get(k); if (j == null) { j = pos.length / 3; seen.set(k, j); pos.push(p.getX(i), p.getY(i), p.getZ(i)); }
      idx.push(j);
    }
    src.dispose(); return (SPHERE[detail] = { pos: pos, idx: idx });
  }
  function rockShape(v) {   // one rock's recipe: 0 and 3 a potato, 1 and 4 a broken chunk, 2 and 5 lumpy and ridged
    const r = rng(500 + v * 37), kind = v % 3, sq = [0.8 + r() * 0.45, 0.62 + r() * 0.3, 0.85 + r() * 0.5], gm = Math.cbrt(sq[0] * sq[1] * sq[2]);
    const dir = () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), cr = [], cuts = [];
    for (let i = 0, n = kind === 1 ? 4 : 8 + (r() * 6 | 0); i < n; i++) cr.push({ c: dir(), a: 0.12 + Math.pow(r(), 2) * 0.4, d: 0.07 + r() * 0.08 });
    for (let i = 0, n = kind === 1 ? 4 : r() < 0.4 ? 1 : 0; i < n; i++) cuts.push({ p: dir(), c: 0.74 + r() * 0.18 });
    return { v: v, kind: kind, sq: sq.map((q) => q / gm), cr: cr, cuts: cuts, o: r() * 40 };
  }
  function rockGeo(R, detail) {
    const S0 = sphereAt(detail), n = S0.pos.length / 3, out = new Float32Array(n * 3), col = new Float32Array(n * 3), N = new THREE.Vector3(), o = R.o, fine = detail >= 4 ? 1 : 0.6;
    const base = new THREE.Color(R.kind === 1 ? '#86817a' : '#7d7872'), tint = new THREE.Color(R.v % 2 ? '#7f6a58' : '#666c76'), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      N.set(S0.pos[i * 3], S0.pos[i * 3 + 1], S0.pos[i * 3 + 2]);
      const x = N.x, y = N.y, z = N.z, rg = 1 - Math.abs(2 * noise3(x * 3.1 - o, y * 3.1, z * 3.1 + 7) - 1);
      let d = 1 + 0.42 * (noise3(x * 1.2 + o, y * 1.2, z * 1.2) - 0.5) + 0.22 * (noise3(x * 2.4, y * 2.4 + o, z * 2.4) - 0.5);   // its lumps
      d += (R.kind === 2 ? 0.14 : 0.07) * (rg * rg - 0.4);   // ridges
      d += fine * (0.045 * (noise3(x * 8 + 3, y * 8, z * 8 - o) - 0.5) + 0.022 * (noise3(x * 17, y * 17 + 5, z * 17) - 0.5));   // rubble
      let cav = 0, rim = 0;
      for (const C of R.cr) {   // craters: a bowl and a raised rim
        const t = Math.sqrt(Math.max(0, 2 - 2 * N.dot(C.c))) / C.a; if (t > 1.7) continue;
        const bowl = t < 1 ? t * t - 1 : 0, rr = Math.exp(-(t - 1) * (t - 1) / 0.03); d += C.d * (bowl + 0.45 * rr); cav = Math.min(cav, bowl); rim = Math.max(rim, rr);
      }
      for (const Q of R.cuts) { const k2 = N.dot(Q.p); if (k2 > 0.05 && d > Q.c / k2) d = Q.c / k2 + (d - Q.c / k2) * 0.06; }   // where it broke off: a flat face
      out[i * 3] = x * d * R.sq[0]; out[i * 3 + 1] = y * d * R.sq[1]; out[i * 3 + 2] = z * d * R.sq[2];
      const ao = Math.max(0, Math.min(1, 0.7 + (d - 1) * 1.5 + cav * 0.3 + rim * 0.15)), pa = noise3(x * 1.7 + 11, y * 1.7, z * 1.7 - o);   // darker in hollows and crater floors, lighter on rims; patches of another hue
      c.copy(base).lerp(tint, Math.max(0, Math.min(1, (pa - 0.42) * 1.6))).multiplyScalar(0.34 + 0.86 * ao);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(out, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(S0.idx);
    g.computeVertexNormals(); g.computeBoundingSphere(); ROCKS.all.add(g); return g;
  }
  function rockGeos() {   // built the first time chapter 3 needs them
    if (!ROCKS.hi.length) for (let v = 0; v < 6; v++) { const R = rockShape(v); ROCKS.hi.push(rockGeo(R, 5)); ROCKS.mid.push(rockGeo(R, 4)); ROCKS.lo.push(rockGeo(R, 3)); }
    return ROCKS;
  }
  function chunkGeo(i) { return ROCKS.chunk[i] || (ROCKS.chunk[i] = rockGeo(rockShape(i + 1), 1)); }   // a splinter of rock: a few dozen corners
  const RV = { asteroid: [0, 2, 3, 5], rock: [1, 4, 2, 5], boulder: [1, 4, 0, 3] };   // which shapes each kind of rock uses (engine.js picks 0-3)
  const ROCKT = (function () {   // the grit, drawn on in 3D: little craters (dark floors, bright rims), blotches, specks - it tiles
    const N = 512, c = canvas(N, N), x = c.getContext('2d'), r = rng(611);
    const at = (px, py, rr, f) => { for (let dx = -N; dx <= N; dx += N) for (let dy = -N; dy <= N; dy += N) if (px + dx > -rr && px + dx < N + rr && py + dy > -rr && py + dy < N + rr) f(px + dx, py + dy); };
    x.fillStyle = '#969696'; x.fillRect(0, 0, N, N);
    for (let i = 0; i < 600; i++) { const px = r() * N, py = r() * N, rr = 6 + r() * 42, v = 105 + r() * 100 | 0; x.fillStyle = `rgba(${v},${v},${v},0.16)`; at(px, py, rr, (X, Y) => { x.beginPath(); x.arc(X, Y, rr, 0, 6.283); x.fill(); }); }
    for (let i = 0; i < 170; i++) {
      const px = r() * N, py = r() * N, rr = 2 + Math.pow(r(), 2.4) * 22;
      at(px, py, rr * 1.4, (X, Y) => { const gr = x.createRadialGradient(X, Y, 0, X, Y, rr * 1.35); gr.addColorStop(0, 'rgba(38,38,38,0.8)'); gr.addColorStop(0.62, 'rgba(78,78,78,0.55)'); gr.addColorStop(0.78, 'rgba(228,228,228,0.6)'); gr.addColorStop(1, 'rgba(200,200,200,0)'); x.fillStyle = gr; x.beginPath(); x.arc(X, Y, rr * 1.35, 0, 6.283); x.fill(); });
    }
    for (let i = 0; i < 9000; i++) { const v = 60 + r() * 190 | 0; x.fillStyle = `rgba(${v},${v},${v},0.45)`; x.fillRect(r() * N, r() * N, 1 + r() * 1.5, 1 + r() * 1.5); }
    const t2 = new THREE.CanvasTexture(c); t2.wrapS = t2.wrapT = THREE.RepeatWrapping; t2.anisotropy = MAXANI; return t2;
  })();
  function rockMat(color, vc, more) {   // rock with its grit drawn on in 3D (three flat views blended by which way the surface faces), scaled to the rock's size: colour and relief
    const m = S(Object.assign({ color: color, vertexColors: !!vc, roughness: 0.93, metalness: 0.03 }, more || {}));
    m.onBeforeCompile = (sh) => {
      sh.uniforms.rockT = { value: ROCKT };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRP;\nvarying vec3 vRN;').replace('#include <begin_vertex>', [
        '#include <begin_vertex>', 'float rsc = length(modelMatrix[0].xyz);', '#ifdef USE_INSTANCING', 'rsc *= length(instanceMatrix[0].xyz);', '#endif', 'vRP = position * rsc * 0.05; vRN = normal;'].join('\n'));
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D rockT;\nvarying vec3 vRP;\nvarying vec3 vRN;').replace('#include <map_fragment>', [
        '#include <map_fragment>',
        'vec3 rbw = pow(abs(normalize(vRN)), vec3(4.0)); rbw /= rbw.x + rbw.y + rbw.z; vec3 rq = vRP * 3.7 + 0.31;',
        'float rH = 0.62 * (texture2D(rockT, vRP.yz).r * rbw.x + texture2D(rockT, vRP.zx).r * rbw.y + texture2D(rockT, vRP.xy).r * rbw.z)',
        '  + 0.38 * (texture2D(rockT, rq.yz).r * rbw.x + texture2D(rockT, rq.zx).r * rbw.y + texture2D(rockT, rq.xy).r * rbw.z);',
        'diffuseColor.rgb *= 0.4 + 1.0 * rH;'].join('\n')).replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        '{ vec3 rdx = dFdx(-vViewPosition), rdy = dFdy(-vViewPosition), r1 = cross(rdy, normal), r2 = cross(normal, rdx); float rdet = dot(rdx, r1) * faceDirection;',
        '  normal = normalize(abs(rdet) * normal - sign(rdet) * ROCKBUMP * (dFdx(rH) * r1 + dFdy(rH) * r2)); }'].join('\n')).replace('ROCKBUMP', '0.42');
    };
    m.customProgramCacheKey = () => 'sr-rock3d' + (vc ? '-vc' : '');
    return m;
  }
  MAT.asteroid = rockMat('#d8d0c6', true);
  MAT.asteroid2 = rockMat('#b2aaa0', true);
  MAT.rockChunk = rockMat('#8a8279', false, { flatShading: true });
  MAT.rockFin = rockMat('#7a6e64', false, { side: THREE.DoubleSide });
  MAT.quarry = rockMat('#ffffff', true, { side: THREE.DoubleSide, emissive: '#2a1d12', emissiveIntensity: 1, roughness: 0.95, metalness: 0 });
  MAT.millCore = S({ color: '#200c00', emissive: '#ff8a2a', emissiveIntensity: 4 });
  function makeAsteroid() { const m = new THREE.Mesh(rockGeos().hi[0], MAT.asteroid); m.castShadow = true; m.receiveShadow = true; return m; }
  function makeRockS() { const m = new THREE.Mesh(rockGeos().mid[1], MAT.asteroid2); m.castShadow = true; return m; }
  function makeBoulder() {   // a rock the Millstone has thrown: wrapped in the blue of the tractor beam that held it
    const g = new THREE.Group(), G = rockGeos(), m = new THREE.Mesh(G.hi[1], MAT.asteroid2); m.castShadow = true; g.add(m);
    const sh = new THREE.Mesh(G.mid[1], shieldMat(new THREE.Color(0.3, 1.2, 2.2), 0.8)); sh.scale.setScalar(1.14); m.add(sh);
    const gl = glowSprite(T.glowC, '#9ff0ff', 1, 0.6); g.add(gl); g.userData.rock = m; g.userData.shell = sh; g.userData.glow = gl; return g;
  }
  // (v25) the Millstone rebuilt
  MAT.millWin = S({ color: '#1a1206', emissive: '#ffc878', emissiveIntensity: 2.2, roughness: 0.4 });
  MAT.millHot = S({ color: '#2a0800', emissive: '#ff5a1a', emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.35 });
  MAT.hazY = P({ color: '#d9a21a', metalness: 0.25, roughness: 0.5, emissive: '#2a1800', emissiveIntensity: 1, clearcoat: 0.2 });
  MAT.millWheel = rockMat('#a8a29a', false, { roughness: 0.88 });
  function extrudeXY(pts, z0, z1, mat, bevel) {   // an outline as seen head-on (x, y), run back from z0 (nearest you) to z1
    const sh = new THREE.Shape(); pts.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: z0 - z1, bevelEnabled: !!bevel, bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelSegments: 2, curveSegments: 8 });
    g.translate(0, 0, z1); return new THREE.Mesh(g, mat);
  }
  function strut(a, b, w, h, mat) {   // a beam from a to b, w by h across (never quite upright: lookAt needs a direction off the vertical)
    const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]), m = new THREE.Mesh(new THREE.BoxGeometry(w, h, A.distanceTo(B)), mat);
    m.position.copy(A).add(B).multiplyScalar(0.5); m.lookAt(B); return m;
  }
  function makeMillstone() {   // (v25, the owner: "improve the Millstone") a Rook mining barge, head-on. Its namesake on its bow: a great grinding wheel
    // of stone with the furrows of a real millstone cut in its face, turning slowly in an armoured frame, its reactor behind an iris in the hub. A crane
    // arm each side with a claw and a rock in a blue tractor glow; a saw on a boom under its chin; a long hull behind - bridge tower, stacks, a conveyor
    // truss, ore bays, engines - and lit windows and lamps all over it, for its size. Its parts sit where engine.js puts them (model z = -dz).
    const g = new THREE.Group(), H = new THREE.Group(), PT = { stubs: {}, beacons: [], stacks: [] }, G = rockGeos(), r = rng(808);
    const put = (m, x, y, z, grp) => { m.position.set(x, y, z); (grp || H).add(m); return m; };
    const box = (w, h, d, mat, x, y, z, grp) => put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z, grp);
    const upright = (rt, rb, h, mat, x, y, z, grp) => put(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 16), mat), x, y, z, grp);
    const lamp = (map, col, size, x, y, z) => put(glowSprite(map, col, size), x, y, z, g);
    const L3 = (a, b, f, dy) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f + (dy || 0), a[2] + (b[2] - a[2]) * f];
    // the hull: eight-sided and long; a deck on its back; the engines' block astern; its face dark behind the wheel
    H.add(extrudeXY([[-44, -12], [-35, -22], [35, -22], [44, -12], [44, 10], [35, 20], [-35, 20], [-44, 10]], 16, -112, MAT.foeHull2, 1.5));
    H.add(extrudeXY([[-28, 19], [28, 19], [23, 27], [-23, 27]], -2, -98, MAT.foeHull, 0.8));
    H.add(extrudeXY([[-38, -17], [38, -17], [41, -6], [41, 9], [-41, 9], [-41, -6]], -110, -124, MAT.foe, 1));
    box(80, 38, 1.2, MAT.gun, 0, -1, 18);
    {   // (v35) the Millstone's frame is a black cockapoo's FACE: red eyes and scowling brows on the brow above the wheel (its snarling mouth, the reactor
      // in it), long black curly ears hanging either side, a fluffy topknot, fangs under the wheel
      const fur = MAT.bossFur, lump = (k, sd) => lumpy(new THREE.SphereGeometry(1, 22, 16), k, sd), B2 = (geo, mat, x, y, z, sx, sy, sz, rz) => { const m = put(new THREE.Mesh(geo, mat), x, y, z); m.scale.set(sx, sy, sz); m.rotation.z = rz || 0; return m; };
      // (v36, the owner: "can the final boss look like a black cockapoodle as well?") the whole front is a giant black cockapoo's head now - its frame and
      // grinding wheel are its open jaws: a curly forehead over the brow, red eyes, a big black nose, fur cheeks round the frame, a jowl under it,
      // fangs hanging into the mouth, long ears hanging down past it, a topknot
      B2(lump(0.25, 61), fur, 0, 40, 18, 56, 16, 30); [-30, -12, 6, 24].forEach((x, k) => B2(lump(0.4, 63 + k), fur, x, 52 + (k % 2) * 4, 16, 15, 12, 15));
      [-1, 1].forEach((sd) => {
        B2(lump(0.3, 81 + sd), fur, sd * 54, 12, 22, 17, 40, 24);   // cheeks
        B2(new THREE.SphereGeometry(1, 16, 12), MAT.dogEye, sd * 24, 31, 42, 9, 8, 4); B2(new THREE.SphereGeometry(1, 12, 8), MAT.bossEye, sd * 23, 31, 45.4, 5.4, 4.4, 1.6);
        put(glowSprite(T.glowR, '#ff2a18', 24, 0.95), sd * 23, 31, 47); B2(lump(0.3, 67 + sd), fur, sd * 24, 40, 42, 13, 3.6, 5, sd * 0.42);   // red eyes, scowling brows
        B2(lump(0.42, 71 + sd), fur, sd * 76, 8, 10, 13, 46, 18, sd * 0.1);   // long curly ears
        B2(new THREE.ConeGeometry(1, 1, 8), MAT.tooth, sd * 14, 16, 46, 3.4, 13, 3.4); H.children[H.children.length - 1].rotation.x = Math.PI;   // fangs into the mouth
        B2(new THREE.ConeGeometry(1, 1, 8), MAT.tooth, sd * 24, -30, 38, 3, 10, 3);   // and up from the jaw
      });
      B2(new THREE.SphereGeometry(1, 20, 14), MAT.dogNose, 0, 25, 48, 11, 7.5, 7);   // the big black nose
      B2(lump(0.25, 91), fur, 0, -44, 24, 50, 14, 24);   // the jowl under the jaws
    }
    // the frame the wheel turns in: two cheeks, a brow with floodlights and a window strip, a sill; hazard marks down the cheeks
    [-1, 1].forEach((sx) => {
      H.add(extrudeXY(sx < 0 ? [[-43, -26], [-33, -26], [-33, 41], [-43, 46]] : [[33, -26], [43, -26], [43, 46], [33, 41]], 34, 8, MAT.foeHull, 1));
      box(4.2, 64, 0.5, MAT.gun, sx * 36.2, 8, 35.3);
      for (let k = 0; k < 9; k++) box(2.8, 2.8, 0.6, MAT.hazY, sx * 36.2, -21 + k * 7.1, 35.6).rotation.z = 0.785;
      for (let k = 0; k < 5; k++) box(0.6, 7, 2.4, MAT.gun, sx * 43.6, 28 - k * 10, 21);
      PT.beacons.push(lamp(T.glowR, '#ff3020', 5, sx * 42, 52.5, 30));
      lamp(T.glowR, sx < 0 ? '#ff3020' : '#30ff60', 4, sx * 45, 10, 12);
    });
    H.add(extrudeXY([[-43, 40], [43, 40], [43, 46], [36, 51], [-36, 51], [-43, 46]], 36, 4, MAT.foeHull, 1));
    H.add(extrudeXY([[-43, -32], [43, -32], [43, -26], [-43, -26]], 34, 8, MAT.foeHull, 1));
    box(56, 1.4, 0.4, MAT.millWin, 0, 48, 37.1); box(82, 1.3, 0.4, MAT.foeRed, 0, 41.3, 37.1); box(82, 1.3, 0.4, MAT.foeRed, 0, -28.6, 35.1);
    [-27, -12, 12, 27].forEach((fx) => { box(5.6, 4, 3, MAT.gun, fx, 44.4, 38); lamp(T.glowO, '#fff2d8', 8, fx, 44.4, 40); });
    put(cyl(15, 15, 4, 32, MAT.gun), 0, 10, 19);   // the axle drum behind the wheel
    // the wheel: a stone millstone - its furrows in eight harps, a red band at its edge, grinding blocks round its rim
    const wheel = new THREE.Group();
    const prof = [[11.5, -5], [13, -5.6], [24.5, -5.6], [26, -4.2], [26, 4.2], [24.5, 5.6], [13, 5.6], [11.5, 4], [11.5, -5]].map((p) => new THREE.Vector2(p[0], p[1]));
    const wg = new THREE.LatheGeometry(prof, 64); wg.rotateX(Math.PI / 2); wheel.add(new THREE.Mesh(wg, MAT.millWheel));
    for (let k = 0; k < 8; k++) for (let f = 0; f < 4; f++) { const a = k * Math.PI / 4 + f * 0.16, fu = box(11 - f * 1.3, 1.1, 0.9, MAT.gun, Math.cos(a) * 18.5, Math.sin(a) * 18.5, 5.5, wheel); fu.rotation.z = a + 0.42; }
    for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; box(4, 3, 8, MAT.foe2, Math.cos(a) * 27.2, Math.sin(a) * 27.2, 0, wheel).rotation.z = a; }
    put(new THREE.Mesh(new THREE.TorusGeometry(25.3, 0.65, 6, 64), MAT.foeRed), 0, 0, 5.7, wheel);
    put(new THREE.Mesh(new THREE.TorusGeometry(12.6, 0.75, 6, 48), MAT.gun), 0, 0, 5.7, wheel);
    bake(wheel); wheel.position.set(0, 10, 30); g.add(wheel); PT.wheel = wheel;
    // the reactor in the hub: its core, a glow ring round it, an iris of six petals over it (they slide out into the wheel to open), a shield
    const rea = new THREE.Group(); rea.position.set(0, 10, 30); g.add(rea);
    const core = put(new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), MAT.millCore), 0, 0, -6, rea);
    put(new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.8, 8, 40), MAT.foeEngine), 0, 0, -9.5, rea);
    put(new THREE.Mesh(new THREE.TorusGeometry(11.8, 1.3, 8, 40), MAT.gun), 0, 0, 1, rea);
    const pet = [];
    for (let k = 0; k < 6; k++) {
      const a0 = -0.47, a1 = 0.47, R0 = 11.8, sh = new THREE.Shape(); sh.moveTo(0.6, 0); sh.lineTo(Math.cos(a0) * R0, Math.sin(a0) * R0); sh.lineTo(Math.cos(a1) * R0, Math.sin(a1) * R0); sh.lineTo(0.6, 0);
      const p = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 1 }), MAT.foeHull);
      p.userData.a = k / 6 * Math.PI * 2 + Math.PI / 6; p.rotation.z = p.userData.a; p.position.z = 2; rea.add(p); pet.push(p);
      box(6, 0.9, 0.5, MAT.foeRed, 6.6, 0, 1.75, p);
    }
    const shd = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 16), shieldMat(new THREE.Color(1.6, 0.9, 0.4), 1)); shd.position.z = 2; rea.add(shd);
    const cglow = put(glowSprite(T.glowO, '#ffb070', 18, 0.3), 0, 0, 4, rea);
    rea.userData = { pet: pet, core: core, glow: cglow, shield: shd, k: 0 }; PT.reactor = rea;
    // the arms: a shoulder drum in the hull's side (it stays when the arm is shot away), an upper arm out to an elbow, a forearm in, a claw round a rock
    function arm(sx) {
      put(cyl(7, 7, 12, 20, MAT.foe2), sx * 46, 2, 2).rotation.y = Math.PI / 2;
      const q = new THREE.Group(), O = [0, 0, 0], E2 = [sx * 20, 8, 15], Wr = [sx * 14, 0, 33], C = [sx * 14, 0, 40];
      [-2.6, 2.6].forEach((dy) => { q.add(strut(L3(O, E2, 0, dy), L3(O, E2, 1, dy), 2.4, 2.4, MAT.foeHull)); q.add(strut(L3(E2, Wr, 0, dy), L3(E2, Wr, 1, dy), 2.2, 2.2, MAT.foeHull)); });
      [[O, E2], [E2, Wr]].forEach((seg) => { for (let i = 0; i < 5; i++) { q.add(strut(L3(seg[0], seg[1], i / 5, -2.6), L3(seg[0], seg[1], (i + 0.5) / 5, 2.6), 0.8, 0.8, MAT.gun)); q.add(strut(L3(seg[0], seg[1], (i + 0.5) / 5, 2.6), L3(seg[0], seg[1], (i + 1) / 5, -2.6), 0.8, 0.8, MAT.gun)); } });
      upright(3.4, 3.4, 8, MAT.foe2, E2[0], E2[1], E2[2], q); upright(3.6, 3.6, 1, MAT.foeRed, E2[0], E2[1] + 4.3, E2[2], q);
      q.add(strut([sx * 3, -5, 4], [E2[0] - sx * 2, E2[1] - 4, E2[2] - 3], 1.3, 1.3, MAT.hull));   // its ram
      put(cyl(5, 6, 5, 16, MAT.foe2), Wr[0], Wr[1], Wr[2], q);
      const em = put(new THREE.Mesh(new THREE.TorusGeometry(4.4, 1.1, 8, 24), MAT.gunLight.clone()), Wr[0], Wr[1], Wr[2] + 2.6, q);
      [Math.PI / 2, Math.PI / 2 + 2.094, Math.PI / 2 + 4.189].forEach((f) => {   // three fingers
        const Rt = [Wr[0] + Math.cos(f) * 4, Wr[1] + Math.sin(f) * 4, Wr[2] + 1.5], K = [C[0] + Math.cos(f) * 10, C[1] + Math.sin(f) * 10, C[2] - 3], Tp = [C[0] + Math.cos(f) * 6.5, C[1] + Math.sin(f) * 6.5, C[2] + 6];
        q.add(strut(Rt, K, 1.8, 1.8, MAT.foe2)); q.add(strut(K, Tp, 1.5, 1.5, MAT.foe2));
      });
      bake(q);
      const rk = put(new THREE.Mesh(G.hi[sx < 0 ? 3 : 0], MAT.asteroid), C[0], C[1], C[2], q); rk.scale.setScalar(7.5);
      const shl = new THREE.Mesh(G.mid[sx < 0 ? 3 : 0], shieldMat(new THREE.Color(0.3, 1.2, 2.2), 0.4)); shl.scale.setScalar(1.12); rk.add(shl);
      const shaft = put(cyl(3.2, 4.4, 5, 12, ADD('#3fc8ff', { opacity: 0.2 })), Wr[0], Wr[1], Wr[2] + 5.5, q);
      const tb = put(glowSprite(T.glowC, '#8fe8ff', 18, 0.22), C[0], C[1], C[2], q);
      put(glowSprite(T.glowO, '#ffb050', 5), E2[0] + sx * 3.8, E2[1], E2[2], q);
      put(glowSprite(T.glowO, '#ffb050', 3.5), L3(E2, Wr, 0.5)[0] + sx * 1.6, L3(E2, Wr, 0.5)[1] + 3.4, L3(E2, Wr, 0.5)[2], q);
      q.userData = { rock: rk, beam: tb, shaft: shaft, emit: em, sx: sx, yaw: 0 };
      q.position.set(sx * 48, 2, 2); g.add(q);
      PT.stubs['arm' + (sx < 0 ? 'L' : 'R')] = put(new THREE.Object3D(), sx * 52, 2, 2, g);
      return q;
    }
    PT.armL = arm(-1); PT.armR = arm(1);
    // the saw: on a boom under its chin, out in front of the frame (the boom's root stays when the saw is shot away)
    [-4, 4].forEach((x) => H.add(strut([x, -24, 4], [x, -29, 18], 3, 3, MAT.gun)));
    const cut = new THREE.Group();
    [-4, 4].forEach((x) => cut.add(strut([x, -29, 18], [x, -31.2, 36], 2.6, 2.6, MAT.gun)));
    put(cyl(4.5, 4.5, 5, 16, MAT.foe2), 0, -31, 36.5, cut);
    bake(cut);
    const saw = new THREE.Group();
    put(cyl(11, 11, 1.6, 40, MAT.gun), 0, 0, 0, saw);
    for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2; box(2.3, 2.3, 1.2, MAT.foe2, Math.cos(a) * 11.3, Math.sin(a) * 11.3, 0, saw).rotation.z = a + 0.785; }
    put(new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.65, 6, 48), MAT.millHot), 0, 0, 0.9, saw);
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; box(7, 1.5, 0.4, MAT.hazY, Math.cos(a) * 6, Math.sin(a) * 6, 0.95, saw).rotation.z = a; }
    put(cyl(2.8, 2.8, 3, 12, MAT.foeRed), 0, 0, 0.6, saw);
    bake(saw); saw.position.set(0, -31, 40); cut.add(saw);
    g.add(cut); PT.cutter = cut; PT.saw = saw; PT.stubs.cutter = put(new THREE.Object3D(), 0, -28, 18, g);
    // on its back: hoppers, two stacks, a bridge tower with masts, a conveyor truss from the brow to the bridge
    [-1, 1].forEach((sx) => {
      [-10, -28].forEach((z) => { box(13, 8, 12, MAT.foe2, sx * 13, 31, z); box(10, 0.6, 9, MAT.gun, sx * 13, 35.4, z); });
      upright(3, 3.6, 22, MAT.foe2, sx * 18, 38, -46); upright(3.4, 3.4, 1.2, MAT.foeRed, sx * 18, 48.6, -46);
      lamp(T.glowO, '#ff9040', 7, sx * 18, 49.6, -46); PT.stacks.push(put(new THREE.Object3D(), sx * 18, 50, -46, g));
      for (let i = 0; i < 3; i++) put(cyl(1.1, 1.1, 120, 8, MAT.foe2), sx * 44.8, -8 + i * 3.2, -50);
      for (let i = 0; i < 12; i++) box(0.6, 6, 3, MAT.gun, sx * 44.4, 6, -6 - i * 7);
      for (let i = 0; i < 10; i++) box(0.8, 7 + r() * 6, 10 + r() * 14, MAT.foeHull, sx * 44.3, -6 + r() * 12, -14 - r() * 90);
      box(0.5, 1.6, 124, MAT.foeRed, sx * 44.7, 8.6, -48);
    });
    H.add(extrudeXY([[-13, 27], [13, 27], [10, 46], [-10, 46]], -58, -82, MAT.foe2, 0.8));
    box(32, 7, 16, MAT.foeHull, 0, 49, -66); box(28, 1.6, 0.4, MAT.millWin, 0, 50, -57.7);
    for (let j = 0; j < 4; j++) for (let i = -3; i <= 3; i++) if (r() < 0.75) box(1.6, 1.2, 0.3, MAT.millWin, i * 3, 30 + j * 4, -56.9);
    [[8, 59, -70, 18], [-6, 57, -75, 14]].forEach((m2) => { upright(0.4, 0.6, m2[3], MAT.gun, m2[0], m2[1], m2[2]); PT.beacons.push(lamp(T.glowR, '#ff3020', 4, m2[0], m2[1] + m2[3] / 2 + 0.6, m2[2])); });
    [-3, 3].forEach((x) => H.add(strut([x, 52, 12], [x, 53.5, -58], 1.6, 1.6, MAT.gun)));
    for (let i = 0; i < 10; i++) H.add(strut(L3([-3, 52, 12], [-3, 53.5, -58], i / 10), L3([3, 52, 12], [3, 53.5, -58], (i + 0.5) / 10), 0.7, 0.7, MAT.foe2));
    for (let i = 0; i < 40; i++) box(1 + (i % 4), 1.4, 2 + (i % 5), MAT.gun, -20 + (i * 9.7) % 40, 27.6 + (i % 3) * 0.4, -40 - (i * 7.3) % 54);
    // underneath: a keel, ore bays with light at their seams, lamps; engines astern
    box(20, 6, 110, MAT.gun, 0, -25, -50);
    [-1, 1].forEach((sx) => { for (let i = 0; i < 6; i++) { box(12, 1.2, 12, MAT.foe, sx * 18, -22.8, -4 - i * 16); box(10, 0.4, 0.8, MAT.amber, sx * 18, -23.5, -10.6 - i * 16); } });
    [[-22, -6], [22, -6], [0, 4]].forEach((e) => { put(cyl(8, 9.5, 14, 24, MAT.foe2), e[0], e[1], -130); const n2 = put(new THREE.Mesh(new THREE.CircleGeometry(7.6, 24), MAT.foeEngine), e[0], e[1], -137.2); n2.rotation.y = Math.PI; lamp(T.glowO, '#ffffff', 20, e[0], e[1], -140); });
    [[-28, -20], [28, -20], [0, -60], [-28, -90], [28, -90]].forEach((d2) => lamp(T.glowO, '#ffe0b0', 6, d2[0], -28.5, d2[1]));
    bake(H); g.add(H);
    // its windows: rows of them down both sides
    const wins = []; for (let sx = -1; sx <= 1; sx += 2) for (let row = 0; row < 2; row++) for (let z = 8; z > -106; z -= 3.6) if (r() < 0.55) wins.push([sx * 44.6, 0 - row * 4.4, z]);
    const wm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 1.2, 1.9), MAT.millWin, wins.length), M4 = new THREE.Matrix4();
    wins.forEach((w, i) => wm.setMatrixAt(i, M4.makeTranslation(w[0], w[1], w[2]))); g.add(wm);
    g.userData.parts = PT; shadows(g, true, true);
    g.traverse((q) => { if (q.isMesh && (q.material.blending === THREE.AdditiveBlending || q.material.isShaderMaterial || q === wm)) { q.castShadow = false; q.receiveShadow = false; } });
    return g;
  }
  // the field: a few thousand rocks round the route (not in your lane) and a dead moon - built once per run; the quarry - a hollowed asteroid
  // round the route's tunnel, a fin of rock between its two shafts, girders and lamps
  function deadMoonTex() {   // grey dust, darker seas, craters with bright rims
    const w = 1024, h = 512, c = canvas(w, h), x = c.getContext('2d'), r = rng(77), img = x.createImageData(w, h);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const v = 120 + 60 * (fbm(xx * 0.006, yy * 0.012) - 0.5) + 30 * (vnoise(xx * 0.05, yy * 0.05) - 0.5), k = (yy * w + xx) * 4; img.data[k] = v; img.data[k + 1] = v * 0.96; img.data[k + 2] = v * 0.9; img.data[k + 3] = 255; }
    x.putImageData(img, 0, 0);
    for (let i = 0; i < 260; i++) { const cx = r() * w, cy = r() * h, rr = 2 + Math.pow(r(), 3) * 40; x.strokeStyle = 'rgba(230,225,215,0.35)'; x.lineWidth = Math.max(1, rr * 0.15); x.beginPath(); x.arc(cx, cy, rr, 0, 6.283); x.stroke(); x.fillStyle = 'rgba(40,36,32,0.25)'; x.beginPath(); x.arc(cx + rr * 0.15, cy + rr * 0.15, rr * 0.85, 0, 6.283); x.fill(); }
    return tex(c);
  }
  const shoals = new THREE.Group(); space.add(shoals); shoals.visible = false; let shoalsKey = '';
  function buildShoals(W) {
    while (shoals.children.length) { const c = shoals.children.pop(); c.traverse((q) => { if (q.geometry && !ROCKS.all.has(q.geometry)) q.geometry.dispose(); }); }
    const R = W.rail, V = W.valley, r = rng(W.seed * 7 + 3), M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), E4 = new THREE.Euler(), P4 = new THREE.Vector3(), S4 = new THREE.Vector3();
    const G = rockGeos(), per = [[], [], [], [], [], []], near = [[], [], [], [], [], []];
    for (let s2 = -800; s2 < R.len + 1600; s2 += 34) {
      if (V.tube && s2 > V.tube[0] - 260 && s2 < V.tube[1] + 120) continue;   // (the quarry: solid rock there)
      const a = r() * 6.283, rr = 150 + Math.pow(r(), 1.6) * 1700, F = E.frame(R, Math.max(0, Math.min(R.len, s2))), lx = Math.cos(a) * rr, ly = Math.sin(a) * rr * 0.75;
      const p = E.local(F, lx, ly, s2 < 0 ? s2 : s2 > R.len ? s2 - R.len : 0), sz = (6 + Math.pow(r(), 2.2) * 70) * (0.6 + rr / 900);
      P4.set(p.x, p.y, -p.z); E4.set(r() * 6, r() * 6, r() * 6); Q4.setFromEuler(E4); S4.set(sz, sz * (0.7 + r() * 0.5), sz * (0.8 + r() * 0.4));
      (sz > 34 && rr < 650 ? near : per)[Math.floor(r() * 6)].push(M4.compose(P4, Q4, S4).clone());   // (v25: the big ones close by in more detail)
    }
    [[per, G.lo], [near, G.mid]].forEach((PL2) => PL2[0].forEach((L, k) => { if (!L.length) return; const im = new THREE.InstancedMesh(PL2[1][k], k % 2 ? MAT.asteroid2 : MAT.asteroid, L.length); L.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = false; im.receiveShadow = true; shoals.add(im); }));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(1400, 64, 32), new THREE.MeshStandardMaterial({ map: deadMoonTex(), color: '#b0a294', roughness: 1, metalness: 0 }));
    const F9 = E.frame(R, R.len * 0.6), pm = E.local(F9, -5200, 2400, 9000); moon.position.set(pm.x, pm.y, -pm.z); moon.userData.far = true; shoals.add(moon);
    if (V.tube) buildQuarry(W);
  }
  function buildQuarry(W) {
    const V = W.valley, R = W.rail, T0 = V.tube[0] - 30, T1 = V.tube[1] + 30, N = 48, step = 22, rows = Math.ceil((T1 - T0) / step) + 1, tr0 = (s2) => Math.max(46, V.tubeAt(Math.min(V.tube[1] - 1, Math.max(V.tube[0] + 1, s2))));
    const pos = [], col = [], idx = [], c = new THREE.Color(), base = [new THREE.Color('#7a6a5c'), new THREE.Color('#5a4e46'), new THREE.Color('#9a8270')];
    const ring = (j, outer) => {   // a ring of the tunnel's inside, or of the rock's outside
      const s2 = Math.min(T1, T0 + j * step), F = E.frame(R, s2), u = Math.min(1, (s2 - T0) / (T1 - T0)), tr = tr0(s2), Ro = tr + 60 + 330 * Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.55);   // (the last ring may land past the end: kept on it)
      for (let i = 0; i < N; i++) {
        const a = i / N * 6.283, nz = vnoise(i * 0.4 + (outer ? 9 : 0), j * 0.13), rad = outer ? Ro * (0.8 + 0.4 * vnoise(i * 0.22 + 5, j * 0.04 + 2)) : tr + 3 + nz * 10;
        const p = E.local(F, Math.cos(a) * rad, Math.sin(a) * rad); pos.push(p.x, p.y, -p.z);
        c.copy(base[(i * 7 + j * 3) % 3]).lerp(base[2], vnoise(i * 0.9, j * 0.5) * 0.5).multiplyScalar(0.75 + nz * 0.5); col.push(c.r, c.g, c.b);
      }
    };
    for (let j = 0; j < rows; j++) ring(j, false);
    for (let j = 0; j < rows; j++) ring(j, true);
    const at = (layer, j, i) => layer * rows * N + j * N + (i % N);
    for (let L = 0; L < 2; L++) for (let j = 0; j < rows - 1; j++) for (let i = 0; i < N; i++) idx.push(at(L, j, i), at(L, j + 1, i), at(L, j, i + 1), at(L, j, i + 1), at(L, j + 1, i), at(L, j + 1, i + 1));
    [0, rows - 1].forEach((j) => { for (let i = 0; i < N; i++) idx.push(at(0, j, i), at(1, j, i), at(0, j, i + 1), at(0, j, i + 1), at(1, j, i), at(1, j, i + 1)); });   // its mouths
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const uv = []; for (let L = 0; L < 2; L++) for (let j = 0; j < rows; j++) for (let i = 0; i < N; i++) uv.push(i / N * 8, j * 0.18); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const mesh = new THREE.Mesh(geo, MAT.quarry); mesh.receiveShadow = true; mesh.castShadow = true; mesh.frustumCulled = false; shoals.add(mesh);
    // the fin between the two shafts
    const G = V.ridges && V.ridges[0];
    if (G) {
      const fp = [], fi = []; let n2 = 0;
      for (let s2 = G.s0; s2 <= G.s1; s2 += 20) {
        const Rg = V.ridge(s2) || { x: G.x(s2), w: 0 }, F = E.frame(R, s2), tr = tr0(s2) + 6, w = Math.max(1, Rg.w);
        [[Rg.x - w, -tr], [Rg.x - w, tr], [Rg.x + w, tr], [Rg.x + w, -tr]].forEach((q) => { const p = E.local(F, q[0], q[1]); fp.push(p.x, p.y, -p.z); });
        if (n2) { const b = (n2 - 1) * 4, a2 = n2 * 4; fi.push(b, a2, b + 1, b + 1, a2, a2 + 1, b + 2, a2 + 2, b + 3, b + 3, a2 + 2, a2 + 3); }
        n2++;
      }
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setIndex(fi); fg.computeVertexNormals();
      const fin = new THREE.Mesh(fg, MAT.rockFin); fin.castShadow = true; fin.receiveShadow = true; shoals.add(fin);
    }
    // girders across the cavern, lamps on its walls, the conveyor's lamps down the right-hand shaft
    const r = rng(W.seed + 91);
    for (let s2 = V.tube[0] + 260; s2 < V.tube[1] - 120; s2 += 170 + r() * 120) {
      const F = E.frame(R, s2), tr = tr0(s2), a = r() * 3.14;
      if (!(G && s2 > G.s0 - 100 && s2 < G.s1 + 100) && r() < 0.55) { const p = E.local(F, 0, 0), gb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, tr * 2.1), MAT.gun); gb.position.set(p.x, p.y, -p.z); gb.rotation.set(0, -F.yaw, 0); gb.rotateY(Math.PI / 2); gb.rotateX(a); shoals.add(gb); }
      for (let k = 0; k < 2; k++) { const b2 = r() * 6.283, p = E.local(F, Math.cos(b2) * (tr - 5), Math.sin(b2) * (tr - 5)), L = glowSprite(T.glowO, '#ffc070', 10 + r() * 8); L.position.set(p.x, p.y, -p.z); shoals.add(L); }
    }
    if (G) for (let s2 = G.s0 + 80; s2 < G.s1; s2 += 110) { const Rg = V.ridge(s2) || { x: 0, w: 0 }, F = E.frame(R, s2), tr = tr0(s2), rc = (Rg.x + Rg.w + tr) / 2, p = E.local(F, rc, -tr * 0.62), L = glowSprite(T.glowO, '#ffb050', 7); L.position.set(p.x, p.y, -p.z); shoals.add(L); }
  }

  // ---------------------------------------------------------------- explosions, smoke, sparks (pools, run on the game's steps)
  const fxRoot = new THREE.Group(); scene.add(fxRoot);
  const sprites = [], debris = [], rings = [], lights = [];
  function sprite(map, add) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: map, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, transparent: true })); fxRoot.add(s); return s; }
  // (v20) each kind of puff has a budget: a free one is found near where the last was taken (they die in about the order they were born), and
  // over budget the oldest is re-used. Before this the pools grew without limit - the warship's finale piled up thousands of sprites (each its
  // own draw) and fell to ~47 frames a second at 4K.
  const SPR = {}, SPR_CAP = { fire: 520, spark: 520, smoke: 240, glow: 70, dust: 220, dark: 140, mist: 300 };
  function pooled(P, cap) {
    const L = P.list, n = L.length;
    for (let k = 0; k < Math.min(24, n); k++) { const q = L[(P.i + k) % n]; if (!q.live) { P.i = (P.i + k + 1) % n; return q; } }
    if (n >= cap) { const q = L[P.i]; P.i = (P.i + 1) % n; return q; }
    return null;
  }
  function puff(kind, x, y, z, o) {   // kind: fire | smoke | spark | glow | dust
    const P = SPR[kind] || (SPR[kind] = { list: [], i: 0 });
    let p = pooled(P, SPR_CAP[kind] || 200);
    if (!p) { const soft = kind === 'smoke' || kind === 'dust' || kind === 'dark' || kind === 'mist', map = kind === 'fire' ? T.fire[sprites.length % 3] : soft ? T.smoke[sprites.length % 2] : kind === 'spark' ? T.spark : T.glowO; p = { s: sprite(map, !soft), kind: kind }; sprites.push(p); P.list.push(p); }
    Object.assign(p, { live: true, x: x, y: y, z: -z, vx: 0, vy: 0, vz: 0, t: 0, life: 30, s0: 2, s1: 10, a0: 1, delay: 0, drag: 0.94, rot: Math.random() * 6.3, spin: (Math.random() - 0.5) * 0.06, g: 0, col: null }, o || {});
    p.s.visible = false; p.s.material.rotation = p.rot; if (kind === 'glow') p.s.material.color.set('#ffffff');
    return p;
  }
  const shardGeo = [new THREE.TetrahedronGeometry(0.9), new THREE.BoxGeometry(1.4, 0.3, 0.8), new THREE.OctahedronGeometry(0.7)];
  const DEB = { list: debris, i: 0 };
  function shard(x, y, z, mat, sp, grav, big) {   // (big: a slab of a ship's hull, not a splinter)
    let d = pooled(DEB, 260);
    if (!d) { d = { m: new THREE.Mesh(shardGeo[debris.length % 3], MAT.hull), gi: debris.length % 3 }; fxRoot.add(d.m); debris.push(d); }
    d.m.material = mat || MAT.hull; d.m.geometry = mat === MAT.rockChunk ? chunkGeo(d.gi) : shardGeo[d.gi]; d.m.castShadow = !!big || world === 'valley';   // (a splinter's shadow only shows on the ground)
    Object.assign(d, { live: true, x: x, y: y, z: -z, vx: (Math.random() - 0.5) * sp, vy: (Math.random() - 0.3) * sp, vz: (Math.random() - 0.5) * sp, t: 0, life: big ? 300 + Math.random() * 120 : 50 + Math.random() * 40, rx: Math.random() * (big ? 0.03 : 0.3), ry: Math.random() * (big ? 0.03 : 0.3), sc: big ? big * (0.5 + Math.random()) : 0.6 + Math.random() * 1.2, burn: mat !== MAT.rockShard && mat !== MAT.rockChunk && Math.random() < 0.55, g: grav || 0 });
    d.m.visible = true;
  }
  const ringGeoFx = new THREE.PlaneGeometry(2.3, 2.3);
  const SHOCKT = (function () {   // (v20) a soft band of light at radius 1, fading inwards - the rings no longer read as a dartboard
    const c = canvas(256, 256), x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.02)'); gr.addColorStop(0.8, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.86, 'rgba(255,255,255,1)'); gr.addColorStop(0.9, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256); return tex(c);
  })();
  function shock(x, y, z, size, color, life) {
    let r = rings.find((q) => !q.live);
    if (!r) { r = { m: new THREE.Mesh(ringGeoFx, new THREE.MeshBasicMaterial({ color: '#ffffff', map: SHOCKT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })) }; fxRoot.add(r.m); rings.push(r); }
    Object.assign(r, { live: true, t: 0, life: life || 20, size: size }); r.m.material.color.set(color || '#ffd890'); r.m.position.set(x, y, -z); r.m.visible = true;
  }
  for (let i = 0; i < 3; i++) { const l = new THREE.PointLight('#ffb060', 0, 260, 1.6); scene.add(l); lights.push({ l: l, t: 99 }); }
  function flash(x, y, z, power) { const L = lights.reduce((a, b) => (a.t > b.t ? a : b)); L.t = 0; L.p = power; L.l.position.set(x, y, -z); }
  let gravity = 0;   // in the valley, debris falls
  // (v26, 29 Oct; the owner: "up the graphics ... and the special effects") a real FIREBALL: a lumpy ball of flame that boils and rolls as it
  // grows - white-hot at its heart, orange, then deep red at its ragged edge as it cools - not only flat sprites.
  const FB_NOISE = 'float fbH(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }' +
    'float fbN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(fbH(i), fbH(i + vec3(1.0,0.0,0.0)), f.x), mix(fbH(i + vec3(0.0,1.0,0.0)), fbH(i + vec3(1.0,1.0,0.0)), f.x), f.y), mix(mix(fbH(i + vec3(0.0,0.0,1.0)), fbH(i + vec3(1.0,0.0,1.0)), f.x), mix(fbH(i + vec3(0.0,1.0,1.0)), fbH(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z); }' +
    'float fbF(vec3 p){ return fbN(p) * 0.52 + fbN(p * 2.07) * 0.3 + fbN(p * 4.3) * 0.18; }';
  const fbGeo = new THREE.IcosahedronGeometry(1, 4);
  const fbMat = new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, seed: { value: 0 }, k: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'uniform float t; uniform float seed; varying vec3 vP; varying vec3 vN; varying vec3 vV; ' + FB_NOISE +
      'void main(){ float n = fbF(normal * 1.7 + vec3(seed) + vec3(0.0, t * 1.6, 0.0)); vec3 p = position * (0.74 + n * 0.55); vP = position * 2.1 + vec3(seed); vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float t; uniform float k; varying vec3 vP; varying vec3 vN; varying vec3 vV; ' + FB_NOISE +
      'void main(){ float n = fbF(vP + vec3(0.0, -t * 2.4, t * 0.7)); float face = abs(dot(normalize(vN), normalize(vV)));' +
      ' float heat = n * 0.85 + face * 0.55 - t * 1.05;' +
      ' vec3 c = mix(vec3(0.35, 0.06, 0.02), vec3(1.0, 0.42, 0.08), smoothstep(0.15, 0.5, heat)); c = mix(c, vec3(1.0, 0.8, 0.42), smoothstep(0.5, 0.8, heat)); c = mix(c, vec3(1.45, 1.35, 1.15), smoothstep(0.82, 1.05, heat));' +
      ' float a = smoothstep(0.02, 0.3, heat) * (1.0 - t) * face; gl_FragColor = vec4(c * a * k, 1.0); }' });
  const FBS = []; let fbI = 0;
  function fireball(x, y, z, size, life, delay) {   // (the engine's terms: z forward)
    let f = FBS.find((q) => !q.live);
    if (!f) { if (FBS.length >= 28) { f = FBS[fbI]; fbI = (fbI + 1) % FBS.length; } else { f = { m: new THREE.Mesh(fbGeo, fbMat.clone()) }; f.m.frustumCulled = false; fxRoot.add(f.m); FBS.push(f); } }
    Object.assign(f, { live: true, t: 0, life: life || 34, size: size, delay: delay || 0, x: x, y: y, z: -z }); f.m.visible = false;
    f.m.material.uniforms.seed.value = Math.random() * 40; f.m.rotation.set(Math.random() * 6.3, Math.random() * 6.3, 0);
  }
  function stepFireballs() { FBS.forEach((f) => { if (!f.live) return; if (f.delay > 0) { f.delay--; return; } if (++f.t >= f.life) { f.live = false; f.m.visible = false; } }); }
  function drawFireballs() {
    FBS.forEach((f) => {
      if (!f.live || f.delay > 0) { f.m.visible = false; return; }
      const q = f.t / f.life, g = 1 - Math.pow(1 - Math.min(1, q * 1.6), 3);
      f.m.visible = true; f.m.position.set(f.x, f.y, f.z); f.m.scale.setScalar(f.size * (0.3 + 0.7 * g + q * 0.25)); f.m.material.uniforms.t.value = q; f.m.material.uniforms.k.value = 1.1;
    });
  }
  function explode(x, y, z, size, mat) {
    if (size >= 7) fireball(x, y, z, size * 0.5, Math.round(24 + size * 0.5));
    puff('glow', x, y, z, { life: 7, s0: size * 2.1, s1: size * 2.8, a0: 0.85 }).s.material.color.set('#ffffff');   // the white flash (v26: a little less - the fireball carries it)
    for (let i = 0; i < 3; i++) {   // secondary blasts a moment later
      const a = Math.random() * 6.3, d = size * 0.45;
      for (let k = 0; k < 3; k++) puff('fire', x + Math.cos(a) * d, y + Math.sin(a) * d, z + (Math.random() - 0.5) * d, { life: 18, s0: size * 0.15, s1: size * 0.6, delay: 6 + i * 5 + k });
    }
    for (let i = 0; i < 14; i++) puff('spark', x, y, z, { vx: (Math.random() - 0.5) * size * 0.05, vy: (Math.random() - 0.3) * size * 0.05, vz: (Math.random() - 0.5) * size * 0.05, life: 60 + Math.random() * 50, s0: size * 0.05, s1: size * 0.03, drag: 0.985, g: gravity * 0.3 });   // embers that hang about
    for (let i = 0; i < 9; i++) puff('fire', x + (Math.random() - 0.5) * size * 0.4, y + (Math.random() - 0.5) * size * 0.4, z + (Math.random() - 0.5) * size * 0.4, { vx: (Math.random() - 0.5) * size * 0.06, vy: (Math.random() - 0.5) * size * 0.06, vz: (Math.random() - 0.5) * size * 0.06, life: 24 + Math.random() * 14, s0: size * 0.25, s1: size * (0.9 + Math.random() * 0.6), delay: i < 3 ? 0 : Math.random() * 6 | 0 });
    for (let i = 0; i < 6; i++) puff('smoke', x + (Math.random() - 0.5) * size * 0.3, y + (Math.random() - 0.5) * size * 0.3, z, { vx: (Math.random() - 0.5) * size * 0.02, vy: size * 0.006 + Math.random() * 0.04, vz: (Math.random() - 0.5) * size * 0.02, life: 80 + Math.random() * 40, s0: size * 0.4, s1: size * 1.8, a0: 0.75, delay: 6 + (Math.random() * 10 | 0), drag: 0.97 });
    for (let i = 0; i < 22; i++) puff('spark', x, y, z, { vx: (Math.random() - 0.5) * size * 0.16, vy: (Math.random() - 0.5) * size * 0.16, vz: (Math.random() - 0.5) * size * 0.16, life: 18 + Math.random() * 22, s0: size * 0.09, s1: size * 0.02, drag: 0.93 });
    for (let i = 0; i < Math.min(30, Math.round(size * 0.9)); i++) shard(x, y, z, mat, size * 0.12, gravity);
    shock(x, y, z, size * 2.6, '#ffe0a0'); flash(x, y, z, size * 0.6);
  }
  function rockBurstSpace(x, y, z, size) {   // (v25) a rock shot to pieces out in space: a flash, chunks tumbling away, a cloud of its dust, sparks
    puff('glow', x, y, z, { life: 6, s0: size * 1.6, s1: size * 2.2, a0: 0.7 }).s.material.color.set('#ffe6c8');
    for (let i = 0; i < 9; i++) { const a = Math.random() * 6.283, b = Math.random() * 6.283, sp = (0.015 + Math.random() * 0.035) * size; puff('smoke', x + Math.cos(a) * size * 0.3, y + Math.sin(a) * size * 0.3, z + (Math.random() - 0.5) * size * 0.4, { vx: Math.cos(a) * Math.cos(b) * sp, vy: Math.sin(b) * sp, vz: Math.sin(a) * Math.cos(b) * sp, life: 70 + Math.random() * 50, s0: size * 0.5, s1: size * 2.2, a0: 0.5, drag: 0.96 }); }
    for (let i = 0; i < 12; i++) shard(x + (Math.random() - 0.5) * size * 0.4, y + (Math.random() - 0.5) * size * 0.4, z + (Math.random() - 0.5) * size * 0.4, MAT.rockChunk, size * 0.09, 0, size * 0.1);
    for (let i = 0; i < 14; i++) puff('spark', x, y, z, { vx: (Math.random() - 0.5) * 2.4, vy: (Math.random() - 0.5) * 2.4, vz: (Math.random() - 0.5) * 2.4, life: 10 + Math.random() * 14, s0: 1.2, s1: 0.2, drag: 0.92 });
    shock(x, y, z, size * 2.2, '#d8c8b0', 16);
  }
  function rockBurst(x, y, z, size) {   // rock and dust: a crash into the canyon
    for (let i = 0; i < 10; i++) puff('dust', x + (Math.random() - 0.5) * size, y + (Math.random() - 0.5) * size * 0.5, z + (Math.random() - 0.5) * size, { vx: (Math.random() - 0.5) * 0.4, vy: 0.05 + Math.random() * 0.15, vz: (Math.random() - 0.5) * 0.4, life: 70 + Math.random() * 40, s0: size * 0.5, s1: size * 2.2, a0: 0.8, drag: 0.97 });
    for (let i = 0; i < 16; i++) shard(x, y, z, MAT.rockShard, size * 0.16, 0.035);
    for (let i = 0; i < 18; i++) puff('spark', x, y, z, { vx: (Math.random() - 0.5) * 2.4, vy: Math.random() * 1.6, vz: (Math.random() - 0.5) * 2.4, life: 14 + Math.random() * 16, s0: 1.2, s1: 0.2, drag: 0.92, g: 0.04 });
  }
  // (v20) the warship's last blast: a shell of light (bright at its edge, as a shock front is) and a flat ring out along her keel's plane
  const BLAST = { t: -1, x: 0, y: 0, z: 0, k: 1 };
  const blastShell = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 4), new THREE.ShaderMaterial({ uniforms: { a: { value: 0 }, col: { value: new THREE.Color('#ffd8a8') } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float a; uniform vec3 col; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0); gl_FragColor = vec4(col * f * a * 2.2, 1.0); }' }));
  const blastRing = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial({ color: '#ffc890', map: SHOCKT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  blastRing.rotation.x = -Math.PI / 2; blastShell.visible = blastRing.visible = false; blastShell.frustumCulled = blastRing.frustumCulled = false; fxRoot.add(blastShell); fxRoot.add(blastRing);
  function drawBlast() {
    const t = BLAST.t, on = t >= 0 && t < 160; blastShell.visible = on && t < 90; blastRing.visible = false;   // (the flat ring read as a planet from the wide shot: the shell alone)
    const glow = t >= 0 && t < 150 ? Math.sin(Math.min(1, t / 18) * Math.PI / 2) * (1 - Math.max(0, t - 30) / 120) : 0;   // her hull lit from inside, then cooling
    MAT.foeHull.emissive.set('#ff6a20'); MAT.foeHull2.emissive.set('#ff6a20'); MAT.foeHull.emissiveIntensity = MAT.foeHull2.emissiveIntensity = BLAST.hull ? 0.45 * Math.max(0, glow) : 0;
    if (!on) return;
    const k = 1 - Math.pow(1 - Math.min(1, t / 70), 2.2);
    blastShell.position.set(BLAST.x, BLAST.y, -BLAST.z); blastShell.scale.setScalar((20 + 1480 * k) * BLAST.k);   // (stays inside the wide shot's 1650: you see it as a sphere) blastShell.material.uniforms.a.value = Math.max(0, 1 - t / 90);
    const kr = 1 - Math.pow(1 - Math.min(1, t / 110), 2); blastRing.scale.setScalar(40 + 3500 * kr); blastRing.material.opacity = Math.max(0, 1 - t / 160) * 0.9;
  }
  const damage = [];   // fires where things were hit: your carrier's deck, her shield generators
  const MUZZLE = { t: 0 };   // her main gun's recoil
  function onFx(W, e) {
    if (e.k === 'howl') { shock(e.x, e.y, e.z, 70, '#8fdcff', 42); shock(e.x, e.y, e.z, 40, '#d8f4ff', 26); puff('glow', e.x, e.y, e.z, { life: 22, s0: 34, s1: 8, a0: 0.8 }).s.material.color.set('#9fe4ff'); return; }   // (v32) a Howler's howl
    switch (e.k) {
      case 'boom': {
        const size = e.mount ? 22 : { dart: 23, heavy: 31, missile: 6, drone: 8, turret: 12, rock: 9, carrier: 22, warden: 18, gen: 26, warship: 60 }[e.c] || (e.big ? 14 : 9);
        if (e.c === 'rock') { if (world === 'space') rockBurstSpace(e.x, e.y, e.z, e.r ? Math.min(28, 5 + e.r * 1.4) : 10); else rockBurst(e.x, e.y, e.z, 10); break; }
        const foe = e.c === 'dart' || e.c === 'heavy' || e.c === 'warden' || e.c === 'gen' || e.c === 'warship' || e.c === 'turret';
        const crip = (e.c === 'dart' || e.c === 'heavy') && !e.mount && !e.huge;   // (v26) a fighter's kill: the blast that cripples it - its wreck's own end is the big one
        explode(e.x, e.y, e.z, e.huge ? size * 2 : crip ? size * 0.45 : size, e.c === 'carrier' ? MAT.carrierDark : foe ? MAT.foe : MAT.hull);
        if (crip) for (let k = 0; k < 2 + (e.c === 'heavy' ? 2 : 0); k++) { SV.set(e.x, e.y, -e.z); pieceOff(SV, { x: (Math.random() - 0.5) * 1.6, y: 0.6 + Math.random() * 0.9, z: (Math.random() - 0.5) * 1.6 }, 3, MAT.boneW, 1.5 + Math.random()); }   // (v35) bones fly out of it
        if (e.huge) { shock(e.x, e.y, e.z, size * 7, '#ffd0a0'); flash(e.x, e.y, e.z, size * 2.5); for (let i = 0; i < 4; i++) explode(e.x + (Math.random() - 0.5) * size * 1.6, e.y + (Math.random() - 0.5) * size, e.z + (Math.random() - 0.5) * size * 1.6, size * 0.8, MAT.foe); }
        if (e.c === 'carrier' || (e.c === 'gen' && world === 'space')) { damage.push({ x: e.x, y: e.y - 3, z: e.z }); if (e.c === 'carrier') shock(e.x, e.y, e.z, 90, '#ffb070'); }
        if (e.c === 'turret' && world === 'valley') {   // a gun on the rim or in the wall: rock blown out, a second blast, then smoke rising for a while
          rockBurst(e.x, e.y - 3, e.z, 11); explode(e.x + (Math.random() - 0.5) * 4, e.y + 4, e.z, 13, MAT.foe2); shock(e.x, e.y, e.z, 70, '#ffc080');
          damage.push({ x: e.x, y: e.y + 2, z: e.z, until: W_.t + 420 });
        }
        break;
      }
      case 'wsblow': {   // the warship goes up: a blinding core, a shock shell racing out, her hull in three pieces lit from inside, slabs of it everywhere
        puff('glow', 0, 0, 0, { life: 28, s0: 400, s1: 1400, a0: 1 }).s.material.color.set('#fff2dc');
        BLAST.t = 0; BLAST.x = BLAST.y = BLAST.z = 0; BLAST.k = 1; BLAST.hull = true; flash(0, 0, 0, 400);
        const B = E.WARSHIP.boxes;
        for (let i = 0; i < 5; i++) { const b = B[i % 5]; explode(b[0] + Math.random() * (b[3] - b[0]), b[1] + Math.random() * (b[4] - b[1]), b[2] + Math.random() * (b[5] - b[2]), 80 + Math.random() * 50, MAT.foeHull); }
        for (let i = 0; i < 12; i++) { const a = Math.random() * 6.3, b2 = Math.random() * 6.3, sp2 = 1.2 + Math.random() * 2.2;   // a fireball billowing out of her
          puff('fire', (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 900, { vx: Math.cos(a) * Math.cos(b2) * sp2, vy: Math.sin(b2) * sp2, vz: Math.sin(a) * Math.cos(b2) * sp2 * 1.6, life: 70 + Math.random() * 40, s0: 80, s1: 220 + Math.random() * 80, delay: Math.random() * 18 | 0, drag: 0.985 }); }
        for (let i = 0; i < 30; i++) { const b = B[i % 5]; shard(b[0] + Math.random() * (b[3] - b[0]), b[1] + Math.random() * (b[4] - b[1]), b[2] + Math.random() * (b[5] - b[2]), i % 2 ? MAT.foeHull : MAT.foeHull2, 10, 0, 16 + Math.random() * 22); }   // slabs of her hull
        wsBreak();
        break;
      }
      case 'msblow': {   // (chapter 3) the Millstone goes up: a shock shell, a ring of fire, its hull in slabs, rock everywhere
        BLAST.t = 0; BLAST.x = e.x; BLAST.y = e.y; BLAST.z = e.z; BLAST.k = 0.5; BLAST.hull = false; flash(e.x, e.y, e.z, 260);
        puff('glow', e.x, e.y, e.z, { life: 26, s0: 200, s1: 700, a0: 1 }).s.material.color.set('#fff0d8');
        for (let i = 0; i < 6; i++) explode(e.x + (Math.random() - 0.5) * 110, e.y + (Math.random() - 0.5) * 30, e.z + (Math.random() - 0.5) * 60, 50 + Math.random() * 30, MAT.foeHull2);
        for (let i = 0; i < 24; i++) shard(e.x + (Math.random() - 0.5) * 100, e.y + (Math.random() - 0.5) * 30, e.z + (Math.random() - 0.5) * 50, i % 3 ? MAT.foeHull2 : MAT.rockChunk, 6, 0, 6 + Math.random() * 10);
        break;
      }
      case 'rocketboom': explode(e.x, e.y, e.z, 22, MAT.foe); shock(e.x, e.y, e.z, 60, '#9fe8ff'); break;   // your rocket: a big blast and a blue ring
      case 'sonic': {   // (v18) through the sound barrier: two white rings bursting off your ship, a flash, the vapour cone, and - low down - the sand blown flat
        shock(e.x, e.y, e.z, 70, '#ffffff', 22); shock(e.x, e.y, e.z, 150, '#cfe6ff', 38); puff('glow', e.x, e.y, e.z, { life: 9, s0: 18, s1: 34, a0: 0.8 }).s.material.color.set('#eaf6ff');
        VAPOR.burst = 1;
        if (world === 'valley' && W.valley && W.valley.floorW) { const fy = W.valley.floorW(e.z); if (e.y - fy < 40) for (let i = 0; i < 22; i++) { const a = i / 22 * 6.283; puff('dust', e.x + Math.cos(a) * 6, fy + 1, e.z + Math.sin(a) * 6, { vx: Math.cos(a) * 1.6, vy: 0.12, vz: Math.sin(a) * 1.6, life: 60, s0: 4, s1: 18, a0: 0.55, drag: 0.95 }); } }
        break;
      }
      case 'shockbomb': {   // the shock bomb bursting: a blue-white flash, two rings racing out, sparks everywhere
        puff('glow', e.x, e.y, e.z, { life: 12, s0: 40, s1: 120, a0: 1 }).s.material.color.set('#d8f6ff');
        shock(e.x, e.y, e.z, e.r * 3.2, '#bfefff'); shock(e.x, e.y, e.z, e.r * 1.8, '#ffffff'); flash(e.x, e.y, e.z, 40);
        for (let i = 0; i < 40; i++) puff('spark', e.x, e.y, e.z, { vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, vz: (Math.random() - 0.5) * 7, life: 22 + Math.random() * 18, s0: 2.2, s1: 0.3, drag: 0.94 });
        break;
      }
      case 'ping': {
        const shield = e.c === 'shield';
        for (let i = 0; i < 10; i++) puff('spark', e.x, e.y, e.z, { vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, life: 16, s0: 1.4, s1: 0.2 });
        if (!shield) puff('glow', e.x, e.y, e.z, { life: 5, s0: 8, s1: 3, a0: 1 });   // (a white flash where it was hit)
        if (shield) shock(e.x, e.y, e.z, 16, '#7fe8ff'); else flash(e.x, e.y, e.z, 3);
        break;
      }
      case 'smoke': puff('smoke', e.x, e.y, e.z, { life: 70, s0: 1.2, s1: 7, a0: 0.55, vy: 0.03, drag: 0.98 }); puff('fire', e.x, e.y, e.z, { life: 6, s0: 1.4, s1: 0.6 }); break;
      case 'scrape': rockBurst(e.x, e.y, e.z, 4); flash(e.x, e.y, e.z, 4); break;
      case 'gate': shock(e.x, e.y, e.z, 30, '#7dffb0'); for (let i = 0; i < 16; i++) puff('spark', e.x, e.y, e.z, { vx: (Math.random() - 0.5) * 1.6, vy: (Math.random() - 0.5) * 1.6, vz: (Math.random() - 0.5) * 1.6, life: 20, s0: 1.6, s1: 0.2 }); break;
      case 'lost': if (e.view !== 'cockpit') { explode(e.x, e.y, e.z, 22, MAT.white); explode(e.x, e.y + 2, e.z + 4, 14, MAT.stripe); } break;
      case 'hit': case 'crash':   // a crackle of small sparks thrown forward off your shields (not back into the camera)
        if (W.view !== 'cockpit') {
          const F = W.camF || { x: 0, y: 0, z: 1 };
          for (let i = 0; i < 10; i++) { const k = 0.6 + Math.random() * 1.2; puff('spark', W.ship.x, W.ship.y, W.ship.z, { vx: (Math.random() - 0.5) * 1.4 + F.x * k, vy: (Math.random() - 0.3) * 1.2 + F.y * k, vz: (Math.random() - 0.5) * 1.4 + F.z * k, life: 11, s0: 0.7, s1: 0.15, drag: 0.9 }); }
          puff('glow', W.ship.x, W.ship.y, W.ship.z, { life: 6, s0: 7, s1: 11, a0: 0.55 }).s.material.color.set(e.k === 'crash' ? '#ffb070' : '#8fe0ff');
        }
        break;
      case 'flak':   // a shell bursting: a black puff, an orange flash, fragments
        puff('dark', e.x, e.y, e.z, { life: 70, s0: 6, s1: 16, a0: 0.9, drag: 0.97, vy: 0.02 });
        puff('glow', e.x, e.y, e.z, { life: 6, s0: 12, s1: 16, a0: 1 }).s.material.color.set('#ffb060');
        for (let i = 0; i < 12; i++) puff('spark', e.x, e.y, e.z, { vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: (Math.random() - 0.5) * 3, life: 12, s0: 1.2, s1: 0.2 });
        flash(e.x, e.y, e.z, 2);
        break;
      case 'deflect': for (let i = 0; i < 14; i++) puff('spark', e.x, e.y, e.z, { vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: (Math.random() - 0.5) * 3, life: 14, s0: 1.6, s1: 0.2 }); shock(e.x, e.y, e.z, 10, '#7fe8ff'); break;
      case 'wpartoff':   // a piece of the Gaoler shot off: a blast and burning wreckage tumbling away
        explode(e.x, e.y, e.z, 22, MAT.foe); for (let i = 0; i < 8; i++) shard(e.x, e.y, e.z, i % 2 ? MAT.foe2 : MAT.foe, 2.2, gravity);
        shock(e.x, e.y, e.z, 50, '#ffb070'); break;
      case 'emuzzle': puff('glow', e.x, e.y, e.z, { life: 5, s0: 6, s1: 2, a0: 1 }).s.material.color.set('#ff5a40'); break;
      case 'muzzle': puff('glow', e.x, e.y, e.z, { life: 10, s0: 30, s1: 50, a0: 1 }).s.material.color.set('#ffd090'); shock(e.x, e.y, e.z, 40, '#ffd090'); flash(e.x, e.y, e.z, 10); MUZZLE.t = 30; break;
    }
  }
  function stepFx(n) {
    for (let k = 0; k < n; k++) {
      sprites.forEach((p) => { if (!p.live) return; if (p.delay > 0) { p.delay--; return; } p.t++; p.vy -= p.g || 0; p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vx *= p.drag; p.vy *= p.drag; p.vz *= p.drag; p.rot += p.spin; if (p.t >= p.life) p.live = false; });
      debris.forEach((d) => { if (!d.live) return; d.t++; d.vy -= d.g; d.x += d.vx; d.y += d.vy; d.z += d.vz; d.vx *= 0.985; d.vy *= 0.985; d.vz *= 0.985; d.m.rotation.x += d.rx; d.m.rotation.y += d.ry; if (d.burn && d.t < 34 && d.t % 3 === 0) puff('fire', d.x, d.y, -d.z, { life: 14, s0: 1.6 * d.sc, s1: 0.4 }); if (d.t >= d.life) { d.live = false; d.m.visible = false; } });   // burning pieces trail fire
      rings.forEach((r) => { if (!r.live) return; if (++r.t >= r.life) { r.live = false; r.m.visible = false; } });
      if (BLAST.t >= 0 && ++BLAST.t > 200) BLAST.t = -1;
      stepFireballs();
      lights.forEach((L) => { L.t++; });
    }
  }
  function drawFx() {
    sprites.forEach((p) => {
      if (!p.live || p.delay > 0) { p.s.visible = false; return; }
      const f = p.t / p.life, sc = p.s0 + (p.s1 - p.s0) * (p.kind === 'fire' ? Math.sqrt(f) : f);
      p.s.visible = true; p.s.position.set(p.x, p.y, p.z); p.s.scale.set(sc, sc, 1); p.s.material.rotation = p.rot;
      p.s.material.opacity = p.kind === 'smoke' || p.kind === 'dust' || p.kind === 'dark' || p.kind === 'mist' ? p.a0 * Math.min(1, f * 6) * (1 - f) : p.a0 * (1 - f * f);
      if (p.kind === 'fire') p.s.material.color.setRGB(1, 1 - f * 0.35, 1 - f * 0.8);
      else if (p.kind === 'smoke') { const w = Math.min(1, f * 3); p.s.material.color.setRGB(1 - w * 0.55 + 0.25 * (1 - w), 0.75 - w * 0.3, 0.55 - w * 0.12); }   // smoke lit orange by the fire, cooling to grey
      else if (p.kind === 'dust') { if (p.col) p.s.material.color.copy(p.col); else p.s.material.color.setRGB(1.25, 0.92, 0.7); }
      else if (p.kind === 'dark') p.s.material.color.setRGB(0.22, 0.2, 0.2);
      else if (p.kind === 'mist') p.s.material.color.setRGB(1.3, 1.35, 1.4);   // (spray off the river)
    });
    debris.forEach((d) => { if (d.live) { const f = d.t / d.life; d.m.position.set(d.x, d.y, d.z); d.m.scale.setScalar(d.sc * (f > 0.8 ? (1 - f) * 5 : 1)); } });
    rings.forEach((r) => { if (!r.live) return; const f = r.t / r.life, s = 1 + r.size * Math.sqrt(f); r.m.scale.set(s, s, s); r.m.material.opacity = (1 - f) * (1 - f) * 0.9; r.m.lookAt(cam.position); });
    drawBlast(); drawFireballs();
    lights.forEach((L) => { L.l.intensity = L.t < 14 ? L.p * 600 * Math.pow(1 - L.t / 14, 2) : 0; });
  }

  // ---------------------------------------------------------------- laser bolts: from the cockpit's cannons, or from the Lancer's wing tips
  const MUZ = [new THREE.Vector3((104 - CX) / FOCAL * 2, (CY - 202) / FOCAL * 2, -2), new THREE.Vector3((296 - CX) / FOCAL * 2, (CY - 202) / FOCAL * 2, -2)];
  const boltGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  // the lasers (28 Oct, the owner: they looked "thick and blocky"): a flat streak, turned about its length to face you - a thin white-hot line in a
  // soft coloured glow, fading out behind and round at the front - instead of fat glowing tubes. Yours cyan, theirs red.
  function beamTex(core, mid, edge) {
    const c = canvas(64, 256), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, edge); g.addColorStop(0.22, mid); g.addColorStop(0.42, core); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(0.58, core); g.addColorStop(0.78, mid); g.addColorStop(1, edge);
    x.fillStyle = g; x.fillRect(0, 0, 64, 256);
    const f = x.createLinearGradient(0, 0, 0, 256);   // along it: the head at the top (v = 1), the tail fading away
    f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(0.07, 'rgba(0,0,0,1)'); f.addColorStop(0.4, 'rgba(0,0,0,1)'); f.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'destination-in'; x.fillStyle = f; x.fillRect(0, 0, 64, 256);
    return tex(c);
  }
  const beamGeo = new THREE.PlaneGeometry(1, 1);
  const beamMat = (map, k) => new THREE.MeshBasicMaterial({ map: map, color: new THREE.Color(k, k, k), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const BEAM_YOU = beamMat(beamTex('rgba(190,255,255,1)', 'rgba(40,190,255,0.5)', 'rgba(0,60,255,0)'), 2.4);
  const BEAM_FOE = beamMat(beamTex('rgba(255,215,190,1)', 'rgba(255,45,20,0.6)', 'rgba(190,0,0,0)'), 2.6);
  const _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3(), _bm = new THREE.Matrix4();
  function orientBeam(m, head, tail, w) {   // a streak from tail to head (three.js terms), turned about its length to face the camera
    _by.subVectors(head, tail); const len = _by.length(); if (len < 1e-3) { m.visible = false; return; } _by.multiplyScalar(1 / len);
    _bz.set(cam.position.x - (head.x + tail.x) / 2, cam.position.y - (head.y + tail.y) / 2, cam.position.z - (head.z + tail.z) / 2);
    _bx.crossVectors(_by, _bz); if (_bx.lengthSq() < 1e-8) _bx.set(1, 0, 0); _bx.normalize(); _bz.crossVectors(_bx, _by);
    _bm.makeBasis(_bx, _by, _bz); m.quaternion.setFromRotationMatrix(_bm);
    m.position.set((head.x + tail.x) / 2, (head.y + tail.y) / 2, (head.z + tail.z) / 2); m.scale.set(w, len, 1); m.visible = true;
  }
  const bolts = [], flashes = [];
  for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(beamGeo, BEAM_YOU); m.visible = false; m.frustumCulled = false; scene.add(m); bolts.push(m); }
  for (let i = 0; i < 6; i++) { const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glowC, color: '#bff6ff', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); f.visible = false; scene.add(f); flashes.push(f); }
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0), PL = { i: 0 };
  function makeEBolt() {   // their laser: a red streak, and a small bright head you can see even when it comes straight at you
    const g = new THREE.Group(), r = new THREE.Mesh(beamGeo, BEAM_FOE), head = glowSprite(T.glowR, '#ffffff', 1);
    r.frustumCulled = false; head.material.fog = false; g.add(r); g.add(head); g.userData.r = r; g.userData.head = head; return g;
  }
  function makeShell() { const g = new THREE.Group(), a = new THREE.Mesh(boltGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3.5, 1.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); g.add(a); g.add(glowSprite(T.glowO, '#ffffff', 34)); g.userData.core = a; return g; }
  function shotEnd(W, sx, sy, out, tgt) {   // where a shot at screen point (sx, sy) is going: what auto-aim locked on, the thing under it, or well ahead
    if (tgt && tgt.alive && tgt.x != null) return out.set(tgt.x, tgt.y, -tgt.z);
    const o = E.pick(W, sx, sy), p = o ? E.project(W, o.x, o.y, o.z) : null, depth = p ? p.z : 300;
    out.set(((sx + OX) / (GW + 2 * OX)) * 2 - 1, -(sy / GH) * 2 + 1, 0.5).unproject(cam).sub(cam.position).normalize();
    const fwd = v3.set(0, 0, -1).applyQuaternion(cam.quaternion), k = depth / Math.max(0.2, out.dot(fwd));
    return out.multiplyScalar(k).add(cam.position);
  }
  const boltHeads = [];
  for (let i = 0; i < 24; i++) { const h = glowSprite(T.glowC, '#e8ffff', 1); h.material.fog = false; h.visible = false; scene.add(h); boltHeads.push(h); }
  const BEAM_FIRE = beamMat(beamTex('rgba(255,250,225,1)', 'rgba(255,150,40,0.6)', 'rgba(255,60,0,0)'), 2.2), plumes = [];   // a rocket's or missile's flame, streaming back
  for (let i = 0; i < 56; i++) { const m = new THREE.Mesh(beamGeo, BEAM_FIRE); m.visible = false; m.frustumCulled = false; scene.add(m); plumes.push(m); }
  function drawBolts(W, chase) {
    let bi = 0, fi = 0;
    cam.updateMatrixWorld();
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const starts = chase ? LANCER.userData.guns.map((g) => g.clone().applyMatrix4(LANCER.matrixWorld)) : MUZ.map((m) => m.clone().applyMatrix4(cam.matrixWorld));
    W.shots.forEach((sh) => {
      const tg = sh.tgt && sh.tgt.alive && !sh.tgt.shielded ? sh.tgt : null, end = shotEnd(W, sh.x, sh.y, new THREE.Vector3(), tg), u = (sh.t + (W._ipA == null ? 1 : W._ipA)) / E.SHOT_T;   // (smooth between steps on a fast screen)
      starts.forEach((start) => {
        if (bi >= bolts.length) return;
        // move evenly across the SCREEN: screen fraction u -> fraction along the 3D path s = u*z0 / ((1-u)*z1 + u*z0), z0/z1 = the depths of its two ends
        const z0 = Math.max(0.3, v1.copy(start).sub(cam.position).dot(fwd)), z1 = Math.max(z0 + 1, v2.copy(end).sub(cam.position).dot(fwd));
        const conv = (q) => q * z0 / ((1 - q) * z1 + q * z0);
        const head = new THREE.Vector3().copy(start).lerp(end, conv(Math.min(1, u))), tail = new THREE.Vector3().copy(start).lerp(end, conv(Math.max(0, u - 0.28)));
        const g = bolts[bi], hd = boltHeads[bi], dist = head.distanceTo(cam.position); bi++;
        orientBeam(g, head, tail, (chase ? 0.42 : 0.11) + dist * 0.005);   // (a dash over a quarter of the way, thin and sharp)
        const hs = (chase ? 1.5 : 0.4) + dist * 0.013; hd.visible = true; hd.position.copy(head); hd.scale.set(hs, hs, 1);   // its white-hot head
        if (sh.t < 2 && fi < flashes.length) { const f = flashes[fi++]; f.visible = true; f.position.copy(start); const fs = (chase ? 2.4 : 0.6) * (sh.t ? 0.6 : 1); f.scale.set(fs, fs, 1); }
      });
      if (sh.t >= E.SHOT_T - 1 && !sh._fx) {   // where it lands: a crackle of sparks - and on a ship, a flash and a ring
        sh._fx = true; const hit = tg || E.pick(W, sh.x, sh.y);
        puff('glow', end.x, end.y, -end.z, { life: hit ? 7 : 5, s0: hit ? 8 : 4, s1: hit ? 2.5 : 1.5, a0: 0.95 }).s.material.color.set('#9feeff');
        for (let i = 0; i < (hit ? 8 : 3); i++) puff('spark', end.x, end.y, -end.z, { vx: (Math.random() - 0.5) * 1.8, vy: (Math.random() - 0.5) * 1.8, vz: (Math.random() - 0.5) * 1.8, life: 10 + Math.random() * 8, s0: hit ? 1.7 : 1.1, s1: 0.2 });
        if (hit) { shock(end.x, end.y, -end.z, 12, '#9feeff'); flash(end.x, end.y, -end.z, 2); }
      }
    });
    for (; bi < bolts.length; bi++) { bolts[bi].visible = false; boltHeads[bi].visible = false; }
    for (; fi < flashes.length; fi++) flashes[fi].visible = false;
  }

  // ---------------------------------------------------------------- what is in the world, kept in step with the rules
  function tellGlow(o, k, span) {   // a gun about to fire glows, brighter and bigger until the shot (o.tell counts down)
    if (!(o.tell > 0) || W_.t % 2) return;
    const f = 1 - o.tell / (span || 18), s = (3 + f * 7) * k;
    puff('glow', o.x, o.y, o.z, { life: 3, s0: s, s1: s * 0.8, a0: 0.7 + f * 0.3 }).s.material.color.set(f > 0.7 ? '#ffe0d0' : '#ff4a30');
  }
  const W_ = { t: 0 };
  function makeMine() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), MAT.dark));
    const sp = new THREE.ConeGeometry(0.35, 1.6, 6);
    [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach((d) => { const c = new THREE.Mesh(sp, MAT.gun); c.position.set(d[0] * 2.4, d[1] * 2.4, d[2] * 2.4); c.quaternion.setFromUnitVectors(UPV, new THREE.Vector3(d[0], d[1], d[2])); g.add(c); });
    const lamp = glowSprite(T.glowR, '#ffffff', 5); g.add(lamp); g.userData.lamp = lamp;
    g.scale.setScalar(1.3);
    return shadows(g, true);
  }
  const MAKE = { dart: () => makeDart(false), ace: () => makeDart(true), dart2: () => makeDart2(), howler: () => makeDart(false, 'howl'), fetcher: () => makeDart2('fetch'), ball: makeBall, treat: () => makeBone(false), toy: () => makeBone(true), heavy: makeHeavy, warden: makeWarden, drone: makeDrone, turret: makeTurret, bunker: makeBunker, gate: makeGate, arch: makeArch, pillar: makePillar, rocket: makeRocket, missile: makeMissile, mine: makeMine,
    ebolt: makeEBolt, flak: () => glowSprite(T.glowO, '#ffd090', 3.4), shell: makeShell, wt_flak: () => makeWTurret('flak'), wt_laser: () => makeWTurret('laser'), gen: makeGen, gun: makeMainGun, keel: makeKeelGun,
    asteroid: makeAsteroid, rock: makeRockS, boulder: makeBoulder, millstone: makeMillstone };
  const live = new Map(), pools = {}, root = new THREE.Group(); scene.add(root);
  Object.keys(MAKE).forEach((k) => { pools[k] = []; });
  function get(kind, key) {
    let m = live.get(key);
    if (m) { m.userData.seen = true; return m; }
    m = pools[kind].pop() || MAKE[kind]();
    m.userData.kind = kind; m.userData.seen = true; m.userData.born = -1; m.visible = true; root.add(m); live.set(key, m);
    return m;
  }
  // (v26, 29 Oct) the Rook fighters. The owner: "they just blow up really quickly ... they're all exactly the same ... more depth when they approach
  // you and you shoot them". Now each wave flies in its own paint (its leader gold-trimmed) and no two are quite the same size; they trail vapour
  // off their wing tips in the canyon (ion trails in space) as they come in; a hit that doesn't kill knocks pieces off and leaves it burning; and a
  // kill is a death, not a pop - a wing torn off and a roll down in flames, a flat spin, a break-up into burning pieces, or (an Anvil) its warheads
  // cooking off - ending in a fireball, or a crash into the canyon floor. All of it here in the picture: the engine, its tests and its balance as before.
  const FIGHTER = { dart: 1, dart2: 1, ace: 1, heavy: 1, howler: 1, fetcher: 1 };
  const LIVERY = (function () {
    const mk = (body, body2, trim, glow, fur) => {
      const a = MAT.foe.clone(), b = MAT.foe2.clone(), c = MAT.foeRed.clone(), f = MAT.fur.clone(), ft = MAT.furTail.clone(); a.color.set(body); b.color.set(body2); c.color.set(trim); c.emissive.set(glow); f.color.set(fur); ft.color.set(fur);
      return new Map([[MAT.foe, a], [MAT.foe2, b], [MAT.foeRed, c], [MAT.fur, f], [MAT.furTail, ft]]);
    };
    return [null, mk('#80694c', '#a08a68', '#c4561a', '#3a1200', '#efe0c4'), mk('#24262c', '#383c45', '#c01426', '#4a0006', '#2c2826'), mk('#a7adb6', '#c6cbd2', '#a3121b', '#3a0003', '#6e4a33'), mk('#4d5463', '#6a7282', '#ffc23a', '#5a3a00', '#c97a3c')];   // (v32: fur - cream, black, chocolate; the leader red-apricot with a GOLD collar)
  })();   // 0 the Rooks' own gunmetal and crimson, 1 desert sand and rust, 2 night black, 3 ash grey, 4 a leader's gold trim
  const LV = new WeakMap(), WAVE = { t: -999, n: 0, lv: 0, lead: false };
  function liveryOf(o) {   // a wave = the fighters that turn up together
    let v = LV.get(o);
    if (v) return v;
    if (o.ace) v = { lv: 0, sz: 1 };
    else {
      if (W_.t - WAVE.t > 80) { WAVE.n++; WAVE.lv = (world === 'valley' ? [1, 0, 1, 2, 0, 3] : [0, 2, 3, 0, 2, 1])[WAVE.n % 6]; WAVE.lead = true; }
      WAVE.t = W_.t; v = { lv: o.packLead ? 4 : WAVE.lv, sz: 0.92 + Math.random() * 0.16 }; WAVE.lead = false;
    }
    LV.set(o, v); return v;
  }
  function fighterLook(o, m) {   // its paint and size (the models are baked per material, so a livery is a swap of those materials)
    const U = m.userData, L = liveryOf(o);
    if (!U.mats) { U.mats = []; m.traverse((q) => { if (q.isMesh) U.mats.push([q, q.material]); }); U.base = m.scale.x; }
    if (U.lv !== L.lv) { U.lv = L.lv; const T2 = LIVERY[L.lv]; U.mats.forEach((p) => { p[0].material = (T2 && T2.get(p[1])) || p[1]; }); }
    m.scale.setScalar(U.base * L.sz);
  }
  // trails: a ribbon through the last half second of where it has been, turned to face you, thin at the ship and spreading out behind
  const TRN = 30, TRAILS = [];
  const trailMat = new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color('#ffffff') } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'attribute vec2 ta; varying vec2 vA; void main(){ vA = ta; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 col; varying vec2 vA; void main(){ float e = 1.0 - vA.y * vA.y; gl_FragColor = vec4(col * vA.x * e, 1.0); }' });
  function trailNew() {
    let r = TRAILS.find((q) => !q.used);
    if (!r) {
      const g = new THREE.BufferGeometry(), idx = [];
      for (let i = 0; i < TRN - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRN * 6), 3)); g.setAttribute('ta', new THREE.BufferAttribute(new Float32Array(TRN * 4), 2)); g.setIndex(idx);
      r = { m: new THREE.Mesh(g, trailMat.clone()), pts: [] }; r.m.frustumCulled = false; r.m.visible = false; fxRoot.add(r.m); TRAILS.push(r);
    }
    r.used = true; r.pts.length = 0; return r;
  }
  function trailPush(r, p, t) {
    if (!isFinite(p.x + p.y + p.z)) return;   // (a ship placed for a moment with no position: never into the ribbon)
    if (r.lt === t && r.pts.length) { r.pts[0].copy(p); return; }
    r.lt = t; const q = r.pts.length >= TRN ? r.pts.pop() : new THREE.Vector3(); q.copy(p); r.pts.unshift(q);
  }
  const tA = new THREE.Vector3(), tB = new THREE.Vector3(), tC = new THREE.Vector3();
  function trailDraw(r, w, a, col) {
    const P2 = r.pts, n = P2.length;
    if (n < 3) { r.m.visible = false; return; }
    const pos = r.m.geometry.attributes.position.array, ta = r.m.geometry.attributes.ta.array;
    for (let i = 0; i < TRN; i++) {
      const j = Math.min(i, n - 1), p = P2[j];
      tA.copy(P2[Math.min(j + 1, n - 1)]).sub(P2[Math.max(j - 1, 0)]); tB.copy(cam.position).sub(p); tC.crossVectors(tA, tB);
      const L = tC.length(); if (L > 1e-6) tC.multiplyScalar(1 / L);
      const f = j / (n - 1), ww = w * (0.35 + f * 1.4);
      pos[i * 6] = p.x + tC.x * ww; pos[i * 6 + 1] = p.y + tC.y * ww; pos[i * 6 + 2] = p.z + tC.z * ww;
      pos[i * 6 + 3] = p.x - tC.x * ww; pos[i * 6 + 4] = p.y - tC.y * ww; pos[i * 6 + 5] = p.z - tC.z * ww;
      const al = i < n ? a * Math.pow(1 - f, 1.6) * Math.min(1, j / 2) : 0;
      ta[i * 4] = al; ta[i * 4 + 1] = 1; ta[i * 4 + 2] = al; ta[i * 4 + 3] = -1;
    }
    r.m.geometry.attributes.position.needsUpdate = true; r.m.geometry.attributes.ta.needsUpdate = true; r.m.material.uniforms.col.value.set(col); r.m.visible = true;
  }
  function trailsOff(U) { if (U.tr) U.tr.forEach((r) => { r.m.visible = false; r.pts.length = 0; }); }
  function fighterFx(W, o, m) {   // (after its matrix is set) how fast it is going, its trails, the damage it has taken
    const U = m.userData;
    if (U.owner !== o) { U.owner = o; U.hurtSeen = o.hurtAt; U.burns = []; U.pt = null; trailsOff(U); }
    if (U.pt !== W.t) {
      if (U.pt != null && W.t > U.pt && W.t - U.pt < 6) { const d = W.t - U.pt; (U.vel || (U.vel = new THREE.Vector3())).set((m.position.x - U.pv.x) / d, (m.position.y - U.pv.y) / d, (m.position.z - U.pv.z) / d); }
      (U.pv || (U.pv = new THREE.Vector3())).copy(m.position); U.pt = W.t;
    }
    if (!U.tr) U.tr = [trailNew(), trailNew()];
    const rush = o.st === 'pass' || o.st === 'by', sc = m.scale.x;
    if (world === 'space') {   // an ion trail from its engines
      v3.set(0, 0, 0); U.ex.forEach((q) => v3.add(q)); v3.multiplyScalar(1 / U.ex.length).applyMatrix4(m.matrixWorld);
      trailPush(U.tr[0], v3, W.t); trailDraw(U.tr[0], 0.5 * sc, rush ? 0.6 : 0.4, o.ace ? '#5aa8ff' : '#ff7030'); U.tr[1].m.visible = false;
    } else U.nav.forEach((q, i) => { q.getWorldPosition(v3); trailPush(U.tr[i], v3, W.t); trailDraw(U.tr[i], 0.15 * sc, rush ? 0.5 : 0.3, '#e4ecf6'); });   // vapour off its wing tips
    if (o.hurtAt != null && o.hurtAt !== U.hurtSeen) {   // hit, not down: pieces knocked off, sparks, a flash of fire, and it burns from there on
      U.hurtSeen = o.hurtAt; const k = sc / 2.6, wx = m.position.x, wy = m.position.y, wz = -m.position.z;
      for (let i = 0; i < 6; i++) shard(wx, wy, wz, i % 2 ? MAT.foe2 : MAT.foe, 2.6, gravity);
      for (let i = 0; i < 18; i++) puff('spark', wx, wy, wz, { vx: (Math.random() - 0.5) * 3.2, vy: (Math.random() - 0.3) * 3.2, vz: (Math.random() - 0.5) * 3.2, life: 14 + Math.random() * 12, s0: 1.7, s1: 0.2, drag: 0.92 });
      fireball(wx, wy, wz, 4 * k, 16);
      if (U.burns.length < 3) U.burns.push(new THREE.Vector3((Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 3), (Math.random() - 0.3) * 0.8, (Math.random() - 0.3) * 4));
    }
    if (U.burns.length && U.bt !== W.t) {
      U.bt = W.t; const k = sc / 2.6;
      U.burns.forEach((b, i) => { v3.copy(b).applyMatrix4(m.matrixWorld); puff('fire', v3.x, v3.y, -v3.z, { life: 9, s0: 2.8 * k, s1: 0.8 * k }); if ((W.t + i) % 2 === 0) puff('smoke', v3.x, v3.y, -v3.z, { life: 48, s0: 1.6 * k, s1: 9 * k, a0: 0.55, vy: 0.04, drag: 0.97 }); });
    }
  }
  // pieces torn off: a wing, an engine pod, a slab of hull - tumbling away, burning
  const PIECES = []; let pcI = 0;
  const PGEO = (function () {
    const wing = extrudeXZ([[0, -1.5], [3.4, -2.9], [3.75, -2.4], [3.55, -1.3], [0, 1.1]], 0.26, MAT.foe, 0.07).geometry; wing.translate(-1.8, 0, 0.8);
    const pod = new THREE.CylinderGeometry(0.55, 0.5, 4.6, 12); pod.rotateX(Math.PI / 2);
    return [wing, pod, new THREE.BoxGeometry(2.6, 0.6, 3.4), boneGeo()];   // (v35: and a bone)
  })();
  function bodyMat(m) { const T2 = LIVERY[m.userData.lv || 0]; return (T2 && T2.get(MAT.foe)) || MAT.foe; }
  function pieceOff(p3, v, gi, mat, sc) {   // (three.js terms)
    let p = PIECES.find((q) => !q.live);
    if (!p) { if (PIECES.length >= 24) { p = PIECES[pcI]; pcI = (pcI + 1) % 24; } else { p = { m: new THREE.Mesh(PGEO[0], mat) }; p.m.castShadow = true; fxRoot.add(p.m); PIECES.push(p); } }
    if (!p.tr) p.tr = trailNew(); p.tr.pts.length = 0;
    p.m.geometry = PGEO[gi]; p.m.material = mat; p.m.visible = true; p.m.scale.setScalar(sc); p.m.position.copy(p3);
    p.m.rotation.set(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3);
    Object.assign(p, { live: true, t: 0, life: 120 + Math.random() * 50, sc: sc, vx: v.x, vy: v.y, vz: v.z, rx: (Math.random() - 0.5) * 0.3, ry: (Math.random() - 0.5) * 0.3, rz: (Math.random() - 0.5) * 0.3, down: false });
  }
  function stepPieces() {
    PIECES.forEach((p) => {
      if (!p.live) return;
      p.t++;
      if (!p.down) {
        p.vy -= gravity; p.vx *= 0.99; p.vy *= 0.99; p.vz *= 0.99; p.m.position.x += p.vx; p.m.position.y += p.vy; p.m.position.z += p.vz;
        p.m.rotation.x += p.rx; p.m.rotation.y += p.ry; p.m.rotation.z += p.rz;
        if (gravity && W_.floor) { const fy = W_.floor(-p.m.position.z); if (fy != null && p.m.position.y < fy + 1) { p.m.position.y = fy + 1; p.down = true; rockBurst(p.m.position.x, fy, -p.m.position.z, 5); } }
      }
      const k = p.sc / 2.6, q = p.m.position;
      if (p.t < 70) { if (p.t % 2 === 0) puff('fire', q.x, q.y, -q.z, { life: 10, s0: 3 * k, s1: 0.8 * k }); if (p.t % 2 === 0) puff('smoke', q.x, q.y, -q.z, { life: 55, s0: 1.6 * k, s1: 9 * k, a0: 0.55, vy: 0.05, drag: 0.98 }); }
      else if (p.down && p.t % 6 === 0) puff('smoke', q.x, q.y, -q.z, { life: 70, s0: 2 * k, s1: 12 * k, a0: 0.4, vy: 0.15, drag: 0.99 });
      if (p.t < 80 && !p.down) { trailPush(p.tr, q, p.t); trailDraw(p.tr, 1.3 * k, 0.6 * (1 - p.t / 80), '#ff8a34'); } else p.tr.m.visible = false;   // (a streak of fire behind it)
      if (p.t > p.life - 20) p.m.scale.setScalar(p.sc * Math.max(0, (p.life - p.t) / 20));
      if (p.t >= p.life) { p.live = false; p.m.visible = false; p.tr.m.visible = false; }
    });
  }
  const wrecks = [];
  function sweep() {
    live.forEach((m, k) => {
      if (!m.userData.seen) {
        trailsOff(m.userData);
        if (k && k.killed && FIGHTER[m.userData.kind]) { startWreck(m); live.delete(k); return; }   // shot down: it dies on screen
        root.remove(m); pools[m.userData.kind].push(m); live.delete(k);
      }
      m.userData.seen = false;
    });
  }
  function startWreck(m) {
    const U = m.userData, heavy = U.kind === 'heavy', r = Math.random(), V = U.vel && isFinite(U.vel.x + U.vel.y + U.vel.z) ? v2.copy(U.vel) : v2.set(0, 0, 0), sc = m.scale.x / 2.6;
    const st = heavy ? 'cook' : r < 0.42 ? 'shear' : r < 0.72 ? 'spin' : 'break', side = Math.random() < 0.5 ? -1 : 1;
    m.updateMatrixWorld();
    if (st === 'break') {   // it comes apart in the blast: a fireball, its wings and an engine flung out burning
      const x = m.position.x, y = m.position.y, z = -m.position.z;
      explode(x, y, z, 22 * sc, MAT.foe); fireball(x, y, z, 13 * sc, 40);
      const mat = bodyMat(m);
      [[-1, 0], [1, 0], [0, 1], [0, 2]].forEach((q, i) => {
        v3.set(q[0] * 4.5, 0, i > 1 ? 3 : 0).applyMatrix4(m.matrixWorld); tA.set(q[0] || (Math.random() - 0.5), 0.3 + Math.random() * 0.5, (Math.random() - 0.5)).transformDirection(m.matrixWorld);
        pieceOff(v3, tB.copy(V).multiplyScalar(0.8).addScaledVector(tA, 1.2 + Math.random()), q[1], q[1] === 1 ? MAT.foe2 : mat, m.scale.x);
      });
      root.remove(m); pools[U.kind].push(m); return;
    }
    const w = { t: 0, st: st, side: side, vx: V.x * 0.97, vy: V.y * 0.9 + (gravity ? 0.2 : 0), vz: V.z * 0.97, rx: 0, ry: 0, rz: 0, pops: [], end: heavy ? 62 + Math.round(Math.random() * 14) : 46 + Math.round(Math.random() * 26) };
    if (st === 'shear') {   // a wing torn off: it rolls hard towards the stump and goes down in flames
      w.rz = side * (0.14 + Math.random() * 0.08); w.rx = 0.02; w.pops = [Math.round(w.end * 0.5)];
      v3.set(side * 5, 0.3, 0).applyMatrix4(m.matrixWorld); tA.set(side, 0.5, 0).transformDirection(m.matrixWorld);
      pieceOff(v3, tB.copy(V).multiplyScalar(0.85).addScaledVector(tA, 1.4), 0, bodyMat(m), m.scale.x); explode(v3.x, v3.y, -v3.z, 9 * sc, MAT.foe);
      w.fire = [new THREE.Vector3(side * 3.2, 0.2, 0.3), new THREE.Vector3(-side * 1.65, -0.2, 5)];
    } else if (st === 'spin') {   // a flat spin, trailing fire, blowing apart as it goes
      w.ry = side * (0.18 + Math.random() * 0.1); w.rz = side * 0.04; w.rx = (Math.random() - 0.5) * 0.04; w.pops = [Math.round(w.end * 0.35), Math.round(w.end * 0.7)];
      w.fire = [new THREE.Vector3(1.65, -0.2, 5), new THREE.Vector3(-1.65, -0.2, 5)];
    } else {   // an Anvil: it slows, its hull lit by blast after blast down its length, then the warheads go
      w.rz = side * 0.02; w.rx = 0.012; w.vx *= 0.93; w.vy *= 0.7; w.vz *= 0.93; w.pops = [10, 21, 31, 41, 50];
      w.fire = [new THREE.Vector3(4.7, -0.2, 5.3), new THREE.Vector3(-4.7, -0.2, 5.3), new THREE.Vector3(0, 1.6, -1)];
    }
    w.tr = trailNew(); U.wreck = w; wrecks.push(m);
  }
  function groundCrash(x, y, z, sc) {   // (the engine's terms) into the canyon floor: fire, rock and dust, and a smoking crater
    explode(x, y + 2, z, 20 * sc, MAT.foe); fireball(x, y + 5, z, 12 * sc, 44); rockBurst(x, y, z, 14); shock(x, y + 1, z, 60 * sc, '#ffc080');
    for (let i = 0; i < 12; i++) puff('dust', x + (Math.random() - 0.5) * 14, y + 2, z + (Math.random() - 0.5) * 14, { vx: (Math.random() - 0.5) * 0.9, vy: 0.2 + Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.9, life: 90 + Math.random() * 50, s0: 6, s1: 30, a0: 0.5, drag: 0.97 });
    damage.push({ x: x, y: y + 2, z: z, until: W_.t + 360 });
  }
  function stepWrecks(n) {
    for (let k = 0; k < n; k++) stepPieces();
    for (let i = wrecks.length - 1; i >= 0; i--) {
      const m = wrecks[i], w = m.userData.wreck, sc = m.scale.x / 2.6, heavy = m.userData.kind === 'heavy';
      let done = false, ground = false;
      for (let k = 0; k < n && !done; k++) {
        w.t++; w.vy -= gravity * (heavy ? 0.6 : 1); w.vx *= 0.997; w.vy *= 0.99; w.vz *= 0.997;   // (it coasts on: you don't catch it up and fly through the blast)
        m.position.x += w.vx; m.position.y += w.vy; m.position.z += w.vz; m.rotation.x += w.rx; m.rotation.y += w.ry; m.rotation.z += w.rz;
        if (w.st === 'spin') w.ry *= 1.012;
        m.updateMatrixWorld();
        w.fire.forEach((f, j) => {   // flames where it burns; behind it a streak of fire (a ribbon - puffs alone left a string of beads at speed) and smoke
          v3.copy(f).applyMatrix4(m.matrixWorld);
          puff('fire', v3.x, v3.y, -v3.z, { life: 10 + Math.random() * 5, s0: 5 * sc, s1: 1.6 * sc, vy: 0.05 });
          if (j === 0) trailPush(w.tr, v3, w.t);
          if ((w.t + j) % 2 === 0) puff('smoke', v3.x, v3.y, -v3.z, { life: 75, s0: 2.6 * sc, s1: 14 * sc, a0: 0.62, vy: 0.06, drag: 0.98 });
        });
        if (w.pops.indexOf(w.t) >= 0) { v3.set((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 7).applyMatrix4(m.matrixWorld); explode(v3.x, v3.y, -v3.z, (heavy ? 10 : 8) * sc, MAT.foe); }
        if (gravity && W_.floor) { const fy = W_.floor(-m.position.z); if (fy != null && m.position.y < fy + 2) { ground = done = true; groundCrash(m.position.x, fy, -m.position.z, sc); } }
        if (w.t >= w.end) done = true;
        if (m.position.distanceTo(cam.position) < 45) { done = true; w.near = true; }   // (about to fly into the camera: it goes now, small)
      }
      if (!done) { trailDraw(w.tr, 2.4 * sc, 0.75, '#ff8a34'); continue; }
      w.tr.used = false; w.tr.m.visible = false; w.tr.pts.length = 0;
      if (!ground && (w.near || m.position.distanceTo(cam.position) < 90)) explode(m.position.x, m.position.y, -m.position.z, 8 * sc, MAT.foe);   // (right beside you: no fireball filling the screen)
      else if (!ground) {   // the end of it: a fireball, a few slabs of it; an Anvil's warheads going up round it
        const x = m.position.x, y = m.position.y, z = -m.position.z;
        explode(x, y, z, (heavy ? 26 : 22) * sc, MAT.foe); fireball(x, y, z, (heavy ? 15 : 12) * sc, heavy ? 46 : 38); shock(x, y, z, (heavy ? 80 : 60) * sc, '#ffd0a0');
        for (let j = 0; j < (heavy ? 4 : 2); j++) shard(x, y, z, j % 2 ? MAT.foe2 : bodyMat(m), 3.2, gravity, 2 + Math.random() * 2);
        if (heavy) for (let j = 0; j < 6; j++) { const a = j / 6 * 6.283; fireball(x + Math.cos(a) * 17 * sc, y + Math.sin(a) * 10 * sc, z + (Math.random() - 0.5) * 12, 4.2 * sc, 20, 6 + j * 4); }
      }
      m.userData.wreck = null; root.remove(m); pools[m.userData.kind].push(m); wrecks.splice(i, 1);
    }
  }
  function orient(m, o) {   // a ship's heading, climb and bank, in three.js terms, from how it is moving
    const vx = o.vx || 0, vy = o.vy || 0, vz = o.vz == null ? -1 : o.vz;
    m.rotation.order = 'YXZ'; m.rotation.set(Math.atan2(vy, Math.sqrt(vx * vx + vz * vz)), -Math.atan2(vx, vz), o.roll || 0);
  }
  function faceTo(m, o, tx, ty, tz, roll) {   // pointing at a place (the engine's terms)
    const dx = tx - o.x, dy = ty - o.y, dz = tz - o.z;
    m.rotation.order = 'YXZ'; m.rotation.set(Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)), -Math.atan2(dx, dz), roll || 0);
  }
  function streak(m, x, y, z, vx, vy, vz, len, w) {   // a bolt of light along its flight
    const d = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
    m.position.set(x - vx / d * len / 2, y - vy / d * len / 2, -(z - vz / d * len / 2));
    v1.set(vx / d, vy / d, -vz / d); m.quaternion.setFromUnitVectors(UPV, v1); m.scale.set(w, len, w);
  }
  let world = '';
  function setWorld(w) {
    if (w === world) return;
    world = w;
    const v = w === 'valley';
    valley.visible = v; space.visible = !v;
    scene.fog = v ? FOG : null; scene.environment = v ? ENV_VALLEY : ENV_SPACE; scene.environmentIntensity = v ? 0.9 : 1.1;
    sun.color.set(v ? '#ffe2bc' : '#fff1dc'); sun.intensity = v ? 3.6 : 3.2;
    rim.color.set(v ? '#d08a52' : '#7f9cff'); rim.intensity = v ? 0.55 : 1.1; rim.position.copy(v ? new THREE.Vector3(0.5, -0.6, -0.3) : blueStar);
    hemi.color.set(v ? '#a9c8f0' : '#2c3550'); hemi.groundColor.set(v ? '#9a5a34' : '#120e18'); hemi.intensity = v ? 1.15 : 0.7;   // (v20: space's fill was a strong blue - now dim, so shade is shade)
    dustMat.color.set(v ? '#e8c9a4' : '#9fb4ff'); dustMat.opacity = v ? 0.5 : 0.35; dustMat.size = v ? 1.3 : 1.1;
    streakMat.color.set(v ? '#e8c9a4' : '#7f9cff'); streakMat.opacity = v ? 0.25 : 0.14;
    dustGeo.setDrawRange(0, v ? DUST : 160); streakGeo.setDrawRange(0, (v ? DUST : 160) * 2);
    gravity = v ? 0.03 : 0;
    const S2 = sun.shadow.camera, R0 = v ? 175 : 960;   // (v29: wider)
    S2.left = -R0; S2.right = R0; S2.top = R0; S2.bottom = -R0; S2.near = 1; S2.far = v ? 1200 : 3600; S2.updateProjectionMatrix();
    sun.shadow.normalBias = v ? 0.6 : 2.5; sun.shadow.bias = v ? -0.0005 : -0.0012;
  }

  // ---------------------------------------------------------------- one picture
  let lastT = -1, lastW = null;
  const shipPos = new THREE.Vector3();
  // ---------------------------------------------------------------- (v31, 29 Oct) THE STORY'S PICTURE: Noodle Doodles (the owner's own chihuahua, from his
  // photo: blue-grey coat, white chest, muzzle and legs, tan cheeks and eyebrows, big upright ears; a girl - a pink collar and a gold tag, the shiny
  // thing the Magpie is after), her pod (a glass bubble on a cable under the Magpie's ship; bars round it when she is caged), the Magpie's own
  // ship flying the chase, her in your cockpit at the end with the canopy slid back, and Harbourlight waiting.
  function makeDog() {
    const g = new THREE.Group(), M = (c, o) => S(Object.assign({ color: c, roughness: 0.85, metalness: 0 }, o || {}));
    const grey = M('#7c8592'), white = M('#efeae4'), tan = M('#d8b08a'), pinkE = M('#d99a8c'), dark = M('#120d0d', { roughness: 0.12 }), nose = M('#2a2426', { roughness: 0.35 });
    const add = (geo, mat, x, y, z, sx, sy, sz, rx, rz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (sx) m.scale.set(sx, sy, sz); if (rx) m.rotation.x = rx; if (rz) m.rotation.z = rz; m.castShadow = true; g.add(m); return m; };
    const B = new THREE.SphereGeometry(1, 18, 12);
    add(B, grey, 0, 0.62, -0.05, 0.36, 0.34, 0.56); add(B, white, 0, 0.6, 0.3, 0.29, 0.3, 0.3);   // body; white chest
    add(B, grey, 0, 1.05, 0.5, 0.36, 0.33, 0.33); add(B, white, 0, 0.99, 0.67, 0.22, 0.24, 0.19);   // the apple head; the white blaze down her face
    [-1, 1].forEach((sd) => {
      add(B, tan, sd * 0.16, 0.98, 0.7, 0.11, 0.1, 0.1); add(B, tan, sd * 0.12, 1.17, 0.78, 0.055, 0.04, 0.04);   // tan cheeks, tan eyebrows
      add(B, dark, sd * 0.13, 1.07, 0.79, 0.07, 0.075, 0.06);   // big dark eyes
      add(new THREE.ConeGeometry(0.17, 0.5, 12), grey, sd * 0.22, 1.43, 0.45, 0, 0, 0, -0.12, -sd * 0.42); add(new THREE.ConeGeometry(0.11, 0.38, 10), pinkE, sd * 0.215, 1.41, 0.49, 0, 0, 0, -0.12, -sd * 0.42);   // the ears
      [0.3, -0.32].forEach((z) => add(new THREE.CylinderGeometry(0.055, 0.045, 0.5, 8), white, sd * 0.15, 0.25, z));
    });
    add(B, white, 0, 0.94, 0.83, 0.12, 0.1, 0.15); add(B, nose, 0, 0.98, 0.96, 0.05, 0.045, 0.04);   // muzzle, nose
    const tail = new THREE.Group(); tail.position.set(0, 0.78, -0.55); g.add(tail);
    const tm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 0.5, 8), grey); tm.position.y = 0.22; tm.rotation.x = -0.55; tail.add(tm);
    add(new THREE.TorusGeometry(0.2, 0.04, 8, 22), M('#ff5aa8', { roughness: 0.4 }), 0, 0.86, 0.38, 0, 0, 0, 1.15);   // her pink collar
    add(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 14), S({ color: '#ffd468', emissive: '#ffb020', emissiveIntensity: 1.6, metalness: 0.9, roughness: 0.2 }), 0, 0.72, 0.53, 0, 0, 0, Math.PI / 2);   // the shiny tag
    g.userData.tail = tail;
    return g;
  }
  function makePod() {
    const g = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshPhysicalMaterial({ color: '#cdeeff', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false }));
    glass.renderOrder = 5; g.add(glass);
    const rim = new THREE.Mesh(new THREE.SphereGeometry(1.01, 28, 18), shieldMat(new THREE.Color('#8fdcff'), 0.9)); rim.renderOrder = 6; g.add(rim);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.06, 8, 32), MAT.gun); ring.rotation.x = Math.PI / 2; g.add(ring);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.3, 14), MAT.gun); cap.position.y = 1.02; g.add(cap);
    const bars = new THREE.Group(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, b = new THREE.Mesh(new THREE.TorusGeometry(1.03, 0.025, 4, 24, Math.PI), MAT.gun); b.rotation.set(0, a, Math.PI / 2); bars.add(b); } g.add(bars);
    const lamp = glowSprite(T.glowC, '#bfefff', 1.4, 0.55); lamp.position.y = 0.6; g.add(lamp);
    const dog = makeDog(); dog.scale.setScalar(0.52); dog.position.set(0, -0.62, -0.1); g.add(dog);
    g.userData = { bars, dog };
    return g;
  }
  const STORY3 = { made: false };
  function storyMake() {
    if (STORY3.made) return; STORY3.made = true;
    STORY3.mag = MAKE.ace(); scene.add(STORY3.mag); shadows(STORY3.mag, true, false);
    STORY3.pod = makePod(); STORY3.pod.scale.setScalar(2.3); scene.add(STORY3.pod);
    STORY3.cable = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 6), MAT.gun); scene.add(STORY3.cable);
    STORY3.dog = makeDog(); STORY3.dog.scale.setScalar(2.6); scene.add(STORY3.dog);
    STORY3.cab = makeDog(); STORY3.cab.scale.setScalar(0.85); scene.add(STORY3.cab);
    STORY3.tr = null; STORY3.car0 = CARRIER.position.clone();
  }
  const SV = new THREE.Vector3(), SV2 = new THREE.Vector3();
  function drawStory(W, ph) {
    storyMake();
    const T = W.story, t = W.t, show = !!T && ph !== 'brief';
    const mag = show && T.mag, pod = show && T.pod;
    STORY3.mag.visible = !!mag; STORY3.pod.visible = !!pod; STORY3.cable.visible = !!(mag && pod && pod.cable);
    if (mag) {
      STORY3.mag.position.set(mag.x, mag.y, -mag.z); STORY3.mag.rotation.order = 'YXZ'; STORY3.mag.rotation.set(mag.pitch || 0, -(mag.yaw || 0), mag.roll || 0); STORY3.mag.updateMatrixWorld(true);
      if (!STORY3.tr) STORY3.tr = trailNew();
      SV.set(0, 0, 4).applyMatrix4(STORY3.mag.matrixWorld); trailPush(STORY3.tr, SV, t); trailDraw(STORY3.tr, 1.5, 0.55, '#a8dcff');   // (his vapour trail, so you can follow him)
    } else if (STORY3.tr) { STORY3.tr.m.visible = false; STORY3.tr.pts.length = 0; }
    if (pod) {
      const P = STORY3.pod; P.position.set(pod.x, pod.y, -pod.z); P.rotation.y = t * 0.01; P.userData.bars.visible = !!pod.cage;
      const dg = P.userData.dog; dg.visible = !(ph === 'intro' && !T.dogIn); dg.rotation.y = Math.sin(t * 0.02) * 0.6; dg.userData.tail.rotation.z = Math.sin(t * 0.5) * 0.5;
      if (mag && pod.cable) { SV.set(mag.x, mag.y - 1, -mag.z); SV2.set(pod.x, pod.y + 2.3, -pod.z); STORY3.cable.position.copy(SV).add(SV2).multiplyScalar(0.5); STORY3.cable.scale.set(1, Math.max(0.1, SV.distanceTo(SV2)), 1); STORY3.cable.lookAt(SV2); STORY3.cable.rotateX(Math.PI / 2); }
    }
    const dg2 = show && ph === 'intro' && T.dog;   // on the sand, hopping about
    STORY3.dog.visible = !!dg2;
    if (dg2) { STORY3.dog.position.set(dg2.x, dg2.y, -dg2.z); STORY3.dog.rotation.y = -dg2.yaw; STORY3.dog.userData.tail.rotation.z = Math.sin(t * 0.6) * 0.6; }
    const home = show && T.home && (ph === 'reunion' || ph === 'end');   // home: up she pops in your cockpit, and Harbourlight waits ahead
    const can = LANCER.userData.can || (LANCER.userData.can = LANCER.children.find((m) => m.material === MAT.canopy));
    if (can) { const k = home ? T.canopy || 0 : 0; can.position.set(0, 0.7 + k * 0.35, -1.7 + k * 2.8); }
    STORY3.cab.visible = !!home && (T.dogUp || 0) > 0.02;
    if (STORY3.cab.visible) {
      SV.set(0, 0.25 + 0.5 * T.dogUp, -1.2).applyMatrix4(LANCER.matrixWorld); STORY3.cab.position.copy(SV);
      STORY3.cab.quaternion.setFromRotationMatrix(LANCER.matrixWorld); STORY3.cab.rotateY(Math.PI + Math.sin(t * 0.02) * 0.5); STORY3.cab.userData.tail.rotation.z = Math.sin(t * 0.7) * 0.7;
    }
    if (home) { CARRIER.visible = true; CARRIER.position.set(T.home.x, T.home.y, -T.home.z); } else CARRIER.position.copy(STORY3.car0);
  }
  function render(W, t, opts) {
    opts = opts || {};
    if (W !== lastW) { lastW = W; lastT = W.t; reset(); }
    if (WS.broken && !(W.finale > 0)) wsMend();   // (a new game: she is whole again)
    const n = W.t - lastT; if (n > 0 && n < 12) { stepFx(n); stepWrecks(n); } lastT = W.t;
    W_.t = W.t; W_.floor = W.valley && W.valley.floorW && !W.valley.space ? W.valley.floorW : null;
    const C = E.CHAPTERS[W.chap], isValley = C.id === 'valley', chase = W.view !== 'cockpit', ph = W.phase, S = W.ship;
    paint(opts.paint || 'white');
    setWorld(isValley ? 'valley' : 'space');
    if (isValley) { const key = W.seed + ':' + W.chap; if (key !== terrainKey) { terrainKey = key; buildTerrain(W); } }
    const isShoals = C.id === 'shoals'; shoals.visible = isShoals;
    if (isShoals) { const key = W.seed + ':' + W.chap; if (key !== shoalsKey) { shoalsKey = key; buildShoals(W); } }
    const c = W.cam;
    if (Math.abs((W.focal || FOCAL) - curFocal) > 0.05) setProj(W.focal || FOCAL);
    cam.position.set(c.x, c.y, -c.z); cam.rotation.set(c.pitch, -c.yaw, -c.roll);
    const sk = (W.shake || 0) * (W.shake || 0); if (sk > 0.002 && opts.shake !== false) { cam.rotation.x += (Math.random() - 0.5) * 0.028 * sk; cam.rotation.y += (Math.random() - 0.5) * 0.028 * sk; }
    cam.updateMatrixWorld();
    // the skies follow the camera
    if (isValley) {
      valleySky.position.copy(cam.position); valleyStars.position.copy(cam.position); mesas.position.set(cam.position.x, W.valley.ground(c.z) + 206, cam.position.z);
      const k = W.ascending ? clamp((W.alt - 150) / 1400, 0, 1) : 0;
      skyMat.uniforms.space.value = k; valleyStars.material.opacity = k * k; mesas.material.opacity = 1 - k;
      const gh = W.valley.sec ? smooth01((W.s / W.rail.len - 0.25) / 0.65) : 0; GOLD.g = gh;   // (v22) how far into the afternoon
      sun.color.copy(SUNC[0]).lerp(SUNC[1], gh); sun.intensity = 3.6 - 0.5 * gh;
      skyMat.uniforms.horizon.value.copy(SKYC.h0).lerp(SKYC.h1, gh); skyMat.uniforms.zenith.value.copy(SKYC.z0).lerp(SKYC.z1, gh); skyMat.uniforms.sunCol.value.copy(SKYC.s0).lerp(SKYC.s1, gh);
      FOG.far = 3100 + k * 14000; FOG.near = 380 + k * 3000; FOG.color.copy(HAZE).lerp(HAZE2, gh).multiplyScalar(1 - k * 0.92);
      {   // (v27) each land its own air: a clear blue-green haze over the green, smoke in the burnt woods, glare off the salt; distant hills go blue
        bioAt(c.z); const sum = BW[0] + BW[1] + BW[2] + BW[3], lush = Math.min(1, BW[0] + BW[1]);
        if (sum > 0.001) {
          HZC.setRGB(0, 0, 0); for (let q2 = 0; q2 < 4; q2++) if (BW[q2] > 0) HZC.add(HZT.copy(HZB[q2]).multiplyScalar(BW[q2])); HZC.multiplyScalar(1 / sum);
          const kk = Math.min(1, sum) * (1 - k); FOG.color.lerp(HZC, kk * 0.85); skyMat.uniforms.horizon.value.lerp(HZC, kk * 0.55);
          FOG.near -= 150 * BW[2] * (1 - k); FOG.far -= 900 * BW[2] * (1 - k);
        }
        mesas.material.color.setRGB(1, 1, 1).lerp(HZT.setRGB(0.82, 0.86, 0.95), lush * 0.6); mesas.material.opacity *= 1 - 0.55 * lush;   // (distant ranges fade blue-grey over the green)
        hemi.groundColor.copy(HEMI_G).lerp(HZT.setRGB(0.2, 0.3, 0.12), lush * 0.7);
      }
      dustMat.opacity = 0.5 * (1 - k); streakMat.opacity = 0.18 * (1 - Math.min(1, k * 2));   // (no sand up there)
    }
    else { spaceSky.position.copy(cam.position); sunGlow.position.copy(cam.position).addScaledVector(SSUN, 8000); starCore.position.copy(cam.position).addScaledVector(blueStar, 8000); }
    // the dust streams past (longer streaks when you boost)
    const spd = clamp(((W.v || 0) / (W.pace || 3) - 1) / 1.45, 0, 1), sp = Math.max(0.4, (W.v || 1) * (isValley ? 1.2 : 0.9)), boost = 1 + 1.4 * spd + (W.rushT > 0 ? 1.2 : 0);   // (the streaks lengthen with your speed itself)
    for (let i = 0; i < DUST; i++) { let z = dustPos[i * 3 + 2] + sp; if (z > 5) z -= 600; dustPos[i * 3 + 2] = z; }
    dustGeo.attributes.position.needsUpdate = true;
    const len = isValley ? sp * 2 * boost : sp * (0.6 + 2.6 * spd);
    if (isValley && !W.ascending) streakMat.opacity = 0.25 + 0.3 * spd;
    for (let i = 0; i < DUST; i++) { const j = i * 6, q = i * 3; streakPos[j] = dustPos[q]; streakPos[j + 1] = dustPos[q + 1]; streakPos[j + 2] = dustPos[q + 2]; streakPos[j + 3] = dustPos[q]; streakPos[j + 4] = dustPos[q + 1]; streakPos[j + 5] = dustPos[q + 2] - len; }
    streakGeo.attributes.position.needsUpdate = true;
    // your ship: seen from behind (and in every briefing); a barrel roll spins it right round
    const shipPos = new THREE.Vector3(S.x, S.y, -S.z), spin = W.rollT > 0 ? -W.rollDir * (1 - W.rollT / 26) * Math.PI * 2 : 0;
    LANCER.visible = ph === 'brief' || ph === 'intro' || ph === 'reunion' || (ph === 'end' && W.story && W.story.home) || (chase && (ph === 'play' || ph === 'clear' || ph === 'end' || ph === 'ascent'));
    if (W.graceT > 0 && ph === 'play' && (W.t >> 2) % 2) LANCER.visible = false;   // (v20b) a new ship blinks while its grace lasts
    if (isValley && ph === 'play' && !W.ascending && W.t % 2 === 0) {   // flying low over the floor: a spray of sand behind you (more the faster you go) - or mist off the river
      const V = W.valley, fy = V.floorW ? V.floorW(S.z) : V.ground(S.z) - 14, h = S.y - fy, lim = 9 + 7 * spd;
      if (h < lim) {
        const k = (1 - h / lim) * (1 + 0.9 * spd), wet = (V.river || []).some((q) => W.s > q[0] + 60 && W.s < q[1] - 60) && Math.abs(W.ox) < V.width(W.s) * 0.3 || !!inWater(S.x, S.z);
        const pf = puff(wet ? 'mist' : 'dust', S.x + (Math.random() - 0.5) * 4, fy + 0.5, S.z - 3 - Math.random() * 3, { vx: (Math.random() - 0.5) * 0.5, vy: 0.08 + Math.random() * 0.12, vz: -0.4, life: 34, s0: 2 * k, s1: 9 * k, a0: (wet ? 0.6 : 0.5) * k, drag: 0.95 });
        if (!wet) groundDust(pf, S.z);   // (v27: not sand over grass, ash, salt)
        if (wet && W.t % 4 === 0) puff('spark', S.x + (Math.random() - 0.5) * 3, fy + 0.4, S.z - 2, { vx: (Math.random() - 0.5) * 0.6, vy: 0.4 + Math.random() * 0.3, vz: -0.3, life: 22, s0: 0.5, s1: 0.2, g: 0.03 }).s.material.color.set('#eaf6ff');
      }
    }
    if (isValley) {   // the river flowing; the wrecks smoking; dust devils turning out on the desert
      FALLT.offset.y = -(W.t * 0.085) % 1; FALLT2.offset.y = -(W.t * 0.12) % 1; WIND.value = W.t * 0.016; stepLife(W, c); LAKEN.offset.set(W.t * 0.0006, W.t * 0.0004); drawBeams();   // (v27)
      WATER.map.offset.y = -(W.t * 0.0035) % 1; WATER.nrm.offset.y = -(W.t * 0.006) % 1; WATER.nrm.offset.x = Math.sin(W.t * 0.004) * 0.05;
      if (W.t % 3 === 0) TFX.forEach((q) => {
        const dx = q.x - S.x, dz = q.z - S.z; if (dx * dx + dz * dz > 1700 * 1700) return;
        if (q.k === 'wreck') { if (W.t % 6 === 0) puff('smoke', q.x + (Math.random() - 0.5) * 3, q.y, q.z, { vy: 0.22, vx: 0.05, life: 160, s0: 3, s1: 26, a0: 0.55, drag: 0.995 }); if (W.t % 9 === 0) puff('fire', q.x, q.y - 0.5, q.z, { life: 14, s0: 3, s1: 1.2, vy: 0.15 }); }
        else if (q.k === 'fall') { q.rb.material.opacity = 0.085 * smooth(90, 320, Math.sqrt(dx * dx + dz * dz)); if (W.t % 6 === 0) puff('mist', q.x + (Math.random() - 0.5) * 12, q.y + Math.random() * 4, q.z + (Math.random() - 0.5) * 12, { vx: q.ix * 0.25, vy: 0.1 + Math.random() * 0.1, vz: q.iz * 0.25, life: 120, s0: 9, s1: 34, a0: 0.4, drag: 0.985 }); }   // (v27) spray where a waterfall lands
        else if (q.k === 'haze') { if (W.t % 9 === 0) puff('mist', q.x + (Math.random() - 0.5) * q.r * 2, q.y + 1.5, q.z + (Math.random() - 0.5) * q.r * 2, { vx: 0.06, life: 220, s0: 18, s1: 46, a0: 0.15, drag: 1 }); }   // (v28) mist on the lake
        else if (q.k === 'burn') { puff('fire', q.x + (Math.random() - 0.5) * 3 * q.big, q.y + Math.random() * 3, q.z + (Math.random() - 0.5) * 3 * q.big, { vy: 0.3, life: 16, s0: 5 * q.big, s1: 1.5, a0: 0.9 }); if (W.t % 9 === 0) puff('smoke', q.x, q.y + 4, q.z, { vy: 0.3, vx: 0.08, life: 220, s0: 6, s1: 44 * q.big, a0: 0.5, drag: 0.996 }); }   // (v27) the burnt woods still burning
        else { const a = W.t * 0.21 + q.ph; for (let k2 = 0; k2 < 2; k2++) { const hh = Math.random() * 30, rr = 3 + hh * 0.22; const pd = puff('dust', q.x + Math.cos(a + k2 * 3.1) * rr, q.y + hh, q.z + Math.sin(a + k2 * 3.1) * rr, { vx: -Math.sin(a) * 0.5, vy: 0.35, vz: Math.cos(a) * 0.5, life: 70, s0: 3, s1: 11, a0: 0.32, drag: 0.98 }); if (q.white && pd) { pd.col = pd.cb || (pd.cb = new THREE.Color()); pd.col.setRGB(1.45, 1.42, 1.38); } } }
      });
    }
    LANCER.position.copy(shipPos); LANCER.rotation.order = 'YXZ'; LANCER.rotation.set(S.pitch, -S.yaw, S.roll + spin); LANCER.updateMatrixWorld(true);
    const thrust = 0.45 + Math.min(1.8, (W.v || 1) / (W.pace || 3)) * 0.65;
    LANCER.userData.flames.forEach((f) => { f.scale.set(1 + 0.25 * (W.boostK || 0), 1 + 0.25 * (W.boostK || 0), thrust * (0.85 + Math.random() * 0.3) * (1 + 0.75 * (W.boostK || 0))); });   // (the flame grows with how hard you open the throttle)
    if (W.story && W.story.parked) { LANCER.userData.flames.forEach((f) => { f.scale.set(0.01, 0.01, 0.01); }); }   // (v31: parked on the sand, engines cold)
    { const want = W.sonic && ph === 'play' ? 0.3 + 0.4 * clamp(((W.mach || 0) - 1) * 2, 0, 1) : 0; VAPOR.k += (want - VAPOR.k) * 0.1; VAPOR.burst *= 0.93;   // the vapour cone
      const vk = Math.min(1, VAPOR.k + VAPOR.burst * 0.9); VAPOR.m.visible = vk > 0.01 && chase; VAPOR.mat.uniforms.k.value = vk; VAPOR.mat.uniforms.t.value = W.t; VAPOR.m.scale.set(8.2 + VAPOR.burst * 4, 8.2 + VAPOR.burst * 4, 11); }
    LANCER.userData.glows.forEach((g2) => { const k = 1.3 + thrust * 0.8 + Math.random() * 0.3; g2.scale.set(k, k, 1); });
    LANCER.userData.shield.material.uniforms.k.value = W.hitT > 0 ? Math.pow(W.hitT / 40, 1.5) * 0.55 : W.rollT > 0 ? 0.45 : 0;
    cockpit.visible = !chase && ph !== 'brief' && ph !== 'intro' && ph !== 'reunion' && !(W.story && W.story.home);
    if (LANCER.visible && (W.flipT > 0 || (W.braking && W.t % 2 === 0))) {   // the thrusters: blue-white jets from the nose and the wing tips as you brake or flip
      [[0, 0.2, -6.4], [-5.6, 0, -0.4], [5.6, 0, -0.4]].forEach((q, i) => {
        if (!W.flipT && i) return;
        v1.set(q[0], q[1], q[2]).applyMatrix4(LANCER.matrixWorld); v2.set(q[0] * 0.3, i ? 1.5 : 0.4, -2).transformDirection(LANCER.matrixWorld);
        puff('glow', v1.x, v1.y, -v1.z, { vx: v2.x * 1.2 + S.vx, vy: v2.y * 1.2 + S.vy, vz: -v2.z * 1.2 + S.vz, life: 10, s0: W.flipT ? 3.4 : 2.2, s1: 0.4, a0: 0.8 }).s.material.color.set('#9fd8ff');
      });
    }
    // the sun's shadows: round your ship in the valley, round the warship in space
    if (isValley) { cam.getWorldDirection(v1); v1.y = 0; v1.normalize(); v2.copy(shipPos).addScaledVector(v1, 80); sun.target.position.copy(v2); sun.position.copy(v2).addScaledVector(VSUN, 500); }   // (v29: centred ahead of you, where you look)
    else if (isShoals) { sun.target.position.copy(shipPos); sun.position.copy(shipPos).addScaledVector(SSUN, 1700); }   // (chapter 3: the shadows go with you)
    else { sun.target.position.set(0, 0, 0); sun.position.copy(SSUN).multiplyScalar(1700); }
    sun.target.updateMatrixWorld();
    // space: your carrier far off, the warship, her bridge's shield
    CARRIER.visible = !isValley && !isShoals;
    WS.group.visible = !isValley && !isShoals;
    drawStory(W, ph);   // (v31) the Magpie, her pod, Noodle Doodles, home
    if (isShoals && W.outrun) {   // (chapter 3) its blast behind you: fire and rock streaming past, the light from behind going orange
      const gap = W.s - W.outrun.front, k2 = Math.max(0, Math.min(1, 1 - gap / 700)), F = E.frame(W.rail, W.s);
      rim.color.set('#ff8a40'); rim.intensity = 0.4 + 3 * k2; rim.position.set(-F.fx, -F.fy + 0.2, F.fz);
      if (k2 > 0.05 && W.t % 2 === 0) for (let i = 0; i < 1 + Math.round(k2 * 3); i++) {
        const a = Math.random() * 6.283, rr = 30 + Math.random() * 70, p = E.local(F, Math.cos(a) * rr, Math.sin(a) * rr * 0.7, -40);
        puff(i % 2 ? 'fire' : 'spark', p.x, p.y, p.z, { vx: F.fx * (W.v + 9), vy: F.fy * (W.v + 9), vz: F.fz * (W.v + 9), life: 22, s0: 4 + k2 * 10, s1: 2, drag: 1 });
      }
    } else if (isShoals) { rim.color.set('#7f9cff'); rim.intensity = 1.1; rim.position.copy(blueStar); }
    if (!isValley && !isShoals) {
      const blink = ((W.t >> 4) % 4) === 0; CARRIER.userData.nav.forEach((q) => { q.visible = blink; }); CARRIER.userData.beacon.visible = ((W.t >> 5) % 2) === 0;
      CARRIER.userData.engines.forEach((q) => { const k = 76 + Math.random() * 8; q.scale.set(k, k, 1); });
      WS.flames.forEach((q) => { const k = 64 + Math.random() * 10; q.scale.set(k, k, 1); });
      if (WS.broken) wsDrift(W);
      else { const kg = W.objs.find((o) => o.k === 'keel'), kz = kg && kg.alive ? kg.z / WS.K : 1e9, ph2 = W.t >> 2;   // her keel gun's track: lights racing along it towards the gun, steady red beside it
        WS.trackLights.forEach((l, i) => { const z = l.position.z, near = Math.abs(z - kz) < 40; l.visible = near || ((Math.floor((z + 400) / 18) + (z < kz ? -ph2 : ph2)) % 5 + 5) % 5 === 0; l.material.color.set(near ? '#ff3020' : '#ffffff'); }); }
      const br = W.objs.find((o) => o.k === 'bridge');
      WS.bridgeWin.visible = !!br; WS.shield.visible = !!(br && br.shielded); if (WS.shield.visible) WS.shield.material.uniforms.k.value = 0.8 + Math.sin(W.t * 0.07) * 0.25;
    }
    for (let i = damage.length - 1; i >= 0; i--) if (damage[i].until && W.t > damage[i].until) damage.splice(i, 1);   // (a gun's smoke dies away)
    if (W.t % 3 === 0) damage.forEach((d) => { puff('smoke', d.x + (Math.random() - 0.5) * 6, d.y, d.z + (Math.random() - 0.5) * 6, { vy: 0.25, life: 90, s0: 5, s1: 22, a0: 0.6, drag: 0.99 }); puff('fire', d.x + (Math.random() - 0.5) * 4, d.y, d.z, { life: 14, s0: 4, s1: 1.5, vy: 0.2 }); });
    if (MUZZLE.t > 0) MUZZLE.t--;
    // the ships, guns, gates and rock
    PL.i = 0;
    W.objs.forEach((o) => {
      if (!o.alive || o.wait > 0 || o.x == null || o.k === 'wpart' || o.k === 'mpart') return;
      if (o.rs != null && !o.beh && !o.free && (o.rs - W.s > 3200 || o.rs - W.s < -160)) return;   // (far down the valley, or behind you)
      let m;
      switch (o.k) {
        case 'dart': case 'heavy':
          m = get(o.ace ? 'ace' : o.role === 'howl' ? 'howler' : o.role === 'fetch' ? 'fetcher' : o.k === 'dart' && o.v ? 'dart2' : o.k, o); m.position.set(o.x, o.y, -o.z); fighterLook(o, m);
          if (o.free) { m.rotation.order = 'YXZ'; m.rotation.set(o.pitch, -o.yaw, o.roll || 0); }
          else if (o.face) faceTo(m, o, S.x, S.y, S.z, o.roll); else orient(m, o);
          if (o.brT > 0) m.rotation.z += (o.brD || 1) * (1 - o.brT / 36) * Math.PI * 2;   // a jink: a barrel roll
          m.updateMatrixWorld();
          { const U = m.userData; v2.set(0, 0, 1).transformDirection(m.matrixWorld); U.ex.forEach((q) => { if (PL.i >= plumes.length) return; v1.copy(q).applyMatrix4(m.matrixWorld); const L = U.exL * m.scale.x * (0.8 + Math.random() * 0.35) * ((o.st === 'pass' || o.st === 'by') && Math.abs(o.rs - W.s) < 220 ? 2.2 : 1); v3.copy(v1).addScaledVector(v2, L); orientBeam(plumes[PL.i++], v1, v3, U.exW * m.scale.x * 0.5); }); }   // its engines' flames
          if (o.k === 'heavy' && o.hp < 3 && W.t % 3 === 0) puff('smoke', o.x, o.y, o.z, { vy: 0.1, life: 50, s0: 2, s1: 9, a0: 0.55 });
          { const ha = W.t - (o.hurtAt == null ? -99 : o.hurtAt); if (ha >= 0 && ha < 30) { m.rotation.z += Math.sin(ha * 0.9) * 0.3 * (1 - ha / 30); m.rotation.x += Math.sin(ha * 0.7) * 0.12 * (1 - ha / 30); } }   // hit: it shudders
          fighterFx(W, o, m);
          { const U2 = m.userData; if (U2.tail) U2.tail.rotation.y = Math.sin(W.t * (o.scared ? 0.95 : 0.32) + m.id) * (o.scared ? 0.25 : 0.55);   // (v32) the tail wags; a howl's shield round it
            if (o.shieldT > 0) { if (!U2.bub) { U2.bub = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 14), shieldMat(new THREE.Color('#7fd8ff'), 1)); U2.bub.scale.setScalar(o.k === 'heavy' ? 7 : 6.2); m.add(U2.bub); } U2.bub.visible = true; U2.bub.material.uniforms.k.value = (0.55 + 0.3 * Math.sin(W.t * 0.3)) * Math.min(1, o.shieldT / 30); } else if (U2.bub) U2.bub.visible = false; }
          tellGlow(o, o.k === 'heavy' ? 1.8 : 1.4);
          { const on = ((W.t + (m.id % 20)) >> 4) % 3 === 0; m.userData.nav.forEach((q) => { q.visible = on; }); }
          break;
        case 'warden': {
          m = get('warden', o); m.position.set(o.x, o.y, -o.z); m.rotation.order = 'YXZ'; m.rotation.set(o.pitch || 0, -o.yaw, o.roll || 0);
          const PT = m.userData.parts;
          o.parts.forEach((q) => {
            const v = PT[q.name]; v.visible = q.alive;
            if (!q.alive && W.t % 3 === 0) { puff('smoke', q.x, q.y, q.z, { vy: 0.2, life: 60, s0: 3, s1: 12, a0: 0.6 }); puff('fire', q.x, q.y, q.z, { life: 12, s0: 3, s1: 1 }); }
          });
          o.parts.forEach((q) => { if (q.alive && q.tell > 0) tellGlow(q, q.name === 'core' ? 2.6 : 2.2, q.name === 'core' ? 60 : 60); });
          PT.shield.visible = o.parts[4].shielded; PT.shield.material.uniforms.k.value = 1 + Math.sin(W.t * 0.1) * 0.3;
          MAT.foeCore.emissiveIntensity = o.parts[4].shielded ? 3 : 5 + Math.sin(W.t * 0.3) * 2;
          break;
        }
        case 'asteroid': case 'rock': {   // (chapter 3) turning slowly; a small rock tumbles (v25: the big ones in full detail)
          const RG2 = rockGeos(), vi = RV[o.k][(o.v || 0) % 4];
          m = get(o.k, o); m.geometry = o.k === 'asteroid' || o.r > 7 ? RG2.hi[vi] : RG2.mid[vi]; m.position.set(o.x, o.y, -o.z); m.scale.setScalar(o.r);
          m.rotation.set(o.spin + W.t * (o.k === 'asteroid' ? 0.0007 : 0.008), o.spin * 1.7 + W.t * (o.k === 'asteroid' ? 0.0005 : 0.005), 0); break;
        }
        case 'boulder': {   // (v25) a thrown rock: its own shape, the tractor beam's blue round it, a trail
          const RG2 = rockGeos(), vi = RV.boulder[(o.v || 0) % 4], U = (m = get('boulder', o)).userData;
          m.position.set(o.x, o.y, -o.z); U.rock.geometry = RG2.hi[vi]; U.shell.geometry = RG2.mid[vi]; U.rock.scale.setScalar(o.r); U.glow.scale.setScalar(o.r * 3.2); m.rotation.set(o.spin, o.spin * 1.3, 0);
          if (W.t % 2 === 0) puff('glow', o.x, o.y, o.z, { life: 16, s0: o.r * 1.6, s1: o.r * 0.4, a0: 0.45 }).s.material.color.set('#6fd8ff');
          break;
        }
        case 'millstone': {   // (chapter 3; v25 rebuilt) its parts as they are, smoke where one was; the wheel turning; each arm drawing back before it throws;
          // the saw spinning up red-hot; the reactor's iris; lamps blinking, stacks smoking, its lights failing as it goes critical
          m = get('millstone', o); m.position.set(o.x, o.y, -o.z); m.rotation.order = 'YXZ'; m.rotation.set(o.pitch || 0, -o.yaw, o.roll || 0); m.updateMatrixWorld(true);
          const PT = m.userData.parts, thrown = o.cycT > 200 * (0.6 + 0.4 * W.sp.eFire) - 50, dying = o.st === 'dying', rp = o.parts[3], R2 = PT.reactor.userData;
          o.parts.forEach((q) => {
            PT[q.name].visible = q.alive || q.name === 'reactor';
            if (!q.alive && q.name !== 'reactor' && W.t % 3 === 0) { PT.stubs[q.name].getWorldPosition(v3); puff('smoke', v3.x, v3.y, -v3.z, { vy: 0.2, life: 60, s0: 4, s1: 16, a0: 0.6 }); puff('fire', v3.x, v3.y, -v3.z, { life: 12, s0: 4, s1: 1 }); }
            if (q.alive && q.tell > 0) tellGlow(q, 3, 70);
          });
          ['armL', 'armR'].forEach((nm, i) => {
            const A = PT[nm], U = A.userData, q = o.parts[i], hold = o.beat === 1 && !(thrown && o.armNow && o.armNow.name === nm), hot = q.tell > 0;
            U.rock.visible = hold; U.beam.visible = hold; U.shaft.visible = hold; U.beam.material.opacity = 0.35 + 0.15 * Math.sin(W.t * 0.2 + i);
            U.rock.rotation.set(W.t * 0.011 + i, W.t * 0.007, 0);
            U.emit.material.emissive.set(hot ? '#ff4a24' : '#33eeff'); U.emit.material.emissiveIntensity = hot ? 3.5 + 2.5 * Math.sin(W.t * 0.7) : 2.2;
            U.yaw += (U.sx * 0.13 * (hot ? 1 - q.tell / 70 : 0) - U.yaw) * 0.2; A.rotation.y = U.yaw + Math.sin(W.t * 0.013 + i * 2) * 0.03;   // (it draws back, then throws)
          });
          PT.wheel.rotation.z += dying ? 0.03 : 0.005;
          const cq = o.parts[2], spin = cq.tell > 0 ? 1 - cq.tell / 60 : 0; PT.saw.rotation.z += 0.06 + spin * 0.5; MAT.millHot.emissiveIntensity = cq.tell > 0 ? 1 + spin * 5 : 0.5;
          const open = !rp.alive ? 1 : !rp.shielded ? 1 : o.cst === 'charge' ? 0.1 + 0.06 * Math.sin(W.t * 0.5) : 0;
          R2.k += (open - R2.k) * 0.12; R2.pet.forEach((p) => { const d = R2.k * 15; p.position.x = Math.cos(p.userData.a) * d; p.position.y = Math.sin(p.userData.a) * d; });
          R2.shield.visible = o.beat < 3 && rp.alive; R2.shield.material.uniforms.k.value = 0.6 + Math.sin(W.t * 0.08) * 0.2;
          MAT.millCore.emissiveIntensity = !rp.alive ? 8 + Math.random() * 5 : !rp.shielded ? 6 + Math.sin(W.t * 0.4) * 2 : o.cst === 'charge' ? 3 + (1 - rp.tell / 70) * 4 : 2.5;
          { const gs = 20 + R2.k * 34 + (rp.alive ? 0 : 20 + Math.random() * 24); R2.glow.scale.set(gs, gs, 1); R2.glow.material.opacity = Math.min(1, 0.25 + R2.k * 0.75); }
          PT.beacons.forEach((b, k) => { b.visible = ((W.t + k * 11) >> 4) % 2 === 0; });
          MAT.millWin.emissiveIntensity = dying && Math.random() < 0.2 ? 0.15 : 2.2;
          if (W.t % 7 === 0) PT.stacks.forEach((st) => { st.getWorldPosition(v3); puff('smoke', v3.x, v3.y, -v3.z, { vy: 0.25, vx: (Math.random() - 0.5) * 0.1, life: 90, s0: 4, s1: 20, a0: 0.35, drag: 0.99 }); });
          break;
        }
        case 'treat': case 'toy': { m = get(o.k, o); m.position.set(o.x, o.y, -o.z); m.rotation.set(Math.sin(W.t * 0.04) * 0.5, W.t * 0.06, 0); const gl = m.userData.glow; if (gl) { gl.material.color.set(o.k === 'toy' ? '#ff6ac0' : o.kind === 'spread' ? '#7fe8ff' : o.kind === 'rockets' ? '#ffb040' : '#7dff8a'); gl.material.opacity = 0.55 + 0.3 * Math.sin(W.t * 0.2); } break; }   // (v32)
        case 'drone': m = get('drone', o); m.scale.setScalar(o.raid ? 1.6 : 1); m.position.set(o.x, o.y, -o.z); m.lookAt(chase ? shipPos : cam.position); tellGlow(o, 0.8); break;
        case 'mine': {   // the Gaoler's mines: a spiked ball, spinning, its lamp blinking faster as you close
          m = get('mine', o); m.position.set(o.x, o.y, -o.z); m.rotation.set(W.t * 0.05 + o.spin, W.t * 0.04, 0);
          const near = clamp((o.rs - W.s) / 160, 0, 1); m.userData.lamp.visible = ((W.t >> (near > 0.5 ? 3 : 1)) % 2) === 0; break;
        }
        case 'turret':
          if (o.free) {   // one of the warship's guns: stood on her hull, its head turned to follow you
            m = get('wt_' + o.kind, o); m.position.set(o.x, o.y, -o.z); m.scale.setScalar(o.ny < 0 ? 1.75 : 1.25); v2.set(o.nx, o.ny, -o.nz); m.quaternion.setFromUnitVectors(UPV, v2); m.updateMatrixWorld();   // (the guns under her: bigger)
            m.userData.head.lookAt(shipPos); m.userData.lamp.visible = ((W.t >> 3) % 3) !== 0; tellGlow(o, 1.4);
          } else if (o.mount === 'wall') {   // a bunker in the canyon wall, facing across the canyon, its gun following you
            m = get('bunker', o); m.position.set(o.x, o.y, -o.z); m.rotation.set(0, -o.yaw + (o.side < 0 ? -Math.PI / 2 : Math.PI / 2), 0); m.updateMatrixWorld(); m.userData.head.lookAt(chase ? shipPos : cam.position);
            m.userData.lamp.visible = ((W.t >> 3) % 3) !== 0; tellGlow(o, 1.6);
          } else {
            m = get('turret', o); m.position.set(o.x, o.y, -o.z); m.rotation.set(0, -o.yaw, 0); m.updateMatrixWorld(); m.userData.head.lookAt(chase ? shipPos : cam.position);
            m.userData.lamp.visible = ((W.t >> 3) % 3) !== 0; tellGlow(o, 1.7);
          }
          break;
        case 'gen': {
          m = get('gen', o); m.position.set(o.x, o.y, -o.z); m.scale.setScalar(E.WS_K || 1); const U = m.userData, hurt = 1 - o.hp / o.max;
          U.r1.rotation.y = W.t * 0.02; U.r2.rotation.z = W.t * 0.017; U.core.rotation.y = W.t * 0.01;
          U.core.material.emissiveIntensity = 4 * (1 - hurt * 0.6) * (hurt > 0.5 && Math.random() < 0.2 ? 0.3 : 1); U.glow.material.opacity = 0.9 * (1 - hurt * 0.5);
          break;
        }
        case 'gun': {
          m = get('gun', o); m.position.set(o.x, o.y, -o.z); m.scale.setScalar(E.WS_K || 1); m.updateMatrixWorld();
          const Cw = E.WARSHIP.carrier; m.userData.house.lookAt(Cw[0], Cw[1], -Cw[2]); m.userData.barrels.position.z = 10 - (MUZZLE.t > 0 ? MUZZLE.t / 30 * 6 : 0);
          break;
        }
        case 'gate': {
          m = get('gate', o); m.position.set(o.x, o.y, -o.z); m.rotation.order = 'YXZ'; m.rotation.set(o.pitch || 0, -o.yaw, 0); m.scale.setScalar(o.gr);
          const M = m.userData.mats, gold = o.bonus > 1;
          if (o.passed && m.userData.born < 0) m.userData.born = W.t;
          const f = o.passed ? clamp((W.t - m.userData.born) / 40, 0, 1) : 0, pulse = 1 + Math.sin(W.t * 0.15 + o.rs) * 0.25;
          if (o.passed === 1) { M[0].color.setRGB(0.4 * (1 - f) + 0.2, 3.2 * (1 - f) + 0.3, 0.6 * (1 - f) + 0.1); m.scale.setScalar(o.gr * (1 + f * 0.6)); }
          else if (o.passed === -1) M[0].color.setRGB(2.4 * (1 - f) + 0.3, 0.2, 0.15);
          else if (gold) M[0].color.setRGB(3.2 * pulse, 2.2 * pulse, 0.3 * pulse);
          else M[0].color.setRGB(0.25 * pulse, 2.4 * pulse, 3.2 * pulse);
          M[1].opacity = 0.5 * (1 - f); M[2].opacity = 0.12 * (1 - f);
          break;
        }
        case 'arch': m = get('arch', o); m.position.set(o.x, o.y + o.y0 + 8, -o.z); m.rotation.set(0, -o.yaw, 0); m.scale.set(o.aw < 900 ? o.aw * 2 + 30 : W.valley.width(o.rs) + 60, 16, 18); break;
        case 'pillar': m = get('pillar', o); m.position.set(o.x, o.y + (o.fl != null ? o.fl : -14) - 6 + 47.5, -o.z); m.rotation.set(0, o.rs * 0.01, 0); m.scale.set(o.pr, 95, o.pr); break;
        case 'keel': {   // her keel gun on its track: the turret swung round at you, sparks off its wheels when it runs fast
          m = get('keel', o); m.position.set(o.x, o.y, -o.z); m.updateMatrixWorld(); m.userData.head.lookAt(shipPos); m.userData.lamp.visible = ((W.t >> 3) % 2) === 0; tellGlow(o, 2.4, 30);
          if (o.run > 2.4 && W.t % 2 === 0) [-7, 7].forEach((x) => puff('spark', o.x + x * 1.5, o.y + 28, o.z - Math.sign(o.vz) * 18, { vx: (Math.random() - 0.5) * 0.8, vy: -0.4 - Math.random() * 0.5, vz: -o.vz * 0.4, life: 16, s0: 1.2, s1: 0.2 }));
          break;
        }
      }
    });
    // enemy fire: lasers, missiles, flak shells, her big shells
    function exhaust(b, k) {   // a rocket's or missile's flame streaming back, and (once a step) a trail of smoke
      const vl = Math.sqrt(b.vx * b.vx + b.vy * b.vy + b.vz * b.vz) || 1, dx = b.vx / vl, dy = b.vy / vl, dz = b.vz / vl;
      if (PL.i < plumes.length) { const L = (8 + Math.random() * 3) * k; v1.set(b.x - dx * 2.1 * k, b.y - dy * 2.1 * k, -(b.z - dz * 2.1 * k)); v2.set(v1.x - dx * L, v1.y - dy * L, v1.z + dz * L); orientBeam(plumes[PL.i++], v1, v2, 1.6 * k); }
      if (b._fxT === W.t) return; b._fxT = W.t;
      puff('smoke', b.x - dx * 3 * k, b.y - dy * 3 * k, b.z - dz * 3 * k, { life: isValley ? 50 : 30, s0: 1.3 * k, s1: (isValley ? 7.5 : 4) * k, a0: isValley ? 0.45 : 0.22, drag: 0.96, vy: isValley ? 0.03 : 0 });
    }
    W.eshots.forEach((b) => {
      let m;
      if (b.k === 'bolt') {   // a red streak along its flight, and its bright head
        m = get('ebolt', b); const U = m.userData, d = Math.sqrt((b.x - c.x) ** 2 + (b.y - c.y) ** 2 + (b.z - c.z) ** 2), vl = Math.sqrt(b.vx * b.vx + b.vy * b.vy + b.vz * b.vz) || 1, len = b.big ? 19 : 13;
        v1.set(b.x, b.y, -b.z); v2.set(b.x - b.vx / vl * len, b.y - b.vy / vl * len, -(b.z - b.vz / vl * len));
        orientBeam(U.r, v1, v2, (b.big ? 1.4 : 0.95) + d * 0.004);
        const hs = (b.big ? 3 : 2.1) + d * 0.008; U.head.position.copy(v1); U.head.scale.set(hs, hs, 1);
      }
      else if (b.k === 'missile' && b.ball) { if (!b.alive) return; m = get('ball', b); m.position.set(b.x, b.y, -b.z); m.rotation.x += 0.16; m.rotation.z += 0.06; }   // (v32) a Fetcher's ball
      else if (b.k === 'missile') { if (!b.alive) return; m = get('missile', b); m.position.set(b.x, b.y, -b.z); m.lookAt(b.x - b.vx, b.y - b.vy, -(b.z - b.vz)); const k = 2.8 + Math.random() * 1.4; m.userData.flame.scale.set(k, k, 1); m.userData.lamp.visible = ((W.t >> 2) % 2) === 0; exhaust(b, 0.85); }
      else if (b.k === 'flak') { m = get('flak', b); m.position.set(b.x, b.y, -b.z); }
      else if (b.k === 'shell') { m = get('shell', b); streak(m.userData.core, 0, 0, 0, b.vx, b.vy, b.vz, 40, 1.4); m.position.set(b.x, b.y, -b.z); }
    });
    (W.bombsLive || []).forEach((b) => {   // a shock bomb in flight: a bright blue-white orb and a trail of sparks
      puff('glow', b.x, b.y, b.z, { life: 3, s0: 7, s1: 5, a0: 1 }).s.material.color.set('#c8f4ff');
      puff('spark', b.x, b.y, b.z, { life: 16, s0: 1.8, s1: 0.2, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, vz: (Math.random() - 0.5) * 0.3 });
    });
    W.rockets.forEach((r) => { if (r.delay > 0) return; const m = get('rocket', r); m.position.set(r.x, r.y, -r.z); m.lookAt(r.x - r.vx, r.y - r.vy, -(r.z - r.vz)); const f = m.userData.flame, k = 3 + Math.random() * 1.8; f.scale.set(k, k, 1); exhaust(r, 1); });
    for (; PL.i < plumes.length; PL.i++) plumes[PL.i].visible = false;
    if (ph === 'play' || ph === 'clear') drawBolts(W, chase); else { bolts.forEach((g) => { g.visible = false; }); boltHeads.forEach((g) => { g.visible = false; }); flashes.forEach((f) => { f.visible = false; }); }
    sweep();
    drawFx();
    sun.castShadow = !low;
    {   // the film look: valley - warm light, cool shade; space - teal shadows, warm highlights; streaks off bright lights; at speed, the picture streaks
      const U = final.uniforms, sp2 = clamp(((W.v || 0) / (W.pace || 3) - 1.15) / 1.3, 0, 1), cine = W.esc && W.finale > 30;
      if (isValley) { const gg = GOLD.g; U.shT.value.set(0.93 - 0.02 * gg, 0.98 - 0.02 * gg, 1.06 + 0.03 * gg); U.hiT.value.set(1.06 + 0.04 * gg, 1.0 - 0.01 * gg, 0.92 - 0.06 * gg); U.sat.value = 1.07 + 0.04 * gg; U.con.value = 1.05; U.stK.value = 0.16; }
      else { U.shT.value.set(0.88, 0.99, 1.1); U.hiT.value.set(1.07, 1.0, 0.91); U.sat.value = 1.1; U.con.value = 1.06; U.stK.value = 0.34; }
      const want = ph === 'play' && !cine && opts.blur !== false ? (isValley ? 0.034 : 0.022) * sp2 * sp2 + (W.rushT > 0 ? 0.012 * W.rushT / 34 : 0) : 0;
      U.blurK.value += (want - U.blurK.value) * 0.15; if (U.blurK.value < 0.0005) U.blurK.value = 0;
    }
    try { composer(); } catch (e) { if (!low) { low = true; composer(); } }   // a graphics chip that can't do the glow: the plain picture
    void t;
    return renderer.domElement;
  }

  // ---------------------------------------------------------------- the glow: bright parts blurred and added back, then tone mapped
  const rtOpts = { type: THREE.HalfFloatType, depthBuffer: false };
  let rtAO = null, rtAO2 = null, rtR = null, rtScene = null, rtA = null, rtB = null, rtC = null, rtD = null, rtE = null, rtF = null, rtG = null, rtH = null;
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quad.frustumCulled = false; quadScene.add(quad);
  const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const bright = new THREE.ShaderMaterial({ uniforms: { src: { value: null }, th: { value: 1.1 } }, vertexShader: vs, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D src; uniform float th; varying vec2 vUv; void main(){ vec3 c = texture2D(src, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(th, th + 0.6, l), 1.0); }' });
  const blur = new THREE.ShaderMaterial({ uniforms: { src: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: vs, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D src; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 c = texture2D(src, vUv).rgb * 0.227; c += (texture2D(src, vUv + dir * 1.385).rgb + texture2D(src, vUv - dir * 1.385).rgb) * 0.316; c += (texture2D(src, vUv + dir * 3.231).rgb + texture2D(src, vUv - dir * 3.231).rgb) * 0.070; gl_FragColor = vec4(c, 1.0); }' });
  const final = new THREE.ShaderMaterial({ uniforms: { src: { value: null }, b1: { value: null }, b2: { value: null }, b3: { value: null }, st: { value: null }, glow: { value: 1 }, expo: { value: 1.15 }, seed: { value: 0 },
      texel: { value: new THREE.Vector2(1, 1) }, sharp: { value: 0.3 }, blurK: { value: 0 }, blurC: { value: new THREE.Vector2(0.5, 0.56) }, shT: { value: new THREE.Vector3(1, 1, 1) }, hiT: { value: new THREE.Vector3(1, 1, 1) },
      sat: { value: 1 }, con: { value: 1 }, stK: { value: 0 }, aoT: { value: null }, aoK: { value: 0 }, ssrT: { value: null }, ssrK: { value: 0 }, raysT: { value: null }, raysK: { value: 0 }, dT: { value: null }, sunUv: { value: new THREE.Vector2(-9, -9) }, flK: { value: 0 }, sunC: { value: new THREE.Color(1, 0.9, 0.75) } }, vertexShader: vs, depthTest: false, depthWrite: false,
    fragmentShader: [
      'uniform sampler2D src, b1, b2, b3, st; uniform float glow, expo, seed, sharp, blurK, sat, con, stK; uniform vec2 texel, blurC; uniform vec3 shT, hiT; varying vec2 vUv;',
      'uniform sampler2D aoT, ssrT, raysT, dT; uniform float aoK, ssrK, raysK, flK; uniform vec2 sunUv; uniform vec3 sunC;',
      'vec3 ghost(vec2 p, vec2 c, float r, vec3 col, vec2 asp){ float d = length((p - c) * asp); return col * smoothstep(r, r * 0.5, d) * (0.55 + 0.45 * smoothstep(r * 0.4, r * 0.9, d)); }',
      'vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }',
      'vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }',
      'vec3 bicubic(vec2 uv){',   // the scene, drawn at fewer pixels than the screen, brought up with Catmull-Rom (9 fetches) rather than a plain blur
      '  vec2 sp = uv / texel, tp = floor(sp - 0.5) + 0.5, f = sp - tp;',
      '  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)), w1 = 1.0 + f * f * (-2.5 + 1.5 * f), w2 = f * (0.5 + f * (2.0 - 1.5 * f)), w3 = f * f * (-0.5 + 0.5 * f);',
      '  vec2 w12 = w1 + w2, t0 = (tp - 1.0) * texel, t3 = (tp + 2.0) * texel, t12 = (tp + w2 / w12) * texel; vec3 r = vec3(0.0);',
      '  r += texture2D(src, vec2(t0.x, t0.y)).rgb * w0.x * w0.y + texture2D(src, vec2(t12.x, t0.y)).rgb * w12.x * w0.y + texture2D(src, vec2(t3.x, t0.y)).rgb * w3.x * w0.y;',
      '  r += texture2D(src, vec2(t0.x, t12.y)).rgb * w0.x * w12.y + texture2D(src, vec2(t12.x, t12.y)).rgb * w12.x * w12.y + texture2D(src, vec2(t3.x, t12.y)).rgb * w3.x * w12.y;',
      '  r += texture2D(src, vec2(t0.x, t3.y)).rgb * w0.x * w3.y + texture2D(src, vec2(t12.x, t3.y)).rgb * w12.x * w3.y + texture2D(src, vec2(t3.x, t3.y)).rgb * w3.x * w3.y;',
      '  return max(r, vec3(0.0)); }',
      'void main(){ vec2 q = vUv - 0.5; float e = dot(q, q);',
      '  vec3 c = bicubic(vUv), c0 = texture2D(src, vUv).rgb;',
      '  vec3 n1 = texture2D(src, vUv + vec2(texel.x, 0.0)).rgb, n2 = texture2D(src, vUv - vec2(texel.x, 0.0)).rgb, n3 = texture2D(src, vUv + vec2(0.0, texel.y)).rgb, n4 = texture2D(src, vUv - vec2(0.0, texel.y)).rgb;',
      '  vec3 lo = min(min(min(n1, n2), min(n3, n4)), c), hi = max(max(max(n1, n2), max(n3, n4)), c);',
      '  c = clamp(c + (c - (n1 + n2 + n3 + n4) * 0.25) * sharp, lo, hi);',   // sharpened - but never past its neighbours, so no halos
      '  if (ssrK > 0.0) { vec4 rf = texture2D(ssrT, vUv); c = mix(c, rf.rgb, rf.a * ssrK); }',   // (v30) the water's reflections
      '  if (aoK > 0.0) c *= mix(1.0, texture2D(aoT, vUv).r, aoK);',   // (v30) ambient occlusion
      '  vec2 ca = q * e * 0.012; c.r += texture2D(src, vUv + ca).r - c0.r; c.b += texture2D(src, vUv - ca).b - c0.b; c = max(c, vec3(0.0));',   // a little colour fringing at the edges, as a lens does
      '  if (blurK > 0.0005) { vec2 dir = vUv - blurC; float m = blurK * smoothstep(0.015, 0.2, dot(dir, dir)); vec3 acc = c;',   // speed: the picture streaks out from the middle
      '    for (int i = 1; i <= 7; i++) acc += texture2D(src, vUv - dir * m * float(i) / 7.0).rgb; c = acc / 8.0; }',
      '  c += (texture2D(b1, vUv).rgb * 0.85 + texture2D(b2, vUv).rgb * 0.7 + texture2D(b3, vUv).rgb * 0.55) * glow + texture2D(st, vUv).rgb * vec3(0.38, 0.6, 1.25) * stK;',
      '  if (raysK > 0.0) c += texture2D(raysT, vUv).rgb * sunC * raysK;',   // (v30) sun rays
      '  if (flK > 0.0) { vec2 asp = vec2(texel.y / texel.x, 1.0), toC = vec2(0.5) - sunUv, q2 = (vUv - sunUv) * asp; float dd = length(q2), vis = 0.0;',   // (v30) the lens flare
      '    for (int i = 0; i < 5; i++) { vec2 o = vec2(float(i - 2) * 0.006, float(i - 2) * 0.004 * float(i - 2)); vis += step(0.99999, texture2D(dT, clamp(sunUv + o, 0.001, 0.999)).x); } vis /= 5.0;',
      '    vec3 fl = ghost(vUv, sunUv + toC * 0.55, 0.035, vec3(1.0, 0.75, 0.4) * 0.16, asp) + ghost(vUv, sunUv + toC * 0.85, 0.07, vec3(0.4, 0.9, 0.7) * 0.07, asp) + ghost(vUv, sunUv + toC * 1.2, 0.025, vec3(0.9, 0.5, 1.0) * 0.14, asp)',
      '      + ghost(vUv, sunUv + toC * 1.5, 0.12, vec3(0.5, 0.6, 1.0) * 0.05, asp) + ghost(vUv, sunUv + toC * 1.95, 0.05, vec3(1.0, 0.6, 0.3) * 0.1, asp) + ghost(vUv, sunUv + toC * 2.35, 0.17, vec3(0.4, 0.8, 1.0) * 0.04, asp);',
      '    float burst = pow(abs(cos(atan(q2.y, q2.x) * 4.0)), 60.0) * exp(-dd * 9.0) * 0.4 + exp(-dd * 30.0) * 0.35 + exp(-abs(q2.y) * 160.0) * exp(-abs(q2.x) * 2.2) * 0.25;',
      '    c += (fl + vec3(burst)) * sunC * vis * flK; }',   // the glow; long blue lens streaks
      '  float L = dot(c, vec3(0.2126, 0.7152, 0.0722)); c *= mix(shT, hiT, smoothstep(0.02, 0.9, L)); c = max(mix(vec3(L), c, sat), vec3(0.0));',   // the grade
      '  float vig = 1.0 - e * 0.78; c *= vec3(1.03, 1.0, 0.97);',
      '  vec3 o = srgb(aces(c * expo * vig)); o = clamp((o - 0.5) * con + 0.5, 0.0, 1.0);',
      '  o += (hash(gl_FragCoord.xy * 0.731) - 0.5) * 0.026 * (1.0 - 0.55 * dot(o, vec3(0.333)));',   // fine grain, one per pixel
      '  gl_FragColor = vec4(o, 1.0); }'].join('\n') });
  // (v30, 29 Oct; the owner: "the ambient, the sun rays, lens flare, water reflections ... do the whole lot") worked out from the picture and its depth:
  //   AMBIENT OCCLUSION - soft shade in every crevice, under every tree and ledge, where a ship's parts meet (half size, then blurred keeping edges);
  //   REFLECTIONS - on the river, the lake and the pools, the cliffs and trees above them, traced through the picture (half size; the sky's own
  //   reflection where the trace finds nothing); SUN RAYS - light streaming out past the canyon's rims and the trees when the sun is near the view;
  //   a LENS FLARE - a burst, a streak and a line of ghosts across the picture while the sun itself is in view and not hidden.
  const VPOS = 'vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 p = projInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }';
  const ssaoMat = new THREE.ShaderMaterial({ uniforms: { tDepth: { value: null }, proj: { value: new THREE.Matrix4() }, projInv: { value: new THREE.Matrix4() }, rad: { value: 4 } }, vertexShader: vs, depthTest: false, depthWrite: false,
    fragmentShader: ['uniform sampler2D tDepth; uniform mat4 proj, projInv; uniform float rad; varying vec2 vUv;', VPOS,
      'float hsh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
      'void main(){ float d = texture2D(tDepth, vUv).x; if (d >= 0.99999) { gl_FragColor = vec4(1.0); return; }',
      '  vec3 P = vpos(vUv), N = normalize(cross(dFdx(P), dFdy(P))); if (dot(N, P) > 0.0) N = -N;',
      '  vec2 sr = vec2(proj[0][0], proj[1][1]) * 0.5 * rad / -P.z; sr = min(sr, vec2(0.08)); float occ = 0.0, a0 = hsh(gl_FragCoord.xy) * 6.283;',
      '  for (int i = 0; i < 12; i++) { float f = (float(i) + 0.5) / 12.0, a = a0 + float(i) * 2.399; vec3 S = vpos(vUv + vec2(cos(a), sin(a)) * sr * f); vec3 v = S - P; float l = length(v) + 1e-4;',
      '    occ += max(0.0, dot(N, v / l) - 0.12) * (1.0 - smoothstep(rad * 0.6, rad * 2.2, l)); }',
      '  gl_FragColor = vec4(vec3(clamp(1.0 - occ / 12.0 * 1.9, 0.0, 1.0)), 1.0); }'].join('\n') });
  const aoBlur = new THREE.ShaderMaterial({ uniforms: { src: { value: null }, tDepth: { value: null }, dir: { value: new THREE.Vector2() }, projInv: { value: new THREE.Matrix4() } }, vertexShader: vs, depthTest: false, depthWrite: false,
    fragmentShader: ['uniform sampler2D src, tDepth; uniform vec2 dir; uniform mat4 projInv; varying vec2 vUv;', VPOS,
      'void main(){ float z0 = vpos(vUv).z, s = 0.0, w = 0.0;',
      '  for (int i = -3; i <= 3; i++) { vec2 uv = vUv + dir * float(i); float k = exp(-float(i * i) / 8.0) * exp(-abs(vpos(uv).z - z0) / (0.02 * -z0 + 0.5)); s += texture2D(src, uv).r * k; w += k; }',
      '  gl_FragColor = vec4(vec3(s / w), 1.0); }'].join('\n') });
  const ssrMat = new THREE.ShaderMaterial({ uniforms: { tColor: { value: null }, tDepth: { value: null }, proj: { value: new THREE.Matrix4() }, projInv: { value: new THREE.Matrix4() }, upV: { value: new THREE.Vector3(0, 1, 0) }, t: { value: 0 } }, vertexShader: vs, depthTest: false, depthWrite: false,
    fragmentShader: ['uniform sampler2D tColor, tDepth; uniform mat4 proj, projInv; uniform vec3 upV; uniform float t; varying vec2 vUv;', VPOS,
      'void main(){ vec4 s0 = texture2D(tColor, vUv); if (s0.a > 0.75 || texture2D(tDepth, vUv).x >= 0.99999) { gl_FragColor = vec4(0.0); return; }',
      '  vec3 P = vpos(vUv), V = normalize(P), N = normalize(upV + 0.035 * vec3(sin(P.x * 0.31 + t) + sin(P.z * 0.53 - t * 1.3), 0.0, cos(P.z * 0.37 + t * 0.8) + cos(P.x * 0.61 + t)));',
      '  vec3 R = reflect(V, N), Q = P; float st = max(0.6, -P.z * 0.015), found = 0.0; vec3 hit = vec3(0.0);',
      '  for (int i = 0; i < 30; i++) { Q += R * st; st *= 1.1; vec4 c = proj * vec4(Q, 1.0); vec2 uv = c.xy / c.w * 0.5 + 0.5;',
      '    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 || Q.z > -0.5) break;',
      '    if (texture2D(tDepth, uv).x >= 0.99999) continue; vec3 S = vpos(uv);',
      '    if (S.z > Q.z && S.z - Q.z < st * 3.0 + 2.0) { hit = texture2D(tColor, uv).rgb; vec2 e = abs(uv * 2.0 - 1.0); found = (1.0 - smoothstep(0.8, 1.0, max(e.x, e.y))) * (1.0 - smoothstep(0.6, 1.0, float(i) / 30.0)); break; } }',
      '  float fr = 0.12 + 0.88 * pow(1.0 - max(dot(-V, N), 0.0), 4.0);',
      '  gl_FragColor = vec4(hit, found * clamp(fr, 0.0, 0.85)); }'].join('\n') });
  const raysMat = new THREE.ShaderMaterial({ uniforms: { tColor: { value: null }, tDepth: { value: null }, sun: { value: new THREE.Vector2() } }, vertexShader: vs, depthTest: false, depthWrite: false,
    fragmentShader: ['uniform sampler2D tColor, tDepth; uniform vec2 sun; varying vec2 vUv;',
      'void main(){ vec2 dl = (vUv - sun) / 48.0; vec2 uv = vUv; float w = 1.0; vec3 acc = vec3(0.0);',
      '  for (int i = 0; i < 48; i++) { if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) { float sky = step(0.99999, texture2D(tDepth, uv).x); vec3 c = texture2D(tColor, uv).rgb; acc += max(c - 1.05, vec3(0.0)) * sky * w; } w *= 0.962; uv -= dl; }',
      '  gl_FragColor = vec4(acc / 48.0, 1.0); }'].join('\n') });
  const SUNP = new THREE.Vector3(), SUNF = new THREE.Vector3();
  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); }
  function targets() {
    const w = W0, h = H0;
    if (rtScene && rtScene.width === w && rtScene.height === h) return;
    [rtScene, rtA, rtB, rtC, rtD, rtE, rtF, rtG, rtH].forEach((r) => r && r.dispose());
    rtScene = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 }); rtScene.depthTexture = new THREE.DepthTexture(w, h); rtScene.depthTexture.type = THREE.FloatType;   // (v30: its depth, for the occlusion, reflections, rays)
    [rtAO, rtAO2, rtR].forEach((r) => r && r.dispose()); rtAO = new THREE.WebGLRenderTarget(w >> 1, h >> 1, rtOpts); rtAO2 = new THREE.WebGLRenderTarget(w >> 1, h >> 1, rtOpts); rtR = new THREE.WebGLRenderTarget(w >> 1, h >> 1, rtOpts);
    rtA = new THREE.WebGLRenderTarget(w >> 1, h >> 1, rtOpts); rtB = new THREE.WebGLRenderTarget(w >> 1, h >> 1, rtOpts);
    rtC = new THREE.WebGLRenderTarget(w >> 2, h >> 2, rtOpts); rtD = new THREE.WebGLRenderTarget(w >> 2, h >> 2, rtOpts);
    rtE = new THREE.WebGLRenderTarget(w >> 2, h >> 3, rtOpts); rtF = new THREE.WebGLRenderTarget(w >> 2, h >> 3, rtOpts);   // (the lens streaks: wide and flat)
    rtG = new THREE.WebGLRenderTarget(Math.max(8, w >> 4), Math.max(8, h >> 4), rtOpts); rtH = new THREE.WebGLRenderTarget(Math.max(8, w >> 4), Math.max(8, h >> 4), rtOpts);   // (v22: a wide, soft third glow)
  }
  function composer() {
    if (low) {   // a slower PC: straight to the screen, the renderer's own tone mapping, no glow
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
      renderer.setRenderTarget(null); renderer.render(scene, cam); return;
    }
    renderer.toneMapping = THREE.NoToneMapping;
    targets();
    renderer.setRenderTarget(rtScene); renderer.render(scene, cam);
    bright.uniforms.src.value = rtScene.texture; pass(bright, rtA);
    blur.uniforms.src.value = rtA.texture; blur.uniforms.dir.value.set(1 / rtA.width, 0); pass(blur, rtB);
    blur.uniforms.src.value = rtB.texture; blur.uniforms.dir.value.set(0, 1 / rtA.height); pass(blur, rtA);
    blur.uniforms.src.value = rtA.texture; blur.uniforms.dir.value.set(0, 0); pass(blur, rtC);   // (a straight copy down to quarter size)
    blur.uniforms.src.value = rtC.texture; blur.uniforms.dir.value.set(1 / rtC.width, 0); pass(blur, rtD);
    blur.uniforms.src.value = rtD.texture; blur.uniforms.dir.value.set(0, 1 / rtC.height); pass(blur, rtC);
    blur.uniforms.src.value = rtC.texture; blur.uniforms.dir.value.set(0, 0); pass(blur, rtG);   // (v22) a sixteenth-size glow, blurred twice over: wide and filmic, for almost nothing
    [1.5, 3].forEach((k) => { blur.uniforms.src.value = rtG.texture; blur.uniforms.dir.value.set(k / rtG.width, 0); pass(blur, rtH); blur.uniforms.src.value = rtH.texture; blur.uniforms.dir.value.set(0, k / rtG.height); pass(blur, rtG); });
    if (final.uniforms.stK.value > 0) {   // anamorphic streaks: the glow drawn out sideways, three times wider each pass
      blur.uniforms.src.value = rtC.texture; blur.uniforms.dir.value.set(3 / rtE.width, 0); pass(blur, rtE);
      blur.uniforms.src.value = rtE.texture; blur.uniforms.dir.value.set(9 / rtE.width, 0); pass(blur, rtF);
      blur.uniforms.src.value = rtF.texture; blur.uniforms.dir.value.set(27 / rtE.width, 0); pass(blur, rtE);
    }
    {   // (v30) occlusion, reflections, sun rays, flare
      const U = final.uniforms, dt = rtScene.depthTexture, v = world === 'valley';
      [ssaoMat, ssrMat, aoBlur].forEach((m) => { if (m.uniforms.proj) m.uniforms.proj.value.copy(cam.projectionMatrix); m.uniforms.projInv.value.copy(cam.projectionMatrixInverse); m.uniforms.tDepth.value = dt; });
      ssaoMat.uniforms.rad.value = v ? 3.6 : 12; pass(ssaoMat, rtAO);
      aoBlur.uniforms.src.value = rtAO.texture; aoBlur.uniforms.dir.value.set(1 / rtAO.width, 0); pass(aoBlur, rtAO2);
      aoBlur.uniforms.src.value = rtAO2.texture; aoBlur.uniforms.dir.value.set(0, 1 / rtAO.height); pass(aoBlur, rtAO);
      U.aoT.value = rtAO.texture; U.aoK.value = 0.85;
      if (v) { ssrMat.uniforms.tColor.value = rtScene.texture; ssrMat.uniforms.upV.value.set(0, 1, 0).transformDirection(cam.matrixWorldInverse); ssrMat.uniforms.t.value = performance.now() * 0.0012; pass(ssrMat, rtR); U.ssrT.value = rtR.texture; U.ssrK.value = 1; } else U.ssrK.value = 0;
      cam.getWorldDirection(SUNF); const inFront = SUNF.dot(VSUN_SKY) > 0.05; SUNP.copy(cam.position).addScaledVector(VSUN_SKY, 5000).project(cam);
      const off = Math.max(Math.abs(SUNP.x), Math.abs(SUNP.y));
      U.raysK.value = v && inFront && !W_.noRays ? 0.55 * (1 - smooth(0.8, 1.7, off)) : 0; U.flK.value = v && inFront ? 1 - smooth(0.85, 1.02, off) : 0;
      U.sunUv.value.set(SUNP.x * 0.5 + 0.5, SUNP.y * 0.5 + 0.5); U.sunC.value.copy(sun.color); U.dT.value = dt;
      if (U.raysK.value > 0) { raysMat.uniforms.tColor.value = rtScene.texture; raysMat.uniforms.tDepth.value = dt; raysMat.uniforms.sun.value.copy(U.sunUv.value); pass(raysMat, rtD); U.raysT.value = rtD.texture; }
    }
    final.uniforms.seed.value = (final.uniforms.seed.value + 0.137) % 100;
    final.uniforms.src.value = rtScene.texture; final.uniforms.b1.value = rtA.texture; final.uniforms.b2.value = rtC.texture; final.uniforms.b3.value = rtG.texture; final.uniforms.st.value = rtE.texture;
    final.uniforms.texel.value.set(1 / W0, 1 / H0); final.uniforms.sharp.value = OW > W0 * 1.15 ? 0.55 : 0.3;   // (sharper when it is being brought up further)
    pass(final, null);
  }

  let OW = 0, OH = 0;
  function setSize(w, h, iw, ih) {   // the canvas at w x h; the 3D drawn at iw x ih inside it and brought up to it in the last pass (on the plain picture: drawn at iw x ih)
    iw = iw || w; ih = ih || h;
    const cw = low ? iw : w, ch = low ? ih : h;
    if (cw !== OW || ch !== OH) { OW = cw; OH = ch; renderer.setSize(cw, ch, false); }
    W0 = iw; H0 = ih;
  }
  let shadowN = 2048;
  function detail(lvl) {   // the sun's shadows: 4096 (sharp) or 2048
    const n = lvl >= 2 ? 4096 : 2048; if (n === shadowN) return; shadowN = n;
    sun.shadow.mapSize.set(n, n); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  function reset() {
    sprites.forEach((p) => { p.live = false; p.s.visible = false; }); debris.forEach((d) => { d.live = false; d.m.visible = false; }); BLAST.t = -1; rings.forEach((r) => { r.live = false; r.m.visible = false; });
    live.forEach((m) => { root.remove(m); pools[m.userData.kind].push(m); }); live.clear(); damage.length = 0;
    wrecks.forEach((m) => { const w = m.userData.wreck; if (w && w.tr) { w.tr.used = false; w.tr.m.visible = false; } m.userData.wreck = null; root.remove(m); pools[m.userData.kind].push(m); }); wrecks.length = 0;
    lifeReset();
    FBS.forEach((f) => { f.live = false; f.m.visible = false; }); PIECES.forEach((p) => { p.live = false; p.m.visible = false; if (p.tr) p.tr.m.visible = false; }); TRAILS.forEach((r) => { r.m.visible = false; r.pts.length = 0; });
  }
  function quality(isLow) { low = !!isLow; }
  // for the tests: the screen point the 3D camera puts a world point at (must match SREngine.project)
  function projectTest(W, x, y, z) { setProj(W.focal || FOCAL); const c = W.cam; cam.position.set(c.x, c.y, -c.z); cam.rotation.set(c.pitch, -c.yaw, -c.roll); cam.updateMatrixWorld(); const v = new THREE.Vector3(x, y, -z).project(cam); return { x: (v.x + 1) / 2 * (GW + 2 * OX) - OX, y: (1 - v.y) / 2 * GH }; }
  function setWide(ox) { if (Math.abs(ox - OX) > 0.01) { OX = ox; setProj(curFocal || FOCAL); } }
  return { canvas: renderer.domElement, setSize, setWide, render, onFx, reset, quality, detail, projectTest, renderer, debug: { sites: SITES, farm: FARM, bolts, cam, scene, lancer: LANCER, carrier: CARRIER, warship: WS, size: () => [W0, H0, OW, OH] } };
}
window.SR3D = createSR3D;
window.dispatchEvent(new Event('sr3d-ready'));
