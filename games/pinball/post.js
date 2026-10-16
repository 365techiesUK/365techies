/* 365 Pinball Hero - the one combined final pass (16 Oct 2026, the next-gen spectacle for Ember Peak).
 *
 * ONE full-screen draw that does the old OutputPass's job (tone mapping and the sRGB conversion, exactly as three.js's
 * OutputPass does them) and, in the same shader: up to 3 SHOCKWAVE rings (the screen bent outwards round a point,
 * weaker near the ball so it never looks out of place), a whole-table FLASH (fx.js keeps it to 3 a second, never red),
 * a VIGNETTE, a colour GRADE (saturation, and a warm lava glow that leans orange, never red) and a brief COLOUR-FRINGE
 * spike on big hits (radial, zero at the centre). Mobile GPUs pay for every full-screen pass, so it is all one.
 *
 * window.PinPost (a classic script; needs three.js handed to pass()):
 *   pass(THREE, renderer, opts?)  -> a pass for three.js's EffectComposer: use it INSTEAD of OutputPass, last in the chain
 *       (composer.addPass(PinPost.pass(THREE, renderer))). opts.tier: 'low' leaves out the colour fringe.
 *   update(t, fxState, opts?)  once a frame (t in ms): takes fxState.shocks (and empties it), reads fxState.flash,
 *       flashColor, post {fringe, vignette, warm, sat} and reduced. opts.project(x, y, z) -> {x, y}: a table point's place
 *       on screen, 0..1 from the bottom left (or null when it is off screen); opts.ball: {x, y} the ball's place, 0..1.
 *   shock(u, v, power)  a shockwave at a screen point (0..1 from the bottom left), for tests and stills.
 *   uniforms (for checks), version */
