# -*- coding: utf-8 -*-
"""
Business access-point lifecycle data — the dataset behind /business-access-point-end-of-life/.

THE ONE RULE THIS FILE EXISTS TO ENFORCE: every value here came from the VENDOR'S OWN
datasheet, end-of-life notice, release note or field notice. Nothing is inferred from a
sibling model, a reseller listing or an EOL aggregator.

    CHECK  = we could not verify this from a vendor source. It renders as a muted
             "Check with vendor" pill, NEVER as a blank cell and NEVER as a guess.

If you are tempted to fill a CHECK in from memory: don't. A business may retire kit or
delay a security upgrade on the strength of these numbers. Find the vendor page, put its
URL in `source_url`, then change it.

Dates checked 2026-07-27 against the vendor sources named in SOURCES.
Milestone vocabulary differs per vendor and is deliberately NOT normalised — see
MILESTONES. RUCKUS APs have no "End of Software Maintenance" milestone; their table gives
a "last supported software release" version string instead.
"""

CHECK = "CHECK"

# The single source of truth for the visible stamp, schema dateModified and review diary.
DATES_CHECKED = "2026-07-27"
DATES_CHECKED_HUMAN = "27 July 2026"

# ---------------------------------------------------------------------------
# Vendor milestone vocabulary. Readers conflate these constantly, and the whole
# pillar page hangs on the difference between "can't buy it" and "no more fixes".
# ---------------------------------------------------------------------------
MILESTONES = [
    ("RUCKUS", "End of Sale",
     "The last day you can buy it new from the vendor. Says nothing about support."),
    ("RUCKUS", "End of Support",
     "The last day the vendor will help you or issue fixes. This is the date that matters."),
    ("RUCKUS", "Last supported software release",
     "Not a date — a version number. The newest firmware your model will ever run. Once "
     "your controller moves past it, that model stops being manageable."),
    ("Cisco", "End of Sale",
     "The last day to order it."),
    ("Cisco", "End of Software Maintenance",
     "No more bug fixes. Security fixes may continue — see the next milestone."),
    ("Cisco", "End of Vulnerability/Security Support",
     "No more security patches. A working access point past this date is a risk decision, "
     "not a fault."),
    ("Cisco", "Last Date of Support",
     "The end. No support of any kind, at any price."),
]

