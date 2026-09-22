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


def build(rows, station, source, licence):
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
        out[md] = rec
    return {
        "station": station, "source": source, "licence": licence,
        "from": min(years) if years else None, "to": max(years) if years else None,
        "built": datetime.date.today().isoformat(), "days": out,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--midas", help="dir/zip/CSV of MIDAS Open uk-daily-temperature-obs files for Hurn")
    ap.add_argument("--ghcn", help="GHCN-Daily by_station CSV (testing only)")
    ap.add_argument("--out", required=True)
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
    doc = build(rows, *meta)
    with open(a.out, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(doc, fh, separators=(",", ":"), ensure_ascii=False)
    n = len(doc["days"]); full = sum(1 for v in doc["days"].values() if v["n"] >= 50)
    print("rows %d  years %s-%s  days %d (%d with 50+ years)  -> %s (%d KB)" % (len(rows), doc["from"], doc["to"], n, full, a.out, os.path.getsize(a.out) // 1024))
    for md in ("07-19", "09-22", "12-25"):
        if md in doc["days"]:
            r = doc["days"][md]; print("  %s: record hi %s (%s), lowest max %s (%s), avg hi %s, n=%d" % (md, r["hi"][0], r["hi"][1], r["lohi"][0], r["lohi"][1], r["avg_hi"], r["n"]))


if __name__ == "__main__":
    main()
