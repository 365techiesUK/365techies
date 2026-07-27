# -*- coding: utf-8 -*-
"""
The ageing-access-point cluster: /business-access-point-end-of-life/ + spokes.

WHY THIS EXISTS: a business whose 2016 access points have started misbehaving currently
finds vendor EOL PDFs, forum threads and resellers who all want to sell a replacement.
Nobody neutral tells them when NOT to replace. That gap is the whole strategy.

THE THREE LABELS ARE THE CLUSTER'S SIGNATURE. Every factual claim is visually tagged as
one of:
    ap_fact()      Vendor datasheet   - from the vendor's own published spec
    ap_advisory()  Vendor advisory    - a security bulletin or field notice
    ap_field()     Commonly reported  - forum/field consensus, NOT vendor-confirmed
Never blur them. The moment a field report is dressed as a datasheet fact, the cluster is
worth less than the reseller content it is meant to beat.

Data lives in ap_lifecycle_data.py. Anything unverified renders "Check with vendor".
"""
import build_pages as bp
import ap_lifecycle_data as D

SITE = bp.SITE
_LINK = '<a href="%s" target="_blank" rel="noopener">%s</a>'


# ---------------------------------------------------------------------------
# The label taxonomy
# ---------------------------------------------------------------------------
def ap_fact(html, src=None):
    s = ''
    if src and src in D.SOURCES:
        nm, url = D.SOURCES[src]
        s = ' <span class="apcall__src">' + (_LINK % (url, nm)) + '</span>'
    return ('<div class="apcall apcall--fact"><span class="apcall__tag">Vendor datasheet</span>'
            '<div class="apcall__body">' + html + s + '</div></div>')


def ap_advisory(html, src_name=None, src_url=None):
    s = ''
    if src_name and src_url:
        s = ' <span class="apcall__src">' + (_LINK % (src_url, src_name)) + '</span>'
    return ('<div class="apcall apcall--adv"><span class="apcall__tag">Vendor advisory</span>'
            '<div class="apcall__body">' + html + s + '</div></div>')


def ap_field(html):
    return ('<div class="apcall apcall--field"><span class="apcall__tag">Commonly reported '
            '&mdash; not vendor-confirmed</span><div class="apcall__body">' + html + '</div></div>')


def _cell(v, cls=""):
    """CHECK never renders blank and never renders a guess."""
    if v == D.CHECK or v is None or v == "":
        return '<td class="apt__check"><span class="apt__pill">Check with vendor</span></td>'
    return '<td%s>%s</td>' % ((' class="%s"' % cls) if cls else '', v)


def _uk(d):
    if not d or d == D.CHECK:
        return D.CHECK
    y, m, dd = d.split("-")
    return "%s/%s/%s" % (dd, m, y)


def disclaimer_block():
    return ('<div class="apdisc" role="note"><p><strong>Independent, and dated.</strong> '
            + D.DISCLAIMER + '</p></div>')


def dates_stamp():
    return ('<p class="apstamp"><strong>Dates checked: ' + D.DATES_CHECKED_HUMAN
            + '.</strong> Vendors move these. If you are making a decision on a date below, '
            'open the vendor link in the source column and check it yourself &mdash; then '
            'tell us if it has moved and we will correct this page.</p>')