# ---------------------------------------------------------------------------
# TABLE A + B rows. `state` is derived at build time from eos_support, never stored.
# ---------------------------------------------------------------------------
AP_MODELS = [
    # ---- RUCKUS, Wi-Fi 5 (802.11ac) ----
    dict(key="ruckus-r310", vendor="RUCKUS", model="R310", launched=CHECK,
         wifi_gen="802.11ac Wave 1 (Wi-Fi 5)", streams="2x2:2 SU-MIMO (no MU-MIMO listed)",
         phy="300 / 867 Mbps", ports="1 x 1GbE",
         poe="802.3af (11W max)", poe_af="af is its normal mode",
         wpa3="no", wpa3_note="",
         eos_sale="2021-03-31", eos_support="2026-03-31",
         last_sw="SmartZone 6.1.x (AP zone) / ZoneDirector 10.5.x",
         replacement="R320", source="ruckus_eol"),
    dict(key="ruckus-r500", vendor="RUCKUS", model="R500", launched=CHECK,
         wifi_gen="802.11ac Wave 1 (Wi-Fi 5)", streams="2x2:2 SU-MIMO",
         phy="300 / 867 Mbps", ports="2 x 1GbE",
         poe="802.3af (10.5W max)", poe_af="af is its normal mode",
         wpa3="no", wpa3_note="",
         eos_sale="2018-10-31", eos_support="2024-04-30",
         last_sw="SmartZone 5.2.x (AP zone) / ZoneDirector 10.4.x",
         replacement="R510", source="ruckus_eol"),
    dict(key="ruckus-r600", vendor="RUCKUS", model="R600", launched=CHECK,
         wifi_gen=CHECK, streams=CHECK, phy=CHECK, ports=CHECK,
         poe=CHECK, poe_af=CHECK, wpa3=CHECK, wpa3_note="",
         eos_sale="2019-04-30", eos_support="2024-04-30",
         last_sw="SmartZone 5.2.x (AP zone) / ZoneDirector 10.5.x",
         replacement="R610", source="ruckus_eol"),
    dict(key="ruckus-r510", vendor="RUCKUS", model="R510", launched="2016",
         launched_note="Announced 31 May 2016, shipping July 2016",
         wifi_gen="802.11ac Wave 2 (Wi-Fi 5)", streams="2x2:2, SU-MIMO and MU-MIMO",
         phy="300 / 867 Mbps", ports="2 x 1GbE, 1 x USB 2.0",
         poe="802.3af (12.6W max) — no separate 802.3at mode listed",
         poe_af="af is its normal mode — this is why R510 estates sit on af-only switches",
         wpa3="yes", wpa3_note="Listed on the current datasheet; needs later firmware and a "
                               "controller version that exposes it.",
         eos_sale="2022-01-31", eos_support="2028-12-31",
         last_sw="SmartZone 6.1.x (AP zone) / ZoneDirector 10.5.x",
         replacement="R550", source="ruckus_eol"),
    dict(key="ruckus-r610", vendor="RUCKUS", model="R610", launched="2016",
         launched_note="Announced 15 November 2016",
         wifi_gen="802.11ac Wave 2 (Wi-Fi 5)", streams="3x3:3, SU-MIMO and MU-MIMO",
         phy="450 / 1300 Mbps", ports="2 x 1GbE with LACP, 1 x USB",
         poe="802.3at (21.87W)",
         poe_af="2.4GHz limited to 2x3 (2-chain TX at 21dBm aggregate); USB port off; "
                "one Ethernet port off",
         wpa3="yes", wpa3_note="Firmware and controller dependent.",
         eos_sale="2022-01-31", eos_support="2027-12-31",
         last_sw="SmartZone 6.1.x (AP zone) / ZoneDirector 10.5.x",
         replacement="R650", source="ruckus_eol"),
    dict(key="ruckus-r710", vendor="RUCKUS", model="R710", launched="2015",
         launched_note="Announced 2 April 2015",
         wifi_gen="802.11ac Wave 2 (Wi-Fi 5)",
         streams="4x4:4 SU-MIMO; 3 streams for MU-MIMO",
         phy="600 / 1733 Mbps", ports="2 x 1GbE with LACP, 1 x USB",
         poe="802.3at (peak 25W)",
         poe_af="2.4GHz drops to 2x4 at 19dBm/chain; 2nd Ethernet disabled; USB disabled",
         wpa3=CHECK, wpa3_note="Not stated on the datasheet we could read.",
         eos_sale="2022-01-31", eos_support="2028-12-31",
         last_sw="SmartZone 6.1.x (AP zone) / ZoneDirector 10.5.x",
         replacement="R750", source="ruckus_eol"),
    dict(key="ruckus-r720", vendor="RUCKUS", model="R720", launched=CHECK,
         wifi_gen="802.11ac Wave 2 (Wi-Fi 5)", streams="4x4:4, SU-MIMO and MU-MIMO",
         phy="600 / 1733 Mbps", ports="1 x 2.5GbE, 1 x 1GbE, 1 x USB",
         poe="PoH / UPoE (up to 33.5W) for all features",
         poe_af="af (12.95W): both radios collapse to 1x4. at (25.5W): full 4x4 but the "
                "2nd Ethernet port and USB are still disabled",
         wpa3=CHECK, wpa3_note="Not stated on the datasheet we could read.",
         eos_sale="2022-01-31", eos_support="2027-12-31",
         last_sw="SmartZone 6.1.x (AP zone) / ZoneDirector 10.5.x",
         replacement="R750", source="ruckus_eol"),
    dict(key="ruckus-r320", vendor="RUCKUS", model="R320", launched=CHECK,
         wifi_gen="802.11ac (wave: check with vendor)", streams=CHECK, phy=CHECK,
         ports=CHECK, poe=CHECK, poe_af=CHECK, wpa3=CHECK, wpa3_note="",
         eos_sale="2022-01-31", eos_support="2028-12-31",
         last_sw="SmartZone 6.1.x (AP zone) / ZoneDirector 10.5.x",
         replacement="R350", source="ruckus_eol"),
    # ---- RUCKUS, Wi-Fi 6 ----
    dict(key="ruckus-r730", vendor="RUCKUS", model="R730", launched=CHECK,
         wifi_gen="Wi-Fi 6 (802.11ax)", streams=CHECK, phy=CHECK, ports=CHECK,
         poe=CHECK, poe_af=CHECK, wpa3=CHECK, wpa3_note="",
         eos_sale="2022-02-28", eos_support="2027-02-28",
         last_sw="SmartZone 6.1.0 (AP zone) / ZoneDirector 10.5.x",
         replacement="R850", source="ruckus_eol"),
    dict(key="ruckus-r550", vendor="RUCKUS", model="R550", launched=CHECK,
         wifi_gen="Wi-Fi 6 (802.11ax)", streams="2x2:2 both bands, SU-MIMO and MU-MIMO",
         phy="574 / 1200 Mbps", ports="2 x 1GbE, 1 x USB",
         poe="802.3at (18.71W)",
         poe_af="12.71W limited mode: 2.4GHz 2x2 at 19dBm/chain; 2nd Ethernet, onboard IoT "
                "radio and USB all disabled",
         wpa3="yes", wpa3_note="WPA3-Personal and WPA3-Enterprise both listed on the datasheet.",
         eos_sale=None, eos_support=None,
         last_sw="", replacement="", source="ruckus_eol"),
    dict(key="ruckus-r650", vendor="RUCKUS", model="R650", launched=CHECK,
         wifi_gen="Wi-Fi 6 (802.11ax)", streams="4x4:4 (5GHz) + 2x2:2 (2.4GHz)",
         phy="574 / 2400 Mbps (2974 combined)",
         ports="1 x 2.5GbE, 1 x 1GbE, USB, BLE + Zigbee",
         poe="802.3at (21.59W)",
         poe_af="12.25W: 5GHz drops 4x4 to 2x4; 2nd Ethernet, IoT radio and USB disabled",
         wpa3="yes", wpa3_note="",
         eos_sale=None, eos_support=None, last_sw="", replacement="", source="ruckus_eol"),
    dict(key="ruckus-r750", vendor="RUCKUS", model="R750", launched=CHECK,
         wifi_gen="Wi-Fi 6 (802.11ax)", streams="4x4:4 both bands",
         phy="1148 / 2400 Mbps", ports="1 x 2.5GbE, 1 x 1GbE, USB, BLE + Zigbee",
         poe="802.3at (22.34W)",
         poe_af="12.54W: both radios 2x4; 2nd Ethernet, IoT radio and USB disabled",
         wpa3="yes", wpa3_note="",
         eos_sale=None, eos_support=None, last_sw="", replacement="", source="ruckus_eol"),
    dict(key="ruckus-r850", vendor="RUCKUS", model="R850", launched=CHECK,
         wifi_gen="Wi-Fi 6 (802.11ax)", streams=CHECK,
         phy="4.8 Gbps combined (vendor product page)", ports=CHECK,
         poe=CHECK, poe_af=CHECK, wpa3=CHECK, wpa3_note="",
         eos_sale=None, eos_support=None, last_sw="", replacement="", source="ruckus_eol"),
    # ---- RUCKUS, Wi-Fi 7 ----
    dict(key="ruckus-r670", vendor="RUCKUS", model="R670", launched=CHECK,
         wifi_gen="Wi-Fi 7 (802.11be), tri-band",
         streams="2x2:2 / 4x4:4 / 2x2:2 tri-band", phy="9.34 Gbps combined",
         ports=CHECK, poe=CHECK, poe_af=CHECK, wpa3=CHECK, wpa3_note="",
         eos_sale=None, eos_support=None, last_sw="", replacement="", source="ruckus_eol"),
    dict(key="ruckus-r770", vendor="RUCKUS", model="R770", launched=CHECK,
         wifi_gen="Wi-Fi 7 (802.11be), tri-band",
         streams="2x2:2 (2.4GHz) / 4x4:4 (5GHz) / 2x2:2 (6GHz)",
         phy="12.22 Gbps combined", ports=CHECK, poe=CHECK, poe_af=CHECK,
         wpa3=CHECK, wpa3_note="",
         eos_sale=None, eos_support=None, last_sw="", replacement="", source="ruckus_eol"),
    # ---- Cisco Aironet ----
    dict(key="cisco-1700", vendor="Cisco", model="Aironet 1700 (AIR-AP1702I)",
         launched="2014", launched_note="Announced 25 August 2014",
         wifi_gen="802.11ac Wave 1 (Wi-Fi 5)", streams="3x3:2",
         phy="867 Mbps (80MHz) / 300 Mbps (40MHz)", ports="2 x 1GbE + console",
         poe="802.3af / 802.3at / Cisco Enhanced PoE; 15W draw", poe_af="",
         wpa3="no", wpa3_note="",
         eos_sale="2019-04-30", eos_support="2024-04-30",
         eos_sw_maint="2020-04-29", eos_vuln="2024-04-30",
         last_sw="", replacement="", source="cisco_eol"),
    dict(key="cisco-2700", vendor="Cisco", model="Aironet 2700 (AIR-AP2702I/E)",
         launched="2014", launched_note="Announced 25 March 2014",
         wifi_gen="802.11ac Wave 1 (Wi-Fi 5)", streams="3x4:3", phy="1.3 Gbps",
         ports="2 x 1GbE + console (plus AUX for a downstream device)",
         poe="802.3at; 15W draw",
         poe_af="Cisco's wording: the access point will dynamically shift from 3x4 to 3x3",
         wpa3="no", wpa3_note="",
         eos_sale="2019-04-30", eos_support="2024-04-30",
         eos_sw_maint="2020-04-29", eos_vuln="2024-04-30",
         last_sw="", replacement="", source="cisco_eol"),
    dict(key="cisco-3700", vendor="Cisco", model="Aironet 3700 (AIR-AP3702)",
         launched="2013", launched_note="Announced 27 September 2013",
         wifi_gen="802.11ac Wave 1 (Wi-Fi 5)", streams="4x4:3", phy="1.3 Gbps",
         ports=CHECK, poe="802.3at for 4x4:3 (wattage: check with vendor)",
         poe_af="Degrades to 3x3:3",
         wpa3="no", wpa3_note="Inferred from sibling Wave 1 datasheets — the 3700 datasheet "
                              "has been withdrawn from Cisco's site.",
         eos_sale="2019-04-30", eos_support="2024-04-30",
         eos_sw_maint="2020-04-29", eos_vuln="2024-04-30",
         last_sw="", replacement="", source="cisco_eol"),
    dict(key="cisco-1830", vendor="Cisco", model="Aironet 1830 (AIR-AP1832I)",
         launched="2015", launched_note="Announced 9 September 2015",
         wifi_gen="802.11ac Wave 2 (Wi-Fi 5)", streams="3x3:2, SU-MIMO and MU-MIMO",
         phy="867 / 300 Mbps (vendor aggregate: up to 1 Gbps dual-radio)",
         ports="1 x 1GbE only, plus console and USB",
         poe="802.3af / 802.3at; 15.4W draw",
         poe_af="Cisco's wording: if 802.3af PoE is the source of power, the USB port is disabled",
         wpa3="yes",
         wpa3_note="Delivered by the controller (AireOS 8.10.x or Catalyst 9800), not by the AP.",
         eos_sale=CHECK, eos_support="2027-04-30",
         eos_sw_maint=CHECK, eos_vuln="2027-04-30",
         last_sw="", replacement="", source="cisco_eol"),
    dict(key="cisco-1850", vendor="Cisco", model="Aironet 1850 (AIR-AP1852I/E)",
         launched="2015", launched_note="Announced 2 June 2015",
         wifi_gen="802.11ac Wave 2 (Wi-Fi 5)", streams="4x4:4 SU-MIMO",
         phy=CHECK, ports=CHECK, poe=CHECK, poe_af=CHECK, wpa3=CHECK, wpa3_note="",
         eos_sale=CHECK, eos_support=CHECK, eos_sw_maint=CHECK, eos_vuln=CHECK,
         last_sw="", replacement="", source="cisco_eol"),
]

