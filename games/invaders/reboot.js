/* 365 Invaders - the REBOOT switch (9 Oct 2026). Enhanced games are drawn in 3D (world3d.js) with the scores and banners
 * on top (enhanced.js, overlay mode). R - or the 2D | 3D button on the screen (phones, tablets, the mouse) - swings the
 * picture between flat and 3D, live, mid-game: the same moment of the same game, both ways. No WebGL: the flat picture,
 * as before. ?look=flat starts flat (for recordings of the switch). */
import { createWorld } from './world3d.js?v=12';

const X = window.InvEnh, Q = new URLSearchParams(location.search);
// ?film=3840x2160 (for the 4K film): the 3D world drawn wide on its own canvas over the page - true 16:9, the sky filling
// the sides, no scores - so a capture can take it whole. Off unless asked for.
const FILM = /^(\d+)x(\d+)$/.exec(Q.get('film') || '');
let filmCv = null, filmG = null;
if (FILM) {
  filmCv = document.createElement('canvas'); filmCv.id = 'film'; filmCv.width = +FILM[1]; filmCv.height = +FILM[2];
  filmCv.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:99999;background:#000';
  document.body.appendChild(filmCv); filmG = filmCv.getContext('2d');
}
const DUR = 1300;   // ms for the swing
let world = null, tried = false, look = Q.get('look') === 'flat' ? 0 : 1, target = look, from = look, t0 = 0;
function get() {
  if (!tried) { tried = true; try { world = createWorld(); } catch (e) { world = null; if (window.console) console.info('365 Invaders: no WebGL here - the flat picture', e && e.message); } }
  return world;
}
function lookAt(t) {
  if (look === target) return look;
  if (!t0) t0 = t;
  const k = Math.min(1, Math.max(0, (t - t0) / DUR));
  look = from + (target - from) * k;
  if (k >= 1) look = target;
  return look;
}

// ---------------------------------------------------------------- full screen on a phone (11 Oct 2026; arcade.js immersive())
// The 3D world fills the whole phone screen: the playfield under the game screen exactly as before (the shots, the
// touches and the scores all line up), the stars, the planet and the hyperspace jumps carrying on all round it. The
// game screen above it is see-through, with the scores on it; a big moment's flash goes over the whole screen.
let washA = null, washB = null;
function fullBits(stage) {
  if (!washA) {
    const st = document.createElement('style');
    st.textContent = '.bg3d{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:block}'
      + 'body.full3d.immersive #screen{background:transparent;box-shadow:none}'
      + '.wash3d{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0;mix-blend-mode:screen}';
    document.head.appendChild(st);
    washA = document.createElement('div'); washA.className = 'wash3d'; washB = document.createElement('div'); washB.className = 'wash3d';
  }
  if (washA.parentNode !== stage) { stage.appendChild(washA); stage.appendChild(washB); }
}
function fullOff(wd) {
  if (wd && wd.canvas.parentNode) wd.canvas.remove();
  if (washA && washA.parentNode) { washA.remove(); washB.remove(); }
  document.body.classList.remove('full3d');
}

// ---------------------------------------------------------------- the 2D | 3D button, over the top right of the screen
let btn = null, shown = false;
function button() {
  if (btn) return btn;
  const wrap = document.getElementById('screenwrap'); if (!wrap) return null;
  const st = document.createElement('style');
  st.textContent = '#inv3dBtn{position:absolute;right:2.2%;top:6.3%;z-index:5;display:flex;align-items:stretch;padding:0;border:2px solid rgba(110,230,255,.75);border-radius:999px;'
    + 'background:rgba(6,8,30,.72);color:#9fb0d8;font:700 clamp(10px,2.7vmin,15px)/1 "Archivo",system-ui,sans-serif;letter-spacing:.06em;cursor:pointer;overflow:hidden;'
    + 'box-shadow:0 0 12px rgba(80,210,255,.35);-webkit-tap-highlight-color:transparent;touch-action:manipulation}'
    + '#inv3dBtn span{padding:.42em .7em}#inv3dBtn .on{background:linear-gradient(180deg,#5fe8ff,#2aa8e0);color:#04101e}'
    + '#inv3dBtn:focus-visible{outline:3px solid #ffd84a;outline-offset:2px}#inv3dBtn[hidden]{display:none}'
    + '@media (pointer:coarse){#inv3dBtn{font-size:clamp(12px,3.4vmin,17px)}}';
  document.head.appendChild(st);
  btn = document.createElement('button'); btn.type = 'button'; btn.id = 'inv3dBtn'; btn.hidden = true;
  btn.title = 'Swing the picture between flat and 3D (R)';
  btn.innerHTML = '<span data-v="0">2D</span><span data-v="1">3D</span>';
  const stop = (e) => { e.stopPropagation(); };   // a tap here never moves the ship or fires
  ['pointerdown', 'pointerup', 'pointermove', 'touchstart', 'mousedown'].forEach((ev) => btn.addEventListener(ev, stop));
  btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); window.Inv3D.toggle(); btn.blur(); const cv = document.getElementById('screen'); if (cv && cv.focus) cv.focus({ preventScroll: true }); });
  if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
  wrap.appendChild(btn);
  return btn;
}
function paintButton() {
  const b = button(); if (!b) return;
  const on = target > 0.5 ? '1' : '0';
  b.querySelectorAll('span').forEach((s) => s.classList.toggle('on', s.getAttribute('data-v') === on));
  b.setAttribute('aria-label', on === '1' ? 'Picture: 3D. Switch to flat (R)' : 'Picture: flat. Switch to 3D (R)');
  b.setAttribute('aria-pressed', on === '1' ? 'true' : 'false');
}

