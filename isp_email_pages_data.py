# -*- coding: utf-8 -*-
"""UK ISP email changes, four pages (3 Nov 2026). Owner, 3 Nov 2026, after the research report
(D:/claude/seo-research/uk-isp-email-2026-11-03/REPORT.md): "just build the pages for all of them".

  /talktalk-email-moving-to-everymail/   built 11 Oct 2026 in worktree 365-techies-t1installs (seo_wave15_data.py), never
                                         committed; brought here and brought up to date
  /madasafish-freenetname-email-greenby/ Plusnet's older email brands moving to Greenby, with the own-domain section
  /keep-bt-email-when-leaving-bt/        BT's rules when broadband ends
  /old-internet-provider-email-closed/   what can still be done after a closure (Eclipse, F2S/Nildram, EE, TalkTalk, Manx)

Facts, read 3 Nov 2026 (sources linked on each page):
  TalkTalk Email Transition FAQs: former broadband customers and Mail Plus -> Everymail (Open-Xchange); current customers not
    affected "for now"; 16 Jun 2026 no sending, 7 Jul 2026 closed and permanently deleted; names talktalk.net "or associated
    TalkTalk" addresses. Settings page re-checked: mail.talktalk.net 993 SSL/TLS (POP 995), smtp.talktalk.net 587 STARTTLS,
    MD5 and SPA no longer supported, webmail apps.talktalk.co.uk. TalkTalk Community: CLOSED (community URLs 302 to a help
    page). PRICE REPORTED ONLY: GBP 5 a month or GBP 50 a year for up to 5 mailboxes (TalkTalk's May 2026 email and a staff
    reply, quoted); leavers "within 30 days of your disconnection" (staff reply, reported). Post Office / Shell Energy
    addresses run on TalkTalk mail (TalkTalk community FAQ, reported).
  Greenby FAQs (greenby.com/support/knowledgebase/faqs + /faq): Enix Ltd; notice 60 and 30 days before; opt out before
    migration day; 1 GB -> 2 GB; free 2 years with active Plusnet broadband, else 30 days then GBP 15 a year for all
    mailboxes; domains GBP 7 (.co.uk/.org.uk/.uk) / GBP 12 (.com/.net/.org); free domains honoured 2 years; unpaid = mail
    received and stored 2 years. Brands: Greenby names only Plusnet; Plusnet staff (11 Dec 2025, our greenby notes) said
    Metronet, Force9 and Free-Online first. Madasafish / Freenetname / Globalnet late-Oct 2026 problems = CUSTOMER reports
    from Plusnet Community (seen in search results only: the forum blocks automated readers). ⚠ Greenby's encryption-off
    settings are never published (greenby-email-login-page rule): link to Greenby's own guide instead.
  BT help "what happens to my email address when my BT broadband service stops" (verbatim, 3 Nov): options close / Basic
    (free) / Premium / link to a friend or family member's BT Broadband "which is free"; "If you don't make a choice
    yourself, we'll transfer you to Basic email."; "For 60 days after you leave BT Broadband you can choose to upgrade to
    Premium email."; not upgrading -> after 60 days addresses linked to the BT ID deleted (close path). BT "bt-email-products"
    (verbatim): Basic = "Just one BT email address", "Access via www.bt.com only", "You can't use this email with an email
    client or on your device", "log in regularly", "you need to order it when cancelling your broadband", "You can't make a
    direct switch later"; Premium "costs GBP 7.50 a month", direct debit, up to 11 addresses, UK bank account, My BT > Your
    products > Email > Manage. The two BT pages differ on Basic (default vs order it): the page says choose it explicitly.
    Settings and no app passwords: our bt-email-facts notes (BT help, 26 Sep 2026).
  Closures: Nasstar FAQ (eclipse.co.uk + 6 shared domains; transfer requests by 31 Oct 2025; end of service 16 Jan 2026;
    can't keep or transfer the shared addresses); Very Good Email (F2S/Nildram/Gotadsl/Mr Site addresses not transferred are
    "gone and can't be resurrected"); EE closed Orange/Wanadoo/Freeserve email 31 May 2017 (ISPreview); Manx Telecom
    (manx.net etc., deleted 21 Apr 2026).
GUARDS: prices only as verified or labelled "reported"; never promise recovery of deleted server mail; an ISP address can't
become a Gmail address; forwarding needs the old account; no price for our own moves beyond what is already published
(Virgin/Plusnet GBP 60 per address live elsewhere; not restated here).
"""
from new_pages_data import NEW_PAGES

_EXT = ' target="_blank" rel="noopener"'
_SRC = 'style="font-size:.85rem;color:var(--muted)"'
_GMAIL = ('<p><strong>Reading this email inside Gmail?</strong> Gmail stops collecting mail from other accounts in January 2027: '
          'see <a href="/gmail-check-mail-from-other-accounts-ending/">Gmail stops checking other email accounts</a>.</p>')
_FLAGS = ('<p><strong>Worth knowing before you decide:</strong> an internet provider&rsquo;s address can&rsquo;t be turned into a '
          'Gmail or Outlook.com address &mdash; only your emails and contacts move. Forwarding from the old address only works '
          'while the old account still exists and allows it. And once a provider has deleted an account, nobody can bring the '
          'emails back from its servers.</p>')
_CALL = ('<p>Ring <strong>01202 775566</strong> or text 07520 615332, Monday to Friday, 9 to 5. With your permission we connect '
         'to your Windows PC, copy your emails and contacts somewhere safe first, then keep or move the address with you. We '
         'tell you the price before we start.</p>')

