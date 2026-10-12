# -*- coding: utf-8 -*-
"""Email symptom pages that lead to Techies One Mail (12 Oct 2026; owner: "go ahead and do everything").

Bing (12 Oct 2026, 3 months): "windows live mail" 9,700 (UK 896), "outlook express" 12,200 (UK 1,300). The product page
/techies-one-mail/ already explains what happened to Windows Mail, Outlook Express and Windows Live Mail and compares the
replacements, so this page is the SYMPTOM ("it stopped working") and links there rather than repeating it.

Every dated fact matches the product page's own table (techies_one_page.py, sceptic-checked 10 Oct 2026):
  - Windows Live Mail 2012: support ended 10 January 2017;
  - 2016: it lost its direct link to Hotmail / Outlook.com (people could still connect it another way);
  - 16 September 2024: Outlook.com stopped accepting plain passwords from any program that can't use Microsoft's modern
    sign-in, which ended that too;
  - Microsoft no longer offers Windows Live Mail anywhere; sites offering it are not Microsoft;
  - POP users' email lives only on the old PC; Techies One Mail can't open those copies; OE Classic's maker says it can
    bring them in;
  - Gmail, Yahoo, AOL and Virgin Media need an app password in an email program.
The box (techies_one_boxes.PAGES) goes after the fix-it-with-me flow, like the other email fix pages.
"""

