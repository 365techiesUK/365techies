"""Bake today's official sea-water statuses into /bournemouth/sea-today/ at build time.

WHY: the page paints its beach table and overflow answer with JavaScript from
api/bm-sea.php when it opens. Crawlers and AI answers do not run that script,
so until now they saw "Waiting for the Environment Agency feed" - a placeholder
where the one thing worth quoting should be. This fetches the same feed the
page uses (never a second source - dev/prod divergence is how these pages lie)
and writes a DATED snapshot into the static HTML. The script still overwrites
it live on load, so a reader always gets the current picture and a crawler
gets the last one, stamped.

Fails soft: no network at build, or a feed that is down, leaves the
placeholders exactly as they were.

Sea/river split mirrors the page's JS: Wessex names the receiving water on
every monitor, and a discharge into the Stour or Avon must never read as a
discharge at a beach. "ENGLISH CHANNEL" outfalls are sea outfalls; the page's
original test looked only for "POOLE BAY" and mis-filed them as river monitors.
"""
import datetime
import json
import math
import urllib.request

FEED = "https://365techies.co.uk/api/bm-sea.php"
SEA_WATERS = ("POOLE BAY", "ENGLISH CHANNEL")
MAP_LINK = "/bournemouth/live-map/app/#lat=%.4f&amp;lon=%.4f&amp;alt=2500&amp;v=2&amp;l=v"


def _hav_km(la1, lo1, la2, lo2):
    p = math.pi / 180.0
    dla = (la2 - la1) * p
    dlo = (lo2 - lo1) * p
    h = math.sin(dla / 2) ** 2 + math.cos(la1 * p) * math.cos(la2 * p) * math.sin(dlo / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def _local(iso):
    """Feed times are UTC ISO; the page speaks UK local time."""
    try:
        return datetime.datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone()
    except Exception:
        return None


def _hm(dt):
    return dt.strftime("%H:%M") if dt else "an unknown time"


def _esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def st_bake(feed=FEED, timeout=12):
    try:
        req = urllib.request.Request(
            feed, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) 365techies-site-build"}
        )
        d = json.load(urllib.request.urlopen(req, timeout=timeout))
    except Exception:
        return None

    bathing = d.get("bathing") or {}
    overflow = d.get("overflow") or {}
    sites = bathing.get("sites") or []
    if not (bathing.get("ok") and sites):
        return None

    monitors = (overflow.get("monitors") or []) if overflow.get("ok") else []
    sea = [m for m in monitors if any(k in str(m.get("water") or "").upper() for k in SEA_WATERS)]
    river = [m for m in monitors if m not in sea]
    sea_dis = sum(1 for m in sea if m.get("status") == 1)
    riv_dis = sum(1 for m in river if m.get("status") == 1)
    now = datetime.datetime.now()

    rows = []
    for s in sites:
        prf = s.get("prf") or {}
        level = "&mdash;"
        try:
            if prf.get("expires") and datetime.datetime.fromisoformat(prf["expires"]) > now:
                level = _esc(prf.get("level") or "&mdash;")
        except Exception:
            pass
        outfall = "&mdash;"
        lat, lng = s.get("lat"), s.get("lng")
        located = [m for m in sea if m.get("lat") is not None and m.get("lng") is not None]
        if lat is not None and lng is not None and located:
            best = min(located, key=lambda m: _hav_km(lat, lng, m["lat"], m["lng"]))
            km = _hav_km(lat, lng, best["lat"], best["lng"])
            st = best.get("status")
            word = "&#9888; discharging" if st == 1 else ("monitor offline" if st == -1 else "no discharge")
            outfall = "%s &middot; %.1f km away" % (word, km)
        link = MAP_LINK % (lat, lng) if lat is not None and lng is not None else "/bournemouth/live-map/"
        cls = _esc(s.get("class") or "?") + (" (%s)" % _esc(s["classYear"]) if s.get("classYear") else "")
        rows.append(
            "<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td>"
            "<td><a href='%s'>Show on map</a></td></tr>"
            % (_esc(s.get("name") or "?"), cls, level, "yes" if s.get("heavyRain") else "no", outfall, link)
        )

    read = _local(overflow.get("read_at") or "") if overflow.get("ok") else None
    if not overflow.get("ok"):
        sewage = ("The storm-overflow monitor feed was not responding when this page was built; "
                  "it is read again live when the page opens.")
    elif sea_dis:
        sewage = ("Yes &mdash; %d seafront outfall%s reporting a discharge into the sea "
                  "(Wessex Water monitors, checked %s)." % (sea_dis, "s were" if sea_dis > 1 else " was", _hm(read)))
    elif riv_dis:
        sewage = ("Not into the sea at these beaches &mdash; no seafront outfall was discharging; %d monitor%s "
                  "upstream on the Stour or Avon %s (Wessex Water, checked %s)."
                  % (riv_dis, "s" if riv_dis > 1 else "", "were" if riv_dis > 1 else "was", _hm(read)))
    else:
        sewage = ("No &mdash; none of the %d monitored storm overflows around Bournemouth was reporting a discharge "
                  "(Wessex Water monitors, checked %s)." % (int(overflow.get("total") or len(monitors)), _hm(read)))

    ea_read = _local(bathing.get("read_at") or "")
    stamp = (read or ea_read or datetime.datetime.now().astimezone())
    # No %-d on Windows strftime: strip the leading zero by hand.
    day = stamp.strftime("%d %B %Y").lstrip("0")
    note = "Statuses as read at %s on %s; they refresh live when this page opens." % (_hm(stamp), day)

    return {"rows": "\n".join(rows), "sewage": sewage, "note": note,
            "sea_dis": sea_dis, "riv_dis": riv_dis, "sites": len(sites)}


if __name__ == "__main__":
    r = st_bake()
    if not r:
        print("bake: feed unavailable (placeholders would stay)")
    else:
        print("bake:", r["sites"], "beaches;", "sea discharging", r["sea_dis"], "river", r["riv_dis"])
        print(r["note"])
        print(r["sewage"])
        print(r["rows"].split("\n")[0][:220])
