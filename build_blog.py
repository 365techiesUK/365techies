# -*- coding: utf-8 -*-
"""IT Advice Hub + blog posts for 365 Techies.
Imports shared chrome/helpers, registers all prior pages, adds the hub + 25 posts, writes everything.
Run: python build_blog.py
"""
import build_pages as bp
import build_local      # registers 12 local/customer pages
import build_extra      # registers 9 specialist/trust pages
from build_pages import (add, graph, crumb, webpage, faqpage, faq_html, cta,
                         hero, SITE, write_all)

def bc3(title):
    return (f'<a href="/">Home</a> <span>/</span> '
            f'<a href="/it-advice/">IT Advice</a> <span>/</span> '
            f'<span aria-current="page">{title}</span>')

def post_crumb(slug, title):
    return {"@type": "BreadcrumbList", "@id": f"{SITE}/{slug}/#breadcrumb", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "IT Advice", "item": SITE + "/it-advice/"},
        {"@type": "ListItem", "position": 3, "name": title, "item": f"{SITE}/{slug}/"}]}

def blogposting(slug, title, desc, cat, dt="2026-06-15"):
    return {"@type": "BlogPosting", "@id": f"{SITE}/{slug}/#article",
            "headline": title, "description": desc, "articleSection": cat, "inLanguage": "en-GB",
            "datePublished": dt, "dateModified": bp.TODAY,
            "author": {"@type": "Organization", "name": "365 Techies", "url": SITE + "/"},
            "publisher": {"@id": SITE + "/#business"}, "image": SITE + "/og-image.jpg",
            "mainEntityOfPage": {"@id": f"{SITE}/{slug}/#webpage"}, "url": f"{SITE}/{slug}/"}

CALLOUT = ('<div class="article__callout"><p><strong>Prefer to let us handle it?</strong> '
           'Our monthly IT support plans include this and much more, from &pound;18.25/month per computer — '
           'with a friendly techie on hand whenever you need one. Call <a href="tel:+441202775566">01202 775566</a> '
           'or <a href="/monthly-it-support/">view our plans</a>.</p></div>')

def make_post(slug, cat, title, lede, body, points, related, faqs=None, dt="2026-06-15", dt_pretty="June 2026"):
    desc = lede
    points_html = "\n".join(f"          <li>{p}</li>" for p in points)
    related_html = "\n".join(f'          <a href="{h}">{l}</a>' for l, h in related)
    nodes = [post_crumb(slug, title), webpage(slug, title, desc), blogposting(slug, title, desc, cat, dt)]
    if title.lower().startswith("how to"):
        nodes.append({"@type": "HowTo", "@id": f"{SITE}/{slug}/#howto", "name": title, "description": desc,
                      "step": [{"@type": "HowToStep", "position": i + 1, "name": p, "text": p}
                               for i, p in enumerate(points)]})
    if faqs:
        nodes.append(faqpage(slug, faqs))
    content = "\n".join([
      hero(bc3(title), f"// {cat.upper()}", title, lede,
           cta1=("Read more advice", "/it-advice/"), cta2=("View Monthly Plans", "/monthly-it-support/")),
      f'''    <section class="section" aria-label="Article">
      <article class="article">
        <p class="mono" style="color:var(--muted);font-size:.8rem;margin:0 0 1.6rem">Published {dt_pretty} &middot; {cat} &middot; by 365 Techies</p>
{body}
        <h2>Key points</h2>
        <ul>
{points_html}
        </ul>
        {CALLOUT}
      </article>
      <div class="related">
        <p class="related__head">Related advice and services</p>
        <div class="related__links">
{related_html}
        </div>
      </div>
    </section>''',
      faq_html(faqs) if faqs else "",
      cta("Reliable IT support, every month",
          "Stop firefighting tech problems. Get friendly monthly IT support for your home or business across Dorset.",
          primary=("View Monthly Plans", "/monthly-it-support/"), secondary=("Call 01202 775566", "tel:+441202775566")),
    ])
    def schema(s, _nodes=nodes):
        return graph(_nodes)
    add(slug=slug, title=f"{title} | 365 Techies", desc=desc, og_title=title, schema=schema, content=content)

