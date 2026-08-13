# -*- coding: utf-8 -*-
"""The Beckox rebuild, measured - the second client case study, and the first
with a same-tool Lighthouse before-and-after.

NAMED WITH PERMISSION
---------------------
Beckox Plastic Fabrications Ltd (Poole, est. 1982) gave permission to be named
on 13 August 2026 - Reg and Scott, via Steve. Without that permission this page
would not exist; the CCB engineering page ran anonymous for exactly that reason
until Colin's say-so arrived.

WHAT THIS PAGE HAS THAT THE CCB PAGE COULD NOT
-----------------------------------------------
ccb_rebuild_case_study.py had to use direct browser measurements because
PageSpeed's keyless quota was exhausted on the day. For Beckox we ran the
LIGHTHOUSE CLI (v13.4.1) against the LIVE domain both times: the old site days
before deletion, the new site the hour it went live. Same tool, same URL, same
network - the one speed comparison nobody can pick at. Raw JSON archived at
C:\\claude\\beckox-casestudy\\old-site-archive\\lighthouse-*.json.

It also has a Search Console "before": the old site's final fortnight showed
10 clicks - every one of them the company's own name or a misspelling - and
the site ranking for OTHER companies' names more than its own trade.
(beckox-casestudy/gsc-baseline/, exported by the owner 13 Aug 2026.)

THE LINE THIS PAGE MUST NOT CROSS (same as the CCB page)
--------------------------------------------------------
Launch-day page. No ranking claims, no traffic claims, no enquiry claims for
the NEW site. The before-data is banked; the after will be reported from
Search Console whatever it says. Every number on this page was measured, is
dated, and its raw capture is archived.
"""
from build_pages import (add, graph, crumb, webpage, faqpage, faq_html, cta,
                         hero, bc, SITE, TODAY)

SLUG = "website-rebuild-case-study-beckox"

# --- Lighthouse 13.4.1, mobile, same URL (www.beckox.co.uk), same network ----
LIGHTHOUSE = [
    ("Performance score", "37 / 100", "88 / 100",
     "Google&rsquo;s overall speed grade under simulated slow-4G phone conditions &mdash; "
     "the stricter test, and the one that reflects a real visitor on a real phone."),
    ("Largest content painted", "43.7 s", "2.1 s",
     "How long before the main content is actually on screen. At 43 seconds, "
     "everyone has left."),
    ("Time to interactive", "43.7 s", "2.1 s",
     "When the page will actually respond to a tap."),
    ("Total page weight", "62,725 KiB", "366 KiB",
     "Sixty-one megabytes was ninety-nine full-resolution photographs on one page, "
     "none of them resized for the web."),
    ("SEO score", "92", "100", None),
    ("Best practices", "92", "100", None),
]

# --- browser Performance API, both sites, same afternoon ---------------------
HOMEPAGE = [
    ("Requests to load the homepage", "127", "11",
     "Every request is a round trip. Most of the old ones were images nobody asked for."),
    ("Images loaded", "99", "7",
     "The photographs were the site&rsquo;s best asset &mdash; and its biggest problem, "
     "all loading at once on one page."),
    ("Images missing alt text", "71", "0",
     "Alt text is what screen readers announce and image search reads. It also matters "
     "to every AI tool that reads pages."),
    ("HTML delivered", "86 KB", "16 KB", None),
    ("Main headings on the page", "3", "1",
     "Three H1s tells a search engine the page has three subjects &mdash; which is the "
     "same as having none."),
    ("Pages in the sitemap", "116", "32",
     "Only 20 of the old 116 were real pages; 93 were WordPress attachment clutter, one "
     "per uploaded image, each competing with the real ones."),
    ("Words of content, whole site", "605", "20,142",
     "Seventeen of the old site&rsquo;s twenty pages had under fifty words. Three product "
     "pages &mdash; fume scrubbers, process sinks, process tanks &mdash; had none at all."),
]

