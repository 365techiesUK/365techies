"""
/bournemouth/fuel-prices/ - the cheapest petrol and diesel near Bournemouth, and anywhere in the UK (4 Oct 2026).

WHY
Owner, 4 Oct 2026: "an app that shows you where the petrol and diesel is cheapest locally ... build it under
Bournemouth365", then the same day "do both pages ... one focused on Bournemouth ... up to 100 miles ... or the whole
UK". Its twin, /fuel-prices/ (fuel_prices_page.py), opens on the whole UK; this one opens on Bournemouth town centre,
5 miles, with 2 to 100 miles and the whole UK in the distance menu. Both share fuel_finder_ui.py + js/fuel-finder.js.
Honest expectation (4 Oct): Google's results for "cheapest petrol Bournemouth" are held by programmatic sites with a
page per station (fuel-finder.uk, stationwatch.co.uk, petrolfinder.uk) and Google Maps shows pump prices itself, so
this is a FACEBOOK-LED tool (the Bournemouth365 page, a weekly "cheapest in BCP" post). No per-station pages.

DATA: api/bm-fuel.php -> api/bm-fuel-lib.php, the government's Fuel Finder feed (OGL v3), every UK forecourt.

PUBLIC since 4 Oct 2026 (owner: "Yes, go public and do two and three"): sitemap, site search, llms.txt and a card on the
Bournemouth365 hub. Same day: which supermarket is cheapest within 10 miles, and are prices going up or down.
"""
import build_pages as _bp
from build_pages import add, graph, crumb_sub, webpage, faqpage, faq_html, hero, bc_sub
import bournemouth_places as _pl
import fuel_finder_ui as _ui

_SLUG = "bournemouth/fuel-prices"
PUBLIC = True

_TITLE = "Petrol & Diesel Prices Bournemouth, Christchurch & Poole Today"
_DESC = ("Fuel prices in Bournemouth, Christchurch and Poole today: the cheapest petrol and diesel near you from every "
         "forecourt, the average against the UK, and what a tank costs for a car, van or lorry. Free, no adverts.")

# A tool, used standing at a car: on a phone the hero keeps only its headline so the fuel buttons and "Use my location"
# sit on the first screen. Page-scoped (HEAD_EXTRA is this page only).
_PHONE = '''
  <style>
    @media (max-width:767px){
      .page-hero .lede,.page-hero__chips,.page-hero__cta,.page-hero__byline{display:none}
      .page-hero{padding-bottom:0}
      #finder{padding-top:.75rem}
    }
  </style>'''

_FAQS = _ui.faqs("around Bournemouth, Christchurch and Poole, anywhere else by postcode or location,")


def _content(b365_band):
    prose = '''
          <h2 id="method">How this works</h2>
          <p>Pick a fuel, then tap <strong>Use my location</strong> or type a postcode, and choose how far you will drive: 2 miles up to 100, or the whole UK. The list shows the cheapest forecourts first, with the nearest first where two prices are the same. Tap one to see it on the map with all its prices, or <strong>Directions</strong> to open your maps app.</p>
          <p>Before you search, the page shows Bournemouth town centre. The three numbers at the top are the cheapest price, the average, and what a full tank costs at the cheapest. Pick your vehicle in that box &mdash; a motorbike, a small or family car, an SUV, a van, a motorhome, a 7.5-tonne lorry or a 44-tonne HGV, or type your own tank size &mdash; and every price shows the bill, with what you save against the average.</p>
          <p>Further down: the cheapest forecourts in Bournemouth, Christchurch and Poole today, what every kind of vehicle costs to fill up at today&rsquo;s prices here, which supermarket is cheapest within ten miles, whether prices are going up or down (the government&rsquo;s weekly figures back to 2003, and our own day-by-day record for Bournemouth), and the UK picture &mdash; England, Scotland, Wales and Northern Ireland, the cheapest and dearest postcode areas, and the cheapest forecourts in the country. The national figures are on our <a href="/fuel-prices/">UK fuel prices</a> page.</p>
          <p>Nothing here is guessed. Every price comes from the government&rsquo;s Fuel Finder service and shows when the forecourt set it; a price not confirmed for six weeks is left out.</p>'''
    return "\n".join([
        hero(bc_sub("Bournemouth365", "/bournemouth/", "Fuel Prices"),
             "// BOURNEMOUTH365",
             'Bournemouth fuel prices: the cheapest <em class="grad grad--cyan">near you</em>',
             "Live petrol and diesel prices around Bournemouth, Christchurch and Poole, and anywhere in the UK, cheapest first, from your postcode or your phone&rsquo;s location. Free, no adverts, nothing to sign up to.",
             cta1=("Find the cheapest near me", "#finder"),
             cta2=("More from Bournemouth365", "/bournemouth/"),
             chips=["Every UK forecourt", "Live pump prices", "No adverts"]),
        _ui.tool("local", 5, (50.7208, -1.8794, "Bournemouth town centre")),
        '    <section class="section">\n      <div class="wrap">\n        <div class="prose">' + prose + '\n        </div>\n      </div>\n    </section>',
        faq_html(_FAQS),
        b365_band,
    ])


def _schema(s):
    return graph([
        crumb_sub(s, "Bournemouth365", "bournemouth", "Fuel Prices"),
        _pl.published(webpage(s, _TITLE, _DESC, about=[_pl.BOURNEMOUTH, _pl.BCP])),
        _pl.ORG,
        _ui.web_app(_bp.SITE + "/" + _SLUG + "/", "B365 Fuel: Bournemouth fuel prices",
                    "Live pump prices around Bournemouth, Christchurch and Poole and across the UK, cheapest first, with the cost of a full tank for any vehicle.",
                    _pl.ORG_ID),
        faqpage(s, _FAQS),
    ])


def register(b365_band):
    _bp.HEAD_EXTRA[_SLUG] = _ui.HEAD + _PHONE + _ui.app_head("B365 Fuel")
    # its own home-screen identity (owner 4 Oct: "add it to their phone ... so they can find it easily")
    _bp.MANIFEST_FOR[_SLUG] = "/bournemouth/fuel-prices/app.webmanifest?v=1"
    _bp.TOUCH_ICON_FOR[_SLUG] = _ui.TOUCH_ICON
    add(
        slug=_SLUG,
        title=_TITLE,
        desc=_DESC,
        og_title="Bournemouth fuel prices today: the cheapest near you | Bournemouth365",
        schema=_schema,
        content=_content(b365_band),
        robots=None if PUBLIC else "noindex,follow",
        og_image=_bp.SITE + "/images/og-fuel-prices-b365-v1.jpg",   # a real screenshot of the page (4 Oct)
    )
    page = next(p for p in _bp.PAGES if p.get("slug") == _SLUG)
    page["nosearch"] = not PUBLIC