WLM = {
    'slug': 'windows-live-mail-not-working',
    'title': 'Windows Live Mail Not Working? What to Use Now',
    'metaDesc': 'Windows Live Mail keeps asking for your password, or your Hotmail stopped arriving? Why, how to keep your old emails, and free programs to use now.',
    'ogTitle': 'Windows Live Mail stopped working? What to use now',
    'crumbName': 'Windows Live Mail Not Working',
    'eyebrow': '// WINDOWS LIVE MAIL STOPPED WORKING?',
    'h1': 'Windows Live Mail <em class="grad grad--cyan">not working</em>?',
    'lede': 'It keeps asking for your password, won&rsquo;t connect, or your Hotmail has stopped arriving. Windows Live Mail hasn&rsquo;t been updated since 2017, and Microsoft&rsquo;s own email stopped accepting it in 2024. Here&rsquo;s how to keep your old emails safe, and what to use instead.',
    'chips': ['Keep your old emails', 'Free replacements', 'Windows specialists since 1995'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Keep your old emails', '#s2'],
    'ctaHead': 'Rather we moved it for you?',
    'ctaSub': 'We check it free, tell you the price before we start, and move your email and contacts to a new program while you watch. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Why it stopped', 'Windows Live Mail got its last update in 2017. Since 16 September 2024 Hotmail and Outlook.com no longer let it sign in.'),
        ('Other email addresses', 'BT, Sky and others may still connect for now, but the program gets no security fixes.'),
        ('Can I download it again?', 'No. Microsoft doesn&rsquo;t offer it any more; a site offering it isn&rsquo;t Microsoft.'),
        ('Before you change anything', 'Check whether your emails are only on this PC, and copy its Windows Live Mail folder to a USB stick.'),
        ('What to use instead', 'Our free Techies One Mail, webmail in your browser, the new Outlook, or Thunderbird.'),
        ('Hotmail users', 'Your email is safe at outlook.com: sign in there in your web browser.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHY IT STOPPED', 'h2': 'Why Windows Live Mail stopped working',
         'html': '<p>Windows Live Mail was a free Microsoft program from the Windows 7 days. Microsoft stopped supporting it on <strong>10 January 2017</strong>, so it has had no fixes, security or otherwise, since.</p>'
                 '<ul>'
                 '<li><strong>Hotmail, Outlook.com, Live and MSN addresses:</strong> in 2016 it lost its direct link to Microsoft&rsquo;s email, and on <strong>16 September 2024</strong> Outlook.com stopped accepting plain passwords from programs that can&rsquo;t use Microsoft&rsquo;s modern sign-in. Windows Live Mail can&rsquo;t, so it can no longer collect Microsoft email at all. Your email is still there: sign in at outlook.com in your web browser.</li>'
                 '<li><strong>BT, Sky, Plusnet, TalkTalk and others:</strong> it may still connect for now, but it gets no security fixes, and any change at your provider can stop it overnight.</li>'
                 '<li><strong>Gmail and Yahoo:</strong> these need an app password in any email program, made in your account&rsquo;s security settings.</li>'
                 '</ul>'
                 '<p>Microsoft no longer offers Windows Live Mail anywhere, so a website offering a download isn&rsquo;t Microsoft, and the copy would get no security fixes. The answer is to move to a program that&rsquo;s still looked after.</p>'},
        {'eyebrow': '/02 &mdash; BEFORE YOU CHANGE ANYTHING', 'h2': 'Keep your old emails safe first',
         'html': '<p>Where your old emails live decides how careful you need to be:</p>'
                 '<ul>'
                 '<li><strong>IMAP</strong> (the usual setting now): your emails are kept with your email provider, so they appear in any new program, folders and all.</li>'
                 '<li><strong>POP</strong> (common with older set-ups): emails were downloaded and kept <em>only on this PC</em>. If the PC or the program goes, they go too.</li>'
                 '</ul>'
                 '<p>To check, right-click your email account in Windows Live Mail, choose <strong>Properties</strong>, then the <strong>Servers</strong> tab: it says whether the incoming server is POP3 or IMAP. Then:</p>'
                 '<ol>'
                 '<li><strong>Copy the Windows Live Mail folder to a USB stick.</strong> In File Explorer&rsquo;s address bar, type <strong>%localappdata%\\Microsoft\\Windows Live Mail</strong> and press Enter, go up one level, and copy the whole <strong>Windows Live Mail</strong> folder to the stick.</li>'
                 '<li><strong>Save your contacts.</strong> In Windows Live Mail&rsquo;s Contacts, choose <strong>Export</strong>, then <strong>Comma separated values (.CSV)</strong>, and save the file to the same stick.</li>'
                 '<li><strong>Keep the old PC and program</strong> until your emails are safely in the new program.</li>'
                 '</ol>'},
        {'eyebrow': '/03 &mdash; WHAT TO USE INSTEAD', 'h2': 'What to use instead',
         'html': '<ul>'
                 '<li><strong><a href="/techies-one-mail/">Techies One Mail</a></strong> (free, from us): a simple email program for Windows PCs, made for people moving from Windows Live Mail and Outlook Express, with the settings for BT, Sky, Plusnet, Gmail and Outlook.com built in.</li>'
                 '<li><strong>Webmail in your browser:</strong> outlook.com for Hotmail, gmail.com, or your provider&rsquo;s website. Nothing to install, and it works on any computer.</li>'
                 '<li><strong>The new Outlook:</strong> free with Windows 11 and works with most email addresses, though it looks very different from Windows Live Mail.</li>'
                 '<li><strong>Thunderbird:</strong> free, from Mozilla, with lots of settings for people who like to tinker.</li>'
                 '</ul>'
                 '<p>Our <a href="/techies-one-mail/#t1-compare">Techies One Mail page</a> compares them side by side, with what each costs and what it can&rsquo;t do.</p>'},
        {'eyebrow': '/04 &mdash; YOUR OLD EMAILS', 'h2': 'Getting your old emails into the new program',
         'html': '<ul>'
                 '<li><strong>IMAP:</strong> add your email address to the new program and your emails appear by themselves, folders and all.</li>'
                 '<li><strong>POP, emails only on this PC:</strong> new programs, Techies One Mail included, can&rsquo;t sign in to fetch these, because they aren&rsquo;t on the server any more. Keep the backup folder from step 2; OE Classic, whose maker says it can bring in Windows Live Mail&rsquo;s files, is one way to open them again; or ask us to move them for you.</li>'
                 '<li><strong>Just a few important emails?</strong> Drag them from Windows Live Mail into a folder in File Explorer: each is saved as its own file that you can open later.</li>'
                 '</ul>'},
        {'eyebrow': '/05 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': '<p>If your emails are only on this PC, or you&rsquo;d rather not risk losing them, ring <strong>01202 775566</strong> or text 07520 615332, Monday to Friday, 9 to 5. With your permission we connect to your Windows PC, check it for free, tell you the price before we start, and move your emails and contacts to the new program while you watch.</p>'},
    ],
    'howToName': 'How to move off Windows Live Mail without losing your emails',
    'howToSteps': [
        {'name': 'Check POP or IMAP', 'text': 'Right-click the account in Windows Live Mail, choose Properties, then the Servers tab.'},
        {'name': 'Back up the Windows Live Mail folder', 'text': 'Copy the folder at %localappdata%\\Microsoft\\Windows Live Mail to a USB stick.'},
        {'name': 'Export your contacts', 'text': 'In Contacts, choose Export, then Comma separated values (.CSV).'},
        {'name': 'Set up the new program', 'text': 'Add your email address to Techies One Mail, the new Outlook, Thunderbird or webmail.'},
        {'name': 'Check your emails arrived', 'text': 'With IMAP they appear by themselves. With POP, keep the backup and ask for help moving them.'},
    ],
    'faqs': [
        {'q': 'Why has Windows Live Mail stopped working?', 'a': '<p>It has had no updates since 2017, and since 16 September 2024 Hotmail and Outlook.com no longer accept its sign-in. Other providers may still connect for now, but it gets no security fixes.</p>'},
        {'q': 'Can I still download Windows Live Mail?', 'a': '<p>No. Microsoft doesn&rsquo;t offer it any more. A website offering it isn&rsquo;t Microsoft, and the copy would get no security fixes.</p>'},
        {'q': 'Will I lose my old emails?', 'a': '<p>Not if your account uses IMAP: they&rsquo;re kept with your provider. If it uses POP, they&rsquo;re only on this PC, so copy the Windows Live Mail folder to a USB stick before you change anything, and ask us if you need them moved.</p>'},
        {'q': 'What is the best replacement for Windows Live Mail?', 'a': '<p>For something simple, our free <a href="/techies-one-mail/">Techies One Mail</a> or webmail in your browser. The new Outlook comes free with Windows 11, and Thunderbird suits people who like plenty of settings.</p>'},
        {'q': 'Does Windows Live Mail still work with Gmail?', 'a': '<p>Gmail needs an app password in any email program, made in your Google account&rsquo;s security settings. Even if it connects, Windows Live Mail gets no security fixes, so it&rsquo;s worth moving.</p>'},
        {'q': 'Can you move my emails for me?', 'a': '<p>Yes. With your permission we connect remotely, check it for free, tell you the price before we start, and move your emails and contacts while you watch.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/techies-one-mail/">Techies One Mail</a>, <a href="/how-to-add-gmail-to-outlook/">how to add Gmail to Outlook</a>, <a href="/emails-on-computer-but-not-phone/">emails on the computer but not the phone</a> and <a href="/email-support/">email help</a>.</p>',
}

MAIL_PAGES = [WLM]

MAIL_FLOWS = {
    WLM['slug']: {'h2': 'Move off Windows Live Mail, step by step', 'ask': 'Is that step done?',
                  'tip': 'Keep the old PC and the USB stick until every email is in the new program.',
                  'h3s': 'Emails only on this PC, or stuck? That is a remote job.'},
}
