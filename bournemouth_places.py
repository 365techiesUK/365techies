"""What each Bournemouth365 page is ABOUT, for its WebPage schema (17 Sep 2026).

Until now every page on the site - sea temperature, beach parking, fireworks included - told search engines it was
about the IT business (#business) and that its main image was the company's "Monthly IT Support" card. The audit in
C:\\claude\\seo-research\\b365-seo-audit-2026-09-17\\ flagged it; these are the places the pages actually describe.

Every Wikidata id below was checked against the Wikidata API on 17 Sep 2026 (label, description and coordinates):
  Q170478   Bournemouth - town in Bournemouth, Christchurch and Poole (50.72, -1.88)
  Q54366459 Bournemouth, Christchurch and Poole - unitary authority area (50.723, -1.882)
  Q24662609 Bournemouth Pier (50.7161, -1.8756)
  Q96655623 Bournemouth Beach (50.7162, -1.8736)
  Q6980908  Poole Bay (50.6667, -1.8667)
Never add an id that has not been checked the same way.
"""

_WD = "https://www.wikidata.org/wiki/"


def _geo(lat, lon):
    return {"@type": "GeoCoordinates", "latitude": lat, "longitude": lon}


BOURNEMOUTH = {"@type": "Place", "name": "Bournemouth", "geo": _geo(50.72, -1.88), "sameAs": _WD + "Q170478"}
BCP = {"@type": "AdministrativeArea", "name": "Bournemouth, Christchurch and Poole", "sameAs": _WD + "Q54366459"}
PIER = {"@type": "TouristAttraction", "name": "Bournemouth Pier", "geo": _geo(50.7161, -1.8756), "sameAs": _WD + "Q24662609"}
BEACH = {"@type": "Beach", "name": "Bournemouth Beach", "geo": _geo(50.7162, -1.8736), "sameAs": _WD + "Q96655623"}
POOLE_BAY = {"@type": "BodyOfWater", "name": "Poole Bay", "geo": _geo(50.6667, -1.8667), "sameAs": _WD + "Q6980908"}


# Bournemouth365 itself (17 Sep 2026). Until now the section had no entity of its own: search engines and AI answers
# knew the name only from one sentence on an IT-support page. This names it, ties it to its Facebook page (checked
# 17 Sep 2026: facebook.com/bournemouth365, "Bournemouth365", 39,509 followers) and to 365 Techies as its parent,
# and every section page names it as publisher. No logo: it has none of its own yet.
_SITE = "https://365techies.co.uk"
ORG_ID = _SITE + "/bournemouth/#organization"
ORG = {"@type": "Organization", "@id": ORG_ID, "name": "Bournemouth365", "url": _SITE + "/bournemouth/",
       "description": "A free, ad-free guide to Bournemouth's seafront as it is today - the sea measured live, the weather "
                      "and tides, a live map of the town and the best places to watch the light - from the Bournemouth365 "
                      "Facebook page.",
       "sameAs": ["https://www.facebook.com/bournemouth365/"],
       "parentOrganization": {"@id": _SITE + "/#business"}}


def published(node):
    """A section page's WebPage node, published by Bournemouth365."""
    node["publisher"] = {"@id": ORG_ID}
    return node
