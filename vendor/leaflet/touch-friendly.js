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

    /* ---- Two more phone niceties, both about the map being THE thing ------

       1. body.map-in-view while any map is on screen. The site's fixed
          text-size pill (an accessibility control, so it must stay) was
          floating over the map on phones; CSS uses this class to shrink it
          to an icon in the corner while a map is visible.

       2. Rotation. Portrait -> landscape reflows the page to roughly half its
          height, but the browser keeps the PIXEL scroll offset, so you land
          somewhere else entirely. If people rotate on a map page, it is to
          see the map - so if a map was on screen before the rotation, snap
          back to it afterwards; otherwise restore whatever was centred. */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          el.__inView = e.isIntersecting;
          var any = [].slice.call(document.querySelectorAll('.leaflet-container')).some(function (c) { return c.__inView; });
          document.body.classList.toggle('map-in-view', any);
        });
      }, { threshold: 0.15 });
      io.observe(el);
    }
    if (!window.__mapRotateHooked) {
      window.__mapRotateHooked = true;
      var lastW = window.innerWidth, anchor = null;
      /* Remember what's mid-screen BEFORE any reflow - by the time 'resize'
         fires the layout has already moved and elementFromPoint would tell us
         about the wrong place. Sampled on scroll, cheaply. */
      var sampleT = null;
      window.addEventListener('scroll', function () {
        if (sampleT) return;
        sampleT = setTimeout(function () { sampleT = null;
          anchor = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2); }, 150);
      }, { passive: true });
      window.addEventListener('resize', function () {
        var w = window.innerWidth;
        if (Math.abs(w - lastW) < 120) return;        /* not a rotation - address bar etc. */
        lastW = w;
        var target = [].slice.call(document.querySelectorAll('.leaflet-container')).filter(function (c) { return c.__inView; })[0];
        if (!target) {
          var a = anchor;
          if (a && a.isConnected) setTimeout(function () { a.scrollIntoView({ block: 'center' }); }, 60);
          return;
        }
        setTimeout(function () {
          target.scrollIntoView({ block: 'start', behavior: 'auto' });
          /* Leaflet must re-measure after the container changed shape */
          if (target.__leafletMap) target.__leafletMap.invalidateSize();
        }, 120);
      });
    }
    el.__leafletMap = map;
  }
  window.makeTouchFriendly = makeTouchFriendly;
})();
