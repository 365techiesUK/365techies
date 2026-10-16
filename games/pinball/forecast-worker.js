/* 365 Pinball Hero - the camera's look-ahead, in a Web Worker (16 Oct 2026, next-gen wave 2). A plain file, no build
 * step. camera.js starts it and first sends { type: 'init', urls } - the exact script addresses the page itself loaded
 * (table.js, tables/*.js, engine.js, then camera.js), so the worker steps the very same engine as the game. Then each
 * { type: 'forecast', id, key, W, input, horizon } (W: a copy of the world, E.clone) is stepped ahead with the buttons
 * held and answered { id, key, r } - per ball, the steps until it is first inside a storey's approach zone (camera.js
 * PinCam.forecast). Until an answer arrives, camera.js treats every ball as close. */
/* global importScripts, self */
'use strict';
var ready = false, latest = null, busy = false;
function run(d) {
  var r = null;
  try { r = self.PinCam.forecast(d.W, d.input, d.horizon, 32); } catch (e) { r = null; }
  if (r) self.postMessage({ id: d.id, key: d.key, r: r });
}
// only the newest question matters: questions that pile up while one is being stepped are dropped
function soon() {
  if (busy || !ready || !latest) return;
  busy = true;
  setTimeout(function () { var d = latest; latest = null; busy = false; if (d) run(d); soon(); }, 0);
}
self.onmessage = function (e) {
  var d = e.data || {};
  if (d.type === 'init') {
    try { importScripts.apply(self, d.urls || []); ready = !!(self.PinEngine && self.PinCam); } catch (err) { ready = false; }
    if (!ready) { self.close(); return; }
    soon();
    return;
  }
  if (d.type === 'forecast') { latest = d; soon(); }
};