# ------------------------------------------------------------------ 1. TalkTalk -> Everymail (from seo_wave15_data.py, 11 Oct)
_TT_FAQ = 'https://help-centre.talktalk.co.uk/Email/Find_info_or_guidance_about_my_Email/Email_Transition_FAQs'
_TT_SET = 'https://help-centre.talktalk.co.uk/Email/Check_settings/Email_settings_to_access_TalkTalk_emails'
_TT_ISP = 'https://www.ispreview.co.uk/index.php/2025/07/talktalk-cause-confusion-for-some-uk-users-with-paid-email-migration.html'
NEW_PAGES.append({
    'slug': 'talktalk-email-moving-to-everymail',
    'title': 'TalkTalk Email Moving to Everymail: Cost and What to Do',
    'metaDesc': 'Left TalkTalk? Your TalkTalk email is now run by Everymail: who has to pay, the reported price, what happened on 7 July 2026, and how to keep or move it.',
    'ogTitle': 'TalkTalk email is moving to Everymail: who pays, and what to do',
    'crumbName': 'TalkTalk email and Everymail',
    'eyebrow': '// TALKTALK EMAIL CHANGE',
    'h1': 'TalkTalk email is moving to Everymail: <em class="grad grad--cyan">who pays, and what to do</em>',
    'lede': 'If you have left TalkTalk broadband but still use a TalkTalk email address, that email is now run by a company '
            'called Everymail, and keeping it means paying for it. If you are still a TalkTalk broadband customer, nothing has '
            'changed for you yet. Here is how to tell which you are, what it costs, and how to keep or move your email without '
            'losing any of it.',
    'chips': ['Current customers: nothing to pay', 'Leaving? Act within weeks', 'Keep it or move it'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Which one are you?', '#s2'],
    'ctaHead': 'Not sure whether to keep it or move it?',
    'ctaSub': 'Ring us and we&rsquo;ll talk it through with you. If you decide to move, we can do the whole thing for you on a '
              'Windows PC, remotely, and we tell you the price before we start.',
    'sections': [
        {'eyebrow': '// THE SHORT ANSWER', 'h2': 'What TalkTalk has changed',
         'html': '<p>TalkTalk has handed the email of its <strong>former</strong> broadband customers to <strong>Everymail</strong>, '
                 'an email service run by Open-Xchange, a German company. It covers people who left TalkTalk broadband but kept '
                 'using their TalkTalk address, and people paying for TalkTalk Mail Plus. TalkTalk&rsquo;s page covers talktalk.net '
                 '&ldquo;or associated TalkTalk&rdquo; addresses: older TalkTalk-family names such as tiscali.co.uk, lineone.net and '
                 'pipex.com run on the same TalkTalk email.</p>'
                 '<p>For the main switch-over TalkTalk set two dates. From <strong>16 June 2026</strong>, a former customer who '
                 'hadn&rsquo;t subscribed could no longer send email. On <strong>7 July 2026</strong>, accounts that still '
                 'hadn&rsquo;t subscribed were closed, and TalkTalk says their emails, contacts and everything else were '
                 'permanently deleted.</p>'
                 '<p>If you subscribe, you keep the same address and the same mailbox: TalkTalk says nothing moves and you '
                 'don&rsquo;t have to change anything. <strong>Current TalkTalk broadband customers are not affected</strong> for '
                 'now: your email carries on as before.</p>'
                 '<p ' + _SRC + '>Last checked: 3 November 2026. Source: <a href="' + _TT_FAQ + '"' + _EXT + '>TalkTalk&rsquo;s Email Transition FAQs</a>.</p>'},
        {'eyebrow': '// WHICH ONE ARE YOU?', 'h2': 'Find your situation',
         'html': '<p><strong>You still have TalkTalk broadband.</strong> Do nothing. TalkTalk says the change doesn&rsquo;t affect '
                 'current broadband customers for now, and its staff have said current customers should <em>not</em> subscribe to '
                 'Everymail. If a message asks you to pay for your email, treat it as a possible scam (see below).</p>'
                 '<p><strong>You are about to leave TalkTalk.</strong> This is now the moment that matters. TalkTalk staff have said '
                 'that to keep your email you need to sign up to Everymail within <strong>about 30 days of your broadband '
                 'ending</strong> (as reported by customers; follow the dates in the email TalkTalk sends you). Decide before you '
                 'switch: keep paying for the address, or start moving to one you own.</p>'
                 '<p><strong>You left TalkTalk and subscribed to Everymail.</strong> Your address, emails and folders are where they '
                 'were, and your email program should carry on with the same settings.</p>'
                 '<p><strong>You left TalkTalk and didn&rsquo;t subscribe.</strong> TalkTalk says closed accounts are deleted and it '
                 'can&rsquo;t be reversed. The one place your old emails may still exist is your own computer: if your email '
                 'program downloaded them (Outlook, Windows Live Mail, or anything set up with &ldquo;POP&rdquo;), they are still '
                 'in it. <strong>Don&rsquo;t remove the account or reset the program</strong>: copy the emails somewhere safe first, '
                 'or ask us to. See <a href="/old-internet-provider-email-closed/">old email address closed: what you can still do</a>.</p>'
                 '<p><strong>A Post Office or Shell Energy address?</strong> Those broadband customers moved to TalkTalk, and their '
                 'addresses run on TalkTalk&rsquo;s email, so the same rules are likely to apply: go by the email TalkTalk sends you.</p>'},
        {'eyebrow': '// THE COST', 'h2': 'How much Everymail costs',
         'html': '<p>TalkTalk&rsquo;s FAQ doesn&rsquo;t state a price. The figure customers report, quoting TalkTalk&rsquo;s email '
                 'and a TalkTalk staff reply, is <strong>&pound;5 a month or &pound;50 a year</strong>, covering up to five '
                 'addresses. <a href="' + _TT_ISP + '"' + _EXT + '>ISPreview</a> reported the same &pound;5 a month in 2025. '
                 'Check the price on the sign-up page before you pay.</p>'
                 '<p>Only sign up through the link in TalkTalk&rsquo;s or Everymail&rsquo;s email to you, or by typing '
                 '<strong>everymail.com</strong> into your browser yourself.</p>'},
        {'eyebrow': '// KEEP IT OR MOVE IT?', 'h2': 'Pay to keep the address, or move to a free one?',
         'html': '<p><strong>Keeping it</strong> is the least work: same address, nothing to tell anyone. If your TalkTalk address '
                 'is on your bank, your doctor&rsquo;s surgery, your pension and every online account, a year&rsquo;s '
                 'subscription buys you time to change them calmly.</p>'
                 '<p><strong>Moving</strong> to a free Gmail or Outlook.com address costs nothing each year and isn&rsquo;t tied to '
                 'any broadband company, so it never happens to you again. If you own a web address of your own (a domain), paid '
                 'email such as Google Workspace or Microsoft 365 can use it. The work is copying your old emails across, then '
                 'changing the address on your important accounts and telling people.</p>'
                 '<p><strong>Our view:</strong> if you depend on the address, keep it for now <em>and</em> start moving. Set up the '
                 'new address, copy everything into it, and change your accounts over a few weeks: see '
                 '<a href="/change-your-email-address-everywhere/">changing your email address everywhere</a>. Once nothing '
                 'important arrives at the old address, you can stop paying.</p>' + _FLAGS + _GMAIL},
        {'eyebrow': '// EMAIL PROGRAM SETTINGS', 'h2': 'TalkTalk email settings for Outlook and other programs',
         'html': '<p>These are TalkTalk&rsquo;s published settings. Use IMAP, which keeps your email on the server as well as on '
                 'the computer, so a broken PC never takes your email with it.</p>'
                 '<ul><li><strong>Incoming (IMAP):</strong> mail.talktalk.net, port 993, SSL/TLS</li>'
                 '<li><strong>Outgoing (SMTP):</strong> smtp.talktalk.net, port 587, STARTTLS</li>'
                 '<li><strong>Username:</strong> your full TalkTalk email address</li></ul>'
                 '<p>TalkTalk no longer supports MD5 or &ldquo;Secure Password Authentication&rdquo; (SPA), so untick them if an '
                 'older program has them on. You can check your email in a browser at apps.talktalk.co.uk; once you&rsquo;re with '
                 'Everymail, its own help is at everymail.com/support.</p>'
                 '<p ' + _SRC + '>Source: <a href="' + _TT_SET + '"' + _EXT + '>TalkTalk&rsquo;s email settings page</a>, checked 3 November 2026.</p>'},
        {'eyebrow': '// WHERE TO GET HELP', 'h2': 'TalkTalk&rsquo;s Community forum has closed',
         'html': '<p>Many of these questions used to be answered on TalkTalk&rsquo;s Community forum. That forum has now closed: '
                 'TalkTalk points customers to My Account, live chat and the phone instead. Former customers on Everymail get '
                 'help from Everymail itself. If you&rsquo;d rather talk it through with someone local, ring us.</p>'},
        {'eyebrow': '// SPOT THE FAKES', 'h2': 'Watch for fake &ldquo;Everymail&rdquo; emails',
         'html': '<p>Whenever an email service starts charging, scammers copy the messages. Customers have reported fake ones. A '
                 'genuine notice never needs you to type your password into a link in an email.</p>'
                 '<ul><li>Don&rsquo;t click a link in a message asking you to pay or &ldquo;confirm&rdquo; your email.</li>'
                 '<li>Type everymail.com into your browser yourself, or sign in to your TalkTalk account the usual way.</li>'
                 '<li>If you&rsquo;re still a TalkTalk broadband customer, you shouldn&rsquo;t be asked to pay for email at all.</li></ul>'
                 '<p>Not sure about one? Our <a href="/spot-the-scam/">spot the scam</a> guide shows the signs, or forward it to us and we&rsquo;ll tell you.</p>'},
        {'eyebrow': '// WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL},
    ],
    'faqs': [
        {'q': 'Do I keep my TalkTalk email address with Everymail?', 'a': 'Yes. TalkTalk says your address, emails, contacts and folders stay the same when you subscribe, with nothing to move or change.'},
        {'q': 'How much does Everymail cost?', 'a': 'TalkTalk&rsquo;s FAQ doesn&rsquo;t state a price. Customers report &pound;5 a month or &pound;50 a year for up to five addresses, quoting TalkTalk&rsquo;s email and a staff reply. Check the price before you pay.'},
        {'q': 'I still have TalkTalk broadband. Do I need to pay for my email?', 'a': 'No. TalkTalk says the change doesn&rsquo;t affect current broadband customers for now, and its staff have said current customers should not subscribe to Everymail.'},
        {'q': 'I&rsquo;m leaving TalkTalk. How long do I have?', 'a': 'TalkTalk staff have said leavers need to sign up to Everymail within about 30 days of their broadband ending, as reported by customers. Follow the dates in the email TalkTalk sends you, and copy your emails somewhere safe before you switch.'},
        {'q': 'My TalkTalk email account was closed. Can I get my emails back?', 'a': 'TalkTalk says closed accounts are permanently deleted. The only copies left are any your email program downloaded onto your computer, so don&rsquo;t remove the account or reset the program until they are saved somewhere else.'},
        {'q': 'Does this include tiscali.co.uk and other old addresses?', 'a': 'TalkTalk&rsquo;s FAQ covers talktalk.net &ldquo;or associated TalkTalk&rdquo; addresses, and older TalkTalk-family names such as tiscali.co.uk, lineone.net and pipex.com run on the same email. Go by the email TalkTalk sends you.'},
        {'q': 'Is the Everymail email genuine or a scam?', 'a': 'The change is real, but fakes have been reported. Never pay or type your password through a link in an email: go to everymail.com yourself. If you still have TalkTalk broadband, you shouldn&rsquo;t be asked to pay for email.'},
        {'q': 'What are the TalkTalk email settings for Outlook?', 'a': 'Incoming IMAP: mail.talktalk.net, port 993, SSL/TLS. Outgoing SMTP: smtp.talktalk.net, port 587, STARTTLS. The username is your full email address, and MD5 and SPA must be off.'},
    ],
    'crossLinksHtml': '<p><strong>Related:</strong> <a href="/virgin-media-email-moving-to-junara/">Virgin Media email moving to Junara</a> &middot; '
                      '<a href="/madasafish-freenetname-email-greenby/">Madasafish, Freenetname and Globalnet email moving to Greenby</a> &middot; '
                      '<a href="/keep-bt-email-when-leaving-bt/">keeping your BT email when you leave BT</a> &middot; '
                      '<a href="/talktalk-email-not-working-android/">TalkTalk email not working on Android</a> &middot; '
                      '<a href="/change-your-email-address-everywhere/">change your email address everywhere</a></p>',
})

# ------------------------------------------------------------------ 2. Plusnet's older brands -> Greenby
_GB_FAQ = 'https://greenby.com/support/knowledgebase/faqs'
_GB_SET = 'https://greenby.com/support/knowledgebase/article/29'
_PN_THREAD = 'https://community.plus.net/t5/Email/Migration-of-freenetname-madasafish-to-Greenby/m-p/2063691'
NEW_PAGES.append({
    'slug': 'madasafish-freenetname-email-greenby',
    'title': 'Madasafish, Freenetname or Globalnet Email Moving to Greenby',
    'metaDesc': 'Madasafish, Freenetname, Globalnet and other old Plusnet email is moving to Greenby. What it costs, the problems people report, your own domain, and what to do.',
    'ogTitle': 'Madasafish, Freenetname or Globalnet email moving to Greenby: what to do',
    'crumbName': 'Madasafish, Freenetname and Globalnet email',
    'eyebrow': '// AN OLD PLUSNET-FAMILY ADDRESS?',
    'h1': 'Madasafish, Freenetname or Globalnet email <em class="grad grad--cyan">moving to Greenby</em>',
    'lede': 'Plusnet is handing its older email brands to Greenby, the company that already took over Plusnet&rsquo;s own email. '
            'If your address ends in madasafish.com, freenetname.co.uk, globalnet.co.uk or another old Plusnet-family name, or '
            'you have your own web address hosted with one of them, here&rsquo;s what changes, what it costs, the problems '
            'people are reporting, and what to do.',
    'chips': ['What it costs', 'Problems after the move', 'Your own domain'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Problems after the move', '#s3'],
    'ctaHead': 'Email stopped working after the move?',
    'ctaSub': 'With your permission we connect to your Windows PC, get your Greenby email working in your email program, and '
              'help with your own domain if you have one. We tell you the price before we start. Call 01202 775566.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Who', 'Older Plusnet-family email: Madasafish, Freenetname, Globalnet, and earlier Force9, Free-Online and Metronet.'),
        ('Run by', 'Greenby, from Enix Ltd: the same company that took over Plusnet&rsquo;s own email.'),
        ('Cost', 'Free for 2 years with Plusnet broadband; otherwise 30 days free, then &pound;15 a year for all your mailboxes.'),
        ('Your own domain', 'Renewed by Greenby: &pound;7 a year for .co.uk, &pound;12 for .com, after any free period.'),
        ('If you don&rsquo;t pay', 'Greenby keeps receiving and storing your email for 2 years, so you can still pay later.'),
        ('Notice', 'Greenby says notices go out 60 and 30 days before: often only to the account holder.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHAT&rsquo;S HAPPENING', 'h2': 'What&rsquo;s happening to your email',
         'html': '<p>Plusnet no longer runs email itself. Its own addresses moved to <strong>Greenby</strong>, run by Enix Ltd, and '
                 'its older brands are following: Plusnet said Metronet, Force9 and Free-Online would go first, and Madasafish, '
                 'Freenetname and Globalnet addresses are moving now. Other old names from the same family may be included: go by '
                 'the notice you receive.</p>'
                 '<ul>'
                 '<li>Greenby says you get notice <strong>60 and 30 days</strong> before the move, and you can opt out before the '
                 'day, using the instructions in Plusnet&rsquo;s email.</li>'
                 '<li>The notice goes to the person who holds the account. If you only <em>use</em> one of the mailboxes, ask the '
                 'account holder whether they&rsquo;ve had it: customers say they heard about the move second-hand.</li>'
                 '<li>Your mailbox grows from 1 GB to 2 GB, and your address stays the same.</li>'
                 '</ul>'},
        {'eyebrow': '/02 &mdash; THE COST', 'h2': 'What Greenby costs',
         'html': '<ul>'
                 '<li><strong>Still with Plusnet broadband:</strong> free for 2 years.</li>'
                 '<li><strong>Everyone else:</strong> free for 30 days after the move, then <strong>&pound;15 a year</strong>, '
                 'covering all your existing mailboxes and any new ones.</li>'
                 '<li><strong>Your own domain</strong> (for example yourname.co.uk): <strong>&pound;7 a year</strong> for .co.uk, '
                 '.org.uk or .uk, and <strong>&pound;12</strong> for .com, .net or .org. Free domains are honoured for 2 years.</li>'
                 '<li><strong>If you don&rsquo;t pay:</strong> Greenby says it keeps receiving and storing your email for 2 years, '
                 'and you can pay during that time to get full access back.</li>'
                 '</ul>'
                 '<p ' + _SRC + '>Source: <a href="' + _GB_FAQ + '"' + _EXT + '>Greenby&rsquo;s FAQs</a>, checked 3 November 2026.</p>'},
        {'eyebrow': '/03 &mdash; PROBLEMS AFTER THE MOVE', 'h2': 'Problems people are reporting, and what to do',
         'html': '<p>These come from customers on Plusnet&rsquo;s forum in late October 2026, not from Plusnet or Greenby, so they '
                 'may already be fixed:</p>'
                 '<ul>'
                 '<li><strong>Email on your own domain stopped,</strong> and the website on the old webspace went with it.</li>'
                 '<li><strong>The old address isn&rsquo;t in the Greenby account,</strong> and email sent to it bounces back with '
                 '&ldquo;550 user doesn&rsquo;t exist&rdquo;.</li>'
                 '<li><strong>Folders missing</strong> in Outlook or another program, though they&rsquo;re in webmail.</li>'
                 '<li><strong>Can sign in to webmail but can&rsquo;t send</strong> from the email program.</li>'
                 '</ul>'
                 '<p><strong>What to do:</strong></p>'
                 '<ol>'
                 '<li><strong>Check webmail first.</strong> Sign in at greenby.com: if your email is there, the problem is your '
                 'email program, not your mailbox.</li>'
                 '<li><strong>Missing folders:</strong> in your email program, subscribe to the folders again (Outlook: right-click '
                 'the account, IMAP Folders, Query, Subscribe).</li>'
                 '<li><strong>Can&rsquo;t send:</strong> set the account up again using <a href="' + _GB_SET + '"' + _EXT + '>Greenby&rsquo;s '
                 'own settings guide</a>; our <a href="/greenby-email-login/">Greenby login guide</a> explains the choices.</li>'
                 '<li><strong>Address missing or mail bouncing:</strong> raise it with Greenby support, quoting the address and the '
                 'bounce message, before you accept a different address.</li>'
                 '</ol>'
                 '<p ' + _SRC + '>Customer reports: <a href="' + _PN_THREAD + '"' + _EXT + '>Plusnet Community</a>, late October 2026.</p>'},
        {'eyebrow': '/04 &mdash; YOUR OWN DOMAIN', 'h2': 'If you have your own web address',
         'html': '<p>Freenetname and Madasafish were popular for personal web addresses, such as smith-family.co.uk, with email '
                 'and sometimes a website on it. That&rsquo;s more than a mailbox, so decide deliberately:</p>'
                 '<ul>'
                 '<li><strong>Keep it all at Greenby:</strong> pay the yearly charge and the domain renewal, and check both the email '
                 'and the website work after the move.</li>'
                 '<li><strong>Move the domain somewhere else:</strong> transfer it to a domain company of your choice, then point it '
                 'at paid email such as Google Workspace or Microsoft 365, and the website at new hosting. Your address stays the '
                 'same; only the company behind it changes.</li>'
                 '<li><strong>Before anything:</strong> save a copy of your emails, your contacts and the website&rsquo;s files.</li>'
                 '</ul>'
                 '<p>Moving a domain means changing its settings (its &ldquo;DNS&rdquo;) correctly, or email stops arriving. That&rsquo;s '
                 'work we do: ring us before you start.</p>'},
        {'eyebrow': '/05 &mdash; KEEP IT OR MOVE IT?', 'h2': 'Keep the address, or move to one you own?',
         'html': '<p><strong>Keeping it</strong> at &pound;15 a year is cheap and means nothing changes for the people who write to '
                 'you. <strong>Moving</strong> to a free Gmail or Outlook.com address costs nothing and is never tied to a '
                 'broadband company again, but you change your address everywhere. Moving a Plusnet-family address is the same job '
                 'as <a href="/move-plusnet-email-to-gmail/">moving Plusnet email to Gmail</a>.</p>' + _FLAGS + _GMAIL},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL},
    ],
    'howToName': 'What to do when your Madasafish, Freenetname or Globalnet email moves to Greenby',
    'howToSteps': [
        {'name': 'Check who got the notice', 'text': 'Greenby sends notice 60 and 30 days before the move to the account holder: ask them if you only use a mailbox.'},
        {'name': 'Save a copy first', 'text': 'Copy your emails, contacts and any website files somewhere safe before the move.'},
        {'name': 'Check webmail after the move', 'text': 'Sign in at greenby.com: if your email is there, any problem is in your email program.'},
        {'name': 'Fix your email program', 'text': 'Set the account up again with Greenby&rsquo;s own settings guide, and subscribe to your folders again.'},
        {'name': 'Decide about your own domain', 'text': 'Keep it at Greenby, or transfer it and set up new email and hosting. Either way, check email still arrives.'},
    ],
    'faqs': [
        {'q': 'Is Madasafish email closing?', 'a': 'It&rsquo;s moving to Greenby, the company that took over Plusnet&rsquo;s own email. Your address stays the same; keeping it costs &pound;15 a year after 30 days free, unless you have Plusnet broadband (free for 2 years).'},
        {'q': 'Is Freenetname email still working?', 'a': 'Freenetname addresses and domains are moving to Greenby. Some customers reported email and websites on their own domains stopping after the move in late October 2026; check webmail at greenby.com and contact Greenby support if yours has stopped.'},
        {'q': 'What happened to my Globalnet email address?', 'a': 'Globalnet addresses are moving to Greenby too. One customer reported the old address missing from the Greenby account with mail bouncing; raise it with Greenby support before accepting a different address.'},
        {'q': 'How much does Greenby cost?', 'a': 'Free for 2 years if you have Plusnet broadband; otherwise free for 30 days, then &pound;15 a year for all your mailboxes. Domains are &pound;7 a year (.co.uk) or &pound;12 (.com).'},
        {'q': 'What if I don&rsquo;t pay Greenby?', 'a': 'Greenby says it keeps receiving and storing your email for 2 years, and you can pay during that time to get full access back.'},
        {'q': 'Can I keep my own domain name?', 'a': 'Yes. Keep it at Greenby and pay the renewal, or transfer it to another company and point it at new email and hosting. Save your emails and website files first.'},
        {'q': 'Can you move my email to Gmail?', 'a': 'Yes: your emails and contacts move to a new Gmail address; the old address itself can&rsquo;t become a Gmail address. We tell you the price before we start.'},
    ],
    'crossLinksHtml': '<p><strong>Related:</strong> <a href="/greenby-email-login/">Plusnet email and Greenby: logging in</a> &middot; '
                      '<a href="/move-plusnet-email-to-gmail/">moving Plusnet email to Gmail</a> &middot; '
                      '<a href="/plusnet-email-wont-add-to-new-outlook/">Plusnet email and the new Outlook</a> &middot; '
                      '<a href="/talktalk-email-moving-to-everymail/">TalkTalk email moving to Everymail</a> &middot; '
                      '<a href="/change-your-email-address-everywhere/">change your email address everywhere</a></p>',
})