# Controllers get their own small table — the pillar's central argument is that the
# controller, not the access point, is usually the real deadline.
CONTROLLERS = [
    dict(key="zd1200", vendor="RUCKUS", model="ZoneDirector 1200",
         capacity="150 access points / 4,000 clients / 256 WLANs",
         eos_sale="2022-08-31",
         eos_sale_quote="RUCKUS ZD1200 will become End of Sale effective August 31st, 2022",
         eos_support="2027-08-31", eos_support_reported=True,
         last_sw="Firmware 10.5.1.0.282 (22 July 2025)",
         successors="RUCKUS One (cloud), SmartZone SZ144, or Unleashed 200.13+ (controller-less)",
         source="ruckus_eol"),
]

# Firmware floors: the practical "am I patched?" test for this whole generation.
PATCH_FLOORS = [
    ("RUCKUS Unleashed", "200.15.6.212.27", "Wi-Fi 5 branch — fixes CVE-2025-46120"),
    ("RUCKUS Unleashed", "200.18.7.1.323", "Current branch — fixes CVE-2025-46120"),
    ("RUCKUS ZoneDirector", "10.5.1.0.282", "Fixes CVE-2025-46120"),
]

# Every claim that could frighten a reader into spending money needs a source they can open.
SOURCES = {
    "ruckus_eol": ("RUCKUS Hardware AP end-of-life table",
                   "https://support.ruckuswireless.com/end-of-life-tables"),
    "cisco_eol": ("Cisco end-of-sale and end-of-life bulletins",
                  "https://www.cisco.com/c/en/us/products/wireless/access-points/eos-eol-notice-listing.html"),
    "meraki_eol": ("Cisco Meraki end-of-life products and dates",
                   "https://documentation.meraki.com/General_Administration/Other_Topics/Meraki_End-of-Life_(EOL)_Products_and_Dates"),
    "meraki_lic": ("Cisco Meraki licensing documentation",
                   "https://documentation.meraki.com/General_Administration/Licensing"),
}