# ---------------------------------------------------------------------------
# Table A - lifecycle
# ---------------------------------------------------------------------------
def table_lifecycle(vendor=None):
    rows = [m for m in D.AP_MODELS if (vendor is None or m["vendor"] == vendor)]
    h = ['<div class="aptwrap"><table class="apt"><caption class="apt__cap">'
         'Access-point lifecycle &mdash; end of sale, end of support and the last software '
         'release each model will ever run. Checked ' + D.DATES_CHECKED_HUMAN + '.</caption>'
         '<thead><tr><th scope="col">Model</th><th scope="col">Generation</th>'
         '<th scope="col">End of sale</th><th scope="col">End of support</th>'
         '<th scope="col">Status today</th><th scope="col">Last supported software</th>'
         '<th scope="col">Vendor&rsquo;s replacement</th></tr></thead><tbody>']
    for m in rows:
        st, lbl = D.state_of(m["eos_support"])
        h.append('<tr class="apt__r apt__r--' + st + '">')
        h.append('<th scope="row">' + m["vendor"] + ' ' + m["model"] + '</th>')
        h.append(_cell(m["wifi_gen"]))
        h.append(_cell(_uk(m["eos_sale"]) if m["eos_sale"] else "&mdash;"))
        h.append(_cell(_uk(m["eos_support"]) if m["eos_support"] else "Not announced"))
        h.append('<td><span class="apbadge apbadge--' + st + '">' + lbl + '</span></td>')
        h.append(_cell(m.get("last_sw") or "&mdash;"))
        h.append(_cell(m.get("replacement") or "&mdash;"))
        h.append('</tr>')
    h.append('</tbody></table></div>')
    nm, url = D.SOURCES["ruckus_eol"]
    cnm, curl = D.SOURCES["cisco_eol"]
    h.append('<p class="apsrc">Sources: ' + (_LINK % (url, nm)) + ' &middot; '
             + (_LINK % (curl, cnm)) + '. We link the vendor, never a reseller or an '
             'end-of-life aggregator.</p>')
    return "".join(h)


# ---------------------------------------------------------------------------
# Table B - specs, with the PoE column that actually matters
# ---------------------------------------------------------------------------
def table_specs(vendor=None):
    rows = [m for m in D.AP_MODELS if (vendor is None or m["vendor"] == vendor)]
    h = ['<div class="aptwrap"><table class="apt"><caption class="apt__cap">'
         'Specifications, and what quietly stops working on underpowered PoE.</caption>'
         '<thead><tr><th scope="col">Model</th><th scope="col">Streams</th>'
         '<th scope="col">Headline rate <span class="apt__note">(theoretical)</span></th>'
         '<th scope="col">Ports</th><th scope="col">PoE for full function</th>'
         '<th scope="col">What you lose on 802.3af</th><th scope="col">WPA3</th></tr></thead><tbody>']
    for m in rows:
        h.append('<tr><th scope="row">' + m["vendor"] + ' ' + m["model"] + '</th>')
        h.append(_cell(m["streams"]))
        h.append(_cell(m["phy"]))
        h.append(_cell(m["ports"]))
        h.append(_cell(m["poe"]))
        h.append(_cell(m.get("poe_af") or "&mdash;"))
        w = m["wpa3"]
        if w == "yes":
            wc = '<td><span class="apbadge apbadge--ok">Yes</span>' + (
                '<br /><small>' + m["wpa3_note"] + '</small>' if m.get("wpa3_note") else '') + '</td>'
        elif w == "no":
            wc = '<td><span class="apbadge apbadge--expired">No</span>' + (
                '<br /><small>' + m["wpa3_note"] + '</small>' if m.get("wpa3_note") else '') + '</td>'
        else:
            wc = _cell(D.CHECK)
        h.append(wc + '</tr>')
    h.append('</tbody></table></div>')
    h.append('<p class="apsrc">' + D.PHY_CAVEAT + '</p>')
    return "".join(h)


def table_meraki():
    h = ['<div class="aptwrap"><table class="apt"><caption class="apt__cap">'
         'Cisco Meraki Wi-Fi 5 access points &mdash; end-of-support dates, from Meraki&rsquo;s '
         'own published table.</caption><thead><tr><th scope="col">Model</th>'
         '<th scope="col">End of sale</th><th scope="col">End of support</th>'
         '<th scope="col">Status today</th></tr></thead><tbody>']
    for model, sale, sup in D.MERAKI_WIFI5_EOL:
        st, lbl = D.state_of(sup)
        h.append('<tr><th scope="row">Meraki ' + model + '</th><td>' + _uk(sale) + '</td><td>'
                 + _uk(sup) + '</td><td><span class="apbadge apbadge--' + st + '">' + lbl
                 + '</span></td></tr>')
    h.append('</tbody></table></div>')
    nm, url = D.SOURCES["meraki_eol"]
    h.append('<p class="apsrc">Source: ' + (_LINK % (url, nm)) + '</p>')
    return "".join(h)


