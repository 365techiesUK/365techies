# -*- coding: utf-8 -*-
"""What a website rebuild actually changes - measured, on a real client site.

WHY THIS PAGE EXISTS, AND WHAT IT IS NOT
----------------------------------------
/case-study-colin-clark-builders/ tells the RELATIONSHIP story - fifteen years
of laptops, hosting, email and eventually a rebuild. This page is the
ENGINEERING story of the rebuild itself, with the numbers, for the reader who
is deciding whether their own tired site is worth replacing.

THE MEASUREMENTS ARE REAL AND THEY ARE MINE
-------------------------------------------
Every figure below was measured on 30 July 2026, in one sitting, with both
sites loaded back to back in the same browser on the same connection, using the
browser's own Performance API and DOM inspection. Raw capture is kept at
C:\\claude\\ccb-casestudy\\baseline-2026-07-30.json.

That date matters: it was the LAST DAY the old WordPress site existed. Once it
was replaced, the "before" column became unrepeatable. If a rebuild is coming
and nobody measured the old site first, there is no case study to write later -
only assertions.

Honest about method: single run per page, not an averaged lab result, so the
timings are indicative and the COUNTS (requests, scripts, structured-data
blocks, missing alt text, words) are exact. PageSpeed Insights was tried first
and its keyless quota was exhausted, which is why these are direct-measured
rather than Lighthouse scores. Byte weight was deliberately dropped: the
refetch needed to size uncached assets tripped SiteGround's WAF, so any number
would have been wrong.

THE LINE THIS PAGE MUST NOT CROSS
---------------------------------
The new site had not been live for a single day when this was written. It has
no rankings, no traffic and no enquiries of its own. So this page claims NONE
of those things. It says what was rebuilt, what that measurably changed, and
why those changes matter to search - and then says plainly that the outcome is
not yet known and will be reported when Search Console has real data.

That restraint is the point. Every agency case study on the internet claims a
traffic multiple; almost none of them shows a before-measurement taken on the
day. Showing the method and admitting what is still unknown is more persuasive
to the sceptical reader than a number they cannot check - and it is the same
standard ccb_case_study() already sets in build_extra.py.

Published with Colin Clark's permission, as with the existing case study.
"""
from build_pages import (add, graph, crumb, webpage, faqpage, faq_html, cta,
                         hero, bc, SITE, TODAY)
from ccb_race import RACE   # the real-time load race - see ccb_race.py for the rules

SLUG = "website-rebuild-seo-case-study"

# --- measured 2026-07-30, both sites, same browser, back to back -------------
# (label, old, new, what it means - or None to hide the meaning column entry)
HOMEPAGE = [
    ("Server response (TTFB)", "1,320 ms", "97 ms",
     "How long the server takes to say anything at all. Nothing can be drawn until this finishes."),
    ("First content on screen", "1,808 ms", "544 ms",
     "When the visitor first sees something other than white. This is the moment they decide whether to wait."),
    ("Page fully loaded", "2,225 ms", "461 ms",
     "Everything done. On a phone on patchy signal, the gap widens rather than narrows."),
    ("Requests to load one page", "111", "15",
     "Every request is a separate round trip. Most of the old ones were plugins nobody asked for."),
    ("JavaScript files", "53", "1",
     "Fifty-three scripts is not a design decision, it is what a decade of plugins leaves behind."),
    ("Stylesheets", "52", "2", None),
    ("HTML delivered", "226 KB", "47 KB",
     "The page's own markup, before images. Most of the old weight was markup no reader ever sees."),
    ("Elements on the page", "1,150", "503", None),
]

