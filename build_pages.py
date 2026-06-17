# -*- coding: utf-8 -*-
"""365 Techies multi-page generator.
Holds the shared header/footer/head once; each PAGE supplies unique content + SEO + schema.
Run: python build_pages.py  (writes <slug>/index.html for every page)
"""
import os, json

BASE = os.path.dirname(os.path.abspath(__file__))
SITE = "https://365techies.co.uk"
CSSV = "36"
HUBSPOT_ID = "148562638"
# Public URL of the deployed 365 AI OS. When set, the /365-ai-os/ page shows a
# prominent "Launch the live demo" button. Leave empty ("") to hide it.
AI_OS_URL = ""
# Public URL of the deployed broadband-coverage proxy (the AI OS server's
# /api/broadband endpoint). When set, the broadband checker shows live Ofcom
# coverage for the entered postcode. Leave empty ("") for signposting only.
BROADBAND_API = ""

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
        <p class="lede lede--center" data-reveal>Set up your plan in minutes with secure Direct Debit, powered by GoCardless. No card to re-enter each month, no contract — change or cancel anytime.</p>
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
        <span>&#9679; CALL 01202 775566&ensp;//&ensp;FAMILY BUSINESS SINCE 1995&ensp;//&ensp;DELL SPECIALISTS&ensp;//&ensp;MICROSOFT PARTNER &amp; OFFICE SPECIALISTS&ensp;//&ensp;MALWAREBYTES PARTNER&ensp;//&ensp;NVIDIA &amp; SCAN PARTNER&ensp;//&ensp;RICHER SOUNDS PARTNER&ensp;//&ensp;BOURNEMOUTH &middot; POOLE &middot; DORSET&ensp;//&ensp;PLANS FROM &pound;15.95/MO&ensp;//&ensp;MON&ndash;FRI 9AM&ndash;5PM&ensp;//&ensp;</span>
        <span>&#9679; CALL 01202 775566&ensp;//&ensp;FAMILY BUSINESS SINCE 1995&ensp;//&ensp;DELL SPECIALISTS&ensp;//&ensp;MICROSOFT PARTNER &amp; OFFICE SPECIALISTS&ensp;//&ensp;MALWAREBYTES PARTNER&ensp;//&ensp;NVIDIA &amp; SCAN PARTNER&ensp;//&ensp;RICHER SOUNDS PARTNER&ensp;//&ensp;BOURNEMOUTH &middot; POOLE &middot; DORSET&ensp;//&ensp;PLANS FROM &pound;15.95/MO&ensp;//&ensp;MON&ndash;FRI 9AM&ndash;5PM&ensp;//&ensp;</span>
      </div>
    </div>
    <div class="header-bar">
      <a class="logo" href="/" aria-label="365 Techies — home">
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
            <a href="/services/">All Services</a>
            <a href="/preventative-maintenance/">Preventative Maintenance</a>
            <a href="/remote-it-support/">Remote IT Support</a>
            <a href="/microsoft-365-support/">Microsoft 365</a>
            <a href="/cybersecurity-support/">Cybersecurity</a>
            <a href="/malwarebytes-premium/">Malwarebytes Premium &amp; VPN</a>
            <a href="/disaster-recovery/">Disaster Recovery</a>
            <a href="/gdpr-it-compliance/">GDPR &amp; IT Compliance</a>
            <a href="/computer-repairs/">Computer Repairs</a>
            <a href="/dell-hardware/">Dell Laptops &amp; Desktops</a>
            <a href="/custom-pc-builds/">Custom-Built PCs</a>
            <a href="/threadripper-workstations/">Threadripper Workstations</a>
            <a href="/gaming-pcs/">Gaming PCs</a>
            <a href="/content-creator-pcs/">Content Creator PCs</a>
            <a href="/home-cinema-entertainment/">Home Cinema &amp; AV</a>
            <a href="/off-grid-victron-energy/">Off-Grid &amp; Victron Energy</a>
            <a href="/lithium-battery-installs-dorset/">Leisure &amp; Marine Batteries</a>
            <a href="/rural-and-farm-wifi-dorset/">Rural &amp; Farm Wi-Fi</a>
            <a href="/starlink-internet/">Starlink Internet</a>
            <a href="/web-design-hosting/">Website Design &amp; Hosting</a>
            <a href="/agentic-ai-systems/">Agentic AI Systems</a>
            <a href="/365-ai-os/">365 AI OS</a>
            <a href="/ai-voice-agents/">AI Voice Agents</a>
            <a href="/unitree-robots/">Unitree Robots</a>
          </div>
        </div>
        <div class="nav-item has-dropdown">
          <a href="/book-service/" aria-haspopup="true">Get Help
            <svg class="caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </a>
          <div class="dropdown">
            <a href="/monthly-it-support/">Monthly IT Support</a>
            <a href="/book-service/">Book a Service</a>
            <a href="/book-a-collection/">Book a Collection</a>
            <a href="/remote-support/">Start Remote Support</a>
            <a href="/support-portal/">Support Portal</a>
            <a href="/plan-finder/">Plan Finder</a>
            <a href="/cost-calculator/">Cost Calculator</a>
            <a href="/ai-roi-calculator/">AI ROI Calculator</a>
            <a href="/it-health-check-tool/">IT Health Check Tool</a>
            <a href="/broadband-speed-checker/">Broadband Speed Checker</a>
            <a href="/broadband-checker/">Broadband Switch Checker</a>
            <a href="/coverage-checker/">Coverage Checker</a>
            <a href="/spot-the-scam/">Spot the Scam Quiz</a>
            <a href="/computer-fault-checker/">Computer Fault Checker</a>
            <a href="/repair-or-replace-advisor/">Repair or Replace?</a>
            <a href="/password-strength-checker/">Password Checker</a>
            <a href="/downtime-cost-calculator/">Downtime Cost Calculator</a>
            <a href="/server-or-cloud-picker/">Server or Cloud?</a>
            <a href="/quick-quote/">Quick Quote</a>
            <a href="/free-it-health-check/">Free IT Health Check</a>
            <a href="/switching-it-provider/">Switching to Us</a>
            <a href="/online-safety/">Online Safety</a>
            <a href="/emergency-it-help/">Emergency IT Help</a>
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
        <a href="tel:+441202775566" class="nav-phone" aria-label="Call 365 Techies on 01202 775566">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>01202 775566
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
          <a href="/services/">All Services</a>
          <a href="/preventative-maintenance/">Preventative Maintenance</a>
          <a href="/remote-it-support/">Remote IT Support</a>
          <a href="/microsoft-365-support/">Microsoft 365</a>
          <a href="/cybersecurity-support/">Cybersecurity</a>
          <a href="/malwarebytes-premium/">Malwarebytes Premium &amp; VPN</a>
          <a href="/disaster-recovery/">Disaster Recovery</a>
          <a href="/gdpr-it-compliance/">GDPR &amp; IT Compliance</a>
          <a href="/computer-repairs/">Computer Repairs</a>
          <a href="/dell-hardware/">Dell Laptops &amp; Desktops</a>
          <a href="/custom-pc-builds/">Custom-Built PCs</a>
          <a href="/threadripper-workstations/">Threadripper Workstations</a>
          <a href="/gaming-pcs/">Gaming PCs</a>
          <a href="/content-creator-pcs/">Content Creator PCs</a>
          <a href="/home-cinema-entertainment/">Home Cinema &amp; AV</a>
          <a href="/off-grid-victron-energy/">Off-Grid &amp; Victron Energy</a>
          <a href="/lithium-battery-installs-dorset/">Leisure &amp; Marine Batteries</a>
          <a href="/rural-and-farm-wifi-dorset/">Rural &amp; Farm Wi-Fi</a>
          <a href="/starlink-internet/">Starlink Internet</a>
          <a href="/web-design-hosting/">Website Design &amp; Hosting</a>
          <a href="/agentic-ai-systems/">Agentic AI Systems</a>
          <a href="/365-ai-os/">365 AI OS</a>
          <a href="/ai-voice-agents/">AI Voice Agents</a>
          <a href="/unitree-robots/">Unitree Robots</a>
          <a href="/mobile-tablet-support/">Mobile &amp; Tablet Support</a>
          <a href="/voip-business-phones/">VoIP Business Phones</a>
          <a href="/server-network-support/">Server &amp; Network Support</a>
          <a href="/cctv-smart-home/">CCTV &amp; Smart Home</a>
          <a href="/cloud-migration/">Cloud Migration</a>
          <a href="/google-workspace-support/">Google Workspace</a>
          <a href="/cyber-essentials/">Cyber Essentials</a>
          <a href="/ai-training/">AI Training &amp; Adoption</a>
          <a href="/windows-11-support/">Windows 11 Support</a>
          <a href="/windows-10-end-of-life/">Windows 10 End of Life</a>
          <a href="/email-support/">Email Support</a>
          <a href="/wifi-support/">Wi-Fi Support</a>
          <a href="/printer-support/">Printer Support</a>
          <a href="/backup-support/">Backup Support</a>
          <a href="/new-computer-setup/">New Computer Setup</a>
        </div>
      </details>
      <details class="m-group">
        <summary>Get Help</summary>
        <div class="m-group__links">
          <a href="/monthly-it-support/">Monthly IT Support</a>
          <a href="/book-service/">Book a Service</a>
          <a href="/book-a-collection/">Book a Collection</a>
          <a href="/remote-support/">Start Remote Support</a>
          <a href="/support-portal/">Support Portal</a>
          <a href="/plan-finder/">Plan Finder</a>
          <a href="/cost-calculator/">Cost Calculator</a>
          <a href="/ai-roi-calculator/">AI ROI Calculator</a>
          <a href="/it-health-check-tool/">IT Health Check Tool</a>
          <a href="/broadband-speed-checker/">Broadband Speed Checker</a>
          <a href="/broadband-checker/">Broadband Switch Checker</a>
          <a href="/coverage-checker/">Coverage Checker</a>
          <a href="/spot-the-scam/">Spot the Scam Quiz</a>
          <a href="/computer-fault-checker/">Computer Fault Checker</a>
          <a href="/repair-or-replace-advisor/">Repair or Replace?</a>
          <a href="/password-strength-checker/">Password Checker</a>
          <a href="/downtime-cost-calculator/">Downtime Cost Calculator</a>
          <a href="/server-or-cloud-picker/">Server or Cloud?</a>
          <a href="/quick-quote/">Quick Quote</a>
          <a href="/free-it-health-check/">Free IT Health Check</a>
          <a href="/switching-it-provider/">Switching to Us</a>
          <a href="/online-safety/">Online Safety</a>
          <a href="/emergency-it-help/">Emergency IT Help</a>
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
    <p class="mobile-menu__foot mono"><a href="mailto:help@365techies.co.uk">help@365techies.co.uk</a><br /><a href="tel:+441202775566">01202 775566</a><br /><a href="sms:+447520615332">Text only: 07520 615332</a></p>
  </aside>
