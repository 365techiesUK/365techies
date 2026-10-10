# -*- coding: utf-8 -*-
"""Wave 13 (10 Oct 2026): two dated change pages the owner approved from a ChatGPT brief ("yeah go ahead with all four").

Verdict on the brief (see the session): Office 2021 and the Gmail change got NEW pages; the ChatGPT/ClickFix scam went
into the existing /fake-im-not-a-robot-scam/ page; Windows 11 24H2 got one FAQ on /windows-11-support/ (Microsoft
moves Home/Pro on automatically; our Windows 10 end-of-life page sits at position ~39 with no clicks); the Microsoft 365
Family storage change waits for early 2027 (existing subscribers change at renewal from spring 2027, and Microsoft's own
pages disagree on the date: en-gb "changes" page 2 May 2027 + a year's access, en-us "quotas" page 1 April 2027 +
read-only/freeze/deletion). Rendered by build_new_page(). Own module per the wave rule.

Facts checked 10 Oct 2026:
  OFFICE 2021 - support.microsoft.com/en-gb/office/system-requirements/end-of-support-for-office-2021: support ends
    13 Oct 2026, "no extension and no extended security updates"; "All of your Office 2021 apps may continue to
    function"; no more updates, security fixes or technical support. Office 2016/2019 ended 14 Oct 2025. Office 2024
    (Home; Home & Business) retires 10 Oct 2029 (learn.microsoft.com/lifecycle/products/office-2024). UK prices,
    microsoft.com/en-gb: Microsoft 365 Personal GBP 84.99/yr or 8.49/mo (1 person, 5 devices); Family GBP 104.99/yr or
    10.49/mo (up to 6 people); Office Home 2024 GBP 119.99 once (Word, Excel, PowerPoint, OneNote - NO Outlook);
    Office Home & Business 2024 GBP 249.99 once (adds Outlook). New Family subscriptions from 8 Oct 2026 share 2 TB.
  GMAIL - support.google.com/mail/answer/16604719: Gmailify and POP ("check mail from other accounts") take no new
    users after Q1 2026; existing users until January 2027; messages synced before stay in Gmail; alternatives:
    forwarding from the other provider, the Gmail app on Android/iPhone/iPad (IMAP), one-off import on the web.
    answer/17101213: third-party "Send as" is also removed, January 2027; alternatives incl. a desktop mail client via
    IMAP/SMTP. No exact day is given by Google - do not invent one.
  OUR PRICES (pricing-truth): email moved into Gmail GBP 60 per address for Virgin Media and Plusnet (owner, 26 Sep
    2026) - other providers are QUOTED, never priced; one-off remote fixes from GBP 20; Home + Microsoft 365 plan
    GBP 23.10/mo per computer (licence included, full service every six weeks).

GUARDS: no invented dates (Google gives months, not days); Office 2021 "keeps working" stays - never say it stops; Office
Home 2024 has no Outlook; prices carry "checked 10 October 2026"; no price for email moves except Virgin/Plusnet's GBP 60.
"""

_EXT = ' target="_blank" rel="noopener"'
_SRC = 'style="font-size:.9rem;color:var(--muted)"'

