"""refresh_signal_areas.py - per-town snapshot of the public crowd signal map,
for the measured-signal block on the /it-support-<town>/ pages.

Run on the laptop, then rebuild:
    py refresh_signal_areas.py && py build_blog.py

WHY A SNAPSHOT (same pattern as refresh_van_summary.py -> van_map_data.py):
the build must never do network I/O. CI only FTPS-syncs committed HTML, so the
numbers on a town page are whatever this script last wrote, stamped with when.
The block itself refuses to render numbers from a snapshot older than
SIGNAL_MAX_AGE_DAYS - a stale figure is the same failure as the customer
counts that were declined for the area pages: it decays into a lie.

WHAT IS WRITTEN, AND WHAT IS NOT:
- per town: reading count, square count, the nearest-to-verified square's
  n/need, and for VERIFIED squares only (n >= need, re-checked here) a locality
  name + median download + count. Unverified squares never contribute a speed.
- squares are assigned to the NEAREST town centroid within that town's radius
  (Voronoi with a cap). Bounding boxes were rejected: Bournemouth, Poole,
  Broadstone and Upton centroids sit 3-6 km apart and boxes would put one
  square on two pages - a duplicate-content footprint.
- locality names come from the shared Nominatim cache at zoom 16 (suburb
  level, never a road). Unnamed verified squares are COUNTED but not LISTED.
- the van's named spots are mapped to towns by a STATIC dict, never guessed.
- NOT written: network names (never), anything per reading, any coordinate
  finer than the cell centre the public API already serves.
"""
import ast
import json
import pprint
import math
import os
import sys
from datetime import datetime, timezone

from refresh_van_summary import fetch_json, geocode, load_cache, save_cache

HERE = os.path.dirname(os.path.abspath(__file__))
PLACES = {}
URL = "https://365techies.co.uk/api/signal-check.php?map=1"
OUT = os.path.join(HERE, "signal_area_data.py")

# km from a town centroid within which a square may belong to that town. Sized
# to the real towns: Bournemouth's centre-to-Southbourne is ~6 km, Poole is
# wide, the suburbs with their own pages (Broadstone, Upton, Corfe Mullen,
# West Moors) only claim what sits right on top of them.
RADIUS_KM = {"it-support-bournemouth": 7.0, "it-support-poole": 6.0,
             "it-support-southampton": 4.0, "it-support-christchurch": 3.5,
             "it-support-wimborne": 3.5, "it-support-ferndown": 3.0,
             "it-support-verwood": 3.0, "it-support-ringwood": 3.0,
             "it-support-broadstone": 2.0, "it-support-upton": 2.0,
             "it-support-corfe-mullen": 2.0, "it-support-west-moors": 2.0}
DEFAULT_RADIUS_KM = 2.5

# Van map localities -> town slug. Static on purpose: a wrong guess here would
# put Poole's Old Town on the Bournemouth page. Unknown names warn and skip.
VAN_LOCALITY_TOWN = {
    "Townsend": "it-support-bournemouth", "Iford": "it-support-bournemouth",
    "Moordown": "it-support-bournemouth", "Winton": "it-support-bournemouth",
    "Boscombe": "it-support-bournemouth", "Southbourne": "it-support-bournemouth",
    "Lansdowne": "it-support-bournemouth", "Westbourne": "it-support-bournemouth",
    "West Cliff": "it-support-bournemouth", "Springbourne": "it-support-bournemouth",
    "Lower Parkstone": "it-support-poole", "Old Town": "it-support-poole",
    "Lilliput": "it-support-poole", "Longfleet": "it-support-poole",
    "Parkstone": "it-support-poole", "Sandbanks": "it-support-poole",
    "Parley Cross": "it-support-ferndown", "Ferndown Town": "it-support-ferndown",
}


def load_coords():
    """COORDS from build_local.py WITHOUT importing it (importing registers
    every page and drags build_pages in). A literal dict, so ast is enough."""
    src = open(os.path.join(HERE, "build_local.py"), encoding="utf-8").read()
    tree = ast.parse(src)
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
                isinstance(t, ast.Name) and t.id == "COORDS" for t in node.targets):
            return ast.literal_eval(node.value)
    raise SystemExit("COORDS not found in build_local.py")


def km(lat1, lon1, lat2, lon2):
    dlat = (lat1 - lat2) * 111.32
    dlon = (lon1 - lon2) * 111.32 * math.cos(math.radians((lat1 + lat2) / 2))
    return math.hypot(dlat, dlon)


