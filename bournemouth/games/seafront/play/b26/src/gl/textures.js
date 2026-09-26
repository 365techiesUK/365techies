// Texture loading.
//
// The no-binary-assets rule was relaxed deliberately (see README). These are
// baked by tools/gen-textures.mjs and loaded HERE, asynchronously, after the
// renderer is already running - so a slow or failed fetch degrades to the
// untextured look rather than blocking the first frame. That is the whole
// reason the loader is async and the shader has an `uHasTex` switch.
//
// Total budget: ~420 KB across nine files, lazy-loaded behind the start gate
// that SPEC §7 already specifies, so the landing page never pays for them.

export const TEXTURES = {
  cliffAlbedo: 'assets/cliff-albedo.png',
  cliffNormal: 'assets/cliff-normal.png',
  sandAlbedo: 'assets/sand-albedo.png',
  sandNormal: 'assets/sand-normal.png',
  timberAlbedo: 'assets/timber-albedo.png',
  timberNormal: 'assets/timber-normal.png',
  concreteAlbedo: 'assets/concrete-albedo.png',
  concreteNormal: 'assets/concrete-normal.png',
  foam: 'assets/foam.png',
};

function upload(gl, img, srgb) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // Albedo is authored in sRGB and must be decoded on read, or everything
  // textured comes out visibly too bright against the linear lighting.
  gl.texImage2D(gl.TEXTURE_2D, 0, srgb ? gl.SRGB8_ALPHA8 : gl.RGBA8,
    img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  // Anisotropy matters more here than resolution does: the beach and the water
  // are seen at extreme grazing angles, where isotropic mips blur to mush.
  const ext = gl.getExtension('EXT_texture_filter_anisotropic');
  if (ext) {
    const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
  }
  return tex;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('failed to load ' + url));
    img.src = url;
  });
}

// ⚠️ MEASURED 19 Sep 2026: an <img> decodes on the MAIN THREAD, and nine of
// them decoding and uploading in one microtask produced a 476 ms long task -
// seen as a single 533 ms frame two frames into the run (src/perf.js boot
// timeline). The async loader kept its promise not to block the FIRST frame
// and then froze the SECOND one instead.
//
// createImageBitmap hands the decode to a browser worker thread, so only the
// upload is left on ours.
async function decodeOffThread(url) {
  if (typeof createImageBitmap === 'function' && typeof fetch === 'function') {
    const res = await fetch(url);
    if (!res.ok) throw new Error('failed to load ' + url);
    // premultiplyAlpha 'none' matches UNPACK_PREMULTIPLY_ALPHA_WEBGL=false,
    // which is what the <img> path used. Colour-space conversion is left at
    // the default on purpose: these PNGs are compared against reference
    // frames, and 'none' would quietly shift them.
    return createImageBitmap(await res.blob(), { premultiplyAlpha: 'none' });
  }
  return loadImage(url);                       // older browsers keep the old path
}

// One upload per animation frame. texImage2D + generateMipmap on a 1024px
// texture is a few ms each; nine in a row is a visible hitch, nine spread over
// nine frames is nothing. The timeout is the fallback for a hidden tab, where
// rAF never fires and the textures would otherwise never arrive.
function nextFrame() {
  return new Promise((resolve) => {
    let done = false;
    const go = () => { if (!done) { done = true; resolve(); } };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(go);
    setTimeout(go, 60);
  });
}

// Resolves to a { name: WebGLTexture } map. Rejects only if EVERY texture
// fails; a partial set still renders, with the missing ones falling back.
export async function loadTextures(gl, opts = {}) {
  const spread = opts.spread !== false;        // tests can ask for it all at once
  const out = {};

  // Fetch and decode all nine in parallel, off the main thread.
  const decoded = await Promise.all(Object.entries(TEXTURES).map(async ([name, url]) => {
    try { return [name, await decodeOffThread(url)]; } catch (e) {
      console.warn('[gl]', e.message);
      return [name, null];
    }
  }));

  // Then upload them one frame at a time.
  for (const [name, img] of decoded) {
    if (!img) continue;
    if (spread) await nextFrame();
    try {
      // Normal maps and the foam mask are DATA, not colour - they must not be
      // sRGB-decoded, or the surface normals come out wrong.
      out[name] = upload(gl, img, /Albedo$/.test(name));
    } catch (e) {
      console.warn('[gl]', name, e.message);
    }
    if (typeof img.close === 'function') img.close();   // release the bitmap now
  }

  const n = Object.keys(out).length;
  if (n === 0) throw new Error('[gl] no textures loaded');
  return { textures: out, loaded: n, expected: Object.keys(TEXTURES).length };
}

// GLSL shared by anything that samples a two-channel normal map.
export const NORMALMAP_GLSL = `
// Only X and Y are stored (see tools/gen-textures.mjs); Z is reconstructed.
vec3 unpackNormal(vec3 t) {
  vec2 xy = t.xy * 2.0 - 1.0;
  return vec3(xy, sqrt(max(0.0, 1.0 - dot(xy, xy))));
}
// Perturb a geometric normal by a tangent-space one without a real tangent
// frame. Good enough for surfaces whose UVs are world-planar, which all of
// these are.
vec3 perturb(vec3 N, vec3 tn, float amount) {
  vec3 up = abs(N.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 T = normalize(cross(up, N));
  vec3 B = cross(N, T);
  return normalize(N + (T * tn.x + B * tn.y) * amount);
}
`;
