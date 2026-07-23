# -*- coding: utf-8 -*-
"""365 Emergency Internet - the mobile connectivity funnel delivered from the off-grid 365 Crafter.

NAMING (settled with the owner 2026-07-22): the service is "365 Emergency Internet".
Starlink is referred to DESCRIPTIVELY only ("delivered over Starlink Business Priority"),
never as part of the service name. SpaceX's IP policy says their marks must not be used to
endorse a product or entity without written permission, and they have filed to trademark
"Powered by Starlink" for partner networks - so that exact phrase is avoided too.
Every page carries INDEPENDENCE.

HONESTY RULES baked in:
  * quote-based pricing only - the owner has set no prices, so none are invented
  * hardware/thermal specs come from Starlink's own published specification sheets
  * the van is positioned as SECOND-LINE, never as a replacement for automatic failover
  * NHS-connected sites are explicitly excluded (HSCN must come from an accredited supplier)
  * no fabricated downtime statistics - the common ones trace to a 2014 study
"""

INDEPENDENCE = (
  '<p class="note" style="font-size:.85rem"><strong>Independent.</strong> 365 Techies is not affiliated with, endorsed by, authorised by or a reseller for '
  'SpaceX or Starlink. We are an IT support firm that uses a Starlink Business Priority service, on a plan whose terms permit providing access to third parties. '
  '<em>Starlink</em> is a trademark of Space Exploration Technologies Corp.</p>')

REQUIREMENTS = '''<div class="callout">
<p><strong>What we need from your site &mdash; please read this before enquiring.</strong> We would rather turn an enquiry down than turn up and fail.</p>
<ul>
<li><strong>Somewhere to park the van</strong> on private land or with the landowner&rsquo;s permission, within cable reach of where you need the connection
&mdash; think tens of metres, not hundreds.</li>
<li><strong>A clear view of the sky</strong> from where the dish sits. Trees in leaf, tall buildings and overhanging structures genuinely break this. If the view
is partly blocked we may need up to <strong>24 hours of obstruction mapping</strong> before we can tell you honestly whether it will hold up.</li>
<li><strong>Nothing else.</strong> No mains power, no existing connection, no working infrastructure at all &mdash; the van is solar-powered and runs off its own
lithium battery bank. That is the part most competitors cannot do.</li>
</ul>
<p><strong>What will disqualify a site:</strong> no sky view at all; nowhere legal to park; a need for the connection to reach further than we can safely run cable;
or a requirement we cannot honestly meet. We will tell you on the phone, not on the day.</p>
</div>'''

NOT_RIGHT = '''<div class="callout">
<p><strong>When this is <em>not</em> the right answer &mdash; and we would rather say so now.</strong></p>
<ul>
<li><strong>If you want automatic failover, buy a failover router.</strong> A 4G/5G failover router switches over in seconds, unattended, day or night, for a
fraction of what a call-out costs. Nothing involving a human being and a vehicle can beat that recovery time, and we are not going to pretend otherwise.
<strong>We will happily fit you one</strong> &mdash; that is the honest first answer for most businesses.</li>
<li><strong>If you need it for months</strong>, you need a fixed line or a permanent installation, not a van on your forecourt.</li>
<li><strong>If you have no view of the sky</strong>, satellite will not work. No amount of good intentions changes that.</li>
<li><strong>If you are an NHS-connected site</strong> &mdash; a GP practice, community pharmacy or NHS dental practice &mdash; your clinical systems reach the NHS
over a specific accredited network, and no third party can restore that with an ad hoc link. We will help with your general office connectivity, but we will not
claim to put your clinical systems back.</li>
</ul>
</div>'''

