r"""Bournemouth (Hurn) daily temperature records -> api/bm-records.json

WHY
The Bournemouth weather page compares today with the record books for the same
calendar date ("the warmest 22 September here since 1985"), which is what makes a
post or a reel worth stopping for. That needs one number per calendar day per
year: the daily maximum (and minimum) at a station with a long, continuous
record. Hurn - Bournemouth Airport, the same station whose METAR observations the
page already shows - has one from 1957.

SOURCES (read what the licence allows)
  * Met Office MIDAS Open, uk-daily-temperature-obs, station 00842 Hurn - the
    official record, Open Government Licence v3. Needs a free CEDA account to
    download; drop the yearly CSVs (or a zip of them) in tools/bm-records/midas/.
    THIS is the source the published file must come from.
  * A GHCN-Daily "by_station" CSV (NOAA) - for testing the pipeline only. The
    complete Hurn series there (UKE00105923) is redistributed from ECA&D, whose
    policy is non-commercial research and education, so it must NOT be published
    on the business site; the WMO series (UKM00003862) is free but too patchy for
    record claims. Use --ghcn only with --out somewhere outside api/.

WHAT IS COMPUTED, PER CALENDAR DAY (MM-DD, 366 of them)
  hi     [value, year]  highest daily maximum on that date
  lo     [value, year]  lowest daily minimum on that date
  lohi   [value, year]  lowest daily MAXIMUM (the coldest day, not the coldest night)
  avg_hi / avg_lo       mean daily max / min over all years with data
  n                     years with a maximum on that date
  hiy    [[year, max], ...] every year's maximum, for "warmest since YYYY"
Values are degrees C to one decimal. 29 February simply has fewer years.

MIDAS convention, applied here: the 24-hour maximum ending 09:00 on day D belongs
to day D-1 (the daytime it covers); the 24-hour minimum ending 09:00 on day D
belongs to day D (that morning). Where only 12-hour readings exist, the day's max
is the 12 h ending 21:00 and its min the 12 h ending 09:00. Rows flagged by the
Met Office as suspect (rec_st_ind other than the accepted set) are skipped, as are
non-current versions.

Run:
  python tools/bm-records/build_records.py --midas tools/bm-records/midas --out api/bm-records.json
  python tools/bm-records/build_records.py --ghcn path/to/UKE00105923.csv --out /tmp/test-records.json
"""
import argparse, csv, glob, io, json, os, sys, zipfile, datetime, statistics

ACCEPT_REC_ST = {"1", "1001", "1011", "1021", "1022", "1023", "1025"}   # Met Office "accepted" row states


def read_midas(path):
    """Yield (date, tmax, tmin) from MIDAS Open uk-daily-temperature-obs CSVs (files, a dir, or zips)."""
    files = []
    if os.path.isdir(path):
        files = sorted(glob.glob(os.path.join(path, "**", "*.csv"), recursive=True)) + sorted(glob.glob(os.path.join(path, "**", "*.zip"), recursive=True))
    else:
        files = [path]
    tmax, tmin = {}, {}          # date -> value (best available)
    tmax_src, tmin_src = {}, {}  # date -> 24 or 12 (24 h reading wins)
    def handle(name, text):
        lines = text.splitlines()
        try:
            start = next(i for i, l in enumerate(lines) if l.strip() == "data")
        except StopIteration:
            return
        body = [l for l in lines[start + 1:] if l.strip() and l.strip() != "end data"]
        rd = csv.DictReader(io.StringIO("\n".join(body)))
        for r in rd:
            try:
                if r.get("version_num", "1").strip() not in ("1", ""):
                    continue
                st = (r.get("rec_st_ind") or "").strip()
                if st and st not in ACCEPT_REC_ST:
                    continue
                end = datetime.datetime.strptime(r["ob_end_time"].strip()[:16], "%Y-%m-%d %H:%M")
                hours = int(float(r.get("ob_hour_count") or 0))
            except (ValueError, KeyError):
                continue
            mx = r.get("max_air_temp", "").strip(); mn = r.get("min_air_temp", "").strip()
            if mx.upper() == "NA": mx = ""          # the Met Office's missing-value marker
            if mn.upper() == "NA": mn = ""
            if hours == 24 and end.hour == 9:
                d_max = (end - datetime.timedelta(days=1)).date(); d_min = end.date()
                if mx: _put(tmax, tmax_src, d_max, float(mx), 24)
                if mn: _put(tmin, tmin_src, d_min, float(mn), 24)
            elif hours == 12:
                if end.hour == 21 and mx: _put(tmax, tmax_src, end.date(), float(mx), 12)
                if end.hour == 9 and mn: _put(tmin, tmin_src, end.date(), float(mn), 12)
    for f in files:
        if f.lower().endswith(".zip"):
            with zipfile.ZipFile(f) as z:
                for n in z.namelist():
                    if n.lower().endswith(".csv"):
                        handle(n, z.read(n).decode("utf-8", "replace"))
        else:
            with open(f, encoding="utf-8", errors="replace") as fh:
                handle(f, fh.read())
    for d in sorted(set(tmax) | set(tmin)):
        yield d, tmax.get(d), tmin.get(d)


