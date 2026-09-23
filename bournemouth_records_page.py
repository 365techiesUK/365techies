"""
/bournemouth/weather-records/ - Bournemouth's weather records since 1957 (23 Sep 2026).

WHY
The weather page's record-books card says where today stands; this is the whole
book: the hottest and coldest days on record, every month's records and averages,
how the averages have moved over 69 years, when the first frost and the first
25-degree day usually come, and a lookup for any date. It is what people search
for after a hot day ("hottest day ever in Bournemouth") and what the posts and
reels quote.

WHERE THE NUMBERS COME FROM
Every figure is computed by tools/bm-records/build_records.py from the Met
Office's MIDAS Open daily temperature files for station 00842 Hurn (Bournemouth
Airport), 1957 to the end of the last complete year, Open Government Licence, and
written to tools/bm-records/stats.json. This module only lays that file out; it
invents nothing, and a figure the file lacks is left out rather than guessed.
Rebuild the file when the Met Office's next annual release lands (each July).

HONESTY
"On record" means at that station since 1957. The station is the airport, 7 km
inland; the seafront is a little milder in winter and a little cooler on a hot
afternoon, and the page says so. A day's maximum is the 09:00-21:00 reading, its
minimum the night to 09:00, the Met Office convention.
"""
import json, os, re
import build_pages as _bp
from build_pages import add, graph, crumb_sub, webpage, faqpage, faq_html, hero, bc_sub
import bournemouth_places as _pl

_SLUG = "bournemouth/weather-records"
_STATS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tools", "bm-records", "stats.json")


def _deg(v):
    if v is None: return "&mdash;"
    v = float(v)
    s = ("%d" % int(round(v))) if abs(v - round(v)) < 0.05 else ("%.1f" % v)
    return s.replace("-", "&minus;") + "&deg;"


def _esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _load():
    with open(_STATS, encoding="utf-8") as fh:
        return json.load(fh)


_HEAD = '''
  <style>
    .bwr-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.9rem;margin:0 0 1.6rem}
    .bwr-tile .b365-num{font-size:clamp(2.2rem,5.5vw,3.4rem)}
    .bwr-when{font-family:var(--mono,ui-monospace,monospace);font-size:.82rem;color:var(--b365-mute);letter-spacing:.04em;margin:.25rem 0 0}
    .bwr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem 1.4rem;margin:0 0 1.2rem}
    .bwr-table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:.95rem}
    .bwr-table caption{text-align:left;font-weight:650;color:var(--b365-foam);padding:0 0 .45rem;font-size:1.02rem}
    .bwr-table th,.bwr-table td{padding:.42rem .55rem;border-bottom:1px solid var(--b365-line);text-align:left;vertical-align:top}
    .bwr-table th{font-family:var(--mono,ui-monospace,monospace);font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;color:var(--b365-mute);font-weight:600}
    .bwr-table td.n,.bwr-table th.n{text-align:right;white-space:nowrap}
    .bwr-table td b{color:var(--b365-foam);font-weight:650}
    .bwr-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 0 1.2rem}
    .bwr-up{color:#ffb36b}.bwr-down{color:#8fd3ff}
    .bwr-look{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin:.6rem 0 1rem}
    .bwr-look select{font:inherit;padding:.5rem .7rem;border-radius:10px;border:1px solid var(--b365-line);background:var(--b365-water);color:var(--b365-foam);min-width:7rem}
    .bwr-out{border:1px solid var(--b365-line);border-radius:12px;padding:.9rem 1.1rem;background:var(--b365-water)}
    .bwr-out p{margin:.25rem 0}
    .bwr-out .big{font-size:1.25rem;font-weight:650;color:var(--b365-foam);margin:0 0 .35rem}
    .bwr-marks{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:.9rem;margin:0 0 1.4rem}
    .bwr-marks .b365-tile p{margin:.2rem 0}
    @media (prefers-reduced-motion:reduce){.bwr-out{transition:none}}
  </style>
'''


