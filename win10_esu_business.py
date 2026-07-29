# -*- coding: utf-8 -*-
"""Windows 10 ESU for business - the cost that doubles, and the year you cannot skip.

WHY THIS PAGE AND NOT ANOTHER CONSUMER ONE. The site already covers consumer
ESU properly in three places (/windows-10-end-of-life/,
/windows-10-esu-free-enrolment-help/, /windows-10-esu-or-upgrade-your-dell/) -
all of them carry the $30 one-off, the free sync-settings route and the
October 2027 consumer end date. None of them mentions 2028 or the doubling,
because that is the COMMERCIAL programme, and it behaves nothing like the
consumer one.

THE FINDING, and it is Microsoft's own published structure:

  Consumer ESU  - free if you sync settings, or $30 once, covers 10 devices,
                  runs to 12 October 2027.
  Commercial ESU - $61 per device Year One, the price DOUBLES every
                  consecutive year, a maximum of three years, and it is
                  CUMULATIVE: buy in Year Two and you pay Year One as well.

So a business that waits is not simply paying again later - it pays double,
and it cannot skip the year it missed. That is the R510 pattern exactly:
everyone assumes "we will just buy another year", and the arithmetic says the
opposite.

PRICE RULE. Microsoft publishes these in USD, so they are quoted in USD with
the source named. No conversion to GBP anywhere - an exchange rate we invented
would be a fabricated number, and 365 Techies is not VAT registered so no
figure here may be presented VAT-inclusive either.
"""
import build_pages as bp
from build_pages import add, graph, crumb, webpage, service, faqpage, faq_html, cta, hero

SLUG = "windows-10-esu-business-cost"

# Microsoft-published: $61 Year One, doubling each consecutive year, max 3 years.
Y1 = 61
Y2 = Y1 * 2
Y3 = Y2 * 2
ALL3 = Y1 + Y2 + Y3


