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
      if (el.__fsMode) { el.style.touchAction = 'none'; return; }   /* full screen: map owns every finger */
      if (fingers >= 2) {
        el.style.touchAction = 'none';          /* two fingers: the map owns it */
      } else {
        el.style.touchAction = 'pan-y';         /* one finger: the page owns it */
      }
    }, { passive: true, capture: true });
    el.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1 && !el.__fsMode) {
        /* One-finger move: don't let Leaflet pan. Stop it reaching Leaflet's
           handlers; the browser still gets the gesture for page scroll because
           touch-action is pan-y and we never preventDefault.
           (In full screen __fsMode is set and this is skipped: one finger
            pans, because there is no page underneath to scroll.) */
        e.stopImmediatePropagation();
        showHint();
      }
    }, { passive: true, capture: true });
    el.addEventListener('touchend', function (e) {
      fingers = e.touches.length;
      if (fingers < 2) el.style.touchAction = el.__fsMode ? 'none' : 'pan-y';
    }, { passive: true, capture: true });
    el.addEventListener('touchcancel', function () {
      fingers = 0; el.style.touchAction = el.__fsMode ? 'none' : 'pan-y';
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

    /* ---- Full screen ---------------------------------------------------
       The touch rules above make the map step BACK from the page (one finger
       scrolls). Full screen is the deliberate opposite: tap in, the map IS the
       screen, one finger pans (there is no page to scroll), pinch zooms, and
       one obvious button gets you out. Both modes, each honest about which
       you're in. Uses the browser Fullscreen API where it exists (Android,
       desktop) and falls back to a fixed-position takeover where it doesn't
       (iPhone Safari does not allow element fullscreen). Escape / back button /
       the X all exit. */
    var wrap = el.parentElement;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lf-fs';
    btn.setAttribute('aria-label', 'View map full screen');
    btn.title = 'Full screen';
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
    btn.style.cssText = 'position:absolute;top:12px;right:12px;z-index:900;width:38px;height:38px;border-radius:10px;' +
      'border:1px solid rgba(125,170,220,.35);background:rgba(10,16,32,.88);color:#e6edf3;cursor:pointer;display:flex;' +
      'align-items:center;justify-content:center;backdrop-filter:blur(6px)';
    /* if the wrapper already has a control in the top-right (the van map's
       Signal/Speed/Best toggle), sit below it */
    if (wrap.querySelector('.sigmap-mode')) btn.style.top = '58px';
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    wrap.appendChild(btn);

    var exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.className = 'lf-fs-exit';
    exitBtn.setAttribute('aria-label', 'Exit full screen');
    exitBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg><span>Exit full screen</span>';
    exitBtn.style.cssText = 'position:absolute;top:max(12px,env(safe-area-inset-top));right:12px;z-index:100000;display:none;' +
      'align-items:center;gap:.5rem;padding:.7rem 1rem;border-radius:999px;border:1px solid rgba(125,170,220,.45);' +
      'background:rgba(10,16,32,.92);color:#fff;font:700 .95rem/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 30px rgba(0,0,0,.5)';
    /* The exit pill lives INSIDE the map wrapper, not on <body>. When the
       wrapper itself is the fullscreen element, only its own descendants are
       painted - a body-level button would be invisible in that mode. */
    exitBtn.style.position = 'absolute';
    wrap.appendChild(exitBtn);

    /* ⚠️ v1 fullscreened document.documentElement. On iPad that CALL SUCCEEDS
       (unlike iPhone), so the whole page went full-screen and the viewport
       stayed pinned to the top of the document - the owner saw the page
       header, not the map. Correct design: the map WRAPPER is the fullscreen
       element wherever the API exists (iPad, Android, desktop), so whatever
       goes full-screen IS the map. Fixed-position takeover is only the
       fallback for engines with no element fullscreen at all (iPhone Safari). */
    var saved = null, isFs = false, usedApi = false;
    var fsReq = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
    function takeover() {
      saved = { pos: wrap.style.position, top: wrap.style.top, left: wrap.style.left, w: wrap.style.width, h: wrap.style.height,
                z: wrap.style.zIndex, r: wrap.style.borderRadius, mapH: el.style.height, scroll: window.scrollY };
      wrap.style.position = 'fixed'; wrap.style.top = '0'; wrap.style.left = '0';
      wrap.style.width = '100vw'; wrap.style.height = '100vh'; wrap.style.zIndex = '99999'; wrap.style.borderRadius = '0';
      el.style.height = '100vh';
      document.body.style.overflow = 'hidden';
    }
    function untakeover() {
      if (!saved) return;
      wrap.style.position = saved.pos; wrap.style.top = saved.top; wrap.style.left = saved.left;
      wrap.style.width = saved.w; wrap.style.height = saved.h; wrap.style.zIndex = saved.z; wrap.style.borderRadius = saved.r;
      el.style.height = saved.mapH;
      document.body.style.overflow = '';
      var sc = saved.scroll; saved = null;
      setTimeout(function () { window.scrollTo(0, sc); }, 60);
    }
    function common(on) {
      document.body.classList.toggle('lf-fullscreen', on);
      btn.style.display = on ? 'none' : 'flex';
      exitBtn.style.display = on ? 'flex' : 'none';
      el.style.touchAction = on ? 'none' : 'pan-y';   /* full screen: one finger pans */
      el.__fsMode = on;
      setTimeout(function () { map.invalidateSize(); }, 80);
      setTimeout(function () { map.invalidateSize(); }, 400);
    }
    function enter() {
      if (isFs) return;
      isFs = true;
      usedApi = false;
      if (fsReq) {
        try {
          var p = fsReq.call(wrap);
          usedApi = true;
          if (p && p.catch) p.catch(function () { usedApi = false; takeover(); });
        } catch (e) { usedApi = false; }
      }
      if (!usedApi) takeover();
      /* the API path needs the map to fill the fullscreen element */
      if (usedApi) { el.__fsMapH = el.style.height; el.style.height = '100vh'; wrap.style.height = '100vh'; }
      common(true);
      try { history.pushState({ lfFs: true }, ''); } catch (e) {}
    }
    function exit(fromPop) {
      if (!isFs) return;
      isFs = false;
      var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl === wrap) {
        var ex = document.exitFullscreen || document.webkitExitFullscreen;
        if (ex) { try { var q = ex.call(document); if (q && q.catch) q.catch(function () {}); } catch (e) {} }
      }
      if (usedApi) { el.style.height = el.__fsMapH || ''; wrap.style.height = ''; }
      untakeover();
      common(false);
      if (!fromPop && history.state && history.state.lfFs) { try { history.back(); } catch (e) {} }
    }
    btn.addEventListener('click', enter);
    exitBtn.addEventListener('click', function () { exit(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isFs) exit(false); });
    /* user left fullscreen by the OS gesture / Esc handled by the browser */
    function onFsChange() {
      var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (isFs && usedApi && !fsEl) exit(false);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    window.addEventListener('popstate', function () { if (isFs) exit(true); });
  }
  window.makeTouchFriendly = makeTouchFriendly;
})();
