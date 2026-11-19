/* 365 Pinball Hero - GPU particles and voxel debris (16 Oct 2026, the next-gen spectacle for Ember Peak).
 *
 * Stateless particles: each one's position is a formula of its spawn time, start, velocity and kind, worked out in the
 * vertex shader. JavaScript only writes new spawn records into a ring buffer (a partial buffer upload) when a burst
 * starts; nothing per particle runs in JavaScript each frame. Bounces on the playfield (a flat plane) are worked out in
 * the shader too. Rock debris is the same idea with instanced cubes that tumble, bounce and shrink away.
 *
 * window.PinParticles (a classic script; needs three.js handed to attach()):
 *   attach(THREE, scene, tableGroup, tier, opts?)  builds the meshes inside tableGroup (so they move with the table) -
 *       tier 'high' | 'medium' | 'low' (budgets 40k / 8k / 2k live particles, 5k / 2k / 600 debris cubes; MEDIUM is the
 *       phone default). opts.origin: [cx, cy], the table point at the group's (0, 0, 0) (default [135, 223], world3d's
 *       wx/wz today; setOrigin() changes it). Returns the API. Attaching again throws the old meshes away.
 *   burst({ x, y, z, kind, n, color, power, dir })  kind 'lava' | 'sparks' | 'steam' | 'ash' | 'debris' | 'confetti'.
 *       Table units (y down the table, z up). n is for the MEDIUM tier (x3 on high, x0.3 on low); power scales speeds
 *       (1 = normal); dir [dx, dy, dz] leans the burst that way. Returns how many were spawned.
 *   update(dt, fxState?)  dt in seconds (0 while paused). With PinFX.state it also takes fxState.bursts (and empties
 *       it) and dims the steam and ash with the table's light (fxState.gi). Call once a frame, before rendering.
 *   warm(renderer, camera)  compiles the shaders ahead (during attract), so the first eruption never stutters.
 *   setOrigin(cx, cy), setTier(tier), clear(), stats() -> { tier, live, cap, cubes, spawned }, dispose()
 * Colours: additive for lava and sparks (they glow and bloom), alpha-blended for steam, ash and confetti (ash is dark,
 * and additive can only brighten). Our own shaders, no library. */
