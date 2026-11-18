# -*- coding: utf-8 -*-
"""Stay safe and be ready (18 Nov 2026). Owner: "do it all and make it SEO and AI optimised ... really clear ... easy to
get to and navigate ... help people stay safe and be prepared for everything."

What this file holds:
  1. /be-ready-digital-checklist/  NEW guide (NEW_PAGES): the tech side of the government's Be Ready campaign.
  2. CT_*  the rebuilt /cyber-threats/ hub (cyber_threats_hub() in build_extra.py reads these).
  3. DR_*  the rebuilt /disaster-recovery/ page: business continuity plan + a free printable template.

Why (Bing Keyword Research, UK, 3 months to 15 Nov 2026, exact): be ready campaign uk 3,344, be ready 2,332, be ready
campaign 2,223 (rising), government advice on stockpiling 1,345, be ready checklist 532, emergency kit 501 (x4 since the
campaign), wind up radio 10,169 (weekly ~180 -> 3,698); cyber attacks 1,466 (weekly x6), cyber attack news 962, what is a
cyber attack 705, cyber attack uk 701; business continuity plan 1,823 (rising), template 262, what is business continuity
234. Searches for the AI threat itself are near zero, so AI is a section here, not a page. Full read:
D:/claude/seo-research/ai-threats-demand-2026-11-18/FINDINGS.md.

Facts and where they come from (checked 18 Nov 2026):
  - Be Ready: Cabinet Office campaign, late October 2026, beready.campaign.gov.uk. "From severe weather to cyber attacks
    ... Being ready for 3 days". Its checklist (water, food, torch, FM radio, charged power bank, cash, copies of documents,
    phone numbers on paper), its Cyber page (passkeys; strong unique passwords + 2-step verification; password manager;
    updates on all devices incl. smart devices, automatic updates; replace unsupported devices; back up, protect the
    backup, practise a restore) and its Phone and broadband outages and Power cuts pages (Wi-Fi Calling, offline maps,
    105 / 03457 643643, telecare battery back-up, unplug TV and PC, 999 roams onto any mobile network). Quoted or
    paraphrased, always linked, and the page says we are not the government.
  - NCSC State of the Cyber Nation, 3 Nov 2026: AI-enabled ransomware attack on UK critical infrastructure "highly
    likely" by 2028; AI mostly speeds up existing attacks; 1,831 reports in the year to Sep 2026, 337 needing NCSC support.
  - Supermarket freezer attack, early Nov 2026: 100+ shops in several European countries, thermostats changed remotely
    (some to defrost, some to 50C); the NCSC told UK retailers to update fridge-controller software (Al Jazeera 3 Nov).
  - ASOS, 6 Oct 2026: basic personal information and contact details; ASOS does not believe card details or passwords
    were affected. Manchester Airports Group, Aug 2026: about 8.7 million customers told that emails, phone numbers,
    vehicle registrations and postcodes were exposed; no payment details in that system (as reported).
  - Microsoft 365 outage 12-13 Nov 2026: Microsoft said no malicious activity. Never "hacked".
  - Report Fraud replaced Action Fraud on 4 Dec 2025: 0300 123 2040; Scotland = Police Scotland 101. ICO 0303 123 1113,
    personal-data breaches reported within 72 hours when they risk people's rights. Windows 10: free security updates
    ended 14 Oct 2025, the one-year consumer ESU ended 13 Oct 2026.
  - 365 PC Manager (free): Programs check updates programs with one button (Windows' own winget) and names programs that
    no longer get security fixes; the health check sees whether a backup is genuinely running, protection is on and
    Windows updates are arriving.
Said with care: no price invented; no promise that a UPS runs for a set time ("often a few hours"); Amazon links are
plain searches by spec with the Associates rules (rel=sponsored, "(paid link)", the Amazon sentence, no prices).
"""
from new_pages_data import NEW_PAGES

AMZN_TAG = '365techies0d-21'


def _amzn(q, label):
    return ('<a href="https://www.amazon.co.uk/s?k=' + q + '&amp;tag=' + AMZN_TAG + '" target="_blank" '
            'rel="sponsored noopener nofollow">' + label + '</a> (paid link)')


# shared print window (new tab, plain black-on-white, A4). The <style> lives in a JS string, so it MUST carry
# data-no-theme or light_theme.py twins it and breaks the string (the 12-18 Nov course-checklist bug).
def _print_js(btn_id, src_id, doc_title, foot):
    # every "<" of the print document is written as \x3c inside the JS string, so no crawler or audit tool mistakes the
    # print window's <title>, <h1> or <body> for the page's own (the page keeps exactly one <title> and one <h1>)
    head = ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>' + doc_title + '</title>'
            '<style data-no-theme>@page{size:A4;margin:14mm}body{font-family:Georgia,serif;color:#111;background:#fff;'
            'margin:0;line-height:1.45;font-size:13px}h1{font-size:20px;margin:0 0 2px}h3{font-size:14px;margin:14px 0 4px;'
            'padding-bottom:2px;border-bottom:1px solid #888}ul{list-style:none;padding:0;margin:0}li{padding:2px 0 2px 24px;'
            'position:relative}li:before{content:"";position:absolute;left:2px;top:5px;width:12px;height:12px;'
            'border:1.5px solid #333}table{width:100%;border-collapse:collapse;margin:4px 0}td,th{border:1px solid #999;'
            'padding:5px;text-align:left;vertical-align:top;font-size:12px}th{background:#eee}.fill{display:inline-block;'
            'min-width:200px;border-bottom:1px solid #555}.no-print{display:none}p.src{font-size:11px;color:#444}</style>'
            '</head><body><h1>' + doc_title + '</h1>')
    tail = '<p class="src">' + foot + '</p></body></html>'
    assert "'" not in head + tail
    esc = lambda x: x.replace('<', '\\x3c')
    return ('<script>(function(){var b=document.getElementById(\'' + btn_id + '\');if(!b)return;'
            'b.addEventListener(\'click\',function(){var s=document.getElementById(\'' + src_id + '\');'
            'var w=window.open(\'\',\'_blank\');if(!w){window.print();return}'
            'w.document.write(\'' + esc(head) + '\'+s.innerHTML+\'' + esc(tail) + '\');'
            'w.document.close();w.focus();setTimeout(function(){w.print()},350)})})();</script>')


_CALL = ('<p>Rather someone went through it with you? Ring <strong>01202 775566</strong> or text 07520 615332, Monday to '
         'Friday, 9 to 5. We can connect to your Windows PC and check the updates, the backup and your security settings '
         'while you watch, anywhere in the UK. We tell you the price before we start. Our free '
         '<a href="/free-pc-health-check/">365 PC Manager</a> does the computer checks on this page for you, any time.</p>')

# ====================================================================== 1. /be-ready-digital-checklist/
BR_SLUG = 'be-ready-digital-checklist'

