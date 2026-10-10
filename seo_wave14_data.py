# -*- coding: utf-8 -*-
"""Wave 14 (11 Oct 2026): two email-change pages for English-speaking readers abroad, from the owner's ChatGPT briefs
("yeah go ahead with all three": eir, Comcast->Yahoo, and US examples on the Gmail page).

Why these two (see the session's verdict table): eir's EUR 18.99 rise from 1 Nov 2026 is uncovered in search (results
still show the 2021 rise to EUR 9.99) and its readers are the same older home users as our Virgin pages; "Comcast email
moving to Yahoo" ranks only forum threads. Skipped: Spectrum/Roadrunner (results full of fake toll-free "support" spam),
Quadro, CenturyLink, Shaw, the closed Australian ISPs; Amazon WorkMail deferred to January 2027. GSC 28d: 47% of the
site's clicks already come from outside the UK (US 197 clicks / 20,737 impressions). Rendered by build_new_page().

Facts checked 10-11 Oct 2026:
  EIR - webmaillogin.eir.ie/webmail/login: "the monthly price of webmail will be increasing to EUR 18.99 from the 1st of
    November 2026"; cancelling = "you will no longer have access to your sent or received emails or webmail account".
    eir.ie/helpandsupport/webmail/help/: external client settings = incoming webmail.eircom.net, port 995 (POP), SSL,
    normal password; outgoing mail1.eircom.net port 25 "(eir broadband customers only)"; FAQ "Can I get my emails from
    eir redirected to my new email address if I go to another provider? No, your email address will be deleted."
    .../webmail/account/: cancel via the account management page in your email account, "no refund issued upon
    termination"; suspended after a missed payment. eir has charged since 2020 (EUR 5.99), EUR 9.99 from July 2021 (RTE).
    IMAP is NOT in eir's published settings - third-party sites list imap on 993; say so, never promise it.
  COMCAST - xfinity.com/support/articles/yahoo-email-migration-overview: invitations from June 2025, rolling out through
    2026; keep the @comcast.net address; each mailbox accepts Yahoo's terms itself; afterwards mail.yahoo.com; settings,
    filters and forwarding do not carry over; attachments over 25 MB do not move; folders beyond 4,100 consolidated;
    contacts beyond 10,000 lost; folder names over 240 characters cut; "an upgrade we are offering customers at no cost";
    no deadline given. ...-migration-safety: genuine mail only from xfinity@updates.xfinity.com or when signed in at
    connect.xfinity.com; never asks for your password by email. help.yahoo.com/kb/SLN36803: sign in at login.yahoo.com
    with the full comcast.net address; choose Yahoo in mail apps; imap.mail.yahoo.com 993 SSL/TLS, smtp.mail.yahoo.com
    587 or 465; app passwords from Yahoo Account Security; "Only contacts saved to Address Book will be moved".
    help.yahoo.com SLN29133: automatic forwarding needs Yahoo Mail Plus, "not available in all locales"; no partner
    exception stated - so we say "check", never "you must pay".

GUARDS: no universal Comcast deadline; never say eir is closing; never promise IMAP for eir or that Gmail's importer
accepts eircom; we are a UK company - no US/Irish office, no price for these moves (quoted, if at all). Techies One
Mail (signed 0.13.2) gets a box on both (techies_one_boxes.PAGES, placed after section s4, no UK set-up button): it reads
IMAP only, so on eir it depends on eir's UNPUBLISHED IMAP; PC Manager is named, not pitched (its email move is
Virgin-webmail only).
"""

_EXT = ' target="_blank" rel="noopener"'
_SRC = 'style="font-size:.9rem;color:var(--muted)"'

