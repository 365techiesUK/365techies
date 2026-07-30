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

# slug -> {"title": ..., "desc": ...}  (either key optional)
SNIPPETS = {

    # ---- top of the funnel: Dell buying advice (the biggest impression block)
    "are-dell-latitude-laptops-good": {
        "title": "Are Dell Latitude Laptops Good? An Honest 2026 Verdict",
        "desc": "Yes, with caveats. A 30-year Dell specialist on build quality, real lifespan, and why a refurbished Latitude beats a new budget laptop every time.",
    },
    "dell-latitude-series-explained-3000-5000-7000": {
        "desc": "3000 for everyday work, 5000 for mainstream business, 7000 for premium ultralight. What you gain at each tier, and where the extra money is wasted.",
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
        "desc": "Free email security checker. Enter your domain to see whether SPF, DKIM and DMARC are protecting your business email from spoofing and impersonation.",
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
}


def check():
    """Self-test: every entry must be within the limits it exists to enforce."""
    bad = []
    for slug, s in SNIPPETS.items():
        t, d = s.get("title"), s.get("desc")
        if t is not None and len(t) > 60:
            bad.append("%s: title %d chars" % (slug, len(t)))
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
