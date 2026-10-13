# -*- coding: utf-8 -*-
"""/greenby-email-login/ - Plusnet email after the move to Greenby (13 Oct 2026, owner: "do the Greenby page").

Why: Bing UK keyword research, 13 Oct 2026 (seo-research/email-keywords-uk-2026-10-13/FINDINGS.md): Greenby searches
run to thousands a quarter on Bing UK alone - "greenby.com email" 637, "my greenby log in" 616, "greenby email login"
581, "greenby webmail login" 579, "greenby login" 458 - and nearly all are people trying to get INTO a moved mailbox.
The site had no Greenby page (only mentions on /move-plusnet-email-to-gmail/). Same pattern as Virgin -> Junara.

Facts, all read 13 Oct 2026:
  - Greenby's FAQ (greenby.com/support/knowledgebase/faqs): Enix Ltd t/a Greenby; free 2 years with Plusnet broadband,
    else 30 days then GBP 15 a year covering all existing and new mailboxes; domains GBP 7 / GBP 12; unpaid = mail kept
    and received for 2 years; 30 days' notice; 6-12 months; 1 GB -> 2 GB; settings should not change; complaints@.
  - Greenby's front page login box: "Username or Email Address", "Password", "Provider" (Plusnet), "I don't know my login
    details"; "Your Greenby login will only be activated after your migration is complete."
  - Greenby's settings reference (article 29): mail.plus.net / imap.plus.net in, mail.plusnet.enmail.co out, with
    unencrypted ports 143/110/25 - NOT repeated as advice: Greenby's own Outlook guide (article 31) uses 993 and 465 with
    SSL/TLS, Plusnet's FAQ says STARTTLS or SSL/TLS can be switched on, and Plusnet's set-up page gives imap.plus.net 993,
    mail.plus.net 995, relay.plus.net 587 STARTTLS (465 SSL/TLS), force9.net / free-online.net for those addresses.
  - Plusnet's FAQ (plus.net/help/email-account-changes): brands included, no new email, opt in/out, all mail, folders and
    contacts copied, up to 24 h delay on the day, Manage My Mail moves to Greenby, prices, 30-day suspension without
    broadband, 0330 1239 123. Plusnet webmail page: webmail.plus.net; an extra mailbox has its own password.
  - Plusnet Community, staff (James_B): 11 Dec 2025 update (Metronet, Force9, Free-Online first, then Plusnet); 12 Oct
    2026 "you'll only be able to send emails using addresses that are configured on your Greenby account". Staff reply
    Oct 2026: batches still going. Forum users: Greenby webmail is inside the Greenby login; some got no completion email;
    one address was marked closed after the move; superuser: 993/995/587 work, imap./mail./relay. are one server.
No Techies One Mail box here: its Plusnet preset is untested against Greenby (rule: no T1 box until tested).
"""
from new_pages_data import NEW_PAGES

GREENBY_SLUG = "greenby-email-login"

_SRC = ('<p style="font-size:.85rem;color:var(--muted)">Sources: Greenby, <a href="https://greenby.com/support/knowledgebase/faqs" '
        'rel="noopener" target="_blank">FAQ</a> and <a href="https://greenby.com/support/knowledgebase/article/29" rel="noopener" '
        'target="_blank">email client settings</a>; Plusnet, <a href="https://www.plus.net/help/email-account-changes/" rel="noopener" '
        'target="_blank">changes to Plusnet email accounts</a> and <a href="https://www.plus.net/help/email-guides/how-to-set-up-plusnet-email/" '
        'rel="noopener" target="_blank">email settings</a>; Plusnet Community, <a href="https://community.plus.net/t5/Email/'
        'Update-on-Plusnet-email-migration-to-Greenby/td-p/2031990" rel="noopener" target="_blank">migration updates</a>. '
        'Read 13 October 2026.</p>')

