// THE UNDERWATER VIEW'S WORDS (26 Sep 2026): the name of the nearest animal, over it, and a one-off
// note the first time the view opens. Called once a frame from main.js, after the scene is drawn,
// whatever drew it (the eFoil or a hub craft): it reads what the renderer ACTUALLY drew this frame
// (`isUnder`, the sea life's placements and the view-projection matrix), so it cannot name
// something that is not on screen. DOM only; never touches the sim.

import { SEALIFE_NAMES } from './gl/sealife.js';

export const ULABEL = Object.freeze({
  range: 5.5,      // m: name an animal only this close (the haze swallows it not far beyond)
  keep: 7,         // m: a named animal keeps its label out to here...
  switchBy: 1.0,   // ...unless another comes this much closer
  hintMs: 9000,
});

// The first-time note. Honest about the water: the game shows a clear day.
export const UNDER_HINT = 'Under Poole Bay: sand eels, bass, mullet, flounders, spider crabs and jellyfish'
  + ' - and, with luck, a cuttlefish or a thornback ray. Real visibility here is usually 2-4 m;'
  + ' this is a clear day.';
// On a phone the long note covered a third of the screen (26 Sep): the honest part, briefly.
export const UNDER_HINT_SHORT = 'Under Poole Bay. Real visibility is usually 2-4 m; this is a clear day.';

export function createUnderLabel(canvas) {
  const host = canvas && canvas.parentElement;
  if (!host) return () => {};
  const tag = document.createElement('div');
  tag.id = 'under-tag';
  tag.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,calc(-100% - 12px));pointer-events:none;'
    + 'font:600 14px/1.2 system-ui,sans-serif;color:#e8f4f2;text-shadow:0 1px 3px rgba(0,0,0,.8);'
    + 'white-space:nowrap;opacity:0;transition:opacity .25s;z-index:5';
  const hint = document.createElement('div');
  hint.id = 'under-hint';
  hint.style.cssText = 'position:absolute;left:50%;top:112px;transform:translateX(-50%);max-width:min(560px,90%);'
    + 'background:rgba(8,26,28,.82);border:1px solid rgba(160,220,210,.35);border-radius:12px;padding:8px 14px;'
    + 'font:500 13px/1.4 system-ui,sans-serif;color:#dff1ee;text-align:center;pointer-events:none;'
    + 'opacity:0;transition:opacity .3s;z-index:5';
  host.appendChild(tag); host.appendChild(hint);
  let cur = null, hinted = false, hintOff = 0;

  // `view`: the player chose the UNDER view (false while a duck-dive only dips the camera under).
  return function update(gl, view = true) {
    const clean = document.body.classList.contains('clean-render');
    const under = !!(gl && gl.isUnder && gl.under && gl.under.life) && !clean && view;
    if (under && !hinted) {
      hinted = true;
      hint.textContent = host.clientWidth < 600 ? UNDER_HINT_SHORT : UNDER_HINT;
      hint.style.opacity = '1'; hintOff = performance.now() + ULABEL.hintMs;
    }
    if (hintOff && (performance.now() > hintOff || !under)) { hint.style.opacity = '0'; hintOff = 0; }
    if (!under) { tag.style.opacity = '0'; cur = null; return; }
    const L = gl.under.life, near = L.near;
    // Hold the label on one animal: the nearest changes every frame inside a school.
    let pick = cur && L.nearestOf(cur);
    if (!pick || pick.d > ULABEL.keep || (near && near.name !== cur && near.d < pick.d - ULABEL.switchBy)) pick = near;
    if (!pick || pick.d > ULABEL.range) { tag.style.opacity = '0'; cur = null; return; }
    cur = pick.name;
    // Project a point just above it through the matrix the renderer drew with.
    const m = gl.vpM, x = pick.x, y = pick.y + 0.12, z = pick.z;
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (!(cw > 0.1)) { tag.style.opacity = '0'; return; }
    const nx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / cw, ny = (m[1] * x + m[5] * y + m[9] * z + m[13]) / cw;
    if (Math.abs(nx) > 0.95 || Math.abs(ny) > 0.95) { tag.style.opacity = '0'; return; }
    const r = canvas.getBoundingClientRect(), hr = host.getBoundingClientRect();
    tag.style.left = `${r.left - hr.left + (nx * 0.5 + 0.5) * r.width}px`;
    tag.style.top = `${r.top - hr.top + (0.5 - ny * 0.5) * r.height}px`;
    tag.textContent = SEALIFE_NAMES[pick.name] || pick.name;
    tag.style.opacity = '1';
  };
}