_BR_LIST = '''<style>
.brc{border:1px solid var(--line);border-radius:16px;background:var(--glass);padding:1.1rem 1.3rem;margin:1rem 0}
.brc h3{margin:1rem 0 .4rem;font-size:1.05rem}
.brc h3:first-child{margin-top:0}
.brc ul{list-style:none;padding:0;margin:0}
.brc li{position:relative;padding:.28rem 0 .28rem 1.9rem;line-height:1.5}
.brc li:before{content:"";position:absolute;left:.1rem;top:.55rem;width:1rem;height:1rem;border:2px solid var(--muted);border-radius:4px}
</style>
<div class="brc" id="brc-list">
<h3>Have ready at home</h3>
<ul>
<li>A charged power bank, topped up every month or two</li>
<li>A battery or wind-up FM radio, with your local stations&rsquo; frequencies written down</li>
<li>A torch and spare batteries</li>
<li>Some cash, in coins and notes</li>
<li>Important phone numbers on paper: family, neighbours, GP, your bank, your broadband provider, 105 for power cuts</li>
<li>Printed copies of passports, insurance policies and instructions for any medical equipment</li>
</ul>
<h3>On your phone</h3>
<ul>
<li>Maps of your area downloaded for offline use</li>
<li>Wi-Fi Calling switched on</li>
<li>Emergency contacts and medication in Medical ID or ICE</li>
<li>Low Power Mode or Battery Saver: know where it is</li>
</ul>
<h3>Your accounts and computer</h3>
<ul>
<li>Email secured with a passkey, or a strong unique password and two-step sign-in</li>
<li>A password manager, so every account has a different password</li>
<li>Automatic updates on, for the computer, the phone, every program and the smart devices</li>
<li>No device that has stopped getting security updates</li>
<li>Your photos and files backed up, one copy kept unplugged or in the cloud with version history</li>
<li>A restore tried, so you know the backup works</li>
</ul>
<h3>If something happens</h3>
<ul>
<li>Power cut: report it online or on 105, unplug the PC and TV, save your phone battery</li>
<li>Broadband or mobile down: try Wi-Fi Calling, texts and mobile data; check whether it&rsquo;s just you</li>
<li>A company you use is hacked: no links in emails; go to its website yourself; expect scam calls</li>
<li>Money lost: your bank on 159, then Report Fraud on 0300 123 2040 (Scotland: 101)</li>
<li>Your computer locked by ransomware: disconnect it from the internet, don&rsquo;t pay, get help</li>
</ul>
</div>
<p class="no-print"><button type="button" class="button primary" id="brc-print">Print the checklist</button></p>
''' + _print_js('brc-print', 'brc-list', 'Be Ready: the digital checklist',
                'Based on the government&#39;s Be Ready advice (beready.campaign.gov.uk). From 365techies.co.uk/be-ready-digital-checklist/. 365 Techies is an IT support company, not the government.')

