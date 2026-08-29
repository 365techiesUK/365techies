# -*- coding: utf-8 -*-
"""The website-project journeys - ONE source of truth for pages, feed and portal.

WHY THIS MODULE EXISTS
----------------------
The .jt milestone timelines started life as inline HTML in two different files
(ccb_rebuild_case_study.py and build_extra.ccb_case_study). That was fine while
nothing else read them. It stopped being fine the moment we decided to:

  1. publish /projects-feed.json  (machine-readable, for the portal), and
  2. show the same journey to signed-in customers in /portal/.

Three copies of the same dates would have drifted within a month - and the
drift would be silent, because nothing compares them. So the milestones live
here as data, and every surface renders FROM here.

THE RULE THIS MODULE ENFORCES IN CODE
-------------------------------------
A "wait" milestone is a promise about a measurement we have not taken yet. It
must never show a figure - the whole authority of these pages rests on the
reader being able to tell published measurements from reserved slots at a
glance. That was a comment before; comments do not fail builds. jt_html() now
RAISES if a wait milestone carries a digit in its chips.

WHEN A RE-MEASURE LANDS (the 30/90/180-day updates)
---------------------------------------------------
Edit the milestone here and nothing else:
    state "wait" -> "done", set `when` to the real date, add the real Search
    Console figures as chips, and move state "live" to the next row.
The case study page, the relationship page, the JSON feed and the portal card
all update from that one edit.

PERMISSION - READ BEFORE ADDING A PROJECT
-----------------------------------------
Only projects whose client has agreed to be named appear here, because this
data is published publicly at /projects-feed.json AND shown to portal
customers. Right now that is Colin Clark Builders alone.
  - Beckox: rebuilt and ready, but the case study is held until launch + naming
    approval. Do NOT add until both are true.
  - Emblem Sports Cars: an unsigned pitch with a private preview. Adding it -
    even to a "private" portal - would publish a prospect's name against work
    they have not commissioned. Do not add.
The portal feeling private is not a permission exemption; the feed is public.
"""
import html as _html
import re as _re

# --- the projects -----------------------------------------------------------
# state: "done" = measured and published | "live" = where the clock is now
#        "wait" = reserved slot, due date only, NO figures (enforced below)
# iso:   machine date for the feed. For a range or a vague past ("over 15 years
#        ago") use the best single anchor date, or None where none is honest.
# chips: short measured facts. On a "wait" row these describe what is awaited.

CCB_REBUILD = [
    dict(state="done", when="June &ndash; July 2026 &middot; Done", iso="2026-07-01",
         title="The research",
         body="Before a single page was designed: their Search Console history read line by "
              "line, the old site crawled address by address, and the page Google was already "
              "showing ten and a half thousand times found and understood. "
              "<a href=\"#research\">The research nobody sees</a> is most of the job.",
         chips=["17 ranking addresses mapped", "100+ hidden addresses found"]),
    dict(state="done", when="July 2026 &middot; Done", iso="2026-07-20",
         title="The build",
         body="Seventy-nine pages that answer real questions, a full structured-data entity "
              "graph, an <code>llms.txt</code> for AI assistants, and the firm&rsquo;s own "
              "photographs throughout. Static files &mdash; nothing to hack, nothing to patch.",
         chips=["79 pages", "1 script", "0 plugins"]),
    dict(state="done", when="30 July 2026 &middot; Done", iso="2026-07-30",
         title="Baseline day, then launch",
         body="The old WordPress site measured on the last day it existed &mdash; the "
              "<a href=\"#numbers\">before column</a> that can never be retaken &mdash; then the "
              "swap, with every redirect already rehearsed. Launch day was deliberately boring.",
         chips=["TTFB 1,320 &rarr; 106 ms", "111 &rarr; 15 requests", "17/17 redirects live"]),
    dict(state="done", when="31 July 2026 &middot; Done", iso="2026-07-31",
         title="Day one &mdash; marked by our own public tool",
         body="We pointed our <a href=\"/website-checker/\">free website checker</a> &mdash; the "
              "same one anyone can use on any site &mdash; at the site we had just built, and "
              "published <a href=\"#checker\">what it returned</a>, including what it told us to "
              "improve.",
         chips=["Lighthouse 99 desktop &middot; 90 mobile", "SEO 100", "0 layout shift"]),
    dict(state="live", when="29 August 2026 &middot; Measured &mdash; you are here", iso="2026-08-29",
         title="30-day re-measure",
         body="The first 28 days of live Search Console data (30 July &ndash; 26 August), "
              "published as promised: <strong>165 clicks</strong> from Google search, 156 of them "
              "from the UK, landing on 44 different pages &mdash; and more than half of those "
              "clicks went to pages that did not exist before the rebuild. The site also appeared "
              "over 1,600 times in Google&rsquo;s AI answers, up from less than once a day on the "
              "old site. We are deliberately not headlining impressions: SEO-tool bots inflate "
              "them. Clicks are people. <a href=\"#honest\">The full 30-day update</a> explains "
              "both numbers and their caveats.",
         chips=["165 clicks &middot; 156 from the UK", "44 pages earned clicks",
                "1,600+ AI-answer appearances"]),
    dict(state="wait", when="Due late October 2026 &middot; Reserved", iso="2026-10-28",
         title="90-day re-measure",
         body="Long enough for Google to have recrawled everything and for rankings to start "
              "settling. The first read that means much.",
         chips=["Awaiting Search Console data"]),
    dict(state="wait", when="Due late January 2027 &middot; Reserved", iso="2027-01-26",
         title="180-day verdict",
         body="The one that counts: two full seasons of search data against the old site&rsquo;s "
              "history. If the rebuild worked, this entry proves it. If it fell short, this entry "
              "says that instead.",
         chips=["Awaiting Search Console data"]),
]

