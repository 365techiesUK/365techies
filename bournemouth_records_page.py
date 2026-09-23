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


def _hours(h):
    h = round(float(h), 1)
    return ("%d" % int(round(h))) if abs(h - round(h)) < 0.05 else ("%.1f" % h)


def _sun_section(s):
    w = s.get("weather", {}).get("sun")
    if not w: return ""
    tiles = "\n".join([
        _tile(_hours(w["sunniest_days"][0][1]) + " h", "Sunniest day on record", _esc(w["sunniest_days"][0][0])),
        _tile(_hours(w["sunniest_months"][0][1]) + " h", "Sunniest month", _esc(w["sunniest_months"][0][0])),
        _tile(f'{w["sunniest_years"][0][1]:,} h', "Sunniest year", f'{w["sunniest_years"][0][0]} &middot; average {w["avg_year"]:,} h a year'),
        _tile(f'{w["zero_days_per_year"]:.0f}', "Days a year with no sun at all", f'dullest month {_esc(w["dullest_months"][0][0])}, {_hours(w["dullest_months"][0][1])} h'),
    ])
    mlen = {"January": 31, "February": 28.25, "March": 31, "April": 30, "May": 31, "June": 30, "July": 31, "August": 31, "September": 30, "October": 31, "November": 30, "December": 31}
    months = "\n".join(f'              <tr><th scope="row">{_esc(m)}</th><td class="n"><b>{_hours(t)}</b></td><td class="n">{_hours(t / mlen.get(m, 30.4))}</td></tr>' for m, t, n in w["month_avg"])
    month_tbl = ('          <table class="bwr-table"><caption>Average sunshine by month</caption>\n'
                 '            <thead><tr><th>Month</th><th class="n">Hours in the month</th><th class="n">Hours a day</th></tr></thead>\n'
                 f'            <tbody>\n{months}\n            </tbody></table>')
    sdays = "\n".join(f'              <tr><td>{i + 1}</td><td>{_esc(d)}</td><td class="n"><b>{_hours(v)} h</b></td></tr>' for i, (d, v) in enumerate(w["sunniest_days"]))
    sunny = ('          <table class="bwr-table"><caption>Sunniest days</caption>\n            <thead><tr><th>#</th><th>Date</th><th class="n">Hours</th></tr></thead>\n'
             f'            <tbody>\n{sdays}\n            </tbody></table>')
    smonths = "\n".join(f'              <tr><td>{i + 1}</td><td>{_esc(d)}</td><td class="n"><b>{_hours(v)} h</b></td></tr>' for i, (d, v) in enumerate(w["sunniest_months"]))
    smonths_tbl = ('          <table class="bwr-table"><caption>Sunniest months</caption>\n            <thead><tr><th>#</th><th>Month</th><th class="n">Hours</th></tr></thead>\n'
                   f'            <tbody>\n{smonths}\n            </tbody></table>')
    yrs = "\n".join(f'              <tr><td>{_esc(str(y))}</td><td class="n"><b>{t:,} h</b></td></tr>' for y, t in w["sunniest_years"])
    dyrs = "\n".join(f'              <tr><td>{_esc(str(y))}</td><td class="n"><b>{t:,} h</b></td></tr>' for y, t in w["dullest_years"])
    years_tbl = ('          <table class="bwr-table"><caption>Sunniest and dullest years</caption>\n            <thead><tr><th>Year</th><th class="n">Hours</th></tr></thead>\n'
                 f'            <tbody>\n{yrs}\n              <tr><th colspan="2" scope="colgroup">Dullest</th></tr>\n{dyrs}\n            </tbody></table>')
    return ('    <section class="section b365" aria-labelledby="sun-h">\n      <div class="wrap">\n        <h2 id="sun-h">Sunshine</h2>\n'
            f'        <p class="b365-sub" style="max-width:70ch">Hours of bright sunshine measured at the airport each day, {w["from"]} to {w["to"]} ({w["full_years"]} complete years). A day&rsquo;s figure is the whole 24 hours; a &ldquo;no sun&rdquo; day recorded none at all.</p>\n'
            f'        <div class="bwr-tiles" data-reveal>\n{tiles}\n        </div>\n        <div class="bwr-grid" data-reveal>\n{sunny}\n{smonths_tbl}\n{years_tbl}\n{month_tbl}\n        </div>\n      </div>\n    </section>')


