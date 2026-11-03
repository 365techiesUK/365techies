# -*- coding: utf-8 -*-
"""/open-gho-file/ - getting files back from an old Norton Ghost backup (3 Nov 2026, owner: "build the Ghost backup
recovery page").

Why: the site had no Ghost page (sitemap and every built page grepped for gho / Norton Ghost / Symantec Ghost on 3 Nov).
The people who search for it are stuck: Norton's own community is full of "how do I open a .gho" threads with no current
answer, Ghost Explorer is hard to find and often won't open an older image, and the YouTube video "Restoring a Ghost backup"
has 146k views (YouTube Data API, 3 Nov). We can now read Ghost images ourselves: on 3 Nov we opened a spanned 2009 NTFS
image (2.0 GB .gho + 1.2 GB .ghs) without Ghost, rebuilt its file list (36,430 files) and pulled files out
(D:/claude/lambo-image/tools). That job is the case on the page, told without saying whose backup it was.

Facts, read 3 Nov 2026:
  - Broadcom KB 151704 "Handling a corrupted Ghost image (.gho) file": open it in Ghost Explorer; if you cannot extract,
    run Ghostexp.exe with -IGNOREINDEX (finds the files by reading the image directly) and -CORRUPT (ignores the corrupt
    area and tries the next file); Ghost cannot repair a corrupted image.
  - Wikipedia, Ghost (disk utility): Symantec stopped selling Norton Ghost on 30 April 2013; support ended 30 June 2014.
  - 7-zip.org: GHO is in neither its packing nor its unpacking list.
  - Norton community threads: later home versions of Norton Ghost (14, 15) make .v2i backups and can't open a .gho.
  - Our own image: the .ghs parts are named after the .gho with 001, 002...; the first part stopped just under 2 GB.
Said with care: we don't claim our reader opens every image (we have proven one); the page says we look first and tell
the customer. No price is invented: quoted per job, no fix no fee, as on /data-recovery/.
"""
from new_pages_data import NEW_PAGES

GHOST_SLUG = "open-gho-file"

_SRC = ('<p style="font-size:.85rem;color:var(--muted)">Sources: Broadcom, <a href="https://knowledge.broadcom.com/external/'
        'article/151704/handling-a-corrupted-ghost-image-gho-fil.html" rel="noopener" target="_blank">handling a corrupted Ghost '
        'image</a>; Wikipedia, <a href="https://en.wikipedia.org/wiki/Ghost_(disk_utility)" rel="noopener" target="_blank">Ghost '
        '(disk utility)</a>; <a href="https://www.7-zip.org/" rel="noopener" target="_blank">7-Zip&rsquo;s list of formats</a>. '
        'Read 3 November 2026.</p>')

