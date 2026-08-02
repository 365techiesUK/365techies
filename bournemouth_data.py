# -*- coding: utf-8 -*-
"""Bournemouth365 section — page 1: the Friday Fireworks.

The first page of the /bournemouth/ content section (founding document:
C:/claude/seo-research/bournemouth365-section-2026-08-02.md). Five pages were
picked by SERP evidence; this one shipped first because the season is LIVE and
ends 28 August — every Friday missed is a quarter of its first season gone.

FACTS AND WHERE THEY CAME FROM (all verified 2026-08-02, do not "improve"):
  - Six Fridays: 24 & 31 July, 7, 14, 21, 28 August 2026, 10pm, free, fired
    from the seafront just EAST of Bournemouth Pier. Source: bournemouth.co.uk
    /event/bournemouth-friday-fireworks (organiser: BCP Council Events Team),
    cross-checked against Visit Dorset, letsgoout and Resort Dorset.
  - Cancellations are announced on bournemouth.co.uk and the official "Love
    Bournemouth" social channels. We NEVER claim live cancellation status -
    the page says "scheduled" and points at the official channels.
  - The Air Festival: no 2025 event, no 2026 event, no confirmed return.
    One factual paragraph absorbs that query confusion; no more.
  - Display DURATION is not published anywhere official - so the page does not
    state one, and the Event schema deliberately has no endDate.

HONESTY RULES SPECIFIC TO THIS PAGE:
  - The "is it on tonight?" panel is date arithmetic on the published schedule,
    computed client-side. It answers "is tonight a fireworks Friday", never
    "has tonight's display been confirmed" - weather cancellation is a thing
    only the official channels can answer, and the panel says so.
  - Sunset times are COMPUTED (NOAA solar position, +/- 2 min) and labelled
    with an approx sign. They are the only computed numbers on the page.
  - No fireworks photos yet: the real ones arrive with the Facebook export.
    Until then the page ships without - never stock, never AI.

SEASON ROLLOVER (owner job, ~March 2027): BCP announces next season's dates in
spring. Update FRIDAYS below and the two prose mentions of "2026"; the panel,
table, schema and season-over state all follow the list automatically. If the
event is not renewed, the panel's season-over text already says "expected" -
soften the page rather than deleting it (the Air Festival precedent).
"""
import math
import datetime as _dt

from build_pages import add, graph, crumb, webpage, faqpage, faq_html, hero, bc, SITE

# The published 2026 season. (date, "Friday N Month" label)
FRIDAYS = [
    ("2026-07-24", "Friday 24 July"),
    ("2026-07-31", "Friday 31 July"),
    ("2026-08-07", "Friday 7 August"),
    ("2026-08-14", "Friday 14 August"),
    ("2026-08-21", "Friday 21 August"),
    ("2026-08-28", "Friday 28 August"),
]

_LAT, _LON = 50.7166, -1.8757   # Bournemouth Pier root, per the game's coast research


def _sunset_bst(iso):
    """Sunset (BST) for a date at the pier, NOAA simplified algorithm, +/-2 min.

    Every season date is deep inside British Summer Time, so UTC+1 is hardcoded
    rather than dragging in a timezone database for six evenings in August.
    """
    d = _dt.date.fromisoformat(iso)
    n = d.timetuple().tm_yday
    lng_hour = _LON / 15.0
    t = n + ((18 - lng_hour) / 24.0)          # approximate sunset in solar time
    m = (0.9856 * t) - 3.289                  # sun's mean anomaly
    l = m + (1.916 * math.sin(math.radians(m))) + (0.020 * math.sin(math.radians(2 * m))) + 282.634
    l %= 360.0
    ra = math.degrees(math.atan(0.91764 * math.tan(math.radians(l)))) % 360.0
    ra += (math.floor(l / 90.0) * 90.0) - (math.floor(ra / 90.0) * 90.0)   # same quadrant as L
    ra /= 15.0
    sin_dec = 0.39782 * math.sin(math.radians(l))
    cos_dec = math.cos(math.asin(sin_dec))
    cos_h = (math.cos(math.radians(90.833)) - (sin_dec * math.sin(math.radians(_LAT)))) / (cos_dec * math.cos(math.radians(_LAT)))
    h = math.degrees(math.acos(cos_h)) / 15.0
    ut = (h + ra - (0.06571 * t) - 6.622 - lng_hour) % 24.0
    bst = (ut + 1.0) % 24.0
    hh = int(bst)
    mm = int(round((bst - hh) * 60))
    if mm == 60:
        hh, mm = hh + 1, 0
    return "%d:%02d pm" % (hh - 12 if hh > 12 else hh, mm)


_SLUG = "bournemouth/fireworks"
_URL = SITE + "/" + _SLUG + "/"

# ---- the "is it on tonight?" panel (client-side date arithmetic only) --------
_JS_DATES = ",".join('["%s","%s"]' % (d, lbl) for d, lbl in FRIDAYS)

