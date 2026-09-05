# -*- coding: utf-8 -*-
"""Phase 2/3 pages for 365 Techies: local-area + customer-type pages.
Imports shared chrome/helpers from build_pages, appends pages, writes everything.
Run: python build_local.py
"""
import build_pages as bp
from build_pages import (add, graph, crumb, webpage, service, faqpage,
                         faq_html, cta, hero, bc, bc_sub, crumb_sub, tiles, grid_cards, checklist,
                         steps, reviews_block, SITE, write_all)

# ⚠️ DERIVED, NEVER HAND-WRITTEN. This used to be a second, separately-typed list
# of the same customers' Google reviews - and it had drifted. All six names in it
# also appear in build_extra.REVIEWS, and every one differed: four were silently
# truncated, one paraphrased, and John Holloway had been given words with only
# 36% overlap with what he actually wrote ("Your service and support are
# unbeatable and delivered with patience and a smile." against his real "As usual
# your service and support have been immaculate when required recently.").
#
# These are REAL NAMED PEOPLE and the output is marked up as Review structured
# data for Google. Attributing words to a named customer that they did not write
# is exactly what the UK fake-review rules now in force prohibit - and it is
# simply wrong regardless of the law.
#
# So there is now ONE source of truth. build_extra.REVIEWS holds (name, quote)
# verbatim from the live Google profile; reviews_block() wants (quote, name), so
# the order is flipped here and nothing is re-typed. If a quote needs shortening
# for layout, shorten it in the ONE list and know that you have edited a real
# person's words - do not fork it again.
from reviews_data import REVIEWS as _CANON_REVIEWS
REVPOOL = [(q, n) for (n, q) in _CANON_REVIEWS]

# ======================================================= LOCAL AREA PAGES
def local_services(town):
    return tiles([
      ("home", "Home IT support", f"Monthly plans and one-off help for {town} homes and families."),
      ("briefcase", "Business IT support &amp; services", f"Reliable IT services and IT solutions for {town} sole traders and small businesses."),
      ("wrench", "Computer repairs", "Laptop and PC repairs, virus removal, upgrades and setup."),
      ("cloud", "Microsoft 365", "Outlook, Teams, OneDrive and licensing — set up and supported."),
      ("shield", "Cybersecurity", "Protection from scams, malware and phishing."),
      ("bolt", "Remote support", "Fast, secure online help wherever you are."),
    ])

# Town-centre coordinates (public approximate centroids) for per-page GeoCoordinates schema
COORDS = {
 "it-support-dorset": [50.7192, -1.8808],  # the near-me hub carries the business's own geo (Kinson, Bournemouth)
 "it-support-bournemouth": [50.7192, -1.8808],
 "it-support-poole": [50.7150, -1.9872], "it-support-christchurch": [50.7340, -1.7800],
 "it-support-wimborne": [50.7990, -1.9870], "it-support-ferndown": [50.8080, -1.9000],
 "it-support-ringwood": [50.8460, -1.7900], "it-support-southampton": [50.9097, -1.4044],
 "it-support-verwood": [50.8810, -1.8770], "it-support-broadstone": [50.7570, -1.9930],
 "it-support-wareham": [50.6860, -2.1110], "it-support-lymington": [50.7580, -1.5450],
 "it-support-new-milton": [50.7560, -1.6580], "it-support-weymouth": [50.6140, -2.4570],
 "it-support-dorchester": [50.7110, -2.4410], "it-support-swanage": [50.6080, -1.9590],
 "it-support-blandford-forum": [50.8560, -2.1640], "it-support-shaftesbury": [51.0050, -2.1980],
 "it-support-gillingham": [51.0380, -2.2740], "it-support-sherborne": [50.9470, -2.5170],
 "it-support-bridport": [50.7340, -2.7580], "it-support-lyme-regis": [50.7250, -2.9340],
 "it-support-corfe-mullen": [50.7660, -2.0130], "it-support-west-moors": [50.8290, -1.8800],
 "it-support-sturminster-newton": [50.9270, -2.3070], "it-support-portland": [50.5430, -2.4480],
 "it-support-upton": [50.7370, -2.0470], "it-support-highcliffe": [50.7390, -1.7050],
 "it-support-brockenhurst": [50.8230, -1.5730], "it-support-lyndhurst": [50.8730, -1.5730],
 "it-support-fordingbridge": [50.9270, -1.7920], "it-support-totton": [50.9180, -1.4870],
 "it-support-hythe": [50.8680, -1.3990],
}

# Per-slug SEO <title> overrides (CTR harvest + near-me targeting); all other towns use the template.
SEO_TITLES = {
 "it-support-for-home-workers": "IT Support for Home Workers in Dorset | Work From Anywhere",
 "it-support-blandford-forum": "IT Support Blandford Forum | Same-Day, No Call-Out Fee",
 "it-support-dorset": "IT Support Near Me in Dorset | 365 Techies",
 "it-support-gillingham": "IT Support Gillingham, Dorset | Same-Day, No Call-Out Fee",
 "it-support-for-solicitors": "IT Support for Solicitors, Dorset | 365 Techies",
 "it-support-for-retired-users": "IT Support for Retired People | Patient Help at Home",
 "it-support-bournemouth": "IT Support Bournemouth | Local Team Near You | 365 Techies",
 "it-support-for-architects": "IT Support for Architects & Surveyors | 365 Techies",
 "it-support-for-creative-agencies": "IT Support for Creative Agencies Dorset | 365 Techies",
}

# Consumer town page -> its dedicated business/managed-IT page (reverse link)
BIZ_LINKS = {
 "it-support-bournemouth": ("/it-services-bournemouth/", "business IT services in Bournemouth"),
 "it-support-poole": ("/it-services-poole/", "business IT services in Poole"),
 "it-support-ferndown": ("/business-it-support-ferndown-industrial-estate/", "business IT support around Ferndown Industrial Estate & Wimborne"),
 "it-support-christchurch": ("/business-it-support-christchurch/", "business IT support in Christchurch"),
 "it-support-new-forest": ("/business-it-support-new-forest/", "business IT support across the New Forest"),
}

REPAIR_SLUGS = {s for _t, s, _n, _it in bp.REPAIR_TOWNS}  # towns that have a computer-repair page


# ---- Real local evidence, per town (see this file's header for the rules) ----
# Named work, dated, already published elsewhere on the site. No counts, no
# customer data, nothing that decays into a lie when a relationship changes.
LOCAL_PROOF = {
 "it-support-bournemouth": (
   "We have worked in this town for three decades, not from a call centre",
   "<p>From 1998 to 2008 we built and ran the <strong>Dorset Microsoft Education Resource Centre</strong> in Winton &mdash; a training centre on our own computer network. From 2008 to 2017 we ran a computer sales, service and support centre in <strong>Moordown</strong>, and today we are at the <strong>Kinson Community Centre</strong>. Some of the customers we picked up in Winton are still with us.</p>"
   "<p>We have also provided the IT sales, servicing and support for <strong><a href=\"https://vividwebsites.co.uk/\" target=\"_blank\" rel=\"noopener\">Vivid Websites</a></strong>, the Bournemouth web agency behind sites for Bournemouth &amp; Poole College and Upton Country Park, <strong>since 2010</strong>.</p>"),

 "it-support-poole": (
   "Poole businesses we have looked after for years",
   "<p><strong>Emblem Sports Cars</strong>, the South Coast&rsquo;s independent Ferrari, Maserati and Lamborghini specialists &mdash; we have been their IT support <strong>since 2016</strong>, including the diagnostic systems in the workshop. <strong>Beckox Plastic Fabrications</strong>, whose own clients include Rolls-Royce, Merck and Wessex Water &mdash; <strong>since 2001</strong>. And we supported the Poole financial advisers <strong>PFM Associates from 1997 to 2016</strong>, through an acquisition, an office relocation and every machine in between.</p>"
   "<p>Two decades with the same firms is the only IT reference that means anything.</p>"),

 "it-support-christchurch": (
   "The link we built across the River Avon",
   "<p>In 2015 we installed a point-to-point wireless link spanning the <strong>River Avon at Knapp Mill</strong> for the <strong>Environment Agency</strong>, carrying the data for the river&rsquo;s fish counter across water where a cable was not an option. <strong>We still support it today.</strong></p>"
   "<p>Two aerials, clear air between them, one connection that has to keep working &mdash; the same thinking we bring to a Christchurch home&rsquo;s troublesome Wi-Fi.</p>"),

 "it-support-dorset": (
   "Thirty years of Dorset work, named",
   "<p>We were the IT support partner for <strong>Mercedes-Benz Pentagon</strong> across the south coast from 1998 to 2008 &mdash; upgrading the computers in their garages in 2001 and starting remote support back then, when it was still unusual. We built and ran the <strong>Dorset Microsoft Education Resource Centre</strong> in Bournemouth over the same decade.</p>"
   "<p>Today that continues with firms like <strong>Emblem Sports Cars</strong> and <strong>Beckox</strong> in Poole, and the <strong>Environment Agency</strong>&rsquo;s river link at Christchurch &mdash; installed in 2015 and still supported.</p>"),
}

# ---- Bournemouth365: the free local pages this section earns links with ------
# Only where the geography is genuinely true. The sea page reads a buoy in
# POOLE BAY and covers seven beaches from Alum Chine to Southbourne, so Poole
# and Bournemouth are honest; Christchurch is the next bay east and is framed
# as such, not claimed as covered.
B365_LINKS = {
 "it-support-bournemouth": "<p>Not looking for IT help today? We also run <a href=\"/bournemouth/\">Bournemouth365</a> &mdash; live measured sea conditions from the bay&rsquo;s buoy and the tide gauge on the pier, the Friday fireworks answered honestly, and the best sunrise and sunset spots, photographed by us. Free, no ads, and the same people behind it.</p>",
 "it-support-poole": "<p>While you are here: the buoy behind our free <a href=\"/bournemouth/sea-today/\">live sea conditions page</a> sits in Poole Bay, and Sandbanks is one of the spots on our <a href=\"/bournemouth/sunrise-sunset/\">sunrise and sunset guide</a> &mdash; part of <a href=\"/bournemouth/\">Bournemouth365</a>, the local pages we run alongside the day job.</p>",
 "it-support-christchurch": "<p>We also run <a href=\"/bournemouth/\">Bournemouth365</a>, which measures the sea in the next bay west &mdash; and if you have ever wondered why the tide here behaves so strangely, our <a href=\"/bournemouth/sea-today/\">live tide curve from the pier gauge</a> explains the double high water Christchurch is known for.</p>",
 "it-support-dorset": "<p>Alongside the day job we run <a href=\"/bournemouth/\">Bournemouth365</a> &mdash; free local pages with live measured sea conditions, the Friday fireworks and the coast photographed by us. No ads, no paywall.</p>",
}

# ---- Measured mobile signal, per town (2026-08-22) ---------------------------
# The crowd map's squares, assigned to the nearest town, from a DATED SNAPSHOT
# written by refresh_signal_areas.py (the build never touches the network).
# Same rule as LOCAL_PROOF: absent unless there is something true and town-
# specific to say. Research verdict (seo-research/mobile-signal-research-
# 2026-08-22/VERDICT.md): blocks on these pages, never a per-town page series.
#
# QUALITY GATE - every clause must hold or the block degrades a state:
#   - snapshot present, ok, and no older than SIGNAL_MAX_AGE_DAYS
#   - a speed is printed ONLY for a verified square (n >= need, re-checked by
#     the refresh script) that has a cached locality NAME
#   - the pending line needs >= 8 readings town-wide ("1 reading" is worse
#     than silence)
#   - the rendered HTML contains NO network name and ranks no town against
#     another - asserted at build, because that is the league table this
#     project refuses to publish.
SIGNAL_MAX_AGE_DAYS = 45
try:
    from signal_area_data import SIGNAL_AREAS as _SIG
except ImportError:
    _SIG = None
_NETWORK_WORDS = ("Three", "EE", "O2", "Vodafone", "giffgaff", "Sky Mobile", "Tesco Mobile")


def _signal_fresh():
    if not _SIG or not _SIG.get("ok"):
        return False
    try:
        from datetime import datetime, timezone
        gen = datetime.fromisoformat(_SIG["generated"])
        return (datetime.now(timezone.utc) - gen).days <= SIGNAL_MAX_AGE_DAYS
    except (KeyError, ValueError):
        return False


def signal_block(slug, town):
    if not _signal_fresh():
        return ""
    t = _SIG["towns"].get(slug)
    if not t:
        return ""                                   # state: none - nothing at all
    verified = [v for v in t.get("verified", []) if v.get("name")]
    readings, squares, nearest, van = t.get("readings", 0), t.get("squares", 0), t.get("nearest"), t.get("van", [])
    if readings < 8 and not verified and not van:
        return ""                                   # too little to say honestly
    date = _SIG["generated"][:10]
    parts = []
    if verified:
        # >6 verified: show the 3 fastest AND the 3 slowest, and say so - a
        # fastest-only list under a heading that implies completeness would
        # quietly hide every not-spot, which is half of what the map is FOR.
        # ⚠️ DEDUPE BY LOCALITY NAME. Several ~500 m squares can reverse-geocode
        # to the SAME locality, and as the survey grew this started rendering
        # as "Canford Cliffs 5.7 / Canford Cliffs 3.8 / Canford Cliffs 3.1" —
        # three real squares, but it reads as a broken list, and repeating one
        # name three times implies the whole locality is that speed. Keep the
        # most extreme square per name IN THE DIRECTION BEING SHOWN, so the
        # "three fastest and three slowest" claim stays literally true.
        def _pick(seq, want):
            out, seen = [], set()
            for v in seq:
                if v["name"] in seen:
                    continue
                seen.add(v["name"])
                out.append(v)
                if len(out) == want:
                    break
            return out
        if len(verified) <= 6:
            shown = verified[:6]
        else:
            fastest = _pick(verified, 3)
            taken = {v["name"] for v in fastest}
            slowest = _pick([v for v in reversed(verified) if v["name"] not in taken], 3)
            shown = fastest + list(reversed(slowest))
        items = "".join(
            f"<li><strong>{v['name']}</strong>: {v['dl']:g}&nbsp;Mbps median download from {v['n']} readings"
            f"{' (a ~140&nbsp;m seafront square)' if v.get('g') == 'c' else ''}</li>" for v in shown)
        label = (f"Verified squares in {town}" if len(verified) <= 6 else
                 f"{town} has <strong>{len(verified)} verified squares</strong> &mdash; the three fastest and three slowest")
        parts.append(f"<p>{label} &mdash; each the median of people&rsquo;s own phones (8 or more inland, 5 or more on the seafront&rsquo;s finer ~140&nbsp;m squares), indoor and outdoor together, all networks pooled:</p><ul>{items}</ul>")
        rest = squares - len(verified) - t.get("verified_unnamed", 0)
        if rest > 0 and nearest:
            parts.append(f"<p>Another {rest} square{'s' if rest != 1 else ''} {'are' if rest != 1 else 'is'} still filling in &mdash; the nearest to verified is at {nearest[0]} of {nearest[1]} readings.</p>")
    elif readings >= 8:
        near = f" The nearest to verified is at <strong>{nearest[0]} of {nearest[1]}</strong> readings." if nearest else ""
        parts.append(f"<p><strong>{readings} readings</strong> across {squares} ~500&nbsp;m square{'s' if squares != 1 else ''} in {town} so far &mdash; none has reached the 8-reading floor yet, so no speed is shown.{near} The first verified square here will appear on this page automatically.</p>")
    if van:
        top = ", ".join(f"{v['name']} {v['dl']:g}&nbsp;Mbps ({v['tests']} tests)" for v in van[:3])
        parts.append(f"<p>Our own campervan has measured {len(van)} place{'s' if len(van) != 1 else ''} in {town} &mdash; one instrument, one network, the same way every time: {top}. Ranked on the <a href=\"/van-signal-map/\">van signal map</a>.</p>")
    if not parts:
        return ""
    html = f"""    <section class="section" aria-label="Mobile signal in {town}">
      <div class="wrap">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">// MOBILE SIGNAL &middot; {town.upper()}</p>
          <h2 class="section-title" data-title>What mobile signal people actually get in {town}<span class="title-underline"></span></h2>
          <p>Ofcom&rsquo;s coverage checker is a prediction. These are measurements &mdash; taken on local people&rsquo;s phones in the street with our free <a href="/mobile-signal-check/">ten-second signal test</a>, kept as ~500&nbsp;m squares so nothing points at a home.</p>
          {''.join(parts)}
          <p>Strong outside but slow indoors? That is usually the building, not the mast &mdash; thick walls, foil-backed insulation, a phone three rooms from anything. Our free <a href="/wifi-signal-test/">room-by-room WiFi survey</a> shows which it is, and <a href="/wifi-keeps-dropping/">why WiFi keeps dropping</a> explains the usual fixes.</p>
          <p class="mono" style="font-size:.78rem;color:var(--faint)">Snapshot {date} &middot; the <a href="/mobile-signal-check/#sigcheck-map">live map</a> is always current &middot; we never rank networks against each other.</p>
        </div>
      </div>
    </section>"""
    # Build assertion: the league table this project refuses to publish.
    import re as _re
    _scrub = html.replace("Three Legged Cross", "")        # a real village, not a network
    for w in _NETWORK_WORDS:
        if _re.search(r"" + _re.escape(w) + r"", _scrub):
            raise SystemExit(f"signal_block({slug}): network name '{w}' reached the HTML - refusing to build")
    return html


