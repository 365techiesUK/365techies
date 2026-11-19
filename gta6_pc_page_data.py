# -*- coding: utf-8 -*-
"""/is-gta-6-on-pc/ (19 Nov 2026, GTA VI launch day). Owner: "build all of that and get it all done".

Why: Bing Keyword Research, UK, 3 months to 15 Nov 2026 (before launch day): gta 6 96,187 (weekly 5.5K -> 23.5K); the PC
questions ~8K together and x3-4 in the last weeks (gta 6 pc 2,487, gta 6 pc release date 2,553, gta 6 release date pc 954,
when is gta 6 coming out on pc 779, gta 6 pc release 590, when will gta 6 release on pc 561, is gta 6 on pc 149);
gta 6 download 467 (weekly 7 -> 168). PC owners can't play it, and that is exactly who the fake downloads target - a
security page, which is our business. D:/claude/seo-research/gta6-smashbay-demand-2026-11-19/FINDINGS.md.

Facts and where they come from (checked 19 Nov 2026):
  - GTA VI: 19 Nov 2026 on PS5 and Xbox Series X|S; no PC version announced (GamesRadar, ARY, FinalBoss). Standard
    Edition US$79.99 (pre-orders from 25 Jun 2026). GTA V reached PC about 19 months after the consoles (Sep 2013 ->
    Apr 2015) and Red Dead Redemption 2 about 13 months after (Oct 2018 -> Nov 2019).
  - Fakes: Malwarebytes, Aug 2026 - fake "demo" / Extended Look sites, the download a 1.1 MB infostealer aimed at 19
    browsers; Huntress - fake ISOs, some over 100 GB, bundling a fake installer, remote-access trojans, an infostealer and
    ransomware used as a wiper; Cynet - a "GTA 6 EXE" ZIP carrying Warden Stealer (passwords, cookies, Steam and Roblox
    logins, crypto wallets) whose README says to disable security warnings and add antivirus exclusions; NordVPN - fake
    early-access / beta sign-ups. Linked, never copied.
Said with care: the name is used factually only - no logos or art, and the page says we're not connected with Rockstar
Games or Take-Two. No UK price stated. No claim about cloud streaming beyond "nothing official that we know of".
The Smash Bay game is NOT linked (owner's go only); the "something to play" pointer is our existing /games/.
"""
from new_pages_data import NEW_PAGES

SLUG = 'is-gta-6-on-pc'

_CALL = ('<p>Not sure what that file did, or rather someone looked? Ring <strong>01202 775566</strong> or text 07520 615332, '
         'Monday to Friday, 9 to 5. We can connect to your Windows PC remotely, find and remove what was installed, and help '
         'you lock your accounts down, anywhere in the UK. We tell you the price before we start. See '
         '<a href="/virus-removal/">virus removal</a> and <a href="/scam-recovery/">scam recovery</a>.</p>')

