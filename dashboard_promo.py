# -*- coding: utf-8 -*-
"""Dashboard marketing for the money pages. One place, six destinations.

WHY THIS EXISTS
---------------
Audited 2026-07-30: the Dashboard Studio is included with every support plan,
and the word "dashboard" appeared ZERO times in the selling copy of
/pricing/, /monthly-it-support/, /home-it-support-plans/,
/business-it-support-plans/ and both subscription pages. Every apparent
mention was the footer directory linking to the bespoke Victron/Wi-Fi pages.
So the strongest differentiator the firm has was invisible at the exact
moment someone decides whether to buy a plan - and /join/ never named the
free studio as a reason to join at all.

This is a CONVERSION asset, not a traffic one. "customer dashboard" and
"IT support dashboard" have negligible local search volume. It exists to
raise conversion on traffic the site already earns, and to say something no
Dorset competitor can. Don't judge it in Search Console.

THE HONESTY LINE - DO NOT MOVE IT
---------------------------------
The product marks every tile LIVE or SAMPLE on its face, and that split is
load-bearing: a real backup status sitting next to a pretend freezer
temperature makes both untrustworthy. The marketing has to mirror it.

What a support plan may be said to show live is exactly what
/next-gen-home-dashboards/ already publishes, and no more:

    the computers we look after - health, backups, storage, protection,
    your next visit, your written reports, your saved Wi-Fi surveys

What it may NEVER imply is live on a plan: cameras, solar, sensors,
vehicles, anything with a plug. Connecting those is the bespoke build, which
starts with checking what the customer's equipment actually publishes.

TWO GATES THAT ARE STILL SHUT (verified 2026-07-30)
---------------------------------------------------
1. 365 PC Manager is unsigned and Malwarebytes quarantines it, so a NEW
   customer cannot reliably get the app installed. Nothing here may push
   "install it today and watch your PCs live".
2. api/pcm.php resolves any plan that is not exactly 'business' to 'home',
   so every pro account shows the HOME tile set until the owner toggles it
   in pcm-admin. Nothing here may promise a business customer the estate
   tiles on sign-up.

Hence every call to action points at the FREE tier, which needs neither
gate: no card, no install, works in a browser today. When signing lands and
the flags are set, the CTAs can be strengthened - and that is the moment to
add a canonical /customer-dashboard/ page and a nav item (re-measure
.nav-sos first, the header has a tight fit).

Prices are the real published per-PC figures only: home 18.25, business
from 24.38, Microsoft 365 4.85 per user. The firm is not VAT registered, so
no figure here is ever VAT-inclusive.

LAYOUT NOTE
-----------
The card grid steps 1 -> 2 -> 3 -> 5 columns and deliberately never uses 4.
There are FIVE cards, and the original `auto-fit, minmax(215px, 1fr)` resolved
to 4 columns in the site's 1116px grid - one pixel over the 214px that five
needed - leaving a single card orphaned on its own row. Explicit counts make
that impossible at any viewport. Add a sixth card and this needs revisiting.

The homepage band is a frozen COPY in index.html (that file is hand-maintained
and build_blog.py does not regenerate it), so editing this module does NOT
update the homepage. Re-run:

    py -X utf8 tools_splice_dashboard.py --refresh --write
"""

# The bullet that goes in a plan card's feature list. Deliberately modest -
# it is a feature line, not a pitch, and it must survive being read next to
# "Unlimited remote support" without sounding like filler.
PLAN_FEATURE_HOME = "Your own 365 dashboard"
PLAN_FEATURE_BIZ = "Your own 365 estate dashboard"