_STATUS = f'''    <section class="section" id="tonight" aria-label="Next fireworks display">
      <div class="wrap">
        <div class="tile-grid" data-stagger style="grid-template-columns:1fr">
          <div class="tile" id="bmfw-tile">
            <h3 id="bmfw-head">Fireworks every Friday at 10pm until 28 August 2026</h3>
            <p id="bmfw-sub">Free, from the seafront just east of Bournemouth Pier. This panel needs JavaScript to count down to the next display &mdash; the full date list is just below.</p>
          </div>
        </div>
        <p class="mono" style="margin-top:.8rem" data-reveal>Displays are weather-dependent. Cancellations are announced by the organisers on <a href="https://www.bournemouth.co.uk/event/bournemouth-friday-fireworks" target="_blank" rel="noopener">bournemouth.co.uk</a> and the official Love Bournemouth social channels &mdash; if the wind is up, check there before you set off.</p>
      </div>
      <script>
      (function () {{
        var F = [{_JS_DATES}];
        // This script sits ABOVE the dates table in the DOM, so it must wait
        // for the document - striking the past rows needs them to exist.
        function run() {{
        var head = document.getElementById('bmfw-head'), sub = document.getElementById('bmfw-sub');
        if (!head || !sub) return;
        var now = new Date();
        var next = null;
        for (var i = 0; i < F.length; i++) {{
          var p = F[i][0].split('-');
          // a display "ends" at 22:15 local; after that, point at the next one
          var end = new Date(+p[0], +p[1] - 1, +p[2], 22, 15);
          if (now < end) {{ next = {{ label: F[i][1], date: new Date(+p[0], +p[1] - 1, +p[2]) }}; break; }}
          // strike finished dates in the table as we pass them
          var row = document.querySelector('[data-fw="' + F[i][0] + '"]');
          if (row) row.classList.add('bm-past');
        }}
        if (!next) {{
          head.textContent = 'That was the last one \\u2014 the 2026 season has finished';
          sub.textContent = 'The final display was Friday 28 August. The Friday Fireworks are expected back in July 2027 \\u2014 dates are announced by BCP Council in spring, and this page will be updated when they are.';
          return;
        }}
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var days = Math.round((next.date - today) / 86400000);
        if (days === 0) {{
          head.textContent = 'Yes \\u2014 fireworks TONIGHT at 10pm';
          sub.textContent = 'Fired from the seafront just east of Bournemouth Pier, weather permitting \\u2014 if it is blowing a gale, check the official channels below before you set off. Free, no tickets, just turn up.';
        }} else {{
          head.textContent = 'Next display: ' + next.label + ' \\u2014 10pm';
          sub.textContent = (days === 1 ? 'That is tomorrow night.' : 'That is ' + days + ' nights away.') +
            ' Free, from the seafront just east of Bournemouth Pier \\u2014 weather permitting.';
        }}
        }}
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
        else run();
      }})();
      </script>
    </section>'''

# ---- dates table -------------------------------------------------------------
_ROWS = "\n".join(
    f'            <tr data-fw="{d}"><td>{lbl}</td><td>10pm</td><td>&asymp; {_sunset_bst(d)}</td></tr>'
    for d, lbl in FRIDAYS)

_DATES = f'''          <h2 id="dates">Every 2026 date</h2>
          <p>Six Fridays across the summer holidays, all free, all starting at <strong>10pm</strong>. Sunset times are computed for the seafront &mdash; arrive for the last of the light and you get the bay at its best before the show.</p>
          <table>
            <thead><tr><th>Date</th><th>Fireworks</th><th>Sunset</th></tr></thead>
            <tbody>
{_ROWS}
            </tbody>
          </table>
          <p class="mono">Dates and the 10pm start are as published by the organisers, BCP Council&rsquo;s events team, for 2026.</p>'''

# ---- where to stand ----------------------------------------------------------
_WHERE = '''          <h2 id="where">Where to stand</h2>
          <p>The fireworks go up from the shore <strong>just east of Bournemouth Pier</strong>, over the water. That one fact picks your spot for you:</p>
          <h3>The beach east of the pier</h3>
          <p>The stretch of sand between Bournemouth and Boscombe piers looks straight at the firing site &mdash; this is the front row, and where most people head. Get there early on a warm night, and remember a high tide narrows the beach, so the space by the water varies week to week.</p>
          <h3>Bournemouth Pier approach</h3>
          <p>The classic view: the display over the water with the pier lights in the frame. The plaza around the pier entrance is level and step-free, and you are next to the road, the buses and the chip shops when it ends.</p>
          <h3>The East Overcliff</h3>
          <p>Up on the clifftop you trade closeness for the full sweep of the bay &mdash; and a much easier exit. It is noticeably cooler than the beach even in August, so bring a layer, and stick to the lit routes rather than the dark zigzag paths once the show ends.</p>
          <h3>From the Boscombe side</h3>
          <p>Walking up from Boscombe Pier keeps you clear of the biggest crowds, looking west at the display with Bournemouth Pier glowing behind it. A good shout with a pushchair.</p>
          <p>We film most Friday displays for our <a href="https://www.facebook.com/bournemouth365" target="_blank" rel="noopener">Bournemouth365 Facebook page</a> &mdash; the clips are an honest way to judge the vantage points before you pick one.</p>'''

