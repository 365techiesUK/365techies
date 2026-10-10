# -*- coding: utf-8 -*-
"""IT Advice post (10 Oct 2026): PS5 emulators on PC - what is real, how to spot a fake, what to do if you ran one.

Trigger: PS5 emulation went viral in October 2026 (SharpEmu, KytyPS5, AnyPS5 in the gaming press; Sony's
1 July 2026 disc announcement). The owner asked whether the site should cover it. Verdict: not as a news
explainer - the gaming press owns that, and "can you play PS5 games on PC" is a yes/no Google answers in the
results - but as a SAFETY page: fake "PS5 emulator" downloads (PCSX4 and friends) have run for years and come
back every time emulation is in the news. That is a problem page, the site's best-earning shape, and it leads
to /virus-removal/ and /gaming-pc-tune-up/. Registered from build_blog.py as an IT Advice post (Home Users).

Facts checked 10 Oct 2026, from the projects' own pages and Sony:
  - SharpEmu (github.com/sharpemu/sharpemu): "experimental PlayStation 5 emulator for Windows, Linux and
    macOS"; "Only sharpemu.app and the links listed in this GitHub repository are affiliated". Its compatibility
    list (sharpemu.app/compatibility/): 91 games tested, 37 Playable (Hades, Dead Cells, Hollow Knight: Silksong
    among them). Astro Bot (PPSA21564) and Demon's Souls (PPSA01342) are "Ingame", "performance heavy", on a
    5800X3D / 4070S, builds of 5-6 Oct 2026 - NOT the "fully playable at 60 fps on ordinary PCs" a viral video
    claimed.
  - KytyPS5 (github.com/KytyPS5/KytyPS5): boots "2D games and a selection of 3D games"; Windows 10+, Linux,
    macOS experimental; "does not distribute games or copyrighted system software".
  - AnyPS5 (github.com/boykopovar/AnyPS5): relinks PS5 executables to run natively on Linux and Windows, "No
    emulation"; Dreaming Sarah at a stable 60 fps on a GTX 1050 Ti / i5-7500; users supply their own binaries.
  - PCSX4: exposed as a fake by PC Gamer (Wes Fenlon, 15 Jan 2019) - download behind survey walls, a GitHub page
    with no activity. "PCSX4 setup" spam pages still in search results on 10 Oct 2026 (seen by us).
  - Sony, PlayStation Blog 1 Jul 2026: disc production ends for NEW games from January 2028; games released on
    disc before then are unaffected.
  - PS Remote Play (playstation.com/en-gb/remote-play/): streams from your own PS4/PS5; at least 5Mbps, 15Mbps
    recommended; DualShock 4 / DualSense / DualSense Edge.
  - Sony's PC list: playstation.com/en-gb/pc/pc-games/ (Steam and Epic).

GUARDS THAT MUST NOT BE UNDONE
  - No link to, and no name of, any console jailbreak or exploit. No how-to of any kind. No game files, keys,
    firmware or "BIOS" sources.
  - Never call any download safe. Point only at each project's own GitHub page.
  - No legal verdict (copyright, anti-circumvention). The projects' own "legally obtained games" lines only.
  - Game-status claims carry the project, its own rating and the date; the "Last checked" line moves with them.
  - The unofficial GitHub copies seen in search are NOT named or called malicious - "a copy is not the project".
  - Re-check the compatibility numbers before any edit; they change weekly.
"""

_EXT = ' target="_blank" rel="noopener"'

