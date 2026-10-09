# Software we supply (owner, 3 Oct 2026: "go ahead with those prices ... use Defender, but also add Malwarebytes").
# ONE table of products and prices, and which pages show which. build_pages.add() inserts the section just above a
# page's FAQs. Prices are the owner's (Pax8 cost incl. the VAT Pax8 adds + margin; see the pax8-distributor memory).
# A price change happens HERE only. Never put a price in this file the owner hasn't approved.
# soon=True: not orderable yet - shown, CTA "Register interest". (9 Oct 2026: the Microsoft licences went live - Partner Center
# CSP approved, Wirehive (Pax8 UK) authorised as indirect provider, Pax8 Microsoft partner shell 114871 submitted.)
# price=None: no published price yet - the card says "Ask us for today's price".
from urllib.parse import quote

PRODUCTS = {
    "m365-basic": dict(
        name="Microsoft 365 Business Basic", price="6.50", per="per person a month",
        what="Business email on your own domain, Teams, 1&nbsp;TB of OneDrive storage each, and the web and mobile Office apps."),
    "m365-standard": dict(
        name="Microsoft 365 Business Standard", price="12.50", per="per person a month",
        what="Everything in Basic, plus the full Office apps &mdash; Word, Excel, Outlook and PowerPoint &mdash; installed on your computers."),
    "m365-premium": dict(
        name="Microsoft 365 Business Premium", price="19.75", per="per person a month",
        what="Everything in Standard, plus Microsoft&rsquo;s business security: Defender for Business and Intune device management."),
    "exchange": dict(
        name="Business email only (Exchange Online)", price="3.75", per="per person a month",
        what="Professional email on your own domain with a 50&nbsp;GB mailbox, without the Office apps."),
    "defender": dict(
        name="Microsoft Defender for Business", price="2.75", per="per person a month",
        what="Microsoft&rsquo;s business antivirus and threat protection for your PCs, Macs, phones and tablets. Already included in Business Premium."),
    # Malwarebytes prices: owner, 3 Oct 2026 ("still all four"). Set against Malwarebytes' own UK prices that day:
    # Standard 1 device GBP 29.99/yr, Plus 3 devices + VPN GBP 69.98/yr, ThreatDown Core GBP 4.75/device/month (5-device minimum).
    "mb-home": dict(
        name="Malwarebytes for your home computer", price="2.50", per="per computer a month",
        what="Malwarebytes antivirus with scam and ad blocking, installed by us and checked at every service. The same price every year."),
    "mb-home-vpn": dict(
        name="Malwarebytes with Privacy VPN", price="5.85", per="a month for up to 3 devices",
        what="Malwarebytes on up to three computers, phones or tablets, plus the Privacy VPN for safer browsing on public Wi-Fi."),
    "threatdown": dict(
        name="Malwarebytes for business (ThreatDown)", price="4.50", per="per computer a month",
        what="The business edition of Malwarebytes: real-time protection on every computer, run from one central console and watched by us."),
    "acronis-pc": dict(
        name="Acronis computer backup", price="12.00", per="per computer a month, 100&nbsp;GB included",
        what="Backs up the whole computer to the cloud, so a single file or the entire machine can be restored. Need more than 100&nbsp;GB? We&rsquo;ll quote."),
    "acronis-m365": dict(
        name="Microsoft 365 backup (Acronis)", price="4.50", per="per person a month",
        what="A separate, unlimited cloud copy of each person&rsquo;s Microsoft 365 email, OneDrive, SharePoint and Teams, so deleted or encrypted files and emails can be brought back."),
    "keeper": dict(
        name="Keeper Business password manager", price="3.50", per="per person a month",
        what="A password vault for each member of staff, shared folders for team logins, and one place to remove access the day someone leaves."),
    "proofpoint": dict(
        name="Proofpoint email filtering", price="2.75", per="per person a month",
        what="Checks incoming email for spam, phishing and viruses before it reaches anyone&rsquo;s inbox."),
    "usecure": dict(
        name="usecure staff security training", price="1.75", per="per person a month",
        what="Short, regular training for staff, plus practice phishing emails that show who might click &mdash; before a real one arrives."),
}

