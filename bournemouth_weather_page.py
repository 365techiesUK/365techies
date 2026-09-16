"""
/bournemouth/weather/ - Bournemouth seafront weather, tides, radar, satellite and the sea (16 Sep 2026).

Owner brief: "make our weather page the best - tide times, sea temperature, wind speed and direction,
premium, satellite images". Research + source/licence decisions are in
C:/claude/seo-research/bournemouth-weather-premium-2026-09-16.md and in the docblocks of
api/bm-wx-lib.php, api/bm-radar-lib.php, api/bm-weather-lib.php and tools/bournemouth-tides/fit_tides.py.

THE RULE THAT MAKES IT DIFFERENT (carried from the section plan): every number on this page wears exactly
one provenance label - MEASURED (an instrument), OBSERVED (radar/satellite), PREDICTED (our tide harmonics),
FORECAST (MET Norway, Defra), COMPUTED (astronomy), OFFICIAL (Met Office warnings) - with where and when.
chip-m (the measured colour) is only ever set on instrument/observation blocks; the build guard in
build_blog.py fails if a predicted/forecast block is given it, or if a licence attribution disappears.

Deliberately NOT here: a rain PERCENTAGE (the forecast has none for Dorset), forecast gusts (none),
"beach day scores" or any invented index, a webcam, and any claim the tide times are for navigation.

Everything is drawn client-side from /api/bm-wx.php as SVG + CSS (no chart or map library, no third-party
host - the section's speed guard). Loops preload only when scrolled near, animation pauses off screen and
stops under prefers-reduced-motion.
"""
from build_pages import add, graph, crumb_sub, webpage, faqpage, faq_html, hero, bc_sub

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


_WXP_CSS = r'''
<style>
.wxp{--wx-sun:#ffc94d;--wx-moon:#efe6c4;--wx-cloud:#e4eef5;--wx-cloud2:#9fb4c5;--wx-rain:#6cc4f5;--wx-bolt:#ffd84d;--wx-warm:#ffb347;--wx-cool:#79b8ff;--wx-off:#ff9f5a;--wx-on:#7fd8a8}
.wxp h2{text-wrap:balance}
.wxp-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:.4rem 1.2rem;margin:0 0 1rem}
.wxp-head h2{margin:.2rem 0 0;font-size:clamp(1.45rem,3.2vw,2.1rem)}
.wxp-head p{margin:.35rem 0 0;color:var(--b365-mute);max-width:62ch}
.wxp-card{background:var(--b365-water);border:1px solid var(--b365-line);border-radius:18px;padding:1rem 1.1rem;position:relative;overflow:hidden}
.wxp-grid{display:grid;gap:.8rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))}
.wxp-big{grid-column:1/-1;display:grid;grid-template-columns:auto minmax(0,1fr);gap:.4rem 1.3rem;align-items:center}
@media (min-width:980px){.wxp-big{grid-column:span 2}}
.wxp-big .wx-ic{width:clamp(84px,18vw,136px);height:auto}
@media (max-width:560px){.wxp-big{grid-template-columns:1fr}.wxp-big .wx-ic{width:84px}}
.wxp-num{font-family:var(--font-display,inherit);font-weight:600;font-size:clamp(2.6rem,7vw,3.9rem);line-height:.95;color:var(--b365-foam);margin:.15rem 0;font-variant-numeric:tabular-nums}
.wxp-mid{font-family:var(--font-display,inherit);font-weight:600;font-size:clamp(1.7rem,4.4vw,2.3rem);line-height:1;color:var(--b365-foam);margin:.2rem 0;font-variant-numeric:tabular-nums}
.wxp-sub{color:var(--b365-mute);font-size:.94rem;line-height:1.5;margin:.25rem 0 0}
.wxp-sub b{color:var(--b365-foam);font-weight:600}
.wxp-lbl{font-family:var(--mono,ui-monospace,monospace);font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--b365-mute);margin:0 0 .15rem}
.wxp-skel{display:block;height:1rem;width:60%;border-radius:6px;background:linear-gradient(90deg,var(--b365-line),#284259,var(--b365-line));background-size:200% 100%;animation:wx-shimmer 1.4s linear infinite;margin:.4rem 0}
.wxp-warn{border:1px solid var(--b365-dusk);border-left-width:4px;background:rgba(255,176,102,.08);border-radius:12px;padding:.7rem 1rem;margin:0 0 .9rem;color:var(--b365-foam)}
.wxp-warn a{color:var(--b365-foam)}
.wxp-ok{margin:0 0 .9rem;color:var(--b365-mute);font-size:.9rem}
/* wind */
.wxp-compass{width:150px;height:150px;flex:none;position:relative}
.wxp-compass svg{width:100%;height:100%;display:block}
.wxp-needle{transition:transform 1.6s cubic-bezier(.2,1.35,.4,1);transform-box:view-box;transform-origin:75px 75px}
.wxp-wobble{animation:wxp-wobble 3.2s ease-in-out infinite;transform-box:view-box;transform-origin:75px 75px}
.wxp-windrow{display:flex;gap:1rem;align-items:center;flex-wrap:wrap}
.wxp-streaks{position:absolute;inset:-30%;pointer-events:none;opacity:.22}
.wxp-streaks i{position:absolute;left:0;height:1.5px;width:60px;border-radius:2px;background:linear-gradient(90deg,transparent,var(--b365-foam));animation:wxp-streak linear infinite}
.wxp-shore{display:inline-block;padding:.1rem .55rem;border-radius:999px;font-size:.82rem;font-weight:600;border:1px solid currentColor}
.wxp-shore.off{color:var(--wx-off)}.wxp-shore.on{color:var(--wx-on)}.wxp-shore.cross{color:var(--wx-cool)}
/* charts */
.wxp-chart{margin-top:.8rem;overflow-x:auto;-webkit-overflow-scrolling:touch}
.wxp-chart svg{display:block}
.wxp-chart text{font-family:var(--mono,ui-monospace,monospace);fill:var(--b365-mute);font-size:11px}
.wxp-chart .t-strong{fill:var(--b365-foam);font-weight:600;font-size:12px}
.wxp-draw{fill:none;stroke-dasharray:1;stroke-dashoffset:1;animation:wx-draw 1.8s cubic-bezier(.3,.7,.2,1) .1s forwards}
.wxp-fadein{opacity:0;animation:wx-fade .8s ease .9s forwards}
.wxp-pop{opacity:0;transform-box:fill-box;transform-origin:center;animation:wxp-pop .5s cubic-bezier(.2,1.4,.4,1) forwards}
.wxp-bar{transform-box:fill-box;transform-origin:bottom;transform:scaleY(0);animation:wx-grow .7s cubic-bezier(.3,.7,.2,1) forwards}
.wxp-legend{display:flex;flex-wrap:wrap;gap:.3rem 1rem;margin:.5rem 0 0;padding:0;list-style:none;font-size:.85rem;color:var(--b365-mute)}
.wxp-legend i{display:inline-block;width:18px;height:3px;border-radius:2px;vertical-align:middle;margin-right:.35rem}
/* tide table */
.wxp-tides{list-style:none;margin:.9rem 0 0;padding:0;display:grid;gap:.5rem}
.wxp-tides li{display:grid;grid-template-columns:7.2rem minmax(0,1fr);gap:.2rem .8rem;align-items:start;padding:.55rem .8rem;border:1px solid var(--b365-line);border-radius:12px;background:rgba(16,32,47,.55)}
@media (max-width:520px){.wxp-tides li{grid-template-columns:1fr}}
.wxp-tides h3{margin:0;font-size:.95rem;color:var(--b365-foam)}
.wxp-evs{display:flex;flex-wrap:wrap;gap:.35rem .5rem}
.wxp-ev{display:inline-flex;align-items:baseline;gap:.35rem;padding:.18rem .6rem;border-radius:8px;font-variant-numeric:tabular-nums;font-size:.92rem;background:rgba(255,255,255,.04);border:1px solid var(--b365-line);color:var(--b365-foam)}
.wxp-ev b{font-weight:600}
.wxp-ev.hi{border-color:rgba(108,196,245,.45)}.wxp-ev.lo{border-color:rgba(159,180,197,.35)}
.wxp-ev small{color:var(--b365-mute)}
/* ten-day + hourly icons reuse the hub panel look */
.wxp-days{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}
@media (min-width:720px){.wxp-days{grid-template-columns:repeat(5,minmax(0,1fr))}}
.wxp-day{background:var(--b365-water);border:1px solid var(--b365-line);border-radius:14px;padding:.75rem .8rem .8rem;display:flex;flex-direction:column;gap:.15rem;opacity:0;transform:translateY(14px);animation:wx-rise .6s cubic-bezier(.3,.7,.2,1) forwards}
.wxp-day h3{margin:0;font-size:.98rem;color:var(--b365-foam)}
.wxp-day .wx-ic{width:62px;height:62px;margin:.1rem 0 0 -.3rem}
.wxp-hl{display:flex;align-items:baseline;gap:.45rem;font-variant-numeric:tabular-nums}
.wxp-hl b{font-size:1.45rem;color:var(--b365-foam);font-weight:600}.wxp-hl span{color:var(--b365-mute)}
.wxp-range{position:relative;height:5px;border-radius:3px;background:var(--b365-line);margin:.35rem 0 .45rem}
.wxp-range i{position:absolute;top:0;bottom:0;border-radius:3px;background:linear-gradient(90deg,var(--wx-cool),var(--wx-warm));transform-origin:left;transform:scaleX(0);animation:wx-growx .9s cubic-bezier(.3,.7,.2,1) forwards}
.wxp-meta{display:flex;flex-wrap:wrap;gap:.1rem .7rem;font-size:.86rem;color:var(--b365-mute);font-variant-numeric:tabular-nums}
.wxp-arrow{display:inline-block;width:.85em;height:.85em;vertical-align:-.05em;margin-right:.2em;transition:transform 1.2s cubic-bezier(.3,.7,.2,1)}
.wxp-arrow path{fill:var(--b365-foam)}
/* map players */
.wxp-map{position:relative;border-radius:16px;overflow:hidden;border:1px solid var(--b365-line);background:#0a1a28;aspect-ratio:960/850;width:100%;max-width:min(100%,820px);margin:0 auto}
#wxp-nasa{max-width:min(100%,980px);margin:0 auto}
.wxp-map img{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .35s linear}
.wxp-map img.on,.wxp-map img.base,.wxp-map img.lines{opacity:1}
.wxp-map img.radar{image-rendering:auto}
.wxp-pin{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:#ffd76a;box-shadow:0 0 0 0 rgba(255,215,106,.7);animation:wxp-ping 2s ease-out infinite}
.wxp-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem .9rem;margin:.7rem 0 0}
.wxp-ctl button{min-height:44px;min-width:44px;border-radius:999px;border:1px solid var(--b365-line);background:var(--b365-water);color:var(--b365-foam);font:inherit;padding:0 1rem;cursor:pointer}
.wxp-ctl button[aria-pressed="true"]{border-color:#ffd76a;color:#ffd76a}
.wxp-ctl button:focus-visible,.wxp-ctl input:focus-visible{outline:2px solid #ffd76a;outline-offset:2px}
.wxp-ctl input[type=range]{flex:1 1 180px;accent-color:#ffd76a;min-height:44px}
.wxp-time{font-family:var(--mono,ui-monospace,monospace);color:var(--b365-foam);font-size:.9rem;min-width:9.5rem}
.wxp-scale{display:flex;gap:2px;align-items:center;flex-wrap:wrap;margin:.6rem 0 0;font-size:.8rem;color:var(--b365-mute)}
.wxp-scale span{display:inline-flex;align-items:center;gap:.3rem;margin-right:.6rem}
.wxp-scale i{display:inline-block;width:14px;height:10px;border-radius:2px}
.wxp-tabs{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 .7rem}
.wxp-tabs button[aria-pressed="true"]{border-color:#ffd76a!important;color:#ffd76a!important}
.wxp-tabs button:focus-visible{outline:2px solid #ffd76a;outline-offset:2px}
.wxp-note{margin:.7rem 0 0;color:var(--b365-mute);font-size:.9rem}
.wxp-src{width:100%;border-collapse:collapse;font-size:.9rem}
.wxp-src th,.wxp-src td{text-align:left;padding:.5rem .6rem;border-bottom:1px solid var(--b365-line);vertical-align:top}
.wxp-src th{color:var(--b365-foam);font-weight:600}
.wxp-src td{color:var(--b365-mute)}
.wxp-moon{width:56px;height:56px;border-radius:50%;background:var(--wx-moon);position:relative;overflow:hidden;flex:none;box-shadow:0 0 24px rgba(239,230,196,.25)}
.wxp-moon i{position:absolute;inset:0;border-radius:50%;background:#10202f;transition:transform 1.6s cubic-bezier(.3,.7,.2,1)}
.wxp-daqi{display:flex;gap:.4rem;flex-wrap:wrap;margin:.4rem 0 0}
.wxp-daqi span{display:inline-flex;flex-direction:column;align-items:center;min-width:3rem;padding:.3rem .4rem;border-radius:10px;border:1px solid var(--b365-line);font-size:.8rem;color:var(--b365-mute)}
.wxp-daqi b{font-size:1.1rem;color:var(--b365-foam)}
.wxp-daqi .low{border-color:rgba(127,216,168,.5)}.wxp-daqi .mod{border-color:rgba(255,179,71,.6)}.wxp-daqi .high{border-color:rgba(255,110,90,.7)}
/* the animated icons (same shapes as the hub panel) */
.wx-rays,.wx-core,.wx-moon,.wx-star,.wx-cl,.wx-cl2,.wx-drop,.wx-flake,.wx-fog,.wx-bolt{transform-box:fill-box;transform-origin:center}
.wx-rays line{stroke:var(--wx-sun);stroke-width:3.2;stroke-linecap:round}
.wx-rays{animation:wx-spin 26s linear infinite}
.wx-core{fill:var(--wx-sun);animation:wx-pulse 3.4s ease-in-out infinite}
.wx-moon{fill:var(--wx-moon);animation:wx-rock 7s ease-in-out infinite}
.wx-star{fill:var(--wx-moon);animation:wx-twinkle 2.6s ease-in-out infinite}
.wx-cl{fill:var(--wx-cloud);animation:wx-drift 7s ease-in-out infinite alternate}
.wx-cl2{fill:var(--wx-cloud2);animation:wx-drift 9s ease-in-out infinite alternate-reverse}
.wx-drop{stroke:var(--wx-rain);stroke-width:2.6;stroke-linecap:round;animation:wx-fall 1.05s linear infinite}
.wx-heavy .wx-drop{animation-duration:.72s}
.wx-flake{fill:#fff;animation:wx-snow 2.6s linear infinite}
.wx-fog{stroke:var(--wx-cloud2);stroke-width:3;stroke-linecap:round;animation:wx-slide 4s ease-in-out infinite alternate}
.wx-bolt{fill:var(--wx-bolt);opacity:0;animation:wx-flash 3.6s linear infinite}
@keyframes wx-spin{to{transform:rotate(360deg)}}
@keyframes wx-pulse{50%{transform:scale(1.07)}}
@keyframes wx-rock{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(5deg)}}
@keyframes wx-twinkle{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes wx-drift{from{transform:translateX(-2.6px)}to{transform:translateX(2.6px)}}
@keyframes wx-fall{0%{transform:translateY(-6px);opacity:0}20%{opacity:1}100%{transform:translateY(10px);opacity:0}}
@keyframes wx-snow{0%{transform:translate(0,-6px);opacity:0}25%{opacity:1}50%{transform:translate(2px,2px)}100%{transform:translate(-1px,11px);opacity:0}}
@keyframes wx-slide{from{transform:translateX(-4px)}to{transform:translateX(4px)}}
@keyframes wx-flash{0%,84%,100%{opacity:0}86%,90%{opacity:1}88%{opacity:.25}}
@keyframes wx-draw{to{stroke-dashoffset:0}}
@keyframes wx-fade{to{opacity:1}}
@keyframes wx-grow{to{transform:scaleY(1)}}
@keyframes wx-growx{to{transform:scaleX(1)}}
@keyframes wx-rise{to{opacity:1;transform:none}}
@keyframes wx-shimmer{to{background-position:-200% 0}}
@keyframes wxp-wobble{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
@keyframes wxp-streak{from{transform:translateX(-80px)}to{transform:translateX(560px)}}
@keyframes wxp-pop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}
@keyframes wxp-ping{0%{box-shadow:0 0 0 0 rgba(255,215,106,.7)}80%,100%{box-shadow:0 0 0 18px rgba(255,215,106,0)}}
.wxp.wx-off *,.wxp.wx-off *::before{animation-play-state:paused!important}
@media (prefers-reduced-motion:reduce){
  .wxp *,.wxp *::before{animation:none!important;transition:none!important}
  .wxp-draw{stroke-dashoffset:0}.wxp-fadein,.wxp-pop,.wxp-day{opacity:1;transform:none}
  .wxp-bar,.wxp-range i{transform:none}.wx-drop,.wx-flake,.wx-bolt{opacity:1}.wxp-streaks{display:none}
}
</style>'''


