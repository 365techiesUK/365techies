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

from build_pages import add, graph, crumb, crumb_sub, webpage, faqpage, faq_html, hero, bc, bc_sub, SITE

# The published 2026 season, plus the finale BCP added on 26 Aug 2026 after
# the wildfire cancellations ("an additional display will take place next
# week at no additional cost to the council ... at Bournemouth beach on
# 4 September"; bcpcouncil.gov.uk news hub, 26 Aug 2026). (date, label)
FRIDAYS = [
    ("2026-07-24", "Friday 24 July"),
    ("2026-07-31", "Friday 31 July"),
    ("2026-08-07", "Friday 7 August"),
    ("2026-08-14", "Friday 14 August"),
    ("2026-08-21", "Friday 21 August"),
    ("2026-08-28", "Friday 28 August"),
    ("2026-09-04", "Friday 4 September"),
]
FINALE = "2026-09-04"
# Build-time season switch: once the finale has passed, the static copy
# (title, hero, hub card, no-JS panel) reads as "season over" - the JS panel
# already does this live, but crawlers and no-JS readers see the static text.
# Rebuild after 4 September to flip it (any site build does).
SEASON_OVER = _dt.date.today() > _dt.date.fromisoformat(FINALE)
# Beach-parking page: BCP's higher-PCN trial ran 4-31 Aug 2026. The page's
# script flips itself after 31 Aug; this build-time twin keeps the STATIC
# text honest for crawlers and no-JS readers once the trial has ended.
PCN_TRIAL_OVER = _dt.date.today() > _dt.date(2026, 8, 31)

# Displays the ORGANISERS have called off. date -> short public reason.
# ⚠️ This is the safety switch for the whole page: a date listed here is struck
# from the table, skipped by the "is it on tonight?" panel, and can never be
# announced as going ahead. Cancelling is BCP Council's call and ours only to
# report - so add a date here the moment it is announced, and remove it only if
# the organisers reinstate it. Getting this wrong in the ON direction sends
# families to a dark beach with children at 10pm; wrong in the OFF direction
# only costs a display someone could have seen. Bias to OFF.
#   2026-08-14: cancelled after the Government's national wildfire emergency
#   alert (14 Aug 2026), which asked landowners to stop "any activity with the
#   potential to start a fire, including fireworks"; Christchurch Carnival's
#   display went the same way. BCP: "whilst the fireworks are launched from sea,
#   the safety of residents, visitors, and our open spaces must come first."
#   2026-08-21: called off with the rest of the season while the wildfire
#   risk stayed high (reported to us 19 Aug 2026).
#   2026-08-26: BCP REINSTATED the displays "following discussions with
#   partners, including emergency services" and a reduction in wildfire risk:
#   Bournemouth beach 28 Aug, plus a "large finale" on 4 Sep at 10pm
#   (bcpcouncil.gov.uk, "Fireworks return to Poole Quay and Bournemouth
#   beach", 26 Aug 2026).
#   2026-08-28: cancelled on the night - "high winds at sea meaning the
#   fireworks simply cannot be safely launched from the barge" (Cllr Richard
#   Herrett; bcpcouncil.gov.uk, "Fireworks cancelled due to unsafe conditions
#   at sea", 28 Aug 2026). The same article confirms the 4 Sep finale stands.
CANCELLED = {
    "2026-08-14": "cancelled &mdash; national wildfire emergency alert",
    "2026-08-21": "cancelled &mdash; wildfire risk",
    "2026-08-28": "cancelled &mdash; high winds at sea, unsafe to launch from the barge",
}
CANCELLED_UPDATED = "3 September 2026"

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
_JS_DATES = ",".join('["%s","%s",%s]' % (d, lbl, "1" if d in CANCELLED else "0") for d, lbl in FRIDAYS)
_JS_ANY_ON = "1" if any(d not in CANCELLED for d, _ in FRIDAYS) else "0"

_STATUS = f'''    <section class="section b365 b365--dusk" id="tonight" aria-label="Next fireworks display">
      <div class="wrap">
        <div class="tile-grid" data-stagger style="grid-template-columns:1fr">
          <div class="b365-tile b365-tile--dusk" id="bmfw-tile">
            <p class="b365-state{" off" if SEASON_OVER else ""}" id="bmfw-state">{"SEASON FINISHED &middot; 2027 DATES WHEN BCP ANNOUNCES THEM" if SEASON_OVER else "FINALE &middot; FRIDAY 4 SEPTEMBER &middot; 10PM"}</p>
            <h3 id="bmfw-head">{"That was the last one &mdash; the 2026 season has finished" if SEASON_OVER else "One more: the finale is Friday 4 September at 10pm"}</h3>
            <p id="bmfw-sub">{"The finale on Friday 4 September closed a season that lost three Fridays: 14 and 21 August to the wildfire emergency, 28 August to high winds at sea. BCP Council announces the next season in the spring, and this page will be updated when they do. Last checked " if SEASON_OVER else "BCP Council reinstated the displays on 26 August after the wildfire risk eased, then had to cancel 28 August on the night for high winds at sea. The finale they added, Friday 4 September at 10pm from the seafront east of the pier, is still on as announced &mdash; weather permitting, as ever. Last checked "}{CANCELLED_UPDATED}.</p>
            <p class="b365-sub" id="bmfw-live"></p>
          </div>
        </div>
        <p class="mono" style="margin-top:.8rem" data-reveal>Displays are weather-dependent. Cancellations are announced by the organisers on <a href="https://www.bournemouth.co.uk/event/bournemouth-friday-fireworks" target="_blank" rel="noopener">bournemouth.co.uk</a> and the official Love Bournemouth social channels &mdash; if the wind is up, check there before you set off.</p>
      </div>
      <script>
      (function () {{
        var F = [{_JS_DATES}], ANY_ON = '{_JS_ANY_ON}', UPDATED = '{CANCELLED_UPDATED}';
        // This script sits ABOVE the dates table in the DOM, so it must wait
        // for the document - striking the past rows needs them to exist.
        function run() {{
        var head = document.getElementById('bmfw-head'), sub = document.getElementById('bmfw-sub');
        if (!head || !sub) return;
        var now = new Date();
        var next = null;
        var cancelledTonight = null;
        for (var i = 0; i < F.length; i++) {{
          var p = F[i][0].split('-');
          if (F[i][2]) {{   // CANCELLED: never "next"; only noted if it is today
            var cd = new Date(+p[0], +p[1] - 1, +p[2]);
            var t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (cd.getTime() === t0.getTime()) cancelledTonight = F[i][1];
            var crow = document.querySelector('[data-fw="' + F[i][0] + '"]');
            if (crow) crow.classList.add('bm-past');
            continue;
          }}
          // a display "ends" at 22:15 local; after that, point at the next one
          var end = new Date(+p[0], +p[1] - 1, +p[2], 22, 15);
          if (now < end) {{ next = {{ label: F[i][1], date: new Date(+p[0], +p[1] - 1, +p[2]) }}; break; }}
          // strike finished dates in the table as we pass them
          var row = document.querySelector('[data-fw="' + F[i][0] + '"]');
          if (row) row.classList.add('bm-past');
        }}
        if (!next && (ANY_ON === '0' || cancelledTonight)) {{
          var sc = document.getElementById('bmfw-state');
          if (sc) {{ sc.textContent = 'CANCELLED \\u2014 NO FURTHER DISPLAYS THIS SUMMER'; sc.classList.add('off'); }}
          head.textContent = cancelledTonight
            ? 'No fireworks tonight \\u2014 ' + cancelledTonight + ' is cancelled'
            : 'The rest of the 2026 season has been cancelled';
          sub.textContent = 'The organisers have called tonight\\u2019s display off. Please don\\u2019t travel down for a display. We will update this page the moment they announce anything different \\u2014 last checked ' + UPDATED + '.';
          return;
        }}
        if (!next) {{
          var se = document.getElementById('bmfw-state');
          if (se) {{ se.textContent = 'SEASON FINISHED \\u2014 2027 DATES WHEN BCP ANNOUNCES THEM'; se.classList.add('off'); }}
          head.textContent = 'That was the last one \\u2014 the 2026 season has finished';
          sub.textContent = 'The finale on Friday 4 September closed a season that lost three Fridays: 14 and 21 August to the wildfire emergency, 28 August to high winds at sea. BCP Council announces the next season in the spring, and this page will be updated when they do.';
          return;
        }}
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var days = Math.round((next.date - today) / 86400000);
        var stateEl = document.getElementById('bmfw-state');
        if (days === 0) {{
          if (stateEl) {{
            var togo = Math.max(0, Math.round((new Date(next.date.getFullYear(), next.date.getMonth(), next.date.getDate(), 22, 0) - now) / 60000));
            stateEl.textContent = 'TONIGHT \\u2014 10PM \\u00b7 ' + Math.floor(togo / 60) + 'H ' + (togo % 60) + 'M TO GO';
          }}
          // show night: the one input everyone wants, measured. Never a
          // cancellation prediction - the copy says whose call that is.
          var lv = document.getElementById('bmfw-live');
          if (lv) fetch('/api/bm-sea.php', {{ cache: 'no-cache' }}).then(function (r) {{ return r.json(); }}).then(function (d) {{
            if (d.sea && d.sea.ok && !d.sea.stale) {{
              var txt = 'Measured at the seafront right now: ' + d.sea.hs.toFixed(2) + 'm waves \\u00b7 sea ' + d.sea.tempC.toFixed(1) + '\\u00b0';
              if (d.tide && d.tide.ok && !d.tide.stale) txt += ' \\u00b7 tide ' + d.tide.trend;
              lv.textContent = txt + '. Cancellation is the organisers\\u2019 call, announced on the day \\u2014 check the official channels below if it is blowing a gale.';
            }}
          }}).catch(function () {{}});
          head.textContent = 'Yes \\u2014 fireworks TONIGHT at 10pm';
          sub.textContent = 'Fired from the seafront just east of Bournemouth Pier, weather permitting \\u2014 if it is blowing a gale, check the official channels below before you set off. Free, no tickets, just turn up.';
        }} else {{
          if (stateEl) stateEl.textContent = 'NEXT SHOW: ' + next.label.toUpperCase() + ' (' + days + (days === 1 ? ' DAY)' : ' DAYS)');
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
    f'            <tr data-fw="{d}"{" class=\"bm-cancelled\"" if d in CANCELLED else ""}><td>{lbl}</td><td>{"<s>10pm</s> <strong>CANCELLED</strong>" if d in CANCELLED else "10pm"}</td><td>&asymp; {_sunset_bst(d)}</td></tr>'
    for d, lbl in FRIDAYS)

_DATES = f'''          <h2 id="dates">Every 2026 date</h2>
          <p>The six published Fridays, plus the finale BCP Council added on Friday 4 September after the cancellations &mdash; all free, all starting at <strong>10pm</strong>. Three were lost: 14 and 21 August to the national wildfire emergency, 28 August to high winds at sea on the night. Sunset times are computed for the seafront &mdash; arrive for the last of the light and you get the bay at its best before the show.</p>
          <table>
            <thead><tr><th>Date</th><th>Fireworks</th><th>Sunset</th></tr></thead>
            <tbody>
{_ROWS}
            </tbody>
          </table>
          <p class="mono">Dates and the 10pm start are as published by the organisers, BCP Council&rsquo;s events team; the 4 September finale and the cancellations are from BCP Council&rsquo;s own announcements of 26 and 28 August 2026. Last verified: 3 September 2026.</p>'''

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
          <figure style="margin:1.2rem 0"><img src="/bournemouth/media/fireworks-2024.jpg" alt="Bournemouth Friday fireworks firing from the sea platform east of the pier, reflected in the water" loading="lazy" width="1080" height="1920" style="max-width:min(420px,100%);height:auto;border-radius:12px" />
          <figcaption class="mono" style="margin-top:.4rem">One of our own frames: the display firing from the sea platform east of the pier — 31 August 2024, 10.47pm.</figcaption></figure>
          <p>We film most Friday displays for our <a href="https://www.facebook.com/bournemouth365" target="_blank" rel="noopener">Bournemouth365 Facebook page</a> &mdash; the clips are an honest way to judge the vantage points before you pick one.</p>'''

# ---- practical ---------------------------------------------------------------
_PRACTICAL = '''          <h2 id="practical">Getting there and back</h2>
          <p><strong>Arrive well before 10.</strong> On a warm Friday the seafront fills through the evening; being settled by half nine beats hunting for a gap in the dark.</p>
          <p><strong>Buses:</strong> Morebus has run extra &ldquo;Firework Fridays&rdquo; services in recent seasons &mdash; check <a href="https://www.morebus.co.uk" target="_blank" rel="noopener">morebus.co.uk</a> for this year&rsquo;s times. <strong>Parking:</strong> the seafront and clifftop car parks fill early on fireworks nights; allow more time than feels sensible, or take the bus. An honest local guide to beach parking is coming to this section soon.</p>
          <p><strong>Afterwards:</strong> it is dark, the paths are busy, and small legs are tired &mdash; the overcliff exits thin the crowd out fastest. Take your litter home, and keep clear of any cordoned area near the firing site on the beach.</p>
          <h2 id="history">130 years of summer light</h2>
          <p>Bournemouth&rsquo;s habit of lighting up its seafront on summer evenings has a recorded origin: the candlelight illuminations of the Lower Gardens, first staged in 1896 &mdash; the year the Empress Eug&eacute;nie visited &mdash; and extended in 1897 for Queen Victoria&rsquo;s Diamond Jubilee, when some fifteen thousand coloured candles were lit through the gardens. The tradition survives in two forms today: the gardens&rsquo; candlelight nights, and the Friday fireworks &mdash; fired by the council&rsquo;s events team from a barge just east of the pier, part-funded by the town&rsquo;s Coastal BID to keep summer evenings on the seafront busy. Same idea as 1896: give everyone on the beach a reason to stay for dusk.</p>
          <p class="mono">History: recorded origin per Bournemouth Parks &amp; Gardens histories and visitor-guide archives (the 1896 date and the Jubilee candle count are corroborated across independent local accounts); today&rsquo;s operation per BCP Council&rsquo;s event listings.</p>

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
          <p class="mono" style="margin-bottom:.6rem"><a href="/bournemouth/">Bournemouth365 home</a> &middot; <a href="/bournemouth/live-map/">Live map</a> &middot; <a href="/bournemouth/sea-today/">The sea right now</a> &middot; <a href="/bournemouth/fireworks/">Friday fireworks</a> &middot; <a href="/bournemouth/sunrise-sunset/">Sunrise &amp; sunset</a> &middot; <a href="/bournemouth/beach-parking/">Beach parking</a> &middot; <a href="/van-signal-map/">Mobile signal map</a></p>
          <p class="mono">Built in Bournemouth by <a href="/">365 Techies</a> &mdash; the family firm that has looked after the town&rsquo;s computers since 1995.</p>
          <p class="b365-foot">No ads. No paywall. No consent wall. Built to load fast on beach 4G.</p>
        </div>
      </div>
    </section>'''