# slug: (eyebrow, heading, lede, [product keys], bundle line or "")
_M365 = ["m365-basic", "m365-standard", "m365-premium", "exchange"]
_MICROSOFT = set(_M365 + ["defender"])   # the licences bought through Pax8's Microsoft partner shell (12-month NCE terms)
_BIZ_LEDE = "We buy it, set it up for you and look after it &mdash; you deal with us, not a call centre."
PAGE_OFFERS = {
    "which-microsoft-365-plan": ("// FROM 365 TECHIES", "Microsoft 365 business plans from us",
        "Our price per person a month. We buy the licences, set them up for you and look after them &mdash; you deal with us, not a call centre.", _M365, ""),
    "microsoft-365-support": ("// FROM 365 TECHIES", "Microsoft 365 business plans from us",
        "Our price per person a month. We buy the licences, set them up for you and look after them &mdash; you deal with us, not a call centre.", _M365 + ["acronis-m365"], ""),
    "cloud-backup": ("// SET UP AND LOOKED AFTER BY US", "Backup we can set up for you", _BIZ_LEDE, ["acronis-pc", "acronis-m365"], ""),
    "backup-support": ("// SET UP AND LOOKED AFTER BY US", "Backup we can set up for you", _BIZ_LEDE, ["acronis-pc", "acronis-m365"], ""),
    "microsoft-365-backup-do-you-need-it": ("// SET UP AND LOOKED AFTER BY US", "Microsoft 365 backup from us", _BIZ_LEDE, ["acronis-m365", "acronis-pc"], ""),
    "cybersecurity-support": ("// SET UP AND LOOKED AFTER BY US", "Security software we can set up for you", _BIZ_LEDE,
        ["defender", "threatdown", "proofpoint", "usecure", "keeper"], ""),
    "cyber-essentials": ("// SET UP AND LOOKED AFTER BY US", "Software that helps you meet it", _BIZ_LEDE, ["defender", "keeper", "usecure"], ""),
    "password-manager-setup": ("// SET UP AND LOOKED AFTER BY US", "The password manager we supply", _BIZ_LEDE, ["keeper"], ""),
    "how-to-use-a-password-manager": ("// FOR YOUR BUSINESS", "The password manager we supply", _BIZ_LEDE, ["keeper"], ""),
    "security-awareness-training": ("// SET UP AND LOOKED AFTER BY US", "Staff training we can run for you", _BIZ_LEDE, ["usecure"], ""),
    "how-to-protect-your-business-email": ("// SET UP AND LOOKED AFTER BY US", "Email protection we can set up for you", _BIZ_LEDE, ["proofpoint", "usecure"], ""),
    "business-email-compromise": ("// FOR YOUR BUSINESS", "Email protection we can set up for you", _BIZ_LEDE, ["proofpoint", "usecure"], ""),
    "business-it-support-plans": ("// ADD TO YOUR PLAN", "Software we supply and look after", _BIZ_LEDE,
        ["m365-standard", "acronis-pc", "keeper", "defender", "threatdown", "proofpoint"],
        "A typical small office: Microsoft 365 Business Standard (&pound;12.50), computer backup (&pound;12.00) and Keeper passwords (&pound;3.50) &mdash; <strong>&pound;28.00 per person a month</strong> for the software, alongside your support plan."),
    "small-business-it-support": ("// ADD TO YOUR PLAN", "Software we supply and look after", _BIZ_LEDE,
        ["m365-standard", "acronis-pc", "keeper", "defender", "threatdown", "proofpoint"], ""),
    "malwarebytes-premium": ("// ORDER IT FROM US", "Get Malwarebytes through us",
        "We&rsquo;re a Malwarebytes reseller. We install it properly on every device and keep an eye on it for you &mdash; for homes, and as ThreatDown for businesses.",
        ["mb-home", "mb-home-vpn", "threatdown"], ""),
}