_WXP_HTML = r'''
    <div class="wxp" id="wxp">
    <section class="section b365" id="now" aria-labelledby="now-h">
      <div class="wrap">
        <div id="wxp-warnings" aria-live="polite"></div>
        <div class="wxp-head"><div><p class="eyebrow mono">// RIGHT NOW ON THE SEAFRONT</p><h2 id="now-h">Bournemouth right now</h2></div></div>
        <div class="wxp-grid">
          <div class="wxp-card wxp-big" id="wxp-nowcard">
            <div aria-hidden="true" style="width:110px;height:100px"></div>
            <div><span class="wxp-skel"></span><span class="wxp-skel" style="width:35%;height:2.6rem"></span><span class="wxp-skel" style="width:80%"></span></div>
          </div>
          <div class="wxp-card" id="wxp-windcard"><span class="chip-m" id="wxp-wind-chip">WIND &middot; LOADING</span><span class="wxp-skel"></span><span class="wxp-skel" style="width:40%"></span></div>
          <div class="wxp-card" id="wxp-seacard"><span class="chip-m" id="wxp-sea-chip">SEA TEMPERATURE &middot; LOADING</span><span class="wxp-skel"></span></div>
          <div class="wxp-card" id="wxp-tidecard"><span class="chip-f" id="wxp-tidenow-chip">TIDE &middot; LOADING</span><span class="wxp-skel"></span></div>
          <div class="wxp-card" id="wxp-suncard"><span class="chip-f" id="wxp-sun-chip">COMPUTED &middot; SUN &amp; MOON</span><span class="wxp-skel"></span></div>
          <div class="wxp-card" id="wxp-aircard"><span class="chip-f" id="wxp-air-chip">FORECAST &middot; AIR QUALITY &middot; DEFRA</span><span class="wxp-skel"></span></div>
        </div>
      </div>
    </section>

    <section class="section b365" id="tides" aria-labelledby="tides-h">
      <div class="wrap">
        <div class="wxp-head"><div><p class="eyebrow mono">// TIDE TIMES &middot; BOURNEMOUTH PIER</p><h2 id="tides-h">Bournemouth tide times</h2>
          <p>High and low water for the next seven days at the pier, with the pier&rsquo;s own gauge drawn over the prediction so you can see how the sea is really running.</p></div>
          <span class="chip-f" id="wxp-tide-chip">PREDICTED &middot; LOADING</span></div>
        <div class="wxp-card">
          <p class="wxp-sub" id="wxp-tide-now">Loading the tide&hellip;</p>
          <div class="wxp-chart" id="wxp-tide-chart"></div>
          <ul class="wxp-legend"><li><i style="background:#79b8ff"></i>Predicted tide</li><li><i style="background:#4fd8c4"></i>Measured by the pier gauge</li><li><i style="background:#ffd76a"></i>Now</li></ul>
        </div>
        <ol class="wxp-tides" id="wxp-tide-table" aria-label="High and low water, next seven days"></ol>
        <p class="wxp-note" id="wxp-tide-acc"></p>
        <p class="wxp-note">Heights are metres above chart datum, as in printed tide tables (chart datum at Bournemouth is 1.40&nbsp;m below Ordnance Datum Newlyn). <strong>Not for navigation</strong> &mdash; for passage planning use the official <a href="https://easytide.admiralty.co.uk/" rel="noopener">ADMIRALTY EasyTide</a> tables.</p>
      </div>
    </section>

    <section class="section b365" id="wind" aria-labelledby="wind-h">
      <div class="wrap">
        <div class="wxp-head"><div><p class="eyebrow mono">// WIND</p><h2 id="wind-h">Wind speed and direction</h2>
          <p>Measured now at Bournemouth Airport, and MET Norway&rsquo;s 48-hour forecast for the pier &mdash; with what the direction means on the beach.</p></div>
          <span class="chip-f" id="wxp-windfc-chip">FORECAST &middot; MET NORWAY</span></div>
        <div class="wxp-card">
          <div class="wxp-chart" id="wxp-wind-chart"></div>
          <ul class="wxp-legend"><li><i style="background:#ffb347"></i>Forecast average wind, mph</li><li><i style="background:#ff9f5a;height:8px;width:8px;border-radius:50%"></i>Offshore (blowing out to sea)</li><li><i style="background:#7fd8a8;height:8px;width:8px;border-radius:50%"></i>Onshore</li><li><i style="background:#79b8ff;height:8px;width:8px;border-radius:50%"></i>Along the shore</li></ul>
        </div>
        <p class="wxp-note">Offshore wind blows from the land out to sea. It flattens the waves, but the RNLI warns it can <a href="https://rnli.org/news-and-media/2026/july/09/rnli-issue-warning-as-forecast-of-hot-weather-and-offshore-winds-in-north-west" rel="noopener">very easily sweep inflatables and paddleboards away from the shore</a> &mdash; on offshore days, leave the inflatables on the sand.</p>
      </div>
    </section>

    <section class="section b365" id="hourly" aria-labelledby="hourly-h">
      <div class="wrap">
        <div class="wxp-head"><div><p class="eyebrow mono">// NEXT 48 HOURS</p><h2 id="hourly-h">Hour by hour</h2></div><span class="chip-f" id="wxp-hourly-chip">FORECAST &middot; MET NORWAY</span></div>
        <div class="wxp-card"><div class="wxp-chart" id="wxp-hourly-chart"></div>
          <ul class="wxp-legend"><li><i style="background:#ffb347"></i>Temperature</li><li><i style="background:#6cc4f5;height:8px"></i>Rain, mm per hour</li><li><i style="background:#e4eef5;opacity:.5;height:8px"></i>Cloud cover</li><li><i style="background:linear-gradient(90deg,#7fd8a8,#ffd84d,#ff9f5a,#ff5a5a);height:8px"></i>UV if the sky is clear</li></ul></div>
      </div>
    </section>

    <section class="section b365" id="ten-day" aria-labelledby="ten-h">
      <div class="wrap">
        <div class="wxp-head"><div><p class="eyebrow mono">// 10-DAY FORECAST</p><h2 id="ten-h">The next 10 days</h2></div><span class="chip-f" id="wxp-days-chip">FORECAST &middot; MET NORWAY</span></div>
        <ol class="wxp-days" id="wxp-days" aria-label="Daily forecast"></ol>
        <p class="wxp-note">The first two to three days are forecast hour by hour and are the ones to plan around; after that the model works in six-hour steps. Rain is the forecast amount in millimetres &mdash; this forecast gives no percentage chance for our coast, so we don&rsquo;t invent one.</p>
      </div>
    </section>

    <section class="section b365" id="radar" aria-labelledby="radar-h">
      <div class="wrap">
        <div class="wxp-head"><div><p class="eyebrow mono">// RAIN RADAR</p><h2 id="radar-h">Rain radar: the last three hours</h2>
          <p>Where it is raining across Dorset, the Channel and beyond, every 15 minutes. Play the loop to see which way the showers are heading.</p></div>
          <span class="chip-m" id="wxp-radar-chip">OBSERVED &middot; RADAR &middot; LOADING</span></div>
        <div class="wxp-map" id="wxp-radar-map">
          <img class="base" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" data-src="/bournemouth/media/wx-basemap.jpg" alt="" width="960" height="850">
          <img class="lines" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" data-src="/bournemouth/media/wx-lines.png" alt="" width="960" height="850" style="z-index:3">
          <span class="wxp-pin" style="left:48.4%;top:43.2%;z-index:4" aria-hidden="true"></span>
        </div>
        <div class="wxp-ctl" id="wxp-radar-ctl" hidden>
          <button type="button" class="wxp-play" aria-label="Pause the radar loop">Pause</button>
          <input type="range" min="0" max="0" value="0" aria-label="Radar frame">
          <span class="wxp-time" aria-live="polite"></span>
        </div>
        <div class="wxp-scale" aria-label="Rain rate colours"><span><i style="background:rgb(116,185,255)"></i>Drizzle</span><span><i style="background:rgb(28,96,232)"></i>Light, 1&ndash;2 mm/h</span><span><i style="background:rgb(40,190,90)"></i>Moderate, 2&ndash;4</span><span><i style="background:rgb(250,220,40)"></i>Heavy, 4&ndash;8</span><span><i style="background:rgb(255,140,20)"></i>Very heavy, 8&ndash;16</span><span><i style="background:rgb(240,40,30)"></i>16&ndash;32</span><span><i style="background:rgb(210,40,210)"></i>32+</span></div>
        <p class="wxp-note" id="wxp-radar-note"></p>
      </div>
    </section>

    <section class="section b365" id="satellite" aria-labelledby="sat-h">
      <div class="wrap">
        <div class="wxp-head"><div><p class="eyebrow mono">// SATELLITE</p><h2 id="sat-h">Bournemouth from space</h2>
          <p>Cloud over the Channel from Meteosat, a new picture every 10 minutes, plus NASA&rsquo;s sharper once-a-day view of Poole Bay.</p></div>
          <span class="chip-m" id="wxp-sat-chip">OBSERVED &middot; SATELLITE &middot; LOADING</span></div>
        <div class="wxp-tabs" id="wxp-sat-tabs" role="group" aria-label="Satellite view"></div>
        <div class="wxp-map" id="wxp-sat-map">
          <img class="lines" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" data-src="/bournemouth/media/wx-lines.png" alt="" width="960" height="850" style="z-index:3">
          <span class="wxp-pin" style="left:48.4%;top:43.2%;z-index:4" aria-hidden="true"></span>
        </div>
        <figure id="wxp-nasa" hidden style="margin:0">
          <img alt="NASA satellite image of the coast from Portland to the Isle of Wight" width="1200" height="759" style="width:100%;height:auto;border-radius:16px;border:1px solid var(--b365-line);display:block">
          <figcaption class="wxp-note" id="wxp-nasa-cap"></figcaption>
        </figure>
        <div class="wxp-ctl" id="wxp-sat-ctl" hidden>
          <button type="button" class="wxp-play" aria-label="Pause the satellite loop">Pause</button>
          <input type="range" min="0" max="0" value="0" aria-label="Satellite frame">
          <span class="wxp-time" aria-live="polite"></span>
        </div>
        <p class="wxp-note" id="wxp-sat-note"></p>
      </div>
    </section>

    <section class="section b365" id="sea" aria-labelledby="sea-h">
      <div class="wrap">
        <div class="wxp-head"><div><p class="eyebrow mono">// THE SEA</p><h2 id="sea-h">The sea and the beaches</h2></div></div>
        <div class="wxp-grid" id="wxp-seagrid"></div>
        <p class="wxp-note">More on the water &mdash; wetsuit advice, every beach&rsquo;s classification and the live storm-overflow monitors &mdash; on <a href="/bournemouth/sea-today/">the sea right now</a>.</p>
      </div>
    </section>

    <section class="section b365" id="sources" aria-labelledby="src-h">
      <div class="wrap">
        <div class="wxp-head"><div><p class="eyebrow mono">// WHERE EVERY NUMBER COMES FROM</p><h2 id="src-h">Sources, licences and labels</h2>
          <p>Every reading on this page wears a label. <b>Measured</b> and <b>observed</b> mean an instrument saw it. <b>Predicted</b>, <b>forecast</b> and <b>computed</b> mean a model or a calculation. When a feed is down or late, the page says so rather than showing old numbers as new.</p></div></div>
        <div class="wxp-chart"><table class="wxp-src">
          <thead><tr><th scope="col">What</th><th scope="col">Label</th><th scope="col">Source</th><th scope="col">How often</th><th scope="col">Licence</th></tr></thead>
          <tbody>
            <tr><td>Forecast (hourly and 10-day), UV if clear</td><td>Forecast</td><td><a href="https://www.met.no/en" rel="noopener">MET Norway</a> Locationforecast for Bournemouth Pier</td><td>About hourly</td><td><a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener">CC BY 4.0</a>. Changes made: grouped into days, rounded, wind in mph, our own symbols</td></tr>
            <tr><td>Wind, temperature and pressure now</td><td>Measured</td><td>Bournemouth Airport (EGHH) reports, via the NOAA Aviation Weather Center</td><td>Every 30 minutes</td><td>Public domain</td></tr>
            <tr><td>Tide times and heights</td><td>Predicted</td><td>365 Techies&rsquo; harmonic prediction fitted to a year of the Environment Agency&rsquo;s Bournemouth pier gauge</td><td>Computed ahead; checked live against the gauge</td><td>Contains Environment Agency data licensed under the Open Government Licence v3.0</td></tr>
            <tr><td>Tide level now</td><td>Measured</td><td>Environment Agency tide gauge on Bournemouth Pier</td><td>Every 15 minutes</td><td>Open Government Licence v3.0</td></tr>
            <tr><td>Sea temperature and waves</td><td>Measured</td><td>Poole Bay wave buoy (Cefas WaveNet)</td><td>Every 30 minutes</td><td>Open Government Licence v3.0</td></tr>
            <tr><td>Rain radar</td><td>Observed</td><td><a href="https://www.eumetnet.eu/" rel="noopener">EUMETNET</a> OPERA rain-rate composite of the European radar networks, including the Met Office&rsquo;s</td><td>Every 15 minutes</td><td>CC BY 4.0</td></tr>
            <tr><td>Satellite loops</td><td>Observed</td><td><a href="https://www.eumetsat.int/" rel="noopener">EUMETSAT</a> Meteosat Third Generation imagery via EUMETView</td><td>Every 10 minutes</td><td>&copy; EUMETSAT, CC BY 4.0</td></tr>
            <tr><td>Daily high-detail satellite picture</td><td>Observed</td><td>NASA Worldview / GIBS, VIIRS true colour</td><td>Once a day</td><td>Public domain, courtesy of NASA</td></tr>
            <tr><td>Weather warnings</td><td>Official</td><td><a href="https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings" rel="noopener">Met Office</a> warnings for South West England, shown exactly as issued</td><td>Checked every 15 minutes</td><td>&copy; Crown copyright, Met Office RSS terms</td></tr>
            <tr><td>Air quality</td><td>Forecast</td><td>Defra UK-AIR Daily Air Quality Index forecast for Bournemouth</td><td>Daily</td><td>&copy; Crown copyright, Open Government Licence v3.0</td></tr>
            <tr><td>Sunrise, sunset, golden hour, moon</td><td>Computed</td><td>Astronomy, calculated in your browser for the pier</td><td>Always current</td><td>&mdash;</td></tr>
            <tr><td>Map coastline</td><td>&mdash;</td><td>&copy; OpenStreetMap contributors, via NASA GIBS</td><td>&mdash;</td><td><a href="https://www.openstreetmap.org/copyright" rel="noopener">ODbL</a></td></tr>
          </tbody></table></div>
      </div>
    </section>
    </div>'''


