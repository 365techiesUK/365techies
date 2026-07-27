# -*- coding: utf-8 -*-
"""
UK business network cluster - Wave 1.

Four pages, in build order:
  1. /firewall-licence-expired-what-happens/  - the cluster's signature asset
  2. /pstn-switch-off-business/               - time-boxed, expires Jan 2027
  3. /poe-budget-calculator/                  - tool, best value per hour built
  (the pillar is deliberately held - see the note at the foot of this file)

EDITORIAL CONTRACT (from the master brief - breaking any of these costs us the
credibility the whole cluster trades on):
  * NO price anywhere unless the vendor published it AND we date-stamp it. No "from",
    no ranges, no USD converted to GBP, and our own labour rate appears nowhere.
  * 365 Techies is a Dell reseller and Microsoft partner. Not SonicWall, Fortinet,
    WatchGuard, Sophos, Cisco, Meraki or Ubiquiti - never imply otherwise.
  * Not VAT registered: no VAT-inclusive totals, no implication VAT is reclaimable.
  * Where a reseller blog and a vendor table disagree, the vendor wins AND we say so.
  * Vendor quotes are quotes. Field reports are labelled as field reports.
"""
import build_pages as bp
from build_pages import add, hero, bc, cta, graph, crumb, webpage, tiles, grid_cards, checklist
import network_data as N

_LINK = '<a href="%s" target="_blank" rel="noopener">%s</a>'


def _src(key):
    if key not in N.SOURCES:
        return ''
    nm, url = N.SOURCES[key]
    return ' <span class="apcall__src">Source: ' + (_LINK % (url, nm)) + '</span>'


def disclaimer():
    return ('<div class="apdisc" role="note"><p><strong>Independent, and dated.</strong> '
            + N.DISCLAIMER + '</p></div>')


def stamp():
    return ('<p class="apstamp"><strong>Checked: ' + N.DATES_CHECKED_HUMAN + '.</strong> '
            'Vendors reword their documentation and move their dates. If you are making a '
            'decision on something below, open the vendor link and check it yourself '
            '&mdash; then tell us if it has moved and we will correct this page.</p>')


def _page(slug, title, desc, h1, eyebrow, lede, body, chips=None, cta1=None, cta2=None):
    content = "\n".join([
        hero(bc(title.split(" | ")[0][:38]), eyebrow, h1, lede,
             cta1=cta1 or ("Talk to a techie: 01202 775566", "tel:+441202775566"),
             cta2=cta2 or ("Free Wi-Fi survey tool", "/wifi-signal-test/"),
             chips=chips or ["Vendor sources linked", "Checked " + N.DATES_CHECKED_HUMAN,
                             "Independent &mdash; we sell no vendor&rsquo;s kit"]),
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>'
        + disclaimer() + '</div></section>',
        body,
        cta("Not sure which case you are in?",
            "Tell us the make and model and we will tell you what your situation actually is "
            "&mdash; no charge for the answer, and no quote unless you ask for one. We always "
            "ring before we connect to anything.",
            primary=("Call 01202 775566", "tel:+441202775566"),
            secondary=("Business Wi-Fi &amp; networks", "/business-wifi-installation/")),
    ])

    def schema(s, _d=desc, _t=title):
        return graph([crumb(s, _t.split(" | ")[0][:60]),
                      webpage(s, _t.split(" | ")[0][:60], _d)])

    add(slug=slug, title=title, desc=desc, og_title=title.split(" | ")[0][:60],
        schema=schema, content=content)