CATS = ["Monthly Support", "Home Users", "Business IT", "Microsoft 365", "Windows"]
POSTS = [
 # ---------------- Refurbished / buying advice ----------------
 dict(slug="are-refurbished-laptops-any-good", cat="Home Users",
   title="Are Refurbished Laptops Any Good?",
   lede="It is one of the most common questions we are asked. The honest answer: yes, a good refurbished laptop can be excellent value — as long as you buy the right kind from the right place. Here is what actually matters.",
   body="<p>The honest answer is <strong>yes &mdash; a good refurbished laptop can be excellent value</strong>, as long as you buy the right kind from the right place. Here is what actually matters.</p><h2>What &lsquo;refurbished&rsquo; really means</h2><p>A refurbished computer is a used machine that has been professionally tested, cleaned, securely wiped and brought back to full working order before resale. The best ones are <strong>ex-business machines</strong> &mdash; computers that spent their first life in an office, then came back in bulk when the company upgraded.</p><h2>Why business-grade is the sweet spot</h2><p>This is the key. A business-grade Dell Latitude laptop or OptiPlex desktop is built to a far higher standard than a cheap new high-street laptop: tougher materials, better components and stronger security. Dell&rsquo;s Latitude laptops are even tested to military-standard durability methods. Bought refurbished, that quality costs <strong>far less than new</strong> &mdash; often around 30&ndash;50% less &mdash; while still doing everything most people need.</p><h2>The honest trade-offs</h2><p>We believe in being straight with you. A refurbished business machine usually runs a slightly earlier processor generation, batteries vary with age, and stock of any one model is limited. None of that matters for everyday use &mdash; email, web, photos, banking, office work &mdash; but if you need the very latest hardware for serious gaming or heavy video editing, new may suit you better.</p><h2>How to be sure you are getting a good one</h2><p>Buy from a real, reputable seller &mdash; not an untested bargain off a marketplace. Look for fully tested machines, a clear condition grade, a proper warranty and ideally a fresh SSD. At 365 Techies we have supplied refurbished Dell business laptops and PCs for <strong>over 30 years</strong>: every machine gets a <strong>brand-new Samsung Pro SSD</strong> (5-year guarantee), is graded A, B or C for how it looks, and comes with a <strong>Dell next-business-day warranty plus our own 5-year guarantee</strong> &mdash; set up, supported, and repaired by us if you ever break it. See our <a href=\"/dell-hardware/\">refurbished Dell laptops &amp; PCs</a>.</p>",
   points=["A good refurbished laptop is genuinely excellent value","Business-grade Dell Latitude/OptiPlex is the sweet spot","Honest trade-offs: earlier CPU, battery wear, limited stock","Buy tested, graded and warrantied &mdash; ideally with a new SSD"],
   related=[("Refurbished Dell Laptops &amp; PCs","/dell-hardware/"),("Refurbished vs New Laptop","/refurbished-vs-new-laptop/"),("Is It Safe to Buy Refurbished?","/is-it-safe-to-buy-a-refurbished-laptop/"),("Refurbished Laptops in Dorset","/refurbished-laptops-dorset/"),("How to Choose a Laptop","/how-to-choose-a-laptop/")],
   faqs=[
     ("Are refurbished laptops reliable?","Business-grade refurbished machines are very reliable &mdash; they were built to survive years of daily office use. A professionally refurbished one, with a fresh SSD and a warranty, often outlasts a brand-new budget laptop."),
     ("How long will a refurbished laptop last?","With care, several years. Business Dells are built to last, and fitting a new SSD removes the part most likely to wear out. We also offer ongoing support and repairs to keep it going."),
     ("What should I check before buying refurbished?","That it is fully tested, has a clear condition grade, comes with a real warranty and ideally a new SSD &mdash; and that you are buying from a reputable seller you can actually contact."),
   ]),
 dict(slug="refurbished-vs-new-laptop", cat="Home Users",
   title="Refurbished vs New Laptop: Which Should You Buy?",
   lede="Should you save money with a refurbished laptop, or pay more for new? Here is an honest, plain-English comparison — on price, reliability, warranty and even the planet — to help you decide.",
   body="<p>Both can be the right answer &mdash; it depends on what you need and what you value. Here is how refurbished business-grade machines stack up against buying new.</p><h2>Price</h2><p>The obvious one. A professionally refurbished business Dell typically costs <strong>around 30&ndash;50% less</strong> than an equivalent new machine &mdash; or, for the same money, gets you a far better-built computer than a new budget model.</p><h2>Reliability &amp; build</h2><p>A new budget laptop is often built down to a price in plastic. A refurbished <strong>business-grade</strong> Dell Latitude or OptiPlex was built for offices that cannot afford downtime &mdash; tougher materials, better components, stronger security, and designed to be serviced. With a fresh SSD fitted, a good refurbished business machine frequently outlasts a new budget one.</p><h2>Warranty &amp; peace of mind</h2><p>New machines come with a manufacturer&rsquo;s warranty &mdash; but a good refurbished seller can match it. Ours come with a <strong>Dell next-business-day worldwide warranty</strong> (extendable), <strong>our own 5-year guarantee</strong>, and a 5-year guarantee on the new Samsung Pro SSD, plus a full repair service. You are covered by the Consumer Rights Act either way when you buy from a UK business.</p><h2>The planet</h2><p>Most of a computer&rsquo;s carbon footprint comes from <em>making</em> it. An independent Cranfield University study found a professionally remanufactured laptop produced only about <strong>6% of the carbon</strong> of building a new one &mdash; so refurbished is much kinder to the environment, in a country that is the second-worst in the world for e-waste per person.</p><h2>When new makes more sense</h2><p>If you need the very latest processor for serious gaming, 3D or heavy video work, or you want a specific brand-new model with the longest possible life ahead of it, new can be the better call. For everyday home and small-business use, refurbished business-grade usually wins on value.</p><h2>The verdict</h2><p>For most people, a refurbished business Dell &mdash; tested, with a new SSD, a real warranty and local support &mdash; is the smart-money choice. <a href=\"/dell-hardware/\">See our refurbished Dell range</a>, or tell us what you need and we&rsquo;ll match you one.</p>",
   points=["Refurbished business Dell is typically ~30&ndash;50% less than new","Business-grade build often outlasts a new budget machine","Our refurbished machines come with strong warranties and a new SSD","Refurbished is far greener &mdash; about 6% of the carbon of new","New still suits the latest-gen gaming and video needs"],
   related=[("Refurbished Dell Laptops &amp; PCs","/dell-hardware/"),("Are Refurbished Laptops Any Good?","/are-refurbished-laptops-any-good/"),("Is It Safe to Buy Refurbished?","/is-it-safe-to-buy-a-refurbished-laptop/"),("Refurbished Laptops in Dorset","/refurbished-laptops-dorset/"),("Our Sustainability","/sustainability/")],
   faqs=[
     ("Is refurbished much cheaper than new?","Yes &mdash; typically around 30&ndash;50% less for an equivalent machine, or a much better-built computer for the same budget."),
     ("Will a refurbished laptop feel slow compared to new?","Not for everyday use. We fit a new Samsung Pro SSD, which is the single biggest thing that makes a computer feel fast and responsive."),
     ("Is the warranty as good as buying new?","It can be better. Ours include a Dell next-business-day warranty plus our own 5-year guarantee, and you keep your Consumer Rights Act protection as a UK buyer."),
   ]),
 dict(slug="is-it-safe-to-buy-a-refurbished-laptop", cat="Home Users",
   title="Is It Safe to Buy a Refurbished Laptop?",
   lede="Worried a refurbished laptop might be a risk? It is a fair question. Here is the honest answer — the real risks to avoid, and how to buy one safely with complete peace of mind.",
   body="<p>Buying refurbished is safe &mdash; <strong>as long as you buy from the right place</strong>. The risk is not refurbishment itself; it is who you buy from. Here is how to stay safe.</p><h2>The real risks (and they are avoidable)</h2><p>The problems people run into nearly always come from untrustworthy sellers, not from refurbished machines as such: an untested computer with a hidden fault, a worn-out battery, unlicensed Windows, a warranty already void &mdash; or the previous owner&rsquo;s data left on the drive. A suspiciously cheap machine on a marketplace, from a seller who vanishes after payment, is where things go wrong.</p><h2>How to buy one safely</h2><p>Buy from a reputable, established seller you can actually contact. Look for machines that are <strong>fully tested</strong>, <strong>securely wiped</strong> with a clean copy of Windows, clearly graded for condition, and covered by a <strong>real warranty</strong>. Buying from a UK business also gives you <strong>Consumer Rights Act</strong> protection &mdash; including a 30-day right to reject if something is faulty &mdash; which you simply do not get buying privately.</p><h2>What about my data &mdash; and my old machine?</h2><p>A proper refurbisher securely erases all previous data before resale. And when you upgrade, we can move your files across to your new Dell, then <strong>securely wipe and responsibly recycle your old machine</strong>, with a certificate. See our <a href=\"/secure-it-disposal/\">secure IT disposal</a> service.</p><h2>Buying safely from 365 Techies</h2><p>We have refurbished Dell business machines for <strong>over 30 years</strong>. Every one is fully tested, fitted with a <strong>brand-new Samsung Pro SSD</strong>, securely wiped, graded A, B or C, and backed by a <strong>Dell next-business-day warranty, our own 5-year guarantee and a full repair service</strong> &mdash; set up and supported by real local people you can phone or visit. <a href=\"/dell-hardware/\">See our refurbished Dell laptops &amp; PCs</a>.</p>",
   points=["Refurbished is safe &mdash; the risk is who you buy from","Avoid untested marketplace bargains with no recourse","Buy tested, wiped, graded and warrantied, from a real UK business","The Consumer Rights Act protects you as a UK buyer","A good refurbisher wipes data &mdash; and can recycle your old machine"],
   related=[("Refurbished Dell Laptops &amp; PCs","/dell-hardware/"),("Secure IT Disposal","/secure-it-disposal/"),("Are Refurbished Laptops Any Good?","/are-refurbished-laptops-any-good/"),("Refurbished Laptops in Dorset","/refurbished-laptops-dorset/")],
   faqs=[
     ("Is it safe data-wise to buy a used laptop?","Yes &mdash; a professional refurbisher securely erases all previous data and installs a clean copy of Windows before resale, so there is nothing of the old owner&rsquo;s left on it."),
     ("What if it goes wrong after I buy it?","From us you are covered by a Dell next-business-day warranty, our own 5-year guarantee and a full repair service &mdash; and as a UK buyer, by the Consumer Rights Act. You always have someone local to call."),
     ("Are marketplace refurbished laptops safe?","They can be hit-and-miss &mdash; often untested, with no real warranty or recourse. Buying from an established local firm removes that gamble."),
   ]),
 # ---------------- Monthly Support ----------------
 dict(slug="why-monthly-it-support-beats-per-repair", cat="Monthly Support",
   title="Why Monthly IT Support Is Better Than Paying Per Repair",
   lede="Paying per repair feels cheaper — until something breaks at the worst possible moment. Here is why a monthly IT support plan usually works out better value, and far less stressful.",
   body="<p>When you only call for help after something goes wrong, you are always on the back foot. The problem is urgent, the fix is reactive, and the bill is unpredictable. Monthly IT support flips that around.</p><h2>Prevention costs less than cure</h2><p>Most serious IT problems give warning signs — a failing drive, missed updates, a creeping virus. With regular maintenance we catch these early, before they turn into expensive emergencies or lost data.</p><h2>Predictable cost, faster help</h2><p>A monthly plan means one known cost instead of nasty surprises, and subscribers jump the queue for support. You also stop paying the hidden price of downtime, lost work and stress.</p>",
   points=["Problems are caught early, before they cost you","No surprise call-out fees or hourly bills","Priority response for subscribers","Devices last longer with regular care"],
   related=[("Monthly IT Support","/monthly-it-support/"),("Home Support Plans","/home-it-support-plans/"),("Business Support Plans","/business-it-support-plans/")]),
 dict(slug="whats-included-home-it-support-subscription", cat="Monthly Support",
   title="What Is Included in a Home IT Support Subscription?",
   lede="A home IT support subscription is more than someone to call when things break. Here is exactly what you get every month with a 365 Techies home plan.",
   body="<p>Home IT support is designed to keep your computers, devices and accounts running smoothly all year — not just to react when something goes wrong.</p><h2>Everyday help, whenever you need it</h2><p>You get unlimited remote support for the everyday things: slow laptops, email trouble, printers, Wi-Fi, passwords and Microsoft 365. Most issues are fixed in minutes without anyone leaving home.</p><h2>Maintenance and protection in the background</h2><p>Every plan includes a full computer service every six weeks, antivirus and web protection, software updates and backup checks — quietly keeping everything fast and safe.</p>",
   points=["Unlimited remote support","Full computer service every 6 weeks","Antivirus, updates and backup checks","Help with Wi-Fi, printers, email and Microsoft 365"],
   related=[("Home IT Support","/home-it-support-subscriptions/"),("Home Support Plans","/home-it-support-plans/"),("Cybersecurity","/cybersecurity-support/")]),
 dict(slug="whats-included-business-it-support-plan", cat="Monthly Support",
   title="What Is Included in a Business IT Support Plan?",
   lede="A business IT support plan gives you an outsourced IT department for a flat monthly fee. Here is what is included and how it keeps your team productive and protected.",
   body="<p>For most small businesses, employing full-time IT staff is overkill — but going without support is risky. A monthly plan bridges that gap.</p><h2>Support for your whole team</h2><p>You get priority remote and on-site support for every user and device, Microsoft 365 administration, and help onboarding new starters or securing accounts when people leave.</p><h2>Security, backups and peace of mind</h2><p>Plans include cybersecurity monitoring and patching, daily verified backups, and regular maintenance — plus technology advice and Dell hardware supply as you grow.</p>",
   points=["Priority support for every user and device","Microsoft 365 management","Cybersecurity, patching and verified backups","New starter onboarding and leaver checks"],
   related=[("Business IT Support","/business-it-support-subscriptions/"),("Business Support Plans","/business-it-support-plans/"),("Cybersecurity","/cybersecurity-support/")]),
 dict(slug="how-monthly-it-support-saves-time", cat="Monthly Support",
   title="How Monthly IT Support Helps Small Businesses Save Time",
   lede="Every hour your team spends fighting technology is an hour not spent on the business. Here is how monthly IT support quietly hands that time back.",
   body="<p>Small IT problems add up. A printer that won't connect, a slow PC, an email that bounces — individually minor, but together they drain hours every week.</p><h2>Someone else owns the problem</h2><p>With a monthly plan, your team simply reports the issue and gets back to work while we fix it. No more huddling around a screen trying to solve it yourselves.</p><h2>Fewer problems in the first place</h2><p>Proactive maintenance, updates and monitoring mean many problems never happen — and the ones that do are caught before they spread.</p>",
   points=["Staff report issues and get straight back to work","Proactive maintenance prevents many problems","Faster fixes with priority response","Less downtime, more productivity"],
   related=[("Business IT Support","/business-it-support-subscriptions/"),("Small Business IT Support","/small-business-it-support/"),("Remote IT Support","/remote-it-support/")]),
 dict(slug="why-home-users-need-regular-maintenance", cat="Monthly Support",
   title="Why Home Users Should Have Regular Computer Maintenance",
   lede="Computers, like cars, run best with a regular service. Here is why home users benefit from regular maintenance — and what happens without it.",
   body="<p>Left alone, computers gradually slow down, fall behind on security updates and fill up with clutter. By the time most people notice, the problem is already well advanced.</p><h2>What regular maintenance does</h2><p>A regular service clears out the clutter, installs important updates, checks security and antivirus, and verifies your backups — keeping the machine fast, safe and reliable.</p><h2>It saves money too</h2><p>Well-maintained computers last longer and suffer fewer failures, so you replace them less often and avoid emergency repair bills.</p>",
   points=["Keeps your computer fast and responsive","Stays on top of security updates","Catches problems before they grow","Helps devices last longer"],
   related=[("Home IT Support","/home-it-support-subscriptions/"),("Home Support Plans","/home-it-support-plans/"),("Why is my computer slow?","/why-is-my-computer-slow/")]),
 dict(slug="break-fix-vs-monthly-vs-in-house-it-support", cat="Monthly Support",
   title="Break-Fix vs Monthly IT Support vs In-House: Which Is Right for You?",
   lede="Should you pay per problem, take out a monthly plan, or hire someone in-house? Here is a plain-English comparison of the three ways to get IT support — and who each one suits.",
   body="<p>There are really only three ways to get IT support: call someone when things break (break-fix), pay a fixed monthly fee for ongoing cover (managed/monthly support), or employ your own IT person (in-house). Each has its place &mdash; the trick is matching the model to your situation.</p><h2>Break-fix (pay per problem)</h2><p>You only pay when something goes wrong. It feels cheap, but it is reactive: help is slower, costs are unpredictable, and nothing is being done to prevent the next problem. It can suit a single home computer you rarely rely on &mdash; but for anything important, one bad week can cost more than a year of cover.</p><h2>Monthly IT support (managed)</h2><p>A fixed monthly fee covers unlimited support plus the proactive work that stops problems happening &mdash; maintenance, updates, security and backups. Costs are predictable, help is prioritised, and someone is genuinely looking after your technology. For most homes and small businesses this is the sweet spot on cost and peace of mind.</p><h2>In-house IT</h2><p>Hiring your own IT staff gives you someone on-site full time, but it is expensive (salary, holiday, training, cover) and one person can rarely cover every skill. It only starts to make sense for larger organisations &mdash; and even then, many pair an in-house person with an outside team like us.</p><h2>So which should you choose?</h2><p>If you rely on your tech at all, monthly support almost always wins on value and stress. Break-fix suits the occasional, non-critical fix; in-house suits larger teams with constant, complex needs. Still unsure? Our <a href=\"/plan-finder/\">Plan Finder</a> and free <a href=\"/it-health-check-tool/\">IT Health Check</a> will point you the right way.</p>",
   points=["Break-fix is cheapest upfront but reactive and unpredictable","Monthly support adds prevention, priority and a fixed cost","In-house only pays off for larger teams","For most homes and small businesses, monthly support is best value"],
   related=[("Monthly IT Support","/monthly-it-support/"),("Pricing &amp; Plans","/pricing/"),("Get a Quick Quote","/quick-quote/"),("Business IT Support","/business-it-support-subscriptions/")],
   faqs=[
     ("Is monthly IT support more expensive than break-fix?","On paper the monthly fee looks like more, but it includes prevention and unlimited help. Break-fix often costs more overall once you add up emergency call-outs, downtime and lost data."),
     ("When does in-house IT make sense?","Usually once you have enough users and complexity to keep someone busy full time &mdash; often 30+ staff. Below that, monthly support gives you a whole team for less than one salary."),
     ("Can I start with break-fix and switch later?","Absolutely. Many customers call us for a one-off fix, then move onto a plan to avoid the next emergency. Switching is easy and there are no long contracts."),
   ]),
 dict(slug="how-much-does-it-support-cost-uk-2026", cat="Monthly Support",
   title="How Much Should IT Support Cost in the UK? (2026 Guide)",
   lede="A clear, honest guide to what IT support costs in the UK in 2026 — typical price ranges for homes and businesses, what drives the price, and how to make sure you are getting fair value.",
   body="<p>IT support pricing in the UK varies widely, and many providers keep their prices hidden &mdash; which makes it hard to know if you are getting a fair deal. Here is a straight answer.</p><h2>Typical price ranges</h2><p>For <strong>home users</strong>, monthly support typically runs from around &pound;15 to &pound;30 per month depending on how many devices you have. For <strong>small businesses</strong>, support is usually priced per user (or per device) and commonly falls somewhere around &pound;20 to &pound;60 per user per month, depending on the level of security, backups and management included. One-off repairs are normally quoted on the work involved.</p><h2>What drives the price</h2><ul><li>Home or business, and how many users and devices.</li><li>Monthly plan vs pay-per-problem.</li><li>How much is included &mdash; basic help vs fully managed security, backups and Microsoft 365.</li><li>Remote (cheaper, faster) vs on-site support.</li></ul><h2>Watch for hidden costs</h2><p>The headline price is not the whole story. Ask what is <em>not</em> included: call-out fees, &lsquo;out of hours&rsquo; charges, project work, and long lock-in contracts can all add up. We publish our prices, keep plans rolling and agree any extra cost with you up front.</p><h2>What we charge</h2><p>To keep things simple and transparent: home support from <strong>&pound;18.25/month per computer</strong> and business support from <strong>&pound;24.38/month per computer</strong>, plus Microsoft 365 at <strong>&pound;4.85/month per user</strong>, with no contracts and no hidden fees. See our <a href=\"/pricing/\">pricing page</a> for the full comparison, or get a tailored <a href=\"/quick-quote/\">quick quote</a>.</p>",
   points=["Home support is typically ~&pound;15&ndash;&pound;30/month","Business support is usually priced per user per month","What is included matters as much as the headline price","Watch for call-out fees, out-of-hours charges and lock-in contracts"],
   related=[("Pricing &amp; Plans","/pricing/"),("IT Cost Guide","/it-support-cost-guide/"),("Get a Quick Quote","/quick-quote/"),("Plan Finder","/plan-finder/")],
   faqs=[
     ("Why do so few IT companies show their prices?","Many price case-by-case to maximise margin. We think that is unhelpful, so we publish clear starting prices and explain exactly what is included."),
     ("Is cheaper IT support worse?","Not always &mdash; but very low prices often exclude the proactive work (monitoring, patching, backups) that actually prevents problems. Compare what is included, not just the headline figure."),
     ("How can I get an accurate price for my setup?","Tell us a little about your home or business and we will give you an honest, tailored quote &mdash; try our under-a-minute Quick Quote."),
   ]),
 # ---------------- Home Users ----------------
 dict(slug="why-is-my-computer-slow", cat="Home Users",
   title="Why Is My Computer Running Slowly?",
   lede="A slow computer is one of the most common frustrations we fix. Here are the usual causes — and what you can do about them.",
   body="<p>Computers slow down for all sorts of reasons, and it is rarely a sign you need a new one. Most slowdowns are fixable.</p><h2>The usual suspects</h2><p>Too many programs starting up, a full hard drive, pending updates, a tired hard disk, or background malware are the most common culprits. A traditional hard drive is often the biggest bottleneck — upgrading to an SSD can make an old laptop feel new.</p><h2>What you can try first</h2><p>Restart properly, install pending updates, uninstall programs you no longer use, and run a full antivirus scan. If it is still sluggish, it is worth having it checked.</p>",
   points=["Reduce startup programs and free up disk space","Install pending Windows and app updates","An SSD upgrade transforms older machines","Rule out viruses with a full scan"],
   related=[("Computer Repairs","/computer-repairs/"),("Windows 11 Support","/windows-11-support/"),("How to know if your computer has a virus","/how-to-know-if-computer-has-virus/")]),
 dict(slug="how-to-stay-safe-from-online-scams", cat="Home Users",
   title="How to Stay Safe From Online Scams",
   lede="Online scams are more convincing than ever. Here is how to spot them and protect yourself, your money and your accounts.",
   body="<p>Scammers rely on urgency and fear — a fake delivery, a bank alert, a too-good-to-be-true offer. The best defence is to slow down and check.</p><h2>The warning signs</h2><p>Unexpected messages, pressure to act now, requests for passwords or payment, slightly wrong web addresses, and poor spelling are all red flags. Banks and genuine companies never ask for your full password or PIN.</p><h2>Simple habits that protect you</h2><p>Never click links in unexpected messages — go to the website directly. Use strong, unique passwords and turn on two-factor authentication. And if you are ever unsure, ask before you click.</p>",
   points=["Be suspicious of urgency and unexpected messages","Never share full passwords, PINs or codes","Go to websites directly, not via links","Turn on two-factor authentication"],
   related=[("Cybersecurity","/cybersecurity-support/"),("How to keep your home computer secure","/how-to-keep-home-computer-secure/"),("Home IT Support","/home-it-support-subscriptions/")]),
 dict(slug="how-to-know-if-computer-has-virus", cat="Home Users",
   title="How to Know If Your Computer Has a Virus",
   lede="Worried your computer might be infected? Here are the tell-tale signs of a virus or malware, and what to do next.",
   body="<p>Modern malware often tries to stay hidden, but it usually leaves clues. Spotting them early limits the damage.</p><h2>Common symptoms</h2><p>Sudden slowness, pop-ups and adverts, programs you did not install, your browser homepage changing, files you cannot open, or friends receiving odd messages from you can all point to an infection.</p><h2>What to do</h2><p>Disconnect from the internet, avoid logging into banking, and run a full antivirus scan. If anything looks serious — especially ransomware demanding payment — get expert help straight away rather than risking your data.</p>",
   points=["Watch for pop-ups, slowness and strange programs","Disconnect and avoid logging into sensitive accounts","Run a full antivirus scan","Get help fast if you suspect ransomware"],
   related=[("Cybersecurity","/cybersecurity-support/"),("Computer Repairs","/computer-repairs/"),("Backup and Recovery","/backup-support/")]),
 dict(slug="why-does-my-printer-keep-disconnecting", cat="Home Users",
   title="Why Does My Printer Keep Disconnecting?",
   lede="Few things are as annoying as a printer that drops offline just when you need it. Here is why it happens and how to fix it for good.",
   body="<p>Most printer disconnections come down to the wireless connection or the way the printer talks to your computer — not a broken printer.</p><h2>Common causes</h2><p>A weak Wi-Fi signal, the printer going to sleep, an out-of-date driver, or the computer picking the wrong printer all cause the dreaded offline status. Printers on the far side of the house are especially prone to dropping out.</p><h2>How to fix it</h2><p>Move the printer closer to the router or add a Wi-Fi booster, update the printer driver, and set it as the default. For a permanent fix, we can configure reliable wireless printing across all your devices.</p>",
   points=["Weak Wi-Fi is the most common cause","Keep printer drivers up to date","Set the correct default printer","We can set up reliable wireless printing"],
   related=[("Printer Support","/printer-support/"),("Wi-Fi Support","/wifi-support/"),("Home IT Support","/home-it-support-subscriptions/")]),
 dict(slug="how-to-keep-home-computer-secure", cat="Home Users",
   title="How to Keep Your Home Computer Secure",
   lede="You do not need to be a tech expert to keep your home computer safe. These simple habits cover the vast majority of risks.",
   body="<p>Good security at home is mostly about a few sensible habits, kept up consistently — not expensive software.</p><h2>The essentials</h2><p>Keep Windows and your apps updated, run reputable antivirus, use strong and unique passwords with a password manager, and turn on two-factor authentication for important accounts like email and banking.</p><h2>Do not forget backups</h2><p>Security is not just about keeping threats out — it is about recovering if the worst happens. Regular, tested backups mean ransomware or a failed drive never costs you your photos and documents.</p>",
   points=["Keep Windows and apps updated","Use strong, unique passwords and a password manager","Turn on two-factor authentication","Back up your important files regularly"],
   related=[("Cybersecurity","/cybersecurity-support/"),("Backup and Recovery","/backup-support/"),("How to stay safe from online scams","/how-to-stay-safe-from-online-scams/")]),
 # ---------------- Business IT ----------------
 dict(slug="it-checklist-for-small-businesses", cat="Business IT",
   title="IT Checklist for Small Businesses",
   lede="Not sure if your business IT is in good shape? Work through this practical checklist to spot the gaps before they cause problems.",
   body="<p>Good business IT is not complicated, but it is easy to let things slip. This checklist covers the fundamentals every small business should have in place.</p><h2>The basics to get right</h2><p>Verified daily backups, up-to-date antivirus and patching, strong passwords with multi-factor authentication, properly licensed Microsoft 365, and a clear process for setting up and removing staff accounts.</p><h2>Plan ahead</h2><p>Keep a simple inventory of your devices and software, know how you would recover from a disaster, and budget for replacing ageing equipment before it fails.</p>",
   points=["Daily, verified backups in place","Antivirus, patching and MFA enabled","Microsoft 365 licensed and secured","A process for staff onboarding and offboarding"],
   related=[("Business IT Support","/business-it-support-subscriptions/"),("Cybersecurity","/cybersecurity-support/"),("Backup and Recovery","/backup-support/")]),
 dict(slug="why-small-businesses-need-cybersecurity", cat="Business IT",
   title="Why Small Businesses Need Cybersecurity",
   lede="Many small businesses assume they are too small to be a target. In reality, that is exactly why criminals go after them.",
   body="<p>Cybercriminals increasingly target small businesses because they often have valuable data but weaker defences than large companies.</p><h2>The real risks</h2><p>A single phishing email or ransomware attack can lock you out of your systems, expose customer data, and cost days of downtime — sometimes enough to put a small business under.</p><h2>Practical protection</h2><p>The good news is that strong protection is affordable: monitoring and patching, email filtering, multi-factor authentication, staff awareness and tested backups together stop the vast majority of attacks.</p>",
   points=["Small businesses are common, easy targets","One attack can cause serious downtime and cost","MFA and email filtering stop most attacks","Tested backups are your safety net"],
   related=[("Cybersecurity","/cybersecurity-support/"),("Business IT Support","/business-it-support-subscriptions/"),("How to protect your business email","/how-to-protect-your-business-email/")]),
 dict(slug="how-to-protect-your-business-email", cat="Business IT",
   title="How to Protect Your Business Email",
   lede="Email is the front door to your business — and the number one target for attackers. Here is how to lock it down.",
   body="<p>Business email accounts hold the keys to everything, which is why securing them is the single most valuable thing most businesses can do.</p><h2>Start with the fundamentals</h2><p>Turn on multi-factor authentication for every account, use strong unique passwords, and switch on the phishing and spam protection built into Microsoft 365.</p><h2>Watch for impersonation</h2><p>Many attacks pretend to be the boss or a supplier asking for payment or details. Train staff to verify unusual requests, and consider rules that flag external or spoofed messages.</p>",
   points=["Enable multi-factor authentication everywhere","Use strong, unique passwords","Switch on Microsoft 365 phishing protection","Verify unusual payment or detail requests"],
   related=[("Microsoft 365 Support","/microsoft-365-support/"),("Email Support","/email-support/"),("Cybersecurity","/cybersecurity-support/")]),
 dict(slug="what-to-do-when-an-employee-leaves", cat="Business IT",
   title="What to Do When an Employee Leaves Your Business",
   lede="When someone leaves, their access does not disappear on its own. Here is a simple offboarding checklist to keep your business secure.",
   body="<p>Former staff accounts that stay active are a real security risk — and a common one. A clear leaver process closes that gap.</p><h2>Secure the accounts</h2><p>Disable the user's sign-in, reset passwords, and remove access to email, files and apps. With Microsoft 365 you can block access instantly while keeping their mailbox and files for the business.</p><h2>Preserve and hand over</h2><p>Forward or delegate their email, transfer ownership of important files, and reclaim the software licence. Recovering company devices and wiping personal ones completes the process.</p>",
   points=["Disable sign-in and reset passwords immediately","Keep the mailbox and files for the business","Reassign or forward their email","Reclaim licences and devices"],
   related=[("Business IT Support","/business-it-support-subscriptions/"),("Microsoft 365 Support","/microsoft-365-support/"),("Cybersecurity","/cybersecurity-support/")]),
 dict(slug="why-backups-are-essential-for-small-businesses", cat="Business IT",
   title="Why Backups Are Essential for Small Businesses",
   lede="Hardware fails, mistakes happen and ransomware is everywhere. For a small business, a good backup is the difference between a hiccup and a disaster.",
   body="<p>Your business data — accounts, customer records, emails, documents — is irreplaceable. Yet backups are the thing most often neglected until it is too late.</p><h2>What a good backup looks like</h2><p>It is automatic, off-site or in the cloud, covers your Microsoft 365 data too, and — crucially — is tested regularly so you know it will actually restore.</p><h2>Why cloud sync is not enough</h2><p>OneDrive and similar services sync changes everywhere, so a deleted or ransomware-encrypted file is lost on every device. A proper backup keeps recoverable history, separate from the live data.</p>",
   points=["Automatic, off-site and regularly tested","Covers Microsoft 365 data, not just devices","Cloud sync alone is not a backup","Protects against ransomware and mistakes"],
   related=[("Backup and Recovery","/backup-support/"),("Microsoft 365 Backup: do you need it?","/microsoft-365-backup-do-you-need-it/"),("Business IT Support","/business-it-support-subscriptions/")]),
 # ---------------- Microsoft 365 ----------------
 dict(slug="common-outlook-problems-and-fixes", cat="Microsoft 365",
   title="Common Outlook Problems and How to Fix Them",
   lede="Outlook is brilliant when it works — and maddening when it does not. Here are the most common Outlook problems and how to fix them.",
   body="<p>Most Outlook issues fall into a few familiar categories, and most are quick to resolve once you know where to look.</p><h2>Not sending or receiving</h2><p>This is usually a connection, password or large-attachment issue. Check you are online, that your password has not changed, and that your mailbox is not full.</p><h2>Crashing, freezing or slow</h2><p>An oversized mailbox, a faulty add-in or a corrupted profile are the usual causes. Archiving old mail, disabling add-ins or rebuilding the profile normally sorts it.</p>",
   points=["Send/receive errors are often password or connection issues","Keep your mailbox from getting too full","Disable faulty add-ins if Outlook crashes","A profile rebuild fixes many stubborn problems"],
   related=[("Email Support","/email-support/"),("Microsoft 365 Support","/microsoft-365-support/"),("How to secure your Microsoft 365 account","/how-to-secure-your-microsoft-365-account/")]),
 dict(slug="microsoft-365-vs-gmail-for-small-businesses", cat="Microsoft 365",
   title="Microsoft 365 vs Gmail for Small Businesses",
   lede="Microsoft 365 or Google Workspace? Both are capable, but for many small businesses one is a clearer fit. Here is how they compare.",
   body="<p>Both platforms offer professional email, cloud storage and online apps. The right choice usually comes down to how you work and what you already use.</p><h2>Where Microsoft 365 wins</h2><p>If your team relies on the full desktop versions of Word, Excel and Outlook, works with documents heavily, or uses Teams, Microsoft 365 tends to feel more familiar and capable.</p><h2>Where Google fits</h2><p>If you work almost entirely in the browser and value simplicity and easy collaboration, Google Workspace can be a great fit. Either way, the setup and security matter more than the badge.</p>",
   points=["Microsoft 365 suits heavy document and Office users","Google Workspace suits browser-first teams","Teams vs Meet often decides it","Good setup and security matter most"],
   related=[("Microsoft 365 Support","/microsoft-365-support/"),("Business IT Support","/business-it-support-subscriptions/"),("Email Support","/email-support/")]),
 dict(slug="how-to-secure-your-microsoft-365-account", cat="Microsoft 365",
   title="How to Secure Your Microsoft 365 Account",
   lede="Microsoft 365 holds your email, files and contacts — so securing it properly is essential. Here are the key steps.",
   body="<p>A compromised Microsoft 365 account can expose everything, so a few security settings are well worth the effort.</p><h2>Turn on multi-factor authentication</h2><p>MFA is the single most effective step — it stops the vast majority of account takeovers even if your password is stolen. We can roll it out across your team painlessly.</p><h2>Tidy up access and rules</h2><p>Use strong unique passwords, review who has access to what, switch on built-in threat protection, and check no sneaky mail-forwarding rules have been added by an attacker.</p>",
   points=["Enable multi-factor authentication for everyone","Use strong, unique passwords","Review account access regularly","Check for unauthorised forwarding rules"],
   related=[("Microsoft 365 Support","/microsoft-365-support/"),("Cybersecurity","/cybersecurity-support/"),("How to protect your business email","/how-to-protect-your-business-email/")]),
 dict(slug="onedrive-sharepoint-teams-explained", cat="Microsoft 365",
   title="OneDrive, SharePoint and Teams Explained",
   lede="OneDrive, SharePoint and Teams overlap enough to be confusing. Here is a plain-English guide to what each is for.",
   body="<p>These three Microsoft 365 tools work together, but each has a clear job once you know the difference.</p><h2>OneDrive vs SharePoint</h2><p>OneDrive is your personal work drive — files only you need. SharePoint is shared team storage — documents the whole team or business works on. Saving shared files in SharePoint, not personal OneDrive, avoids losing access when someone leaves.</p><h2>Where Teams fits</h2><p>Teams is the front door for chat, calls and meetings — and it actually stores its shared files in SharePoint behind the scenes. Used well together, they keep your team organised and your files in the right place.</p>",
   points=["OneDrive = your personal work files","SharePoint = shared team and business files","Teams = chat, calls and meetings","Keep shared files in SharePoint, not personal OneDrive"],
   related=[("Microsoft 365 Support","/microsoft-365-support/"),("Business IT Support","/business-it-support-subscriptions/"),("Microsoft 365 Backup: do you need it?","/microsoft-365-backup-do-you-need-it/")]),
 dict(slug="microsoft-365-backup-do-you-need-it", cat="Microsoft 365",
   title="Microsoft 365 Backup: Do You Need It?",
   lede="Microsoft keeps your service running — but protecting your data is your responsibility. Here is why a Microsoft 365 backup matters.",
   body="<p>It is a common and risky misconception that data in Microsoft 365 is automatically backed up. Microsoft runs the platform; recovering your lost data is down to you.</p><h2>The gaps to know about</h2><p>Deleted emails and files are only kept for a limited time. After that, accidental deletion, a departing employee, or ransomware can mean permanent loss — and Microsoft's standard retention will not save you.</p><h2>The fix</h2><p>A dedicated Microsoft 365 backup keeps independent, recoverable copies of your email, OneDrive, SharePoint and Teams data, so you can restore exactly what you need, whenever you need it.</p>",
   points=["Microsoft does not back up your data for you","Standard retention is limited and time-bound","Protects against deletion, leavers and ransomware","Restore email, OneDrive, SharePoint and Teams"],
   related=[("Backup and Recovery","/backup-support/"),("Microsoft 365 Support","/microsoft-365-support/"),("Why backups are essential for small businesses","/why-backups-are-essential-for-small-businesses/")]),
 # ---------------- Windows ----------------
 dict(slug="should-you-upgrade-to-windows-11", cat="Windows",
   title="Should You Upgrade to Windows 11?",
   lede="Wondering whether to move to Windows 11? Here is a straightforward look at who should upgrade, who should wait, and how to do it safely.",
   body="<p>Windows 11 is the current, fully supported version of Windows — but whether to upgrade depends on your PC and your needs.</p><h2>Should you upgrade?</h2><p>If your computer is compatible, upgrading keeps you secure and supported. With Windows 10 support ending, staying current matters more than ever. If your PC is not compatible, it may be time to consider a replacement.</p><h2>Do it safely</h2><p>Always back up first, check compatibility, and set aside time for the upgrade. We can check your PC, handle the upgrade and make sure everything still works afterwards.</p>",
   points=["Windows 11 keeps you secure and supported","Check your PC is compatible first","Always back up before upgrading","Incompatible PCs may be due for replacement"],
   related=[("Windows 11 Support","/windows-11-support/"),("New Computer Setup","/new-computer-setup/"),("How to prepare your business for Windows 11","/how-to-prepare-business-for-windows-11/")]),
 dict(slug="how-to-prepare-business-for-windows-11", cat="Windows",
   title="How to Prepare Your Business for Windows 11",
   lede="Moving a whole team to Windows 11 needs a little planning. Here is how to do it smoothly, with no nasty surprises.",
   body="<p>A business upgrade is about more than clicking 'update' — a little preparation avoids downtime and frustration.</p><h2>Check and plan</h2><p>Start by checking which machines are compatible and which need replacing. Confirm your key business software works on Windows 11, and schedule upgrades outside busy periods.</p><h2>Back up and roll out</h2><p>Back up everything first, upgrade in stages rather than all at once, and have support on hand for the first few days. We can plan and manage the whole rollout for you.</p>",
   points=["Check device compatibility across the team","Confirm key software works on Windows 11","Back up before you start","Roll out in stages, not all at once"],
   related=[("Windows 11 Support","/windows-11-support/"),("Business IT Support","/business-it-support-subscriptions/"),("Backup and Recovery","/backup-support/")]),
 dict(slug="why-windows-updates-break-things", cat="Windows",
   title="Why Windows Updates Sometimes Break Things",
   lede="Updates are essential for security — but occasionally one causes trouble. Here is why it happens and how to stay safe without the headaches.",
   body="<p>Windows updates fix security holes and bugs, so skipping them is risky. Just occasionally, though, an update clashes with hardware or software.</p><h2>Why it happens</h2><p>With endless combinations of PCs, drivers and software, Microsoft cannot test every setup. Now and then an update conflicts with an old driver or app, causing glitches.</p><h2>How to stay safe</h2><p>Do not turn updates off — instead, keep backups, install updates promptly but not always on day one for critical machines, and get help quickly if one causes problems. Most issues are easily rolled back.</p>",
   points=["Updates are essential — do not disable them","Conflicts usually involve old drivers or apps","Keep backups so you can roll back","Problem updates can usually be reversed"],
   related=[("Windows 11 Support","/windows-11-support/"),("Computer Repairs","/computer-repairs/"),("Home IT Support","/home-it-support-subscriptions/")]),
 dict(slug="how-to-set-up-a-new-windows-computer", cat="Windows",
   title="How to Set Up a New Windows Computer Properly",
   lede="A new PC is a fresh start — if you set it up right. Here is how to get a new Windows computer ready the proper way.",
   body="<p>Spending a little time setting up a new computer properly saves a lot of frustration later.</p><h2>The essentials first</h2><p>Install updates, remove the pre-installed bloatware, set up a Microsoft account, and configure security and antivirus before you do anything else.</p><h2>Bring across your life</h2><p>Transfer your files, photos, email and bookmarks from the old machine, install the software you actually use, connect your printer and Wi-Fi, and set up a backup. Then securely wipe the old computer before selling or recycling it.</p>",
   points=["Update Windows and remove bloatware","Set up security and antivirus first","Transfer files, email and software","Set up backups and wipe the old PC"],
   related=[("New Computer Setup","/new-computer-setup/"),("Windows 11 Support","/windows-11-support/"),("Backup and Recovery","/backup-support/")]),
 dict(slug="what-to-do-before-replacing-old-computer", cat="Windows",
   title="What to Do Before Replacing Your Old Computer",
   lede="Before you retire an old computer, a few steps protect your data and your privacy. Here is your pre-replacement checklist.",
   body="<p>It is tempting to just unplug the old machine and move on — but a little care protects your files and your personal information.</p><h2>Rescue your data</h2><p>Back up everything, and make a note of the software and licences you will need again. Do not forget browser bookmarks, saved passwords and email — and check whether your photos are truly backed up.</p><h2>Wipe before you let go</h2><p>A simple delete or factory reset is not always enough. Securely wipe the drive so your personal and financial data cannot be recovered before you sell, donate or recycle the machine.</p>",
   points=["Back up all your files and photos first","Note the software and licences you will need","Securely wipe the drive — not just delete","Then sell, donate or recycle safely"],
   related=[("New Computer Setup","/new-computer-setup/"),("Backup and Recovery","/backup-support/"),("Computer Repairs","/computer-repairs/")]),
 # ---------------- New how-to guides ----------------
 dict(slug="how-to-speed-up-a-slow-computer", cat="Home Users",
   title="How to Speed Up a Slow Computer",
   lede="A slow computer is the most common reason people call us &mdash; and it is usually fixable without spending a penny. Here is a step-by-step walkthrough you can follow yourself.",
   body="<p>Before assuming you need a new machine, work through these steps in order &mdash; most slowdowns clear up by step three. For the full list of <em>why</em> computers slow down, see our companion guide on <a href=\"/why-is-my-computer-slow/\">why your computer is running slowly</a>.</p><h2>Quick wins you can do today</h2><p>Start with a proper restart (use Shut down, not Sleep), then trim what loads at start-up: press <em>Ctrl + Shift + Esc</em> to open Task Manager, choose the <strong>Start-up</strong> tab, and disable apps you do not need running the moment you switch on. Then free up disk space &mdash; a nearly-full drive is a classic cause (see <a href=\"/how-to-free-up-storage-space/\">how to free up storage space</a>).</p><h2>When it is not software</h2><p>If it is still sluggish after updates and a virus scan, the cause may be hardware &mdash; an old, tired drive or too little memory. An SSD upgrade in particular can make an older laptop feel new. The honest way to know is to have it checked; our <a href=\"/repair-or-replace-advisor/\">repair-or-replace advisor</a> gives you a steer, and our diagnosis is no-fix-no-fee.</p>",
   points=["Restart properly &mdash; use Shut down, not Sleep","Turn off start-up apps in Task Manager (Ctrl + Shift + Esc, Start-up tab)","Free up disk space on a full drive","Run a full antivirus scan","Pause or uninstall heavy background apps","Install pending Windows and app updates","Consider an SSD or memory upgrade if it is still slow"],
   related=[("Why is my computer slow?","/why-is-my-computer-slow/"),("How to free up storage space","/how-to-free-up-storage-space/"),("Repair or Replace Advisor","/repair-or-replace-advisor/"),("Computer Fault Checker","/computer-fault-checker/"),("Preventative Maintenance","/preventative-maintenance/")],
   faqs=[("Will resetting Windows speed it up?","It can help if the system is badly cluttered or misbehaving, but back up everything first and try the simpler steps above before a full reset. We can do it safely for you if needed."),("Is it worth upgrading or replacing?","Often a small upgrade (an SSD or more memory) transforms an older machine for far less than a new one. Our <a href=\"/repair-or-replace-advisor/\">repair-or-replace advisor</a> gives an honest steer."),("Why does my computer slow down again over time?","Clutter, updates and background apps build up. A regular service keeps it fast &mdash; that is exactly what our <a href=\"/preventative-maintenance/\">6-weekly maintenance</a> does.")]),
 dict(slug="how-to-free-up-storage-space", cat="Windows",
   title="How to Free Up Storage Space on a Full Computer",
   lede="A &lsquo;disk full&rsquo; warning &mdash; or that nagging OneDrive message &mdash; is one of the most common headaches we sort. Here is how to reclaim space safely, using only the tools already built into Windows.",
   body="<p>You do not need a third-party &lsquo;cleaner&rsquo; app (we would steer you away from those). Everything here uses Windows&rsquo; own tools. Work down the list and stop when you have enough room.</p><h2>See what is using the space</h2><p>Go to <em>Settings &gt; System &gt; Storage</em> to see exactly what is filling your drive. Then empty the Recycle Bin and your Downloads folder &mdash; both quietly hoard gigabytes. Turn on <strong>Storage Sense</strong> to clear temporary files automatically from now on, and run <strong>Disk Cleanup</strong> for a one-off sweep.</p><h2>What is safe to delete &mdash; and what to leave</h2><p>Temporary files, the Recycle Bin and old downloads are safe to clear. Leave anything in <em>Windows</em>, <em>Program Files</em> or folders you do not recognise well alone. The biggest space-savers are usually photos and videos &mdash; move them to OneDrive or an external drive (see <a href=\"/how-to-back-up-your-photos/\">how to back up your photos</a>), and uninstall apps you no longer use.</p>",
   points=["See what is using space in Settings &gt; System &gt; Storage","Empty the Recycle Bin and your Downloads folder","Turn on Storage Sense to clear temporary files automatically","Run Disk Cleanup for a one-off sweep","Uninstall apps you no longer use","Move photos and videos to OneDrive or an external drive","Clear your web browser cache"],
   related=[("How to speed up a slow computer","/how-to-speed-up-a-slow-computer/"),("How to back up your photos","/how-to-back-up-your-photos/"),("Backup &amp; Recovery","/backup-support/"),("OneDrive, SharePoint &amp; Teams explained","/onedrive-sharepoint-teams-explained/")],
   faqs=[("Is it safe to delete temporary files?","Yes &mdash; temporary files, the Recycle Bin and old downloads are safe to clear. Stick to Windows&rsquo; own Storage and Disk Cleanup tools and leave system folders alone."),("What is OneDrive asking me to do?","OneDrive can move files to the cloud to save space on your PC. It is usually helpful, but it is worth understanding &mdash; see <a href=\"/onedrive-sharepoint-teams-explained/\">OneDrive explained</a>."),("My disk is still full after a cleanup &mdash; what now?","Large photo, video or backup files are often the culprit. Move them to OneDrive or an external drive, or get in touch and we will take a look.")]),
 dict(slug="how-to-back-up-your-photos", cat="Home Users",
   title="How to Back Up Your Photos",
   lede="Your photos are irreplaceable &mdash; and the most common thing people lose when a phone or computer dies. Here is a simple, step-by-step way to keep them safe, for good.",
   body="<p>The golden rule is the 3-2-1 approach, in plain English: keep more than one copy, in more than one place, with at least one away from home. Sounds technical &mdash; but it is just a few taps to set up.</p><h2>Set it and forget it</h2><p>Turn on automatic backup on your phone &mdash; Google Photos or OneDrive on Android &mdash; so new photos are copied to the cloud the moment you take them. On your computer, save your photos into OneDrive (or copy them across), so they are protected too. iPhone owners can do the same with Apple&rsquo;s iCloud; the principle is identical.</p><h2>Keep a second copy &mdash; and check it</h2><p>Cloud is brilliant, but keep one more copy on an external drive as a belt-and-braces backup. Then &mdash; and this is the bit people skip &mdash; actually open the backup and check your photos are really there. A backup you have never checked is not a backup. Worried about how safe yours are? Try our <a href=\"/what-would-you-lose/\">what would you lose?</a> check.</p>",
   points=["Decide where to keep copies (the 3-2-1 rule, simply)","Turn on automatic phone backup with Google Photos or OneDrive","Save or copy your computer photos into OneDrive","Keep a second copy on an external drive","Open the backup and check the photos are really there","Free up phone space safely once photos are backed up","Set a reminder to check your backups every few months"],
   related=[("Backup &amp; Recovery","/backup-support/"),("What Would You Lose?","/what-would-you-lose/"),("How to free up storage space","/how-to-free-up-storage-space/"),("Why backups are essential","/why-backups-are-essential-for-small-businesses/")],
   faqs=[("Where are my photos safest?","Safest is more than one copy in more than one place &mdash; for example automatic cloud backup plus a copy on an external drive. That way no single failure can wipe them out."),("Do I need to pay for cloud storage?","There is usually free storage to start, and modest paid tiers if you have a lot of photos. We can help you pick the right option without overpaying."),("How do I get photos off my phone onto my computer?","The easiest way is to let cloud backup sync them, then open them on your PC. We are happy to set this up with you if it feels fiddly.")]),
 dict(slug="how-to-use-a-password-manager", cat="Home Users",
   title="How to Use a Password Manager",
   lede="If you reuse passwords or keep them in a notebook, a password manager is the single biggest upgrade you can make to your online safety. Here is how to start, simply.",
   body="<p>A password manager remembers strong, unique passwords for every account so you do not have to &mdash; you just remember one master password. It fills them in for you, and warns you if one has been caught in a leak.</p><h2>Getting started</h2><p>You can use the one built into your web browser, or a dedicated app &mdash; both are far better than reusing passwords. Set one <strong>strong master password</strong> (three random words work beautifully &mdash; test one with our <a href=\"/password-strength-checker/\">password checker</a>), then import the passwords your browser has already saved. From then on, let it generate a unique password for every new account.</p><h2>Lock it down</h2><p>Because your manager holds the keys to everything, protect it with <a href=\"/how-to-set-up-two-factor-authentication/\">two-factor authentication</a>. Practise on one account first so you get comfortable, then roll it out. If it all feels daunting, we will happily set it up with you.</p>",
   points=["Understand why a manager beats memorising or reusing passwords","Choose one &mdash; your browser&rsquo;s built-in tool or a dedicated app","Set one strong master password you can remember","Import the passwords already saved in your browser","Let it generate a unique password for every new account","Turn on two-factor authentication for the manager itself","Practise on one account first, then roll it out"],
   related=[("Password Strength Checker","/password-strength-checker/"),("How to set up 2FA","/how-to-set-up-two-factor-authentication/"),("Cybersecurity Checklist","/cybersecurity-checklist/"),("Online Safety","/online-safety/")],
   faqs=[("Is it safe to keep all my passwords in one place?","Yes &mdash; reputable password managers encrypt everything, and it is far safer than reusing a handful of passwords or writing them down. Protect it with a strong master password and two-factor authentication."),("What if I forget the master password?","Set up the recovery options the manager offers when you start, and keep any recovery code somewhere safe. Choosing three memorable random words helps you never forget it."),("Are the free password managers good enough?","For most people, yes &mdash; including the ones built into browsers. Paid options add extras like syncing across more devices. We can help you choose what fits.")]),
 dict(slug="how-to-stop-spam-emails", cat="Home Users",
   title="How to Stop Spam and Junk Emails",
   lede="Drowning in junk email? You will never stop it completely, but you can cut it dramatically &mdash; and learn to tell harmless spam from a dangerous scam. Here is how.",
   body="<p>There are two kinds of unwanted email: <strong>spam</strong> (annoying but harmless marketing) and <strong>scams</strong> (phishing that wants your money or passwords). The steps below tackle the junk &mdash; while keeping you safe from the dangerous stuff.</p><h2>Train your inbox</h2><p>Whenever junk arrives, mark it as <em>Junk</em> or <em>Spam</em> rather than just deleting it &mdash; that teaches the filter. Block senders who keep coming back, and set up a rule or filter to sort newsletters automatically. Over a few weeks your inbox gets noticeably quieter.</p><h2>Unsubscribe &mdash; but carefully</h2><p>It is fine to use the <em>unsubscribe</em> link on genuine senders you recognise. But never click unsubscribe (or any link) on an obvious scam &mdash; it just tells them your address is live. If something looks like a scam rather than marketing, see our guide to <a href=\"/phishing/\">phishing</a> and try the <a href=\"/spot-the-scam/\">Spot the Scam</a> quiz.</p>",
   points=["Mark unwanted emails as Junk or Spam to train the filter","Block senders who keep coming back","Unsubscribe only from senders you genuinely recognise","Create a rule or filter to auto-sort newsletters","Never reply to, or click links in, obvious spam","Use a separate email address for sign-ups and shopping","Check your spam folder occasionally for genuine emails"],
   related=[("Email Support","/email-support/"),("Phishing explained","/phishing/"),("Spot the Scam","/spot-the-scam/"),("How to stay safe from online scams","/how-to-stay-safe-from-online-scams/")],
   faqs=[("Is it safe to click &lsquo;unsubscribe&rsquo;?","On genuine marketing from a sender you recognise, yes. On an obvious scam or spam from a stranger, no &mdash; it confirms your address is active and can invite more. When in doubt, just mark it as junk."),("Why am I suddenly getting more spam?","Often your address has been shared, sold or caught in a data breach, or you replied or clicked once. It usually settles as you train the filter and block senders."),("What is the difference between spam and phishing?","Spam is annoying marketing; phishing is a scam designed to steal money or passwords. Our <a href=\"/phishing/\">phishing guide</a> shows how to tell them apart.")]),
 dict(slug="how-to-keep-children-safe-online", cat="Home Users",
   title="How to Keep Children Safe Online",
   lede="Setting up a device for a child or grandchild? A few free, built-in tools let you give them freedom to explore safely. Here is a calm, step-by-step guide to parental controls.",
   body="<p>Controls are helpful, but they are not a substitute for conversation &mdash; the most important step is talking together about staying safe online. Then these free tools do the rest.</p><h2>Set up the built-in controls</h2><p>On a Windows PC or Xbox, use <strong>Microsoft Family Safety</strong>. On an Android phone or tablet, use <strong>Google Family Link</strong>. Both let you set screen-time limits, approve app downloads and see activity. Turn on <strong>SafeSearch</strong> and <strong>YouTube Restricted Mode</strong> too, and switch on any parental filtering your broadband router offers. (On an iPhone or iPad, Apple&rsquo;s own Screen Time does the same &mdash; we will happily point you to Apple&rsquo;s guide.)</p><h2>Keep it age-appropriate</h2><p>Review the settings as your child grows &mdash; what suits a seven-year-old will frustrate a fourteen-year-old. For trusted, balanced advice, <a href=\"https://www.internetmatters.org/\" target=\"_blank\" rel=\"noopener\">Internet Matters</a>, the <a href=\"https://saferinternet.org.uk/\" target=\"_blank\" rel=\"noopener\">UK Safer Internet Centre</a> and <a href=\"https://www.nspcc.org.uk/keeping-children-safe/online-safety/\" target=\"_blank\" rel=\"noopener\">the NSPCC</a> are excellent. We can set all this up as part of <a href=\"/family-it-support/\">family IT support</a>.</p>",
   points=["Have the conversation first &mdash; controls are not a substitute","Set up Microsoft Family Safety on a Windows PC or Xbox","Set up Google Family Link on an Android phone or tablet","Turn on SafeSearch and YouTube Restricted Mode","Set screen-time limits and app approvals","Switch on parental filtering at the router or broadband level","Review the settings as your child grows"],
   related=[("Family IT Support","/family-it-support/"),("Online Safety","/online-safety/"),("Using AI Safely","/using-ai-safely/"),("Cybersecurity","/cybersecurity-support/")],
   faqs=[("At what age should I start using parental controls?","As soon as a child uses a device unsupervised. Start stricter and relax the settings as they get older and you build trust through conversation."),("Will my child be able to switch the controls off?","Properly set up with a parent account and a PIN, they cannot simply turn them off &mdash; though tech-savvy teens may find workarounds, which is why talking matters most."),("Do parental controls slow the device down?","No &mdash; the built-in tools from Microsoft and Google are designed to run quietly in the background with no real effect on speed.")]),
 dict(slug="how-to-transfer-files-to-a-new-computer", cat="Windows",
   title="How to Transfer Files to a New Computer",
   lede="Got a new computer? The first worry is always &lsquo;how do I get everything across?&rsquo; Here is a calm, step-by-step guide to moving your files from the old PC to the new one.",
   body="<p>Good news: your documents, photos and favourites are easy to move. The one thing that does not copy across is your <em>programs</em> &mdash; those need reinstalling &mdash; but your files come with you.</p><h2>The easiest way: the cloud</h2><p>If you use OneDrive, simply sign in on both computers and your files appear on the new one automatically. No cables, no fuss. Move your browser bookmarks and saved passwords too (a <a href=\"/how-to-use-a-password-manager/\">password manager</a> makes this effortless across devices).</p><h2>No cloud? Use a drive</h2><p>Copy your documents, photos and other files onto an external drive or USB stick, then copy them onto the new PC. Reinstall your programs from their apps or websites, set up your <a href=\"/email-support/\">email</a>, and &mdash; crucially &mdash; check everything has arrived safely <strong>before</strong> you <a href=\"/how-to-wipe-and-recycle-old-computer/\">wipe and recycle the old computer</a>. Prefer to hand it over? We move everything across as part of <a href=\"/new-computer-setup/\">new computer setup</a>.</p>",
   points=["Decide what to move (documents, photos, favourites, email)","Easiest way: sign in to OneDrive on both computers","No cloud? Copy everything to an external drive or USB stick","Move your browser bookmarks and saved passwords","Reinstall your programs &mdash; apps do not copy across, only files do","Set up your email on the new computer","Check everything arrived before wiping the old PC"],
   related=[("New Computer Setup","/new-computer-setup/"),("How to set up a new Windows computer","/how-to-set-up-a-new-windows-computer/"),("How to wipe &amp; recycle an old computer","/how-to-wipe-and-recycle-old-computer/"),("How to use a password manager","/how-to-use-a-password-manager/")],
   faqs=[("Will my programs transfer too?","No &mdash; programs need reinstalling on the new computer (your files do come across). It is a good chance for a clean start with only the apps you actually use."),("How do I move my emails?","If you use Microsoft 365 or webmail, your email simply appears when you sign in on the new PC. For older setups we can move it across for you &mdash; see <a href=\"/email-support/\">email support</a>."),("What about my saved passwords?","Use a <a href=\"/how-to-use-a-password-manager/\">password manager</a> so they sync automatically, or export and import your browser passwords. We can help you do this safely.")]),
 dict(slug="how-to-recover-deleted-files", cat="Home Users",
   title="How to Recover Deleted Files",
   lede="Deleted something important by accident? Don&rsquo;t panic &mdash; there are several places to look, and acting quickly gives you the best chance of getting it back. Here is what to do.",
   body="<p>The most important thing first: <strong>stop saving new files to that drive</strong>. When you delete a file, the space it used is not wiped straight away &mdash; but new data can overwrite it, so the sooner you act, the better.</p><h2>Where to look first</h2><p>Start with the obvious: open the <strong>Recycle Bin</strong>, find your file, right-click and choose <em>Restore</em>. If you use OneDrive or another cloud service, check its online <strong>recycle bin</strong> too &mdash; deleted files often sit there for weeks. If File History or Previous Versions was switched on, you can right-click the folder and restore an earlier version.</p><h2>If it is really gone</h2><p>If it is not in any bin, your backup is the hero of the day &mdash; restore it from there (this is exactly why <a href=\"/backup-support/\">backups</a> matter). For genuinely lost files with no backup, recovery is sometimes still possible if you act fast and stop using the device &mdash; get in touch and we will take a careful look. We would gently steer you away from random &lsquo;recovery&rsquo; downloads, which can do more harm than good.</p>",
   points=["Stop saving new files to the drive straight away","Open the Recycle Bin and restore from there","Check your OneDrive or cloud recycle bin too","Try File History or Previous Versions if it was turned on","Restore from your backup if you have one","Act fast, and contact us for tricky cases"],
   related=[("Backup &amp; Recovery","/backup-support/"),("What Would You Lose?","/what-would-you-lose/"),("How to back up your photos","/how-to-back-up-your-photos/"),("Computer Repairs","/computer-repairs/")],
   faqs=[("Can deleted files always be recovered?","Sadly not always &mdash; but the chances are far better if you act quickly and stop using the device. A backup is the only way to be certain you can always get files back."),("Is free file-recovery software safe?","Be careful &mdash; some are genuine, but many are low quality or bundle unwanted extras. If a file really matters, it is safer to ask us than to risk making things worse."),("How do I avoid losing files again?","Set up an automatic, verified backup. Then a deletion or failure is just a quick restore &mdash; see <a href=\"/backup-support/\">backup &amp; recovery</a>.")]),
 dict(slug="how-to-set-up-a-printer", cat="Home Users",
   title="How to Set Up a Printer",
   lede="New printer? Setting it up is usually quicker than you expect. Here is a simple, step-by-step guide to getting it printing from your Windows computer.",
   body="<p>Most modern printers connect over Wi-Fi, so there are no cables to worry about beyond the power lead. Have your Wi-Fi password handy and you are most of the way there.</p><h2>Get it ready, then connect</h2><p>Unbox it, load some paper and fit the ink or toner, then switch it on. Using the printer&rsquo;s own screen or its app, connect it to your home Wi-Fi. Then on your PC go to <em>Settings &gt; Bluetooth &amp; devices &gt; Printers &amp; scanners</em>, click <strong>Add device</strong>, and pick your printer from the list.</p><h2>Finish up and test</h2><p>If Windows asks to install the maker&rsquo;s app or driver, let it &mdash; it unlocks scanning and ink-level features. Print a test page to check it works, and set it as your default printer if it is the one you use most. If it will not connect or keeps dropping off, our guide on <a href=\"/why-does-my-printer-keep-disconnecting/\">why printers keep disconnecting</a> helps &mdash; or we will happily sort it for you.</p>",
   points=["Load paper and fit the ink or toner","Switch it on and connect it to your Wi-Fi","On your PC, open Settings then Printers &amp; scanners","Click Add device and choose your printer","Install the maker app or driver if prompted","Print a test page to check it works","Set it as your default printer if you like"],
   related=[("Printer Support","/printer-support/"),("Why does my printer keep disconnecting?","/why-does-my-printer-keep-disconnecting/"),("Wi-Fi Support","/wifi-support/"),("New Computer Setup","/new-computer-setup/")],
   faqs=[("My printer will not connect to Wi-Fi &mdash; what now?","Check it is on the same Wi-Fi network as your computer (not a guest network), restart both, and try again. Our <a href=\"/printer-support/\">printer support</a> can sort stubborn ones."),("Do I need the manufacturer&rsquo;s software?","Not always to print, but it is worth installing &mdash; it adds scanning, ink-level alerts and easier setup."),("Why does my printer keep going offline?","Usually a Wi-Fi or driver hiccup. Our guide on <a href=\"/why-does-my-printer-keep-disconnecting/\">printers that keep disconnecting</a> explains the common fixes.")]),
 dict(slug="how-to-spot-a-fake-website", cat="Home Users",
   title="How to Spot a Fake Website",
   lede="Fake shopping and &lsquo;login&rsquo; websites are everywhere, and some are very convincing. Here is how to tell a genuine site from a scam before you hand over any details.",
   body="<p>Scam websites are designed to look real and rush you into typing card details or passwords. A few quick checks protect you &mdash; and the biggest one surprises people.</p><h2>The padlock myth</h2><p>That little padlock in the address bar only means the connection is encrypted &mdash; <strong>it does not mean the site is genuine</strong>. Scammers use padlocks too. Instead, read the web address itself carefully: look for slight misspellings, odd extra words, or the wrong ending (for example a well-known shop&rsquo;s name with a strange address after it).</p><h2>The other warning signs</h2><p>Be wary of deals that seem too good to be true, pressure to &lsquo;buy now&rsquo;, poor spelling, no proper contact details, and requests to pay by bank transfer rather than card. When in doubt, do not click the link in a message &mdash; type the address yourself, or search for the company and read independent reviews first. Our <a href=\"/spot-the-scam/\">Spot the Scam</a> quiz is great practice.</p>",
   points=["Read the web address carefully for odd spellings or endings","Remember a padlock does not mean a site is genuine","Be wary of deals that seem too good to be true","Watch for poor spelling, pressure and missing contact details","Type addresses yourself rather than clicking links in messages","Pay by card for protection, never by bank transfer to a stranger","If unsure, search for the company and reviews separately"],
   related=[("Spot the Scam","/spot-the-scam/"),("Phishing explained","/phishing/"),("Online scams","/online-scams/"),("Cybersecurity","/cybersecurity-support/")],
   faqs=[("Does the padlock mean a website is safe?","No &mdash; it only means the connection is encrypted. Scam sites can have a padlock too. Judge the site by its address, its reputation and the warning signs, not the padlock."),("How do I check if a shopping site is genuine?","Search for the company name with the word &lsquo;reviews&rsquo;, check for real contact details, and pay by card. If a deal looks too good to be true, it usually is."),("I think I entered details on a fake site &mdash; what now?","Act quickly &mdash; follow our guide on <a href=\"/ive-been-scammed-what-to-do/\">what to do if you&rsquo;ve been scammed</a>, including contacting your bank on 159.")]),
 dict(slug="how-to-update-windows-safely", cat="Windows",
   title="How to Update Windows Safely",
   lede="Windows updates keep you secure and fix bugs &mdash; but nobody wants one restarting mid-task. Here is how to install updates safely, on your terms, with no nasty surprises.",
   body="<p>Updates matter: many close security holes that scammers and viruses rely on. The trick is doing them calmly, at a time that suits you, with a safety net in place.</p><h2>Installing updates the easy way</h2><p>Save your work and close your apps first. Then go to <em>Settings &gt; Windows Update</em> and click <strong>Check for updates</strong>. Let them download and install, and set your <strong>active hours</strong> so Windows never restarts while you are in the middle of something. When it asks to restart to finish, do it when you are ready.</p><h2>Stay safe around big updates</h2><p>Before a large feature update, make sure you have a <a href=\"/backup-support/\">backup</a> &mdash; just in case. Keep your apps updated too, not just Windows. If an update ever causes a problem, don&rsquo;t worry: our guide on <a href=\"/why-windows-updates-break-things/\">why updates sometimes break things</a> explains why, and we can put it right. On a <a href=\"/preventative-maintenance/\">monthly plan</a> we handle all of this for you.</p>",
   points=["Save your work and close apps first","Go to Settings then Windows Update","Click Check for updates and let them install","Set active hours so it does not restart mid-task","Restart when prompted to finish installing","Keep your apps updated too, not just Windows","Make sure you have a backup before big updates"],
   related=[("Why Windows updates break things","/why-windows-updates-break-things/"),("Windows 11 Support","/windows-11-support/"),("Backup &amp; Recovery","/backup-support/"),("Preventative Maintenance","/preventative-maintenance/")],
   faqs=[("Why do Windows updates take so long?","Big updates download and install a lot in the background. Leave plenty of time, keep the PC plugged in, and use active hours so it restarts when convenient."),("Can I stop updates restarting my PC?","You can&rsquo;t skip security updates (and shouldn&rsquo;t), but setting active hours stops Windows restarting while you are using it."),("An update caused a problem &mdash; what do I do?","Most update issues are quickly fixed. See <a href=\"/why-windows-updates-break-things/\">why updates break things</a>, or get in touch and we&rsquo;ll sort it.")]),
 dict(slug="how-to-use-microsoft-teams", cat="Microsoft 365",
   title="How to Use Microsoft Teams (Beginner&rsquo;s Guide)",
   lede="Microsoft Teams is where a lot of work chats, calls and meetings now happen &mdash; and it&rsquo;s friendlier than it first looks. Here is a plain-English guide to finding your way around.",
   body="<p>Teams brings your chats, calls, meetings and shared files into one place. You don&rsquo;t need to learn all of it &mdash; just a few basics get you going.</p><h2>Chatting and calling</h2><p>Open Teams and sign in with your Microsoft account. Down the left you&rsquo;ll find <strong>Chat</strong> (one-to-one and group messages) and <strong>Teams</strong> (shared spaces for a group or project). To message someone, click Chat, find their name and type. To call, open the chat and click the camera or phone icon at the top.</p><h2>Joining meetings</h2><p>Most meetings arrive as a calendar invite or an emailed link &mdash; just click <strong>Join</strong> at the right time. During a call you can mute yourself with the microphone button, turn your camera on or off, and <strong>share your screen</strong> so others can see what you see. That&rsquo;s genuinely most of what people use day to day. We set up and support Teams as part of <a href=\"/microsoft-365-support/\">Microsoft 365</a>.</p>",
   points=["Open Teams and sign in with your Microsoft account","Find a person or group in Chat on the left","Type a message to start a chat","Click the camera or phone icon to call","Join a meeting from your calendar or an emailed link","Use the microphone button to mute and unmute","Click Share to show your screen during a call"],
   related=[("Microsoft 365 Support","/microsoft-365-support/"),("OneDrive, SharePoint &amp; Teams explained","/onedrive-sharepoint-teams-explained/"),("Confident Video Calling","/confident-video-calling/"),("Business IT Support","/business-it-support-subscriptions/")],
   faqs=[("Is Microsoft Teams free?","There&rsquo;s a free version for personal use, and a fuller version included with most Microsoft 365 business plans. We&rsquo;ll help you pick what fits."),("Do I need Teams installed, or can I use a browser?","Both work &mdash; the installed app is smoother for regular use, but you can join a meeting straight from a web browser if you prefer."),("How do I join a meeting someone sent me?","Click the Join link in the invite or email at the meeting time, choose your camera and microphone settings, then join. It really is that simple.")]),
 dict(slug="how-to-set-up-email-on-your-phone", cat="Home Users",
   title="How to Set Up Email on Your Phone",
   lede="Getting your email on your phone means you&rsquo;re never caught out away from the computer. Here is a simple, step-by-step guide that works for most phones and email accounts.",
   body="<p>Every phone is slightly different, but they all follow the same friendly pattern &mdash; and you usually only need your email address and password.</p><h2>Adding your account</h2><p>Open the <strong>Mail</strong> app (or the <strong>Outlook</strong> app, which we often recommend) and choose <strong>Add account</strong>. Pick your email type &mdash; Outlook/Microsoft, Gmail, or &lsquo;Other&rsquo; &mdash; then enter your email address and password. If your account uses <a href=\"/how-to-set-up-two-factor-authentication/\">two-factor authentication</a> (and it should), approve the prompt on your other device.</p><h2>Finishing up</h2><p>Give it a moment to download your messages, then add a signature if you like. If it won&rsquo;t connect, the password or account type is the usual culprit &mdash; or we&rsquo;ll happily set it up for you as part of <a href=\"/email-support/\">email support</a>.</p>",
   points=["Open the Mail or Outlook app on your phone","Choose Add account","Pick your email type (Outlook, Gmail or Other)","Enter your email address and password","Approve any two-factor security prompt","Wait for your messages to download","Add a signature if you like"],
   related=[("Email Support","/email-support/"),("Microsoft 365 Support","/microsoft-365-support/"),("How to set up 2FA","/how-to-set-up-two-factor-authentication/"),("Mobile &amp; Tablet Support","/mobile-tablet-support/")],
   faqs=[("Why won&rsquo;t my email work on my phone?","Usually a mistyped password, the wrong account type, or a two-factor step that needs approving. Double-check those first &mdash; or we&rsquo;ll sort it for you."),("Should I use the Outlook app or the built-in Mail app?","Either works. We often suggest the Outlook app for Microsoft 365 accounts as it handles calendar and security nicely, but the built-in app is fine too."),("Is it safe to have work email on my personal phone?","Yes, with sensible security &mdash; a screen lock and two-factor authentication. For business accounts we can apply policies that keep work data protected.")]),
 dict(slug="how-to-scan-a-document", cat="Home Users",
   title="How to Scan a Document",
   lede="Need to scan and send a form, letter or receipt? You can do it with a printer-scanner or simply with your phone. Here is how, step by step.",
   body="<p>There are two easy ways to scan &mdash; pick whichever you have to hand.</p><h2>Scanning with a printer or scanner</h2><p>Place the document face-down on the glass, then use the printer&rsquo;s app or the built-in <strong>Windows Scan</strong> app to capture it. Save it as a <strong>PDF</strong> somewhere you&rsquo;ll find it again, like your Documents folder.</p><h2>Scanning with your phone</h2><p>No scanner? Your phone is one. On many phones the <strong>Notes</strong> app (or a free scanner app) has a &lsquo;scan document&rsquo; option &mdash; hold the phone steady over the document in good light, let it capture, then crop and save as a PDF. From there you can email or upload it. If you&rsquo;d like a hand, just ask &mdash; see <a href=\"/printer-support/\">printer support</a>.</p>",
   points=["To scan with a printer, place the document face-down on the glass","Use the printer app or the Windows Scan app to capture it","Save it as a PDF where you can find it again","To scan with a phone, use Notes or a free scanner app","Hold the phone steady over the document in good light","Crop and save it as a PDF","Email or upload the file as needed"],
   related=[("Printer Support","/printer-support/"),("How to set up a printer","/how-to-set-up-a-printer/"),("Email Support","/email-support/"),("Microsoft 365 Support","/microsoft-365-support/")],
   faqs=[("Can I scan without a scanner?","Yes &mdash; your phone works brilliantly as a scanner using the Notes app or a free scanner app, saving straight to PDF."),("How do I save a scan as a PDF?","Most scanner apps and the Windows Scan app let you choose PDF as the file type when you save. PDF is best for forms and letters."),("How do I email a scanned document?","Save the scan, start a new email, and attach the PDF using the paperclip or &lsquo;attach&rsquo; button. We&rsquo;re happy to walk you through it.")]),
 dict(slug="how-to-make-your-laptop-battery-last-longer", cat="Windows",
   title="How to Make Your Laptop Battery Last Longer",
   lede="If your laptop doesn&rsquo;t last as long as it used to, a few simple changes can stretch each charge &mdash; and help the battery last for years. Here is how.",
   body="<p>Some quick habits make a real difference to how long each charge lasts, and how long the battery stays healthy overall.</p><h2>Get more from each charge</h2><p>The screen is the biggest drain, so <strong>turn down the brightness</strong>. Switch on <strong>Battery saver</strong> when you&rsquo;re unplugged (Settings &gt; System &gt; Power &amp; battery), close apps and browser tabs you&rsquo;re not using, and unplug accessories you don&rsquo;t need. You can see which apps use the most power in the same settings.</p><h2>Keep the battery healthy</h2><p>Avoid letting the laptop get very hot, and don&rsquo;t worry about leaving it plugged in occasionally &mdash; modern batteries cope fine. If it no longer holds a useful charge, the battery itself may be worn out, and we can usually <a href=\"/computer-repairs/\">replace it</a>. Not sure if it&rsquo;s worth it? Try our <a href=\"/repair-or-replace-advisor/\">repair-or-replace advisor</a>.</p>",
   points=["Turn down the screen brightness","Switch on Battery saver when unplugged","Close apps and browser tabs you are not using","Unplug accessories you do not need","Check which apps drain the most in Settings","Avoid letting the laptop get very hot","Replace a worn-out battery if it no longer holds charge"],
   related=[("Computer Repairs","/computer-repairs/"),("Repair or Replace Advisor","/repair-or-replace-advisor/"),("Why is my computer slow?","/why-is-my-computer-slow/"),("Dell Laptops &amp; Desktops","/dell-hardware/")],
   faqs=[("Should I leave my laptop plugged in all the time?","It&rsquo;s fine occasionally &mdash; modern laptops manage charging sensibly. For battery health, it&rsquo;s good to let it discharge and recharge sometimes rather than sitting at 100% forever."),("Why does my battery drain so fast?","Often high brightness, lots of background apps, or an ageing battery. The steps above help &mdash; and if it&rsquo;s worn out, a replacement restores it."),("Can a worn-out laptop battery be replaced?","Usually, yes &mdash; on many laptops we can fit a new battery. See <a href=\"/computer-repairs/\">computer repairs</a> for a no-fix-no-fee check.")]),
 dict(slug="how-to-take-a-screenshot", cat="Windows",
   title="How to Take a Screenshot on Windows",
   lede="A screenshot &mdash; a picture of what&rsquo;s on your screen &mdash; is the quickest way to show someone an error or a problem. Here is how to take one on a Windows computer.",
   body="<p>Screenshots are brilliant for showing us exactly what you&rsquo;re seeing. There are two easy ways.</p><h2>Snip just part of the screen</h2><p>Press <strong>Windows key + Shift + S</strong> together. The screen dims and you drag to select the area you want. The picture is copied, ready to <strong>paste with Ctrl + V</strong> into an email or message. This is the handiest method day to day.</p><h2>Capture the whole screen</h2><p>Press <strong>Print Screen</strong> (often labelled PrtScn) to copy everything. To save rather than just copy, open the <strong>Snipping Tool</strong> app, where you can capture, annotate and save your screenshot as an image file. Sending us a screenshot of an error helps us help you faster &mdash; see our <a href=\"/pre-call-checklists/\">get-ready checklists</a>.</p>",
   points=["Press Windows key plus Shift plus S to snip part of the screen","Drag to select the area you want","Paste it with Ctrl plus V into an email or message","Press Print Screen to copy the whole screen","Open Snipping Tool to capture, annotate and save","Save it as an image where you can find it","Attach or paste it to send it to us"],
   related=[("Get-Ready Checklists","/pre-call-checklists/"),("Start Remote Support","/remote-support/"),("Tech in Plain English","/plain-english/"),("Computer Fault Checker","/computer-fault-checker/")],
   faqs=[("Where do my screenshots get saved?","With Windows + Shift + S the image is copied ready to paste. Print Screen copies it too. The Snipping Tool lets you save it as a file wherever you choose."),("How do I screenshot just one window?","Click the window first, then press Alt + Print Screen to capture only that window, ready to paste."),("How do I send a screenshot to you?","Paste it straight into an email (Ctrl + V) or save it and attach it. It&rsquo;s the fastest way for us to see what&rsquo;s happening.")]),
 dict(slug="how-to-block-nuisance-calls-and-texts", cat="Home Users",
   title="How to Block Nuisance Calls and Texts",
   lede="Plagued by nuisance calls and spam texts? You can cut them right down and report the worst offenders. Here is how to take back your peace and quiet.",
   body="<p>There&rsquo;s a difference between annoying marketing and dangerous scams &mdash; these steps reduce both. (To learn to recognise scam messages, see our <a href=\"/spot-the-scam/\">Spot the Scam</a> quiz.)</p><h2>Block and silence</h2><p>On most phones you can <strong>block a number</strong> straight from the call log or a message. Many phones also offer <strong>Silence Unknown Callers</strong>, which sends unrecognised numbers to voicemail. To cut marketing calls, register free with the <strong>Telephone Preference Service</strong> at <a href=\"https://www.tpsonline.org.uk/\" target=\"_blank\" rel=\"noopener\">tpsonline.org.uk</a>.</p><h2>Report the bad ones</h2><p>Forward scam texts to <strong>7726</strong> (free) to report them to your network. Never press buttons or call back on a recorded scam message &mdash; just hang up. Your phone provider may also offer free call-blocking features or an app. If a scam has gone further, see <a href=\"/ive-been-scammed-what-to-do/\">what to do if you&rsquo;ve been scammed</a>.</p>",
   points=["Block a number from your call log or message screen","Turn on Silence Unknown Callers if your phone offers it","Register free with the Telephone Preference Service","Forward scam texts to 7726 to report them","Do not press buttons or call back on recorded scam calls","Use your provider&rsquo;s call-blocking features or app","Hang up on anything that feels like a scam"],
   related=[("Smishing &amp; Vishing","/smishing-and-vishing/"),("Spot the Scam","/spot-the-scam/"),("If you&rsquo;ve been scammed","/ive-been-scammed-what-to-do/"),("Online Safety","/online-safety/")],
   faqs=[("How do I stop marketing calls?","Register free with the Telephone Preference Service (tpsonline.org.uk). It won&rsquo;t stop scammers, who ignore the rules, but it cuts legitimate marketing calls."),("Should I answer numbers I don&rsquo;t recognise?","If in doubt, let it go to voicemail &mdash; a genuine caller will leave a message. Turning on Silence Unknown Callers does this automatically."),("A recorded message says &lsquo;press 1&rsquo; &mdash; what should I do?","Don&rsquo;t press anything &mdash; just hang up. Pressing buttons confirms your number is active and often leads to a scammer. See <a href=\"/smishing-and-vishing/\">scam calls</a>.")]),
 dict(slug="how-to-set-up-a-second-monitor", cat="Windows",
   title="How to Set Up a Second Monitor",
   lede="A second screen is one of the cheapest ways to make working at a computer easier and more comfortable. Here is how to set one up on Windows, step by step.",
   body="<p>Adding a second monitor is usually plug-and-play &mdash; Windows does most of the work.</p><h2>Plug it in</h2><p>Connect the monitor to a spare port on your computer &mdash; usually <strong>HDMI</strong> or <strong>USB-C</strong> &mdash; turn it on, and select the matching input on the monitor if needed. Windows normally detects it within a few seconds.</p><h2>Arrange your screens</h2><p>Go to <em>Settings &gt; System &gt; Display</em>. Choose <strong>Extend these displays</strong> to use both screens as one big workspace, then <strong>drag the screen boxes</strong> so they match how the monitors actually sit on your desk. Pick which one is your main screen, and you&rsquo;re done. If it&rsquo;s not detected, it&rsquo;s usually the cable or input &mdash; we can help, or sort the right kit via <a href=\"/new-computer-setup/\">new computer setup</a>.</p>",
   points=["Plug the monitor into your HDMI or USB-C port","Turn the monitor on and select the right input","Let Windows detect it automatically","Go to Settings, then System, then Display","Choose Extend these displays to use both screens","Drag the screen boxes to match your desk layout","Pick which screen is your main one"],
   related=[("New Computer Setup","/new-computer-setup/"),("Content Creator PCs","/content-creator-pcs/"),("Custom-Built PCs","/custom-pc-builds/"),("Computer Repairs","/computer-repairs/")],
   faqs=[("My second monitor is not detected &mdash; what now?","Check the cable is firmly in and the monitor is on the correct input, then in Display settings click Detect. A different cable or port often fixes it."),("Can I use a TV as a second screen?","Yes &mdash; most TVs work as a monitor over HDMI. They&rsquo;re great for bigger text, though a proper monitor is sharper up close."),("Which cable do I need?","Look at the ports on your computer and monitor &mdash; usually HDMI or USB-C. If you&rsquo;re unsure, tell us the make and model and we&rsquo;ll advise.")]),
]