# The relationship story - same client, longer arc, lighter on numbers.
CCB_RELATIONSHIP = [
    dict(state="done", when="Over 15 years ago", iso=None,
         title="It started with a broken laptop",
         body="A repair, done properly, at a fair price. No contract, no pitch. Trust is built in "
              "jobs that small.",
         chips=[]),
    dict(state="done", when="The years between", iso=None,
         title="From fixing their laptops to running their IT",
         body="Dell Latitude business laptops on a planned refresh cycle &mdash; supplied, set up "
              "and supported by the same people who answer the phone when something breaks.",
         chips=[]),
    dict(state="done", when="2022", iso="2022-01-01",
         title="Website and email brought in-house",
         body="Their existing site and email moved onto hosting we manage &mdash; keeping "
              "everything, changing who answers when it goes wrong. One team, one number.",
         chips=[]),
    dict(state="done", when="30 July 2026", iso="2026-07-30",
         title="The rebuild went live",
         body="A complete rebuild of colinclarkbuilders.co.uk &mdash; 79 pages that finally "
              "explain the craft, measured against the old site on its last day. The full "
              "engineering story, with every number, is the "
              "<a href=\"/website-rebuild-seo-case-study/\">measured case study</a>.",
         chips=["Server response 1,320 &rarr; 106 ms", "20 &rarr; 79 pages"]),
    dict(state="done", when="31 July 2026", iso="2026-07-31",
         title="Being measured in the open",
         body="The day after launch we scored the new site with our own "
              "<a href=\"/website-checker/\">free website checker</a> and published the result "
              "&mdash; including what it flagged for improvement.",
         chips=["Lighthouse 99 desktop &middot; 90 mobile", "SEO 100"]),
    dict(state="live", when="29 August 2026 &middot; You are here", iso="2026-08-29",
         title="The first month, measured",
         body="The 30-day Search Console re-measure is published in full on the "
              "<a href=\"/website-rebuild-seo-case-study/#journey\">measured case study</a>: "
              "165 clicks from Google search in the first 28 days, most of them landing on pages "
              "that did not exist before the rebuild.",
         chips=["165 clicks in 28 days"]),
    dict(state="wait", when="October 2026 &amp; January 2027 &middot; Reserved", iso="2026-10-28",
         title="The results still to come",
         body="Search Console re-measures at 90 and 180 days, published on the "
              "<a href=\"/website-rebuild-seo-case-study/#journey\">measured case study</a> "
              "whatever they say. No projections in the meantime.",
         chips=["Awaiting Search Console data"]),
]