# ===========================================================================
# 1. FIREWALL LICENCE EXPIRY - the signature asset
# ===========================================================================
def firewall_licence():
    rows = []
    for r in N.LICENCE_EXPIRY:
        cls = {'critical': 'adv', 'high': 'adv', 'medium': 'fact'}[r['severity']]
        badge = {'critical': 'expired', 'high': 'soon', 'medium': 'check'}[r['severity']]
        rows.append(
            '<div class="apcall apcall--' + cls + '">'
            '<span class="apcall__tag">' + r['vendor'] + '</span>'
            '<div class="apcall__body">'
            '<p><strong>' + r['scope'] + ' &mdash; <span class="apbadge apbadge--' + badge
            + '">' + r['verdict'] + '</span></strong></p>'
            '<p>' + r['what_happens'] + '</p>'
            '<p><strong>Watch out:</strong> ' + r['watch_out'] + '</p>'
            + _src(r['source']) + '</div></div>')

    myth = "".join('<li><strong>' + a + '</strong> ' + b + '</li>' for a, b in N.LICENCE_MYTHS)

    body = "\n".join([
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Five vendors. Five genuinely different answers.'
        '<span class="title-underline"></span></h2>',
        '<p>A renewal quote lands, or somebody notices a licence lapsed three months ago, and '
        'the question is always the same: <em>is the firewall about to stop working, or is '
        'this a scare tactic?</em></p>',
        '<p>The honest answer is that it depends entirely on whose box is on your wall, and '
        'the range is wider than most people expect &mdash; from &ldquo;nothing visible '
        'happens&rdquo; to &ldquo;the whole site loses internet&rdquo;. One vendor&rsquo;s '
        'kit stops applying your firewall rules altogether and quietly becomes a router.</p>',
        '<p>Every description below is the vendor&rsquo;s own documented behaviour, linked to '
        'the source. We sell none of these products.</p>',
        stamp(),
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>What each vendor says happens'
        '<span class="title-underline"></span></h2>',
        "".join(rows),
        '</div></section>',
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>What a lapse does <em>not</em> do'
        '<span class="title-underline"></span></h2>',
        '<p>Renewal quotes are often sold with more urgency than the facts support, so here '
        'is the reassuring half &mdash; also from the vendors&rsquo; own documentation.</p>',
        '<ul class="prose-list">' + myth + '</ul>',
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>What to do this week'
        '<span class="title-underline"></span></h2>',
        checklist([
            "<strong>Find out what you actually own.</strong> Make, model, and which "
            "subscription bundle. On WatchGuard, check each service separately &mdash; they "
            "expire individually, so you can be half-protected without knowing.",
            "<strong>Meraki owners: establish your licensing model first.</strong> "
            "Co-termination and per-device fail closed after the grace period. Subscription "
            "keeps traffic flowing. It is the difference between an inconvenience and an "
            "outage, and it is worth ten minutes to check.",
            "<strong>Check who receives the renewal emails.</strong> The single most common "
            "reason a licence lapses unnoticed is that the notices go to someone who left, "
            "or to the company that installed the box years ago. Free to fix, today.",
            "<strong>Fortinet owners: check firmware separately.</strong> Without FortiCare "
            "you cannot apply firmware upgrades &mdash; so a lapse blocks the patch you will "
            "need when the next advisory lands.",
            "<strong>Then decide, knowingly.</strong> A box that has stopped inspecting is a "
            "risk decision somebody should take deliberately. It is not automatically an "
            "emergency &mdash; but it should never be an accident.",
        ]),
        '<p>Ageing access points on the same network? The same &ldquo;still supported or '
        'not?&rdquo; question applies there, and we have published '
        '<a href="/business-access-point-end-of-life/">the vendor dates for those too</a>.</p>',
        '</div></section>',
    ])
    _page("firewall-licence-expired-what-happens",
          "What Actually Happens When Your Firewall Licence Expires — By Vendor | 365 Techies",
          "SonicWall, Fortinet, WatchGuard, Sophos and Cisco Meraki behave completely "
          "differently when a firewall licence lapses — one fails open and stops applying "
          "your rules. The vendors' own documented answers, side by side, checked "
          + N.DATES_CHECKED_HUMAN + ".",
          'Your firewall licence expired. <em class="grad grad--green">What actually happens?</em>',
          "// FIREWALLS &middot; VENDOR DOCUMENTATION",
          "It depends entirely on whose box is on your wall — and the range runs from "
          "“nothing visible” to “the whole site loses internet”. Five vendors, "
          "five documented answers, side by side.",
          body)


