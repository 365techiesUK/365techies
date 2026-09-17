"""
/bournemouth/weather/ - Bournemouth seafront weather, tides, radar, satellite and the sea (16 Sep 2026).

Owner brief: "make our weather page the best - tide times, sea temperature, wind speed and direction,
premium, satellite images". Research + source/licence decisions are in
C:/claude/seo-research/bournemouth-weather-premium-2026-09-16.md and in the docblocks of
api/bm-wx-lib.php, api/bm-radar-lib.php, api/bm-weather-lib.php and tools/bournemouth-tides/fit_tides.py.

COMPACT LAYOUT (16 Sep 2026, owner: "a lot of information - could it be animated and compressed so it is
easier for visitors to use without having to scroll down a lot ... on the /weather page instead of /#weather,
make it premium"). The page went from ~17,000 px of phone scroll to about a fifth of that:
  1. a compact title (no hero buttons - they wrote #fragments into the address bar);
  2. GLANCE: the forecast now over an animated sky, the measured airport temperature on its own line, and
     four vital buttons (measured wind, measured sea, predicted tide, computed sun);
  3. DAY: a 10-day strip (tablist) driving ONE day panel - an hour-by-hour timeline (six-hour columns where
     the forecast only has six-hour steps), that day's tides and its sun & moon;
  4. DECK: one sticky tab bar (Tides, Wind, Radar, Satellite, Sea & air), one panel on screen at a time.
Nothing on the page writes a #fragment; old #tides / #radar / #day-YYYY-MM-DD links are honoured and then
the address is put back to /bournemouth/weather/. Inactive panels are hidden="until-found", so their text
stays in the HTML (crawlable, and find-in-page opens the right tab). Without JavaScript every panel shows.

THE RULE THAT MAKES IT DIFFERENT (carried from the section plan): every number on this page wears exactly
one provenance label - MEASURED (an instrument), OBSERVED (radar/satellite), PREDICTED (our tide harmonics),
FORECAST (MET Norway, Defra), COMPUTED (astronomy), OFFICIAL (Met Office warnings) - with where and when.
chip-m (the measured colour) is only ever set on instrument/observation blocks; the build guard in
build_blog.py fails if a predicted/forecast block is given it, or if a licence attribution disappears.

Deliberately NOT here: a rain PERCENTAGE (the forecast has none for Dorset), forecast gusts (none),
"beach day scores" or any invented index, count-up number animations (they would show values nobody
measured or forecast), a webcam, and any claim the tide times are for navigation.

Everything is drawn client-side from /api/bm-wx.php as SVG + CSS (no chart or map library, no third-party
host - the section's speed guard). Loops load only when their tab is opened, animation pauses off screen and
stops under prefers-reduced-motion or the site's own reduce-motion setting.
"""
import build_pages as _bp
from build_pages import add, graph, crumb_sub, webpage, faqpage, faq_html, bc_sub

_WXP_SLUG = "bournemouth/weather"

_WXP_FAQS = [
    ("What time is high tide in Bournemouth today?",
     "The tide table on this page lists every high and low water for the next seven days at Bournemouth Pier, in UK time, with heights above chart datum the way printed tide tables give them. The times are our own prediction from a year of readings on the pier&rsquo;s tide gauge, and the chart shows the gauge&rsquo;s measured level on top of the prediction so you can see how close it is running. For navigation, always use the official ADMIRALTY tables."),
    ("Why does Bournemouth have two high tides close together?",
     "Poole Bay sits close to a point in the English Channel where the main twice-a-day tide almost cancels itself out, so the smaller quarter-day tides shape the curve instead. The result is Bournemouth&rsquo;s famous long high water: often two peaks a few hours apart with only a shallow dip between them. Our table shows those as one &ldquo;double high water&rdquo; rather than pretending the dip is a low tide."),
    ("How accurate are the tide times?",
     "We test the prediction blind: fit it without the most recent month, predict that month, and compare with what the pier gauge actually measured. The result is shown next to the tide table. The remaining error is mostly weather &mdash; strong winds and low air pressure push the sea higher than any tide table can predict &mdash; which is why the chart also shows the gauge live and tells you how far the sea is running above or below the prediction right now."),
    ("Where is the wind measured?",
     "At Bournemouth Airport, about 7 km inland from the pier &mdash; the nearest official weather station that publishes its readings openly. The seafront is often windier than the airport, especially in a sea breeze, so treat the airport reading as the least it is blowing on the beach. The 48-hour wind chart is MET Norway&rsquo;s forecast for the pier itself."),
    ("Is the rain radar live?",
     "It is as live as radar gets: EUMETNET&rsquo;s composite of the national radar networks, including the Met Office radar at Dean Hill near Salisbury that covers Bournemouth, is published every 15 minutes and usually reaches this page 10 to 25 minutes after it was measured. Each frame shows its own time."),
    ("What is the sea temperature at Bournemouth today?",
     "The sea temperature on this page is measured by the wave buoy in Poole Bay and updates through the day. For the full picture &mdash; wetsuit advice, water quality at all seven beaches and live storm-overflow monitoring &mdash; see our sea conditions page."),
]


def _wxp_schema(s):
    return graph([
        crumb_sub(s, "Bournemouth365", "bournemouth", "Weather, Tides &amp; Sea"),
        webpage(s, "Bournemouth Weather, Tides, Radar & Sea Temperature",
                "Bournemouth seafront weather: a 10-day forecast, predicted tide times checked against the pier gauge, live rain radar and satellite loops, measured wind and the measured sea temperature."),
        faqpage(s, _WXP_FAQS),
    ])


# The site's hero() always emits two buttons and chips; here the weather itself is the first screen. The byline is
# the same markup hero() writes, character for character: build_pages strips it from the content hash by regex and
# stamps __LASTMOD_HUMAN__ after hashing.
_WXP_HERO = '''    <section class="page-hero wxp-hero b365" aria-label="Introduction">
      <div class="page-hero__inner">
        <nav class="breadcrumb" aria-label="Breadcrumb">''' + bc_sub("Bournemouth365", "/bournemouth/", "Weather, Tides &amp; Sea") + '''</nav>
        <h1><span class="wxp-w" style="--i:0">Bournemouth</span> <span class="wxp-w" style="--i:1">weather,</span> <em class="grad grad--cyan wxp-w" style="--i:2">tides &amp; the sea</em></h1>
        <p class="wxp-lede">The seafront&rsquo;s forecast, tide times checked against the gauge on the pier, rain radar, satellite and the sea temperature from the buoy in the bay &mdash; every number labelled with where it came from.</p>
        <p class="page-hero__byline mono"><span class="page-hero__byline-by">By the </span><a href="/meet-the-team/">365 Techies team</a> &middot; Reviewed __LASTMOD_HUMAN__</p>
      </div>
    </section>'''


# PHONE APP VIEW (16 Sep 2026, owner: "as this is a weather page on the phone view the header and footer bits should vanish").
# Phones only (the site's 767 px phone breakpoint): no site header, no Call/Book/Text bar, no site footer and no
# Bournemouth365 about-band; the breadcrumb stays as the way back, and a slim footer keeps the Bournemouth365 links and
# the legal links (privacy, cookies, terms, accessibility) that every page must still reach. The HTML is untouched -
# it is hidden by CSS only, so desktop and crawlers see the same page. The cookie banner and the accessibility
# button stay: consent and accessibility are not decoration.
_WXP_HEAD = '''
  <meta name="apple-mobile-web-app-title" content="B365 Weather" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black" />
  <style>
  @media (max-width:767px){
    :root{--header-h:0px}
    .site-header,.mobile-cta-bar,.site-footer,section[aria-label="About Bournemouth365"]{display:none!important}
    body{padding-bottom:env(safe-area-inset-bottom)!important}
    .a11y{bottom:calc(14px + env(safe-area-inset-bottom))!important}
  }
  /* the title's entrance (all widths): words rise in, then the lede and byline */
  @keyframes wxp-word{from{opacity:0;transform:translateY(.45em)}to{opacity:1;transform:none}}
  @keyframes wxp-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  .page-hero.wxp-hero h1 .wxp-w{display:inline-block;animation:wxp-word .85s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(.06s + var(--i,0) * .12s)}
  .page-hero.wxp-hero .breadcrumb{animation:wxp-up .6s ease both}
  .page-hero.wxp-hero .wxp-lede{animation:wxp-up .7s cubic-bezier(.2,.8,.2,1) .42s both}
  .page-hero.wxp-hero .page-hero__byline{animation:wxp-up .7s cubic-bezier(.2,.8,.2,1) .5s both}
  @media (prefers-reduced-motion:reduce){.page-hero.wxp-hero *{animation:none!important}}
  html.a11y-reduce .page-hero.wxp-hero *{animation:none!important}
  </style>'''

_WXP_MINIFOOT = '''
    <nav class="wxp-minifoot b365" aria-label="Bournemouth365 pages and legal information">
      <p><button type="button" class="wxp-a2hs-pill wxp-share-pill" data-share="page" style="margin-right:.4rem"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg> Share</button><button type="button" class="wxp-a2hs-pill" data-a2hs style="margin-right:.4rem"><span aria-hidden="true">&#128204;</span> Add to home screen</button><a href="/bournemouth/">Bournemouth365</a><a href="/bournemouth/live-map/">Live map</a><a href="/bournemouth/sea-today/">The sea right now</a><a href="/bournemouth/sunrise-sunset/">Sunrise &amp; sunset</a><a href="/bournemouth/beach-parking/">Beach parking</a><a href="/bournemouth/fireworks/">Fireworks</a></p>
      <p class="mono">&copy; 2026 365 Techies Limited<a href="/privacy-policy/">Privacy</a><a href="/cookie-policy/">Cookies</a><a href="/terms/">Terms</a><a href="/accessibility-statement/">Accessibility</a></p>
    </nav>'''