FAQS = [
    ("Can a website rebuild work for an industrial or B2B company?",
     "This one is the answer. Beckox sell fume scrubbers and plating lines to process "
     "engineers &mdash; about as far from a consumer business as it gets. The principles are "
     "identical: the buyers search like anyone else, and the firm that actually answers their "
     "questions in print earns the enquiry. If anything B2B rewards it more, because so few "
     "industrial competitors bother."),
    ("What did the old site actually cost Beckox?",
     "Invisibility, measured. In its final fortnight Google sent the site ten clicks &mdash; "
     "every single one someone searching the company&rsquo;s own name or a misspelling of it. "
     "Searches for the products they made &mdash; &ldquo;plastic welding&rdquo;, &ldquo;process "
     "tanks&rdquo; &mdash; got five impressions between them, because the pages for those "
     "products contained almost no words for Google to read. A 44-year-old firm with "
     "Rolls-Royce on its client list was unfindable for its own trade."),
    ("Why do you keep saying what you are NOT claiming?",
     "Because the new site went live days ago, so it has no ranking history and no traffic "
     "story yet &mdash; and any case study that claims one this early is inventing it. The "
     "before-measurements are banked and dated. Search Console will say what happened next, "
     "and this page will report it, whatever it says."),
    ("Did Beckox lose their Google standing in the switch?",
     "Protecting it was most of the engineering. Every address Google knew &mdash; 123 of "
     "them, collected from Search Console and the old site&rsquo;s own sitemaps, including 93 "
     "image-attachment pages &mdash; was replayed through the redirect rules by script before "
     "launch: 116 land on a real page and the WordPress leftovers answer 410 Gone. Twelve of "
     "the twenty real pages kept their exact address, which is better than any redirect."),
    ("The old site scored 92 for SEO. Doesn't that mean it was fine?",
     "It is the perfect example of why single scores mislead. Lighthouse&rsquo;s SEO check "
     "verifies mechanics &mdash; is there a title, is the page crawlable &mdash; not whether "
     "the content can rank. The old site passed the mechanics with 605 words across twenty "
     "pages and three product pages containing no text at all. Google&rsquo;s own click data "
     "is the truer verdict: ten clicks a fortnight, all brand searches."),
    ("What does a rebuild like this cost?",
     "A fixed, published price, agreed in writing before we start &mdash; it is on the "
     "<a href=\"/website-rebuild/\">website rebuild</a> page rather than restated here, so "
     "there is exactly one place the number lives. The old site stays live until the new one "
     "is ready, which is also how both sites here could be measured back to back."),
    ("Will you name my business in a case study too?",
     "Only if you say yes, and only after the work is done. Beckox appear on this page "
     "because Reg and Scott gave written permission; our first rebuild case study ran for "
     "weeks without naming the client until they agreed. Your name is yours."),
]


def _row(cells, head=False):
    tag = "th" if head else "td"
    return "<tr>" + "".join("<%s>%s</%s>" % (tag, c, tag) for c in cells) + "</tr>"


def _table(caption, rows, headings):
    body = []
    for r in rows:
        label, old, new, why = (list(r) + [None])[:4]
        body.append(_row(['<strong>%s</strong>' % label,
                          '<span class="rb__old">%s</span>' % old,
                          '<span class="rb__new">%s</span>' % new,
                          (why or "")]))
    return ('<div class="price-table-wrap"><table class="price-table">'
            '<caption class="rb__cap">%s</caption><thead>%s</thead><tbody>%s</tbody></table></div>'
            % (caption, _row(headings, head=True), "".join(body)))


