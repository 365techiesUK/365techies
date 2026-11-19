/* 365 Pinball Hero - the descent farm (wave 3, 5 Nov 2026). Never deployed. Bots play Ember Peak with DIVE forced lit
 * (it is lit again whenever it is out, outside multiball), sink it, play THE MAGMA CHAMBER through descent.js and come
 * back up, over and over. Per trip down it records how long the ball stayed below, how the trip ended (ascend, drain,
 * the lava), whether the chamber was cleared, and any drain within 2 s of either cut (below: from the cut and from the
 * moment the ball is free after the held start; on the surface: from the cut back up).
 *
 *   node tools/pinball/descent-farm.cjs [bot=all|pilot|messy|lag] [dives=100] [speed=2] [--json]
 * Bots as flow.cjs: pilot (the tidy demo pilot), lag (the pilot 0-2 frames late each ball, the odd fumble), messy
 * (messybot.cjs, the casual player). Acceptance (07-PLAN 6.3 levels, 200 dives): 0 drains within 2 s of either cut;
 * median stay 25-45 s; casual players clear 25-50% of dives, the pilot 60-85%. Run it through heavy.cjs. */
'use strict';
const E = require('../../games/pinball/engine.js');
const PD = require('../../games/pinball/descent.js');
const Pilot = require('../../games/pinball/pilot.js');
const Messy = require('./messybot.cjs');

const args = process.argv.slice(2).filter((a) => a[0] !== '-');
const which = args[0] || 'all', N = +(args[1] || 100), speed = +(args[2] || 2), JSONOUT = process.argv.includes('--json');
const name = (e) => (typeof e === 'string' ? e : e && e.sfx);

function lagBot(seed) {   // (flow.cjs's)
  let s = (seed * 69069 + 1) & 0x7fffffff || 1, q = [], lag = 0, fumble = 0, ball = -1, tid = '';
  const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  return function (W) {
    if (W.ball !== ball || W.tableId !== tid || W.frame < 2) { ball = W.ball; tid = W.tableId; lag = Math.floor(r() * 3); q = []; }
    q.push(Pilot.input(W));
    let out = q.length > lag ? q.shift() : {};
    if (fumble > 0) { fumble--; out = Object.assign({}, out, { left: false, right: false }); }
    else if (r() < 1 / 1500) fumble = 3 + Math.floor(r() * 4);
    return out;
  };
}
function median(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
function pct(a, p) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; }

function farm(kind) {
  const trips = [], early = { down: 0, downFree: 0, up: 0, at: [] };
  let games = 0, surfaceSecs = 0, frames = 0;
  while (trips.length < N && games < 400) {
    const seed = 3000 + games * 13;
    const S = E.newWorld(speed, null, seed, 'ember');
    const D = PD.create(E, { speed, seed });
    const bots = {};
    const botFor = (A) => bots[A.tableId] || (bots[A.tableId] = kind === 'messy' ? Messy.create(seed + (A.tableId === 'ember' ? 0 : 77)) : kind === 'lag' ? lagBot(seed) : (w) => Pilot.input(w));
    let cur = null, upF = -1;
    D.update(S);
    for (let f = 0; f < 60 * 60 * 30 && !S.over && trips.length < N; f++) {
      const below = D.active(S) !== S;
      if (!below && S.state === 'play' && !S.mb && !S.crater.dive && !S.dive.held && S.feed <= 0) E.api.craterLit(S, 'dive', true);
      const A = D.active(S);
      E.step(A, botFor(A)(A));
      frames++;
      if (!below) surfaceSecs += 1 / 60;
      const ev = A.events.map(name);
      if (below && cur) {
        if (cur.free < 0 && A.balls.length && A.balls.every((b) => b.m === 'free')) cur.free = A.frame;
        if (ev.includes('drain')) {
          if (A.frame < 120) { early.down++; early.at.push('down+' + A.frame); }
          if (cur.free >= 0 && A.frame - cur.free < 120) { early.downFree++; early.at.push('free+' + (A.frame - cur.free)); }
        }
        if (ev.includes('chamberclear')) cur.clearAt = A.frame / 60;
      } else if (!below && upF >= 0 && ev.includes('drain') && f - upF < 120) { early.up++; early.at.push('up+' + (f - upF)); }
      A.events.length = 0;
      const t = D.update(S);
      if (t === 'down') cur = { f0: f, free: -1, clearAt: null };
      else if (t === 'up') {
        const L = S.descent.last;
        trips.push({ how: L.how, cleared: L.cleared, secs: L.secs, score: L.score, clearAt: cur ? cur.clearAt : null, game: games });
        cur = null; upF = f;
      }
    }
    games++;
  }
  const secs = trips.map((t) => t.secs), cleared = trips.filter((t) => t.cleared).length, how = {};
  trips.forEach((t) => { how[t.how] = (how[t.how] || 0) + 1; });
  return {
    bot: kind, speed, dives: trips.length, games, cleared, clearRate: trips.length ? cleared / trips.length : 0, how,
    stay: { median: median(secs), p10: pct(secs, 0.1), p90: pct(secs, 0.9) },
    clearAt: median(trips.filter((t) => t.clearAt != null).map((t) => t.clearAt)),
    score: median(trips.map((t) => t.score)), early, surfaceSecs: Math.round(surfaceSecs), gameMinutes: Math.round(frames / 3600)
  };
}

const kinds = which === 'all' ? ['pilot', 'messy', 'lag'] : which.split(',');
const t0 = Date.now(), out = kinds.map(farm);
if (JSONOUT) console.log(JSON.stringify(out));
else out.forEach((r) => {
  console.log(r.bot.padEnd(6) + ' speed ' + r.speed + ': ' + r.dives + ' dives in ' + r.games + ' games (' + r.gameMinutes + ' game-minutes)'
    + ' | cleared ' + r.cleared + ' (' + (100 * r.clearRate).toFixed(0) + '%), median clear at ' + r.clearAt.toFixed(1) + ' s'
    + ' | stay median ' + r.stay.median.toFixed(1) + ' s (10% ' + r.stay.p10.toFixed(1) + ', 90% ' + r.stay.p90.toFixed(1) + ')'
    + ' | ends ' + JSON.stringify(r.how) + ' | median trip score ' + E.fmt(r.score)
    + ' | drains within 2 s: of the cut down ' + r.early.down + ', of the ball free below ' + r.early.downFree + ', of the cut up ' + r.early.up
    + (r.early.at.length ? ' ' + JSON.stringify(r.early.at.slice(0, 10)) : ''));
});
if (!JSONOUT) console.log('took ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
