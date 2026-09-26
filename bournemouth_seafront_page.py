"""
/bournemouth/games/seafront/ - the landing page for Seafront, the Bournemouth browser game (26 Sep 2026).

WHY IT MOVED INTO THE SITE BUILD
Until 26 Sep 2026 this page was a hand-maintained index.html with no site header or footer. That was a
deliberate choice by the game project: pasting the site chrome into a hand-written page would create a
second copy that drifts. Its own note said the right move, if the page ever wanted the site furniture,
was to have the site's page builder generate it. The owner asked for exactly that ("make this page match
all the other pages... it hasn't got any header or footer"), so the page is now built here and gets the
real header, footer, cookie banner and consent handling like every other page.

WHAT WAS CARRIED OVER, AND WHY (the game project's reasons, kept)
- Analytics: the site's Google tag and Consent Mode are in the page template. The one difference the
  game project needed is kept in HEAD: when the address carries a campaign tag (utm_*), the library loads
  AT ONCE, because players arriving from YouTube/Facebook often tap Play straight away and leave before a
  lazy load would send the page view. The Play links also carry the utm tags into the game.
- Install: the page's own manifest (scope "./" covers this page AND play/, so the installed app opens
  straight into the game), the game's apple-touch-icon, and sw.js, which exists only so Chrome's install
  prompt can fire (it caches nothing). iOS has no install API, so there it shows the Share -> Add to Home
  Screen instruction instead of a button that cannot work.
- Share card: shot-pirate-raid.jpg, a NEW filename rather than an overwrite of shot.jpg, because .jpg is
  cached for a year by the proxy and by Facebook. shot.jpg stays in place for links already shared.
- The game at play/ keeps its noindex on purpose: this page carries the words, so this is the one that
  should rank; the game shell is a canvas with no text.
- Controls were written from the game's src/input.js, not from the in-game hint bar (which was wrong
  twice): the LEFT mouse button is the throttle, and Space reverses a boat but is the pop-up on the eFoil.
- The simulator claims are read from the game's source (plant.js, params.js, boats/hull.js,
  sea-state.js, main.js). "Not a training tool" is deliberate: the eFoil has not been checked against a
  real board, so nothing may claim it is accurate.
The game itself (play/) is deployed by the game project's tools/deploy-to-site.py and is NOT touched here.
"""
import build_pages as _bp
from build_pages import add, graph, crumb_sub, webpage, hero, bc_sub
import bournemouth_places as _pl

_SLUG = "bournemouth/games/seafront"
_BASE = "/bournemouth/games/seafront/"

_HEAD = '''
  <!-- Seafront: campaign visitors often tap Play at once, so load the Google tag now rather than on
       first interaction when the address carries utm_* (the template's lazy loader shares the flag). -->
  <script>
    (function () {
      if (!/[?&]utm_/.test(location.search) || window.__gtagLibLoaded) return;
      window.__gtagLibLoaded = true;
      var g = document.createElement('script'); g.async = true;
      g.src = 'https://www.googletagmanager.com/gtag/js?id=G-EBLTJ9WJXZ';
      document.head.appendChild(g);
    })();
  </script>
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="Seafront" />'''

