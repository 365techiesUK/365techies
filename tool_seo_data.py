# -*- coding: utf-8 -*-
# Central SEO/AI enhancement data for the free-tool pages, consumed by build_pages.add().
# TOOL_TITLES[slug] overrides a page title. TOOL_SEO[slug] appends a visible answer-first
# 'how it works' block and injects HowTo / extra-FAQ / WebApplication JSON-LD.
# Keys per TOOL_SEO entry: meta, answer, howto={name,steps:[(name,text)]}, faqs:[(q,a)],
# keyfacts (static HTML), webapp (bool). Generated from the SERP-verified free-tools audit.

TOOL_TITLES = {'ai-roi-calculator': 'AI Automation ROI Calculator | 365 Techies',
 'broadband-checker': 'Switching Broadband in Dorset? Free Checker | 365 Techies',
 'broadband-speed-checker': 'How Much Broadband Speed Do I Need? | 365 Techies',
 'computer-fault-checker': 'Why Is My Laptop Slow & Freezing? Checker | 365 Techies',
 'computer-spec-checker': 'What Are My Computer Specs? Check Online | 365 Techies',
 'cost-calculator': 'IT Support Cost Calculator | 365 Techies',
 'coverage-checker': 'On-Site IT Support Dorset & New Forest | 365 Techies',
 'custom-pc-builder': 'How to Split a PC Build Budget | 365 Techies',
 'dns-lookup': 'Check MX &amp; DNS Records Free Lookup | 365 Techies',
 'domain-expiry-checker': '.co.uk Domain Expiry Checker (Nominet) | 365 Techies',
 'downtime-cost-calculator': 'IT Downtime Cost Calculator UK | 365 Techies',
 'email-security-checker': 'Can Scammers Spoof My Email? Free Check | 365 Techies',
 'email-signature-generator': 'UK Email Signature Generator, Free | 365 Techies',
 'graphics-card-benchmark': 'Online GPU Benchmark (WebGL, No Download) | 365 Techies',
 'is-it-down': 'Is My Broadband Down or Just Me? | 365 Techies',
 'it-health-check-tool': 'Free IT Health Check for Small Business | 365 Techies',
 'link-safety-checker': 'How to Check if a Text Link Is a Scam | 365 Techies',
 'password-breach-checker': 'Is It Safe to Check a Leaked Password? | 365 Techies',
 'password-generator': 'Three Random Words Password Generator | 365 Techies',
 'password-strength-checker': 'Password Strength Checker (Length First) | 365 Techies',
 'pc-benchmark': 'Test My Computer Speed Online, Free | 365 Techies',
 'plan-finder': 'Which IT Support Plan Do I Need? | 365 Techies',
 'qr-code-generator': 'Free QR Code Generator, No Signup or Watermark | 365 Techies',
 'quick-quote': 'Free IT Support Quote, Small Business | 365 Techies',
 'repair-or-replace-advisor': 'Should I Repair or Replace My Computer? | 365 Techies',
 'server-or-cloud-picker': 'Do I Need a Server or the Cloud? | 365 Techies',
 'solar-battery-calculator': 'Campervan Battery &amp; Solar Calculator | 365 Techies',
 'spot-the-scam': 'Spot the Scam Quiz — Free Online Test | 365 Techies',
 'ssl-checker': 'SSL Certificate Expiry Checker Free | 365 Techies',
 'victron-system-builder': 'Victron Cable &amp; Fuse Size Guide (DIY) | 365 Techies',
 'webcam-mic-test': 'Test Webcam & Mic for a Teams Meeting | 365 Techies',
 'website-checker': 'Why Is My Website Slow? Free Test | 365 Techies',
 'what-websites-know': 'What Can a Website See About Me? | 365 Techies',
 'what-would-you-lose': 'Are My Files Safe If My Computer Dies? | 365 Techies',
 'which-microsoft-365-plan': 'MS365 Basic vs Standard vs Premium | 365 Techies',
 'wifi-qr-code-generator': 'Wi-Fi QR Code Generator for Guest Network | 365 Techies'}

