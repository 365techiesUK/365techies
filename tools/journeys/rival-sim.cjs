// The Journeys for the games against the computer (Hearts, Gin Rummy, Cribbage, Whist; 5 Oct 2026): a level is ONE
// HAND on a set deal, with three targets (one per star). This plays a deal many ways - the Hint's own play, every first
// choice (Hearts' pass, Cribbage's discard) and random variations - to find what can really be reached.
// Used by make-rival-journeys.cjs (and its worker threads) and by the tests.
const path = require('path');
const ROOT = path.join(__dirname, '../../games/');
const G = {
  hearts: { E: require(ROOT + 'hearts/engine.js'), low: true,
    value: (S) => S.lastHand ? S.lastHand.add[0] : 26,
    flag: (S) => !!(S.lastHand && S.lastHand.moon === 0),
    moves(E, S) {
      if (S.phase === 'pass') return null;   // chosen by first() / pick3()
      return E.legal(S, 0).map((c) => ({ t: 'play', c }));
    } },
  gin: { E: require(ROOT + 'gin/engine.js'), low: false,
    value: (S) => !S.result || S.result.draw ? 0 : S.result.to === 0 ? S.result.pts : -S.result.pts,
    flag: (S) => !!(S.result && S.result.gin && S.result.to === 0),
    moves(E, S) {
      if (S.phase === 'draw') return ['stock', 'pile'].filter((f) => E.canDraw(S, 0, f)).map((from) => ({ t: 'draw', from }));
      const out = S.hands[0].filter((c) => E.canThrow(S, 0, c)).map((c) => ({ t: 'discard', c }));
      E.knockable(S, 0).forEach((o) => out.push({ t: 'knock', c: o.c }));
      return out;
    } },
  cribbage: { E: require(ROOT + 'cribbage/engine.js'), low: false,
    value: (S) => S.scores[0],
    moves(E, S) {
      if (S.phase === 'show') return [{ t: 'count' }];
      if (S.phase === 'discard') return null;
      return E.legal(S, 0).map((c) => ({ t: 'play', c }));
    } },
  whist: { E: require(ROOT + 'whist/engine.js'), low: false,
    value: (S) => S.lastHand ? S.lastHand.tricks[0] : 0,
    moves(E, S) { return E.legal(S, 0).map((c) => ({ t: 'play', c })); } },
};
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const done = (S) => S.phase === 'handEnd' || S.phase === 'over';
// the Hint's move, or what the game needs from you when the Hint has nothing to say (Cribbage's show: count)
function hintOf(g, E, S) {
  const m = E.hint(S);
  if (m) return m;
  const L = g.moves(E, S);
  return L && L.length ? L[0] : null;
}
// one hand: first = your first choice (a pass / a discard) or null; eps = how often to stray from the Hint
function play(game, seed, lv, first, eps, r) {
  const g = G[game], E = g.E, S = E.newMatch(seed, lv), log = [];
  let guard = 0, firstDone = !first;
  while (!done(S) && guard++ < 4000) {
    let m = E.auto(S);
    if (m) { E.apply(S, m); continue; }
    if (!firstDone) { m = first; firstDone = true; }
    else if (eps && r() < eps) {
      const L = g.moves(E, S);
      m = L && L.length ? L[Math.floor(r() * L.length)] : hintOf(g, E, S);
      if (!L) m = randomFirst(game, E, S, r) || m;
    } else m = hintOf(g, E, S);
    if (!m || !E.apply(S, m)) throw new Error(game + ' seed ' + seed + ': no move at ' + S.phase + ' ' + JSON.stringify(m));
    log.push(E.code ? E.code(m) : m);
  }
  if (!done(S)) throw new Error(game + ' seed ' + seed + ': the hand never ended');
  return { v: g.value(S), flag: g.flag ? g.flag(S) : false, log };
}
function combos(arr, k) { const out = []; (function go(s, pick) { if (pick.length === k) { out.push(pick.slice()); return; } for (let i = s; i < arr.length; i++) { pick.push(arr[i]); go(i + 1, pick); pick.pop(); } })(0, []); return out; }
// every first choice there is: Hearts' 286 passes, Cribbage's 15 discards (null when the game has none)
function firsts(game, seed, lv) {
  const g = G[game], E = g.E, S = E.newMatch(seed, lv);
  if (game === 'hearts' && S.phase === 'pass') return combos(S.hands[0], 3).map((cards) => ({ t: 'pass', cards }));
  if (game === 'cribbage') return combos(S.hands[0], 2).map((cards) => ({ t: 'discard', cards }));
  return null;
}
function randomFirst(game, E, S, r) {
  if (game === 'hearts' && S.phase === 'pass') { const h = S.hands[0].slice(), out = []; while (out.length < 3) out.push(h.splice(Math.floor(r() * h.length), 1)[0]); return { t: 'pass', cards: out }; }
  if (game === 'cribbage' && S.phase === 'discard') { const h = S.hands[0].slice(), out = []; while (out.length < 2) out.push(h.splice(Math.floor(r() * h.length), 1)[0]); return { t: 'discard', cards: out }; }
  return null;
}
// the whole search for one deal: the Hint's line (bot), the best line found (best), and how the results spread
function search(game, seed, lv, tries) {
  const g = G[game], r = rng(seed * 7 + lv), better = (a, b) => g.low ? a < b : a > b;
  const bot = play(game, seed, lv, null, 0, r);
  let best = bot, n = 1, flagged = bot.flag ? bot : null;
  const see = (x) => { n++; if (better(x.v, best.v)) best = x; if (x.flag && (!flagged || better(x.v, flagged.v))) flagged = x; };
  const F = firsts(game, seed, lv);
  if (F) F.forEach((f) => see(play(game, seed, lv, f, 0, r)));
  for (let i = 0; i < tries; i++) {
    const eps = [0.08, 0.15, 0.3][i % 3];
    const f = F && r() < 0.5 ? F[Math.floor(r() * F.length)] : null;
    see(play(game, seed, lv, f, eps, r));
  }
  return { bot: bot.v, botLine: bot.log, best: best.v, line: best.log, flag: flagged ? { v: flagged.v, line: flagged.log } : null, n };
}
// replay a line of your moves (as E.code strings) - the tests check every level's lines this way
function decode(game, code) {
  const k = code.charAt(0), rest = code.slice(1), nums = rest ? rest.split('.').map(Number) : [];
  if (k === 'P') return { t: 'pass', cards: nums };
  if (k === 'C') return { t: 'discard', cards: nums };
  if (k === 'c') return { t: game === 'gin' ? 'discard' : 'play', c: nums[0] };
  if (k === 'K') return { t: 'knock', c: nums[0] };
  if (k === 'D') return { t: 'draw', from: 'pile' };
  if (k === 'S') return { t: 'draw', from: 'stock' };
  if (k === 'T') return { t: 'count' };
  if (k === 'N') return { t: 'next' };
  return null;
}
function replay(game, seed, lv, codes) {
  const g = G[game], E = g.E, S = E.newMatch(seed, lv);
  let i = 0, guard = 0;
  while (!done(S) && guard++ < 4000) {
    const m = E.auto(S);
    if (m) { E.apply(S, m); continue; }
    if (i >= codes.length) return null;
    const mv = decode(game, codes[i++]);
    if (!mv || !E.apply(S, mv)) return null;
  }
  return done(S) && i === codes.length ? { v: g.value(S), flag: g.flag ? g.flag(S) : false } : null;
}
// Hearts: going for the moon in your seat - pass your lowest plain cards, lead from the top, win every trick with
// points in it (eps: how often to try something else). The first line that takes all 26 is returned.
function moonSearch(seed, lv, tries) {
  const E = G.hearts.E, r = rng(seed * 11 + lv);
  for (let t = 0; t < tries; t++) {
    const eps = t ? 0.12 : 0, S = E.newMatch(seed, lv), log = [];
    while (!done(S)) {
      let m = E.auto(S);
      if (m) { E.apply(S, m); continue; }
      if (S.phase === 'pass') {
        const h = S.hands[0].slice().sort((a, b) => E.hi(a) - E.hi(b) || a - b).filter((c) => E.suit(c) !== E.HE);
        const k = r() < eps ? 1 : 0;
        m = { t: 'pass', cards: h.length >= 3 + k ? h.slice(k, k + 3) : S.hands[0].slice(0, 3) };
      } else {
        const L = E.legal(S, 0);
        if (r() < eps) m = { t: 'play', c: L[Math.floor(r() * L.length)] };
        else if (!S.trick.length) m = { t: 'play', c: L.reduce((a, c) => E.hi(c) > E.hi(a) ? c : a) };
        else {
          const w = E.winnerOf(S.trick), led = E.suit(S.trick[0].c), over = L.filter((c) => E.suit(c) === led && E.hi(c) > E.hi(w.c));
          const plain = L.filter((c) => E.pts(c) === 0);
          m = { t: 'play', c: over.length ? over.reduce((a, c) => E.hi(c) > E.hi(a) ? c : a) : plain.length ? plain.reduce((a, c) => E.hi(c) < E.hi(a) ? c : a) : L[0] };
        }
      }
      E.apply(S, m); log.push(E.code(m));
    }
    if (S.lastHand && S.lastHand.moon === 0) return log;
  }
  return null;
}
module.exports = { G, play, search, firsts, replay, decode, rng, done, moonSearch };