_CSS = '''
    <style>
      .sfl { max-width: 880px; margin: 0 auto; }
      .sfl-shot { width: 100%; max-width: 100%; height: auto; display: block; border-radius: 14px;
                  border: 1px solid rgba(232,237,244,.14); margin: 0 0 22px; }
      .sfl-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 0; }
      /* 44px floor for a thumb, the same rule the game's own controls keep */
      .sfl-play { display: inline-flex; align-items: center; gap: 10px; min-height: 56px; padding: 0 30px;
                  border-radius: 999px; background: #f2c14e; color: #12151a; font-size: 20px; font-weight: 700;
                  text-decoration: none; letter-spacing: .01em; }
      .sfl-play:hover { filter: brightness(1.07); }
      .sfl-sec { min-height: 56px; padding: 0 22px; border-radius: 999px; cursor: pointer; font: inherit;
                 font-weight: 600; border: 1px solid rgba(232,237,244,.18); background: rgba(255,255,255,.05);
                 color: inherit; }
      .sfl-sec:hover { background: rgba(255,255,255,.11); }
      .sfl-sec[hidden] { display: none; }
      .sfl-after { color: var(--muted, rgba(232,237,244,.62)); font-size: 15px; margin: 14px 0 0; }
      .sfl h2 { margin: 1.6em 0 .5em; }
      .sfl ul { margin: 0 0 14px; padding-left: 20px; }
      .sfl li { margin: 5px 0; }
      .sfl kbd { font: 13px/1 ui-monospace, Menlo, Consolas, monospace; background: rgba(255,255,255,.08);
                 border: 1px solid rgba(232,237,244,.14); border-radius: 4px; padding: 3px 6px; }
      .sfl-cols { display: grid; gap: 0 36px; grid-template-columns: 1fr; }
      @media (min-width: 660px) { .sfl-cols { grid-template-columns: 1fr 1fr; } }
      /* a plain three-column grid, not a table: it collapses to a phone without a sideways scroll */
      .sfl-spec { display: grid; grid-template-columns: 1fr; margin: 6px 0 18px; border: 1px solid rgba(232,237,244,.14);
                  border-radius: 12px; overflow: hidden; }
      .sfl-spec > div { padding: 11px 14px; border-top: 1px solid rgba(232,237,244,.14); font-size: 15px; }
      .sfl-spec > div:first-child { border-top: 0; }
      .sfl-spec .h { display: none; font-weight: 700; color: #f2c14e; background: rgba(255,255,255,.04); }
      .sfl-spec .h span { display: block; font-weight: 400; font-size: 13px; color: var(--muted, rgba(232,237,244,.62)); }
      .sfl-spec .k { font-weight: 700; background: rgba(255,255,255,.05); }
      .sfl-spec .d { color: var(--muted, rgba(232,237,244,.62)); font-size: 13.5px; }
      .sfl-note { color: var(--muted, rgba(232,237,244,.62)); font-size: 15px; margin: 0 0 14px; }
      .sfl-note strong { color: inherit; }
      @media (min-width: 660px) {
        .sfl-spec { grid-template-columns: 150px 1fr 1fr; }
        .sfl-spec > div:nth-child(-n+3) { border-top: 0; }
        .sfl-spec .h { display: block; }
      }
      /* on a phone the header cells are hidden, so each value carries its own label; the .alt rule must
         carry the same two :not()s or it loses on specificity and every row reads "MINIMUM" */
      @media (max-width: 659px) {
        .sfl-spec > div:not(.k):not(.h)::before { content: "Minimum \\00a0"; display: block; font-size: 12px;
          letter-spacing: .06em; text-transform: uppercase; color: #f2c14e; margin-bottom: 3px; }
        .sfl-spec > div.alt:not(.k):not(.h)::before { content: "Recommended \\00a0"; }
      }
      .sfl-small { color: var(--muted, rgba(232,237,244,.62)); font-size: 14px; }
    </style>'''