NEW_PAGES.append({
    'slug': GHOST_SLUG,
    'title': 'How to Open a GHO File: Get Files Back From a Ghost Backup',
    'metaDesc': 'Found an old Norton Ghost backup (.gho or .ghs)? What it is, how to keep it safe, how to open it with Ghost '
                'Explorer, why it won&rsquo;t open, and how we get the files out.',
    'ogTitle': 'How to open a .gho file and get your files back',
    'crumbName': 'Open a GHO File',
    'eyebrow': '// AN OLD GHOST BACKUP?',
    'h1': 'Open a <em class="grad grad--cyan">.gho file</em> and get your files back',
    'lede': 'You&rsquo;ve found an old backup ending in .gho, perhaps with some .ghs files beside it, and Windows has no idea '
            'what to do with it. It&rsquo;s a Norton Ghost backup: a copy of a whole computer&rsquo;s disk, usually from the '
            '2000s, and the files inside are often still there. Here&rsquo;s how to keep it safe, how to open it, and what to '
            'do when it won&rsquo;t.',
    'chips': ['Keep the backup safe', 'Ghost Explorer, step by step', 'We can read it without Ghost'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Keep it safe first', '#s2'],
    'ctaHead': 'Rather we got the files out?',
    'ctaSub': 'We read Ghost backups without Ghost, tell you what&rsquo;s inside and the price before we start, and copy your '
              'files somewhere safe. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it is', 'A Norton (or Symantec) Ghost backup of a whole disk or one part of it. .ghs files are its extra parts.'),
        ('Can Windows open it?', 'No, and nor can 7-Zip. It needs Ghost Explorer, or a reader like ours.'),
        ('First', 'Copy every part into one folder on another drive, keep the names, and work on the copy.'),
        ('Never', 'Restore it onto the computer you use: a restore replaces everything on that disk.'),
        ('Damaged?', 'Ghost Explorer with -ignoreindex and -corrupt skips the damaged areas.'),
        ('Password?', 'Without it, nobody can open the backup.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHAT YOU&rsquo;VE FOUND', 'h2': 'What a .gho file is',
         'html': '<p><strong>Ghost</strong> (Norton Ghost at home, Symantec Ghost in offices and schools) was the best-known way '
                 'to back up a whole computer from the late 1990s to the early 2010s. It copies a whole disk, or one part of it '
                 '(a partition), into a compressed file ending in <strong>.gho</strong>: Windows, programs, settings and every '
                 'document and photo, as they were on the day.</p>'
                 '<ul>'
                 '<li><strong>.gho</strong> is the backup itself, or its first part.</li>'
                 '<li><strong>.ghs</strong> files are the extra parts of a backup that was split up. They&rsquo;re named after '
                 'it with a number on the end, for example <code>Backup.gho</code>, <code>Backup001.ghs</code>, '
                 '<code>Backup002.ghs</code>. Ghost often split big backups into pieces of about 2 GB, or one piece per CD or '
                 'DVD. You need every part.</li>'
                 '</ul>'
                 '<p>Windows can&rsquo;t open a .gho file, and neither can 7-Zip or the other usual zip tools. It needs Ghost&rsquo;s '
                 'own <strong>Ghost Explorer</strong>, or someone who can read the format another way.</p>'},
        {'eyebrow': '/02 &mdash; BEFORE ANYTHING ELSE', 'h2': 'Keep the backup safe first',
         'html': '<ol>'
                 '<li><strong>Copy every part to another drive,</strong> the .gho and all its .ghs files into one folder, and '
                 'work on the copy. If they&rsquo;re on old CDs or DVDs, copy each disc now: old discs stop reading.</li>'
                 '<li><strong>Don&rsquo;t rename the parts.</strong> Ghost finds the next piece by its name.</li>'
                 '<li><strong>Check nothing is missing:</strong> the numbers should run in order (001, 002, 003&hellip;) with no '
                 'gaps.</li>'
                 '<li><strong>Never &ldquo;restore&rdquo; the backup onto the computer you use.</strong> A Ghost restore '
                 'replaces everything on the disk it goes to. To get files back you only need to <em>open</em> the backup, not '
                 'restore it.</li>'
                 '<li><strong>Be careful what you download.</strong> Norton Ghost hasn&rsquo;t been sold since April 2013, so the '
                 'copies of Ghost Explorer on download sites are old, unofficial and sometimes come with junk. Don&rsquo;t run '
                 'one you&rsquo;re not sure of.</li>'
                 '</ol>'},
        {'eyebrow': '/03 &mdash; IF YOU HAVE GHOST EXPLORER', 'h2': 'Opening it with Ghost Explorer',
         'html': '<p>Ghost Explorer (<code>Ghostexp.exe</code>) came with Ghost itself. If you still have the Ghost that made '
                 'the backup, on an old disc or an old computer, it&rsquo;s the official way in.</p>'
                 '<ol>'
                 '<li>Open <strong>Ghost Explorer</strong>, choose <strong>File, Open</strong>, and pick the <strong>.gho</strong> '
                 'file (not a .ghs).</li>'
                 '<li>Browse the folders as you would in File Explorer. Your own files are usually under <strong>Documents and '
                 'Settings</strong> (Windows XP) or <strong>Users</strong> (Windows 7 and later), then your name, then Documents, '
                 'Pictures and Desktop.</li>'
                 '<li>Select what you want, choose <strong>Extract</strong>, and save it to a folder on another drive.</li>'
                 '<li>If it asks for the next part, point it at the folder with the .ghs files.</li>'
                 '</ol>'
                 '<p><strong>If it reports an error or a damaged backup,</strong> Broadcom&rsquo;s support pages for Ghost say to '
                 'start Ghost Explorer from the command line with <code>-ignoreindex</code>, which finds the files by reading the '
                 'backup directly, and <code>-corrupt</code>, which skips a damaged area and carries on with the next file.</p>'
                 '<p>A newer Ghost won&rsquo;t necessarily help: the later home versions of Norton Ghost made a different kind of '
                 'backup (.v2i) and can&rsquo;t open a .gho.</p>'},
        {'eyebrow': '/04 &mdash; WHEN IT WON&rsquo;T OPEN', 'h2': 'Why a Ghost backup won&rsquo;t open',
         'html': '<ul>'
                 '<li><strong>A missing part.</strong> One .ghs file missing, often a disc that was never copied, and Ghost stops '
                 'there. Look for every disc or file in the set.</li>'
                 '<li><strong>An unfinished copy.</strong> A copy that stopped part-way (a full memory stick, a failing disc) is '
                 'shorter than the original. If you still have the original, compare the sizes.</li>'
                 '<li><strong>A password.</strong> Ghost could lock a backup with a password. Without it, nobody can open it, us '
                 'included.</li>'
                 '<li><strong>Damage.</strong> Scratched discs and old drives lose pieces. The files before and after the damage '
                 'can often still be saved.</li>'
                 '<li><strong>&ldquo;Not a Ghost image file&rdquo;.</strong> Usually a .ghs opened instead of the .gho, a Ghost '
                 'Explorer from a different version, or a file that isn&rsquo;t a Ghost backup at all despite its name.</li>'
                 '</ul>'},
        {'eyebrow': '/05 &mdash; HOW WE DO IT', 'h2': 'We can read Ghost backups without Ghost',
         'html': '<p>We&rsquo;ve built our own reader for Ghost backups, so we don&rsquo;t need a working copy of Ghost or an old '
                 'computer to run it on. In November 2026 we used it on a backup made in 2009 and split into two parts (3.4 GB '
                 'in all): it listed all 36,430 files inside, and we copied out the ones that were wanted. We never change the '
                 'original; we work on a copy.</p>'
                 '<ol>'
                 '<li><strong>We look at it first</strong> and tell you whether it can be read, and what&rsquo;s inside: folders, '
                 'photos, documents, emails.</li>'
                 '<li><strong>You choose</strong> what you want back, and we tell you the price before we start. No fix, no '
                 'fee.</li>'
                 '<li><strong>We copy your files</strong> onto a memory stick, a drive of yours or your OneDrive, in folders '
                 'you&rsquo;ll recognise.</li>'
                 '</ol>'
                 '<p>Around Bournemouth, Christchurch and Poole we collect the drive or discs from you. Elsewhere in the UK, ring '
                 'us and we&rsquo;ll agree the easiest way to get it to us.</p>'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': '<p>Can&rsquo;t open it, missing a part, or don&rsquo;t want to risk the only copy? Ring <strong>01202 '
                 '775566</strong> or text 07520 615332, Monday to Friday, 9 to 5. Tell us roughly when the backup was made and '
                 'how many parts it has. See also <a href="/data-recovery/">data recovery</a>.</p>' + _SRC},
    ],
    'howToName': 'How to get files back from a Norton Ghost backup (.gho)',
    'howToSteps': [
        {'name': 'Copy every part', 'text': 'Copy the .gho file and all its .ghs parts into one folder on another drive, keep '
                                            'their names, and work on the copy.'},
        {'name': 'Open it in Ghost Explorer', 'text': 'Open the .gho file, not a .ghs, in Ghost Explorer from the version of '
                                                      'Ghost that made the backup.'},
        {'name': 'Find your files', 'text': 'Look under Documents and Settings (Windows XP) or Users (Windows 7 and later), then '
                                            'your name.'},
        {'name': 'Extract them', 'text': 'Select the files, choose Extract, and save them to a folder on another drive.'},
        {'name': 'If it reports damage', 'text': 'Start Ghost Explorer from the command line with -ignoreindex and -corrupt to '
                                                 'skip the damaged areas.'},
    ],
    'faqs': [
        {'q': 'What is a .gho file?', 'a': '<p>A Norton (or Symantec) Ghost backup: a compressed copy of a whole disk or one '
                                           'part of it, usually made between the late 1990s and the early 2010s. Windows '
                                           'can&rsquo;t open it by itself.</p>'},
        {'q': 'What is a .ghs file?', 'a': '<p>An extra part of a Ghost backup that was split up. Keep it with the .gho and the '
                                           'other parts, with the names unchanged, and open the .gho, not the .ghs.</p>'},
        {'q': 'Can Windows 11 open a .gho file?', 'a': '<p>No, and nor can 7-Zip. It needs Ghost Explorer, or a reader like '
                                                       'ours.</p>'},
        {'q': 'Is Norton Ghost still available?', 'a': '<p>No. Symantec stopped selling Norton Ghost on 30 April 2013, and its '
                                                       'support ended on 30 June 2014.</p>'},
        {'q': 'Should I restore the backup to get my files?', 'a': '<p>No. A restore replaces everything on the disk it goes to, '
                                                                   'and an old Windows backup usually won&rsquo;t start on a '
                                                                   'modern computer anyway. Open it and copy the files out '
                                                                   'instead.</p>'},
        {'q': 'The backup has a password I&rsquo;ve forgotten. Can you open it?', 'a': '<p>Not without the password: nobody can. '
                                                                                       'Try the passwords you used at the time.</p>'},
        {'q': 'How much does it cost to get the files out?', 'a': '<p>It depends on the size and condition of the backup. We look '
                                                                  'first and tell you the price before we start, and it&rsquo;s '
                                                                  'no fix, no fee.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/data-recovery/">data recovery</a>, <a href="/how-to-recover-deleted-files/">how to '
                      'recover deleted files</a>, <a href="/what-windows-backup-backs-up/">what Windows Backup really backs '
                      'up</a>, <a href="/restore-windows-7-backup-on-windows-11/">how to restore a Windows 7 backup</a> and '
                      '<a href="/how-to-back-up-your-photos/">how to back up your photos</a>.</p>',
})
