# -*- coding: utf-8 -*-
"""
UK business network cluster - the verified dataset.

SAME RULE AS ap_lifecycle_data.py: every value here came from the VENDOR'S OWN
documentation. Nothing from a reseller blog, a comparison site or an EOL aggregator.

    CHECK = could not verify from a vendor source. Renders "Check with vendor",
            never a blank, never a guess.

PRICE RULE, and it is absolute: no price appears in this cluster unless the VENDOR
published it, and then only with the date checked. No "from", no "typically around",
no ranges, no USD converted to GBP, and never our own labour rate. 365 Techies is not
VAT registered, so no figure here may be presented VAT-inclusive or as reclaimable.

Checked 2026-07-27.
"""

CHECK = "CHECK"
DATES_CHECKED = "2026-07-27"
DATES_CHECKED_HUMAN = "27 July 2026"

# ---------------------------------------------------------------------------
# THE CLUSTER'S SIGNATURE ASSET: what actually happens when a firewall licence
# lapses, side by side, in each vendor's own words. Nobody else publishes this
# comparison - every incumbent result is one vendor describing itself, or a
# reseller renewal page. The outcomes genuinely differ, and one of them
# (Sophos) fails OPEN, which almost nobody says out loud.
# ---------------------------------------------------------------------------
LICENCE_EXPIRY = [
    dict(key="sonicwall", vendor="SonicWall", scope="TZ series (Gen 7 and Gen 8)",
         verdict="keeps working, stops protecting",
         severity="medium",
         what_happens="The box carries on routing and doing stateful firewalling. What "
                      "stops is the inspection: intrusion prevention, anti-malware, "
                      "application control, content filtering and Capture ATP are all "
                      "marked &ldquo;requires added subscription&rdquo; on the vendor&rsquo;s "
                      "own datasheet. Traffic still flows; it simply stops being examined.",
         watch_out="Signature-based protection running on a frozen signature set is worse "
                   "than no protection, because the dashboard still looks green.",
         source="sonicwall"),
    dict(key="fortinet", vendor="Fortinet", scope="FortiGate 40F / 70F / 70G / 90G",
         verdict="degrades to a plain router, and you cannot patch it",
         severity="high",
         what_happens="Fortinet&rsquo;s own knowledge base states the device &ldquo;will "
                      "operate as classic L3 firewalls with only cached NGFW "
                      "functionalities&rdquo;. Signatures freeze at whatever was last "
                      "downloaded.",
         watch_out="The one that hurts most: without FortiCare you cannot apply firmware "
                   "upgrades. So a lapsed licence blocks the security patch you need when "
                   "the next advisory lands.",
         source="fortinet"),
    dict(key="watchguard", vendor="WatchGuard", scope="Firebox T25 / T45 / T85",
         verdict="the expired service switches off, the box keeps passing traffic",
         severity="medium",
         what_happens="Each service carries its own expiry date inside the feature key. "
                      "In WatchGuard&rsquo;s words, when a subscription expires &ldquo;that "
                      "service does not operate, and the configuration options are "
                      "disabled&rdquo;. The Firebox continues passing traffic.",
         watch_out="Services expire individually, so you can be part-protected without "
                   "realising. Support is a separate subscription again &mdash; check both.",
         source="watchguard"),
    dict(key="sophos", vendor="Sophos", scope="Firewall XGS (base licence)",
         verdict="FAILS OPEN &mdash; your firewall rules stop being applied",
         severity="critical",
         what_happens="This is the one nobody says out loud, and it is Sophos&rsquo; own "
                      "documentation: when the base licence expires on hardware, "
                      "&ldquo;firewall rules aren&rsquo;t processed whether you&rsquo;ve "
                      "configured them to allow or block traffic. The firewall acts as a "
                      "router and masquerades all outbound traffic.&rdquo; NAT rules, "
                      "site-to-site tunnels, remote access points and wireless networks "
                      "stop working.",
         watch_out="Read that twice. Your <em>block</em> rules stop being processed too. "
                   "A lapsed base licence turns a firewall into a router that lets "
                   "everything out.",
         source="sophos"),
    dict(key="meraki", vendor="Cisco Meraki", scope="MX series",
         verdict="depends entirely on which licensing model you are on",
         severity="critical",
         what_happens="Two models, opposite behaviours. On <strong>co-termination</strong> "
                      "or <strong>per-device licensing</strong>, Meraki&rsquo;s "
                      "documentation says hardware &ldquo;will be non-operational&rdquo; "
                      "after the 30-day grace period &mdash; the site loses internet. On "
                      "the newer <strong>subscription</strong> model the device keeps "
                      "forwarding traffic but management locks.",
         watch_out="If you do not know which licensing model your organisation is on, find "
                   "out today. It is the difference between an inconvenience and the whole "
                   "site going dark.",
         source="meraki"),
]