PS5_EMULATOR_POST = dict(
  slug="ps5-emulator-real-or-fake", cat="Home Users",
  title="PS5 Emulator Downloads: Real or Fake?",
  lede="PS5 games are starting to run on PCs, and fake emulator downloads are cashing in. What is real, how to spot a fake, and what to do if you ran one.",
  body=(
    # this article's own links and warning list (the post template styles neither: links match the text, lists get green ticks)
    '<style>#ps5art a{color:var(--cyan);text-decoration:underline;text-underline-offset:2px}#ps5art a:hover{color:#fff}'
    '#ps5art ul.flags li::before{content:"\\2715";color:#ff6b78}#ps5art .cmp-wrap{margin:1.2rem 0 1.6rem}'
    '#ps5art .cmp-table td,#ps5art .cmp-table th{text-align:left;vertical-align:top}'
    '#ps5art ol{counter-reset:s;display:grid;gap:.6rem;margin:0 0 1.6rem;padding:0;list-style:none}'
    '#ps5art ol li{position:relative;padding-left:2.1rem;color:var(--ink-3);line-height:1.6;counter-increment:s}'
    '#ps5art ol li::before{content:counter(s);position:absolute;left:0;top:.05rem;width:1.5rem;height:1.5rem;border-radius:50%;'
    'background:rgba(29,151,227,.15);color:var(--cyan);font:700 .8rem/1.5rem var(--font-mono);text-align:center}'
    '#ps5art .cmp-table [data-label]::before{display:none}'
    '@media (max-width:640px){#ps5art .cmp-table{min-width:0}#ps5art .cmp-table thead{display:none}'
    '#ps5art .cmp-table tr{display:block;padding:1rem 1.1rem;border-bottom:1px solid var(--line)}'
    '#ps5art .cmp-table tr:last-child{border-bottom:0}'
    '#ps5art .cmp-table th,#ps5art .cmp-table td{display:block;border:0;padding:.25rem 0}'
    '#ps5art .cmp-table th a{word-break:break-all}'
    '#ps5art .cmp-table [data-label]::before{display:block;content:attr(data-label);color:var(--muted);'
    'font:600 .68rem/1.6 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;margin-top:.5rem}}'
    '</style><div id="ps5art">'
    '<p>PS5 emulation is suddenly all over YouTube and the gaming news: PlayStation 5 games running on an ordinary '
    'Windows PC. Some of that is real. But every time emulation makes the news, fake &ldquo;PS5 '
    'emulator&rdquo; downloads come back with it &mdash; and a fake download is a classic way for a teenager&rsquo;s '
    'gaming PC to pick up adware, a hidden cryptocurrency miner or worse. Here is what is genuinely possible, how to '
    'tell a fake, and what to do if one has already been run.</p>'
    '<p class="mono" style="color:var(--muted);font-size:.8rem">Last checked: 10 October 2026. These projects change '
    'every week, so treat the numbers below as a snapshot.</p>'

    '<h2>The short answer</h2>'
    '<p>Yes, a handful of PS5 games now run on a PC, through a few experimental, free, open-source projects. Most of '
    'them are smaller games. The big PS5 exclusives reach gameplay at best, on fast and expensive PCs, and are not '
    'properly playable yet. None of these projects is a one-click download, none comes with any games, and anything '
    'that promises full-speed PS5 games on your PC today &mdash; especially &ldquo;free&rdquo; ones &mdash; is a '
    'scam.</p>'

    '<h2>What is actually real</h2>'
    '<p>These are the three projects behind the headlines, described from their own pages. Each one&rsquo;s '
    'official home is its GitHub page.</p>'
    '<div class="cmp-wrap" tabindex="0" role="group" aria-label="PS5 emulation projects (scrolls sideways on a small screen)">'
    '<table class="cmp-table"><thead><tr><th scope="col">Project</th>'
    '<th scope="col">What it is</th><th scope="col">What runs today, by its own reports</th></tr></thead><tbody>'
    '<tr><th scope="row">SharpEmu<br><a href="https://github.com/sharpemu/sharpemu"' + _EXT + ' style="font-size:.8rem">github.com/sharpemu/sharpemu</a></th>'
    '<td data-label="What it is">An experimental PS5 emulator for Windows, Linux and Mac</td>'
    '<td data-label="What runs today">Of 91 games its testers have reported on, 37 are rated Playable &mdash; mostly smaller games such as '
    'Hades, Dead Cells and Hollow Knight: Silksong. Astro Bot and Demon&rsquo;s Souls reach gameplay but are '
    '&ldquo;performance heavy&rdquo;, on a Ryzen 7 5800X3D with an RTX 4070 Super (<a href="https://sharpemu.app/compatibility/"' + _EXT + '>its compatibility list</a>)</td></tr>'
    '<tr><th scope="row">KytyPS5<br><a href="https://github.com/KytyPS5/KytyPS5"' + _EXT + ' style="font-size:.8rem">github.com/KytyPS5/KytyPS5</a></th>'
    '<td data-label="What it is">An open-source PS5 emulator for Windows 10 or later and Linux</td>'
    '<td data-label="What runs today">Its developers say it boots 2D games and a selection of 3D games, with results varying from one build to the next</td></tr>'
    '<tr><th scope="row">AnyPS5<br><a href="https://github.com/boykopovar/AnyPS5"' + _EXT + ' style="font-size:.8rem">github.com/boykopovar/AnyPS5</a></th>'
    '<td data-label="What it is">Not an emulator: it converts a PS5 game&rsquo;s program to run directly on Windows or Linux</td>'
    '<td data-label="What runs today">Its developers show a 2D platformer, Dreaming Sarah, running at a steady 60 frames a second on a modest PC</td></tr>'
    '</tbody></table></div>'
    '<p>Two things matter more than the headlines. First, none of them plays a disc in your PC&rsquo;s drive or '
    'anything you bought on the PlayStation Store: each needs the game&rsquo;s own files, and each says plainly that '
    'it supplies no games and that you must use ones you obtained legally. Second, they are research projects that '
    'change week to week. A claim you may have seen &mdash; that Astro Bot and Demon&rsquo;s Souls are fully playable '
    'at 60 frames a second on an ordinary PC &mdash; is not what SharpEmu&rsquo;s own reports say.</p>'

    '<h2>Why the fakes are back</h2>'
    '<p>Fake PlayStation emulators are an old trick. PC Gamer exposed one called PCSX4 back in 2019: an '
    'impressive-looking website with videos and an FAQ, a borrowed name (PCSX2 is a genuine PlayStation 2 emulator), '
    'and a &ldquo;download&rdquo; that only led to one survey after another (<a href="https://www.pcgamer.com/uk/ps4-emulator-pc/"' + _EXT + '>PC Gamer</a>). '
    'When we checked in October 2026, spam pages offering a &ldquo;PCSX4 setup&rdquo; file were still turning up in '
    'search results. Now that real projects are in the news, expect copies using their names too &mdash; SharpEmu '
    'itself warns that only <strong>sharpemu.app</strong> and the links on its GitHub page belong to it.</p>'

    '<h2>How to spot a fake PS5 emulator</h2>'
    '<ul class="flags">'
    '<li><strong>It promises big PS5 games at full speed</strong>, or comes &ldquo;with games&rdquo;, a '
    '&ldquo;BIOS&rdquo;, &ldquo;firmware&rdquo; or a &ldquo;game pack&rdquo;. The real projects ship none of '
    'these.</li>'
    '<li><strong>The download hides behind a survey</strong>, a &ldquo;human verification&rdquo; or a &ldquo;complete '
    'one offer&rdquo; step. No genuine project does this.</li>'
    '<li><strong>It is an .exe or a password-protected .zip</strong> from a file-sharing site, or a link in a YouTube '
    'description or a Discord message. A password on the zip is there to stop your antivirus looking inside.</li>'
    '<li><strong>It tells you to turn off your antivirus</strong> first. Treat that as a confession.</li>'
    '<li><strong>It asks for your PlayStation account</strong> sign-in, or details from your console.</li>'
    '<li><strong>It costs money or needs a &ldquo;licence key&rdquo;.</strong> The real projects are free and open-source.</li>'
    '<li><strong>The address is not quite right.</strong> Copies of the real GitHub pages under other names turn up in '
    'search results. A copy is not the project.</li>'
    '</ul>'
    '<p>The safe habit: type the project&rsquo;s GitHub address yourself, check it matches the one above exactly, and '
    'follow only the links on that page. Our guide to <a href="/how-to-spot-a-fake-website/">spotting a fake '
    'website</a> covers the same checks for any download.</p>'

    '<h2>Already downloaded one? What to do now</h2>'
    '<ol>'
    '<li><strong>Stop.</strong> Don&rsquo;t finish any survey or &ldquo;verification&rdquo;, and don&rsquo;t type in '
    'anything else it asks for.</li>'
    '<li><strong>Uninstall it</strong> (Settings, then Apps, then Installed apps) and delete the download.</li>'
    '<li><strong>Scan properly.</strong> Run a full scan in Windows Security, then a <em>Microsoft Defender Offline '
    'scan</em> (Windows Security, Virus &amp; threat protection, Scan options), then a second opinion from a scanner such '
    'as Malwarebytes.</li>'
    '<li><strong>Look for a hidden miner.</strong> Open Task Manager (Ctrl, Shift and Escape) and click Performance. If '
    'the graphics card or processor is busy while nothing is open, something is still running.</li>'
    '<li><strong>Check the web browser</strong> for extensions nobody added, or a home page or search engine that has '
    'changed.</li>'
    '<li><strong>Change passwords from a different device you trust</strong> &mdash; email first, then Steam, Epic, '
    'PlayStation and Discord &mdash; and turn on two-step verification.</li>'
    '<li><strong>If card or bank details were typed in</strong>, call your bank on <strong>159</strong> or the number '
    'on the card, and report it to <a href="https://www.reportfraud.police.uk/"' + _EXT + '>Report Fraud</a> (in '
    'Scotland, Police Scotland on 101).</li>'
    '</ol>'
    '<p>If the scans find something, or the PC is still slow afterwards, our <a href="/virus-removal/">virus '
    'removal</a> and <a href="/gaming-pc-tune-up/">remote gaming PC tune-up</a> are exactly this job &mdash; done '
    'while you watch, with nothing wiped. A gaming PC that has turned sluggish is often one of the '
    '<a href="/gaming-pc-slow-wont-load-games/">seven usual causes</a>, and a &ldquo;free&rdquo; download is one of '
    'them.</p>'

    '<h2>The real ways to play PS5 games on a PC</h2>'
    '<p><strong>Buy the PC version.</strong> Many of Sony&rsquo;s own PlayStation games are sold for PC on Steam and '
    'the Epic Games Store &mdash; Ghost of Tsushima, Marvel&rsquo;s Spider-Man 2, The Last of Us Part II Remastered '
    'and Ratchet &amp; Clank: Rift Apart among them (<a href="https://www.playstation.com/en-gb/pc/pc-games/"' + _EXT + '>Sony&rsquo;s '
    'list</a>). Check a game&rsquo;s requirements against your machine with our free '
    '<a href="/computer-spec-checker/">computer spec checker</a> before you buy.</p>'
    '<p><strong>Stream from your own PS5.</strong> Sony&rsquo;s free PS Remote Play app streams your PS5 to a Windows '
    'PC over the internet. You need the console on broadband, a PlayStation account, a DualSense or DualShock 4 '
    'controller, and at least 5Mbps &mdash; Sony recommends 15Mbps (<a href="https://www.playstation.com/en-gb/remote-play/"' + _EXT + '>PS Remote Play</a>). '
    'This is not emulation: the console does the work, and the PC just shows it.</p>'

    '<h2>And what about discs?</h2>'
    '<p>Part of why this is in the news: on 1 July 2026 Sony announced that physical disc production for new '
    'PlayStation games will end from January 2028. Games already released on disc, or released on disc before then, '
    'are not affected (<a href="https://blog.playstation.com/2026/07/01/physical-disc-production-ending-in-january-2028-for-new-games-releasing-on-playstation-consoles/"' + _EXT + '>PlayStation Blog</a>). '
    'It has put game preservation &mdash; and emulation &mdash; back in the spotlight.</p>'

    '<h2>For parents</h2>'
    '<p>If a teenager at home is excited about this, the honest version is: the real projects are interesting, free, '
    'and not yet a way to play big PS5 games; the &ldquo;download it here&rdquo; sites are where the trouble lives. '
    'Keep Windows Security switched on, steer them to the project&rsquo;s own GitHub page or not at all, and if a '
    'download has already happened, work through the steps above. Our <a href="/playstation-parental-controls-uk/">'
    'PlayStation parental controls guide</a> covers the console side.</p>'
    '</div>'
  ),
  points=["A few PS5 games now run on PC through experimental, free, open-source projects",
          "Most of them are smaller games; the big PS5 exclusives are not properly playable yet",
          "No genuine emulator comes with games, a BIOS, firmware or a licence key",
          "Surveys, password-protected zips and &lsquo;turn off your antivirus&rsquo; mean a fake",
          "Start from the project&rsquo;s own GitHub page and follow only its links",
          "Ran a fake? Uninstall, scan twice, then change passwords from another device",
          "The real routes: Sony&rsquo;s PC versions on Steam and Epic, and PS Remote Play"],
  related=[("How to spot a fake website", "/how-to-spot-a-fake-website/"),
           ("How to know if your computer has a virus", "/how-to-know-if-computer-has-virus/"),
           ("Virus removal", "/virus-removal/"),
           ("Gaming PC slow or won&rsquo;t load games?", "/gaming-pc-slow-wont-load-games/"),
           ("Remote gaming PC tune-up", "/gaming-pc-tune-up/"),
           ("PlayStation parental controls", "/playstation-parental-controls-uk/")],
  faqs=[("Is there a real PS5 emulator for PC?",
         "Yes, a few experimental, open-source ones: SharpEmu and KytyPS5 are emulators, and AnyPS5 converts games "
         "rather than emulating the console. They run some smaller games. The big PS5 exclusives are not properly "
         "playable yet, and none of them is a simple download that comes with games."),
        ("Are PCSX4 and PCSX5 real?",
         "No. PCSX4 was exposed as a fake by PC Gamer back in 2019: its &ldquo;download&rdquo; led only to surveys. "
         "Its name borrows from PCSX2, a genuine PlayStation 2 emulator. We know of no genuine project called PCSX5, "
         "so treat one the same way."),
        ("Can I play my PS5 discs on my PC?",
         "No. A PC cannot play a PS5 disc, and the emulation projects do not work that way: they need the game&rsquo;s "
         "own files. For most people the practical routes are the PC versions Sony sells on Steam and Epic, or PS "
         "Remote Play from your own console."),
        ("I think my child downloaded a fake emulator. What should I do?",
         "Uninstall it, run a full Windows Security scan and a Microsoft Defender Offline scan, check Task Manager for "
         "anything busy in the background, and change the passwords for email and gaming accounts from another device. "
         "If anything turns up, or the PC stays slow, our <a href=\"/virus-removal/\">virus removal</a> service can "
         "clean it remotely while you watch.")],
)
