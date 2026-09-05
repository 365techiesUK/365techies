# -*- coding: utf-8 -*-
"""Wave 11 (2026-09-05): the gaming-PC tune-up, remote, for the parent who bought the machine.

Trigger: a real remote job - parent in Lyndhurst, "my son's gaming computer is very slow and now
doesn't want to load any games", reluctant to wipe because the business accounts are on it.
The site had a generic tune-up page and the custom-build pages, nothing for a gaming PC someone
already owns, nothing remote-first, nothing written for parents. Rendered by build_new_page().

Facts: Windows Game Mode (Settings > Gaming); hardware-accelerated GPU scheduling under
System > Display > Graphics; NVIDIA App replaced GeForce Experience (2024); AMD Software:
Adrenalin; Steam "Verify integrity of game files"; keep 10-15% of an SSD free; sustained
90 C+ on CPU/GPU = throttling. No price on the page until the owner publishes one."""

SEO_WAVE11_PAGES = [
 {'slug': 'gaming-pc-tune-up',
  'title': 'Gaming PC Tune-Up, Remote | Slow or Won&rsquo;t Load Games',
  'metaDesc': 'Bought a gaming PC that is now slow or will not load games? We tune it up remotely while you watch - nothing wiped, files kept - across Dorset and the UK.',
  'ogTitle': 'Gaming PC Slow? A Remote Tune-Up, Nothing Wiped',
  'crumbName': 'Gaming PC Tune-Up',
  'eyebrow': '// FOR THE PARENT WHO BOUGHT IT',
  'h1': 'Gaming PC gone slow? We tune it up remotely &mdash; nothing wiped',
  'lede': 'You bought the gaming computer a year or two ago, it flew, and now it crawls, stutters, or refuses to load the games it was bought for. We connect to it, with you watching, find what has piled up, and put it right &mdash; without wiping a machine that has your files and your accounts on it too.',
  'ctaHead': 'Tell us what it is doing and we will tell you what it will cost',
  'ctaSub': 'Call 01202 775566 (Mon&ndash;Fri, 9am&ndash;5pm) or text 07520 615332. A quick look first, a price before we start, and most tune-ups done in one remote session while you or your son or daughter watch.',
  'serviceName': 'Gaming PC Tune-Up (Remote)',
  'sections': [
   {'eyebrow': '// WHY IT SLOWED DOWN',
    'h2': 'Why a gaming PC that flew now crawls',
    'html': '<p>Gaming computers slow down for the same reasons ordinary ones do, only faster, because they are used harder and download more. After a year or two, most of the ones we see have all of these at once:</p>'
            '<ul><li><strong>A full drive.</strong> Modern games are 80&ndash;150 GB each. A drive that is more than about 85&ndash;90% full slows the whole machine, and games often refuse to update or launch at all.</li>'
            '<li><strong>Graphics drivers a year out of date</strong>, or updated and now broken. New games ship needing new drivers; old drivers mean stutter, crashes on launch, or a black screen.</li>'
            '<li><strong>Things that start with Windows.</strong> Every launcher, overlay and &ldquo;helper&rdquo; ever installed &mdash; Steam, Epic, Discord, Xbox, the RGB lighting software &mdash; running before the game does.</li>'
            '<li><strong>Adware and worse from &ldquo;free&rdquo; downloads.</strong> Cracked games, mods from the wrong site, and &ldquo;free V-Bucks / Robux&rdquo; tools are the commonest way a young person&rsquo;s PC ends up carrying software that eats it alive. No blame; it is how these things are designed.</li>'
            '<li><strong>Heat.</strong> Dust in the fans and heatsinks means the processor and graphics card slow themselves down to survive. It shows up as a machine that is fine for five minutes and then stutters.</li>'
            '<li><strong>Windows itself</strong> &mdash; updates half-applied, a version that never finished installing, power settings that throttle everything.</li></ul>'
            '<p>None of that needs a wipe. It needs someone to go through it methodically, which is what a tune-up is.</p>'},
   {'eyebrow': '// WHAT WE DO',
    'h2': 'What a remote gaming tune-up covers',
    'html': '<p>We connect on a secure remote session &mdash; you make the call, you watch the screen, our access ends when we finish. In that session we:</p>'
            '<ul><li><strong>Free the drive</strong>: temporary files, old game installs nobody plays, shader caches and Windows leftovers, so there is breathing room again. Nothing of yours is deleted without asking.</li>'
            '<li><strong>Update the graphics driver properly</strong> &mdash; the NVIDIA App or AMD Software, a clean install where the old one is broken &mdash; plus the DirectX and Visual C++ pieces games quietly depend on.</li>'
            '<li><strong>Cut the start-up crowd</strong>: launchers and overlays that only need to run when they are wanted, not at boot.</li>'
            '<li><strong>Remove adware, unwanted programs and malware</strong>, and check the browser and extensions while we are there.</li>'
            '<li><strong>Repair the games that will not launch</strong> &mdash; verify game files in Steam or Epic, fix the launcher, sort the anti-cheat driver that so often breaks after an update.</li>'
            '<li><strong>Set Windows up for gaming</strong>: Game Mode on, the right power plan, hardware-accelerated GPU scheduling where it helps, updates finished.</li>'
            '<li><strong>Check temperatures and drive health</strong>, so we can tell you whether the machine needs a physical clean or has a part on the way out &mdash; which is honest news you want before, not after.</li></ul>'
            '<p>Then we test: the game that would not load, loaded. You see it happen.</p>'},
   {'eyebrow': '// NOTHING WIPED',
    'h2': 'Your files, their games: both stay',
    'html': '<p>The reason parents put this off is the fear of losing things. A shared family PC often has the business accounts, the photos and the school work on it as well as the games, and &ldquo;just reinstall Windows&rdquo; is the advice that costs a weekend and a lot of passwords.</p>'
            '<p>A tune-up is the opposite of that. We work on the machine as it is: files stay where they are, programs stay installed, game saves and accounts stay signed in. If we ever think a fresh installation is the honest answer &mdash; rare, and usually only after serious malware &mdash; we say so first, we back your files up before anything happens, and you decide.</p>'
            '<p>And because it is remote, nobody needs to unplug a tower, carry it anywhere, or wait a week to get it back.</p>'},
   {'eyebrow': '// WHAT WE CANNOT DO REMOTELY',
    'h2': 'The honest limits &mdash; and what we do about them',
    'html': '<p>Some causes are physical, and a remote session can find them but not fix them:</p>'
            '<ul><li><strong>Dust and heat.</strong> We can see the temperatures and tell you the fans need cleaning; we cannot hold the air duster. We will show you or your son or daughter how to do it safely, or it becomes a workshop job.</li>'
            '<li><strong>A failing drive or a graphics card on its way out.</strong> The health checks tell us; the fix is a part. We quote it straight.</li>'
            '<li><strong>Not enough memory.</strong> A two-year-old machine bought with 8 GB is now below what many games want. A memory upgrade is cheap and transformative, and we tell you exactly which sticks fit.</li>'
            '<li><strong>Games the machine was never fast enough for.</strong> If a new release simply needs more graphics card than it has, we say so rather than tune around it. Our free <a href="/pc-benchmark/">PC speed test</a> and <a href="/graphics-card-benchmark/">graphics card benchmark</a> put a number on it.</li></ul>'
            '<p>Physical work happens at our workshop by arrangement, with free collection across Bournemouth, Poole, Christchurch and Dorset &mdash; see <a href="/computer-repairs/">computer repairs</a>. Remote is where we start because it is where most of these problems live.</p>'},
   {'eyebrow': '// AFTERWARDS',
    'h2': 'Keeping it fast without another call',
    'html': '<p>Before we sign off we leave the machine with the habits that keep it fast: Storage Sense tidying temporary files on a schedule, drivers set to update through the maker&rsquo;s own app, and a short list &mdash; in plain English, for whoever uses it &mdash; of what not to download. If you would rather someone kept an eye on it, our <a href="/home-it-support-plans/">home support plan</a> is &pound;18.25 a month per computer with unlimited remote help, and our free <a href="/free-pc-health-check/">365 PC Manager app</a> shows the drive, memory and protection at a glance so the next slowdown is caught early.</p>'
            '<p>Thinking about a bigger step? Our <a href="/custom-pc-builder/">PC build budget tool</a> shows where the money goes in a new machine, and our <a href="/gaming-pcs/">custom gaming PCs</a> are built locally and supported by the same people who tune them. Most of the time, though, the machine you have is fine &mdash; it just needs the clutter out.</p>'}],
  'faqs': [
   {'q': 'How much does a gaming PC tune-up cost?', 'a': 'We quote before we start, once we have had a quick look at what the machine is doing &mdash; a few minutes on the phone or a short remote session &mdash; and the price does not change. Most tune-ups are a single remote session. If it turns out to need a part or a physical clean, that is a separate, straight quote.'},
   {'q': 'Will my files and my child&rsquo;s games be safe?', 'a': 'Yes. A tune-up works on the machine as it is: files, programs, game saves and signed-in accounts all stay. Nothing is deleted without asking, and if a fresh installation ever became the honest answer we would say so first and back everything up before anything happened.'},
   {'q': 'Does my son or daughter need to be there?', 'a': 'It helps, for two reasons: they know which games matter and which launchers they use, and they see what we do and why, which is how the machine stays fast afterwards. But a parent can sit in just as well &mdash; we explain everything in plain English either way.'},
   {'q': 'Can you do it if we are not in Dorset?', 'a': 'Yes. The tune-up is remote, so we do it anywhere in the UK. Only the physical jobs &mdash; dust, parts, memory upgrades &mdash; need the machine to come to our workshop, with free collection across Bournemouth, Poole, Christchurch and Dorset.'},
   {'q': 'Is it worth tuning up rather than buying a new gaming PC?', 'a': 'Usually, yes. A two- or three-year-old gaming PC that has slowed down is almost always suffering from clutter, old drivers, heat or a full drive, not age. If the graphics card genuinely cannot run what they want to play, we will tell you, and our free benchmarks put a number on it &mdash; but we would rather fix the machine you have than sell you one you do not need.'}],
  'chips': ['Remote, while you watch', 'Nothing wiped, files kept', 'Price agreed before we start'],
  'primaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'secondaryCta': ['Text 07520 615332', 'sms:07520615332'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related:</strong> <a href="/gaming-pc-slow-wont-load-games/">Gaming PC suddenly slow or won&rsquo;t load games? The causes, in order</a> &middot; <a href="/computer-tune-up/">Computer tune-up</a> &middot; <a href="/slow-computer-repair/">Slow computer repair</a> &middot; <a href="/pc-benchmark/">Free PC speed test</a> &middot; <a href="/custom-pc-builder/">PC build budget tool</a> &middot; <a href="/gaming-pcs/">Custom gaming PCs</a></p>'},

 {'slug': 'gaming-pc-slow-wont-load-games',
  'title': 'Gaming PC Suddenly Slow or Won&rsquo;t Load Games? Causes in Order',
  'metaDesc': 'A gaming PC that was fast and now crawls or will not load games: the seven causes, in the order to check them, what a parent can do, and when to get help.',
  'ogTitle': 'Gaming PC Suddenly Slow or Won&rsquo;t Load Games? Check These, in Order',
  'crumbName': 'Gaming PC slow',
  'eyebrow': '// PLAIN-ENGLISH DIAGNOSIS',
  'h1': 'Gaming PC suddenly slow, or won&rsquo;t load games? Check these, in order',
  'lede': 'It ran everything when it was new. Now it takes an age to start, games stutter or crash on the loading screen, and the one it was bought for will not open at all. Nine times out of ten it is one of seven things, and they are worth checking in this order &mdash; most take five minutes and none needs a wipe.',
  'ctaHead': 'Rather someone did the checking?',
  'ctaSub': 'We tune up gaming PCs remotely while you watch &mdash; drive, drivers, start-up, malware, heat &mdash; with nothing wiped and a price agreed first. Call 01202 775566 or text 07520 615332.',
  'serviceName': 'Gaming PC Diagnosis and Tune-Up',
  'sections': [
   {'eyebrow': '// 1 AND 2',
    'h2': 'A full drive, and a graphics driver that is out of date or broken',
    'html': '<p><strong>1. The drive is nearly full.</strong> Press the Windows key and type <em>storage</em>, then open Storage settings. If the main drive shows less than 10&ndash;15% free, that alone explains a great deal: games cannot unpack updates, Windows cannot make room to work, and everything queues. The quick wins are in the same screen &mdash; Temporary files, and the list of installed apps sorted by size, where three abandoned games can free 200 GB.</p>'
            '<p><strong>2. The graphics driver.</strong> New games need new drivers, and an update can also go wrong and leave a half-working one behind. Open the NVIDIA App (or GeForce Experience on older set-ups) or AMD Software: Adrenalin and check for a driver update. If games crash on launch or show a black screen right after an update, the fix is usually a <em>clean</em> reinstall of the driver, which the maker&rsquo;s app offers as an option. Ten minutes, no wipe.</p>'},
   {'eyebrow': '// 3 AND 4',
    'h2': 'Too much starting with Windows, and software from &ldquo;free&rdquo; downloads',
    'html': '<p><strong>3. The start-up crowd.</strong> Press Ctrl, Shift and Escape together to open Task Manager, then click Startup apps. Everything marked Enabled starts before the game does: Steam, Epic, Discord, the Xbox app, RGB lighting tools, three &ldquo;updaters&rdquo;. Disable what does not need to be there at boot &mdash; disabling never uninstalls anything. Then look at the Processes tab while a game is running: anything using a large share of the processor or memory that is not the game is a suspect.</p>'
            '<p><strong>4. Adware, miners and worse.</strong> This is the one parents rarely guess. Cracked games, mods from the wrong website, and &ldquo;free V-Bucks / Robux / skins&rdquo; tools are designed to carry software that runs in the background &mdash; sometimes mining cryptocurrency on the graphics card, which is why the games crawl. Run a full scan with Windows Security, then a second opinion with Malwarebytes (the free scan is enough). If either finds anything, the cleanup needs to be thorough, and it is worth changing the passwords used on that machine afterwards.</p>'},
   {'eyebrow': '// 5 AND 6',
    'h2': 'Heat, and a Windows that never finished updating',
    'html': '<p><strong>5. Heat.</strong> The tell is a machine that is fine for a few minutes and then stutters, with fans roaring. A free tool such as HWiNFO or HWMonitor shows the processor and graphics card temperatures; sustained readings in the 90s (Celsius) mean the parts are slowing themselves down to survive. The cause is nearly always dust in the fans and heatsinks, or a tower pushed into a cupboard with no airflow. Compressed air, done outside with the machine off, is the fix &mdash; and if it is a laptop, a cooling pad genuinely helps.</p>'
            '<p><strong>6. Windows half-updated.</strong> Open Settings, then Windows Update. A machine that has been switched off at the wall mid-update, or has had &ldquo;remind me later&rdquo; pressed for a year, can sit with updates pending that hold everything back &mdash; and games&rsquo; anti-cheat drivers often refuse to run until Windows is current. Let it finish and restart properly (Restart, not Shut down).</p>'},
   {'eyebrow': '// 7, AND THE ONE THAT IS NOT A FAULT',
    'h2': 'A drive or card on its way out &mdash; and simply not enough machine',
    'html': '<p><strong>7. A failing part.</strong> A drive that is dying makes everything slow before it fails outright; the drive&rsquo;s own health readings (tools like CrystalDiskInfo read them) will say so. A graphics card that crashes under load in every game, at normal temperatures, may be the card. Both are worth knowing before spending a weekend on software.</p>'
            '<p><strong>And then there is the one that is not a fault at all.</strong> A gaming PC bought two years ago with 8 GB of memory and a modest graphics card was fine for the games of two years ago. If the problem is only with one brand-new release, check its published minimum requirements against the machine; our free <a href="/pc-benchmark/">PC speed test</a> and <a href="/graphics-card-benchmark/">graphics card benchmark</a> put a number on where it stands. The honest fix there is a memory upgrade, a card, or lower settings &mdash; not a clean-up.</p>'},
   {'eyebrow': '// WHEN TO GET HELP',
    'h2': 'If you would rather someone else did the checking',
    'html': '<p>All seven checks are safe for a parent or a teenager to do, and most of the time they find it. When they do not &mdash; or when the malware scan lit up, or the machine has the family&rsquo;s business accounts on it and nobody wants to risk a wrong click &mdash; that is what our <a href="/gaming-pc-tune-up/">remote gaming PC tune-up</a> is: we connect while you watch, go through everything above and the things behind it, repair the games that will not launch, and leave the machine fast, with nothing wiped and a price agreed first.</p>'
            '<p>If it turns out to be dust or a part, we say so straight, and the physical work happens at our workshop with free collection across Bournemouth, Poole, Christchurch and Dorset. Either way, you find out what it actually is before you spend anything.</p>'}],
  'faqs': [
   {'q': 'Do I need to reinstall Windows to fix a slow gaming PC?', 'a': 'Almost never. A full drive, an old graphics driver, too much starting at boot, adware from a &ldquo;free&rdquo; download, dust, or a half-finished update explain nearly all of them, and every one is fixed without a wipe. A fresh installation is the last resort after serious malware, not the first step.'},
   {'q': 'Why do games crash on the loading screen?', 'a': 'The usual suspects, in order: a graphics driver that needs a clean reinstall, a drive too full for the game to unpack what it needs, an anti-cheat driver waiting on a Windows update, and corrupted game files &mdash; which Steam and Epic can repair with their &ldquo;verify game files&rdquo; option. Overheating causes crashes a few minutes in rather than on loading.'},
   {'q': 'My child downloaded a &ldquo;free&rdquo; game or a mod and it has been slow ever since. Is that the cause?', 'a': 'Very likely. Cracked games, mods from the wrong site and &ldquo;free currency&rdquo; tools are the commonest way a young person&rsquo;s PC picks up adware or a hidden cryptocurrency miner, which uses the graphics card in the background. A full scan with Windows Security and Malwarebytes will usually show it; a thorough cleanup fixes it. No blame &mdash; these things are built to fool people.'},
   {'q': 'Is a two-year-old gaming PC already too old?', 'a': 'No. Two or three years is young for a gaming PC; what changes is the clutter it accumulates and, sometimes, a new game asking for more memory or graphics power than it was bought with. A tune-up handles the first; a memory upgrade or lower settings handle the second. Replacing the whole machine is rarely the answer.'},
   {'q': 'Can this be done remotely, or does the tower have to come to you?', 'a': 'Everything in the software list is done remotely while you watch, anywhere in the UK. Only dust, parts and memory upgrades need the machine physically &mdash; and for those we collect free across Bournemouth, Poole, Christchurch and Dorset.'}],
  'chips': ['Seven checks, five minutes each', 'Nothing wiped', 'Remote help if you want it'],
  'primaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'secondaryCta': ['Remote gaming PC tune-up', '/gaming-pc-tune-up/'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related:</strong> <a href="/gaming-pc-tune-up/">Remote gaming PC tune-up</a> &middot; <a href="/why-is-my-computer-slow/">Why is my computer slow?</a> &middot; <a href="/how-to-speed-up-a-slow-computer/">How to speed up a slow computer</a> &middot; <a href="/how-to-know-if-computer-has-virus/">How to know if a computer has a virus</a> &middot; <a href="/pc-benchmark/">Free PC speed test</a></p>'},
]