def _tile(num, label, when):
    return (f'          <div class="b365-tile bwr-tile"><p class="b365-num">{num}</p><p class="b365-sub">{label}</p>'
            f'<p class="bwr-when">{when}</p></div>')


def _top_table(caption, rows, what):
    body = "\n".join(f'              <tr><td>{i + 1}</td><td>{_esc(d)}</td><td class="n"><b>{_deg(v)}</b></td></tr>' for i, (d, v) in enumerate(rows))
    return (f'          <table class="bwr-table"><caption>{caption}</caption>\n            <thead><tr><th>#</th><th>Date</th><th class="n">{what}</th></tr></thead>\n'
            f'            <tbody>\n{body}\n            </tbody></table>')


def _months_table(s):
    rows = []
    for m in s["months"]:
        chg = (m["late_hi"] - m["early_hi"]) if (m["late_hi"] is not None and m["early_hi"] is not None) else None
        chg_html = "&mdash;" if chg is None else (f'<span class="{"bwr-up" if chg > 0 else "bwr-down"}">{"+" if chg > 0 else ""}{chg:.1f}&deg;</span>')
        lo = f'<b>{_deg(m["lo"][0])}</b><br /><span class="bwr-when">{_esc(m["lo"][1])}</span>' if m["lo"] else "&mdash;"
        rows.append(f'              <tr><th scope="row">{m["name"]}</th>'
                    f'<td class="n"><b>{_deg(m["hi"][0])}</b><br /><span class="bwr-when">{_esc(m["hi"][1])}</span></td>'
                    f'<td class="n">{lo}</td><td class="n">{_deg(m["avg_hi"])}</td><td class="n">{_deg(m["avg_lo"])}</td>'
                    f'<td class="n">{_deg(m["early_hi"])}</td><td class="n">{_deg(m["late_hi"])}</td><td class="n">{chg_html}</td></tr>')
    return ('          <table class="bwr-table"><caption>Every month&rsquo;s records and averages</caption>\n'
            '            <thead><tr><th>Month</th><th class="n">Hottest day</th><th class="n">Coldest night</th><th class="n">Average high</th>'
            f'<th class="n">Average low</th><th class="n">Avg high {s["early"]}</th><th class="n">Avg high {s["late"]}</th><th class="n">Change</th></tr></thead>\n'
            "            <tbody>\n" + "\n".join(rows) + "\n            </tbody></table>")


def _decades_table(s):
    rows = "\n".join(f'              <tr><th scope="row">{d["label"]}</th><td>{d["years"]} ({d["n"]} yrs)</td><td class="n"><b>{_deg(d["avg_hi"])}</b></td>'
                     f'<td class="n">{_deg(d["avg_lo"])}</td><td class="n">{d["days25"]:.0f}</td></tr>' for d in s["decades"])
    return ('          <table class="bwr-table"><caption>Decade by decade</caption>\n'
            '            <thead><tr><th>Decade</th><th>Years</th><th class="n">Average high, all year</th><th class="n">Average low</th><th class="n">Days of 25&deg; or more, per year</th></tr></thead>\n'
            f"            <tbody>\n{rows}\n            </tbody></table>")