_WXP_CSS = r'''
<style>
/* the site sets body{overflow-x:hidden} and html{overflow-x:clip}: with html clipping, body's overflow no longer
   passes to the viewport, body becomes a scroll container, and position:sticky silently never sticks. html already
   clips sideways, so clip on body changes nothing else on this page. */
body{overflow-x:clip}
html{scroll-padding-top:calc(var(--header-h) + 4.6rem)}
@media (min-width:768px){html{scroll-padding-top:calc(var(--header-h) + var(--ticker-h) + 4.6rem)}}
/* the hidden attribute must win over display rules (.wxp-ctl is flex); tab panels use until-found and keep theirs */
.wxp [hidden]:not([hidden="until-found"]){display:none!important}
.wxp-vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.nw{white-space:nowrap}
.wxp{--mono:var(--font-mono);--wx-sun:#ffc94d;--wx-moon:#efe6c4;--wx-cloud:#e4eef5;--wx-cloud2:#9fb4c5;--wx-rain:#6cc4f5;--wx-bolt:#ffd84d;--wx-warm:#ffb347;--wx-cool:#79b8ff;--wx-off:#ff9f5a;--wx-on:#7fd8a8;--wx-gold:#ffd76a;--wx-ease:cubic-bezier(.3,.7,.2,1)}
/* compact title */
.page-hero.wxp-hero{padding:calc(var(--header-h) + .9rem) var(--pad-x) .2rem}
.page-hero.wxp-hero .breadcrumb{margin:0 0 .35rem}
.page-hero.wxp-hero h1{font-size:clamp(1.55rem,4.4vw,2.7rem);line-height:1.08;margin:0 0 .3rem;max-width:none;text-wrap:balance}
.wxp-lede{display:none;margin:.2rem 0 0;max-width:62ch;color:#9fb4c5;font-size:1rem;line-height:1.5}
.page-hero.wxp-hero .page-hero__byline{margin-top:.35rem}
@media (min-width:768px){
  .page-hero.wxp-hero{padding:calc(var(--header-h) + var(--ticker-h) + 1.4rem) var(--pad-x) .4rem}
  .wxp-lede{display:block}
}
.wxp h2,.wxp h3{text-wrap:balance}
.wxp,.wxp-hero{--wxp-gut:var(--pad-x)}
.wxp-sec{padding:.7rem var(--wxp-gut)}
@media (min-width:768px){.wxp-sec{padding:.9rem var(--wxp-gut)}}
.wxp-h2{margin:0;font-size:clamp(1.12rem,2.4vw,1.45rem);line-height:1.2;color:var(--b365-foam)}
.wxp-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.25rem 1rem;margin:0 0 .55rem}
.wxp-pintro{margin:0 0 .75rem;color:var(--b365-mute);font-size:.95rem;line-height:1.5;max-width:64ch}
.wxp-card{background:var(--b365-water);border:1px solid var(--b365-line);border-radius:18px;padding:.9rem 1rem;position:relative;overflow:hidden}
.wxp-grid{display:grid;gap:.7rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))}
.wxp-num{font-family:var(--font-display,inherit);font-weight:600;font-size:clamp(2.9rem,9vw,4rem);line-height:.92;color:var(--b365-foam);margin:0;font-variant-numeric:tabular-nums}
.wxp-mid{font-family:var(--font-display,inherit);font-weight:600;font-size:clamp(1.55rem,4vw,2.1rem);line-height:1.05;color:var(--b365-foam);margin:.25rem 0 .1rem;font-variant-numeric:tabular-nums}
.wxp-sub{color:var(--b365-mute);font-size:.94rem;line-height:1.5;margin:.2rem 0 0}
.wxp-sub b{color:var(--b365-foam);font-weight:600}
.wxp-lbl{font-family:var(--mono,ui-monospace,monospace);font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--b365-mute);margin:0 0 .15rem}
.wxp-note{margin:.6rem 0 0;color:var(--b365-mute);font-size:.9rem;line-height:1.5}
.wxp-skel{display:block;height:1rem;width:60%;border-radius:6px;background:linear-gradient(90deg,var(--b365-line),#284259,var(--b365-line));background-size:200% 100%;animation:wx-shimmer 1.4s linear infinite;margin:.4rem 0}
.wxp-rise{animation:wxp-rise .45s var(--wx-ease) both}
/* warnings */
.wxp-warnings{margin:0 0 .55rem}
.wxp-ok{margin:0;color:var(--b365-mute);font-size:.84rem;line-height:1.45}
.wxp-ok .chip-f{margin-right:.35rem}
.wxp-short{display:none}
@media (max-width:639px){.wxp-long{display:none}.wxp-short{display:inline}}
.wxp-ok a{color:#a9c4ea}
.wxp-warn{overflow-wrap:anywhere;border:1px solid var(--b365-dusk);border-left-width:4px;background:rgba(255,176,102,.08);border-radius:12px;padding:.7rem 1rem;margin:0 0 .6rem;color:var(--b365-foam)}
.wxp-warn a{color:var(--b365-foam)}
/* GLANCE */
.wxp-glance{position:relative;overflow:hidden;display:grid;gap:.85rem;padding:1rem;border-radius:22px;isolation:isolate;background:linear-gradient(165deg,rgba(79,216,196,.05),transparent 45%),var(--b365-water)}
@media (min-width:900px){.wxp-glance{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);align-items:center;gap:1.2rem;padding:1.2rem 1.35rem}}
.wxp-glance h2{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.wxp-now{min-height:150px}
.wxp-now-top{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.1rem .85rem;align-items:center;margin-top:.35rem}
.wxp-now-top .wx-ic{width:clamp(78px,20vw,116px);height:auto}
.wxp-now-w{margin:.25rem 0 0;font-size:1.12rem;color:var(--b365-foam);line-height:1.3}
.wxp-obs{display:flex;flex-wrap:wrap;align-items:center;gap:.2rem .6rem;margin-top:.45rem}
.wxp-vitals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem}
.wxp-vital{display:flex;flex-direction:column;align-items:flex-start;gap:.1rem;min-height:98px;margin:0;text-align:left;font:inherit;color:inherit;background:rgba(8,18,29,.55);border:1px solid var(--b365-line);border-radius:14px;padding:.55rem .7rem .5rem;cursor:pointer;transition:border-color .2s ease,transform .2s var(--wx-ease),background-color .2s ease;-webkit-tap-highlight-color:transparent}
.wxp-vital:hover{border-color:rgba(255,215,106,.55);transform:translateY(-2px)}
.wxp-vital:active{transform:translateY(0)}
.wxp-vital:focus-visible{outline:2px solid var(--wx-gold);outline-offset:2px}
.wxp-vital .v{font-family:var(--font-display,inherit);font-size:1.28rem;font-weight:600;line-height:1.15;color:var(--b365-foam);font-variant-numeric:tabular-nums;margin-top:.1rem;white-space:nowrap}
.wxp-vital .c{font-size:.8rem;line-height:1.35;color:var(--b365-mute)}
.wxp-vital .go{margin-top:auto;padding-top:.15rem;font-size:.76rem;color:var(--wx-gold)}
/* the animated sky behind the glance card: gradients and small transformed shapes only, paused off screen */
.wxp-sky{position:absolute;inset:-50px 0;z-index:-1;will-change:transform;pointer-events:none;overflow:hidden;border-radius:inherit;opacity:0;transition:opacity .9s ease}
.wxp-sky.on{opacity:1}
.wxp-sky i{position:absolute;display:block}
.sky-sun{background:radial-gradient(110% 85% at 100% 0%,rgba(255,190,90,.17),transparent 62%)}
.sky-night{background:radial-gradient(95% 80% at 92% 0%,rgba(125,145,225,.15),transparent 66%)}
.sky-cloud{background:linear-gradient(180deg,rgba(159,180,197,.09),transparent 72%)}
.sky-rain,.sky-storm{background:linear-gradient(180deg,rgba(108,160,210,.13),transparent 78%)}
.sky-fog,.sky-snow{background:linear-gradient(180deg,rgba(210,220,230,.09),transparent 80%)}
.sk-glow{width:440px;height:440px;right:-170px;top:-210px;border-radius:50%;background:radial-gradient(circle,rgba(255,206,110,.42),rgba(255,179,71,.14) 42%,transparent 68%);animation:wxs-breathe 5.5s ease-in-out infinite}
.sk-rays{width:600px;height:600px;right:-250px;top:-290px;border-radius:50%;background:repeating-conic-gradient(rgba(255,215,106,.14) 0 5deg,transparent 5deg 18deg);-webkit-mask:radial-gradient(circle,#000 18%,transparent 66%);mask:radial-gradient(circle,#000 18%,transparent 66%);animation:wx-spin 55s linear infinite}
.sk-moon{width:280px;height:280px;right:-90px;top:-130px;border-radius:50%;background:radial-gradient(circle,rgba(239,230,196,.26),transparent 62%)}
.sk-star{width:2px;height:2px;border-radius:50%;background:var(--wx-moon);opacity:.25;animation:wx-twinkle 3.6s ease-in-out infinite}
.sk-cloud{left:-45%;width:72%;height:40%;border-radius:50%;background:radial-gradient(closest-side,rgba(228,238,245,.26),transparent);animation:wxs-drift 22s linear infinite}
.sk-drop{top:-12%;width:1.5px;height:24px;border-radius:2px;background:linear-gradient(rgba(108,196,245,0),rgba(108,196,245,.58));animation:wxs-fall 1s linear infinite}
.sk-flake{top:-4%;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.45);animation:wxs-snow 6s linear infinite}
.sk-haze{left:-30%;top:22%;width:160%;height:24%;background:linear-gradient(90deg,transparent,rgba(210,220,230,.15),transparent);animation:wxs-haze 22s ease-in-out infinite alternate}
.sk-flash{inset:0;background:rgba(255,240,180,.08);opacity:0;animation:wxs-flash 7s linear infinite}
/* DAY: strip + panel */
.wxp-strip{position:relative;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x proximity;scrollbar-width:none;margin:0 calc(-1 * var(--wxp-gut));padding:.2rem var(--wxp-gut) .45rem;scroll-padding-inline:var(--wxp-gut)}
.wxp-strip::-webkit-scrollbar{display:none}
.wxp-strip-list{position:relative;z-index:1;display:flex;gap:.45rem;width:max-content}
@media (min-width:900px){.wxp-strip{overflow:visible;margin:0;padding:.2rem 0 .45rem}.wxp-strip-list{width:auto}.wxp-dchip{flex:1 1 0!important;min-width:0}}
.wxp-dchip{flex:0 0 76px;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;gap:.05rem;min-height:140px;margin:0;padding:.45rem .25rem .4rem;border-radius:14px;border:1px solid var(--b365-line);background:var(--b365-water);color:var(--b365-foam);font:inherit;cursor:pointer;transition:background-color .25s ease,border-color .25s ease;-webkit-tap-highlight-color:transparent}
.wxp-dchip:hover{border-color:rgba(255,215,106,.45)}
.wxp-dchip:focus-visible{outline:2px solid var(--wx-gold);outline-offset:2px}
.wxp-dchip[aria-selected="true"]{background:rgba(255,215,106,.09);border-color:transparent}
.wxp-dchip .dl{font-size:.8rem;font-weight:600;white-space:nowrap;line-height:1.2}
.wxp-dchip .wx-ic{width:46px;height:46px;overflow:visible}
.wxp-dchip .hl{font-size:.9rem;font-variant-numeric:tabular-nums;line-height:1.2}
.wxp-dchip .hl span{color:var(--b365-mute)}
.wxp-dchip .rg{position:relative;width:78%;height:4px;border-radius:3px;background:var(--b365-line);margin:.2rem 0 .15rem}
.wxp-dchip .rg i{position:absolute;top:0;bottom:0;border-radius:3px;background:linear-gradient(90deg,var(--wx-cool),var(--wx-warm));transform-origin:left;animation:wx-growx .8s var(--wx-ease) both}
.wxp-dchip .mt{font-size:.74rem;color:var(--b365-mute);line-height:1.3;white-space:nowrap;font-variant-numeric:tabular-nums}
.wxp-dchip.skel{cursor:default}
.wxp-ink{position:absolute;z-index:2;left:0;top:.2rem;height:132px;border:2px solid var(--wx-gold);border-radius:14px;pointer-events:none;box-shadow:0 0 22px rgba(255,215,106,.16);opacity:0;transition:transform .34s var(--wx-ease),width .34s var(--wx-ease),opacity .2s ease}
.wxp-ink.on{opacity:1}
.wxp-dayp{margin-top:.35rem;min-height:480px}
@media (min-width:980px){.wxp-dayp{min-height:360px}}
.wxp-dsum{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.1rem .8rem;align-items:center}
.wxp-dsum .wx-ic{width:62px;height:62px}
.wxp-dsum h3{margin:0;font-size:clamp(1.1rem,2.6vw,1.35rem);color:var(--b365-foam)}
.wxp-dnav{grid-column:1/-1;display:flex;gap:.45rem;justify-content:flex-end;margin-top:.2rem}
@media (min-width:640px){.wxp-dsum{grid-template-columns:auto minmax(0,1fr) auto}.wxp-dnav{grid-column:auto;margin:0}}
.wxp-dnav button,.wxp-more-btn{min-height:44px;min-width:44px;border-radius:999px;border:1px solid var(--b365-line);background:transparent;color:var(--b365-foam);font:inherit;font-size:.9rem;padding:0 .95rem;cursor:pointer;transition:border-color .2s ease}
.wxp-dnav button:hover,.wxp-more-btn:hover{border-color:rgba(255,215,106,.55)}
.wxp-dnav button:focus-visible,.wxp-more-btn:focus-visible{outline:2px solid var(--wx-gold);outline-offset:2px}
.wxp-dnav button[disabled]{opacity:.35;cursor:default}
.wxp-dgrid{display:grid;gap:.7rem;margin-top:.7rem}
@media (min-width:980px){.wxp-dgrid{grid-template-columns:minmax(0,2fr) minmax(0,1fr);align-items:start}}
.wxp-dside{display:grid;gap:.7rem;align-content:start}
.wxp-in-l{animation:wxp-inl .3s var(--wx-ease) both}.wxp-in-r{animation:wxp-inr .3s var(--wx-ease) both}
.wxp-hint{margin:.35rem 0 0;font-size:.8rem;color:var(--b365-mute)}
/* charts */
.wxp-chart{margin-top:.6rem}
.wxp-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:#284259 transparent;border-radius:8px}
.wxp-scroll:focus-visible{outline:2px solid var(--wx-gold);outline-offset:2px}
.wxp-chart svg{display:block}
.wxp-chart text{font-family:var(--mono,ui-monospace,monospace);fill:var(--b365-mute);font-size:11px}
.wxp-chart .t-strong{fill:var(--b365-foam);font-weight:600;font-size:12px}
.wxp-chart .t-dim{fill:var(--b365-mute);font-weight:400;font-size:11px}
.wxp-chart .t-small{font-size:10px;letter-spacing:.06em}
.wxp-chart .t-rain{fill:var(--wx-rain);font-size:11px}
.wxp-draw{fill:none;stroke-dasharray:1;stroke-dashoffset:1;animation:wx-draw .95s var(--wx-ease) .05s forwards}
.wxp-fadein{opacity:0;animation:wx-fade .6s ease .45s forwards}
.wxp-pop{opacity:0;transform-box:fill-box;transform-origin:center;animation:wxp-pop .45s cubic-bezier(.2,1.4,.4,1) forwards}
.wxp-bar{transform-box:fill-box;transform-origin:bottom;transform:scaleY(0);animation:wx-grow .55s var(--wx-ease) forwards}
.wxp-ping{transform-box:fill-box;transform-origin:center;animation:wxp-ring 2.4s ease-out infinite}
.wxp-legend{display:flex;flex-wrap:wrap;gap:.25rem .9rem;margin:.45rem 0 0;padding:0;list-style:none;font-size:.82rem;color:var(--b365-mute)}
.wxp-legend i{display:inline-block;width:16px;height:3px;border-radius:2px;vertical-align:middle;margin-right:.35rem}
/* DECK: sticky tabs */
.wxp-sentinel{height:1px;margin:0}
.wxp-tabbar{position:sticky;top:calc(var(--header-h) + var(--wxp-cb,0px));z-index:40;margin:0 calc(-1 * var(--wxp-gut)) .75rem;padding:.35rem var(--wxp-gut);transition:background-color .2s ease,box-shadow .2s ease}
@media (min-width:768px){.wxp-tabbar{top:calc(var(--header-h) + var(--ticker-h))}}
.wxp-tabbar.is-stuck{background:rgba(7,15,25,.94);box-shadow:0 1px 0 var(--b365-line),0 12px 26px rgba(0,0,0,.35)}
.wxp-tabs5{position:relative;max-width:780px;background:var(--b365-water);border:1px solid var(--b365-line);border-radius:17px;padding:.22rem}
.wxp-tablist{position:relative;z-index:1;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.2rem}
.wxp-tablist [role="tab"]{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.12rem;min-height:52px;margin:0;border:0;border-radius:13px;background:transparent;color:#a9bccb;font:inherit;font-size:.8rem;font-weight:600;line-height:1.1;padding:.2rem .1rem;cursor:pointer;transition:color .25s ease;-webkit-tap-highlight-color:transparent}
.wxp-tablist [role="tab"] svg{width:20px;height:20px;flex:none}
.wxp-tablist [role="tab"]:hover{color:var(--b365-foam)}
.wxp-js .wxp-tablist [role="tab"][aria-selected="true"]{color:#08131e}
.wxp-tablist [role="tab"]:focus-visible{outline:2px solid var(--wx-gold);outline-offset:1px}
.wxp-tablist [role="tab"][aria-selected="true"]:focus-visible{outline-color:#e8f1f2;outline-offset:3px}
.wxp-tablist [role="tab"] span{white-space:nowrap}
@media (max-width:379px){.wxp-tablist [role="tab"]{font-size:.72rem}}
html.a11y-contrast .wxp-tablist [role="tab"][aria-selected="true"],html.a11y-contrast .wxp-dchip[aria-selected="true"]{outline:2px solid #fff!important;outline-offset:-4px;text-decoration:underline}
/* without JavaScript: no dead controls or placeholders, every panel's text shows */
.wxp:not(.wxp-js) .wxp-tabbar,.wxp:not(.wxp-js) .wxp-vitals,.wxp:not(.wxp-js) .wxp-strip,.wxp:not(.wxp-js) .wxp-dayp,.wxp:not(.wxp-js) .wxp-skel,.wxp:not(.wxp-js) .wxp-now-top{display:none}
#wxp-dsun:focus:not(:focus-visible){outline:none}
.wxp-air-link{display:inline-flex;align-items:center;min-height:44px;color:#a9c4ea}
@media (min-width:768px){.wxp-tablist [role="tab"]{flex-direction:row;gap:.45rem;min-height:46px;font-size:.93rem}}
.wxp-tabink{overflow:hidden;position:absolute;z-index:0;top:.22rem;left:0;height:calc(100% - .44rem);border-radius:13px;background:linear-gradient(135deg,#ffe08a,#ffb347);box-shadow:0 4px 18px rgba(255,190,90,.25);transition:transform .32s var(--wx-ease),width .32s var(--wx-ease)}
.wxp-js .wxp-panel[data-off]{display:none}
.wxp-panel{scroll-margin-top:calc(var(--header-h) + var(--ticker-h) + 4.5rem)}
/* a panel's contents cascade in when it opens (tab switch, or the deck first coming into view) */
.wxp-panel.wxp-in>*{animation:wxp-rise .55s var(--wx-ease) both}
.wxp-panel.wxp-in>:nth-child(2){animation-delay:.07s}.wxp-panel.wxp-in>:nth-child(3){animation-delay:.14s}.wxp-panel.wxp-in>:nth-child(4){animation-delay:.21s}
.wxp-panel.wxp-in>:nth-child(5){animation-delay:.28s}.wxp-panel.wxp-in>:nth-child(6){animation-delay:.35s}.wxp-panel.wxp-in>:nth-child(n+7){animation-delay:.42s}
.wxp-panel.wxp-in .wxp-tides li{animation:wxp-rise .5s var(--wx-ease) both;animation-delay:calc(.22s + var(--i,0) * .07s)}
.wxp-panel.wxp-in .wxp-split>*,.wxp-panel.wxp-in .wxp-media>*,.wxp-panel.wxp-in #wxp-seatiles>*,.wxp-panel.wxp-in .wxp-grid>.wxp-card{animation:wxp-pop2 .55s cubic-bezier(.2,.9,.25,1.15) both}
.wxp-panel.wxp-in .wxp-split>:nth-child(2),.wxp-panel.wxp-in .wxp-media>:nth-child(2),.wxp-panel.wxp-in #wxp-seatiles>:nth-child(2){animation-delay:.1s}
.wxp-panel.wxp-in #wxp-seatiles>:nth-child(3){animation-delay:.2s}.wxp-panel.wxp-in #wxp-seatiles>:nth-child(4){animation-delay:.3s}.wxp-panel.wxp-in #wxp-aircard{animation-delay:.4s}
/* scroll entrances: hidden only once JavaScript is running (wxp-anim), revealed as each block comes into view */
.wxp-anim [data-anim]{opacity:0;transform:translateY(24px)}
.wxp-anim [data-anim].is-in{opacity:1;transform:none;transition:opacity .7s var(--wx-ease) var(--d,0s),transform .8s var(--wx-ease) var(--d,0s)}
.wxp-anim [data-anim="stagger"]{opacity:1;transform:none}
.wxp-anim .wxp-strip:not(.is-in) .wxp-dchip,.wxp-anim .wxp-strip:not(.is-in) .wxp-ink{opacity:0}
.wxp-strip.is-in .wxp-dchip:not(.skel){animation:wxp-chip .62s ease-out both;animation-delay:calc(.05s + var(--i,0) * .065s)}
.wxp-strip.is-in .wxp-ink.on{animation:wxp-inkin .5s var(--wx-ease) .45s both,wxp-glow 3.2s ease-in-out 1.2s infinite}
.wxp-strip-list.no-pop .wxp-dchip{animation:none!important}
.wxp-anim .wxp-deck:not(.is-in) .wxp-panel>*{opacity:0}
.wxp-shown-all [data-anim],.wxp-shown-all .wxp-dchip,.wxp-shown-all .wxp-ink,.wxp-shown-all .wxp-panel>*{opacity:1!important;transform:none!important}
.wxp-now.wxp-rise .wxp-num{animation:wxp-temp .7s cubic-bezier(.2,.9,.25,1.2) .1s both}
.wxp-now.wxp-rise .wx-ic{animation:wxp-pop2 .7s cubic-bezier(.2,.9,.25,1.2) both}
/* charts keep moving: a glint travels along each line, wind arrows sway, rain drops fall into the rain bars */
.wxp-flow{stroke-dasharray:.06 .94;stroke-dashoffset:1;opacity:.8;animation:wxp-flow 5s linear 1.1s infinite}
.wxp-sway-svg{transform-box:fill-box;transform-origin:center;animation:wxp-sway 2.6s ease-in-out infinite}
.wxp-rdrop{stroke:#6cc4f5;stroke-width:2;stroke-linecap:round;opacity:0;animation:wxp-rdrop 1.2s linear infinite}
/* keep it on the home screen */
.wxp-a2hs-done [data-a2hs]{display:none!important}
.wxp-a2hs-row{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.5rem;margin:.6rem 0 0}
@media (min-width:768px){.wxp-a2hs-row [data-a2hs]{display:none}}
.wxp-a2hs-pill{display:inline-flex;align-items:center;gap:.4rem;min-height:44px;padding:0 1rem;border-radius:999px;border:1px solid rgba(255,215,106,.55);background:rgba(255,215,106,.08);color:#ffe7a6;font:inherit;font-size:.9rem;font-weight:600;cursor:pointer}
.wxp-a2hs-pill:hover{background:rgba(255,215,106,.16)}
.wxp-a2hs-pill:focus-visible,.wxp-a2hs button:focus-visible{outline:2px solid var(--wx-gold);outline-offset:2px}
.wxp-a2hs{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:1310;max-width:540px;margin:0 auto;display:grid;grid-template-columns:auto minmax(0,1fr);gap:.8rem;align-items:start;padding:1rem 2.6rem 1rem 1rem;border-radius:20px;border:1px solid rgba(255,215,106,.35);background:rgba(8,19,30,.97);box-shadow:0 18px 50px rgba(0,0,0,.55);color:var(--b365-foam);transform:translateY(130%);opacity:0;transition:transform .45s var(--wx-ease),opacity .3s ease}
.wxp-a2hs.on{transform:none;opacity:1}
.wxp-a2hs-ic{width:52px;height:52px;border-radius:13px;background:url(/bournemouth/media/b365-weather-icon-192.png) center/cover;box-shadow:0 4px 14px rgba(0,0,0,.4)}
.wxp-a2hs-h{margin:0;font-weight:700;font-size:1.02rem;line-height:1.3}
.wxp-a2hs-sub{margin:.2rem 0 0;color:var(--b365-mute);font-size:.9rem;line-height:1.45}
.wxp-a2hs-how{margin:.6rem 0 0;padding:.65rem .75rem;border-radius:12px;background:rgba(255,255,255,.05);font-size:.92rem;line-height:1.55}
.wxp-a2hs-how svg{width:1.1em;height:1.1em;vertical-align:-.18em}
.wxp-a2hs-btns{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.7rem}
.wxp-a2hs-add{min-height:44px;padding:0 1.1rem;border:0;border-radius:999px;background:linear-gradient(135deg,#ffe08a,#ffb347);color:#08131e;font:inherit;font-weight:700;cursor:pointer}
.wxp-a2hs-no{min-height:44px;padding:0 1rem;border:1px solid var(--b365-line);border-radius:999px;background:transparent;color:var(--b365-foam);font:inherit;cursor:pointer}
.wxp-a2hs-x{position:absolute;top:.35rem;right:.35rem;width:44px;height:44px;border:0;background:transparent;color:var(--b365-mute);font-size:1.6rem;line-height:1;cursor:pointer}
@media (prefers-reduced-motion:reduce){.wxp-a2hs{transition:none}}
/* share */
.wxp-share-pill{border-color:rgba(169,196,234,.5);background:rgba(169,196,234,.08);color:#dce8f6}
.wxp-share-pill:hover{background:rgba(169,196,234,.16)}
.wxp-share-mini{display:inline-flex;align-items:center;gap:.4rem;min-height:40px;padding:0 .9rem;border-radius:999px;border:1px solid var(--b365-line);background:transparent;color:#a9c4ea;font:inherit;font-size:.86rem;font-weight:600;cursor:pointer}
.wxp-share-mini:hover{border-color:rgba(169,196,234,.6)}
.wxp-share-mini:focus-visible{outline:2px solid var(--wx-gold);outline-offset:2px}
.wxp-share{grid-template-columns:1fr}
.wxp-share-text{margin:.35rem 0 0;padding:.6rem .7rem;border-radius:12px;background:rgba(255,255,255,.05);color:var(--b365-mute);font-size:.86rem;line-height:1.5;max-height:7.5em;overflow:auto;white-space:pre-line}
.wxp-share-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem;margin-top:.7rem}
.wxp-share-grid a,.wxp-share-grid button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.3rem;min-height:68px;padding:.4rem;border-radius:14px;border:1px solid var(--b365-line);background:rgba(255,255,255,.03);color:var(--b365-foam);font:inherit;font-size:.82rem;text-decoration:none;cursor:pointer}
.wxp-share-grid a:hover,.wxp-share-grid button:hover{border-color:rgba(255,215,106,.5)}
.wxp-share-grid a:focus-visible,.wxp-share-grid button:focus-visible{outline:2px solid var(--wx-gold);outline-offset:2px}
.wxp-share-grid i{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;font-style:normal}
.wxp-share-grid svg{width:18px;height:18px}
.wxp-share-done{margin:.5rem 0 0;min-height:1.2em;color:#7fd8a8;font-size:.86rem}
/* always-on touches: a swaying wind arrow, a glowing Today outline, a sheen over the chosen tab, pulsing live dots */
.wxp-sway{display:inline-block;transform-origin:50% 60%;animation:wxp-sway 2.6s ease-in-out infinite}
.wxp-tabink::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.5) 50%,transparent 65%);background-size:260% 100%;background-position:160% 0;animation:wxp-shine 5.5s ease-in-out 1.5s infinite}
.wxp .chip-m::before{animation:b365pulse 2.2s ease-in-out infinite}
/* the sea along the bottom of the glance card */
.wxp-wave{position:absolute;left:0;bottom:-2px;width:200%;height:96px;z-index:-1;pointer-events:none;animation:wxp-wave 9s linear infinite}
.wxp-wave path{fill:rgba(79,216,196,.22)}
.wxp-wave.w-b{height:68px;animation-duration:6s;animation-direction:reverse}
.wxp-wave.w-b path{fill:rgba(108,196,245,.17)}
.wxp-split{display:grid;gap:.7rem}
@media (min-width:900px){.wxp-split{grid-template-columns:minmax(0,1fr) minmax(0,2fr);align-items:start}}
.wxp-media{display:grid;gap:.8rem}
@media (min-width:900px){.wxp-media{grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);align-items:start}}
/* tides */
.wxp-tides{list-style:none;margin:.7rem 0 0;padding:0;display:grid;gap:.45rem}
@media (min-width:768px){.wxp-tides{grid-template-columns:repeat(auto-fill,minmax(360px,1fr))}}
.wxp-tides li{display:grid;grid-template-columns:6.4rem minmax(0,1fr);gap:.2rem .7rem;align-items:start;padding:.5rem .75rem;border:1px solid var(--b365-line);border-radius:12px;background:rgba(16,32,47,.55)}
.wxp-tides h3{margin:0;font-size:.92rem;color:var(--b365-foam)}
.wxp-tides h3 span{display:block;font-size:.76rem;font-weight:400;color:var(--b365-mute);margin-top:.1rem}
@media (max-width:639px){
  .wxp-tides li{grid-template-columns:1fr;gap:.35rem;padding:.5rem .65rem}
  .wxp-tides h3{display:flex;align-items:baseline;justify-content:space-between;gap:.5rem}
  .wxp-tides h3 span{display:inline;margin:0}
  .wxp-ev{font-size:.86rem;padding:.14rem .45rem}
}
.wxp-tides li.flat{border-color:rgba(255,215,106,.45)}
.wxp-tides li.wxp-more{display:none}
.wxp-tides.all li.wxp-more{display:grid;animation:wxp-rise .35s var(--wx-ease) both}
@media (min-width:768px){.wxp-tides li.wxp-more{display:grid}#wxp-tide-more{display:none}}
.wxp-neap{flex-basis:100%;margin:0 0 .15rem;font-size:.82rem;color:#e9d9a6}
.wxp-evs{display:flex;flex-wrap:wrap;gap:.3rem .45rem}
.wxp-ev{display:inline-flex;flex-wrap:wrap;white-space:nowrap;align-items:baseline;gap:0 .35rem;padding:.16rem .55rem;border-radius:8px;font-variant-numeric:tabular-nums;font-size:.9rem;background:rgba(255,255,255,.04);border:1px solid var(--b365-line);color:var(--b365-foam)}
.wxp-ev b{font-weight:600}
.wxp-ev.hi{border-color:rgba(108,196,245,.45)}.wxp-ev.lo{border-color:rgba(159,180,197,.35)}
.wxp-ev small{color:var(--b365-mute)}
.wxp-more-btn{margin-top:.55rem}
.wxp-details{margin:.6rem 0 0;border:1px solid var(--b365-line);border-radius:12px;background:rgba(16,32,47,.45)}
.wxp-details summary{display:flex;align-items:center;gap:.6rem;line-height:1.35;min-height:44px;padding:.45rem .9rem;cursor:pointer;list-style:none;color:var(--b365-foam);font-size:.93rem}
.wxp-details summary::-webkit-details-marker{display:none}
.wxp-details summary::after{content:"";flex:none;width:9px;height:9px;margin-left:auto;border-right:2px solid var(--wx-gold);border-bottom:2px solid var(--wx-gold);transform:rotate(45deg);transition:transform .25s var(--wx-ease)}
.wxp-details[open] summary::after{transform:rotate(225deg)}
.wxp-details summary:focus-visible{outline:2px solid var(--wx-gold);outline-offset:2px}
.wxp-details>div{padding:0 .9rem .8rem}
/* wind */
.wxp-compass{width:136px;height:136px;flex:none;position:relative}
.wxp-compass svg{width:100%;height:100%;display:block}
.wxp-needle{transition:transform 1.6s cubic-bezier(.2,1.35,.4,1);transform-box:view-box;transform-origin:75px 75px}
.wxp-wobble{animation:wxp-wobble 3.2s ease-in-out infinite;transform-box:view-box;transform-origin:75px 75px}
.wxp-windrow{display:flex;gap:.9rem;align-items:center;flex-wrap:wrap}
.wxp-streaks{position:absolute;inset:-30%;pointer-events:none;opacity:.22}
.wxp-streaks i{position:absolute;left:0;height:1.5px;width:60px;border-radius:2px;background:linear-gradient(90deg,transparent,var(--b365-foam));animation:wxp-streak linear infinite}
.wxp-shore{display:inline-block;padding:.08rem .5rem;border-radius:999px;font-size:.8rem;font-weight:600;border:1px solid currentColor}
.wxp-shore.off{color:var(--wx-off)}.wxp-shore.on{color:var(--wx-on)}.wxp-shore.cross{color:var(--wx-cool)}
.wxp-alert{border:1px solid rgba(255,159,90,.5);border-left-width:4px;border-radius:12px;padding:.6rem .85rem;background:rgba(255,159,90,.06)}
.wxp-arrow{display:inline-block;width:.85em;height:.85em;vertical-align:-.05em;margin-right:.2em;transition:transform 1.2s var(--wx-ease)}
.wxp-arrow path{fill:currentColor}
/* map players */
.wxp-map{position:relative;border-radius:16px;overflow:hidden;border:1px solid var(--b365-line);background:#0a1a28;aspect-ratio:960/850;width:100%;max-width:min(100%,calc(min(68vh,600px) * 1.1294));margin:0 auto}
#wxp-nasa{max-width:100%;margin:0}
.wxp-map img{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .35s linear}
.wxp-map img.on,.wxp-map img.base,.wxp-map img.lines{opacity:1}
.wxp-pin{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:var(--wx-gold);box-shadow:0 0 0 0 rgba(255,215,106,.7);animation:wxp-ping 2s ease-out infinite}
.wxp-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .8rem;margin:0}
.wxp-ctl button,.wxp-views button{min-height:44px;min-width:44px;border-radius:999px;border:1px solid var(--b365-line);background:var(--b365-water);color:var(--b365-foam);font:inherit;font-size:.9rem;padding:0 1rem;cursor:pointer}
.wxp-views button[aria-pressed="true"]{border-color:var(--wx-gold);color:var(--wx-gold)}
.wxp-ctl button:focus-visible,.wxp-ctl input:focus-visible,.wxp-views button:focus-visible{outline:2px solid var(--wx-gold);outline-offset:2px}
.wxp-ctl input[type=range]{flex:1 1 160px;accent-color:var(--wx-gold);min-height:44px}
.wxp-time{font-family:var(--mono,ui-monospace,monospace);color:var(--b365-foam);font-size:.88rem;min-width:9.5rem}
.wxp-views{display:flex;flex-wrap:wrap;gap:.45rem;margin:0 0 .6rem}
.wxp-scale{display:flex;gap:2px;align-items:center;flex-wrap:wrap;margin:.6rem 0 0;font-size:.8rem;color:var(--b365-mute)}
.wxp-scale span{display:inline-flex;align-items:center;gap:.3rem;margin-right:.55rem}
.wxp-scale i{display:inline-block;width:14px;height:10px;border-radius:2px}
/* sea & air, sun & moon */
.wxp-moon{width:40px;height:40px;border-radius:50%;background:var(--wx-moon);position:relative;overflow:hidden;flex:none;box-shadow:0 0 22px rgba(239,230,196,.22)}
.wxp-moon i{position:absolute;inset:0;border-radius:50%;background:#10202f;transition:transform 1.6s var(--wx-ease)}
.wxp-daqi{display:flex;gap:.35rem;flex-wrap:wrap;margin:.4rem 0 0}
.wxp-daqi span{display:inline-flex;flex-direction:column;align-items:center;min-width:2.9rem;padding:.25rem .35rem;border-radius:10px;border:1px solid var(--b365-line);font-size:.8rem;color:var(--b365-mute)}
.wxp-daqi b{font-size:1.05rem;color:var(--b365-foam)}
.wxp-daqi .low{border-color:rgba(127,216,168,.5)}.wxp-daqi .mod{border-color:rgba(255,179,71,.6)}.wxp-daqi .high{border-color:rgba(255,110,90,.7)}
/* sources */
.wxp-about{padding-top:1.4rem}
.wxp-about p{max-width:70ch}
.wxp-key{display:flex;flex-wrap:wrap;gap:.3rem 1.2rem;margin:.5rem 0 0;padding:0;list-style:none;font-size:.88rem;color:var(--b365-mute)}
.wxp-src-wrap{overflow-x:auto}
.wxp-src{width:100%;border-collapse:collapse;font-size:.88rem}
.wxp-src th,.wxp-src td{text-align:left;padding:.45rem .55rem;border-bottom:1px solid var(--b365-line);vertical-align:top}
.wxp-src th{color:var(--b365-foam);font-weight:600}
.wxp-src td{color:var(--b365-mute)}
#wxp~.faq-section{padding-top:2.2rem;padding-bottom:2.6rem}
#wxp~.faq-section .section-title--center{margin-bottom:1.6rem}
/* phones: later in the sheet than the base rules it overrides. Sizes 16 Sep 2026: the owner's "everything looks a bit small" was
   seen in the browser's Desktop-site mode (the desktop layout shrunk to fit); in real phone view the sized-up version was "a bit large".
   These sit halfway: body 16 px, secondary 14 px, labels 12 px, chart text 12-13 px, on a 17 px side gutter. */
@media (max-width:639px){
  .wxp,.wxp-hero{--wxp-gut:1rem}
  .page-hero.wxp-hero{padding-left:var(--wxp-gut);padding-right:var(--wxp-gut)}
  .page-hero.wxp-hero h1{font-size:1.7rem}
  .wxp .chip-m,.wxp .chip-f{font-size:.74rem;letter-spacing:.03em}
  .wxp-sub{font-size:.96rem}
  .wxp-note,.wxp-pintro{font-size:.95rem}
  .wxp-ok{font-size:.88rem}
  .wxp-h2{font-size:1.25rem}
  .wxp-lbl{font-size:.74rem}
  .wxp-mid{font-size:1.75rem}
  .wxp-card{padding:.9rem .85rem}
  .wxp-glance{padding:.9rem .8rem;gap:.7rem}
  .wxp-now{min-height:236px}
  .wxp-now-top .wx-ic{width:92px}
  .wxp-num{font-size:3.5rem}
  .wxp-now-w{font-size:1.12rem}
  .wxp-hilo{margin-top:.4rem!important}
  .wxp-vitals{gap:.45rem}
  .wxp-vital{position:relative;min-height:0;padding:.55rem .6rem .6rem;gap:.08rem}
  .wxp-vital .v{font-size:1.14rem;white-space:normal}
  .wxp-vital .c{font-size:.83rem;line-height:1.36;padding-right:.85rem}
  .wxp-vital .go{display:none}
  .wxp-vital::after{content:"";position:absolute;right:.6rem;bottom:.7rem;width:7px;height:7px;border-right:2px solid var(--wx-gold);border-top:2px solid var(--wx-gold);transform:rotate(45deg)}
  .wxp-vital .chip-m,.wxp-vital .chip-f{font-size:.72rem;letter-spacing:0}
  .wxp-dchip{flex-basis:82px;min-height:152px;padding:.5rem .28rem .45rem;gap:.08rem}
  .wxp-dchip .dl{font-size:.86rem}
  .wxp-dchip .wx-ic{width:50px;height:50px}
  .wxp-dchip .hl{font-size:.98rem}
  .wxp-dchip .mt{font-size:.78rem}
  .wxp-dayp{min-height:520px}
  .wxp-dsum h3{font-size:1.08rem;line-height:1.28}
  .wxp-dsum .wx-ic{width:56px;height:56px}
  .wxp-dnav{display:none}
  .wxp-sunc .wxp-mid{font-size:1.35rem!important}
  .wxp-legend{font-size:.8rem;gap:.2rem .75rem}
  .wxp-hint{font-size:.84rem}
  .wxp-chart text{font-size:12px}
  .wxp-chart .t-strong{font-size:13px}
  .wxp-chart .t-small{font-size:10px}
  .wxp-chart .t-dim,.wxp-chart .t-rain{font-size:11px}
  .wxp-tablist [role="tab"]{font-size:.8rem;min-height:56px;gap:.15rem}
  .wxp-tablist [role="tab"] svg{width:21px;height:21px}
  .wxp-tides h3{font-size:.98rem}
  .wxp-tides h3 span{font-size:.8rem}
  .wxp-ev{font-size:.92rem;padding:.18rem .5rem}
  .wxp-neap{font-size:.86rem}
  .wxp-details summary{font-size:.95rem}
  .wxp-shore{font-size:.82rem}
  .wxp-scale{font-size:.82rem}
  .wxp-time{font-size:.92rem}
  .wxp-daqi span{font-size:.82rem}
  .wxp-daqi b{font-size:1.1rem}
  .wxp-key{font-size:.9rem}
  .wxp-src{font-size:.9rem}
  .wxp-compass{width:140px;height:140px}
}
@media (max-width:379px){
  .wxp-vital{padding:.5rem .5rem .55rem}.wxp-vital .v{font-size:1.04rem}.wxp-vital .c{font-size:.79rem}
  .wxp-tablist [role="tab"]{font-size:.72rem}.wxp-dchip{flex-basis:76px}.page-hero.wxp-hero h1{font-size:1.55rem}
}
/* phone app view: the slim footer that replaces the site footer on phones (hidden from 768 px, where the site footer shows) */
.wxp-minifoot{display:none}
@media (max-width:767px){
  .page-hero.wxp-hero{padding-top:1.15rem}
  .wxp-minifoot{display:block;padding:1rem var(--wxp-gut,1rem) calc(1.2rem + env(safe-area-inset-bottom));border-top:1px solid var(--b365-line);background:#07101a}
  .wxp-minifoot p{display:flex;flex-wrap:wrap;align-items:center;gap:0 1rem;margin:0;color:var(--b365-mute);font-size:.86rem}
  .wxp-minifoot p.mono{font-size:.74rem;margin-top:.2rem}
  .wxp-minifoot a{display:inline-flex;align-items:center;min-height:44px;color:#a9c4ea;text-decoration:none}
  .wxp-minifoot .wxp-a2hs-pill{font-size:.84rem;min-height:40px}
  .wxp-minifoot a:focus-visible{outline:2px solid var(--wx-gold);outline-offset:2px}
}
/* the animated icons (same shapes as before) */
.wx-rays,.wx-rays-b,.wx-halo,.wx-core,.wx-moon,.wx-star,.wx-cl,.wx-cl2,.wx-drop,.wx-flake,.wx-fog,.wx-bolt{transform-box:fill-box;transform-origin:center}
.wx-rays line{stroke:var(--wx-sun);stroke-width:3.2;stroke-linecap:round}
.wx-rays{animation:wx-spin 9s linear infinite}
.wx-rays-b{animation:wx-shine-rays 2.4s ease-in-out infinite}
.wx-halo{fill:rgba(255,201,77,.14);stroke:#ffd76a;stroke-width:1.6;opacity:0;animation:wx-halo 2.8s ease-out infinite}
.wx-still .wx-halo{opacity:0}
.wx-core{fill:var(--wx-sun);animation:wx-pulse 3.4s ease-in-out infinite}
.wx-moon{fill:var(--wx-moon);animation:wx-rock 7s ease-in-out infinite}
.wx-star{fill:var(--wx-moon);animation:wx-twinkle 2.6s ease-in-out infinite}
.wx-cl{fill:var(--wx-cloud);animation:wx-drift 3.6s ease-in-out infinite alternate}
.wx-cl2{fill:var(--wx-cloud2);animation:wx-drift 4.8s ease-in-out infinite alternate-reverse}
.wx-drop{stroke:var(--wx-rain);stroke-width:2.6;stroke-linecap:round;animation:wx-fall 1.05s linear infinite}
.wx-heavy .wx-drop{animation-duration:.72s}
.wx-flake{fill:#fff;animation:wx-snow 2.6s linear infinite}
.wx-fog{stroke:var(--wx-cloud2);stroke-width:3;stroke-linecap:round;animation:wx-slide 4s ease-in-out infinite alternate}
.wx-bolt{fill:var(--wx-bolt);opacity:0;animation:wx-flash 3.6s linear infinite}
/* small icons in the strip and the timeline stand still: two moving icons on screen, not forty */
.wx-still *{animation:none!important}.wx-still .wx-bolt,.wx-still .wx-star{opacity:1}
@keyframes wx-spin{to{transform:rotate(360deg)}}
@keyframes wx-pulse{50%{transform:scale(1.12)}}
@keyframes wx-shine-rays{0%,100%{transform:scale(.86);opacity:.8}50%{transform:scale(1.1);opacity:1}}
@keyframes wx-halo{0%{opacity:.85;transform:scale(.82)}100%{opacity:0;transform:scale(1.95)}}
@keyframes wx-rock{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(5deg)}}
@keyframes wx-twinkle{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes wx-drift{from{transform:translateX(-5px)}to{transform:translateX(5px)}}
@keyframes wx-fall{0%{transform:translateY(-6px);opacity:0}20%{opacity:1}100%{transform:translateY(10px);opacity:0}}
@keyframes wx-snow{0%{transform:translate(0,-6px);opacity:0}25%{opacity:1}50%{transform:translate(2px,2px)}100%{transform:translate(-1px,11px);opacity:0}}
@keyframes wx-slide{from{transform:translateX(-4px)}to{transform:translateX(4px)}}
@keyframes wx-flash{0%,84%,100%{opacity:0}86%,90%{opacity:1}88%{opacity:.25}}
@keyframes wx-draw{to{stroke-dashoffset:0}}
@keyframes wx-fade{to{opacity:1}}
@keyframes wx-grow{to{transform:scaleY(1)}}
@keyframes wx-growx{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes wx-shimmer{to{background-position:-200% 0}}
@keyframes wxp-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes wxp-pop2{from{opacity:0;transform:translateY(18px) scale(.94)}to{opacity:1;transform:none}}
@keyframes wxp-chip{0%{opacity:0;transform:translateY(30px) scale(.82)}70%{opacity:1;transform:translateY(-4px) scale(1.03)}100%{opacity:1;transform:none}}
@keyframes wxp-inkin{from{opacity:0;transform:scale(.9)}}
@keyframes wxp-temp{from{opacity:0;transform:translateY(14px) scale(.9)}to{opacity:1;transform:none}}
@keyframes wxp-sway{0%,100%{transform:rotate(-9deg)}50%{transform:rotate(9deg)}}
@keyframes wxp-glow{0%,100%{box-shadow:0 0 12px rgba(255,215,106,.12)}50%{box-shadow:0 0 34px rgba(255,215,106,.45)}}
@keyframes wxp-shine{0%,55%{background-position:160% 0}100%{background-position:-60% 0}}
@keyframes wxp-flow{to{stroke-dashoffset:0}}
@keyframes wxp-rdrop{0%{opacity:0;transform:translateY(-8px)}25%{opacity:.9}100%{opacity:0;transform:translateY(20px)}}
@keyframes wxp-wave{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}
@keyframes wxp-panin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes wxp-inl{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
@keyframes wxp-inr{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
@keyframes wxp-wobble{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
@keyframes wxp-streak{from{transform:translateX(-80px)}to{transform:translateX(560px)}}
@keyframes wxp-pop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}
@keyframes wxp-ping{0%{box-shadow:0 0 0 0 rgba(255,215,106,.7)}80%,100%{box-shadow:0 0 0 18px rgba(255,215,106,0)}}
@keyframes wxp-ring{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.6);opacity:0}}
@keyframes wxs-breathe{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.15);opacity:1}}
@keyframes wxs-drift{from{transform:translateX(0)}to{transform:translateX(215%)}}
@keyframes wxs-fall{from{transform:translate3d(0,0,0) rotate(14deg)}to{transform:translate3d(-150px,640px,0) rotate(14deg)}}
@keyframes wxs-snow{from{transform:translate3d(0,0,0)}50%{transform:translate3d(14px,320px,0)}to{transform:translate3d(-6px,640px,0)}}
@keyframes wxs-haze{from{transform:translateX(-8%)}to{transform:translateX(8%)}}
@keyframes wxs-flash{0%,92%,100%{opacity:0}93%{opacity:1}94%{opacity:.2}95.5%{opacity:.8}97%{opacity:0}}
.wx-off *,.wx-off *::before,.wx-off *::after{animation-play-state:paused!important}
@media (prefers-reduced-motion:reduce){
  .wxp *,.wxp *::before,.wxp *::after{animation:none!important;transition:none!important}
  .wxp-anim [data-anim],.wxp-anim .wxp-dchip,.wxp-anim .wxp-ink,.wxp-anim .wxp-panel>*{opacity:1!important;transform:none!important}
  .wxp-sky{transform:none!important}
  .wxp-flow,.wxp-rdrop{display:none}
  .wxp-draw{stroke-dashoffset:0}.wxp-fadein,.wxp-pop{opacity:1}.wxp-bar,.wxp-dchip .rg i{transform:none}
  .wx-drop,.wx-flake,.wx-bolt{opacity:1}.wxp-streaks,.wxp-sky i{display:none}.wxp-ping{opacity:0}
}
html.a11y-reduce .wxp-anim [data-anim],html.a11y-reduce .wxp-anim .wxp-dchip,html.a11y-reduce .wxp-anim .wxp-ink,html.a11y-reduce .wxp-anim .wxp-panel>*{opacity:1!important;transform:none!important}
html.a11y-reduce .wxp-sky{transform:none!important}
html.a11y-reduce .wxp-flow,html.a11y-reduce .wxp-rdrop{display:none}
html.a11y-reduce .wxp-draw{stroke-dashoffset:0}html.a11y-reduce .wxp-fadein,html.a11y-reduce .wxp-pop{opacity:1}
html.a11y-reduce .wxp-bar,html.a11y-reduce .wxp-dchip .rg i{transform:none}html.a11y-reduce .wx-bolt{opacity:1}html.a11y-reduce .wxp-sky i,html.a11y-reduce .wxp-streaks{display:none}
</style>'''