SEO_ROWS = [
    ("Pages in the sitemap", "20", "79",
     "Twenty pages cannot answer many questions. Most searches never had a page to land on."),
    ("Structured data blocks (homepage)", "0", "2",
     "Structured data is how a search engine knows this is a builder, in Dorset, doing these trades."),
    ("Meta description (homepage)", "none", "152 characters",
     "With none, Google writes its own from whatever text it finds. That is your shop window, chosen by a machine."),
    ("Page title (homepage)", "20 characters", "64 characters",
     "&ldquo;Colin Clark Builders&rdquo; only wins if you already know the name. It says nothing about the trade or the county."),
    ("Headings marked as the main one", "6", "1",
     "Six H1s tells a crawler the page has six subjects, which is the same as having none."),
    ("Images with alt text (homepage)", "0 of 12", "14 of 15",
     "Alt text is what a screen reader announces and what an image search reads. Zero is a real accessibility failure, not a technicality."),
]

# The page that proves the point best - it already had the impressions.
TIMBER = [
    ("Page title", "Timber Framing &ndash; Colin Clark Builders",
     "Oak &amp; Timber Frames, Bournemouth &amp; Dorset | Colin Clark Builders"),
    ("Meta description", "none",
     "Green oak and chestnut frames, roof trusses and whole buildings for Dorset homes &mdash; jointed and pegged by hand&hellip;"),
    ("Structured data", "0 blocks",
     "4 blocks &mdash; Service, FAQPage, BreadcrumbList, plus the site-wide business entity"),
    ("Words on the page", "400", "663"),
    ("Images with alt text", "0 of 6", "2 of 2"),
    ("Server response", "878 ms", "57 ms"),
    ("First content on screen", "1,272 ms", "312 ms"),
    ("Requests", "97", "8"),
]

FAQS = [
    ("Does rebuilding a website improve your Google ranking?",
     "Not on its own, and anyone promising otherwise is guessing. What a rebuild can do is remove the "
     "reasons a search engine had to ignore you: pages that load slowly, no description for Google to "
     "show, no structured data explaining what the business does, and too few pages to answer what "
     "people actually type. Fix those and you have earned the chance to rank. You still have to be "
     "genuinely useful, and you still need reviews and local signals. On this project we measured the "
     "technical change on day one and are deliberately not claiming a ranking result yet."),
    ("Is WordPress bad for SEO?",
     "No. WordPress powers an enormous amount of the web perfectly well, and this same client sat on it "
     "happily for years. The problem is what a decade of plugins does to a site nobody is actively "
     "maintaining. The old site here was loading 53 JavaScript files and 52 stylesheets to show one "
     "page &mdash; not because anyone chose that, but because each plugin brought its own. If you have "
     "someone maintaining WordPress properly, keep it. If you do not, it quietly rots."),
    ("What is a static site, in plain English?",
     "Every page is built once, in advance, into a plain file. When somebody visits, the server hands "
     "over that file &mdash; no database lookup, no plugins running, nothing to assemble. It is why the "
     "server response went from 1,320 milliseconds to 97. It also means there is no admin login to "
     "break into and no plugin updates to forget, which is most of how small business sites get hacked."),
    ("Will I lose my Google rankings when the site changes?",
     "That is the real risk, and it is the part that needs the most care. Every old address has to keep "
     "working or land somewhere sensible. On this rebuild we took the old page list from three separate "
     "sources &mdash; Search Console, a crawl of the live site, and the old site&rsquo;s own media API "
     "&mdash; then tested the redirect rules against every one before launch: 17 of 17 old ranking "
     "addresses land on a real page, and 12 of those keep their exact address. That test is the "
     "difference between a rebuild and a disappearance."),
    ("How long before a rebuild shows results?",
     "Longer than anyone wants. Google has to recrawl, and it re-earns its judgement slowly. Weeks for "
     "the technical changes to be noticed, months before rankings settle. We measure at 30, 90 and 180 "
     "days against the baseline taken the day before launch &mdash; which is why taking that baseline "
     "matters so much. If nobody measured the old site, there is nothing to compare with, and every "
     "claim afterwards is just a story."),
    ("How do I make changes to a static site afterwards?",
     "You tell us, and we make them &mdash; that is part of <a href=\"/web-care/\">365 Web Care</a>, "
     "the monthly plan that follows a rebuild. In practice it is usually faster than logging into "
     "WordPress yourself, and nothing can be broken by a plugin update on the way. If you genuinely "
     "edit content every week, say so up front &mdash; that is one of the cases where we would tell "
     "you a static rebuild is the wrong answer."),
    ("Can you do this for my website?",
     "Yes &mdash; and the first useful thing is free. Run your site through our "
     "<a href=\"/website-checker/\">free website checker</a> and it will show you the same kinds of "
     "problems we found here: missing descriptions, slow responses, missing structured data. If a "
     "rebuild is not worth it we will say so; sometimes fixing what is there is the better answer. Or "
     "just ring 01202 775566 or <a href=\"/contact/?topic=website-rebuild\">send us your web "
     "address</a> and we will look at it with you."),
]