_FAQS = [
    ("What time do the Bournemouth Friday fireworks start?",
     "10pm, from the seafront just east of Bournemouth Pier. In 2026 the season ran on Fridays from 24 July, lost 14 and 21 August to the national wildfire emergency and 28 August to high winds at sea, and closed with a finale BCP Council added on Friday 4 September. Next year&rsquo;s dates come from BCP Council in the spring."),
    ("Are the Friday fireworks free?",
     "Yes &mdash; completely free, no tickets, no wristbands. They are organised by BCP Council&rsquo;s events team. Just turn up."),
    ("Where are the fireworks set off?",
     "From the seafront just east of Bournemouth Pier, over the sea &mdash; so anywhere with a clear view of the water east of the pier sees the show. Our favourite spots are in the guide above."),
    ("What happens if the weather is bad?",
     "Displays are weather-dependent and occasionally cancelled at short notice &mdash; strong wind is the usual culprit. Cancellations are announced on bournemouth.co.uk and the official Love Bournemouth social channels, so check there before you set off if it is wild out."),
    ("Is it on tonight?",
     "The panel at the top of this page works it out from today&rsquo;s date and the organisers&rsquo; announcements: the last 2026 display is the finale on Friday 4 September at 10pm, weather permitting. Cancellations are the organisers&rsquo; call, made on the day and posted on bournemouth.co.uk and the Love Bournemouth channels &mdash; check there if it is blowing a gale."),
]


def _schema(s):
    g = [
        crumb_sub(s, "Bournemouth365", "bournemouth", "Friday Fireworks"),
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
                # A cancelled display MUST publish EventCancelled - Google surfaces
                # event status in search, so leaving it "Scheduled" would advertise a
                # display that is not happening. See CANCELLED at the top of this file.
                "eventStatus": ("https://schema.org/EventCancelled" if d in CANCELLED
                                else "https://schema.org/EventScheduled"),
                "isAccessibleForFree": True,
                "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP",
                           "availability": ("https://schema.org/SoldOut" if d in CANCELLED
                                            else "https://schema.org/InStock"), "url": _URL},
                "location": {"@type": "Place",
                             "name": "Bournemouth seafront, east of Bournemouth Pier",
                             "address": {"@type": "PostalAddress", "addressLocality": "Bournemouth",
                                         "addressRegion": "Dorset", "addressCountry": "GB"},
                             "geo": {"@type": "GeoCoordinates", "latitude": 50.7154, "longitude": -1.8710}},
                "organizer": {"@type": "Organization", "name": "BCP Council Events Team"},
                "description": ("CANCELLED. This display has been called off by the organisers following the national wildfire emergency alert."
                                if d in CANCELLED else
                                "Free fireworks display over the sea from the seafront just east of Bournemouth Pier, 10pm. Weather permitting."),
            })
    return graph(g)