def _markers(s):
    mk = s["markers"]
    ff, lf, f25, d25 = mk["first_frost"], mk["last_frost"], mk["first_25"], mk["days25"]
    tiles = [
        ("First frost of the autumn", ff["avg"], f'earliest {_esc(ff["earliest"])}, latest {_esc(ff["latest"])}'),
        ("Last frost of the spring", lf["avg"], f'earliest {_esc(lf["earliest"])}, latest {_esc(lf["latest"])}'),
        ("First 25&deg; day of the year", f25["avg"], f'earliest {_esc(f25["earliest"][0])}, latest {_esc(f25["latest"][0])}'
         + (f'; {f25["years_without"]} years never got there' if f25.get("years_without") else "")),
        ("Days of 25&deg; or more, per year", f'{d25["avg"]:.0f}', f'most {d25["most"][0]} in {d25["most"][1]}, fewest {d25["fewest"][0]} in {d25["fewest"][1]}'),
        ("Nights below freezing, per year", f'{mk["frost_days"]["avg"]:.0f}', "air frost: the minimum below 0&deg;"),
        ("Days that never rose above freezing", f'{mk["ice_days"]["avg"]:.1f} a year', f'{mk["ice_days"]["total"]} in {s["years"]} years'),
    ]
    return "\n".join(f'          <div class="b365-tile"><p class="b365-sub" style="margin:0">{t}</p><p class="big" style="font-size:1.35rem;font-weight:650;color:var(--b365-foam);margin:.15rem 0 .1rem">{v}</p><p class="bwr-when">{w}</p></div>'
                     for t, v, w in tiles)


def _lookup(s):
    data = json.dumps(s["dates"], separators=(",", ":"))
    months = "".join(f'<option value="{m:02d}">{n}</option>' for m, n in enumerate(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], 1))
    days = "".join(f'<option value="{d:02d}">{d}</option>' for d in range(1, 32))
    return f'''        <div class="bwr-look" id="lookup">
          <label for="bwr-m" class="b365-sub" style="margin:0">Pick a date:</label>
          <select id="bwr-d" aria-label="Day">{days}</select>
          <select id="bwr-m" aria-label="Month">{months}</select>
        </div>
        <div class="bwr-out" id="bwr-out" aria-live="polite"><p class="b365-sub">Choose a day and a month.</p></div>
        <script>
        (function () {{
          var D = {data};
          var dSel = document.getElementById('bwr-d'), mSel = document.getElementById('bwr-m'), out = document.getElementById('bwr-out');
          var NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          function deg(v) {{ if (v === null || v === undefined) return '\\u2014'; var x = Math.round(v * 10) / 10; return (x % 1 === 0 ? String(x) : x.toFixed(1)) + '\\u00b0'; }}
          function show() {{
            var k = mSel.value + '-' + dSel.value, e = D[k];
            var label = String(parseInt(dSel.value, 10)) + ' ' + NAMES[parseInt(mSel.value, 10) - 1];
            if (!e) {{ out.innerHTML = '<p class="b365-sub">There is no ' + label + '.</p>'; return; }}
            out.innerHTML = '<p class="big">' + label + ' at Bournemouth Airport, {s["from"]}\\u2013{s["to"]}</p>'
              + '<p><b>Hottest:</b> ' + deg(e[0]) + ' in ' + e[1] + '</p>'
              + (e[2] !== null ? '<p><b>Coldest:</b> ' + deg(e[2]) + ' in ' + e[3] + '</p>' : '')
              + '<p><b>Average:</b> high ' + deg(e[4]) + (e[5] !== null ? ', low ' + deg(e[5]) : '') + '</p>';
          }}
          var now = new Date(); mSel.value = ('0' + (now.getMonth() + 1)).slice(-2); dSel.value = ('0' + now.getDate()).slice(-2);
          dSel.addEventListener('change', show); mSel.addEventListener('change', show); show();
        }})();
        </script>'''