_TAB_ICONS = {
    "tides": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M2 10c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2 1.8-1 2.4-1.4"/><path d="M2 16c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2 1.8-1 2.4-1.4"/></svg>',
    "wind": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M3 9h11.5a3 3 0 1 0-3-3"/><path d="M3 13h15.5a3 3 0 1 1-3 3"/><path d="M3 17h7"/></svg>',
    "radar": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 18.5 5.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
    "satellite": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g transform="rotate(-35 12 12)"><rect x="9.5" y="9" width="5" height="6" rx="1"/><path d="M2.5 9.5h5v5h-5zM16.5 9.5h5v5h-5zM7.5 12h2M14.5 12h2M12 15v3M10 18.5h4"/></g></svg>',
    "sea": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0z"/><path d="M12 10v6"/></svg>',
}


def _tab(key, label, on):
    return ('<button type="button" role="tab" id="wxp-tab-%s" aria-controls="%s" aria-selected="%s" tabindex="%s" data-tab="%s">%s<span>%s</span></button>'
            % (key, key, "true" if on else "false", "0" if on else "-1", key, _TAB_ICONS[key], label))


_WXP_HTML = r'''
    <div class="wxp" id="wxp">
    <script>document.getElementById('wxp').className += ' wxp-js wxp-anim';setTimeout(function(){if(!window.__wxpAnim){var w=document.getElementById('wxp');if(w)w.classList.add('wxp-shown-all');}},5000);</script>
    <section class="wxp-sec b365" id="now" aria-labelledby="now-h">
      <div class="wrap">
        <div id="wxp-warnings" class="wxp-warnings" aria-live="polite" data-anim><p class="wxp-ok mono">Checking Met Office weather warnings&hellip;</p></div>
        <div class="wxp-glance" id="wxp-glance" data-anim style="--d:.08s">
          <div class="wxp-sky" id="wxp-sky" aria-hidden="true"></div>
          <svg class="wxp-wave w-a" viewBox="0 0 2400 80" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 40 C150 18 450 62 600 40 C750 18 1050 62 1200 40 C1350 18 1650 62 1800 40 C1950 18 2250 62 2400 40 V80 H0 Z"/></svg>
          <svg class="wxp-wave w-b" viewBox="0 0 2400 80" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 40 C150 26 450 54 600 40 C750 26 1050 54 1200 40 C1350 26 1650 54 1800 40 C1950 26 2250 54 2400 40 V80 H0 Z"/></svg>
          <h2 id="now-h">Bournemouth right now</h2>
          <noscript><p class="wxp-sub">The live readings on this page need JavaScript. The tide, radar and source notes below still apply.</p></noscript>
          <div class="wxp-now" id="wxp-nowcard">
            <span class="wxp-skel" style="width:55%"></span>
            <div class="wxp-now-top"><div aria-hidden="true" style="width:90px;height:84px"></div><div><span class="wxp-skel" style="width:45%;height:2.8rem"></span><span class="wxp-skel" style="width:75%"></span></div></div>
            <span class="wxp-skel" style="width:85%"></span>
          </div>
          <div class="wxp-vitals" id="wxp-vitals">
            <button type="button" class="wxp-vital" data-go="wind" id="wxp-v-wind"><span class="chip-f" id="wxp-v-wind-chip">WIND &middot; LOADING</span><span class="wxp-skel" style="width:70%"></span><span class="wxp-skel" style="width:50%"></span></button>
            <button type="button" class="wxp-vital" data-go="sea" id="wxp-v-sea"><span class="chip-f" id="wxp-v-sea-chip">SEA &middot; LOADING</span><span class="wxp-skel" style="width:70%"></span><span class="wxp-skel" style="width:50%"></span></button>
            <button type="button" class="wxp-vital" data-go="tides" id="wxp-v-tide"><span class="chip-f" id="wxp-v-tide-chip">PREDICTED &middot; PIER</span><span class="wxp-skel" style="width:70%"></span><span class="wxp-skel" style="width:50%"></span></button>
            <button type="button" class="wxp-vital" data-go="sun" id="wxp-v-sun"><span class="chip-f" id="wxp-v-sun-chip">COMPUTED &middot; PIER</span><span class="wxp-skel" style="width:70%"></span><span class="wxp-skel" style="width:50%"></span></button>
          </div>
        </div>
        <p class="wxp-a2hs-row"><button type="button" class="wxp-a2hs-pill wxp-share-pill" data-share="page"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg> Share</button><button type="button" class="wxp-a2hs-pill" data-a2hs><span aria-hidden="true">&#128204;</span> Add to home screen</button></p>
      </div>
    </section>

    <section class="wxp-sec b365" id="ten-day" aria-labelledby="ten-h">
      <div class="wrap">
        <div class="wxp-head" data-anim><h2 class="wxp-h2" id="ten-h">Next 10 days</h2><span class="chip-f" id="wxp-days-chip">FORECAST &middot; MET NORWAY</span></div>
        <div class="wxp-strip" id="wxp-strip" data-anim="stagger">
          <div class="wxp-strip-list" role="tablist" aria-label="Choose a day" id="wxp-strip-list">
            <span class="wxp-dchip skel"><span class="wxp-skel" style="width:70%"></span></span><span class="wxp-dchip skel"><span class="wxp-skel" style="width:70%"></span></span><span class="wxp-dchip skel"><span class="wxp-skel" style="width:70%"></span></span><span class="wxp-dchip skel"><span class="wxp-skel" style="width:70%"></span></span><span class="wxp-dchip skel"><span class="wxp-skel" style="width:70%"></span></span>
          </div>
          <span class="wxp-ink" id="wxp-ink" aria-hidden="true"></span>
        </div>
        <div class="wxp-dayp" id="wxp-daypanel" role="tabpanel" aria-label="The chosen day" tabindex="-1" data-anim style="--d:.25s"></div>
        <p class="wxp-note">Hour by hour for the first two to three days, then six-hour steps that can still change. Rain is the forecast amount in millimetres &mdash; this forecast gives no percentage chance for our coast, so we don&rsquo;t invent one.</p>
      </div>
    </section>

    <section class="wxp-sec b365 wxp-deck" id="wxp-deck" aria-label="Tides, wind, radar, satellite and the sea" data-anim="stagger">
      <div class="wrap">
        <div class="wxp-sentinel" id="wxp-sentinel" aria-hidden="true"></div>
        <div class="wxp-tabbar" id="wxp-tabbar">
          <div class="wxp-tabs5" data-anim>
            <span class="wxp-tabink" id="wxp-tabink" aria-hidden="true"></span>
            <div class="wxp-tablist" role="tablist" aria-label="Tides, wind, radar, satellite and the sea" id="wxp-tablist">
              __TABS__
            </div>
          </div>
        </div>

        <div class="wxp-panel" id="tides" role="tabpanel" aria-labelledby="wxp-tab-tides" tabindex="-1">
          <div class="wxp-head"><h2 class="wxp-h2" id="tides-h">Bournemouth tide times</h2><span class="chip-f" id="wxp-tide-chip">PREDICTED &middot; LOADING</span></div>
          <p class="wxp-pintro">High and low water at the pier for seven days, with the pier&rsquo;s own gauge drawn over the prediction.</p>
          <div class="wxp-card">
            <p class="wxp-sub" id="wxp-tide-now" style="margin:0">Loading the tide&hellip;</p>
            <p class="wxp-sub" id="wxp-tide-next" style="margin:.35rem 0 0"></p>
            <div class="wxp-chart wxp-scroll" id="wxp-tide-chart" data-sc="Tide chart for the pier"></div>
            <ul class="wxp-legend"><li><i style="background:#79b8ff"></i>Predicted tide</li><li><i style="background:#4fd8c4"></i>Measured by the pier gauge</li><li><i style="background:#ffd76a"></i>Now</li></ul>
          </div>
          <ol class="wxp-tides" id="wxp-tide-table" aria-label="High and low water, next seven days"></ol>
          <button type="button" class="wxp-more-btn" id="wxp-tide-more" aria-expanded="false" aria-controls="wxp-tide-table" hidden>Show the next 4 days</button>
          <p style="margin:.55rem 0 0"><button type="button" class="wxp-share-mini" data-share="tides"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg> Share today&rsquo;s tide times</button></p>
          <p class="wxp-note"><b>Heights are metres above chart datum. Not for navigation</b> &mdash; for passage planning use the official <a href="https://easytide.admiralty.co.uk/" rel="noopener">ADMIRALTY EasyTide</a> tables.</p>
          <details class="wxp-details" id="wxp-tide-acc-box"><summary><span id="wxp-tide-acc-sum">How accurate are these tide times?</span></summary><div>
            <p class="wxp-note" id="wxp-tide-acc">We test the prediction blind against a month the pier gauge measured.</p>
            <p class="wxp-note">Chart datum at Bournemouth is 1.40&nbsp;m below Ordnance Datum Newlyn. The rest of the error is weather &mdash; strong winds and low pressure push the sea above any tide table &mdash; which is why the gauge is drawn live on the chart.</p>
          </div></details>
        </div>

        <div class="wxp-panel" id="wind" role="tabpanel" aria-labelledby="wxp-tab-wind" tabindex="-1" data-off>
          <div class="wxp-head"><h2 class="wxp-h2" id="wind-h">Wind speed and direction</h2></div>
          <p class="wxp-pintro">Measured now at Bournemouth Airport, and MET Norway&rsquo;s 48-hour forecast for the pier &mdash; with what the direction means on the beach.</p>
          <div class="wxp-split">
            <div class="wxp-card" id="wxp-windcard"><span class="chip-f">WIND &middot; LOADING</span><span class="wxp-skel"></span><span class="wxp-skel" style="width:40%"></span></div>
            <div class="wxp-card">
              <span class="chip-f" id="wxp-windfc-chip">FORECAST &middot; MET NORWAY &middot; NEXT 48 HOURS</span>
              <div class="wxp-chart wxp-scroll" id="wxp-wind-chart" data-sc="Forecast wind chart"></div>
              <ul class="wxp-legend"><li><i style="background:#ffb347"></i>Forecast average wind, mph</li><li><i style="background:#ff9f5a;height:8px;width:8px;border-radius:50%"></i>Offshore (blowing out to sea)</li><li><i style="background:#7fd8a8;height:8px;width:8px;border-radius:50%"></i>Onshore</li><li><i style="background:#79b8ff;height:8px;width:8px;border-radius:50%"></i>Along the shore</li></ul>
            </div>
          </div>
          <p class="wxp-note" id="wxp-rnli">Offshore wind blows from the land out to sea. It flattens the waves, but the RNLI warns it can <a href="https://rnli.org/news-and-media/2026/july/09/rnli-issue-warning-as-forecast-of-hot-weather-and-offshore-winds-in-north-west" rel="noopener">very easily sweep inflatables and paddleboards away from the shore</a> &mdash; on offshore days, leave the inflatables on the sand.</p>
        </div>

        <div class="wxp-panel" id="radar" role="tabpanel" aria-labelledby="wxp-tab-radar" tabindex="-1" data-off>
          <div class="wxp-head"><h2 class="wxp-h2" id="radar-h">Rain radar: the last three hours</h2><span class="chip-f" id="wxp-radar-chip">RADAR &middot; LOADING</span></div>
          <div class="wxp-media">
            <div class="wxp-map" id="wxp-radar-map">
              <img class="base" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-src="/bournemouth/media/wx-basemap.jpg" alt="" width="960" height="850">
              <img class="lines" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-src="/bournemouth/media/wx-lines.png" alt="" width="960" height="850" style="z-index:3">
              <span class="wxp-pin" style="left:48.4%;top:43.2%;z-index:4" aria-hidden="true"></span>
            </div>
            <div>
              <p class="wxp-pintro">Where it is raining across Dorset, the Channel and beyond, every 15 minutes. Play the loop to see which way the showers are heading.</p>
              <div class="wxp-ctl" id="wxp-radar-ctl" hidden>
                <button type="button" class="wxp-play">Pause</button>
                <input type="range" min="0" max="0" value="0" aria-label="Radar frame">
                <span class="wxp-time"></span>
              </div>
              <div class="wxp-scale" aria-label="Rain rate colours"><span><i style="background:rgb(116,185,255)"></i>Drizzle</span><span><i style="background:rgb(28,96,232)"></i>Light, 1&ndash;2 mm/h</span><span><i style="background:rgb(40,190,90)"></i>Moderate, 2&ndash;4</span><span><i style="background:rgb(250,220,40)"></i>Heavy, 4&ndash;8</span><span><i style="background:rgb(255,140,20)"></i>Very heavy, 8&ndash;16</span><span><i style="background:rgb(240,40,30)"></i>16&ndash;32</span><span><i style="background:rgb(210,40,210)"></i>32+</span></div>
              <p class="wxp-note" id="wxp-radar-note">Radar: EUMETNET OPERA, CC BY 4.0. Map: &copy; OpenStreetMap contributors, via NASA GIBS.</p>
            </div>
          </div>
        </div>

        <div class="wxp-panel" id="satellite" role="tabpanel" aria-labelledby="wxp-tab-satellite" tabindex="-1" data-off>
          <div class="wxp-head"><h2 class="wxp-h2" id="sat-h">Bournemouth from space</h2><span class="chip-f" id="wxp-sat-chip">SATELLITE &middot; LOADING</span></div>
          <div class="wxp-media">
            <div>
              <div class="wxp-map" id="wxp-sat-map">
                <img class="lines" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-src="/bournemouth/media/wx-lines.png" alt="" width="960" height="850" style="z-index:3">
                <span class="wxp-pin" style="left:48.4%;top:43.2%;z-index:4" aria-hidden="true"></span>
              </div>
              <figure id="wxp-nasa" hidden style="margin:0">
                <img alt="NASA satellite image of the coast from Portland to the Isle of Wight" width="1200" height="759" style="width:100%;height:auto;border-radius:16px;border:1px solid var(--b365-line);display:block">
                <figcaption class="wxp-note" id="wxp-nasa-cap"></figcaption>
              </figure>
            </div>
            <div>
              <p class="wxp-pintro">Cloud over the Channel from Meteosat, a new picture every 10 minutes, plus NASA&rsquo;s sharper once-a-day view of Poole Bay.</p>
              <div class="wxp-views" id="wxp-sat-tabs" role="group" aria-label="Satellite view"></div>
              <div class="wxp-ctl" id="wxp-sat-ctl" hidden>
                <button type="button" class="wxp-play">Pause</button>
                <input type="range" min="0" max="0" value="0" aria-label="Satellite frame">
                <span class="wxp-time"></span>
              </div>
              <p class="wxp-note" id="wxp-sat-note">Images &copy; EUMETSAT, Meteosat Third Generation via EUMETView, CC BY 4.0. Daily picture: NASA Worldview / GIBS. Coastline &copy; OpenStreetMap contributors.</p>
            </div>
          </div>
        </div>

        <div class="wxp-panel" id="sea" role="tabpanel" aria-labelledby="wxp-tab-sea" tabindex="-1" data-off>
          <div class="wxp-head"><h2 class="wxp-h2" id="sea-h">The sea, the beaches and the air</h2></div>
          <div class="wxp-grid">
            <div id="wxp-seatiles" style="display:contents"><div class="wxp-card"><span class="chip-f">SEA &middot; LOADING</span><span class="wxp-skel"></span></div></div>
            <div class="wxp-card" id="wxp-aircard"><span class="chip-f">FORECAST &middot; AIR QUALITY &middot; DEFRA</span><span class="wxp-skel"></span></div>
          </div>
          <p class="wxp-note">More on the water &mdash; wetsuit advice, every beach&rsquo;s classification and the live storm-overflow monitors &mdash; on <a href="/bournemouth/sea-today/">the sea right now</a>.</p>
        </div>
      </div>
    </section>

    <section class="wxp-sec b365 wxp-about" id="sources" aria-labelledby="src-h">
      <div class="wrap" data-anim>
        <h2 class="wxp-h2" id="src-h">Where every number comes from</h2>
        <p class="wxp-note">Every reading on this page wears a label. <b>Measured</b> and <b>observed</b> mean an instrument saw it. <b>Predicted</b>, <b>forecast</b> and <b>computed</b> mean a model or a calculation. <b>Official</b> means it is shown exactly as the issuer published it. When a feed is down or late, the page says so rather than showing old numbers as new. No ads, ever.</p>
        <ul class="wxp-key"><li><span class="chip-m">MEASURED &middot; OBSERVED</span> an instrument</li><li><span class="chip-f">FORECAST &middot; PREDICTED &middot; COMPUTED &middot; OFFICIAL</span> a model, a calculation or an issuer</li></ul>
        <p class="wxp-note">Forecast: MET Norway (CC BY 4.0). Radar: EUMETNET OPERA (CC BY 4.0). Satellite: &copy; EUMETSAT (CC BY 4.0) and NASA Worldview / GIBS. Tides, the pier gauge, the wave buoys and bathing waters: Environment Agency, Cefas and Regional Coastal Monitoring Programme data under the Open Government Licence v3.0. Storm overflows: &copy; Wessex Water, CC BY 4.0. Warnings: Met Office. Air quality: Defra. Wind and temperature now: Bournemouth Airport via the NOAA Aviation Weather Center. Map: &copy; OpenStreetMap contributors.</p>
        <p style="margin:.7rem 0 0;display:flex;flex-wrap:wrap;gap:.5rem"><button type="button" class="wxp-a2hs-pill wxp-share-pill" data-share="page"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg> Share this page</button><button type="button" class="wxp-a2hs-pill wxp-a2hs-any" data-a2hs><span aria-hidden="true">&#128204;</span> Keep Bournemouth weather on your home screen</button></p>
        <details class="wxp-details"><summary>Sources, licences and how often each one updates</summary><div class="wxp-src-wrap"><table class="wxp-src">
          <thead><tr><th scope="col">What</th><th scope="col">Label</th><th scope="col">Source</th><th scope="col">How often</th><th scope="col">Licence</th></tr></thead>
          <tbody>
            <tr><td>Forecast (hourly and 10-day), feels like, humidity, pressure, UV if clear</td><td>Forecast</td><td><a href="https://www.met.no/en" rel="noopener">MET Norway</a> Locationforecast for Bournemouth Pier</td><td>About hourly</td><td><a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener">CC BY 4.0</a>. Changes made: grouped into days, rounded, wind in mph, our own symbols</td></tr>
            <tr><td>Wind and temperature now</td><td>Measured</td><td>Bournemouth Airport (EGHH) reports, via the NOAA Aviation Weather Center</td><td>Every 30 minutes</td><td>Public domain</td></tr>
            <tr><td>Tide times and heights</td><td>Predicted</td><td>365 Techies&rsquo; harmonic prediction fitted to a year of the Environment Agency&rsquo;s Bournemouth pier gauge</td><td>Computed ahead; checked live against the gauge</td><td>Contains Environment Agency data licensed under the Open Government Licence v3.0</td></tr>
            <tr><td>Tide level now</td><td>Measured</td><td>Environment Agency tide gauge on Bournemouth Pier</td><td>Every 15 minutes</td><td>Open Government Licence v3.0</td></tr>
            <tr><td>Sea temperature and waves</td><td>Measured</td><td>Poole Bay wave buoy (Cefas WaveNet), or the Boscombe buoy (Regional Coastal Monitoring Programme) when Poole Bay is not reporting</td><td>Every 30 minutes</td><td>Open Government Licence v3.0</td></tr>
            <tr><td>Storm overflows discharging</td><td>Measured</td><td>Wessex Water Storm Overflow Activity monitors on this coast</td><td>Every few minutes</td><td>&copy; Wessex Water, <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener">CC BY 4.0</a></td></tr>
            <tr><td>Rain radar</td><td>Observed</td><td><a href="https://www.eumetnet.eu/" rel="noopener">EUMETNET</a> OPERA rain-rate composite of the European radar networks, including the Met Office&rsquo;s</td><td>Every 15 minutes</td><td>CC BY 4.0</td></tr>
            <tr><td>Satellite loops</td><td>Observed</td><td><a href="https://www.eumetsat.int/" rel="noopener">EUMETSAT</a> Meteosat Third Generation imagery via EUMETView</td><td>Every 10 minutes</td><td>&copy; EUMETSAT, CC BY 4.0</td></tr>
            <tr><td>Daily high-detail satellite picture</td><td>Observed</td><td>NASA Worldview / GIBS, VIIRS true colour</td><td>Once a day</td><td>Public domain, courtesy of NASA</td></tr>
            <tr><td>Weather warnings</td><td>Official</td><td><a href="https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings" rel="noopener">Met Office</a> warnings for South West England, shown exactly as issued</td><td>Checked every 15 minutes</td><td>&copy; Crown copyright, Met Office RSS terms</td></tr>
            <tr><td>Air quality</td><td>Forecast</td><td>Defra UK-AIR Daily Air Quality Index forecast for Bournemouth</td><td>Daily</td><td>&copy; Crown copyright, Open Government Licence v3.0</td></tr>
            <tr><td>Bathing water classifications</td><td>Official</td><td>Environment Agency bathing water quality</td><td>Daily in the season</td><td>Open Government Licence v3.0</td></tr>
            <tr><td>Sunrise, sunset, golden hour, moon</td><td>Computed</td><td>Astronomy, calculated in your browser for the pier</td><td>Always current</td><td>&mdash;</td></tr>
            <tr><td>Map coastline</td><td>&mdash;</td><td>&copy; OpenStreetMap contributors, via NASA GIBS</td><td>&mdash;</td><td><a href="https://www.openstreetmap.org/copyright" rel="noopener">ODbL</a></td></tr>
          </tbody></table></div></details>
      </div>
    </section>
    <div class="wxp-a2hs" id="wxp-a2hs" role="dialog" aria-labelledby="wxp-a2hs-h" hidden>
      <span class="wxp-a2hs-ic" aria-hidden="true"></span>
      <div class="wxp-a2hs-body">
        <p class="wxp-a2hs-h" id="wxp-a2hs-h">Keep Bournemouth weather one tap away</p>
        <p class="wxp-a2hs-sub">Put it on your home screen: the forecast, tide times and rain radar, straight from an icon.</p>
        <div class="wxp-a2hs-how" id="wxp-a2hs-how" aria-live="polite" hidden></div>
        <div class="wxp-a2hs-btns"><button type="button" class="wxp-a2hs-add" id="wxp-a2hs-add">Add to home screen</button><button type="button" class="wxp-a2hs-no" id="wxp-a2hs-no">Not now</button></div>
      </div>
      <button type="button" class="wxp-a2hs-x" id="wxp-a2hs-x" aria-label="Close">&times;</button>
    </div>
    <div class="wxp-a2hs wxp-share" id="wxp-share" role="dialog" aria-labelledby="wxp-share-h" hidden>
      <div class="wxp-a2hs-body" style="grid-column:1/-1">
        <p class="wxp-a2hs-h" id="wxp-share-h">Share</p>
        <p class="wxp-share-text" id="wxp-share-text"></p>
        <div class="wxp-share-grid" id="wxp-share-grid"></div>
        <p class="wxp-share-done" id="wxp-share-done" aria-live="polite"></p>
      </div>
      <button type="button" class="wxp-a2hs-x" id="wxp-share-x" aria-label="Close">&times;</button>
    </div>
    </div>'''.replace("__TABS__", "\n              ".join([
    _tab("tides", "Tides", True), _tab("wind", "Wind", False), _tab("radar", "Radar", False),
    _tab("satellite", "Satellite", False), _tab("sea", "Sea &amp; air", False)]))


