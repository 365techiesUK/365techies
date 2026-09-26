"""
/bournemouth/games/seafront/ - the landing page for Seafront, the Bournemouth browser game (26 Sep 2026).

WHY IT MOVED INTO THE SITE BUILD
Until 26 Sep 2026 this page was a hand-maintained index.html with no site header or footer. That was a
deliberate choice by the game project: pasting the site chrome into a hand-written page would create a
second copy that drifts. Its own note said the right move, if the page ever wanted the site furniture,
was to have the site's page builder generate it. The owner asked for exactly that ("make this page match
all the other pages... it hasn't got any header or footer"), so the page is now built here and gets the
real header, footer, cookie banner and consent handling like every other page.

THE STORE-PAGE LAYOUT (26 Sep 2026, owner: "show that it's actually a simulator as well and more
screenshots... like a premium page for the game or simulator")
Laid out like a game's store page: a silent highlight loop beside the title, a facts strip, the nine
levels as a picture gallery, the simulator with three silent loops, two stills and its own film, the
trailer, then how to play and the spec. Every picture and clip is the game's own render:
- media/lv-*.webp and hero-loop-v2.mp4: the landscape trailer's CLEAN frames (365-efoil-game/tmp-tr201/
  film/final/out16 - rendered before captions were added), one per level. hero-poster = the loop's first frame.
- media/sim-*.mp4 / .webp: the three ride-simulator Shorts and two stills from the ride-simulator film
  (tuning panel at 1:46, side-on instrument view at 1:51), captions included - they explain the physics.
- v3 (26 Sep, owner: "more gameplay... more fun... making people want to play it"): hero-loop-v3.mp4 is the game
  project's own 23 s gameplay cut (seven moments through the game camera with its HUD and banners: burning pier,
  ramp jump, dolphins, SEIZED!, rescue tow, PIER SAVED!, eFoil lift-off), from drafts/social/seafront-hero-loop-v3/;
  poster = its first frame. hero-loop-v2 / hero-poster retired.
- v2 (26 Sep): the out16 dolphins shot was filmed at 0.55x, which the game shows with a skipped frame in ten
  (judder). hero-loop-v2 and lv-dolphins-v2 use the smooth 0.5x take instead: out-dw2/cine16/S frames 1897-2068
  (dolphins leaping alongside the RIB, pier and big wheel behind), per the game project.
- media/trailer.mp4, ride-simulator.mp4: the finished films (music made in code, no licence), re-encoded
  for the web, preload="none" so they only download when someone presses play. When the owner uploads
  them to YouTube, swap these two for YouTube embeds and delete the files.
- The make script is scratchpad make_media.py (26 Sep session); frames/timestamps are listed in it.
Silent loops play only while on screen and never under prefers-reduced-motion or Save-Data.

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
  ⚠️ The same applies to media/: never overwrite a file in place - give a changed picture a new name.
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
from build_pages import add, graph, crumb_sub, webpage, bc_sub
import bournemouth_places as _pl

_SLUG = "bournemouth/games/seafront"
_BASE = "/bournemouth/games/seafront/"
_PLAY = _BASE + "play/"
_M = "media/"

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
  <meta name="apple-mobile-web-app-title" content="Seafront" />
  <link rel="preload" as="image" href="/bournemouth/games/seafront/media/hero-poster-v3.webp" />'''

# (slug-ish id, picture, name, one line) - the nine levels, in the game's own order
_LEVELS = [
    ("viking", "lv-viking", "Viking raid", "Longships at the pier. Save it."),
    ("pirate", "lv-pirate", "Pirate raid", "The same siege, a corsair fleet &mdash; and the pier on fire."),
    ("harbour", "lv-harbour", "The Harbour Mouth", "Hold the channel under Old Harry Rocks."),
    ("smuggle", "lv-smuggle", "The Smuggling Run", "The Dorset coast at night: creep up on the lugger."),
    ("rescue", "lv-rescue", "Rescue mode", "Swimmers in trouble off the beach. Slow right down beside them."),
    ("trip", "lv-trip", "The Trip Back", "A boatload too many in a swell."),
    ("stunt", "lv-stunt", "The Stunt Stage", "A ramp course off Boscombe: airtime, height and rotation all score."),
    ("dolphins", "lv-dolphins-v2", "Dolphin Watch", "Find the pod, go gently, and they ride your bow."),
    ("free", "lv-free", "Free ride", "Open water, nothing chasing you. Anywhere along the real coast."),
]

_CSS = '''
    <style>
      .sfp { --gold: #f2c14e; --line: rgba(232,237,244,.13); --card: rgba(255,255,255,.035);
             --soft: var(--muted, rgba(232,237,244,.64)); }
      .sfp-in { max-width: 1180px; margin: 0 auto; padding: 0 16px; }
      .sfp-narrow { max-width: 880px; }
      .sfp-kick { font: 600 .78rem/1.2 var(--font-mono, ui-monospace, monospace); letter-spacing: .14em;
                  text-transform: uppercase; color: var(--gold); margin: 0 0 .7rem; }
      .sfp h2 { font-size: clamp(1.7rem, 3.4vw, 2.5rem); line-height: 1.08; margin: 0 0 .7rem; letter-spacing: -.01em; }
      .sfp-lead { color: var(--soft); font-size: 1.08rem; line-height: 1.6; max-width: 62ch; margin: 0 0 1.4rem; }
      .sfp section { padding: clamp(2.6rem, 6vw, 4.6rem) 0 0; }

      /* ---- hero: title and buttons beside a silent highlight loop */
      /* the site header is fixed: clear it the way .page-hero does */
      .sfp-hero { position: relative; padding: calc(var(--header-h, 72px) + var(--ticker-h, 28px) + clamp(1rem, 3vw, 2.2rem)) 0 0 !important; overflow: hidden; }
      .sfp-hero::before { content: ""; position: absolute; inset: -20% -10% auto; height: 120%; pointer-events: none;
          background: radial-gradient(40% 55% at 78% 30%, rgba(29,151,227,.20), transparent 70%),
                      radial-gradient(30% 45% at 18% 20%, rgba(242,193,78,.12), transparent 70%); }
      .sfp-hero__grid { position: relative; display: grid; gap: 1.6rem 3rem; align-items: center;
          grid-template-columns: minmax(0, 1fr);
          grid-template-areas: "crumbs" "text" "media" "cta"; }
      @media (min-width: 980px) { .sfp-hero__grid { grid-template-columns: minmax(0, .9fr) minmax(0, 1.25fr);
          grid-template-areas: "crumbs media" "text media" "cta media"; align-content: center; } }
      .sfp-crumbs { grid-area: crumbs; align-self: end; }
      .sfp-text { grid-area: text; }
      .sfp-media { grid-area: media; }
      .sfp-cta { grid-area: cta; align-self: start; }
      .sfp-hero h1 { font-size: clamp(3rem, 8vw, 5.4rem); line-height: .95; letter-spacing: -.03em; margin: .2rem 0 .9rem; }
      .sfp-hero h1 span { display: block; font-size: .34em; letter-spacing: .02em; color: var(--gold); margin-top: .55rem; }
      .sfp-sub { color: var(--soft); font-size: clamp(1.05rem, 1.8vw, 1.2rem); line-height: 1.6; margin: 0; max-width: 46ch; }
      .sfp-frame { position: relative; border-radius: 18px; overflow: hidden; border: 1px solid var(--line);
                   background: #0b1426; box-shadow: 0 40px 90px -40px rgba(29,151,227,.55), 0 0 0 1px rgba(242,193,78,.08); }
      .sfp-frame video, .sfp-frame img { display: block; width: 100%; max-width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; }
      .sfp-tag { position: absolute; left: 12px; bottom: 12px; font: 600 .7rem/1 var(--font-mono, monospace); letter-spacing: .12em;
                 text-transform: uppercase; background: rgba(4,9,20,.72); color: #e8edf4; padding: .45rem .6rem; border-radius: 6px; }
      .sfp-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 0; }
      .sfp-play { display: inline-flex; align-items: center; justify-content: center; gap: .55rem; min-height: 58px; padding: 0 32px;
                  border-radius: 999px; background: var(--gold); color: #12151a; font-size: 1.2rem; font-weight: 800; text-decoration: none;
                  box-shadow: 0 16px 40px -16px rgba(242,193,78,.8); }
      .sfp-play:hover { filter: brightness(1.07); }
      .sfp-btn { min-height: 58px; padding: 0 22px; border-radius: 999px; cursor: pointer; font: inherit; font-weight: 700;
                 border: 1px solid rgba(232,237,244,.2); background: rgba(255,255,255,.05); color: inherit;
                 display: inline-flex; align-items: center; gap: .5rem; text-decoration: none; }
      .sfp-btn:hover { background: rgba(255,255,255,.11); }
      .sfp-btn[hidden] { display: none; }
      .sfp-note { color: var(--soft); font-size: .92rem; margin: .8rem 0 0; }

      /* ---- facts strip */
      .sfp-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; margin: clamp(2rem, 5vw, 3.2rem) 0 0;
                   list-style: none; padding: 0; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; background: var(--line); }
      @media (min-width: 760px) { .sfp-facts { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
      .sfp-facts li { background: #0a1224; padding: 1rem 1.1rem; }
      .sfp-facts b { display: block; font-size: 1.55rem; line-height: 1.1; color: #fff; }
      .sfp-facts span { color: var(--soft); font-size: .9rem; }

      /* ---- level gallery */
      .sfp-levels { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); list-style: none; padding: 0; margin: 0; }
      .sfp-level { background: var(--card); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
      .sfp-shot { display: block; width: 100%; padding: 0; border: 0; background: none; cursor: zoom-in; position: relative; }
      .sfp-shot img { display: block; width: 100%; max-width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; transition: transform .5s ease; }
      .sfp-shot:hover img, .sfp-shot:focus-visible img { transform: scale(1.04); }
      .sfp-num { position: absolute; left: 10px; top: 10px; font: 700 .72rem/1 var(--font-mono, monospace); letter-spacing: .1em;
                 background: rgba(4,9,20,.75); color: var(--gold); padding: .4rem .55rem; border-radius: 6px; }
      .sfp-level h3 { font-size: 1.12rem; margin: .9rem 1rem .25rem; }
      .sfp-level p { color: var(--soft); font-size: .95rem; line-height: 1.5; margin: 0 1rem 1rem; }

      /* ---- simulator */
      .sfp-sim { display: grid; gap: 2rem 3rem; grid-template-columns: minmax(0, 1fr); align-items: start; }
      @media (min-width: 980px) { .sfp-sim { grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); } }
      .sfp-sim ul { margin: 0 0 1rem; padding-left: 1.2rem; }
      .sfp-sim li { margin: .55rem 0; line-height: 1.55; }
      .sfp-loops { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(170px, 1fr); gap: 12px; overflow-x: auto;
                   scroll-snap-type: x mandatory; padding-bottom: 4px; }
      .sfp-loop { scroll-snap-align: start; margin: 0; }
      .sfp-loop .sfp-frame video, .sfp-loop .sfp-frame img { aspect-ratio: 9 / 16; }
      .sfp-loop figcaption { font-size: .88rem; color: var(--soft); margin-top: .5rem; }
      .sfp-stills { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); margin: 1.6rem 0 0; }
      .sfp-stills figure { margin: 0; }
      .sfp-stills figcaption { font-size: .9rem; color: var(--soft); margin-top: .5rem; }
      .sfp kbd { font: 13px/1 ui-monospace, Menlo, Consolas, monospace; background: rgba(255,255,255,.08);
                 border: 1px solid var(--line); border-radius: 4px; padding: 3px 6px; }

      /* ---- films */
      .sfp-films { display: grid; gap: 22px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); }
      .sfp-films figure { margin: 0; }
      .sfp-films video { background: #000; }
      .sfp-films figcaption { margin-top: .6rem; }
      .sfp-films figcaption b { display: block; font-size: 1.05rem; }
      .sfp-films figcaption span { color: var(--soft); font-size: .92rem; }

      /* ---- how to play + spec (unchanged content) */
      .sfp-cols { display: grid; gap: 0 36px; grid-template-columns: 1fr; }
      @media (min-width: 660px) { .sfp-cols { grid-template-columns: 1fr 1fr; } }
      .sfp-cols h3 { font-size: 1.15rem; margin: 0 0 .5rem; }
      .sfp-cols ul { margin: 0 0 1.2rem; padding-left: 20px; }
      .sfp-cols li { margin: 5px 0; }
      .sfp-spec { display: grid; grid-template-columns: 1fr; margin: 6px 0 18px; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
      .sfp-spec > div { padding: 11px 14px; border-top: 1px solid var(--line); font-size: 15px; }
      .sfp-spec > div:first-child { border-top: 0; }
      .sfp-spec .h { display: none; font-weight: 700; color: var(--gold); background: rgba(255,255,255,.04); }
      .sfp-spec .h span { display: block; font-weight: 400; font-size: 13px; color: var(--soft); }
      .sfp-spec .k { font-weight: 700; background: rgba(255,255,255,.05); }
      .sfp-spec .d { color: var(--soft); font-size: 13.5px; }
      .sfp-small { color: var(--soft); font-size: 15px; margin: 0 0 14px; }
      @media (min-width: 660px) {
        .sfp-spec { grid-template-columns: 150px 1fr 1fr; }
        .sfp-spec > div:nth-child(-n+3) { border-top: 0; }
        .sfp-spec .h { display: block; }
      }
      /* on a phone the header cells are hidden, so each value carries its own label; the .alt rule must carry the
         same two :not()s or it loses on specificity and every row reads "MINIMUM" */
      @media (max-width: 659px) {
        .sfp-spec > div:not(.k):not(.h)::before { content: "Minimum \\00a0"; display: block; font-size: 12px;
          letter-spacing: .06em; text-transform: uppercase; color: var(--gold); margin-bottom: 3px; }
        .sfp-spec > div.alt:not(.k):not(.h)::before { content: "Recommended \\00a0"; }
      }
      .sfp-final { text-align: center; padding-bottom: clamp(2.4rem, 6vw, 4rem) !important; }
      .sfp-final .sfp-row { justify-content: center; }

      /* ---- picture viewer */
      .sfp-lb { border: 0; padding: 0; background: transparent; max-width: min(1280px, 94vw); width: 100%; }
      .sfp-lb::backdrop { background: rgba(2,6,16,.88); }
      .sfp-lb img { width: 100%; max-width: 100%; height: auto; border-radius: 12px; display: block; }
      .sfp-lb p { color: #e8edf4; margin: .7rem 0 0; font-size: 1rem; }
      .sfp-lb button { position: absolute; right: 10px; top: 10px; min-width: 44px; min-height: 44px; border-radius: 999px; border: 0;
                       background: rgba(4,9,20,.8); color: #fff; font-size: 1.4rem; cursor: pointer; }
      @media (prefers-reduced-motion: reduce) { .sfp-shot img { transition: none; } }
    </style>'''


def _levels_html():
    cards = []
    for i, (lid, pic, name, line) in enumerate(_LEVELS, 1):
        cards.append(
            f'          <li class="sfp-level" id="level-{lid}"><button type="button" class="sfp-shot" '
            f'data-cap="{name}: {line}" aria-label="See the {name} picture larger">'
            f'<img loading="lazy" src="{_M}{pic}.webp" width="1280" height="720" decoding="async" alt="Seafront, {name}: {line}">'
            f'<span class="sfp-num">LEVEL {i:02d}</span></button><h3>{name}</h3><p>{line}</p></li>')
    return "\n".join(cards)


def _body(crumbs):
    return f'''
    <div class="sfp">
    <section class="sfp-hero" aria-label="Seafront">
      <div class="sfp-in">
        <div class="sfp-hero__grid">
          <nav class="breadcrumb sfp-crumbs" aria-label="Breadcrumb">{crumbs}</nav>
          <div class="sfp-text">
            <p class="sfp-kick">// Bournemouth365 &middot; free browser game</p>
            <h1>Seafront <span>A game and a ride simulator</span></h1>
            <p class="sfp-sub">A free browser game on the real Bournemouth seafront &mdash; the pier, the beach, Boscombe, and the Dorset coast round to Old Harry Rocks. No download, no sign-up.</p>
          </div>
          <div class="sfp-media">
            <div class="sfp-frame">
              <video class="sfp-auto" muted loop playsinline preload="none" poster="{_M}hero-poster-v3.webp" aria-label="Gameplay: carving past the burning pier, a ramp jump, dolphins at the bow, seizing the smugglers&rsquo; ship, a rescue tow, saving the pier and the eFoil lifting off">
                <source src="{_M}hero-loop-v3.mp4" type="video/mp4">
              </video>
              <span class="sfp-tag">Gameplay &middot; in your browser</span>
            </div>
          </div>
          <div class="sfp-cta">
            <p class="sfp-row">
              <a class="sfp-play" href="{_PLAY}">Play now &rarr;</a>
              <a class="sfp-btn" href="#trailer" data-play="trailer-video">&#9654; Watch the trailer</a>
              <button type="button" class="sfp-btn" id="btn-install" hidden>Add to home screen</button>
              <button type="button" class="sfp-btn" id="btn-share" hidden>Share</button>
            </p>
            <p class="sfp-note">Opens straight into the game. It takes a moment to load the first time.</p>
            <p class="sfp-note" id="ios-tip" hidden>To add it to your home screen on an iPhone or iPad: tap <b>Share</b> at the bottom of Safari, then <b>Add to Home Screen</b>.</p>
          </div>
        </div>
        <ul class="sfp-facts" aria-label="At a glance">
          <li><b>9 levels</b><span>raids, rescues, stunts and dolphins</span></li>
          <li><b>3 craft</b><span>an eFoil, a jet ski and a RIB</span></li>
          <li><b>Real physics</b><span>lift, planing hulls and a simulated sea</span></li>
          <li><b>Free</b><span>phone, tablet or PC &middot; no download</span></li>
        </ul>
      </div>
    </section>

    <section aria-labelledby="sfp-levels-h" id="how-to-play">
      <div class="sfp-in">
        <p class="sfp-kick">The game</p>
        <h2 id="sfp-levels-h">Nine ways to play</h2>
        <p class="sfp-lead">Every level is the real Bournemouth water: the pier, Boscombe, the beach and the coast out to Old Harry Rocks. Tap a picture to see it larger.</p>
        <ul class="sfp-levels">
{_levels_html()}
        </ul>
      </div>
    </section>

    <section aria-labelledby="sfp-sim-h" id="simulator">
      <div class="sfp-in">
        <p class="sfp-kick">The simulator</p>
        <h2 id="sfp-sim-h">A ride simulator too</h2>
        <div class="sfp-sim">
          <div>
            <p class="sfp-lead" style="margin-bottom:1rem">Under the levels, Seafront is a physics simulation of an eFoil, a jet ski and a rigid inflatable on the real Bournemouth water. Free ride has no score and no clock: pick a craft, pick a sea, and ride.</p>
            <ul>
              <li><b>The eFoil flies on the lift equation</b>: water density, speed, wing area and angle of attack. A small change in speed makes a big change in lift, so it is as touchy as the real thing, and the game shows you the live figure. Bring the wing too close to the surface and it ventilates and drops you.</li>
              <li><b>The jet ski and the RIB are planing hulls.</b> They climb over the hump before they get on the plane, lose drive when the prop or jet leaves the water, and pay for a hard turn in speed.</li>
              <li><b>The sea is simulated rather than animated</b>, so the swell you are riding is the swell the boat is reacting to. The default is Poole Bay&rsquo;s most common sea, about half a metre every four seconds from the south-south-west, and it goes from glassy calm to a two-metre storm.</li>
              <li><b>On a computer:</b> <kbd>T</kbd> opens the tuning panel (all-up weight, wing area, mast length, motor power and more), <kbd>G</kbd> shows live charts of wing depth, lift and speed, <kbd>,</kbd> and <kbd>.</kbd> change the sea, and <kbd>C</kbd> cycles the camera, including a side-on instrument view.</li>
            </ul>
            <p>The coast is built from survey data rather than drawn by eye. It is a game built on real physics, not a training tool.</p>
          </div>
          <div class="sfp-loops" role="group" aria-label="The simulator in motion">
            <figure class="sfp-loop"><div class="sfp-frame"><video class="sfp-auto" muted loop playsinline preload="none" poster="{_M}sim-efoil.webp" aria-label="The eFoil lifting off"><source src="{_M}sim-efoil.mp4" type="video/mp4"></video></div><figcaption>The eFoil lifts off</figcaption></figure>
            <figure class="sfp-loop"><div class="sfp-frame"><video class="sfp-auto" muted loop playsinline preload="none" poster="{_M}sim-rib-loop.webp" aria-label="The RIB climbing over the hump onto the plane"><source src="{_M}sim-rib-loop.mp4" type="video/mp4"></video></div><figcaption>The RIB climbs onto the plane</figcaption></figure>
            <figure class="sfp-loop"><div class="sfp-frame"><video class="sfp-auto" muted loop playsinline preload="none" poster="{_M}sim-storm.webp" aria-label="Riding into rougher sea"><source src="{_M}sim-storm.mp4" type="video/mp4"></video></div><figcaption>Glassy calm to a two-metre storm</figcaption></figure>
          </div>
        </div>
        <div class="sfp-stills">
          <figure><button type="button" class="sfp-shot" data-cap="The tuning panel: weight, wing area, mast length, motor power and more" aria-label="See the tuning panel picture larger"><img loading="lazy" src="{_M}sim-tuning.webp" width="1280" height="720" decoding="async" alt="Seafront's tuning panel open beside an eFoil rider off Bournemouth Pier"></button><figcaption><kbd>T</kbd> the tuning panel, with <kbd>G</kbd> live charts along the bottom</figcaption></figure>
          <figure><button type="button" class="sfp-shot" data-cap="The side-on instrument view: the wing, the mast and the water line" aria-label="See the instrument view picture larger"><img loading="lazy" src="{_M}sim-sideview.webp" width="1280" height="720" decoding="async" alt="Seafront's side-on instrument view of the eFoil, showing the wing and mast under the water line"></button><figcaption><kbd>C</kbd> the side-on instrument view: wing, mast and water line</figcaption></figure>
        </div>
      </div>
    </section>

    <section aria-labelledby="sfp-films-h" id="trailer">
      <div class="sfp-in">
        <p class="sfp-kick">Watch</p>
        <h2 id="sfp-films-h">The trailer, and the simulator film</h2>
        <div class="sfp-films">
          <figure><div class="sfp-frame"><video id="trailer-video" controls playsinline preload="none" poster="{_M}trailer-poster.webp" data-title="Seafront trailer"><source src="{_M}trailer.mp4" type="video/mp4"></video></div>
            <figcaption><b>The trailer</b><span>34 seconds of the levels, from Vikings at the pier to the dolphins.</span></figcaption></figure>
          <figure><div class="sfp-frame"><video id="sim-video" controls playsinline preload="none" poster="{_M}ride-simulator-poster.webp" data-title="Seafront ride simulator"><source src="{_M}ride-simulator.mp4" type="video/mp4"></video></div>
            <figcaption><b>The ride simulator</b><span>Two minutes on the eFoil, the RIB and the jet ski, from glassy calm to a storm.</span></figcaption></figure>
        </div>
      </div>
    </section>

    <section aria-labelledby="sfp-ctl-h">
      <div class="sfp-in sfp-narrow">
        <p class="sfp-kick">How to play</p>
        <h2 id="sfp-ctl-h">Controls, and what you need</h2>
        <div class="sfp-cols">
          <div>
            <h3>Controls</h3>
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
          </div>
          <div>
            <h3>You will need</h3>
            <ul>
              <li>A browser with WebGL2 &mdash; anything current</li>
              <li>Hardware acceleration switched on (it is, by default)</li>
            </ul>
          </div>
        </div>
        <h2 id="sfp-run-h" style="margin-top:1.6rem">Will it run on mine?</h2>
        <p class="sfp-small">Almost certainly. It is a browser game and it asks for very little &mdash; about 5MB to download and nothing installed.</p>
        <div class="sfp-spec">
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
        <p class="sfp-small"><strong>A graphics card makes no difference.</strong> We measured it rather than guessed: on a fast card the game asks the graphics chip for roughly three hundredths of a millisecond of work per frame, and going from a 1080p screen to a 4K one barely moved that. What decides your frame rate is the processor. A built-in Intel or AMD graphics chip has all the headroom this game needs, and an expensive card will not make it any smoother.</p>
        <p class="sfp-small">It is light on power for the same reason. On a desktop with a high-end graphics card, playing this draws about <strong>twelve watts</strong> more than leaving the machine idle &mdash; on a card rated for three hundred and fifty.</p>
      </div>
    </section>

    <section class="sfp-final" aria-label="Play">
      <div class="sfp-in">
        <h2>Ready to ride?</h2>
        <p class="sfp-row"><a class="sfp-play" href="{_PLAY}">Play Seafront free &rarr;</a></p>
        <p class="sfp-small" style="margin-top:1.2rem">Contains Environment Agency information &copy; Environment Agency and/or database right. Made in Bournemouth by 365 Techies.</p>
      </div>
    </section>

    <dialog class="sfp-lb" id="sfp-lb" aria-label="Picture"><button type="button" aria-label="Close">&times;</button><img alt=""><p></p></dialog>
    </div>'''


# Install + share (behaviour unchanged from the hand-made page: a button appears only when it can do something;
# iOS gets the instruction; share falls back to copying the link), the utm pass-through, the silent loops
# (only while on screen, never under reduced motion or Save-Data), the trailer button, film start events and
# the picture viewer.
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
        var data = { title: 'Seafront \\u2014 a Bournemouth game', text: 'A free browser game and ride simulator on the real Bournemouth seafront.', url: URL_ };
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

      // ---- silent loops: play only while on screen; never with reduced motion or Save-Data (the poster stays)
      var calm = false;
      try { calm = matchMedia('(prefers-reduced-motion: reduce)').matches || !!(navigator.connection && navigator.connection.saveData); } catch (e) {}
      var loops = Array.prototype.slice.call(document.querySelectorAll('video.sfp-auto'));
      if (calm) { loops.forEach(function (v) { v.controls = true; }); }
      else if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            var v = e.target;
            if (e.isIntersecting) { if (v.preload === 'none') { v.preload = 'auto'; } var p = v.play(); if (p && p.catch) p.catch(function () {}); }
            else { v.pause(); }
          });
        }, { threshold: 0.35 });
        loops.forEach(function (v) { io.observe(v); });
      }

      // ---- "Watch the trailer": go to it and start it; count film starts
      Array.prototype.forEach.call(document.querySelectorAll('[data-play]'), function (a) {
        a.addEventListener('click', function (e) {
          var v = document.getElementById(a.getAttribute('data-play')); if (!v) return;
          e.preventDefault();
          v.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll('video[controls][data-title]'), function (v) {
        var sent = false;
        v.addEventListener('play', function () {
          if (sent) return; sent = true;
          if (window.gtag) gtag('event', 'video_start', { video_title: v.getAttribute('data-title'), video_provider: 'self' });
        });
      });

      // ---- picture viewer
      var lb = document.getElementById('sfp-lb');
      if (lb && typeof lb.showModal === 'function') {
        var lbImg = lb.querySelector('img'), lbCap = lb.querySelector('p');
        Array.prototype.forEach.call(document.querySelectorAll('.sfp-shot'), function (b) {
          b.addEventListener('click', function () {
            lbImg.src = b.querySelector('img').currentSrc || b.querySelector('img').src; lbImg.alt = b.getAttribute('data-cap') || '';
            lbCap.textContent = (b.getAttribute('data-cap') || '').replace(/&mdash;/g, '\\u2014');
            lb.showModal();
          });
        });
        lb.addEventListener('click', function (e) { if (e.target === lb || e.target.tagName === 'BUTTON') lb.close(); });
      }

      // ---- utm_* from this address onto each link into the game, so its own page view carries the campaign
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


def _video(vid, name, desc, poster, src, dur):
    return {"@type": "VideoObject", "@id": _bp.SITE + _BASE + "#" + vid, "name": name, "description": desc,
            "thumbnailUrl": [_bp.SITE + _BASE + _M + poster], "uploadDate": "2026-09-26T12:00:00+01:00",
            "duration": dur, "contentUrl": _bp.SITE + _BASE + _M + src,
            "inLanguage": "en-GB", "publisher": {"@id": _bp.SITE + "/#business"}}


def _schema(s):
    return graph([
        crumb_sub(s, "Bournemouth365", "bournemouth", "Seafront"),
        webpage(s, _TITLE, _DESC),
        _pl.ORG,
        {"@type": "VideoGame", "@id": _bp.SITE + _BASE + "#game", "name": "Seafront",
         "description": _DESC, "url": _bp.SITE + _BASE, "image": _bp.SITE + _BASE + "shot-pirate-raid.jpg",
         # no "screenshot" list: build_blog's eager-load guard finds a picture's FIRST mention, and this head
         # list would come before the lazy <img> tags (the guard then counts all nine as eager).
         "trailer": {"@id": _bp.SITE + _BASE + "#trailer-video"},
         "gamePlatform": "Web browser", "applicationCategory": "Game", "operatingSystem": "Any, with a WebGL2 browser",
         "genre": ["Simulation", "Action"], "inLanguage": "en-GB",
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"},
         "author": {"@id": _bp.SITE + "/#business"}},
        _video("trailer-video", "Seafront: the trailer", "34 seconds of Seafront's levels on the real Bournemouth seafront, from a Viking raid at the pier to the dolphins in the bay.",
               "trailer-poster.webp", "trailer.mp4", "PT34S"),
        _video("sim-video", "Seafront: the ride simulator", "An eFoil, a jet ski and a RIB on the real Bournemouth water: lift-off, a smaller wing, the side-on view, glassy calm to a two-metre storm, and free ride.",
               "ride-simulator-poster.webp", "ride-simulator.mp4", "PT2M10S"),
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
        content="\n".join([_CSS, _body(bc_sub("Bournemouth365", "/bournemouth/", "Seafront")), b365_band, _JS]),
        og_image=_BASE + "shot-pirate-raid.jpg",
    )
