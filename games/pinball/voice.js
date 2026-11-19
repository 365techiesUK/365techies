/* 365 Pinball Hero - the voice (5 Nov 2026, wave 3): short callouts for the big moments, in our own words, spoken by
 * the device's own speech (speechSynthesis; a British English voice when the device has one), behind the Voice setting
 * (the page stores it as pin365:voice). At most one callout every 1.5 s: when several moments come together the most
 * important one is said, and a callout that has waited 2.5 s is dropped. A recorded line replaces the device's voice
 * for any callout listed in games/pinball/voice/voices.json (an array of ids, each recorded as voice/<id>.mp3) - the
 * page calls PinVoice.probe() to read it; none are shipped, so nothing is fetched by default. Without speechSynthesis
 * (and with no recording) it does nothing, silently.
 *
 * window.PinVoice:
 *   enable(on)                 the Voice setting (off also stops anything being said)
 *   events(W, list[, tMs])     after each engine step, with that step's events (tMs: a clock for tests)
 *   probe([base])              reads <base>voices.json (default games/pinball/voice/) and uses the recordings it lists
 *   LINES                      { id: [priority, text] }; state() -> { on, said: [{ id, t }], pending } for the tests
 * Plain ES5. */
(function (root) {
  'use strict';
  // id: [priority (higher wins), the words]
  var LINES = {
    bossdown: [10, 'Volcano defeated!'], superjackpot: [9, 'Super jackpot!'], stageclear: [9, 'Stage clear!'],
    multiball: [8, 'Multiball!'], extra: [8, 'Extra ball!'], dive: [8, 'Into the volcano!'], chamberclear: [8, 'Chamber cleared!'],
    jackpot: [7, 'Jackpot!'], supercombo: [7, 'Super combo!'], missiondone: [7, 'Mission complete!'], lavarise: [7, 'The lava is rising!'], bossphase: [7, 'The volcano fights back!'],
    eruptlit: [6, 'Erupt is lit - shoot the crater!'], addaball: [6, 'Another ball!'], plugsave: [6, 'Saved by the plug!'], modedone: [6, 'Mode complete!'],
    skill: [6, 'Skill shot!'], ascend: [6, 'Back to the surface!'],
    crabhunt: [5, 'Crab hunt!'], quarry: [5, 'Obsidian quarry!'], storm: [5, 'Orbit storm!'], heatwave: [5, 'Heat wave!'],
    locklit: [5, 'Lock is lit!'], lock: [5, 'Ball locked!'], divelit: [5, 'Dive is lit!'], unsealed: [5, 'The crater is open!'], overload: [5, 'Too much pressure!'],
    save: [4, 'Ball saved!'], sealed: [4, 'The crater is sealed!'], combo: [3, 'Combo!'], rumble: [3, 'The mountain rumbles!']
  };
  // engine event -> callout id (a function for the ones that depend on the world or the event)
  var MODES = ['crabhunt', 'quarry', 'storm', 'heatwave'], MODEKEYS = [/crab/i, /quarr|obsid/i, /storm|orbit/i, /heat|wave|ramp/i];
  function modeIdOf(W) {
    var m = W && W.goals ? W.goals.mode : null;
    if (m == null) return null;
    if (typeof m === 'number') return MODES[m] || null;
    if (typeof m === 'object') m = m.id != null ? m.id : m.name != null ? m.name : m.i != null ? m.i : m.index;
    if (typeof m === 'number') return MODES[m] || null;
    for (var q = 0; q < 4; q++) if (MODEKEYS[q].test(String(m))) return MODES[q];
    return null;
  }
  var EVENT = {
    mbstart: 'multiball', jackpot: 'jackpot', superjackpot: 'superjackpot', eruptlit: 'eruptlit', locklit: 'locklit', lock: 'lock', addaball: 'addaball',
    plugsave: 'plugsave', save: 'save', extra: 'extra', supercombo: 'supercombo', modedone: 'modedone', missiondone: 'missiondone', stageclear: 'stageclear',
    divelit: 'divelit', dive: 'dive', ascend: 'ascend', chamberclear: 'chamberclear', lavarise: 'lavarise', bossphase: 'bossphase', bossdown: 'bossdown',
    sealed: 'sealed', unsealed: 'unsealed', overload: 'overload', skill: 'skill', rumble: 'rumble',
    combo: function (W, e) { return e && e.n >= 3 ? 'combo' : null; },
    modestart: function (W) { return modeIdOf(W); }
  };
  var GAP = 1500, STALE = 2500;
  var ON = false, FILES = {}, BASE = 'games/pinball/voice/', said = [], pend = null, lastAt = -1e9, VOICE = null, AUDIO = null;
  function clock() { return root.performance && performance.now ? performance.now() : 0; }
  function synth() { try { return root.speechSynthesis && root.SpeechSynthesisUtterance ? root.speechSynthesis : null; } catch (e) { return null; } }
  function pickVoice(sy) {   // a British English voice if there is one, else any English one, else the default
    if (VOICE) return VOICE;
    var vs = []; try { vs = sy.getVoices ? sy.getVoices() || [] : []; } catch (e) { vs = []; }
    for (var i = 0; i < vs.length; i++) if (/^en[-_]GB/i.test(vs[i].lang || '')) return (VOICE = vs[i]);
    for (i = 0; i < vs.length; i++) if (/^en/i.test(vs[i].lang || '')) return vs[i];
    return null;
  }
  function say(id, t) {
    var L = LINES[id]; if (!L) return false;
    if (FILES[id] && root.Audio) {   // a recorded line
      try { if (AUDIO) AUDIO.pause(); AUDIO = new root.Audio(BASE + id + '.mp3'); var pr = AUDIO.play(); if (pr && pr.catch) pr.catch(function () {}); said.push({ id: id, t: t, file: true }); return true; } catch (e) {}
    }
    var sy = synth(); if (!sy) return false;
    try {
      var u = new root.SpeechSynthesisUtterance(L[1]), v = pickVoice(sy);
      u.lang = v && v.lang ? v.lang : 'en-GB'; if (v) u.voice = v; u.rate = 1.05; u.pitch = 1; u.volume = 1;
      if (sy.speaking || sy.pending) sy.cancel();   // (never a queue of stale callouts)
      sy.speak(u);
      said.push({ id: id, t: t });
      if (said.length > 200) said.splice(0, 100);
      return true;
    } catch (e) { return false; }
  }
  function flush(t) {
    if (pend && t - pend.t > STALE) pend = null;
    if (!pend || t - lastAt < GAP) return;
    if (say(pend.id, t)) lastAt = t;
    pend = null;
  }
  var api = {
    enable: function (on) {
      ON = !!on;
      if (!ON) { pend = null; var sy = synth(); try { if (sy) sy.cancel(); if (AUDIO) AUDIO.pause(); } catch (e) {} }
      return ON;
    },
    enabled: function () { return ON; },
    events: function (W, list, tMs) {
      if (!ON) return;
      var t = tMs != null ? tMs : clock();
      if (list && list.length) for (var i = 0; i < list.length; i++) {
        var e = list[i], n = typeof e === 'string' ? e : e && e.sfx, m = n && EVENT[n], id = typeof m === 'function' ? m(W, e) : m;
        if (!id || !LINES[id]) continue;
        if (!pend || LINES[id][0] > LINES[pend.id][0]) pend = { id: id, t: t };
      }
      flush(t);
    },
    probe: function (base) {
      if (base) BASE = base;
      if (!root.fetch) return null;
      try {
        return root.fetch(BASE + 'voices.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : []; }).then(function (ids) {
          FILES = {}; (ids || []).forEach(function (id) { if (LINES[id]) FILES[id] = true; }); return Object.keys(FILES);
        }).catch(function () { return []; });
      } catch (e) { return null; }
    },
    state: function () { return { on: ON, said: said.slice(), pending: pend ? pend.id : null, files: Object.keys(FILES) }; },
    reset: function () { said.length = 0; pend = null; lastAt = -1e9; VOICE = null; },
    LINES: LINES, EVENT: EVENT, GAP: GAP, version: 1
  };
  root.PinVoice = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