_WXP_JS = r'''
<script>
(function () {
  var root = document.getElementById('wxp');
  if (!root || !window.fetch) return;
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function lon(iso, o) { o.timeZone = 'Europe/London'; try { return new Date(iso).toLocaleString('en-GB', o); } catch (e) { delete o.timeZone; return new Date(iso).toLocaleString('en-GB', o); } }
  function hhmm(iso) { return lon(iso, { hour: '2-digit', minute: '2-digit', hour12: false }); }
  function ukDate(iso) { return lon(iso, { year: 'numeric', month: '2-digit', day: '2-digit' }); }
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
  function beaufort(m) {
    var lim = [1, 4, 8, 13, 19, 25, 32, 39, 47, 55, 64, 73], names = ['Calm', 'Light air', 'Light breeze', 'Gentle breeze', 'Moderate breeze', 'Fresh breeze', 'Strong breeze', 'Near gale', 'Gale', 'Strong gale', 'Storm', 'Violent storm', 'Hurricane force'];
    for (var i = 0; i < lim.length; i++) if (m < lim[i]) return [i, names[i]];
    return [12, names[12]];
  }
  /* Bournemouth beach faces the sea at about 160 degrees (SSE). Wind FROM the sea = onshore. */
  function shore(dir) {
    if (dir === null || dir === undefined || isNaN(dir)) return null;
    var diff = Math.abs(((dir - 160 + 540) % 360) - 180);
    return diff <= 60 ? 'on' : diff >= 120 ? 'off' : 'cross';
  }
  var SHORE_WORD = { on: 'Onshore', off: 'Offshore', cross: 'Along the shore' };
  function setChip(id, cls, txt) { var e = $(id); if (e) { e.className = cls; e.textContent = txt; } }
  function svgEl(w, h, label, body) { return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label) + '">' + body + '</svg>'; }

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
    return '<g transform="' + (t || '') + '"><g class="wx-rays">' + r + '</g><circle class="wx-core" cx="32" cy="32" r="11.5"/></g>'; }
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
  function arrow(d) { if (d === null || d === undefined || isNaN(d)) return ''; return '<svg class="wxp-arrow" viewBox="0 0 16 16" aria-hidden="true" data-rot="' + ((d + 180) % 360) + '"><path d="M8 1 13 13 8 10 3 13z"/></svg>'; }
  function swingArrows() { requestAnimationFrame(function () { requestAnimationFrame(function () {
    var a = root.querySelectorAll('.wxp-arrow[data-rot]'); for (var i = 0; i < a.length; i++) a[i].style.transform = 'rotate(' + a[i].getAttribute('data-rot') + 'deg)';
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
  function sunDay() {
    /* find today's UK midnight with a few hourly date checks (UK offsets are whole hours), then scan the
       day minute by minute with pure maths - toLocaleString inside the minute loop was ~3,000 slow calls */
    var now = Date.now(), ymd = ukDate(new Date(now).toISOString()), mid = now - (now % 3600000), found = {};
    while (ukDate(new Date(mid - 3600000).toISOString()) === ymd) mid -= 3600000;
    var prev = sunElev(mid - 60000);
    for (var t = mid; t < mid + 24 * 3600000; t += 60000) {
      var e = sunElev(t);
      if (prev < -0.833 && e >= -0.833) found.rise = t;
      if (prev >= -0.833 && e < -0.833) found.set = t;
      if (prev < 6 && e >= 6) found.goldAmEnd = t;
      if (prev >= 6 && e < 6) found.goldPmStart = t;
      if (prev < -6 && e >= -6) found.dawn = t;
      if (prev >= -6 && e < -6) found.dusk = t;
      prev = e;
    }
    return found;
  }
  function moon(ms) {
    var syn = 29.530588853, age = ((ms / 864e5 + 2440587.5 - 2451550.1) / syn) % 1; if (age < 0) age += 1;
    var illum = (1 - Math.cos(2 * Math.PI * age)) / 2;
    var name = age < 0.0339 || age > 0.9661 ? 'New moon' : age < 0.216 ? 'Waxing crescent' : age < 0.284 ? 'First quarter' : age < 0.466 ? 'Waxing gibbous'
      : age < 0.534 ? 'Full moon' : age < 0.716 ? 'Waning gibbous' : age < 0.784 ? 'Last quarter' : 'Waning crescent';
    return { age: age, illum: illum, name: name };
  }

  /* ---------------- blocks ---------------- */
  function renderWarnings(w) {
    var box = $('wxp-warnings');
    if (!w || !w.ok) { box.innerHTML = ''; return; }
    if (!w.items.length) {
      box.innerHTML = '<p class="wxp-ok mono">No Met Office weather warnings for ' + esc(w.region) + ' &middot; checked ' + hhmm(w.checked) + ' &middot; <a href="' + esc(w.source_url) + '" rel="noopener">Met Office warnings</a></p>';
      return;
    }
    /* Met Office RSS terms: shown exactly as issued, linked back */
    box.innerHTML = w.items.map(function (it) {
      return '<div class="wxp-warn" role="alert"><span class="chip-f">OFFICIAL &middot; MET OFFICE WARNING</span><p style="margin:.3rem 0"><a href="' + esc(it.link) + '" rel="noopener"><b>' + esc(it.title) + '</b></a></p><p style="margin:0">' + esc(it.description) + '</p></div>';
    }).join('');
  }

  function renderNow(d) {
    var f = d.forecast, o = d.obs, card = $('wxp-nowcard');
    if (!f || !f.ok) {
      card.innerHTML = '<div></div><div><p class="wxp-sub">The forecast feed isn\u2019t answering, so nothing is shown rather than an old forecast.</p></div>';
    } else {
      var h0 = f.hours[0], t0 = f.days[0], lines = [];
      if (o && o.ok && o.latest && o.latest.temp !== null) {
        lines.push('<b>' + deg(o.latest.temp) + '</b> measured at Bournemouth Airport ' + (o.stale ? '<b>' + ago(o.latest.t) + '</b> (late)' : hhmm(o.latest.t)));
      }
      if (h0.feels !== null && Math.abs(h0.feels - h0.temp) >= 1) lines.push('Feels like <b>' + deg(h0.feels) + '</b>');
      lines.push(h0.rain > 0 ? '<b>' + h0.rain.toFixed(1) + ' mm</b> of rain forecast this hour' : '<b>Dry</b> this hour');
      if (h0.rh !== null) lines.push('Humidity <b>' + h0.rh + '%</b>');
      if (h0.pres !== null) lines.push('Pressure <b>' + h0.pres + ' hPa</b>');
      card.innerHTML = icon(h0.sym) + '<div><span class="chip-f">FORECAST FOR ' + hhmm(h0.t) + ' &middot; MET NORWAY &middot; ISSUED ' + hhmm(f.issued) + (f.stale ? ' &middot; OLDER THAN USUAL' : '') + '</span>'
        + '<p class="wxp-num">' + deg(h0.temp) + '</p><p class="wxp-sub" style="font-size:1.1rem;color:var(--b365-foam)">' + esc(words(h0.sym)) + ' &middot; ' + (t0.part ? 'rest of today' : 'today') + ' up to ' + deg(t0.hi) + ', down to ' + deg(t0.lo) + '</p>'
        + '<p class="wxp-sub">' + lines.join(' &middot; ') + '</p></div>';
    }

    /* wind: measured at the airport */
    var wc = $('wxp-windcard');
    if (o && o.ok && o.latest && o.latest.wspd !== null) {
      var L = o.latest, vrb = (L.wdir === 'VRB' || L.wdir === null), dir = vrb ? null : +L.wdir, sp = ktmph(L.wspd), gs = L.wgst ? ktmph(L.wgst) : null, bf = beaufort(sp), sh = shore(dir);
      var to = dir === null ? 0 : (dir + 180) % 360, streaks = '';
      if (!REDUCE && dir !== null && sp > 2) {
        var dur = Math.max(0.9, 3.2 - sp / 12);
        for (var i = 0; i < 7; i++) streaks += '<i style="top:' + (8 + i * 13) + '%;animation-duration:' + (dur + (i % 3) * 0.35).toFixed(2) + 's;animation-delay:-' + (i * 0.45).toFixed(2) + 's"></i>';
      }
      var ticks = '';
      for (var k = 0; k < 16; k++) ticks += '<line x1="75" y1="10" x2="75" y2="' + (k % 4 ? 15 : 19) + '" stroke="#7f95a8" stroke-width="' + (k % 4 ? 1 : 2) + '" transform="rotate(' + (k * 22.5) + ' 75 75)"/>';
      /* the sea side of the dial (bearings 70..250 through 160) tinted, so on/offshore reads at a glance */
      var seaArc = '<path d="M75 75 L' + (75 + 58 * Math.sin(70 * Math.PI / 180)).toFixed(1) + ' ' + (75 - 58 * Math.cos(70 * Math.PI / 180)).toFixed(1) + ' A58 58 0 0 1 ' + (75 + 58 * Math.sin(250 * Math.PI / 180)).toFixed(1) + ' ' + (75 - 58 * Math.cos(250 * Math.PI / 180)).toFixed(1) + ' Z" fill="rgba(108,196,245,.10)"/>';
      var dial = '<svg viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="62" fill="none" stroke="#1d3346" stroke-width="2"/>' + seaArc + ticks
        + '<text x="75" y="33" text-anchor="middle" font-size="11" fill="#e8f1f2">N</text><text x="122" y="79" text-anchor="middle" font-size="11" fill="#7f95a8">E</text><text x="75" y="126" text-anchor="middle" font-size="11" fill="#7f95a8">S</text><text x="28" y="79" text-anchor="middle" font-size="11" fill="#7f95a8">W</text>'
        + '<text x="104" y="112" text-anchor="middle" font-size="9" fill="#6cc4f5">SEA</text>'
        + (dir === null ? '<text x="75" y="80" text-anchor="middle" font-size="12" fill="#e8f1f2">variable</text>'
          : '<g class="wxp-needle" style="transform:rotate(0deg)" data-rot="' + to + '"><g class="' + (REDUCE ? '' : 'wxp-wobble') + '"><path d="M75 22 L84 70 L75 64 L66 70 Z" fill="#ffd76a"/><path d="M75 128 L80 80 L75 84 L70 80 Z" fill="#7f95a8"/><circle cx="75" cy="75" r="5" fill="#e8f1f2"/></g></g>')
        + '</svg>';
      wc.innerHTML = '<div class="wxp-streaks" aria-hidden="true" style="transform:rotate(' + (to - 90) + 'deg)">' + streaks + '</div>'
        + '<span class="' + (o.stale ? 'chip-f' : 'chip-m') + '">' + (o.stale ? 'LAST HEARD ' + ago(L.t).toUpperCase() : 'MEASURED ' + hhmm(L.t)) + ' &middot; BOURNEMOUTH AIRPORT</span>'
        + '<div class="wxp-windrow" style="position:relative;margin-top:.4rem"><div class="wxp-compass">' + dial + '</div><div>'
        + '<p class="wxp-mid">' + sp + ' <span style="font-size:.55em">mph</span></p>'
        + '<p class="wxp-sub">' + (dir === null ? 'Variable direction' : 'From the <b>' + compass(dir) + '</b> (' + dir + '\u00b0)') + (gs ? ' &middot; gusts <b>' + gs + ' mph</b>' : '') + '</p>'
        + '<p class="wxp-sub">Force ' + bf[0] + ', ' + bf[1].toLowerCase() + '</p>'
        + (sh ? '<p class="wxp-sub"><span class="wxp-shore ' + sh + '">' + SHORE_WORD[sh] + ' on the beach</span></p>' : '')
        + '</div></div><p class="wxp-sub" style="font-size:.82rem">Airport is 7 km inland &mdash; the beach is often windier.</p>';
      var needle = wc.querySelector('.wxp-needle');
      if (needle) requestAnimationFrame(function () { requestAnimationFrame(function () { needle.style.transform = 'rotate(' + needle.getAttribute('data-rot') + 'deg)'; }); });
    } else {
      wc.innerHTML = '<span class="chip-f">WIND &middot; NOT AVAILABLE</span><p class="wxp-sub">The airport\u2019s wind report isn\u2019t coming through right now. The forecast wind is in the wind section below.</p>';
    }
  }

  function renderSea(d) {
    var s = d.sea || {}, sea = s.sea, card = $('wxp-seacard'), grid = $('wxp-seagrid'), tiles = [];
    if (sea && sea.ok) {
      var chip = (sea.stale ? 'LAST HEARD ' + ago(sea.read_at).toUpperCase() : 'MEASURED ' + hhmm(sea.read_at)) + ' &middot; ' + esc(String(sea.station).toUpperCase());
      var spark = '';
      if (sea.series && sea.series.length > 3) {
        var v = sea.series.map(function (p) { return p[1]; }), mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), w = 200, hgt = 34;
        var pts = v.map(function (x, i) { return (i / (v.length - 1) * w).toFixed(1) + ',' + (hgt - 3 - (mx === mn ? 0.5 : (x - mn) / (mx - mn)) * (hgt - 6)).toFixed(1); }).join(' ');
        spark = '<svg width="100%" height="' + hgt + '" viewBox="0 0 ' + w + ' ' + hgt + '" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="#4fd8c4" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';
      }
      card.innerHTML = '<span class="' + (sea.stale ? 'chip-f' : 'chip-m') + '">' + chip + '</span><p class="wxp-mid">' + sea.tempC.toFixed(1) + '\u00b0C</p><p class="wxp-sub">Sea temperature &middot; waves <b>' + sea.hs.toFixed(1) + ' m</b>' + (sea.tp ? ', every <b>' + Math.round(sea.tp) + ' s</b>' : '') + '</p>' + spark + '<p class="wxp-sub" style="font-size:.82rem">Last 24 hours.</p>';
      tiles.push('<div class="wxp-card"><span class="' + (sea.stale ? 'chip-f' : 'chip-m') + '">' + chip + '</span><p class="wxp-mid">' + sea.tempC.toFixed(1) + '\u00b0C</p><p class="wxp-sub">' + (sea.tempC >= 18 ? 'Warm for our coast &mdash; most swimmers are comfortable without a wetsuit.' : sea.tempC >= 15 ? 'Fresh &mdash; a shorty or thin wetsuit helps for longer swims.' : 'Cold &mdash; cold water shock is a real risk; a wetsuit and a short swim.') + '</p></div>');
      tiles.push('<div class="wxp-card"><span class="' + (sea.stale ? 'chip-f' : 'chip-m') + '">' + chip + '</span><p class="wxp-mid">' + sea.hs.toFixed(1) + ' m</p><p class="wxp-sub">Wave height' + (sea.tp ? ', a wave every <b>' + Math.round(sea.tp) + ' s</b>' : '') + '.</p></div>');
    } else {
      card.innerHTML = '<span class="chip-f">SEA TEMPERATURE &middot; NOT AVAILABLE</span><p class="wxp-sub">The wave buoy isn\u2019t reporting right now.</p>';
    }
    var b = s.bathing;
    if (b && b.ok) {
      var parts = []; for (var k in b.classes) parts.push(b.classes[k] + ' ' + k);
      tiles.push('<div class="wxp-card"><span class="chip-f">OFFICIAL &middot; ENVIRONMENT AGENCY</span><p class="wxp-mid">' + b.sites + ' beaches</p><p class="wxp-sub">Bathing water classification: <b>' + esc(parts.join(', ')) + '</b>. ' + (b.warnings ? '<b>' + b.warnings + '</b> with a pollution-risk warning today.' : 'No pollution-risk warnings today.') + '</p></div>');
    }
    var ov = s.overflow;
    if (ov && ov.ok) {
      tiles.push('<div class="wxp-card"><span class="chip-m">MEASURED &middot; WESSEX WATER MONITORS</span><p class="wxp-mid">' + ov.discharging + ' of ' + ov.total + '</p><p class="wxp-sub">Storm overflows on this coast discharging right now' + (ov.offline ? ' (' + ov.offline + ' monitor offline)' : '') + '.</p></div>');
    }
    grid.innerHTML = tiles.join('') || '<p class="wxp-sub">Sea data isn\u2019t available right now.</p>';
  }

  function renderSunAir(d) {
    var sd = sunDay(), m = moon(Date.now()), card = $('wxp-suncard'), f = d.forecast;
    function t(ms) { return ms ? hhmm(new Date(ms).toISOString()) : '&mdash;'; }
    var len = sd.rise && sd.set ? Math.round((sd.set - sd.rise) / 60000) : null, uv = null;
    if (f && f.ok) {
      var today = ukDate(new Date().toISOString());
      f.hours.forEach(function (h) { if (h.uv !== null && ukDate(h.t) === today && (uv === null || h.uv > uv)) uv = h.uv; });
    }
    var uvWord = uv === null ? '' : uv < 3 ? 'low' : uv < 6 ? 'moderate' : uv < 8 ? 'high' : uv < 11 ? 'very high' : 'extreme';
    var shadow = m.age < 0.5 ? (1 - m.age * 2) * 100 : -(m.age - 0.5) * 2 * 100;
    card.innerHTML = '<span class="chip-f">COMPUTED &middot; SUN &amp; MOON AT THE PIER</span>'
      + '<p class="wxp-mid">' + t(sd.rise) + ' &ndash; ' + t(sd.set) + '</p>'
      + '<p class="wxp-sub">Sunrise to sunset' + (len ? ' &middot; <b>' + Math.floor(len / 60) + 'h ' + (len % 60) + 'm</b> of daylight' : '') + '</p>'
      + '<p class="wxp-sub">Golden hour <b>' + t(sd.rise) + '&ndash;' + t(sd.goldAmEnd) + '</b> and <b>' + t(sd.goldPmStart) + '&ndash;' + t(sd.set) + '</b></p>'
      + (uv !== null ? '<p class="wxp-sub">UV up to <b>' + uv.toFixed(0) + '</b> (' + uvWord + ') if the sky is clear <span class="mono" style="font-size:.75rem">FORECAST</span></p>' : '')
      + '<div style="display:flex;gap:.8rem;align-items:center;margin-top:.5rem"><span class="wxp-moon" aria-hidden="true"><i style="transform:translateX(0%)"></i></span><p class="wxp-sub" style="margin:0"><b>' + m.name + '</b> &middot; ' + Math.round(m.illum * 100) + '% lit</p></div>';
    var mi = card.querySelector('.wxp-moon i');
    requestAnimationFrame(function () { requestAnimationFrame(function () { mi.style.transform = 'translateX(' + shadow.toFixed(0) + '%)'; }); });

    var a = d.air, ac = $('wxp-aircard');
    if (a && a.ok) {
      var band = function (i) { return i <= 3 ? ['low', 'Low'] : i <= 6 ? ['mod', 'Moderate'] : i <= 9 ? ['high', 'High'] : ['high', 'Very high']; };
      var first = band(a.days[0].index);
      ac.innerHTML = '<span class="chip-f">FORECAST &middot; AIR QUALITY &middot; DEFRA</span><p class="wxp-mid">' + first[1] + '</p><p class="wxp-sub">Air pollution today, index <b>' + a.days[0].index + '</b> of 10.</p>'
        + '<div class="wxp-daqi">' + a.days.map(function (x) { var bd = band(x.index); return '<span class="' + bd[0] + '">' + x.day + '<b>' + x.index + '</b></span>'; }).join('') + '</div>'
        + '<p class="wxp-sub" style="font-size:.82rem"><a href="' + esc(a.source_url) + '" rel="noopener">What the index means</a></p>';
    } else {
      ac.innerHTML = '<span class="chip-f">AIR QUALITY &middot; NOT AVAILABLE</span><p class="wxp-sub">Defra\u2019s forecast for Bournemouth isn\u2019t available right now.</p>';
    }
  }

  function renderTides(d) {
    var t = d.tide, box = $('wxp-tide-chart');
    if (!t || !t.ok) {
      setChip('wxp-tide-chip', 'chip-f', 'PREDICTED \u00b7 NOT AVAILABLE');
      setChip('wxp-tidenow-chip', 'chip-f', 'TIDE \u00b7 NOT AVAILABLE');
      $('wxp-tide-now').textContent = 'Tide times aren\u2019t available right now.';
      $('wxp-tidecard').innerHTML = '<span class="chip-f">TIDE &middot; NOT AVAILABLE</span><p class="wxp-sub">Tide times aren\u2019t available right now.</p>';
      return;
    }
    setChip('wxp-tide-chip', 'chip-f', 'PREDICTED \u00b7 CHECKED AGAINST THE PIER GAUGE');
    var now = Date.now();
    /* group H,D,H into one double high water */
    var evs = [], e = t.events;
    for (var i = 0; i < e.length; i++) {
      if (e[i].type === 'H' && e[i + 1] && e[i + 1].type === 'D' && e[i + 2] && e[i + 2].type === 'H') { evs.push({ type: 'HH', t: e[i].t, h: e[i].h, t2: e[i + 2].t, h2: e[i + 2].h }); i += 2; }
      else if (e[i].type !== 'D') evs.push(e[i]);
    }
    var next = evs.filter(function (x) { return Date.parse(x.type === 'HH' ? x.t2 : x.t) > now; });
    var nh = next.filter(function (x) { return x.type !== 'L'; })[0], nl = next.filter(function (x) { return x.type === 'L'; })[0];
    function evTxt(x) { return x.type === 'HH' ? hhmm(x.t) + ' &amp; ' + hhmm(x.t2) : hhmm(x.t); }
    /* rise and fall per UK day; under ~0.55 m the tide is nearly flat (a deep neap) and the event times mean little */
    var rangeByDay = {};
    (t.days || []).forEach(function (dd) { rangeByDay[dd.d] = dd; });
    function ymdUK(iso) { var p = ukDate(iso).split('/'); return p[2] + '-' + p[1] + '-' + p[0]; }
    function isFlat(iso) { var r = rangeByDay[ymdUK(iso)]; return r && r.range < 0.55; }
    var rising = null;
    if (t.now.trend) rising = t.now.trend === 'rising';
    var res = t.now.residual_cm, resTxt = '';
    if (typeof res === 'number') resTxt = Math.abs(res) < 6 ? 'The sea is running <b>right on the prediction</b>.' : 'The sea is running <b>' + Math.abs(res) + ' cm ' + (res > 0 ? 'higher' : 'lower') + '</b> than predicted &mdash; weather at work.';
    $('wxp-tide-now').innerHTML = (typeof t.now.measured === 'number' ? '<span class="chip-m">MEASURED ' + hhmm(t.now.measured_at) + ' &middot; PIER GAUGE</span> Now <b>' + t.now.measured.toFixed(2) + ' m</b>' + (rising === null ? '' : ' and <b>' + (rising ? 'rising' : 'falling') + '</b>') + '. ' + resTxt + ' ' : '')
      + [nh, nl].filter(Boolean).sort(function (a2, b2) { return Date.parse(a2.t) - Date.parse(b2.t); }).map(function (x, k) {
          return (k ? 'Then ' : 'Next: ') + (x.type === 'L' ? 'low water' : 'high water') + ' <b>' + evTxt(x) + '</b>' + (x.type === 'HH' ? ' (double high water)' : '') + '.';
        }).join(' ');
    /* the next two tides in time order - "next high" before a sooner "next low" read wrongly */
    var firstTwo = [nh, nl].filter(Boolean).sort(function (a2, b2) { return Date.parse(a2.t) - Date.parse(b2.t); });
    $('wxp-tidecard').innerHTML = '<span class="chip-f">PREDICTED &middot; PIER TIDE</span>'
      + firstTwo.map(function (x) {
          var isHi = x.type !== 'L';
          return '<p class="wxp-lbl" style="margin-top:.5rem">Next ' + (isHi ? 'high' : 'low') + ' water</p><p class="wxp-mid" style="' + (x.type === 'HH' ? 'font-size:clamp(1.3rem,3.4vw,1.8rem)' : '') + '">' + evTxt(x) + '</p>'
            + '<p class="wxp-sub">' + dayLabel(x.t) + ' &middot; ' + x.h.toFixed(1) + ' m' + (x.type === 'HH' ? ' &middot; <b>double high water</b>' : '') + (isFlat(x.t) ? ' &middot; <b>neap: the sea barely moves</b>' : '') + '</p>';
        }).join('')
      + (typeof t.now.measured === 'number' ? '<p class="wxp-sub"><span class="chip-m">MEASURED ' + hhmm(t.now.measured_at) + '</span> ' + t.now.measured.toFixed(2) + ' m' + (rising === null ? '' : ', ' + (rising ? 'rising' : 'falling')) + '</p>' : '');

    /* chart */
    var W = Math.max(340, box.clientWidth || 340), H = 250, pl = 38, pr = 12, pt = 30, pb = 40;
    var curve = t.curve.map(function (p) { return [Date.parse(p[0]), p[1]]; });
    var t0 = curve[0][0], t1 = curve[curve.length - 1][0], lo = Infinity, hi = -Infinity;
    curve.forEach(function (p) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); });
    lo = Math.floor(lo - 0.2); hi = Math.ceil(hi + 0.3);
    function X(ms) { return pl + (ms - t0) / (t1 - t0) * (W - pl - pr); }
    function Y(h) { return pt + (hi - h) / (hi - lo) * (H - pt - pb); }
    var g = '<defs><linearGradient id="wxp-tide-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#79b8ff" stop-opacity=".35"/><stop offset="1" stop-color="#79b8ff" stop-opacity="0"/></linearGradient></defs>';
    for (var y = lo; y <= hi; y++) g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(y).toFixed(1) + '" y2="' + Y(y).toFixed(1) + '" stroke="#1d3346"/><text x="' + (pl - 6) + '" y="' + (Y(y) + 4).toFixed(1) + '" text-anchor="end">' + y + 'm</text>';
    /* midnight separators, UK days */
    for (var ms = t0; ms <= t1; ms += 1800000) {
      if (hhmm(new Date(ms).toISOString()) === '00:00') g += '<line x1="' + X(ms).toFixed(1) + '" x2="' + X(ms).toFixed(1) + '" y1="' + pt + '" y2="' + (H - pb) + '" stroke="#1d3346" stroke-dasharray="3 4"/><text x="' + (X(ms) + 5).toFixed(1) + '" y="' + (H - 8) + '">' + esc(lon(new Date(ms).toISOString(), { weekday: 'short', day: 'numeric' })) + '</text>';
    }
    var line = curve.map(function (p, k) { return (k ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ');
    g += '<path class="wxp-fadein" d="' + line + ' L' + X(t1).toFixed(1) + ' ' + (H - pb) + ' L' + X(t0).toFixed(1) + ' ' + (H - pb) + ' Z" fill="url(#wxp-tide-g)"/>';
    g += '<path class="wxp-draw" d="' + line + '" pathLength="1" stroke="#79b8ff" stroke-width="2.4"/>';
    if (t.measured && t.measured.length) {
      var ml = t.measured.map(function (p) { return [Date.parse(p[0]), p[1]]; }).filter(function (p) { return p[0] >= t0 && p[0] <= t1; });
      if (ml.length > 1) g += '<path class="wxp-fadein" d="' + ml.map(function (p, k) { return (k ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ') + '" fill="none" stroke="#4fd8c4" stroke-width="2.4"/>';
    }
    t.events.forEach(function (x, k) {
      var ms2 = Date.parse(x.t); if (ms2 < t0 || ms2 > t1) return;
      var cx = X(ms2), cy = Y(x.h), up = x.type !== 'L';
      if (x.type === 'D') { g += '<circle class="wxp-pop" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="2.5" fill="#79b8ff" style="animation-delay:' + (0.6 + k * 0.04).toFixed(2) + 's"/>'; return; }
      g += '<circle class="wxp-pop" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4" fill="' + (up ? '#79b8ff' : '#9fb4c5') + '" stroke="#10202f" stroke-width="2" style="animation-delay:' + (0.6 + k * 0.04).toFixed(2) + 's"/>'
        + '<text class="t-strong" x="' + cx.toFixed(1) + '" y="' + (up ? cy - 10 : cy + 18).toFixed(1) + '" text-anchor="middle">' + hhmm(x.t) + '</text>';
    });
    var nx = X(now);
    g += '<line x1="' + nx.toFixed(1) + '" x2="' + nx.toFixed(1) + '" y1="' + (pt - 12) + '" y2="' + (H - pb) + '" stroke="#ffd76a" stroke-width="1.5"/><text x="' + nx.toFixed(1) + '" y="' + (pt - 16) + '" text-anchor="middle" fill="#ffd76a">Now</text>';
    box.innerHTML = svgEl(W, H, 'Tide at Bournemouth Pier: predicted curve for the past 12 hours and next 60, with the measured level', g);

    /* table: next 7 days */
    var byDay = {}, order = [];
    evs.forEach(function (x) {
      var end = Date.parse(x.type === 'HH' ? x.t2 : x.t); if (end < now - 3 * 3600000) return;
      var key = ukDate(x.t); if (!byDay[key]) { byDay[key] = { label: dayLabel(x.t), items: [] }; order.push(key); } byDay[key].items.push(x);
    });
    $('wxp-tide-table').innerHTML = order.slice(0, 7).map(function (key) {
      var day = byDay[key], rg = rangeByDay[ymdUK(day.items[0].t)], flat = rg && rg.range < 0.55;
      return '<li' + (flat ? ' style="border-color:rgba(255,215,106,.45)"' : '') + '><h3>' + day.label
        + (rg ? '<br><span class="wxp-sub" style="font-size:.8rem;font-weight:400">Rise &amp; fall ' + rg.range.toFixed(1) + ' m</span>' : '') + '</h3><div class="wxp-evs">'
        + (flat ? '<span class="wxp-sub" style="flex-basis:100%;margin:0 0 .2rem">Neap tide: the sea only moves between ' + rg.lo.toFixed(1) + ' and ' + rg.hi.toFixed(1) + ' m today, so exact high and low times mean little &mdash; the curve above is the better guide.</span>' : '')
        + day.items.map(function (x) {
        if (x.type === 'HH') return '<span class="wxp-ev hi">High <b>' + hhmm(x.t) + '</b> ' + x.h.toFixed(1) + 'm &amp; <b>' + hhmm(x.t2) + '</b> ' + x.h2.toFixed(1) + 'm <small>double high water</small></span>';
        return '<span class="wxp-ev ' + (x.type === 'H' ? 'hi' : 'lo') + '">' + (x.type === 'H' ? 'High' : 'Low') + ' <b>' + hhmm(x.t) + '</b> ' + x.h.toFixed(1) + 'm</span>';
      }).join('') + '</div></li>';
    }).join('');
    var a = t.accuracy;
    if (a && a.hw_time_median_min !== null) {
      $('wxp-tide-acc').innerHTML = '<b>How good is it?</b> We fitted the prediction without the ' + esc(lon(a.from, { day: 'numeric', month: 'long' })) + '&ndash;' + esc(lon(a.to, { day: 'numeric', month: 'long' })) + ' readings, then compared it with what the gauge measured over those days: high and low water times were typically within <b>' + a.hw_time_median_min + ' minutes</b>, and heights within <b>' + Math.round(a.hw_height_median_cm) + ' cm</b> (' + a.events_compared + ' tides compared). The rest is weather &mdash; which is why the gauge is drawn live on the chart. ' + esc(t.method);
    }
  }

  function renderWind(d) {
    var f = d.forecast, box = $('wxp-wind-chart');
    if (!f || !f.ok) { box.innerHTML = '<p class="wxp-sub">The wind forecast isn\u2019t available right now.</p>'; return; }
    var hs = f.hours, n = hs.length, W = Math.max(340, box.clientWidth || 340), col = Math.max(26, (W - 44) / n); W = Math.round(44 + col * n);
    var H = 200, pt = 34, pb = 44, max = 10;
    hs.forEach(function (h) { max = Math.max(max, mph(h.wind)); });
    max = Math.ceil((max + 3) / 5) * 5;
    function X(i) { return 38 + col / 2 + i * col; }
    function Y(v) { return pt + (max - v) / max * (H - pt - pb); }
    var g = '';
    for (var v = 0; v <= max; v += (max > 30 ? 10 : 5)) g += '<line x1="38" x2="' + W + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="#1d3346"/><text x="32" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + v + '</text>';
    var line = hs.map(function (h, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(mph(h.wind)).toFixed(1); }).join(' ');
    g += '<path class="wxp-fadein" d="' + line + ' L' + X(n - 1).toFixed(1) + ' ' + (H - pb) + ' L' + X(0).toFixed(1) + ' ' + (H - pb) + ' Z" fill="rgba(255,179,71,.14)"/>';
    g += '<path class="wxp-draw" d="' + line + '" pathLength="1" stroke="#ffb347" stroke-width="2.4"/>';
    hs.forEach(function (h, i) {
      var sh = shore(h.dir), c = sh === 'off' ? '#ff9f5a' : sh === 'on' ? '#7fd8a8' : '#79b8ff';
      g += '<circle class="wxp-pop" cx="' + X(i).toFixed(1) + '" cy="' + (H - pb + 10) + '" r="3.2" fill="' + c + '" style="animation-delay:' + (0.3 + i * 0.02).toFixed(2) + 's"><title>' + (sh ? SHORE_WORD[sh] : '') + '</title></circle>';
      if (i % 3 === 0) {
        var to = ((h.dir || 0) + 180) % 360;
        g += '<g transform="translate(' + X(i).toFixed(1) + ' 16)"><g class="wxp-pop" style="animation-delay:' + (0.4 + i * 0.02).toFixed(2) + 's"><path d="M0 -8 L5 6 L0 3 L-5 6 Z" fill="#e8f1f2" transform="rotate(' + to + ')"/></g></g>'
          + '<text class="t-strong" x="' + X(i).toFixed(1) + '" y="' + (Y(mph(h.wind)) - 8).toFixed(1) + '" text-anchor="middle">' + mph(h.wind) + '</text>'
          + '<text x="' + X(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + (i === 0 ? 'Now' : hhmm(h.t)) + '</text>';
      }
    });
    box.innerHTML = svgEl(W, H, 'Forecast wind at Bournemouth Pier for the next 48 hours, in miles per hour, with direction arrows', g);
  }

  function renderHourly(d) {
    var f = d.forecast, box = $('wxp-hourly-chart');
    if (!f || !f.ok) { box.innerHTML = '<p class="wxp-sub">The hourly forecast isn\u2019t available right now.</p>'; return; }
    var hs = f.hours, n = hs.length, W0 = Math.max(340, box.clientWidth || 340), col = Math.max(26, (W0 - 10) / n), W = Math.round(10 + col * n), H = 262;
    var tmin = Infinity, tmax = -Infinity, rsum = 0;
    hs.forEach(function (h) { tmin = Math.min(tmin, h.temp); tmax = Math.max(tmax, h.temp); rsum += h.rain; });
    var lo = Math.floor(tmin) - 1, hi = Math.ceil(tmax) + 1;
    function X(i) { return 5 + col / 2 + i * col; }
    function Y(t) { return 70 + (hi - t) / (hi - lo) * 70; }
    var line = 'M' + X(0) + ' ' + Y(hs[0].temp).toFixed(1);
    for (var i = 1; i < n; i++) line += ' C' + (X(i - 1) + col / 2).toFixed(1) + ' ' + Y(hs[i - 1].temp).toFixed(1) + ' ' + (X(i) - col / 2).toFixed(1) + ' ' + Y(hs[i].temp).toFixed(1) + ' ' + X(i).toFixed(1) + ' ' + Y(hs[i].temp).toFixed(1);
    var g = '<path class="wxp-fadein" d="' + line + ' L' + X(n - 1).toFixed(1) + ' 160 L' + X(0) + ' 160 Z" fill="rgba(255,179,71,.16)"/><path class="wxp-draw" d="' + line + '" pathLength="1" stroke="#ffb347" stroke-width="2.6"/>';
    function uvCol(u) { return u < 3 ? '#7fd8a8' : u < 6 ? '#ffd84d' : u < 8 ? '#ff9f5a' : '#ff5a5a'; }
    hs.forEach(function (h, k) {
      var x = X(k), dl = (0.15 + 1.4 * k / n).toFixed(2);
      if (hhmm(h.t) === '00:00' && k) g += '<line x1="' + (x - col / 2).toFixed(1) + '" x2="' + (x - col / 2).toFixed(1) + '" y1="36" y2="240" stroke="#1d3346" stroke-dasharray="3 4"/><text x="' + (x - col / 2 + 4).toFixed(1) + '" y="48">' + esc(lon(h.t, { weekday: 'short' })) + '</text>';
      if (h.rain > 0) { var bh = Math.max(2, Math.min(h.rain, 4) / 4 * 28); g += '<rect class="wxp-bar" x="' + (x - col * 0.32).toFixed(1) + '" y="' + (190 - bh).toFixed(1) + '" width="' + (col * 0.64).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" fill="#6cc4f5" style="animation-delay:' + dl + 's"><title>' + h.rain.toFixed(1) + ' mm</title></rect>'; }
      if (h.cloud !== null) g += '<rect x="' + (x - col / 2).toFixed(1) + '" y="198" width="' + col.toFixed(1) + '" height="9" fill="#e4eef5" opacity="' + (h.cloud / 100 * 0.55).toFixed(2) + '"><title>Cloud ' + h.cloud + '%</title></rect>';
      if (h.uv !== null) g += '<rect x="' + (x - col / 2 + 1).toFixed(1) + '" y="211" width="' + (col - 2).toFixed(1) + '" height="7" rx="2" fill="' + uvCol(h.uv) + '" opacity="' + (h.uv < 0.5 ? 0.12 : 0.85) + '"><title>UV ' + h.uv.toFixed(1) + ' if clear</title></rect>';
      if (k % 3 === 0) {
        g += icon(h.sym, '', 'x="' + (x - 14).toFixed(1) + '" y="4" width="28" height="28"')
          + '<text class="t-strong" x="' + x.toFixed(1) + '" y="' + (Y(h.temp) - 9).toFixed(1) + '" text-anchor="middle">' + deg(h.temp) + '</text>'
          + '<text x="' + x.toFixed(1) + '" y="236" text-anchor="middle">' + hhmm(h.t) + '</text>';
      }
    });
    g += '<line x1="0" x2="' + W + '" y1="190.5" y2="190.5" stroke="#1d3346"/>';
    box.innerHTML = svgEl(W, H, 'Next 48 hours: ' + deg(tmin) + ' to ' + deg(tmax) + ', ' + (rsum > 0 ? rsum.toFixed(1) + ' mm of rain forecast' : 'no rain forecast'), g);
  }

  function renderDays(d) {
    var f = d.forecast, box = $('wxp-days');
    if (!f || !f.ok) { box.innerHTML = '<li class="wxp-sub">The 10-day forecast isn\u2019t available right now.</li>'; return; }
    var gmin = Infinity, gmax = -Infinity;
    f.days.forEach(function (x) { gmin = Math.min(gmin, x.lo); gmax = Math.max(gmax, x.hi); });
    var span = Math.max(1, gmax - gmin);
    box.innerHTML = f.days.map(function (x, k) {
      var p = x.d.split('-'), dt = new Date(+p[0], +p[1] - 1, +p[2]);
      var label = k === 0 ? (x.part ? 'Rest of today' : 'Today') : k === 1 ? 'Tomorrow' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()] + ' ' + dt.getDate();
      var sh = shore(x.dir);
      return '<li class="wxp-day" style="animation-delay:' + (0.07 * k).toFixed(2) + 's"><h3>' + label + '</h3>' + icon(x.sym) + '<span class="wxp-sub" style="margin:0;min-height:2.4em">' + esc(words(x.sym)) + '</span>'
        + '<span class="wxp-hl"><b>' + deg(x.hi) + '</b><span>' + deg(x.lo) + '</span></span>'
        + '<span class="wxp-range" aria-hidden="true"><i style="left:' + ((x.lo - gmin) / span * 100).toFixed(1) + '%;width:' + Math.max(4, (x.hi - x.lo) / span * 100).toFixed(1) + '%;animation-delay:' + (0.3 + 0.07 * k).toFixed(2) + 's"></i></span>'
        + '<span class="wxp-meta"><span>' + (x.rain >= 0.1 ? x.rain.toFixed(1) + ' mm rain' : 'Dry') + '</span><span>' + arrow(x.dir) + mph(x.wind) + ' mph ' + compass(x.dir) + '</span>' + (sh === 'off' ? '<span class="wxp-shore off" style="font-size:.72rem">offshore</span>' : '') + '</span></li>';
    }).join('');
    swingArrows();
  }

  /* ---------------- image loops (radar + satellite) ---------------- */
  function Player(mapId, ctlId, frames, labelFn) {
    var map = $(mapId), ctl = $(ctlId), imgs = [], i = frames.length - 1, timer = null, playing = !REDUCE, visible = false;
    var btn = ctl.querySelector('.wxp-play'), range = ctl.querySelector('input'), label = ctl.querySelector('.wxp-time');
    frames.forEach(function (fr) {
      var im = document.createElement('img'); im.alt = ''; im.width = 960; im.height = 850; im.decoding = 'async'; im.className = fr.cls || 'frame'; im.style.zIndex = 2;
      im.setAttribute('data-src', fr.url); map.insertBefore(im, map.querySelector('.lines')); imgs.push(im);
    });
    range.max = String(frames.length - 1); range.value = String(i); ctl.hidden = false;
    function show(k) {
      i = k; for (var j = 0; j < imgs.length; j++) imgs[j].classList.toggle('on', j === k);
      range.value = String(k); label.textContent = labelFn(frames[k], k, frames.length);
    }
    function load() { imgs.forEach(function (im) { if (!im.src) im.src = im.getAttribute('data-src'); }); }
    function tick() {
      if (!playing || !visible) return;
      var nextI = (i + 1) % frames.length;
      show(nextI);
      timer = setTimeout(tick, nextI === frames.length - 1 ? 1800 : 650);
    }
    function setPlaying(p) {
      playing = p; btn.textContent = p ? 'Pause' : 'Play'; btn.setAttribute('aria-label', (p ? 'Pause' : 'Play') + ' the loop'); btn.setAttribute('aria-pressed', p ? 'false' : 'true');
      clearTimeout(timer); if (p) timer = setTimeout(tick, 650);
    }
    function onBtn() { setPlaying(!playing); }
    function onRange() { setPlaying(false); show(+range.value); }
    btn.addEventListener('click', onBtn);
    range.addEventListener('input', onRange);
    show(i);
    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) { es.forEach(function (e) {
        if (e.isIntersecting) { load(); visible = true; if (playing) { clearTimeout(timer); timer = setTimeout(tick, 900); } } else { visible = false; clearTimeout(timer); }
      }); }, { rootMargin: '500px 0px' });
      io.observe(map);
    } else { load(); visible = true; if (playing) timer = setTimeout(tick, 900); }
    setPlaying(playing);
    /* switching satellite views builds a new player on the same controls: remove this one's listeners,
       observer and frames first, or every switch would stack another play/pause handler */
    return { destroy: function () {
      clearTimeout(timer); playing = false;
      btn.removeEventListener('click', onBtn); range.removeEventListener('input', onRange);
      if (io) io.disconnect();
      imgs.forEach(function (im) { im.remove(); }); ctl.hidden = true;
    } };
  }
  function lazyStatic(mapId) {
    var map = $(mapId), st = map.querySelectorAll('img[data-src].base, img[data-src].lines');
    function go() { for (var k = 0; k < st.length; k++) st[k].src = st[k].getAttribute('data-src'); }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es, ob) { if (es[0].isIntersecting) { go(); ob.disconnect(); } }, { rootMargin: '600px 0px' }).observe(map); else go();
  }

  function renderRadar(d) {
    var r = d.radar; lazyStatic('wxp-radar-map');
    if (!r || !r.ok || !r.frames.length) { setChip('wxp-radar-chip', 'chip-f', 'RADAR \u00b7 NOT AVAILABLE YET'); $('wxp-radar-note').textContent = 'Radar pictures are being gathered - the first loop appears within about 15 minutes of this page going live.'; return; }
    var last = r.frames[r.frames.length - 1];
    setChip('wxp-radar-chip', r.stale ? 'chip-f' : 'chip-m', (r.stale ? 'LAST RADAR ' + ago(last.t).toUpperCase() : 'OBSERVED ' + hhmm(last.t)) + ' \u00b7 EUMETNET RADAR');
    Player('wxp-radar-map', 'wxp-radar-ctl', r.frames.map(function (f) { return { url: f.url, t: f.t, cls: 'radar' }; }), function (fr, k, nn) { return lon(fr.t, { weekday: 'short' }) + ' ' + hhmm(fr.t) + ' \u00b7 ' + (k + 1) + '/' + nn; });
    var notes = [];
    notes.push(last.home_mmh === null ? '' : last.home_mmh >= 0.1 ? 'Rain at the pier in the latest picture: about ' + last.home_mmh.toFixed(1) + ' mm/h.' : 'No rain showing at the pier in the latest picture (' + hhmm(last.t) + ').');
    if (!last.local_ok) notes.push('The radars that cover Bournemouth are missing from this picture, so a dry-looking area near us may not be dry.');
    notes.push('Radar pictures reach us 10 to 25 minutes after they are taken. Radar: EUMETNET OPERA, CC BY 4.0. Map: \u00a9 OpenStreetMap contributors, via NASA GIBS.');
    $('wxp-radar-note').textContent = notes.filter(Boolean).join(' ');
  }

  function renderSat(d) {
    var s = d.sat, tabs = $('wxp-sat-tabs'), cur = null, map = $('wxp-sat-map');
    lazyStatic('wxp-sat-map');
    if (!s) { setChip('wxp-sat-chip', 'chip-f', 'SATELLITE \u00b7 NOT AVAILABLE YET'); return; }
    var views = [];
    ['geo', 'vis'].forEach(function (k) { var p = s.products[k]; if (p && p.frames.length) views.push({ key: k, label: k === 'geo' ? 'Colour loop' : 'Sharp daylight loop', frames: p.frames }); });
    if (s.nasa) views.push({ key: 'nasa', label: 'NASA today', nasa: s.nasa });
    if (!views.length) { setChip('wxp-sat-chip', 'chip-f', 'SATELLITE \u00b7 NOT AVAILABLE YET'); $('wxp-sat-note').textContent = 'Satellite pictures are being gathered - the first loop appears within about 15 minutes of this page going live.'; return; }
    function choose(v) {
      if (cur) cur.destroy(); cur = null;
      [].forEach.call(tabs.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-k') === v.key ? 'true' : 'false'); });
      var fig = $('wxp-nasa');
      if (v.key === 'nasa') {
        map.hidden = true; fig.hidden = false; $('wxp-sat-ctl').hidden = true;
        var im = fig.querySelector('img'); if (!im.src) im.src = v.nasa.url;
        setChip('wxp-sat-chip', 'chip-m', 'OBSERVED \u00b7 NASA ' + v.nasa.satellite.toUpperCase() + ' \u00b7 ' + lon(v.nasa.day + 'T12:00:00Z', { day: 'numeric', month: 'short' }).toUpperCase());
        $('wxp-nasa-cap').textContent = 'Portland Bill to the Isle of Wight from the VIIRS instrument on ' + v.nasa.satellite + ', ' + lon(v.nasa.day + 'T12:00:00Z', { weekday: 'long', day: 'numeric', month: 'long' }) + ' (the early-afternoon pass). About 375 m per pixel. Image: NASA Worldview / GIBS, public domain.';
        $('wxp-sat-note').textContent = '';
        return;
      }
      map.hidden = false; fig.hidden = true;
      var lastF = v.frames[v.frames.length - 1], old = Date.now() - Date.parse(lastF.t) > 3 * 3600000;
      setChip('wxp-sat-chip', old ? 'chip-f' : 'chip-m', (old ? 'LAST PICTURE ' + ago(lastF.t).toUpperCase() : 'OBSERVED ' + hhmm(lastF.t)) + ' \u00b7 METEOSAT');
      cur = Player('wxp-sat-map', 'wxp-sat-ctl', v.frames.map(function (f) { return { url: f.url, t: f.t }; }), function (fr, k, nn) { return lon(fr.t, { weekday: 'short' }) + ' ' + hhmm(fr.t) + ' \u00b7 ' + (k + 1) + '/' + nn; });
      $('wxp-sat-note').textContent = (v.key === 'vis' ? 'The sharp view uses visible light, so it only has pictures in daylight' + (old ? ' - this is the last daylight loop.' : '.') + ' ' : 'Colour by day; after dark the cloud is from infrared over a fixed night-lights background, not tonight\u2019s lights. ')
        + 'Images \u00a9 EUMETSAT ' + new Date().getFullYear() + ', Meteosat Third Generation via EUMETView, CC BY 4.0. Coastline \u00a9 OpenStreetMap contributors.';
    }
    tabs.innerHTML = views.map(function (v) { return '<button type="button" class="wxp-ctl-tab" data-k="' + v.key + '" aria-pressed="false" style="min-height:44px;border-radius:999px;border:1px solid var(--b365-line);background:var(--b365-water);color:var(--b365-foam);padding:0 1rem;cursor:pointer;font:inherit">' + v.label + '</button>'; }).join('');
    [].forEach.call(tabs.querySelectorAll('button'), function (b) { b.addEventListener('click', function () { views.forEach(function (v) { if (v.key === b.getAttribute('data-k')) choose(v); }); }); });
    choose(views[0]);
  }

  /* ---------------- boot ---------------- */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { root.classList.toggle('wx-off', !e.isIntersecting); }); }).observe(root);
  }
  var last = null;
  function renderAll(d) {
    last = d;
    [renderWarnings.bind(null, d.warnings), renderNow.bind(null, d), renderSea.bind(null, d), renderSunAir.bind(null, d), renderTides.bind(null, d), renderWind.bind(null, d), renderHourly.bind(null, d), renderDays.bind(null, d)]
      .forEach(function (fn) { try { fn(); } catch (err) { if (window.console) console.error('weather block failed', err); } });
  }
  fetch('/api/bm-wx.php', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) {
    renderAll(d);
    try { renderRadar(d); } catch (err) { if (window.console) console.error(err); }
    try { renderSat(d); } catch (err) { if (window.console) console.error(err); }
  }).catch(function () {
    $('wxp-nowcard').innerHTML = '<div></div><div><p class="wxp-sub">The weather feeds aren\u2019t answering right now, so nothing is shown rather than old numbers. Try again in a few minutes.</p></div>';
  });
  /* charts are sized to their box: redraw on a real width change (not on mobile toolbar scroll) */
  var lastW = window.innerWidth, rt = null;
  window.addEventListener('resize', function () {
    if (!last || Math.abs(window.innerWidth - lastW) < 40) return; lastW = window.innerWidth;
    clearTimeout(rt); rt = setTimeout(function () { try { renderTides(last); renderWind(last); renderHourly(last); } catch (e) {} }, 250);
  });
})();
</script>'''