import datetime as _dt
_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
           "September", "October", "November", "December"]
_BASE = _dt.date(2026, 5, 20)
for _i, p in enumerate(POSTS):
    _d = _BASE - _dt.timedelta(days=_i * 12)
    make_post(dt=_d.isoformat(), dt_pretty=f"{_d.day} {_MONTHS[_d.month - 1]} {_d.year}", **p)

# ---------------- THE HUB ----------------
def hub():
    slug = "it-advice"
    desc = "Practical IT advice from 365 Techies — helpful guides on monthly support, home computers, business IT, Microsoft 365, cybersecurity and Windows, for homes and businesses across Dorset."
    groups = ""
    for c in CATS:
        cards = ""
        for p in POSTS:
            if p["cat"] != c:
                continue
            cards += f'''          <a class="post-card" href="/{p["slug"]}/">
            <p class="post-card__cat">{c}</p>
            <h3>{p["title"]}</h3>
            <p>{p["lede"]}</p>
            <span class="post-card__more">Read article &#8594;</span>
          </a>\n'''
        groups += f'''      <div class="blog-cat" data-cat="{c}">
        <div class="blog-cat-head" data-reveal><h2>{c}</h2></div>
        <div class="blog-grid" data-stagger>
{cards}        </div>
      </div>\n'''
    chips_html = "".join(f'          <button type="button" class="hub-chip" data-filter="{c}">{c}</button>\n' for c in CATS)
    content = "\n".join([
      hero(f'<a href="/">Home</a> <span>/</span> <span aria-current="page">IT Advice</span>',
           "// IT ADVICE HUB", 'IT advice <em class="grad grad--cyan">that actually helps</em>',
           "Helpful, jargon-free guides on getting the most from your technology — monthly support, home computers, business IT, Microsoft 365, cybersecurity and Windows.",
           cta1=("View Monthly Plans", "/monthly-it-support/"), cta2=("Contact Us", "/contact/"),
           chips=["Plain English", "Practical tips", "Updated regularly"]),
      f'''    <section class="section" style="padding-bottom:0" aria-label="Filter advice">
      <div class="wrap">
        <div class="hub-filter" id="advice-filter">
          <button type="button" class="hub-chip is-active" data-filter="all">All</button>
{chips_html}        </div>
      </div>
    </section>''',
      f'''    <section class="blog-section" aria-label="Advice articles">
      <div class="wrap">
{groups}      </div>
    </section>''',
      '''    <script>
    (function(){
      var f=document.getElementById('advice-filter'); if(!f) return;
      var cats=[].slice.call(document.querySelectorAll('.blog-cat'));
      f.addEventListener('click',function(e){
        var b=e.target.closest('.hub-chip'); if(!b) return;
        var v=b.getAttribute('data-filter');
        f.querySelectorAll('.hub-chip').forEach(function(x){x.classList.toggle('is-active',x===b);});
        cats.forEach(function(c){ c.style.display=(v==='all'||c.getAttribute('data-cat')===v)?'':'none'; });
      });
    })();
    </script>''',
      cta("Rather we just sorted it?",
          "Every guide here is something we handle for our customers every day. Get friendly monthly IT support for your home or business.",
          primary=("View Monthly Plans", "/monthly-it-support/"), secondary=("Call 01202 775566", "tel:+441202775566")),
    ])
    def schema(s, _desc=desc):
        return graph([crumb(s, "IT Advice"), webpage(s, "IT Advice Hub", _desc, "CollectionPage")])
    add(slug=slug, title="IT Advice Hub | Helpful IT Guides | 365 Techies",
        desc=desc, og_title="IT Advice Hub | 365 Techies", schema=schema, content=content)