def _put(store, src, d, v, hours):
    if d not in store or hours > src.get(d, 0) or (hours == src.get(d) and v > store[d]):
        store[d] = v; src[d] = hours


def read_weather(path):
    """The MIDAS Open uk-daily-weather-obs files (dir/zip/CSVs): per date, sunshine hours,
    snow depth at 09:00 (cm) and the thunder / hail day flags.
    Sunshine: the 24-hour total ending 23:59 on the date - wmo_24hr_sun_dur (Kipp & Zonen,
    2000s on) if present, else cs_24hr_sun_dur (Campbell-Stokes, 1962-2000s). Snow depth is
    the 09:00 report of the date. Flags are 1/0 where present (thunder/hail end ~1999)."""
    files = sorted(glob.glob(os.path.join(path, "**", "*.csv"), recursive=True)) if os.path.isdir(path) else [path]
    wx = {}
    def handle(text):
        lines = text.splitlines()
        try:
            start = next(i for i, l in enumerate(lines) if l.strip() == "data")
        except StopIteration:
            return
        body = [l for l in lines[start + 1:] if l.strip() and l.strip() != "end data"]
        for r in csv.DictReader(io.StringIO("\n".join(body))):
            try:
                if r.get("version_num", "1").strip() not in ("1", ""): continue
                st = (r.get("rec_st_ind") or "").strip()
                if st and st not in ACCEPT_REC_ST: continue
                end = datetime.datetime.strptime(r["ob_end_time"].strip()[:16], "%Y-%m-%d %H:%M")
                hours = int(float(r.get("ob_hour_count") or 0))
            except (ValueError, KeyError):
                continue
            d = end.date(); e = wx.setdefault(d, {})
            def num(k):
                v = (r.get(k) or "").strip()
                if v in ("", "NA"): return None
                try: return float(v)
                except ValueError: return None
            if hours == 24:
                s = num("wmo_24hr_sun_dur"); c = num("cs_24hr_sun_dur")
                if s is not None and 0 <= s <= 18: e["sun"] = s
                elif c is not None and 0 <= c <= 18 and "sun" not in e: e["sun"] = c
                for k, col in (("thunder", "thunder_day_flag"), ("hail", "hail_day_id")):
                    v = num(col)
                    if v is not None: e[k] = 1 if v >= 1 else 0
            if hours == 0:
                sd = num("snow_depth")
                if sd is not None and 0 <= sd <= 200: e["snow"] = sd
    for f in files:
        with open(f, encoding="utf-8", errors="replace") as fh:
            handle(fh.read())
    return wx