def table_patch_floors():
    h = ['<div class="aptwrap"><table class="apt"><caption class="apt__cap">'
         'The &ldquo;am I patched?&rdquo; test. Below these builds you are exposed to '
         'CVE-2025-46120.</caption><thead><tr><th scope="col">Software</th>'
         '<th scope="col">Fixed build</th><th scope="col">Notes</th></tr></thead><tbody>']
    for sw, build, note in D.PATCH_FLOORS:
        h.append('<tr><th scope="row">' + sw + '</th><td class="mono"><strong>' + build
                 + '</strong></td><td>' + note + '</td></tr>')
    h.append('</tbody></table></div>')
    return "".join(h)


def milestone_glossary():
    h = ['<div class="aptwrap"><table class="apt"><caption class="apt__cap">'
         'The same word means different things to different vendors. This is where most '
         'costly misunderstandings start.</caption><thead><tr><th scope="col">Vendor</th>'
         '<th scope="col">Milestone</th><th scope="col">What it actually means</th>'
         '</tr></thead><tbody>']
    for vendor, name, meaning in D.MILESTONES:
        h.append('<tr><th scope="row">' + vendor + '</th><td><strong>' + name
                 + '</strong></td><td>' + meaning + '</td></tr>')
    h.append('</tbody></table></div>')
    return "".join(h)


# ---------------------------------------------------------------------------
# Cluster navigation. Every spoke links to the pillar and exactly two siblings -
# chosen for genuine relevance, never a link wheel.
# ---------------------------------------------------------------------------
PILLAR = "business-access-point-end-of-life"
SPOKES = [
    ("ruckus-access-point-end-of-life", "RUCKUS end-of-life dates",
     "R310 to R770, checked against the vendor&rsquo;s own table."),
    ("is-my-ruckus-r510-too-old", "Is my RUCKUS R510 too old?",
     "The honest answer, and it is probably not the one you were told."),
    ("cisco-aironet-end-of-life", "Cisco Aironet end-of-life",
     "What &ldquo;last date of support&rdquo; actually costs you."),
    ("cisco-access-point-wont-join-controller", "AP won&rsquo;t join the controller",
     "Check the certificate date before you do anything else."),
    ("access-point-poe-af-at-upgrade-trap", "The PoE trap",
     "Why replacing access points is never just access points."),
    ("access-points-dropping-off-controller", "APs dropping off the controller",
     "A diagnostic order of play, cheapest check first."),
    ("wifi-controller-end-of-life", "Your controller is the real deadline",
     "Not the access points. This is the one most people miss."),
    ("meraki-licence-expiry-what-happens", "When a Meraki licence expires",
     "What actually happens &mdash; and what doesn&rsquo;t."),
    ("unsupported-access-point-security-risk", "Working but unpatched",
     "A different problem from broken, and a different decision."),
]
SIBLINGS = {
    "ruckus-access-point-end-of-life": ["is-my-ruckus-r510-too-old", "wifi-controller-end-of-life"],
    "is-my-ruckus-r510-too-old": ["ruckus-access-point-end-of-life", "wifi-controller-end-of-life"],
    "cisco-aironet-end-of-life": ["cisco-access-point-wont-join-controller",
                                  "unsupported-access-point-security-risk"],
    "cisco-access-point-wont-join-controller": ["cisco-aironet-end-of-life",
                                               "unsupported-access-point-security-risk"],
    "access-point-poe-af-at-upgrade-trap": ["wifi-controller-end-of-life",
                                            "access-points-dropping-off-controller"],
    "access-points-dropping-off-controller": ["access-point-poe-af-at-upgrade-trap",
                                              "wifi-controller-end-of-life"],
    "wifi-controller-end-of-life": ["ruckus-access-point-end-of-life",
                                    "access-point-poe-af-at-upgrade-trap"],
    "meraki-licence-expiry-what-happens": ["unsupported-access-point-security-risk",
                                           "wifi-controller-end-of-life"],
    "unsupported-access-point-security-risk": ["meraki-licence-expiry-what-happens",
                                               "cisco-aironet-end-of-life"],
}
_TITLES = dict((s, t) for s, t, _ in SPOKES)
_BLURBS = dict((s, b) for s, _, b in SPOKES)


