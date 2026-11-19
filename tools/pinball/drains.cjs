/* 365 Pinball Hero - the drain census (ported 5 Nov 2026 from the wave 3 audit, 05 QA playtester). Never deployed.
 * Where do the balls drain? N lag-bot games on Ember Peak (Classic): every centre drain, what came before it, where
 * the ball crossed the flippers' line, and (wave 3) the plug saves.   node tools/pinball/drains.cjs [games=12] */
'use strict';
const G = require('path').join(__dirname, '../../games/pinball/');
const E = require(G + 'engine.js'), Pilot = require(G + 'pilot.js');
const T = E.table('ember').T;
console.log('BALL r', T.BALL, 'flippers', JSON.stringify(T.flippers.map((f) => { const o = {}; Object.keys(f).forEach((k) => { if (typeof f[k] === 'number' || typeof f[k] === 'string') o[k] = typeof f[k] === 'number' ? +f[k].toFixed(2) : f[k]; }); return o; })));
function bot(seed) { let s = (seed * 69069 + 1) & 0x7fffffff || 1, q = [], lag = 0, fumble = 0, ball = -1; const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  return (W) => { if (W.ball !== ball || W.frame < 2) { ball = W.ball; lag = Math.floor(r() * 3); q = []; } q.push(Pilot.input(W)); let o = q.length > lag ? q.shift() : {}; if (fumble > 0) { fumble--; o = Object.assign({}, o, { left: false, right: false, fum: true }); } else if (r() < 1 / 1500) fumble = 3 + Math.floor(r() * 4); return o; }; }
const N = +(process.argv[2] || 12), rows = [], cause = {}, crossX = [];
let drains = 0, outl = 0, centre = 0, noFlip = 0, fum = 0, secs = 0, plugSaves = 0;
for (let g = 0; g < N; g++) {
  const seed = 7000 + g * 13, W = E.newWorld(2, 0, seed, 'ember'), b = bot(seed), ring = [];
  while (!W.over && W.frame < 60 * 60 * 30) {
    const inp = b(W); E.step(W, inp);
    const ev = W.events.map((e) => (typeof e === 'string' ? e : e && e.sfx)).filter(Boolean);
    const B = W.balls[0]; ring.push({ x: B ? B.x : null, y: B ? B.y : null, vx: B ? B.vx : 0, vy: B ? B.vy : 0, L: !!inp.left, R: !!inp.right, fum: !!inp.fum, ev });
    if (ring.length > 240) ring.shift();
    W.events.length = 0;
    if (ev.indexOf('plugsave') >= 0) plugSaves++;
    if (ev.indexOf('drain') >= 0 && ev.indexOf('save') < 0) {
      drains++;
      const recent = ring.slice(-150), out = recent.some((r) => r.ev.indexOf('outlane') >= 0);
      if (out) { outl++; continue; }
      centre++;
      const last30 = ring.slice(-40), flipped = last30.some((r) => r.L || r.R), fumbled = ring.slice(-90).some((r) => r.fum);
      if (!flipped) noFlip++; if (fumbled) fum++;
      // the last notable thing that happened to the ball
      let c = 'none';
      for (let k = ring.length - 1; k >= Math.max(0, ring.length - 180) && c === 'none'; k--) { const n = ring[k].ev.filter((e) => !/^(wall|tick|flip|drain|ballend|spin|save|pressure|lavaopen|lavaclose|quakeend)$/.test(e)); if (n.length) c = n[n.length - 1]; }
      cause[c] = (cause[c] || 0) + 1;
      const cr = ring.slice().reverse().find((r) => r.y != null && r.y < 452) || {};
      crossX.push(Math.round(cr.x));
      if (rows.length < 14) rows.push({ g, f: W.frame, x452: Math.round(cr.x), vx: Math.round(cr.vx), vy: Math.round(cr.vy), flipped, fumbled, cause: c });
    }
  }
  secs += W.frame / 60;
}
const h = {}; crossX.forEach((x) => { const k = Math.floor(x / 10) * 10; h[k] = (h[k] || 0) + 1; });
console.log('games', N, 'minutes', (secs / 60).toFixed(0), 'drains', drains, 'outlane', outl, 'centre', centre, 'plug saves', plugSaves, '| centre drains with no flip in the last 0.67 s:', noFlip, '| with a bot fumble in the last 1.5 s:', fum);
console.log('last thing before a centre drain', JSON.stringify(cause));
console.log('x where the draining ball crossed y=452 (10-unit bins)', JSON.stringify(h));
console.log(JSON.stringify(rows));
