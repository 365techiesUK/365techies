/* 365 Games, opened from 365 PC Manager (5 Oct 2026). The app's Games lobby has "Open the Games Hub", which opens this
   page in its own window with ?from=pcm (owner: "a proper game interface ... a premium sort of gateway to our games").
   There the website's header, footer, call bar, page heading, FAQ and the PC Manager advert go (they are already in
   PC Manager), and a slim 365 Games bar takes their place, so the launcher - the greeting, daily challenges, every game
   and the Hall of Fame - fills the window like a games console. The cookie banner and the text-size button stay.
   The mode lasts for the visit in that window (sessionStorage) and is passed on to the links into our games.
   Loaded in <head> (games_hub_page.py, HEAD_EXTRA) so the website's header never flashes up first. Plain ES5. */
(function () {
  var on = /[?&]from=pcm(&|#|$)/.test(location.search);
  try { if (on) sessionStorage.setItem('pcm-mode', '1'); else on = sessionStorage.getItem('pcm-mode') === '1'; } catch (e) {}
  if (!on) return;
  var d = document.documentElement;
  d.className += (d.className ? ' ' : '') + 'pcm';
  var css =
    'html.pcm .site-header,html.pcm .site-footer,html.pcm .mobile-cta-bar,html.pcm .taskhead,html.pcm #faq,html.pcm .cta-band,' +
    'html.pcm .gh-pcm,html.pcm main>section:not(.gh){display:none!important}' +
    'html.pcm body{padding:0!important}' +
    'html.pcm .section.gh{padding-top:1.4rem}' +
    '.pcm-bar{position:sticky;top:0;z-index:40;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.4rem 1.2rem;' +
    'padding:.75rem var(--pad-x,1.5rem);background:linear-gradient(90deg,rgba(28,17,72,.97),rgba(8,30,66,.97));border-bottom:1px solid rgba(143,179,217,.18)}' +
    '.pcm-mark{font-family:var(--font-display,sans-serif);font-weight:700;font-size:1.45rem;letter-spacing:.01em;color:#eaf4ff;line-height:1.1}' +
    '.pcm-mark b{color:#1d97e3}' +
    '.pcm-note{font-family:var(--font-mono,monospace);font-size:.82rem;letter-spacing:.06em;text-transform:uppercase;color:#8fb3d9}';
  var st = document.createElement('style');
  st.appendChild(document.createTextNode(css));
  (document.head || d).appendChild(st);
  function ready() {
    if (document.querySelector('.pcm-bar')) return;
    var bar = document.createElement('div');
    bar.className = 'pcm-bar';
    bar.innerHTML = '<span class="pcm-mark"><b>365</b> Games</span><span class="pcm-note">No adverts · no sign-in · just play</span>';
    document.body.insertBefore(bar, document.body.firstChild);
    // links into our games keep the mode (before any #part of the address)
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
