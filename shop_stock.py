# -*- coding: utf-8 -*-
"""Refurbished Dells IN STOCK, bought online with PayPal (14 Oct 2026).

Owner: "PayPal, £15 delivery, start with 10 laptops". Until now every Dell was sold by quote at a GUIDE price
(/dell-hardware/#pick); Google Shopping can only list a machine someone can buy at a fixed price there and then, so the
machines that are actually on the shelf get a page each with a fixed price and PayPal's buttons
(/refurbished-dell-for-sale/<id>/), a list page (/refurbished-dell-for-sale/) and a Google product feed
(api/shop-feed.php). shop_pages.py builds them from this file; the server (api/shop.php) takes the payment and marks
the machine sold, so the same machine can never be sold twice.

ONE ROW PER MACHINE. To add one, copy a row and fill it in from the machine itself:
  id        the page address and PayPal's item code: model + a number, lower case, e.g. 'latitude-5520-01'. Never reuse
            one - a sold machine's page stays up saying "Sold".
  model     the DELL_MACHINES id in build_extra.py (series page, kind, guide price), or a SHOP_MODELS id below
  status    'draft'  - being got ready: no page, not for sale
            'live'   - on sale (needs at least one photo of THIS machine)
            'sold'   - sold elsewhere, or the server sold it and the next build should say so for good
            'test'   - the hidden test machine: its page works but is in no list and no feed
  edition   1. If a sold machine comes back (a refund) and goes on sale again, make it 2 - the server's "sold" belongs
            to edition 1, so edition 2 is for sale.
  price     whole pounds; leave out for the model's guide price. Delivery is added on top (DELIVERY_GBP).
  cpu, ram, windows   what the machine really has (the SSD is always the new 1TB Samsung 990 PRO - SSD below)
  screen    laptops: e.g. '15.6" Full HD (1920 x 1080), touchscreen'
  form      desktops: 'Micro', 'Small form factor (SFF)' or 'Tower'
  grade     'A', 'B' or 'C' - looks only, every grade is fully tested (GRADES)
  battery   laptops: battery health as Dell's BIOS or Power Manager reports it, e.g. '91%'
  marks     honest cosmetic notes for this machine ('' if none)
  extras    optional: 'Backlit keyboard, fingerprint reader'
  charger   what's in the box to power it
  photos    files in images/shop/<id>/ - real photos of THIS machine, 4:3, made by shop_photos.py
  ⚠ No purchase cost here, ever: this repository is public. Costs live in QuickBooks.
"""

DELIVERY_GBP = 15                  # owner 14 Oct 2026: £15 UK delivery
DISPATCH_DAYS = (1, 2)             # working days from order to the courier
TRANSIT_DAYS = (1, 2)              # tracked courier, working days
SSD = "1TB Samsung 990 PRO, brand new"

# Models the website's Dell picker (build_extra.py DELL_MACHINES) doesn't carry, for machines that are in stock. The guide
# price follows the owner's rule: average eBay UK sold price + a new 1TB Samsung 990 PRO + £150, to the nearest £5.
SHOP_MODELS = {
    "optiplex-3060": dict(kind="desktop", series="OptiPlex 3000", name="OptiPlex 3060", guide=480, href="/refurbished-dell-optiplex-3000/",
                          basis="eBay UK sold average £131.23 (46 sold, i5 16GB, to 14 Oct 2026) + 990 PRO 1TB £199.99 (Scan, 14 Oct 2026) + £150"),
}

# What's in the box when a row doesn't say: shop_intake.py fills these in.
CHARGER_DEFAULT = {"laptop": "Dell 65W USB-C charger", "desktop": "UK power cable"}

GRADES = {
    "A": "Near-mint: hard to tell from new.",
    "B": "Light signs of use, such as small marks or light scratches.",
    "C": "More visible marks or scuffs. Fully working, the best price.",
}

UNITS = [
    # The test machine (owner's live end-to-end test: buy it for £1, then refund it in PayPal). No delivery charge and no
    # photo needed; its page says TEST and it never appears in the list, the feed or the sitemap.
    dict(id="test-01", model="latitude-5520", status="test", edition=1, price=1,
         cpu="Test listing - not a real machine", ram="-", screen="-", windows="-", grade="A", battery="-",
         marks="This is our own test listing. Please don't buy it.", charger="-", photos=[]),

    # ---- shop_intake.py adds each machine above this line ----
    # The first ten laptops go here as each one is ready, e.g.:
    # dict(id="latitude-5520-01", model="latitude-5520", status="draft", edition=1,
    #      cpu="Intel Core i5-1145G7 (11th gen, 4 cores / 8 threads)", ram="16GB", screen='15.6" Full HD (1920 x 1080)',
    #      windows="Windows 11 Pro", grade="A", battery="91%", marks="", extras="Backlit keyboard",
    #      charger="Dell 65W USB-C charger", photos=["1.webp", "2.webp", "3.webp", "4.webp"]),
]
