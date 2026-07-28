# -*- coding: utf-8 -*-
"""
The eleven pages of the ageing-access-point cluster.

EDITORIAL CONTRACT (from the research brief - breaking any of these makes the cluster
worth less than the reseller content it exists to beat):
  * No prices anywhere. Not for hardware, not for licences, not for our labour.
  * Never imply partnership, authorisation or reseller status with any vendor.
  * No invented launch dates, specs or EOL dates. Unverified -> "Check with vendor".
  * RUCKUS APs have no "End of Software Maintenance" milestone. Don't invent one.
  * Meraki devices don't "brick" on licence expiry - they stop passing CLIENT traffic.
  * No component-ageing folklore ("the capacitors go at ten years"). No vendor says it.
  * The dealership stays anonymous until the owner has written permission to name it.
"""
import build_pages as bp
from build_pages import add, hero, bc, cta, graph, crumb, webpage, tiles, grid_cards, checklist
import ap_cluster as C
import ap_lifecycle_data as D

_H = lambda s: s  # readability marker for long HTML blocks


def _page(slug, title, desc, h1, eyebrow, lede, body, chips=None, cta1=None, cta2=None,
          faq=None, og=None):
    """Every page: hero, disclaimer, body, our free tool, cluster nav, contact CTA."""
    content = "\n".join([
        hero(bc(title.split(" | ")[0][:38]), eyebrow, h1, lede,
             cta1=cta1 or ("Talk to a human: 01202 775566", "tel:+441202775566"),
             cta2=cta2 or ("Free Wi-Fi survey tool", "/wifi-signal-test/"),
             chips=chips or ["Vendor sources linked", "Dates checked " + D.DATES_CHECKED_HUMAN,
                             "Independent &mdash; we sell no vendor&rsquo;s kit"]),
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>'
        + C.disclaimer_block() + '</div></section>',
        body,
        C.survey_cta(),
        C.cluster_nav(slug),
        cta("Not sure what you're looking at?",
            "Send us a photo of the label on one access point and the make of your controller. "
            "We'll tell you what you've got, what its dates are, and whether it's actually your "
            "problem &mdash; no charge for the answer.",
            primary=("Call 01202 775566", "tel:+441202775566"),
            secondary=("Business Wi-Fi installation", "/business-wifi-installation/")),
    ])

    def schema(s, _d=desc, _t=title, _f=faq):
        nodes = [crumb(s, title.split(" | ")[0][:60]),
                 webpage(s, title.split(" | ")[0][:60], _d)]
        # FAQPage ONLY where the page genuinely answers one clear question. This is the
        # surface an AI assistant quotes from - an explicit Q&A with a dated answer is far
        # more citable than prose. A FAQPage on a page without a real Q&A is spam.
        if _f:
            nodes.append({
                "@type": "FAQPage",
                "@id": bp.SITE + "/" + s + "/#faq",
                "mainEntity": [{
                    "@type": "Question", "name": q,
                    "acceptedAnswer": {"@type": "Answer", "text": a},
                } for q, a in _f],
            })
        return graph(nodes)

    add(slug=slug, title=title, desc=desc, og_title=og or title.split(" | ")[0][:60],
        schema=schema, content=content)


# ===========================================================================
# PILLAR
# ===========================================================================
def pillar():
    body = "\n".join([
        '    <section class="section" aria-label="The short answer"><div class="wrap wrap--narrow prose" data-reveal>',
        '<p class="eyebrow mono">/01 &mdash; THE SHORT ANSWER</p>',
        '<h2 class="section-title" data-title>Most access points are retired for the wrong reason'
        '<span class="title-underline"></span></h2>',
        '<p>Access points almost never wear out. They are retired because the world around them '
        'moves &mdash; the phones get newer, the security bar rises, the controller stops being '
        'supported &mdash; and somewhere along the way someone decides the hardware is &ldquo;old&rdquo; '
        'and quotes for eighteen new ones.</p>',
        '<p>Sometimes that is right. Often it is not. The tables below are here so you can tell '
        'which, using the vendor&rsquo;s own published dates rather than anyone&rsquo;s sales '
        'pitch &mdash; ours included.</p>',
        '<p><strong>The single most useful thing on this page:</strong> a RUCKUS R510, a 2016 '
        'access point that plenty of people will tell you is obsolete, is supported by the vendor '
        'until <strong>31 December 2028</strong>. If someone has told you your R510s are '
        'out of support today, they are wrong against RUCKUS&rsquo;s own table.</p>',
        C.dates_stamp(),
        '</div></section>',

        '    <section class="section section--alt" aria-label="Lifecycle table"><div class="wrap prose" data-reveal>',
        '<p class="eyebrow mono">/02 &mdash; THE DATES</p>',
        '<h2 class="section-title" data-title>Every model we could verify'
        '<span class="title-underline"></span></h2>',
        '<p>Sorted as the vendors publish them. Note the ordering: some <em>newer</em> models '
        'lose support <em>sooner</em> than older ones &mdash; the RUCKUS R730 (Wi-Fi 6) ends '
        'support before the R510 (Wi-Fi 5) does. Age is not the same as remaining life.</p>',
        C.table_lifecycle(),
        '<p><strong>Not listed?</strong> We only publish what we could verify from a vendor '
        'source. This cluster covers RUCKUS and Cisco Aironet, plus Meraki licensing and the '
        'Meraki Wi-Fi 5 access points. If you run Aruba, Ubiquiti, TP-Link Omada, Zyxel or '
        'EnGenius, we have not yet verified those dates and will not guess at them &mdash; '
        'ring us and we will look them up with you.</p>',
        '</div></section>',

        '    <section class="section" aria-label="Milestone vocabulary"><div class="wrap prose" data-reveal>',
        '<p class="eyebrow mono">/03 &mdash; WHAT THE WORDS MEAN</p>',
        '<h2 class="section-title" data-title>&ldquo;End of life&rdquo; is four different things'
        '<span class="title-underline"></span></h2>',
        '<p>This is where most expensive misunderstandings begin. RUCKUS publishes three '
        'milestones for access points; Cisco publishes seven. They do not line up, and the one '
        'everybody quotes &mdash; end of sale &mdash; is the one that matters least.</p>',
        C.milestone_glossary(),
        C.ap_fact('RUCKUS access points do not have an &ldquo;End of Software Maintenance&rdquo; '
                  'date at all. Their table gives a <em>last supported software release</em> &mdash; '
                  'a version number, not a date. That distinction is why two identical-looking '
                  'estates can have completely different upgrade deadlines.', "ruckus_eol"),
        '</div></section>',

        '    <section class="section section--alt" aria-label="Specifications"><div class="wrap prose" data-reveal>',
        '<p class="eyebrow mono">/04 &mdash; THE SPECS, AND THE POE COLUMN</p>',
        '<h2 class="section-title" data-title>What each model does &mdash; and what it quietly '
        'stops doing<span class="title-underline"></span></h2>',
        '<p>The right-hand columns are the ones worth your time. An access point running on '
        'less power than it wants does not fail, complain or show a warning. It reports as '
        'perfectly healthy while running with fewer aerials, a dead second network port and, on '
        'some models, no USB and no IoT radio. It is the most commonly missed fault in business '
        'Wi-Fi, and it costs nothing to check.</p>',
        C.table_specs(),
        '<p><a href="/access-point-poe-af-at-upgrade-trap/">The full PoE trap, explained</a> '
        '&mdash; including why &ldquo;just swap the access points&rdquo; usually understates '
        'the job by a switch.</p>',
        '</div></section>',

        '    <section class="section" aria-label="When not to replace"><div class="wrap wrap--narrow prose" data-reveal>',
        '<p class="eyebrow mono">/05 &mdash; WHEN <em>NOT</em> TO REPLACE</p>',
        '<h2 class="section-title" data-title>The advice nobody selling hardware will give you'
        '<span class="title-underline"></span></h2>',
        '<p>If your estate is patched, powered properly, and managed by a controller that is '
        'itself still supported, and your complaint is one dead spot in one room &mdash; '
        'replacement is not your answer. A channel plan, a power fix or moving one access point '
        'probably is.</p>',
        '<p>An ageing estate that misbehaves in ' + D.DATES_CHECKED_HUMAN[-4:] + ' is usually a '
        '<em>capability and lifecycle</em> conversation, not an out-of-support emergency. Those '
        'are different problems with very different price tags, and it is worth knowing which '
        'one you have before anyone quotes.</p>',
        tiles([
            ("eye", "It works and it's patched",
             "Then you have a capability question, not a fault. Ask what you actually need that "
             "it cannot do &mdash; and if the answer is nothing, do nothing."),
            ("shield", "It works but can't be patched",
             "That is a risk decision somebody in the business has to take knowingly. "
             "<a href=\"/unsupported-access-point-security-risk/\">Here is how to weigh it</a>."),
            ("clock", "The controller is out of support",
             "This is usually the real deadline, and it is not the access points. "
             "<a href=\"/wifi-controller-end-of-life/\">Why the controller decides</a>."),
            ("users", "It's fine at 9am and awful at 2pm",
             "That is capacity, not age. A 2x2 access point rated &lsquo;up to 100 clients&rsquo; "
             "and thirty modern devices is an airtime problem, not a broken one."),
        ]),
        '</div></section>',

        '    <section class="section section--alt" aria-label="Checklist"><div class="wrap wrap--narrow prose" data-reveal>',
        '<p class="eyebrow mono">/06 &mdash; BEFORE YOU RING ANYONE</p>',
        '<h2 class="section-title" data-title>Eight checks you can run yourself'
        '<span class="title-underline"></span></h2>',
        '<p>Ordered cheapest and most diagnostic first. Write the answers down &mdash; whoever '
        'ends up doing the work, this list will save you money.</p>',
        checklist([
            "<strong>Is it everything, or is it some?</strong> All access points at once points "
            "at the controller, a licence, an uplink or a power event. A subset points at those "
            "specific units, their switch or their cabling.",
            "<strong>Is it timed?</strong> Note the interval. Regular cycles &mdash; roughly "
            "hourly, four-hourly, twelve-hourly &mdash; are heartbeat, keepalive, DHCP lease or "
            "scheduled-task behaviour. Radio problems do not keep a timetable.",
            "<strong>Check the negotiated PoE class on every port</strong>, on the switch, not "
            "the access point. Highest-yield check in the list.",
            "<strong>Check the switch's total PoE budget</strong>, not just the per-port class. "
            "A switch that can deliver full power to four ports and reduced power to the rest "
            "produces a coverage complaint that looks random.",
            "<strong>Check switch port errors, speed and duplex.</strong> CRC errors, a port "
            "renegotiated to 100Mbps half-duplex or a flapping link is a cabling fault, not a "
            "Wi-Fi fault.",
            "<strong>Check your firmware against the patch floors below.</strong> This is a "
            "two-minute check with a security consequence.",
            "<strong>Check access-point uptime.</strong> One unit with a much shorter uptime "
            "than its neighbours is either losing power or crashing &mdash; different faults, "
            "different fixes.",
            "<strong>Cisco owners: check the manufacture date.</strong> If it was built before "
            "2017, is over ten years old and has stopped joining the controller, "
            "<a href=\"/cisco-access-point-wont-join-controller/\">read this first</a> &mdash; "
            "it is probably a certificate, not a failure.",
        ]),
        C.table_patch_floors(),
        '</div></section>',
    ])
    _page(C.PILLAR,
          "Access Point End-of-Support Dates: When to Replace | 365 Techies",
          "End-of-sale and end-of-support dates for RUCKUS and Cisco Aironet business access "
          "points, from the vendors' own notices, checked " + D.DATES_CHECKED_HUMAN + ". Plus the "
          "honest version: when your ageing access points do not need replacing at all.",
          'Your access points are old. <em class="grad grad--cyan">Does it actually matter?</em>',
          "// LIFECYCLE &middot; CHECKED " + D.DATES_CHECKED_HUMAN.upper(),
          "End-of-support dates for RUCKUS and Cisco business access points, taken from the "
          "vendors' own published notices &mdash; and the part nobody selling hardware tells "
          "you: when ageing access points are fine, and what to check before you spend anything.",
          body)


