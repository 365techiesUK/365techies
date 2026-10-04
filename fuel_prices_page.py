"""
/fuel-prices/ - the cheapest petrol and diesel in the UK, and near you (4 Oct 2026).

WHY
Owner, 4 Oct 2026: "have it on 365 techies ... under fuel prices ... for the whole of the UK straight away ... user
friendly and mobile phone friendly ... animated". The site serves people all over the UK and the posts that push this
go UK-wide, so it opens on the cheapest forecourts in the country; a postcode or "Use my location" narrows it to
10 miles (2 to 100 in the menu). Its twin /bournemouth/fuel-prices/ opens on Bournemouth. Both share fuel_finder_ui.py
and js/fuel-finder.js; data from api/bm-fuel.php (the government's Fuel Finder feed, OGL v3, every UK forecourt).

SEO, honestly: "cheapest petrol near me" is held by Google Maps and sites with a page per forecourt. This is a useful
free tool that brings people to the site and that posts can link to; no per-forecourt pages ([[no-thin-pages]]).

PUBLIC since 4 Oct 2026 (owner: "Yes, go public and do two and three"): in the sitemap, the site search and llms.txt,
the Free Tools menu (NAV_MENUS in build_pages.py) and the footer's FREE TOOLS column. Same day: "which supermarket has the
cheapest fuel" and "are fuel prices going up or down" (the government's weekly series since 2003 + our own daily record).
"""
import build_pages as bp
from build_extra import info_page
import fuel_finder_ui as ui

PUBLIC = True
_SLUG = "fuel-prices"

_INNER = '''
          <h2>How it works</h2>
          <p>The page opens on the cheapest forecourts in the whole UK for the fuel you pick. Tap <strong>Use my location</strong> or type a postcode and it shows the cheapest within 10 miles of you instead; the distance menu goes from 2 miles to 100, or back to the whole UK. Tap a forecourt to see it on the map with all its prices, or <strong>Directions</strong> to open your maps app.</p>
          <p>The three numbers at the top are the cheapest price, the average, and what a full tank costs. Pick your vehicle in that box &mdash; a motorbike, a small or family car, an SUV, a van, a motorhome, a 7.5-tonne lorry or a 44-tonne HGV, or type your own tank size &mdash; and every price on the page shows the bill. The &ldquo;what it costs to fill up&rdquo; table puts every vehicle side by side at today&rsquo;s average price of unleaded and diesel.</p>
          <p>Further down: which supermarket has the cheapest fuel today, against the big fuel brands; whether prices are going up or down, with the government&rsquo;s weekly figures back to 2003, the record highs and how much of the price is tax; and the UK picture, comparing England, Scotland, Wales and Northern Ireland and the cheapest and dearest postcode areas &mdash; with yours, if you searched by postcode. In Dorset? Our <a href="/bournemouth/fuel-prices/">Bournemouth, Poole and Christchurch fuel prices</a> page opens on the town.</p>
          <h2>Where the prices come from</h2>
          <p>Since February 2026 every fuel retailer in the UK must report a price change to the government within 30 minutes, under the Motor Fuel Price (Open Data) Regulations 2025. The government publishes them as open data through its Fuel Finder service, and we fetch them every half hour. Every price shows when the forecourt set it, and one not confirmed for six weeks is left out rather than shown as current. The cheapest in the whole UK counts only prices set in the last two weeks.</p>
          <p>We&rsquo;re 365 Techies, a family-run IT support business in Bournemouth. We built this because fuel is costing everyone a fortune and the data is free &mdash; there are no adverts and nothing to sign up to.</p>'''

_FAQS = ui.faqs("anywhere in the UK by postcode or your location,")

bp.HEAD_EXTRA[_SLUG] = ui.HEAD + ui.app_head("Fuel Prices")
# its own home-screen identity (owner 4 Oct: "add it to their phone ... so they can find it easily")
bp.MANIFEST_FOR[_SLUG] = "/fuel-prices/app.webmanifest?v=1"
bp.TOUCH_ICON_FOR[_SLUG] = ui.TOUCH_ICON

info_page(
    slug=_SLUG, crumb_name="Fuel Prices",
    eyebrow="// FUEL PRICES",
    h1='UK fuel prices today: the cheapest <em class="grad grad--cyan">near you</em>',
    lede="Live pump prices from every UK forecourt, cheapest first &mdash; in the whole country, or near you. Free, no adverts.",
    desc="UK fuel prices today from every forecourt: the average price of petrol and diesel, the cheapest near you by postcode, and what a tank costs for a car, van or HGV. Free, no adverts.",
    title="UK Fuel Prices Today: Cheapest Petrol & Diesel Near You | 365 Techies",
    og_title="UK fuel prices today: the cheapest petrol and diesel near you",
    chips=["Every UK forecourt", "Updated every 30 minutes", "No adverts"],
    task=True,
    pre=ui.tool("uk", "uk"),
    inner=_INNER,
    faqs=_FAQS,
    cta_args=("Computer playing up?", "We&rsquo;re a family-run team in Bournemouth &mdash; remote help across the UK, and collection and repair locally.",
              ("Get Help", "/contact/"), ("Call 01202 775566", "tel:+441202775566")),
    robots=None if PUBLIC else "noindex,follow",
)
_page = next(p for p in bp.PAGES if p.get("slug") == _SLUG)
_page["nosearch"] = not PUBLIC
_page["og_image"] = bp.SITE + "/images/og-fuel-prices-uk-v1.jpg"   # a real screenshot of the page (4 Oct)

# The tool itself in the page's schema graph (info_page builds crumb + WebPage + FAQPage; this adds the WebApplication).
import json as _json
_orig_schema = _page["schema"]
def _schema_with_app(s, _o=_orig_schema):
    g = _json.loads(_o(s))
    url = bp.SITE + "/" + _SLUG + "/"
    g["@graph"].append(ui.web_app(url, "Fuel Prices: the cheapest petrol and diesel near you",
                                  "Live UK pump prices from every forecourt, cheapest first, with the cost of a full tank for any vehicle.",
                                  bp.SITE + "/#business"))
    return _json.dumps(g, indent=2, ensure_ascii=False)
_page["schema"] = _schema_with_app