# ------------------------------------------------------------------ 3. BT: keeping your email when you leave
_BT_LEAVE = 'https://www.bt.com/help/email/what-happens-to-my-email-address-when-my-bt-broadband-service-st'
_BT_PROD = 'https://www.bt.com/help/email/bt-email-products'
NEW_PAGES.append({
    'slug': 'keep-bt-email-when-leaving-bt',
    'title': 'Leaving BT? How to Keep Your BTinternet Email Address',
    'metaDesc': 'Leaving BT broadband? Your btinternet email can go to free Basic (browser only), Premium at &pound;7.50 a month, or a family member&rsquo;s BT account. What to choose.',
    'ogTitle': 'Leaving BT? How to keep your btinternet email address',
    'crumbName': 'Keep your BT email when you leave',
    'eyebrow': '// LEAVING BT BROADBAND?',
    'h1': 'Leaving BT? How to <em class="grad grad--cyan">keep your BT email</em>',
    'lede': 'Your btinternet.com address doesn&rsquo;t vanish when you leave BT broadband, but it changes. Unless you choose '
            'otherwise, BT moves it to free Basic email, which works only in a web browser: not on your phone, not in Outlook. '
            'Here are your four choices, what each costs, and how to pick before you switch.',
    'chips': ['Basic, Premium or linked', 'Decide before you switch', 'Phones and Outlook'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Your four choices', '#s1'],
    'ctaHead': 'Leaving BT and not sure what to do with your email?',
    'ctaSub': 'Ring us. We&rsquo;ll talk through keeping it or moving it, then do the work with you on a Windows PC, remotely. '
              'We tell you the price before we start.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Do nothing', 'BT moves you to free Basic email when your broadband ends.'),
        ('Basic (free)', 'One address, at bt.com in a web browser only: no email apps, phones or Outlook.'),
        ('Premium', '&pound;7.50 a month by direct debit: same features, apps work, up to 11 addresses.'),
        ('Linked', 'Link the address to a friend&rsquo;s or family member&rsquo;s BT Broadband: BT says this is free.'),
        ('Time to upgrade', 'BT says you can choose Premium for 60 days after you leave.'),
        ('Business?', 'BT Business email (btconnect.com) is a separate product with its own rules.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; YOUR CHOICES', 'h2': 'Your four choices when BT broadband ends',
         'html': '<ol>'
                 '<li><strong>Basic email (free).</strong> BT says it has &ldquo;more basic features&rdquo;: just one address, '
                 'used <strong>at bt.com in a web browser only</strong>. BT says you can&rsquo;t use it with an email program or on '
                 'your devices, and you need to log in regularly to keep it active.</li>'
                 '<li><strong>Premium email, &pound;7.50 a month</strong> by direct debit. Everything keeps working as now, including '
                 'phone and Outlook, with up to 11 addresses. You need to live in the UK and have a UK bank account.</li>'
                 '<li><strong>Link it to someone else&rsquo;s BT Broadband.</strong> If a friend or family member has BT Broadband, '
                 'your address can be linked to their account and keep the same features: BT says this is free.</li>'
                 '<li><strong>Close it.</strong> BT says that if you don&rsquo;t upgrade, after 60 days the addresses on your BT ID are '
                 'deleted, with your emails.</li>'
                 '</ol>'
                 '<p>If you don&rsquo;t choose, BT says it will move you to Basic, and you have <strong>60 days</strong> after leaving '
                 'to upgrade to Premium.</p>'
                 '<p ' + _SRC + '>Sources: BT, <a href="' + _BT_LEAVE + '"' + _EXT + '>what happens to your email when your broadband stops</a> '
                 'and <a href="' + _BT_PROD + '"' + _EXT + '>BT email products</a>, checked 3 November 2026.</p>'},
        {'eyebrow': '/02 &mdash; THE CATCH', 'h2': 'The catch with Basic: no phone, no Outlook',
         'html': '<p>Most people read their BT email on a phone, a tablet or Outlook. On Basic, <strong>none of those work</strong>: '
                 'only bt.com in a web browser. So on the day your broadband ends, the email app on your phone stops getting new '
                 'mail, and it can look as though your email has broken.</p>'
                 '<p>BT&rsquo;s two help pages differ slightly: one says you&rsquo;ll be moved to Basic if you don&rsquo;t choose, the '
                 'other says Basic must be ordered when you cancel and you can&rsquo;t switch to it directly later. <strong>So choose '
                 'out loud when you cancel</strong>, and write down what BT confirms.</p>'},
        {'eyebrow': '/03 &mdash; HOW TO CHOOSE', 'h2': 'Which should you choose?',
         'html': '<ul>'
                 '<li><strong>You use the address everywhere and read it on your phone:</strong> Premium, or link it to a family '
                 'member&rsquo;s BT Broadband if you can. Premium is &pound;90 a year.</li>'
                 '<li><strong>You hardly use it, but some accounts still do:</strong> Basic, and log in at bt.com regularly while you '
                 'move those accounts to another address.</li>'
                 '<li><strong>You want to be free of it:</strong> move to a free Gmail or Outlook.com address (or paid email on your own '
                 'domain), copy your emails and contacts across before you switch, then change the address on your accounts: see '
                 '<a href="/change-your-email-address-everywhere/">changing your email address everywhere</a>.</li>'
                 '</ul>' + _FLAGS + _GMAIL},
        {'eyebrow': '/04 &mdash; HOW TO DO IT', 'h2': 'How to order Premium or Basic',
         'html': '<ol>'
                 '<li>Sign in to <strong>My BT</strong>.</li>'
                 '<li>Choose <strong>Your products</strong>, then <strong>Email</strong>, then <strong>Manage</strong>.</li>'
                 '<li>Pick <strong>Move to Premium email</strong> or <strong>Upgrade your email service</strong>, whichever you see.</li>'
                 '<li>BT says you&rsquo;ll get an email within 24 hours to confirm.</li>'
                 '</ol>'
                 '<p>Do it <strong>before your broadband ends</strong>, so your phone and Outlook never stop.</p>'},
        {'eyebrow': '/05 &mdash; SETTINGS', 'h2': 'BT email settings for Premium',
         'html': '<p>On Premium (or while you still have BT broadband), BT&rsquo;s published settings are: incoming '
                 '<strong>mail.btinternet.com</strong>, IMAP port 993 (POP 995), and outgoing <strong>mail.btinternet.com</strong>, '
                 'port 465, all with SSL. The username is your full email address and the password is your email password: BT '
                 'doesn&rsquo;t use app passwords. Trouble adding it to the new Outlook? See '
                 '<a href="/btinternet-email-wont-add-to-new-outlook/">BTinternet email won&rsquo;t add to the new Outlook</a>.</p>'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL},
    ],
    'howToName': 'How to keep your BT email when you leave BT broadband',
    'howToSteps': [
        {'name': 'Decide before you switch', 'text': 'Choose Basic (free, browser only), Premium (&pound;7.50 a month) or linking to a family member&rsquo;s BT Broadband.'},
        {'name': 'Order it in My BT', 'text': 'My BT, Your products, Email, Manage: Move to Premium email or Upgrade your email service.'},
        {'name': 'Save a copy', 'text': 'Copy your emails and contacts somewhere safe before your broadband ends.'},
        {'name': 'Check your phone and Outlook', 'text': 'On Basic they stop working; on Premium they carry on with the same settings.'},
        {'name': 'Move your accounts if leaving it', 'text': 'Change the address on your bank, energy, GP and online accounts before you stop using it.'},
    ],
    'faqs': [
        {'q': 'Can I keep my BT email address if I leave BT?', 'a': 'Yes. BT moves it to free Basic email unless you choose otherwise; you can pay &pound;7.50 a month for Premium, or link it to a friend&rsquo;s or family member&rsquo;s BT Broadband, which BT says is free.'},
        {'q': 'Why has my BT email stopped working on my phone?', 'a': 'If your BT broadband has ended, you&rsquo;re probably on Basic email, which BT says works only at bt.com in a web browser, not in email apps. Premium brings your phone and Outlook back.'},
        {'q': 'How much is BT Premium email?', 'a': '&pound;7.50 a month by direct debit, for up to 11 addresses, according to BT&rsquo;s email products page (checked 3 November 2026).'},
        {'q': 'How long do I have to upgrade to Premium?', 'a': 'BT says you can choose Premium for 60 days after you leave BT Broadband.'},
        {'q': 'Does BT close Basic email if I don&rsquo;t use it?', 'a': 'BT says you need to log in regularly to keep Basic active, so sign in at bt.com from time to time.'},
        {'q': 'Does this apply to btopenworld.com and talk21.com addresses?', 'a': 'They are BT email addresses, so BT&rsquo;s rules apply; check the confirmation BT sends you when you leave.'},
        {'q': 'Is BT closing its email service?', 'a': 'No: unlike Virgin Media and Plusnet, BT hasn&rsquo;t announced a closure. The changes apply when your BT broadband ends.'},
    ],
    'crossLinksHtml': '<p><strong>Related:</strong> <a href="/btinternet-email-wont-add-to-new-outlook/">BTinternet email and the new Outlook</a> &middot; '
                      '<a href="/cant-send-btinternet-email-new-outlook/">can&rsquo;t send BTinternet email from the new Outlook</a> &middot; '
                      '<a href="/talktalk-email-moving-to-everymail/">TalkTalk email moving to Everymail</a> &middot; '
                      '<a href="/virgin-media-email-moving-to-junara/">Virgin Media email moving to Junara</a> &middot; '
                      '<a href="/change-your-email-address-everywhere/">change your email address everywhere</a></p>',
})

