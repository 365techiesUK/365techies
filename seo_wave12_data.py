# -*- coding: utf-8 -*-
"""Wave 12 (5 Sep 2026): the Ferrari SD2 / SD3 diagnostic laptop and its Windows XP dependence.

Trigger: a real job - Windows XP rebuilt on the PC that runs a customer's lathe - and the
owner's first-hand knowledge that older Ferrari diagnostic systems still need XP-era laptops.
Research (with sources and a confidence table) lives OUTSIDE the repo in
seo-research/xp-research-ferrari-sd2.md and windows-xp-legacy-service-2026-09-05.md.
Rendered by build_new_page(). Own module per the wave rule.

The gap this page fills: across a dozen queries, no vendor, forum or IT firm publishes a
"keep the XP laptop alive" page; the "windows xp" phrasing is owned by grey-market clone-kit
sellers. This is a reputation/expertise page for a handful of high-value UK garages, not a
traffic page.

GUARDS THAT MUST NOT BE UNDONE
  - No customer garage is named. Ever.
  - No clone-kit vendor is named or linked. If SDX is mentioned, Waycon is its maker and
    Ferrari's own technical site is the only pointer.
  - We keep the LAPTOP alive. We do not supply, repair, unlock or reflash testers, VCIs or
    cables; do not supply diagnostic software or ECU files (we only image the customer's own
    working machine or original media); do not connect anything to a car; give no advice on
    clutch, PIS, ABS, airbag or any vehicle procedure.
  - No claim that SD2 works on Windows 10/11, in a VM, or over a USB-serial adapter: the
    research found NO confirmed report of the SD2 tester talking to a car from a VM. Wording
    is "bench-proven first or we don't sell it".
  - Genuine Windows XP licence only. No price for any tester. No walk-in, no premises.
  - Nominative use of Ferrari / Maserati / SD2 / SD3 / SDX / DEIS / Leonardo only (TMA 1994
    s.11(2)(c) intended-purpose limb); no logos; the independence line stays in section 06.
  - Where a claim was Medium confidence it was made vaguer, not more specific: "through to
    the Enzo era" rather than a model list; "an SDX 2.0 exists - ask Waycon" rather than an OS.
"""

