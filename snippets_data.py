# -*- coding: utf-8 -*-
"""Central title/description overrides for click-through repair.

WHY THIS FILE EXISTS
--------------------
GSC 30 Jul 2026: 185 pages were ranking on page one and earning 0.94% CTR
between them. 105 of those 185 had a broken search snippet - either a
description amputated with an ellipsis by _meta_desc(), or a title over 60
characters that Google cuts off mid-phrase. A page at position 7 with a
sentence that stops mid-word looks abandoned, so nobody clicks it.

Rankings take weeks to move. A snippet takes effect the moment Google
recrawls, and needs no position change at all - which is why this was the
first thing fixed.

RULES FOR ANYTHING ADDED HERE
-----------------------------
1. desc must be a COMPLETE thought and <= 155 characters, so that
   build_pages._meta_desc() never has to trim it. If _meta_desc puts an
   ellipsis back on, the entry has failed.
2. title <= 60 characters. Drop "| 365 Techies" before dropping meaning -
   Google appends the site name itself.
3. Front-load the answer, not the topic. "Yes, with caveats" outranks
   "a guide to whether". Position 7 has to earn the click off the page.
4. Do not change what the page is ABOUT. These pages already rank; the
   query language that earns the impressions must survive the rewrite.
5. No prices, no invented specs, no VAT-inclusive figures, no claims the
   page body does not support. Same standard as everywhere else on this site.
6. Plain ASCII in desc (no & or curly quotes) - it lands in an HTML
   attribute, and entities would be counted against the 155 by _meta_desc
   while rendering shorter. Titles use &amp; per site convention.

Applied centrally in build_pages.add(), so it wins over every data module.
Verify with:  py -X utf8 tools_check_snippets.py
"""

from html import unescape as _unescape