def make_local(i, slug, town, region, lede, intro_para, nearby):
    crumb_name = f"IT Support {town}"
    repair_slug = ("computer-repair-" + slug[len("it-support-"):]) if slug.startswith("it-support-") else ""
    repair_link = (f'\n          <p>Just need a one-off fix rather than a plan? See our <a href="/{repair_slug}/">computer &amp; laptop repair in {town}</a> &mdash; home visits, fast remote help and no call-out fee.</p>'
                   if repair_slug in REPAIR_SLUGS else "")
    # Real named local work, where we have it and it is already public.
    _pf = LOCAL_PROOF.get(slug)
    proof_block = (f'''    <section class="section section--alt" aria-label="Our work in {town}">
      <div class="wrap">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">// LOCAL TRACK RECORD</p>
          <h2 class="section-title" data-title>{_pf[0]}<span class="title-underline"></span></h2>
          {_pf[1]}
        </div>
      </div>
    </section>''' if _pf else "")
    b365_link = ("\n          " + B365_LINKS[slug]) if slug in B365_LINKS else ""
    biz_link = (f'\n          <p>Running a business in {town}? See our dedicated <a href="{BIZ_LINKS[slug][0]}">{BIZ_LINKS[slug][1]}</a> &mdash; fully managed IT, Microsoft 365, cybersecurity and support for one monthly cost per computer.</p>'
                if slug in BIZ_LINKS else "")
    # GSC, 28 Jul 2026: these town pages rank but are never clicked - /it-support-blandford-forum/
    # took 1,276 impressions at position 10.6 for ZERO clicks. The old description was the same
    # boilerplate on every town ("IT support, IT services and computer repairs in X - rated 4.9,
    # no call-out fee, family-run since 1995"), which lists what we are and gives a searcher no
    # reason to pick us over the seven results above. This leads with what they get instead, and
    # keeps the one thing no competitor can copy: they get the same two people every time.
    # Length matters as much as wording - _meta_desc() amputates anything over 158 rendered chars
    # and leaves a trailing ellipsis, so the fixed part stays short enough for a long town name.
    desc = (f"IT support in {town} for homes and businesses — no call-out fee, the same "
            f"two faces every visit, and rated 4.9 on Google.")
    faqs = [
      (f"Do you provide IT support in {town}?", f"Yes — 365 Techies provides remote and on-site IT support for homes and businesses in {town} and the wider {region} area, with monthly plans from £18.25 per computer."),
      (f"Can you visit me in {town}?", f"Yes. Most issues are fixed remotely in minutes, and we provide on-site visits across {town} and the wider {region} when hands-on help is needed."),
      ("What does monthly IT support cost?", "Home support is £18.25/month per computer and business support from £24.38/month per computer, with Microsoft 365 at £4.85/month per user and one-off repairs also available."),
      ("Is remote support secure?", "Yes — sessions run over encrypted Splashtop SOS, you watch everything on screen, and access ends the moment the session does."),
      (f"What can you help {town} customers with?", "Computers and laptops, email, Microsoft 365, Wi-Fi, printers, security, backups, new device setup, virus removal and slow-computer fixes — for homes and businesses alike."),
      (f"Are you a local IT company in {town}?", f"Yes — 365 Techies is a family-run local IT company, established in 1995, providing IT support, IT services and computer &amp; laptop repairs for homes and businesses across {town} and the wider {region} area."),
      (f"Do you provide business IT services and Microsoft 365 support in {town}?", f"Yes — we provide managed business IT services and IT solutions for {town} businesses, including Microsoft 365 setup, migration and support, cybersecurity, backups, and fast remote and on-site help."),
    ]
    if slug == "it-support-dorset":
        faqs = faqs + [
          ("Do you provide IT support near me?", "If you&rsquo;re in Dorset &mdash; Bournemouth, Poole, Christchurch, Dorchester, Weymouth or the surrounding towns &mdash; then yes, we&rsquo;re your local IT support team. Most issues are fixed remotely in minutes, and we visit on-site across the county when hands-on help is needed. Call 01202&nbsp;775566."),
          ("Can I find IT support and services near me in Dorset?", "Yes &mdash; wherever you are in Dorset you&rsquo;ll find local IT support and services near you. Homes, sole traders and businesses across the county rely on us as their nearby IT experts for computer support, Microsoft 365, cybersecurity and everyday help &mdash; remotely in minutes and on-site when needed."),
          ("Do you offer managed IT services and IT solutions in Dorset?", "Yes &mdash; we&rsquo;re a family-run Dorset <a href=\"/managed-it-support/\">managed IT services</a> provider (MSP), delivering proactive IT solutions for businesses across the county: monthly <a href=\"/business-it-support-subscriptions/\">business IT support</a>, Microsoft 365, cybersecurity, backups, servers and networks, all for one predictable monthly cost."),
        ]
    if slug == "it-support-bournemouth":
        faqs = faqs + [
          ("Do you provide IT support near me in Bournemouth?", "Yes &mdash; we&rsquo;re based at the Kinson Community Centre in Bournemouth, so for most of the town we really are just around the corner. Most problems are fixed remotely in minutes, and when you need someone in person we&rsquo;re minutes away and always call ahead with an arrival time."),
        ]
    nearby_li = "\n".join(f'          <li><a href="{h}">{l}</a></li>' for l, h in nearby)
    nearme_block = ""
    if slug == "it-support-dorset":
        desc = ("Looking for IT support near me in Dorset? 365 Techies — family-run, Bournemouth-based, rated 4.9 — covers every Dorset town. "
                "Remote fixes in minutes, on-site county-wide, homes from £18.25/mo.")
        nearby_li = "\n".join(f'          <li><a href="/{_s2}/">IT Support {_t2}</a></li>' for _s2, _t2, _r2, _l2, _i2, _n2 in LOCAL if _s2 != slug)
        nearme_block = f'''    <section class="section" aria-label="IT support near you">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">// NEAR YOU &middot; ALL OF DORSET</p>
          <h2 class="section-title" data-title>Looking for IT support near you?<span class="title-underline"></span></h2>
          <p><strong>You&rsquo;ve found your local team.</strong> We&rsquo;re based at the Kinson Community Centre in Bournemouth and cover every Dorset town &mdash; most problems are fixed remotely within minutes, and when hands-on help is needed we come to you anywhere in the county, always phoning ahead with an arrival time.</p>
          <p>We&rsquo;re open <strong>Monday to Friday, 9am&ndash;5pm</strong> &mdash; call <a href="tel:+441202775566">01202 775566</a>, text <a href="sms:+447520615332">07520 615332</a>, or <a href="https://www.google.com/maps/place/?q=place_id:ChIJlTb8YRuic0gRCRczduB8OFI" target="_blank" rel="noopener">find us on Google Maps</a>.</p>
          <p>Honest, simple pricing: home support <strong>&pound;18.25/month per computer</strong>, business from <strong>&pound;24.38/month per computer</strong> &mdash; rolling monthly, no call-out fee, cancel anytime.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Family-run in Dorset since 1995","Based in Bournemouth &mdash; on-site county-wide","Same-day response &middot; usually minutes remotely","We phone ahead with an ETA","No call-out fee, no long contracts","Rated 4.9 on Google"])}
        </ul>
      </div>
    </section>'''
    # Section /01 side column: generic service checklist, except Bournemouth which gets
    # the real Moordown shopfront photo — the one town where "we've physically been here
    # for decades" is provable with an owned photo (honest-imagery rule: real photos only).
    local_col = f'''<ul class="checklist" data-stagger>
{checklist(["Monthly IT support plans","Computer &amp; laptop repairs","Microsoft 365 support","Cybersecurity &amp; backups","Wi-Fi, printer &amp; email help","Remote &amp; on-site support"])}
        </ul>'''
    if slug == "it-support-bournemouth":
        local_col = '''<figure class="heritage-card heritage-card--photo" data-reveal>
          <img src="/images/heritage-storefront.jpg" alt="The shopfront of our former computer sales and service centre in Moordown, Bournemouth" width="1024" height="683" loading="lazy" decoding="async" />
          <figcaption class="mono">Our old Moordown shop &mdash; same family, same number then and now: 01202&nbsp;775566. As featured in the <a href="/about/">Bournemouth Echo, 2011 &rarr;</a></figcaption>
        </figure>'''
    revs = [REVPOOL[i % len(REVPOOL)], REVPOOL[(i + 2) % len(REVPOOL)]]
    content = "\n".join([
      hero(bc_sub("IT Support Dorset", "/it-support-dorset/", crumb_name), f"// {town.upper()} &middot; {region.upper()}",
           f'IT support in <em class="grad grad--cyan">{town}</em>', bp.hero_trust(lede),
           trustbar=True),
      nearme_block,
      f'''    <section class="section" aria-label="Local support">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — LOCAL &amp; FRIENDLY</p>
          <h2 class="section-title" data-title>Your local {town} techies<span class="title-underline"></span></h2>
          <p>{intro_para}</p>
          <p>As your local IT company, we cover it all &mdash; IT support and business IT services, computer and laptop repairs, Microsoft 365, cybersecurity and practical IT solutions for {town} homes and businesses.</p>
          <p><strong>Most problems are solved remotely in minutes</strong> — and when you need someone in person, we&rsquo;re close by. Local knowledge, no call-centres, no jargon.</p>{repair_link}{biz_link}{b365_link}
        </div>
        {local_col}
      </div>
    </section>''',
      proof_block,
      signal_block(slug, town),
      f'''    <section class="section section--alt" aria-label="How we help">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — HOW WE HELP</p>
          <h2 class="section-title section-title--center" data-title>Everything {town} needs<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{local_services(town)}
        </div>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="Homes and businesses">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — HOMES &amp; BUSINESSES</p>
          <h2 class="section-title section-title--center" data-title>For every {town} home and business<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="split-2">
          <div class="tile" data-reveal>
            <h3>Homes &amp; families in {town}</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">Friendly monthly support and one-off help for {town} homes &mdash; computers, email, Wi-Fi, printers, photos and security, all looked after so technology just works.</p>
            <ul class="checklist">
{checklist(["Computer &amp; laptop help","Email, Wi-Fi &amp; printers","Security &amp; backups","Patient, jargon-free help"])}
            </ul>
          </div>
          <div class="tile" data-reveal>
            <h3>Businesses in {town}</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">Reliable IT for {town} sole traders and small businesses &mdash; Microsoft 365, security, backups and staff support, like having your own IT department without the cost.</p>
            <ul class="checklist">
{checklist(["Microsoft 365 &amp; email","Cybersecurity &amp; backups","Staff &amp; device support","Remote &amp; on-site cover"])}
            </ul>
          </div>
        </div>
      </div>
    </section>''',
      f'''    <section class="how section--alt" aria-label="How it works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/04 — HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>Local help in three steps<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("Get in touch", f"Call us or book online and tell us what you need in {town}."),("We connect", "We help remotely in minutes over secure Splashtop SOS &mdash; or visit if it&rsquo;s hands-on."),("We keep you covered", "Stay on a monthly plan and we&rsquo;ll keep your tech healthy all year round.")])}
        </ol>
      </div>
    </section>''',
      reviews_block(revs),
      f'''    <section class="section" aria-label="Nearby areas">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// NEARBY</p>
          <h2 class="section-title section-title--center" data-title>We also cover nearby areas<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="areas-grid" data-stagger>
{nearby_li}
        </ul>
      </div>
    </section>''',
      bp.PCM_BAND,
      faq_html([(q, a) for q, a in faqs]),
      cta(f"IT support in {town}, sorted",
          f"Join the {town} homes and businesses who never worry about IT. Pick a plan or say hello.",
          primary=("View Monthly Plans", "/monthly-it-support/"), secondary=("Contact Us", "/contact/")),
    ])
    def schema(s, _desc=desc, _cn=crumb_name, _faqs=faqs, _town=town, _region=region):
        svc = service(s, f"IT Support {_town}", f"Monthly IT support, computer repairs, Microsoft 365 and cybersecurity for {_town} homes and businesses.", "IT support")
        if s == "it-support-dorset":
            svc["areaServed"] = {"@type": "AdministrativeArea", "name": "Dorset", "containedInPlace": {"@type": "Country", "name": "United Kingdom"}}
        else:
            svc["areaServed"] = {"@type": "City", "name": _town, "containedInPlace": {"@type": "AdministrativeArea", "name": _region}}
        # No FAQPage node here: 30+ town pages carried token-swapped identical FAQ
        # schema — a programmatic footprint with zero rich-result upside (Google
        # limits FAQ rich results to authority sites). Visible FAQs stay on-page.
        nodes = [crumb_sub(s, "IT Support Dorset", "it-support-dorset", _cn), webpage(s, f"IT Support {_town}", _desc), svc]
        _co = COORDS.get(s)
        if _co:
            _pname = "365 Techies, Bournemouth" if s == "it-support-dorset" else _town
            nodes.append({"@type": "Place", "@id": f"{SITE}/{s}/#place", "name": _pname,
                          "geo": {"@type": "GeoCoordinates", "latitude": _co[0], "longitude": _co[1]}})
        return graph(nodes)
    # "| 365 Techies" was spending 15 characters restating the brand, which Google already
    # shows on its own line as the site name. Two towns (Blandford, Gillingham) already had a
    # hook instead via SEO_TITLES; the other 64 did not. GSC 28 Jul 2026 has these pages
    # ranking on page 1 for "it support new forest" (8.1) and "it support christchurch" (8.24)
    # with zero clicks, so the title needs to give a reason to pick us, not repeat who we are.
    # Explicit overrides in SEO_TITLES still win.
    add(slug=slug, title=SEO_TITLES.get(slug) or f"IT Support {town} | Same-Day, No Call-Out Fee",
        desc=desc, og_title=f"IT Support {town} | 365 Techies", schema=schema, content=content)

