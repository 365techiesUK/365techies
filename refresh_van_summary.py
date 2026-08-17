#!/usr/bin/env python3
"""Refresh the van signal map's server-rendered summary — and NAME the spots.

WHY THIS EXISTS
The ranked "best spots" on /van-signal-map/ are drawn by JavaScript from
api/signal-log.php. GPTBot, ClaudeBot and PerplexityBot do not execute
JavaScript, so to every AI answer engine the page is a brochure ABOUT a map
rather than a map — and the ranked, place-named spots are the one uniquely
owned, quotable thing on it. This bakes a dated snapshot into static HTML.

WHY NAMING LIVES HERE AND NOT ON THE SERVER (2026-08-16)
The endpoint used to reverse-geocode each spot itself, per request, inside a
public PHP call. After the seafront drive (74 spots on a cold cache) Nominatim
rate-limited the server, every lookup returned empty, and the emptiness got
cached — the page went from 4 named spots to ZERO. Wrong place for the job.

So now: the SERVER decides which cells are nameable (it alone knows the private
no-name radius around base) and returns their centres + stats under
?summary=1&cells=1. THIS SCRIPT names them — on the laptop, with no execution
limit, one request per second as Nominatim's policy requires, a persistent
local cache so a name is only ever fetched once, and a real error message when
something is wrong instead of a silently blank list.

Zoom 16, not 14: measured against this exact coastline, zoom 14 returns the
TOWN wearing a suburb label ("suburb=Bournemouth" for Boscombe, "Poole" for
Sandbanks). Zoom 16 returns Boscombe, Southbourne, Sandbanks, Westbourne,
Lilliput, West Cliff — the places people actually search for. Zoom 16 also
returns a "road" key: NEVER read it. A suburb is a district; a road is a
parking place. That distinction is the whole privacy guarantee.

    py refresh_van_summary.py         # fetch, name, write van_map_data.py
    py refresh_van_summary.py --show  # print what would be written, write nothing

Then rebuild the page. Safe to run any time; on any failure it leaves the
existing snapshot alone rather than blanking the page.

⚠️ SiteGround's WAF 403s plain scripted requests, hence the browser UA.
"""
import json
import os
import statistics
import sys
import time
import urllib.request
from datetime import datetime, timezone

URL = "https://365techies.co.uk/api/signal-log.php?summary=1&cells=1"
OUT = "van_map_data.py"
GEO_CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                         "seo-research-cache", "van_geo_cache.json")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/140.0 Safari/537.36")
NOMINATIM_UA = "365Techies-SignalMap/1.0 (info@365techies.co.uk)"
MAX_SPOTS = 30                # the press plan wants 25-30 nameable places
MIN_TESTS_TO_NAME = 10        # a place needs evidence: 2 tests is a drive-by,
                              # not a measurement, and BBC 11.4.10 steers away
                              # from rankings under material uncertainty
NOMINATIM_GAP_S = 1.05        # policy: 1 request per second, no exceptions

# Preference order. neighbourhood/quarter FIRST so districts win over towns.
# 'road' is deliberately absent and must stay absent - see the docstring.
NAME_KEYS = ["neighbourhood", "quarter", "suburb", "village", "hamlet",
             "town", "city_district", "city", "municipality"]