# ===========================================================================
# S1 - RUCKUS EOL
# ===========================================================================
def s1_ruckus():
    body = "\n".join([
        '    <section class="section"><div class="wrap prose" data-reveal>',
        '<h2 class="section-title" data-title>Every RUCKUS access point, with its real dates'
        '<span class="title-underline"></span></h2>',
        C.dates_stamp(),
        C.table_lifecycle("RUCKUS"),
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Three things this table shows that people get wrong'
        '<span class="title-underline"></span></h2>',
        '<p><strong>1. Newer does not mean longer.</strong> The R730 is a Wi-Fi 6 access point '
        'and its support ends 28/02/2027. The R510 is an older Wi-Fi 5 access point and its '
        'support runs to 31/12/2028 &mdash; nearly two years longer. If you are prioritising '
        'replacements by age, you may be replacing them in the wrong order.</p>',
        '<p><strong>2. The current models have no end-of-life dates at all.</strong> The R550, '
        'R650, R750, R850, R670 and R770 have no announced end of sale or end of support. You '
        'will see 31/01/2022 attached to them in various places online. That date belongs to the '
        'Wi-Fi 5 generation, not to these.</p>',
        '<p><strong>3. &ldquo;Five years after end of sale&rdquo; is a rule of thumb, not the '
        'rule.</strong> RUCKUS publishes a general policy, but the per-product table governs and '
        'sometimes exceeds it &mdash; the R510 went end of sale on 31/01/2022 and is supported '
        'to 31/12/2028, which is nearly seven years. Use the table, not the arithmetic.</p>',
        C.table_wpa3_firmware(),
        '<p><strong>Why that table matters more than the datasheet.</strong> WPA3 arrived on the '
        'Wi-Fi 5 RUCKUS access points <em>by firmware</em>, not in the box. The 2019 revision of '
        'the R710 and R720 datasheets lists no WPA3 at all; the 2020 revision of the same '
        'datasheet does. So &ldquo;does my access point support WPA3?&rdquo; is really two '
        'questions &mdash; is the hardware capable, and is your controller new enough to offer '
        'it. We checked the negative case too: ZoneDirector 10.2 and Unleashed 200.7 contain no '
        'mention of WPA3 anywhere.</p>',
        C.ap_fact('The last supported software release is a version number, not a date. An R500 '
                  'tops out at ZoneDirector 10.4.x while an R600 of the same era reaches 10.5.x. '
                  'If your controller needs to move to 10.5 to be patched, the R500s are what '
                  'stops you &mdash; and retiring a handful of old units can be what unlocks '
                  'patching all the rest.', "ruckus_eol"),
        '</div></section>',
        '    <section class="section"><div class="wrap prose" data-reveal>',
        '<h2 class="section-title" data-title>Specifications<span class="title-underline"></span></h2>',
        C.table_specs("RUCKUS"),
        '</div></section>',
    ])
    _page("ruckus-access-point-end-of-life",
          "RUCKUS Access Point End-of-Life Dates: R310 to R770 | 365 Techies",
          "End-of-sale and end-of-support dates for RUCKUS access points R310, R500, R510, R610, "
          "R710, R720, R730 and the current R-series, from the vendor's own end-of-life table. "
          "Checked " + D.DATES_CHECKED_HUMAN + ".",
          'RUCKUS access points: <em class="grad grad--green">the real end-of-life dates</em>',
          "// RUCKUS &middot; VENDOR TABLE",
          "R310 to R770, checked against the vendor's own end-of-life table &mdash; including "
          "the three things people most often get wrong about it.",
          body)


# ===========================================================================
# S2 - Is my R510 too old (the trust page)
# ===========================================================================
def s2_r510():
    body = "\n".join([
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>The short answer: no, not on paper'
        '<span class="title-underline"></span></h2>',
        '<p>RUCKUS supports the R510 until <strong>31 December 2028</strong>. It went end of '
        'sale on 31 January 2022, which means you cannot buy a new one &mdash; but end of sale '
        'and end of support are different things, and it is the second one that decides whether '
        'your kit is a problem.</p>',
        C.ap_fact('R510: end of sale 31/01/2022, end of support 31/12/2028, last supported '
                  'software SmartZone 6.1.x (AP zone) or ZoneDirector 10.5.x. Announced 31 May '
                  '2016, shipping July 2016.', "ruckus_eol"),
        '<p>So if someone has told you that your 2016 access points are unsupported and must be '
        'replaced this year, that is not what the vendor says. Ask them to show you the date.</p>',
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Four things that <em>do</em> make an R510 estate a '
        'problem<span class="title-underline"></span></h2>',
        '<p>Being in support is not the same as being fine. Here is what actually goes wrong with '
        'this generation, in the order we find it.</p>',
        grid_cards([
            ("The controller, not the access points",
             "A ZoneDirector 1200 went end of sale in August 2022. If your controller is the "
             "component running out of road, replacing access points achieves nothing. "
             "<a href=\"/wifi-controller-end-of-life/\">This is usually the real deadline.</a>"),
            ("Are you actually patched?",
             "The R510 generation is still receiving security fixes &mdash; but only if someone "
             "applies them. Check your build against the floors on "
             "<a href=\"/unsupported-access-point-security-risk/\">the patching page</a>. "
             "&ldquo;Frozen but still patched&rdquo; is not the same as abandoned."),
            ("Two aerials, thirty modern devices",
             "The R510 is a 2x2 access point. It was specified when a busy room meant a dozen "
             "laptops. If your complaint is that it is fine first thing and hopeless by "
             "mid-morning, that is airtime and client density &mdash; a design problem, not a "
             "faulty access point."),
            ("The power trap in reverse",
             "RUCKUS marketed the R510 as running on existing 802.3af switches &mdash; so R510 "
             "estates usually sit on af-only switches. Every Wi-Fi 6 successor needs 802.3at. "
             "<a href=\"/access-point-poe-af-at-upgrade-trap/\">That is the hidden cost of the "
             "upgrade nobody quotes for.</a>"),
        ]),
        '</div></section>',
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>So should you replace them?'
        '<span class="title-underline"></span></h2>',
        '<p>Our honest position, and we sell no vendor&rsquo;s hardware, so take it as read that '
        'we have nothing to gain either way:</p>',
        checklist([
            "<strong>If they are patched, powered properly and the controller is supported</strong> "
            "&mdash; keep them. Fix the specific complaint. Revisit in 2027 with the 2028 date in "
            "your budget diary.",
            "<strong>If the room is busy and the complaint is speed at peak times</strong> "
            "&mdash; you have a capacity problem. More or better-placed access points may help; "
            "newer ones on the same plan may not.",
            "<strong>If the controller is the constraint</strong> &mdash; price that first. It "
            "often changes the whole shape of the project.",
            "<strong>If you cannot patch them</strong> &mdash; now it is a security decision, and "
            "it needs a named person in the business to make it knowingly.",
        ]),
        '</div></section>',
    ])
    _page("is-my-ruckus-r510-too-old",
          "Is My RUCKUS R510 Too Old? The Honest Answer | 365 Techies",
          "RUCKUS supports the R510 until 31 December 2028. Here is what that means, the four "
          "things that genuinely make an R510 estate a problem, and how to tell whether yours "
          "needs replacing at all.",
          'Is my RUCKUS R510 <em class="grad grad--green">too old?</em>',
          "// THE HONEST ANSWER",
          "Someone has told you your 2016 access points need replacing. Before you spend "
          "anything: the vendor supports the R510 until the end of 2028. Here is what actually "
          "matters instead.",
          body,
          faq=[("Is the RUCKUS R510 still supported?",
                "Yes. RUCKUS supports the R510 until 31 December 2028. It went end of sale on "
                "31 January 2022, which means you cannot buy a new one, but end of sale and end "
                "of support are different things. Checked against the vendor's own end-of-life "
                "table on " + D.DATES_CHECKED_HUMAN + "."),
               ("Do I need to replace my RUCKUS R510 access points?",
                "Not on age alone. If they are patched, powered correctly and your controller is "
                "still supported, replacement is not the answer to a single dead spot. The four "
                "things that genuinely make an R510 estate a problem are an unsupported "
                "controller, unapplied firmware patches, client density against its 2x2 radios, "
                "and the fact that every Wi-Fi 6 successor needs 802.3at power where the R510 "
                "ran on 802.3af.")])


# ===========================================================================
# S3 - Cisco Aironet EOL
# ===========================================================================
def s3_cisco():
    body = "\n".join([
        '    <section class="section"><div class="wrap prose" data-reveal>',
        '<h2 class="section-title" data-title>Cisco Aironet: the dates, and the seven milestones'
        '<span class="title-underline"></span></h2>',
        '<p>Cisco publishes more lifecycle milestones than anyone else, and the gaps between '
        'them matter. An access point can be past <em>End of Software Maintenance</em> &mdash; '
        'no more bug fixes &mdash; while still receiving security patches for years. Then that '
        'stops too. Those are two different risk positions and they deserve two different '
        'decisions.</p>',
        C.dates_stamp(),
        C.table_lifecycle("Cisco"),
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>What you have actually lost'
        '<span class="title-underline"></span></h2>',
        '<p>The Aironet 1700, 2700 and 3700 all passed their last date of support on '
        '30 April 2024. In practice that means three things, in rising order of seriousness:</p>',
        checklist([
            "<strong>No support case, at any price.</strong> If it breaks you are on your own or "
            "on the second-hand market.",
            "<strong>No security patches.</strong> A vulnerability found tomorrow will never be "
            "fixed on your hardware. This is the one that matters for compliance.",
            "<strong>A software ceiling on everything else.</strong> One old unit holds the whole "
            "controller back, because the controller version that still supports it is the "
            "version you are stuck on.",
        ]),
        C.ap_fact('Cisco 2700 owners: the datasheet states the access point &ldquo;will '
                  'dynamically shift from 3x4 to 3x3&rdquo; when it cannot get enough power. '
                  'It does not warn you. It just gets quieter.', "cisco_eol"),
        '<p>If your Cisco access points have stopped joining the controller rather than simply '
        'ageing, stop reading this page and '
        '<a href="/cisco-access-point-wont-join-controller/">check the certificate date first</a> '
        '&mdash; that is a completely different problem with a completely different fix.</p>',
        '</div></section>',
        '    <section class="section"><div class="wrap prose" data-reveal>',
        '<h2 class="section-title" data-title>Specifications<span class="title-underline"></span></h2>',
        C.table_specs("Cisco"),
        '</div></section>',
    ])
    _page("cisco-aironet-end-of-life",
          "Cisco Aironet End-of-Life Dates Explained | 365 Techies",
          "End-of-sale, end-of-software-maintenance and last-date-of-support dates for Cisco "
          "Aironet access points, from Cisco's own bulletins - and what each milestone actually "
          "costs you. Checked " + D.DATES_CHECKED_HUMAN + ".",
          'Cisco Aironet: what <em class="grad grad--cyan">&ldquo;end of support&rdquo;</em> '
          'actually costs you',
          "// CISCO AIRONET &middot; VENDOR BULLETINS",
          "My Cisco access points still work. Cisco says end of support. What have I actually "
          "lost? The dates, the milestones, and the honest answer.",
          body)