TOOL_SEO = {'ai-roi-calculator': {'answer': 'This free ROI calculator estimates what AI automation could save a small business by multiplying your team size, the hours each spends on a repetitive task, their hourly cost and the share an AI agent '
                                 'could take on &mdash; giving you the hours saved per week and the money saved per month and year.',
                       'faqs': [['How do you calculate ROI on AI automation for a small business?',
                                 'This tool works it from your own inputs: hours saved each week = people &times; hours each &times; the share an agent takes on; that is multiplied by 4.33 weeks and the hourly cost for a monthly saving, '
                                 'then by 12 for the yearly figure. It shows the labour saving only &mdash; a real review also weighs the setup and running cost of the automation.'],
                                ['Is an AI automation ROI calculator accurate?',
                                 'It is a guide that shows the scale of the opportunity from the numbers you enter, not a precise forecast. The real return depends on your exact process, how cleanly the task can be automated and the share '
                                 'an agent can safely handle &mdash; which is what our free AI opportunity review works out properly, with no obligation.'],
                                ['Which tasks give the best return when automated with AI?',
                                 'High-volume repetitive work usually pays back fastest &mdash; answering similar enquiries, copying data between systems, chasing invoices, booking appointments and filing documents. Put one of those into '
                                 'the calculator with a realistic automation share to see its potential yearly saving.']],
                       'howto': {'name': 'How to estimate AI automation ROI for a small business',
                                 'steps': [['Set your team size', 'Drag the &lsquo;People doing the task&rsquo; slider to how many staff currently handle the repetitive job (1&ndash;20).'],
                                           ['Add the hours', 'Set &lsquo;Hours each spends on it per week&rsquo; to the time each person loses to that task (1&ndash;40 hours).'],
                                           ['Set the hourly cost', 'Move the &lsquo;Average hourly cost&rsquo; slider to what an hour of that time is worth to the business (&pound;11&ndash;&pound;60).'],
                                           ['Set the automation share', 'Set &lsquo;How much an agent could take on&rsquo; to a realistic percentage the AI would handle (20%&ndash;90%).'],
                                           ['Read the saving', 'The panel shows hours saved per week plus money saved per month and per year; book a free AI opportunity review to confirm a realistic figure for your exact process.']]},
                       'keyfacts': '<p><strong>How this AI ROI calculator works:</strong></p><ul><li><strong>Hours saved / week</strong> = people &times; hours each per week &times; the share an agent takes on '
                                   '(20%&ndash;90%).</li><li><strong>Saved / month</strong> = hours saved per week &times; 4.33 weeks &times; average hourly cost.</li><li><strong>Saved / year</strong> = monthly saving &times; '
                                   '12.</li></ul><p>Input ranges: people 1&ndash;20, hours each per week 1&ndash;40, average hourly cost &pound;11&ndash;&pound;60, automation share 20%&ndash;90%. The result is the labour saving only '
                                   '&mdash; a friendly guide to the opportunity, not a quote.</p>',
                       'webapp': True},
 'broadband-checker': {'answer': 'To get help switching broadband provider in Dorset, enter your postcode and current provider on this page to see which networks genuinely reach your area — the national Openreach ISPs, Virgin Media cable '
                                 "in BCP, full-fibre altnets and rural-focused Wessex Internet — then use the linked official checkers for today's live prices or ask 365 Techies for a free, impartial switch review.",
                       'faqs': [['Can you help me switch broadband provider in Dorset?',
                                 'Yes — 365 Techies is independent, so we run a free, impartial check of which providers genuinely serve your exact Dorset postcode, help you pick the best home or business deal, and then make sure your '
                                 "Wi-Fi, email and devices all keep working through the switch. We don't chase commission or sell broadband ourselves."],
                                ['Does this checker show live broadband prices for my address?',
                                 "No — and honestly. Broadband prices are address-specific and change almost weekly with intro deals that rise mid-contract, so this tool gives you your area's real availability picture and links you "
                                 "straight to the official Ofcom, Openreach, Virgin Media, Wessex Internet and comparison checkers for today's live prices, rather than quoting a figure it can't stand behind."],
                                ['How does switching broadband actually work in Dorset?',
                                 "Under One Touch Switch you contact only your new provider — they arrange the move and cancel your old line for you, so there's no double-billing and minimal downtime. You just enter your postcode here, "
                                 "compare real availability and today's live prices on the linked checkers, then place the order; 365 Techies can handle it end to end and keep your Wi-Fi, email and devices working."]],
                       'howto': {'name': 'How to check and switch your broadband provider in Dorset',
                                 'steps': [['Enter your postcode and provider', 'Type your postcode, pick your current provider and choose home or business, then press Check my area.'],
                                           ['Read the area availability hint',
                                            "The tool tells you what's typically available for your postcode area — most choice in BH (Bournemouth, Christchurch, Poole), Openreach and Wessex Internet across DT, and rural options around SP "
                                            'and BA.'],
                                           ["Check today's live prices",
                                            "Follow the linked official and Ofcom-accredited checkers (Ofcom, Openreach, Virgin Media, Wessex Internet and uSwitch) — prices are address-specific and change weekly, so the tool doesn't quote "
                                            'figures itself.'],
                                           ['Book a free impartial review', 'Or let 365 Techies run an independent check of what serves your exact postcode and find the best home or business deal for you.'],
                                           ['Switch with One Touch Switch', 'Under One Touch Switch your new provider arranges everything and cancels the old line — 365 Techies makes sure your Wi-Fi, email and devices keep working.']]},
                       'keyfacts': '<ul><li><strong>National ISPs (across Dorset, Openreach):</strong> BT, Sky, TalkTalk, EE, Vodafone, Plusnet, Zen &amp; NOW — as full fibre (FTTP) or older part-fibre (FTTC).</li><li><strong>Virgin Media '
                                   '(urban cable):</strong> gigabit cable across most of urban Bournemouth, Christchurch &amp; Poole; little rural coverage.</li><li><strong>Full-fibre altnets (BCP):</strong> toob and others on CityFibre '
                                   'bring symmetrical full fibre to parts of BCP, street by street.</li><li><strong>Wessex Internet (rural Dorset):</strong> Dorset-based, full fibre and fixed wireless reaching villages the big networks '
                                   'miss, including Project Gigabit areas.</li><li><strong>Dorset towns:</strong> Weymouth, Bridport, Sherborne &amp; Dorchester have ex-Jurassic full fibre plus growing Openreach FTTP.</li></ul>',
                       'webapp': True},
 'broadband-speed-checker': {'answer': 'As a rough guide, a light single user needs around 15 Mbps, an average couple or small family streaming and video-calling wants roughly 30–60 Mbps, and a busy household with 4K, gaming and home '
                                       'working is comfortable at 100 Mbps or more — run the live test on this page to see what you actually get, then compare it with the recommendation.',
                             'faqs': [['How much broadband speed do I need in the UK?',
                                       'For one light user, around 15 Mbps is fine; a couple or small family streaming HD and video-calling wants roughly 30–60 Mbps; and a busy household doing 4K, gaming and serious home working is '
                                       "comfortable at 100 Mbps or above. This tool's quiz gives you a personalised Mbps target from your household size and usage, then compares it to your live test result."],
                                      ['Is 30 Mbps or 100 Mbps enough for my household?',
                                       '30 Mbps handles HD streaming, video calls and browsing without fuss for most homes, but it can struggle when several people are online at once. 100 Mbps or more is plenty for a busy household '
                                       'running multiple 4K streams, video calls and gaming simultaneously. The recommendation on this page scales with how many people use the connection together.'],
                                      ['How many Mbps do I need for Netflix, Teams and gaming at the same time?',
                                       'Roughly: 4K Netflix needs about 25 Mbps per stream, a Teams or Zoom HD call needs a few Mbps, and online gaming needs little bandwidth but low ping. Doing all three at once comfortably points to a '
                                       '100 Mbps-plus connection, which is why this tool multiplies your usage by household size when it suggests a target speed.']],
                             'howto': {'name': 'How to work out the broadband speed your home needs',
                                       'steps': [['Run the live speed test', "Press Start to measure your real download, upload and ping right now, live against Cloudflare's network — no sign-up needed."],
                                                 ['Answer the 3-step needs quiz', 'Tell the tool how many people use the internet at once, what you mostly do online, and roughly the speed you get now.'],
                                                 ['Read your recommended Mbps',
                                                  'The tool suggests a target download speed based on your usage and household size, and tells you whether your current speed looks plenty, borderline or too low.'],
                                                 ['Test next to the router to rule out Wi-Fi', 'If the result is well below your package, retest beside the router or on a cable — a big gap means the Wi-Fi is the problem, not the line.'],
                                                 ['Fix a shortfall', "Upgrade your package, improve your Wi-Fi, or in rural Dorset and the New Forest consider Starlink where fast fibre won't reach."]]},
                             'keyfacts': '<table><thead><tr><th>Household &amp; usage</th><th>Rough download speed to aim for</th></tr></thead><tbody><tr><td>One person: browsing, email &amp; shopping</td><td>~15 Mbps</td></tr><tr><td>2–3 '
                                         'people: HD streaming &amp; video calls</td><td>~30–50 Mbps</td></tr><tr><td>Busy household: gaming &amp; big downloads</td><td>~80 Mbps</td></tr><tr><td>4+ people: lots of 4K &amp; serious home '
                                         'working</td><td>100 Mbps or more</td></tr></tbody><tfoot><tr><td colspan="2">A rough guide based on typical needs. The tool\'s verdict rates a live result as Excellent (100 Mbps+), Good (30 '
                                         'Mbps+), OK (10 Mbps+) or Slow (under 10 Mbps).</td></tr></tfoot></table>',
                             'webapp': False},
 'computer-fault-checker': {'answer': 'A laptop that&rsquo;s slow and freezing is most often caused by software clutter, too little memory, a failing hard drive or malware &mdash; not a computer that needs replacing &mdash; and this free '
                                      'checker helps you narrow down the likely cause and the best next step.',
                            'faqs': [('Why is my laptop so slow and freezing?',
                                      'The usual culprits are software clutter and too many start-up programs, too little memory (RAM), a failing or nearly-full hard drive, overheating, or malware. Most are fixable &mdash; an SSD upgrade '
                                      'and a clean-up transform a lot of &lsquo;slow&rsquo; laptops without needing a new machine.'),
                                     ('Does a slow computer mean I need a new one?',
                                      'Usually not. A gradual slow-down is almost always software or an ageing hard drive rather than a machine that&rsquo;s worn out. An SSD, more memory or a proper tune-up often makes an older laptop '
                                      'feel new again.')],
                            'howto': {'name': 'How to work out why your laptop is slow or freezing',
                                      'steps': [('Describe the symptom', 'Pick what your computer is doing &mdash; slow, freezing, pop-ups, won&rsquo;t start, no display and so on.'),
                                                ('Read the likely cause', 'The checker shows the most common causes for that symptom, in plain English.'),
                                                ('Try the suggested step', 'Follow the safe first step it recommends &mdash; often a restart, a clean-up or checking a cable.'),
                                                ('Rule out the cheap fixes', 'Many &lsquo;slow&rsquo; laptops just need an SSD, more memory or a malware clean &mdash; not replacing.'),
                                                ('Still stuck? Ask us', 'If it&rsquo;s not obvious, we&rsquo;ll diagnose it honestly &mdash; usually remotely, within minutes.')]},
                            'keyfacts': '<ul><li><strong>Slow &amp; freezing:</strong> usually software clutter, too little memory, a failing or full hard drive, or malware &mdash; often fixable with a tune-up or an '
                                        'SSD.</li><li><strong>Pop-ups &amp; browser changes:</strong> typically adware or malware &mdash; needs a proper clean-up.</li><li><strong>Won&rsquo;t turn on:</strong> check the charger and battery '
                                        'first; then the power supply or button.</li><li><strong>No display / no sound / no internet:</strong> usually a cable, setting or driver rather than a dead machine.</li><li><strong>Overheating '
                                        '&amp; loud fans:</strong> often dust and failing cooling &mdash; a clean and re-paste, not a new PC.</li></ul>',
                            'webapp': False},
 'computer-spec-checker': {'answer': 'This free checker instantly reveals what your browser can see about your computer &mdash; your operating system, graphics card, screen resolution, memory and processor cores &mdash; with nothing '
                                     'installed, though a browser can&rsquo;t read every internal detail like the exact CPU model.',
                           'faqs': [('How do I check my computer&rsquo;s specs online?',
                                     'Open this checker and it instantly shows what your browser can detect &mdash; operating system, graphics card, screen resolution, an estimate of memory and your processor&rsquo;s core count &mdash; '
                                     'with nothing installed and nothing sent to us.'),
                                    ('Why can&rsquo;t the checker see my exact CPU or RAM?',
                                     'Browsers deliberately limit what a website can read about your hardware for privacy, so some details (like the precise processor model or total RAM) aren&rsquo;t available. What it does show is '
                                     'accurate; for the full picture, Windows&rsquo; own System Information or our team can help.')],
                           'howto': {'name': 'How to check your computer&rsquo;s specs online',
                                     'steps': [('Open the checker', 'It reads what your browser exposes about your device automatically &mdash; no permissions or install needed.'),
                                               ('Read your specs', 'See your operating system, graphics card, screen resolution and colour depth, memory hint and processor core count.'),
                                               ('Save the spec sheet', 'Download or copy the summary &mdash; handy when buying software, asking for support or selling a device.'),
                                               ('Need the full detail?', 'For the exact CPU, RAM and drive models a browser can&rsquo;t see, our PC Hardware Checker guidance and our team can help.')]},
                           'webapp': False},
 'cost-calculator': {'answer': '365 Techies&rsquo; managed IT support is priced per computer &mdash; home support is &pound;18.25/month per computer and business support from &pound;24.38/month per computer, with optional Microsoft 365 at '
                               '&pound;4.85 per user &mdash; and this calculator adds them up live as you set the number of computers and licences.',
                     'faqs': [['How much is managed IT support per computer in the UK?',
                               'With 365 Techies it is &pound;18.25 per month per computer for home support and from &pound;24.38 per month per computer for business support, with Microsoft 365 an optional &pound;4.85 per user per month. '
                               'The calculator multiplies these by the number of computers you choose so you see a real monthly total, not a generic estimate.'],
                              ['Does the cost calculator give an exact quote?',
                               'It gives accurate guide prices taken straight from our live per-computer plans, so it is what you would expect to pay. Business totals show as a &lsquo;from&rsquo; figure because larger teams are tailored '
                               'to how you work (email, hosting, users); we always confirm the exact figure before anything starts, with no hidden call-out fees.'],
                              ['Is there a minimum contract for per-computer IT support?',
                               'No. Every 365 Techies plan is billed monthly and is cancel-anytime, so you pay per computer per month with no long lock-in and can add or remove computers and Microsoft 365 licences as your home or business '
                               'changes.']],
                     'howto': {'name': 'How to work out your managed IT support cost per computer',
                               'steps': [['Choose home or business', 'Pick the Home &amp; Family or Business tab at the top of the calculator &mdash; each uses its own per-computer price.'],
                                         ['Set your computers', 'Slide to the number of computers or laptops you need supported (home goes 1&ndash;10, business 1&ndash;25). The monthly total updates instantly.'],
                                         ['Add Microsoft 365 if needed', 'Use the + and &minus; buttons to add a Microsoft 365 licence (&pound;4.85/user per month) for each person who needs one &mdash; leave it at zero if not.'],
                                         ['Read your monthly total',
                                          'The summary panel shows a line-by-line breakdown and a clear per-month total &mdash; business figures show as a &lsquo;from&rsquo; guide because larger teams are tailored.'],
                                         ['Confirm the exact figure',
                                          'Every plan is cancel-anytime and includes a full computer service every six weeks; tap through to view plans or talk to us and we&rsquo;ll confirm your exact price before anything starts.']]},
                     'webapp': True},
 'coverage-checker': {'answer': '365 Techies provides on-site IT support across Dorset and the New Forest — including Bournemouth, Poole and Christchurch (BH), Dorchester, Weymouth and west Dorset (DT), Southampton and the New Forest (SO) '
                                'and Salisbury/Fordingbridge (SP) — plus fast remote IT support everywhere else in the UK and Europe; enter your postcode on this page to check instantly.',
                      'faqs': [['Do you offer on-site IT support in the New Forest?',
                                'Yes — Southampton and the New Forest (SO postcodes) are within our on-site area, alongside Bournemouth, Poole and Christchurch (BH), west Dorset (DT) and Salisbury and Fordingbridge (SP). Enter your '
                                "postcode in the checker on this page and it confirms on-site coverage instantly, or we support you remotely if you're just outside."],
                               ['Which postcodes get on-site IT support from 365 Techies?',
                                'On-site visits cover the BH (Bournemouth, Poole, Christchurch), DT (Dorchester, Weymouth, west Dorset), SO (Southampton and the New Forest), SP (Salisbury and Fordingbridge) and BA (north Somerset edge) '
                                'postcode areas. Everywhere else in the UK and Europe is covered by our remote IT support and fully managed monthly plans.'],
                               ["How does the coverage checker decide if I'm covered on-site?",
                                "It reads the first letters of your postcode (the postcode area) and checks them against our on-site list — BH, DT, SO, SP and BA return a 'yes, we cover you' result with a link to your local support page, "
                                'while any other area returns remote support instead. Just the outward code such as BH9, DT1 or SO40 is enough for it to work.']],
                      'howto': {'name': 'How to check if 365 Techies covers your area on-site',
                                'steps': [['Enter your postcode', 'Type the first part of your postcode into the checker — just the outward code like BH9, DT1 or SO40 is enough.'],
                                          ['Press check', 'The tool matches your postcode area against the on-site coverage list and shows the result instantly.'],
                                          ['See your on-site result', "If you're in a covered area it confirms on-site plus remote support and links to your local support page."],
                                          ['Or get remote support', 'Outside the on-site area, you still get fast, secure remote IT support and fully managed plans right across the UK and Europe.'],
                                          ['Book a visit or start remotely', "Book an on-site visit if you're covered, or start remote support and speak to the same friendly local team."]]},
                      'keyfacts': '<ul><li><strong>BH</strong> — Bournemouth, Poole &amp; Christchurch: on-site + remote</li><li><strong>DT</strong> — Dorchester, Weymouth &amp; west Dorset: on-site + remote</li><li><strong>SO</strong> — '
                                  'Southampton &amp; the New Forest: on-site + remote</li><li><strong>SP</strong> — Salisbury &amp; Fordingbridge: on-site + remote</li><li><strong>BA</strong> — north Somerset / Bath edge: on-site + '
                                  'remote</li><li><strong>Everywhere else in the UK &amp; Europe</strong> — fast, secure remote IT support &amp; managed plans</li></ul>',
                      'webapp': True},
 'custom-pc-builder': {'answer': 'For a gaming PC the graphics card usually deserves the biggest slice of the budget &mdash; often around a third &mdash; followed by the processor, with the rest spread across the motherboard, memory, '
                                 'storage, power supply and case; that split shifts if you&rsquo;re building for video editing, 3D or everyday office work.',
                       'faqs': [('How should I split my PC build budget?',
                                 'For gaming, put the biggest share into the graphics card (around a third), then the processor, then divide the rest across motherboard, memory, storage, case and a good power supply. For video, 3D or '
                                 'office work the balance shifts &mdash; this builder adjusts the percentages to match your use case.'),
                                ('How much of my budget should the graphics card be?',
                                 'On a gaming build the graphics card is usually the single biggest line, often about a third of the total. For everyday or office use you often don&rsquo;t need a dedicated card at all &mdash; that money '
                                 'is better spent on a fast SSD and more memory.')],
                       'howto': {'name': 'How to split your PC build budget',
                                 'steps': [('Set your total budget', 'Enter what you want to spend in the builder &mdash; it works out sensible amounts for each part.'),
                                           ('Pick your use case', 'Choose gaming, everyday or workstation/editing; the percentages shift to suit what you actually do.'),
                                           ('Review the per-part split', 'See roughly what to spend on the graphics card, processor, motherboard, memory, storage, case and power supply.'),
                                           ('Use the buy links', 'Open the live Scan or Amazon searches for each part to see today&rsquo;s real prices.'),
                                           ('Want it built for you?', '365 Techies can spec, build and set up the whole thing &mdash; just ask.')]},
                       'keyfacts': '<ul><li><strong>Gaming:</strong> the graphics card takes the largest share (roughly a third), then the processor.</li><li><strong>Video editing / 3D / workstation:</strong> more goes to the processor, '
                                   'memory and fast storage, and relatively less to the graphics card.</li><li><strong>Everyday / office:</strong> no dedicated graphics card needed &mdash; spend on a fast SSD and plenty of '
                                   'memory.</li><li><strong>Never skimp on the power supply:</strong> a cheap PSU can damage everything else, so it always gets a sensible slice.</li></ul>',
                       'webapp': False},
 'dns-lookup': {'answer': 'To check your MX and DNS records, enter your domain into this free DNS lookup tool and it reads the live A, AAAA, CNAME, MX, NS and TXT records over secure DNS-over-HTTPS, showing your mail servers (MX) and '
                          'website settings in seconds.',
                'faqs': [['What are MX records and why do they matter?',
                          "MX (Mail eXchange) records tell the internet which mail servers handle email for your domain. If they're missing or point to the wrong servers, your email won't arrive &mdash; so they're the first thing to check "
                          'when email breaks.'],
                         ['Why does my domain show no MX records?',
                          "Either email isn't set up for that domain, or the MX records were removed or never added &mdash; both stop email being delivered. Check with whoever hosts your email or DNS, and add the correct MX records they "
                          'provide.'],
                         ['Does this show the same MX records everyone else sees?',
                          'Yes &mdash; DNS records are public and this tool reads the same live records every mail and web server uses, so what you see here is exactly what governs your real email and website.']],
                'howto': {'name': 'How to check your MX and DNS records',
                          'steps': [['Enter your domain', 'Type your domain (for example yourdomain.co.uk) into the lookup box — you can paste an email address too and it will use the domain after the @.'],
                                    ['Run the lookup', "Click 'Look up records'. The tool queries live DNS over a secure connection (Google DNS-over-HTTPS)."],
                                    ['Find your MX records', "In the results, the 'Mail servers' card lists your MX records — these decide where your email is delivered."],
                                    ['Check the other records', "You'll also see A/AAAA (website server), NS (nameservers) and TXT (SPF and verification) records for the same domain."],
                                    ['Spot anything missing', "Empty MX or missing SPF in TXT is a common cause of email problems — if a record looks wrong, that's usually where the fault is."]]},
                'webapp': False},
 'domain-expiry-checker': {'answer': "A .co.uk domain's expiry date is held by Nominet, the UK registry, and this free checker reads the official registry record (RDAP) to show when the domain expires, who the registrar is and how many "
                                     'days remain.',
                           'faqs': [['Does Nominet run .co.uk domains?',
                                     'Yes &mdash; Nominet is the official registry for all .uk domains including .co.uk. Your day-to-day renewals go through your registrar (such as your web host or a company like GoDaddy), but the '
                                     'authoritative record sits with Nominet, which is what this checker reads.'],
                                    ["Why doesn't my .co.uk domain show a Nominet expiry date?",
                                     "Nominet doesn't always publish the full expiry date in the public RDAP record for .co.uk. The checker will still confirm the domain is registered and show its status and registrar &mdash; to see the "
                                     'exact renewal date, log in to your registrar account or check with Nominet directly.'],
                                    ['Do I renew a .co.uk domain with Nominet or my registrar?',
                                     "With your registrar &mdash; the company you (or whoever built your site) bought the domain through. Nominet keeps the master record for .uk, but you can't renew directly with them; the checker shows "
                                     'which registrar to log in to.']],
                           'howto': {'name': 'How to check when a .co.uk domain expires',
                                     'steps': [['Enter the .co.uk domain', 'Type the domain (for example yourbusiness.co.uk) into the checker box.'],
                                               ['Run the check', "Click 'Check expiry date'. The tool queries the official registry record via RDAP, the modern successor to WHOIS."],
                                               ['Read the verdict', "You'll get a plain-English verdict at the top — safe, renewal coming up, renew now, or expired — with the days remaining."],
                                               ['Check the registrar and lock status', 'The results show the registrar (the company you renew through) and whether the domain is transfer-locked for safety.'],
                                               ['Turn on auto-renew', 'If renewal is close, log in to your registrar, enable auto-renew and make sure the payment card and account email are current.']]},
                           'keyfacts': '<ul><li><strong>Safe</strong> &mdash; 60 or more days to renewal; no action needed yet, but keep auto-renew on.</li><li><strong>Renewal coming up</strong> &mdash; 30 to 59 days left; take two '
                                       'minutes to confirm auto-renew is on and the card on file is valid.</li><li><strong>Renew now</strong> &mdash; under 30 days left; if auto-renew is off or the card has expired, the website and email '
                                       "will stop.</li><li><strong>Expired</strong> &mdash; registration has lapsed; contact the registrar immediately, as there's often only a short grace period to save it.</li><li><strong>Registered (no "
                                       "date)</strong> &mdash; the registry doesn't publish a public expiry date, but the domain is confirmed registered.</li></ul>",
                           'webapp': False},
 'downtime-cost-calculator': {'answer': 'This free UK calculator estimates what IT downtime costs your small business by multiplying the four numbers you choose &mdash; how many people stop working, what an hour of their time is worth, '
                                        'how long a typical outage lasts and how often it happens &mdash; into a rough annual cost of lost working time.',
                              'faqs': [['How do you calculate the cost of IT downtime for a small business?',
                                        'The simplest way is people affected &times; their hourly cost &times; hours lost per outage &times; outages per year, which gives the lost-labour cost. This calculator does exactly that from the '
                                        'four answers you pick, then rounds to a friendly annual figure &mdash; and real costs are usually higher once you add lost data, missed deadlines and stress.'],
                                       ['What is the average cost of IT downtime per hour?',
                                        'There is no single UK figure &mdash; it depends entirely on how many staff are idled and what their time is worth, which is why this tool asks for your own numbers rather than quoting a headline '
                                        'average. A three-person team on around &pound;22/hour, for example, loses roughly &pound;66 for every hour they can&rsquo;t work.'],
                                       ['Does this downtime calculator store my business figures?',
                                        'No. It is simple arithmetic that runs entirely in your browser &mdash; nothing you choose is sent to us or saved anywhere, and the result is a friendly estimate to show the scale of the risk, not a '
                                        'quote.']],
                              'howto': {'name': 'How to estimate your small business IT downtime cost',
                                        'steps': [['Count who stops', 'Answer step 1 &mdash; how many people can&rsquo;t work when IT goes down: just one, a few (around 3), or the whole team (8+).'],
                                                  ['Value an hour', 'Answer step 2 &mdash; roughly what an hour of that time is worth: under &pound;15, &pound;15&ndash;&pound;30, or &pound;30+ per hour.'],
                                                  ['Set the outage length', 'Answer step 3 &mdash; how long a typical IT problem stops you: about an hour, half a day, or a full day or more.'],
                                                  ['Set how often', 'Answer step 4 &mdash; how frequently it happens: a couple of times a year, every few months, or most months.'],
                                                  ['Read your annual cost',
                                                   'The tool instantly shows a rough &pound;-per-year figure for lost working time and compares it to the cost of a support plan &mdash; nothing you enter is sent or stored.']]},
                              'webapp': False},
 'email-security-checker': {'answer': 'Scammers can spoof your email if your domain is missing SPF, DKIM or an enforcing DMARC record, and this free checker looks up those three public DNS records for your domain and tells you in plain '
                                      'English whether criminals could send email pretending to be you.',
                            'faqs': [['How do I know if someone can spoof my email address?',
                                      'Enter your domain into this checker: if it finds no SPF record, no DMARC record, or a DMARC policy set to p=none, then spoofed email in your name is not being blocked and scammers can impersonate '
                                      'you.'],
                                     ['What actually stops my email being spoofed?',
                                      'An enforcing DMARC policy (p=quarantine or p=reject) on top of a proper SPF record is what stops spoofing — SPF says who may send as you, DKIM signs your messages, and DMARC tells inboxes to reject '
                                      'anything that fails.'],
                                     ['The checker says DKIM was not found — is that a problem?',
                                      "Not necessarily; the tool probes common DKIM selectors, and your provider may use a custom one it can't see, so it is worth confirming with your email provider that your outgoing mail is "
                                      'DKIM-signed.']],
                            'howto': {'name': 'How to check if scammers can spoof your email',
                                      'steps': [['Enter your domain', 'Type your email domain (the part after the @, e.g. yourbusiness.co.uk) into the checker — no email address or password needed.'],
                                                ['Run the check', 'Press check; the tool looks up your live SPF, DKIM and DMARC DNS records using a secure DNS-over-HTTPS query.'],
                                                ['Read the verdict', 'See whether your domain is Protected, partly protected or exposed, with a plain-English note on each record.'],
                                                ['Note the gaps', 'The most common gap is a missing or monitor-only (p=none) DMARC record — that is the hole scammers exploit.'],
                                                ['Get it fixed', 'If your domain is not fully protected, 365 Techies can set up SPF, DKIM and DMARC properly, usually within a day and with no disruption to your email.']]},
                            'webapp': False},
 'email-signature-generator': {'answer': "This free generator builds an email-safe HTML signature for a UK business, and you add your registered company name, company number and registered office in the 'Extra line' field so they appear "
                                         'in your footer.',
                               'faqs': [['Is there a dedicated company-number field?',
                                         "Not a separate box &mdash; you add your company number using the free-text 'Extra line' field, which is designed exactly for this. Its placeholder even shows the format: 'Registered in England "
                                         "&amp; Wales No. 1234567'."],
                                        ['Where does the Extra line appear in the signature?',
                                         'It renders as a small grey line at the very bottom of the signature, below your contact details, in both the Classic (accent-bar) and Compact (one-line) styles &mdash; the right place for a legal '
                                         "footer that shouldn't dominate."],
                                        ['Can I add my VAT number too?',
                                         "Yes &mdash; the Extra line is free text, so you can include a VAT number alongside the company number if you're VAT-registered. Keep it to one clear line so it renders reliably across email "
                                         'apps.']],
                               'howto': {'name': 'How to make a UK business email signature with your company number',
                                         'steps': [['Fill in your details', 'Enter your name, job title, company, phone, email and website in the form — the live preview updates as you type.'],
                                                   ['Add your company number in the Extra line', "In the 'Extra line' field, type your legal footer, for example 'Registered in England &amp; Wales No. 1234567, [registered office]'."],
                                                   ['Choose a style and colour', 'Pick the Classic accent-bar or Compact one-line style and set your brand accent colour.'],
                                                   ['Copy the signature', 'Click the copy button to grab the finished, email-safe signature (built with reliable tables and inline styles).'],
                                                   ['Paste it into your email app', 'Paste it into your signature settings in Outlook, Gmail or your email client and save.']]},
                               'webapp': False},
 'graphics-card-benchmark': {'answer': 'This free online GPU benchmark renders a demanding 3D scene in your browser using WebGL and measures how many frames your graphics card can push, giving a graphics score and a tier from integrated '
                                       'to enthusiast &mdash; no download and nothing installed.',
                             'faqs': [('Is there an online GPU benchmark that needs no download?',
                                       'Yes &mdash; this one runs entirely in your browser using WebGL, the same technology games use. It renders a real 3D scene, measures your frame rate, and gives a graphics score and tier, with nothing '
                                       'to install.'),
                                      ('How accurate is a browser GPU benchmark?',
                                       'Treat it as an indicative, relative guide rather than a lab result &mdash; browser, drivers, laptop power mode and thermals all affect it. Compare against our tiers or re-run after a driver update; '
                                       'don&rsquo;t compare the number directly with 3DMark.')],
                             'howto': {'name': 'How to benchmark your graphics card online',
                                       'steps': [('Pick a test', 'Choose Quick, Standard or Extreme &mdash; Extreme pushes powerful cards past your screen&rsquo;s frame-rate cap.'),
                                                 ('Press Start', 'A live 3D scene renders while the tool measures your frame rate; you watch it run.'),
                                                 ('Read your score and tier', 'You get a graphics score, average and 1% low FPS, and a tier from integrated to enthusiast.'),
                                                 ('Try the advanced options', 'Change render scale, detail and effects (shadows, reflections) for a proper stress test, then save your score card.')]},
                             'webapp': False},
 'is-it-down': {'answer': "To tell if your broadband is down or it's just you, run this page's live connection test — if it says your connection is fine but a service's official feed shows problems, it's them; if several unrelated "
                          "services all fail from your line while their feeds look healthy, it's you or your router.",
                'faqs': [['Is my broadband down or is it just me?',
                          'Use the live connection test at the top of this page. If it confirms your connection is working but a specific service shows problems, the fault is with that service. If the test fails or several unrelated '
                          'services all drop at once while their own feeds look healthy, the problem is your broadband, router or Wi-Fi — the quickest confirmation is to load the same site on your phone with Wi-Fi off.'],
                         ["How do I know if it's my router or the broadband line itself?",
                          "If a wired or nearby-to-router device works but others don't, it's usually Wi-Fi or the router; if nothing on any device can get online, it points to the line or an area outage. Your provider's official checker "
                          '(linked on this page) can test the line directly, and dialling 105 free will tell you about a local power cut affecting the cabinet.'],
                         ['Why is half the internet down at the same time?',
                          'Much of the web runs on a few shared providers — Cloudflare, AWS, Azure and a handful of DNS services — so when one has a bad day, thousands of unrelated sites break together. That is why this page shows '
                          "Cloudflare and Azure cards: if one is red, the mass-outage mystery is usually solved and it's nothing to do with your connection."]],
                'howto': {'name': 'How to check if your broadband is down or just you',
                          'steps': [['Read the connection panel at the top',
                                     'When the page loads it contacts Google, the BBC and Cloudflare and checks DNS live from your own connection — a green result means your line is reaching the internet.'],
                                    ['Check the service you care about', 'Find the service in the grid (or search for it). Each card shows two signals: its official status feed and whether it answers from your connection.'],
                                    ['Do the phone-on-mobile-data test', 'Open the same site on your phone with Wi-Fi turned off. If it works on mobile data, your home broadband is the problem, not the website.'],
                                    ["Check your provider's outage line", 'Scroll to the broadband and mobile section for the official outage checkers and support numbers — have your postcode and account details ready.'],
                                    ['Restart the router properly', 'Unplug the power, wait 30 seconds, plug back in, and give it up to 5 minutes to reconnect. Never press the recessed reset pin — that wipes your settings.']]},
                'webapp': False},
 'it-health-check-tool': {'answer': 'A free small-business IT health check is a quick set of plain-English questions on your backups, passwords, MFA, updates and security that gives an instant on-screen score out of 100 plus a short list '
                                    'of the gaps worth fixing first.',
                          'faqs': [['Is this free IT health check suitable for a UK small business?',
                                    "Yes. Choose 'business' at the start and the questions adapt to include staff leaver processes, working towards Cyber Essentials and GDPR data handling - the areas that matter most for a UK small "
                                    'business, alongside backups, MFA and updates.'],
                                   ['Does the IT health check send my answers to 365 Techies?',
                                    "No. The check runs entirely in your browser and scores instantly on screen - nothing is stored or sent unless you choose to contact us for a full report. There's no sign-up and no email required to see "
                                    'your score.'],
                                   ['What counts as a good IT health score?',
                                    "The tool scores you out of 100: 80 or above is 'Strong', 55 to 79 is 'Good, with some gaps', and below 55 is 'Needs attention'. Whatever your score, it lists the specific gaps worth fixing first."]],
                          'howto': {'name': 'How to run a free IT health check for your business',
                                    'steps': [['Choose home or business', 'Open the tool and select business (or home) so the questions adapt to you - business adds checks on staff leavers, security standards and GDPR.'],
                                              ['Answer honestly',
                                               'Work through the short multiple-choice questions on backups, passwords, MFA, updates, Windows version, anti-malware, phishing awareness, email, Wi-Fi and who fixes things.'],
                                              ['Get your score out of 100', 'The tool tallies your answers instantly in your browser and shows a score with a band: Strong, Good with some gaps, or Needs attention.'],
                                              ['Read your top priorities', 'See a ranked shortlist of the biggest gaps, each linking to the fix, so you know what to tackle first.'],
                                              ['Book a real review if needed', 'For a proper look, book a free IT health check and a 365 Techies techie reviews your security, backups and setup properly on a free call.']]},
                          'keyfacts': '<ul><li><strong>Score bands:</strong> 80-100 Strong &middot; 55-79 Good, with some gaps &middot; under 55 Needs attention.</li><li><strong>Areas checked (all users):</strong> backups, passwords, '
                                      'multi-factor login (MFA), updates, Windows version, anti-malware, spotting scams/phishing, email &amp; Microsoft 365, Wi-Fi/router security, and who fixes problems.</li><li><strong>Business '
                                      "adds:</strong> staff leaver process, working towards Cyber Essentials, and GDPR/compliance confidence.</li><li><strong>Home adds:</strong> whether the whole family's devices are set up "
                                      'safely.</li><li>Runs entirely in your browser - no sign-up, nothing stored - and lists your top gaps to fix first.</li></ul>',
                          'webapp': False},
 'link-safety-checker': {'answer': 'To check if a text message link is a scam, copy the link and paste it into this free checker, which reads the web address in your browser and flags the phishing warning signs scammers use — without ever '
                                   'opening the link — so you can decide before you tap.',
                         'faqs': [['How can I tell if a link in a text message is a scam?',
                                   "Genuine couriers, banks and companies rarely ask you to tap a link and pay a fee or log in; watch for shortened links, an IP address instead of a name, misspelt brand names, an '@' in the address or an "
                                   'odd domain ending — paste the link into this checker to have those signs flagged for you.'],
                                  ['Does this checker actually open or visit the link?',
                                   'No — and that is deliberate. It only reads and analyses the address text in your browser, so it is completely safe to check a link you are unsure about; it never loads the page.'],
                                  ['Does the checker scan the link against a virus or blocklist database?',
                                   'No — it inspects the address for common phishing tells rather than scanning a live threat database, so a clean result means no obvious red flags, not a guaranteed-safe site; if a message feels off, '
                                   "don't tap the link."]],
                         'howto': {'name': 'How to check if a text message link is a scam',
                                   'steps': [["Copy the link, don't tap it", "On a phone, press and hold the link in the text message and choose 'Copy link' instead of opening it."],
                                             ['Paste it into the checker', 'Paste the full address, including the part before the first slash, into the box.'],
                                             ['Run the safety check', "Press 'Check this link' — the tool examines only the address in your browser and never visits the site."],
                                             ['Read the warning signs', "See the plain-English verdict and any red flags, such as a shortened link, an IP address, a disguised '@', or an unusual domain ending."],
                                             ["When in doubt, don't tap", "A clean result is reassuring but not a guarantee; if the message was unexpected, don't tap the link and check with the sender or with 365 Techies."]]},
                         'keyfacts': "<p><strong>Warning signs this checker looks for in a link's address (in your browser, without opening it):</strong></p><ul><li><strong>Not secure (no HTTPS)</strong> — the connection isn't encrypted, "
                                     "so never enter passwords or card details.</li><li><strong>An IP address instead of a domain name</strong> — a classic phishing sign.</li><li><strong>An '@' in the address</strong> — text before an @ "
                                     "is ignored by browsers and used to disguise the real destination.</li><li><strong>Disguised 'punycode' (xn--) characters</strong> — can make a fake site look identical to a real one.</li><li><strong>A "
                                     'shortened link</strong> (bit.ly, tinyurl, t.co and similar) — hides where it really goes.</li><li><strong>A long chain of subdomains</strong> — lots of dots used to look official.</li><li><strong>An '
                                     'unusual domain ending</strong> (e.g. .zip, .tk, .xyz, .top, .click) — used far more by scam sites.</li><li><strong>An unusually long web address</strong> — can hide the true destination.</li></ul>',
                         'webapp': False},
 'password-breach-checker': {'answer': 'Yes — it is safe to check whether your password has been leaked here, because your password is turned into a one-way fingerprint in your browser and only the first five characters of that '
                                       'fingerprint are ever sent, so your actual password never leaves your device.',
                             'faqs': [['Is it safe to type my real password into a leak checker?',
                                       'With this tool, yes — it uses k-anonymity, meaning your password is hashed on your device and only a five-character slice of that hash is sent, so no website (including us) ever sees your password '
                                       'or can store it.'],
                                      ['How can a checker find my leaked password without knowing it?',
                                       "It sends just the first five characters of the password's hash to the Have I Been Pwned range API, which returns all matching hash endings; your browser then compares them locally, so the full "
                                       'password is never revealed.'],
                                      ['Is it safe to check a password I still use?',
                                       'Yes, and it is worth doing — the check reveals nothing about you, and if the password turns out to be in a breach you will want to change it straight away before criminals try it on your accounts.']],
                             'howto': {'name': 'How to safely check if your password has been leaked',
                                       'steps': [['Type the password to check', "Enter the password you want to test in the box; use the 'show' toggle if you need to see what you typed."],
                                                 ['Run the check', "Press 'Check password' — your browser creates a SHA-1 fingerprint and sends only a short, anonymised fragment of it."],
                                                 ['Read the result', 'See whether the password was found in known breaches and, if so, exactly how many times it has appeared.'],
                                                 ['Act on a match', 'If it was found, stop using it, change it everywhere you used it (or anything similar), and switch on two-factor authentication.'],
                                                 ['Prevent a repeat', 'Use a unique password for every login — a password manager makes that effortless and 365 Techies can set one up for you.']]},
                             'webapp': False},
 'password-generator': {'answer': 'A three random words password generator strings together three or four unrelated words (like Otter-Lantern-River) to make a password that is long, hard to crack and easy to remember, and this free tool '
                                  'builds one in your browser without sending it anywhere.',
                        'faqs': [['Why are three random words safer than a complicated password?',
                                  "Length is what defeats password-guessing computers, and three or four random words are far longer than something like P@ss1! while still being memorable — it is the approach recommended by the UK's "
                                  'National Cyber Security Centre.'],
                                 ['How does this three random words generator pick the words?',
                                  "It chooses each word at random from a built-in list using your browser's secure randomness (crypto.getRandomValues), then joins them with your chosen separator and can add a two-digit number — all on "
                                  'your device, with nothing sent to us.'],
                                 ['Are three random words strong enough on their own?',
                                  'Three genuinely random words make a strong, memorable password for accounts you type by hand; for maximum strength use four or more words, or switch to the Random password tab for a long fully random '
                                  'string kept in a password manager.']],
                        'howto': {'name': 'How to generate a three random words password',
                                  'steps': [['Open the passphrase tab', "On the generator, click the 'Memorable passphrase' tab to switch from a random string to real words."],
                                            ['Set the number of words', 'Drag the Words slider to 3 for the classic three-random-words method (you can go up to 6 for extra strength).'],
                                            ['Choose your style', "Tick 'Capitalise words' and 'Add a number', and pick a separator such as a dash, dot, underscore or space."],
                                            ['Generate and copy', 'Press Generate to create the passphrase, check the strength bar, then click Copy to put it on your clipboard.'],
                                            ['Use it on one account only', 'Paste it into the account you are securing and never reuse it elsewhere — a password manager can store the rest.']]},
                        'webapp': False},
 'password-strength-checker': {'answer': 'A password strength checker rates how hard your password is to guess, and length matters most — this free tool scores your password higher the longer it is, giving a big boost at 16 characters or '
                                         'more, and it runs entirely in your browser so nothing is sent or stored.',
                               'faqs': [['Does password length really matter more than symbols?',
                                         'Yes — every extra character multiplies the time a computer needs to guess it, so a long passphrase beats a short password crammed with symbols; this checker rewards length heavily and gives an '
                                         'extra boost at 16 characters or more.'],
                                        ['What length should a strong password be?',
                                         'Aim for at least 12 characters, and ideally 16 or more; below 12 the checker flags it as too short, because length is the single biggest factor in how quickly a password can be cracked.'],
                                        ['Is it safe to type my password into this strength checker?',
                                         'Yes — the check runs entirely in your browser and your password is never sent over the internet, saved, or seen by us; if you would rather not type a real one, test something of the same length '
                                         'and style.']],
                               'howto': {'name': 'How to check password strength by length',
                                         'steps': [['Type a password to test', 'Enter a password in the box; the strength bar and rating update live as you type.'],
                                                   ['Read the length-based score', 'Watch the rating move from Weak to Excellent — adding characters lifts the score fastest, with a bonus once you reach 16.'],
                                                   ['Follow the tips', 'Read the plain-English suggestions, such as making it longer or avoiding common words and keyboard runs like 1234.'],
                                                   ['Generate a strong one', 'Tap Generate to create a memorable three-random-words passphrase you can use instead, then Copy it.'],
                                                   ['Keep it unique', 'Use your strong password on just one account and turn on two-factor authentication wherever you can.']]},
                               'keyfacts': '<p><strong>How this checker scores a password (in your browser):</strong></p><ul><li><strong>Length is the biggest factor</strong> — each character adds to the score up to a cap, with an extra '
                                           'bonus once the password reaches 16 characters or more.</li><li><strong>Variety adds points</strong> — lower-case, upper-case, numbers and symbols each raise the score a '
                                           "little.</li><li><strong>Weaknesses are penalised</strong> — containing a common password (e.g. 'password', 'qwerty', '123456'), three identical characters in a row, or a keyboard/number run "
                                           '(1234, qwerty, asdf) drags the score down.</li></ul><p><strong>Rating bands:</strong> Weak (score under 35) &middot; Fair (35&ndash;59) &middot; Strong (60&ndash;79) &middot; Excellent '
                                           '(80+).</p>',
                               'webapp': False},
 'pc-benchmark': {'answer': 'This free benchmark runs six real tests of your processor (on one core and all cores), encryption, memory, graphics and storage right in your browser and gives a single speed score out of 100 &mdash; no '
                            'download and nothing installed.',
                  'faqs': [('How can I test my computer&rsquo;s speed online for free?',
                            'Just run this benchmark in your browser &mdash; it puts your processor, memory, graphics and storage through six real tests and gives a speed score out of 100 in about 20 seconds. Nothing is installed and '
                            'nothing is sent to us.'),
                           ('Is an online speed test as accurate as installed software?',
                            'It&rsquo;s indicative rather than lab-grade &mdash; browser and background apps affect it &mdash; but it&rsquo;s a genuinely useful, honest picture of how your machine is performing, and it&rsquo;s perfect for '
                            'spotting a slow disk or comparing before and after an upgrade.')],
                  'howto': {'name': 'How to test your computer&rsquo;s speed online',
                            'steps': [('Close other programs', 'Shut anything heavy so the test measures your computer, not what else is running.'),
                                      ('Press Start', 'The benchmark runs six short tests live &mdash; processor, encryption, memory, graphics and storage &mdash; in about 20 seconds.'),
                                      ('Read your score', 'You get a clear score out of 100 with a band from &lsquo;struggling&rsquo; to &lsquo;blazing fast&rsquo;, plus a per-test breakdown.'),
                                      ('Save or compare it', 'Download your score card, and re-run it after a tune-up or an SSD upgrade to see the jump.')]},
                  'webapp': False},
 'plan-finder': {'answer': "The IT support plan you need depends on who it's for and your size: 365 Techies Home IT Support is £18.25/mo per computer (£23.10 with Microsoft 365 added), Business IT Support is from £24.38/mo per computer, "
                           'and larger teams get a custom-priced plan.',
                 'faqs': [['How much does a 365 Techies IT support plan cost?',
                           'Home IT Support is £18.25 a month per computer, or £23.10 a month per computer with Microsoft 365 set up and managed for you. Business IT Support starts from £24.38 a month per computer, and larger teams get a '
                           'custom-priced plan tailored to them.'],
                          ["What's the difference between the home and business support plans?",
                           'Home IT Support covers your computer with remote help, a full service every six weeks and security checks. Business IT Support is per-computer cover for sole traders and small teams, adding Microsoft 365 '
                           'management and security, with a fully custom plan for a whole company.'],
                          ['Do I need to add Microsoft 365 to my plan?',
                           'Only if you want Outlook, Teams and business email set up and looked after for you. On a home plan, say yes in the finder and it recommends Home Support + Microsoft 365 at £23.10/mo per computer; say no and it '
                           'recommends standard Home Support. Business plans include Microsoft 365 management already.']],
                 'howto': {'name': 'How to find the right IT support plan',
                           'steps': [["Choose who it's for", 'Open the Plan Finder and select whether the IT support is for your home and family or your business.'],
                                     ['Tell us your size', 'For home, pick one computer, a few family devices, or lots of devices; for business, pick 1-3 people, a small team, or a whole company that runs on IT.'],
                                     ['Say if you need Microsoft 365', 'Answer whether you need Microsoft 365 (Outlook, Teams and email) set up and looked after for you.'],
                                     ['See your recommended plan', 'The finder instantly names the best-fit plan with its real monthly per-computer price and a short description.'],
                                     ['View details or get a quote', 'Follow the link to the full plan, or - for a larger team on the custom plan - contact 365 Techies for a tailored quote.']]},
                 'keyfacts': '<table><thead><tr><th>Plan</th><th>Price</th><th>Best for</th></tr></thead><tbody><tr><td>Home IT Support</td><td>£18.25/mo per computer</td><td>Home users - remote support, 6-weekly service, security '
                             'checks</td></tr><tr><td>Home Support + Microsoft 365</td><td>£23.10/mo per computer</td><td>Home users who also want Microsoft 365 managed</td></tr><tr><td>Business IT Support</td><td>from £24.38/mo per '
                             'computer</td><td>Sole traders and small teams - support, Microsoft 365 &amp; security</td></tr><tr><td>Business IT Support (larger)</td><td>Custom</td><td>A whole company that runs on IT - tailored '
                             'plan</td></tr></tbody></table>',
                 'webapp': True},
 'qr-code-generator': {'answer': "This free QR code generator turns any website link, plain text, email address, phone number or text message into a scannable QR code in seconds with no sign-up, no watermark and no expiry — it's built in "
                                 'your browser, you can change the colour, and you download it as a plain image to print however you like.',
                       'faqs': [['Is this QR code generator really free with no watermark?',
                                 "Yes — completely free, no sign-up, no watermark and no expiry. The QR code is generated in your browser and it's yours to use however you like, forever. You just choose your content, optionally set a "
                                 'colour, and download it as a plain image ready to print.'],
                                ['Can I change the colour of my QR code?',
                                 "Yes — there's a colour picker, so you can set the QR code to your brand colour or leave the default dark navy. Keep it dark on a light background with plenty of contrast so phone cameras still scan it "
                                 'reliably, then download it as a plain image with no watermark.'],
                                ['Do I need an app to scan the QR codes this makes?',
                                 'No — the codes hold your link, text, email, phone number or message directly, so most modern iPhone and Android cameras read them straight from the built-in camera app with no separate scanner needed. '
                                 'Point the camera at the code and the phone offers to open the link or action for you.']],
                       'howto': {'name': 'How to make a free QR code with no signup or watermark',
                                 'steps': [['Choose what the code should do', 'Pick from open a website, show text, start an email, dial a phone number or send a text message.'],
                                           ['Enter your details', 'Type the link, text, email, phone number or message — for email you can add a ready-made subject line.'],
                                           ['Pick a colour (optional)', 'Choose a QR colour to match your brand, or leave the default dark navy.'],
                                           ['Download the image', 'Click Download as image to save a clean QR code with no watermark, no sign-up and no expiry.'],
                                           ['Print it big enough to scan', 'Print it large enough to be scanned from where people will stand — on a menu, poster, business card or review card.']]},
                       'webapp': False},
 'quick-quote': {'answer': 'You can get a free, no-obligation IT support quote for your UK small business in under a minute by telling 365 Techies your setup - home or business, how many devices, and your situation - and a real techie '
                           'replies by email or phone with an honest, tailored price.',
                 'faqs': [['Is the IT support quote free and no-obligation?',
                           "Yes - it's completely free with no obligation and no pressure. You tell us about your setup, we send back an honest, tailored quote, and it's entirely up to you whether you go ahead."],
                          ['Does the Quick Quote tool show a price instantly?',
                           'No. Rather than a generic instant figure, the tool passes your details to a real techie at 365 Techies who replies by email or phone with a tailored quote or cost comparison - usually well suited to a small '
                           'business with a specific setup.'],
                          ['Can I use this to compare against my current IT provider?',
                           "Yes. One of the options is 'comparing providers and costs', so you can use the Quick Quote purely to benchmark what you pay now against a like-for-like 365 Techies plan, with no commitment to switch."]],
                 'howto': {'name': 'How to get a free IT support quote',
                           'steps': [['Choose home or business', 'Open the Quick Quote tool and select whether the support is for your home and family or your business.'],
                                     ['Say how much needs covering', 'Pick roughly how much needs covering - one main computer, a few devices, or several users and devices.'],
                                     ['Describe your situation', 'Tell us whether you have no support right now, are unhappy with a current provider, are comparing costs, or need a new setup or project.'],
                                     ['Add your contact details', 'Enter your name, email and optional phone number, plus any extra notes about your setup.'],
                                     ['Send it and wait for a reply', "Submit the form - it goes to 365 Techies, who reply with an honest, tailored quote. There's no instant price; a person prepares it for you."]]},
                 'webapp': True},
 'repair-or-replace-advisor': {'answer': 'As a rough rule, if a repair would cost more than about half the price of a comparable replacement &mdash; or the computer is over roughly five years old and out of security updates &mdash; '
                                         'replacing is usually the smarter move.',
                               'faqs': [('Should I repair or replace my computer?',
                                         'A good rule of thumb: if the repair costs more than half the price of a comparable replacement, or the machine is over about five years old and no longer getting security updates, replacing '
                                         'usually makes more sense. If it&rsquo;s simply slow, an SSD or memory upgrade is a cheap repair that often transforms it.'),
                                        ('Is it worth repairing a computer over 5 years old?',
                                         'Sometimes &mdash; a small, cheap fix like an SSD on an otherwise healthy machine can be well worth it. But repeated faults, expensive parts or the loss of security updates on an older machine '
                                         'usually mean a replacement is better value.')],
                               'howto': {'name': 'How to decide whether to repair or replace',
                                         'steps': [('Get the repair price', 'Find out what the fix actually costs &mdash; we quote clearly and for free, with no-fix-no-fee.'),
                                                   ('Compare to a replacement', 'Weigh it against a comparable machine, including our refurbished business-grade Dells from &pound;299.'),
                                                   ('Check the age and updates', 'Over ~5 years old or no longer getting security updates tips the balance towards replacing.'),
                                                   ('Ask about a cheap upgrade', 'If it&rsquo;s just slow, an SSD or memory upgrade often fixes it for a fraction of a new PC.')]},
                               'keyfacts': '<ul><li><strong>The 50% rule:</strong> if the repair costs more than half the price of a similar new or refurbished machine, lean towards replacing.</li><li><strong>Age:</strong> under ~5 years '
                                           'and it&rsquo;s usually worth fixing; well over 5 with repeated faults points to replacing.</li><li><strong>Security updates:</strong> if it can no longer get updates (e.g. stuck on an '
                                           'unsupported Windows version), that pushes towards replacing.</li><li><strong>Cheap wins:</strong> a slow but otherwise healthy PC is often transformed by an SSD or more memory &mdash; a repair, '
                                           'not a replacement.</li></ul>',
                               'webapp': False},
 'server-or-cloud-picker': {'answer': 'Most small businesses with flexible working and mainstream software are best on the cloud (Microsoft 365), while a local server or a server-plus-cloud hybrid suits you if you run specialist software, '
                                      'very large shared files or have specific compliance rules.',
                            'faqs': [['When does a small business still need a physical server?',
                                      'A local server (or a hybrid of server and cloud) usually makes sense when you run older or specialist software that expects one, work with very large shared files, or have compliance rules that need '
                                      'data kept on your own kit. For most other small businesses the cloud is simpler and cheaper to run.'],
                                     ['What is a hybrid server-and-cloud setup?',
                                      "A hybrid blends cloud services like Microsoft 365 with just enough local hardware on site. It's often ideal when you have a real mix of office and remote working - you get flexible remote access "
                                      'without giving up the local performance some tasks or software need.'],
                                     ['Is moving to the cloud cheaper than buying a server?',
                                      'Not always, but the cloud usually means lower upfront cost, less to maintain and easy remote access, whereas a server is a bigger one-off purchase you own and maintain. This picker gives a steer and '
                                      '365 Techies can compare the real costs for your setup.']],
                            'howto': {'name': 'How to decide between a server and the cloud',
                                      'steps': [['Describe how your team works', 'Open the picker and choose whether your team is mostly in one office, mostly remote and hybrid, or a real mix of both.'],
                                                ['Flag any specialist software', 'Say whether you run older or specialist software that needs a local server, or whether you mostly use email, Office and web apps.'],
                                                ['Note large files or compliance', 'Tell the tool whether you have very large shared files or specific compliance rules to meet.'],
                                                ['Read your steer', 'The picker recommends the cloud, a hybrid setup, or a local server, in jargon-free language with a link to the next step.'],
                                                ['Talk it through free', "Book a free, no-pressure chat with 365 Techies to confirm the right fit and, if you're moving, plan the migration."]]},
                            'keyfacts': '<ul><li><strong>Cloud is likely best</strong> when you work flexibly and use mainstream software (email, Office, web apps) - less to maintain, easy remote access, lower upfront '
                                        'cost.</li><li><strong>A hybrid</strong> suits a real mix of office and remote working - cloud services plus just-enough local kit.</li><li><strong>A server (or hybrid)</strong> suits specialist or '
                                        'older software, very large shared files, or specific compliance needs.</li></ul>',
                            'webapp': False},
 'solar-battery-calculator': {'answer': 'This free UK calculator sizes your leisure battery and solar panels by adding up the daily watt-hours of the appliances you tick, adding 15% for real-world losses, then giving an honest lithium (or '
                                        'AGM) battery capacity in Ah and the solar wattage needed for UK summer and winter sun.',
                              'faqs': [['What size leisure battery and solar do I need for a campervan?',
                                        'Add up the watt-hours of everything you run in a day, add about 15% for losses, then divide by 12 for amp-hours per day; multiply by your cloudy-day buffer and divide by 0.9 for a lithium battery '
                                        'size. This calculator does that automatically and also gives the panel wattage for UK summer and shoulder-season sun.'],
                                       ['How many watts of solar do I need for UK conditions?',
                                        'The tool sizes panels from your daily use against roughly 4.2 peak-sun hours in summer and about 2.5 in spring and autumn, plus a headroom margin. UK winter gives closer to one sun-hour a day, so '
                                        'it flags that solar alone won&rsquo;t cover winter &mdash; pair it with engine (B2B) charging or hook-up.'],
                                       ['Can I use this calculator for a boat, cabin or off-grid build?',
                                        'Yes. It works for any 12V setup &mdash; campervan, boat, cabin or off-grid building &mdash; because it sizes from the appliances you actually run rather than a vehicle type. It gives indicative '
                                        'sizing at 12V; we&rsquo;ll size yours properly, including cabling and fusing, before anything is fitted.']],
                              'howto': {'name': 'How to size a campervan leisure battery and solar array',
                                        'steps': [['Tick what you run', 'Check each appliance you use &mdash; fridge, lights, phone charging, laptop, diesel heater, CPAP and more &mdash; from the preset list.'],
                                                  ['Set the daily hours', 'Adjust the hours-per-day box next to each ticked item so it matches how you actually use it; add any custom device by watts and hours.'],
                                                  ['Choose your buffer', 'Slide &lsquo;Days of autonomy&rsquo; (1&ndash;3) to set how many cloudy days you want the battery to cover without charging.'],
                                                  ['Read the battery size', 'See your daily draw in Ah and the recommended lithium battery size (and the larger AGM equivalent), matched to common 100&ndash;200Ah blocks.'],
                                                  ['Read the solar wattage', 'Check the summer and shoulder-season panel wattage; remember UK winter sun is near 1 hour a day, so plan on engine (B2B) or hook-up charging then.']]},
                              'webapp': False},
 'spot-the-scam': {'answer': 'The Spot the Scam quiz is a free six-round test that shows you real-looking emails, texts, pop-ups and phone calls and asks you to judge each one, giving an instant plain-English explanation after every round '
                             'so you learn the tell-tale signs of a scam.',
                   'faqs': [['How many questions are in the Spot the Scam quiz?',
                             'There are six rounds, each showing a different realistic scam or genuine message — a phishing email, a smishing text, a tech-support pop-up, a bank phone scam and a couple of genuine examples — with an '
                             'explanation after each.'],
                            ["What score means I'm good at spotting scams?",
                             "Score 5 or 6 out of 6 and you're rated 'Scam-savvy'; 3 or 4 is 'Not bad — stay sharp'; 0 to 2 means it's worth brushing up, because scams are getting cleverer all the time."],
                            ['Is the Spot the Scam quiz free and does it need sign-up?',
                             "It's completely free with no sign-up, takes about two minutes, and is written in plain English — it's especially helpful for older or less-confident users, who scammers target most."]],
                   'howto': {'name': 'How to take the Spot the Scam quiz',
                             'steps': [['Read each scenario', 'The quiz shows one realistic message or call per round — an email, text, pop-up or phone call.'],
                                       ['Make your call', "Choose 'It's a scam' or 'Looks genuine' based on the warning signs you can see."],
                                       ['Read the explanation', 'See instantly whether you were right and why, in plain English, before moving on.'],
                                       ['Finish all six rounds', 'Work through the six scenarios to get your final score out of six and a rating.'],
                                       ['Play again or get protected', "Replay to sharpen your instincts, or follow the links to managed cybersecurity if you'd like real, layered protection."]]},
                   'keyfacts': "<p><strong>What the six rounds cover</strong> (scams and genuine messages mixed together):</p><ul><li>A prize/voucher phishing email with a 'click here within 24 hours' link — "
                               "<strong>scam</strong>.</li><li>A 'Royal Mail' redelivery-fee text with a link — <strong>scam (smishing)</strong>.</li><li>A full-screen 'your PC is infected, call Microsoft' pop-up — <strong>scam "
                               "(tech-support)</strong>.</li><li>An expected file shared by a known colleague on your real Microsoft 365 — <strong>genuine</strong>.</li><li>A 'bank fraud team' call asking for your PIN and to move money to "
                               "a 'safe account' — <strong>scam</strong>.</li><li>A password-reset email that arrives right after you clicked 'forgot password' — <strong>genuine</strong>.</li></ul><p><strong>Score bands:</strong> "
                               "5&ndash;6 = 'Scam-savvy!' &middot; 3&ndash;4 = 'Not bad — stay sharp' &middot; 0&ndash;2 = 'Worth brushing up'.</p>",
                   'webapp': False},
 'ssl-checker': {'answer': 'This free SSL certificate expiry checker reads the live certificate any website presents and tells you exactly when it expires, how many days remain, who issued it and whether browsers trust it.',
                 'faqs': [['How many days before expiry does the checker warn me?',
                           "If the certificate is valid but has 21 days or fewer left, the checker flags it amber as 'Expiring soon' with the exact day count, so you can confirm auto-renewal before it lapses rather than after."],
                          ["Can I check any website's SSL expiry or just my own?",
                           "Any public website. The certificate is the same public one every visitor's browser reads, so checking a supplier's or competitor's expiry date is fine &mdash; nothing is stored."],
                          ["What does 'Days remaining' mean if it's already expired?",
                           'If the certificate has already lapsed the tool shows how many days ago it expired and flags it red &mdash; that means visitors are seeing a full-screen security warning instead of your site, so it needs fixing '
                           'today.']],
                 'howto': {'name': 'How to check when an SSL certificate expires',
                           'steps': [['Enter the domain', 'Type just the domain (for example yourbusiness.co.uk) into the checker — no https:// needed.'],
                                     ['Run the check', "Click 'Check certificate'. The tool reads the certificate your site already shows every visitor on the secure port (443)."],
                                     ['Read the verdict', "You'll get a plain-English verdict — valid, expiring soon, expired, not trusted or self-signed — at the top."],
                                     ['Check the expiry date and days remaining', 'The results table shows the valid-from and valid-to dates plus the exact number of days left before renewal is due.'],
                                     ['Renew before it lapses', "If it's expiring soon, confirm your hosting's auto-renewal is working — don't assume it — or renew manually before the date shown."]]},
                 'keyfacts': '<table><thead><tr><th>Result</th><th>What it means</th></tr></thead><tbody><tr><td>Valid &amp; trusted</td><td>Trusted issuer, correct domain, more than 21 days to renewal</td></tr><tr><td>Expiring '
                             'soon</td><td>Still valid but 21 days or fewer remain &mdash; confirm auto-renewal now</td></tr><tr><td>Certificate expired</td><td>Lapsed &mdash; every visitor sees a security warning; fix '
                             "today</td></tr><tr><td>Not yet valid</td><td>Start date is in the future &mdash; usually a server clock problem</td></tr><tr><td>Not trusted / self-signed</td><td>Issuer isn't recognised by browsers &mdash; "
                             "visitors get a warning</td></tr><tr><td>Wrong certificate</td><td>Certificate doesn't cover this exact domain name</td></tr></tbody></table>",
                 'webapp': False},
 'victron-system-builder': {'answer': 'Answer four questions and this free builder returns a complete Victron campervan system with the exact cable, lug and fuse size for every circuit &mdash; sized for short runs (up to 3m one way) at '
                                      '12V &mdash; following the golden rule that the fuse protects the cable, so you never fit a fuse rated higher than its cable.',
                            'faqs': [['What size cable and fuse do I need for a campervan inverter?',
                                      'It depends on the inverter: the builder specs 25mm&sup2; cable with a 100A MEGA fuse for an ~800W Phoenix, 70mm&sup2; with a 300A MEGA fuse for a 2000W MultiPlus, and twin 70mm&sup2; per pole with a '
                                      '400A Class-T fuse for a 3000W kettle-capable unit. In every case the fuse protects the cable, so it is never rated above the cable&rsquo;s capacity.'],
                                     ['What fuse goes on a Victron Orion B2B engine-charging circuit?',
                                      'For the Orion XS 12/12-50 the builder specifies 16mm&sup2; tinned cable for runs up to 3m (25mm&sup2; for longer) fused with a 60A MIDI fuse at BOTH ends &mdash; at the starter battery and the '
                                      'leisure battery &mdash; because that cable runs the length of the vehicle and must be protected at each end.'],
                                     ['Do longer cable runs need a bigger cable in a 12V system?',
                                      'Yes. The sizes shown are for short runs of up to 3m one way at 12V; longer runs need thicker cable to beat voltage drop, while the fuse stays matched to the cable it protects. Use tinned marine cable '
                                      'and adhesive-lined heatshrink on every lug; for exact runs on your layout our design service calculates them properly.']],
                            'howto': {'name': 'How to size Victron campervan cables and fuses',
                                      'steps': [['Set your daily energy', 'Pick a preset (weekender ~350Wh, regular ~800Wh, full-timer ~1500Wh) or fine-tune the Wh/day slider &mdash; this drives the battery, solar and cable sizing.'],
                                                ['Choose your biggest mains load',
                                                 'Say whether you run all 12V, a laptop/TV inverter, a microwave, or a kettle/induction &mdash; this sets the main battery cable and MEGA/Class-T fuse size.'],
                                                ['Add engine and monitoring', 'Choose whether you charge from the engine (adds an Orion B2B circuit) and your monitoring level, so every relevant circuit appears.'],
                                                ['Read the per-circuit table',
                                                 'Scroll to &lsquo;Cables, lugs &amp; fuses &mdash; per circuit&rsquo; for the cable mm&sup2;, fuse and lug for the main battery, negative/shunt, solar, PV, engine and 12V distribution '
                                                 'runs.'],
                                                ['Apply the golden rules',
                                                 'Fuse every positive close to the battery, keep inverter cable fat and short, crimp don&rsquo;t solder, and upsize cable for runs longer than 3m to beat voltage drop.']]},
                            'keyfacts': '<p><strong>Victron 12V cable &amp; fuse guide &mdash; short runs (&le;3m one way). Golden rule: the fuse protects the cable, never fit a fuse rated above its cable.</strong></p><div '
                                        'style="overflow-x:auto"><table><thead><tr><th>Circuit</th><th>Cable</th><th>Fuse</th></tr></thead><tbody><tr><td>Main battery (with ~800W inverter)</td><td>25mm&sup2;</td><td>100A '
                                        'MEGA</td></tr><tr><td>Main battery (2000W MultiPlus)</td><td>70mm&sup2;</td><td>300A MEGA</td></tr><tr><td>Main battery (3000W, kettle/induction)</td><td>2&times;70mm&sup2; per pole</td><td>400A '
                                        'Class-T (lithium)</td></tr><tr><td>Battery negative &rarr; SmartShunt</td><td>Same as main (M10 lugs at shunt)</td><td>&mdash;</td></tr><tr><td>Engine &rarr; battery (Orion XS '
                                        '50A)</td><td>16mm&sup2; (25mm&sup2; longer)</td><td>60A MIDI at BOTH ends</td></tr><tr><td>Panels &rarr; MPPT controller</td><td>6mm&sup2; solar cable + MC4</td><td>&mdash;</td></tr><tr><td>12V '
                                        'distribution feed</td><td>10mm&sup2;</td><td>40A MIDI feed fuse</td></tr></tbody></table></div><p><strong>MPPT solar controller by array size:</strong> up to ~220W &rarr; SmartSolar 75/15 '
                                        '(6mm&sup2;, 20A fuse); ~290W &rarr; 100/20 (6mm&sup2;, 25A); ~440W &rarr; 100/30 (10mm&sup2;, 40A); ~700W &rarr; 100/50 (16mm&sup2;, 60A); ~1000W &rarr; 150/70 (25mm&sup2;, 100A MEGA).</p>',
                            'webapp': False},
 'webcam-mic-test': {'answer': 'To test your webcam and mic for a Teams meeting, use this free on-device checker: click Test my camera to see a live preview, Test my microphone to watch the level meter move as you speak, and play the '
                               'left/right/both tone to check your speakers — everything runs in your browser with nothing recorded, streamed or uploaded.',
                     'faqs': [['How do I test my camera and mic before a Teams meeting?',
                               'Open this page, click Test my camera to check the live preview, click Test my microphone and speak to watch the level meter respond, then play the speaker tone. It all runs privately in your browser with '
                               'nothing recorded or sent, so you can confirm your webcam, mic and speakers work before you join the call.'],
                              ['Do I need to install anything to test my webcam for Teams?',
                               "No — this test runs entirely in your browser, so there's no app or download. Just click Test my camera and Test my microphone and allow access when your browser asks; if a check won't run, try a modern "
                               'browser like Chrome or Edge. Teams itself is separate, but if the hardware works here it will work in Teams once its own camera and mic permissions are allowed.'],
                              ['Is this webcam and mic test safe and private?',
                               "Yes — the video and audio never leave your device. The test runs entirely in your browser with no recording and no uploading, and everything stops the moment you leave the page or close the tab. We can't "
                               'see your camera or hear your mic at any point.']],
                     'howto': {'name': 'How to test your webcam and mic before a Teams meeting',
                               'steps': [['Test your camera', "Click Test my camera and allow access — you'll see a live preview of exactly what your camera sees."],
                                         ['Test your microphone', 'Click Test my microphone, allow access and speak normally — the on-screen meter moves to show your mic is picking up sound.'],
                                         ['Test your speakers', 'Play the tone through Left, Right and Both to confirm both sides of your speakers or headset work.'],
                                         ['Fix a black screen', 'If the camera shows black, close Teams, Zoom or Skype running in the background, check any physical privacy shutter, and check Windows Settings, Privacy & security, Camera.'],
                                         ['Get it working in Teams', "If it works here but not in Teams, the meeting app usually has permission blocked or the wrong device selected — check the app's device settings."]]},
                     'webapp': False},
 'website-checker': {'answer': "A website is usually slow because of oversized images, render-blocking code, slow hosting or bloated scripts, and this free checker runs Google's Lighthouse engine to score your Performance and Core Web "
                               'Vitals and list the exact things making it slow.',
                     'faqs': [['What is a good website speed score?',
                               "On this checker each Lighthouse score is out of 100: green (90+) is great, amber (50&ndash;89) has room to improve, and red (under 50) needs attention. For real-world speed, aim for a 'FAST' rating on "
                               'Largest Contentful Paint and Interaction to Next Paint.'],
                              ['Does the checker tell me why my site is slow, not just that it is?',
                               "Yes &mdash; alongside the score it lists the actual culprits (such as unoptimised images, render-blocking scripts or slow server response) under 'Top things to improve', each with a plain-English "
                               'explanation of what to fix.'],
                              ['Is a slow score caused by my hosting or my website?',
                               "It can be either. Core Web Vitals and server-response timings point to hosting, while large images, heavy plugins and unminified code point to the site itself. If you're not sure which, we're a Dorset web "
                               '&amp; IT team and can pin it down for you.']],
                     'howto': {'name': 'How to find out why your website is slow',
                               'steps': [['Enter your web address', 'Type your full website address (for example yourbusiness.co.uk) into the checker box.'],
                                         ['Pick Mobile or Desktop', 'Choose the device to test — Mobile is what most visitors and Google use, so start there.'],
                                         ['Run the check', "Click 'Check website' and wait around 15 to 30 seconds while Google's Lighthouse engine analyses the page."],
                                         ['Read your Performance score', 'Look at the Performance gauge (out of 100) and the Core Web Vitals — Largest Contentful Paint, INP and Cumulative Layout Shift show real-world speed and stability.'],
                                         ['Work through the top issues', "Scroll to 'Top things to improve', where the report lists the specific speed problems in plain English, worst first."]]},
                     'webapp': False},
 'what-websites-know': {'answer': 'The moment you visit, a website can see your IP address and rough location, your internet provider, your browser and operating system, your screen size, time zone, language and other device signals, and '
                                  'this free tool shows you exactly what yours gives away.',
                        'faqs': [['Can a website see my exact home address?',
                                  "No &mdash; it sees your IP address and a rough location estimated from it (usually the right city or region), plus your internet provider. That's not GPS and not your street address, but it's often close "
                                  'to where you are.'],
                                 ['Can a website see who I am by name?',
                                  "Not by itself. What it reads &mdash; IP, browser, screen size, time zone and so on &mdash; doesn't include your name. But advertisers and trackers combine these signals with cookies and accounts to build "
                                  'a profile and follow you around the web.'],
                                 ['Does this tool scan my computer or store my data?',
                                  'No &mdash; it only reads the information your browser already shares with every site, plus a public IP lookup for your rough location. Everything is shown to you in your own browser and nothing is saved '
                                  'or sent to us.']],
                        'howto': {'name': 'How to see what a website can learn about you',
                                  'steps': [['Open the checker', "Load the 'What can websites see about you' page — it runs entirely in your own browser, with nothing stored."],
                                            ["Click 'Reveal what sites can see'", 'Press the reveal button. The tool reads the data your browser shares automatically and looks up your rough location from your IP.'],
                                            ['Review your IP and location', 'See your public IP address, estimated city/region and internet provider — the baseline that identifies your connection.'],
                                            ['Review your device signals', 'Check the browser, operating system, screen size, time zone, language and other details that together help sites recognise you.'],
                                            ['Tighten your privacy', 'Use a privacy-respecting browser, keep everything updated and consider a VPN on public Wi-Fi to give away less.']]},
                        'keyfacts': '<p><strong>What this page reads about your device the moment you reveal it:</strong></p><ul><li>Your public IP address</li><li>Rough location (city / region) estimated from your IP</li><li>Your '
                                    "internet provider (ISP)</li><li>Browser and operating system</li><li>Screen size and pixel density</li><li>Time zone and language</li><li>Whether cookies are enabled and 'Do Not Track' "
                                    'status</li><li>CPU cores, approximate device memory and connection type</li></ul>',
                        'webapp': False},
 'what-would-you-lose': {'answer': "Your files are only safe if your computer dies when they are copied to a separate backup you have actually tested - cloud sync like OneDrive or iCloud isn't enough on its own, because a deletion or "
                                   'ransomware attack syncs everywhere too.',
                         'faqs': [['Would I really lose everything if my computer died today?',
                                   "If your files only exist on that one computer, then yes - a failed drive, theft or ransomware can wipe them in an instant, and once they're gone they're usually gone for good. A separate, tested backup "
                                   'is what keeps them recoverable.'],
                                  ["Why isn't 'I think it's backed up' a safe answer?",
                                   "Because a backup you've never tested isn't really a backup - drives fail silently, sync quietly stops, and folders get missed. The only way to be sure is to try restoring a file. That's why the check "
                                   "treats 'I think so' as the riskiest answer of all."],
                                  ['Is copying my files to one external hard drive enough?',
                                   "It's far better than nothing, but a single drive can fail, be lost, stolen or hit by ransomware just like your computer. Keeping a second copy off-site - or in a proper managed backup - means one mishap "
                                   'can never wipe everything at once.']],
                         'howto': {'name': 'How to check how safe your files are',
                                   'steps': [['Pick what matters most', 'Open the check and choose what would hurt most to lose - photos and memories, documents and emails, business records, or honestly everything.'],
                                             ["Say if it's backed up", "Tell the tool whether it's safely backed up somewhere separate: yes and tested, you think so, or no."],
                                             ['Read your risk verdict', "Get an instant, friendly verdict - in good shape, worth sorting today, or let's make sure - based on how reliable your backup really is."],
                                             ['Test an existing backup', "If you only 'think' it's backed up, try restoring a file to prove it works - an untested backup isn't really a backup."],
                                             ['Set up a proper backup', 'Ask 365 Techies to set up an automatic, verified backup following the 3-2-1 rule so a failure, theft or ransomware can never wipe everything.']]},
                         'keyfacts': "<ul><li><strong>Tested, separate backup:</strong> you're in good shape - this is exactly what keeps your files safe.</li><li><strong>No backup:</strong> high risk - a failed drive, theft or ransomware "
                                     "could lose everything for good; worth sorting today.</li><li><strong>'I think so' or 'not sure' (untested):</strong> the riskiest answer - a backup you've never tested isn't really a backup; check it "
                                     'can actually restore.</li><li><strong>The 3-2-1 rule:</strong> 3 copies of your data, on 2 types of media, with 1 kept off-site.</li></ul>',
                         'webapp': False},
 'which-microsoft-365-plan': {'answer': 'Microsoft 365 Business Basic gives you business email plus the web and mobile Office apps, Standard adds the full Office apps installed on your PCs, and Premium adds advanced security and device '
                                        'management on top of Standard.',
                              'faqs': [['What is the main difference between Business Standard and Premium?',
                                        'Both give you business email, Teams and the full Office apps installed on your PCs. Premium adds advanced security, threat protection and device management on top - the right choice if you handle '
                                        'sensitive data or want managed, secured devices.'],
                                       ['Does the picker show Microsoft 365 prices?',
                                        "No. Microsoft changes its plans and prices from time to time, so the tool points you to the right plan and links Microsoft's own live comparison rather than showing a figure that could be out of "
                                        'date. As Microsoft partners we confirm the current best-value price with you for free.'],
                                       ['Is Business Basic enough for a small business?',
                                        "Often, yes. Business Basic covers business email on your own domain, Teams, 1TB of OneDrive per person and the web and mobile Office apps. It's great value if nobody needs Word, Excel and Outlook "
                                        'installed on the PC - if they do, choose Standard.']],
                              'howto': {'name': 'How to find the right Microsoft 365 plan',
                                        'steps': [["Choose who it's for", 'Open the picker and select whether Microsoft 365 is for you or your household, or for your business or team.'],
                                                  ['Answer the follow-up', "For home, say whether it's just you (Personal) or several people (Family); for business, say whether you need the Office apps installed on your computers."],
                                                  ['Answer the security question', 'For business, tell the picker whether you handle sensitive data or need managed, secured devices.'],
                                                  ['Read your suggested plan', 'The tool names the best-fit plan - Personal, Family, Business Basic, Standard or Premium - in plain English with no upselling.'],
                                                  ['Compare or get it set up', "Follow the link to Microsoft's own live comparison, or ask 365 Techies to confirm the current best-value option and set it up for free."]]},
                              'keyfacts': '<table><thead><tr><th>Plan</th><th>Best for</th><th>Office apps</th></tr></thead><tbody><tr><td>Personal</td><td>One person / household</td><td>Full apps on your devices + 1TB '
                                          'OneDrive</td></tr><tr><td>Family</td><td>Up to 6 people, each with own login</td><td>Full apps + 1TB OneDrive each</td></tr><tr><td>Business Basic</td><td>Small business, no installed apps '
                                          'needed</td><td>Web &amp; mobile apps only + business email</td></tr><tr><td>Business Standard</td><td>Most small businesses</td><td>Full apps installed on PCs + business '
                                          'email</td></tr><tr><td>Business Premium</td><td>Sensitive data / managed devices</td><td>Everything in Standard + advanced security &amp; device management</td></tr></tbody></table>',
                              'webapp': False},
 'wifi-qr-code-generator': {'answer': 'This free Wi-Fi QR code generator turns your network name, password and security type into a QR code guests scan to join instantly without typing the password — ideal for a guest network in a café, '
                                      'office or holiday let — and the whole code is built in your browser so your password never leaves your device.',
                            'faqs': [['How do I make a Wi-Fi QR code for a guest network?',
                                      "Enter your guest network's name, password and security type in the tool above, tick 'hidden network' if it applies, then download the QR code as an image and print it. Guests point their phone camera "
                                      'at it and join instantly without typing the password — perfect for cafés, offices, holiday lets and homes.'],
                                     ['Which security type do I pick for my guest Wi-Fi QR code?',
                                      "Choose WPA (which covers WPA/WPA2/WPA3) for almost every modern router with a password — that's the default and the right choice for most guest networks. Pick None only for a genuinely open network "
                                      'with no password. The tool builds the code to match, so scanning phones connect the first time.'],
                                     ['Is it safe to type my Wi-Fi password into this generator?',
                                      "Yes — the QR code is generated entirely in your browser and your password is never sent to us or stored anywhere. Nothing about your network leaves your device, so it's safe to create the code and "
                                      'simply print the result.']],
                            'howto': {'name': 'How to make a Wi-Fi QR code for your guest network',
                                      'steps': [['Enter your network name', 'Type your Wi-Fi network name (SSID) exactly as it appears, including capitals.'],
                                                ['Enter the password and security', 'Add the Wi-Fi password and choose the security type — WPA/WPA2/WPA3 for almost all modern networks, or None for an open guest network.'],
                                                ['Flag a hidden network if needed', "Tick 'This is a hidden network' if your guest network doesn't broadcast its name."],
                                                ['Download and print the code', 'Download the QR code as an image, then print it and display it where guests need it.'],
                                                ['Put it where guests can scan it', 'Place it on a café table, reception desk, meeting room or holiday-let welcome pack so visitors join with a single scan.']]},
                            'webapp': False}}