LOCAL = [
 ("it-support-new-forest", "New Forest", "Hampshire",
  "IT support and computer help for homes and businesses across the New Forest — monthly support plans, Microsoft 365, security, fast remote help and reliable internet, including Starlink where broadband is slow.",
  "From Lyndhurst and Brockenhurst to Lymington, New Milton and Ringwood, we look after homes and small businesses right across the New Forest — keeping computers, email, Wi-Fi, Microsoft 365 and security working, with Starlink satellite internet for rural not-spots.",
  [("IT Support Lymington", "/it-support-lymington/"), ("IT Support New Milton", "/it-support-new-milton/"), ("Starlink Internet", "/starlink-internet/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-lymington", "Lymington", "Hampshire",
  "Local IT support and computer repairs for homes and businesses in Lymington and the New Forest coast — monthly plans, Microsoft 365, security and fast remote help.",
  "Around Lymington, Pennington and the New Forest coast, we keep home users and small businesses running smoothly — computers, email, Wi-Fi, Microsoft 365 and security, with remote help in minutes and on-site visits when needed.",
  [("IT Support New Forest", "/it-support-new-forest/"), ("IT Support New Milton", "/it-support-new-milton/"), ("IT Support Southampton", "/it-support-southampton/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-new-milton", "New Milton", "Hampshire",
  "Friendly, local IT support for homes and businesses in New Milton and the New Forest — monthly support plans, computer repairs, Microsoft 365 and quick remote help.",
  "Across New Milton, Barton-on-Sea and the western New Forest, we look after homes, families and small businesses with reliable, proactive IT support and a real person to call.",
  [("IT Support New Forest", "/it-support-new-forest/"), ("IT Support Lymington", "/it-support-lymington/"), ("IT Support Christchurch", "/it-support-christchurch/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-verwood", "Verwood", "Dorset",
  "Local IT support and computer repairs for homes and businesses in Verwood — monthly support plans, Microsoft 365, security and fast remote help from a friendly Dorset team.",
  "Across Verwood, Three Legged Cross and the surrounding villages, we keep home users and small businesses running smoothly — computers, email, Wi-Fi, Microsoft 365 and security, all looked after for one simple monthly cost.",
  [("IT Support Ferndown", "/it-support-ferndown/"), ("IT Support Wimborne", "/it-support-wimborne/"), ("IT Support Ringwood", "/it-support-ringwood/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-broadstone", "Broadstone", "Dorset",
  "Friendly, local IT support for Broadstone homes and businesses — monthly plans, computer repairs, Microsoft 365, cybersecurity and quick remote help.",
  "In and around Broadstone and Canford Magna, we look after home users, families and small businesses with reliable, proactive IT support and a real person to call whenever you need one.",
  [("IT Support Poole", "/it-support-poole/"), ("IT Support Wimborne", "/it-support-wimborne/"), ("IT Support Bournemouth", "/it-support-bournemouth/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-wareham", "Wareham", "Dorset",
  "IT support and computer help for homes and businesses in Wareham and Purbeck — monthly support plans, Microsoft 365, security and fast remote help.",
  "From Wareham to Sandford and across the Isle of Purbeck, we keep homes and small businesses productive and protected — with remote help in minutes and on-site visits when you need hands-on support.",
  [("IT Support Poole", "/it-support-poole/"), ("IT Support Bournemouth", "/it-support-bournemouth/"), ("IT Support Dorset", "/it-support-dorset/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-poole", "Poole", "Dorset",
  "Friendly, local IT support for Poole homes and businesses — monthly support plans, computer repairs, Microsoft 365, cybersecurity and fast remote help from a team just next door.",
  "From Poole Quay and the harbour to Canford Heath, and around the Nuffield and Fleets Corner business areas, we look after home users, families, sole traders and small businesses across Poole — including the town&rsquo;s marine and boating trade — keeping computers, email, Wi-Fi, Microsoft 365 and security working all year round.",
  [("IT Support Bournemouth", "/it-support-bournemouth/"), ("IT Support Christchurch", "/it-support-christchurch/"), ("IT Support Wimborne", "/it-support-wimborne/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-christchurch", "Christchurch", "Dorset",
  "Reliable monthly IT support and computer repairs for homes and businesses in Christchurch — remote help in minutes, on-site when you need it.",
  "From the Quay to Highcliffe and Mudeford, we keep Christchurch homes and small businesses running smoothly — computers, email, Wi-Fi, Microsoft 365 and security, all looked after for one simple monthly cost.",
  [("IT Support Bournemouth", "/it-support-bournemouth/"), ("IT Support Poole", "/it-support-poole/"), ("IT Support Ferndown", "/it-support-ferndown/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-wimborne", "Wimborne", "Dorset",
  "Local IT support for homes and small businesses in Wimborne — monthly plans, computer help, Microsoft 365, email support and regular maintenance.",
  "In and around Wimborne Minster, Colehill and Corfe Mullen, we help home users and small businesses stay productive and protected — with regular maintenance and a friendly techie on hand.",
  [("IT Support Ferndown", "/it-support-ferndown/"), ("IT Support Poole", "/it-support-poole/"), ("IT Support Bournemouth", "/it-support-bournemouth/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-ferndown", "Ferndown", "Dorset",
  "Home and business IT support in Ferndown — remote support, monthly plans, Microsoft 365 help and cybersecurity, from a local Dorset team.",
  "Across Ferndown, West Moors and West Parley, we provide dependable IT support for homes, home workers and small businesses — keeping email, devices and security in great shape every month.",
  [("IT Support Wimborne", "/it-support-wimborne/"), ("IT Support Bournemouth", "/it-support-bournemouth/"), ("IT Support Ringwood", "/it-support-ringwood/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-dorset", "Dorset", "South Coast",
  "Managed IT support across Dorset for homes, sole traders and small businesses — your local managed service provider (MSP) for monthly support plans, computer repairs, Microsoft 365 and cybersecurity, remote and on-site.",
  "From <a href=\"/it-support-bournemouth/\">Bournemouth</a> and <a href=\"/it-support-poole/\">Poole</a> to Dorchester, Weymouth and <a href=\"/it-support-gillingham/\">Gillingham</a> in the Blackmore Vale, we&rsquo;re the family-run <strong>managed service provider (MSP)</strong> looking after homes and small businesses right across Dorset. In plain English, that means we proactively manage and protect your technology for one predictable monthly cost &mdash; fast remote help wherever you are, plus on-site visits across the county.",
  [("IT Support Bournemouth", "/it-support-bournemouth/"), ("IT Support Poole", "/it-support-poole/"), ("IT Support Christchurch", "/it-support-christchurch/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-ringwood", "Ringwood", "Hampshire",
  "Monthly IT support, Microsoft 365 help, remote computer support and security advice for homes and businesses in Ringwood and the surrounding area.",
  "On the Hampshire–Dorset border and around the New Forest, we look after Ringwood homes and small businesses — remote support in minutes, plus on-site help when it&rsquo;s needed.",
  [("IT Support Ferndown", "/it-support-ferndown/"), ("IT Support Bournemouth", "/it-support-bournemouth/"), ("IT Support Southampton", "/it-support-southampton/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-southampton", "Southampton", "Hampshire",
  "Remote IT support and business technology help for homes and businesses in Southampton and across Hampshire — monthly plans, Microsoft 365 and cybersecurity.",
  "Across Southampton and the wider Hampshire area, we provide fast remote IT support and monthly plans for home users, home workers and small businesses — with on-site help available when required.",
  [("IT Support Ringwood", "/it-support-ringwood/"), ("IT Support Bournemouth", "/it-support-bournemouth/"), ("Areas Covered", "/areas-covered/"), ("Contact", "/contact/")]),
 ("it-support-weymouth", "Weymouth", "Dorset",
  "Local IT support and computer repairs for homes and businesses in Weymouth — monthly plans, Microsoft 365, security and fast remote help across the town and harbour.",
  "From the seafront and harbour to Littlemoor, Wyke Regis and Chickerell, we keep Weymouth homes and small businesses running — computers, email, Wi-Fi, Microsoft 365 and security, all looked after for one simple monthly cost.",
  [("IT Support Portland", "/it-support-portland/"), ("IT Support Dorchester", "/it-support-dorchester/"), ("IT Support Dorset", "/it-support-dorset/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-dorchester", "Dorchester", "Dorset",
  "Friendly IT support and computer repairs for homes and businesses in Dorchester — monthly support plans, Microsoft 365, cybersecurity and quick remote help.",
  "In and around the county town, from Poundbury to Fordington, we look after home users and small businesses with reliable, proactive IT support and a real person to call.",
  [("IT Support Weymouth", "/it-support-weymouth/"), ("IT Support Bridport", "/it-support-bridport/"), ("IT Support Sherborne", "/it-support-sherborne/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-swanage", "Swanage", "Dorset",
  "IT support and computer help for homes and businesses in Swanage and Purbeck — monthly plans, Microsoft 365, security and fast remote help, with on-site visits to the coast.",
  "Around Swanage, Studland and the Isle of Purbeck, we keep homes and small businesses productive and protected — remote help in minutes, plus on-site visits when hands-on support is needed.",
  [("IT Support Wareham", "/it-support-wareham/"), ("IT Support Poole", "/it-support-poole/"), ("IT Support Dorset", "/it-support-dorset/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-blandford-forum", "Blandford Forum", "Dorset",
  "Local IT support and computer repairs for homes and businesses in Blandford Forum — monthly support plans, Microsoft 365, security and fast remote help across North Dorset.",
  "From the Georgian market town out to Pimperne, Bryanston and the Blackmore Vale, we look after home users and small businesses with dependable, proactive IT support.",
  [("IT Support Sturminster Newton", "/it-support-sturminster-newton/"), ("IT Support Wimborne", "/it-support-wimborne/"), ("IT Support Shaftesbury", "/it-support-shaftesbury/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-shaftesbury", "Shaftesbury", "Dorset",
  "Friendly IT support and computer repairs for homes and businesses in Shaftesbury — monthly plans, Microsoft 365, cybersecurity and quick remote help.",
  "Around Shaftesbury and Gold Hill, out to Motcombe and the Vale, we keep North Dorset homes and small businesses running smoothly, with remote help and on-site visits when needed.",
  [("IT Support Gillingham", "/it-support-gillingham/"), ("IT Support Sturminster Newton", "/it-support-sturminster-newton/"), ("IT Support Blandford Forum", "/it-support-blandford-forum/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-gillingham", "Gillingham", "Dorset",
  "Local IT support and computer repairs for homes and businesses in Gillingham, Dorset — monthly support plans, Microsoft 365, security and fast remote help.",
  "Across Gillingham and the surrounding North Dorset villages, we look after home users and small businesses with reliable, proactive IT support and a real person on the end of the phone.",
  [("IT Support Shaftesbury", "/it-support-shaftesbury/"), ("IT Support Sherborne", "/it-support-sherborne/"), ("IT Support Sturminster Newton", "/it-support-sturminster-newton/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-sherborne", "Sherborne", "Dorset",
  "IT support and computer help for homes and businesses in Sherborne — monthly plans, Microsoft 365, cybersecurity and quick remote help across the abbey town.",
  "From the abbey town out to the surrounding villages, we keep Sherborne homes and small businesses productive and protected, with friendly support whenever you need it.",
  [("IT Support Gillingham", "/it-support-gillingham/"), ("IT Support Sturminster Newton", "/it-support-sturminster-newton/"), ("IT Support Dorchester", "/it-support-dorchester/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-bridport", "Bridport", "Dorset",
  "Local IT support and computer repairs for homes and businesses in Bridport and West Bay — monthly support plans, Microsoft 365, security and fast remote help.",
  "Around Bridport, West Bay and the West Dorset coast, we look after home users and small businesses with reliable, proactive IT support and a real person to call.",
  [("IT Support Lyme Regis", "/it-support-lyme-regis/"), ("IT Support Dorchester", "/it-support-dorchester/"), ("IT Support Dorset", "/it-support-dorset/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-lyme-regis", "Lyme Regis", "Dorset",
  "Friendly IT support and computer repairs for homes and businesses in Lyme Regis — monthly plans, Microsoft 365, cybersecurity and quick remote help on the Jurassic Coast.",
  "On the West Dorset coast around Lyme Regis and Charmouth, we keep homes and small businesses running smoothly, with remote help in minutes and on-site visits when needed.",
  [("IT Support Bridport", "/it-support-bridport/"), ("IT Support Dorchester", "/it-support-dorchester/"), ("IT Support Dorset", "/it-support-dorset/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-corfe-mullen", "Corfe Mullen", "Dorset",
  "Local IT support and computer repairs for homes and businesses in Corfe Mullen — monthly support plans, Microsoft 365, security and fast remote help.",
  "Between Broadstone, Wimborne and Poole, we look after Corfe Mullen home users and small businesses with reliable, proactive IT support and a friendly local team.",
  [("IT Support Broadstone", "/it-support-broadstone/"), ("IT Support Wimborne", "/it-support-wimborne/"), ("IT Support Poole", "/it-support-poole/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-west-moors", "West Moors", "Dorset",
  "Friendly IT support and computer repairs for homes and businesses in West Moors — monthly plans, Microsoft 365, cybersecurity and quick remote help.",
  "Around West Moors and the Ferndown area, we keep homes and small businesses productive and protected, with a real person to call whenever tech gets in the way.",
  [("IT Support Ferndown", "/it-support-ferndown/"), ("IT Support Verwood", "/it-support-verwood/"), ("IT Support Wimborne", "/it-support-wimborne/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-sturminster-newton", "Sturminster Newton", "Dorset",
  "Local IT support and computer repairs for homes and businesses in Sturminster Newton — monthly support plans, Microsoft 365, security and fast remote help across the Blackmore Vale.",
  "In the heart of the Blackmore Vale, we look after Sturminster Newton homes and small businesses with dependable, proactive IT support and friendly help on call.",
  [("IT Support Blandford Forum", "/it-support-blandford-forum/"), ("IT Support Shaftesbury", "/it-support-shaftesbury/"), ("IT Support Gillingham", "/it-support-gillingham/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-portland", "Portland", "Dorset",
  "IT support and computer help for homes and businesses on the Isle of Portland — monthly plans, Microsoft 365, cybersecurity and quick remote help.",
  "From Fortuneswell to Easton and the bill, we keep Portland homes and small businesses running smoothly, with remote help in minutes and on-site visits when needed.",
  [("IT Support Weymouth", "/it-support-weymouth/"), ("IT Support Dorchester", "/it-support-dorchester/"), ("IT Support Dorset", "/it-support-dorset/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-upton", "Upton", "Dorset",
  "Local IT support and computer repairs for homes and businesses in Upton, near Poole — monthly support plans, Microsoft 365, security and fast remote help.",
  "Around Upton, Lytchett Minster and the western edge of Poole, we look after home users and small businesses with reliable, proactive IT support and a friendly local team.",
  [("IT Support Poole", "/it-support-poole/"), ("IT Support Broadstone", "/it-support-broadstone/"), ("IT Support Wareham", "/it-support-wareham/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-highcliffe", "Highcliffe", "Dorset",
  "Friendly IT support and computer repairs for homes and businesses in Highcliffe — monthly plans, Microsoft 365, cybersecurity and quick remote help.",
  "Along the coast around Highcliffe and Mudeford, between Christchurch and the New Forest, we keep homes and small businesses productive and protected, with a real person to call.",
  [("IT Support Christchurch", "/it-support-christchurch/"), ("IT Support New Milton", "/it-support-new-milton/"), ("IT Support Bournemouth", "/it-support-bournemouth/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-brockenhurst", "Brockenhurst", "New Forest",
  "Local IT support and computer repairs for homes and businesses in Brockenhurst and the New Forest — monthly support plans, Microsoft 365, security, fast remote help and Starlink for rural not-spots.",
  "In the heart of the New Forest around Brockenhurst and Sway, we keep homes and small businesses connected and protected — with Starlink satellite internet where broadband is slow.",
  [("IT Support Lyndhurst", "/it-support-lyndhurst/"), ("IT Support Lymington", "/it-support-lymington/"), ("IT Support New Forest", "/it-support-new-forest/"), ("Starlink Internet", "/starlink-internet/")]),
 ("it-support-lyndhurst", "Lyndhurst", "New Forest",
  "Friendly IT support and computer repairs for homes and businesses in Lyndhurst, the capital of the New Forest — monthly plans, Microsoft 365, cybersecurity and quick remote help.",
  "Around Lyndhurst, Ashurst and the central New Forest, we keep homes and small businesses running smoothly, with Starlink internet for rural properties beyond the reach of fast broadband.",
  [("IT Support Brockenhurst", "/it-support-brockenhurst/"), ("IT Support New Forest", "/it-support-new-forest/"), ("IT Support Southampton", "/it-support-southampton/"), ("Starlink Internet", "/starlink-internet/")]),
 ("it-support-fordingbridge", "Fordingbridge", "Hampshire",
  "Local IT support and computer repairs for homes and businesses in Fordingbridge and the northern New Forest — monthly support plans, Microsoft 365, security and fast remote help.",
  "Around Fordingbridge and the Avon Valley, we look after home users and small businesses with reliable, proactive IT support and Starlink internet for rural not-spots.",
  [("IT Support Ringwood", "/it-support-ringwood/"), ("IT Support New Forest", "/it-support-new-forest/"), ("IT Support Verwood", "/it-support-verwood/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-totton", "Totton", "Hampshire",
  "Friendly IT support and computer repairs for homes and businesses in Totton — monthly plans, Microsoft 365, cybersecurity and quick remote help on the edge of the New Forest.",
  "Around Totton and the Waterside, on the western edge of Southampton, we keep homes and small businesses productive and protected, with a real person to call.",
  [("IT Support Southampton", "/it-support-southampton/"), ("IT Support Hythe", "/it-support-hythe/"), ("IT Support New Forest", "/it-support-new-forest/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-hythe", "Hythe", "Hampshire",
  "Local IT support and computer repairs for homes and businesses in Hythe and the Waterside — monthly support plans, Microsoft 365, security and fast remote help.",
  "Along the Waterside around Hythe, Dibden and Marchwood, we look after home users and small businesses with reliable, proactive IT support and friendly help on call.",
  [("IT Support Totton", "/it-support-totton/"), ("IT Support Southampton", "/it-support-southampton/"), ("IT Support New Forest", "/it-support-new-forest/"), ("Areas Covered", "/areas-covered/")]),
 ("it-support-bournemouth", "Bournemouth", "Dorset",
  "Friendly, local IT support and IT services for Bournemouth homes and businesses — monthly support plans, computer and laptop repairs, Microsoft 365, cybersecurity and fast remote help from a Bournemouth IT company right on your doorstep.",
  "From the town centre and Boscombe to Winton, Charminster and Southbourne, we look after home users, families, sole traders and small businesses right across Bournemouth — with plenty of experience supporting the town&rsquo;s hospitality, tourism and professional-services firms — keeping computers, email, Wi-Fi, Microsoft 365 and security working all year round.",
  [("IT Support Poole", "/it-support-poole/"), ("IT Support Christchurch", "/it-support-christchurch/"), ("IT Support Wimborne", "/it-support-wimborne/"), ("Areas Covered", "/areas-covered/")]),
]
for i, row in enumerate(LOCAL):
    make_local(i, *row)

# ============================================ RESPONSIVE YOUTUBE VIDEO BLOCK ("work from anywhere" beach reel)
# Self-contained click-to-play facade (mirrors build_extra's Dell-reel block): serves the vertical Short to
# phones and the landscape video to desktops, on youtube-nocookie so NO cookies fire until the viewer clicks.
# Inert until BEACH_REEL_WIDE_ID is set. Until a Short is uploaded, phones fall back to the wide video.
BEACH_REEL_WIDE_ID  = "pXKy7KggrG8"   # 16:9 landscape "work from anywhere" reel (live 2026-07-15)
BEACH_REEL_SHORT_ID = "IA_t07mh6mI"   # 9:16 YouTube Short (phones) — live 2026-07-15
BEACH_REEL_DATE     = "2026-07-15"    # date the reel went live

def beach_reel_section(eyebrow, title, alt):
    if not BEACH_REEL_WIDE_ID:
        return ""   # inert until the reel is live and the ID is set above
    watch = "https://www.youtube.com/watch?v=" + BEACH_REEL_WIDE_ID
    tall  = BEACH_REEL_SHORT_ID or BEACH_REEL_WIDE_ID   # phones fall back to the wide video until the Short is up
    mob_css = ('        @media(max-width:767px){.rvid--beach{aspect-ratio:9/16;max-width:340px;border-radius:18px}.rvid--beach .rvid__play svg{width:64px}}\n'
               if BEACH_REEL_SHORT_ID else '')
    tall_src = ('              <source media="(max-width:767px)" srcset="/images/beach-reel-poster-tall.jpg" />\n'
                if BEACH_REEL_SHORT_ID else '')   # tall poster only once the 9:16 Short exists
    return (
      '    <section class="section section--alt" aria-label="Watch: work from anywhere in Dorset">\n'
      '      <div class="wrap wrap--narrow">\n'
      '        <div class="section-head">\n'
      f'          <p class="eyebrow eyebrow--center mono" data-reveal>// {eyebrow}</p>\n'
      f'          <h2 class="section-title section-title--center" data-title>{title}<span class="title-underline title-underline--center"></span></h2>\n'
      '        </div>\n'
      '        <p style="text-align:center;max-width:640px;margin:-.4rem auto 1.6rem;color:var(--muted);font-size:1.02rem;line-height:1.55">From the spare room to a Bournemouth beach caf&eacute; &mdash; when your IT just works, the desk is optional. Here&rsquo;s what reliable home-working support looks like across Dorset.</p>\n'
      f'        <div class="rvid rvid--beach" data-rvid data-short="{tall}" data-wide="{BEACH_REEL_WIDE_ID}">\n'
      f'          <button class="rvid__btn" type="button" aria-label="Play video: {alt}">\n'
      '            <picture>\n'
      + tall_src +
      f'              <img class="rvid__poster" src="/images/beach-reel-poster-wide.jpg" alt="{alt}" loading="lazy" width="1280" height="720" />\n'
      '            </picture>\n'
      '            <span class="rvid__play" aria-hidden="true"><svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.5 7.7a8 8 0 0 0-5.6-5.7C56 .7 34 .7 34 .7s-22 0-26.9 1.3a8 8 0 0 0-5.6 5.7A83 83 0 0 0 .2 24a83 83 0 0 0 1.3 16.3 8 8 0 0 0 5.6 5.7C12 47.3 34 47.3 34 47.3s22 0 26.9-1.3a8 8 0 0 0 5.6-5.7A83 83 0 0 0 67.8 24a83 83 0 0 0-1.3-16.3z" fill="#1d97e3"/><path d="M27 34.5 45 24 27 13.5z" fill="#fff"/></svg></span>\n'
      '          </button>\n'
      '        </div>\n'
      f'        <p class="rvid__fallback mono"><a href="{watch}" target="_blank" rel="noopener">Watch on YouTube &#8594;</a></p>\n'
      '      </div>\n'
      '      <style>\n'
      '        .rvid--beach{position:relative;aspect-ratio:16/9;max-width:940px;margin:0 auto;border-radius:16px;overflow:hidden;background:var(--bg-2);border:1px solid var(--line);box-shadow:0 24px 60px rgba(0,0,0,.4)}\n'
      '        .rvid--beach .rvid__btn{position:absolute;inset:0;width:100%;height:100%;padding:0;border:0;cursor:pointer;background:#000;display:block}\n'
      '        .rvid--beach .rvid__poster{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s ease,filter .3s ease}\n'
      '        .rvid--beach .rvid__btn:hover .rvid__poster,.rvid--beach .rvid__btn:focus-visible .rvid__poster{transform:scale(1.03);filter:brightness(1.06)}\n'
      '        .rvid--beach .rvid__play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);filter:drop-shadow(0 8px 24px rgba(0,0,0,.55));transition:transform .2s ease,opacity .2s ease;opacity:.94}\n'
      '        .rvid--beach .rvid__btn:hover .rvid__play,.rvid--beach .rvid__btn:focus-visible .rvid__play{transform:translate(-50%,-50%) scale(1.08);opacity:1}\n'
      '        .rvid--beach .rvid__play svg{width:84px;height:auto}\n'
      '        .rvid--beach iframe{position:absolute;inset:0;width:100%;height:100%;border:0}\n'
      '        .rvid__fallback{text-align:center;margin:16px 0 0}\n'
      '        .rvid__fallback a{color:var(--cyan-soft);text-decoration:none;font-size:.82rem;letter-spacing:.04em}\n'
      '        .rvid__fallback a:hover{text-decoration:underline}\n'
      + mob_css +
      '      </style>\n'
      '      <script>\n'
      '      (function(){try{\n'
      '        var sc=document.currentScript,sec=sc?sc.closest("section"):null;\n'
      '        var box=(sec||document).querySelector("[data-rvid]");if(!box)return;\n'
      '        var btn=box.querySelector(".rvid__btn");if(!btn)return;\n'
      '        btn.addEventListener("click",function(){\n'
      '          var mob=window.matchMedia("(max-width:767px)").matches;\n'
      '          var id=(mob&&box.getAttribute("data-short"))?box.getAttribute("data-short"):box.getAttribute("data-wide");\n'
      '          var f=document.createElement("iframe");\n'
      '          f.setAttribute("allow","accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture");\n'
      '          f.setAttribute("allowfullscreen","");f.setAttribute("title","365 Techies — work from anywhere");\n'
      '          f.src="https://www.youtube-nocookie.com/embed/"+id+"?autoplay=1&rel=0&modestbranding=1&playsinline=1";\n'
      '          box.innerHTML="";box.appendChild(f);\n'
      '        });\n'
      '      }catch(e){}})();\n'
      '      </script>\n'
      '    </section>')

def beach_reel_node(s):
    if not BEACH_REEL_WIDE_ID:
        return None   # omit VideoObject until the reel is live
    return {"@type": "VideoObject", "@id": SITE + "/" + s + "/#video",
            "name": "Work from anywhere in Dorset — 365 Techies",
            "description": "When your IT just works, the desk is optional. 365 Techies is family-run IT support in Bournemouth, keeping home and remote workers reliable so they can work from anywhere.",
            "thumbnailUrl": [SITE + "/images/beach-reel-poster-wide.jpg", SITE + "/images/beach-reel-poster-tall.jpg"],
            "uploadDate": BEACH_REEL_DATE, "duration": "PT23S", "inLanguage": "en-GB", "isFamilyFriendly": True,
            "transcript": "Working from home. Again. Your tech just works. So work from anywhere. You could work from here. Your IT just works wherever you are. This is the office now. Bournemouth's own, since 1995. Why work from anywhere else?",
            "embedUrl": "https://www.youtube-nocookie.com/embed/" + BEACH_REEL_WIDE_ID,
            "contentUrl": "https://www.youtube.com/watch?v=" + BEACH_REEL_WIDE_ID,
            "publisher": {"@type": "Organization", "name": "365 Techies",
                          "logo": {"@type": "ImageObject", "url": SITE + "/logo.jpg"}}}

# ======================================================= CUSTOMER-TYPE PAGES
def make_customer(i, slug, crumb_name, eyebrow, h1, lede, intro_head, intro_paras, feats, tile_items, faqs, chips, cta_title=None, cta_text=None, accent="cyan", split=None, split_title=None, split_eyebrow="HOME &amp; BUSINESS", steps_title=None, step_items=None, hero_cta1=None, hero_cta2=None, tools=None, scene=None, reel=False):
    cta_title = cta_title or "Let&rsquo;s sort your IT"
    cta_text = cta_text or "Join the Dorset homes and businesses who never worry about technology. Pick a plan or say hello."
    desc = lede.replace("&rsquo;", "'").replace("&amp;", "and")
    revs = [REVPOOL[i % len(REVPOOL)], REVPOOL[(i + 3) % len(REVPOOL)]]
    n = [1]
    def num():
        v = "/%02d" % n[0]; n[0] += 1; return v
    _is_ind = slug.startswith("it-support-for-")
    _bch = bp.bc_sub("IT Support by Industry", "/it-support-by-industry/", crumb_name) if _is_ind else bc(crumb_name)
    sections = [
      hero(_bch, eyebrow, h1, bp.hero_trust(lede), chips=chips, scene=bp.HERO_SCENES.get(scene),
           cta1=hero_cta1 or ("View Monthly Plans", "/monthly-it-support/"),
           cta2=hero_cta2 or ("Get Support Today", "/contact/")),
      f'''    <section class="section" aria-label="Overview">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">{num()} — FOR YOU</p>
          <h2 class="section-title" data-title>{intro_head}<span class="title-underline"></span></h2>
{intro_paras}
        </div>
        <ul class="checklist" data-stagger>
{checklist(feats)}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="What we help with">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>{num()} — HOW WE HELP</p>
          <h2 class="section-title section-title--center" data-title>Support that fits how you work<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles(tile_items)}
        </div>
      </div>
    </section>''',
    ]
    if reel:
        sections.insert(1, beach_reel_section("WATCH &middot; THE DESK IS OPTIONAL",
                        "Your IT just works, wherever you work",
                        "365 Techies reel &mdash; work from home, or from a Bournemouth beach"))
    if split:
        cards = ""
        for ct, cintro, citems in split:
            cards += (f'          <div class="tile" data-reveal>\n            <h3>{ct}</h3>\n'
                      f'            <p style="color:var(--muted);margin:0 0 1.1rem">{cintro}</p>\n'
                      f'            <ul class="checklist">\n{checklist(citems)}\n            </ul>\n          </div>\n')
        sections.append(f'''    <section class="section" aria-label="Home and business">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>{num()} — {split_eyebrow}</p>
          <h2 class="section-title section-title--center" data-title>{split_title or "The right help for you"}<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="split-2">
{cards}        </div>
      </div>
    </section>''')
    if step_items:
        sections.append(f'''    <section class="how" aria-label="How it works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>{num()} — HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>{steps_title or "Sorted in three simple steps"}<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps(step_items)}
        </ol>
      </div>
    </section>''')
    sections += [reviews_block(revs), bp.PCM_BAND, faq_html(faqs)]
    if tools:
        sections.append(bp.tools_strip(tools, alt=False))
    sections.append(cta(cta_title, cta_text))
    content = "\n".join(sections)
    def schema(s, _desc=desc, _cn=crumb_name, _faqs=faqs, _reel=reel):
        _c = bp.crumb_sub(s, "IT Support by Industry", "it-support-by-industry", _cn) if _is_ind else crumb(s, _cn)
        nodes = [_c, webpage(s, _cn, _desc),
                 service(s, _cn, _desc, "IT support"), faqpage(s, _faqs)]
        if _reel:
            _v = beach_reel_node(s)
            if _v:
                nodes.append(_v)
        return graph(nodes)
    add(slug=slug, title=SEO_TITLES.get(slug) or f"{crumb_name} | 365 Techies", desc=desc,
        og_title=f"{crumb_name} | 365 Techies", schema=schema, content=content)

CUSTOMERS = [
 dict(slug="it-support-for-home-workers", crumb_name="IT Support for Home Workers",
   eyebrow="// FOR HOME WORKERS", h1='IT support for <em class="grad grad--cyan">home workers</em>',
   lede="Reliable IT support for people working from home — email, Microsoft 365, Teams, printers, Wi-Fi, security and backups, all kept working so you can stay productive.",
   intro_head="Work from home without the tech headaches",
   intro_paras="<p>When your office is your home, downtime is on you. A dropped connection, a Teams call that won&rsquo;t start or an email outage can cost you a whole morning.</p><p><strong>We keep your home-working setup reliable and secure</strong> — so the technology just works and you can get on with the job.</p>",
   feats=["Microsoft 365 &amp; Outlook","Teams &amp; video calls","Wi-Fi &amp; home network","Printers &amp; scanners","Secure file backup","Remote access &amp; VPN","Antivirus &amp; security","Fast remote help"],
   tile_items=[("cloud","Microsoft 365","Outlook, Teams, OneDrive and SharePoint set up and supported."),("wifi","Wi-Fi &amp; network","A fast, reliable connection across your whole home office."),("shield","Security","Protection and backups so your work is always safe."),("monitor","Devices","Laptops, desktops and screens kept fast and healthy."),("mail","Email","Email that sends, receives and stays out of spam."),("bolt","Remote help","One message away when something stops working.")],
   faqs=[("Can you help me set up a home office?","Yes — we set up your computer, Microsoft 365, email, Wi-Fi, printers and secure backups so your home office runs smoothly from day one."),("Do you support Teams and video calls?","Yes, we sort out Teams, Zoom, cameras, microphones and connectivity so your calls are reliable."),("What does it cost?","Home support is £18.25/month per computer, with everything you need for home working included. Add Microsoft 365 for £4.85/month per user.")],
   chips=["Microsoft 365", "Teams &amp; Wi-Fi", "Secure backups"],
   split_eyebrow="WHAT WE COVER", split_title="Everything your home office needs",
   split=[("Your devices &amp; connection","Laptops, screens, Wi-Fi and home network kept fast and reliable, so a dropout never costs you a morning.",["Laptop &amp; desktop support","Fast, reliable home Wi-Fi","Remote access &amp; VPN","Screens, docks &amp; peripherals"]),("Your apps &amp; data","Microsoft 365, Teams, email and files set up, secured and backed up so you can work from anywhere.",["Microsoft 365 &amp; Teams","Email that just works","Secure file backup","Antivirus &amp; protection"])],
   steps_title="Productive in three steps",
   step_items=[("We set up","We get your home office &mdash; devices, Microsoft 365, Wi-Fi and printers &mdash; working properly."),("We protect","We add security and backups so your work is always safe."),("We support","One message away whenever something stops working.")],
   tools=["avtest","speed","healthcheck"], reel=True),
 dict(slug="it-support-for-sole-traders", crumb_name="IT Support for Sole Traders",
   eyebrow="// FOR SOLE TRADERS", h1='IT support for <em class="grad grad--green">sole traders</em>',
   lede="Affordable monthly IT support for sole traders who need their computer, email, phone, printer and cloud systems working reliably — without paying for an IT department.",
   intro_head="You run the business. We run the IT.",
   intro_paras="<p>As a sole trader, you&rsquo;re the boss, the bookkeeper and the IT department. When something breaks, there&rsquo;s no-one to call — until now.</p><p><strong>For one low monthly cost</strong>, you get a reliable techie on hand, regular maintenance, and the peace of mind that your tech won&rsquo;t let you down.</p>",
   feats=["Remote IT support","Email &amp; Microsoft 365","Computer maintenance","Security &amp; backups","Printer &amp; Wi-Fi help","Buying &amp; setup advice","Invoicing &amp; cloud apps","Affordable monthly cost"],
   tile_items=[("briefcase","Business basics","Email, Microsoft 365 and the apps you rely on, kept working."),("shield","Protection","Antivirus, backups and security so a problem never stops you trading."),("wrench","Repairs &amp; setup","Fast fixes and proper setup of new devices."),("cloud","Cloud &amp; email","Reliable, professional email and cloud storage."),("clock","Time back","Less time fighting tech, more time earning."),("bolt","One techie","A friendly expert on the end of the phone whenever you need one.")],
   faqs=[("Is monthly IT support worth it for a sole trader?","Yes — for less than the cost of a single emergency repair, you get ongoing support, maintenance and protection so problems are caught early."),("Can you help with my email and invoicing apps?","Yes, we support Microsoft 365, business email and the everyday cloud and invoicing apps sole traders rely on."),("Can I cancel anytime?","Yes — plans are monthly with no lock-in.")],
   chips=["Affordable monthly cost", "Microsoft 365", "Cancel anytime"],
   split_eyebrow="WHAT YOU GET", split_title="Your one-person IT department",
   split=[("Keep trading","Your computer, email, phone and printer kept working &mdash; because downtime means lost income.",["Reliable computer &amp; email","Printer &amp; Wi-Fi help","Fast remote fixes","Buying &amp; setup advice"]),("Stay protected","Security, backups and a real techie on call, so a tech problem never stops you earning.",["Antivirus &amp; security","Automatic backups","Microsoft 365 &amp; cloud apps","One friendly expert on call"])],
   steps_title="Sorted in three simple steps",
   step_items=[("We get to know you","We learn how you work and what you rely on day to day."),("We set you up","We get your tech reliable, secure and backed up."),("We keep you going","Ongoing support and maintenance for one low monthly cost.")]),
 dict(slug="small-business-it-support", crumb_name="Small Business IT Support",
   eyebrow="// FOR SMALL BUSINESS", h1='Small business <em class="grad grad--green">IT support</em>',
   lede="Monthly IT support for small businesses that need professional help without employing an in-house IT person — Microsoft 365, security, backups, staff support and more.",
   intro_head="Your outsourced IT department",
   intro_paras="<p>Small businesses depend on technology every day, but most can&rsquo;t justify full-time IT staff. That&rsquo;s exactly the gap we fill.</p><p><strong>We manage Microsoft 365, security, backups and staff devices</strong> — with priority support and a real techie who knows your setup.</p><p>Taking someone on? Our <a href=\"/new-employee-laptop-setup/\">new employee laptop setup</a> guide covers getting a starter&rsquo;s machine ready securely.</p>",
   feats=["Support for every user","Microsoft 365 management","Cybersecurity &amp; patching","Daily verified backups","New starter onboarding","Leaver account checks","Printer &amp; network support","Technology planning"],
   tile_items=[("users","Staff support","Help for your whole team, on every device they use."),("cloud","Microsoft 365","Full administration of Outlook, Teams, OneDrive and SharePoint."),("shield","Cybersecurity","Monitoring, patching and protection built in."),("server","Backups","Daily, verified backups so your data is always safe."),("user","Onboarding","Smooth setup for new starters and secure leaver checks."),("bolt","Priority support","Fast, prioritised response when your business needs it.")],
   faqs=[("Do we need our own IT person?","No — we act as your outsourced IT department, covering everything a small in-house team would, for a predictable monthly cost."),("How many users can you support?","From a couple of people to a busy team — plans scale with your business."),("Do you offer on-site support?","Yes, alongside fast remote help we provide on-site visits across Bournemouth, Poole and Dorset."),("Our shared files live on an old PC in the corner &mdash; is that OK?","It works until it doesn&rsquo;t &mdash; see our honest guide to <a href=\"/desktop-pc-used-as-office-server/\">using a desktop PC as an office server</a>, including when it&rsquo;s fine and when it&rsquo;s a risk."),("Our shared folders stopped working after a Windows update &mdash; why?","Recent Windows 11 updates tightened network-sharing security and broke many small-office setups. Our guide to <a href=\"/shared-folders-not-working-after-windows-11-24h2-update/\">shared folders after the 24H2 update</a> explains the safe fixes &mdash; or we&rsquo;ll sort it remotely.")],
   chips=["Microsoft 365 managed", "From &pound;24.38/mo per computer", "Remote &amp; on-site"],
   split_eyebrow="WHAT WE MANAGE", split_title="Everything an IT department would",
   split=[("Your team &amp; devices","Every user supported on every device, with new starters onboarded and leavers handled securely.",["Support for every user","New-starter onboarding","Secure leaver checks","Remote &amp; on-site help"]),("Your systems &amp; data","Microsoft 365, security and backups fully managed, monitored and planned around your business.",["Microsoft 365 management","Cybersecurity &amp; patching","Daily verified backups","Technology planning"])],
   steps_title="Your IT, handled in three steps",
   step_items=[("We review","We map your setup, users and where the risks are."),("We manage","We take over Microsoft 365, security, backups and support."),("We plan ahead","Regular check-ins and technology planning as you grow.")]),
 dict(slug="it-support-for-retired-users", crumb_name="IT Support for Retired Users", hero_cta1=("Call 01202 775566", "tel:+441202775566"), hero_cta2=("Or message us", "/contact/"),
   eyebrow="// FOR RETIRED PEOPLE", h1='IT support for <em class="grad grad--cyan">retired people</em>',
   lede="Friendly, patient computer help for retired users — unhurried support with laptops, email, printers, online accounts, photos, video calls, security and scam awareness.",
   intro_head="Patient help, with no silly questions",
   intro_paras="<p>Technology changes fast, and it&rsquo;s easy to feel left behind or worried about scams. We take the time to explain things clearly and never make you feel rushed.</p><p><strong>Whether it&rsquo;s a slow laptop, a tricky email or a suspicious message</strong>, we&rsquo;re a friendly phone call away — as often as you need us.</p>",
   feats=["Patient, plain-English help","Laptops &amp; computers","Email &amp; passwords","Photos &amp; video calls","Printer help","Scam &amp; fraud awareness","Security &amp; backups","Help as often as you need"],
   tile_items=[("clock","Unhurried help","We take our time and explain things in plain English."),("mail","Email &amp; accounts","Sorting email, passwords and online accounts without the stress."),("shield","Scam awareness","A real person to ask &lsquo;is this safe?&rsquo; before you click."),("home","Photos &amp; video calls","Stay in touch with family — photos, video calls and more."),("wrench","Repairs &amp; setup","Fixing slow laptops and setting up new devices properly."),("bolt","Just a call away","Friendly help whenever something puzzles you.")],
   faqs=[("Will you be patient with me?","Always. We explain everything clearly, never rush, and there&rsquo;s no such thing as a silly question."),("Can you help me avoid scams?","Yes — we set up sensible protection and you can always check with us before clicking a suspicious email or message."),("How much does it cost?","Our home support plan is &pound;18.25 a month per computer &mdash; rolling monthly, cancel anytime, no long contract. It covers friendly help as often as you need it, plus the updates, security and backups being quietly looked after for you."),("Can my son or daughter arrange it for me?","Yes &mdash; families often set up and pay for the plan on a relative&rsquo;s behalf, from anywhere in the country. See our <a href=\"/computer-help-for-elderly-parents/\">computer help for elderly parents</a> page, written just for them."),("How does remote help work &mdash; is it safe?","We always <strong>phone you first</strong> &mdash; never pop-ups or cold calls &mdash; then you watch everything we do on your screen, and our access ends the moment we&rsquo;re finished. We&rsquo;ll even send you SMS reminders about your backups."),("Do you run computer lessons?","Yes &mdash; friendly group classes at the Kinson Community Centre in Bournemouth and patient one-to-one lessons online. See <a href=\"/computer-lessons-for-seniors-bournemouth/\">computer lessons for seniors</a> for details."),("Do you support disabled people too?","Yes &mdash; supporting retired and disabled people is one of our specialisms. See our <a href=\"/it-support-for-disabled-people/\">accessible IT support for disabled people</a> page."),("Do you visit people at home?","No &mdash; everything we do is online, which keeps it affordable and means help is minutes away rather than days. We phone you, you watch everything on your own screen, and our access ends when we&rsquo;re finished. Between calls, our <a href=\"/free-courses/\">free courses</a> let you learn at your own pace.")],
   chips=["Patient &amp; friendly", "Scam protection", "No jargon"],
   split_eyebrow="HOW WE HELP", split_title="Help on your terms",
   split=[("Everyday help","Patient, unhurried help with your laptop, email, photos and online accounts &mdash; explained in plain English.",["Slow laptop fixes","Email &amp; passwords sorted","Photos &amp; video calls","Printer &amp; device help"]),("Safe &amp; protected","Sensible security and a real person to ask before you click, so you can stay safe from scams and fraud.",["Scam &amp; fraud awareness","Antivirus &amp; protection","Backups for peace of mind","Someone to ask, anytime"])],
   steps_title="Friendly help in three steps",
   step_items=[("Give us a call","Tell us what&rsquo;s puzzling you &mdash; no question is too small."),("We help, patiently","We fix it remotely and explain it clearly, never rushing you."),("We stay in touch","Help as often as you need it, from a team you know.")]),
 dict(slug="it-support-for-disabled-people", crumb_name="IT Support for Disabled People", hero_cta1=("Call 01202 775566", "tel:+441202775566"), hero_cta2=("Or message us", "/contact/"),
   eyebrow="// ACCESSIBLE IT SUPPORT", h1='Accessible IT support for <em class="grad grad--cyan">disabled people</em>',
   lede="Patient, accessible IT support for disabled people across Dorset — we set up and support computers, tablets and phones around your needs, with accessibility features, assistive technology and friendly help whenever you need it.",
   intro_head="Technology that works for you",
   intro_paras="<p>Technology should adapt to you, not the other way round. Whether you need larger text, a screen reader, voice control or a simpler, clutter-free setup, we take the time to understand exactly what works for you.</p><p><strong>We set up and support your devices around your needs</strong> &mdash; patiently, in plain English, and with help available as often as you need it.</p>",
   feats=["Accessibility setup &amp; advice","Screen readers &amp; magnification","Voice control &amp; dictation","Larger text &amp; high contrast","Simplified, clutter-free setups","Assistive technology support","Patient, unhurried help","Remote &amp; on-site support"],
   tile_items=[("eye","Vision support","Screen magnification, high-contrast modes, larger text and screen readers set up properly."),("user","Voice &amp; input","Voice control, dictation and alternative input devices configured to suit you."),("monitor","Simpler setups","Clean, clutter-free screens and shortcuts that make everyday tasks easier."),("shield","Safe &amp; secure","Security, backups and scam protection so you can use technology with confidence."),("clock","Unhurried help","We take our time, explain clearly and never make you feel rushed."),("bolt","Help when you need it","Friendly remote help in minutes, with on-site visits across Dorset.")],
   faqs=[("Can you set up accessibility features for me?","Yes &mdash; we set up and tailor accessibility features like screen readers, magnification, high-contrast modes, larger text, voice control and dictation to suit your needs."),("Do you support assistive technology?","Yes &mdash; we help set up and troubleshoot assistive technology and adapt your computer, tablet or phone so it works the way you need it to."),("Will you be patient and explain things clearly?","Always. We take our time, use plain English, and there&rsquo;s no such thing as a silly question."),("Do you also support retired users?","Yes &mdash; supporting retired and disabled people is one of our specialisms. See our <a href=\"/it-support-for-retired-users/\">IT support for retired users</a> page."),("Can you visit me at home?","Yes &mdash; much of our help is remote, but we provide on-site visits across Bournemouth, Poole and the wider Dorset area when hands-on help is needed.")],
   chips=["Accessibility-first","Patient &amp; friendly","Remote &amp; on-site"],
   split_eyebrow="HOW WE HELP", split_title="Support built around your needs",
   split=[("Set up for you","We tailor your computer, tablet or phone with the accessibility features and assistive technology that work best for you.",["Screen readers &amp; magnification","Voice control &amp; dictation","Larger text &amp; high contrast","Simplified, clutter-free setups"]),("Supported, always","Ongoing, patient help whenever you need it &mdash; plus the security and backups to keep you safe and confident online.",["Patient, unhurried help","Security &amp; scam protection","Backups for peace of mind","Remote &amp; on-site support"])],
   steps_title="Help that fits you, in three steps",
   step_items=[("Tell us your needs","Tell us how you use your devices and what would make them easier."),("We set you up","We configure accessibility features and assistive technology around you."),("We stay on hand","Friendly, patient help whenever you need it, for one simple monthly cost.")]),
 dict(slug="it-support-for-digital-nomads", crumb_name="IT Support for Digital Nomads",
   eyebrow="// FOR DIGITAL NOMADS", h1='IT support for <em class="grad grad--cyan">digital nomads</em>',
   lede="Work from anywhere, supported from everywhere. Reliable remote IT support for digital nomads and location-independent workers — secure devices, cloud setup, backups and fast help across every time zone.",
   intro_head="Your IT team, wherever you land",
   intro_paras="<p>When your office is wherever the Wi-Fi is, you can&rsquo;t afford for tech to fail &mdash; and there&rsquo;s no IT department down the hall.</p><p><strong>We keep your laptop, cloud and connection working and secure</strong>, wherever in the world you are, with fast remote help whenever you need it.</p><p>And we&rsquo;re not guessing at this life from a desk: we run 365 Techies from an off-grid campervan ourselves, on 5G with satellite backup &mdash; <a href='/working-from-a-campervan/'>here&rsquo;s the real setup</a>.</p>",
   feats=["Secure laptop &amp; device setup","Microsoft 365 &amp; cloud anywhere","Encrypted remote support","VPN &amp; safe public Wi-Fi","Automatic cloud backups","Travel-ready security","Time-zone-friendly help","One trusted point of contact"],
   tile_items=[("globe","Work anywhere","Reliable setup and support wherever you &mdash; and your Wi-Fi &mdash; end up."),("cloud","Cloud-first","Microsoft 365, files and tools synced and ready on every device."),("lock","Safe on public Wi-Fi","A VPN and proper security so caf&eacute;s and airports can&rsquo;t catch you out."),("server","Backups that travel","Automatic cloud backups so a lost laptop is never a lost livelihood."),("clock","Any time zone","Flexible help arranged around wherever you are in the world."),("bolt","Fast remote help","Encrypted support in minutes, no matter the location.")],
   faqs=[("Can you support me while I travel abroad?","Yes &mdash; all we need is an internet connection. We provide secure remote support and managed plans for digital nomads anywhere in the UK, Europe and beyond."),("How do you keep me secure on public Wi-Fi?","We set up a VPN and proper security so your data stays private on caf&eacute;, hotel and airport networks."),("What if my laptop is lost or stolen?","With automatic cloud backups and the right security, your data stays safe and recoverable &mdash; and we&rsquo;ll help you get back up and running fast."),("Do you work across time zones?","Yes &mdash; tell us where you are and we&rsquo;ll arrange support and maintenance to suit your time zone.")],
   chips=["Work anywhere","Secure &amp; backed up","Any time zone"],
   split_eyebrow="WHAT WE COVER", split_title="Everything a nomad needs",
   split=[("Your kit &amp; connection","Laptop, phone, VPN and connection kept fast, secure and ready wherever you are.",["Secure laptop &amp; phone setup","VPN for safe public Wi-Fi","Connection troubleshooting","Travel-ready hardware advice"]),("Your cloud &amp; data","Microsoft 365, files and backups in the cloud, synced and protected across every device.",["Microsoft 365 anywhere","Synced files &amp; tools","Automatic cloud backups","Security that travels with you"])],
   steps_title="Supported anywhere, in three steps",
   step_items=[("Tell us your setup","Tell us how and where you work, and what you travel with."),("We set you up","We secure your devices, cloud and backups for life on the move."),("We support you anywhere","Fast, encrypted help whenever and wherever you need it.")]),
 dict(slug="family-it-support", crumb_name="Family IT Support",
   eyebrow="// FOR FAMILIES", h1='Family <em class="grad grad--cyan">IT support</em>',
   lede="Monthly support for households with multiple computers, tablets, printers, email accounts and online services — one friendly plan that keeps the whole family connected and protected.",
   intro_head="One plan for the whole household",
   intro_paras="<p>Modern homes are full of devices — laptops, tablets, phones, printers, games consoles and smart-home gadgets — and keeping them all working and safe is a job in itself.</p><p><strong>One family plan covers everyone</strong>, with help for every device, parental-control advice and protection that keeps the whole household secure.</p>",
   feats=["Multiple computers &amp; tablets","Printers &amp; Wi-Fi","Email &amp; Microsoft 365","Parental controls advice","Security for every device","Backups for precious photos","Games &amp; smart-home help","One simple monthly cost"],
   tile_items=[("users","Every device","Laptops, tablets, phones, printers and consoles — all covered."),("wifi","Home Wi-Fi","Strong, reliable Wi-Fi in every room of the house."),("shield","Family safety","Security and parental-control advice to keep everyone safe."),("home","Photos &amp; memories","Backups so precious family photos are never lost."),("monitor","Homework &amp; work","Devices kept fast for school, study and home working."),("bolt","One number","One friendly techie for the whole family to call.")],
   faqs=[("Can you help with parental controls on the children&rsquo;s devices?","Yes &mdash; it&rsquo;s a normal part of a family visit. We set up the controls on the actual devices (Screen Time or Family Link on phones and tablets, the family settings on Xbox, PlayStation and Switch, YouTube and Minecraft), write down where they live for you, and show you how to change them. Our free <a href=\"/parents-guide-online-safety/\">parents&rsquo; guide</a> has every step, checked against the makers&rsquo; own instructions, if you&rsquo;d rather do it yourself."),("Does one plan cover the whole family?","Yes — a family plan covers multiple computers, tablets and devices in your household under one simple monthly cost."),("Can you help keep the kids safe online?","Yes, we advise on parental controls and set up sensible protection across the family&rsquo;s devices."),("Can you back up our family photos?","Absolutely — we set up reliable backups so your photos and memories are always safe.")],
   chips=["Every device covered", "Family-safe", "One monthly cost"],
   split_eyebrow="WHAT&rsquo;S COVERED", split_title="One plan for the whole household",
   split=[("Every device","Laptops, tablets, phones, printers and consoles &mdash; all kept working and connected for everyone.",["Computers, tablets &amp; phones","Printers &amp; home Wi-Fi","Games &amp; smart-home help","Fast remote fixes"]),("Everyone protected","Security, parental-control advice and backups that keep the whole family safe and your memories secure.",["Security on every device","Parental-control advice","Backups for family photos","Scam-checking on call"])],
   steps_title="The whole family, sorted",
   step_items=[("One simple plan","Tell us about your household and devices &mdash; one cost covers everyone."),("We set up &amp; protect","We get every device working, connected and secured."),("One number to call","Friendly help for the whole family whenever you need it.")]),
]
for i, c in enumerate(CUSTOMERS):
    make_customer(i, **c)

# ===================================================== INDUSTRY / SECTOR PAGES
INDUSTRIES = [
 dict(slug="it-support-for-accountants", crumb_name="IT Support for Accountants", accent="green",
   eyebrow="// FOR ACCOUNTANTS", h1='IT support for <em class="grad grad--green">accountants</em>',
   lede="Specialist IT support for accountants and bookkeepers — secure, reliable systems that keep Sage, Xero, QuickBooks, Microsoft 365 and client data running perfectly, especially through busy season.",
   intro_head="No downtime when deadlines hit",
   intro_paras="<p>For an accountancy practice, a system outage during self-assessment or year-end isn&rsquo;t an inconvenience &mdash; it&rsquo;s lost billable hours and missed deadlines.</p><p><strong>We keep your practice secure, backed up and always available</strong>, with the right protection for sensitive client data and someone to call the moment anything wobbles.</p>",
   feats=["Sage, Xero &amp; QuickBooks support","Microsoft 365 &amp; email","Secure client data &amp; backups","Making Tax Digital ready","Cybersecurity &amp; encryption","Multi-user &amp; remote access","Busy-season priority support","Practice IT planning"],
   tile_items=[("briefcase","Accountancy software","Sage, Xero, QuickBooks and tax software kept fast and reliable."),("cloud","Microsoft 365","Outlook, Teams and shared files set up and managed."),("shield","Client data security","Encryption, MFA and protection for sensitive financial data."),("server","Backups","Verified backups so client records are never at risk."),("clock","Busy-season cover","Priority support when deadlines pile up."),("users","Multi-user setups","Reliable systems for your whole team, in office or remote.")],
   faqs=[("Do you support Sage, Xero and QuickBooks?","Yes &mdash; we support the accountancy and tax software practices rely on, keeping it fast, updated and reliable."),("Is our client data secure?","Yes &mdash; we protect sensitive financial data with encryption, MFA, security monitoring and verified backups."),("Can you cope with our busy season?","Absolutely &mdash; subscribers get priority support, so deadline crunches don&rsquo;t become disasters."),("Do you support remote and hybrid working?","Yes &mdash; secure remote access and Microsoft 365 so your team can work safely from anywhere."),("Sage 50 says it cannot connect to the shared data &mdash; can you fix it today?","Usually, yes &mdash; remotely. Work through our <a href=\"/sage-50-multi-user-cannot-connect/\">Sage 50 multi-user fix guide</a> or call us. We also cover HMRC&rsquo;s free payroll tool &mdash; see <a href=\"/basic-paye-tools-could-not-access-the-database/\">Basic PAYE Tools database errors</a>.")],
   chips=["Sage, Xero &amp; QuickBooks","Secure client data","Busy-season priority"],
   split_eyebrow="FOR YOUR PRACTICE", split_title="Built for accountancy practices",
   split=[("Your systems","The accountancy and tax software your practice runs on, kept fast, updated and always available.",["Sage, Xero &amp; QuickBooks","Microsoft 365 &amp; email","Multi-user &amp; remote access","Fast, priority support"]),("Your data &amp; compliance","Sensitive client data protected, backed up and handled to the standards your clients expect.",["Encryption &amp; MFA","Verified daily backups","Making Tax Digital ready","Security best practice"])],
   steps_title="A safer practice in three steps",
   step_items=[("We review","We assess your software, data and where the risks are."),("We secure &amp; optimise","We protect client data and make your systems fast and reliable."),("We support","Priority help and maintenance, all year and through busy season.")]),
 dict(slug="it-support-for-solicitors", crumb_name="IT Support for Solicitors & Law Firms", accent="cyan",
   eyebrow="// FOR LAW FIRMS", h1='IT support for <em class="grad grad--cyan">solicitors &amp; law firms</em>',
   lede="IT support for solicitors and law firms — confidential, compliant and reliable systems for case management, document security, email and remote working, built around the standards your profession demands.",
   intro_head="Confidentiality and reliability, built in",
   intro_paras="<p>Law firms handle some of the most sensitive data there is, under strict professional obligations. A breach or outage isn&rsquo;t just costly &mdash; it&rsquo;s a regulatory and reputational risk.</p><p><strong>We keep your firm secure, compliant and running smoothly</strong>, with proper protection for client confidentiality and case data.</p>",
   feats=["Case management support","Document &amp; email security","Client confidentiality","Secure remote working","Encryption &amp; MFA","Verified backups","Microsoft 365 management","Compliance-friendly IT"],
   tile_items=[("lock","Confidentiality","Encryption, access control and security to protect client data."),("briefcase","Case management","Support for the legal software your firm runs on."),("mail","Secure email","Protected, professional email with phishing defence."),("server","Backups","Verified backups so case files are never lost."),("cloud","Microsoft 365","Outlook, Teams and document management, managed for you."),("shield","Compliance-ready","Security and records handling that supports your obligations.")],
   faqs=[("Can you protect client confidentiality?","Yes &mdash; we use encryption, multi-factor authentication, access controls and monitoring to keep client and case data confidential."),("Do you support legal case management software?","Yes &mdash; we keep your case and practice management systems running reliably and securely."),("Can you help with compliance?","We provide security, backups and records handling that support your professional and data-protection obligations."),("Do you support remote and hybrid working?","Yes &mdash; secure remote access so your team can work confidentially from anywhere.")],
   chips=["Confidential &amp; compliant","Case management","Secure remote working"],
   split_eyebrow="FOR YOUR FIRM", split_title="Built for legal practices",
   split=[("Confidentiality &amp; compliance","Client and case data protected to the standards your profession and the regulators expect.",["Encryption &amp; access control","Secure, protected email","Verified backups","Compliance-friendly setup"]),("Productivity","Reliable systems and secure remote working so your fee-earners can focus on clients.",["Case management support","Microsoft 365 &amp; Teams","Secure remote access","Fast, priority support"])],
   steps_title="A secure firm in three steps",
   step_items=[("We review","We assess your systems, data and confidentiality risks."),("We secure","We lock down client data and harden your systems."),("We support","Ongoing protection, backups and priority help.")]),
 dict(slug="it-support-for-care-homes", crumb_name="IT Support for Care Homes", accent="green",
   eyebrow="// FOR CARE HOMES", h1='IT support for <em class="grad grad--green">care homes</em>',
   lede="Reliable, round-the-clock IT support for care homes — keeping care management systems, resident records, Wi-Fi, staff devices and communications working safely, 24 hours a day.",
   intro_head="Always-on IT for round-the-clock care",
   intro_paras="<p>Care homes never close, and neither can their technology. From care planning systems to medication records and family communications, reliable, secure IT is part of good care.</p><p><strong>We keep your systems running and your resident data protected</strong>, with support that understands a care setting can&rsquo;t wait until Monday.</p>",
   feats=["Care management software","Resident data security","Reliable Wi-Fi everywhere","Staff devices &amp; logins","CQC-friendly records","Verified backups","Email &amp; communications","Responsive support"],
   tile_items=[("heart","Care systems","Support for the care planning and medication software you rely on."),("shield","Resident data","Encryption, access control and protection for sensitive records."),("wifi","Whole-building Wi-Fi","Reliable coverage for staff, systems and residents&rsquo; families."),("users","Staff devices","Logins, tablets and shared devices kept working and secure."),("server","Backups","Verified backups so resident records are always safe."),("clock","Responsive help","Fast support, because care doesn&rsquo;t keep office hours.")],
   faqs=[("Do you support care management software?","Yes &mdash; we keep your care planning, rostering and medication systems running reliably and securely."),("Is resident data protected?","Yes &mdash; we use encryption, access controls and verified backups to keep sensitive resident records safe."),("Can you provide Wi-Fi throughout the home?","Yes &mdash; we design reliable Wi-Fi for staff, systems and residents&rsquo; families across the whole building."),("How quickly can you help?","Subscribers get fast, priority remote support, with on-site help across Dorset when it&rsquo;s needed.")],
   chips=["Care systems","Resident data secure","Reliable Wi-Fi"],
   split_eyebrow="FOR YOUR HOME", split_title="Built for care settings",
   split=[("Systems &amp; data","The care software and resident records your home depends on, kept reliable and secure.",["Care management software","Encryption &amp; access control","Verified backups","CQC-friendly records handling"]),("Staff &amp; connectivity","Whole-building Wi-Fi and staff devices that just work, so carers can focus on residents.",["Whole-building Wi-Fi","Staff devices &amp; logins","Email &amp; communications","Fast, responsive support"])],
   steps_title="Reliable care IT in three steps",
   step_items=[("We assess","We review your systems, devices and connectivity needs."),("We set up &amp; secure","We make everything reliable and protect resident data."),("We support","Responsive, ongoing help that fits a 24/7 setting.")]),
 dict(slug="it-support-for-charities", crumb_name="IT Support for Charities", accent="cyan",
   eyebrow="// FOR CHARITIES", h1='IT support for <em class="grad grad--cyan">charities</em>',
   lede="Friendly, affordable IT support for charities and non-profits — making the most of Microsoft 365 nonprofit grants, supporting volunteers and staff, and protecting donor and beneficiary data on a budget.",
   intro_head="More impact from every pound",
   intro_paras="<p>Charities do vital work on tight budgets, often with a mix of staff and volunteers and limited IT know-how. Technology should help your mission, not drain your funds.</p><p><strong>We help you get more from your technology for less</strong> &mdash; including free and discounted Microsoft 365 nonprofit licensing &mdash; while keeping your data safe.</p>",
   feats=["Microsoft 365 nonprofit grants","Volunteer &amp; staff support","Donor &amp; beneficiary data security","Affordable, flexible help","Email &amp; collaboration","Backups &amp; protection","Remote &amp; on-site support","IT advice &amp; planning"],
   tile_items=[("gift","Nonprofit grants","Help claiming free and discounted Microsoft 365 nonprofit licences."),("users","Volunteers &amp; staff","Support for everyone, however tech-confident they are."),("shield","Data protection","Keep donor and beneficiary data safe and compliant."),("cloud","Microsoft 365","Email, Teams and shared files, set up and managed."),("server","Backups","Verified backups so your records are never lost."),("heart","On your side","Friendly, affordable help that respects your budget.")],
   faqs=[("Can you help us get Microsoft 365 nonprofit grants?","Yes &mdash; we help eligible charities claim and set up free and discounted Microsoft 365 nonprofit licensing."),("Is your support affordable for charities?","Yes &mdash; we offer flexible, budget-friendly support designed around how charities actually work."),("Can you support volunteers as well as staff?","Absolutely &mdash; we provide patient, friendly help for everyone, whatever their tech confidence."),("Is donor data kept safe?","Yes &mdash; we protect donor and beneficiary data with security, access control and verified backups.")],
   chips=["Nonprofit grants","Budget-friendly","Volunteers &amp; staff"],
   split_eyebrow="FOR YOUR CAUSE", split_title="Built for charities &amp; non-profits",
   split=[("Stretch your budget","Make the most of nonprofit grants and affordable support so more of your money reaches your cause.",["Microsoft 365 nonprofit grants","Affordable, flexible support","Email &amp; collaboration","Friendly IT advice"]),("Protect your people &amp; data","Keep volunteers, staff and the people you help safe, with sensible security and backups.",["Donor &amp; beneficiary data security","Volunteer &amp; staff support","Verified backups","Scam &amp; phishing protection"])],
   steps_title="More impact in three steps",
   step_items=[("We review","We look at your setup, grants you&rsquo;re eligible for, and your needs."),("We set up &amp; save","We claim grants, set things up and protect your data."),("We support","Friendly, affordable, ongoing help for staff and volunteers.")]),
 dict(slug="it-support-for-dental-medical", crumb_name="IT Support for Dental & Medical Practices", accent="green",
   eyebrow="// FOR DENTAL &amp; MEDICAL", h1='IT support for <em class="grad grad--green">dental &amp; medical practices</em>',
   lede="Reliable, compliant IT support for dental and medical practices — protecting patient data, keeping clinical and practice management systems running, and meeting the standards your practice is held to.",
   intro_head="Patient data safe, systems always on",
   intro_paras="<p>In a practice, downtime means cancelled appointments and clinical disruption &mdash; and patient data carries some of the strictest protection requirements of all.</p><p><strong>We keep your clinical and practice systems reliable and your patient data secure</strong>, with support that understands a busy practice can&rsquo;t wait.</p>",
   feats=["Practice management systems","Patient data security","Clinical system support","Reliable networks &amp; Wi-Fi","Encryption &amp; access control","Verified backups","Email &amp; communications","Compliance-friendly IT"],
   tile_items=[("heart","Clinical systems","Support for your practice management and clinical software."),("lock","Patient data","Encryption, access control and protection for patient records."),("server","Backups","Verified backups so patient records are never at risk."),("wifi","Reliable networks","Stable, secure networks across the whole practice."),("cloud","Microsoft 365","Email, communications and shared files, managed for you."),("shield","Compliance-ready","Security and records handling that support your obligations.")],
   faqs=[("Do you support dental and medical practice software?","Yes &mdash; we keep practice management and clinical systems running reliably and securely."),("Is patient data protected?","Yes &mdash; we use encryption, access controls, monitoring and verified backups to keep patient data safe."),("Can you help with compliance?","We provide security, backups and records handling that support your data-protection and clinical-governance obligations."),("How fast can you help if something breaks?","Subscribers get priority remote support, with on-site help across Dorset when needed.")],
   chips=["Clinical systems","Patient data secure","Compliance-ready"],
   split_eyebrow="FOR YOUR PRACTICE", split_title="Built for clinical settings",
   split=[("Clinical &amp; practice systems","The clinical and management software your practice runs on, kept reliable and supported.",["Practice management systems","Clinical system support","Reliable networks","Priority support"]),("Patient data &amp; compliance","Patient records protected to the strict standards healthcare demands.",["Encryption &amp; access control","Verified backups","Compliance-friendly records","Security monitoring"])],
   steps_title="A safer practice in three steps",
   step_items=[("We review","We assess your systems, networks and data risks."),("We secure &amp; stabilise","We protect patient data and make systems reliable."),("We support","Priority, ongoing help so clinics run smoothly.")]),
 dict(slug="it-support-for-estate-agents", crumb_name="IT Support for Estate Agents", accent="cyan",
   eyebrow="// FOR ESTATE AGENTS", h1='IT support for <em class="grad grad--cyan">estate agents</em>',
   lede="IT support for estate and letting agents — keeping property portals, CRM, email, mobile working and branch networks running so your team never misses a lead or a viewing.",
   intro_head="Never miss a lead",
   intro_paras="<p>Estate agency moves fast, in the office and out on viewings. Slow systems, portal problems or email trouble mean missed enquiries and lost instructions.</p><p><strong>We keep your portals, CRM and mobile working seamless</strong>, across every branch and every device, so your team stays responsive.</p>",
   feats=["Property portal support","CRM &amp; software","Mobile &amp; remote working","Branch networks &amp; Wi-Fi","Email &amp; marketing tools","Security &amp; backups","Microsoft 365 management","Fast, responsive support"],
   tile_items=[("globe","Property portals","Rightmove, Zoopla and your website kept connected and working."),("briefcase","Agency CRM","Support for the CRM and software your branches run on."),("monitor","Mobile working","Reliable access on the move, for viewings and valuations."),("wifi","Branch networks","Fast, secure networks and Wi-Fi across every office."),("cloud","Microsoft 365","Email, Teams and shared files for the whole agency."),("shield","Security","Protection and backups for client and property data.")],
   faqs=[("Do you support property portals and agency CRM?","Yes &mdash; we keep your portals, CRM and agency software connected and reliable."),("Can your team work on the move?","Yes &mdash; we set up secure mobile and remote working for viewings, valuations and out-of-office days."),("Can you support multiple branches?","Yes &mdash; we manage networks, Wi-Fi and systems across all your offices under one plan."),("How fast can you respond?","Subscribers get priority support, so portal or email issues are sorted quickly.")],
   chips=["Portals &amp; CRM","Mobile working","Multi-branch"],
   split_eyebrow="FOR YOUR AGENCY", split_title="Built for estate &amp; letting agents",
   split=[("Win &amp; manage instructions","Portals, CRM and email kept seamless so no lead or instruction slips through.",["Rightmove &amp; Zoopla support","Agency CRM &amp; software","Reliable, protected email","Marketing tools support"]),("Work anywhere","Secure mobile working and reliable branch networks so your team is always responsive.",["Mobile &amp; remote working","Branch networks &amp; Wi-Fi","Microsoft 365 &amp; Teams","Security &amp; backups"])],
   steps_title="A sharper agency in three steps",
   step_items=[("We review","We look at your portals, CRM, branches and devices."),("We set up","We make everything fast, connected and mobile-ready."),("We support","Priority help so your team never misses a beat.")]),
 dict(slug="it-support-for-retail-hospitality", crumb_name="IT Support for Retail & Hospitality", accent="green",
   eyebrow="// FOR RETAIL &amp; HOSPITALITY", h1='IT support for <em class="grad grad--green">retail &amp; hospitality</em>',
   lede="IT support for shops, cafés, restaurants and hospitality — keeping tills and EPOS, card payments, bookings, guest Wi-Fi and back-office systems running so you never lose a sale.",
   intro_head="Keep the tills ringing",
   intro_paras="<p>In retail and hospitality, a system going down at the wrong moment means a queue of customers and lost takings. Your tech has to just work, all day, every day.</p><p><strong>We keep your tills, payments, bookings and Wi-Fi reliable</strong>, with fast help when something needs sorting in a hurry.</p>",
   feats=["EPOS &amp; till support","Card payment systems","Booking &amp; ordering systems","Guest &amp; staff Wi-Fi","Back-office &amp; stock systems","Security &amp; backups","Email &amp; admin","Fast, responsive support"],
   tile_items=[("monitor","EPOS &amp; tills","Point-of-sale and till systems kept running reliably."),("bolt","Card payments","Payment systems and connections that don&rsquo;t let you down."),("wifi","Guest &amp; staff Wi-Fi","Reliable, secure Wi-Fi for customers and your team."),("server","Back office","Stock, bookings and admin systems supported."),("shield","Security","Protection and backups for sales and customer data."),("clock","Quick help","Fast support when something needs fixing right now.")],
   faqs=[("Do you support EPOS and till systems?","Yes &mdash; we keep your point-of-sale, tills and card payment systems reliable and connected."),("Can you set up guest Wi-Fi?","Yes &mdash; we set up secure guest Wi-Fi that&rsquo;s separate from your business systems."),("What if something breaks during service?","Subscribers get fast, priority support, so problems are sorted quickly."),("Do you support bookings and ordering systems?","Yes &mdash; we support the booking, ordering and back-office systems your business runs on.")],
   chips=["EPOS &amp; payments","Guest Wi-Fi","Fast support"],
   split_eyebrow="FOR YOUR BUSINESS", split_title="Built for retail &amp; hospitality",
   split=[("Front of house","Tills, payments, bookings and Wi-Fi kept reliable so you never lose a sale.",["EPOS &amp; till support","Card payment systems","Booking &amp; ordering","Guest &amp; staff Wi-Fi"]),("Behind the scenes","Stock, admin and customer data kept running and protected.",["Back-office &amp; stock systems","Email &amp; admin","Security &amp; backups","Fast, priority support"])],
   steps_title="Smooth trading in three steps",
   step_items=[("We review","We look at your tills, payments, Wi-Fi and systems."),("We set up","We make everything reliable and secure."),("We support","Fast help so trading never stops for long.")]),
 dict(slug="it-support-for-tradespeople", crumb_name="IT Support for Tradespeople", accent="cyan",
   eyebrow="// FOR TRADES &amp; CONSTRUCTION", h1='IT support for <em class="grad grad--cyan">tradespeople</em>',
   lede="IT support for tradespeople, builders and construction firms — mobile-first help with quoting and invoicing apps, email, job management, devices and backups, on site and on the move.",
   intro_head="IT that keeps up with the job",
   intro_paras="<p>On the tools or on site, you need quoting, invoicing and job management that just work from your phone or van &mdash; not a tech headache at the end of a long day.</p><p><strong>We keep your mobile, cloud and admin running smoothly</strong>, so you can quote faster, get paid sooner and spend less time fighting tech.</p>",
   feats=["Quoting &amp; invoicing apps","Job management software","Email &amp; Microsoft 365","Mobile &amp; tablet setup","Cloud file access","Photo &amp; document backup","Security on the move","Buying &amp; setup advice"],
   tile_items=[("bolt","Quoting &amp; invoicing","Quoting, invoicing and accounts apps set up and working."),("briefcase","Job management","Support for the job and project software you rely on."),("monitor","Mobile-first","Phones and tablets set up for work on the move."),("cloud","Cloud access","Files, photos and paperwork available anywhere."),("server","Backups","Photos and documents backed up so nothing&rsquo;s lost."),("shield","Security","Protection for your devices and data on site.")],
   faqs=[("Can you set up quoting and invoicing apps?","Yes &mdash; we set up and support the quoting, invoicing and accounts apps trades rely on, on phone and tablet."),("Do you support mobile working?","Yes &mdash; we&rsquo;re mobile-first for trades, keeping your phone, tablet and cloud working on the move."),("Can you back up my job photos and paperwork?","Yes &mdash; we set up automatic cloud backups so photos and documents are never lost."),("Do I need to be on site for support?","No &mdash; most help is remote and fast, wherever you and your van happen to be.")],
   chips=["Mobile-first","Quoting &amp; invoicing","Cloud &amp; backups"],
   split_eyebrow="FOR YOUR TRADE", split_title="Built for life on site",
   split=[("On the move","Phones, tablets and apps set up so you can quote, invoice and manage jobs from anywhere.",["Quoting &amp; invoicing apps","Job management software","Mobile &amp; tablet setup","Cloud file access"]),("Sorted &amp; safe","Email, backups and security that keep your business running and your data protected.",["Email &amp; Microsoft 365","Photo &amp; document backup","Security on the move","Buying &amp; setup advice"])],
   steps_title="Less tech hassle in three steps",
   step_items=[("Tell us how you work","Tell us what apps and devices you use day to day."),("We set you up","We get your mobile, cloud and apps working smoothly."),("We support","Fast remote help whenever tech gets in the way.")]),
 dict(slug="it-support-for-education", crumb_name="IT Support for Schools & Education", accent="green",
   eyebrow="// FOR EDUCATION", h1='IT support for <em class="grad grad--green">schools &amp; education</em>',
   lede="Reliable, safe IT support for schools, nurseries, colleges and education providers — keeping classrooms, networks, devices and online-safety systems running so staff can focus on teaching.",
   intro_head="Technology that supports learning",
   intro_paras="<p>In education, technology is woven through every lesson and every office &mdash; and when it fails, learning stops and staff scramble. Add safeguarding and online-safety duties, and reliable IT becomes essential, not optional.</p><p><strong>We keep classrooms, networks and devices running and safe</strong>, with friendly support that understands a school day can&rsquo;t wait for a callback.</p>",
   feats=["Classroom &amp; device support","Site-wide networks &amp; Wi-Fi","Microsoft 365 Education","Online safety &amp; web filtering","Safeguarding-friendly IT","Staff &amp; admin support","Backups &amp; security","Budget-conscious &amp; grants"],
   tile_items=[("server","Networks &amp; Wi-Fi","Reliable, secure networks and Wi-Fi across the whole site."),("monitor","Classroom devices","Laptops, tablets and interactive screens kept working."),("shield","Online safety","Web filtering and safeguarding-friendly protection for pupils."),("cloud","Microsoft 365 Education","Email, Teams and shared files for staff and students."),("server","Backups &amp; security","Verified backups and security for sensitive data."),("bolt","Fast support","Quick help, because a school day won&rsquo;t wait.")],
   faqs=[("Do you support schools and nurseries?","Yes &mdash; we support schools, nurseries, colleges and other education providers with classroom devices, networks, Microsoft 365 and online safety."),("Can you help with online safety and filtering?","Yes &mdash; we set up web filtering and safeguarding-friendly protection to help keep pupils safe online."),("Do you support Microsoft 365 Education?","Yes &mdash; we set up and manage Microsoft 365 for education, including free and discounted licensing where eligible."),("Can you work around the school day?","Absolutely &mdash; we provide fast remote help and arrange on-site work around lessons and term times.")],
   chips=["Schools &amp; colleges","Online safety","Microsoft 365 Education"],
   split_eyebrow="FOR YOUR SETTING", split_title="Built for education",
   split=[("Classrooms &amp; devices","The networks, Wi-Fi and devices lessons depend on, kept reliable and ready.",["Site-wide networks &amp; Wi-Fi","Classroom &amp; staff devices","Interactive screens &amp; printers","Fast, friendly support"]),("Safety &amp; systems","Online safety, data protection and the systems that keep your setting running.",["Online safety &amp; filtering","Microsoft 365 Education","Verified backups &amp; security","Safeguarding-friendly IT"])],
   steps_title="Reliable school IT in three steps",
   step_items=[("We assess","We review your devices, network, systems and online-safety needs."),("We set up &amp; secure","We make everything reliable and keep pupils and data safe."),("We support","Fast, friendly help that works around your school day.")]),
 dict(slug="it-support-for-hotels-holiday-lets", crumb_name="IT Support for Hotels & Holiday Lets", accent="cyan",
   eyebrow="// FOR HOTELS &amp; HOLIDAY LETS", h1='IT support for <em class="grad grad--cyan">hotels &amp; holiday lets</em>',
   lede="IT support for hotels, B&amp;Bs, guest houses and holiday lets across Dorset and the New Forest &mdash; reliable booking systems, guest Wi-Fi, card payments, keyless entry and rock-solid connectivity, even in rural not-spots.",
   intro_head="Technology that never lets a guest down",
   intro_paras="<p>In hospitality, a glitch is a guest&rsquo;s ruined check-in or a booking that never arrived. From your property-management system to the Wi-Fi guests judge you on, your technology has to just work &mdash; especially in the busy season.</p><p><strong>We keep your booking systems, payments, Wi-Fi and connectivity running smoothly</strong>, with fast help when something wobbles. In rural spots where broadband struggles, we install <a href=\"/starlink-internet/\">Starlink</a> for fast, reliable internet anywhere.</p>",
   feats=["Booking &amp; channel-manager support","Reliable guest Wi-Fi at scale","Smart locks &amp; keyless entry","Card payment systems","Rural internet &amp; Starlink","Verified backups","Microsoft 365 &amp; email","Responsive seasonal support"],
   tile_items=[("briefcase","Booking systems","Your property-management and channel-manager software kept reliable."),("wifi","Guest Wi-Fi","Fast, reliable Wi-Fi across rooms and communal areas that guests love."),("lock","Keyless entry","Smart locks and keyless check-in, set up and supported."),("bolt","Card payments","Reliable card and contactless payments at reception and online."),("globe","Rural connectivity","Starlink and resilient internet for properties off the beaten track."),("clock","Seasonal cover","Fast, priority help when you&rsquo;re fully booked and can&rsquo;t afford downtime.")],
   faqs=[("Do you support property-management and channel-manager software?","Yes &mdash; we keep the booking and channel-manager platforms you list and manage on running reliably, including the PCs, connection and email they depend on."),("Can you sort reliable guest Wi-Fi?","Yes &mdash; we design Wi-Fi that covers rooms and communal areas and copes with lots of guests at once. See <a href=\"/wifi-support/\">Wi-Fi support</a>."),("Our broadband is slow because we&rsquo;re rural &mdash; can you help?","Definitely &mdash; <a href=\"/starlink-internet/\">Starlink satellite internet</a> delivers fast, reliable broadband almost anywhere, ideal for rural hotels and lets across Dorset and the <a href=\"/it-support-new-forest/\">New Forest</a>."),("Do you help with card payments?","Yes &mdash; we keep your card and contactless payment systems working at reception and online, and the network behind them secure.")],
   chips=["Booking systems","Guest Wi-Fi","Rural Starlink"],
   split_eyebrow="FOR YOUR PROPERTY", split_title="Built for hospitality",
   split=[("Guests &amp; connectivity","The Wi-Fi, payments and check-in technology your guests experience, kept fast and reliable.",["Guest Wi-Fi at scale","Card &amp; contactless payments","Smart locks &amp; keyless entry","Starlink for rural sites"]),("Bookings &amp; data","The booking systems and records your business runs on, protected and always available.",["Booking &amp; channel-manager support","Microsoft 365 &amp; email","Verified backups","Priority seasonal support"])],
   steps_title="Reliable hospitality IT in three steps",
   step_items=[("We review","We look at your booking systems, Wi-Fi, payments and connectivity."),("We make it reliable","We sort the gaps &mdash; from guest Wi-Fi to rural Starlink &mdash; and secure your data."),("We support","Fast, priority help all year, especially through the busy season.")]),
 dict(slug="it-support-for-vets", crumb_name="IT Support for Veterinary Practices", accent="green",
   eyebrow="// FOR VETS", h1='IT support for <em class="grad grad--green">veterinary practices</em>',
   lede="Specialist IT support for veterinary practices across Dorset &mdash; keeping your practice-management software, digital imaging, networks and client records fast, secure and reliable, so you can focus on the animals.",
   intro_head="Reliable systems, so you can focus on care",
   intro_paras="<p>A vet practice runs on its technology &mdash; from the practice-management system at the front desk to digital X-rays and lab kit in the back. When it&rsquo;s slow or down, appointments back up and care is held up.</p><p><strong>We keep your clinical systems, networks and records reliable and secure</strong>, with priority help the moment something isn&rsquo;t right and protection for sensitive client and animal data.</p>",
   feats=["Practice-management software support","Digital imaging &amp; lab device networking","Whole-practice Wi-Fi","Client &amp; payment data security","Verified backups","Microsoft 365 &amp; email","Priority remote support","Multi-site practice support"],
   tile_items=[("heart","Clinical systems","The practice-management and clinical software your team relies on, kept reliable."),("server","Imaging &amp; lab kit","Digital X-ray, lab and diagnostic devices kept connected on a solid network."),("wifi","Whole-practice Wi-Fi","Reliable coverage for consult rooms, reception and the back office."),("lock","Data security","Encryption, MFA and protection for client, payment and animal records."),("shield","Backups","Verified backups so your records are never at risk."),("clock","Priority support","Fast remote help so a glitch doesn&rsquo;t hold up your day.")],
   faqs=[("Do you support veterinary practice-management software?","Yes &mdash; we keep the PCs, networks and connection your practice-management and clinical software run on fast and reliable. We support the common veterinary systems as the software you use, not as a partner or reseller."),("Can you network our digital imaging and lab equipment?","Yes &mdash; we set up reliable, secure networking so your digital X-ray, lab and diagnostic devices stay connected to your systems."),("Is our client data secure?","Yes &mdash; we protect sensitive client, payment and animal records with encryption, MFA, security monitoring and verified backups, supporting your data-protection obligations."),("How quickly can you help?","Subscribers get fast, priority remote support during opening hours (Mon&ndash;Fri, 9am&ndash;5pm), with on-site help across Dorset when it&rsquo;s needed.")],
   chips=["Clinical systems","Imaging &amp; lab kit","Secure records"],
   split_eyebrow="FOR YOUR PRACTICE", split_title="Built for veterinary practices",
   split=[("Clinical systems &amp; kit","The software, networks and devices your clinical team depends on, kept fast and connected.",["Practice-management software","Imaging &amp; lab device networking","Whole-practice Wi-Fi","Priority remote support"]),("Client data &amp; continuity","Sensitive records protected and backed up, so nothing is ever lost.",["Encryption &amp; MFA","Verified backups","Data-protection-friendly setup","Microsoft 365 &amp; email"])],
   steps_title="A reliable practice in three steps",
   step_items=[("We review","We assess your clinical systems, network, devices and data risks."),("We secure &amp; optimise","We make everything reliable and protect your records."),("We support","Priority help and maintenance so your day runs smoothly.")]),
 dict(slug="it-support-for-salons-beauty", crumb_name="IT Support for Salons & Beauty", accent="cyan",
   eyebrow="// FOR SALONS &amp; BEAUTY", h1='IT support for <em class="grad grad--cyan">salons, spas &amp; beauty</em>',
   lede="Friendly, jargon-free IT support for hair salons, spas, nail bars and beauty businesses across Dorset &mdash; keeping your booking software, card payments, client data and Wi-Fi working beautifully.",
   intro_head="Less faff, more time with clients",
   intro_paras="<p>Your salon runs on its booking system and card machine &mdash; when either plays up, it&rsquo;s lost appointments and awkward moments at the till. And technology shouldn&rsquo;t need a manual to use.</p><p><strong>We keep your booking software, payments, Wi-Fi and devices working smoothly</strong> and explain everything in plain English, so you can get back to looking after your clients.</p>",
   feats=["Salon booking &amp; client software","Card &amp; contactless payments","Client &amp; marketing data security","Reliable salon Wi-Fi","Device &amp; till setup","Verified backups","Email &amp; marketing tools","Friendly, jargon-free support"],
   tile_items=[("users","Booking software","The booking and client software you run on, kept reliable and online."),("bolt","Card payments","Reliable card and contactless payments at the till."),("wifi","Salon Wi-Fi","Fast, reliable Wi-Fi for your team and your clients."),("shield","Client data","We help protect your client and marketing data and keep it backed up."),("monitor","Devices &amp; tills","Tablets, tills and computers set up and kept working."),("heart","Friendly help","Plain-English support that never makes you feel daft.")],
   faqs=[("Do you support salon booking software?","Yes &mdash; we keep your booking and client-management software running reliably, including the devices, Wi-Fi and connection it relies on. We support the platforms you use as your software, not as a reseller."),("Can you sort our card payments?","Yes &mdash; we keep your card and contactless payments working and the network behind them secure."),("Is our client data safe?","We help you protect client and marketing data with sensible security and verified backups, so it stays private and recoverable."),("I&rsquo;m not techie &mdash; will you make it simple?","Absolutely &mdash; friendly, jargon-free help is what we&rsquo;re known for. There&rsquo;s no such thing as a silly question.")],
   chips=["Booking software","Card payments","Plain-English help"],
   split_eyebrow="FOR YOUR SALON", split_title="Built for salons &amp; beauty",
   split=[("Front desk &amp; bookings","The booking system, till and Wi-Fi your salon runs on, kept reliable.",["Booking &amp; client software","Card &amp; contactless payments","Reliable salon Wi-Fi","Device &amp; till setup"]),("Clients &amp; data","Your client and marketing data, protected and backed up.",["Client data protection","Verified backups","Email &amp; marketing tools","Friendly, jargon-free support"])],
   steps_title="A smoother salon in three steps",
   step_items=[("We set up","We get your booking system, payments, Wi-Fi and devices working properly."),("We protect","We secure your client data and keep it backed up."),("We support","Friendly help whenever something needs a hand.")]),
 dict(slug="it-support-for-financial-advisers", crumb_name="IT Support for Financial Advisers & IFAs", accent="green",
   eyebrow="// FOR FINANCIAL ADVISERS", h1='IT support for <em class="grad grad--green">financial advisers &amp; IFAs</em>',
   lede="IT support for financial advisers, IFAs and mortgage brokers across Bournemouth, Poole and Dorset &mdash; secure, confidential and reliable systems that support your record-keeping and data-protection obligations.",
   intro_head="Confidentiality and reliability, built in",
   intro_paras="<p>Advisers handle highly sensitive client and financial data under strict professional obligations. A breach or an outage isn&rsquo;t just disruptive &mdash; it&rsquo;s a regulatory and reputational risk.</p><p><strong>We keep your back-office systems secure, backed up and always available</strong>, with encryption, protected email and record-keeping-friendly IT that supports the standards your profession expects.</p>",
   feats=["Adviser CRM &amp; back-office support","Encrypted, secure email","Client data confidentiality","Record-keeping-friendly IT","MFA &amp; encryption","Verified backups","Microsoft 365 management","Secure remote working"],
   tile_items=[("briefcase","Back-office systems","The adviser CRM and back-office software you rely on, kept reliable."),("lock","Confidentiality","Encryption, access control and security for sensitive client data."),("mail","Secure email","Protected, professional email with strong phishing defence."),("server","Record-keeping","IT that supports your record-keeping and data-protection obligations."),("cloud","Microsoft 365","Outlook, Teams and shared files set up and managed."),("shield","Backups","Verified backups so client records are never at risk.")],
   faqs=[("Can you keep our client data confidential?","Yes &mdash; we use encryption, multi-factor authentication, access controls and monitoring to keep sensitive client and financial data confidential and protected."),("Do you support adviser CRM and back-office software?","Yes &mdash; we keep the adviser CRM and back-office software you rely on running reliably and securely, along with the systems around it."),("Does your IT support our FCA obligations?","We provide security, encryption, protected email and verified backups that support your FCA record-keeping and data-protection obligations. We don&rsquo;t make you compliant on our own &mdash; that&rsquo;s your responsibility &mdash; but we give you the secure, reliable IT foundation to meet it."),("Can your team work securely from anywhere?","Yes &mdash; secure remote access and Microsoft 365 so advisers can work confidentially from the office, home or on the move.")],
   chips=["Confidential &amp; secure","Adviser back-office","Record-keeping-friendly"],
   split_eyebrow="FOR YOUR FIRM", split_title="Built for financial advisers",
   split=[("Confidentiality &amp; compliance","Client and financial data protected to the standards your profession and the regulator expect.",["Encryption &amp; access control","Secure, protected email","Verified backups","Record-keeping-friendly IT"]),("Productivity","Reliable systems and secure remote working so advisers can focus on clients.",["Adviser CRM &amp; back-office","Microsoft 365 &amp; Teams","Secure remote access","Fast, priority support"])],
   steps_title="A secure firm in three steps",
   step_items=[("We review","We assess your systems, data and confidentiality risks."),("We secure","We lock down client data and harden your systems."),("We support","Ongoing protection, backups and priority help.")]),
 dict(slug="it-support-for-recruitment-agencies", crumb_name="IT Support for Recruitment Agencies", accent="cyan",
   eyebrow="// FOR RECRUITMENT AGENCIES", h1='IT support for <em class="grad grad--cyan">recruitment agencies</em>',
   lede="IT support for recruitment agencies across Bournemouth, Poole and Dorset &mdash; keeping your ATS, email, phones and candidate data fast, reliable and secure, so your consultants can keep placing.",
   intro_head="Keep placing &mdash; without IT getting in the way",
   intro_paras="<p>A recruitment desk lives and dies by its tools. If the ATS is down, email is slow or the phones drop, placements stall and candidates go elsewhere.</p><p><strong>We keep your recruitment systems, email, phones and candidate data fast, reliable and secure</strong>, with quick help when it matters and secure remote working for every desk.</p>",
   feats=["ATS &amp; recruitment CRM support","Reliable, secure email at volume","VoIP &amp; call handling","Candidate data security","Microsoft 365 management","Verified backups","Secure remote &amp; hybrid working","Fast priority support"],
   tile_items=[("briefcase","ATS &amp; CRM","The recruitment software your desks run on, kept fast and reliable."),("mail","High-volume email","Reliable, secure email that keeps up with a busy desk."),("bolt","VoIP &amp; calls","Crystal-clear business phones over broadband &mdash; see our VoIP page."),("shield","Candidate data","We help you protect candidate and client data and keep it backed up."),("cloud","Microsoft 365","Outlook, Teams and shared files set up and managed."),("clock","Fast support","Quick, priority help so a dead system never costs you a placement.")],
   faqs=[("Do you support recruitment ATS and CRM software?","Yes &mdash; we keep the applicant-tracking and CRM software your desks rely on running reliably, along with the email, phones and devices around it. We support the platforms you use as your software, not as a reseller."),("Can you handle high email and call volumes?","Yes &mdash; we keep email reliable at volume and set up <a href=\"/voip-business-phones/\">VoIP business phones</a> with call handling, routing and recording."),("Is candidate data protected?","We help you protect candidate and client data with sensible security, access controls and verified backups."),("Can consultants work securely from anywhere?","Yes &mdash; secure remote access and Microsoft 365 so every desk can work safely from the office or home.")],
   chips=["ATS &amp; CRM","VoIP phones","Secure candidate data"],
   split_eyebrow="FOR YOUR AGENCY", split_title="Built for recruitment",
   split=[("Place candidates faster","The systems, email and phones your consultants rely on, kept fast and reliable.",["ATS &amp; recruitment CRM","Reliable email at volume","VoIP &amp; call handling","Secure remote desks"]),("Protect your data","Candidate and client data, protected and backed up.",["Candidate data security","Verified backups","Microsoft 365 management","Fast, priority support"])],
   steps_title="A faster desk in three steps",
   step_items=[("We review","We look at your ATS, email, phones and where the bottlenecks are."),("We optimise &amp; secure","We make your systems fast and reliable and protect your data."),("We support","Priority help so your consultants keep placing.")]),
 dict(slug="it-support-for-garages-automotive", crumb_name="IT Support for Garages & Automotive", accent="green",
   eyebrow="// FOR GARAGES &amp; AUTOMOTIVE", h1='IT support for <em class="grad grad--green">garages &amp; automotive</em>',
   lede="Plain-English IT support for independent garages, MOT centres and bodyshops across Dorset &mdash; keeping your garage-management software, MOT connection, diagnostic PCs, networks and card payments reliable.",
   intro_head="Keep the workshop moving",
   intro_paras="<p>A garage runs on a mix of office PCs, a reliable internet connection for the MOT system, parts and diagnostic software, and a card machine at the desk. When the connection drops or a PC dies, the whole workshop slows down.</p><p><strong>We keep your computers, network and connection reliable</strong> and explain everything without the jargon, so you can stay focused on the cars.</p>",
   feats=["Garage-management software support","Reliable MOT connection","Diagnostic &amp; parts software PCs","Workshop &amp; reception networking","Card payment systems","Verified backups","Microsoft 365 &amp; email","Fast, plain-English support"],
   tile_items=[("wrench","Garage software","The garage-management and booking software you run on, kept reliable."),("globe","Reliable MOT connection","We keep the internet connection your MOT system depends on stable."),("monitor","Diagnostic PCs","The Windows PCs and connection your diagnostic and parts software run on."),("wifi","Workshop networking","Reliable network and Wi-Fi across the workshop and reception."),("bolt","Card payments","Reliable card and contactless payments at the desk."),("server","Backups","Verified backups so your records are never lost.")],
   faqs=[("Do you support garage-management software?","Yes &mdash; we keep the PCs, network and connection your garage-management, booking and parts software run on fast and reliable. We support the software you use, not as a reseller."),("Can you keep our MOT connection reliable?","We keep the internet connection and the PC your MOT system uses stable and reliable. We&rsquo;re not a DVSA-approved supplier of the testing system itself &mdash; we look after the computers and connection behind it."),("What about diagnostic and parts software?","We support the Windows PCs, networking and internet those tools run on. We don&rsquo;t service the specialist diagnostic testing equipment itself, but we keep everything around it working."),("Do you help with card payments?","Yes &mdash; we keep your card and contactless payments working and the network behind them secure.")],
   chips=["Garage software","Reliable MOT connection","Plain-English help"],
   split_eyebrow="FOR YOUR GARAGE", split_title="Built for garages &amp; automotive",
   split=[("Workshop &amp; MOT systems","The PCs, network and connection your workshop and MOT system depend on, kept reliable.",["Garage-management software","Reliable MOT connection","Diagnostic &amp; parts PCs","Workshop networking"]),("Admin &amp; data","The office side &mdash; email, payments and records &mdash; kept working and protected.",["Card &amp; contactless payments","Microsoft 365 &amp; email","Verified backups","Fast, friendly support"])],
   steps_title="A smoother workshop in three steps",
   step_items=[("We review","We look at your PCs, network, MOT connection and software."),("We make it reliable","We sort the weak spots and protect your data."),("We support","Fast, plain-English help whenever you need it.")]),
 dict(slug="it-support-for-gyms-fitness", crumb_name="IT Support for Gyms & Fitness", accent="cyan",
   eyebrow="// FOR GYMS &amp; FITNESS", h1='IT support for <em class="grad grad--cyan">gyms &amp; fitness studios</em>',
   lede="IT support for gyms, fitness studios and leisure centres across Dorset &mdash; keeping your membership and booking software, 24/7 door access, card payments and member data running reliably.",
   intro_head="Keep the doors open and the bookings flowing",
   intro_paras="<p>A modern gym runs on software around the clock &mdash; memberships, class bookings, door access and payments all need to just work, often when no staff are on site.</p><p><strong>We keep your member systems, access control, payments and Wi-Fi reliable and secure</strong>, with quick help when something needs attention and protection for member data.</p>",
   feats=["Membership &amp; booking software","24/7 door &amp; access control","Card &amp; recurring payments","Member data security","Reliable gym Wi-Fi","Verified backups","CCTV &amp; cameras","Fast, friendly support"],
   tile_items=[("users","Membership software","The membership and class-booking systems your gym runs on, kept reliable."),("lock","Access control","Keep 24/7 door entry and member access working, day and night."),("bolt","Payments","Reliable card and recurring membership payments."),("shield","Member data","We help protect member and payment data and keep it backed up."),("wifi","Gym Wi-Fi","Reliable Wi-Fi for members, staff and connected equipment."),("eye","CCTV &amp; cameras","Cameras and smart-building kit set up and supported &mdash; see our CCTV page.")],
   faqs=[("Do you support gym membership and booking software?","Yes &mdash; we keep the membership, class-booking and access software your gym relies on running reliably, along with the devices and connection behind it. We support the platforms you use, not as a reseller."),("Can you keep our 24/7 door access working?","Yes &mdash; we help keep door entry and access-control systems reliable, and the network they depend on stable, so members can get in around the clock."),("Is member data protected?","We help you protect member and payment data with sensible security, access controls and verified backups."),("Do you support CCTV and cameras?","Yes &mdash; we install and support <a href=\"/cctv-smart-home/\">CCTV and smart-building technology</a> alongside your IT.")],
   chips=["Membership software","24/7 access","Reliable payments"],
   split_eyebrow="FOR YOUR GYM", split_title="Built for gyms &amp; fitness",
   split=[("Members &amp; access","The booking, access and payment systems members rely on, kept reliable around the clock.",["Membership &amp; booking software","24/7 door &amp; access control","Card &amp; recurring payments","Reliable gym Wi-Fi"]),("Data &amp; security","Member data and your building, protected and backed up.",["Member data security","Verified backups","CCTV &amp; cameras","Fast, friendly support"])],
   steps_title="A smoother gym in three steps",
   step_items=[("We review","We look at your membership, access, payment and Wi-Fi systems."),("We make it reliable","We sort the weak spots and protect member data."),("We support","Quick help whenever something needs a hand, day or night where it matters.")]),
 dict(slug="it-support-for-ecommerce", crumb_name="IT Support for E-commerce & Online Retailers", accent="green",
   eyebrow="// FOR E-COMMERCE", h1='IT support for <em class="grad grad--green">e-commerce &amp; online retailers</em>',
   lede="IT support for online retailers and e-commerce businesses across Dorset &mdash; keeping your order, stock and payment systems, email and security fast and reliable, because every minute of downtime is lost sales.",
   intro_head="Because downtime means lost sales",
   intro_paras="<p>When you sell online, your business never closes &mdash; and neither can your systems. From order and stock management to secure payments and a flood of customer email, it all has to keep running.</p><p><strong>We keep the technology behind your shop reliable and secure</strong> &mdash; the computers, connection, email and accounts you run it on &mdash; with fast help and strong protection for customer data. For building or hosting the storefront itself, see our <a href=\"/web-design-hosting/\">web design &amp; hosting</a>.</p>",
   feats=["Order &amp; stock system support","Secure payment &amp; account protection","Reliable email at volume","Customer data security","Microsoft 365 &amp; cloud","Verified backups","Fast internet &amp; failover","Priority support"],
   tile_items=[("briefcase","Order &amp; stock systems","The back-office, order and inventory tools your shop runs on, kept reliable."),("lock","Secure payments &amp; accounts","Protection for the accounts and payments your business depends on."),("mail","High-volume email","Reliable, secure email that keeps up with customer enquiries."),("shield","Customer data","We help protect customer and order data and keep it backed up."),("globe","Internet &amp; failover","Fast, resilient connectivity &mdash; with backup internet so you stay selling."),("cloud","Microsoft 365 &amp; cloud","Email, files and tools set up and managed.")],
   faqs=[("Do you build or host online shops?","Building and hosting the storefront is covered by our <a href=\"/web-design-hosting/\">web design &amp; hosting</a> service. This page is about the IT behind your business &mdash; the computers, connection, email, accounts and security you run it on."),("Can you keep us online and selling?","We keep your systems, internet and email reliable, and can set up backup internet so a single outage doesn&rsquo;t stop your sales. See <a href=\"/starlink-internet/\">resilient connectivity</a>."),("Is our customer data protected?","We help you protect customer and order data with sensible security, MFA, access controls and verified backups."),("Can you help as we grow?","Yes &mdash; from a one-person operation to a busy team, we scale support, security and advice as your online business grows.")],
   chips=["Order &amp; stock systems","Secure payments","Always-on selling"],
   split_eyebrow="FOR YOUR SHOP", split_title="Built for online retailers",
   split=[("Keep selling","The systems, email and connectivity your online shop depends on, kept fast and resilient.",["Order &amp; stock system support","Reliable email at volume","Fast internet &amp; failover","Priority support"]),("Protect customers","Customer and payment data, protected and backed up.",["Secure payments &amp; accounts","Customer data security","Verified backups","Microsoft 365 &amp; cloud"])],
   steps_title="A more reliable shop in three steps",
   step_items=[("We review","We look at your order, payment, email and connectivity setup."),("We secure &amp; strengthen","We make it resilient and protect your customer data."),("We support","Priority help so a glitch never costs you sales.")]),
 dict(slug="it-support-for-property-management", crumb_name="IT Support for Property Management", accent="cyan",
   eyebrow="// FOR PROPERTY MANAGEMENT", h1='IT support for <em class="grad grad--cyan">property &amp; block management</em>',
   lede="IT support for property managers, managing agents and lettings teams across Dorset &mdash; keeping your management software, tenant and leaseholder data, email and remote working reliable and secure.",
   intro_head="Keep every property running smoothly",
   intro_paras="<p>Property and block management runs on records, communications and deadlines &mdash; tenancies, maintenance jobs, contractors, compliance dates and a constant flow of email. When systems falter, things get missed.</p><p><strong>We keep your management software, data and email reliable and secure</strong>, with protection for sensitive tenant and leaseholder information and support for working from anywhere.</p>",
   feats=["Property-management software support","Tenant &amp; leaseholder data security","Reliable, secure email","Document &amp; records management","Microsoft 365 &amp; Teams","Verified backups","Secure remote &amp; mobile working","Priority support"],
   tile_items=[("briefcase","Management software","The property and block-management software you run on, kept reliable."),("lock","Tenant &amp; leaseholder data","Encryption, access control and protection for sensitive records."),("mail","Secure email","Reliable, protected email for a busy inbox and audit trail."),("server","Records &amp; documents","Document management and verified backups so nothing is lost."),("cloud","Microsoft 365 &amp; Teams","Email, files and collaboration set up and managed."),("bolt","Work anywhere","Secure remote and mobile access for site visits and home working.")],
   faqs=[("Do you support property-management software?","Yes &mdash; we keep the property and block-management software your team relies on running reliably, along with the email, documents and devices around it. We support the platforms you use, not as a reseller."),("Is tenant and leaseholder data protected?","Yes &mdash; we help protect sensitive tenant and leaseholder data with encryption, access controls, MFA and verified backups, supporting your data-protection obligations."),("Can your team work from properties and home?","Yes &mdash; secure remote and mobile access so your team can work from the office, site visits or home."),("Can you help with email and document overload?","Yes &mdash; we set up <a href=\"/microsoft-365-support/\">Microsoft 365</a>, shared mailboxes and document management to keep communications organised and recoverable.")],
   chips=["Management software","Secure tenant data","Work anywhere"],
   split_eyebrow="FOR YOUR AGENCY", split_title="Built for property management",
   split=[("Systems &amp; communications","The management software, email and documents your team relies on, kept reliable.",["Property-management software","Reliable, secure email","Document &amp; records management","Microsoft 365 &amp; Teams"]),("Data &amp; access","Sensitive records protected, and secure access from anywhere.",["Tenant &amp; leaseholder data security","Verified backups","Secure remote &amp; mobile working","Priority support"])],
   steps_title="A safer agency in three steps",
   step_items=[("We review","We assess your software, data, email and remote-working needs."),("We secure &amp; organise","We protect your records and make your systems reliable."),("We support","Priority help and maintenance all year round.")]),
 dict(slug="it-support-for-manufacturing", crumb_name="IT Support for Manufacturing & Engineering", accent="green",
   eyebrow="// FOR MANUFACTURING", h1='IT support for <em class="grad grad--green">manufacturing &amp; engineering</em>',
   lede="IT support for manufacturers, engineering firms and workshops across Dorset &mdash; keeping your design software, stock and order systems, shop-floor networks and data reliable and secure.",
   intro_head="Keep design, production and orders moving",
   intro_paras="<p>From CAD workstations to stock control and the network linking the office to the shop floor, manufacturing depends on reliable, well-specified IT. Downtime here means stalled production and missed orders.</p><p><strong>We keep your design software, business systems and networks fast, reliable and secure</strong>, with the right hardware for demanding work and protection for your designs and data.</p>",
   feats=["CAD &amp; design workstation support","Stock, order &amp; ERP system support","Reliable office &amp; shop-floor networks","Design &amp; IP data security","High-performance workstations","Verified backups","Microsoft 365 &amp; email","Priority support"],
   tile_items=[("cpu","Design workstations","Powerful, reliable CAD and engineering PCs, specced and supported."),("briefcase","Business systems","The stock, order and ERP software your operation runs on, kept reliable."),("server","Networks","Reliable, secure networks linking your office and shop floor."),("shield","Design &amp; IP security","We help protect your designs, drawings and data and keep them backed up."),("cloud","Microsoft 365","Email, files and collaboration set up and managed."),("clock","Priority support","Fast help so a glitch never stalls production.")],
   faqs=[("Do you support CAD and engineering software?","Yes &mdash; we supply and support powerful <a href=\"/custom-pc-builds/\">workstations</a> and keep the CAD, design and engineering software they run reliable. We support the software you use, not as a reseller."),("Can you support our stock and order systems?","Yes &mdash; we keep the stock, order and ERP systems your operation depends on running reliably, along with the network and devices around them."),("Is our design data and IP protected?","We help protect your designs, drawings and intellectual property with sensible security, access controls and verified backups."),("Can you network the office and shop floor?","Yes &mdash; we design reliable, secure networks that link your office, workshop and shop floor.")],
   chips=["CAD workstations","Reliable networks","Protected designs"],
   split_eyebrow="FOR YOUR BUSINESS", split_title="Built for manufacturing &amp; engineering",
   split=[("Design &amp; production","The workstations, software and networks your operation depends on, kept fast and reliable.",["CAD &amp; design workstation support","Stock, order &amp; ERP systems","Office &amp; shop-floor networks","High-performance hardware"]),("Data &amp; continuity","Your designs and business data, protected and recoverable.",["Design &amp; IP data security","Verified backups","Microsoft 365 &amp; email","Priority support"])],
   steps_title="A more reliable operation in three steps",
   step_items=[("We review","We assess your workstations, software, networks and data risks."),("We optimise &amp; secure","We make everything fast and reliable and protect your designs."),("We support","Priority help and maintenance so production keeps moving.")]),
 dict(slug="it-support-for-churches-faith", crumb_name="IT Support for Churches & Faith Groups", accent="cyan",
   eyebrow="// FOR CHURCHES &amp; FAITH GROUPS", h1='IT support for <em class="grad grad--cyan">churches &amp; faith groups</em>',
   lede="Friendly, affordable IT support for churches, faith groups and community organisations across Dorset &mdash; keeping your AV and livestreaming, member data, email and giving systems running, often with volunteers.",
   intro_head="Technology that supports your community",
   intro_paras="<p>Churches and faith groups juggle a lot &mdash; sound and projection on a Sunday, livestreaming to those at home, member records, giving and a team that&rsquo;s often made up of volunteers.</p><p><strong>We keep your AV, livestreaming, member data and email working and secure</strong>, with patient, jargon-free help that volunteers can rely on &mdash; and charity-friendly support.</p>",
   feats=["AV &amp; projection support","Livestreaming setup &amp; help","Member &amp; giving data security","Reliable building Wi-Fi","Microsoft 365 (nonprofit)","Verified backups","Volunteer-friendly help","Affordable, charity-minded"],
   tile_items=[("monitor","AV &amp; projection","Sound, screens and projection kept working for services and events."),("globe","Livestreaming","Reliable streaming to those who can&rsquo;t be there in person."),("shield","Member &amp; giving data","We help protect member and giving records and keep them backed up."),("wifi","Building Wi-Fi","Reliable Wi-Fi across halls, offices and worship spaces."),("cloud","Microsoft 365","Email and shared files, with nonprofit licensing where eligible."),("heart","Volunteer-friendly","Patient, jargon-free help that anyone on the team can follow.")],
   faqs=[("Can you help with our AV and livestreaming?","Yes &mdash; we help keep sound, projection and livestreaming reliable for services and events, and the network and computers behind them stable."),("Is member and giving data protected?","We help you protect member and giving records with sensible security, access controls and verified backups."),("Do you offer charity or nonprofit pricing?","We&rsquo;re charity-minded and help you access nonprofit Microsoft 365 licensing where eligible &mdash; see our <a href=\"/it-support-for-charities/\">charity IT support</a>."),("Can you help our volunteers?","Absolutely &mdash; patient, jargon-free help is what we&rsquo;re known for, so volunteers can keep things running with confidence.")],
   chips=["AV &amp; livestreaming","Volunteer-friendly","Charity-minded"],
   split_eyebrow="FOR YOUR COMMUNITY", split_title="Built for churches &amp; faith groups",
   split=[("Services &amp; streaming","The AV, projection and livestreaming your gatherings rely on, kept working.",["AV &amp; projection support","Livestreaming setup &amp; help","Reliable building Wi-Fi","Volunteer-friendly help"]),("People &amp; data","Member and giving records protected, with charity-friendly tools.",["Member &amp; giving data security","Verified backups","Microsoft 365 (nonprofit)","Affordable, charity-minded support"])],
   steps_title="Reliable church IT in three steps",
   step_items=[("We review","We look at your AV, streaming, data and everyday systems."),("We set up &amp; secure","We make things reliable and protect your records."),("We support","Patient, friendly help your volunteers can count on.")]),
]
for i, c in enumerate(INDUSTRIES):
    make_customer(200 + i, **c)

# ===================================================== EXTRA SERVICE PAGES
EXTRA_SERVICES = [
 dict(slug="mobile-tablet-support", crumb_name="Mobile & Tablet Support", accent="green",
   eyebrow="// MOBILE &amp; TABLET", h1='Mobile &amp; <em class="grad grad--green">tablet support</em>',
   lede="Help with Android phones and tablets, Samsung and Windows devices — email setup, syncing, backups, security, app problems and getting your mobile devices working with everything else.",
   intro_head="Your phone and tablet, just working",
   intro_paras="<p>Our phones and tablets run our lives, but email that won&rsquo;t set up, photos that won&rsquo;t back up and apps that won&rsquo;t behave are everyday frustrations.</p><p><strong>We sort your Android and Windows mobile devices and keep them secure</strong> &mdash; synced, backed up and working with your computer, email and cloud.</p>",
   feats=["Android phone &amp; tablet help","Samsung device help","Email on your phone","Photo &amp; contact backup","App &amp; account problems","Security &amp; lost-device help","New phone setup","Syncing across devices"],
   tile_items=[("mail","Email setup","Get email working properly on your Android phone and tablet."),("cloud","Backup &amp; sync","Photos, contacts and files backed up and synced."),("lock","Security","Lock-screen, security and lost-device protection."),("monitor","New device setup","Move to a new Android phone or tablet with nothing lost."),("bolt","App problems","App, account and update issues sorted quickly."),("users","Family devices","Help for the whole household&rsquo;s Android phones and tablets.")],
   faqs=[("Which phones and tablets do you support?","We support Android phones and tablets, Samsung devices and Windows tablets. Please note we don&rsquo;t currently offer remote support for Apple iPhones or iPads."),("Can you set up email on my phone?","Yes &mdash; we set up and fix email on your Android phone or tablet, including Microsoft 365 and business email."),("Can you back up my photos and contacts?","Yes &mdash; we set up reliable photo, contact and file backup so nothing&rsquo;s ever lost."),("Can you set up my new phone?","Yes &mdash; we move everything across to your new Android phone or tablet and get it working.")],
   chips=["Android &amp; Samsung","Email &amp; backups","New device setup"],
   split_eyebrow="HOME &amp; BUSINESS", split_title="Mobile support for everyone",
   split=[("Personal devices","Your Android phone and tablet set up, synced, backed up and secure.",["Email &amp; accounts","Photo &amp; contact backup","Security &amp; lost-device help","New phone setup"]),("Work devices","Business Android and Windows devices working with Microsoft 365 and your tools.",["Microsoft 365 on mobile","Secure business email","Device security","Fast, priority support"])],
   steps_title="Mobile sorted in three steps",
   step_items=[("Tell us the issue","Tell us your device and what&rsquo;s not working."),("We fix it","We sort it remotely and set it up properly."),("We support","Ongoing help for all your Android &amp; Windows devices.")]),
 dict(slug="voip-business-phones", crumb_name="VoIP Business Phone Systems", accent="cyan",
   eyebrow="// BUSINESS PHONES &middot; VOIPFONE", h1='VoIP <em class="grad grad--cyan">business phone systems</em>',
   lede="Modern business phone systems powered by Voipfone — crystal-clear UK calls over the internet, lower bills, work-from-anywhere numbers and smart call handling, all set up and supported by your local team.",
   intro_head="Phones that move with your business",
   intro_paras="<p>The old phone network is being switched off by 2027, and traditional lines can&rsquo;t keep up with how businesses work now. VoIP runs your calls over the internet &mdash; cheaper, more flexible and far more capable.</p><p><strong>We set up and support business phone systems powered by Voipfone</strong> &mdash; a multi-award-winning, UK-based provider &mdash; so your team can take calls anywhere, on any device, while you keep your existing numbers and have one local point of contact.</p><p>A VoIP system is only as good as your internet, so we&rsquo;ll also make sure your <a href=\"/business-broadband-connectivity/\">business broadband &amp; connectivity</a> is up to the job.</p><p>Not sure what the 2027 switch-off means for the rest of your kit &mdash; card machines, alarms, lifts, door entry? See <a href=\"/pstn-switch-off-business/\">the PSTN switch-off for businesses</a>.</p>",
   feats=["Voipfone hosted phone systems","Keep &amp; port your numbers","Work-from-anywhere calls","Call routing, menus &amp; queues","Voicemail to email","Free softphone app","Virtual receptionist (Voipfone PA)","No contract, pay monthly"],
   tile_items=[("bolt","Crystal-clear UK calls","Reliable, high-quality calls over your internet connection on the Voipfone network."),("globe","Work anywhere","Take business calls at the office, home or on the move via the free softphone app."),("flow","Smart call routing","Menus, hunt groups, queues and flexible routing that fit how you work."),("mail","Voicemail &amp; recording","Voicemail to email, plus optional cloud call recording."),("user","Virtual receptionist","Voipfone PA answers and directs your calls so you never miss business."),("shield","Ready for 2027","Beat the BT landline switch-off with a future-proof system over broadband.")],
   faqs=[("Who provides the phone system?","We set up and support business phone systems on Voipfone &mdash; a multi-award-winning, UK-based VoIP provider &mdash; and look after it all for you, so you have one friendly, local point of contact."),("Can I keep my existing number?","Yes &mdash; in almost all cases we can port your existing numbers onto Voipfone."),("What about the 2027 landline switch-off?","Traditional phone lines are being switched off by 2027. Moving to a Voipfone VoIP system now keeps your numbers and future-proofs your phones over broadband."),("Is there a long contract?","No &mdash; Voipfone is pay-monthly with no long tie-in, and we handle all the setup and support.")],
   chips=["Powered by Voipfone","Keep your number","No contract"],
   split_eyebrow="FOR YOUR BUSINESS", split_title="A phone system that fits",
   split=[("Flexibility","Take and make business calls from anywhere, on any device, with one number &mdash; via the free Voipfone softphone app.",["Work-from-anywhere calls","Desk, desktop &amp; mobile apps","Keep your existing numbers","Easily add or remove users"]),("Capability","Smart call handling that makes a small business sound polished and professional.",["Call routing, menus &amp; queues","Voicemail to email &amp; recording","Virtual receptionist (Voipfone PA)","Setup &amp; ongoing support"])],
   steps_title="Better calls in three steps",
   step_items=[("We plan","We look at how you use phones and recommend the right Voipfone setup."),("We set up","We configure the system and port your existing numbers onto Voipfone."),("We support","Ongoing support as your business and team change &mdash; one local contact.")]),
 dict(slug="server-network-support", crumb_name="Server & Network Support", accent="green",
   eyebrow="// SERVERS &amp; NETWORKS", h1='Server &amp; <em class="grad grad--green">network support</em>',
   lede="Design, setup and support for business servers, NAS storage and networks — reliable, secure infrastructure with wired and wireless networking, shared files and the backbone your business runs on.",
   intro_head="The backbone, done right",
   intro_paras="<p>Servers, storage and networks are the invisible backbone of a business &mdash; and when they&rsquo;re badly set up, everything else suffers with slow files, dropouts and security gaps.</p><p><strong>We design, build and support reliable infrastructure</strong>, from a simple NAS to full server and network setups, monitored and maintained for you.</p><p>Moving premises? We also handle <a href=\"/office-moves-it-relocation/\">office moves &amp; IT relocation</a> &mdash; servers, network, phones and all.</p>",
   feats=["Server setup &amp; support","NAS &amp; shared storage","Wired &amp; wireless networks","Firewalls &amp; security","File sharing &amp; permissions","Monitoring &amp; maintenance","Backups &amp; recovery","Cloud or on-premise"],
   tile_items=[("server","Servers &amp; NAS","Set up, secured and maintained for reliable shared storage."),("flow","Networking","Wired and wireless networks designed to be fast and stable."),("shield","Firewalls &amp; security","Protect your network with proper firewalls and security."),("lock","File permissions","The right people access the right files, and no-one else."),("eye","Monitoring","We watch your infrastructure and fix issues before you notice."),("cloud","Cloud or on-prem","The right mix of cloud and on-site, designed around you.")],
   faqs=[("Do you support business servers?","Yes &mdash; we design, set up, secure and maintain servers and NAS storage for small and growing businesses."),("Can you sort out our network?","Yes &mdash; we design and support reliable wired and wireless networks, firewalls and secure file sharing."),("Cloud or on-premise &mdash; which is right for us?","It depends on your needs; we&rsquo;ll advise honestly and often a sensible mix works best."),("Do you monitor and maintain it?","Yes &mdash; on a plan we monitor your infrastructure and handle maintenance, updates and backups."),("Our server has crashed &mdash; can you help urgently?","Yes &mdash; see our <a href=\"/server-down-emergency-support/\">emergency server support</a> for a downed or crashed server, and if <a href=\"/quickbooks-sage-running-slow/\">QuickBooks or Sage is running slow over the network</a> we fix that too.")],
   chips=["Servers &amp; NAS","Networks &amp; firewalls","Monitored"],
   split_eyebrow="FOR YOUR BUSINESS", split_title="Infrastructure you can rely on",
   split=[("Storage &amp; servers","Reliable, secure servers and shared storage, set up and maintained for you.",["Server setup &amp; support","NAS &amp; shared storage","File sharing &amp; permissions","Backups &amp; recovery"]),("Networks &amp; security","Fast, stable networks protected by proper firewalls and monitoring.",["Wired &amp; wireless networks","Firewalls &amp; security","Monitoring &amp; maintenance","Cloud or on-premise"])],
   steps_title="Solid infrastructure in three steps",
   step_items=[("We assess","We review your servers, storage, network and needs."),("We design &amp; build","We set up reliable, secure infrastructure around you."),("We maintain","We monitor, maintain and support it on an ongoing basis.")]),
 dict(slug="cctv-smart-home", crumb_name="CCTV & Smart Home", accent="cyan",
   eyebrow="// CCTV &amp; SMART HOME", h1='CCTV &amp; <em class="grad grad--cyan">smart home</em>',
   lede="Smart security and smart living — CCTV cameras, video doorbells, smart lighting, heating and home automation, set up properly, secured against hackers and working reliably together.",
   intro_head="Smart tech that actually works together",
   intro_paras="<p>Smart cameras, doorbells, lights and heating are brilliant &mdash; when they&rsquo;re set up properly, connected reliably and secured against prying eyes. Done badly, they&rsquo;re a frustration and a security risk.</p><p><strong>We design, install and secure your smart home and CCTV</strong>, so it all works together and keeps you safe.</p><p>Cameras gone offline after switching broadband provider? See <a href=\"/cctv-not-working-after-changing-broadband/\">CCTV not working after changing broadband</a>.</p>",
   feats=["CCTV camera systems","Video doorbells","Smart lighting &amp; heating","Home automation","Secure smart devices","Reliable Wi-Fi coverage","View from anywhere","Setup &amp; support"],
   tile_items=[("eye","CCTV cameras","Camera systems set up for clear, reliable coverage."),("home","Video doorbells","See and speak to callers from anywhere."),("bolt","Smart lighting &amp; heating","Lights and heating that work on schedule and on command."),("flow","Home automation","Devices that work together, not against each other."),("shield","Secured","Smart devices locked down against hackers."),("wifi","Reliable Wi-Fi","The strong, stable Wi-Fi smart devices depend on.")],
   faqs=[("Do you install CCTV?","Yes &mdash; we set up CCTV cameras and video doorbells for homes and businesses, viewable from anywhere."),("Can you make my smart devices work together?","Yes &mdash; we connect and configure smart lighting, heating, cameras and more so they work as one."),("Are smart devices secure?","They can be a risk if set up poorly &mdash; we secure your smart devices and network against hackers."),("Will my Wi-Fi cope?","We make sure you have the reliable Wi-Fi coverage smart devices and cameras need.")],
   chips=["CCTV &amp; doorbells","Smart home","Secured"],
   split_eyebrow="HOME &amp; BUSINESS", split_title="Smart and secure",
   split=[("Smart security","CCTV, doorbells and alarms set up for peace of mind, viewable from anywhere.",["CCTV camera systems","Video doorbells","View from anywhere","Secure setup"]),("Smart living","Lighting, heating and automation that work together and just work.",["Smart lighting &amp; heating","Home automation","Reliable Wi-Fi coverage","Setup &amp; support"])],
   steps_title="A smarter home in three steps",
   step_items=[("We plan","We look at what you want to achieve and your space."),("We install &amp; secure","We set it all up and lock it down against hackers."),("We support","Ongoing help so it keeps working together.")]),
 dict(slug="cloud-migration", crumb_name="Cloud Migration", accent="green",
   eyebrow="// CLOUD MIGRATION", h1='Cloud <em class="grad grad--green">migration</em>',
   lede="Move to the cloud the right way — email, files and systems migrated to Microsoft 365 and the cloud with no downtime and nothing lost, so your business is more flexible, secure and resilient.",
   intro_head="Into the cloud, smoothly",
   intro_paras="<p>Moving to the cloud unlocks flexible working, better security and resilience &mdash; but a botched migration means lost files, downtime and frustration.</p><p><strong>We plan and run your migration properly</strong>, moving email, files and systems to the cloud with no downtime and nothing left behind.</p><p>Want your whole desktop in the cloud too? See <a href=\"/cloud-hosted-desktops/\">cloud &amp; hosted desktops</a> for secure work-from-anywhere.</p>",
   feats=["Microsoft 365 migration","Email &amp; mailbox moves","File &amp; SharePoint migration","Old server to cloud","No-downtime planning","Data integrity checks","Staff setup &amp; training","Ongoing cloud support"],
   tile_items=[("cloud","Microsoft 365","Move email, files and apps to Microsoft 365 cleanly."),("mail","Email migration","Mailboxes, contacts and calendars moved with nothing lost."),("server","Files &amp; servers","Shift shared files and old servers to secure cloud storage."),("shield","Secure by design","Migrate with security, MFA and backups built in."),("clock","No downtime","Planned, often overnight, so work isn&rsquo;t disrupted."),("users","Staff ready","Devices set up and your team shown the ropes.")],
   faqs=[("What does cloud migration involve?","We plan the move, then migrate your email, files and systems to the cloud &mdash; usually with no downtime and nothing lost."),("Will we lose any data?","No &mdash; we run integrity checks before and after, so everything transfers safely."),("Can you move us off an old server?","Yes &mdash; we move shared files and systems from ageing on-site servers to secure cloud storage."),("Will it disrupt our work?","We plan migrations carefully, often overnight, to keep disruption to an absolute minimum.")],
   chips=["Microsoft 365","No downtime","Nothing lost"],
   split_eyebrow="FOR YOUR BUSINESS", split_title="A migration done properly",
   split=[("Planned &amp; safe","A carefully planned move with data checks, so nothing is lost and work isn&rsquo;t disrupted.",["No-downtime planning","Data integrity checks","Email &amp; file migration","Old server to cloud"]),("Ready to work","Devices, security and your team set up so you&rsquo;re productive from day one.",["Staff setup &amp; training","Security &amp; MFA","Backups built in","Ongoing cloud support"])],
   steps_title="To the cloud in three steps",
   step_items=[("We plan","We map what to move and how, around your business."),("We migrate","We move everything cleanly, usually overnight."),("We support","We set up your team and support the cloud ongoing.")]),
 dict(slug="google-workspace-support", crumb_name="Google Workspace Support", accent="cyan",
   eyebrow="// GOOGLE WORKSPACE", h1='Google Workspace <em class="grad grad--cyan">support</em>',
   lede="Setup, migration and support for Google Workspace — Gmail, Drive, Docs, Meet and more, set up properly, secured and working smoothly for your home or business.",
   intro_head="Google Workspace, handled",
   intro_paras="<p>Google Workspace is powerful and popular &mdash; but it still needs setting up properly, securing and supporting day to day.</p><p><strong>We manage Google Workspace for you</strong>, from Gmail and Drive to security and migration, and make it work alongside everything else you use.</p>",
   feats=["Gmail &amp; business email","Drive &amp; shared files","Docs, Sheets &amp; Meet","Account &amp; user setup","Security &amp; 2-step","Migration to or from Google","Backups for Workspace","Friendly support"],
   tile_items=[("mail","Gmail","Business email set up, secured and supported."),("cloud","Drive &amp; files","Drive and shared storage configured with the right access."),("users","Users &amp; accounts","User setup, onboarding and leaver checks."),("lock","Security","2-step verification and security best practice."),("server","Migration","Move to or from Google Workspace with nothing lost."),("shield","Backups","Workspace backed up &mdash; because Google doesn&rsquo;t do it for you.")],
   faqs=[("Do you support Google Workspace?","Yes &mdash; we set up, secure, migrate and support Gmail, Drive, Docs, Meet and the whole Google Workspace suite."),("Can you move us between Google and Microsoft 365?","Yes &mdash; we migrate in either direction, moving email, contacts, calendars and files with nothing lost."),("Can you secure our Google accounts?","Yes &mdash; we set up 2-step verification, access controls and security best practice."),("Does Google Workspace need backing up?","Yes &mdash; like Microsoft 365, Google doesn&rsquo;t fully back up your data, so we set up proper backups.")],
   chips=["Gmail &amp; Drive","Secure &amp; backed up","Migration"],
   split_eyebrow="HOME &amp; BUSINESS", split_title="Workspace, set up right",
   split=[("Set up &amp; secure","Gmail, Drive and accounts configured properly and protected.",["Gmail &amp; business email","Drive &amp; shared files","Users &amp; access","2-step security"]),("Move &amp; protect","Migrate cleanly and keep your Workspace data safely backed up.",["Migration to or from Google","Workspace backups","Friendly support","Works with your other tools"])],
   steps_title="Workspace sorted in three steps",
   step_items=[("We review","We look at your setup and what you need."),("We set up &amp; secure","We configure, secure and (if needed) migrate."),("We support","Friendly, ongoing Google Workspace support.")]),
 dict(slug="cyber-essentials", crumb_name="Cyber Essentials Help", accent="green",
   eyebrow="// CYBER ESSENTIALS", h1='Cyber Essentials <em class="grad grad--green">certification help</em>',
   lede="Get Cyber Essentials certified with friendly, practical help — we guide you through the requirements, get your systems up to standard, and support your certification so you can win work and prove you take security seriously.",
   intro_head="Certified, without the headache",
   intro_paras="<p>Cyber Essentials is the UK government-backed scheme that shows your business has the essential security controls in place &mdash; and it&rsquo;s increasingly required to win contracts.</p><p><strong>We make certification straightforward</strong>, getting your systems up to standard and guiding you through the requirements in plain English.</p><p>We support both the self-assessed <strong>Cyber Essentials</strong> and the independently-audited <strong>Cyber Essentials Plus</strong> &mdash; we&rsquo;ll advise which level you need and get you ready for the assessment.</p>",
   feats=["Cyber Essentials guidance","Cyber Essentials Plus support","Readiness assessment","Get systems up to standard","Firewalls &amp; secure config","Access control &amp; MFA","Patching &amp; malware protection","Help with the questionnaire","Ongoing compliance"],
   tile_items=[("shield","Readiness check","We assess where you stand against the requirements."),("lock","Secure configuration","Firewalls, devices and access controls brought up to standard."),("bolt","Patching","Systems kept updated to meet the malware and patching controls."),("check","The questionnaire","We help you complete the self-assessment with confidence."),("eye","Ongoing compliance","Stay certified year after year with our support."),("briefcase","Win more work","Prove your security and meet contract requirements.")],
   faqs=[("What is Cyber Essentials?","It&rsquo;s a UK government-backed certification showing your business has essential cyber-security controls in place &mdash; often required to win contracts."),("What&rsquo;s the difference between Cyber Essentials and Cyber Essentials Plus?","Cyber Essentials is a self-assessment you complete and we help verify; Cyber Essentials Plus adds an independent, hands-on technical audit of your systems. Plus carries more weight for larger contracts &mdash; we&rsquo;ll advise which you need and get you ready for either."),("Can you help us get certified?","Yes &mdash; we assess your readiness, get your systems up to standard and guide you through the certification."),("How long does it take?","It varies, but with the right controls in place certification can often be achieved quite quickly &mdash; we&rsquo;ll give you a realistic timeline."),("Can you keep us compliant?","Yes &mdash; we support ongoing compliance so you can recertify each year with confidence."),("Do you help Dorset businesses get Cyber Essentials certified?","Yes &mdash; we guide businesses across Dorset, Bournemouth and Poole through Cyber Essentials certification from start to finish, in plain English."),("Who needs Cyber Essentials?","Any business that wants to prove its security &mdash; it&rsquo;s frequently required for government, NHS and larger contracts, asked for by cyber-insurers, and increasingly expected by customers. We&rsquo;ll tell you honestly if it&rsquo;s worth it for you.")],
   chips=["Government-backed","Win more work","Guided process"],
   split_eyebrow="FOR YOUR BUSINESS", split_title="Certification, made simple",
   split=[("Get ready","We bring your systems up to the Cyber Essentials standard, the practical way.",["Readiness assessment","Secure configuration","Access control &amp; MFA","Patching &amp; malware protection"]),("Get certified","We guide you through the questionnaire and keep you compliant year on year.",["Help with the questionnaire","Plain-English guidance","Ongoing compliance","Recertification support"])],
   steps_title="Certified in three steps",
   step_items=[("We assess","We check your systems against the requirements."),("We get you ready","We fix the gaps and get you up to standard."),("We certify &amp; support","We guide you through certification and keep you compliant.")]),
 # ai-training dict REMOVED 2026-08-10: /ai-training/ 301s to /ai/training/
 # (.htaccess). Two live self-canonical pages for one intent split link equity
 # (2026-08-10 competitor audit). The /ai/ estate page is the survivor.
 dict(slug="custom-pc-builds", crumb_name="Custom-Built PCs", accent="cyan",
   eyebrow="// CUSTOM PC BUILDS", h1='Custom-built <em class="grad grad--cyan">PCs</em>',
   lede="Bespoke desktop PCs built around exactly what you need — home, office, gaming, creative or workstation — expertly specced, assembled, tested and fully set up by your local team.",
   intro_head="The right PC, built for you",
   intro_paras="<p>Off-the-shelf computers are a compromise &mdash; you pay for things you don&rsquo;t need and miss the things you do. A custom build is specced around exactly how you&rsquo;ll use it.</p><p><strong>We design, build, test and set up bespoke PCs</strong> with quality, named components &mdash; then support them, so you get the perfect machine and someone to call if you ever need to.</p>",
   feats=["Built to your needs &amp; budget","Quality, named components","Gaming &amp; streaming rigs","Creative &amp; workstation PCs","Office &amp; everyday desktops","Fully set up &amp; stress-tested","Data transferred from your old PC","Warranty, upgrades &amp; support"],
   tile_items=[("monitor","Built to spec","Designed around exactly how you&rsquo;ll use it &mdash; no compromises."),("bolt","Gaming &amp; performance","High-performance rigs for gaming, streaming and creative work."),("briefcase","Workstations","Powerful, reliable machines for demanding business workloads."),("server","Quality components","Named, reliable parts chosen for performance and longevity."),("shield","Set up &amp; secured","Windows, drivers, security and your software, ready to go."),("wrench","Upgrades &amp; support","Future upgrades and ongoing support whenever you need them.")],
   faqs=[("Can you build a PC for gaming?","Yes &mdash; we build gaming and streaming rigs specced to the games and performance you want, within your budget."),("Do you use good-quality parts?","Always &mdash; we use named, reliable components chosen for performance and longevity, and we tell you exactly what&rsquo;s inside."),("Will it come set up and ready?","Yes &mdash; we install Windows, drivers, security and your software, transfer your data, and stress-test it before you get it."),("Do you offer a warranty?","Yes &mdash; your build is covered by warranty and we&rsquo;re here for upgrades and support down the line.")],
   chips=["Built to spec","Quality components","Set up &amp; supported"],
   split_eyebrow="HOME &amp; BUSINESS", split_title="A build for every need",
   split=[("Home &amp; gaming","From a family desktop to a serious gaming or streaming rig &mdash; built around what you love to do.",["Gaming &amp; streaming rigs","Family &amp; everyday desktops","Quiet, tidy builds","Set up &amp; ready to play"]),("Business &amp; creative","Reliable workstations for demanding business and creative workloads, built to last.",["Creative &amp; CAD workstations","Business desktops","Reliable, named components","Warranty &amp; support"])],
   steps_title="Your perfect PC in three steps",
   step_items=[("We spec it","Tell us how you&rsquo;ll use it and your budget &mdash; we design the ideal build."),("We build &amp; test","We assemble it with quality parts, install everything and stress-test it."),("We set you up","We transfer your data, deliver it ready to go, and support it ongoing.")]),
 dict(slug="preventative-maintenance", crumb_name="Preventative Maintenance", accent="green",
   eyebrow="// PREVENTATIVE MAINTENANCE", h1='Preventative <em class="grad grad--green">maintenance</em> &amp; 6-weekly service',
   lede="Stop problems before they start. Every monthly plan includes a full computer service every six weeks &mdash; a proper tune-up, software and driver updates, security checks and a verified backup &mdash; quietly keeping your tech fast, safe and reliable.",
   intro_head="Like a regular service for your car &mdash; but for your computers",
   intro_paras="<p>Computers rarely fail out of nowhere. They slow down, fall behind on updates, fill with clutter and quietly drift out of date &mdash; until something breaks at the worst possible moment.</p><p><strong>Our preventative maintenance fixes that before it happens.</strong> Every six weeks we give your computers a full service &mdash; a performance tune-up, all your software and drivers updated, security checked and your backups verified &mdash; so problems are caught and cleared before you ever notice them. It&rsquo;s included in every monthly plan, done remotely, with nothing for you to do.</p>",
   feats=["Full service every 6 weeks","Performance tune-up &amp; clean-up","Windows &amp; software updates","Device driver updates","Antivirus &amp; security checks","Backup checked &amp; verified","Optional text reminder when a backup&rsquo;s due","Disk health &amp; error checks","Done remotely &mdash; no fuss"],
   tile_items=[("wrench","Full 6-weekly service","A complete health check and service of your computer every six weeks &mdash; built into your plan."),("bolt","Performance tune-up","We clear out clutter, trim start-up programs and tune your machine so it stays fast and responsive."),("windows","Software updates","Windows and your apps kept patched and up to date &mdash; closing security holes and fixing bugs."),("cpu","Driver updates","Graphics, printer, Wi-Fi and other drivers kept current so everything runs smoothly and reliably."),("shield","Security checks","Antivirus, protection and key security settings checked at every visit to keep you safe."),("cloud","Backup verified","We check your backups are actually running and your data can be restored &mdash; not just assumed.")],
   faqs=[("What is preventative maintenance?","It&rsquo;s regular, proactive care for your computers &mdash; servicing, tune-ups, software and driver updates, security and backup checks done on a schedule, so problems are prevented rather than fixed after they cause trouble."),("How often do you service my computer?","Every six weeks. Each full service includes a performance tune-up, software and driver updates, security checks and a backup check &mdash; all included in your monthly plan."),("Do I need to do anything?","No &mdash; it&rsquo;s done remotely in the background. We keep your computers fast, updated, secure and backed up so you don&rsquo;t have to think about it."),("Does it cover home and business?","Yes &mdash; preventative maintenance is part of every home and business monthly plan, scaled to the number of devices and users you have."),("Why not just fix things when they break?","Because that&rsquo;s slower, more stressful and usually more expensive. Catching a failing drive, a missed update or a stalled backup early prevents data loss and costly emergencies."),("Do you connect without telling me?","No &mdash; before each six-weekly remote service we phone you first to say we&rsquo;re ready and check you&rsquo;re ready. We never connect out of the blue, and the whole service is done remotely with nothing for you to do."),("Will I deal with the same people each time?","Yes &mdash; because we&rsquo;re a family team, you get to know us and we get to know you. We remember how you like your computer set up, which makes each six-weekly service quicker, easier and more personal.")],
   chips=["Every 6 weeks","Included in your plan","Done remotely"],
   split_eyebrow="WHAT EVERY SERVICE INCLUDES", split_title="A proper service, every six weeks",
   split=[("Faster &amp; cleaner","We keep your machine running like new with a regular tune-up and clean-up.",["Performance tune-up","Clutter &amp; temp-file clean-up","Start-up &amp; speed optimisation","Disk health &amp; error checks"]),("Updated &amp; protected","We keep everything current and safe &mdash; and make sure your data is recoverable.",["Windows &amp; software updates","Device driver updates","Antivirus &amp; security checks","Backups checked &amp; verified","Optional text reminders for backups"])],
   steps_title="How preventative maintenance works",
   step_items=[("You join a plan","Pick a home or business monthly plan &mdash; preventative maintenance is built in."),("We call, then service every 6 weeks","Before each service we phone to check you&rsquo;re ready, then remotely tune up, update, secure and check the backups on your computers."),("You enjoy reliable tech","Problems are prevented before they start &mdash; nothing for you to remember or do.")]),
]
for i, c in enumerate(EXTRA_SERVICES):
    make_customer(300 + i, **c)

if __name__ == "__main__":
    w = write_all()
    print("Wrote %d pages total (incl. originals):" % len(w))
    for x in w:
        print("  " + x)