# --- the project record the feed publishes ----------------------------------
PROJECTS = [
    dict(
        id="colin-clark-builders",
        name="Colin Clark Builders",
        trade="Heritage builder &middot; East Dorset, est. 1978",
        site="https://colinclarkbuilders.co.uk/",
        case_study="/website-rebuild-seo-case-study/",
        story="/case-study-colin-clark-builders/",
        launched="2026-07-30",
        # "measuring" = live and inside the 30/90/180 window. Other honest
        # values as more projects land: "building", "complete".
        status="measuring",
        summary="A tired WordPress site with 20 pages replaced by a 79-page static build "
                "&mdash; measured on the old site&rsquo;s last day so the before-and-after "
                "is real, and re-measured from Search Console at 30, 90 and 180 days.",
        shots=[
            dict(old="/images/ccb-old-home.webp", new="/images/ccb-new-home.webp",
                 alt_old="The old colinclarkbuilders.co.uk homepage, a dated WordPress theme",
                 alt_new="The rebuilt colinclarkbuilders.co.uk homepage led by their own photograph"),
        ],
        milestones=CCB_REBUILD,
    ),
]


# --- rendering --------------------------------------------------------------
_DIGIT = _re.compile(r"\d")


def _guard_wait(m):
    """A reserved slot must not show a measurement. Fail the build if it does.

    This was a code comment until 2026-07-31. A comment cannot stop a future
    edit (mine or anyone's) from pasting a projected figure into a slot whose
    entire value is that it is empty until the data is real.
    """
    if m["state"] != "wait":
        return
    for c in m.get("chips") or []:
        if _DIGIT.search(c):
            raise ValueError(
                "projects_data: reserved ('wait') milestone %r carries a figure in a chip "
                "(%r). A reserved slot must contain no numbers - that distinction is what "
                "makes the published measurements believable. Publish the figure only once "
                "the data is real, and flip the state to 'done' at the same time."
                % (m["title"], c))


def jt_html(milestones, extra=""):
    """Render the shared .jt journey timeline (CSS lives in css/styles.css)."""
    out = ['        <ol class="jt">']
    for m in milestones:
        _guard_wait(m)
        chips = ""
        if m.get("chips"):
            chips = ('\n            <ul class="jt__chips">'
                     + "".join("<li>%s</li>" % c for c in m["chips"]) + "</ul>")
        out.append(
            '          <li class="jt__item jt__item--%s" data-reveal>\n'
            '            <span class="jt__node" aria-hidden="true"></span>\n'
            '            <p class="jt__when">%s</p>\n'
            '            <h3>%s</h3>\n'
            '            <p>%s</p>%s\n'
            '          </li>' % (m["state"], m["when"], m["title"], m["body"], chips))
    out.append("        </ol>")
    if extra:
        out.append(extra)
    return "\n".join(out)


# --- the machine-readable feed ----------------------------------------------
_TAG = _re.compile(r"<[^>]+>")


def _plain(s):
    """HTML fragment -> readable plain text, for feed consumers and the portal."""
    return _html.unescape(_TAG.sub("", s or "")).strip()


def feed(today):
    """The /projects-feed.json payload. Consumed by /portal/ - keep it stable."""
    projects = []
    for p in PROJECTS:
        ms = []
        for m in p["milestones"]:
            _guard_wait(m)
            ms.append(dict(
                state=m["state"],
                when=_plain(m["when"]),
                iso=m.get("iso"),
                title=_plain(m["title"]),
                body=_plain(m["body"]),
                chips=[_plain(c) for c in (m.get("chips") or [])],
            ))
        nxt = next((m["iso"] for m in p["milestones"]
                    if m["state"] == "wait" and m.get("iso")), None)
        projects.append(dict(
            id=p["id"], name=_plain(p["name"]), trade=_plain(p["trade"]),
            site=p["site"], caseStudy=p["case_study"], story=p["story"],
            launched=p["launched"], status=p["status"], summary=_plain(p["summary"]),
            nextDue=nxt, shots=p["shots"], milestones=ms,
        ))
    return dict(v=today, generated=today, projects=projects)