def build():
    desc = ("Beckox of Poole, est. 1982: Lighthouse 37 to 88, 63 MB to 366 KB, 605 words "
            "to 20,142. A manufacturer's website rebuild with every number measured.")

    body = []

    body.append(hero(
        bc("Case Study: Beckox"), "// CASE STUDY &middot; NAMED WITH PERMISSION",
        'A 44-year-old manufacturer, <em class="grad grad--cyan">measured</em> before and after',
        "Beckox Plastic Fabrications have built industrial process plant in Poole since 1982 "
        "&mdash; fume scrubbers and plating lines for a client list that includes Rolls-Royce "
        "and Wessex Water. Their website was ten years old, 67 megabytes, and invisible to "
        "Google for every product they make. We rebuilt it, and measured everything: same "
        "Lighthouse, same address, days apart.",
        cta1=("See the numbers", "#lighthouse"),
        cta2=("Check your own site free", "/website-checker/"),
        chips=["Lighthouse 37 &rarr; 88", "43.7 s &rarr; 2.1 s", "605 words &rarr; 20,142"]))

    # THE SCREENSHOTS. Old side captured 1 Aug 2026 from the live WordPress site
    # (its final days), new side from the finished build. Originals archived at
    # C:\claude\beckox-casestudy\shots\ - unrepeatable since 13 Aug.
    body.append('''    <section class="section section--alt" aria-label="The two sites, side by side" id="looks">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// SAME FIRM, SAME PHOTOGRAPHS</p>
          <h2 class="section-title section-title--center" data-title>Their own work, finally given
            room<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Every photograph on both versions is a real
            Beckox job &mdash; the old site just buried ninety-nine of them on one page. The
            rebuild is designed like an engineering drawing sheet, because that is the language
            their customers read all day.</p>
        </div>
        <div class="sc__grid">
          <figure class="sc__fig">
            <span class="sc__tag sc__tag--old">Old &middot; WordPress, c.2014</span>
            <img src="/images/beckox-old-home.webp" alt="The old beckox.co.uk homepage: a dated blue WordPress theme with fourteen navigation links and an embedded video" width="1100" height="840" loading="lazy" decoding="async">
            <figcaption>The homepage until August 2026 &mdash; 67&nbsp;MB, fourteen navigation links.</figcaption>
          </figure>
          <figure class="sc__fig">
            <span class="sc__tag sc__tag--new">New &middot; static</span>
            <img src="/images/beckox-new-home.webp" alt="The rebuilt beckox.co.uk homepage: bold condensed headline reading Bespoke plastic fabrication built to last, a real plating-line photograph and a fact strip" width="1100" height="840" loading="lazy" decoding="async">
            <figcaption>The same firm, rebuilt &mdash; what they build, in the first screen.</figcaption>
          </figure>
        </div>
        <div class="sc__grid sc__grid--phones">
          <figure class="sc__fig">
            <span class="sc__tag sc__tag--old">Old &middot; narrow screen</span>
            <img src="/images/beckox-old-phone.webp" alt="The old Beckox site on a narrow screen: stacked blue navigation fills the display before any content" width="500" height="1000" loading="lazy" decoding="async">
          </figure>
          <figure class="sc__fig">
            <span class="sc__tag sc__tag--new">New &middot; narrow screen</span>
            <img src="/images/beckox-new-phone.webp" alt="The rebuilt Beckox site on the same narrow screen: headline, fact strip and photograph in one view" width="500" height="1000" loading="lazy" decoding="async">
          </figure>
        </div>
      </div>
    </section>''')

    # THE LIGHTHOUSE VERDICT - this page's spine. The one thing the CCB page
    # couldn't have (PSI quota was exhausted that day; local Lighthouse CLI is
    # the workaround we learned since).
    body.append('''    <section class="section" aria-label="Lighthouse before and after" id="lighthouse">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// GOOGLE&rsquo;S OWN TEST, TWICE</p>
          <h2 class="section-title section-title--center" data-title>Same tool, same address, days
            apart<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Most speed comparisons cheat somewhere &mdash;
            different tools, different days, a local server flattered against a live one. This one
            doesn&rsquo;t: Google&rsquo;s Lighthouse (v13.4.1), run against the live
            www.beckox.co.uk both times &mdash; the old site days before it was retired, the new
            site the hour it went live. Raw reports kept.</p>
        </div>
        %s
        <p class="rb__note"><strong>Desktop tells the same story:</strong> 55 &rarr; 90, with the
          main content painted in 0.4 seconds instead of 10.1. And an honest footnote: the mobile
          88 is not a perfect 100 &mdash; the entrance animation costs a few points of measured
          speed-index, a trade we made knowingly and will keep tuning.</p>
      </div>
    </section>''' % _table("Lighthouse mobile, live www.beckox.co.uk, August 2026",
                           LIGHTHOUSE,
                           ["", "Old (WordPress)", "New (static)", "Why it matters"]))

    body.append('''    <section class="section section--alt" aria-label="What was measured directly" id="numbers">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// COUNTED, NOT ESTIMATED</p>
          <h2 class="section-title section-title--center" data-title>The rest of the
            measurements<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Counted in the browser with both sites loaded
            back to back, the same afternoon, while the old site still existed. Once a rebuild
            ships, the &ldquo;before&rdquo; column is gone forever &mdash; measuring it first is
            the discipline most rebuilds skip.</p>
        </div>
        %s
      </div>
    </section>''' % _table("Both sites, same browser, same afternoon",
                           HOMEPAGE,
                           ["", "Old (WordPress)", "New (static)", "Why it matters"]))

    # WHAT GOOGLE ACTUALLY SENT THEM. The GSC baseline - the strongest "before"
    # evidence on the page because it is Google's own record, not our measurement.
    body.append('''    <section class="section" aria-label="What Google sent the old site" id="search">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// GOOGLE&rsquo;S OWN RECORD</p>
          <h2 class="section-title section-title--center" data-title>Ten clicks a fortnight, and
            every one was their own name<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Search Console&rsquo;s record of the old
            site&rsquo;s final fortnight, exported before the switch. This is what
            &ldquo;invisible&rdquo; looks like in Google&rsquo;s own data.</p>
        </div>
        <div class="rb__grid">
          <div class="rb__card"><span class="rb__ico" aria-hidden="true">&#128101;</span>
            <h3>10 clicks in 14 days</h3>
            <p>Nine to the homepage &mdash; and every clicked search was &ldquo;beckox&rdquo; or a
              misspelling of it. Nobody found them who wasn&rsquo;t already looking for them.</p></div>
          <div class="rb__card"><span class="rb__ico" aria-hidden="true">&#128683;</span>
            <h3>5 impressions for their products</h3>
            <p>&ldquo;Plastic welding&rdquo;, &ldquo;process tanks&rdquo;, &ldquo;plastic
              hoppers&rdquo; &mdash; one impression each. Google kept testing the site against real
              buyer searches, finding 605 words, and moving on.</p></div>
          <div class="rb__card"><span class="rb__ico" aria-hidden="true">&#129335;</span>
            <h3>It ranked for other firms&rsquo; names</h3>
            <p>A third of the query report was people searching for <em>different companies</em>.
              The site surfaced for rivals&rsquo; names more than for its own trade &mdash; the
              strangest failure mode we have measured.</p></div>
        </div>
        <p class="rb__note"><strong>The part that made it certain:</strong> the three pages for
          fume scrubbers, process sinks and process tanks &mdash; the products this firm has made
          since 1982 &mdash; contained <strong>no text whatsoever</strong>. Not thin content: none.
          There was nothing for Google to read, so there was nothing to rank. The rebuild&rsquo;s
          20,142 words exist because every one of those silences was a buyer&rsquo;s question
          nobody was answering.</p>
      </div>
    </section>''')

    body.append('''    <section class="section section--alt" aria-label="Protecting the old addresses" id="redirects">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// THE RISKY PART</p>
          <h2 class="section-title section-title--center" data-title>123 old addresses, zero left
            behind<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="rb__grid">
          <div class="rb__card"><span class="rb__ico" aria-hidden="true">&#128269;</span>
            <h3>Every address Google knew, collected</h3>
            <p>Search Console&rsquo;s page list plus both of the old site&rsquo;s sitemaps &mdash;
              including 93 image-attachment pages WordPress had quietly created, one per uploaded
              photograph, all in Google&rsquo;s index.</p></div>
          <div class="rb__card"><span class="rb__ico" aria-hidden="true">&#129514;</span>
            <h3>Replayed by script before launch</h3>
            <p>Every rule tested against every address &mdash; which caught a subtle trap that
              would have broken all 93 attachment pages, before it could. <strong>116 of 123</strong>
              land on a real page; the WordPress leftovers answer 410&nbsp;Gone on purpose.</p></div>
          <div class="rb__card"><span class="rb__ico" aria-hidden="true">&#128207;</span>
            <h3>12 of 20 real pages kept their address</h3>
            <p>The contact page, the about page, the gallery &mdash; where the old address made
              sense, the new site simply uses it. No redirect at all beats a perfect one.</p></div>
        </div>
      </div>
    </section>''')

    body.append('''    <section class="section" aria-label="What we are not claiming" id="honest">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// THE PART OTHER CASE STUDIES LEAVE OUT</p>
          <h2 class="section-title section-title--center" data-title>What we are <em>not</em>
            claiming<span class="title-underline title-underline--center"></span></h2>
        </div>
        <p class="rb__honest">The new site has been live for <strong>days</strong>. It has no
          ranking history, no traffic story and has not yet produced an enquiry we can point to.
          This page claims none of those things. The before-data is banked &mdash; ten clicks a
          fortnight, all brand &mdash; and Search Console will say what happened next. We will
          publish that comparison whatever it says.</p>
        <p class="rb__honest">One more thing worth knowing about how the site was written: it
          claims <strong>no certification, standard or accreditation of any kind</strong>, because
          none was verified with the firm before launch. Where we could not substantiate a
          capability, we removed it &mdash; including, late in the build, every mention of a
          material we could not confirm they fabricate. Their competitors&rsquo; websites make
          claims their firms may or may not hold. A site that wins an enquiry on a claim it
          cannot honour has not won anything.</p>
        <p class="rb__note"><strong>Beckox appear here by written permission.</strong> Visit the
          finished site at <a href="https://www.beckox.co.uk/" rel="noopener">beckox.co.uk</a>
          &mdash; and if you are a process engineer who needs a fume scrubber, they are very
          good at those.</p>
      </div>
    </section>''')

    body.append(faq_html(FAQS))
    # cta() takes TUPLES - see the hard-won note in ccb_rebuild_case_study.py.
    body.append(cta("Your site might be losing quietly too",
                    "The old Beckox site looked fine on a desk and was invisible in search "
                    "&mdash; nobody knew until it was measured. Send us your web address and we "
                    "will reply with the same tables you have just read, for your site, and a "
                    "straight verdict: rebuild, fix what is there, or leave it alone. A rebuild "
                    "is a <a href=\"/website-rebuild/\">fixed, published price</a> &mdash; agreed "
                    "in writing before we start.",
                    ("Ask us to measure your site &mdash; free", "/contact/?topic=website-rebuild"),
                    ("Run the checks yourself first", "/website-checker/")))

    add(slug=SLUG,
        title="Manufacturer Website Rebuild Case Study: Beckox of Poole",
        desc=desc,
        og_title="A 44-year-old manufacturer's website rebuild - measured",
        schema=lambda s: graph([
            crumb(s, "Beckox Case Study"),
            webpage(s, "Manufacturer Website Rebuild Case Study: Beckox of Poole",
                    "The rebuild of beckox.co.uk, measured before and after with the same "
                    "Lighthouse run against the same live address."),
            {"@type": "Article", "@id": SITE + "/%s/#article" % s,
             "headline": "A 44-year-old manufacturer, measured before and after",
             "description": "Lighthouse 37 to 88, 63 MB to 366 KB, 605 words to 20,142 - "
                            "the Beckox website rebuild with every number measured.",
             "inLanguage": "en-GB",
             "datePublished": "2026-08-13", "dateModified": TODAY,
             "author": {"@type": "Organization", "name": "365 Techies", "url": SITE + "/"},
             "publisher": {"@id": SITE + "/#business"},
             "image": SITE + "/images/beckox-new-home.webp",
             "mainEntityOfPage": {"@id": SITE + "/%s/#webpage" % s},
             "url": SITE + "/%s/" % s,
             "about": [{"@type": "Thing", "name": "Website rebuild"},
                       {"@type": "Thing", "name": "Manufacturing"},
                       {"@type": "Organization", "name": "Beckox Plastic Fabrications Ltd",
                        "url": "https://www.beckox.co.uk/"}]},
            faqpage(s, FAQS),
        ]),
        content="\n".join(body))


build()