EMERGENCY_PAGES = [

# ===========================================================================
# HUB
# ===========================================================================
{'slug': 'emergency-internet',
 'title': 'Emergency Internet for Business in Dorset | 365 Techies',
 'metaDesc': 'Broadband down? We bring fast internet to you. 365 Emergency Internet is delivered from our solar-powered off-grid van, over WiFi or wired into your '
             'network &mdash; for outages, events and locations with no connection at all. Bournemouth, Poole and across Dorset.',
 'ogTitle': '365 Emergency Internet &mdash; We Bring the Internet to You | 365 Techies',
 'crumbName': 'Emergency Internet',
 'eyebrow': '// 365 EMERGENCY INTERNET',
 'h1': 'Your broadband is down. <em class="grad grad--cyan">We bring the internet to you.</em>',
 'lede': 'Most emergency broadband companies post you a box and hope it arrives tomorrow. We drive a solar-powered, off-grid van to your premises and give you a '
         'genuinely fast satellite connection &mdash; over WiFi or wired into your network. It needs no mains power and no working infrastructure, because the van '
         'carries its own. Family-run in Bournemouth since 1995.',
 'chips': ['We come to you', 'No mains power needed', 'Same-day where we can'],
 'primaryCta': ['Call 01202 775566', 'tel:+441202775566'],
 'secondaryCta': ['Plan it before you need it', '/business-continuity-internet/'],
 'ctaHead': 'Down right now?',
 'ctaSub': 'Call us on 01202 775566 and we will tell you honestly, on the phone, whether we can help you today and what it will cost. If a &pound;300 failover '
           'router is the better answer for you, we will say so.',
 'serviceName': '365 Emergency Internet &mdash; mobile connectivity response',
 'schemaKind': 'service',
 'sections': [

  {'eyebrow': '/01 &mdash; WHAT IT IS',
   'h2': 'What is 365 Emergency Internet?',
   'html': '<p>It is a van. That is the honest short answer, and it is also the whole point.</p>'
           '<p>The <strong>365 Crafter</strong> is our mobile support vehicle. It carries a Victron off-grid power system &mdash; a Cerbo GX running Venus OS, solar '
           'charging, a lithium battery bank, a SmartShunt and a DC-DC charger &mdash; and a satellite internet terminal running on a <strong>Starlink Business '
           'Priority</strong> service. It is a real working vehicle we already run our business from, not a demonstrator built for a brochure.</p>'
           '<p>We park it near your premises, put the dish where it can see the sky, and hand you a connection &mdash; either as WiFi for your staff and devices, or '
           'wired properly into your existing network so your normal systems come back.</p>'
           '<p><strong>The thing that makes it different:</strong> it needs nothing from your building. No mains power. No working line. No infrastructure at all. A '
           'competitor&rsquo;s emergency router still needs a socket and a building with electricity in it. Ours doesn&rsquo;t &mdash; which matters more than you '
           'would think, because a power cut and a broadband fault are different problems and one of them takes the other with it.</p>'
           + INDEPENDENCE},

  {'eyebrow': '/02 &mdash; BE HONEST FIRST',
   'h2': 'Should you actually call us, or buy a failover router?',
   'html': '<p>We are going to answer this before we sell you anything, because the answer is often &ldquo;not us&rdquo;.</p>'
           '<p><strong>If your only worry is &ldquo;what if the broadband goes down for an afternoon&rdquo;, the right answer is an automatic 4G or 5G failover '
           'router.</strong> It sits in your comms cupboard, notices the line has gone, and switches to mobile data in seconds &mdash; no phone call, no waiting, no '
           'one driving anywhere. It costs a few hundred pounds plus a modest monthly data cost, and it works at three in the morning on a bank holiday.</p>'
           '<p>No van, ours or anyone else&rsquo;s, can beat that recovery time. We are not going to insult you by pretending it can. <strong>We fit failover '
           'routers, and for most businesses that is what we will recommend first.</strong></p>'
           '<p><strong>So when is the van the right call?</strong> Four situations, and they are real:</p>'
           '<ol><li><strong>Where mobile coverage is poor.</strong> Failover only works if there is a mobile signal to fail over to. Across rural Dorset, the '
           'Purbecks and plenty of industrial units, there isn&rsquo;t one worth having. Satellite does not care.</li>'
           '<li><strong>When the outage runs into days rather than hours.</strong> More on that below &mdash; the standard repair timescales are worse than most '
           'people realise.</li>'
           '<li><strong>When you have lost power too</strong>, or the building is unusable. A failover router in a dark building does nothing at all.</li>'
           '<li><strong>When you need real bandwidth</strong>, not just enough to limp &mdash; a room full of people, an event, a live stream, or shifting large '
           'files.</li></ol>'
           '<p>That is the honest shape of it. We are the second line, not the first.</p>'},

  {'eyebrow': '/03 &mdash; THE REAL TIMESCALES',
   'h2': 'How long you are actually offline, if you do nothing',
   'html': '<p>This is the part that changes people&rsquo;s minds, and almost nobody explains it.</p>'
           '<p>UK broadband faults are repaired against <strong>care levels</strong>, and most business lines are on the standard one. Under standard care, a fault '
           'is due to be cleared by end of the <strong>second working day</strong> after you report it &mdash; and that clock <strong>excludes weekends and bank '
           'holidays</strong>.</p>'
           '<p><strong>So a fault reported on Friday afternoon is not due to be fixed until end of Tuesday.</strong> Over an Easter or Christmas weekend it stretches '
           'further still. That is not a failure of the system; that is the system working as designed.</p>'
           '<p>Two more things worth knowing:</p>'
           '<ul><li><strong>The regulated target is only 85%.</strong> Ofcom&rsquo;s quality-of-service standards require repair within the timescale for 85% of '
           'faults, with 97% within a further five days. Roughly one fault in seven is permitted to miss it entirely.</li>'
           '<li><strong>The clock stops for things outside their control</strong> &mdash; waiting on permissions, third-party access, traffic management &mdash; and '
           'during a declared major outage the timescales effectively suspend. Which is precisely when you most need to be online.</li></ul>'
           '<p><strong>And there is a deadline coming.</strong> The old analogue phone network is being switched off, with the current industry date of '
           '<strong>31 January 2027</strong>. After that your phones run over your broadband. A broadband fault will no longer just cost you email &mdash; it will '
           'take your telephones with it. If you have not thought about that yet, this is the year to.</p>'},

  {'eyebrow': '/04 &mdash; WHAT WE NEED',
   'h2': 'What we need from your site',
   'html': REQUIREMENTS},

  {'eyebrow': '/05 &mdash; HOW IT CONNECTS',
   'h2': 'How we join it to your network, safely',
   'html': '<p>This is the part done badly most often, and it is worth explaining because it is where an emergency fix can quietly become a security incident.</p>'
           '<p><strong>The rule we work to: we hand the connection to your firewall as a second internet feed.</strong> We do not plug a strange router into your '
           'network switch and create a second doorway into your business. Your firewall stays in charge, your rules still apply, and when the line comes back you '
           'simply go back to normal.</p>'
           '<p>If your firewall genuinely cannot take a second feed, the fallback is a <strong>completely separate network</strong> &mdash; our own router, our own '
           'addresses, our own WiFi, with no route into your systems at all. That gets your people onto email, cloud apps and the web while your own network stays '
           'sealed. <em>We will tell you plainly which of the two you are getting, and what each one does and does not give you back.</em></p>'
           '<p>Either way: a unique password for your visit, never a shared one reused between customers; guest devices isolated from each other; and modern '
           'encryption throughout.</p>'
           '<p><strong>Things we will warn you about before we start, not after:</strong> some systems are pinned to your normal internet address &mdash; card '
           'payment portals, banking, sign-in rules that check where you are connecting from, site-to-site VPNs. Arriving on a different connection can trip those. '
           'It is fixable, but it needs to be known in advance, which is exactly why the sensible version of this service is <a '
           'href="/business-continuity-internet/">planned before you need it</a> rather than improvised on the worst morning of your year.</p>'},

  {'eyebrow': '/06 &mdash; WHEN NOT TO CALL US',
   'h2': 'When this is not the right answer',
   'html': NOT_RIGHT},

  {'eyebrow': '/07 &mdash; WHAT IT COSTS',
   'h2': 'What does it cost?',
   'html': '<p>We are not going to publish a number we have not properly worked out, because the whole site is built on not doing that.</p>'
           '<p>What we can tell you honestly is how it is <em>priced</em>: a call-out for the response itself, and a day rate for planned work like events. If you '
           'are an existing support customer, this sits naturally alongside your cover rather than being a separate purchase.</p>'
           '<p><strong>What we will not do is quote you a fear-based figure for what downtime costs.</strong> If you search for it you will find &ldquo;&pound;3,000 '
           'an hour&rdquo; and similar numbers repeated everywhere &mdash; they trace back through a chain of marketing blogs to a study from 2014, and they are '
           'survey estimates rather than measured losses. We would rather sit down and work out <em>your</em> number from your own figures: staff cost per hour '
           'times people blocked, your average transaction value, what you actually cannot do. That number is real and it is usually the one that settles the '
           'decision.</p>'
           '<p><a href="/contact/">Tell us what you need</a> and we will price it properly.</p>'},

  {'eyebrow': '/08 &mdash; WHERE WE GO',
   'h2': 'Where we can get to',
   'html': '<p>We are based in Bournemouth and the van covers <strong>Poole, Christchurch, Wimborne, Wareham, Ferndown, Ringwood, the Purbecks and the wider Dorset '
           'area</strong>, with the New Forest and south-east Hampshire within reach.</p>'
           '<p><strong>An honest limit: we have one van.</strong> If it is committed to a booked event, we cannot be in two places at once, and we will tell you that '
           'when you call rather than leave you waiting. That is also the single best argument for <a href="/business-continuity-internet/">agreeing a plan in '
           'advance</a> if being online genuinely matters to your business.</p>'
           '<p>We carry <strong>&pound;10 million public liability cover, underwritten by Hiscox</strong>, and can provide the certificate on request &mdash; commercial '
           'sites, venues and managing agents usually want to see it before letting anyone on site.</p>'
           '<p>Our response times are what we can honestly staff and drive &mdash; we will give you a realistic window on the phone. We are not going to publish an '
           'SLA we cannot keep with one vehicle.</p>'},
 ],
 'faqs': [
  {'q': 'My business broadband is down &mdash; what can I do today?',
   'a': 'First, confirm it is really the line: check the router lights and your provider&rsquo;s status page, and try tethering a phone to see whether the problem is '
        'the connection or something inside your network. Report the fault and get a reference and an estimated fix time. If that estimate is longer than you can '
        'survive, you need a temporary connection &mdash; either a 4G/5G router if you have decent mobile coverage, or something like our van if you do not. Call us '
        'on 01202 775566 and we will tell you honestly which you need.'},
  {'q': 'How quickly can I get temporary internet for my business?',
   'a': 'Most emergency broadband suppliers courier a router to you on a next-working-day basis. Because we are based in Bournemouth and the van is already in the '
        'county, we can often be on site the same day within Dorset &mdash; subject to the van being free, since we only have one. What we cannot beat is an '
        'automatic failover router already installed, which switches over in seconds without anyone doing anything.'},
  {'q': 'Do I need mains power or a working connection for this?',
   'a': 'No, and that is the main thing that separates it from a couriered emergency router. The 365 Crafter is genuinely off-grid &mdash; solar charging and a '
        'lithium battery bank running a Victron system &mdash; so it powers itself and the satellite equipment. All we need is somewhere to park within cable reach '
        'and a clear view of the sky.'},
  {'q': 'What&rsquo;s the best backup internet for a small business?',
   'a': 'For most small businesses, an automatic 4G or 5G failover router is the right first answer: it switches over in seconds, unattended, and costs a few hundred '
        'pounds plus a modest monthly data cost. It is only the wrong answer where mobile coverage is poor, where you also lose power, where an outage runs into '
        'days, or where you need serious bandwidth rather than enough to limp. We fit failover routers as well as running the van, so we have no reason to push you '
        'towards the more expensive option.'},
  {'q': 'How long does a UK broadband fault usually take to fix?',
   'a': 'On the standard care level that most business lines use, a fault is due to be cleared by the end of the second working day after you report it &mdash; and '
        'that excludes weekends and bank holidays, so a Friday afternoon fault may not be due until end of Tuesday. Ofcom only requires 85% of faults to be repaired '
        'within the timescale. During a major outage the timescales effectively suspend.'},
  {'q': 'Is 365 Techies a Starlink dealer?',
   'a': 'No. We are not affiliated with, endorsed by or authorised by SpaceX or Starlink, and we do not sell or resell their hardware or subscriptions. We are an IT '
        'support firm that uses a Starlink Business Priority service on our own van, on a plan whose terms permit providing access to third parties. If you want to '
        'buy your own Starlink kit, buy it from Starlink &mdash; and we are happy to install and configure it for you.'},
 ],
 'crossLinksHtml': '<p><strong>In this section:</strong> <a href="/broadband-down/">broadband down right now? start here</a> &middot; '
                   '<a href="/business-continuity-internet/">plan it before it happens</a> &middot; '
                   '<a href="/event-wifi-dorset/">internet for events and live streaming</a> &middot; '
                   '<a href="/off-grid-internet/">off-grid and no-signal locations</a></p>'},

# ===========================================================================
# SPOKE 1 - broadband down (informational, top of funnel)
# ===========================================================================
{'slug': 'broadband-down',
 'title': 'Business Broadband Down? What To Do, In Order | 365 Techies',
 'metaDesc': 'A calm, ordered checklist for when your business broadband goes down &mdash; how to tell whether it is your kit or the line, what to say when you '
             'report it, how to keep trading, and when to escalate. From a Dorset IT firm since 1995.',
 'ogTitle': 'Broadband Down? The Calm Checklist | 365 Techies',
 'crumbName': 'Broadband Down',
 'eyebrow': '// BROADBAND DOWN &middot; WHAT TO DO',
 'h1': 'Broadband down? <em class="grad grad--cyan">Work through this.</em>',
 'lede': 'No sales pitch on this page. If your business has just gone offline, here is the order to work through &mdash; how to find out whether it is your '
         'equipment or the line, what to say when you report it so you are not fobbed off, and how to keep trading while you wait.',
 'chips': ['No sign-up needed', 'Ordered checklist', 'What to say when you report it'],
 'primaryCta': ['Call 01202 775566', 'tel:+441202775566'],
 'secondaryCta': ['Is it down for everyone?', '/is-it-down/'],
 'ctaHead': 'Stuck, or been told it will be days?',
 'ctaSub': 'Call us. We will tell you on the phone whether we can help today, whether a failover router is the better answer, or whether the honest advice is to '
           'wait it out. Bournemouth, Poole, Christchurch and Dorset.',
 'serviceName': 'Emergency broadband fault support',
 'schemaKind': 'service',
 'sections': [

  {'eyebrow': '/01 &mdash; FIRST FIVE MINUTES',
   'h2': 'The first five minutes',
   'html': '<ol><li><strong>Look at the router&rsquo;s lights before you touch anything.</strong> Photograph them. Which light is wrong tells the engineer more than '
           'ten minutes of description will.</li>'
           '<li><strong>Plug a laptop into the router with a cable.</strong> If the wired connection works, your line is fine and you have a WiFi or network problem '
           '&mdash; a completely different job, and our <a href="/wifi-troubleshooting/">WiFi fault-finding guide</a> takes it from there.</li>'
           '<li><strong>Check your provider&rsquo;s status page</strong>, and check whether it is <a href="/is-it-down/">down for everyone or just you</a>. An area '
           'fault means there is nothing to fix at your end and a queue of people ahead of you.</li>'
           '<li><strong>Tether a phone</strong> and see whether the internet works over mobile. If it does, the problem really is your line rather than the wider '
           'internet, and that is also your emergency stopgap for the next hour.</li>'
           '<li><strong>Restart the router once.</strong> Once. Not repeatedly &mdash; see the warning below.</li></ol>'
           '<div class="callout"><p><strong>Do not sit there rebooting the router.</strong> On copper and part-fibre lines, repeated resyncs are read as instability '
           'and the network responds by making your line slower but steadier &mdash; and that reduction can persist long after the fault is fixed. You can '
           'permanently slow your own broadband by rebooting it all morning.</p></div>'},

  {'eyebrow': '/02 &mdash; REPORTING IT',
   'h2': 'How to report it so you are not fobbed off',
   'html': '<p>Have these ready before you ring, and the call goes very differently:</p>'
           '<ul><li>Your <strong>account number</strong> and the <strong>circuit or line ID</strong> if you have it.</li>'
           '<li><strong>What you have already tested</strong> &mdash; &ldquo;wired laptop straight into the router, no connection, router shows no broadband '
           'light&rdquo;. This alone skips twenty minutes of script.</li>'
           '<li>When it started, and whether anything happened at the same time &mdash; street works, a power cut, a storm, a builder.</li></ul>'
           '<p><strong>Then ask three specific questions and write the answers down:</strong></p>'
           '<ol><li>&ldquo;What is my <strong>fault reference</strong>?&rdquo;</li>'
           '<li>&ldquo;What <strong>care level</strong> is this line on, and what is the committed fix time under it?&rdquo;</li>'
           '<li>&ldquo;Is there a <strong>declared area fault or major outage</strong>?&rdquo;</li></ol>'
           '<p>That second question is the one almost nobody asks, and it is the one that tells you whether you are waiting hours or working days. On standard care '
           'the target is end of the <strong>second working day</strong>, excluding weekends and bank holidays &mdash; so a Friday fault can legitimately run to '
           'Tuesday.</p>'},

  {'eyebrow': '/03 &mdash; KEEP TRADING',
   'h2': 'How to keep trading while you wait',
   'html': '<ul><li><strong>Card payments:</strong> most modern card readers can fall back to a mobile network on their own, so check yours before assuming you '
           'cannot take money. Know your acquirer&rsquo;s authorisation phone line as a last resort.</li>'
           '<li><strong>Phones:</strong> if your phone system runs over broadband, divert the main number to a mobile now rather than later. Your provider can '
           'usually do this remotely in minutes. <em>After the analogue switch-off in January 2027 this will apply to almost everyone.</em></li>'
           '<li><strong>Tether, but plan it:</strong> a phone hotspot will carry email and card terminals for a while. It will not carry a room full of people doing '
           'video calls, and it will eat somebody&rsquo;s data allowance.</li>'
           '<li><strong>Tell customers before they find out.</strong> A note on the door and a post on your page costs nothing and buys a great deal of '
           'patience.</li>'
           '<li><strong>Write down what broke.</strong> Not for now &mdash; for afterwards. The list of what you could not do is exactly the raw material for a '
           '<a href="/business-continuity-internet/">plan that stops it hurting next time</a>.</li></ul>'},

  {'eyebrow': '/04 &mdash; WHEN TO ESCALATE',
   'h2': 'When to stop waiting',
   'html': '<p>Escalate when the estimated fix time is longer than your business can survive &mdash; and that is a number only you can set. If you cannot trade, '
           'cannot dispense, cannot take bookings or cannot pay staff, the estimate does not have to be unreasonable to be unacceptable.</p>'
           '<p>At that point you have three realistic options:</p>'
           '<ol><li><strong>A 4G or 5G router</strong>, if your mobile coverage is decent. Fastest and cheapest, and if you keep it afterwards it becomes automatic '
           'failover for next time. <strong>This is the right answer for most businesses.</strong></li>'
           '<li><strong>Relocate</strong> temporarily &mdash; genuinely worth considering for office-based work, and free.</li>'
           '<li><strong>Have a connection brought to you</strong> &mdash; <a href="/emergency-internet/">what our van does</a>. The right answer where mobile '
           'coverage is poor, where you have lost power as well, where the outage is running into days, or where you need real bandwidth rather than enough to '
           'limp.</li></ol>'
           '<p>We would genuinely rather you took option one and never needed us. <a href="/contact/">Ask us</a> and we will tell you which of the three fits.</p>'},
 ],
 'faqs': [
  {'q': 'How do I know if it is my router or the broadband line?',
   'a': 'Plug a laptop directly into the router with a network cable. If that works, your line is fine and you have a WiFi or internal network problem. If it does '
        'not, look at the router&rsquo;s broadband or DSL light &mdash; if it is off or flashing, the fault is on the line rather than inside your building. Then '
        'check your provider&rsquo;s status page for a declared area fault before you spend an hour on hold.'},
  {'q': 'Why should I not keep rebooting my router?',
   'a': 'On copper and part-fibre lines, repeated disconnections are interpreted as an unstable line, and the network automatically makes it slower in exchange for '
        'stability. That reduction can persist long after the original fault is fixed. Restart it once as a genuine test, then stop &mdash; you can permanently slow '
        'your own connection by rebooting it repeatedly.'},
  {'q': 'What should I ask my provider when I report a broadband fault?',
   'a': 'Ask for the fault reference, ask what care level the line is on and what fix time that commits them to, and ask whether there is a declared area fault. The '
        'care level question is the one people miss and it is the one that tells you whether you are waiting hours or working days &mdash; standard care targets end '
        'of the second working day and excludes weekends and bank holidays.'},
  {'q': 'Can I still take card payments if my broadband is down?',
   'a': 'Usually yes. Most modern card readers can fall back to a mobile network by themselves, so check yours rather than assuming the worst. What is more likely to '
        'break is cloud-based till software, which often keeps taking orders offline but loses reporting and stock until it reconnects. Know your card '
        'acquirer&rsquo;s authorisation phone line as a final fallback.'},
 ],
 'crossLinksHtml': '<p><strong>Next:</strong> <a href="/emergency-internet/">get a connection brought to you</a> &middot; '
                   '<a href="/business-continuity-internet/">make a plan so it hurts less next time</a> &middot; '
                   '<a href="/is-it-down/">check if a service is down for everyone</a> &middot; '
                   '<a href="/wifi-troubleshooting/">if the line is fine but WiFi is not</a></p>'},

# ===========================================================================
# SPOKE 2 - business continuity + the emergency procedure
# ===========================================================================
{'slug': 'business-continuity-internet',
 'title': 'Broadband Emergency Plan for Business | 365 Techies Dorset',
 'metaDesc': 'Build a written broadband emergency procedure before you need it &mdash; impact analysis, objective trigger points, named roles, an escalation ladder '
             'with clocks, and a rehearsal. Plus honest advice on failover routers versus a mobile response.',
 'ogTitle': 'Mission-Critical Broadband Backup &mdash; Plan It Before You Need It | 365 Techies',
 'crumbName': 'Broadband Emergency Plan',
 'eyebrow': '// BUSINESS CONTINUITY &middot; BROADBAND',
 'h1': 'A broadband emergency plan, <em class="grad grad--cyan">written before you need it</em>',
 'lede': 'The worst time to work out what you do when the internet dies is while it is dead. This is the plan we build with businesses &mdash; what breaks, how long '
         'you can survive it, who does what, and at exactly what point you stop waiting and start acting. It is useful whether or not you ever call us.',
 'chips': ['Written, rehearsed, yours', 'Honest about failover first', 'Built from your numbers'],
 'primaryCta': ['Plan yours with us', '/contact/'],
 'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
 'ctaHead': 'Shall we build yours?',
 'ctaSub': 'We will walk your business, work out what genuinely breaks and how long you can stand it, fit the right failover kit, and leave you with a written '
           'procedure your staff can follow when you are not there. Then we will test it with you.',
 'serviceName': 'Broadband business continuity planning and emergency response',
 'schemaKind': 'service',
 'howToName': 'How to build a broadband emergency procedure for a small business',
 'howToSteps': [
   {'name': 'Work out what actually breaks', 'text': 'List each business activity, what it depends on, and what stops working without connectivity. Do this before choosing any equipment.'},
   {'name': 'Set your own tolerance', 'text': 'For each activity, decide the longest you could survive it being down, and how quickly you need it back. Build the cost from your own figures rather than a published average.'},
   {'name': 'Fix the first line', 'text': 'For most businesses this is an automatic 4G or 5G failover router, which switches over in seconds unattended. Check mobile coverage at the premises first.'},
   {'name': 'Write objective triggers', 'text': 'Define in writing what starts the procedure: total loss confirmed at the router for a set number of minutes, or a provider estimate that exceeds your recovery target.'},
   {'name': 'Name roles and deputies', 'text': 'Incident lead, communications, technical, and payments. Every role needs a named deputy, because outages do not wait for full staffing.'},
   {'name': 'Build the contact tree', 'text': 'Provider fault line, account number, circuit ID, care level, your IT support out-of-hours number, card acquirer authorisation line, and phone system provider.'},
   {'name': 'Set an escalation ladder with clocks', 'text': 'Confirm and log at 15 minutes, fault raised with a reference by 30 minutes, fallback measures live by one hour, decision on external support at two hours.'},
   {'name': 'Rehearse it', 'text': 'Unplug the line deliberately at a quiet time and run the procedure. A plan nobody has tested is a document, not a capability.'},
 ],
 'sections': [

  {'eyebrow': '/01 &mdash; FIRST, THE HONEST BIT',
   'h2': 'Buy the failover router first. We mean it.',
   'html': '<p>If you take one thing from this page: <strong>for most businesses, the correct first line of defence is an automatic 4G or 5G failover router</strong>, '
           'not a plan to phone somebody.</p>'
           '<p>It sits alongside your existing router, notices the line has failed, and moves your traffic onto mobile data within seconds &mdash; unattended, at '
           'three in the morning, on Boxing Day. It costs a few hundred pounds plus a small monthly data cost. Nothing that involves a human being and a vehicle '
           'competes with that.</p>'
           '<p>We fit them. We would rather fit you one and never hear from you in an emergency than sell you a more exciting service that recovers you more '
           'slowly.</p>'
           '<p><strong>Two things to check before you buy one, though:</strong> what the mobile coverage is actually like <em>at your premises</em> (not on a '
           'coverage map), and whether your systems will tolerate arriving on a different internet address &mdash; some card portals, banking systems and sign-in '
           'rules check that. Both are things we test as part of building the plan.</p>'},

  {'eyebrow': '/02 &mdash; WHAT BREAKS',
   'h2': 'Step one: what actually breaks?',
   'html': '<p>Every plan starts here, and almost every plan we are shown skips it and starts with equipment instead.</p>'
           '<p>Go activity by activity and write down what stops. It is nearly always more than people expect:</p>'
           '<ul><li><strong>Cloud till and booking systems</strong> &mdash; many keep taking orders offline, but you lose reporting, stock and often the ability to '
           'look anything up. Find out exactly what your own system does offline <em>before</em> the day you need to know.</li>'
           '<li><strong>Card payments</strong> &mdash; usually more resilient than people fear, since most modern readers fall back to mobile networks. Check yours '
           'anyway.</li>'
           '<li><strong>Phones</strong> &mdash; if they run over broadband, they go with it. <strong>After the analogue switch-off, currently set for 31 January '
           '2027, that will be almost everybody.</strong></li>'
           '<li><strong>Anything cloud-based</strong> &mdash; email, files, accounts, practice management, design tools, the lot.</li>'
           '<li><strong>Door entry, CCTV, alarms and remote monitoring</strong> &mdash; routinely forgotten until they are needed.</li></ul>'
           '<p><strong>Then put your own number on it.</strong> Not a number off the internet. If you search for the cost of downtime you will find &ldquo;&pound;3,000 '
           'an hour&rdquo; and similar figures repeated across dozens of sites &mdash; they trace back through a chain of marketing articles to a study from 2014, '
           'and they were survey estimates rather than measured losses. Yours is: staff cost per hour times people who cannot work, plus transactions you cannot '
           'take, plus anything with a deadline. It takes twenty minutes and it is the number that decides everything else.</p>'},

  {'eyebrow': '/03 &mdash; THE PLAN ITSELF',
   'h2': 'What a proper written procedure contains',
   'html': '<p>We build these using standard business-continuity language, because it makes the document something your insurer, your auditor and a serious customer '
           'will recognise rather than a leaflet.</p>'
           '<ul><li><strong>How long you can tolerate it</strong> and <strong>how fast you need it back</strong> &mdash; agreed per activity, in writing, by you and '
           'not by us.</li>'
           '<li><strong>Objective triggers.</strong> Not &ldquo;when it feels bad&rdquo;. Real ones: total loss confirmed at the router for more than X minutes; the '
           'provider has given a fault reference and no estimate; the estimate exceeds your recovery target. Written down, so a junior member of staff can act at '
           '7am without ringing the owner.</li>'
           '<li><strong>Named roles, each with a named deputy.</strong> Incident lead, communications, technical, and payments. Deputies matter because outages do '
           'not wait for everyone to be in.</li>'
           '<li><strong>A contact tree</strong> with the provider&rsquo;s fault line, account number, circuit ID, care level, the exact wording to use, our '
           'out-of-hours number, the card acquirer&rsquo;s authorisation line, and the phone system provider.</li>'
           '<li><strong>An escalation ladder with clocks:</strong> 15 minutes confirm and log; 30 minutes fault raised and reference obtained; 1 hour fallback '
           'measures live; 2 hours decide on external support; 4 hours decide on relocating.</li>'
           '<li><strong>The manual fallbacks</strong>, written out and printed &mdash; how to take a payment, how to record a booking, where the paper is. A plan '
           'stored only in the cloud is a plan you cannot read during the outage.</li></ul>'},

  {'eyebrow': '/04 &mdash; REHEARSE IT',
   'h2': 'Then unplug it on purpose',
   'html': '<p>This is the step everyone skips and it is the one that makes the difference.</p>'
           '<p>Pick a quiet hour, pull the broadband out deliberately, and run the procedure. You will find things: the failover works but the card machine '
           'doesn&rsquo;t reconnect; the phone divert takes fifteen minutes nobody had allowed for; the person named in the plan left last year; the printed contact '
           'sheet is a PDF in a cloud drive you cannot now reach.</p>'
           '<p>Better to find all that on a Tuesday morning of your choosing than on the worst day of your year. <strong>A plan nobody has ever tested is a document, '
           'not a capability.</strong></p>'
           '<p>We do this with customers annually, and it takes about an hour.</p>'},

  {'eyebrow': '/05 &mdash; WHERE THE VAN FITS',
   'h2': 'Where our van fits into this',
   'html': '<p>Second line. Deliberately.</p>'
           '<p>Automatic failover handles the common case &mdash; a few hours, decent mobile coverage, business as usual. <a href="/emergency-internet/">The van</a> '
           'is what you call when failover is not enough:</p>'
           '<ul><li><strong>Poor mobile coverage</strong>, so there is nothing to fail over to.</li>'
           '<li><strong>A long outage</strong> &mdash; days rather than hours, which standard repair timescales permit more often than people realise.</li>'
           '<li><strong>A power cut as well</strong>, or an unusable building. The van is solar-powered and off-grid, so it brings its own electricity. A failover '
           'router in a dark building does nothing.</li>'
           '<li><strong>A need for real bandwidth</strong> &mdash; a full office, an event, or large files that must move today.</li></ul>'
           '<p>If your plan names us, we will already know your network, your firewall, whether your systems tolerate a different internet address, and where the van '
           'can legally park. That preparation is most of the value, and it is why this works far better agreed in advance than improvised.</p>'
           '<p><strong>One honest limit, stated plainly: we have one van.</strong> If it is committed elsewhere we will say so immediately rather than leave you '
           'hoping. Any plan that depends on us also has a fallback that does not.</p>'},
 ],
 'faqs': [
  {'q': 'What should a broadband emergency plan actually contain?',
   'a': 'An analysis of what breaks in your business without connectivity, how long you can tolerate each thing being down, objective written triggers for acting, '
        'named roles each with a deputy, a contact tree including your provider&rsquo;s fault line and your line&rsquo;s care level, an escalation ladder with '
        'timings, and printed manual fallbacks. Then a rehearsal, because an untested plan is a document rather than a capability.'},
  {'q': 'Is a 4G failover router better than calling someone out?',
   'a': 'For most businesses, yes, and we will say so even though it earns us less. A failover router switches over in seconds, unattended, at any hour, for a few '
        'hundred pounds plus a modest monthly data cost. A mobile response cannot match that recovery time. Failover is the wrong answer only where mobile coverage '
        'is poor, where you lose power too, where the outage runs into days, or where you need serious bandwidth.'},
  {'q': 'How much does business downtime really cost?',
   'a': 'Far less predictably than the internet suggests. The widely-quoted per-hour figures trace back through marketing articles to a study from 2014 and are '
        'survey estimates rather than measured losses. The number worth having is your own: staff cost per hour times the people who cannot work, plus transactions '
        'you cannot take, plus anything with a deadline attached. It takes about twenty minutes to work out and it is the figure that should drive your decision.'},
  {'q': 'Will the phone switch-off in 2027 affect my business?',
   'a': 'Almost certainly. The old analogue telephone network is being retired, with the current industry date of 31 January 2027, after which phone services run '
        'over broadband. From then, a broadband fault takes your telephones with it &mdash; so anything that depended on the phone line still working during an '
        'internet outage needs rethinking. It is the single best reason to write a plan this year rather than next.'},
 ],
 'crossLinksHtml': '<p><strong>Related:</strong> <a href="/emergency-internet/">the mobile response service</a> &middot; '
                   '<a href="/broadband-down/">what to do right now if you are offline</a> &middot; '
                   '<a href="/monthly-it-support/">monthly IT support</a> &middot; '
                   '<a href="/business-it-support-subscriptions/">business IT support in Dorset</a></p>'},

# ===========================================================================
# SPOKE 3 - events, live streaming, content production
# ===========================================================================
{'slug': 'event-wifi-dorset',
 'title': 'Event WiFi & Live Streaming Internet, Dorset | 365 Techies',
 'metaDesc': 'Internet for events, live streams and content production anywhere in Dorset &mdash; delivered from a solar-powered off-grid van that needs no mains '
             'power and no existing connection. Honest about what one satellite link can and cannot carry.',
 'ogTitle': 'Event WiFi &amp; Live Streaming Internet in Dorset | 365 Techies',
 'crumbName': 'Event WiFi & Live Streaming',
 'eyebrow': '// EVENTS &middot; STREAMING &middot; CONTENT',
 'h1': 'Internet for events, <em class="grad grad--cyan">anywhere you can park us</em>',
 'lede': 'A field in Wareham. A castle estate. A clifftop. A barn with no power. If the job needs a real internet connection somewhere there isn&rsquo;t one, we can '
         'bring one &mdash; carried by a solar-powered off-grid van that supplies its own electricity. And because we produce web and video content ourselves, we '
         'understand what you are actually trying to upload.',
 'chips': ['No mains power needed', '&pound;10m public liability', 'We understand the upload'],
 'primaryCta': ['Talk to us about your event', '/contact/'],
 'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
 'ctaHead': 'Got an event, a shoot or a stream coming up?',
 'ctaSub': 'Tell us the location, the dates, how many people and what has to work &mdash; ticket scanning, card payments, a live stream, uploading rushes. We will '
           'tell you honestly whether one satellite link carries it, and what we would do instead if it does not.',
 'serviceName': 'Event and production internet supply',
 'schemaKind': 'service',
 'sections': [

  {'eyebrow': '/01 &mdash; WHAT WE BRING',
   'h2': 'What actually turns up',
   'html': '<p>The 365 Crafter: a satellite terminal on a <strong>Starlink Business Priority</strong> service, WiFi to distribute it, and a Victron off-grid power '
           'system &mdash; solar charging and a lithium battery bank &mdash; that runs the whole lot without a generator, a hook-up or a socket.</p>'
           '<p><strong>That last part is the bit that matters at events.</strong> Most temporary connectivity suppliers arrive needing power from you. In a field, '
           'power is often the harder problem of the two.</p>'
           + INDEPENDENCE},

  {'eyebrow': '/02 &mdash; STREAMING, HONESTLY',
   'h2': 'Can you live stream over it? Mostly yes &mdash; here is the honest answer',
   'html': '<p><strong>Upload and stability matter far more than headline download speed for live work</strong>, and that is the number most suppliers quietly avoid '
           'talking about.</p>'
           '<p>A single 1080p stream is comfortably within reach. Multiple simultaneous streams, or 4K, need discussing before you book rather than discovering on '
           'the day. And a satellite link is a <em>single</em> link &mdash; if it drops, it drops, whereas some specialist event suppliers bond several mobile '
           'networks together precisely to avoid that.</p>'
           '<p><strong>So here is what we would say to anyone streaming something that cannot be repeated:</strong></p>'
           '<ul><li><strong>Always record locally as well.</strong> Always. Whatever your connection, whoever supplies it.</li>'
           '<li><strong>Leave real headroom</strong> &mdash; do not set a bitrate that needs everything your uplink can theoretically manage.</li>'
           '<li><strong>Use a protocol built for imperfect links</strong> if your workflow allows it; they recover from brief losses far better than a plain '
           'stream.</li>'
           '<li><strong>Test on site, in advance, at the same time of day</strong> where the event allows it.</li></ul>'
           '<p><strong>If the stream absolutely cannot fail</strong> &mdash; a paid broadcast, a one-off ceremony &mdash; then honestly, you want more than one link '
           'from more than one technology, and we will tell you that rather than take the booking and hope. We would rather be the supplier who said so.</p>'},

  {'eyebrow': '/03 &mdash; WHAT IT SUITS',
   'h2': 'What this genuinely suits',
   'html': '<ul><li><strong>Rural venues with poor connectivity</strong> &mdash; the Purbecks, Wareham, Lulworth, the Bere Regis and Wimborne countryside, farm and '
           'estate venues. This is the sweet spot: poor fixed lines, patchy mobile signal, and plenty of open sky.</li>'
           '<li><strong>Ticket scanning and card payments</strong> at outdoor events where there is nothing to plug into.</li>'
           '<li><strong>Weddings and celebrations</strong> at barns and country venues where guests, suppliers and a streamed ceremony all need connectivity.</li>'
           '<li><strong>Film and photography on location</strong> &mdash; unit bases, and getting large files moving before you leave site rather than three days '
           'later.</li>'
           '<li><strong>Content creators</strong> working somewhere beautiful and unconnected, which in Dorset is most of the good locations.</li>'
           '<li><strong>Marine and harbour-side work</strong> &mdash; a genuine local niche given Poole Harbour, and one nobody nearby seems to be serving.</li></ul>'
           '<p><strong>And where it does not suit:</strong> a dense town-centre event where the venue already has good connectivity and free public WiFi; anything '
           'needing guaranteed capacity for many hundreds of simultaneous users; or a site with no clear view of the sky. Established event-WiFi specialists who bond '
           'multiple mobile networks are genuinely better for large-scale, high-density work, and we will point you at them rather than oversell.</p>'},

  {'eyebrow': '/04 &mdash; THE CONTENT ANGLE',
   'h2': 'We also make the content',
   'html': '<p>This is the part that makes us slightly unusual as a connectivity supplier: <strong>we are not only bringing the pipe, we do this work ourselves.</strong></p>'
           '<p>We build and host websites, we produce video, and we run our own channel. So when you say you need to push rushes to an editor overnight, or stream to '
           'two platforms at once, or get a gallery live before the guests get home, we understand the actual workflow rather than just the megabits.</p>'
           '<p>For some jobs that means we do the whole thing: <a href="/web-design-hosting/">the site</a>, the content, and the connection that gets it published '
           'from a field. If that is useful, <a href="/contact/">say so when you get in touch</a>.</p>'},

  {'eyebrow': '/05 &mdash; WHAT WE NEED',
   'h2': 'What we need from the site',
   'html': REQUIREMENTS +
           '<p><strong>For events specifically, please also tell us:</strong> the dates and times including set-up and breakdown, roughly how many people need '
           'connectivity, and what absolutely must work &mdash; payments, ticket scanning, a live stream.</p>'
           '<p><strong>On insurance:</strong> we carry <strong>&pound;10 million public liability cover, underwritten by Hiscox</strong>, and we will send the certificate '
           'straight to your venue or organiser as part of the booking. Ten million is the upper tier most festivals and large venues specify, so this should clear '
           'your supplier requirements outright &mdash; just tell us who needs it and we will deal with it at enquiry stage rather than the week before.</p>'},

  {'eyebrow': '/06 &mdash; BOOKING & COST',
   'h2': 'Booking and cost',
   'html': '<p>Event work is priced as a day rate plus set-up, quoted for your specific job. We have not published a figure because we would rather quote your '
           'actual event than post a number that turns out to be wrong for it.</p>'
           '<p><strong>Two honest points about booking:</strong> we have <strong>one van</strong>, so event dates are genuinely first-come; and the Dorset summer '
           'clusters events into a few weeks, so the popular dates go early. If your date is fixed, talk to us sooner rather than later &mdash; and if we are already '
           'committed, we will tell you straight away so you can book someone else.</p>'
           '<p><a href="/contact/">Tell us about your event</a> and we will give you a straight answer, including &ldquo;this isn&rsquo;t the right fit&rdquo; if '
           'that is the truth.</p>'},
 ],
 'faqs': [
  {'q': 'Can you provide WiFi at an outdoor event with no power?',
   'a': 'Yes &mdash; that is specifically what the van is built for. It carries a Victron off-grid system with solar charging and a lithium battery bank, so it '
        'supplies its own electricity as well as the connection. All we need is somewhere to park within cable reach and a clear view of the sky. No generator, no '
        'hook-up and no existing connection required.'},
  {'q': 'Can you live stream over a satellite connection?',
   'a': 'A single 1080p stream is comfortably achievable. Multiple simultaneous streams or 4K need discussing in advance. The honest caveat is that a satellite link '
        'is one link, so always record locally as a backup, leave real headroom in your bitrate rather than using everything available, and test on site beforehand '
        'where you can. If a stream genuinely cannot fail, you want more than one connection from more than one technology, and we will say so.'},
  {'q': 'How many people can use one connection at an event?',
   'a': 'It depends far more on what they are doing than how many there are &mdash; a few dozen people checking phones is very different from a hundred people on '
        'video calls. Tell us the numbers and what actually has to work and we will give you a straight answer. For large, high-density events, specialists who bond '
        'several mobile networks together are genuinely better suited, and we will point you towards them rather than take a booking we cannot do well.'},
  {'q': 'Do you have public liability insurance for event work?',
   'a': 'Yes &mdash; we carry &pound;10 million public liability cover underwritten by Hiscox, and we will send the certificate directly to your venue or event '
        'organiser as part of the booking. Ten million is the highest figure venues and festivals normally ask suppliers for, so it should satisfy the requirement '
        'outright. Tell us who needs it when you enquire and we will deal with it up front, usually alongside a risk assessment.'},
  {'q': 'Do you cover events outside Bournemouth and Poole?',
   'a': 'Yes &mdash; across Dorset including Wareham, Wimborne, the Purbecks, Lulworth, Christchurch and Ferndown, with the New Forest and south-east Hampshire '
        'within reach. Rural venues are actually where this works best: poor fixed connectivity, patchy mobile coverage and plenty of open sky is exactly the '
        'combination the van is for.'},
  {'q': 'Can you get internet to a filming location with no signal?',
   'a': 'Usually, provided there is a clear view of the sky and somewhere to park within cable reach. It is a common use for us, and because we produce web and video '
        'content ourselves we understand the upload workflow rather than just supplying bandwidth &mdash; getting rushes moving before you leave site rather than '
        'days later is normally the real requirement.'},
 ],
 'crossLinksHtml': '<p><strong>Related:</strong> <a href="/emergency-internet/">the service in full</a> &middot; '
                   '<a href="/off-grid-internet/">off-grid and no-signal locations</a> &middot; '
                   '<a href="/web-design-hosting/">web design and content production</a> &middot; '
                   '<a href="/rural-and-farm-wifi-dorset/">rural WiFi</a></p>'},

# ===========================================================================
# SPOKE 4 - off-grid / weather / the van itself (authority bridge)
# ===========================================================================
{'slug': 'off-grid-internet',
 'title': 'Off-Grid Internet UK: No Power, No Signal, No Problem | 365 Techies',
 'metaDesc': 'Internet where there is no mains power and no mobile signal, delivered from a genuinely off-grid solar and lithium powered van &mdash; and an honest '
             'look at how satellite equipment copes with UK heatwaves, snow, ice and wind.',
 'ogTitle': 'Off-Grid Internet &mdash; No Power, No Signal, No Problem | 365 Techies',
 'crumbName': 'Off-Grid Internet',
 'eyebrow': '// OFF-GRID &middot; ALL WEATHER',
 'h1': 'Internet where there is <em class="grad grad--cyan">nothing to plug into</em>',
 'lede': 'Plenty of firms will bring you a connection if you provide the power. We bring both. The 365 Crafter runs on solar and lithium with a Victron system we '
         'designed, monitor and support ourselves &mdash; which is also why we are listed in Victron&rsquo;s Recommended Software Integrator Program. This page is '
         'about the awkward locations, and about how the kit copes with British weather.',
 'chips': ['Genuinely off-grid', 'Victron Recommended Integrator', 'Wireless links since 2015'],
 'primaryCta': ['Tell us about the location', '/contact/'],
 'secondaryCta': ['See our Victron work', '/custom-vrm-dashboards/'],
 'ctaHead': 'Somewhere with no power and no signal?',
 'ctaSub': 'Those are the jobs we find most interesting. Tell us where it is, what has to work and for how long, and we will tell you honestly whether we can do it '
           '&mdash; and what would need to be true for it to work.',
 'serviceName': 'Off-grid and remote-location internet supply',
 'schemaKind': 'service',
 'sections': [

  {'eyebrow': '/01 &mdash; GENUINELY OFF-GRID',
   'h2': 'What &ldquo;off-grid&rdquo; actually means here',
   'html': '<p>It is a phrase people use loosely, so here is exactly what is in the van: a <strong>Victron Cerbo GX running Venus OS</strong>, MPPT solar charging, a '
           '<strong>lithium battery bank</strong>, a SmartShunt 500A and an Orion XS DC-DC charger. We run our own business from it.</p>'
           '<p>We did not buy that as a prop. We designed, built and monitor it &mdash; and we build live monitoring dashboards on Victron systems for customers '
           'worldwide, which is why we are listed in <strong>Victron Energy&rsquo;s Recommended Software Integrator Program</strong>. You can '
           '<a href="/custom-vrm-dashboards/">watch the van&rsquo;s own solar, battery and power draw live</a> on our site right now.</p>'
           '<p><strong>Why that matters to you:</strong> it means the power side is engineered and instrumented rather than hoped for. We can see the state of charge '
           'and what everything is drawing before we commit to a job, so when we say we can run for a given period at a given location, it is based on data from a '
           'system we monitor rather than optimism.</p>'
           '<p>We also have form with connectivity in awkward places well before satellite made it easy: we have run a <strong>point-to-point wireless link across '
           'the River Avon for the Environment Agency since 2015</strong>, and we still support it. Eleven years of a link that has to keep working, outdoors, in '
           'Dorset.</p>'
           + INDEPENDENCE},

  {'eyebrow': '/02 &mdash; EXTREME WEATHER',
   'h2': 'Heatwave, snow and ice: how the kit actually copes',
   'html': '<p>We have run this through British weather ourselves, and we also want to be precise about which claims are <em>ours</em> and which are the '
           '<em>manufacturer&rsquo;s published ratings</em>. Both matter, and they are not the same thing.</p>'
           '<p><strong>Starlink&rsquo;s own published specification sheets</strong> give the current dishes an operating temperature range of '
           '<strong>&minus;30&nbsp;&deg;C to +50&nbsp;&deg;C</strong> (the Performance model is rated wider still, &minus;40&nbsp;&deg;C to +60&nbsp;&deg;C), an '
           '<strong>IP67</strong> ingress rating, operation in sustained winds around <strong>96&nbsp;km/h</strong>, and an integrated <strong>snow-melt '
           'system</strong> rated to clear up to around 40&nbsp;mm of snowfall per hour.</p>'
           '<p><strong>Put that against British weather and it is not close.</strong> The UK&rsquo;s highest recorded temperature is just over 40&nbsp;&deg;C and '
           'our lowest is around &minus;27&nbsp;&deg;C &mdash; both comfortably inside that range. For comparison, the consumer mesh WiFi in most homes is typically '
           'rated <strong>0&nbsp;&deg;C to 40&nbsp;&deg;C</strong>. The outdoor satellite equipment is in a completely different class to the box on your '
           'shelf.</p>'
           '<p><strong>What we can tell you from our own use:</strong> we run this year-round from the van, through UK summer heat and through winter cold, and it '
           'keeps working. That is our experience rather than a laboratory test, and we will not dress it up as more than it is.</p>'
           '<p><strong>What actually causes problems &mdash; and it is not the weather.</strong> By a wide margin the thing that breaks a satellite link is '
           '<strong>obstruction</strong>: trees in leaf, a building, an overhanging structure. Very heavy rain or wet snow can cause brief interruptions, which is '
           'physics and applies to every satellite system ever made. But a clear view of the sky matters more than the forecast, every time. That is why '
           '&ldquo;where can we park&rdquo; is the first question we ask.</p>'
           '<p>One practical detail we like: the indoor router is only rated for indoor use, which is fine, because in our case &ldquo;indoors&rdquo; is the '
           'van.</p>'},

  {'eyebrow': '/03 &mdash; WHERE IT WORKS',
   'h2': 'The locations this is for',
   'html': '<ul><li><strong>Rural businesses and farms</strong> with no usable fixed line and no mobile signal worth having.</li>'
           '<li><strong>Sites with no power at all</strong> &mdash; land, barns, compounds, early-stage builds.</li>'
           '<li><strong>Temporary and seasonal operations</strong> that need connectivity for weeks rather than years.</li>'
           '<li><strong>Filming and photography on location</strong>, where the real requirement is usually getting large files moving before you leave.</li>'
           '<li><strong>Marine and harbour-side work</strong> &mdash; a genuine gap locally given Poole Harbour.</li>'
           '<li><strong>Anywhere a survey, an inspection or a monitoring installation</strong> needs to send data back from somewhere inconvenient. That is exactly '
           'what the Environment Agency link does, and has done since 2015.</li></ul>'
           '<p><strong>Where it will not work:</strong> anywhere without a clear view of the sky, anywhere we cannot legally park within cable reach, and any '
           'situation where you need a permanent installation &mdash; at which point you should own the equipment rather than rent our van, and we are happy to '
           'install and configure it for you.</p>'},

  {'eyebrow': '/04 &mdash; PERMANENT INSTALLATIONS',
   'h2': 'If you need this permanently, buy it &mdash; and we will fit it',
   'html': '<p>We are an IT support firm, not a connectivity reseller, so we have no reason to keep you renting.</p>'
           '<p>If a location needs a permanent connection, the sensible answer is to buy the equipment and subscription in your own name and have us install and '
           'configure it &mdash; siting the dish for a genuinely clear view, running the cable properly with surge protection where it enters a building, sorting the '
           'power (including solar and battery if there is no mains), and joining it to your network safely.</p>'
           '<p>That way you own it, the subscription is yours, and there is no van in the equation at all. <a href="/contact/">Ask us</a> and we will tell you which '
           'of the two makes sense for your situation.</p>'},
 ],
 'faqs': [
  {'q': 'Can you get internet somewhere with no mains power?',
   'a': 'Yes. The 365 Crafter carries a Victron off-grid system &mdash; a Cerbo GX on Venus OS, MPPT solar charging and a lithium battery bank &mdash; so it supplies '
        'its own electricity as well as the connection. No generator, hook-up or socket needed. We monitor that power system live, so when we say we can run for a '
        'given period at a location, it is based on real data rather than a guess.'},
  {'q': 'Does satellite internet work in snow, ice and heatwaves in the UK?',
   'a': 'The published specifications rate the current dishes from &minus;30&nbsp;&deg;C to +50&nbsp;&deg;C, IP67, sustained winds around 96&nbsp;km/h, with an '
        'integrated snow-melt system clearing roughly 40&nbsp;mm of snowfall per hour. The UK&rsquo;s record temperatures sit comfortably inside that range. In '
        'practice, obstruction from trees and buildings causes far more trouble than weather ever does &mdash; a clear view of the sky matters more than the '
        'forecast.'},
  {'q': 'What causes a satellite connection to drop?',
   'a': 'Obstruction, overwhelmingly &mdash; trees in leaf, buildings, or anything overhanging the dish&rsquo;s view of the sky. Very heavy rain or wet snow can '
        'cause brief interruptions, which is a property of satellite communication generally rather than a fault. If a site&rsquo;s view is partly blocked, it can '
        'take up to 24 hours of mapping to say honestly how well a link will hold up there.'},
  {'q': 'Is 365 Techies qualified to do off-grid power as well as internet?',
   'a': 'We run our own business from an off-grid Victron system and we build live monitoring dashboards on Victron installations for customers worldwide, which is '
        'why we are listed in Victron Energy&rsquo;s Recommended Software Integrator Program. We are not electricians and we do not carry out mains electrical work '
        '&mdash; but on low-voltage solar, battery and monitoring systems, this is genuinely what we do.'},
 ],
 'crossLinksHtml': '<p><strong>Related:</strong> <a href="/emergency-internet/">emergency internet for business</a> &middot; '
                   '<a href="/event-wifi-dorset/">events, streaming and content production</a> &middot; '
                   '<a href="/custom-vrm-dashboards/">our Victron dashboard work</a> &middot; '
                   '<a href="/rural-and-farm-wifi-dorset/">rural WiFi</a> &middot; '
                   '<a href="/about/">about 365 Techies</a></p>'},
]
