# -*- coding: utf-8 -*-
"""/ost-to-pst-converter/ - a free OST to PST converter, and opening a .pst without Outlook (10 Nov 2026, owner: "get the
web page all sorted out ... now we can produce it all, because we've got everything, was proven").

Why: Techies One 0.23.1 turns an old Outlook .ost into a .pst that Outlook opens (Bring in old emails + Save a copy).
Proven 10 Nov 2026 on four real .ost files: three on our own PC (80 MB / 127 MB / 525 MB: 4,864, 589 and 12,305 emails,
every one written to a .pst and read back, one opened in Outlook) and a customer's 3.4 GB Outlook 2016 .ost (a blueyonder
address, 2011-2022: 17,443 emails brought in, 17,361 saved, Junk and Deleted left out by design, opened in Outlook 2016 on
their PC). The paid converters' free trials only save a few items per folder.
Demand (Bing Keyword Research, 10 Aug - 7 Nov 2026, world | UK): ost to pst converter 892 | 44, convert ost to pst 354 |
30, ost to pst 283 | 8, ost file 558 | 70, open ost file 503 | 13; the .pst family is bigger (open pst file 2,465 | 51,
pst viewer 1,402 | 107, .pst files on this computer 3,071 | 177), so the page covers opening a .pst too.
Every picture is the real app on a MADE-UP mailbox (t1/pstfixture.demo_spec as an Outlook 2013+ .ost: "Jean Pritchard",
.example addresses), taken by tools/playwright-check/t1-ostpst-shots.mjs - never a customer's file.
Said with care: tested on .ost files from Outlook 2016 and Microsoft 365's Outlook; older .ost files may work but aren't
promised; a password-protected .pst is refused (never got round); no price invented (ring us).
The download link comes from downloads/t1/version.json, like techies_one_boxes.
"""
import json
import os

from new_pages_data import NEW_PAGES

OST_SLUG = "ost-to-pst-converter"


def _download():
    """(path, version, MB) of the current Techies One installer, from downloads/t1/version.json."""
    try:
        here = os.path.dirname(os.path.abspath(__file__))
        with open(os.path.join(here, "downloads", "t1", "version.json"), encoding="utf-8") as f:
            v = json.load(f)
        return (v["url"].replace("https://365techies.co.uk", ""), v["ver"], round(v["size"] / 1048576, 1))
    except (OSError, ValueError, KeyError):
        return ("/techies-one-mail/", "", 0)


_DL, _VER, _MB = _download()


def _fig(name, w, h, alt, cap, wide=True):
    mw = "100%" if wide else "640px"
    return (f'<figure style="margin:1.1rem 0 1.4rem;max-width:{mw}"><img src="/images/{name}.webp" width="{w}" height="{h}" '
            f'alt="{alt}" loading="lazy" decoding="async" style="display:block;width:100%;height:auto;border-radius:12px;'
            f'border:1px solid rgba(125,170,220,.3);box-shadow:0 22px 50px -26px rgba(0,0,0,.8)">'
            f'<figcaption style="font-size:.78rem;color:var(--muted);margin-top:.45rem">{cap}</figcaption></figure>')


_MADE_UP = ' The emails and names in the pictures are made up.'