NEW_PAGES.append({
    'slug': BR_SLUG,
    'title': 'Be Ready Checklist: the Digital Side of a 3-Day Emergency',
    'metaDesc': 'The government&rsquo;s Be Ready campaign asks homes to cope for 3 days without services. The tech side: '
                'phones, internet, power cuts, backups and cyber attacks.',
    'ogTitle': 'Be Ready: the digital side of a 3-day emergency (printable checklist)',
    'crumbName': 'Be Ready: 3-Day Digital Checklist',
    'eyebrow': '// BE READY &middot; THE DIGITAL SIDE',
    'h1': 'Be Ready: <em class="grad grad--cyan">the digital side</em> of a 3-day emergency',
    'lede': 'In late October 2026 the government launched <strong>Be Ready</strong>, asking every household to be able to '
            'manage for 3 days without the services we rely on, &ldquo;from severe weather to cyber attacks&rdquo;. Its '
            'checklist covers water, food and a torch. This page covers the rest: your phone, your internet, your computer, '
            'your accounts and your files. What to do now, what to do when it happens, and how to get back to normal. '
            'Updated 18 November 2026.',
    'chips': ['Built on the official Be Ready advice', 'Plain English', 'Printable checklist'],
    'primaryCta': ['Get the checklist', '#s3'], 'secondaryCta': ['Lock down your accounts', '#s4'],
    'ctaHead': 'Rather we checked it all for you?',
    'ctaSub': 'We can connect to your Windows PC and check the updates, backups and security settings while you watch. We '
              'tell you the price before we start. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What Be Ready is', 'The government&rsquo;s October 2026 campaign asking every home to cope for 3 days without '
                             'essential services.'),
        ('Why cyber attacks are on it', 'An attack can stop shops, banks, card payments or power. The National Cyber '
                                        'Security Centre expects more of them, helped by AI.'),
        ('The tech kit', 'A charged power bank, a battery or wind-up FM radio, some cash, and important numbers on paper.'),
        ('On your phone', 'Offline maps, Wi-Fi Calling switched on, and emergency contacts in Medical ID.'),
        ('Your accounts', 'A passkey, or a strong unique password plus two-step sign-in, starting with your email.'),
        ('Your computer', 'Automatic updates on, every program up to date, files backed up and a restore tried.'),
        ('Power cut number', '105 in England, Scotland and Wales. 03457 643643 in Northern Ireland.'),
        ('Fraud and cyber crime', 'Report Fraud on 0300 123 2040 (Police Scotland: 101). Your own bank: 159.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; THE SHORT ANSWER', 'h2': 'What Be Ready asks, and where your tech fits in',
         'html': '<p><strong>Be Ready</strong> is a government campaign, run by the Cabinet Office at '
                 '<a href="https://beready.campaign.gov.uk/" target="_blank" rel="noopener">beready.campaign.gov.uk</a>. '
                 'It asks every household to be ready to manage for <strong>3 days</strong> if power, water, the phone '
                 'network, the internet or card payments stop, so that help can reach the people who need it most. Most '
                 'outages are short and local. The campaign is about being ready for the rare long one.</p>'
                 '<p>Cyber attacks are on its list for a reason. In early November 2026 attackers changed the freezer '
                 'temperatures in more than 100 supermarkets across Europe, and the UK&rsquo;s National Cyber Security '
                 'Centre (NCSC) told British shops to update the same equipment. On 3 November the NCSC said an '
                 'AI-assisted ransomware attack on UK infrastructure is &ldquo;highly likely&rdquo; by 2028. In 2025 attacks '
                 'emptied Co-op shelves, stopped M&amp;S taking online orders for weeks and halted Jaguar Land Rover&rsquo;s '
                 'factories.</p>'
                 '<p>You can&rsquo;t stop an attack on a supermarket. You can make sure it doesn&rsquo;t become your '
                 'problem too: a phone that keeps working, accounts nobody else can get into, and files you can get '
                 'back. That is what this page is for.</p>'
                 '<p><small>We&rsquo;re an IT support company in Bournemouth, not the government. This is our own '
                 'practical guide, built on the official Be Ready advice and linked to it throughout.</small></p>'},
        {'eyebrow': '/02 &mdash; BEFORE ANYTHING HAPPENS', 'h2': 'The 15-minute digital kit',
         'html': '<p>Everything here is on the official list, or follows from it. None of it costs much, and most of it '
                 'is free.</p>'
                 '<ul>'
                 '<li><strong>A charged power bank.</strong> The official list names it, for phones and medical devices. '
                 'A 10,000 mAh one charges most phones about twice. Top it up every month or two: power banks slowly '
                 'drain in a drawer.</li>'
                 '<li><strong>A battery or wind-up FM radio.</strong> If the power, the internet and the phone network all '
                 'go, radio is how updates reach you. Write down the FM frequency of your local BBC station and keep it '
                 'with the radio.</li>'
                 '<li><strong>Important numbers on paper.</strong> Family, neighbours, your GP, your bank, your broadband '
                 'provider&rsquo;s fault line, your insurance policy number and <strong>105</strong> for power cuts. A dead '
                 'phone takes your contacts with it.</li>'
                 '<li><strong>Some cash</strong>, in coins and notes, in case card machines and cash points stop.</li>'
                 '<li><strong>Printed copies</strong> of passports, insurance details, a list of your medication and the '
                 'instructions for any medical equipment you rely on.</li>'
                 '<li><strong>Offline maps on your phone.</strong> Phone GPS can still work with no signal, but the map '
                 'needs downloading first. In Google Maps: tap your profile picture, then <strong>Offline maps</strong>, '
                 'then <strong>Select your own map</strong>. In Apple Maps: tap your picture or initials, then '
                 '<strong>Offline Maps</strong>.</li>'
                 '<li><strong>Wi-Fi Calling switched on.</strong> If the mobile network goes down but your broadband '
                 'works, your phone can still make ordinary calls over Wi-Fi. On an iPhone it is in Settings, under '
                 'Phone or Apps, then Phone. On Android it is in the Phone app&rsquo;s settings under Calls (the wording '
                 'varies).</li>'
                 '<li><strong>Emergency details on your phone.</strong> Medical ID on an iPhone (in the Health app) or '
                 'emergency information on Android lets paramedics see your contacts and medication without unlocking '
                 'it.</li>'
                 '</ul>'},
        {'eyebrow': '/03 &mdash; PRINT IT', 'h2': 'Your digital Be Ready checklist',
         'html': '<p>Tick it off once, then check it every six months, which is what the government suggests for the '
                 'rest of your emergency kit. The print button opens a plain black-and-white page to print or save as a '
                 'PDF.</p>' + _BR_LIST},
        {'eyebrow': '/04 &mdash; YOUR ACCOUNTS AND FILES', 'h2': 'The government&rsquo;s cyber steps, done properly',
         'html': '<p>The Be Ready <a href="https://beready.campaign.gov.uk/be-informed-about-hazards/cyber/" '
                 'target="_blank" rel="noopener">Cyber page</a> gives five steps. Here is each one, and how to actually '
                 'do it.</p>'
                 '<ol style="list-style:decimal;padding-left:1.4rem;display:grid;gap:.7rem;line-height:1.6">'
                 '<li><strong>Secure your email first.</strong> Your email can reset every other password, so it is the '
                 'account that matters most. Use a <a href="/what-is-a-passkey/">passkey</a> if your provider offers '
                 'one. If not, give it a long password you use nowhere else and switch on '
                 '<a href="/how-to-set-up-two-factor-authentication/">two-step sign-in</a>. Then do the same for your '
                 'bank, Amazon, PayPal and social media.</li>'
                 '<li><strong>Use a password manager.</strong> It makes a different password for every account and '
                 'remembers them all. It also refuses to fill in your password on a fake website, which makes it one of '
                 'the best defences against phishing. See <a href="/how-to-use-a-password-manager/">how to use a '
                 'password manager</a>. The ones built into Google, Microsoft Edge and Apple devices are fine. Rather we set one '
                 'up for you and move your passwords into it? See <a href="/password-manager-setup/">password manager setup</a>.</li>'
                 '<li><strong>Keep every device updated, automatically.</strong> On Windows: Settings, then Windows '
                 'Update, and turn on <em>Get the latest updates as soon as they&rsquo;re available</em>. Your programs '
                 'need updating too: our free <a href="/free-pc-health-check/">365 PC Manager</a> lists the out-of-date '
                 'ones and <a href="/update-all-your-programs/">updates them with one button</a>. Don&rsquo;t forget '
                 'the router, smart TV, cameras and doorbells: open their apps, turn on automatic updates and change '
                 'any password that is still the one it came with.</li>'
                 '<li><strong>Replace anything that no longer gets security updates.</strong> Windows 10&rsquo;s free '
                 'updates ended in October 2025, and the one-year extension for home PCs ended on 13 October 2026. Old '
                 'phones, tablets and routers stop getting fixes too. A device with no updates is an open door that will '
                 'never be closed. See our <a href="/windows-11-upgrade-service/">Windows 11 upgrade service</a> or '
                 '<a href="/is-it-safe-to-buy-a-refurbished-laptop/">buying a refurbished laptop</a>.</li>'
                 '<li><strong>Back up, protect the backup, and try a restore.</strong> Know where your photos and files '
                 'live: on the PC, in OneDrive or iCloud, or both. Keep at least one copy that ransomware can&rsquo;t '
                 'reach: an external drive you unplug afterwards, or cloud storage with version history. Then restore '
                 'one file to prove it works. A backup you&rsquo;ve never restored from is a hope, not a backup. See '
                 '<a href="/what-windows-backup-backs-up/">what Windows Backup actually saves</a> and '
                 '<a href="/cloud-backup/">cloud backup</a>.</li>'
                 '</ol>'
                 '<p><strong>Does AI change any of this?</strong> Not the defences. AI helps criminals write convincing '
                 'messages with no spelling mistakes, copy a voice from a few seconds of video and find unpatched '
                 'systems faster. The same five steps still stop them, plus one habit: when a message or call is '
                 'urgent, stop and check through a number or website you already know. Some families agree a '
                 '<strong>safe word</strong> for &ldquo;it&rsquo;s really me&rdquo; calls asking for money. More in our '
                 '<a href="/cyber-threats/">cyber attacks guide</a>.</p>'},
        {'eyebrow': '/05 &mdash; WHEN IT HAPPENS', 'h2': 'In a power cut, an outage or a cyber attack',
         'html': '<h3>A power cut</h3>'
                 '<ul>'
                 '<li><strong>Report it</strong> on your network operator&rsquo;s website, or call <strong>105</strong> '
                 '(England, Scotland and Wales) or <strong>03457 643643</strong> (Northern Ireland). Both are free.</li>'
                 '<li><strong>Unplug the computer and the TV.</strong> The official advice, because a surge when the power '
                 'returns can damage them. More in <a href="/will-a-power-cut-damage-my-computer/">will a power cut '
                 'damage my computer?</a></li>'
                 '<li><strong>Save your phone&rsquo;s battery:</strong> Low Power Mode or Battery Saver on, screen dimmer, '
                 'apps closed. Use a proper torch rather than the phone&rsquo;s.</li>'
                 '<li><strong>Your broadband stops</strong> because the router needs mains power. A small battery back-up '
                 'unit (a UPS) can keep the router and fibre box running, often for a few hours, as long as the network '
                 'beyond your home still has power.</li>'
                 '<li><strong>A digital landline stops in a power cut</strong> unless it has battery back-up. If you rely '
                 'on your landline or a personal alarm, your provider must give you a free battery unit if you are '
                 'vulnerable: see our <a href="/landline-switch-off-help/">landline switch-off help</a>.</li>'
                 '<li><strong>Emergencies:</strong> a 999 call from a mobile uses any network it can find, not just '
                 'yours.</li>'
                 '</ul>'
                 '<h3>Broadband or mobile down</h3>'
                 '<ul>'
                 '<li>Check whether it&rsquo;s just you: our free <a href="/is-it-down/">Is It Down? live check</a> and '
                 '<a href="/broadband-down/">broadband down</a> guide.</li>'
                 '<li>If the mobile network is down but the broadband works, Wi-Fi Calling still makes calls. If the '
                 'broadband is down, switch the phone to mobile data. Texts often get through when calls won&rsquo;t.</li>'
                 '<li>Moving a short distance, or trying a neighbour on a different network, can help.</li>'
                 '</ul>'
                 '<h3>A cyber attack on a company you use</h3>'
                 '<ul>'
                 '<li>Don&rsquo;t rush to change things. Check the company&rsquo;s own website or the news for what '
                 'happened and what it wants customers to do.</li>'
                 '<li><strong>Expect scams that use the news.</strong> Emails, texts and calls saying you&rsquo;re '
                 '&ldquo;affected&rdquo; and need to confirm details are common. Never use a link in the message: go to '
                 'the website or app yourself. Your bank will never ask you to move money to a &ldquo;safe '
                 'account&rdquo;. If in doubt, hang up and ring <strong>159</strong>.</li>'
                 '<li>If the company says your details were taken, follow <a href="/data-breaches/">our data breach '
                 'steps</a>.</li>'
                 '</ul>'
                 '<h3>Your own computer is attacked</h3>'
                 '<ul>'
                 '<li><strong>Files locked with a ransom note?</strong> Disconnect from the internet (Wi-Fi off or cable '
                 'out), don&rsquo;t pay, and get help: see <a href="/ransomware/">ransomware</a>.</li>'
                 '<li><strong>Someone controlling your screen?</strong> Pull the internet, then see '
                 '<a href="/gave-a-scammer-remote-access/">gave a scammer remote access</a>.</li>'
                 '<li><strong>Locked out of an account?</strong> See <a href="/i-think-ive-been-hacked/">I think '
                 'I&rsquo;ve been hacked</a>.</li>'
                 '<li><strong>Money gone?</strong> Your bank on 159 straight away, then Report Fraud on 0300 123 2040 '
                 '(in Scotland, Police Scotland on 101).</li>'
                 '</ul>'},
        {'eyebrow': '/06 &mdash; AFTERWARDS', 'h2': 'Getting back to normal',
         'html': '<ul>'
                 '<li><strong>When the power is back and steady</strong>, plug the computer in and start it. Let Windows '
                 'finish any updates it was in the middle of.</li>'
                 '<li><strong>Check your backup has started again.</strong> Backups often stop after a power cut or a '
                 'restart and nobody notices for months. 365 PC Manager tells you whether a backup is genuinely running, '
                 'not just installed.</li>'
                 '<li><strong>Recharge the power bank</strong> and put fresh batteries in the radio and torch.</li>'
                 '<li><strong>After an attack on a company you use</strong>, change your password there if it asks, and '
                 'anywhere you used the same password. Keep watching for scams for a few weeks.</li>'
                 '<li><strong>Lost files?</strong> Restore from your backup. If there is no backup, stop using the device '
                 'and call us before trying anything: the sooner, the more can usually be saved.</li>'
                 '</ul>'},
        {'eyebrow': '/07 &mdash; TECH WORTH HAVING', 'h2': 'What to buy for a power cut (and what to look for)',
         'html': '<p>You may have most of this already. If not, here is what to look for. The links are searches on '
                 'Amazon so you can compare.</p>'
                 '<ul>'
                 '<li><strong>Power bank:</strong> 10,000 mAh for one phone, 20,000 mAh for a family or a tablet. USB-C, '
                 'and ideally a charge level display. ' + _amzn('10000mah+power+bank+usb+c', 'Search power banks') + '</li>'
                 '<li><strong>Radio:</strong> FM, with a wind-up handle or batteries. Many also have a torch and a USB '
                 'socket to top up a phone. ' + _amzn('wind+up+fm+radio+torch', 'Search wind-up radios') + '</li>'
                 '<li><strong>Torch:</strong> battery or wind-up, with spare batteries. Safer than candles.</li>'
                 '<li><strong>A small UPS for the router (optional):</strong> a battery back-up unit of around 600 VA '
                 'runs a typical router and fibre box for an hour or more. It only helps if the network beyond your home '
                 'still has power. ' + _amzn('ups+600va+uninterruptible+power+supply', 'Search UPS units') + '</li>'
                 '</ul>'
                 '<p><small>As an Amazon Associate we earn from qualifying purchases. We don&rsquo;t list prices because '
                 'they change daily.</small></p>'},
        {'eyebrow': '/08 &mdash; FOR BUSINESSES', 'h2': 'Running a business? Your three days look different',
         'html': '<p>A business needs to keep trading, not just keep warm. That means knowing who to call, where your '
                 'data is, how to get it back, and how to keep working without the office, the internet or the '
                 'computers. Start with our <a href="/disaster-recovery/">business continuity plan and free template</a>, '
                 'then:</p>'
                 '<ul>'
                 '<li><a href="/business-continuity-internet/">A broadband emergency plan</a> for when the line goes '
                 'down.</li>'
                 '<li><a href="/cyber-essentials/">Cyber Essentials</a>, the government-backed scheme that blocks the most '
                 'common attacks.</li>'
                 '<li><a href="/business-hacked-emergency-help/">Business hacked? Emergency help</a> for the first '
                 'hour.</li>'
                 '</ul>'},
        {'eyebrow': '/09 &mdash; RATHER WE HELPED?', 'h2': 'When to call us', 'html': _CALL},
    ],
    'howToName': 'How to get your home digitally ready for a 3-day emergency',
    'howToSteps': [
        {'name': 'Charge a power bank', 'text': 'Keep a charged power bank and top it up every month or two.'},
        {'name': 'Write numbers on paper', 'text': 'Write down family, neighbours, your GP, your bank, your broadband provider and 105 for power cuts.'},
        {'name': 'Get an FM radio', 'text': 'Keep a battery or wind-up FM radio and note your local station frequencies.'},
        {'name': 'Prepare your phone', 'text': 'Download offline maps, switch on Wi-Fi Calling and add emergency contacts to Medical ID.'},
        {'name': 'Secure your email', 'text': 'Use a passkey, or a strong unique password with two-step sign-in, then do the same for banking and shopping.'},
        {'name': 'Turn on automatic updates', 'text': 'Update Windows, every program, your phone and smart devices, and replace anything no longer supported.'},
        {'name': 'Back up and test', 'text': 'Back up photos and files, keep one copy unplugged or in versioned cloud storage, and restore a file to test it.'},
        {'name': 'Keep cash and copies', 'text': 'Keep some cash and printed copies of important documents.'},
    ],
    'faqs': [
        {'q': 'What is the Be Ready campaign?',
         'a': '<p>A UK government campaign launched in late October 2026 by the Cabinet Office. It asks every household to '
              'be ready to manage for 3 days without essential services such as power, water, the phone network, the '
              'internet or card payments, &ldquo;from severe weather to cyber attacks&rdquo;. The official site is '
              'beready.campaign.gov.uk.</p>'},
        {'q': 'What does the government say to put in an emergency kit?',
         'a': '<p>3 litres of bottled water per person per day for 3 days, food that needs no fridge or cooking, a torch '
              'and spare batteries, blankets and warm clothes, a battery or wind-up FM radio, a charged power bank, cash, '
              'copies of important documents, important phone numbers on paper, a first aid kit and your essential '
              'medication, plus anything for babies and pets.</p>'},
        {'q': 'Does Be Ready mean a cyber attack is expected?',
         'a': '<p>No specific attack has been announced. The campaign covers every kind of emergency, from storms to '
              'cyber attacks. The National Cyber Security Centre does expect attacks to grow, saying in November 2026 '
              'that an AI-assisted ransomware attack on UK infrastructure is highly likely by 2028.</p>'},
        {'q': 'Will my phone work in a power cut?',
         'a': '<p>A mobile usually keeps working for a while, but the local mast may lose power in a long or wide '
              'power cut. A digital landline stops working unless it has battery back-up. A 999 call from a mobile will '
              'use any network it can reach.</p>'},
        {'q': 'Will my internet work in a power cut?',
         'a': '<p>Not on its own, because your router and fibre box need mains power. A small battery back-up unit '
              '(UPS) can keep them going, often for a few hours, if the network beyond your home still has power. '
              'Otherwise use your phone&rsquo;s mobile data while the mast has power.</p>'},
        {'q': 'How do I protect myself from cyber attacks at home?',
         'a': '<p>Secure your email with a passkey or two-step sign-in, use a password manager, turn on automatic updates '
              'for every device and program, replace anything that no longer gets security updates, and back up your '
              'files and test a restore. Those are the government&rsquo;s own Be Ready cyber steps.</p>'},
        {'q': 'Can AI hackers get into my computer?',
         'a': '<p>AI makes scams more convincing and helps attackers find unpatched systems faster, but it doesn&rsquo;t '
              'get round the basics. An updated computer, passkeys or two-step sign-in, and a habit of checking urgent '
              'requests through a number you already know stop the vast majority of attacks.</p>'},
        {'q': 'What should I do if a shop or bank I use is hacked?',
         'a': '<p>Check the company&rsquo;s own website for what it wants customers to do. Don&rsquo;t use links in '
              'emails or texts about it. Change your password there and anywhere you reused it, and expect scam calls '
              'that quote your details. Our data breach guide has the steps in order.</p>'},
        {'q': 'Where do I report fraud or cyber crime?',
         'a': '<p>Report Fraud, on 0300 123 2040 or at reportfraud.police.uk, for England, Wales and Northern Ireland. '
              'In Scotland, call Police Scotland on 101. If money has gone, ring your bank on 159 first.</p>'},
        {'q': 'Is this page from the government?',
         'a': '<p>No. 365 Techies is an IT support company in Bournemouth. This is our own guide to the digital side of '
              'the government&rsquo;s Be Ready advice, with links to the official pages.</p>'},
    ],
    'crossLinksHtml': '<p>The official advice: <a href="https://beready.campaign.gov.uk/" target="_blank" rel="noopener">Be '
                      'Ready</a>, including its pages on <a href="https://beready.campaign.gov.uk/be-informed-about-hazards/'
                      'power-cuts/" target="_blank" rel="noopener">power cuts</a> and <a href="https://beready.campaign.gov.uk/'
                      'be-informed-about-hazards/phone-broadband-outages/" target="_blank" rel="noopener">phone and broadband '
                      'outages</a>. Ours: <a href="/cyber-threats/">cyber attacks in the UK</a>, <a href="/data-breaches/">found '
                      'in a data breach?</a>, <a href="/is-it-down/">is it down?</a>, <a href="/disaster-recovery/">business '
                      'continuity plan</a> and <a href="/online-safety/">the online safety hub</a>.</p>',
})