NEW_PAGES.append({
 'slug': GREENBY_SLUG,
 'title': 'Greenby Email Login: Plusnet Webmail, Settings and Cost',
 'metaDesc': 'Plusnet email has moved to Greenby. How to log in at greenby.com, find Greenby webmail, fix a login that '
             'fails, and the settings and cost.',
 'ogTitle': 'Greenby email login: Plusnet email after the move',
 'crumbName': 'Greenby Email Login',
 'eyebrow': '// PLUSNET EMAIL IS NOW GREENBY',
 'h1': 'Greenby email login: <em class="grad grad--cyan">Plusnet email after the move</em>',
 'lede': 'Plusnet has handed its email to a company called Greenby. Once your mailbox has moved, you log in at '
         '<strong>greenby.com</strong> with your Plusnet email address and password. Your address and your old emails stay '
         'the same.',
 'chips': ['Family-run since 1995', 'Rated 4.9 on Google', 'Email sorted remotely, from &pound;20'],
 'primaryCta': ['Call 01202 775566', 'tel:+441202775566'],
 'secondaryCta': ['Login not working? What to check', '#s3'],
 'ctaHead': 'Still can&rsquo;t get into your Greenby email?',
 'ctaSub': 'Ring us and we&rsquo;ll sort it with you, remotely on your Windows PC while you watch: the Greenby login, Outlook '
           'or Thunderbird. From &pound;20, agreed before we start. Family-run in Bournemouth since 1995.',
 'sections': [
  {'eyebrow': '/01 &mdash; HOW TO LOG IN', 'h2': 'How to log in to Greenby email',
   'html': '<p>Your Greenby login only starts working <strong>after your mailbox has been moved</strong>, and Greenby emails '
           'you when that is done. Until then, carry on using Plusnet as before.</p>'
           '<ol><li>Type <strong>greenby.com</strong> into your browser yourself, rather than clicking a link in an email.</li>'
           '<li>In the <strong>Log In</strong> box, put your <strong>full Plusnet email address</strong> in &ldquo;Username or '
           'Email Address&rdquo;.</li>'
           '<li>Type your <strong>email password</strong>: the same one you used with Plusnet.</li>'
           '<li>Check that <strong>Provider</strong> says <strong>Plusnet</strong>, then press <strong>Log in</strong>.</li></ol>'
           '<p>If your email address is refused, try your <strong>Plusnet username</strong> instead, the one you used for the '
           'Plusnet Member Centre. Older Plusnet, Force9 and Free-Online accounts signed in with a username rather than an email '
           'address, so if one doesn&rsquo;t work, try the other.</p>'
           '<p>Forgotten the password? Press <strong>I don&rsquo;t know my login details</strong> under Greenby&rsquo;s login '
           'box.</p>'
           '<p><strong>Not sure whether you&rsquo;ve been moved?</strong> Try logging in at greenby.com: if your mailbox is there, '
           'you have. Some people never noticed Greenby&rsquo;s &ldquo;migration complete&rdquo; email; one found it sitting in '
           'their old Plusnet webmail.</p>'
           + _SRC},
  {'eyebrow': '/02 &mdash; GREENBY WEBMAIL', 'h2': 'Greenby webmail: reading your email in a browser',
   'html': '<p>After the move, email in a web browser is part of your Greenby account: log in at greenby.com and open your '
           'mailbox. It is also where you now add or remove mailboxes, make aliases and change mailbox sizes, which Plusnet '
           'used to do in Manage My Mail.</p>'
           '<p><strong>Not moved yet?</strong> Plusnet&rsquo;s webmail still works at <strong>webmail.plus.net</strong>, with '
           'your Plusnet username and password.</p>'
           '<p>Mailboxes grow from 1&nbsp;GB to 2&nbsp;GB at Greenby. On the day of your move, Plusnet says mail can be delayed by '
           'up to 24 hours and deleted emails can reappear, so leave tidying up until the next day.</p>'},
  {'eyebrow': '/03 &mdash; LOGIN NOT WORKING', 'h2': 'Greenby login not working? What to check',
   'html': '<ul><li><strong>You haven&rsquo;t been moved yet.</strong> The Greenby login is switched on only after your move, '
           'and Plusnet was still moving people in batches in October 2026. Use webmail.plus.net until Greenby emails you.</li>'
           '<li><strong>The wrong name in the username box.</strong> Try your full email address, then your old Plusnet '
           'username.</li>'
           '<li><strong>It&rsquo;s an extra mailbox.</strong> A second mailbox on the account, not the main one, has its own '
           'password: the one chosen when that mailbox was made.</li>'
           '<li><strong>Forgotten password.</strong> Use &ldquo;I don&rsquo;t know my login details&rdquo; under Greenby&rsquo;s '
           'login box.</li>'
           '<li><strong>Email stopped on the day you moved.</strong> Log in at greenby.com and check the mailbox is switched on. '
           'One Plusnet customer found their address marked as closed after the move and had to reactivate it there.</li>'
           '<li><strong>Webmail works, but Outlook or your phone keeps asking for the password.</strong> Then the login is fine and '
           'the email program needs its settings checking: see below.</li></ul>'
           '<p>Still stuck? Greenby&rsquo;s help centre is at greenby.com/support/help, and complaints go to '
           'complaints@greenby.com. Before your move, Plusnet&rsquo;s own number is 0330 1239 123. Or ring us on '
           '<strong>01202 775566</strong> and we&rsquo;ll sort it on your Windows PC while you watch.</p>'},
  {'eyebrow': '/04 &mdash; OUTLOOK AND PHONES', 'h2': 'Greenby email settings for Outlook, Thunderbird and phones',
   'html': '<p>Greenby says your settings should not change when you move, so most people needn&rsquo;t do anything. If you are '
           'setting up a new computer or phone, or the old settings have stopped working, use these:</p>'
           '<style>#gbset .cmp-table td,#gbset .cmp-table th{text-align:left;vertical-align:top}'
           '@media (max-width:640px){#gbset .cmp-table{min-width:0}#gbset .cmp-table thead{display:none}'
           '#gbset .cmp-table tr{display:block;padding:.75rem 1rem;border-bottom:1px solid var(--line)}'
           '#gbset .cmp-table tr:last-child{border-bottom:0}#gbset .cmp-table td{display:block;border:0;padding:.1rem 0}'
           '#gbset .cmp-table td:first-child{color:var(--muted);font-weight:600;font-size:.85rem}}#gbset{margin-bottom:1.1rem}</style>'
           '<div id="gbset" class="cmp-wrap" tabindex="0" role="group" aria-label="Greenby email settings">'
           '<table class="cmp-table"><thead><tr><th scope="col">Setting</th><th scope="col">What to type</th></tr></thead><tbody>'
           '<tr><td>Username</td><td>Your full email address (or your Plusnet username)</td></tr>'
           '<tr><td>Password</td><td>Your email password</td></tr>'
           '<tr><td>Incoming (IMAP)</td><td>imap.plus.net, port 993, SSL/TLS</td></tr>'
           '<tr><td>Incoming (POP)</td><td>mail.plus.net, port 995, SSL/TLS</td></tr>'
           '<tr><td>Outgoing (SMTP)</td><td>relay.plus.net, port 587, STARTTLS (or port 465, SSL/TLS)</td></tr>'
           '<tr><td>Outgoing sign-in</td><td>Yes, with the same username and password</td></tr></tbody></table></div>'
           '<p>For a <strong>Force9</strong> or <strong>Free-Online</strong> address, change plus.net to force9.net or '
           'free-online.net in each server name. Choose <strong>IMAP</strong> if you read your email on more than one device, '
           'so they all show the same thing.</p>'
           '<p>Greenby&rsquo;s own settings page lists older, unencrypted ports (143 for incoming, 25 for sending) and an outgoing '
           'server called mail.plusnet.enmail.co. Try the secure settings above first: Plusnet says secure connections can be '
           'used, Greenby&rsquo;s own Outlook guide uses them, and an unencrypted connection sends your password as plain text. '
           'A superuser on Plusnet&rsquo;s forum, writing about Greenby, gives the same secure settings: 993, 995 and 587.</p>'
           '<p><strong>Sending from another address?</strong> Since the move you can only send from addresses that are set up '
           'on your Greenby account, Plusnet said on 12 October 2026. An address on a domain looked after '
           'by another company has to send through that company instead.</p>'
           '<p>Outlook refusing the address? See <a href="/plusnet-email-wont-add-to-new-outlook/">Plusnet email won&rsquo;t add '
           'to the new Outlook</a>.</p>'},
  {'eyebrow': '/05 &mdash; WHAT IT COSTS', 'h2': 'What does Greenby email cost?',
   'html': '<ul><li><strong>Still with Plusnet broadband:</strong> free for two years after your move, then &pound;15 a year.</li>'
           '<li><strong>No Plusnet broadband</strong> (you&rsquo;ve left, or only ever had email): free for 30 days after your '
           'move, then &pound;15 a year.</li></ul>'
           '<p>Greenby says the &pound;15 a year covers all the mailboxes on your account, existing and new. A domain name of your '
           'own is extra: &pound;7 a year for .co.uk, .org.uk or .uk, or &pound;12 for .com, .net or .org.</p>'
           '<p><strong>If you don&rsquo;t pay,</strong> Greenby says it carries on receiving and storing your email for two years, '
           'and you can pay at any point in that time to get back to your old and new emails. Plusnet adds that without '
           'Plusnet broadband, access is suspended 30 days after the move, and switching it back on later means contacting '
           'Greenby and paying.</p>'
           '<p><strong>Changing broadband provider?</strong> Once your email is with Greenby it no longer runs on Plusnet&rsquo;s '
           'system, so moving to EE or anyone else doesn&rsquo;t close it. Ask Greenby whether it changes your free period. '
           '<strong>Not moved yet?</strong> Don&rsquo;t cancel Plusnet broadband first: cancelling before your mailbox has moved '
           'closes the email with it.</p>'},
  {'eyebrow': '/06 &mdash; KEEP IT OR MOVE IT', 'h2': 'Keep it with Greenby, or move to Gmail?',
   'html': '<p><strong>Keep it with Greenby</strong> if the address is on everything that matters &mdash; bank, GP, family '
           '&mdash; and &pound;15 a year is worth not having to tell everyone a new one. Nothing needs setting up again.</p>'
           '<p><strong>Move to free Gmail or Outlook.com</strong> if you&rsquo;d rather not pay, or you don&rsquo;t want your '
           'email to depend on a company you didn&rsquo;t choose. An address from Google or Microsoft stays yours whoever '
           'supplies your broadband.</p>'
           '<p><strong>A calm middle way:</strong> use the free period to move at your own pace, with the old address still '
           'working while you tell people your new one.</p>'
           '<p>Our guide to <a href="/move-plusnet-email-to-gmail/">moving Plusnet email to Gmail</a> shows how, or we can move '
           'it for you for &pound;60 per email address, remotely on a Windows PC, agreed before we start.</p>'},
  {'eyebrow': '/07 &mdash; SCAMS', 'h2': 'Fake &lsquo;Greenby&rsquo; emails: how to tell',
   'html': '<p>A change that touches every Plusnet address, with a bill at the end, is exactly what scammers wait for.</p>'
           '<ul><li>Greenby&rsquo;s email price is &pound;15 a year. A message asking for much more, or saying your mailbox will be '
           'deleted today unless you pay, is a warning sign.</li>'
           '<li>Never pay, or type your password, through a link in an email or text. <strong>Type greenby.com into your '
           'browser yourself</strong> and log in there.</li>'
           '<li>Forward a suspicious email to <strong>report@phishing.gov.uk</strong>, the National Cyber Security Centre&rsquo;s '
           'reporting address.</li>'
           '<li>Already paid, or typed your password in? Change the password at greenby.com, ring your bank, and report it to '
           'Report Fraud on 0300 123 2040.</li></ul>'
           '<p>Not sure about a message? Don&rsquo;t click. Ring us on <strong>01202 775566</strong> first.</p>'},
 ],
 'howToName': 'How to log in to Greenby email',
 'howToSteps': [
  {'name': 'Wait for the move to finish', 'text': 'Greenby switches your login on only after your Plusnet mailbox has moved, and emails you when it has. Until then, keep using Plusnet webmail at webmail.plus.net.'},
  {'name': 'Go to greenby.com yourself', 'text': 'Type greenby.com into your browser rather than clicking a link in an email.'},
  {'name': 'Type your email address and password', 'text': 'Put your full Plusnet email address in Username or Email Address and your usual email password, check Provider says Plusnet, then press Log in. If the address is refused, try your old Plusnet username.'},
  {'name': 'Open your mailbox', 'text': 'Your webmail, mailboxes and aliases are in your Greenby account. Forgotten the password? Use I don&rsquo;t know my login details under the login box.'},
 ],
 'faqs': [
  {'q': 'What is Greenby?', 'a': 'Greenby is the company Plusnet chose to take over its email, webspace and domain services, because Plusnet no longer offers email. Greenby is the trading name of Enix Ltd, a UK cloud services company.'},
  {'q': 'Where is the Greenby email login?', 'a': 'On the front page of greenby.com: the Log In box asks for your username or email address, your password and your provider (Plusnet). Type greenby.com yourself rather than following a link in an email. It only works once your mailbox has moved.'},
  {'q': 'Is Greenby legit?', 'a': 'Yes. Plusnet&rsquo;s own help pages name Greenby as the new supplier for Plusnet email. It is a new name to most people, though, which is what scammers rely on, so always type greenby.com yourself.'},
  {'q': 'Why can&rsquo;t I log in to Greenby?', 'a': 'Usually because your mailbox hasn&rsquo;t been moved yet (the login only works afterwards), or because it wants your Plusnet username rather than your email address, or the other way round. An extra mailbox has its own password. <a href="#s3">What to check, in full</a>.'},
  {'q': 'Do I need a new email address?', 'a': 'No. Plusnet and Greenby both say your Plusnet email address stays the same.'},
  {'q': 'Will I lose my emails?', 'a': 'Plusnet says all your email, folders, contacts and settings are copied to Greenby. Mail can be delayed by up to 24 hours on the day of the move, and deleted emails can reappear, so leave tidying up until afterwards. Back up anything precious first.'},
  {'q': 'Is Plusnet webmail still working?', 'a': 'Until your mailbox moves, yes, at webmail.plus.net. After the move, your webmail is in your Greenby account at greenby.com.'},
  {'q': 'What are the Greenby email settings?', 'a': 'Most people don&rsquo;t need to change anything. For a new device: incoming imap.plus.net, port 993, SSL/TLS (or POP on mail.plus.net, port 995); outgoing relay.plus.net, port 587, STARTTLS; username your full email address and your usual password. <a href="#s4">All the settings</a>.'},
  {'q': 'How much is Greenby email?', 'a': 'Free for two years after the move if you still have Plusnet broadband, then &pound;15 a year. Without Plusnet broadband it is free for 30 days after the move, then &pound;15 a year. Greenby says that price covers all the mailboxes on your account.'},
  {'q': 'Can you sort out my Greenby email for me?', 'a': 'Yes, remotely on a Windows PC while you watch: the Greenby login, Outlook or Thunderbird, from &pound;20, agreed before we start. Or we can move your email to Gmail for &pound;60 per address. We work on Windows PCs only, not Macs, iPads or iPhones. Ring 01202 775566.'},
 ],
 'crossLinksHtml': '<p><strong>Related guides:</strong> <a href="/move-plusnet-email-to-gmail/">Moving Plusnet email to Gmail</a> &middot; '
                   '<a href="/plusnet-email-wont-add-to-new-outlook/">Plusnet email and the new Outlook</a> &middot; '
                   '<a href="/how-to-make-a-google-app-password/">Making a Google app password</a> &middot; '
                   '<a href="/change-your-email-address-everywhere/">Change your email address everywhere</a> &middot; '
                   '<a href="/virgin-media-email-moving-to-junara/">Virgin Media email is moving too</a> &middot; '
                   '<a href="/email-support/">Email support</a></p>',
})
