// RESCUE ARCADE MODE - HUD, front-door button, banners and the summary card
// (tr42). DOM only, created from here so index.html needs no markup. Hidden
// under ?clean=1 like every other overlay, so calibration renders stay bare.
//
// Wording rule: people are "in the water", "picked up", "dropped off" or
// "brought in by the shore team". Nothing in this file names a real service.

const CSS = `
#rq-root { position: absolute; inset: 0; pointer-events: none; z-index: 30; display: none;
  font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif; color: #f4f7fb; }
body.rescue #rq-root { display: block; }
body.rescue #viewbar, body.rescue #hint, body.rescue #rq-door { display: none !important; }
body.clean-render #rq-root, body.clean-render #rq-door { display: none !important; }
/* craft chooser (src/boats/hub.js) sits top-centre too: drop it below the wave panel (merge 2026-09-17) */
body.rescue #left > #craftbar { top: 62px; }
.rq-panel { background: rgba(8,14,22,.70); border: 1px solid rgba(255,255,255,.14); border-radius: 12px;
  backdrop-filter: blur(4px); }
#rq-top { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); display: flex; align-items: center;
  gap: 16px; padding: 7px 18px; white-space: nowrap; }
#rq-wave { font-weight: 800; letter-spacing: .12em; font-size: 16px; color: #9fd8ff; }   /* A11Y 13 -> 16 */
#rq-timer { font: 700 30px/1 ui-monospace, "Cascadia Mono", Consolas, monospace; min-width: 92px; text-align: center; }
#rq-timer.low { color: #ff6b5e; animation: rqpulse .5s ease-in-out infinite alternate; }
#rq-left { font-size: 16px; letter-spacing: .04em; }                                     /* A11Y 13 -> 16 */
#rq-left b { font-size: 18px; }
#rq-compass { display: flex; align-items: center; gap: 6px; font-size: 16px; }           /* A11Y 13 -> 16 */
#rq-compass i { display: inline-block; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent;
  border-bottom: 22px solid #ffb13b; transform-origin: 50% 66%; }
#rq-compass.zone i { border-bottom-color: #46f08a; }
#rq-score { position: absolute; top: 10px; right: 12px; padding: 8px 14px; text-align: right; min-width: 150px; }
#rq-score .v { font: 800 26px/1.05 ui-monospace, Consolas, monospace; }
#rq-score .s { font-size: 16px; color: #ffd76a; min-height: 20px; }                      /* A11Y 12 -> 16 */
#rq-score .c { font-size: 16px; letter-spacing: .1em; color: #cfe3f5; }                  /* A11Y 12 -> 16 */
#rq-score .c span { display: inline-block; width: 11px; height: 11px; border-radius: 50%; margin-left: 4px;
  border: 3px solid #ff8a3d; vertical-align: -1px; }
#rq-score .c span.gone { border-color: rgba(255,255,255,.2); }
#rq-sled { position: absolute; left: 12px; bottom: 16px; padding: 8px 12px; font-size: 16px; letter-spacing: .08em; }  /* A11Y 12 -> 16 */
#rq-sled .seats { display: flex; gap: 5px; margin-top: 5px; }
#rq-sled .seats span { width: 22px; height: 22px; border-radius: 6px; border: 2px solid rgba(255,255,255,.35); }
#rq-sled .seats span.on { background: #ffc21a; border-color: #ffc21a; box-shadow: 0 0 10px rgba(255,194,26,.6); }
#rq-prompt { position: absolute; left: 50%; bottom: 64px; transform: translateX(-50%); padding: 9px 20px; font-size: 17px;
  font-weight: 700; letter-spacing: .03em; white-space: nowrap; opacity: 0; transition: opacity .2s; }
#rq-prompt.on { opacity: 1; }
#rq-prompt.warn { color: #ff8b80; }
#rq-prompt.good { color: #6ff0a0; }
#rq-prompt .bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,.15); margin-top: 6px; overflow: hidden; display: none; }
#rq-prompt .bar i { display: block; height: 100%; width: 0; background: #46f08a; }
#rq-prompt.bar-on .bar { display: block; }
#rq-banner { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%); text-align: center; opacity: 0;
  transition: opacity .35s, transform .35s; padding: 16px 34px; }
#rq-banner.on { opacity: 1; transform: translate(-50%, -50%) scale(1.02); }
#rq-banner h1 { margin: 0; font-size: 44px; font-weight: 900; letter-spacing: .08em; text-shadow: 0 3px 14px rgba(0,0,0,.5); }
#rq-banner p { margin: 6px 0 0; font-size: 16px; color: #d7e6f3; }
#rq-banner.clear h1 { color: #6ff0a0; }
#rq-banner.timeup h1 { color: #ffb13b; }
#rq-markers { position: absolute; inset: 0; overflow: hidden; }
.rq-m { position: absolute; left: 0; top: 0; transform: translate(-50%, -100%); text-align: center; font-size: 16px; font-weight: 700;  /* A11Y 12 -> 16 */
  white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,.8); will-change: transform; }
/* A11Y: the count inside the ring goes 12 -> 16 px, so the ring goes 26 -> 30 px to hold it.
   .rq-m.obj .ico below was already 30, so the two now agree instead of differing by 4.
   (No back-quotes in this block: it is inside a JS template literal.) */
.rq-m .ico { width: 30px; height: 30px; margin: 0 auto 2px; border-radius: 50%; border: 3px solid #ffb13b;
  background: conic-gradient(#46f08a calc(var(--p, 0) * 1turn), rgba(8,14,22,.55) 0); position: relative; }
.rq-m .ico b { position: absolute; inset: 0; display: grid; place-items: center; font-size: 16px; }  /* A11Y 12 -> 16 */
.rq-m.obj .ico { border-color: #ffd23b; box-shadow: 0 0 12px rgba(255,210,59,.8); width: 34px; height: 34px; }  /* A11Y 30 -> 34, keeping its 4 px lead over the plain ring */
.rq-m.zone .ico { border-color: #46f08a; border-radius: 7px; }
.rq-m.zone.idle { opacity: .55; }
.rq-m.edge .ico::after { content: ''; position: absolute; left: 50%; top: 50%; width: 0; height: 0; border-top: 7px solid transparent;
  border-bottom: 7px solid transparent; border-left: 12px solid currentColor; transform: translate(-50%, -50%) rotate(var(--a, 0rad)) translateX(22px); }
.rq-m.edge { color: #ffb13b; } .rq-m.edge.zone { color: #46f08a; }
.rq-pop { position: absolute; left: 50%; top: 42%; transform: translate(-50%, 0); font: 900 26px/1 ui-sans-serif, system-ui, sans-serif;
  color: #ffd76a; text-shadow: 0 2px 8px rgba(0,0,0,.6); animation: rqpop 1.2s ease-out forwards; }
.rq-pop.pick { color: #7fd8ff; font-size: 20px; }
/* A11Y: max-height / max-width / overflow, which this card never had. It is the only card in
   the game that could grow past the window with nothing to catch it, and this pass grows its
   text. #rd-over has carried the same three lines since it was written. */
#rq-over { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 22px 30px; min-width: 330px;
  text-align: center; display: none; pointer-events: auto; box-sizing: border-box;
  max-width: calc(100% - 24px); max-height: calc(100% - 24px); overflow: auto; }
#rq-over.on { display: block; }
#rq-over h1 { margin: 0 0 4px; font-size: 34px; letter-spacing: .1em; }
#rq-over .big { font: 900 44px/1.1 ui-monospace, Consolas, monospace; color: #ffd76a; margin: 6px 0 12px; }
#rq-over dl { display: grid; grid-template-columns: 1fr auto; gap: 4px 20px; margin: 0 0 16px; text-align: left; font-size: 16px; }  /* A11Y 14 -> 16 */
#rq-over dt { color: #b8c9d9; } #rq-over dd { margin: 0; font-weight: 700; text-align: right; }
/* A11Y: 14 -> 16 px, and min-height 44. These MEASURED 39 px tall on every viewport this game
   targets, phone included, and PLAY AGAIN is the only way to start another run. */
#rq-over button, #rq-door { font: 700 16px ui-sans-serif, system-ui, sans-serif; letter-spacing: .08em; color: #0b1520;
  background: #ffc21a; border: 0; border-radius: 999px; padding: 10px 18px; min-height: 44px; cursor: pointer; margin: 0 4px; }
#rq-over button.alt { background: rgba(255,255,255,.14); color: #f4f7fb; }
#rq-door { position: absolute; right: 16px; top: 44px; z-index: 35; display: none; box-shadow: 0 4px 18px rgba(0,0,0,.35); }
body.demo:not(.rescue) #rq-door { display: block; }
/* Same for touch: no Shift+R on a phone (2026-09-17). */
body.touch:not(.rescue):not(.raid) #rq-door { display: block; }
/* Same phone declutter as the raid: the game's speed card and the craft chooser are redundant
   while a rescue run is on, and they cover a 390 px screen (2026-09-17). */
body.touch.rescue #hud, body.touch.rescue #left > #craftbar { display: none !important; }
/* A11Y: <small> is 0.8333em of its parent, so these keyboard hints rendered at 11.67 px off a
   14 px button - a relative unit quietly under the floor. Pinned to 14 px, a DECLARED
   EXCEPTION: it names a keyboard key, and the button it sits inside says the same thing. */
#rq-door small, #rq-over button small { font-size: 14px; font-weight: 600; opacity: .7; margin-left: 6px; }
@keyframes rqpulse { from { opacity: 1; } to { opacity: .55; } }
@keyframes rqpop { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, -70px); } }
`;