# ====================================================================== 2. /cyber-threats/ (hub rebuilt)
CT_TITLE = 'Cyber Attacks in the UK: What&rsquo;s Happening, How to Stay Safe'
CT_DESC = ('Cyber attacks in the UK, explained: what a cyber attack is, the latest attacks, how AI is changing them, and '
           'the eight steps that keep you safe.')
CT_OG = 'Cyber attacks in the UK: what&rsquo;s happening, and how to stay safe'
CT_H1 = 'Cyber attacks in the UK: <em class="grad grad--green">what&rsquo;s happening, and how to stay safe</em>'
CT_LEDE = ('Cyber attacks are in the news almost every week: shops, car makers, airports and, this month, supermarket '
           'freezers. Here&rsquo;s what a cyber attack actually is, what has been happening in the UK, what it means for '
           'you at home or at work, and the handful of steps that protect you from nearly all of it. Updated 18 November '
           '2026.')
CT_CHIPS = ['Updated 18 November 2026', 'Plain English', 'Home &amp; business']

_CT_LATEST = [
    ('November 2026', 'Supermarket freezers attacked',
     'Attackers changed the temperature settings in the freezers of more than 100 supermarkets across Europe, spoiling '
     'food. The NCSC told UK shops to update the software on their fridge controllers. Nothing for you to do at home, '
     'but it is a reminder that anything connected, including your own smart devices, needs updates and a password that '
     'isn&rsquo;t the one it came with.'),
    ('12&ndash;13 November 2026', 'Microsoft 365 outage: not a hack',
     'Outlook, Teams and OneDrive failed worldwide for up to 18 hours. Microsoft said it found no malicious activity: its '
     'servers were overwhelmed. See <a href="/is-outlook-down/">is Outlook down?</a>'),
    ('3 November 2026', 'The NCSC&rsquo;s warning about AI',
     'The National Cyber Security Centre&rsquo;s yearly report said an AI-assisted ransomware attack on UK infrastructure '
     'is &ldquo;highly likely&rdquo; by 2028. It said AI mostly makes existing attacks (scams, ransomware, exploiting '
     'unpatched systems) faster and larger. It handled 1,831 reports in the year to September 2026, 337 of them needing '
     'its direct support.'),
    ('Late October 2026', 'The government&rsquo;s Be Ready campaign',
     'Every household is asked to be ready for 3 days without essential services, &ldquo;from severe weather to cyber '
     'attacks&rdquo;. Our <a href="/be-ready-digital-checklist/">Be Ready digital checklist</a> covers the tech side.'),
    ('October 2026', 'ASOS customer data',
     'ASOS said basic personal information and contact details may have been accessed after a staff login was stolen. '
     'It said it doesn&rsquo;t believe card details or passwords were affected. See <a href="/data-breaches/">found in a '
     'data breach?</a>'),
    ('August 2026', 'Manchester Airports Group',
     'About 8.7 million customers of Manchester, Stansted and East Midlands airports were told that email addresses, phone '
     'numbers, vehicle registrations and postcodes had been exposed. No payment details were held in that system, the '
     'company said.'),
    ('2025', 'M&amp;S, Co-op and Jaguar Land Rover',
     'Attacks stopped M&amp;S online orders for weeks and took customer contact details, took the details of all 6.5 '
     'million Co-op members and emptied shelves, and halted Jaguar Land Rover&rsquo;s factories for over a month.'),
]