hub()

w = write_all()
print("Wrote %d pages total:" % len(w))
print("  ... including IT Advice Hub + %d posts" % len(POSTS))

# ---------------- regenerate sitemap.xml with every page ----------------
import os
LM = bp.TODAY  # sitemap lastmod = build date (freshness signal)
urls = ['''  <url>
    <loc>https://365techies.co.uk/</loc>
    <lastmod>%s</lastmod>
    <image:image><image:loc>https://365techies.co.uk/og-image.jpg</image:loc><image:title>365 Techies — Monthly IT Support for Homes &amp; Businesses</image:title></image:image>
    <image:image><image:loc>https://365techies.co.uk/logo.jpg</image:loc><image:title>365 Techies logo</image:title></image:image>
  </url>''' % LM]
for p in bp.PAGES:
    urls.append('  <url><loc>https://365techies.co.uk/%s/</loc><lastmod>%s</lastmod></url>' % (p["slug"], LM))
sm = ('<?xml version="1.0" encoding="UTF-8"?>\n'
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
      'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
      + "\n".join(urls) + "\n</urlset>\n")
with open(os.path.join(bp.BASE, "sitemap.xml"), "w", encoding="utf-8") as f:
    f.write(sm)
print("Wrote sitemap.xml with %d URLs" % (len(bp.PAGES) + 1))

