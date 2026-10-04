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

HIDDEN until the owner says go: PUBLIC = False -> noindex (so not in sitemap.xml) + nosearch. When it goes public, add
it to the Free Tools menu (NAV_MENUS in build_pages.py) and the footer's FREE TOOLS column.
"""
import build_pages as bp
from build_extra import info_page
import fuel_finder_ui as ui

PUBLIC = False
_SLUG = "fuel-prices"

_INNER = '''
          <h2>How it works</h2>
          <p>The page opens on the cheapest forecourts in the whole UK for the fuel you pick. Tap <strong>Use my location</strong> or type a postcode and it shows the cheapest within 10 miles of you instead; the distance menu goes from 2 miles to 100, or back to the whole UK. Tap a forecourt to see it on the map with all its prices, or <strong>Directions</strong> to open your maps app.</p>
          <p>The three numbers at the top are the cheapest price, the average, and what filling a 55-litre tank at the cheapest saves against the average. Underneath, the UK picture compares England, Scotland, Wales and Northern Ireland, and the cheapest and dearest postcode areas &mdash; with yours, if you searched by postcode.</p>
          <h2>Where the prices come from</h2>
          <p>Since February 2026 every fuel retailer in the UK must report a price change to the government within 30 minutes, under the Motor Fuel Price (Open Data) Regulations 2025. The government publishes them as open data through its Fuel Finder service, and we fetch them every half hour. Every price shows when the forecourt set it, and one not confirmed for six weeks is left out rather than shown as current.</p>
          <p>We&rsquo;re 365 Techies, a family-run IT support business in Bournemouth. We built this because fuel is costing everyone a fortune and the data is free &mdash; there are no adverts and nothing to sign up to.</p>'''

_FAQS = ui.faqs("anywhere in the UK by postcode or your location,")

bp.HEAD_EXTRA[_SLUG] = ui.HEAD

info_page(
    slug=_SLUG, crumb_name="Fuel Prices",
    eyebrow="// FUEL PRICES",
    h1='The cheapest petrol and diesel, <em class="grad grad--cyan">live</em>',
    lede="Live pump prices from every UK forecourt, cheapest first &mdash; in the whole country, or near you. Free, no adverts.",
    desc="The cheapest petrol and diesel in the UK and near you: live pump prices from every forecourt, from the government's Fuel Finder data. By postcode or location. Free, no adverts.",
    title="Cheapest Petrol & Diesel Prices Near You: Live UK Fuel Prices | 365 Techies",
    og_title="The cheapest petrol and diesel near you, live | 365 Techies",
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