_CONTENT = "\n".join([
    hero(bc_sub("Bournemouth365", "/bournemouth/", "Friday Fireworks"),
         "// BOURNEMOUTH365",
         ('Bournemouth Friday fireworks &mdash; <em class="grad grad--cyan">the 2026 season</em>' if SEASON_OVER
          else 'Bournemouth Friday fireworks &mdash; <em class="grad grad--cyan">finale Friday 4 September</em>'),
         ("The 2026 season has finished. It lost three Fridays &mdash; 14 and 21 August to the national wildfire emergency, 28 August to high winds at sea &mdash; and closed with the finale BCP Council added on 4 September. Here is the full record: every date, what happened, and the best places to stand when the displays return."
          if SEASON_OVER else
          "One more display: BCP Council reinstated the fireworks on 26 August after the wildfire risk eased, lost 28 August to high winds at sea on the night, and added a finale for Friday 4 September at 10pm. Here is the full picture: every date with the cancelled nights struck through, what happened, and the best places to stand."),
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
    title=("Bournemouth Friday Fireworks 2026: Every Date, What Happened" if SEASON_OVER
           else "Bournemouth Fireworks: Finale Friday 4 September, 10pm"),
    desc=("The 2026 season is over: which Fridays ran, which were cancelled and why, the 4 September finale, and where to stand when the displays return."
          if SEASON_OVER else
          "One more: BCP Council added a finale for Friday 4 September at 10pm after the wildfire and high-wind cancellations. Every date, what happened, and where to stand."),
    og_title=("Bournemouth Friday Fireworks \u2014 the 2026 season, every date and what happened" if SEASON_OVER
              else "Bournemouth Friday Fireworks \u2014 finale Friday 4 September, 10pm"),
    schema=_schema,
    content=_CONTENT,
    og_image="/bournemouth/media/og-fireworks.jpg",
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
_ST_PANEL ='''    <section class="section b365" id="now" aria-label="Live sea conditions">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// MEASURED, NOT MODELLED</p>
          <h2 class="section-title section-title--center" data-title>The sea right now<span class="title-underline title-underline--center"></span></h2>
        </div>
        <p class="b365-verdict" id="st-verdict" data-reveal></p>
        <div class="b365-warn" id="st-warn" hidden></div>
        <p class="mono" id="st-line" data-reveal style="margin:0 0 1rem"></p>
        <div class="b365-hero" data-stagger>
          <div class="b365-tile" id="st-tile-temp">
            <span class="chip-m" id="st-temp-chip">SEA TEMPERATURE</span>
            <div class="b365-num" id="st-temp">&mdash;<small>&deg;C</small></div>
            <svg class="b365-spark" id="st-spark-t" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"></svg>
            <p class="b365-sub" id="st-temp-sub">Waiting for the buoy&hellip; if this message stays, the live feed is down and we&rsquo;d rather say so than guess.</p>
          </div>
          <div class="b365-tile" id="st-tile-waves">
            <span class="chip-m" id="st-waves-chip">WAVE HEIGHT</span>
            <div class="b365-num" id="st-waves">&mdash;<small>m</small></div>
            <svg class="b365-spark" id="st-spark-w" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"></svg>
            <p class="b365-sub" id="st-waves-sub">Waiting for the buoy&hellip;</p>
          </div>
          <div class="b365-tile" id="st-tile-tide">
            <span class="chip-m" id="st-tide-chip">TIDE &middot; PIER GAUGE</span>
            <div class="b365-num" id="st-tide">&mdash;</div>
            <p class="b365-sub" id="st-tide-sub">Waiting for the pier gauge&hellip;</p>
          </div>
        </div>
        <div class="b365-tile" id="st-tile-curve" data-reveal>
          <span class="chip-m" id="st-curve-chip">THE LAST 24 HOURS OF TIDE, MEASURED ON BOURNEMOUTH PIER</span>
          <svg class="b365-curve" id="st-curve" viewBox="0 0 600 150" preserveAspectRatio="none" aria-hidden="true"></svg>
          <p class="b365-sub" id="st-curve-note">The measured curve from the Environment Agency gauge mounted on the pier &mdash; not a tide-table prediction. Not for navigation or safety-critical use.</p>
        </div>
        <div class="b365-tile" id="st-why" data-reveal>
          <span class="chip-f" id="st-why-chip">BAY PHYSICS &middot; SELECTED BY THE MEASURED WAVE DIRECTION</span>
          <h3 style="margin:.4rem 0 0">Why the sea is like this today</h3>
          <p class="b365-sub" id="st-why-p">No usable wave direction is available right now. As a general rule here, refracted waves driven by west and south-westerly weather affect the inshore waters of Poole Bay about 85 percent of the time, arriving bent around Handfast Point from the south and south-east; the rest is mostly sea built over the local southerly and easterly fetches.</p>
          <p class="mono" style="margin-top:.5rem">Physics: the <a href="https://www.scopac.org.uk/scopac_sedimentdb/pbay/pbay.htm" target="_blank" rel="noopener">SCOPAC Poole Bay sediment-transport study</a>.</p>
        </div>
        <div class="b365-bands" id="st-bands" data-reveal aria-label="Swimmer temperature bands">
          <span data-band="0">0&ndash;6&deg; Baltic</span><span data-band="1">6&ndash;11&deg; Freezing</span><span data-band="2">12&ndash;16&deg; Fresh</span><span data-band="3">17&ndash;20&deg; Summer</span><span data-band="4">21&deg;+ Warm</span>
        </div>
        <p class="b365-sub" id="st-band-note" data-reveal style="margin-bottom:1rem">The Outdoor Swimming Society&rsquo;s bands &mdash; anecdotal, not scientific, as the OSS itself says. The highlight follows the live measured reading.</p>
        <div class="tile-grid" data-stagger>
          <div class="tile" id="st-tile-quality"><span class="chip-f" id="st-quality-chip">EA BATHING WATER SERVICE</span><h3 id="st-quality">Water quality</h3><p id="st-quality-sub">Waiting for the Environment Agency feed&hellip;</p></div>
          <div class="tile" id="st-tile-overflow"><span class="chip-f" id="st-overflow-chip">WESSEX WATER MONITORS</span><h3 id="st-overflow">Storm overflows</h3><p id="st-overflow-sub">Waiting for the monitor feed&hellip;</p></div>
          <div class="tile"><span class="chip-f" id="st-sun-chip">COMPUTED &middot; ASTRONOMY</span><h3 id="st-sun">Sun</h3><p id="st-sun-sub">Today&rsquo;s sunrise and sunset, computed for the seafront.</p></div>
        </div>
        <div class="b365-months" id="st-months" data-reveal aria-label="Long-term monthly sea temperature averages">
          <span data-mo="0">Jan<b>7.4&deg;</b></span>
          <span data-mo="1">Feb<b>6.8&deg;</b></span>
          <span data-mo="2">Mar<b>7.4&deg;</b></span>
          <span data-mo="3">Apr<b>8.9&deg;</b></span>
          <span data-mo="4">May<b>11.8&deg;</b></span>
          <span data-mo="5">Jun<b>14.9&deg;</b></span>
          <span data-mo="6">Jul<b>17.4&deg;</b></span>
          <span data-mo="7">Aug<b>18.4&deg;</b></span>
          <span data-mo="8">Sep<b>16.8&deg;</b></span>
          <span data-mo="9">Oct<b>14.2&deg;</b></span>
          <span data-mo="10">Nov<b>11.2&deg;</b></span>
          <span data-mo="11">Dec<b>8.7&deg;</b></span>
        </div>
        <p class="b365-sub" id="st-lag-note" data-reveal>Long-term monthly averages (Cefas station 23 &ldquo;Bournemouth&rdquo;, 1971&ndash;2000). The sea lags the air by about two months &mdash; September beats June.</p>
        <details data-reveal style="margin-top:1rem"><summary class="mono">Why our number can differ from what Google shows</summary>
          <p class="b365-sub" style="margin-top:.5rem">Most sea-temperature sites publish satellite-derived estimates of open water, sometimes updated daily, sometimes modelled from long-term analysis &mdash; and nearshore water can differ from those estimates by several degrees, as those sites&rsquo; own disclaimers note. The number above is a physical instrument in the bay reporting a measurement, with the time it was taken. When the instrument is down, we say so rather than switching to a model.</p>
        </details>
        <p class="mono" id="st-asof" style="margin-top:.8rem" data-reveal></p>
        <p class="mono" id="st-attrib" style="margin-top:.4rem" data-reveal>Sources: the bay&rsquo;s wave buoy, the Environment Agency tide gauge at Bournemouth Pier and bathing-water service, and Wessex Water&rsquo;s storm-overflow monitors &mdash; details at the foot of this page.</p>
        <p class="mono" style="margin-top:.4rem" data-reveal>See the buses, flights, road closures and river gauges moving on the <a href="/bournemouth/live-map/">live map</a>.</p>
        <p class="b365-foot" data-reveal style="margin-top:1.2rem">No ads. No paywall. No consent wall. Every reading carries its instrument and its measurement time &mdash; built in Bournemouth to load fast on beach 4G.</p>
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


        function setChip(id, kind, txt) {
          var e = document.getElementById(id);
          if (e) { e.className = kind; e.textContent = txt; }
        }
        function tileState(id, cls) {
          var e = document.getElementById(id);
          if (e) { e.classList.remove('b365-fresh', 'b365-stale', 'b365-down'); if (cls) e.classList.add(cls); }
        }
        function fmtNum(id, val, unit) {
          var e = document.getElementById(id);
          if (e) e.innerHTML = val + '<small>' + unit + '</small>';
        }
        function spark(id, series, idx) {
          var svg = document.getElementById(id);
          if (!svg || !series || series.length < 3) return;
          var vals = [], times = [];
          for (var i = 0; i < series.length; i++) { vals.push(series[i][idx]); times.push(new Date(series[i][0]).getTime()); }
          var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
          if (mx - mn < 0.15) { var mid = (mx + mn) / 2; mn = mid - 0.1; mx = mid + 0.1; }
          var t0 = times[0], t1 = times[times.length - 1], span = Math.max(1, t1 - t0);
          var d = '', pen = false;
          for (var j = 0; j < vals.length; j++) {
            var x = 2 + 96 * (times[j] - t0) / span;
            var y = 27 - 24 * (vals[j] - mn) / (mx - mn);
            // draw the gap when the instrument went quiet - never interpolate it
            if (j > 0 && times[j] - times[j - 1] > 45 * 60000) pen = false;
            d += (pen ? ' L' : ' M') + x.toFixed(1) + ' ' + y.toFixed(1);
            pen = true;
          }
          var lx = 2 + 96, ly = 27 - 24 * (vals[vals.length - 1] - mn) / (mx - mn);
          svg.innerHTML = '<path class="l" d="' + d + '"/><circle class="now" cx="98" cy="' + ly.toFixed(1) + '" r="2.4"/>';
          if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) svg.classList.add('b365-draw');
        }
        function tideCurve(series) {
          var svg = document.getElementById('st-curve'), note = document.getElementById('st-curve-note');
          if (!svg || !series || series.length < 8) return;
          var W = 600, H = 150, L = 34, R = 12, T = 14, B = 22;
          var vals = [], times = [];
          for (var i = 0; i < series.length; i++) { vals.push(series[i][1]); times.push(new Date(series[i][0]).getTime()); }
          var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
          var pad = Math.max(0.1, (mx - mn) * 0.12); mn -= pad; mx += pad;
          var t0 = times[0], t1 = times[times.length - 1], span = Math.max(1, t1 - t0);
          function X(tm) { return L + (W - L - R) * (tm - t0) / span; }
          function Y(v) { return T + (H - T - B) * (1 - (v - mn) / (mx - mn)); }
          var d = '', pen = false;
          for (var j = 0; j < vals.length; j++) {
            if (j > 0 && times[j] - times[j - 1] > 25 * 60000) pen = false;
            d += (pen ? ' L' : ' M') + X(times[j]).toFixed(1) + ' ' + Y(vals[j]).toFixed(1);
            pen = true;
          }
          // local extremes over a +/-5-point window (75 min)
          var marks = [], maxima = [];
          for (var k = 5; k < vals.length - 5; k++) {
            var hi = true, lo = true;
            for (var w = -5; w <= 5; w++) {
              if (vals[k + w] > vals[k]) hi = false;
              if (vals[k + w] < vals[k]) lo = false;
            }
            if (hi) { marks.push([k, 'high']); maxima.push(k); k += 5; }
            else if (lo) { marks.push([k, 'low']); k += 5; }
          }
          var g = '<line class="grid" x1="' + L + '" y1="' + Y(0) + '" x2="' + (W - R) + '" y2="' + Y(0) + '"/>' +
                  '<text x="2" y="' + (Y(0) + 3) + '">0m</text>';
          var html = g + '<path class="l" d="' + d + '"/>';
          for (var m = 0; m < marks.length && m < 4; m++) {
            var ki = marks[m][0];
            var lab = vals[ki].toFixed(1) + 'm ' + hm(new Date(times[ki]));
            var ty = marks[m][1] === 'high' ? Y(vals[ki]) - 5 : Y(vals[ki]) + 13;
            html += '<text x="' + Math.min(X(times[ki]), W - 70).toFixed(1) + '" y="' + ty.toFixed(1) + '">' + lab + '</text>';
          }
          html += '<circle class="now" cx="' + X(times[times.length - 1]).toFixed(1) + '" cy="' + Y(vals[vals.length - 1]).toFixed(1) + '" r="3.5"/>';
          svg.innerHTML = html;
          if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) svg.classList.add('b365-draw');
          // the famous stand/double-hump - annotate ONLY when the data shows it
          if (note && maxima.length >= 2) {
            var kA = maxima[maxima.length - 2], kB = maxima[maxima.length - 1];
            if (times[kB] - times[kA] < 8 * 3600000) {
              var dip = Math.min.apply(null, vals.slice(kA, kB + 1));
              if (Math.min(vals[kA], vals[kB]) - dip < 0.25 && Math.min(vals[kA], vals[kB]) - dip > 0.02) {
                note.textContent = 'The double hump in the measured curve is real: Bournemouth\u2019s tide holds a long stand around high water \u2014 a quirk of the English Channel\u2019s standing wave, explained below. Curve from the Environment Agency gauge on the pier; not for navigation.';
              }
            }
          }
        }
        function verdictWord(hs, temp) {
          if (hs >= 1.5) return ['ROUGH', 'v-rough'];
          if (hs >= 0.75) return ['CHOPPY', 'v-choppy'];
          if (hs >= 0.25) return temp < 12 ? ['BRACING', 'v-bracing'] : ['FRESH', 'v-fresh'];
          return ['CALM', 'v-calm'];
        }

        // highlight this month in the climate table - independent of the feed
        var mo0 = new Date().getMonth();
        var hrow = document.querySelector('[data-mo="' + mo0 + '"]');
        if (hrow) hrow.style.fontWeight = '600';
        var mcell = document.querySelector('.b365-months [data-mo="' + mo0 + '"]');
        if (mcell) mcell.classList.add('on');

        fetch('/api/bm-sea.php', { cache: 'no-cache' })
          .then(function (r) { if (!r.ok) throw new Error('feed'); return r.json(); })
          .then(function (d) {
            var el = function (id) { return document.getElementById(id); };
            // acceptance-test hooks: ?b365test=stale forces the stale
            // presentation of REAL data (nothing is invented); ?b365test=warn
            // adds a clearly-labelled simulated warning. Both are harmless
            // in public and required by acceptance tests A1/A2.
            if (location.search.indexOf('b365test=stale') > -1) {
              if (d.sea && d.sea.ok) d.sea.stale = true;
              if (d.tide && d.tide.ok) d.tide.stale = true;
            }
            // Wessex monitors split by receiving water (their own field):
            // seafront outfalls into Poole Bay vs river monitors on the
            // Stour/Avon. The distinction drives the tile, the warning strip
            // and the per-beach attribution below.
            var seaM = [], rivM = [], seaDis = 0, rivDis = 0;
            if (d.overflow && d.overflow.ok && d.overflow.monitors) {
              for (var mi = 0; mi < d.overflow.monitors.length; mi++) {
                var mm = d.overflow.monitors[mi];
                var isSea = String(mm.water || '').toUpperCase().indexOf('POOLE BAY') > -1;
                (isSea ? seaM : rivM).push(mm);
                if (mm.status === 1) { if (isSea) { seaDis++; } else { rivDis++; } }
              }
            }
            function havKm(la1, lo1, la2, lo2) {
              var R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
              var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) +
                      Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) *
                      Math.sin(dLo / 2) * Math.sin(dLo / 2);
              return 2 * R * Math.asin(Math.sqrt(h));
            }

            if (d.sea && d.sea.ok) {
              var s = d.sea;
              var ageMin = Math.round((Date.now() - new Date(s.read_at).getTime()) / 60000);
              var seaState = s.stale ? 'b365-stale' : (ageMin <= 105 ? 'b365-fresh' : '');
              tileState('st-tile-temp', seaState); tileState('st-tile-waves', seaState);
              fmtNum('st-temp', s.tempC.toFixed(1), '\u00b0C');
              fmtNum('st-waves', s.hs.toFixed(2), 'm');
              var chipTxt = (s.stale ? 'LAST HEARD ' : 'MEASURED ') + ago(s.read_at).toUpperCase() + ' \u00b7 ' + s.station.toUpperCase();
              setChip('st-temp-chip', 'chip-m', chipTxt);
              setChip('st-waves-chip', 'chip-m', chipTxt);
              var band = ossBand(s.tempC);
              el('st-temp-sub').textContent = (s.stale
                ? 'The buoy has not reported since ' + readAt(s.read_at) + ' \u2014 this is its last reading, not a current one.'
                : band[0] + ' on the swimmers\u2019 scale \u2014 ' + band[1] + '.');
              var wtxt = 'Significant height, measured. ';
              if (s.tz) wtxt += 'Mean period ' + s.tz.toFixed(1) + 's. ';
              if (s.dirFromMag !== null && s.dirFromMag !== undefined) wtxt += 'From ' + s.dirFromMag + '\u00b0 magnetic. ';
              el('st-waves-sub').textContent = wtxt;
              if (s.series) { spark('st-spark-t', s.series, 1); spark('st-spark-w', s.series, 2); }
              // verdict: sea-state words only, and never on stale data
              if (!s.stale) {
                var v = verdictWord(s.hs, s.tempC), ve = el('st-verdict');
                ve.textContent = v[0] + ' \u00b7 SEA STATE \u00b7 BANDED FROM MEASURED READINGS';
                ve.className = 'b365-verdict ' + v[1];
                el('st-line').textContent = 'Computed from the latest readings: ' + s.tempC.toFixed(1) + '\u00b0 water, ' + s.hs.toFixed(2) + 'm waves \u2014 measured ' + ago(s.read_at) + '.';
              }
              // cold-water band strip follows the instrument
              if (!s.stale) {
                var bi = s.tempC >= 21 ? 4 : s.tempC >= 17 ? 3 : s.tempC >= 12 ? 2 : s.tempC >= 6 ? 1 : 0;
                var bspan = document.querySelector('.b365-bands [data-band="' + bi + '"]');
                if (bspan) bspan.classList.add('on');
              }
              var bn = el('st-band-note');
              if (bn && !s.stale) bn.textContent = 'At ' + s.tempC.toFixed(1) + '\u00b0C measured now: ' + band[0].replace(/\u201c|\u201d/g, '') + ' \u2014 ' + band[1] + '. Bands: the Outdoor Swimming Society\u2019s guide (anecdotal, as the OSS itself says).';
              // thermal lag: live reading vs this month's long-term average
              var norms = [7.4, 6.8, 7.4, 8.9, 11.8, 14.9, 17.4, 18.4, 16.8, 14.2, 11.2, 8.7];
              var moNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
              var dlt = s.tempC - norms[mo0], ln = el('st-lag-note');
              if (ln && !s.stale) ln.textContent = 'Measured now: ' + s.tempC.toFixed(1) + '\u00b0 \u2014 ' + Math.abs(dlt).toFixed(1) + '\u00b0 ' + (dlt >= 0 ? 'above' : 'below') + ' the ' + moNames[mo0] + ' long-term average (Cefas station 23, 1971\u20132000). The sea lags the air by about two months \u2014 September beats June.';
              // bay-physics regimes: SCOPAC-cited paragraphs selected by the
              // measured wave direction. A paragraph the measured direction
              // does not support must never render; stale or missing
              // direction keeps the baked general fallback.
              var REG = [
                [0, 60, "coming off the land", "Waves recorded as coming from the north or north-east are coming off the land rather than the open sea. There is very little water on that side for the wind to work on, so the buoy is usually measuring small, locally wind-blown chop. The recognised wave-making directions for this bay all sit in the seaward half of the compass, so a reading here says little about what is arriving at the beach."],
                [60, 120, "an easterly sea", "An easterly sea is built over the fetch running up the Channel, and it arrives without needing to bend around any headland - the shelter Purbeck gives against south-westerlies does not apply from this quarter. The coastal research for Poole Bay notes that waves from the east and south-east affect all sectors of this coastline, so an easterly reading tends to mean the whole seafront is feeling it."],
                [120, 160, "the refracted-swell window", "South-east is the most telling arrival direction here. The prevailing south-westerly swell in the Channel cannot enter Poole Bay directly; it is bent - refracted and diffracted - around Handfast Point at Old Harry Rocks and arrives re-aimed from the south and south-east. A south-easterly reading therefore often means genuine open-water swell steered into the bay, not wind blowing from the south-east."],
                [160, 200, "head-on from the south", "Waves from due south meet this stretch of coast close to head-on, with open water behind them. That can be sea raised over the local southerly fetch, or refracted swell at the southern edge of its arrival window. For scale, the largest wave measured in the bay - 8.8m, logged by a research wave buoy off Southbourne in the 1970s - shows that open approaches here can carry substantial energy."],
                [200, 250, "south-westerly wind sea", "South-west is the prevailing wave direction offshore and lines up with the longest fetch, which is why south-westerly weather sits behind most of the wave energy in this bay. That swell cannot arrive still aimed south-west, though - it bends around Handfast Point and shows up from the south or south-east instead. A genuinely south-westerly reading at the buoy therefore usually means wind sea raised inside the bay by the day's wind, riding on top of whatever swell is coming through."],
                [250, 290, "the sheltered quarter", "A due-westerly direction is uncommon here and tends to mean locally generated wind sea running along the shore rather than onto it. The Purbeck peninsula stands in the way of weather from this quarter, and the sediment-transport research for the bay records shelter increasing towards its western end in the lee of Handfast Point. Any swell attached to a westerly blow arrives separately, steered in from the south or south-east."],
                [290, 360, "coming off the land", "A north-westerly direction points at land, not sea. With almost no fetch on that side, the buoy is generally reading small chop pushed off the shore, and the direction itself carries little information. Conditions at the beach are governed by whatever is arriving from the seaward half of the compass."]
              ];
              if (!s.stale && s.dirFromMag !== null && s.dirFromMag !== undefined) {
                var dg = ((s.dirFromMag % 360) + 360) % 360;
                for (var ri = 0; ri < REG.length; ri++) {
                  if (dg >= REG[ri][0] && dg < REG[ri][1]) {
                    el('st-why-p').textContent = 'Waves measured arriving from ' + dg + '\u00b0 magnetic - ' + REG[ri][2] + '. ' + REG[ri][3];
                    break;
                  }
                }
              }
              var a = el('st-attrib');
              if (s.source === 'cco') {
                a.innerHTML = 'Real time data displayed on this page are from the <a href="https://coastalmonitoring.org/" target="_blank" rel="noopener">Regional Coastal Monitoring Programme</a>, made freely available under the terms of the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener">Open Government Licence</a>. Please note that these are real-time data and are not quality-controlled. Full source list at the foot of the page.';
              } else if (s.source === 'cefas') {
                a.textContent = 'Wave and temperature data: Cefas Poole Bay wave buoy (Open Government Licence, acknowledgement to Cefas). Full source list at the foot of the page.';
              }
            } else {
              tileState('st-tile-temp', 'b365-down'); tileState('st-tile-waves', 'b365-down');
              setChip('st-temp-chip', 'chip-m', 'BUOY OFFLINE');
              setChip('st-waves-chip', 'chip-m', 'BUOY OFFLINE');
              el('st-temp-sub').textContent = 'The wave buoy is not reporting right now \u2014 no reading is better than a guessed one. Try again in half an hour.';
              el('st-waves-sub').textContent = 'No current wave data \u2014 the buoy feed is down.';
            }

            if (d.tide && d.tide.ok) {
              var tt = d.tide;
              var tAge = Math.round((Date.now() - new Date(tt.read_at).getTime()) / 60000);
              tileState('st-tile-tide', tt.stale ? 'b365-stale' : (tAge <= 75 ? 'b365-fresh' : ''));
              el('st-tide').textContent = tt.trend.charAt(0).toUpperCase() + tt.trend.slice(1);
              setChip('st-tide-chip', 'chip-m', (tt.stale ? 'LAST HEARD ' : 'MEASURED ') + ago(tt.read_at).toUpperCase() + ' \u00b7 GAUGE ON THE PIER');
              el('st-tide-sub').textContent = 'Water level ' + tt.levelMAOD.toFixed(2) + ' m (vs Ordnance Datum) \u2014 a real instrument on Bournemouth Pier, not a prediction. Not for navigation or safety-critical use.';
              if (tt.series) tideCurve(tt.series);
            } else {
              tileState('st-tile-tide', 'b365-down');
              setChip('st-tide-chip', 'chip-m', 'GAUGE OFFLINE');
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
              setChip('st-quality-chip', 'chip-f', 'EA SERVICE \u00b7 CHECKED ' + ago(d.bathing.read_at).toUpperCase());
              var tbody = document.getElementById('st-sites');
              if (tbody) {
                tbody.innerHTML = '';
                for (var j = 0; j < sites.length; j++) {
                  var srow = sites[j], tr = document.createElement('tr'), prfTxt = '\\u2014';
                  if (srow.prf && srow.prf.expires && new Date(srow.prf.expires).getTime() > nowMs) prfTxt = srow.prf.level;
                  var ovTxt = '\\u2014';
                  if (srow.lat != null && srow.lng != null && seaM.length) {
                    var best = null, bd = 1e9;
                    for (var k = 0; k < seaM.length; k++) {
                      if (seaM[k].lat == null || seaM[k].lng == null) continue;
                      var dk = havKm(srow.lat, srow.lng, seaM[k].lat, seaM[k].lng);
                      if (dk < bd) { bd = dk; best = seaM[k]; }
                    }
                    if (best) ovTxt = (best.status === 1 ? '\\u26a0 discharging'
                                       : best.status === -1 ? 'monitor offline' : 'no discharge')
                                      + ' \\u00b7 ' + bd.toFixed(1) + ' km away';
                  }
                  [srow.name, (srow['class'] || '?') + (srow.classYear ? ' (' + srow.classYear + ')' : ''), prfTxt,
                   srow.heavyRain ? 'yes' : 'no', ovTxt].forEach(function (cell) {
                    var td = document.createElement('td'); td.textContent = cell; tr.appendChild(td);
                  });
                  tbody.appendChild(tr);
                }
              }
            } else {
              el('st-quality-sub').textContent = 'The Environment Agency feed is not responding right now.';
              setChip('st-quality-chip', 'chip-f', 'EA FEED DOWN');
            }

            if (d.overflow && d.overflow.ok) {
              var o = d.overflow;
              setChip('st-overflow-chip', 'chip-f', 'WESSEX MONITORS \u00b7 CHECKED ' + ago(o.read_at).toUpperCase());
              if (seaDis > 0) {
                el('st-overflow').textContent = seaDis + ' seafront outfall' + (seaDis > 1 ? 's' : '') + ' discharging';
                el('st-overflow-sub').textContent = 'Of ' + seaM.length + ' monitored outfalls along the front, ' + seaDis + ' ' + (seaDis > 1 ? 'are' : 'is') + ' reporting a discharge into the bay. Monitor reported ' + readAt(o.read_at) + '. After heavy rain, consider swimming another day.' + (rivDis > 0 ? ' ' + rivDis + ' river monitor' + (rivDis > 1 ? 's' : '') + ' upstream also reporting.' : '');
              } else if (rivDis > 0) {
                el('st-overflow').textContent = 'River monitor' + (rivDis > 1 ? 's' : '') + ' discharging upstream';
                el('st-overflow-sub').textContent = 'No seafront outfall is reporting a discharge. ' + rivDis + ' monitor' + (rivDis > 1 ? 's' : '') + ' upstream on the Stour or Avon ' + (rivDis > 1 ? 'are' : 'is') + ' \u2014 river discharges reach the sea at Christchurch Harbour, not at these beaches directly. Monitor reported ' + readAt(o.read_at) + '.';
              } else {
                el('st-overflow').textContent = 'No overflows discharging';
                el('st-overflow-sub').textContent = 'All ' + o.total + ' monitored storm overflows (' + seaM.length + ' seafront outfalls, ' + rivM.length + ' river monitors upstream) are reporting no discharge' + (o.offline > 0 ? ' (' + o.offline + ' monitor' + (o.offline > 1 ? 's' : '') + ' offline)' : '') + '. Checked ' + readAt(o.read_at) + '.';
              }
            } else {
              el('st-overflow-sub').textContent = 'The storm-overflow monitor feed is not responding right now.';
              setChip('st-overflow-chip', 'chip-f', 'MONITOR FEED DOWN');
            }

            // Rule #7: official warnings outrank every derived element.
            // prfLevel is var-scoped from the bathing block above (guarded).
            var warns = [];
            if (typeof prfLevel !== 'undefined' && prfLevel) {
              warns.push('Official warning \u2014 today\u2019s Environment Agency pollution-risk forecast is \u201c' + prfLevel + '\u201d at one or more beaches. See water quality below.');
            }
            if (seaDis > 0) {
              warns.push('A seafront storm-overflow outfall is reporting a discharge into the bay. See storm overflows below.');
            } else if (rivDis > 0) {
              warns.push('A monitor upstream on the Stour or Avon is reporting a discharge — not at these beaches directly. See storm overflows below.');
            }
            if (location.search.indexOf('b365test=warn') > -1) {
              warns.push('TEST WARNING \u2014 simulated for acceptance testing; ignore.');
            }
            var we = el('st-warn');
            if (we && warns.length) {
              we.hidden = false;
              we.textContent = warns.join(' ');
              var sl = el('st-line');
              if (sl && sl.textContent) sl.textContent += ' \u2014 official warning in force, see below.';
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

          <h2 id="tide">Bournemouth&rsquo;s odd tide, live from the pier</h2>
          <p>The tide curve above often shows something tide tables flatten out: a long <em>stand</em> around high water, sometimes a visible double hump. It is not a faulty gauge &mdash; it is the English Channel&rsquo;s geometry. The Channel behaves as a standing-wave system with a node near this coast, and in shallow water the tide&rsquo;s harmonics distort the simple twice-a-day curve: Christchurch Harbour gets a true double high water on each tide, and Poole shows double highs at springs and a long stand at neaps (Humphreys, <em>Salinity and Tides in Poole Harbour</em>, Proceedings in Marine Science, 2005). Bournemouth sits between the two. Practical upshot: high water hangs around for hours &mdash; generous for swimmers, and the reason the beach can feel narrow all afternoon.</p>

          <h2 id="quality">Water quality, beach by beach</h2>
          <p>The Environment Agency classifies seven bathing waters along this seafront &mdash; Alum Chine, Durley Chine, Bournemouth Pier, Boscombe Pier, Manor Steps, Fisherman&rsquo;s Walk and Southbourne &mdash; and samples each through the May&ndash;September season. In season it also issues a daily pollution-risk forecast. The live panel above summarises; this table is per beach:</p>
          <table>
            <thead><tr><th>Beach</th><th>Classification</th><th>Today&rsquo;s risk forecast</th><th>Affected by heavy rain?</th><th>Nearest outfall monitor</th></tr></thead>
            <tbody id="st-sites"><tr><td colspan="5">Waiting for the Environment Agency feed&hellip;</td></tr></tbody>
          </table>
          <p>&ldquo;Affected by heavy rain&rdquo; is the Environment Agency&rsquo;s own flag: at those beaches, water quality can dip temporarily after a downpour. That is also what the storm-overflow tile above watches &mdash; Wessex Water&rsquo;s live monitors on this stretch of coast, the same feed behind the national Storm Overflow Hub, updated every few minutes. Our honest advice matches the EA&rsquo;s: after heavy rain, give it a day.</p>

          <h2 id="groups">Swim with people who do this every week</h2>
          <p>Two long-running local groups, both active this year:</p>
          <p><strong><a href="https://durleyseaswims.co.uk/" target="_blank" rel="noopener">Durley Sea Swims</a></strong> &mdash; open-water and marathon-swim training from Durley Chine beach (in front of the lifeguard hut), weekend mornings May to September, suggested donation &pound;3 a swim. Founded 2013 to support that year&rsquo;s English Channel soloists, and still the serious-distance crowd. In the summer holidays they also run Friday-evening swims timed so you finish in the water as the <a href="/bournemouth/fireworks/">Friday fireworks</a> go up.</p>
          <p><strong>Bournemouth Sea Dippers</strong> &mdash; daily morning dips at Boscombe, six years running, and genuinely welcoming to newcomers. Cold-water dipping rather than distance swimming: short, sociable, year-round.</p>

          <h2 id="lifeguards">When the lifeguards are on</h2>
          <p>RNLI lifeguard patrols for the 2026 season (daily, 10am&ndash;6pm): <strong>Bournemouth East, Bournemouth West, Boscombe East and Sandbanks</strong> from 28 March to 27 September; <strong>Durley Chine, Alum Chine, Boscombe West, Fisherman&rsquo;s Walk, Southbourne and Branksome</strong> from 23 May to 6 September; <strong>East Cliff and Manor Steps</strong> from 18 July to 6 September. Swim between the red-and-yellow flags. 2026 is the 25th year of RNLI lifeguards on these beaches &mdash; they began here as a 2001 pilot.</p>

          <h2 id="rules">Dogs, barbecues and the rules</h2>
          <p>The same council rules cover all seven beaches. <strong>Dogs:</strong> not allowed on any of these beaches from 1 May to 30 September; welcome from 1 October to 30 April, on a lead at all times on promenades, piers, zig zags and footpaths; working guide dogs exempt year-round. Three adjacent stretches stay dog-friendly all year: the western side of Alum Chine towards Branksome Chine, Middle Chine to Durley Chine, and Fisherman&rsquo;s Walk to Southbourne. <strong>Barbecues:</strong> disposables only, 6pm to 10:30pm &mdash; never gas barbecues, and never open fires, fire pits or fire bowls anywhere on the beaches, promenades or cliffs (fines can reach &pound;1,000). Free electric barbecues run 10am&ndash;10pm from early summer to October: the largest bank sits just east of Boscombe Pier (10 standard, 5 accessible), with more at Fisherman&rsquo;s Walk and Portman Ravine. Put disposables out with water and leave them next to a promenade bin &mdash; never buried, never binned hot.</p>
          <p class="mono">Rules: BCP Council&rsquo;s <a href="https://www.bcpcouncil.gov.uk/beaches-and-seafront/what-you-need-to-know-before-visiting-one-of-our-beaches/where-and-when-you-can-bring-your-dog-to-the-beach" target="_blank" rel="noopener">dog rules</a> and <a href="https://www.bcpcouncil.gov.uk/beaches-and-seafront/what-you-need-to-know-before-visiting-one-of-our-beaches/use-of-barbeques-on-the-beach" target="_blank" rel="noopener">barbecue rules</a>; lifeguard dates: the <a href="https://rnli.org/news-and-media/2026/may/20/rnli-lifeguards-set-for-main-season-at-bournemouth-christchurch-and-poole" target="_blank" rel="noopener">RNLI&rsquo;s 2026 season announcement</a> and per-beach listings &mdash; checked 6 August 2026. Rules change; the council&rsquo;s pages are definitive.</p>

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
        crumb_sub(s, "Bournemouth365", "bournemouth", "Sea Conditions"),
        webpage(s, "Bournemouth Sea Conditions Today",
                "Live measured sea temperature, waves, tide and water quality for Bournemouth beach - from the bay's wave buoy, the pier tide gauge, the Environment Agency and Wessex Water."),
        faqpage(s, _ST_FAQS),
    ])


_ST_CONTENT = "\n".join([
    hero(bc_sub("Bournemouth365", "/bournemouth/", "Sea Conditions"),
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


# ============================================================================
# PAGE 3: /bournemouth/sunrise-sunset/ - every spot, photographed, plus today's
# times. The photography is the differentiation: every frame is the owner's own,
# visually verified (seo-research/b365-photo-manifest.md), captioned with only
# what the frame shows. The times are computed astronomy - the one block of the
# section that can never go stale.
# ============================================================================

_SS_SLUG = "bournemouth/sunrise-sunset"

_SS_SPOTS = [
    ("beach-sunrise.jpg", "Sunrise on the beach",
     "Looking east along the sand towards Boscombe, the sun just up over the surf. In winter it rises over the sea; by midsummer it comes up behind the town, so the beach gets its light first.", 1600, 1067),
    ("pier-sunset-deck.jpg", "Bournemouth Pier deck",
     "From the boards of the pier looking back at the beach: the West Cliff goes to silhouette, the caf&eacute;s light up, and the wet sand carries the colour twice.", 1080, 1920),
    ("durley-chine-sunset.jpg", "Durley Chine",
     "The Deck beach bar in the foreground, the sun dropping towards the Purbeck hills. West of the pier the evening light lasts longest &mdash; and the swim group meets on this beach.", 1600, 900),
    ("beach-groyne-sunset.jpg", "The groynes, mid-beach",
     "Any groyne between the piers gives you this: the marker post in silhouette, the sun path on the wet sand at low tide. The emptiest good view on the seafront.", 1600, 900),
    ("hengistbury-beach-sunset.jpg", "The beach below Hengistbury Head",
     "From the eastern end of the bay looking west, the whole sweep of coast to the Purbecks in one frame. Worth the walk out; bring a torch back.", 1600, 900),
    ("sandbanks-harbour-dusk.jpg", "Sandbanks, harbour side",
     "Cross to the harbour side and dusk happens twice &mdash; once in the sky, once on the still water between the moorings.", 1600, 900),
]

_SS_FIGS = "\n".join(
    f'''        <figure class="b365-tile" data-reveal style="margin:0 0 1rem;padding:0;overflow:hidden">
          <img src="/bournemouth/media/{f}" alt="{h} \u2014 Bournemouth" loading="lazy" width="{w}" height="{ht}" style="width:100%;height:auto;display:block" />
          <figcaption style="padding:.9rem 1.1rem 1rem"><strong style="color:var(--b365-foam)">{h}</strong>
          <p class="b365-sub" style="margin:.25rem 0 0">{d}</p></figcaption>
        </figure>''' for f, h, d, w, ht in _SS_SPOTS)

_SS_PANEL = f'''    <section class="section b365 b365--dusk" id="times" aria-label="Today's sun times">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// COMPUTED FOR THE SEAFRONT &middot; NEVER GOES STALE</p>
          <h2 class="section-title section-title--center" data-title>Today&rsquo;s light<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="b365-hero" data-stagger>
          <div class="b365-tile b365-tile--dusk"><span class="chip-m" id="ss-rise-chip">SUNRISE</span><div class="b365-num" id="ss-rise">&mdash;</div><p class="b365-sub">Golden hour runs roughly the hour after.</p></div>
          <div class="b365-tile b365-tile--dusk"><span class="chip-m" id="ss-set-chip">SUNSET</span><div class="b365-num" id="ss-set">&mdash;</div><p class="b365-sub">Golden hour runs roughly the hour before.</p></div>
          <div class="b365-tile b365-tile--dusk"><span class="chip-m">DAY LENGTH</span><div class="b365-num" id="ss-len">&mdash;</div><p class="b365-sub" id="ss-len-sub">Computed for the seafront (NOAA solar position, &plusmn;2 minutes). Needs JavaScript; nothing here is fetched or forecast.</p></div>
        </div>
        <div class="tile-grid" data-stagger style="margin-top:1rem">
{_SS_FIGS}
        </div>
        <p class="b365-foot" data-reveal style="margin-top:1rem">Every frame on this page is ours, shot on this coastline, and says only what it shows. No ads. No paywall. No consent wall.</p>
      </div>
      <script>
      (function () {{
        var LAT = 50.7166, LON = -1.8757;
        function sunUT(riseNotSet) {{
          var now = new Date();
          var start = Date.UTC(now.getUTCFullYear(), 0, 0);
          var n = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - start) / 86400000);
          var lngHour = LON / 15, rad = Math.PI / 180;
          var t = n + (((riseNotSet ? 6 : 18) - lngHour) / 24);
          var M = (0.9856 * t) - 3.289;
          var L = M + (1.916 * Math.sin(M * rad)) + (0.020 * Math.sin(2 * M * rad)) + 282.634;
          L = ((L % 360) + 360) % 360;
          var RA = Math.atan(0.91764 * Math.tan(L * rad)) / rad;
          RA = ((RA % 360) + 360) % 360;
          RA += (Math.floor(L / 90) * 90) - (Math.floor(RA / 90) * 90);
          RA /= 15;
          var sinDec = 0.39782 * Math.sin(L * rad), cosDec = Math.cos(Math.asin(sinDec));
          var cosH = (Math.cos(90.833 * rad) - (sinDec * Math.sin(LAT * rad))) / (cosDec * Math.cos(LAT * rad));
          if (cosH > 1 || cosH < -1) return null;
          var H = Math.acos(cosH) / rad;
          if (riseNotSet) H = 360 - H;
          var T = (H / 15) + RA - (0.06571 * t) - 6.622;
          var UT = ((T - lngHour) % 24 + 24) % 24;
          var d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
          d.setUTCMinutes(Math.round(UT * 60));
          return d;
        }}
        function hm(d) {{ return d.toLocaleTimeString('en-GB', {{ hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }}); }}
        var rise = sunUT(true), set = sunUT(false);
        if (rise && set) {{
          document.getElementById('ss-rise').textContent = hm(rise);
          document.getElementById('ss-set').textContent = hm(set);
          var mins = Math.round((set - rise) / 60000);
          document.getElementById('ss-len').textContent = Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
          var today = new Date().toLocaleDateString('en-GB', {{ day: 'numeric', month: 'long' }});
          document.getElementById('ss-rise-chip').textContent = 'SUNRISE \u00b7 ' + today.toUpperCase();
          document.getElementById('ss-set-chip').textContent = 'SUNSET \u00b7 ' + today.toUpperCase();
        }}
      }})();
      </script>
    </section>'''

_SS_PROSE = '''          <h2 id="where">Where the sun actually rises and sets here</h2>
          <p>Bournemouth&rsquo;s beach faces south, which is why it gets both ends of the day. In <strong>winter</strong> the sun rises over the sea to the south-east and sets over the sea to the south-west &mdash; over the Purbeck hills, which is when the pier and groyne silhouettes are at their best. By <strong>midsummer</strong> both ends have swung inland: the sun comes up behind the town to the north-east and drops behind the West Cliff to the north-west, so the classic over-the-water sunset belongs to autumn, winter and spring. Golden hour &mdash; roughly the hour after sunrise and before sunset &mdash; is when the cliff face goes copper and the wet sand doubles everything.</p>
          <p>Quiet practical notes: the beach is at its widest for walking an hour or two either side of low water; the zig-zag paths are unlit, so use the lit chine roads after dark; and in high summer sunrise is before 5am &mdash; check the computed times above before you set an alarm.</p>'''

_SS_FAQS = [
    ("What time is sunset in Bournemouth today?",
     "The panel at the top of this page computes it for the seafront every day (NOAA solar position, accurate to a couple of minutes) &mdash; no forecast, no feed, it cannot go stale."),
    ("Where is the best place to watch the sunset in Bournemouth?",
     "For over-the-water sunsets: west of the pier &mdash; Durley Chine and the beach groynes &mdash; looking towards the Purbeck hills, best from autumn to spring. In midsummer the sun sets inland behind the West Cliff, so the pier deck looking back at the lit seafront is the better evening view."),
    ("Where can I watch the sunrise in Bournemouth?",
     "The open beach anywhere east of the pier: in winter the sun comes up over the sea towards Hengistbury Head; in summer it rises behind the town and the beach catches the first light. The photographs on this page show exactly what each spot gives you."),
    ("Are these photos really Bournemouth?",
     "Yes &mdash; every frame is our own, shot on this coastline over years of filming it daily for our Bournemouth365 page, and each caption says where it was taken. No stock, no AI imagery, anywhere on these pages."),
]


def _ss_schema(s):
    return graph([
        crumb_sub(s, "Bournemouth365", "bournemouth", "Sunrise & Sunset"),
        webpage(s, "Sunrise and Sunset in Bournemouth",
                "Today's computed sunrise and sunset times for Bournemouth seafront, and the best spots to watch - photographed by us, not stock."),
        faqpage(s, _SS_FAQS),
    ])


_SS_CONTENT = "\n".join([
    hero(bc_sub("Bournemouth365", "/bournemouth/", "Sunrise &amp; Sunset"),
         "// BOURNEMOUTH365",
         'Sunrise and sunset in <em class="grad grad--cyan">Bournemouth</em>',
         "Today&rsquo;s times, computed for the seafront &mdash; and every good spot to watch from, photographed by us on this coastline. Not stock, and each caption says only what the frame shows.",
         cta1=("Today's times", "#times"),
         cta2=("The spots", "#where"),
         chips=["Computed times &mdash; never stale", "Our own photographs", "Every spot named"]),
    _SS_PANEL,
    f'    <section class="section">\n      <div class="wrap">\n        <div class="prose" data-reveal>\n{_SS_PROSE}\n        </div>\n      </div>\n    </section>',
    faq_html(_SS_FAQS),
    _B365,
])

add(
    slug=_SS_SLUG,
    title="Sunrise & Sunset in Bournemouth \u2014 Times & Best Spots",
    desc="Today's sunrise and sunset times for Bournemouth seafront, computed live \u2014 plus the best places to watch, photographed by us: the pier, Durley Chine, the groynes, Hengistbury and Sandbanks.",
    og_title="Sunrise and sunset in Bournemouth \u2014 photographed, not stock",
    schema=_ss_schema,
    content=_SS_CONTENT,
    og_image="/bournemouth/media/og-sunrise-sunset.jpg",
)


# ============================================================================
# THE HUB: /bournemouth/ - the Bournemouth365 landing. Built once three pages
# were live (a hub for one page would have been thin). Cards use the og images
# already in media/ so no new weight.
# ============================================================================

_HUB_SLUG = "bournemouth"

_HUB_CARDS = [
    ("/bournemouth/live-map/", "/bournemouth/media/og-live-map.jpg",
     "The live map", "Buses, flights, road closures, river levels, bike bays and the latest satellite pass over Bournemouth, Christchurch and Poole &mdash; every layer from a named public feed, on a free flat map, with the 3D city loaded only when you ask for it."),
    ("/bournemouth/sea-today/", "/bournemouth/media/og-sunrise-sunset.jpg",
     "The sea right now", "Sea temperature and waves measured by the bay&rsquo;s buoy, tide from the gauge on the pier, water quality for all seven beaches &mdash; live, timestamped, never modelled."),
    ("/bournemouth/fireworks/", "/bournemouth/media/og-fireworks.jpg",
     "Friday fireworks", ("The 2026 season, every date and what happened &mdash; three Fridays lost to the wildfire emergency and high winds, one finale added &mdash; and the best places to stand when the displays return."
                          if SEASON_OVER else
                          "One more: the finale is Friday 4 September at 10pm, added by BCP Council after the wildfire and high-wind cancellations &mdash; every date, what happened, and where to stand.")),
    ("/bournemouth/sunrise-sunset/", "/bournemouth/media/beach-sunrise.jpg",
     "Sunrise &amp; sunset", "Today&rsquo;s times computed for the seafront, and every good spot to watch from &mdash; photographed by us, not stock."),
    ("/bournemouth/beach-parking/", "/bournemouth/media/durley-chine-sunset.jpg",
     "Beach parking, honestly", "What it really costs, where it is far cheaper, and the rules that catch people out &mdash; every price from BCP&rsquo;s own pages, dated."),
    ("/van-signal-map/", "/bournemouth/media/pier-golden-hour.jpg",
     "Mobile signal, measured", "Real 4G/5G speeds our own van logs as it drives around Bournemouth and Poole &mdash; the places that tested fastest for working on the move, on a map you can check before you rely on it. One van, one network, measured not modelled."),
    # The crowd counterpart. Kept as its own card, not folded into the van one:
    # different instrument, different data, and the page it links to says so.
    ("/mobile-signal-check/", "/og-mobile-signal-check.jpg",
     "Test your own phone here", "Ten seconds, where you&rsquo;re standing: your phone&rsquo;s real mobile-data speed, how it compares with your part of town, and a live map everyone&rsquo;s readings build together. No sign-up, nothing that identifies you &mdash; and no network league tables."),
]

_HUB_CARD_HTML = "\n".join(
    f'''        <a class="b365-tile" href="{u}" data-reveal style="display:block;text-decoration:none;padding:0;overflow:hidden">
          <img src="{img}" alt="" loading="lazy" width="1200" height="630" style="width:100%;height:auto;display:block;aspect-ratio:1200/630;object-fit:cover" />
          <div style="padding:1rem 1.1rem 1.1rem"><strong style="color:var(--b365-foam);font-size:1.1rem">{h}</strong>
          <p class="b365-sub" style="margin:.3rem 0 0">{d}</p></div>
        </a>''' for u, img, h, d in _HUB_CARDS)

_HUB_CONTENT = "\n".join([
    hero(bc("Bournemouth365"),
         "// BOURNEMOUTH365",
         'Bournemouth, <em class="grad grad--cyan">365 days a year</em>',
         "The web home of our Bournemouth365 Facebook page, where 39,000 of you watch this seafront with us every day. Here: the sea measured live, the fireworks answered honestly, and the coastline photographed as it actually is &mdash; no ads, no paywall, nothing modelled and sold as measured.",
         cta1=("The sea right now", "/bournemouth/sea-today/"),
         cta2=("Friday fireworks", "/bournemouth/fireworks/"),
         chips=["Measured, not modelled", "Our own photography", "No ads, ever"]),
    f'''    <section class="section b365" aria-label="Bournemouth365 pages">
      <div class="wrap">
        <p class="mono" id="hub-live" data-reveal style="margin:0 0 1rem"></p>
        <div class="b365-hero" data-stagger>
{_HUB_CARD_HTML}
        </div>
        <div class="prose" data-reveal style="margin-top:1.6rem">
          <h2>What this is</h2>
          <p>For years our <a href="https://www.facebook.com/bournemouth365" target="_blank" rel="noopener">Bournemouth365 Facebook page</a> (born Bournemouth Live) has filmed this coastline daily &mdash; the calm mornings, the storms, the fireworks, the light. These pages bring that to the open web and add the thing social media can&rsquo;t: live measured data with its provenance shown. The sea page reads real instruments &mdash; the bay&rsquo;s wave buoy, the Environment Agency&rsquo;s tide gauge mounted on Bournemouth Pier &mdash; and every reading carries the time it was taken. When a feed is down, the page says so rather than guessing.</p>
          <p>More is coming: an honest local guide to parking for the beach, and a page on Westover Road in 1985 &mdash; the cinemas, the ice rink and the cruising loop &mdash; built from sourced local history. <span class="mono">Built in Bournemouth by <a href="/">365 Techies</a>, the family firm that has looked after the town&rsquo;s computers since 1995.</span></p>
        </div>
        <p class="b365-foot" data-reveal style="margin-top:1rem">No ads. No paywall. No consent wall. Every reading carries its instrument and its measurement time.</p>
      </div>
      <script>
      (function () {{
        var el = document.getElementById('hub-live');
        if (!el || !window.fetch) return;
        fetch('/api/bm-sea.php', {{ cache: 'no-cache' }}).then(function (r) {{ return r.json(); }}).then(function (d) {{
          if (d.sea && d.sea.ok && !d.sea.stale) {{
            el.textContent = 'Right now in the bay: ' + d.sea.tempC.toFixed(1) + '\u00b0 water, ' + d.sea.hs.toFixed(2) + 'm waves \u2014 measured by the ' + d.sea.station + '.';
          }}
        }}).catch(function () {{}});
      }})();
      </script>
    </section>''',
])


def _hub_schema(s):
    return graph([
        crumb(s, "Bournemouth365"),
        webpage(s, "Bournemouth365",
                "Bournemouth, 365 days a year: live measured sea conditions, the Friday fireworks, sunrise and sunset spots - from the team behind the Bournemouth365 Facebook page.",
                wtype="CollectionPage"),
    ])


add(
    slug=_HUB_SLUG,
    title="Bournemouth365 \u2014 the Sea, the Fireworks & the Light",
    desc="Bournemouth, 365 days a year: live measured sea conditions, Friday fireworks answered honestly, and sunrise spots photographed by us. From the 39K-follower Bournemouth365 page.",
    og_title="Bournemouth365 \u2014 Bournemouth, every day of the year",
    schema=_hub_schema,
    content=_HUB_CONTENT,
    og_image="/bournemouth/media/og-sunrise-sunset.jpg",
)


# ============================================================================
# PAGE 4: /bournemouth/beach-parking/ - the honest guide. Google currently
# ranks a 2012 Tripadvisor thread and a Reddit thread for these queries
# because no page answers them. Everything here is sourced from BCP's own
# pages, dated, and says so. See this module's header for the do-not list.
# ============================================================================

_PK_SLUG = "bournemouth/beach-parking"
_PK_CHECKED = "3 August 2026"

# BCP's three distinct seafront tariff bands - assuming one price for "the
# seafront" is the biggest factual trap on this subject.
_PK_BANDS = [
    ("Seafront band", "Alum Chine, Durley Chine, Overstrand, Warren Edge, Solent Beach, Hengistbury Head",
     "&pound;3.20 for 1 hour, &pound;9.60 for 4, &pound;23.60 for 24", "&pound;2.70 for 2 hours, &pound;5.30 for 24"),
    ("Pier and town band", "Bath Road North, Bath Road South, Pavilion",
     "&pound;3.80 for 1 hour, &pound;15.40 for 4, &pound;28.00 for 24", "&pound;2.40 for 1 hour, &pound;20.90 for 24"),
    ("Boscombe Undercliff", "the big one at Boscombe &mdash; 355 spaces, and priced on when you arrive",
     "2 Jul&ndash;2 Sep: &pound;19.10 before 2pm, &pound;13 from 2&ndash;4pm, &pound;8.20 after 4pm, &pound;4.10 after 6pm",
     "29 Oct&ndash;31 Mar: &pound;2.70 up to 2 hours, &pound;5.30 over"),
]

_PK_BAND_ROWS = "\n".join(
    f'            <tr><td><strong>{n}</strong><br /><span class="mono">{w}</span></td><td>{s}</td><td>{win}</td></tr>'
    for n, w, s, win in _PK_BANDS)

# f-string: the script's braces are doubled for that reason. It shipped as a
# plain string from launch to 3 Sep 2026, so the browser received "{{" and the
# 1 September flip never ran - the static text below now carries the switch too.
_PK_ALERT = f'''    <section class="section b365 b365--dusk" id="fines" aria-label="Parking penalty trial">
      <div class="wrap">
        <div class="b365-tile b365-tile--dusk" data-reveal>
          <p class="b365-state{" off" if PCN_TRIAL_OVER else ""}" id="pk-state">{"PARKING FINES ON THE SEAFRONT" if PCN_TRIAL_OVER else "HIGHER PARKING FINES ON THE SEAFRONT"}</p>
          <p class="b365-sub" id="pk-alert">{"BCP ran a trial of London-level penalty charges along the seafront in August 2026 (and August 2025 before it), so check before you travel in high summer &mdash; it may well run again. Outside any trial, a ticket for parking somewhere you are not allowed at all is <strong>&pound;70</strong> (&pound;35 within 14 days) and overstaying in a legal bay is <strong>&pound;50</strong> (&pound;25 within 14 days)."
           if PCN_TRIAL_OVER else
           "BCP Council is running a trial of London-level penalty charges on every road from Sandbanks to Southbourne, from 4 to 31 August 2026. A ticket for parking somewhere you are not allowed at all &mdash; double yellows, a junction, a disabled bay without a badge &mdash; is <strong>&pound;160</strong>, or &pound;80 if you pay within 14 days. Overstaying or mis-parking in a legal bay is <strong>&pound;110</strong>, or &pound;55 within 14 days. Being towed costs &pound;280 to release, plus &pound;55 a day storage. Outside the trial the same tickets are &pound;70 and &pound;50."}</p>
          <p class="mono" style="margin-top:.6rem"><a href="https://www.bcpcouncil.gov.uk/parking/trial-for-increased-parking-fines-and-penalty-charge-notices-pcn" target="_blank" rel="noopener">BCP&rsquo;s own page on the trial, including the map of affected roads &rarr;</a></p>
        </div>
      </div>
      <script>
      (function () {{
        // The trial is hard-dated. On 1 September this flips itself to the
        // general warning rather than shouting a price that no longer applies.
        var END = new Date(2026, 7, 31, 23, 59), st = document.getElementById('pk-state'), al = document.getElementById('pk-alert');
        if (!st || !al || new Date() <= END) return;
        st.textContent = 'PARKING FINES ON THE SEAFRONT';
        st.classList.add('off');
        al.innerHTML = 'BCP ran a trial of London-level penalty charges along the seafront in August 2026 (and August 2025 before it), so check before you travel in high summer &mdash; it may well run again. Outside any trial, a ticket for parking somewhere you are not allowed at all is <strong>&pound;70</strong> (&pound;35 within 14 days) and overstaying in a legal bay is <strong>&pound;50</strong> (&pound;25 within 14 days).';
      }})();
      </script>
    </section>'''

_PK_PROSE = f'''          <h2 id="carparks">What the seafront car parks actually cost</h2>
          <p>There is no single &ldquo;seafront price&rdquo; &mdash; BCP runs three different tariff bands along this coast, and the gap between them is wide. All prices below are as published by BCP on <strong>{_PK_CHECKED}</strong>; the council sets them in its February budget and changed them last on 16 March 2026.</p>
          <table>
            <thead><tr><th>Band</th><th>Summer (15 Mar&ndash;31 Oct)</th><th>Winter</th></tr></thead>
            <tbody>
{_PK_BAND_ROWS}
            </tbody>
          </table>
          <p><strong>Two things worth knowing before you drive down.</strong> Boscombe Undercliff &mdash; the biggest car park on this stretch, 355 spaces &mdash; charges by <em>arrival time</em> in high summer, so turning up after 4pm costs &pound;8.20 instead of &pound;19.10. And at the time of checking, BCP&rsquo;s own page for it carried a live notice: <em>&ldquo;We are currently unable to accept card payments at this location.&rdquo;</em> Cash or the app only. That is described as a fault rather than a policy, so check the page before you rely on it.</p>
          <p>Alumhurst Road, five minutes from Alum Chine, is the cheap outlier at <strong>&pound;5.80 for its four-hour maximum</strong> &mdash; no seasonal uplift, and a rare short-stay bargain within walking distance of sand.</p>

          <h2 id="cheaper">The cheaper ways, in order of how much they save</h2>
          <p><strong>The station on a weekend.</strong> Bournemouth station car park is <strong>&pound;3.00 all day on Saturdays, Sundays and bank holidays</strong> (APCOA, 362 spaces) &mdash; about an eighth of a seafront day, and roughly 1.6 miles from the beach by BCP&rsquo;s own reckoning. It is the least-published useful fact about parking here.</p>
          <p><strong>Avenue Road, in town.</strong> BCP&rsquo;s own recommended overflow: 900 spaces at <strong>&pound;12.90 for 24 hours</strong>, no seasonal uplift, about fifteen minutes&rsquo; walk down through the Gardens to the pier. On a busy Saturday it is usually still taking cars long after the seafront has stopped.</p>
          <p><strong>The Beach Breezer.</strong> Morebus&rsquo;s seafront bus, the 70, runs <strong>23 May to 13 September 2026</strong> from Rockley Park to Mudeford &mdash; Alum Chine, Bournemouth, Boscombe Pier, Hengistbury Head. Zone A fares, single fares capped at &pound;3, contactless accepted, and a Zone A Dayrider covers up to five people together.</p>
          <p><strong>If you live here.</strong> BCP&rsquo;s evening and weekend car park permits run 5pm&ndash;8am on weekdays and all day at weekends. Alumhurst Road is on the list at &pound;290 a year &mdash; effectively a beach season ticket that nobody markets as one.</p>

          <h2 id="onstreet">&ldquo;Where can I park for free?&rdquo; &mdash; the honest answer</h2>
          <p>We are not going to send you to somebody&rsquo;s street. This month in particular, guessing wrong costs &pound;110.</p>
          <p>What is true is that Bournemouth has no seafront-wide controlled parking zone. The residents&rsquo; permit zones here are <strong>small and specific</strong> &mdash; one of them covers little more than Windsor Road and part of Cecil Road &mdash; and they are signed at the kerb. Everything else is governed by the lines and the plates, which is exactly why the council keeps consulting on changing it.</p>
          <p>The mistake that actually catches people out is not the seafront at all. In the year to May 2026 the single biggest fine-earning road in the whole area was <strong>St Stephen&rsquo;s Road in the town centre &mdash; 389 tickets, &pound;24,160</strong> &mdash; a permit-zone street that visitors drift into while hunting for something free. If you want certainty, take the &pound;3 station option or the bus; if you want to read the actual restriction on any given street, BCP publishes the authoritative map at <a href="https://bcp.traffweb.app/" target="_blank" rel="noopener">bcp.traffweb.app</a>.</p>

          <h2 id="busy">When it fills up &mdash; and what the council does about it</h2>
          <p>BCP&rsquo;s own account of the hottest weekend of July 2025 is the clearest picture anyone has published: <em>&ldquo;Seafront car parks at Sandbanks and Boscombe were full by 10am on both days.&rdquo;</em> Across that Saturday and Sunday, 1,702 tickets were issued and 18 vehicles were towed.</p>
          <p>There is a published trigger, too: when Undercliff and Overstrand fill, <strong>Sea Road in Boscombe is closed at the junction with The Marina</strong>, and the signs on the A338 on the way in start showing which car parks still have spaces. Believe those signs &mdash; by the time you are on the seafront looking, the answer is usually no.</p>
          <p>The practical version: before 9.30am or after 4pm on a hot day, or park inland and walk down. The road closures in force and the buses moving right now are on the <a href="/bournemouth/live-map/">live map</a>.</p>

          <h2 id="access">Blue Badge, and getting onto the sand</h2>
          <p>Here is a gap we are not going to paper over. <strong>BCP does not publish whether a Blue Badge gives you free or extended parking in its own car parks.</strong> Both relevant council pages decline to say &mdash; one states only that &ldquo;the badge can only be used for on-street parking. Different rules apply to off-street car parks&rdquo;, and the other tells you that off-street rules &ldquo;vary between councils&rdquo; and that you should check the signs on display. So: read the sign at the machine before you pay, because that is literally the council&rsquo;s own instruction. The accessible bays themselves are marked on each car park&rsquo;s page &mdash; Boscombe Undercliff has 23, Durley Chine 7, Alum Chine 6.</p>
          <p><strong>Beach wheelchairs</strong> are free to borrow from the Bournemouth, Boscombe and Sandbanks beach offices, 9.30am&ndash;4.30pm, May to September, first come first served &mdash; but on a <strong>&pound;50 cash deposit</strong>, and there is one chair at each office. Take notes; nobody carries &pound;50 in cash to the beach.</p>
          <p>The <strong>West Cliff and Fisherman&rsquo;s Walk cliff lifts</strong> are running at &pound;3.00 a single (card only; a carer with a paying disabled passenger travels free). The <strong>East Cliff lift remains out of action</strong> after the cliff slide, with no reopening date published &mdash; so do not plan a route that depends on it.</p>

          <h2 id="paying">Paying, and one scam to know about</h2>
          <p>BCP moved to <strong>RingGo only</strong> in September 2025 &mdash; PayByPhone and JustPark no longer work here, whatever older pages say (including, at the time of writing, some of the council&rsquo;s own). Machines take card at most car parks, with the Boscombe Undercliff exception above.</p>
          <p>And BCP&rsquo;s own warning, worth repeating exactly: <em>&ldquo;RingGo does not use QR codes. If you see a QR code on a RingGo sign, do not scan it.&rdquo;</em> Fake QR stickers on parking signs are a real and current scam &mdash; they take you to a convincing payment page and harvest your card. If a sign has a code on it, ignore it and open the app yourself.</p>

          <h2 id="motorhomes">Motorhomes and coaches</h2>
          <p>The one clearly published option: <strong>Queen&rsquo;s Road car park is open 24 hours and accepts motorhomes and coaches</strong>, at &pound;6.40 for 24 hours. Whether you may <em>sleep</em> overnight in a vehicle on the seafront is genuinely contested in the sources we could find, so we are not going to tell you either way &mdash; ring BCP on 01202&nbsp;451451 before you plan a night in the van.</p>'''

_PK_FAQS = [
    ("How much is parking at Bournemouth beach?",
     f"It depends which car park. As published by BCP on {_PK_CHECKED}: the seafront band (Alum Chine, Durley Chine, Overstrand, Hengistbury Head and others) is &pound;3.20 for an hour and &pound;23.60 for 24 hours in summer; the pier-side car parks (Bath Road North and South, Pavilion) are dearer at &pound;3.80 an hour and &pound;28 for 24 hours. Winter prices are far lower &mdash; &pound;5.30 for 24 hours in the seafront band."),
    ("Where is the cheapest place to park for Bournemouth beach?",
     "On a Saturday, Sunday or bank holiday, Bournemouth station car park at &pound;3.00 all day is the cheapest realistic option &mdash; about 1.6 miles from the beach. In town, Avenue Road is &pound;12.90 for 24 hours with 900 spaces. Alumhurst Road, five minutes from Alum Chine, is &pound;5.80 for its four-hour maximum."),
    ("Is there any free parking near Bournemouth beach?",
     "There is no seafront-wide controlled zone, and the residents&rsquo; permit zones here are small and clearly signed &mdash; but we won&rsquo;t point you at particular streets, because the restrictions are set by the lines and the plates and getting it wrong is expensive. During August 2026 in particular, a wrongly-parked car on any road from Sandbanks to Southbourne costs &pound;110 or &pound;160. BCP&rsquo;s traffic-restriction map at bcp.traffweb.app shows the actual rules street by street."),
    ("What time do Bournemouth beach car parks fill up?",
     "On hot summer weekends, early. BCP reported that on the busiest weekend of July 2025 the Sandbanks and Boscombe car parks were full by 10am on both days. When Boscombe&rsquo;s car parks fill, Sea Road is closed at The Marina junction and the A338 signs show which car parks still have space."),
    ("Do Blue Badge holders park free in Bournemouth car parks?",
     "BCP does not publish an answer, and we are not going to guess one. The council&rsquo;s own guidance says a Blue Badge covers on-street parking and that &ldquo;different rules apply to off-street car parks&rdquo;, which &ldquo;vary between councils&rdquo; &mdash; and tells you to check the signs on display. So read the sign at the machine before paying."),
    ("How do I pay for parking in Bournemouth?",
     "Card at most machines, or the RingGo app &mdash; BCP switched to RingGo only in September 2025, so PayByPhone and JustPark no longer work. Boscombe Undercliff was unable to take card payments at the time we checked, so cash or app there. And note BCP&rsquo;s warning: RingGo does not use QR codes, so do not scan a QR code on a parking sign."),
]


def _pk_schema(s):
    return graph([
        crumb_sub(s, "Bournemouth365", "bournemouth", "Beach Parking"),
        webpage(s, "Parking for Bournemouth Beach",
                "What Bournemouth beach parking actually costs, where it is cheaper, and the rules that catch people out - sourced from BCP Council and dated."),
        faqpage(s, _PK_FAQS),
    ])


_PK_CONTENT = "\n".join([
    hero(bc_sub("Bournemouth365", "/bournemouth/", "Beach Parking"),
         "// BOURNEMOUTH365",
         'Parking for <em class="grad grad--cyan">Bournemouth beach</em>',
         f"What it actually costs, where it is cheaper, and the rules that catch people out &mdash; every price taken from BCP Council&rsquo;s own pages on {_PK_CHECKED}, and dated so you can see how fresh it is.",
         cta1=("This month&rsquo;s higher fines", "#fines"),
         cta2=("The cheaper options", "#cheaper"),
         chips=["Prices from BCP, dated", "No made-up free-parking tips", "Written by locals"]),
    _PK_ALERT,
    f'    <section class="section">\n      <div class="wrap">\n        <div class="prose" data-reveal>\n{_PK_PROSE}\n        </div>\n      </div>\n    </section>',
    faq_html(_PK_FAQS),
    _B365,
])

add(
    slug=_PK_SLUG,
    title="Bournemouth Beach Parking \u2014 Real Prices & Cheaper Options",
    desc=f"What Bournemouth beach parking costs in {_PK_CHECKED[-4:]}, where it is far cheaper, and the rules that catch people out \u2014 taken from BCP Council's own pages and dated.",
    og_title="Parking for Bournemouth beach \u2014 the honest guide",
    schema=_pk_schema,
    content=_PK_CONTENT,
    og_image="/bournemouth/media/og-sunrise-sunset.jpg",
)


# ============================================================================
# PAGE 5: /bournemouth/live-map/ - the landing page for the live 3D map.
# The built app sits at /bournemouth/live-map/app/ (owned by the map repo's
# deploy script - never edited here). It is opened INSIDE this page, in a
# frame created by script when the launcher is pressed, so the address bar
# stays on this URL and first paint costs nothing: the app is ~1.2 MB of
# code plus the CesiumJS engine (several MB) plus tiles. The frame must not
# exist in the built HTML - the build guard checks. The tiles at the top read
# the same same-origin JSON the map reads; a feed that does not answer shows
# its degraded state, and a stale reply is marked stale, never shown fresh.
# ============================================================================

_LM_SLUG = "bournemouth/live-map"
_LM_URL = f"{SITE}/{_LM_SLUG}/"
_LM_TITLE = "Bournemouth live map — buses, roads, rivers & flights, in 3D"
_LM_DESC = ("Live buses, flights, road closures, river levels and flood warnings, bathing-water and storm-overflow status, bike bays and the latest satellite pass over "
            "Bournemouth, Christchurch and Poole — every layer from a named public feed, free flat map first, 3D on request.")

_LM_TILES = '''    <section class="section b365" id="live-now" aria-label="Live counts from the map's feeds">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// THE FEEDS, RIGHT NOW</p>
          <h2 class="section-title section-title--center" data-title>What the map is reading at this moment<span class="title-underline title-underline--center"></span></h2>
        </div>
        <p class="b365-sub" data-reveal style="margin:0 0 1rem">These are the same feeds the map itself reads, fetched from our own server when you opened this page. Times are in your local time; hover a time for the exact UTC stamp. A feed that does not answer says so &mdash; nothing here is filled in from memory.</p>
        <div class="b365-hero" data-stagger>
          <div class="b365-tile" id="lm-tile-buses">
            <span class="chip-m" id="lm-buses-chip">MEASURED &middot; DfT BUS OPEN DATA</span>
            <div class="b365-num" id="lm-buses">&mdash;</div>
            <p class="b365-sub" id="lm-buses-sub">Buses tracked now across Bournemouth, Christchurch and Poole. Waiting for the feed&hellip; if this stays, the feed is down and we would rather say so than guess.</p>
            <p class="b365-foot" id="lm-buses-upd">updated &mdash;</p>
          </div>
          <div class="b365-tile" id="lm-tile-gauges">
            <span class="chip-m" id="lm-gauges-chip">MEASURED &middot; ENVIRONMENT AGENCY GAUGES</span>
            <div class="b365-num" id="lm-gauges">&mdash;</div>
            <p class="b365-sub" id="lm-gauges-sub">River and tide gauges reporting a reading. Waiting for the feed&hellip;</p>
            <p class="b365-foot" id="lm-gauges-upd">updated &mdash;</p>
          </div>
          <div class="b365-tile" id="lm-tile-warn">
            <span class="chip-f" id="lm-warn-chip">OFFICIAL STATUS &middot; ENVIRONMENT AGENCY</span>
            <div class="b365-num" id="lm-warn">&mdash;</div>
            <p class="b365-sub" id="lm-warn-sub">Flood warnings and alerts in force for the area. <strong>No active warnings is not the same as no flood risk.</strong> Check the Environment Agency&rsquo;s own warnings page before you act on this.</p>
            <p class="b365-foot" id="lm-warn-upd">updated &mdash;</p>
          </div>
          <div class="b365-tile" id="lm-tile-sea">
            <span class="chip-f" id="lm-sea-chip">OFFICIAL STATUS &middot; EA + WATER COMPANIES</span>
            <div class="b365-num" id="lm-sea">&mdash;</div>
            <p class="b365-sub" id="lm-sea-sub">Storm overflows their water company reports as discharging right now, and the Environment Agency&rsquo;s bathing-water forecast for the area&rsquo;s beaches. <strong>Their published status, not a verdict on swimming.</strong> Waiting for the feed&hellip;</p>
            <p class="b365-foot" id="lm-sea-upd">updated &mdash;</p>
          </div>
          <div class="b365-tile" id="lm-tile-roads">
            <span class="chip-f" id="lm-roads-chip">OFFICIAL STATUS &middot; NATIONAL HIGHWAYS</span>
            <div class="b365-num" id="lm-roads">&mdash;</div>
            <p class="b365-sub" id="lm-roads-sub">Road closures in force on the National Highways network around the conurbation. Waiting for the feed&hellip;</p>
            <p class="b365-foot" id="lm-roads-upd">updated &mdash;</p>
          </div>
          <div class="b365-tile" id="lm-tile-air">
            <span class="chip-m" id="lm-air-chip">MEASURED &middot; ADS-B VIA ADSB.LOL</span>
            <div class="b365-num" id="lm-air">&mdash;</div>
            <p class="b365-sub" id="lm-air-sub">Aircraft transmitting a position within range of the centre of the map. Waiting for the feed&hellip;</p>
            <p class="b365-foot" id="lm-air-upd">updated &mdash;</p>
          </div>
          <div class="b365-tile" id="lm-tile-sat">
            <span class="chip-f" id="lm-sat-chip">OFFICIAL &middot; COPERNICUS SENTINEL-2</span>
            <div class="b365-num" id="lm-sat" style="font-size:clamp(1.5rem,4.2vw,2.5rem)">&mdash;</div>
            <p class="b365-sub" id="lm-sat-sub">The most recent satellite pass over the area and how much of it was cloud. Waiting for the scene metadata&hellip;</p>
            <p class="b365-foot" id="lm-sat-upd">updated &mdash;</p>
          </div>
          <div class="b365-tile b365-tile--dusk" id="lm-tile-tiles">
            <span class="chip-f" id="lm-tiles-chip">COMPUTED &middot; OUR OWN COUNTER</span>
            <div class="b365-num" id="lm-tiles">&mdash;<small>of 30</small></div>
            <p class="b365-sub" id="lm-tiles-sub">3D city views left today. Google bills each one to us, so the 3D city loads only when someone asks for it.</p>
            <p class="b365-foot" id="lm-tiles-upd">updated &mdash;</p>
          </div>
        </div>
        <p class="b365-foot" data-reveal>Chips: MEASURED is an instrument or transponder reporting; OFFICIAL STATUS is a public body&rsquo;s own published state; COMPUTED is arithmetic we do ourselves. Test hooks for our own checks: <span class="mono">?b365test=stale</span> and <span class="mono">?b365test=down</span> force the stale and offline presentations of real data &mdash; nothing is invented.</p>
      </div>
    </section>'''

_LM_LAUNCH = '''    <section class="section b365" id="map" aria-label="Open the live map">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// THE MAP</p>
          <h2 class="section-title section-title--center" data-title>Open the Bournemouth365 live map<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="b365-launch" data-reveal>
          <img src="/bournemouth/media/og-live-map.jpg" width="1200" height="630" loading="lazy" alt="The Bournemouth365 live map on the flat map view, showing Bournemouth town centre and the seafront" />
          <div>
            <button type="button" id="b365-map-launch" class="button primary button--lg">Open the live map</button>
            <p class="b365-launch-note">The map opens right here, on top of this page, and closes with the button at the top or the Escape key. It is a heavier download than the rest of Bournemouth365 &mdash; about 1.2 MB of application code plus the CesiumJS map engine (several MB more) plus the map tiles as you pan &mdash; which is exactly why it loads only when you open it, never on arrival. It opens on the free OpenStreetMap flat map with every live layer working; the 3D city is a separate button inside the map.</p>
            <p class="b365-launch-note">No JavaScript? <a href="/bournemouth/live-map/app/">Open the map app directly</a> instead.</p>
          </div>
        </div>
      </div>
    </section>'''

# Source / what / licence / attribution. Attribution strings are copied
# verbatim from the app's DATA_SOURCES.md and dataCredits.js - several are a
# condition of use. Change them there first, never here alone.
_LM_SOURCES = [
    ('<a href="https://www.bus-data.dft.gov.uk/" target="_blank" rel="noopener">DfT Bus Open Data Service</a>',
     "Live bus positions",
     '<a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener">Open Government Licence v3.0</a>',
     "Contains public sector information licensed under the Open Government Licence v3.0"),
    ('<a href="https://environment.data.gov.uk/flood-monitoring/doc/reference" target="_blank" rel="noopener">Environment Agency real-time data API (Beta)</a>',
     "River levels, tide gauges, flood warnings",
     '<a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener">Open Government Licence v3.0</a>',
     "Dorset water &amp; flood data: uses Environment Agency flood and river level data from the real-time data API (Beta) &mdash; &copy; Environment Agency, Open Government Licence v3.0"),
    ('<a href="https://environment.data.gov.uk/bwq/profiles/" target="_blank" rel="noopener">Environment Agency bathing water quality (Swimfo)</a>',
     "Today&rsquo;s pollution-risk forecast, annual classification and heavy-rain flag for every designated beach in the area",
     '<a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener">Open Government Licence v3.0</a>',
     "Bathing water status: Environment Agency bathing water quality data &mdash; &copy; Environment Agency, Open Government Licence v3.0"),
    ('<a href="https://www.streamwaterdata.co.uk/" target="_blank" rel="noopener">Wessex Water and Southern Water Storm Overflow Activity</a> via Stream',
     "Near-real-time storm overflow status for monitored outfalls: discharging, not discharging, monitor offline, and the last event times",
     '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>',
     "Storm overflow activity: &copy; Wessex Water and &copy; Southern Water, CC BY 4.0, via Stream &mdash; relayed as published, never our verdict"),
    ('<a href="https://developer.data.nationalhighways.co.uk/" target="_blank" rel="noopener">National Highways Transport Data Feeds</a>',
     "Road closures (DATEX II) and planned works",
     "National Highways developer-portal terms (OGL-based); the wording is a condition of use",
     "Powered by National Highways&#39; Transport Data Feeds. Planned works: &copy; National Highways &mdash; Contains public sector information licensed under the Open Government Licence v3.0"),
    ('<a href="https://beryl.cc" target="_blank" rel="noopener">Beryl</a> BCP GBFS feed',
     "Bike hire bays and availability",
     '<a href="https://cdla.dev/permissive-2-0/" target="_blank" rel="noopener">CDLA-Permissive-2.0</a>',
     "Beryl BCP scheme GBFS feed (CDLA-Permissive-2.0)"),
    ('<a href="https://adsb.lol" target="_blank" rel="noopener">adsb.lol</a>',
     "Flights and aircraft traces (ADS-B)",
     "ODbL 1.0",
     "adsb.lol (ODbL 1.0)"),
    ('<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
     "The free flat basemap, and the road geometry the traffic layer draws on",
     "ODbL 1.0 and the OSMF tile usage policy",
     "&copy; OpenStreetMap contributors (ODbL 1.0) &mdash; shown on screen while the tiles show"),
    ('<a href="https://www.tomtom.com" target="_blank" rel="noopener">TomTom</a> Traffic API',
     "Live congestion colouring, only on roads where flow is measured",
     '<a href="https://developer.tomtom.com/" target="_blank" rel="noopener">TomTom for Developers</a> terms (commercial use permitted)',
     "Traffic flow data &copy; TomTom &mdash; in the map&rsquo;s credits whenever live flow is drawn"),
    ('<a href="https://dataspace.copernicus.eu/" target="_blank" rel="noopener">Copernicus Sentinel-2 L2A</a> via the Copernicus Data Space Ecosystem',
     "The latest satellite pass",
     '<a href="https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice" target="_blank" rel="noopener">Copernicus Sentinel Data Legal Notice</a>',
     "Contains modified Copernicus Sentinel data [Year] &mdash; [Year] is the year the scene was captured, filled in when the scene metadata arrives"),
    ('<a href="https://developers.google.com/maps/documentation/tile/policies" target="_blank" rel="noopener">Google Photorealistic 3D Tiles</a>',
     "The 3D city, only after you press the 3D button",
     "Google Maps Platform terms",
     "Google&rsquo;s own attribution, rendered on screen by the map&rsquo;s credit line while 3D is showing"),
    ('<a href="/signal/">365 Techies community signal tests</a>',
     "Mobile signal &mdash; median download speed from community phone tests",
     "365 Techies&rsquo; own data &mdash; aggregated cells only, not published for reuse",
     "365 Techies community &middot; 365techies.co.uk/signal"),
    ("Software",
     "The map application and its engine",
     "God&rsquo;s Eye View (MIT) on CesiumJS (Apache-2.0)",
     'Software: built on God&#39;s Eye View &copy; 2026 Bilawal Sidhu (MIT); CesiumJS (Apache-2.0) and other open-source components &mdash; <a href="/bournemouth/live-map/app/THIRD-PARTY-NOTICES.txt" target="_blank" rel="noopener">third-party notices</a>'),
]

_LM_SOURCE_ROWS = "\n".join(
    f'            <tr><td>{src}</td><td>{what}</td><td>{lic}</td><td>{att}</td></tr>'
    for src, what, lic, att in _LM_SOURCES)

_LM_PROSE = f'''          <h2 id="layers">What you are seeing</h2>
          <p>Every layer on the Bournemouth365 live map is a named public feed drawn where it says it is. Nothing is modelled, interpolated or guessed; where a feed goes quiet the layer says so instead of holding its last value.</p>
          <p><strong>Buses.</strong> Vehicle positions from the Department for Transport&rsquo;s Bus Open Data Service &mdash; the same feed the operators publish for their own apps. Our server re-reads it every 12 seconds and the map moves the buses every 15. A bus that stops reporting is dropped after four minutes rather than left parked on the map.</p>
          <p><strong>Flights.</strong> Aircraft transmitting ADS-B, received by the adsb.lol community network and read every 25 seconds. It is what is being received, not the airport&rsquo;s schedule: an aircraft nobody is receiving is not on the map.</p>
          <p><strong>Road closures and planned works.</strong> National Highways&rsquo; own feeds for its network, read every minute. This covers the trunk roads (the A31, A338 and A35 corridors), not every council-managed street; a closure BCP Council runs on a seafront road is not in this feed.</p>
          <p><strong>Traffic.</strong> The road geometry is OpenStreetMap. Colouring a road with live congestion needs measured flow data &mdash; ours is TomTom&rsquo;s traffic flow, credited on the map whenever it is drawn &mdash; and a road we have no measured flow for is left uncoloured, never coloured from a guess.</p>
          <p><strong>River levels and flood warnings.</strong> The Environment Agency&rsquo;s real-time data API: river and tide gauges on the Stour, Avon and the harbour report on roughly a 15-minute cycle, and flood alerts and warnings are re-read every five minutes. <strong>No active warnings is not the same as no flood risk.</strong></p>
          <p><strong>Bike bays.</strong> The Beryl BCP scheme&rsquo;s public GBFS feed &mdash; bay locations and how many bikes are docked, read every three minutes.</p>
          <p><strong>The latest satellite pass.</strong> The most recent Sentinel-2 scene over the area from the Copernicus Data Space Ecosystem, with its capture date and cloud cover. Sentinel-2 revisits every few days, and our server checks for a new scene every six hours &mdash; so this layer is days old by design, and its date says so.</p>
          <p><strong>Mobile signal.</strong> The community speed tests from our own <a href="/signal/">signal checker</a> &mdash; real phone tests submitted by the public, drawn as grid cells holding the <strong>median download speed</strong> of the tests taken inside each one. These are phone speed tests, not radio measurements: there is no signal-strength reading behind them. A cell stays a quiet grey outline until enough tests have been taken in it &mdash; five on the coast, eight inland &mdash; and says how many more it needs, which is an invitation rather than a verdict. It aggregates across all networks by design and compares no operators. Our van&rsquo;s own drive-test readings are a separate dataset, published under CC BY 4.0 on the <a href="/van-signal-map/">mobile signal map</a>.</p>
          <p><strong>The 3D city.</strong> Google&rsquo;s Photorealistic 3D Tiles, loaded only when you press the 3D button inside the map &mdash; see below for why.</p>

          <h2 id="sources">Where the data comes from</h2>
          <p>Each feed keeps its own licence, and several require particular wording. The wording below is copied exactly from the map&rsquo;s own credits.</p>
          <table>
            <thead><tr><th>Source</th><th>What it supplies</th><th>Licence</th><th>Attribution, as required</th></tr></thead>
            <tbody>
{_LM_SOURCE_ROWS}
            </tbody>
          </table>

          <h2 id="why3d">Why 3D asks first</h2>
          <p>Google bills the 3D city per view. The map therefore opens on the free OpenStreetMap flat map with every live layer already working, and the 3D city loads only when someone asks for it. There are 30 3D views a day across everyone who visits; the counter at the top of this page shows how many are left, and when they are gone the 3D button inside the map says so and comes back after midnight UTC. Nothing else on the map is metered.</p>

          <h2 id="phone">Works on a phone, but</h2>
          <p>The map is a heavier download than the rest of Bournemouth365: about 1.2 MB of application code, the CesiumJS engine at several MB more, and then map tiles as you move around. It runs on a modern phone, and the flat map is the light version &mdash; but open it on Wi-Fi or good 4G rather than on a thin signal on the beach, and expect the 3D city to be the part that asks most of an older device. The rest of this page, including the live counts at the top, is as light as every other Bournemouth365 page.</p>'''

_LM_FAQS = [
    ("Is the Bournemouth live map really live?",
     "Yes. Every layer polls a named public feed while the map is open, and the counts at the top of this page are fetched from the same feeds when the page loads, each with the time its feed last answered. When a feed does not answer, its tile says feed offline and shows no number &mdash; an old value is never shown as a fresh one."),
    ("How often does each layer update?",
     "Buses: the feed is re-read every 12 seconds and the map moves them every 15. Flights: every 25 seconds. Road closures: every minute. Flood warnings: every five minutes. River and tide gauges: on the Environment Agency&rsquo;s own cycle of roughly 15 minutes. Bike bays: every three minutes. The satellite scene changes only when Sentinel-2 passes over again, every few days, and we check for a new one every six hours."),
    ("Why are there no traffic colours on some roads?",
     "Because colouring a road needs measured flow data for that road, and ours comes from TomTom&rsquo;s traffic API. The road geometry itself is OpenStreetMap; where TomTom reports no flow for a road, it stays uncoloured rather than being coloured from a guess. The map&rsquo;s strapline is measured, not modelled, and that applies to traffic too."),
    ("Why does the 3D city ask before it loads?",
     "Google bills the 3D city per view, so the map opens on the free OpenStreetMap flat map with every live layer working and loads the 3D city only when someone presses the button. There are 30 3D views a day in total; when they are gone the button says so, and the count resets after midnight UTC."),
    ("Does the map track me?",
     "No. There is no account, the map sets no cookies and runs no analytics of its own, and at the time of writing it never asks for your location. It remembers which layers you switched on in your own browser&rsquo;s storage and nowhere else. The live counts on this page come from our own server, which reads the public feeds on your behalf."),
    ("Will it work on my phone?",
     "Yes, on a modern phone, but it is a heavy download compared with the rest of Bournemouth365 &mdash; about 1.2 MB of application code plus the CesiumJS engine and then map tiles. Open it on Wi-Fi or good 4G. The flat map is the light version; the 3D city is the part that asks most of an older device."),
    ("Does the map tell me whether it&rsquo;s safe to swim?",
     "No &mdash; and nothing honest can, from a desk. What the sea water layer shows is two published facts, each named for who published it: the Environment Agency&rsquo;s daily pollution-risk forecast for every designated beach from Poole Harbour round to Christchurch Bay (normal or increased, with the time it expires, plus the beach&rsquo;s annual classification), and the water companies&rsquo; own near-real-time reports of which storm overflows are discharging and which discharged in the last two days. A forecast leaves the map the moment it expires, and an overflow report its company has not updated for three hours is marked unconfirmed rather than left looking current. After heavy rain, check the Environment Agency&rsquo;s Swimfo page for the beach before you go in &mdash; the map links to it."),
]

# The live-counts painter. Plain string (no f-string) so the JS braces stay
# sane. One script, seven parallel fetches, each with its own catch: the
# page paints before any of them return, and a feed that fails degrades its
# own tile only.
_LM_JS = '''      <script>
      (function () {
        var Q = location.search;
        var TEST_STALE = Q.indexOf('b365test=stale') > -1, TEST_DOWN = Q.indexOf('b365test=down') > -1;
        function el(id) { return document.getElementById(id); }
        function hhmm(iso) { var d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
        function dmy(iso) { var d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
        function setChip(id, kind, txt) { var e = el(id); if (e) { e.className = kind; e.textContent = txt; } }
        function state(id, cls) {
          var e = el('lm-tile-' + id);
          if (e) { e.classList.remove('b365-fresh', 'b365-stale', 'b365-down'); if (cls) e.classList.add(cls); }
        }
        function num(id, html) { var e = el('lm-' + id); if (e) e.innerHTML = html; }
        function sub(id, txt) { var e = el('lm-' + id + '-sub'); if (e) e.textContent = txt; }
        function upd(id, label, iso) {
          var e = el('lm-' + id + '-upd'); if (!e) return;
          if (iso && hhmm(iso)) { e.textContent = label + ' ' + hhmm(iso); e.title = iso; }
          else { e.textContent = label; e.removeAttribute('title'); }
        }
        var NOW_ISO = new Date().toISOString();
        function down(id, chipId, kind, label, d) {
          // ok:false, a failed fetch or an unusable reply: the degraded state.
          // No number, and never the last number dressed as a fresh one.
          state(id, 'b365-down');
          setChip(chipId, kind, label + ' \\u00b7 FEED OFFLINE');
          num(id, '&#8212;&#8212;');
          if (d && d.generated) upd(id, 'feed offline since', d.generated);
          else upd(id, 'feed offline \\u2014 no reply at', NOW_ISO);
          if (d && d.reason) sub(id, String(d.reason));
        }
        function paint(id, chipId, kind, label, d, freshMs, fn) {
          if (TEST_DOWN) d = { ok: false, reason: 'TEST \\u2014 forced offline presentation; nothing here is invented.' };
          if (!d || !d.ok) { down(id, chipId, kind, label, d); return; }
          if (TEST_STALE) { d.stale = true; d.reason = d.reason || 'TEST \\u2014 forced stale presentation of real data.'; }
          var age = d.generated ? Date.now() - new Date(d.generated).getTime() : Infinity;
          if (d.stale) {
            state(id, 'b365-stale');
            setChip(chipId, kind, label + ' \\u00b7 STALE');
            upd(id, 'last heard', d.generated);
          } else {
            // the pulse only on data younger than its fresh window (house rule)
            state(id, age <= freshMs ? 'b365-fresh' : '');
            setChip(chipId, kind, label);
            upd(id, 'updated', d.generated);
          }
          try { fn(d); } catch (e) { /* the baked copy stays */ }
          if (d.stale && d.reason) sub(id, 'Stale: ' + d.reason);
        }
        function get(url) {
          return fetch(url, { credentials: 'omit', cache: 'no-store' })
            .then(function (r) { return r.json(); })
            .catch(function () { return null; });
        }
        var urls = ['/api/dorset-buses.php', '/api/dorset-water.php', '/api/dorset-floods.php', '/api/dorset-roads.php',
                    '/api/dorset-flights.php', '/api/dorset-satellite.php?meta=1', '/api/dorset-tiles.php?status=1',
                    '/api/dorset-seawater.php'];
        Promise.all(urls.map(get)).then(function (r) {
          paint('buses', 'lm-buses-chip', 'chip-m', 'MEASURED \\u00b7 DfT BUS OPEN DATA', r[0], 60000, function (d) {
            num('buses', String(d.count));
            sub('buses', 'Buses reporting a position across Bournemouth, Christchurch and Poole. Our server re-reads the feed every 12 seconds; the map moves them every 15.');
          });
          paint('gauges', 'lm-gauges-chip', 'chip-m', 'MEASURED \\u00b7 ENVIRONMENT AGENCY GAUGES', r[1], 30 * 60000, function (d) {
            num('gauges', String(d.withValues) + '<small>of ' + d.count + '</small>');
            sub('gauges', 'River and tide gauges in the area with a reading; the Environment Agency publishes on roughly a 15-minute cycle.');
          });
          paint('warn', 'lm-warn-chip', 'chip-f', 'OFFICIAL STATUS \\u00b7 ENVIRONMENT AGENCY', r[2], 10 * 60000, function (d) {
            var n = (d.inForce !== undefined && d.inForce !== null) ? d.inForce : d.count;
            num('warn', String(n));
          });
          paint('sea', 'lm-sea-chip', 'chip-f', 'OFFICIAL STATUS \u00b7 EA + WATER COMPANIES', r[7], 15 * 60000, function (d) {
            num('sea', String(d.discharging) + '<small>of ' + d.overflows + ' monitored overflows discharging</small>');
            var inc = d.increasedRisk || 0;
            sub('sea', d.beaches + ' designated beaches from Poole Harbour to Christchurch Bay: ' + (inc ? inc + ' with an increased pollution-risk forecast from the Environment Agency today, ' + (d.beaches - inc) + ' normal' : 'all on a normal pollution-risk forecast from the Environment Agency today') + '. ' + d.recentDischarges48h + ' overflow' + (d.recentDischarges48h === 1 ? '' : 's') + ' discharged in the last 48 hours. <strong>Their published status, not a verdict on swimming</strong> \u2014 the map links each beach to its Swimfo page.');
          });
          paint('roads', 'lm-roads-chip', 'chip-f', 'OFFICIAL STATUS \\u00b7 NATIONAL HIGHWAYS', r[3], 2 * 60000, function (d) {
            num('roads', String(d.count));
            sub('roads', 'Closures in force on the National Highways network around the conurbation, read every minute. Council-run street closures are not in this feed.');
          });
          paint('air', 'lm-air-chip', 'chip-m', 'MEASURED \\u00b7 ADS-B VIA ADSB.LOL', r[4], 60000, function (d) {
            num('air', String(d.count));
            sub('air', 'Aircraft transmitting ADS-B within ' + d.radiusNm + ' nautical miles of the centre of the map \\u2014 what is being received, not a schedule.');
          });
          paint('sat', 'lm-sat-chip', 'chip-f', 'OFFICIAL \\u00b7 COPERNICUS SENTINEL-2', r[5], 12 * 3600000, function (d) {
            if (d.captured) {
              num('sat', dmy(d.captured));
              var cc = (d.cloudCover !== undefined && d.cloudCover !== null) ? Math.round(d.cloudCover) + '% cloud cover' : 'cloud cover not reported';
              sub('sat', 'Most recent Sentinel-2 scene over the area, captured ' + hhmm(d.captured) + ' on that date \\u2014 ' + cc + '. Contains modified Copernicus Sentinel data ' + new Date(d.captured).getUTCFullYear() + '.');
            } else {
              num('sat', 'date unavailable');
              sub('sat', d.capturedReason ? String(d.capturedReason) : 'The scene metadata carries no capture date.');
            }
          });
          paint('tiles', 'lm-tiles-chip', 'chip-f', 'COMPUTED \\u00b7 OUR OWN COUNTER', r[6], 60000, function (d) {
            num('tiles', String(d.remaining) + '<small>of 30</small>');
            sub('tiles', d.remaining > 0
              ? '3D city views left today. Google bills each one to us, so the 3D city loads only when someone asks for it.'
              : 'None left today. The 3D button inside the map says so, and the counter comes back after midnight UTC' + (d.resetsAt && hhmm(d.resetsAt) ? ' (' + hhmm(d.resetsAt) + ' your time)' : '') + '.');
          });
        });
      })();
      </script>
      <script>
      (function () {
        // The launcher. The app frame is created here, on click, and removed
        // on close - it is never part of the page as served, so the address
        // bar stays on this URL and first paint costs nothing.
        var btn = document.getElementById('b365-map-launch');
        if (!btn) return;
        var ov = null, lastFocus = null;
        function onKey(e) { if (e.key === 'Escape') close(); }
        function close() {
          if (!ov) return;
          ov.parentNode.removeChild(ov); ov = null;
          document.body.classList.remove('b365-mapov-open');
          document.removeEventListener('keydown', onKey);
          if (location.hash === '#map') history.replaceState(null, '', location.pathname + location.search);
          if (lastFocus && lastFocus.focus) lastFocus.focus();
        }
        function open() {
          if (ov) return;
          lastFocus = document.activeElement;
          ov = document.createElement('div');
          ov.className = 'b365-mapov';
          ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Bournemouth365 live map');
          var bar = document.createElement('div'); bar.className = 'b365-mapov__bar';
          var brand = document.createElement('span'); brand.textContent = 'Bournemouth365 live map';
          var back = document.createElement('button'); back.type = 'button'; back.textContent = 'Back to the page'; back.title = 'Close the map (Esc)';
          back.addEventListener('click', close);
          bar.appendChild(brand); bar.appendChild(back);
          var fr = document.createElement('iframe');
          fr.className = 'b365-mapov__frame';
          fr.src = '/bournemouth/live-map/app/';
          fr.title = 'Bournemouth365 live map';
          fr.setAttribute('allow', 'fullscreen');   // the map never asks for your location; the FAQ says so, so the frame cannot either
          fr.setAttribute('loading', 'eager');
          fr.style.cssText = 'width:100%;height:100%;border:0';
          ov.appendChild(bar); ov.appendChild(fr);
          document.body.appendChild(ov);
          document.body.classList.add('b365-mapov-open');
          document.addEventListener('keydown', onKey);
          back.focus();
        }
        btn.addEventListener('click', open);
        function auto() { if (location.hash === '#map' || /[?&]map=1(&|$)/.test(location.search)) open(); }
        window.addEventListener('hashchange', function () { if (location.hash === '#map') open(); });
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
      })();
      </script>'''


def _lm_schema(s):
    return graph([
        crumb_sub(s, "Bournemouth365", "bournemouth", "Live map"),
        webpage(s, "Bournemouth live map", _LM_DESC),
        {"@type": "WebApplication", "@id": _LM_URL + "#app", "name": "Bournemouth365 live map",
         "url": _LM_URL, "applicationCategory": "MapApplication", "operatingSystem": "Any (web browser)",
         "isAccessibleForFree": True,
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"},
         "publisher": {"@id": SITE + "/#business"}},
        faqpage(s, _LM_FAQS),
    ])


_LM_CONTENT = "\n".join([
    hero(bc_sub("Bournemouth365", "/bournemouth/", "Live map"),
         "// BOURNEMOUTH365",
         'Bournemouth, Christchurch &amp; Poole &mdash; <em class="grad grad--cyan">live, in 3D</em>',
         "Buses, flights, road closures, river levels and flood warnings, sea water quality, bike bays and the latest satellite pass, each drawn from a named public feed onto one map &mdash; free on the flat map, with the 3D city loaded only when you ask for it.",
         cta1=("Open the live map", "#map"),
         cta2=("What you are seeing", "#layers"),
         chips=["Measured, not modelled", "Free flat map, 3D on request", "No ads, no paywall"]),
    _LM_TILES,
    _LM_LAUNCH,
    f'    <section class="section">\n      <div class="wrap">\n        <div class="prose" data-reveal>\n{_LM_PROSE}\n        </div>\n      </div>\n    </section>',
    faq_html(_LM_FAQS),
    _B365,
    _LM_JS,
])

add(
    slug=_LM_SLUG,
    title=_LM_TITLE,
    desc=_LM_DESC,
    og_title="Bournemouth, Christchurch & Poole — live, in 3D",
    schema=_lm_schema,
    content=_LM_CONTENT,
    og_image="/bournemouth/media/og-live-map.jpg",
)
