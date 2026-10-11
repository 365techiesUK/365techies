/* 365 Games, opened from 365 PC Manager (5 Oct 2026). The app's Games lobby has "Open the Games Hub", which opens this
   page in its own window with ?from=pcm (owner: "a proper game interface ... a premium sort of gateway to our games").
   There the website's header, footer, call bar, page heading, FAQ and the PC Manager advert go (they are already in
   PC Manager), and a slim 365 Games bar takes their place, so the launcher - the greeting, daily challenges, every game
   and the Hall of Fame - fills the window like a games console. The cookie banner and the text-size button stay.
   The mode lasts for the visit in that window (sessionStorage) and is passed on to the links into our games.
   Loaded in <head> (games_hub_page.py, HEAD_EXTRA) so the website's header never flashes up first. Plain ES5.
   11 Oct 2026: the same console look when the hub runs as the installed 365 Games app (the Microsoft Store app, or the
   web app installed from the browser): owner, "this is for games, not trying to sell them support". An app window
   reports its display mode, and the app's start address carries ?src=app. The app needs no sessionStorage and no
   link tagging: every page it opens is in the same app window. */
(function () {
  var pcm = /[?&]from=pcm(&|#|$)/.test(location.search), app = /[?&]src=app(&|#|$)/.test(location.search);
  try {
    app = app || navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui), (display-mode: window-controls-overlay)').matches);
  } catch (e) {}
  try { if (pcm) sessionStorage.setItem('pcm-mode', '1'); else pcm = sessionStorage.getItem('pcm-mode') === '1'; } catch (e) {}
  if (!pcm && !app) return;
  var d = document.documentElement;
  d.className += (d.className ? ' ' : '') + 'pcm' + (app ? ' app365' : '');
  var css =
    'html.pcm .site-header,html.pcm #mobile-menu,html.pcm .site-footer,html.pcm .mobile-cta-bar,html.pcm .taskhead,html.pcm #faq,html.pcm .cta-band,' +
    'html.pcm .gh-pcm,html.pcm main>section:not(.gh){display:none!important}' +
    'html.pcm body{padding:0!important}' +
    'html.pcm .section.gh{padding-top:1.4rem}' +
    'html.app365 #hubspot-messages-iframe-container{display:none!important}' +   // the app: no support chat bubble either
    '.pcm-bar{position:sticky;top:0;z-index:40;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.4rem 1.2rem;' +
    'padding:.75rem var(--pad-x,1.5rem);background:linear-gradient(90deg,rgba(28,17,72,.97),rgba(8,30,66,.97));border-bottom:1px solid rgba(143,179,217,.18)}' +
    '.pcm-mark{font-family:var(--font-display,sans-serif);font-weight:700;font-size:1.45rem;letter-spacing:.01em;color:#eaf4ff;line-height:1.1}' +
    '.pcm-mark b{color:#1d97e3}' +
    '.pcm-note{font-family:var(--font-mono,monospace);font-size:.82rem;letter-spacing:.06em;text-transform:uppercase;color:#8fb3d9}' +
    '@media (max-width:560px){.pcm-bar{padding:.6rem 1rem}.pcm-note{font-size:.68rem;letter-spacing:.04em}}';   // a phone: the line fits under the name, not split in two
  var st = document.createElement('style');
  st.appendChild(document.createTextNode(css));
  (document.head || d).appendChild(st);
  function ready() {
    if (document.querySelector('.pcm-bar')) return;
    var bar = document.createElement('div');
    bar.className = 'pcm-bar';
    bar.innerHTML = '<span class="pcm-mark"><b>365</b> Games</span><span class="pcm-note">No adverts · no sign-in · just play</span>';
    document.body.insertBefore(bar, document.body.firstChild);
    // links into our games keep the mode (before any #part of the address); PC Manager only, see above
    if (!pcm) return;
    var links = document.querySelectorAll('a[href^="/games/"],a[href^="https://365techies.co.uk/games/"]');
    for (var i = 0; i < links.length; i++) {
      var h = links[i].getAttribute('href'), hash = '', k = h.indexOf('#');
      if (h.indexOf('from=pcm') >= 0) continue;
      if (k >= 0) { hash = h.slice(k); h = h.slice(0, k); }
      links[i].setAttribute('href', h + (h.indexOf('?') < 0 ? '?' : '&') + 'from=pcm' + hash);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
