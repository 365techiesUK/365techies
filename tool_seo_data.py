# -*- coding: utf-8 -*-
"""Central SEO/AI enhancement data for the free-tool pages.
Consumed by build_pages.add(): TOOL_TITLES overrides a page <title>; TOOL_SEO
appends a visible answer-first "how it works" block + injects HowTo / extra-FAQ /
WebApplication JSON-LD. One data edit here enhances a tool site-wide — no need to
touch each bespoke builder. Populated from the SERP-verified free-tools audit.

TOOL_SEO[slug] keys (all optional except where a tool needs them):
  meta      : override meta description (str)
  answer    : one plain-English sentence answering the tool's target question (str, may contain entities)
  howto     : {"name": str, "steps": [(step_name, step_text), ...]}
  faqs      : [(question, answer), ...]  — NEW faqs, appended to schema + shown in the block
  keyfacts  : static HTML (<ul>/<table>) rendering JS-only substance (str)
  webapp    : True to inject a WebApplication node if the page lacks one
  appName   : name for that WebApplication node (str)
"""

TOOL_TITLES = {
  "is-it-down": "Is My Broadband Down or Just Me? Live | 365 Techies",
  "repair-or-replace-advisor": "Should I Repair or Replace My Computer? | 365 Techies",
}

TOOL_SEO = {
  "is-it-down": {
    "answer": "If a website or app loads on mobile data but not on your Wi-Fi, the problem is almost always your own connection or router &mdash; not the service; this live checker helps you tell which.",
    "howto": {"name": "How to tell if it&rsquo;s down or just you", "steps": [
      ("Check the live status", "Find the service in the list above &mdash; a red status means it&rsquo;s a known outage affecting everyone, not just you."),
      ("Try mobile data", "Turn Wi-Fi off on your phone and load the same site over mobile data. If it works, your broadband or router is the problem."),
      ("Restart your router", "If it&rsquo;s only you, switch the router off for 30 seconds and back on &mdash; it fixes a surprising amount."),
      ("Still stuck? Ask us", "If it&rsquo;s not a known outage and a restart didn&rsquo;t help, call 01202 775566 and we&rsquo;ll take a look remotely."),
    ]},
    "faqs": [
      ("How do I know if my broadband is down or it&rsquo;s just me?", "Load a website over mobile data with Wi-Fi off. If it works on mobile data but not on your Wi-Fi, the fault is your broadband line or router, not the website. This checker also shows live status for 30+ big services so you can rule out a wider outage."),
      ("Is it my router or my internet provider?", "If every device in the house is affected and a router restart doesn&rsquo;t fix it, it&rsquo;s usually the line or provider. If only one device struggles, it&rsquo;s that device or its Wi-Fi. We can diagnose it remotely if you&rsquo;re not sure."),
    ],
    "webapp": False,
  },
  "repair-or-replace-advisor": {
    "answer": "As a rough rule, if a repair would cost more than about half the price of a comparable replacement &mdash; or the computer is over roughly five years old and out of security updates &mdash; replacing is usually the smarter move.",
    "keyfacts": '<ul><li><strong>The 50% rule:</strong> if the repair costs more than half the price of a similar new or refurbished machine, lean towards replacing.</li><li><strong>Age:</strong> under ~5 years and it&rsquo;s usually worth fixing; well over 5 and repeated faults point to replacing.</li><li><strong>Security updates:</strong> if it can no longer get updates (e.g. stuck on an unsupported Windows version), that pushes towards replacing.</li><li><strong>Cheap wins:</strong> a slow but otherwise healthy PC is often transformed by an SSD or more memory &mdash; a repair, not a replacement.</li></ul>',
    "howto": {"name": "How to decide whether to repair or replace", "steps": [
      ("Get the repair price", "Find out what the fix actually costs &mdash; we quote clearly and for free, with no-fix-no-fee."),
      ("Compare to a replacement", "Weigh it against a comparable machine, including our refurbished business-grade Dells from &pound;299."),
      ("Check the age and updates", "Over ~5 years old or no longer getting security updates tips the balance towards replacing."),
      ("Ask about a cheap upgrade", "If it&rsquo;s just slow, an SSD or memory upgrade often fixes it for a fraction of a new PC."),
    ]},
    "faqs": [
      ("Should I repair or replace my computer?", "A good rule of thumb: if the repair costs more than half the price of a comparable replacement, or the machine is over about five years old and no longer getting security updates, replacing usually makes more sense. If it&rsquo;s simply slow, an SSD or memory upgrade is a cheap repair that often transforms it."),
      ("Is it worth repairing a computer over 5 years old?", "Sometimes &mdash; a small, cheap fix (like an SSD) on an otherwise healthy machine can be well worth it. But repeated faults, expensive parts or the loss of security updates on an older machine usually mean a replacement is the better value."),
    ],
    "webapp": False,
  },
}
