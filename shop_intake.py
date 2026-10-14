# -*- coding: utf-8 -*-
"""One machine from the bench to the shop (14 Oct 2026, the refurbished Dells online).

Owner: "make it as easy as possible and as straightforward". He films the machine on the turntable and runs its 365 PC
Manager full service; the folder with the video and the Service Report goes in D:/claude/shop-kit/intake/<anything>/.
Claude reads what it cost from the eBay purchase history, then:

    py shop_intake.py latitude-5520-01 "D:/claude/shop-kit/intake/5520 a" --model latitude-5520 --grade A
        --cost 180.00 --order 20-15135-03052 --bought 2026-09-11 [--ssd 199.99] [--screen "..."] [--form SFF]
        [--marks "..."] [--extras "..."] [--price 560] [--start 0.8]

  1. the video  -> images/shop/<id>/ photos + a 360 view (shop_spin.py)
  2. the report -> shop_checks/<id>.json + the processor, memory, Windows and battery (shop_report.py); it STOPS on a
                   warning a buyer must not see (Windows not activated, a drive that isn't healthy...)
  3. the price  -> the owner's rule (14 Oct 2026): the model's guide price, but never less than what it cost on eBay
                   + the SSD + £150, rounded UP to £5
  4. the row    -> added to shop_stock.py (status 'live', or 'draft' with --draft)
  5. the books  -> what it cost goes in the PRIVATE intake log (D:/claude/shop-kit/intake-log.csv, never the website - this
                   repository is public); the owner records the same in the staff portal's shop card (Invoices), which
                   puts the purchase in QuickBooks.
"""
import argparse
import csv
import math
import os
import re
import sys

import shop_report
import shop_spin
import shop_stock as S

BASE = os.path.dirname(os.path.abspath(__file__))
LABOUR = 150
LOG = os.environ.get("SHOP_INTAKE_LOG", "D:/claude/shop-kit/intake-log.csv")   # private: costs never go in this public repo
MARKER = "    # ---- shop_intake.py adds each machine above this line ----"
SCREENS = {   # the usual screen, when --screen isn't given (laptops)
    "latitude-3420": '14" Full HD (1920 x 1080)', "latitude-3520": '15.6" Full HD (1920 x 1080)', "latitude-3540": '15.6" Full HD (1920 x 1080)',
    "latitude-5420": '14" Full HD (1920 x 1080)', "latitude-5430": '14" Full HD (1920 x 1080)', "latitude-5520": '15.6" Full HD (1920 x 1080)',
    "latitude-5530": '15.6" Full HD (1920 x 1080)', "latitude-7320": '13.3" Full HD (1920 x 1080)', "latitude-7420": '14" Full HD (1920 x 1080)',
    "latitude-7330": '13.3" Full HD (1920 x 1080)', "latitude-7430": '14" Full HD (1920 x 1080)',
}
FORMS = {"micro": "Micro", "sff": "Small form factor (SFF)", "tower": "Tower", "mt": "Tower"}


def guide_and_kind(model):
    """The model's guide price and kind: SHOP_MODELS, else DELL_MACHINES (read from build_extra.py's source - importing it
    would run the whole site build)."""
    if model in S.SHOP_MODELS:
        return S.SHOP_MODELS[model]["guide"], S.SHOP_MODELS[model]["kind"]
    src = open(os.path.join(BASE, "build_extra.py"), encoding="utf-8").read()
    m = re.search(r'\("%s",\s*"(laptop|desktop)",\s*"[^"]*",\s*"[^"]*",\s*"[^"]*",\s*(\d+),' % re.escape(model), src)
    if not m:
        raise SystemExit("*** model %r is neither in DELL_MACHINES (build_extra.py) nor SHOP_MODELS (shop_stock.py) ***" % model)
    return int(m.group(2)), m.group(1)


def price_for(guide, cost, ssd, labour=LABOUR):
    """The owner's rule: the guide price, with a floor of eBay cost + SSD + labour rounded UP to the next £5."""
    floor = int(math.ceil((float(cost) + float(ssd) + labour) / 5.0) * 5)
    return max(int(guide), floor), floor


def row_text(f):
    def q(v):
        return repr(v) if not isinstance(v, str) or "'" not in v else '"%s"' % v.replace('"', '\\"')
    keys = ["id", "model", "ebay", "status", "edition", "price", "cpu", "ram"] + (["screen"] if f.get("screen") else ["form"]) + \
           ["windows", "grade"] + (["battery"] if f.get("battery") else []) + ["marks", "extras", "charger", "photos"]
    parts = ["%s=%s" % (k, q(f[k])) for k in keys if k in f]
    lines, cur = [], "    dict("
    for p in parts:
        if len(cur) + len(p) + 2 > 118:
            lines.append(cur.rstrip())
            cur = "         "
        cur += p + ", "
    lines.append(cur.rstrip().rstrip(",") + "),")
    return "\n".join(lines)