# What a lapse does NOT do - the reassurance half, which matters because fear is
# what resellers sell. Only claims we can stand behind.
LICENCE_MYTHS = [
    ("Your firewall is not bricked.",
     "No vendor here erases configuration or disables the hardware permanently. Renewing "
     "restores service."),
    ("Nothing happens on the stroke of midnight.",
     "Meraki documents a 30-day grace period. Others degrade quietly rather than stopping. "
     "That is precisely why lapses go unnoticed for months."),
    ("It is not always urgent &mdash; but you must know which case you are in.",
     "A SonicWall that has stopped inspecting is a risk decision. A co-term Meraki past "
     "grace is an outage. Those need different responses and different budgets."),
]

# ---------------------------------------------------------------------------
# PSTN / WLR switch-off. The only genuinely deadline-driven page in the cluster.
# The valuable angle is NOT phones - it is the lines nobody remembers.
# ---------------------------------------------------------------------------
PSTN = dict(
    stop_sell="2023-09-05",
    stop_sell_human="5 September 2023",
    switch_off="2027-01-31",
    switch_off_human="31 January 2027",
    note="Two dates get conflated constantly. National stop-sell has been live since "
         "September 2023 &mdash; you cannot buy new analogue lines. The hard switch-off, "
         "when the network is turned off, is 31 January 2027.",
)

# The audit that makes this page worth reading. Every one of these can sit on an
# analogue line that is not on anyone's phone bill.
PSTN_CASUALTIES = [
    ("Lifts", "A lift emergency phone is a legal safety requirement. It is often on the "
              "oldest, least-documented line in the building.", "life-safety"),
    ("Fire alarm signalling", "Panels that dial an alarm receiving centre. If the line "
                              "dies, the signalling path dies silently.", "life-safety"),
    ("Intruder alarms", "Same story &mdash; the alarm still sounds locally, but nobody is "
                        "told.", "life-safety"),
    ("Door entry systems", "Entry phones that dial out to a mobile, common on gated sites "
                           "and flats above business premises.", "operational"),
    ("Card machines (PDQ)", "Older terminals dial out over analogue. When the line goes, "
                            "so does taking payment.", "operational"),
    ("Franking machines", "Post-room kit that dials to top up credit.", "operational"),
    ("Plant and lift rooms", "The spare line put in years ago for an engineer to use, "
                             "documented nowhere.", "operational"),
    ("ISDN30 into a phone system", "The one people do remember &mdash; but the replacement "
                                   "needs planning, not a swap.", "operational"),
]

PSTN_TRAPS = [
    ("Line power disappears.",
     "An analogue line carried its own power, so a corded phone worked in a power cut. The "
     "replacement runs on your broadband and your electricity. If a lift phone or fire "
     "panel depends on it, that is a life-safety change, not a technical one &mdash; and it "
     "needs a battery or a mobile fallback designed in."),
    ("The mobile fallback may be on a network being switched off too.",
     "Replacement alarm and lift diallers often use a mobile signal. 2G and 3G are "
     "themselves being retired in the UK, so a GSM dialler fitted as a fix can need "
     "replacing again. Ask which mobile generation the device uses before you buy it."),
    ("A bill that jumps with no change of service.",
     "Wholesale line rental charges have escalated ahead of the switch-off. If a line&rsquo;s "
     "cost rose and nothing about it changed, that is why &mdash; and it is a signal to "
     "audit rather than absorb."),
]