window.Inv3D = {
  ok: () => !!get(),
  draw(g, W, t, mode, info) {
    const wd = get(); if (!wd) { window.Inv3D.showButton(false); return X.draw(g, W, t, mode, info); }
    window.Inv3D.showButton(true);
    const k = lookAt(t);
    if (filmCv) {   // the film: wide, on its own canvas; the game's own picture underneath isn't seen
      const fcv = wd.render(W, t, mode, Object.assign({}, info, { dw: filmCv.width, dh: filmCv.height }), k, W.fx.slice(), window.Inv3D.cam);
      filmG.drawImage(fcv, 0, 0, filmCv.width, filmCv.height);
      W.fx.length = 0;
      return;
    }
    const stage = document.getElementById('stage'), sc = document.getElementById('screen');
    if (document.body.classList.contains('immersive') && stage && sc) {   // full screen on a phone: the world behind everything
      if (wd.canvas.parentNode !== stage) { wd.canvas.className = 'bg3d'; stage.insertBefore(wd.canvas, stage.firstChild); document.body.classList.add('full3d'); }
      fullBits(stage);
      const sr = stage.getBoundingClientRect(), cr = sc.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      const frame = { x: (cr.left - sr.left) / sr.width, y: (cr.top - sr.top) / sr.height, w: cr.width / sr.width, h: cr.height / sr.height };
      wd.render(W, t, mode, Object.assign({}, info, { dw: Math.round(sr.width * dpr), dh: Math.round(sr.height * dpr), frame }), k, W.fx.slice(), window.Inv3D.cam);
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, info.dw, info.dh);
      const r = X.draw(g, W, t, mode, Object.assign({}, info, { overlay: true, project: wd.project, noWash: true }));
      const ws = X.washState ? X.washState(W) : null;
      if (ws) {
        washA.style.opacity = ws.a > 0.01 ? ws.a.toFixed(3) : '0'; if (ws.col) washA.style.background = ws.col;
        washB.style.opacity = ws.slow > 0 ? '1' : '0';
        if (ws.slow > 0) { washB.style.background = 'rgba(106,60,200,' + (0.08 * ws.slow).toFixed(3) + ')'; washB.style.boxShadow = 'inset 0 0 0 3px ' + ws.slowCol; }
      }
      return r;
    }
    if (wd.canvas.parentNode) fullOff(wd);
    const cv = wd.render(W, t, mode, info, k, W.fx.slice(), window.Inv3D.cam);   // the 3D world reads what happened; the overlay then uses it up (cam: the demo's director)
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = true;
    g.drawImage(cv, 0, 0, info.dw, info.dh);
    return X.draw(g, W, t, mode, Object.assign({}, info, { overlay: true, project: wd.project }));
  },
  showButton(v) { if (v === shown && btn) return; const b = button(); if (!b) return; shown = v; b.hidden = !v; if (v) paintButton(); },
  toggle() { from = look; target = target > 0.5 ? 0 : 1; t0 = 0; paintButton(); return target; },
  set(v, now) { from = look; target = v; t0 = 0; if (now) { look = from = v; } paintButton(); },
  cam: null,   // the demo's director camera (demo.js), or null for the standard view
  get look() { return look; },
  get target() { return target; }
};