_BODY = '''
    <section class="section" aria-label="The game">
      <div class="wrap">
        <div class="sfl">
          <img class="sfl-shot" src="shot-pirate-raid.jpg" width="1200" height="675" alt="A jet ski racing past a pirate brig with striped sails, open gun ports and crew along the rail, with Bournemouth Pier and the big wheel on the shore behind.">
          <p class="sfl-row">
            <a class="sfl-play" href="/bournemouth/games/seafront/play/">Play now &rarr;</a>
            <button type="button" class="sfl-sec" id="btn-install" hidden>Add to home screen</button>
            <button type="button" class="sfl-sec" id="btn-share" hidden>Share</button>
          </p>
          <p class="sfl-after">Opens straight into the game. It takes a moment to load the first time.</p>
          <p class="sfl-after" id="ios-tip" hidden>To add it to your home screen on an iPhone or iPad: tap <b>Share</b> at the bottom of Safari, then <b>Add to Home Screen</b>.</p>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="sfl-play-h" id="how-to-play">
      <div class="wrap">
        <div class="sfl sfl-cols">
          <div>
            <h2 id="sfl-play-h">Nine ways to play</h2>
            <ul>
              <li><b>Free ride</b> &mdash; open water, nothing chasing you.</li>
              <li><b>Rescue mode</b> &mdash; swimmers in trouble off the beach.</li>
              <li><b>Viking raid</b> &mdash; longships at the pier. Save it.</li>
              <li><b>Pirate raid</b> &mdash; the same siege, a corsair fleet.</li>
              <li><b>The Harbour Mouth</b> &mdash; Old Harry Rocks.</li>
              <li><b>The Smuggling Run</b> &mdash; the Dorset coast at night.</li>
              <li><b>The Stunt Stage</b> &mdash; a ramp course off Boscombe.</li>
              <li><b>The Trip Back</b> &mdash; a boatload too many in a swell.</li>
              <li><b>Dolphin Watch</b> &mdash; find the pod, go gently, and they ride your bow.</li>
            </ul>
          </div>
          <div>
            <h2>Controls</h2>
            <ul>
              <li><b>Mouse:</b> move to steer and trim</li>
              <li><b>Left button</b> throttle &middot; <b>right button</b> eases off, then reverses</li>
              <li>Or <kbd>A</kbd><kbd>D</kbd> steer &middot; <kbd>W</kbd><kbd>S</kbd> trim &middot; <kbd>&uarr;</kbd><kbd>&darr;</kbd> or scroll for throttle</li>
              <li><kbd>Space</kbd> reverses a boat &mdash; on the eFoil it is the pop-up</li>
              <li>In the raids: <kbd>Z</kbd> fire &middot; <kbd>X</kbd> water cannon</li>
              <li><kbd>C</kbd> camera &middot; <kbd>K</kbd> craft &middot; <kbd>L</kbd> levels &middot; <kbd>Esc</kbd> pause</li>
              <li>An <b>Xbox controller</b> works if you have one plugged in</li>
              <li>On a phone or tablet, it is all touch</li>
            </ul>
            <h2>You will need</h2>
            <ul>
              <li>A browser with WebGL2 &mdash; anything current</li>
              <li>Hardware acceleration switched on (it is, by default)</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="sfl-run-h">
      <div class="wrap">
        <div class="sfl">
          <h2 id="sfl-run-h">Will it run on mine?</h2>
          <p class="sfl-note">Almost certainly. It is a browser game and it asks for very little &mdash; about 5MB to download and nothing installed.</p>
          <div class="sfl-spec">
            <div class="h"></div>
            <div class="h">Minimum <span>about 30fps</span></div>
            <div class="h">Recommended <span>a steady 60fps</span></div>
            <div class="k">Phone</div>
            <div>Android from about 2019<br><span class="d">iPhone 8 or newer</span></div>
            <div class="alt">Android from about 2021<br><span class="d">iPhone XR or newer</span></div>
            <div class="k">Tablet</div>
            <div>iPad from about 2018</div>
            <div class="alt">Any iPad still getting updates</div>
            <div class="k">PC or laptop</div>
            <div>Intel 6th gen or similar, 2015<br><span class="d">4GB memory</span></div>
            <div class="alt">Intel 8th gen or Ryzen 2000, 2018<br><span class="d">8GB memory</span></div>
            <div class="k">Chromebook</div>
            <div>Mid-range<br><span class="d">the cheapest Celeron ones will be slow</span></div>
            <div class="alt">Core i3 or Ryzen 3 class</div>
          </div>
          <p class="sfl-note"><strong>A graphics card makes no difference.</strong> We measured it rather than guessed: on a fast card the game asks the graphics chip for roughly three hundredths of a millisecond of work per frame, and going from a 1080p screen to a 4K one barely moved that. What decides your frame rate is the processor. A built-in Intel or AMD graphics chip has all the headroom this game needs, and an expensive card will not make it any smoother.</p>
          <p class="sfl-note">It is light on power for the same reason. On a desktop with a high-end graphics card, playing this draws about <strong>twelve watts</strong> more than leaving the machine idle &mdash; on a card rated for three hundred and fifty.</p>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="sfl-sim-h">
      <div class="wrap">
        <div class="sfl">
          <h2 id="sfl-sim-h">A ride simulator too</h2>
          <p>Under the levels, Seafront is a physics simulation of an eFoil, a jet ski and a rigid inflatable on the real Bournemouth water. Free ride has no score and no clock: pick a craft, pick a sea, and ride.</p>
          <ul>
            <li><b>The eFoil flies on the lift equation</b>: water density, speed, wing area and angle of attack. A small change in speed makes a big change in lift, so it is as touchy as the real thing, and the game shows you the live figure. Bring the wing too close to the surface and it ventilates and drops you.</li>
            <li><b>The jet ski and the RIB are planing hulls.</b> They climb over the hump before they get on the plane, lose drive when the prop or jet leaves the water, and pay for a hard turn in speed.</li>
            <li><b>The sea is simulated rather than animated</b>, so the swell you are riding is the swell the boat is reacting to. The default is Poole Bay&rsquo;s most common sea, about half a metre every four seconds from the south-south-west, and it goes from glassy calm to a two-metre storm.</li>
            <li><b>On a computer:</b> <kbd>T</kbd> opens the tuning panel (all-up weight, wing area, mast length, motor power and more), <kbd>G</kbd> shows live charts of wing depth, lift and speed, <kbd>,</kbd> and <kbd>.</kbd> change the sea, and <kbd>C</kbd> cycles the camera, including a side-on instrument view.</li>
          </ul>
          <p>The coast is built from survey data rather than drawn by eye. It is a game built on real physics, not a training tool.</p>
          <p class="sfl-small">Contains Environment Agency information &copy; Environment Agency and/or database right. Made in Bournemouth by 365 Techies.</p>
        </div>
      </div>
    </section>'''