SEO_WAVE14_PAGES = [
 {'slug': 'eircom-email-price-increase',
  'title': 'Eircom Email Price Rise to &euro;18.99: Save Your Emails First',
  'metaDesc': 'eir webmail goes up to €18.99 a month on 1 November 2026, and cancelling deletes your eircom.net emails. How to copy them out safely before you decide.',
  'ogTitle': 'eircom.net Email Price Rise to &euro;18.99: Save Your Emails Before You Cancel',
  'crumbName': 'eircom email price rise',
  'eyebrow': '// EMAIL &middot; IRELAND',
  'h1': 'eircom.net email goes up to &euro;18.99 a month on 1 November 2026. How to keep your emails if you leave',
  'lede': 'eir is raising the price of its webmail again. If you cancel, eir deletes the address and everything in it, and nothing is forwarded. Here are your choices, and the order to do things in so you lose nothing.',
  'ctaHead': 'Rather someone did the move with you?',
  'ctaSub': 'We are 365 Techies, an independent IT support company in Bournemouth, England, and we move email for people remotely on Windows PCs. Call +44 1202 775566 or send us a message, and we will tell you honestly whether we can help and what it would cost before anything starts. We also make two free Windows apps: <a href="/techies-one-mail/">Techies One Mail</a> and <a href="/free-pc-health-check/">365 PC Manager</a>.',
  'sections': [
   {'eyebrow': '// THE SHORT ANSWER',
    'h2': 'What eir has announced',
    'html': '<p>eir&rsquo;s webmail sign-in page says the monthly price of webmail is <strong>increasing to &euro;18.99 from 1 November 2026</strong>. That is &euro;227.88 a year to keep an eircom.net address. eir has charged for its email since 2020, when the long-free service first cost &euro;5.99 a month; it went to &euro;9.99 in 2021.</p>'
            '<p>This is a price rise, not a closure: if you keep paying, your email carries on. But read the small print before you cancel. eir says that if you cancel, <strong>you will no longer have access to your sent or received emails</strong>, its help pages say your address is <strong>deleted</strong> and mail is <strong>not redirected</strong> to a new address, and there is <strong>no refund</strong> when an account is closed. A missed payment suspends the webmail.</p>'
            '<p>So the one thing not to do is cancel first. Copy what you need, move your important accounts to a new address, and only then decide.</p>'
            '<p ' + _SRC + '>Last checked: 11 October 2026. Sources: <a href="https://webmaillogin.eir.ie/webmail/login"' + _EXT + '>eir webmail sign-in notice</a>, <a href="https://www.eir.ie/helpandsupport/webmail/help/"' + _EXT + '>eir webmail help</a>, <a href="https://www.eir.ie/helpandsupport/webmail/account/"' + _EXT + '>eir webmail account help</a>, <a href="https://www.rte.ie/news/business/2021/0528/1224536-eir-confirms-further-price-hike-for-email-service/"' + _EXT + '>RT&Eacute; on the 2021 rise</a>.</p>'},
   {'eyebrow': '// YOUR CHOICES',
    'h2': 'Keep paying, move to a free address, or get your own',
    'html': '<p><strong>Keep paying.</strong> If dozens of people, your bank and your clubs all know your eircom.net address, &euro;18.99 a month may be worth it for now &mdash; but it is the price of staying, not a fix.</p>'
            '<p><strong>Move to a free address</strong> such as Gmail or Outlook.com. Your address changes, because an @eircom.net address belongs to eir and cannot be taken to another provider. Your old emails can come with you if you copy them before you cancel.</p>'
            '<p><strong>Get an address of your own.</strong> For a business, or anyone tired of moving, an address on your own domain (yourname.ie, for example) with a mailbox you pay for stays yours whoever provides it. It costs a little, but this never happens to you again.</p>'
            '<p><strong>Our view:</strong> for most people a free Gmail or Outlook.com address, with the old emails copied in, is the sensible move. Give yourself a few weeks: there is no rush to cancel on 1 November itself if a month&rsquo;s fee buys you a calm move.</p>'},
   {'eyebrow': '// THE ORDER THAT LOSES NOTHING',
    'h2': 'Before you cancel: do these in order',
    'html': '<ol>'
            '<li><strong>Check you can sign in to eir webmail</strong> and that your payment is up to date &mdash; a suspended account makes everything harder.</li>'
            '<li><strong>Set up the new address first</strong> and send yourself a test email both ways.</li>'
            '<li><strong>Copy your old emails</strong> into it (how, below) and check the important ones arrived.</li>'
            '<li><strong>Save your contacts.</strong> Look in webmail&rsquo;s Contacts or Preferences for an export option; if there isn&rsquo;t one, save the addresses you cannot lose.</li>'
            '<li><strong>Change your email address on the accounts that matter</strong> while the old address still receives their confirmation emails: your bank, Revenue, insurers, utilities, your doctor or pharmacy, Apple, Google or Microsoft accounts, and the shops you use.</li>'
            '<li><strong>Tell people</strong> your new address, starting with the ones who would never think to ask.</li>'
            '<li><strong>Keep an eye on the old inbox</strong> for a few weeks for anything you missed.</li>'
            '<li><strong>Only then cancel</strong>, from the account management page in your eir webmail. Do it near the end of a paid month, since eir gives no refund.</li>'
            '</ol>'},
   {'eyebrow': '// COPYING YOUR EMAILS',
    'h2': 'How to copy your eircom emails into a new account',
    'html': '<p>eir publishes settings for email programs such as Outlook, Thunderbird and Apple Mail: incoming server <strong>webmail.eircom.net</strong>, port <strong>995</strong>, SSL, normal password. That is a <strong>POP</strong> connection, and the catch is that POP collects your <strong>Inbox only</strong> &mdash; not the folders you have made in webmail, and not your Sent items.</p>'
            '<p>So the reliable route is:</p>'
            '<ol>'
            '<li>In eir webmail, <strong>move the emails you want to keep into the Inbox</strong>, including any from Sent and from your own folders. For a big mailbox, do it in batches.</li>'
            '<li>Add your eircom.net account to a desktop email program &mdash; <strong>Thunderbird</strong> is free &mdash; using eir&rsquo;s settings above, and let it download everything.</li>'
            '<li>Add your <strong>new</strong> Gmail or Outlook.com account to the same program, and drag the downloaded emails across into it. The dates come with them.</li>'
            '</ol>'
            '<p>Two things worth knowing. Third-party settings sites list an IMAP connection for eircom.net (port 993), which would copy every folder in one go &mdash; eir does not publish it, so treat it as worth a try rather than something to rely on. And Gmail limits how much an email program can upload to about 500 MB a day, so a large mailbox can take several days to copy in. Start early.</p>'
            '<p>Our guide to <a href="/move-virgin-media-email-to-gmail/">moving email into Gmail with Thunderbird</a> shows the dragging-across step in detail; the eir part is the same once the emails are downloaded. Or try our own free program first, just below: if eir lets it connect, it copies every folder for you.</p>'},
   {'eyebrow': '// WORTH KNOWING',
    'h2': 'Three things that catch people out',
    'html': '<p><strong>Sending from an email program.</strong> eir&rsquo;s outgoing server, mail1.eircom.net, is listed for eir broadband customers only. If your broadband is with someone else, you may be able to receive in Outlook or Thunderbird but not send. Webmail still works.</p>'
            '<p><strong>Nothing forwards afterwards.</strong> Once the account closes, mail to your old address does not reach you anywhere. Anything still using it &mdash; a password reset, a renewal reminder &mdash; simply disappears. That is why changing your address on important accounts comes before cancelling.</p>'
            '<p><strong>Copy before, not after.</strong> eir says cancelling ends access to your sent and received emails. Do not count on getting them back once the account has gone.</p>'}],
  'faqs': [
   {'q': 'Is eir closing eircom.net email?', 'a': 'No. eir has announced a price rise to &euro;18.99 a month from 1 November 2026, not a closure. If you keep paying, your email carries on.'},
   {'q': 'Can I keep my @eircom.net address if I leave eir?', 'a': 'No. eir&rsquo;s help pages say your email address is deleted and your emails are not redirected to a new address if you go to another provider. Your old emails can come with you if you copy them before cancelling.'},
   {'q': 'Will I get a refund if I cancel partway through a month?', 'a': 'eir&rsquo;s help pages say there is no refund when an account is closed. Cancel near the end of a paid month, once your emails are safely copied.'},
   {'q': 'Can I move my eircom emails to Gmail?', 'a': 'Yes, if you copy them before you cancel. eir&rsquo;s published settings use POP, which collects the Inbox only, so move the emails you want to keep into the Inbox first, download them with a program such as Thunderbird, then drag them into your Gmail account.'},
   {'q': 'What happens if I just stop paying?', 'a': 'eir suspends webmail after a missed payment, and closes accounts that are not signed up for payment. Either way you lose access to the emails, so copy them first.'}],
  'chips': ['Copy before you cancel', 'In the order that loses nothing', 'Checked 11 October 2026'],
  'primaryCta': ['Call +44 1202 775566', 'tel:+441202775566'],
  'secondaryCta': ['Send us a message', '/contact/'],
  'crossLinksHtml': '<p><strong>Related:</strong> <a href="/move-virgin-media-email-to-gmail/">Moving email into Gmail with Thunderbird</a> &middot; <a href="/gmail-check-mail-from-other-accounts-ending/">Gmail stops collecting other email in January 2027</a> &middot; <a href="/how-to-add-gmail-to-outlook/">Add Gmail to Outlook</a></p>'},

 {'slug': 'comcast-email-moving-to-yahoo',
  'title': 'Comcast Email Moving to Yahoo: Keep Address, Fix Outlook',
  'metaDesc': 'Comcast.net email is moving to Yahoo Mail. You keep your address, but filters and forwarding do not move. Spot the real invite, back up, and fix Outlook.',
  'ogTitle': 'Comcast Email Moving to Yahoo: Keep Your Address, Fix Outlook and Forwarding',
  'crumbName': 'Comcast email moving to Yahoo',
  'eyebrow': '// EMAIL &middot; UNITED STATES',
  'h1': 'Comcast email is moving to Yahoo. You keep your address &mdash; here is how to move safely and fix Outlook',
  'lede': 'Xfinity is moving comcast.net mailboxes to Yahoo Mail, one mailbox at a time. Your address stays the same, but some things do not come across, and Outlook or your phone usually needs setting up again. Here is what to check before you accept, and what to do after.',
  'ctaHead': 'Who we are',
  'ctaSub': '365 Techies is an independent IT support company in Bournemouth, England. We are not connected with Xfinity, Comcast or Yahoo; this guide is free. We also make two free Windows apps: <a href="/techies-one-mail/">Techies One Mail</a> and <a href="/free-pc-health-check/">365 PC Manager</a>. If you are in the UK and moving email, we can help remotely &mdash; call +44 1202 775566.',
  'sections': [
   {'eyebrow': '// THE SHORT ANSWER',
    'h2': 'What is happening to Comcast email',
    'html': '<p>It is real. Xfinity began inviting comcast.net users to move to Yahoo Mail in <strong>June 2025</strong>, and the invitations are rolling out through <strong>2026</strong>. Xfinity calls it an upgrade at no cost.</p>'
            '<ul>'
            '<li><strong>You keep your @comcast.net address.</strong> It just lives on Yahoo&rsquo;s system afterwards.</li>'
            '<li><strong>Each mailbox moves separately.</strong> If your household has several comcast.net addresses, each one has to sign in and accept Yahoo&rsquo;s terms.</li>'
            '<li><strong>Afterwards you sign in at Yahoo</strong> (login.yahoo.com) with your full comcast.net address, not at Xfinity.</li>'
            '<li><strong>There is no single deadline for everyone</strong> in Xfinity&rsquo;s overview. Go by your own invitation.</li>'
            '</ul>'
            '<p ' + _SRC + '>Last checked: 11 October 2026. Sources: <a href="https://www.xfinity.com/support/articles/yahoo-email-migration-overview"' + _EXT + '>Xfinity migration overview</a>, <a href="https://help.yahoo.com/kb/SLN36803.html"' + _EXT + '>Yahoo help for comcast.net accounts</a>.</p>'},
   {'eyebrow': '// REAL OR SCAM?',
    'h2': 'How to tell the invitation is genuine',
    'html': '<p>Scammers copy big email changes, so check before you click. Xfinity says genuine messages about the move come <strong>only from xfinity@updates.xfinity.com</strong>, or appear when you sign in securely at <strong>connect.xfinity.com</strong>. Xfinity will <strong>never ask you to reply with your password</strong> or other personal details, and the real process only sends you to Yahoo&rsquo;s own site after you have signed in. Threatening, rush-or-lose-everything wording is a warning sign.</p>'
            '<p>The safest habit: ignore links in the email itself, go to connect.xfinity.com yourself, sign in, and look for the invitation there (<a href="https://www.xfinity.com/support/articles/yahoo-email-migration-safety"' + _EXT + '>Xfinity: recognising the genuine invitation</a>).</p>'},
   {'eyebrow': '// BEFORE YOU ACCEPT',
    'h2': 'What does not come across, and what to save first',
    'html': '<p>Xfinity lists what the move leaves behind:</p>'
            '<ul>'
            '<li><strong>Settings, filters and forwarding</strong> &mdash; none of them carry over.</li>'
            '<li><strong>Attachments over 25 MB</strong> do not move.</li>'
            '<li><strong>Folders beyond 4,100</strong> are merged, and folder names over 240 characters are cut short.</li>'
            '<li><strong>Contacts beyond 10,000</strong> are lost &mdash; and Yahoo adds that only contacts saved in your <strong>Address Book</strong> move, not addresses Comcast simply remembered.</li>'
            '</ul>'
            '<p>So before you accept: save any large attachments you need; check the contacts you rely on are saved in your Address Book; write down your filters and where your mail forwards to; and if Outlook on your computer downloads your mail rather than syncing it (an older POP set-up), make a backup of Outlook&rsquo;s data file first, because that may be the only copy of older messages.</p>'},
   {'eyebrow': '// OUTLOOK AND YOUR PHONE',
    'h2': 'Outlook or your phone stopped working after the move',
    'html': '<p>That is expected: your mailbox now sits on Yahoo&rsquo;s servers, so apps still pointing at Comcast cannot find it. The fix is to set the account up again as Yahoo.</p>'
            '<ol>'
            '<li><strong>Sign in at login.yahoo.com once</strong> with your full comcast.net address. If you get in, the move is complete.</li>'
            '<li><strong>Back up before you remove anything.</strong> If Outlook downloaded your mail, export a copy first (File, Open &amp; Export, Import/Export, Export to a file). If it synced (IMAP), your mail is safe on the server.</li>'
            '<li><strong>Add the account again</strong> with your comcast.net address, and when Outlook or your phone asks for the provider, <strong>choose Yahoo</strong>.</li>'
            '<li><strong>Setting it up by hand?</strong> Yahoo gives incoming <strong>imap.mail.yahoo.com</strong>, port 993, SSL/TLS, and outgoing <strong>smtp.mail.yahoo.com</strong>, port 587 or 465, SSL/TLS.</li>'
            '<li><strong>Password refused?</strong> Create an <strong>app password</strong> on your Yahoo Account Security page (under App passwords) and use that in the app instead of your normal password.</li>'
            '</ol>'
            '<p>Or skip Outlook altogether: our free Windows email program, just below, works with the same Yahoo settings and app password.</p>'},
   {'eyebrow': '// FORWARDING',
    'h2': 'Your forwarding stopped',
    'html': '<p>Forwarding does not survive the move &mdash; Xfinity says settings and forwarding rules do not carry over. Setting it up again on Yahoo is where it gets awkward: Yahoo&rsquo;s help says <strong>automatic forwarding needs a paid Yahoo Mail Plus subscription</strong> and is not available everywhere. Its help does not mention an exception for comcast.net accounts, so check what your own Yahoo settings offer before paying for anything.</p>'
            '<p>The free alternative is to read your comcast.net mail alongside your other email instead of forwarding it: add the account to the Gmail app on your phone, or to Outlook or Thunderbird on your computer. One thing not to set up now is Gmail on the web &ldquo;checking&rdquo; your Comcast mail &mdash; Google is removing that in January 2027 (<a href="/gmail-check-mail-from-other-accounts-ending/">what is changing in Gmail</a>).</p>'},
   {'eyebrow': '// STAY OR MOVE?',
    'h2': 'Keep the Comcast address on Yahoo, or move to your own?',
    'html': '<p><strong>Staying</strong> is the least work: same address, no cost according to Xfinity, and everyone who knows your address keeps reaching you.</p>'
            '<p><strong>Moving</strong> to Gmail or Outlook.com gives you an address that is not tied to your internet provider, which is worth thinking about if you might ever leave Xfinity. But it is a new address: you copy your old mail across, tell people, and change it on your bank, insurance, utilities and other accounts while the comcast.net address still receives their emails.</p>'
            '<p>If you do move, our free <a href="#techies-one-mail">Techies One Mail</a> for Windows PCs can copy the whole comcast.net mailbox into Gmail for you, folder by folder.</p>'
            '<p><strong>Our view:</strong> accept the move to keep things working, then decide about a new address calmly, without a deadline over your head.</p>'}],
  'faqs': [
   {'q': 'Is the Comcast email move to Yahoo real or a scam?', 'a': 'It is real: Xfinity began inviting comcast.net users in June 2025 and continues through 2026. But scammers copy it. Genuine messages come only from xfinity@updates.xfinity.com or appear when you sign in at connect.xfinity.com, and Xfinity never asks for your password by email.'},
   {'q': 'Do I keep my comcast.net email address?', 'a': 'Yes. Your @comcast.net address stays the same; afterwards you sign in to it at Yahoo with the full address.'},
   {'q': 'Will all my emails and contacts move?', 'a': 'Most will, with exceptions Xfinity lists: settings, filters and forwarding do not carry over; attachments over 25 MB do not move; folders beyond 4,100 are merged; contacts beyond 10,000 are lost. Yahoo adds that only contacts saved in your Address Book move.'},
   {'q': 'Why did Outlook stop working with my Comcast email?', 'a': 'Your mailbox moved to Yahoo&rsquo;s servers. Sign in once at login.yahoo.com, back up any mail Outlook downloaded, then add the account again choosing Yahoo as the provider. If your password is refused, create a Yahoo app password.'},
   {'q': 'Is there a deadline to accept the move?', 'a': 'Xfinity&rsquo;s overview gives no single deadline for everyone; invitations roll out through 2026. Go by the dates in your own invitation from xfinity@updates.xfinity.com.'}],
  'chips': ['You keep your address', 'Spot the real invite', 'Fix Outlook afterwards'],
  'primaryCta': ['Fix Outlook after the move', '#s4'],
  'secondaryCta': ['Is the invitation genuine?', '#s2'],
  'crossLinksHtml': '<p><strong>Related:</strong> <a href="/gmail-check-mail-from-other-accounts-ending/">Gmail stops collecting other email in January 2027</a> &middot; <a href="/how-to-add-gmail-to-outlook/">Add Gmail to Outlook</a> &middot; <a href="/how-to-spot-a-fake-website/">How to spot a fake website</a></p>'},
]