# ---------------- regenerate llms.txt (AI grounding) from the live pages — never drifts ----------------
import html as _html
def _clean(s): return _html.unescape((s or "")).replace("\n", " ").strip()
LLMS_HEADER = """# 365 Techies

> 365 Techies (365 Techies Limited) is a family-run IT support company and managed service provider, established in 1995, providing monthly IT support and one-off computer & laptop repairs for homes, retired & disabled people, sole traders and small businesses across Bournemouth, Poole and the rest of Dorset, UK. Dell specialists, Microsoft Partner, certified Microsoft Office Specialists and Malwarebytes Partner. Rated 4.9/5 from 51 Google reviews. Phone: 01202 775566. Text (SMS only): 07520 615332.

## Key facts
- Company: 365 Techies Limited, registered in England & Wales, company number 11073501
- Phone: 01202 775566 — Text (SMS only): 07520 615332 — Email: help@365techies.co.uk
- Hours: Monday–Friday, 9am–5pm
- Based in Bournemouth; serves homes and small businesses across Dorset, the New Forest and Hampshire — remotely and on-site
- Rated 4.9/5 from 51 Google reviews; family-run since 1995; no call-out fee, no contracts, cancel anytime
- Heritage: built and ran the Dorset Microsoft Education Resource Centre (a training centre in Winton, Bournemouth, on their own computer network) from 1998 to 2008; then ran a computer sales, service and support centre in Moordown, Winton from 2008 to 2017; moved to the Kinson Community Centre, Bournemouth in 2017, providing community IT support and group training classes in person (when it can't be done remotely); some customers from that era are still supported today

## Plans & prices
- Home IT support: £18.25/month per computer; add Microsoft 365 for £4.85/month per user
- Business IT support: from £24.38/month per computer (tailored to the team)
- One-off computer & laptop repairs: no subscription — free diagnosis, no-fix-no-fee, 12-month warranty, no call-out fee
- Microsoft 365: £4.85 per user/month
- AI voice receptionist: from £95/month — AI Starter pilot: from £495 one-off
"""
llms_lines = [LLMS_HEADER, "## Pages\n",
              "- [365 Techies — IT Support & Computer Repair, Bournemouth & Dorset](https://365techies.co.uk/): Friendly IT support and computer repairs for homes and businesses across Bournemouth, Poole and Dorset — rated 4.9 on Google, family-run since 1995."]