# ===========================================================================
# S4 - certificate expiry
# ===========================================================================
def s4_certs():
    body = "\n".join([
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>If it worked yesterday and refuses today, read this '
        'before you buy anything<span class="title-underline"></span></h2>',
        '<p>There is a failure that looks exactly like a dead access point but is not one. The '
        'access point is fine. Its <em>identity</em> has expired.</p>',
        '<p>Every Cisco wireless device carries a manufacturing certificate proving it is genuine, '
        'so the controller will trust it. Those certificates have a ten-year life. When one '
        'expires the access point can no longer prove who it is, the controller refuses it, and '
        'you get a unit that boots, gets an address, and then just sits there.</p>',
        C.ap_advisory('Cisco&rsquo;s own words: &ldquo;All Cisco wireless products that were '
                      'manufactured after July 18, 2005, have SHA-1 MICs that expire after 10 '
                      'years&rdquo; &mdash; and &ldquo;the likelihood that this issue will be '
                      'encountered is 100 percent for Cisco Wireless APs and WLCs that are more '
                      'than 10 years old and were manufactured before 2017.&rdquo;',
                      "Cisco Field Notice FN63942",
                      "https://www.cisco.com/c/en/us/support/docs/field-notices/639/fn63942.html"),
        '<p><strong>One hundred percent.</strong> Not a risk &mdash; a certainty, on a timer. If '
        'your Cisco access points were made before 2017, this is coming for them, and it has '
        'nothing to do with whether the hardware is healthy.</p>',
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Three failure signatures, three different notices'
        '<span class="title-underline"></span></h2>',
        grid_cards([
            ("It joins, then drops, then never returns",
             "Certificate expiry (Field Notice FN63942). Check the manufacture date encoded in "
             "the serial number first &mdash; if the unit is over ten years old and pre-2017, "
             "this is almost certainly it."),
            ("Stuck in &lsquo;Downloading&rsquo;",
             "A separate, dated failure (Field Notice FN72524) affecting access points after "
             "4 December 2022. Same symptom family, different cause, different fix."),
            ("Dead after a reboot, never comes back",
             "Flash corruption stranding (Field Notice FN70330). Worth knowing about before you "
             "reboot a fleet of ageing access points on a Friday afternoon."),
        ]),
        '<p>All three are published by Cisco, all three are free to read, and all three are '
        'routinely mistaken for &ldquo;the access points are worn out&rdquo;. Read the notice '
        'that matches your symptom before anyone quotes you for hardware.</p>',
        '</div></section>',
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>What to do about it'
        '<span class="title-underline"></span></h2>',
        '<p>The honest framing matters: this is a certificate lifetime, not a hardware failure. '
        'Cisco documents controller-side workarounds, and whether they apply depends on your '
        'controller platform and software version. On kit that is also past its last date of '
        'support, though, you are solving a problem on hardware nobody will ever help you with '
        'again &mdash; which is usually the moment replacement genuinely does make sense.</p>',
        '<p>That is one of the few places in this guide where we will say plainly: if you are '
        'here because of FN63942 <em>and</em> your model is on the expired list on '
        '<a href="/cisco-aironet-end-of-life/">the Cisco dates page</a>, replacement is probably '
        'the right answer rather than the sales answer.</p>',
        '</div></section>',
    ])
    _page("cisco-access-point-wont-join-controller",
          "Cisco Access Point Won't Join Controller? Check the Date | 365 Techies",
          "A Cisco access point that worked yesterday and refuses today is often a ten-year "
          "certificate expiring, not a hardware failure. Cisco puts the likelihood at 100% for "
          "pre-2017 units. Field Notice FN63942 explained in plain English.",
          'Access point won&rsquo;t join? <em class="grad grad--cyan">Check the date, not the '
          'hardware</em>',
          "// CISCO &middot; FIELD NOTICE FN63942",
          "An access point that worked yesterday now refuses to join the controller. It is "
          "probably not dead - its certificate has expired, and Cisco says that is a certainty "
          "for pre-2017 hardware.",
          body,
          faq=[("Why has my Cisco access point stopped joining the controller?",
                "On hardware over ten years old and manufactured before 2017, the most likely "
                "cause is the manufacturing certificate expiring. Cisco Field Notice FN63942 "
                "states that all Cisco wireless products manufactured after 18 July 2005 have "
                "SHA-1 certificates that expire after 10 years, and puts the likelihood of "
                "encountering the issue at 100 percent for that population. The access point is "
                "not faulty; its identity has expired.")])


# ===========================================================================
# S5 - the PoE trap
# ===========================================================================
def s5_poe():
    body = "\n".join([
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>The quote says access points. The job is switches too.'
        '<span class="title-underline"></span></h2>',
        '<p>This is the most expensive thing people miss when pricing a Wi-Fi refresh, and it is '
        'entirely knowable in advance.</p>',
        '<p>Older business access points were designed to run on standard Power over Ethernet '
        '(802.3af). Their modern replacements almost universally need the higher-power standard '
        '(802.3at, often called PoE+). So an estate that has run happily for eight years on the '
        'existing switches cannot simply have new access points hung on the same cables.</p>',
        C.ap_fact('RUCKUS marketed the R510 on running with existing 802.3af-capable switches. '
                  'That is precisely why R510 estates tend to sit on af-only switches today '
                  '&mdash; and why every Wi-Fi 6 successor (R550, R650, R750) needing 802.3at '
                  'turns &ldquo;swap the access points&rdquo; into &ldquo;swap the access points '
                  'and the switch&rdquo;.', "ruckus_eol"),
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap prose" data-reveal>',
        '<h2 class="section-title" data-title>What silently switches off when power is short'
        '<span class="title-underline"></span></h2>',
        '<p>An underpowered access point does not fail and does not warn you. It reports as '
        'healthy in the controller while quietly running with fewer aerials, a dead second '
        'network port and, on several models, no USB and no IoT radio. Users experience it as '
        '&ldquo;the Wi-Fi got worse and nobody changed anything&rdquo;.</p>',
        C.table_specs(),
        '</div></section>',
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Three traps worth checking today'
        '<span class="title-underline"></span></h2>',
        grid_cards([
            ("The silent degrade",
             "An access point negotiated at 802.3af when it wanted 802.3at looks perfect on the "
             "dashboard. Check the negotiated class on the switch, per port. Highest-yield check "
             "in this entire guide, and it costs nothing."),
            ("The upgrade cliff",
             "Budgeting for new access points without checking the switch is how a Wi-Fi project "
             "goes over budget in week one. Count the ports, check the standard, then price."),
            ("Per-port class is not the budget",
             "A switch can support the higher standard on some ports and run out of total power "
             "for the rest. The result is a coverage complaint that looks random and moves "
             "around - maddening to diagnose if you do not know to look."),
        ]),
        C.ap_field('The RUCKUS R720 is reported to need more than standard PoE+ &mdash; full '
                   'function including its second Ethernet port and USB is associated with '
                   'higher-power PoH/UPoE. If you are quoting a site with R720s and 2.5GbE '
                   'uplinks, re-read the current datasheet before you promise anyone those '
                   'uplinks work.'),
        '<p>Long cable runs and outdoor sites change this arithmetic again &mdash; see '
        '<a href="/rural-and-farm-wifi-dorset/">rural and multi-building Wi-Fi</a>, where '
        'injector siting and run length matter as much as the standard on the switch. If your '
        '&ldquo;access points&rdquo; are really a mesh kit, '
        '<a href="/mesh-wifi-setup-guide/">the mesh guide</a> is the better starting point.</p>',
        '</div></section>',
    ])
    _page("access-point-poe-af-at-upgrade-trap",
          "802.3af vs 802.3at: The PoE Upgrade Trap | 365 Techies",
          "Older access points run on 802.3af. Their replacements need 802.3at. Exactly what "
          "switches off when power is short, per model, from vendor datasheets - and the free "
          "check that finds it in minutes.",
          'Replacing access points is <em class="grad grad--green">never just access points</em>',
          "// POWER OVER ETHERNET &middot; THE HIDDEN COST",
          "The most expensive thing people miss when pricing a Wi-Fi refresh - and the "
          "five-minute check that tells you whether your existing access points are quietly "
          "running at half strength right now.",
          body)