# ---- practical ---------------------------------------------------------------
_PRACTICAL = '''          <h2 id="practical">Getting there and back</h2>
          <p><strong>Arrive well before 10.</strong> On a warm Friday the seafront fills through the evening; being settled by half nine beats hunting for a gap in the dark.</p>
          <p><strong>Buses:</strong> Morebus has run extra &ldquo;Firework Fridays&rdquo; services in recent seasons &mdash; check <a href="https://www.morebus.co.uk" target="_blank" rel="noopener">morebus.co.uk</a> for this year&rsquo;s times. <strong>Parking:</strong> the seafront and clifftop car parks fill early on fireworks nights; allow more time than feels sensible, or take the bus. An honest local guide to beach parking is coming to this section soon.</p>
          <p><strong>Afterwards:</strong> it is dark, the paths are busy, and small legs are tired &mdash; the overcliff exits thin the crowd out fastest. Take your litter home, and keep clear of any cordoned area near the firing site on the beach.</p>
          <h2 id="winter">November 5th and New Year</h2>
          <p>Organised autumn and New Year displays around Bournemouth vary year to year, and nothing has been announced for late 2026 yet. We will update this page when the organisers confirm anything &mdash; the Friday Fireworks above are the seafront&rsquo;s regular fixture.</p>
          <h2>What happened to the Air Festival?</h2>
          <p>The Bournemouth Air Festival is not running &mdash; there was no event in 2025, there is none in 2026, and no return has been confirmed. The Friday Fireworks are now the big free regular on the seafront&rsquo;s summer calendar.</p>'''

# ---- the Bournemouth365 band -------------------------------------------------
_B365 = '''    <section class="section" aria-label="About Bournemouth365">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// BOURNEMOUTH365</p>
          <h2 class="section-title section-title--center" data-title>Bournemouth, 365 days a year<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="prose" data-reveal>
          <p>Bournemouth365 is the web home of our <a href="https://www.facebook.com/bournemouth365" target="_blank" rel="noopener">Bournemouth Live Facebook page</a>, where 39,000 of you watch the seafront with us every day. More pages are on the way: live sea conditions measured at the Boscombe wave buoy, an honest local guide to parking for the beach, and the best sunrise and sunset spots &mdash; photographed by us, not stock.</p>
          <p class="mono">Built in Bournemouth by <a href="/">365 Techies</a> &mdash; the family firm that has looked after the town&rsquo;s computers since 1995.</p>
        </div>
      </div>
    </section>'''

_FAQS = [
    ("What time do the Bournemouth Friday fireworks start?",
     "10pm, every Friday until 28 August 2026. The display starts on time &mdash; be in position a little before."),
    ("Are the Friday fireworks free?",
     "Yes &mdash; completely free, no tickets, no wristbands. They are organised by BCP Council&rsquo;s events team. Just turn up."),
    ("Where are the fireworks set off?",
     "From the seafront just east of Bournemouth Pier, over the sea &mdash; so anywhere with a clear view of the water east of the pier sees the show. Our favourite spots are in the guide above."),
    ("What happens if the weather is bad?",
     "Displays are weather-dependent and occasionally cancelled at short notice &mdash; strong wind is the usual culprit. Cancellations are announced on bournemouth.co.uk and the official Love Bournemouth social channels, so check there before you set off if it is wild out."),
    ("Is it on tonight?",
     "If it is a Friday between 24 July and 28 August 2026 &mdash; yes, weather permitting. The panel at the top of this page counts down to the next display."),
]


def _schema(s):
    g = [
        crumb(s, "Bournemouth Friday Fireworks"),
        webpage(s, "Bournemouth Friday Fireworks 2026",
                "Every 2026 date for Bournemouth's free Friday night fireworks, the best places to stand, and whether the display is on tonight."),
        faqpage(s, _FAQS),
    ]
    # Event nodes for displays still to come at BUILD time. Google's guidance
    # wants event markup current, so past Fridays drop off with each rebuild.
    # No endDate: the organisers do not publish a duration, so nor do we.
    today = _dt.date.today().isoformat()
    for d, lbl in FRIDAYS:
        if d >= today:
            g.append({
                "@type": "Event",
                "@id": f"{_URL}#event-{d}",
                "name": f"Bournemouth Friday Fireworks \u2014 {lbl} 2026",
                "startDate": f"{d}T22:00:00+01:00",
                "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
                "eventStatus": "https://schema.org/EventScheduled",
                "isAccessibleForFree": True,
                "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP",
                           "availability": "https://schema.org/InStock", "url": _URL},
                "location": {"@type": "Place",
                             "name": "Bournemouth seafront, east of Bournemouth Pier",
                             "address": {"@type": "PostalAddress", "addressLocality": "Bournemouth",
                                         "addressRegion": "Dorset", "addressCountry": "GB"},
                             "geo": {"@type": "GeoCoordinates", "latitude": 50.7154, "longitude": -1.8710}},
                "organizer": {"@type": "Organization", "name": "BCP Council Events Team"},
                "description": "Free fireworks display over the sea from the seafront just east of Bournemouth Pier, 10pm. Weather permitting.",
            })
    return graph(g)


