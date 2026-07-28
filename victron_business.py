# -*- coding: utf-8 -*-
"""Victron for business: energy resilience, carbon, and the UK tax reality.

HIGH-CARE PAGE. Tax content can cost a reader real money if it is wrong, so
the rules here are stricter than anywhere else on the site:

  * Every tax statement is sourced to HMRC's own manual or guidance, named
    in the text so a reader (or their accountant) can check it.
  * No worked savings figure is asserted. Rates and thresholds change at
    every Budget and depend on the reader's profits, VAT position and
    accounting period - none of which we know.
  * The page states plainly and more than once that we are not tax advisers.

The genuinely valuable finding, and the one most solar marketing gets wrong:
HMRC CA22335 designates ALL capital expenditure on solar panels as SPECIAL
RATE. Special rate assets do not qualify for full expensing, which is
main-rate only. So "100% in year one" claims about solar are wrong as stated
- the route to that relief is the Annual Investment Allowance instead, which
is capped. That distinction is worth a page on its own.
"""
import build_pages as bp
from build_pages import add, graph, crumb, webpage, service, faqpage, faq_html, cta, hero

SLUG = "victron-for-business"


def build():
    faqs = [
        ("Can a business claim 100% tax relief on solar in year one?",
         "Not through full expensing, which is the route most people have in mind. HMRC's "
         "capital allowances manual (CA22335) designates all capital expenditure on solar panels "
         "as special rate, and full expensing applies to main rate plant and machinery. Special "
         "rate assets can still attract relief - through the Annual Investment Allowance, or the "
         "50% first-year allowance for special rate expenditure with the balance going to the "
         "special rate pool - but the mechanism and the limits are different. Your accountant "
         "should confirm which applies to your business and accounting period."),
        ("What is the special rate pool and why does it matter for solar?",
         "It is the pool HMRC uses for integral features of buildings - electrical systems, "
         "heating and ventilation - and for long-life assets expected to last 25 years or more. "
         "Solar panels were specifically designated special rate from April 2012. It matters "
         "because relief in the pool is given at a lower writing-down rate than the main pool, so "
         "the timing of your relief is different from what a general 'plant and machinery' "
         "assumption would suggest."),
        ("Do you give tax advice?",
         "No, and we would be wary of any installer who did. We are an IT firm that designs and "
         "supports Victron systems. What we can do is point you at the actual HMRC references so "
         "you and your accountant are working from the source rather than from a sales brochure. "
         "Anything on this page should be confirmed with a qualified adviser before it informs a "
         "purchase."),
        ("What does Victron actually do for a business that is not off-grid?",
         "Rather more than most people assume. It is genuinely good at riding through power cuts "
         "without the interruption a conventional UPS still allows, at storing cheap overnight "
         "electricity to use during expensive hours, at making solar you already own more useful "
         "by storing what you would otherwise export, and at running equipment somewhere with no "
         "mains at all. Being off-grid is one use, not the point."),
        ("How do you measure the carbon saving rather than estimate it?",
         "By reading the system, not a spreadsheet. Victron records what was generated, what was "
         "stored and what was drawn from the grid, so the figure comes from meters rather than "
         "assumptions. That is the difference between a carbon number you can put in a tender "
         "response and one you would rather not be asked about."),
        ("Are you a Victron dealer?",
         "We are not a box-shifter. 365 Techies was accepted into the Victron Recommended "
         "Software Integrator programme in July 2026, which is a recognition of the software and "
         "monitoring work we do on top of Victron systems. We also run our own business off one, "
         "because our office is a van - so the advice comes from operating it daily, not from a "
         "product sheet."),
    ]

    body = "\n".join([
        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Being off-grid is one use, not the point'
        '<span class="title-underline"></span></h2>',
        '<p>Most businesses meet Victron in the context of boats, vans and remote cabins, and '
        'conclude it is not for them. That is a shame, because the same equipment does four '
        'things that ordinary commercial premises genuinely need.</p>',
        '<div class="table-wrap"><table class="table">',
        '<thead><tr><th>What it does</th><th>Who it is actually for</th></tr></thead><tbody>',
        '<tr><td><strong>Rides through a power cut without a blink</strong></td>'
        '<td>Anyone whose tills, servers, cold storage or production line does not enjoy an '
        'unplanned restart. It holds the load rather than gracefully shutting it down.</td></tr>',
        '<tr><td><strong>Stores cheap electricity for expensive hours</strong></td>'
        '<td>Businesses on a tariff with a meaningful day/night spread. You buy when it is '
        'cheap and use it when it is not.</td></tr>',
        '<tr><td><strong>Makes solar you already own worth more</strong></td>'
        '<td>Anyone exporting midday generation for very little and buying it back at four in '
        'the afternoon for a great deal more.</td></tr>',
        '<tr><td><strong>Runs things where there is no mains</strong></td>'
        '<td>Yards, outbuildings, remote units, temporary sites &mdash; where a grid connection '
        'is a five-figure quote and a long wait.</td></tr>',
        '</tbody></table></div>',
        '<p>We are not neutral on this: <strong>our own business runs off one</strong>. Our office '
        'is a van, and it is powered by exactly the sort of system described here. You can see '
        'our live data on the <a href="/off-grid-victron-energy/">off-grid page</a> &mdash; not a '
        'demo, our actual working system.</p>',
        '</div></section>',

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Carbon you can evidence, not estimate'
        '<span class="title-underline"></span></h2>',
        '<p>Carbon reporting has quietly stopped being optional. If you tender for public sector '
        'work, supply a larger company, or answer a procurement questionnaire, you have probably '
        'already been asked for numbers &mdash; and most businesses answer with an estimate from '
        'a spreadsheet.</p>',
        '<p>A monitored energy system answers with <strong>meter readings</strong>. What was '
        'generated, what was stored, what was drawn from the grid, hour by hour, going back '
        'months. That is a materially stronger answer, and it is the difference between a figure '
        'you can put in a tender response and one you would rather nobody probed.</p>',
        '<p>This is where our own work sits. We build <a href="/custom-vrm-dashboards/">custom '
        'Victron dashboards</a> for customers worldwide, and being able to produce a defensible '
        'carbon and consumption report is one of the most common reasons businesses ask for '
        'one.</p>',
        '<p><strong>The honest caveat:</strong> a battery on its own does not reduce carbon. '
        'Storing grid electricity and using it later moves consumption around; it does not create '
        'clean energy. The reduction comes from generation you own and from displacing high-carbon '
        'peak grid supply. We would rather say that plainly than let a system be bought on a '
        'promise it cannot keep.</p>',
        '</div></section>',

        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>The UK tax position &mdash; and the bit almost '
        'everyone gets wrong<span class="title-underline"></span></h2>',
        '<p><strong>We are not tax advisers.</strong> What follows is sourced to HMRC&rsquo;s own '
        'published material and named so that you and your accountant can check it. Do not act on '
        'it without professional advice &mdash; rates and thresholds change at every Budget.</p>',
        '<p>With that said, here is the point that a great deal of solar marketing gets wrong, and '
        'it is worth knowing before you read anyone&rsquo;s savings figure.</p>',
        '<div class="callout callout--warn"><p><strong>Solar is a special rate asset, not main '
        'rate.</strong> HMRC&rsquo;s Capital Allowances Manual at <strong>CA22335</strong> states '
        'that all capital expenditure on the provision of solar panels is designated special rate '
        '&mdash; and has been since April 2012. <strong>Full expensing applies to main rate plant '
        'and machinery.</strong> So a claim that solar attracts &ldquo;100% relief in year one '
        'under full expensing&rdquo; is, as stated, wrong.</p></div>',
        '<p>That does <em>not</em> mean there is no relief. It means the route is different, and '
        'the difference matters to your cash flow:</p>',
        '<ul>',
        '<li><strong>The Annual Investment Allowance</strong> does cover special rate expenditure, '
        'and for many small and medium businesses this is the route to full relief in the year of '
        'purchase. It is capped, and the cap is shared across all your qualifying spend for the '
        'period &mdash; so a solar project may compete with the van and the machinery.</li>',
        '<li><strong>The 50% first-year allowance for special rate expenditure</strong> gives half '
        'in year one, with the balance going into the special rate pool in the following '
        'accounting period.</li>',
        '<li><strong>The special rate pool writes down more slowly</strong> than the main pool. '
        'Same total relief eventually; different timing, and timing is the whole point of a tax '
        'question.</li>',
        '</ul>',
        '<p>The practical upshot: <strong>ask your accountant which route applies to your business '
        'and your accounting period, before you commit.</strong> The answer depends on your '
        'profits, your other capital spend that year and your VAT position, none of which an '
        'installer knows.</p>',
        '<p>We publish no savings figure on this page for exactly that reason. Anyone showing you '
        'one without having seen your accounts is showing you a number they invented.</p>',
        '<p class="mono" style="font-size:.8rem;opacity:.8">Source: HMRC Capital Allowances Manual '
        'CA22335 (solar panels), and HMRC guidance on capital allowance rates and pools. '
        'Referenced July 2026 &mdash; confirm current treatment before relying on it.</p>',
        '</div></section>',

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Why an IT firm, and why us'
        '<span class="title-underline"></span></h2>',
        '<p>A fair question. Plenty of firms will sell and fit the hardware.</p>',
        '<p>What tends to be missing afterwards is <strong>the software, the monitoring and the '
        'reporting</strong> &mdash; knowing what the system is actually doing, proving it to a '
        'procurement team, spotting a fault before it becomes an outage, and integrating it with '
        'the rest of the business. That is our trade rather than a sideline.</p>',
        '<p>In July 2026 we were accepted into <strong>Victron&rsquo;s Recommended Software '
        'Integrator programme</strong> &mdash; a recognition of exactly that work. We are not a '
        'box-shifter, and we are not pretending to be an electrical contractor: installation is '
        'done by properly qualified people. What we bring is what happens after the kit is on the '
        'wall.</p>',
        '<p>And, again, we run our own company on one. When we say a system holds a load through a '
        'power cut, that is because ours does, daily, for a business that cannot afford to be '
        'offline.</p>',
        '</div></section>',

        faq_html(faqs),
        cta("Worth a conversation before anyone quotes you",
            "Tell us what you are trying to achieve &mdash; resilience, running costs, carbon "
            "reporting, or power somewhere there is none. We will tell you honestly whether "
            "Victron is the right answer, including when it is not.",
            primary=("Call 01202 775566", "tel:+441202775566"),
            secondary=("Send us a message", "/contact/")),
    ])

    def schema(s):
        return graph([
            crumb(s, "Victron for Business"),
            webpage(s, "Victron for Business",
                    "Energy resilience, evidenced carbon reporting and the UK capital allowances "
                    "position for business Victron systems."),
            service(s, "Victron Energy Systems for Business",
                    "Design, monitoring and reporting for Victron energy systems in commercial "
                    "premises - resilience, peak shaving, solar self-consumption and off-grid.",
                    "Energy system design and monitoring"),
            faqpage(s, faqs),
        ])

    content = "\n".join([
        hero("", "// VICTRON FOR BUSINESS &middot; UK",
             'Victron for <em class="grad grad--cyan">business</em>: resilience, carbon, '
             'and the tax question',
             "Power cuts that do not stop you trading, cheap electricity stored for expensive "
             "hours, and carbon figures backed by meter readings rather than estimates. Plus the "
             "capital allowances point most solar marketing gets wrong.",
             cta1=("Talk to a human: 01202 775566", "tel:+441202775566"),
             cta2=("See our own live system", "/off-grid-victron-energy/"),
             chips=["Victron Recommended Software Integrator", "HMRC-sourced tax references",
                    "We run our own business on one"]),
        body,
    ])

    add(slug=SLUG,
        title="Victron for Business: Resilience, Carbon & UK Tax",
        desc="Power cuts that do not stop you trading, carbon figures from meters not estimates, "
             "and the capital allowances point most solar marketing gets wrong.",
        og_title="Victron for Business | 365 Techies",
        schema=schema, content=content)


build()
