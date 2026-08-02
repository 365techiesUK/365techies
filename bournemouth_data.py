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