_CONTENT = "\n".join([
    hero(bc("Bournemouth Friday Fireworks"),
         "// BOURNEMOUTH365",
         'Bournemouth Friday <em class="grad grad--cyan">fireworks</em>',
         "Free fireworks over the sea every Friday of the summer holidays &mdash; 10pm, fired just east of Bournemouth Pier, until 28 August 2026. Every date, the best places to stand, and whether it&rsquo;s on tonight.",
         cta1=("Is it on tonight?", "#tonight"),
         cta2=("Where to stand", "#where"),
         chips=["Free &mdash; no tickets", "Fridays at 10pm", "East of Bournemouth Pier"]),
    _STATUS,
    f'    <section class="section">\n      <div class="wrap">\n        <div class="prose" data-reveal>\n{_DATES}\n{_WHERE}\n{_PRACTICAL}\n        </div>\n      </div>\n    </section>',
    faq_html(_FAQS),
    _B365,
])

add(
    slug=_SLUG,
    title="Bournemouth Friday Fireworks 2026 \u2014 Dates, Times & Spots",
    desc="Free fireworks every Friday at 10pm until 28 Aug 2026, just east of Bournemouth Pier. All the dates, the best places to stand \u2014 and is it on tonight?",
    og_title="Bournemouth Friday Fireworks 2026 \u2014 every date, 10pm, free",
    schema=_schema,
    content=_CONTENT,
)


# ============================================================================
# PAGE 2: /bournemouth/sea-today/ - live measured sea conditions.
#
# The section flagship. Its whole pitch, and the reason it can beat the
# aggregators that own this SERP: WE MEASURE, THEY ESTIMATE. Every number on
# the live panel comes from a physical instrument (the bay's wave buoy, the EA
# tide gauge bolted to Bournemouth Pier, the EA sampling boat, Wessex Water's
# overflow monitors) via api/bm-sea.php, and every reading is shown with the
# time it was MEASURED. The degraded-state doctrine lives in bm-sea-lib.php;
# the page's job is to render whatever states arrive honestly.
#
# Editorial numbers are sourced, and their sources are named ON the page:
#   - Monthly averages: Cefas Coastal Temperature Network Station 23
#     ("Bournemouth"), 1971-2000 climatic means. The record ends in 2012, so
#     they are presented as long-term averages, never as current-year normals.
#   - Temperature bands: Outdoor Swimming Society - kept with the OSS's own
#     "not scientific, anecdotal" framing, per their page.
#   - Cold-water definition (below 15C) and Float to Live: RNLI.
#   - Wetsuit thresholds: British Triathlon Competition Rules 2026 - wetsuits
#     mandatory below 15.9C, no competition swimming below 11C. (Web summaries
#     saying "14C" are the OLD 2022 rules - do not "correct" to that.)
#   - Swim groups: only the two verified ACTIVE in 2026 (Durley Sea Swims,
#     Bournemouth Sea Dippers). Coldwater Collective and the Bluetits were
#     last evidenced in Jan 2024 - do not add without a fresh check.
#   - RNLI lifeguard dates: the RNLI's 20 May 2026 press release, labelled as
#     the 2026 season explicitly.
# ============================================================================

_ST_SLUG = "bournemouth/sea-today"

# Cefas Station 23 "Bournemouth", 1971-2000 monthly means, deg C.
_ST_CLIMATE = [("January", 7.4), ("February", 6.8), ("March", 7.4), ("April", 8.9),
               ("May", 11.8), ("June", 14.9), ("July", 17.4), ("August", 18.4),
               ("September", 16.8), ("October", 14.2), ("November", 11.2), ("December", 8.7)]

_ST_CLIMATE_ROWS = "\n".join(
    f'            <tr data-mo="{i}"><td>{m}</td><td>{t:.1f}&deg;C</td></tr>'
    for i, (m, t) in enumerate(_ST_CLIMATE))

# The live panel: six tiles the JS fills from /api/bm-sea.php. Every tile has
# an honest no-data state baked into the HTML, so a fetch failure needs no JS
# at all to be truthful.
_ST_PANEL = '''    <section class="section" id="now" aria-label="Live sea conditions">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// MEASURED, NOT MODELLED</p>
          <h2 class="section-title section-title--center" data-title>The sea right now<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
          <div class="tile"><h3 id="st-temp">Sea temperature</h3><p id="st-temp-sub">Waiting for the buoy&hellip; if this message stays, the live feed is down and we&rsquo;d rather say so than guess.</p></div>
          <div class="tile"><h3 id="st-waves">Waves</h3><p id="st-waves-sub">Waiting for the buoy&hellip;</p></div>
          <div class="tile"><h3 id="st-tide">Tide</h3><p id="st-tide-sub">Waiting for the pier gauge&hellip;</p></div>
          <div class="tile"><h3 id="st-quality">Water quality</h3><p id="st-quality-sub">Waiting for the Environment Agency feed&hellip;</p></div>
          <div class="tile"><h3 id="st-overflow">Storm overflows</h3><p id="st-overflow-sub">Waiting for the monitor feed&hellip;</p></div>
          <div class="tile"><h3 id="st-sun">Sun</h3><p id="st-sun-sub">Today&rsquo;s sunrise and sunset, computed for the seafront.</p></div>
        </div>
        <p class="mono" id="st-asof" style="margin-top:.8rem" data-reveal></p>
        <p class="mono" id="st-attrib" style="margin-top:.4rem" data-reveal>Sources: the bay&rsquo;s wave buoy, the Environment Agency tide gauge at Bournemouth Pier and bathing-water service, and Wessex Water&rsquo;s storm-overflow monitors &mdash; details at the foot of this page.</p>
      </div>
    </section>'''