NEW_PAGES.append({
    'slug': SLUG,
    'title': 'Is GTA 6 on PC? No, and the Fake Downloads to Avoid',
    'metaDesc': 'GTA 6 is out on PS5 and Xbox only. There is no PC version, so every &ldquo;GTA 6 PC download&rdquo; is '
                'fake. How to spot them, and what to do if you ran one.',
    'ogTitle': 'Is GTA 6 on PC? No, and the fake downloads to avoid',
    'crumbName': 'Is GTA 6 on PC?',
    'eyebrow': '// GTA VI &middot; OUT 19 NOVEMBER 2026 &middot; CONSOLES ONLY',
    'h1': 'Is GTA 6 on PC? <em class="grad grad--cyan">No, and the fake downloads to avoid</em>',
    'lede': 'Grand Theft Auto VI came out on 19 November 2026 for PlayStation 5 and Xbox Series X|S. There is no PC version, '
            'and Rockstar hasn&rsquo;t announced one. So every &ldquo;GTA 6 PC download&rdquo;, demo, beta or crack is fake, '
            'and security researchers have found many of them stealing passwords. Here&rsquo;s how to spot them, and what to '
            'do if you&rsquo;ve already run one. Updated 19 November 2026.',
    'chips': ['No PC version yet', 'How to spot a fake', 'What to do if you ran one'],
    'primaryCta': ['I ran a GTA 6 file', '#s4'], 'secondaryCta': ['How to spot a fake', '#s3'],
    'ctaHead': 'Ran something you shouldn&rsquo;t have?',
    'ctaSub': 'We can connect to your Windows PC, remove what was installed and help you secure your accounts. We tell you '
              'the price before we start. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Is GTA 6 on PC?', 'No. It came out on 19 November 2026 for PS5 and Xbox Series X|S only.'),
        ('When is it coming to PC?', 'Rockstar hasn&rsquo;t said. Its last two big games reached PC one to two years after '
                                     'the consoles.'),
        ('Is there a demo or beta?', 'No. Every GTA 6 demo, beta, leak or PC installer you see is fake.'),
        ('What the fakes do', 'Steal saved passwords, browser logins, Steam and crypto accounts, and sometimes lock or wipe '
                              'files.'),
        ('Ran one already?', 'Disconnect the PC, change your passwords from another device, then get the PC checked.'),
        ('Where to buy it safely', 'The PlayStation Store, the Microsoft Store on Xbox, Rockstar&rsquo;s own store or a shop '
                                   'you know.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; THE SHORT ANSWER', 'h2': 'GTA 6 is out, but not on PC',
         'html': '<p><strong>Grand Theft Auto VI</strong> launched on <strong>19 November 2026</strong> on '
                 '<strong>PlayStation 5</strong> and <strong>Xbox Series X|S</strong>. That is the whole list. There is no '
                 'version for Windows PCs, laptops, Macs or phones, and Rockstar Games hasn&rsquo;t announced a PC '
                 'date.</p>'
                 '<p>It has happened before. <strong>GTA V</strong> came to PC about 19 months after the consoles, and '
                 '<strong>Red Dead Redemption 2</strong> about 13 months after. Websites guessing at a PC date for GTA 6 '
                 'are guessing. When a PC version is real, Rockstar will announce it on its own website and it will be '
                 'sold through the usual PC stores, not through a link in a video description.</p>'
                 '<p><small>We&rsquo;re an IT support company in Bournemouth. We&rsquo;re not connected with Rockstar Games '
                 'or Take-Two; we fix the PCs these fake downloads break.</small></p>'},
        {'eyebrow': '/02 &mdash; WHY THE FAKES WORK', 'h2': 'Why fake GTA 6 downloads are everywhere',
         'html': '<p>Millions of people want to play it, and PC players can&rsquo;t. Criminals fill that gap with '
                 '&ldquo;PC versions&rdquo;, &ldquo;demos&rdquo; and &ldquo;leaks&rdquo; that are really malware. Security '
                 'researchers have been finding them for months:</p>'
                 '<ul>'
                 '<li><strong>Fake demo websites.</strong> <a href="https://www.malwarebytes.com/blog/threat-intel/2026/08/'
                 'fake-gta-6-extended-look-and-demo-sites-deliver-an-infostealer" target="_blank" rel="noopener">Malwarebytes'
                 '</a> found sites copying Rockstar&rsquo;s own artwork with a &ldquo;Play now&rdquo; button. The download was '
                 'only 1.1 MB, far too small to be a game, and it stole saved logins from 19 different web browsers.</li>'
                 '<li><strong>Huge fake game files.</strong> Researchers at Huntress found fake game files of over 100 GB on '
                 'forums, social media and torrent sites, hiding remote-control tools, a password stealer and ransomware '
                 '(<a href="https://cybernews.com/gaming/hackers-weaponize-gta6-hype-pc-hijack/" target="_blank" '
                 'rel="noopener">Cybernews</a>).</li>'
                 '<li><strong>&ldquo;Turn off your antivirus&rdquo; instructions.</strong> One fake download came with a '
                 'read-me telling people to switch off security warnings and add antivirus exceptions, then took passwords, '
                 'Steam and Roblox logins and crypto wallets (<a href="https://www.helpnetsecurity.com/?p=391234" '
                 'target="_blank" rel="noopener">Help Net Security</a>).</li>'
                 '<li><strong>Fake beta and early-access sign-ups</strong> that collect your details, then send you to a '
                 '&ldquo;beta download&rdquo; (<a href="https://techradar.com/pro/security/fake-gta-6-malware-is-on-the-'
                 'rise-as-release-date-nears-here-are-some-of-the-worst-scams-to-look-out-for" target="_blank" '
                 'rel="noopener">TechRadar</a>).</li>'
                 '</ul>'
                 '<p>A password stealer is quiet. Nothing seems wrong at first: the &ldquo;installer&rdquo; may show a fake '
                 'error and close. Meanwhile your saved passwords and signed-in sessions are already gone.</p>'},
        {'eyebrow': '/03 &mdash; HOW TO SPOT A FAKE', 'h2': 'The warning signs',
         'html': '<p>Any one of these means walk away:</p>'
                 '<ul>'
                 '<li><strong>It says &ldquo;PC&rdquo;.</strong> There is no PC version, so any PC download, installer, '
                 '&ldquo;repack&rdquo; or crack is fake. Full stop.</li>'
                 '<li><strong>It&rsquo;s a demo, beta, early access or &ldquo;leak&rdquo;.</strong> None exist.</li>'
                 '<li><strong>It asks you to turn off your antivirus</strong> or add an &ldquo;exception&rdquo;. A real game '
                 'never does.</li>'
                 '<li><strong>It comes as a password-protected ZIP</strong>, which stops antivirus looking inside.</li>'
                 '<li><strong>&ldquo;Download link in the description&rdquo;</strong> on YouTube or TikTok, or a link in Discord '
                 'or Telegram.</li>'
                 '<li><strong>A &ldquo;human verification&rdquo; survey</strong> before the download, or a &ldquo;free GTA 6 '
                 'key&rdquo; giveaway that asks you to sign in to PlayStation, Xbox, Steam or Rockstar.</li>'
                 '<li><strong>The file size is silly:</strong> a few megabytes is far too small; a strange 100 GB+ file from a '
                 'forum is no better.</li>'
                 '<li><strong>The website isn&rsquo;t rockstargames.com, playstation.com or xbox.com</strong>, or a shop you '
                 'already know.</li>'
                 '</ul>'
                 '<p><strong>Parents:</strong> many fakes are aimed at young players searching for a free copy. Earlier GTA '
                 'games were rated 18, so check the rating on the box, and have a word about &ldquo;free download&rdquo; '
                 'links. Our guides to <a href="/playstation-parental-controls-uk/">PlayStation</a> and '
                 '<a href="/xbox-parental-controls-uk/">Xbox</a> parental controls show how to manage what can be bought '
                 'and played.</p>'},
        {'eyebrow': '/04 &mdash; IF YOU RAN ONE', 'h2': 'Already ran a &ldquo;GTA 6&rdquo; file? Do this now',
         'html': '<ol style="list-style:decimal;padding-left:1.4rem;display:grid;gap:.7rem;line-height:1.6">'
                 '<li><strong>Disconnect the PC from the internet</strong>: Wi-Fi off, or pull the cable. It stops anything '
                 'sending more of your data out.</li>'
                 '<li><strong>Don&rsquo;t sign in to anything on that PC</strong> until it&rsquo;s been checked.</li>'
                 '<li><strong>From your phone or another device, change your passwords</strong>, starting with your '
                 '<strong>email</strong>, then Steam, PlayStation, Microsoft/Xbox, Rockstar, Discord, Roblox and your bank. '
                 'Switch on <a href="/how-to-set-up-two-factor-authentication/">two-step sign-in</a> as you go, and use '
                 '&ldquo;sign out of all devices&rdquo; where it&rsquo;s offered: password stealers also take signed-in '
                 'sessions.</li>'
                 '<li><strong>Cards saved in the browser?</strong> Ring your bank (159 connects you safely) and watch your '
                 'statements. Crypto? Move it to a new wallet from a clean device.</li>'
                 '<li><strong>Scan the PC.</strong> Open Windows Security, then Virus &amp; threat protection, then Scan '
                 'options, and run a <strong>Microsoft Defender Offline scan</strong>: it restarts the PC and scans before '
                 'Windows loads. Check Windows Security is still switched on afterwards, and remove any program you '
                 'don&rsquo;t recognise.</li>'
                 '<li><strong>If it told you to turn off your antivirus, or anything still looks wrong</strong>, assume it '
                 'got in deep. Copy off your photos and documents (not programs), then have Windows reset or the PC '
                 'cleaned properly. See <a href="/i-think-ive-been-hacked/">I think I&rsquo;ve been hacked</a> for the '
                 'account side.</li>'
                 '<li><strong>Lost money?</strong> Report it to Report Fraud on 0300 123 2040 (in Scotland, Police Scotland '
                 'on 101).</li>'
                 '</ol>'},
        {'eyebrow': '/05 &mdash; PLAY IT SAFELY', 'h2': 'How to get GTA 6 safely',
         'html': '<ul>'
                 '<li><strong>Buy it from the PlayStation Store, the Microsoft Store on your Xbox, Rockstar&rsquo;s own store or '
                 'a shop you know.</strong> The Standard Edition launched at US$79.99; check the official stores for the UK '
                 'price, and be wary of &ldquo;cheap key&rdquo; websites.</li>'
                 '<li><strong>Lock down the accounts it uses.</strong> Switch on two-step sign-in for your PlayStation, Xbox '
                 'and Rockstar accounts. Game accounts are stolen and sold, and a big launch brings out the phishing '
                 'emails.</li>'
                 '<li><strong>Ignore &ldquo;free money&rdquo; and &ldquo;free items&rdquo; offers</strong> for the game&rsquo;s '
                 'online mode. They are the same trick as the fake downloads, aimed at your account instead of your PC.</li>'
                 '<li><strong>Can I stream it to my PC?</strong> Not through anything official that we know of today. If '
                 'Microsoft or Sony adds it to their own cloud services, they&rsquo;ll announce it; ignore any other site '
                 'offering to &ldquo;stream GTA 6 on PC&rdquo;.</li>'
                 '</ul>'},
        {'eyebrow': '/06 &mdash; ON A PC TONIGHT?', 'h2': 'Want something to play on your PC in the meantime?',
         'html': '<p>Our <a href="/games/">free games</a> run straight in your web browser: nothing to download, nothing to '
                 'install and no adverts, which is exactly what makes them safe. Card games, an arcade shooter and a seaside '
                 'racer, all made by us in Bournemouth.</p>'
                 '<p>And whatever you play, the same rule applies: if a game asks you to turn off your antivirus, it '
                 'isn&rsquo;t a game.</p>'},
        {'eyebrow': '/07 &mdash; RATHER WE LOOKED?', 'h2': 'When to call us', 'html': _CALL},
    ],
    'howToName': 'What to do if you ran a fake GTA 6 download',
    'howToSteps': [
        {'name': 'Disconnect the PC', 'text': 'Turn off Wi-Fi or unplug the network cable so nothing more is sent.'},
        {'name': 'Stop signing in on that PC', 'text': 'Do not sign in to any account on the PC until it has been checked.'},
        {'name': 'Change your passwords from another device', 'text': 'Start with your email, then game accounts, Discord and your bank; turn on two-step sign-in and sign out of all devices.'},
        {'name': 'Protect your money', 'text': 'If cards were saved in the browser, call your bank on 159 and watch your statements; move any crypto to a new wallet.'},
        {'name': 'Scan the PC', 'text': 'Run a Microsoft Defender Offline scan from Windows Security, check protection is still on and remove unknown programs.'},
        {'name': 'Reset or get it cleaned', 'text': 'If it asked you to turn off antivirus or anything still looks wrong, copy off your files and reset Windows or have it cleaned.'},
    ],
    'faqs': [
        {'q': 'Is GTA 6 on PC?', 'a': '<p>No. GTA 6 came out on 19 November 2026 for PlayStation 5 and Xbox Series X|S only. '
              'Rockstar hasn&rsquo;t announced a PC version.</p>'},
        {'q': 'When is GTA 6 coming out on PC?', 'a': '<p>Rockstar hasn&rsquo;t said. GTA V reached PC about 19 months after '
              'the consoles and Red Dead Redemption 2 about 13 months after, but any date you see for GTA 6 on PC is a '
              'guess until Rockstar announces it.</p>'},
        {'q': 'Is there a GTA 6 PC download?', 'a': '<p>No. There is no PC version, so every GTA 6 PC download, installer, '
              'repack or crack is fake, and many have been found to contain password-stealing malware.</p>'},
        {'q': 'Is there a GTA 6 demo or beta?', 'a': '<p>No. Rockstar hasn&rsquo;t released a demo or a public beta. Sites and '
              'videos offering one are scams.</p>'},
        {'q': 'I downloaded a GTA 6 file on my PC. What should I do?', 'a': '<p>Disconnect the PC from the internet, '
              'change your passwords from another device starting with your email, turn on two-step sign-in, tell your '
              'bank if cards were saved in the browser, then run a Microsoft Defender Offline scan or have the PC '
              'cleaned.</p>'},
        {'q': 'Can I play GTA 6 on PC through the cloud?', 'a': '<p>Not through any official service that we know of today. '
              'If Microsoft or Sony adds it to their cloud gaming, they will announce it. Ignore other sites offering to '
              'stream it.</p>'},
        {'q': 'How much is GTA 6?', 'a': '<p>The Standard Edition launched at US$79.99. Check the PlayStation Store, the '
              'Microsoft Store or Rockstar&rsquo;s store for the UK price, and avoid unknown &ldquo;cheap key&rdquo; '
              'sites.</p>'},
        {'q': 'Is GTA 6 suitable for children?', 'a': '<p>Earlier GTA games were rated 18. Check the age rating on the box '
              'or store page, and use your console&rsquo;s parental controls.</p>'},
        {'q': 'Are you connected with Rockstar Games?', 'a': '<p>No. 365 Techies is an IT support company in Bournemouth. We '
              'wrote this to help people avoid the fake downloads, and we fix the PCs they break.</p>'},
    ],
    'crossLinksHtml': '<p>More on staying safe: <a href="/malware-and-viruses/">malware and viruses explained</a>, '
                      '<a href="/i-think-ive-been-hacked/">I think I&rsquo;ve been hacked</a>, <a href="/cyber-threats/">cyber '
                      'attacks in the UK</a> and <a href="/how-to-use-a-password-manager/">why a password manager helps</a>. '
                      'For families: <a href="/playstation-parental-controls-uk/">PlayStation</a> and '
                      '<a href="/xbox-parental-controls-uk/">Xbox</a> parental controls.</p>',
})