def read_ghcn(path):
    """Yield (date, tmax, tmin) from a GHCN-Daily by_station CSV (values in tenths of C)."""
    tmax, tmin = {}, {}
    with open(path, encoding="utf-8", errors="replace") as fh:
        for r in csv.reader(fh):
            if len(r) < 4: continue
            try:
                d = datetime.datetime.strptime(r[1], "%Y%m%d").date(); v = int(r[3]) / 10.0
            except ValueError:
                continue
            if r[2] == "TMAX": tmax[d] = v
            elif r[2] == "TMIN": tmin[d] = v
    for d in sorted(set(tmax) | set(tmin)):
        yield d, tmax.get(d), tmin.get(d)


def build(rows, station, source, licence, wx=None):
    days = {}
    years = set()
    for d, mx, mn in rows:
        if mx is None and mn is None: continue
        if mx is not None and not (-30 <= mx <= 45): continue
        if mn is not None and not (-35 <= mn <= 35): continue
        md = d.strftime("%m-%d"); y = d.year; years.add(y)
        e = days.setdefault(md, {"hiy": {}, "loy": {}})
        if mx is not None: e["hiy"][y] = max(mx, e["hiy"].get(y, -99))
        if mn is not None: e["loy"][y] = min(mn, e["loy"].get(y, 99))
    # sunshine and snow per calendar date, from the daily weather files
    suny, snowy = {}, {}
    for d, e in (wx or {}).items():
        md = d.strftime("%m-%d")
        if "sun" in e: suny.setdefault(md, {})[d.year] = e["sun"]
        if "snow" in e: snowy.setdefault(md, {})[d.year] = e["snow"]
    out = {}
    for md, e in sorted(days.items()):
        hiy = sorted(e["hiy"].items()); loy = sorted(e["loy"].items())
        if not hiy: continue
        hi = max(hiy, key=lambda t: (t[1], -t[0]))       # ties: the earliest year holds the record
        lohi = min(hiy, key=lambda t: (t[1], -t[0]))
        rec = {
            "hi": [round(hi[1], 1), hi[0]],
            "lohi": [round(lohi[1], 1), lohi[0]],
            "avg_hi": round(statistics.mean(v for _, v in hiy), 1),
            "n": len(hiy),
            "hiy": [[y, round(v, 1)] for y, v in hiy],
        }
        if loy:
            lo = min(loy, key=lambda t: (t[1], -t[0]))
            rec["lo"] = [round(lo[1], 1), lo[0]]
            rec["avg_lo"] = round(statistics.mean(v for _, v in loy), 1)
        if md in suny and len(suny[md]) >= 20:
            s = sorted(suny[md].items()); best = max(s, key=lambda t: (t[1], -t[0]))
            rec["sun"] = [round(best[1], 1), best[0]]
            rec["avg_sun"] = round(statistics.mean(v for _, v in s), 1)
            rec["sun_n"] = len(s)
        if md in snowy:
            sn = snowy[md]; lying = [y for y, v in sn.items() if v > 0]
            rec["snow_years"] = len(lying); rec["snow_n"] = len(sn)
            if lying:
                deep = max(sn.items(), key=lambda t: (t[1], -t[0]))
                rec["snow"] = [round(deep[1], 1), deep[0]]; rec["snow_last"] = max(lying)
        out[md] = rec
    return {
        "station": station, "source": source, "licence": licence,
        "from": min(years) if years else None, "to": max(years) if years else None,
        "built": datetime.date.today().isoformat(), "days": out,
    }


def _doy_avg_date(doys, base_year=2001):
    """Mean day-of-year -> 'D Month' (2001: not a leap year, so 29 Feb never appears)."""
    if not doys: return None
    d = datetime.date(base_year, 1, 1) + datetime.timedelta(days=round(statistics.mean(doys)) - 1)
    return d.strftime("%-d %B") if os.name != "nt" else d.strftime("%d %B").lstrip("0")