CT_LATEST_HTML = ('''    <section class="section" aria-label="What is happening now" id="latest">
      <div class="wrap" style="max-width:920px">
        <style>
        .ctl{list-style:none;margin:0;padding:0;display:grid;gap:.8rem}
        .ctl li{border:1px solid var(--line);border-radius:14px;background:var(--glass);padding:1rem 1.2rem}
        .ctl__d{display:block;font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:.2rem}
        .ctl__t{display:block;font-weight:700;font-size:1.08rem;margin-bottom:.3rem;color:var(--ink)}
        .ctl p{margin:0;line-height:1.55}
        .ctl a{color:var(--cyan);text-decoration:underline;text-underline-offset:2px}
        </style>
        <p class="eyebrow mono" data-reveal>// LATEST &middot; UPDATED 18 NOVEMBER 2026</p>
        <h2 class="section-title" data-title>What&rsquo;s been happening<span class="title-underline"></span></h2>
        <ol class="ctl" data-reveal>
''' + "\n".join('          <li><span class="ctl__d">' + d + '</span><span class="ctl__t">' + t + '</span><p>' + x + '</p></li>'
               for d, t, x in _CT_LATEST) + '''
        </ol>
      </div>
    </section>''')

CT_GUIDE_HTML = '''    <section class="section section--alt" aria-label="What a cyber attack is" id="what-is">
      <div class="wrap prose" data-reveal>
        <p class="eyebrow mono">// THE BASICS</p>
        <h2 class="section-title" data-title>What is a cyber attack?<span class="title-underline"></span></h2>
        <p>A cyber attack is any attempt to break into, damage, steal from or shut down computers, accounts or networks.
        Most are about money. The ones that make the news are usually one of four kinds:</p>
        <ul>
          <li><strong>Ransomware:</strong> files or whole systems are locked and a payment is demanded. This is what stopped
          shops and factories in 2025. <a href="/ransomware/">More on ransomware</a>.</li>
          <li><strong>Data theft:</strong> customer details are copied and sold or published, which leads to targeted scams.
          <a href="/data-breaches/">What to do if you&rsquo;re in a breach</a>.</li>
          <li><strong>Phishing and scams:</strong> fake emails, texts and calls that trick people into handing over passwords
          or money. Most big attacks start this way, often by fooling a member of staff.
          <a href="/phishing/">More on phishing</a>.</li>
          <li><strong>Knocking services offline:</strong> flooding a website until it falls over, or tampering with
          connected equipment, like this month&rsquo;s supermarket freezers.</li>
        </ul>
        <p><strong>Two kinds reach you.</strong> Attacks on companies you use (you can&rsquo;t prevent those, but you can
        stop them spreading to your other accounts), and attacks aimed at you directly through scams and weak passwords
        (those you can prevent almost entirely).</p>

        <h2 id="means">What it means for you</h2>
        <p><strong>At home:</strong> you are very unlikely to be &ldquo;hacked&rdquo; in the film sense. The real risks are a
        reused password from a breach opening your email, a convincing scam call after a breach, a computer that has
        stopped getting updates, and losing your photos with no backup. Every one of those has a simple fix, below.</p>
        <p><strong>At work:</strong> most attacks on small businesses start with an email: a fake invoice, a fake Microsoft
        sign-in page, or a supplier whose bank details have &ldquo;changed&rdquo;. The protection is the same as at home,
        plus a plan for keeping going if the worst happens: see our
        <a href="/disaster-recovery/">business continuity plan and free template</a> and
        <a href="/cyber-essentials/">Cyber Essentials</a>.</p>

        <h2 id="ai">Is AI making cyber attacks worse?</h2>
        <p>Yes, but mostly by making old tricks faster and more convincing, which is also what the NCSC says. In practice:</p>
        <ul>
          <li><strong>Scam emails and texts with no spelling mistakes</strong>, in perfect English, that mention your name or
          a real order. Bad grammar is no longer a reliable warning sign.</li>
          <li><strong>Cloned voices.</strong> A few seconds of someone&rsquo;s voice from a video is enough to fake a call
          from a relative asking for money. Agree a family safe word, and call back on the number you know.</li>
          <li><strong>Unpatched systems found faster.</strong> Attackers use AI to find computers and devices that have
          missed security updates. Automatic updates matter more than ever.</li>
        </ul>
        <p>The defences don&rsquo;t change: updates, passkeys or two-step sign-in, backups, and checking anything urgent
        through a number or website you already know. Our <a href="/using-ai-safely/">using AI safely</a> guide covers the
        other side: using AI tools yourself without the risks.</p>

        <h2 id="steps">The eight steps that stop most attacks</h2>
        <p>These follow the government&rsquo;s Be Ready cyber advice and the NCSC. Do the first three today.</p>
        <ol style="list-style:decimal;padding-left:1.4rem;display:grid;gap:.55rem;line-height:1.6">
          <li><strong>Secure your email</strong> with a <a href="/what-is-a-passkey/">passkey</a>, or a unique password and
          <a href="/how-to-set-up-two-factor-authentication/">two-step sign-in</a>.</li>
          <li><strong>Use a <a href="/how-to-use-a-password-manager/">password manager</a></strong>, so one breach can&rsquo;t
          open your other accounts. It also won&rsquo;t fill in your password on a fake site. Or
          <a href="/password-manager-setup/">we&rsquo;ll set one up for you</a>.</li>
          <li><strong>Turn on automatic updates</strong> for Windows, your phone and every program. Our free
          <a href="/free-pc-health-check/">365 PC Manager</a> <a href="/update-all-your-programs/">updates all your programs
          with one button</a>.</li>
          <li><strong>Replace devices that no longer get security updates</strong>, including old routers and Windows 10
          PCs.</li>
          <li><strong>Back up</strong> your photos and files, keep one copy unplugged or in versioned cloud storage, and test
          a restore.</li>
          <li><strong>Pause before you click.</strong> Urgency is the scammer&rsquo;s main tool. Practise with our
          <a href="/spot-the-scam/">Spot the Scam quiz</a> or check a link with the
          <a href="/link-safety-checker/">link safety checker</a>.</li>
          <li><strong>Change default passwords</strong> on your router, cameras and smart devices, and turn on their updates.</li>
          <li><strong>Know who to call:</strong> your bank on 159, Report Fraud on 0300 123 2040 (Scotland: 101), and us on
          01202 775566.</li>
        </ol>
        <p>Prefer it as a list to tick off? Our <a href="/be-ready-digital-checklist/">Be Ready digital checklist</a> prints
        on one page, and the <a href="/cybersecurity-checklist/">cybersecurity checklist</a> goes into more detail.</p>

        <h2 id="check">&ldquo;Has it been hacked?&rdquo; How to check</h2>
        <ul>
          <li><strong>A company:</strong> look at its own website or newsroom, or a trusted news site. A real company tells
          customers what to do. Ignore messages that say you&rsquo;re affected and ask you to click or confirm details.</li>
          <li><strong>Your email address:</strong> Have I Been Pwned lists many large breaches.
          <a href="/data-breaches/">What to do if it lists you</a>.</li>
          <li><strong>A website or app that won&rsquo;t work:</strong> it may be an outage, not an attack. Our live
          <a href="/is-it-down/">Is It Down?</a> check covers 30 services, including the big UK banks.</li>
          <li><strong>Your own account:</strong> signs include a password that stopped working, sign-in alerts you
          didn&rsquo;t cause, sent emails you didn&rsquo;t write and friends getting odd messages from you.
          <a href="/i-think-ive-been-hacked/">Take back control, step by step</a>.</li>
        </ul>
      </div>
    </section>'''