# Install + share, carried over unchanged in behaviour (see the module note): a button appears only when it
# can do something; iOS gets the instruction instead of a button; share falls back to copying the link.
_JS = '''
    <script>
    (function () {
      'use strict';
      var URL_ = 'https://365techies.co.uk/bournemouth/games/seafront/';
      var installBtn = document.getElementById('btn-install');
      var shareBtn = document.getElementById('btn-share');
      var iosTip = document.getElementById('ios-tip');
      function standalone() {
        try { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
        catch (e) { return false; }
      }
      var deferred = null;
      window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault(); deferred = e;
        if (!standalone()) { installBtn.hidden = false; }
      });
      installBtn.addEventListener('click', function () {
        if (!deferred) return;
        deferred.prompt();
        deferred.userChoice.then(function () { deferred = null; installBtn.hidden = true; });
      });
      window.addEventListener('appinstalled', function () { deferred = null; installBtn.hidden = true; if (iosTip) iosTip.hidden = true; });
      var ua = navigator.userAgent || '';
      var iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof document.ontouchend !== 'undefined');
      if (iOS && !standalone() && iosTip) { iosTip.hidden = false; }
      var canShare = typeof navigator.share === 'function';
      var canCopy = !!(navigator.clipboard && navigator.clipboard.writeText);
      if (canShare || canCopy) { shareBtn.hidden = false; }
      shareBtn.addEventListener('click', function () {
        var data = { title: 'Seafront \\u2014 a Bournemouth game', text: 'A free browser game on the real Bournemouth seafront.', url: URL_ };
        if (canShare) {
          navigator.share(data).catch(function () {});
          if (window.gtag) gtag('event', 'share', { method: 'native', content_type: 'game', item_id: 'seafront' });
          return;
        }
        if (window.gtag) gtag('event', 'share', { method: 'copy_link', content_type: 'game', item_id: 'seafront' });
        navigator.clipboard.writeText(URL_).then(function () {
          var was = shareBtn.textContent; shareBtn.textContent = 'Link copied';
          setTimeout(function () { shareBtn.textContent = was; }, 1800);
        }, function () {});
      });
      // sw.js caches nothing: it exists only so the install prompt can fire. Failure is silent.
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
      }
      // utm_* from this address onto each link into play/, so the game's own page view carries the campaign.
      var tags = [];
      try { new URLSearchParams(location.search).forEach(function (v, k) { if (/^utm_/.test(k)) tags.push([k, v]); }); } catch (e) {}
      if (!tags.length) return;
      Array.prototype.forEach.call(document.querySelectorAll('a[href^="/bournemouth/games/seafront/play/"]'), function (a) {
        try {
          var u = new URL(a.getAttribute('href'), location.href);
          tags.forEach(function (kv) { u.searchParams.set(kv[0], kv[1]); });
          a.setAttribute('href', u.pathname + u.search + u.hash);
        } catch (e) {}
      });
    }());
    </script>'''

_TITLE = "Seafront — a Bournemouth game"
_DESC = ("A free browser game and ride simulator on the real Bournemouth seafront. Ride an eFoil, a jet ski or a RIB "
         "past the pier, save it from a Viking raid, run the Dorset smuggling coast, or find the dolphins in the bay.")


def _schema(s):
    return graph([
        crumb_sub(s, "Bournemouth365", "bournemouth", "Seafront"),
        webpage(s, _TITLE, _DESC),
        _pl.ORG,
        {"@type": "VideoGame", "@id": _bp.SITE + _BASE + "#game", "name": "Seafront",
         "description": _DESC, "url": _bp.SITE + _BASE, "image": _bp.SITE + _BASE + "shot-pirate-raid.jpg",
         "gamePlatform": "Web browser", "applicationCategory": "Game", "operatingSystem": "Any, with a WebGL2 browser",
         "genre": ["Simulation", "Action"], "inLanguage": "en-GB",
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"},
         "author": {"@id": _bp.SITE + "/#business"}},
    ])


def register(b365_band):
    _bp.HEAD_EXTRA[_SLUG] = _HEAD
    _bp.MANIFEST_FOR[_SLUG] = _BASE + "app.webmanifest"          # scope ./ : this page AND play/
    _bp.TOUCH_ICON_FOR[_SLUG] = _BASE + "play/assets/apple-touch-icon.png"
    add(
        slug=_SLUG,
        title=_TITLE,
        desc=_DESC,
        og_title=_TITLE,
        schema=_schema,
        content="\n".join([
            _CSS,
            hero(bc_sub("Bournemouth365", "/bournemouth/", "Seafront"),
                 "// BOURNEMOUTH365 &middot; FREE GAME",
                 'Seafront',
                 "A free browser game on the real Bournemouth seafront &mdash; the pier, the beach, Boscombe, and the "
                 "Dorset coast round to Old Harry Rocks. No download, no sign-up.",
                 cta1=("Play now &rarr;", "/bournemouth/games/seafront/play/"), cta2=("How to play", "#how-to-play"),
                 chips=["Free, no sign-up", "Runs in your browser", "Made in Bournemouth"]),
            _BODY,
            b365_band,
            _JS,
        ]),
        og_image=_BASE + "shot-pirate-raid.jpg",
    )