NEW_PAGES.append({
    'slug': OST_SLUG,
    'title': 'Free OST to PST Converter: Open an Old Outlook .ost File',
    'metaDesc': 'Turn an old Outlook .ost file into a .pst that Outlook opens, free, with no email limit. Step by step '
                'with pictures, plus opening a .pst without Outlook.',
    'ogTitle': 'Free OST to PST converter, step by step',
    'crumbName': 'OST to PST Converter',
    'eyebrow': '// AN OLD OUTLOOK .OST FILE?',
    'h1': 'A free <em class="grad grad--cyan">OST to PST</em> converter for old Outlook files',
    'lede': 'An .ost file is Outlook&rsquo;s offline copy of an email account, and Outlook won&rsquo;t open one by itself. '
            'When the account has gone, the .ost can be the only copy of years of email. Our free Techies One for Windows '
            'reads it and saves every email into a .pst that Outlook opens, with nothing to pay and no limit on how many '
            'emails. Here&rsquo;s how, with pictures.',
    'chips': ['Free, no email limit', 'Never changes your .ost', 'Opens .pst files too'],
    'primaryCta': ['Download Techies One, free', _DL], 'secondaryCta': ['See the steps', '#s3'],
    'ctaHead': 'Rather we did it for you?',
    'ctaSub': 'We can connect to your PC and convert the file with you watching, or do it at our end. We tell you the price '
              'before we start. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What an .ost is', 'Outlook&rsquo;s offline copy of an email account (IMAP, Exchange or Microsoft 365), tied to the '
                            'Outlook profile that made it.'),
        ('Can Outlook open it?', 'Not by itself. Open Outlook Data File only takes a .pst, and renaming .ost to .pst '
                                 'doesn&rsquo;t work.'),
        ('The free way', 'Techies One brings the .ost in, then saves it as a .pst. No limit on emails.'),
        ('Which Outlook', '.ost files from Outlook 2013 and later: 2016, 2019, 2021 and Microsoft 365.'),
        ('Your file', 'Read only: the .ost is never changed. Work on a copy anyway.'),
        ('Left out', 'Deleted and Junk folders, and tasks. Emails, contacts and calendar come across.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHAT YOU&rsquo;VE GOT', 'h2': 'What an .ost file is, and why Outlook won&rsquo;t open it',
         'html': '<p>Outlook keeps an <strong>.ost</strong> (offline Outlook data file) for email accounts that live on a '
                 'server: Gmail and other IMAP accounts, Exchange and Microsoft 365. It&rsquo;s a copy of the mailbox, so you '
                 'can read your email when you&rsquo;re offline. A <strong>.pst</strong> is different: it&rsquo;s a mailbox '
                 'file of its own, the kind Outlook uses for archives and old POP accounts, and Outlook can open any .pst.</p>'
                 '<p>An .ost belongs to the Outlook profile that made it. Outlook won&rsquo;t open one with <strong>File, Open '
                 '&amp; Export, Open Outlook Data File</strong>, and renaming it from .ost to .pst only gets you &ldquo;not an '
                 'Outlook data file&rdquo;.</p>'
                 '<p><strong>If the account still works,</strong> you don&rsquo;t need the .ost: add the account to Outlook again '
                 'and your email comes back from the server. <strong>The .ost matters when the account has gone</strong>: an '
                 'email address that has closed or moved (Virgin Media&rsquo;s blueyonder, ntlworld and virgin.net addresses are '
                 'moving away from Virgin), an old work account, a profile that was deleted, or an old computer&rsquo;s drive. '
                 'Then the .ost can be the only copy of your email, and that&rsquo;s when you want it as a .pst.</p>'},
        {'eyebrow': '/02 &mdash; BEFORE YOU START', 'h2': 'Find the .ost and make a copy',
         'html': '<ol>'
                 '<li><strong>Find it.</strong> Outlook 2013 and later keep .ost files in '
                 '<code>C:\\Users\\<em>your name</em>\\AppData\\Local\\Microsoft\\Outlook</code> (type '
                 '<code>%localappdata%\\Microsoft\\Outlook</code> into File Explorer&rsquo;s address bar). Some are in '
                 '<strong>Documents, Outlook Files</strong>. It&rsquo;s usually named after the email address. Or let '
                 'Techies One look: in Mail, select <strong>Bring in old emails</strong>, then <strong>Look for them on this '
                 'PC</strong>, and it lists the .ost and .pst files in both places.</li>'
                 '<li><strong>Close Outlook,</strong> so the file isn&rsquo;t in use.</li>'
                 '<li><strong>Copy it</strong> into a folder of its own and use the copy. Techies One never changes the file, '
                 'but a copy keeps the original safe from everything else.</li>'
                 '<li><strong>Check you have room:</strong> about three times the size of the .ost free on the drive, for the '
                 'copy, Techies One&rsquo;s own copy of the emails and the new .pst.</li>'
                 '</ol>'},
        {'eyebrow': '/03 &mdash; STEP BY STEP', 'h2': 'Convert the .ost to a .pst, free, with Techies One',
         'html': '<p>Techies One is our free email, photos, letters and sums program for Windows 10 and 11, signed by 365 '
                 'Techies Ltd. <a href="' + _DL + '">Download it</a> (' + (f'version {_VER}, {_MB} MB' if _VER else 'free') +
                 ') and install it. You don&rsquo;t need to add an email address to do this.</p>'
                 '<p><strong>1. In Mail, select Bring in old emails, then An Outlook file,</strong> and pick the copy of your .ost.</p>'
                 + _fig('t1-ost-to-pst-1-bring-in', 760, 626, 'Techies One: Bring in old emails, with An Outlook file among the '
                        'choices', 'Bring in old emails: choose An Outlook file.' + _MADE_UP, wide=False) +
                 '<p><strong>2. Techies One checks the file first</strong> and tells you what&rsquo;s in it: how many folders and '
                 'emails, which years, contacts and calendar. Give the mailbox a name if you like, then select <strong>Bring '
                 'them in</strong>.</p>'
                 + _fig('t1-ost-to-pst-2-checked', 760, 474, 'Techies One has checked an .ost file: 6 folders, about 55 emails '
                        'from 2018 to 2019, 6 contacts and 3 calendar events', 'The check: what&rsquo;s inside, before anything '
                        'is copied.' + _MADE_UP, wide=False) +
                 '<p><strong>3. Wait while it brings them in.</strong> You can carry on using the PC. When it says the mailbox '
                 'is ready, it appears under <strong>On this PC</strong> with your folders. Open a few emails from different '
                 'years to check.</p>'
                 '<p><strong>Only want to read them?</strong> You can stop here: Techies One is a free <strong>OST '
                 'viewer</strong> too, and you can read, search, print and forward the emails without making a .pst.</p>'
                 + _fig('t1-ost-to-pst-4-mailbox', 1440, 900, 'The emails from the .ost in a mailbox under On this PC, with '
                        'an email open', 'Your old emails, back on screen.' + _MADE_UP) +
                 '<p><strong>4. Select the &hellip; next to the mailbox&rsquo;s name, then Save a copy for another '
                 'program.</strong></p>'
                 + _fig('t1-ost-to-pst-5-menu', 1440, 900, 'The mailbox menu in Techies One, with Save a copy for another '
                        'program', 'The mailbox&rsquo;s menu.' + _MADE_UP) +
                 '<p><strong>5. Choose An Outlook data file (.pst),</strong> choose where to put it (Documents is fine), then '
                 'select <strong>Save a copy</strong>. Techies One checks the file it has made before it says it&rsquo;s '
                 'saved. (For another program, the same box makes <strong>.eml</strong> files, one for each email, or '
                 '<strong>.mbox</strong> files, one for each folder, which Thunderbird opens.)</p>'
                 + _fig('t1-ost-to-pst-6-save-pst', 660, 804, 'Save a copy for another program, with An Outlook data file '
                        '(.pst) chosen', 'Save a copy: An Outlook data file (.pst).' + _MADE_UP, wide=False) +
                 '<p><strong>6. Open it in Outlook:</strong> <strong>File, Open &amp; Export, Open Outlook Data File</strong>, '
                 'and pick the new .pst. It appears in Outlook&rsquo;s folder list on its own, with no account attached, so '
                 'nothing can sync to it or delete it.</p>'
                 + _fig('t1-ost-to-pst-7-saved', 660, 318, 'Techies One: Saved, with how many emails and where the .pst is',
                        'Saved, and where to find it.' + _MADE_UP, wide=False)},
        {'eyebrow': '/04 &mdash; HOW LONG, WHAT COMES ACROSS', 'h2': 'How long it takes and what comes across',
         'html': '<ul>'
                 '<li><strong>Time:</strong> on a customer&rsquo;s PC in November 2026, a 3.4 GB .ost from Outlook 2016 (17,443 '
                 'emails from 2011 to 2022) took about ten minutes to bring in and four minutes to save as a .pst. On our own '
                 'PC a 525 MB .ost with 12,305 emails took about four minutes from start to finish.</li>'
                 '<li><strong>Comes across:</strong> every email folder with its emails, attachments, read and unread, the date '
                 'each was received, and your own folders. Contacts and calendar events come into Techies One too.</li>'
                 '<li><strong>Left out on purpose:</strong> the Deleted and Junk folders, as with every copy Techies One makes, '
                 'and tasks, which Techies One doesn&rsquo;t have. They stay in the original file.</li>'
                 '<li><strong>Gmail accounts:</strong> an .ost from a Gmail account has <strong>[Gmail] All Mail</strong>, '
                 'which repeats most of your emails. Keep it anyway: emails you archived in Gmail are only there.</li>'
                 '<li><strong>No limit:</strong> the .pst is the newer, large kind, and Outlook opens files up to 50 GB. To '
                 'save it straight onto a memory stick formatted the old way (FAT32), it has to be under 4 GB; Techies One '
                 'tells you if it won&rsquo;t fit.</li>'
                 '</ul>'},
        {'eyebrow': '/05 &mdash; HONEST LIMITS', 'h2': 'What it can&rsquo;t do',
         'html': '<ul>'
                 '<li><strong>Older .ost files:</strong> we&rsquo;ve tested .ost files from Outlook 2016 and Microsoft 365&rsquo;s '
                 'Outlook. Files from Outlook 2010 and earlier may work, but we don&rsquo;t promise it.</li>'
                 '<li><strong>A .pst with a password:</strong> Techies One won&rsquo;t open it and won&rsquo;t try to get round '
                 'the password. Take the password off in Outlook first.</li>'
                 '<li><strong>Damage:</strong> if part of a file is damaged, Techies One brings in everything it can read and '
                 'tells you how many it couldn&rsquo;t.</li>'
                 '<li><strong>Mac:</strong> it&rsquo;s for Windows 10 and 11 PCs. Outlook for Mac&rsquo;s .olm files are a '
                 'different thing.</li>'
                 '<li><strong>It doesn&rsquo;t repair Outlook.</strong> For an .ost that Outlook itself reports as damaged, see '
                 '<a href="/outlook-ost-file-corrupt/">Outlook OST file corrupt</a>.</li>'
                 '</ul>'},
        {'eyebrow': '/06 &mdash; NO OUTLOOK?', 'h2': 'Open a .pst file without Outlook',
         'html': '<p>The same way opens a .pst. In Techies One, select <strong>Bring in old emails</strong>, then <strong>An '
                 'Outlook file</strong>, and pick the .pst (or select <strong>Look for them on this PC</strong> and it finds '
                 'the usual places for you). The emails go into a mailbox under <strong>On this PC</strong>, where you can '
                 'read, search, print and forward them, and the .pst itself isn&rsquo;t changed. It brings in Windows Live Mail, '
                 'Thunderbird and Outlook .msg files too.</p>'},
        {'eyebrow': '/07 &mdash; WHY IT&rsquo;S FREE', 'h2': 'Why we made it free',
         'html': '<p>We&rsquo;re an IT support company in Bournemouth, and many of our customers are moving old Virgin Media '
                 'addresses (blueyonder, ntlworld, virgin.net) and other email that&rsquo;s closing. Their old email is often '
                 'in an .ost on an old PC. The paid converters&rsquo; free trials only save a few emails from each folder, so '
                 'we built the reader into Techies One instead.</p>'
                 '<p>In November 2026 we used it on a customer&rsquo;s 3.4 GB .ost from Outlook 2016, a blueyonder address '
                 'from 2011 to 2022: 17,443 emails came in, 17,361 went into the .pst (the rest were Deleted and Junk), and '
                 'Outlook 2016 opened it on their PC. Techies One is signed by 365 Techies Ltd, is in the Microsoft Store, and '
                 'has no adverts. See <a href="/techies-one-mail/">everything Techies One does</a>.</p>'},
        {'eyebrow': '/08 &mdash; RATHER WE DID IT?', 'h2': 'When to call us',
         'html': '<p>Not sure which file is the right one, short of space, or only have the old computer&rsquo;s drive? Ring '
                 '<strong>01202 775566</strong> or text 07520 615332, Monday to Friday, 9 to 5. We can connect to your PC and '
                 'do it with you, anywhere in the UK, and around Bournemouth, Christchurch and Poole we can collect an old drive. '
                 'We tell you the price before we start. See also <a href="/data-recovery/">data recovery</a>.</p>'},
    ],
    'howToName': 'How to convert an Outlook .ost file to a .pst for free',
    'howToSteps': [
        {'name': 'Copy the .ost', 'text': 'Close Outlook, find the .ost (usually in %localappdata%\\Microsoft\\Outlook) and copy '
                                          'it into a folder of its own.'},
        {'name': 'Bring it into Techies One', 'text': 'In Techies One, select Mail, Bring in old emails, An Outlook file, and '
                                                      'pick the copy. Check what it found, then select Bring them in.'},
        {'name': 'Check the emails', 'text': 'Open a few emails from different years in the new mailbox under On this PC.'},
        {'name': 'Save it as a .pst', 'text': 'Select the menu next to the mailbox, Save a copy for another program, An Outlook '
                                              'data file (.pst), choose where, then Save a copy.'},
        {'name': 'Open it in Outlook', 'text': 'In Outlook, select File, Open & Export, Open Outlook Data File, and pick the new '
                                               '.pst.'},
    ],
    'faqs': [
        {'q': 'Can I convert an OST file to PST for free?', 'a': '<p>Yes. Our free Techies One for Windows brings in the emails '
              'from an .ost and saves them as a .pst that Outlook opens, with no limit on how many emails.</p>'},
        {'q': 'Can I just rename the .ost to .pst?', 'a': '<p>No. The two files are built differently, so Outlook says a renamed '
              '.ost is not an Outlook data file. It has to be converted.</p>'},
        {'q': 'Where is my .ost file?', 'a': '<p>For Outlook 2013 and later, in <code>%localappdata%\\Microsoft\\Outlook</code>. '
              'Some are in Documents, Outlook Files. It&rsquo;s usually named after the email address.</p>'},
        {'q': 'Does it open an orphaned .ost, when the email account no longer exists?', 'a': '<p>Yes. Techies One reads the '
              'file itself, so it doesn&rsquo;t need the account, the password or the Outlook profile that made it.</p>'},
        {'q': 'Can I view an .ost file without converting it?', 'a': '<p>Yes. After <strong>Bring them in</strong>, the emails '
              'are in a mailbox under On this PC in Techies One, where you can read, search and print them. You only need the '
              '.pst if you want them in Outlook.</p>'},
        {'q': 'Can it convert OST to EML or MBOX?', 'a': '<p>Yes. <strong>Save a copy for another program</strong> also makes '
              'one .eml file for each email, or one .mbox file for each folder, for Thunderbird and other email programs.</p>'},
        {'q': 'Is there a size limit?', 'a': '<p>No limit on how many emails. The .pst it makes is the newer, large kind, and '
              'Outlook opens .pst files up to 50 GB. We&rsquo;ve converted a 3.4 GB .ost with 17,443 emails.</p>'},
        {'q': 'Will it change or damage my .ost?', 'a': '<p>No. It only reads the file. We still suggest working on a copy.</p>'},
        {'q': 'Which versions of Outlook does it work with?', 'a': '<p>.ost files from Outlook 2013 and later, including 2016, '
              '2019, 2021 and Microsoft 365. The .pst it makes opens in those versions of Outlook.</p>'},
        {'q': 'Can I open a .pst file without Outlook?', 'a': '<p>Yes. Techies One brings in a .pst&rsquo;s emails, contacts '
              'and calendar so you can read and search them, without changing the .pst.</p>'},
        {'q': 'Does it work on a Mac?', 'a': '<p>No, it&rsquo;s for Windows 10 and 11 PCs.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/outlook-ost-file-corrupt/">Outlook OST file corrupt</a>, <a href="/outlook-pst-'
                      'cannot-be-accessed/">Outlook PST cannot be accessed</a>, <a href="/outlook-data-file-cannot-be-accessed/">'
                      'Outlook data file cannot be accessed</a>, <a href="/recreate-outlook-profile-without-losing-emails/">'
                      'recreate your Outlook profile without losing emails</a> and <a href="/techies-one-mail/">Techies One</a>.</p>',
})


