# -*- coding: utf-8 -*-
"""
The WiFi diagnosis playbooks: three pages, three audiences, one method.

WHY THIS FAMILY EXISTS
    /ruckus-r510-unreliable-wifi-fix/ proved the shape: a page that diagnoses before it
    sells outranks and outlasts the reseller content around it. These three take the
    same shape to the three audiences the flagship does not serve - a household, a
    managed estate with a roaming fault, and a vehicle.

THE SIGNATURE DEVICE IS THE TRIAGE FORK, AND IT IS DELIBERATELY GENEROUS
    Every page opens by routing readers AWAY if they are in the wrong place. That is
    not a leak, it is the whole credibility of the family - and it is also what keeps
    three pages about "WiFi dropping" from cannibalising each other in search. Never
    quietly remove a route-away to keep a reader on the page.

EDITORIAL CONTRACT (inherited from the AP cluster, which paid for every line of it)
    * Rules of thumb are labelled as rules of thumb IN THE SENTENCE, not in a footnote.
    * Field observations are labelled "commonly reported - not vendor-confirmed".
    * No invented statistics, hardware prices, or ISP menu names.
    * The only prices allowed anywhere: home 18.25/computer, business from 24.38,
      Microsoft 365 4.85/user. Prefer none at all.
    * No customer is named. No vendor partnership is implied.

Content lives in playbook_data.py (written and adversarially fact-checked, corrections
recorded in that file's header). This module owns structure only.
"""
import build_pages as bp
from build_pages import add, hero, bc, cta, graph, crumb, webpage
import ap_cluster as C
import playbook_data as D


# ---------------------------------------------------------------------------
# Section renderers - one per `kind` in the data
# ---------------------------------------------------------------------------
def _wrap(inner, alt=False, label=None):
    lab = ' aria-label="%s"' % label if label else ""
    return ('    <section class="section%s"%s><div class="wrap wrap--narrow prose" '
            'data-reveal>%s</div></section>' % (" section--alt" if alt else "", lab, inner))


def _title(h2):
    return ('<h2 class="section-title" data-title>%s<span class="title-underline">'
            '</span></h2>' % h2)


def _prose(sec, alt):
    return _wrap(_title(sec["h2"]) + sec["html"], alt)


def _triage(sec, alt):
    """The routing fork. Styled as an advisory because that is what it is: read this
    before you read anything else, and leave if this is not your fault."""
    return _wrap(_title(sec["h2"])
                 + '<p class="lede">Start here. If one of these is you, the page you '
                   'actually want is linked in the line &mdash; go there, it will save '
                   'you an hour.</p>'
                 + '<div class="pbfork">' + sec["html"] + '</div>', alt)


def _steps(sec, alt):
    return _wrap(_title(sec["h2"]) + sec["html"], alt)


def _trap(sec, alt):
    return _wrap(_title(sec["h2"]) + C.ap_advisory(sec["html"]), alt)


def _table(sec, alt):
    return _wrap(_title(sec["h2"]) + '<div class="table-wrap">' + sec["html"] + '</div>', alt)


def _dontbuy(sec, alt):
    return _wrap(_title(sec["h2"]) + C.ap_field(sec["html"]), alt)


_KINDS = {"prose": _prose, "triage": _triage, "steps": _steps, "trap": _trap,
          "table": _table, "dontbuy": _dontbuy}


def _tool_cta(p):
    """The family's own tool block. Deliberately NOT ap_cluster.survey_cta(): that one
    speaks to an estate manager ("walk the site") and uses the AP cluster's "Wi-Fi"
    spelling. A household and a van owner need a different sentence and the same tool."""
    t = p["tool"]
    return ('    <section class="section" aria-label="Free measurement tool">'
            '<div class="wrap" style="max-width:860px;margin:0 auto">'
            '<div class="repairs__card" data-reveal style="border-color:rgba(29,151,227,.4)">'
            '<div><p class="eyebrow mono">// ' + t["eyebrow"] + '</p>'
            '<h2 class="repairs__title">' + t["head"] + '</h2>'
            '<p class="lede">' + t["body"] + '</p></div>'
            '<a href="' + t["href"] + '" class="button primary">' + t["btn"] + '</a>'
            '</div></div></section>')


def _family_nav(current):
    """Every playbook links to its two siblings and to the flagship. A reader who
    lands on the wrong one is one click from the right one."""
    others = [p for p in D.FAMILY if p[0] != current]
    lis = "".join('<li><a href="/%s/"><strong>%s</strong><span>%s</span></a></li>'
                  % (s, t, d) for s, t, d in others)
    return ('    <section class="section section--alt" aria-label="The other playbooks">'
            '<div class="wrap wrap--narrow prose" data-reveal>'
            + _title("Not quite your fault? The rest of the family") +
            '<p>Same method, different situation. These are separate pages because they '
            'are genuinely separate faults &mdash; not the same advice reworded.</p>'
            '<ul class="pbfam">' + lis + '</ul></div></section>')


# ---------------------------------------------------------------------------
# The page
# ---------------------------------------------------------------------------
def _page(p):
    body_parts = []
    for i, sec in enumerate(p["sections"]):
        body_parts.append(_KINDS[sec["kind"]](sec, alt=(i % 2 == 1)))

    content = "\n".join([
        hero(bc(p["crumb"]), p["eyebrow"], p["h1"], p["lede"],
             cta1=p.get("cta1", ("Talk to a human: 01202 775566", "tel:+441202775566")),
             cta2=p.get("cta2", ("Run the free WiFi test", "/wifi-signal-test/")),
             chips=p["chips"]),
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>'
        + C.disclaimer_block() + '</div></section>',
        "\n".join(body_parts),
        _tool_cta(p),
        _family_nav(p["slug"]),
        cta(p["cta_head"], p["cta_sub"],
            primary=("Call 01202 775566", "tel:+441202775566"),
            secondary=p.get("cta_secondary", ("Send us the details", "/contact/"))),
    ])

    def schema(s, _p=p):
        nodes = [crumb(s, _p["crumb"]), webpage(s, _p["schema_name"], _p["desc"])]
        if _p.get("faqs"):
            nodes.append({
                "@type": "FAQPage", "@id": bp.SITE + "/" + s + "/#faq",
                "mainEntity": [{
                    "@type": "Question", "name": q,
                    "acceptedAnswer": {"@type": "Answer", "text": a},
                } for q, a in _p["faqs"]],
            })
        return graph(nodes)

    add(slug=p["slug"], title=p["title"], desc=p["desc"],
        og_title=p.get("og_title", p["schema_name"]), schema=schema, content=content)


def build_all():
    for p in D.PLAYBOOKS:
        _page(p)