_WXP_JS = r'''
<script>
(function () {
  var root = document.getElementById('wxp');
  if (!root || !window.fetch) return;
  var MQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(MQ && MQ.matches) || document.documentElement.classList.contains('a11y-reduce'); }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  /* one formatter per option set: building a formatter is the slow part of toLocaleString (a long task on phones) */
  var FMTS = {};
  function lon(iso, o) {
    var k = JSON.stringify(o), f = FMTS[k];
    if (!f) { try { f = new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: 'Europe/London' }, o)); } catch (e) { f = new Intl.DateTimeFormat('en-GB', o); } FMTS[k] = f; }
    return f.format(new Date(iso));
  }
  function hhmm(iso) { return lon(iso, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }
  function age(iso) { var t = Date.parse(iso); return isNaN(t) ? Infinity : Date.now() - t; }
  function ukDate(iso) { return lon(iso, { year: 'numeric', month: '2-digit', day: '2-digit' }); }
  function ukYmd(ms) { var s2 = ukDate(new Date(ms).toISOString()).split('/'); return s2[2] + '-' + s2[1] + '-' + s2[0]; }
  /* UK midnight of a YYYY-MM-DD day: UK offsets are whole hours, so step hourly from 2 h before UTC midnight */
  function londonMidnight(ymd) {
    var p2 = ymd.split('-'), t = Date.UTC(+p2[0], +p2[1] - 1, +p2[2], 0, 0) - 2 * 3600000;
    for (var k = 0; k < 6; k++, t += 3600000) if (ukYmd(t) === ymd) return t;
    return Date.UTC(+p2[0], +p2[1] - 1, +p2[2], 0, 0);
  }
  function longDay(ymd) { return lon(new Date(londonMidnight(ymd) + 12 * 3600000).toISOString(), { weekday: 'long', day: 'numeric', month: 'long' }); }
  function shortDay(ymd) { return lon(new Date(londonMidnight(ymd) + 12 * 3600000).toISOString(), { weekday: 'short' }); }
  function dayLabel(iso) {
    var today = ukDate(new Date().toISOString()), tomorrow = ukDate(new Date(Date.now() + 864e5).toISOString()), d = ukDate(iso);
    return d === today ? 'Today' : d === tomorrow ? 'Tomorrow' : lon(iso, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function ago(iso) { var m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : Math.round(m / 60) + ' h ago'; }
  var COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  function compass(d) { return (d === null || d === undefined || isNaN(d)) ? '' : COMPASS[Math.round(d / 22.5) % 16]; }
  function mph(ms) { return Math.round(ms * 2.23694); }
  function ktmph(kt) { return Math.round(kt * 1.15078); }
  function deg(t) { return Math.round(t) + '\u00b0'; }
  function has(v) { return v !== null && v !== undefined && !isNaN(v); }
  function beaufort(m) {
    var lim = [1, 4, 8, 13, 19, 25, 32, 39, 47, 55, 64, 73], names = ['Calm', 'Light air', 'Light breeze', 'Gentle breeze', 'Moderate breeze', 'Fresh breeze', 'Strong breeze', 'Near gale', 'Gale', 'Strong gale', 'Storm', 'Violent storm', 'Hurricane force'];
    for (var i = 0; i < lim.length; i++) if (m < lim[i]) return [i, names[i]];
    return [12, names[12]];
  }
  /* Bournemouth beach faces the sea at about 160 degrees (SSE). Wind FROM the sea = onshore. */
  function shore(dir) {
    if (!has(dir)) return null;
    var diff = Math.abs(((dir - 160 + 540) % 360) - 180);
    return diff <= 60 ? 'on' : diff >= 120 ? 'off' : 'cross';
  }
  var SHORE_WORD = { on: 'Onshore', off: 'Offshore', cross: 'Along the shore' };
  var SHORE_COL = { on: '#7fd8a8', off: '#ff9f5a', cross: '#79b8ff' };
  function setChip(id, cls, txt) { var e = $(id); if (e) { e.className = cls; e.textContent = txt; } }
  function svgEl(w, h, label, body) { return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label) + '">' + body + '</svg>'; }
  /* a chart gets a keyboard stop and a "scrolls sideways" name only when it really scrolls */
  function scrollRegions(scope) {
    [].forEach.call((scope || root).querySelectorAll('.wxp-scroll'), function (el) {
      if (el.scrollWidth > el.clientWidth + 4) { el.setAttribute('role', 'region'); el.tabIndex = 0; el.setAttribute('aria-label', (el.getAttribute('data-sc') || 'Chart') + ', scrolls sideways'); }
      else { el.removeAttribute('role'); el.removeAttribute('tabindex'); el.removeAttribute('aria-label'); }
    });
  }
  function uvCol(u) { return u < 3 ? '#7fd8a8' : u < 6 ? '#ffd84d' : u < 8 ? '#ff9f5a' : '#ff5a5a'; }
  function rise(el) { if (!el || reduced()) return; el.classList.remove('wxp-rise'); void el.offsetWidth; el.classList.add('wxp-rise'); }

  /* ---------------- animated weather symbols (MET Norway symbol_code) ---------------- */
  function kind(code) {
    var c = String(code || ''), base = c.split('_')[0], night = /_night|_polartwilight/.test(c);
    var k = /thunder/.test(base) ? 'thunder' : /snow/.test(base) ? 'snow' : /sleet/.test(base) ? 'sleet'
      : /rain/.test(base) ? (/showers/.test(base) ? 'showers' : 'rain')
      : base === 'fog' ? 'fog' : base === 'cloudy' ? 'cloudy' : base === 'partlycloudy' ? 'partly'
      : base === 'fair' ? 'fair' : base === 'clearsky' ? 'clear' : 'cloudy';
    return { k: k, night: night, heavy: /heavy/.test(base), light: /light/.test(base) };
  }
  function words(code) {
    var s = kind(code), q = s.heavy ? 'Heavy ' : s.light ? 'Light ' : '';
    switch (s.k) {
      case 'clear': return s.night ? 'Clear' : 'Sunny';
      case 'fair': return s.night ? 'Mostly clear' : 'Mostly sunny';
      case 'partly': return s.night ? 'Partly cloudy' : 'Sunny spells';
      case 'cloudy': return 'Cloudy';
      case 'fog': return 'Fog';
      case 'rain': return q ? q + 'rain' : 'Rain';
      case 'showers': return q ? q + 'showers' : 'Showers';
      case 'sleet': return q ? q + 'sleet' : 'Sleet';
      case 'snow': return q ? q + 'snow' : 'Snow';
      case 'thunder': return 'Thundery rain';
    }
    return 'Cloudy';
  }
  var CLOUD = 'M18 48h28c5.6 0 10-4.4 10-10s-4.4-9.8-9.8-10C44.6 21.2 39 17 32.5 17c-7.3 0-13.3 5.3-14.3 12.3C12.9 30 9 34 9 39c0 5 4 9 9 9z';
  function sunG(t) { var r = ''; for (var i = 0; i < 8; i++) r += '<line x1="32" y1="8" x2="32" y2="14" transform="rotate(' + (i * 45) + ' 32 32)"/>';
    return '<g transform="' + (t || '') + '"><circle class="wx-halo" cx="32" cy="32" r="14"/><g class="wx-rays"><g class="wx-rays-b">' + r + '</g></g><circle class="wx-core" cx="32" cy="32" r="11.5"/></g>'; }
  function moonG(t) { return '<g transform="' + (t || '') + '"><circle class="wx-star" cx="14" cy="16" r="1.6"/><circle class="wx-star" cx="50" cy="12" r="1.3" style="animation-delay:-1.1s"/><path class="wx-moon" d="M38 12a19 19 0 1 0 14 31A16 16 0 1 1 38 12z"/></g>'; }
  function cloudG(t, cls) { return '<g transform="' + (t || '') + '"><path class="' + (cls || 'wx-cl') + '" d="' + CLOUD + '"/></g>'; }
  function dropsG(n, snow, sleet) {
    var out = '', x0 = 32 - (n - 1) * 4.5;
    for (var i = 0; i < n; i++) {
      var x = x0 + i * 9, dl = ' style="animation-delay:-' + (i * 0.31).toFixed(2) + 's"';
      out += (snow || (sleet && i % 2)) ? '<circle class="wx-flake" cx="' + x + '" cy="53" r="2.3"' + dl + '/>' : '<line class="wx-drop" x1="' + x + '" y1="50" x2="' + (x - 2) + '" y2="56"' + dl + '/>';
    }
    return out;
  }
  function icon(code, cls, attrs) {
    var s = kind(code), b = '', lum = s.night ? moonG : sunG;
    switch (s.k) {
      case 'clear': b = lum(''); break;
      case 'fair': b = lum('translate(-5 -6)') + cloudG('translate(20 20) scale(.62)'); break;
      case 'partly': b = lum('translate(-9 -9) scale(.86)') + cloudG('translate(5 6) scale(.9)'); break;
      case 'cloudy': b = cloudG('translate(-7 -9) scale(.8)', 'wx-cl2') + cloudG('translate(4 3) scale(.92)'); break;
      case 'fog': b = cloudG('translate(0 -8)', 'wx-cl2') + '<line class="wx-fog" x1="12" y1="50" x2="50" y2="50"/><line class="wx-fog" x1="18" y1="57" x2="56" y2="57" style="animation-delay:-2s"/>'; break;
      case 'rain': b = cloudG('translate(0 -9)') + dropsG(s.heavy ? 4 : s.light ? 2 : 3); break;
      case 'showers': b = lum('translate(-10 -12) scale(.78)') + cloudG('translate(3 -5) scale(.92)') + dropsG(s.heavy ? 3 : 2); break;
      case 'sleet': b = cloudG('translate(0 -9)') + dropsG(3, false, true); break;
      case 'snow': b = cloudG('translate(0 -9)') + dropsG(s.heavy ? 4 : 3, true); break;
      case 'thunder': b = cloudG('translate(0 -10)', 'wx-cl2') + '<path class="wx-bolt" d="M34 36l-8 13h7l-4 11 13-16h-7l5-8z"/>' + dropsG(2); break;
    }
    return '<svg class="wx-ic ' + (s.heavy ? 'wx-heavy ' : '') + (cls || '') + '" ' + (attrs || '') + ' viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + b + '</svg>';
  }
  function arrow(d) { if (!has(d)) return ''; return '<svg class="wxp-arrow" viewBox="0 0 16 16" aria-hidden="true" data-rot="' + ((d + 180) % 360) + '"><path d="M8 1 13 13 8 10 3 13z"/></svg>'; }
  function swingArrows(scope) { requestAnimationFrame(function () { requestAnimationFrame(function () {
    var a = (scope || root).querySelectorAll('.wxp-arrow[data-rot]'); for (var i = 0; i < a.length; i++) a[i].style.transform = 'rotate(' + a[i].getAttribute('data-rot') + 'deg)';
  }); }); }

  /* ---------------- astronomy (COMPUTED in the browser) ---------------- */
  var LAT = 50.7163, LNG = -1.8762;
  function sunElev(ms) {
    var d = ms / 864e5 + 2440587.5 - 2451545.0, rad = Math.PI / 180;
    var g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d;
    var L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad;
    var dec = Math.asin(Math.sin(e) * Math.sin(L)), ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
    var gmst = (18.697374558 + 24.06570982441908 * d) % 24, ha = (gmst * 15 + LNG) * rad - ra;
    return Math.asin(Math.sin(LAT * rad) * Math.sin(dec) + Math.cos(LAT * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
  }
  var sunCache = {};
  function sunDay(ymd) {
    if (sunCache[ymd]) return sunCache[ymd];
    /* scan the UK day minute by minute with pure maths (no toLocaleString inside the loop - that was ~3,000 slow calls) */
    var mid = londonMidnight(ymd), found = {};
    var prev = sunElev(mid - 60000);
    for (var t = mid; t < mid + 24 * 3600000; t += 60000) {
      var e = sunElev(t);
      if (prev < -0.833 && e >= -0.833) found.rise = t;
      if (prev >= -0.833 && e < -0.833) found.set = t;
      if (prev < 6 && e >= 6) found.goldAmEnd = t;
      if (prev >= 6 && e < 6) found.goldPmStart = t;
      prev = e;
    }
    return (sunCache[ymd] = found);
  }
  function moon(ms) {
    var syn = 29.530588853, age = ((ms / 864e5 + 2440587.5 - 2451550.1) / syn) % 1; if (age < 0) age += 1;
    var illum = (1 - Math.cos(2 * Math.PI * age)) / 2;
    var name = age < 0.0339 || age > 0.9661 ? 'New moon' : age < 0.216 ? 'Waxing crescent' : age < 0.284 ? 'First quarter' : age < 0.466 ? 'Waxing gibbous'
      : age < 0.534 ? 'Full moon' : age < 0.716 ? 'Waning gibbous' : age < 0.784 ? 'Last quarter' : 'Waning crescent';
    return { age: age, illum: illum, name: name };
  }
  function tm(ms) { return ms ? hhmm(new Date(ms).toISOString()) : '&mdash;'; }

  /* ---------------- warnings ---------------- */
  function renderWarnings(w) {
    var box = $('wxp-warnings'), url = (w && w.source_url) || 'https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings';
    var link = '<a href="' + esc(url) + '" rel="noopener">Met Office warnings</a>';
    if (!w || !w.ok) { box.innerHTML = '<p class="wxp-ok"><span class="chip-f">WARNINGS &middot; NOT AVAILABLE</span>We couldn\u2019t check the Met Office warnings just now &middot; ' + link + '</p>'; return; }
    var old = w.stale || age(w.checked) > 3 * 3600000;
    if (!w.items.length) {
      box.innerHTML = old
        ? '<p class="wxp-ok"><span class="chip-f">LAST CHECKED ' + ago(w.checked).toUpperCase() + '</span>We couldn\u2019t check the Met Office warnings recently &middot; ' + link + '</p>'
        : '<p class="wxp-ok"><span class="chip-f">OFFICIAL</span>No Met Office weather warnings<span class="wxp-long"> for ' + esc(w.region) + '</span> &middot; checked ' + hhmm(w.checked) + ' &middot; ' + link + '</p>';
      return;
    }
    /* Met Office RSS terms: shown exactly as issued, linked back */
    box.innerHTML = w.items.map(function (it) {
      return '<div class="wxp-warn" role="alert"><span class="chip-f">OFFICIAL &middot; MET OFFICE WARNING</span><p style="margin:.3rem 0"><a href="' + esc(it.link) + '" rel="noopener"><b>' + esc(it.title) + '</b></a></p><p style="margin:0">' + esc(it.description) + '</p></div>';
    }).join('') + (old ? '<p class="wxp-ok">Last checked ' + ago(w.checked) + ' &middot; ' + link + '</p>' : '');
  }

  /* ---------------- GLANCE ---------------- */
  function setSky(code) {
    var s = kind(code), box = $('wxp-sky'), parts = '', i, type;
    type = s.k === 'thunder' ? 'storm' : (s.k === 'rain' || s.k === 'showers' || s.k === 'sleet') ? 'rain' : s.k === 'snow' ? 'snow' : s.k === 'fog' ? 'fog'
      : s.k === 'cloudy' ? 'cloud' : s.night ? 'night' : (s.k === 'partly' ? 'cloud' : 'sun');
    if (type === 'sun' || (s.k === 'partly' && !s.night)) parts += '<i class="sk-glow"></i>' + (type === 'sun' ? '<i class="sk-rays"></i>' : '');
    if (type === 'night' || (s.night && s.k !== 'cloudy')) { parts += '<i class="sk-moon"></i>'; for (i = 0; i < 28; i++) parts += '<i class="sk-star" style="left:' + ((i * 37 + 11) % 97) + '%;top:' + ((i * 53 + 7) % 90) + '%;animation-delay:-' + (i * 0.41).toFixed(2) + 's"></i>'; }
    if (type !== 'sun' && type !== 'night') for (i = 0; i < 4; i++) parts += '<i class="sk-cloud" style="top:' + (2 + i * 20) + '%;animation-duration:' + (18 + i * 5) + 's;animation-delay:-' + (i * 7 + 3) + 's"></i>';
    if (type === 'rain' || type === 'storm') for (i = 0; i < 24; i++) parts += '<i class="sk-drop" style="left:' + ((i * 41 + 7) % 104) + '%;animation-duration:' + (0.85 + (i % 5) * 0.11).toFixed(2) + 's;animation-delay:-' + ((i * 0.29) % 1.3).toFixed(2) + 's"></i>';
    if (type === 'snow') for (i = 0; i < 18; i++) parts += '<i class="sk-flake" style="left:' + ((i * 43 + 9) % 100) + '%;animation-duration:' + (5 + (i % 4)) + 's;animation-delay:-' + ((i * 0.7) % 6).toFixed(1) + 's"></i>';
    if (type === 'fog') parts += '<i class="sk-haze"></i><i class="sk-haze" style="top:58%;animation-delay:-9s"></i>';
    if (type === 'storm') parts += '<i class="sk-flash"></i>';
    box.className = 'wxp-sky sky-' + type;
    box.innerHTML = reduced() ? '' : parts;
    requestAnimationFrame(function () { box.classList.add('on'); });
  }

  function obsOld(o) { return !!(o.stale || age(o.latest.t) > 90 * 60000); }
  function renderGlance(d) {
    var f = d.forecast, o = d.obs, card = $('wxp-nowcard'), obsLine = '';
    if (o && o.ok && o.latest && has(o.latest.temp)) {
      var oo = obsOld(o);
      obsLine = '<p class="wxp-sub wxp-obs"><span class="' + (oo ? 'chip-f' : 'chip-m') + '">' + (oo ? 'LAST HEARD ' + ago(o.latest.t).toUpperCase() : 'MEASURED ' + hhmm(o.latest.t)) + ' &middot; <span class="wxp-long">BOURNEMOUTH </span>AIRPORT</span><span><b>' + deg(o.latest.temp) + '</b> in the air<span class="wxp-long">, 7 km inland</span></span></p>';
    }
    if (!f || !f.ok || !f.hours || !f.hours.length) {
      card.innerHTML = '<span class="chip-f">FORECAST &middot; NOT AVAILABLE</span><p class="wxp-sub">The forecast feed isn\u2019t answering, so nothing is shown rather than an old forecast.</p>' + obsLine;
    } else {
      var h0 = f.hours[0], t0 = f.days && f.days[0], facts = [];
      if (has(h0.feels) && Math.abs(h0.feels - h0.temp) >= 1) facts.push('Feels like <b>' + deg(h0.feels) + '</b>');
      facts.push(h0.rain > 0 ? '<b>' + h0.rain.toFixed(1) + ' mm</b> of rain this hour' : '<b>Dry</b> this hour');
      if (has(h0.rh)) facts.push('Humidity <b>' + h0.rh + '%</b>');
      if (has(h0.pres)) facts.push('Pressure <b>' + h0.pres + ' hPa</b>');
      card.innerHTML = '<span class="chip-f">FORECAST FOR ' + hhmm(h0.t) + ' &middot; MET NORWAY<span class="wxp-long"> &middot; ISSUED ' + hhmm(f.issued) + '</span>' + (f.stale ? ' &middot; OLDER THAN USUAL' : '') + '</span>'
        + '<div class="wxp-now-top">' + icon(h0.sym) + '<div><p class="wxp-num">' + deg(h0.temp) + '</p><p class="wxp-now-w">' + esc(words(h0.sym)) + '</p></div></div>'
        + (t0 ? '<p class="wxp-sub wxp-hilo">' + (t0.part ? 'Rest of today' : 'Today') + ' up to <b>' + deg(t0.hi) + '</b>, down to <b>' + deg(t0.lo) + '</b></p>' : '')
        + '<p class="wxp-sub">' + facts.join(' &middot; ') + '</p>' + obsLine;
      setSky(h0.sym);
    }
    rise(card);
    renderVitals(d);
  }

  function vital(id, chipCls, chipTxt, value, cap, go) {
    var b = $(id); if (!b) return;
    b.innerHTML = '<span class="' + chipCls + '" id="' + id + '-chip">' + chipTxt + '</span><span class="v">' + value + '</span><span class="c">' + cap + '</span><span class="go">' + go + ' &rarr;</span>';
    b.style.animationDelay = (0.18 + ({ 'wxp-v-wind': 0, 'wxp-v-sea': 1, 'wxp-v-tide': 2, 'wxp-v-sun': 3 }[id] || 0) * 0.09) + 's';
    rise(b);
  }
  function windWords(dir, sh) { return (dir === null ? 'Variable' : 'From the ' + compass(dir)) + (sh ? ' &middot; ' + SHORE_WORD[sh].toLowerCase() : ''); }
  function renderVitals(d) {
    var o = d.obs, f = d.forecast;
    /* wind: measured at the airport; if the report is missing, the pier forecast wearing the forecast label */
    if (o && o.ok && o.latest && has(o.latest.wspd)) {
      var L = o.latest, oo = obsOld(o), sp = ktmph(L.wspd), calm = L.wspd < 1, dir = (calm || L.wdir === 'VRB' || !has(L.wdir)) ? null : +L.wdir, sh = shore(dir);
      vital('wxp-v-wind', oo ? 'chip-f' : 'chip-m', oo ? 'LAST HEARD ' + ago(L.t).toUpperCase() : 'MEASURED ' + hhmm(L.t),
        calm ? 'Calm' : (dir === null ? '' : '<span class="wxp-sway" style="color:' + (SHORE_COL[sh] || 'inherit') + '">' + arrow(dir) + '</span>') + sp + ' mph',
        (calm ? 'Barely a breath of wind' : windWords(dir, sh)) + '<br>Bournemouth Airport', 'Wind');
    } else if (f && f.ok && f.hours && f.hours.length) {
      var h = f.hours[0], s2 = shore(h.dir);
      vital('wxp-v-wind', 'chip-f', 'FORECAST ' + hhmm(h.t), '<span class="wxp-sway" style="color:' + (SHORE_COL[s2] || 'inherit') + '">' + arrow(h.dir) + '</span>' + mph(h.wind) + ' mph', windWords(h.dir, s2) + '<br>MET Norway, the pier', 'Wind');
    } else {
      vital('wxp-v-wind', 'chip-f', 'WIND &middot; NOT AVAILABLE', '&mdash;', 'No wind report<br>right now', 'Wind');
    }
    var sea = d.sea && d.sea.sea;
    if (sea && sea.ok) {
      var so = sea.stale || age(sea.read_at) > 3 * 3600000;
      vital('wxp-v-sea', so ? 'chip-f' : 'chip-m', so ? 'LAST HEARD ' + ago(sea.read_at).toUpperCase() : 'MEASURED ' + hhmm(sea.read_at),
        sea.tempC.toFixed(1) + '\u00b0C sea', 'Waves ' + sea.hs.toFixed(1) + ' m<br>' + esc(sea.station), 'Sea &amp; beaches');
    } else {
      vital('wxp-v-sea', 'chip-f', 'SEA &middot; NOT AVAILABLE', '&mdash;', 'The buoy isn\u2019t reporting<br>right now', 'Sea &amp; beaches');
    }
    var t = d.tide, nextT = [];
    if (t && t.ok) { var now = Date.now(); nextT = groupTides(t.events).filter(function (x) { return Date.parse(x.type === 'HH' ? x.t2 : x.t) > now; }); }
    if (nextT.length) {
      var a = nextT[0], b2 = nextT[1];
      /* a double high water keeps its second time in the caption, so the value never outgrows a phone-width button */
      var cap = a.type === 'HH' ? '&amp; ' + hhmm(a.t2) + ', double high &middot; ' + a.h.toFixed(1) + ' m'
        : a.h.toFixed(1) + ' m' + (b2 ? ' &middot; then ' + (b2.type === 'L' ? 'low ' : 'high ') + hhmm(b2.t) : '');
      vital('wxp-v-tide', 'chip-f', 'PREDICTED<span class="wxp-long"> &middot; PIER</span>', (a.type === 'L' ? 'Low ' : 'High ') + hhmm(a.t), cap + '<br>Not for navigation', 'All tides');
    } else {
      vital('wxp-v-tide', 'chip-f', 'TIDE &middot; NOT AVAILABLE', '&mdash;', 'Tide times aren\u2019t<br>available right now', 'Tides');
    }
    var ymd = ukYmd(Date.now()), sd = sunDay(ymd), nowMs = Date.now(), val, cap2;
    if (sd.set && nowMs < sd.set) {
      var before = sd.rise && nowMs < sd.rise;
      val = before ? 'Sunrise ' + tm(sd.rise) : 'Sunset ' + tm(sd.set);
      cap2 = before ? 'Golden hour to ' + tm(sd.goldAmEnd) : 'Golden hour from ' + tm(sd.goldPmStart);
    } else {
      var sd2 = sunDay(ukYmd(nowMs + 864e5));
      val = 'Sunrise ' + tm(sd2.rise); cap2 = 'Tomorrow &middot; golden hour to ' + tm(sd2.goldAmEnd);
    }
    vital('wxp-v-sun', 'chip-f', 'COMPUTED<span class="wxp-long"> &middot; PIER</span>', val, cap2 + '<br>' + esc(moon(nowMs).name), 'Sun &amp; moon');
    swingArrows($('wxp-vitals'));
  }

  /* H, D, H -> one double high water */
  function groupTides(e) {
    var evs = [];
    for (var i = 0; i < (e || []).length; i++) {
      if (e[i].type === 'H' && e[i + 1] && e[i + 1].type === 'D' && e[i + 2] && e[i + 2].type === 'H') { evs.push({ type: 'HH', t: e[i].t, h: e[i].h, t2: e[i + 2].t, h2: e[i + 2].h }); i += 2; }
      else if (e[i].type !== 'D') evs.push(e[i]);
    }
    return evs;
  }
  function evChip(x) {
    if (x.type === 'HH') return '<span class="wxp-ev hi"><span class="wxp-long">High</span><span class="wxp-short">Double high</span> <span class="nw"><b>' + hhmm(x.t) + '</b> ' + x.h.toFixed(1) + 'm</span> &amp; <span class="nw"><b>' + hhmm(x.t2) + '</b> ' + x.h2.toFixed(1) + 'm</span> <small class="wxp-long">double high water</small></span>';
    return '<span class="wxp-ev ' + (x.type === 'H' ? 'hi' : 'lo') + '">' + (x.type === 'H' ? 'High' : 'Low') + ' <span class="nw"><b>' + hhmm(x.t) + '</b> ' + x.h.toFixed(1) + 'm</span></span>';
  }

  /* ---------------- DAY: the strip and one day panel ---------------- */
  var dayIdx = -1;
  function renderStrip(d, keepYmd) {
    var f = d.forecast, list = $('wxp-strip-list'), panel = $('wxp-daypanel');
    if (!f || !f.ok || !f.days || !f.days.length) {
      list.innerHTML = '<p class="wxp-sub">The 10-day forecast isn\u2019t available right now.</p>'; panel.innerHTML = ''; panel.style.minHeight = '0';
      $('wxp-ink').classList.remove('on'); setChip('wxp-days-chip', 'chip-f', 'FORECAST \u00b7 NOT AVAILABLE'); dayIdx = -1; return;
    }
    panel.style.minHeight = '';
    list.classList.toggle('no-pop', !!keepYmd);
    setChip('wxp-days-chip', 'chip-f', 'FORECAST \u00b7 MET NORWAY \u00b7 ISSUED ' + hhmm(f.issued));
    var gmin = Infinity, gmax = -Infinity;
    f.days.forEach(function (x) { gmin = Math.min(gmin, x.lo); gmax = Math.max(gmax, x.hi); });
    var span = Math.max(1, gmax - gmin);
    list.innerHTML = f.days.map(function (x, k) {
      var label = k === 0 ? 'Today' : k === 1 ? 'Tomorrow' : shortDay(x.d) + ' ' + (+x.d.split('-')[2]), sh = shore(x.dir);
      var name = label + ' \u2013 ' + (k === 0 ? (x.part ? 'rest of today' : 'today') : longDay(x.d)) + ': ' + words(x.sym) + ', up to ' + Math.round(x.hi) + ' down to ' + Math.round(x.lo) + ' degrees, '
        + (x.rain >= 0.1 ? x.rain.toFixed(1) + ' millimetres of rain' : 'dry') + ', wind up to ' + mph(x.wind) + ' miles an hour' + (sh ? ', ' + SHORE_WORD[sh].toLowerCase() : '') + ', forecast';
      return '<button type="button" role="tab" class="wxp-dchip" style="--i:' + k + '" id="wxp-day-' + k + '" data-i="' + k + '" aria-selected="false" tabindex="-1" aria-controls="wxp-daypanel" aria-label="' + esc(name) + '">'
        + '<span class="dl">' + esc(label) + '</span>' + icon(x.sym, '')
        + '<span class="hl"><b>' + deg(x.hi) + '</b> <span>' + deg(x.lo) + '</span></span>'
        + '<span class="rg" aria-hidden="true"><i style="left:' + ((x.lo - gmin) / span * 100).toFixed(1) + '%;width:' + Math.max(6, (x.hi - x.lo) / span * 100).toFixed(1) + '%;animation-delay:' + (0.1 + 0.05 * k).toFixed(2) + 's"></i></span>'
        + '<span class="mt">' + (x.rain >= 0.1 ? x.rain.toFixed(1) + ' mm' : 'Dry') + '</span>'
        + '<span class="mt" style="color:' + (SHORE_COL[sh] || 'inherit') + '">' + arrow(x.dir) + '<span style="color:var(--b365-mute)">' + mph(x.wind) + ' mph</span></span></button>';
    }).join('');
    swingArrows(list);
    var chips = list.querySelectorAll('.wxp-dchip');
    [].forEach.call(chips, function (b) {
      b.addEventListener('click', function () { selectDay(+b.getAttribute('data-i'), { scrollStrip: true }); });
      b.addEventListener('keydown', function (e) {
        var i = +b.getAttribute('data-i'), n = chips.length, j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % n; else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n; else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1;
        if (j === null) return;
        e.preventDefault(); selectDay(j, { scrollStrip: true }); chips[j].focus();
      });
    });
    var start = 0, want = pendingDay || keepYmd;
    if (want) f.days.forEach(function (x, k) { if (x.d === want) start = k; });
    pendingDay = null;
    dayIdx = -1;
    selectDay(start, { scrollStrip: true, instant: true });
  }
  function moveInk() {
    var ink = $('wxp-ink'), chip = $('wxp-day-' + dayIdx), strip = $('wxp-strip');
    if (!ink || !chip) return;
    var sr = strip.getBoundingClientRect(), cr = chip.getBoundingClientRect();
    ink.style.width = cr.width + 'px'; ink.style.height = cr.height + 'px';
    ink.style.transform = 'translateX(' + (cr.left - sr.left + strip.scrollLeft).toFixed(1) + 'px)';
    ink.classList.add('on');
  }
  function selectDay(i, opts) {
    var f = last && last.forecast; if (!f || !f.days[i]) return;
    opts = opts || {};
    var dir = dayIdx < 0 ? 0 : i > dayIdx ? 1 : i < dayIdx ? -1 : 0;
    if (i === dayIdx && !opts.force) return;
    dayIdx = i;
    var list = $('wxp-strip-list'), chips = list.querySelectorAll('.wxp-dchip');
    [].forEach.call(chips, function (c, k) { c.setAttribute('aria-selected', k === i ? 'true' : 'false'); c.tabIndex = k === i ? 0 : -1; });
    $('wxp-daypanel').setAttribute('aria-labelledby', 'wxp-day-' + i);
    moveInk();
    if (opts.scrollStrip) {
      var strip = $('wxp-strip'), chip = chips[i];
      if (strip.scrollWidth > strip.clientWidth + 2) {
        var left = chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2;
        try { strip.scrollTo({ left: Math.max(0, left), behavior: opts.instant || reduced() ? 'instant' : 'smooth' }); } catch (e) { strip.scrollLeft = left; }
      }
    }
    renderDay(i, dir);
  }

  function dayTides(ymd) {
    var d = last;
    if (!d.tide || !d.tide.ok) return '';
    var te = groupTides(d.tide.events).filter(function (x) { return ukYmd(Date.parse(x.t)) === ymd; });
    var rg = (d.tide.days || []).filter(function (x) { return x.d === ymd; })[0];
    return '<div class="wxp-card"><span class="chip-f">PREDICTED &middot; PIER TIDE</span>'
      + (te.length ? '<div class="wxp-evs" style="margin-top:.5rem">' + te.map(evChip).join('') + '</div>' : '<p class="wxp-sub">Tide times for this day aren\u2019t available.</p>')
      + (rg ? '<p class="wxp-sub">Rise and fall <b>' + rg.range.toFixed(1) + ' m</b>' + (rg.range < 0.55 ? ' &mdash; a neap day, the sea barely moves' : '') + '.</p>' : '')
      + '<p class="wxp-sub" style="font-size:.8rem">Heights above chart datum. Not for navigation.</p></div>';
  }
  function daySun(ymd) {
    var sd = sunDay(ymd), mo = moon(londonMidnight(ymd) + 12 * 3600000), len = sd.rise && sd.set ? Math.round((sd.set - sd.rise) / 60000) : null;
    var shadow = mo.age < 0.5 ? (1 - mo.age * 2) * 100 : -(mo.age - 0.5) * 2 * 100;
    return '<div class="wxp-card wxp-sunc" id="wxp-dsun"><span class="chip-f">COMPUTED &middot; SUN &amp; MOON AT THE PIER</span>'
      + '<div style="display:flex;gap:.8rem;align-items:center;margin-top:.35rem"><div style="flex:1;min-width:0"><p class="wxp-mid" style="font-size:1.45rem;margin:0">' + tm(sd.rise) + ' &ndash; ' + tm(sd.set) + '</p>'
      + '<p class="wxp-sub" style="margin:0">Sunrise to sunset' + (len ? ' &middot; <b>' + Math.floor(len / 60) + 'h ' + (len % 60) + 'm</b>' : '') + '</p></div>'
      + '<span class="wxp-moon" aria-hidden="true"><i data-moon="' + shadow.toFixed(0) + '" style="transform:translateX(' + (reduced() ? shadow.toFixed(0) : 0) + '%)"></i></span></div>'
      + '<p class="wxp-sub">Golden hour <b>' + tm(sd.rise) + '&ndash;' + tm(sd.goldAmEnd) + '</b> and <b>' + tm(sd.goldPmStart) + '&ndash;' + tm(sd.set) + '</b> &middot; ' + mo.name + ', ' + Math.round(mo.illum * 100) + '% lit</p></div>';
  }

  /* one timeline for a day: hourly columns while the forecast has them, wider six-hour columns after */
  function timeline(steps, W0, today) {
    var phone = W0 < 560, nH = 0, n6 = 0;
    steps.forEach(function (s) { if (s.six) n6++; else nH++; });
    var cH = phone ? 44 : Math.min(90, Math.max(30, (W0 - 10) / (nH + 2.2 * n6)));
    var c6 = phone ? (nH ? 88 : Math.max(72, (W0 - 10) / Math.max(1, n6))) : Math.max(84, cH * 2.2);
    var cols = [], x = 5;
    steps.forEach(function (s) { var w = s.six ? c6 : cH; cols.push({ x: x + w / 2, w: w, l: x }); x += w; });
    var W = Math.round(x + 5), H = 240, anim = !reduced();
    var tv = [], lo = Infinity, hi = -Infinity;
    steps.forEach(function (s) {
      var v = s.six && has(s.tmax) ? s.tmax : s.temp; tv.push(v);
      lo = Math.min(lo, v, s.six && has(s.tmin) ? s.tmin : v); hi = Math.max(hi, v);
    });
    lo = Math.floor(lo) - 1; hi = Math.ceil(hi) + 1;
    function Y(t) { return 66 + (hi - t) / (hi - lo) * 46; }
    var line = 'M' + cols[0].x.toFixed(1) + ' ' + Y(tv[0]).toFixed(1);
    for (var i = 1; i < steps.length; i++) {
      var mx = ((cols[i - 1].x + cols[i].x) / 2).toFixed(1);
      line += ' C' + mx + ' ' + Y(tv[i - 1]).toFixed(1) + ' ' + mx + ' ' + Y(tv[i]).toFixed(1) + ' ' + cols[i].x.toFixed(1) + ' ' + Y(tv[i]).toFixed(1);
    }
    var last1 = cols[cols.length - 1];
    var g = '<defs><linearGradient id="wxp-tl-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffb347" stop-opacity=".34"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></linearGradient></defs>'
      + '<path class="' + (anim ? 'wxp-fadein' : '') + '" d="' + line + ' L' + last1.x.toFixed(1) + ' 124 L' + cols[0].x.toFixed(1) + ' 124 Z" fill="url(#wxp-tl-g)"/>'
      + '<path class="' + (anim ? 'wxp-draw' : '') + '" d="' + line + '" pathLength="1" fill="none" stroke="#ffb347" stroke-width="2.6"/>'
      + '<path class="wxp-flow" d="' + line + '" pathLength="1" fill="none" stroke="#fff1cf" stroke-width="3.4" stroke-linecap="round"/>';
    var dense = cH < 36, seenSix = false, rsum = 0;
    steps.forEach(function (s, k) {
      var c = cols[k], show = s.six || !dense || k % 2 === 0, dl = (0.05 + 0.5 * k / steps.length).toFixed(2);
      rsum += s.rain || 0;
      if (s.six && !seenSix) { seenSix = true; if (k > 0) g += '<line x1="' + c.l.toFixed(1) + '" x2="' + c.l.toFixed(1) + '" y1="2" y2="236" stroke="#1d3346" stroke-dasharray="3 4"/><text class="t-small" x="' + (c.l + 5).toFixed(1) + '" y="52">6-HOUR STEPS</text>'; }
      if (!s.six && k > 0 && hhmm(s.t) === '00:00') g += '<line x1="' + c.l.toFixed(1) + '" x2="' + c.l.toFixed(1) + '" y1="2" y2="236" stroke="#1d3346" stroke-dasharray="3 4"/><text class="t-small" x="' + (c.l + 5).toFixed(1) + '" y="52">' + esc(lon(s.t, { weekday: 'short' }).toUpperCase()) + '</text>';
      if (show) {
        var isz = phone ? (s.six ? 36 : 30) : (s.six ? 34 : 28);
        g += icon(s.sym, '', 'x="' + (c.x - isz / 2).toFixed(1) + '" y="' + (s.six ? 2 : 6) + '" width="' + isz + '" height="' + isz + '" style="overflow:visible"')
          + '<text class="t-strong" x="' + c.x.toFixed(1) + '" y="' + (Y(tv[k]) - 8).toFixed(1) + '" text-anchor="middle">' + deg(tv[k]) + (s.six && has(s.tmin) ? '<tspan class="t-dim">/' + deg(s.tmin) + '</tspan>' : '') + '</text>';
      }
      if (s.rain >= 0.05) {
        var per = s.six ? s.rain / 6 : s.rain, bh = Math.max(4, Math.min(per, 4) / 4 * 22), bw = Math.min(c.w * 0.56, 34);
        g += '<rect class="' + (anim ? 'wxp-bar' : '') + '" x="' + (c.x - bw / 2).toFixed(1) + '" y="' + (150 - bh).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" fill="#6cc4f5" style="animation-delay:' + dl + 's"><title>' + s.rain.toFixed(1) + ' mm</title></rect>';
        if (show && s.rain >= 0.1 && c.w >= 56) for (var q = -1; q <= 1; q += 2) g += '<line class="wxp-rdrop" x1="' + (c.x + q * (bw / 2 + 12)).toFixed(1) + '" y1="' + (124 - bh).toFixed(1) + '" x2="' + (c.x + q * (bw / 2 + 12) - 1).toFixed(1) + '" y2="' + (130 - bh).toFixed(1) + '" style="animation-delay:-' + ((k * 0.37 + (q + 1) * 0.3) % 1.2).toFixed(2) + 's"/>';
        if (show && s.rain >= 0.1) g += '<text class="t-rain" x="' + c.x.toFixed(1) + '" y="' + (147 - bh).toFixed(1) + '" text-anchor="middle">' + (s.rain < 10 ? s.rain.toFixed(1) : Math.round(s.rain)) + '</text>';
      }
      if (show) {
        var sh = shore(s.dir), to = ((s.dir || 0) + 180) % 360;
        g += '<g transform="translate(' + c.x.toFixed(1) + ' 167)"><g class="wxp-sway-svg" style="animation-delay:-' + (k * 0.29).toFixed(2) + 's"><path d="M0 -6 L4 5 L0 2.5 L-4 5 Z" fill="' + (SHORE_COL[sh] || '#e8f1f2') + '" transform="rotate(' + to + ')"/></g></g>'
          + '<text x="' + c.x.toFixed(1) + '" y="186" text-anchor="middle">' + mph(s.wind) + '</text>';
      }
      if (has(s.cloud)) g += '<rect x="' + c.l.toFixed(1) + '" y="194" width="' + c.w.toFixed(1) + '" height="7" fill="#e4eef5" opacity="' + (s.cloud / 100 * 0.5).toFixed(2) + '"><title>Cloud ' + s.cloud + '%</title></rect>';
      if (has(s.uv)) g += '<rect x="' + (c.l + 1).toFixed(1) + '" y="204" width="' + Math.max(1, c.w - 2).toFixed(1) + '" height="6" rx="2" fill="' + uvCol(s.uv) + '" opacity="' + (s.uv < 0.5 ? 0.12 : 0.85) + '"><title>UV ' + s.uv.toFixed(1) + ' if clear</title></rect>';
      if (show) g += '<text x="' + c.x.toFixed(1) + '" y="228" text-anchor="middle"' + (k === 0 && today ? ' fill="#ffd76a"' : '') + '>' + (s.six ? hhmm(s.t).slice(0, 2) + '\u2013' + hhmm(new Date(Date.parse(s.t) + 6 * 3600000).toISOString()).slice(0, 2) : (k === 0 && today ? 'Now' : hhmm(s.t))) + '</text>';
    });
    g += '<line x1="0" x2="' + W + '" y1="150.5" y2="150.5" stroke="#1d3346"/>';
    if (today) g += '<circle class="wxp-ping" cx="' + cols[0].x.toFixed(1) + '" cy="' + Y(tv[0]).toFixed(1) + '" r="5" fill="none" stroke="#ffd76a" stroke-width="2"/><circle cx="' + cols[0].x.toFixed(1) + '" cy="' + Y(tv[0]).toFixed(1) + '" r="4" fill="#ffd76a"/>';
    return { svg: svgEl(W, H, 'Hour by hour: ' + deg(lo + 1) + ' to ' + deg(hi - 1) + ', ' + (rsum >= 0.1 ? rsum.toFixed(1) + ' mm of rain forecast' : 'no rain forecast') + ', wind in mph under each time', g), W: W };
  }

  function renderDay(i, dir) {
    var d = last, f = d.forecast, box = $('wxp-daypanel'), day = f.days[i], ymd = day.d, today = i === 0;
    var ae = document.activeElement, focusStep = ae && box.contains(ae) ? ae.getAttribute('data-step') : null;
    var steps;
    if (today) {
      steps = f.hours.slice(0, 24);
    } else {
      steps = f.hours.filter(function (h) { return ukYmd(Date.parse(h.t)) === ymd; });
      var lastH = steps.length ? Date.parse(steps[steps.length - 1].t) : -Infinity;
      (f.six || []).forEach(function (b) { if (ukYmd(Date.parse(b.t)) === ymd && Date.parse(b.t) > lastH) steps.push({ t: b.t, six: true, sym: b.sym, temp: b.temp, tmax: b.tmax, tmin: b.tmin, rain: b.rain, wind: b.wind, dir: b.dir, uv: b.uv, cloud: null }); });
    }
    var uv = null;
    (today ? f.hours.filter(function (h) { return ukYmd(Date.parse(h.t)) === ymd; }) : steps).forEach(function (h) { if (has(h.uv) && (uv === null || h.uv > uv)) uv = h.uv; });
    /* the chart card's inner width: full width on phones, the 2fr column beside tides and sun from 980 px */
    var bw = box.clientWidth || 340, sh = shore(day.dir), W0 = Math.max(260, Math.floor((window.innerWidth >= 980 ? (bw - 12) * 2 / 3 : bw) - 38));
    var tl = steps.length ? timeline(steps, W0, today) : null;
    var hourly = steps.filter(function (s) { return !s.six; }).length;
    var kindTxt = !steps.length ? '' : hourly && hourly < steps.length ? 'HOURLY, THEN SIX-HOUR STEPS' : hourly ? 'HOUR BY HOUR' : 'SIX-HOUR STEPS';
    var label = today ? 'Today' : i === 1 ? 'Tomorrow' : shortDay(ymd);
    var prevTxt = i > 0 ? (i === 1 ? 'Today' : shortDay(f.days[i - 1].d)) : '', nextTxt = i < f.days.length - 1 ? shortDay(f.days[i + 1].d) : '';
    box.innerHTML = '<div class="wxp-dsum">' + icon(day.sym) + '<div><p class="wxp-lbl">' + esc(label) + (today ? ' &middot; next 24 hours' : '') + '</p><h3>' + esc(longDay(ymd)) + ' &middot; ' + esc(words(day.sym)) + '</h3>'
      + '<p class="wxp-sub" style="margin-top:.15rem">' + (day.part ? 'Rest of today up to ' : 'Up to ') + '<b>' + deg(day.hi) + '</b>, down to <b>' + deg(day.lo) + '</b> &middot; ' + (day.rain >= 0.1 ? '<b>' + day.rain.toFixed(1) + ' mm</b> of rain' : '<b>Dry</b>')
      + ' &middot; wind up to <b>' + mph(day.wind) + ' mph</b> ' + compass(day.dir) + (sh ? ' <span class="wxp-shore ' + sh + '">' + SHORE_WORD[sh] + '</span>' : '') + (uv !== null && uv >= 1 ? ' &middot; UV up to <b>' + Math.round(uv) + '</b> if clear' : '') + '</p>'
      + '<p style="margin:.45rem 0 0"><button type="button" class="wxp-share-mini" data-share="day" data-ymd="' + ymd + '">' + SHARE_ICON + ' Share this day</button></p></div>'
      + '<div class="wxp-dnav"><button type="button" data-step="-1"' + (i === 0 ? ' disabled' : '') + '>&larr; ' + esc(prevTxt) + '<span class="wxp-vh">, previous day</span></button>'
      + '<button type="button" data-step="1"' + (nextTxt ? '' : ' disabled') + '>' + esc(nextTxt) + ' &rarr;<span class="wxp-vh">, next day</span></button></div></div>'
      + '<div class="wxp-dgrid"><div class="wxp-card"><span class="chip-f">FORECAST &middot; MET NORWAY' + (kindTxt ? ' &middot; ' + kindTxt : '') + '</span>'
      + (tl ? '<div class="wxp-chart wxp-scroll" data-sc="Hour-by-hour chart">' + tl.svg + '</div>'
        + '<ul class="wxp-legend"><li><i style="background:#ffb347"></i>Temperature</li><li><i style="background:#6cc4f5;height:8px"></i>Rain, mm</li><li><i style="background:#e4eef5;opacity:.5;height:8px"></i>Cloud</li><li><i style="background:linear-gradient(90deg,#7fd8a8,#ffd84d,#ff9f5a,#ff5a5a);height:8px"></i>UV if clear</li><li><span style="color:#ff9f5a">&#9650;</span> offshore <span style="color:#7fd8a8">&#9650;</span> onshore <span style="color:#79b8ff">&#9650;</span> along the shore wind, mph</li></ul>'
        + '<p class="wxp-hint" data-hint hidden>Swipe the chart for later hours &rarr;</p>'
        : '<p class="wxp-sub">No hour-by-hour detail for this day.</p>')
      + '</div><div class="wxp-dside">' + dayTides(ymd) + daySun(ymd) + '</div></div>';
    [].forEach.call(box.querySelectorAll('[data-step]'), function (b) { b.addEventListener('click', function () { selectDay(dayIdx + (+b.getAttribute('data-step')), { scrollStrip: true }); }); });
    scrollRegions(box);
    var sc = box.querySelector('.wxp-scroll'), hint = box.querySelector('[data-hint]');
    if (sc && hint && sc.scrollWidth > sc.clientWidth + 4) hint.hidden = false;
    var mi = box.querySelector('[data-moon]');
    if (mi && !reduced()) requestAnimationFrame(function () { requestAnimationFrame(function () { mi.style.transform = 'translateX(' + mi.getAttribute('data-moon') + '%)'; }); });
    if (dir && !reduced()) { box.classList.remove('wxp-in-l', 'wxp-in-r'); void box.offsetWidth; box.classList.add(dir > 0 ? 'wxp-in-r' : 'wxp-in-l'); }
    else if (!dir) rise(box);
    /* Previous/Next were rebuilt with the panel: give keyboard focus back to the same button (or the other one at the ends) */
    if (focusStep) { var nb = box.querySelector('[data-step="' + focusStep + '"]'); if (!nb || nb.disabled) nb = box.querySelector('[data-step]:not([disabled])'); if (nb) nb.focus({ preventScroll: true }); }
  }

  /* ---------------- TIDES ---------------- */
  function renderTides(d) {
    var t = d.tide, box = $('wxp-tide-chart');
    if (!t || !t.ok) {
      setChip('wxp-tide-chip', 'chip-f', 'PREDICTED \u00b7 NOT AVAILABLE');
      $('wxp-tide-now').textContent = 'Tide times aren\u2019t available right now.';
      $('wxp-tide-next').innerHTML = ''; box.innerHTML = ''; $('wxp-tide-table').innerHTML = ''; $('wxp-tide-more').hidden = true;
      return;
    }
    setChip('wxp-tide-chip', 'chip-f', 'PREDICTED \u00b7 CHECKED AGAINST THE PIER GAUGE');
    var now = Date.now(), evs = groupTides(t.events);
    var next = evs.filter(function (x) { return Date.parse(x.type === 'HH' ? x.t2 : x.t) > now; }).slice(0, 2);
    function evTxt(x) { return x.type === 'HH' ? hhmm(x.t) + ' &amp; ' + hhmm(x.t2) : hhmm(x.t); }
    var rangeByDay = {};
    (t.days || []).forEach(function (dd) { rangeByDay[dd.d] = dd; });
    var rising = t.now.trend ? t.now.trend === 'rising' : null, res = t.now.residual_cm, resTxt = '';
    if (typeof res === 'number') resTxt = Math.abs(res) < 6 ? 'That is <b>right on the prediction</b>.' : 'That is <b>' + Math.abs(res) + ' cm ' + (res > 0 ? 'higher' : 'lower') + '</b> than predicted &mdash; weather at work.';
    /* the gauge reading and the predicted tide times each wear their own label */
    var mAt = t.now.measured_at, mOld = mAt ? age(mAt) > 20 * 60000 : true, mGone = mAt ? age(mAt) > 2 * 3600000 : true;
    $('wxp-tide-now').innerHTML = typeof t.now.measured === 'number'
      ? '<span class="' + (mGone ? 'chip-f">LAST READING ' : 'chip-m">MEASURED ') + hhmm(mAt) + ' &middot; PIER GAUGE</span> The sea ' + (mOld ? 'was' : 'is') + ' at <b>' + t.now.measured.toFixed(2) + ' m</b>' + (t.now.trend === 'steady' ? ', steady' : rising === null ? '' : ' and <b>' + (rising ? 'rising' : 'falling') + '</b>') + '. ' + resTxt
      : '<span class="chip-f">PIER GAUGE &middot; NOT REPORTING</span> The gauge isn\u2019t reporting just now, so the chart shows the prediction only.';
    $('wxp-tide-next').innerHTML = next.length ? '<span class="chip-f">PREDICTED &middot; PIER</span> ' + next.map(function (x, k) { return (k ? 'Then ' : 'Next: ') + (x.type === 'L' ? 'low water' : 'high water') + ' <b>' + evTxt(x) + '</b>' + (x.type === 'HH' ? ' (double high water)' : '') + '.'; }).join(' ') : '';

    /* chart: phones get 10 px an hour and open at "now" */
    var phone = (box.clientWidth || 340) < 560, W = phone ? Math.max(1060, box.clientWidth) : Math.max(340, box.clientWidth), H = 236, pl = 38, pr = 12, pt = 30, pb = 38;
    var curve = t.curve.map(function (p) { return [Date.parse(p[0]), p[1]]; });
    var t0 = curve[0][0], t1 = curve[curve.length - 1][0], lo = Infinity, hi = -Infinity;
    curve.forEach(function (p) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); });
    lo = Math.floor(lo - 0.2); hi = Math.ceil(hi + 0.3);
    function X(ms) { return pl + (ms - t0) / (t1 - t0) * (W - pl - pr); }
    function Y(h) { return pt + (hi - h) / (hi - lo) * (H - pt - pb); }
    var anim = !reduced();
    var g = '<defs><linearGradient id="wxp-tide-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#79b8ff" stop-opacity=".35"/><stop offset="1" stop-color="#79b8ff" stop-opacity="0"/></linearGradient></defs>';
    for (var y = lo; y <= hi; y++) g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(y).toFixed(1) + '" y2="' + Y(y).toFixed(1) + '" stroke="#1d3346"/><text x="' + (pl - 6) + '" y="' + (Y(y) + 4).toFixed(1) + '" text-anchor="end">' + y + 'm</text>';
    for (var ms = t0; ms <= t1; ms += 1800000) {
      if (hhmm(new Date(ms).toISOString()) === '00:00') g += '<line x1="' + X(ms).toFixed(1) + '" x2="' + X(ms).toFixed(1) + '" y1="' + pt + '" y2="' + (H - pb) + '" stroke="#1d3346" stroke-dasharray="3 4"/><text x="' + (X(ms) + 5).toFixed(1) + '" y="' + (H - 8) + '">' + esc(lon(new Date(ms).toISOString(), { weekday: 'short', day: 'numeric' })) + '</text>';
    }
    var line = curve.map(function (p, k) { return (k ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ');
    g += '<path class="' + (anim ? 'wxp-fadein' : '') + '" d="' + line + ' L' + X(t1).toFixed(1) + ' ' + (H - pb) + ' L' + X(t0).toFixed(1) + ' ' + (H - pb) + ' Z" fill="url(#wxp-tide-g)"/>';
    g += '<path class="' + (anim ? 'wxp-draw' : '') + '" d="' + line + '" pathLength="1" fill="none" stroke="#79b8ff" stroke-width="2.4"/>'
      + '<path class="wxp-flow" d="' + line + '" pathLength="1" fill="none" stroke="#e3f3ff" stroke-width="3.2" stroke-linecap="round"/>';
    if (t.measured && t.measured.length) {
      var ml = t.measured.map(function (p) { return [Date.parse(p[0]), p[1]]; }).filter(function (p) { return p[0] >= t0 && p[0] <= t1; });
      if (ml.length > 1) g += '<path class="' + (anim ? 'wxp-fadein' : '') + '" d="' + ml.map(function (p, k) { return (k ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ') + '" fill="none" stroke="#4fd8c4" stroke-width="2.4"/>';
    }
    var lastHx = -1e9;
    t.events.forEach(function (x, k) {
      var ms2 = Date.parse(x.t); if (ms2 < t0 || ms2 > t1) return;
      var cx = X(ms2), cy = Y(x.h), up = x.type !== 'L', cls = anim ? 'wxp-pop' : '', dly = anim ? ' style="animation-delay:' + (0.5 + k * 0.03).toFixed(2) + 's"' : '';
      if (x.type === 'D') { g += '<circle class="' + cls + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="2.5" fill="#79b8ff"' + dly + '/>'; return; }
      g += '<circle class="' + cls + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4" fill="' + (up ? '#79b8ff' : '#9fb4c5') + '" stroke="#10202f" stroke-width="2"' + dly + '/>'
        + '<text class="t-strong" x="' + cx.toFixed(1) + '" y="' + (up ? cy - 10 - (x.type === 'H' && cx - lastHx < 44 ? 13 : 0) : cy + 18).toFixed(1) + '" text-anchor="middle">' + hhmm(x.t) + '</text>';
      if (x.type === 'H') lastHx = cx;
    });
    var nx = X(now), ny = typeof t.now.pred === 'number' ? Y(t.now.pred) : null;
    g += '<line x1="' + nx.toFixed(1) + '" x2="' + nx.toFixed(1) + '" y1="' + (pt - 12) + '" y2="' + (H - pb) + '" stroke="#ffd76a" stroke-width="1.5"/><text x="' + nx.toFixed(1) + '" y="' + (pt - 16) + '" text-anchor="middle" fill="#ffd76a">Now</text>';
    if (ny !== null) g += '<circle class="' + (anim ? 'wxp-ping' : '') + '" cx="' + nx.toFixed(1) + '" cy="' + ny.toFixed(1) + '" r="5" fill="none" stroke="#ffd76a" stroke-width="2"/><circle cx="' + nx.toFixed(1) + '" cy="' + ny.toFixed(1) + '" r="4" fill="#ffd76a"/>';
    box.innerHTML = svgEl(W, H, 'Tide at Bournemouth Pier: predicted curve for the past 12 hours and next 60, with the measured level', g);
    if (phone) box.scrollLeft = Math.max(0, nx - box.clientWidth / 3);
    scrollRegions(box.parentNode);

    /* table: next 7 days; phones show three and a button */
    var byDay = {}, order = [];
    evs.forEach(function (x) {
      var end = Date.parse(x.type === 'HH' ? x.t2 : x.t); if (end < now - 3 * 3600000) return;
      var key = ukYmd(Date.parse(x.t)); if (!byDay[key]) { byDay[key] = { label: dayLabel(x.t), items: [] }; order.push(key); } byDay[key].items.push(x);
    });
    var tbl = $('wxp-tide-table');
    tbl.innerHTML = order.slice(0, 7).map(function (key, n) {
      var day = byDay[key], rg = rangeByDay[key], flat = rg && rg.range < 0.55;
      return '<li style="--i:' + n + '" class="' + (flat ? 'flat ' : '') + (n >= 3 ? 'wxp-more' : '') + '"><h3>' + esc(day.label) + (rg ? '<span>Rise &amp; fall ' + rg.range.toFixed(1) + ' m</span>' : '') + '</h3><div class="wxp-evs">'
        + (flat ? '<span class="wxp-neap">Neap: the sea only moves between ' + rg.lo.toFixed(1) + ' and ' + rg.hi.toFixed(1) + ' m, so the times mean little &mdash; the curve is the better guide.</span>' : '')
        + day.items.map(evChip).join('') + '</div></li>';
    }).join('');
    var more = $('wxp-tide-more');
    if (order.length > 3) {
      more.hidden = false;
      more.onclick = function () {
        var open = !tbl.classList.contains('all');
        tbl.classList.toggle('all', open); more.setAttribute('aria-expanded', open ? 'true' : 'false');
        more.textContent = open ? 'Show fewer days' : 'Show the next ' + (Math.min(order.length, 7) - 3) + ' days';
      };
      more.textContent = tbl.classList.contains('all') ? 'Show fewer days' : 'Show the next ' + (Math.min(order.length, 7) - 3) + ' days';
    } else { more.hidden = true; }
    var a = t.accuracy;
    if (a && a.hw_time_median_min !== null) {
      $('wxp-tide-acc-sum').innerHTML = 'How accurate? Typically within <b>' + a.hw_time_median_min + ' minutes</b> and <b>' + Math.round(a.hw_height_median_cm) + ' cm</b>';
      $('wxp-tide-acc').innerHTML = 'We fitted the prediction without the ' + esc(lon(a.from, { day: 'numeric', month: 'long' })) + '&ndash;' + esc(lon(a.to, { day: 'numeric', month: 'long' })) + ' readings, then compared it with what the gauge measured over those days: high and low water times were typically within <b>' + a.hw_time_median_min + ' minutes</b>, and heights within <b>' + Math.round(a.hw_height_median_cm) + ' cm</b> (' + a.events_compared + ' tides compared). ' + esc(t.method);
    }
  }

  /* ---------------- WIND ---------------- */
  function renderWindCard(d) {
    var o = d.obs, wc = $('wxp-windcard'), f = d.forecast;
    if (o && o.ok && o.latest && has(o.latest.wspd)) {
      var L = o.latest, calm = L.wspd < 1, vrb = (calm || L.wdir === 'VRB' || !has(L.wdir)), dir = vrb ? null : +L.wdir, sp = ktmph(L.wspd), gs = L.wgst ? ktmph(L.wgst) : null, bf = beaufort(sp), sh = shore(dir), oo = obsOld(o);
      var to = dir === null ? 0 : (dir + 180) % 360, streaks = '';
      if (!reduced() && dir !== null && sp > 2) {
        var dur = Math.max(0.9, 3.2 - sp / 12);
        for (var i = 0; i < 7; i++) streaks += '<i style="top:' + (8 + i * 13) + '%;animation-duration:' + (dur + (i % 3) * 0.35).toFixed(2) + 's;animation-delay:-' + (i * 0.45).toFixed(2) + 's"></i>';
      }
      var ticks = '';
      for (var k = 0; k < 16; k++) ticks += '<line x1="75" y1="10" x2="75" y2="' + (k % 4 ? 15 : 19) + '" stroke="#7f95a8" stroke-width="' + (k % 4 ? 1 : 2) + '" transform="rotate(' + (k * 22.5) + ' 75 75)"/>';
      /* the sea side of the dial (bearings 70..250 through 160) tinted, so on/offshore reads at a glance */
      var seaArc = '<path d="M75 75 L' + (75 + 58 * Math.sin(70 * Math.PI / 180)).toFixed(1) + ' ' + (75 - 58 * Math.cos(70 * Math.PI / 180)).toFixed(1) + ' A58 58 0 0 1 ' + (75 + 58 * Math.sin(250 * Math.PI / 180)).toFixed(1) + ' ' + (75 - 58 * Math.cos(250 * Math.PI / 180)).toFixed(1) + ' Z" fill="rgba(108,196,245,.10)"/>';
      var dial = '<svg viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="62" fill="none" stroke="#1d3346" stroke-width="2"/>' + seaArc + ticks
        + '<text x="75" y="33" text-anchor="middle" font-size="11" fill="#e8f1f2">N</text><text x="122" y="79" text-anchor="middle" font-size="11" fill="#7f95a8">E</text><text x="75" y="126" text-anchor="middle" font-size="11" fill="#7f95a8">S</text><text x="28" y="79" text-anchor="middle" font-size="11" fill="#7f95a8">W</text>'
        + '<text x="104" y="112" text-anchor="middle" font-size="11" fill="#6cc4f5">SEA</text>'
        + (dir === null ? '<text x="75" y="80" text-anchor="middle" font-size="12" fill="#e8f1f2">' + (calm ? 'calm' : 'variable') + '</text>'
          : '<g class="wxp-needle" style="transform:rotate(0deg)" data-rot="' + to + '"><g class="' + (reduced() ? '' : 'wxp-wobble') + '"><path d="M75 22 L84 70 L75 64 L66 70 Z" fill="#ffd76a"/><path d="M75 128 L80 80 L75 84 L70 80 Z" fill="#7f95a8"/><circle cx="75" cy="75" r="5" fill="#e8f1f2"/></g></g>')
        + '</svg>';
      wc.innerHTML = '<div class="wxp-streaks" aria-hidden="true" style="transform:rotate(' + (to - 90) + 'deg)">' + streaks + '</div>'
        + '<span class="' + (oo ? 'chip-f' : 'chip-m') + '">' + (oo ? 'LAST HEARD ' + ago(L.t).toUpperCase() : 'MEASURED ' + hhmm(L.t)) + ' &middot; BOURNEMOUTH AIRPORT</span>'
        + '<div class="wxp-windrow" style="position:relative;margin-top:.4rem"><div class="wxp-compass">' + dial + '</div><div>'
        + '<p class="wxp-mid">' + sp + ' <span style="font-size:.55em">mph</span></p>'
        + '<p class="wxp-sub">' + (dir === null ? (calm ? 'Calm' : 'Variable direction') : 'From the <b>' + compass(dir) + '</b> (' + dir + '\u00b0)') + (gs ? ' &middot; gusts <b>' + gs + ' mph</b>' : '') + '</p>'
        + '<p class="wxp-sub">Force ' + bf[0] + ', ' + bf[1].toLowerCase() + '</p>'
        + (sh ? '<p class="wxp-sub"><span class="wxp-shore ' + sh + '">' + SHORE_WORD[sh] + ' on the beach</span></p>' : '')
        + '</div></div><p class="wxp-sub" style="font-size:.82rem">The airport is 7 km inland &mdash; the beach is often windier.</p>';
      var needle = wc.querySelector('.wxp-needle');
      if (needle) requestAnimationFrame(function () { requestAnimationFrame(function () { needle.style.transform = 'rotate(' + needle.getAttribute('data-rot') + 'deg)'; }); });
    } else {
      wc.innerHTML = '<span class="chip-f">WIND &middot; NOT AVAILABLE</span><p class="wxp-sub">The airport\u2019s wind report isn\u2019t coming through right now. The forecast wind is in the chart.</p>';
    }
    /* the RNLI advice lights up when the wind is offshore now (measured) or in the next 12 forecast hours */
    var off = false, how = '';
    if (o && o.ok && o.latest && !obsOld(o) && has(o.latest.wdir) && shore(+o.latest.wdir) === 'off' && o.latest.wspd >= 3) { off = true; how = 'Offshore wind measured at the airport at ' + hhmm(o.latest.t); }
    else if (f && f.ok) f.hours.slice(0, 12).forEach(function (h) { if (!off && shore(h.dir) === 'off' && mph(h.wind) >= 4) { off = true; how = 'Offshore wind forecast from ' + hhmm(h.t); } });
    var rn = $('wxp-rnli');
    rn.classList.toggle('wxp-alert', off);
    var flag = rn.querySelector('[data-flag]'); if (flag) flag.remove();
    if (off) rn.insertAdjacentHTML('afterbegin', '<b data-flag style="display:block;color:#ffb27a">' + how + '.</b>');
  }
  function renderWind(d) {
    var f = d.forecast, box = $('wxp-wind-chart');
    if (!f || !f.ok) { box.innerHTML = '<p class="wxp-sub">The wind forecast isn\u2019t available right now.</p>'; return; }
    var hs = f.hours.slice(0, 48), n = hs.length, W = Math.max(340, box.clientWidth || 340), col = Math.max(W < 560 ? 30 : 26, (W - 44) / n); W = Math.round(44 + col * n);
    var H = 196, pt = 34, pb = 44, max = 10, anim = !reduced();
    hs.forEach(function (h) { max = Math.max(max, mph(h.wind)); });
    max = Math.ceil((max + 3) / 5) * 5;
    function X(i) { return 38 + col / 2 + i * col; }
    function Y(v) { return pt + (max - v) / max * (H - pt - pb); }
    var g = '';
    for (var v = 0; v <= max; v += (max > 30 ? 10 : 5)) g += '<line x1="38" x2="' + W + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="#1d3346"/><text x="32" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + v + '</text>';
    var line = hs.map(function (h, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(mph(h.wind)).toFixed(1); }).join(' ');
    g += '<path class="' + (anim ? 'wxp-fadein' : '') + '" d="' + line + ' L' + X(n - 1).toFixed(1) + ' ' + (H - pb) + ' L' + X(0).toFixed(1) + ' ' + (H - pb) + ' Z" fill="rgba(255,179,71,.14)"/>';
    g += '<path class="' + (anim ? 'wxp-draw' : '') + '" d="' + line + '" pathLength="1" fill="none" stroke="#ffb347" stroke-width="2.4"/>'
      + '<path class="wxp-flow" d="' + line + '" pathLength="1" fill="none" stroke="#fff1cf" stroke-width="3.2" stroke-linecap="round"/>';
    hs.forEach(function (h, i) {
      var sh = shore(h.dir), c = SHORE_COL[sh] || '#79b8ff';
      g += '<circle class="' + (anim ? 'wxp-pop' : '') + '" cx="' + X(i).toFixed(1) + '" cy="' + (H - pb + 10) + '" r="3.2" fill="' + c + '"' + (anim ? ' style="animation-delay:' + (0.3 + i * 0.015).toFixed(2) + 's"' : '') + '><title>' + (sh ? SHORE_WORD[sh] : '') + '</title></circle>';
      if (i % 3 === 0) {
        var to = ((h.dir || 0) + 180) % 360;
        g += '<g transform="translate(' + X(i).toFixed(1) + ' 16)"><g class="wxp-sway-svg" style="animation-delay:-' + (i * 0.23).toFixed(2) + 's"><path d="M0 -8 L5 6 L0 3 L-5 6 Z" fill="#e8f1f2" transform="rotate(' + to + ')"/></g></g>'
          + '<text class="t-strong" x="' + X(i).toFixed(1) + '" y="' + (Y(mph(h.wind)) - 8).toFixed(1) + '" text-anchor="middle">' + mph(h.wind) + '</text>'
          + '<text x="' + X(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + (i === 0 ? 'Now' : hhmm(h.t)) + '</text>';
      }
    });
    var ws = hs.map(function (h) { return mph(h.wind); }), wmax = Math.max.apply(null, ws), wi = ws.indexOf(wmax);
    box.innerHTML = svgEl(W, H, 'Forecast wind at Bournemouth Pier for the next 48 hours: ' + Math.min.apply(null, ws) + ' to ' + wmax + ' mph, strongest around ' + hhmm(hs[wi].t) + ' ' + lon(hs[wi].t, { weekday: 'short' }) + ' from the ' + compass(hs[wi].dir), g);
    scrollRegions(box.parentNode);
  }

  /* ---------------- SEA & AIR ---------------- */
  function renderSea(d) {
    var s = d.sea || {}, sea = s.sea, grid = $('wxp-seatiles'), tiles = [];
    if (sea && sea.ok) {
      var so = sea.stale || age(sea.read_at) > 3 * 3600000;
      var chip = (so ? 'LAST HEARD ' + ago(sea.read_at).toUpperCase() : 'MEASURED ' + hhmm(sea.read_at)) + ' &middot; ' + esc(String(sea.station).toUpperCase()), cc = so ? 'chip-f' : 'chip-m', spark = '';
      if (sea.series && sea.series.length > 3) {
        var v = sea.series.map(function (p) { return p[1]; }), mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), w = 200, hgt = 34;
        var pts = v.map(function (x, i) { return (i / (v.length - 1) * w).toFixed(1) + ',' + (hgt - 3 - (mx === mn ? 0.5 : (x - mn) / (mx - mn)) * (hgt - 6)).toFixed(1); }).join(' ');
        spark = '<svg width="100%" height="' + hgt + '" viewBox="0 0 ' + w + ' ' + hgt + '" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="#4fd8c4" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><p class="wxp-sub" style="font-size:.8rem;margin:0">The last 24 hours.</p>';
      }
      tiles.push('<div class="wxp-card"><span class="' + cc + '">' + chip + '</span><p class="wxp-mid">' + sea.tempC.toFixed(1) + '\u00b0C</p><p class="wxp-sub">' + (sea.tempC >= 18 ? 'Warm for our coast &mdash; most swimmers are comfortable without a wetsuit.' : sea.tempC >= 15 ? 'Fresh &mdash; a shorty or thin wetsuit helps for longer swims.' : 'Cold &mdash; cold water shock is a real risk; a wetsuit and a short swim.') + '</p>' + spark + '</div>');
      tiles.push('<div class="wxp-card"><span class="' + cc + '">' + chip + '</span><p class="wxp-mid">' + sea.hs.toFixed(1) + ' m</p><p class="wxp-sub">Wave height' + (sea.tp ? ', a wave every <b>' + Math.round(sea.tp) + ' s</b>' : '') + '.</p></div>');
    } else {
      tiles.push('<div class="wxp-card"><span class="chip-f">SEA TEMPERATURE &middot; NOT AVAILABLE</span><p class="wxp-sub">The wave buoy isn\u2019t reporting right now.</p></div>');
    }
    var b = s.bathing;
    if (b && b.ok) {
      var parts = []; for (var k in b.classes) parts.push(b.classes[k] + ' ' + k);
      /* name the beaches: today's pollution-risk forecast and the EA's standing heavy-rain note are different things */
      var list = b.list || [], nowMs = Date.now(), inForce = list.filter(function (x) { return x.prf && (!x.prf_expires || Date.parse(x.prf_expires) > nowMs); });
      var raised = inForce.filter(function (x) { return x.prf !== 'normal'; }), rain = list.filter(function (x) { return x.heavyRain; });
      function names(arr) { var n = arr.map(function (x) { return '<b>' + esc(x.name) + '</b>'; }); return n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : n.join(''); }
      var prfTxt;
      if (b.stale) prfTxt = 'Today\u2019s pollution-risk forecasts couldn\u2019t be checked recently.';
      else if (!inForce.length) prfTxt = 'No pollution-risk forecast is in force right now &mdash; the Environment Agency issues them daily in the bathing season.';
      else if (!raised.length) prfTxt = 'Today\u2019s pollution-risk forecast: <b>normal</b> at ' + (inForce.length === list.length ? 'all ' + list.length + ' beaches' : names(inForce)) + '.';
      else prfTxt = '<span style="color:#ffb27a">Pollution-risk warning today:</span> ' + raised.map(function (x) { return '<b>' + esc(x.name) + '</b> (' + esc(x.prf) + ' risk)'; }).join(', ') + '.' + (inForce.length > raised.length ? ' Normal at the other ' + (inForce.length - raised.length) + '.' : '');
      tiles.push('<div class="wxp-card"><span class="chip-f">OFFICIAL &middot; ENVIRONMENT AGENCY</span><p class="wxp-mid">' + b.sites + ' beaches</p><p class="wxp-sub">Bathing water classification: <b>' + esc(parts.join(', ')) + '</b>.</p>'
        + '<p class="wxp-sub">' + prfTxt + '</p>'
        + (rain.length ? '<p class="wxp-sub">Water quality can dip after heavy rain at ' + names(rain) + ' &mdash; a standing Environment Agency note for ' + (rain.length > 1 ? 'those beaches' : 'that beach') + ', not a warning for today.</p>' : '')
        + '<p class="wxp-sub"><a class="wxp-air-link" href="/bournemouth/sea-today/">Every beach, one by one</a></p></div>');
    }
    var ov = s.overflow;
    if (ov && ov.ok) {
      var ovOld = !!(ov.stale || !ov.read_at || age(ov.read_at) > 2 * 3600000);
      tiles.push('<div class="wxp-card"><span class="' + (ovOld ? 'chip-f' : 'chip-m') + '">' + (ov.read_at ? (ovOld ? 'LAST HEARD ' + ago(ov.read_at).toUpperCase() : 'MEASURED ' + hhmm(ov.read_at)) : 'LAST HEARD') + ' &middot; WESSEX WATER MONITORS</span><p class="wxp-mid">' + ov.discharging + ' of ' + ov.total + '</p><p class="wxp-sub">Storm overflows on this coast discharging ' + (ovOld ? 'at the last reading' : 'right now') + (ov.offline ? ' (' + ov.offline + ' monitor offline)' : '') + '. &copy; Wessex Water, CC BY 4.0.</p></div>');
    }
    grid.innerHTML = tiles.join('');
  }
  function renderAir(d) {
    var a = d.air, ac = $('wxp-aircard');
    if (a && a.ok) {
      var band = function (i) { return i <= 3 ? ['low', 'Low'] : i <= 6 ? ['mod', 'Moderate'] : i <= 9 ? ['high', 'High'] : ['high', 'Very high']; };
      var first = band(a.days[0].index);
      ac.innerHTML = '<span class="chip-f">FORECAST &middot; AIR QUALITY &middot; DEFRA</span><p class="wxp-mid">' + first[1] + '</p><p class="wxp-sub">Air pollution today, index <b>' + a.days[0].index + '</b> of 10.</p>'
        + '<div class="wxp-daqi">' + a.days.map(function (x) { var bd = band(x.index); return '<span class="' + bd[0] + '">' + x.day + '<b>' + x.index + '</b></span>'; }).join('') + '</div>'
        + '<p class="wxp-sub" style="font-size:.86rem;margin:0"><a class="wxp-air-link" href="' + esc(a.source_url) + '" rel="noopener">What the index means</a></p>';
    } else {
      ac.innerHTML = '<span class="chip-f">AIR QUALITY &middot; NOT AVAILABLE</span><p class="wxp-sub">Defra\u2019s forecast for Bournemouth isn\u2019t available right now.</p>';
    }
  }

  /* ---------------- image loops (radar + satellite) ---------------- */
  var players = [];
  function Player(mapId, ctlId, frames, labelFn, what) {
    var map = $(mapId), ctl = $(ctlId), imgs = [], i = frames.length - 1, timer = null, playing = !reduced(), visible = false;
    var btn = ctl.querySelector('.wxp-play'), range = ctl.querySelector('input'), label = ctl.querySelector('.wxp-time');
    frames.forEach(function (fr) {
      var im = document.createElement('img'); im.alt = ''; im.width = 960; im.height = 850; im.decoding = 'async'; im.className = fr.cls || 'frame'; im.style.zIndex = 2;
      im.setAttribute('data-src', fr.url); map.insertBefore(im, map.querySelector('.lines')); imgs.push(im);
    });
    range.max = String(frames.length - 1); range.value = String(i); ctl.hidden = false;
    function show(k) {
      i = k; for (var j = 0; j < imgs.length; j++) imgs[j].classList.toggle('on', j === k);
      range.value = String(k); label.textContent = labelFn(frames[k], k, frames.length); range.setAttribute('aria-valuetext', label.textContent);
    }
    function load() { imgs.forEach(function (im) { if (!im.src) im.src = im.getAttribute('data-src'); }); }
    function tick() {
      if (reduced()) { setPlaying(false); return; }
      if (!playing || !visible || document.hidden) return;
      var nextI = (i + 1) % frames.length;
      show(nextI);
      timer = setTimeout(tick, nextI === frames.length - 1 ? 1800 : 650);
    }
    function setPlaying(p) {
      playing = p; btn.textContent = p ? 'Pause' : 'Play';
      btn.setAttribute('aria-label', (p ? 'Pause the ' : 'Play the ') + what + ' loop'); btn.removeAttribute('aria-pressed');
      /* the frame time is announced only while paused or scrubbing, not every 650 ms */
      label.setAttribute('aria-live', p ? 'off' : 'polite');
      clearTimeout(timer); if (p) timer = setTimeout(tick, 650);
    }
    function onBtn() { setPlaying(!playing); }
    function onRange() { setPlaying(false); show(+range.value); }
    function onVis() { if (!document.hidden && playing && visible) { clearTimeout(timer); timer = setTimeout(tick, 650); } }
    btn.addEventListener('click', onBtn);
    range.addEventListener('input', onRange);
    document.addEventListener('visibilitychange', onVis);
    show(i);
    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) { es.forEach(function (e) {
        if (e.isIntersecting) { load(); visible = true; if (playing) { clearTimeout(timer); timer = setTimeout(tick, 900); } } else { visible = false; clearTimeout(timer); }
      }); }, { rootMargin: '300px 0px' });
      io.observe(map);
    } else { load(); visible = true; if (playing) timer = setTimeout(tick, 900); }
    setPlaying(playing);
    /* switching satellite views (or a data refresh) builds a new player on the same controls: remove this one's
       listeners, observer and frames first, or every switch would stack another play/pause handler */
    var api = {
      pause: function () { setPlaying(false); },
      destroy: function () {
        clearTimeout(timer); playing = false;
        btn.removeEventListener('click', onBtn); range.removeEventListener('input', onRange); document.removeEventListener('visibilitychange', onVis);
        if (io) io.disconnect();
        imgs.forEach(function (im) { im.remove(); }); ctl.hidden = true; label.textContent = '';
        var at = players.indexOf(api); if (at >= 0) players.splice(at, 1);
      }
    };
    players.push(api);
    return api;
  }
  /* switching Reduce motion on mid-visit (the site's toolbar or the system setting) stops what is already moving */
  function onReduce() {
    if (!reduced()) return;
    players.forEach(function (pl) { pl.pause(); });
    var sky = $('wxp-sky'); if (sky) sky.innerHTML = '';
    [].forEach.call(root.querySelectorAll('.wxp-streaks'), function (st) { st.innerHTML = ''; });
  }
  if (MQ) { if (MQ.addEventListener) MQ.addEventListener('change', onReduce); else if (MQ.addListener) MQ.addListener(onReduce); }
  if ('MutationObserver' in window) new MutationObserver(onReduce).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  function staticImgs(mapId) {
    var st = $(mapId).querySelectorAll('img[data-src].base, img[data-src].lines');
    for (var k = 0; k < st.length; k++) if (st[k].getAttribute('src') !== st[k].getAttribute('data-src')) st[k].src = st[k].getAttribute('data-src');
  }
  var radarP = null, satCur = null;
  function renderRadar(d) {
    var r = d.radar; staticImgs('wxp-radar-map');
    if (radarP) { radarP.destroy(); radarP = null; }
    if (!r || !r.ok || !r.frames || !r.frames.length) { setChip('wxp-radar-chip', 'chip-f', 'RADAR \u00b7 NOT AVAILABLE YET'); $('wxp-radar-note').textContent = 'Radar pictures aren\u2019t available right now. Radar: EUMETNET OPERA, CC BY 4.0. Map: \u00a9 OpenStreetMap contributors, via NASA GIBS.'; return; }
    var lastF = r.frames[r.frames.length - 1];
    setChip('wxp-radar-chip', r.stale ? 'chip-f' : 'chip-m', (r.stale ? 'LAST RADAR ' + ago(lastF.t).toUpperCase() : 'OBSERVED ' + hhmm(lastF.t)) + ' \u00b7 EUMETNET RADAR');
    radarP = Player('wxp-radar-map', 'wxp-radar-ctl', r.frames.map(function (f) { return { url: f.url, t: f.t, cls: 'radar' }; }), function (fr, k, nn) { return lon(fr.t, { weekday: 'short' }) + ' ' + hhmm(fr.t) + ' \u00b7 ' + (k + 1) + '/' + nn; }, 'radar');
    var notes = [];
    notes.push(lastF.home_mmh === null || lastF.home_mmh === undefined ? '' : lastF.home_mmh >= 0.1 ? 'Rain at the pier in the latest picture: about ' + lastF.home_mmh.toFixed(1) + ' mm/h.' : 'No rain showing at the pier in the latest picture (' + hhmm(lastF.t) + ').');
    if (lastF.local_ok === false) notes.push('The radars that cover Bournemouth are missing from this picture, so a dry-looking area near us may not be dry.');
    notes.push('Radar pictures reach us 10 to 25 minutes after they are taken. Radar: EUMETNET OPERA, CC BY 4.0. Map: \u00a9 OpenStreetMap contributors, via NASA GIBS.');
    $('wxp-radar-note').textContent = notes.filter(Boolean).join(' ');
  }
  function renderSat(d) {
    var s = d.sat, tabs = $('wxp-sat-tabs'), map = $('wxp-sat-map');
    staticImgs('wxp-sat-map');
    if (satCur) { satCur.destroy(); satCur = null; }
    tabs.innerHTML = '';
    var views = [];
    if (s && s.products) ['geo', 'vis'].forEach(function (k) { var p = s.products[k]; if (p && p.frames && p.frames.length) views.push({ key: k, label: k === 'geo' ? 'Colour loop' : 'Sharp daylight loop', frames: p.frames }); });
    if (s && s.nasa) views.push({ key: 'nasa', label: s.nasa.day === ukYmd(Date.now()) ? 'NASA today' : 'NASA ' + lon(s.nasa.day + 'T12:00:00Z', { day: 'numeric', month: 'short' }), nasa: s.nasa });
    if (!views.length) { setChip('wxp-sat-chip', 'chip-f', 'SATELLITE \u00b7 NOT AVAILABLE YET'); $('wxp-sat-note').textContent = 'Satellite pictures aren\u2019t available right now. Images \u00a9 EUMETSAT, CC BY 4.0; NASA Worldview / GIBS.'; return; }
    function choose(v) {
      if (satCur) { satCur.destroy(); satCur = null; }
      [].forEach.call(tabs.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-k') === v.key ? 'true' : 'false'); });
      var fig = $('wxp-nasa');
      if (v.key === 'nasa') {
        map.hidden = true; fig.hidden = false; $('wxp-sat-ctl').hidden = true;
        var im = fig.querySelector('img'); if (im.getAttribute('src') !== v.nasa.url) im.src = v.nasa.url;
        setChip('wxp-sat-chip', 'chip-m', 'OBSERVED \u00b7 NASA ' + v.nasa.satellite.toUpperCase() + ' \u00b7 ' + lon(v.nasa.day + 'T12:00:00Z', { day: 'numeric', month: 'short' }).toUpperCase());
        $('wxp-nasa-cap').textContent = 'Portland Bill to the Isle of Wight from the VIIRS instrument on ' + v.nasa.satellite + ', ' + lon(v.nasa.day + 'T12:00:00Z', { weekday: 'long', day: 'numeric', month: 'long' }) + ' (the early-afternoon pass). About 375 m per pixel.';
        $('wxp-sat-note').textContent = 'Image: NASA Worldview / GIBS, public domain.';
        return;
      }
      map.hidden = false; fig.hidden = true;
      var lastF = v.frames[v.frames.length - 1], old = age(lastF.t) > 3 * 3600000;
      setChip('wxp-sat-chip', old ? 'chip-f' : 'chip-m', (old ? 'LAST PICTURE ' + ago(lastF.t).toUpperCase() : 'OBSERVED ' + hhmm(lastF.t)) + ' \u00b7 METEOSAT');
      satCur = Player('wxp-sat-map', 'wxp-sat-ctl', v.frames.map(function (f) { return { url: f.url, t: f.t }; }), function (fr, k, nn) { return lon(fr.t, { weekday: 'short' }) + ' ' + hhmm(fr.t) + ' \u00b7 ' + (k + 1) + '/' + nn; }, 'satellite');
      $('wxp-sat-note').textContent = (v.key === 'vis' ? 'The sharp view uses visible light, so it only has pictures in daylight' + (old ? ' - this is the last daylight loop.' : '.') + ' ' : 'Colour by day; after dark the cloud is from infrared over a fixed night-lights background, not tonight\u2019s lights. ')
        + 'Images \u00a9 EUMETSAT ' + new Date().getFullYear() + ', Meteosat Third Generation via EUMETView, CC BY 4.0. Coastline \u00a9 OpenStreetMap contributors.';
    }
    tabs.innerHTML = views.map(function (v) { return '<button type="button" data-k="' + v.key + '" aria-pressed="false">' + esc(v.label) + '</button>'; }).join('');
    [].forEach.call(tabs.querySelectorAll('button'), function (b) { b.addEventListener('click', function () { views.forEach(function (v) { if (v.key === b.getAttribute('data-k')) choose(v); }); }); });
    choose(views[0]);
  }

  /* ---------------- the deck: tabs ---------------- */
  var TABS = ['tides', 'wind', 'radar', 'satellite', 'sea'], curTab = 'tides', shown = {}, last = null;
  function ensure(t) {
    if (!last || shown[t]) return;
    shown[t] = true;
    try {
      if (t === 'tides') renderTides(last);
      else if (t === 'wind') { renderWindCard(last); renderWind(last); }
      else if (t === 'radar') renderRadar(last);
      else if (t === 'satellite') renderSat(last);
      else if (t === 'sea') { renderSea(last); renderAir(last); }
    } catch (err) { if (window.console) console.error('weather panel failed', err); }
  }
  function moveTabInk() {
    var ink = $('wxp-tabink'), tab = $('wxp-tab-' + curTab), wrap = ink && ink.parentNode;
    if (!ink || !tab) return;
    var wr = wrap.getBoundingClientRect(), tr = tab.getBoundingClientRect();
    ink.style.width = tr.width + 'px';
    ink.style.transform = 'translateX(' + (tr.left - wr.left - wrap.clientLeft).toFixed(1) + 'px)';
  }
  function barStuck() { return $('wxp-tabbar').classList.contains('is-stuck'); }
  /* 0 is a real value: on phones the site header is hidden and the bar sticks to the very top */
  function stickTop() { var v = parseFloat(getComputedStyle($('wxp-tabbar')).top); return isNaN(v) ? 76 : v; }
  function jumpTo(el, extra, smooth) {
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.scrollY - extra;
    window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: smooth && !reduced() ? 'smooth' : 'instant' });
  }
  /* a jump for an old link is repeated while the page settles (data arriving, fonts, the cookie banner) until the reader
     scrolls, taps or types - real input, not a scroll position that moved on its own */
  var pending = null, userMoved = false;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) { window.addEventListener(ev, function () { userMoved = true; pending = null; }, { passive: true, capture: true }); });
  function runPending() { if (pending && !userMoved) { var el = pending.el(); if (el) jumpTo(el, pending.extra(), false); } }
  function wantJump(getEl, extraFn) {
    if (userMoved) return;
    pending = { el: getEl, extra: extraFn };
    runPending();
    [250, 800, 1600, 3000].forEach(function (ms) { setTimeout(runPending, ms); });
    setTimeout(function () { pending = null; }, 9000);
  }
  function selectTab(name, opts) {
    if (TABS.indexOf(name) < 0) return;
    opts = opts || {};
    var changed = name !== curTab;
    curTab = name;
    TABS.forEach(function (t) {
      var on = t === name, tab = $('wxp-tab-' + t), p = $(t);
      tab.setAttribute('aria-selected', on ? 'true' : 'false'); tab.tabIndex = on ? 0 : -1;
      p.removeAttribute('data-off');
      if (on) p.removeAttribute('hidden'); else p.setAttribute('hidden', 'until-found');
    });
    moveTabInk();
    ensure(name);
    var panel = $(name);
    if (changed && !reduced()) { panel.classList.remove('wxp-in'); void panel.offsetWidth; panel.classList.add('wxp-in'); }
    if (opts.scroll) jumpTo($('wxp-sentinel'), stickTop(), opts.smooth);
    else if (changed && barStuck()) jumpTo($('wxp-sentinel'), stickTop(), false);   /* switching while stuck: the new panel starts at its top */
    if (opts.focusTab) $('wxp-tab-' + name).focus({ preventScroll: true });
  }
  [].forEach.call($('wxp-tablist').querySelectorAll('[role="tab"]'), function (b) {
    b.addEventListener('click', function () { selectTab(b.getAttribute('data-tab')); });
    /* manual activation: arrows move focus, Enter/Space opens - so arrowing past Radar loads no pictures */
    b.addEventListener('keydown', function (e) {
      var i = TABS.indexOf(b.getAttribute('data-tab')), j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % TABS.length; else if (e.key === 'ArrowLeft') j = (i - 1 + TABS.length) % TABS.length; else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = TABS.length - 1;
      if (j === null) return;
      e.preventDefault(); $('wxp-tab-' + TABS[j]).focus();
    });
  });
  TABS.forEach(function (t) { $(t).addEventListener('beforematch', function () { selectTab(t); }); });
  [].forEach.call($('wxp-vitals').querySelectorAll('[data-go]'), function (b) {
    b.addEventListener('click', function () {
      var go = b.getAttribute('data-go');
      if (go === 'sun') {
        if (dayIdx !== 0) selectDay(0, { scrollStrip: true });
        var sc = $('wxp-dsun');
        if (sc) { jumpTo(sc, stickTop() + 12, true); sc.setAttribute('tabindex', '-1'); sc.focus({ preventScroll: true }); }
        return;
      }
      selectTab(go, { scroll: true, smooth: true, focusTab: true });
    });
  });
  selectTab('tides');

  /* the stuck look for the tab bar; the phone cookie banner (fixed under the header) pushes the bar down while it shows */
  /* measured on scroll (one read per frame): an observer on the sentinel never fires when a jump carries it from below the
     screen to above it in one go, so the bar sat pinned without its solid background */
  var cb = null, stuckRaf = 0;
  function watchStuck() {
    stuckRaf = 0;
    if (!reduced()) {
      var gl = $('wxp-glance').getBoundingClientRect();
      if (gl.bottom > 0 && gl.top < window.innerHeight) $('wxp-sky').style.transform = 'translate3d(0,' + Math.max(-45, Math.min(45, -gl.top * 0.12)).toFixed(1) + 'px,0)';
    }
    var st = stickTop(), deck = $('wxp-deck').getBoundingClientRect();
    $('wxp-tabbar').classList.toggle('is-stuck', $('wxp-sentinel').getBoundingClientRect().top < st && deck.bottom > st + 90);
  }
  window.addEventListener('scroll', function () { if (!stuckRaf) stuckRaf = requestAnimationFrame(watchStuck); }, { passive: true });
  function cbSync() {
    cb = cb || document.querySelector('.cookie-banner');
    var h = 0;
    if (cb && !cb.hidden && window.innerWidth < 768) { var r = cb.getBoundingClientRect(); if (r.height && r.top < 150) h = Math.round(r.height); }
    var v = h + 'px', changed = root.style.getPropertyValue('--wxp-cb') !== v;
    root.style.setProperty('--wxp-cb', v);
    watchStuck();
    if (changed) runPending();
  }
  cbSync();
  function cbWatch() {
    cbSync();
    cb = document.querySelector('.cookie-banner');
    if (cb && 'MutationObserver' in window) new MutationObserver(cbSync).observe(cb, { attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
    setTimeout(cbSync, 700);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cbWatch); else cbWatch();
  if ('IntersectionObserver' in window) {
    [$('now'), $('ten-day'), $('wxp-deck')].forEach(function (sec) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { sec.classList.toggle('wx-off', !e.isIntersecting); }); }).observe(sec);
    });
  }

  /* old links: #tides, #radar, #day-2026-09-19, #faq ... open the right place, then the address goes back to /bournemouth/weather/ */
  var pendingDay = null;
  function below() { return stickTop() + 8; }
  function route() {
    var h = location.hash.replace(/^#/, ''), m, handled = true;
    if (!h) return;
    if ((m = /^day-(\d{4}-\d{2}-\d{2})$/.exec(h))) {
      if (last && last.forecast && last.forecast.ok) last.forecast.days.forEach(function (x, k) { if (x.d === m[1]) selectDay(k, { scrollStrip: true, instant: true }); });
      else pendingDay = m[1];
      wantJump(function () { return $('ten-day'); }, below);
    }
    else if (TABS.indexOf(h) >= 0) { selectTab(h); wantJump(function () { return $('wxp-sentinel'); }, stickTop); }
    else if (h === 'now' || h === 'weather') wantJump(function () { return $('now'); }, below);
    else if (h === 'hourly' || h === 'ten-day') wantJump(function () { return $('ten-day'); }, below);
    else if (h === 'sources') { var det = $('sources').querySelector('details'); if (det) det.open = true; wantJump(function () { return $('sources'); }, below); }
    else if (h === 'faq') wantJump(function () { return $('faq'); }, below);
    else if (h !== 'main') handled = false;   /* #main: the site's skip link has already moved focus; only tidy the address */
    if (handled && history.replaceState) history.replaceState(history.state, '', location.pathname + location.search);
  }
  route();
  window.addEventListener('hashchange', route);

  /* ---------------- loading, and keeping a long-open page honest ---------------- */
  var DOWN = { warnings: { ok: false }, forecast: { ok: false, hours: [], days: [] }, obs: { ok: false }, tide: { ok: false }, sea: {}, radar: { ok: false, frames: [] }, sat: null, air: { ok: false } };
  var lastFetch = 0, lastRender = 0, fetching = false;
  function renderAll(d, again) {
    var keep = again && last && last.forecast && last.forecast.days && dayIdx >= 0 && last.forecast.days[dayIdx] ? last.forecast.days[dayIdx].d : null;
    last = d; lastRender = Date.now();
    [function () { renderWarnings(d.warnings); }, function () { renderGlance(d); }, function () { renderStrip(d, keep); }]
      .forEach(function (fn) { try { fn(); } catch (err) { if (window.console) console.error('weather block failed', err); } });
    if (again) { var was = shown; shown = {}; TABS.forEach(function (t) { if (was[t]) ensure(t); }); }
    ensure(curTab);
    runPending();
  }
  function load() {
    if (fetching) return;
    fetching = true;
    fetch('/api/bm-wx.php', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('weather feed answered ' + r.status); return r.json(); }).then(function (d) {
      fetching = false; lastFetch = Date.now(); renderAll(d, !!last);
    }).catch(function (err) {
      fetching = false; lastFetch = Date.now();
      if (window.console && err) console.error(err);
      /* keep readings already on screen (their labels age on their own); with nothing yet, say the feeds are down */
      if (!last || last === DOWN) {
        renderAll(DOWN, !!last);
        $('wxp-nowcard').innerHTML = '<span class="chip-f">WEATHER FEEDS &middot; NOT AVAILABLE</span><p class="wxp-sub">The weather feeds aren\u2019t answering right now, so nothing is shown rather than old numbers. Try again in a few minutes.</p>';
      }
    });
  }
  load();
  setInterval(function () {
    if (document.hidden) return;
    if (Date.now() - lastFetch > 10 * 60000) load();
    else if (last && last !== DOWN && Date.now() - lastRender > 10 * 60000) { lastRender = Date.now(); try { renderGlance(last); if (shown.sea) renderSea(last); } catch (e) {} }
  }, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && lastFetch && Date.now() - lastFetch > 5 * 60000) load(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) load(); });

  /* charts are sized to their box: redraw on a real width change (not on the mobile toolbar resizing the height) */
  var lastW = window.innerWidth, rt = null;
  window.addEventListener('resize', function () {
    moveTabInk(); moveInk(); cbSync();
    if (!last || Math.abs(window.innerWidth - lastW) < 40) return; lastW = window.innerWidth;
    clearTimeout(rt); rt = setTimeout(function () {
      try {
        if (shown.tides) renderTides(last);
        if (shown.wind) renderWind(last);
        if (dayIdx >= 0 && last.forecast && last.forecast.ok) renderDay(dayIdx, 0);
        moveTabInk(); moveInk(); cbSync();
      } catch (e) {}
    }, 250);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveTabInk(); moveInk(); runPending(); });

  /* ---------------- share ----------------
     Phones: the phone's own share sheet (WhatsApp, Messages, Facebook...). Computers, or browsers without one (Facebook's
     in-app browser): a small panel of plain links - no share scripts from anyone. What gets shared is written from the
     data on screen and keeps its labels: forecast, measured, predicted and not for navigation. */
  var SHARE_ICON = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>';
  (function () {
    var UA = navigator.userAgent || '';
    var IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), ANDROID = /Android/i.test(UA);
    var COARSE = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var sheet = $('wxp-share'), PAGE = location.origin + location.pathname;
    function enc(x) { return encodeURIComponent(x); }
    function tideLine(evs) {
      return evs.map(function (x) {
        return x.type === 'HH' ? 'high ' + hhmm(x.t) + ' & ' + hhmm(x.t2) + ' (double high water)' : (x.type === 'L' ? 'low ' : 'high ') + hhmm(x.t);
      }).join(', ');
    }
    function content(kind, el) {
      var d = last || {}, f = d.forecast, t = d.tide, url = PAGE, text = '';
      if (kind === 'day' && f && f.ok) {
        var ymd = el.getAttribute('data-ymd'), day = (f.days || []).filter(function (x) { return x.d === ymd; })[0];
        if (day) {
          text = (day.part ? 'The rest of today, ' : '') + longDay(ymd) + ' in Bournemouth: ' + words(day.sym).toLowerCase() + ', up to ' + deg(day.hi) + ', down to ' + deg(day.lo)
            + (day.rain >= 0.1 ? ', ' + day.rain.toFixed(1) + ' mm of rain' : ', dry') + ', wind up to ' + mph(day.wind) + ' mph ' + compass(day.dir) + '. (MET Norway forecast)';
          url += '#day-' + ymd;
        }
      } else if (kind === 'tides' && t && t.ok) {
        var today = ukYmd(Date.now()), evs = groupTides(t.events).filter(function (x) { return ukYmd(Date.parse(x.t)) === today; });
        if (evs.length) text = 'Bournemouth Pier tide times, ' + longDay(today) + ': ' + tideLine(evs) + '. Predicted times, not for navigation.';
        url += '#tides';
      }
      if (!text) {
        var bits = [];
        if (f && f.ok && f.hours && f.hours.length) bits.push(deg(f.hours[0].temp) + ' and ' + words(f.hours[0].sym).toLowerCase() + ' (forecast)');
        var sea = d.sea && d.sea.sea;
        if (sea && sea.ok && !sea.stale && age(sea.read_at) <= 3 * 3600000) bits.push('sea ' + sea.tempC.toFixed(1) + '\u00b0C (measured)');   /* same freshness rule as the page's labels */
        if (t && t.ok) { var nx = groupTides(t.events).filter(function (x) { return Date.parse(x.type === 'HH' ? x.t2 : x.t) > Date.now(); })[0]; if (nx) bits.push('next tide: ' + tideLine([nx]) + (ukYmd(Date.parse(nx.t)) !== ukYmd(Date.now()) ? ' ' + dayLabel(nx.t).toLowerCase() : '')); }
        text = (bits.length ? 'Bournemouth right now: ' + bits.join(', ') + '.\n' : '') + 'The seafront forecast, tide times, rain radar and the sea temperature, all in one place:';
      }
      return { title: 'Bournemouth weather, tides & the sea', text: text, url: url };
    }
    function track(method, kind) { try { if (typeof window.gtag === 'function' && localStorage.getItem('tt_internal') !== '1') window.gtag('event', 'weather_share', { method: method, content_type: kind }); } catch (e) {} }
    var ICONS = {
      whatsapp: '<i style="background:#25d366;color:#fff"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.5 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5.2.5.8 1.8.8 1.9.1.1.1.3 0 .5-.1.2-.1.3-.3.5l-.4.5c-.1.1-.3.3-.1.6.2.3.7 1.1 1.5 1.8 1 .9 1.8 1.2 2.1 1.3.3.1.4.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.3.1 1.6.8 1.9.9.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg></i>',
      facebook: '<i style="background:#1877f2;color:#fff"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8h3.3z"/></svg></i>',
      x: '<i style="background:#000;color:#fff;border:1px solid #333"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3l-6.6 7.5L22 21h-6.1l-4.8-6.2L5.6 21h-3l7-8L2 3h6.2l4.3 5.7L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg></i>',
      email: '<i style="background:#2a86c4;color:#fff"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></i>',
      sms: '<i style="background:#7fd8a8;color:#08131e"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5z"/></svg></i>',
      copy: '<i style="background:#ffd76a;color:#08131e"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg></i>'
    };
    function openPanel(c, kind) {
      var full = c.text + '\n' + c.url;
      $('wxp-share-text').textContent = full;
      $('wxp-share-done').textContent = '';
      var links = [
        ['whatsapp', 'WhatsApp', 'https://wa.me/?text=' + enc(full)],
        ['facebook', 'Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + enc(c.url)],
        ['x', 'X', 'https://twitter.com/intent/tweet?text=' + enc(c.text) + '&url=' + enc(c.url)],
        ['email', 'Email', 'mailto:?subject=' + enc(c.title) + '&body=' + enc(c.text + '\n\n' + c.url)]
      ];
      if (IOS || ANDROID) links.push(['sms', 'Text message', 'sms:' + (IOS ? '&' : '?') + 'body=' + enc(full)]);
      $('wxp-share-grid').innerHTML = links.map(function (l) {
        var ext = /^https/.test(l[2]);
        return '<a href="' + l[2] + '" data-m="' + l[0] + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + ICONS[l[0]] + l[1] + '</a>';
      }).join('') + '<button type="button" data-copy>' + ICONS.copy + 'Copy link</button>';
      [].forEach.call($('wxp-share-grid').querySelectorAll('a'), function (a) { a.addEventListener('click', function () { track(a.getAttribute('data-m'), kind); }); });
      $('wxp-share-grid').querySelector('[data-copy]').addEventListener('click', function () {
        var done = function () { $('wxp-share-done').textContent = 'Link copied'; track('copy', kind); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(c.url).then(done, fallback); else fallback();
        function fallback() { var ta = document.createElement('textarea'); ta.value = c.url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { $('wxp-share-done').textContent = c.url; } ta.remove(); }
      });
      sheet.hidden = false;
      requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add('on'); }); });
      var first = $('wxp-share-grid').querySelector('a'); if (first) try { first.focus({ preventScroll: true }); } catch (e) {}
    }
    function closePanel() { sheet.classList.remove('on'); setTimeout(function () { sheet.hidden = true; }, reduced() ? 0 : 320); }
    $('wxp-share-x').addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) closePanel(); });
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-share]') : null;
      if (!b) return;
      e.preventDefault();
      var kind = b.getAttribute('data-share'), c = content(kind, b);
      if (navigator.share && (COARSE || IOS || ANDROID)) {
        navigator.share({ title: c.title, text: c.text, url: c.url }).then(function () { track('native', kind); }).catch(function (err) { if (err && err.name !== 'AbortError') openPanel(c, kind); });
        return;
      }
      openPanel(c, kind);
    });
  })();

  /* ---------------- keep it on the home screen ----------------
     Android Chrome/Edge: the browser's own install prompt. iPhone/iPad: Safari has no prompt, so the steps, with the Share
     icon drawn. Facebook/Instagram's in-app browsers can't add to the home screen at all, so they get "open in your browser
     first" (most visits arrive from Facebook). Desktop: the bookmark shortcut. No service worker, same as the signal check. */
  (function () {
    var UA = navigator.userAgent || '';
    var IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var ANDROID = /Android/i.test(UA), INAPP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger/i.test(UA);
    var IOS_OTHER = /CriOS|FxiOS|EdgiOS/.test(UA), SAMSUNG = /SamsungBrowser/i.test(UA);
    var PHONE = IOS || ANDROID || (window.matchMedia && window.matchMedia('(max-width: 767px)').matches);
    var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    var sheet = $('wxp-a2hs'), how = $('wxp-a2hs-how'), deferred = null;
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function track(name) { try { if (typeof window.gtag === 'function' && get('tt_internal') !== '1') window.gtag('event', name, { platform: IOS ? 'ios' : ANDROID ? 'android' : 'desktop', in_app: INAPP ? 1 : 0 }); } catch (e) {} }
    /* a class, not just hidden=true: the slim footer's button is parsed after this script runs */
    function pills(show) { document.documentElement.classList.toggle('wxp-a2hs-done', !show); [].forEach.call(document.querySelectorAll('[data-a2hs]'), function (b) { b.hidden = !show; }); }
    if (standalone || get('wxp_a2hs_added')) {
      pills(false);
      if (standalone) track('weather_opened_from_home_screen');
      return;
    }
    var SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Share"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
    var PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
    function steps() {
      if (INAPP) return '<b>You\u2019re in Facebook\u2019s built-in browser</b>, which can\u2019t add pages to your home screen. Tap <b>\u22ef</b> at the top right, choose <b>' + (IOS ? 'Open in Safari' : 'Open in browser') + '</b>, then tap <b>Add to home screen</b> again from there.';
      if (IOS && IOS_OTHER) return 'Tap the <b>Share</b> button ' + SHARE + ' by the address bar, then <b>Add to Home Screen</b>.';
      if (IOS) return '1. Tap the <b>Share</b> button ' + SHARE + ' in Safari\u2019s toolbar.<br>2. Scroll down and tap <b>Add to Home Screen</b> ' + PLUS + '.<br>3. Tap <b>Add</b>. The B365 Weather icon opens straight to this page.';
      if (SAMSUNG) return 'Tap the <b>menu</b> (\u2630, bottom right), then <b>Add page to</b> \u2192 <b>Home screen</b>.';
      if (ANDROID) return 'Tap the <b>\u22ee</b> menu at the top right and choose <b>Add to home screen</b> (or <b>Install app</b>).';
      return 'Press <b>' + (/Mac/.test(navigator.platform) ? '\u2318' : 'Ctrl') + ' + D</b> to bookmark this page, or use your browser\u2019s menu to <b>install</b> it as an app.';
    }
    function open(auto) {
      sheet.hidden = false;
      if (!auto) { how.innerHTML = steps(); how.hidden = !!deferred; }
      requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add('on'); }); });
      track(auto ? 'weather_a2hs_offer' : 'weather_a2hs_open');
    }
    function close() { sheet.classList.remove('on'); setTimeout(function () { sheet.hidden = true; }, reduced() ? 0 : 320); }
    function add() {
      track('weather_a2hs_click');
      if (deferred) {
        var d = deferred; deferred = null; d.prompt();
        d.userChoice.then(function (r) { if (r && r.outcome === 'accepted') { put('wxp_a2hs_added', '1'); pills(false); close(); } });
        return;
      }
      how.innerHTML = steps(); how.hidden = false;
    }
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
    window.addEventListener('appinstalled', function () { put('wxp_a2hs_added', '1'); pills(false); close(); track('weather_a2hs_installed'); });
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-a2hs]') : null;
      if (!t) return;
      e.preventDefault();
      if (deferred) add(); else open(false);
    });
    $('wxp-a2hs-add').addEventListener('click', add);
    $('wxp-a2hs-no').addEventListener('click', function () { put('wxp_a2hs_off', String(Date.now())); close(); track('weather_a2hs_dismiss'); });
    $('wxp-a2hs-x').addEventListener('click', function () { put('wxp_a2hs_off', String(Date.now())); close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) close(); });

    /* the invitation: phones only, once per visit, after the page has been used - two taps on days, tabs or readings,
       40 seconds on the page, or 8 seconds into a return visit. "Not now" keeps it away for 30 days. */
    if (!PHONE) return;
    var visits = (+get('wxp_visits') || 0) + 1; put('wxp_visits', String(visits));
    var off = +(get('wxp_a2hs_off') || 0);
    if (off && Date.now() - off < 30 * 864e5) return;
    try { if (sessionStorage.getItem('wxp_a2hs_shown')) return; } catch (e) {}
    var fired = false, used = 0;
    function invite() {
      if (fired || !sheet.hidden) return;
      if (document.hidden) { document.addEventListener('visibilitychange', function once() { if (!document.hidden) { document.removeEventListener('visibilitychange', once); invite(); } }); return; }
      fired = true;
      try { sessionStorage.setItem('wxp_a2hs_shown', '1'); } catch (e) {}
      open(true);
    }
    root.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.wxp-dchip, [role="tab"], .wxp-vital')) { used++; if (used === 2) setTimeout(invite, 1800); }
    });
    setTimeout(invite, visits >= 2 ? 8000 : 40000);
  })();

  /* entrances: each marked block animates in the first time it comes into view; the deck cascades its open panel */
  (function () {
    var marks = [].slice.call(root.querySelectorAll('[data-anim]'));
    function show(el) {
      el.classList.add('is-in');
      if (el.id === 'wxp-deck') { var p = $(curTab); if (p && !reduced()) { p.classList.remove('wxp-in'); void p.offsetWidth; p.classList.add('wxp-in'); } }
    }
    if ('IntersectionObserver' in window && !reduced()) {
      var aio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { show(e.target); aio.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
      marks.forEach(function (el) { aio.observe(el); });
    } else {
      marks.forEach(show);
    }
    window.__wxpAnim = true;
  })();
})();
</script>'''


_WXP_CONTENT = "\n".join([
    _WXP_HERO,
    _WXP_CSS,
    _WXP_HTML,
    faq_html(_WXP_FAQS),
    _WXP_JS,
])


def register(b365_band):
    _bp.HEAD_EXTRA[_WXP_SLUG] = _WXP_HEAD
    _bp.MANIFEST_FOR[_WXP_SLUG] = "/bournemouth/weather/app.webmanifest?v=1"
    _bp.TOUCH_ICON_FOR[_WXP_SLUG] = "/bournemouth/media/b365-weather-icon-180.png"
    add(
        slug=_WXP_SLUG,
        title="Bournemouth Weather, Tides, Radar & Sea Temperature",
        desc="Bournemouth seafront weather: 10-day forecast, tide times checked against the pier gauge, live rain radar and satellite, wind and the sea temperature.",
        og_title="Bournemouth seafront weather: tides, radar, satellite and the sea",
        schema=_wxp_schema,
        content=_WXP_CONTENT + "\n" + b365_band + _WXP_MINIFOOT,
        og_image="/bournemouth/media/og-weather.jpg",
    )
