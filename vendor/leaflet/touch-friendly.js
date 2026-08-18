/* touch-friendly.js - stop a Leaflet map from swallowing the page on phones,
 * WITHOUT breaking the mouse on a PC.
 *
 * THE PROBLEM. On touch, Leaflet claims every one-finger drag as a pan. Once a
 * map has been zoomed and fills the screen there is nothing left to grab, so
 * the visitor is trapped: every swipe moves the map, the page never scrolls.
 *
 * THE FIX (the convention Google Maps embeds use, so people already know it):
 *   - ONE finger  -> scrolls the page. The map does not pan.
 *   - TWO fingers -> pans and pinch-zooms the map.
 *   - a short hint appears the first time someone one-finger-drags on the map.
 *   - MOUSE drag ALWAYS pans, on every device.
 *
 * ⚠️ v1 OF THIS FILE GOT THAT LAST LINE WRONG. It decided "is this a touch
 * device?" from navigator.maxTouchPoints and, if so, disabled Leaflet's
 * dragging outright - which killed the MOUSE on any Windows PC or laptop with
 * a touchscreen (maxTouchPoints=10 on the owner's own machine). The map could
 * not be moved with a mouse at all. Lesson: never gate on "has touch hardware".
 * Decide per GESTURE: mouse events pan; touch events follow the finger rules.
 *
 * Usage:  L.map(...) then  makeTouchFriendly(map)
 * Self-hosted, no dependencies beyond Leaflet itself.
 */
(function () {
  function makeTouchFriendly(map) {
    var el = map.getContainer();

    /* Leaflet's own drag handler stays ENABLED (that is what the mouse uses).
       We only steer TOUCH: let the browser keep one-finger vertical scroll,
       and stop Leaflet's touch-drag from firing on a single finger. */
    el.style.touchAction = 'pan-y';

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

    /* Track how many fingers are down. With ONE finger we stop Leaflet's drag
       from starting (capture phase, before Leaflet sees it) so the browser
       scrolls the page instead. With TWO we let everything through: Leaflet's
       drag + pinch handle it. Mouse events never enter this code path. */
    var fingers = 0;
    el.addEventListener('touchstart', function (e) {
      fingers = e.touches.length;
      if (fingers >= 2) {
        el.style.touchAction = 'none';          /* two fingers: the map owns it */
      } else {
        el.style.touchAction = 'pan-y';         /* one finger: the page owns it */
      }
    }, { passive: true, capture: true });
    el.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1) {
        /* One-finger move: don't let Leaflet pan. Stop it reaching Leaflet's
           handlers; the browser still gets the gesture for page scroll because
           touch-action is pan-y and we never preventDefault. */
        e.stopImmediatePropagation();
        showHint();
      }
    }, { passive: true, capture: true });
    el.addEventListener('touchend', function (e) {
      fingers = e.touches.length;
      if (fingers < 2) el.style.touchAction = 'pan-y';
    }, { passive: true, capture: true });
    el.addEventListener('touchcancel', function () {
      fingers = 0; el.style.touchAction = 'pan-y';
    }, { passive: true, capture: true });
  }
  window.makeTouchFriendly = makeTouchFriendly;
})();