for _p in bp.PAGES:
    llms_lines.append("- [%s](https://365techies.co.uk/%s/): %s" % (_clean(_p["title"]), _p["slug"], _clean(_p.get("desc", ""))))
with open(os.path.join(bp.BASE, "llms.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(llms_lines) + "\n")
print("Wrote llms.txt with %d pages" % (len(bp.PAGES) + 1))

# ---------------- custom 404 page ----------------
_404_cards = "".join(
    f'          <a class="post-card" href="{h}"><h3>{l}</h3><span class="post-card__more">Go &#8594;</span></a>\n'
    for l, h in [("Home", "/"), ("All Services", "/services/"), ("Monthly IT Support", "/monthly-it-support/"),
                 ("Book a Service", "/book-service/"), ("IT Advice", "/it-advice/"), ("Contact Us", "/contact/")])
content_404 = "\n".join([
    hero('<a href="/">Home</a> <span>/</span> <span aria-current="page">Page not found</span>',
         "// ERROR 404", 'Page <em class="grad grad--cyan">not found</em>',
         "Sorry &mdash; we couldn&rsquo;t find that page. It may have moved or no longer exist. Here are some helpful places to go instead.",
         cta1=("Back to Home", "/"), cta2=("Contact Us", "/contact/"), chips=["Error 404"]),
    f'''    <section class="section"><div class="wrap">
        <div class="blog-grid" data-stagger>
{_404_cards}        </div>
      </div></section>''',
    cta("Can&rsquo;t find what you need?",
        "Give us a call or drop us a message and a friendly techie will point you the right way.",
        primary=("Contact Us", "/contact/"), secondary=("Call 01202 775566", "tel:+441202775566")),
])
html_404 = bp.page("404", "Page Not Found | 365 Techies",
                   "Sorry, we couldn't find that page. Browse our IT support services or get in touch with 365 Techies.",
                   "Page Not Found | 365 Techies",
                   graph([webpage("404", "Page Not Found", "Sorry, that page could not be found.")]),
                   content_404).replace("index, follow", "noindex, follow")
with open(os.path.join(bp.BASE, "404.html"), "w", encoding="utf-8") as f:
    f.write(html_404)
print("Wrote 404.html")