def nearest_town(lat, lon, coords):
    """The nearest town AMONG THOSE WHOSE RADIUS COVERS THE POINT. Plain
    nearest-centroid handed Bournemouth's northern squares to Broadstone (whose
    small radius then rejected them) - a square 5.6 km from Bournemouth centre
    and 4.6 km from Broadstone is Bournemouth, not nothing."""
    best, bd = None, 1e9
    for slug, (tla, tlo) in coords.items():
        if slug == "it-support-dorset":        # the hub shares Bournemouth's geo
            continue
        d = km(lat, lon, tla, tlo)
        if d <= RADIUS_KM.get(slug, DEFAULT_RADIUS_KM) and d < bd:
            best, bd = slug, d
    return best


def main():
    coords = load_coords()
    try:
        j = fetch_json(URL)
    except Exception as e:                                # noqa: BLE001
        print("fetch failed (%s) - leaving the existing snapshot untouched" % e)
        return 1
    cells = j.get("cells") if isinstance(j, dict) else None
    if not j.get("ok") or not isinstance(cells, list):
        print("feed did not return cells - leaving the existing snapshot untouched")
        return 1

    towns = {}
    cache = load_cache()
    named = 0
    global PLACES
    PLACES = {}
    for c in cells:
        slug = nearest_town(c["lat"], c["lon"], coords)
        if not slug:
            continue
        t = towns.setdefault(slug, {"readings": 0, "squares": 0, "verified": [],
                                    "nearest": None, "van": []})
        need = int(c.get("need") or j.get("need") or 8)
        n = int(c.get("n") or 0)
        t["readings"] += n
        t["squares"] += 1
        ready = n >= need                                  # re-checked, never trusted
        if ready:
            name = geocode(c["lat"], c["lon"], cache)       # cached; paced; never a road
            if name:
                named += 1
                PLACES["%.4f,%.4f" % (c["lat"], c["lon"])] = name
                t["verified"].append({"name": name, "dl": round(float(c["dl"]), 1),
                                      "n": n, "g": c.get("g", "i")})
            else:
                t.setdefault("verified_unnamed", 0)
                t["verified_unnamed"] = t.get("verified_unnamed", 0) + 1
        else:
            if t["nearest"] is None or n > t["nearest"][0]:
                t["nearest"] = [n, need]
    save_cache(cache)

    # van spots, by static map only
    try:
        from van_map_data import VAN_MAP_SUMMARY as V
        for s in V.get("spots", []):
            slug = VAN_LOCALITY_TOWN.get(s["name"])
            if not slug:
                print("   van locality not mapped to a town (skipped): %s" % s["name"])
                continue
            towns.setdefault(slug, {"readings": 0, "squares": 0, "verified": [],
                                    "nearest": None, "van": []})
            towns[slug]["van"].append({"name": s["name"], "dl": s["dl"], "tests": s["tests"]})
    except ImportError:
        pass
    for t in towns.values():
        t["verified"].sort(key=lambda v: -v["dl"])
        t["van"].sort(key=lambda v: -v["dl"])

    snap = {"ok": True, "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "total_readings": sum(c.get("n", 0) for c in cells), "total_squares": len(cells),
            "towns": towns}
    body = ('"""Per-town snapshot of the public crowd signal map, for the measured-signal\n'
            'block on the town pages.\n\nGENERATED by refresh_signal_areas.py - do not hand-edit.\n"""\n\n'
            "SIGNAL_AREAS = " + pprint.pformat(snap, width=100, sort_dicts=True) + "\n")
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(body)
    os.replace(tmp, OUT)
    # Static names for VERIFIED squares only, for the page's "best measured
    # spots near you" block: keyed by the rounded cell centre the public feed
    # serves, so the client can join without any coordinate finer than the
    # cell. Unverified squares are deliberately absent - no name, no speed,
    # until the floor is met. Served as /signal-places.json (cache-busted by
    # the page with the snapshot time).
    places = PLACES          # cell centre -> locality, collected while naming above
    # Guard: a place NAME must never be a network name (the shared/best-spots
    # UI prints these). "Three Legged Cross" is a real village - allowed.
    import re as _re
    for k, nm in places.items():
        if _re.search(r"(Three|EE|O2|Vodafone|giffgaff|Sky|Tesco)", nm.replace("Three Legged Cross", "")):
            raise SystemExit("refusing to write signal-places.json: place name looks like a network: %r" % nm)
    pj = os.path.join(HERE, "signal-places.json")
    with open(pj + ".tmp", "w", encoding="utf-8") as f:
        json.dump({"generated": snap["generated"], "places": places}, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(pj + ".tmp", pj)
    print("wrote signal-places.json: %d named verified squares" % len(places))
    print("wrote %s: %d towns with data, %d verified squares named, %d readings in %d squares"
          % (os.path.basename(OUT), len(towns), named, snap["total_readings"], snap["total_squares"]))
    for slug, t in sorted(towns.items(), key=lambda kv: -kv[1]["readings"]):
        print("   %-28s %3d readings %3d squares  verified %d  nearest %s  van %d"
              % (slug, t["readings"], t["squares"], len(t["verified"]), t["nearest"], len(t["van"])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