'''

# Text-only SMS number (TextMagic) — customers can text but not call this line. See memory text-number.md.
TEXT_DISPLAY = "07520 615332"
TEXT_SMS = "sms:+447520615332"

FOOTER = '''  <footer class="site-footer">
    <div class="footer-areas">
      <p class="footer-areas__head mono">// AREAS WE COVER &mdash; DORSET, NEW FOREST &amp; HAMPSHIRE</p>
      <nav class="footer-areas__links" aria-label="Areas we cover">
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
        <a href="/remote-support/">Start Remote Support</a>
        <a href="/support-portal/">Support Portal</a>
        <a href="/monthly-it-support/">Monthly IT Support</a>
        <a href="/home-it-support-subscriptions/">Home IT Support</a>
        <a href="/business-it-support-subscriptions/">Business IT Support</a>
        <a href="/home-it-support-plans/">Home Plans</a>
        <a href="/business-it-support-plans/">Business Plans</a>
        <a href="/computer-repairs/">Computer Repairs</a>
        <a href="/pricing/">Pricing</a>
        <a href="/quick-quote/">Quick Quote</a>
        <a href="/cost-calculator/">Cost Calculator</a>
        <a href="/ai-roi-calculator/">AI ROI Calculator</a>
        <a href="/it-health-check-tool/">IT Health Check Tool</a>
        <a href="/broadband-speed-checker/">Broadband Speed Checker</a>
        <a href="/broadband-checker/">Broadband Switch Checker</a>
        <a href="/coverage-checker/">Coverage Checker</a>
        <a href="/spot-the-scam/">Spot the Scam Quiz</a>
        <a href="/computer-fault-checker/">Computer Fault Checker</a>
        <a href="/repair-or-replace-advisor/">Repair or Replace?</a>
        <a href="/password-strength-checker/">Password Checker</a>
        <a href="/which-microsoft-365-plan/">Which Microsoft 365 Plan?</a>
        <a href="/what-would-you-lose/">What Would You Lose?</a>
        <a href="/downtime-cost-calculator/">Downtime Cost Calculator</a>
        <a href="/server-or-cloud-picker/">Server or Cloud?</a>
        <a href="/emergency-it-help/">Emergency IT Help</a>
        <a href="/online-safety/">Online Safety</a>
        <a href="/free-it-health-check/">Free IT Health Check</a>
        <a href="/switching-it-provider/">Switching to Us</a>
        <a href="/it-support-cost-guide/">IT Cost Guide</a>
      </nav>
      <nav aria-label="Services links">
        <p class="site-footer__head mono">SERVICES</p>
        <a href="/services/">All Services</a>
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
        <p class="site-footer__contact" style="margin-top:1.1rem"><a href="tel:+441202775566">01202 775566</a><br /><a href="sms:+447520615332">Text only: 07520 615332</a><br /><a href="mailto:help@365techies.co.uk">help@365techies.co.uk</a><br />Mon&ndash;Fri, 9am&ndash;5pm<br />Bournemouth, Dorset</p>
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