SEO_WAVE13_PAGES = [
 {'slug': 'office-2021-end-of-support',
  'title': 'Office 2021 Support Ends 13 Oct 2026: Will It Still Work?',
  'metaDesc': 'Office 2021 stops getting security updates on 13 October 2026, but Word, Excel and Outlook keep opening. How to check your version, and your options.',
  'ogTitle': 'Office 2021 Support Ends 13 October 2026: Will It Still Work?',
  'crumbName': 'Office 2021 end of support',
  'eyebrow': '// MICROSOFT OFFICE',
  'h1': 'Office 2021 support ends on 13 October 2026. Will Word, Excel and Outlook still work?',
  'lede': 'Yes &mdash; your Office 2021 apps keep opening after the date. What stops is Microsoft fixing them: no more security updates, bug fixes or help. Here is how to check which Office you have, what actually changes, and the sensible ways forward, with real UK prices.',
  'ctaHead': 'Want the change done for you?',
  'ctaSub': 'We can set up Microsoft 365 or Office 2024 remotely while you watch, keep your Outlook email and files exactly as they were, and check everything works &mdash; one-off remote help from &pound;20, agreed before we start. Call 01202 775566.',
  'sections': [
   {'eyebrow': '// THE SHORT ANSWER',
    'h2': 'What happens on 13 October 2026',
    'html': '<p>Microsoft&rsquo;s support for Office 2021 ends on <strong>13 October 2026</strong>, and Microsoft says plainly that there is <strong>no extension and no extended security updates</strong> &mdash; you cannot pay for more. After that date there are no more Office 2021 updates, no security fixes and no technical support from Microsoft.</p>'
            '<p>What does <em>not</em> happen: your apps do not stop. Microsoft&rsquo;s own words are that &ldquo;all of your Office 2021 apps may continue to function&rdquo;. Word still opens your letters, Excel your spreadsheets, Outlook your email. The risk is slower and quieter &mdash; any security hole found from now on stays open, and Outlook is the app that meets the most attachments and links. That is our reason to plan a change in the coming months rather than panic this week.</p>'
            '<p ' + _SRC + '>Last checked: 10 October 2026. Source: <a href="https://support.microsoft.com/en-gb/office/system-requirements/end-of-support-for-office-2021"' + _EXT + '>Microsoft: End of support for Office 2021</a>.</p>'},
   {'eyebrow': '// CHECK YOURS',
    'h2': 'Which Office do you have? A 30-second check',
    'html': '<p>Open <strong>Word</strong>, click <strong>File</strong>, then <strong>Account</strong>. Under <em>Product Information</em> it names your version. (On a Mac: open Word, then the <strong>Word</strong> menu, then <strong>About Word</strong>.)</p>'
            '<ul>'
            '<li><strong>&ldquo;Office Home &amp; Student 2021&rdquo;, &ldquo;Home &amp; Business 2021&rdquo; or &ldquo;Professional 2021&rdquo;</strong> &mdash; this page is about you.</li>'
            '<li><strong>&ldquo;Microsoft 365&rdquo;</strong> &mdash; nothing to do. A Microsoft 365 subscription keeps updating for as long as it is paid.</li>'
            '<li><strong>&ldquo;Office 2019&rdquo; or &ldquo;Office 2016&rdquo;</strong> &mdash; support for those already ended on 14 October 2025, so the options below apply to you too, a little more urgently.</li>'
            '<li><strong>&ldquo;Office 2024&rdquo;</strong> &mdash; supported until October 2029.</li>'
            '</ul>'
            '<p>Office 2021 was the version on sale from late 2021 until Office 2024 replaced it, and it is easy to confuse with Microsoft 365 because the apps look almost the same. The difference is that Office 2021 was a one-off purchase; Microsoft 365 is a subscription.</p>'},
   {'eyebrow': '// WHAT STAYS THE SAME',
    'h2': 'Your documents and your email are not affected',
    'html': '<p><strong>Your files are yours.</strong> Word documents and Excel spreadsheets are ordinary files on your computer or in OneDrive. They do not expire, and every newer version of Office &mdash; and the free alternatives below &mdash; opens them.</p>'
            '<p><strong>Your email lives with your email provider</strong> (Gmail, Outlook.com, BT, Sky and so on), or in Outlook&rsquo;s data file on the computer. Office 2021&rsquo;s Outlook carries on sending and receiving after 13 October. When you do switch to a newer Outlook on the same computer, it normally picks up your existing email set-up &mdash; but back up first, as below.</p>'},
   {'eyebrow': '// YOUR OPTIONS',
    'h2': 'The ways forward, with UK prices',
    'html': '<p>Prices from Microsoft&rsquo;s UK store, checked 10 October 2026.</p>'
            '<style>#o21 .cmp-table td,#o21 .cmp-table th{text-align:left;vertical-align:top}#o21 .cmp-table [data-label]::before{display:none}'
            '@media (max-width:640px){#o21 .cmp-table{min-width:0}#o21 .cmp-table thead{display:none}#o21 .cmp-table tr{display:block;padding:.9rem 1rem;border-bottom:1px solid var(--line)}'
            '#o21 .cmp-table tr:last-child{border-bottom:0}#o21 .cmp-table th,#o21 .cmp-table td{display:block;border:0;padding:.2rem 0}'
            '#o21 .cmp-table [data-label]::before{display:inline;content:attr(data-label) ": ";color:var(--muted);font-weight:600}}</style>'
            '<div id="o21" class="cmp-wrap" tabindex="0" role="group" aria-label="Office options (scrolls sideways on a small screen)"><table class="cmp-table"><thead><tr>'
            '<th scope="col">Option</th><th scope="col">Cost</th><th scope="col">Outlook?</th><th scope="col">Best for</th></tr></thead><tbody>'
            '<tr><th scope="row">Microsoft 365 Personal</th><td data-label="Cost">&pound;84.99 a year or &pound;8.49 a month, 1 person, up to 5 devices</td><td data-label="Outlook?">Yes</td><td data-label="Best for">Always up to date, with OneDrive storage</td></tr>'
            '<tr><th scope="row">Microsoft 365 Family</th><td data-label="Cost">&pound;104.99 a year or &pound;10.49 a month, up to 6 people</td><td data-label="Outlook?">Yes</td><td data-label="Best for">Households; new subscriptions share 2TB of storage</td></tr>'
            '<tr><th scope="row">Office Home 2024</th><td data-label="Cost">&pound;119.99 once, one PC or Mac</td><td data-label="Outlook?"><strong>No</strong></td><td data-label="Best for">Word and Excel without a subscription, supported to 2029</td></tr>'
            '<tr><th scope="row">Office Home &amp; Business 2024</th><td data-label="Cost">&pound;249.99 once, one PC or Mac</td><td data-label="Outlook?">Yes</td><td data-label="Best for">Outlook without a subscription, supported to 2029</td></tr>'
            '<tr><th scope="row">Free options</th><td data-label="Cost">&pound;0</td><td data-label="Outlook?">Web only</td><td data-label="Best for">Occasional letters: Microsoft 365 for the web, or LibreOffice</td></tr>'
            '<tr><th scope="row">Our Home + Microsoft 365 plan</th><td data-label="Cost">&pound;23.10 a month per computer, licence included</td><td data-label="Outlook?">Yes</td><td data-label="Best for">Set up and looked after, with a full service every six weeks</td></tr>'
            '</tbody></table></div>'
            '<p><strong>The catch most people miss:</strong> Office Home 2024 &mdash; the cheapest one-off purchase &mdash; does not include Outlook. If you read your email in Outlook today, choose Microsoft 365 or Office Home &amp; Business 2024, or move your email reading to your provider&rsquo;s website or the Mail app. Microsoft&rsquo;s free web versions of Word and Excel work in a browser with a free Microsoft account; LibreOffice is a free, separate office suite that opens Word and Excel files.</p>'
            '<p><strong>Our view:</strong> if you use Office every week, Microsoft 365 is the simplest &mdash; it never goes out of support while it is paid. If you dislike subscriptions and only need Word and Excel, Office Home 2024 covers you until 2029. If you write two letters a year, the free options are fine. And if you would rather not think about it at all, our <a href="/home-it-support-plans/">Home + Microsoft 365 plan</a> includes the licence and someone to call.</p>'
            '<p ' + _SRC + '>Prices: <a href="https://www.microsoft.com/en-gb/microsoft-365/buy/compare-all-microsoft-365-products"' + _EXT + '>Microsoft UK</a>. Office 2024 support dates: <a href="https://learn.microsoft.com/en-us/lifecycle/products/office-2024"' + _EXT + '>Microsoft Lifecycle</a>.</p>'},
   {'eyebrow': '// SWITCHING SAFELY',
    'h2': 'How to change without losing email, files or settings',
    'html': '<ol>'
            '<li><strong>Back up your documents</strong> &mdash; copy your Documents and Desktop folders to an external drive, or make sure OneDrive has them.</li>'
            '<li><strong>Check where your email lives.</strong> If you use Gmail, Outlook.com, BT, Sky or similar with IMAP, your mail is on their servers and safe. If Outlook downloads it (an older POP set-up), export a copy first: in Outlook, <em>File</em>, <em>Open &amp; Export</em>, <em>Import/Export</em>, then <em>Export to a file</em>.</li>'
            '<li><strong>Write down your email passwords</strong> or make sure you can reset them &mdash; a new Outlook occasionally asks you to sign in again.</li>'
            '<li><strong>Install the new version</strong> from your Microsoft account. The installer usually offers to remove Office 2021 for you; if it does not, remove it from Settings, then Apps, once the new one works.</li>'
            '<li><strong>Check it properly:</strong> send yourself an email, open a few documents, and make sure your calendar and contacts are there.</li>'
            '</ol>'
            '<p>If any of that sounds like a job for someone else, it is exactly the kind of thing we do remotely while you watch &mdash; nothing wiped, and your Outlook set-up kept as it was.</p>'}],
  'faqs': [
   {'q': 'Will Office 2021 stop working on 13 October 2026?', 'a': 'No. The apps keep opening and working. What stops is Microsoft&rsquo;s support: no more updates, security fixes or technical help, with no extension available.'},
   {'q': 'Will my Word and Excel files still open?', 'a': 'Yes. Your documents are ordinary files and do not expire. They open in Office 2021, in any newer Office, and in free alternatives such as Microsoft 365 for the web and LibreOffice.'},
   {'q': 'Is Office 2021 the same as Microsoft 365?', 'a': 'No. Office 2021 was a one-off purchase that is now reaching the end of its support. Microsoft 365 is a subscription that keeps updating for as long as you pay for it. In Word, File then Account tells you which one you have.'},
   {'q': 'Can I pay Microsoft for extra security updates for Office 2021?', 'a': 'No. Microsoft says there is no extension and no extended security updates for Office 2021. That was different for Windows 10, which is why people sometimes expect it.'},
   {'q': 'Does Office Home 2024 include Outlook?', 'a': 'No. Office Home 2024 (&pound;119.99) has Word, Excel, PowerPoint and OneNote. Outlook comes with Office Home &amp; Business 2024 (&pound;249.99) and with every Microsoft 365 subscription. Prices checked 10 October 2026.'}],
  'chips': ['Your apps keep working', 'Real UK prices', 'Help if you want it'],
  'primaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'secondaryCta': ['Home + Microsoft 365 plan', '/home-it-support-plans/'],
  'crossLinksHtml': '<p><strong>Related:</strong> <a href="/microsoft-office-unlicensed-product-error/">Office says &ldquo;Unlicensed Product&rdquo;</a> &middot; <a href="/microsoft-word-wont-open/">Microsoft Word won&rsquo;t open</a> &middot; <a href="/microsoft-365-support/">Microsoft 365 support</a> &middot; <a href="/onedrive-problems/">OneDrive problems</a> &middot; <a href="/home-it-support-plans/">Home support plans</a></p>'},

 {'slug': 'gmail-check-mail-from-other-accounts-ending',
  'title': 'Gmail Stops Collecting Other Email in January 2027',
  'metaDesc': 'Gmail is ending Check mail from other accounts, Gmailify and Send as for BT, Sky, Virgin and other addresses. Does it affect you, and what to do instead.',
  'ogTitle': 'Gmail Stops Collecting Your Other Email in January 2027: What to Do',
  'crumbName': 'Gmail and your other email',
  'eyebrow': '// EMAIL',
  'h1': 'Gmail stops collecting your other email in January 2027. Will your BT, Sky or Virgin address still work?',
  'lede': 'If Gmail shows you the emails sent to another address &mdash; a BT, Sky, Virgin, TalkTalk or Yahoo one &mdash; or lets you send from it, that stops in January 2027. Your old address keeps working; Gmail just stops fetching it. Here is a two-minute check, and what to do instead.',
  'ctaHead': 'Rather we sorted it for you?',
  'ctaSub': 'We set up forwarding, your phone or Outlook remotely while you watch &mdash; one-off remote help from &pound;20. We move Virgin Media and Plusnet mailboxes into Gmail for &pound;60 per address; for other providers we quote before we start. Call 01202 775566.',
  'sections': [
   {'eyebrow': '// THE SHORT ANSWER',
    'h2': 'What Google is switching off',
    'html': '<p>Google is removing three Gmail features that work with email addresses from other providers:</p>'
            '<ul>'
            '<li><strong>Check mail from other accounts (POP)</strong> &mdash; Gmail fetching the post from your other mailbox and showing it in Gmail.</li>'
            '<li><strong>Gmailify</strong> &mdash; Gmail&rsquo;s spam filtering and tidy tabs applied to another account.</li>'
            '<li><strong>Send mail as</strong> another provider&rsquo;s address &mdash; choosing your BT or Sky address in Gmail&rsquo;s From line.</li>'
            '</ul>'
            '<p><strong>When:</strong> Google stopped letting anyone new set up the first two after the first quarter of 2026. People who already use them can carry on until <strong>January 2027</strong>, and &ldquo;Send as&rdquo; for other providers&rsquo; addresses goes in January 2027 too. Google has given the month, not a day.</p>'
            '<p><strong>What you keep:</strong> every message Gmail has already collected stays in your Gmail. Your other address is not closed by this &mdash; new mail still arrives in that provider&rsquo;s mailbox. It just stops appearing in Gmail.</p>'
            '<p ' + _SRC + '>Last checked: 10 October 2026. Sources: Google Gmail Help on <a href="https://support.google.com/mail/answer/16604719?hl=en-GB"' + _EXT + '>Gmailify and POP</a> and <a href="https://support.google.com/mail/answer/17101213?hl=en-GB"' + _EXT + '>third-party accounts and &ldquo;Send as&rdquo;</a>.</p>'},
   {'eyebrow': '// DOES IT AFFECT YOU?',
    'h2': 'A two-minute check',
    'html': '<p>On a computer, open Gmail, click the <strong>cog</strong> at the top right, then <strong>See all settings</strong>, then the <strong>Accounts and Import</strong> tab.</p>'
            '<ul>'
            '<li>An address listed under <strong>Check mail from other accounts</strong> &mdash; <strong>affected</strong>. Gmail stops fetching it in January 2027.</li>'
            '<li>Another provider&rsquo;s address listed under <strong>Send mail as</strong> &mdash; <strong>affected</strong>. You will not be able to send as it from Gmail.</li>'
            '<li>Your old provider <strong>forwards</strong> your mail to Gmail &mdash; <strong>not affected</strong>. Forwarding is done at the other end, not by Gmail.</li>'
            '<li>Your BT or Virgin account is added as a <strong>separate account in the Gmail app</strong> on your phone or tablet &mdash; <strong>not affected</strong>. Google says the app carries on.</li>'
            '<li>You read Gmail in <strong>Outlook, Thunderbird or Apple Mail</strong> &mdash; <strong>not affected</strong>. That is Gmail itself, not Gmail fetching anything.</li>'
            '<li>You <strong>imported</strong> your old messages into Gmail once &mdash; <strong>not affected</strong>. Those stay, and the one-off import is still available.</li>'
            '</ul>'},
   {'eyebrow': '// WHAT TO DO INSTEAD',
    'h2': 'Four ways to keep your other email working',
    'html': '<p><strong>1. Forward new mail into Gmail.</strong> Log in to your other provider&rsquo;s webmail and look in its settings for forwarding. If it offers it, new mail lands in Gmail as before. Replies will come from your Gmail address, so it suits people who are gradually moving to Gmail.</p>'
            '<p><strong>2. Use the Gmail app on your phone or tablet.</strong> Add the other address as a separate account in the Gmail app for Android, iPhone or iPad. Google says this carries on, because the app connects in the standard way (IMAP), and you can read and send from both.</p>'
            '<p><strong>3. Use a desktop email program.</strong> Outlook, Thunderbird or Apple Mail can hold your Gmail and your other address side by side, sending from whichever you choose. Our guide to <a href="/how-to-add-gmail-to-outlook/">adding Gmail to Outlook</a> shows the Gmail half; your provider publishes the settings for the other.</p>'
            '<p><strong>4. Move to your Gmail address for good.</strong> Copy your old messages in once (Gmail&rsquo;s <em>Import mail and contacts</em> still works for that), tell people your Gmail address, and update the logins that use the old one. If your provider is closing its email anyway, our guides walk through it: <a href="/move-virgin-media-email-to-gmail/">Virgin Media to Gmail</a> and <a href="/move-plusnet-email-to-gmail/">Plusnet to Gmail</a>.</p>'
            '<p><strong>Our view:</strong> if you mostly use Gmail already, option 1 or 4 is simplest. If you need to keep sending from your old address &mdash; a business card, a bank or a club that knows it &mdash; option 2 or 3 keeps that working. Do it before January rather than after, so nothing goes quietly missing in the meantime.</p>'},
   {'eyebrow': '// WORTH KNOWING',
    'h2': 'Two things that catch people out',
    'html': '<p><strong>Nothing tells you mail has stopped.</strong> Once Gmail stops fetching, the other mailbox simply fills up unseen. If you do nothing else, log in to your old provider&rsquo;s webmail in January and check.</p>'
            '<p><strong>Old mailboxes have size limits.</strong> If Gmail used to collect and then delete mail from the other mailbox, that mailbox may never have needed space. Once Gmail stops, it can fill and start refusing new mail. Forwarding (option 1) avoids that; otherwise check its storage now and then.</p>'}],
  'faqs': [
   {'q': 'Will I lose the emails Gmail has already collected?', 'a': 'No. Google says all messages synced before the change stay in Gmail.'},
   {'q': 'When exactly does it stop?', 'a': 'Google stopped new set-ups after the first quarter of 2026. Existing users can keep collecting until January 2027, and &ldquo;Send as&rdquo; for other providers&rsquo; addresses also goes in January 2027. Google has not given an exact day.'},
   {'q': 'Does this change my Gmail address?', 'a': 'No. Your Gmail address, its mail and the Gmail app are unaffected. The change is only about Gmail fetching mail from, or sending as, other providers&rsquo; addresses.'},
   {'q': 'Will forwarding from BT, Sky or Virgin to Gmail still work?', 'a': 'Forwarding is set up with your other provider, not in Gmail, so Google&rsquo;s change does not stop it. Whether you can forward depends on your provider, so check its webmail settings or help pages.'},
   {'q': 'Can I still copy my old emails into Gmail?', 'a': 'Yes. Gmail&rsquo;s Import mail and contacts, under Accounts and Import in settings, still does a one-off copy. It does not keep collecting new mail afterwards.'}],
  'chips': ['Two-minute check', 'Mail already in Gmail stays', 'Help if you want it'],
  'primaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'secondaryCta': ['Move Virgin email to Gmail', '/move-virgin-media-email-to-gmail/'],
  'crossLinksHtml': '<p><strong>Related:</strong> <a href="/move-virgin-media-email-to-gmail/">Move Virgin Media email to Gmail</a> &middot; <a href="/virgin-media-email-moving-to-junara/">Virgin Media email is moving to Junara</a> &middot; <a href="/move-plusnet-email-to-gmail/">Move Plusnet email to Gmail</a> &middot; <a href="/how-to-add-gmail-to-outlook/">Add Gmail to Outlook</a></p>'},
]