# ------------------------------------------------------------------ 4. An old provider's email has closed
_NASSTAR = 'https://www.nasstar.com/domain-decommissioning-faqs'
_VGE = 'https://www.verygoodemail.com/article/f2s-nildram-gotadsl-mrsite/'
_EE2017 = 'https://www.ispreview.co.uk/index.php/2017/02/orange-ee-scrap-free-uk-email-service-mobile-broadband-users.html'
NEW_PAGES.append({
    'slug': 'old-internet-provider-email-closed',
    'title': 'Old Internet Provider Email Closed? What You Can Still Do',
    'metaDesc': 'Your old internet provider closed its email (Eclipse, Nildram, F2S, Orange, Freeserve, TalkTalk and others)? Where copies may survive, accounts to fix, and a new address.',
    'ogTitle': 'Old internet provider email closed? What you can still do',
    'crumbName': 'Old provider email closed',
    'eyebrow': '// AN OLD EMAIL ADDRESS GONE?',
    'h1': 'Old internet provider email closed? <em class="grad grad--cyan">What you can still do</em>',
    'lede': 'Internet providers have been closing their email for years, and in 2026 more of them did. Once an account is '
            'deleted, its emails can&rsquo;t be brought back from the provider. But your own computer may still hold copies, '
            'your important accounts can be rescued, and a new address can be set up properly. Here&rsquo;s what to do.',
    'chips': ['Copies on your own PC', 'Rescue your accounts', 'A new address'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Look for copies first', '#s2'],
    'ctaHead': 'Lost an old email address?',
    'ctaSub': 'With your permission we connect to your Windows PC, save any emails it still holds, set up a new address and '
              'help you move your important accounts. We tell you the price before we start. Call 01202 775566.',
    'schemaKind': 'howto',
    'sections': [
        {'eyebrow': '/01 &mdash; WHICH CLOSURES', 'h2': 'Recent and older closures',
         'html': '<ul>'
                 '<li><strong>Eclipse</strong> (eclipse.co.uk), with mistral.co.uk, ftech.co.uk, webleicester.co.uk, olcs.net, '
                 'interalpha.co.uk and innotts.co.uk: Nasstar ended these shared-domain email and web services on '
                 '<strong>16 January 2026</strong>. The addresses couldn&rsquo;t be kept or transferred.</li>'
                 '<li><strong>Freedom2Surf (F2S), Nildram, Gotadsl and Mr Site:</strong> their email came from The Very Good Email '
                 'Company. Addresses not transferred when the brands closed are, in its words, &ldquo;gone and can&rsquo;t be '
                 'resurrected&rdquo;.</li>'
                 '<li><strong>TalkTalk</strong> former customers who didn&rsquo;t subscribe to Everymail: closed on <strong>7 July '
                 '2026</strong> and deleted. See <a href="/talktalk-email-moving-to-everymail/">TalkTalk email and Everymail</a>.</li>'
                 '<li><strong>Manx Telecom</strong> (manx.net, isleofman.com, isleofman.org): unpaid accounts deleted on '
                 '<strong>21 April 2026</strong>.</li>'
                 '<li><strong>Orange, Wanadoo and Freeserve</strong> (EE): closed on <strong>31 May 2017</strong>.</li>'
                 '</ul>'
                 '<p>Still open but changing: <a href="/virgin-media-email-moving-to-junara/">Virgin Media</a>, '
                 '<a href="/madasafish-freenetname-email-greenby/">Madasafish, Freenetname and Globalnet</a> and '
                 '<a href="/keep-bt-email-when-leaving-bt/">BT when you leave</a>. If yours is one of those, act before the deadline.</p>'
                 '<p ' + _SRC + '>Sources: <a href="' + _NASSTAR + '"' + _EXT + '>Nasstar</a>, <a href="' + _VGE + '"' + _EXT + '>The Very Good '
                 'Email Company</a>, <a href="' + _EE2017 + '"' + _EXT + '>ISPreview (EE, 2017)</a>, TalkTalk and Manx Telecom; checked 3 November 2026.</p>'},
        {'eyebrow': '/02 &mdash; LOOK FOR COPIES', 'h2': 'Look for copies on your own computer first',
         'html': '<p>If your email program downloaded your mail (Outlook, Windows Live Mail, Thunderbird, or anything set up with '
                 '&ldquo;POP&rdquo;), the emails are still on that computer, even though the account has closed.</p>'
                 '<ol>'
                 '<li><strong>Don&rsquo;t remove the old account</strong> from the program, and don&rsquo;t reset or uninstall it.</li>'
                 '<li><strong>Save a copy.</strong> In classic Outlook: File, Open &amp; Export, Import/Export, Export to a file, '
                 'Outlook Data File (.pst). Other programs have their own export, or we can copy the files for you.</li>'
                 '<li><strong>Check old computers too,</strong> and backups: an old laptop in a drawer may hold years of email. '
                 'A phone usually only holds recent ones.</li>'
                 '</ol>'
                 '<p>What nobody can do, us included, is recover email the provider has already deleted from its own servers.</p>'},
        {'eyebrow': '/03 &mdash; RESCUE YOUR ACCOUNTS', 'h2': 'Rescue the accounts that used the old address',
         'html': '<p>The bigger risk is often not the old emails but the accounts that use the old address to sign in or reset a '
                 'password: bank, energy, GP, council, shopping, social media, Apple or Microsoft accounts.</p>'
                 '<ol>'
                 '<li>Make a list: search any saved emails or your password manager for the old address.</li>'
                 '<li>For each account you can still sign in to, <strong>change the email address now</strong>, while you&rsquo;re '
                 'signed in.</li>'
                 '<li>For an account you&rsquo;re locked out of, use its &ldquo;can&rsquo;t access my email&rdquo; route or contact '
                 'its support: a password reset sent to a closed address will never arrive.</li>'
                 '</ol>'
                 '<p>Our <a href="/change-your-email-address-everywhere/">change your email address everywhere</a> guide has the list.</p>'},
        {'eyebrow': '/04 &mdash; A NEW ADDRESS', 'h2': 'Set up a new address that won&rsquo;t happen to you again',
         'html': '<ul>'
                 '<li><strong>Free:</strong> a personal Gmail or Outlook.com address, not tied to any broadband company.</li>'
                 '<li><strong>Your own domain</strong> (for example yourname.co.uk): you keep the address whichever company runs the '
                 'email behind it, using paid email such as Google Workspace or Microsoft 365. Eclipse customers who owned their '
                 'domain could transfer it before the closure; if you still own yours, it can be pointed at new email.</li>'
                 '</ul>'
                 '<p>Then import any emails you saved (step 2) into the new account, so your old mail sits alongside the new.</p>'},
        {'eyebrow': '/05 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL},
    ],
    'howToName': 'What to do when your old internet provider closes your email',
    'howToSteps': [
        {'name': 'Keep the old account in your email program', 'text': 'Don&rsquo;t remove it or reset the program: downloaded emails may still be there.'},
        {'name': 'Export what is there', 'text': 'In classic Outlook use Export to a .pst file; other programs have their own export.'},
        {'name': 'List the accounts that use the address', 'text': 'Bank, energy, GP, council, shopping, social media and sign-in accounts.'},
        {'name': 'Change the address on each account', 'text': 'While you can still sign in; use the account&rsquo;s recovery route if you are locked out.'},
        {'name': 'Set up a new address', 'text': 'A free Gmail or Outlook.com address, or paid email on your own domain, then import the saved emails.'},
    ],
    'faqs': [
        {'q': 'Can I get emails back after my provider closed my account?', 'a': 'Not from the provider: once it has deleted the account, the emails are gone from its servers. Copies may still be on your own computer if your email program downloaded them, so don&rsquo;t remove the account from the program.'},
        {'q': 'Can I keep my eclipse.co.uk email address?', 'a': 'No. Nasstar ended the eclipse.co.uk email service on 16 January 2026 and said the shared addresses couldn&rsquo;t be kept or transferred.'},
        {'q': 'What happened to Nildram and Freedom2Surf email?', 'a': 'Their email came from The Very Good Email Company. Addresses that weren&rsquo;t transferred when the brands closed can&rsquo;t be brought back, it says.'},
        {'q': 'Is my Orange, Wanadoo or Freeserve email still working?', 'a': 'No: EE closed those addresses on 31 May 2017.'},
        {'q': 'Can my old email be forwarded to a new address?', 'a': 'Only while the old account still exists and allows forwarding. Once it has closed, nothing can be forwarded.'},
        {'q': 'Can you help me set up a new address?', 'a': 'Yes. We save what your computer still holds, set up the new address, import your old emails and help you change your important accounts. We tell you the price before we start.'},
    ],
    'crossLinksHtml': '<p><strong>Related:</strong> <a href="/change-your-email-address-everywhere/">change your email address everywhere</a> &middot; '
                      '<a href="/email-migration/">moving email to a new provider</a> &middot; '
                      '<a href="/talktalk-email-moving-to-everymail/">TalkTalk email and Everymail</a> &middot; '
                      '<a href="/madasafish-freenetname-email-greenby/">Madasafish, Freenetname and Globalnet email</a> &middot; '
                      '<a href="/data-recovery/">data recovery</a></p>',
})