def fetch_json(url, timeout=60):
    # ⚠️ Always cache-bust. SiteGround's proxy caches the bare URL and will
    # happily serve a response from before the last deploy - which is exactly
    # how a fresh server build once reported "did not return cells" here.
    url += ("&" if "?" in url else "?") + "cb=%d" % int(time.time() * 1000)
    req = urllib.request.Request(url, headers={"User-Agent": UA,
                                               "Accept": "application/json",
                                               "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


# --- local geocode cache: fetch each place ONCE, ever ---------------------------
def load_cache():
    try:
        with open(GEO_CACHE, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def save_cache(c):
    os.makedirs(os.path.dirname(GEO_CACHE), exist_ok=True)
    tmp = GEO_CACHE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(c, f, ensure_ascii=False, indent=0, sort_keys=True)
    os.replace(tmp, GEO_CACHE)


_last_call = 0.0


def geocode(lat, lon, cache):
    """Locality name at zoom 16, or None. Paced, cached, never a road."""
    global _last_call
    key = "%.3f,%.3f" % (round(lat, 3), round(lon, 3))   # ~110 m - a district
    if key in cache:
        return cache[key] or None
    wait = NOMINATIM_GAP_S - (time.time() - _last_call)
    if wait > 0:
        time.sleep(wait)
    _last_call = time.time()
    url = ("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16"
           "&lat=%s&lon=%s" % (lat, lon))
    req = urllib.request.Request(url, headers={"User-Agent": NOMINATIM_UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            if r.status != 200:
                raise RuntimeError("HTTP %s" % r.status)
            addr = json.load(r).get("address", {}) or {}
    except Exception as e:                                # noqa: BLE001
        # DO NOT cache a failure - that is exactly the bug that blanked the page.
        print("   geocode failed for %s: %s" % (key, e))
        return None
    name = None
    for k in NAME_KEYS:
        if addr.get(k):
            name = str(addr[k])[:40]
            break
    cache[key] = name or ""            # cache "no name" too: it's a real answer
    return name


def med(xs):
    xs = [x for x in xs if isinstance(x, (int, float))]
    return statistics.median(xs) if xs else None


def name_and_rank(cells, cache):
    """Group nameable cells by locality, pool their readings, rank by median dl."""
    by = {}
    unnamed = 0
    for c in cells:
        n = geocode(float(c["lat"]), float(c["lon"]), cache)
        if not n:
            unnamed += 1
            continue
        b = by.setdefault(n, {"dl": [], "ms": [], "sinr": [], "net": {}, "days": set()})
        b["dl"] += [float(x) for x in c.get("dl", [])]
        b["ms"] += [x for x in c.get("ms", []) if x is not None]
        b["sinr"] += [x for x in c.get("sinr", []) if x is not None]
        for k, v in (c.get("net") or {}).items():
            b["net"][k] = b["net"].get(k, 0) + v
        b["days"].update(c.get("days") or [])
    spots = []
    thin = []
    for name, b in by.items():
        if not b["dl"]:
            continue
        if len(b["dl"]) < MIN_TESTS_TO_NAME:
            thin.append((name, len(b["dl"])))
            continue                       # measured, but not enough to publish
        net = max(b["net"], key=b["net"].get) if b["net"] else None
        spots.append({
            "name": name,
            "dl": round(med(b["dl"]), 1),
            "ms": int(round(med(b["ms"]))) if b["ms"] else None,
            "sinr": int(round(med(b["sinr"]))) if b["sinr"] else None,
            "net": net,
            "tests": len(b["dl"]),
            "days": len(b["days"]),
        })
    spots.sort(key=lambda s: -s["dl"])
    if thin:
        print("   held back (under %d tests): %s"
              % (MIN_TESTS_TO_NAME, ", ".join("%s (%d)" % t for t in sorted(thin))))
    return spots, unnamed


BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "seo-research-cache", "signal-backups")
BACKUP_KEEP = 30              # dated full copies of the raw feed


def backup_raw_feed():
    """Keep a dated copy of EVERY published reading, on the laptop.

    The whole dataset - now 1,800+ points and a week of driving - lives in one
    JSON file on SiteGround. One wiped host, one bad deploy, and it is gone.
    We already fetch the full feed to build the summary, so saving it costs one
    extra request. Rolling 30 days; never fails the refresh if it can't write.
    """
    try:
        raw = fetch_json("https://365techies.co.uk/api/signal-log.php")
        pts = raw.get("points") if isinstance(raw, dict) else raw
        if not pts:
            return
        os.makedirs(BACKUP_DIR, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        path = os.path.join(BACKUP_DIR, "signal-%s.json" % stamp)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(pts, f, separators=(",", ":"))
        old = sorted(x for x in os.listdir(BACKUP_DIR) if x.startswith("signal-"))
        for x in old[:-BACKUP_KEEP]:
            os.remove(os.path.join(BACKUP_DIR, x))
        print("backup: %d points -> %s" % (len(pts), os.path.basename(path)))
    except Exception as e:                                # noqa: BLE001
        print("backup skipped: %s" % e)


def main():
    backup_raw_feed()
    try:
        d = fetch_json(URL)
    except Exception as e:                      # noqa: BLE001 - report and stop
        print("FETCH FAILED: %s" % e)
        print("Existing snapshot left untouched.")
        return 1
    if not d.get("ok"):
        print("Endpoint returned not-ok; leaving snapshot untouched.")
        return 1

    cells = d.get("cells")
    if cells is None:
        print("Endpoint did not return cells (old server build?). Leaving snapshot untouched.")
        return 1

    cache = load_cache()
    before = len(cache)
    spots, unnamed = name_and_rank(cells, cache)
    if len(cache) != before:
        save_cache(cache)

    print("live summary: %d points, %d speed tests, %d nameable cells -> %d named places"
          " (%d cells unnamed), %d day(s)"
          % (d.get("points", 0), d.get("tested", 0), len(cells), len(spots),
             unnamed, d.get("days", 0)))
    if d.get("area_km"):
        print("             area measured: %s x %s km" % tuple(d["area_km"]))
    for i, s in enumerate(spots[:MAX_SPOTS], 1):
        print("   %2d. %-22s %5.1f Mbps  %4d tests  %d day(s)"
              % (i, s["name"], s["dl"], s["tests"], s["days"]))
    if not spots:
        print("   (no named places — geocoding returned nothing; NOT writing a blank list)")
        return 1

    if "--show" in sys.argv:
        return 0

    d["spots"] = spots[:MAX_SPOTS]
    d["spots_named"] = len(spots)
    d.pop("cells", None)                       # raw cells never go in the page
    d["_refreshed"] = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write('"""Snapshot of the van signal map summary, for server-rendering.\n\n')
        f.write("GENERATED by refresh_van_summary.py — do not hand-edit.\n")
        f.write("Re-run that script and rebuild to update the numbers on the page.\n")
        f.write('"""\n\n')
        f.write("VAN_MAP_SUMMARY = ")
        f.write(repr(d))
        f.write("\n")
    print("wrote %s" % OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