CT_FAQS = [
    ('What is a cyber attack?',
     'Any attempt to break into, damage, steal from or shut down computers, accounts or networks. The common kinds are '
     'ransomware, data theft, phishing and scams, and attacks that knock services offline. Most are about money.'),
    ('Are cyber attacks increasing in the UK?',
     'Yes. The National Cyber Security Centre handled 1,831 reports in the year to September 2026, 337 of them needing its '
     'direct support, and it expects AI to make attacks faster and larger. In November 2026 it said an AI-assisted '
     'ransomware attack on UK infrastructure is highly likely by 2028.'),
    ('How do I protect myself from cyber attacks?',
     'Secure your email with a passkey or two-step sign-in, use a password manager, turn on automatic updates, replace '
     'devices that no longer get security updates, back up your files and test a restore, and pause before acting on '
     'anything urgent.'),
    ('Is AI being used in cyber attacks?',
     'Yes. Criminals use AI to write convincing scam messages, clone voices and find unpatched systems faster. The same '
     'defences still work: updates, passkeys or two-step sign-in, backups, and checking urgent requests through a number '
     'you already know.'),
    ('Has Microsoft been hacked?',
     'No. The Microsoft 365 outage of 12 and 13 November 2026 was not a hack: Microsoft said it found no malicious activity '
     'and that its servers were overwhelmed. See our <a href="/is-outlook-down/">is Outlook down?</a> page.'),
    ('What should I do if a company I use is hacked?',
     'Follow the company&rsquo;s own advice from its website, not links in emails. Change your password there and anywhere '
     'you reused it, switch on two-step sign-in, and expect scam calls and emails that quote your details. Our '
     '<a href="/data-breaches/">data breach guide</a> has the steps in order.'),
    ('Who do I report a cyber attack to?',
     'Report Fraud, on 0300 123 2040 or at reportfraud.police.uk, for England, Wales and Northern Ireland; Police Scotland '
     'on 101 in Scotland. If money has gone, call your bank on 159 first. Businesses that lose personal data may also need '
     'to tell the ICO within 72 hours.'),
    ('What does the Be Ready campaign say about cyber attacks?',
     'It lists cyber attacks among the emergencies to prepare for, and its cyber steps are: use passkeys, strong unique '
     'passwords and two-step verification, a password manager, automatic updates on every device, replace unsupported '
     'devices, and back up and test a restore. Our <a href="/be-ready-digital-checklist/">Be Ready digital checklist</a> '
     'turns them into steps.'),
]


# ====================================================================== 3. /disaster-recovery/ (business continuity)
DR_TITLE = 'Free Business Continuity Plan Template for Small Businesses'
DR_CRUMB = 'Business Continuity &amp; Disaster Recovery'
DR_H1 = 'Business continuity plan: <em class="grad grad--green">a free template</em>, and the backups to make it work'
DR_LEDE = ('A business continuity plan is a short document that says how you keep trading when something goes wrong: a '
           'cyber attack, a dead server, a power cut, a flood or a lost laptop. Here&rsquo;s what goes in one, a free '
           'template you can print and fill in today, and how we make sure the backups behind it actually work.')
DR_DESC = ('What a business continuity plan is, what to put in it, and a free printable template for small businesses. '
           'Plus tested backups and disaster recovery.')
DR_OG = 'Business continuity plan: a free template for small businesses'
DR_CHIPS = ['Free printable template', 'Written for small businesses', 'Tested backups behind it']

DR_PRE = '''    <section class="section section--alt" aria-label="At a glance">
      <div class="wrap" data-reveal>
        <div class="section-head"><h2 class="section-title section-title--center">At a glance<span class="title-underline title-underline--center"></span></h2></div>
        <div class="price-table-wrap" tabindex="0" role="group" aria-label="At a glance (scrolls sideways on a small screen)"><table class="price-table price-table--facts"><tbody>
              <tr><th scope="row">What it is</th><td>A few pages saying who does what, and how you keep trading, when something stops you working.</td></tr>
              <tr><th scope="row">Who needs one</th><td>Every business, including sole traders. Many cyber insurers and larger customers now ask for one.</td></tr>
              <tr><th scope="row">How long it takes</th><td>An afternoon for a first version with the template below. An hour a year to review it.</td></tr>
              <tr><th scope="row">The three parts that matter most</th><td>Who to call. Where your data is and how to get it back. How to keep working without the office, the internet or the computers.</td></tr>
              <tr><th scope="row">The part most people skip</th><td>Testing it. A 30-minute &ldquo;what if?&rdquo; walk-through and one test restore from your backup.</td></tr>
              <tr><th scope="row">Continuity vs recovery</th><td>Business continuity keeps the business going. Disaster recovery gets the IT back. You need both.</td></tr>
            </tbody></table></div>
      </div>
    </section>'''