# Support + software bundles (owner, 3 Oct 2026: "Business Care" GBP 35 and "Business Care Plus" GBP 45, per person with
# one computer each, no VAT). Set against the published local MSP packages of GBP 35 / GBP 45 + VAT per user. The
# "bought separately" figure is summed from the parts, so it can never drift from the prices above.
SUPPORT_FROM = "24.38"   # business support, per computer a month (pricing-truth)
BUNDLES = {
    "business-care": dict(
        name="Business Care", price="35.00",
        desc="IT support and Microsoft 365 for one person, in one monthly price.",
        parts=[("Business IT support, remote fixes included", SUPPORT_FROM),
               ("Microsoft 365 Business Standard licence: email, Teams and the full Office apps", PRODUCTS["m365-standard"]["price"])],
        extras=["Full computer service every 6 weeks, with a written Service Report"]),
    "business-care-plus": dict(
        name="Business Care Plus", price="45.00",
        desc="Everything a small office needs to stay protected, in one monthly price.",
        parts=[("Business IT support, remote fixes included", SUPPORT_FROM),
               ("Microsoft 365 Business Premium licence: Standard plus Microsoft&rsquo;s business security", PRODUCTS["m365-premium"]["price"]),
               ("Microsoft 365 backup of email, OneDrive, SharePoint and Teams", PRODUCTS["acronis-m365"]["price"]),
               ("Staff security training with practice phishing emails", PRODUCTS["usecure"]["price"])],
        extras=["Full computer service every 6 weeks, with a written Service Report"]),
}

def _bundle_card(key):
    b = BUNDLES[key]
    separately = sum(float(p) for _, p in b["parts"])
    items = "\n".join(f'              <li>{label} <span class="swb-was">normally &pound;{price}</span></li>' for label, price in b["parts"])
    items += "\n" + "\n".join(f'              <li>{x}</li>' for x in b["extras"])
    href = "/contact/?topic=business-it-support&amp;product=" + quote(b["name"])
    return (f'          <article class="swb-card">\n'
            f'            <h3 class="swb-name">{b["name"]}</h3>\n'
            f'            <p class="swb-desc">{b["desc"]}</p>\n'
            f'            <p class="swb-price"><b>&pound;{b["price"]}</b><span>per person a month, one computer each &middot; no VAT to add</span></p>\n'
            f'            <ul class="swb-list">\n{items}\n            </ul>\n'
            f'            <p class="swb-save">Bought separately: &pound;{separately:.2f}. You save &pound;{separately - float(b["price"]):.2f} a month per person.</p>\n'
            f'            <a class="button primary" href="{href}" aria-label="Get this set up: {b["name"]}">Get this set up</a>\n'
            f'          </article>')

def bundles_section():
    cards = "\n".join(_bundle_card(k) for k in BUNDLES)
    return f'''    <section class="section swb" id="bundles" aria-label="Support and Microsoft 365 bundles">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// SUPPORT + SOFTWARE TOGETHER</p>
          <h2 class="section-title section-title--center" data-title>Business Care bundles<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Your IT support and your Microsoft 365 in one price per person, with remote fixes included. We&rsquo;re not VAT registered, so the price you see is the price you pay.</p>
        </div>
        <div class="swb-grid">
{cards}
        </div>
        <p class="swo-note">Microsoft 365 licences are on a 12-month term. Extra computers without a licence are &pound;{SUPPORT_FROM} a month each. On-site visits, parts and new set-ups are quoted before we start.</p>
      </div>
      <style>
      .swb-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.1rem;max-width:900px;margin:0 auto}}
      .swb-card{{display:flex;flex-direction:column;gap:.65rem;padding:1.4rem 1.4rem 1.5rem;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(255,255,255,.035)}}
      .swb-name{{margin:0;font-size:1.3rem}}
      .swb-desc{{margin:0;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.5}}
      .swb-price{{margin:.1rem 0;display:flex;flex-direction:column}}
      .swb-price b{{font-size:2.1rem;line-height:1.1;color:var(--cyan,#37c2c2);font-variant-numeric:tabular-nums}}
      .swb-price span{{font-size:.84rem;color:var(--muted,#9aa6c2)}}
      .swb-list{{margin:0;padding-left:1.1rem;display:flex;flex-direction:column;gap:.45rem;font-size:.95rem;line-height:1.45;flex:1}}
      .swb-was{{display:block;font-size:.8rem;color:var(--muted,#9aa6c2)}}
      .swb-save{{margin:.2rem 0 .3rem;font-size:.88rem;color:var(--green,#00ce1b)}}
      .swb-card .button{{align-self:flex-start;white-space:nowrap}}
      </style>
    </section>'''