# ===========================================================================
# S6 - dropping off the controller
# ===========================================================================
def s6_dropping():
    body = "\n".join([
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<p class="lede"><strong>This page is for estates with a wireless controller and more '
        'than a handful of access points.</strong> If you have a single router, a mesh kit or an '
        'all-in-one office system, start with '
        '<a href="/office-wifi-keeps-dropping-out/">office Wi-Fi that keeps dropping out</a> '
        'instead &mdash; the causes really are different.</p>',
        '<h2 class="section-title" data-title>An order of play, cheapest check first'
        '<span class="title-underline"></span></h2>',
        '<p>Access points that go offline and come back are among the most misdiagnosed faults in '
        'business IT, because the obvious answer &mdash; &ldquo;the Wi-Fi is bad&rdquo; &mdash; is '
        'almost always the wrong one. Radio problems degrade. They do not disconnect to a '
        'timetable.</p>',
        checklist([
            "<strong>All of them, or some of them?</strong> All at once points at the controller, "
            "a licence, an uplink or a power event. A subset points at those units, their switch "
            "or their cabling. This one question halves the search space.",
            "<strong>Time the interval.</strong> Roughly hourly, four-hourly or twelve-hourly "
            "cycles are heartbeat, keepalive, DHCP lease renewal or a scheduled task. Write down "
            "the actual times before you theorise.",
            "<strong>Check negotiated PoE class per port</strong> on the switch. An access point "
            "browning out under load drops and rejoins and looks exactly like a network fault. "
            "<a href=\"/access-point-poe-af-at-upgrade-trap/\">The PoE trap, in full.</a>",
            "<strong>Check the switch's total PoE budget</strong>, not just per-port class.",
            "<strong>Check port errors, speed and duplex.</strong> CRC errors, or a link that has "
            "renegotiated to 100Mbps half-duplex, is a cable or termination fault. So is a port "
            "that flaps. None of those are Wi-Fi.",
            "<strong>Check firmware against the patch floors.</strong> Some drop-and-rejoin "
            "behaviour is fixed in firmware you already own but have not applied.",
            "<strong>Compare uptimes.</strong> One access point with a much shorter uptime than "
            "its neighbours is losing power or crashing &mdash; and those are different faults "
            "with different fixes.",
            "<strong>Only now, look at the radio.</strong> Channel overlap, DFS radar events "
            "forcing channel changes and 2.4GHz congestion are all real &mdash; but they are "
            "eighth on this list for a reason.",
        ]),
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>What other operators report on this generation'
        '<span class="title-underline"></span></h2>',
        '<p>These are field reports from people running the same kit. They are useful for '
        'recognising a pattern, they are not vendor-confirmed, and we label them as such.</p>',
        C.ap_field('RUCKUS R510 estates on Unleashed reporting &ldquo;Heartbeat Loss&rdquo; '
                   'entries and client disconnects on a roughly twelve-hourly cycle.'),
        C.ap_field('An operator running twenty-seven R500s alongside twenty-seven R710s reporting '
                   'heartbeat loss across the estate roughly every four hours &mdash; with the '
                   'older R500s offline for five to ten minutes while the R710s recovered much '
                   'faster. A useful illustration of why a mixed estate produces confusing '
                   'symptoms.'),
        C.ap_field('One report of an R510 apparently destabilising the switch it was connected '
                   'to, with a suspected power interaction. Rare &mdash; but it is exactly the '
                   'kind of thing that sends people down the wrong path for weeks.'),
        '<p>The pattern worth taking from all three: <strong>regular intervals mean systems, not '
        'radios</strong>. If your outages keep a timetable, the answer is upstream of the '
        'aerials.</p>',
        '</div></section>',
    ])
    _page("access-points-dropping-off-controller",
          "Access Points Keep Dropping Off the Controller | 365 Techies",
          "Access points going offline and coming back is usually not a Wi-Fi fault. An ordered "
          "diagnostic method for controller-managed estates - power, cabling, firmware and "
          "heartbeat behaviour, cheapest check first.",
          'Access points keep <em class="grad grad--green">dropping off?</em>',
          "// CONTROLLER ESTATES &middot; DIAGNOSTIC METHOD",
          "For estates with a wireless controller and more than a handful of access points: an "
          "ordered method that starts with the checks costing nothing, and finds the fault "
          "faster than guessing at the radio.",
          body)


# ===========================================================================
# S7 - the controller is the real deadline
# ===========================================================================
def s7_controller():
    body = "\n".join([
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Everyone counts the access points. Almost nobody '
        'checks the controller.<span class="title-underline"></span></h2>',
        '<p>When a Wi-Fi estate reaches the end of its life, the component that forces the '
        'decision is usually the box in the comms cupboard that nobody has logged into for three '
        'years &mdash; not the access points on the ceiling.</p>',
        '<p>Here is why. Your controller can only run firmware that supports every access point '
        'attached to it. Your access points can only be managed by controller versions on their '
        'supported list. Those two facts squeeze from both ends, and the oldest thing in the '
        'estate sets the ceiling for everything else.</p>',
        C.ap_fact('The RUCKUS ZoneDirector 1200 went end of sale on 31 August 2022, in the '
                  'vendor&rsquo;s own words: &ldquo;RUCKUS ZD1200 will become End of Sale '
                  'effective August 31st, 2022&rdquo;. It manages up to 150 access points, 4,000 '
                  'clients and 256 wireless networks.', "ruckus_eol"),
        C.ap_field('Third-party end-of-life databases report ZoneDirector 1200 end of support as '
                   '31 August 2027, which is consistent with RUCKUS&rsquo;s general '
                   '&ldquo;five years after end of sale&rdquo; policy. We could not find a '
                   'vendor-published date for it, so we are not presenting one as fact &mdash; '
                   'if this date matters to your budget, ask RUCKUS to confirm it in writing.'),
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>The mixed-estate trap'
        '<span class="title-underline"></span></h2>',
        '<p>This is the most useful thing on this page, and it usually saves money rather than '
        'costing it.</p>',
        '<p>Suppose you have twenty-eight access points: three old ones and twenty-five newer. '
        'The three old ones cap the controller firmware. The controller firmware that fixes a '
        'published security flaw is above that cap. So those three units are the reason the other '
        'twenty-five cannot be patched.</p>',
        C.smartzone7_block(),
        '<p><strong>Retiring three access points can unlock the security position of the whole '
        'estate.</strong> That is a very different quote from replacing twenty-eight, and it is '
        'the recommendation an honest survey should produce more often than it does.</p>',
        tiles([
            ("wrench", "Find your oldest model first",
             "Not your most broken one. The oldest supported-software ceiling in the estate is "
             "the number that governs every upgrade decision you make."),
            ("shield", "Then find the firmware you need",
             "Work out which controller version you need for security, not features. That gap "
             "tells you exactly which units have to go."),
            ("clock", "Then price the two options",
             "Retire the blockers, or replace everything. Usually the first is a fraction of the "
             "second, and buys you years."),
            ("users", "Ask who is on the vendor's email list",
             "If licence and end-of-life notices go to someone who left, or to the company that "
             "installed it in 2016, fix that today. It is free and it prevents surprises."),
        ]),
        '</div></section>',
    ])
    _page("wifi-controller-end-of-life",
          "Wi-Fi Controller End of Life: The Real Deadline | 365 Techies",
          "When a business Wi-Fi estate ages out, the wireless controller usually forces the "
          "decision - not the access points. ZoneDirector 1200 dates, the mixed-estate trap, and "
          "why retiring three units can unlock patching twenty-five.",
          'Your controller is the <em class="grad grad--gold">real deadline</em>',
          "// CONTROLLERS &middot; THE PART PEOPLE MISS",
          "Everyone counts the access points on the ceiling. The component that actually forces "
          "the decision is usually the box in the comms cupboard nobody has logged into for "
          "three years.",
          body)


# ===========================================================================
# S8 - Meraki licence expiry
# ===========================================================================
def s8_meraki():
    body = "\n".join([
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>The honest answer is more reassuring than the rumour '
        '&mdash; and more dangerous<span class="title-underline"></span></h2>',
        '<p>Cisco Meraki hardware is licensed. If the licence lapses, something does happen. But '
        'it is not what most people fear, and the reality catches businesses out for the opposite '
        'reason: <strong>nothing breaks on expiry day</strong>.</p>',
        C.ap_advisory('Meraki documents a <strong>30-day grace period</strong> after expiry, '
                      'during which &mdash; in their words &mdash; &ldquo;network clients will '
                      'not see a difference&rdquo;. Only after that does the documented behaviour '
                      'kick in: &ldquo;the devices will cease to pass client traffic, but will '
                      'continue to pass Meraki management traffic to check when the organization '
                      'regains compliance.&rdquo;',
                      "Cisco Meraki licensing documentation",
                      "https://documentation.meraki.com/General_Administration/Licensing"),
        '<p>Read that carefully, because the precision matters:</p>',
        checklist([
            "<strong>The hardware does not brick.</strong> It is not disabled, bricked or "
            "switched off. It stops passing <em>client</em> traffic and keeps talking to Meraki, "
            "so that the moment you are compliant again it restores itself.",
            "<strong>Nothing happens for thirty days.</strong> Which is exactly why it catches "
            "people out - the warning period is the quiet period.",
            "<strong>Co-termination versus per-device licensing changes the blast radius.</strong> "
            "Under co-termination the whole organisation goes down. Under per-device licensing "
            "only the offending device does. Know which model you are on before you need to.",
            "<strong>The dashboard restricts to the licensing page</strong>, so you cannot "
            "administer your way out of it without resolving the licence.",
        ]),
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>What Meraki does <em>not</em> promise'
        '<span class="title-underline"></span></h2>',
        '<p>We are being deliberately careful here, because this is the part people get wrong in '
        'both directions.</p>',
        '<p>Meraki&rsquo;s documentation commits only to <strong>weekly email reminders once you '
        'are already inside the 30-day grace period</strong>. We could not find a documented '
        'commitment to warn you at 90, 60 or 30 days <em>before</em> expiry, and we are not going '
        'to tell you there is one.</p>',
        '<p>In our own experience &mdash; and this is our field experience, not Meraki '
        'documentation &mdash; those reminders very often arrive at the mailbox of someone who '
        'has left the business, or at the reseller who installed the kit years ago. That is the '
        'single most common reason a Meraki network goes dark unexpectedly. Checking who receives '
        'those emails takes two minutes and costs nothing.</p>',
        '</div></section>',
        '    <section class="section"><div class="wrap prose" data-reveal>',
        '<h2 class="section-title" data-title>Meraki hardware end-of-support dates'
        '<span class="title-underline"></span></h2>',
        '<p>Licensing and hardware support are two separate clocks. The Wi-Fi 5 Meraki access '
        'points reached end of support in July 2026 &mdash; a licence in date does not extend '
        'hardware support, and supported hardware does not survive an expired licence.</p>',
        C.table_meraki(),
        '</div></section>',
    ])
    _page("meraki-licence-expiry-what-happens",
          "What Happens When a Meraki Licence Expires | 365 Techies",
          "Meraki devices do not brick when a licence expires - after a 30-day grace period they "
          "stop passing client traffic while staying manageable. The documented behaviour, the "
          "co-termination trap, and the Wi-Fi 5 hardware end-of-support dates.",
          'When a Meraki licence expires, <em class="grad grad--cyan">what actually happens?</em>',
          "// MERAKI &middot; LICENSING, DOCUMENTED",
          "If we do not renew, does the Wi-Fi stop? The precise, documented answer - which is "
          "more reassuring than the rumour, and more dangerous, because nothing at all happens "
          "for the first thirty days.",
          body,
          faq=[("What happens when a Meraki licence expires?",
                "Nothing for thirty days. Meraki documents a 30-day grace period after expiry "
                "during which network clients will not see a difference. After that, in Meraki's "
                "own words, the devices cease to pass client traffic but continue to pass Meraki "
                "management traffic so they can restore automatically once the organisation "
                "regains compliance. The hardware is not bricked or disabled."),
               ("Does the whole Meraki network go down if one licence lapses?",
                "It depends on the licensing model. Under co-termination licensing the whole "
                "organisation is affected. Under per-device licensing only the non-compliant "
                "device is affected.")])