def _content(s, b365_band):
    a = s["alltime"]; mk = s["markers"]; d0, d1 = s["decades"][0], s["decades"][-1]
    hot, cold = a["hot_days"][0], a["cold_nights"][0]
    tiles = "\n".join([
        _tile(_deg(hot[1]), "Hottest day on record", _esc(hot[0])),
        _tile(_deg(cold[1]), "Coldest night on record", _esc(cold[0])),
        _tile(str(mk["days25"]["most"][0]), "Most 25&deg; days in one year", str(mk["days25"]["most"][1])),
        _tile(_esc(mk["first_frost"]["avg"]), "Average first frost", f'earliest {_esc(mk["first_frost"]["earliest"])}'),
    ])
    trend = (f'The average daytime high across a whole year was {_deg(d0["avg_hi"])} in the {d0["label"]} and {_deg(d1["avg_hi"])} in the {d1["label"]} so far; '
             f'days of 25&deg; or more went from about {d0["days25"]:.0f} a year to about {d1["days25"]:.0f}. '
             f'The month table shows the same comparison for each month, {s["early"]} against {s["late"]}. These are the station&rsquo;s own readings, nothing modelled.')
    prose = f'''
          <h2 id="method">Where these numbers come from</h2>
          <p>Every figure on this page is computed from the Met Office&rsquo;s daily readings at <strong>Bournemouth Airport (Hurn)</strong>, the station whose live observations the <a href="/bournemouth/weather/">weather page</a> shows, from {s["from"]} to the end of {s["to"]}: {s["years"]} years, every day. The data is the Met Office&rsquo;s MIDAS Open collection, published under the Open Government Licence, and the page is rebuilt when the Met Office releases the next year each summer. Nothing here is estimated or modelled.</p>
          <p>A day&rsquo;s <strong>maximum</strong> is the highest reading between 09:00 and 21:00 on that date; its <strong>minimum</strong> is the lowest in the night to 09:00 that morning. That is the Met Office&rsquo;s own convention, so &ldquo;the hottest 10 August&rdquo; means the daytime of 10 August. A frost is a night whose minimum fell below 0&deg;. Where two years tie for a record, the earlier year holds it.</p>
          <p>The airport is about 7 km inland. On a hot afternoon the beach is usually a degree or two cooler than the airport, and on a still winter night a little milder, so treat these as Bournemouth&rsquo;s records with that caveat. <a href="/bournemouth/weather/">Today&rsquo;s place in the record books</a> is worked out live on the weather page from the same table.</p>'''
    return "\n".join([
        hero(bc_sub("Bournemouth365", "/bournemouth/", "Weather Records"),
             "// BOURNEMOUTH365",
             f'Bournemouth&rsquo;s weather records, <em class="grad grad--cyan">{s["from"]} to {s["to"]}</em>',
             f"The hottest and coldest days on record, every month&rsquo;s records and averages, how the averages have moved over {s['years']} years, when the first frost and the first 25-degree day usually arrive, and any date looked up. All from the Met Office&rsquo;s own daily readings at Bournemouth Airport.",
             cta1=("Today in the record books", "/bournemouth/weather/"),
             cta2=("Look up a date", "#lookup"),
             chips=[f"{s['years']} years of daily readings", "Met Office station data", "Open Government Licence"]),
        '    <section class="section b365" aria-label="The headline records">\n      <div class="wrap">\n        <div class="bwr-tiles" data-reveal>\n' + tiles + '\n        </div>\n      </div>\n    </section>',
        '    <section class="section b365" aria-labelledby="look-h">\n      <div class="wrap">\n        <h2 id="look-h">Any date, since ' + str(s["from"]) + '</h2>\n' + _lookup(s) + '\n      </div>\n    </section>',
        '    <section class="section b365" aria-labelledby="top-h">\n      <div class="wrap">\n        <h2 id="top-h">The all-time top ten</h2>\n        <div class="bwr-grid" data-reveal>\n'
        + _top_table("Hottest days", a["hot_days"], "Max") + "\n" + _top_table("Coldest nights", a["cold_nights"], "Min") + "\n"
        + _top_table("Coldest days (lowest daytime maximum)", a["cold_days"], "Max") + "\n" + _top_table("Warmest nights (highest minimum)", a["warm_nights"], "Min")
        + '\n        </div>\n      </div>\n    </section>',
        '    <section class="section b365" aria-labelledby="months-h">\n      <div class="wrap">\n        <h2 id="months-h">Month by month</h2>\n        <div class="bwr-scroll" data-reveal>\n' + _months_table(s) + '\n        </div>\n      </div>\n    </section>',
        '    <section class="section b365" aria-labelledby="trend-h">\n      <div class="wrap">\n        <h2 id="trend-h">How the averages have moved</h2>\n        <p class="b365-sub" style="max-width:70ch">' + trend + '</p>\n        <div class="bwr-scroll" data-reveal>\n' + _decades_table(s) + '\n        </div>\n      </div>\n    </section>',
        '    <section class="section b365" aria-labelledby="marks-h">\n      <div class="wrap">\n        <h2 id="marks-h">Frost and summer, on average</h2>\n        <div class="bwr-marks" data-reveal>\n' + _markers(s) + '\n        </div>\n      </div>\n    </section>',
        '    <section class="section">\n      <div class="wrap">\n        <div class="prose" data-reveal>' + prose + '\n        </div>\n      </div>\n    </section>',
        faq_html(_faqs(s)),
        b365_band,
    ])