# Client logic. Plain string (no f-string) so the JS braces stay sane.
_ST_JS = '''      <script>
      (function () {
        var LAT = 50.7166, LON = -1.8757;
        function pad(n) { return (n < 10 ? '0' : '') + n; }
        function hm(dt) { return dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }); }
        function sunUT(riseNotSet) {
          // NOAA simplified solar position - same maths the fireworks page
          // bakes at build time, run live here because "today" moves.
          var now = new Date();
          var start = Date.UTC(now.getUTCFullYear(), 0, 0);
          var n = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - start) / 86400000);
          var lngHour = LON / 15;
          var t = n + (((riseNotSet ? 6 : 18) - lngHour) / 24);
          var M = (0.9856 * t) - 3.289;
          var rad = Math.PI / 180;
          var L = M + (1.916 * Math.sin(M * rad)) + (0.020 * Math.sin(2 * M * rad)) + 282.634;
          L = ((L % 360) + 360) % 360;
          var RA = Math.atan(0.91764 * Math.tan(L * rad)) / rad;
          RA = ((RA % 360) + 360) % 360;
          RA += (Math.floor(L / 90) * 90) - (Math.floor(RA / 90) * 90);
          RA /= 15;
          var sinDec = 0.39782 * Math.sin(L * rad);
          var cosDec = Math.cos(Math.asin(sinDec));
          var cosH = (Math.cos(90.833 * rad) - (sinDec * Math.sin(LAT * rad))) / (cosDec * Math.cos(LAT * rad));
          if (cosH > 1 || cosH < -1) return null;
          var H = Math.acos(cosH) / rad;
          if (riseNotSet) H = 360 - H;
          H /= 15;
          var T = H + RA - (0.06571 * t) - 6.622;
          var UT = ((T - lngHour) % 24 + 24) % 24;
          var d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
          d.setUTCMinutes(Math.round(UT * 60));
          return d;
        }
        var rise = sunUT(true), set = sunUT(false);
        var sunEl = document.getElementById('st-sun'), sunSub = document.getElementById('st-sun-sub');
        if (rise && set) {
          sunEl.textContent = 'Sunrise ' + hm(rise) + ' \\u00b7 sunset ' + hm(set);
          sunSub.textContent = 'Computed for the seafront (\\u00b12 min). Golden hour is roughly the hour after sunrise and before sunset.';
        }

        function ago(iso) {
          var mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
          if (mins < 1) return 'just now';
          if (mins < 60) return mins + ' min ago';
          var h = Math.floor(mins / 60);
          return h + (h === 1 ? ' hour ' : ' hours ') + (mins % 60) + ' min ago';
        }
        function readAt(iso) {
          var d = new Date(iso);
          return hm(d) + ' (' + ago(iso) + ')';
        }
        function ossBand(t) {
          // Outdoor Swimming Society bands - anecdotal, not scientific, and
          // the page says so where these are explained.
          if (t >= 21) return ['\\u201cWarm\\u201d', 'comfortable swimming for most people'];
          if (t >= 17) return ['\\u201cSummer swimming\\u201d', 'fresh on entry, then comfortable'];
          if (t >= 12) return ['\\u201cFresh\\u201d', 'doable for the brave without a wetsuit; triathlon wetsuit territory'];
          if (t >= 6)  return ['\\u201cFreezing\\u201d', 'experienced cold-water swimmers only'];
          return ['\\u201cBaltic\\u201d', 'a few minutes is an achievement, even for the experienced'];
        }

        // highlight this month in the climate table - independent of the feed
        var mo0 = new Date().getMonth();
        var hrow = document.querySelector('[data-mo="' + mo0 + '"]');
        if (hrow) hrow.style.fontWeight = '600';

        fetch('/api/bm-sea.php', { cache: 'no-cache' })
          .then(function (r) { if (!r.ok) throw new Error('feed'); return r.json(); })
          .then(function (d) {
            var el = function (id) { return document.getElementById(id); };

            if (d.sea && d.sea.ok) {
              var s = d.sea;
              el('st-temp').textContent = s.tempC.toFixed(1) + '\\u00b0C sea temperature';
              var band = ossBand(s.tempC);
              el('st-temp-sub').textContent = (s.stale
                ? 'Last reading ' + readAt(s.read_at) + ' from the ' + s.station + ' \\u2014 the buoy has not reported since.'
                : 'Measured ' + readAt(s.read_at) + ' by the ' + s.station + '. ' + band[0] + ' on the swimmers\\u2019 scale \\u2014 ' + band[1] + '.');
              el('st-waves').textContent = s.hs.toFixed(2) + ' m waves';
              var wtxt = 'Significant height, measured. ';
              if (s.tz) wtxt += 'Mean period ' + s.tz.toFixed(1) + 's. ';
              if (s.dirFromMag !== null && s.dirFromMag !== undefined) wtxt += 'From ' + s.dirFromMag + '\\u00b0 magnetic. ';
              el('st-waves-sub').textContent = wtxt + (s.stale ? 'Reading ' + readAt(s.read_at) + '.' : '');
              var a = el('st-attrib');
              if (s.source === 'cco') {
                a.innerHTML = 'Real time data displayed on this page are from the <a href="https://coastalmonitoring.org/" target="_blank" rel="noopener">Regional Coastal Monitoring Programme</a>, made freely available under the terms of the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener">Open Government Licence</a>. Please note that these are real-time data and are not quality-controlled. Full source list at the foot of the page.';
              } else if (s.source === 'cefas') {
                a.textContent = 'Wave and temperature data: Cefas Poole Bay wave buoy (Open Government Licence, acknowledgement to Cefas). Full source list at the foot of the page.';
              }
            } else {
              el('st-temp-sub').textContent = 'The wave buoy is not reporting right now \\u2014 no reading is better than a guessed one. Try again in half an hour.';
              el('st-waves-sub').textContent = 'No current wave data \\u2014 the buoy feed is down.';
            }

            if (d.tide && d.tide.ok) {
              var t = d.tide;
              el('st-tide').textContent = 'Tide ' + t.trend;
              el('st-tide-sub').textContent = 'Water level ' + t.levelMAOD.toFixed(2) + ' m (vs Ordnance Datum), measured ' + readAt(t.read_at) + ' by the gauge on Bournemouth Pier itself \\u2014 a real instrument, not a prediction. Not for navigation or safety-critical use.';
            } else {
              el('st-tide-sub').textContent = 'The pier tide gauge is not reporting right now.';
            }

            if (d.bathing && d.bathing.ok && d.bathing.sites && d.bathing.sites.length) {
              var sites = d.bathing.sites, exc = 0, prfUp = 0, prfLevel = null, yr = sites[0].classYear;
              var nowMs = Date.now();
              for (var i = 0; i < sites.length; i++) {
                if (sites[i]['class'] === 'Excellent') exc++;
                var p = sites[i].prf;
                if (p && p.expires && new Date(p.expires).getTime() > nowMs) { prfUp++; if (p.level !== 'normal') prfLevel = p.level; }
              }
              el('st-quality').textContent = exc === sites.length ? 'All ' + sites.length + ' beaches: Excellent' : exc + ' of ' + sites.length + ' beaches Excellent';
              var q = (yr ? '(' + yr + ' Environment Agency classification.) ' : '');
              if (prfUp > 0) {
                q += prfLevel ? 'Today\\u2019s pollution risk forecast: ' + prfLevel + ' at one or more beaches \\u2014 details below.'
                              : 'Today\\u2019s pollution risk forecast: normal at all forecast beaches.';
              } else {
                q += 'Pollution risk forecasts are issued daily May\\u2013September; none is in force right now.';
              }
              el('st-quality-sub').textContent = q;
              var tbody = document.getElementById('st-sites');
              if (tbody) {
                tbody.innerHTML = '';
                for (var j = 0; j < sites.length; j++) {
                  var srow = sites[j], tr = document.createElement('tr'), prfTxt = '\\u2014';
                  if (srow.prf && srow.prf.expires && new Date(srow.prf.expires).getTime() > nowMs) prfTxt = srow.prf.level;
                  [srow.name, (srow['class'] || '?') + (srow.classYear ? ' (' + srow.classYear + ')' : ''), prfTxt,
                   srow.heavyRain ? 'yes' : 'no'].forEach(function (cell) {
                    var td = document.createElement('td'); td.textContent = cell; tr.appendChild(td);
                  });
                  tbody.appendChild(tr);
                }
              }
            } else {
              el('st-quality-sub').textContent = 'The Environment Agency feed is not responding right now.';
            }

            if (d.overflow && d.overflow.ok) {
              var o = d.overflow;
              if (o.discharging > 0) {
                el('st-overflow').textContent = o.discharging + ' overflow' + (o.discharging > 1 ? 's' : '') + ' discharging';
                el('st-overflow-sub').textContent = 'Of ' + o.total + ' monitored storm overflows on this stretch of coast, ' + o.discharging + ' is reporting a discharge right now. After heavy rain, consider swimming another day.';
              } else {
                el('st-overflow').textContent = 'No overflows discharging';
                el('st-overflow-sub').textContent = 'All ' + o.total + ' monitored storm overflows on this stretch are reporting no discharge' + (o.offline > 0 ? ' (' + o.offline + ' monitor' + (o.offline > 1 ? 's' : '') + ' offline)' : '') + '. Checked ' + readAt(o.read_at) + '.';
              }
            } else {
              el('st-overflow-sub').textContent = 'The storm-overflow monitor feed is not responding right now.';
            }

            var asof = el('st-asof');
            if (asof && d.at) asof.textContent = 'Feed assembled ' + readAt(d.at) + ' \\u00b7 refreshes every 20 minutes \\u00b7 readings show their own measurement times';
          })
          .catch(function () { /* the baked no-data copy is already honest */ });
      })();
      </script>'''