# ===========================================================================
# S9 - working but unpatched
# ===========================================================================
def s9_security():
    body = "\n".join([
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Two different problems that get the same shrug'
        '<span class="title-underline"></span></h2>',
        '<p>A <strong>broken</strong> access point is an operational problem. It has a repair, a '
        'replacement or a warranty claim at the end of it, and everyone can see something is '
        'wrong.</p>',
        '<p>A <strong>working access point that can no longer be patched</strong> is a different '
        'thing entirely: a risk that somebody in the business has to accept knowingly, in full '
        'knowledge, ideally in writing. Nothing looks wrong. Everything works. That is precisely '
        'the problem.</p>',
        '<p>Vendors and resellers tend to blur these two, because fear sells replacements. So '
        'here is the un-blurred version, with the actual numbers you can test yourself against.</p>',
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap prose" data-reveal>',
        '<h2 class="section-title" data-title>Are you patched? Three build numbers'
        '<span class="title-underline"></span></h2>',
        '<p>This is the most actionable thing in the whole guide. Check your firmware version '
        'against these. If you are below them, you are exposed to a published vulnerability that '
        'already has a fix &mdash; one you are entitled to and have not applied.</p>',
        C.table_patch_floors(),
        C.ap_advisory('CVE-2025-46120 is a path-traversal flaw enabling unauthenticated remote '
                      'privilege escalation. The fixes are the three builds above. If your estate '
                      'is below them, this is a free afternoon&rsquo;s work with a real security '
                      'benefit &mdash; no new hardware involved.',
                      "RUCKUS support",
                      "https://support.ruckuswireless.com/security_bulletins"),
        '</div></section>',
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>The one that is already being exploited'
        '<span class="title-underline"></span></h2>',
        '<p>CVE-2023-25717 is reported as an unauthenticated remote code execution flaw in Ruckus '
        'Wireless Admin through version 10.4, scoring 9.8 out of 10 &mdash; about as bad as these '
        'get. It is reported to affect ZoneDirector, SmartZone and standalone access points, with '
        'RUCKUS Cloud and Unleashed reported as not impacted.</p>',
        '<p>What makes it different from most vulnerabilities: it was added to the US '
        'cybersecurity agency&rsquo;s <strong>Known Exploited Vulnerabilities catalogue</strong> '
        'and picked up by a botnet. That is not theoretical risk. That is somebody scanning the '
        'internet for your controller right now.</p>',
        C.ap_field('A sourcing note, because we would rather tell you than pretend: RUCKUS&rsquo;s '
                   'own advisory page returned an access error when we tried to read it, so the '
                   'affected-product detail above comes from vulnerability databases and security '
                   'press reporting on that advisory, not from the advisory itself. The '
                   'documented mitigation is disabling the access-point web interface from the '
                   'command line. If your controller is reachable from the internet and running '
                   'below version 10.5, treat it as urgent and verify with RUCKUS directly.'),
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>&ldquo;Frozen&rdquo; is not the same as '
        '&ldquo;abandoned&rdquo;<span class="title-underline"></span></h2>',
        '<p>Here is the sentence a business actually needs, and it is good news.</p>',
        '<p>Your Wi-Fi 5 estate is probably on a firmware branch that stopped gaining features '
        'years ago. That is not the same as being abandoned. That branch is <em>still receiving '
        'security fixes</em> &mdash; the patch floors above are proof, because they are fixes '
        'issued for exactly that old branch.</p>',
        '<p>The day that branch stops receiving security fixes is the day a Wi-Fi 5 estate is '
        'genuinely at the end of the road. Until then, patched old kit is a legitimate, '
        'defensible position &mdash; and anyone telling you otherwise should be asked which '
        'specific unpatched vulnerability they are worried about.</p>',
        '<p>If you need to demonstrate a security position to an insurer, a customer or an '
        'auditor, that distinction is the whole argument. Ring us and we will help you write it '
        'down properly.</p>',
        '</div></section>',
    ])
    _page("unsupported-access-point-security-risk",
          "Unsupported Access Points: The Security Risk | 365 Techies",
          "Broken kit is an operational problem. Working-but-unpatchable kit is a risk decision "
          "somebody has to take knowingly. The three RUCKUS build numbers that tell you whether "
          "you are patched, and the vulnerability already being exploited in the wild.",
          'It still works. <em class="grad grad--gold">Why is that not good enough?</em>',
          "// SECURITY &middot; THE HONEST VERSION",
          "Broken and unpatchable are two different problems that get the same shrug. Here is the "
          "un-blurred version - including the three build numbers you can check your own estate "
          "against this afternoon.",
          body)


# ===========================================================================
# S10 - the commercial page (supporting, not a ranking play)
# ===========================================================================
def s10_healthcheck():
    body = "\n".join([
        '    <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>What we actually do'
        '<span class="title-underline"></span></h2>',
        '<p>Everything in this guide is stuff you can do yourself, and we mean that &mdash; the '
        'checklist, the tables and the free survey tool are there so you can. Some businesses '
        'would rather someone came and did it. That is what this page is for.</p>',
        '<p>A Wi-Fi health check with us means: we walk the site and measure what people actually '
        'get, room by room; we read every access point&rsquo;s model, firmware and negotiated '
        'power; we check the controller version against its own supported list; we check your '
        'patch position against the published fixes; and we write it down in plain English.</p>',
        '<p>What you get at the end is a document that says what you have, what is genuinely '
        'wrong, what it would take to fix, and &mdash; where this is the answer &mdash; that '
        'nothing needs replacing at all. We are not a reseller for any Wi-Fi vendor, so we have '
        'no reason to arrive at any particular conclusion.</p>',
        '</div></section>',
        '    <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Straight answers about how we work'
        '<span class="title-underline"></span></h2>',
        tiles([
            ("phone", "We always ring before we connect",
             "No surprise remote sessions, ever. You always know who is on the other end."),
            ("shield", "Independent, not a reseller",
             "We are not an authorised partner or agent of any Wi-Fi vendor. If the honest "
             "answer is &lsquo;leave it alone&rsquo;, that is what the report will say."),
            ("pin", "Bournemouth, Poole and across Dorset",
             "On site by appointment, or remote where remote genuinely works. Established 1995 "
             "and still family-run."),
            ("users", "The same faces each time",
             "Whoever surveys your site is who you will speak to next time. That matters more "
             "than people expect on a multi-visit job."),
        ]),
        '<p>We have not put a price on this page, because the honest answer depends on the size '
        'of the site and how many access points there are, and we would rather tell you a real '
        'number on the phone than a fake one here. Ring <strong>01202 775566</strong> and ask.</p>',
        '<p>Already know you need new kit installed rather than diagnosed? That is '
        '<a href="/business-wifi-installation/">business Wi-Fi installation</a>.</p>',
        '</div></section>',
    ])
    _page("business-wifi-health-check-dorset",
          "Business Wi-Fi Health Check - Bournemouth, Poole & Dorset | 365 Techies",
          "An independent Wi-Fi health check for Dorset businesses: what you have, what is "
          "actually wrong, and whether anything needs replacing. We are not a reseller for any "
          "Wi-Fi vendor. Established 1995, family-run.",
          'An independent look at <em class="grad grad--green">your business Wi-Fi</em>',
          "// HEALTH CHECK &middot; BOURNEMOUTH, POOLE &amp; DORSET",
          "We measure what people actually get, read every access point and controller version, "
          "check your patch position - and write down the honest answer, including when that "
          "answer is that nothing needs replacing.",
          body,
          chips=["Independent &mdash; no vendor resale", "On site by appointment",
                 "Family-run since 1995"],
          cta1=("Call 01202 775566", "tel:+441202775566"),
          cta2=("Book a visit", "/book-service/"))




