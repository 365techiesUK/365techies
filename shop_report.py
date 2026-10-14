# -*- coding: utf-8 -*-
"""A machine's own 365 PC Manager report -> its listing (14 Oct 2026, the refurbished Dells bought online).

Owner: "couldn't we do the report from 365 PC Manager on each machine and include that in the spec ... so then they've
actually got a live report from our PC Manager". So each machine for sale can show what our own full service found on
it: the scores, Windows and its updates, the drive's health and how little the brand-new SSD has been used, the battery,
the speed tests and what the machine is good for.

    py shop_report.py latitude-5520-01 "D:/photos/5520 no1/365 Techies Service Report 2026-10-15.html"

Reads a Service Report (the full service, best) or a PC Health Report (the app's quick check), keeps ONLY facts about
the machine - never the name it was prepared for, the computer's network name, the office's broadband or router, the
backup, running costs, startup programs or remote-support details - and writes shop_checks/<id>.json, which
shop_pages.py shows on that machine's page. It also prints what to type into shop_stock.py and warns about anything a
buyer should not see on a machine for sale (Windows not activated, a drive or battery that isn't healthy...).
"""
import html as _html
import json
import os
import re
import sys

_BASE = os.path.dirname(os.path.abspath(__file__))

# what may be shown, by the report's own labels; anything else is left out
COMPUTER_KEYS = ("Make & model", "Windows", "Processor", "Graphics", "Memory", "Main drive", "Temperatures",
                 "Stability (30 days)", "Windows licence", "Protection status", "Drive encryption", "Battery", "Peaks under load")
DID_KEYS = ("Hardware & health snapshot", "Windows updates (incl. drivers)", "Manufacturer driver updates", "Update applications",
            "Update Microsoft Office", "System file check", "Security scan (runs alongside)", "Security scan",
            "Optimise drives", "Clean-up (temp files)", "Performance & graphics benchmark")
NET_KEYS = ("Firewall", "Remote Desktop", "Old file sharing (SMB1)")
HEALTH_KEYS = ("Make & model", "Processor", "Graphics", "Storage type", "Drive health", "Drive age", "Drive wear", "Memory",
               "Battery health", "Age", "Free disk space", "Antivirus", "Windows updates", "Temperature")