# slug -> {"title": ..., "desc": ...}  (either key optional)
SNIPPETS = {

    # ---- top of the funnel: Dell buying advice (the biggest impression block)
    "are-dell-latitude-laptops-good": {
        "title": "Are Dell Latitude Laptops Good? An Honest 2026 Verdict",
        "desc": "Yes, with caveats. A 30-year Dell specialist on build quality, real lifespan, and why a refurbished Latitude beats a new budget laptop every time.",
    },
    "dell-latitude-series-explained-3000-5000-7000": {
        # GSC 17 Aug: the head term "dell latitude" (671 imps, pos 7, 0 clicks) lands
        # here - lead the title with the term people typed, then the decision.
        "title": "Dell Latitude Explained: 3000 vs 5000 vs 7000, Which to Buy",
        "desc": "3000 for everyday work, 5000 for mainstream business, 7000 for premium ultralight. What you gain at each tier, and where the extra money is wasted.",
    },
    "password-generator": {
        # GSC 17 Aug: "password generator" 528 imps at pos 4, 0 clicks - the old title
        # narrowed the tool to "three random words"; the page does both, so say so.
        "title": "Free Password Generator: Random or Three-Word Passphrase",
        "desc": "Free password generator. Make a strong random password or an easy-to-remember three-word passphrase in one click - made in your browser, never sent anywhere.",
    },
    "dell-optiplex-micro-sff-tower-which-to-buy": {
        "desc": "Micro hides behind the monitor, SFF still takes a graphics card, Tower upgrades for years. Choose by what you will add later, not just desk space.",
    },
    "dell-latitude-5300-refurbished-worth-it": {
        "desc": "Light, well built and cheap now, but check the processor generation before you buy. Honest advice on this 13.3-inch business laptop and who it suits.",
    },
    "is-it-safe-to-buy-a-refurbished-laptop": {
        "desc": "Worried a refurbished laptop might be a risk? A fair question. The honest answer, the real risks to avoid, and how to buy one safely in the UK.",
    },
    "refurbished-laptops-dorset": {
        "desc": "Refurbished Dell Latitude laptops and OptiPlex PCs in Bournemouth, Poole and across Dorset. Tested, fitted with a new Samsung Pro SSD, and supported.",
    },
    "dell-precision-vs-latitude": {
        "desc": "Precision is a mobile workstation, Latitude is a business laptop. What certified drivers and ECC memory actually buy you, and when they buy you nothing.",
    },
    "how-long-do-dell-latitude-laptops-last": {
        "desc": "Five to eight years is normal, and the battery goes long before the laptop does. What actually kills them, and the two cheap upgrades that add years.",
    },
    "dell-latitude-5420-vs-5430-which-to-buy": {
        "desc": "The 5430 gains a newer processor and better thermals; the 5420 is the value buy secondhand. What genuinely changed between them, and which to pay for.",
    },
    "dell-caps-lock-light-blinking-wont-turn-on": {
        "desc": "A blinking Caps Lock light on a dead Dell is a diagnostic code, not a fault light. Count the blinks to find the failed part before spending anything.",
    },

    # ---- Dell: can this machine take Windows 11
    "dell-latitude-e5550-upgrade": {
        "title": "Dell Latitude E5550 in 2026: Upgrade or Replace?",
        "desc": "Is the Latitude E5550 still good in 2026? It cannot run Windows 11 officially, and Windows 10 support ended in October 2025. Your three honest options.",
    },
    "dell-latitude-e5540-upgrade": {
        "title": "Dell Latitude E5540 in 2026: Upgrade or Replace?",
        "desc": "Is the Latitude E5540 still good? It cannot run Windows 11 officially, and Windows 10 support ended in October 2025. Your three honest options.",
    },
    "dell-optiplex-9020-upgrade": {
        "title": "Dell OptiPlex 9020 in 2026: Windows 11 &amp; Upgrades",
        "desc": "Is the OptiPlex 9020 still good? Honest answers on the Windows 11 route, when an SSD still makes sense, and what to replace it with when it does not.",
    },
    "dell-optiplex-790-upgrade": {
        "title": "Dell OptiPlex 790 in 2026: Windows 11 &amp; Upgrades",
        "desc": "The OptiPlex 790 cannot run Windows 11 and Windows 10 support ended on 14 October 2025. Honest upgrade advice, and the right replacement for the money.",
    },
    "dell-inspiron-15-3000-windows-11": {
        "title": "Dell Inspiron 15 3000 &amp; Windows 11: Can Yours Upgrade?",
        "desc": "Some Inspiron 15 3000 laptops upgrade to Windows 11 happily, others never will, and two machines share the 3520 name. How to check yours in 30 seconds.",
    },
    "dell-inspiron-15-5000-windows-11": {
        "title": "Dell Inspiron 15 5000 &amp; Windows 11: Which Qualify?",
        "desc": "Two identical-looking Inspiron 5570s can get opposite Windows 11 answers. Here is why, the 30-second CPU check, and a model-by-model table from 5547 on.",
    },
    "dell-inspiron-desktop-windows-11": {
        "title": "Dell Inspiron Desktop &amp; Windows 11: Which Can Upgrade?",
        "desc": "Which Dell Inspiron desktops can run Windows 11? The 3670, 3880, 3891 and newer qualify. The 3650 and 3668 have no supported path at all. Full table.",
    },

    # ---- Dell: hardware faults
    "dell-xps-swollen-battery": {
        "title": "Dell XPS Swollen Battery: Touchpad Lifting or Not Clicking",
        "desc": "XPS touchpad bulging or not clicking? It is very likely a swollen battery. What Dell says to do and not do, plus safe replacement with free collection.",
    },
    "dell-g15-overheating": {
        "title": "Dell G15 Overheating or Fans Screaming? Free Fixes First",
        "desc": "Dell G15 hitting 90C with fans at full blast? Try these free fixes first, then the honest answer on fan cleaning and repaste, with free local collection.",
    },
    "dell-laptop-hinge-repair": {
        "title": "Dell Laptop Hinge Repair, Free Collection in Dorset",
    },
    "dell-precision-workstation-repair-support-dorset": {
        "title": "Dell Precision Workstation Repair &amp; Support, Dorset",
        "desc": "Independent Dell Precision workstation repair, upgrades and business support across Bournemouth, Poole and Dorset. Free collection, no posting it away.",
    },

    # ---- Outlook (the second biggest block)
    "outlook-cannot-open-the-outlook-window": {
        "desc": "Cannot start Microsoft Outlook, cannot open the Outlook window? Run outlook.exe /resetnavpane to rebuild the corrupt profile file. Full fix order here.",
    },
    "new-outlook-not-syncing": {
        "desc": "New Outlook not syncing or stuck on old mail? It only holds what it has downloaded. Widen Days of email to save, then reset the account in this order.",
    },
    "new-outlook-no-send-receive-button": {
        "desc": "There is no Send/Receive button in new Outlook, by design. What replaced it, how to force a sync now, and what to do when mail still will not arrive.",
    },
    "new-outlook-blank-screen": {
        "desc": "New Outlook showing a blank white screen on Windows 11? It is usually graphics or a corrupt cache. Accurate fix steps in the order that actually works.",
    },
    "new-outlook-search-not-working": {
        "desc": "New Outlook search returning nothing? It only searches synced mail. Widen Days of email to save, clear filter chips and include deleted items.",
    },
    "outlook-app-crashing-android": {
        "desc": "Outlook keeps crashing on Android? The usual cause is an out-of-date Android System WebView. Update it and Chrome, clear the cache, check battery settings.",
    },
    "outlook-not-syncing-android": {
        "desc": "Outlook not syncing on Android? Battery optimisation is the number one cause. Set Outlook to Unrestricted, allow background data, then reset the account.",
    },
    "outlook-app-asking-to-sign-in-android": {
        "desc": "Outlook on Android stuck in a sign-in loop? Clear the app cache, turn off battery and permission cleanups, then re-add the account in the right order.",
    },
    "outlook-search-greyed-out": {
        "desc": "Outlook search greyed out or returning no results? The real fix: the Windows Search service, not running as admin, and rebuilding the index properly.",
    },
    "outlook-shared-mailbox-sent-items": {
        "desc": "Mail sent from a shared mailbox landing in your own Sent Items? Fix it in Microsoft 365 with MessageCopyForSentAsEnabled, or the per-PC registry route.",
    },
    "outlook-error-0x800ccc1a": {
        "desc": "Outlook error 0x800CCC1A is an SSL/TLS mismatch: wrong secure ports or encryption. The correct port settings for classic Outlook, plus the OAuth2 fix.",
    },
    "outlook-error-0x800ccc0e": {
        "desc": "Outlook error 0x800ccc0e or 0x800ccc0f means Outlook cannot reach your mail server. A plain-English fix for classic Outlook on Windows, in order.",
    },
    "outlook-cant-sign-in": {
        "desc": "Something went wrong, we cannot sign you in right now, in Outlook on the web? Why it happens and how to fix it fast, in the right order.",
    },
    "outlook-ost-file-corrupt": {
        "desc": "Outlook saying errors have been detected in the file, for your .ost? The safe classic-Outlook fix with no email lost, and when to just let us do it.",
    },
    "outlook-autocomplete-not-working": {
        "desc": "Outlook autocomplete not working and your name suggestions have disappeared? How to switch it back on and rebuild the list, step by step.",
    },
    "outlook-problems": {
        "desc": "Outlook not working? Plain-English fixes for the most common problems: send and receive errors, will not open, password loops and mail not syncing.",
    },

    # ---- Microsoft 365 / Office / OneDrive
    "microsoft-office-unlicensed-product-error": {
        "title": "Fix the Office Unlicensed Product Error in Word &amp; Excel",
    },
    "microsoft-365-vs-google-workspace": {
        "desc": "An even-handed comparison for business: desktop apps, offline working, email, video, storage, security and price. Which one actually suits your team.",
    },
    "which-microsoft-365-plan": {
        "desc": "Which Microsoft 365 plan do you actually need? Answer a couple of quick questions, Personal, Family, Business Basic, Standard or Premium, and find out.",
    },
    "microsoft-365-migration": {
        "title": "Microsoft 365 Migration in Bournemouth &amp; Dorset",
        "desc": "Microsoft 365 migration across Bournemouth, Poole and Dorset. Email, contacts, calendars and files moved from Gmail, Exchange or any host, by hand.",
    },
    "stop-word-saving-to-onedrive": {
        "title": "Stop Word Saving to OneDrive: Turn Off Cloud Saving",
        "desc": "Word now saves new documents straight to OneDrive with a date for a name. Why it changed, where your files went, and the setting that puts it back.",
    },
    "onedrive-moved-my-desktop-and-documents": {
        "title": "OneDrive Moved My Desktop &amp; Documents: How to Undo It",
        "desc": "Windows 11 moved your Desktop and Documents into OneDrive without asking? Your files are not lost. How to turn off Folder Backup and move them back safely.",
    },
    "files-missing-from-onedrive": {
        "title": "Files Missing From OneDrive? A 10-Minute Checklist",
        "desc": "OneDrive files disappeared? They are usually hiding, not deleted. A calm 10-minute checklist: wrong account, cloud icons, recycle bin clocks and more.",
    },
    "onedrive-problems": {
        "title": "OneDrive Problems: Files Moved, Missing, Full or Stuck",
        "desc": "OneDrive moved your files, hid them or stopped syncing? Start here. Plain-English triage from a family-run Dorset firm supporting Microsoft software.",
    },
    "excel-onedrive-sync-conflicts": {
        "title": "Excel Could Not Merge the Changes: OneDrive Conflict Fix",
        "desc": "Excel says it could not merge your changes? Your edits are almost never lost. Find the conflict copy, rescue it with Version History, and stop it again.",
    },
    "teams-keeps-opening-wrong-account": {
        "title": "Teams Keeps Opening the Wrong Account? The Real Fix",
    },
    "former-it-provider-controls-microsoft-365": {
        "title": "Former IT Provider Controls Your Microsoft 365?",
        "desc": "A former IT company still holds the admin keys to your Microsoft 365? Three honest routes to take back control of your own tenant, with or without them.",
    },

    # ---- printers
    "printer-disappeared-after-windows-update": {
        "desc": "Printer gone from Windows 11 after an update? The calm fix order: restart the print spooler, re-add it, reinstall the driver, then roll back the update.",
    },
    "printer-says-wifi-password-incorrect": {
        "desc": "Printer rejecting a WiFi password you know is right? The real causes, 2.4GHz bands, WPA3, channel 13 and old firmware, and the fixes in the right order.",
    },
    "printer-wont-connect-to-bt-smart-hub": {
        "desc": "Wireless printer will not join your BT Smart Hub wifi? The honest fix order for Smart Hub 2 and 3: the 2.4GHz band trick, Smart Scan and WPS.",
    },
    "printer-wont-connect-after-moving-house": {
        "desc": "Just moved and your printer will not join the new WiFi? It still remembers the old network. How to reconnect HP, Epson, Canon or Brother printers.",
    },

    # ---- Windows / files / data
    "shared-folders-not-working-after-windows-11-24h2-update": {
        "title": "Shared Folders Not Working After Windows 11 24H2",
        "desc": "Shared folders stopped working after the Windows 11 24H2 update? It is the new SMB signing and guest-access security. The safe way to get back in.",
    },
    "data-recovery": {
        "desc": "Data recovery in Bournemouth, Poole and Dorset. Failed drives, deleted files, unreadable disks, dead laptops and memory cards. Call us on 01202 775566.",
    },
    "how-to-recover-deleted-files": {
        "desc": "Deleted something important by accident? Do not panic. There are several places to look, and acting quickly gives you the best chance of getting it back.",
    },
    "laptop-clicking-noise-wont-turn-on": {
        "desc": "A laptop making a clicking noise that will not turn on usually means a failing hard drive. Stop powering it on. Dorset data recovery on 01202 775566.",
    },
    "worth-repairing-old-laptop": {
        "desc": "Is it worth repairing a five-year-old laptop in the UK, or replacing it? An honest guide: the 50% rule, cheap SSD and RAM upgrades, and when to stop.",
    },
    "repair-or-replace-advisor": {
        "desc": "Repair or replace your computer? Answer four quick questions for an honest recommendation based on its age, the problem and any repair quote you have.",
    },
    "how-to-wipe-and-recycle-old-computer": {
        "title": "How to Safely Wipe &amp; Recycle an Old Computer (UK)",
        "desc": "How to safely wipe an old computer before selling or recycling it: Windows reset, why delete is not enough, SSD versus hard drive, and where to take it.",
    },
    "windows-accessibility-features-guide": {
        "desc": "A plain-English guide to the free accessibility features built into Windows: larger text, Magnifier, high contrast, Narrator, voice typing and captions.",
    },
    "windows-10-esu-free-enrolment-help": {
        "desc": "Windows 10 ESU free enrolment help. What consumer Extended Security Updates are, and the three ways to enrol, including free via a Microsoft account.",
    },

    # ---- accounts software
    "basic-paye-tools-could-not-access-the-database": {
        "desc": "Basic PAYE Tools could not access the database, right before payroll? Fix it safely without losing your RTI data, or get same-day remote help.",
    },
    "sage-50-multi-user-cannot-connect": {
        "title": "Sage 50 Multi-User Cannot Connect to Shared Data",
    },

    # ---- email migrations
    "move-virgin-media-email-to-gmail": {
        "desc": "Moving Virgin Media, ntlworld or blueyonder email to Gmail before your mailbox closes? The safe, folder-keeping way to do it, step by step.",
    },
    "move-plusnet-email-to-gmail": {
        "desc": "Plusnet is closing its email service and moving mailboxes to Greenby. How to move your Plusnet email and years of messages to Gmail before you lose them.",
    },

    # ---- security / scams
    "ive-been-scammed-what-to-do": {
        "title": "I've Been Scammed: What To Do Right Now (UK Steps)",
    },
    "smishing-and-vishing": {
        "title": "Smishing &amp; Vishing: What They Are, How to Stay Safe",
    },
    "online-safety": {
        "title": "Online Safety Hub: Stay Safe Online, in Plain English",
        "desc": "Staying safe online, made simple. Learn the common threats, test yourself, and pick up easy habits that keep you and your family safe.",
    },
    "cyber-threats": {
        "desc": "Cyber threats explained in plain English: ransomware, phishing, online scams, malware, smishing, business email compromise and data breaches.",
    },
    "how-to-choose-antivirus": {
        "desc": "A plain-English guide to choosing antivirus and online protection: what good security really includes, free versus paid, and whether you need a VPN.",
    },
    "password-strength-checker": {
        "desc": "Free, private password strength checker and three-word passphrase generator. Test how strong your password is, all in your browser. Nothing is sent.",
    },
    "emergency-it-help": {
        "desc": "Something gone wrong? Start here. Quick-action help for IT emergencies: scams, hacked accounts, lost phones, ransomware, viruses and dead computers.",
    },

    # ---- business / plans
    "what-to-do-when-an-employee-leaves": {
        "title": "What to Do When an Employee Leaves Your Business",
        "desc": "When someone leaves, their access does not disappear on its own. A simple offboarding checklist to keep your business secure, in the order to do it.",
    },
    "whats-included-home-it-support-subscription": {
        "title": "What Is Included in a Home IT Support Subscription?",
    },
    "whats-included-business-it-support-plan": {
        "title": "What Is Included in a Business IT Support Plan?",
        "desc": "A business IT support plan gives you an outsourced IT department for a flat monthly fee. Exactly what is included, and how it keeps your team working.",
    },
    "how-onboarding-works": {
        "title": "How Onboarding Works: Your First Few Weeks With Us",
        "desc": "What happens when you become a 365 Techies customer, from your first hello to settling into the six-weekly rhythm of planned visits.",
    },
    "it-support-for-gyms-fitness": {
        "desc": "IT support for gyms, fitness studios and leisure centres across Dorset. Keeping membership and booking software, door access and card payments running.",
    },
    "it-support-for-hotels-holiday-lets": {
        "desc": "IT support for hotels, bed and breakfasts, guest houses and holiday lets across Dorset and the New Forest. Booking systems, guest Wi-Fi, card payments.",
    },
    "it-support-for-estate-agents": {
        "desc": "IT support for estate and letting agents. Keeping property portals, CRM, email, mobile working and branch networks running so you never miss a lead.",
    },
    "server-network-support": {
        "desc": "Design, setup and support for business servers, NAS storage and networks. Wired and wireless networking, shared files and secure remote access, in Dorset.",
    },
    "mobile-tablet-support": {
        "desc": "Help with Android phones and tablets, Samsung and Windows devices: email setup, syncing, backups, security and app problems, across Bournemouth and Dorset.",
    },
    "plain-english": {
        "desc": "The most common IT terms and services explained in plain English: backups, online security, Microsoft 365, remote support and monthly support plans.",
    },
    "cost-calculator": {
        "desc": "Work out your monthly IT support cost in seconds. A live calculator for home and business: set the number of computers and Microsoft 365 licences.",
    },
    "coverage-checker": {
        "desc": "Do we cover your area? Enter your postcode and instantly see whether 365 Techies offers on-site IT support near you across Dorset and the New Forest.",
    },
    "is-it-down": {
        "desc": "Is it down, or is it just you? Live status for 30+ big services including WhatsApp, Microsoft 365, Gmail and PlayStation, plus a check of your own line.",
    },
    "custom-pc-builder": {
        "desc": "Free custom PC builder. Set your budget and use, gaming, creative, office or CAD, and get an experienced builder's split of where the money should go.",
    },

    # ---- broadband / WiFi
    "how-to-choose-broadband": {
        "desc": "A plain-English guide to choosing broadband: FTTP full fibre, FTTC, 4G/5G and Starlink explained, and how much speed you really need at home.",
    },
    "broadband-help": {
        "title": "Broadband Setup &amp; Help in Bournemouth &amp; Dorset",
        "desc": "Broadband setup and help in Bournemouth, Poole and Dorset. New line setup, switching providers, FTTP upgrades, no-internet fixes and dealing with your ISP.",
    },
    "wifi-uk-buildings-heat": {
        "title": "Why UK Houses Kill WiFi: Walls, Insulation &amp; Heat",
        "desc": "Measured signal loss through brick, concrete and low-E glass, what foil-backed insulation really does to WiFi, and how many nodes UK housing needs.",
    },
    "business-access-point-end-of-life": {
        "title": "Access Point End-of-Support Dates: When to Replace",
    },
    "access-points-dropping-off-controller": {
        "title": "Access Points Keep Dropping Off the Controller",
        "desc": "Access points going offline and coming back is usually not a Wi-Fi fault. An ordered diagnostic method for controller-managed estates: power, cabling, PoE.",
    },
    "cisco-access-point-wont-join-controller": {
        "title": "Cisco Access Point Won't Join Controller? Check the Date",
        "desc": "A Cisco access point that worked yesterday and refuses today is often a ten-year certificate expiring, not a hardware failure. How to prove it and fix it.",
    },

    # ---- Victron / dashboards
    "customise-victron-vrm-dashboard": {
        "desc": "The stock VRM main dashboard layout is fixed. Exactly what you can and cannot customise, the Advanced tab limits, and two real routes to a custom screen.",
    },
    "victron-vrm-api-dashboard": {
        "desc": "A worked example of building a custom dashboard on the Victron VRM API: the endpoints that matter, polling versus MQTT, hosting, and the real upkeep.",
    },
    "cerbo-gx-mqtt-dashboard": {
        "desc": "How to turn a Cerbo GX MQTT feed into an always-on dashboard: local Venus OS broker versus the VRM cloud broker, keepalive, TLS, and why REST falls short.",
    },
    "victron-vrm-tv-kiosk-display": {
        "desc": "Put live Victron VRM data on a wall TV, showroom screen or kiosk. The honest DIY Raspberry Pi route and its limits, plus our built and hosted alternative.",
    },
    "victron-gps-tracking": {
        "title": "Victron GPS Tracking: VRM Maps, Geofence &amp; Routes",
        "desc": "Victron GPS tracking explained: three ways to add GPS to a GX device, VRM's free fleet map and geofence, honest update rates, and custom route dashboards.",
    },
    "embed-victron-vrm-on-website": {
        "desc": "How to embed a Victron VRM dashboard on your website with the built-in share iframe, its real limits, and a live custom alternative you can click through.",
    },
    "lithium-battery-installs-dorset": {
        "desc": "Lithium LiFePO4 battery and power upgrades for motorhomes, campervans and boats across Dorset. Victron battery banks, solar and DC-DC charging, installed.",
    },
    "unitree-robots": {
        "desc": "As a Scan partner, 365 Techies supplies, sets up and supports the full Unitree range: agile quadruped robot dogs (Go2, B2, A2) and humanoid robots.",
    },

    # ---- SimplyBook engineering write-ups
    "simplybook-custom-booking-page": {
        "desc": "How to replace the SimplyBook.me widget with your own booking page: the server-side proxy pattern that keeps credentials private, and the API calls needed.",
    },
    "simplybook-custom-email-notifications": {
        "desc": "How to replace SimplyBook.me customer emails with your own: why templates are admin-only, the safe parallel-run switch-off order, and the sender bug.",
    },
    "simplybook-callback-url-not-working": {
        "title": "SimplyBook Callback URL Not Working? The Real Setup",
        "desc": "SimplyBook.me callback URL not working? What it actually POSTs, how to authenticate an unsigned webhook, and why the field silently empties itself.",
    },
    "simplybook-integration-traps": {
        "title": "Six SimplyBook Traps That Bite You in Production",
        "desc": "Six SimplyBook.me integration traps found on a live system: recurring services booking a whole series, iCal files with no timezone, empty callback URLs.",
    },

    # ---- web
    "web-designer-disappeared": {
        "title": "Web Designer Disappeared? How to Get Your Website Back",
        "desc": "Ghosted by your web designer, or has the firm gone bust? A calm, step-by-step UK guide to recovering your domain, hosting, email and website.",
    },
    "website-speed-local-seo": {
        "title": "Does Website Speed Affect Local SEO? The Honest Answer",
        "desc": "Does website speed affect local search rankings? What Google actually says about relevance, distance and prominence, and where speed really matters.",
    },

    # ---- courses / older beginners
    "setting-up-a-computer-for-an-older-relative": {
        "title": "Setting Up a Computer or Tablet for an Older Relative",
        "desc": "How to set up a computer or tablet for an older relative: choosing a simple device, making it easy to see and use, and keeping it safe from scams.",
    },
    "smart-tv-streaming-setup-help": {
        "title": "Smart TV &amp; Streaming Setup Help for the Elderly",
    },
    "ai-for-beginners-course": {
        "desc": "Learn what AI chatbots like ChatGPT really are, what they do brilliantly, and what never to tell them. Free, senior-paced lessons with printable notes.",
    },
    "nhs-app-course": {
        "title": "The NHS App, Gently: A Free Course for Beginners",
    },
    "online-shopping-safely-course": {
        "title": "Free Online Shopping Safety Course for Over-60s",
    },

    # ================================================================
    # STRIKING DISTANCE: position 11-20 with real impressions. Same fix,
    # applied before these pages arrive on page one rather than after -
    # 27 pages carrying 1,074 impressions and 4 clicks between them.
    # ================================================================
    "malwarebytes-premium": {
        "title": "Malwarebytes Premium with VPN | Official Partner",
        "desc": "365 Techies is a Malwarebytes Partner. We set up and manage Malwarebytes Premium with VPN for homes and businesses across Dorset, and support it after.",
    },
    "new-outlook-wont-open": {
        "desc": "New Outlook will not open on Windows 11 and nothing happens when you click it? Rename the Olk and OneAuth cache folders. The safe fix, step by step.",
    },
    "outlook-search-not-returning-all-results": {
        "desc": "Classic Outlook search missing results or capped at 250? Set the scope to All Mailboxes, finish indexing, untick the results limit, include deleted items.",
    },
    "cloud-hosted-desktops": {
        "title": "Cloud &amp; Hosted Desktops Dorset | Work Anywhere",
        "desc": "Cloud and hosted desktops for small businesses across Bournemouth, Poole and Dorset. Windows 365 and Azure Virtual Desktop, set up and managed for you.",
    },
    "cybersecurity-support": {
        "title": "Cyber Security for Businesses | Bournemouth &amp; Dorset",
        "desc": "Cyber security services for businesses and homes across Bournemouth, Poole and Dorset. Protection from ransomware, phishing, scams and malware, with MFA.",
    },
    "how-to-go-back-to-classic-outlook": {
        "desc": "Want to go back to classic Outlook from new Outlook? Turn off the toggle in the top-right corner. If it is missing, use the Help tab or the Start menu.",
    },
    "outlook-cant-add-account-new-outlook": {
        "desc": "New Outlook will not add your Gmail, Yahoo or IMAP account? The plain-English fix: enable IMAP, use an app password, and check your work policies.",
    },
    "i-think-ive-been-hacked": {
        "title": "I Think I've Been Hacked: How To Take Back Control",
        "desc": "Think you have been hacked? A calm, step-by-step recovery guide: secure your email first, reset key passwords, revoke unknown sign-ins, then scan.",
    },
    "dell-docking-station-not-working": {
        "title": "Dell Docking Station Not Working? WD19 &amp; WD22 Fixes",
        "desc": "Dell WD19 or WD22 dock not working? Step-by-step fixes for no power, a laptop that will not charge, and monitors not detected. Most faults are fixable.",
    },
    "email-security-checker": {
        "title": "Can Someone Spoof My Email? Free Domain Check",
        "desc": "Free check: can a scammer send email that looks like it's from you? Test your domain's SPF, DKIM and DMARC in seconds, with plain-English fixes.",
    },
    "outlook-modern-authentication-not-working": {
        "desc": "Classic Outlook keeps asking for a password because basic authentication has been retired. Update Office for OAuth 2.0 and clear cached credentials.",
    },
    "website-hacked-what-to-do": {
        "title": "Website Hacked? A Calm First-Hour Checklist (UK)",
        "desc": "Website hacked? A calm first-hour checklist for UK small businesses: take it offline, change every password, assess your ICO duty, then decide honestly.",
    },
    "365-ai-os": {
        "desc": "The 365 AI OS is a real, browser-based desktop with a built-in agentic AI assistant. Sign in to your own profile, take notes, and let the AI do the work.",
    },
    "outlook-needs-to-repair-your-profile": {
        "desc": "Outlook needs to repair your profile, or the information store could not be opened? The reliable fix is a clean new mail profile. How to do it safely.",
    },
    "outlook-running-slow": {
        "desc": "Classic Outlook slow to open, laggy or hogging memory? The real fix: trim add-ins, shrink the OST, empty bulky folders, then repair Office. In order.",
    },
    "broadband-down": {
        "desc": "A calm, ordered checklist for when your business broadband goes down. How to tell whether it is your kit or the line, and what to say when you report it.",
    },
    "slow-wordpress-site-fix-or-rebuild": {
        "title": "Slow WordPress Site: Fix or Rebuild? An Honest Guide",
        "desc": "Slow WordPress site even with caching? A 20-minute triage, the cheap fixes that genuinely work, and an honest test for when a rebuild beats a plugin.",
    },
    "it-support-for-digital-nomads": {
        "desc": "Work from anywhere, supported from everywhere. Reliable remote IT support for digital nomads and location-independent workers, on UK time or yours.",
    },
    "heatwave-tech-guide": {
        "desc": "The friendly heatwave survival guide for your tech. How hot is too hot, keeping laptops, phones, PCs, routers and servers safe, and the warning signs.",
    },
    "emergency-internet": {
        "desc": "Broadband down? We bring fast internet to you, delivered from our solar-powered off-grid van, over WiFi or wired straight into your business network.",
    },
    "it-support-uk-europe": {
        "title": "IT Support Across the UK &amp; Europe | Remote Help",
        "desc": "Remote IT support across the whole of the UK and Europe. Fast, secure online help and fully managed monthly plans for homes, remote teams and businesses.",
    },
    "website-held-hostage": {
        "title": "Website Held Hostage by Your Web Designer? What To Do",
    },
    "it-support-for-churches-faith": {
        "desc": "Friendly, affordable IT support for churches, faith groups and community organisations across Dorset. Keeping your AV, livestreaming and member data safe.",
    },
    "refer-a-friend": {
        "title": "Refer a Friend: Their First Service Free, a Month Free",
        "desc": "Refer a friend to 365 Techies. Their first Computer Service and Health Check is free, and you get a month free on your own support plan. No limit.",
    },
    "outlook-can-send-but-not-receive": {
        "desc": "Outlook can send but not receive email? That is the incoming side or a filter. Check the incoming server and port, Work Offline, Junk, Focused and rules.",
    },
    "lost-or-stolen-laptop-what-to-do": {
        "title": "Lost or Stolen Laptop? Do These Things Now (UK Guide)",
        "desc": "Lost or stolen laptop? Step-by-step UK help: lock it with Find my device, change your key passwords, and report it to the police for a crime reference.",
    },
    "simplybook-integration": {
        "title": "Custom SimplyBook.me Integration: Your Booking, Your Brand",
    },

    # ================================================================
    # COMMERCIAL PAGES. Found by the build-time snippet guard, not by GSC -
    # these earn fewer impressions than the pages above but they are the ones
    # that convert, so a snippet that stops mid-sentence costs a customer
    # rather than a pageview. Prices here are the real published per-PC
    # GoCardless figures only: home 18.25, business from 24.38, MS365 4.85.
    # Never a rounded guess, never VAT-inclusive - the firm is not VAT
    # registered. See the pricing-truth note before touching a number.
    # ================================================================
    "alienware-dell-g-series-repair-bournemouth": {
        "title": "Alienware &amp; Dell G-Series Repair, Free Dorset Collection",
        "desc": "Alienware and Dell G15/G16 repair with free collection across Bournemouth, Poole and Dorset. Overheating, screens, batteries and upgrades, done honestly.",
    },
    "backup-support": {
        "desc": "Automatic, verified backup and rapid data recovery for homes and businesses across Dorset. Photos, documents, whole computers and Microsoft 365 protected.",
    },
    "book-a-collection": {
        "desc": "Book a computer or laptop collection with 365 Techies in Bournemouth, Poole and Dorset. We collect, diagnose, repair and return it. Collection is free.",
    },
    "break-fix-vs-monthly-vs-in-house-it-support": {
        "desc": "Pay per problem, take a monthly plan, or hire someone in-house? A plain-English comparison of the three ways to get IT support, and who each one suits.",
    },
    "business-broadband-connectivity": {
        "desc": "Business broadband and connectivity across Bournemouth, Poole and Dorset. Full-fibre, leased lines and automatic failover, arranged, set up and managed.",
    },
    "business-continuity-internet": {
        "desc": "Build a written broadband emergency procedure before you need it: impact analysis, objective trigger points, named roles and an escalation ladder.",
    },
    "business-email-compromise": {
        "title": "Business Email Compromise: What It Is, How to Stay Safe",
        "desc": "What is business email compromise? A plain-English guide for small businesses: how invoice and CEO-fraud scams work, and the warning signs to teach staff.",
    },
    "business-hacked-emergency-help": {
        "desc": "Hacked, hit by ransomware or had money diverted? 365 Techies give Dorset businesses same-day emergency help to contain it, recover, and close the hole.",
    },
    "business-it-support-plans": {
        "desc": "Monthly business IT support plans from £24.38 per computer. Microsoft 365 management, cyber security, backups, onboarding, and remote or on-site support.",
    },
    "business-wifi-installation": {
        "desc": "What business WiFi installation actually costs in Dorset, and what a proper job includes: VLANs, fast roaming, captive portals, licence traps and PoE.",
    },
    "choosing-it-support": {
        "desc": "A free buyer's guide: 10 questions to ask before choosing an IT support company in Dorset, covering contracts, response times and who helps you.",
    },
    "dell-monitor-dock-support-dorset": {
        "title": "Dell Monitor &amp; Docking Station Support, Dorset",
        "desc": "Dell monitor showing no signal, or a dock not detecting your screens? Honest diagnosis, multi-monitor and dock setup across Bournemouth and Poole.",
    },
    "dell-xps-repair-bournemouth": {
        "title": "Dell XPS Repair in Bournemouth, Poole &amp; Dorset",
        "desc": "Independent Dell XPS repair across Bournemouth, Poole and Dorset. Swollen batteries, overheating, coil whine, screens and SSD upgrades, priced honestly.",
    },
    "disaster-recovery": {
        "desc": "Disaster recovery and business continuity from 365 Techies: verified backups, ransomware rollback, rapid recovery, cloud failover and a written plan.",
    },
    "downtime-cost-calculator": {
        "desc": "What could IT downtime be costing your business? Answer four quick questions for a friendly estimate based on your own numbers, not an industry average.",
    },
    "email-support": {
        "desc": "Outlook, Microsoft 365 and business email help. Fix email that will not send or receive, sort passwords, set up new accounts and stop the spam.",
    },
    "event-wifi-dorset": {
        "desc": "Internet for events, live streams and content production anywhere in Dorset, delivered from a solar-powered off-grid van that needs no mains power.",
    },
    "family-it-support": {
        "desc": "Monthly support for households with several computers, tablets, printers and email accounts. One friendly plan that keeps the whole family working.",
    },
    "google-workspace-support": {
        "desc": "Setup, migration and support for Google Workspace. Gmail, Drive, Docs and Meet set up properly, secured and working smoothly for your home or business.",
    },
    "home-network-setup": {
        "desc": "Home network setup in Bournemouth, Poole, Christchurch and Dorset. We configure your router, connect every device and secure the lot, on site or remotely.",
    },
    "how-much-does-it-support-cost-uk-2026": {
        "desc": "A clear, honest guide to what IT support costs in the UK in 2026: typical ranges for homes and businesses, what drives the price, and what to check.",
    },
    "independent-it-support": {
        "desc": "An honest comparison of local independent IT support against big-box repair desks and DIY remote tools: who actually helps you, speed, and repair honesty.",
    },
    "it-cost-worksheet": {
        "desc": "A free, print-friendly worksheet: the five numbers to work out before asking any IT company for a quote, covering devices, users and what you rely on.",
    },
    "it-services-bournemouth": {
        "desc": "Managed business IT services in Bournemouth. Fully managed support, Microsoft 365, cyber security, servers and connectivity from £24.38 per computer.",
    },
    "it-services-poole": {
        "desc": "Managed business IT services in Poole. Fully managed support, Microsoft 365, cyber security, servers and connectivity from £24.38 per computer a month.",
    },
    "mesh-wifi-setup-guide": {
        "title": "Mesh WiFi Setup Guide UK: Step by Step, ISP by ISP",
        "desc": "How to set up mesh WiFi properly in a UK home: router placement, AP versus bridge mode on BT, Sky and Virgin, wired backhaul, and choosing channels.",
    },
    "mesh-wifi-systems-uk": {
        "title": "Mesh WiFi UK: Honest Buying Guide &amp; Comparison",
        "desc": "Which mesh WiFi system actually suits a UK home? Real models with dated UK prices, honest coverage figures, and ISP mesh compared with buying your own.",
    },
    "new-computer-setup": {
        "desc": "We set up your new computer or laptop properly: files, email and settings transferred, software installed, and security and backups in place from day one.",
    },
    "password-manager-setup": {
        "desc": "Password manager setup for homes and small businesses across Bournemouth, Poole and Dorset. We install the vault, import your logins and show you how.",
    },
    "pay": {
        "desc": "Paying 365 Techies is simple and safe. The price is always agreed before work starts, and you never need an account or an app to settle up.",
    },
    "pricing": {
        "desc": "Transparent monthly IT support: homes £18.25 per computer, business from £24.38 per computer, Microsoft 365 £4.85 per user. No call-out fee, ever.",
    },
    "pstn-switch-off-business": {
        "title": "PSTN Switch-Off: The Business Lines That Aren't Phones",
        "desc": "The UK analogue phone network switches off on 31 January 2027. The lines that catch businesses out are lifts, fire panels, alarms and card machines.",
    },
    "quick-quote": {
        "desc": "Get a free, no-obligation IT support quote in under a minute. Tell us about your home or business setup and we will reply with real numbers.",
    },
    "quickbooks-sage-running-slow": {
        "desc": "QuickBooks or Sage 50 running slow, freezing or dropping over your office network? We diagnose and fix the real cause for Dorset businesses, same day.",
    },
    "ransomware-recovery": {
        "desc": "Ransomware recovery for homes and small businesses across Bournemouth, Poole and Dorset. Do not pay the ransom. We contain it, then restore from backup.",
    },
    "remote-it-support": {
        "desc": "Fast, secure remote IT support for homes and businesses anywhere in the UK. Most computer problems fixed online in minutes, with no waiting for a visit.",
    },
    "rural-and-farm-wifi-dorset": {
        "desc": "Wi-Fi and internet for farms, glamping sites, holiday lets and rural businesses across Dorset. Site surveys, long-range outdoor Wi-Fi, Starlink and 4G/5G.",
    },
    "security-awareness-training": {
        "desc": "Friendly security awareness training, phishing simulation and dark-web monitoring for small businesses in Bournemouth, Poole and Dorset. Staff, not slides.",
    },
    "server-down-emergency-support": {
        "desc": "Business server down, crashed or will not boot in Dorset? We get local businesses back up the same day: remote triage first, then on site.",
    },
    "service-level-agreement": {
        "desc": "The 365 Techies Service Level Agreement: support hours, priority levels, target response and resolution times, availability and how escalation works.",
    },
    "services": {
        "desc": "Everything 365 Techies provides: monthly IT support for homes and businesses, Microsoft 365, cyber security, computer repairs and off-grid Victron energy.",
    },
    "simplybook-addclient-value-is-required-error": {
        "title": "SimplyBook addClient: Value Is Required Error, Solved",
        "desc": "SimplyBook.me addClient failing with Value is required and cannot be empty? The -32070 error payload names the missing custom client field. How to read it.",
    },
    "slow-computer-repair": {
        "desc": "Slow computer repair in Bournemouth, Poole and Dorset. We diagnose why your PC or laptop is slow and fix it: SSD upgrades, malware, startup bloat.",
    },
    "small-business-it-support": {
        "desc": "Monthly IT support for small businesses that need professional help without employing anyone in-house. Microsoft 365, security, backups and staff support.",
    },
    "static-site-vs-wordpress-small-business": {
        "title": "Static Site vs WordPress for Small Business",
        "desc": "Static site or WordPress for your small business? An honest comparison from a Dorset firm that ran WordPress for years, then rebuilt its own site static.",
    },
    "victron-installer-dorset": {
        "desc": "Victron installer covering Dorset. Design, supply, installation and remote monitoring of off-grid and backup power for homes, businesses, vans and boats.",
    },
    "voip-business-phones": {
        "desc": "Modern business phone systems powered by Voipfone. Clear UK calls over the internet, lower bills, work-from-anywhere numbers and smart call handling.",
    },
    "website-maintenance-cost-uk": {
        "title": "Website Maintenance Cost UK 2026: What Should You Pay?",
        "desc": "What should website maintenance actually cost in the UK? Verified 2026 market rates, what a legitimate plan includes, and the red flags to walk away from.",
    },
    "why-monthly-it-support-beats-per-repair": {
        "desc": "Paying per repair feels cheaper, until something breaks at the worst possible moment. Why a monthly IT support plan usually works out better value.",
    },
    "wifi-signal-test": {
        "title": "WiFi Signal Test: Room-by-Room Survey &amp; Best Spot",
        "desc": "Free room-by-room WiFi survey for homes, businesses and life on the move. A live signal game, a real speed test in every room, and star-rated results.",
    },
    "wifi-troubleshooting": {
        "desc": "Symptom-by-symptom WiFi troubleshooting for UK homes and small offices: slow WiFi, drop-outs at the same time daily, and WiFi calling that fails.",
    },
    "windows-11-support": {
        "desc": "Help with Windows 11 upgrades, compatibility checks, updates, slow performance and new PC setup, for homes and businesses across Bournemouth and Poole.",
    },
    "windows-11-upgrade-service": {
        "desc": "Fixed-price Windows 11 upgrade and installation in Poole, Bournemouth and Dorset. Free TPM 2.0 compatibility check, full backup, then the upgrade itself.",
    },
    "windows-reinstall": {
        "title": "Windows Reinstall &amp; Refresh in Bournemouth &amp; Dorset",
        "desc": "Clean Windows reinstall and refresh in Bournemouth, Poole and Dorset. We back up your files, wipe and rebuild Windows, then reinstall your apps.",
    },
    "your-first-6-weekly-service": {
        "desc": "A step-by-step walkthrough of what your first 6-weekly computer service actually feels like, from the friendly call beforehand to the report afterwards.",
    },

    # ================================================================
    # TITLE-ONLY: every remaining page whose <title> exceeded 60 characters,
    # so Google was cutting it off mid-phrase. Most were only a few characters
    # over and the fix is dropping "| 365 Techies" - Google appends the site
    # name itself, so those 13 characters were buying nothing and costing the
    # end of the headline.
    # ================================================================
    "dell-inspiron-repair-bournemouth": {
        "title": "Dell Inspiron Repair &amp; Upgrades, Bournemouth &amp; Dorset",
    },
    "dell-vostro-repair-support-dorset": {
        "title": "Dell Vostro Repair &amp; Small Business Support, Dorset",
    },
    "dell-killer-wifi-problems": {
        "title": "Dell Wi-Fi Keeps Dropping? Killer AX1650 Problems Fixed",
    },
    "firewall-licence-expired-what-happens": {
        "title": "What Happens When Your Firewall Licence Expires, By Vendor",
        # Title-only entry left the description still being amputated by
        # _meta_desc at position 6.2. An override must set BOTH keys to fix a cut.
        "desc": "SonicWall, Fortinet, WatchGuard, Sophos and Cisco Meraki behave differently when a firewall licence lapses. What stops, what keeps working, by vendor.",
    },
    "stop-using-onedrive-without-losing-files": {
        "title": "How to Stop Using OneDrive Without Losing Files",
    },
    "how-we-rebuilt-our-website": {
        "title": "WordPress to Static Site: How We Rebuilt Our Website",
    },
    "websites-for-builders-tradesmen": {
        "title": "Websites for Builders &amp; Trades in Bournemouth &amp; Dorset",
    },
    "business-wifi-health-check-dorset": {
        "title": "Business Wi-Fi Health Check, Bournemouth &amp; Dorset",
    },
    "onedrive-full-cant-send-email": {
        "title": "OneDrive Full and Can't Send Email? The Fix, Step by Step",
    },
    "office-moves-it-relocation": {
        "title": "Office Moves &amp; IT Relocation Dorset | Minimal Downtime",
    },
    "off-grid-internet": {
        "title": "Off-Grid Internet UK: No Power, No Signal, No Problem",
        "desc": "Internet where there is no mains power and no mobile signal, delivered from a genuinely off-grid solar and lithium powered van. Plus what it cannot do.",
    },
    "how-we-price": {
        "title": "How We Price IT Support (and Why Cheapest Isn't Best)",
    },
    "business-it-consultancy": {
        "title": "Business IT Consultancy &amp; Virtual IT Manager, Dorset",
    },
    "lost-or-stolen-phone-what-to-do": {
        "title": "Lost or Stolen Phone? Do These Things Now (UK Guide)",
    },
    "it-jargon-buster/megabytes-and-gigabytes": {
        "title": "Megabytes and Gigabytes Explained in Plain English",
    },
    "starlink-internet": {
        "title": "Starlink Satellite Internet: Residential &amp; Roaming",
        "desc": "Fast internet anywhere, including rural not-spots. We help you pick the right Starlink plan for how you actually use it, install the dish and support it.",
    },
    "ruckus-access-point-end-of-life": {
        "title": "RUCKUS Access Point End-of-Life Dates: R310 to R770",
    },
    "windows-10-end-of-life": {
        "title": "Windows 10 End of Life (Oct 2025): What to Do Next",
    },
    "remote-access": {
        "title": "Remote Access: Work From Anywhere on Your Own PC",
        "desc": "We set home and business users up to securely reach their own laptop or PC from anywhere with Splashtop Business. Fully encrypted and genuinely fast.",
    },
    "outgrown-wix-squarespace": {
        "title": "Outgrown Wix or Squarespace? An Honest Checklist",
        "desc": "Have you outgrown Wix or Squarespace? An honest checklist from a family-run Dorset firm, including when staying put is the right call after all.",
    },
    "dell-optiplex-guide": {
        "title": "Dell OptiPlex Guide: Ports, Monitors, UPS &amp; Care",
    },
    "threadripper-workstations": {
        "title": "AMD Threadripper Workstations | Scan 3XS Partner",
        "desc": "As a Scan partner, 365 Techies supplies and supports high-end AMD Threadripper and Threadripper PRO workstations, custom-built by Scan's 3XS division.",
    },
    "refurbished-vs-new-laptop": {
        "title": "Refurbished vs New Laptop: Which Should You Buy?",
    },
    "outlook-indexing-stuck": {
        "title": "Outlook Indexing Stuck or Freezes When Searching",
    },
    "microsoft-word-wont-open": {
        "title": "Microsoft Word Won't Open? The 5-Step Fix Ladder",
    },
    "malware-and-viruses": {
        "title": "Malware &amp; Viruses: What They Are, How to Stay Safe",
    },
    "it-support-for-opticians": {
        "title": "IT Support for Opticians in Bournemouth &amp; Dorset",
    },
    "hard-drive-upgrade": {
        "title": "SSD &amp; Hard Drive Upgrade in Bournemouth &amp; Dorset",
    },
    "agentic-ai-systems": {
        "title": "Agentic AI Systems &amp; AI Automation Agency, Dorset",
    },
    "wifi-controller-end-of-life": {
        "title": "Wi-Fi Controller End of Life: The Real Deadline",
    },
    "outlook-data-file-cannot-be-accessed": {
        "title": "Outlook Data File Cannot Be Accessed: 0x8004010f",
    },
    "it-jargon-buster/operating-system": {
        "title": "Operating System Explained in Plain English",
    },
    "how-to-free-up-storage-space": {
        "title": "How to Free Up Storage Space on a Full Computer",
    },
    "dell-it-support-dorset": {
        "title": "Dell Support &amp; Repair, Dorset (Home &amp; Business)",
    },
    "areas-covered": {
        "title": "Areas Covered: IT Support Across Bournemouth &amp; Dorset",
        "desc": "Remote and on-site IT support across Bournemouth, Poole, Christchurch, Wimborne, Ferndown and the rest of Dorset, for homes and businesses alike.",
    },

    # ================================================================
    # LAST PASS: the highest-impression pages still carrying a cut description.
    # Most sit at position 20-85, so a better snippet earns little until they
    # rank - but /about/ alone had 1,077 impressions, and leaving the hub and
    # nav pages broken would be an odd place to stop.
    # ================================================================
    "about": {
        "desc": "365 Techies is a family-run Bournemouth IT support company established in 1995. Dell specialists, Microsoft partners, and the same two faces every visit.",
    },
    "computer-spec-checker": {
        "desc": "Free PC hardware checker. See what is inside your computer instantly: operating system, graphics card, cores, screen, memory and battery, read live.",
    },
    "outlook-wont-open-in-safe-mode": {
        "desc": "If classic Outlook will not open even in safe mode, the fault is past add-ins. Run Office Quick then Online Repair, make a new profile, then scanpst.",
    },
    "home-cinema-entertainment": {
        "desc": "As a Richer Sounds Bournemouth partner, 365 Techies supplies, installs and supports home entertainment systems: 4K projectors and Dolby surround sound.",
    },
    "meet-the-team": {
        "desc": "Meet the team behind 365 Techies, a family-run IT support business in Bournemouth looking after Dorset homes and businesses with patience since 1995.",
    },
    "free-pc-health-check": {
        "desc": "365 PC Manager is a free, honest PC health check for Windows 10 and 11 from a Dorset family firm. A health score and one-tap boost, with no fake errors.",
    },
    "it-support-for-home-workers": {
        "desc": "Reliable IT support for people working from home. Email, Microsoft 365, Teams, printers, Wi-Fi, security and backups, all kept working so you can stay put.",
    },
    "it-support-by-industry": {
        "desc": "Specialist IT support by industry across Bournemouth, Poole and Dorset: accountants, financial advisers, solicitors, dental, care homes and manufacturers.",
    },
    "outlook-stuck-on-loading-profile": {
        "desc": "Classic Outlook frozen on the Loading Profile splash screen? End the Office tasks, start in safe mode, disable add-ins, then run a Quick Repair.",
    },
    "outlook-signature-not-showing": {
        "desc": "Outlook signature not showing on new emails or replies? The fix for classic Outlook and for new Outlook on the web: set it as default for both, in HTML.",
    },
    "it-support-for-manufacturing": {
        "desc": "IT support for manufacturers, engineering firms and workshops across Dorset. Keeping design software, stock and order systems, and the shop floor running.",
    },
    "it-jargon-buster": {
        "title": "IT Jargon Buster: A Plain-English A-Z IT Glossary",
        "desc": "A plain-English A-Z IT glossary: clear, simple explanations of the terms that get used at you, from the cloud and VPN to ransomware, MFA and phishing.",
    },
    "off-grid-victron-energy": {
        "desc": "Off-grid and backup power built on Victron Energy. Design, supply, installation and remote monitoring of solar, battery storage and inverters.",
    },
    "accreditations": {
        "desc": "365 Techies accreditations and partners: Microsoft Partner and Office Specialists, Dell specialists, Malwarebytes Partner and Sustainable Dorset member.",
    },
    "cctv-smart-home": {
        "desc": "Smart security and smart living. CCTV cameras, video doorbells, smart lighting, heating and home automation, set up properly and secured against hackers.",
    },
    "it-support-for-charities-dorset": {
        "desc": "Affordable, caring IT support for charities and nonprofits in Dorset. Free and discounted Microsoft 365 nonprofit licences, plus Cyber Essentials help.",
    },
    "free-tools": {
        "title": "Free IT Tools, No Download: Run in Your Browser",
        "desc": "Free IT tools that run entirely in your browser. No download, no sign-up, nothing installed. Check your website, test broadband, and check a password.",
    },

    # ---- last ten at position 1-20. These sat under the >=10-impression filter
    # used to build the striking-distance list, so they were missed first time.
    "victron-system-builder": {
        "desc": "Free Victron system builder. Four questions gives you the complete build: lithium battery, solar, MPPT, inverter and monitoring, plus the exact cables.",
    },
    "onedrive-files-disappeared": {
        "desc": "OneDrive files or documents vanished on Windows 11? Do not panic, they are usually recoverable. Real, safe recovery steps plus same-day remote help.",
    },
    "it-support-for-retired-users": {
        "desc": "Friendly, patient computer help for retired users. Unhurried support with laptops, email, printers, online accounts, photos, video calls and scam checks.",
    },
    "cisco-aironet-end-of-life": {
        "desc": "End-of-sale, end-of-software-maintenance and last-date-of-support dates for Cisco Aironet access points, from Cisco's own bulletins, and what each means.",
    },
    "case-study-colin-clark-builders": {
        "desc": "Over 15 years looking after Colin Clark Builders: laptop repairs, Dell Latitude business laptops, website and email hosting, and a full site rebuild.",
    },
    "outlook-not-responding": {
        "desc": "Outlook showing Not Responding, frozen or hanging? The safe, ordered fix: safe mode, add-ins, repair Office, then trim the data file down.",
    },

    # ---- local town pages, 1 Aug 2026. These four shared one boilerplate
    # description ("...no call-out fee, the same two faces every visit, and rated
    # 4.9 on Google") across every town, so the SERP showed the same sentence for
    # Blandford, Christchurch and the New Forest. Identical text gives a searcher
    # no reason to prefer the result that actually covers their town. Each now
    # names the villages that town page genuinely serves, taken from the lede and
    # intro in build_local.py (LOCAL) and build_pages.py (REPAIR_TOWNS) - no new
    # claims, just the ones already on the page surfaced into the snippet.
    "it-support-blandford-forum": {
        "title": "IT Support Blandford Forum | North Dorset, No Call-Out Fee",
        "desc": "IT support across Blandford Forum, Pimperne, Bryanston and the Blackmore Vale. No call-out fee, the same two faces every visit, rated 4.9 on Google.",
    },
    "it-support-christchurch": {
        "title": "IT Support Christchurch and Highcliffe | No Call-Out Fee",
        "desc": "IT support from the Quay out to Mudeford and Highcliffe. No call-out fee, remote help in minutes, on-site when you need it, rated 4.9 on Google.",
    },
    # The one genuine differentiator in the set: the New Forest page already
    # offers Starlink for rural not-spots, which no rival locally does. Leading
    # with it earns the click that "IT support, same as everywhere" does not.
    "it-support-new-forest": {
        "title": "IT Support New Forest | Starlink for Rural Not-Spots",
        "desc": "IT support from Lyndhurst and Brockenhurst to Lymington, New Milton and Ringwood, plus Starlink satellite internet where forest broadband is slow.",
    },
    "computer-repair-wimborne": {
        "desc": "Broken or slow computer in Wimborne, Colehill or Corfe Mullen? Free collection, 12-month warranty, and no fix means no fee. Family-run since 1995.",
    },

    # NB the two remaining amputated descriptions that still sit at a clickable
    # position - firewall-licence (6.2) and starlink (20.5) - are fixed at their
    # EXISTING entries above, not repeated here; a second entry for the same slug
    # silently discards the first. tools_check_snippets.py --gsc finds 101 cut
    # descriptions in total, but the other 99 rank between position 26 and 88,
    # where the snippet is not what costs the click. Those are left alone on
    # purpose - rewriting a snippet for a page nobody sees is churn, not traffic.
}