DR_INNER = '''          <h2 id="what">What is a business continuity plan?</h2>
          <p>A business continuity plan (often shortened to BCP) is a written plan for keeping your business running when
          something goes wrong. It doesn&rsquo;t need to be long. For a small business, a few pages that anyone in the team
          can pick up and follow are far more useful than a thick binder nobody has read.</p>
          <p>It answers four questions: <strong>what must keep running</strong>, <strong>who does what</strong>,
          <strong>where your data is and how to get it back</strong>, and <strong>how you&rsquo;ll keep working</strong> if
          the office, the internet, the computers or a key person aren&rsquo;t available.</p>

          <h2 id="vs">Business continuity vs disaster recovery</h2>
          <p><strong>Business continuity</strong> is about the business: keeping customers served, staff paid and orders
          moving. <strong>Disaster recovery</strong> is about the IT: restoring files, systems and email after a failure or
          an attack. A continuity plan without working backups is a list of good intentions; backups without a plan leave
          everyone asking what to do first. That&rsquo;s why this page covers both.</p>

          <h2 id="contents">What to put in it</h2>
          <ol style="list-style:decimal;padding-left:1.4rem;display:grid;gap:.5rem;line-height:1.6">
            <li><strong>Who&rsquo;s in charge</strong> when something goes wrong, and their deputy.</li>
            <li><strong>Emergency contacts</strong>: staff, your IT support, your insurer&rsquo;s helpline and policy number,
            your bank, your landlord, your broadband provider and the power cut line (105).</li>
            <li><strong>Your critical activities</strong>: the three or four things that must keep happening, and how long
            you could manage without each.</li>
            <li><strong>Your systems and data</strong>: what you use (email, Microsoft 365, accounts software, a website),
            where the data lives, who has the admin passwords, how it&rsquo;s backed up and when a restore was last tested.</li>
            <li><strong>How to work without</strong> the office, the internet, the computers or card payments.</li>
            <li><strong>Who tells whom</strong>: staff, customers and suppliers, with a short message ready to send, and a
            copy of the contact list that isn&rsquo;t only on the computer.</li>
            <li><strong>Cyber incident first steps</strong>, so nobody has to think in a panic (see below).</li>
            <li><strong>A review date and a test log.</strong></li>
          </ol>
          <p>The free template further down this page has a box for each.</p>

          <h2 id="disasters">The five disasters to plan for</h2>
          <ul>
            <li><strong>A cyber attack or ransomware.</strong> The most likely serious one for a small business today.</li>
            <li><strong>IT failure.</strong> A server, a laptop or a key piece of software dies, or a supplier goes bust
            (see <a href="/it-provider-gone-bust/">IT provider gone bust</a>).</li>
            <li><strong>No internet or no power.</strong> See our <a href="/business-continuity-internet/">broadband
            emergency plan</a> and <a href="/emergency-internet/">365 Emergency Internet</a>.</li>
            <li><strong>Losing the premises</strong> to fire, flood or a break-in.</li>
            <li><strong>Losing a key person</strong>, including the one person who knows the passwords (see
            <a href="/employee-left-dont-know-computer-password/">employee left, don&rsquo;t know the password</a>).</li>
          </ul>
          <p>The government&rsquo;s <a href="/be-ready-digital-checklist/">Be Ready campaign</a> asks households to manage for 3
          days without essential services. It&rsquo;s a good test for a business too: could you keep going for 3 days?</p>

          <h2 id="ransomware">Ransomware: the first hour</h2>
          <ol style="list-style:decimal;padding-left:1.4rem;display:grid;gap:.5rem;line-height:1.6">
            <li><strong>Disconnect</strong> affected computers from the network and the internet. Don&rsquo;t switch them
            off unless your IT support says to: what&rsquo;s in memory can help the investigation.</li>
            <li><strong>Call your cyber insurer&rsquo;s helpline first</strong> if you have cover. Many policies require it
            before you do anything else.</li>
            <li><strong>Call your IT support.</strong> Ours is 01202 775566, and our
            <a href="/business-hacked-emergency-help/">business hacked page</a> has the steps.</li>
            <li><strong>Don&rsquo;t pay.</strong> UK police and the NCSC advise against it: it funds crime and doesn&rsquo;t
            guarantee anything back. Tested backups are what make refusing possible.</li>
            <li><strong>Report it</strong> to Report Fraud on 0300 123 2040 (Police Scotland on 101 in Scotland).</li>
            <li><strong>Personal data involved?</strong> You may need to tell the ICO within 72 hours of finding out (ICO
            helpline 0303 123 1113).</li>
          </ol>

          <h2 id="test">How to test your plan in 30 minutes</h2>
          <p>Get the people who&rsquo;d be involved round a table. Pick one scenario (&ldquo;it&rsquo;s Monday morning and
          every file says it&rsquo;s been encrypted&rdquo;) and walk through the plan step by step: who do we call, where are
          the numbers, how do we take payments, what do we tell customers? Note every gap and fix it. The NCSC&rsquo;s free
          <a href="https://www.ncsc.gov.uk/information/exercise-in-a-box" target="_blank" rel="noopener">Exercise in a Box</a>
          provides ready-made scenarios. Then <strong>restore one real file from your backup</strong>. If that doesn&rsquo;t
          work, nothing else in the plan will.</p>

          <h2 id="cyber-essentials">Do you need a plan for Cyber Essentials or insurance?</h2>
          <p>Cyber Essentials doesn&rsquo;t ask for a continuity plan or backups: it checks five technical controls that
          block most common attacks. Many cyber insurers do ask about backups and incident plans, and UK GDPR expects you to
          protect personal data and be able to restore it. See <a href="/cyber-essentials/">Cyber Essentials</a> and
          <a href="/gdpr-it-compliance/">GDPR and IT compliance</a>.</p>'''

