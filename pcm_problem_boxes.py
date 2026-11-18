"""365 PC Manager boxes on EXISTING problem pages (13 Oct 2026). Owner: "do them all including six".

Why these pages: seo-research/pcm-problems-2026-10-13/FINDINGS.md - GSC (3 months) showed these problem pages already rank
(mostly abroad) with no PC Manager box, and Bing showed the demand behind them; each box names only what the app really does
(checked in the v37 source, D:/claude/365-pc-manager-v37/src):
  battery   - Battery.Read: Windows' own WMI capacity figures, laptops only, health % + cycle count (This PC / Power)
  isitdown  - IsItDown.cs: our status checker + the PC trying each service itself; services' front doors only
  printers  - Program.cs Printers: Windows' offline/problem state, stuck documents (+ Clear stuck documents), print service
  windows   - Spec.cs + Esu.cs: Windows version and update end date; on Windows 10, real ESU enrolment from update history
  wifi      - NetCheck.cs: signal, 2.4/5 GHz, standard, link rate, lag test, VPN, DNS - NOT a dropout log (said so)
  remote    - RemoteAccess.cs: certain only for Windows' own signals (RDP, Quick Assist/msra, a non-365 Splashtop viewer),
              AnyDesk/TeamViewer lists of who connected; the two scam pages are the owner's call ("including six")
A page filter (like techies_one_boxes): the box goes straight after "Fix it with me" (#fixflow) where a page has one, else
just before its FAQ section. Pictures and captions: pcm_feature_pages_data.SHOTS / CAPS.
"""
import sys

import build_pages as bp
import pcm_feature_pages_data as pfp
import yt_watch

# key -> (picture, box heading, what it does); _CLIP = the 9-second clip that replaces the picture (none for Wi-Fi: no Wi-Fi screen)
_CLIP = {'battery': 'battery', 'isitdown': 'isitdown', 'printers': 'printers', 'windows': 'windows', 'remote': 'remote',
         'printupd': 'printers', 'devices': 'devices'}   # (wave 2, 13 Oct)