SEO_WAVE12_PAGES = [
 {'slug': 'ferrari-sd2-laptop-windows-xp',
  'title': 'Ferrari SD2 &amp; SD3 Laptops: Keeping Windows XP Alive',
  'metaDesc': 'The Ferrari SD2 needs a 32-bit, XP-era laptop with a serial port; the SD3 the same era of PC. We image, clone and protect it. We never touch the car.',
  'ogTitle': 'Ferrari SD2 &amp; SD3: Keep the XP Laptop Alive',
  'crumbName': 'Ferrari SD2 &amp; SD3 Laptops',
  'eyebrow': '// LEGACY DIAGNOSTIC LAPTOPS',
  'h1': 'Keeping the laptop behind your Ferrari SD2 / SD3 alive',
  'lede': 'The tester is the rare, expensive part. The laptop it plugs into is the part that dies &mdash; a 32-bit, XP-era machine with a real serial port, carrying ECU data that is hard to get again. We keep that laptop working, with a tested spare on the shelf, for independent specialists and owners &mdash; in Dorset first, further afield by arrangement. We don&rsquo;t touch the car.',
  'ctaHead': 'Send us a photo of the laptop and we&rsquo;ll tell you what&rsquo;s possible',
  'ctaSub': 'Call 01202 775566 (Mon&ndash;Fri, 9am&ndash;5pm) or text 07520 615332. Tell us the laptop model and which system it runs &mdash; SD2, SD3 or SDX &mdash; and we&rsquo;ll say within a working day whether it can be imaged and what a cloned spare involves. We quote before any chargeable work. Already dead? Stop &mdash; don&rsquo;t reinstall anything. A failed disk can often still be imaged.',
  'serviceName': 'Legacy Diagnostic Laptop Support (Windows XP)',
  'sections': [
   {'eyebrow': '/01 &mdash; WHY AN OLD LAPTOP',
    'h2': 'Why the SD2 needs an old laptop, and why Windows XP is the sweet spot',
    'html': '<p>The Ferrari <strong>SD2</strong> &mdash; <em>Sistema Diagnosi 2</em> &mdash; was built for Ferrari in the mid-1990s by Digitek, and it is a three-part kit: a handheld tester, the Windows PC software that drives it, and the cables to the car. The tester talks to the PC over an <strong>RS-232 serial link</strong>. The software is a 32-bit Windows program, and the original manual asked for a PC with a serial port and a parallel port running Windows 95.</p>'
            '<p>That is the whole story of the XP dependence. The people who keep these kits going report that the software installs happily on <strong>32-bit Windows up to and including Windows 7</strong>. Nobody has reported it working on a 64-bit Windows, and we have found no reason to expect it to. So the real requirement is three things at once: a 32-bit Windows, a <em>real</em> serial port, and the ECU data files that were installed on that machine over the years. Windows XP-era laptops &mdash; ThinkPads with a docking station, older Dells, Panasonic Toughbooks &mdash; are simply the last mainstream machines that have all three, which is why so many working kits live on one.</p>'
            '<p>It matters more than it sounds, because the SD2 is not a tool you plug in once a year. The tester has very little memory of its own for the car modules; you load and swap them from the PC as you work. The laptop is in use almost every time the tester is, so when it goes, the kit is as good as down.</p>'},
   {'eyebrow': '/02 &mdash; WHAT BREAKS',
    'h2': 'What actually goes wrong &mdash; and why it is the laptop you can do something about',
    'html': '<p>The tester is the part nobody can easily replace. The laptops were built in the 2000s and have done twenty years of workshop life. What goes wrong, from the owners&rsquo; forums and our own bench:</p>'
            '<ul><li><strong>The hardware giving up.</strong> Hard drives from that era fail without warning; batteries are long dead; hinges, keyboards and docking connectors wear out. Owners describe the machine as old and beaten up long before it stops.</li>'
            '<li><strong>A well-meant upgrade.</strong> Somebody puts a modern 64-bit Windows on it, or moves the software to a new laptop with no serial port, and the tester can no longer be reached. The software has not broken; it has lost the only host it can run on.</li>'
            '<li><strong>The ECU files going with the disk.</strong> The car modules are installed through the software&rsquo;s own update routine, from the original discs &mdash; a base system disc and per-model discs. Copying a folder from one install to another is hit-and-miss, and the original discs are scarce. If the disk dies without an image, that data can be gone.</li>'
            '<li><strong>No spare.</strong> Many workshops have one laptop for the kit and nothing behind it. The day it fails is the day a clutch job stalls.</li></ul>'
            '<p>The good news is the shape of the problem: the tester is the part you cannot easily replace, and the laptop is the part you can. A laptop can be imaged, cloned and kept on a shelf. That is the whole of what we do.</p>'},
   {'eyebrow': '/03 &mdash; THE FAMILY',
    'h2': 'SD3, SDX, DEIS and Leonardo &mdash; where each one sits',
    'html': '<p>The SD2 is one of a family, and the laptop story is much the same across it.</p>'
            '<ul><li><strong>SD3.</strong> The later palmtop tester, again from Digitek, with more memory of its own and a PC package (SD3NET) that can connect over serial, USB or Ethernet. It runs standalone for many jobs but still wants the PC for storing diagnostic data and the detailed work. Its own manual lists <strong>Windows XP (Service Pack 1)</strong> as the suggested system, with Windows 2000 and Windows 98 SE/ME as the alternatives &mdash; XP being the newest. Same era, same kind of laptop.</li>'
            '<li><strong>SDX.</strong> A reissue by Waycon in Italy that brings the SD1, SD2, SD3 and DEIS applications into one USB interface, covering cars up to the 430 Scuderia; Ferrari&rsquo;s own technical site points buyers to it. The datasheet that circulates for it asks for a PC running <em>Windows XP or later</em>, and its &ldquo;SD2 look&rdquo; mode runs the SD1/SD2 application. A newer SDX 2.0 exists &mdash; ask Waycon for its current requirements rather than us.</li>'
            '<li><strong>DEIS-Light.</strong> Ferrari&rsquo;s own current diagnostic software for the 599 GTB Fiorano onwards, licensed annually through Ferrari&rsquo;s technical-information site, with interfaces from the authorised network. A different world, and not what this page is about.</li>'
            '<li><strong>Leonardo.</strong> A modern, self-contained tool made in Italy for the independent market, covering Ferrari, Maserati, Lamborghini and McLaren. Some specialists buy one instead of keeping the SD2 and SD3 going. That is their call, and we sell no tools and recommend none.</li></ul>'
            '<p>The point of the list is the timescale. The cars these testers were built for run from the early 1990s to the 2000s &mdash; many of them twenty-five to thirty years old &mdash; and will be on the road for decades yet. The laptops behind them are not going away; they just need looking after.</p>'},
   {'eyebrow': '/04 &mdash; WHY IT STAYS IN SERVICE',
    'h2': 'What only the factory tool does &mdash; and why you cannot simply retire it',
    'html': '<p>A generic OBD reader gets you engine fault codes on the later cars. It does not get you the rest, and on the earlier cars it does not even plug in: a UK-spec 355 has a three-pin diagnostic connector, not the 16-pin socket the cheap readers expect. The Ferrari-specific systems &mdash; the F1 gearbox and clutch set-up, ABS/ASR including brake bleeding, airbag, the adaptive suspension, alarm and instrument cluster &mdash; are what the factory tester is for, and owners and specialists on the forums are clear that clutch work on some F1 cars cannot be set up correctly without it.</p>'
            '<p>The honest nuance, because you will read it on the owners&rsquo; forums: the modern multi-brand tools now cover a good deal of the later cars, and some busy specialists use them for most of the day. The same threads then list what still sends them back to the SD2, the SD3 or a Leonardo &mdash; the older cars &mdash; 512TR, 355 F1 and pre-2003 360 F1 are the ones the forums name &mdash; clutch set-up on particular models, Maserati proxi alignment. We do not adjudicate which tool is best; that is your trade, not ours. What we can say is that as long as the old tool is the one you reach for, the laptop that runs it needs to be as dependable as the tester.</p>'
            '<p>Nothing on this page is advice about working on the car. That is your specialist&rsquo;s domain, and we stay out of it.</p>'},
   {'eyebrow': '/05 &mdash; WHAT WE DO',
    'h2': 'What we do &mdash; keep the laptop alive, honestly scoped',
    'html': '<ul><li><strong>A full image of the working laptop.</strong> A sector-level copy of the whole disk &mdash; Windows, the software, every ECU file, exactly as it is &mdash; verified to boot. Not a copy of a folder. This is the single most valuable thing you can do for the kit, and it is where we start.</li>'
            '<li><strong>A cloned spare on the shelf.</strong> The image restored onto a second laptop of the same or a compatible model, with a native serial port or its docking station, tested on the bench to boot and launch the software. The car-side test is yours; we do not connect anything to a vehicle.</li>'
            '<li><strong>A genuine Windows XP licence</strong> on any rebuilt or spare machine. No pirated media, ever. XP can still be activated with a genuine key &mdash; online or by the automated telephone route at the time of writing &mdash; and we handle that.</li>'
            '<li><strong>Isolation, written down.</strong> The XP laptop is never on the workshop Wi-Fi and never on the internet: a USB-only transfer rule, Windows Update off by design, and an honest note that there are no security updates and no mainstream antivirus that still supports it &mdash; isolation <em>is</em> the protection, and we set it up so it stays that way.</li>'
            '<li><strong>A hardware refresh of the original.</strong> A solid-state drive in place of the failing one (IDE or SATA, whatever the model takes), a battery, a keyboard, hinges, cooling; and recovery of the data from a disk that has already started to fail.</li>'
            '<li><strong>Serial connections in the right order.</strong> A native COM port first, a docking station second, a USB-to-serial adapter last &mdash; and only after we have tested it with your tester. We have found no reliable evidence on which adapters honour the tester&rsquo;s handshake, so we do not promise it.</li>'
            '<li><strong>A virtual machine, where it is proven.</strong> Windows XP running inside a modern PC with the serial port passed through is a sound idea for some legacy tools. For the SD2 we have found no confirmed report of it talking to a car that way, so we prove it on the bench with your kit first, or we do not sell it to you.</li>'
            '<li><strong>Re-imaging after any update</strong> you apply from your own media, so the spare is never behind the original.</li></ul>'},
   {'eyebrow': '/06 &mdash; WHAT WE DON&rsquo;T DO',
    'h2': 'What we don&rsquo;t do, said plainly',
    'html': '<ul><li>We do not supply, repair, unlock, reflash or license SD1, SD2, SD3, SDX or DEIS testers, interfaces or cables.</li>'
            '<li>We do not supply Ferrari or Maserati diagnostic software, ECU files or updates, and we install them from nothing except your own working machine or your own original media.</li>'
            '<li>We do not connect anything to a car, and we give no advice on clutch, PIS, ABS, airbag or any vehicle procedure.</li>'
            '<li>We do not claim the SD2 works on Windows 10 or 11, in a virtual machine, or over a USB-serial adapter until we have bench-tested it for you.</li>'
            '<li>We do not sell, recommend or link the &ldquo;free shipping, no tax&rdquo; clone kits, and we cannot help with one.</li>'
            '<li>We do not name our customers.</li></ul>'
            '<p>Ferrari, Maserati, SD2, SD3, SDX, DEIS and Leonardo are the names of their owners&rsquo; products, used here only to identify the equipment we support. 365 Techies is an independent IT company with no connection to Ferrari S.p.A., Maserati S.p.A., Digitek, Waycon or the makers of Leonardo, and none of them approves or endorses this page.</p>'},
   {'eyebrow': '/07 &mdash; HOW IT WORKS',
    'h2': 'A photo, a call, a plan',
    'html': '<p>Send us a photo of the laptop and one of the software running, and tell us which system it is. We will say within a working day whether it can be imaged and what a cloned spare involves, and we quote before any chargeable work. Because the laptop is offline by design, this is hands-on rather than remote: we collect free across Bournemouth, Poole, Christchurch and Dorset, and further afield we will work out the simplest way with you. The tester itself stays with you &mdash; imaging and cloning need only the laptop. The one time we would ask to see the tester is an adapter or virtual-machine bench test, and that can happen at your premises.</p>'
            '<p>If the laptop has already died, the most useful thing you can do is nothing: do not reinstall Windows, do not let anyone &ldquo;try a repair&rdquo;. A failed disk can very often still be imaged, and the ECU data recovered with it, right up until somebody writes over it.</p>'
            '<p>If you run a workshop rather than a single kit, the rest of the garage&rsquo;s IT &mdash; the office PCs, the network the isolated laptop must stay off, backups, email &mdash; is what our <a href="/it-support-for-garages-automotive/">IT support for garages</a> covers, and the laptop simply becomes one more thing we keep an eye on.</p>'}],
  'faqs': [
   {'q': 'Can I run the SD2 software on a new laptop?',
    'a': 'Not on a normal new one. The software is 32-bit and needs a real serial port to reach the tester; owners report it installs on 32-bit Windows up to Windows 7; we have found no report of it running on 64-bit, and a modern laptop has neither the 32-bit Windows nor the port. The dependable answer is to keep an XP-era machine and clone it, or to talk to us about a virtual machine that we bench-test with your kit first.'},
   {'q': 'Does the SD2 work in a virtual machine?',
    'a': 'In principle a virtual machine with the serial port passed through can host old diagnostic software, and it works for some tools. For the SD2 specifically we have found no confirmed report of the tester talking to a car from inside one. So we test it with your tester on the bench before we would ever suggest relying on it.'},
   {'q': 'Can I just copy the ECU files across to another PC?',
    'a': 'Sometimes, and sometimes the software does not recognise a copied folder. Its own update routine from the original discs is the route it expects, and those discs are scarce. A full disk image sidesteps the question entirely, which is why we image first.'},
   {'q': 'Do I need a serial port?',
    'a': 'For the SD2, yes &mdash; the tester connects over RS-232. The SD3&rsquo;s manual allows serial, USB or Ethernet. A native port or a docking station is the safe choice; a USB-to-serial adapter is a maybe, and only after it has been tested with your tester.'},
   {'q': 'Which laptop do people use for the SD2?',
    'a': 'The owners&rsquo; forums and our own bench agree: ThinkPads with a docking station, older Dells, and Panasonic Toughbooks &mdash; 32-bit XP-era machines with a real serial port. The exact model matters less than those three things.'},
   {'q': 'Can a generic OBD reader do what the SD2 does on a 360?',
    'a': 'It can read engine fault codes. It cannot do the Ferrari-specific work &mdash; the F1 clutch and gearbox set-up, ABS bleeding, airbag, suspension, cluster and alarm &mdash; and on the earlier cars it does not physically plug in. That is what the factory tool exists for.'},
   {'q': 'Do you need the SD2 to change an F1 clutch?',
    'a': 'Specialists say the clutch set-up on some F1 cars, including the PIS setting, needs the factory tool or an equivalent. That is a question for your specialist, not for us. Our part is smaller: keeping the laptop that runs it alive so the job is never waiting on a dead computer.'},
   {'q': 'Is the SDX the same as the SD2?',
    'a': 'The SDX is Waycon&rsquo;s reissue that brings the SD1, SD2, SD3 and DEIS applications into one USB interface. Its SD2 mode runs the SD1/SD2 application, and its datasheet asks for a PC running Windows XP or later. A newer SDX 2.0 exists; Waycon is the right place to ask about its current requirements.'},
   {'q': 'Is it safe to keep a Windows XP laptop in the workshop?',
    'a': 'Off the network, yes. Windows XP has had no security updates for years, so the rule is simple: it never joins the workshop Wi-Fi, never touches the internet, and only ever sees a USB stick you control. Set up that way it is a one-job machine that can run for years. If your business holds a security certification such as Cyber Essentials, an unsupported machine has to be kept segregated from the network you certify &mdash; which is exactly what this is, and we document it for you.'}],
  'chips': ['Trading since 1995', 'Rated 4.9 on Google', 'Genuine licences only'],
  'primaryCta': ['Ask about your SD2 laptop', '/contact/'],
  'secondaryCta': ['IT support for garages', '/it-support-for-garages-automotive/'],
  'schemaKind': 'service',
  'noFixNoFee': False,
  'crossLinksHtml': '<p><strong>Related:</strong> <a href="/old-program-wont-open-on-windows-11/">Old program won&rsquo;t open on a new Windows 11 computer</a> &middot; <a href="/it-support-for-garages-automotive/">IT support for garages &amp; automotive</a> &middot; <a href="/computer-repairs/">Computer repairs &amp; free collection</a> &middot; <a href="/business-it-support-plans/">Business IT support plans</a></p>'},
]