CONTACT = "/contact/?topic=software-we-supply&amp;product="

def _card(key):
    p = PRODUCTS[key]
    tag = '<span class="swo-tag">AVAILABLE SOON</span>' if p.get("soon") else ""
    if p.get("price"):
        price = f'<p class="swo-price"><b>&pound;{p["price"]}</b><span>{p["per"]}</span></p>'
    else:
        price = f'<p class="swo-price swo-price--ask"><b>Ask us</b><span>for today&rsquo;s price, {p["per"]}</span></p>'
    label = "Register interest" if p.get("soon") else "Get this set up"   # short: "Ask us to set this up" wrapped in a 250px card
    # the product name travels to the contact form (forms.js puts it in the message), so the Slack card says what was asked
    plain = p["name"].replace("&nbsp;", " ").replace("&mdash;", "-").replace("&rsquo;", "'")
    href = CONTACT + quote(plain)
    return (f'          <article class="swo-card">{tag}\n'
            f'            <h3 class="swo-name">{p["name"]}</h3>\n'
            f'            <p class="swo-what">{p["what"]}</p>\n'
            f'            {price}\n'
            f'            <a class="button {"secondary" if p.get("soon") else "primary"}" href="{href}" aria-label="{label}: {plain}">{label}</a>\n'
            f'          </article>')

def section(slug):
    if slug not in PAGE_OFFERS:
        return ""
    eyebrow, heading, lede, keys, bundle = PAGE_OFFERS[slug]
    cards = "\n".join(_card(k) for k in keys)
    bundle_html = f'\n        <p class="swo-bundle">{bundle}</p>' if bundle else ""
    ms = any(k in _MICROSOFT for k in keys)   # (9 Oct 2026: was "any still coming soon" - the term matters most once they can be ordered)
    note = ("Prices are per month. We&rsquo;re not VAT registered, so there&rsquo;s no VAT to add."
            + (" Microsoft 365 plans are on a 12-month term; a monthly rolling option is available at a higher price." if ms else ""))
    return f'''    <section class="section swo" id="software" aria-label="{heading}">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>{eyebrow}</p>
          <h2 class="section-title section-title--center" data-title>{heading}<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>{lede}</p>
        </div>
        <div class="swo-grid">
{cards}
        </div>{bundle_html}
        <p class="swo-note">{note}</p>
      </div>
      <style>
      .swo-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;max-width:1100px;margin:0 auto}}
      .swo-card{{display:flex;flex-direction:column;gap:.6rem;padding:1.25rem 1.3rem;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(255,255,255,.03)}}
      .swo-tag{{align-self:flex-start;font:600 .7rem/1 var(--mono,monospace);letter-spacing:.06em;padding:.3rem .5rem;border-radius:6px;background:rgba(55,194,194,.14);color:var(--cyan,#37c2c2)}}
      .swo-name{{margin:0;font-size:1.08rem;line-height:1.3}}
      .swo-what{{margin:0;font-size:.92rem;color:var(--muted,#9aa6c2);line-height:1.55;flex:1}}
      .swo-price{{margin:.2rem 0 .3rem;display:flex;flex-direction:column}}
      .swo-price b{{font-size:1.7rem;line-height:1.1;color:var(--cyan,#37c2c2);font-variant-numeric:tabular-nums}}
      .swo-price--ask b{{font-size:1.3rem}}
      .swo-price span{{font-size:.82rem;color:var(--muted,#9aa6c2)}}
      .swo-card .button{{align-self:flex-start;white-space:nowrap}}
      .swo-bundle{{max-width:70ch;margin:1.4rem auto 0;text-align:center;line-height:1.6}}
      .swo-note{{max-width:70ch;margin:1rem auto 0;text-align:center;font-size:.82rem;color:var(--muted,#9aa6c2)}}
      </style>
    </section>'''

def insert(slug, content):
    """The section goes just above the page's FAQs, else at the end of its content."""
    html = section(slug)
    if not html or not isinstance(content, str):
        return content
    i = content.find('<details class="faq"')
    s = content.rfind("<section", 0, i) if i >= 0 else -1
    return content[:s] + html + "\n" + content[s:] if s >= 0 else content + "\n" + html
