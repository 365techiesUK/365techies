// PIER SURF - HUD, rules card and summary card (stage 1, 26 Sep 2026). DOM only, created from
// here so index.html needs no markup, and hidden under ?clean=1 like every other overlay.
// Same look as Dolphin Watch's (src/dolphinwatch/watch-hud.js), with its own ids.
//
// ⚠️ No back-quote may appear inside the CSS template literal below.

// >>> PROGRESS
import * as prog from '../ui/progress-store.js';
import { setNext, goNext } from '../ui/next-button.js';
// <<< PROGRESS

const CSS = `
#sf-root { position: absolute; inset: 0; pointer-events: none; z-index: 30; display: none;
  font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif; color: #f4f7fb; }
body.surfer #sf-root { display: block; }
body.surfer #viewbar, body.surfer #hint { display: none !important; }
body.surfer #left > #craftbar { display: none !important; }
body.clean-render #sf-root { display: none !important; }
body.touch.surfer #hud { display: none !important; }
body.surfer.sfcard #sf-root { z-index: 57; }
.sf-panel { background: rgba(8,14,22,.70); border: 1px solid rgba(255,255,255,.14); border-radius: 12px; backdrop-filter: blur(4px); }
#sf-top { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); display: flex; align-items: center;
  gap: 16px; padding: 7px 18px; white-space: nowrap; }
#sf-title { font-weight: 800; letter-spacing: .12em; font-size: 16px; color: #9fe6ff; }
#sf-waves { font: 700 24px/1 ui-monospace, "Cascadia Mono", Consolas, monospace; }
#sf-waves span { display: inline-block; width: 13px; height: 13px; border-radius: 50%; margin-left: 5px;
  border: 3px solid #46f0c8; vertical-align: 0; }
#sf-waves span.on { background: #46f0c8; }
#sf-clock { font: 700 16px/1 ui-monospace, Consolas, monospace; color: #cfe3f5; }
#sf-meter { position: absolute; left: 12px; bottom: 16px; padding: 8px 12px; font-size: 16px; letter-spacing: .06em; min-width: 190px; }
#sf-meter .bar { position: relative; height: 10px; border-radius: 5px; background: rgba(255,255,255,.15); margin-top: 6px; overflow: hidden; }
#sf-meter .bar i { display: block; height: 100%; width: 0; background: #7fe0ff; }
#sf-meter .bar b { position: absolute; top: -2px; bottom: -2px; width: 3px; background: #ffd76a; }
#sf-meter .v { margin-top: 6px; font: 700 16px/1 ui-monospace, Consolas, monospace; color: #cfe3f5; letter-spacing: 0; }
#sf-meter.ok .bar i { background: #46f0c8; }
#sf-score { position: absolute; top: 10px; right: 12px; padding: 8px 14px; text-align: right; min-width: 150px; font-size: 16px; }
#sf-score .v { font: 800 24px/1.05 ui-monospace, Consolas, monospace; }
#sf-score .s { color: #bfe9ff; }
#sf-prompt { position: absolute; left: 50%; bottom: 64px; transform: translateX(-50%); padding: 9px 20px; font-size: 17px;
  font-weight: 700; letter-spacing: .03em; white-space: nowrap; max-width: calc(100% - 24px); }
#sf-prompt.warn { color: #ffb2aa; } #sf-prompt.good { color: #6ff0c8; }
#sf-banner { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%); text-align: center; opacity: 0;
  transition: opacity .35s; padding: 16px 34px; max-width: calc(100% - 24px); box-sizing: border-box; }
#sf-banner.on { opacity: 1; }
#sf-banner h1 { margin: 0; font-size: 40px; font-weight: 900; letter-spacing: .08em; text-shadow: 0 3px 14px rgba(0,0,0,.5); }
#sf-banner p { margin: 6px 0 0; font-size: 16px; color: #d7e6f3; }
#sf-banner.good h1 { color: #6ff0c8; } #sf-banner.bad h1 { color: #ffb13b; }
.sf-pop { position: absolute; left: 50%; top: 42%; transform: translate(-50%, 0); font: 900 26px/1 ui-sans-serif, system-ui, sans-serif;
  color: #6ff0c8; text-shadow: 0 2px 8px rgba(0,0,0,.6); animation: sfpop 1.6s ease-out forwards; white-space: nowrap; }
.sf-pop.bad { color: #ffb13b; }
@keyframes sfpop { 0% { opacity: 0; transform: translate(-50%, 10px) scale(.9); } 12% { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
  75% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -26px); } }
#sf-intro, #sf-over { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 20px 26px;
  width: min(540px, calc(100% - 24px)); max-height: calc(100% - 24px); overflow: auto; box-sizing: border-box;
  text-align: center; display: none; pointer-events: auto; }
#sf-intro.on, #sf-over.on { display: block; }
#sf-intro h1, #sf-over h1 { margin: 0 0 4px; font-size: 30px; letter-spacing: .1em; color: #9fe6ff; }
#sf-intro .sub { font-size: 17px; color: #dbe8f4; margin-bottom: 10px; }
#sf-intro ul { list-style: none; margin: 0 0 10px; padding: 0; font-size: 16px; line-height: 1.45; text-align: left; }
#sf-intro ul li { margin-bottom: 7px; }
#sf-intro ul b { color: #9fe6ff; }
#sf-intro .note { font-size: 16px; line-height: 1.4; color: #a9bfd3; margin: 4px 0 12px; font-style: italic; }
#sf-over dl { display: grid; grid-template-columns: 1fr auto; gap: 4px 20px; margin: 8px 0 16px; text-align: left; font-size: 16px; }
#sf-over dt { color: #b8c9d9; } #sf-over dd { margin: 0; font-weight: 700; text-align: right; }
#sf-over h1 { color: #6ff0c8; }
#sf-over .big { font: 900 44px/1.1 ui-monospace, Consolas, monospace; color: #ffd76a; margin: 6px 0 4px; }
#sf-intro .touch { display: none; } body.touch #sf-intro li.touch { display: list-item; } body.touch #sf-intro span.touch { display: inline; }
body.touch #sf-intro .keys { display: none; }
#sf-intro button, #sf-over button { font: 700 16px ui-sans-serif, system-ui, sans-serif; letter-spacing: .08em; color: #0b1520;
  background: #ffc21a; border: 0; border-radius: 999px; padding: 10px 18px; min-height: 44px; cursor: pointer; margin: 4px; }
#sf-over button.alt { background: rgba(255,255,255,.14); color: #f4f7fb; }
#sf-intro button small, #sf-over button small { font-size: 14px; font-weight: 600; opacity: .7; margin-left: 6px; }
body.touch #sf-over button small { display: none; }
body.touch #sf-prompt { top: 62px; bottom: auto; white-space: normal; text-align: center; width: max-content; font-size: 16px; }
/* 140, not Dolphin Watch's 124: this level's prompts run to two lines on a 375 px phone (66 px
   tall from 62), and at 124 they sat 4 px over both panels - measured 26 Sep. */
body.touch #sf-meter { top: 140px; left: 8px; bottom: auto; min-width: 0; width: 160px; }
body.touch #sf-score { top: 140px; right: 8px; }
@media (max-width: 640px) {
  #sf-title { display: none; }
  #sf-prompt { font-size: 16px; white-space: normal; text-align: center; width: max-content; }
  #sf-banner h1 { font-size: 28px; }
}
`;

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export class SurferHud {
  constructor(mount, cb) {
    this.cb = cb || {};
    if (!document.getElementById('sf-css')) {
      const st = document.createElement('style'); st.id = 'sf-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    const root = document.createElement('div');
    root.id = 'sf-root';
    root.innerHTML = `
      <div id="sf-top" class="sf-panel"><span id="sf-title">PIER SURF</span><span id="sf-waves"></span><span id="sf-clock">0:00</span></div>
      <div id="sf-score" class="sf-panel"><div class="v" id="sf-pts">0</div><div class="s" id="sf-best">best ride —</div><div class="s" id="sf-duck">duck-dives 0</div></div>
      <div id="sf-meter" class="sf-panel">YOU vs THE WAVE<div class="bar"><i></i><b></b></div><div class="v"></div></div>
      <div id="sf-prompt" class="sf-panel"></div>
      <div id="sf-banner" class="sf-panel"><h1></h1><p></p></div>
      <div id="sf-intro" class="sf-panel">
        <h1>PIER SURF</h1>
        <div class="sub">The sandbank beside Bournemouth Pier, east side. Catch three waves.</div>
        <ul>
          <li class="keys"><b>Paddle out</b> with <b>W</b> / <b>↑</b> or the left mouse button. Steer with <b>A</b> / <b>D</b> or the mouse.</li>
          <li class="touch"><b>Paddle</b> with the throttle strip, <b>steer</b> with the stick. The big button does whatever the moment needs.</li>
          <li><b>Whitewater coming?</b> <b>DUCK DIVE</b> under it (<span class="keys">SPACE</span><span class="touch">the big button</span>). Stay on top and it washes you back in.</li>
          <li><b>Outside the break</b>, turn to face the beach and wait. When a wave lifts you, <b>paddle hard</b>.</li>
          <li>When it is carrying you, <b>POP UP</b>. Too early and it rolls under you; too late and the nose goes under.</li>
          <li><b>Ride it</b> along the face - carve for points. <b>KICK OUT</b> to finish the ride.</li>
        </ul>
        <div class="note">People really do surf the banks either side of Bournemouth Pier. On the beach, surfboards go between the black-and-white chequered flags.</div>
        <button type="button" data-a="go">PADDLE OUT</button>
      </div>
      <div id="sf-over" class="sf-panel">
        <h1>SURF’S UP</h1>
        <div class="big" id="sf-total">0</div>
        <dl id="sf-stats"></dl>
        <button type="button" data-a="next" hidden>NEXT</button>
        <button type="button" data-a="again">PLAY AGAIN <small>Enter</small></button>
        <button type="button" data-a="levels" class="alt">CHOOSE LEVEL</button>
        <button type="button" data-a="exit" class="alt">FREE RIDE</button>
      </div>`;
    mount.appendChild(root);
    this.root = root;
    const $ = (s) => root.querySelector(s);
    this.el = {
      waves: $('#sf-waves'), clock: $('#sf-clock'), best: $('#sf-best'), duck: $('#sf-duck'), pts: $('#sf-pts'),
      total: $('#sf-total'), next: $('#sf-over [data-a=next]'),
      meter: $('#sf-meter'), bar: $('#sf-meter .bar i'), mark: $('#sf-meter .bar b'), mv: $('#sf-meter .v'),
      prompt: $('#sf-prompt'), banner: $('#sf-banner'), bh: $('#sf-banner h1'), bp: $('#sf-banner p'),
      intro: $('#sf-intro'), over: $('#sf-over'), stats: $('#sf-stats'),
    };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      e.stopPropagation();
      const a = b.dataset.a;
      if (a === 'go') this.hideIntro();
      else if (a === 'next') goNext(b);
      else if (a === 'again' && this.cb.onAgain) this.cb.onAgain();
      // >>> LEVELBACK  the same handle every other level's card uses.
      else if (a === 'levels') { const m = document.querySelector('#btn-mode'); if (m) m.click(); }
      // <<< LEVELBACK
      else if (a === 'exit' && this.cb.onExit) this.cb.onExit();
    });
    this.overOn = false;
    this._bannerT = 0;
    this._last = {};
  }

  showIntro() { this.el.intro.classList.add('on'); this._card(); }
  hideIntro() { this.el.intro.classList.remove('on'); this._card(); }
  hideOver() { this.el.over.classList.remove('on'); this.overOn = false; this._card(); }
  get introOn() { return this.el.intro.classList.contains('on'); }
  // body.sfcard while either card is up. Re-read every frame in update() too, because the rules
  // card can be taken down from main.js (any key) without passing through here.
  _card() {
    const on = this.el.intro.classList.contains('on') || this.el.over.classList.contains('on');
    if (document.body.classList.contains('sfcard') !== on) document.body.classList.toggle('sfcard', on);
  }

  showOver(run) {
    // >>> PROGRESS  this level is only ever finished by winning it, so that is what is recorded.
    prog.complete('surfer', true);
    setNext(this.el.next, 'surfer', true);
    // <<< PROGRESS
    const rides = run.rides.filter((r) => r.ok);
    const far = rides.reduce((m, r) => Math.max(m, r.dist), 0);
    const top = rides.reduce((m, r) => Math.max(m, r.top), 0);
    const rows = [
      ['Waves ridden', `${run.waves}`],
      ['Carves', `${rides.reduce((m, r) => m + (r.carves || 0), 0)}`],
      ['Longest ride', `${run.best.toFixed(1)} s`],
      ['Furthest ride', `${Math.round(far)} m`],
      ['Top speed', `${(top * 3.6).toFixed(0)} km/h`],
      ['Duck-dives (clean)', `${run.ducks} (${run.ducksClean})`],
      ['Caught inside', `${run.washed}`],
      ['Time', fmt(run.endT || run.t)],
    ];
    this.el.total.textContent = String(run.score);
    this.el.stats.innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
    this.el.over.classList.add('on'); this.overOn = true; this._card();
  }

  banner(title, sub, kind, ms) {
    const el = this.el;
    el.bh.textContent = title; el.bp.textContent = sub || '';
    el.banner.className = 'sf-panel on ' + (kind || '');
    this._bannerT = performance.now() + (ms || 2500);
  }

  // Two can land in the same instant (UP AND RIDING! and the bottom turn's CARVE!), so a new one
  // stacks under whatever is still showing instead of printing on top of it.
  pop(text, kind) {
    const d = document.createElement('div');
    d.className = 'sf-pop' + (kind ? ' ' + kind : '');
    d.textContent = text;
    const live = this.root.querySelectorAll('.sf-pop').length;
    if (live) d.style.marginTop = `${Math.min(live, 3) * 36}px`;
    this.root.appendChild(d);
    setTimeout(() => d.remove(), 1700);
  }

  update(run, B, msg, kind) {
    const el = this.el, L = this._last;
    if (this._bannerT && performance.now() > this._bannerT) { el.banner.classList.remove('on'); this._bannerT = 0; }
    const dots = Array.from({ length: 3 }, (_, i) => `<span class="${i < run.waves ? 'on' : ''}"></span>`).join('');
    const wv = `${run.waves} / 3${dots}`;
    if (L.wv !== wv) { el.waves.innerHTML = wv; L.wv = wv; }
    const clk = fmt(run.t);
    if (L.clk !== clk) { el.clock.textContent = clk; L.clk = clk; }
    this._card();
    const pts = String(run.score);
    if (L.pts !== pts) { el.pts.textContent = pts; L.pts = pts; }
    const best = run.best > 0 ? `best ride ${run.best.toFixed(1)} s` : 'best ride —';
    if (L.best !== best) { el.best.textContent = best; L.best = best; }
    const dk = `duck-dives ${run.ducksClean} / ${run.ducks}`;
    if (L.dk !== dk) { el.duck.textContent = dk; L.dk = dk; }
    // The catch meter: your speed along the board against the wave's own speed, with the pop-up
    // speed marked. Fill past the mark and SPACE stands you up.
    const w = B.wave, c = Math.max(3, w.c || 3.5);
    const u = Math.max(0, B.u);
    el.bar.style.width = `${Math.min(100, (u / c) * 100).toFixed(1)}%`;
    el.mark.style.left = `${Math.min(100, (B.spec.popU / c) * 100).toFixed(1)}%`;
    el.meter.classList.toggle('ok', u >= B.spec.popU);
    const mv = `you ${u.toFixed(1)} · wave ${w.c ? w.c.toFixed(1) : '—'} m/s`;
    if (L.mv !== mv) { el.mv.textContent = mv; L.mv = mv; }
    if (L.msg !== msg) { el.prompt.textContent = msg; L.msg = msg; }
    const cls = 'sf-panel ' + (kind || '');
    if (L.cls !== cls) { el.prompt.className = cls; L.cls = cls; }
  }
}

function fmt(t) { const s = Math.max(0, Math.floor(t)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