def check():
    """Self-test: every entry must be within the limits it exists to enforce.

    Titles are measured AFTER entity decoding, because "&amp;" is five
    characters in the source and one in the search result - counting the
    source would reject perfectly good titles.

    Also re-reads this file to catch duplicate slugs. A Python dict literal
    keeps only the last of a repeated key, so a second entry for a slug
    silently discards the first one's description. That happened once.
    """
    import io as _io
    import os as _os
    import re as _re
    from collections import Counter as _Counter
    bad = []
    try:
        _src = _io.open(_os.path.join(_os.path.dirname(_os.path.abspath(__file__)),
                                      "snippets_data.py"), encoding="utf-8").read()
        _keys = _re.findall(r'^    "([^"]+)": \{', _src, _re.M)
        for _k, _n in _Counter(_keys).items():
            if _n > 1:
                bad.append("%s: duplicate key (%d times) - the earlier entry is lost" % (_k, _n))
    except OSError:
        pass
    for slug, s in SNIPPETS.items():
        t, d = s.get("title"), s.get("desc")
        if t is not None and len(_unescape(t)) > 60:
            bad.append("%s: title %d chars" % (slug, len(_unescape(t))))
        if d is not None:
            if len(d) > 155:
                bad.append("%s: desc %d chars" % (slug, len(d)))
            if "&" in d or "’" in d or "—" in d:
                bad.append("%s: desc has an entity or smart character" % slug)
            if not d.rstrip().endswith((".", "?", "!")):
                bad.append("%s: desc does not end a sentence" % slug)
    return bad


if __name__ == "__main__":
    problems = check()
    print("SNIPPETS: %d entries" % len(SNIPPETS))
    if problems:
        print("FAILED %d:" % len(problems))
        for p in problems:
            print("  " + p)
    else:
        print("all entries within limits")