def _t(fragment):
    """Cell HTML -> plain text: <br> becomes ' - ', tags go, entities decoded, spaces tidied."""
    s = re.sub(r"<br\s*/?>", " - ", fragment or "", flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = _html.unescape(s).replace("\u00a0", " ")
    return re.sub(r"\s+", " ", s).strip(" -")


def _section(s, h2, stop=r"<h2>"):
    i = s.find("<h2>" + h2 + "</h2>")
    if i < 0:
        return ""
    j = re.search(stop, s[i + 4:])
    return s[i: i + 4 + (j.start() if j else len(s))]


def _rows(fragment):
    return [(_t(a), _t(b)) for a, b in re.findall(r"<tr><td>(.*?)</td><td>(.*?)</td></tr>", fragment, re.S)]


def _scrub(value, secrets):
    for x in secrets:
        if x and len(x) >= 3 and x.lower() in value.lower():
            return None
    return value


def parse_service(s):
    sub = re.search(r'<p class="sub">Prepared for <strong>(.*?)</strong>(.*?)</p>', s, re.S)
    who = _t(sub.group(1)) if sub else ""
    segs = [x.strip() for x in _t(sub.group(2)).split("\u00b7")] if sub else []
    date = next((x for x in segs if re.search(r"\b(19|20)\d\d\b", x)), "")
    pcname = next((x for x in segs if x and x != date and not x.startswith("service time")), "")
    secrets = [who, pcname]
    out = {"kind": "service", "date": re.sub(r",\s*\d\d:\d\d$", "", date)}
    m = re.search(r'data-score="(\d+)"', s)
    out["score"] = int(m.group(1)) if m else None
    m = re.search(r'class="scoreverdict[^"]*">(.*?)</div>', s, re.S)
    out["verdict"] = _t(m.group(1)) if m else ""
    out["cats"] = [{"name": _t(n), "value": int(v), "note": _t(note)} for n, v, note in
                   re.findall(r"<div class='sc-name'>(.*?)</div>.*?<div class='sc-val'>(\d+)</div></div><div class='sc-note'>(.*?)</div>", s, re.S)]
    for c in out["cats"]:
        if _scrub(c["note"], secrets) is None:
            c["note"] = ""
    suited = _section(s, "What this PC is well suited to")
    out["suited"] = [_t(x) for x in re.findall(r"<li>(.*?)</li>", suited, re.S)]
    did = _section(s, "What the service did today")
    out["did"] = []
    for cls, name, detail in re.findall(r"<tr><td class='([a-z ]*)'>.*?</td><td>(.*?)</td><td>(.*?)</td></tr>", did, re.S):
        name, detail = _t(name), _t(detail)
        if name in DID_KEYS and cls.startswith("ok") and _scrub(detail, secrets) is not None:
            out["did"].append({"name": name, "detail": detail})
    comp = _section(s, "This computer")
    out["rows"] = [{"k": k, "v": v} for k, v in _rows(comp) if k in COMPUTER_KEYS and _scrub(v, secrets) is not None]
    net = _section(s, "Network safety")
    out["net"] = [{"k": k, "v": v} for k, v in _rows(net) if k in NET_KEYS]
    drives = _section(s, "Drives")
    out["drives"] = []
    for tr in re.findall(r"<tr>(.*?)</tr>", drives, re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        if len(cells) < 7:
            continue
        nm = re.split(r"<br\s*/?>", cells[0], maxsplit=1)
        out["drives"].append({"name": _t(nm[0]), "note": _t(nm[1]) if len(nm) > 1 else "", "type": _t(cells[1]),
                              "health": _t(cells[2]), "hours": _t(re.split(r"<br\s*/?>", cells[3])[0]),
                              "speed": _t(cells[4]), "written": _t(cells[6])})
    bench = _section(s, "Performance benchmark", stop=r"<h2>|<p")
    out["bench"] = [{"v": _t(v), "l": _t(l)} for v, l in re.findall(r"<div class=.kv.>(.*?)</div><div class=.kl.>(.*?)</div>", bench, re.S)]
    return out


def parse_health(s):
    sub = re.search(r"<h1>Your PC Health Report</h1><div class='sub'>(.*?)</div>", s, re.S)
    segs = [x.strip() for x in _t(sub.group(1)).split("\u00b7")] if sub else []
    date = next((x for x in segs if re.search(r"\b(19|20)\d\d\b", x)), "")
    m = re.search(r"<div class='sub' style='margin-top:\.4rem'>(.*?)<br>", s, re.S)
    comp = [x.strip() for x in _t(m.group(1)).split("\u00b7")] if m else []
    secrets = [segs[-1] if len(segs) > 3 else "", comp[0] if comp else ""]
    out = {"kind": "health", "date": re.sub(r"\s+at\s+\d\d:\d\d$", "", date), "cats": [], "suited": [], "did": [], "net": [], "drives": [], "bench": []}
    m = re.search(r"<div class='ring'><b>(\d+)%</b>", s)
    out["score"] = int(m.group(1)) if m else None
    m = re.search(r"<div class='verdict'>(.*?)</div>", s, re.S)
    out["verdict"] = _t(m.group(1)) if m else ""
    rows = [{"k": "Windows", "v": comp[1]}] if len(comp) > 1 else []
    rows += [{"k": k, "v": v} for k, v in _rows(s) if k in HEALTH_KEYS and _scrub(v, secrets) is not None]
    out["rows"] = rows
    return out


def _tidy(c):
    """The serial number (Dell's service tag) never goes on a public page; rows that only explain, not report, go too."""
    keep = []
    for r in c["rows"]:
        v = r["v"]
        if r["k"] == "Make & model":
            v = re.sub(r"\s*(\u00b7|-)?\s*serial\b.*$", "", v, flags=re.I).replace("Dell Inc.", "Dell").strip()
        if re.match(r"(not reported|the drive.s exact hours)", v, re.I) or not v:
            continue
        keep.append({"k": r["k"], "v": v})
    c["rows"] = keep
    return c


def parse(path):
    s = open(path, encoding="utf-8", errors="replace").read()
    if "scorehead" in s and "sc-row" in s:
        return _tidy(parse_service(s))
    if "Your PC Health Report" in s:
        return _tidy(parse_health(s))
    raise SystemExit("*** %s is not a 365 PC Manager report ***" % path)


def row(c, key):
    for r in c.get("rows", []):
        if r["k"] == key:
            return r["v"]
    return ""


def warnings(c):
    w = []
    if c.get("score") is not None and c["score"] < 80:
        w.append("overall score %s%% (%s) - fix what pulls it down and run the service again before listing" % (c["score"], c["verdict"]))
    for cat in c.get("cats", []):
        # a machine just set up has no backup yet - that alone is expected (the page explains it), not a warning
        only_backup = cat["name"] == "Protection" and "backup" in cat["note"].lower() and "antivirus on" in cat["note"].lower()
        if cat["value"] < 70 and not only_backup:
            w.append("%s scored %d (%s)" % (cat["name"], cat["value"], cat["note"]))
    lic = row(c, "Windows licence")
    if lic and "not activated" in lic.lower():
        w.append("WINDOWS IS NOT ACTIVATED - never list it like this")
    for d in c.get("drives", []):
        if d["health"] and d["health"].lower() != "healthy":
            w.append("drive %s: %s" % (d["name"], d["health"]))
    for cat in c.get("cats", []):
        if cat["name"] == "Battery":
            m = re.search(r"(\d+)%", cat["note"])
            if m and int(m.group(1)) < 80:
                w.append("battery holds only %s%% of its original charge - say so in marks, or fit a new battery" % m.group(1))
    prot = row(c, "Protection status") or row(c, "Antivirus")
    if prot and re.search(r"\boff\b", prot, re.I) and "firewall on" not in prot.lower():
        w.append("protection: " + prot)
    return w


def suggest(c):
    """What to type into the machine's row in shop_stock.py."""
    s = {}
    cpu = row(c, "Processor")
    if cpu:
        s["cpu"] = re.sub(r"\s+", " ", cpu.replace("11th Gen ", "").replace("12th Gen ", "").replace("(R)", "").replace("(TM)", "")).strip()
    mem = row(c, "Memory")
    m = re.match(r"([\d.]+)\s*GB", mem)
    if m:
        s["ram"] = "%dGB" % round(float(m.group(1)))
    win = row(c, "Windows")
    m = re.search(r"Windows 1[01] (Home|Pro|Enterprise|Education)", win)
    if m:
        s["windows"] = m.group(0)
    for cat in c.get("cats", []):
        if cat["name"] == "Battery":
            m = re.search(r"(\d+)%", cat["note"])
            if m:
                s["battery"] = m.group(1) + "%"
    bh = row(c, "Battery health")
    m = re.search(r"(\d+)%", bh)
    if m and "battery" not in s:
        s["battery"] = m.group(1) + "%"
    return s


def write(unit_id, path, base=None):
    c = parse(path)
    out_dir = os.path.join(base or _BASE, "shop_checks")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, unit_id + ".json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(c, f, ensure_ascii=False, indent=1)
    return c


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    c = write(sys.argv[1], sys.argv[2])
    sys.stdout.reconfigure(encoding="utf-8")
    print("shop_checks/%s.json: %s report of %s, score %s%% (%s), %d scores, %d facts, %d drives, %d speed tests"
          % (sys.argv[1], c["kind"], c["date"], c["score"], c["verdict"], len(c["cats"]), len(c["rows"]), len(c["drives"]), len(c["bench"])))
    print("For shop_stock.py:", ", ".join('%s="%s"' % kv for kv in suggest(c).items()))
    for w in warnings(c):
        print("  WARNING:", w)