_BOX = {
    'battery': ('battery', 'Battery health: how much charge does yours really hold?',
        '<p style="margin:0">On a laptop, our free app reads Windows&rsquo; own measurement of the battery and shows its <strong>health</strong> &mdash; how much of its '
        'original charge it still holds &mdash; and how many <strong>charge cycles</strong> it has done, on its <strong>This PC</strong> page. A desktop never sees it, '
        'and nothing is estimated. It also explains how many laptops can stop charging at about 80% to slow the wear down.</p>'),
    'isitdown': ('isitdown', 'Is it down, or just you? Let your PC check both ends',
        '<p style="margin:0">Our free app asks our status checker whether Gmail, Outlook, BBC iPlayer, Netflix, WhatsApp, Facebook, Zoom and others are having problems '
        'for everyone &mdash; and at the same time tries to reach each one from your PC. So it can say <strong>it&rsquo;s down for everyone</strong>, <strong>it&rsquo;s '
        'just this PC or this connection</strong>, or <strong>this PC is offline</strong>. Only the services&rsquo; own front doors are contacted; nothing about you is sent.</p>'),
    'printers': ('printer', 'Printers: is it offline, or stuck?',
        '<p style="margin:0">Our free app lists every printer as Windows sees it and says whether Windows thinks it&rsquo;s <strong>offline</strong> or has a problem, '
        'which documents are <strong>stuck in the queue</strong> (with a button that clears only those), and whether Windows&rsquo; printing service is running. '
        'After a new router or Wi-Fi password, a printer showing as offline usually hasn&rsquo;t joined the new network yet. It only reads, until you press a button.</p>'),
    'windows': ('thispcwin', 'Is this PC still getting security updates?',
        '<p style="margin:0">Our free app&rsquo;s <strong>This PC</strong> page says which Windows this PC has and until when it gets security updates. On Windows 10 it '
        'checks whether the PC is actually enrolled in Microsoft&rsquo;s <strong>Extended Security Updates</strong>, from Windows Update&rsquo;s own history, and it says '
        'whether the PC can probably move to Windows 11 for free.</p>'),
    'wifi': ('netcheck', 'See your Wi-Fi the way Windows sees it',
        '<p style="margin:0">Our free app&rsquo;s <strong>Network check</strong> reads your connection straight from Windows: on Wi-Fi, the <strong>signal strength</strong>, '
        'whether you&rsquo;re on <strong>2.4 or 5 GHz</strong>, the Wi-Fi standard and the link speed. Its lag test shows the delay when the line is busy, and it checks for a '
        'VPN and which DNS your PC uses. It shows your connection as it is now; it doesn&rsquo;t keep a log of dropouts. On Windows 11 version 24H2 and later, Windows '
        'only shares Wi-Fi details with apps while Location is switched on, and the app tells you so.</p>'),
    # wave 2 (13 Oct 2026, owner: "yes start with number 1" - videos on the problem pages that get the traffic): what the v40
    # source really does - Printers reads Windows' Spooler service state and says when it has stopped (no restart button: it
    # says restarting the PC usually brings it back); NetDevices = ping + ARP + the discovery Windows' own Network folder uses
    # (SSDP/UPnP, WS-Discovery incl. ONVIF cameras, mDNS, NetBIOS); no log-ins, no port scan, never on a Public network.
    'printupd': ('printer', 'Has Windows lost the printer, or stopped printing?',
        '<p style="margin:0">Our free app lists every printer Windows still knows and whether it&rsquo;s <strong>offline</strong>, shows any documents '
        '<strong>stuck in the queue</strong> (with a button that clears only those), and says whether Windows&rsquo; <strong>printing service</strong> is '
        'running. When that service stops, printers vanish and nothing prints; the app says so, and restarting the PC usually brings it back. '
        'It only reads, until you press a button.</p>'),
    'devices': ('devices', 'See everything on your network',
        '<p style="margin:0">Our free app&rsquo;s <strong>Devices on your network</strong> scan lists what&rsquo;s connected to your router &mdash; PCs, '
        'phones, <strong>printers</strong>, <strong>cameras and recorders</strong>, TVs and storage drives &mdash; with each one&rsquo;s address, found the '
        'same way Windows finds them for its Network folder. So after a new router you can see at once whether the printer or camera has joined. It '
        'doesn&rsquo;t log in to anything or change anything, and it never scans a public network such as a caf&eacute;&rsquo;s.</p>'),
    # 21 Oct 2026: the OneDrive disk-space page - what Storage & space really shows (drives, temporary files, biggest files)
    'storage': ('storage', 'How full is each drive, and what&rsquo;s filling it?',
        '<p style="margin:0">Our free app&rsquo;s <strong>Storage &amp; space</strong> page shows how full every drive is, clears Windows&rsquo; '
        '<strong>temporary files</strong>, and finds your <strong>biggest files</strong>, with buttons to open each one or its folder. So after freeing up '
        'OneDrive you can see at once whether the C: drive has its room back, and what else is using it.</p>'),
    # 18 Nov 2026 (owner: "if it mentions the 365 PC Manager ... the Microsoft Store download ... a picture ... a video"): the
    # Be Ready / cyber attacks pages. Only what the app really does (the health-check table on /free-pc-health-check/ and
    # /update-all-your-programs/): Windows Update arriving, Programs check (out-of-date programs updated with one button via
    # winget, programs with no security fixes, two security programs at once), protection on, backup genuinely running,
    # remote-control programs, and (36.9 / build 49, Safety settings) whether a password manager is in use - installed app or
    # browser add-on, advice only, it never reads a password store (owner, 18 Oct). 30 days of everything: every NEW install gets it by itself (api/pcm-plus-lib.php
    # plus_trial_auto_uk since 13 Oct, plus_trial_auto_abroad since 18 Oct; one per PC, never linked/ours/on a plan) - owner, 18 Nov.
    'beready': ('appupdates', 'Get your PC ready in one free app',
        '<p style="margin:0">Our free app checks the computer side of the government&rsquo;s list for you: whether <strong>Windows updates</strong> are '
        'arriving, which <strong>programs are out of date</strong> (and updates them with one button), programs that <strong>no longer get security '
        'fixes</strong>, whether your <strong>protection is switched on</strong>, whether a <strong>backup is genuinely running</strong>, whether '
        'you use a <strong>password manager</strong>, and any <strong>remote-control programs</strong> a scammer may have left behind. Everything is explained in plain English, and nothing changes until '
        'you press a button.</p>'
        '<p style="margin:.6rem 0 0"><strong>Free to download and use, with no sign-up, and every new install gets 30 days of everything free</strong>, '
        'so you can try the full service and see what it finds before deciding anything.</p>'),
    'remote': ('remote', 'Is anyone still connected to your PC?',
        '<p style="margin:0">Our free app&rsquo;s <strong>Remote access</strong> page says for certain whether a Remote Desktop, Quick Assist or Splashtop session is open '
        'right now, lists the remote-control programs on the PC and which are running, and reads AnyDesk&rsquo;s and TeamViewer&rsquo;s own lists of who has connected. '
        'It changes nothing unless you press a button.</p>'),
}