# What the support tier genuinely reads. Single source of truth: if this list
# changes, it changes once, here, and only after checking the portal actually
# does it. Order is deliberate - the boring reliable ones first.
LIVE_ON_A_PLAN = [
    ("&#128190;", "Backups that really ran",
     "Not &ldquo;backup configured&rdquo;. Whether last night actually completed."),
    ("&#129504;", "Health, storage and protection",
     "Disk space, antivirus state and Windows version for each computer we look after."),
    ("&#128197;", "Your next visit",
     "When we are next due, and the bookings you can move or cancel yourself."),
    ("&#128203;", "Every written report",
     "The Service Report from each visit, kept in one place instead of on a Desktop."),
    ("&#128225;", "Saved Wi-Fi surveys",
     "Any room-by-room survey we have run for you, to compare against next time."),
]


def _cards():
    out = []
    for icon, title, body in LIVE_ON_A_PLAN:
        out.append(
            '<div class="dbp__card">'
            '<span class="dbp__ico" aria-hidden="true">%s</span>'
            '<h3>%s</h3><p>%s</p></div>' % (icon, title, body))
    return "".join(out)


_CSS = """
<style>
/* 1-2-3-5 columns, never 4 - see LAYOUT note in dashboard_promo.py */
.dbp__grid{display:grid;grid-template-columns:1fr;gap:.7rem;max-width:1160px;margin:0 auto}
@media (min-width:520px){.dbp__grid{grid-template-columns:repeat(2,1fr)}}
@media (min-width:760px){.dbp__grid{grid-template-columns:repeat(3,1fr)}}
@media (min-width:1060px){.dbp__grid{grid-template-columns:repeat(5,1fr)}}
.dbp__card{background:var(--panel,#0d1530);border:1px solid var(--line,#2a3b63);border-radius:13px;padding:1rem 1.05rem;transition:border-color .3s,transform .3s}
.dbp__card:hover{border-color:var(--cyan,#1d97e3);transform:translateY(-2px)}
.dbp__ico{font-size:1.4rem;line-height:1;display:inline-block;margin-bottom:.45rem}
.dbp__card h3{margin:0 0 .3rem;font-size:.92rem;color:var(--white,#f0f5fc)}
.dbp__card p{margin:0;font-size:.8rem;line-height:1.55;color:var(--soft,#86b6e8)}
.dbp__live{max-width:900px;margin:1.5rem auto 0;padding:.9rem 1.1rem;border-left:3px solid var(--cyan,#1d97e3);background:var(--panel,#0d1530);border-radius:0 10px 10px 0;font-size:.86rem;line-height:1.65;color:var(--soft,#86b6e8)}
.dbp__live strong{color:var(--white,#f0f5fc)}
/* These two carry the live/sample distinction the whole product rests on, so they
   have to be READABLE, not merely decorative. At .62rem on a .16-alpha tint the
   live tag measured 4.53:1 - over AA by 0.03, which is no margin at all. Bigger
   type and a lighter tint give it real headroom. Re-measure if either changes. */
.dbp__tag{display:inline-block;font-family:var(--mono,monospace);font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;padding:.1rem .42rem;border-radius:4px;vertical-align:baseline}
.dbp__tag--live{background:rgba(29,151,227,.1);color:#6fc2f5;border:1px solid rgba(29,151,227,.45)}
.dbp__tag--sample{background:rgba(159,181,211,.1);color:#b9cbe2;border:1px solid rgba(159,181,211,.34)}
.dbp__cta{text-align:center;margin:1.4rem auto 0}
.dbp__cta .mono{display:block;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--mut,#9fb5d3);margin-top:.55rem}
@media (prefers-reduced-motion:reduce){.dbp__card:hover{transform:none}}
</style>
"""