def _date_label(d):
    return "%d %s %d" % (d.day, d.strftime("%B"), d.year)


def stats(rows, meta, wx=None):
    """The records page: all-time lists, month records and averages, the 30-year change,
    decade averages, frost and summer markers, and a compact per-date table for a lookup.
    Every figure is computed from the same daily rows as the per-date table."""
    days = [(d, mx, mn) for d, mx, mn in rows if mx is not None or mn is not None]
    years = sorted(set(d.year for d, _, _ in days))
    y0, y1 = years[0], years[-1]
    with_max = [(d, mx) for d, mx, _ in days if mx is not None]
    with_min = [(d, mn) for d, _, mn in days if mn is not None]
    top = lambda seq, key, n=10: [[_date_label(d), round(v, 1)] for d, v in sorted(seq, key=key)[:n]]
    alltime = {
        "hot_days":    top(with_max, lambda t: (-t[1], t[0])),
        "cold_nights": top(with_min, lambda t: (t[1], t[0])),
        "cold_days":   top(with_max, lambda t: (t[1], t[0])),
        "warm_nights": top(with_min, lambda t: (-t[1], t[0])),
    }
    # months
    early = range(y0, y0 + 30); late = range(y1 - 29, y1 + 1)
    months = []
    for m in range(1, 13):
        mx = [(d, v) for d, v in with_max if d.month == m]; mn = [(d, v) for d, v in with_min if d.month == m]
        if not mx: continue
        hi = max(mx, key=lambda t: (t[1], -t[0].toordinal())); lo = min(mn, key=lambda t: (t[1], -t[0].toordinal())) if mn else None
        e_hi = [v for d, v in mx if d.year in early]; l_hi = [v for d, v in mx if d.year in late]
        e_lo = [v for d, v in mn if d.year in early]; l_lo = [v for d, v in mn if d.year in late]
        months.append({
            "m": m, "name": datetime.date(2001, m, 1).strftime("%B"),
            "hi": [round(hi[1], 1), _date_label(hi[0])], "lo": ([round(lo[1], 1), _date_label(lo[0])] if lo else None),
            "avg_hi": round(statistics.mean(v for _, v in mx), 1), "avg_lo": (round(statistics.mean(v for _, v in mn), 1) if mn else None),
            "early_hi": round(statistics.mean(e_hi), 1) if e_hi else None, "late_hi": round(statistics.mean(l_hi), 1) if l_hi else None,
            "early_lo": round(statistics.mean(e_lo), 1) if e_lo else None, "late_lo": round(statistics.mean(l_lo), 1) if l_lo else None,
        })
    # decades (a decade needs at least 5 years of data to be shown)
    decades = []
    for dec in range((y0 // 10) * 10, y1 + 1, 10):
        ys = [y for y in years if dec <= y < dec + 10]
        if len(ys) < 5: continue
        hi = [v for d, v in with_max if dec <= d.year < dec + 10]; lo = [v for d, v in with_min if dec <= d.year < dec + 10]
        hot = {}
        for d, v in with_max:
            if dec <= d.year < dec + 10 and v >= 25.0: hot[d.year] = hot.get(d.year, 0) + 1
        decades.append({"label": "%ds" % dec, "years": "%d-%d" % (ys[0], ys[-1]), "n": len(ys),
                        "avg_hi": round(statistics.mean(hi), 1), "avg_lo": round(statistics.mean(lo), 1) if lo else None,
                        "days25": round(sum(hot.get(y, 0) for y in ys) / len(ys), 1)})
    # frost and summer markers, per year
    by_year = {}
    for d, mx, mn in days: by_year.setdefault(d.year, []).append((d, mx, mn))
    first_frost, last_frost, first25, days25, ice_days, frost_days = [], [], [], [], [], []
    for y in years:
        yr = sorted(by_year[y])
        if len(yr) < 300: continue
        aut = [d for d, mx, mn in yr if mn is not None and mn < 0.0 and d.month >= 7]
        spr = [d for d, mx, mn in yr if mn is not None and mn < 0.0 and d.month < 7]
        hot = [d for d, mx, mn in yr if mx is not None and mx >= 25.0]
        if aut: first_frost.append((aut[0] - datetime.date(y, 7, 1)).days)
        if spr: last_frost.append(spr[-1].timetuple().tm_yday)
        if hot: first25.append((hot[0].timetuple().tm_yday, y, hot[0]))
        days25.append((len(hot), y)); ice_days.append(sum(1 for d, mx, mn in yr if mx is not None and mx <= 0.0))
        frost_days.append(sum(1 for d, mx, mn in yr if mn is not None and mn < 0.0))
    ff_dates = []   # earliest / latest first autumn frost with year
    for y in years:
        yr = sorted(by_year.get(y, []))
        aut = [d for d, mx, mn in yr if mn is not None and mn < 0.0 and d.month >= 7]
        if aut and len(yr) >= 300: ff_dates.append(aut[0])
    lf_dates = []
    for y in years:
        yr = sorted(by_year.get(y, []))
        spr = [d for d, mx, mn in yr if mn is not None and mn < 0.0 and d.month < 7]
        if spr and len(yr) >= 300: lf_dates.append(spr[-1])
    f25 = sorted(first25)
    markers = {
        "first_frost": {"avg": (datetime.date(2001, 7, 1) + datetime.timedelta(days=round(statistics.mean(first_frost)))).strftime("%d %B").lstrip("0") if first_frost else None,
                        "earliest": _date_label(min(ff_dates, key=lambda d: (d.month, d.day))) if ff_dates else None,
                        "latest": _date_label(max(ff_dates, key=lambda d: (d.month, d.day))) if ff_dates else None,
                        "years_without": len([y for y in years if len(by_year.get(y, [])) >= 300]) - len(first_frost)},
        "last_frost": {"avg": _doy_avg_date(last_frost),
                       "earliest": _date_label(min(lf_dates, key=lambda d: (d.month, d.day))) if lf_dates else None,
                       "latest": _date_label(max(lf_dates, key=lambda d: (d.month, d.day))) if lf_dates else None},
        "first_25": {"avg": _doy_avg_date([t[0] for t in first25]),
                     "earliest": [_date_label(f25[0][2])] if f25 else None, "latest": [_date_label(f25[-1][2])] if f25 else None,
                     "years_without": len(days25) - len(first25)},
        "days25": {"avg": round(statistics.mean(c for c, _ in days25), 1) if days25 else None,
                   "most": list(max(days25)) if days25 else None, "fewest": list(min(days25)) if days25 else None},
        "frost_days": {"avg": round(statistics.mean(frost_days), 1) if frost_days else None},
        "ice_days": {"avg": round(statistics.mean(ice_days), 1) if ice_days else None, "total": sum(ice_days)},
    }
    # compact per-date table for the lookup: [hi, hiYear, lo, loYear, avgHi, avgLo]
    dates = {}
    per = {}
    for d, mx, mn in days:
        e = per.setdefault(d.strftime("%m-%d"), {"hi": [], "lo": []})
        if mx is not None: e["hi"].append((mx, d.year))
        if mn is not None: e["lo"].append((mn, d.year))
    for md, e in sorted(per.items()):
        if not e["hi"]: continue
        hi = max(e["hi"], key=lambda t: (t[0], -t[1])); lo = min(e["lo"], key=lambda t: (t[0], -t[1])) if e["lo"] else (None, None)
        dates[md] = [round(hi[0], 1), hi[1], (round(lo[0], 1) if lo[0] is not None else None), lo[1],
                     round(statistics.mean(v for v, _ in e["hi"]), 1), (round(statistics.mean(v for v, _ in e["lo"]), 1) if e["lo"] else None)]
    out = {"station": meta[0], "source": meta[1], "licence": meta[2], "from": y0, "to": y1, "years": len(years),
           "early": "%d-%d" % (y0, y0 + 29), "late": "%d-%d" % (y1 - 29, y1), "built": datetime.date.today().isoformat(),
           "alltime": alltime, "months": months, "decades": decades, "markers": markers, "dates": dates}
    if wx:
        out["weather"] = weather_stats(wx)
        # the compact per-date table gains the sunniest day on record for the lookup
        suny = {}
        for d, e in wx.items():
            if "sun" in e: suny.setdefault(d.strftime("%m-%d"), []).append((e["sun"], d.year))
        for md, lst in suny.items():
            if md in dates and len(lst) >= 20:
                best = max(lst, key=lambda t: (t[0], -t[1]))
                dates[md] += [round(best[0], 1), best[1], round(statistics.mean(v for v, _ in lst), 1)]
    return out


def weather_stats(wx):
    """Sunshine, snow and thunder from the daily weather files. Coverage is stated,
    not assumed: sunshine has a value nearly every day from the 1970s (part of the
    1960s); snow depth is missing for most of 2000-2009; thunder/hail flags stop
    around 1999."""
    sun = sorted((d, e["sun"]) for d, e in wx.items() if "sun" in e)
    snow = sorted((d, e["snow"]) for d, e in wx.items() if "snow" in e)
    thunder = sorted((d, e["thunder"]) for d, e in wx.items() if "thunder" in e)
    out = {}
    if sun:
        years_full = {}
        for d, v in sun: years_full.setdefault(d.year, []).append(v)
        full = {y: vs for y, vs in years_full.items() if len(vs) >= 350}
        by_month = {}
        for d, v in sun: by_month.setdefault((d.year, d.month), []).append(v)
        month_tot = [((y, m), sum(vs)) for (y, m), vs in by_month.items() if len(vs) >= 26]
        month_avg = {}
        for (y, m), t in month_tot: month_avg.setdefault(m, []).append(t)
        year_tot = sorted((sum(vs), y) for y, vs in full.items())
        out["sun"] = {
            "from": sun[0][0].year, "to": sun[-1][0].year, "days": len(sun), "full_years": len(full),
            "sunniest_days": [[_date_label(d), round(v, 1)] for d, v in sorted(sun, key=lambda t: (-t[1], t[0]))[:10]],
            "sunniest_months": [[datetime.date(y, m, 1).strftime("%B %Y"), round(t, 1)] for (y, m), t in sorted(month_tot, key=lambda t: -t[1])[:10]],
            "dullest_months": [[datetime.date(y, m, 1).strftime("%B %Y"), round(t, 1)] for (y, m), t in sorted(month_tot, key=lambda t: t[1])[:5]],
            "month_avg": [[datetime.date(2001, m, 1).strftime("%B"), round(statistics.mean(ts), 1), len(ts)] for m, ts in sorted(month_avg.items())],
            "sunniest_years": [[y, round(t)] for t, y in sorted(year_tot, reverse=True)[:5]],
            "dullest_years": [[y, round(t)] for t, y in year_tot[:5]],
            "avg_year": round(statistics.mean(t for t, _ in year_tot)) if year_tot else None,
            "zero_days_per_year": round(statistics.mean(sum(1 for v in vs if v == 0) for vs in full.values()), 1) if full else None,
        }
    if snow:
        lying = [(d, v) for d, v in snow if v > 0]
        by_dec = {}
        for d, v in snow:
            k = "%ds" % (d.year // 10 * 10); e = by_dec.setdefault(k, {"days": 0, "lying": 0, "years": set()})
            e["days"] += 1; e["years"].add(d.year)
            if v > 0: e["lying"] += 1
        out["snow"] = {
            "from": snow[0][0].year, "to": snow[-1][0].year, "days": len(snow),
            "deepest": [[_date_label(d), round(v, 1)] for d, v in sorted(lying, key=lambda t: (-t[1], t[0]))[:10]],
            "lying_days": len(lying), "last_lying": _date_label(lying[-1][0]) if lying else None,
            "by_decade": [[k, e["lying"], e["days"], len(e["years"])] for k, e in sorted(by_dec.items())],
            "gap_note": "snow depth was reported on only about a fifth of days between 2000 and 2009",
        }
    if thunder:
        yrs = {}
        for d, v in thunder: yrs.setdefault(d.year, []).append(v)
        full = {y: vs for y, vs in yrs.items() if len(vs) >= 350}
        if full:
            counts = sorted((sum(vs), y) for y, vs in full.items())
            out["thunder"] = {"from": min(full), "to": max(full), "avg_days": round(statistics.mean(c for c, _ in counts), 1),
                              "most": [counts[-1][0], counts[-1][1]], "fewest": [counts[0][0], counts[0][1]]}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--midas", help="dir/zip/CSV of MIDAS Open uk-daily-temperature-obs files for Hurn")
    ap.add_argument("--ghcn", help="GHCN-Daily by_station CSV (testing only)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--stats", help="also write the records-page statistics JSON here")
    ap.add_argument("--weather", help="dir of MIDAS Open uk-daily-weather-obs files for Hurn (sunshine, snow, thunder)")
    a = ap.parse_args()
    if a.midas:
        rows = list(read_midas(a.midas))
        meta = ("Bournemouth Airport (Hurn)", "Met Office MIDAS Open (uk-daily-temperature-obs, station 00842 Hurn) via CEDA", "Open Government Licence v3.0; contains public sector information licensed under the OGL")
    elif a.ghcn:
        if os.path.abspath(a.out).replace("\\", "/").find("/api/") >= 0:
            sys.exit("refusing: a GHCN-built file must not be written under api/ (licence - see the header)")
        rows = list(read_ghcn(a.ghcn))
        meta = ("Bournemouth Airport (Hurn)", "GHCN-Daily (NOAA) - TESTING ONLY", "not for publication")
    else:
        sys.exit("give --midas or --ghcn")
    if not rows: sys.exit("no rows read")
    wx = read_weather(a.weather) if a.weather else None
    if wx: print("weather: %d days, sunshine on %d, snow depth on %d, thunder flag on %d" % (len(wx), sum(1 for e in wx.values() if "sun" in e), sum(1 for e in wx.values() if "snow" in e), sum(1 for e in wx.values() if "thunder" in e)))
    doc = build(rows, *meta, wx=wx)
    with open(a.out, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(doc, fh, separators=(",", ":"), ensure_ascii=False)
    n = len(doc["days"]); full = sum(1 for v in doc["days"].values() if v["n"] >= 50)
    print("rows %d  years %s-%s  days %d (%d with 50+ years)  -> %s (%d KB)" % (len(rows), doc["from"], doc["to"], n, full, a.out, os.path.getsize(a.out) // 1024))
    if a.stats:
        st = stats(rows, meta, wx=wx)
        with open(a.stats, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(st, fh, separators=(",", ":"), ensure_ascii=False)
        print("stats -> %s (%d KB): hottest day %s, coldest night %s, first frost avg %s, first 25C day avg %s" % (
            a.stats, os.path.getsize(a.stats) // 1024, st["alltime"]["hot_days"][0], st["alltime"]["cold_nights"][0],
            st["markers"]["first_frost"]["avg"], st["markers"]["first_25"]["avg"]))
    for md in ("07-19", "09-22", "12-25"):
        if md in doc["days"]:
            r = doc["days"][md]; print("  %s: record hi %s (%s), lowest max %s (%s), avg hi %s, n=%d" % (md, r["hi"][0], r["hi"][1], r["lohi"][0], r["lohi"][1], r["avg_hi"], r["n"]))


if __name__ == "__main__":
    main()
