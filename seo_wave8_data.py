# -*- coding: utf-8 -*-
"""SEO wave 8 (5 Sep 2026): the first four symptom pages from the measured queue.

WHY THESE FOUR
--------------
The 5 Sep GSC audit (seo-research/gsc-2026-09-05/FINDINGS.md) measured, on the
first window entirely on the new site, that symptom/how-to pages are the engine:
255 clicks across 69 pages, the largest cluster by clicks AND by breadth, and the
best-converting page shape (problem-solving 1.39% CTR vs factual/verdict 0.52%).
Head-term title fixes were falsified the same day. The owner chose "the first 4
symptom pages" from the planner's BUILD queue; the two non-symptom rows above
them (the office upgrade cost page, the M365 transfer process page) were skipped.

  nas-drive-not-showing-after-windows-11-update   Windows/file-share  (best cluster, 1.67/pg/qtr)
  old-program-wont-open-on-windows-11             Windows / legacy    (Windows-10-EOL crossover)
  sharepoint-not-syncing-file-explorer            M365 / SharePoint   (feeds /microsoft-365-support/)
  talktalk-email-not-working-android              ISP email           (the designated FAIR TEST of
                                                  the worst-yielding cluster - 0.17/pg/qtr - kept
                                                  as one of two hubs when 9 ISP pages were cut)

EDITORIAL GUARDS THAT MUST NOT BE UNDONE (inherited from waves 5-7, plus one new)
  - SMB1, insecure guest logons and disabling SMB signing appear ONLY as advice the
    reader will meet online and should refuse. Never as a fix. Same for turning off
    Core Isolation memory integrity: named as a trade the reader should understand,
    never as the instruction.
  - "More info > Run anyway" on SmartScreen is described ONLY for software the reader
    already owns and trusts, with the anti-scam line attached. This site spends its
    life telling people not to click through security warnings; a how-to page must
    not teach the opposite reflex.
  - No prices. No shop, no premises, no "pop in" - remote first, or we come to you.
  - No legal advice on the licence/VM material; "a licence you own" and nothing more.
  - Where a claim could not be verified it was made vaguer rather than more specific.
    Vaguer-but-true beats specific-and-wrong. Menu paths are given only where the
    writer was confident of the current product; otherwise "in the NAS's file-service
    settings" style wording.
  - ISP email: server names are stated once, in one section, and the reader is told
    to check them against the provider's own help page. The provider owns that
    table; this page's value is the DIAGNOSIS the provider's page does not give.

Rendered by build_extra.build_new_page(). Separate module per wave, as ever:
appending to a shared list is what caused the `},,` trailing-comma bug in wave 2.
"""