def add_row(f, path=None):
    path = path or os.path.join(BASE, "shop_stock.py")
    s = open(path, encoding="utf-8").read()
    if re.search(r'id="%s"' % re.escape(f["id"]), s) or re.search(r"id='%s'" % re.escape(f["id"]), s):
        raise SystemExit("*** %s is already in shop_stock.py - never reuse an id ***" % f["id"])
    if MARKER not in s:
        raise SystemExit("*** the marker line is missing from shop_stock.py ***")
    s = s.replace(MARKER, row_text(f) + "\n" + MARKER)
    open(path, "w", encoding="utf-8", newline="\n").write(s)


def find(folder, exts, words=()):
    hits = [os.path.join(folder, n) for n in os.listdir(folder) if n.lower().endswith(exts) and all(w.lower() in n.lower() for w in words)]
    return max(hits, key=os.path.getsize) if hits else None


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("unit_id"); ap.add_argument("folder")
    ap.add_argument("--model", required=True); ap.add_argument("--grade", required=True, choices=["A", "B", "C"])
    ap.add_argument("--cost", required=True, type=float, help="what it cost on eBay, postage included")
    ap.add_argument("--order", required=True); ap.add_argument("--bought", required=True, help="yyyy-mm-dd")
    ap.add_argument("--ssd", type=float, default=199.99); ap.add_argument("--price", type=int)
    ap.add_argument("--screen"); ap.add_argument("--form"); ap.add_argument("--marks", default=""); ap.add_argument("--extras", default="")
    ap.add_argument("--start", type=float, default=0.0); ap.add_argument("--period", type=float)
    ap.add_argument("--draft", action="store_true"); ap.add_argument("--force", action="store_true", help="list it despite report warnings")
    a = ap.parse_args(argv)
    if not re.match(r"^[a-z0-9][a-z0-9-]{1,40}$", a.unit_id):
        raise SystemExit("*** the id must be lower case letters, numbers and dashes ***")
    guide, kind = guide_and_kind(a.model)
    stock = open(os.path.join(BASE, "shop_stock.py"), encoding="utf-8").read()
    if 'id="%s"' % a.unit_id in stock or "id='%s'" % a.unit_id in stock:
        raise SystemExit("*** %s is already in shop_stock.py - never reuse an id ***" % a.unit_id)

    report = find(a.folder, (".html", ".htm"), ("report",))
    video = find(a.folder, (".mp4", ".mov", ".m4v", ".mkv"))
    if not report:
        raise SystemExit("*** no 365 PC Manager report (.html) in %s ***" % a.folder)
    print("Report:", os.path.basename(report))
    c = shop_report.write(a.unit_id, report)
    warn = shop_report.warnings(c)
    for w in warn:
        print("  WARNING:", w)
    if warn and not a.force:
        os.remove(os.path.join(BASE, "shop_checks", a.unit_id + ".json"))
        raise SystemExit("*** not listed: fix the warnings above and run the service again (or --force) ***")
    sug = shop_report.suggest(c)
    for k in ("cpu", "ram", "windows"):
        if k not in sug:
            raise SystemExit("*** the report doesn't say the %s - is it the right file? ***" % k)
    if kind == "laptop" and "battery" not in sug:
        raise SystemExit("*** the report has no battery health - run the FULL service on the laptop ***")

    photos = []
    if video:
        print("Video:", os.path.basename(video))
        photos = shop_spin.make(a.unit_id, video, a.start, a.period)["photos"]
    else:
        raise SystemExit("*** no turntable video in %s ***" % a.folder)

    price, floor = price_for(guide, a.cost, a.ssd)
    if a.price:
        price = a.price
    f = {"id": a.unit_id, "model": a.model, "ebay": a.order, "status": "draft" if a.draft else "live", "edition": 1, "price": price,
         "cpu": sug["cpu"], "ram": sug["ram"], "windows": sug["windows"], "grade": a.grade, "marks": a.marks, "extras": a.extras,
         "charger": S.CHARGER_DEFAULT[kind], "photos": photos}
    if kind == "laptop":
        f["screen"] = a.screen or SCREENS.get(a.model, "")
        f["battery"] = sug["battery"]
        if not f["screen"]:
            raise SystemExit("*** give --screen for this model ***")
    else:
        f["form"] = FORMS.get((a.form or "").lower(), a.form or "")
        if not f["form"]:
            raise SystemExit("*** give --form Micro, SFF or Tower ***")
    add_row(f)
    new = not os.path.exists(LOG)
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, "a", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        if new:
            w.writerow(["id", "model", "ebay_order", "bought", "ebay_cost", "ssd", "labour", "guide", "floor", "price"])
        w.writerow([a.unit_id, a.model, a.order, a.bought, "%.2f" % a.cost, "%.2f" % a.ssd, LABOUR, guide, floor, price])
    print("\nAdded to shop_stock.py: %s at £%d (guide £%d, floor £%d = £%.2f + £%.2f SSD + £%d)" % (a.unit_id, price, guide, floor, a.cost, a.ssd, LABOUR))
    print("Its eBay order %s is on the row: the staff portal's Shop tab links the purchase the eBay connection found." % a.order)
    print("If the eBay connection isn't set up yet, record it by hand there (Record what it cost):")
    print("  eBay order %s  |  bought %s  |  £%.2f  |  SSD £%.2f" % (a.order, a.bought, a.cost, a.ssd))
    return f


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