def _faqs(s):
    a = s["alltime"]; hot, cold = a["hot_days"][0], a["cold_nights"][0]
    return [
        ("What is the hottest day ever recorded in Bournemouth?",
         f"At Bournemouth Airport, the station with a continuous record since {s['from']}, the highest daily maximum is {hot[1]}&deg;C on {hot[0]}. The next hottest days are in the table above. The seafront itself has no equally long record; on a hot afternoon it usually runs a degree or two cooler than the airport."),
        ("What is the coldest it has been in Bournemouth?",
         f"The lowest night-time minimum on record at the airport is {cold[1]}&deg;C, on {cold[0]}. The coldest full day, when the temperature never rose above {a['cold_days'][0][1]}&deg;C, was {a['cold_days'][0][0]}."),
        ("When is the first frost in Bournemouth?",
         f"On average the first air frost of the autumn comes around {s['markers']['first_frost']['avg']}; the earliest on record was {s['markers']['first_frost']['earliest']} and the latest {s['markers']['first_frost']['latest']}. The last frost of spring averages {s['markers']['last_frost']['avg']}."),
        ("Where do these records come from, and are they official?",
         f"They are the Met Office&rsquo;s own daily readings for station 00842 Hurn (Bournemouth Airport), published in its MIDAS Open collection under the Open Government Licence, {s['from']} to {s['to']}. We compute the records from those readings and rebuild this page when the Met Office releases the next year. Nothing is modelled or estimated."),
        ("Why does today not appear in these tables?",
         f"The Met Office publishes each year&rsquo;s readings the following summer, so this page runs to the end of {s['to']}. For today, the <a href=\"/bournemouth/weather/\">weather page</a> compares the airport&rsquo;s live reading and the forecast with this table and says where the day stands."),
    ]


def _schema(s):
    st = _load()
    return graph([
        crumb_sub(s, "Bournemouth365", "bournemouth", "Weather Records"),
        _pl.published(webpage(s, "Bournemouth Weather Records: Hottest & Coldest Since 1957",
                f"Bournemouth weather records from {st['years']} years of Met Office readings: hottest and coldest days, monthly records, frost dates, and any date looked up.",
                about=[_pl.BOURNEMOUTH], image="/bournemouth/media/og-weather.jpg")),
        _pl.ORG,
        faqpage(s, _faqs(st)),
    ])


def register(b365_band):
    s = _load()
    _bp.HEAD_EXTRA[_SLUG] = _HEAD
    add(
        slug=_SLUG,
        title="Bournemouth Weather Records: Hottest & Coldest Since 1957",
        desc=f"Bournemouth weather records from {s['years']} years of Met Office readings: hottest and coldest days, monthly records, frost dates, and any date looked up.",
        og_title=f"Bournemouth's weather records, {s['from']} to {s['to']}",
        schema=_schema,
        content=_content(s, b365_band),
        og_image="/bournemouth/media/og-weather.jpg",
    )