def _snow_section(s):
    w = s.get("weather", {}); sn = w.get("snow"); th = w.get("thunder")
    if not sn: return ""
    deep = "\n".join(f'              <tr><td>{i + 1}</td><td>{_esc(d)}</td><td class="n"><b>{int(round(v))} cm</b></td></tr>' for i, (d, v) in enumerate(sn["deepest"]))
    deep_tbl = ('          <table class="bwr-table"><caption>Deepest snow at 9 am</caption>\n            <thead><tr><th>#</th><th>Date</th><th class="n">Depth</th></tr></thead>\n'
                f'            <tbody>\n{deep}\n            </tbody></table>')
    dec = "\n".join(f'              <tr><th scope="row">{k}</th><td class="n"><b>{lying}</b></td><td class="n">{days:,}</td><td class="n">{"&#9888; partial" if days < years * 300 else ""}</td></tr>' for k, lying, days, years in sn["by_decade"])
    dec_tbl = ('          <table class="bwr-table"><caption>Mornings with snow lying, by decade</caption>\n            <thead><tr><th>Decade</th><th class="n">Mornings with snow</th><th class="n">Mornings reported</th><th class="n"></th></tr></thead>\n'
               f'            <tbody>\n{dec}\n            </tbody></table>')
    tiles = [_tile(str(sn["lying_days"]), "Mornings with snow lying", f'{sn["from"]}&ndash;{sn["to"]}; last on {_esc(sn["last_lying"])}')]
    if th:
        tiles.append(_tile(f'{th["avg_days"]:.0f}', "Thunder days a year", f'{th["from"]}&ndash;{th["to"]}; most {th["most"][0]} in {th["most"][1]}, fewest {th["fewest"][0]} in {th["fewest"][1]}'))
    return ('    <section class="section b365" aria-labelledby="snow-h">\n      <div class="wrap">\n        <h2 id="snow-h">Snow and thunder</h2>\n'
            f'        <p class="b365-sub" style="max-width:70ch">Snow depth is the 9 am reading. It was reported almost every morning from {sn["from"]} to 1999 and again from 2010, but on only about a fifth of mornings between 2000 and 2009, so that decade is understated. Thunder and hail were logged as day flags until 1999 and not since.</p>\n'
            f'        <div class="bwr-tiles" data-reveal>\n' + "\n".join(tiles) + f'\n        </div>\n        <div class="bwr-grid" data-reveal>\n{deep_tbl}\n{dec_tbl}\n        </div>\n      </div>\n    </section>')


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
              + '<p><b>Average:</b> high ' + deg(e[4]) + (e[5] !== null ? ', low ' + deg(e[5]) : '') + '</p>'
              + (e.length > 6 && e[6] !== null ? '<p><b>Sunniest:</b> ' + hrs(e[6]) + ' of sunshine in ' + e[7] + (e[8] !== null ? ', against an average of ' + hrs(e[8]) : '') + '</p>' : '');
          }}
          function hrs(v) {{ var x = Math.round(v * 10) / 10; return (x % 1 === 0 ? String(x) : x.toFixed(1)) + ' hours'; }}
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
    sun_from = s.get("weather", {}).get("sun", {}).get("from", 1967)
    prose = f'''
          <h2 id="method">Where these numbers come from</h2>
          <p>Every figure on this page is computed from the Met Office&rsquo;s daily readings at <strong>Bournemouth Airport (Hurn)</strong>, the station whose live observations the <a href="/bournemouth/weather/">weather page</a> shows, from {s["from"]} to the end of {s["to"]}: {s["years"]} years, every day. The data is the Met Office&rsquo;s MIDAS Open collection, published under the Open Government Licence, and the page is rebuilt when the Met Office releases the next year each summer. Nothing here is estimated or modelled.</p>
          <p>A day&rsquo;s <strong>maximum</strong> is the highest reading between 09:00 and 21:00 on that date; its <strong>minimum</strong> is the lowest in the night to 09:00 that morning. That is the Met Office&rsquo;s own convention, so &ldquo;the hottest 10 August&rdquo; means the daytime of 10 August. A frost is a night whose minimum fell below 0&deg;. Where two years tie for a record, the earlier year holds it.</p>
          <p><strong>Sunshine</strong> is hours of bright sunshine over the whole 24 hours, in the same Met Office series, from {sun_from}. Until the early 2000s it was measured with a Campbell&ndash;Stokes recorder, the glass ball that burns a trace on a card; since then with an electronic sensor. The two agree closely but not perfectly, so a sunny-day record that spans the change carries that small caveat. <strong>Snow depth</strong> is what was lying at 09:00. It was reported almost every morning up to 1999 and again from 2010, but on only about a fifth of mornings between 2000 and 2009, so that decade counts fewer snow mornings than there really were. Thunder was logged as a day flag until 1999 and not since, so its averages stop there.</p>
          <p>The airport is about 7 km inland. On a hot afternoon the beach is usually a degree or two cooler than the airport, and on a still winter night a little milder, so treat these as Bournemouth&rsquo;s records with that caveat. <a href="/bournemouth/weather/">Today&rsquo;s place in the record books</a> is worked out live on the weather page from the same table.</p>'''
    return "\n".join([
        hero(bc_sub("Bournemouth365", "/bournemouth/", "Weather Records"),
             "// BOURNEMOUTH365",
             f'Bournemouth&rsquo;s weather records, <em class="grad grad--cyan">{s["from"]} to {s["to"]}</em>',
             f"The hottest and coldest days on record, every month&rsquo;s records and averages, how the averages have moved over {s['years']} years, when the first frost and the first 25-degree day usually arrive, the sunniest days and the deepest snow, and any date looked up. All from the Met Office&rsquo;s own daily readings at Bournemouth Airport.",
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
        _sun_section(s),
        _snow_section(s),
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
    ] + _wx_faqs(s) + [
        ("Where do these records come from, and are they official?",
         f"They are the Met Office&rsquo;s own daily readings for station 00842 Hurn (Bournemouth Airport), published in its MIDAS Open collection under the Open Government Licence, {s['from']} to {s['to']}. We compute the records from those readings and rebuild this page when the Met Office releases the next year. Nothing is modelled or estimated."),
        ("Why does today not appear in these tables?",
         f"The Met Office publishes each year&rsquo;s readings the following summer, so this page runs to the end of {s['to']}. For today, the <a href=\"/bournemouth/weather/\">weather page</a> compares the airport&rsquo;s live reading and the forecast with this table and says where the day stands."),
    ]


def _wx_faqs(s):
    w = s.get("weather", {}); sun = w.get("sun"); sn = w.get("snow")
    out = []
    if sun:
        out.append(("How much sunshine does Bournemouth get?",
                    f"Bournemouth Airport averages about {sun['avg_year']:,} hours of bright sunshine a year over {sun['full_years']} complete years of readings, {sun['from']} to {sun['to']}. The sunniest year was {sun['sunniest_years'][0][0]} with {sun['sunniest_years'][0][1]:,} hours and the dullest {sun['dullest_years'][0][0]} with {sun['dullest_years'][0][1]:,}. The sunniest single day was {sun['sunniest_days'][0][0]}, with {_hours(sun['sunniest_days'][0][1])} hours."))
    if sn:
        out.append(("When did it last snow in Bournemouth?",
                    f"The last morning with snow lying at Bournemouth Airport at 09:00 was {sn['last_lying']}. Snow that settles is rare here: {sn['lying_days']} such mornings in the whole record, {sn['from']} to {sn['to']}, and the deepest was {int(round(sn['deepest'][0][1]))} cm on {sn['deepest'][0][0]}. Snow that falls and melts the same day is not counted, because the reading is what was lying at 09:00."))
    return out


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