def cluster_nav(current):
    """Pillar links to every spoke; a spoke links home plus its two relevant siblings."""
    if current == PILLAR:
        items = [(s, t, b) for s, t, b in SPOKES]
        head = "The rest of this guide"
        lede = ("Nine deeper pages, each answering one question properly. Start with "
                "whichever describes your situation.")
    else:
        sibs = SIBLINGS.get(current, [])
        items = [(s, _TITLES[s], _BLURBS[s]) for s in sibs]
        head = "Read next"
        lede = ""
    h = ['    <section class="section section--alt" aria-label="More in this guide">'
         '<div class="wrap"><div class="section-head">'
         '<h2 class="section-title section-title--center" data-title>' + head
         + '<span class="title-underline title-underline--center"></span></h2>']
    if lede:
        h.append('<p class="lede lede--center" data-reveal>' + lede + '</p>')
    h.append('</div><div class="tile-grid" data-stagger>')
    if current != PILLAR:
        h.append('<div class="tile"><h3><a href="/' + PILLAR + '/">The full guide</a></h3>'
                 '<p>End-of-support dates for every model we could verify, and how to tell '
                 'whether yours is actually the problem.</p></div>')
    for s, t, b in items:
        h.append('<div class="tile"><h3><a href="/' + s + '/">' + t + '</a></h3><p>' + b + '</p></div>')
    h.append('</div></div></section>')
    return "".join(h)


def survey_cta():
    """The single highest-value internal link in the cluster: our own free tool."""
    return ('    <section class="section" aria-label="Free WiFi survey">'
            '<div class="wrap" style="max-width:860px;margin:0 auto">'
            '<div class="repairs__card" data-reveal style="border-color:rgba(29,151,227,.4)">'
            '<div><p class="eyebrow mono">// BEFORE YOU RING ANYONE</p>'
            '<h2 class="repairs__title">Walk the site and write down what people actually get</h2>'
            '<p class="lede">Our <a href="/wifi-signal-test/">free Wi-Fi signal test</a> runs in a '
            'browser, needs no sign-up, and scores every room. Ten minutes with it turns &ldquo;the '
            'Wi-Fi is rubbish upstairs&rdquo; into numbers &mdash; which is the difference between '
            'a guess and a diagnosis, whoever ends up doing the work. See also our '
            '<a href="/room-by-room-wifi-test/">room-by-room method</a>.</p></div>'
            '<a href="/wifi-signal-test/" class="button primary">Run the free survey</a>'
            '</div></div></section>')


def table_wpa3_firmware():
    """WPA3 on Wi-Fi 5 RUCKUS kit is a CONTROLLER-VERSION question, not just hardware.
    Verified from release notes with negative controls - genuinely scarce information."""
    h = ['<div class="aptwrap"><table class="apt"><caption class="apt__cap">'
         'The firmware versions that first brought WPA3 to RUCKUS kit. Your access point '
         'supporting WPA3 is only half the answer &mdash; the controller has to offer it.'
         '</caption><thead><tr><th scope="col">Software</th><th scope="col">First version '
         'with WPA3</th><th scope="col">Released</th></tr></thead><tbody>']
    for sw, ver, when, _note in D.WPA3_FIRMWARE:
        h.append('<tr><th scope="row">' + sw + '</th><td class="mono"><strong>' + ver
                 + '</strong></td><td>' + (when or "&mdash;") + '</td></tr>')
    h.append('</tbody></table></div>')
    return "".join(h)


def smartzone7_block():
    """What SmartZone 7.x will and will not manage - the practical upgrade blocker."""
    legacy = ", ".join(D.SMARTZONE7_LEGACY)
    dropped = ", ".join(D.SMARTZONE7_DROPPED)
    return (ap_fact('SmartZone 7.x still manages the Wave 2 generation &mdash; but only inside '
                    'an access-point zone pinned to older access-point firmware. In the '
                    'vendor&rsquo;s own words, these appear under &ldquo;Supported AP Models for '
                    'AP Zones Using Older AP Versions&rdquo;: <strong>' + legacy + '</strong>.',
                    "ruckus_eol")
            + ap_fact('These are listed as no longer supported in SmartZone 7.2.0 at all: '
                      '<strong>' + dropped + '</strong>. If any of these are in your estate, a '
                      'SmartZone 7 upgrade retires them whether you planned it or not &mdash; '
                      'which is exactly the kind of surprise that turns a controller project '
                      'into an emergency.', "ruckus_eol"))