def build():
    faqs = [
        ("How much does Windows 10 ESU cost a business?",
         "Microsoft publishes it at $61 USD per device for Year One through Volume Licensing, "
         "and states that the price doubles every consecutive year for a maximum of three years. "
         "That works out at roughly $61, then $122, then $244 per device. We quote it in dollars "
         "because that is the currency Microsoft publishes - anyone showing you a neat pound "
         "figure has picked an exchange rate for you."),
        ("Can I skip a year and buy ESU later?",
         "No, and this is the part that catches people. Microsoft states that ESUs are cumulative: "
         "if you decide to purchase the programme in Year Two, you have to pay for Year One too. "
         "So waiting does not defer the cost, it accumulates it - and at a doubled rate. A device "
         "brought in at Year Three costs all three years."),
        ("How long can a business stay on Windows 10 with ESU?",
         "A maximum of three years after end of support, which was 14 October 2025. Commercial and "
         "educational organisations can receive security updates for up to three years; after that "
         "there is no further extension. It is a runway, not a reprieve."),
        ("Is technical support included in ESU?",
         "No. Microsoft is explicit that technical support is not part of the programme - ESU "
         "covers licence activation, installation and possible regressions of the ESU itself, and "
         "nothing else. General support for Windows 10 ended on 14 October 2025. If something "
         "breaks that is not the ESU, you need a support arrangement of your own."),
        ("Is business ESU the same as the cheap consumer one?",
         "Not remotely, and conflating the two leads people badly astray. Consumer ESU is free if "
         "you sync your PC settings, or a one-off $30, covers up to ten devices, and runs to 12 "
         "October 2027. Commercial ESU is per device, per year, doubling, cumulative, and bought "
         "through Volume Licensing. If someone has quoted you the $30 figure for an office, they "
         "have quoted the wrong programme."),
        ("Are there any routes where ESU costs nothing for a business?",
         "Yes, and they are worth knowing before you sign a purchase order. Microsoft lists ESU at "
         "no additional cost for Windows 10 virtual machines on Windows 365, Azure Virtual "
         "Desktop, Azure virtual machines and several other Azure services. Windows 10 endpoints "
         "connecting to Windows 365 Cloud PCs are also entitled to ESU for up to three years with "
         "an active Windows 365 licence. Whether that suits you is a separate question, but it "
         "changes the sums."),
        ("What is the minimum number of ESU licences we can buy?",
         "One. Microsoft states the minimum purchase requirement is a single licence, so a business "
         "with three awkward machines that cannot take Windows 11 does not have to buy for the "
         "whole estate. Devices must be running Windows 10 version 22H2 to be eligible."),
    ]

    body = "\n".join([
        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>The number that changes the decision'
        '<span class="title-underline"></span></h2>',
        '<p>Most businesses still running Windows 10 have settled on a plan that sounds sensible: '
        'buy a year of Extended Security Updates, deal with it next year. It is worth knowing what '
        'that actually costs before you commit to it, because the programme is not priced the way '
        'people assume.</p>',
        '<p>Microsoft&rsquo;s own words: ESU for organisations is <strong>$61 USD per device for '
        'Year One</strong>, and <strong>the price doubles every consecutive year</strong>, for a '
        'maximum of three years.</p>',
        '<div class="table-wrap"><table class="table">',
        '<thead><tr><th>Year</th><th>Per device</th><th>Running total per device</th></tr></thead>'
        '<tbody>',
        '<tr><td>Year One (from November 2025)</td><td>$' + str(Y1) + '</td><td>$' + str(Y1) + '</td></tr>',
        '<tr><td>Year Two</td><td>$' + str(Y2) + '</td><td>$' + str(Y1 + Y2) + '</td></tr>',
        '<tr><td>Year Three (the last one)</td><td>$' + str(Y3) + '</td><td><strong>$' + str(ALL3) +
        '</strong></td></tr>',
        '</tbody></table></div>',
        '<p>Three years of keeping one machine on Windows 10 is <strong>$' + str(ALL3) + ' per '
        'device</strong> in licences alone, with no technical support included. For a lot of '
        'businesses that is a meaningful fraction of simply replacing the machine &mdash; which is '
        'the comparison worth doing, and the one nobody does because the Year One figure looks '
        'small.</p>',
        '<p class="mono" style="font-size:.8rem;opacity:.85">Quoted in USD because that is the '
        'currency Microsoft publishes. We have not converted it &mdash; an exchange rate we chose '
        'for you would be a made-up number.</p>',
        '</div></section>',

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>You cannot skip a year'
        '<span class="title-underline"></span></h2>',
        '<p>This is the part that catches people out, and it is stated plainly in '
        'Microsoft&rsquo;s documentation:</p>',
        '<div class="callout callout--warn"><p><strong>&ldquo;ESUs are cumulative.&rdquo;</strong> '
        'If you decide to purchase the programme in Year Two, <strong>you have to pay for Year One '
        'too</strong>. You cannot buy partial periods either &mdash; it is sold by the year, not '
        'in six-month blocks.</p></div>',
        '<p>So the wait-and-see plan does not work the way it feels like it should. Waiting does '
        'not defer the cost; <strong>it accumulates it, at a doubling rate</strong>. A machine you '
        'bring into the programme in Year Three costs you all three years &mdash; $' + str(ALL3) +
        ' &mdash; for one year of updates.</p>',
        '<p>And the runway is finite. Three years from end of support on 14 October 2025 is the '
        'maximum, for commercial and educational organisations alike. There is no fourth year to '
        'plan for.</p>',
        '</div></section>',

        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>If someone quoted you $30, they quoted the wrong '
        'programme<span class="title-underline"></span></h2>',
        '<p>There are two Windows 10 ESU programmes and they behave almost nothing alike. Getting '
        'them confused is the single most common mistake we see.</p>',
        '<div class="table-wrap"><table class="table">',
        '<thead><tr><th></th><th>Consumer ESU</th><th>Commercial ESU</th></tr></thead><tbody>',
        '<tr><td><strong>Cost</strong></td><td>Free if you sync PC settings, 1,000 Microsoft '
        'Rewards points, or $30 once</td><td>$' + str(Y1) + ' per device Year One, doubling '
        'annually</td></tr>',
        '<tr><td><strong>Devices</strong></td><td>Up to 10 on one licence</td>'
        '<td>Per device. Minimum purchase one licence</td></tr>',
        '<tr><td><strong>Runs until</strong></td><td>12 October 2027</td>'
        '<td>Three years from 14 October 2025</td></tr>',
        '<tr><td><strong>Bought via</strong></td><td>Your Microsoft account</td>'
        '<td>Volume Licensing</td></tr>',
        '<tr><td><strong>Cumulative?</strong></td><td>No &mdash; one enrolment</td>'
        '<td><strong>Yes</strong> &mdash; you pay for years you skipped</td></tr>',
        '</tbody></table></div>',
        '<p>If you are a household rather than a business, the consumer route is almost certainly '
        'what you want, it is very likely free, and we have written it up properly: see '
        '<a href="/windows-10-esu-free-enrolment-help/">free ESU enrolment help</a> and '
        '<a href="/windows-10-end-of-life/">what to do about Windows 10 end of life</a>.</p>',
        '</div></section>',

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Three things worth checking before you buy anything'
        '<span class="title-underline"></span></h2>',
        '<ol>',
        '<li><strong>Which machines genuinely cannot take Windows 11?</strong> The minimum ESU '
        'purchase is one licence, so you only need to cover the awkward ones. A lot of estates '
        'assume the whole fleet is stuck when a handful of machines are the actual problem. Our '
        '<a href="/dell-this-pc-cant-run-windows-11/">&ldquo;this PC can&rsquo;t run Windows '
        '11&rdquo;</a> guide explains what the message really means.</li>',
        '<li><strong>Are any of them virtual, or reaching a cloud desktop?</strong> Microsoft lists '
        'ESU at no additional cost for Windows 10 VMs on Windows 365, Azure Virtual Desktop and '
        'Azure VMs &mdash; and Windows 10 endpoints connecting to a Windows 365 Cloud PC are '
        'entitled to ESU for up to three years with an active licence. That does not suit every '
        'business, but it changes the arithmetic enough to be worth ten minutes.</li>',
        '<li><strong>Are they on version 22H2?</strong> Devices must be running Windows 10 version '
        '22H2 to be eligible at all. An older build has to be brought up first, which is work you '
        'want to know about before the deadline rather than during it.</li>',
        '</ol>',
        '<p><strong>And the comparison nobody runs:</strong> three years of ESU on one machine is '
        '$' + str(ALL3) + ' with no support attached. Put that next to the cost of a machine that '
        'runs Windows 11, is supported, and does not need revisiting in 2028. Sometimes ESU wins '
        '&mdash; a specialist machine tied to software that will not move, for instance. Often it '
        'does not, and the only reason it looked like it did was the Year One price.</p>',
        '</div></section>',

        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Where we sit on this'
        '<span class="title-underline"></span></h2>',
        '<p>We are not a licensing reseller and there is no commission in this for us either way. '
        'What we would do, and what we do for the businesses we look after, is work out which '
        'machines are actually stuck, price ESU only for those, and compare it honestly against '
        'replacing them &mdash; including the machines where the honest answer is that ESU is the '
        'right call.</p>',
        '<p>Every figure on this page comes from Microsoft&rsquo;s own published documentation, and '
        'we have named where. Licensing terms and prices do change, so confirm current pricing with '
        'your licensing provider before you commit &mdash; we would rather you checked than took '
        'our word for it.</p>',
        '<p class="mono" style="font-size:.8rem;opacity:.85">Sources: Microsoft Learn, Extended '
        'Security Updates (ESU) program for Windows 10; and Microsoft, End of support for Windows '
        '10. Referenced July 2026.</p>',
        '</div></section>',

        faq_html(faqs),
        cta("Not sure which machines are actually stuck?",
            "Tell us roughly what you are running and we will tell you honestly how many machines "
            "genuinely need ESU, and whether it is cheaper than replacing them. No licences sold "
            "here either way.",
            primary=("Call 01202 775566", "tel:+441202775566"),
            secondary=("Send us a message", "/contact/")),
    ])

    def schema(s):
        return graph([
            crumb(s, "Windows 10 ESU for Business"),
            webpage(s, "Windows 10 ESU for Business: The Cost That Doubles",
                    "Microsoft's commercial Windows 10 ESU pricing doubles every year and is "
                    "cumulative - what that actually costs over three years."),
            service(s, "Windows 10 End of Support Planning",
                    "Working out which machines genuinely need Extended Security Updates and "
                    "whether ESU is cheaper than replacement, for businesses in Dorset.",
                    "IT lifecycle planning"),
            faqpage(s, faqs),
        ])

    content = "\n".join([
        hero("", "// WINDOWS 10 ESU &middot; FOR BUSINESS",
             'Windows 10 ESU for business: <em class="grad grad--cyan">the cost that doubles</em>',
             "Microsoft prices commercial ESU at $61 per device for Year One, doubling every year "
             "after, and it is cumulative &mdash; skip a year and you still pay for it. Three "
             "years is $" + str(ALL3) + " a machine, with no technical support included.",
             cta1=("Talk to a human: 01202 775566", "tel:+441202775566"),
             cta2=("Home user instead?", "/windows-10-esu-free-enrolment-help/"),
             chips=["Microsoft-sourced figures", "No licences sold here",
                    "Quoted in USD, as published"]),
        body,
    ])

    add(slug=SLUG,
        title="Windows 10 ESU for Business: The Cost That Doubles",
        desc="Microsoft prices commercial ESU at $61 per device, doubling yearly and cumulative. "
             "Three years is $427 a machine, with no support included.",
        og_title="Windows 10 ESU for Business | 365 Techies",
        schema=schema, content=content)


build()
