/* touch-friendly.js - stop a Leaflet map from swallowing the page on phones.
 *
 * THE PROBLEM. On touch, Leaflet claims every one-finger drag as a pan. Once a
 * map has been zoomed and fills the screen there is nothing left to grab, so
 * the visitor is trapped: every swipe moves the map, the page never scrolls.
 * The owner hit this on both the van map and the crowd map.
 *
 * THE FIX (the convention Google Maps embeds use, so people already know it):
 *   - ONE finger  -> scrolls the page. The map does not pan.
 *   - TWO fingers -> pans and pinch-zooms the map.
 *   - a short hint appears the first time someone one-finger-drags on the map,
 *     so it never feels broken.
 * Mouse and trackpad behaviour is unchanged: the trap only exists on touch, so
 * on desktop this function does nothing at all.
 *
 * Usage:  L.map(...) then  makeTouchFriendly(map)
 * Self-hosted, no dependencies beyond Leaflet itself.
 */
(function () {
  function makeTouchFriendly(map) {
    var el = map.getContainer();
    var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (!isTouch) return;                       /* desktop: nothing to fix */

    /* One finger must NOT drag the map, so the browser keeps it for scrolling. */
    map.dragging.disable();
    if (map.tap) map.tap.disable();
    map.touchZoom.enable();                     /* two-finger pinch still zooms */
    el.style.touchAction = 'pan-y';             /* browser: vertical scroll is yours */

    /* Two-finger pan: turn dragging on only while two fingers are down. */
    var hint = null, hintTimer = null;
    function showHint() {
      if (!hint) {
        hint = document.createElement('div');
        hint.textContent = 'Use two fingers to move the map';
        hint.setAttribute('aria-hidden', 'true');
        hint.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
          'z-index:1000;background:rgba(10,16,32,.88);color:#e6edf3;padding:.7rem 1rem;border-radius:12px;' +
          'font:600 .95rem/1.2 system-ui,sans-serif;pointer-events:none;border:1px solid rgba(125,170,220,.35);' +
          'transition:opacity .25s;opacity:0';
        el.appendChild(hint);
      }
      hint.style.opacity = '1';
      clearTimeout(hintTimer);
      hintTimer = setTimeout(function () { hint.style.opacity = '0'; }, 1400);
    }
    el.addEventListener('touchstart', function (e) {
      if (e.touches.length >= 2) {
        map.dragging.enable();
        el.style.touchAction = 'none';          /* two fingers: the map owns it */
      }
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1 && !map.dragging.enabled()) showHint();
    }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (e.touches.length < 2) {
        map.dragging.disable();
        el.style.touchAction = 'pan-y';
      }
    }, { passive: true });
  }
  window.makeTouchFriendly = makeTouchFriendly;
})();