# ---------------------------------------------------------------------------
# PoE budget. The switching SERP has no UK authority at all, and this is the
# calculation nobody publishes plainly: total switch budget vs per-port class.
# Figures below are VENDOR-PUBLISHED switch budgets only.
# ---------------------------------------------------------------------------
POE_CLASSES = [
    ("802.3af", "PoE", "15.4 W", "12.95 W", "Older access points, most IP phones, simple cameras"),
    ("802.3at", "PoE+", "30 W", "25.5 W", "Wi-Fi 6 access points, PTZ cameras, most modern kit"),
    ("802.3bt Type 3", "PoE++", "60 W", "51 W", "High-end APs, video bars, thin clients"),
    ("802.3bt Type 4", "PoE++", "100 W", "71 W", "Displays, large PTZ, desktop-class devices"),
]

# Vendor-published PoE budgets, for the calculator's presets. Nothing inferred.
SWITCH_PRESETS = [
    ("Cisco Catalyst C1300-24P-4G", 24, 195),
    ("Cisco Catalyst C1300-24FP-4G", 24, 370),
    ("Cisco Catalyst C1300-48P-4X", 48, 370),
    ("Cisco Catalyst C1300-48FP-4X", 48, 740),
]

SOURCES = {
    "sonicwall": ("SonicWall TZ datasheets", "https://www.sonicwall.com/products/firewalls/entry-level"),
    "fortinet": ("Fortinet support knowledge base", "https://community.fortinet.com/"),
    "watchguard": ("WatchGuard help centre", "https://www.watchguard.com/help/docs/"),
    "sophos": ("Sophos Firewall documentation", "https://docs.sophos.com/nsg/sophos-firewall/"),
    "meraki": ("Cisco Meraki licensing documentation",
               "https://documentation.meraki.com/General_Administration/Licensing"),
    "openreach": ("Openreach: the switch to digital phone lines",
                  "https://www.openreach.com/upgrading-the-uk-to-digital-phone-lines"),
    "cisco_sw": ("Cisco Catalyst 1300 datasheet",
                 "https://www.cisco.com/c/en/us/products/switches/catalyst-1300-series-switches/"),
}

DISCLAIMER = (
    "365 Techies is an independent IT firm. We are a Dell reseller and a Microsoft partner; "
    "we are <strong>not</strong> an authorised partner, reseller or agent of SonicWall, "
    "Fortinet, WatchGuard, Sophos, Cisco, Cisco Meraki, Ubiquiti or any other vendor named "
    "on this page, and we have no access to their support entitlements on your behalf. "
    "Every quoted behaviour comes from the vendor&rsquo;s own documentation, linked in the "
    "source column, and was checked on " + DATES_CHECKED_HUMAN + ". Where we could not "
    "verify something from a vendor source we say &ldquo;check with vendor&rdquo; rather "
    "than guess. We publish no prices for this work &mdash; every site is different, and "
    "we would rather give you a real number on the phone than a fake one here."
)

# Date-sensitive claims and when they must be re-checked. The build emits this so
# the review diary cannot drift away from what is published.
REVIEW_DIARY = [
    ("2026-10-27", "Quarterly: re-check every vendor licence-expiry behaviour quote"),
    ("2026-12-01", "PSTN page: confirm the 31 Jan 2027 date has not moved again"),
    ("2027-01-31", "PSTN switch-off day: this page needs its successor written"),
    ("2027-02-01", "Rewrite /pstn-switch-off-business/ as 'you missed it, what now'"),
]