# slug -> (box key, section eyebrow, section heading, lead sentence)
PAGES = {
    'laptop-turns-off-when-unplugged': ('battery', '// CHECK THE BATTERY FIRST', 'Is it the battery?',
        'A laptop that switches off the moment it&rsquo;s unplugged usually has a worn battery. Check how much it still holds: '
        '<a href="/how-to-check-laptop-battery-health/">how to check your laptop&rsquo;s battery health</a>, or let our free app read it for you.'),
    'laptop-shuts-down-at-30-percent-battery': ('battery', '// CHECK THE BATTERY FIRST', 'Is it the battery?',
        'Shutting off with charge still showing is the classic sign of a worn battery. Check how much it still holds: '
        '<a href="/how-to-check-laptop-battery-health/">how to check your laptop&rsquo;s battery health</a>, or let our free app read it for you.'),
    'laptop-shuts-off-when-moved': ('battery', '// CHECK THE BATTERY', 'Rule out the battery',
        'If it only switches off on battery, check the battery&rsquo;s health before anything else: '
        '<a href="/how-to-check-laptop-battery-health/">how to check your laptop&rsquo;s battery health</a>, or let our free app read it for you.'),
    'is-it-down': ('isitdown', '// ALSO IN OUR FREE WINDOWS APP', 'Prefer it on your PC?',
        'Our checker above looks from our server. Our free Windows app looks from both ends at once.'),
    'broadband-down': ('isitdown', '// IS IT YOU OR THEM?', 'Is it your PC, or the service?',
        'If only one website or app won&rsquo;t work, our free Windows app tells you whether it&rsquo;s down for everyone or just you.'),
    'printer-wont-connect-after-changing-broadband': ('printers', '// THE QUICK CHECK', 'See what Windows thinks of your printer',
        'Not sure whether the printer is offline or the queue is stuck? Our free app reads it from Windows in seconds.'),
    'printer-says-wifi-password-incorrect': ('printers', '// THE QUICK CHECK', 'See what Windows thinks of your printer',
        'Once the printer has the right password, our free app shows whether Windows can see it again and clears anything stuck in the queue.'),
    'printer-stopped-working-after-changing-wifi-password': ('printers', '// THE QUICK CHECK', 'See what Windows thinks of your printer',
        'Not sure whether the printer is offline or the queue is stuck? Our free app reads it from Windows in seconds.'),
    # wave 2: the biggest printer page, the EE-hub printer page and the CCTV page (GSC, 3 months to 13 Oct: 12,465 / 3,735 / 1,565 impressions)
    'printer-disappeared-after-windows-update': ('printupd', '// THE QUICK CHECK', 'Is Windows&rsquo; printing service still running?',
        'After an update, a printer can vanish because Windows&rsquo; printing service has stopped. Our free app shows whether it&rsquo;s running, '
        'and lists every printer Windows still knows.'),
    'printer-wont-connect-to-ee-smart-hub': ('devices', '// IS IT ON YOUR NETWORK?', 'Has the printer joined your hub?',
        'Not sure whether the printer made it onto the Smart Hub&rsquo;s network? Our free app scans your network and lists what&rsquo;s there, '
        'printers included, with each one&rsquo;s address.'),
    # 20 Oct 2026 (owner: "still promote the PC Manager ... get some views on our YouTube channel"): the other router printer
    # pages, the box after the explanation, before "let us do it" (AFTER_SECTION) as on the EE page
    'printer-wont-connect-to-bt-smart-hub': ('devices', '// IS IT ON YOUR NETWORK?', 'Has the printer joined your Smart Hub?',
        'Not sure whether the printer made it onto the Hub&rsquo;s network? Our free app scans your network and lists what&rsquo;s there, '
        'printers included, with each one&rsquo;s address.'),
    'printer-wont-connect-to-sky-router': ('devices', '// IS IT ON YOUR NETWORK?', 'Has the printer joined your Sky wifi?',
        'Not sure whether the printer made it onto the Sky hub&rsquo;s network? Our free app scans your network and lists what&rsquo;s there, '
        'printers included, with each one&rsquo;s address.'),
    'printer-wont-connect-after-moving-house': ('printers', '// THE QUICK CHECK', 'See what Windows thinks of your printer',
        'Printer on the new wifi but the computer still won&rsquo;t print? Our free app shows whether Windows sees it as offline and clears anything stuck in the queue.'),
    'cctv-not-working-after-changing-broadband': ('devices', '// IS IT ON YOUR NETWORK?', 'Is the recorder on your new network?',
        'After a new router, the recorder or cameras often haven&rsquo;t joined its network yet. Our free app scans your network and lists '
        'what&rsquo;s connected, cameras and recorders included.'),
    'onedrive-taking-up-space': ('storage', '// SEE WHAT&rsquo;S USING THE SPACE', 'Has the C: drive got its room back?',
        'Freed up OneDrive and want to see the difference, or find what else is filling the drive? Our free app shows every drive and your biggest files.'),
    'windows-10-end-of-life': ('windows', '// CHECK YOUR OWN PC', 'Is your PC still getting updates?',
        'Not sure which Windows you have, or whether extended updates are really reaching it? Our free app reads it from Windows.'),
    'wifi-keeps-dropping': ('wifi', '// SEE YOUR SIGNAL', 'Check your Wi-Fi signal from the PC',
        'Want to see how strong the signal is where you sit, and which band you&rsquo;re on? Our free app reads it from Windows.'),
    'i-think-ive-been-hacked': ('remote', '// CHECK WHO CAN GET IN', 'Is anyone still connected?',
        'If someone was given remote access, or you&rsquo;re not sure, check whether anyone can still get in.'),
    'ive-been-scammed-what-to-do': ('remote', '// ONCE THE CALL HAS ENDED', 'Is anyone still connected to your PC?',
        'If a caller had you install AnyDesk, TeamViewer or Quick Assist, check that they can&rsquo;t still get in.'),
    # 18 Nov 2026: the stay-safe pages (stay_safe_pages_data.py, breach_guide_data.py)
    'be-ready-digital-checklist': ('beready', '// DO THE COMPUTER PART NOW', 'Check your PC in a few minutes, free',
        'Updates, programs, protection and backups are the part of being ready that people put off. Now, before anything goes '
        'wrong, is the time to do it, and our free Windows app does the checking for you.'),
    'cyber-threats': ('beready', '// STEPS 3, 4 AND 5, CHECKED FOR YOU', 'See where your PC stands, free',
        'Most attacks get in through something out of date. Our free Windows app shows what needs updating, what no longer gets '
        'security fixes and whether your backup is really running, in plain English.'),
    'data-breaches': ('remote', '// CLICKED A LINK, OR LET SOMEONE CONNECT?', 'Check your PC, free',
        'A company&rsquo;s breach doesn&rsquo;t touch your PC. If you also clicked a scam link or let someone connect to your '
        'computer, our free Windows app checks whether anyone can still get in.'),
}

