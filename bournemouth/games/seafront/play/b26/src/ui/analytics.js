// src/ui/analytics.js — what the game tells Google Analytics (24 Sep 2026).
//
// WHY THIS EXISTS. The owner is about to put the game in front of people through YouTube Shorts
// and two Facebook pages, and until today nothing measured whether anyone played it: neither the
// game's landing page nor this page carried analytics, so no post could be judged by the one
// number that matters. Six events, all anonymous, none of them per frame:
//
//   game_loaded       the world is on screen: level, craft, touch or desktop, seconds to load
//   game_error        WebGL would not start - the visitors who cannot play at all
//   level_select      a row picked in the level sheet (and which level it was picked from)
//   level_end         a level finished, won or lost
//   craft_select      a change of craft
//   dolphins_bowride  the first time in a visit that the pod rides the player's bow
//
// Time played is not an event: GA4 measures engagement time on the page by itself.
//
// NOTHING IS SENT OFF THE LIVE SITE. track() is a no-op unless index.html's ANALYTICS block has
// defined window.gtag, and that block does so only on 365techies.co.uk and never under ?cal=. So
// local play, the 25 judged calibration renders and the node suites (no window at all) send
// nothing. Consent is the site's own Consent Mode v2 set-up, decided in index.html, not here.
// Nothing in this file may ever throw into the game.

import { LEVELS, asksWhichLevel } from './levels.js';

const on = () => typeof window !== 'undefined' && typeof window.gtag === 'function';

export function track(name, params) {
  if (!on()) return;
  try { window.gtag('event', name, params || {}); } catch (e) { /* analytics must never break play */ }
}

const sent = new Set();
/** track(), at most once per page load for this name. */
export function once(name, params) {
  if (sent.has(name)) return;
  sent.add(name);
  track(name, params);
}

// Which level a page address is: the inverse of levels.js levelURL(). A bare address opens on
// the level sheet rather than in any level, so it is 'picker'; ?start=0 with no mode is free ride.
export function levelFromSearch(search) {
  const q = new URLSearchParams(search || '');
  const mode = q.get('mode');
  if (!mode) return asksWhichLevel(search) ? 'picker' : 'free';
  for (const l of LEVELS) {
    if (!l.q || l.q.mode !== mode) continue;
    if ((l.q.raidfoe || null) !== (q.get('raidfoe') || null)) continue;
    if ((l.arena || null) !== (q.get('arena') || null)) continue;
    return l.id;
  }
  return 'unknown';
}

// Start Google's library. index.html defines the loader and deliberately does NOT call it: the
// game asks for it once it has booted, in the next idle moment, so ~90 KB of script never
// competes with the textures and shaders for a slow machine's attention.
export function startLibrary() {
  if (!on() || typeof window.__seafrontGtag !== 'function') return;
  const go = () => { try { window.__seafrontGtag(); } catch (e) { /* ignore */ } };
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(go, { timeout: 4000 });
  else setTimeout(go, 1500);
}

// game_loaded, once the textures are in - polled on a timer, not per frame. `status()` is the
// renderer's own status and `about()` is read at that moment (the craft may be chosen by then).
// After a minute it reports anyway, with whatever the texture count says, so a stalled load is
// counted rather than lost.
export function watchLoad(status, about) {
  if (!on()) return;
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const poll = () => {
    let tex = 'none';
    try { tex = String((status() || {}).textures || 'none'); } catch (e) { /* keep polling */ }
    const now = typeof performance !== 'undefined' ? performance.now() : t0 + 60001;
    if (/^\d+\/\d+$/.test(tex) || now - t0 > 60000) {
      let extra = {};
      try { extra = about() || {}; } catch (e) { /* send what we have */ }
      track('game_loaded', { ...extra, textures: tex, load_s: Math.round(now / 100) / 10 });
      startLibrary();
      return;
    }
    setTimeout(poll, 500);
  };
  setTimeout(poll, 500);
}