# ===========================================================================
# 11 - THE R510 FIELD PLAYBOOK
# Written for someone with an estate in front of them and a sales floor full
# of people, not for someone browsing. Diagnosis first, upgrade second.
# ===========================================================================
def s11_r510_playbook():
    r510 = next(a for a in D.AP_MODELS if a["key"] == "ruckus-r510")
    r550 = next(a for a in D.AP_MODELS if a["key"] == "ruckus-r550")

    # Arithmetic done here rather than asserted in prose, from the vendor
    # figures in ap_lifecycle_data.py, so the page cannot drift from the data.
    n_510, n_550 = 16, 2
    w510, w550at, w550af = 12.6, 18.71, 12.71
    now_w = n_510 * w510 + n_550 * w550at
    after_w = (n_510 + n_550) * w550at
    delta = after_w - now_w

    body = "\n".join([
        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Start here: is it actually the Wi-Fi?'
        '<span class="title-underline"></span></h2>',
        '<p>&ldquo;The Wi-Fi is unreliable&rdquo; is a symptom, not a diagnosis, and on a busy '
        'floor it is wrong about half the time. Before you touch an access point, rule out the '
        'three things that produce identical complaints:</p>',
        '<ol>',
        '<li><strong>The internet circuit, not the Wi-Fi.</strong> If a wired machine on the same '
        'switch stutters at the same moments, your problem is upstream and no access point will '
        'fix it.</li>',
        '<li><strong>One application, not the network.</strong> A single slow line-of-business '
        'app gets blamed on Wi-Fi constantly. Ask what specifically was slow, and when.</li>',
        '<li><strong>Roaming, not coverage.</strong> Staff walking a large floor while on a call '
        'or a stock lookup will describe a clean handover failure as &ldquo;the Wi-Fi dropping&rdquo;. '
        'That is a different fault with a different fix.</li>',
        '</ol>',
        '<p>Get one concrete example &mdash; who, where on the floor, what they were doing, and '
        'roughly when. Everything below is faster with one real incident to aim at.</p>',
        '</div></section>',

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>The eight-step diagnosis'
        '<span class="title-underline"></span></h2>',
        '<p>In the order that finds the fault fastest, not the order that looks most thorough.</p>',
        '<ol>',
        '<li><strong>Read the controller first, not the AP.</strong> Sort your APs by client count '
        'and by reboot count. An AP that has rebooted more than its neighbours is telling you '
        'something &mdash; usually power, occasionally heat.</li>',
        '<li><strong>Check firmware is uniform.</strong> A mixed-firmware estate produces '
        'intermittent, unrepeatable faults that waste weeks. Note the version on every AP before '
        'you change anything.</li>',
        '<li><strong>Check what each AP negotiated for power.</strong> The single most '
        'under-tested thing in the whole estate. Detail below.</li>',
        '<li><strong>Check the switch&rsquo;s total PoE budget, not just the ports.</strong> Ports '
        'can each be within spec while the switch as a whole is oversubscribed.</li>',
        '<li><strong>Walk the cable.</strong> Length, category, patch panels, and any injectors '
        'or midspans someone added years ago and never documented.</li>',
        '<li><strong>Look at the channel plan.</strong> With this many APs in one open space, '
        'co-channel interference is more likely than weak coverage. Detail below.</li>',
        '<li><strong>Look at client distribution.</strong> If two APs hold most of the clients '
        'while others idle, that is a design or power problem, not a hardware fault.</li>',
        '<li><strong>Only now consider the hardware.</strong> If steps 1&ndash;7 are clean and it '
        'still misbehaves, you have earned the right to blame the access points.</li>',
        '</ol>',
        C.ap_advisory('Change one thing at a time and write down what you changed. On a live '
                      'floor the temptation is to fix six things in one evening, and then you '
                      'never learn which one mattered &mdash; or which one you will have to '
                      'undo.'),
        '</div></section>',

        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Testing PoE properly'
        '<span class="title-underline"></span></h2>',
        '<p>Most &ldquo;flaky access point&rdquo; jobs we are called to are power, and almost '
        'nobody checks it, because the AP is lit up and joined so it looks fine. An access point '
        'that is up but under-powered behaves exactly like one that is failing.</p>',
        '<p><strong>What to measure, per port:</strong></p>',
        '<ul>',
        '<li><strong>The class it negotiated</strong> &mdash; not what you assume it asked for. '
        'On most managed switches this is a per-interface power inline status.</li>',
        '<li><strong>Actual draw against the AP&rsquo;s rated maximum.</strong> An R510 rated at '
        '<strong>' + str(w510) + 'W</strong> sitting at a fraction of that is not efficient, it '
        'is starved.</li>',
        '<li><strong>Whether the port is capped</strong> by a static per-port limit somebody set '
        'years ago and forgot.</li>',
        '<li><strong>Voltage at the far end on long runs.</strong> A 90m run of tired Cat5e '
        'delivers measurably less than a 15m run of Cat6.</li>',
        '</ul>',
        C.ap_fact('R510 PoE: ' + r510["poe"] + '. ' + r510["poe_af"] + '.', "ruckus_eol"),
        '<p><strong>The pattern that gives it away:</strong> problems that cluster by time of day '
        'rather than by location. If the floor degrades when everyone arrives, and the APs on the '
        'far end of the longest cable runs degrade first, you are looking at power and not at '
        'radio.</p>',
        '</div></section>',

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Cable, distance, and where the power actually goes'
        '<span class="title-underline"></span></h2>',
        '<p>People ask how much power an access point loses per metre of cable. It is a '
        'reasonable question with a surprising answer: <strong>inside the rules, you do not have '
        'to budget for it at all</strong>, because the standard already has.</p>',
        '<p>Every PoE class is written as two numbers &mdash; what the switch puts in, and what '
        'the device is <em>guaranteed</em> to get out at the far end. The gap between them is the '
        'cable allowance, and it is calculated for the worst legal case: a full 100&nbsp;metre '
        'channel of compliant cable.</p>',
        '<div class="table-wrap"><table class="table">',
        '<thead><tr><th>Class</th><th>Switch supplies</th><th>AP guaranteed</th>'
        '<th>Built-in cable allowance</th></tr></thead><tbody>',
        '<tr><td>802.3af (PoE)</td><td>15.4&nbsp;W</td><td>12.95&nbsp;W</td>'
        '<td><strong>2.45&nbsp;W</strong></td></tr>',
        '<tr><td>802.3at (PoE+)</td><td>30&nbsp;W</td><td>25.5&nbsp;W</td>'
        '<td><strong>4.5&nbsp;W</strong></td></tr>',
        '<tr><td>802.3bt Type 3</td><td>60&nbsp;W</td><td>51&nbsp;W</td>'
        '<td><strong>9&nbsp;W</strong></td></tr>',
        '</tbody></table></div>',
        '<p>So an R510 on a compliant 95&nbsp;metre run and one on a 10&nbsp;metre run are both '
        'entitled to the same 12.95&nbsp;W. There is no sliding scale you need to design around. '
        '<strong>The useful question is not how long the run is, but whether the cable is what '
        'it claims to be.</strong></p>',
        '</div></section>',

        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>What actually breaks it'
        '<span class="title-underline"></span></h2>',
        '<p>Four things, and only one of them is distance.</p>',
        '<ul>',
        '<li><strong>Copper-clad aluminium (CCA), by a distance the worst offender.</strong> '
        'Aluminium carries current far worse than copper, so a CCA run drops far more voltage '
        'than the standard assumes. It is not standards-compliant cable, it is common in cheap '
        'reels, and it is invisible once it is in the wall. If an estate has odd, '
        'location-specific PoE behaviour and nobody knows who cabled it, this is the first thing '
        'to suspect.</li>',
        '<li><strong>Over-length runs.</strong> The 100&nbsp;metre figure is a <em>channel</em> '
        'limit: roughly 90&nbsp;metres of solid horizontal cable plus about 10&nbsp;metres of '
        'patch leads at both ends. Two long patch leads at the comms room and another at the AP '
        'eat that allowance quickly, and the run measured on the drawing is not the run that '
        'exists.</li>',
        '<li><strong>Damage and poor terminations.</strong> A kinked run, an over-tightened cable '
        'tie, a punched-down pair with too much untwist &mdash; all raise resistance at one point '
        'rather than smoothly along the length.</li>',
        '<li><strong>Heat rise in bundles.</strong> Conductor resistance climbs with temperature, '
        'and a tight bundle of cables all carrying PoE warms itself. This is a recognised effect '
        'with its own industry guidance; it bites in large bundles in warm ceiling voids, which '
        'is exactly where access point cabling lives.</li>',
        '</ul>',
        C.ap_field('The tell for a cable fault rather than a design fault is that it is stubbornly '
                   'local. One access point misbehaves, its neighbours do not, and swapping the '
                   'AP moves nothing. If a replacement unit on the same cable behaves the same '
                   'way, stop testing access points.'),
        '</div></section>',

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Cat5e or Cat6, shielded or not'
        '<span class="title-underline"></span></h2>',
        '<p><strong>For PoE, the difference that matters is conductor thickness, not bandwidth.</strong> '
        'Cat5e is typically 24&nbsp;AWG; Cat6 is commonly 23&nbsp;AWG. The thicker conductor has '
        'meaningfully lower resistance, so it drops less voltage and runs cooler in a bundle. '
        'That is the real PoE argument for Cat6 &mdash; not the extra bandwidth, which a '
        '1&nbsp;GbE access point will never use.</p>',
        '<p><strong>Shielding is about interference, not power.</strong> Shielded cable does '
        'nothing for your PoE budget. It earns its place where cable runs alongside mains, near '
        'motors or lift gear, or through plant areas &mdash; and it comes with a condition.</p>',
        C.ap_advisory('Shielded cable must be properly bonded and earthed, and consistently so. '
                      'Shielding earthed at both ends of a building with different earth '
                      'potentials can carry current through the shield and cause faults that are '
                      'worse and far stranger than the interference it was fitted to stop. '
                      'Shielded cable installed carelessly is worse than good unshielded cable.'),
        '<p><strong>What we would specify for access points on a floor like this:</strong></p>',
        '<div class="table-wrap"><table class="table">',
        '<thead><tr><th>Situation</th><th>Cable</th><th>Why</th></tr></thead><tbody>',
        '<tr><td>Standard ceiling run, open sales floor</td><td>Solid copper Cat6 U/UTP</td>'
        '<td>23&nbsp;AWG gives headroom on power and heat; no shielding to bond incorrectly.</td></tr>',
        '<tr><td>Long run, near the 90&nbsp;m mark</td><td>Solid copper Cat6 U/UTP</td>'
        '<td>Where the thicker conductor genuinely earns its money.</td></tr>',
        '<tr><td>Alongside mains, plant rooms, lift shafts</td><td>Shielded Cat6 F/UTP</td>'
        '<td>Only with the bonding done properly at the patch panel end.</td></tr>',
        '<tr><td>Existing Cat5e, solid copper, under 90&nbsp;m</td><td>Leave it</td>'
        '<td>Fine for a 1&nbsp;GbE access point at 802.3at. Recabling a working floor is rarely '
        'the best use of the budget.</td></tr>',
        '<tr><td>Anything CCA, any length</td><td>Replace</td>'
        '<td>Not compliant, and the cause of faults nobody can explain.</td></tr>',
        '</tbody></table></div>',
        '<p>Two things worth saying plainly. <strong>Patch leads count</strong> &mdash; stranded '
        'patch cable has higher resistance than solid, which is exactly why the standard sets '
        'aside 10&nbsp;metres of the 100 for them. And <strong>a working Cat5e floor rarely needs '
        'recabling</strong>: if your R510s are stable on their existing runs, that cable will '
        'carry an R550 at 802.3at too, provided the switch can supply it.</p>',
        '</div></section>',

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>The R510 &rarr; R550 trap nobody warns you about'
        '<span class="title-underline"></span></h2>',
        '<p>This is the part worth reading twice, because it is the reason some estates get '
        '<em>worse</em> after an upgrade that everyone agreed was overdue.</p>',
        '<p>An <strong>R510 is a native 802.3af access point</strong>. That is why R510 estates '
        'so often sit on af-only switches: it never needed anything more. An <strong>R550 is '
        'not</strong>. It wants 802.3at, and if it only gets af it still comes up &mdash; in a '
        'reduced mode.</p>',
        C.ap_fact('R550 PoE: ' + r550["poe"] + '. On af it runs at ' + r550["poe_af"] + '.',
                  "ruckus_eol"),
        '<p>Read that limited mode carefully. On 802.3af an R550 gives you <strong>2.4GHz only at '
        'reduced power, with the second Ethernet port, the onboard IoT radio and the USB port all '
        'switched off</strong>. You have bought a Wi-Fi 6 access point and are running it as '
        'something considerably less capable than the Wi-Fi 5 unit you removed.</p>',
        C.ap_advisory('If you swap R510s for R550s without touching the switches, the honest '
                      'likely outcome is that the floor performs worse and nobody can explain '
                      'why. The APs will show as up, healthy and joined throughout.'),
        '<p>So the first question in any R510&rarr;R550 project is not about the access points at '
        'all. It is: <strong>what do the switches actually deliver, per port and in total?</strong></p>',
        '</div></section>',

        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>What ' + str(n_510) + ' R510s and ' + str(n_550) +
        ' R550s actually need<span class="title-underline"></span></h2>',
        '<p>Worked through with the vendor&rsquo;s own figures, for an estate of '
        '<strong>' + str(n_510) + ' &times; R510</strong> and <strong>' + str(n_550) +
        ' &times; R550</strong>:</p>',
        '<div class="table-wrap"><table class="table">',
        '<thead><tr><th>Scenario</th><th>Per AP</th><th>Estate total</th></tr></thead><tbody>',
        '<tr><td>Today (' + str(n_510) + ' R510 on af + ' + str(n_550) + ' R550 on at)</td>'
        '<td>' + str(w510) + 'W / ' + str(w550at) + 'W</td>'
        '<td><strong>' + ('%.1f' % now_w) + 'W</strong></td></tr>',
        '<tr><td>All ' + str(n_510 + n_550) + ' on R550 at 802.3at</td>'
        '<td>' + str(w550at) + 'W</td>'
        '<td><strong>' + ('%.1f' % after_w) + 'W</strong></td></tr>',
        '<tr><td>The gap you must find</td><td>&mdash;</td>'
        '<td><strong>+' + ('%.1f' % delta) + 'W</strong></td></tr>',
        '</tbody></table></div>',
        '<p>That extra <strong>' + ('%.0f' % delta) + 'W</strong> is the whole project in one '
        'number. It is comfortably inside a switch with a 370W budget and comfortably outside one '
        'with 195W &mdash; and plenty of estates are running the second kind because '
        '' + str(n_510) + ' af access points never asked for more.</p>',
        C.ap_field('Add headroom on top. A switch running at its rated PoE ceiling has nothing '
                   'left for the day someone adds a camera, a door controller or one more access '
                   'point &mdash; and PoE budget is not something you want to discover during a '
                   'trading day. Work out the real numbers for your own switches with our '
                   '<a href="/access-point-poe-af-at-upgrade-trap/">PoE budget guide</a>.'),
        '</div></section>',

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Controllers and firmware: check, do not assume'
        '<span class="title-underline"></span></h2>',
        '<p>A mixed R510 and R550 estate has to be managed by something that supports both, and '
        'the supported-AP list changes with every controller release. This is the one area where '
        'we will not give you a number, because the honest answer depends on the exact version '
        'you are running.</p>',
        C.ap_fact('R510 last supported software: ' + r510["last_sw"] + '. End of support '
                  '31 December 2028 &mdash; the hardware is not the deadline people assume.',
                  "ruckus_eol"),
        '<p><strong>How to check yours in ten minutes</strong>, rather than take anyone&rsquo;s '
        'word for it:</p>',
        '<ol>',
        '<li>Note your controller type and exact version &mdash; ZoneDirector, SmartZone, '
        'Unleashed or cloud-managed are four different answers.</li>',
        '<li>Open the release notes for <em>that exact version</em> on the vendor&rsquo;s support '
        'site and find the supported access point table.</li>',
        '<li>Confirm both models appear in it. If the R550 needs a newer release than the R510 '
        'supports, that is your project, and it is a bigger one than swapping access points.</li>',
        '<li>Check the controller hardware itself is still supported at that version. Older '
        'controller appliances stop being carried forward before the APs do.</li>',
        '</ol>',
        C.ap_advisory('We are independent and hold no vendor support entitlement on your behalf. '
                      'Anything version-specific should come from your own release notes or your '
                      'reseller, in writing, before you order hardware.'),
        '</div></section>',

        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>The options, rated honestly'
        '<span class="title-underline"></span></h2>',
        '<p>Our assessment, not a vendor&rsquo;s. Cost is shown as a relative band because we '
        'publish no price we have not been given by the vendor &mdash; and street pricing on '
        'access points moves constantly.</p>',
        '<div class="table-wrap"><table class="table">',
        '<thead><tr><th>Option</th><th>Cost</th><th>Fit for this estate</th><th>The honest catch</th></tr></thead>',
        '<tbody>',
        '<tr><td><strong>Stay on R510, fix the real fault</strong></td><td>&pound;</td>'
        '<td>&#9733;&#9733;&#9733;&#9733;&#9734;</td>'
        '<td>Supported to 2028. If the fault is power, channels or cabling, new APs fix nothing '
        'and cost a great deal.</td></tr>',
        '<tr><td><strong>R550 (the like-for-like successor)</strong></td><td>&pound;&pound;</td>'
        '<td>&#9733;&#9733;&#9733;&#9733;&#9734;</td>'
        '<td>Needs 802.3at. Same 2x2:2 stream count as the R510 &mdash; the gain is Wi-Fi 6 '
        'efficiency, not more streams.</td></tr>',
        '<tr><td><strong>R650 (a real step up)</strong></td><td>&pound;&pound;&pound;</td>'
        '<td>&#9733;&#9733;&#9733;&#9733;&#9733;</td>'
        '<td>4x4:4 on 5GHz and a 2.5GbE uplink, so it wants more power again and ideally a faster '
        'switch port to be worth it.</td></tr>',
        '<tr><td><strong>Switch vendor entirely</strong></td><td>&pound;&pound;</td>'
        '<td>&#9733;&#9733;&#9734;&#9734;&#9734;</td>'
        '<td>You throw away 18 working access points, the controller, and everyone&rsquo;s '
        'familiarity with it. Rarely the right answer when the incumbent is supported to 2028.</td></tr>',
        '</tbody></table></div>',
        '<p>The pattern we see most often on floors this size: the estate is fine, the switches '
        'are the constraint, and the money is better spent on power and channel design than on '
        'access points.</p>',
        '</div></section>',

        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Heat: what it costs you in access points'
        '<span class="title-underline"></span></h2>',
        '<p>Access points live in the worst place in the building for heat &mdash; a ceiling '
        'void, above the lighting, often near the ductwork, in a space designed for air movement '
        'rather than cooling. And heat is the single biggest determinant of how long electronics '
        'last.</p>',
        '<p>The engineering rule of thumb is <strong>the ten-degree rule</strong>: for the '
        'electrolytic capacitors and power components inside, every 10&deg;C of sustained '
        'temperature rise roughly halves working life. It is an approximation rather than a '
        'guarantee, but it is the right order of magnitude and it explains something you will '
        'have seen: two identical access points bought the same day, and the one above the '
        'lighting rig dies years before the one in the cool corner.</p>',
        '<p><strong>What that looks like in the field:</strong></p>',
        '<ul>',
        '<li><strong>Faults that follow the clock, not the map.</strong> Fine first thing, '
        'degrading through the afternoon, recovered by morning. That is thermal, and it is not '
        'the radio.</li>',
        '<li><strong>Worse in summer, better in winter</strong> &mdash; the same estate, the same '
        'config, a different complaint rate.</li>',
        '<li><strong>Reboots clustered on particular units</strong> whose only shared '
        'characteristic is where they are mounted.</li>',
        '<li><strong>An early-failure cluster</strong> in one zone of a floor cabled and '
        'commissioned identically to the rest.</li>',
        '</ul>',
        C.ap_field('Heat is cumulative and quiet. An access point cooked for six years does not '
                   'announce it; it just becomes the one that needs rebooting, then the one that '
                   'drops clients, and eventually the one you replace without ever recording why. '
                   'If you are mapping an estate, note what is above each AP as well as what is '
                   'below it.'),
        '<p>Two practical points. <strong>PoE itself adds heat</strong> &mdash; the cable '
        'allowance in the section above is dissipated as warmth in the bundle, and a tight bundle '
        'of PoE runs in a warm void warms itself further. And <strong>a higher-powered access '
        'point runs hotter</strong>: an 802.3at unit at 18.71&nbsp;W has more to shed than an '
        '802.3af unit at 12.6&nbsp;W, in the same void, through the same enclosure.</p>',
        '</div></section>',

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>What the estate costs to run over ten years'
        '<span class="title-underline"></span></h2>',
        '<p>Access points are always on. Individually the draw is trivial; across eighteen units '
        'across a decade it is a real number, and it belongs in an upgrade case alongside the '
        'purchase price.</p>',
        '<p>Using the vendor&rsquo;s rated figures and 8,760 hours a year:</p>',
        '<div class="table-wrap"><table class="table">',
        '<thead><tr><th>Estate</th><th>Draw</th><th>Per year</th><th>Over 10 years</th></tr></thead>',
        '<tbody>',
        '<tr><td>Today (' + str(n_510) + ' R510 + ' + str(n_550) + ' R550)</td>'
        '<td>' + ('%.0f' % now_w) + '&nbsp;W</td>'
        '<td>' + ('%.0f' % (now_w * 8.76)) + '&nbsp;kWh</td>'
        '<td><strong>' + ('%.0f' % (now_w * 87.6)) + '&nbsp;kWh</strong></td></tr>',
        '<tr><td>All ' + str(n_510 + n_550) + ' on R550 at 802.3at</td>'
        '<td>' + ('%.0f' % after_w) + '&nbsp;W</td>'
        '<td>' + ('%.0f' % (after_w * 8.76)) + '&nbsp;kWh</td>'
        '<td><strong>' + ('%.0f' % (after_w * 87.6)) + '&nbsp;kWh</strong></td></tr>',
        '<tr><td>The difference</td><td>+' + ('%.0f' % delta) + '&nbsp;W</td>'
        '<td>+' + ('%.0f' % (delta * 8.76)) + '&nbsp;kWh</td>'
        '<td><strong>+' + ('%.0f' % (delta * 87.6)) + '&nbsp;kWh</strong></td></tr>',
        '</tbody></table></div>',
        '<p>We deliberately do not put a pound figure on that, because we do not know what you '
        'pay per unit and business tariffs vary enormously. Multiply the ten-year column by your '
        'own rate. At <strong>25p per kWh</strong> the difference between the two columns works '
        'out around <strong>&pound;' + ('%.0f' % (delta * 87.6 * 0.25)) + '</strong> across the '
        'decade &mdash; illustrative only, using a round number rather than your tariff.</p>',
        C.ap_field('Two honest caveats. The switch draws more than the access points consume, '
                   'because the PoE cable allowance is lost as heat before it reaches them &mdash; '
                   'so metered draw is higher than the table. And a Wi-Fi 6 access point can do '
                   'more work per watt: if it clears traffic faster and spends longer idle, the '
                   'real-world gap is smaller than the rated one. Rated figures are a ceiling, '
                   'not a meter reading.'),
        '</div></section>',

        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>The one nobody plans for: the stock is broadcasting too'
        '<span class="title-underline"></span></h2>',
        '<p>This one is specific to showroom and forecourt floors, and it is almost never in '
        'anyone&rsquo;s design.</p>',
        '<p><strong>Modern vehicles have Wi-Fi built in.</strong> Manufacturer-fitted hotspots, '
        'infotainment systems, connected services, telematics units. Park thirty of them on a '
        'sales floor and you have not got eighteen access points in that space &mdash; you have '
        'eighteen access points and several dozen uncontrolled radios you do not own, cannot '
        'configure, cannot channel-plan around and cannot switch off.</p>',
        '<p>Many broadcast with the ignition off or in accessory mode, so the floor is noisy '
        'overnight as well. And the noise level <em>changes with your stock</em> &mdash; which is '
        'why the fault looks random and why it so often gets pinned on the access points.</p>',
        C.ap_advisory('This is the classic cause of &ldquo;the Wi-Fi is worse when we are busy&rdquo; '
                      'on a sales floor, and it is not a capacity problem. Busy means more people, '
                      'more phones AND a fuller floor of broadcasting stock, all competing for the '
                      'same handful of channels.'),
        '<p><strong>How to diagnose it &mdash; and it is quick:</strong></p>',
        '<ol>',
        '<li><strong>Do a passive scan from the middle of the floor and count what you can hear.</strong> '
        'Not signal strength &mdash; a list of every network and BSSID in range. If dozens of '
        'them are not yours and not the neighbours&rsquo;, you have found it. Our '
        '<a href="/wifi-signal-test/">free Wi-Fi survey tool</a> runs in a browser and will show '
        'you what is in earshot.</li>',
        '<li><strong>Look at channel utilisation, not signal strength.</strong> This is the key '
        'measurement and the one people skip. Your access points can show a strong signal '
        'everywhere while the channel is too congested to use. Strong and unusable look identical '
        'on a coverage map.</li>',
        '<li><strong>Check which channels the noise sits on.</strong> Vehicle hotspots have '
        'historically clustered on 2.4GHz, where there are only three non-overlapping channels to '
        'begin with.</li>',
        '<li><strong>Correlate with the floor.</strong> Scan a full floor and a near-empty one, '
        'or scan the same spot before and after a delivery. If the noise floor moves with the '
        'stock, that is your answer and it is not arguable.</li>',
        '<li><strong>Scan out of hours.</strong> If the floor is still noisy at 10pm with nobody '
        'in the building, it is not staff devices.</li>',
        '</ol>',
        '<p><strong>What to do about it,</strong> given you cannot turn any of it off:</p>',
        '<ul>',
        '<li><strong>Move your traffic to 5GHz wherever you can.</strong> Far more channels, and '
        'historically far less competition from vehicle hotspots. On a floor like this it is the '
        'single most effective change.</li>',
        '<li><strong>Consider fewer 2.4GHz radios, not more.</strong> If 2.4GHz is congested, '
        'adding access points on it makes the congestion worse. Leaving it on a handful of units '
        'for the devices that genuinely need it is often better than running it everywhere.</li>',
        '<li><strong>Use the DFS channels</strong> if your kit and site allow &mdash; consumer and '
        'vehicle hardware frequently avoids them, which is precisely why they are quieter.</li>',
        '<li><strong>Turn power down.</strong> Loud access points hear more of the noise and hold '
        'clients further away. On a dense noisy floor, quieter and closer beats louder.</li>',
        '</ul>',
        C.ap_field('Worth saying to whoever signs the order: no access point upgrade fixes this. '
                   'A Wi-Fi 6 unit handles a congested channel more gracefully than a Wi-Fi 5 one, '
                   'but it cannot make the stock stop transmitting. If the floor is noisy, spend '
                   'the money on channel planning and 5GHz coverage before hardware.'),
        '</div></section>',

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Rolling it out across a live two-acre floor'
        '<span class="title-underline"></span></h2>',
        '<p>Two acres is roughly <strong>8,000 square metres</strong>. Across '
        '' + str(n_510 + n_550) + ' access points that is about <strong>450 square metres '
        'each</strong> &mdash; which on an open sales floor is a density driven by client numbers '
        'and interference, not by how far the signal reaches.</p>',
        '<p><strong>That density is itself a clue.</strong> With this many radios in one open '
        'space, 2.4GHz has only three non-overlapping channels to share between them. Every '
        'access point you add on 2.4GHz past the third is talking over one of the others. If your '
        'floor is worse when it is busy, co-channel interference deserves suspicion well before '
        'the hardware does.</p>',
        '<ul>',
        '<li><strong>Consider switching some 2.4GHz radios off entirely.</strong> Counter-intuitive, '
        'and frequently the single biggest improvement on a dense floor.</li>',
        '<li><strong>Turn transmit power down, not up.</strong> Loud access points hear each other '
        'and hold clients too long. Lower power makes handover cleaner.</li>',
        '<li><strong>Survey before and after, in the same places.</strong> Otherwise you are '
        'debating opinions. Our <a href="/wifi-signal-test/">free Wi-Fi survey tool</a> runs in a '
        'browser and saves the results, so a walk-round before you start is genuinely five '
        'minutes of work.</li>',
        '</ul>',
        '<p><strong>Sequencing a live floor:</strong></p>',
        '<ol>',
        '<li><strong>Switches first, access points second.</strong> Power has to be in place '
        'before a single R550 is mounted, or you are commissioning into the limited mode above.</li>',
        '<li><strong>Prove it on one zone.</strong> Pick the worst-performing corner, do that '
        'area properly, and measure it for a week before committing to the rest.</li>',
        '<li><strong>Keep the two estates on the same SSID during changeover</strong> so staff '
        'notice nothing, and roll back per-zone rather than per-AP if something is wrong.</li>',
        '<li><strong>Work to the trading day, not the calendar.</strong> Access points can be '
        'mounted and cabled during trading; the switch and controller work cannot.</li>',
        '<li><strong>Keep the old units until the new ones have survived a full busy week.</strong> '
        'They cost nothing to keep and everything to have thrown away.</li>',
        '</ol>',
        C.ap_field('The thing that goes wrong most on live rollouts is not technical. It is that '
                   'nobody told the floor staff, so the first hour of complaints gets attributed '
                   'to the new kit whether or not it deserves it. Tell people what is happening '
                   'and give them one name to report problems to.'),
        '</div></section>',
    ])

    faq = [
        ("Is a RUCKUS R510 too old to keep in 2026?",
         "Not on the vendor's own dates. The R510 went end of sale on 31 January 2022 but is "
         "supported until 31 December 2028. End of sale and end of support are different things, "
         "and it is the second that matters. If an R510 estate is unreliable, the cause is far "
         "more often power, channel planning or cabling than the age of the hardware."),
        ("Can I put R550s on the same PoE switches as my R510s?",
         "Only if those switches deliver 802.3at. The R510 is a native 802.3af access point at "
         "12.6W, which is why R510 estates so often sit on af-only switches. The R550 is rated "
         "802.3at at 18.71W, and on af it drops to a limited 12.71W mode: 2.4GHz only at reduced "
         "power, with the second Ethernet port, the onboard IoT radio and USB all disabled. It "
         "will look healthy in the controller and perform worse than the AP you removed."),
        ("How much more power does an R550 estate need than an R510 estate?",
         "Using the vendor's figures, 16 R510s at 12.6W plus 2 R550s at 18.71W draws about 239W. "
         "Eighteen R550s all on 802.3at draw about 337W - roughly 97W more. That is inside a "
         "370W switch budget and outside a 195W one, so the switch, not the access point, is "
         "usually the real purchase."),
        ("Will R510s and R550s work on the same controller?",
         "That depends entirely on your controller type and exact version, and the supported-AP "
         "list changes with each release. Check the release notes for your specific version "
         "rather than take anyone's word for it - including ours. If the R550 requires a newer "
         "release than the R510 supports, the controller upgrade is the project, not the APs."),
        ("Is it worth jumping straight to the R650 instead?",
         "Sometimes. The R550 is the like-for-like successor and keeps the same 2x2:2 stream "
         "count as the R510, so the gain is Wi-Fi 6 efficiency rather than more capacity. The "
         "R650 is 4x4:4 on 5GHz with a 2.5GbE uplink, which is a genuine step up - but it wants "
         "more power again and a faster switch port to be worth paying for."),
        ("How much PoE power is lost per metre of Cat5e?",
         "Inside the rules, none that you have to plan for. Each PoE class is defined as two "
         "numbers - what the switch supplies and what the device is guaranteed to receive - and "
         "the gap between them is the cable allowance, calculated for a full 100 metre channel. "
         "802.3af supplies 15.4W and guarantees 12.95W at the access point, so 2.45W is already "
         "set aside for the cable. An AP on a compliant 95 metre run is entitled to the same "
         "power as one on a 10 metre run."),
        ("How far can an access point be from the switch?",
         "100 metres, and it is a channel limit rather than a cable limit: roughly 90 metres of "
         "solid horizontal cable plus about 10 metres of patch leads at both ends combined. Long "
         "patch leads in the comms room eat that allowance faster than people expect, so the run "
         "on the drawing is often not the run that exists."),
        ("Is Cat6 better than Cat5e for PoE access points?",
         "For PoE the difference that matters is conductor thickness, not bandwidth. Cat5e is "
         "typically 24 AWG and Cat6 commonly 23 AWG, so Cat6 has lower resistance, drops less "
         "voltage and runs cooler in a bundle. The extra bandwidth is irrelevant to a 1GbE "
         "access point. That said, existing solid-copper Cat5e under 90 metres is perfectly "
         "capable of running an R550 at 802.3at - recabling a working floor is rarely the best "
         "use of the budget."),
        ("Should access point cabling be shielded?",
         "Only where it needs to be, and only if it is bonded properly. Shielding does nothing "
         "for your power budget - it is about interference, so it earns its place alongside "
         "mains, near motors or through plant areas. Shielded cable earthed inconsistently can "
         "carry current through the shield and cause faults stranger than the interference it "
         "was fitted to prevent. Badly installed shielded cable is worse than good unshielded "
         "cable."),
        ("Does heat shorten the life of an access point?",
         "Yes, more than anything else does. The engineering rule of thumb is that every 10C of "
         "sustained temperature rise roughly halves the working life of the capacitors and power "
         "components inside. Access points live in ceiling voids above lighting, which is the "
         "hottest part of the building, so two identical units bought the same day can fail years "
         "apart purely because of where they were mounted. Faults that follow the clock - fine in "
         "the morning, degrading through the afternoon - are thermal, not radio."),
        ("Do cars with built-in Wi-Fi interfere with a showroom's access points?",
         "They can, significantly. Modern vehicles carry manufacturer-fitted hotspots and "
         "connected-services radios, many of which broadcast with the ignition off. A floor of "
         "thirty vehicles is thirty uncontrolled radios you do not own and cannot configure, "
         "competing for the same channels as your access points - and because the noise rises and "
         "falls with your stock, the fault looks random. It is a common cause of Wi-Fi that is "
         "worse when the floor is full."),
        ("How do I tell whether vehicle Wi-Fi is affecting my network?",
         "Scan from the middle of the floor and count every network and BSSID in range rather "
         "than measuring signal strength. Then look at channel utilisation on your controller, "
         "which is the measurement that matters and the one most people skip - coverage can be "
         "strong everywhere while the channel is too congested to use. The clincher is to scan "
         "the same spot with a full floor and a near-empty one: if the noise floor moves with the "
         "stock, that is your answer."),
        ("What is the most common cause of unreliable Wi-Fi on a large open sales floor?",
         "Co-channel interference and power, in that order. On an open floor with many access "
         "points, 2.4GHz has only three non-overlapping channels, so past a handful of radios "
         "they begin talking over one another. Turning some 2.4GHz radios off and reducing "
         "transmit power often improves a busy floor more than replacing hardware."),
    ]

    _page(
        slug="ruckus-r510-unreliable-wifi-fix",
        title="RUCKUS R510 Unreliable Wi-Fi: Diagnose It Properly",
        desc="An R510 estate that keeps dropping: the eight-step diagnosis, how to test "
             "PoE properly, and the 802.3af trap that sends an R550 upgrade backwards.",
        h1="RUCKUS <em class=\"grad grad--cyan\">R510</em> unreliable? Diagnose it before you replace it",
        eyebrow="// R510 FIELD PLAYBOOK &middot; FOR IT MANAGERS",
        lede="Written for someone with an estate in front of them and a floor full of people: "
             "how to find the actual fault, how to test power properly, and what an R550 "
             "upgrade really needs before you order a single one.",
        body=body,
        chips=["Vendor figures only", "802.3af/at trap explained",
               "Dates checked " + D.DATES_CHECKED_HUMAN],
        faq=faq,
        og="RUCKUS R510 Unreliable Wi-Fi: The Field Playbook",
    )


def build_all():
    pillar(); s1_ruckus(); s2_r510(); s3_cisco(); s4_certs(); s5_poe()
    s6_dropping(); s7_controller(); s8_meraki(); s9_security(); s10_healthcheck()
    s11_r510_playbook()