# 18 Nov 2026: extra lines after the box (the 365 PC Manager full tour on YouTube, 5 minutes)
_AFTER_BOX = {
    'beready': lambda: '<p style="margin:1.1rem 0 0">' + yt_watch.button(yt_watch.PCM_TOUR, "Watch the 5-minute tour of 365 PC Manager") + '</p>',
}


def _section(slug):
    key, eyebrow, head, lead = PAGES[slug]
    pic, bhead, what = _BOX[key]
    be = sys.modules.get('build_extra')
    setup = getattr(be, 'PCM_SETUP_V30', None) if be else None
    if not setup:
        return ''
    box = pfp._app_box(pic, bhead, what, setup, clip=_CLIP.get(key, ''))
    extra = _AFTER_BOX[key]() if key in _AFTER_BOX else ''
    return ('    <section class="section" aria-label="In our free app" id="in-the-app">\n      <div class="wrap" style="max-width:980px">\n'
            '        <p class="eyebrow mono">' + eyebrow + '</p>\n'
            '        <h2 class="section-title" data-title>' + head + '<span class="title-underline"></span></h2>\n'
            '        <p>' + lead + '</p>\n        ' + box + extra + '\n      </div>\n    </section>\n')


def _section_end(html, start):
    depth = 0
    import re
    for m in re.finditer(r"<(/?)section\b", html[start:]):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return html.index(">", start + m.end()) + 1
    return -1