def _row(cells, head=False):
    tag = "th" if head else "td"
    return "<tr>" + "".join("<%s>%s</%s>" % (tag, c, tag) for c in cells) + "</tr>"


def _table(caption, rows, headings, with_meaning=True):
    body = []
    for r in rows:
        if with_meaning:
            label, old, new, why = (list(r) + [None])[:4]
            cells = ['<strong>%s</strong>' % label,
                     '<span class="rb__old">%s</span>' % old,
                     '<span class="rb__new">%s</span>' % new,
                     (why or "")]
        else:
            cells = ['<strong>%s</strong>' % r[0],
                     '<span class="rb__old">%s</span>' % r[1],
                     '<span class="rb__new">%s</span>' % r[2]]
        body.append(_row(cells))
    return ('<div class="price-table-wrap"><table class="price-table">'
            '<caption class="rb__cap">%s</caption><thead>%s</thead><tbody>%s</tbody></table></div>'
            % (caption, _row(headings, head=True), "".join(body)))


def build():
    # <=155 and a complete sentence, so _meta_desc never trims it - see snippets_data.py
    desc = ("We measured a Dorset builder's WordPress site the day before it was replaced. "
            "Server response 1,320ms to 97ms, 111 requests to 15, 20 pages to 79.")

    body = []

    body.append(hero(
        bc("Website Rebuild: Measured"), "// CASE STUDY &middot; MEASURED 30 JULY 2026",
        'What a website rebuild <em class="grad grad--cyan">actually</em> changes',
        "We rebuilt Colin Clark Builders&rsquo; website from the ground up. On the last day the old "
        "WordPress site existed, we measured both versions back to back &mdash; so this is a real "
        "before and after, not an estimate. Here is every number, how we got it, and the one thing "
        "we are not claiming yet.",
        cta1=("See the numbers", "#numbers"),
        cta2=("Check your own site free", "/website-checker/"),
        chips=["TTFB 1,320ms &rarr; 97ms", "111 requests &rarr; 15", "20 pages &rarr; 79"]))

    # THE SCREENSHOTS. Captured with headless Edge on 30 July 2026 - the old
    # WordPress site's last day, same day as every measurement on this page. The
    # originals (plus a full-length capture and the timber pages) are archived at
    # C:\\claude\\ccb-casestudy\\shots\\ - they can never be retaken. All four
    # images carry width/height so they cannot shift layout, and load lazily.
    # The caption is deliberate: design is taste, the tables are measurement -
    # this page's authority rests on never blurring that line.
    body.append('''    <section class="section section--alt" aria-label="The two sites, side by side" id="looks">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// SAME BUSINESS, SAME DAY</p>
          <h2 class="section-title section-title--center" data-title>See the difference
            first<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Both versions photographed on 30 July 2026
            &mdash; the old site&rsquo;s last day. Design is taste; the tables further down are
            measurement. But taste is where every visitor starts.</p>
        </div>
        <div class="sc__grid">
          <figure class="sc__fig">
            <span class="sc__tag sc__tag--old">Old &middot; WordPress</span>
            <img src="/images/ccb-old-home.webp" alt="The old colinclarkbuilders.co.uk homepage: a dated WordPress theme with a grey header and stock-style layout" width="1100" height="773" loading="lazy" decoding="async">
            <figcaption>The homepage visitors saw until 30 July 2026.</figcaption>
          </figure>
          <figure class="sc__fig">
            <span class="sc__tag sc__tag--new">New &middot; static</span>
            <img src="/images/ccb-new-home.webp" alt="The rebuilt colinclarkbuilders.co.uk homepage: full-height photograph of a restored cottage with the heading Old buildings, cared for by hand, in lime and oak" width="1100" height="773" loading="lazy" decoding="async">
            <figcaption>The same business, rebuilt &mdash; led by their own photographs.</figcaption>
          </figure>
        </div>
        <div class="sc__grid sc__grid--phones">
          <figure class="sc__fig">
            <span class="sc__tag sc__tag--old">Old &middot; on a phone</span>
            <img src="/images/ccb-old-mobile.webp" alt="The old site on a 390-pixel phone screen" width="390" height="844" loading="lazy" decoding="async">
          </figure>
          <figure class="sc__fig">
            <span class="sc__tag sc__tag--new">New &middot; on a phone</span>
            <img src="/images/ccb-new-mobile.webp" alt="The rebuilt site on the same 390-pixel phone screen" width="390" height="844" loading="lazy" decoding="async">
          </figure>
        </div>
        <p class="rb__note"><strong>Where most of their visitors actually are.</strong> Just over
          half of local-service searches happen on a phone, and the phone view is where the old
          site struggled most. The two shots above are the same 390-pixel screen.</p>
      </div>
    </section>
''')

    body.append('''    <section class="section" aria-label="Why measure first" id="why">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// THE BIT ALMOST EVERYONE SKIPS</p>
          <h2 class="section-title section-title--center" data-title>You only get one chance to
            measure the old site<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>The moment a new site goes live, the old one stops
            existing. Whatever it scored, however slow it was, whatever it was missing &mdash; gone,
            and not recoverable. Every &ldquo;before&rdquo; figure on this page was captured on
            30 July 2026, the day before the switch. A day later it would have been impossible.</p>
        </div>
        <p class="rb__note"><strong>How these were measured, so you can judge them.</strong> Both
          sites were loaded back to back in the same browser, on the same connection, within minutes
          of each other, and read with the browser&rsquo;s own Performance API. One run each &mdash;
          so treat the timings as indicative and the counts as exact. We tried Google&rsquo;s
          PageSpeed Insights first and hit its daily limit, which is why these are direct
          measurements rather than Lighthouse scores. We have left page weight out entirely: sizing
          uncached files tripped the host&rsquo;s bot protection, and a number we cannot stand behind
          is worse than no number.</p>
      </div>
    </section>''')

    body.append(RACE)

    body.append('''    <section class="section section--alt" aria-label="Speed measurements" id="numbers">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// HOMEPAGE, SIDE BY SIDE</p>
          <h2 class="section-title section-title--center" data-title>The same page, before and
            after<span class="title-underline title-underline--center"></span></h2>
        </div>
        %s
      </div>
    </section>''' % _table("Colin Clark Builders homepage, measured 30 July 2026",
                           HOMEPAGE,
                           ["", "Old (WordPress)", "New (static)", "Why it matters"]))

    body.append('''    <section class="section" aria-label="Search visibility" id="seo">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// WHAT A SEARCH ENGINE COULD SEE</p>
          <h2 class="section-title section-title--center" data-title>Speed was not the worst of
            it<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>A slow site is a problem you can feel. These are
            the problems nobody can see &mdash; and they are the ones that decide whether you appear
            in the results at all.</p>
        </div>
        %s
      </div>
    </section>''' % _table("Search-visibility basics, same two sites, same day",
                           SEO_ROWS,
                           ["", "Old (WordPress)", "New (static)", "Why it matters"]))

    body.append('''    <section class="section section--alt" aria-label="The timber framing page" id="timber">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// ONE PAGE, IN DETAIL</p>
          <h2 class="section-title section-title--center" data-title>The page that was already being
            found &mdash; and wasted<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Search Console showed the old timber framing page
            being shown to people around <strong>ten and a half thousand times</strong>, mostly for
            searches like &ldquo;timber frame bournemouth&rdquo;, and almost nobody clicked. That is
            not a ranking problem. Google was already offering the page &mdash; it just gave people
            nothing to click on: no description, a title that named only the company, and four
            hundred words behind it.</p>
        </div>
        %s
        <p class="rb__note"><strong>This is the cheapest kind of win there is.</strong> The
          impressions already existed. Nothing had to rank better. The page simply had to stop
          looking like a dead end &mdash; a title that says what the work is and where, a description
          written for a human, and enough substance behind the click to be worth it.</p>
      </div>
    </section>''' % _table("/timber-framing/ &mdash; old site versus new",
                           TIMBER,
                           ["", "Old", "New"], with_meaning=False))

    body.append('''    <section class="section" aria-label="Not losing the rankings" id="redirects">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// THE RISKY PART</p>
          <h2 class="section-title section-title--center" data-title>How a rebuild loses everything,
            and how we stopped it<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>The real danger in replacing a website is not the
            design. It is that every address Google already knows quietly stops working, and years of
            standing evaporates in a fortnight.</p>
        </div>
        <div class="rb__grid">
          <div class="rb__card"><span class="rb__ico" aria-hidden="true">&#128269;</span>
            <h3>The old address list came from three places</h3>
            <p>Search Console for what actually ranked, a crawl of the live site for what existed, and
              the old site&rsquo;s own media interface &mdash; which revealed over a hundred addresses
              a crawl alone would have missed.</p></div>
          <div class="rb__card"><span class="rb__ico" aria-hidden="true">&#129514;</span>
            <h3>Every rule was tested before launch</h3>
            <p>We replayed the redirect rules against every old address in a script, rather than
              trusting them. <strong>17 of 17</strong> old ranking addresses land on a real page, and
              none of the 79 new pages gets hijacked by a stray rule.</p></div>
          <div class="rb__card"><span class="rb__ico" aria-hidden="true">&#128207;</span>
            <h3>12 of 17 keep their exact address</h3>
            <p>A redirect passes on most of a page&rsquo;s standing, but not being redirected at all is
              better. Where the old address made sense, the new site simply uses it.</p></div>
        </div>
      </div>
    </section>''')

    body.append('''    <section class="section section--alt" aria-label="What we are not claiming" id="honest">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// THE PART OTHER CASE STUDIES LEAVE OUT</p>
          <h2 class="section-title section-title--center" data-title>What we are <em>not</em> claiming
            &mdash; yet<span class="title-underline title-underline--center"></span></h2>
        </div>
        <p class="rb__honest">On the day this was written the new site had <strong>not been live for a
          single day</strong>. It has no rankings of its own, no traffic of its own and has not
          produced one enquiry. So this page does not claim any of those things, and you should be
          wary of any agency case study that would.</p>
        <p class="rb__honest">Everything above is a measurement of what was <em>built</em>: the site
          answers faster, there are far more questions it can answer, and a search engine can finally
          tell what the business does and where. Those are the conditions for being found. They are
          not the same as being found.</p>
        <p class="rb__honest">We took the baseline the day before launch precisely so there is
          something honest to compare against. We will measure again at <strong>30, 90 and 180
          days</strong> from real Search Console data, and this page will be updated with what
          actually happened &mdash; including if it is less than we hoped.</p>
        <p class="rb__honest"><strong>Update, launch day:</strong> the new site went live on
          <strong>30 July 2026</strong>, and the first measurement on the live domain matched the
          build &mdash; server response 106&nbsp;ms, first paint 412&nbsp;ms, zero layout shift.
          Every old ranking address was re-tested live: all of them land on a real page, and the
          WordPress leftovers answer 410&nbsp;Gone. The 30/90/180-day clock starts now.</p>
        <p class="rb__note"><strong>The straight-answer promise.</strong> If we look at your site and
          a rebuild is not worth your money, we will tell you so &mdash; in writing, in the verdict.
          Sometimes the honest answer is a smaller fix, and sometimes it is &ldquo;leave it
          alone&rdquo;. We would rather lose a job than build something you did not need.</p>
      </div>
    </section>''')

    # THE HANDOVER. The funnel audit's top finding: this page wins the argument and
    # then fumbled it - the only exits were a self-serve tool and a brochure page,
    # three hops from conviction to a form. A convinced reader now gets a direct,
    # labelled path: /contact/?topic=website-rebuild preselects the enquiry topic
    # (forms.js fuzzy-matches it to the "Website rebuild / Web Care" option), so the
    # lead arrives in Slack and HubSpot already tagged as a rebuild job.
    body.append('''    <section class="section" aria-label="What happens if you get in touch" id="process">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// NO MYSTERY PROCESS</p>
          <h2 class="section-title section-title--center" data-title>What happens if you get in
            touch<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="rb__grid rb__grid--4">
          <div class="rb__card"><span class="rb__ico" aria-hidden="true">&#49;&#65039;&#8419;</span>
            <h3>Send us your web address</h3>
            <p>Or ring 01202 775566. That is all we need to start &mdash; no meeting, no forms.</p></div>
          <div class="rb__card"><span class="rb__ico" aria-hidden="true">&#50;&#65039;&#8419;</span>
            <h3>We measure it, free</h3>
            <p>The same checks you have just read: server response, requests, what a search engine
              can and cannot see.</p></div>
          <div class="rb__card"><span class="rb__ico" aria-hidden="true">&#51;&#65039;&#8419;</span>
            <h3>A written verdict, either way</h3>
            <p>Rebuild, fix what is there, or leave it alone. If a rebuild is not worth your money,
              the verdict says so.</p></div>
          <div class="rb__card"><span class="rb__ico" aria-hidden="true">&#52;&#65039;&#8419;</span>
            <h3>If it is a rebuild</h3>
            <p>A <a href="/website-rebuild/">fixed, published price</a> agreed in writing before we
              start &mdash; and your old site stays live until the new one is ready, which is exactly
              how this one could be measured the day before its swap.</p></div>
        </div>
      </div>
    </section>
<style>
/* .rb__grid.rb__grid--4, not .rb__grid--4: the base .rb__grid rules are emitted in
   the page's LAST style block, so at equal specificity they win and this four-step
   strip rendered 3+1 with an orphan. The double class outranks them at any order. */
.rb__grid.rb__grid--4{grid-template-columns:1fr}
@media (min-width:560px){.rb__grid.rb__grid--4{grid-template-columns:repeat(2,1fr)}}
@media (min-width:1000px){.rb__grid.rb__grid--4{grid-template-columns:repeat(4,1fr)}}
</style>''')

    body.append(faq_html(FAQS))
    # cta() takes (label, href) TUPLES, not two loose strings. Passing strings does
    # not error - Python happily indexes them, so primary[0]/[1] became the first two
    # CHARACTERS: href="h" with the label "C". Two dead buttons at the bottom of the
    # funnel, and my own link check missed them because it only tested hrefs starting
    # with "/". Steve found them by clicking. Hence _guard_hrefs() in build_blog.py.
    #
    # Cost line: the fixed rebuild price is PUBLISHED at /website-rebuild/ and
    # /web-care/ (source: build_extra.py ~L6708). Link it, never restate the figure
    # here - one source of truth, no drift.
    body.append(cta("Wondering about your own site?",
                    "Send us your web address and we will reply with the same before-tables you have "
                    "just read, for your site, and a straight verdict &mdash; rebuild, fix what is "
                    "there, or leave it alone. If a rebuild is not worth it, we will tell you that "
                    "too, in writing. And a rebuild is a <a href=\"/website-rebuild/\">fixed, "
                    "published price</a>, agreed before we start &mdash; not a number invented after "
                    "we have sized you up.",
                    ("Ask us to measure your site &mdash; free", "/contact/?topic=website-rebuild"),
                    ("Run the checks yourself first", "/website-checker/")))

    body.append('''
<style>
.rb__cap{caption-side:top;text-align:left;font-size:.78rem;color:var(--mut,#9fb5d3);padding:0 0 .5rem;font-family:var(--mono,monospace)}
.rb__old{color:var(--mut,#9fb5d3)}
.rb__new{color:var(--cyan,#1d97e3);font-weight:600}
.rb__note{max-width:900px;margin:1.4rem auto 0;padding:.9rem 1.1rem;border-left:3px solid var(--cyan,#1d97e3);background:var(--panel,#0d1530);border-radius:0 10px 10px 0;font-size:.88rem;line-height:1.7;color:var(--soft,#86b6e8)}
.rb__note strong{color:var(--white,#f0f5fc)}
.rb__grid{display:grid;grid-template-columns:1fr;gap:.7rem;max-width:1100px;margin:0 auto}
@media (min-width:760px){.rb__grid{grid-template-columns:repeat(3,1fr)}}
.rb__card{background:var(--panel,#0d1530);border:1px solid var(--line,#2a3b63);border-radius:13px;padding:1.05rem}
.rb__ico{font-size:1.5rem;line-height:1;display:inline-block;margin-bottom:.45rem}
.rb__card h3{margin:0 0 .4rem;font-size:.95rem;color:var(--white,#f0f5fc)}
.rb__card p{margin:0;font-size:.84rem;line-height:1.6;color:var(--soft,#86b6e8)}
.rb__honest{max-width:880px;margin:0 auto .9rem;font-size:.94rem;line-height:1.75;color:var(--soft,#86b6e8)}
.rb__honest strong{color:var(--white,#f0f5fc)}
</style>''')

    add(slug=SLUG,
        title="Website Rebuild &amp; SEO: A Measured Before and After",
        desc=desc,
        og_title="What a website rebuild actually changes - measured",
        schema=lambda s: graph([
            crumb(s, "Website Rebuild Case Study"),
            webpage(s, "Website Rebuild and SEO: A Measured Before and After",
                    "A measured before-and-after of a real WordPress-to-static website rebuild, "
                    "captured the day before the old site was replaced."),
            # There is NO "CaseStudy" type in schema.org and no case-study rich result
            # in Google, so calling it one buys nothing structurally. Article DOES exist,
            # and it is what carries the things that matter for a page like this: a named
            # author and a publication date, which is how the "measured on 30 July 2026"
            # claim becomes machine-readable rather than just prose.
            {"@type": "Article", "@id": SITE + "/%s/#article" % s,
             "headline": "What a website rebuild actually changes",
             "description": "A measured before-and-after of a real WordPress-to-static rebuild.",
             "inLanguage": "en-GB",
             "datePublished": "2026-07-30", "dateModified": TODAY,
             "author": {"@type": "Organization", "name": "365 Techies", "url": SITE + "/"},
             "publisher": {"@id": SITE + "/#business"},
             "image": SITE + "/og-image.jpg",
             "mainEntityOfPage": {"@id": SITE + "/%s/#webpage" % s},
             "url": SITE + "/%s/" % s,
             "about": [{"@type": "Thing", "name": "Website rebuild"},
                       {"@type": "Thing", "name": "Search engine optimisation"},
                       {"@type": "Thing", "name": "WordPress"},
                       {"@type": "Thing", "name": "Static site generation"}]},
            faqpage(s, FAQS),
        ]),
        content="\n".join(body))


build()