_DR_TEMPLATE_BODY = '''<div class="bct" id="bct-sheet">
<h3>1. About this plan</h3>
<table><tbody>
<tr><th>Business name</th><td><span class="fill">&nbsp;</span></td></tr>
<tr><th>Plan owner (in charge in an incident)</th><td><span class="fill">&nbsp;</span></td></tr>
<tr><th>Deputy</th><td><span class="fill">&nbsp;</span></td></tr>
<tr><th>Last updated / next review</th><td><span class="fill">&nbsp;</span></td></tr>
</tbody></table>
<h3>2. Emergency contacts</h3>
<table><thead><tr><th>Who</th><th>Name</th><th>Phone</th></tr></thead><tbody>
<tr><td>IT support</td><td>&nbsp;</td><td>&nbsp;</td></tr>
<tr><td>Cyber insurer helpline / policy number</td><td>&nbsp;</td><td>&nbsp;</td></tr>
<tr><td>Bank (fraud line)</td><td>&nbsp;</td><td>159 or the number on your card</td></tr>
<tr><td>Broadband provider (faults)</td><td>&nbsp;</td><td>&nbsp;</td></tr>
<tr><td>Landlord / building</td><td>&nbsp;</td><td>&nbsp;</td></tr>
<tr><td>Power cut</td><td>Your network operator</td><td>105 (NI: 03457 643643)</td></tr>
<tr><td>Report Fraud (cyber crime)</td><td>England, Wales, NI</td><td>0300 123 2040 (Scotland: 101)</td></tr>
<tr><td>ICO (personal data breach)</td><td>Information Commissioner&rsquo;s Office</td><td>0303 123 1113</td></tr>
</tbody></table>
<h3>3. Critical activities</h3>
<table><thead><tr><th>What must keep happening</th><th>Longest we can go without it</th><th>Who looks after it</th></tr></thead><tbody>
<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
</tbody></table>
<h3>4. Systems and data</h3>
<table><thead><tr><th>System (email, accounts, files, website)</th><th>Where the data lives</th><th>Who has admin access</th><th>Backed up how / last restore test</th></tr></thead><tbody>
<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
</tbody></table>
<h3>5. How we keep working without&hellip;</h3>
<table><tbody>
<tr><th>The office</th><td><span class="fill">&nbsp;</span></td></tr>
<tr><th>The internet</th><td><span class="fill">&nbsp;</span></td></tr>
<tr><th>Our computers</th><td><span class="fill">&nbsp;</span></td></tr>
<tr><th>Card payments</th><td><span class="fill">&nbsp;</span></td></tr>
<tr><th>A key person</th><td><span class="fill">&nbsp;</span></td></tr>
</tbody></table>
<h3>6. Who tells whom</h3>
<table><tbody>
<tr><th>Staff are told by</th><td><span class="fill">&nbsp;</span></td></tr>
<tr><th>Customers are told by / how</th><td><span class="fill">&nbsp;</span></td></tr>
<tr><th>Suppliers are told by</th><td><span class="fill">&nbsp;</span></td></tr>
<tr><th>Paper copy of contact lists kept at</th><td><span class="fill">&nbsp;</span></td></tr>
</tbody></table>
<h3>7. Cyber incident: first steps</h3>
<ul>
<li>Disconnect affected computers from the network and internet (don&rsquo;t switch off unless told)</li>
<li>Call the cyber insurer&rsquo;s helpline, if we have cover</li>
<li>Call IT support</li>
<li>Don&rsquo;t pay a ransom</li>
<li>Report to Report Fraud, 0300 123 2040 (Scotland: Police Scotland, 101)</li>
<li>Personal data involved? Decide on telling the ICO within 72 hours</li>
<li>Tell staff not to use email or shared files until IT says so</li>
</ul>
<h3>8. Test log</h3>
<table><thead><tr><th>Date</th><th>What we tested</th><th>What we fixed</th></tr></thead><tbody>
<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
</tbody></table>
</div>'''

DR_TEMPLATE = ('''    <section class="section" aria-label="Free business continuity plan template" id="template">
      <div class="wrap" style="max-width:960px">
        <style>
        .bct{border:1px solid var(--line);border-radius:16px;background:var(--glass);padding:1.1rem 1.3rem;margin:1rem 0}
        .bct h3{margin:1.1rem 0 .4rem;font-size:1.05rem}
        .bct h3:first-child{margin-top:0}
        .bct table{width:100%;border-collapse:collapse;margin:.2rem 0 .4rem;font-size:.95rem}
        .bct th,.bct td{border:1px solid var(--line);padding:.45rem .55rem;text-align:left;vertical-align:top}
        .bct thead th{color:var(--muted);font-weight:600}
        .bct tbody th{width:38%;font-weight:600}
        .bct ul{list-style:none;padding:0;margin:0}
        .bct li{position:relative;padding:.25rem 0 .25rem 1.9rem;line-height:1.5}
        .bct li:before{content:"";position:absolute;left:.1rem;top:.5rem;width:1rem;height:1rem;border:2px solid var(--muted);border-radius:4px}
        .bct .fill{display:inline-block;min-width:60%}
        @media (max-width:640px){.bct{padding:.8rem}.bct th,.bct td{padding:.35rem;font-size:.88rem}}
        </style>
        <p class="eyebrow mono" data-reveal>// FREE TEMPLATE</p>
        <h2 class="section-title" data-title>Free business continuity plan template<span class="title-underline"></span></h2>
        <p>Print it, fill it in by hand, and keep one copy at work and one at home. Or save it as a PDF and type into it.
        It fits on two sides of A4. Keep a paper copy: a plan that lives only on the computer is no use when the computer
        is the problem.</p>
        <p class="no-print"><button type="button" class="button primary" id="bct-print">Print the template</button></p>
        <div class="price-table-wrap" tabindex="0" role="group" aria-label="Business continuity plan template (scrolls sideways on a small screen)">
''' + _DR_TEMPLATE_BODY + '''
        </div>
''' + _print_js('bct-print', 'bct-sheet', 'Business continuity plan',
                'Free template from 365techies.co.uk/disaster-recovery/. Review it every year and after any change of staff, systems or premises.') + '''
      </div>
    </section>''')

DR_HELP = '''    <section class="section section--alt" aria-label="How we help">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// DISASTER RECOVERY FROM 365 TECHIES</p>
          <h2 class="section-title section-title--center" data-title>The backups behind the plan<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>A plan only works if the data comes back. This is the part we do for businesses across Dorset and, remotely, the UK.</p>
        </div>
        <ul class="security-grid" data-stagger>
__CARDS__
        </ul>
        <p style="text-align:center;margin-top:1.4rem" data-reveal>For any business that can&rsquo;t afford to lose its data or stop trading, especially <a href="/it-support-for-solicitors/">solicitors</a>, <a href="/it-support-for-accountants-dorset/">accountants</a>, <a href="/it-support-for-care-homes/">care homes</a>, <a href="/it-support-for-sole-traders/">sole traders</a> and <a href="/it-support-for-dental-medical/">dental &amp; medical practices</a>. It builds on our <a href="/backup-support/">backup &amp; recovery</a> and <a href="/cybersecurity-support/">cybersecurity</a> services.</p>
      </div>
    </section>'''

DR_CARDS = [
    ("Verified backups", "Automatic, off-site, regularly tested backups so your data is always recoverable."),
    ("Ransomware rollback", "Versioned, protected backups let us roll back to before an attack."),
    ("Rapid recovery", "We restore files, systems or whole setups quickly to keep downtime short."),
    ("Cloud failover", "Keep working from the cloud while we rebuild your on-site systems."),
    ("Your continuity plan", "We write it with you, using the template on this page, around how your business really works."),
    ("Regular testing", "We test recovery so it actually works when it matters most."),
]

DR_FAQS = [
    ("What is a business continuity plan?",
     "A short written plan for keeping your business running when something goes wrong, such as a cyber attack, IT "
     "failure, power cut or flood. It says who is in charge, who to call, where your data is and how to get it back, and "
     "how you&rsquo;ll keep working."),
    ("What is the difference between business continuity and disaster recovery?",
     "Business continuity keeps the business trading: customers served, staff paid, orders moving. Disaster recovery "
     "restores the IT: files, systems and email. A good plan covers both."),
    ("Does a small business need a business continuity plan?",
     "Yes. Small businesses have the least slack when something goes wrong, and many cyber insurers and larger customers "
     "now ask for one. For a small firm it can be a few pages: the template on this page is enough to start."),
    ("What should a business continuity plan include?",
     "Who&rsquo;s in charge, emergency contacts, your critical activities, your systems and data with how they&rsquo;re "
     "backed up, how to work without the office, internet or computers, who tells customers and staff, cyber incident "
     "first steps, and a review and test log."),
    ("How often should a business continuity plan be tested?",
     "At least once a year, and after any big change of staff, systems or premises. A 30-minute walk-through of one "
     "scenario plus one test restore from your backup is enough for most small businesses."),
    ("Is a business continuity plan required for Cyber Essentials?",
     "No. Cyber Essentials checks five technical controls that block common attacks; it doesn&rsquo;t ask for a continuity "
     "plan or backups. Insurers often do, and UK GDPR expects you to be able to restore personal data."),
    ("Who do I report a cyber attack on my business to?",
     "Report Fraud on 0300 123 2040 (Police Scotland on 101 in Scotland). If personal data was involved, you may need to "
     "tell the ICO within 72 hours. Call your cyber insurer&rsquo;s helpline first if you have cover."),
    ("Can you write our business continuity plan?",
     "Yes. We write it with you as part of our business support, set up the tested backups behind it, and run the yearly "
     "test. Call 01202 775566 and we&rsquo;ll tell you the price before we start."),
]
