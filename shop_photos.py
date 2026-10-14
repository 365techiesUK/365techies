# -*- coding: utf-8 -*-
"""Photos of a machine for sale -> images/shop/<id>/ (14 Oct 2026, the refurbished Dells bought online - shop_stock.py).

    py shop_photos.py latitude-5520-01 "D:/photos/5520 no1"        (a folder of the phone's photos, JPG/PNG/WebP)

Each photo is turned the right way up (phones store "rotate me" separately), its hidden data is dropped - a phone photo
carries the GPS position of where it was taken, which must never reach the website - and it is saved as 1.webp, 2.webp...
in name order, at most 1600 px on the long side. Then put the file names in that machine's row in shop_stock.py.
"""
import os
import sys

from PIL import Image, ImageOps

MAX_SIDE = 1600
EXTS = (".jpg", ".jpeg", ".png", ".webp")


def convert(unit_id, src_dir, base=None):
    base = base or os.path.dirname(os.path.abspath(__file__))
    files = sorted(f for f in os.listdir(src_dir) if f.lower().endswith(EXTS))
    if not files:
        raise SystemExit("no photos (JPG, PNG or WebP) in %s" % src_dir)
    out = os.path.join(base, "images", "shop", unit_id)
    os.makedirs(out, exist_ok=True)
    names = []
    for n, f in enumerate(files, 1):
        with Image.open(os.path.join(src_dir, f)) as im:
            im = ImageOps.exif_transpose(im)          # the right way up
            im = im.convert("RGB")                     # a fresh image: no EXIF, no GPS, no camera details
            im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
            name = "%d.webp" % n
            im.save(os.path.join(out, name), "WEBP", quality=82, method=6)
            names.append(name)
            print("  %s -> images/shop/%s/%s (%dx%d)" % (f, unit_id, name, im.width, im.height))
    print('photos=[%s]' % ", ".join('"%s"' % x for x in names))
    return names


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    convert(sys.argv[1], sys.argv[2])