_ST_PROSE = f'''          <h2 id="swim">Can you swim today?</h2>
          <p>Put the live temperature above against the scale open-water swimmers actually use. The <a href="https://www.outdoorswimmingsociety.com/cold-water-feels-temperature-guide/" target="_blank" rel="noopener">Outdoor Swimming Society&rsquo;s guide</a> &mdash; anecdotal rather than scientific, as the OSS itself says &mdash; runs: 0&ndash;6&deg;C &ldquo;Baltic&rdquo;, 6&ndash;11&deg;C &ldquo;Freezing&rdquo;, 12&ndash;16&deg;C &ldquo;Fresh&rdquo;, 17&ndash;20&deg;C &ldquo;summer swimming&rdquo;, 21&deg;C+ &ldquo;Warm&rdquo;.</p>
          <p>Two harder numbers sit alongside that. The <a href="https://rnli.org/water-safety/know-the-risks/cold-water-shock" target="_blank" rel="noopener">RNLI defines anything below 15&deg;C as cold water</a>, capable of seriously affecting your breathing and movement &mdash; and their advice if you get into trouble is Float to Live: lean back, spread your arms and legs, and let the first minute of cold-water shock pass before you try to swim. And British Triathlon&rsquo;s 2026 competition rules make wetsuits <em>mandatory</em> below 15.9&deg;C and stop open-water racing entirely below 11&deg;C &mdash; a fair guide to where &ldquo;bracing&rdquo; ends and &ldquo;equipment required&rdquo; begins.</p>
          <p>In practice: a Bournemouth August afternoon is usually the friendliest sea of the year, and mid-winter is for the acclimatised, in company, close to shore. If the cold is new to you, build up over weeks of short swims from late spring &mdash; and swim between the red-and-yellow flags when lifeguards are on.</p>

          <h2 id="months">How warm the sea gets, month by month</h2>
          <p>Long-term monthly averages for Bournemouth, from the Cefas Coastal Temperature Network&rsquo;s station 23 &mdash; which is literally named &ldquo;Bournemouth&rdquo; (1971&ndash;2000 base period; the station record runs to 2012, so treat these as the long-term shape of the year, not this year&rsquo;s forecast):</p>
          <table>
            <thead><tr><th>Month</th><th>Average sea temp</th></tr></thead>
            <tbody>
{_ST_CLIMATE_ROWS}
            </tbody>
          </table>
          <p>The pattern worth knowing: the sea lags the air by around two months. June sunshine sits on May-chilled water, while a grey October day can still offer a 15&deg;C swim &mdash; warmer than anything before mid-June. The warmest sea of the year is late August; the coldest is February.</p>

          <h2 id="quality">Water quality, beach by beach</h2>
          <p>The Environment Agency classifies seven bathing waters along this seafront &mdash; Alum Chine, Durley Chine, Bournemouth Pier, Boscombe Pier, Manor Steps, Fisherman&rsquo;s Walk and Southbourne &mdash; and samples each through the May&ndash;September season. In season it also issues a daily pollution-risk forecast. The live panel above summarises; this table is per beach:</p>
          <table>
            <thead><tr><th>Beach</th><th>Classification</th><th>Today&rsquo;s risk forecast</th><th>Affected by heavy rain?</th></tr></thead>
            <tbody id="st-sites"><tr><td colspan="4">Waiting for the Environment Agency feed&hellip;</td></tr></tbody>
          </table>
          <p>&ldquo;Affected by heavy rain&rdquo; is the Environment Agency&rsquo;s own flag: at those beaches, water quality can dip temporarily after a downpour. That is also what the storm-overflow tile above watches &mdash; Wessex Water&rsquo;s live monitors on this stretch of coast, the same feed behind the national Storm Overflow Hub, updated every few minutes. Our honest advice matches the EA&rsquo;s: after heavy rain, give it a day.</p>

          <h2 id="groups">Swim with people who do this every week</h2>
          <p>Two long-running local groups, both active this year:</p>
          <p><strong><a href="https://durleyseaswims.co.uk/" target="_blank" rel="noopener">Durley Sea Swims</a></strong> &mdash; open-water and marathon-swim training from Durley Chine beach (in front of the lifeguard hut), weekend mornings May to September, suggested donation &pound;3 a swim. Founded 2013 to support that year&rsquo;s English Channel soloists, and still the serious-distance crowd. In the summer holidays they also run Friday-evening swims timed so you finish in the water as the <a href="/bournemouth/fireworks/">Friday fireworks</a> go up.</p>
          <p><strong>Bournemouth Sea Dippers</strong> &mdash; daily morning dips at Boscombe, six years running, and genuinely welcoming to newcomers. Cold-water dipping rather than distance swimming: short, sociable, year-round.</p>

          <h2 id="lifeguards">When the lifeguards are on</h2>
          <p>RNLI lifeguard patrols for the 2026 season (daily, 10am&ndash;6pm): <strong>Bournemouth East, Bournemouth West, Boscombe East and Sandbanks</strong> from 28 March to 27 September; <strong>Durley Chine, Alum Chine, Boscombe West, Fisherman&rsquo;s Walk, Southbourne and Branksome</strong> from 23 May to 6 September; <strong>East Cliff and Manor Steps</strong> from 18 July. Swim between the red-and-yellow flags. 2026 is the 25th year of RNLI lifeguards on these beaches &mdash; they began here as a 2001 pilot.</p>

          <h2>Where every number on this page comes from</h2>
          <p class="mono">Wave and sea-temperature readings: the bay&rsquo;s wave buoy network &mdash; when served from the Boscombe buoy: real-time data from the Regional Coastal Monitoring Programme under the Open Government Licence, not quality-controlled; when served from the Poole Bay buoy: Cefas, under the Open Government Licence. &middot; Tide level: this uses Environment Agency flood and river level data from the real-time data API (Beta), Open Government Licence &mdash; not for safety-critical use. &middot; Bathing water: contains Environment Agency bathing water data &copy; Environment Agency and database right, <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener">Open Government Licence v3.0</a>. &middot; Storm overflows: Wessex Water Storm Overflow Activity &copy; Wessex Water, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. &middot; Monthly averages: Cefas Coastal Temperature Network, Station 23 (Bournemouth), 1971&ndash;2000 base period. &middot; Sunrise and sunset: computed (NOAA solar position, &plusmn;2 minutes). Wave directions are magnetic. Nothing on this page is a model output presented as a measurement.</p>'''