const h = (tag, attrs = {}, html = '') => {
  const el = document.createElement(tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (html) el.innerHTML = html;
  return el;
};
const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const fmtNum = (n) => Math.round(n).toLocaleString('en-GB');

export class RescueHud {
  constructor(mount, { onEnter, onAgain, onExit }) {
    const style = h('style', { id: 'rq-style' }); style.textContent = CSS;
    document.head.appendChild(style);

    this.door = h('button', { id: 'rq-door', type: 'button' }, 'RESCUE MODE<small>Shift+R</small>');
    this.door.addEventListener('click', (e) => { e.stopPropagation(); onEnter(); });
    mount.appendChild(this.door);

    const r = this.root = h('div', { id: 'rq-root' });
    r.innerHTML = `
      <div id="rq-markers"></div>
      <div id="rq-top" class="rq-panel">
        <span id="rq-wave">WAVE 1</span>
        <span id="rq-timer">0:00</span>
        <span id="rq-left"><b>0</b> in the water</span>
        <span id="rq-compass"><i></i><span>—</span></span>
      </div>
      <div id="rq-score" class="rq-panel"><div class="v">0</div><div class="s"></div><div class="c">CHANCES</div></div>
      <div id="rq-sled" class="rq-panel">SLED <span class="n">0/4</span><div class="seats"></div></div>
      <div id="rq-prompt" class="rq-panel"><span class="t"></span><div class="bar"><i></i></div></div>
      <div id="rq-banner" class="rq-panel"><h1></h1><p></p></div>
      <div id="rq-over" class="rq-panel">
        <h1>SHIFT OVER</h1><div>final score</div><div class="big">0</div><dl></dl>
        <button type="button" data-a="again">PLAY AGAIN <small>Enter</small></button>
        <!-- >>> LEVELBACK -->
        <button type="button" data-a="levels" class="alt">CHOOSE LEVEL</button>
        <!-- <<< LEVELBACK -->
        <button type="button" data-a="exit" class="alt">FREE RIDE <small>Shift+R</small></button>
      </div>`;
    mount.appendChild(r);
    const q = (s) => r.querySelector(s);
    this.el = {
      markers: q('#rq-markers'), wave: q('#rq-wave'), timer: q('#rq-timer'), left: q('#rq-left'),
      compass: q('#rq-compass'), arrow: q('#rq-compass i'), cdist: q('#rq-compass span'),
      score: q('#rq-score .v'), streak: q('#rq-score .s'), chances: q('#rq-score .c'),
      sledN: q('#rq-sled .n'), seats: q('#rq-sled .seats'), prompt: q('#rq-prompt'), promptT: q('#rq-prompt .t'),
      bar: q('#rq-prompt .bar i'), banner: q('#rq-banner'), bannerH: q('#rq-banner h1'), bannerP: q('#rq-banner p'),
      over: q('#rq-over'), overScore: q('#rq-over .big'), overDl: q('#rq-over dl'),
    };
    q('#rq-over [data-a=again]').addEventListener('click', (e) => { e.stopPropagation(); onAgain(); });
    // >>> LEVELBACK  the raid card carries the reasoning; this is the same closure of the
    // same inconsistency. No onLevels callback for the reason stated there.
    q('#rq-over [data-a=levels]').addEventListener('click', (e) => {
      e.stopPropagation();
      const b = document.querySelector('#btn-mode');
      if (b) b.click();
    });
    // <<< LEVELBACK
    q('#rq-over [data-a=exit]').addEventListener('click', (e) => { e.stopPropagation(); onExit(); });
    this.markerEls = [];
    this.bannerUntil = 0;
    this._seatsFor = -1;
    this._chancesKey = '';
  }

  banner(title, sub, cls, ms) {
    const e = this.el;
    e.bannerH.textContent = title; e.bannerP.textContent = sub;
    e.banner.className = 'rq-panel on ' + (cls || '');
    this.bannerUntil = performance.now() + ms;
  }

  pop(text, cls = '') {
    const p = h('div', { class: 'rq-pop ' + cls }, text);
    this.root.appendChild(p);
    setTimeout(() => p.remove(), 1250);
  }

  showOver(sum, seed) {
    const e = this.el;
    e.banner.classList.remove('on'); this.bannerUntil = 0;
    e.overScore.textContent = fmtNum(sum.score);
    const rows = [
      ['People brought in', sum.rescued], ['Waves cleared', sum.wavesCleared], ['Reached wave', sum.reachedWave],
      ['Best streak', sum.bestStreak],
      ['Fastest wave', sum.fastestWave ? `wave ${sum.fastestWave.n} in ${fmtTime(sum.fastestWave.sec)}` : '—'],
      ['Shift length', fmtTime(sum.seconds)], ['Run seed', seed],
    ];
    e.overDl.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    e.over.classList.add('on');
  }

  hideOver() { this.el.over.classList.remove('on'); }

  // Per-frame. `proj(x, y, z)` -> {x, y, behind} in CSS px, or null if no 3D view.
  update(game, pose, proj, W, H, viewYaw) {
    const e = this.el, T = game.T;
    e.wave.textContent = `WAVE ${game.wave}`;
    const t = game.phase === 'intro' ? game.timerTotal : game.timer;
    e.timer.textContent = fmtTime(t);
    e.timer.classList.toggle('low', game.phase === 'live' && game.timer < 20);
    e.left.innerHTML = `<b>${game.peopleInWater}</b> in the water`;
    e.score.textContent = fmtNum(game.score);
    e.streak.textContent = game.streak >= 2 ? `STREAK ${game.streak}  ×${game.multiplier.toFixed(1)}` : '';
    const ck = `${game.chances}/${T.chances}`;
    if (ck !== this._chancesKey) {
      this._chancesKey = ck;
      e.chances.innerHTML = 'CHANCES' + Array.from({ length: T.chances }, (_, i) => `<span class="${i < game.chances ? '' : 'gone'}"></span>`).join('');
    }
    if (this._seatsFor !== T.capacity) {
      this._seatsFor = T.capacity;
      e.seats.innerHTML = Array.from({ length: T.capacity }, () => '<span></span>').join('');
    }
    e.sledN.textContent = `${game.aboard.length}/${T.capacity}`;
    [...e.seats.children].forEach((s, i) => s.classList.toggle('on', i < game.aboard.length));

    // objective compass: bearing relative to the craft's heading, up = ahead
    const obj = game.objective(pose);
    if (obj) {
      // Relative to the VIEW when there is one: the chase camera lags the
      // heading in a turn, and "up" on the compass has to mean up the screen.
      const rel = Math.atan2(obj.z - pose.z, obj.x - pose.x) - (Number.isFinite(viewYaw) ? viewYaw : pose.heading);
      // +z is screen-right at yaw 0 (core.viewFromYawPitch), so a positive
      // relative bearing is clockwise on screen, which is CSS rotate's sense.
      e.arrow.style.transform = `rotate(${rel.toFixed(3)}rad)`;
      e.cdist.textContent = `${obj.kind === 'zone' ? 'BEACH' : ''} ${Math.round(obj.dist)} m`.trim();
      e.compass.classList.toggle('zone', obj.kind === 'zone');
      e.compass.style.visibility = 'visible';
    } else e.compass.style.visibility = 'hidden';

    // prompt
    let txt = '', cls = '', bar = -1;
    if (game.phase === 'live') {
      switch (game.status) {
        case 'tooFast': txt = 'SLOW RIGHT DOWN to pick up'; cls = 'warn'; bar = game.pickT / T.pickupHold; break;
        case 'picking': txt = `PICKING UP — hold it here (${game.nearGroup ? game.nearGroup.inWater : 0} left)`; cls = 'good'; bar = game.pickT / T.pickupHold; break;
        case 'full': txt = 'SLED FULL — take them to the beach'; cls = 'warn'; break;
        case 'slowForDrop': txt = 'Ease off to drop them at the beach'; cls = 'warn'; break;
        case 'dropping': txt = 'DROPPING OFF'; cls = 'good'; break;
        default:
          if (obj && obj.kind === 'zone') txt = 'Bring them in to the beach drop-off';
          else if (obj && obj.dist < 40) txt = 'Slow right down next to them';
      }
    }
    e.promptT.textContent = txt;
    e.prompt.className = 'rq-panel' + (txt ? ' on ' + cls : '') + (bar >= 0 ? ' bar-on' : '');
    if (bar >= 0) e.bar.style.width = (Math.min(1, bar) * 100).toFixed(0) + '%';

    // Banners live on SIM time, not the wall clock: shown for exactly as long as
    // the game sits in the phase that raised them (intro / clear / timeup), so
    // a slow frame rate or a pause cannot desynchronise text and state.
    const bannerPhase = game.phase === 'intro' || game.phase === 'clear' || game.phase === 'timeup';
    if (!bannerPhase && this.bannerUntil) { e.banner.classList.remove('on'); this.bannerUntil = 0; }

    // markers
    const list = [];
    if (proj && game.phase !== 'over') {
      for (const g of game.groups) {
        if (!g.inWater) continue;
        const isObj = obj && obj.kind === 'group' && obj.group === g;
        const here = game.nearGroup === g;
        list.push({ x: g.x, y: 3.2, z: g.z, cls: isObj ? 'obj' : '', label: `${Math.round(Math.hypot(g.x - pose.x, g.z - pose.z))} m`,
          n: g.inWater, p: here ? game.pickT / T.pickupHold : 0 });
      }
      const Z = game.zone;
      list.push({ x: Z.x, y: 5, z: Z.z, cls: 'zone' + (game.aboard.length ? '' : ' idle'),
        label: `DROP-OFF ${Math.round(Math.hypot(Z.x - pose.x, Z.z - pose.z))} m`, n: game.aboard.length || '', p: 0 });
    }
    while (this.markerEls.length < list.length) {
      const m = h('div', { class: 'rq-m' }, '<div class="ico"><b></b></div><span></span>');
      e.markers.appendChild(m); this.markerEls.push(m);
    }
    const M = 34;
    for (let i = 0; i < this.markerEls.length; i++) {
      const m = this.markerEls[i];
      const it = list[i];
      if (!it) { m.style.display = 'none'; continue; }
      const s = proj(it.x, it.y, it.z);
      let x = s.x, y = s.y, edge = false, ang = 0;
      if (s.behind || x < M || x > W - M || y < M + 60 || y > H - M) {
        edge = true;
        let dx = x - W / 2, dy = y - H / 2;
        if (s.behind) { dx = -dx; dy = -dy; if (Math.abs(dy) < 1 && Math.abs(dx) < 1) dy = 1; }
        ang = Math.atan2(dy, dx);
        const kx = (W / 2 - M) / Math.max(1e-3, Math.abs(dx)), ky = (H / 2 - M - 40) / Math.max(1e-3, Math.abs(dy));
        const k = Math.min(kx, ky);
        x = W / 2 + dx * k; y = H / 2 + 20 + dy * k;
      }
      m.style.display = 'block';
      m.className = 'rq-m ' + it.cls + (edge ? ' edge' : '');
      m.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      m.style.setProperty('--p', Math.min(1, it.p).toFixed(3));
      m.style.setProperty('--a', ang.toFixed(3) + 'rad');
      m.firstChild.firstChild.textContent = it.n;
      m.lastChild.textContent = it.label;
    }
  }
}