_WXP_CONTENT = "\n".join([
    hero(bc_sub("Bournemouth365", "/bournemouth/", "Weather, Tides &amp; Sea"),
         "// BOURNEMOUTH365",
         'Bournemouth weather, <em class="grad grad--cyan">tides &amp; the sea</em>',
         "The seafront&rsquo;s forecast hour by hour and ten days ahead, tide times checked against the gauge on the pier, rain radar and satellite loops every 15 minutes, the wind measured and forecast, and the sea temperature from the buoy in the bay &mdash; every number labelled with where it came from.",
         cta1=("Tide times", "#tides"),
         cta2=("Rain radar", "#radar"),
         chips=["Measured, predicted or forecast &mdash; always labelled", "Radar &amp; satellite every 15 minutes", "No ads, ever"]),
    _WXP_CSS,
    _WXP_HTML,
    faq_html(_WXP_FAQS),
    _WXP_JS,
])


def register(b365_band):
    add(
        slug=_WXP_SLUG,
        title="Bournemouth Weather, Tides, Radar & Sea Temperature",
        desc="Bournemouth seafront weather: 10-day forecast, tide times checked against the pier gauge, live rain radar and satellite, wind and the sea temperature.",
        og_title="Bournemouth seafront weather: tides, radar, satellite and the sea",
        schema=_wxp_schema,
        content=_WXP_CONTENT + "\n" + b365_band,
        og_image="/bournemouth/media/og-weather.jpg",
    )