def plan_band(kind="both", alt=False):
    """The dashboard band for a plan, pricing or subscription page.

    kind: 'home' | 'business' | 'both' - only changes the framing sentence and
    which demo is linked. The live/sample truth panel is identical everywhere
    on purpose; it is the part that must not vary by page.
    """
    cls = "section section--alt" if alt else "section"
    if kind == "business":
        lede = ("Every business plan includes a dashboard of the estate we look after &mdash; "
                "every computer, what is patched, what backed up, and what is worth a call "
                "today &mdash; instead of you ringing round to find out.")
        demo = ('<a href="/custom-wifi-dashboards/">See a business dashboard in action &#8594;</a>')
    elif kind == "home":
        lede = ("Every home plan includes your own dashboard &mdash; one screen that answers "
                "&ldquo;is my computer actually all right?&rdquo; without you having to ask "
                "anyone, and arranged however you like it.")
        demo = ('<a href="/next-gen-home-dashboards/">See a home dashboard in action &#8594;</a>')
    else:
        lede = ("Every plan includes your own 365 dashboard &mdash; one screen that answers "
                "&ldquo;is everything actually all right?&rdquo; without you having to ask. "
                "Home or business, arranged however suits you.")
        demo = ('<a href="/next-gen-home-dashboards/">Home dashboard demo</a> &middot; '
                '<a href="/custom-wifi-dashboards/">Business dashboard demo</a>')

    return """    <section class="%s" aria-label="Your 365 dashboard" id="dashboard">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// INCLUDED WITH EVERY PLAN</p>
          <h2 class="section-title section-title--center" data-title>Your own dashboard, not another
            login you never use<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>%s</p>
        </div>
        <div class="dbp__grid">%s</div>

        <p class="dbp__live"><strong>The bit we will not blur.</strong> Every tile says
          <span class="dbp__tag dbp__tag--live">live</span> or
          <span class="dbp__tag dbp__tag--sample">sample</span> on its face. Live means it is
          reading your own account. Sample means the numbers are made up and nothing is plugged in
          behind it yet. Cameras, solar and sensors do not appear by magic &mdash; connecting those
          is a separate build, and it starts with us checking what your equipment actually
          publishes. We would rather tell you that up front than let you find out later.</p>

        <p class="dbp__cta" data-reveal>
          <a href="/join/" class="button primary">Try the dashboard free</a>
          <span class="mono">No card &middot; nothing to install &middot; about a minute &middot; %s</span>
        </p>
      </div>
    </section>%s""" % (cls, lede, _cards(), demo, _CSS)


def join_band():
    """For /join/ - the free studio as a reason to join, which it never was.

    This one leads on SAMPLE deliberately. A free member has no live data by
    definition, and saying so plainly is what makes the live tiles believable
    later if they take a plan.
    """
    return """    <section class="section section--alt" aria-label="The dashboard studio" id="studio">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE, AND GENUINELY FUN</p>
          <h2 class="section-title section-title--center" data-title>Build your own dashboard while
            you are here<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Membership comes with the dashboard studio in
            your portal. Drag the tiles where you want them, throw away the ones you do not care
            about, resize the good ones, and save the layout to your account so it follows you to
            your phone. Nothing to install, and no card at any point.</p>
        </div>
        <div class="dbp__grid">%s</div>
        <p class="dbp__live"><strong>Straight about what is real.</strong> On free membership every
          tile is a clearly marked <span class="dbp__tag dbp__tag--sample">sample</span> &mdash;
          the layout is yours, the numbers are invented. The tiles above start reading
          <span class="dbp__tag dbp__tag--live">live</span> from your own account when you are on a
          support plan and we are looking after the computers. We would rather you played with an
          honest mock-up than trusted a pretend backup status.</p>
        <p class="dbp__cta" data-reveal>
          <a href="/portal/" class="button primary">Open the studio</a>
          <span class="mono">Or see a full demo first &mdash;
            <a href="/next-gen-home-dashboards/">home</a> &middot;
            <a href="/custom-wifi-dashboards/">business</a></span>
        </p>
      </div>
    </section>%s""" % (_cards(), _CSS)


def homepage_band():
    """Homepage band. index.html is hand-maintained and NOT regenerated by
    build_blog.py, so this is spliced in by tools_splice_dashboard.py rather
    than emitted at build time. Keep it self-contained for that reason."""
    return plan_band(kind="both", alt=True)
