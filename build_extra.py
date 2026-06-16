# -*- coding: utf-8 -*-
"""Phase 3 pages for 365 Techies: specialist service pages + trust pages.
Imports shared chrome/helpers from build_pages and build_local, appends pages, writes everything.
Run: python build_extra.py
"""
import build_pages as bp
import build_local  # registers the 12 local/customer pages on import
from build_pages import (add, graph, crumb, webpage, service, faqpage,
                         faq_html, cta, hero, bc, tiles, grid_cards, checklist,
                         steps, reviews_block, ico, SITE, write_all)
from build_local import make_customer

# ===================================================== SPECIALIST SERVICE PAGES
SPECIALIST = [
 dict(slug="windows-11-support", crumb_name="Windows 11 Support",
   eyebrow="// WINDOWS 11", h1='Windows 11 <em class="grad grad--cyan">support</em>',
   lede="Help with Windows 11 upgrades, compatibility checks, updates, slow performance and new PC setup — for home users and businesses across Bournemouth, Poole and Dorset.",
   intro_head="Windows 11, without the headaches",
   intro_paras="<p>Thinking about upgrading, or already on Windows 11 and something&rsquo;s not right? We handle the upgrade properly — checking compatibility, backing up your files and making sure everything still works afterwards.</p><p><strong>No lost files, no nasty surprises</strong> — just a clean, fast, secure Windows 11 setup and someone to call when it misbehaves.</p>",
   feats=["Windows 11 upgrades","Compatibility checks","Slow Windows fixes","Driver problems","Windows updates","New PC setup","File transfer","Microsoft account setup","Security settings"],
   tile_items=[("windows","Upgrades","Smooth, safe upgrades from Windows 10 with your files intact."),("monitor","Performance","Speed up a sluggish Windows 11 PC."),("wrench","Driver fixes","Sort out printers, audio, displays and device drivers."),("shield","Security","Sensible Windows security settings, configured for you."),("server","Updates","Keep Windows updated without the disruption."),("bolt","New PC setup","Set up a new Windows 11 machine the right way.")],
   faqs=[("Should I upgrade to Windows 11?","If your PC is compatible, Windows 11 is a sensible, supported upgrade. We will check compatibility and advise honestly whether it is worth it for your machine."),("Will I lose my files upgrading to Windows 11?","No — we back up your data first and make sure everything transfers safely before and after the upgrade."),("My Windows 11 PC is slow — can you help?","Yes, we tune up slow Windows 11 PCs remotely, clearing out the causes and getting performance back.")],
   chips=["Upgrades &amp; setup","Compatibility checks","No lost files"],
   split_title="The right help, home or work",
   split=[("Windows 11 at home","Whether it&rsquo;s one laptop or the whole family&rsquo;s devices, we check compatibility, back up your files and upgrade to Windows 11 cleanly &mdash; then keep it fast and secure.",["Compatibility check &amp; honest advice","Files backed up before we start","Clean, fast Windows 11 setup","Ongoing updates &amp; support"]),("Windows 11 for business","We plan and roll out Windows 11 across your team with no downtime &mdash; compatibility checked, data safe, security configured and everyone supported.",["Fleet-wide compatibility checks","Planned, no-downtime rollout","Security &amp; policies configured","Every user supported"])],
   steps_title="Upgraded the right way",
   step_items=[("We check","We confirm your PC is Windows 11-ready and advise honestly whether it&rsquo;s worth it."),("We upgrade","We back up your files and upgrade cleanly &mdash; no lost data, no nasty surprises."),("We support","We keep Windows 11 updated, fast and secure on your support plan.")]),
 dict(slug="email-support", crumb_name="Email Support",
   eyebrow="// EMAIL", h1='Email <em class="grad grad--cyan">support</em>',
   lede="Outlook, Microsoft 365 and business email help — fix email that won't send or receive, sort passwords, set up new accounts and stop the spam, for homes and businesses.",
   intro_head="Email that just works",
   intro_paras="<p>Email problems are one of the most common — and most stressful — tech headaches. When messages won&rsquo;t send, won&rsquo;t arrive, or your password stops working, it can bring everything to a halt.</p><p><strong>We fix it fast</strong>, set things up properly across your computer and phone, and help you spot the dodgy messages before they cause trouble.</p>",
   feats=["Outlook problems","Email not sending","Email not receiving","Password problems","Microsoft 365 email","Business email setup","Email migration","Spam &amp; junk filtering","Phishing email advice","Phone email setup"],
   tile_items=[("mail","Outlook fixes","Sort send and receive errors, crashes and sync problems."),("cloud","Microsoft 365 email","Exchange Online and business mailboxes managed."),("lock","Passwords &amp; access","Recover and secure email accounts the right way."),("shield","Spam &amp; phishing","Filter junk and spot scams before you click."),("server","Migration","Move email to Microsoft 365 with nothing lost."),("monitor","All your devices","Email set up on computer, phone and tablet.")],
   faqs=[("Why is my email not sending or receiving?","There are several common causes — settings, passwords, full mailboxes or server issues. We diagnose it remotely and get your email flowing again."),("Can you move my old email to Microsoft 365?","Yes — we migrate email, contacts and calendars to Microsoft 365 with minimal disruption."),("Can you check if an email is safe?","Yes — subscribers can always ask us to check a suspicious message before clicking anything.")],
   chips=["Outlook &amp; Microsoft 365","Send/receive fixes","Anti-spam"],
   split_title="Email sorted, however you work",
   split=[("Email at home","Personal and family email sorted across every device &mdash; Outlook, webmail and phone &mdash; with the spam filtered out and the scams spotted.",["Outlook &amp; webmail set up","Email on phone &amp; tablet","Spam &amp; junk filtered","Scam-checking on call"]),("Business email","Professional business email on Microsoft 365 &mdash; shared mailboxes, signatures, security and migration, all managed for your team.",["Microsoft 365 business email","Shared mailboxes &amp; aliases","Email security &amp; filtering","Migration with nothing lost"])],
   steps_title="Email flowing again, fast",
   step_items=[("We diagnose","We find out exactly why your email isn&rsquo;t behaving &mdash; settings, passwords or server."),("We fix &amp; set up","We get email flowing and configure it properly on every device."),("We protect","We filter spam, block phishing and stay on call to check anything suspicious.")]),
 dict(slug="new-computer-setup", crumb_name="New Computer Setup",
   eyebrow="// NEW DEVICE SETUP", h1='New computer <em class="grad grad--cyan">setup</em>',
   lede="We set up your new computer or laptop properly — transferring files, email and settings, installing software, and getting security and backups in place from day one.",
   intro_head="Out of the box and ready to go",
   intro_paras="<p>A new computer should be a fresh start, not a weekend of frustration. We take the new machine, transfer everything from the old one, remove the bloatware and set it up exactly how you like it.</p><p><strong>Files, email, printers, Wi-Fi, software, security and backups</strong> — all sorted, so you can just sit down and use it.</p>",
   feats=["New PC &amp; laptop setup","Data &amp; file transfer","Email &amp; Microsoft 365","Software installation","Printer &amp; Wi-Fi setup","Security &amp; backups","Old computer wipe","Buying advice"],
   tile_items=[("monitor","Setup &amp; transfer","Move files, photos, email and settings from your old PC."),("mail","Email &amp; apps","Email, Microsoft 365 and your software, installed and ready."),("wifi","Printers &amp; Wi-Fi","Everything reconnected and working."),("shield","Security &amp; backups","Protection and backups in place from day one."),("lock","Safe disposal","Securely wipe your old computer before you sell or recycle it."),("briefcase","Buying advice","Not bought yet? We'll help you choose the right machine.")],
   faqs=[("Can you transfer everything from my old computer?","Yes — files, photos, email, bookmarks and most settings move across so it feels like home."),("Can you help me choose a new computer?","Absolutely — tell us what you do and your budget, and we'll recommend the right machine."),("Can you wipe my old computer?","Yes, we securely erase your old device so your data can't be recovered before you sell or recycle it.")],
   chips=["Files transferred","Ready to use","Buying advice"],
   split_title="Set up right, home or work",
   split=[("New computer at home","We turn a boxed-up new PC into a ready-to-go machine &mdash; files, photos, email and printers all moved across and working, with the bloatware gone.",["Files, photos &amp; email moved","Printers &amp; Wi-Fi reconnected","Bloatware removed","Security &amp; backups in place"]),("New computers for business","New starter or whole-team rollout &mdash; standardised, secured and onboarded, with data moved and accounts set up, ready for day one.",["Standardised business setup","Microsoft 365 &amp; accounts ready","Data migrated securely","Onboarded &amp; supported"])],
   steps_title="From box to ready-to-use",
   step_items=[("We transfer","We move your files, photos, email and settings from the old machine."),("We set up","We install your software, reconnect printers and Wi-Fi, and remove the bloat."),("We secure","We add protection and backups, and securely wipe your old device if you like.")]),
 dict(slug="printer-support", crumb_name="Printer Support",
   eyebrow="// PRINTERS", h1='Printer <em class="grad grad--cyan">support</em>',
   lede="Get your printer working — Wi-Fi printing, offline errors, driver installs, scanning and network printing for homes and businesses across Dorset.",
   intro_head="Make peace with your printer",
   intro_paras="<p>Printers have a special talent for failing right when you need them. &lsquo;Offline&rsquo; errors, dropped Wi-Fi connections and missing drivers are everyday frustrations we fix all the time.</p><p><strong>We get your printer and scanner working reliably</strong> across every device in the home or office — and keep them that way.</p>",
   feats=["Printer setup","Wi-Fi printing","Printer offline fixes","Driver installation","Scanning setup","Ink &amp; toner advice","Network printing","Multi-device printing"],
   tile_items=[("wifi","Wi-Fi printing","Print from any device, anywhere in the building."),("wrench","Offline fixes","Banish the dreaded printer offline error."),("monitor","Drivers","Correct drivers installed and kept up to date."),("mail","Scanning","Scan-to-email and scan-to-folder set up."),("server","Network printing","Shared printers for the whole office."),("bolt","Quick help","Fast remote fixes when it won't play ball.")],
   faqs=[("Why does my printer keep going offline?","Usually Wi-Fi, driver or settings issues — we diagnose and fix it remotely so it stays online."),("Can you set up wireless printing?","Yes — we connect your printer to Wi-Fi and set up printing and scanning on all your devices."),("Do you support office network printers?","Yes, we set up and troubleshoot shared and networked printers for businesses.")],
   chips=["Wi-Fi printing","Offline fixes","Scanning setup"],
   split_title="Printing that just works",
   split=[("Printers at home","Get every device in the house printing and scanning reliably &mdash; no more &lsquo;offline&rsquo; errors or dropped Wi-Fi connections.",["Wi-Fi printing on all devices","Offline errors fixed","Scanning set up","Ink &amp; toner advice"]),("Office printers","Shared and networked office printers set up, secured and kept working &mdash; scan-to-email, scan-to-folder and reliable printing for the whole team.",["Networked &amp; shared printers","Scan-to-email &amp; folder","Reliable office printing","Fast remote fixes"])],
   steps_title="Back to printing in no time",
   step_items=[("We diagnose","We find why your printer&rsquo;s playing up &mdash; Wi-Fi, drivers or settings."),("We fix &amp; connect","We get it printing and scanning on every device, reliably."),("We keep it going","We&rsquo;re one message away if it ever drops offline again.")]),
 dict(slug="wifi-support", crumb_name="Wi-Fi Support",
   eyebrow="// WI-FI &amp; NETWORK", h1='Wi-Fi &amp; network <em class="grad grad--cyan">support</em>',
   lede="Fast, reliable Wi-Fi in every room — fix dead zones, slow speeds and dropouts, set up routers and mesh systems, and connect all your devices securely.",
   intro_head="Wi-Fi that reaches every room",
   intro_paras="<p>Buffering in the back bedroom, drop-outs on video calls, a router that needs constant restarting — patchy Wi-Fi is one of the most common complaints we hear.</p><p><strong>We design and set up reliable home and office networks</strong> — routers, mesh systems and extenders — so every device gets a strong, secure connection.</p>",
   feats=["Wi-Fi setup","Dead zone fixes","Router setup","Mesh &amp; extenders","Speed troubleshooting","Guest networks","Smart-home connectivity","Network security"],
   tile_items=[("wifi","Whole-home Wi-Fi","Strong signal in every room with mesh and extenders."),("bolt","Speed fixes","Track down and fix slow, dropping connections."),("server","Router setup","New routers configured properly and securely."),("shield","Secure networks","Locked-down Wi-Fi and guest networks."),("home","Smart home","Connect cameras, speakers and smart devices."),("briefcase","Office networks","Reliable business networks and Wi-Fi.")],
   faqs=[("Can you fix Wi-Fi dead zones?","Yes — we use mesh systems and extenders to bring strong, reliable Wi-Fi to every corner of your home or office."),("My internet is slow — is it my Wi-Fi?","Often, yes. We diagnose whether it's your Wi-Fi, router or broadband and fix what we can."),("Can you set up a guest network?","Yes, we set up secure guest Wi-Fi so visitors don't need your main password.")],
   chips=["Whole-home coverage","Speed fixes","Secure networks"],
   split_title="Reliable Wi-Fi, everywhere",
   split=[("Wi-Fi at home","Strong, reliable Wi-Fi in every room &mdash; dead zones banished with mesh, the kids&rsquo; devices and smart home connected, all on a secure network.",["Whole-home mesh Wi-Fi","Dead zones fixed","Smart home connected","Secure &amp; guest networks"]),("Office networks","Fast, secure office networks that keep your team online &mdash; reliable Wi-Fi, wired connections and guest access, designed and supported.",["Reliable office Wi-Fi","Wired &amp; wireless networks","Secure staff &amp; guest access","Designed &amp; supported"])],
   steps_title="Full coverage in three steps",
   step_items=[("We survey","We find your dead zones, bottlenecks and weak spots."),("We set up","We install and configure routers, mesh and extenders for full coverage."),("We secure","We lock down your network and keep it running fast.")]),
]
for i, c in enumerate(SPECIALIST):
    make_customer(40 + i, **c)

# ===================================================== WHY CHOOSE US
def why_choose():
    slug = "why-choose-365-techies"
    crumb_name = "Why Choose 365 Techies"
    desc = "Why choose 365 Techies for IT support — monthly support options, friendly help, remote support, local Bournemouth knowledge, Microsoft 365 experience and security-focused advice."
    content = "\n".join([
      hero(bc(crumb_name), "// WHY 365 TECHIES",
           'Why choose <em class="grad grad--cyan">365 Techies</em>',
           "Reliable, friendly IT support for homes and businesses across Dorset — with monthly cover, real human help and a security-first approach. Here is what makes us different.",
           cta1=("View Monthly Plans", "/monthly-it-support/"), cta2=("Read Reviews", "/reviews/"),
           chips=["Rated 4.9 on Google", "Bournemouth-based", "Homes &amp; businesses"]),
      f'''    <section class="section" aria-label="Reasons to choose us">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/01 — THE DIFFERENCE</p>
          <h2 class="section-title section-title--center" data-title>Reasons people stay for years<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("Monthly support options","Predictable monthly cover for homes and businesses — not just emergency call-outs."),("Friendly, human help","A real, patient techie who explains things in plain English — never condescending."),("Fast remote support","Most issues solved remotely in minutes via secure Splashtop SOS."),("Local knowledge","Bournemouth-based, supporting Dorset homes and businesses for years."),("Home and business","One team that genuinely understands both home users and small businesses."),("Microsoft 365 experience","Deep, day-to-day experience with Outlook, Teams, OneDrive and business email."),("Security-focused","Practical protection and sensible advice built into everything we do."),("Clear communication","No jargon, no surprises — just honest, practical guidance you can act on.")])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="stats section--alt" aria-label="By the numbers">
      <div class="stats__grid">
        <div class="stat" data-reveal><p class="stat__value"><span class="stat-num" data-count="4.9" data-decimals="1">0</span></p><p class="stat__label mono">GOOGLE RATING</p></div>
        <div class="stat" data-reveal><p class="stat__value"><span class="stat-num" data-count="51">0</span><span class="stat__suffix">+</span></p><p class="stat__label mono">GOOGLE REVIEWS</p></div>
        <div class="stat" data-reveal><p class="stat__value"><span class="stat-num" data-count="28">0</span><span class="stat__suffix">+</span></p><p class="stat__label mono">DORSET AREAS</p></div>
        <div class="stat" data-reveal><p class="stat__value"><span class="stat-num" data-count="6">0</span><span class="stat__suffix">wk</span></p><p class="stat__label mono">SERVICE CYCLE</p></div>
      </div>
    </section>''',
      reviews_block([("The service I get with 365 techies is amazing — always on the other end of the phone. The monthly subscription and plans are worth the money.", "Vince Jones"),("A friendly team, there to help when needed. Nice to know our laptops are kept up to date and virus free. Worth the monthly fee.", "Alan Bevis"),("Excellent service. We have been working with David and Steve for several years now and their attention is still brilliant. Highly recommended.", "Peter Moody")]),
      cta("See why people choose us", "Join the Dorset homes and businesses who never worry about IT. Pick a plan or talk to a friendly techie first.",
          primary=("View Monthly Plans", "/monthly-it-support/"), secondary=("Contact Us", "/contact/")),
    ])
    def schema(s, _desc=desc, _cn=crumb_name):
        return graph([crumb(s, _cn), webpage(s, _cn, _desc)])
    add(slug=slug, title="Why Choose 365 Techies? | Bournemouth IT Support",
        desc=desc, og_title="Why Choose 365 Techies?", schema=schema, content=content)
why_choose()

# ===================================================== REVIEWS
REVIEWS = [
 ("John Holloway", "Your service and support are unbeatable and delivered with patience and a smile."),
 ("Alan Bevis", "A friendly team, there to help when needed. Nice to know that our laptops are being regularly checked for updates and kept virus free. Worth the monthly fee."),
 ("Vince Jones", "The service I get with 365 techies is amazing — always on the other end of the phone. The monthly subscription and plans are worth the money."),
 ("David Hagner", "I have benefited from the help of the guys at 365 for most of twenty years. They have helped me on so many occasions I can not remember. A fully inclusive service."),
 ("Peter Moody", "Excellent service. We have been working with David and Steve for several years now and their attention is still brilliant. Highly recommended."),
 ("Rob Hazell", "Can't fault the skill and attention the 365 guys give. Confidence that things keep ticking over with their regular maintenance checks."),
 ("Free Spirit", "I'm always so grateful for 365's brilliant service and how you are always able to come to the rescue immediately I have a problem. I have been with you about fifteen years."),
 ("Julie Collins", "Always great service from these guys. I know I can contact them anytime I have a technical problem. I would absolutely recommend them."),
 ("Frederick Woods", "Sorting out a printing problem same day as reported. All is working fine even the day after — really professional service."),
 ("Mary Memmott", "I have been with 365 Techies for many years and have found them always helpful and professional. Long may they continue."),
 ("Anne Lewis", "Always delighted with the support given by David, Steve and Becky. I couldn't ask for any more."),
 ("Edward Clough", "Always a prompt and first class service, unable to fault."),
 ("Cordelia Cutler", "Thanks for coming to my rescue once again. You still keep my computer system in perfect order. Many, many thanks."),
 ("John Ridd", "Efficient and helpful people."),
]
def reviews_page():
    slug = "reviews"
    crumb_name = "Reviews"
    desc = "365 Techies is rated 4.9 out of 5 from 51 Google reviews. Read what home and business customers across Bournemouth, Poole and Dorset say about our IT support."
    figs = "\n".join(f'''        <figure class="review" data-reveal>
          <p class="review__stars mono" aria-label="Rated 5 out of 5">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
          <blockquote>&ldquo;{t}&rdquo;</blockquote>
          <figcaption><strong>{n}</strong><span class="mono">GOOGLE REVIEW</span></figcaption>
        </figure>''' for n, t in REVIEWS)
    content = "\n".join([
      hero(bc(crumb_name), "// GOOGLE REVIEWS",
           'Rated <em class="grad grad--green">4.9</em> on Google',
           "Don't just take our word for it. Here's what home and business customers across Bournemouth, Poole and Dorset say about 365 Techies.",
           cta1=("Review us on Google", "https://search.google.com/local/writereview?placeid=ChIJlTb8YRuic0gRCRczduB8OFI"),
           cta2=("View Monthly Plans", "/monthly-it-support/"),
           chips=["4.9 / 5 average", "51+ Google reviews", "Real verified customers"]),
      f'''    <section class="reviews" aria-label="Customer reviews">
      <p class="reviews__badge mono" data-reveal style="display:block;width:max-content;margin:0 auto 3rem"><span aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span>&ensp;4.9 FROM 51 GOOGLE REVIEWS</p>
      <div class="reviews__grid">
{figs}
      </div>
      <div class="reviews__links" data-reveal>
        <a class="text-link" href="https://search.google.com/local/reviews?placeid=ChIJlTb8YRuic0gRCRczduB8OFI" target="_blank" rel="noopener">Read all reviews on Google <span aria-hidden="true">&#8594;</span></a>
        <a class="text-link" href="https://search.google.com/local/writereview?placeid=ChIJlTb8YRuic0gRCRczduB8OFI" target="_blank" rel="noopener">Review us on Google <span aria-hidden="true">&#8594;</span></a>
      </div>
    </section>''',
      cta("Join our happy customers", "Reliable monthly IT support for homes and businesses across Dorset. See why people stay for years.",
          primary=("View Monthly Plans", "/monthly-it-support/"), secondary=("Contact Us", "/contact/")),
    ])
    review_nodes = [{"@type": "Review", "author": {"@type": "Person", "name": n},
                     "reviewRating": {"@type": "Rating", "ratingValue": "5", "bestRating": "5"},
                     "reviewBody": t, "publisher": {"@type": "Organization", "name": "Google"}} for n, t in REVIEWS]
    def schema(s, _desc=desc, _cn=crumb_name, _rev=review_nodes):
        return graph([crumb(s, _cn), webpage(s, "Customer Reviews", _desc),
                      {"@type": "LocalBusiness", "@id": SITE + "/#business", "name": "365 Techies",
                       "image": SITE + "/og-image.jpg", "url": SITE + "/",
                       "aggregateRating": {"@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "51", "bestRating": "5", "worstRating": "1"},
                       "review": _rev}])
    add(slug=slug, title="Customer Reviews | 365 Techies — Rated 4.9 on Google",
        desc=desc, og_title="Customer Reviews | 365 Techies", schema=schema, content=content)
reviews_page()

# ===================================================== FAQs
def faqs_page():
    slug = "faqs"
    crumb_name = "IT Support FAQs"
    desc = "Frequently asked questions about 365 Techies monthly IT support — how remote support works, what's included, home and business support, cancelling, on-site visits, Microsoft 365 and security."
    FAQS = [
      ("How does remote support work?", "When you need help, we send you a secure link. One click connects us to your screen over Splashtop SOS so we can see what you see and fix it there and then. You watch the whole session, and access ends automatically when we're done."),
      ("What is included in monthly IT support?", "Unlimited remote support, a full computer service every six weeks, antivirus and web protection, Windows and software updates, Microsoft 365 help, security and backup checks, and priority response — all for one predictable monthly cost."),
      ("Do you support home users?", "Yes — home users, families, retired users, students and home workers. We pride ourselves on patient, jargon-free help with everyday technology."),
      ("Do you support small businesses?", "Yes — sole traders, home offices and small businesses across Dorset, with Microsoft 365 management, cybersecurity, backups, staff support and more."),
      ("Can I cancel my plan?", "Yes. All plans are monthly and cancel-anytime, with no lock-in contract."),
      ("Do you visit on-site?", "Most issues are solved remotely in minutes. When hands-on help is needed, we provide on-site visits across Bournemouth, Poole and the rest of Dorset."),
      ("Can you help with Microsoft 365?", "Absolutely — setup, migration, licensing, security and day-to-day support of Outlook, Teams, OneDrive, SharePoint and Exchange Online."),
      ("Can you help with cybersecurity?", "Yes — protection from scams, malware, ransomware and phishing, plus antivirus, multi-factor authentication, password security and backup checks."),
      ("Can you help with printers?", "Yes — printer setup, Wi-Fi printing, offline errors, drivers and scanning, for homes and offices."),
      ("Can you help with slow computers?", "Yes — slow computers are one of the most common things we fix, usually remotely. A monthly plan keeps them fast with regular maintenance."),
      ("How much does it cost?", "Home plans start at £15.95/month and business plans from £21.15/month. One-off repairs are also available with no subscription."),
      ("How quickly can you help?", "Most remote sessions start within minutes during opening hours, Monday to Friday, 9am to 5pm. Subscribers always jump the queue."),
    ]
    content = "\n".join([
      hero(bc(crumb_name), "// GOOD QUESTIONS",
           'IT support <em class="grad grad--cyan">FAQs</em>',
           "Everything you might want to know about monthly IT support, remote help, what's included and how we work. Still not sure? Just ask.",
           cta1=("Contact Us", "/contact/"), cta2=("View Monthly Plans", "/monthly-it-support/"),
           chips=["Remote &amp; on-site", "No lock-in", "Homes &amp; businesses"]),
      faq_html(FAQS),
      cta("Still have a question?", "We're happy to help — no pressure and no jargon. Call, email or send us a message.",
          primary=("Contact Us", "/contact/"), secondary=("Call 01202 775566", "tel:+441202775566")),
    ])
    def schema(s, _desc=desc, _cn=crumb_name, _faqs=FAQS):
        return graph([crumb(s, _cn), webpage(s, "IT Support FAQs", _desc), faqpage(s, _faqs)])
    add(slug=slug, title="IT Support FAQs | 365 Techies", desc=desc,
        og_title="IT Support FAQs | 365 Techies", schema=schema, content=content)
faqs_page()

# ===================================================== BOOK A SERVICE (SimplyBook)
BOOKING_EMBED = '''    <section class="section section--alt" aria-label="Online booking">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// BOOK ONLINE</p>
          <h2 class="section-title section-title--center" data-title>Pick a time that suits you<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Book a computer service, repair or setup in under a minute. Already a customer? Sign in to reschedule or cancel.</p>
        </div>
        <div class="booking-embed" data-reveal>
          <div id="sbw-widget"></div>
          <p class="booking-fallback">Booking system not loading? <a href="https://365techies.secure.simplybook.it/v2/" target="_blank" rel="noopener">OPEN IT IN A NEW TAB &#8594;</a></p>
        </div>
      </div>
      <script src="//widget.simplybook.it/v2/widget/widget.js" defer></script>
      <script>
        window.addEventListener('load', function () {
          try {
            if (typeof SimplybookWidget === 'undefined') return;
            new SimplybookWidget({"widget_type":"iframe","url":"https://365techies.secure.simplybook.it","theme":"default","theme_settings":{"timeline_hide_unavailable":"1","hide_past_days":"0","timeline_show_end_time":"0","timeline_modern_display":"as_slots","sidebar_type":"normal","display_item_mode":"block","body_bg_color":"#070d22","dark_font_color":"#eaf4ff","light_font_color":"#ffffff","btn_color_1":"#1d97e3","sidebar_bg_color":"#0c1430","booking_nav_bg_color":"#0c1430"},"timeline":"modern","datepicker":"top_calendar","is_rtl":false,"app_config":{"clear_session":0,"allow_switch_to_ashby":1,"predefined":[]},"container_id":"sbw-widget"});
          } catch (e) {}
        });
      </script>
    </section>'''

def book_service():
    slug = "book-service"
    desc = "Book or manage your computer servicing, repair or setup appointment online with 365 Techies. Pick a time that suits you, or sign in to reschedule. Bournemouth, Poole and Dorset."
    faqs = [
      ("Can I reschedule or cancel my appointment?", "Yes — when you book you'll get a confirmation with a link to manage, reschedule or cancel your appointment online. You can also sign in to the booking system at any time."),
      ("What can I book online?", "Computer and laptop servicing, repairs, new device setup, security checks and on-site visits across Bournemouth, Poole and Dorset. Not sure what you need? Call us on 01202 775566."),
      ("Do I need an account to book?", "No — you can book as a guest in under a minute. Returning customers can sign in to see and manage their appointments."),
    ]
    content = "\n".join([
      hero(bc("Book a Service"), "// ONLINE BOOKING",
           'Book your <em class="grad grad--cyan">servicing appointment</em>',
           "Manage your computer servicing online — book a service, repair, security check or new-device setup at a time that suits you, and reschedule or cancel whenever you need to.",
           cta1=("Open Booking System", "https://365techies.secure.simplybook.it/v2/"),
           cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["Book in under a minute","Reschedule or cancel anytime","Remote or on-site"]),
      f'''    <section class="section" aria-label="What you can book">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// WHAT YOU CAN BOOK</p>
          <h2 class="section-title section-title--center" data-title>Appointments for homes and businesses<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("monitor","Computer service","A full health-check and tune-up to keep your machine fast and safe."),("wrench","Repairs","Diagnose and fix slow, broken or misbehaving computers and laptops."),("home","New device setup","Get a new computer set up properly, with your files moved across."),("shield","Security check","A review of your protection, updates and backups."),("briefcase","Business visit","On-site support and servicing for your team across Dorset."),("bolt","Remote session","A scheduled remote support session at a time that suits you.")])}
        </div>
      </div>
    </section>''',
      BOOKING_EMBED,
      f'''    <section class="how" aria-label="How booking works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>// HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>Booking in three steps<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("Choose a service","Pick the type of appointment and a time that works for you."),("Confirm your details","Book as a guest in under a minute, or sign in if you're a returning customer."),("Manage it anytime","Get a confirmation with a link to reschedule or cancel whenever you need.")])}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Not sure what you need?",
          "Call us on 01202 775566 or start a live chat and a friendly techie will help you book the right appointment.",
          primary=("Open Booking System", "https://365techies.secure.simplybook.it/v2/"),
          secondary=("Call 01202 775566", "tel:+441202775566")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "Book a Service"), webpage(s, "Book a Computer Service or Repair", _desc),
                      service(s, "Computer Servicing Appointments", "Online booking for computer servicing, repairs, setup and on-site visits across Dorset.", "Computer servicing"),
                      faqpage(s, _faqs)])
    add(slug=slug, title="Book a Computer Service or Repair | 365 Techies",
        desc=desc, og_title="Book a Service | 365 Techies", schema=schema, content=content)
book_service()

# ===================================================== PLAN FINDER (quiz)
PLAN_FINDER_WIDGET = '''    <section class="section section--alt" aria-label="Plan finder quiz">
      <div class="wrap">
        <div class="quiz" id="quiz">
          <div class="quiz__step is-active" data-step="who">
            <p class="quiz__count mono">QUESTION 1 OF 3</p>
            <h2 class="quiz__q">Who is the IT support for?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-next="home" data-set="who:home">My home or family</button>
              <button type="button" class="quiz__opt" data-next="business" data-set="who:business">My business</button>
            </div>
          </div>
          <div class="quiz__step" data-step="home">
            <p class="quiz__count mono">QUESTION 2 OF 3</p>
            <h2 class="quiz__q">How much do you need covered?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-next="m365" data-set="size:one">Just me &mdash; one main computer</button>
              <button type="button" class="quiz__opt" data-next="m365" data-set="size:family">A few devices for the family</button>
              <button type="button" class="quiz__opt" data-next="m365" data-set="size:power">Lots of devices &mdash; I rely on tech daily</button>
            </div>
          </div>
          <div class="quiz__step" data-step="business">
            <p class="quiz__count mono">QUESTION 2 OF 3</p>
            <h2 class="quiz__q">How big is your team?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-next="m365" data-set="size:small">1 to 3 people</button>
              <button type="button" class="quiz__opt" data-next="m365" data-set="size:team">A small team</button>
              <button type="button" class="quiz__opt" data-next="m365" data-set="size:company">A whole company that runs on IT</button>
            </div>
          </div>
          <div class="quiz__step" data-step="m365">
            <p class="quiz__count mono">QUESTION 3 OF 3</p>
            <h2 class="quiz__q">Do you need Microsoft 365 (Outlook, Teams, email)?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-next="result" data-set="m365:yes">Yes please</button>
              <button type="button" class="quiz__opt" data-next="result" data-set="m365:no">No, or not sure</button>
            </div>
          </div>
          <div class="quiz__step" data-step="result">
            <div class="quiz__result" id="quiz-result"></div>
          </div>
          <div class="quiz__back"><button type="button" id="quiz-restart">&larr; Start again</button></div>
        </div>
      </div>
      <script>
      (function () {
        var quiz = document.getElementById('quiz');
        if (!quiz) return;
        var answers = {};
        function show(step) {
          var steps = quiz.querySelectorAll('.quiz__step');
          for (var i = 0; i < steps.length; i++) {
            steps[i].classList.toggle('is-active', steps[i].getAttribute('data-step') === step);
          }
        }
        var PLANS = {
          'home-essential': {name:'Essential Home', price:'&pound;15.95', per:'/month', desc:'Friendly cover for one computer &mdash; remote support, a full service every 6 weeks and security advice.', href:'/home-it-support-plans/'},
          'home-365': {name:'Home + Office 365', price:'&pound;19.95', per:'/month', desc:'Everything in Essential, plus Microsoft 365 set up and supported.', href:'/home-it-support-plans/'},
          'home-family': {name:'Family Home', price:'&pound;19.95', per:'/month', desc:'Cover for several computers and devices, Wi-Fi, printers and Microsoft 365.', href:'/home-it-support-plans/'},
          'home-premium': {name:'Premium Home', price:'&pound;24.95', per:'/month', desc:'Priority support and advanced help for the multiple devices you rely on.', href:'/home-it-support-plans/'},
          'business-starter': {name:'Business Starter', price:'&pound;21.15', per:'/user / month', desc:'Remote support, email and Microsoft 365 for 1 to 3 users.', href:'/business-it-support-plans/'},
          'business-standard': {name:'Business Standard', price:'Custom', per:'', desc:'Full Microsoft 365 management, security and backups for a small team.', href:'/business-it-support-plans/'},
          'business-premium': {name:'Business Premium', price:'Custom', per:'', desc:'Priority support, security planning and onboarding for a company that runs on IT.', href:'/business-it-support-plans/'}
        };
        function recommend() {
          var key;
          if (answers.who === 'home') {
            if (answers.size === 'power') key = 'home-premium';
            else if (answers.size === 'family') key = 'home-family';
            else key = (answers.m365 === 'yes') ? 'home-365' : 'home-essential';
          } else {
            if (answers.size === 'company') key = 'business-premium';
            else if (answers.size === 'team') key = 'business-standard';
            else key = 'business-starter';
          }
          var p = PLANS[key];
          var custom = (p.price === 'Custom');
          var primary = custom
            ? '<a href="/contact/" class="button primary">Get a Quote</a>'
            : '<a href="' + p.href + '" class="button primary">Set up Direct Debit</a>';
          document.getElementById('quiz-result').innerHTML =
            '<p class="tag">Recommended for you</p>' +
            '<h3>' + p.name + '</h3>' +
            '<p class="price">' + p.price + '<span class="per">' + p.per + '</span></p>' +
            '<p>' + p.desc + '</p>' +
            '<div class="quiz__actions">' + primary +
            '<a href="' + p.href + '" class="button secondary">See full plan details</a></div>';
        }
        quiz.addEventListener('click', function (e) {
          var opt = e.target.closest('.quiz__opt');
          if (!opt) return;
          var set = opt.getAttribute('data-set').split(':');
          answers[set[0]] = set[1];
          var next = opt.getAttribute('data-next');
          if (next === 'result') recommend();
          show(next);
        });
        document.getElementById('quiz-restart').addEventListener('click', function () {
          answers = {}; show('who');
        });
      })();
      </script>
    </section>'''

def plan_finder():
    slug = "plan-finder"
    desc = "Not sure which IT support plan is right for you? Answer 3 quick questions and our plan finder recommends the best 365 Techies home or business plan. No sign-up needed."
    content = "\n".join([
      hero(bc("Plan Finder"), "// FIND YOUR PLAN",
           'Which plan is <em class="grad grad--cyan">right for you?</em>',
           "Answer three quick questions and we'll recommend the best monthly plan for your home or business — no email, no sign-up, no pressure.",
           cta1=("View All Plans", "/monthly-it-support/"), cta2=("Talk to a Techie", "/contact/"),
           chips=["Takes 30 seconds","No sign-up","Honest recommendation"]),
      PLAN_FINDER_WIDGET,
      cta("Still not sure?",
          "Tell us a bit about your setup and a friendly techie will recommend the right plan — no jargon, no pressure.",
          primary=("Contact Us", "/contact/"), secondary=("Call 01202 775566", "tel:+441202775566")),
    ])
    def schema(s, _desc=desc):
        return graph([crumb(s, "Plan Finder"), webpage(s, "IT Support Plan Finder", _desc)])
    add(slug=slug, title="Plan Finder — Which IT Support Plan Is Right for You? | 365 Techies",
        desc=desc, og_title="IT Support Plan Finder | 365 Techies", schema=schema, content=content)
plan_finder()

# ===================================================== IT HEALTH CHECK TOOL (interactive)
HEALTH_CHECK_WIDGET = '''    <section class="section section--alt" aria-label="IT and security health check">
      <div class="wrap">
        <div class="quiz quiz--hc" id="hc">
          <div class="quiz__step is-active" data-step="start">
            <p class="quiz__count mono">FREE &middot; INSTANT &middot; NO SIGN-UP</p>
            <h2 class="quiz__q">Who is this health check for?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-aud="home">My home &amp; family</button>
              <button type="button" class="quiz__opt" data-aud="business">My business</button>
            </div>
          </div>
          <div class="quiz__step" data-step="q">
            <div class="hc-meter hc-meter--top"><span id="hc-bar"></span></div>
            <p class="quiz__count mono" id="hc-count"></p>
            <h2 class="quiz__q" id="hc-q"></h2>
            <div class="quiz__opts" id="hc-opts"></div>
          </div>
          <div class="quiz__step" data-step="result">
            <div class="quiz__result" id="hc-result"></div>
          </div>
          <div class="quiz__back"><button type="button" id="hc-restart">&larr; Start again</button></div>
        </div>
      </div>
      <script>
      (function () {
        var root = document.getElementById('hc');
        if (!root) return;
        var ALL = [
          {theme:'Backups', aud:'both', q:'How are your important files &amp; photos backed up?',
            opts:[{t:'Automatic cloud backup I have actually tested',s:10},{t:'Some backup, but I am not sure it works',s:5},{t:'No real backup, or not sure',s:0}],
            fix:{t:'Set up tested, automatic backups',href:'/backup-support/'}},
          {theme:'Passwords', aud:'both', q:'How do you manage passwords?',
            opts:[{t:'Unique, strong passwords in a password manager',s:10},{t:'A handful I reuse across sites',s:5},{t:'The same one or two everywhere',s:0}],
            fix:{t:'Use a password manager &amp; unique passwords',href:'/cybersecurity-support/'}},
          {theme:'Multi-factor login', aud:'both', q:'Is two-step / multi-factor login (MFA) switched on for your email?',
            opts:[{t:'Yes, on email and key accounts',s:10},{t:'On one or two accounts',s:5},{t:'No, or not sure what that is',s:0}],
            fix:{t:'Turn on multi-factor authentication (MFA)',href:'/cybersecurity-support/'}},
          {theme:'Updates', aud:'both', q:'Are your computers kept up to date with the latest updates?',
            opts:[{t:'Yes, updates install automatically',s:10},{t:'Sometimes, when I remember',s:5},{t:'Rarely or never',s:0}],
            fix:{t:'Keep Windows &amp; apps patched automatically',href:'/windows-11-support/'}},
          {theme:'Windows version', aud:'both', q:'What are your main PCs running?',
            opts:[{t:'Windows 11',s:10},{t:'Windows 10',s:3},{t:'Something older, or not sure',s:0}],
            fix:{t:'Plan your move off Windows 10 (support has ended)',href:'/windows-10-end-of-life/'}},
          {theme:'Anti-malware', aud:'both', q:'What protects your devices from viruses &amp; malware?',
            opts:[{t:'Active, paid security software',s:10},{t:'The free built-in protection only',s:6},{t:'Nothing, or not sure',s:0}],
            fix:{t:'Add proper, managed malware protection',href:'/malwarebytes-premium/'}},
          {theme:'Scams &amp; phishing', aud:'both', q:'Could you confidently spot a scam or phishing email?',
            opts:[{t:'Yes &mdash; and so could everyone who uses our devices',s:10},{t:'Mostly, but not always sure',s:5},{t:'Not really',s:0}],
            fix:{t:'Get scam &amp; phishing awareness help',href:'/cybersecurity-support/'}},
          {theme:'Email &amp; Microsoft 365', aud:'both', q:'How is your email / Microsoft 365 set up?',
            opts:[{t:'Properly configured and secured',s:10},{t:'It works, but was never really set up',s:5},{t:'Free webmail, or not sure',s:2}],
            fix:{t:'Get Microsoft 365 set up &amp; secured',href:'/microsoft-365-support/'}},
          {theme:'Wi-Fi &amp; router', aud:'both', q:'Has your Wi-Fi router been secured (default password changed, firmware updated)?',
            opts:[{t:'Yes',s:10},{t:'Not sure',s:4},{t:'No, still on the defaults',s:0}],
            fix:{t:'Secure your Wi-Fi &amp; router',href:'/wifi-support/'}},
          {theme:'Who fixes it', aud:'both', q:'When something goes wrong, who fixes it?',
            opts:[{t:'We have a monthly IT support plan',s:10},{t:'We call someone when it breaks',s:5},{t:'We struggle through ourselves',s:0}],
            fix:{t:'Get proactive monthly IT support',href:'/monthly-it-support/'}},
          {theme:'Family devices', aud:'home', q:'Are the whole family&rsquo;s devices (kids&rsquo; included) set up safely?',
            opts:[{t:'Yes, all sorted',s:10},{t:'Some of them',s:5},{t:'Not really',s:0}],
            fix:{t:'Get family-friendly IT support &amp; safety setup',href:'/family-it-support/'}},
          {theme:'Staff leavers', aud:'business', q:'When someone leaves, are their accounts &amp; access removed promptly?',
            opts:[{t:'Yes, we have a clear process',s:10},{t:'Eventually',s:4},{t:'No real process',s:0}],
            fix:{t:'Put a secure joiner / leaver process in place',href:'/microsoft-365-support/'}},
          {theme:'Security standards', aud:'business', q:'Are you working towards recognised security standards (e.g. Cyber Essentials)?',
            opts:[{t:'Certified, or in progress',s:10},{t:'We&rsquo;d like to',s:5},{t:'No, or never heard of it',s:0}],
            fix:{t:'Get help achieving Cyber Essentials',href:'/cyber-essentials/'}},
          {theme:'Data &amp; compliance', aud:'business', q:'Are you confident your data handling meets GDPR / compliance needs?',
            opts:[{t:'Yes',s:10},{t:'Somewhat',s:5},{t:'No, or not sure',s:0}],
            fix:{t:'Review your GDPR &amp; IT compliance',href:'/gdpr-it-compliance/'}}
        ];
        var qs = [], idx = 0, score = 0, miss = [];
        function show(step) {
          var s = root.querySelectorAll('.quiz__step');
          for (var i = 0; i < s.length; i++) s[i].classList.toggle('is-active', s[i].getAttribute('data-step') === step);
        }
        function start(aud) {
          qs = ALL.filter(function (x) { return x.aud === 'both' || x.aud === aud; });
          idx = 0; score = 0; miss = []; render(); show('q');
        }
        function render() {
          var q = qs[idx];
          document.getElementById('hc-count').innerHTML = 'QUESTION ' + (idx + 1) + ' OF ' + qs.length + ' &middot; ' + q.theme;
          document.getElementById('hc-q').innerHTML = q.q;
          var o = '';
          for (var i = 0; i < q.opts.length; i++) o += '<button type="button" class="quiz__opt" data-i="' + i + '">' + q.opts[i].t + '</button>';
          document.getElementById('hc-opts').innerHTML = o;
          document.getElementById('hc-bar').style.width = Math.round(idx / qs.length * 100) + '%';
        }
        function pick(i) {
          var q = qs[idx], opt = q.opts[i];
          score += opt.s;
          if (opt.s < 10) miss.push({ s: opt.s, fix: q.fix });
          idx++;
          if (idx < qs.length) render();
          else { results(); show('result'); }
        }
        function results() {
          var max = qs.length * 10, pct = Math.round(score / max * 100);
          var band, cls;
          if (pct >= 80) { band = 'Strong'; cls = 'hc--strong'; }
          else if (pct >= 55) { band = 'Good, with some gaps'; cls = 'hc--good'; }
          else { band = 'Needs attention'; cls = 'hc--risk'; }
          miss.sort(function (a, b) { return a.s - b.s; });
          var seen = {}, items = '', n = 0;
          for (var i = 0; i < miss.length && n < 4; i++) {
            var f = miss[i].fix;
            if (seen[f.href]) continue;
            seen[f.href] = 1; n++;
            items += '<li><a href="' + f.href + '">' + f.t + ' &#8594;</a></li>';
          }
          if (!items) items = '<li>Brilliant &mdash; no urgent gaps stood out. A regular check-up keeps it that way.</li>';
          var done = qs.length - miss.length;
          document.getElementById('hc-result').innerHTML =
            '<p class="tag">Your IT health score</p>' +
            '<div class="hc-score ' + cls + '"><span class="hc-score__num">' + pct + '</span><span class="hc-score__den">/100</span></div>' +
            '<p class="hc-bandlabel ' + cls + '">' + band + '</p>' +
            '<div class="hc-meter"><span style="width:' + pct + '%"></span></div>' +
            '<h3>Your top priorities</h3>' +
            '<ul class="hc-actions">' + items + '</ul>' +
            '<p class="hc-note mono">' + done + ' of ' + qs.length + ' areas already in good shape.</p>' +
            '<div class="quiz__actions"><a href="/book-service/" class="button primary">Book a free call</a><a href="/contact/" class="button secondary">Email me my full report</a></div>' +
            '<p class="hc-disclaimer">This is a quick guide, not a formal audit. For a proper review, book a free IT health check with a real techie &mdash; it&rsquo;s on us.</p>';
        }
        root.addEventListener('click', function (e) {
          var b = e.target.closest('.quiz__opt');
          if (!b) return;
          if (b.hasAttribute('data-aud')) { start(b.getAttribute('data-aud')); return; }
          if (b.hasAttribute('data-i')) pick(parseInt(b.getAttribute('data-i'), 10));
        });
        document.getElementById('hc-restart').addEventListener('click', function () { show('start'); });
      })();
      </script>
    </section>'''

def health_check_tool():
    slug = "it-health-check-tool"
    desc = "Free, instant IT & cyber security health check for homes and businesses. Answer a few quick questions and get an on-screen score out of 100 plus a plain-English action plan — no sign-up needed."
    faqs = [
      ("Is the IT health check really free?", "Yes &mdash; completely free and instant. You&rsquo;ll see your score on screen straight away, with no sign-up or email required."),
      ("Do you store my answers?", "No. The check runs entirely in your browser &mdash; we don&rsquo;t see or store your answers unless you choose to send them to us for your full report."),
      ("Is this the same as a full security audit?", "It&rsquo;s a quick, plain-English way to spot obvious gaps. For a thorough review, book a free IT health check and a real techie will look properly."),
      ("Does it work for both home and business?", "Yes &mdash; choose home or business at the start and the questions adapt to you."),
    ]
    content = "\n".join([
      hero(bc("Free IT Health Check Tool"), "// FREE INSTANT CHECK",
           'How healthy is your <em class="grad grad--cyan">IT &amp; security?</em>',
           "Answer a few quick questions and get an instant score out of 100 &mdash; plus a clear, jargon-free action plan. No sign-up, and no email needed to see your result.",
           cta1=("Book a Free Call", "/book-service/"), cta2=("See Our Plans", "/monthly-it-support/"),
           chips=["Takes ~90 seconds", "Instant on-screen score", "Home &amp; business"]),
      HEALTH_CHECK_WIDGET,
      faq_html(faqs),
      cta("Want a real techie to check it over?",
          "Book a free, no-obligation IT health check and we&rsquo;ll review your security, backups and setup properly.",
          primary=("Book a Free Health Check", "/book-service/"), secondary=("Talk to a Techie", "/contact/")),
    ])
    def schema(s, _d=desc, _f=faqs):
        return graph([crumb(s, "Free IT Health Check Tool"), webpage(s, "Free IT Health Check Tool", _d),
                      faqpage(s, _f),
                      {"@type": "WebApplication", "name": "365 Techies IT Health Check",
                       "applicationCategory": "SecurityApplication", "operatingSystem": "Web (all browsers)",
                       "url": SITE + "/it-health-check-tool/",
                       "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"},
                       "provider": {"@id": SITE + "/#business"}}])
    add(slug=slug, title="Free IT & Security Health Check Tool (Instant Score) | 365 Techies",
        desc=desc, og_title="Free IT Health Check Tool | 365 Techies", schema=schema, content=content)
health_check_tool()

# ===================================================== WINDOWS 10 END OF LIFE (campaign hub)
WIN10_CHECK_WIDGET = '''    <section class="section section--alt" aria-label="Are you affected by Windows 10 end of life?">
      <div class="wrap">
        <div class="quiz" id="w10">
          <div class="quiz__step is-active" data-step="ver">
            <p class="quiz__count mono">QUICK CHECK &middot; 30 SECONDS</p>
            <h2 class="quiz__q">Which Windows are your main computers running?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-set="ver:11">Windows 11</button>
              <button type="button" class="quiz__opt" data-set="ver:10">Windows 10</button>
              <button type="button" class="quiz__opt" data-set="ver:old">Older, or I&rsquo;m not sure</button>
            </div>
          </div>
          <div class="quiz__step" data-step="age">
            <p class="quiz__count mono">ONE MORE</p>
            <h2 class="quiz__q">Roughly how old is the computer?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-set="age:new">Under 4 years</button>
              <button type="button" class="quiz__opt" data-set="age:mid">4&ndash;7 years</button>
              <button type="button" class="quiz__opt" data-set="age:old">Older, or not sure</button>
            </div>
          </div>
          <div class="quiz__step" data-step="result"><div class="quiz__result" id="w10-result"></div></div>
          <div class="quiz__back"><button type="button" id="w10-restart">&larr; Start again</button></div>
        </div>
      </div>
      <script>
      (function () {
        var quiz = document.getElementById('w10');
        if (!quiz) return;
        var a = {};
        function show(step) {
          var s = quiz.querySelectorAll('.quiz__step');
          for (var i = 0; i < s.length; i++) s[i].classList.toggle('is-active', s[i].getAttribute('data-step') === step);
        }
        function result() {
          var head, body, cls;
          if (a.ver === '11') {
            cls = 'hc--strong'; head = 'You&rsquo;re in good shape';
            body = 'Windows 11 is fully supported and getting security updates. We can still give it a free health check to make sure it&rsquo;s set up safely.';
          } else if (a.ver === '10') {
            cls = 'hc--risk'; head = 'Time to act';
            body = (a.age === 'new')
              ? 'Windows 10 is no longer supported, but a newer PC like yours can usually upgrade to Windows 11 <strong>free</strong>. We&rsquo;ll check it&rsquo;s eligible and do the upgrade for you.'
              : 'Windows 10 is no longer getting security updates. On an older machine, upgrading or replacing it is the safe move &mdash; we&rsquo;ll advise the best-value option and handle it for you.';
          } else {
            cls = 'hc--risk'; head = 'Let&rsquo;s check it properly';
            body = 'If you&rsquo;re not sure what you&rsquo;re running, it&rsquo;s worth a quick look &mdash; older Windows versions are a real security risk. We&rsquo;ll check for free and tell you straight.';
          }
          document.getElementById('w10-result').innerHTML =
            '<p class="hc-bandlabel ' + cls + '">' + head + '</p>' +
            '<p>' + body + '</p>' +
            '<div class="quiz__actions">' +
            '<a href="/book-service/" class="button primary">Book a free check</a>' +
            '<a href="/windows-11-support/" class="button secondary">Windows 11 upgrades</a></div>';
        }
        quiz.addEventListener('click', function (e) {
          var opt = e.target.closest('.quiz__opt');
          if (!opt) return;
          var set = opt.getAttribute('data-set').split(':');
          a[set[0]] = set[1];
          if (set[0] === 'ver' && set[1] === '11') { result(); show('result'); return; }
          if (set[0] === 'ver') { show('age'); return; }
          if (set[0] === 'age') { result(); show('result'); }
        });
        document.getElementById('w10-restart').addEventListener('click', function () { a = {}; show('ver'); });
      })();
      </script>
    </section>'''

def windows_10_eol():
    slug = "windows-10-end-of-life"
    desc = "Windows 10 reached end of support on 14 October 2025 — no more free security updates. 365 Techies explains what it means, whether you're affected, and your options: free Windows 11 upgrade check, new PCs and Dell hardware."
    faqs = [
      ("Is Windows 10 still safe to use?", "Windows 10 reached end of support on 14 October 2025, so Microsoft no longer ships free security updates. It still switches on, but it gets steadily riskier the longer it goes unpatched."),
      ("Do I have to buy a new computer?", "Not always. Many PCs can upgrade to Windows 11 for free &mdash; we&rsquo;ll check whether yours is eligible, and only recommend a new machine if it genuinely makes sense."),
      ("What is ESU?", "Extended Security Updates &mdash; a paid Microsoft programme that buys limited extra time on Windows 10. We can advise whether it&rsquo;s worth it for you, or whether upgrading is better value."),
      ("Can you handle the whole upgrade for me?", "Yes &mdash; we back up your files, upgrade or set up your new PC, move everything across and make sure it all works. No stress and no lost data."),
    ]
    pre = WIN10_CHECK_WIDGET + '''
    <section class="section" aria-label="What end of support means">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>// WHAT IT MEANS</p>
        <h2 class="section-title section-title--center" data-title>What stops being safe<span class="title-underline title-underline--center"></span></h2>
        <ul class="check-grid" data-stagger>
          <li><strong>No more security updates</strong> &mdash; newly-discovered holes won&rsquo;t be patched, so attackers target them.</li>
          <li><strong>Antivirus isn&rsquo;t enough on its own</strong> &mdash; it can&rsquo;t fix gaps in an unsupported operating system.</li>
          <li><strong>Apps drop support</strong> &mdash; browsers, Microsoft 365 and other software gradually stop updating on Windows 10.</li>
          <li><strong>Compliance &amp; insurance risk</strong> &mdash; running unsupported systems can breach cyber-insurance and data-protection requirements.</li>
        </ul>
      </div>
    </section>
    <section class="section section--alt" aria-label="Your options">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>// YOUR OPTIONS</p>
        <h2 class="section-title section-title--center" data-title>Three ways forward<span class="title-underline title-underline--center"></span></h2>
        <div class="blog-grid" data-stagger>
          <a class="post-card" href="/windows-11-support/"><p class="post-card__cat">Best for most</p><h3>Upgrade to Windows 11</h3><p>If your PC is eligible, we&rsquo;ll upgrade it to Windows 11 free, safely and with your files intact.</p><span class="post-card__more">See upgrades &#8594;</span></a>
          <a class="post-card" href="/new-computer-setup/"><p class="post-card__cat">Fresh start</p><h3>New PC, set up for you</h3><p>If it&rsquo;s time for a new machine, we&rsquo;ll set it up, move everything across and recycle the old one.</p><span class="post-card__more">New computer setup &#8594;</span></a>
          <a class="post-card" href="/custom-pc-builds/"><p class="post-card__cat">Built to last</p><h3>Custom-built PC or Dell</h3><p>Need something more powerful? We build custom PCs and supply <a href="/dell-hardware/">Dell hardware</a> to suit.</p><span class="post-card__more">Custom PCs &#8594;</span></a>
        </div>
      </div>
    </section>'''
    inner = """          <h2>Windows 10 end of support, in plain English</h2>
          <p>On <strong>14 October 2025</strong>, Microsoft ended free support for Windows 10. Your computer still turns on and works &mdash; but it no longer receives the free security updates that quietly protect you in the background. Over time, that makes an unsupported PC an easier target for scams, ransomware and viruses.</p>
          <p>The good news: you have time to do this properly, and you don&rsquo;t have to work it out alone. We&rsquo;ll check your machines, tell you honestly what&rsquo;s worth upgrading and what&rsquo;s worth replacing, and handle the whole thing for you.</p>
          <h2>A quick glossary</h2>
          <ul>
            <li><strong>End of support</strong> &mdash; the date a product stops getting free updates and fixes.</li>
            <li><strong>Security updates</strong> &mdash; free patches that close newly-found holes before criminals can use them.</li>
            <li><strong>ESU (Extended Security Updates)</strong> &mdash; a paid way to buy limited extra time on Windows 10.</li>
            <li><strong>Windows 11</strong> &mdash; the current, fully-supported version &mdash; a free upgrade on eligible PCs.</li>
          </ul>"""
    content = "\n".join([
      hero(bc("Windows 10 End of Life"), "// SUPPORT ENDED 14 OCT 2025",
           'Windows 10 support has <em class="grad grad--green">ended</em> &mdash; here&rsquo;s what to do',
           "Windows 10 no longer gets free security updates. Find out in 30 seconds whether you&rsquo;re affected, then let us handle the fix &mdash; a free Windows 11 upgrade where possible, or a new PC set up for you.",
           cta1=("Check If You're Affected", "#w10"), cta2=("Book a Free Check", "/book-service/"),
           chips=["Free upgrade check", "We do the work", "No lost data"]),
      pre,
      '    <section class="section"><div class="wrap"><div class="prose" data-reveal>\n' + inner + '\n        </div></div></section>',
      faq_html(faqs),
      cta("Don&rsquo;t leave it running unprotected",
          "Book a free check and we&rsquo;ll tell you exactly where you stand &mdash; and sort the upgrade for you.",
          primary=("Book a Free Check", "/book-service/"), secondary=("Talk to a Techie", "/contact/")),
    ])
    def schema(s, _d=desc, _f=faqs):
        return graph([crumb(s, "Windows 10 End of Life"), webpage(s, "Windows 10 End of Life", _d), faqpage(s, _f)])
    add(slug=slug, title="Windows 10 End of Life (Oct 2025): What to Do Next | 365 Techies",
        desc=desc, og_title="Windows 10 End of Life — What to Do | 365 Techies", schema=schema, content=content)
windows_10_eol()

# ===================================================== QUICK QUOTE (price-shopper capture)
QUICK_QUOTE_WIDGET = '''    <section class="section section--alt" aria-label="Quick quote">
      <div class="wrap">
        <div class="quiz quiz--quote" id="qq">
          <div class="quiz__step is-active" data-step="who">
            <p class="quiz__count mono">STEP 1 OF 4 &middot; UNDER A MINUTE</p>
            <h2 class="quiz__q">Is this for your home or your business?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-next="size" data-set="who:Home">Home &amp; family</button>
              <button type="button" class="quiz__opt" data-next="size" data-set="who:Business">Business</button>
            </div>
          </div>
          <div class="quiz__step" data-step="size">
            <p class="quiz__count mono">STEP 2 OF 4</p>
            <h2 class="quiz__q">How much needs covering?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-next="situation" data-set="size:1 main computer">Just one main computer</button>
              <button type="button" class="quiz__opt" data-next="situation" data-set="size:A few devices">A few devices</button>
              <button type="button" class="quiz__opt" data-next="situation" data-set="size:Several users / devices">Several users or devices</button>
            </div>
          </div>
          <div class="quiz__step" data-step="situation">
            <p class="quiz__count mono">STEP 3 OF 4</p>
            <h2 class="quiz__q">What&rsquo;s your situation?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-next="details" data-set="situation:No support right now">No IT support right now</button>
              <button type="button" class="quiz__opt" data-next="details" data-set="situation:Unhappy with current provider">Unhappy with my current provider</button>
              <button type="button" class="quiz__opt" data-next="details" data-set="situation:Comparing providers / costs">Comparing providers &amp; costs</button>
              <button type="button" class="quiz__opt" data-next="details" data-set="situation:New setup / project">A new setup or project</button>
            </div>
          </div>
          <div class="quiz__step" data-step="details">
            <p class="quiz__count mono">STEP 4 OF 4 &middot; WHERE TO SEND IT</p>
            <h2 class="quiz__q">Where shall we send your quote?</h2>
            <form class="contact-form quote-form" novalidate>
              <input type="hidden" name="topic" value="Quick quote / cost comparison">
              <input type="hidden" name="message" id="qq-message" value="">
              <div class="field"><label for="qq-name">Your name</label><input id="qq-name" name="name" type="text" autocomplete="name" required></div>
              <div class="field"><label for="qq-email">Email</label><input id="qq-email" name="email" type="email" autocomplete="email" required></div>
              <div class="field"><label for="qq-phone">Phone (optional)</label><input id="qq-phone" name="phone" type="tel" autocomplete="tel"></div>
              <div class="field"><label for="qq-note">Anything else? (optional)</label><textarea id="qq-note" rows="3"></textarea></div>
              <button type="submit" class="button primary button--lg">Get my quote &#8594;</button>
              <p class="form-status mono" role="status"></p>
              <p class="hc-disclaimer">Takes under a minute &middot; No obligation &middot; UK only. We&rsquo;ll reply by email or phone &mdash; no instant price, just an honest, tailored quote.</p>
            </form>
          </div>
          <div class="quiz__back"><button type="button" id="qq-restart">&larr; Start again</button></div>
        </div>
      </div>
      <script>
      (function () {
        var quiz = document.getElementById('qq');
        if (!quiz) return;
        var ans = {};
        function show(step) {
          var s = quiz.querySelectorAll('.quiz__step');
          for (var i = 0; i < s.length; i++) s[i].classList.toggle('is-active', s[i].getAttribute('data-step') === step);
        }
        quiz.addEventListener('click', function (e) {
          var opt = e.target.closest('.quiz__opt');
          if (!opt) return;
          var set = opt.getAttribute('data-set').split(':');
          ans[set[0]] = set.slice(1).join(':');
          show(opt.getAttribute('data-next'));
        });
        var form = quiz.querySelector('.quote-form');
        if (form) form.addEventListener('submit', function () {
          var note = document.getElementById('qq-note');
          var msg = 'Quick quote request:\\n' +
            '- For: ' + (ans.who || '') + '\\n' +
            '- Size: ' + (ans.size || '') + '\\n' +
            '- Situation: ' + (ans.situation || '') + '\\n';
          if (note && note.value.trim()) msg += '- Note: ' + note.value.trim() + '\\n';
          document.getElementById('qq-message').value = msg;
        });
        document.getElementById('qq-restart').addEventListener('click', function () { ans = {}; show('who'); });
      })();
      </script>
    </section>'''

def quick_quote():
    slug = "quick-quote"
    desc = "Get a free, no-obligation IT support quote or cost comparison in under a minute. Tell us about your home or business setup and 365 Techies will reply with honest, tailored pricing — ideal if you're comparing providers."
    content = "\n".join([
      hero(bc("Quick Quote"), "// FREE QUOTE &middot; UNDER A MINUTE",
           'Get a quote or <em class="grad grad--cyan">cost comparison</em>',
           "Comparing providers, or paying too much per problem? Answer four quick questions and we&rsquo;ll come back with honest, tailored pricing &mdash; no obligation, no hard sell.",
           cta1=("See Our Pricing", "/pricing/"), cta2=("Why Switch to Us", "/switching-it-provider/"),
           chips=["Under a minute", "No obligation", "Honest comparison"]),
      QUICK_QUOTE_WIDGET,
      cta("Prefer to just talk to someone?",
          "Call a friendly local techie &mdash; no scripts, no jargon, no pressure.",
          primary=("Call 01202 775566", "tel:+441202775566"), secondary=("Contact Us", "/contact/")),
    ])
    def schema(s, _d=desc):
        return graph([crumb(s, "Quick Quote"), webpage(s, "Quick Quote / Cost Comparison", _d)])
    add(slug=slug, title="Quick Quote & IT Support Cost Comparison (Under a Minute) | 365 Techies",
        desc=desc, og_title="Get a Quick IT Support Quote | 365 Techies", schema=schema, content=content)
quick_quote()

# ===================================================== BROADBAND SPEED ADVISOR
BROADBAND_WIDGET = '''    <section class="section section--alt" aria-label="Broadband speed checker">
      <div class="wrap">
        <div class="quiz" id="bb">
          <div class="quiz__step is-active" data-step="hh">
            <p class="quiz__count mono">STEP 1 OF 3</p>
            <h2 class="quiz__q">How many people use the internet at once?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-next="use" data-set="hh:one">Just me / one at a time</button>
              <button type="button" class="quiz__opt" data-next="use" data-set="hh:few">2&ndash;3 of us</button>
              <button type="button" class="quiz__opt" data-next="use" data-set="hh:many">4 or more / a busy household</button>
            </div>
          </div>
          <div class="quiz__step" data-step="use">
            <p class="quiz__count mono">STEP 2 OF 3</p>
            <h2 class="quiz__q">What do you mostly do online?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-next="speed" data-set="use:browse">Browsing, email &amp; shopping</button>
              <button type="button" class="quiz__opt" data-next="speed" data-set="use:stream">Streaming TV &amp; video calls</button>
              <button type="button" class="quiz__opt" data-next="speed" data-set="use:game">Gaming &amp; big downloads</button>
              <button type="button" class="quiz__opt" data-next="speed" data-set="use:heavy">Lots of 4K + serious home working</button>
            </div>
          </div>
          <div class="quiz__step" data-step="speed">
            <p class="quiz__count mono">STEP 3 OF 3</p>
            <h2 class="quiz__q">Roughly what download speed do you get now?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-next="result" data-set="speed:s5">Under 10 Mbps</button>
              <button type="button" class="quiz__opt" data-next="result" data-set="speed:s20">10&ndash;30 Mbps</button>
              <button type="button" class="quiz__opt" data-next="result" data-set="speed:s50">30&ndash;70 Mbps</button>
              <button type="button" class="quiz__opt" data-next="result" data-set="speed:s100">70+ Mbps</button>
              <button type="button" class="quiz__opt" data-next="result" data-set="speed:unsure">Not sure</button>
            </div>
          </div>
          <div class="quiz__step" data-step="result"><div class="quiz__result" id="bb-result"></div></div>
          <div class="quiz__back"><button type="button" id="bb-restart">&larr; Start again</button></div>
        </div>
      </div>
      <script>
      (function () {
        var q = document.getElementById('bb'); if (!q) return;
        var a = {};
        function show(s){ var st=q.querySelectorAll('.quiz__step'); for(var i=0;i<st.length;i++) st[i].classList.toggle('is-active', st[i].getAttribute('data-step')===s); }
        var USE={browse:15,stream:40,game:80,heavy:150}, HH={one:1,few:1.3,many:1.7}, SPEED={s5:5,s20:20,s50:50,s100:100,unsure:null};
        function result(){
          var rec=Math.round((USE[a.use]||40)*(HH[a.hh]||1)/5)*5;
          var cur=SPEED[a.speed], band, cls, msg;
          if(cur===null){ band='Worth a quick check'; cls='hc--good'; msg='Run a free speed test (search &ldquo;speed test&rdquo; on Google) and you&rsquo;ll see your number &mdash; or we can check it for you.'; }
          else { var r=cur/rec;
            if(r>=1){ band='Looks plenty'; cls='hc--strong'; msg='Your connection should comfortably handle this. If it still feels slow, the culprit is more likely your computer or Wi-Fi &mdash; which we can fix.'; }
            else if(r>=0.6){ band='Borderline'; cls='hc--good'; msg='You&rsquo;re close, but busy moments may buffer. A faster package, better Wi-Fi, or (in rural spots) Starlink could help.'; }
            else { band='Likely not enough'; cls='hc--risk'; msg='Your speed looks low for this much use. A faster package would help &mdash; and where fast fibre isn&rsquo;t available, Starlink is often the answer.'; } }
          var second=(a.speed==='s5'||a.speed==='s20') ? '<a href="/starlink-internet/" class="button secondary">Explore Starlink</a>' : '<a href="/wifi-support/" class="button secondary">Wi-Fi &amp; speed help</a>';
          document.getElementById('bb-result').innerHTML='<p class="tag">Recommended speed</p><div class="hc-score '+cls+'"><span class="hc-score__num">'+rec+'</span><span class="hc-score__den">Mbps</span></div><p class="hc-bandlabel '+cls+'">'+band+'</p><p>'+msg+'</p><div class="quiz__actions"><a href="/book-service/" class="button primary">Get free advice</a>'+second+'</div><p class="hc-disclaimer">A rough guide based on typical needs &mdash; we&rsquo;re happy to advise properly, for free.</p>';
        }
        q.addEventListener('click',function(e){ var o=e.target.closest('.quiz__opt'); if(!o) return; var set=o.getAttribute('data-set').split(':'); a[set[0]]=set[1]; var n=o.getAttribute('data-next'); if(n==='result') result(); show(n); });
        document.getElementById('bb-restart').addEventListener('click',function(){ a={}; show('hh'); });
      })();
      </script>
    </section>'''

def broadband_advisor():
    slug = "broadband-speed-checker"
    desc = "Is your broadband fast enough? Use our free 30-second checker — answer 3 quick questions and get a plain-English recommended speed for your home, plus what to do if it's too slow (including Starlink for rural Dorset)."
    faqs = [
      ("How do I find my current broadband speed?", "Search &ldquo;speed test&rdquo; on Google and click Run Speed Test, or use fast.com &mdash; the download number (in Mbps) is what to enter. We can also check it for you."),
      ("Is slow internet the same as a slow computer?", "Not always &mdash; a slow computer or weak Wi-Fi often gets blamed on the broadband. Our free <a href=\"/it-health-check-tool/\">health check</a> and a quick look can tell which it is."),
      ("What if fast fibre isn&rsquo;t available where I live?", "In rural parts of Dorset and the New Forest, <a href=\"/starlink-internet/\">Starlink satellite internet</a> is often the best option &mdash; we supply, install and support it."),
    ]
    content = "\n".join([
      hero(bc("Broadband Speed Checker"), "// FREE &middot; 30 SECONDS",
           'Is your broadband <em class="grad grad--cyan">fast enough?</em>',
           "Answer three quick questions and we&rsquo;ll tell you the broadband speed your home really needs &mdash; and exactly what to do if you&rsquo;re falling short.",
           cta1=("Get Free Advice", "/book-service/"), cta2=("Starlink for Rural Areas", "/starlink-internet/"),
           chips=["Takes 30 seconds", "Plain English", "No sign-up"]),
      BROADBAND_WIDGET,
      faq_html(faqs),
      cta("Still buffering and slow?",
          "Let a friendly local techie sort your broadband, Wi-Fi and devices so everything just works.",
          primary=("Book a Free Chat", "/book-service/"), secondary=("Wi-Fi Support", "/wifi-support/")),
    ])
    def schema(s, _d=desc, _f=faqs):
        return graph([crumb(s, "Broadband Speed Checker"), webpage(s, "Broadband Speed Checker", _d), faqpage(s, _f),
                      {"@type": "WebApplication", "name": "365 Techies Broadband Speed Checker", "applicationCategory": "UtilitiesApplication",
                       "operatingSystem": "Web", "url": SITE + "/broadband-speed-checker/", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"}, "provider": {"@id": SITE + "/#business"}}])
    add(slug=slug, title="Broadband Speed Checker — Is Your Internet Fast Enough? | 365 Techies",
        desc=desc, og_title="Broadband Speed Checker | 365 Techies", schema=schema, content=content)
broadband_advisor()

# ===================================================== SPOT THE SCAM QUIZ
SCAM_WIDGET = '''    <section class="section section--alt" aria-label="Spot the scam quiz">
      <div class="wrap">
        <div class="quiz" id="sc">
          <div class="quiz__step is-active" data-step="q">
            <p class="quiz__count mono" id="sc-count"></p>
            <h2 class="quiz__q" id="sc-q"></h2>
            <div class="quiz__opts" id="sc-opts">
              <button type="button" class="quiz__opt" data-said="scam">It&rsquo;s a scam</button>
              <button type="button" class="quiz__opt" data-said="safe">Looks genuine</button>
            </div>
            <div class="quiz__result" id="sc-fb" style="margin-top:1.2rem"></div>
            <div class="quiz__actions" style="margin-top:1rem"><button type="button" class="button primary" id="sc-next" style="display:none">Next &rarr;</button></div>
          </div>
          <div class="quiz__step" data-step="result"><div class="quiz__result" id="sc-result"></div></div>
          <div class="quiz__back"><button type="button" id="sc-restart">&larr; Play again</button></div>
        </div>
      </div>
      <script>
      (function () {
        var root = document.getElementById('sc'); if (!root) return;
        var R = [
          {s:'An email says: &ldquo;You&rsquo;ve won a &pound;1,000 Amazon voucher &mdash; click here to claim within 24 hours.&rdquo;', scam:true, e:'Scam. Unexpected prizes, a ticking clock and a &ldquo;click here&rdquo; link are classic phishing. Real prizes don&rsquo;t arrive out of the blue.'},
          {s:'A text from &ldquo;ROYAL MAIL&rdquo;: &ldquo;Your parcel is held &mdash; pay a &pound;2.99 redelivery fee at this link.&rdquo;', scam:true, e:'Scam (smishing). Couriers don&rsquo;t ask for fees via a text link. Go to the official website directly instead.'},
          {s:'A full-screen pop-up: &ldquo;WARNING! Your PC is infected. Call Microsoft now on 0800&hellip;&rdquo;', scam:true, e:'Scam (tech-support scam). Microsoft never puts a phone number in a pop-up. Close the browser &mdash; never call.'},
          {s:'A colleague you were expecting a file from shares a document via your company Microsoft 365.', scam:false, e:'Genuine &mdash; expected, from a known person, on your real Microsoft 365. It&rsquo;s still fine to double-check if anything feels off.'},
          {s:'A caller claims to be your bank&rsquo;s fraud team and asks you to read your full PIN and move money to a &ldquo;safe account&rdquo;.', scam:true, e:'Scam. Banks NEVER ask for your full PIN or tell you to move money to a &ldquo;safe account&rdquo;. Hang up and call the number on your card.'},
          {s:'You click &ldquo;forgot password&rdquo; on a website and immediately receive a reset email from that site.', scam:false, e:'Genuine &mdash; you requested it and it arrived right away from the real site. (If you ever get one you did NOT request, ignore it.)'}
        ];
        var i=0, score=0;
        function show(step){ var s=root.querySelectorAll('.quiz__step'); for(var j=0;j<s.length;j++) s[j].classList.toggle('is-active', s[j].getAttribute('data-step')===step); }
        function render(){ var r=R[i]; document.getElementById('sc-count').textContent='ROUND '+(i+1)+' OF '+R.length; document.getElementById('sc-q').innerHTML=r.s; document.getElementById('sc-fb').innerHTML=''; document.getElementById('sc-opts').style.display='grid'; document.getElementById('sc-next').style.display='none'; }
        function answer(saidScam){ var r=R[i]; var ok=(saidScam===r.scam); if(ok) score++; document.getElementById('sc-opts').style.display='none'; document.getElementById('sc-fb').innerHTML='<p class="hc-bandlabel '+(ok?'hc--strong':'hc--risk')+'">'+(ok?'Correct':'Careful!')+'</p><p>'+r.e+'</p>'; var nx=document.getElementById('sc-next'); nx.style.display='inline-flex'; nx.innerHTML=(i<R.length-1)?'Next &rarr;':'See my score'; }
        function next(){ i++; if(i<R.length){ render(); } else { results(); show('result'); } }
        function results(){ var cls=score>=5?'hc--strong':score>=3?'hc--good':'hc--risk'; var band=score>=5?'Scam-savvy!':score>=3?'Not bad &mdash; stay sharp':'Worth brushing up'; document.getElementById('sc-result').innerHTML='<p class="tag">Your score</p><div class="hc-score '+cls+'"><span class="hc-score__num">'+score+'</span><span class="hc-score__den">/'+R.length+'</span></div><p class="hc-bandlabel '+cls+'">'+band+'</p><p>Scams are getting cleverer &mdash; when in doubt, stop and check. We protect our customers from this every day.</p><ul class="hc-actions"><li><a href="/cybersecurity-support/">Get protected with managed security &#8594;</a></li><li><a href="/phishing/">Learn the signs of phishing &#8594;</a></li><li><a href="/cybersecurity-checklist/">Our 10-step security checklist &#8594;</a></li></ul><div class="quiz__actions"><a href="/book-service/" class="button primary">Talk to us</a><a href="/it-health-check-tool/" class="button secondary">Free security health check</a></div>'; }
        document.getElementById('sc-opts').addEventListener('click',function(e){ var b=e.target.closest('[data-said]'); if(!b) return; answer(b.getAttribute('data-said')==='scam'); });
        document.getElementById('sc-next').addEventListener('click', next);
        document.getElementById('sc-restart').addEventListener('click',function(){ i=0; score=0; render(); show('q'); });
        render();
      })();
      </script>
    </section>'''

def spot_the_scam():
    slug = "spot-the-scam"
    desc = "Could you spot a scam? Take our free 6-round Spot the Scam quiz — real-looking emails, texts, pop-ups and calls — with instant plain-English explanations. Great for staying safe online, especially for older and less-confident users."
    faqs = [
      ("Who is the quiz for?", "Everyone &mdash; but it&rsquo;s especially helpful for older or less-confident users who are targeted most. It&rsquo;s friendly, quick and there&rsquo;s no sign-up."),
      ("Are the examples real scams?", "They&rsquo;re realistic, illustrative versions of the most common scams we see &mdash; phishing emails, smishing texts, pop-ups and phone scams &mdash; so you learn the tell-tale signs safely."),
      ("Can you protect us from scams for real?", "Yes &mdash; our <a href=\"/cybersecurity-support/\">managed cybersecurity</a> adds layered protection, email filtering and a real human to ask &lsquo;is this safe?&rsquo; whenever you&rsquo;re unsure."),
    ]
    content = "\n".join([
      hero(bc("Spot the Scam"), "// FREE QUIZ &middot; 2 MINUTES",
           'Could you <em class="grad grad--green">spot a scam?</em>',
           "Six real-looking emails, texts, pop-ups and phone calls &mdash; can you tell the scams from the genuine? Instant, friendly explanations after every round.",
           cta1=("Get Protected", "/cybersecurity-support/"), cta2=("Security Checklist", "/cybersecurity-checklist/"),
           chips=["No sign-up", "Plain English", "Great for all ages"]),
      SCAM_WIDGET,
      faq_html(faqs),
      cta("Worried about scams?",
          "We keep Dorset families and businesses safe online every day &mdash; with real protection and a friendly techie to ask.",
          primary=("Talk to a Techie", "/contact/"), secondary=("Free Health Check", "/it-health-check-tool/")),
    ])
    def schema(s, _d=desc, _f=faqs):
        return graph([crumb(s, "Spot the Scam"), webpage(s, "Spot the Scam Quiz", _d), faqpage(s, _f),
                      {"@type": "WebApplication", "name": "365 Techies Spot the Scam Quiz", "applicationCategory": "EducationalApplication",
                       "operatingSystem": "Web", "url": SITE + "/spot-the-scam/", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"}, "provider": {"@id": SITE + "/#business"}}])
    add(slug=slug, title="Spot the Scam Quiz — Can You Tell a Scam From the Real Thing? | 365 Techies",
        desc=desc, og_title="Spot the Scam Quiz | 365 Techies", schema=schema, content=content)
spot_the_scam()

# ===================================================== COVERAGE CHECKER
COVERAGE_WIDGET = '''    <section class="section section--alt" aria-label="Coverage checker">
      <div class="wrap">
        <div class="quiz" style="max-width:560px">
          <form id="cov" class="cov-form" novalidate>
            <label for="cov-in" class="quiz__q" style="font-size:1.3rem">Enter your postcode</label>
            <p class="mono" style="color:var(--faint);text-align:center;margin:.2rem 0 1rem">Just the first part is fine &mdash; e.g. BH9, DT1, SO40</p>
            <div class="cov-row">
              <input id="cov-in" name="postcode" type="text" autocomplete="postal-code" placeholder="Your postcode" aria-label="Postcode" />
              <button type="submit" class="button primary">Check</button>
            </div>
          </form>
          <div class="quiz__result" id="cov-result" style="margin-top:1.4rem;display:none"></div>
        </div>
      </div>
      <script>
      (function () {
        var f = document.getElementById('cov'); if (!f) return;
        var ON = {BH:'Bournemouth, Poole &amp; Christchurch', DT:'Dorchester, Weymouth &amp; west Dorset', SO:'Southampton &amp; the New Forest', SP:'Salisbury &amp; Fordingbridge', BA:'the north Somerset / Bath edge'};
        var AREA = {BH:'/it-support-bournemouth/', DT:'/it-support-dorchester/', SO:'/it-support-southampton/', SP:'/it-support-fordingbridge/'};
        function check(){
          var m=(document.getElementById('cov-in').value||'').toUpperCase().match(/[A-Z]{1,2}/);
          var pre=m?m[0]:'';
          var res=document.getElementById('cov-result'); res.style.display='block';
          if(!pre){ res.innerHTML='<p class="hc-bandlabel hc--good">Pop in your postcode</p><p>Enter the first part of your postcode (e.g. BH9, DT1, SO40) and we&rsquo;ll check.</p>'; return; }
          if(ON[pre]){ res.innerHTML='<p class="hc-bandlabel hc--strong">Yes &mdash; we cover you!</p><p>We provide on-site <strong>and</strong> remote IT support across '+ON[pre]+'. '+(AREA[pre]?'<a href="'+AREA[pre]+'">See local support &#8594;</a>':'')+'</p><div class="quiz__actions"><a href="/book-service/" class="button primary">Book a visit</a><a href="/contact/" class="button secondary">Contact us</a></div>'; }
          else { res.innerHTML='<p class="hc-bandlabel hc--good">We&rsquo;ve got you covered remotely</p><p>You&rsquo;re outside our on-site area, but we provide fast, secure <a href="/remote-it-support/">remote IT support</a> and fully managed plans right across the UK &amp; Europe &mdash; with the same friendly local team.</p><div class="quiz__actions"><a href="/remote-support/" class="button primary">Start remote support</a><a href="/it-support-uk-europe/" class="button secondary">UK &amp; Europe support</a></div>'; }
        }
        f.addEventListener('submit',function(e){ e.preventDefault(); check(); });
      })();
      </script>
    </section>'''

def coverage_checker():
    slug = "coverage-checker"
    desc = "Do we cover your area? Enter your postcode and instantly see whether 365 Techies offers on-site IT support near you across Dorset, the New Forest and Hampshire — plus full remote support everywhere else in the UK & Europe."
    faqs = [
      ("Which areas do you cover on-site?", "We cover Bournemouth, Poole, Christchurch and across Dorset, the New Forest and parts of Hampshire on-site. See our <a href=\"/areas-covered/\">areas covered</a> page for the full list."),
      ("What if I&rsquo;m outside your area?", "No problem &mdash; we provide fast, secure <a href=\"/remote-it-support/\">remote IT support</a> and fully managed monthly plans <a href=\"/it-support-uk-europe/\">across the UK and Europe</a>."),
      ("Is remote support as good as on-site?", "For most issues, yes &mdash; most problems are fixed remotely in minutes. We arrange on-site visits when hands-on help is genuinely needed."),
    ]
    content = "\n".join([
      hero(bc("Coverage Checker"), "// DO WE COVER YOU?",
           'Do we cover <em class="grad grad--cyan">your area?</em>',
           "Pop in your postcode to see instantly whether we offer on-site IT support near you &mdash; and rest assured we support homes and businesses remotely right across the UK and Europe too.",
           cta1=("See Areas Covered", "/areas-covered/"), cta2=("Remote Support", "/remote-it-support/"),
           chips=["Dorset &amp; New Forest", "Hampshire", "UK &amp; Europe remote"]),
      COVERAGE_WIDGET,
      faq_html(faqs),
      cta("Wherever you are, we can help",
          "On your doorstep or on the other side of the country &mdash; friendly, expert IT support is one click away.",
          primary=("Book a Service", "/book-service/"), secondary=("Contact Us", "/contact/")),
    ])
    def schema(s, _d=desc, _f=faqs):
        return graph([crumb(s, "Coverage Checker"), webpage(s, "Coverage Checker", _d), faqpage(s, _f)])
    add(slug=slug, title="Coverage Checker — Do We Cover Your Area? | 365 Techies",
        desc=desc, og_title="Coverage Checker | 365 Techies", schema=schema, content=content)
coverage_checker()

# ===================================================== FAULT CHECKER (repair triage)
FAULT_WIDGET = '''    <section class="section section--alt" aria-label="Computer fault checker">
      <div class="wrap">
        <div class="quiz" id="ff">
          <div class="quiz__step is-active" data-step="device">
            <p class="quiz__count mono">STEP 1 OF 2</p>
            <h2 class="quiz__q">What&rsquo;s playing up?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-next="symptom" data-set="device:Laptop">Laptop</button>
              <button type="button" class="quiz__opt" data-next="symptom" data-set="device:Desktop PC">Desktop PC</button>
              <button type="button" class="quiz__opt" data-next="symptom" data-set="device:Phone or tablet">Phone or tablet</button>
              <button type="button" class="quiz__opt" data-next="symptom" data-set="device:Printer">Printer</button>
              <button type="button" class="quiz__opt" data-next="symptom" data-set="device:Wi-Fi or internet">Wi-Fi / internet</button>
            </div>
          </div>
          <div class="quiz__step" data-step="symptom">
            <p class="quiz__count mono">STEP 2 OF 2</p>
            <h2 class="quiz__q">What&rsquo;s happening?</h2>
            <div class="quiz__opts">
              <button type="button" class="quiz__opt" data-next="result" data-set="sym:won">Won&rsquo;t turn on / no power</button>
              <button type="button" class="quiz__opt" data-next="result" data-set="sym:slow">Very slow</button>
              <button type="button" class="quiz__opt" data-next="result" data-set="sym:crash">Freezing or crashing</button>
              <button type="button" class="quiz__opt" data-next="result" data-set="sym:screen">Broken or cracked screen</button>
              <button type="button" class="quiz__opt" data-next="result" data-set="sym:net">Won&rsquo;t connect to the internet</button>
              <button type="button" class="quiz__opt" data-next="result" data-set="sym:virus">Pop-ups, viruses or a scam</button>
              <button type="button" class="quiz__opt" data-next="result" data-set="sym:files">Lost or deleted files</button>
              <button type="button" class="quiz__opt" data-next="result" data-set="sym:other">Something else</button>
            </div>
          </div>
          <div class="quiz__step" data-step="result"><div class="quiz__result" id="ff-result"></div></div>
          <div class="quiz__back"><button type="button" id="ff-restart">&larr; Start again</button></div>
        </div>
      </div>
      <script>
      (function () {
        var q = document.getElementById('ff'); if (!q) return;
        var a = {};
        function show(s){ var st=q.querySelectorAll('.quiz__step'); for(var i=0;i<st.length;i++) st[i].classList.toggle('is-active', st[i].getAttribute('data-step')===s); }
        var MAP = {
          won:{t:'Worth a proper diagnosis', a:'No power can be a charger, a battery or a hardware fault &mdash; often fixable, occasionally not, but a quick check tells you for sure. Diagnosis is free and it&rsquo;s no-fix-no-fee.', p:['Book a free collection','/book-a-collection/'], s:['Computer repairs','/computer-repairs/']},
          slow:{t:'Usually very fixable &mdash; rarely a new PC', a:'Slowness is normally clutter, pending updates or an ageing hard drive. Switching to an SSD can make an old laptop feel brand new. We&rsquo;ll tune it up, often remotely.', p:['Start remote support','/remote-support/'], s:['Why is my PC slow?','/why-is-my-computer-slow/']},
          crash:{t:'Let&rsquo;s pin down the cause', a:'Freezing and crashing can be software or failing hardware &mdash; a proper diagnosis finds which, so you don&rsquo;t replace a machine that just needed a fix.', p:['Book a repair','/computer-repairs/'], s:['Start remote support','/remote-support/']},
          screen:{t:'Cracked screens are very repairable', a:'A broken screen rarely means a new device. We&rsquo;ll quote the repair up front, with no-fix-no-fee and a 12-month warranty.', p:['Book a collection','/book-a-collection/'], s:['Computer repairs','/computer-repairs/']},
          net:{t:'Often the Wi-Fi, not the computer', a:'Connection problems are frequently the router or Wi-Fi rather than your device &mdash; and we can usually sort it remotely in minutes.', p:['Start remote support','/remote-support/'], s:['Wi-Fi support','/wifi-support/']},
          virus:{t:'Don&rsquo;t pay any pop-up &mdash; we&rsquo;ll sort it safely', a:'Never call a number in a pop-up or pay a &ldquo;fix&rdquo; fee. We&rsquo;ll safely remove the malware, check nothing was stolen and protect you against the next one.', p:['Get protected','/cybersecurity-support/'], s:['Start remote support','/remote-support/']},
          files:{t:'Act fast for the best recovery', a:'If files are lost, stop using the device &mdash; the sooner we look, the better the chance of getting them back. We&rsquo;ll attempt recovery and set up backups so it can&rsquo;t happen again.', p:['Book urgent help','/book-a-collection/'], s:['Backup &amp; recovery','/backup-support/']},
          other:{t:'Tell us what&rsquo;s up', a:'Whatever it is, a friendly local techie will take a look &mdash; no problem is too small, and the diagnosis is always free.', p:['Book a service','/book-service/'], s:['Contact us','/contact/']}
        };
        function result(){
          var r=MAP[a.sym]||MAP.other; var dev=a.device?(' with your '+a.device.toLowerCase()):'';
          document.getElementById('ff-result').innerHTML='<p class="tag">What we&rsquo;d suggest</p><h3>'+r.t+'</h3><p>The trouble'+dev+': '+r.a+'</p><div class="quiz__actions"><a href="'+r.p[1]+'" class="button primary">'+r.p[0]+'</a><a href="'+r.s[1]+'" class="button secondary">'+r.s[0]+'</a></div><p class="hc-disclaimer">We always diagnose first and quote before any work &mdash; no-fix-no-fee, a 12-month warranty on repairs, and we&rsquo;ll honestly tell you when a repair isn&rsquo;t worth it.</p>';
        }
        q.addEventListener('click',function(e){ var o=e.target.closest('.quiz__opt'); if(!o) return; var set=o.getAttribute('data-set').split(':'); a[set[0]]=set[1]; var n=o.getAttribute('data-next'); if(n==='result') result(); show(n); });
        document.getElementById('ff-restart').addEventListener('click',function(){ a={}; show('device'); });
      })();
      </script>
    </section>'''

def fault_checker():
    slug = "computer-fault-checker"
    desc = "Computer not working? Use our free fault checker — pick what's playing up and we'll tell you the likely cause, whether it's worth repairing, and the best next step. No-fix-no-fee, with honest repair-or-replace advice."
    faqs = [
      ("Is the fault checker free?", "Yes &mdash; it&rsquo;s a free, instant guide. And if you bring or send us the device, the diagnosis is free too, on a no-fix-no-fee basis."),
      ("Will you push me to replace a working device?", "Never. We&rsquo;ll always tell you honestly when a repair makes sense and when it doesn&rsquo;t &mdash; we&rsquo;d rather keep your trust than sell you a new machine you don&rsquo;t need."),
      ("Do you guarantee repairs?", "Yes &mdash; computer and laptop repairs come with a 12-month warranty, and there&rsquo;s no fee if we can&rsquo;t fix it. <a href=\"/our-guarantees/\">See our guarantees</a>."),
    ]
    content = "\n".join([
      hero(bc("Fault Checker"), "// FREE &middot; 20 SECONDS",
           'Computer playing up? <em class="grad grad--cyan">Let&rsquo;s diagnose it</em>',
           "Tell us what&rsquo;s happening and we&rsquo;ll point you to the likely cause, whether it&rsquo;s worth fixing, and the easiest next step &mdash; honestly, with no jargon and no pressure.",
           cta1=("Book a Collection", "/book-a-collection/"), cta2=("Computer Repairs", "/computer-repairs/"),
           chips=["No-fix-no-fee", "12-month warranty", "Honest advice"]),
      FAULT_WIDGET,
      faq_html(faqs),
      cta("Rather we just took a look?",
          "Pop it in, post it, or let us connect remotely &mdash; a friendly local techie will diagnose it free and quote before any work.",
          primary=("Book a Collection", "/book-a-collection/"), secondary=("Start Remote Support", "/remote-support/")),
    ])
    def schema(s, _d=desc, _f=faqs):
        return graph([crumb(s, "Fault Checker"), webpage(s, "Computer Fault Checker", _d), faqpage(s, _f),
                      {"@type": "WebApplication", "name": "365 Techies Computer Fault Checker", "applicationCategory": "UtilitiesApplication",
                       "operatingSystem": "Web", "url": SITE + "/computer-fault-checker/", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"}, "provider": {"@id": SITE + "/#business"}}])
    add(slug=slug, title="Computer Fault Checker — Diagnose Your PC, Laptop or Phone | 365 Techies",
        desc=desc, og_title="Computer Fault Checker | 365 Techies", schema=schema, content=content)
fault_checker()

# ===================================================== CASE STUDIES
def case_studies():
    slug = "case-studies"
    desc = "Real results for real customers — see how 365 Techies keeps homes and businesses across Dorset running with monthly IT support, security and fast remote help."
    cases = [
      dict(label="Café &amp; retail &middot; Poole", headline="From weekly downtime to basically never",
           outcome="Downtime: weekly &rarr; virtually zero",
           challenge="Frequent point-of-sale and Wi-Fi dropouts were interrupting trade and frustrating staff and customers.",
           did="We took over their IT on a monthly business plan with proactive monitoring, fixed the network and Wi-Fi, and put fast remote support in place.",
           result="Reliable trading every day, with problems caught before they cause downtime.",
           services=["Business plan","Network &amp; Wi-Fi","Proactive monitoring","Remote support"],
           quote="They manage all our point-of-sale and Wi-Fi now. Downtime went from a weekly headache to basically never. Worth every penny.",
           who="James T. &mdash; Business plan, Poole"),
      dict(label="Home worker &middot; teacher", headline="A laptop you can rely on, data always safe",
           outcome="100% of work backed up &amp; recoverable",
           challenge="An unreliable laptop and no proper backups were putting schoolwork and online assessments at risk.",
           did="We moved them onto a monthly home plan with regular servicing, security and automatic, verified backups &mdash; and we're always on the end of the phone.",
           result="A fast, dependable laptop that stays up to date, with everything safely backed up.",
           services=["Home plan","Verified backups","Security","Remote support"],
           quote="The service I get with 365 techies is amazing &mdash; always on the other end of the phone. Without them I wouldn't have a working laptop that is bang up to date with all data backed up.",
           who="Vince Jones &mdash; Home plan"),
      dict(label="Home user &middot; Bournemouth", headline="Rescued the night before a deadline",
           outcome="Back up and running by next morning",
           challenge="A laptop failed the evening before an important deadline, with no time to spare.",
           did="We connected remotely, diagnosed the fault and had the machine working again first thing the next morning.",
           result="Crisis averted &mdash; back up and running in time, with no lost work.",
           services=["Remote support","Emergency fix","Data safe"],
           quote="My laptop died the night before a deadline. One message to 365 Techies and it was running again first thing next morning. Absolutely unreal.",
           who="Maria L. &mdash; Home plan, Bournemouth"),
      dict(label="Long-standing client &middot; Dorset", headline="Trusted, hands-off IT for nearly 20 years",
           outcome="Nearly two decades of dependable support",
           challenge="A long-term customer wanted reliable, proactive IT they simply never had to think about &mdash; year after year.",
           did="Monthly remote checks, maintenance, updates and a fully inclusive support service, with the same friendly team on hand throughout.",
           result="Two decades of dependable, proactive support &mdash; technology that just keeps working.",
           services=["Monthly support","Remote checks","Maintenance"],
           quote="I have benefited from the help of the guys at 365 for most of twenty years. Their monthly remote checks&hellip; 365 offer a fully inclusive service. Thank you.",
           who="David Hagner &mdash; Long-term customer"),
      dict(label="Ongoing maintenance &middot; Dorset", headline="Laptops checked &amp; virus-free, every month",
           outcome="Updated &amp; virus-free, every single month",
           challenge="The customer wanted peace of mind that their laptops stayed updated, secure and virus-free without having to manage it themselves.",
           did="A monthly plan with regular maintenance, software updates, security checks and antivirus &mdash; all handled quietly in the background.",
           result="Reliably maintained, virus-free laptops and complete peace of mind for a simple monthly fee.",
           services=["Monthly plan","Updates","Antivirus","Maintenance"],
           quote="A friendly team, there to help when needed. Nice to know that our laptops are being regularly checked for updates and kept virus free. Worth the monthly fee.",
           who="Alan Bevis &mdash; Monthly plan"),
      dict(label="Off-grid &middot; campervan", headline="Power for life on the road, off the grid",
           outcome="Reliable power anywhere, no hook-up",
           challenge="A couple converting a campervan needed reliable power for the fridge, lights, laptops and devices &mdash; anywhere, with no hook-up.",
           did="We designed and fitted a Victron Energy system: solar, a lithium battery bank, an inverter and DC-DC charging, with VRM remote monitoring so we can check it from afar.",
           result="Dependable off-grid power wherever they park &mdash; and a system we can monitor and support remotely.",
           services=["Victron Energy","Solar &amp; battery","VRM monitoring"],
           quote="", who=""),
    ]
    def _ckind(l):
        l = l.lower()
        if 'business' in l or 'caf' in l or 'retail' in l: return 'Business'
        if 'home' in l: return 'Home'
        return 'Specialist'
    cards = "\n".join(f'''        <article class="case" data-reveal data-kind="{_ckind(c['label'])}">
          <p class="case__tag mono">{c['label']}</p>
          <h3>{c['headline']}</h3>
          <p class="case__outcome">&#10003; {c['outcome']}</p>
          <div class="case__grid">
            <div><h4>Challenge</h4><p>{c['challenge']}</p></div>
            <div><h4>What we did</h4><p>{c['did']}</p></div>
            <div><h4>Result</h4><p>{c['result']}</p></div>
          </div>
          <div class="case__services">{''.join('<span>' + s + '</span>' for s in c['services'])}</div>
          {('<blockquote>&ldquo;' + c['quote'] + '&rdquo;<cite>' + c['who'] + '</cite></blockquote>') if c['quote'] else ''}
        </article>''' for c in cases)
    content = "\n".join([
      hero(bc("Case Studies"), "// REAL RESULTS",
           'Real results for <em class="grad grad--cyan">real customers</em>',
           "See how monthly IT support from 365 Techies keeps homes and businesses across Dorset running smoothly — fewer problems, faster fixes and total peace of mind. Every quote below is a genuine Google review.",
           cta1=("View Monthly Plans", "/monthly-it-support/"), cta2=("Read Google Reviews", "/reviews/"),
           chips=["Rated 4.9 on Google","Homes &amp; businesses","30+ years' experience"]),
      '''    <section class="stats section--alt" aria-label="By the numbers">
      <div class="stats__grid">
        <div class="stat" data-reveal><p class="stat__value"><span class="stat-num" data-count="4.9" data-decimals="1">0</span></p><p class="stat__label mono">GOOGLE RATING</p></div>
        <div class="stat" data-reveal><p class="stat__value"><span class="stat-num" data-count="51">0</span><span class="stat__suffix">+</span></p><p class="stat__label mono">GOOGLE REVIEWS</p></div>
        <div class="stat" data-reveal><p class="stat__value"><span class="stat-num" data-count="30">0</span><span class="stat__suffix">+ yrs</span></p><p class="stat__label mono">SINCE 1995</p></div>
        <div class="stat" data-reveal><p class="stat__value"><span class="stat-num" data-count="6">0</span><span class="stat__suffix">wk</span></p><p class="stat__label mono">SERVICE CYCLE</p></div>
      </div>
    </section>''',
      '''    <section class="section" style="padding-bottom:0" aria-label="Filter case studies">
      <div class="wrap wrap--narrow">
        <div class="hub-filter" id="case-filter">
          <button type="button" class="hub-chip is-active" data-filter="all">All stories</button>
          <button type="button" class="hub-chip" data-filter="Home">Home</button>
          <button type="button" class="hub-chip" data-filter="Business">Business</button>
          <button type="button" class="hub-chip" data-filter="Specialist">Specialist</button>
        </div>
      </div>
    </section>''',
      f'''    <section class="section" style="padding-top:1.4rem" aria-label="Case studies">
      <div class="wrap wrap--narrow" id="case-grid">
{cards}
      </div>
    </section>''',
      '''    <script>
    (function(){
      var f=document.getElementById('case-filter'); if(!f) return;
      var items=[].slice.call(document.querySelectorAll('#case-grid .case'));
      f.addEventListener('click',function(e){
        var b=e.target.closest('.hub-chip'); if(!b) return;
        var v=b.getAttribute('data-filter');
        f.querySelectorAll('.hub-chip').forEach(function(x){x.classList.toggle('is-active',x===b);});
        items.forEach(function(c){ c.style.display=(v==='all'||c.getAttribute('data-kind')===v)?'':'none'; });
      });
    })();
    </script>''',
      f'''    <section class="section section--alt" aria-label="Share your story">
      <div class="wrap">
        <div class="repairs__card" data-reveal style="border-color:rgba(56,189,248,0.4)">
          <div>
            <p class="eyebrow mono">// YOUR STORY HERE</p>
            <h2 class="repairs__title">Are you a happy customer?</h2>
            <p class="lede">We&rsquo;d love to feature your experience. Leave us a Google review, or get in touch to be one of our next case studies &mdash; we&rsquo;re proud of the difference we make.</p>
          </div>
          <a href="/reviews/" class="button primary">Read &amp; leave reviews</a>
        </div>
      </div>
    </section>''',
      cta("Could your IT run this smoothly?",
          "Join the Dorset homes and businesses who never worry about technology. Pick a plan or book a free IT health check.",
          primary=("View Monthly Plans", "/monthly-it-support/"), secondary=("Free IT Health Check", "/free-it-health-check/")),
    ])
    def schema(s, _desc=desc):
        return graph([crumb(s, "Case Studies"), webpage(s, "Customer Case Studies", _desc, "CollectionPage")])
    add(slug=slug, title="Customer Case Studies | 365 Techies",
        desc=desc, og_title="Customer Case Studies | 365 Techies", schema=schema, content=content)
case_studies()

# ===================================================== OFF-GRID & VICTRON ENERGY
def off_grid():
    slug = "off-grid-victron-energy"
    desc = "Off-grid and backup power built on Victron Energy — design, supply, install and remote monitoring of solar, battery storage and inverters for homes, businesses, campervans and motorhomes across Dorset."
    faqs = [
      ("Do you install campervan and motorhome power systems?", "Yes — we design, supply and fit 12V solar, lithium batteries, inverters and DC-DC charging for campervans and motorhomes, all built on Victron Energy equipment."),
      ("What is Victron Energy?", "Victron Energy is a leading manufacturer of off-grid and mobile power equipment — inverters, solar charge controllers, batteries and monitoring — trusted worldwide for reliability."),
      ("Can I monitor my system remotely?", "Yes. We set up Victron's VRM remote monitoring so you and we can check performance, battery levels and faults from anywhere — a natural fit for an IT and monitoring company."),
      ("Do you cover homes and businesses, not just vehicles?", "Absolutely — from whole-home off-grid and backup power to business energy resilience and garden-office power, as well as campervans, motorhomes and boats."),
    ]
    content = "\n".join([
      hero(bc("Off-Grid & Victron Energy"), "// OFF-GRID POWER",
           'Off-grid &amp; <em class="grad grad--green">Victron energy</em> solutions',
           "Reliable off-grid and backup power for homes, businesses, campervans and motorhomes — designed, supplied, installed and remotely monitored, built on trusted Victron Energy equipment. Proud members of Sustainable Dorset.",
           cta1=("Get a Free Energy Consultation", "/contact/"), cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["Victron Energy systems","Solar &amp; battery storage","Remote monitoring (VRM)"]),
      f'''    <section class="section" aria-label="Overview">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — WHAT IT IS</p>
          <h2 class="section-title" data-title>Your own power, wherever you are<span class="title-underline"></span></h2>
          <p>An off-grid system generates, stores and manages your own electricity — solar panels, batteries and inverters working together so you have power even with no mains connection, or when the grid goes down.</p>
          <p>We build these around <strong>Victron Energy</strong>, the gold standard for off-grid and mobile power. And because we&rsquo;re an IT and monitoring company at heart, we set up <strong>remote monitoring</strong> so your system can be checked and fine-tuned from anywhere.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["System design &amp; sizing","Victron inverters &amp; chargers","MPPT solar charge controllers","Lithium battery storage","Battery monitoring (BMV)","Cerbo GX &amp; VRM monitoring","Shore power &amp; DC-DC charging","Ongoing support &amp; maintenance"])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="Who we power">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — WHO WE POWER</p>
          <h2 class="section-title section-title--center" data-title>Off-grid power for every setting<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("home","Homes","Off-grid living, or whole-home backup for when the grid goes down."),("briefcase","Businesses","Energy resilience and backup power that keeps you trading — and cuts bills."),("van","Campervans","12V solar, lithium and inverter systems built for van life."),("van","Motorhomes","Dependable power for everything you run on the road."),("server","Garden offices &amp; outbuildings","Power where there&rsquo;s no mains — studios, cabins and sheds."),("shield","Boats &amp; marine","Reliable, well-monitored power out on the water.")])}
        </div>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="What we do">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — WHAT WE DO</p>
          <h2 class="section-title section-title--center" data-title>Designed, installed and monitored<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("Design &amp; sizing","We size your system to how you actually use power — no guesswork, no overspend."),("Genuine Victron kit","Inverters, MPPT solar chargers, lithium batteries and GX monitoring from Victron Energy."),("Install &amp; commission","Professional installation and proper commissioning, so it simply works."),("Remote monitoring","Victron VRM lets us watch and fine-tune your system from anywhere — our speciality."),("Maintenance &amp; support","Ongoing checks, fault-finding and upgrades to keep you powered."),("Cut bills &amp; carbon","Use more of your own clean energy and rely less on the grid or the generator.")])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="Sustainability">
      <div class="wrap wrap--narrow" style="text-align:center">
        <p class="eyebrow eyebrow--center mono" data-reveal>// SUSTAINABILITY</p>
        <h2 class="section-title section-title--center" data-title>Proud members of Sustainable Dorset<span class="title-underline title-underline--center"></span></h2>
        <p class="lede lede--center" data-reveal>Helping homes and businesses across Dorset generate, store and use their own clean energy is something we genuinely care about. We&rsquo;re proud members of <a href="https://www.sustainabledorset.org/" target="_blank" rel="noopener" style="color:var(--cyan)">Sustainable Dorset</a>, supporting a greener, more resilient county.</p>
        <div class="partner-badges" style="justify-content:center;margin-top:1.6rem" data-reveal>
          <span class="partner-badge partner-badge--green">{ico("leaf","")}Sustainable Dorset Member</span>
          <span class="partner-badge">{ico("battery","")}Victron Energy Systems</span>
          <span class="partner-badge partner-badge--green">{ico("sun","")}Solar &amp; Battery Storage</span>
        </div>
      </div>
    </section>''',
      f'''    <section class="how" aria-label="How it works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/04 — HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>From idea to powered up<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("Free consultation","Tell us how you live or work and how you want to use power. No pressure, no jargon."),("Design &amp; quote","We design and size the right Victron system and give you a clear, fixed quote."),("Install &amp; monitor","We install, commission and set up remote monitoring — then keep an eye on it for you.")])}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Power your world, off the grid",
          "Whether it&rsquo;s a campervan, a home or a business, let&rsquo;s design the right Victron energy system for you. Book a free, no-obligation consultation.",
          primary=("Get a Free Consultation", "/contact/"), secondary=("Call 01202 775566", "tel:+441202775566")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "Off-Grid & Victron Energy"), webpage(s, "Off-Grid & Victron Energy Solutions", _desc),
                      service(s, "Off-Grid & Victron Energy Solutions", "Off-grid and backup power — solar, battery storage, inverters and remote monitoring built on Victron Energy for homes, businesses, campervans and motorhomes.", "Off-grid power and solar"),
                      faqpage(s, _faqs)])
    add(slug=slug, title="Off-Grid & Victron Energy Solutions | Homes, Business & Campervans | 365 Techies",
        desc=desc, og_title="Off-Grid & Victron Energy Solutions | 365 Techies", schema=schema, content=content)
off_grid()

# ===================================================== WEBSITE DESIGN, HOSTING & EMAIL
def web_design():
    slug = "web-design-hosting"
    desc = "Premium website design, fast managed hosting and professional business email for homes and businesses across Dorset. Hosting powered by SiteGround — free SSL, daily backups, UK data centre and expert support."
    faqs = [
      ("Do you design and build websites?", "Yes — we design and build fast, modern, mobile-friendly websites for sole traders and small businesses, then host, secure and look after them for you."),
      ("Where are the websites hosted?", "On premium infrastructure powered by SiteGround — ultrafast cloud hosting with free SSL, daily backups, a global CDN and a UK data centre, all managed by us."),
      ("Can you set up professional business email?", "Yes — we set up email on your own domain (you@yourbusiness.co.uk) or Microsoft 365, with spam protection and configuration on all your devices."),
      ("Do you look after the website after launch?", "Absolutely — our premium plan includes managed hosting, updates, security, backups and support, so your site stays fast, safe and online."),
    ]
    content = "\n".join([
      hero(bc("Website Design & Hosting"), "// PREMIUM SERVICE",
           'Website design, hosting &amp; <em class="grad grad--cyan">business email</em>',
           "A premium, done-for-you service: we design and build your website, host it on fast, secure infrastructure, set up professional email on your domain — and look after all of it, so you never have to think about it.",
           cta1=("Get a Website Quote", "/contact/"), cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["Designed &amp; built for you","Fast managed hosting","Business email included"]),
      f'''    <section class="section" aria-label="Overview">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — DONE FOR YOU</p>
          <h2 class="section-title" data-title>Your website, handled end to end<span class="title-underline"></span></h2>
          <p>A great website should win you work, not become another thing to manage. We design and build yours, then host it, secure it and keep it updated — all under one friendly, local roof.</p>
          <p><strong>It&rsquo;s a premium, fully-managed service.</strong> You get the website, the hosting, the email and the ongoing care, with the same people who look after your IT.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Bespoke website design","Mobile-friendly &amp; fast","Managed web hosting","Free SSL certificate","Daily backups","Business email accounts","Domain names &amp; DNS","Ongoing updates &amp; care"])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="Hosting">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — PREMIUM HOSTING</p>
          <h2 class="section-title section-title--center" data-title>Fast, secure hosting powered by SiteGround<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>We host on premium, award-winning infrastructure from SiteGround — then manage every bit of it for you.</p>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("Ultrafast cloud hosting","Built on premium Google Cloud infrastructure for fast, reliable websites."),("Free SSL &amp; HTTPS","Every site secured with a free SSL certificate as standard."),("Daily backups","Automatic daily backups, so your website can always be restored."),("Security &amp; anti-malware","AI anti-bot, web application firewall and malware protection built in."),("UK data centre &amp; CDN","Fast load times in the UK, with a global CDN for visitors everywhere."),("Managed &amp; monitored","We handle updates, monitoring and 24/7-backed support, so you don&rsquo;t have to.")])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="Business email">
      <div class="wrap split-2 split-2--flip">
        <ul class="checklist" data-stagger>
{checklist(["Email on your own domain","Microsoft 365 or hosted email","Spam &amp; phishing protection","Set up on all your devices","Shared mailboxes &amp; aliases","Migration from old email"])}
        </ul>
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/03 — PROFESSIONAL EMAIL</p>
          <h2 class="section-title" data-title>Email that matches your brand<span class="title-underline"></span></h2>
          <p>Ditch the generic address. We set up professional email on your own domain &mdash; <strong>you@yourbusiness.co.uk</strong> &mdash; with spam protection and everything configured across your computer, phone and tablet.</p>
          <p>Prefer Microsoft 365? We do that too, and it&rsquo;s fully covered by our IT support plans.</p>
        </div>
      </div>
    </section>''',
      f'''    <section class="how section--alt" aria-label="How it works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/04 — HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>From idea to live in four steps<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("Design","We learn your business and design a site that looks great and works hard."),("Build &amp; launch","We build it, set up hosting, SSL, email and your domain, and go live."),("Host &amp; secure","Fast managed hosting with backups, security and updates handled for you."),("Look after","Ongoing care and changes whenever you need them — just ask.")])}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Ready for a website that works as hard as you do?",
          "Get a friendly, no-obligation quote for website design, hosting and business email — all looked after by your local IT team.",
          primary=("Get a Website Quote", "/contact/"), secondary=("Call 01202 775566", "tel:+441202775566")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "Website Design & Hosting"), webpage(s, "Website Design, Hosting & Business Email", _desc),
                      service(s, "Website Design, Hosting & Email", "Premium website design, managed hosting (powered by SiteGround) and professional business email for small businesses across Dorset.", "Website design and hosting"),
                      faqpage(s, _faqs)])
    add(slug=slug, title="Website Design, Hosting & Business Email | Premium Service | 365 Techies",
        desc=desc, og_title="Website Design, Hosting & Email | 365 Techies", schema=schema, content=content)
web_design()

# ===================================================== SERVICES OVERVIEW
def services_overview():
    slug = "services"
    desc = "All the services 365 Techies provides — monthly IT support for homes and businesses, Microsoft 365, cybersecurity, computer repairs, off-grid Victron energy and premium website design, hosting and email across Dorset."
    groups = [
      ("Monthly IT support", [
        ("Monthly IT Support", "/monthly-it-support/", "Subscription IT support with regular maintenance, security checks and unlimited remote help."),
        ("Preventative Maintenance", "/preventative-maintenance/", "A full computer service every 6 weeks &mdash; tune-up, software &amp; driver updates, security and backup checks."),
        ("Home IT Support", "/home-it-support-subscriptions/", "Friendly monthly computer support for homes, families and home workers."),
        ("Business IT Support", "/business-it-support-subscriptions/", "Reliable monthly IT support for sole traders and small businesses."),
        ("Home Support Plans", "/home-it-support-plans/", "Essential, Family and Premium home plans from &pound;15.95/month."),
        ("Business Support Plans", "/business-it-support-plans/", "Starter, Standard and Premium plans that scale with your team."),
        ("Plan Finder", "/plan-finder/", "Answer three quick questions and we&rsquo;ll recommend the right plan."),
      ]),
      ("Core IT services", [
        ("Remote IT Support", "/remote-it-support/", "Fast, secure online help &mdash; most problems fixed in minutes."),
        ("Microsoft 365", "/microsoft-365-support/", "Outlook, Teams, OneDrive, SharePoint, licensing and migration."),
        ("Cybersecurity", "/cybersecurity-support/", "Protection from scams, malware, ransomware and phishing."),
        ("Malwarebytes Premium &amp; VPN", "/malwarebytes-premium/", "Award-winning Malwarebytes Premium with VPN, set up and managed by us &mdash; safe online 24/7."),
        ("Computer Repairs", "/computer-repairs/", "Laptop and PC repairs, virus removal, upgrades and setup."),
        ("Dell Laptops &amp; Desktops", "/dell-hardware/", "Genuine Dell Latitude laptops and OptiPlex desktops, supplied, set up and supported."),
        ("Custom-Built PCs", "/custom-pc-builds/", "Bespoke desktops for home, gaming, creative and business &mdash; built, tested and supported."),
        ("AMD Threadripper Workstations", "/threadripper-workstations/", "High-end Scan 3XS Threadripper workstations for video, 3D, CAD and AI &mdash; supplied &amp; supported."),
        ("Gaming PCs", "/gaming-pcs/", "As an NVIDIA partner, custom GeForce RTX gaming PCs &mdash; built, set up &amp; supported."),
        ("Content Creator PCs &amp; Laptops", "/content-creator-pcs/", "NVIDIA Studio PCs and laptops for video, photo, design, music and 3D."),
        ("Cyber Essentials Help", "/cyber-essentials/", "Get Cyber Essentials certified with friendly, practical, guided help."),
        ("Disaster Recovery", "/disaster-recovery/", "Verified backups, ransomware rollback and rapid recovery to keep your business running."),
        ("GDPR &amp; IT Compliance", "/gdpr-it-compliance/", "Practical data security, access control and policies to meet your obligations."),
      ]),
      ("Specialist help", [
        ("Windows 11 Support", "/windows-11-support/", "Upgrades, compatibility checks, performance fixes and setup."),
        ("Email Support", "/email-support/", "Outlook, Microsoft 365 and business email, sorted."),
        ("Wi-Fi Support", "/wifi-support/", "Whole-home and office Wi-Fi, with dead zones fixed."),
        ("Printer Support", "/printer-support/", "Wi-Fi printing, offline errors, drivers and scanning."),
        ("Backup &amp; Recovery", "/backup-support/", "Automatic, verified backups and data recovery."),
        ("New Computer Setup", "/new-computer-setup/", "New PCs set up properly, with your files moved across."),
        ("Mobile &amp; Tablet Support", "/mobile-tablet-support/", "Android and Samsung phones and tablets &mdash; email, backups, security and setup."),
        ("Server &amp; Network Support", "/server-network-support/", "Servers, NAS, networks and firewalls, designed and maintained."),
        ("Cloud Migration", "/cloud-migration/", "Move email, files and systems to the cloud with no downtime."),
        ("Google Workspace", "/google-workspace-support/", "Gmail, Drive, Docs and Meet, set up, secured and supported."),
      ]),
      ("Beyond IT support", [
        ("Off-Grid &amp; Victron Energy", "/off-grid-victron-energy/", "Solar, battery storage and inverters for homes, businesses, campervans and motorhomes."),
        ("Website Design &amp; Hosting", "/web-design-hosting/", "Premium websites, fast managed hosting and business email."),
        ("Agentic AI Systems", "/agentic-ai-systems/", "Custom-built agentic AI operating systems that automate and streamline your business-specific processes."),
        ("AI Training &amp; Adoption", "/ai-training/", "Practical training to get safe, real value from Copilot, ChatGPT and AI tools."),
        ("VoIP Business Phones", "/voip-business-phones/", "Business phone systems powered by Voipfone &mdash; lower bills, work-from-anywhere calls, set up &amp; supported."),
        ("CCTV &amp; Smart Home", "/cctv-smart-home/", "CCTV, video doorbells, smart lighting and home automation, set up and secured."),
        ("Home Cinema &amp; Entertainment", "/home-cinema-entertainment/", "Richer Sounds partner &mdash; 4K projectors, Dolby sound, smart TVs and multi-room audio."),
        ("Starlink Internet", "/starlink-internet/", "Residential &amp; roaming Starlink satellite broadband &mdash; fast internet anywhere, supplied &amp; installed."),
        ("Unitree Robots", "/unitree-robots/", "As a Scan partner, we supply &amp; support Unitree quadruped and humanoid robots."),
      ]),
      ("IT support by industry", [
        ("Accountants", "/it-support-for-accountants/", "Secure, reliable IT for accountancy practices, especially through busy season."),
        ("Solicitors &amp; Law Firms", "/it-support-for-solicitors/", "Confidential, compliant IT for legal practices."),
        ("Care Homes", "/it-support-for-care-homes/", "Always-on, secure IT for round-the-clock care settings."),
        ("Charities", "/it-support-for-charities/", "Affordable IT and nonprofit grants for charities and non-profits."),
        ("Dental &amp; Medical", "/it-support-for-dental-medical/", "Compliant, reliable IT for dental and medical practices."),
        ("Estate Agents", "/it-support-for-estate-agents/", "Portals, CRM and mobile working for estate and letting agents."),
        ("Retail &amp; Hospitality", "/it-support-for-retail-hospitality/", "EPOS, payments, Wi-Fi and bookings kept running."),
        ("Tradespeople", "/it-support-for-tradespeople/", "Mobile-first IT for trades and construction."),
        ("Schools &amp; Education", "/it-support-for-education/", "Safe, reliable IT for schools, nurseries and colleges."),
      ]),
    ]
    sections = ""
    items = []
    pos = 1
    for gtitle, cards in groups:
        cells = ""
        for name, url, d in cards:
            cells += (f'          <a class="post-card" href="{url}"><h3>{name}</h3>'
                      f'<p>{d}</p><span class="post-card__more">Learn more &#8594;</span></a>\n')
            items.append({"@type": "ListItem", "position": pos, "name": name.replace("&amp;", "&"), "url": SITE + url})
            pos += 1
        sections += (f'      <div class="blog-cat-head" data-reveal><h2>{gtitle}</h2></div>\n'
                     f'      <div class="blog-grid" data-stagger>\n{cells}      </div>\n')
    content = "\n".join([
      hero(bc("Services"), "// EVERYTHING WE DO",
           'Everything <em class="grad grad--cyan">365 Techies</em> does',
           "From monthly IT support for homes and businesses to Microsoft 365, cybersecurity and repairs — plus off-grid Victron energy and premium website design, hosting and email. One friendly, local team for it all.",
           cta1=("View Monthly Plans", "/monthly-it-support/"), cta2=("Book a Service", "/book-service/"),
           chips=["Homes &amp; businesses","Across Dorset","One trusted team"]),
      f'''    <section class="blog-section" aria-label="All services">
      <div class="wrap">
{sections}      </div>
    </section>''',
      cta("Not sure what you need?",
          "Tell us what you&rsquo;re after and a friendly techie will point you the right way — or try our 30-second Plan Finder.",
          primary=("Try the Plan Finder", "/plan-finder/"), secondary=("Contact Us", "/contact/")),
    ])
    def schema(s, _desc=desc, _items=items):
        return graph([crumb(s, "Services"), webpage(s, "Our Services", _desc, "CollectionPage"),
                      {"@type": "ItemList", "@id": SITE + "/services/#list", "itemListElement": _items}])
    add(slug=slug, title="Our Services | IT Support, Energy & Web Design | 365 Techies",
        desc=desc, og_title="Our Services | 365 Techies", schema=schema, content=content)
services_overview()

# ===================================================== DELL HARDWARE
def dell_hardware():
    slug = "dell-hardware"
    desc = "Dell specialists supplying and supporting genuine Dell Latitude laptops and OptiPlex desktops for homes and businesses across Dorset — expertly specced, fully set up and looked after on a support plan."
    faqs = [
      ("Do you supply Dell to home users as well as businesses?", "Yes — we supply and support Dell Latitude laptops and OptiPlex desktops for both home users and businesses across Bournemouth, Poole and Dorset."),
      ("Why Dell Latitude and OptiPlex rather than a cheaper laptop?", "They're business-grade — better built, more reliable, more secure and longer-lasting than typical consumer machines, with proper warranties. We spec the right one so you don't overpay or under-buy."),
      ("Do you set the computer up for me?", "Yes — every machine we supply is fully set up: Windows, Microsoft 365, security, backups and your data transferred, ready to use from day one."),
      ("Do you handle the warranty and ongoing support?", "Yes — we look after Dell warranty matters and keep your machine running on a monthly support plan, with remote monitoring and maintenance."),
    ]
    content = "\n".join([
      hero(bc("Dell Hardware"), "// DELL SPECIALISTS",
           'Dell Latitude laptops &amp; <em class="grad grad--cyan">OptiPlex desktops</em>',
           "We specialise in supplying and supporting genuine Dell business-grade computers — Latitude laptops and OptiPlex desktops — for homes and businesses across Dorset. Expertly specced, fully set up, and looked after on a support plan.",
           cta1=("Get a Dell Quote", "/contact/"), cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["Dell Latitude laptops","Dell OptiPlex desktops","Supplied, set up &amp; supported"]),
      f'''    <section class="section" aria-label="Why Dell">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — WHY DELL</p>
          <h2 class="section-title" data-title>Business-grade Dell, done properly<span class="title-underline"></span></h2>
          <p>There&rsquo;s a world of difference between a throwaway high-street laptop and a Dell Latitude or OptiPlex. The business range is built to work hard for years — better components, stronger security and proper warranties.</p>
          <p><strong>As Dell specialists, we spec the right machine for the job</strong>, supply it, set it up properly and keep it running — so you get exactly what you need and nothing you don&rsquo;t.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Business-grade build quality","Reliable for years, not months","Strong manufacturer warranty","Better security (TPM, encryption)","Consistent, standardised models","Genuine Dell from specialists","Spec&rsquo;d for your real needs","Fully set up and supported"])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="What we supply">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — WHAT WE SUPPLY</p>
          <h2 class="section-title section-title--center" data-title>Dell, and everything around it<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("monitor","Dell Latitude laptops","Premium business laptops — light, tough, secure and reliable for work anywhere."),("server","Dell OptiPlex desktops","Dependable business desktops for the home office or the whole team."),("battery","Monitors, docks &amp; accessories","Dell monitors, docking stations and accessories for the perfect setup."),("shield","Warranty &amp; protection","We handle warranties and add the security and backups that matter."),("home","Home setups","The right Dell machine for home, set up properly and ready to go."),("briefcase","Business fleets","Standardised Latitude and OptiPlex fleets, onboarded and managed.")])}
        </div>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="Home and business solutions">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — HOME &amp; BUSINESS</p>
          <h2 class="section-title section-title--center" data-title>The right Dell, whoever you are<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="split-2">
          <div class="tile" data-reveal>
            <h3>Dell for your home</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">A Latitude laptop for the kitchen table or an OptiPlex desktop for the study — we help you choose the right Dell, set it up with everything you need and support it on a home plan.</p>
            <ul class="checklist">
{checklist(["Expert advice on the right model","Files &amp; email moved across","Microsoft 365, security &amp; backups","Ongoing home support plan"])}
            </ul>
          </div>
          <div class="tile" data-reveal>
            <h3>Dell for your business</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">From a single workstation to a whole team, we supply standardised Dell Latitude and OptiPlex setups, onboard new starters, and manage and support them under a business plan.</p>
            <ul class="checklist">
{checklist(["Standardised business-grade fleet","New-starter setups &amp; onboarding","Microsoft 365, security &amp; backups","Managed &amp; monitored on a plan"])}
            </ul>
          </div>
        </div>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="The ultimate setup">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/04 — THE ULTIMATE SETUP</p>
          <h2 class="section-title section-title--center" data-title>Every Dell we supply comes fully sorted<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("Properly configured","Windows, drivers and updates set up right from day one."),("Microsoft 365 ready","Email, Teams and OneDrive configured and signed in."),("Secured","Antivirus, encryption and sensible security switched on."),("Backed up","Automatic, verified backups so your data is safe."),("Data transferred","Files, photos and settings moved from your old machine."),("Monitored &amp; supported","Looked after under a monthly plan — we watch it remotely.")])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="how" aria-label="How it works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/05 — HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>From advice to fully supported<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("We advise","Tell us how you work and we&rsquo;ll recommend the right Dell Latitude or OptiPlex."),("We supply &amp; set up","We source genuine Dell and configure it fully — Microsoft 365, security and backups."),("We support","Your Dell is looked after on a support plan, monitored and maintained remotely.")])}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Get the right Dell, set up right",
          "Talk to your local Dell specialists about Latitude laptops and OptiPlex desktops for your home or business.",
          primary=("Get a Dell Quote", "/contact/"), secondary=("Call 01202 775566", "tel:+441202775566")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "Dell Hardware"), webpage(s, "Dell Latitude Laptops & OptiPlex Desktops", _desc),
                      service(s, "Dell Hardware Supply & Support", "Supply, setup and support of genuine Dell Latitude laptops and OptiPlex desktops for homes and businesses across Dorset.", "Dell hardware supply and support"),
                      {"@type": "Product", "@id": SITE + "/" + s + "/#product", "name": "Dell Latitude Laptops & OptiPlex Desktops", "description": "Genuine Dell business-grade laptops and desktops, supplied, configured and supported by 365 Techies.", "brand": {"@type": "Brand", "name": "Dell"}, "category": "Computer hardware", "image": SITE + "/og-image.jpg", "url": SITE + "/" + s + "/"},
                      faqpage(s, _faqs)])
    add(slug=slug, title="Dell Latitude Laptops & OptiPlex Desktops | Supply & Support | 365 Techies",
        desc=desc, og_title="Dell Latitude & OptiPlex | 365 Techies", schema=schema, content=content)
dell_hardware()

# ===================================================== MALWAREBYTES
def malwarebytes():
    slug = "malwarebytes-premium"
    desc = "365 Techies is a Malwarebytes Partner. We set up and manage Malwarebytes Premium with VPN for homes and businesses across Dorset — award-winning protection against malware, ransomware and online threats, keeping you safe online 24/7."
    faqs = [
      ("Are you really a Malwarebytes partner?", "Yes — 365 Techies is a Malwarebytes Partner, so we can supply, set up and manage Malwarebytes Premium for our home and business customers and look after it on your support plan."),
      ("What does Malwarebytes Premium actually protect against?", "Malware, ransomware, viruses, spyware, malicious and scam websites, and zero-day exploits. It works alongside Windows to stop threats before they take hold, with real-time protection running quietly in the background."),
      ("What is the VPN for?", "The VPN encrypts your internet connection so your browsing stays private — especially important on public Wi-Fi in cafés, hotels and airports. It hides your activity from prying eyes and helps keep your data and identity safe."),
      ("Do you set it up and keep an eye on it?", "Yes — we install and configure Malwarebytes Premium on your devices, make sure it&rsquo;s working correctly, and monitor and maintain it as part of your monthly support plan, so you&rsquo;re protected 24/7 without lifting a finger."),
      ("Can I protect the whole family or team?", "Absolutely — we can protect multiple devices across your household or business, including Windows computers, laptops and Android devices, all managed by us."),
    ]
    content = "\n".join([
      hero(bc("Malwarebytes Premium"), "// MALWAREBYTES PARTNER",
           'Malwarebytes Premium <em class="grad grad--cyan">with VPN</em>',
           "As a Malwarebytes Partner, we set up and manage award-winning Malwarebytes Premium &amp; VPN for homes and businesses across Dorset &mdash; powerful protection against malware, ransomware and online scams, keeping you safe online 24/7.",
           cta1=("Get Protected", "/contact/"), cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["Official Malwarebytes Partner","Premium + VPN included","Set up &amp; managed by us"]),
      f'''    <section class="section" aria-label="Why Malwarebytes">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — WHY MALWAREBYTES</p>
          <h2 class="section-title" data-title>Award-winning protection, managed for you<span class="title-underline"></span></h2>
          <p>The threats are relentless &mdash; ransomware, scam websites, dodgy downloads and phishing all aimed at your money and your data. Free antivirus rarely keeps up.</p>
          <p><strong>As a Malwarebytes Partner</strong>, we supply Malwarebytes Premium &amp; VPN, set it up properly on your devices and keep it running &mdash; so you get genuine, modern protection that&rsquo;s actually looked after, not left to lapse.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Official Malwarebytes Partner","Premium real-time protection","Built-in private VPN","Stops malware &amp; ransomware","Blocks scam &amp; phishing sites","Set up on all your devices","Monitored on your support plan","Protected online 24/7"])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="What you get">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — WHAT YOU GET</p>
          <h2 class="section-title section-title--center" data-title>Complete protection, online and off<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("shield","Real-time malware protection","Blocks viruses, malware, spyware and ransomware before they can take hold."),("bug","Ransomware defence","Stops ransomware from locking up your files and holding them to ransom."),("globe","Private VPN","Encrypts your connection so your browsing stays private &mdash; even on public Wi-Fi."),("eye","Web &amp; scam protection","Blocks malicious, scam and phishing websites the moment you click."),("bolt","Zero-day protection","Guards against brand-new threats that traditional antivirus misses."),("clock","24/7 peace of mind","Always-on protection, monitored and maintained by us on your plan.")])}
        </div>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="Home and business protection">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — HOME &amp; BUSINESS</p>
          <h2 class="section-title section-title--center" data-title>Keeping everyone safe online<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="split-2">
          <div class="tile" data-reveal>
            <h3>Malwarebytes for your home</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">Protect the whole family across laptops, desktops, tablets and phones. We set up Malwarebytes Premium &amp; VPN on every device and keep it running so the kids, the banking and the photos all stay safe.</p>
            <ul class="checklist">
{checklist(["Premium &amp; VPN on every device","Safe browsing for the whole family","Private VPN for public Wi-Fi","Looked after on a home plan"])}
            </ul>
          </div>
          <div class="tile" data-reveal>
            <h3>Malwarebytes for your business</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">Protect your team, your data and your reputation. We roll out and centrally manage Malwarebytes across your business, with VPN for staff working remotely or on the move.</p>
            <ul class="checklist">
{checklist(["Business-grade endpoint protection","VPN for remote &amp; mobile staff","Centrally managed &amp; monitored","Part of your business support plan"])}
            </ul>
          </div>
        </div>
      </div>
    </section>''',
      f'''    <section class="how" aria-label="How it works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/04 — HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>Protected in three simple steps<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("We set it up","We supply Malwarebytes Premium &amp; VPN and install it correctly on all your devices."),("We protect you","Real-time protection and the VPN keep your devices and browsing safe, day and night."),("We keep watch","We monitor and maintain it on your support plan, so you stay protected 24/7.")])}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Stay safe online with Malwarebytes",
          "Talk to your local Malwarebytes Partner about Premium &amp; VPN protection for your home or business.",
          primary=("Get Protected", "/contact/"), secondary=("Call 01202 775566", "tel:+441202775566")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "Malwarebytes Premium"), webpage(s, "Malwarebytes Premium with VPN", _desc),
                      service(s, "Malwarebytes Premium & VPN", "Supply, setup and management of Malwarebytes Premium with VPN for homes and businesses across Dorset, keeping customers safe online 24/7.", "Managed cybersecurity and online protection"),
                      faqpage(s, _faqs)])
    add(slug=slug, title="Malwarebytes Premium with VPN | Malwarebytes Partner | 365 Techies",
        desc=desc, og_title="Malwarebytes Premium with VPN | 365 Techies", schema=schema, content=content)
malwarebytes()

# ===================================================== BACKUP & RECOVERY
def backup_recovery():
    slug = "backup-support"
    desc = "Automatic, verified backup and rapid data recovery for homes and businesses across Dorset — photos, documents, whole computers and Microsoft 365 protected with a proper 3-2-1 backup, safe from failure, theft and ransomware."
    faqs = [
      ("Do I need backups if I use OneDrive?", "Yes &mdash; cloud sync isn&rsquo;t the same as backup. If a file is deleted, corrupted or encrypted by ransomware, OneDrive simply syncs that change everywhere. We set up proper, separate backups, including for Microsoft 365, which Microsoft does not back up for you."),
      ("What is a 3-2-1 backup?", "It&rsquo;s the gold standard: <strong>3</strong> copies of your data, on <strong>2</strong> different types of media, with <strong>1</strong> copy kept off-site. It means a single failure, theft or ransomware attack can never wipe out everything &mdash; and it&rsquo;s exactly how we set you up."),
      ("Can you recover deleted or lost files?", "Often, yes &mdash; even without a backup in some cases. Stop using the device immediately and contact us straight away; the sooner we act, the better the chance of recovery."),
      ("Are your backups safe from ransomware?", "Yes &mdash; we use protected, versioned and off-site backups so that even if ransomware hits, your clean copies can&rsquo;t be encrypted or deleted, and we can roll back to before the attack. It pairs with our <a href=\"/cybersecurity-support/\">cybersecurity</a> protection."),
      ("How often are backups checked?", "On a monthly plan we monitor and verify your backups regularly &mdash; because an untested backup isn&rsquo;t a backup. You&rsquo;ll know it will actually restore when it matters."),
      ("Can you back up our whole business?", "Yes &mdash; computers, servers, Microsoft 365, email and shared files, all backed up, monitored and recoverable, as part of a business support plan."),
    ]
    content = "\n".join([
      hero(bc("Backup &amp; Recovery"), "// BACKUP &amp; RECOVERY",
           'Never lose a thing, <em class="grad grad--green">ever</em>',
           "Hard drives fail, laptops get lost and ransomware can lock away everything in seconds. We set up automatic, verified backups for your photos, documents and business data &mdash; and get you back up and running fast when the worst happens.",
           cta1=("Protect My Data", "/contact/"), cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["Automatic &amp; verified","3-2-1 protected","Ransomware-safe"]),
      f'''    <section class="section" aria-label="Why it matters">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — WHY IT MATTERS</p>
          <h2 class="section-title" data-title>A backup you&rsquo;ve never tested isn&rsquo;t a backup<span class="title-underline"></span></h2>
          <p>Most people only think about backups the day after they needed one. By then the photos, the accounts, the years of work &mdash; they&rsquo;re simply gone.</p>
          <p><strong>We set up automatic, verified backups</strong> that run quietly in the background and that we check regularly &mdash; so your data is genuinely safe from failure, theft, accidents and ransomware.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Automatic, hands-off backups","Secure off-site cloud copies","Microsoft 365 &amp; email backup","Whole-computer image backups","Photos &amp; documents protected","Ransomware-safe &amp; versioned","Regularly verified &amp; monitored","Fast file &amp; disaster recovery"])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="The 3-2-1 approach">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — THE 3-2-1 RULE</p>
          <h2 class="section-title section-title--center" data-title>The gold standard for backups<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>One backup in one place isn&rsquo;t enough. We protect your data the way the professionals do.</p>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("3 copies of your data","Your live data plus at least two backups &mdash; so a single failure is never a disaster."),("2 types of media","Stored in two different places, such as a local drive and the cloud, for real resilience."),("1 copy off-site","At least one secure, off-site copy &mdash; safe from theft, fire, flood and ransomware.")])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="What we back up">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — WHAT WE BACK UP</p>
          <h2 class="section-title section-title--center" data-title>Everything that matters<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("home","Photos &amp; memories","Irreplaceable family photos and videos, safely backed up off-site."),("mail","Email &amp; Microsoft 365","Outlook, Exchange Online, OneDrive and SharePoint &mdash; backed up properly."),("monitor","Whole computers","Full system images so a dead PC can be rebuilt exactly as it was."),("briefcase","Business data","Records, accounts, shared files and servers &mdash; protected and recoverable."),("shield","Ransomware-safe copies","Versioned, protected backups that ransomware can&rsquo;t encrypt or delete."),("cloud","Secure cloud storage","Encrypted off-site copies you can restore from anywhere.")])}
        </div>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="Home and business backup">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/04 — HOME &amp; BUSINESS</p>
          <h2 class="section-title section-title--center" data-title>Protection that fits you<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="split-2">
          <div class="tile" data-reveal>
            <h3>Backup for your home</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">Protect a lifetime of photos, documents and memories. We set up automatic backups across your computers and devices and quietly keep an eye on them for you.</p>
            <ul class="checklist">
{checklist(["Automatic photo &amp; file backup","Secure off-site cloud copies","Microsoft 365 &amp; email included","Easy recovery when you need it"])}
            </ul>
          </div>
          <div class="tile" data-reveal>
            <h3>Backup for your business</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">Downtime and data loss cost real money. We back up computers, servers, email and shared files, monitor it all, and can get you operational again fast after any disaster.</p>
            <ul class="checklist">
{checklist(["Computers, servers &amp; Microsoft 365","Monitored &amp; verified backups","Ransomware rollback","Rapid disaster recovery"])}
            </ul>
          </div>
        </div>
      </div>
    </section>''',
      f'''    <section class="how" aria-label="If disaster strikes">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/05 — IF DISASTER STRIKES</p>
        <h2 class="section-title section-title--center" data-title>Lost it? We&rsquo;ll get it back<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("Stop &amp; call us","Ring 01202 775566 straight away &mdash; the sooner we act, the more we can recover."),("We recover","We restore your files, your system or your whole setup from a verified backup."),("We harden","We strengthen your backups so the same thing can never catch you out again.")])}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Protect what you can&rsquo;t replace",
          "Get automatic, verified, ransomware-safe backups set up and monitored by your local team &mdash; included in every monthly plan.",
          primary=("Protect My Data", "/contact/"), secondary=("View Monthly Plans", "/monthly-it-support/")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "Backup & Recovery"), webpage(s, "Backup & Recovery", _desc),
                      service(s, "Backup & Recovery", "Automatic, verified backup and data recovery for homes and businesses across Dorset, protecting against failure, theft and ransomware.", "Data backup and recovery"),
                      faqpage(s, _faqs)])
    add(slug=slug, title="Backup & Data Recovery for Homes & Businesses | 365 Techies",
        desc=desc, og_title="Backup & Data Recovery | 365 Techies", schema=schema, content=content)
backup_recovery()

# ===================================================== AGENTIC AI SYSTEMS
def agentic_systems():
    slug = "agentic-ai-systems"
    desc = "We custom-build agentic AI operating systems for companies across Dorset and beyond — intelligent AI agents that run your business-specific processes end to end, automating repetitive work, connecting your tools and streamlining how your business actually operates."
    faqs = [
      ("What is an agentic operating system?", "It&rsquo;s a custom-built layer of intelligent AI agents that run your specific business processes &mdash; understanding your tools, making decisions within the rules you set, and carrying out multi-step tasks from start to finish, with your team firmly in control."),
      ("Is this just a chatbot?", "No. A chatbot answers questions; an agentic system does the work &mdash; it connects to your systems, follows your processes, takes real actions and hands off to a human whenever it should."),
      ("Will it work with the tools we already use?", "Yes &mdash; we build around your existing tools (Microsoft 365, your CRM, email, spreadsheets and line-of-business apps) rather than forcing you to rip everything out and start again."),
      ("Is our data safe?", "Yes &mdash; security and privacy come first. We design with human-in-the-loop oversight, sensible guardrails and your data kept firmly under your control. It builds on our <a href=\"/cybersecurity-support/\">cybersecurity</a> approach."),
      ("Do we need to be technical?", "Not at all &mdash; we handle the design, the build, the integration and the training, and support it on an ongoing basis, all explained in plain English."),
      ("How do we get started?", "It starts with a discovery call. We map one or two of your most time-consuming, business-specific processes, then design and build a custom agentic system around them."),
    ]
    content = "\n".join([
      hero(bc("Agentic AI Systems"), "// AGENTIC AI SYSTEMS",
           'Custom <em class="grad grad--cyan">agentic operating systems</em>',
           "We design and build bespoke agentic AI systems that run your business&rsquo;s specific processes end to end &mdash; intelligent agents that work alongside your team, automating the repetitive, connecting your tools, and freeing your people to do what actually matters.",
           cta1=("Book a Discovery Call", "/contact/"), cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["Custom-built for you","Process-specific","Human-in-the-loop"]),
      f'''    <section class="section" aria-label="What it is">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — WHAT IT IS</p>
          <h2 class="section-title" data-title>Software that works the way you do<span class="title-underline"></span></h2>
          <p>Most software makes you fit your business around it. An agentic operating system is the opposite &mdash; we build it around <em>your</em> processes, your tools and your way of working.</p>
          <p><strong>Intelligent AI agents do the repetitive, multi-step work</strong> &mdash; reading, deciding, acting and connecting your systems &mdash; while your team stays firmly in control and free to focus on the work that genuinely needs a human.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Built around your processes","Works with your existing tools","Automates repetitive, multi-step work","Connects your systems together","Human-in-the-loop oversight","Secure &amp; private by design","Plain-English &amp; fully supported","You own it"])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="What we build">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — WHAT WE BUILD</p>
          <h2 class="section-title section-title--center" data-title>Agents that do the work<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("robot","Custom AI agents","Agents trained on your processes that carry out real, multi-step tasks &mdash; not just answer questions."),("flow","Process automation","End-to-end automation of the repetitive workflows that quietly eat your team&rsquo;s time."),("server","System integration","We connect Microsoft 365, your CRM, email, spreadsheets and line-of-business apps."),("mail","Inbox &amp; admin handling","Triage, draft, route and log &mdash; the everyday admin handled for you."),("monitor","Dashboards &amp; oversight","Clear visibility and human approval points, so you&rsquo;re always in control."),("spark","Bespoke AI tools","Custom assistants and tools built for the jobs only your business has.")])}
        </div>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="Where it makes a difference">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — WHERE IT MAKES A DIFFERENCE</p>
          <h2 class="section-title section-title--center" data-title>Real work, streamlined<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("Sales &amp; quoting","Generate quotes, follow up leads and keep your CRM up to date automatically."),("Customer service","Triage and draft responses, log tickets and surface the right information instantly."),("Admin &amp; operations","Data entry, scheduling, reporting and the repetitive back-office work, handled."),("Finance &amp; invoicing","Chase invoices, reconcile records and prepare reports without the manual slog."),("Onboarding","Set up new customers or staff consistently, every time, with nothing missed."),("Document workflows","Read, summarise, extract and file documents at a speed no team can match.")])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="how section--alt" aria-label="How we build it">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/04 — HOW WE BUILD IT</p>
        <h2 class="section-title section-title--center" data-title>From process to production<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("Discover","We map your most time-consuming, business-specific processes together."),("Design &amp; build","We build a custom agentic system around them, with the right guardrails."),("Integrate","We connect it to your existing tools and your team, with human approval where it matters."),("Refine &amp; support","We measure, refine and support it as it learns and your business grows.")])}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Build your agentic operating system",
          "Tell us about a process that&rsquo;s eating your team&rsquo;s time, and we&rsquo;ll show you what a custom agentic system could do for your business.",
          primary=("Book a Discovery Call", "/contact/"), secondary=("Call 01202 775566", "tel:+441202775566")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "Agentic AI Systems"), webpage(s, "Custom Agentic AI Operating Systems", _desc),
                      service(s, "Agentic AI Systems", "Custom-built agentic AI operating systems that automate and streamline business-specific processes for companies.", "Agentic AI systems and business automation"),
                      faqpage(s, _faqs)])
    add(slug=slug, title="Agentic AI Systems | Custom-Built Agentic Operating Systems | 365 Techies",
        desc=desc, og_title="Custom Agentic AI Systems | 365 Techies", schema=schema, content=content)
agentic_systems()

# ===================================================== UNITREE ROBOTS
def unitree_robots():
    slug = "unitree-robots"
    desc = "As a Scan partner, 365 Techies supplies, sets up and supports the full range of Unitree advanced robots — agile quadruped robot dogs (Go2, B2, A2) and cutting-edge humanoids (G1, H1, H2) — for research, education, industry and innovators."
    faqs = [
      ("Can you really supply Unitree robots?", "Yes &mdash; we&rsquo;re a Scan partner, so we can supply the full Unitree range, from Go2 quadrupeds to G1 and H1 humanoids, with expert advice and ongoing support."),
      ("What&rsquo;s the difference between the quadruped and humanoid robots?", "Quadrupeds (&lsquo;robot dogs&rsquo; like Go2 and B2) excel at mobility, inspection and rugged terrain; humanoids (like G1 and H1) are built for research into human-like movement, manipulation and embodied AI."),
      ("Who are these robots for?", "Researchers, universities, educators, industrial and security operators, and developers &mdash; anyone exploring robotics and AI."),
      ("Do you help set them up and develop on them?", "Yes &mdash; we set up the robot, prepare the SDK and development environment, and provide ongoing support. It pairs naturally with our <a href=\"/agentic-ai-systems/\">agentic AI</a> and <a href=\"/ai-training/\">AI training</a> services."),
      ("How do I get a price?", "Get in touch and we&rsquo;ll provide a quote through our Scan partnership for the model you need."),
    ]
    content = "\n".join([
      hero(bc("Unitree Robots"), "// SCAN PARTNER &middot; UNITREE ROBOTS",
           'Unitree <em class="grad grad--cyan">robots</em>',
           "As a Scan partner, we supply, set up and support the full range of Unitree advanced robots &mdash; agile quadruped &lsquo;robot dogs&rsquo; and cutting-edge humanoids &mdash; for research, education, industry and innovators across Dorset and beyond.",
           cta1=("Enquire About Unitree", "/contact/"), cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["Official Scan partner","Quadrupeds &amp; humanoids","Supplied &amp; supported"]),
      f'''    <section class="section section--alt" aria-label="Unitree robots showcase">
      <div class="wrap">
        <div class="split-2">
          <div class="tile robot-card" data-reveal>
            <svg class="robot-svg robot-svg--quad" viewBox="0 0 420 260" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of a Unitree quadruped robot dog">
              <defs><linearGradient id="qgrad" x1="60" y1="60" x2="360" y2="210" gradientUnits="userSpaceOnUse"><stop stop-color="#1d97e3"/><stop offset="1" stop-color="#00ce1b"/></linearGradient></defs>
              <ellipse cx="210" cy="238" rx="150" ry="14" fill="#1d97e3" opacity="0.12"/>
              <g stroke="#1d97e3" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.5" fill="none"><path d="M298 150 l20 42 l-12 38"/><path d="M150 150 l-16 44 l16 36"/></g>
              <g stroke="url(#qgrad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M284 152 l24 40 l-8 40"/><path d="M136 152 l-22 42 l12 38"/></g>
              <g fill="#0b1226" stroke="url(#qgrad)" stroke-width="3"><circle cx="300" cy="234" r="6"/><circle cx="146" cy="232" r="6"/></g>
              <rect x="118" y="92" width="192" height="66" rx="28" fill="#0e1830" stroke="url(#qgrad)" stroke-width="3.5"/>
              <path d="M150 113 h118" stroke="#1d97e3" stroke-width="2" opacity="0.4"/>
              <circle cx="160" cy="126" r="4" fill="#00ce1b"/>
              <rect x="196" y="73" width="42" height="20" rx="8" fill="#0e1830" stroke="url(#qgrad)" stroke-width="3"/>
              <circle cx="217" cy="83" r="4" fill="#1d97e3"/>
              <path d="M300 99 l46 -8 a11 11 0 0 1 13 11 l0 24 a11 11 0 0 1 -13 11 l-46 -6 z" fill="#0e1830" stroke="url(#qgrad)" stroke-width="3.5"/>
              <circle cx="344" cy="116" r="7" fill="#1d97e3"/><circle cx="344" cy="116" r="13" fill="#1d97e3" opacity="0.25"/>
            </svg>
            <h3>Quadruped robots</h3>
            <p>Agile, all-terrain &lsquo;robot dogs&rsquo; like the Unitree Go2 and B2 &mdash; built for inspection, research and real-world mobility.</p>
          </div>
          <div class="tile robot-card" data-reveal>
            <svg class="robot-svg robot-svg--tall" viewBox="0 0 240 380" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of a Unitree humanoid robot">
              <defs><linearGradient id="hgrad" x1="40" y1="40" x2="200" y2="360" gradientUnits="userSpaceOnUse"><stop stop-color="#1d97e3"/><stop offset="1" stop-color="#00ce1b"/></linearGradient></defs>
              <ellipse cx="120" cy="366" rx="78" ry="11" fill="#1d97e3" opacity="0.12"/>
              <g stroke="url(#hgrad)" stroke-width="14" stroke-linecap="round" fill="none"><path d="M102 232 l-7 118"/><path d="M138 232 l7 118"/></g>
              <g fill="#0e1830" stroke="url(#hgrad)" stroke-width="3"><rect x="72" y="350" width="38" height="15" rx="5"/><rect x="130" y="350" width="38" height="15" rx="5"/></g>
              <g stroke="url(#hgrad)" stroke-width="12" stroke-linecap="round" fill="none" opacity="0.9"><path d="M72 152 l-28 70"/><path d="M168 152 l28 70"/></g>
              <g fill="#0e1830" stroke="url(#hgrad)" stroke-width="3"><circle cx="42" cy="228" r="8"/><circle cx="198" cy="228" r="8"/></g>
              <rect x="74" y="126" width="92" height="114" rx="26" fill="#0e1830" stroke="url(#hgrad)" stroke-width="3.5"/>
              <path d="M96 150 h48" stroke="#00ce1b" stroke-width="2.5" opacity="0.6"/>
              <circle cx="120" cy="180" r="13" fill="#1d97e3"/><circle cx="120" cy="180" r="22" fill="#1d97e3" opacity="0.2"/>
              <rect x="110" y="106" width="20" height="24" rx="6" fill="#0e1830" stroke="url(#hgrad)" stroke-width="3"/>
              <rect x="84" y="58" width="72" height="56" rx="20" fill="#0e1830" stroke="url(#hgrad)" stroke-width="3.5"/>
              <rect x="98" y="76" width="44" height="18" rx="9" fill="#1d97e3"/><rect x="98" y="76" width="44" height="18" rx="9" fill="#1d97e3" opacity="0.3"/>
            </svg>
            <h3>Humanoid robots</h3>
            <p>Next-generation humanoids like the Unitree G1 and H1 &mdash; built for AI research, manipulation and embodied intelligence.</p>
          </div>
        </div>
        <p class="lede lede--center" style="margin-top:1.6rem;font-size:.9rem;color:var(--faint)" data-reveal>Illustrative graphics &mdash; ask us for official product photos and specs for any model.</p>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="What is Unitree">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — WORLD-LEADING ROBOTS</p>
          <h2 class="section-title" data-title>Cutting-edge robots, supplied locally<span class="title-underline"></span></h2>
          <p>Unitree Robotics has become one of the world&rsquo;s leading makers of advanced quadruped and humanoid robots &mdash; combining powerful AI, real-time SLAM navigation and open development platforms (SDKs).</p>
          <p><strong>As a Scan partner, 365 Techies can supply, set up and support the full Unitree range</strong> &mdash; giving researchers, educators, businesses and innovators a friendly, local route to genuine Unitree hardware. You can <a href="https://www.scan.co.uk/shop-by-brand/unitree" target="_blank" rel="noopener">browse the range at Scan</a>, then talk to us about the right model and partner pricing.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Official Scan partner","Genuine Unitree hardware","Quadrupeds &amp; humanoids","Expert model advice","Setup &amp; SDK onboarding","Integration support","Ongoing local support","Research, education &amp; industry"])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="Quadruped robots">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — QUADRUPED ROBOTS</p>
          <h2 class="section-title section-title--center" data-title>Agile &lsquo;robot dogs&rsquo;<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("robot","Go2 &amp; Go2-W","Next-gen quadrupeds with advanced AI, real-time SLAM navigation and an open SDK. The Go2-W adds a wheel-leg hybrid drive &mdash; ideal for developers and researchers."),("shield","B2 &amp; B2-W","Heavy-duty quadrupeds with high-performance actuators and superior mobility for industrial, commercial and research use. B2-W adds wheel-leg capability."),("eye","A2","Industrial quadruped built for rugged terrain, autonomous inspections and mission-critical operations, with modular sensors and high payload."),("bolt","AS2 — coming soon","A compact industrial quadruped with enhanced payload and autonomy.")])}
        </div>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="Humanoid robots">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — HUMANOID ROBOTS</p>
          <h2 class="section-title section-title--center" data-title>Next-generation humanoids<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("robot","R1","Compact humanoid with 3D LiDAR, AI-powered voice interaction and dual robotic arms &mdash; built for research and education."),("cpu","G1","Research-focused humanoid with precise limb control, dynamic balance and an open SDK for AI development."),("spark","H1 &amp; H1-2","Next-generation humanoids for cutting-edge research, AI development and real-world applications."),("flow","H2","Advanced humanoid emphasising mobility, intelligence and real-world adaptability for embodied AI research.")])}
        </div>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="Where they are used">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/04 — WHERE THEY&rsquo;RE USED</p>
          <h2 class="section-title section-title--center" data-title>Built for real-world work<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("Research &amp; universities","Open SDKs and advanced platforms for robotics and AI research."),("Education &amp; STEM","Inspiring, hands-on robots for teaching robotics, coding and AI."),("Industrial inspection","Autonomous inspections across rugged and hazardous sites."),("Security &amp; logistics","Patrol, monitoring and material-handling applications."),("Healthcare &amp; innovation","Emerging assistive and service-robotics use cases."),("Developers &amp; innovators","Build on open platforms with full SDK access.")])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="Why buy through us">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/05 — WHY BUY THROUGH US</p>
          <h2 class="section-title section-title--center" data-title>More than a box of robot<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="split-2">
          <div class="tile" data-reveal>
            <h3>Bought right</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">As a Scan partner, we help you choose the right Unitree model at the right price, properly specced for what you want to achieve.</p>
            <ul class="checklist">
{checklist(["Official Scan partner","Expert model advice","Partner pricing","Genuine Unitree hardware"])}
            </ul>
          </div>
          <div class="tile" data-reveal>
            <h3>Set up &amp; supported</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">We don&rsquo;t just sell a box &mdash; we set it up, get your development environment ready, and support it with the same care as the rest of your IT.</p>
            <ul class="checklist">
{checklist(["Setup &amp; onboarding","SDK &amp; dev environment","Integration with your systems","Ongoing local support"])}
            </ul>
          </div>
        </div>
      </div>
    </section>''',
      f'''    <section class="how section--alt" aria-label="How it works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/06 — HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>From idea to up-and-running<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("We advise","Tell us your goal &mdash; research, education, inspection or innovation &mdash; and we&rsquo;ll recommend the right Unitree model."),("We supply","As a Scan partner we source genuine Unitree hardware and get it to you."),("We set up &amp; support","We set it up, prepare the SDK and tools, and support it ongoing.")])}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Bring a Unitree robot to life",
          "Tell us what you want to achieve and we&rsquo;ll recommend, supply and support the right Unitree robot &mdash; with friendly, local expertise.",
          primary=("Enquire About Unitree", "/contact/"), secondary=("Browse at Scan", "https://www.scan.co.uk/shop-by-brand/unitree")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "Unitree Robots"), webpage(s, "Unitree Robots", _desc),
                      service(s, "Unitree Robot Supply & Support", "Supply, setup and support of Unitree quadruped and humanoid robots as a Scan partner, for research, education, industry and innovators.", "Robotics supply and support"),
                      faqpage(s, _faqs)])
    add(slug=slug, title="Unitree Robots | Quadruped & Humanoid Robots | Scan Partner | 365 Techies",
        desc=desc, og_title="Unitree Robots | 365 Techies", schema=schema, content=content)
unitree_robots()

# ===================================================== HARDWARE ILLUSTRATIONS
WORKSTATION_SVG = '''<svg class="robot-svg robot-svg--tower" viewBox="0 0 240 320" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of an AMD Threadripper workstation tower">
  <defs><linearGradient id="wsg" x1="60" y1="40" x2="180" y2="300" gradientUnits="userSpaceOnUse"><stop stop-color="#1d97e3"/><stop offset="1" stop-color="#00ce1b"/></linearGradient></defs>
  <ellipse cx="120" cy="306" rx="86" ry="10" fill="#1d97e3" opacity="0.12"/>
  <rect x="60" y="34" width="120" height="258" rx="16" fill="#0e1830" stroke="url(#wsg)" stroke-width="3.5"/>
  <g stroke="#1d97e3" stroke-width="2.4" stroke-linecap="round" opacity="0.45"><path d="M78 50h60"/><path d="M78 58h60"/><path d="M78 66h44"/></g>
  <circle cx="152" cy="62" r="4.5" fill="#00ce1b"/><circle cx="152" cy="62" r="9" fill="#00ce1b" opacity="0.25"/>
  <rect x="76" y="92" width="88" height="168" rx="10" fill="#0a1226" stroke="url(#wsg)" stroke-width="2.5"/>
  <rect x="86" y="120" width="68" height="18" rx="4" fill="url(#wsg)" opacity="0.85"/>
  <g stroke="url(#wsg)" stroke-width="2.5" fill="none"><circle cx="104" cy="186" r="16"/><circle cx="140" cy="186" r="16"/><circle cx="104" cy="224" r="16"/><circle cx="140" cy="224" r="16"/></g>
  <circle cx="104" cy="186" r="3" fill="#1d97e3"/><circle cx="140" cy="186" r="3" fill="#1d97e3"/><circle cx="104" cy="224" r="3" fill="#00ce1b"/><circle cx="140" cy="224" r="3" fill="#00ce1b"/>
  <g fill="#0a1226" stroke="url(#wsg)" stroke-width="2"><rect x="82" y="272" width="18" height="7" rx="2"/><rect x="106" y="272" width="10" height="7" rx="2"/></g>
</svg>'''

GAMING_SVG = '''<svg class="robot-svg robot-svg--tower" viewBox="0 0 240 320" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of an NVIDIA-powered gaming PC tower">
  <defs><linearGradient id="gmg" x1="60" y1="40" x2="180" y2="300" gradientUnits="userSpaceOnUse"><stop stop-color="#1d97e3"/><stop offset="0.5" stop-color="#9b5cff"/><stop offset="1" stop-color="#00ce1b"/></linearGradient></defs>
  <ellipse cx="120" cy="306" rx="86" ry="10" fill="#9b5cff" opacity="0.16"/>
  <rect x="60" y="34" width="120" height="258" rx="16" fill="#0e1830" stroke="url(#gmg)" stroke-width="3.5"/>
  <circle cx="150" cy="58" r="4.5" fill="#00ce1b"/><circle cx="150" cy="58" r="9" fill="#00ce1b" opacity="0.25"/>
  <rect x="74" y="64" width="92" height="204" rx="10" fill="#0a1226" stroke="url(#gmg)" stroke-width="2.5"/>
  <rect x="84" y="92" width="72" height="20" rx="4" fill="url(#gmg)"/>
  <rect x="84" y="92" width="72" height="20" rx="4" fill="#9b5cff" opacity="0.25"/>
  <g stroke-width="2.6" fill="none"><circle cx="120" cy="150" r="18" stroke="#1d97e3"/><circle cx="120" cy="192" r="18" stroke="#9b5cff"/><circle cx="120" cy="234" r="18" stroke="#00ce1b"/></g>
  <circle cx="120" cy="150" r="3.5" fill="#1d97e3"/><circle cx="120" cy="192" r="3.5" fill="#9b5cff"/><circle cx="120" cy="234" r="3.5" fill="#00ce1b"/>
</svg>'''

GPU_SVG = '''<svg class="robot-svg robot-svg--gpu" viewBox="0 0 320 170" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of an NVIDIA GeForce RTX graphics card">
  <defs><linearGradient id="gpug" x1="20" y1="20" x2="300" y2="150" gradientUnits="userSpaceOnUse"><stop stop-color="#1d97e3"/><stop offset="1" stop-color="#00ce1b"/></linearGradient></defs>
  <ellipse cx="160" cy="158" rx="130" ry="9" fill="#1d97e3" opacity="0.12"/>
  <rect x="30" y="32" width="260" height="94" rx="12" fill="#0e1830" stroke="url(#gpug)" stroke-width="3.5"/>
  <g stroke="url(#gpug)" stroke-width="2.6" fill="none"><circle cx="102" cy="79" r="34"/><circle cx="212" cy="79" r="34"/></g>
  <g stroke="url(#gpug)" stroke-width="1.4" opacity="0.5"><path d="M102 79 82 63M102 79 122 63M102 79 86 97M102 79 120 97"/><path d="M212 79 192 63M212 79 232 63M212 79 196 97M212 79 228 97"/></g>
  <circle cx="102" cy="79" r="5" fill="#1d97e3"/><circle cx="212" cy="79" r="5" fill="#00ce1b"/>
  <rect x="30" y="118" width="58" height="20" rx="3" fill="#0a1226" stroke="url(#gpug)" stroke-width="2.5"/>
  <g fill="#0a1226" stroke="url(#gpug)" stroke-width="2"><rect x="288" y="44" width="14" height="10" rx="2"/><rect x="288" y="62" width="14" height="10" rx="2"/></g>
</svg>'''

LAPTOP_SVG = '''<svg class="robot-svg robot-svg--gpu" viewBox="0 0 320 210" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of a content-creator laptop">
  <defs><linearGradient id="lpg" x1="40" y1="20" x2="290" y2="190" gradientUnits="userSpaceOnUse"><stop stop-color="#1d97e3"/><stop offset="1" stop-color="#00ce1b"/></linearGradient></defs>
  <ellipse cx="160" cy="196" rx="130" ry="8" fill="#1d97e3" opacity="0.12"/>
  <rect x="74" y="18" width="172" height="120" rx="10" fill="#0e1830" stroke="url(#lpg)" stroke-width="3.5"/>
  <rect x="84" y="28" width="152" height="100" rx="5" fill="#0a1226"/>
  <rect x="94" y="44" width="132" height="10" rx="2" fill="#1d97e3" opacity="0.75"/>
  <rect x="94" y="62" width="90" height="10" rx="2" fill="#9b5cff" opacity="0.75"/>
  <rect x="94" y="80" width="116" height="10" rx="2" fill="#00ce1b" opacity="0.75"/>
  <rect x="94" y="98" width="70" height="10" rx="2" fill="#1d97e3" opacity="0.5"/>
  <path d="M48 150 L272 150 L300 186 L20 186 Z" fill="#0e1830" stroke="url(#lpg)" stroke-width="3.5" stroke-linejoin="round"/>
  <rect x="132" y="160" width="56" height="8" rx="3" fill="#0a1226" stroke="url(#lpg)" stroke-width="2"/>
</svg>'''

PROJECTOR_SVG = '''<svg class="robot-svg robot-svg--gpu" viewBox="0 0 340 210" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of a 4K projector and cinema screen">
  <defs><linearGradient id="pjg" x1="20" y1="20" x2="320" y2="190" gradientUnits="userSpaceOnUse"><stop stop-color="#1d97e3"/><stop offset="1" stop-color="#00ce1b"/></linearGradient></defs>
  <ellipse cx="180" cy="196" rx="140" ry="8" fill="#1d97e3" opacity="0.1"/>
  <path d="M78 92 L150 26 L150 150 Z" fill="#1d97e3" opacity="0.12"/>
  <rect x="150" y="22" width="172" height="132" rx="6" fill="#0a1226" stroke="url(#pjg)" stroke-width="3.5"/>
  <path d="M224 68 L256 88 L224 108 Z" fill="url(#pjg)"/>
  <path d="M236 154 v18" stroke="url(#pjg)" stroke-width="3"/>
  <rect x="26" y="78" width="62" height="38" rx="9" fill="#0e1830" stroke="url(#pjg)" stroke-width="3"/>
  <circle cx="74" cy="97" r="9" fill="#0a1226" stroke="url(#pjg)" stroke-width="2.5"/><circle cx="74" cy="97" r="3.5" fill="#1d97e3"/>
</svg>'''

SPEAKER_SVG = '''<svg class="robot-svg robot-svg--tall" viewBox="0 0 160 300" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of a Dolby surround sound speaker">
  <defs><linearGradient id="spg" x1="30" y1="20" x2="130" y2="280" gradientUnits="userSpaceOnUse"><stop stop-color="#1d97e3"/><stop offset="1" stop-color="#00ce1b"/></linearGradient></defs>
  <ellipse cx="80" cy="288" rx="56" ry="8" fill="#1d97e3" opacity="0.12"/>
  <rect x="40" y="24" width="80" height="252" rx="12" fill="#0e1830" stroke="url(#spg)" stroke-width="3.5"/>
  <circle cx="80" cy="64" r="14" fill="#0a1226" stroke="url(#spg)" stroke-width="2.5"/><circle cx="80" cy="64" r="4" fill="#1d97e3"/>
  <circle cx="80" cy="160" r="34" fill="#0a1226" stroke="url(#spg)" stroke-width="3"/><circle cx="80" cy="160" r="12" fill="url(#spg)" opacity="0.7"/><circle cx="80" cy="160" r="4" fill="#00ce1b"/>
  <circle cx="80" cy="234" r="18" fill="#0a1226" stroke="url(#spg)" stroke-width="2.5"/><circle cx="80" cy="234" r="4" fill="#1d97e3"/>
  <g stroke="#1d97e3" stroke-width="2.4" fill="none" opacity="0.5" stroke-linecap="round"><path d="M126 148 a26 26 0 0 1 0 36"/><path d="M136 140 a40 40 0 0 1 0 52"/></g>
</svg>'''

DISH_SVG = '''<svg class="robot-svg robot-svg--gpu" viewBox="0 0 260 240" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of a Starlink satellite dish">
  <defs><linearGradient id="slg" x1="40" y1="40" x2="220" y2="220" gradientUnits="userSpaceOnUse"><stop stop-color="#1d97e3"/><stop offset="1" stop-color="#00ce1b"/></linearGradient></defs>
  <ellipse cx="130" cy="226" rx="74" ry="10" fill="#1d97e3" opacity="0.12"/>
  <rect x="123" y="150" width="14" height="66" rx="5" fill="#0e1830" stroke="url(#slg)" stroke-width="3"/>
  <rect x="106" y="212" width="48" height="11" rx="4" fill="#0e1830" stroke="url(#slg)" stroke-width="3"/>
  <g transform="rotate(-22 130 118)">
    <rect x="76" y="92" width="108" height="54" rx="18" fill="#0e1830" stroke="url(#slg)" stroke-width="3.5"/>
    <ellipse cx="130" cy="119" rx="32" ry="13" fill="url(#slg)" opacity="0.2"/>
    <circle cx="130" cy="119" r="5" fill="#1d97e3"/>
  </g>
  <g stroke="#1d97e3" fill="none" stroke-width="2.6" stroke-linecap="round" opacity="0.55"><path d="M150 72 a40 40 0 0 1 30 30"/><path d="M158 56 a62 62 0 0 1 46 46"/></g>
  <circle cx="200" cy="44" r="4" fill="#00ce1b"/>
</svg>'''

SATELLITE_SVG = '''<svg class="robot-svg robot-svg--gpu" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of a low-orbit Starlink satellite">
  <defs><linearGradient id="sag" x1="40" y1="40" x2="260" y2="180" gradientUnits="userSpaceOnUse"><stop stop-color="#1d97e3"/><stop offset="1" stop-color="#00ce1b"/></linearGradient></defs>
  <path d="M150 100 L122 190 L178 190 Z" fill="#1d97e3" opacity="0.12"/>
  <rect x="38" y="70" width="72" height="44" rx="6" fill="#0a1226" stroke="url(#sag)" stroke-width="3"/>
  <g stroke="url(#sag)" stroke-width="1.3" opacity="0.5"><path d="M62 70v44M86 70v44M38 92h72"/></g>
  <rect x="190" y="70" width="72" height="44" rx="6" fill="#0a1226" stroke="url(#sag)" stroke-width="3"/>
  <g stroke="url(#sag)" stroke-width="1.3" opacity="0.5"><path d="M214 70v44M238 70v44M190 92h72"/></g>
  <rect x="118" y="60" width="64" height="60" rx="10" fill="#0e1830" stroke="url(#sag)" stroke-width="3.5"/>
  <circle cx="150" cy="92" r="11" fill="url(#sag)" opacity="0.7"/><circle cx="150" cy="92" r="4" fill="#00ce1b"/>
  <path d="M150 60 v-14" stroke="url(#sag)" stroke-width="3"/><circle cx="150" cy="44" r="4" fill="#1d97e3"/>
  <path d="M68 196 q82 -26 164 0" stroke="url(#sag)" stroke-width="2.5" fill="none" opacity="0.5"/>
</svg>'''

# ===================================================== AMD THREADRIPPER WORKSTATIONS
def threadripper_workstations():
    slug = "threadripper-workstations"
    desc = "As a Scan partner, 365 Techies supplies and supports high-end AMD Threadripper and Threadripper PRO workstations — custom-built by Scan's award-winning 3XS Systems for video editing, 3D rendering, CAD, AI and simulation, set up and supported locally."
    faqs = [
      ("What is an AMD Threadripper workstation?", "A workstation built around AMD&rsquo;s Threadripper or Threadripper PRO processors &mdash; offering very high core counts and huge memory bandwidth for the heaviest professional workloads."),
      ("Who builds the workstations?", "They&rsquo;re custom-built by Scan&rsquo;s award-winning 3XS Systems &mdash; building quality workstations in the UK since 1987 &mdash; and as a Scan partner we supply, set up and support them for you."),
      ("What work are they best for?", "Video editing and grading, 3D rendering and animation, CAD/CAE/BIM, AI and deep learning, simulation and professional audio &mdash; anything that needs serious multicore power."),
      ("Is there a warranty?", "Yes &mdash; 3XS workstations come with a 3-year parts-and-labour warranty, and we provide local setup and ongoing support on top."),
      ("Can you set it up and support it for us?", "Absolutely &mdash; we configure it for your software, integrate it with your systems and support it like the rest of your IT, as your single local point of contact."),
    ]
    content = "\n".join([
      hero(bc("Threadripper Workstations"), "// SCAN 3XS PARTNER &middot; AMD THREADRIPPER",
           'AMD Threadripper <em class="grad grad--cyan">workstations</em>',
           "As a Scan partner, we supply and support high-end AMD Threadripper and Threadripper PRO workstations &mdash; custom-built by Scan&rsquo;s award-winning 3XS Systems for the most demanding creative, engineering and AI workloads, then set up and supported by your local team.",
           cta1=("Enquire About a Workstation", "/contact/"), cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["Built by Scan 3XS","Supplied &amp; supported","Serious multicore power"]),
      f'''    <section class="section section--alt" aria-label="Workstation showcase">
      <div class="wrap">
        <div class="split-2">
          <div class="tile robot-card" data-reveal>{WORKSTATION_SVG}<h3>Threadripper workstations</h3><p>Custom-built 3XS towers with AMD Threadripper or Threadripper PRO &mdash; huge core counts for the heaviest creative, engineering and AI work.</p></div>
          <div class="tile robot-card" data-reveal>{GPU_SVG}<h3>Professional NVIDIA graphics</h3><p>As an NVIDIA partner, we pair your workstation with the right professional GPU for rendering, AI and visualisation.</p></div>
        </div>
        <p class="lede lede--center" style="margin-top:1.6rem;font-size:.9rem;color:var(--faint)" data-reveal>Illustrative graphics &mdash; we&rsquo;ll spec the exact components for your workload.</p>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="What it is">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — SERIOUS POWER</p>
          <h2 class="section-title" data-title>Workstations for the heaviest work<span class="title-underline"></span></h2>
          <p>AMD Threadripper and Threadripper PRO are AMD&rsquo;s flagship workstation processors &mdash; enormous core counts, huge memory bandwidth and the raw performance that demanding professionals need.</p>
          <p><strong>As a Scan partner, we supply custom-built 3XS Threadripper workstations</strong> &mdash; then spec them around your software, set them up and support them locally, so you get a machine that flies and a single point of contact when you need one. You can <a href="https://www.scan.co.uk/3xs" target="_blank" rel="noopener">explore 3XS at Scan</a>, then talk to us.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Built by award-winning Scan 3XS","AMD Threadripper &amp; Threadripper PRO","Huge multicore performance","Pro GPUs &amp; ECC memory options","Custom-specced to your workload","Finest branded components","3-year parts &amp; labour warranty","Set up &amp; supported by us"])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="Built for demanding work">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — BUILT FOR</p>
          <h2 class="section-title section-title--center" data-title>Power for serious workloads<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("monitor","Video editing &amp; grading","Smooth 4K and 8K editing, effects and colour grading without the wait."),("cpu","3D rendering &amp; animation","Render and simulate dramatically faster with massive core counts."),("briefcase","CAD, CAE &amp; BIM","Handle huge assemblies and models for design, engineering and AEC."),("robot","AI, ML &amp; deep learning","Train and run models with serious compute and professional GPUs."),("flow","Simulation &amp; data","Crunch heavy simulations and large datasets with ease."),("spark","Music &amp; DAW production","Low-latency, high-track-count professional audio production.")])}
        </div>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="Why 3XS">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — WHY 3XS, THROUGH US</p>
          <h2 class="section-title section-title--center" data-title>Award-winning builds, local support<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("Building since 1987","Decades of expertise from one of the UK&rsquo;s most respected system builders."),("200+ media awards","Independently reviewed and award-winning workstation builds."),("Finest components","Only quality, branded parts &mdash; no unbranded compromises."),("Built &amp; stress-tested","Each system custom-built to order and thoroughly tested before it ships."),("3-year warranty","Parts-and-labour cover for genuine peace of mind."),("Local setup &amp; support","We spec, set up and support it &mdash; your single point of contact.")])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="how section--alt" aria-label="How it works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/04 — HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>From workflow to workstation<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("We spec it","Tell us your software and workflow &mdash; we&rsquo;ll design the ideal Threadripper workstation."),("3XS build &amp; test it","Scan&rsquo;s 3XS custom-builds and stress-tests it from the finest components."),("We set up &amp; support","We deliver it set up and ready, integrate it and support it ongoing &mdash; locally.")])}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Build your Threadripper workstation",
          "Tell us about your work and we&rsquo;ll spec, supply and support the perfect high-performance AMD Threadripper workstation &mdash; with friendly, local expertise.",
          primary=("Enquire About a Workstation", "/contact/"), secondary=("Explore 3XS at Scan", "https://www.scan.co.uk/3xs")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "Threadripper Workstations"), webpage(s, "AMD Threadripper Workstations", _desc),
                      service(s, "AMD Threadripper Workstation Supply & Support", "Supply, setup and support of high-end AMD Threadripper and Threadripper PRO workstations, custom-built by Scan 3XS, for creative, engineering and AI professionals.", "High-performance workstation supply and support"),
                      {"@type": "Product", "@id": SITE + "/" + s + "/#product", "name": "AMD Threadripper Workstations", "description": "High-end custom AMD Threadripper and Threadripper PRO workstations, built by Scan 3XS, supplied and supported by 365 Techies.", "brand": {"@type": "Brand", "name": "Scan 3XS"}, "category": "Workstation", "image": SITE + "/og-image.jpg", "url": SITE + "/" + s + "/"},
                      faqpage(s, _faqs)])
    add(slug=slug, title="AMD Threadripper Workstations | Scan 3XS Partner | 365 Techies",
        desc=desc, og_title="AMD Threadripper Workstations | 365 Techies", schema=schema, content=content)
threadripper_workstations()

# ===================================================== GAMING PCS
def gaming_pcs():
    slug = "gaming-pcs"
    desc = "As an NVIDIA partner, 365 Techies supplies and supports custom NVIDIA GeForce RTX gaming PCs — built to your games and budget by Scan 3XS, set up, optimised and supported locally across Dorset."
    faqs = [
      ("Are you really an NVIDIA partner?", "Yes &mdash; we supply genuine NVIDIA GeForce RTX graphics in the gaming PCs we provide, and set them up and support them for you."),
      ("Do you build to my budget?", "Absolutely &mdash; from great-value gaming PCs to no-compromise flagship builds, specced around your games, monitor and budget."),
      ("Who builds the PCs?", "They&rsquo;re custom-built and stress-tested by Scan&rsquo;s award-winning 3XS Systems, and we set them up and support them locally."),
      ("Can you upgrade my existing gaming PC?", "Often yes &mdash; we can advise on and fit upgrades like a new GeForce RTX GPU, more memory or faster SSD storage."),
      ("Do they come ready to play?", "Yes &mdash; we deliver them set up, updated and optimised, with your data transferred across if you need it."),
    ]
    content = "\n".join([
      hero(bc("Gaming PCs"), "// NVIDIA PARTNER &middot; GAMING PCS",
           'NVIDIA-powered <em class="grad grad--cyan">gaming PCs</em>',
           "As an NVIDIA partner, we supply and support custom gaming PCs powered by NVIDIA GeForce RTX &mdash; built to your games and budget by Scan&rsquo;s award-winning 3XS, then set up, optimised and supported by your local team.",
           cta1=("Enquire About a Gaming PC", "/contact/"), cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["NVIDIA Partner","GeForce RTX power","Built &amp; supported"]),
      f'''    <section class="section section--alt" aria-label="Gaming PC showcase">
      <div class="wrap">
        <div class="split-2">
          <div class="tile robot-card" data-reveal>{GAMING_SVG}<h3>Custom gaming rigs</h3><p>Built around your games, monitor and budget &mdash; from sleek value builds to no-compromise flagships, with proper cooling and clean cable management.</p></div>
          <div class="tile robot-card" data-reveal>{GPU_SVG}<h3>NVIDIA GeForce RTX</h3><p>As an NVIDIA partner, we fit genuine GeForce RTX graphics &mdash; ray tracing, DLSS and the performance modern games demand.</p></div>
        </div>
        <p class="lede lede--center" style="margin-top:1.6rem;font-size:.9rem;color:var(--faint)" data-reveal>Illustrative graphics &mdash; we&rsquo;ll spec the exact build for your games and budget.</p>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="What it is">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — GAME ON</p>
          <h2 class="section-title" data-title>Gaming PCs, done properly<span class="title-underline"></span></h2>
          <p>A great gaming PC is about getting the balance right &mdash; the right NVIDIA GeForce RTX graphics, CPU, memory and cooling for the games you actually play, at the resolution and frame rate you want.</p>
          <p><strong>As an NVIDIA partner, we supply and support custom gaming PCs</strong>, built by Scan&rsquo;s award-winning 3XS and specced around your budget &mdash; then set up, optimised and looked after locally, so you can just play.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["NVIDIA GeForce RTX graphics","Specced to your games &amp; budget","Built &amp; stress-tested by 3XS","High frame rates &amp; 4K","Ray tracing &amp; DLSS","Quiet, well-cooled builds","Set up, updated &amp; optimised","Local support &amp; upgrades"])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="Built for">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — BUILT FOR</p>
          <h2 class="section-title section-title--center" data-title>Power for the way you play<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("bolt","High-FPS gaming","Smooth, high-frame-rate gameplay at the settings you want."),("spark","4K &amp; ray tracing","Stunning visuals with NVIDIA RTX ray tracing and DLSS."),("monitor","Streaming &amp; content","Game and stream at once, or edit and create with ease."),("flow","Esports-ready","Low-latency performance tuned for competitive play."),("cpu","VR-ready","Powerful enough for smooth, immersive virtual reality."),("shield","Built to last","Quality components, proper cooling and ongoing support.")])}
        </div>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="Why through us">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — WHY THROUGH US</p>
          <h2 class="section-title section-title--center" data-title>NVIDIA power, local support<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("NVIDIA Partner","Genuine NVIDIA GeForce RTX graphics, specced right for your games."),("GeForce RTX power","Ray tracing, DLSS and the performance modern titles demand."),("Built by Scan 3XS","Award-winning, custom-built and thoroughly stress-tested."),("Specced to your budget","From great-value rigs to no-compromise flagships."),("Set up &amp; optimised","Delivered ready to play, tuned, updated and clean."),("Local support &amp; upgrades","We support and upgrade it down the line &mdash; one local contact.")])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="how section--alt" aria-label="How it works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/04 — HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>From wishlist to first game<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("We spec it","Tell us your games, monitor and budget &mdash; we design the ideal rig."),("We build it","Custom-built by Scan 3XS from quality components and stress-tested."),("We set up &amp; support","Delivered ready to play, optimised, with ongoing local support.")])}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Build your dream gaming PC",
          "Tell us your games and budget and we&rsquo;ll spec, supply and support the perfect NVIDIA-powered gaming PC &mdash; with friendly, local expertise.",
          primary=("Enquire About a Gaming PC", "/contact/"), secondary=("Explore 3XS Gaming at Scan", "https://www.scan.co.uk/3xs")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "Gaming PCs"), webpage(s, "NVIDIA Gaming PCs", _desc),
                      service(s, "Gaming PC Supply & Support", "Supply, setup and support of custom NVIDIA GeForce RTX gaming PCs, built by Scan 3XS, for gamers, streamers and creators.", "Gaming PC supply and support"),
                      {"@type": "Product", "@id": SITE + "/" + s + "/#product", "name": "NVIDIA GeForce RTX Gaming PCs", "description": "Custom NVIDIA GeForce RTX gaming PCs, built by Scan 3XS, supplied, set up and supported by 365 Techies.", "brand": {"@type": "Brand", "name": "Scan 3XS"}, "category": "Gaming PC", "image": SITE + "/og-image.jpg", "url": SITE + "/" + s + "/"},
                      faqpage(s, _faqs)])
    add(slug=slug, title="NVIDIA Gaming PCs | Custom GeForce RTX PCs | NVIDIA Partner | 365 Techies",
        desc=desc, og_title="NVIDIA Gaming PCs | 365 Techies", schema=schema, content=content)
gaming_pcs()

# ===================================================== CONTENT CREATOR PCS & LAPTOPS
def content_creator_pcs():
    slug = "content-creator-pcs"
    desc = "Powerful, colour-accurate content creator PCs and laptops from 365 Techies — for video editing, streaming, photography, design, music and 3D. NVIDIA Studio power, custom-built by Scan 3XS, set up and supported locally."
    faqs = [
      ("What makes a good content creator PC?", "The right balance of a strong multi-core CPU, plenty of fast memory, an NVIDIA Studio-class GPU and quick SSD storage &mdash; tuned to the apps you actually use, from Premiere Pro and DaVinci Resolve to Photoshop, Blender and Ableton."),
      ("Do you supply creator laptops too?", "Yes &mdash; powerful, colour-accurate laptops for editing and design on the move, as well as custom desktops for the studio."),
      ("Who builds the desktops?", "Custom-built and stress-tested by Scan&rsquo;s award-winning 3XS Systems, and we spec them to your software, set them up and support them locally."),
      ("Can you set it up with my creative software?", "Yes &mdash; we configure your machine, install and optimise your creative apps, transfer your projects, and support it ongoing."),
      ("Are these NVIDIA Studio machines?", "We&rsquo;re an NVIDIA partner and fit NVIDIA Studio-class GeForce RTX graphics, ideal for accelerated rendering, AI tools and creative workflows."),
    ]
    content = "\n".join([
      hero(bc("Content Creator PCs"), "// FOR CONTENT CREATORS",
           'Content creator <em class="grad grad--cyan">PCs &amp; laptops</em>',
           "Powerful, colour-accurate PCs and laptops for video editing, streaming, photography, design, music and 3D &mdash; NVIDIA Studio power, custom-built by Scan&rsquo;s award-winning 3XS, then set up, optimised and supported by your local team.",
           cta1=("Enquire About a Creator PC", "/contact/"), cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["NVIDIA Studio power","Desktops &amp; laptops","Built &amp; supported"]),
      f'''    <section class="section section--alt" aria-label="Creator showcase">
      <div class="wrap">
        <div class="split-2">
          <div class="tile robot-card" data-reveal>{LAPTOP_SVG}<h3>Creator laptops</h3><p>Powerful, colour-accurate laptops for editing, design and creating on the move &mdash; specced and set up around your apps.</p></div>
          <div class="tile robot-card" data-reveal>{GPU_SVG}<h3>NVIDIA Studio graphics</h3><p>As an NVIDIA partner, we fit Studio-class GeForce RTX graphics for fast rendering, AI tools and smooth creative workflows.</p></div>
        </div>
        <p class="lede lede--center" style="margin-top:1.6rem;font-size:.9rem;color:var(--faint)" data-reveal>Illustrative graphics &mdash; we&rsquo;ll spec the exact machine for your creative work.</p>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="What it is">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — MADE TO CREATE</p>
          <h2 class="section-title" data-title>Machines that keep up with you<span class="title-underline"></span></h2>
          <p>Creative work is demanding &mdash; 4K timelines, huge RAW files, 3D scenes and live streams all need real power and accurate colour. The wrong machine means waiting, crashing and lost flow.</p>
          <p><strong>We supply and support content creator PCs and laptops</strong>, specced around the software you use, built by Scan&rsquo;s 3XS with NVIDIA Studio graphics, then set up, optimised and looked after locally.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["NVIDIA Studio GeForce RTX graphics","Strong multi-core CPUs","Plenty of fast memory","Speedy SSD/NVMe storage","Colour-accurate display options","Desktops &amp; powerful laptops","Set up with your creative apps","Local support &amp; upgrades"])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="Built for">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — BUILT FOR</p>
          <h2 class="section-title section-title--center" data-title>Power for every craft<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("monitor","Video editing","Smooth 4K and 8K editing and grading in Premiere, Resolve and Final Cut."),("spark","Photography &amp; design","Fast, colour-accurate work in Photoshop, Lightroom and Illustrator."),("bolt","Streaming","Game and stream, or go live, without dropping frames."),("cpu","3D &amp; motion","Render and animate faster in Blender, Cinema 4D and After Effects."),("flow","Music production","Low-latency, high-track-count production in your DAW."),("robot","AI creative tools","Accelerate AI-powered editing, upscaling and generation.")])}
        </div>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="Desktops and laptops">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — DESKTOP OR LAPTOP</p>
          <h2 class="section-title section-title--center" data-title>Create at the studio or on the move<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="split-2">
          <div class="tile" data-reveal>
            <h3>Creator desktops</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">Maximum power for the studio &mdash; custom-built 3XS towers specced for your heaviest projects, with room to upgrade.</p>
            <ul class="checklist">
{checklist(["Maximum performance","NVIDIA Studio graphics","Built &amp; stress-tested by 3XS","Easy to upgrade later"])}
            </ul>
          </div>
          <div class="tile" data-reveal>
            <h3>Creator laptops</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">Serious power you can take anywhere &mdash; colour-accurate screens and Studio graphics for editing and design on location.</p>
            <ul class="checklist">
{checklist(["Powerful &amp; portable","Colour-accurate displays","NVIDIA Studio graphics","Set up and ready to create"])}
            </ul>
          </div>
        </div>
      </div>
    </section>''',
      f'''    <section class="how section--alt" aria-label="How it works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/04 — HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>From brief to first export<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("We spec it","Tell us your software and projects &mdash; we design the ideal creator machine."),("We build &amp; set up","Built by 3XS, then configured with your apps, optimised and tested."),("We support","Delivered ready to create, with ongoing local support and upgrades.")])}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Create without compromise",
          "Tell us about your creative work and we&rsquo;ll spec, supply and support the perfect content creator PC or laptop &mdash; with friendly, local expertise.",
          primary=("Enquire About a Creator PC", "/contact/"), secondary=("Explore Workstations", "/threadripper-workstations/")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "Content Creator PCs"), webpage(s, "Content Creator PCs & Laptops", _desc),
                      service(s, "Content Creator PC & Laptop Supply & Support", "Supply, setup and support of content creator PCs and laptops with NVIDIA Studio graphics for video, photo, design, music and 3D creators.", "Content creation PC supply and support"),
                      {"@type": "Product", "@id": SITE + "/" + s + "/#product", "name": "Content Creator PCs & Laptops", "description": "NVIDIA Studio content creator PCs and laptops, built by Scan 3XS, supplied, set up and supported by 365 Techies.", "brand": {"@type": "Brand", "name": "Scan 3XS"}, "category": "Workstation", "image": SITE + "/og-image.jpg", "url": SITE + "/" + s + "/"},
                      faqpage(s, _faqs)])
    add(slug=slug, title="Content Creator PCs & Laptops | NVIDIA Studio | 365 Techies",
        desc=desc, og_title="Content Creator PCs & Laptops | 365 Techies", schema=schema, content=content)
content_creator_pcs()

# ===================================================== HOME CINEMA & ENTERTAINMENT
def home_cinema():
    slug = "home-cinema-entertainment"
    desc = "As a Richer Sounds Bournemouth partner, 365 Techies supplies, installs and supports stunning home entertainment systems — 4K projectors, Dolby surround sound, smart TVs and multi-room audio, set up and supported across Dorset."
    faqs = [
      ("Are you really a Richer Sounds partner?", "Yes &mdash; we partner with Richer Sounds in Bournemouth to supply quality home cinema and audio kit, and we handle the design, installation and ongoing support."),
      ("Do you install 4K projectors?", "Yes &mdash; we supply and install 4K projectors and screens, calibrated for a proper cinema experience in your home or business."),
      ("Can you set up Dolby surround sound?", "Absolutely &mdash; we design and install Dolby surround and Dolby Atmos systems, from soundbars to full multi-speaker setups, neatly wired and tuned."),
      ("Do you do multi-room audio?", "Yes &mdash; whole-home and multi-room audio so you can play music throughout the house, controlled from your phone."),
      ("Will it all work together simply?", "That&rsquo;s the point &mdash; we integrate everything so it works reliably with simple, one-touch control, and we&rsquo;re on hand if you ever need us."),
    ]
    content = "\n".join([
      hero(bc("Home Cinema & Entertainment"), "// RICHER SOUNDS PARTNER &middot; HOME CINEMA",
           'Home cinema &amp; <em class="grad grad--cyan">entertainment systems</em>',
           "As a Richer Sounds (Bournemouth) partner, we supply, install and support stunning home entertainment &mdash; 4K projectors, Dolby surround sound, smart TVs and multi-room audio &mdash; designed, fitted and set up properly across Dorset.",
           cta1=("Plan My System", "/contact/"), cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["Richer Sounds partner","4K &amp; Dolby","Installed &amp; supported"]),
      f'''    <section class="section section--alt" aria-label="Home cinema showcase">
      <div class="wrap">
        <div class="split-2">
          <div class="tile robot-card" data-reveal>{PROJECTOR_SVG}<h3>4K projectors &amp; screens</h3><p>Big-screen cinema at home &mdash; 4K projectors and screens, supplied, installed and calibrated for stunning picture.</p></div>
          <div class="tile robot-card" data-reveal>{SPEAKER_SVG}<h3>Dolby surround sound</h3><p>Immersive Dolby surround and Atmos audio &mdash; designed, fitted and tuned for cinema-quality sound.</p></div>
        </div>
        <p class="lede lede--center" style="margin-top:1.6rem;font-size:.9rem;color:var(--faint)" data-reveal>Illustrative graphics &mdash; we&rsquo;ll design the right system for your room and budget.</p>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="What it is">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — ENTERTAINMENT, DONE RIGHT</p>
          <h2 class="section-title" data-title>Cinema-quality, set up properly<span class="title-underline"></span></h2>
          <p>Great home entertainment is about more than the kit &mdash; it&rsquo;s choosing the right gear for your room, installing it neatly, calibrating it and making it simple to use.</p>
          <p><strong>As a Richer Sounds Bournemouth partner</strong>, we supply quality projectors, sound systems and TVs, then design, install and support the whole system &mdash; so you just press play.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["4K projectors &amp; screens","Dolby surround &amp; Atmos sound","Smart &amp; large-screen TVs","Multi-room &amp; whole-home audio","Neat installation &amp; wiring","Calibrated picture &amp; sound","Simple, one-touch control","Local setup &amp; support"])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="What we do">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — WHAT WE DO</p>
          <h2 class="section-title section-title--center" data-title>Your complete entertainment setup<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("monitor","4K projectors","Big-screen 4K projectors and screens, installed and calibrated."),("spark","Dolby surround sound","Dolby surround and Atmos systems for immersive, cinema-quality audio."),("flow","Smart TVs","Quality TVs supplied, mounted and set up with your apps and sources."),("bolt","Multi-room audio","Whole-home audio you can control from your phone."),("wrench","Installation &amp; wiring","Neat, professional installation and tidy cable management."),("shield","Setup &amp; support","Simple control, calibration and friendly local support.")])}
        </div>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="Why through us">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — WHY THROUGH US</p>
          <h2 class="section-title section-title--center" data-title>Quality kit, expert install<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("Richer Sounds partner","Quality home cinema and audio through our Richer Sounds Bournemouth partnership."),("Expert design","The right kit for your room, budget and how you&rsquo;ll use it."),("Neat installation","Professionally fitted and tidily wired &mdash; no mess, no fuss."),("Calibrated &amp; tuned","Picture and sound set up to look and sound their best."),("Simple control","One-touch, easy-to-use control the whole household can manage."),("Local support","We&rsquo;re on hand whenever you need us &mdash; your single local contact.")])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="how section--alt" aria-label="How it works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/04 — HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>From room to red-carpet<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("We design it","We assess your room and how you&rsquo;ll use it, then recommend the right system."),("We supply &amp; install","We source quality kit via Richer Sounds and install it neatly and properly."),("We set up &amp; support","We calibrate it, make it simple to use, and support it ongoing &mdash; locally.")])}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Bring the cinema home",
          "Tell us about your room and we&rsquo;ll design, supply, install and support the perfect home entertainment system &mdash; with friendly, local expertise.",
          primary=("Plan My System", "/contact/"), secondary=("Call 01202 775566", "tel:+441202775566")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "Home Cinema & Entertainment"), webpage(s, "Home Cinema & Entertainment Systems", _desc),
                      service(s, "Home Cinema & Entertainment Systems", "Supply, installation and support of home cinema and entertainment systems — 4K projectors, Dolby surround sound, smart TVs and multi-room audio — as a Richer Sounds Bournemouth partner.", "Home cinema and AV installation"),
                      faqpage(s, _faqs)])
    add(slug=slug, title="Home Cinema & Entertainment Systems | 4K Projectors & Dolby Sound | 365 Techies",
        desc=desc, og_title="Home Cinema & Entertainment | 365 Techies", schema=schema, content=content)
home_cinema()

# ===================================================== STARLINK INTERNET
def starlink_internet():
    slug = "starlink-internet"
    desc = "Fast, reliable internet anywhere — 365 Techies supplies, installs and supports Starlink satellite broadband for homes, rural properties and businesses, plus roaming Starlink for campervans, motorhomes, boats and remote sites across Dorset, the New Forest and beyond."
    faqs = [
      ("What is Starlink?", "Starlink is high-speed satellite broadband from a network of low-orbit satellites &mdash; it delivers fast, low-latency internet almost anywhere with a clear view of the sky, even where fixed broadband is slow or unavailable."),
      ("Can Starlink help where I have poor broadband?", "Yes &mdash; that&rsquo;s exactly where it shines. For rural homes and businesses in the New Forest and across Dorset stuck on slow connections or in not-spots, Starlink is often a game-changer."),
      ("Do you offer roaming Starlink for a campervan or boat?", "Yes &mdash; we supply and set up roaming and mobile Starlink for campervans, motorhomes, boats and remote sites, so you can get online on the move or off-grid."),
      ("Do you install and support it?", "Yes &mdash; we advise on the right kit, install the dish safely, set up your network and support it ongoing, so you&rsquo;re never left to figure it out alone."),
      ("Can it pair with off-grid power?", "Absolutely &mdash; Starlink pairs perfectly with our <a href=\"/off-grid-victron-energy/\">off-grid Victron energy</a> systems for fully independent power and internet."),
    ]
    content = "\n".join([
      hero(bc("Starlink Internet"), "// STARLINK SOLUTIONS",
           'Starlink <em class="grad grad--cyan">satellite internet</em>',
           "Fast, reliable internet anywhere &mdash; we supply, install and support Starlink satellite broadband for homes, rural properties and businesses, plus roaming Starlink for campervans, motorhomes, boats and remote sites.",
           cta1=("Get Connected", "/contact/"), cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["Residential &amp; roaming","Installed &amp; supported","Anywhere with a clear sky"]),
      f'''    <section class="section section--alt" aria-label="Starlink showcase">
      <div class="wrap">
        <div class="split-2">
          <div class="tile robot-card" data-reveal>{DISH_SVG}<h3>Starlink at your place</h3><p>We supply and install the Starlink dish and set up your network &mdash; fast broadband for rural homes, businesses and not-spots.</p></div>
          <div class="tile robot-card" data-reveal>{SATELLITE_SVG}<h3>Internet from orbit</h3><p>A network of low-orbit satellites delivers fast, low-latency internet almost anywhere with a clear view of the sky.</p></div>
        </div>
        <p class="lede lede--center" style="margin-top:1.6rem;font-size:.9rem;color:var(--faint)" data-reveal>Illustrative graphics &mdash; we&rsquo;ll recommend the right Starlink kit for your location.</p>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="What it is">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — INTERNET ANYWHERE</p>
          <h2 class="section-title" data-title>Fast broadband, wherever you are<span class="title-underline"></span></h2>
          <p>If you&rsquo;re stuck with slow, patchy or non-existent broadband, Starlink changes everything &mdash; high-speed, low-latency internet beamed from low-orbit satellites, with no phone line needed.</p>
          <p><strong>We supply, install and support Starlink</strong> for homes, rural properties and businesses, and set up roaming Starlink for life on the move &mdash; then look after it, and can pair it with off-grid power.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Fast, low-latency broadband","Works almost anywhere","Great for rural areas &amp; not-spots","Residential &amp; roaming options","Supplied, installed &amp; supported","Pairs with off-grid power","Backup &amp; failover internet","No phone line needed"])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="What we offer">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — WHAT WE OFFER</p>
          <h2 class="section-title section-title--center" data-title>Connected, however you live<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("home","Residential Starlink","Fast home broadband for rural properties and slow-broadband not-spots."),("van","Roaming Starlink","Stay connected in a campervan, motorhome or on the move."),("briefcase","Business &amp; remote sites","Reliable connectivity for offices, farms, units and sites off the grid."),("flow","Boats &amp; marine","Internet afloat for liveaboards and leisure boats."),("bolt","Backup internet","Automatic failover so your business never drops offline."),("globe","Events &amp; temporary","Quick, reliable internet for pop-ups, events and temporary sites.")])}
        </div>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="Where it shines">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — WHERE IT SHINES</p>
          <h2 class="section-title section-title--center" data-title>Made for the hard-to-reach<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("Rural homes &amp; the New Forest","Fast internet where fixed broadband is slow, patchy or unavailable."),("Off-grid properties","Internet to match off-grid power &mdash; fully independent living."),("Digital nomads &amp; vanlife","Work from anywhere with a clear view of the sky."),("Farms &amp; remote business","Connectivity for sites well beyond the reach of cables."),("Backup &amp; resilience","A second, independent connection that keeps you online."),("Events &amp; pop-ups","Reliable temporary internet, set up fast.")])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="how section--alt" aria-label="How it works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/04 — HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>Online in three steps<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("We assess","We check your location and needs and recommend the right Starlink kit &mdash; residential or roaming."),("We install","We install the dish safely and set up your network properly."),("We support","We look after it ongoing, and can pair it with off-grid power.")])}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Get connected, anywhere",
          "Slow broadband or none at all? Tell us your location and we&rsquo;ll get you online with Starlink &mdash; supplied, installed and supported locally.",
          primary=("Get Connected", "/contact/"), secondary=("Off-Grid Energy", "/off-grid-victron-energy/")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "Starlink Internet"), webpage(s, "Starlink Satellite Internet", _desc),
                      service(s, "Starlink Satellite Internet", "Supply, installation and support of Starlink satellite broadband &mdash; residential and roaming &mdash; for homes, businesses, campervans, boats and remote sites.", "Satellite internet supply and installation"),
                      faqpage(s, _faqs)])
    add(slug=slug, title="Starlink Satellite Internet | Residential & Roaming | 365 Techies",
        desc=desc, og_title="Starlink Satellite Internet | 365 Techies", schema=schema, content=content)
starlink_internet()

# ===================================================== REFER A FRIEND
def refer_a_friend():
    slug = "refer-a-friend"
    desc = "Refer a friend to 365 Techies and you both get a free month. Love your friendly, reliable IT support? Share it with friends, family or businesses across Dorset — when they join a monthly plan, you each get a month free."
    faqs = [
      ("Who can I refer?", "Anyone &mdash; friends, family, neighbours, colleagues or local businesses. If they&rsquo;d benefit from friendly, reliable IT support, refer them."),
      ("How many people can I refer?", "As many as you like &mdash; there&rsquo;s no limit. Every friend who joins a monthly plan earns you another free month."),
      ("When do I get my free month?", "Once your friend has joined a monthly home or business plan and is set up, we credit a free month to your account."),
      ("What does my friend get?", "They get the same friendly, reliable IT support you enjoy &mdash; plus a free month of their own as a welcome."),
      ("Do they have to mention me?", "Just ask them to mention your name when they get in touch, or refer them to us directly and we&rsquo;ll take care of the rest."),
      ("Is there a catch?", "No catch &mdash; it&rsquo;s simply our way of saying thank you. Standard plan terms apply, and both free months kick in once your friend&rsquo;s plan is active."),
    ]
    content = "\n".join([
      hero(bc("Refer a Friend"), "// REFER A FRIEND",
           'Refer a friend, <em class="grad grad--green">you both win</em>',
           "Love your IT support? Share it. When you refer a friend, family member or business and they join a monthly plan, <strong>you both get a free month</strong> &mdash; our way of saying a proper thank you.",
           cta1=("Refer Someone Now", "/contact/"), cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["A free month each","No limit on referrals","Homes &amp; businesses"]),
      f'''    <section class="section" aria-label="How it works">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/01 — HOW IT WORKS</p>
          <h2 class="section-title section-title--center" data-title>Three easy steps, two happy people<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ol class="how__steps">
{steps([("Tell us who","Send us their name and number, or ask them to mention you when they get in touch."),("They join a plan","Your friend starts any monthly home or business support plan."),("You both get a free month","Once they&rsquo;re set up, we credit a free month to you both. Simple as that.")])}
        </ol>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="What you both get">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — WHAT YOU BOTH GET</p>
          <h2 class="section-title section-title--center" data-title>Everybody wins<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="split-2">
          <div class="tile" data-reveal>
            <h3>What you get</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">A free month of support credited to your plan, every single time someone you refer joins &mdash; with no limit on how many friends you share us with.</p>
            <ul class="checklist">
{checklist(["A free month, every referral","No limit &mdash; refer as many as you like","A genuine thank-you from us","Works on home &amp; business plans"])}
            </ul>
          </div>
          <div class="tile" data-reveal>
            <h3>What your friend gets</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">A warm welcome, a free month of their own, and friendly, reliable IT support they&rsquo;ll genuinely thank you for recommending.</p>
            <ul class="checklist">
{checklist(["Their own free month to start","Friendly, jargon-free support","A team rated 4.9 on Google","Help in minutes, when it matters"])}
            </ul>
          </div>
        </div>
      </div>
    </section>''',
      f'''    <section class="section" aria-label="Who to refer">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — WHO TO REFER</p>
          <h2 class="section-title section-title--center" data-title>Know someone who&rsquo;d love us?<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("users","Friends &amp; colleagues","Anyone who&rsquo;s forever battling their tech &mdash; send them our way."),("home","Family &amp; neighbours","Help the people close to you get reliable, friendly support."),("briefcase","Local businesses","Know a business that needs proper IT? Refer them and you both benefit."),("user","Retired &amp; disabled relatives","Patient, accessible support for the people who need it most.")])}
        </div>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Refer a friend today",
          "Share the IT support you love and you&rsquo;ll both enjoy a free month. Tell us who to look after next.",
          primary=("Refer Someone Now", "/contact/"), secondary=("Call 01202 775566", "tel:+441202775566")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "Refer a Friend"), webpage(s, "Refer a Friend", _desc), faqpage(s, _faqs)])
    add(slug=slug, title="Refer a Friend | Get a Free Month of IT Support | 365 Techies",
        desc=desc, og_title="Refer a Friend | 365 Techies", schema=schema, content=content)
refer_a_friend()

# ===================================================== UK & EUROPE
def uk_europe():
    slug = "it-support-uk-europe"
    desc = "Remote IT support across the whole of the UK and Europe — fast, secure online help and fully managed monthly plans for homes, remote teams and businesses, wherever you are. Local Dorset roots, borderless reach."
    faqs = [
      ("Do you really cover the whole of the UK?", "Yes &mdash; our remote support and managed monthly plans work anywhere in the UK. On-site visits are focused on Dorset and the South Coast, but remote help reaches you nationwide, usually in minutes."),
      ("Can you support me in Europe?", "Yes &mdash; we support expats, second-home owners, remote workers and businesses right across Europe with fully remote, secure IT support and managed plans."),
      ("How does remote support work abroad?", "All you need is an internet connection. We connect securely over encrypted Splashtop SOS, you watch everything on screen, and access ends the moment the session does."),
      ("What about different time zones?", "We&rsquo;re flexible &mdash; tell us your time zone and we&rsquo;ll arrange support and maintenance to suit it."),
      ("Can you manage a team spread across countries?", "Yes &mdash; we manage Microsoft 365, security and backups for distributed teams, giving you one point of contact wherever your people are."),
      ("Are you still a local Dorset business?", "Absolutely &mdash; we&rsquo;re proudly Bournemouth-based and family-run since 1995. Remote technology simply lets us bring that same personal service to people across the UK and Europe."),
    ]
    content = "\n".join([
      hero(bc("UK & Europe"), "// UK &amp; EUROPE",
           'IT support across the <em class="grad grad--cyan">UK &amp; Europe</em>',
           "Wherever you are in the UK or Europe, we&rsquo;ve got your back. 365 Techies delivers fast, secure remote IT support and fully managed monthly plans for homes, remote teams and businesses &mdash; the same friendly, expert service, now without borders.",
           cta1=("Get Remote Support", "/contact/"), cta2=("Call 01202 775566", "tel:+441202775566"),
           chips=["Remote across the UK &amp; Europe","Secure &amp; encrypted","Homes, teams &amp; businesses"]),
      f'''    <section class="section" aria-label="Remote first">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — REMOTE-FIRST</p>
          <h2 class="section-title" data-title>Distance is no object<span class="title-underline"></span></h2>
          <p>Most of what we do already happens remotely &mdash; securely, in minutes, over encrypted Splashtop SOS. That means it makes no difference whether you&rsquo;re in Bournemouth, Birmingham, Berlin or a beach in Portugal.</p>
          <p><strong>Local roots, borderless reach.</strong> We&rsquo;re a Dorset family business, and remote technology lets us bring that same personal, reliable service to people right across the UK and Europe.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Remote support in minutes","Fully managed monthly plans","Microsoft 365 anywhere","Cybersecurity &amp; protection","Cloud backups that travel","Support for cross-border teams","Time-zone-friendly help","One trusted point of contact"])}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="Who we support">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — WHO WE SUPPORT</p>
          <h2 class="section-title section-title--center" data-title>Support without borders<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("globe","Anywhere in the UK","Full remote support and managed plans for homes and businesses nationwide."),("flow","Across Europe","Expats, second homes and businesses operating across European borders."),("users","Remote &amp; hybrid teams","Keep distributed staff productive and secure, wherever they log on."),("briefcase","Multi-site businesses","One IT partner for every location, under a single plan."),("van","Digital nomads","Reliable support for life and work on the move &mdash; anywhere with Wi-Fi."),("shield","Secure everywhere","Encrypted remote sessions and security that travels with you.")])}
        </div>
      </div>
    </section>''',
      f'''    <section class="how" aria-label="How remote works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/03 — HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>Help anywhere, in three steps<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("Get in touch","Message or call us from anywhere &mdash; tell us what you need."),("Connect securely","We join your device over encrypted Splashtop SOS, wherever you are."),("Stay covered","Choose a monthly plan and we&rsquo;ll keep your tech healthy across time zones.")])}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("IT support, wherever you are",
          "Across the UK, around Europe, or living the location-independent life &mdash; get fast, secure IT support from a team that feels local wherever you are.",
          primary=("Get Remote Support", "/contact/"), secondary=("Digital Nomads &#8594;", "/it-support-for-digital-nomads/")),
    ])
    def schema(s, _desc=desc, _faqs=faqs):
        return graph([crumb(s, "UK & Europe"), webpage(s, "IT Support Across the UK & Europe", _desc),
                      service(s, "Remote IT Support UK & Europe", "Remote IT support and managed monthly plans for homes, teams and businesses across the UK and Europe.", "Remote IT support"),
                      faqpage(s, _faqs)])
    add(slug=slug, title="IT Support Across the UK & Europe | Remote & Managed | 365 Techies",
        desc=desc, og_title="IT Support Across the UK & Europe | 365 Techies", schema=schema, content=content)
uk_europe()

# ===================================================== INFO / LEGAL / RESOURCE PAGES
def _prose(inner):
    return f'    <section class="section">\n      <div class="wrap">\n        <div class="prose" data-reveal>\n{inner}\n        </div>\n      </div>\n    </section>'

def info_page(slug, crumb_name, h1, eyebrow, lede, desc, inner, title=None, chips=None, faqs=None, cta_args=None, pre=None, og_title=None):
    parts = [hero(bc(crumb_name), eyebrow, h1, lede, chips=chips or [])]
    if pre:
        parts.append(pre)
    if inner:
        parts.append(_prose(inner))
    if faqs:
        parts.append(faq_html(faqs))
    if cta_args:
        parts.append(cta(*cta_args))
    content = "\n".join(parts)
    def schema(s, _d=desc, _cn=crumb_name, _f=faqs):
        g = [crumb(s, _cn), webpage(s, _cn, _d)]
        if _f:
            g.append(faqpage(s, _f))
        return graph(g)
    add(slug=slug, title=title or f"{crumb_name} | 365 Techies", desc=desc,
        og_title=og_title or f"{crumb_name} | 365 Techies", schema=schema, content=content)

UPDATED = "Last updated: June 2026"

# ---- Privacy Policy
info_page(
  slug="privacy-policy", crumb_name="Privacy Policy", eyebrow="// PRIVACY",
  h1='Privacy <em class="grad grad--cyan">policy</em>',
  lede="How 365 Techies Limited collects, uses and protects your personal information, and the rights you have over your data.",
  desc="Privacy policy for 365 Techies Limited — how we collect, use, store and protect your personal data, and your rights under UK data protection law.",
  chips=["Your data, respected","UK GDPR","Plain English"],
  inner="""          <p class="mono" style="color:var(--cyan)">%s</p>
          <h2>Who we are</h2>
          <p>365 Techies Limited (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is an IT support company registered in England &amp; Wales (company number 11073501), based in Bournemouth, Dorset. We are the data controller for the personal information described in this policy. You can reach us at <a href="mailto:help@365techies.co.uk">help@365techies.co.uk</a> or on <a href="tel:+441202775566">01202 775566</a>.</p>
          <h2>What information we collect</h2>
          <ul>
            <li>Contact details you give us &mdash; such as your name, email address, phone number and address.</li>
            <li>Details of your enquiry, your devices and your IT systems, so we can provide support.</li>
            <li>Account and billing information needed to manage your plan.</li>
            <li>Information collected automatically when you use our website, such as cookies and basic analytics.</li>
          </ul>
          <h2>How we use your information</h2>
          <ul>
            <li>To provide, manage and improve our IT support and services.</li>
            <li>To respond to your enquiries and provide customer support.</li>
            <li>To manage your account, plan and payments.</li>
            <li>To send you service-related messages.</li>
            <li>To meet our legal and regulatory obligations.</li>
          </ul>
          <h2>Our legal basis</h2>
          <p>We process your data to perform our contract with you, for our legitimate interests in running and improving our business, to comply with legal obligations, and &mdash; where required &mdash; with your consent.</p>
          <h2>Sharing your information</h2>
          <p>We never sell your data. We share it only with trusted service providers who help us deliver our services (for example Microsoft, our payment provider and our hosting provider), and only as far as needed &mdash; or where we are required to by law.</p>
          <h2>Keeping your data safe</h2>
          <p>We use appropriate technical and organisational measures to protect your personal information, and we only keep it for as long as necessary for the purposes above or to meet legal requirements.</p>
          <h2>Your rights</h2>
          <p>You have the right to access, correct, erase, restrict or object to our use of your data, to data portability, and to withdraw consent where we rely on it. You also have the right to complain to the Information Commissioner&rsquo;s Office (ICO) at <a href="https://ico.org.uk/" target="_blank" rel="noopener">ico.org.uk</a>.</p>
          <h2>Cookies</h2>
          <p>Our website uses cookies. See our <a href="/cookie-policy/">cookie policy</a> for details.</p>
          <h2>Changes to this policy</h2>
          <p>We may update this policy from time to time. The latest version will always be on this page.</p>
          <h2>Contact us</h2>
          <p>For any privacy question or to exercise your rights, contact <a href="mailto:help@365techies.co.uk">help@365techies.co.uk</a> or call <a href="tel:+441202775566">01202 775566</a>.</p>""" % UPDATED,
  cta_args=("Questions about your data?", "We&rsquo;re happy to help &mdash; get in touch any time.",
            ("Contact Us", "/contact/"), ("Cookie Policy", "/cookie-policy/")),
)

# ---- Terms of Service
info_page(
  slug="terms", crumb_name="Terms of Service", eyebrow="// TERMS",
  h1='Terms of <em class="grad grad--cyan">service</em>',
  lede="The terms on which 365 Techies Limited provides IT support and services to home and business customers.",
  desc="Terms of service for 365 Techies Limited — how we provide IT support and services, plans and payment, your responsibilities, and our mutual commitments.",
  chips=["Clear &amp; fair","No lock-in","Plain English"],
  inner="""          <p class="mono" style="color:var(--cyan)">%s</p>
          <h2>About us</h2>
          <p>These terms apply to IT support and services provided by 365 Techies Limited (company number 11073501), Bournemouth, Dorset. By using our services you agree to these terms.</p>
          <h2>Our services</h2>
          <p>We provide monthly IT support plans and one-off IT services for homes and businesses, as described on our website. The specifics of your service depend on the plan or work you choose.</p>
          <h2>Plans, payment and Direct Debit</h2>
          <p>Monthly plans are paid in advance by Direct Debit (via GoCardless). One-off work is quoted and agreed before we begin. Prices are shown on our website or in your quote.</p>
          <h2>Cancellation</h2>
          <p>Our monthly plans are rolling and cancel-anytime &mdash; there is no long lock-in contract. Just let us know and we&rsquo;ll stop your plan at the end of your current period.</p>
          <h2>Your responsibilities</h2>
          <ul>
            <li>Give us the access and accurate information we need to help you.</li>
            <li>Hold appropriate licences for your software.</li>
            <li>Keep your own copies of critical data where advised; we&rsquo;ll always recommend and can manage proper backups.</li>
          </ul>
          <h2>Remote support</h2>
          <p>Remote support is provided over encrypted Splashtop SOS, with your consent and while you watch on screen. Access ends when the session ends.</p>
          <h2>Our liability</h2>
          <p>We take great care in everything we do. To the extent permitted by law, our liability is limited to the value of the services provided. Nothing in these terms excludes any liability that cannot be excluded under law.</p>
          <h2>Data protection</h2>
          <p>We handle your personal data in line with our <a href="/privacy-policy/">privacy policy</a>.</p>
          <h2>Governing law</h2>
          <p>These terms are governed by the laws of England &amp; Wales.</p>
          <h2>Changes</h2>
          <p>We may update these terms from time to time; the current version will always be on this page.</p>
          <h2>Contact us</h2>
          <p>Questions? Email <a href="mailto:help@365techies.co.uk">help@365techies.co.uk</a> or call <a href="tel:+441202775566">01202 775566</a>.</p>""" % UPDATED,
  cta_args=("Ready to get started?", "Pick a plan or talk to a friendly techie.",
            ("View Monthly Plans", "/monthly-it-support/"), ("Contact Us", "/contact/")),
)

# ---- Cookie Policy
info_page(
  slug="cookie-policy", crumb_name="Cookie Policy", eyebrow="// COOKIES",
  h1='Cookie <em class="grad grad--cyan">policy</em>',
  lede="What cookies are, how our website uses them, and how you can control them.",
  desc="Cookie policy for 365 Techies — the cookies our website uses, why, and how to manage them in your browser.",
  chips=["Transparent","Your choice","Plain English"],
  inner="""          <p class="mono" style="color:var(--cyan)">%s</p>
          <h2>What are cookies?</h2>
          <p>Cookies are small text files stored on your device when you visit a website. They help the site work, remember your preferences and understand how it&rsquo;s used.</p>
          <h2>How we use cookies</h2>
          <ul>
            <li><strong>Essential cookies</strong> &mdash; needed for the website to work properly.</li>
            <li><strong>Analytics cookies</strong> &mdash; help us understand how visitors use the site so we can improve it.</li>
            <li><strong>Third-party cookies</strong> &mdash; set by tools we use, such as our live chat (HubSpot) and our booking system (SimplyBook), and any embedded content.</li>
          </ul>
          <h2>Managing cookies</h2>
          <p>You can control and delete cookies through your browser settings, and set your browser to refuse them. Some parts of the site may not work as well if you do.</p>
          <h2>Changes</h2>
          <p>We may update this policy; the current version will always be here.</p>
          <h2>Contact us</h2>
          <p>Questions about cookies? Email <a href="mailto:help@365techies.co.uk">help@365techies.co.uk</a>.</p>""" % UPDATED,
  cta_args=("More on your data", "See how we protect your personal information.",
            ("Privacy Policy", "/privacy-policy/"), ("Contact Us", "/contact/")),
)

# ---- Our Guarantees
info_page(
  slug="our-guarantees", crumb_name="Our Guarantees", eyebrow="// OUR PROMISE",
  h1='Our <em class="grad grad--green">guarantees</em>',
  lede="The promises we make to every 365 Techies customer — clear, honest and built on three decades of looking after Dorset homes and businesses.",
  desc="The 365 Techies service guarantees — fast response, clear pricing, no contracts, plain English, secure support and a satisfaction promise for homes and businesses.",
  chips=["No contracts","Clear pricing","Cancel anytime"],
  pre='''    <section class="section section--alt" aria-label="Our guarantees">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// WHAT YOU CAN COUNT ON</p>
          <h2 class="section-title section-title--center" data-title>Promises we keep<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
''' + grid_cards([
        ("Fast response","Most remote sessions start within minutes in opening hours &mdash; subscribers always jump the queue."),
        ("Clear, honest pricing","Fixed monthly prices shown up front, from &pound;15.95/month. No hidden fees, no surprise bills."),
        ("No contracts","Every plan is rolling and cancel-anytime. Stay because you want to, not because you&rsquo;re locked in."),
        ("Plain English, always","We explain what&rsquo;s wrong and how we&rsquo;ll fix it &mdash; patiently, and never make you feel silly."),
        ("Secure by default","Encrypted remote support, protection and verified backups built into everything we do."),
        ("Genuine care","A family business since 1995 &mdash; many customers have been with us for over a decade."),
        ("No-fix-no-fee","If we can&rsquo;t fix your device, you don&rsquo;t pay for the diagnosis. Simple as that."),
        ("12-month repair warranty","Every repair is backed by a full 12-month warranty for your peace of mind."),
      ]) + '''
        </ul>
      </div>
    </section>''',
  inner="""          <h2>Backed by three decades</h2>
          <p>We&rsquo;ve been looking after Dorset homes and businesses since 1995. These guarantees aren&rsquo;t marketing &mdash; they&rsquo;re simply how we&rsquo;ve always worked, and why our customers stay with us for years.</p>
          <p>If something isn&rsquo;t right, tell us and we&rsquo;ll put it right. That&rsquo;s our promise.</p>""",
  cta_args=("Experience the difference", "Join the Dorset homes and businesses who never worry about IT.",
            ("View Monthly Plans", "/monthly-it-support/"), ("Why Choose Us", "/why-choose-365-techies/")),
)

# ---- Meet the Team
info_page(
  slug="meet-the-team", crumb_name="Meet the Team", eyebrow="// THE TEAM",
  h1='Meet the <em class="grad grad--cyan">team</em>',
  lede="The friendly faces behind 365 Techies — a family-run team that&rsquo;s been looking after Dorset&rsquo;s technology since 1995.",
  desc="Meet the team behind 365 Techies — a family-run IT support business in Bournemouth, looking after Dorset homes and businesses with patience and care since 1995.",
  chips=["Family-run since 1995","Friendly &amp; patient","Local to Dorset"],
  inner="""          <h2>A family business, since 1995</h2>
          <p>365 Techies has been a family-run business since 1995. Over three decades, the same friendly, no-nonsense approach has driven everything we do &mdash; and many of our customers have been with us for fifteen or twenty years.</p>
          <h2>Real people, real help</h2>
          <p>When you call us, you reach a real, familiar person who knows your setup &mdash; not a call centre or a script. We&rsquo;re patient, we explain things in plain English, and there&rsquo;s no such thing as a silly question.</p>
          <p>Today we&rsquo;re Dell hardware specialists, Microsoft partners, certified Microsoft Office Specialists and a Malwarebytes Partner &mdash; but what our customers value most is simply that we genuinely care about getting it right.</p>
          <h2>Here when you need us</h2>
          <p>From our base in Bournemouth, our team supports homes, families, retired and disabled people, sole traders and small businesses right across Dorset &mdash; and remotely across the UK and Europe.</p>
          <p class="lede-note">Want to put faces to names? We&rsquo;re happy to introduce the team &mdash; just <a href="/contact/">get in touch</a>.</p>""",
  cta_args=("Talk to a real techie", "Friendly, expert help from a team that&rsquo;s been here since 1995.",
            ("Contact Us", "/contact/"), ("Why Choose Us", "/why-choose-365-techies/")),
)

# ---- Accreditations & Partners
info_page(
  slug="accreditations", crumb_name="Accreditations & Partners", eyebrow="// ACCREDITATIONS",
  h1='Accreditations &amp; <em class="grad grad--cyan">partners</em>',
  lede="The accreditations, partnerships and standards behind 365 Techies — so you know your technology is in expert, trusted hands.",
  desc="365 Techies accreditations and partners — Microsoft Partner and Office Specialists, Dell specialists, Malwarebytes Partner, Sustainable Dorset member, and the trusted tools we build on.",
  chips=["Microsoft Partner","Dell specialists","Malwarebytes Partner"],
  pre='''    <section class="section section--alt" aria-label="Accreditations and partners">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// TRUSTED &amp; CERTIFIED</p>
          <h2 class="section-title section-title--center" data-title>Expertise you can trust<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
''' + tiles([
        ("windows","Microsoft Partner","Microsoft partners and certified Microsoft Office Specialists &mdash; deep, daily Microsoft 365 expertise."),
        ("monitor","Dell Specialists","Specialists in supplying and supporting genuine Dell Latitude laptops and OptiPlex desktops."),
        ("shield","Malwarebytes Partner","An official Malwarebytes Partner, delivering award-winning protection with VPN."),
        ("leaf","Sustainable Dorset Member","Proud members of Sustainable Dorset, committed to greener business."),
        ("battery","GoCardless &amp; SiteGround","We build on trusted, FCA-regulated Direct Debit and premium managed hosting."),
        ("flow","Voipfone Phone Systems","We provide and support business phones on Voipfone, a multi-award-winning UK VoIP provider."),
        ("robot","Scan Partner","A Scan partner, supplying and supporting Unitree robots and high-end AMD Threadripper workstations built by Scan 3XS."),
        ("spark","NVIDIA Partner","An NVIDIA partner, supplying and supporting NVIDIA GeForce RTX gaming PCs and professional graphics."),
        ("monitor","Richer Sounds Partner","A Richer Sounds Bournemouth partner for home cinema, 4K projectors and Dolby sound systems."),
        ("lock","Cyber Essentials Help","We help businesses meet the government-backed Cyber Essentials standard."),
      ]) + '''
        </div>
      </div>
    </section>''',
  inner="""          <h2>Why accreditations matter</h2>
          <p>Accreditations and partnerships mean your technology is handled by people who are recognised, trained and trusted by the companies that make it. It&rsquo;s the difference between guesswork and genuine expertise.</p>
          <p>Combined with three decades of hands-on experience since 1995, it&rsquo;s why Dorset homes and businesses trust us with the technology they rely on.</p>""",
  cta_args=("Experience expert IT support", "Put our expertise to work for your home or business.",
            ("View Monthly Plans", "/monthly-it-support/"), ("Contact Us", "/contact/")),
)

# ---- Pricing
info_page(
  slug="pricing", crumb_name="Pricing", eyebrow="// PRICING",
  h1='Simple, honest <em class="grad grad--green">pricing</em>',
  lede="Clear monthly pricing with no hidden fees and no long contracts. Plans for homes from £15.95/month and businesses from £21.15/month, plus one-off help when you need it.",
  desc="365 Techies pricing — transparent monthly IT support plans for homes from £15.95/month and businesses from £21.15/month, with no contracts. One-off repairs quoted up front.",
  chips=["From &pound;15.95/mo","No contracts","No hidden fees"],
  pre='''    <section class="stats" aria-label="By the numbers">
      <div class="stats__grid">
        <div class="stat" data-reveal><p class="stat__value"><span class="stat-num" data-count="4.9" data-decimals="1">0</span></p><p class="stat__label mono">GOOGLE RATING</p></div>
        <div class="stat" data-reveal><p class="stat__value"><span class="stat-num" data-count="51">0</span><span class="stat__suffix">+</span></p><p class="stat__label mono">GOOGLE REVIEWS</p></div>
        <div class="stat" data-reveal><p class="stat__value"><span class="stat-num" data-count="30">0</span><span class="stat__suffix">+ yrs</span></p><p class="stat__label mono">SINCE 1995</p></div>
        <div class="stat" data-reveal><p class="stat__value"><span class="stat-num" data-count="28">0</span><span class="stat__suffix">+</span></p><p class="stat__label mono">AREAS COVERED</p></div>
      </div>
      <p class="stats__note mono">12-month repair warranty &middot; No-fix-no-fee repairs &middot; No long contracts</p>
    </section>
    <section class="section" aria-label="Compare plans">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>// COMPARE PLANS</p>
        <h2 class="section-title section-title--center" data-title>What&rsquo;s included, at a glance<span class="title-underline title-underline--center"></span></h2>
        <div class="cmp-wrap" data-reveal>
          <table class="cmp-table">
            <thead><tr><th>Feature</th><th>Home Essential</th><th>Home Premium</th><th>Business</th></tr></thead>
            <tbody>
              <tr><th>Friendly remote support</th><td class="yes">&#10003;</td><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th>Full service every 6 weeks</th><td class="yes">&#10003;</td><td class="yes">&#10003;</td><td>Ongoing</td></tr>
              <tr><th>Security advice &amp; setup</th><td class="yes">&#10003;</td><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th>Microsoft 365 support</th><td class="no">&ndash;</td><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th>Multiple devices / users</th><td class="no">&ndash;</td><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th>Priority response</th><td class="no">&ndash;</td><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th>Proactive monitoring</th><td class="no">&ndash;</td><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th>On-site help (Dorset)</th><td>On request</td><td>On request</td><td class="yes">&#10003;</td></tr>
              <tr><th>Response &amp; service level</th><td>Business hours</td><td>Priority queue</td><td>Priority business</td></tr>
              <tr class="cmp-price"><th>From</th><td>&pound;15.95<span>/mo</span></td><td>&pound;24.95<span>/mo</span></td><td>&pound;21.15<span>/user/mo</span></td></tr>
              <tr class="cmp-cta"><th></th><td><a href="/home-it-support-plans/">Home plans</a></td><td><a href="/home-it-support-plans/">Home plans</a></td><td><a href="/business-it-support-plans/">Business plans</a></td></tr>
            </tbody>
          </table>
        </div>
        <p class="cmp-foot mono" data-reveal>Full response targets are set out in our <a href="/service-level-agreement/">Service Level Agreement</a>. Not sure which fits? Try the <a href="/plan-finder/">Plan Finder</a>.</p>
      </div>
    </section>
    <section class="section section--alt" aria-label="What is included">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>// NO SURPRISES</p>
        <h2 class="section-title section-title--center" data-title>What&rsquo;s included vs charged separately<span class="title-underline title-underline--center"></span></h2>
        <div class="incl-grid" data-stagger>
          <div class="incl incl--yes">
            <h3>Included in your plan</h3>
            <ul>
              <li>Friendly remote support</li>
              <li>Regular maintenance &amp; health checks</li>
              <li>Security &amp; backup setup and monitoring</li>
              <li>Microsoft 365 support (on relevant plans)</li>
              <li>Honest, jargon-free advice whenever you need it</li>
              <li>No call-out fee for remote help</li>
            </ul>
          </div>
          <div class="incl incl--sep">
            <h3>Quoted separately (so there are no surprises)</h3>
            <ul>
              <li>New hardware &amp; software licences</li>
              <li>Large one-off projects &amp; migrations</li>
              <li>On-site visits outside your plan</li>
              <li>Third-party or specialist supplier costs</li>
            </ul>
          </div>
        </div>
        <p class="cmp-foot mono" data-reveal>We always agree any extra cost with you up front &mdash; never a surprise bill.</p>
      </div>
    </section>
    <section class="section" aria-label="How we compare">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>// HOW WE COMPARE</p>
        <h2 class="section-title section-title--center" data-title>Monthly support vs the alternatives<span class="title-underline title-underline--center"></span></h2>
        <div class="cmp-wrap" data-reveal>
          <table class="cmp-table cmp-table--vs">
            <thead><tr><th>&nbsp;</th><th>Pay-per-fix</th><th>Typical national MSP</th><th>365 Techies</th></tr></thead>
            <tbody>
              <tr><th>Cost</th><td>&pound;0 until it breaks &mdash; then big bills</td><td>Premium + long contracts</td><td class="hi">From &pound;15.95/mo, no contract</td></tr>
              <tr><th>Proactive maintenance</th><td class="no">&ndash;</td><td class="yes">&#10003;</td><td class="yes hi">&#10003;</td></tr>
              <tr><th>Local &amp; on-site in Dorset</th><td>Sometimes</td><td>Often remote-only</td><td class="hi">Yes &mdash; local team</td></tr>
              <tr><th>Contract</th><td>None</td><td>12&ndash;36 months typical</td><td class="hi">Rolling, cancel anytime</td></tr>
              <tr><th>Talk to a real person</th><td>Varies</td><td>Call centre / tickets</td><td class="hi">Friendly local techies</td></tr>
              <tr><th>Covers homes too</th><td>Varies</td><td>Usually business-only</td><td class="hi">Homes &amp; businesses</td></tr>
              <tr><th>Published prices</th><td class="no">&ndash;</td><td>Rarely</td><td class="yes hi">&#10003; on this page</td></tr>
            </tbody>
          </table>
        </div>
        <p class="cmp-foot mono" data-reveal>A fair, general comparison &mdash; every provider differs. <a href="/why-choose-365-techies/">Why choose us</a> &middot; <a href="/switching-it-provider/">Switching is easy</a></p>
      </div>
    </section>''',
  inner="""          <h2>Monthly home plans</h2>
          <p>Friendly monthly support for homes and families, with Essential, Family and Premium options from <strong>&pound;15.95/month</strong>. See the full breakdown on our <a href="/home-it-support-plans/">home support plans</a> page.</p>
          <h2>Monthly business plans</h2>
          <p>Reliable support for sole traders and small businesses, with Starter, Standard and Premium options from <strong>&pound;21.15/month</strong>. See our <a href="/business-it-support-plans/">business support plans</a> page.</p>
          <h2>One-off help</h2>
          <p>Need a one-off repair or project with no subscription? We&rsquo;ll quote it clearly and fairly before we start &mdash; just ask.</p>
          <h2>Not sure what you need?</h2>
          <p>Try our 30-second <a href="/plan-finder/">Plan Finder</a>, or <a href="/contact/">get in touch</a> for a no-obligation chat and quote.</p>""",
  cta_args=("Get a quote or pick a plan", "Honest pricing, no surprises &mdash; find the right fit in minutes.",
            ("Try the Plan Finder", "/plan-finder/"), ("Get a Quote", "/contact/")),
)

# ---- Free IT Health Check
info_page(
  slug="free-it-health-check", crumb_name="Free IT Health Check", eyebrow="// FREE &middot; NO OBLIGATION",
  h1='Free <em class="grad grad--green">IT health check</em>',
  lede="Not sure where you stand? Book a free, no-obligation IT health check. We&rsquo;ll review your security, backups, updates and performance and send you a clear, jargon-free report.",
  desc="Book a free, no-obligation IT health check from 365 Techies — we review your security, backups, updates and performance and send a clear, jargon-free report. No pressure to sign up.",
  chips=["100% free","No obligation","Clear report"],
  inner="""          <h2>What we check</h2>
          <ul>
            <li><strong>Security</strong> &mdash; antivirus, protection, passwords and exposure to scams and ransomware.</li>
            <li><strong>Backups</strong> &mdash; whether your important data is genuinely backed up and recoverable.</li>
            <li><strong>Updates</strong> &mdash; whether your devices and software are patched and supported.</li>
            <li><strong>Performance</strong> &mdash; what&rsquo;s slowing you down and how to fix it.</li>
          </ul>
          <h2>What you get</h2>
          <p>A clear, jargon-free report on where you stand and what (if anything) we&rsquo;d recommend &mdash; with <strong>absolutely no pressure to sign up</strong>. It&rsquo;s the easiest way to see how we can help.</p>
          <p>Prefer to start yourself? Try our free <a href="/it-health-check-tool/">instant IT Health Check tool</a> &mdash; answer a few quick questions and get a score out of 100 and a personalised action plan on the spot.</p>
          <h2>Who it&rsquo;s for</h2>
          <p>Home users and businesses alike &mdash; whether you&rsquo;re worried about security, frustrated by slow tech, or just want peace of mind.</p>""",
  cta_args=("Book your free health check", "No cost, no obligation &mdash; just a clear picture of your IT.",
            ("Book Now", "/book-service/"), ("Contact Us", "/contact/")),
)

# ---- Switching IT provider
info_page(
  slug="switching-it-provider", crumb_name="Switching IT Provider", eyebrow="// SWITCHING IS EASY",
  h1='Switching is <em class="grad grad--cyan">easy</em>',
  lede="Thinking of moving your IT support to 365 Techies? It&rsquo;s simpler than you think — we handle the handover so you barely notice the change, except that things start working better.",
  desc="Switching IT support provider to 365 Techies is easy — we manage the whole handover with no downtime, so the move is smooth and stress-free for your home or business.",
  chips=["No downtime","We do the work","Stress-free"],
  pre='''    <section class="section section--alt" aria-label="How switching works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>// HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>Switch in three easy steps<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
''' + steps([
        ("Have a chat","Tell us about your setup and what&rsquo;s frustrating you &mdash; no jargon, no pressure."),
        ("We plan the handover","We take stock of your systems, accounts and data, and plan a smooth transition."),
        ("We take it from here","We get everything set up and supported, with no downtime &mdash; you just enjoy IT that works."),
      ]) + '''
        </ol>
      </div>
    </section>''',
  inner="""          <h2>Worried it&rsquo;ll be a hassle?</h2>
          <p>Most people put off switching because they fear disruption. In reality, we do the heavy lifting &mdash; transferring what&rsquo;s needed, securing your accounts and making sure nothing is lost.</p>
          <h2>No long contracts</h2>
          <p>Our plans are rolling and cancel-anytime, so there&rsquo;s no risk in trying us. Most new customers tell us they wish they&rsquo;d switched sooner.</p>""",
  cta_args=("Ready to switch?", "Let&rsquo;s make moving to better IT support effortless.",
            ("Start the Switch", "/contact/"), ("View Monthly Plans", "/monthly-it-support/")),
)

# ---- IT support cost guide
info_page(
  slug="it-support-cost-guide", crumb_name="IT Support Cost Guide", eyebrow="// COST GUIDE",
  h1='IT support <em class="grad grad--cyan">cost guide</em>',
  lede="How much does IT support cost? A clear, honest guide to what you can expect to pay — and why monthly support usually works out cheaper than paying per problem.",
  desc="A clear guide to IT support costs in the UK — what affects pricing, monthly support vs pay-per-fix, typical price ranges, and how 365 Techies' transparent pricing works.",
  chips=["Honest &amp; clear","No jargon","Real ranges"],
  inner="""          <h2>What affects the cost of IT support?</h2>
          <ul>
            <li>Whether you&rsquo;re a home user or a business, and how many devices and users you have.</li>
            <li>Whether you choose a monthly plan or pay per problem.</li>
            <li>The level of cover &mdash; from basic help to fully managed security, backups and Microsoft 365.</li>
            <li>Whether support is remote (usually cheaper and faster) or on-site.</li>
          </ul>
          <h2>Monthly support vs pay-per-fix</h2>
          <p>Paying per problem feels cheaper until something goes wrong &mdash; then a single emergency repair can cost more than months of cover. <strong>Monthly support spreads the cost, catches problems early and includes maintenance</strong>, which usually works out cheaper and far less stressful overall.</p>
          <h2>Typical price ranges</h2>
          <p>For homes, monthly support typically starts around &pound;15&ndash;&pound;25 per month. For small businesses it&rsquo;s usually priced per user or per device, scaling with your team. One-off repairs are quoted based on the work involved.</p>
          <h2>Our pricing</h2>
          <p>We keep it simple: home plans from <strong>&pound;15.95/month</strong>, business plans from <strong>&pound;21.15/month</strong>, no contracts and no hidden fees. See our <a href="/pricing/">pricing</a> page or try the <a href="/plan-finder/">Plan Finder</a>.</p>""",
  faqs=[
    ("Is monthly IT support worth it?","For most people, yes &mdash; it spreads the cost, includes regular maintenance and catches problems before they become expensive emergencies."),
    ("Do you charge call-out fees?","Most support is remote with no call-out fee. On-site visits across Dorset are arranged when hands-on help is needed."),
    ("Can I just pay when something breaks?","Yes &mdash; we offer one-off repairs with no subscription, quoted up front. Many customers then move to a plan to avoid future problems."),
  ],
  cta_args=("Get a clear quote", "Honest pricing with no surprises &mdash; find the right fit for you.",
            ("Try the Plan Finder", "/plan-finder/"), ("Get a Quote", "/contact/")),
)

# ---- Jargon buster
def it_jargon_buster():
    slug = "it-jargon-buster"
    desc = "A plain-English A-Z IT glossary from 365 Techies — clear, simple explanations of common technology terms like the cloud, VPN, ransomware, MFA, phishing, MSP, SSD, VoIP, encryption and more."
    TERMS = [
      ("Antivirus", "Software that detects and removes malicious programs from your devices."),
      ("Backup", "A separate copy of your data, kept safe so you can recover it if your device is lost, broken or attacked."),
      ("Bandwidth", "How much data your internet connection can carry at once &mdash; more bandwidth means faster, smoother use."),
      ("The cloud", "Storing files and running software over the internet instead of only on your own computer, so you can reach them anywhere."),
      ("Cyber Essentials", "A UK government-backed certification showing a business has the essential security controls in place."),
      ("Data breach", "When personal or business information is stolen or exposed from a company&rsquo;s systems."),
      ("DNS", "The internet&rsquo;s address book &mdash; it turns website names like 365techies.co.uk into the numbers computers use to connect."),
      ("Encryption", "Scrambling data so only someone with the key can read it &mdash; protecting information if a device is lost or intercepted."),
      ("Endpoint", "Any device that connects to your network &mdash; a laptop, PC, phone or tablet."),
      ("Firewall", "A barrier that controls what&rsquo;s allowed in and out of your network, blocking unwanted traffic."),
      ("Hardware", "The physical parts of your tech &mdash; the computer, screen, router, printer and so on."),
      ("IP address", "A unique number that identifies a device on a network or the internet."),
      ("Malware", "A catch-all term for harmful software &mdash; viruses, spyware, ransomware &mdash; that can damage devices or steal data."),
      ("MFA (Multi-Factor Authentication)", "An extra login step, like a code on your phone, so a stolen password alone isn&rsquo;t enough to get in."),
      ("Microsoft 365", "Microsoft&rsquo;s subscription bundle of Outlook, Word, Excel, Teams and online storage, for home and business."),
      ("MSP (Managed Service Provider)", "A company that proactively manages your IT for a monthly fee &mdash; like an outsourced IT department."),
      ("NAS (Network Attached Storage)", "A shared storage box on your network that everyone can save to and back up to."),
      ("Operating system", "The core software that runs a device, such as Windows or Android."),
      ("Patch / update", "A fix from a software maker that improves security or sorts out bugs &mdash; keeping up to date is vital."),
      ("Phishing", "Fake emails or messages designed to trick you into giving away passwords, money or personal details."),
      ("Ransomware", "Malicious software that locks up your files and demands payment to release them. Good backups are the best defence."),
      ("Remote support", "When we securely connect to your device over the internet to fix a problem, while you watch on screen."),
      ("Router", "The box that connects your home or office to the internet and shares it over Wi-Fi and cables."),
      ("SaaS (Software as a Service)", "Software you subscribe to and use online, rather than installing it once."),
      ("Server", "A powerful central computer that stores files or runs services for other devices on a network."),
      ("SLA (Service Level Agreement)", "A written promise of the service levels you can expect, such as response times."),
      ("Smishing", "Phishing carried out by text message."),
      ("Software", "The programs and apps that run on your devices, as opposed to the physical hardware."),
      ("SSD (Solid State Drive)", "Fast, modern storage with no moving parts &mdash; upgrading from an old hard drive transforms a slow computer."),
      ("SSL / HTTPS", "The padlock in your browser &mdash; it encrypts the connection between you and a website."),
      ("VoIP (Voice over IP)", "Making phone calls over the internet instead of a traditional phone line."),
      ("VPN (Virtual Private Network)", "A secure, encrypted connection that keeps your internet activity private, especially on public Wi-Fi."),
      ("Vulnerability", "A weakness in software or a system that attackers can exploit &mdash; patching closes them."),
      ("Wi-Fi", "Wireless internet access within your home or office."),
      ("Zero-day", "A brand-new security flaw that&rsquo;s being exploited before a fix exists."),
    ]
    EXTRA = [
      ("AI hallucination", "When an AI confidently gives an answer that&rsquo;s actually wrong or made up &mdash; always check anything important."),
      ("Business continuity", "Planning so your business keeps running, or recovers fast, if IT, premises or staff are disrupted."),
      ("Copilot", "Microsoft&rsquo;s built-in AI assistant in Windows and Microsoft 365 that helps you write, summarise and get things done."),
      ("Dictation / voice control", "Typing or controlling your computer by speaking, instead of using a keyboard or mouse."),
      ("High contrast", "A display mode with strong colour differences (such as white on black) that&rsquo;s easier to read."),
      ("LLM", "Large Language Model &mdash; the kind of AI behind tools like ChatGPT and Copilot that understands and writes text."),
      ("Magnification", "Built-in tools that enlarge part of the screen to make it easier to see."),
      ("Prompt", "The instruction or question you type into an AI tool to tell it what you want."),
      ("RTO / RPO", "Recovery Time / Recovery Point Objective &mdash; how fast you need to be back up, and how much data you can afford to lose, after a disaster."),
      ("Screen reader", "Software that reads what&rsquo;s on screen aloud, helping people with little or no sight use a computer."),
    ]
    rows = "".join(f"          <h3>{t}</h3>\n          <p>{d}</p>\n" for t, d in TERMS)
    rows2 = "".join(f"          <h3>{t}</h3>\n          <p>{d}</p>\n" for t, d in EXTRA)
    inner = ('          <h2>An A&ndash;Z of common IT terms</h2>\n' + rows +
             '          <h2>Accessibility &amp; AI terms</h2>\n' + rows2 +
             '          <p class="lede-note">Come across a term we haven&rsquo;t covered? <a href="/contact/">Ask us</a> &mdash; we love explaining things in plain English.</p>')
    content = "\n".join([
      hero(bc("IT Jargon Buster"), "// A&ndash;Z GLOSSARY",
           'IT <em class="grad grad--cyan">jargon buster</em>',
           "Confused by tech speak? Our plain-English A&ndash;Z glossary explains the common IT terms you&rsquo;ll come across &mdash; no jargon, no nonsense.",
           cta1=("Contact Us", "/contact/"), cta2=("Read our IT Advice", "/it-advice/"),
           chips=["Plain English","A&ndash;Z of tech","45+ terms"]),
      _prose(inner),
      cta("Still got questions?", "No jargon, no silly questions &mdash; just friendly, clear help whenever you need it.",
          primary=("Contact Us", "/contact/"), secondary=("Read our IT Advice", "/it-advice/")),
    ])
    def schema(s, _d=desc, _t=TERMS + EXTRA):
        return graph([crumb(s, "IT Jargon Buster"), webpage(s, "IT Jargon Buster", _d, "CollectionPage"),
                      {"@type": "DefinedTermSet", "@id": SITE + "/" + s + "/#glossary", "name": "IT Jargon Buster",
                       "description": _d,
                       "hasDefinedTerm": [{"@type": "DefinedTerm", "name": t.split(" (")[0],
                                           "description": d.replace("&mdash;", "-").replace("&rsquo;", "'").replace("&amp;", "and")} for t, d in _t]}])
    add(slug=slug, title="IT Jargon Buster | Plain-English A-Z IT Glossary | 365 Techies",
        desc=desc, og_title="IT Jargon Buster | 365 Techies", schema=schema, content=content)
it_jargon_buster()

# ---- Cybersecurity checklist
info_page(
  slug="cybersecurity-checklist", crumb_name="Cybersecurity Checklist", eyebrow="// FREE CHECKLIST",
  h1='Free cybersecurity <em class="grad grad--green">checklist</em>',
  lede="Ten practical steps to protect yourself and your business online. Work through them yourself — or let us handle the lot as part of a support plan.",
  desc="A free cybersecurity checklist from 365 Techies — ten practical steps to protect your home or business from scams, malware and ransomware. Do it yourself or let us handle it.",
  chips=["10 practical steps","Home &amp; business","Free to use"],
  inner="""          <p class="no-print"><button type="button" class="button secondary" onclick="window.print()">&#128424; Print / Save as PDF</button></p>
          <h2>Your 10-step cybersecurity checklist</h2>
          <ol>
            <li><strong>Turn on multi-factor authentication (MFA)</strong> for email, banking and key accounts.</li>
            <li><strong>Use strong, unique passwords</strong> &mdash; ideally with a password manager.</li>
            <li><strong>Keep everything updated</strong> &mdash; Windows, browsers and apps.</li>
            <li><strong>Run proper protection</strong> &mdash; reputable antivirus and web protection on every device.</li>
            <li><strong>Back up your data</strong> automatically, with at least one off-site copy.</li>
            <li><strong>Think before you click</strong> &mdash; be wary of unexpected links and attachments.</li>
            <li><strong>Check email senders carefully</strong> &mdash; scammers imitate people and brands you trust.</li>
            <li><strong>Secure your Wi-Fi</strong> with a strong password and a separate guest network.</li>
            <li><strong>Lock your devices</strong> with a PIN, password or biometrics.</li>
            <li><strong>Have someone to ask</strong> &mdash; a real person to check &lsquo;is this safe?&rsquo; before you act.</li>
          </ol>
          <h2>Want us to handle it for you?</h2>
          <p>Every step above is included and managed as part of our support plans &mdash; alongside <a href="/malwarebytes-premium/">Malwarebytes Premium</a>, monitoring and verified <a href="/backup-support/">backups</a>. See our <a href="/cybersecurity-support/">cybersecurity</a> page.</p>""",
  cta_args=("Let us secure you", "We&rsquo;ll handle every step and keep you protected 24/7.",
            ("Get Protected", "/cybersecurity-support/"), ("Free Health Check", "/free-it-health-check/")),
)

# ---- System status
info_page(
  slug="system-status", crumb_name="System Status", eyebrow="// SYSTEM STATUS",
  h1='System <em class="grad grad--green">status</em>',
  lede="The current status of 365 Techies services, and how to reach us fast if you&rsquo;re having a problem.",
  desc="365 Techies system status — current service status and how to get fast help, including emergency remote support via Splashtop SOS.",
  chips=["Here to help","Fast support","SOS available"],
  inner="""          <h2>Current status</h2>
          <p><strong style="color:var(--green)">&#9679; All services operational.</strong> Our support lines, remote support and booking system are running normally.</p>
          <h2>Having a problem?</h2>
          <p>If something&rsquo;s not working for you, we&rsquo;re here to help &mdash; whatever the status above says:</p>
          <ul>
            <li><strong>Call us:</strong> <a href="tel:+441202775566">01202 775566</a> (Mon&ndash;Fri, 9am&ndash;5pm).</li>
            <li><strong>Email us:</strong> <a href="mailto:help@365techies.co.uk">help@365techies.co.uk</a>.</li>
            <li><strong>Emergency remote support:</strong> download <a href="https://sos.splashtop.com/en/sos-download" target="_blank" rel="noopener">Splashtop SOS</a> and call us to connect securely.</li>
          </ul>
          <h2>Planned maintenance</h2>
          <p>Any planned maintenance that might affect services will be noted here in advance. There is nothing scheduled at present.</p>""",
  cta_args=("Need help right now?", "Subscribers jump the queue &mdash; reach a real techie fast.",
            ("Contact Us", "/contact/"), ("SOS Remote Support", "https://sos.splashtop.com/en/sos-download")),
)

# ---- Support Portal / Raise a Ticket
info_page(
  slug="support-portal", crumb_name="Support Portal", eyebrow="// SUPPORT PORTAL",
  h1='Get help, <em class="grad grad--green">fast</em>',
  lede="Need a hand? Raise a support ticket, start a secure remote session or call us — whatever suits you. Subscribers always jump the queue.",
  desc="365 Techies support portal — raise a support ticket, start secure remote support or call us. Fast, friendly IT help for homes and businesses across Dorset.",
  chips=["Raise a ticket","Remote support","Subscribers jump the queue"],
  pre='''    <section class="section section--alt" aria-label="Ways to get help">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// GET HELP FAST</p>
          <h2 class="section-title section-title--center" data-title>Three ways to get help<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="blog-grid" data-stagger>
          <a class="post-card" href="#ticket"><p class="post-card__cat">Log it</p><h3>Raise a ticket</h3><p>Tell us what&rsquo;s wrong and we&rsquo;ll pick it up and reply within one working day.</p><span class="post-card__more">Open the form &#8595;</span></a>
          <a class="post-card" href="/remote-support/"><p class="post-card__cat">Right now</p><h3>Start remote support</h3><p>Let us connect securely and fix it while you watch &mdash; usually in minutes.</p><span class="post-card__more">Get connected &#8594;</span></a>
          <a class="post-card" href="tel:+441202775566"><p class="post-card__cat">Talk to us</p><h3>Call us</h3><p>01202 775566, Monday to Friday, 9am&ndash;5pm. A real, friendly techie.</p><span class="post-card__more">Call now &#8594;</span></a>
        </div>
      </div>
    </section>
    <section class="section" id="ticket" aria-label="Raise a ticket">
      <div class="wrap" style="max-width:700px;margin:0 auto">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// RAISE A TICKET</p>
          <h2 class="section-title section-title--center" data-title>Log a support ticket<span class="title-underline title-underline--center"></span></h2>
        </div>
        <form class="contact-form" data-reveal action="mailto:help@365techies.co.uk" method="post" enctype="text/plain">
          <label class="field"><span>Your name</span><input type="text" name="name" autocomplete="name" required /></label>
          <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required /></label>
          <label class="field"><span>Phone (optional)</span><input type="tel" name="phone" autocomplete="tel" /></label>
          <label class="field"><span>What do you need help with?</span>
            <select name="topic">
              <option>Computer or laptop problem</option>
              <option>Email or Microsoft 365</option>
              <option>Wi-Fi or network</option>
              <option>Printer</option>
              <option>Security or virus concern</option>
              <option>New device or setup</option>
              <option>Something else</option>
            </select>
          </label>
          <label class="field"><span>Describe the problem</span><textarea name="message" required></textarea></label>
          <button type="submit" class="button primary button--lg" style="width:100%">Send Ticket to help@365techies.co.uk</button>
          <p class="form-status mono" role="status" style="margin-top:1rem;color:var(--faint);font-size:.7rem">// SENDS STRAIGHT TO help@365techies.co.uk &middot; WE REPLY WITHIN ONE WORKING DAY</p>
        </form>
      </div>
    </section>''',
  inner="""          <h2>How it works</h2>
          <p>Raise a ticket above and it goes straight to our team. We&rsquo;ll acknowledge it and get back to you within one working day &mdash; usually much sooner. <strong>Subscribers on a monthly plan always jump the queue</strong> for priority support.</p>
          <h2>Need it fixed right now?</h2>
          <p>For anything urgent, <a href="/remote-support/">start a remote support session</a> or call us on <a href="tel:+441202775566">01202 775566</a>. For hardware drop-off or collection, see <a href="/book-a-collection/">book a collection</a>.</p>""",
  cta_args=("Want priority support as standard?", "Join a monthly plan and your tickets always jump the queue.",
            ("View Monthly Plans", "/monthly-it-support/"), ("Contact Us", "/contact/")),
)

# ---- Book a Collection
info_page(
  slug="book-a-collection", crumb_name="Book a Collection", eyebrow="// COLLECTION & DROP-OFF",
  h1='Book a <em class="grad grad--cyan">collection</em> or drop-off',
  lede="Computer playing up and need hands-on help? Book a convenient collection, or drop your device off with us — we'll diagnose, fix and get it back to you, with no-fix-no-fee on diagnosis.",
  desc="Book a computer or laptop collection or drop-off with 365 Techies in Bournemouth, Poole and Dorset. We collect, diagnose, repair and return your device — no-fix-no-fee on diagnosis.",
  chips=["Collection or drop-off","No-fix-no-fee","Local to Dorset"],
  pre='''    <section class="section section--alt" aria-label="How collection works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>// HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>Sorted in four simple steps<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
''' + steps([
        ("Tell us about it","Fill in the form below or call us &mdash; tell us the device and the problem."),
        ("Collect or drop off","We arrange a convenient local collection, or you drop it off with us."),
        ("We diagnose &amp; fix","We diagnose it (no-fix-no-fee) and, with your go-ahead, carry out the repair."),
        ("Back to you","We return your device fully working, with a warranty on the repair."),
      ]) + '''
        </ol>
      </div>
    </section>
    <section class="section" id="book" aria-label="Request a collection">
      <div class="wrap" style="max-width:700px;margin:0 auto">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// REQUEST IT</p>
          <h2 class="section-title section-title--center" data-title>Request a collection or drop-off<span class="title-underline title-underline--center"></span></h2>
        </div>
        <form class="contact-form" data-reveal action="mailto:help@365techies.co.uk" method="post" enctype="text/plain">
          <label class="field"><span>Your name</span><input type="text" name="name" autocomplete="name" required /></label>
          <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required /></label>
          <label class="field"><span>Phone</span><input type="tel" name="phone" autocomplete="tel" required /></label>
          <label class="field"><span>Collection or drop-off?</span>
            <select name="topic">
              <option>Please collect from me</option>
              <option>I&rsquo;ll drop it off</option>
              <option>Not sure &mdash; please advise</option>
            </select>
          </label>
          <label class="field"><span>Device &amp; problem (and your area for collection)</span><textarea name="message" required></textarea></label>
          <button type="submit" class="button primary button--lg" style="width:100%">Send Request to help@365techies.co.uk</button>
          <p class="form-status mono" role="status" style="margin-top:1rem;color:var(--faint);font-size:.7rem">// SENDS STRAIGHT TO help@365techies.co.uk &middot; WE REPLY WITHIN ONE WORKING DAY</p>
        </form>
      </div>
    </section>''',
  inner="""          <h2>What we repair</h2>
          <p>Laptops and desktop PCs, slow computers, virus and malware removal, Windows problems, SSD and memory upgrades, data recovery and new computer setup. See our <a href="/computer-repairs/">computer repairs</a> page for the full list.</p>
          <h2>No-fix-no-fee &amp; warranty</h2>
          <p><strong>If we can&rsquo;t fix it, you don&rsquo;t pay for the diagnosis</strong> &mdash; and every repair is backed by a <strong>12-month warranty</strong>. We&rsquo;ll always quote clearly before doing any chargeable work.</p>
          <h2>Where we cover</h2>
          <p>We collect across Bournemouth, Poole, Christchurch and the wider Dorset area. Not sure if we reach you? Just ask on the form or call <a href="tel:+441202775566">01202 775566</a>.</p>""",
  cta_args=("Prefer a remote fix first?", "Many problems are sorted remotely in minutes &mdash; no collection needed.",
            ("Start Remote Support", "/remote-support/"), ("Call 01202 775566", "tel:+441202775566")),
)

# ---- Service Level Agreement (SLA)
info_page(
  slug="service-level-agreement", crumb_name="Service Level Agreement", eyebrow="// SLA",
  h1='Service Level <em class="grad grad--green">Agreement</em>',
  lede="Clear, honest commitments on how quickly we respond and how we keep your IT running — the service levels you can rely on from 365 Techies.",
  desc="365 Techies Service Level Agreement (SLA) — support hours, priority levels, target response and resolution times, service availability and escalation for our monthly support customers.",
  chips=["Clear response targets","Priority support","Honest commitments"],
  pre='''    <section class="section section--alt" aria-label="Support hours and channels">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// SUPPORT HOURS &amp; CHANNELS</p>
          <h2 class="section-title section-title--center" data-title>How and when to reach us<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
''' + tiles([
        ("clock","Standard support hours","Monday to Friday, 9am&ndash;5pm (excluding bank holidays)."),
        ("bolt","Out-of-hours","Emergency and out-of-hours cover available by arrangement on business plans."),
        ("flow","How to reach us","Phone, email, the online support portal/ticket, and secure remote support."),
        ("shield","Priority for subscribers","Customers on a monthly plan always jump the queue for support."),
      ]) + '''
        </div>
      </div>
    </section>
    <section class="section" aria-label="Priority levels and response targets">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// PRIORITY LEVELS</p>
          <h2 class="section-title section-title--center" data-title>Target response &amp; resolution times<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>We prioritise every issue by its impact, so the most urgent problems get the fastest response. Times are measured in working hours, within our standard support hours.</p>
        </div>
        <div class="price-table-wrap" data-reveal>
          <table class="price-table">
            <thead>
              <tr><th scope="col">Priority</th><th scope="col">What it means</th><th scope="col">Target response</th><th scope="col">Target resolution</th></tr>
            </thead>
            <tbody>
              <tr><th scope="row">P1 &mdash; Critical</th><td>Business-critical systems down; multiple users unable to work.</td><td>Within 1 working hour</td><td>Same working day (fix or workaround)</td></tr>
              <tr><th scope="row">P2 &mdash; High</th><td>Major issue affecting a user&rsquo;s work or a key function.</td><td>Within 2 working hours</td><td>Within 1 working day</td></tr>
              <tr><th scope="row">P3 &mdash; Medium</th><td>Non-urgent issue with a workaround available.</td><td>Within 4 working hours</td><td>Within 2 working days</td></tr>
              <tr><th scope="row">P4 &mdash; Low</th><td>Requests, questions and minor issues.</td><td>Within 1 working day</td><td>Within 3&ndash;5 working days</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>''',
  inner="""          <h2>Our commitment</h2>
          <p>We aim to acknowledge and respond to every support request within the target times above, and to keep you informed at every step until it&rsquo;s resolved. These targets apply to customers on a monthly support plan; one-off and pay-as-you-go work is handled on a best-effort basis.</p>
          <h2>Service availability</h2>
          <p>For managed and hosted services (such as hosting and cloud systems we manage on your behalf), we target <strong>99.9% availability</strong>, excluding planned maintenance and factors outside our reasonable control (such as third-party outages or your internet connection).</p>
          <h2>Planned maintenance</h2>
          <p>Where maintenance might affect a service, we&rsquo;ll give reasonable notice and schedule it outside business hours wherever possible to minimise disruption.</p>
          <h2>Escalation</h2>
          <p>If an issue isn&rsquo;t progressing as it should, you can ask us to escalate it at any time &mdash; just call <a href="tel:+441202775566">01202 775566</a> and we&rsquo;ll prioritise it personally.</p>
          <h2>Reporting &amp; reviews</h2>
          <p>Business customers can request regular service reviews so you can see how we&rsquo;re performing against these targets, and we&rsquo;ll always discuss anything that needs improving.</p>
          <h2>The small print</h2>
          <p>This page is a plain-English summary of the service levels we aim for. Exact targets and scope can vary by plan and are confirmed in your individual agreement. It works alongside our <a href="/our-guarantees/">guarantees</a> and <a href="/terms/">terms of service</a>.</p>""",
  faqs=[
    ("What is an SLA?", "A Service Level Agreement sets out the service you can expect from us &mdash; how quickly we respond, how we prioritise issues, and the standards we hold ourselves to."),
    ("Do these response times apply to everyone?", "The target times apply to customers on a monthly support plan, who always get priority. One-off work is handled on a best-effort basis."),
    ("What counts as a &lsquo;Critical&rsquo; issue?", "Anything that stops business-critical systems or leaves multiple people unable to work &mdash; for example a server, email or network outage. These get our fastest response."),
    ("What happens if you miss a target?", "We&rsquo;ll tell you, explain why, and put it right &mdash; and we&rsquo;ll review what happened so it doesn&rsquo;t recur. We&rsquo;d always rather over-deliver."),
    ("Is the 99.9% availability guaranteed?", "It&rsquo;s our target for services we manage, excluding planned maintenance and things outside our control like third-party or broadband outages."),
  ],
  cta_args=("Support you can count on", "Get priority support backed by clear service levels &mdash; included with every monthly plan.",
            ("View Monthly Plans", "/monthly-it-support/"), ("Our Guarantees", "/our-guarantees/")),
)

# ---- Resources hub
info_page(
  slug="resources", crumb_name="Resources & Guides", eyebrow="// RESOURCES",
  h1='Resources &amp; <em class="grad grad--cyan">guides</em>',
  lede="Free, practical IT resources from 365 Techies &mdash; plain-English guides, checklists, a cost guide, a jargon buster and a free IT health check to help you get the most from your technology.",
  desc="Free IT resources and guides from 365 Techies — IT advice articles, cyber threats explained, a cybersecurity checklist, IT cost guide, A-Z jargon buster, plan finder and a free IT health check.",
  chips=["Free to use","Plain English","Home &amp; business"],
  pre='''    <section class="section section--alt" aria-label="Resources and guides">
      <div class="wrap">
        <div class="blog-grid" data-stagger>
          <a class="post-card" href="/it-advice/"><p class="post-card__cat">Guides</p><h3>IT Advice Hub</h3><p>25+ plain-English guides on home and business IT, Microsoft 365, security and Windows.</p><span class="post-card__more">Read the guides &#8594;</span></a>
          <a class="post-card" href="/cyber-threats/"><p class="post-card__cat">Security</p><h3>Cyber Threats Explained</h3><p>Ransomware, phishing, scams and more &mdash; what they are and how to stay safe.</p><span class="post-card__more">Stay safe &#8594;</span></a>
          <a class="post-card" href="/cybersecurity-checklist/"><p class="post-card__cat">Checklist</p><h3>Cybersecurity Checklist</h3><p>Ten practical steps to protect yourself &mdash; print it or save it as a PDF.</p><span class="post-card__more">Get the checklist &#8594;</span></a>
          <a class="post-card" href="/it-jargon-buster/"><p class="post-card__cat">Glossary</p><h3>IT Jargon Buster</h3><p>An A&ndash;Z of common tech terms, explained in plain English.</p><span class="post-card__more">Bust the jargon &#8594;</span></a>
          <a class="post-card" href="/it-support-cost-guide/"><p class="post-card__cat">Pricing</p><h3>IT Cost Guide</h3><p>What IT support really costs, and how to get the best value for your money.</p><span class="post-card__more">See the guide &#8594;</span></a>
          <a class="post-card" href="/plan-finder/"><p class="post-card__cat">Tool</p><h3>Plan Finder</h3><p>Answer three quick questions and we&rsquo;ll recommend the right plan for you.</p><span class="post-card__more">Find your plan &#8594;</span></a>
          <a class="post-card" href="/it-health-check-tool/"><p class="post-card__cat">Tool</p><h3>IT Health Check Tool</h3><p>Get an instant IT &amp; security score out of 100, plus a plain-English action plan &mdash; no sign-up.</p><span class="post-card__more">Check your score &#8594;</span></a>
          <a class="post-card" href="/windows-10-end-of-life/"><p class="post-card__cat">Act now</p><h3>Windows 10 End of Life</h3><p>Support ended in October 2025. Find out in 30 seconds if you&rsquo;re affected &mdash; and your options.</p><span class="post-card__more">Are you affected? &#8594;</span></a>
          <a class="post-card" href="/quick-quote/"><p class="post-card__cat">Tool</p><h3>Quick Quote</h3><p>Get a free, no-obligation quote or cost comparison in under a minute.</p><span class="post-card__more">Get a quote &#8594;</span></a>
          <a class="post-card" href="/broadband-speed-checker/"><p class="post-card__cat">Tool</p><h3>Broadband Speed Checker</h3><p>Is your internet fast enough? Get a recommended speed in 30 seconds.</p><span class="post-card__more">Check your speed &#8594;</span></a>
          <a class="post-card" href="/spot-the-scam/"><p class="post-card__cat">Quiz</p><h3>Spot the Scam</h3><p>Can you tell a scam from the real thing? Take the free 6-round quiz.</p><span class="post-card__more">Take the quiz &#8594;</span></a>
          <a class="post-card" href="/coverage-checker/"><p class="post-card__cat">Tool</p><h3>Coverage Checker</h3><p>Pop in your postcode to see if we cover your area on-site.</p><span class="post-card__more">Check coverage &#8594;</span></a>
          <a class="post-card" href="/using-ai-safely/"><p class="post-card__cat">Guide</p><h3>Using AI Safely</h3><p>Get value from Copilot &amp; ChatGPT without the risks &mdash; in plain English.</p><span class="post-card__more">Read the guide &#8594;</span></a>
          <a class="post-card" href="/plain-english/"><p class="post-card__cat">Guide</p><h3>Tech in Plain English</h3><p>The tech terms and services people ask about most, explained simply.</p><span class="post-card__more">No jargon &#8594;</span></a>
          <a class="post-card" href="/pre-call-checklists/"><p class="post-card__cat">Checklist</p><h3>Get-Ready Checklists</h3><p>Feel prepared before you call, book a repair or set up a new PC.</p><span class="post-card__more">Get ready &#8594;</span></a>
          <a class="post-card" href="/computer-fault-checker/"><p class="post-card__cat">Tool</p><h3>Computer Fault Checker</h3><p>Tell us what&rsquo;s playing up and get the likely cause &amp; best next step.</p><span class="post-card__more">Diagnose it &#8594;</span></a>
          <a class="post-card" href="/choosing-it-support/"><p class="post-card__cat">Guide</p><h3>How to Choose IT Support</h3><p>10 questions to ask any IT company before you commit.</p><span class="post-card__more">Read the guide &#8594;</span></a>
          <a class="post-card" href="/free-it-health-check/"><p class="post-card__cat">Free</p><h3>Free IT Health Check</h3><p>A free, no-obligation review of your security, backups, updates and performance.</p><span class="post-card__more">Book a check &#8594;</span></a>
          <a class="post-card" href="/switching-it-provider/"><p class="post-card__cat">Switching</p><h3>Switching to Us</h3><p>How easy it is to move your IT support to 365 Techies &mdash; with no downtime.</p><span class="post-card__more">How it works &#8594;</span></a>
        </div>
      </div>
    </section>''',
  inner="""          <h2>Need a hand applying any of this?</h2>
          <p>Every guide and tool here is something we handle for our customers every day. If you&rsquo;d rather we just sorted it, get friendly monthly IT support for your home or business &mdash; or book a free IT health check.</p>""",
  cta_args=("Rather we just sorted it?", "Get friendly, proactive IT support from your local team &mdash; or start with a free health check.",
            ("View Monthly Plans", "/monthly-it-support/"), ("Free IT Health Check", "/free-it-health-check/")),
)

# ---- Using AI Safely (beginner guide)
info_page(
  slug="using-ai-safely", crumb_name="Using AI Safely", eyebrow="// EVERYDAY AI",
  h1='Using AI <em class="grad grad--cyan">safely</em>',
  lede="AI tools like Copilot, ChatGPT, Gemini and Claude can save you hours &mdash; if you use them wisely. Here&rsquo;s a friendly, plain-English guide to getting real value from AI without putting your data or yourself at risk.",
  desc="A beginner-friendly, plain-English guide to using AI (Microsoft Copilot, ChatGPT, Gemini, Claude) safely — what it can and can't do, the golden rules, AI scams to watch for, and when to use it. From 365 Techies.",
  chips=["Plain English", "Stay safe", "Home &amp; business"],
  inner="""          <h2>What everyday AI can (and can&rsquo;t) do</h2>
          <p>Tools like Microsoft Copilot, ChatGPT, Google Gemini and Claude are brilliant at drafting emails, summarising long documents, explaining things simply and sparking ideas. They are <strong>not</strong> always right, though &mdash; they can sound confident while being completely wrong (this is called a &ldquo;hallucination&rdquo;), so always sanity-check anything important.</p>
          <h2>The golden rules for staying safe</h2>
          <ul>
            <li><strong>Never paste private or sensitive information</strong> &mdash; passwords, bank details, customer data or anything confidential &mdash; into a public AI tool.</li>
            <li><strong>Check before you trust</strong> &mdash; treat AI answers as a helpful first draft, not gospel, especially for money, health, legal or technical decisions.</li>
            <li><strong>Watch for AI-powered scams</strong> &mdash; criminals use AI to write convincing phishing emails and even clone voices. Stay sceptical of urgent or unexpected requests.</li>
            <li><strong>Use the business-grade versions</strong> &mdash; Microsoft 365 Copilot keeps your data inside your secure tenancy, unlike free public tools.</li>
          </ul>
          <h2>&ldquo;Should I use AI for this?&rdquo;</h2>
          <ul>
            <li><strong>Great for:</strong> drafting and rewording, summarising, explaining jargon, brainstorming and first drafts.</li>
            <li><strong>Be careful with:</strong> anything factual you can&rsquo;t verify, or that affects money or safety.</li>
            <li><strong>Avoid:</strong> pasting in anything private, confidential or regulated.</li>
          </ul>
          <h2>We&rsquo;ll help you use it well</h2>
          <p>We help homes and businesses adopt AI confidently and safely &mdash; see our <a href="/ai-training/">AI training &amp; adoption</a> service, or our <a href="/agentic-ai-systems/">custom agentic AI systems</a> that automate real business tasks.</p>""",
  faqs=[
    ("Is ChatGPT safe to use?", "Yes for everyday drafting and learning &mdash; as long as you never paste in private, confidential or sensitive information and you check important answers. For business data, use a business-grade tool like Microsoft 365 Copilot."),
    ("What is an AI &ldquo;hallucination&rdquo;?", "It&rsquo;s when an AI gives a confident answer that&rsquo;s actually wrong or made up. Always verify anything that matters before relying on it."),
    ("Can AI be used to scam me?", "Yes &mdash; criminals use AI to write convincing scam emails and even imitate voices, so be extra wary of urgent or unexpected requests. Our <a href=\"/spot-the-scam/\">Spot the Scam quiz</a> helps you practise spotting them."),
    ("Can you train our team to use AI safely?", "Absolutely &mdash; that&rsquo;s exactly what our <a href=\"/ai-training/\">AI training</a> service does, tailored to how your team works."),
  ],
  cta_args=("Want to use AI with confidence?", "We&rsquo;ll show you and your team how to get real value from AI, safely.",
            ("Explore AI Training", "/ai-training/"), ("Talk to a Techie", "/contact/")),
)

# ---- Plain-English hub
info_page(
  slug="plain-english", crumb_name="Tech in Plain English", eyebrow="// NO JARGON",
  h1='Tech in <em class="grad grad--green">plain English</em>',
  lede="Technology shouldn&rsquo;t need a dictionary. Here are the things people ask us about most, explained simply &mdash; no jargon, just what it means and why it matters for you.",
  desc="The most common IT terms and services explained in plain English by 365 Techies — backups, online security, Microsoft 365, remote support, monthly support and the cloud, with no jargon.",
  chips=["No jargon", "Written for you", "Just ask"],
  inner="""          <p>We&rsquo;re famous for being patient and jargon-free. Here are the things we&rsquo;re asked about most &mdash; in everyday language.</p>
          <h2>Backups</h2>
          <p>A backup is simply a spare copy of your files and photos, kept somewhere safe, so you can get them back if your device is lost, broken or attacked. <a href="/backup-support/">How we handle backups &#8594;</a></p>
          <h2>Online security</h2>
          <p>Good security is mostly a few sensible habits &mdash; strong passwords, a second login step, and keeping things updated &mdash; plus protection working quietly in the background. <a href="/cybersecurity-support/">How we keep you safe &#8594;</a></p>
          <h2>Microsoft 365</h2>
          <p>Microsoft 365 is the modern version of Office &mdash; your email (Outlook), Word, Excel, Teams and online storage (OneDrive), all kept up to date for a monthly fee. <a href="/microsoft-365-support/">Microsoft 365 support &#8594;</a></p>
          <h2>Remote support</h2>
          <p>Remote support means we securely connect to your computer over the internet (only when you let us) to fix things &mdash; usually in minutes, with no-one needing to visit. <a href="/remote-it-support/">How remote support works &#8594;</a></p>
          <h2>Monthly IT support</h2>
          <p>Instead of paying every time something breaks, you pay one small monthly fee and we look after everything &mdash; fixing problems and preventing them. <a href="/monthly-it-support/">What&rsquo;s included &#8594;</a></p>
          <h2>The cloud</h2>
          <p>&ldquo;The cloud&rdquo; just means storing your files and email on secure internet servers instead of only on your device &mdash; so you can reach them anywhere and they&rsquo;re safer if your device fails. <a href="/cloud-migration/">Moving to the cloud &#8594;</a></p>
          <h2>Still unsure about a word?</h2>
          <p>Our <a href="/it-jargon-buster/">A&ndash;Z jargon buster</a> explains the rest &mdash; or just ask us. We never talk down to anyone.</p>""",
  cta_args=("Prefer a real person to explain?", "We&rsquo;re patient, friendly and jargon-free &mdash; ask us anything, no question is too small.",
            ("Talk to a Techie", "/contact/"), ("View Plans", "/monthly-it-support/")),
)

# ---- Pre-call / get-ready checklists (print-friendly)
info_page(
  slug="pre-call-checklists", crumb_name="Get-Ready Checklists", eyebrow="// FEEL PREPARED",
  h1='Get-ready <em class="grad grad--cyan">checklists</em>',
  lede="Getting in touch can feel daunting if tech isn&rsquo;t your thing. These quick checklists help you feel prepared and get sorted faster &mdash; print them or keep them handy.",
  desc="Friendly, print-friendly checklists from 365 Techies to help you prepare before calling for remote support, booking a repair, sorting Microsoft 365 or setting up a new computer.",
  chips=["Feel prepared", "Print-friendly", "No pressure"],
  inner="""          <p>However you like to get started, these help you feel ready. There&rsquo;s no wrong way to ask for help &mdash; but a little prep makes everything quicker and calmer.</p>
          <h2>Before you call for remote support</h2>
          <ul>
            <li>Make sure the device is switched on and connected to the internet.</li>
            <li>Have a rough description ready: what&rsquo;s happening, and roughly when it started.</li>
            <li>Note any error messages &mdash; a photo on your phone is perfect.</li>
            <li>Keep your phone nearby so we can talk you through it.</li>
            <li>Don&rsquo;t worry about tidying up or fixing it first &mdash; we&rsquo;ll take it from here.</li>
          </ul>
          <h2>Getting ready to book a repair</h2>
          <ul>
            <li>Note the make and model if you know it (don&rsquo;t worry if you don&rsquo;t).</li>
            <li>Back up anything precious if you can &mdash; or tell us and we&rsquo;ll help.</li>
            <li>Jot down exactly what the problem is and when it happens.</li>
            <li>Have your contact details and address handy for collection.</li>
          </ul>
          <h2>Questions worth asking about Microsoft 365</h2>
          <ul>
            <li>Which plan is right for just me, my family, or my business?</li>
            <li>Is my email and data backed up? (Microsoft doesn&rsquo;t fully do this for you.)</li>
            <li>Is two-step login switched on to keep my account safe?</li>
            <li>Can you move my old emails and files across with nothing lost?</li>
          </ul>
          <h2>New computer? Have these ready</h2>
          <ul>
            <li>Your email address and password (or let us help you recover them).</li>
            <li>A list of the programs you use regularly.</li>
            <li>Your old computer, so we can move your files and photos across.</li>
            <li>Any printer or device you&rsquo;d like it to work with.</li>
          </ul>""",
  cta_args=("Ready when you are", "However you&rsquo;d like to get started, we&rsquo;ll make it easy and stress-free.",
            ("Book a Service", "/book-service/"), ("Call 01202 775566", "tel:+441202775566")),
)

# ---- Our values / how we work
info_page(
  slug="our-values", crumb_name="Our Values", eyebrow="// HOW WE WORK",
  h1='How we work &amp; <em class="grad grad--green">what we promise</em>',
  lede="We&rsquo;re a family-run team, not a faceless call-centre &mdash; and we&rsquo;ve looked after Dorset&rsquo;s homes and businesses since 1995. Here&rsquo;s how we work, and the promises behind it.",
  desc="The values behind 365 Techies — how our family-run Dorset IT team works (The 365 Way) and our promises: no upsell, honest independent advice, repair before replace, no problem too small, and plain English always.",
  chips=["Family-run since 1995", "No upsell, ever", "Plain English"],
  inner="""          <h2>The 365 Way</h2>
          <ol>
            <li><strong>Listen, in plain English.</strong> We start by understanding you and the problem &mdash; no jargon, no judgement, and no question is ever too small.</li>
            <li><strong>Fix it properly.</strong> We solve the real cause, not just the symptom &mdash; and we tell you honestly when a repair is (or isn&rsquo;t) worth it.</li>
            <li><strong>Protect &amp; look after.</strong> We keep you secure, updated and backed up &mdash; quietly, in the background, so problems are prevented.</li>
            <li><strong>Check back in.</strong> We don&rsquo;t disappear once it&rsquo;s working. We&rsquo;re here whenever you need us, and we keep an eye on things in between.</li>
          </ol>
          <h2>Our promises to you</h2>
          <ul>
            <li><strong>No upsell, ever.</strong> We recommend what&rsquo;s genuinely right for you &mdash; never what earns us the most. If you don&rsquo;t need it, we&rsquo;ll say so.</li>
            <li><strong>Honest, independent advice.</strong> We&rsquo;re not here to push one brand&rsquo;s products &mdash; we suggest the best fit for your needs and budget.</li>
            <li><strong>Repair before replace.</strong> Where it makes sense, we&rsquo;ll fix what you have rather than sell you something new.</li>
            <li><strong>No problem too small.</strong> Whether it&rsquo;s ransomware or how to attach a photo, you&rsquo;ll always get patient, friendly help.</li>
            <li><strong>Plain English, always.</strong> We explain things clearly and never make you feel daft for asking.</li>
            <li><strong>Your data, treated with care.</strong> We handle your information responsibly and keep it secure.</li>
          </ul>
          <p>It&rsquo;s why so many customers have stayed with us for years &mdash; and why we proudly specialise in supporting <a href="/it-support-for-retired-users/">retired</a> and <a href="/it-support-for-disabled-people/">disabled</a> people who deserve patient, respectful help.</p>""",
  cta_args=("Experience the difference", "Friendly, honest IT support from people who genuinely care.",
            ("View Monthly Plans", "/monthly-it-support/"), ("Talk to a Techie", "/contact/")),
)

# ---- Buyer's guide: choosing an IT support company
info_page(
  slug="choosing-it-support", crumb_name="How to Choose IT Support", eyebrow="// BUYER&rsquo;S GUIDE",
  h1='How to choose an <em class="grad grad--cyan">IT support company</em>',
  lede="Choosing who looks after your technology is a big decision &mdash; they&rsquo;ll have access to your devices, data and accounts. Here are the questions worth asking any firm before you commit (and, honestly, how we answer them).",
  desc="A free buyer's guide from 365 Techies: 10 questions to ask before choosing an IT support company in Dorset — contracts, response times, who helps you, upselling, what's included, backups, security, guarantees and switching.",
  chips=["10 key questions", "Print-friendly", "No pressure"],
  inner="""          <p class="no-print"><button type="button" class="button secondary" onclick="window.print()">&#128424; Print / Save as PDF</button></p>
          <p>Use this as a checklist with any IT company you&rsquo;re considering. If they can&rsquo;t answer these clearly, that tells you something &mdash; we&rsquo;re always happy to.</p>
          <h2>10 questions to ask any IT support company</h2>
          <ol>
            <li><strong>Are you tied into a long contract?</strong> Look for rolling, cancel-anytime plans. <em>(Ours roll monthly &mdash; no lock-in.)</em></li>
            <li><strong>How quickly do you respond, and how?</strong> Ask about remote vs on-site and realistic times. <em>(See our <a href="/service-level-agreement/">SLA</a>.)</em></li>
            <li><strong>Who actually helps me &mdash; a real, local person?</strong> Beware overseas call centres and ever-changing faces. <em>(You get a friendly local Dorset team.)</em></li>
            <li><strong>Will you try to upsell me things I don&rsquo;t need?</strong> Ask directly. <em>(We have a <a href="/our-values/">no-upsell promise</a>.)</em></li>
            <li><strong>What&rsquo;s included, and what costs extra?</strong> Get it in plain English up front. <em>(See our <a href="/pricing/">transparent pricing</a> and what&rsquo;s included.)</em></li>
            <li><strong>Do you back up my data &mdash; and do you test it?</strong> An untested backup isn&rsquo;t a backup. <em>(We verify backups regularly.)</em></li>
            <li><strong>How do you keep me secure?</strong> Look for protection, updates, MFA and a human to ask. <em>(See <a href="/cybersecurity-support/">cybersecurity</a>.)</em></li>
            <li><strong>What happens if it can&rsquo;t be fixed?</strong> Look for no-fix-no-fee and a warranty. <em>(Ours: no-fix-no-fee + a 12-month repair warranty.)</em></li>
            <li><strong>How easy is it to switch to you &mdash; or leave later?</strong> A good firm makes both painless. <em>(See <a href="/switching-it-provider/">switching</a>.)</em></li>
            <li><strong>Will you explain things in plain English?</strong> You should never feel talked down to. <em>(It&rsquo;s one of our core <a href="/our-values/">promises</a>.)</em></li>
          </ol>
          <h2>Not sure where to start?</h2>
          <p>Try our 30-second <a href="/plan-finder/">Plan Finder</a>, get a <a href="/quick-quote/">quick quote</a>, or just <a href="/contact/">ask us anything</a> &mdash; no pressure, no jargon.</p>""",
  cta_args=("Put us to the test", "Ask us every one of these questions &mdash; we&rsquo;ll answer them all, honestly.",
            ("Talk to a Techie", "/contact/"), ("Why Choose Us", "/why-choose-365-techies/")),
)

# ---- Disaster Recovery & Business Continuity
info_page(
  slug="disaster-recovery", crumb_name="Disaster Recovery & Business Continuity", eyebrow="// DISASTER RECOVERY",
  h1='Disaster recovery &amp; <em class="grad grad--green">business continuity</em>',
  lede="When the worst happens &mdash; ransomware, hardware failure, fire or flood &mdash; we get you back up and running fast. Disaster recovery and business continuity for homes and businesses across Dorset.",
  desc="Disaster recovery and business continuity from 365 Techies — verified backups, ransomware rollback, rapid recovery, cloud failover and a practical continuity plan for businesses across Dorset.",
  chips=["Back up fast","Tested &amp; ready","Business continuity"],
  pre='''    <section class="section section--alt" aria-label="What it covers">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// IF THE WORST HAPPENS</p>
          <h2 class="section-title section-title--center" data-title>Back up and running, fast<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
''' + grid_cards([
        ("Verified backups", "Automatic, off-site, regularly tested backups so your data is always recoverable."),
        ("Ransomware rollback", "Versioned, protected backups let us roll back to before an attack."),
        ("Rapid recovery", "We restore files, systems or whole setups quickly to minimise downtime."),
        ("Cloud failover", "Keep working from the cloud while we rebuild your on-site systems."),
        ("A continuity plan", "A simple, practical plan so everyone knows exactly what to do."),
        ("Regular testing", "We test recovery so it actually works when it matters most."),
      ]) + '''
        </ul>
      </div>
    </section>''',
  inner="""          <h2>Why it matters</h2>
          <p>For a business, downtime and data loss aren&rsquo;t just inconvenient &mdash; they cost money, customers and reputation. Most disasters are survivable with the right preparation; without it, they can be fatal.</p>
          <h2>What we do</h2>
          <p>We put verified, off-site, ransomware-safe backups in place, build a clear recovery and business-continuity plan around your business, and &mdash; crucially &mdash; <strong>test it</strong> so you know it works. If disaster strikes, we act fast to restore your data and get you operational again.</p>
          <h2>Who it&rsquo;s for</h2>
          <p>Any business that can&rsquo;t afford to lose its data or stop trading &mdash; especially regulated sectors like <a href="/it-support-for-solicitors/">solicitors</a>, <a href="/it-support-for-accountants/">accountants</a>, <a href="/it-support-for-care-homes/">care homes</a> and <a href="/it-support-for-dental-medical/">dental &amp; medical practices</a>. It builds on our <a href="/backup-support/">backup &amp; recovery</a> and <a href="/cybersecurity-support/">cybersecurity</a> services.</p>""",
  cta_args=("Be ready for anything", "Get verified backups and a tested recovery plan, so a disaster is a hiccup &mdash; not a catastrophe.",
            ("Get a Continuity Plan", "/contact/"), ("Backup & Recovery", "/backup-support/")),
)

# ---- GDPR & IT Compliance
info_page(
  slug="gdpr-it-compliance", crumb_name="GDPR & IT Compliance", eyebrow="// DATA PROTECTION",
  h1='GDPR &amp; <em class="grad grad--cyan">IT compliance</em>',
  lede="The practical IT side of staying compliant &mdash; security, access control, backups and policies that keep your business and your customers&rsquo; data safe and meet your data-protection obligations.",
  desc="GDPR and IT compliance support from 365 Techies — practical data security, access control, MFA, encryption, backups, breach readiness and Microsoft 365 compliance for businesses across Dorset.",
  chips=["UK GDPR","Plain-English","For regulated sectors"],
  pre='''    <section class="section section--alt" aria-label="What we help with">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// THE IT SIDE OF COMPLIANCE</p>
          <h2 class="section-title section-title--center" data-title>Compliance, made practical<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
''' + grid_cards([
        ("Data security", "Encryption, protection and monitoring for personal and business data."),
        ("Access control &amp; MFA", "The right people access the right data &mdash; and a stolen password isn&rsquo;t enough."),
        ("Backups &amp; retention", "Verified backups and sensible retention so data is safe and recoverable."),
        ("Breach readiness", "Help to detect, contain and respond quickly if the worst happens."),
        ("Staff awareness", "Practical, plain-English training so your team handles data safely."),
        ("Microsoft 365 compliance", "Secure, well-configured Microsoft 365 with the right policies in place."),
      ]) + '''
        </ul>
      </div>
    </section>''',
  inner="""          <h2>The IT side of compliance</h2>
          <p>UK GDPR requires you to keep personal data secure and to handle it responsibly. We look after the <strong>practical, technical measures</strong> that underpin that &mdash; security, access control, encryption, backups, monitoring and the right Microsoft 365 policies &mdash; so compliance is built into how your systems work.</p>
          <h2>Built for regulated sectors</h2>
          <p>It&rsquo;s especially valuable for <a href="/it-support-for-solicitors/">solicitors</a>, <a href="/it-support-for-accountants/">accountants</a>, <a href="/it-support-for-care-homes/">care homes</a>, <a href="/it-support-for-dental-medical/">dental &amp; medical practices</a> and <a href="/it-support-for-charities/">charities</a>. It pairs with our <a href="/cyber-essentials/">Cyber Essentials</a> help and <a href="/cybersecurity-support/">cybersecurity</a> service.</p>
          <p class="lede-note">This supports your data-protection obligations on the IT side and isn&rsquo;t a substitute for formal legal or Data Protection Officer advice.</p>""",
  faqs=[
    ("Can you make us GDPR compliant?", "We handle the IT and security measures that underpin compliance &mdash; encryption, access control, MFA, backups, monitoring and Microsoft 365 policies. Full compliance also involves your own policies and processes, which we can support."),
    ("Do you help after a data breach?", "Yes &mdash; we help detect, contain and recover from incidents, and harden your systems to prevent a repeat."),
    ("Is this the same as Cyber Essentials?", "They overlap. Cyber Essentials is a specific certification; broader GDPR/IT compliance covers data security, access, backups and policies. We help with both."),
  ],
  cta_args=("Keep your data safe &amp; compliant", "Get the practical IT security and policies that protect your data and your reputation.",
            ("Talk to Us", "/contact/"), ("Cyber Essentials", "/cyber-essentials/")),
)

# ---- Accessibility Statement
info_page(
  slug="accessibility-statement", crumb_name="Accessibility Statement", eyebrow="// ACCESSIBILITY",
  h1='Accessibility <em class="grad grad--cyan">statement</em>',
  lede="We want everyone to be able to use our website and our services — especially as supporting disabled and retired people is one of our specialisms.",
  desc="365 Techies accessibility statement — our commitment to an accessible website, the measures we've taken, and how to get help if you're having any difficulty.",
  chips=["Built for everyone","WCAG-minded","Here to help"],
  inner="""          <h2>Our commitment</h2>
          <p>Accessibility isn&rsquo;t an afterthought for us &mdash; we specialise in <a href="/it-support-for-disabled-people/">accessible IT support for disabled people</a> and <a href="/it-support-for-retired-users/">patient help for retired users</a>, so we care deeply about making our own website easy for everyone to use.</p>
          <h2>What we&rsquo;ve done</h2>
          <ul>
            <li><strong>Keyboard friendly</strong> &mdash; you can navigate the whole site without a mouse, with a &ldquo;skip to content&rdquo; link and clearly visible focus outlines.</li>
            <li><strong>Respects reduced motion</strong> &mdash; if your device is set to reduce motion, our animations and moving background switch off automatically.</li>
            <li><strong>Readable</strong> &mdash; we aim for strong colour contrast, scalable text, and plain English with no jargon.</li>
            <li><strong>Structured clearly</strong> &mdash; proper headings, labels and descriptive links so screen readers can make sense of every page.</li>
            <li><strong>Works everywhere</strong> &mdash; the site adapts to phones, tablets and computers.</li>
          </ul>
          <h2>Aiming for the standard</h2>
          <p>We work towards the Web Content Accessibility Guidelines (WCAG) 2.1 AA and keep improving. Accessibility is never &ldquo;finished&rdquo; &mdash; we review and refine the site over time.</p>
          <h2>Having difficulty?</h2>
          <p>If any part of our website is hard to use, or you&rsquo;d simply prefer to talk to a real person, we&rsquo;re glad to help personally &mdash; call <a href="tel:+441202775566">01202 775566</a> or email <a href="mailto:help@365techies.co.uk">help@365techies.co.uk</a>. We&rsquo;ll happily assist with anything you need, patiently and without jargon.</p>
          <h2>Tell us about a problem</h2>
          <p>If you spot an accessibility issue, please let us know at <a href="mailto:help@365techies.co.uk">help@365techies.co.uk</a> and we&rsquo;ll put it right as quickly as we can.</p>""",
  cta_args=("Prefer to talk to a person?", "We&rsquo;re patient, friendly and always happy to help &mdash; however you&rsquo;d like.",
            ("Contact Us", "/contact/"), ("Accessible IT Support", "/it-support-for-disabled-people/")),
)

# ---- Start Remote Support
info_page(
  slug="remote-support", crumb_name="Start Remote Support", eyebrow="// REMOTE SUPPORT",
  h1='Start <em class="grad grad--green">remote support</em>',
  lede="Need help right now? Our secure remote support lets us connect to your computer and fix the problem while you watch — usually in minutes. Here's how to get started.",
  desc="Start a secure remote support session with 365 Techies — download Splashtop SOS, call us, and we'll connect to your Windows PC or Android device to fix the problem while you watch.",
  chips=["Encrypted &amp; secure","You stay in control","Usually within minutes"],
  pre='''    <section class="section section--alt" aria-label="How remote support works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>// HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>Connected in three steps<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
''' + steps([
        ("Download Splashtop SOS","Click the button below to download our secure remote-support tool (it doesn&rsquo;t install anything permanent)."),
        ("Call us","Ring 01202 775566 and read us the 9-digit code the tool shows you."),
        ("We connect &amp; fix it","We join your screen securely, you watch everything we do, and access ends the moment we&rsquo;re done."),
      ]) + '''
        </ol>
        <p style="text-align:center;margin-top:2rem" data-reveal>
          <a class="button primary button--lg" href="https://sos.splashtop.com/en/sos-download" target="_blank" rel="noopener">Download Splashtop SOS</a>
        </p>
      </div>
    </section>''',
  inner="""          <h2>Is it safe?</h2>
          <p>Yes. Sessions run over encrypted Splashtop SOS, you watch everything on screen the whole time, and we can only connect when you give us the one-time code. Access ends as soon as the session does &mdash; we can&rsquo;t reconnect without a new code.</p>
          <h2>What we can fix remotely</h2>
          <p>Most things! Slow computers, email problems, software setup, updates, printer and Wi-Fi issues, security checks and much more &mdash; all without us leaving the office or you leaving home.</p>
          <h2>Which devices?</h2>
          <p>Remote support works on <strong>Windows computers and laptops and Android devices</strong>. Please note we can&rsquo;t remotely connect to Apple Macs, iPhones or iPads. For on-site help across Dorset, just <a href="/contact/">get in touch</a>.</p>""",
  cta_args=("Prefer to book ahead?", "Not an emergency? Book a convenient time and we&rsquo;ll call you.",
            ("Book a Service", "/book-service/"), ("Call 01202 775566", "tel:+441202775566")),
)

# ===================================================== CYBER THREATS EXPLAINED
def make_threat(slug, name, h1, lede, desc, what_html, signs, protect, ifhit, faqs):
    content = "\n".join([
      hero(f'<a href="/">Home</a> <span>/</span> <a href="/cyber-threats/">Cyber Threats</a> <span>/</span> <span aria-current="page">{name}</span>',
           "// CYBER THREAT", h1, lede,
           cta1=("Protect Yourself", "/cybersecurity-support/"), cta2=("Free IT Health Check", "/free-it-health-check/"),
           chips=["Plain English","How to protect yourself","Real help on call"]),
      f'''    <section class="section" aria-label="What it is">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — WHAT IT IS</p>
          <h2 class="section-title" data-title>Know your enemy<span class="title-underline"></span></h2>
{what_html}
        </div>
        <ul class="checklist" data-stagger>
{checklist(signs)}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="How to protect yourself">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — HOW TO PROTECT YOURSELF</p>
          <h2 class="section-title section-title--center" data-title>Stay one step ahead<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards(protect)}
        </ul>
      </div>
    </section>''',
      f'''    <section class="how" aria-label="If you have been hit">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/03 — IF YOU&rsquo;VE BEEN HIT</p>
        <h2 class="section-title section-title--center" data-title>What to do right now<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps(ifhit)}
        </ol>
      </div>
    </section>''',
      faq_html(faqs),
      cta("Worried about " + name.lower() + "?",
          "We protect Dorset homes and businesses from threats like this every day &mdash; with layered security, Malwarebytes Premium and a real person to ask.",
          primary=("Get Protected", "/cybersecurity-support/"), secondary=("Run a Free Health Check", "/free-it-health-check/")),
    ])
    def schema(s, _d=desc, _n=name, _f=faqs):
        return graph([
            {"@type": "BreadcrumbList", "@id": SITE + "/" + slug + "/#breadcrumb", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": "Cyber Threats", "item": SITE + "/cyber-threats/"},
                {"@type": "ListItem", "position": 3, "name": _n, "item": SITE + "/" + slug + "/"}]},
            webpage(s, _n, _d), faqpage(s, _f)])
    add(slug=slug, title=f"{name}: What It Is &amp; How to Stay Safe | 365 Techies",
        desc=desc, og_title=f"{name} Explained | 365 Techies", schema=schema, content=content)

THREATS = [
 dict(slug="ransomware", name="Ransomware",
   h1='<em class="grad grad--green">Ransomware</em> explained',
   lede="Ransomware locks up your files and demands payment to release them. Here&rsquo;s how it works, how to spot it, and how to make sure it never holds you to ransom.",
   desc="What is ransomware? A plain-English guide to how ransomware works, the warning signs, how to protect your home or business, and what to do if you&rsquo;re hit — from 365 Techies.",
   what_html="<p>Ransomware is malicious software that encrypts your files so you can&rsquo;t open them, then demands a ransom &mdash; usually in cryptocurrency &mdash; to unlock them. It often arrives through a dodgy email attachment, link or compromised download.</p><p><strong>Paying rarely works and funds more crime.</strong> The only reliable defence is stopping it getting in &mdash; and having clean backups you can restore from.</p>",
   signs=["Files suddenly won&rsquo;t open","Strange file extensions appear","A ransom note on screen","Programs crashing or locking","Unusual disk activity","Being locked out of accounts"],
   protect=[("Verified backups","Keep automatic, off-site backups so you can restore without paying."),("Endpoint protection","Malwarebytes Premium blocks ransomware before it runs."),("Patch everything","Updated systems close the holes ransomware exploits."),("Email filtering","Stop the phishing emails that carry most ransomware."),("MFA &amp; least access","Limit how far an infection can spread."),("Staff &amp; family awareness","Most attacks start with a click &mdash; know what to avoid.")],
   ifhit=[("Disconnect now","Unplug from the network and internet to stop it spreading."),("Don&rsquo;t pay &mdash; call us","Ring 01202 775566; paying rarely recovers your files."),("We recover &amp; rebuild","We clean up, restore from backup and harden everything against a repeat.")],
   faqs=[("Should I pay the ransom?","No &mdash; payment rarely guarantees recovery and funds more crime. Good backups mean you don&rsquo;t have to."),("Can you recover ransomware-encrypted files?","Often, yes &mdash; from clean backups. Contact us immediately and avoid using the device."),("How do I prevent ransomware?","Layered protection: endpoint security, patching, email filtering, MFA and verified, off-site backups.")]),
 dict(slug="phishing", name="Phishing",
   h1='<em class="grad grad--green">Phishing</em> explained',
   lede="Phishing emails trick you into handing over passwords, money or personal details. Here&rsquo;s how to recognise them and keep yourself and your business safe.",
   desc="What is phishing? A plain-English guide to phishing emails — how they work, the warning signs, how to protect yourself, and what to do if you click. From 365 Techies.",
   what_html="<p>Phishing is when criminals send fake emails (or messages) pretending to be a company or person you trust &mdash; your bank, Microsoft, a supplier, even your boss &mdash; to trick you into clicking a link, opening a file or handing over details.</p><p><strong>They rely on urgency and familiarity.</strong> A moment&rsquo;s pause and a few checks defeat almost all of them.</p>",
   signs=["Unexpected &lsquo;urgent&rsquo; requests","Slightly wrong sender addresses","Links that don&rsquo;t match the text","Requests for passwords or payment","Spelling and grammar slips","Generic &lsquo;Dear customer&rsquo; greetings"],
   protect=[("Pause and check","Never act on urgency &mdash; verify the sender first."),("Hover before you click","Check where a link really goes before clicking."),("Email filtering","We filter most phishing out before it reaches you."),("MFA everywhere","A stolen password alone won&rsquo;t get them in."),("Verify money requests","Confirm payment or detail changes by phone."),("Ask us","Subscribers can always ask &lsquo;is this safe?&rsquo;")],
   ifhit=[("Don&rsquo;t panic, do tell us","If you clicked or shared details, contact us straight away."),("Change passwords","Reset the affected password and any that match it; turn on MFA."),("We secure &amp; check","We lock down accounts, check for damage and prevent a repeat.")],
   faqs=[("What should I do if I clicked a phishing link?","Don&rsquo;t enter any details, disconnect if prompted to download anything, and contact us to check your accounts and device."),("How can I tell if an email is phishing?","Look for urgency, mismatched sender addresses, odd links and requests for credentials or payment &mdash; and when unsure, ask us."),("Can phishing be stopped?","Email filtering, MFA and awareness stop the vast majority &mdash; we set all three up.")]),
 dict(slug="online-scams", name="Online Scams",
   h1='<em class="grad grad--green">Online scams</em> explained',
   lede="From fake delivery texts to &lsquo;your account is locked&rsquo; tricks, online scams are everywhere. Here&rsquo;s how to spot them and protect your money and identity.",
   desc="A plain-English guide to common online scams — fake deliveries, banking alerts, refunds and tech-support cons — how to spot them and stay safe. From 365 Techies.",
   what_html="<p>Online scams use fake messages, websites and calls to trick you into paying money or handing over personal and banking details. Common ones include fake delivery notices, &lsquo;your account is locked&rsquo; warnings, bogus refunds and tech-support scams.</p><p><strong>If something feels off, it usually is.</strong> Slowing down and checking directly beats every scam.</p>",
   signs=["Pressure to act immediately","Requests for payment or codes","Too-good-to-be-true offers","Unexpected refunds or wins","Links to fake login pages","Callers claiming to be &lsquo;support&rsquo;"],
   protect=[("Go direct","Visit websites and apps yourself, not via links in messages."),("Never share codes","No genuine company asks for your full password or one-time codes."),("Web protection","Malwarebytes blocks known scam and fake sites."),("Strong, unique passwords","A password manager keeps every account separate and safe."),("Slow down","Scammers rely on panic &mdash; take a breath and check."),("Have someone to ask","We&rsquo;ll happily check anything suspicious for you.")],
   ifhit=[("Stop &amp; contact your bank","If you&rsquo;ve paid or shared bank details, call your bank right away."),("Secure your accounts","Change passwords and turn on MFA; contact us to help."),("Report it","Report to Action Fraud, and we&rsquo;ll help secure your devices.")],
   faqs=[("I think I&rsquo;ve been scammed &mdash; what now?","Contact your bank immediately if money or card details are involved, change your passwords, and call us to secure your devices and accounts."),("How do I avoid online scams?","Never act on urgency, go to websites directly, never share codes or full passwords, and ask us if you&rsquo;re unsure."),("Are tech-support scam calls real?","No &mdash; Microsoft and others never cold-call about your computer. Hang up and, if worried, call us.")]),
 dict(slug="malware-and-viruses", name="Malware & Viruses",
   h1='<em class="grad grad--green">Malware &amp; viruses</em> explained',
   lede="Viruses, spyware and trojans can slow your device, steal your data or worse. Here&rsquo;s what malware is, how to spot it, and how to stay protected.",
   desc="What is malware? A plain-English guide to viruses, spyware and trojans — how they infect devices, the warning signs, and how to protect your home or business. From 365 Techies.",
   what_html="<p>Malware is a catch-all term for harmful software &mdash; viruses, spyware, trojans and more &mdash; designed to damage your device, spy on you or steal your data. It spreads through dodgy downloads, attachments, websites and infected USB sticks.</p><p><strong>Good protection plus good habits</strong> keep almost all of it out, and catch what does slip through.</p>",
   signs=["Sudden slowness or crashes","Pop-ups and adverts","Programs you didn&rsquo;t install","Browser homepage changes","Friends getting odd messages from you","Unexplained data use"],
   protect=[("Real-time protection","Malwarebytes Premium blocks malware as it tries to run."),("Keep updated","Patched systems are far harder to infect."),("Careful downloads","Only install from trusted sources."),("Web filtering","Block malicious sites before they load."),("Backups","So even a serious infection can&rsquo;t cost you your data."),("A human to ask","Not sure if something&rsquo;s safe? Ask us first.")],
   ifhit=[("Disconnect","Take the device off the network to limit spread."),("Don&rsquo;t log in","Avoid banking and key accounts until it&rsquo;s clean."),("We clean &amp; protect","We remove the malware, check for damage and set up protection.")],
   faqs=[("How do I know if I have a virus?","Watch for slowness, pop-ups, unknown programs and odd account activity &mdash; then run a scan or ask us to check."),("Is free antivirus enough?","Free tools help but often miss modern threats; we use managed Malwarebytes Premium for proper, always-on protection."),("Can you remove malware remotely?","Yes &mdash; in most cases we can clean an infected Windows device remotely and secure it.")]),
 dict(slug="smishing-and-vishing", name="Smishing & Vishing",
   h1='<em class="grad grad--green">Smishing &amp; vishing</em> explained',
   lede="Scam texts (smishing) and scam calls (vishing) are booming. Here&rsquo;s how these phone-based cons work and how to avoid being caught out.",
   desc="What are smishing and vishing? A plain-English guide to scam texts and scam phone calls — how they work, the warning signs and how to stay safe. From 365 Techies.",
   what_html="<p>Smishing is phishing by text message; vishing is phishing by phone call. Scammers pose as your bank, a delivery firm, a tech company or even a family member to pressure you into paying or sharing details.</p><p><strong>Your phone deserves the same caution as your inbox.</strong> Genuine organisations don&rsquo;t mind you hanging up to check.</p>",
   signs=["Texts with links to &lsquo;track&rsquo; or &lsquo;pay&rsquo;","Calls creating panic or urgency","Requests for codes or PINs","&lsquo;Hi Mum/Dad, new number&rsquo; texts","Numbers you don&rsquo;t recognise","Threats of fines or account closure"],
   protect=[("Never tap text links","Go to the official app or website instead."),("Hang up &amp; call back","Use the number on your card or their official site."),("Never share codes","Banks and providers never ask for full codes or PINs."),("Verify family requests","Call the person directly on their known number."),("Report &amp; block","Forward scam texts to 7726 and block the sender."),("Ask us","We&rsquo;ll happily sanity-check a suspicious message.")],
   ifhit=[("Contact your bank","If you paid or shared details, call your bank immediately."),("Change passwords","Reset anything you may have exposed; enable MFA."),("Tell us","We&rsquo;ll help secure your phone, accounts and devices.")],
   faqs=[("What&rsquo;s the difference between smishing and vishing?","Smishing is a scam by text message; vishing is a scam by phone call. Both try to trick you into paying or sharing details."),("How do I report a scam text?","Forward it to 7726 (free) and block the sender. If you&rsquo;ve shared details, contact your bank and us."),("Can you secure my phone?","Yes &mdash; we help set up sensible security and advise on staying safe on mobile.")]),
 dict(slug="business-email-compromise", name="Business Email Compromise",
   h1='<em class="grad grad--green">Business email compromise</em> explained',
   lede="BEC is one of the costliest scams for businesses — criminals impersonate a boss or supplier to redirect payments. Here&rsquo;s how to spot and stop it.",
   desc="What is business email compromise (BEC)? A plain-English guide for small businesses — how invoice and CEO-fraud scams work, the warning signs and how to protect your business. From 365 Techies.",
   what_html="<p>Business email compromise (BEC) is when criminals impersonate a director, colleague or supplier &mdash; often by spoofing or hijacking an email account &mdash; to trick staff into paying a fake invoice or changing bank details.</p><p><strong>It targets people, not just technology</strong>, so the defence combines security with a few simple business habits.</p>",
   signs=["&lsquo;Urgent&rsquo; payment requests from the boss","Last-minute supplier bank-detail changes","Slightly altered email addresses","Requests to bypass normal process","Pressure and secrecy","Replies that don&rsquo;t quite sound right"],
   protect=[("Verify by phone","Always confirm payment or bank changes on a known number."),("MFA on email","Stops most account takeovers cold."),("Email security","Filtering and anti-spoofing flag impersonation."),("Clear payment process","A simple two-person check stops fraud."),("Staff awareness","Train the team to spot the tell-tale signs."),("Microsoft 365 hardening","We lock down mailboxes and rules.")],
   ifhit=[("Stop the payment","Contact your bank immediately to try to recall funds."),("Secure the mailbox","Reset passwords, enable MFA, remove rogue rules &mdash; we&rsquo;ll help."),("Review &amp; harden","We investigate, tighten security and brief your team.")],
   faqs=[("What is CEO fraud?","A type of BEC where a scammer impersonates a senior person to pressure staff into making an urgent payment or sharing details."),("How do we prevent BEC?","MFA on email, anti-spoofing filtering, a verify-by-phone rule for payments, and staff awareness &mdash; all of which we set up."),("We&rsquo;ve paid a fake invoice &mdash; what now?","Call your bank immediately to attempt recall, then contact us to secure the mailbox and investigate.")]),
 dict(slug="data-breaches", name="Data Breaches",
   h1='<em class="grad grad--green">Data breaches</em> explained',
   lede="When a company you use is breached, your details can end up for sale online. Here&rsquo;s what that means for you and how to limit the damage.",
   desc="What is a data breach? A plain-English guide to how breaches happen, what it means when your details are leaked, and how to protect yourself. From 365 Techies.",
   what_html="<p>A data breach is when personal information &mdash; emails, passwords, card details &mdash; is stolen from a company&rsquo;s systems. Those details often end up sold or dumped online, where criminals use them to break into other accounts.</p><p><strong>You can&rsquo;t stop a company being breached</strong>, but you can stop one leak turning into many.</p>",
   signs=["A breach notification email","Logins you didn&rsquo;t make","Password-reset emails you didn&rsquo;t request","Spam or scams increasing","Cards used without you","Accounts locked unexpectedly"],
   protect=[("Unique passwords","So one breach can&rsquo;t unlock your other accounts."),("Use a password manager","Strong, different passwords made easy."),("Turn on MFA","Stolen passwords become useless."),("Monitor your email","Check if your address appears in known breaches."),("Stay alert to scams","Breached data fuels targeted phishing."),("Get advice","We&rsquo;ll help you lock things down after a breach.")],
   ifhit=[("Change that password","And any other account using the same one."),("Enable MFA","Add it everywhere that matters, starting with email."),("We help secure you","We&rsquo;ll review your accounts and set up proper protection.")],
   faqs=[("How do I know if my data was breached?","You may get a notification, or notice odd account activity. We can advise on checking whether your email appears in known breaches."),("What should I do after a breach?","Change the affected password (and any duplicates), turn on MFA, and watch for targeted scams."),("Does a password manager help?","Hugely &mdash; unique passwords mean one breach can&rsquo;t cascade into your other accounts.")]),
 dict(slug="identity-theft", name="Identity Theft",
   h1='<em class="grad grad--green">Identity theft</em> explained',
   lede="Identity theft is when criminals use your personal details to impersonate you. Here&rsquo;s how it happens and how to protect yourself.",
   desc="What is identity theft? A plain-English guide to how criminals steal and misuse your identity, the warning signs, and how to protect yourself. From 365 Techies.",
   what_html="<p>Identity theft is when someone steals enough of your personal information &mdash; name, address, date of birth, bank or card details &mdash; to impersonate you, open accounts, or take money in your name.</p><p><strong>It usually starts with details leaked or phished from elsewhere</strong>, so strong everyday security is your best protection.</p>",
   signs=["Bills or letters for things you didn&rsquo;t buy","Being refused credit unexpectedly","Missing post or statements","Unknown accounts in your name","Calls about debts that aren&rsquo;t yours","Strange activity on your accounts"],
   protect=[("Lock down accounts","Strong unique passwords and MFA everywhere."),("Shred &amp; secure","Protect paper and digital documents alike."),("Beware oversharing","Limit personal details on social media."),("Web &amp; scam protection","Block the phishing that harvests your details."),("Monitor your credit","Spot misuse early."),("Ask for help","We&rsquo;ll help secure your digital life.")],
   ifhit=[("Contact your bank &amp; Action Fraud","Report it and freeze affected accounts."),("Change passwords &amp; enable MFA","Lock attackers out of your accounts."),("We secure your devices","We check for malware and lock down your accounts.")],
   faqs=[("How does identity theft happen?","Through phishing, data breaches, malware, or stolen documents &mdash; criminals piece together enough details to impersonate you."),("How can I protect my identity?","Unique passwords, MFA, careful sharing, scam protection and monitoring &mdash; we can help set these up."),("What if my identity is stolen?","Report to your bank and Action Fraud, change passwords, enable MFA, and let us secure your devices and accounts.")]),
]
for t in THREATS:
    make_threat(**t)

def cyber_threats_hub():
    slug = "cyber-threats"
    desc = "Cyber threats explained in plain English by 365 Techies — ransomware, phishing, online scams, malware, smishing, business email compromise, data breaches and identity theft, and how to protect your home or business."
    cards = ""
    for t in THREATS:
        cards += (f'          <a class="post-card" href="/{t["slug"]}/"><p class="post-card__cat">Cyber Threat</p>'
                  f'<h3>{t["name"]}</h3><p>{t["lede"]}</p><span class="post-card__more">Learn how to stay safe &#8594;</span></a>\n')
    content = "\n".join([
      hero(bc("Cyber Threats"), "// CYBER THREATS EXPLAINED",
           'Cyber threats, <em class="grad grad--green">explained simply</em>',
           "Understand the threats facing homes and businesses today &mdash; what they are, how to spot them, and exactly how to protect yourself. No jargon, just clear, practical advice from your local experts.",
           cta1=("Get Protected", "/cybersecurity-support/"), cta2=("Free IT Health Check", "/free-it-health-check/"),
           chips=["Plain English","Home &amp; business","Practical protection"]),
      f'''    <section class="blog-section" aria-label="Cyber threats">
      <div class="wrap">
        <div class="blog-cat-head" data-reveal><h2>Know the threats, stay protected</h2></div>
        <div class="blog-grid" data-stagger>
{cards}        </div>
      </div>
    </section>''',
      cta("Let us keep you protected",
          "We protect Dorset homes and businesses from every threat on this page &mdash; with layered security, Malwarebytes Premium and a real person to ask.",
          primary=("Explore Cybersecurity", "/cybersecurity-support/"), secondary=("Malwarebytes Premium", "/malwarebytes-premium/")),
    ])
    def schema(s, _desc=desc, _items=[{"@type":"ListItem","position":i+1,"name":t["name"],"url":SITE+"/"+t["slug"]+"/"} for i,t in enumerate(THREATS)]):
        return graph([crumb(s, "Cyber Threats"), webpage(s, "Cyber Threats Explained", _desc, "CollectionPage"),
                      {"@type": "ItemList", "@id": SITE + "/cyber-threats/#list", "itemListElement": _items}])
    add(slug=slug, title="Cyber Threats Explained | Stay Safe Online | 365 Techies",
        desc=desc, og_title="Cyber Threats Explained | 365 Techies", schema=schema, content=content)
cyber_threats_hub()

if __name__ == "__main__":
    w = write_all()
    print("Wrote %d pages total:" % len(w))
    for x in w:
        print("  " + x)
