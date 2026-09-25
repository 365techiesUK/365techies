# -*- coding: utf-8 -*-
"""Per-page words for build_pages.keep_band(): the "stop it happening again" band (25 Sep 2026).

Owner: "we want to make sure that we recommend that people basically get their machines properly serviced to keep
them all up to date for security with the security threats which are coming up with AI and to keep them running at
optimum speed". Pages: the busiest symptom and tool pages in his report.

Every sentence here is either the page's own claim, the plan pages' claim (unlimited remote support; WiFi advice and a
full service every six weeks), /free-pc-health-check/'s claim (every program updated, security read and written down,
backup checked; business portal on one screen) or a real price (home £18.25, business from £24.38, Microsoft 365
£4.85 per user added to a plan). Never: a general tune-up price (the £65 is the gaming PC remote tune-up only), the
app checking printers or licences, or the app as an antivirus.
"""

KEEP_BANDS = {
    "printer-disappeared-after-windows-update": {
        "h2": 'The next update is <em class="grad grad--cyan">already on its way</em>',
        "lede": ("A Windows update knocked the printer off, but skipping updates isn&rsquo;t the answer: they carry the security fixes "
                 "that matter more every year. The answer is updates done on a schedule by someone who checks everything still works afterwards."),
        "why": ("Rolling an update back to get printing again also rolls back its security fixes. Keep that as the last resort, "
                "not the habit."),
        "plan_h3": "Updates on our schedule, checked afterwards",
        "plan": [
            "Windows and driver updates applied every six weeks and checked afterwards, with every other program brought up to date too",
            "If an update knocks the printer off anyway, getting it back is covered by unlimited remote support",
            "Antivirus, firewall, drive encryption and backup checked and written down in a dated Service Report",
        ],
    },
    "printer-wont-connect-to-ee-smart-hub": {
        "h2": 'Printing again? <em class="grad grad--cyan">Keep it that way</em>',
        "lede": ("Printers fall off the wifi again when something changes: a new hub, a reset, a new computer. On a support plan, getting it "
                 "back is a phone call rather than a lost morning, and the computers themselves are kept up to date and checked."),
        "plan_h3": "Kept up to date, with help on the end of the phone",
        "plan": [
            "Unlimited remote support: when the printer drops off the wifi again, we connect to your computer and put it back",
            "Every program on your computers updated every six weeks, not just Windows and Microsoft 365",
            "Antivirus, firewall, drive encryption and backup checked and written down in a dated Service Report",
        ],
    },
    "shared-folders-not-working-after-windows-11-24h2-update": {
        "h2": 'Microsoft closed this door <em class="grad grad--cyan">on purpose</em>',
        "lede": ("24H2 tightened file sharing deliberately, and the bodge turns off the exact protections the update added, just as AI is "
                 "making weak spots quicker to find. The lasting fix is shares with proper logins, and every machine kept current."),
        "business": True,
        "plan_h3": "Every machine kept current, on one screen",
        "plan": [
            "Every program on every computer updated every six weeks, not just Windows and Microsoft 365",
            "Every machine on one screen in your portal: updates, protection and backups across the lot",
            "A dated Service Report for each computer, every service, and unlimited remote support in between",
        ],
    },
    "microsoft-office-unlicensed-product-error": {
        "h2": 'Never see <em class="grad grad--cyan">&ldquo;Unlicensed Product&rdquo;</em> again',
        "lede": ("This error almost never strikes machines where somebody is actually watching the licences. Managed Microsoft&nbsp;365 puts "
                 "someone on it, and the six-weekly service keeps Office and everything else on the machine up to date."),
        "plan_h3": "Licences watched, machines kept current",
        "plan": [
            "Managed Microsoft&nbsp;365: licences assigned properly and renewals watched, so a dead card never silently kills your subscription",
            "Every program updated every six weeks, Microsoft&nbsp;365 included",
            "Antivirus, firewall, drive encryption and backup checked and written down in a dated Service Report",
        ],
        "price": ("<b>&pound;18.25</b> a month per computer at home &middot; business from <b>&pound;24.38</b>, plus <b>&pound;4.85</b> per "
                  "Microsoft&nbsp;365 user added to your plan. Rolling monthly, no lock-in."),
    },
    "wifi-signal-test": {
        "id": "keep-it",
        "eyebrow": "// BEYOND THE WIFI",
        "h2": 'Good wifi, and computers <em class="grad grad--cyan">that keep up with it</em>',
        "lede": ("If the wifi tests well and the computer still crawls, the computer is the problem, and every device on your network is a way "
                 "in if it misses its updates. A support plan looks after both sides."),
        "plan_h3": "WiFi advice, and a full service every six weeks",
        "plan": [
            "Honest WiFi advice from a real local team, with your saved WiFi surveys in your own portal",
            "A full computer service every six weeks: every program updated, not just Windows and Microsoft 365",
            "Antivirus, firewall, drive encryption and backup checked and written down in a dated Service Report",
        ],
        "app_list": [
            "A real broadband speed test, kept so you can compare later",
            "Exact memory, drive health and free space",
            "Whether antivirus is on and a backup actually exists",
        ],
    },
    "pc-benchmark": {
        "eyebrow": "// KEEP THE SPEED, KEEP IT SAFE",
        "h2": 'Faster today, <em class="grad grad--cyan">and kept that way</em>',
        "lede": ("Your score is a snapshot. Regular servicing keeps a machine running at its best for years, and keeps it patched, which "
                 "matters more every year as attackers use AI to find what has been missed."),
        "plan_h3": "A full service every six weeks",
        "plan": [
            "Every program on it updated every six weeks, not just Windows and Microsoft 365",
            "Antivirus, firewall, drive encryption and backup checked and written down in a dated Service Report",
            "Unlimited remote support in between, so a slow day is a phone call",
        ],
        "plan_fine": ('Slow right now and not on a plan? We check the fault free, then quote before we fix: '
                      '<a href="tel:+441202775566">01202 775566</a>, Monday to Friday 9 to 5.'),
    },
}