(function (root) {
  'use strict';
  var TIERS = { high: { pts: 40000, cubes: 5000, k: 3, gain: 0.6 }, medium: { pts: 8000, cubes: 2000, k: 1, gain: 1 }, low: { pts: 2000, cubes: 600, k: 0.3, gain: 1.35 } };   // gain: more, dimmer glowing particles on high (so a dense fountain stays orange, not white)
  // each kind: which mesh, gravity (table units/s^2, + pulls down; - rises), drag (1/s, sideways), bounce, life (s),
  // size (units), sideways speed, upward speed, growth over its life, and its colour ramp in the shader (look)
  var KINDS = {
    lava:     { mesh: 'add', g: 480, drag: 0.5, bounce: 0.22, life: [1.0, 2.0], size: [3.0, 6.0], sp: [18, 90], up: [110, 270], grow: -0.4, look: 0, color: '#ff8a1e' },
    sparks:   { mesh: 'add', g: 430, drag: 1.6, bounce: 0.45, life: [0.3, 0.85], size: [0.8, 1.7], sp: [60, 210], up: [40, 200], grow: -0.6, look: 1, color: '#ffd27a' },
    steam:    { mesh: 'alpha', g: -55, drag: 1.5, bounce: 0, life: [0.9, 2.0], size: [4.0, 8.0], sp: [5, 26], up: [40, 120], grow: 2.4, look: 2, color: '#b8c0cc' },   // (steam in a dim arcade, not daylight: '#eef8ff' -> '#b8c0cc', 30 Oct 2026)
    ash:      { mesh: 'alpha', g: -22, drag: 0.8, bounce: 0, life: [1.6, 3.2], size: [3.0, 7.0], sp: [8, 42], up: [25, 85], grow: 1.6, look: 3, color: '#6a6670' },
    confetti: { mesh: 'alpha', g: 150, drag: 2.3, bounce: 0.2, life: [1.2, 2.3], size: [1.4, 2.4], sp: [40, 140], up: [120, 280], grow: 0, look: 4, color: null },
    debris:   { mesh: 'cube', g: 600, drag: 0.45, bounce: 0.35, life: [0.6, 1.1], size: [2.0, 4.4], sp: [40, 150], up: [90, 230], grow: 0, look: 5, color: '#6a6070' }
  };
  var LOOK = ['lava', 'sparks', 'steam', 'ash', 'confetti', 'debris'];
  var CONFETTI = ['#ffd84a', '#2ee6d6', '#ff5cc8', '#5cff6b', '#59b4ff', '#ff9a2e'];

  var GLSL_MOTION = [
    'uniform float uTime; uniform vec2 uOrigin; uniform vec4 uK[6];',
    // where a particle is at age a: drag sideways; gravity and one bounce off the playfield (z = 0) up and down
    'vec3 motion(vec3 p0, vec3 v0, float a, float kind, float seed, out float landed) {',
    '  vec4 K = uK[int(kind + 0.5)]; float g = K.x, dr = K.y, bo = K.z;',
    '  float dd = dr > 0.001 ? (1.0 - exp(-dr * a)) / dr : a;',
    '  vec2 xy = p0.xy + v0.xy * dd; float z; landed = 0.0;',
    '  if (g > 0.0) {',
    '    float tb = (v0.z + sqrt(v0.z * v0.z + 2.0 * g * max(p0.z, 0.0))) / g;',
    '    if (a < tb) z = p0.z + v0.z * a - 0.5 * g * a * a;',
    '    else { float v2 = (g * tb - v0.z) * bo, a2 = a - tb; z = max(0.0, v2 * a2 - 0.5 * g * a2 * a2); landed = 1.0;',
    '      float db = dr > 0.001 ? (1.0 - exp(-dr * tb)) / dr : tb; xy = p0.xy + v0.xy * (db + (dd - db) * 0.35); }',
    '  } else {',
    '    z = p0.z + v0.z * dd - 0.5 * g * a * a;',
    '    xy += vec2(sin(a * 2.7 + seed * 6.28), cos(a * 2.1 + seed * 4.1)) * a * 5.0;',
    '  }',
    '  return vec3(xy.x - uOrigin.x, z, xy.y - uOrigin.y);',
    '}'
  ].join('\n');

  var P_VERT = [
    'attribute vec3 aP0; attribute vec3 aV0; attribute vec4 aT; attribute vec4 aC;',
    'uniform float uViewH; uniform float uLight; uniform float uGain;',
    'varying vec3 vC; varying float vA; varying float vSq;',
    GLSL_MOTION,
    'void main() {',
    '  float a = uTime - aT.x, life = aT.y;',
    '  if (a < 0.0 || a > life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; return; }',
    '  float kind = aT.w, f = a / life, landed;',
    '  vec3 p = motion(aP0, aV0, a, kind, aC.w, landed);',
    '  vec4 K = uK[int(kind + 0.5)];',
    '  float s = aT.z * max(0.15, 1.0 + K.w * f);',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  gl_Position = projectionMatrix * mv;',
    '  gl_PointSize = clamp(s * projectionMatrix[1][1] * uViewH * 0.5 / max(1.0, -mv.z), 1.0, 64.0);',
    '  vSq = 0.0; float k = kind;',
    '  if (k < 0.5) {   // lava: white-hot, then its orange, cooling darker as it lands',
    '    vec3 hot = vec3(1.0, 0.72, 0.3);',
    '    vC = mix(hot, aC.rgb, smoothstep(0.0, 0.2, f)) * mix(2.4, 0.8, f) * (1.0 - 0.4 * landed) * uGain; vA = pow(1.0 - f, 1.1);',
    '  } else if (k < 1.5) { vC = aC.rgb * 2.6 * uGain; vA = pow(1.0 - f, 1.4); }',
    '  else if (k < 2.5) { vC = aC.rgb * uLight; vA = 0.5 * smoothstep(0.0, 0.1, f) * (1.0 - f); }',
    '  else if (k < 3.5) { vC = aC.rgb * (0.6 + 0.4 * uLight); vA = 0.6 * smoothstep(0.0, 0.12, f) * (1.0 - f * f); }',
    '  else { vC = aC.rgb * uLight * (0.55 + 0.45 * abs(sin(a * 13.0 + aC.w * 40.0))); vA = 1.0 - smoothstep(0.75, 1.0, f); vSq = 1.0; }',
    '}'
  ].join('\n');
  var P_FRAG = [
    'varying vec3 vC; varying float vA; varying float vSq;',
    'void main() {',
    '  vec2 d = gl_PointCoord - 0.5; float m;',
    '  if (vSq > 0.5) m = step(max(abs(d.x), abs(d.y * 1.6)), 0.42);',
    '  else { float r = dot(d, d) * 4.0; if (r > 1.0) discard; m = (1.0 - r) * exp(-r * 2.0); }',
    '  if (m * vA < 0.004) discard;',
    '  gl_FragColor = vec4(vC, vA * m);',
    '}'
  ].join('\n');
  var C_VERT = [
    'attribute vec3 iP0; attribute vec3 iV0; attribute vec4 iT; attribute vec4 iAx; attribute vec4 iC;',
    'uniform float uLight;',
    'varying vec3 vC;',
    GLSL_MOTION,
    'vec3 rot(vec3 v, vec3 ax, float an) { float c = cos(an), s = sin(an); return v * c + cross(ax, v) * s + ax * dot(ax, v) * (1.0 - c); }',
    'void main() {',
    '  float a = uTime - iT.x, life = iT.y;',
    '  if (a < 0.0 || a > life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vC = vec3(0.0); return; }',
    '  float f = a / life, landed;',
    '  vec3 c = motion(iP0, iV0, a, 5.0, iAx.w, landed);',
    '  float s = iT.z * (1.0 - smoothstep(0.7, 1.0, f));',
    '  float an = iT.w * (landed > 0.5 ? min(a, 0.4 + a * 0.15) : a);',
    '  vec3 ax = normalize(iAx.xyz);',
    '  vec3 p = c + rot(position * s, ax, an); p.y += s * 0.5;',
    '  vec3 n = normalize(rot(normal, ax, an));',
    '  float diff = max(0.0, dot(n, normalize(vec3(0.3, 1.0, 0.45))));',
    '  vC = iC.rgb * (0.3 + 0.75 * diff) * uLight + vec3(1.6, 0.55, 0.12) * iC.w * max(0.0, 1.0 - f * 1.8);',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
    '}'
  ].join('\n');
  var C_FRAG = 'varying vec3 vC;\nvoid main() { gl_FragColor = vec4(vC, 1.0); }';

  var THREE = null, group = null, tierName = 'medium', origin = [135, 223];
  var meshes = {}, now = 0, spawned = 0, ends = [], uniforms = null;

  function hex(c, out) {   // '#rrggbb' -> linear-ish 0..1 rgb (sRGB decoded, as three.js colours are)
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(String(c || '#ffffff'));
    var f = function (h) { var v = parseInt(h, 16) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    out[0] = m ? f(m[1]) : 1; out[1] = m ? f(m[2]) : 1; out[2] = m ? f(m[3]) : 1;
    return out;
  }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // a ring buffer of spawn records: { geo, attrs: {name: [array, itemSize]}, cap, head, lo, hi (the dirty range this frame) }
  function ring(geo, defs, cap, instanced) {
    var r = { geo: geo, cap: cap, head: 0, lo: Infinity, hi: -1, wrap: false, a: {}, total: 0 };
    defs.forEach(function (d) {
      var arr = new Float32Array(cap * d[1]);
      var at = instanced ? new THREE.InstancedBufferAttribute(arr, d[1]) : new THREE.BufferAttribute(arr, d[1]);
      at.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(d[0], at);
      r.a[d[0]] = at;
    });
    for (var k = 0, T = r.a.aT || r.a.iT; k < cap; k++) T.array[k * 4] = -1e9;   // every slot starts long dead
    return r;
  }
  function slot(r) {
    var i = r.head;
    r.head = (r.head + 1) % r.cap; r.total++;
    if (r.head === 0) r.wrap = true;
    if (i < r.lo) r.lo = i;
    if (i > r.hi) r.hi = i;
    return i;
  }
  function flush(r) {
    if (r.hi < 0) return;
    var lo = r.wrap ? 0 : r.lo, hi = r.wrap ? r.cap - 1 : r.hi;
    for (var k in r.a) {
      var at = r.a[k], n = at.itemSize;
      if (at.clearUpdateRanges) { at.clearUpdateRanges(); at.addUpdateRange(lo * n, (hi - lo + 1) * n); }
      at.needsUpdate = true;
    }
    r.lo = Infinity; r.hi = -1; r.wrap = false;
  }

  function build() {
    var T = TIERS[tierName] || TIERS.medium;
    uniforms = {
      uTime: { value: now }, uOrigin: { value: new THREE.Vector2(origin[0], origin[1]) }, uViewH: { value: 800 }, uLight: { value: 1 }, uGain: { value: T.gain || 1 },
      uK: { value: LOOK.map(function (k) { var d = KINDS[k]; return new THREE.Vector4(d.g, d.drag, d.bounce, d.grow); }) }
    };
    function points(name, cap, blending) {
      var geo = new THREE.BufferGeometry();
      var r = ring(geo, [['aP0', 3], ['aV0', 3], ['aT', 4], ['aC', 4]], cap, false);
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 3), 3));   // (unused, three.js wants one)
      geo.setDrawRange(0, 0);
      var mat = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: P_VERT, fragmentShader: P_FRAG, transparent: true, depthWrite: false, blending: blending });
      var m = new THREE.Points(geo, mat); m.frustumCulled = false; m.renderOrder = blending === THREE.AdditiveBlending ? 16 : 14; m.visible = false;
      m.onBeforeRender = function (renderer) { var v = renderer.getDrawingBufferSize ? renderer.getDrawingBufferSize(tmpV2) : null; uniforms.uViewH.value = v ? v.y : 800; };
      group.add(m);
      meshes[name] = { mesh: m, ring: r, last: -1e9 };
    }
    var tmpV2 = new THREE.Vector2();
    points('add', Math.round(T.pts * 0.6), THREE.AdditiveBlending);
    points('alpha', T.pts - Math.round(T.pts * 0.6), THREE.NormalBlending);
    // the debris: instanced cubes
    var box = new THREE.BoxGeometry(1, 1, 1), geo = new THREE.InstancedBufferGeometry();
    geo.index = box.index; geo.setAttribute('position', box.getAttribute('position')); geo.setAttribute('normal', box.getAttribute('normal'));
    var r = ring(geo, [['iP0', 3], ['iV0', 3], ['iT', 4], ['iAx', 4], ['iC', 4]], T.cubes, true);
    geo.instanceCount = 0;
    var mat = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: C_VERT, fragmentShader: C_FRAG });
    var cm = new THREE.Mesh(geo, mat); cm.frustumCulled = false; cm.renderOrder = 12; cm.visible = false;
    group.add(cm);
    meshes.cube = { mesh: cm, ring: r, last: -1e9 };
    box.dispose();
  }
  function dispose() {
    Object.keys(meshes).forEach(function (k) { var m = meshes[k].mesh; if (m.parent) m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); });
    meshes = {}; ends = [];
  }

  var tmpC = [0, 0, 0];
  function burst(o) {
    if (!THREE || !o) return 0;
    var K = KINDS[o.kind]; if (!K) return 0;
    var T = TIERS[tierName] || TIERS.medium, M = meshes[K.mesh]; if (!M) return 0;
    var n = Math.round((o.n || 0) * T.k); if (o.n > 0 && n < 1) n = 1;
    n = Math.min(n, Math.floor(M.ring.cap / 2));
    if (!n) return 0;
    var pw = o.power || 1, dir = o.dir || null, x = +o.x || 0, y = +o.y || 0, z = +o.z || 0, r = M.ring, A = r.a, cube = K.mesh === 'cube';
    var base = hex(o.color || K.color || '#ffffff', [0, 0, 0]), hot = o.hot != null ? o.hot : cube && pw >= 1.2 ? 0.8 : 0, maxLife = 0;
    for (var i = 0; i < n; i++) {
      var s = slot(r), an = Math.random() * Math.PI * 2, sp = rand(K.sp[0], K.sp[1]) * pw, up = rand(K.up[0], K.up[1]) * (0.55 + 0.45 * pw), life = rand(K.life[0], K.life[1]) * (0.8 + 0.2 * pw);
      var vx = Math.cos(an) * sp, vy = Math.sin(an) * sp, vz = up;
      if (dir) { vx += dir[0] * sp; vy += dir[1] * sp; vz += (dir[2] || 0) * up; }
      var jit = rand(-0.5, 0.5), cr, cg, cb;
      if (o.kind === 'confetti' && !o.color) { hex(CONFETTI[(Math.random() * CONFETTI.length) | 0], tmpC); cr = tmpC[0]; cg = tmpC[1]; cb = tmpC[2]; }
      else if (o.kind === 'lava') { cr = base[0]; cg = base[1] * (1 + jit * 0.6); cb = base[2] * (1 + jit); }
      else { var l = 1 + jit * 0.25; cr = base[0] * l; cg = base[1] * l; cb = base[2] * l; }
      var P0 = cube ? A.iP0 : A.aP0, V0 = cube ? A.iV0 : A.aV0, TT = cube ? A.iT : A.aT;
      P0.array[s * 3] = x + rand(-1.5, 1.5); P0.array[s * 3 + 1] = y + rand(-1.5, 1.5); P0.array[s * 3 + 2] = z;
      V0.array[s * 3] = vx; V0.array[s * 3 + 1] = vy; V0.array[s * 3 + 2] = vz;
      TT.array[s * 4] = now; TT.array[s * 4 + 1] = life; TT.array[s * 4 + 2] = rand(K.size[0], K.size[1]);
      if (cube) {
        TT.array[s * 4 + 3] = rand(4, 14) * (Math.random() < 0.5 ? -1 : 1);
        A.iAx.array[s * 4] = rand(-1, 1); A.iAx.array[s * 4 + 1] = rand(-1, 1); A.iAx.array[s * 4 + 2] = rand(-1, 1) + 0.01; A.iAx.array[s * 4 + 3] = Math.random();
        A.iC.array[s * 4] = cr; A.iC.array[s * 4 + 1] = cg; A.iC.array[s * 4 + 2] = cb; A.iC.array[s * 4 + 3] = hot;
      } else {
        TT.array[s * 4 + 3] = K.look;
        A.aC.array[s * 4] = cr; A.aC.array[s * 4 + 1] = cg; A.aC.array[s * 4 + 2] = cb; A.aC.array[s * 4 + 3] = Math.random();
      }
      if (life > maxLife) maxLife = life;
    }
    M.last = Math.max(M.last, now + maxLife);
    spawned += n;
    ends.push({ end: now + maxLife, n: n });
    return n;
  }

  function update(dt, fx) {
    if (!THREE || !uniforms) return;
    dt = +dt || 0; if (dt < 0) dt = 0; if (dt > 0.1) dt = 0.1;
    now += dt;
    uniforms.uTime.value = now;
    if (fx) {
      if (fx.bursts && fx.bursts.length) { for (var i = 0; i < fx.bursts.length; i++) burst(fx.bursts[i]); fx.bursts.length = 0; }
      var gi = fx.gi == null ? 1 : +fx.gi;
      uniforms.uLight.value = 0.3 + 0.7 * Math.min(1.25, Math.max(0, gi));
    }
    Object.keys(meshes).forEach(function (k) {
      var M = meshes[k], r = M.ring, live = M.last > now;
      flush(r);
      M.mesh.visible = live;   // (nothing alive: nothing drawn, so it costs nothing between bursts)
      var cnt = Math.min(r.cap, r.total);
      if (k === 'cube') M.mesh.geometry.instanceCount = live ? cnt : 0; else M.mesh.geometry.setDrawRange(0, live ? cnt : 0);
    });
    while (ends.length && ends[0].end < now) ends.shift();
  }

  var api = {
    TIERS: TIERS, KINDS: KINDS,
    attach: function (three, scene, tableGroup, tier, opts) {
      if (THREE) dispose();
      THREE = three; group = tableGroup || scene; tierName = TIERS[tier] ? tier : 'medium';
      if (opts && opts.origin) origin = [opts.origin[0], opts.origin[1]];
      spawned = 0; now = 0;
      build();
      return api;
    },
    burst: burst, update: update,
    setOrigin: function (cx, cy) { origin = [cx, cy]; if (uniforms) uniforms.uOrigin.value.set(cx, cy); },
    setTier: function (tier) { if (!THREE || !TIERS[tier] || tier === tierName) return; dispose(); tierName = tier; build(); },
    clear: function () { Object.keys(meshes).forEach(function (k) { meshes[k].last = -1e9; meshes[k].mesh.visible = false; }); ends = []; now += 100; if (uniforms) uniforms.uTime.value = now; },
    warm: function (renderer, camera) {
      if (!renderer || !THREE) return;
      Object.keys(meshes).forEach(function (k) { meshes[k].mesh.visible = true; });
      try { if (renderer.compile) renderer.compile(group, camera); } catch (e) {}
      Object.keys(meshes).forEach(function (k) { meshes[k].mesh.visible = meshes[k].last > now; });
    },
    stats: function () {
      var live = 0; ends.forEach(function (e) { if (e.end > now) live += e.n; });
      var T = TIERS[tierName] || TIERS.medium;
      return { tier: tierName, live: Math.min(live, T.pts + T.cubes), cap: T.pts, cubes: T.cubes, spawned: spawned };
    },
    dispose: function () { dispose(); THREE = null; uniforms = null; },
    version: 1
  };
  root.PinParticles = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