_ST_FAQS = [
    ("What is the sea temperature at Bournemouth today?",
     "The live panel at the top of this page shows the current measured reading from the bay&rsquo;s wave buoy, with the time it was taken. For context, the long-term August average is 18.4&deg;C and February&rsquo;s is 6.8&deg;C (Cefas station 23, 1971&ndash;2000)."),
    ("Is the sea at Bournemouth clean enough to swim in?",
     "The Environment Agency&rsquo;s latest classification rates all seven Bournemouth bathing waters Excellent &mdash; its top grade. In season it also issues a daily pollution-risk forecast, shown live above, and this page watches Wessex Water&rsquo;s storm-overflow monitors around the clock. After heavy rain, quality can dip temporarily at some beaches &mdash; the honest move is to give it a day."),
    ("How warm does the sea get in Bournemouth?",
     "The long-term August average is 18.4&deg;C &mdash; the year&rsquo;s peak &mdash; and warm spells push individual readings past 21&deg;C, which is &ldquo;Warm&rdquo; on the Outdoor Swimming Society&rsquo;s scale. The sea lags the air by about two months, so early summer is much colder than it looks."),
    ("Do I need a wetsuit to swim at Bournemouth?",
     "Depends on the month and on you. British Triathlon&rsquo;s 2026 rules make wetsuits mandatory in competition below 15.9&deg;C &mdash; Bournemouth&rsquo;s sea is typically below that from November to mid-June. The RNLI defines anything under 15&deg;C as cold water. In high summer most swimmers go without; the rest of the year, a wetsuit is the sensible default unless you are acclimatised."),
    ("Where does this page&rsquo;s data actually come from?",
     "Physical instruments: the bay&rsquo;s wave buoy (temperature and waves), the Environment Agency&rsquo;s tide gauge mounted on Bournemouth Pier, the EA&rsquo;s bathing-water sampling and daily risk forecasts, and Wessex Water&rsquo;s storm-overflow monitors. Every reading is shown with the time it was measured &mdash; and when a feed is down, the page says so instead of guessing."),
]