# 20 Oct 2026: pages whose box goes after a named section instead (the EE printer page: "has the printer joined your hub?"
# belongs after the fix, before "When to let us do it for you", not between the guided steps and the explanation)
AFTER_SECTION = {'printer-wont-connect-to-ee-smart-hub': 's7', 'printer-wont-connect-to-bt-smart-hub': 's5',
                 'printer-wont-connect-to-sky-router': 's5', 'printer-wont-connect-after-moving-house': 's5',
                 'onedrive-taking-up-space': 's7',   # 21 Oct: after "what's really using the space"
                 'be-ready-digital-checklist': 's4',   # 18 Nov: straight after "the government's cyber steps, done properly"
                 'cyber-threats': 'what-is'}           # 18 Nov: after the guide (it holds the eight steps), before the threat cards


def insert(slug, html):
    if slug not in PAGES or 'id="in-the-app"' in html:
        return html
    sec = _section(slug)
    if not sec:
        return html
    if slug in AFTER_SECTION:
        i = html.find('id="%s"' % AFTER_SECTION[slug])
        if i < 0:
            raise SystemExit("pcm_problem_boxes: no section id=%s on /%s/" % (AFTER_SECTION[slug], slug))
        start = html.rfind('<section', 0, i)
        end = _section_end(html, start)
        if end > 0:
            return html[:end] + "\n" + sec + html[end:]
    i = html.find('id="fixflow"')
    if i >= 0:
        start = html.rfind('<section', 0, i)
        end = _section_end(html, start)
        if end > 0:
            return html[:end] + "\n" + sec + html[end:]
    j = html.find('<section class="faq-section')
    if j < 0:
        raise SystemExit("pcm_problem_boxes: no 'Fix it with me' or FAQ section on /%s/ - the box has nowhere to go" % slug)
    return html[:j] + sec + html[j:]


bp.PAGE_FILTERS.append(insert)