# ===========================================================================
# 2. PSTN SWITCH-OFF - time-boxed, expires January 2027
# ===========================================================================
def pstn_switch_off():
    life = [c for c in N.PSTN_CASUALTIES if c[2] == 'life-safety']
    ops = [c for c in N.PSTN_CASUALTIES if c[2] == 'operational']
    traps = "".join(
        '<div class="apcall apcall--adv"><span class="apcall__tag">Worth knowing</span>'
        '<div class="apcall__body"><p><strong>' + t + '</strong> ' + d + '</p></div></div>'
        for t, d in N.PSTN_TRAPS)

    body = "\n".join([
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>The lines that will catch you out are not the '
        'phones<span class="title-underline"></span></h2>',
        '<p>Most businesses have the phone system in hand. What catches people is everything '
        '<em>else</em> quietly sitting on an analogue line &mdash; often a line nobody can '
        'find on a bill, installed by a contractor years ago, documented nowhere.</p>',
        '<div class="apcall apcall--fact"><span class="apcall__tag">The two dates</span>'
        '<div class="apcall__body"><p>' + N.PSTN['note'] + '</p>' + _src('openreach')
        + '</div></div>',
        stamp(),
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Walk the building. Look for these.'
        '<span class="title-underline"></span></h2>',
        '<p><strong>Start with the safety-critical ones.</strong> If any of these are on an '
        'analogue line, they need a designed replacement, not a swap &mdash; and somebody '
        'responsible for the building needs to know.</p>',
        grid_cards([(n, d) for n, d, _ in life]),
        '<p style="margin-top:1.6rem"><strong>Then the ones that stop you trading.</strong></p>',
        grid_cards([(n, d) for n, d, _ in ops]),
        '</div></section>',
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Three traps nobody mentions in the sales call'
        '<span class="title-underline"></span></h2>',
        traps,
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>What to do, in order'
        '<span class="title-underline"></span></h2>',
        checklist([
            "<strong>Audit before you buy anything.</strong> Walk the building with the list "
            "above. Photograph every socket and every box that has a phone cable in it. "
            "This step costs nothing and it is the one everybody skips.",
            "<strong>Get every line itemised.</strong> Ask your provider for a full list of "
            "lines at the site, including ones with no recent call activity. Those are "
            "exactly the lift and alarm lines.",
            "<strong>Deal with life-safety first.</strong> Lifts and fire panels are not an "
            "IT decision alone. Involve whoever is responsible for the building, and treat "
            "the loss of line power as a change that needs designing around.",
            "<strong>Ask which mobile generation any replacement dialler uses.</strong> "
            "Fitting a 2G or 3G device now can mean replacing it again.",
            "<strong>Only then choose a phone system.</strong> The phones are the easy part, "
            "and doing them first is how the alarm line gets forgotten.",
        ]),
        '<p class="quiet">Sorting a home phone line rather than a business one? '
        '<a href="/landline-switch-off-help/">We have a plain-English guide for that</a> '
        '&mdash; it is a different job with different answers.</p>',
        '</div></section>',
    ])
    _page("pstn-switch-off-business",
          "PSTN Switch-Off for UK Businesses: The Lines That Aren’t Phones | 365 Techies",
          "The UK analogue phone network switches off on 31 January 2027. The lines that "
          "catch businesses out are lifts, fire panels, alarms, door entry and card machines "
          "— not the phones. The audit to run, and the traps in the replacements.",
          'The switch-off will catch you out on <em class="grad grad--green">the lines that '
          'aren&rsquo;t phones</em>',
          "// PSTN SWITCH-OFF &middot; 31 JANUARY 2027",
          "Lifts, fire panels, alarms, door entry, card machines and the spare line in the "
          "plant room. Most are on analogue lines nobody can find on a bill — and the "
          "replacement loses something the old line had for free.",
          body,
          chips=["Deadline: 31 January 2027", "Life-safety kit flagged",
                 "Independent &mdash; we sell no phone systems"])


def build_all():
    firewall_licence()
    pstn_switch_off()


# THE PILLAR IS DELIBERATELY NOT BUILT YET.
# The master brief makes it conditional on a named person owning a quarterly re-check
# of every date on it, and says plainly: a stale dated table on a site that forbids thin
# pages is a worse liability than no table. That is an owner decision, not a build
# decision, so it waits. The two pages above are fully evergreen by comparison - the
# firewall page's claims are vendor behaviour rather than dates, and the PSTN page has
# one date that is already in the review diary with a successor page scheduled.