def _st_schema(s):
    return graph([
        crumb(s, "Bournemouth Sea Conditions Today"),
        webpage(s, "Bournemouth Sea Conditions Today",
                "Live measured sea temperature, waves, tide and water quality for Bournemouth beach - from the bay's wave buoy, the pier tide gauge, the Environment Agency and Wessex Water."),
        faqpage(s, _ST_FAQS),
    ])


_ST_CONTENT = "\n".join([
    hero(bc("Bournemouth Sea Conditions"),
         "// BOURNEMOUTH365",
         'The sea at Bournemouth, <em class="grad grad--cyan">measured right now</em>',
         "Sea temperature from the bay&rsquo;s wave buoy. Tide from the gauge on the pier itself. Water quality from the Environment Agency, storm overflows from Wessex Water&rsquo;s live monitors. Every reading timestamped &mdash; and when a feed is down, we say so.",
         cta1=("The sea right now", "#now"),
         cta2=("Can you swim today?", "#swim"),
         chips=["Measured, not modelled", "Every reading timestamped", "Updated through the day"]),
    _ST_PANEL,
    f'    <section class="section">\n      <div class="wrap">\n        <div class="prose" data-reveal>\n{_ST_PROSE}\n        </div>\n      </div>\n    </section>',
    faq_html(_ST_FAQS),
    _B365,
    _ST_JS,
])

add(
    slug=_ST_SLUG,
    title="Bournemouth Sea Temperature & Conditions \u2014 Measured Live",
    desc="Live Bournemouth sea temperature, waves and tide \u2014 measured by the bay's wave buoy and the pier gauge, not modelled \u2014 plus water quality for all 7 beaches.",
    og_title="The sea at Bournemouth, measured right now",
    schema=_st_schema,
    content=_ST_CONTENT,
)
