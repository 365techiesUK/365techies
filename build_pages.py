# -*- coding: utf-8 -*-
"""365 Techies multi-page generator.
Holds the shared header/footer/head once; each PAGE supplies unique content + SEO + schema.
Run: python build_pages.py  (writes <slug>/index.html for every page)
"""
import os, json, datetime
from tool_seo_data import TOOL_TITLES, TOOL_SEO
TODAY = datetime.date.today().isoformat()  # build date — used for dateModified / sitemap lastmod (freshness)
# Per-town UNIQUE researched local content (keyed by town name) — injected into repair/town
# pages so each is genuinely distinct (kills doorway/duplicate-content risk). Built by the
# town-local-content workflow into local_content.json.
try:
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "local_content.json"), encoding="utf-8") as _lcf:
        LOCAL_CONTENT = json.load(_lcf)
except Exception:
    LOCAL_CONTENT = {}

BASE = os.path.dirname(os.path.abspath(__file__))
SITE = "https://365techies.co.uk"
CSSV = "54"
HUBSPOT_ID = "148562638"
# Public URL of the deployed 365 AI OS. When set, the /365-ai-os/ page shows a
# prominent "Launch the live demo" button. Leave empty ("") to hide it.
AI_OS_URL = ""
# Public URL of the deployed broadband-coverage proxy (the AI OS server's
# /api/broadband endpoint). When set, the broadband checker shows live Ofcom
# coverage for the entered postcode. Leave empty ("") for signposting only.
BROADBAND_API = ""
# WhatsApp click-to-chat. Set WHATSAPP_NUMBER to international digits ONLY
# (no +, spaces or 0, e.g. "447520615332") once the shared WhatsApp Business
# number is live and verified; leave "" to hide every WhatsApp link site-wide
# (so no dead link is ever published). NOTE: also hand-edit index.html (static
# homepage) to add WhatsApp when you flip this on — see homepage-is-static.
WHATSAPP_NUMBER = ""
WHATSAPP_LINK = ("https://wa.me/" + WHATSAPP_NUMBER) if WHATSAPP_NUMBER else ""
# Ready-made footer/menu snippets — render to "" when no number is set.
WA_FOOTER = (f'<br /><a href="{WHATSAPP_LINK}" target="_blank" rel="noopener">WhatsApp us</a>') if WHATSAPP_NUMBER else ""
WA_MENU = (f'<br /><a href="{WHATSAPP_LINK}" target="_blank" rel="noopener">WhatsApp us</a>') if WHATSAPP_NUMBER else ""
WA_CONTACT_ROW = (f'<li><span class="k">WhatsApp</span><span class="v"><a href="{WHATSAPP_LINK}" target="_blank" rel="noopener">Chat on WhatsApp &#8594;</a></span></li>') if WHATSAPP_NUMBER else ""

# GoCardless Direct Debit subscription links (paste the hosted payment-link URL
# from your GoCardless dashboard for each plan; empty = route to /contact/).
GOCARDLESS = {
    "home-essential": "",
    "home-family": "",
    "home-premium": "",
    "business-starter": "",
}
def subscribe_href(key):
    return GOCARDLESS.get(key) or "/contact/"

GC_NOTE = '''    <section class="section section--alt" aria-label="Direct Debit payments">
      <div class="wrap wrap--narrow" style="text-align:center">
        <p class="eyebrow eyebrow--center mono" data-reveal>// SIMPLE MONTHLY PAYMENTS</p>
        <h2 class="section-title section-title--center" data-title>Pay monthly by Direct Debit<span class="title-underline title-underline--center"></span></h2>
        <p class="lede lede--center" data-reveal>Pay monthly by secure Direct Debit, powered by GoCardless. Tell us your setup and we&rsquo;ll send your secure sign-up link the same working day — no card to re-enter each month, no contract, change or cancel anytime.</p>
        <div class="partner-badges" style="justify-content:center;margin-top:1.6rem" data-reveal>
          <span class="partner-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>Direct Debit by GoCardless</span>
          <span class="partner-badge partner-badge--green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>Secure &amp; FCA-regulated</span>
          <span class="partner-badge partner-badge--green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Cancel anytime</span>
        </div>
      </div>
    </section>'''
HUBSPOT_REGION = "eu1"

IMPORTMAP = '{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js" } }'

# ---- shared icons ----
IC = {
 "home": '<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H4a1 1 0 0 1-1-1z"/>',
 "briefcase": '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
 "user": '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
 "users": '<circle cx="9" cy="8" r="3.5"/><path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 21v-1a5 5 0 0 0-3-4.6"/>',
 "shield": '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
 "cloud": '<path d="M7 18a4 4 0 0 1 .6-7.96A5.5 5.5 0 0 1 18.4 11 3.5 3.5 0 0 1 18 18z"/>',
 "wrench": '<path d="M15 6a4 4 0 0 0 5 5l-9 9-3-3 9-9a4 4 0 0 0-2-2z"/>',
 "lock": '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 "mail": '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>',
 "wifi": '<path d="M5 12.5a11 11 0 0 1 14 0M2 9a16 16 0 0 1 20 0M8 16a6 6 0 0 1 8 0"/><circle cx="12" cy="19.5" r="1"/>',
 "server": '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
 "bolt": '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
 "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
 "check": '<path d="M20 6 9 17l-5-5"/>',
 "monitor": '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
 "pin": '<path d="M12 22s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
 "windows": '<path d="M3 5.5 11 4v7H3zM13 3.7 21 2.5V11h-8zM3 13h8v7l-8-1.5zM13 13h8v8.5L13 20z"/>',
 "battery": '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 10v4M6 10v4M10 10v4"/>',
 "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
 "leaf": '<path d="M4 20c0-9 7-16 16-16 0 9-7 16-16 16z"/><path d="M4 20C9 15 13 11 18 9"/>',
 "van": '<path d="M2 8h12l4 4h4v4h-2M2 8v8h2m4 0h6"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
 "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-6-3.8-9s1.3-6.5 3.8-9z"/>',
 "eye": '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
 "bug": '<rect x="8" y="6" width="8" height="12" rx="4"/><path d="M12 6V3M5 9l3 1M5 15l3-1M19 9l-3 1M19 15l-3-1M5 5l2 2M19 5l-2 2"/>',
 "robot": '<rect x="4" y="8" width="16" height="11" rx="2"/><circle cx="9" cy="13" r="1.2"/><circle cx="15" cy="13" r="1.2"/><path d="M12 4v4M8 19v2M16 19v2M2 12v3M22 12v3"/>',
 "cpu": '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
 "flow": '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6 8v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8M12 13v3"/>',
 "spark": '<path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
 "gift": '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12"/><path d="M8.5 9a2.5 2.5 0 1 1 3.5-2.3C12 8 10 9 8.5 9zM15.5 9a2.5 2.5 0 1 0-3.5-2.3C12 8 14 9 15.5 9z"/>',
 "heart": '<path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 3c0 4.5-9.5 12-9.5 12z"/>',
 "handshake": '<path d="M8 13l2 2 3-3 3 3 2-2M2 12l4-4 4 2 4-2 4 4M6 8V6h4M18 8V6h-4"/>',
 "bell": '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
 "phone": '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
}
def ico(name, cls="tile__ico"):
    return f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{IC[name]}</svg>'

# ---- shared chrome ----
HEADER = '''  <header class="site-header">
    <div class="status-ticker" aria-hidden="true">
      <div class="status-ticker__track">
        <span>&#9679; CALL 01202 775566&ensp;//&ensp;FAMILY BUSINESS SINCE 1995&ensp;//&ensp;DORSET MICROSOFT EDUCATION RESOURCE CENTRE 1998&ndash;2008&ensp;//&ensp;IT SUPPORT FOR MERCEDES-BENZ PENTAGON 1998&ndash;2008&ensp;//&ensp;COMPUTER SALES &amp; SERVICE CENTRE 2008&ndash;2017&ensp;//&ensp;KINSON COMMUNITY CENTRE 2017&ndash;NOW&ensp;//&ensp;ENVIRONMENT AGENCY RIVER AVON WIRELESS LINK SINCE 2015&ensp;//&ensp;DELL SPECIALISTS&ensp;//&ensp;WEBSITE DESIGN, HOSTING &amp; EMAIL&ensp;//&ensp;WORK FROM ANYWHERE &mdash; REMOTE PC ACCESS FOR SUPPORT CUSTOMERS&ensp;//&ensp;MICROSOFT PARTNER &amp; OFFICE SPECIALISTS&ensp;//&ensp;WINDOWS &amp; ANDROID SPECIALISTS&ensp;//&ensp;SAME-DAY RESPONSE &middot; USUALLY MINUTES REMOTELY&ensp;//&ensp;<a href="/heatwave-tech-guide/" tabindex="-1">HEATWAVE? KEEP YOUR TECH COOL &mdash; FREE GUIDE</a>&ensp;//&ensp;<a href="/is-it-down/" tabindex="-1">IS IT DOWN, OR IS IT JUST YOU? CHECK LIVE</a>&ensp;//&ensp;REMOTE IT SUPPORT ACROSS THE WHOLE UK&ensp;//&ensp;MALWAREBYTES PARTNER&ensp;//&ensp;NVIDIA &amp; SCAN PARTNER&ensp;//&ensp;RICHER SOUNDS PARTNER&ensp;//&ensp;BOURNEMOUTH &middot; POOLE &middot; DORSET&ensp;//&ensp;PLANS FROM &pound;18.25/MO&ensp;//&ensp;MON&ndash;FRI 9AM&ndash;5PM&ensp;//&ensp;</span>
        <span>&#9679; CALL 01202 775566&ensp;//&ensp;FAMILY BUSINESS SINCE 1995&ensp;//&ensp;DORSET MICROSOFT EDUCATION RESOURCE CENTRE 1998&ndash;2008&ensp;//&ensp;IT SUPPORT FOR MERCEDES-BENZ PENTAGON 1998&ndash;2008&ensp;//&ensp;COMPUTER SALES &amp; SERVICE CENTRE 2008&ndash;2017&ensp;//&ensp;KINSON COMMUNITY CENTRE 2017&ndash;NOW&ensp;//&ensp;ENVIRONMENT AGENCY RIVER AVON WIRELESS LINK SINCE 2015&ensp;//&ensp;DELL SPECIALISTS&ensp;//&ensp;WEBSITE DESIGN, HOSTING &amp; EMAIL&ensp;//&ensp;WORK FROM ANYWHERE &mdash; REMOTE PC ACCESS FOR SUPPORT CUSTOMERS&ensp;//&ensp;MICROSOFT PARTNER &amp; OFFICE SPECIALISTS&ensp;//&ensp;WINDOWS &amp; ANDROID SPECIALISTS&ensp;//&ensp;SAME-DAY RESPONSE &middot; USUALLY MINUTES REMOTELY&ensp;//&ensp;<a href="/heatwave-tech-guide/" tabindex="-1">HEATWAVE? KEEP YOUR TECH COOL &mdash; FREE GUIDE</a>&ensp;//&ensp;<a href="/is-it-down/" tabindex="-1">IS IT DOWN, OR IS IT JUST YOU? CHECK LIVE</a>&ensp;//&ensp;REMOTE IT SUPPORT ACROSS THE WHOLE UK&ensp;//&ensp;MALWAREBYTES PARTNER&ensp;//&ensp;NVIDIA &amp; SCAN PARTNER&ensp;//&ensp;RICHER SOUNDS PARTNER&ensp;//&ensp;BOURNEMOUTH &middot; POOLE &middot; DORSET&ensp;//&ensp;PLANS FROM &pound;18.25/MO&ensp;//&ensp;MON&ndash;FRI 9AM&ndash;5PM&ensp;//&ensp;</span>
      </div>
    </div>
    <div class="header-bar">
      <a class="logo" href="/" aria-label="365techies — home">
        <svg class="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="13.4" fill="none" stroke="#8fb3d9" stroke-width="2" stroke-linecap="round" stroke-dasharray="63 22" transform="rotate(-55 16 16)"/>
          <circle cx="16" cy="16" r="9.4" fill="none" stroke="#1d97e3" stroke-width="2" stroke-linecap="round" stroke-dasharray="46 14" transform="rotate(115 16 16)"/>
          <path d="M12.4 18.4l3.6-5.8 3.4 5.1z" fill="none" stroke="#8fb3d9" stroke-width="1.2"/>
          <circle cx="12.4" cy="18.4" r="1.6" fill="#00ce1b"/>
          <circle cx="16" cy="12.6" r="1.6" fill="#1d97e3"/>
          <circle cx="19.4" cy="17.7" r="1.6" fill="#1d97e3"/>
        </svg>
        <span class="logo__text"><em>365</em>techies</span>
      </a>
      <nav class="desktop-nav" aria-label="Primary">
        <a href="/">Home</a>
        <div class="nav-item has-dropdown">
          <a href="/home-it-support-subscriptions/" aria-haspopup="true">For Home
            <svg class="caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </a>
          <div class="dropdown">
            <a href="/home-it-support-subscriptions/">Home IT Support</a>
            <a href="/home-it-support-plans/">Home Support Plans</a>
            <a href="/family-it-support/">Families</a>
            <a href="/it-support-for-retired-users/">Retired Users</a>
            <a href="/it-support-for-disabled-people/">Disabled People</a>
            <a href="/computer-help-for-seniors/">Help for Seniors</a>
          <a href="/computer-lessons-for-seniors-bournemouth/">Computer Lessons</a>
            <a href="/computer-lessons-for-seniors-bournemouth/">Computer Lessons</a>
            <a href="/it-support-for-home-workers/">Home Workers</a>
            <a href="/it-support-for-digital-nomads/">Digital Nomads</a>
          </div>
        </div>
        <div class="nav-item has-dropdown">
          <a href="/business-it-support-subscriptions/" aria-haspopup="true">For Business
            <svg class="caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </a>
          <div class="dropdown">
            <a href="/business-it-support-subscriptions/">Business IT Support</a>
            <a href="/business-it-support-plans/">Business Support Plans</a>
            <a href="/small-business-it-support/">Small Businesses</a>
            <a href="/it-support-for-sole-traders/">Sole Traders</a>
            <a href="/it-support-for-education/">Schools &amp; Education</a>
          </div>
        </div>
        <div class="nav-item has-dropdown">
          <a href="/services/" aria-haspopup="true">Services
            <svg class="caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </a>
          <div class="dropdown">
            <a href="/services/">All Services &#8594;</a>
            <a href="/remote-it-support/">Remote IT Support</a>
            <a href="/preventative-maintenance/">Preventative Maintenance</a>
            <a href="/microsoft-365-support/">Microsoft 365</a>
            <a href="/cybersecurity-support/">Cybersecurity</a>
            <a href="/computer-repairs/">Computer Repairs</a>
            <a href="/dell-hardware/">Dell Laptops &amp; Desktops</a>
            <a href="/custom-pc-builds/">Custom-Built PCs</a>
            <a href="/wifi-support/">Wi-Fi Support</a>
            <a href="/email-support/">Email Support</a>
            <a href="/printer-support/">Printer Support</a>
            <a href="/backup-support/">Backup Support</a>
            <a href="/web-design-hosting/">Website Design &amp; Hosting</a>
            <a href="/cctv-smart-home/">CCTV &amp; Smart Home</a>
            <a href="/off-grid-victron-energy/">Off-Grid &amp; Victron Energy</a>
            <a href="/custom-vrm-dashboards/">Custom VRM Dashboards</a>
            <a href="/starlink-internet/">Starlink Internet</a>
            <a href="/agentic-ai-systems/">Agentic AI &amp; Automation</a>
            <a href="/it-support-by-industry/">IT Support by Industry</a>
          </div>
        </div>
        <div class="nav-item has-dropdown">
          <a href="/free-tools/" aria-haspopup="true">Free Tools
            <svg class="caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </a>
          <div class="dropdown">
            <a href="/free-tools/">All Free Tools &#8594;</a>
            <a href="/online-safety-course/">Free Online Safety Course</a>
            <a href="/broadband-speed-checker/">Broadband Speed Test</a>
            <a href="/pc-benchmark/">PC Benchmark</a>
            <a href="/website-checker/">Website Checker</a>
            <a href="/email-security-checker/">Email Security Checker</a>
            <a href="/password-breach-checker/">Password Breach Checker</a>
            <a href="/link-safety-checker/">Link Safety Checker</a>
            <a href="/wifi-qr-code-generator/">Wi-Fi QR Generator</a>
            <a href="/custom-pc-builder/">Custom PC Builder</a>
            <a href="/victron-system-builder/">Victron System Builder</a>
            <a href="/spot-the-scam/">Spot the Scam Quiz</a>
            <a href="/is-it-down/">Is It Down? Status Checker</a>
            <a href="/computer-spec-checker/">PC Hardware Checker</a>
          </div>
        </div>
        <div class="nav-item has-dropdown">
          <a href="/book-service/" aria-haspopup="true">Get Help
            <svg class="caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </a>
          <div class="dropdown">
            <a href="/book-service/">Book a Service</a>
            <a href="/book-a-collection/">Book a Collection</a>
            <a href="/remote-support/">Start Remote Support</a>
            <a href="/emergency-it-help/">Emergency IT Help</a>
            <a href="/is-it-down/">Is Something Down?</a>
            <a href="/support-portal/">Support Portal</a>
            <a href="/splashtop-business-guide/">Remote Access Guide</a>
            <a href="/dell-latitude-3520-guide/">Dell Laptop Guide</a>
            <a href="/dell-optiplex-guide/">Dell Desktop Guide</a>
            <a href="/heatwave-tech-guide/">Heatwave Tech Guide</a>
            <a href="/monthly-it-support/">Monthly IT Support</a>
            <a href="/switching-it-provider/">Switching to Us</a>
            <a href="/plan-finder/">Plan Finder</a>
            <a href="/cost-calculator/">Cost Calculator</a>
            <a href="/quick-quote/">Quick Quote</a>
            <a href="/resources/">Resources &amp; Guides</a>
            <a href="/it-advice/">IT Advice</a>
            <a href="/faqs/">FAQs</a>
          </div>
        </div>
        <a href="/pricing/">Pricing</a>
        <div class="nav-item has-dropdown">
          <a href="/about/" aria-haspopup="true">About
            <svg class="caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </a>
          <div class="dropdown">
            <a href="/about/">About</a>
            <a href="/our-values/">Our Values</a>
            <a href="/meet-the-team/">Meet the Team</a>
            <a href="/why-choose-365-techies/">Why Choose Us</a>
            <a href="/our-guarantees/">Our Guarantees</a>
            <a href="/case-studies/">Case Studies</a>
            <a href="/reviews/">Reviews</a>
            <a href="/accreditations/">Accreditations</a>
            <a href="/service-level-agreement/">Service Level Agreement</a>
            <a href="/areas-covered/">Areas Covered</a>
            <a href="/it-support-uk-europe/">UK &amp; Europe</a>
            <a href="/refer-a-friend/">Refer a Friend</a>
          </div>
        </div>
        <a href="/contact/">Contact</a>
      </nav>
      <div class="header-actions">
        <button type="button" class="nav-search" data-search-open aria-label="Search this website" aria-keyshortcuts="/ Control+K">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <span class="nav-search__label">Search</span>
          <span class="nav-search__k" aria-hidden="true"><kbd>/</kbd></span>
        </button>
        <a href="tel:+441202775566" class="nav-phone" aria-label="Call 365 Techies on 01202 775566">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg><span class="nav-phone__num">01202 775566</span>
        </a>
        <a href="/book-service/" class="nav-book" aria-label="Book a computer service">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/></svg>Book
        </a>
        <a href="https://sos.splashtop.com/en/sos-download" class="nav-sos" target="_blank" rel="noopener" aria-label="SOS emergency remote support — download Splashtop SOS">
          <span class="sos-dot" aria-hidden="true"></span>SOS<span class="nav-sos__long">&nbsp;REMOTE SUPPORT</span>
        </a>
        <button class="mobile-menu-button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>

  <div class="menu-backdrop" aria-hidden="true"></div>
  <aside class="mobile-menu" id="mobile-menu" aria-hidden="true">
    <p class="mobile-menu__label mono">// NAVIGATION</p>
    <nav class="mobile-menu__nav" aria-label="Mobile">
      <a href="/">Home</a>
      <a href="/pricing/">Pricing</a>
      <a href="/contact/">Contact</a>
      <details class="m-group">
        <summary>For Home</summary>
        <div class="m-group__links">
          <a href="/home-it-support-subscriptions/">Home IT Support</a>
          <a href="/home-it-support-plans/">Home Support Plans</a>
          <a href="/family-it-support/">Families</a>
          <a href="/it-support-for-retired-users/">Retired Users</a>
          <a href="/it-support-for-disabled-people/">Disabled People</a>
          <a href="/computer-help-for-seniors/">Help for Seniors</a>
          <a href="/computer-lessons-for-seniors-bournemouth/">Computer Lessons</a>
          <a href="/it-support-for-home-workers/">Home Workers</a>
          <a href="/it-support-for-digital-nomads/">Digital Nomads</a>
        </div>
      </details>
      <details class="m-group">
        <summary>For Business</summary>
        <div class="m-group__links">
          <a href="/business-it-support-subscriptions/">Business IT Support</a>
          <a href="/business-it-support-plans/">Business Support Plans</a>
          <a href="/small-business-it-support/">Small Businesses</a>
          <a href="/it-support-for-sole-traders/">Sole Traders</a>
          <a href="/it-support-for-education/">Schools &amp; Education</a>
        </div>
      </details>
      <details class="m-group">
        <summary>Services</summary>
        <div class="m-group__links">
          <a href="/services/">All Services &#8594;</a>
          <a href="/remote-it-support/">Remote IT Support</a>
          <a href="/preventative-maintenance/">Preventative Maintenance</a>
          <a href="/microsoft-365-support/">Microsoft 365</a>
          <a href="/cybersecurity-support/">Cybersecurity</a>
          <a href="/computer-repairs/">Computer Repairs</a>
          <a href="/dell-hardware/">Dell Laptops &amp; Desktops</a>
          <a href="/custom-pc-builds/">Custom-Built PCs</a>
          <a href="/wifi-support/">Wi-Fi Support</a>
          <a href="/email-support/">Email Support</a>
          <a href="/printer-support/">Printer Support</a>
          <a href="/backup-support/">Backup Support</a>
          <a href="/web-design-hosting/">Website Design &amp; Hosting</a>
          <a href="/cctv-smart-home/">CCTV &amp; Smart Home</a>
          <a href="/off-grid-victron-energy/">Off-Grid &amp; Victron Energy</a>
          <a href="/custom-vrm-dashboards/">Custom VRM Dashboards</a>
          <a href="/starlink-internet/">Starlink Internet</a>
          <a href="/agentic-ai-systems/">Agentic AI &amp; Automation</a>
          <a href="/it-support-by-industry/">IT Support by Industry</a>
        </div>
      </details>
      <details class="m-group">
        <summary>Free Tools</summary>
        <div class="m-group__links">
          <a href="/free-tools/">All Free Tools &#8594;</a>
          <a href="/online-safety-course/">Free Online Safety Course</a>
          <a href="/broadband-speed-checker/">Broadband Speed Test</a>
          <a href="/pc-benchmark/">PC Benchmark</a>
          <a href="/website-checker/">Website Checker</a>
          <a href="/email-security-checker/">Email Security Checker</a>
          <a href="/password-breach-checker/">Password Breach Checker</a>
          <a href="/link-safety-checker/">Link Safety Checker</a>
          <a href="/wifi-qr-code-generator/">Wi-Fi QR Generator</a>
          <a href="/custom-pc-builder/">Custom PC Builder</a>
          <a href="/victron-system-builder/">Victron System Builder</a>
          <a href="/spot-the-scam/">Spot the Scam Quiz</a>
          <a href="/is-it-down/">Is It Down? Status Checker</a>
          <a href="/computer-spec-checker/">PC Hardware Checker</a>
        </div>
      </details>
      <details class="m-group">
        <summary>Get Help</summary>
        <div class="m-group__links">
          <a href="/book-service/">Book a Service</a>
          <a href="/book-a-collection/">Book a Collection</a>
          <a href="/pay/">Pay Us</a>
          <a href="/remote-support/">Start Remote Support</a>
          <a href="/emergency-it-help/">Emergency IT Help</a>
          <a href="/is-it-down/">Is Something Down?</a>
          <a href="/support-portal/">Support Portal</a>
          <a href="/splashtop-business-guide/">Remote Access Guide</a>
          <a href="/dell-latitude-3520-guide/">Dell Laptop Guide</a>
          <a href="/dell-optiplex-guide/">Dell Desktop Guide</a>
          <a href="/heatwave-tech-guide/">Heatwave Tech Guide</a>
          <a href="/monthly-it-support/">Monthly IT Support</a>
          <a href="/switching-it-provider/">Switching to Us</a>
          <a href="/plan-finder/">Plan Finder</a>
          <a href="/cost-calculator/">Cost Calculator</a>
          <a href="/quick-quote/">Quick Quote</a>
          <a href="/resources/">Resources &amp; Guides</a>
          <a href="/it-advice/">IT Advice</a>
          <a href="/faqs/">FAQs</a>
        </div>
      </details>
      <details class="m-group">
        <summary>About &amp; Trust</summary>
        <div class="m-group__links">
          <a href="/about/">About</a>
          <a href="/our-values/">Our Values</a>
          <a href="/meet-the-team/">Meet the Team</a>
          <a href="/why-choose-365-techies/">Why Choose Us</a>
          <a href="/our-guarantees/">Our Guarantees</a>
          <a href="/case-studies/">Case Studies</a>
          <a href="/reviews/">Reviews</a>
          <a href="/accreditations/">Accreditations</a>
          <a href="/service-level-agreement/">Service Level Agreement</a>
          <a href="/areas-covered/">Areas Covered</a>
          <a href="/it-support-uk-europe/">UK &amp; Europe</a>
          <a href="/refer-a-friend/">Refer a Friend</a>
        </div>
      </details>
      <details class="m-group">
        <summary>Resources &amp; Info</summary>
        <div class="m-group__links">
          <a href="/resources/">Resources &amp; Guides</a>
          <a href="/it-advice/">IT Advice</a>
          <a href="/it-support-cost-guide/">IT Cost Guide</a>
          <a href="/it-jargon-buster/">IT Jargon Buster</a>
          <a href="/cybersecurity-checklist/">Cybersecurity Checklist</a>
          <a href="/cyber-threats/">Cyber Threats Explained</a>
          <a href="/faqs/">FAQs</a>
          <a href="/system-status/">System Status</a>
          <a href="/privacy-policy/">Privacy Policy</a>
          <a href="/cookie-policy/">Cookie Policy</a>
          <a href="/terms/">Terms of Service</a>
          <a href="/accessibility-statement/">Accessibility</a>
        </div>
      </details>
    </nav>
    <div class="mobile-menu__plans">
      <a class="button sos" href="https://sos.splashtop.com/en/sos-download" target="_blank" rel="noopener"><span class="sos-dot" aria-hidden="true"></span>SOS Remote Support</a>
      <a class="button primary" href="/book-service/">Book a Service</a>
      <a class="button secondary" href="/home-it-support-plans/">Home Plans</a>
      <a class="button secondary" href="/business-it-support-plans/">Business Plans</a>
    </div>
    <p class="mobile-menu__foot mono"><a href="mailto:help@365techies.co.uk">help@365techies.co.uk</a><br /><a href="tel:+441202775566">01202 775566</a><br /><a href="sms:+447520615332">Text only: 07520 615332</a>''' + WA_MENU + '''</p>
  </aside>
'''

# Text-only SMS number (TextMagic) — customers can text but not call this line. See memory text-number.md.
TEXT_DISPLAY = "07520 615332"
TEXT_SMS = "sms:+447520615332"

# Malwarebytes affiliate (Partnerize). camref = campaign ref. Links MUST be rel="sponsored"
# (Google requirement) and accompanied by an affiliate disclosure (UK ASA). Banners are
# lazy-loaded and responsive so they don't slow pages or overflow on mobile.
MB_CAMREF = "1110lwBPw"
def mb_affiliate(creative_id, w, h, alt="Malwarebytes Premium &mdash; trusted protection"):
    return (f'<a class="affiliate-banner" href="https://prf.hn/click/camref:{MB_CAMREF}/creativeref:{creative_id}" '
            f'target="_blank" rel="sponsored noopener"><img src="https://creative.prf.hn/source/camref:{MB_CAMREF}/creativeref:{creative_id}" '
            f'width="{w}" height="{h}" loading="lazy" decoding="async" alt="{alt}" /></a>')
def affiliate_block(creative_id, w, h, lead=""):
    lead_html = f'<p class="affiliate-lead">{lead}</p>' if lead else ""
    return (f'    <div class="affiliate-cta" data-reveal>{lead_html}{mb_affiliate(creative_id, w, h)}'
            f'<p class="affiliate-note mono">Affiliate link &mdash; we may earn a small commission if you buy through it, at no extra cost to you.</p></div>')

FOOTER = '''  <footer class="site-footer">
    <div class="footer-areas">
      <p class="footer-areas__head mono">// AREAS WE COVER &mdash; DORSET, NEW FOREST &amp; HAMPSHIRE</p>
      <nav class="footer-areas__links" aria-label="Areas we cover">
        <a href="/it-support-dorset/">IT support near you &mdash; all Dorset</a>
        <a href="/it-support-bournemouth/">Bournemouth</a>
        <a href="/it-support-poole/">Poole</a>
        <a href="/it-support-christchurch/">Christchurch</a>
        <a href="/it-support-ferndown/">Ferndown</a>
        <a href="/it-support-wimborne/">Wimborne</a>
        <a href="/it-support-broadstone/">Broadstone</a>
        <a href="/it-support-verwood/">Verwood</a>
        <a href="/it-support-ringwood/">Ringwood</a>
        <a href="/it-support-wareham/">Wareham</a>
        <a href="/it-support-swanage/">Swanage</a>
        <a href="/it-support-weymouth/">Weymouth</a>
        <a href="/it-support-dorchester/">Dorchester</a>
        <a href="/it-support-blandford-forum/">Blandford Forum</a>
        <a href="/it-support-shaftesbury/">Shaftesbury</a>
        <a href="/it-support-gillingham/">Gillingham</a>
        <a href="/it-support-sherborne/">Sherborne</a>
        <a href="/it-support-new-forest/">New Forest</a>
        <a href="/it-support-lymington/">Lymington</a>
        <a href="/it-support-new-milton/">New Milton</a>
        <a href="/it-support-brockenhurst/">Brockenhurst</a>
        <a href="/it-support-southampton/">Southampton</a>
        <a class="footer-areas__all" href="/areas-covered/">View all areas &#8594;</a>
      </nav>
    </div>
    <div class="site-footer__grid">
      <div class="site-footer__brand">
        <a class="logo" href="/">
          <svg class="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="13.4" fill="none" stroke="#8fb3d9" stroke-width="2" stroke-linecap="round" stroke-dasharray="63 22" transform="rotate(-55 16 16)"/>
            <circle cx="16" cy="16" r="9.4" fill="none" stroke="#1d97e3" stroke-width="2" stroke-linecap="round" stroke-dasharray="46 14" transform="rotate(115 16 16)"/>
            <path d="M12.4 18.4l3.6-5.8 3.4 5.1z" fill="none" stroke="#8fb3d9" stroke-width="1.2"/>
            <circle cx="12.4" cy="18.4" r="1.6" fill="#00ce1b"/>
            <circle cx="16" cy="12.6" r="1.6" fill="#1d97e3"/>
            <circle cx="19.4" cy="17.7" r="1.6" fill="#1d97e3"/>
          </svg>
          <span class="logo__text"><em>365</em>techies</span>
        </a>
        <p>The IT support experts. A family-run business established in 1995 — Dell hardware specialists, Microsoft partners and certified Microsoft Office Specialists, providing monthly IT support for homes and businesses across Bournemouth, Poole and Dorset.</p>
        <div class="partner-badges" aria-label="Accreditations">
          <span class="partner-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 21l5-2.5L17 21l-1.5-8.5"/></svg>Family Business &middot; Est. 1995</span>
          <span class="partner-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 18h18M9 22h6"/></svg>Dell Specialist</span>
          <span class="partner-badge partner-badge--green"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>Microsoft Partner</span>
          <span class="partner-badge partner-badge--green"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>Microsoft Office Specialist</span>
          <span class="partner-badge partner-badge--green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>Malwarebytes Partner</span>
          <span class="partner-badge partner-badge--green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z"/></svg>NVIDIA &amp; Scan Partner</span>
          <a class="partner-badge partner-badge--gold" href="https://www.google.com/maps?cid=5924622613303465737" target="_blank" rel="noopener" title="See our 4.9-star reviews on Google"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.5 1.6 6.7L12 17l-6.2 3.6 1.6-6.7L2.2 8.9l6.9-.6z"/></svg>4.9 on Google</a>
          <a class="partner-badge partner-badge--green" href="/sustainability/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 20c0-9 7-16 16-16 0 9-7 16-16 16z"/><path d="M4 20C9 15 13 11 18 9"/></svg>Sustainable Dorset Member</a>
        </div>
      </div>
      <nav aria-label="Support links">
        <p class="site-footer__head mono">SUPPORT</p>
        <a href="/book-service/">Book a Service</a>
        <a href="/book-a-collection/">Book a Collection</a>
        <a href="/pay/">Pay Us</a>
        <a href="/remote-support/">Start Remote Support</a>
        <a href="/emergency-it-help/">Emergency IT Help</a>
        <a href="/is-it-down/">Is Something Down?</a>
        <a href="/support-portal/">Support Portal</a>
        <a href="/splashtop-business-guide/">Remote Access Guide</a>
        <a href="/dell-latitude-3520-guide/">Dell Laptop Guide</a>
        <a href="/dell-optiplex-guide/">Dell Desktop Guide</a>
        <a href="/heatwave-tech-guide/">Heatwave Tech Guide</a>
        <a href="/monthly-it-support/">Monthly IT Support</a>
        <a href="/home-it-support-subscriptions/">Home IT Support</a>
        <a href="/business-it-support-subscriptions/">Business IT Support</a>
        <a href="/computer-repairs/">Computer Repairs</a>
        <a href="/switching-it-provider/">Switching to Us</a>
        <a href="/pricing/">Pricing</a>
        <a href="/quick-quote/">Quick Quote</a>
        <a href="/free-it-health-check/">Free IT Health Check</a>
      </nav>
      <nav aria-label="Free tools links">
        <p class="site-footer__head mono">FREE TOOLS</p>
        <a href="/free-tools/">All Free Tools &#8594;</a>
        <a href="/online-safety-course/">Free Online Safety Course</a>
        <a href="/broadband-speed-checker/">Broadband Speed Test</a>
        <a href="/pc-benchmark/">PC Benchmark</a>
        <a href="/website-checker/">Website Checker</a>
        <a href="/email-security-checker/">Email Security Checker</a>
        <a href="/password-breach-checker/">Password Breach Checker</a>
        <a href="/link-safety-checker/">Link Safety Checker</a>
        <a href="/password-generator/">Password Generator</a>
        <a href="/wifi-qr-code-generator/">Wi-Fi QR Generator</a>
        <a href="/custom-pc-builder/">Custom PC Builder</a>
        <a href="/victron-system-builder/">Victron System Builder</a>
        <a href="/solar-battery-calculator/">Battery &amp; Solar Calculator</a>
        <a href="/cost-calculator/">Cost Calculator</a>
        <a href="/plan-finder/">Plan Finder</a>
        <a href="/spot-the-scam/">Spot the Scam Quiz</a>
        <a href="/is-it-down/">Is It Down? Status Checker</a>
        <a href="/computer-spec-checker/">PC Hardware Checker</a>
      </nav>
      <nav aria-label="Services links">
        <p class="site-footer__head mono">SERVICES</p>
        <a href="/services/">All Services</a>
        <a href="/it-support-by-industry/">IT Support by Industry</a>
        <a href="/preventative-maintenance/">Preventative Maintenance</a>
        <a href="/remote-it-support/">Remote IT Support</a>
        <a href="/microsoft-365-support/">Microsoft 365</a>
        <a href="/cybersecurity-support/">Cybersecurity</a>
        <a href="/malwarebytes-premium/">Malwarebytes Premium &amp; VPN</a>
        <a href="/disaster-recovery/">Disaster Recovery</a>
        <a href="/gdpr-it-compliance/">GDPR &amp; IT Compliance</a>
        <a href="/windows-11-support/">Windows 11</a>
        <a href="/windows-10-end-of-life/">Windows 10 End of Life</a>
        <a href="/email-support/">Email Support</a>
        <a href="/wifi-support/">Wi-Fi Support</a>
        <a href="/printer-support/">Printer Support</a>
        <a href="/backup-support/">Backup Support</a>
        <a href="/new-computer-setup/">New Computer Setup</a>
        <a href="/dell-hardware/">Dell Laptops &amp; Desktops</a>
        <a href="/custom-pc-builds/">Custom-Built PCs</a>
        <a href="/threadripper-workstations/">Threadripper Workstations</a>
        <a href="/gaming-pcs/">Gaming PCs</a>
        <a href="/content-creator-pcs/">Content Creator PCs</a>
        <a href="/home-cinema-entertainment/">Home Cinema &amp; AV</a>
        <a href="/off-grid-victron-energy/">Off-Grid &amp; Victron Energy</a>
        <a href="/custom-vrm-dashboards/">Custom VRM Dashboards</a>
        <a href="/lithium-battery-installs-dorset/">Leisure &amp; Marine Batteries</a>
        <a href="/rural-and-farm-wifi-dorset/">Rural &amp; Farm Wi-Fi</a>
        <a href="/starlink-internet/">Starlink Internet</a>
        <a href="/web-design-hosting/">Website Design &amp; Hosting</a>
        <a href="/agentic-ai-systems/">Agentic AI Systems</a>
        <a href="/365-ai-os/">365 AI OS</a>
        <a href="/ai-voice-agents/">AI Voice Agents</a>
        <a href="/unitree-robots/">Unitree Robots</a>
        <a href="/it-support-for-hotels-holiday-lets/">Hotels &amp; Holiday Lets</a>
        <a href="/it-support-for-vets/">Veterinary Practices</a>
        <a href="/it-support-for-salons-beauty/">Salons &amp; Beauty</a>
        <a href="/it-support-for-financial-advisers/">Financial Advisers</a>
        <a href="/it-support-for-recruitment-agencies/">Recruitment Agencies</a>
        <a href="/it-support-for-garages-automotive/">Garages &amp; Automotive</a>
        <a href="/it-support-for-gyms-fitness/">Gyms &amp; Fitness</a>
        <a href="/it-support-for-ecommerce/">E-commerce &amp; Online Retail</a>
        <a href="/it-support-for-property-management/">Property Management</a>
        <a href="/it-support-for-manufacturing/">Manufacturing &amp; Engineering</a>
        <a href="/it-support-for-churches-faith/">Churches &amp; Faith Groups</a>
      </nav>
      <nav aria-label="Who we help links">
        <p class="site-footer__head mono">WHO WE HELP</p>
        <a href="/family-it-support/">Families</a>
        <a href="/it-support-for-retired-users/">Retired Users</a>
        <a href="/it-support-for-disabled-people/">Disabled People</a>
        <a href="/computer-help-for-seniors/">Help for Seniors</a>
        <a href="/it-support-for-home-workers/">Home Workers</a>
        <a href="/it-support-for-digital-nomads/">Digital Nomads</a>
        <a href="/it-support-for-sole-traders/">Sole Traders</a>
        <a href="/small-business-it-support/">Small Businesses</a>
      </nav>
      <nav aria-label="Company links">
        <p class="site-footer__head mono">COMPANY</p>
        <a href="/plan-finder/">Plan Finder</a>
        <a href="/areas-covered/">Areas Covered</a>
        <a href="/it-support-uk-europe/">UK &amp; Europe</a>
        <a href="/about/">About</a>
        <a href="/meet-the-team/">Meet the Team</a>
        <a href="/why-choose-365-techies/">Why Choose Us</a>
        <a href="/our-guarantees/">Our Guarantees</a>
        <a href="/case-studies/">Case Studies</a>
        <a href="/reviews/">Reviews</a>
        <a href="/refer-a-friend/">Refer a Friend</a>
        <a href="/cyber-threats/">Cyber Threats Explained</a>
        <a href="/it-jargon-buster/">IT Jargon Buster</a>
        <a href="/cybersecurity-checklist/">Cybersecurity Checklist</a>
        <a href="/plain-english/">Tech in Plain English</a>
        <a href="/using-ai-safely/">Using AI Safely</a>
        <a href="/pre-call-checklists/">Get-Ready Checklists</a>
        <a href="/our-values/">Our Values &amp; Promises</a>
        <a href="/choosing-it-support/">How to Choose IT Support</a>
        <a href="/independent-it-support/">Local vs the Alternatives</a>
        <a href="/it-cost-worksheet/">IT Quote Worksheet</a>
        <a href="/how-we-price/">How We Price</a>
        <a href="/your-first-6-weekly-service/">Your First Service</a>
        <a href="/how-to-set-up-two-factor-authentication/">Set Up 2FA</a>
        <a href="/ive-been-scammed-what-to-do/">I&rsquo;ve Been Scammed</a>
        <a href="/i-think-ive-been-hacked/">If You&rsquo;ve Been Hacked</a>
        <a href="/lost-or-stolen-phone-what-to-do/">Lost or Stolen Phone</a>
        <a href="/how-to-choose-a-laptop/">How to Choose a Laptop</a>
        <a href="/how-to-wipe-and-recycle-old-computer/">Wipe &amp; Recycle a PC</a>
        <a href="/safe-online-banking-for-beginners/">Safe Online Banking</a>
        <a href="/windows-accessibility-features-guide/">Windows Accessibility</a>
        <a href="/avoiding-tech-overwhelm/">Avoiding Tech Overwhelm</a>
        <a href="/how-to-choose-antivirus/">How to Choose Antivirus</a>
        <a href="/how-to-choose-broadband/">How to Choose Broadband</a>
        <a href="/setting-up-a-computer-for-an-older-relative/">Computer for an Older Relative</a>
        <a href="/helping-a-relative-with-their-computer/">Helping a Relative Remotely</a>
        <a href="/confident-video-calling/">Confident Video Calling</a>
        <a href="/how-onboarding-works/">How Onboarding Works</a>
        <a href="/microsoft-365-vs-google-workspace/">Microsoft 365 vs Google Workspace</a>
        <a href="/break-fix-vs-managed-it/">Break-Fix vs Managed IT</a>
        <a href="/spring-clean-your-computer/">Spring-Clean Your Computer</a>
        <a href="/back-to-school-it/">Back-to-School IT</a>
        <a href="/cloud-vs-on-premise/">Cloud vs On-Premise</a>
        <a href="/sustainability/">Sustainability</a>
        <a href="/resources/">Resources &amp; Guides</a>
        <a href="/faqs/">FAQs</a>
        <a href="/it-advice/">IT Advice</a>
        <a href="/contact/">Contact</a>
        <p class="site-footer__contact" style="margin-top:1.1rem"><a href="tel:+441202775566">01202 775566</a><br /><a href="sms:+447520615332">Text only: 07520 615332</a><br /><a href="mailto:help@365techies.co.uk">help@365techies.co.uk</a>''' + WA_FOOTER + '''<br />Mon&ndash;Fri, 9am&ndash;5pm<br />Bournemouth, Dorset<br />Remote IT support across the whole of the UK<br /><a href="https://www.facebook.com/365computersuk/" target="_blank" rel="noopener me">Find us on Facebook</a></p>
      </nav>
    </div>
    <nav class="site-footer__legal-links mono" aria-label="Legal and policies">
      <a href="/privacy-policy/">Privacy Policy</a>
      <a href="/cookie-policy/">Cookie Policy</a>
      <a href="/terms/">Terms of Service</a>
      <a href="/service-level-agreement/">SLA</a>
      <a href="/accessibility-statement/">Accessibility</a>
      <a href="/accreditations/">Accreditations</a>
      <a href="/system-status/">System Status</a>
    </nav>
    <p class="site-footer__legal mono">&copy; 2026 365 TECHIES LIMITED &middot; REGISTERED IN ENGLAND &amp; WALES 11073501 &middot; ALL SYSTEMS OPERATIONAL <span class="pulse-dot pulse-dot--green"></span></p>
  </footer>
'''

def _meta_desc(d, limit=158):
    """Trim the meta description to ~limit chars at a word boundary for clean SERP snippets;
    og:/twitter: descriptions keep the full text. Avoids cutting mid-word or mid-entity."""
    d = " ".join(d.split())
    if len(d) <= limit:
        return d
    cut = d[:limit]
    if " " in cut:
        cut = cut[:cut.rfind(" ")]
    # Drop ONLY a trailing partial HTML entity (e.g. a '&amp' cut mid-entity),
    # not a literal ampersand like 'IT & security' — entities have no spaces and end in ';'.
    amp = cut.rfind("&")
    if amp != -1:
        tail = cut[amp:]
        if ";" not in tail and " " not in tail and len(tail) <= 8:
            cut = cut[:amp]
    return cut.rstrip(" ,.;:&-—") + "&hellip;"

def page(slug, title, desc, og_title, schema_json, content):
    canon = f"{SITE}/{slug}/"
    og_type = "article" if '"BlogPosting"' in schema_json else "website"
    # Escape raw double quotes so descriptions that OPEN with a quoted phrase
    # (e.g. '"Cannot start Microsoft Outlook..."') can't terminate the content=""
    # attribute early — that was silently emptying the meta description.
    desc = desc.replace('"', "&quot;")
    title = title.replace('"', "&quot;")
    og_title = og_title.replace('"', "&quot;")
    meta_desc = _meta_desc(desc)
    return f'''<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <!-- Google tag (gtag.js) - Consent Mode v2: denied by default, granted on cookie-accept.
       The library itself loads lazily (first interaction, or idle ~4s) so its ~90KB never
       competes with LCP; calls below queue into dataLayer and replay when it arrives. -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('consent', 'default', {{ ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 }});
    try {{ if (localStorage.getItem('tt_consent') === 'accepted') gtag('consent', 'update', {{ ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' }}); }} catch (e) {{}}
    gtag('js', new Date());
    gtag('config', 'G-EBLTJ9WJXZ');
    (function () {{
      function loadGtagLib() {{
        if (window.__gtagLibLoaded) return; window.__gtagLibLoaded = true;
        var g = document.createElement('script'); g.async = true;
        g.src = 'https://www.googletagmanager.com/gtag/js?id=G-EBLTJ9WJXZ';
        document.head.appendChild(g);
      }}
      ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (evt) {{
        window.addEventListener(evt, loadGtagLib, {{ once: true, passive: true }});
      }});
      if ('requestIdleCallback' in window) requestIdleCallback(loadGtagLib, {{ timeout: 4000 }});
      else window.addEventListener('load', function () {{ setTimeout(loadGtagLib, 3000); }});
    }})();
  </script>
  <title>{title}</title>
  <meta name="description" content="{meta_desc}" />
  <link rel="canonical" href="{canon}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  <meta name="author" content="365 Techies Limited" />
  <meta name="geo.region" content="GB-BCP" />
  <meta name="geo.placename" content="Bournemouth, Dorset" />
  <meta name="geo.position" content="50.7192;-1.8808" />
  <meta name="ICBM" content="50.7192, -1.8808" />
  <meta name="theme-color" content="#070d22" />
  <meta name="color-scheme" content="dark" />
  <meta property="og:type" content="{og_type}" />
  <meta property="og:site_name" content="365 Techies" />
  <meta property="og:locale" content="en_GB" />
  <meta property="og:url" content="{canon}" />
  <meta property="og:title" content="{og_title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:image" content="{SITE}/og-image.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{og_title}" />
  <meta name="twitter:description" content="{desc}" />
  <meta name="twitter:image" content="{SITE}/og-image.jpg" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
  <link rel="preconnect" href="https://fonts.bunny.net" />
  <link rel="preconnect" href="https://fonts.bunny.net" crossorigin />
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <link rel="preload" href="/fonts/clash-display-600.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/fonts/clash-display-700.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" media="print" onload="this.media='all'" href="https://fonts.bunny.net/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" />
  <noscript>
    <link rel="stylesheet" href="https://fonts.bunny.net/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" />
  </noscript>
  <link rel="stylesheet" href="/css/styles.min.css?v={CSSV}" />
  <script type="application/ld+json">
{schema_json}
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
</head>
<body id="top">
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="grid-overlay" aria-hidden="true"></div>
  <div class="grain" aria-hidden="true"></div>
{HEADER}
  <main id="main">
{content}
  </main>
{FOOTER}
  <nav class="mobile-cta-bar" aria-label="Quick contact">
    <a href="tel:+441202775566"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>Call</a>
    <a href="/book-service/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/></svg>Book</a>
    <a href="#" data-open-chat><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5z"/></svg>Chat</a>
  </nav>
  <div class="a11y" id="a11y">
    <button type="button" class="a11y__toggle" id="a11y-toggle" aria-expanded="false" aria-controls="a11y-panel" aria-label="Accessibility tools" title="Accessibility tools">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="3.6" r="1.6"/><path d="M3.5 8h17M12 8v6m0 0-3.2 6.4M12 14l3.2 6.4"/></svg>
    </button>
    <div class="a11y__panel" id="a11y-panel" role="region" aria-label="Accessibility options" hidden>
      <p class="a11y__title mono">Accessibility</p>
      <div class="a11y__rowsize"><span>Text size</span><span class="a11y__btns"><button type="button" data-a11y="text-down" aria-label="Decrease text size">A&minus;</button><button type="button" data-a11y="text-up" aria-label="Increase text size">A+</button></span></div>
      <button type="button" class="a11y__opt" data-a11y="contrast" aria-pressed="false">High contrast</button>
      <button type="button" class="a11y__opt" data-a11y="readable" aria-pressed="false">Readable font</button>
      <button type="button" class="a11y__opt" data-a11y="reduce" aria-pressed="false">Reduce motion</button>
      <button type="button" class="a11y__opt" data-a11y="read" aria-pressed="false">Read this page aloud</button>
      <button type="button" class="a11y__reset" data-a11y="reset">Reset</button>
    </div>
  </div>
  <script type="module" src="/js/interior.min.js?v=18"></script>
  <script src="/js/a11y.min.js?v=5" defer></script>
  <script src="/js/forms.min.js?v=4" defer></script>
  <script src="/js/search.min.js?v=1" defer></script>
  <div class="cookie-banner" id="cookie-banner" role="dialog" aria-label="Cookie consent" aria-live="polite" hidden>
    <p>We use cookies to power our live chat and understand how the site is used. See our <a href="/cookie-policy/">cookie policy</a>.</p>
    <div class="cookie-banner__actions">
      <button type="button" class="button secondary" data-cookie="decline">Decline</button>
      <button type="button" class="button primary" data-cookie="accept">Accept</button>
    </div>
  </div>
  <!-- Consent-gated chat / analytics (HubSpot loads only after consent) -->
  <script>
  (function () {{
    var KEY = "tt_consent";
    function loadConsented() {{
      if (!document.getElementById("hs-script-loader")) {{
        var s = document.createElement("script");
        s.id = "hs-script-loader"; s.async = true; s.defer = true;
        s.src = "//js-{HUBSPOT_REGION}.hs-scripts.com/{HUBSPOT_ID}.js";
        document.body.appendChild(s);
      }}
      if (window.ANALYTICS_SRC && !window.__analyticsLoaded) {{
        window.__analyticsLoaded = true;
        var a = document.createElement("script"); a.async = true; a.src = window.ANALYTICS_SRC;
        document.head.appendChild(a);
      }}
    }}
    var c = null;
    try {{ c = localStorage.getItem(KEY); }} catch (e) {{}}
    if (c === "accepted") {{ loadConsented(); }}
    else if (c !== "declined") {{ var b = document.getElementById("cookie-banner"); if (b) b.hidden = false; }}
    document.addEventListener("click", function (e) {{
      var t = e.target.closest("[data-cookie]"); if (!t) return;
      var v = t.getAttribute("data-cookie") === "accept" ? "accepted" : "declined";
      try {{ localStorage.setItem(KEY, v); }} catch (e) {{}}
      var b = document.getElementById("cookie-banner"); if (b) b.hidden = true;
      if (v === "accepted") {{ if (window.gtag) gtag('consent', 'update', {{ ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' }}); loadConsented(); }}
    }});
  }})();
  </script>
</body>
</html>
'''

# ---- schema helpers ----
BUSINESS_NODE = {
    "@type": ["LocalBusiness", "ProfessionalService"], "@id": SITE + "/#business",
    "name": "365 Techies", "legalName": "365 Techies Limited", "url": SITE + "/",
    "telephone": "+441202775566", "email": "help@365techies.co.uk", "foundingDate": "1995",
    "image": SITE + "/og-image.jpg", "logo": SITE + "/logo.jpg", "priceRange": "££",
    "alternateName": "365 Techies Ltd",
    "slogan": "The IT support experts",
    "description": "Family-run, leading Managed Service Provider (MSP) established in 1995 — Dell hardware specialists, Microsoft partners and certified Microsoft Office Specialists. Fully managed monthly IT support, cybersecurity, backups and cloud, plus one-off computer repairs and refurbished Dell hardware, for homes and small businesses across Bournemouth, Poole and Dorset.",
    "currenciesAccepted": "GBP",
    "paymentAccepted": "Direct Debit (GoCardless), Bank Transfer, Credit Card, Debit Card",
    "identifier": {"@type": "PropertyValue", "name": "Company registration number", "value": "11073501"},
    "memberOf": {"@type": "Organization", "name": "Sustainable Dorset", "url": "https://www.sustainabledorset.org/"},
    "knowsAbout": ["IT support", "Computer repair", "Laptop repair", "Microsoft 365", "Cybersecurity", "Data backup", "Network security", "Wi-Fi", "Remote support", "Dell hardware", "Dell Latitude laptops", "Dell OptiPlex desktops", "Refurbished computers", "Malwarebytes Premium", "VPN", "Online safety", "Accessible IT support", "IT support for retired people", "IT support for disabled people", "Website design", "Web hosting", "Business email", "Managed service provider", "Managed IT services", "MSP", "New Forest IT support"],
    "address": {"@type": "PostalAddress", "addressLocality": "Bournemouth", "addressRegion": "Dorset", "addressCountry": "GB"},
    "geo": {"@type": "GeoCoordinates", "latitude": 50.7192, "longitude": -1.8808},
    "areaServed": [{"@type": "AdministrativeArea", "name": "Dorset"},
                   {"@type": "AdministrativeArea", "name": "Bournemouth, Christchurch and Poole"},
                   {"@type": "AdministrativeArea", "name": "New Forest"}],
    "openingHoursSpecification": {"@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "09:00", "closes": "17:00"},
    # No sitewide aggregateRating: star ratings live only where real Review nodes back them
    # (the /reviews/ page and the homepage), per Google's review-snippet guidelines — a self-serving
    # sitewide rating with no per-page reviews is structured-data spam.
    # Verified Google Business Profile (Place ID ChIJlTb8YRuic0gRCRczduB8OFI / CID 5924622613303465737)
    # links the site's business entity to the official Google listing for local-SEO entity confirmation.
    "hasMap": "https://www.google.com/maps/place/?q=place_id:ChIJlTb8YRuic0gRCRczduB8OFI",
    "sameAs": ["https://www.facebook.com/365computersuk",
               "https://www.google.com/maps/place/?q=place_id:ChIJlTb8YRuic0gRCRczduB8OFI",
               "https://find-and-update.company-information.service.gov.uk/company/11073501"],
}
WEBSITE_NODE = {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/",
                "name": "365 Techies", "inLanguage": "en-GB", "publisher": {"@id": SITE + "/#business"}}

def graph(nodes):
    ids = {n["@id"] for n in nodes if isinstance(n, dict) and n.get("@id")}
    head = [x for x in (WEBSITE_NODE, BUSINESS_NODE) if x["@id"] not in ids]
    return json.dumps({"@context": "https://schema.org", "@graph": head + list(nodes)}, indent=2, ensure_ascii=False)

def crumb(slug, name):
    items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"}]
    items.append({"@type": "ListItem", "position": 2, "name": name, "item": f"{SITE}/{slug}/"})
    return {"@type": "BreadcrumbList", "@id": f"{SITE}/{slug}/#breadcrumb", "itemListElement": items}

def crumb_sub(slug, parent_name, parent_slug, name):
    """3-level breadcrumb schema: Home > parent > this page (builds a silo)."""
    items = [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
      {"@type": "ListItem", "position": 2, "name": parent_name, "item": f"{SITE}/{parent_slug}/"},
      {"@type": "ListItem", "position": 3, "name": name, "item": f"{SITE}/{slug}/"},
    ]
    return {"@type": "BreadcrumbList", "@id": f"{SITE}/{slug}/#breadcrumb", "itemListElement": items}

def webpage(slug, title, desc, wtype="WebPage"):
    return {"@type": wtype, "@id": f"{SITE}/{slug}/#webpage", "url": f"{SITE}/{slug}/",
            "name": title, "description": desc, "inLanguage": "en-GB",
            "isPartOf": {"@id": SITE + "/#website"}, "about": {"@id": SITE + "/#business"},
            "breadcrumb": {"@id": f"{SITE}/{slug}/#breadcrumb"},
            "primaryImageOfPage": {"@type": "ImageObject", "url": SITE + "/og-image.jpg"},
            "datePublished": "2026-06-12", "dateModified": TODAY}

def service(slug, name, desc, stype=None):
    n = {"@type": "Service", "@id": f"{SITE}/{slug}/#service", "name": name, "description": desc,
         "serviceType": stype or name, "areaServed": {"@type": "AdministrativeArea", "name": "Dorset, UK"},
         "provider": {"@id": SITE + "/#business"}, "url": f"{SITE}/{slug}/"}
    return n

def faqpage(slug, faqs):
    return {"@type": "FAQPage", "@id": f"{SITE}/{slug}/#faq",
            "mainEntity": [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]}

# ---- content helpers ----
def faq_html(faqs):
    items = "\n".join(
        f'''        <details class="faq" data-reveal>
          <summary>{q}<span class="faq__icon" aria-hidden="true"></span></summary>
          <div class="faq__ans"><p>{a}</p></div>
        </details>''' for q, a in faqs)
    return f'''    <section class="faq-section section--alt" id="faq" aria-label="Frequently asked questions">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>// GOOD QUESTIONS</p>
        <h2 class="section-title section-title--center" data-title>Frequently asked<span class="title-underline title-underline--center"></span></h2>
        <div class="faq-wrap">
{items}
        </div>
      </div>
    </section>'''

def cta(title, text, primary=("View Monthly Plans", "/monthly-it-support/"), secondary=("Call 01202 775566", "tel:+441202775566")):
    return f'''    <section class="cta-band" aria-label="Get started">
      <div class="cta-band__inner">
        <h2 data-title>{title}<span class="title-underline title-underline--center"></span></h2>
        <p class="lede lede--center" data-reveal>{text}</p>
        <div class="hero-buttons hero-buttons--center" data-reveal>
          <a href="{primary[1]}" class="button primary button--lg">{primary[0]}</a>
          <a href="{secondary[1]}" class="button secondary button--lg">{secondary[0]}</a>
        </div>
        <p class="cta__contact mono" data-reveal>01202 775566 &middot; help@365techies.co.uk &middot; MON&ndash;FRI 9AM&ndash;5PM</p>
      </div>
    </section>'''

def hero_trust(lede):
    """Append a '4.9 on Google' trust hook to a hero subtext unless one is already present.
    Used by landing-page heroes (service/town/customer pages) — NOT info/legal/tool pages."""
    return lede if "4.9" in lede else lede.rstrip() + " Rated 4.9 on Google."

def hero(crumbs_html, eyebrow, h1_html, lede, cta1=("View Monthly Plans", "/monthly-it-support/"),
         cta2=("Get Support Today", "/contact/"), chips=None):
    chips_html = ""
    if chips:
        lis = "".join(f"<li>&#9679; {c}</li>" for c in chips)
        chips_html = f'\n        <ul class="page-hero__chips mono">{lis}</ul>'
    return f'''    <section class="page-hero" aria-label="Introduction">
      <div class="page-hero__inner">
        <nav class="breadcrumb" aria-label="Breadcrumb">{crumbs_html}</nav>
        <p class="eyebrow mono">{eyebrow}</p>
        <h1>{h1_html}</h1>
        <p class="lede">{lede}</p>
        <div class="page-hero__cta">
          <a href="{cta1[1]}" class="button primary button--lg">{cta1[0]}</a>
          <a href="{cta2[1]}" class="button secondary button--lg">{cta2[0]}</a>
        </div>{chips_html}
      </div>
    </section>'''

def bc(name):
    return f'<a href="/">Home</a> <span>/</span> <span aria-current="page">{name}</span>'

def bc_sub(parent_name, parent_href, name):
    return f'<a href="/">Home</a> <span>/</span> <a href="{parent_href}">{parent_name}</a> <span>/</span> <span aria-current="page">{name}</span>'

def tiles(items):
    cells = "\n".join(
        f'''        <div class="tile">{ico(i)}<h3>{t}</h3><p>{d}</p></div>''' for i, t, d in items)
    return cells

def grid_cards(items):
    return "\n".join(f"        <li><h3>{t}</h3><p>{d}</p></li>" for t, d in items)

def checklist(items):
    return "\n".join(f"          <li>{i}</li>" for i in items)

def steps(items):
    out = []
    for n, (t, d) in enumerate(items, 1):
        out.append(f'''        <li data-reveal>
          <p class="how__num mono">{n:02d}</p>
          <h3>{t}</h3>
          <p>{d}</p>
        </li>''')
    return "\n".join(out)

def reviews_block(revs):
    figs = "\n".join(f'''        <figure class="review" data-reveal>
          <p class="review__stars mono" aria-label="Rated 5 out of 5">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
          <blockquote>&ldquo;{q}&rdquo;</blockquote>
          <figcaption data-initial="{who.strip()[0]}"><strong>{who}</strong><span class="mono">GOOGLE REVIEW</span></figcaption>
        </figure>''' for q, who in revs)
    return f'''    <section class="reviews" aria-label="Customer reviews">
      <p class="eyebrow eyebrow--center mono" data-reveal>// GOOGLE REVIEWS</p>
      <h2 class="section-title section-title--center" data-title>Rated 4.9 on Google<span class="title-underline title-underline--center"></span></h2>
      <p class="reviews__badge mono" data-reveal><span aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span>&ensp;4.9 FROM 51 GOOGLE REVIEWS</p>
      <div class="reviews__grid">
{figs}
      </div>
      <div class="reviews__links" data-reveal>
        <a class="text-link" href="https://www.google.com/maps?cid=5924622613303465737" target="_blank" rel="noopener">Read all reviews on Google <span aria-hidden="true">&#8594;</span></a>
        <a class="text-link" href="https://search.google.com/local/writereview?placeid=ChIJlTb8YRuic0gRCRczduB8OFI" target="_blank" rel="noopener">Leave us a review <span aria-hidden="true">&#8594;</span></a>
      </div>
    </section>'''

# ---- Animated "live view" network map (signature motif, reusable on any page) ----
_NETMAP_N = 0
_NM_ICONS = {
 "monitor": '<rect x="-11" y="-8" width="22" height="14" rx="1.5"/><path d="M-4 10 H4 M0 6 V10"/>',
 "laptop": '<rect x="-10" y="-7" width="20" height="12" rx="1.5"/><path d="M-13 8 H13"/>',
 "phone": '<rect x="-6" y="-10" width="12" height="20" rx="2.5"/><path d="M-2 7 H2"/>',
 "printer": '<rect x="-9" y="-2" width="18" height="9" rx="1.5"/><path d="M-5 -2 V-8 H5 V-2"/><path d="M-5 7 H5 V11 H-5 Z"/>',
 "tablet": '<rect x="-8" y="-10" width="16" height="20" rx="2"/><path d="M-2 7 H2"/>',
 "server": '<rect x="-10" y="-9" width="20" height="8" rx="1.5"/><rect x="-10" y="1" width="20" height="8" rx="1.5"/><circle cx="-5" cy="-5" r="1" fill="#86b6e8" stroke="none"/><circle cx="-5" cy="5" r="1" fill="#86b6e8" stroke="none"/>',
 "pc": '<rect x="-6" y="-10" width="12" height="20" rx="1.5"/><circle cx="0" cy="-6" r="1.2" fill="#86b6e8" stroke="none"/><path d="M-3 5 H3"/>',
}
_NM_VARIANTS = {"home": ["monitor","laptop","phone","printer","tablet"],
                "business": ["server","pc","monitor","laptop","printer"]}
_NM_POS = [(200,52),(86,120),(314,120),(124,230),(276,230)]
_NM_LINKS = ('<path class="nm-link" d="M200 148 L200 60"/><path class="nm-link" d="M200 148 L86 120"/>'
             '<path class="nm-link" d="M200 148 L314 120"/><path class="nm-link" d="M200 148 L124 230"/>'
             '<path class="nm-link" d="M200 148 L276 230"/>')

def net_map(variant="home", label="LIVE VIEW &mdash; NETWORK"):
    """Self-contained framed animated network map (unique gradient ids so several can share a page)."""
    global _NETMAP_N
    _NETMAP_N += 1
    lg, hg = f"nmLink{_NETMAP_N}", f"nmHub{_NETMAP_N}"
    devs = _NM_VARIANTS.get(variant, _NM_VARIANTS["home"])
    delays = ["0s", ".5s", "1s", "1.5s", "2s"]
    nodes = "".join(
        f'<g class="nm-node" style="--d:{d}" transform="translate({x},{y})">'
        f'<circle r="19" fill="#0b1d3a" stroke="rgba(125,170,220,.35)" stroke-width="1.2"/>{_NM_ICONS[dev]}'
        f'<circle class="nm-dot" cx="13" cy="-13" r="3" fill="#00ce1b" stroke="none"/></g>'
        for (x, y), dev, d in zip(_NM_POS, devs, delays))
    return f'''        <div class="scene-frame" data-reveal>
          <svg class="net-map" viewBox="0 0 400 310" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="{lg}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d97e3"/><stop offset="1" stop-color="#00ce1b"/></linearGradient>
              <radialGradient id="{hg}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#123a66"/><stop offset="1" stop-color="#0a1f3d"/></radialGradient>
            </defs>
            <g fill="none" stroke="url(#{lg})" stroke-width="1.6" stroke-linecap="round">{_NM_LINKS}</g>
            <circle class="nm-scan" cx="200" cy="148" r="22"/><circle class="nm-scan nm-scan--b" cx="200" cy="148" r="22"/>
            <g fill="none" stroke="#86b6e8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{nodes}</g>
            <g class="nm-hub" transform="translate(200,148)"><circle r="28" fill="url(#{hg})" stroke="#1d97e3" stroke-width="1.5"/><path d="M0 -14 L12 -9 V1 C12 9 6 13 0 16 C-6 13 -12 9 -12 1 V-9 Z" fill="rgba(0,206,27,.16)" stroke="#00ce1b" stroke-width="1.6"/><path d="M-5 0 L-1.5 4 L5.5 -4.5" fill="none" stroke="#00ce1b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
          </svg>
          <span class="scene-frame__corner tl"></span><span class="scene-frame__corner tr"></span>
          <span class="scene-frame__corner bl"></span><span class="scene-frame__corner br"></span>
          <p class="scene-frame__label mono"><span class="rec-dot"></span> {label}</p>
        </div>'''

def net_map_section(eyebrow, heading, blurb_html, variant="home", label="LIVE VIEW &mdash; NETWORK", alt=False):
    """A split-2 band: text on the left, the animated network map on the right. Non-numbered eyebrow."""
    cls = "section section--alt" if alt else "section"
    return f'''    <section class="{cls}" aria-label="{heading}">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">{eyebrow}</p>
          <h2 class="section-title" data-title>{heading}<span class="title-underline"></span></h2>
{blurb_html}
        </div>
{net_map(variant, label)}
      </div>
    </section>'''

# ---- Heritage gallery (real certification plaques; self-activates when /images/ files exist) ----
HERITAGE_IMAGES = [
 ("heritage-05.jpg", "The door of our Microsoft Education Resource Centre in Winton, Bournemouth", "Our MERC door &middot; Winton"),
 ("heritage-07.jpg", "Inside our Microsoft training centre &mdash; rows of computers and the wall of certifications", "Inside the training centre"),
 ("heritage-02.jpg", "Microsoft Office User Specialist Training &amp; Certification plaque &mdash; MEC Centre, 2002 to 2003", "MEC Centre &middot; 2002&ndash;03"),
 ("heritage-03.jpg", "IC3 Internet and Computing Core Certification Authorised Testing Centre plaque, 2003", "IC&sup3; Testing Centre &middot; 2003"),
 ("heritage-01.jpg", "Microsoft Office Specialist Authorised Testing Centre plaque, 2004", "Office Specialist Centre &middot; 2004"),
 ("heritage-04.jpg", "Certiport Approved Testing Centre plaque, 2006", "Certiport Centre &middot; 2006"),
 ("heritage-storefront.jpg", "The shopfront of our computer sales and service centre in Moordown, Winton &mdash; Dell laptops and computers for home and business", "Our shopfront &middot; Moordown"),
 ("heritage-moordown.jpg", "Inside our computer sales and service centre in Moordown, Winton &mdash; the wall of Dell laptops and the bench of PCs", "Inside the shop &middot; Moordown"),
 ("heritage-stock.jpg", "Refurbished Dell laptops and PCs lined up, set up and tested in our Moordown centre", "Set up &amp; tested &middot; Moordown"),
 ("heritage-kinson.jpg", "The Kinson Community Centre in Bournemouth, our base since 2017, where we provide community IT support and group training classes", "Kinson Community Centre &middot; 2017&ndash;today"),
]
def heritage_gallery():
    """Returns the heritage plaque gallery only for images that actually exist in /images/ — so the
    build never emits broken <img>s. Drop the files in (see images/README-heritage.txt) and rebuild."""
    items = [x for x in HERITAGE_IMAGES if os.path.exists("images/" + x[0])]
    if not items:
        return ""
    figs = "\n".join(
        f'''          <figure class="heritage-card" data-reveal>
            <img src="/images/{f}" alt="{alt}" loading="lazy" decoding="async" />
            <figcaption class="mono">{cap}</figcaption>
          </figure>''' for (f, alt, cap) in items)
    return f'''    <section class="section section--alt" aria-label="Our heritage">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// OUR HERITAGE</p>
          <h2 class="section-title section-title--center" data-title>Our Dorset computing heritage<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>From the Dorset Microsoft Education Resource Centre (1998&ndash;2008) to our Moordown computer shop (2008&ndash;2017) and our base at the Kinson Community Centre (2017&ndash;today), we&rsquo;ve been a familiar local face in computing for decades. These are the real plaques &mdash; and the places.</p>
        </div>
        <div class="heritage-grid" data-stagger>
{figs}
        </div>
      </div>
    </section>'''

# ---- Service-promise touches (the human extras, reused across pages) ----
# Keep wording consistent here so the reassurance never drifts or over-claims.
PROMISE_CALL = ("We call before we connect",
  "Before any remote session or full computer service, we phone you first to check you&rsquo;re ready &mdash; we never connect out of the blue.")
PROMISE_ETA = ("We call when we&rsquo;re on our way",
  "For home and business visits we phone ahead to say we&rsquo;re on our way and give you an estimated arrival time &mdash; so you know exactly when to expect us.")
PROMISE_SMS = ("Backup reminders by text",
  "If you&rsquo;d like, we can send you a scheduled text message when your backup is due, reminding you to plug in your backup drive.")
PROMISE_PEOPLE = ("The same friendly faces",
  "Because we&rsquo;re a family team, you deal with people who get to know you &mdash; we remember how you like your computer set up, especially as we service it every six weeks.")

def promise_strip(items=None, alt=False, title="Looked after at every step"):
    its = items if items is not None else [PROMISE_CALL, PROMISE_ETA, PROMISE_SMS, PROMISE_PEOPLE]
    cls = "section section--alt" if alt else "section"
    return f'''    <section class="{cls}" aria-label="How we look after you">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// HOW WE LOOK AFTER YOU</p>
          <h2 class="section-title section-title--center" data-title>{title}<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards(its)}
        </ul>
      </div>
    </section>'''

def uk_remote_band(alt=False):
    """Slim, reusable trust band: local in Dorset, remote across the whole UK."""
    cls = "section section--alt" if alt else "section"
    return f'''    <section class="{cls}" aria-label="UK-wide remote support">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// WHEREVER YOU ARE IN THE UK</p>
          <h2 class="section-title section-title--center" data-title>Local in Dorset, remote across the whole UK<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Most problems are fixed securely online in minutes, so wherever you are in the UK you get the same friendly, expert help &mdash; usually within minutes. For hands-on work we visit across Bournemouth, Poole and Dorset. <a href="/remote-it-support/">See how remote support works &#8594;</a></p>
        </div>
      </div>
    </section>'''

# Shared free website-checker tool (embedded on /website-checker/ and /web-design-hosting/)
WCHECK_TOOL = r'''    <section class="section" aria-label="Free website checker" id="wctool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE INSTANT CHECK</p>
          <h2 class="section-title section-title--center" data-title>Check any website in seconds<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Enter a web address and we&rsquo;ll run a full health check &mdash; speed, SEO, accessibility, security and mobile-friendliness &mdash; powered by Google&rsquo;s own Lighthouse engine. Every check also shows how the site compares to <strong>our own website, measured live with the same tool</strong> &mdash; we lead by example, not by claims.</p>
        </div>
        <div id="wcheck" data-reveal>
          <form class="wc-form" id="wc-form" novalidate>
            <input type="url" id="wc-url" inputmode="url" autocomplete="url" spellcheck="false" placeholder="yourwebsite.co.uk" aria-label="Website address to check" required>
            <div class="wc-strat" role="tablist" aria-label="Device to test">
              <button type="button" data-strat="mobile" class="is-active" role="tab">Mobile</button>
              <button type="button" data-strat="desktop" role="tab">Desktop</button>
            </div>
            <button type="submit" class="button primary wc-go">Check website</button>
          </form>
          <p class="wc-hint">Free, no sign-up &mdash; check any public website, yours or a competitor&rsquo;s.</p>
          <div class="wc-loading" id="wc-loading" hidden>
            <div class="wc-spinner" aria-hidden="true"></div>
            <p id="wc-loadmsg">Fetching the page&hellip;</p>
            <p class="wc-note">A full check takes around 15&ndash;30 seconds.</p>
          </div>
          <div class="wc-error" id="wc-error" hidden></div>
          <div class="wc-results" id="wc-results" hidden>
            <p class="wc-tested">Results for <a id="wc-tested-url" href="#" target="_blank" rel="noopener nofollow"></a> <span id="wc-tested-strat" class="wc-badge"></span></p>
            <div class="wc-gauges" id="wc-gauges"></div>
            <div id="wc-compare"></div>
            <div id="wc-cwv"></div>
            <div id="wc-checks"></div>
            <div id="wc-issues"></div>
            <div class="wc-fix">
              <h3>Want these issues fixed?</h3>
              <p id="wc-fix-msg"></p>
              <div class="wc-fix-cta">
                <a class="button primary" href="/contact/">Get my free fix-it plan &#8594;</a>
                <a class="button wc-ghost" href="/web-design-hosting/">Our web design &amp; hosting</a>
              </div>
            </div>
          </div>
        </div>
        <p class="wc-powered">Powered by Google Lighthouse / PageSpeed Insights. Results are a point-in-time snapshot and can vary between runs.</p>
      </div>
      <style>
      #wcheck{max-width:920px;margin:0 auto}
      #wcheck .wc-form{display:flex;gap:.6rem;flex-wrap:wrap;align-items:stretch}
      #wcheck #wc-url{flex:1 1 240px;min-width:0;padding:.95rem 1.1rem;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:inherit;font:inherit}
      #wcheck #wc-url:focus{outline:none;border-color:var(--cyan,#37c2c2)}
      #wcheck .wc-strat{display:flex;gap:.25rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:.25rem}
      #wcheck .wc-strat button{font:inherit;font-size:.85rem;font-weight:600;padding:.55rem .9rem;border-radius:9px;border:0;background:transparent;color:inherit;cursor:pointer;transition:.15s}
      #wcheck .wc-strat button.is-active{background:var(--cyan,#37c2c2);color:#04161a}
      #wcheck .wc-go{white-space:nowrap}
      #wcheck .wc-hint{font-size:.78rem;color:var(--muted,#9aa6c2);margin:.6rem 0 0}
      #wcheck .wc-loading{text-align:center;padding:2.5rem 1rem}
      #wcheck .wc-spinner{width:46px;height:46px;border-radius:50%;border:3px solid rgba(255,255,255,.14);border-top-color:var(--cyan,#37c2c2);margin:0 auto 1rem;animation:wc-spin 1s linear infinite}
      @keyframes wc-spin{to{transform:rotate(360deg)}}
      #wcheck .wc-loading p{margin:.2rem 0}
      #wcheck .wc-loading .wc-note{font-size:.78rem;color:var(--muted,#9aa6c2)}
      #wcheck .wc-error{margin-top:1.3rem;padding:1rem 1.2rem;border-radius:12px;border:1px solid rgba(231,76,60,.45);background:rgba(231,76,60,.1);font-size:.92rem;line-height:1.55}
      #wcheck .wc-error a{color:var(--cyan,#37c2c2)}
      #wcheck .wc-results{margin-top:1.8rem}
      #wcheck .wc-tested{font-size:.9rem;color:var(--muted,#9aa6c2);text-align:center;margin:0 0 1.4rem;word-break:break-all}
      #wcheck .wc-tested a{color:var(--cyan,#37c2c2)}
      #wcheck .wc-badge{display:inline-block;margin-left:.4rem;font-size:.72rem;padding:.12rem .55rem;border:1px solid rgba(255,255,255,.18);border-radius:99px;white-space:nowrap}
      #wcheck .wc-gauges{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
      #wcheck .wc-gauge{text-align:center}
      #wcheck .wc-g-ring{position:relative;width:118px;max-width:100%;margin:0 auto;aspect-ratio:1}
      #wcheck .wc-g-ring svg{width:100%;display:block;transform:rotate(-90deg)}
      #wcheck .wc-g-track{fill:none;stroke:rgba(255,255,255,.1);stroke-width:9}
      #wcheck .wc-g-val{fill:none;stroke-width:9;stroke-linecap:round;transition:stroke-dashoffset 1.1s cubic-bezier(.3,.8,.3,1)}
      #wcheck .wc-g-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:800;font-variant-numeric:tabular-nums}
      #wcheck .wc-g-lab{margin:.5rem 0 0;font-size:.82rem;color:var(--muted,#9aa6c2)}
      #wcheck .wc-sub{font-size:.95rem;font-weight:700;margin:2rem 0 .9rem;text-align:center}
      #wcheck .wc-cwv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.7rem}
      #wcheck .wc-metric{padding:.9rem 1rem;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);text-align:center;border-left-width:4px}
      #wcheck .wc-metric-v{margin:0;font-size:1.35rem;font-weight:800;font-variant-numeric:tabular-nums}
      #wcheck .wc-metric-l{margin:.25rem 0 0;font-size:.74rem;color:var(--muted,#9aa6c2);line-height:1.35}
      #wcheck .wc-chk-grid{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center}
      #wcheck .wc-chk{font-size:.82rem;padding:.4rem .75rem;border-radius:99px;border:1px solid rgba(255,255,255,.14)}
      #wcheck .wc-chk.is-ok{color:#7ee2a8;border-color:rgba(46,204,113,.4);background:rgba(46,204,113,.08)}
      #wcheck .wc-chk.is-bad{color:#f5a39b;border-color:rgba(231,76,60,.4);background:rgba(231,76,60,.08)}
      #wcheck .wc-issue-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.6rem}
      #wcheck .wc-issue-list li{padding:.8rem 1rem;border-radius:10px;background:rgba(255,255,255,.03);border-left:4px solid var(--muted,#9aa6c2)}
      #wcheck .wc-issue-list li b{display:block;font-size:.92rem;margin-bottom:.15rem}
      #wcheck .wc-issue-list li span{font-size:.82rem;color:var(--muted,#9aa6c2);line-height:1.5}
      #wcheck .wc-good .wc-g-val,#wcheck .wc-good.wc-metric{stroke:#2ecc71;border-left-color:#2ecc71}
      #wcheck .wc-good .wc-g-num{color:#2ecc71}
      #wcheck .wc-avg .wc-g-val,#wcheck .wc-avg.wc-metric{stroke:#f1c40f;border-left-color:#f1c40f}
      #wcheck .wc-avg .wc-g-num{color:#f1c40f}
      #wcheck .wc-poor .wc-g-val,#wcheck .wc-poor.wc-metric{stroke:#e74c3c;border-left-color:#e74c3c}
      #wcheck .wc-poor .wc-g-num{color:#e74c3c}
      #wcheck li.wc-poor{border-left-color:#e74c3c}
      #wcheck li.wc-avg{border-left-color:#f1c40f}
      #wcheck .wc-fix{margin-top:2.2rem;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #wcheck .wc-fix h3{margin:0 0 .5rem;font-size:1.25rem}
      #wcheck .wc-fix p{margin:0 auto 1.1rem;max-width:46ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #wcheck .wc-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      #wcheck .wc-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      #wcheck .wc-powered{text-align:center;font-size:.72rem;color:var(--muted,#9aa6c2);margin:1.4rem 0 0;opacity:.8}
      @media(max-width:560px){#wcheck .wc-gauges{grid-template-columns:repeat(2,1fr)}#wcheck .wc-go{flex:1 1 100%}}
      #wcheck .wc-cmp{margin-top:1.6rem;padding:1.2rem 1.3rem;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.03)}
      #wcheck .wc-cmp h3{margin:0 0 .35rem;font-size:1.05rem}
      #wcheck .wc-cmp-sub{font-size:.8rem;color:var(--muted,#9aa6c2);margin:0 0 1rem}
      #wcheck .wc-cmp-row{display:grid;grid-template-columns:130px 1fr;gap:.35rem .8rem;align-items:center;margin-bottom:.75rem}
      #wcheck .wc-cmp-lab{font-size:.8rem;font-weight:600}
      #wcheck .wc-cmp-bars{display:flex;flex-direction:column;gap:.3rem}
      #wcheck .wc-cmp-bar{display:flex;align-items:center;gap:.5rem;font-size:.72rem}
      #wcheck .wc-cmp-bar .wc-cmp-who{flex:0 0 84px;color:var(--muted,#9aa6c2)}
      #wcheck .wc-cmp-bar .wc-cmp-track{flex:1;height:9px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden}
      #wcheck .wc-cmp-bar .wc-cmp-fill{height:100%;border-radius:99px;width:0;transition:width .9s ease}
      #wcheck .wc-cmp-bar.wc-good .wc-cmp-fill{background:#39d353}
      #wcheck .wc-cmp-bar.wc-avg .wc-cmp-fill{background:#e0b341}
      #wcheck .wc-cmp-bar.wc-poor .wc-cmp-fill{background:#e06a4a}
      #wcheck .wc-cmp-bar .wc-cmp-num{flex:0 0 28px;text-align:right;font-weight:700}
      #wcheck .wc-cmp-note{font-size:.74rem;color:var(--muted,#9aa6c2);margin:.9rem 0 0}
      #wcheck .wc-cmp-loading{font-size:.8rem;color:var(--muted,#9aa6c2);margin-top:1.2rem;text-align:center}
      @media(max-width:560px){#wcheck .wc-cmp-row{grid-template-columns:1fr}}
      </style>
      <script>
      (function(){
        var root=document.getElementById('wcheck'); if(!root) return;
        var PSI_ENDPOINT=""; /* optional: your Cloudflare Worker proxy URL (recommended - keeps the API key private). If set, used instead of calling Google directly. */
        var PSI_KEY="AIzaSyAI4l9ezEtaKw--iiUtI4t24HKibpm1YLg";      /* PageSpeed Insights API key, referrer-locked to 365techies.co.uk in Google Cloud (safe to be public). Used when PSI_ENDPOINT is empty. */
        var strat='mobile';
        var form=root.querySelector('#wc-form'), urlInput=root.querySelector('#wc-url');
        var elLoad=root.querySelector('#wc-loading'), elMsg=root.querySelector('#wc-loadmsg');
        var elErr=root.querySelector('#wc-error'), elRes=root.querySelector('#wc-results');
        var CTA='<a href="/contact/">get in touch</a>';
        var loadTimer=null;
        root.querySelectorAll('.wc-strat button').forEach(function(b){
          b.onclick=function(){ strat=b.getAttribute('data-strat');
            root.querySelectorAll('.wc-strat button').forEach(function(x){x.classList.toggle('is-active',x===b);x.setAttribute('aria-selected',x===b);}); };
        });
        function normURL(v){ v=(v||'').trim(); if(!v) return ''; if(!/^https?:\/\//i.test(v)) v='https://'+v; return v; }
        var LOAD=['Fetching the page…','Measuring load speed…','Checking SEO & meta tags…','Testing mobile-friendliness…','Reviewing accessibility…','Checking security & best practices…','Crunching the results…'];
        function startLoad(){ var i=0; elMsg.textContent=LOAD[0]; loadTimer=setInterval(function(){ i=(i+1)%LOAD.length; elMsg.textContent=LOAD[i]; },3200); }
        function stopLoad(){ if(loadTimer){clearInterval(loadTimer);loadTimer=null;} }
        function api(u){
          if(PSI_ENDPOINT) return PSI_ENDPOINT+(PSI_ENDPOINT.indexOf('?')<0?'?':'&')+'url='+encodeURIComponent(u)+'&strategy='+strat;
          var b='https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url='+encodeURIComponent(u)+'&strategy='+strat+'&category=performance&category=seo&category=accessibility&category=best-practices';
          if(PSI_KEY) b+='&key='+PSI_KEY; return b;
        }
        function esc(s){var d=document.createElement('div');d.textContent=(s==null?'':s);return d.innerHTML;}
        function band(s){ return s>=90?'wc-good':(s>=50?'wc-avg':'wc-poor'); }
        function listWords(a){ if(a.length===1)return a[0]; return a.slice(0,-1).join(', ')+' and '+a[a.length-1]; }
        form.addEventListener('submit',function(e){
          e.preventDefault();
          var u=normURL(urlInput.value); if(!u){ urlInput.focus(); return; }
          elRes.hidden=true; elErr.hidden=true; elLoad.hidden=false; startLoad();
          var btn=form.querySelector('.wc-go'); btn.disabled=true;
          fetch(api(u)).then(function(r){ if(r.status===429) throw new Error('busy'); if(!r.ok) throw new Error('http'+r.status); return r.json(); })
          .then(function(d){ if(d.error) throw new Error(d.error.message||'api'); render(d,u); })
          .catch(function(err){ showErr(err); })
          .then(function(){ stopLoad(); elLoad.hidden=true; btn.disabled=false; });
        });
        function showErr(err){
          var m=String((err&&err.message)||err), msg;
          if(m==='busy') msg='Our checker is very busy right now (Google’s free testing limit). Please try again in a minute &mdash; or '+CTA+' and we’ll run a full audit for you.';
          else if(/lighthouse|unable|fetch|FAILED|DNS|http4|http5|invalid/i.test(m)) msg='We couldn’t analyse that address. Check it’s a full, public website (for example https://example.co.uk) and try again.';
          else msg='Something went wrong analysing that site. Please check the address and try again — or '+CTA+'.';
          elErr.innerHTML=msg; elErr.hidden=false;
        }
        function gauge(score,label){
          var c=339.292, off=c*(1-score/100);
          return '<div class="wc-gauge '+band(score)+'"><div class="wc-g-ring"><svg viewBox="0 0 120 120">'+
            '<circle class="wc-g-track" cx="60" cy="60" r="54"></circle>'+
            '<circle class="wc-g-val" cx="60" cy="60" r="54" stroke-dasharray="'+c+'" stroke-dashoffset="'+c+'" data-off="'+off+'"></circle>'+
            '</svg><span class="wc-g-num">'+score+'</span></div><p class="wc-g-lab">'+label+'</p></div>';
        }
        var CHECKS=[['is-on-https','Secure (HTTPS)'],['viewport','Mobile viewport set'],['document-title','Has a page title'],['meta-description','Has a meta description'],['image-alt','Images have alt text'],['is-crawlable','Search engines can index it'],['font-size','Legible font sizes'],['tap-targets','Tap targets sized for touch'],['errors-in-console','No console errors']];
        var CHECK_KEYS=CHECKS.map(function(c){return c[0];});
        function cwv(d,lh){
          var out=[], le=d.loadingExperience&&d.loadingExperience.metrics;
          function f(k,l,fmt){ if(le&&le[k]) return {l:l,v:fmt(le[k].percentile),c:le[k].category}; return null; }
          if(le){ [f('LARGEST_CONTENTFUL_PAINT_MS','Largest Contentful Paint',function(p){return (p/1000).toFixed(1)+' s';}),
                   f('INTERACTION_TO_NEXT_PAINT','Interaction to Next Paint',function(p){return Math.round(p)+' ms';}),
                   f('CUMULATIVE_LAYOUT_SHIFT_SCORE','Cumulative Layout Shift',function(p){return (p/100).toFixed(2);})
                 ].forEach(function(x){if(x)out.push(x);}); }
          if(!out.length&&lh){ function lab(id,l){var a=lh.audits[id]; if(a&&a.displayValue!=null&&a.displayValue!=='') return {l:l,v:a.displayValue,c:(a.score>=0.9?'FAST':(a.score>=0.5?'AVERAGE':'SLOW'))}; return null;}
            [lab('largest-contentful-paint','Largest Contentful Paint'),lab('total-blocking-time','Total Blocking Time'),lab('cumulative-layout-shift','Cumulative Layout Shift'),lab('speed-index','Speed Index')].forEach(function(x){if(x)out.push(x);}); }
          return out;
        }
        function metricBand(c){ return c==='FAST'?'wc-good':(c==='AVERAGE'?'wc-avg':'wc-poor'); }
        /* ---- live comparison vs our own site (lead by example, not claims) ---- */
        var SELF_URL='https://365techies.co.uk/';
        function scoresFrom(d){
          var lh=d&&d.lighthouseResult; if(!lh||!lh.categories) return null;
          function sc(k){ var c=lh.categories[k]; return c&&c.score!=null?Math.round(c.score*100):null; }
          return {performance:sc('performance'),seo:sc('seo'),accessibility:sc('accessibility'),bp:sc('best-practices')};
        }
        function selfCache(read,val){
          var k='tt_wc_self_'+strat;
          try{
            if(read){ var raw=localStorage.getItem(k); if(!raw) return null; var o=JSON.parse(raw);
              if(!o||!o.t||(Date.now()-o.t)>86400000) return null; return o.S; }
            localStorage.setItem(k, JSON.stringify({t:Date.now(),S:val}));
          }catch(e){ return null; }
        }
        function fetchSelf(){
          var cached=selfCache(true); if(cached) return Promise.resolve(cached);
          return fetch(api(SELF_URL)).then(function(r){ if(r.status===429) throw new Error('cmp429'); if(!r.ok) throw new Error('cmp'); return r.json(); })
            .then(function(d){ var S=scoresFrom(d); if(!S) throw new Error('cmp'); selfCache(false,S); return S; });
        }
        function cmpBar(who,score){
          if(score==null) return '';
          return '<div class="wc-cmp-bar '+band(score)+'"><span class="wc-cmp-who">'+who+'</span><span class="wc-cmp-track"><span class="wc-cmp-fill" data-w="'+score+'"></span></span><span class="wc-cmp-num">'+score+'</span></div>';
        }
        function renderCompare(mine,ours,isSelf){
          var box=root.querySelector('#wc-compare'); if(!box) return;
          if(isSelf){
            box.innerHTML='<div class="wc-cmp"><h3>You&rsquo;re checking our website &mdash; good instinct.</h3><p class="wc-cmp-sub">These scores above <em>are</em> the benchmark this tool compares every site against. We build websites the same way we built this one &mdash; <a href="/web-design-hosting/">see our web design &amp; hosting</a>.</p></div>';
            return;
          }
          var rows='', any=false;
          [['performance','Performance'],['seo','SEO'],['accessibility','Accessibility'],['bp','Best Practices']].forEach(function(p){
            var m=mine[p[0]], o=ours[p[0]];
            if(m==null&&o==null) return; any=true;
            rows+='<div class="wc-cmp-row"><span class="wc-cmp-lab">'+p[1]+'</span><div class="wc-cmp-bars">'+cmpBar('This site',m)+cmpBar('365techies.co.uk',o)+'</div></div>';
          });
          if(!any){ box.innerHTML=''; return; }
          box.innerHTML='<div class="wc-cmp"><h3>How does it compare to ours?</h3>'+
            '<p class="wc-cmp-sub">365techies.co.uk scores below were measured <strong>live with this same tool</strong> ('+(strat==='mobile'?'mobile':'desktop')+') &mdash; we&rsquo;d rather show you than make claims.</p>'+
            rows+
            '<p class="wc-cmp-note">Lighthouse scores naturally vary a few points between runs. Our site is our portfolio &mdash; if we can make our own site this fast and findable, we can do it for yours. <a href="/web-design-hosting/">See our web design &amp; hosting</a>.</p></div>';
          requestAnimationFrame(function(){ box.querySelectorAll('.wc-cmp-fill').forEach(function(f){ f.style.width=f.getAttribute('data-w')+'%'; }); });
        }
        function startCompare(mine,testedUrl){
          var box=root.querySelector('#wc-compare'); if(!box) return;
          var host=''; try{ host=new URL(testedUrl).hostname.replace(/^www\./,''); }catch(e){}
          if(host==='365techies.co.uk'){ renderCompare(mine,mine,true); return; }
          box.innerHTML='<p class="wc-cmp-loading">Comparing with 365techies.co.uk (checked live)&hellip;</p>';
          fetchSelf().then(function(ours){ renderCompare(mine,ours,false); })
            .catch(function(err){
              if(String(err&&err.message)==='cmp429') box.innerHTML='<p class="wc-cmp-loading">Google&rsquo;s free testing limit is busy, so the live comparison will be back shortly &mdash; your results above are unaffected.</p>';
              else box.innerHTML='';
            });
        }
        /* one-click "test this site" buttons anywhere on the page */
        document.addEventListener('click',function(e){
          var b=e.target.closest('[data-wc-prefill]'); if(!b) return;
          e.preventDefault();
          urlInput.value=b.getAttribute('data-wc-prefill');
          try{ root.scrollIntoView({behavior:'smooth',block:'start'}); }catch(ex){}
          if(typeof form.requestSubmit==='function') form.requestSubmit();
          else form.dispatchEvent(new Event('submit',{cancelable:true}));
        });
        function render(d,u){
          var lh=d.lighthouseResult; if(!lh){ showErr(new Error('api')); return; }
          var cats=lh.categories;
          function sc(k){ return cats[k]&&cats[k].score!=null?Math.round(cats[k].score*100):null; }
          var S={performance:sc('performance'),seo:sc('seo'),accessibility:sc('accessibility'),bp:sc('best-practices')};
          var tu=lh.finalUrl||u, a=root.querySelector('#wc-tested-url'); a.textContent=tu.replace(/^https?:\/\//,''); a.href=tu;
          root.querySelector('#wc-tested-strat').textContent=(strat==='mobile'?'Mobile':'Desktop');
          var g='';
          [['performance','Performance'],['seo','SEO'],['accessibility','Accessibility'],['bp','Best Practices']].forEach(function(p){ if(S[p[0]]!=null) g+=gauge(S[p[0]],p[1]); });
          root.querySelector('#wc-gauges').innerHTML=g;
          var cw=cwv(d,lh), ch='';
          if(cw.length){ ch='<h3 class="wc-sub">Core Web Vitals</h3><div class="wc-cwv-grid">';
            cw.forEach(function(m){ ch+='<div class="wc-metric '+metricBand(m.c)+'"><p class="wc-metric-v">'+esc(m.v)+'</p><p class="wc-metric-l">'+m.l+'</p></div>'; }); ch+='</div>'; }
          root.querySelector('#wc-cwv').innerHTML=ch;
          var ck=CHECKS.map(function(c){ var au=lh.audits[c[0]]; if(!au||au.score===null||au.scoreDisplayMode==='notApplicable') return ''; var ok=au.score>=0.9; return '<span class="wc-chk '+(ok?'is-ok':'is-bad')+'">'+(ok?'✓':'✗')+' '+c[1]+'</span>'; }).join('');
          root.querySelector('#wc-checks').innerHTML=ck?('<h3 class="wc-sub">Quick checks</h3><div class="wc-chk-grid">'+ck+'</div>'):'';
          var iss=[];
          Object.keys(lh.audits).forEach(function(k){ var au=lh.audits[k];
            if(au.score===null||au.score>=0.9) return;
            if(['informative','notApplicable','manual'].indexOf(au.scoreDisplayMode)>=0) return;
            if(CHECK_KEYS.indexOf(k)>=0) return;
            iss.push({t:au.title,d:(au.description||'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\s*\(https?:[^)]+\)/g,'').replace(/Learn.*$/i,'').trim(),s:au.score}); });
          iss.sort(function(x,y){return x.s-y.s;}); iss=iss.slice(0,8);
          var ih='';
          if(iss.length){ ih='<h3 class="wc-sub">Top things to improve</h3><ul class="wc-issue-list">';
            iss.forEach(function(it){ var dd=it.d.length>180?it.d.slice(0,178)+'…':it.d; ih+='<li class="'+(it.s<0.5?'wc-poor':'wc-avg')+'"><b>'+esc(it.t)+'</b>'+(dd?'<span>'+esc(dd)+'</span>':'')+'</li>'; }); ih+='</ul>'; }
          root.querySelector('#wc-issues').innerHTML=ih;
          var weak=[]; if(S.performance!=null&&S.performance<90)weak.push('speed'); if(S.seo!=null&&S.seo<90)weak.push('SEO'); if(S.accessibility!=null&&S.accessibility<90)weak.push('accessibility'); if(S.bp!=null&&S.bp<90)weak.push('security &amp; best practices');
          var fm=root.querySelector('#wc-fix-msg');
          fm.innerHTML=weak.length? ('We spotted room to improve '+listWords(weak)+'. Your local Dorset web &amp; IT team can sort the lot — faster pages, better Google rankings and a site that works beautifully on every device.') : ('Strong scores! If you’d like a second opinion or help keeping it that way, we’re a friendly local Dorset web &amp; IT team and we’re happy to help.');
          elRes.hidden=false;
          requestAnimationFrame(function(){ root.querySelectorAll('.wc-g-val').forEach(function(c){ c.style.strokeDashoffset=c.getAttribute('data-off'); }); });
          try{ elRes.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
          startCompare(S,tu);
        }
      })();
      </script>
    </section>'''

# Shared email-security checker tool (SPF/DKIM/DMARC via DNS-over-HTTPS, no key) — embedded on /email-security-checker/
EMAILSEC_TOOL = r'''    <section class="section" aria-label="Email security checker" id="esectool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE EMAIL SECURITY CHECK</p>
          <h2 class="section-title section-title--center" data-title>Can scammers spoof your email?<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Enter your domain and we&rsquo;ll check whether your email is protected against spoofing and impersonation &mdash; the SPF, DKIM and DMARC records that stop scammers sending fake emails in your name.</p>
        </div>
        <div id="esec" data-reveal>
          <form class="es-form" id="es-form" novalidate>
            <input type="text" id="es-domain" inputmode="url" autocomplete="off" spellcheck="false" placeholder="yourbusiness.co.uk" aria-label="Your domain" required>
            <button type="submit" class="button primary es-go">Check my email security</button>
          </form>
          <p class="es-hint">Free, no sign-up &mdash; just your domain (e.g. 365techies.co.uk), not your email address.</p>
          <div class="es-loading" id="es-loading" hidden>
            <div class="es-spinner" aria-hidden="true"></div>
            <p id="es-loadmsg">Checking your DNS records&hellip;</p>
          </div>
          <div class="es-error" id="es-error" hidden></div>
          <div class="es-results" id="es-results" hidden>
            <div id="es-verdict"></div>
            <div class="es-checks" id="es-checks"></div>
            <div class="es-fix">
              <h3>Want your email locked down?</h3>
              <p id="es-fix-msg"></p>
              <div class="es-fix-cta">
                <a class="button primary" href="/contact/">Get my email secured &#8594;</a>
                <a class="button es-ghost" href="/cybersecurity-support/">Our cybersecurity help</a>
              </div>
            </div>
          </div>
        </div>
        <p class="es-powered">Checks your public DNS records (SPF, DKIM, DMARC) live via DNS-over-HTTPS. Nothing is stored, and we never see your email.</p>
      </div>
      <style>
      #esec{max-width:820px;margin:0 auto}
      #esec .es-form{display:flex;gap:.6rem;flex-wrap:wrap;align-items:stretch}
      #esec #es-domain{flex:1 1 260px;min-width:0;padding:.95rem 1.1rem;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:inherit;font:inherit}
      #esec #es-domain:focus{outline:none;border-color:var(--cyan,#37c2c2)}
      #esec .es-go{white-space:nowrap}
      #esec .es-hint{font-size:.78rem;color:var(--muted,#9aa6c2);margin:.6rem 0 0}
      #esec .es-loading{text-align:center;padding:2.4rem 1rem}
      #esec .es-spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,.14);border-top-color:var(--cyan,#37c2c2);margin:0 auto 1rem;animation:es-spin 1s linear infinite}
      @keyframes es-spin{to{transform:rotate(360deg)}}
      #esec .es-error{margin-top:1.3rem;padding:1rem 1.2rem;border-radius:12px;border:1px solid rgba(231,76,60,.45);background:rgba(231,76,60,.1);font-size:.92rem;line-height:1.55}
      #esec .es-error a{color:var(--cyan,#37c2c2)}
      #esec .es-results{margin-top:1.8rem}
      #esec .es-verdict-box{text-align:center;padding:1.6rem;border-radius:16px;border:1px solid rgba(255,255,255,.12);margin-bottom:1.4rem}
      #esec .es-verdict-dom{margin:0;font-size:.85rem;color:var(--muted,#9aa6c2);word-break:break-all}
      #esec .es-verdict-grade{margin:.2rem 0 .5rem;font-size:1.9rem;font-weight:800}
      #esec .es-verdict-msg{margin:0 auto;max-width:52ch;font-size:.95rem;line-height:1.6;color:var(--muted,#9aa6c2)}
      #esec .es-checks{display:grid;gap:.8rem}
      #esec .es-check{padding:1rem 1.2rem;border-radius:12px;background:rgba(255,255,255,.03);border-left:4px solid var(--muted,#9aa6c2)}
      #esec .es-check-h{display:flex;align-items:center;gap:.6rem;margin-bottom:.3rem}
      #esec .es-check-ico{width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:800;color:#04161a;flex:none}
      #esec .es-check b{font-size:1rem}
      #esec .es-check p{margin:0;font-size:.9rem;color:var(--muted,#9aa6c2);line-height:1.55}
      #esec .es-rec{display:block;margin-top:.6rem;font-family:var(--font-mono,monospace);font-size:.72rem;color:var(--faint,#9fb5d3);word-break:break-all;background:rgba(0,0,0,.25);padding:.4rem .6rem;border-radius:7px}
      #esec .es-check.es-good{border-left-color:#2ecc71}
      #esec .es-check.es-avg{border-left-color:#f1c40f}
      #esec .es-check.es-poor{border-left-color:#e74c3c}
      #esec .es-check.es-good .es-check-ico{background:#2ecc71}
      #esec .es-check.es-avg .es-check-ico{background:#f1c40f}
      #esec .es-check.es-poor .es-check-ico{background:#e74c3c}
      #esec .es-verdict-box.es-good{border-color:rgba(46,204,113,.4);background:rgba(46,204,113,.08)}
      #esec .es-verdict-box.es-avg{border-color:rgba(241,196,15,.4);background:rgba(241,196,15,.08)}
      #esec .es-verdict-box.es-poor{border-color:rgba(231,76,60,.4);background:rgba(231,76,60,.08)}
      #esec .es-verdict-box.es-good .es-verdict-grade{color:#2ecc71}
      #esec .es-verdict-box.es-avg .es-verdict-grade{color:#f1c40f}
      #esec .es-verdict-box.es-poor .es-verdict-grade{color:#e74c3c}
      #esec .es-fix{margin-top:2rem;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #esec .es-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #esec .es-fix p{margin:0 auto 1.1rem;max-width:48ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #esec .es-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      #esec .es-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      #esec .es-powered{text-align:center;font-size:.72rem;color:var(--muted,#9aa6c2);margin:1.4rem 0 0;opacity:.8}
      @media(max-width:560px){#esec .es-go{flex:1 1 100%}}
      </style>
      <script>
      (function(){
        var root=document.getElementById('esec'); if(!root) return;
        var form=root.querySelector('#es-form'), input=root.querySelector('#es-domain');
        var elLoad=root.querySelector('#es-loading'), elMsg=root.querySelector('#es-loadmsg');
        var elErr=root.querySelector('#es-error'), elRes=root.querySelector('#es-results');
        var CTA='<a href="/contact/">get in touch</a>';
        var SELECTORS=['google','selector1','selector2','default','k1','s1','s2','mail','dkim','smtp','zoho','mandrill','protonmail','fm1','k2','dk'];
        var loadTimer=null, LOAD=['Looking up your DNS records…','Checking SPF (who can send as you)…','Checking DMARC (anti-spoofing policy)…','Checking DKIM (email signing)…','Working out your result…'];
        function esc(s){var d=document.createElement('div');d.textContent=(s==null?'':s);return d.innerHTML;}
        function normDomain(v){ v=(v||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/[\/?#].*$/,'').replace(/\s+/g,''); if(v.indexOf('@')>=0) v=v.split('@').pop(); return v; }
        function doh(name,type){ return fetch('https://dns.google/resolve?name='+encodeURIComponent(name)+'&type='+(type||'TXT')).then(function(r){ if(!r.ok) throw new Error('dns'); return r.json(); }); }
        function txt(name){ return doh(name,'TXT').then(function(d){ if(!d.Answer) return []; return d.Answer.filter(function(a){return a.type===16;}).map(function(a){ return String(a.data).replace(/\\"/g,'"').replace(/^"|"$/g,'').replace(/"\s+"/g,''); }); }).catch(function(){return [];}); }
        function findFirst(arr,re){ for(var i=0;i<arr.length;i++){ if(re.test(arr[i])) return arr[i]; } return null; }
        function startLoad(){ var i=0; elMsg.textContent=LOAD[0]; loadTimer=setInterval(function(){ i=(i+1)%LOAD.length; elMsg.textContent=LOAD[i]; },1600); }
        function stopLoad(){ if(loadTimer){clearInterval(loadTimer);loadTimer=null;} }
        form.addEventListener('submit',function(e){
          e.preventDefault();
          var d=normDomain(input.value); if(!d || d.indexOf('.')<0){ input.focus(); return; }
          elRes.hidden=true; elErr.hidden=true; elLoad.hidden=false; startLoad();
          var btn=form.querySelector('.es-go'); btn.disabled=true;
          Promise.all([ txt(d), txt('_dmarc.'+d), Promise.all(SELECTORS.map(function(s){ return txt(s+'._domainkey.'+d).then(function(t){return {s:s,t:t};}); })) ])
            .then(function(r){ render(d,r[0],r[1],r[2]); })
            .catch(function(err){ elErr.innerHTML='We couldn’t look up that domain. Check it’s spelled correctly (just the domain, e.g. yourbusiness.co.uk) and try again — or '+CTA+'.'; elErr.hidden=false; })
            .then(function(){ stopLoad(); elLoad.hidden=true; btn.disabled=false; });
        });
        function render(domain, spfTxts, dmarcTxts, dkimProbes){
          var spf=findFirst(spfTxts,/^v=spf1/i);
          var dmarc=findFirst(dmarcTxts,/^v=DMARC1/i);
          var checks=[], dmarcEnforcing=false;
          if(!spf) checks.push({s:'poor',t:'SPF',m:'No SPF record found — anyone can send email pretending to be your domain.'});
          else { var all=(spf.match(/([~\-?+])all\b/)||[])[1];
            if(all==='-') checks.push({s:'good',t:'SPF',m:'Set up and strict (-all) — only your approved servers can send email as you.',rec:spf});
            else if(all==='~') checks.push({s:'avg',t:'SPF',m:'Exists, but soft-fail (~all) — spoofed mail is only flagged, not blocked. Ideally end it in -all.',rec:spf});
            else checks.push({s:'avg',t:'SPF',m:'Exists, but weak — it should end in -all to actually block spoofing.',rec:spf}); }
          if(!dmarc) checks.push({s:'poor',t:'DMARC',m:'No DMARC record — nothing tells inboxes to reject spoofed email. This is the big gap, and the one scammers exploit.'});
          else { var p=((dmarc.match(/[;\s]p\s*=\s*(\w+)/i)||[])[1]||'').toLowerCase();
            if(p==='reject'){ dmarcEnforcing=true; checks.push({s:'good',t:'DMARC',m:'Enforcing (p=reject) — spoofed email is rejected outright. Excellent.',rec:dmarc}); }
            else if(p==='quarantine'){ dmarcEnforcing=true; checks.push({s:'good',t:'DMARC',m:'Enforcing (p=quarantine) — spoofed email is sent straight to spam.',rec:dmarc}); }
            else if(p==='none') checks.push({s:'avg',t:'DMARC',m:'Monitor-only (p=none) — it watches but doesn’t yet block spoofing. Move it to quarantine or reject.',rec:dmarc});
            else checks.push({s:'avg',t:'DMARC',m:'Record found, but the policy isn’t clearly set.',rec:dmarc}); }
          var hit=null; for(var i=0;i<dkimProbes.length;i++){ if(findFirst(dkimProbes[i].t,/(v=DKIM1|k=rsa|p=[A-Za-z0-9+\/]{20,})/i)){ hit=dkimProbes[i]; break; } }
          if(hit) checks.push({s:'good',t:'DKIM',m:'Email signing detected (selector “'+esc(hit.s)+'”) — your messages are cryptographically signed.'});
          else checks.push({s:'avg',t:'DKIM',m:'Not found on common selectors. Your provider may use a custom one — worth confirming your email is DKIM-signed.'});
          var verdict;
          if(spf && dmarcEnforcing) verdict={g:'Protected',cls:'good',m:'Your domain is well protected against email spoofing. Nicely done.'};
          else if(!spf && !dmarc) verdict={g:'Exposed',cls:'poor',m:'Your domain has little or no protection — scammers can send email that looks exactly like it’s from you. This is how invoice fraud and phishing begin.'};
          else verdict={g:'Partly protected',cls:'avg',m:'You’ve got some protection, but there are gaps a scammer could still exploit. A few tweaks would close them.'};
          root.querySelector('#es-verdict').innerHTML='<div class="es-verdict-box es-'+verdict.cls+'"><p class="es-verdict-dom">'+esc(domain)+'</p><p class="es-verdict-grade">'+verdict.g+'</p><p class="es-verdict-msg">'+verdict.m+'</p></div>';
          var ch=''; checks.forEach(function(c){ var icon=c.s==='good'?'✓':(c.s==='avg'?'!':'✗');
            ch+='<div class="es-check es-'+c.s+'"><div class="es-check-h"><span class="es-check-ico">'+icon+'</span><b>'+c.t+'</b></div><p>'+c.m+'</p>'+(c.rec?'<code class="es-rec">'+esc(c.rec.length>140?c.rec.slice(0,138)+'…':c.rec)+'</code>':'')+'</div>'; });
          root.querySelector('#es-checks').innerHTML=ch;
          root.querySelector('#es-fix-msg').innerHTML = verdict.cls==='good'
            ? 'Your setup looks solid. If you’d like us to keep it that way — or check the rest of your cybersecurity — we’re a friendly local Dorset team.'
            : 'Email spoofing is how invoice fraud and phishing start. We’ll set up SPF, DKIM and DMARC properly so scammers can’t send email in your name — usually within a day.';
          elRes.hidden=false;
          try{ elRes.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
        }
      })();
      </script>
    </section>'''

# Shared password-breach checker (Have I Been Pwned k-anonymity, no key) — embedded on /password-breach-checker/
PWNED_TOOL = r'''    <section class="section" aria-label="Password breach checker" id="pwntool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE BREACH CHECK</p>
          <h2 class="section-title section-title--center" data-title>Has your password been leaked?<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Check any password against billions exposed in real data breaches. <strong>Your password never leaves your browser</strong> &mdash; only a tiny, anonymised fragment of a one-way fingerprint is ever sent.</p>
        </div>
        <div id="pwn" data-reveal>
          <form class="pw-form" id="pw-form" novalidate>
            <div class="pw-inwrap">
              <input type="password" id="pw-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Enter a password to check" aria-label="Password to check" required>
              <button type="button" class="pw-eye" id="pw-eye" aria-label="Show or hide password">show</button>
            </div>
            <button type="submit" class="button primary pw-go">Check password</button>
          </form>
          <p class="pw-hint">&#128274; Privacy-safe: your password is hashed in your browser and never sent &mdash; the same k-anonymity method security professionals trust.</p>
          <div class="pw-loading" id="pw-loading" hidden><div class="pw-spinner" aria-hidden="true"></div><p>Checking against breached passwords&hellip;</p></div>
          <div class="pw-error" id="pw-error" hidden></div>
          <div class="pw-results" id="pw-results" hidden>
            <div id="pw-verdict"></div>
            <div class="pw-fix">
              <h3>What to do next</h3>
              <p id="pw-fix-msg"></p>
              <div class="pw-fix-cta">
                <a class="button primary" href="/contact/">Get help staying secure &#8594;</a>
                <a class="button pw-ghost" href="/password-strength-checker/">Build a strong password</a>
              </div>
            </div>
          </div>
        </div>
        <p class="pw-powered">Checked against Have I Been Pwned&rsquo;s corpus of 10+ billion breached passwords using k-anonymity. Your password never leaves this page.</p>
      </div>
      <style>
      #pwn{max-width:680px;margin:0 auto}
      #pwn .pw-form{display:flex;gap:.6rem;flex-wrap:wrap;align-items:stretch}
      #pwn .pw-inwrap{position:relative;flex:1 1 260px;min-width:0;display:flex}
      #pwn #pw-input{flex:1;min-width:0;padding:.95rem 3.4rem .95rem 1.1rem;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:inherit;font:inherit}
      #pwn #pw-input:focus{outline:none;border-color:var(--cyan,#37c2c2)}
      #pwn .pw-eye{position:absolute;right:.5rem;top:50%;transform:translateY(-50%);background:transparent;border:0;color:var(--muted,#9aa6c2);font:inherit;font-size:.78rem;cursor:pointer;padding:.3rem .5rem}
      #pwn .pw-go{white-space:nowrap}
      #pwn .pw-hint{font-size:.78rem;color:var(--muted,#9aa6c2);margin:.6rem 0 0;line-height:1.5}
      #pwn .pw-loading{text-align:center;padding:2.2rem 1rem}
      #pwn .pw-spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,.14);border-top-color:var(--cyan,#37c2c2);margin:0 auto 1rem;animation:pw-spin 1s linear infinite}
      @keyframes pw-spin{to{transform:rotate(360deg)}}
      #pwn .pw-error{margin-top:1.3rem;padding:1rem 1.2rem;border-radius:12px;border:1px solid rgba(231,76,60,.45);background:rgba(231,76,60,.1);font-size:.92rem}
      #pwn .pw-results{margin-top:1.8rem}
      #pwn .pw-verdict-box{text-align:center;padding:1.6rem;border-radius:16px;border:1px solid rgba(255,255,255,.12);margin-bottom:1.4rem}
      #pwn .pw-verdict-grade{margin:0 0 .3rem;font-size:1.3rem;font-weight:800}
      #pwn .pw-verdict-big{margin:.2rem 0;font-size:2.6rem;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
      #pwn .pw-verdict-msg{margin:.4rem auto 0;max-width:48ch;font-size:.95rem;line-height:1.6;color:var(--muted,#9aa6c2)}
      #pwn .pw-good{border-color:rgba(46,204,113,.4);background:rgba(46,204,113,.08)}
      #pwn .pw-good .pw-verdict-grade{color:#2ecc71}
      #pwn .pw-poor{border-color:rgba(231,76,60,.4);background:rgba(231,76,60,.1)}
      #pwn .pw-poor .pw-verdict-grade,#pwn .pw-poor .pw-verdict-big{color:#e74c3c}
      #pwn .pw-fix{margin-top:.4rem;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #pwn .pw-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #pwn .pw-fix p{margin:0 auto 1.1rem;max-width:48ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #pwn .pw-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      #pwn .pw-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      #pwn .pw-powered{text-align:center;font-size:.72rem;color:var(--muted,#9aa6c2);margin:1.4rem 0 0;opacity:.8}
      @media(max-width:560px){#pwn .pw-go{flex:1 1 100%}}
      </style>
      <script>
      (function(){
        var root=document.getElementById('pwn'); if(!root) return;
        var form=root.querySelector('#pw-form'), input=root.querySelector('#pw-input'), eye=root.querySelector('#pw-eye');
        var elLoad=root.querySelector('#pw-loading'), elErr=root.querySelector('#pw-error'), elRes=root.querySelector('#pw-results');
        eye.addEventListener('click',function(){ var sh=input.type==='password'; input.type=sh?'text':'password'; eye.textContent=sh?'hide':'show'; input.focus(); });
        function fmt(n){ return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,','); }
        function sha1hex(str){ return crypto.subtle.digest('SHA-1', new TextEncoder().encode(str)).then(function(buf){ return Array.from(new Uint8Array(buf)).map(function(b){return ('0'+b.toString(16)).slice(-2);}).join('').toUpperCase(); }); }
        form.addEventListener('submit',function(e){
          e.preventDefault();
          var pw=input.value; if(!pw){ input.focus(); return; }
          if(!(window.crypto&&crypto.subtle&&window.TextEncoder)){ elErr.innerHTML='Your browser can&rsquo;t run the secure check (it needs a modern browser over HTTPS).'; elErr.hidden=false; return; }
          elRes.hidden=true; elErr.hidden=true; elLoad.hidden=false; var btn=form.querySelector('.pw-go'); btn.disabled=true;
          sha1hex(pw).then(function(hash){
            var prefix=hash.slice(0,5), suffix=hash.slice(5);
            return fetch('https://api.pwnedpasswords.com/range/'+prefix).then(function(r){ if(!r.ok) throw new Error('api'); return r.text(); }).then(function(text){
              var count=0, lines=text.split('\n');
              for(var i=0;i<lines.length;i++){ var parts=lines[i].trim().split(':'); if(parts[0]===suffix){ count=parseInt(parts[1],10)||0; break; } }
              render(count);
            });
          }).catch(function(){ elErr.innerHTML='We couldn&rsquo;t reach the breach database just now &mdash; please try again in a moment.'; elErr.hidden=false; })
            .then(function(){ elLoad.hidden=true; btn.disabled=false; });
        });
        function render(count){
          var v=root.querySelector('#pw-verdict'), fm=root.querySelector('#pw-fix-msg');
          if(count>0){
            v.innerHTML='<div class="pw-verdict-box pw-poor"><p class="pw-verdict-grade">&#9888;&#65039; Found in data breaches</p><p class="pw-verdict-big">'+fmt(count)+'</p><p class="pw-verdict-msg">This password has appeared <b>'+fmt(count)+' time'+(count===1?'':'s')+'</b> in known breaches. It&rsquo;s on the lists criminals use to break into accounts &mdash; stop using it anywhere.</p></div>';
            fm.innerHTML='If you use this password (or a close version) on any account, change it now, use a <b>unique</b> password for every login, and switch on two-factor authentication. A password manager makes this effortless &mdash; we can set you up.';
          } else {
            v.innerHTML='<div class="pw-verdict-box pw-good"><p class="pw-verdict-grade">&#10003; Not found in known breaches</p><p class="pw-verdict-msg">Good news &mdash; this exact password wasn&rsquo;t in the breach database. That doesn&rsquo;t automatically make it <em>strong</em>, though &mdash; length and never reusing it matter most.</p></div>';
            fm.innerHTML='Keep it that way: use a long, unique password for every account and never reuse one. Want to test its strength or get set up with a password manager? We&rsquo;re happy to help.';
          }
          elRes.hidden=false;
          try{ elRes.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
        }
      })();
      </script>
    </section>'''

# Shared privacy checker (client-side + free IP lookup, no key) — embedded on /what-websites-know/
PRIVACY_TOOL = r'''    <section class="section" aria-label="Privacy checker" id="privtool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE PRIVACY CHECK</p>
          <h2 class="section-title section-title--center" data-title>What can websites see about you?<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Every website you visit can quietly learn a surprising amount about you &mdash; before you click a thing. Here&rsquo;s exactly what this page can see about your device right now.</p>
        </div>
        <div id="priv" data-reveal style="text-align:center">
          <button type="button" class="button primary priv-go" id="priv-go">Reveal what sites can see &#8594;</button>
          <div class="priv-loading" id="priv-loading" hidden><div class="priv-spinner" aria-hidden="true"></div><p>Reading what your browser gives away&hellip;</p></div>
          <div class="priv-results" id="priv-results" hidden>
            <div class="priv-grid" id="priv-grid"></div>
            <div class="priv-fix">
              <h3>Surprised how much shows up?</h3>
              <p>None of this is stored &mdash; but it shows how much you give away just by browsing. We help Dorset homes and businesses tighten their privacy and stay safe online, in plain English.</p>
              <div class="priv-fix-cta">
                <a class="button primary" href="/contact/">Get privacy &amp; security help &#8594;</a>
                <a class="button priv-ghost" href="/online-safety/">Online safety hub</a>
              </div>
            </div>
          </div>
          <p class="priv-powered">Everything here is read in your own browser. Your IP and rough location come from a public lookup &mdash; nothing is stored or sent to us.</p>
        </div>
      </div>
      <style>
      #priv{max-width:820px;margin:0 auto}
      #priv .priv-loading{padding:2.2rem 1rem}
      #priv .priv-spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,.14);border-top-color:var(--cyan,#37c2c2);margin:0 auto 1rem;animation:priv-spin 1s linear infinite}
      @keyframes priv-spin{to{transform:rotate(360deg)}}
      #priv .priv-loading p{color:var(--muted,#9aa6c2)}
      #priv .priv-results{margin-top:1.8rem;text-align:left}
      #priv .priv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.7rem}
      #priv .priv-card{padding:.9rem 1.1rem;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03)}
      #priv .priv-k{margin:0;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#9aa6c2)}
      #priv .priv-v{margin:.2rem 0 0;font-size:1.02rem;font-weight:700;word-break:break-word}
      #priv .priv-n{margin:.3rem 0 0;font-size:.74rem;color:var(--muted,#9aa6c2);line-height:1.45}
      #priv .priv-fix{margin-top:2rem;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #priv .priv-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #priv .priv-fix p{margin:0 auto 1.1rem;max-width:52ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #priv .priv-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      #priv .priv-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      #priv .priv-powered{text-align:center;font-size:.72rem;color:var(--muted,#9aa6c2);margin:1.4rem 0 0;opacity:.8}
      </style>
      <script>
      (function(){
        var root=document.getElementById('priv'); if(!root) return;
        var go=root.querySelector('#priv-go'), load=root.querySelector('#priv-loading'), res=root.querySelector('#priv-results'), grid=root.querySelector('#priv-grid');
        function esc(s){var d=document.createElement('div');d.textContent=(s==null?'':s);return d.innerHTML;}
        function card(k,v,n){ return '<div class="priv-card"><p class="priv-k">'+k+'</p><p class="priv-v">'+v+'</p>'+(n?'<p class="priv-n">'+n+'</p>':'')+'</div>'; }
        go.addEventListener('click',function(){
          go.disabled=true; load.hidden=false; res.hidden=true;
          var n=navigator, s=screen, ua=n.userAgent||'';
          var tz=''; try{ tz=Intl.DateTimeFormat().resolvedOptions().timeZone; }catch(e){}
          var browser=/edg/i.test(ua)?'Microsoft Edge':(/opr|opera/i.test(ua)?'Opera':(/chrome/i.test(ua)?'Chrome':(/firefox/i.test(ua)?'Firefox':(/safari/i.test(ua)?'Safari':'Your browser'))));
          var os=/windows/i.test(ua)?'Windows':(/android/i.test(ua)?'Android':(/iphone|ipad/i.test(ua)?'iOS':(/mac/i.test(ua)?'macOS':(/linux/i.test(ua)?'Linux':'your device'))));
          function finish(ip){
            var out='';
            out+=card('Your IP address', esc((ip&&ip.ip)||'hidden / unavailable'), 'Identifies your internet connection &mdash; effectively your household.');
            if(ip&&ip.success!==false&&ip.ip){ var loc=[ip.city,ip.region,ip.country].filter(Boolean).join(', '); out+=card('Rough location', esc(loc||'—'), 'Estimated from your IP &mdash; not GPS, but often close.'); if(ip.connection&&ip.connection.isp) out+=card('Internet provider', esc(ip.connection.isp)); }
            out+=card('Browser &amp; system', esc(browser+' on '+os));
            out+=card('Screen', s.width+'&times;'+s.height+' &middot; '+(window.devicePixelRatio||1)+'&times; density');
            if(tz) out+=card('Time zone', esc(tz), 'Hints at where in the world you are.');
            out+=card('Language', esc((n.languages&&n.languages.join(', '))||n.language||'—'));
            out+=card('Cookies', n.cookieEnabled?'Enabled':'Blocked');
            out+=card('&ldquo;Do Not Track&rdquo;', (n.doNotTrack==='1'||n.doNotTrack==='yes')?'On':'Off / not set', 'Most sites ignore it anyway.');
            if(n.hardwareConcurrency) out+=card('CPU cores', String(n.hardwareConcurrency));
            if(n.deviceMemory) out+=card('Device memory', n.deviceMemory+' GB (approx)');
            if(n.connection&&n.connection.effectiveType) out+=card('Connection', esc(String(n.connection.effectiveType).toUpperCase()));
            grid.innerHTML=out; load.hidden=true; res.hidden=false; go.disabled=false; go.textContent='Check again';
            try{ res.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
          }
          fetch('https://ipwho.is/').then(function(r){return r.json();}).then(finish).catch(function(){ finish(null); });
        });
      })();
      </script>
    </section>'''

# Shared scam-link checker (in-browser phishing heuristics + optional Safe Browsing via SB_ENDPOINT Worker) — /link-safety-checker/
SCAM_TOOL = r'''    <section class="section" aria-label="Link safety checker" id="scamtool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE LINK SAFETY CHECK</p>
          <h2 class="section-title section-title--center" data-title>Is that link safe to click?<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Paste a link and we&rsquo;ll check the address for the warning signs scammers use &mdash; <strong>before</strong> you click. Perfect for that &ldquo;is this text or email real?&rdquo; moment.</p>
        </div>
        <div id="scam" data-reveal>
          <form class="sc-form" id="sc-form" novalidate>
            <input type="text" id="sc-url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="Paste a link, e.g. https://..." aria-label="Link to check" required>
            <button type="submit" class="button primary sc-go">Check this link</button>
          </form>
          <p class="sc-hint">Tip: on a phone, press and hold the link and choose &ldquo;copy link&rdquo; first. We never open the link &mdash; we only examine the address.</p>
          <div class="sc-loading" id="sc-loading" hidden><div class="sc-spinner" aria-hidden="true"></div><p>Examining the link&hellip;</p></div>
          <div class="sc-error" id="sc-error" hidden></div>
          <div class="sc-results" id="sc-results" hidden>
            <div id="sc-verdict"></div>
            <div id="sc-flags"></div>
            <div class="sc-fix">
              <h3>Not sure about a message?</h3>
              <p>If a link, text or email feels off, don&rsquo;t click &mdash; check with us first. We help Dorset homes and businesses spot and stop scams, calmly and without judgement.</p>
              <div class="sc-fix-cta">
                <a class="button primary" href="/contact/">Ask us about a message &#8594;</a>
                <a class="button sc-ghost" href="/spot-the-scam/">Take the Spot-the-Scam quiz</a>
              </div>
            </div>
          </div>
        </div>
        <p class="sc-powered">Checks the link&rsquo;s address for common phishing tells, right in your browser. A clean result isn&rsquo;t a guarantee &mdash; when in doubt, don&rsquo;t click.</p>
      </div>
      <style>
      #scam{max-width:760px;margin:0 auto}
      #scam .sc-form{display:flex;gap:.6rem;flex-wrap:wrap;align-items:stretch}
      #scam #sc-url{flex:1 1 260px;min-width:0;padding:.95rem 1.1rem;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:inherit;font:inherit}
      #scam #sc-url:focus{outline:none;border-color:var(--cyan,#37c2c2)}
      #scam .sc-go{white-space:nowrap}
      #scam .sc-hint{font-size:.78rem;color:var(--muted,#9aa6c2);margin:.6rem 0 0;line-height:1.5}
      #scam .sc-loading{text-align:center;padding:2rem 1rem}
      #scam .sc-spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,.14);border-top-color:var(--cyan,#37c2c2);margin:0 auto 1rem;animation:sc-spin 1s linear infinite}
      @keyframes sc-spin{to{transform:rotate(360deg)}}
      #scam .sc-error{margin-top:1.3rem;padding:1rem 1.2rem;border-radius:12px;border:1px solid rgba(231,76,60,.45);background:rgba(231,76,60,.1);font-size:.92rem}
      #scam .sc-results{margin-top:1.8rem}
      #scam .sc-verdict-box{text-align:center;padding:1.6rem;border-radius:16px;border:1px solid rgba(255,255,255,.12);margin-bottom:1.4rem}
      #scam .sc-verdict-dom{margin:0;font-size:.85rem;color:var(--muted,#9aa6c2);word-break:break-all}
      #scam .sc-verdict-grade{margin:.2rem 0 .5rem;font-size:1.7rem;font-weight:800}
      #scam .sc-verdict-msg{margin:0 auto;max-width:52ch;font-size:.95rem;line-height:1.6;color:var(--muted,#9aa6c2)}
      #scam .sc-sub{font-size:.95rem;font-weight:700;margin:1.6rem 0 .8rem;text-align:center}
      #scam .sc-flag{padding:.9rem 1.1rem;border-radius:12px;background:rgba(255,255,255,.03);border-left:4px solid var(--muted,#9aa6c2);margin-bottom:.7rem}
      #scam .sc-flag-h{display:flex;align-items:center;gap:.6rem;margin-bottom:.25rem}
      #scam .sc-flag-ico{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:800;color:#04161a;flex:none}
      #scam .sc-flag b{font-size:.95rem}
      #scam .sc-flag p{margin:0;font-size:.88rem;color:var(--muted,#9aa6c2);line-height:1.55}
      #scam .sc-good{border-left-color:#2ecc71}
      #scam .sc-good .sc-flag-ico{background:#2ecc71}
      #scam .sc-avg{border-left-color:#f1c40f}
      #scam .sc-avg .sc-flag-ico{background:#f1c40f}
      #scam .sc-poor{border-left-color:#e74c3c}
      #scam .sc-poor .sc-flag-ico{background:#e74c3c}
      #scam .sc-verdict-box.sc-good{border-color:rgba(46,204,113,.4);background:rgba(46,204,113,.08)}
      #scam .sc-verdict-box.sc-avg{border-color:rgba(241,196,15,.4);background:rgba(241,196,15,.08)}
      #scam .sc-verdict-box.sc-poor{border-color:rgba(231,76,60,.4);background:rgba(231,76,60,.1)}
      #scam .sc-verdict-box.sc-good .sc-verdict-grade{color:#2ecc71}
      #scam .sc-verdict-box.sc-avg .sc-verdict-grade{color:#f1c40f}
      #scam .sc-verdict-box.sc-poor .sc-verdict-grade{color:#e74c3c}
      #scam .sc-fix{margin-top:2rem;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #scam .sc-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #scam .sc-fix p{margin:0 auto 1.1rem;max-width:52ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #scam .sc-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      #scam .sc-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      #scam .sc-powered{text-align:center;font-size:.72rem;color:var(--muted,#9aa6c2);margin:1.4rem 0 0;opacity:.8}
      @media(max-width:560px){#scam .sc-go{flex:1 1 100%}}
      </style>
      <script>
      (function(){
        var root=document.getElementById('scam'); if(!root) return;
        var SB_ENDPOINT=""; /* optional: a Cloudflare Worker URL (safe-browsing-proxy.js) that checks Google Safe Browsing. When set, adds a definitive "known dangerous" check on top of the built-in heuristics. */
        var form=root.querySelector('#sc-form'), input=root.querySelector('#sc-url');
        var elLoad=root.querySelector('#sc-loading'), elErr=root.querySelector('#sc-error'), elRes=root.querySelector('#sc-results');
        function esc(s){var d=document.createElement('div');d.textContent=(s==null?'':s);return d.innerHTML;}
        var SHORT=['bit.ly','tinyurl.com','goo.gl','t.co','ow.ly','is.gd','buff.ly','rebrand.ly','cutt.ly','rb.gy','shorturl.at','tiny.cc','bit.do','soo.gd','t.ly'];
        var BADTLD=['zip','mov','tk','gq','ml','cf','ga','xyz','top','work','click','link','country','kim','science','review','loan','men','date','stream','gdn'];
        function analyze(raw){
          var url=(raw||'').trim(); if(!/^[a-z][a-z0-9+.\-]*:\/\//i.test(url)) url='http://'+url;
          var u; try{ u=new URL(url); }catch(e){ return null; }
          var host=u.hostname.toLowerCase(), flags=[];
          if(u.protocol!=='https:') flags.push({s:'poor',t:'Not a secure (HTTPS) link',m:'This address isn&rsquo;t encrypted &mdash; never enter passwords or card details on it.'});
          if(/^\d{1,3}(\.\d{1,3}){3}$/.test(host)||host.indexOf(':')>=0) flags.push({s:'poor',t:'Uses an IP address, not a domain',m:'Real businesses use a proper domain name. A raw IP address is a classic phishing sign.'});
          if(u.username||(raw.split('#')[0]||'').replace(/^[a-z]+:\/\//i,'').indexOf('@')>=0) flags.push({s:'poor',t:'Hides the real destination with &ldquo;@&rdquo;',m:'Anything before an @ in a web address is ignored by browsers &mdash; scammers use it to disguise where a link truly goes.'});
          if(/(^|\.)xn--/.test(host)) flags.push({s:'poor',t:'Uses disguised (&ldquo;punycode&rdquo;) characters',m:'The address contains encoded letters that can make a fake site look identical to a real one.'});
          if(SHORT.indexOf(host.replace(/^www\./,''))>=0) flags.push({s:'avg',t:'It&rsquo;s a shortened link',m:'Short links hide their true destination &mdash; you can&rsquo;t see where it actually leads, so take care.'});
          var labels=host.split('.'); if(labels.length>=5) flags.push({s:'avg',t:'A long chain of subdomains',m:'Lots of dots ('+esc(host)+') is often used to make a scam link look official.'});
          var tld=labels[labels.length-1]; if(BADTLD.indexOf(tld)>=0) flags.push({s:'avg',t:'Unusual domain ending (.'+esc(tld)+')',m:'This ending is used far more by scam and spam sites than legitimate ones. Not always bad &mdash; just take extra care.'});
          if(url.length>100) flags.push({s:'avg',t:'A very long web address',m:'Unusually long links can hide the real destination or heavy tracking.'});
          return {host:host, flags:flags, url:u.href};
        }
        form.addEventListener('submit',function(e){
          e.preventDefault();
          var raw=input.value; if(!raw.trim()){ input.focus(); return; }
          var a=analyze(raw);
          if(!a){ elErr.innerHTML='That doesn&rsquo;t look like a valid web address. Paste the whole link, including the part before the first &ldquo;/&rdquo;.'; elErr.hidden=false; elRes.hidden=true; return; }
          elErr.hidden=true; elRes.hidden=true; elLoad.hidden=false; var btn=form.querySelector('.sc-go'); btn.disabled=true;
          var done=function(threat){ render(a,threat); elLoad.hidden=true; btn.disabled=false; };
          if(SB_ENDPOINT){ fetch(SB_ENDPOINT+(SB_ENDPOINT.indexOf('?')<0?'?':'&')+'url='+encodeURIComponent(a.url)).then(function(r){return r.json();}).then(function(d){ done(d&&d.threat||null); }).catch(function(){ done(null); }); }
          else { setTimeout(function(){ done(null); }, 250); }
        });
        function render(a, threat){
          var flags=a.flags, hasBad=false; for(var i=0;i<flags.length;i++){ if(flags[i].s==='poor'){ hasBad=true; break; } }
          var v;
          if(threat) v={g:'Known dangerous site',cls:'poor',m:'Google Safe Browsing lists this link as '+esc(String(threat).toLowerCase().replace(/_/g,' '))+'. Do not click it, and never enter any details.'};
          else if(hasBad) v={g:'Looks suspicious',cls:'poor',m:'This link shows warning signs scammers commonly use. Treat it with real caution &mdash; when in doubt, don&rsquo;t click.'};
          else if(flags.length) v={g:'A few warning signs',cls:'avg',m:'Nothing definite, but a couple of things are worth a second look before you click.'};
          else v={g:'No obvious red flags',cls:'good',m:'The address doesn&rsquo;t show the usual phishing tells &mdash; reassuring, but not a cast-iron guarantee. Only continue if you were expecting this link.'};
          root.querySelector('#sc-verdict').innerHTML='<div class="sc-verdict-box sc-'+v.cls+'"><p class="sc-verdict-dom">'+esc(a.host)+'</p><p class="sc-verdict-grade">'+v.g+'</p><p class="sc-verdict-msg">'+v.m+'</p></div>';
          var f='';
          if(flags.length){ f='<h3 class="sc-sub">What we spotted</h3>'; flags.forEach(function(c){ var icon=c.s==='poor'?'✗':'!'; f+='<div class="sc-flag sc-'+c.s+'"><div class="sc-flag-h"><span class="sc-flag-ico">'+icon+'</span><b>'+c.t+'</b></div><p>'+c.m+'</p></div>'; }); }
          else { f='<div class="sc-flag sc-good"><div class="sc-flag-h"><span class="sc-flag-ico">✓</span><b>No common phishing signs found</b></div><p>Secure connection, a normal domain, and no address-disguising tricks.</p></div>'; }
          root.querySelector('#sc-flags').innerHTML=f;
          elRes.hidden=false;
          try{ elRes.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
        }
      })();
      </script>
    </section>'''

# Shared password / passphrase generator (client-side, crypto.getRandomValues, no key) — /password-generator/
PWGEN_TOOL = r'''    <section class="section" aria-label="Password generator" id="pgtool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE PASSWORD GENERATOR</p>
          <h2 class="section-title section-title--center" data-title>Make a strong password in one click<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Create a strong random password &mdash; or a memorable passphrase you can actually remember. Generated securely in your browser and <strong>never sent anywhere</strong>.</p>
        </div>
        <div id="pg" data-reveal>
          <div class="pg-out"><code id="pg-value">Click Generate&hellip;</code><button type="button" class="pg-copy" id="pg-copy">Copy</button></div>
          <div class="pg-bar-wrap"><div class="pg-bar" id="pg-bar"></div></div>
          <p class="pg-strlabel" id="pg-strlabel">&nbsp;</p>
          <div class="pg-tabs" role="tablist">
            <button type="button" data-mode="random" class="is-active" role="tab">Random password</button>
            <button type="button" data-mode="phrase" role="tab">Memorable passphrase</button>
          </div>
          <div class="pg-controls" id="pg-random">
            <div class="pg-field"><label>Length <output id="pg-len">16</output></label><input type="range" id="pg-len-r" min="8" max="40" value="16" aria-label="Password length"></div>
            <div class="pg-opts">
              <label><input type="checkbox" id="pg-upper" checked> Capitals A&ndash;Z</label>
              <label><input type="checkbox" id="pg-lower" checked> Letters a&ndash;z</label>
              <label><input type="checkbox" id="pg-num" checked> Numbers 0&ndash;9</label>
              <label><input type="checkbox" id="pg-sym" checked> Symbols !@#</label>
              <label><input type="checkbox" id="pg-ambig"> Avoid look-alikes (0/O, 1/l)</label>
            </div>
          </div>
          <div class="pg-controls" id="pg-phrase" hidden>
            <div class="pg-field"><label>Words <output id="pg-words">4</output></label><input type="range" id="pg-words-r" min="3" max="6" value="4" aria-label="Number of words"></div>
            <div class="pg-opts">
              <label><input type="checkbox" id="pg-cap" checked> Capitalise words</label>
              <label><input type="checkbox" id="pg-pnum" checked> Add a number</label>
              <label>Separator <select id="pg-sep"><option value="-">- (dash)</option><option value=".">. (dot)</option><option value="_">_ (underscore)</option><option value=" ">space</option></select></label>
            </div>
          </div>
          <div style="text-align:center;margin-top:1.2rem"><button type="button" class="button primary pg-go" id="pg-go">Generate</button></div>
          <p class="pg-hint">&#128274; Generated right here in your browser with secure randomness &mdash; never sent anywhere or stored.</p>
        </div>
        <div class="pg-fix">
          <h3>Too many passwords to remember?</h3>
          <p>That&rsquo;s exactly what a password manager is for &mdash; one strong password unlocks the rest, and it fills them in for you. We set them up for Dorset homes and businesses and show you how to use them, in plain English.</p>
          <div class="pg-fix-cta"><a class="button primary" href="/contact/">Get a password manager set up &#8594;</a><a class="button pg-ghost" href="/password-breach-checker/">Has yours been leaked?</a></div>
        </div>
      </div>
      <style>
      #pg{max-width:640px;margin:0 auto}
      #pg .pg-out{display:flex;gap:.5rem;align-items:stretch;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:.5rem .5rem .5rem .9rem}
      #pg #pg-value{flex:1;min-width:0;display:flex;align-items:center;font-family:var(--font-mono,monospace);font-size:1.15rem;color:#fff;word-break:break-all;overflow-wrap:anywhere}
      #pg .pg-copy{white-space:nowrap;font:inherit;font-weight:600;padding:.6rem 1rem;border-radius:9px;border:1px solid var(--cyan,#37c2c2);background:transparent;color:var(--cyan,#37c2c2);cursor:pointer}
      #pg .pg-copy.done{background:#2ecc71;border-color:#2ecc71;color:#04161a}
      #pg .pg-bar-wrap{height:7px;border-radius:99px;background:rgba(255,255,255,.1);margin:.9rem 0 .3rem;overflow:hidden}
      #pg .pg-bar{height:100%;width:0;border-radius:99px;transition:width .3s,background .3s}
      #pg .pg-strlabel{text-align:right;font-size:.78rem;margin:0 0 1.2rem;min-height:1em;color:var(--muted,#9aa6c2)}
      #pg .pg-tabs{display:flex;gap:.4rem;margin-bottom:1.1rem}
      #pg .pg-tabs button{flex:1;font:inherit;font-weight:600;padding:.65rem;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:transparent;color:inherit;cursor:pointer}
      #pg .pg-tabs button.is-active{background:var(--cyan,#37c2c2);color:#04161a;border-color:var(--cyan,#37c2c2)}
      #pg .pg-field label{display:flex;justify-content:space-between;font-size:.9rem;margin-bottom:.4rem}
      #pg .pg-field output{font-weight:700;color:var(--cyan,#37c2c2)}
      #pg input[type=range]{width:100%;accent-color:var(--cyan,#37c2c2);cursor:pointer;margin-bottom:1rem}
      #pg .pg-opts{display:flex;flex-direction:column;gap:.55rem;font-size:.92rem}
      #pg .pg-opts label{display:flex;align-items:center;gap:.5rem}
      #pg .pg-opts select{font:inherit;margin-left:auto;background:rgba(255,255,255,.06);color:inherit;border:1px solid rgba(255,255,255,.15);border-radius:7px;padding:.25rem .4rem}
      #pg .pg-opts input[type=checkbox]{accent-color:var(--cyan,#37c2c2);width:1.05rem;height:1.05rem}
      #pg .pg-hint{text-align:center;font-size:.76rem;color:var(--muted,#9aa6c2);margin:1rem 0 0;line-height:1.5}
      #pgtool .pg-fix{max-width:640px;margin:2rem auto 0;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #pgtool .pg-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #pgtool .pg-fix p{margin:0 auto 1.1rem;max-width:52ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #pgtool .pg-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      #pgtool .pg-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      </style>
      <script>
      (function(){
        var root=document.getElementById('pg'); if(!root) return;
        var WORDS=['apple','amber','anchor','apron','arrow','autumn','badge','banana','basket','beacon','blossom','bottle','branch','breeze','bridge','bronze','bubble','button','cabin','cactus','candle','canyon','carbon','castle','cedar','cherry','circle','clover','cobalt','comet','copper','coral','cotton','cricket','crown','crystal','daisy','dolphin','dragon','ember','engine','falcon','feather','ginger','glacier','granite','harbour','hazel','helmet','hollow','ivory','jacket','jasmine','jungle','kettle','lagoon','lantern','lemon','lily','lobster','lotus','magnet','mango','maple','marble','meadow','melon','meteor','mirror','mocha','monsoon','mountain','mushroom','nectar','needle','oasis','ocean','olive','onyx','orbit','otter','oyster','palace','pebble','pepper','pigeon','pillow','pirate','planet','pocket','pumpkin','quartz','rabbit','raccoon','ranch','ribbon','river','rocket','saddle','salmon','sapphire','shadow','shrimp','silver','sparrow','spruce','squirrel','sunset','temple','thunder','tiger','timber','tulip','turtle','velvet','violet','walnut','willow','wombat','zephyr'];
        var mode='random';
        var val=root.querySelector('#pg-value'), copy=root.querySelector('#pg-copy'), bar=root.querySelector('#pg-bar'), strlabel=root.querySelector('#pg-strlabel');
        var lenR=root.querySelector('#pg-len-r'), lenO=root.querySelector('#pg-len'), wordsR=root.querySelector('#pg-words-r'), wordsO=root.querySelector('#pg-words');
        function q(id){ return root.querySelector(id); }
        function secRand(max){ var a=new Uint32Array(1); var lim=Math.floor(4294967296/max)*max; do{ crypto.getRandomValues(a); }while(a[0]>=lim); return a[0]%max; }
        root.querySelectorAll('.pg-tabs button').forEach(function(b){ b.onclick=function(){ mode=b.getAttribute('data-mode'); root.querySelectorAll('.pg-tabs button').forEach(function(x){x.classList.toggle('is-active',x===b);}); q('#pg-random').hidden=(mode!=='random'); q('#pg-phrase').hidden=(mode!=='phrase'); generate(); }; });
        lenR.addEventListener('input',function(){ lenO.textContent=lenR.value; generate(); });
        wordsR.addEventListener('input',function(){ wordsO.textContent=wordsR.value; generate(); });
        root.querySelectorAll('#pg-random input, #pg-phrase input, #pg-phrase select').forEach(function(el){ el.addEventListener('change',generate); });
        function genRandom(){
          var U='ABCDEFGHIJKLMNOPQRSTUVWXYZ',L='abcdefghijklmnopqrstuvwxyz',N='0123456789',S='!@#$%^&*-_=+?';
          if(q('#pg-ambig').checked){ U=U.replace(/[IO]/g,''); L=L.replace(/[lo]/g,''); N=N.replace(/[01]/g,''); }
          var sets=[]; if(q('#pg-upper').checked)sets.push(U); if(q('#pg-lower').checked)sets.push(L); if(q('#pg-num').checked)sets.push(N); if(q('#pg-sym').checked)sets.push(S);
          if(!sets.length){ sets.push(L); }
          var all=sets.join(''), len=+lenR.value, out=[];
          sets.forEach(function(s){ out.push(s.charAt(secRand(s.length))); });
          while(out.length<len) out.push(all.charAt(secRand(all.length)));
          for(var i=out.length-1;i>0;i--){ var j=secRand(i+1); var t=out[i]; out[i]=out[j]; out[j]=t; }
          return {v:out.join(''), bits:Math.round(len*Math.log(all.length)/Math.log(2))};
        }
        function genPhrase(){
          var n=+wordsR.value, sep=q('#pg-sep').value, cap=q('#pg-cap').checked, out=[];
          for(var i=0;i<n;i++){ var w=WORDS[secRand(WORDS.length)]; if(cap) w=w.charAt(0).toUpperCase()+w.slice(1); out.push(w); }
          var s=out.join(sep), bits=Math.round(n*Math.log(WORDS.length)/Math.log(2));
          if(q('#pg-pnum').checked){ s+=sep+(secRand(90)+10); bits+=6; }
          return {v:s, bits:bits};
        }
        function showStrength(bits){
          var pct=Math.max(6,Math.min(100,Math.round(bits/1.28))), col, lab;
          if(bits<40){ col='#e74c3c'; lab='Weak'; } else if(bits<60){ col='#f1c40f'; lab='Fair'; } else if(bits<80){ col='#2ecc71'; lab='Strong'; } else { col='#2ecc71'; lab='Excellent'; }
          bar.style.width=pct+'%'; bar.style.background=col; strlabel.textContent=lab+' &middot; ~'+bits+' bits'; strlabel.innerHTML=lab+' &middot; ~'+bits+' bits of entropy';
        }
        function generate(){ var r=mode==='random'?genRandom():genPhrase(); val.textContent=r.v; showStrength(r.bits); copy.textContent='Copy'; copy.classList.remove('done'); }
        copy.addEventListener('click',function(){ var t=val.textContent; function ok(){ copy.textContent='Copied!'; copy.classList.add('done'); setTimeout(function(){ copy.textContent='Copy'; copy.classList.remove('done'); },1600); }
          if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(ok).catch(function(){}); } else { var ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy'); ok();}catch(e){} document.body.removeChild(ta); } });
        q('#pg-go').addEventListener('click',generate);
        generate();
      })();
      </script>
    </section>'''

# Shared Wi-Fi QR code generator (client-side QR render, password never leaves the browser) — /wifi-qr-code-generator/
WIFIQR_TOOL = r'''    <section class="section" aria-label="Wi-Fi QR code generator" id="wqtool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE WI-FI QR CODE</p>
          <h2 class="section-title section-title--center" data-title>Let guests join your Wi-Fi with a scan<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Make a QR code your guests scan to connect instantly &mdash; no more reading out the password. Perfect for cafés, offices, holiday lets and homes. <strong>Your password never leaves your browser.</strong></p>
        </div>
        <div id="wq" data-reveal>
          <div class="wq-grid">
            <form class="wq-form" id="wq-form" novalidate>
              <label class="wq-f"><span>Wi-Fi network name (SSID)</span><input id="wq-ssid" autocomplete="off" spellcheck="false" placeholder="e.g. 365 Techies Guest" required></label>
              <label class="wq-f" id="wq-pwrap"><span>Wi-Fi password</span><input id="wq-pass" type="text" autocomplete="off" spellcheck="false" placeholder="Your Wi-Fi password"></label>
              <label class="wq-f"><span>Security</span><select id="wq-sec"><option value="WPA">WPA / WPA2 / WPA3 (most common)</option><option value="WEP">WEP (older networks)</option><option value="nopass">None (open network)</option></select></label>
              <label class="wq-check"><input type="checkbox" id="wq-hidden"> This is a hidden network</label>
              <button type="submit" class="button primary wq-go">Create QR code</button>
            </form>
            <div class="wq-out">
              <div class="wq-placeholder" id="wq-ph">Your QR code will appear here &#128241;</div>
              <div class="wq-card" id="wq-card" hidden>
                <div class="wq-qr" id="wq-qr"></div>
                <p class="wq-scan">Scan to join Wi-Fi</p>
                <p class="wq-ssid" id="wq-ssidlabel"></p>
              </div>
              <button type="button" class="button wq-dl" id="wq-dl" hidden>Download as image &#8595;</button>
            </div>
          </div>
          <p class="wq-hint">&#128274; Made entirely in your browser &mdash; your Wi-Fi password is never sent anywhere or stored. Download it, print it, and pop it on the wall.</p>
        </div>
        <div class="wq-fix">
          <h3>Sorting out guest Wi-Fi for a business?</h3>
          <p>We set up fast, secure guest networks (kept separate from your business systems), fix Wi-Fi black-spots with mesh, and make it all just work &mdash; for cafés, offices and holiday lets across Dorset.</p>
          <div class="wq-fix-cta"><a class="button primary" href="/contact/">Get better Wi-Fi &#8594;</a><a class="button wq-ghost" href="/wifi-support/">Wi-Fi support</a></div>
        </div>
      </div>
      <style>
      #wq{max-width:820px;margin:0 auto}
      #wq .wq-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.6rem;align-items:start}
      #wq .wq-form{display:flex;flex-direction:column;gap:.9rem}
      #wq .wq-f{display:flex;flex-direction:column;gap:.35rem;font-size:.88rem}
      #wq .wq-f input,#wq .wq-f select{font:inherit;padding:.75rem .9rem;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:inherit}
      #wq .wq-f input:focus,#wq .wq-f select:focus{outline:none;border-color:var(--cyan,#37c2c2)}
      #wq .wq-check{display:flex;align-items:center;gap:.5rem;font-size:.88rem}
      #wq .wq-check input{accent-color:var(--cyan,#37c2c2);width:1.05rem;height:1.05rem}
      #wq .wq-go{margin-top:.3rem}
      #wq .wq-out{display:flex;flex-direction:column;align-items:center;gap:1rem;justify-content:center;min-height:220px}
      #wq .wq-placeholder{color:var(--muted,#9aa6c2);font-size:.9rem;text-align:center;border:1px dashed rgba(255,255,255,.18);border-radius:14px;padding:2.5rem 1rem;width:100%}
      #wq .wq-card{background:#fff;border-radius:16px;padding:1.1rem 1.1rem 1.3rem;text-align:center;max-width:260px}
      #wq .wq-qr svg{display:block;width:100%;height:auto;border-radius:8px}
      #wq .wq-scan{margin:.7rem 0 .1rem;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:#5a6b86}
      #wq .wq-ssid{margin:0;font-weight:700;color:#070d22;word-break:break-word}
      #wq .wq-dl{background:transparent;border:1px solid var(--cyan,#37c2c2);color:var(--cyan,#37c2c2)}
      #wq .wq-hint{text-align:center;font-size:.76rem;color:var(--muted,#9aa6c2);margin:1.2rem 0 0;line-height:1.5}
      #wqtool .wq-fix{max-width:820px;margin:2rem auto 0;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #wqtool .wq-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #wqtool .wq-fix p{margin:0 auto 1.1rem;max-width:54ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #wqtool .wq-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      #wqtool .wq-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      @media(max-width:640px){#wq .wq-grid{grid-template-columns:1fr}}
      </style>
      <script>
      (function(){
        var root=document.getElementById('wq'); if(!root) return;
        var LIB='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js', libp=null;
        var form=root.querySelector('#wq-form'), ssid=root.querySelector('#wq-ssid'), pass=root.querySelector('#wq-pass'), sec=root.querySelector('#wq-sec'), hid=root.querySelector('#wq-hidden'), pwrap=root.querySelector('#wq-pwrap');
        var ph=root.querySelector('#wq-ph'), card=root.querySelector('#wq-card'), qrbox=root.querySelector('#wq-qr'), ssidlabel=root.querySelector('#wq-ssidlabel'), dl=root.querySelector('#wq-dl');
        sec.addEventListener('change',function(){ pwrap.style.display = sec.value==='nopass'?'none':''; });
        function ensureLib(){ if(window.qrcode) return Promise.resolve(); if(libp) return libp; libp=new Promise(function(res,rej){ var s=document.createElement('script'); s.src=LIB; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); return libp; }
        function escw(s){ return String(s).replace(/([\\;,":])/g,'\\$1'); }
        form.addEventListener('submit',function(e){
          e.preventDefault();
          var name=ssid.value.trim(); if(!name){ ssid.focus(); return; }
          var t=sec.value, str='WIFI:T:'+t+';S:'+escw(name)+';';
          if(t!=='nopass') str+='P:'+escw(pass.value)+';';
          if(hid.checked) str+='H:true;';
          str+=';';
          var btn=form.querySelector('.wq-go'); btn.disabled=true;
          ensureLib().then(function(){
            var qr=window.qrcode(0,'M'); qr.addData(str); qr.make();
            var n=qr.getModuleCount(), cell=8, m=4, size=(n+m*2)*cell;
            var sv='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+size+' '+size+'" role="img" aria-label="Wi-Fi QR code"><rect width="'+size+'" height="'+size+'" fill="#ffffff"/>';
            for(var r=0;r<n;r++){ for(var c=0;c<n;c++){ if(qr.isDark(r,c)) sv+='<rect x="'+((c+m)*cell)+'" y="'+((r+m)*cell)+'" width="'+cell+'" height="'+cell+'" fill="#070d22"/>'; } }
            sv+='</svg>';
            qrbox.innerHTML=sv; ssidlabel.textContent=name; ph.hidden=true; card.hidden=false; dl.hidden=false; btn.disabled=false;
          }).catch(function(){ ph.textContent='Couldn’t load the QR generator — please check your connection and try again.'; btn.disabled=false; });
        });
        dl.addEventListener('click',function(){
          var svg=qrbox.querySelector('svg'); if(!svg) return;
          var xml=new XMLSerializer().serializeToString(svg);
          var img=new Image();
          img.onload=function(){ var cv=document.createElement('canvas'); cv.width=640; cv.height=640; var ctx=cv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,640,640); ctx.drawImage(img,0,0,640,640); var a=document.createElement('a'); a.download='wifi-qr-code.png'; a.href=cv.toDataURL('image/png'); a.click(); };
          img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(xml)));
        });
      })();
      </script>
    </section>'''

# Shared DNS / domain lookup (Google DNS-over-HTTPS, no key) — /dns-lookup/
DNS_TOOL = r'''    <section class="section" aria-label="DNS lookup" id="dnstool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE DNS LOOKUP</p>
          <h2 class="section-title section-title--center" data-title>Look up any domain&rsquo;s DNS records<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>See the DNS records behind any domain &mdash; the settings that point your website and email to the right place. Handy for checking your own setup, or troubleshooting.</p>
        </div>
        <div id="dns" data-reveal>
          <form class="dns-form" id="dns-form" novalidate>
            <input type="text" id="dns-domain" inputmode="url" autocomplete="off" spellcheck="false" placeholder="yourdomain.co.uk" aria-label="Domain to look up" required>
            <button type="submit" class="button primary dns-go">Look up records</button>
          </form>
          <p class="dns-hint">Reads the public DNS records for any domain, live &mdash; nothing is stored.</p>
          <div class="dns-loading" id="dns-loading" hidden><div class="dns-spinner" aria-hidden="true"></div><p>Looking up DNS records&hellip;</p></div>
          <div class="dns-error" id="dns-error" hidden></div>
          <div class="dns-results" id="dns-results" hidden>
            <p class="dns-for">Records for <span id="dns-dom"></span></p>
            <div id="dns-cards"></div>
          </div>
        </div>
        <div class="dns-fix">
          <h3>Website or email pointing to the wrong place?</h3>
          <p>DNS is the plumbing behind your website and email &mdash; and it&rsquo;s easy to get wrong. We set up domains, move websites, sort business email and fix DNS problems for homes and businesses across Dorset.</p>
          <div class="dns-fix-cta"><a class="button primary" href="/contact/">Get DNS &amp; domain help &#8594;</a><a class="button dns-ghost" href="/email-security-checker/">Check your email security</a></div>
        </div>
      </div>
      <style>
      #dns{max-width:720px;margin:0 auto}
      #dns .dns-form{display:flex;gap:.6rem;flex-wrap:wrap;align-items:stretch}
      #dns #dns-domain{flex:1 1 240px;min-width:0;padding:.95rem 1.1rem;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:inherit;font:inherit}
      #dns #dns-domain:focus{outline:none;border-color:var(--cyan,#37c2c2)}
      #dns .dns-go{white-space:nowrap}
      #dns .dns-hint{font-size:.78rem;color:var(--muted,#9aa6c2);margin:.6rem 0 0}
      #dns .dns-loading{text-align:center;padding:2rem 1rem}
      #dns .dns-spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,.14);border-top-color:var(--cyan,#37c2c2);margin:0 auto 1rem;animation:dns-spin 1s linear infinite}
      @keyframes dns-spin{to{transform:rotate(360deg)}}
      #dns .dns-error{margin-top:1.3rem;padding:1rem 1.2rem;border-radius:12px;border:1px solid rgba(231,76,60,.45);background:rgba(231,76,60,.1);font-size:.92rem}
      #dns .dns-results{margin-top:1.8rem}
      #dns .dns-for{text-align:center;color:var(--muted,#9aa6c2);font-size:.9rem;margin:0 0 1.2rem}
      #dns .dns-for span{color:var(--cyan,#37c2c2);font-weight:700;word-break:break-all}
      #dns .dns-card{padding:.9rem 1.1rem;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);margin-bottom:.7rem}
      #dns .dns-k{margin:0 0 .5rem;font-size:.82rem;font-weight:700;color:#fff}
      #dns .dns-k span{font-family:var(--font-mono,monospace);font-size:.7rem;color:var(--cyan,#37c2c2);border:1px solid rgba(55,194,194,.4);border-radius:5px;padding:.05rem .35rem;margin-left:.4rem}
      #dns .dns-card ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.35rem}
      #dns .dns-card li{font-family:var(--font-mono,monospace);font-size:.82rem;color:var(--faint,#9fb5d3);word-break:break-all;background:rgba(0,0,0,.22);padding:.4rem .6rem;border-radius:7px}
      #dns .dns-none{margin:0;font-size:.82rem;color:var(--muted,#9aa6c2);opacity:.75}
      #dnstool .dns-fix{max-width:720px;margin:2rem auto 0;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #dnstool .dns-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #dnstool .dns-fix p{margin:0 auto 1.1rem;max-width:54ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #dnstool .dns-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      #dnstool .dns-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      @media(max-width:560px){#dns .dns-go{flex:1 1 100%}}
      </style>
      <script>
      (function(){
        var root=document.getElementById('dns'); if(!root) return;
        var form=root.querySelector('#dns-form'), input=root.querySelector('#dns-domain');
        var load=root.querySelector('#dns-loading'), err=root.querySelector('#dns-error'), res=root.querySelector('#dns-results'), cards=root.querySelector('#dns-cards'), domEl=root.querySelector('#dns-dom');
        var TMAP={A:1,AAAA:28,CNAME:5,MX:15,NS:2,TXT:16};
        var LIST=[['A','Website server (IPv4)'],['AAAA','Website server (IPv6)'],['CNAME','Alias (CNAME)'],['MX','Mail servers'],['NS','Nameservers'],['TXT','TXT records (SPF, verification…)']];
        function esc(s){var d=document.createElement('div');d.textContent=(s==null?'':s);return d.innerHTML;}
        function norm(v){ v=(v||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/[\/?#].*$/,'').replace(/\s+/g,''); if(v.indexOf('@')>=0) v=v.split('@').pop(); return v; }
        function lookup(name,type){ return fetch('https://dns.google/resolve?name='+encodeURIComponent(name)+'&type='+type).then(function(r){return r.json();}).then(function(d){ var num=TMAP[type]; return (d.Answer||[]).filter(function(a){return a.type===num;}).map(function(a){ return String(a.data).replace(/^"|"$/g,'').replace(/"\s+"/g,''); }); }).catch(function(){ return []; }); }
        form.addEventListener('submit',function(e){
          e.preventDefault();
          var d=norm(input.value); if(!d||d.indexOf('.')<0){ input.focus(); return; }
          res.hidden=true; err.hidden=true; load.hidden=false; var btn=form.querySelector('.dns-go'); btn.disabled=true;
          Promise.all(LIST.map(function(t){ return lookup(d,t[0]).then(function(v){ return {code:t[0],label:t[1],vals:v}; }); })).then(function(rows){
            load.hidden=true; btn.disabled=false;
            if(!rows.some(function(r){return r.vals.length;})){ err.innerHTML='No DNS records found for that domain &mdash; check the spelling and try again.'; err.hidden=false; res.hidden=true; return; }
            domEl.textContent=d;
            var h=''; rows.forEach(function(r){ h+='<div class="dns-card"><p class="dns-k">'+r.label+' <span>'+r.code+'</span></p>'; if(r.vals.length){ h+='<ul>'; r.vals.forEach(function(v){ h+='<li>'+esc(v)+'</li>'; }); h+='</ul>'; } else h+='<p class="dns-none">None found</p>'; h+='</div>'; });
            cards.innerHTML=h; res.hidden=false;
            try{ res.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
          }).catch(function(){ load.hidden=true; btn.disabled=false; err.innerHTML='We couldn&rsquo;t reach the DNS service just now &mdash; please try again in a moment.'; err.hidden=false; });
        });
      })();
      </script>
    </section>'''

# ---- Central free-tools registry + contextual strip -------------------------
# One source of truth for every interactive tool: key -> (name, href, blurb).
# Used by the /free-tools/ hub and by tools_strip() cross-links on service pages.
TOOLS = {
  "website":      ("Website Checker", "/website-checker/", "Test any site&rsquo;s speed, SEO, security &amp; mobile-friendliness with Google&rsquo;s Lighthouse engine."),
  "emailsec":     ("Email Security Checker", "/email-security-checker/", "Could scammers spoof your email? Check your SPF, DKIM &amp; DMARC in seconds."),
  "breach":       ("Password Breach Checker", "/password-breach-checker/", "Has your password leaked? Check privately against billions of breached passwords."),
  "pwgen":        ("Password Generator", "/password-generator/", "Create a strong random password or a memorable passphrase in one click."),
  "pwstrength":   ("Password Strength Checker", "/password-strength-checker/", "Test a password&rsquo;s strength privately, right in your browser."),
  "privacy":      ("Privacy Checker", "/what-websites-know/", "See exactly what any website can learn about you the moment you land on it."),
  "scamlink":     ("Link Safety Checker", "/link-safety-checker/", "Got a dodgy-looking link in a text or email? Paste it to spot the phishing signs &mdash; safely."),
  "scamquiz":     ("Spot the Scam Quiz", "/spot-the-scam/", "Can you tell a scam from the real thing? Take the free 6-round quiz."),
  "speed":        ("Live Broadband Speed Test", "/broadband-speed-checker/", "Measure your real download, upload and ping right now on a live animated gauge."),
  "wifiqr":       ("Wi-Fi QR Code Generator", "/wifi-qr-code-generator/", "Make a QR code guests scan to join your Wi-Fi &mdash; no typing the password."),
  "qrgen":        ("QR Code Generator", "/qr-code-generator/", "Turn any link, text, email or phone number into a scannable QR code &mdash; download &amp; print."),
  "emailsig":     ("Email Signature Generator", "/email-signature-generator/", "Create a professional email signature in one minute &mdash; live preview, copy straight into Outlook or Gmail."),
  "ssl":          ("SSL Certificate Checker", "/ssl-checker/", "Is your website&rsquo;s padlock healthy? Check any SSL certificate &mdash; and when it expires."),
  "domainexp":    ("Domain Expiry Checker", "/domain-expiry-checker/", "When does your domain expire? Check the official registry record before you lose it."),
  "solarcalc":    ("Battery &amp; Solar Calculator", "/solar-battery-calculator/", "Campervan, boat or off-grid? Tick what you run and get an honest battery &amp; solar panel sizing."),
  "avtest":       ("Webcam &amp; Mic Test", "/webcam-mic-test/", "Video call in ten minutes? Test your camera, microphone and speakers &mdash; privately, on your device."),
  "vbuilder":     ("Victron System Builder", "/victron-system-builder/", "Four questions &#8594; a complete, honestly-sized Victron kit list with links to buy every part."),
  "pcbuild":      ("Custom PC Builder", "/custom-pc-builder/", "Your budget, split the way experienced builders do it &mdash; what to spend per part, and live links to buy."),
  "dns":          ("DNS Lookup", "/dns-lookup/", "Check any domain&rsquo;s A, MX, NS &amp; TXT records &mdash; the settings behind your website and email."),
  "pcbench":      ("PC Benchmark", "/pc-benchmark/", "How fast is your computer, really? Six live tests &mdash; CPU, encryption, memory, graphics &amp; storage &mdash; with a score you can share."),
  "healthcheck":  ("IT Health Check Tool", "/it-health-check-tool/", "Get an instant IT &amp; security score out of 100, plus a plain-English action plan."),
  "faultcheck":   ("Computer Fault Checker", "/computer-fault-checker/", "Tell us what&rsquo;s playing up and get the likely cause and best next step."),
  "repairreplace":("Repair or Replace?", "/repair-or-replace-advisor/", "Answer four questions for an honest verdict on your ageing computer."),
  "w10":          ("Windows 10 End of Life", "/windows-10-end-of-life/", "Support has ended &mdash; find out in 30 seconds if you&rsquo;re affected, and your options."),
  "costcalc":     ("Cost Calculator", "/cost-calculator/", "Build your plan with live sliders and see your monthly IT support cost as you go."),
  "planfinder":   ("Plan Finder", "/plan-finder/", "Answer three quick questions and we&rsquo;ll recommend the right plan for you."),
  "quickquote":   ("Quick Quote", "/quick-quote/", "Get a free, no-obligation quote or cost comparison in under a minute."),
  "downtime":     ("Downtime Cost Calculator", "/downtime-cost-calculator/", "See what IT downtime could really be costing your business &mdash; from your own numbers."),
  "m365picker":   ("Which Microsoft 365 Plan?", "/which-microsoft-365-plan/", "Personal, Family or Business? Find the right licence in 30 seconds."),
  "coverage":     ("Coverage Checker", "/coverage-checker/", "Pop in your postcode to see if we cover your area for on-site visits."),
  "broadbandcheck":("Broadband Switch Checker", "/broadband-checker/", "Could you get faster broadband for less? See what your line can really do."),
  "whatlose":     ("What Would You Lose?", "/what-would-you-lose/", "A 20-second check of how safe your photos, files and records really are."),
  "aicalc":       ("AI ROI Calculator", "/ai-roi-calculator/", "Could AI genuinely save your business time and money? Work it out."),
  "servercloud":  ("Server or Cloud?", "/server-or-cloud-picker/", "Get a clear, jargon-free steer on the right setup for your business."),
  "isitdown":     ("Is It Down?", "/is-it-down/", "Facebook quiet? Email dead? Live status for 30+ big services &mdash; and whether it&rsquo;s them or your connection."),
  "speccheck":    ("PC Hardware Checker", "/computer-spec-checker/", "What&rsquo;s inside your computer? OS, graphics card, screen, memory and more &mdash; revealed instantly, nothing installed."),
  "gpubench":     ("Graphics Card Benchmark", "/graphics-card-benchmark/", "How powerful is your GPU? A live 3D WebGL benchmark &mdash; graphics score, live FPS, advanced stress tests and honest advice."),
  "safetycourse": ("Free Online Safety Course", "/online-safety-course/", "Spot scam emails, texts &amp; calls, use safe passwords and shop safely &mdash; a free, friendly 6-lesson course with a certificate."),
}

def tool_cards(keys):
    out = ""
    for k in keys:
        name, href, blurb = TOOLS[k]
        out += (f'          <a class="post-card" href="{href}"><p class="post-card__cat">Free tool</p><h3>{name}</h3>'
                f'<p>{blurb}</p><span class="post-card__more">Try it &#8594;</span></a>\n')
    return out

def tools_strip(keys, title="Try our free tools", lede_text="No sign-up, no catch — free tools built by our techies.", alt=True):
    """Compact cross-link band of relevant free tools for service pages."""
    cls = "blog-section section--alt" if alt else "blog-section"
    return f'''    <section class="{cls}" aria-label="Free tools">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE TOOLS</p>
          <h2 class="section-title section-title--center" data-title>{title}<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>{lede_text} <a href="/free-tools/">See all our free tools &#8594;</a></p>
        </div>
        <div class="blog-grid" data-stagger>
{tool_cards(keys)}        </div>
      </div>
    </section>'''

# Shared PC benchmark (ULTIMATE: 6 tests — CPU single/multi via Web Workers, SHA-256 crypto, memory, WebGL graphics, Cache-API storage —
# with live readouts, comparison spectrum, run history, battery detection and a downloadable share card. All in-browser, no key).
# Score bands calibrated against a real 11th-gen i5-1135G7 (8 threads): 305M iter/s single, 1791M multi, 911 MB/s SHA-256, ~11.8GB/s copy = score 70.
PCBENCH_TOOL = r'''    <section class="section" aria-label="PC benchmark" id="benchtool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE PC BENCHMARK</p>
          <h2 class="section-title section-title--center" data-title>How fast is your computer, really?<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Six real tests &mdash; <strong>processor (single &amp; all cores), encryption, memory, graphics and storage</strong> &mdash; run live in your browser with a clear score, honest advice and a share card. No downloads, no sign-up.</p>
        </div>
        <div id="bm" data-reveal>
          <div class="bm-device" id="bm-device"></div>
          <div style="text-align:center"><button type="button" class="button primary bm-start" id="bm-start">Start benchmark</button></div>
          <p class="bm-hint">Takes about 20 seconds and will make your computer work hard (the fan may spin up briefly) &mdash; that&rsquo;s normal, and it does no harm. Close other heavy programs, and plug laptops in, for the fairest score.</p>
          <div class="bm-running" id="bm-running" hidden>
            <p class="bm-phase" id="bm-phase">Warming up&hellip;</p>
            <p class="bm-live mono" id="bm-live">&nbsp;</p>
            <div class="bm-prog-wrap"><div class="bm-prog" id="bm-prog"></div></div>
            <canvas id="bm-canvas" width="640" height="360" hidden></canvas>
          </div>
          <div class="bm-results" id="bm-results" hidden>
            <div class="bm-top">
              <div class="bm-ring-wrap">
                <div class="bm-ring"><svg viewBox="0 0 120 120"><circle class="bm-ring-track" cx="60" cy="60" r="54"></circle><circle class="bm-ring-val" id="bm-ring" cx="60" cy="60" r="54" stroke-dasharray="339.292" stroke-dashoffset="339.292"></circle></svg><span class="bm-ring-num" id="bm-score">0</span></div>
                <p class="bm-ring-lab">365 Benchmark Score</p>
              </div>
              <div class="bm-verdict" id="bm-verdict"></div>
            </div>
            <div class="bm-scale-wrap">
              <p class="bm-scale-title">Where you land <span>(indicative reference points)</span></p>
              <div class="bm-scale"><div class="bm-scale-fill" id="bm-scale-fill"></div><i class="bm-scale-me" id="bm-scale-me"><b>You</b></i></div>
              <div class="bm-scale-ticks">
                <span style="left:15%">Older laptop<br>&amp; hard drive</span>
                <span style="left:50%">Typical office<br>PC (~2017)</span>
                <span style="left:72%">Modern<br>mid-range</span>
                <span style="left:95%">High-end<br>desktop</span>
              </div>
            </div>
            <div class="bm-rows" id="bm-rows"></div>
            <div id="bm-history"></div>
            <div id="bm-notes"></div>
            <div class="bm-actions">
              <button type="button" class="button bm-ghost" id="bm-dl">Download score card &#8595;</button>
              <button type="button" class="button bm-ghost" id="bm-copy">Copy my results</button>
            </div>
            <div class="bm-fix" id="bm-fix"></div>
          </div>
        </div>
        <p class="bm-powered">An indicative browser benchmark &mdash; real-world speed also depends on startup programs, disk health, updates and malware. Scores are our own 0&ndash;100 scale and aren&rsquo;t comparable with native benchmark suites.</p>
      </div>
      <style>
      #bm{max-width:760px;margin:0 auto}
      #bm .bm-device{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin-bottom:1.2rem}
      #bm .bm-chip{font-size:.76rem;padding:.35rem .7rem;border-radius:99px;border:1px solid rgba(255,255,255,.14);color:var(--muted,#9aa6c2)}
      #bm .bm-chip b{color:#fff;font-weight:600}
      #bm .bm-hint{text-align:center;font-size:.76rem;color:var(--muted,#9aa6c2);margin:.9rem auto 0;max-width:56ch;line-height:1.5}
      #bm .bm-running{text-align:center;padding:1.6rem 0 0}
      #bm .bm-phase{font-size:1rem;font-weight:600;margin:0 0 .2rem;min-height:1.3em}
      #bm .bm-live{font-size:1.7rem;font-weight:700;color:var(--cyan,#37c2c2);margin:0 0 .9rem;min-height:1.3em;font-variant-numeric:tabular-nums}
      #bm .bm-prog-wrap{height:8px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;max-width:440px;margin:0 auto 1.2rem}
      #bm .bm-prog{height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#1d97e3,#00ce1b);transition:width .5s}
      #bm #bm-canvas{width:100%;max-width:440px;border-radius:12px;border:1px solid rgba(255,255,255,.14);margin:0 auto;display:block}
      #bm .bm-results{margin-top:1.6rem}
      #bm .bm-top{display:grid;grid-template-columns:auto 1fr;gap:1.6rem;align-items:center;margin-bottom:1.6rem}
      #bm .bm-ring{position:relative;width:132px;aspect-ratio:1;margin:0 auto}
      #bm .bm-ring svg{width:100%;display:block;transform:rotate(-90deg)}
      #bm .bm-ring-track{fill:none;stroke:rgba(255,255,255,.1);stroke-width:10}
      #bm .bm-ring-val{fill:none;stroke-width:10;stroke-linecap:round;transition:stroke-dashoffset 1.2s cubic-bezier(.3,.8,.3,1)}
      #bm .bm-ring-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:2.1rem;font-weight:800;font-variant-numeric:tabular-nums}
      #bm .bm-ring-lab{text-align:center;font-size:.72rem;color:var(--muted,#9aa6c2);margin:.5rem 0 0;text-transform:uppercase;letter-spacing:.06em}
      #bm .bm-good .bm-ring-val{stroke:#2ecc71}#bm .bm-good .bm-ring-num{color:#2ecc71}
      #bm .bm-avg .bm-ring-val{stroke:#f1c40f}#bm .bm-avg .bm-ring-num{color:#f1c40f}
      #bm .bm-poor .bm-ring-val{stroke:#e74c3c}#bm .bm-poor .bm-ring-num{color:#e74c3c}
      #bm .bm-verdict-g{margin:0 0 .35rem;font-size:1.45rem;font-weight:800}
      #bm .bm-verdict p{margin:0;color:var(--muted,#9aa6c2);font-size:.93rem;line-height:1.6}
      #bm .bm-good .bm-verdict-g{color:#2ecc71}#bm .bm-avg .bm-verdict-g{color:#f1c40f}#bm .bm-poor .bm-verdict-g{color:#e74c3c}
      #bm .bm-scale-wrap{margin:0 0 1.8rem;padding:1.1rem 1.2rem 3.1rem;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08)}
      #bm .bm-scale-title{margin:0 0 .9rem;font-size:.85rem;font-weight:700;color:#fff}
      #bm .bm-scale-title span{font-weight:400;color:var(--muted,#9aa6c2);font-size:.74rem}
      #bm .bm-scale{position:relative;height:10px;border-radius:99px;background:linear-gradient(90deg,#e74c3c,#f1c40f 45%,#2ecc71 75%)}
      #bm .bm-scale-fill{display:none}
      #bm .bm-scale-me{position:absolute;top:-9px;width:4px;height:28px;background:#fff;border-radius:2px;transform:translateX(-50%);transition:left 1.2s cubic-bezier(.3,.8,.3,1)}
      #bm .bm-scale-me b{position:absolute;top:-20px;left:50%;transform:translateX(-50%);font-size:.68rem;color:#fff;letter-spacing:.04em}
      #bm .bm-scale-ticks{position:relative;height:0}
      #bm .bm-scale-ticks span{position:absolute;top:14px;transform:translateX(-50%);font-size:.64rem;color:var(--muted,#9aa6c2);text-align:center;line-height:1.35;white-space:nowrap}
      #bm .bm-rows{display:flex;flex-direction:column;gap:.75rem}
      #bm .bm-row{padding:.8rem 1rem;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08)}
      #bm .bm-row-h{display:flex;justify-content:space-between;gap:1rem;font-size:.88rem;margin-bottom:.45rem}
      #bm .bm-row-h b{color:#fff}
      #bm .bm-row-h span{color:var(--muted,#9aa6c2);font-variant-numeric:tabular-nums;white-space:nowrap}
      #bm .bm-bar-wrap{height:7px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}
      #bm .bm-bar{height:100%;width:0;border-radius:99px;transition:width 1s ease}
      #bm .bm-bar.g{background:#2ecc71}#bm .bm-bar.a{background:#f1c40f}#bm .bm-bar.p{background:#e74c3c}
      #bm .bm-note{margin:.9rem 0 0;padding:.75rem 1rem;border-radius:10px;background:rgba(255,255,255,.03);border-left:4px solid #f1c40f;font-size:.86rem;color:var(--muted,#9aa6c2);line-height:1.55}
      #bm .bm-note b{color:#fff}
      #bm .bm-note.bm-note-good{border-left-color:#2ecc71}
      #bm .bm-actions{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center;margin-top:1.6rem}
      #bm .bm-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      #bm .bm-ghost.done{border-color:#2ecc71;color:#2ecc71}
      #bm .bm-fix{margin-top:1.6rem;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #bm .bm-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #bm .bm-fix p{margin:0 auto 1.1rem;max-width:52ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #bm .bm-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      .bm-powered{text-align:center;font-size:.72rem;color:var(--muted,#9aa6c2);margin:1.4rem auto 0;opacity:.8;max-width:64ch;line-height:1.5}
      @media(max-width:560px){#bm .bm-top{grid-template-columns:1fr}#bm .bm-verdict{text-align:center}#bm .bm-scale-ticks span{white-space:normal;max-width:70px}}
      </style>
      <script>
      (function(){
        var root=document.getElementById('bm'); if(!root) return;
        var KERNEL="function K(seed,n){var x=seed>>>0,acc=0;for(var i=0;i<n;i++){x^=(x<<13);x=x>>>0;x^=(x>>>17);x^=(x<<5);x=x>>>0;acc+=(x&255);if((i&1023)===0){acc+=Math.sqrt(x%1000)|0;}}return acc>>>0;}";
        var CPUW=KERNEL+"onmessage=function(e){var ms=e.data,t0=performance.now(),it=0,last=t0;for(;;){K(12345+it,200000);it+=200000;var now=performance.now();if(now-last>140){postMessage({t:0,v:it/((now-t0)/1000)});last=now;}if(now-t0>=ms)break;}postMessage({t:1,v:it/((performance.now()-t0)/1000)});};";
        var MEMW="onmessage=function(){var MB=1048576,src=new Uint8Array(16*MB),dst=new Uint8Array(16*MB),i;for(i=0;i<src.length;i+=4096)src[i]=i&255;var t0=performance.now(),bytes=0,acc=0,last=t0;for(;;){dst.set(src);bytes+=src.length;for(i=0;i<dst.length;i+=65536)acc+=dst[i];var now=performance.now();if(now-last>160){postMessage({t:0,v:(bytes/MB)/((now-t0)/1000)});last=now;}if(now-t0>=1400)break;}postMessage({t:1,v:(bytes/MB)/((performance.now()-t0)/1000)+(acc&0)});};";
        var startBtn=root.querySelector('#bm-start'), running=root.querySelector('#bm-running'), phaseEl=root.querySelector('#bm-phase'), liveEl=root.querySelector('#bm-live'), prog=root.querySelector('#bm-prog');
        var results=root.querySelector('#bm-results'), canvas=root.querySelector('#bm-canvas'), busy=false;
        var cores=navigator.hardwareConcurrency||4, LAST={};
        function gpuName(){ try{ var gl=document.createElement('canvas').getContext('webgl'); if(!gl) return null; var ext=gl.getExtension('WEBGL_debug_renderer_info'); return ext?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):null; }catch(e){ return null; } }
        function osName(){ var u=navigator.userAgent; if(/Windows/i.test(u))return 'Windows'; if(/Android/i.test(u))return 'Android'; if(/iPhone|iPad/i.test(u))return 'iOS'; if(/Mac/i.test(u))return 'macOS'; if(/CrOS/i.test(u))return 'ChromeOS'; if(/Linux/i.test(u))return 'Linux'; return null; }
        function browserName(){ var u=navigator.userAgent; if(/Edg\//.test(u))return 'Edge'; if(/OPR|Opera/.test(u))return 'Opera'; if(/SamsungBrowser/.test(u))return 'Samsung Internet'; if(/Chrome\//.test(u))return 'Chrome'; if(/Firefox\//.test(u))return 'Firefox'; if(/Safari\//.test(u))return 'Safari'; return null; }
        var DEVLINE='';
        (function(){ var chips=[]; var os=osName(); if(os)chips.push('<b>'+os+'</b>');
          var br=browserName(); if(br)chips.push('<b>'+br+'</b>');
          chips.push('<b>'+cores+'</b> CPU threads');
          if(navigator.deviceMemory)chips.push('<b>'+navigator.deviceMemory+'&nbsp;GB+</b> RAM (approx)');
          if(screen&&screen.width)chips.push('<b>'+screen.width+'&times;'+screen.height+'</b>');
          var g=gpuName(); if(g){ g=g.replace(/ANGLE \(|\)$/g,'').split(',').slice(0,2).join(','); if(g.length>46)g=g.slice(0,44)+'…'; chips.push('<b>'+g.replace(/</g,'&lt;')+'</b>'); }
          root.querySelector('#bm-device').innerHTML=chips.map(function(c){return '<span class="bm-chip">'+c+'</span>';}).join('');
          DEVLINE=[os,br,(cores+' threads'),(navigator.deviceMemory?navigator.deviceMemory+'GB+ RAM':null)].filter(Boolean).join(' · '); })();
        function worker(src,msg,tmo,onP){ return new Promise(function(res,rej){ try{ var u=URL.createObjectURL(new Blob([src],{type:'application/javascript'})); var w=new Worker(u); var t=setTimeout(function(){ try{w.terminate();}catch(e){} rej(new Error('timeout')); },tmo||20000);
          w.onmessage=function(e){ var d=e.data; if(d&&d.t===1){ clearTimeout(t); try{w.terminate();}catch(x){} URL.revokeObjectURL(u); res(d.v); } else if(d&&d.t===0){ if(onP)onP(d.v); } };
          w.onerror=function(){ clearTimeout(t); try{w.terminate();}catch(x){} rej(new Error('worker')); };
          w.postMessage(msg); }catch(e){ rej(e); } }); }
        function cryptoTest(onP){ if(!(window.crypto&&crypto.subtle&&crypto.subtle.digest)) return Promise.resolve(null);
          var buf=new Uint8Array(8*1048576); for(var i=0;i<buf.length;i+=512)buf[i]=(i*13)&255;
          var t0=performance.now(), mb=0;
          function step(){ return crypto.subtle.digest('SHA-256',buf).then(function(){ mb+=8; var el=performance.now()-t0; var rate=mb/(el/1000); if(onP)onP(rate); return el<1200?step():rate; }); }
          return step().catch(function(){ return null; }); }
        function gpuTest(onP){ return new Promise(function(res){ var gl;
          try{ gl=canvas.getContext('webgl',{powerPreference:'high-performance'})||canvas.getContext('experimental-webgl'); }catch(e){}
          if(!gl){ res(null); return; }
          function sh(t,s){ var o=gl.createShader(t); gl.shaderSource(o,s); gl.compileShader(o); return gl.getShaderParameter(o,gl.COMPILE_STATUS)?o:null; }
          var vs=sh(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');
          var fs=sh(gl.FRAGMENT_SHADER,'precision mediump float;uniform float u;void main(){vec2 q=gl_FragCoord.xy*0.02;float v=sin(q.x+u)*cos(q.y-u)+sin(q.x*0.7+q.y*1.3+u*2.0);gl_FragColor=vec4(0.1+0.5*abs(sin(u+v)),0.25+0.45*abs(v*0.5),0.55+0.35*abs(cos(u-v)),0.35);}');
          if(!vs||!fs){ res(null); return; }
          var pr=gl.createProgram(); gl.attachShader(pr,vs); gl.attachShader(pr,fs); gl.linkProgram(pr);
          if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){ res(null); return; }
          gl.useProgram(pr);
          var buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf);
          gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
          var loc=gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
          var uu=gl.getUniformLocation(pr,'u');
          gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
          var LEVELS=[6,18,48,120], li=0, frames=0, t0=performance.now(), held=0, topFps=0, lastP=t0, raf;
          function frame(){ var t=(performance.now()-t0)/1000;
            gl.clearColor(0.03,0.05,0.13,1); gl.clear(gl.COLOR_BUFFER_BIT);
            var n=LEVELS[li];
            for(var i=0;i<n;i++){ gl.uniform1f(uu,t*1.7+i*0.37); gl.drawArrays(gl.TRIANGLES,0,3); }
            frames++;
            var now=performance.now(), el=now-t0;
            if(onP&&now-lastP>300&&el>200){ onP('level '+(li+1)+'/4 · '+Math.round(frames/(el/1000))+' fps'); lastP=now; }
            if(el>=1100){ var fps=frames/(el/1000); topFps=fps;
              if(fps>=45){ held++; li++; if(li>=LEVELS.length){ done(); return; } frames=0; t0=performance.now(); }
              else { done(); return; } }
            raf=requestAnimationFrame(frame); }
          function done(){ try{ cancelAnimationFrame(raf); }catch(e){} res({held:held, fps:topFps}); }
          raf=requestAnimationFrame(frame); }); }
        function storeTest(){ if(!('caches' in window)) return Promise.resolve(null);
          var data=new Uint8Array(4*1048576); for(var i=0;i<data.length;i+=1024)data[i]=(i*7)&255;
          var blob=new Blob([data]), c;
          return caches.open('tt-bench').then(function(cc){ c=cc; var t0=performance.now(), p=Promise.resolve();
            [0,1,2].forEach(function(k){ p=p.then(function(){ return c.put('/tt-bench-'+k,new Response(blob.slice(0))); }); });
            return p.then(function(){ var w=12/((performance.now()-t0)/1000); var r0=performance.now(), q=Promise.resolve();
              [0,1,2].forEach(function(k){ q=q.then(function(){ return c.match('/tt-bench-'+k).then(function(x){ return x.arrayBuffer(); }); }); });
              return q.then(function(){ var r=12/((performance.now()-r0)/1000); caches.delete('tt-bench'); return {w:w,r:r}; }); }); })
          .catch(function(){ try{ caches.delete('tt-bench'); }catch(e){} return null; }); }
        function logScore(v,ref,base,mult){ if(v==null||!(v>0)) return null; var s=Math.round(base+mult*(Math.log(v/ref)/Math.log(2))); return Math.max(5,Math.min(100,s)); }
        function band(s){ return s>=60?'g':(s>=40?'a':'p'); }
        function fmtM(v){ return Math.round(v/1e6)+' M ops/s'; }
        function setPhase(txt,pct){ phaseEl.innerHTML=txt; prog.style.width=pct+'%'; }
        function live(txt){ liveEl.innerHTML=txt||'&nbsp;'; }
        startBtn.addEventListener('click',function(){
          if(busy) return;
          if(!window.Worker||!window.Blob){ phaseEl.textContent='Your browser can’t run the benchmark — please try a modern browser.'; running.hidden=false; return; }
          busy=true; startBtn.disabled=true; results.hidden=true; running.hidden=false; canvas.hidden=true; live('');
          var R={single:null,multi:null,crypto:null,mem:null,gpu:null,store:null};
          setPhase('1/6 &mdash; Single-core processor speed',5);
          worker(CPUW,1500,0,function(v){ live(Math.round(v/1e6)+' M ops/s'); }).then(function(v){ R.single=v;
            setPhase('2/6 &mdash; All '+cores+' processor threads together',20); live('');
            var n=Math.min(cores,16), rates=[], jobs=[];
            for(var i=0;i<n;i++){ (function(i){ rates[i]=0; jobs.push(worker(CPUW,1500,0,function(v){ rates[i]=v; var s=rates.reduce(function(a,b){return a+b;},0); live(Math.round(s/1e6)+' M ops/s combined'); }).catch(function(){return 0;})); })(i); }
            return Promise.all(jobs); }).then(function(arr){ R.multi=arr.reduce(function(a,b){return a+b;},0)||null;
            setPhase('3/6 &mdash; Encryption speed (SHA-256)',38); live('');
            return cryptoTest(function(v){ live(Math.round(v)+' MB/s hashed'); }); }).then(function(cv){ R.crypto=cv;
            setPhase('4/6 &mdash; Memory speed',52); live('');
            return worker(MEMW,0,20000,function(v){ live((v/1000).toFixed(1)+' GB/s'); }).catch(function(){return null;}); }).then(function(m){ R.mem=m;
            setPhase('5/6 &mdash; Graphics stress test (enjoy the show)',66); live(''); canvas.hidden=false;
            return gpuTest(function(txt){ live(txt); }); }).then(function(g){ R.gpu=g; canvas.hidden=true;
            setPhase('6/6 &mdash; Storage speed',88); live('');
            return storeTest(); }).then(function(st){ R.store=st; setPhase('Crunching your results&hellip;',100); live('');
            setTimeout(function(){ render(R); },400);
          }).catch(function(){ render(R); });
        });
        function render(R){
          running.hidden=true; busy=false; startBtn.disabled=false; startBtn.textContent='Run it again';
          var S={ single:logScore(R.single,300e6,70,30), multi:logScore(R.multi,1800e6,70,25), crypto:logScore(R.crypto,900,70,20),
                  mem:logScore(R.mem,11000,70,25), gpu:(R.gpu?Math.max(5,Math.min(100,Math.round(R.gpu.held*22+Math.min(R.gpu.fps,62)/62*12))):null),
                  store:(R.store?logScore(0.6*R.store.w+0.4*R.store.r,350,70,20):null) };
          var parts=[[S.single,0.18],[S.multi,0.20],[S.crypto,0.10],[S.mem,0.12],[S.gpu,0.25],[S.store,0.15]].filter(function(p){return p[0]!=null;});
          if(!parts.length){ root.querySelector('#bm-verdict').innerHTML='<p>The benchmark couldn&rsquo;t run in this browser &mdash; try Chrome or Edge, or <a href="/contact/">ask us</a> to check your computer properly.</p>'; results.hidden=false; return; }
          var tw=parts.reduce(function(a,p){return a+p[1];},0);
          var overall=Math.round(parts.reduce(function(a,p){return a+p[0]*p[1];},0)/tw);
          LAST={scores:S, overall:overall, raw:R};
          var top=root.querySelector('.bm-top').parentNode;
          top.classList.remove('bm-good','bm-avg','bm-poor');
          top.classList.add(overall>=60?'bm-good':(overall>=40?'bm-avg':'bm-poor'));
          root.querySelector('#bm-score').textContent=overall;
          var v;
          if(overall>=80) v={g:'Blazing fast',m:'This is a quick machine &mdash; everything should feel instant. If it doesn&rsquo;t, something else (startup programs, updates, malware) is slowing it down, and that&rsquo;s fixable.'};
          else if(overall>=60) v={g:'Running well',m:'A healthy, capable computer for everyday work. Keep it maintained and it&rsquo;ll stay that way.'};
          else if(overall>=40) v={g:'Room for improvement',m:'Usable, but you&rsquo;re waiting on it more than you should be. A tune-up &mdash; and often a simple upgrade &mdash; makes a machine like this feel new again.'};
          else v={g:'Struggling',m:'This machine is holding you back every day. Before you bin it: an SSD or memory upgrade often transforms a slow computer for a fraction of the cost of a new one &mdash; and if it really is time, we supply refurbished business-grade Dells from &pound;299.'};
          LAST.band=v.g;
          root.querySelector('#bm-verdict').innerHTML='<p class="bm-verdict-g">'+v.g+'</p><p>'+v.m+'</p>';
          root.querySelector('#bm-scale-me').style.left=Math.max(2,Math.min(98,overall))+'%';
          function row(label,score,stat){ if(score==null) return '<div class="bm-row"><div class="bm-row-h"><b>'+label+'</b><span>not available in this browser</span></div></div>';
            return '<div class="bm-row"><div class="bm-row-h"><b>'+label+'</b><span>'+stat+' &middot; <b style="color:#fff">'+score+'</b>/100</span></div><div class="bm-bar-wrap"><div class="bm-bar '+band(score)+'" data-w="'+score+'"></div></div></div>'; }
          root.querySelector('#bm-rows').innerHTML=
            row('Single-core CPU',S.single,R.single?fmtM(R.single):'')+
            row('Multi-core CPU ('+cores+' threads)',S.multi,R.multi?fmtM(R.multi):'')+
            row('Encryption (SHA-256)',S.crypto,R.crypto?Math.round(R.crypto)+' MB/s':'')+
            row('Memory speed',S.mem,R.mem?(Math.round(R.mem/1000*10)/10)+' GB/s':'')+
            row('Graphics (WebGL)',S.gpu,R.gpu?('level '+R.gpu.held+'/4 &middot; '+Math.round(R.gpu.fps)+' fps'):'')+
            row('Storage (via browser)',S.store,R.store?(Math.round(R.store.w)+' MB/s write'):'');
          var histEl=root.querySelector('#bm-history'); histEl.innerHTML='';
          try{ var hist=JSON.parse(localStorage.getItem('tt_bench_hist')||'[]');
            if(hist.length){ var prev=hist[hist.length-1]; var diff=overall-prev.s; var when=new Date(prev.d).toLocaleDateString();
              var cls=diff>=0?' bm-note-good':''; var arrow=diff>0?('up <b>+'+diff+'</b>'):(diff<0?('down <b>'+diff+'</b>'):'<b>unchanged</b>');
              histEl.innerHTML='<div class="bm-note'+cls+'"><b>Since your last run</b> ('+when+', scored '+prev.s+'): '+arrow+' point'+(Math.abs(diff)===1?'':'s')+'. '+(diff>0?'Nice — whatever changed, it&rsquo;s working.':(diff<0?'If it keeps sliding, something&rsquo;s creeping in — a tune-up will find it.':''))+'</div>'; }
            hist.push({d:Date.now(), s:overall}); localStorage.setItem('tt_bench_hist',JSON.stringify(hist.slice(-6)));
          }catch(e){}
          var notes=[];
          if(navigator.deviceMemory&&navigator.deviceMemory<=4) notes.push('<b>Low memory:</b> your machine reports around '+navigator.deviceMemory+'&nbsp;GB of RAM &mdash; a memory upgrade is one of the cheapest, most effective speed boosts.');
          if(cores<=2) notes.push('<b>Ageing processor:</b> only '+cores+' threads &mdash; modern Windows and browsers really want more. Worth weighing a repair against a <a href="/repair-or-replace-advisor/">replacement</a>.');
          if(S.store!=null&&S.store<40) notes.push('<b>Slow storage:</b> this pattern usually means an old-style hard drive or a tired SSD &mdash; an SSD upgrade is the single biggest upgrade for a slow computer.');
          if(S.gpu==null) notes.push('<b>Graphics test unavailable:</b> your browser blocked WebGL, so graphics weren&rsquo;t scored.');
          var notesEl=root.querySelector('#bm-notes');
          notesEl.innerHTML=notes.map(function(n){return '<div class="bm-note">'+n+'</div>';}).join('');
          if(navigator.getBattery){ try{ navigator.getBattery().then(function(b){ if(b&&b.charging===false){ var d=document.createElement('div'); d.className='bm-note'; d.innerHTML='<b>On battery power:</b> laptops usually run faster plugged in &mdash; connect the charger and run it again for your best score.'; notesEl.appendChild(d); } }).catch(function(){}); }catch(e){} }
          var fix=root.querySelector('#bm-fix');
          if(overall>=60) fix.innerHTML='<h3>Keep it this way</h3><p>Regular servicing is why our customers&rsquo; computers stay fast for years &mdash; a full service every six weeks, updates, security and backups, all handled for you.</p><div class="bm-fix-cta"><a class="button primary" href="/monthly-it-support/">See monthly plans &#8594;</a><a class="button bm-ghost" href="/contact/">Ask a techie</a></div>';
          else fix.innerHTML='<h3>Don&rsquo;t put up with a slow computer</h3><p>We speed up machines like this every week &mdash; deep tune-ups, SSD and memory upgrades, or an honest &ldquo;it&rsquo;s time&rdquo; and a refurbished business-grade Dell from &pound;299. No-fix-no-fee, 12-month warranty.</p><div class="bm-fix-cta"><a class="button primary" href="/contact/">Make mine faster &#8594;</a><a class="button bm-ghost" href="/dell-hardware/">Refurbished Dells</a></div>';
          results.hidden=false;
          root.querySelector('#bm-ring').style.strokeDashoffset=(339.292*(1-overall/100)).toFixed(1);
          requestAnimationFrame(function(){ setTimeout(function(){ root.querySelectorAll('.bm-bar').forEach(function(b){ b.style.width=b.getAttribute('data-w')+'%'; }); },60); });
          try{ results.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
        }
        function bandColor(s){ return s>=60?'#2ecc71':(s>=40?'#f1c40f':'#e74c3c'); }
        root.querySelector('#bm-dl').addEventListener('click',function(){
          if(!LAST.scores) return;
          var cv=document.createElement('canvas'); cv.width=1080; cv.height=760; var x=cv.getContext('2d');
          x.fillStyle='#070d22'; x.fillRect(0,0,1080,760);
          x.strokeStyle='rgba(125,170,220,0.25)'; x.lineWidth=2; x.strokeRect(14,14,1052,732);
          x.fillStyle='#1d97e3'; x.font='700 26px "IBM Plex Mono", Consolas, monospace'; x.fillText('365 TECHIES',60,74);
          x.fillStyle='#9fb5d3'; x.font='16px "IBM Plex Mono", Consolas, monospace'; x.fillText('// FREE PC BENCHMARK',60,102);
          x.fillStyle=bandColor(LAST.overall); x.font='800 170px Archivo, Arial, sans-serif'; x.fillText(String(LAST.overall),60,300);
          x.fillStyle='#9fb5d3'; x.font='600 30px Archivo, Arial, sans-serif'; x.fillText('/100',60+x.measureText('').width+ (String(LAST.overall).length*95),300);
          x.fillStyle=bandColor(LAST.overall); x.font='800 40px Archivo, Arial, sans-serif'; x.fillText(LAST.band,60,368);
          x.fillStyle='#9fb5d3'; x.font='19px Archivo, Arial, sans-serif'; x.fillText(DEVLINE.slice(0,52),60,412);
          x.fillText(new Date().toLocaleDateString(),60,442);
          var rows=[['Single-core CPU',LAST.scores.single],['Multi-core CPU',LAST.scores.multi],['Encryption',LAST.scores.crypto],['Memory',LAST.scores.mem],['Graphics',LAST.scores.gpu],['Storage',LAST.scores.store]];
          var y=120;
          rows.forEach(function(r){ var s=r[1];
            x.fillStyle='#eaf4ff'; x.font='600 22px Archivo, Arial, sans-serif'; x.fillText(r[0],560,y);
            if(s==null){ x.fillStyle='#9fb5d3'; x.font='18px Archivo, Arial, sans-serif'; x.fillText('n/a',985,y); }
            else{ x.fillStyle='rgba(255,255,255,0.12)'; x.fillRect(560,y+12,400,10);
              x.fillStyle=bandColor(s); x.fillRect(560,y+12,400*s/100,10);
              x.fillStyle='#eaf4ff'; x.font='700 20px Archivo, Arial, sans-serif'; x.fillText(String(s),985,y+2); }
            y+=62; });
          x.fillStyle='#eaf4ff'; x.font='700 26px Archivo, Arial, sans-serif'; x.fillText('How fast is YOUR computer?',60,640);
          x.fillStyle='#1d97e3'; x.font='700 28px Archivo, Arial, sans-serif'; x.fillText('365techies.co.uk/pc-benchmark',60,680);
          x.fillStyle='#9fb5d3'; x.font='17px Archivo, Arial, sans-serif'; x.fillText('Free · no downloads · IT support for homes & businesses since 1995',60,714);
          try{ var a=document.createElement('a'); a.download='365-benchmark-score-'+LAST.overall+'.png'; a.href=cv.toDataURL('image/png'); a.click(); }catch(e){}
        });
        root.querySelector('#bm-copy').addEventListener('click',function(){
          if(!LAST.scores) return; var S=LAST.scores;
          function p(n,v){ return v==null?'':(n+' '+v+' · '); }
          var txt='My 365 Techies PC Benchmark score: '+LAST.overall+'/100 ('+LAST.band+')\n'+
            (p('Single-core',S.single)+p('Multi-core',S.multi)+p('Encryption',S.crypto)+p('Memory',S.mem)+p('Graphics',S.gpu)+p('Storage',S.store)).replace(/ · $/,'')+'\n'+
            'Test yours free: https://365techies.co.uk/pc-benchmark/';
          var btn=this; function ok(){ btn.textContent='Copied!'; btn.classList.add('done'); setTimeout(function(){ btn.textContent='Copy my results'; btn.classList.remove('done'); },1800); }
          if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(ok).catch(function(){}); }
          else{ var ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); ok(); }catch(e){} document.body.removeChild(ta); }
        });
      })();
      </script>
    </section>'''

# Shared QR code generator (client-side render, any link/text/email/phone/sms, no key) — /qr-code-generator/
QRGEN_TOOL = r'''    <section class="section" aria-label="QR code generator" id="qgtool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE QR CODE GENERATOR</p>
          <h2 class="section-title section-title--center" data-title>Make a QR code in seconds<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Turn any link, text, email or phone number into a scannable QR code &mdash; great for menus, posters, business cards, review links and more. Free, made in your browser, download as an image.</p>
        </div>
        <div id="qg" data-reveal>
          <div class="qg-grid">
            <form class="qg-form" id="qg-form" novalidate>
              <label class="qg-f"><span>What should the QR code do?</span>
                <select id="qg-type">
                  <option value="url">Open a website / link</option>
                  <option value="text">Show some text</option>
                  <option value="email">Start an email</option>
                  <option value="phone">Dial a phone number</option>
                  <option value="sms">Send a text message</option>
                </select>
              </label>
              <label class="qg-f" id="qg-main-wrap"><span id="qg-main-label">Website address</span><input id="qg-main" autocomplete="off" spellcheck="false" placeholder="yourbusiness.co.uk"></label>
              <label class="qg-f" id="qg-extra-wrap" hidden><span id="qg-extra-label">Subject (optional)</span><input id="qg-extra" autocomplete="off" placeholder="Enquiry from your poster"></label>
              <label class="qg-f qg-colour"><span>QR colour</span><input type="color" id="qg-fg" value="#070d22"></label>
              <p class="qg-presets">Quick start: <button type="button" class="qg-chip" data-preset="review">&#11088; A &ldquo;review us on Google&rdquo; code</button></p>
            </form>
            <div class="qg-out">
              <div class="qg-placeholder" id="qg-ph">Your QR code appears here &#128241;</div>
              <div class="qg-card" id="qg-card" hidden><div class="qg-qr" id="qg-qr"></div></div>
              <button type="button" class="button qg-dl" id="qg-dl" hidden>Download as image &#8595;</button>
            </div>
          </div>
          <p class="qg-hint">&#128274; Made entirely in your browser &mdash; nothing is sent or stored. Tip: print it big enough to scan from where people stand.</p>
        </div>
        <div class="qg-fix">
          <h3>Want QR codes working for your business?</h3>
          <p>From Google-review codes on your receipts to Wi-Fi codes for guests and smart links on your marketing, we help Dorset businesses use the little things that make a big difference &mdash; and sort the tech behind them.</p>
          <div class="qg-fix-cta"><a class="button primary" href="/contact/">Talk to a techie &#8594;</a><a class="button qg-ghost" href="/wifi-qr-code-generator/">Wi-Fi QR generator</a></div>
        </div>
      </div>
      <style>
      #qg{max-width:820px;margin:0 auto}
      #qg .qg-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.6rem;align-items:start}
      #qg .qg-form{display:flex;flex-direction:column;gap:.9rem}
      #qg .qg-f{display:flex;flex-direction:column;gap:.35rem;font-size:.88rem}
      #qg .qg-f input,#qg .qg-f select{font:inherit;padding:.75rem .9rem;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:inherit}
      #qg .qg-f input:focus,#qg .qg-f select:focus{outline:none;border-color:var(--cyan,#37c2c2)}
      #qg .qg-colour{flex-direction:row;align-items:center;justify-content:space-between}
      #qg .qg-colour input[type=color]{width:52px;height:34px;padding:2px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,.2);cursor:pointer}
      #qg .qg-presets{margin:.2rem 0 0;font-size:.8rem;color:var(--muted,#9aa6c2)}
      #qg .qg-chip{font:inherit;font-size:.8rem;cursor:pointer;background:rgba(55,194,194,.1);border:1px solid rgba(55,194,194,.35);color:var(--cyan,#37c2c2);border-radius:99px;padding:.3rem .7rem;margin-left:.3rem}
      #qg .qg-out{display:flex;flex-direction:column;align-items:center;gap:1rem;justify-content:center;min-height:220px}
      #qg .qg-placeholder{color:var(--muted,#9aa6c2);font-size:.9rem;text-align:center;border:1px dashed rgba(255,255,255,.18);border-radius:14px;padding:2.5rem 1rem;width:100%}
      #qg .qg-card{background:#fff;border-radius:16px;padding:1.1rem;max-width:260px}
      #qg .qg-qr svg{display:block;width:100%;height:auto;border-radius:6px}
      #qg .qg-dl{background:transparent;border:1px solid var(--cyan,#37c2c2);color:var(--cyan,#37c2c2)}
      #qg .qg-hint{text-align:center;font-size:.76rem;color:var(--muted,#9aa6c2);margin:1.2rem 0 0;line-height:1.5}
      #qgtool .qg-fix{max-width:820px;margin:2rem auto 0;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #qgtool .qg-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #qgtool .qg-fix p{margin:0 auto 1.1rem;max-width:54ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #qgtool .qg-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      #qgtool .qg-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      @media(max-width:640px){#qg .qg-grid{grid-template-columns:1fr}}
      </style>
      <script>
      (function(){
        var root=document.getElementById('qg'); if(!root) return;
        var LIB='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js', libp=null;
        var REVIEW='https://search.google.com/local/writereview?placeid=ChIJlTb8YRuic0gRCRczduB8OFI';
        var typ=root.querySelector('#qg-type'), main=root.querySelector('#qg-main'), mainLbl=root.querySelector('#qg-main-label');
        var extraWrap=root.querySelector('#qg-extra-wrap'), extra=root.querySelector('#qg-extra'), extraLbl=root.querySelector('#qg-extra-label');
        var fg=root.querySelector('#qg-fg'), ph=root.querySelector('#qg-ph'), card=root.querySelector('#qg-card'), qrbox=root.querySelector('#qg-qr'), dl=root.querySelector('#qg-dl');
        var META={ url:{lbl:'Website address',ph:'yourbusiness.co.uk',extra:null},
          text:{lbl:'Your text',ph:'Anything you like',extra:null},
          email:{lbl:'Email address',ph:'you@business.co.uk',extra:'Subject (optional)'},
          phone:{lbl:'Phone number',ph:'01202 775566',extra:null},
          sms:{lbl:'Phone number',ph:'07520 615332',extra:'Message (optional)'} };
        function ensureLib(){ if(window.qrcode) return Promise.resolve(); if(libp) return libp; libp=new Promise(function(res,rej){ var s=document.createElement('script'); s.src=LIB; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); return libp; }
        function build(){
          var t=typ.value, v=main.value.trim(), x=extra.value.trim(), out='';
          if(t==='url'){ if(!v) return ''; out=/^[a-z][a-z0-9+.\-]*:\/\//i.test(v)?v:('https://'+v); }
          else if(t==='text'){ out=main.value; }
          else if(t==='email'){ if(!v) return ''; out='mailto:'+v+(x?('?subject='+encodeURIComponent(x)):''); }
          else if(t==='phone'){ if(!v) return ''; out='tel:'+v.replace(/[^\d+]/g,''); }
          else if(t==='sms'){ if(!v) return ''; out='sms:'+v.replace(/[^\d+]/g,'')+(x?('?body='+encodeURIComponent(x)):''); }
          return out;
        }
        function render(){
          var data=build();
          if(!data){ ph.hidden=false; card.hidden=true; dl.hidden=true; ph.textContent='Your QR code appears here 📱'; return; }
          ensureLib().then(function(){
            var qr; try{ qr=window.qrcode(0,'M'); qr.addData(data); qr.make(); }
            catch(e){ for(var t=1;t<=25;t++){ try{ qr=window.qrcode(t,'M'); qr.addData(data); qr.make(); break; }catch(e2){} } }
            if(!qr){ ph.hidden=false; ph.textContent='That’s a bit too long for one QR code — try a shorter link.'; card.hidden=true; dl.hidden=true; return; }
            var n=qr.getModuleCount(), cell=8, m=4, size=(n+m*2)*cell, col=fg.value||'#070d22';
            var sv='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+size+' '+size+'" role="img" aria-label="QR code"><rect width="'+size+'" height="'+size+'" fill="#ffffff"/>';
            for(var r=0;r<n;r++){ for(var c=0;c<n;c++){ if(qr.isDark(r,c)) sv+='<rect x="'+((c+m)*cell)+'" y="'+((r+m)*cell)+'" width="'+cell+'" height="'+cell+'" fill="'+col+'"/>'; } }
            sv+='</svg>'; qrbox.innerHTML=sv; ph.hidden=true; card.hidden=false; dl.hidden=false;
          }).catch(function(){ ph.hidden=false; ph.textContent='Couldn’t load the QR generator — check your connection and try again.'; });
        }
        function syncType(){ var t=typ.value, meta=META[t]; mainLbl.textContent=meta.lbl; main.placeholder=meta.ph;
          if(meta.extra){ extraLbl.textContent=meta.extra; extraWrap.hidden=false; } else { extraWrap.hidden=true; extra.value=''; } render(); }
        typ.addEventListener('change',syncType);
        main.addEventListener('input',render); extra.addEventListener('input',render); fg.addEventListener('input',render);
        root.querySelectorAll('.qg-chip').forEach(function(b){ b.addEventListener('click',function(){ if(b.getAttribute('data-preset')==='review'){ typ.value='url'; syncType(); main.value=REVIEW; render(); } }); });
        dl.addEventListener('click',function(){
          var svg=qrbox.querySelector('svg'); if(!svg) return;
          var xml=new XMLSerializer().serializeToString(svg), img=new Image();
          img.onload=function(){ var cv=document.createElement('canvas'); cv.width=640; cv.height=640; var ctx=cv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,640,640); ctx.drawImage(img,0,0,640,640); var a=document.createElement('a'); a.download='qr-code.png'; a.href=cv.toDataURL('image/png'); a.click(); };
          img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(xml)));
        });
        syncType();
      })();
      </script>
    </section>'''

# Shared email signature generator (client-side, table-based email-safe HTML, no key) — /email-signature-generator/
SIGGEN_TOOL = r'''    <section class="section" aria-label="Email signature generator" id="sgtool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE SIGNATURE GENERATOR</p>
          <h2 class="section-title section-title--center" data-title>A professional email signature in one minute<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Fill in your details, watch the live preview, then copy it straight into Outlook, Gmail or Apple Mail. Built the proper way (email-safe HTML), made in your browser, nothing stored.</p>
        </div>
        <div id="sg" data-reveal>
          <div class="sg-grid">
            <form class="sg-form" id="sg-form" novalidate>
              <label class="sg-f"><span>Full name</span><input id="sg-name" autocomplete="off" placeholder="Sam Taylor"></label>
              <label class="sg-f"><span>Job title</span><input id="sg-title" autocomplete="off" placeholder="Office Manager"></label>
              <label class="sg-f"><span>Company</span><input id="sg-co" autocomplete="off" placeholder="Taylor &amp; Co Ltd"></label>
              <label class="sg-f"><span>Phone</span><input id="sg-tel" autocomplete="off" placeholder="01202 000000"></label>
              <label class="sg-f"><span>Mobile (optional)</span><input id="sg-mob" autocomplete="off" placeholder="07000 000000"></label>
              <label class="sg-f"><span>Email</span><input id="sg-em" autocomplete="off" spellcheck="false" placeholder="sam@taylorco.co.uk"></label>
              <label class="sg-f"><span>Website (optional)</span><input id="sg-web" autocomplete="off" spellcheck="false" placeholder="taylorco.co.uk"></label>
              <label class="sg-f"><span>Extra line (optional &mdash; e.g. company no., opening hours)</span><input id="sg-extra" autocomplete="off" placeholder="Registered in England &amp; Wales No. 1234567"></label>
              <div class="sg-row">
                <label class="sg-f sg-colour"><span>Accent colour</span><input type="color" id="sg-col" value="#1d6fe3"></label>
                <label class="sg-f"><span>Style</span><select id="sg-style"><option value="bar">Classic (accent bar)</option><option value="compact">Compact (one-liner)</option></select></label>
              </div>
            </form>
            <div class="sg-out">
              <p class="sg-out-label">Live preview</p>
              <div class="sg-card"><div id="sg-preview"></div></div>
              <div class="sg-btns">
                <button type="button" class="button primary" id="sg-copy">Copy signature</button>
                <button type="button" class="button sg-ghost" id="sg-copyhtml">Copy HTML code</button>
              </div>
              <p class="sg-hint" id="sg-hint">&#128274; Made in your browser &mdash; nothing is sent or stored. Paste it into your email app&rsquo;s signature settings (guides below).</p>
            </div>
          </div>
        </div>
        <div class="sg-fix">
          <h3>Want signatures rolled out for the whole team?</h3>
          <p>We set up consistent, professional signatures across Microsoft 365 and Google Workspace &mdash; centrally managed so every email leaving your business looks the part, and nobody can break them.</p>
          <div class="sg-fix-cta"><a class="button primary" href="/contact/">Sort my team&rsquo;s email &#8594;</a><a class="button sg-ghost" href="/microsoft-365-support/">Microsoft 365 support</a></div>
        </div>
      </div>
      <style>
      #sg{max-width:900px;margin:0 auto}
      #sg .sg-grid{display:grid;grid-template-columns:1fr 1.15fr;gap:1.6rem;align-items:start}
      #sg .sg-form{display:flex;flex-direction:column;gap:.7rem}
      #sg .sg-f{display:flex;flex-direction:column;gap:.3rem;font-size:.85rem}
      #sg .sg-f input,#sg .sg-f select{font:inherit;padding:.65rem .85rem;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:inherit}
      #sg .sg-f input:focus,#sg .sg-f select:focus{outline:none;border-color:var(--cyan,#37c2c2)}
      #sg .sg-row{display:flex;gap:.8rem}
      #sg .sg-row .sg-f{flex:1}
      #sg .sg-colour input[type=color]{width:100%;height:42px;padding:2px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,.2);cursor:pointer}
      #sg .sg-out{position:sticky;top:90px}
      #sg .sg-out-label{font-size:.7rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted,#9aa6c2);margin:0 0 .5rem}
      #sg .sg-card{background:#fff;border-radius:14px;padding:1.4rem;min-height:140px;overflow-x:auto}
      #sg .sg-btns{display:flex;gap:.7rem;flex-wrap:wrap;margin-top:1rem}
      #sg .sg-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      #sg .button.done{border-color:#2ecc71;color:#2ecc71}
      #sg .sg-hint{font-size:.76rem;color:var(--muted,#9aa6c2);margin:.9rem 0 0;line-height:1.5}
      #sgtool .sg-fix{max-width:900px;margin:2rem auto 0;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #sgtool .sg-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #sgtool .sg-fix p{margin:0 auto 1.1rem;max-width:56ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #sgtool .sg-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      #sgtool .sg-fix .sg-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      @media(max-width:700px){#sg .sg-grid{grid-template-columns:1fr}#sg .sg-out{position:static}}
      </style>
      <script>
      (function(){
        var root=document.getElementById('sg'); if(!root) return;
        function q(id){ return root.querySelector(id); }
        var F={name:q('#sg-name'),title:q('#sg-title'),co:q('#sg-co'),tel:q('#sg-tel'),mob:q('#sg-mob'),em:q('#sg-em'),web:q('#sg-web'),extra:q('#sg-extra'),col:q('#sg-col'),style:q('#sg-style')};
        var prev=q('#sg-preview');
        function esc(s){ var d=document.createElement('div'); d.textContent=(s==null?'':s); return d.innerHTML; }
        function telHref(v){ return 'tel:'+String(v).replace(/[^\d+]/g,''); }
        function webHref(v){ return /^[a-z][a-z0-9+.\-]*:\/\//i.test(v)?v:('https://'+v); }
        function webLabel(v){ return String(v).replace(/^https?:\/\//i,'').replace(/\/$/,''); }
        function build(){
          var col=F.col.value||'#1d6fe3';
          var name=esc(F.name.value.trim()), title=esc(F.title.value.trim()), co=esc(F.co.value.trim());
          var tel=F.tel.value.trim(), mob=F.mob.value.trim(), em=F.em.value.trim(), web=F.web.value.trim(), extra=esc(F.extra.value.trim());
          if(!name&&!title&&!co&&!tel&&!mob&&!em&&!web) return '';
          var base='font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#222222;line-height:1.5;';
          var link='color:'+col+';text-decoration:none;';
          var bits=[];
          if(tel) bits.push('<a href="'+telHref(tel)+'" style="'+link+'">'+esc(tel)+'</a>');
          if(mob) bits.push('<a href="'+telHref(mob)+'" style="'+link+'">'+esc(mob)+'</a>');
          if(em) bits.push('<a href="mailto:'+esc(em)+'" style="'+link+'">'+esc(em)+'</a>');
          if(web) bits.push('<a href="'+esc(webHref(web))+'" style="'+link+'">'+esc(webLabel(web))+'</a>');
          var contact=bits.join('<span style="color:#bbbbbb">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>');
          var roleLine=[title,co].filter(Boolean).join('<span style="color:#bbbbbb">&nbsp;&middot;&nbsp;</span>');
          if(F.style.value==='compact'){
            var parts=[];
            if(name) parts.push('<span style="font-weight:bold;color:'+col+'">'+name+'</span>');
            if(roleLine) parts.push('<span style="color:#555555">'+roleLine+'</span>');
            var top=parts.join('<span style="color:#bbbbbb">&nbsp;&nbsp;|&nbsp;&nbsp;</span>');
            return '<table cellpadding="0" cellspacing="0" border="0" style="'+base+'"><tr><td>'+
              (top?('<div>'+top+'</div>'):'')+(contact?('<div style="margin-top:2px">'+contact+'</div>'):'')+
              (extra?('<div style="margin-top:4px;font-size:11px;color:#999999">'+extra+'</div>'):'')+'</td></tr></table>';
          }
          return '<table cellpadding="0" cellspacing="0" border="0" style="'+base+'"><tr>'+
            '<td style="border-left:3px solid '+col+';padding-left:14px">'+
            (name?('<div style="font-size:16px;font-weight:bold;color:'+col+'">'+name+'</div>'):'')+
            (roleLine?('<div style="color:#555555">'+roleLine+'</div>'):'')+
            (contact?('<div style="margin-top:7px">'+contact+'</div>'):'')+
            (extra?('<div style="margin-top:7px;font-size:11px;color:#999999">'+extra+'</div>'):'')+
            '</td></tr></table>';
        }
        function render(){ prev.innerHTML=build()||'<span style="color:#999">Start typing to see your signature&hellip;</span>'; }
        Object.keys(F).forEach(function(k){ F[k].addEventListener('input',render); F[k].addEventListener('change',render); });
        function flash(btn,txt){ var old=btn.textContent; btn.textContent=txt; btn.classList.add('done'); setTimeout(function(){ btn.textContent=old; btn.classList.remove('done'); },1800); }
        q('#sg-copy').addEventListener('click',function(){
          var btn=this, html=build(); if(!html) return;
          function fallback(){ try{ var r=document.createRange(); r.selectNodeContents(prev); var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r); document.execCommand('copy'); sel.removeAllRanges(); flash(btn,'Copied!'); }catch(e){} }
          if(navigator.clipboard&&window.ClipboardItem){
            try{ navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([prev.innerText],{type:'text/plain'})})]).then(function(){ flash(btn,'Copied!'); }).catch(fallback); }catch(e){ fallback(); }
          } else fallback();
        });
        q('#sg-copyhtml').addEventListener('click',function(){
          var btn=this, html=build(); if(!html) return;
          if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(html).then(function(){ flash(btn,'Copied!'); }).catch(function(){}); }
          else{ var ta=document.createElement('textarea'); ta.value=html; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); flash(btn,'Copied!'); }catch(e){} document.body.removeChild(ta); }
        });
        render();
      })();
      </script>
    </section>'''

# Shared SSL certificate checker (server-side lookup via api/ssl-check.php) — /ssl-checker/
SSLCHECK_TOOL = r'''    <section class="section" aria-label="SSL certificate checker" id="ssltool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE SSL CHECK</p>
          <h2 class="section-title section-title--center" data-title>Is your website&rsquo;s padlock healthy?<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Check any website&rsquo;s SSL certificate &mdash; is it valid, who issued it, and crucially <strong>when does it expire</strong>. An expired certificate scares every visitor away overnight.</p>
        </div>
        <div id="sslc" data-reveal>
          <form class="sl-form" id="sl-form" novalidate>
            <input type="text" id="sl-domain" inputmode="url" autocomplete="off" spellcheck="false" placeholder="yourbusiness.co.uk" aria-label="Domain to check">
            <button type="submit" class="button primary sl-go">Check certificate</button>
          </form>
          <p class="sl-hint">Free and instant &mdash; we read the certificate your site presents to every visitor. Nothing is stored.</p>
          <div class="sl-loading" id="sl-loading" hidden><div class="sl-spinner" aria-hidden="true"></div><p>Reading the certificate&hellip;</p></div>
          <div class="sl-error" id="sl-error" hidden></div>
          <div class="sl-results" id="sl-results" hidden>
            <div id="sl-verdict"></div>
            <div class="sl-rows" id="sl-rows"></div>
            <div class="sl-fix">
              <h3>Never think about certificates again</h3>
              <p>Our managed hosting renews certificates automatically and we watch them so you don&rsquo;t have to &mdash; alongside fast hosting, backups and real local support.</p>
              <div class="sl-fix-cta"><a class="button primary" href="/web-design-hosting/">Managed hosting &#8594;</a><a class="button sl-ghost" href="/contact/">Ask a techie</a></div>
            </div>
          </div>
        </div>
      </div>
      <style>
      #sslc{max-width:720px;margin:0 auto}
      #sslc .sl-form{display:flex;gap:.6rem;flex-wrap:wrap}
      #sslc #sl-domain{flex:1 1 240px;min-width:0;padding:.95rem 1.1rem;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:inherit;font:inherit}
      #sslc #sl-domain:focus{outline:none;border-color:var(--cyan,#37c2c2)}
      #sslc .sl-hint{font-size:.78rem;color:var(--muted,#9aa6c2);margin:.6rem 0 0}
      #sslc .sl-loading{text-align:center;padding:2rem 1rem}
      #sslc .sl-spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,.14);border-top-color:var(--cyan,#37c2c2);margin:0 auto 1rem;animation:sl-spin 1s linear infinite}
      @keyframes sl-spin{to{transform:rotate(360deg)}}
      #sslc .sl-error{margin-top:1.3rem;padding:1rem 1.2rem;border-radius:12px;border:1px solid rgba(231,76,60,.45);background:rgba(231,76,60,.1);font-size:.92rem;line-height:1.55}
      #sslc .sl-results{margin-top:1.8rem}
      #sslc .sl-verdict-box{text-align:center;padding:1.6rem;border-radius:16px;border:1px solid rgba(255,255,255,.12);margin-bottom:1.2rem}
      #sslc .sl-v-dom{margin:0;font-size:.85rem;color:var(--muted,#9aa6c2);word-break:break-all}
      #sslc .sl-v-g{margin:.2rem 0 .4rem;font-size:1.7rem;font-weight:800}
      #sslc .sl-v-m{margin:0 auto;max-width:52ch;font-size:.94rem;line-height:1.6;color:var(--muted,#9aa6c2)}
      #sslc .good{border-color:rgba(46,204,113,.4);background:rgba(46,204,113,.08)} #sslc .good .sl-v-g{color:#2ecc71}
      #sslc .avg{border-color:rgba(241,196,15,.4);background:rgba(241,196,15,.08)} #sslc .avg .sl-v-g{color:#f1c40f}
      #sslc .poor{border-color:rgba(231,76,60,.4);background:rgba(231,76,60,.1)} #sslc .poor .sl-v-g{color:#e74c3c}
      #sslc .sl-rows{display:flex;flex-direction:column;gap:.55rem}
      #sslc .sl-row{display:flex;justify-content:space-between;gap:1rem;padding:.7rem 1rem;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);font-size:.88rem}
      #sslc .sl-row b{color:#fff;font-weight:600}
      #sslc .sl-row span{color:var(--muted,#9aa6c2);text-align:right;word-break:break-word}
      #sslc .sl-fix{margin-top:1.8rem;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #sslc .sl-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #sslc .sl-fix p{margin:0 auto 1.1rem;max-width:52ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #sslc .sl-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      #sslc .sl-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      @media(max-width:560px){#sslc .sl-go{flex:1 1 100%}}
      </style>
      <script>
      (function(){
        var root=document.getElementById('sslc'); if(!root) return;
        var form=root.querySelector('#sl-form'), input=root.querySelector('#sl-domain');
        var load=root.querySelector('#sl-loading'), err=root.querySelector('#sl-error'), res=root.querySelector('#sl-results');
        function esc(s){ var d=document.createElement('div'); d.textContent=(s==null?'':s); return d.innerHTML; }
        var ERRS={'bad-domain':'That doesn&rsquo;t look like a valid domain &mdash; just the domain, e.g. yourbusiness.co.uk.','no-dns':'That domain doesn&rsquo;t point anywhere (no DNS record found).','unreachable':'We couldn&rsquo;t reach that site on the secure port (443) &mdash; it may not have HTTPS at all.','rate':'The checker is busy &mdash; try again in a minute.','parse':'We reached the site but couldn&rsquo;t read its certificate.'};
        form.addEventListener('submit',function(e){
          e.preventDefault();
          var v=input.value.trim(); if(!v){ input.focus(); return; }
          res.hidden=true; err.hidden=true; load.hidden=false; var btn=form.querySelector('.sl-go'); btn.disabled=true;
          fetch('/api/ssl-check.php?domain='+encodeURIComponent(v),{cache:'no-store'}).then(function(r){return r.json();}).then(function(j){
            load.hidden=true; btn.disabled=false;
            if(!j||!j.ok){ err.innerHTML=ERRS[(j&&j.error)||'']||'Something went wrong &mdash; please try again.'; err.hidden=false; return; }
            var v2;
            if(j.expired) v2={g:'Certificate EXPIRED',c:'poor',m:'This certificate expired &mdash; visitors are seeing security warnings instead of the website. This needs fixing today.'};
            else if(j.notYet) v2={g:'Not yet valid',c:'poor',m:'The certificate&rsquo;s start date is in the future &mdash; usually a server clock or setup problem.'};
            else if(!j.trusted||j.selfSigned) v2={g:'Not trusted',c:'poor',m:(j.selfSigned?'It&rsquo;s a self-signed certificate':'Browsers don&rsquo;t trust this certificate&rsquo;s chain')+' &mdash; visitors will see a security warning.'};
            else if(!j.matches) v2={g:'Wrong certificate',c:'avg',m:'The certificate doesn&rsquo;t cover this exact domain name &mdash; some visitors will hit warnings.'};
            else if(j.daysLeft<=21) v2={g:'Expiring soon &mdash; '+j.daysLeft+' day'+(j.daysLeft===1?'':'s'),c:'avg',m:'Still working, but renewal time. If auto-renewal is set up properly you&rsquo;ll be fine &mdash; worth confirming now, not after it lapses.'};
            else v2={g:'Valid &amp; trusted',c:'good',m:'The padlock is healthy: trusted issuer, correct domain, and '+j.daysLeft+' days before renewal is due.'};
            root.querySelector('#sl-verdict').innerHTML='<div class="sl-verdict-box '+v2.c+'"><p class="sl-v-dom">'+esc(j.host)+'</p><p class="sl-v-g">'+v2.g+'</p><p class="sl-v-m">'+v2.m+'</p></div>';
            function row(k,val){ return '<div class="sl-row"><b>'+k+'</b><span>'+val+'</span></div>'; }
            root.querySelector('#sl-rows').innerHTML=
              row('Issued to',esc(j.subject))+
              row('Issued by',esc(j.issuer))+
              row('Valid',esc(j.validFrom)+' &#8594; '+esc(j.validTo))+
              row('Days remaining',(j.daysLeft>=0?j.daysLeft+' days':'expired '+Math.abs(j.daysLeft)+' days ago'))+
              row('Trusted by browsers',j.trusted?'Yes':'No')+
              row('Names covered',j.sanCount||1);
            res.hidden=false;
            try{ res.scrollIntoView({behavior:'smooth',block:'start'}); }catch(x){}
          }).catch(function(){ load.hidden=true; btn.disabled=false; err.innerHTML='We couldn&rsquo;t run the check just now &mdash; please try again.'; err.hidden=false; });
        });
      })();
      </script>
    </section>'''

# Shared domain expiry checker (RDAP via api/domain-check.php) — /domain-expiry-checker/
DOMEXP_TOOL = r'''    <section class="section" aria-label="Domain expiry checker" id="dxtool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE DOMAIN CHECK</p>
          <h2 class="section-title section-title--center" data-title>When does your domain expire?<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Businesses really do lose their domain &mdash; and with it their website and email &mdash; because a renewal slipped by. Check any domain&rsquo;s renewal date straight from the official registry.</p>
        </div>
        <div id="dx" data-reveal>
          <form class="dx-form" id="dx-form" novalidate>
            <input type="text" id="dx-domain" inputmode="url" autocomplete="off" spellcheck="false" placeholder="yourbusiness.co.uk" aria-label="Domain to check">
            <button type="submit" class="button primary dx-go">Check expiry date</button>
          </form>
          <p class="dx-hint">Live from the registry&rsquo;s official records (RDAP) &mdash; free, nothing stored.</p>
          <div class="dx-loading" id="dx-loading" hidden><div class="dx-spinner" aria-hidden="true"></div><p>Asking the registry&hellip;</p></div>
          <div class="dx-error" id="dx-error" hidden></div>
          <div class="dx-results" id="dx-results" hidden>
            <div id="dx-verdict"></div>
            <div class="dx-rows" id="dx-rows"></div>
            <div class="dx-fix">
              <h3>Domains, quietly looked after</h3>
              <p>We manage domains, DNS and renewals for Dorset businesses so nothing ever lapses &mdash; and if your domain is with a registrar you&rsquo;ve lost track of, we&rsquo;ll untangle it.</p>
              <div class="dx-fix-cta"><a class="button primary" href="/contact/">Look after my domain &#8594;</a><a class="button dx-ghost" href="/dns-lookup/">DNS lookup</a></div>
            </div>
          </div>
        </div>
      </div>
      <style>
      #dx{max-width:720px;margin:0 auto}
      #dx .dx-form{display:flex;gap:.6rem;flex-wrap:wrap}
      #dx #dx-domain{flex:1 1 240px;min-width:0;padding:.95rem 1.1rem;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:inherit;font:inherit}
      #dx #dx-domain:focus{outline:none;border-color:var(--cyan,#37c2c2)}
      #dx .dx-hint{font-size:.78rem;color:var(--muted,#9aa6c2);margin:.6rem 0 0}
      #dx .dx-loading{text-align:center;padding:2rem 1rem}
      #dx .dx-spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,.14);border-top-color:var(--cyan,#37c2c2);margin:0 auto 1rem;animation:dx-spin 1s linear infinite}
      @keyframes dx-spin{to{transform:rotate(360deg)}}
      #dx .dx-error{margin-top:1.3rem;padding:1rem 1.2rem;border-radius:12px;border:1px solid rgba(231,76,60,.45);background:rgba(231,76,60,.1);font-size:.92rem;line-height:1.55}
      #dx .dx-results{margin-top:1.8rem}
      #dx .dx-verdict-box{text-align:center;padding:1.6rem;border-radius:16px;border:1px solid rgba(255,255,255,.12);margin-bottom:1.2rem}
      #dx .dx-v-dom{margin:0;font-size:.85rem;color:var(--muted,#9aa6c2);word-break:break-all}
      #dx .dx-v-g{margin:.2rem 0 .4rem;font-size:1.7rem;font-weight:800}
      #dx .dx-v-m{margin:0 auto;max-width:52ch;font-size:.94rem;line-height:1.6;color:var(--muted,#9aa6c2)}
      #dx .good{border-color:rgba(46,204,113,.4);background:rgba(46,204,113,.08)} #dx .good .dx-v-g{color:#2ecc71}
      #dx .avg{border-color:rgba(241,196,15,.4);background:rgba(241,196,15,.08)} #dx .avg .dx-v-g{color:#f1c40f}
      #dx .poor{border-color:rgba(231,76,60,.4);background:rgba(231,76,60,.1)} #dx .poor .dx-v-g{color:#e74c3c}
      #dx .dx-rows{display:flex;flex-direction:column;gap:.55rem}
      #dx .dx-row{display:flex;justify-content:space-between;gap:1rem;padding:.7rem 1rem;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);font-size:.88rem}
      #dx .dx-row b{color:#fff;font-weight:600}
      #dx .dx-row span{color:var(--muted,#9aa6c2);text-align:right;word-break:break-word}
      #dx .dx-fix{margin-top:1.8rem;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #dx .dx-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #dx .dx-fix p{margin:0 auto 1.1rem;max-width:52ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #dx .dx-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      #dx .dx-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      @media(max-width:560px){#dx .dx-go{flex:1 1 100%}}
      </style>
      <script>
      (function(){
        var root=document.getElementById('dx'); if(!root) return;
        var form=root.querySelector('#dx-form'), input=root.querySelector('#dx-domain');
        var load=root.querySelector('#dx-loading'), err=root.querySelector('#dx-error'), res=root.querySelector('#dx-results');
        function esc(s){ var d=document.createElement('div'); d.textContent=(s==null?'':s); return d.innerHTML; }
        var STATUS={ 'client transfer prohibited':'Transfer-locked (good)','clienttransferprohibited':'Transfer-locked (good)','client delete prohibited':'Delete-locked (good)','clientdeleteprohibited':'Delete-locked (good)','client update prohibited':'Update-locked','clientupdateprohibited':'Update-locked','active':'Active','registered until expiry date':'Registered','server hold':'&#9888; On hold','serverhold':'&#9888; On hold' };
        form.addEventListener('submit',function(e){
          e.preventDefault();
          var v=input.value.trim(); if(!v){ input.focus(); return; }
          res.hidden=true; err.hidden=true; load.hidden=false; var btn=form.querySelector('.dx-go'); btn.disabled=true;
          fetch('/api/domain-check.php?domain='+encodeURIComponent(v),{cache:'no-store'}).then(function(r){return r.json();}).then(function(j){
            load.hidden=true; btn.disabled=false;
            if(!j||!j.ok){ var m={'bad-domain':'That doesn&rsquo;t look like a valid domain name.','not-found':'The registry has no record of that domain &mdash; check the spelling (some country domains don&rsquo;t publish records).','rate':'The checker is busy &mdash; try again in a minute.'}[(j&&j.error)||'']; err.innerHTML=m||'Something went wrong &mdash; please try again.'; err.hidden=false; return; }
            var d=j.daysLeft, v2;
            if(d==null) v2={g:'Registered',c:'good',m:'This registry doesn&rsquo;t publish an expiry date, but the domain is registered'+(j.registrar?(' with '+esc(j.registrar)):'')+'.'};
            else if(d<0) v2={g:'EXPIRED',c:'poor',m:'This domain&rsquo;s registration has lapsed &mdash; if it&rsquo;s yours, contact the registrar immediately; there&rsquo;s often a short grace period to save it.'};
            else if(d<30) v2={g:'Renew NOW &mdash; '+d+' days left',c:'poor',m:'Under a month to renewal. If auto-renew isn&rsquo;t on (or the card on file has expired), the website and email on this domain will stop.'};
            else if(d<60) v2={g:'Renewal coming up &mdash; '+d+' days',c:'avg',m:'Renewal is close. Two minutes now to confirm auto-renew is on saves a very bad week later.'};
            else v2={g:'Safe &mdash; '+d+' days to renewal',c:'good',m:'No action needed for a while. Still worth having auto-renew on and card details current with your registrar.'};
            root.querySelector('#dx-verdict').innerHTML='<div class="dx-verdict-box '+v2.c+'"><p class="dx-v-dom">'+esc(j.domain)+'</p><p class="dx-v-g">'+v2.g+'</p><p class="dx-v-m">'+v2.m+'</p></div>';
            function row(k,val){ return val?('<div class="dx-row"><b>'+k+'</b><span>'+val+'</span></div>'):''; }
            var sts=(j.statuses||[]).map(function(s){ var k=String(s).toLowerCase(); return STATUS[k]||esc(s); }).join(' &middot; ');
            root.querySelector('#dx-rows').innerHTML=
              row('Expires',esc(j.expires))+
              row('Registrar',esc(j.registrar))+
              row('Registered since',esc(j.created))+
              row('Status',sts);
            res.hidden=false;
            try{ res.scrollIntoView({behavior:'smooth',block:'start'}); }catch(x){}
          }).catch(function(){ load.hidden=true; btn.disabled=false; err.innerHTML='We couldn&rsquo;t run the check just now &mdash; please try again.'; err.hidden=false; });
        });
      })();
      </script>
    </section>'''

# Shared off-grid battery & solar calculator (client-side maths, calibrated & labelled indicative) — /solar-battery-calculator/
SOLARCALC_TOOL = r'''    <section class="section" aria-label="Battery and solar calculator" id="soltool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE OFF-GRID CALCULATOR</p>
          <h2 class="section-title section-title--center" data-title>What battery &amp; solar do you actually need?<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Tick what you run, say how long each day, and get an honest sizing for your leisure battery and solar panels &mdash; for campervans, boats, cabins and off-grid setups.</p>
        </div>
        <div id="solc" data-reveal>
          <div class="so-grid">
            <div class="so-loads" id="so-loads"></div>
            <div class="so-side">
              <label class="so-f"><span>Days of autonomy (cloudy-day buffer) <output id="so-auto-out">1.5</output></span><input type="range" id="so-auto" min="1" max="3" step="0.5" value="1.5"></label>
              <div class="so-custom">
                <p class="so-custom-t">Add your own device</p>
                <div class="so-custom-row"><input id="so-cw" type="number" min="1" max="3000" placeholder="Watts"><input id="so-ch" type="number" min="0.1" max="24" step="0.1" placeholder="Hours/day"><button type="button" class="button so-add" id="so-add">Add</button></div>
              </div>
              <div class="so-results" id="so-results">
                <div class="so-big"><span class="so-big-v" id="so-wh">0</span><span class="so-big-l">Wh per day (incl. 15% system losses)</span></div>
                <div class="so-row"><b>Daily draw at 12V</b><span id="so-ah">0 Ah</span></div>
                <div class="so-row"><b>Lithium battery</b><span id="so-li">&mdash;</span></div>
                <div class="so-row"><b>(AGM equivalent)</b><span id="so-agm">&mdash;</span></div>
                <div class="so-row"><b>Solar &mdash; summer</b><span id="so-pvs">&mdash;</span></div>
                <div class="so-row"><b>Solar &mdash; spring/autumn</b><span id="so-pvw">&mdash;</span></div>
              </div>
            </div>
          </div>
          <p class="so-note">Indicative sizing at 12V with 15% system losses, lithium ~90% / AGM ~50% usable capacity, and UK peak-sun averages (~4.2h summer, ~2.5h spring/autumn). <strong>UK winter sun is closer to 1 hour</strong> &mdash; plan on hook-up or charging from the engine (B2B) if you&rsquo;re out in winter. Every setup is different; we&rsquo;ll size yours properly before anything is fitted.</p>
          <div class="so-fix">
            <h3>Sized. Supplied. Fitted. Monitored.</h3>
            <p>We design and install Victron-based off-grid power &mdash; lithium, solar, B2B charging and remote monitoring &mdash; for campervans, boats and off-grid buildings across Dorset. Our own support van runs on it (watch it live).</p>
            <div class="so-fix-cta"><a class="button primary" href="/off-grid-victron-energy/">See our off-grid work &#8594;</a><a class="button so-ghost" href="/contact/">Get a quote</a></div>
          </div>
        </div>
      </div>
      <style>
      #solc{max-width:920px;margin:0 auto}
      #solc .so-grid{display:grid;grid-template-columns:1.15fr 1fr;gap:1.6rem;align-items:start}
      #solc .so-loads{display:flex;flex-direction:column;gap:.5rem}
      #solc .so-load{display:flex;align-items:center;gap:.7rem;padding:.6rem .9rem;border-radius:11px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08)}
      #solc .so-load input[type=checkbox]{accent-color:var(--cyan,#37c2c2);width:1.1rem;height:1.1rem;flex:none}
      #solc .so-load .so-name{flex:1;font-size:.9rem}
      #solc .so-load .so-w{font-size:.72rem;color:var(--muted,#9aa6c2);white-space:nowrap}
      #solc .so-load input[type=number]{width:64px;font:inherit;font-size:.85rem;padding:.35rem .5rem;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.04);color:inherit}
      #solc .so-load .so-h-l{font-size:.7rem;color:var(--muted,#9aa6c2)}
      #solc .so-f{display:flex;flex-direction:column;gap:.4rem;font-size:.85rem;margin-bottom:1rem}
      #solc .so-f span{display:flex;justify-content:space-between}
      #solc .so-f output{color:var(--cyan,#37c2c2);font-weight:700}
      #solc input[type=range]{width:100%;accent-color:var(--cyan,#37c2c2);cursor:pointer}
      #solc .so-custom{padding: .9rem;border-radius:12px;border:1px dashed rgba(255,255,255,.18);margin-bottom:1rem}
      #solc .so-custom-t{margin:0 0 .5rem;font-size:.78rem;color:var(--muted,#9aa6c2)}
      #solc .so-custom-row{display:flex;gap:.5rem}
      #solc .so-custom-row input{flex:1;min-width:0;font:inherit;font-size:.85rem;padding:.5rem .6rem;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.04);color:inherit}
      #solc .so-add{padding:.5rem .9rem}
      #solc .so-results{padding:1.1rem;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1)}
      #solc .so-big{text-align:center;margin-bottom:.9rem}
      #solc .so-big-v{display:block;font-size:2.3rem;font-weight:800;color:var(--cyan,#37c2c2);font-variant-numeric:tabular-nums}
      #solc .so-big-l{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#9aa6c2);margin-top:.2rem}
      #solc .so-row{display:flex;justify-content:space-between;gap:.8rem;padding:.55rem 0;border-top:1px solid rgba(255,255,255,.07);font-size:.88rem}
      #solc .so-row b{color:#fff;font-weight:600}
      #solc .so-row span{color:var(--muted,#9aa6c2);text-align:right;font-variant-numeric:tabular-nums}
      #solc .so-note{margin:1.4rem auto 0;max-width:72ch;text-align:center;font-size:.76rem;color:var(--muted,#9aa6c2);line-height:1.6}
      #soltool .so-fix{max-width:920px;margin:2rem auto 0;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #soltool .so-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #soltool .so-fix p{margin:0 auto 1.1rem;max-width:56ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #soltool .so-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      #soltool .so-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      @media(max-width:700px){#solc .so-grid{grid-template-columns:1fr}}
      </style>
      <script>
      (function(){
        var root=document.getElementById('solc'); if(!root) return;
        var PRESETS=[
          ['Compressor fridge',45,8,true],
          ['LED lights',10,4,true],
          ['Phone &amp; tablet charging',15,2,true],
          ['Laptop',60,3,false],
          ['TV / monitor',35,3,false],
          ['Wi-Fi router / 4G',10,12,false],
          ['Water pump',50,0.3,false],
          ['Diesel heater (fan &amp; pump)',15,6,false],
          ['CPAP machine',40,8,false],
          ['Microwave (via inverter)',800,0.2,false]
        ];
        var loadsEl=root.querySelector('#so-loads'), extra=[];
        function esc(s){ var d=document.createElement('div'); d.innerHTML=s; return d.innerHTML; }
        loadsEl.innerHTML=PRESETS.map(function(p,i){
          return '<label class="so-load"><input type="checkbox" data-i="'+i+'"'+(p[3]?' checked':'')+'><span class="so-name">'+p[0]+'</span><span class="so-w">'+p[1]+'W &times;</span><input type="number" data-h="'+i+'" value="'+p[2]+'" min="0" max="24" step="0.1"><span class="so-h-l">h/day</span></label>';
        }).join('');
        var auto=root.querySelector('#so-auto'), autoOut=root.querySelector('#so-auto-out');
        function fmtAh(ah){
          var sizes=[50,100,150,200,300,400,600,800];
          for(var i=0;i<sizes.length;i++){ if(ah<=sizes[i]) return ah+' Ah &mdash; e.g. '+(sizes[i]<=200?('1&times; '+sizes[i]+' Ah'):(Math.ceil(sizes[i]/200)+'&times; 200 Ah'))+' ';
          }
          return ah+' Ah (serious system &mdash; talk to us)';
        }
        function calc(){
          var wh=0;
          PRESETS.forEach(function(p,i){
            var cb=loadsEl.querySelector('[data-i="'+i+'"]'), hEl=loadsEl.querySelector('[data-h="'+i+'"]');
            if(cb&&cb.checked){ var h=parseFloat(hEl.value)||0; wh+=p[1]*Math.min(24,Math.max(0,h)); }
          });
          extra.forEach(function(x){ wh+=x.w*x.h; });
          var whLoss=wh*1.15, ahDay=whLoss/12, a=parseFloat(auto.value)||1.5;
          autoOut.textContent=a;
          root.querySelector('#so-wh').textContent=Math.round(whLoss);
          root.querySelector('#so-ah').textContent=(Math.round(ahDay*10)/10)+' Ah';
          if(wh<=0){ ['#so-li','#so-agm','#so-pvs','#so-pvw'].forEach(function(s){ root.querySelector(s).innerHTML='&mdash;'; }); return; }
          var li=Math.ceil(ahDay*a/0.9), agm=Math.ceil(ahDay*a/0.5);
          root.querySelector('#so-li').innerHTML=fmtAh(li);
          root.querySelector('#so-agm').innerHTML=agm+' Ah';
          root.querySelector('#so-pvs').innerHTML='~'+Math.ceil(whLoss/4.2*1.25)+' W of panels';
          root.querySelector('#so-pvw').innerHTML='~'+Math.ceil(whLoss/2.5*1.25)+' W of panels';
        }
        loadsEl.addEventListener('change',calc); loadsEl.addEventListener('input',calc); auto.addEventListener('input',calc);
        root.querySelector('#so-add').addEventListener('click',function(){
          var w=parseFloat(root.querySelector('#so-cw').value), h=parseFloat(root.querySelector('#so-ch').value);
          if(!(w>0)||!(h>0)) return;
          extra.push({w:Math.min(3000,w),h:Math.min(24,h)});
          var div=document.createElement('label'); div.className='so-load';
          div.innerHTML='<input type="checkbox" checked disabled><span class="so-name">Custom device</span><span class="so-w">'+Math.round(w)+'W &times; '+h+'h</span>';
          loadsEl.appendChild(div);
          root.querySelector('#so-cw').value=''; root.querySelector('#so-ch').value='';
          calc();
        });
        calc();
      })();
      </script>
    </section>'''

# Shared webcam / mic / speaker tester (getUserMedia + WebAudio, fully on-device) — /webcam-mic-test/
AVTEST_TOOL = r'''    <section class="section" aria-label="Webcam and microphone test" id="avtool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE CAMERA &amp; MIC TEST</p>
          <h2 class="section-title section-title--center" data-title>Test your webcam, mic &amp; speakers<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Video call in ten minutes and nothing works? Test everything here first. <strong>Everything stays on your device</strong> &mdash; nothing is recorded, streamed or sent anywhere.</p>
        </div>
        <div id="av" data-reveal>
          <div class="av-grid">
            <div class="av-card">
              <h3>&#127909; Camera</h3>
              <video id="av-video" autoplay muted playsinline hidden></video>
              <p class="av-status" id="av-cam-status">Click to see what your camera sees.</p>
              <button type="button" class="button primary" id="av-cam-btn">Test my camera</button>
            </div>
            <div class="av-card">
              <h3>&#127908; Microphone</h3>
              <canvas id="av-meter" width="280" height="56" hidden></canvas>
              <p class="av-status" id="av-mic-status">Click, then speak normally.</p>
              <button type="button" class="button primary" id="av-mic-btn">Test my microphone</button>
            </div>
            <div class="av-card">
              <h3>&#128266; Speakers</h3>
              <p class="av-status" id="av-spk-status">Play a tone through each side.</p>
              <div class="av-spk-btns">
                <button type="button" class="button av-ghost" data-pan="-1">&#9664; Left</button>
                <button type="button" class="button av-ghost" data-pan="0">Both</button>
                <button type="button" class="button av-ghost" data-pan="1">Right &#9654;</button>
              </div>
            </div>
          </div>
          <p class="av-note">&#128274; 100% private: the video and audio never leave your computer &mdash; this page has no recording and no uploading. When you leave the page, everything stops.</p>
          <div class="av-fix">
            <h3>Still not working in Teams or Zoom?</h3>
            <p>If it works here but not in your meeting app, it&rsquo;s usually permissions or the wrong device selected &mdash; a five-minute fix. We sort cameras, mics, Teams and Zoom for home workers and businesses every week, remotely.</p>
            <div class="av-fix-cta"><a class="button primary" href="/contact/">Fix my video calls &#8594;</a><a class="button av-ghost" href="/it-support-for-home-workers/">Home worker IT support</a></div>
          </div>
        </div>
      </div>
      <style>
      #av{max-width:920px;margin:0 auto}
      #av .av-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem}
      #av .av-card{padding:1.2rem;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);text-align:center;display:flex;flex-direction:column;gap:.8rem;align-items:center}
      #av .av-card h3{margin:0;font-size:1.05rem}
      #av #av-video{width:100%;border-radius:10px;background:#000;aspect-ratio:4/3;object-fit:cover}
      #av #av-meter{width:100%;max-width:280px;border-radius:8px;background:rgba(0,0,0,.3)}
      #av .av-status{margin:0;font-size:.82rem;color:var(--muted,#9aa6c2);line-height:1.5;min-height:2.4em}
      #av .av-status.ok{color:#2ecc71}
      #av .av-status.bad{color:#e74c3c}
      #av .av-spk-btns{display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center}
      #av .av-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      #av .av-note{margin:1.4rem auto 0;max-width:64ch;text-align:center;font-size:.76rem;color:var(--muted,#9aa6c2);line-height:1.6}
      #avtool .av-fix{max-width:920px;margin:2rem auto 0;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #avtool .av-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #avtool .av-fix p{margin:0 auto 1.1rem;max-width:56ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #avtool .av-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      </style>
      <script>
      (function(){
        var root=document.getElementById('av'); if(!root) return;
        var camStream=null, micStream=null, ac=null, raf=null;
        function errMsg(e){
          if(e&&(e.name==='NotAllowedError'||e.name==='PermissionDeniedError')) return 'Permission blocked. Click the camera icon in the address bar (or the padlock) and allow access, then try again.';
          if(e&&(e.name==='NotFoundError'||e.name==='DevicesNotFoundError')) return 'No device found. Check it&rsquo;s plugged in and not disabled in Windows Settings &#8594; Privacy.';
          if(e&&e.name==='NotReadableError') return 'The device is busy &mdash; another app (Teams? Zoom?) is using it. Close that app and try again.';
          return 'Couldn&rsquo;t start the device &mdash; try a different browser, or ask us.';
        }
        var camBtn=root.querySelector('#av-cam-btn'), vid=root.querySelector('#av-video'), camSt=root.querySelector('#av-cam-status');
        camBtn.addEventListener('click',function(){
          if(camStream){ camStream.getTracks().forEach(function(t){t.stop();}); camStream=null; vid.hidden=true; camBtn.textContent='Test my camera'; camSt.textContent='Stopped.'; camSt.className='av-status'; return; }
          if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)){ camSt.innerHTML='Your browser can&rsquo;t do this test &mdash; try Chrome or Edge.'; camSt.className='av-status bad'; return; }
          camSt.textContent='Asking for permission…';
          navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280}}}).then(function(s){
            camStream=s; vid.srcObject=s; vid.hidden=false; camBtn.textContent='Stop camera';
            var t=s.getVideoTracks()[0], set=t&&t.getSettings?t.getSettings():{};
            camSt.innerHTML='&#10003; Camera working'+(set.width?(' &mdash; '+set.width+'&times;'+set.height):'')+'. If you can see yourself, you&rsquo;re meeting-ready.';
            camSt.className='av-status ok';
          }).catch(function(e){ camSt.innerHTML=errMsg(e); camSt.className='av-status bad'; });
        });
        var micBtn=root.querySelector('#av-mic-btn'), meter=root.querySelector('#av-meter'), micSt=root.querySelector('#av-mic-status');
        var heard=false;
        micBtn.addEventListener('click',function(){
          if(micStream){ micStream.getTracks().forEach(function(t){t.stop();}); micStream=null; if(raf)cancelAnimationFrame(raf); meter.hidden=true; micBtn.textContent='Test my microphone'; micSt.textContent='Stopped.'; micSt.className='av-status'; return; }
          if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)){ micSt.innerHTML='Your browser can&rsquo;t do this test &mdash; try Chrome or Edge.'; micSt.className='av-status bad'; return; }
          micSt.textContent='Asking for permission…'; heard=false;
          navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){
            micStream=s; meter.hidden=false; micBtn.textContent='Stop microphone';
            micSt.textContent='Speak normally…';
            if(!ac) ac=new (window.AudioContext||window.webkitAudioContext)();
            var src=ac.createMediaStreamSource(s), an=ac.createAnalyser(); an.fftSize=512; src.connect(an);
            var data=new Uint8Array(an.frequencyBinCount), ctx=meter.getContext('2d');
            (function draw(){
              raf=requestAnimationFrame(draw);
              an.getByteFrequencyData(data);
              var sum=0; for(var i=0;i<data.length;i++) sum+=data[i];
              var lvl=sum/data.length/255;
              ctx.clearRect(0,0,meter.width,meter.height);
              var bars=24;
              for(var b=0;b<bars;b++){
                var on=(b/bars)<lvl*2.2;
                ctx.fillStyle=on?(b>bars*0.75?'#e74c3c':(b>bars*0.5?'#f1c40f':'#2ecc71')):'rgba(255,255,255,0.12)';
                ctx.fillRect(b*(meter.width/bars)+2,10,(meter.width/bars)-4,meter.height-20);
              }
              if(lvl>0.09&&!heard){ heard=true; micSt.innerHTML='&#10003; We can hear you &mdash; your microphone works.'; micSt.className='av-status ok'; }
            })();
          }).catch(function(e){ micSt.innerHTML=errMsg(e); micSt.className='av-status bad'; });
        });
        var spkSt=root.querySelector('#av-spk-status');
        root.querySelectorAll('[data-pan]').forEach(function(b){
          b.addEventListener('click',function(){
            try{
              if(!ac) ac=new (window.AudioContext||window.webkitAudioContext)();
              if(ac.state==='suspended') ac.resume();
              var o=ac.createOscillator(), g=ac.createGain(); o.frequency.value=440; g.gain.value=0.15;
              var pan=parseFloat(b.getAttribute('data-pan')), node=o;
              if(ac.createStereoPanner){ var p=ac.createStereoPanner(); p.pan.value=pan; o.connect(p); node=p; }
              node.connect(g); g.connect(ac.destination);
              o.start(); setTimeout(function(){ o.stop(); },900);
              spkSt.innerHTML='Playing '+(pan<0?'LEFT':(pan>0?'RIGHT':'BOTH'))+'&hellip; heard it? &#10003;';
              spkSt.className='av-status ok';
            }catch(e){ spkSt.textContent='Couldn&rsquo;t play a tone in this browser.'; spkSt.className='av-status bad'; }
          });
        });
        window.addEventListener('pagehide',function(){ try{ if(camStream)camStream.getTracks().forEach(function(t){t.stop();}); if(micStream)micStream.getTracks().forEach(function(t){t.stop();}); }catch(e){} });
      })();
      </script>
    </section>'''

# Shared Victron system builder (ULTIMATE v3: sizing engine -> component spec + per-circuit cables/lugs/fusing, tools,
# golden rules, INDICATIVE PRICE BANDS (typical UK retail, clearly labelled guide — live links show today's price),
# "buy it in this order" budget phasing, and a branded downloadable build sheet) — /victron-system-builder/
# Retail links are SEARCH links. AMZN_TAG empty = plain links + "we don't earn" disclosure.
VBUILDER_TOOL = r'''    <section class="section" aria-label="Victron system builder" id="vbtool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE SYSTEM BUILDER</p>
          <h2 class="section-title section-title--center" data-title>Build your Victron system<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Answer four questions and get the <strong>complete build</strong> &mdash; every component with a realistic price guide, the exact cables, lugs and fuses per circuit, the smart order to buy it all in, and a build sheet you can download. Or one button to have us fit the lot.</p>
        </div>
        <div id="vb" data-reveal>
          <div class="vb-q">
            <p class="vb-q-t">1 &middot; How much energy do you use per day?</p>
            <div class="vb-chips">
              <button type="button" class="vb-chip" data-wh="350">Weekender ~350 Wh</button>
              <button type="button" class="vb-chip is-on" data-wh="800">Regular trips ~800 Wh</button>
              <button type="button" class="vb-chip" data-wh="1500">Full-timer ~1500 Wh</button>
            </div>
            <label class="vb-slider"><span>Fine-tune: <output id="vb-wh-out">800</output> Wh/day &middot; <a href="/solar-battery-calculator/">work yours out &#8594;</a></span>
            <input type="range" id="vb-wh" min="200" max="3000" step="50" value="800"></label>
          </div>
          <div class="vb-q">
            <p class="vb-q-t">2 &middot; Biggest mains (230V) appliance you&rsquo;ll run?</p>
            <div class="vb-chips" id="vb-inv">
              <button type="button" class="vb-chip is-on" data-inv="none">None &mdash; all 12V</button>
              <button type="button" class="vb-chip" data-inv="small">Laptop / TV (&le;800W)</button>
              <button type="button" class="vb-chip" data-inv="micro">Microwave (~900W)</button>
              <button type="button" class="vb-chip" data-inv="kettle">Kettle / induction (2kW+)</button>
            </div>
          </div>
          <div class="vb-q">
            <p class="vb-q-t">3 &middot; Charge from the engine while driving?</p>
            <div class="vb-chips" id="vb-b2b">
              <button type="button" class="vb-chip is-on" data-b2b="yes">Yes &mdash; sensible</button>
              <button type="button" class="vb-chip" data-b2b="no">No engine / static setup</button>
            </div>
          </div>
          <div class="vb-q">
            <p class="vb-q-t">4 &middot; Monitoring?</p>
            <div class="vb-chips" id="vb-mon">
              <button type="button" class="vb-chip is-on" data-mon="basic">Bluetooth basics</button>
              <button type="button" class="vb-chip" data-mon="full">Full remote (VRM &mdash; like our van)</button>
            </div>
          </div>
          <div class="vb-summary" id="vb-summary"></div>
          <h3 class="vb-sec-t">&#9889; The kit</h3>
          <div class="vb-spec" id="vb-spec"></div>
          <p class="vb-price-note">Price guides are typical UK retail as of mid-2026 &mdash; a planning aid, not a quote. The live links always show today&rsquo;s real price, and sales happen.</p>
          <h3 class="vb-sec-t">&#128268; Cables, lugs &amp; fuses &mdash; per circuit</h3>
          <p class="vb-sec-sub">Sized for short runs (&le;3m one way) at 12V &mdash; longer runs need upsizing for voltage drop. Use tinned (marine) cable and adhesive-lined heatshrink on every lug. <strong>A fuse protects its cable</strong> &mdash; never fit a bigger fuse than the cable is rated for.</p>
          <div class="vb-spec" id="vb-wiring"></div>
          <h3 class="vb-sec-t">&#128176; On a budget? Buy it in this order</h3>
          <p class="vb-sec-sub">You don&rsquo;t need it all on day one. This is the order that keeps you safe and useful at every stage &mdash; each phase works on its own.</p>
          <div class="vb-spec" id="vb-phases"></div>
          <h3 class="vb-sec-t">&#128736;&#65039; Tools for the job</h3>
          <div class="vb-tools-grid">
            <div class="vb-tools-col"><p class="vb-tools-h">Essential</p><div id="vb-tools-ess"></div></div>
            <div class="vb-tools-col"><p class="vb-tools-h">Nice to have</p><div id="vb-tools-nice"></div></div>
          </div>
          <h3 class="vb-sec-t">&#128161; Golden rules (read before you build)</h3>
          <ul class="vb-rules">
            <li><b>Fuse every positive</b> as close to the battery as practical &mdash; the fuse is there to protect the cable, not the gadget.</li>
            <li><b>Fat and short beats long and thin.</b> Keep inverter cables as short as possible, and if you parallel batteries, keep the pair&rsquo;s leads equal length.</li>
            <li><b>Crimp, don&rsquo;t solder.</b> Soldered joints crack with vehicle vibration; a properly crimped lug with adhesive heatshrink lasts decades.</li>
            <li><b>Put a battery isolator switch</b> on the main positive &mdash; one twist to make the whole system safe to work on.</li>
            <li><b>Everything negative goes through the shunt.</b> One cable from the battery negative to the shunt, and every load&rsquo;s negative on the far side &mdash; or your state-of-charge reading is fiction.</li>
            <li><b>Torque terminals to the manual&rsquo;s spec</b> and re-check them after your first weekend away &mdash; connections bed in.</li>
            <li><b>Ventilate and protect from temperature.</b> Lithium won&rsquo;t charge below 0&deg;C (the SuperPack protects itself) &mdash; inside the living space beats an unheated garage box.</li>
            <li><b>Know where DIY ends.</b> 12V is friendly; the 230V side (hook-up, sockets, RCDs) is qualified-electrician territory, and gas is Gas Safe territory. No exceptions.</li>
          </ul>
          <p class="vb-links-note" id="vb-links-note"></p>
          <div class="vb-actions">
            <button type="button" class="button primary" id="vb-dl">Download build sheet &#8595;</button>
            <button type="button" class="button vb-ghost" id="vb-copy">Copy full build list</button>
          </div>
          <p class="vb-note">Indicative starter build, not a full design &mdash; battery bank size, alternator limits, run lengths and ventilation all change the answer, and every van, boat and building is different. We check everything before we fit anything.</p>
          <div class="vb-fix">
            <h3>Or skip the spanner: we design, supply &amp; fit</h3>
            <p>This is exactly the kit we install &mdash; our own support van runs on it, streaming live on this website right now. Designed properly, fitted safely, monitored remotely, and one local number when you want a hand.</p>
            <div class="vb-fix-cta"><a class="button primary" href="/contact/">Design &amp; fit mine &#8594;</a><a class="button vb-ghost" href="/off-grid-victron-energy/">See our van live</a></div>
          </div>
        </div>
      </div>
      <style>
      #vb{max-width:860px;margin:0 auto}
      #vb .vb-q{margin-bottom:1.3rem}
      #vb .vb-q-t{font-size:.95rem;font-weight:700;margin:0 0 .6rem;color:#fff}
      #vb .vb-chips{display:flex;gap:.5rem;flex-wrap:wrap}
      #vb .vb-chip{font:inherit;font-size:.85rem;cursor:pointer;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.16);color:inherit;border-radius:99px;padding:.5rem 1rem;transition:all .15s}
      #vb .vb-chip.is-on{background:rgba(55,194,194,.15);border-color:var(--cyan,#37c2c2);color:var(--cyan,#37c2c2);font-weight:600}
      #vb .vb-slider{display:block;margin-top:.7rem;font-size:.8rem;color:var(--muted,#9aa6c2)}
      #vb .vb-slider output{color:var(--cyan,#37c2c2);font-weight:700}
      #vb .vb-slider a{color:var(--cyan,#37c2c2)}
      #vb input[type=range]{width:100%;margin-top:.4rem;accent-color:var(--cyan,#37c2c2);cursor:pointer}
      #vb .vb-summary{display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;margin:1.6rem 0 .6rem}
      #vb .vb-sum-chip{font-size:.78rem;padding:.4rem .8rem;border-radius:99px;border:1px solid rgba(57,211,83,.35);background:rgba(57,211,83,.08);color:#9fe8b0}
      #vb .vb-sum-chip b{color:#39d353}
      #vb .vb-sec-t{font-size:1.05rem;margin:1.8rem 0 .4rem;color:#fff}
      #vb .vb-sec-sub{font-size:.78rem;color:var(--muted,#9aa6c2);line-height:1.55;margin:0 0 .8rem}
      #vb .vb-price-note{font-size:.72rem;color:var(--muted,#9aa6c2);margin:.7rem 0 0;opacity:.85;text-align:center}
      #vb .vb-spec{display:flex;flex-direction:column;gap:.7rem}
      #vb .vb-item{padding:1rem 1.1rem;border-radius:13px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1)}
      #vb .vb-item-top{display:flex;justify-content:space-between;gap:.8rem;align-items:baseline;flex-wrap:wrap}
      #vb .vb-item-cat{font-size:.66rem;text-transform:uppercase;letter-spacing:.07em;color:var(--cyan,#37c2c2)}
      #vb .vb-item-name{font-size:1rem;font-weight:700;color:#fff;margin:.15rem 0}
      #vb .vb-item-price{font-size:.92rem;font-weight:800;color:#39d353;white-space:nowrap}
      #vb .vb-item-why{font-size:.82rem;color:var(--muted,#9aa6c2);line-height:1.5;margin:.2rem 0 .6rem}
      #vb .vb-buy{display:flex;gap:.5rem;flex-wrap:wrap}
      #vb .vb-buy a{font-size:.78rem;font-weight:600;text-decoration:none;padding:.4rem .85rem;border-radius:9px;border:1px solid rgba(255,255,255,.22);color:inherit;transition:all .15s}
      #vb .vb-buy a:hover{border-color:var(--cyan,#37c2c2);color:var(--cyan,#37c2c2)}
      #vb .vb-wire-specs{display:flex;gap:.4rem;flex-wrap:wrap;margin:.4rem 0 .6rem}
      #vb .vb-wire-chip{font-size:.72rem;font-weight:600;padding:.25rem .6rem;border-radius:7px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#dbe7ff}
      #vb .vb-phase{display:flex;gap:.9rem;align-items:flex-start;padding:.9rem 1.1rem;border-radius:13px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1)}
      #vb .vb-phase-n{flex:none;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.9rem;background:rgba(57,211,83,.12);border:1px solid rgba(57,211,83,.4);color:#39d353}
      #vb .vb-phase-b{flex:1}
      #vb .vb-phase-t{margin:0;font-size:.95rem;font-weight:700;color:#fff}
      #vb .vb-phase-t span{font-weight:800;color:#39d353;font-size:.85rem;margin-left:.5rem;white-space:nowrap}
      #vb .vb-phase-d{margin:.2rem 0 0;font-size:.8rem;color:var(--muted,#9aa6c2);line-height:1.5}
      #vb .vb-tools-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
      #vb .vb-tools-col{padding:1rem 1.1rem;border-radius:13px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1)}
      #vb .vb-tools-h{margin:0 0 .6rem;font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;color:var(--cyan,#37c2c2)}
      #vb .vb-tool{padding:.45rem 0;border-top:1px solid rgba(255,255,255,.06);font-size:.84rem}
      #vb .vb-tool:first-child{border-top:0}
      #vb .vb-tool b{color:#fff;font-weight:600;display:block}
      #vb .vb-tool span{color:var(--muted,#9aa6c2);font-size:.76rem;line-height:1.45;display:block;margin:.1rem 0 .3rem}
      #vb .vb-tool a{font-size:.72rem;font-weight:600;text-decoration:none;color:var(--cyan,#37c2c2);margin-right:.7rem}
      #vb .vb-rules{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.55rem}
      #vb .vb-rules li{padding:.7rem 1rem .7rem 2.2rem;border-radius:11px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);font-size:.85rem;color:var(--muted,#9aa6c2);line-height:1.55;position:relative}
      #vb .vb-rules li::before{content:"\2713";position:absolute;left:.85rem;color:#39d353;font-weight:800}
      #vb .vb-rules b{color:#fff}
      #vb .vb-links-note{text-align:center;font-size:.72rem;color:var(--muted,#9aa6c2);margin:1.2rem 0 0;opacity:.85}
      #vb .vb-actions{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center;margin-top:1rem}
      #vb .vb-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      #vb .vb-ghost.done{border-color:#2ecc71;color:#2ecc71}
      #vb .vb-note{margin:1.4rem auto 0;max-width:72ch;text-align:center;font-size:.76rem;color:var(--muted,#9aa6c2);line-height:1.6}
      #vbtool .vb-fix{max-width:860px;margin:2rem auto 0;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #vbtool .vb-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #vbtool .vb-fix p{margin:0 auto 1.1rem;max-width:56ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #vbtool .vb-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      @media(max-width:640px){#vb .vb-tools-grid{grid-template-columns:1fr}}
      </style>
      <script>
      (function(){
        var root=document.getElementById('vb'); if(!root) return;
        var AMZN_TAG='';   /* Amazon Associates tag, e.g. '365techies-21' — leave empty for plain links */
        function amzn(q){ return 'https://www.amazon.co.uk/s?k='+encodeURIComponent(q)+(AMZN_TAG?('&tag='+AMZN_TAG):''); }
        function bimble(q){ return 'https://www.bimblesolar.com/index.php?route=product/search&search='+encodeURIComponent(q); }
        function buyBtns(q){ return '<div class="vb-buy"><a href="'+amzn(q)+'" target="_blank" rel="noopener'+(AMZN_TAG?' sponsored':'')+'">Amazon UK &#8599;</a><a href="'+bimble(q)+'" target="_blank" rel="noopener">Bimble Solar &#8599;</a></div>'; }
        function gb(lo,hi){ return lo==null?null:('&pound;'+lo+'&ndash;&pound;'+hi); }
        var state={wh:800,inv:'none',b2b:'yes',mon:'basic'};
        function chipGroup(sel,attr,key){
          root.querySelectorAll(sel+' .vb-chip').forEach(function(b){
            b.addEventListener('click',function(){
              root.querySelectorAll(sel+' .vb-chip').forEach(function(x){x.classList.remove('is-on');});
              b.classList.add('is-on'); state[key]=b.getAttribute(attr); calc();
            });
          });
        }
        var whR=root.querySelector('#vb-wh'), whOut=root.querySelector('#vb-wh-out');
        root.querySelectorAll('[data-wh]').forEach(function(b){
          b.addEventListener('click',function(){
            root.querySelectorAll('[data-wh]').forEach(function(x){x.classList.remove('is-on');});
            b.classList.add('is-on'); whR.value=b.getAttribute('data-wh'); state.wh=+whR.value; whOut.textContent=state.wh; calc();
          });
        });
        whR.addEventListener('input',function(){ state.wh=+whR.value; whOut.textContent=state.wh;
          root.querySelectorAll('[data-wh]').forEach(function(x){x.classList.remove('is-on');}); calc(); });
        chipGroup('#vb-inv','data-inv','inv'); chipGroup('#vb-b2b','data-b2b','b2b'); chipGroup('#vb-mon','data-mon','mon');
        /* price bands: typical UK retail, mid-2026 — a labelled GUIDE; live links show today's price */
        var MPPTS=[
          {max:220, name:'Victron SmartSolar MPPT 75/15',  lo:70, hi:95,  battmm:'6mm&sup2;',  fuse:'20A blade/MIDI', lug:'ferrule (screw terminal)', fq:'20A midi fuse'},
          {max:290, name:'Victron SmartSolar MPPT 100/20', lo:100,hi:130, battmm:'6mm&sup2;',  fuse:'25A MIDI',       lug:'ferrule (screw terminal)', fq:'25A midi fuse'},
          {max:440, name:'Victron SmartSolar MPPT 100/30', lo:140,hi:180, battmm:'10mm&sup2;', fuse:'40A MIDI',       lug:'ferrule (screw terminal)', fq:'40A midi fuse'},
          {max:700, name:'Victron SmartSolar MPPT 100/50', lo:200,hi:250, battmm:'16mm&sup2;', fuse:'60A MIDI',       lug:'ferrule (screw terminal)', fq:'60A midi fuse'},
          {max:1000,name:'Victron SmartSolar MPPT 150/70', lo:380,hi:460, battmm:'25mm&sup2;', fuse:'100A MEGA',      lug:'25mm&sup2; lugs at the fuse/busbar end', fq:'100A mega fuse'}
        ];
        var INV={
          small:{name:'Victron Phoenix 12/800',q:'Victron Phoenix inverter 12 800',lo:180,hi:230,why:'Clean 230V for laptops, TVs and chargers up to ~650W continuous.',
                 mm:'25mm&sup2;',fuse:'100A MEGA',lug:'25mm&sup2; M8 lugs',cq:'25mm2 tinned battery cable',lq:'25mm2 M8 copper tube lug',fq:'100A mega fuse'},
          micro:{name:'Victron MultiPlus 12/2000/80',q:'Victron MultiPlus 12 2000',lo:700,hi:880,why:'Runs a ~900W microwave with headroom, and doubles as an 80A mains charger on hook-up.',
                 mm:'70mm&sup2; (or 2&times; 35mm&sup2;)',fuse:'300A MEGA',lug:'70mm&sup2; M8 lugs',cq:'70mm2 flexible battery cable',lq:'70mm2 M8 copper tube lug',fq:'300A mega fuse'},
          kettle:{name:'Victron MultiPlus 12/3000/120',q:'Victron MultiPlus 12 3000',lo:1000,hi:1250,why:'Kettles and induction hobs pull 2&ndash;3kW &mdash; this handles them, and charges at 120A on hook-up.',
                 mm:'2&times; 70mm&sup2; per pole',fuse:'400A (Class-T with lithium)',lug:'70mm&sup2; M8 lugs',cq:'70mm2 flexible battery cable',lq:'70mm2 M8 copper tube lug',fq:'Class-T fuse 400A'}
        };
        function calc(){
          var whLoss=state.wh*1.15, ahDay=whLoss/12;
          var liAh=Math.ceil(ahDay*1.5/0.9/10)*10;
          var pvW=Math.ceil(whLoss/2.5*1.25/10)*10;
          var pvSummer=Math.ceil(whLoss/4.2*1.25/10)*10;
          var panels=Math.max(1,Math.ceil(pvW/175)), pvTot=panels*175;
          var items=[], wiring=[];
          /* ---- kit (with price bands) ---- */
          if(liAh<=100) items.push({cat:'Battery',name:'Victron SuperPack 12.8V 100Ah',q:'Victron SuperPack 100Ah lithium',lo:650,hi:850,why:'Covers your '+Math.round(ahDay)+' Ah/day with a 1.5-day buffer, using lithium&rsquo;s ~90% usable capacity. Built-in BMS &mdash; the DIY-friendly one.'});
          else if(liAh<=200) items.push({cat:'Battery',name:'Victron SuperPack 12.8V 200Ah (or 2&times; 100Ah)',q:'Victron SuperPack 200Ah lithium',lo:1200,hi:1600,why:'Covers your '+Math.round(ahDay)+' Ah/day with a 1.5-day buffer. Built-in BMS &mdash; the DIY-friendly one.'});
          else if(liAh<=400) items.push({cat:'Battery',name:'2&times; Victron SuperPack 12.8V 200Ah',q:'Victron SuperPack 200Ah lithium',lo:2400,hi:3100,why:'You need ~'+liAh+' Ah of lithium for '+Math.round(ahDay)+' Ah/day with buffer &mdash; paired SuperPacks keep it simple (equal-length pair leads!).'});
          else items.push({cat:'Battery',name:'Victron Smart LiFePO4 bank ('+liAh+' Ah) &mdash; talk to us',q:'Victron Smart LiFePO4 330Ah',lo:null,hi:null,why:'At this size you&rsquo;re into external-BMS territory with Class-T fusing &mdash; great systems, but they deserve proper design (and a proper quote).'});
          items.push({cat:'Solar panels',name:panels+'&times; 175W rigid panel ('+pvTot+'W total)',q:'175W rigid solar panel',lo:panels*100,hi:panels*140,why:'Sized for spring/autumn (~'+pvW+'W needed); summer needs only ~'+pvSummer+'W. UK winter is ~1 sun-hour &mdash; plan on engine or hook-up charging then.'});
          var m=null; for(var i=0;i<MPPTS.length;i++){ if(pvTot<=MPPTS[i].max){ m=MPPTS[i]; break; } }
          if(m) items.push({cat:'Solar controller',name:m.name,q:m.name,lo:m.lo,hi:m.hi,why:'Matched to '+pvTot+'W of panels on a 12V system, with Bluetooth built in.'});
          else items.push({cat:'Solar controller',name:'Dual controllers &mdash; talk to us',q:'Victron SmartSolar MPPT 150/70',lo:null,hi:null,why:'Over 1kW of solar on 12V wants splitting across two controllers &mdash; worth designing properly.'});
          if(state.b2b==='yes') items.push({cat:'Engine charging',name:'Victron Orion XS 12/12-50',q:'Victron Orion XS 12 12 50',lo:180,hi:230,why:'Up to 50A into the battery while you drive &mdash; smart-alternator safe, and your reliable winter charger.'});
          var inv=INV[state.inv]||null;
          if(inv) items.push({cat:state.inv==='small'?'Inverter':'Inverter/charger',name:inv.name,q:inv.q,lo:inv.lo,hi:inv.hi,why:inv.why});
          if(state.mon==='full'){ items.push({cat:'Monitoring',name:'Victron SmartShunt 500A + Cerbo GX + GX Touch 50',q:'Victron Cerbo GX',lo:440,hi:560,why:'The full remote-monitoring stack (VRM) &mdash; the exact setup streaming our own van live on this site.'}); }
          else items.push({cat:'Monitoring',name:'Victron SmartShunt 500A',q:'Victron SmartShunt 500A',lo:90,hi:115,why:'Proper state-of-charge on your phone via Bluetooth &mdash; the gauge every lithium system needs.'});
          /* ---- totals ---- */
          var tLo=0,tHi=0,unpriced=false;
          items.forEach(function(it){ if(it.lo==null){ unpriced=true; } else { tLo+=it.lo; tHi+=it.hi; } });
          var cabLo=Math.round(tLo*0.10/10)*10, cabHi=Math.round(tHi*0.15/10)*10;
          /* ---- wiring per circuit ---- */
          var mainFuse = inv ? inv.fuse : '100A MEGA';
          var mainFq   = inv ? inv.fq   : '100A mega fuse';
          var mainMm   = inv ? inv.mm   : '25mm&sup2;';
          var mainCq   = inv ? inv.cq   : '25mm2 tinned battery cable';
          var mainLq   = inv ? inv.lq   : '25mm2 M8 copper tube lug';
          wiring.push({cat:'Main battery circuit',name:'Isolator switch + main fuse on the positive',specs:[mainMm+' cable',mainFuse,'M8 lugs','isolator 275A+'],
            why:'The backbone: battery positive &#8594; isolator &#8594; main fuse &#8594; busbar. Sized to the biggest load ('+(inv?'your inverter':'the 12V system')+').',
            links:[['Battery isolator switch 275A','battery isolator switch'],[mainFuse.indexOf('Class-T')>=0?'Class-T fuse + holder':'MEGA fuse + holder',mainFq],['Cable: '+mainCq,mainCq],['Lugs',mainLq]]});
          wiring.push({cat:'Battery negative',name:'Battery &minus; &#8594; SmartShunt &#8594; system',specs:[mainMm+' cable','M10 lugs at the shunt','M8 at busbar'],
            why:'One cable from battery negative to the shunt&rsquo;s BATTERY-ONLY side; everything else on the far side. The SmartShunt&rsquo;s studs are M10 &mdash; don&rsquo;t squeeze M8 lugs on.',
            links:[['Cable: '+mainCq,mainCq],['Lugs: M10','70mm2 M10 copper tube lug']]});
          if(m) wiring.push({cat:'Solar &#8594; battery',name:m.name+' battery side',specs:[m.battmm+' cable',m.fuse,m.lug],
            why:'Fuse between controller and busbar. The controller&rsquo;s screw terminals take bare/ferruled cable &mdash; lugs only at the fuse/busbar end.',
            links:[['Cable: '+m.battmm.replace(/&sup2;/g,'2')+' tinned',m.battmm.replace(/mm&sup2;/,'mm2')+' tinned cable'],['Fuse: '+m.fuse,m.fq]]});
          wiring.push({cat:'Panels &#8594; controller',name:'PV wiring',specs:['6mm&sup2; solar cable','MC4 connectors','roof gland'],
            why:'UV-stable twin solar cable through a waterproof roof gland. Panels in series keeps current low &mdash; check the controller&rsquo;s max PV voltage on cold mornings.',
            links:[['6mm&sup2; solar cable','6mm2 solar cable'],['MC4 connectors','MC4 connectors'],['Cable roof gland','solar cable entry gland']]});
          if(state.b2b==='yes') wiring.push({cat:'Engine &#8594; battery',name:'Orion XS circuit',specs:['16mm&sup2; (&le;3m) / 25mm&sup2; longer','60A MIDI fuse at BOTH ends','16mm&sup2; M8 lugs'],
            why:'Fused at the starter battery AND the leisure battery &mdash; this cable runs the length of the vehicle, so protect both ends.',
            links:[['Cable: 16mm2 tinned','16mm2 tinned battery cable'],['Fuses: 60A MIDI','60A midi fuse'],['Lugs: 16mm&sup2; M8','16mm2 M8 copper tube lug']]});
          wiring.push({cat:'12V distribution',name:'Blade fuse box for the small stuff',specs:['10mm&sup2; feed','40A MIDI feed fuse','12-way fuse box'],
            why:'Lights, pumps, USB and fridge each get their own blade fuse. Label every circuit &mdash; future-you says thanks.',
            links:[['12-way blade fuse box','12 way blade fuse box negative bus'],['Cable: 10mm2','10mm2 tinned cable'],['Feed fuse: 40A MIDI','40A midi fuse']]});
          /* ---- buy-order phases (only what's in THIS build) ---- */
          var phases=[];
          var batt=items[0];
          phases.push({t:'The backbone: battery, shunt &amp; safety',p:gb(batt.lo?batt.lo+90:null,batt.hi?batt.hi+115:null),d:'Battery + SmartShunt + isolator and main fuse. Storage and an honest gauge come first &mdash; you can charge on hook-up (or your existing charger) while you save for the rest.'});
          if(state.b2b==='yes') phases.push({t:'Charging while driving',p:gb(180,230),d:'The Orion XS. Pound for pound the most dependable charge you can add &mdash; and it carries you through the UK winter, before solar even enters the chat.'});
          phases.push({t:'Solar for freedom',p:gb((m?m.lo:0)+panels*100,(m?m.hi:0)+panels*140),d:'Panels + controller. Now you park anywhere and the batteries fill themselves three seasons of the year.'});
          if(inv) phases.push({t:'230V comfort',p:gb(inv.lo,inv.hi),d:'The inverter'+(state.inv==='small'?'':'/charger')+' is the last of the big buys &mdash; unless mains appliances are the whole point of your build, it can happily wait a season.'});
          if(state.mon==='full') phases.push({t:'The brain (any time)',p:gb(350,445),d:'Cerbo GX + Touch 50 can join whenever &mdash; the moment they do, your system is watchable from anywhere, like our van on this site.'});
          /* ---- render ---- */
          root.querySelector('#vb-summary').innerHTML=
            '<span class="vb-sum-chip"><b>'+Math.round(whLoss)+'</b> Wh/day (incl. losses)</span>'+
            '<span class="vb-sum-chip"><b>'+liAh+'</b> Ah lithium</span>'+
            '<span class="vb-sum-chip"><b>'+pvTot+'</b> W solar</span>'+
            '<span class="vb-sum-chip">Kit guide: <b>'+(unpriced?('from &pound;'+tLo.toLocaleString()):('&pound;'+tLo.toLocaleString()+'&ndash;&pound;'+tHi.toLocaleString()))+'</b></span>'+
            '<span class="vb-sum-chip">+ <b>&pound;'+cabLo+'&ndash;&pound;'+cabHi+'</b> cabling &amp; fusing</span>';
          root.querySelector('#vb-spec').innerHTML=items.map(function(it){
            var price=gb(it.lo,it.hi);
            return '<div class="vb-item"><div class="vb-item-top"><div><div class="vb-item-cat">'+it.cat+'</div><div class="vb-item-name">'+it.name+'</div></div>'+(price?('<div class="vb-item-price">~'+price+'</div>'):'')+'</div>'+
              '<p class="vb-item-why">'+it.why+'</p>'+buyBtns(it.q)+'</div>';
          }).join('');
          root.querySelector('#vb-wiring').innerHTML=wiring.map(function(w){
            var chips=w.specs.map(function(s){return '<span class="vb-wire-chip">'+s+'</span>';}).join('');
            var links=w.links.map(function(l){return '<a href="'+amzn(l[1])+'" target="_blank" rel="noopener'+(AMZN_TAG?' sponsored':'')+'">'+l[0]+' &#8599;</a>';}).join('');
            return '<div class="vb-item"><div class="vb-item-cat">'+w.cat+'</div><div class="vb-item-name">'+w.name+'</div>'+
              '<div class="vb-wire-specs">'+chips+'</div><p class="vb-item-why">'+w.why+'</p><div class="vb-buy">'+links+'</div></div>';
          }).join('');
          root.querySelector('#vb-phases').innerHTML=phases.map(function(p,i){
            return '<div class="vb-phase"><div class="vb-phase-n">'+(i+1)+'</div><div class="vb-phase-b"><p class="vb-phase-t">'+p.t+(p.p?('<span>~'+p.p+'</span>'):'')+'</p><p class="vb-phase-d">'+p.d+'</p></div></div>';
          }).join('');
          root.__kit=items; root.__wiring=wiring; root.__phases=phases;
          root.__totals={tLo:tLo,tHi:tHi,unpriced:unpriced,cabLo:cabLo,cabHi:cabHi,whLoss:Math.round(whLoss),liAh:liAh,pvTot:pvTot};
        }
        var TOOLS_ESS=[
          ['Hydraulic lug crimper (8&ndash;70mm&sup2;)','One proper crimp beats ten dodgy ones &mdash; the single most important tool for battery cable.','hydraulic crimping tool 8-70mm2'],
          ['Ratchet crimper (0.5&ndash;6mm&sup2;)','For all the small-terminal 12V circuits &mdash; spades, rings and butt splices.','ratchet crimping tool set'],
          ['Heavy cable cutters','Clean square cuts on 25&ndash;70mm&sup2; cable; side-cutters won&rsquo;t do it.','heavy duty cable cutter 70mm2'],
          ['Wire strippers','Clean strips without nicking strands.','automatic wire strippers'],
          ['Heat gun + adhesive heatshrink','Seal every lug and joint against damp and vibration.','adhesive lined heatshrink kit'],
          ['Multimeter','Voltage, continuity and polarity &mdash; check twice, connect once.','digital multimeter auto ranging'],
          ['Insulated screwdriver set','For terminal blocks and busbars near live DC.','VDE insulated screwdriver set']
        ];
        var TOOLS_NICE=[
          ['MC4 spanner + crimp kit','If you&rsquo;re making your own panel leads rather than buying ready-made.','MC4 crimping tool kit'],
          ['Ferrule crimper + ferrules','Tidy, gas-tight ends for the MPPT&rsquo;s screw terminals.','ferrule crimping tool kit'],
          ['Clamp meter','Reads current without breaking a circuit &mdash; brilliant for commissioning.','DC clamp meter'],
          ['Torque screwdriver','Victron terminals have torque specs; this takes the guesswork out.','torque screwdriver set'],
          ['Grommets, split loom &amp; cable ties','Every hole through metal gets a grommet. No exceptions.','grommet assortment split loom kit'],
          ['Label printer','Label both ends of every cable &mdash; future-you (or your electrician) will love you.','label printer']
        ];
        function renderTools(){
          function row(t){ return '<div class="vb-tool"><b>'+t[0]+'</b><span>'+t[1]+'</span><a href="'+amzn(t[2])+'" target="_blank" rel="noopener'+(AMZN_TAG?' sponsored':'')+'">Amazon UK &#8599;</a><a href="'+bimble(t[2])+'" target="_blank" rel="noopener">Bimble &#8599;</a></div>'; }
          root.querySelector('#vb-tools-ess').innerHTML=TOOLS_ESS.map(row).join('');
          root.querySelector('#vb-tools-nice').innerHTML=TOOLS_NICE.map(row).join('');
          root.querySelector('#vb-links-note').innerHTML = AMZN_TAG
            ? 'Retail buttons open live searches. As an Amazon Associate we earn from qualifying purchases &mdash; at no extra cost to you. Bimble Solar links are not affiliated.'
            : 'Retail buttons open live searches on each store &mdash; we don&rsquo;t earn anything from them; it&rsquo;s simply the kit we rate and fit.';
        }
        function plain(h){ var d=document.createElement('div'); d.innerHTML=h; return d.textContent; }
        /* ---- branded downloadable build sheet ---- */
        root.querySelector('#vb-dl').addEventListener('click',function(){
          var items=root.__kit||[], wiring=root.__wiring||[], phases=root.__phases||[], T=root.__totals||{};
          var W=1080, rowH=46, y=0;
          var H=250 + items.length*rowH + 70 + wiring.length*rowH + 70 + phases.length*rowH + 210;
          var cv=document.createElement('canvas'); cv.width=W; cv.height=H; var x=cv.getContext('2d');
          x.fillStyle='#070d22'; x.fillRect(0,0,W,H);
          x.strokeStyle='rgba(125,170,220,0.25)'; x.lineWidth=2; x.strokeRect(14,14,W-28,H-28);
          x.fillStyle='#1d97e3'; x.font='700 26px "IBM Plex Mono", Consolas, monospace'; x.fillText('365 TECHIES',60,72);
          x.fillStyle='#9fb5d3'; x.font='16px "IBM Plex Mono", Consolas, monospace'; x.fillText('// MY VICTRON BUILD SHEET  ·  '+new Date().toLocaleDateString(),60,100);
          x.fillStyle='#eaf4ff'; x.font='800 40px Archivo, Arial, sans-serif'; x.fillText('Off-grid system plan',60,150);
          x.fillStyle='#39d353'; x.font='700 20px Archivo, Arial, sans-serif';
          x.fillText(T.whLoss+' Wh/day  ·  '+T.liAh+' Ah lithium  ·  '+T.pvTot+' W solar  ·  kit '+(T.unpriced?('from £'+T.tLo.toLocaleString()):('£'+T.tLo.toLocaleString()+'–£'+T.tHi.toLocaleString()))+' + £'+T.cabLo+'–£'+T.cabHi+' cabling',60,184);
          y=230;
          function section(title){ x.fillStyle='#37c2c2'; x.font='700 17px "IBM Plex Mono", Consolas, monospace'; x.fillText(title,60,y); y+=14; x.strokeStyle='rgba(255,255,255,0.12)'; x.beginPath(); x.moveTo(60,y); x.lineTo(W-60,y); x.stroke(); y+=32; }
          section('THE KIT');
          items.forEach(function(it){
            x.fillStyle='#9fb5d3'; x.font='12px Archivo, Arial, sans-serif'; x.fillText(plain(it.cat).toUpperCase(),60,y-14);
            x.fillStyle='#eaf4ff'; x.font='600 19px Archivo, Arial, sans-serif'; x.fillText(plain(it.name).slice(0,58),60,y+6);
            if(it.lo!=null){ x.fillStyle='#39d353'; x.font='700 18px Archivo, Arial, sans-serif'; x.textAlign='right'; x.fillText('~£'+it.lo+'–£'+it.hi,W-60,y+6); x.textAlign='left'; }
            y+=rowH;
          });
          y+=24; section('CABLES, LUGS & FUSES');
          wiring.forEach(function(w){
            x.fillStyle='#eaf4ff'; x.font='600 17px Archivo, Arial, sans-serif'; x.fillText(plain(w.cat)+': '+plain(w.name).slice(0,44),60,y-6);
            x.fillStyle='#9fb5d3'; x.font='14px Archivo, Arial, sans-serif'; x.fillText(w.specs.map(plain).join('  ·  ').slice(0,92),60,y+14);
            y+=rowH;
          });
          y+=24; section('ON A BUDGET — BUY IT IN THIS ORDER');
          phases.forEach(function(p,i){
            x.fillStyle='#39d353'; x.font='800 18px Archivo, Arial, sans-serif'; x.fillText((i+1)+'.',60,y);
            x.fillStyle='#eaf4ff'; x.font='600 17px Archivo, Arial, sans-serif'; x.fillText(plain(p.t).slice(0,54)+(p.p?('   ~'+plain(p.p)):''),88,y);
            y+=rowH-8;
          });
          y+=30;
          x.fillStyle='#9fb5d3'; x.font='13px Archivo, Arial, sans-serif';
          x.fillText('Indicative guide (typical UK retail, mid-2026) — not a quote. Fuses protect cables; sizes assume short runs at 12V.',60,y); y+=22;
          x.fillText('Golden rules: fuse every positive · crimp don’t solder · all negatives through the shunt · 230V = electrician.',60,y); y+=40;
          x.fillStyle='#eaf4ff'; x.font='700 24px Archivo, Arial, sans-serif'; x.fillText('Designed, supplied & fitted — or we’ll check your build, free.',60,y); y+=32;
          x.fillStyle='#1d97e3'; x.font='700 24px Archivo, Arial, sans-serif'; x.fillText('365techies.co.uk/victron-system-builder  ·  01202 775566',60,y);
          try{ var a=document.createElement('a'); a.download='365-victron-build-sheet.png'; a.href=cv.toDataURL('image/png'); a.click(); }catch(e){}
        });
        root.querySelector('#vb-copy').addEventListener('click',function(){
          var btn=this, items=root.__kit||[], wiring=root.__wiring||[], phases=root.__phases||[], T=root.__totals||{};
          var txt='My Victron build (via 365techies.co.uk/victron-system-builder/):\n'+
            'Kit guide: '+(T.unpriced?('from £'+T.tLo):('£'+T.tLo+'–£'+T.tHi))+' + £'+T.cabLo+'–£'+T.cabHi+' cabling & fusing (typical UK retail — check live prices)\n\nKIT\n'+
            items.map(function(it){ return '• '+plain(it.cat)+': '+plain(it.name)+(it.lo!=null?(' — ~£'+it.lo+'–£'+it.hi):''); }).join('\n')+
            '\n\nCABLES, LUGS & FUSES\n'+
            wiring.map(function(w){ return '• '+plain(w.cat)+': '+plain(w.name)+' — '+w.specs.map(plain).join(', '); }).join('\n')+
            '\n\nBUY IT IN THIS ORDER\n'+
            phases.map(function(p,i){ return (i+1)+'. '+plain(p.t)+(p.p?(' ~'+plain(p.p)):''); }).join('\n');
          function ok(){ btn.textContent='Copied!'; btn.classList.add('done'); setTimeout(function(){ btn.textContent='Copy full build list'; btn.classList.remove('done'); },1800); }
          if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(ok).catch(function(){}); }
          else { var ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); ok(); }catch(e){} document.body.removeChild(ta); }
        });
        renderTools();
        calc();
      })();
      </script>
    </section>'''

# Shared custom PC builder (v2: budget-allocation engine — YOUR budget split by build wisdom, estimated total,
# buy-first/trim advice and a branded downloadable build sheet; live prices come from the retailer links,
# never hardcoded/scraped — accuracy policy) — /custom-pc-builder/
PCBUILD_TOOL = r'''    <section class="section" aria-label="Custom PC builder" id="pcbtool">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FREE PC BUILDER</p>
          <h2 class="section-title section-title--center" data-title>Plan your custom PC, properly<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Tell us the budget and what it&rsquo;s for, and we&rsquo;ll split your money across the parts the way experienced builders do &mdash; what to spend on each component, what class of part that buys, a live Scan.co.uk search for each one, and a build sheet to download.</p>
        </div>
        <div id="pcb" data-reveal>
          <div class="pb-q">
            <p class="pb-q-t">1 &middot; What&rsquo;s this PC for?</p>
            <div class="pb-chips" id="pb-use">
              <button type="button" class="pb-chip is-on" data-use="gaming">Gaming</button>
              <button type="button" class="pb-chip" data-use="creative">Video / photo / streaming</button>
              <button type="button" class="pb-chip" data-use="office">Office &amp; everyday</button>
              <button type="button" class="pb-chip" data-use="cad">CAD / 3D / engineering</button>
            </div>
          </div>
          <div class="pb-q">
            <p class="pb-q-t">2 &middot; Total budget (excluding monitor &amp; peripherals)</p>
            <div class="pb-chips">
              <button type="button" class="pb-chip" data-budget="700">~&pound;700 entry</button>
              <button type="button" class="pb-chip is-on" data-budget="1200">~&pound;1200 sweet spot</button>
              <button type="button" class="pb-chip" data-budget="2000">&pound;2000 high end</button>
            </div>
            <label class="pb-slider"><span>Fine-tune: <output id="pb-b-out">&pound;1200</output></span>
            <input type="range" id="pb-b" min="500" max="3500" step="50" value="1200"></label>
          </div>
          <div class="pb-q">
            <p class="pb-q-t">3 &middot; Extras</p>
            <div class="pb-chips">
              <label class="pb-check"><input type="checkbox" id="pb-win" checked> Include a genuine Windows 11 licence (set aside ~&pound;110)</label>
              <label class="pb-check"><input type="checkbox" id="pb-wifi"> I need built-in Wi-Fi</label>
              <label class="pb-check"><input type="checkbox" id="pb-quiet"> Quiet build matters to me</label>
            </div>
          </div>
          <div class="pb-summary" id="pb-summary"></div>
          <div class="pb-warn" id="pb-warn" hidden></div>
          <h3 class="pb-sec-t">&#128295; Your build &mdash; where the money goes</h3>
          <div class="pb-spec" id="pb-spec"></div>
          <h3 class="pb-sec-t">&#128176; Tight budget? What to buy first &mdash; and what can wait</h3>
          <ul class="pb-rules">
            <li><b>The power supply never gets trimmed.</b> Buy the quality 80+ Gold unit on day one &mdash; it protects everything you add later, and a good one outlives two builds.</li>
            <li><b>Motherboard, CPU, PSU and case first.</b> That&rsquo;s a machine that boots (on integrated graphics if your CPU has them) and a platform you&rsquo;ll never have to rip apart.</li>
            <li><b>The graphics card can come last.</b> GPU prices swing more than any other part &mdash; bridge with integrated graphics or a cheap used card, then pounce when the sales hit.</li>
            <li><b>Storage and memory are the easy laters.</b> Start at 1TB and one 2&times;8GB kit if you must &mdash; both drop in later in minutes. Just always buy RAM as a matched pair, never a single stick &ldquo;to add to&rdquo;.</li>
            <li><b>Case bling and RGB wait at the back of the queue.</b> A &pound;60 mesh case cools as well as a &pound;150 showpiece &mdash; looks are the one upgrade with zero performance.</li>
            <li><b>Under ~&pound;600 all-in?</b> Be honest with yourself: a <a href="/dell-hardware/">refurbished business-grade Dell from &pound;299</a> plus a graphics card later usually beats a compromised new build.</li>
          </ul>
          <h3 class="pb-sec-t">&#128161; Golden rules of PC building</h3>
          <ul class="pb-rules">
            <li><b>Never cheap out on the power supply.</b> A quality 80+ Gold unit from a reputable brand protects every other part &mdash; a bad one can take them with it.</li>
            <li><b>Balance beats bragging.</b> A monster graphics card with a weak processor (or vice versa) wastes money &mdash; that&rsquo;s exactly what the split above prevents.</li>
            <li><b>Always two sticks of RAM</b> (dual channel) &mdash; 2&times;16GB beats 1&times;32GB every time.</li>
            <li><b>Check the three clearances</b> before ordering: graphics-card length, CPU-cooler height, and radiator space &mdash; all listed on the case&rsquo;s spec page.</li>
            <li><b>Match the platform:</b> AMD Ryzen (AM5 socket) and Intel Core each need their own motherboard, and both are DDR5 now &mdash; the board&rsquo;s spec page is the truth.</li>
            <li><b>Buy the storage you&rsquo;ll actually need.</b> Migrating a full Windows drive later is a faff &mdash; 1TB minimum, 2TB if you record or edit.</li>
            <li><b>Airflow before aesthetics.</b> A mesh-front case with two good fans quietly outperforms a pretty glass box that cooks.</li>
            <li><b>First build? Take your time.</b> Build on the motherboard box, touch the case metal before handling parts, and follow the manual&rsquo;s order. It&rsquo;s Lego with one rule: don&rsquo;t force anything.</li>
          </ul>
          <h3 class="pb-sec-t">&#128736;&#65039; Tools (you need less than you think)</h3>
          <ul class="pb-rules">
            <li><b>A #2 Phillips screwdriver</b> &mdash; magnetic tip ideally. That&rsquo;s genuinely 95% of it.</li>
            <li><b>A USB stick (8GB+)</b> for the Windows installer, made with Microsoft&rsquo;s free Media Creation Tool.</li>
            <li><b>Nice to have:</b> a magnetic parts tray, zip ties for cable tidying, and a torch. Thermal paste comes pre-applied on most coolers.</li>
          </ul>
          <p class="pb-links-note" id="pb-links-note"></p>
          <div class="pb-actions">
            <button type="button" class="button primary" id="pb-dl">Download build sheet &#8595;</button>
            <button type="button" class="button pb-ghost" id="pb-copy">Copy build plan</button>
          </div>
          <p class="pb-note">Honest guidance, not gospel: component generations move fast, so we point you at the right <em>class</em> of part for your money and link to live listings rather than quoting prices that would be stale by Friday. Sales (and GPU price swings!) can move the sweet spots.</p>
          <div class="pb-fix">
            <h3>Want a second pair of eyes?</h3>
            <p>Send us your parts basket before you hit buy and we&rsquo;ll sanity-check it free &mdash; compatibility, balance and honest &ldquo;spend less here, more there&rdquo; advice. And if the budget&rsquo;s tight: our refurbished business-grade Dells from &pound;299 beat most sub-&pound;500 new builds.</p>
            <div class="pb-fix-cta"><a class="button primary" href="/contact/">Sanity-check my build &#8594;</a><a class="button pb-ghost" href="/dell-hardware/">Refurbished Dells</a></div>
          </div>
        </div>
      </div>
      <style>
      #pcb{max-width:860px;margin:0 auto}
      #pcb .pb-q{margin-bottom:1.3rem}
      #pcb .pb-q-t{font-size:.95rem;font-weight:700;margin:0 0 .6rem;color:#fff}
      #pcb .pb-chips{display:flex;gap:.5rem;flex-wrap:wrap}
      #pcb .pb-chip{font:inherit;font-size:.85rem;cursor:pointer;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.16);color:inherit;border-radius:99px;padding:.5rem 1rem;transition:all .15s}
      #pcb .pb-chip.is-on{background:rgba(55,194,194,.15);border-color:var(--cyan,#37c2c2);color:var(--cyan,#37c2c2);font-weight:600}
      #pcb .pb-check{display:flex;align-items:center;gap:.5rem;font-size:.85rem;padding:.4rem .2rem;color:var(--muted,#9aa6c2)}
      #pcb .pb-check input{accent-color:var(--cyan,#37c2c2);width:1.05rem;height:1.05rem}
      #pcb .pb-slider{display:block;margin-top:.7rem;font-size:.8rem;color:var(--muted,#9aa6c2)}
      #pcb .pb-slider output{color:var(--cyan,#37c2c2);font-weight:700}
      #pcb input[type=range]{width:100%;margin-top:.4rem;accent-color:var(--cyan,#37c2c2);cursor:pointer}
      #pcb .pb-summary{display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;margin:1.6rem 0 .6rem}
      #pcb .pb-sum-chip{font-size:.78rem;padding:.4rem .8rem;border-radius:99px;border:1px solid rgba(57,211,83,.35);background:rgba(57,211,83,.08);color:#9fe8b0}
      #pcb .pb-sum-chip b{color:#39d353}
      #pcb .pb-warn{margin:.6rem 0 0;padding:.8rem 1rem;border-radius:11px;border:1px solid rgba(241,196,15,.4);background:rgba(241,196,15,.08);font-size:.84rem;color:#f5d97e;line-height:1.5;text-align:center}
      #pcb .pb-sec-t{font-size:1.05rem;margin:1.8rem 0 .6rem;color:#fff}
      #pcb .pb-spec{display:flex;flex-direction:column;gap:.7rem}
      #pcb .pb-item{padding:1rem 1.1rem;border-radius:13px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1)}
      #pcb .pb-item-top{display:flex;justify-content:space-between;gap:.8rem;align-items:baseline;flex-wrap:wrap}
      #pcb .pb-item-cat{font-size:.66rem;text-transform:uppercase;letter-spacing:.07em;color:var(--cyan,#37c2c2)}
      #pcb .pb-item-name{font-size:1rem;font-weight:700;color:#fff;margin:.15rem 0}
      #pcb .pb-item-spend{font-size:.95rem;font-weight:800;color:#39d353;white-space:nowrap}
      #pcb .pb-item-why{font-size:.82rem;color:var(--muted,#9aa6c2);line-height:1.55;margin:.2rem 0 .6rem}
      #pcb .pb-buy{display:flex;gap:.5rem;flex-wrap:wrap}
      #pcb .pb-buy a{font-size:.78rem;font-weight:600;text-decoration:none;padding:.4rem .85rem;border-radius:9px;border:1px solid rgba(255,255,255,.22);color:inherit;transition:all .15s}
      #pcb .pb-buy a:hover{border-color:var(--cyan,#37c2c2);color:var(--cyan,#37c2c2)}
      #pcb .pb-rules{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.55rem}
      #pcb .pb-rules li{padding:.7rem 1rem .7rem 2.2rem;border-radius:11px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);font-size:.85rem;color:var(--muted,#9aa6c2);line-height:1.55;position:relative}
      #pcb .pb-rules li::before{content:"\2713";position:absolute;left:.85rem;color:#39d353;font-weight:800}
      #pcb .pb-rules b{color:#fff}
      #pcb .pb-rules a{color:var(--cyan,#37c2c2)}
      #pcb .pb-links-note{text-align:center;font-size:.72rem;color:var(--muted,#9aa6c2);margin:1.2rem 0 0;opacity:.85}
      #pcb .pb-actions{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center;margin-top:1rem}
      #pcb .pb-ghost{background:transparent;border:1px solid rgba(255,255,255,.25);color:inherit}
      #pcb .pb-ghost.done{border-color:#2ecc71;color:#2ecc71}
      #pcb .pb-note{margin:1.4rem auto 0;max-width:72ch;text-align:center;font-size:.76rem;color:var(--muted,#9aa6c2);line-height:1.6}
      #pcbtool .pb-fix{max-width:860px;margin:2rem auto 0;padding:1.6rem;border-radius:16px;border:1px solid rgba(55,194,194,.35);background:rgba(55,194,194,.07);text-align:center}
      #pcbtool .pb-fix h3{margin:0 0 .5rem;font-size:1.2rem}
      #pcbtool .pb-fix p{margin:0 auto 1.1rem;max-width:56ch;color:var(--muted,#9aa6c2);font-size:.95rem;line-height:1.6}
      #pcbtool .pb-fix-cta{display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center}
      </style>
      <script>
      (function(){
        var root=document.getElementById('pcb'); if(!root) return;
        var AMZN_TAG='';
        function scan(q){ return 'https://www.scan.co.uk/search?q='+encodeURIComponent(q); }
        function amzn(q){ return 'https://www.amazon.co.uk/s?k='+encodeURIComponent(q)+(AMZN_TAG?('&tag='+AMZN_TAG):''); }
        function buy(q){ return '<div class="pb-buy"><a href="'+scan(q)+'" target="_blank" rel="noopener">Scan.co.uk &#8599;</a><a href="'+amzn(q)+'" target="_blank" rel="noopener'+(AMZN_TAG?' sponsored':'')+'">Amazon UK &#8599;</a></div>'; }
        var state={use:'gaming',b:1200};
        var PROFILES={
          gaming:  {gpu:.38,cpu:.18,mobo:.09,ram:.07,ssd:.08,psu:.07,kase:.08,cool:.05},
          creative:{gpu:.24,cpu:.26,mobo:.09,ram:.12,ssd:.12,psu:.07,kase:.05,cool:.05},
          office:  {gpu:0,  cpu:.30,mobo:.13,ram:.11,ssd:.16,psu:.11,kase:.12,cool:.07},
          cad:     {gpu:.28,cpu:.26,mobo:.08,ram:.14,ssd:.10,psu:.06,kase:.04,cool:.04}
        };
        var b=root.querySelector('#pb-b'), bOut=root.querySelector('#pb-b-out');
        root.querySelectorAll('#pb-use .pb-chip').forEach(function(c){ c.addEventListener('click',function(){
          root.querySelectorAll('#pb-use .pb-chip').forEach(function(x){x.classList.remove('is-on');});
          c.classList.add('is-on'); state.use=c.getAttribute('data-use'); calc(); }); });
        root.querySelectorAll('[data-budget]').forEach(function(c){ c.addEventListener('click',function(){
          root.querySelectorAll('[data-budget]').forEach(function(x){x.classList.remove('is-on');});
          c.classList.add('is-on'); b.value=c.getAttribute('data-budget'); state.b=+b.value; bOut.textContent='£'+state.b; calc(); }); });
        b.addEventListener('input',function(){ state.b=+b.value; bOut.textContent='£'+state.b;
          root.querySelectorAll('[data-budget]').forEach(function(x){x.classList.remove('is-on');}); calc(); });
        ['#pb-win','#pb-wifi','#pb-quiet'].forEach(function(s){ root.querySelector(s).addEventListener('change',calc); });
        function r10(x){ return Math.round(x/10)*10; }
        function gpuAdvice(x){
          if(x<160) return ['Graphics &mdash; step carefully','At this spend, integrated graphics or the used market often make more sense than a weak new card. Consider shifting budget here from the case, or ask us.','graphics card'];
          if(x<320) return ['Graphics card &mdash; 1080p class','Entry current-gen gaming class (the xx60 / RX x60 tier). Great 1080p, sensible 1440p on medium.','graphics card'];
          if(x<560) return ['Graphics card &mdash; 1440p class','The sweet-spot tier (xx60 Ti / xx70 class). Excellent 1440p and strong high-refresh 1080p.','graphics card 16GB'];
          return ['Graphics card &mdash; 4K / high-refresh class','Upper tier (xx70 Ti / xx80 class). 4K gaming and serious rendering acceleration.','graphics card'];
        }
        function cpuAdvice(x,use){
          if(x<130) return ['Processor &mdash; budget 6-core','Previous-gen Ryzen 5 / Core i5 class keeps things smooth without stealing budget from elsewhere.','Ryzen 5 processor'];
          if(x<240) return ['Processor &mdash; current 6-core sweet spot','Current-gen Ryzen 5 / Core i5 class: the best value in PC building, gaming or working.','Ryzen 5 9600X'];
          if(x<380) return [use==='gaming'?'Processor &mdash; gaming 8-core':'Processor &mdash; creator 8-core',use==='gaming'?'Ryzen 7 / Core i7 class; for pure gaming, the X3D gaming-cache variants are the kings.':'8-core Ryzen 7 / Core i7 class chews through exports and multitasking.',use==='gaming'?'Ryzen 7 X3D processor':'Ryzen 7 processor'];
          return ['Processor &mdash; flagship','Ryzen 9 / Core i9 class (or the top X3D for gaming) — for heavy creative and CAD workloads it pays for itself.','Ryzen 9 processor'];
        }
        function calc(){
          var win=root.querySelector('#pb-win').checked, wifi=root.querySelector('#pb-wifi').checked, quiet=root.querySelector('#pb-quiet').checked;
          var pool=state.b-(win?110:0);
          var P=PROFILES[state.use], items=[];
          var warn=root.querySelector('#pb-warn');
          if(state.b<600&&state.use!=='office'){ warn.innerHTML='Honestly? Below ~&pound;600 for a gaming/creative build, a <a href="/dell-hardware/" style="color:#f5d97e"><b>refurbished business-grade Dell from &pound;299</b></a> plus a modest graphics card usually beats an all-new build. Worth a chat before you spend.'; warn.hidden=false; }
          else if(state.use==='office'&&state.b>1200){ warn.innerHTML='For office work, &pound;'+state.b+' is more than you need &mdash; a &pound;700&ndash;&pound;900 build is already superb. Bank the rest or upgrade your monitor (the part you actually look at).'; warn.hidden=false; }
          else warn.hidden=true;
          var spend={}; Object.keys(P).forEach(function(k){ spend[k]=r10(pool*P[k]); });
          if(P.gpu>0){ var g=gpuAdvice(spend.gpu); items.push({cat:'Graphics',name:g[0],sp:spend.gpu,why:g[1],q:g[2]}); }
          var c=cpuAdvice(spend.cpu,state.use); items.push({cat:'Processor',name:c[0],sp:spend.cpu,why:c[1],q:c[2]});
          items.push({cat:'Motherboard',name:'Motherboard'+(wifi?' with built-in Wi-Fi':''),sp:spend.mobo,why:'Match the socket to your CPU (AMD AM5 or Intel current socket) — the mid-range B-series chipset boards are the value pick.'+(wifi?' Filter for a &ldquo;WiFi&rdquo; model — cheaper than adding a card.':''),q:wifi?'B650 WiFi motherboard':'B650 motherboard'});
          var ramBig=(state.use==='creative'||state.use==='cad'||spend.ram>=100);
          items.push({cat:'Memory',name:ramBig?'32GB DDR5 (2× 16GB)':'16GB DDR5 (2× 8GB)',sp:spend.ram,why:'Always a two-stick kit for dual channel. 6000MT/s is the sweet spot on AMD.'+(ramBig?' 32GB earns its keep in editing, tabs-everywhere and 3D.':''),q:ramBig?'32GB DDR5 6000 kit':'16GB DDR5 6000 kit'});
          var ssdBig=(state.use==='creative'||spend.ssd>=110);
          items.push({cat:'Storage',name:ssdBig?'2TB NVMe SSD (Gen4)':'1TB NVMe SSD (Gen4)',sp:spend.ssd,why:'Fast NVMe for Windows, apps and games. Buy the size you&rsquo;ll need &mdash; migrating later is a faff.',q:ssdBig?'2TB NVMe Gen4 SSD':'1TB NVMe Gen4 SSD'});
          var w=(P.gpu===0)?'550W':(spend.gpu>500?'850W':(spend.gpu>250?'750W':'650W'));
          items.push({cat:'Power supply',name:w+' 80+ Gold PSU',sp:spend.psu,why:'The one part that protects all the others — quality brand, 80+ Gold, semi/fully modular for tidy cables. Headroom included for upgrades.',q:w+' 80 plus gold modular PSU'});
          items.push({cat:'Case',name:'Airflow case (mesh front)'+(quiet?' &mdash; quiet-focused':''),sp:spend.kase,why:(quiet?'Look at the quiet-optimised ranges (sound-damped panels, big slow fans). ':'Mesh front + two included fans beats glass-box looks. ')+'Check graphics-card length and cooler-height clearance on the spec page.',q:quiet?'quiet PC case':'airflow mid tower case mesh'});
          items.push({cat:'CPU cooler',name:(spend.cool>=90?'240mm AIO liquid cooler':(quiet?'Large quiet tower air cooler':'Tower air cooler')),sp:spend.cool,why:(spend.cool>=90?'Liquid cooling for the hotter flagship chips.':'A good tower air cooler is the value king — quieter and more reliable than cheap liquid cooling.')+' Check case clearance.',q:(spend.cool>=90?'240mm AIO CPU cooler':'tower CPU air cooler')});
          if(win) items.push({cat:'Operating system',name:'Windows 11 Home (genuine licence)',sp:110,why:'Budget ~&pound;110&ndash;&pound;120 for a genuine retail licence — dodgy &pound;3 keys get revoked. Install free via Microsoft&rsquo;s Media Creation Tool, add the key.',q:'Windows 11 Home retail licence'});
          var total=items.reduce(function(a,i){return a+i.sp;},0);
          root.querySelector('#pb-summary').innerHTML=
            '<span class="pb-sum-chip">Budget <b>&pound;'+state.b+'</b></span>'+
            '<span class="pb-sum-chip">Estimated build total <b>~&pound;'+total+'</b></span>'+
            '<span class="pb-sum-chip"><b>'+items.length+'</b> parts</span>'+
            (Math.abs(state.b-total)>30?'<span class="pb-sum-chip">~&pound;'+Math.abs(state.b-total)+' '+(state.b>total?'headroom for sales &amp; shipping':'over — trim the case or cooler')+'</span>':'');
          root.querySelector('#pb-spec').innerHTML=items.map(function(it){
            return '<div class="pb-item"><div class="pb-item-top"><div><div class="pb-item-cat">'+it.cat+'</div><div class="pb-item-name">'+it.name+'</div></div><div class="pb-item-spend">~&pound;'+it.sp+'</div></div>'+
              '<p class="pb-item-why">'+it.why+'</p>'+buy(it.q)+'</div>';
          }).join('');
          root.querySelector('#pb-links-note').innerHTML = AMZN_TAG
            ? 'Buttons open live searches — prices always come from the retailer, never from us. As an Amazon Associate we earn from qualifying purchases; Scan links are not affiliated.'
            : 'Buttons open live searches on each store — prices always come from the retailer, never from us, and we don&rsquo;t earn anything from these links.';
          root.__build=items; root.__meta={b:state.b,use:state.use,total:total};
        }
        function plain(h){ var d=document.createElement('div'); d.innerHTML=h; return d.textContent; }
        var BUYFIRST=[
          'PSU quality never gets trimmed — buy it right on day one',
          'Board + CPU + PSU + case first: a platform you never rip apart',
          'GPU last — bridge on integrated/used, pounce on the sales',
          'Storage & RAM drop in later (always matched RAM pairs)',
          'Case bling and RGB wait at the back of the queue'
        ];
        root.querySelector('#pb-dl').addEventListener('click',function(){
          var items=root.__build||[], M=root.__meta||{};
          var W=1080, rowH=52;
          var H=250 + items.length*rowH + 60 + BUYFIRST.length*36 + 190;
          var cv=document.createElement('canvas'); cv.width=W; cv.height=H; var x=cv.getContext('2d');
          x.fillStyle='#070d22'; x.fillRect(0,0,W,H);
          x.strokeStyle='rgba(125,170,220,0.25)'; x.lineWidth=2; x.strokeRect(14,14,W-28,H-28);
          x.fillStyle='#1d97e3'; x.font='700 26px "IBM Plex Mono", Consolas, monospace'; x.fillText('365 TECHIES',60,72);
          x.fillStyle='#9fb5d3'; x.font='16px "IBM Plex Mono", Consolas, monospace'; x.fillText('// MY PC BUILD PLAN  ·  '+new Date().toLocaleDateString(),60,100);
          var useLabel={gaming:'Gaming build',creative:'Creative build',office:'Office build',cad:'CAD / 3D build'}[M.use]||'Custom build';
          x.fillStyle='#eaf4ff'; x.font='800 40px Archivo, Arial, sans-serif'; x.fillText(useLabel,60,150);
          x.fillStyle='#39d353'; x.font='700 20px Archivo, Arial, sans-serif';
          x.fillText('Budget £'+M.b+'  ·  estimated build total ~£'+M.total+'  ·  '+items.length+' parts',60,184);
          var y=234;
          x.fillStyle='#37c2c2'; x.font='700 17px "IBM Plex Mono", Consolas, monospace'; x.fillText('THE BUILD',60,y); y+=14;
          x.strokeStyle='rgba(255,255,255,0.12)'; x.beginPath(); x.moveTo(60,y); x.lineTo(W-60,y); x.stroke(); y+=34;
          items.forEach(function(it){
            x.fillStyle='#9fb5d3'; x.font='12px Archivo, Arial, sans-serif'; x.fillText(plain(it.cat).toUpperCase(),60,y-16);
            x.fillStyle='#eaf4ff'; x.font='600 19px Archivo, Arial, sans-serif'; x.fillText(plain(it.name).slice(0,60),60,y+6);
            x.fillStyle='#39d353'; x.font='700 19px Archivo, Arial, sans-serif'; x.textAlign='right'; x.fillText('~£'+it.sp,W-60,y+6); x.textAlign='left';
            y+=rowH;
          });
          y+=18;
          x.fillStyle='#37c2c2'; x.font='700 17px "IBM Plex Mono", Consolas, monospace'; x.fillText('TIGHT BUDGET? BUY IN THIS ORDER',60,y); y+=14;
          x.strokeStyle='rgba(255,255,255,0.12)'; x.beginPath(); x.moveTo(60,y); x.lineTo(W-60,y); x.stroke(); y+=30;
          BUYFIRST.forEach(function(r,i){
            x.fillStyle='#39d353'; x.font='800 17px Archivo, Arial, sans-serif'; x.fillText((i+1)+'.',60,y);
            x.fillStyle='#dbe7ff'; x.font='15px Archivo, Arial, sans-serif'; x.fillText(r,88,y);
            y+=36;
          });
          y+=18;
          x.fillStyle='#9fb5d3'; x.font='13px Archivo, Arial, sans-serif';
          x.fillText('Allocations from your own budget — live prices come from the retailer. Golden rules: PSU quality · 2 RAM sticks · check the 3 clearances.',60,y); y+=38;
          x.fillStyle='#eaf4ff'; x.font='700 24px Archivo, Arial, sans-serif'; x.fillText('Free basket sanity-check before you buy — just send it over.',60,y); y+=32;
          x.fillStyle='#1d97e3'; x.font='700 24px Archivo, Arial, sans-serif'; x.fillText('365techies.co.uk/custom-pc-builder  ·  01202 775566',60,y);
          try{ var a=document.createElement('a'); a.download='365-pc-build-plan.png'; a.href=cv.toDataURL('image/png'); a.click(); }catch(e){}
        });
        root.querySelector('#pb-copy').addEventListener('click',function(){
          var btn=this, items=root.__build||[], M=root.__meta||{};
          var txt='My PC build plan — £'+M.b+' '+M.use+' (via 365techies.co.uk/custom-pc-builder/):\n'+
            'Estimated build total ~£'+M.total+'\n'+
            items.map(function(it){ return '• '+it.cat+': '+plain(it.name)+' — budget ~£'+it.sp; }).join('\n')+
            '\n\nBuy-first order: '+BUYFIRST.join(' → ');
          function ok(){ btn.textContent='Copied!'; btn.classList.add('done'); setTimeout(function(){ btn.textContent='Copy build plan'; btn.classList.remove('done'); },1800); }
          if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(ok).catch(function(){}); }
          else { var ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); ok(); }catch(e){} document.body.removeChild(ta); }
        });
        calc();
      })();
      </script>
    </section>'''

# "Your PC, from anywhere" — flagship support-plan feature band (Splashtop Business remote access).
# Soft claim by design: "we set you up" as part of support — no per-plan inclusion/pricing stated (unconfirmed).
REMOTE_ACCESS_BAND = f'''    <section class="section" aria-label="Remote access with support">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">// A FLAGSHIP SUPPORT FEATURE</p>
          <h2 class="section-title" data-title>Your PC, from anywhere<span class="title-underline"></span></h2>
          <p>As a support customer, we set you up with <strong>secure remote access to your own home or work PC</strong> &mdash; powered by Splashtop Business. Your real desktop, files and programs on any device, from anywhere, encrypted end to end.</p>
          <p>We install it, secure it with two-factor sign-in, keep your PC reachable and support the lot &mdash; you just tap your computer and you&rsquo;re at your desk.</p>
          <div class="hero__actions" style="margin-top:1.2rem">
            <a class="button primary" href="/splashtop-business-guide/">How it works &mdash; the guide &#8594;</a>
            <a class="button secondary" href="/contact/">Set me up</a>
          </div>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Your work or home PC on any device","Bank-grade encryption + two-factor","Multi-monitor, file transfer &amp; remote print","Blanks the screen &amp; locks behind you","Installed, configured &amp; supported by us","Feels like sitting at your own desk"])}
        </ul>
      </div>
    </section>'''

PAGES = []
def howto_node(slug, name, steps):
    return {"@type": "HowTo", "@id": f"{SITE}/{slug}/#howto", "name": name,
            "step": [{"@type": "HowToStep", "position": i + 1, "name": n, "text": t} for i, (n, t) in enumerate(steps)]}

def _faq_q(q, a):
    return {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}

def tool_seo_html(slug, enh):
    """Visible 'how it works' block appended to a tool page: answer-first sentence,
    optional key-facts HTML, ordered how-to steps and a mini-FAQ. Matches the injected schema."""
    ans = enh.get("answer", "")
    ht = enh.get("howto") or {}
    name = ht.get("name", "How it works")
    steps = ht.get("steps", [])
    kf = enh.get("keyfacts", "")
    faqs = enh.get("faqs", [])
    ans_html = f'\n        <p class="lede"><strong>{ans}</strong></p>' if ans else ""
    kf_html = f'\n        {kf}' if kf else ""
    steps_html = ""
    if steps:
        lis = "\n".join(f'          <li><strong>{n}</strong> &mdash; {t}</li>' for n, t in steps)
        steps_html = f'\n        <h3>Step by step</h3>\n        <ol data-stagger>\n{lis}\n        </ol>'
    faq_html_inner = ""
    if faqs:
        qa = "\n".join(f'          <h3>{q}</h3>\n          <p>{a}</p>' for q, a in faqs)
        faq_html_inner = f'\n        <h3 class="mono" style="opacity:.7">Good to know</h3>\n{qa}'
    return f'''    <section class="section section--alt" aria-label="How this tool works">
      <div class="wrap prose" data-reveal>
        <p class="eyebrow mono">// HOW IT WORKS</p>
        <h2 class="section-title" data-title>{name}<span class="title-underline"></span></h2>{ans_html}{kf_html}{steps_html}{faq_html_inner}
      </div>
    </section>'''

def add(**kw):
    _slug = kw.get("slug")
    if _slug in TOOL_TITLES:
        kw["title"] = TOOL_TITLES[_slug]
    _enh = TOOL_SEO.get(_slug)
    if _enh:
        if _enh.get("meta"):
            kw["desc"] = _enh["meta"]
        _orig = kw.get("schema")
        def _wrap(s, _orig=_orig, _e=_enh, _sl=_slug):
            obj = json.loads(_orig(s) if _orig else graph([]))
            g = obj["@graph"]
            ht = _e.get("howto")
            if ht and ht.get("steps"):
                g.append(howto_node(_sl, ht["name"], ht["steps"]))
            if _e.get("faqs"):
                items = [_faq_q(q, a) for q, a in _e["faqs"]]
                fp = next((n for n in g if isinstance(n, dict) and n.get("@type") == "FAQPage"), None)
                if fp is not None:
                    fp.setdefault("mainEntity", []).extend(items)
                else:
                    g.append({"@type": "FAQPage", "@id": f"{SITE}/{_sl}/#faq", "mainEntity": items})
            if _e.get("webapp") and not any(isinstance(n, dict) and n.get("@type") == "WebApplication" for n in g):
                g.append({"@type": "WebApplication", "name": _e.get("appName", "365 Techies free tool"),
                          "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web (all browsers)",
                          "url": f"{SITE}/{_sl}/", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"},
                          "provider": {"@id": SITE + "/#business"}})
            return json.dumps(obj, indent=2, ensure_ascii=False)
        kw["schema"] = _wrap
        if kw.get("content") is not None:
            kw["content"] = kw["content"] + "\n" + tool_seo_html(_slug, _enh)
    PAGES.append(kw)

# ============================================================ MONTHLY IT SUPPORT
add(
 slug="monthly-it-support",
 title="Monthly IT Support Subscriptions | 365 Techies",
 desc="Monthly IT support for homes and businesses across Dorset — £18.25/month per computer, cancel anytime, no call-out fee. Rated 4.9 on Google, friendly and family-run since 1995.",
 og_title="Monthly IT Support Subscriptions | 365 Techies",
 schema=lambda s: graph([
   crumb(s, "Monthly IT Support"), webpage(s, "Monthly IT Support Subscriptions", "Monthly IT support subscriptions for homes and small businesses across Dorset."),
   service(s, "Monthly IT Support", "Subscription IT support with regular maintenance, security checks and unlimited remote help.", "IT support subscription"),
   faqpage(s, [
     ("What is monthly IT support?", "Monthly IT support is a subscription that gives you ongoing help, regular maintenance, security checks and priority response for one predictable monthly cost — instead of paying per repair when something breaks."),
     ("How much does monthly IT support cost?", "Home support is £18.25/month per computer, and business support starts from £24.38/month per computer. Microsoft 365 can be added for £4.85/month per user. Every plan includes a full computer service every six weeks."),
     ("Can I cancel my plan?", "Yes. Plans are monthly and cancel-anytime with no lock-in contract."),
     ("Do you support homes and businesses?", "Yes — we support home users, home workers, sole traders and small businesses across Bournemouth, Poole and Dorset."),
     ("What is it like dealing with you day to day?", "Friendly and unhurried. We phone before we connect for a remote session or a full computer service, we call ahead with an estimated arrival time when we're visiting you, and if you'd like, we can send you a text reminder when your backup is due. Because we're a family team, you deal with the same familiar people who get to know how you like things set up."),
   ]),
 ]),
 content="\n".join([
   hero(bc("Monthly IT Support"), "// MONTHLY SUBSCRIPTIONS",
        'Monthly IT support <em class="grad grad--cyan">subscriptions</em>',
        hero_trust("Reliable monthly IT support for homes and businesses — remote help, regular maintenance, security checks and friendly technical support whenever you need it. £18.25 a month per computer, cancel anytime."),
        chips=["&pound;18.25/mo per computer", "Full service every 6 weeks", "Cancel anytime"]),
   uk_remote_band(alt=True),
   f'''    <section class="section" aria-label="What is monthly IT support">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — THE IDEA</p>
          <h2 class="section-title" data-title>Stop waiting for things to break<span class="title-underline"></span></h2>
          <p>Most people only call for IT help once something has already gone wrong — a slow laptop, a hacked email, a printer that won&rsquo;t play ball. By then it&rsquo;s stressful, urgent and often more expensive to fix.</p>
          <p><strong>Monthly IT support flips that around.</strong> For one predictable monthly cost you get regular maintenance, security checks, software updates and a friendly techie on hand — so problems are caught early or never happen at all.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Unlimited remote support","Full computer service every 6 weeks","Antivirus &amp; web protection","Windows &amp; software updates","Microsoft 365 help","Security &amp; backup checks","Priority response","One predictable monthly cost"])}
        </ul>
      </div>
    </section>''',
   f'''    <section class="section section--alt" aria-label="Who it is for">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — WHO IT&rsquo;S FOR</p>
          <h2 class="section-title section-title--center" data-title>Built for homes and growing businesses<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("home","Home users &amp; families","Friendly, patient help for everyday computers, laptops, printers and online accounts."),("user","Home workers","Keep email, Microsoft 365, Wi-Fi and devices working so you can stay productive at home."),("briefcase","Sole traders","Affordable cover so your computer, email and cloud systems just keep working."),("users","Small businesses","Like having your own IT department — without the cost of employing IT staff."),("bolt","Growing businesses","Scalable support, onboarding, security planning and technology advice as you grow."),("clock","Retired users","Unhurried, jargon-free help with laptops, email, photos, scams and online safety.")])}
        </div>
      </div>
    </section>''',
   f'''    <section class="section" aria-label="What is included">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — EVERY MONTH</p>
          <h2 class="section-title section-title--center" data-title>What&rsquo;s included every month<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("Regular maintenance","A full computer service every six weeks to keep devices fast, clean and healthy."),("Unlimited remote support","Secure help over Splashtop SOS, usually within minutes during opening hours."),("Security &amp; protection","Antivirus, web protection, patching and a real human to ask &lsquo;is this email safe?&rsquo;"),("Microsoft 365 help","Outlook, Teams, OneDrive and licensing — set up and kept working for you."),("Backup checks","Backups verified regularly &mdash; and we can text you a reminder to plug in your backup drive when one&rsquo;s due."),("Friendly advice","Plain-English guidance on new devices, software and staying safe online.")])}
        </ul>
        <p class="mono" style="text-align:center;margin-top:1.6rem"><a href="/preventative-maintenance/" style="color:var(--cyan)">See exactly what our 6-weekly preventative maintenance includes &#8594;</a></p>
      </div>
    </section>''',
   f'''    <section class="section section--alt" aria-label="Home or business">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/04 — CHOOSE YOUR PATH</p>
          <h2 class="section-title section-title--center" data-title>Home or business support<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="plan-grid">
          <article class="plan-card plan-card--home" data-reveal>
            <p class="plan-card__tag mono">FOR HOMES</p>
            <h3>Home IT Support</h3>
            <p class="plan-card__desc">Friendly monthly computer support for homes, families, home workers and retired users.</p>
            <p class="plan-card__price">&pound;18.25<span class="per">/mo per computer</span></p>
            <ul class="plan-card__features">
              <li>Unlimited remote support</li>
              <li>Full service every 6 weeks</li>
              <li>Wi-Fi, printer &amp; email help</li>
              <li>Microsoft 365 &amp; security</li>
            </ul>
            <a href="/home-it-support-plans/" class="button primary plan-card__cta">See Home Plans</a>
            <p class="mono" style="text-align:center;margin-top:.7rem;color:var(--faint);font-size:.6rem;letter-spacing:.12em">DIRECT DEBIT BY GOCARDLESS &middot; CANCEL ANYTIME</p>
          </article>
          <article class="plan-card plan-card--business" data-reveal>
            <p class="plan-card__badge mono">&#9733; MOST POPULAR</p>
            <p class="plan-card__tag mono">FOR BUSINESS</p>
            <h3>Business IT Support</h3>
            <p class="plan-card__desc">Reliable monthly IT support for sole traders and small businesses across Dorset.</p>
            <p class="plan-card__price"><span class="from mono">FROM</span> &pound;24.38<span class="per">/mo per computer</span></p>
            <ul class="plan-card__features">
              <li>Priority response</li>
              <li>Microsoft 365 management</li>
              <li>Cybersecurity &amp; backups</li>
              <li>Staff onboarding &amp; advice</li>
            </ul>
            <a href="/business-it-support-plans/" class="button primary plan-card__cta">See Business Plans</a>
            <p class="mono" style="text-align:center;margin-top:.7rem;color:var(--faint);font-size:.6rem;letter-spacing:.12em">DIRECT DEBIT BY GOCARDLESS &middot; CANCEL ANYTIME</p>
          </article>
        </div>
        <p class="plans-note mono" data-reveal>// NO LOCK-IN &middot; CANCEL ANYTIME &middot; FULL COMPUTER SERVICE EVERY 6 WEEKS</p>
      </div>
    </section>''',
   f'''    <section class="section" aria-label="Why subscription saves money">
      <div class="wrap split-2 split-2--flip">
        <ul class="checklist" data-stagger>
{checklist(["Catch problems before they become expensive","No surprise call-out fees","Faster, priority response","Devices last longer with regular care","Better security means fewer disasters","Predictable budgeting — one monthly cost"])}
        </ul>
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/05 — THE MATHS</p>
          <h2 class="section-title" data-title>Why a subscription saves money<span class="title-underline"></span></h2>
          <p>A single emergency repair, lost files or a security incident can cost far more than a year of monthly support. Regular maintenance keeps small issues small.</p>
          <p>You also save the hidden costs — the lost hours, the stress, and the &ldquo;I&rsquo;ll deal with it later&rdquo; that turns into a crisis. <strong>Prevention is cheaper than cure.</strong></p>
        </div>
      </div>
    </section>''',
   f'''    <section class="how section--alt" aria-label="How remote support works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/06 — HOW IT WORKS</p>
        <h2 class="section-title section-title--center" data-title>Up and running in 15 minutes<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("Pick your plan","Choose a home or business plan. Monthly rolling, no contracts, cancel anytime."),("We call, then connect","We phone to check you&rsquo;re ready, then connect securely via Splashtop SOS &mdash; you watch everything on screen."),("Covered every month","Maintenance, protection and a friendly techie on hand, every single month.")])}
        </ol>
      </div>
    </section>''',
   promise_strip(),
   faq_html([
     ("What is monthly IT support?", "Monthly IT support is a subscription that gives you ongoing help, regular maintenance, security checks and priority response for one predictable monthly cost — instead of paying per repair when something breaks."),
     ("How much does it cost?", "Home support is &pound;18.25/month per computer, and business support starts from &pound;24.38/month per computer. Microsoft 365 can be added for &pound;4.85/month per user. Every plan includes a full computer service every six weeks."),
     ("Can I cancel my plan?", "Yes — plans are monthly and cancel-anytime with no lock-in contract."),
     ("Do you support both homes and businesses?", "Yes. We support home users, home workers, sole traders and small businesses across Bournemouth, Poole and the rest of Dorset."),
     ("What is it like dealing with you day to day?", "Friendly and unhurried. We phone before we connect for a remote session or a full computer service, we call ahead with an estimated arrival time when we&rsquo;re visiting, and if you&rsquo;d like, we can text you a reminder when your backup&rsquo;s due. Because we&rsquo;re a family team, you deal with the same familiar people who get to know how you like things set up."),
   ]),
   REMOTE_ACCESS_BAND,
   cta("Start your monthly support plan", "Join the Dorset homes and businesses who never worry about IT. Pick a plan, or talk to a friendly techie first.",
       primary=("View Home Plans", "/home-it-support-plans/"), secondary=("View Business Plans", "/business-it-support-plans/")),
 ]),
)

# ============================================================ HOME IT SUPPORT SUBSCRIPTIONS
add(
 slug="home-it-support-subscriptions",
 title="Home IT Support Subscriptions | Monthly Computer Support",
 desc="Monthly home IT support subscriptions for home users, families, home workers and retired users in Dorset. Help with computers, laptops, printers, email, Wi-Fi, Microsoft 365 and security — £18.25/month per computer.",
 og_title="Home IT Support Subscriptions | 365 Techies",
 schema=lambda s: graph([
   crumb(s, "Home IT Support"), webpage(s, "Home IT Support Subscriptions", "Monthly home IT support for home users, families and home workers in Dorset."),
   service(s, "Home IT Support", "Friendly monthly computer support for homes, families, home workers and retired users.", "Home IT support"),
   faqpage(s, [
     ("Who is home IT support for?", "Home users, families, retired and disabled people, students and home workers who want patient, jargon-free help with their everyday technology. Supporting retired and disabled people is one of our specialisms."),
     ("What does home IT support cover?", "Computers and laptops, printers, Wi-Fi, email, Microsoft 365, Windows updates, security checks, slow-computer fixes, backups, new device setup and scam-prevention advice."),
     ("How quickly can you help?", "Most remote sessions start within minutes during opening hours (Mon–Fri, 9am–5pm), and subscribers always jump the queue."),
   ]),
 ]),
 content="\n".join([
   hero(bc("Home IT Support"), "// FOR HOMES",
        'Home IT support <em class="grad grad--cyan">subscriptions</em>',
        "Friendly monthly computer support for your home. Help with computers, laptops, printers, email, Wi-Fi, Microsoft 365, online accounts and security — patient, jargon-free and one message away.",
        cta1=("Get Monthly Home IT Support", "/home-it-support-plans/"), cta2=("Talk to a techie", "/contact/"),
        chips=["&pound;18.25/mo per computer", "Patient, jargon-free help", "Full service every 6 weeks"]),
   f'''    <section class="section" aria-label="Who it is for">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/01 — IDEAL FOR</p>
          <h2 class="section-title section-title--center" data-title>Help that feels human<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Perfect for anyone who wants reliable tech help without the jargon or the wait.</p>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("home","Home users","Everyday help keeping your computer fast, safe and working the way it should."),("users","Families","Cover for multiple computers, tablets, printers and online accounts under one plan."),("user","Home workers","Reliable email, Microsoft 365, Wi-Fi and devices so you can work without interruptions."),("clock","Retired users","Unhurried, friendly help with laptops, email, photos, video calls and online safety."),("shield","Less-confident users","No silly questions. We explain everything clearly and keep you protected."),("monitor","Students","Get assignments saved, backed up and devices running smoothly all term.")])}
        </div>
      </div>
    </section>''',
   f'''    <section class="section section--alt" aria-label="What is included">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/02 — WHAT WE HELP WITH</p>
          <h2 class="section-title" data-title>Everyday tech, sorted<span class="title-underline"></span></h2>
          <p>From a slow laptop to a printer that won&rsquo;t connect, we handle the everyday technology headaches so you don&rsquo;t have to. Most things are fixed remotely in minutes.</p>
          <p><strong>Every plan includes a <a href="/preventative-maintenance/">full computer service every six weeks</a></strong> — updates, clean-up, security and health checks — so your devices stay in great shape all year round.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Remote computer support","Laptop &amp; desktop help","Email setup &amp; repair","Printer troubleshooting","Wi-Fi help","Microsoft 365 support","Windows updates","Security checks","Slow computer fixes","Backup advice","New device setup","Scam &amp; fraud prevention"])}
        </ul>
      </div>
    </section>''',
   f'''    <section class="how" aria-label="How it works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/03 — GETTING STARTED</p>
        <h2 class="section-title section-title--center" data-title>Help in three simple steps<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("Tell us your setup","Each computer is &pound;18.25/mo, with Microsoft 365 available for &pound;4.85/mo per user. Monthly, no contract, cancel anytime."),("We get you set up","A quick secure connection and a friendly welcome — usually within minutes."),("Relax — you&rsquo;re covered","Message us any time you&rsquo;re stuck, and we&rsquo;ll keep everything healthy each month.")])}
        </ol>
      </div>
    </section>''',
   reviews_block([("A friendly team, there to help when needed. Nice to know that our laptops are being regularly checked for updates and kept virus free. Worth the monthly fee.", "Alan Bevis"),("I&rsquo;m always so grateful for 365&rsquo;s brilliant service and how you are always able to come to the rescue immediately I have a problem.", "Free Spirit"),("Thanks for coming to my rescue once again. You still keep my computer system in perfect order. Many, many thanks.", "Cordelia Cutler")]),
   faq_html([
     ("Who is home IT support for?", "Home users, families, retired and disabled people, students and home workers who want patient, jargon-free help with their everyday technology. Supporting retired and disabled people is one of our specialisms."),
     ("What does it cover?", "Computers and laptops, printers, Wi-Fi, email, Microsoft 365, Windows updates, security checks, slow-computer fixes, backups, new device setup and scam-prevention advice."),
     ("How quickly can you help?", "Most remote sessions start within minutes during opening hours (Mon&ndash;Fri, 9am&ndash;5pm), and subscribers always jump the queue."),
     ("Do I need to be good with computers?", "Not at all. We explain everything in plain English and there&rsquo;s no such thing as a silly question."),
   ]),
   REMOTE_ACCESS_BAND,
   cta("Get monthly home IT support", "Pick a home plan and get friendly, reliable help every month — or talk to a techie first.",
       primary=("Pick a Home Plan", "/home-it-support-plans/"), secondary=("Call 01202 775566", "tel:+441202775566")),
 ]),
)

# ============================================================ BUSINESS IT SUPPORT SUBSCRIPTIONS
add(
 slug="business-it-support-subscriptions",
 title="Business IT Support Subscriptions Bournemouth | 365 Techies",
 desc="Monthly business IT support subscriptions for sole traders and small businesses in Bournemouth, Poole and Dorset. Microsoft 365, cybersecurity, backups, staff support and remote help — without employing in-house IT.",
 og_title="Business IT Support Subscriptions | 365 Techies",
 schema=lambda s: graph([
   crumb(s, "Business IT Support"), webpage(s, "Business IT Support Subscriptions", "Monthly business IT support for sole traders and small businesses in Dorset."),
   service(s, "Business IT Support", "Monthly IT support for small businesses — Microsoft 365, security, backups and staff support.", "Business IT support"),
   faqpage(s, [
     ("Who is business IT support for?", "Sole traders, home offices and small businesses — including estate agents, accountants, consultants, trades and retail — who need reliable IT without employing full-time staff."),
     ("What does business IT support include?", "Remote support, staff support, Microsoft 365 administration, Outlook/Teams/OneDrive/SharePoint help, cybersecurity checks, Windows updates, backup checks, new PC setup, user onboarding and leaver checks."),
     ("Do you offer on-site support?", "Yes — we provide on-site support across Bournemouth, Poole and the rest of Dorset alongside fast remote help."),
   ]),
 ]),
 content="\n".join([
   hero(bc("Business IT Support"), "// BUSINESS IT SUPPORT &middot; BOURNEMOUTH &amp; DORSET",
        'Business IT support <em class="grad grad--green">subscriptions</em>',
        "Reliable monthly IT support for sole traders and small businesses — Microsoft 365, cybersecurity, backups and staff support, all proactively managed for you. Like having your own IT department, without the cost of employing one. Rated 4.9 on Google, family-run since 1995.",
        cta1=("Choose a Business Plan", "/business-it-support-plans/"), cta2=("Book a chat", "/contact/"),
        chips=["Your outsourced IT team", "From &pound;24.38/mo per computer", "Remote &amp; on-site across Dorset"]),
   uk_remote_band(alt=True),
   f'''    <section class="section" aria-label="Who it is for">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/01 — IDEAL FOR</p>
          <h2 class="section-title section-title--center" data-title>Small business, serious support<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>For businesses that need dependable IT but don&rsquo;t want the cost of employing an in-house IT person.</p>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("briefcase","Sole traders","Keep your computer, email, phone and cloud systems working reliably for one low monthly cost."),("users","Small businesses","Full IT cover for your team — devices, email, security and backups, all looked after."),("home","Home offices","Professional support for the home-based business that can&rsquo;t afford downtime."),("monitor","Estate agents &amp; retail","Keep point-of-sale, Wi-Fi, email and devices running every trading day."),("user","Accountants &amp; consultants","Secure, compliant systems and Microsoft 365 kept in perfect order."),("bolt","Trades &amp; services","Practical, no-nonsense IT support that fits around how you actually work.")])}
        </div>
      </div>
    </section>''',
   f'''    <section class="section section--alt" aria-label="What is included">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/02 — WHAT&rsquo;S INCLUDED</p>
          <h2 class="section-title" data-title>Your outsourced IT department<span class="title-underline"></span></h2>
          <p>As your Managed Service Provider, we look after the technology so you can get on with running your business. From onboarding a new starter to locking down security, it&rsquo;s all proactively managed for you.</p>
          <p><strong>Microsoft 365, security and backups — managed, monitored and maintained</strong> — with a real techie on the end of the phone whenever your team needs one.</p>
          <p>Need a steer on the bigger decisions? Our <a href="/business-it-consultancy/">business IT consultancy</a> gives you a virtual IT manager and a clear, plain-English technology plan.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Remote IT support","Staff support","Microsoft 365 administration","Outlook &amp; email help","Teams, OneDrive &amp; SharePoint","Cybersecurity checks","Windows updates","Backup checks","New PC setup","User onboarding","Leaver account checks","Printer &amp; network support"])}
        </ul>
      </div>
    </section>''',
   f'''    <section class="how" aria-label="How it works">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/03 — HOW WE WORK</p>
        <h2 class="section-title section-title--center" data-title>Onboarding made painless<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("Quick IT review","We learn your setup, devices and priorities — no jargon, no disruption."),("Secure setup","We connect your team&rsquo;s devices, tidy up Microsoft 365 and lock down security."),("Ongoing support","Priority help, monitoring and monthly maintenance keep your business running.")])}
        </ol>
      </div>
    </section>''',
   reviews_block([("The service I get with 365 techies is amazing — always on the other end of the phone. The monthly subscription and plans are worth the money.", "Vince Jones"),("Excellent service. We have been working with David and Steve for several years now and their attention is still brilliant. Highly recommended.", "Peter Moody"),("Can&rsquo;t fault the skill and attention the 365 guys give. Confidence that things keep ticking over with their regular maintenance checks.", "Rob Hazell")]),
   faq_html([
     ("Who is business IT support for?", "Sole traders, home offices and small businesses — estate agents, accountants, consultants, trades and retail — who need reliable IT without employing full-time staff."),
     ("What does it include?", "Remote support, staff support, Microsoft 365 administration, Outlook/Teams/OneDrive/SharePoint help, cybersecurity checks, Windows updates, backup checks, new PC setup, user onboarding and leaver checks."),
     ("Do you offer on-site support?", "Yes — we provide on-site support across Bournemouth, Poole and the rest of Dorset alongside fast remote help."),
     ("Can you support Microsoft 365?", "Absolutely — licensing, migration, security and day-to-day administration of Outlook, Teams, OneDrive, SharePoint and Exchange Online."),
   ]),
   REMOTE_ACCESS_BAND,
   cta("Choose a business IT support plan", "Give your team reliable, secure IT for one predictable monthly cost. Pick a plan or book a quick chat.",
       primary=("Choose a Business Plan", "/business-it-support-plans/"), secondary=("Book a chat", "/contact/")),
 ]),
)

# ============================================================ HOME IT SUPPORT PLANS
def plan_card(variant, badge, tag, name, desc, price, per, feats, cta_label, cta_href):
    badge_html = f'\n            <p class="plan-card__badge mono">{badge}</p>' if badge else ""
    # Only promise "Set up Direct Debit" when there's a real GoCardless link; otherwise the button
    # routes to /contact/ to choose/start the plan, so label it honestly.
    if not str(cta_href).startswith("http"):
        cta_label = "Choose this plan"
    feats_html = "\n".join(f"              <li>{f}</li>" for f in feats)
    return f'''          <article class="plan-card plan-card--{variant}" data-reveal>{badge_html}
            <p class="plan-card__tag mono">{tag}</p>
            <h3>{name}</h3>
            <p class="plan-card__desc">{desc}</p>
            <p class="plan-card__price"><span class="from mono">{per[0]}</span> {price}<span class="per">{per[1]}</span></p>
            <ul class="plan-card__features">
{feats_html}
            </ul>
            <a href="{cta_href}" class="button primary plan-card__cta"{' target="_blank" rel="noopener"' if str(cta_href).startswith('http') else ''}>{cta_label}</a>
          </article>'''

add(
 slug="home-it-support-plans",
 title="Home IT Support Plans & Pricing | From £18.25/mo",
 desc="Simple monthly home IT support — £18.25/month per computer, with Microsoft 365 available for £4.85/month per user. Remote support, regular maintenance, security and backups for home users and families in Dorset.",
 og_title="Home IT Support Plans | 365 Techies",
 schema=lambda s: graph([
   crumb(s, "Home Support Plans"), webpage(s, "Home IT Support Plans", "Monthly home IT support packages for home users and families."),
   service(s, "Home IT Support Plans", "Monthly home IT support at £18.25 per computer, with optional Microsoft 365 at £4.85 per user.", "Home IT support"),
 ]),
 content="\n".join([
   hero(bc("Home Support Plans"), "// HOME PLANS",
        'Home IT support <em class="grad grad--cyan">plans</em>',
        "Clear, simple monthly packages for home users and families. Pick the level of cover that suits you — and change or cancel any time.",
        cta1=("Get Started", "/contact/"), cta2=("Compare Plans", "#compare"),
        chips=["No contracts", "Cancel anytime", "Full service every 6 weeks"]),
   f'''    <section class="support-options" aria-label="Home support plans">
      <div class="plan-grid">
{plan_card("home", None, "HOME SUPPORT", "Home IT Support", "Friendly cover for your computer &mdash; remote help, regular maintenance and security, all year round.", "&pound;18.25", ("","/mo per computer"), ["Support for your computer","Unlimited remote support","Full service every 6 weeks","Security &amp; backup checks","Wi-Fi, printer &amp; email help","Patient, jargon-free help"], "Set up Direct Debit", subscribe_href("home-support"))}
{plan_card("business", "&#9733; MOST POPULAR", "+ MICROSOFT 365", "Home Support + Microsoft 365", "Everything in Home IT Support, plus Microsoft 365 set up and looked after for you.", "&pound;23.10", ("","/mo per computer"), ["Everything in Home IT Support","Microsoft 365 set up &amp; supported","Outlook email &amp; Office apps","OneDrive backup help","One Microsoft 365 licence included","Extra licences &pound;4.85/mo each"], "Set up Direct Debit", subscribe_href("home-support-365"))}
      </div>
      <p class="plans-note mono" data-reveal>// &pound;18.25/MO PER COMPUTER &middot; ADD MICROSOFT 365 FOR &pound;4.85/MO PER USER &middot; MORE THAN ONE COMPUTER? JUST TELL US</p>
      <p class="plans-note mono" data-reveal style="margin-top:.5rem"><a href="/our-guarantees/" style="color:var(--cyan)">&#10003; Cancel anytime, no contract &middot; No call-out fee for remote help &middot; Family-run since 1995 &mdash; see our guarantees</a></p>
    </section>''',
   f'''    <section class="section" aria-label="Popular add-ons">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// POPULAR ADD-ONS</p>
          <h2 class="section-title section-title--center" data-title>Add extra protection any time<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("globe","Malwarebytes Premium &amp; VPN","Award-winning protection with a private VPN, set up &amp; managed by us. <a href=\"/malwarebytes-premium/\">See Malwarebytes &amp; VPN &#8594;</a>"),("shield","Managed cybersecurity","Layered, monitored protection &mdash; security, backups and peace of mind. <a href=\"/cybersecurity-support/\">See cybersecurity &#8594;</a>"),("monitor","Need a computer too?","Refurbished, business-grade Dell laptops &amp; PCs, set up and supported. <a href=\"/dell-hardware/\">See refurbished Dell &#8594;</a>")])}
        </div>
      </div>
    </section>''',
   f'''    <section class="section section--alt" id="compare" aria-label="What's included">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// COMPARE</p>
          <h2 class="section-title section-title--center" data-title>What&rsquo;s included<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Every home plan covers one computer for &pound;18.25/month &mdash; add Microsoft 365 for &pound;4.85/month per user. Got several computers? Each is covered at the same price; just tell us your setup.</p>
        </div>
        <div class="price-table-wrap" data-reveal>
          <table class="price-table">
            <thead><tr><th scope="col">Feature</th><th scope="col">Home Support<span class="price">&pound;18.25</span><span class="per">/mo per computer</span></th><th scope="col" class="pop">+ Microsoft 365<span class="price">&pound;23.10</span><span class="per">/mo per computer</span></th></tr></thead>
            <tbody>
              <tr><th scope="row">Unlimited remote support</th><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">Full service every 6 weeks</th><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">Wi-Fi, printer &amp; email help</th><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">Security &amp; backup checks</th><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">New device setup help</th><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">Microsoft 365 (Outlook &amp; Office apps)</th><td class="no">&ndash;</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">OneDrive backup help</th><td>Advice</td><td class="yes">&#10003;</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>''',
   GC_NOTE,
   REMOTE_ACCESS_BAND,
   cta("Pick a home support plan", "Not sure which plan fits? Tell us a bit about your setup and we&rsquo;ll recommend the right one — no pressure.",
       primary=("Get Started", "/contact/"), secondary=("Call 01202 775566", "tel:+441202775566")),
 ]),
)

# ============================================================ BUSINESS IT SUPPORT PLANS
add(
 slug="business-it-support-plans",
 title="Business IT Support Plans | Small Business IT Packages",
 desc="Monthly business IT support plans — Starter, Standard and Premium. Microsoft 365 management, cybersecurity, backups, onboarding and remote/on-site support for small businesses in Dorset.",
 og_title="Business IT Support Plans | 365 Techies",
 schema=lambda s: graph([
   crumb(s, "Business Support Plans"), webpage(s, "Business IT Support Plans", "Monthly business IT support packages for small businesses."),
   service(s, "Business IT Support Plans", "Starter, Standard and Premium monthly business IT support packages.", "Business IT support"),
 ]),
 content="\n".join([
   hero(bc("Business Support Plans"), "// BUSINESS PLANS",
        'Business IT support <em class="grad grad--green">plans</em>',
        "Scalable monthly packages for sole traders and small businesses. From a single user to a busy team — choose the cover that fits, and grow when you&rsquo;re ready.",
        cta1=("Get a Recommendation", "/contact/"), cta2=("Compare Plans", "#compare"),
        chips=["From &pound;24.38/mo per computer", "Microsoft 365 managed", "Remote &amp; on-site options"]),
   f'''    <section class="support-options" aria-label="Business support plans">
      <div class="plan-grid plan-grid--3">
{plan_card("business", None, "STARTER", "Business Starter", "For sole traders and very small businesses.", "&pound;24.38", ("FROM","/mo per computer"), ["Support for 1&ndash;3 computers","Remote IT support","Email support","Microsoft 365 help","Basic security checks","Computer maintenance &amp; buying advice"], "Set up Direct Debit", subscribe_href("business-starter"))}
{plan_card("business", "&#9733; MOST POPULAR", "STANDARD", "Business Standard", "For small businesses needing regular IT support.", "Custom", ("FROM",""), ["Support for multiple users","Microsoft 365 administration","Outlook, Teams &amp; OneDrive","Backup checks","Cybersecurity guidance","Monthly maintenance &amp; new user setup"], "Get a Quote", "/contact/")}
{plan_card("business", None, "PREMIUM", "Business Premium", "For businesses that rely on IT every day.", "Custom", ("FROM",""), ["Priority support","Remote &amp; on-site options","Microsoft 365 management","Cybersecurity &amp; backup planning","Staff onboarding &amp; offboarding","Device setup &amp; technology planning"], "Get a Quote", "/contact/")}
      </div>
      <p class="plans-note mono" data-reveal>// FROM &pound;24.38/MO PER COMPUTER &middot; NO LOCK-IN &middot; TELL US YOUR SETUP FOR A QUOTE</p>
      <p class="plans-note mono" data-reveal style="margin-top:.5rem"><a href="/our-guarantees/" style="color:var(--cyan)">&#10003; No lock-in, cancel anytime &middot; No-fix-no-fee repairs &middot; Family-run since 1995 &mdash; see our guarantees</a></p>
      <p data-reveal style="text-align:center;max-width:62ch;margin:1.4rem auto 0;color:var(--muted)">From a home office to a supercar workshop: since 2016 we&rsquo;ve looked after <a href="https://www.emblemsportscars.com/" target="_blank" rel="noopener">Emblem Sports Cars</a>, Poole&rsquo;s Ferrari, Maserati &amp; Lamborghini specialists &mdash; diagnostic systems and all. We tailor support to your trade too &mdash; see <a href="/it-support-by-industry/">IT support by industry</a>.</p>
    </section>''',
   f'''    <section class="section" aria-label="Popular add-ons">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// POPULAR ADD-ONS</p>
          <h2 class="section-title section-title--center" data-title>Add extra protection any time<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("cloud","Microsoft 365","Email, Office apps &amp; OneDrive &mdash; &pound;4.85/mo per user, set up &amp; supported. <a href=\"/microsoft-365-support/\">See Microsoft 365 &#8594;</a>"),("shield","Managed cybersecurity","Layered, monitored protection &mdash; MFA, patching &amp; verified backups. <a href=\"/cybersecurity-support/\">See cybersecurity &#8594;</a>"),("globe","Malwarebytes Premium &amp; VPN","Endpoint protection with a VPN for staff on the move. <a href=\"/malwarebytes-premium/\">See Malwarebytes &amp; VPN &#8594;</a>")])}
        </div>
      </div>
    </section>''',
   f'''    <section class="section section--alt" id="compare" aria-label="Compare business plans">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// COMPARE</p>
          <h2 class="section-title section-title--center" data-title>Compare business plans<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="price-table-wrap" data-reveal>
          <table class="price-table">
            <thead><tr><th scope="col">Feature</th><th scope="col">Starter</th><th scope="col" class="pop">Standard</th><th scope="col">Premium</th></tr></thead>
            <tbody>
              <tr><th scope="row">Computers</th><td>1&ndash;3</td><td>Multiple</td><td>Multiple</td></tr>
              <tr><th scope="row">Remote support</th><td class="yes">&#10003;</td><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">Microsoft 365</th><td>Help</td><td>Administration</td><td>Full management</td></tr>
              <tr><th scope="row">Cybersecurity</th><td>Basic checks</td><td>Guidance</td><td>Planning</td></tr>
              <tr><th scope="row">Backup checks</th><td class="no">&ndash;</td><td class="yes">&#10003;</td><td>+ recovery planning</td></tr>
              <tr><th scope="row">Onboarding / offboarding</th><td class="no">&ndash;</td><td>New user setup</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">On-site support</th><td class="no">&ndash;</td><td>On request</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">Priority response</th><td class="no">&ndash;</td><td class="no">&ndash;</td><td class="yes">&#10003;</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>''',
   GC_NOTE,
   REMOTE_ACCESS_BAND,
   cta("Choose a business plan", "Tell us how many people you need to cover and how you work — we&rsquo;ll put together the right plan and a clear quote.",
       primary=("Get a Quote", "/contact/"), secondary=("Call 01202 775566", "tel:+441202775566")),
 ]),
)

# ============================================================ helper for simple service pages
def service_page(slug, crumb_name, eyebrow, h1_html, lede, title, desc, og_title, stype, intro_head, intro_paras, feats_head, feats, faqs, chips=None, cta_title=None, cta_text=None):
    sections = [
      hero(bc(crumb_name), eyebrow, h1_html, lede, chips=chips),
      f'''    <section class="section" aria-label="Overview">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — OVERVIEW</p>
          <h2 class="section-title" data-title>{intro_head}<span class="title-underline"></span></h2>
{intro_paras}
        </div>
        <ul class="checklist" data-stagger>
{checklist(feats)}
        </ul>
      </div>
    </section>''',
      f'''    <section class="section section--alt" aria-label="What we do">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — WHAT WE DO</p>
          <h2 class="section-title section-title--center" data-title>{feats_head}<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards(feats_tiles)}
        </ul>
      </div>
    </section>''' if False else "",
    ]
    return sections

# ============================================================ REMOTE IT SUPPORT
add(
 slug="remote-it-support",
 title="Remote IT Support UK | Fast Online Help | 365 Techies",
 desc="Fast, secure remote IT support for homes and businesses anywhere in the UK. Most computer problems fixed online in minutes via Splashtop SOS — no waiting for an engineer. Based in Dorset, helping the whole of the UK.",
 og_title="Remote IT Support | Fast Online Computer Help",
 schema=lambda s: graph([
   crumb(s, "Remote IT Support"), webpage(s, "Remote IT Support", "Fast, secure remote IT support for homes and businesses."),
   service(s, "Remote IT Support", "Secure remote computer support via Splashtop SOS, usually within minutes.", "Remote IT support"),
   faqpage(s, [
     ("Do you provide remote IT support across the whole of the UK?", "Yes. We're based in Dorset, but remote support isn't limited by distance — we help homes and businesses anywhere in the UK over a secure, encrypted connection. Wherever you are, we can usually fix the problem in minutes. Closer to home, see our <a href=\"/it-support-dorset/\">IT support across Dorset</a> for on-site visits too."),
     ("Is remote support safe?", "Yes. Sessions run over Splashtop SOS — an encrypted, industry-standard remote support tool. You watch everything on screen and access ends the moment the session is over."),
     ("What can be fixed remotely?", "Most things — email problems, software issues, Microsoft 365, slow computers, printer setup, Windows updates, even a scare like <a href=\"/onedrive-files-disappeared/\">OneDrive files that have vanished</a>, and general troubleshooting for home and business users."),
     ("How fast is remote support?", "Most remote sessions start within minutes during opening hours (Mon–Fri, 9am–5pm), and subscribers always jump the queue."),
     ("Will you connect to my computer without warning?", "No. We always phone you first to say we're ready and to check you're ready before we connect. We never connect out of the blue, and a remote session can only start when you click our secure link to begin an encrypted Splashtop SOS session."),
   ]),
 ]),
 content="\n".join([
   hero(bc("Remote IT Support"), "// UK-WIDE REMOTE SUPPORT",
        'UK-wide remote IT support, <em class="grad grad--cyan">in minutes</em>',
        hero_trust("Wherever you are in the UK, most computer problems can be fixed remotely &mdash; no waiting in for an engineer. We connect securely over Splashtop SOS, you watch everything happen on screen, and access ends the moment we&rsquo;re done."),
        cta1=("Get Remote Support", "/contact/"), cta2=("SOS Emergency Session", "https://sos.splashtop.com/en/sos-download"),
        chips=["Anywhere in the UK", "Encrypted &amp; secure", "Usually within minutes"]),
   f'''    <section class="section" aria-label="Overview">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — HOW IT WORKS</p>
          <h2 class="section-title" data-title>Secure help, on your screen<span class="title-underline"></span></h2>
          <p>When you need help, we send you a secure link. One click connects us to your screen so we can see exactly what you see and fix it there and then.</p>
          <p><strong>You watch the whole session and stay in control</strong> — and the moment we finish, access ends automatically. It&rsquo;s the fastest, safest way to solve most IT problems.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Secure remote access","Email troubleshooting","Software problems","Microsoft 365 help","Slow computer fixes","Printer setup","Windows support","Business user support"])}
        </ul>
      </div>
    </section>''',
   f'''    <section class="how section--alt" aria-label="Steps">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/02 — THREE STEPS</p>
        <h2 class="section-title section-title--center" data-title>From stuck to sorted<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("Tell us what&rsquo;s wrong","Call or message and describe the problem in plain English."),("We phone first","We call to say we&rsquo;re ready and check it&rsquo;s a good time &mdash; a session only ever starts when you&rsquo;re expecting it."),("Connect securely","Click our secure link to start an encrypted Splashtop SOS session."),("Watch it get fixed","We solve it on your screen, explain what happened, and access ends.")])}
        </ol>
      </div>
    </section>''',
   net_map_section("// HOW WE CONNECT", "Every device, looked after from here",
       "          <p>Whether your computers are at home, in the office or out on the road &mdash; anywhere in the UK &mdash; we connect securely and look after them all from one place &mdash; updates, security and quick fixes, with no-one needing to visit.</p>\n          <p>You stay in control: every session is one <em>you</em> start, over an encrypted connection, and we always phone first.</p>",
       variant="home", label="LIVE VIEW &mdash; CONNECTED DEVICES"),
   faq_html([
     ("Do you provide remote IT support across the whole of the UK?", "Yes &mdash; we&rsquo;re based in Dorset, but remote support isn&rsquo;t limited by distance. We help homes and businesses <strong>anywhere in the UK</strong> over a secure, encrypted Splashtop SOS connection, and we can usually fix the problem in minutes. For hands-on hardware work we also visit on-site &mdash; see our <a href=\"/it-support-dorset/\">IT support across Dorset</a> for every town we cover."),
     ("Is remote support safe?", "Yes. Sessions run over Splashtop SOS — an encrypted, industry-standard remote support tool. You watch everything on screen and access ends the moment the session is over."),
     ("What can be fixed remotely?", "Most things — email problems, software issues, Microsoft 365, slow computers, printer setup, Windows updates, even a scare like <a href=\"/onedrive-files-disappeared/\">OneDrive files that have vanished</a>, and general troubleshooting for home and business users."),
     ("How fast is it?", "Most remote sessions start within minutes during opening hours (Mon&ndash;Fri, 9am&ndash;5pm). Subscribers always jump the queue."),
     ("Will you connect to my computer without warning?", "No &mdash; we always phone you first to say we&rsquo;re ready and to check you&rsquo;re ready before we connect. We never connect out of the blue, and a session can only start when you click our secure link."),
     ("Should I let someone remote into my computer?", "Only when you trust them and <em>you</em> started it &mdash; a genuine session (like ours over Splashtop SOS) only begins when you click a link you asked for, and we always phone first to check you&rsquo;re ready. If someone rings out of the blue claiming to be Microsoft, BT or your bank and asks for remote access, hang up &mdash; that&rsquo;s a scam. See our <a href=\"/spot-the-scam/\">Spot the Scam</a> guide."),
     ("What if it can&rsquo;t be fixed remotely?", "Occasionally hardware needs hands-on attention — we&rsquo;ll arrange a repair or on-site visit across Bournemouth, Poole and Dorset."),
   ]),
   promise_strip(items=[PROMISE_CALL, PROMISE_PEOPLE, PROMISE_ETA]),
   REMOTE_ACCESS_BAND,
   tools_strip(["isitdown", "speed", "healthcheck", "faultcheck"], title="While you wait &mdash; try our free tools"),
   cta("Need help right now?", "Start a secure remote session, or join a monthly plan so help is always one message away.",
       primary=("Get Remote Support", "/contact/"), secondary=("View Monthly Plans", "/monthly-it-support/")),
 ]),
)

# ============================================================ MICROSOFT 365 SUPPORT
M365_FAQS = [
  ("Can you set up Microsoft 365 from scratch?", "Yes &mdash; we handle everything: choosing the right licences, creating mailboxes and user accounts, setting up your domain, and configuring Outlook, Teams, OneDrive and SharePoint so it all works together from day one."),
  ("Can you migrate our old email to Microsoft 365?", "Yes &mdash; we migrate email, contacts and calendars from old systems (including Gmail, IMAP and older Exchange) to Microsoft 365 with minimal disruption and nothing lost."),
  ("Which Microsoft 365 licence do we actually need?", "We&rsquo;ll advise honestly &mdash; from Microsoft 365 Personal and Family at home to Business Basic, Standard or Premium for teams &mdash; so you get the features you need without paying for ones you don&rsquo;t."),
  ("Do you help secure Microsoft 365?", "Yes &mdash; multi-factor authentication, secure sign-in, mailbox protection, email filtering and sensible security policies. We can also back up Microsoft 365, which Microsoft doesn&rsquo;t do for you. See our <a href=\"/cybersecurity-support/\">cybersecurity</a> and <a href=\"/backup-support/\">backup</a> pages."),
  ("Can you train us to use it?", "Absolutely &mdash; friendly, plain-English help with Outlook, Teams, OneDrive and SharePoint, so you and your team actually get the most out of it."),
  ("Do you support home users too?", "Definitely &mdash; from a single personal mailbox to family setups, we make Microsoft 365 simple at home as well as at work."),
  ("Do you support Microsoft 365 for Dorset businesses?", "Yes &mdash; we set up, migrate, secure and support Microsoft 365 for businesses right across Dorset, Bournemouth and Poole, from a single mailbox to a whole team, with friendly, plain-English help."),
  ("Are you a local Office 365 installer in Bournemouth and Poole?", "Yes &mdash; we&rsquo;re a hands-on Office 365 and Microsoft 365 installer for Bournemouth, Poole and across Dorset: we install and set up Office 365 on your PCs and laptops, migrate your email, and get Outlook, Teams and OneDrive working &mdash; remotely or on-site."),
  ("Do you provide Microsoft 365 support in Bournemouth and Poole?", "Yes &mdash; Microsoft 365 support for Bournemouth and Poole homes and businesses: setup, migration, licensing, security and everyday help, with fast remote support and on-site visits when you need them."),
  ("We&rsquo;re locked out of our Microsoft 365 admin account &mdash; can you help?", "Yes &mdash; orphaned tenants are more common than you&rsquo;d think: the one admin leaves, or the password dies with an old phone. Our guide to <a href=\"/locked-out-microsoft-365-admin-account/\">recovering a locked-out Microsoft 365 admin account</a> covers the real routes back in &mdash; and we&rsquo;ll drive the whole recovery for you."),
]
add(
 slug="microsoft-365-support",
 title="Microsoft 365 Support, Bournemouth & Poole | Teams & Email",
 desc="Microsoft 365 and Office 365 support across Bournemouth, Poole and Dorset — setup, migration and installation. Microsoft Partner, rated 4.9 on Google, family-run since 1995.",
 og_title="Microsoft 365 Support | Teams, Email & OneDrive",
 schema=lambda s: graph([
   crumb(s, "Microsoft 365"), webpage(s, "Microsoft 365 Support", "Complete Microsoft 365 support — Outlook, Teams, OneDrive, SharePoint, licensing, migration and security."),
   service(s, "Microsoft 365 Support", "Setup, migration, licensing, troubleshooting, security and training for Microsoft 365 for homes and businesses across Dorset.", "Microsoft 365 support"),
   faqpage(s, M365_FAQS),
 ]),
 content="\n".join([
   hero(bc("Microsoft 365"), "// MICROSOFT PARTNER",
        'Microsoft 365, <em class="grad grad--cyan">done properly</em>',
        hero_trust("As Microsoft partners and certified Office Specialists, we set up, migrate, secure and support Microsoft 365 &mdash; from a single mailbox at home to a whole team in the cloud. Email, Teams, files and security, all working together and managed for you."),
        cta1=("Get Microsoft 365 Support", "/contact/"), cta2=("View Plans", "/monthly-it-support/"),
        chips=["Microsoft Partner", "Office Specialists", "Setup, migration &amp; security"]),
   f'''    <section class="section" aria-label="Overview">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — OVERVIEW</p>
          <h2 class="section-title" data-title>Make Microsoft 365 work for you<span class="title-underline"></span></h2>
          <p>Microsoft 365 is powerful &mdash; but only when it&rsquo;s set up properly. Too often it&rsquo;s half-configured, over-licensed and wide open. We get email, files and apps working together, lock it down, and keep it running smoothly.</p>
          <p><strong>From a single home mailbox to a full business migration</strong>, we handle the setup, the licensing, the security and the day-to-day support &mdash; so you can just use it.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Setup &amp; licensing","Email &amp; Outlook","Email migration","Teams &amp; collaboration","OneDrive &amp; SharePoint","Exchange Online","MFA &amp; security","User onboarding &amp; leavers","Microsoft 365 backup","Friendly training"])}
        </ul>
      </div>
    </section>''',
   f'''    <section class="section section--alt" aria-label="What we do">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — WHAT WE DO</p>
          <h2 class="section-title section-title--center" data-title>Everything Microsoft 365<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("windows","Setup &amp; licensing","The right plan and licences, set up properly &mdash; no overpaying, no missing features."),("mail","Email &amp; Outlook","Outlook configured on every device, send/receive issues fixed, shared mailboxes sorted."),("server","Migration","Move email, contacts and calendars from old systems to Microsoft 365 &mdash; nothing lost."),("users","Teams &amp; collaboration","Teams, meetings and channels set up so your team can work together anywhere."),("cloud","OneDrive &amp; SharePoint","Files in the cloud, synced and shared securely, with sensible permissions."),("lock","Security &amp; MFA","Multi-factor authentication, mailbox protection and email filtering as standard.")])}
        </div>
      </div>
    </section>''',
   f'''    <section class="section" aria-label="Common Outlook problems">
      <div class="wrap prose" data-reveal>
        <p class="eyebrow mono">/03 &mdash; OUTLOOK PROBLEMS</p>
        <h2 class="section-title" data-title>Common Outlook problems we fix<span class="title-underline"></span></h2>
        <p>Outlook playing up? We sort these every day &mdash; usually remotely, in minutes. See the full <a href="/outlook-problems/">Outlook problems guide</a>, or jump straight to yours:</p>
        <ul>
          <li>Send/receive errors <a href="/outlook-error-0x800ccc0e/">0x800ccc0e &amp; 0x800ccc0f</a>, <a href="/outlook-error-0x80042109/">0x80042109</a> and <a href="/outlook-error-0x800ccc90/">0x800ccc90</a></li>
          <li><a href="/outlook-not-sending-emails/">Receiving but not sending</a>, or <a href="/outlook-stuck-in-outbox/">stuck in the Outbox</a></li>
          <li><a href="/outlook-keeps-asking-for-password/">Outlook keeps asking for your password</a></li>
          <li><a href="/outlook-data-file-cannot-be-accessed/">Data file cannot be accessed (0x8004010f)</a> and <a href="/outlook-pst-cannot-be-accessed/">PST cannot be accessed (0x80040116)</a></li>
          <li><a href="/outlook-cannot-open-the-outlook-window/">Cannot open the Outlook window</a>, or <a href="/outlook-search-not-finding-old-emails/">search not finding old emails</a></li>
          <li>New Outlook: <a href="/new-outlook-wont-open/">won&rsquo;t open</a>, <a href="/new-outlook-blank-screen/">blank white screen</a>, <a href="/outlook-rules-not-working-new-outlook/">rules not running</a></li>
          <li>Outlook on Android: <a href="/outlook-app-crashing-android/">app keeps crashing</a> or <a href="/outlook-not-syncing-android/">not syncing</a></li>
        </ul>
      </div>
    </section>''',
   f'''    <section class="m365" aria-label="Apps we support">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — APPS WE SUPPORT</p>
          <h2 class="section-title section-title--center" data-title>Every app, covered<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="m365__apps mono" data-stagger>
          <li>Outlook</li><li>Teams</li><li>OneDrive</li><li>SharePoint</li>
          <li>Word</li><li>Excel</li><li>Exchange</li><li>Defender</li>
        </ul>
      </div>
    </section>''',
   f'''    <section class="section section--alt" aria-label="Home and business">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/04 — HOME &amp; BUSINESS</p>
          <h2 class="section-title section-title--center" data-title>Microsoft 365, your way<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="split-2">
          <div class="tile" data-reveal>
            <h3>Microsoft 365 at home</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">Personal and Family subscriptions set up across all your devices &mdash; email, Office apps, OneDrive storage and the security to keep it safe.</p>
            <ul class="checklist">
{checklist(["Personal &amp; Family plans","Outlook &amp; Office on every device","OneDrive photo &amp; file storage","MFA &amp; account security"])}
            </ul>
          </div>
          <div class="tile" data-reveal>
            <h3>Microsoft 365 for business</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">A fully managed business tenant &mdash; mailboxes, Teams, SharePoint, security policies, onboarding and leaver checks, all looked after on your plan.</p>
            <ul class="checklist">
{checklist(["Business Basic, Standard &amp; Premium","Teams, SharePoint &amp; shared files","Onboarding &amp; leaver checks","Security policies &amp; backup"])}
            </ul>
          </div>
        </div>
      </div>
    </section>''',
   f'''    <section class="how" aria-label="Migration steps">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/05 — MOVING TO MICROSOFT 365</p>
        <h2 class="section-title section-title--center" data-title>A smooth move, nothing lost<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("We plan","We check your current setup, recommend the right licences and plan the migration around you."),("We migrate","We move email, contacts, calendars and files to Microsoft 365 &mdash; usually overnight, with no downtime."),("We support","We configure every device, secure it with MFA, and keep it running on your support plan.")])}
        </ol>
      </div>
    </section>''',
   f'''    <section class="section section--alt" aria-label="Microsoft 365 support across Dorset">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/06 &mdash; LOCAL MICROSOFT 365 HELP</p>
          <h2 class="section-title section-title--center" data-title>Microsoft 365 &amp; Office 365 support across Dorset<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Need someone local to install, set up or fix Microsoft 365? We provide Microsoft 365 and Office 365 support, installation and migration for homes and businesses across <a href="/it-support-bournemouth/">Bournemouth</a>, <a href="/it-support-poole/">Poole</a>, <a href="/it-support-christchurch/">Christchurch</a>, <a href="/it-support-dorchester/">Dorchester</a>, <a href="/it-support-weymouth/">Weymouth</a>, <a href="/it-support-ferndown/">Ferndown</a>, <a href="/it-support-gillingham/">Gillingham</a> and the rest of <a href="/it-support-dorset/">Dorset</a> &mdash; remotely anywhere, and on-site when you need a hands-on Office 365 installer.</p>
        </div>
      </div>
    </section>''',
   faq_html(M365_FAQS),
   tools_strip(["isitdown", "emailsec", "m365picker", "breach"], title="Free tools while you&rsquo;re here", alt=False),
   cta("Get Microsoft 365 working for you", "Stuck with Outlook, Teams or a migration? Get it sorted by Microsoft partners &mdash; or fold Microsoft 365 into a monthly plan.",
       primary=("Get Microsoft 365 Support", "/contact/"), secondary=("View Monthly Plans", "/monthly-it-support/")),
 ]),
)

# ============================================================ CYBERSECURITY SUPPORT
CYBER_FAQS = [
  ("What makes this &lsquo;the ultimate&rsquo; security?", "It&rsquo;s layered. Instead of relying on one tool, we stack multiple defences &mdash; endpoint protection, email filtering, patching, multi-factor authentication, backups and monitoring &mdash; all set up, managed and watched by us. If one layer is bypassed, the next one catches it."),
  ("Do you use Malwarebytes?", "Yes &mdash; as a Malwarebytes Partner we deploy Malwarebytes Premium with VPN as the endpoint layer of your security stack, set up and managed by us. See our <a href=\"/malwarebytes-premium/\">Malwarebytes Premium &amp; VPN</a> page."),
  ("What does the VPN add to my security?", "The VPN (Malwarebytes Privacy VPN) encrypts your internet connection so your browsing stays private &mdash; vital on public Wi-Fi, where others on the network could otherwise snoop. It also hides your location and even lets you choose which country you appear to browse from. Antivirus protects your <em>device</em>; the VPN protects your <em>data</em> as it travels &mdash; the two work hand in hand. See our <a href=\"/malwarebytes-premium/\">Privacy VPN guide</a>."),
  ("How do you protect against scams and viruses?", "We set up endpoint protection and web filtering, keep everything patched, filter phishing email, and give you a real human to ask whether a message is safe before you click."),
  ("Do you offer multi-factor authentication?", "Yes &mdash; we set up multi-factor authentication (MFA) and password managers the painless way, for home and business accounts, so a stolen password isn&rsquo;t enough to get in."),
  ("Can you review our business security?", "Yes &mdash; we provide plain-English business security reviews covering devices, email, backups, passwords, access and staff awareness, with clear recommendations."),
  ("I think I&rsquo;ve been hacked &mdash; can you help?", "Yes. Contact us straight away &mdash; see our <a href=\"/business-hacked-emergency-help/\">emergency help for a hacked business</a>. We&rsquo;ll help lock down your accounts, clean up affected devices, restore from backup if needed and stop it happening again."),
  ("Do you provide cyber security for small businesses in Dorset?", "Yes &mdash; layered, managed protection sized for small businesses right across Dorset, Bournemouth and Poole: endpoint security, email filtering, MFA, patching, verified backups and monitoring, with a real local person to call. Pair it with <a href=\"/cyber-essentials/\">Cyber Essentials certification</a>."),
]
add(
 slug="cybersecurity-support",
 title="Cyber Security Services for Businesses | Bournemouth & Dorset",
 desc="Cyber security services for businesses and homes across Bournemouth, Poole and Dorset — protection from ransomware, phishing, scams and malware, with MFA, verified backups and Cyber Essentials. Rated 4.9 on Google, since 1995.",
 og_title="Cyber Security Services | Bournemouth & Dorset",
 schema=lambda s: graph([
   crumb(s, "Cybersecurity"), webpage(s, "Cybersecurity Support", "The ultimate layered cybersecurity for homes and small businesses across Dorset."),
   service(s, "Cybersecurity Support", "Layered, always-on protection from ransomware, phishing, scams and malware for homes and businesses across Dorset.", "Cybersecurity"),
   faqpage(s, CYBER_FAQS),
 ]),
 content="\n".join([
   hero(bc("Cybersecurity"), "// THE ULTIMATE SECURITY",
        'Cyber security <em class="grad grad--green">services</em> for Dorset',
        hero_trust("Cyber security services for businesses and homes across Bournemouth, Poole and Dorset. Ransomware, scams and phishing don&rsquo;t care whether you&rsquo;re a family or a business &mdash; they just look for the easy way in. We close every door with layered, always-on protection that&rsquo;s set up, managed and watched over by us, keeping you safe online 24/7."),
        cta1=("Get Protected", "/contact/"), cta2=("Free IT Health Check", "/contact/"),
        chips=["Malwarebytes Partner", "Layered defence", "Monitored 24/7"]),
   f'''    <section class="section" aria-label="Why it matters">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — WHY IT MATTERS</p>
          <h2 class="section-title" data-title>One wrong click shouldn&rsquo;t cost you everything<span class="title-underline"></span></h2>
          <p>Cybercrime targets homes and small businesses just as hard as big companies &mdash; because they&rsquo;re often the softest targets. One dodgy email or weak password can mean locked files, a drained bank account or stolen customer data.</p>
          <p><strong>So we don&rsquo;t rely on a single tool.</strong> We build layers of protection that work together &mdash; and we manage and monitor them for you, so security actually stays switched on instead of lapsing the moment life gets busy. For businesses that need certified assurance, we also help you achieve <a href="/cyber-essentials/">Cyber Essentials</a>.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Endpoint protection &amp; antivirus","Ransomware prevention","Phishing &amp; scam filtering","Multi-factor authentication","Password management","Web &amp; DNS filtering","Verified backups &amp; recovery","24/7 threat monitoring","Staff &amp; family awareness","Plain-English security reviews"])}
        </ul>
      </div>
    </section>''',
   f'''    <section class="section section--alt" aria-label="The security stack">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — THE 365 SECURITY STACK</p>
          <h2 class="section-title section-title--center" data-title>Layered defence, end to end<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Real security isn&rsquo;t one product &mdash; it&rsquo;s layers. If one is bypassed, the next one holds. Here&rsquo;s the stack we set up and manage for you.</p>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("shield","Endpoint protection","Malwarebytes Premium &amp; VPN on every device &mdash; blocking malware, ransomware and dodgy sites in real time."),("mail","Email &amp; phishing security","Scam and phishing filtering on your inbox, plus a human to ask &lsquo;is this safe?&rsquo; before you click."),("bolt","Patch management","Windows, browsers and apps kept up to date &mdash; closing the holes attackers rely on."),("lock","MFA &amp; passwords","Multi-factor authentication and password managers set up the painless way, so a stolen password isn&rsquo;t enough."),("globe","Web &amp; DNS filtering","Malicious, scam and phishing websites blocked before they ever load."),("cloud","Backup &amp; recovery","Automatic, verified backups so even ransomware can&rsquo;t hold your data hostage."),("eye","24/7 monitoring","Devices watched for threats and suspicious behaviour, day and night."),("users","Awareness &amp; advice","Simple guidance for your family or team &mdash; because people are the front line.")])}
        </div>
        <p style="text-align:center;margin-top:1.8rem" data-reveal><a class="button secondary" href="/malwarebytes-premium/">Explore Malwarebytes Premium &amp; VPN &#8594;</a></p>
      </div>
    </section>''',
   f'''    <section class="section" aria-label="Privacy and VPN">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — PRIVACY &amp; VPN</p>
          <h2 class="section-title section-title--center" data-title>Private browsing, wherever you are<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Antivirus protects your <strong>device</strong>; a VPN protects your <strong>data</strong> as it travels. The two work hand in hand &mdash; so we include <strong>Malwarebytes Privacy VPN</strong> as the privacy layer of your security stack, set up and managed by us.</p>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("wifi","Safe on public Wi-Fi","Caf&eacute;, hotel and airport Wi-Fi is wide open. The VPN scrambles your connection so nobody on the network can snoop on what you&rsquo;re doing."),("eye","Browsing kept private","Even your own broadband provider can normally see the sites you visit &mdash; with the VPN on, where you go and what you do stays private."),("lock","Bank-grade encryption","Modern WireGuard&reg; encryption (256-bit ChaCha20) keeps everything you send scrambled and unreadable while it&rsquo;s in transit."),("pin","Choose your location","Pick from 150+ servers across 60+ locations worldwide (the UK included) to mask your IP and reach your own accounts when you&rsquo;re travelling."),("shield","Built-in kill switch","On Windows and Mac, if the VPN ever drops it can cut your connection rather than quietly leave you exposed."),("check","No-logs, independently audited","A strict no-logs policy &mdash; independently audited in 2026, with no evidence of user-activity logging found.")])}
        </div>
        <p class="mono" style="text-align:center;max-width:64ch;margin:1.8rem auto 0;color:var(--muted)" data-reveal>Honest note: a VPN protects your data, not your device &mdash; it works alongside antivirus, and we&rsquo;d never promise it unblocks streaming services like Netflix or BBC iPlayer.</p>
        <p style="text-align:center;margin-top:1.4rem" data-reveal><a class="button secondary" href="/malwarebytes-premium/">See the full Privacy VPN guide &#8594;</a></p>
      </div>
    </section>''',
   f'''    <section class="section section--alt" aria-label="Threats we stop">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/04 — THREATS WE STOP</p>
          <h2 class="section-title section-title--center" data-title>What we&rsquo;re protecting you from<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("Ransomware","Malware that locks up your files and demands payment &mdash; blocked, with backups ready if needed."),("Phishing emails","Fake emails designed to steal logins or money &mdash; filtered out before they reach you."),("Online scams","Fake invoices, delivery texts and &lsquo;your account is locked&rsquo; tricks &mdash; spotted and stopped."),("Malware &amp; viruses","Viruses, spyware and trojans &mdash; caught in real time across all your devices."),("Account takeover","Stolen passwords made useless by multi-factor authentication."),("Data loss","Hardware failure, theft or mistakes &mdash; covered by automatic, verified backups.")])}
        </ul>
        <p style="text-align:center;margin-top:1.8rem" data-reveal><a class="button secondary" href="/cyber-threats/">Cyber Threats Explained &#8594;</a></p>
      </div>
    </section>''',
   f'''    <section class="section" aria-label="Home and business security">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/05 — HOME &amp; BUSINESS</p>
          <h2 class="section-title section-title--center" data-title>The right protection for your world<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="split-2">
          <div class="tile" data-reveal>
            <h3>Security for your home</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">Keep the whole family safe &mdash; the banking, the photos, the kids&rsquo; devices. We set up protection across every laptop, tablet and phone and keep an eye on it for you.</p>
            <ul class="checklist">
{checklist(["Malwarebytes Premium &amp; VPN on every device","Scam &amp; phishing protection","MFA on email, banking &amp; shopping","Automatic backups of photos &amp; files"])}
            </ul>
          </div>
          <div class="tile" data-reveal>
            <h3>Security for your business</h3>
            <p style="color:var(--muted);margin:0 0 1.1rem">Protect your team, your data and your reputation &mdash; without an in-house IT department. We roll out and centrally manage your whole security stack and report on it.</p>
            <ul class="checklist">
{checklist(["Centrally managed endpoint protection","Microsoft 365 security &amp; email filtering","MFA, access control &amp; leaver checks","Verified backups &amp; security reviews",'<a href="/security-awareness-training/">Staff security awareness training &amp; phishing simulation</a>'])}
            </ul>
          </div>
        </div>
      </div>
    </section>''',
   f'''    <section class="how" aria-label="If the worst happens">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/06 — IF THE WORST HAPPENS</p>
        <h2 class="section-title section-title--center" data-title>Hacked or hit? We&rsquo;re on it<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("Call us straight away","Ring 01202 775566 or jump on remote support &mdash; subscribers always jump the queue."),("We contain it","We lock down accounts, isolate affected devices and stop the threat spreading."),("We recover &amp; rebuild","We clean up, restore from verified backups, and harden everything so it can&rsquo;t happen again.")])}
        </ol>
      </div>
    </section>''',
   net_map_section("// ALWAYS WATCHING", "Your whole network, watched over",
       "          <p>Behind every plan sits proactive, always-on protection &mdash; antivirus, patching, backups and monitoring working together across every device, watched over by us day and night.</p>\n          <p>If something looks wrong, we usually catch it early &mdash; often before you&rsquo;d ever notice.</p>",
       variant="business", label="LIVE VIEW &mdash; YOUR NETWORK"),
   faq_html(CYBER_FAQS),
   tools_strip(["emailsec", "breach", "scamlink", "pwgen"], title="Check yourself &mdash; free security tools", lede_text="Run our free security checks right now and see where you stand.", alt=False),
   cta("Get the ultimate protection",
       "Layered, always-on security &mdash; set up, managed and monitored by your local team, and included in every monthly plan.",
       primary=("Get Protected", "/contact/"), secondary=("View Monthly Plans", "/monthly-it-support/")),
 ]),
)

# ============================================================ COMPUTER REPAIRS
# Town computer/laptop-repair pages — single source of truth, shared with build_extra.repair_pages()
# and the hub-page link grid below. Town list driven by real Google Search Console rankings on the
# old /computer-repair-near-me-service-support-*/ URLs (see MIGRATION-redirects.csv).
# (Town, slug, nearby areas, matching IT-support town page)
REPAIR_TOWNS = [
  ("Bournemouth", "computer-repair-bournemouth", "Boscombe, Winton, Charminster, Southbourne and across the BH postcodes", "it-support-bournemouth"),
  ("Poole", "computer-repair-poole", "Parkstone, Canford Heath, Broadstone and across Poole", "it-support-poole"),
  ("Christchurch", "computer-repair-christchurch", "Highcliffe, Mudeford, Burton and the surrounding area", "it-support-christchurch"),
  ("Blandford Forum", "computer-repair-blandford-forum", "Blandford St Mary, Pimperne, Bryanston, Charlton Marshall and the surrounding villages", "it-support-blandford-forum"),
  ("Weymouth", "computer-repair-weymouth", "Wyke Regis, Chickerell, Preston, Littlemoor and the surrounding area", "it-support-weymouth"),
  ("Gillingham", "computer-repair-gillingham", "Bourton, Milton on Stour, Wyke and the surrounding villages", "it-support-gillingham"),
  ("Dorchester", "computer-repair-dorchester", "Poundbury, Charminster, Broadmayne and the surrounding villages", "it-support-dorchester"),
  ("Ferndown", "computer-repair-ferndown", "West Parley, West Moors, Wimborne and the surrounding area", "it-support-ferndown"),
  ("Verwood", "computer-repair-verwood", "Three Legged Cross, West Moors, Cranborne and the surrounding villages", "it-support-verwood"),
  ("Wareham", "computer-repair-wareham", "Sandford, Wool, Stoborough, Bere Regis and the surrounding area", "it-support-wareham"),
  ("Sherborne", "computer-repair-sherborne", "Yetminster, Milborne Port, Bradford Abbas and the surrounding villages", "it-support-sherborne"),
  ("Bridport", "computer-repair-bridport", "West Bay, Beaminster, Charmouth and the surrounding area", "it-support-bridport"),
  ("Swanage", "computer-repair-swanage", "Studland, Corfe Castle, Langton Matravers and the Isle of Purbeck", "it-support-swanage"),
  ("Lyme Regis", "computer-repair-lyme-regis", "Charmouth, Uplyme, Axminster and the surrounding area", "it-support-lyme-regis"),
  ("Shaftesbury", "computer-repair-shaftesbury", "Motcombe, Fontmell Magna, Gillingham and the surrounding villages", "it-support-shaftesbury"),
  ("Portland", "computer-repair-portland", "Fortuneswell, Easton, Weymouth and the surrounding area", "it-support-portland"),
  ("Wimborne", "computer-repair-wimborne", "Colehill, Corfe Mullen, Wimborne Minster and the surrounding villages", "it-support-wimborne"),
  ("Sturminster Newton", "computer-repair-sturminster-newton", "Stalbridge, Marnhull, Hazelbury Bryan and the surrounding villages", "it-support-sturminster-newton"),
  ("West Moors", "computer-repair-west-moors", "Ferndown, Verwood, St Leonards and the surrounding area", "it-support-west-moors"),
  ("Corfe Mullen", "computer-repair-corfe-mullen", "Broadstone, Wimborne, Lytchett Matravers and the surrounding area", "it-support-corfe-mullen"),
  ("Upton", "computer-repair-upton", "Lytchett Minster, Hamworthy, Poole and the surrounding area", "it-support-upton"),
  # Recognisable places with real GSC demand but no dedicated IT-support page — twin points to the nearest IT-support town.
  ("St Ives", "computer-repair-st-ives", "Ashley Heath, St Leonards, Ringwood and the surrounding area", "it-support-ringwood"),
  ("Beaminster", "computer-repair-beaminster", "Broadwindsor, Netherbury, Bridport and the surrounding villages", "it-support-bridport"),
  ("Boscombe", "computer-repair-boscombe", "Springbourne, Pokesdown, Southbourne and east Bournemouth", "it-support-bournemouth"),
  ("Canford Heath", "computer-repair-canford-heath", "Creekmoor, Broadstone, Bearwood and across Poole", "it-support-poole"),
  ("Wyke Regis", "computer-repair-wyke-regis", "Rodwell, Chickerell, Weymouth and the surrounding area", "it-support-weymouth"),
  ("Wool", "computer-repair-wool", "Bovington, East Lulworth, Wareham and the surrounding villages", "it-support-wareham"),
  ("West Parley", "computer-repair-west-parley", "Longham, Hampreston, Ferndown and the surrounding area", "it-support-ferndown"),
]
def repair_town_links():
    items = "\n".join(f'          <li><a href="/{slug}/">Computer Repair {town}</a></li>'
                      for town, slug, _n, _it in REPAIR_TOWNS)
    items += '\n          <li><a href="/computer-repair-westbourne/">Computer Repair Westbourne</a></li>'
    items += '\n          <li><a href="/computer-repair-kinson/">Computer Repair Kinson</a></li>' 
    return f'''    <section class="section section--alt" aria-label="Computer repair by town">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 &mdash; COMPUTER REPAIR NEAR YOU</p>
          <h2 class="section-title section-title--center" data-title>Local computer &amp; laptop repair across Dorset<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="areas-grid" data-stagger>
{items}
        </ul>
      </div>
    </section>'''

add(
 slug="computer-repairs",
 title="Computer Repair Bournemouth | No Fix No Fee, Free Collection",
 desc="Computer and laptop repairs in Bournemouth, Poole and Dorset — no-fix-no-fee, 12-month warranty, no call-out fee. Free local collection. Rated 4.9 on Google, since 1995.",
 og_title="Computer Repairs Bournemouth | Laptop & PC Repairs",
 schema=lambda s: graph([
   crumb(s, "Computer Repairs"), webpage(s, "Computer Repairs", "Computer and laptop repairs in Bournemouth, Poole and Dorset."),
   service(s, "Computer Repairs", "Laptop and PC repairs — slow computers, virus removal, upgrades and setup.", "Computer repair"),
   faqpage(s, [
     ("Do you offer no-fix-no-fee?", "Yes — if we can't fix your device, you don't pay for the diagnosis. We always quote clearly before any chargeable work."),
     ("Is there a warranty on repairs?", "Yes — every repair is backed by a full 12-month warranty."),
     ("Do you repair both laptops and desktops?", "Yes — Windows laptops and desktop PCs, plus common upgrades like SSDs and more memory."),
     ("Can you remove a virus?", "Yes — we remove viruses and malware, clean up your system and set up protection so it doesn't come back."),
     ("Do I have to take out a subscription?", "No — we offer one-off repairs with no subscription. Many customers then move to a monthly plan to avoid future problems."),
     ("Which areas do you cover?", "All of Dorset — we're based in Bournemouth and collect free locally, with remote help available anywhere. See <a href=\"/it-support-dorset/\">IT support across Dorset</a> for every town we cover."),
   ]),
 ]),
 content="\n".join([
   hero(bc("Computer Repairs"), "// ONE-OFF FIXES",
        'Computer &amp; laptop <em class="grad grad--cyan">repairs</em>',
        hero_trust("Slow laptop, virus clean-up, dead Wi-Fi or a PC that just won&rsquo;t start? Book a one-off computer or laptop repair in Bournemouth, Poole or anywhere in Dorset — no subscription required."),
        cta1=("Book a Computer Repair", "/book-a-collection/"), cta2=("Avoid Future Problems", "/monthly-it-support/"),
        chips=["No-fix-no-fee", "12-month warranty", "Remote or on-site"]),
   f'''    <section class="section" aria-label="Overview">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — WHAT WE FIX</p>
          <h2 class="section-title" data-title>Fixed properly, explained clearly<span class="title-underline"></span></h2>
          <p>From a sluggish machine to one that won&rsquo;t boot, we diagnose the real problem and fix it — then tell you in plain English what went wrong and how to avoid it.</p>
          <p><strong>Many repairs are done remotely the same day.</strong> For hardware, we&rsquo;ll arrange a hands-on fix across Bournemouth, Poole and Dorset.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Laptop repairs","Desktop PC repairs","Slow computer fixes","Windows problems","Virus removal","SSD upgrades","Data backup","Software troubleshooting","New computer setup"])}
        </ul>
      </div>
    </section>''',
   f'''    <section class="section" aria-label="Our repair promise">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — OUR REPAIR PROMISE</p>
          <h2 class="section-title section-title--center" data-title>Repairs done right, risk-free<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("No-fix-no-fee","If we can&rsquo;t fix it, you don&rsquo;t pay for the diagnosis. No risk to you."),("12-month warranty","Every repair is backed by a full 12-month warranty for total peace of mind."),("Clear quotes first","We always quote clearly and get your go-ahead before any chargeable work."),("Free local collection","We&rsquo;ll collect and return your device across Bournemouth, Poole and Dorset."),("Your data, respected","Handled carefully and confidentially &mdash; with recovery options if needed."),("Plain-English advice","We explain what went wrong and how to stop it happening again.")])}
        </ul>
        <p style="text-align:center;margin-top:1.8rem" data-reveal><a class="button primary" href="/book-a-collection/">Book a Collection or Drop-off</a></p>
      </div>
    </section>''',
   f'''    <section class="repairs section--alt" aria-label="Avoid future problems">
      <div class="wrap">
        <div class="repairs__card" data-reveal>
          <div>
            <p class="eyebrow mono">// PREVENTION BEATS REPAIR</p>
            <h2 class="repairs__title">Avoid future problems with monthly support</h2>
            <p class="lede">One-off repairs fix today&rsquo;s problem. A monthly plan stops tomorrow&rsquo;s — with regular maintenance, security and a techie on hand, from &pound;18.25/month per computer.</p>
          </div>
          <a href="/monthly-it-support/" class="button primary">View Monthly Plans</a>
        </div>
      </div>
    </section>''',
   f'''    <section class="section" aria-label="Laptop repairs">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">// LAPTOP REPAIR</p>
          <h2 class="section-title" data-title>Laptop repair, done locally<span class="title-underline"></span></h2>
          <p>Most of what we fix is laptops &mdash; and most laptop problems are well worth repairing rather than replacing. From a slow laptop or a cracked screen to a worn-out battery or a dead charging port, we&rsquo;ll diagnose it, quote clearly, and get it sorted.</p>
          <p><strong>No-fix-no-fee and a 12-month warranty</strong> on every laptop repair, with free local collection across Bournemouth, Poole and Dorset.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Slow laptop speed-ups &amp; SSD upgrades","Cracked or dim screen replacement","Battery &amp; charging-port repair","Keyboard &amp; trackpad fixes","Liquid-damage &amp; no-power diagnosis","Virus removal &amp; data recovery"])}
        </ul>
      </div>
    </section>''',
   repair_town_links(),
   faq_html([
     ("Do you offer no-fix-no-fee?", "Yes &mdash; if we can&rsquo;t fix your device, you don&rsquo;t pay for the diagnosis. We always quote clearly before any chargeable work."),
     ("Is there a warranty on repairs?", "Yes &mdash; every repair is backed by a full 12-month warranty."),
     ("Do you repair both laptops and desktops?", "Yes — Windows laptops and desktop PCs, plus common upgrades like SSDs and more memory."),
     ("Can you replace a laptop screen or battery?", "Yes — cracked or dim laptop screens, worn-out batteries, charging ports, keyboards and trackpads are all common laptop repairs we carry out, with a clear quote first and a 12-month warranty."),
     ("Can you remove a virus?", "Yes — we remove viruses and malware, clean up your system and set up protection so it doesn&rsquo;t come back."),
     ("Do I have to take out a subscription?", "No — we offer one-off repairs with no subscription. Many customers then move to a monthly plan to avoid future problems."),
     ("Which areas do you cover?", "All of Dorset — we're based in Bournemouth and collect free locally, with remote help available anywhere. See <a href=\"/it-support-dorset/\">IT support across Dorset</a> for every town we cover."),
     ("Can you recover my files?", "In most cases, yes. Bring it to us before doing anything else and we&rsquo;ll give you the best chance of recovering your data."),
   ]),
   tools_strip(["pcbench", "faultcheck", "repairreplace"], title="Check your computer &mdash; free tools", lede_text="Benchmark it, diagnose it, or get an honest repair-or-replace verdict.", alt=False),
   cta("Book a computer repair", "Tell us what&rsquo;s wrong and we&rsquo;ll get you booked in — remote or on-site, across Bournemouth, Poole and Dorset.",
       primary=("Book a Collection", "/book-a-collection/"), secondary=("Call 01202 775566", "tel:+441202775566")),
 ]),
)

# ============================================================ AREAS COVERED
DORSET_AREAS = ["Bournemouth","Poole","Christchurch","Ferndown","Wimborne","Verwood","West Moors","Corfe Mullen","Broadstone","Upton","Wareham","Swanage","Dorchester","Weymouth","Portland","Blandford Forum","Shaftesbury","Sherborne","Gillingham","Sturminster Newton","Bridport","Lyme Regis","Beaminster","Wool","Lytchett Matravers","Colehill","West Parley","Ringwood","Highcliffe"]
LOCAL_SLUGS = {"Bournemouth", "Poole", "Christchurch", "Wimborne", "Ferndown", "Ringwood", "Verwood", "Broadstone", "Wareham",
               "Weymouth", "Dorchester", "Swanage", "Blandford Forum", "Shaftesbury", "Gillingham", "Sherborne",
               "Bridport", "Lyme Regis", "Corfe Mullen", "West Moors", "Sturminster Newton", "Portland", "Upton", "Highcliffe"}
def area_links():
    out = []
    for a in DORSET_AREAS:
        if a in LOCAL_SLUGS:
            href = "/it-support-" + a.lower().replace(" ", "-") + "/"
        else:
            href = "/contact/"
        out.append(f'        <li><a href="{href}">IT Support {a}</a></li>')
    return "\n".join(out)

add(
 slug="areas-covered",
 title="Areas Covered | IT Support Across Bournemouth, Poole & Dorset",
 desc="365 Techies provides remote and on-site IT support across Bournemouth, Poole, Christchurch, Wimborne, Ferndown and the rest of Dorset — for homes, sole traders and small businesses.",
 og_title="Areas Covered | IT Support Across Dorset",
 schema=lambda s: graph([
   crumb(s, "Areas Covered"), webpage(s, "Areas Covered", "IT support across Bournemouth, Poole and Dorset."),
 ]),
 content="\n".join([
   hero(bc("Areas Covered"), "// WHERE WE WORK",
        'IT support across <em class="grad grad--cyan">Dorset</em>',
        "We provide fast, secure remote support across the whole UK and Europe, and on-site help right across Bournemouth, Poole, the rest of Dorset and the New Forest — for homes, businesses and digital nomads alike.",
        cta1=("View Monthly Plans", "/monthly-it-support/"), cta2=("UK &amp; Europe", "/it-support-uk-europe/"),
        chips=["Remote across UK &amp; Europe", "On-site across Dorset", "Local, friendly techies"]),
   f'''    <section class="section" aria-label="Areas we cover">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// COVERAGE</p>
          <h2 class="section-title section-title--center" data-title>Towns we support<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Remote help reaches you wherever you are. For hands-on visits, here are the areas we cover most.</p>
        </div>
        <ul class="areas-grid" data-stagger>
{area_links()}
        </ul>
        <p class="lede lede--center" style="margin-top:2rem" data-reveal>We provide <a href="/it-support-dorset/">IT support across the whole of Dorset</a> and into Hampshire and the <a href="/it-support-new-forest/">New Forest</a> &mdash; including <a href="/it-support-lymington/">Lymington</a>, <a href="/it-support-new-milton/">New Milton</a> and <a href="/it-support-southampton/">Southampton</a> &mdash; on-site across the region, and fast, secure remote support <a href="/it-support-uk-europe/">across the entire UK &amp; Europe</a>, including <a href="/it-support-for-digital-nomads/">digital nomads</a> working anywhere in the world.</p>
        <div class="section-head" style="margin-top:3rem">
          <p class="eyebrow eyebrow--center mono" data-reveal>// NEW FOREST &amp; HAMPSHIRE</p>
          <h2 class="section-title section-title--center" data-title>Across the New Forest &amp; into Hampshire<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="areas-grid" data-stagger>
          <li><a href="/it-support-new-forest/">IT Support New Forest</a></li>
          <li><a href="/it-support-lymington/">IT Support Lymington</a></li>
          <li><a href="/it-support-new-milton/">IT Support New Milton</a></li>
          <li><a href="/it-support-brockenhurst/">IT Support Brockenhurst</a></li>
          <li><a href="/it-support-lyndhurst/">IT Support Lyndhurst</a></li>
          <li><a href="/it-support-fordingbridge/">IT Support Fordingbridge</a></li>
          <li><a href="/it-support-totton/">IT Support Totton</a></li>
          <li><a href="/it-support-hythe/">IT Support Hythe</a></li>
          <li><a href="/it-support-ringwood/">IT Support Ringwood</a></li>
          <li><a href="/it-support-southampton/">IT Support Southampton</a></li>
        </ul>
      </div>
    </section>''',
   cta("Not sure if we cover you?", "If you&rsquo;re in or around Dorset, we can almost certainly help — and remote support works wherever you are. Just ask.",
       primary=("Contact Us", "/contact/"), secondary=("View Monthly Plans", "/monthly-it-support/")),
 ]),
)

# ============================================================ ABOUT
add(
 slug="about",
 title="About 365 Techies | Bournemouth IT Support Experts",
 desc="365 Techies is a family-run, Bournemouth-based IT support company established in 1995 — Dell specialists, Microsoft partners and certified Microsoft Office Specialists helping homes and small businesses across Dorset with friendly, no-jargon technology support.",
 og_title="About 365 Techies | Bournemouth IT Support",
 schema=lambda s: graph([
   crumb(s, "About"), webpage(s, "About 365 Techies", "About 365 Techies — Bournemouth-based IT support for homes and businesses.", "AboutPage"),
 ]),
 content="\n".join([
   hero(bc("About"), "// ABOUT US",
        'The IT support <em class="grad grad--cyan">experts</em>',
        "365 Techies is a family-run, Bournemouth-based IT support company established in 1995 — Dell specialists, Microsoft partners and certified Microsoft Office Specialists, helping homes and small businesses across Dorset with friendly, jargon-free support they can rely on every month.",
        cta1=("View Monthly Plans", "/monthly-it-support/"), cta2=("Contact Us", "/contact/"),
        chips=["Family-run since 1995", "Bournemouth-based", "Rated 4.9 on Google"]),
   f'''    <section class="section" aria-label="Who we are">
      <div class="wrap wrap--narrow prose" data-reveal>
        <p class="eyebrow mono">/01 — WHO WE ARE</p>
        <h2 class="section-title" data-title>Real people. Real fixes. No runaround.<span class="title-underline"></span></h2>
        <p>We built 365 Techies for everyone who&rsquo;s ever been put on hold, talked down to, or handed a surprise bill. Technology should make life easier — and when it doesn&rsquo;t, you should have someone friendly to call.</p>
        <p><strong>We&rsquo;re a family business, established in 1995 — and today a leading local Managed Service Provider (MSP).</strong> Three decades on, the same friendly, no-nonsense approach still drives everything we do — and many of our customers have been with us for fifteen or twenty years. We proactively manage and protect our customers&rsquo; technology end to end, and we&rsquo;re Dell hardware specialists, Microsoft partners and certified Microsoft Office Specialists.</p>
        <p>That experience runs deep. From <strong>1998 to 2008 we built and ran the Dorset Microsoft Education Resource Centre</strong> &mdash; our own training centre in Winton, Bournemouth, on a computer network we designed, built and ran ourselves &mdash; helping local people and businesses get the most from their technology. We weren&rsquo;t only a local name, either: from <strong>1998 to 2008 we were the IT support partner for Mercedes-Benz Pentagon right across the south coast</strong> &mdash; we upgraded the computers in their garages in 2001, and supporting so many sites is exactly why we began offering <a href="/remote-support/">remote support</a>, which we still do every day. Then from <strong>2008 to 2017 we ran a busy computer sales, service and support centre in Moordown, Winton</strong>. In <strong>2017 we moved to the Kinson Community Centre</strong>, where we still provide community IT support and run group training classes in person when it can&rsquo;t be done remotely &mdash; so local people have trusted us with their computers, on the high street, at the community centre and now remotely, for decades. Some of the customers we first looked after back then are <strong>still with us today</strong>, relationships that now span more than twenty years.</p>
        <p>From our base in Bournemouth, we support home users, families, retired and disabled people, home workers, sole traders and small businesses right across Dorset. <strong>Supporting retired and disabled people is a real specialism of ours</strong> &mdash; patient, accessible help tailored to how you use your technology. Much of what we do happens quietly in the background: regular maintenance, security checks and updates that stop problems before they start.</p>
        <p><strong>Our customers stay with us for years</strong> — many for over a decade — because we&rsquo;re reliable, we explain things clearly, and we genuinely care about getting it right.</p>
      </div>
    </section>''',
   heritage_gallery(),
   f'''    <section class="section" aria-label="Community IT support and group training">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// IN PERSON, WHEN IT&rsquo;S NEEDED</p>
          <h2 class="section-title section-title--center" data-title>Community IT support &amp; group training<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Not everything is best sorted down the phone. From our base at the <strong>Kinson Community Centre</strong>, we offer community IT support and friendly group training classes in person &mdash; for anyone who&rsquo;d rather learn face to face, at their own pace, when it can&rsquo;t be done remotely.</p>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("users","Group training classes","Learn the essentials in a small, friendly group &mdash; in plain English, with no question too daft to ask."),("handshake","In-person help","When a problem &mdash; or a person &mdash; is better helped face to face than over a remote connection, we&rsquo;re here for that too."),("heart","Patient &amp; accessible","Ideal if you&rsquo;re retired, less confident with technology, or you simply prefer someone sitting alongside you."),("pin","A real local base","The Kinson Community Centre in Bournemouth &mdash; part of the community, and our home since 2017.")])}
        </div>
      </div>
    </section>''',
   f'''    <section class="section section--alt" aria-label="In the local press">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// IN THE LOCAL PRESS</p>
          <h2 class="section-title section-title--center" data-title>The time our software helped recover a stolen laptop<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="prose" data-reveal style="max-width:74ch;margin:0 auto">
          <p>Back when we traded as <strong>365 Computers</strong> on the Moordown high street, a customer&rsquo;s laptop was stolen from his car in Poole, back in 2011. Because we&rsquo;d set his machine up with the same kind of <strong>remote-support software we still use to look after customers today</strong>, our team could see it was being used &mdash; and the internet (IP) address it was connecting from. We passed the details to <strong>Dorset Police</strong>, who located the address and recovered the laptop.</p>
          <p>Our own <strong>David Bridgewater</strong> was quoted in the <strong>Bournemouth Echo</strong>, which ran the story under the headline <a href="https://www.bournemouthecho.co.uk/news/9427325.laptop-retrieved-thanks-to-software/" target="_blank" rel="noopener">&ldquo;Laptop retrieved thanks to software&rdquo;</a>. All these years on, the same care &mdash; and much of the same technology &mdash; still looks after our customers every day.</p>
        </div>
      </div>
    </section>''',
   f'''    <section class="section" aria-label="Trusted by local businesses">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// NOT JUST HOMES &amp; OFFICES</p>
          <h2 class="section-title section-title--center" data-title>Serious businesses rely on us too<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>From a single home laptop to demanding, specialist business setups, we&rsquo;ve been a trusted local name for decades. A few we&rsquo;re proud to have looked after:</p>
        </div>
        <ul class="checklist" data-stagger style="max-width:820px;margin:0 auto">
{checklist(['<strong><a href="https://www.emblemsportscars.com/" target="_blank" rel="noopener">Emblem Sports Cars</a></strong>, Poole &mdash; the South Coast&rsquo;s independent Ferrari, Maserati &amp; Lamborghini specialists. We look after their systems, right down to the car diagnostic kit. <em>Since 2016.</em>', '<strong>The Environment Agency</strong> &mdash; we designed, installed and still support a point-to-point wireless link spanning the <strong>River Avon at Knapp Mill, Christchurch</strong>, carrying data for the river&rsquo;s <a href="http://www.knappmill.co.uk/" target="_blank" rel="noopener">fish-monitoring station</a>. <em>Since 2015.</em>', '<strong><a href="https://vividwebsites.co.uk/" target="_blank" rel="noopener">Vivid Websites</a></strong>, Bournemouth &mdash; the web agency behind sites for Bournemouth &amp; Poole College, Upton Country Park and many more local organisations and events. We provide their IT sales, servicing and support. <em>Since 2010.</em>', '<strong><a href="https://www.colinclarkbuilders.co.uk/" target="_blank" rel="noopener">Colin Clark Builders</a></strong>, East Dorset &mdash; traditional builders and heritage-property restoration specialists. We provide their IT support and design and host their website. <em>Since 2014.</em>', '<strong><a href="https://www.beckox.co.uk/" target="_blank" rel="noopener">Beckox Plastic Fabrications</a></strong>, Poole &mdash; specialist plastic fabricators whose own blue-chip clients include Rolls-Royce, Merck and Wessex Water. We keep their IT running &mdash; sales, servicing and support. <em>Since 2001 &mdash; one of our longest-running relationships.</em>', '<strong>Mercedes-Benz Pentagon</strong> &mdash; we were the IT support partner for their garages right across the south coast. <em>1998&ndash;2008.</em>', '<strong>David F Green &amp; Associates</strong>, later the Poole financial advisers <strong><a href="https://www.pfmassociates.co.uk/" target="_blank" rel="noopener">PFM Associates</a></strong> &mdash; we stayed with the firm through its 2003 acquisition, handling the IT migration and office relocation, with IT sales and support throughout. <em>1997&ndash;2016.</em>'])}
        </ul>
        <p class="lede lede--center" data-reveal style="margin-top:1.6rem">From a single laptop to a workshop full of diagnostic kit, it&rsquo;s the same careful, reliable support &mdash; and most of these relationships have lasted a decade or more.</p>
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
   f'''    <section class="section" aria-label="Why choose us">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — WHY 365 TECHIES</p>
          <h2 class="section-title section-title--center" data-title>What makes us different<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("Monthly support options","Predictable cover for homes and businesses — not just emergency call-outs."),("Friendly, plain English","We explain what&rsquo;s wrong and how to avoid it — never condescending."),("Family-run since 1995","A family business established in 1995, looking after Dorset homes and businesses for three decades."),("Remote &amp; on-site","Most issues solved remotely in minutes; on-site when you need hands-on help."),("Microsoft 365 experience","Deep experience with Outlook, Teams, OneDrive and business email."),("Security-focused","Practical protection and sensible advice built into everything we do.")])}
        </ul>
      </div>
    </section>''',
   cta("Let&rsquo;s sort your IT", "Join the Dorset homes and businesses who never worry about technology. Friendly help is one message away.",
       primary=("View Monthly Plans", "/monthly-it-support/"), secondary=("Contact Us", "/contact/")),
 ]),
)

# ============================================================ CONTACT
add(
 slug="contact",
 title="Contact 365 Techies | Monthly IT Support Bournemouth",
 desc="Contact 365 Techies for monthly IT support, computer repairs and Microsoft 365 help in Bournemouth, Poole and Dorset. Call 01202 775566 or email help@365techies.co.uk, Mon–Fri 9am–5pm.",
 og_title="Contact 365 Techies | Monthly IT Support",
 schema=lambda s: graph([
   crumb(s, "Contact"), webpage(s, "Contact 365 Techies", "Contact 365 Techies for IT support in Bournemouth, Poole and Dorset.", "ContactPage"),
   {"@type": "Organization", "@id": SITE + "/#business-ref", "name": "365 Techies Limited",
    "telephone": "+441202775566", "email": "help@365techies.co.uk",
    "contactPoint": [
      {"@type": "ContactPoint", "telephone": "+441202775566", "email": "help@365techies.co.uk",
       "contactType": "customer support", "areaServed": "GB", "availableLanguage": "en-GB"},
      {"@type": "ContactPoint", "telephone": "+447520615332", "name": "Text only (SMS)",
       "contactType": "customer support", "areaServed": "GB", "availableLanguage": "en-GB"}]},
 ]),
 content="\n".join([
   hero(bc("Contact"), "// GET IN TOUCH",
        'Ask about <em class="grad grad--cyan">monthly IT support</em>',
        "Tell us what you need help with and we&rsquo;ll point you to the right plan or get a repair booked in. Friendly, no-pressure, no jargon.",
        cta1=("Call 01202 775566", "tel:+441202775566"), cta2=("Text us a message", "sms:+447520615332"),
        chips=["Mon&ndash;Fri 9am&ndash;5pm", "Text only: 07520 615332", "Remote &amp; on-site"]),
   f'''    <section class="section" aria-label="Contact details and form">
      <div class="wrap contact-grid">
        <form class="contact-form" data-reveal action="mailto:help@365techies.co.uk" method="post" enctype="text/plain">
          <label class="field"><span>Your name</span><input type="text" name="name" autocomplete="name" required /></label>
          <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required /></label>
          <label class="field"><span>Phone (optional)</span><input type="tel" name="phone" autocomplete="tel" /></label>
          <label class="field"><span>I need help with</span>
            <select name="topic">
              <option>Home IT support</option>
              <option>Business IT support</option>
              <option>Microsoft 365</option>
              <option>Cybersecurity</option>
              <option>Computer repair</option>
              <option>Something else</option>
            </select>
          </label>
          <label class="field"><span>How can we help?</span><textarea name="message" required></textarea></label>
          <button type="submit" class="button primary button--lg" style="width:100%">Send to help@365techies.co.uk</button>
          <p class="form-status mono" role="status" style="margin-top:1rem;color:var(--faint);font-size:.7rem">// SENDS STRAIGHT TO help@365techies.co.uk &middot; WE REPLY WITHIN ONE WORKING DAY</p>
          <p style="margin-top:.6rem;color:var(--muted);font-size:.85rem">Prefer email? Write to <a href="mailto:help@365techies.co.uk" style="color:var(--cyan)">help@365techies.co.uk</a> directly.</p>
        </form>
        <div data-reveal>
          <p class="eyebrow mono">// DIRECT</p>
          <h2 class="section-title" data-title>Talk to a techie<span class="title-underline"></span></h2>
          <ul class="contact-info">
            <li><span class="k">Phone</span><span class="v"><a href="tel:+441202775566">01202 775566</a></span></li>
            <li><span class="k">Text only</span><span class="v"><a href="sms:+447520615332">07520 615332</a> &middot; <span style="color:var(--muted)">prefer to text? message us anytime</span></span></li>
            {WA_CONTACT_ROW}
            <li><span class="k">Email</span><span class="v"><a href="mailto:help@365techies.co.uk">help@365techies.co.uk</a></span></li>
            <li><span class="k">Hours</span><span class="v">Monday&ndash;Friday, 9am&ndash;5pm</span></li>
            <li><span class="k">Based in</span><span class="v">Bournemouth, Dorset</span></li>
            <li><span class="k">Live chat</span><span class="v"><a href="#" data-open-chat>Chat to us now &#8594;</a></span></li>
            <li><span class="k">Book online</span><span class="v"><a href="/book-service/">Book a service or repair &#8594;</a></span></li>
            <li><span class="k">Emergency</span><span class="v"><a href="https://sos.splashtop.com/en/sos-download" target="_blank" rel="noopener">SOS remote support &#8594;</a></span></li>
          </ul>
        </div>
      </div>
      <div class="wrap" style="margin-top:2.4rem">
        <div style="border-radius:16px;overflow:hidden;border:1px solid rgba(125,170,220,0.18);max-width:1000px;margin:0 auto" data-reveal>
          <iframe title="365 Techies location &mdash; Bournemouth, Dorset" src="https://www.google.com/maps?q=365%20Techies%2C%20Bournemouth%2C%20Dorset&amp;output=embed" width="100%" height="320" style="border:0;display:block" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
      </div>
    </section>''',
   WCHECK_TOOL,
   cta("Prefer to just pick a plan?", "Browse monthly support for homes and businesses — clear pricing, no contracts, cancel anytime.",
       primary=("View Monthly Plans", "/monthly-it-support/"), secondary=("Home Plans", "/home-it-support-plans/")),
 ]),
)

# ---- write ----
def write_all():
    written = []
    for p in PAGES:
        slug = p["slug"]
        schema_json = p["schema"](slug)
        html = page(slug, p["title"], p["desc"], p["og_title"], schema_json, p["content"])
        d = os.path.join(BASE, slug)
        os.makedirs(d, exist_ok=True)
        fp = os.path.join(d, "index.html")
        with open(fp, "w", encoding="utf-8") as f:
            f.write(html)
        written.append(slug + "/index.html")
    return written

if __name__ == "__main__":
    w = write_all()
    print("Wrote %d pages:" % len(w))
    for x in w:
        print("  " + x)