def page(slug, title, desc, og_title, schema_json, content):
    canon = f"{SITE}/{slug}/"
    og_type = "article" if '"BlogPosting"' in schema_json else "website"
    return f'''<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
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
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://api.fontshare.com" />
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <link rel="stylesheet" media="print" onload="this.media='all'" href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap" />
  <link rel="stylesheet" media="print" onload="this.media='all'" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" />
  <noscript>
    <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" />
  </noscript>
  <link rel="stylesheet" href="/css/styles.css?v={CSSV}" />
  <script type="application/ld+json">
{schema_json}
  </script>
  <script type="importmap">
    {IMPORTMAP}
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
</head>
<body id="top">
  <a class="skip-link" href="#main">Skip to content</a>
  <canvas id="tech-background" aria-hidden="true"></canvas>
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
  <script type="module" src="/js/interior.js?v=14"></script>
  <script src="/js/a11y.js?v=1" defer></script>
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
      if (v === "accepted") loadConsented();
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
    "image": SITE + "/og-image.jpg", "logo": SITE + "/favicon.svg", "priceRange": "££",
    "address": {"@type": "PostalAddress", "addressLocality": "Bournemouth", "addressRegion": "Dorset", "addressCountry": "GB"},
    "geo": {"@type": "GeoCoordinates", "latitude": 50.7192, "longitude": -1.8808},
    "areaServed": [{"@type": "AdministrativeArea", "name": "Dorset"},
                   {"@type": "AdministrativeArea", "name": "Bournemouth, Christchurch and Poole"},
                   {"@type": "AdministrativeArea", "name": "New Forest"}],
    "openingHoursSpecification": {"@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "09:00", "closes": "17:00"},
    "aggregateRating": {"@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "51", "bestRating": "5"},
    # Verified Google Business Profile (CID 5924622613303465737 / Place ID ChIJlTb8YRuic0gRCRczduB8OFI)
    # links the site's business entity to the official Google listing for local-SEO entity confirmation.
    "hasMap": "https://www.google.com/maps?cid=5924622613303465737",
    "sameAs": ["https://www.google.com/maps?cid=5924622613303465737"],
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

def webpage(slug, title, desc, wtype="WebPage"):
    return {"@type": wtype, "@id": f"{SITE}/{slug}/#webpage", "url": f"{SITE}/{slug}/",
            "name": title, "description": desc, "inLanguage": "en-GB",
            "isPartOf": {"@id": SITE + "/#website"}, "about": {"@id": SITE + "/#business"},
            "breadcrumb": {"@id": f"{SITE}/{slug}/#breadcrumb"},
            "primaryImageOfPage": {"@type": "ImageObject", "url": SITE + "/og-image.jpg"},
            "datePublished": "2026-06-12", "dateModified": "2026-06-15"}

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
          <figcaption><strong>{who}</strong><span class="mono">GOOGLE REVIEW</span></figcaption>
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

PAGES = []
def add(**kw):
    PAGES.append(kw)

# ============================================================ MONTHLY IT SUPPORT
add(
 slug="monthly-it-support",
 title="Monthly IT Support Subscriptions | 365 Techies",
 desc="Monthly IT support subscriptions for homes and small businesses across Bournemouth, Poole and Dorset. Regular maintenance, security checks, remote help and Microsoft 365 support from £15.95/month.",
 og_title="Monthly IT Support Subscriptions | 365 Techies",
 schema=lambda s: graph([
   crumb(s, "Monthly IT Support"), webpage(s, "Monthly IT Support Subscriptions", "Monthly IT support subscriptions for homes and small businesses across Dorset."),
   service(s, "Monthly IT Support", "Subscription IT support with regular maintenance, security checks and unlimited remote help.", "IT support subscription"),
   faqpage(s, [
     ("What is monthly IT support?", "Monthly IT support is a subscription that gives you ongoing help, regular maintenance, security checks and priority response for one predictable monthly cost — instead of paying per repair when something breaks."),
     ("How much does monthly IT support cost?", "Home plans start at £15.95/month and business plans from £21.15/month. Every plan includes a full computer service every six weeks."),
     ("Can I cancel my plan?", "Yes. Plans are monthly and cancel-anytime with no lock-in contract."),
     ("Do you support homes and businesses?", "Yes — we support home users, home workers, sole traders and small businesses across Bournemouth, Poole and Dorset."),
     ("What is it like dealing with you day to day?", "Friendly and unhurried. We phone before we connect for a remote session or a full computer service, we call ahead with an estimated arrival time when we're visiting you, and if you'd like, we can send you a text reminder when your backup is due. Because we're a family team, you deal with the same familiar people who get to know how you like things set up."),
   ]),
 ]),
 content="\n".join([
   hero(bc("Monthly IT Support"), "// MONTHLY SUBSCRIPTIONS",
        'Monthly IT support <em class="grad grad--cyan">subscriptions</em>',
        "Reliable monthly IT support for homes and businesses — remote help, regular maintenance, security checks and friendly technical support whenever you need it. From £15.95 a month, cancel anytime.",
        chips=["Plans from &pound;15.95/mo", "Full service every 6 weeks", "Cancel anytime"]),
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
            <p class="plan-card__price"><span class="from mono">FROM</span> &pound;15.95<span class="per">/month</span></p>
            <ul class="plan-card__features">
              <li>Unlimited remote support</li>
              <li>Full service every 6 weeks</li>
              <li>Wi-Fi, printer &amp; email help</li>
              <li>Microsoft 365 &amp; security</li>
            </ul>
            <a href="/home-it-support-plans/" class="button primary plan-card__cta">Set up Direct Debit</a>
            <p class="mono" style="text-align:center;margin-top:.7rem;color:var(--faint);font-size:.6rem;letter-spacing:.12em">DIRECT DEBIT BY GOCARDLESS &middot; CANCEL ANYTIME</p>
          </article>
          <article class="plan-card plan-card--business" data-reveal>
            <p class="plan-card__badge mono">&#9733; MOST POPULAR</p>
            <p class="plan-card__tag mono">FOR BUSINESS</p>
            <h3>Business IT Support</h3>
            <p class="plan-card__desc">Reliable monthly IT support for sole traders and small businesses across Dorset.</p>
            <p class="plan-card__price"><span class="from mono">FROM</span> &pound;21.15<span class="per">/month</span></p>
            <ul class="plan-card__features">
              <li>Priority response</li>
              <li>Microsoft 365 management</li>
              <li>Cybersecurity &amp; backups</li>
              <li>Staff onboarding &amp; advice</li>
            </ul>
            <a href="/business-it-support-plans/" class="button primary plan-card__cta">Set up Direct Debit</a>
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
     ("How much does it cost?", "Home plans start at &pound;15.95/month and business plans from &pound;21.15/month. Every plan includes a full computer service every six weeks."),
     ("Can I cancel my plan?", "Yes — plans are monthly and cancel-anytime with no lock-in contract."),
     ("Do you support both homes and businesses?", "Yes. We support home users, home workers, sole traders and small businesses across Bournemouth, Poole and the rest of Dorset."),
     ("What is it like dealing with you day to day?", "Friendly and unhurried. We phone before we connect for a remote session or a full computer service, we call ahead with an estimated arrival time when we&rsquo;re visiting, and if you&rsquo;d like, we can text you a reminder when your backup&rsquo;s due. Because we&rsquo;re a family team, you deal with the same familiar people who get to know how you like things set up."),
   ]),
   cta("Start your monthly support plan", "Join the Dorset homes and businesses who never worry about IT. Pick a plan, or talk to a friendly techie first.",
       primary=("View Home Plans", "/home-it-support-plans/"), secondary=("View Business Plans", "/business-it-support-plans/")),
 ]),
)

# ============================================================ HOME IT SUPPORT SUBSCRIPTIONS
add(
 slug="home-it-support-subscriptions",
 title="Home IT Support Subscriptions | Monthly Computer Support",
 desc="Monthly home IT support subscriptions for home users, families, home workers and retired users in Dorset. Help with computers, laptops, printers, email, Wi-Fi, Microsoft 365 and security from £15.95/month.",
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
        chips=["From &pound;15.95/mo", "Patient, jargon-free help", "Full service every 6 weeks"]),
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
{steps([("Pick a home plan","Choose Essential, Family or Premium. Monthly, no contract, cancel anytime."),("We get you set up","A quick secure connection and a friendly welcome — usually within minutes."),("Relax — you&rsquo;re covered","Message us any time you&rsquo;re stuck, and we&rsquo;ll keep everything healthy each month.")])}
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
   hero(bc("Business IT Support"), "// LEADING MSP &middot; FOR BUSINESS",
        'Business IT support <em class="grad grad--green">subscriptions</em>',
        "As a leading Managed Service Provider (MSP), we deliver reliable monthly IT support for sole traders and small businesses — Microsoft 365, cybersecurity, backups and staff support, proactively managed. Like having your own IT department, without the cost of employing one.",
        cta1=("Choose a Business Plan", "/business-it-support-plans/"), cta2=("Book a chat", "/contact/"),
        chips=["Leading local MSP", "From &pound;21.15/mo", "Remote &amp; on-site across Dorset"]),
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
   cta("Choose a business IT support plan", "Give your team reliable, secure IT for one predictable monthly cost. Pick a plan or book a quick chat.",
       primary=("Choose a Business Plan", "/business-it-support-plans/"), secondary=("Book a chat", "/contact/")),
 ]),
)

# ============================================================ HOME IT SUPPORT PLANS
def plan_card(variant, badge, tag, name, desc, price, per, feats, cta_label, cta_href):
    badge_html = f'\n            <p class="plan-card__badge mono">{badge}</p>' if badge else ""
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
 title="Home IT Support Plans | Monthly Computer Support Packages",
 desc="Simple monthly home IT support plans — Essential, Family and Premium. Remote support, regular maintenance, Microsoft 365, security and backups for home users and families in Dorset.",
 og_title="Home IT Support Plans | 365 Techies",
 schema=lambda s: graph([
   crumb(s, "Home Support Plans"), webpage(s, "Home IT Support Plans", "Monthly home IT support packages for home users and families."),
   service(s, "Home IT Support Plans", "Essential, Family and Premium monthly home IT support packages.", "Home IT support"),
 ]),
 content="\n".join([
   hero(bc("Home Support Plans"), "// HOME PLANS",
        'Home IT support <em class="grad grad--cyan">plans</em>',
        "Clear, simple monthly packages for home users and families. Pick the level of cover that suits you — and change or cancel any time.",
        cta1=("Get Started", "/contact/"), cta2=("Compare Plans", "#compare"),
        chips=["No contracts", "Cancel anytime", "Full service every 6 weeks"]),
   f'''    <section class="support-options" aria-label="Home support plans">
      <div class="plan-grid plan-grid--3">
{plan_card("home", None, "ESSENTIAL", "Essential Home", "For one person who needs occasional help and peace of mind.", "&pound;15.95", ("FROM","/mo"), ["Support for one main computer","Email help","Basic Windows support","Security advice","Monthly health check","Remote support"], "Set up Direct Debit", subscribe_href("home-essential"))}
{plan_card("business", "&#9733; MOST POPULAR", "FAMILY", "Family Home", "For homes with several devices and people to look after.", "&pound;19.95", ("FROM","/mo"), ["Support for several computers","Printer &amp; Wi-Fi help","Email &amp; Microsoft 365","Security checks","Backup guidance","Remote family support"], "Set up Direct Debit", subscribe_href("home-family"))}
{plan_card("home", None, "PREMIUM", "Premium Home", "For people who rely heavily on their technology.", "&pound;24.95", ("FROM","/mo"), ["Priority support","Multiple device support","Microsoft 365 help","Advanced troubleshooting","Regular maintenance","New device setup &amp; backups"], "Set up Direct Debit", subscribe_href("home-premium"))}
      </div>
      <p class="plans-note mono" data-reveal>// PRICES ARE GUIDE PRICES &middot; NO LOCK-IN &middot; ASK US FOR THE RIGHT FIT</p>
    </section>''',
   f'''    <section class="section section--alt" id="compare" aria-label="Compare home plans">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// COMPARE</p>
          <h2 class="section-title section-title--center" data-title>Compare home plans<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="price-table-wrap" data-reveal>
          <table class="price-table">
            <thead><tr><th scope="col">Feature</th><th scope="col">Essential<span class="price">&pound;15.95</span><span class="per">/month</span></th><th scope="col" class="pop">Family<span class="price">&pound;19.95</span><span class="per">/month</span></th><th scope="col">Premium<span class="price">&pound;24.95</span><span class="per">/month</span></th></tr></thead>
            <tbody>
              <tr><th scope="row">Devices covered</th><td>1 computer</td><td>Several</td><td>Multiple</td></tr>
              <tr><th scope="row">Unlimited remote support</th><td class="yes">&#10003;</td><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">Full service every 6 weeks</th><td class="yes">&#10003;</td><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">Email &amp; Microsoft 365 help</th><td>Email</td><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">Printer &amp; Wi-Fi help</th><td class="no">&ndash;</td><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">Security &amp; backup checks</th><td>Advice</td><td class="yes">&#10003;</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">Priority support</th><td class="no">&ndash;</td><td class="no">&ndash;</td><td class="yes">&#10003;</td></tr>
              <tr><th scope="row">New device setup</th><td class="no">&ndash;</td><td>Guidance</td><td class="yes">&#10003;</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>''',
   GC_NOTE,
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
        chips=["Per-user pricing", "Microsoft 365 managed", "Remote &amp; on-site options"]),
   f'''    <section class="support-options" aria-label="Business support plans">
      <div class="plan-grid plan-grid--3">
{plan_card("business", None, "STARTER", "Business Starter", "For sole traders and very small businesses.", "&pound;21.15", ("FROM","/user/mo"), ["Support for 1&ndash;3 users","Remote IT support","Email support","Microsoft 365 help","Basic security checks","Computer maintenance &amp; buying advice"], "Set up Direct Debit", subscribe_href("business-starter"))}
{plan_card("business", "&#9733; MOST POPULAR", "STANDARD", "Business Standard", "For small businesses needing regular IT support.", "Custom", ("FROM",""), ["Support for multiple users","Microsoft 365 administration","Outlook, Teams &amp; OneDrive","Backup checks","Cybersecurity guidance","Monthly maintenance &amp; new user setup"], "Get a Quote", "/contact/")}
{plan_card("business", None, "PREMIUM", "Business Premium", "For businesses that rely on IT every day.", "Custom", ("FROM",""), ["Priority support","Remote &amp; on-site options","Microsoft 365 management","Cybersecurity &amp; backup planning","Staff onboarding &amp; offboarding","Device setup &amp; technology planning"], "Get a Quote", "/contact/")}
      </div>
      <p class="plans-note mono" data-reveal>// PRICED PER USER &middot; NO LOCK-IN &middot; TELL US YOUR TEAM SIZE FOR A QUOTE</p>
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
              <tr><th scope="row">Users</th><td>1&ndash;3</td><td>Multiple</td><td>Multiple</td></tr>
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
 title="Remote IT Support Dorset & UK | Fast Online Computer Help | 365 Techies",
 desc="Fast, secure remote IT support for homes and businesses. Most computer problems fixed online in minutes via Splashtop SOS — no waiting for an engineer visit. Bournemouth, Poole & Dorset.",
 og_title="Remote IT Support | Fast Online Computer Help",
 schema=lambda s: graph([
   crumb(s, "Remote IT Support"), webpage(s, "Remote IT Support", "Fast, secure remote IT support for homes and businesses."),
   service(s, "Remote IT Support", "Secure remote computer support via Splashtop SOS, usually within minutes.", "Remote IT support"),
   faqpage(s, [
     ("Is remote support safe?", "Yes. Sessions run over Splashtop SOS — an encrypted, industry-standard remote support tool. You watch everything on screen and access ends the moment the session is over."),
     ("What can be fixed remotely?", "Most things — email problems, software issues, Microsoft 365, slow computers, printer setup, Windows updates and general troubleshooting for home and business users."),
     ("How fast is remote support?", "Most remote sessions start within minutes during opening hours (Mon–Fri, 9am–5pm), and subscribers always jump the queue."),
     ("Will you connect to my computer without warning?", "No. We always phone you first to say we're ready and to check you're ready before we connect. We never connect out of the blue, and a remote session can only start when you click our secure link to begin an encrypted Splashtop SOS session."),
   ]),
 ]),
 content="\n".join([
   hero(bc("Remote IT Support"), "// REMOTE SUPPORT",
        'Remote IT support, <em class="grad grad--cyan">in minutes</em>',
        "Most computer problems can be fixed remotely — no waiting in for an engineer. We connect securely over Splashtop SOS, you watch everything happen on screen, and access ends the moment we&rsquo;re done.",
        cta1=("Get Remote Support", "/contact/"), cta2=("SOS Emergency Session", "https://sos.splashtop.com/en/sos-download"),
        chips=["Encrypted Splashtop SOS", "You stay in control", "Usually within minutes"]),
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
   faq_html([
     ("Is remote support safe?", "Yes. Sessions run over Splashtop SOS — an encrypted, industry-standard remote support tool. You watch everything on screen and access ends the moment the session is over."),
     ("What can be fixed remotely?", "Most things — email problems, software issues, Microsoft 365, slow computers, printer setup, Windows updates and general troubleshooting for home and business users."),
     ("How fast is it?", "Most remote sessions start within minutes during opening hours (Mon&ndash;Fri, 9am&ndash;5pm). Subscribers always jump the queue."),
     ("Will you connect to my computer without warning?", "No &mdash; we always phone you first to say we&rsquo;re ready and to check you&rsquo;re ready before we connect. We never connect out of the blue, and a session can only start when you click our secure link."),
     ("Should I let someone remote into my computer?", "Only when you trust them and <em>you</em> started it &mdash; a genuine session (like ours over Splashtop SOS) only begins when you click a link you asked for, and we always phone first to check you&rsquo;re ready. If someone rings out of the blue claiming to be Microsoft, BT or your bank and asks for remote access, hang up &mdash; that&rsquo;s a scam. See our <a href=\"/spot-the-scam/\">Spot the Scam</a> guide."),
     ("What if it can&rsquo;t be fixed remotely?", "Occasionally hardware needs hands-on attention — we&rsquo;ll arrange a repair or on-site visit across Bournemouth, Poole and Dorset."),
   ]),
   promise_strip(items=[PROMISE_CALL, PROMISE_PEOPLE, PROMISE_ETA]),
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
]
add(
 slug="microsoft-365-support",
 title="Microsoft 365 Support Bournemouth | Outlook, Teams & OneDrive Help",
 desc="Complete Microsoft 365 support for homes and businesses in Dorset — Outlook, Teams, OneDrive, SharePoint, Exchange Online, licensing, migration, security and training. Set up, migrated and managed by your local team.",
 og_title="Microsoft 365 Support | Outlook, Teams & OneDrive Help",
 schema=lambda s: graph([
   crumb(s, "Microsoft 365"), webpage(s, "Microsoft 365 Support", "Complete Microsoft 365 support — Outlook, Teams, OneDrive, SharePoint, licensing, migration and security."),
   service(s, "Microsoft 365 Support", "Setup, migration, licensing, troubleshooting, security and training for Microsoft 365 for homes and businesses across Dorset.", "Microsoft 365 support"),
   faqpage(s, M365_FAQS),
 ]),
 content="\n".join([
   hero(bc("Microsoft 365"), "// MICROSOFT PARTNER",
        'Microsoft 365, <em class="grad grad--cyan">done properly</em>',
        "As Microsoft partners and certified Office Specialists, we set up, migrate, secure and support Microsoft 365 &mdash; from a single mailbox at home to a whole team in the cloud. Email, Teams, files and security, all working together and managed for you.",
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
   faq_html(M365_FAQS),
   cta("Get Microsoft 365 working for you", "Stuck with Outlook, Teams or a migration? Get it sorted by Microsoft partners &mdash; or fold Microsoft 365 into a monthly plan.",
       primary=("Get Microsoft 365 Support", "/contact/"), secondary=("View Monthly Plans", "/monthly-it-support/")),
 ]),
)

# ============================================================ CYBERSECURITY SUPPORT
CYBER_FAQS = [
  ("What makes this &lsquo;the ultimate&rsquo; security?", "It&rsquo;s layered. Instead of relying on one tool, we stack multiple defences &mdash; endpoint protection, email filtering, patching, multi-factor authentication, backups and monitoring &mdash; all set up, managed and watched by us. If one layer is bypassed, the next one catches it."),
  ("Do you use Malwarebytes?", "Yes &mdash; as a Malwarebytes Partner we deploy Malwarebytes Premium with VPN as the endpoint layer of your security stack, set up and managed by us. See our <a href=\"/malwarebytes-premium/\">Malwarebytes Premium &amp; VPN</a> page."),
  ("How do you protect against scams and viruses?", "We set up endpoint protection and web filtering, keep everything patched, filter phishing email, and give you a real human to ask whether a message is safe before you click."),
  ("Do you offer multi-factor authentication?", "Yes &mdash; we set up multi-factor authentication (MFA) and password managers the painless way, for home and business accounts, so a stolen password isn&rsquo;t enough to get in."),
  ("Can you review our business security?", "Yes &mdash; we provide plain-English business security reviews covering devices, email, backups, passwords, access and staff awareness, with clear recommendations."),
  ("I think I&rsquo;ve been hacked &mdash; can you help?", "Yes. Contact us straight away and we&rsquo;ll help lock down your accounts, clean up affected devices, restore from backup if needed and stop it happening again."),
  ("Do you provide cyber security for small businesses in Dorset?", "Yes &mdash; layered, managed protection sized for small businesses right across Dorset, Bournemouth and Poole: endpoint security, email filtering, MFA, patching, verified backups and monitoring, with a real local person to call. Pair it with <a href=\"/cyber-essentials/\">Cyber Essentials certification</a>."),
]
add(
 slug="cybersecurity-support",
 title="The Ultimate Cybersecurity for Homes & Businesses | 365 Techies",
 desc="The ultimate cybersecurity for homes and small businesses across Dorset — layered, always-on protection against ransomware, phishing, scams and malware. Malwarebytes Partner, Microsoft security, MFA, verified backups, 24/7 monitoring and a real human to ask.",
 og_title="The Ultimate Cybersecurity | 365 Techies",
 schema=lambda s: graph([
   crumb(s, "Cybersecurity"), webpage(s, "Cybersecurity Support", "The ultimate layered cybersecurity for homes and small businesses across Dorset."),
   service(s, "Cybersecurity Support", "Layered, always-on protection from ransomware, phishing, scams and malware for homes and businesses across Dorset.", "Cybersecurity"),
   faqpage(s, CYBER_FAQS),
 ]),
 content="\n".join([
   hero(bc("Cybersecurity"), "// THE ULTIMATE SECURITY",
        'The ultimate <em class="grad grad--green">cyber protection</em>',
        "Ransomware, scams and phishing don&rsquo;t care whether you&rsquo;re a family or a business &mdash; they just look for the easy way in. We close every door with layered, always-on protection that&rsquo;s set up, managed and watched over by us, keeping you safe online 24/7.",
        cta1=("Get Protected", "/contact/"), cta2=("Free IT Health Check", "/contact/"),
        chips=["Malwarebytes Partner", "Layered defence", "Monitored 24/7"]),
   f'''    <section class="section" aria-label="Why it matters">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — WHY IT MATTERS</p>
          <h2 class="section-title" data-title>One wrong click shouldn&rsquo;t cost you everything<span class="title-underline"></span></h2>
          <p>Cybercrime targets homes and small businesses just as hard as big companies &mdash; because they&rsquo;re often the softest targets. One dodgy email or weak password can mean locked files, a drained bank account or stolen customer data.</p>
          <p><strong>So we don&rsquo;t rely on a single tool.</strong> We build layers of protection that work together &mdash; and we manage and monitor them for you, so security actually stays switched on instead of lapsing the moment life gets busy.</p>
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
   f'''    <section class="section" aria-label="Threats we stop">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/03 — THREATS WE STOP</p>
          <h2 class="section-title section-title--center" data-title>What we&rsquo;re protecting you from<span class="title-underline title-underline--center"></span></h2>
        </div>
        <ul class="security-grid" data-stagger>
{grid_cards([("Ransomware","Malware that locks up your files and demands payment &mdash; blocked, with backups ready if needed."),("Phishing emails","Fake emails designed to steal logins or money &mdash; filtered out before they reach you."),("Online scams","Fake invoices, delivery texts and &lsquo;your account is locked&rsquo; tricks &mdash; spotted and stopped."),("Malware &amp; viruses","Viruses, spyware and trojans &mdash; caught in real time across all your devices."),("Account takeover","Stolen passwords made useless by multi-factor authentication."),("Data loss","Hardware failure, theft or mistakes &mdash; covered by automatic, verified backups.")])}
        </ul>
        <p style="text-align:center;margin-top:1.8rem" data-reveal><a class="button secondary" href="/cyber-threats/">Cyber Threats Explained &#8594;</a></p>
      </div>
    </section>''',
   f'''    <section class="section section--alt" aria-label="Home and business security">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/04 — HOME &amp; BUSINESS</p>
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
{checklist(["Centrally managed endpoint protection","Microsoft 365 security &amp; email filtering","MFA, access control &amp; leaver checks","Verified backups &amp; security reviews"])}
            </ul>
          </div>
        </div>
      </div>
    </section>''',
   f'''    <section class="how" aria-label="If the worst happens">
      <div class="wrap">
        <p class="eyebrow eyebrow--center mono" data-reveal>/05 — IF THE WORST HAPPENS</p>
        <h2 class="section-title section-title--center" data-title>Hacked or hit? We&rsquo;re on it<span class="title-underline title-underline--center"></span></h2>
        <ol class="how__steps">
{steps([("Call us straight away","Ring 01202 775566 or jump on remote support &mdash; subscribers always jump the queue."),("We contain it","We lock down accounts, isolate affected devices and stop the threat spreading."),("We recover &amp; rebuild","We clean up, restore from verified backups, and harden everything so it can&rsquo;t happen again.")])}
        </ol>
      </div>
    </section>''',
   faq_html(CYBER_FAQS),
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
 title="Computer Repairs Bournemouth | Laptop & PC Repairs | 365 Techies",
 desc="Computer and laptop repairs in Bournemouth, Poole and Dorset — no-fix-no-fee and a 12-month warranty. Slow computer fixes, virus removal, Windows problems, SSD upgrades, data recovery and new computer setup, with free local collection.",
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
   ]),
 ]),
 content="\n".join([
   hero(bc("Computer Repairs"), "// ONE-OFF FIXES",
        'Computer &amp; laptop <em class="grad grad--cyan">repairs</em>',
        "Slow laptop, virus clean-up, dead Wi-Fi or a PC that just won&rsquo;t start? Book a one-off computer or laptop repair in Bournemouth, Poole or anywhere in Dorset — no subscription required.",
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
            <p class="lede">One-off repairs fix today&rsquo;s problem. A monthly plan stops tomorrow&rsquo;s — with regular maintenance, security and a techie on hand, from &pound;15.95/month.</p>
          </div>
          <a href="/monthly-it-support/" class="button primary">View Monthly Plans</a>
        </div>
      </div>
    </section>''',
   repair_town_links(),
   faq_html([
     ("Do you offer no-fix-no-fee?", "Yes &mdash; if we can&rsquo;t fix your device, you don&rsquo;t pay for the diagnosis. We always quote clearly before any chargeable work."),
     ("Is there a warranty on repairs?", "Yes &mdash; every repair is backed by a full 12-month warranty."),
     ("Do you repair both laptops and desktops?", "Yes — Windows laptops and desktop PCs, plus common upgrades like SSDs and more memory."),
     ("Can you remove a virus?", "Yes — we remove viruses and malware, clean up your system and set up protection so it doesn&rsquo;t come back."),
     ("Do I have to take out a subscription?", "No — we offer one-off repairs with no subscription. Many customers then move to a monthly plan to avoid future problems."),
     ("Can you recover my files?", "In most cases, yes. Bring it to us before doing anything else and we&rsquo;ll give you the best chance of recovering your data."),
   ]),
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

# ============================================================ IT SUPPORT BOURNEMOUTH (local)
add(
 slug="it-support-bournemouth",
 title="IT Support Bournemouth | Home & Business Computer Support",
 desc="Local IT support in Bournemouth for homes and businesses — monthly support plans, computer repairs, Microsoft 365, cybersecurity and fast remote help. Friendly, Bournemouth-based techies.",
 og_title="IT Support Bournemouth | 365 Techies",
 schema=lambda s: graph([
   crumb(s, "IT Support Bournemouth"), webpage(s, "IT Support Bournemouth", "Local IT support in Bournemouth for homes and businesses."),
   service(s, "IT Support Bournemouth", "Monthly IT support, computer repairs, Microsoft 365 and cybersecurity for Bournemouth homes and businesses.", "IT support"),
   faqpage(s, [
     ("Are you based in Bournemouth?", "Yes — 365 Techies is based in Bournemouth and supports homes and businesses across the town and the wider Dorset area."),
     ("Do you offer on-site IT support in Bournemouth?", "Yes — fast remote help plus on-site visits across Bournemouth and Poole when hands-on support is needed."),
   ]),
 ]),
 content="\n".join([
   hero(bc("IT Support Bournemouth"), "// BOURNEMOUTH &middot; DORSET",
        'IT support in <em class="grad grad--cyan">Bournemouth</em>',
        "Friendly, local IT support for Bournemouth homes and businesses — monthly support plans, computer repairs, Microsoft 365, cybersecurity and fast remote help, from a team right on your doorstep.",
        chips=["Bournemouth-based", "Homes &amp; businesses", "Remote &amp; on-site"]),
   f'''    <section class="section" aria-label="Local support">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">/01 — LOCAL &amp; FRIENDLY</p>
          <h2 class="section-title" data-title>Your local Bournemouth techies<span class="title-underline"></span></h2>
          <p>We&rsquo;re based right here in Bournemouth, supporting home users, families, sole traders and small businesses across the town and the wider Dorset area.</p>
          <p><strong>Most problems are solved remotely in minutes</strong> — and when you need someone in person, we&rsquo;re just down the road. Local knowledge, no call-centres, no jargon.</p>
        </div>
        <ul class="checklist" data-stagger>
{checklist(["Monthly IT support plans","Computer &amp; laptop repairs","Microsoft 365 support","Cybersecurity &amp; backups","Wi-Fi, printer &amp; email help","Remote &amp; on-site support"])}
        </ul>
      </div>
    </section>''',
   f'''    <section class="section section--alt" aria-label="Services in Bournemouth">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>/02 — HOW WE HELP</p>
          <h2 class="section-title section-title--center" data-title>Everything Bournemouth needs<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="tile-grid" data-stagger>
{tiles([("home","Home support","Monthly plans and one-off help for Bournemouth homes and families."),("briefcase","Business support","Reliable IT for Bournemouth sole traders and small businesses."),("wrench","Computer repairs","Laptop and PC repairs, virus removal, upgrades and setup."),("cloud","Microsoft 365","Outlook, Teams, OneDrive and licensing — set up and supported."),("shield","Cybersecurity","Protection from scams, malware and phishing for local users."),("bolt","Remote support","Fast, secure online help wherever you are in Bournemouth.")])}
        </div>
      </div>
    </section>''',
   f'''    <section class="section section--alt" aria-label="Find us">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// FIND US</p>
          <h2 class="section-title section-title--center" data-title>Local to Bournemouth &amp; Dorset<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Based in Bournemouth, we provide remote support everywhere and on-site help right across Dorset and the New Forest.</p>
        </div>
        <div style="border-radius:16px;overflow:hidden;border:1px solid rgba(125,170,220,0.18);max-width:960px;margin:0 auto" data-reveal>
          <iframe title="365 Techies location &mdash; Bournemouth, Dorset" src="https://www.google.com/maps?q=365%20Techies%2C%20Bournemouth%2C%20Dorset&amp;output=embed" width="100%" height="340" style="border:0;display:block" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
      </div>
    </section>''',
   reviews_block([("My laptop died the night before a deadline. One message to 365 Techies and it was running again first thing next morning. Absolutely unreal.", "Maria L."),("Your service and support are unbeatable and delivered with patience and a smile.", "John Holloway")]),
   faq_html([
     ("Are you based in Bournemouth?", "Yes — 365 Techies is based in Bournemouth and supports homes and businesses across the town and the wider Dorset area."),
     ("Do you offer on-site IT support in Bournemouth?", "Yes — fast remote help plus on-site visits across Bournemouth and Poole when hands-on support is needed."),
     ("What does it cost?", "Home plans start at &pound;15.95/month and business plans from &pound;21.15/month, with one-off repairs also available."),
   ]),
   cta("Local IT support, sorted", "Join the Bournemouth homes and businesses who never worry about IT. Pick a plan or say hello.",
       primary=("View Monthly Plans", "/monthly-it-support/"), secondary=("Contact Us", "/contact/")),
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
        <p>From our base in Bournemouth, we support home users, families, retired and disabled people, home workers, sole traders and small businesses right across Dorset. <strong>Supporting retired and disabled people is a real specialism of ours</strong> &mdash; patient, accessible help tailored to how you use your technology. Much of what we do happens quietly in the background: regular maintenance, security checks and updates that stop problems before they start.</p>
        <p><strong>Our customers stay with us for years</strong> — many for over a decade — because we&rsquo;re reliable, we explain things clearly, and we genuinely care about getting it right.</p>
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