(function (root) {
  'use strict';
  var MAXS = 3, LIFE = 700;   // ms a ring lives (it runs out to about 0.75 of the screen's height)
  var VERT = [
    'precision highp float;',
    'uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;',
    'attribute vec3 position; attribute vec2 uv; varying vec2 vUv;',
    'void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
  ].join('\n');
  var FRAG = [
    'precision highp float;',
    'uniform sampler2D tDiffuse; uniform float uAspect; uniform vec4 uShock[3]; uniform vec3 uBall;',
    'uniform vec4 uFlash; uniform float uFringe; uniform float uVignette; uniform float uWarm; uniform float uSat;',
    '#include <tonemapping_pars_fragment>',
    '#include <colorspace_pars_fragment>',
    'varying vec2 vUv;',
    'void main() {',
    '  vec2 off = vec2(0.0);',
    '  for (int i = 0; i < 3; i++) {',
    '    vec4 s = uShock[i];',
    '    if (s.w > 0.0) {',
    '      vec2 d = vUv - s.xy; d.x *= uAspect; float r = length(d), x = (r - s.z) / 0.05;',
    '      float ring = x * exp(-x * x);',
    '      float nb = uBall.z > 0.5 ? smoothstep(0.03, 0.14, length((vUv - uBall.xy) * vec2(uAspect, 1.0))) : 1.0;',
    '      if (r > 0.0001) off += d / r * ring * s.w * 0.028 * nb;',
    '    }',
    '  }',
    '  off.x /= uAspect;',
    '  vec2 suv = clamp(vUv - off, 0.0, 1.0);',
    '  vec4 col = texture2D(tDiffuse, suv);',
    '#ifdef FRINGE',
    '  if (uFringe > 0.002) { vec2 cd = vUv - 0.5; vec2 k = cd * uFringe * 0.022 * dot(cd, cd) * 4.0;',
    '    col.r = texture2D(tDiffuse, clamp(suv + k, 0.0, 1.0)).r; col.b = texture2D(tDiffuse, clamp(suv - k, 0.0, 1.0)).b; }',
    '#endif',
    '  float l = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));',
    '  col.rgb = mix(vec3(l), col.rgb, uSat);',
    '  col.rgb *= mix(vec3(1.0), vec3(1.08, 1.0, 0.84), uWarm);',
    '  col.rgb += uFlash.rgb * uFlash.a;',
    '  gl_FragColor = col;',
    '#ifdef LINEAR_TONE_MAPPING',
    '  gl_FragColor.rgb = LinearToneMapping(gl_FragColor.rgb);',
    '#elif defined(REINHARD_TONE_MAPPING)',
    '  gl_FragColor.rgb = ReinhardToneMapping(gl_FragColor.rgb);',
    '#elif defined(CINEON_TONE_MAPPING)',
    '  gl_FragColor.rgb = CineonToneMapping(gl_FragColor.rgb);',
    '#elif defined(ACES_FILMIC_TONE_MAPPING)',
    '  gl_FragColor.rgb = ACESFilmicToneMapping(gl_FragColor.rgb);',
    '#elif defined(AGX_TONE_MAPPING)',
    '  gl_FragColor.rgb = AgXToneMapping(gl_FragColor.rgb);',
    '#elif defined(NEUTRAL_TONE_MAPPING)',
    '  gl_FragColor.rgb = NeutralToneMapping(gl_FragColor.rgb);',
    '#elif defined(CUSTOM_TONE_MAPPING)',
    '  gl_FragColor.rgb = CustomToneMapping(gl_FragColor.rgb);',
    '#endif',
    '#ifdef SRGB_TRANSFER',
    '  gl_FragColor = sRGBTransferOETF(gl_FragColor);',
    '#endif',
    '  vec2 vq = (vUv - 0.5) * 2.0;',
    '  gl_FragColor.rgb *= 1.0 - uVignette * smoothstep(0.45, 1.35, length(vq));',
    '}'
  ].join('\n');

  var U = null, rings = [], tierName = 'medium';
  function hexLin(c) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(String(c || '#ffffff'));
    var f = function (h) { var v = parseInt(h, 16) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return m ? [f(m[1]), f(m[2]), f(m[3])] : [1, 1, 1];
  }
  function makePass(THREE, renderer, opts) {
    opts = opts || {};
    tierName = opts.tier || 'medium';
    U = {
      tDiffuse: { value: null }, toneMappingExposure: { value: 1 }, uAspect: { value: 1 },
      uShock: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] }, uBall: { value: new THREE.Vector3(0.5, 0.2, 0) },
      uFlash: { value: new THREE.Vector4(1, 1, 1, 0) }, uFringe: { value: 0 }, uVignette: { value: 0.18 }, uWarm: { value: 0 }, uSat: { value: 1 }
    };
    var mat = new THREE.RawShaderMaterial({ name: 'PinPost', uniforms: U, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false });
    var cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    var seenCS = null, seenTM = null;
    var pass = {
      isPinPost: true, enabled: true, needsSwap: true, clear: false, renderToScreen: false, material: mat, uniforms: U,
      setSize: function (w, h) { U.uAspect.value = h > 0 ? w / h : 1; },
      render: function (r, writeBuffer, readBuffer) {
        U.tDiffuse.value = readBuffer.texture;
        U.toneMappingExposure.value = r.toneMappingExposure;
        if (seenCS !== r.outputColorSpace || seenTM !== r.toneMapping) {   // (the same defines OutputPass uses)
          seenCS = r.outputColorSpace; seenTM = r.toneMapping;
          var d = {};
          if (THREE.ColorManagement.getTransfer(seenCS) === THREE.SRGBTransfer) d.SRGB_TRANSFER = '';
          var tm = { LINEAR_TONE_MAPPING: THREE.LinearToneMapping, REINHARD_TONE_MAPPING: THREE.ReinhardToneMapping, CINEON_TONE_MAPPING: THREE.CineonToneMapping,
            ACES_FILMIC_TONE_MAPPING: THREE.ACESFilmicToneMapping, AGX_TONE_MAPPING: THREE.AgXToneMapping, NEUTRAL_TONE_MAPPING: THREE.NeutralToneMapping, CUSTOM_TONE_MAPPING: THREE.CustomToneMapping };
          for (var k in tm) if (tm[k] === seenTM) d[k] = '';
          if (tierName !== 'low') d.FRINGE = '';
          mat.defines = d; mat.needsUpdate = true;
        }
        r.setRenderTarget(this.renderToScreen ? null : writeBuffer);
        if (!this.renderToScreen && this.clear) r.clear();
        r.render(quad, cam);
      },
      dispose: function () { mat.dispose(); quad.geometry.dispose(); }
    };
    return pass;
  }
  function addRing(u, v, power, t) {
    if (!(power > 0)) return;
    if (rings.length >= MAXS) { rings.sort(function (a, b) { return a.power * (1 - (t - a.t0) / LIFE) - b.power * (1 - (t - b.t0) / LIFE); }); rings.shift(); }
    rings.push({ u: u, v: v, power: Math.min(1.2, power), t0: t });
  }
  var lastT = 0;
  function update(t, fx, opts) {
    t = +t || 0; lastT = t;
    if (!U) return;
    opts = opts || {};
    var red = fx && fx.reduced;
    if (fx && fx.shocks && fx.shocks.length) {
      for (var i = 0; i < fx.shocks.length; i++) {
        var s = fx.shocks[i], p = opts.project ? opts.project(s.x, s.y, s.z || 0) : null;
        if (p && !red) addRing(p.x, p.y, s.power, t);
      }
      fx.shocks.length = 0;
    }
    for (i = rings.length - 1; i >= 0; i--) if (t - rings[i].t0 >= LIFE || t < rings[i].t0 || red) rings.splice(i, 1);
    for (i = 0; i < MAXS; i++) {
      var q = U.uShock.value[i], r = rings[i];
      if (!r) { q.set(0, 0, 0, 0); continue; }
      var f = (t - r.t0) / LIFE;
      q.set(r.u, r.v, 0.06 + 0.72 * (1 - Math.pow(1 - f, 2)), r.power * Math.pow(1 - f, 1.5));
    }
    U.uBall.value.set(opts.ball ? opts.ball.x : 0.5, opts.ball ? opts.ball.y : 0.5, opts.ball ? 1 : 0);
    var post = fx && fx.post || {}, fl = fx && fx.flash > 0 && !red ? Math.min(1, fx.flash) : 0, c = hexLin(fx && fx.flashColor);
    U.uFlash.value.set(c[0], c[1], c[2], fl * 0.35);
    U.uFringe.value = red ? 0 : Math.max(0, Math.min(1, +post.fringe || 0));
    U.uVignette.value = Math.max(0, Math.min(0.8, post.vignette == null ? 0.18 : +post.vignette));
    U.uWarm.value = Math.max(0, Math.min(0.8, +post.warm || 0));
    U.uSat.value = Math.max(0.3, Math.min(1.4, post.sat == null ? 1 : +post.sat));
  }
  var api = {
    pass: makePass, update: update,
    shock: function (u, v, power) { addRing(u, v, power, lastT); },
    get uniforms() { return U; },
    rings: function () { return rings.slice(); },
    version: 1
  };
  root.PinPost = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