# ---- a short box on the related Outlook data-file pages, straight after "Fix it with me" (as techies_one_boxes does)
BOX_PAGES = {
    "outlook-ost-file-corrupt":
        "Need the emails out of an old .ost before you rebuild it, or after the account has gone? Our free Techies One for "
        "Windows reads the .ost and saves every email into a .pst that Outlook opens.",
    "outlook-pst-cannot-be-accessed":
        "Need the emails while Outlook won&rsquo;t open the file? Our free Techies One for Windows can bring in a .pst&rsquo;s "
        "emails so you can read them, without changing the file, and turns an old .ost into a .pst too.",
    "outlook-data-file-cannot-be-accessed":
        "Need the emails while Outlook won&rsquo;t open the file? Our free Techies One for Windows can bring in a .pst&rsquo;s "
        "emails so you can read them, without changing the file, and turns an old .ost into a .pst too.",
    "recreate-outlook-profile-without-losing-emails":
        "Left with an old .ost after rebuilding a profile, and emails that didn&rsquo;t come back? Our free Techies One for "
        "Windows saves the old .ost&rsquo;s emails into a .pst that Outlook opens.",
}


def _box(slug):
    return f"""    <section class="section" aria-label="Free OST to PST" id="ost-to-pst">
      <div class="wrap" style="max-width:880px">
        <div style="padding:1.1rem 1.25rem;border:1px solid rgba(125,170,220,.35);border-radius:14px;background:rgba(125,170,220,.06)">
          <p class="eyebrow mono" style="margin:0 0 .35rem">// FREE: OST TO PST</p>
          <p style="margin:0 0 .75rem;line-height:1.6">{BOX_PAGES[slug]}</p>
          <p style="margin:0"><a class="button primary" href="/ost-to-pst-converter/">See how, step by step</a></p>
        </div>
      </div>
    </section>
"""


def _section_end(html, start):
    import re
    depth = 0
    for m in re.finditer(r"<(/?)section\b", html[start:]):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return html.index(">", start + m.end()) + 1
    return -1


def insert_box(slug, html):
    """Page filter: the box after "Fix it with me" on BOX_PAGES; every other page untouched."""
    if slug not in BOX_PAGES or 'id="ost-to-pst"' in html:
        return html
    i = html.find('<section class="section" aria-label="Fix it with me" id="fixflow"')
    end = _section_end(html, i) if i >= 0 else -1
    if end < 0:
        raise SystemExit("ost_to_pst_page_data: no 'Fix it with me' section on /%s/" % slug)
    return html[:end] + "\n" + _box(slug) + html[end:]


def register(bp):
    bp.PAGE_FILTERS.append(insert_box)