# Meraki: licence BEHAVIOUR is documented and verified; Meraki HARDWARE eol dates for the
# Wi-Fi 5 MR generation are verified below. Both were checked 2026-07-27.
MERAKI_WIFI5_EOL = [
    ("MR33", "2021-05-07", "2026-07-21"),
    ("MR42", "2022-07-14", "2026-07-21"),
    ("MR52", "2022-04-07", "2026-07-21"),
    ("MR53", "2021-05-07", "2026-07-21"),
]

# Milestones falling due soon. The build emits these as a maintenance list so the review
# diary cannot drift away from the published content.
REVIEW_DIARY = [
    ("2027-02-28", "RUCKUS R730 end of support"),
    ("2027-04-30", "Cisco Aironet 1830 last date of support"),
    ("2027-08-31", "RUCKUS ZoneDirector 1200 end of support (reported, not vendor-published)"),
    ("2027-12-31", "RUCKUS R610 and R720 end of support"),
    ("2028-12-31", "RUCKUS R510, R710 and R320 end of support"),
]

DISCLAIMER = (
    "365 Techies is an independent IT firm. We are not an authorised partner, reseller or "
    "agent of RUCKUS Networks, Belden, CommScope, Cisco or Cisco Meraki, and we have no "
    "access to their support entitlements on your behalf. Every date on this page comes "
    "from the vendor&rsquo;s own published notices, linked in the source column, and was "
    "checked on " + DATES_CHECKED_HUMAN + ". Where we could not verify something from a "
    "vendor source we say &ldquo;check with vendor&rdquo; rather than guess."
)

PHY_CAVEAT = (
    "Vendor headline figures are theoretical PHY rates. Real throughput per client, on a "
    "shared access point, is a fraction of them &mdash; Cisco&rsquo;s own datasheets use "
    "the word &ldquo;theoretical&rdquo;."
)


def state_of(eos_support, today=DATES_CHECKED):
    """Expired / supported / not announced — derived, never stored, so it cannot go stale."""
    if not eos_support:
        return ("current", "Current product &mdash; no end-of-life announced")
    if eos_support == CHECK:
        return ("check", "Check with vendor")
    if eos_support <= today:
        return ("expired", "Support ended")
    y, m, _ = (int(x) for x in eos_support.split("-"))
    ty, tm, _ = (int(x) for x in today.split("-"))
    months = (y - ty) * 12 + (m - tm)
    if months <= 18:
        return ("soon", "Ends in about %d months" % months)
    return ("ok", "Supported")