SEO_WAVE8_PAGES = [
 {'slug': 'nas-drive-not-showing-after-windows-11-update',
  'title': 'NAS Drive Not Showing After Windows 11 Update | 365 Techies',
  'metaDesc': 'NAS gone from Network after a Windows 11 update? Nothing is lost. The three usual causes, a one-minute test to tell them apart, and the fix that lasts.',
  'ogTitle': 'NAS Drive Not Showing on the Network After a Windows 11 Update',
  'crumbName': 'NAS Not Showing',
  'eyebrow': '// NETWORK &amp; FILE SHARING',
  'h1': 'NAS drive not showing on the network after a Windows 11 update',
  'lede': 'Yesterday the NAS sat in the Network view like it always has. Today, after Windows '
          'updated overnight, it is gone &mdash; or it is there but refuses to open. Nobody touched '
          'the box, the lights on it look normal, and the files on it are almost certainly fine. '
          'What has changed is the PC: Windows 11 has become steadily fussier about how it finds '
          'and talks to network storage, and each big update tightens something else. Here are '
          'the three causes that account for nearly every case, a one-minute test that tells you '
          'which one you have, and the fix that will not fall over at the next update.',
  'ctaHead': 'NAS still missing after all that?',
  'ctaSub': 'We sort network storage for homes and businesses across Bournemouth, Poole and Dorset '
            '&mdash; usually remotely, in one short session. Call 01202 775566.',
  'serviceName': 'NAS and Network Storage Support',
  'sections': [
   {'eyebrow': '/01 &mdash; WHAT ACTUALLY CHANGED',
    'h2': 'Three different faults that all look like &ldquo;the NAS has gone&rdquo;',
    'html': '<p>The Network view in File Explorer is not a list of what is plugged in. It is a '
            'list of what has <em>announced itself</em> in a way Windows is currently prepared to '
            'listen to, and that is where updates bite. Three separate things can go wrong, and '
            'they need three different fixes, so it is worth telling them apart before changing '
            'anything.</p><ul><li><strong>Discovery has been switched off.</strong> A large '
            'update can treat your network as brand new and mark it <em>Public</em>, which turns '
            'off network discovery, or it can leave the two Windows services that do the '
            'discovering stopped. The NAS is reachable; the PC has simply stopped looking. This '
            'is the commonest case and the easiest.</li><li><strong>The NAS only speaks a '
            'protocol Windows no longer has.</strong> Windows file sharing runs on a protocol '
            'called SMB. The original version, SMB1, is the one the big ransomware outbreaks '
            'spread through, and Windows 11 removes its own SMB1 support automatically once it has '
            'gone unused for a couple of weeks. Older NAS boxes &mdash; first-generation WD My '
            'Cloud units, Seagate Central, some older Buffalo and Netgear models &mdash; only ever '
            'spoke SMB1. The day Windows stops speaking it, the box disappears and cannot be '
            'opened even by address.</li><li><strong>The share is a guest share, and Windows '
            'now refuses guests.</strong> Recent Windows 11 releases require connections to be '
            'signed and refuse anonymous &lsquo;guest&rsquo; access to shares by default. A NAS '
            'folder that was set up years ago with no username or password &mdash; very common '
            'at home &mdash; now produces a message about your organisation&rsquo;s security '
            'policies blocking unauthenticated guest access, or error 0x80070035, even though '
            'the box is right there in the list.</li></ul><p>Whichever it is, nothing on the '
            'NAS is damaged and nothing has been deleted. The files are sitting exactly where '
            'they were. This is a conversation problem between two machines, not a data '
            'problem.</p>'},
   {'eyebrow': '/02 &mdash; THE ONE-MINUTE TEST',
    'h2': 'Reach it by address, and the answer tells you which fault you have',
    'html': '<p>Skip the Network view entirely and go straight to the box. You need its network '
            'address &mdash; four numbers with dots, something like <code>192.168.1.50</code>. '
            'Your router&rsquo;s admin page lists every connected device with its address, the '
            'NAS maker&rsquo;s own phone app usually shows it, and many boxes display it on a '
            'small front screen or a printed label.</p><p>Open File Explorer, click in the '
            'address bar at the top, type two backslashes followed by the address &mdash; '
            '<code>\\\\192.168.1.50</code> &mdash; and press Enter. One of three things '
            'happens.</p><ul><li><strong>The folders appear.</strong> Then the NAS is fine and '
            'the protocol is fine; only <em>discovery</em> is broken. That is section 03, and '
            'in the meantime you can work perfectly well by address. Right-click a folder and '
            'choose <em>Map network drive</em> and it gets a drive letter that survives '
            'reboots.</li><li><strong>A username and password box appears.</strong> The NAS is '
            'reachable and talking; Windows just will not let you in as a guest any more. That '
            'is section 04.</li><li><strong>&ldquo;Windows cannot access&rdquo;, error '
            '0x80070035, or a message about the network path not being found.</strong> Either '
            'the address is wrong, the box is genuinely off the network, or it is the SMB1 case. '
            'Type the same address into a web browser instead: most NAS units have an admin '
            'page there. If the admin page loads but File Explorer cannot open the shares, you '
            'have found an SMB1-only box. That is also section 04, with a different '
            'ending.</li></ul><p>Do the test from the PC that updated. If you have another PC '
            'or a laptop that has not taken the update yet, trying from that one as well is '
            'worth a minute: it tells you whether the box changed or the PC did.</p>'},
   {'eyebrow': '/03 &mdash; DISCOVERY',
    'h2': 'Putting the Network view back',
    'html': '<p>If the address test opened the folders, the NAS is simply not being '
            '<em>looked for</em>. Work through these on the PC in order; most people are done '
            'after the first two.</p><ul><li><strong>Make the network Private.</strong> Open '
            'Settings, then Network &amp; internet, click your connection (Wi-Fi or Ethernet) '
            'and check the network profile type. After a big update it is often sitting on '
            'Public, which is the setting for a caf&eacute; or a hotel and deliberately hides '
            'everything. Switch it to Private.</li><li><strong>Turn discovery on for Private '
            'networks.</strong> In the same Network &amp; internet area, open Advanced network '
            'settings, then Advanced sharing settings. Under Private, both Network discovery and '
            'File and printer sharing should be on.</li><li><strong>Check the two discovery '
            'services.</strong> This is the one that catches people, because it looks fine from '
            'the settings pages. Press the Windows key, type <em>services</em> and open the '
            'Services app. Find <em>Function Discovery Provider Host</em> and <em>Function '
            'Discovery Resource Publication</em>. Both should be running, and their startup '
            'type should be Automatic (Delayed Start). An update can leave them on Manual and '
            'stopped, and with them stopped the Network view stays empty no matter what else '
            'you set. Right-click each, choose Properties, correct the startup type, and '
            'start them.</li><li><strong>Restart and give it a minute.</strong> The Network '
            'view fills in as devices announce themselves; it is not instant, and pressing F5 '
            'a few times over a minute or two is normal.</li></ul><p>If the box now shows but '
            'will not open when you double-click it, you have moved on to the next section '
            '&mdash; that is progress, not a new fault.</p>'},
   {'eyebrow': '/04 &mdash; PROTOCOL AND GUESTS',
    'h2': 'The fix that lasts is on the NAS, not on the PC',
    'html': '<p>When the NAS can be reached but not opened, the temptation is to loosen '
            'Windows until it gives in. Resist that; section 05 explains what it costs. The '
            'fix that lasts is to bring the <em>NAS</em> up to the standard Windows now '
            'expects, and on most boxes made in the last ten years that is a five-minute '
            'change in its admin page.</p><p><strong>Turn on a newer SMB version.</strong> Log '
            'in to the NAS admin page in a browser and find its Windows file-service settings. '
            'On a Synology it is under Control Panel, File Services, on the SMB tab, in the '
            'advanced settings, where you can set the minimum and maximum SMB protocol. On a '
            'QNAP it is under Control Panel, Network &amp; File Services, in the Microsoft '
            'Networking section&rsquo;s advanced options, as highest and lowest SMB version. '
            'Other makes put the same choice somewhere in their network or file-sharing '
            'settings. Set the maximum to SMB3 and the minimum to SMB2. While you are there, '
            'check for a firmware update from the maker: newer SMB support is exactly the '
            'kind of thing that arrives free in one.</p><p><strong>Give the share a real '
            'user.</strong> If the folders were shared with no password, create a user on the '
            'NAS &mdash; a name and a proper password &mdash; and give that user access to the '
            'shared folders. Then, on the PC, open the share by address, type that username '
            'and password when asked, and tick <em>Remember my credentials</em>. Windows keeps '
            'them in Credential Manager and reconnects silently from then on. Map a drive '
            'letter afterwards and it feels exactly as it did before, except that it will not '
            'break at the next update.</p><p><strong>If the box offers no SMB2 option at '
            'all</strong>, it is one of the SMB1-only generation, and there is no setting on '
            'it or on the PC that changes that safely. Its admin page will still let you reach '
            'the files in a browser, and some of those units can share by another route such '
            'as FTP for long enough to copy everything off. At that point the honest advice is '
            'that the data is worth more than the box: move it to a current NAS or a proper '
            'backup drive and retire the old one. We do that regularly for people, remotely '
            'where we can and by coming out to you where we cannot.</p>'},
   {'eyebrow': '/05 &mdash; THE BAD ADVICE',
    'h2': 'The three workarounds the internet will offer, and what each one costs',
    'html': '<p>Search this problem and three fixes come up again and again, each of them '
            'confident, each of them quick, and each of them a poor trade. It is worth knowing '
            'why before anyone does one of them to your PC.</p><ul><li><strong>&ldquo;Turn '
            'SMB1 back on in Windows Features.&rdquo;</strong> It works today. It is also the '
            'protocol at the heart of the ransomware outbreaks that shut hospitals a few years '
            'ago, it is a setting for the whole computer rather than for one NAS, and Windows '
            'will quietly remove it again after a fortnight of disuse &mdash; so it is a fix '
            'that breaks itself on a timer.</li><li><strong>&ldquo;Allow insecure guest '
            'logons.&rdquo;</strong> This is a policy or registry change that tells your PC to '
            'accept file shares that prove nothing about who is on the other end, from any '
            'device on any network it ever joins. It does not loosen one connection to one '
            'box; it loosens all of them.</li><li><strong>&ldquo;Disable SMB signing.&rdquo;'
            '</strong> Signing is what stops something on your network sitting in the middle '
            'of your file traffic and altering it. Turning it off to accommodate one old box '
            'removes that protection from every share the PC touches.</li></ul><p>The point is '
            'the ratio. Each of these weakens the entire computer to suit a single device that '
            'can almost always be brought up to date instead, in about the same amount of '
            'time. On a business network the trade is worse still, because the same PC reaches '
            'the accounts folder.</p><p>If you would rather not spend an evening on it, this '
            'is routine work for us: usually one remote session while you watch, or a visit '
            'anywhere across Bournemouth, Poole and Dorset if the box needs hands on it.</p>'}],
  'faqs': [
   {'q': 'Are the files on my NAS gone?',
    'a': 'Almost certainly not. A Windows update changes the PC, not the NAS, and the three '
         'faults that cause this &mdash; discovery switched off, an old file-sharing protocol '
         'no longer accepted, or a guest share now refused &mdash; are all about how the two '
         'machines talk, not about what is stored. The quickest reassurance is to type the '
         'NAS&rsquo;s address into a web browser: if its admin page loads, the box and its '
         'disks are alive and the files are where you left them.'},
   {'q': 'It worked perfectly before the update, so why not just uninstall the update?',
    'a': 'You can usually roll a big update back for a short while afterwards, and it would '
         'bring the NAS back. We would not advise it. These are deliberate security changes '
         'rather than bugs, so the update will return and you will be in the same position '
         'with less warning, and the PC goes without recent security fixes in the meantime. '
         'Fixing the NAS side takes about the same effort and stays fixed.'},
   {'q': 'The NAS shows in Network but will not open when I double-click it',
    'a': 'That is good news: it means discovery and the protocol are both fine. What is '
         'refusing you is almost always a guest share. Give the NAS a user with a password in '
         'its admin page, open the share by address on the PC, enter those details and tick '
         'Remember my credentials. If instead you get an error about the network path, try the '
         'address test in section 02 to separate a discovery glitch from an SMB1-only box.'},
   {'q': 'It still works from my laptop but not from the new PC',
    'a': 'Then the laptop has not yet taken the update that tightened things, or it is on an '
         'older Windows. The new PC is showing you what every machine will do once it '
         'updates, so it is worth fixing properly now rather than waiting for the laptop to '
         'join it. The fix is the same either way: a newer SMB version on the NAS and a real '
         'username on the share.'},
   {'q': 'Everyone online says to turn SMB1 back on &mdash; is that really so bad?',
    'a': 'It is the most common advice and the one we push back on hardest. SMB1 is the '
         'protocol the big ransomware outbreaks travelled through, switching it on affects the '
         'whole computer rather than the one connection to your NAS, and Windows removes it '
         'again automatically after a couple of weeks unused, so it does not even stay fixed. '
         'If your box genuinely cannot do anything newer, the data is worth more than the box '
         '&mdash; copy it off and retire it.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/shared-folders-not-working-after-windows-11-24h2-update/">Shared '
                    'folders after the 24H2 update</a> &middot; <a '
                    'href="/windows-11-cant-see-network-computers/">Windows 11 can&rsquo;t see '
                    'other computers</a> &middot; <a '
                    'href="/fix-shared-folder-error-0x80004005/">Shared folder error '
                    '0x80004005</a> &middot; <a '
                    'href="/mapped-network-drive-keeps-disconnecting/">Mapped drive keeps '
                    'disconnecting</a></p>'},

 {'slug': 'old-program-wont-open-on-windows-11',
  'title': 'Old Program Won&rsquo;t Open on Windows 11? Fix It | 365 Techies',
  'metaDesc': 'An old program will not open on your new Windows 11 PC. Most can be made to run: the five-minute tries, the missing pieces, and when it truly cannot.',
  'ogTitle': 'Old Program Won&rsquo;t Open on a New Windows 11 Computer',
  'crumbName': 'Old Program on Windows 11',
  'eyebrow': '// WINDOWS 11 SUPPORT',
  'h1': 'Old program won&rsquo;t open on a new Windows 11 computer',
  'lede': 'The new PC is lovely and everything on it works &mdash; except the one program you '
          'actually needed. The accounts package from 2011, the label-printer software, the '
          'stock program the business has run on since forever. It installs and then does '
          'nothing, or opens and closes, or the installer itself refuses with a message about '
          'this version of Windows. Most of these can be made to run, and often in five minutes. '
          'A few genuinely cannot, and it is better to know which you have before spending an '
          'evening on it. Here is how to tell.',
  'ctaHead': 'Program still refusing to open?',
  'ctaSub': 'We get older software running on new PCs for homes and businesses across Bournemouth, '
            'Poole and Dorset &mdash; usually remotely. Call 01202 775566.',
  'serviceName': 'Legacy Software and Windows 11 Support',
  'sections': [
   {'eyebrow': '/01 &mdash; WHAT STOPS IT',
    'h2': 'Six different reasons an old program refuses, and why it matters which',
    'html': '<p>&ldquo;It won&rsquo;t open&rdquo; covers half a dozen separate faults, and the '
            'fix for one does nothing for the others, so the first job is to work out which '
            'you are looking at. Nearly every case is one of these.</p><ul><li><strong>It '
            'checks the Windows version and refuses.</strong> Software written for Windows XP '
            'or 7 often looks at the version number, does not recognise 11, and stops. The '
            'program is perfectly capable of running; it just does not know it. This is the '
            'easiest fix of all.</li><li><strong>It needs a piece Windows no longer ships.'
            '</strong> Old programs lean on shared components &mdash; particular versions of '
            'the .NET Framework, Visual C++ runtimes, Java, or old games components &mdash; '
            'that a new PC does not have installed. The program dies quietly, or names the '
            'missing piece in an error.</li><li><strong>It is 16-bit.</strong> Software from '
            'the Windows 95 and 3.1 era. A 64-bit Windows &mdash; which every new PC runs '
            '&mdash; cannot run 16-bit programs at all. No setting changes that; only a '
            'virtual machine or an old PC does.</li><li><strong>It needs a driver Windows 11 '
            'blocks.</strong> Anything with a dongle, an old scanner, a serial adapter or a '
            'USB licence key relies on a driver, and Windows 11 refuses drivers that are '
            'unsigned or that its Core Isolation protection considers unsafe. The program '
            'opens, then says the device or the licence cannot be found.</li><li><strong>It '
            'wants to write where Windows no longer allows.</strong> Programs from the XP era '
            'assumed they could scribble in their own Program Files folder. Windows stopped '
            'permitting that years ago and they fail in odd ways.</li><li><strong>Windows '
            'blocked the installer itself.</strong> SmartScreen puts up &ldquo;Windows protected '
            'your PC&rdquo; for installers it has not seen before, which describes most old '
            'software. That is a warning, not a fault, and section 02 says how to treat '
            'it.</li></ul>'},
   {'eyebrow': '/02 &mdash; THE FIVE-MINUTE TRIES',
    'h2': 'Compatibility mode, run as administrator, and the warning that is not a fault',
    'html': '<p>These three settle most cases, and they are all on one tab. Do them in order '
            'on the program&rsquo;s own file &mdash; or on its installer, if it is the '
            'installer that refuses.</p><ul><li><strong>Compatibility mode.</strong> Right-click '
            'the program&rsquo;s shortcut or its <code>.exe</code>, choose Properties, open the '
            'Compatibility tab, tick <em>Run this program in compatibility mode for</em> and '
            'pick Windows 7 (or Windows 8 for something a little newer). This answers the '
            'version check: the program is told a Windows it recognises and gets on with '
            'it.</li><li><strong>Run as administrator.</strong> On the same tab, tick <em>Run '
            'this program as an administrator</em>. This cures the programs that expect to '
            'write inside their own folder the way XP allowed. If it helps but you would '
            'rather not hand a fifteen-year-old program full control every time, the better '
            'fix is to install it somewhere it is allowed to write, such as a folder under '
            'your Documents.</li><li><strong>The display settings on the same tab.</strong> '
            'Old programs that open as a tiny window, or blurry, or with a black screen, are '
            'usually cured by <em>Change high DPI settings</em> and ticking the override, or '
            'by <em>Disable fullscreen optimisations</em>. The tab also has a <em>Run '
            'compatibility troubleshooter</em> button that tries the common combinations for '
            'you.</li></ul><p>Then there is SmartScreen. When you run an old installer, '
            'Windows may show a blue box saying it protected your PC from an unrecognised app. '
            'That means &ldquo;I have not seen this file before&rdquo;, which is exactly what '
            'you would expect of a program from 2011. If &mdash; and only if &mdash; this is '
            'software you already own and installed yourself from its original disc or your '
            'own download, click <em>More info</em> and then <em>Run anyway</em>. If it is '
            'something you downloaded because a website told you to, or you are not sure '
            'where it came from, do not click through: that is the exact move the scams rely '
            'on, and it is worth a phone call to us first.</p>'},
   {'eyebrow': '/03 &mdash; THE MISSING PIECES',
    'h2': 'Putting back the components a new PC does not come with',
    'html': '<p>If the program names what it wants &mdash; a message about .NET Framework 3.5, '
            'or a file ending in <code>.dll</code> that could not be found &mdash; it has told '
            'you the fix. If it simply does nothing, these are still worth trying, because '
            'they are the pieces old software most often leans on.</p><ul><li><strong>.NET '
            'Framework 3.5.</strong> A very common one. If the program pops up a box saying it '
            'needs it and offering to download, say yes. Otherwise turn it on by hand: open '
            'Settings, go to Apps, then Optional features, and at the bottom open <em>More '
            'Windows features</em>. Tick <em>.NET Framework 3.5 (includes .NET 2.0 and '
            '3.0)</em> and let Windows fetch it.</li><li><strong>Visual C++ runtimes.</strong> '
            'Programs from roughly 2005 to 2013 each expect their own year&rsquo;s version. '
            'They are free from Microsoft, and the original installer often has them in a '
            'folder called something like <em>prerequisites</em> or <em>redist</em>. Install '
            'the year the program was built for.</li><li><strong>Old games and multimedia '
            'components.</strong> In the same Windows features list there is a <em>Legacy '
            'Components</em> entry containing DirectPlay, which older games and some '
            'educational software need to start.</li><li><strong>Java.</strong> Some older '
            'business software runs on Java and wants a particular old version. Be careful '
            'here: old Java is a security liability, and if the program needs it we would '
            'rather look at the program than leave old Java on a PC used for banking.</li>'
            '</ul><p>One reassurance while you are in this list: <strong>32-bit programs run '
            'perfectly well on 64-bit Windows 11</strong>. Almost everything from the last '
            'twenty years is 32-bit, and none of that is the problem. It is only 16-bit '
            'software, from the mid-1990s and earlier, that a modern PC cannot run at '
            'all.</p>'},
   {'eyebrow': '/04 &mdash; DONGLES AND DRIVERS',
    'h2': 'When the program opens but cannot find its device',
    'html': '<p>Label printers, older scanners, embroidery and cutting machines, weighing '
            'scales, till hardware, CAD software with a security dongle, and accounts packages '
            'licensed by a USB key all share a pattern: the program installs and opens, then '
            'says the device is not connected or the licence cannot be found. The program is '
            'fine. What is missing is the <em>driver</em> that lets Windows talk to the '
            'hardware, and Windows 11 is strict about those.</p><p>Two things stand in the '
            'way. Windows 11 refuses drivers that are not digitally signed, and many drivers '
            'from a decade ago never were. Separately, a protection called Core Isolation, '
            'with a setting called memory integrity, blocks drivers it judges unsafe even when '
            'they are signed, and it is on by default on new PCs. You will find it under '
            'Windows Security, Device security, in the Core isolation details, and it will '
            'name the driver it is blocking.</p><p>The internet&rsquo;s answer is to turn '
            'memory integrity off. It is a real option, and on a machine that does one job it '
            'is sometimes the only one &mdash; but be clear about the trade. It is a '
            'protection for the whole computer against a class of attack that works through '
            'exactly this kind of driver, and switching it off to run one program removes it '
            'for everything else on the PC. Before accepting that, try the two things that '
            'avoid it: check the manufacturer&rsquo;s website for a newer driver, because '
            'Windows 10 drivers are usually signed and usually work on 11 even when the site '
            'never mentions 11; and check whether the hardware maker has a current model or a '
            'current version of the software, because the cost of a new label printer is '
            'often less than the cost of a weakened PC. If it comes down to it, we would '
            'rather have that conversation with you than have you make the change without '
            'knowing what it means.</p>'},
   {'eyebrow': '/05 &mdash; WHEN IT TRULY WILL NOT',
    'h2': 'The three cases nothing fixes, and what to do instead',
    'html': '<p>Some software has reached the end, and it is kinder to say so than to sell '
            'another evening of trying. Three cases in particular.</p><ul><li><strong>16-bit '
            'software.</strong> Windows 95, Windows 3.1, DOS. A 64-bit Windows cannot run it '
            'and never will. Windows tells you with a message that the app cannot run on '
            'your PC.</li><li><strong>Software whose activation has gone.</strong> Programs '
            'that phoned home to a licence server that no longer exists, or that were locked '
            'to the old PC&rsquo;s hardware. They may install and then refuse to activate, '
            'and there is nothing on your side to change.</li><li><strong>Software that '
            'hard-fails the version check.</strong> A small number of programs will not '
            'accept compatibility mode and refuse outright. Rare, but real.</li></ul><p>Three '
            'ways forward, in the order we would suggest them. First, <strong>a current '
            'version or a modern equivalent</strong>: if it is an accounts package, the '
            'question is bigger than one program and we have written about the Sage case '
            'separately. Second, <strong>a virtual machine</strong>: an older Windows running '
            'in a window on the new PC, using a Windows licence you own, with the old program '
            'inside it. Windows 11 Pro has this built in; on Home a free tool does the same '
            'job. It is the right answer for one important program that cannot be replaced, '
            'with one rule &mdash; if the old Windows inside it is XP or 7, it stays off the '
            'internet. Third, <strong>keep the old PC for that one job</strong>, unplugged '
            'from the network. Since October 2025 a Windows 10 machine is no longer receiving '
            'security fixes, so it should not be on the internet at all; but as an offline '
            'box that runs one program, it can last for years. We do all three, remotely '
            'where the job allows and by coming out to you where it does not.</p>'}],
  'faqs': [
   {'q': 'Will a 32-bit program run on Windows 11?',
    'a': 'Yes. Every new PC runs 64-bit Windows, and 64-bit Windows runs 32-bit programs '
         'without complaint &mdash; which covers almost everything written in the last twenty '
         'years. The one thing it cannot run is 16-bit software from the mid-1990s and '
         'earlier. If Windows says the app cannot run on your PC, that is usually what you '
         'have found.'},
   {'q': 'It says &ldquo;this app can&rsquo;t run on your PC&rdquo; &mdash; what does that mean?',
    'a': 'Most often it means the program is 16-bit, and no setting on a 64-bit Windows will '
         'run it. Occasionally it means the file is damaged or was written for a different '
         'kind of processor. If the program is from the Windows 95 era it is the first; the '
         'options are a virtual machine running an older Windows, or an old PC kept offline '
         'for that one job.'},
   {'q': 'The program says it needs .NET Framework 3.5',
    'a': 'That is the friendliest failure there is, because it has told you the fix. If it '
         'offers to download the feature, let it. Otherwise open Settings, go to Apps, then '
         'Optional features, open More Windows features at the bottom, tick .NET Framework '
         '3.5 and let Windows fetch it. The program usually opens straight afterwards.'},
   {'q': 'Can I just put Windows 10 on the new PC instead?',
    'a': 'You could for a while, but it is not a fix. Windows 10 stopped receiving security '
         'updates in October 2025, so you would be putting an unprotected system on a new '
         'computer to run one old program. Compatibility mode, the missing components, or a '
         'virtual machine for the one program each solve the problem without doing that.'},
   {'q': 'Is it safe to click &ldquo;Run anyway&rdquo; on the Windows protected your PC box?',
    'a': 'Only when you know exactly what the file is: software you own and have installed '
         'yourself, from its original disc or your own download. For an old installer that '
         'is a perfectly normal warning, because Windows has simply never seen it before. If '
         'the file arrived because a website or a pop-up told you to download it, do not '
         'click through &mdash; that is precisely the move scams depend on. When in doubt, '
         'ring us before you click.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/sage-instant-accounts-windows-11/">Sage Instant Accounts on Windows '
                    '11</a> &middot; <a href="/windows-10-end-of-life/">Windows 10 end of '
                    'life</a> &middot; <a href="/dell-this-pc-cant-run-windows-11/">This PC '
                    'can&rsquo;t run Windows 11</a> &middot; <a '
                    'href="/will-i-lose-files-upgrading-to-windows-11/">Will I lose files '
                    'upgrading to Windows 11?</a> &middot; <a href="/cost-to-upgrade-office-to-windows-11/">What it costs to upgrade an office to Windows 11</a></p>'},

 {'slug': 'sharepoint-not-syncing-file-explorer',
  'title': 'SharePoint Files Not Syncing to File Explorer | 365 Techies',
  'metaDesc': 'SharePoint library fine on the web but missing or stuck in File Explorer? Sync or shortcut, what the cloud icon means, and a reset that loses nothing.',
  'ogTitle': 'SharePoint Files Not Syncing to File Explorer',
  'crumbName': 'SharePoint Not Syncing',
  'eyebrow': '// MICROSOFT 365 SUPPORT',
  'h1': 'SharePoint files not syncing to File Explorer',
  'lede': 'The team&rsquo;s document library has always lived in File Explorer under the company '
          'name, and now it is missing, or stuck on &ldquo;sync pending&rdquo;, or wearing a red '
          'cross. Open the same library in a web browser and everything is there. That last '
          'detail is the reassuring one: the files are safe in Microsoft 365, and what has '
          'stopped is the copy on this PC. There are two quite different ways a SharePoint '
          'library gets into File Explorer, and the fix depends on which one you used, so that '
          'is where to start.',
  'ctaHead': 'Library still not syncing?',
  'ctaSub': 'We support Microsoft 365, SharePoint and OneDrive for businesses across Bournemouth, '
            'Poole and Dorset &mdash; usually remotely, in one short session. Call 01202 775566.',
  'serviceName': 'SharePoint and OneDrive Sync Support',
  'sections': [
   {'eyebrow': '/01 &mdash; TWO ROUTES, NOT ONE',
    'h2': 'Sync and &ldquo;Add shortcut to OneDrive&rdquo; are different things',
    'html': '<p>Both routes use the same OneDrive app &mdash; the cloud icon by the clock '
            '&mdash; signed in with your <em>work</em> account, and both end with the '
            'library&rsquo;s files in File Explorer. But they put them in different places, '
            'they fail differently, and Microsoft will not let you use both on the same '
            'library.</p><ul><li><strong>Sync</strong> is the older route. Press the Sync '
            'button on a library in the browser and the whole library appears in File '
            'Explorer under a heading with your organisation&rsquo;s name, alongside your '
            'OneDrive. It is the route most offices set up years ago.</li><li><strong>Add '
            'shortcut to OneDrive</strong> is the newer one, and the one Microsoft now leads '
            'with. The library appears as a folder <em>inside</em> your OneDrive, follows '
            'you to any PC you sign in on, and behaves better with large libraries.</li></ul>'
            '<p>The two collide. If a library is already synced, trying to add a shortcut to '
            'it fails, and the other way round; you will see a message that the folder is '
            'already being synced, or that a shortcut already exists. So when a library has '
            'vanished from File Explorer, the first question is which route it used, because '
            'that tells you where to look for it and how to put it back. A library under the '
            'company name was synced; one inside your OneDrive folder was a shortcut.</p>'},
   {'eyebrow': '/02 &mdash; READ THE ICON',
    'h2': 'What the cloud by the clock is telling you',
    'html': '<p>Before changing anything, look at the OneDrive icon in the bottom-right corner '
            'of the screen &mdash; you may need to click the small arrow to see it. Its state '
            'is the diagnosis.</p><ul><li><strong>A grey cloud with a line through it</strong> '
            'means OneDrive is not signed in. Click it and sign in with your work address. '
            'Check the account list in its settings too: a personal OneDrive can be signed in '
            'while the work account has dropped off, and the library belongs to the work '
            'one.</li><li><strong>&ldquo;Paused&rdquo;</strong> is the commonest surprise. '
            'OneDrive pauses itself on a metered connection &mdash; a phone hotspot, some '
            'business broadband that reports itself that way &mdash; and when the laptop '
            'goes into battery saver. Both are switches in its settings, under Sync and '
            'backup.</li><li><strong>A red cross</strong> means particular files have errors. '
            'Click the icon and choose <em>View sync problems</em>: it names the files, and '
            'section 03 is about them.</li><li><strong>&ldquo;Sync pending&rdquo; that never '
            'ends</strong> usually means one of the problem files is blocking the queue, or '
            'the library is too large to sync in full. Same section.</li><li><strong>A blue '
            'cloud on a file</strong> is not a fault at all. It means the file is online-only '
            '&mdash; Files On-Demand keeps a placeholder and downloads it when you open it. '
            'The file is there; it is just not taking up space yet.</li></ul><p>If the icon '
            'is healthy and the library is simply absent, it may have been unlinked or the '
            'PC may never have had it: go back to the library in the browser and choose Sync '
            'or Add shortcut &mdash; one of them, not both.</p>'},
   {'eyebrow': '/03 &mdash; THE FILES THAT JAM IT',
    'h2': 'The handful of files that stop the whole library',
    'html': '<p>One awkward file can hold up thousands of good ones. <em>View sync '
            'problems</em> names them; these are the reasons they are on the list.</p><ul>'
            '<li><strong>The path is too long.</strong> SharePoint on the web tolerates deep '
            'folder trees and long names that Windows cannot: the full local path, from the '
            'drive letter to the end of the file name, has a limit of around 260 characters. '
            'A library that is fine in the browser jams the moment it is synced to '
            '<code>C:\\Users\\YourName\\Company Name\\...</code>. Shortening a folder name or '
            'two near the top usually clears a whole run of errors.</li><li><strong>Characters '
            'Windows will not accept.</strong> Names containing <code>\" * : &lt; &gt; ? / '
            '\\ |</code>, or ending in a full stop or a space, cannot exist as Windows files. '
            'Rename them in the browser.</li><li><strong>A file that is open.</strong> A '
            'spreadsheet someone has had open for a week, or a file another program has '
            'locked, cannot be updated until it is closed.</li><li><strong>Too many items.'
            '</strong> Microsoft&rsquo;s own guidance is to keep the total across everything '
            'you sync under about 300,000 files; beyond that the app slows to a crawl and '
            'looks stuck. A whole-company library synced in full on every laptop gets there '
            'sooner than you would think. The remedy is not to sync the whole library: use '
            'Add shortcut to OneDrive for the folders each person actually works in, or '
            'choose folders in the app&rsquo;s settings.</li></ul>'},
   {'eyebrow': '/04 &mdash; THE RESET',
    'h2': 'Resetting OneDrive without losing anything',
    'html': '<p>When the icon looks healthy, the problem list is empty, and it still will not '
            'move, reset the app. This is safe: it clears the app&rsquo;s own bookkeeping and '
            'makes it look again, and it does not delete anything from Microsoft 365 or '
            'anything already uploaded. One check first &mdash; open <em>View sync '
            'problems</em> and make sure nothing is waiting to upload, because a file that '
            'only exists on this PC and has never made it to the cloud is the one thing a '
            'reset can leave behind.</p><p>Sign out of OneDrive and back in first; that alone '
            'clears a surprising number of stalls. If not, press the Windows key and R '
            'together, and run <code>%localappdata%\\Microsoft\\OneDrive\\onedrive.exe '
            '/reset</code>. On some PCs the app lives under Program Files instead, in which '
            'case the same command with <code>C:\\Program Files\\Microsoft OneDrive\\'
            'onedrive.exe</code> is the one that works; use whichever is present. The icon '
            'disappears and returns within a couple of minutes, and the app re-checks every '
            'file against the cloud. On a large library that takes a while, and files show '
            'as syncing without any data actually moving.</p><p>Afterwards, if the library '
            'is still absent, put it back <strong>once</strong>, by one route. If it had been '
            'synced, sync it again; if it had been a shortcut, add the shortcut again. Doing '
            'both is the collision from section 01, and it produces exactly the symptoms you '
            'started with.</p>'},
   {'eyebrow': '/05 &mdash; WHEN IT IS NOT YOUR PC',
    'h2': 'When everyone lost it at once, the cause is on the admin side',
    'html': '<p>If one PC has the problem, it is the PC. If the whole office lost the library '
            'on the same morning, nothing on any of the PCs caused it &mdash; something '
            'changed in Microsoft 365, and no amount of resetting will bring it back. The '
            'usual suspects, in rough order of how often we meet them.</p><ul><li><strong>The '
            'library was set not to allow offline copies.</strong> There is a setting on each '
            'library, in its advanced settings, that controls whether it can be synced at all. '
            'A site owner tidying up can switch it off without realising what it does, and '
            'every synced copy stops.</li><li><strong>Sync was restricted to managed PCs.'
            '</strong> An administrator can allow syncing only from computers joined to the '
            'organisation, or only from particular devices. Home PCs and personal laptops '
            'drop off overnight.</li><li><strong>Permissions changed.</strong> A reorganised '
            'site, a group membership removed, or a guest account expiring. The library is '
            'still there; you no longer have the right to it.</li><li><strong>The '
            'organisation&rsquo;s own security rules.</strong> Conditional access policies '
            'can block sync from outside the office, or from a device that has not met a '
            'requirement.</li></ul><p>All of these are fixed in the Microsoft 365 admin '
            'centres, not on the PC, and they need whoever administers your tenant. If that '
            'is a previous IT provider who has gone quiet, that is a problem we have written '
            'about separately and one we deal with often. If it is us, or you would like it '
            'to be, this is a short remote session: we look at the PC side and the admin side '
            'together and put the library back where it was.</p>'}],
  'faqs': [
   {'q': 'Should we use Sync or Add shortcut to OneDrive?',
    'a': 'Microsoft now leads with Add shortcut to OneDrive, and for most people it is the '
         'better choice: it follows you to every PC you sign in on and copes better with '
         'large libraries. Sync still makes sense when a whole library genuinely needs to be '
         'available offline on one machine. The one firm rule is never both on the same '
         'library &mdash; that is the collision that produces the symptoms on this page.'},
   {'q': 'Files show a blue cloud icon &mdash; are they missing?',
    'a': 'No. A blue cloud means the file is online-only: OneDrive keeps a placeholder on the '
         'PC and downloads the real file the moment you open it. It is how Files On-Demand '
         'saves space. Right-click a file or folder and choose Always keep on this device if '
         'you want it downloaded for use offline.'},
   {'q': 'Will resetting OneDrive delete our files?',
    'a': 'No. A reset clears the app&rsquo;s own records and makes it re-check every file '
         'against Microsoft 365; nothing in the cloud is touched and nothing already uploaded '
         'is lost. The one thing to check first is View sync problems, so that a file which '
         'only ever existed on this PC and never uploaded is not left behind.'},
   {'q': 'It works on one PC but not on another',
    'a': 'Then it is that PC. The usual differences are the account signed into OneDrive '
         '&mdash; a personal one rather than the work one &mdash; an older version of the '
         'app, a paused state from battery saver or a metered connection, or a longer local '
         'path because of a longer user name. Section 02 and 03 cover all four, and they are '
         'quick to check.'},
   {'q': 'Everyone in the office lost the library on the same day',
    'a': 'That is never the PCs; something changed in Microsoft 365. A library setting was '
         'switched off, sync was restricted to managed computers, permissions changed, or a '
         'security policy tightened. It is fixed by whoever administers your tenant, in the '
         'admin centres rather than on any laptop, and we can look at both sides in one '
         'remote session.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/onedrive-problems/">OneDrive problems</a> &middot; <a '
                    'href="/files-missing-from-onedrive/">Files missing from OneDrive</a> '
                    '&middot; <a href="/onedrive-keeps-asking-to-sign-in/">OneDrive keeps asking '
                    'to sign in</a> &middot; <a href="/excel-onedrive-sync-conflicts/">Excel '
                    'sync conflicts</a> &middot; <a '
                    'href="/former-it-provider-controls-microsoft-365/">Former IT provider still '
                    'controls Microsoft 365</a> &middot; <a '
                    'href="/microsoft-365-support/">Microsoft 365 support</a></p>'},

 {'slug': 'talktalk-email-not-working-android',
  'title': 'TalkTalk Email Not Working on Android? Fix It | 365 Techies',
  'metaDesc': 'TalkTalk email stopped on your Android phone but works on the computer? Why old settings fail, how to prove it is the phone, and the setup that works.',
  'ogTitle': 'TalkTalk Email Not Working on Your Android Phone',
  'crumbName': 'TalkTalk Email on Android',
  'eyebrow': '// EMAIL SUPPORT',
  'h1': 'TalkTalk email not working on your Android phone',
  'lede': 'It worked for years. Now the phone says it could not sign in, or nothing new has '
          'arrived since a date you can name, or it sends but never receives &mdash; and yet '
          'the same email works perfectly in a web browser or on the computer. That last part '
          'is the clue. The account is fine; what has gone stale is the set of instructions '
          'the phone remembered when the account was first added, often years ago. Here is why '
          'that happens with TalkTalk in particular, how to prove which side the fault is on in '
          'two minutes, and the setup that works now.',
  'ctaHead': 'Phone still refusing to fetch your email?',
  'ctaSub': 'We set up email on phones and computers for people across Bournemouth, Poole and '
            'Dorset &mdash; usually remotely, while you watch. Call 01202 775566.',
  'serviceName': 'Email Setup and Support',
  'sections': [
   {'eyebrow': '/01 &mdash; WHY NOW',
    'h2': 'Why an account that worked for years stops on the phone',
    'html': '<p>An email app on a phone does not look up how to reach your provider every '
            'time. It asks once, when the account is added, and stores the answer: which '
            'server to talk to, on which port, with which kind of security, using which '
            'method. Then it uses that answer for years. Providers, meanwhile, change their '
            'side &mdash; retiring old server names, switching off the unencrypted '
            'connections that were normal a decade ago, moving the whole mail service to a '
            'new platform &mdash; and TalkTalk has done all of those at one time or another. '
            'A phone set up under the old instructions keeps knocking at a door that has '
            'been bricked up.</p><p>Three things account for nearly every TalkTalk case on '
            'Android.</p><ul><li><strong>The phone was set up with POP, not IMAP.</strong> '
            'Older phones and older versions of the mail apps guessed at settings, and often '
            'chose the old POP method. POP downloads mail to one device and can remove it '
            'from the server, which is why email sometimes vanishes from the computer after '
            'the phone has fetched it, or the other way round. It also stops working the '
            'moment the provider retires the old server name it was pointed '
            'at.</li><li><strong>The password changed, and the phone is still trying the old '
            'one.</strong> TalkTalk has required password resets over the years, and if the '
            'phone keeps presenting the old password it can lock the account for a while '
            '&mdash; which then breaks the computer too, for an hour or so, and sends you '
            'looking in the wrong place.</li><li><strong>The phone itself stopped the app '
            'checking.</strong> Android is aggressive about battery. A mail app that has been '
            'put to sleep by battery optimisation, or an account whose sync has been switched '
            'off, simply stops fetching, and no server setting fixes that.</li></ul><p>One '
            'more thing worth knowing: addresses ending <code>@talktalk.net</code>, '
            '<code>@tiscali.co.uk</code> and <code>@lineone.net</code> are all the same '
            'TalkTalk Mail service underneath, so everything on this page applies to all of '
            'them.</p>'},
   {'eyebrow': '/02 &mdash; PROVE WHICH SIDE',
    'h2': 'Two minutes that tell you whether it is the account or the phone',
    'html': '<p>Before touching any settings, find out where the fault is. Open a web browser '
            '&mdash; on the phone is fine, on a computer is easier &mdash; and sign in to '
            'TalkTalk&rsquo;s webmail with the full email address and the password.</p><ul>'
            '<li><strong>If webmail refuses the password</strong>, the account is the '
            'problem, and nothing on the phone will help until it is sorted. Use the '
            'forgotten-password route through your TalkTalk account, set a new password, and '
            'then wait a little while before trying the phone: if the phone has been '
            'hammering the old password, the account may be temporarily locked and needs a '
            'few minutes to clear.</li><li><strong>If webmail opens and the mail is all there'
            '</strong>, the account is fine and the phone is at fault. That is the usual '
            'outcome, and it is the good one: the fix is on the device in your hand, and '
            'nothing is lost.</li></ul><p>While you are in webmail, look at the date of the '
            'newest message. If new mail is arriving there but stopped on the phone on a '
            'particular day, that day is often the day a password was changed, the phone '
            'updated, or the provider retired something &mdash; a useful clue, though not one '
            'you need in order to fix it.</p>'},
   {'eyebrow': '/03 &mdash; THE SETUP THAT WORKS',
    'h2': 'Remove the old account and add it back by hand',
    'html': '<p>Do not try to edit the existing account on the phone. Its stored settings are '
            'the problem, and mail apps hide half of them. Remove it and add it again '
            'manually, choosing the settings yourself rather than letting the app guess. '
            'Nothing is lost by removing it: with IMAP, every message lives on the server and '
            'comes straight back.</p><p>In the Gmail app, open the menu, go to Settings, '
            'choose <em>Add account</em>, and pick <em>Other</em> rather than any of the '
            'named providers. In the Samsung Email app the equivalent is Add account, then '
            'Other. When the app asks what kind of account, choose <strong>IMAP</strong>, '
            'never POP. Then enter the settings by hand.</p><p>At the time of writing, '
            'TalkTalk&rsquo;s current settings are: incoming server <code>mail.talktalk.net'
            '</code> on port 993 with SSL/TLS security, outgoing server <code>smtp.talktalk.net'
            '</code> on port 587 with STARTTLS, the username is your <em>full</em> email '
            'address, and the password is your TalkTalk Mail password. Leave the outgoing '
            'sign-in setting as the app sets it, and if sending refuses, compare the outgoing '
            'settings with TalkTalk&rsquo;s own Android guide before changing them. Providers '
            'do change these, so if the phone still refuses, check them against '
            'TalkTalk&rsquo;s own help pages rather than against a forum post from years '
            'ago &mdash; and if anything on this page ever disagrees with TalkTalk&rsquo;s '
            'own, TalkTalk is right.</p><p>Once it connects, the folders fill in over a few '
            'minutes. If you had a lot of mail, give it time before deciding something is '
            'missing.</p>'},
   {'eyebrow': '/04 &mdash; THE ANDROID TRAPS',
    'h2': 'When the settings are right and it still goes quiet',
    'html': '<p>If the account was added correctly and worked for a day or a week and then '
            'went quiet, the settings are not the problem &mdash; the phone is stopping the '
            'app from doing its job. These are the switches to check, and they are the same '
            'on most Android phones even if the exact wording varies.</p><ul><li><strong>'
            'Battery optimisation.</strong> Android puts apps to sleep to save power, and a '
            'sleeping mail app does not check for mail. In Settings, under Apps, find the '
            'mail app, open its battery setting and set it to unrestricted, or take it out of '
            'the optimised list. On some phones there is a separate &ldquo;sleeping apps&rdquo; '
            'list in the battery settings that does the same thing.</li><li><strong>Account '
            'sync switched off.</strong> In Settings, under Accounts (or Passwords and '
            'accounts), open the email account and check that sync for mail is on. A single '
            'accidental tap turns it off and nothing announces it.</li><li><strong>Sync '
            'frequency set to manual.</strong> Inside the mail app&rsquo;s account settings '
            'there is a check frequency. Manual means it only looks when you open the app '
            'and pull down.</li><li><strong>Storage full.</strong> A phone with no free space '
            'stops downloading new mail silently. Free some space and it catches '
            'up.</li><li><strong>Sending fails only on mobile data.</strong> An account that '
            'sends fine on home Wi-Fi but not out and about is a symptom of stale outgoing '
            'settings from an older setup. Compare the outgoing server, port and security '
            'with TalkTalk&rsquo;s own Android guide, correct them, and it sends everywhere.'
            '</li></ul><p>And a note on two devices: if the old setup used POP on the phone '
            'and the computer also collects the mail, the two can fight over what has been '
            'downloaded and what should be deleted. Putting both on IMAP ends that for good, '
            'because both then look at the same mailbox on the server.</p>'},
   {'eyebrow': '/05 &mdash; THE BIGGER QUESTION',
    'h2': 'Is a broadband provider&rsquo;s email worth keeping?',
    'html': '<p>Once the phone is working again, this is worth five minutes&rsquo; thought. '
            'An email address that belongs to a broadband provider is tied to the broadband '
            'account. Providers vary in what they do with the mailbox if you leave, and '
            'policies change, so the honest advice is to check TalkTalk&rsquo;s current terms '
            'rather than assume &mdash; but the general rule with any provider&rsquo;s email '
            'is the same: it is not really yours, and it can become a reason you cannot '
            'switch broadband even when you want to.</p><p>The alternative is an address '
            'that is independent of who supplies your internet &mdash; Gmail or Outlook.com '
            'for most people &mdash; with the old TalkTalk address kept alive and forwarding '
            'into it while friends, banks and online shops are gradually moved across. It '
            'does not have to happen in one go, and nothing needs to be lost. We have written '
            'up the same move for other providers, and the pattern is identical; we also do '
            'it for people, remotely while you watch, and set the phone up properly at the '
            'same time.</p><p>None of that is urgent. Get the phone working first. But if '
            'this is the second or third time the provider&rsquo;s email has stopped on a '
            'device, that is the provider telling you something.</p>'}],
  'faqs': [
   {'q': 'What are the TalkTalk email settings for an Android phone?',
    'a': 'At the time of writing: choose IMAP, not POP; incoming server mail.talktalk.net on '
         'port 993 with SSL/TLS; outgoing server smtp.talktalk.net on port 587 with STARTTLS; '
         'the username is your full email address and the password is '
         'your TalkTalk Mail password. Providers change these occasionally, so if the phone '
         'refuses, check them against TalkTalk&rsquo;s own help pages, which are the final '
         'word.'},
   {'q': 'My TalkTalk email works on the computer but not on the phone',
    'a': 'Then the account is fine and the phone&rsquo;s stored settings are stale &mdash; '
         'usually an old POP setup pointed at a server name that has been retired, or an old '
         'password it keeps presenting. Remove the account from the phone and add it back by '
         'hand as an IMAP account with the current settings. Nothing is lost by removing it; '
         'with IMAP your mail lives on the server and comes straight back.'},
   {'q': 'It says the password is incorrect, but it is the right password',
    'a': 'Two common causes. The phone may still hold an old password behind the scenes and '
         'be trying that. Or the account has been temporarily locked because the phone kept '
         'trying the wrong one, in which case the right password fails too for a short '
         'while. Prove it in webmail first: if webmail accepts it, remove and re-add the '
         'account on the phone; if webmail refuses it, reset the password through your '
         'TalkTalk account and wait a few minutes before trying again.'},
   {'q': 'Can I use the Gmail app for TalkTalk email?',
    'a': 'Yes, and it is what we would usually suggest. Add the account through the '
         'Gmail app&rsquo;s Add account option, choose Other, pick IMAP, and enter the '
         'TalkTalk settings by hand rather than letting it guess. The Samsung Email app '
         'works the same way. Either is better than an app that set the account up '
         'automatically years ago.'},
   {'q': 'Is TalkTalk email closing down?',
    'a': 'We cannot point to an announcement that it is, and we would not want to guess. '
         'What is always true of any broadband provider&rsquo;s email is that it belongs to '
         'the broadband account rather than to you, and its future depends on the provider. '
         'That is the reason, once the phone is working, to think about moving to an '
         'independent address with the old one forwarding into it &mdash; gradually, with '
         'nothing lost.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/outlook-not-syncing-android/">Outlook not syncing on Android</a> '
                    '&middot; <a href="/outlook-app-asking-to-sign-in-android/">Outlook app '
                    'keeps asking to sign in</a> &middot; <a '
                    'href="/move-plusnet-email-to-gmail/">Moving Plusnet email to Gmail</a> '
                    '&middot; <a href="/btinternet-email-wont-add-to-new-outlook/">BT email '
                    'and the new Outlook</a> &middot; <a '
                    'href="/sky-email-wont-add-to-new-outlook/">Sky email and the new '
                    'Outlook</a></p>'},
]
