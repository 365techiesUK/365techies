# -*- coding: utf-8 -*-
"""Two help guides for the free Virgin email tools (launch branch virgin-launch, 29 Sep 2026), rendered by
build_extra.build_new_page() with the short task header (virgin_launch.guide_task_head).

Every instruction was checked against the provider's own page on 29 Sep 2026, and the page says so where it matters:
  Google  support.google.com/accounts/answer/185833 (Sign in with app passwords: needs 2-Step Verification; 16-digit
          passcode; not available with security-key-only 2SV, work/school/organisation accounts or Advanced Protection;
          revoked when the Google password changes; myaccount.google.com/apppasswords) and answer/185839 (Turn on 2-Step
          Verification: Google Account > Security & sign-in > "How you sign in to Google" > Turn on 2-Step Verification)
  GOV.UK  gov.uk/using-your-gov-uk-one-login (change your sign-in details incl. email at home.account.gov.uk),
          gov.uk/driver-vehicles-account (vehicle tax reminders), gov.uk/vehicle-tax-direct-debit/change-address-name
          ("call DVLA if you've got a new email address")
  NHS     help.login.nhs.uk/manage/emailaddresses (Login and security settings > Change for email; lost access to the
          email = a new NHS login)
  Virgin  virginmedia.com/help/email-1/email-service-change (auto-forwarding carries on while suspended; no sign-up links
          or requests for personal/payment details in Virgin's emails; 45 + 120 days)
  Junara  junara.com/virginmedia/ (pay only in My Account, never by phone or unexpected email links)
  NCSC    report@phishing.gov.uk; Report Fraud (reportfraud.police.uk, 0300 123 2040), Scotland 101
"""
from virgin_launch import GAPP_SLUG, ADDR_SLUG, VIRGIN_TOOL_SLUG

_SRC = 'style="font-size:.85rem;color:var(--muted)"'
_EXT = 'rel="noopener" target="_blank"'

VIRGIN_GUIDE_PAGES = []

# ------------------------------------------------------------------ Google app password
VIRGIN_GUIDE_PAGES.append({
 'slug': GAPP_SLUG,
 'title': 'How to Make a Google App Password | 365 Techies',
 'metaDesc': 'Make a Google app password for Gmail: switch on 2-Step Verification, then create it. And what to do if Google says app passwords are not available.',
 'ogTitle': 'How to make a Google app password, step by step',
 'crumbName': 'Make a Google App Password',
 'eyebrow': '// GOOGLE ACCOUNT &middot; STEP BY STEP',
 'h1': 'How to make a <em class="grad grad--cyan">Google app password</em>',
 'lede': 'A 16-character code that lets a program such as our free <a href="/' + VIRGIN_TOOL_SLUG + '/">Virgin email mover</a> put email into your Gmail. Switch on 2-Step Verification first. About five minutes.',
 'chips': ['Free guide', 'Checked against Google&rsquo;s own help', 'Plain English'],
 'primaryCta': ['Call 01202 775566', 'tel:+441202775566'],
 'secondaryCta': ['The free Virgin email tools', '/' + VIRGIN_TOOL_SLUG + '/'],
 'ctaHead': 'Stuck on a step?',
 'ctaSub': 'Ring us and we&rsquo;ll go through it with you on the phone. Moving Virgin email and would rather we did the lot? It&rsquo;s &pound;60 per email address, agreed before we start, with a full service of your PC and a written report included.',
 'sections': [
  {'eyebrow': '/01 &mdash; IN FIVE STEPS', 'h2': 'The short version',
   'html': '<ol>'
           '<li><strong>Sign in to the Gmail account you want to use</strong>, on a computer, and open your Google Account at <a href="https://myaccount.google.com/" ' + _EXT + '>myaccount.google.com</a>.</li>'
           '<li><strong>Switch on 2-Step Verification</strong> if it isn&rsquo;t on already: choose <strong>Security &amp; sign-in</strong>, then under &lsquo;How you sign in to Google&rsquo; choose <strong>Turn on 2-Step Verification</strong> and follow the steps.</li>'
           '<li><strong>Open the app passwords page</strong> at <a href="https://myaccount.google.com/apppasswords" ' + _EXT + '>myaccount.google.com/<wbr>apppasswords</a>, or type &lsquo;App passwords&rsquo; into the search box at the top of your Google Account. Sign in again if Google asks.</li>'
           '<li><strong>Type a name you will recognise</strong>, such as <em>365 PC Manager</em>, and press <strong>Create</strong>.</li>'
           '<li><strong>Copy the 16-character code</strong> Google shows you into the program that asked for it, before you close the box. In 365 PC Manager it goes in the Google app password box, under your Gmail address.</li>'
           '</ol>'
           '<p>That&rsquo;s it. Below, each step in more detail, what to do if Google says app passwords aren&rsquo;t available for your account, and how to delete the code when the job is done.</p>'},
  {'eyebrow': '/02 &mdash; WHAT IT IS', 'h2': 'What a Google app password is, and when you need one',
   'html': '<p>An app password is a <strong>16-character code</strong> that lets a program sign in to your Google Account without your normal password. It only exists once 2-Step Verification is switched on, and each one is for one program.</p>'
           '<p>Most of the time you don&rsquo;t need one: Google recommends &lsquo;Sign in with Google&rsquo; wherever a program offers it. You need one when a program connects to Gmail the traditional way, called IMAP, and can&rsquo;t show Google&rsquo;s own sign-in page. Our free <a href="/' + VIRGIN_TOOL_SLUG + '/">Virgin email tools in 365 PC Manager</a> are one example: the app password is what lets the app put your old Virgin emails into your Gmail.</p>'
           '<p>This is a password for your <strong>Gmail</strong>. It has nothing to do with a Virgin Media app password, which Virgin makes in the My Virgin Media app and which many people can&rsquo;t get &mdash; our free tools don&rsquo;t need that one at all.</p>'},
  {'eyebrow': '/03 &mdash; STEP 1', 'h2': 'Step 1: switch on 2-Step Verification',
   'html': '<p>2-Step Verification means signing in to Google needs something you have, usually your phone, as well as your password. Google won&rsquo;t make app passwords without it, and it is worth having anyway: it stops most people who have stolen a password from getting in.</p>'
           '<ol><li>Open your Google Account at <a href="https://myaccount.google.com/" ' + _EXT + '>myaccount.google.com</a>. Check the picture or initial at the top right is the Gmail account you mean to use: many people have two.</li>'
           '<li>Choose <strong>Security &amp; sign-in</strong>.</li>'
           '<li>Under &lsquo;How you sign in to Google&rsquo;, choose <strong>Turn on 2-Step Verification</strong>.</li>'
           '<li>Follow the steps on screen.</li></ol>'
           '<p>Google offers several second steps: a prompt on your phone (an Android phone, or an iPhone with the Gmail or Google app), a code by text message or phone call, an authenticator app, a passkey, or a security key. For most people a <strong>prompt on the phone, with a text message as the back-up</strong>, is the simplest. Google also gives you <strong>backup codes</strong>: print them or write them down, and keep them safe at home in case you lose your phone.</p>'
           '<p>Menu names move a little over time. If a label doesn&rsquo;t match exactly, look for the nearest wording, or use the search box at the top of your Google Account.</p>'
           '<p ' + _SRC + '>Source: Google Account Help, <a href="https://support.google.com/accounts/answer/185839" ' + _EXT + '>Turn on 2-Step Verification</a>, read 29 September 2026.</p>'},
  {'eyebrow': '/04 &mdash; STEP 2', 'h2': 'Step 2: make the app password',
   'html': '<ol><li>Go to <a href="https://myaccount.google.com/apppasswords" ' + _EXT + '>myaccount.google.com/<wbr>apppasswords</a>. Many accounts no longer show &lsquo;App passwords&rsquo; in the Security menu, so this link, or typing &lsquo;App passwords&rsquo; into the search box at the top of your Google Account, is the reliable way in.</li>'
           '<li>Sign in again if Google asks. It checks it is really you before it shows this page.</li>'
           '<li>Type a name you will recognise later, such as <em>365 PC Manager</em> or <em>Virgin email move</em>, and press <strong>Create</strong>.</li>'
           '<li>Google shows the 16-character app password in a box. <strong>Copy it straight into the program that needs it</strong> before you close the box. If you lose it, don&rsquo;t worry: you can make a new one at any time.</li></ol>'
           '<p>In 365 PC Manager it goes in when you choose <strong>Move it to Gmail myself</strong>: your full Gmail address, then the app password. The app keeps it encrypted on your PC, and it never comes to us.</p>'
           '<p ' + _SRC + '>Source: Google Account Help, <a href="https://support.google.com/accounts/answer/185833" ' + _EXT + '>Sign in with app passwords</a>, read 29 September 2026.</p>'},
  {'eyebrow': '/05 &mdash; NOT AVAILABLE?', 'h2': 'Google says app passwords aren&rsquo;t available? Here&rsquo;s why',
   'html': '<p>Google lists three reasons the option doesn&rsquo;t appear, and in practice there are two more:</p>'
           '<ul><li><strong>2-Step Verification isn&rsquo;t on</strong>, or you have only just switched it on. Check under Security &amp; sign-in that it says it is on, then sign out, sign back in and try the link again.</li>'
           '<li><strong>Your only second step is a security key.</strong> Google won&rsquo;t make app passwords then. Add another second step, such as your phone number or an authenticator app, and try again.</li>'
           '<li><strong>It&rsquo;s a work, school or other organisation account</strong>: someone else runs it, and the address usually doesn&rsquo;t end in @gmail.com. For moving your own email, use a personal Gmail account instead.</li>'
           '<li><strong>Your account has Advanced Protection</strong>, Google&rsquo;s strictest setting for people at high risk of being targeted. App passwords aren&rsquo;t available with it: use a different Gmail account for the move, or ring us.</li>'
           '<li><strong>You&rsquo;re signed in to a different Google account.</strong> Check the picture or initial at the top right, and switch account if it isn&rsquo;t the one you meant.</li></ul>'
           '<p>Still stuck? Ring us on <strong>01202 775566</strong> and we&rsquo;ll go through it with you on the phone.</p>'},
  {'eyebrow': '/06 &mdash; KEEP IT SAFE', 'h2': 'Keeping it safe, and deleting it afterwards',
   'html': '<ul><li><strong>Treat it like a password.</strong> Don&rsquo;t email it, text it or read it out to anyone: with it, a program can read the Gmail account it belongs to. A message asking you for it is a scam.</li>'
           '<li><strong>Changing your Google password cancels it.</strong> Google cancels all your app passwords when you change your Google Account password. If that happens part-way through a move, make a new one and type it into 365 PC Manager when it asks.</li>'
           '<li><strong>Delete it when the job is done.</strong> Go back to <a href="https://myaccount.google.com/apppasswords" ' + _EXT + '>myaccount.google.com/<wbr>apppasswords</a> and remove it using the delete button next to its name. Anything using it stops working straight away, which is what you want once the move has finished.</li></ul>'},
  {'eyebrow': '/07 &mdash; MOVING VIRGIN EMAIL?', 'h2': 'Moving Virgin email? Where this fits in',
   'html': '<p>If you&rsquo;re making this app password to move a Virgin Media, blueyonder, ntlworld or virgin.net mailbox into Gmail, the next step is our free app: <a href="/' + VIRGIN_TOOL_SLUG + '/">see how the free Virgin email tools work</a>. You sign in to Virgin with your normal password, so you don&rsquo;t need a Virgin app password at all. When the move has finished, our checklist for <a href="/' + ADDR_SLUG + '/">changing your email address everywhere</a> takes you through the rest.</p>'
           '<p>Rather someone did it all for you? We move it for &pound;60 per email address, agreed before we start, and that includes a full service of your PC with a written report. Call <strong>01202 775566</strong> or see <a href="/move-virgin-media-email-to-gmail/#move-for-me">what we do</a>.</p>'},
 ],
 'howToName': 'How to make a Google app password',
 'howToSteps': [
  {'name': 'Open your Google Account', 'text': 'Sign in to the Gmail account you want to use and open your Google Account at myaccount.google.com.'},
  {'name': 'Switch on 2-Step Verification', 'text': 'Choose Security & sign-in, then under How you sign in to Google choose Turn on 2-Step Verification and follow the steps on screen.'},
  {'name': 'Open the app passwords page', 'text': 'Go to myaccount.google.com/apppasswords, or type App passwords into the search box at the top of your Google Account, and sign in again if asked.'},
  {'name': 'Name it and create it', 'text': 'Type a name you will recognise, such as 365 PC Manager, and press Create.'},
  {'name': 'Copy it into the program', 'text': 'Copy the 16-character app password into the program that needs it before you close the box. If you lose it, make a new one.'},
 ],
 'faqs': [
  {'q': 'What is a Google app password?', 'a': 'A 16-character code that lets a program sign in to your Google Account without your normal password. You need 2-Step Verification switched on to make one, and you can delete it at any time from myaccount.google.com/apppasswords.'},
  {'q': 'Why can&rsquo;t the program just use my normal Gmail password?', 'a': 'Google no longer lets programs sign in to Gmail with just your normal password. They use &lsquo;Sign in with Google&rsquo; or, where they can&rsquo;t, an app password. That keeps your real password out of the program, and you can cancel the app password without changing anything else.'},
  {'q': 'Do I need 2-Step Verification?', 'a': 'Yes. Google only makes app passwords for accounts with 2-Step Verification switched on. Turn it on in your Google Account under Security &amp; sign-in, then &lsquo;How you sign in to Google&rsquo;.'},
  {'q': 'Where has &lsquo;App passwords&rsquo; gone from my Google Account?', 'a': 'Many accounts no longer show it in the Security menu. Go straight to myaccount.google.com/apppasswords, or type &lsquo;App passwords&rsquo; into the search box at the top of your Google Account.'},
  {'q': 'Google says app passwords aren&rsquo;t available for my account. Why?', 'a': 'Google gives three reasons: 2-Step Verification is set up only with security keys, the account belongs to a work, school or other organisation, or the account has Advanced Protection. In practice, 2-Step Verification not being on yet, or being signed in to a different Google account, are the other two. <a href="#s5">What to do about each</a>.'},
  {'q': 'What happens if I change my Google password?', 'a': 'Google cancels all your app passwords when you change your Google Account password. Make a new one and give it to the program again. In 365 PC Manager, the email move asks for the new one if Gmail refuses the old one.'},
  {'q': 'Is it the same as a Virgin Media app password?', 'a': 'No. A Google app password is for your Gmail. A Virgin Media app password is made in the My Virgin Media app, and many people can&rsquo;t get one since the Virgin Media O2 ID change. Our free <a href="/' + VIRGIN_TOOL_SLUG + '/">Virgin email tools</a> don&rsquo;t need a Virgin app password: you sign in to Virgin with your normal password.'},
  {'q': 'Can you do it for me?', 'a': 'Yes: ring us on 01202 775566 and we&rsquo;ll go through it with you on the phone. If you are moving Virgin email and would rather we did the whole move, it is &pound;60 per email address, agreed before we start, including a full service of your PC with a written report.'},
 ],
 'crossLinksHtml': '<p><strong>Related guides:</strong> <a href="/' + VIRGIN_TOOL_SLUG + '/">Move Virgin email to Gmail free</a> &middot; <a href="/' + ADDR_SLUG + '/">Change your email address everywhere</a> &middot; <a href="/how-to-set-up-two-factor-authentication/">Two-factor authentication, explained</a> &middot; <a href="/move-virgin-media-email-to-gmail/">Moving Virgin Media email to Gmail</a> &middot; <a href="/email-support/">Email support</a></p>',
})

# ------------------------------------------------------------------ change your address everywhere
VIRGIN_GUIDE_PAGES.append({
 'slug': ADDR_SLUG,
 'title': 'Changed Your Email Address? Update It Everywhere',
 'metaDesc': 'Moved your email to Gmail? The order to change your address in: banks, HMRC, the DVLA, NHS login, bills and shops. And how to spot fake Junara emails.',
 'ogTitle': 'After you move: change your email address everywhere',
 'crumbName': 'Change Your Email Address Everywhere',
 'eyebrow': '// AFTER YOU MOVE &middot; CHECKLIST',
 'h1': 'After you move: change your <em class="grad grad--cyan">email address</em> everywhere',
 'lede': 'Moving your mail is half the job: the bank, the GP and HMRC still write to the old address. Change it while the old one still works, in this order.',
 'chips': ['Free checklist', 'Checked against GOV.UK and NHS help', 'Plain English'],
 'primaryCta': ['Call 01202 775566', 'tel:+441202775566'],
 'secondaryCta': ['The free Virgin email tools', '/' + VIRGIN_TOOL_SLUG + '/'],
 'ctaHead': 'Rather go through the list with someone?',
 'ctaSub': 'Ring us and we&rsquo;ll help you work through the important ones, agreed before we start. When we move Virgin email for you (&pound;60 per address, with a full PC service and written report), we set up the forwarding as part of it.',
 'sections': [
  {'eyebrow': '/01 &mdash; IN SIX STEPS', 'h2': 'The order to do it in',
   'html': '<ol>'
           '<li><strong>Forward the old address to the new one</strong> while it still works, so nothing is missed during the change-over.</li>'
           '<li><strong>Money first:</strong> bank, building society, credit cards, PayPal, pensions and insurance.</li>'
           '<li><strong>Government and health:</strong> GOV.UK One Login, HMRC, the DVLA and your NHS login &mdash; and tell your GP surgery.</li>'
           '<li><strong>Home:</strong> energy, water, council tax, broadband, your mobile phone and TV Licensing.</li>'
           '<li><strong>Shopping and subscriptions:</strong> Amazon, eBay, supermarkets, streaming, newspapers, charities and memberships.</li>'
           '<li><strong>People:</strong> family, friends, clubs, church, school, and anyone else you email.</li>'
           '</ol>'
           '<p>Do the first three <strong>while your old address still works</strong>. Many sites send a code to your current address before they let you change it, and some, HMRC among them, send a note there afterwards. Once the old mailbox has closed, those emails never arrive.</p>'},
  {'eyebrow': '/02 &mdash; WHY IT MATTERS', 'h2': 'Why it matters: password resets and security codes',
   'html': '<p>Your email address is the key to most of your other accounts. Forget a password, and the reset link goes to your email. Sign in somewhere unusual, and the warning goes to your email. Leave an account on an address that has closed and all of that goes nowhere &mdash; often unnoticed until months later, when you&rsquo;re locked out and can&rsquo;t get back in.</p>'
           '<p>The NHS is a good example. NHS login&rsquo;s help says that if you can no longer get into the email address on your NHS login, you have to <strong>set up a new NHS login</strong> rather than recover the old one. Changing the address first takes a minute.</p>'
           '<p>If your old address is a Virgin Media one &mdash; virginmedia.com, blueyonder, ntlworld or virgin.net &mdash; <a href="/virgin-media-email-moving-to-junara/#s4">your deadline</a> is the date in the email Virgin sent you. After it the mailbox is suspended, then deleted.</p>'},
  {'eyebrow': '/03 &mdash; FIND EVERY ONE', 'h2': 'Finding everywhere your address is used',
   'html': '<ul><li><strong>Let 365 PC Manager make the list.</strong> In our free app, <a href="/' + VIRGIN_TOOL_SLUG + '/">Where your address is used</a> lists the companies that email your Virgin mailbox, so you can work down it.</li>'
           '<li><strong>Search your old mailbox</strong> for words such as <em>account</em>, <em>statement</em>, <em>order</em>, <em>renewal</em>, <em>password</em> and <em>welcome</em>. Each company that sends you those needs your new address.</li>'
           '<li><strong>Look at your saved passwords.</strong> If your browser remembers your passwords (Chrome and Edge both can), its password list shows every site you sign in to, and most of those use your email address as the username.</li>'
           '<li><strong>Look at the post.</strong> Paper bills and statements show the companies you deal with, even the ones that rarely email.</li></ul>'},
  {'eyebrow': '/04 &mdash; MONEY, GOVERNMENT, HEALTH', 'h2': 'Banks, HMRC, the DVLA and the NHS: how to change them',
   'html': '<ul><li><strong>Your bank and building society:</strong> change it in the bank&rsquo;s own app or online banking, usually under your profile or personal details. If you can&rsquo;t find it, ring the number on the back of your card. Never use a link in an email to do it.</li>'
           '<li><strong>GOV.UK One Login:</strong> sign in at <a href="https://home.account.gov.uk/" rel="noopener" target="_blank">home.account.gov.uk</a>, where GOV.UK says you can change your sign-in details, including your email address. More and more government services use it.</li>'
           '<li><strong>HMRC:</strong> sign in to your <a href="https://www.gov.uk/personal-tax-account" rel="noopener" target="_blank">personal tax account</a> and check the email address it holds for you. If you do Self Assessment or run a business, check each HMRC online service you use.</li>'
           '<li><strong>The DVLA:</strong> vehicle tax reminders are managed in your <a href="https://www.gov.uk/driver-vehicles-account" rel="noopener" target="_blank">Driver and vehicles account</a>. If you pay vehicle tax by Direct Debit, GOV.UK says to call the DVLA when you have a new email address.</li>'
           '<li><strong>NHS login</strong>, which the NHS App uses: sign in, choose <strong>Login and security settings</strong>, then <strong>Change</strong> next to your email, and follow the steps.</li>'
           '<li><strong>Your GP surgery</strong> keeps its own contact details for you. Ask reception to update your email address, or use the surgery&rsquo;s own form.</li>'
           '<li><strong>Pensions, insurance and investments:</strong> your pension providers, car and home insurers, and any savings or investment accounts.</li></ul>'
           '<p ' + _SRC + '>Sources: GOV.UK, <a href="https://www.gov.uk/using-your-gov-uk-one-login" ' + _EXT + '>Using your GOV.UK One Login</a>, <a href="https://www.gov.uk/driver-vehicles-account" ' + _EXT + '>Driver and vehicles account</a> and <a href="https://www.gov.uk/vehicle-tax-direct-debit/change-address-name" ' + _EXT + '>Vehicle tax Direct Debit: change your address, email or name</a>; NHS login help, <a href="https://help.login.nhs.uk/manage/emailaddresses" ' + _EXT + '>Email addresses</a>. Read 29 September 2026.</p>'},
  {'eyebrow': '/05 &mdash; HOME, SHOPS, SUBSCRIPTIONS', 'h2': 'Home, shopping and subscriptions',
   'html': '<p>Most of these are quick: sign in, find <strong>Account</strong>, <strong>Profile</strong> or <strong>Your details</strong>, change the email, and confirm it from your new inbox.</p>'
           '<ul><li><strong>Home:</strong> energy, water, council tax, broadband, your mobile phone and TV Licensing.</li>'
           '<li><strong>Shopping:</strong> Amazon, eBay, supermarket accounts and loyalty cards, and any shop you have an account with.</li>'
           '<li><strong>Subscriptions:</strong> streaming, magazines and newspapers, charities, memberships, and the apps on your phone.</li>'
           '<li><strong>Your devices:</strong> the Apple, Google or Microsoft account on your phone, tablet and computer, if it uses the old address.</li></ul>'
           '<p>A few companies won&rsquo;t let you change the email address you sign in with. If so, ask them how to move your account to the new address before the old one closes.</p>'},
  {'eyebrow': '/06 &mdash; FORWARDING', 'h2': 'Forward the old address while it still works',
   'html': '<p>Forwarding sends anything that arrives at your old address on to your new one, so you don&rsquo;t miss an email from someone you haven&rsquo;t told yet. It only forwards new mail as it arrives, not the mail already in the mailbox &mdash; moving that is a separate job, which our <a href="/' + VIRGIN_TOOL_SLUG + '/">free Virgin email tools</a> do.</p>'
           '<p>In Virgin Media Mail (the webmail), auto-forwarding is in the mail settings: open <strong>Settings</strong>, then <strong>Mail</strong>, then <strong>Auto forward</strong>, switch it on, type your new Gmail address and save. You can keep a copy in the Virgin mailbox too. Menu names can differ slightly.</p>'
           '<p>Virgin says that if you have set up auto-forwarding, emails carry on being forwarded <strong>even while your mailbox is suspended</strong> after your sign-up date. It stops for good when the mailbox is deleted, 120 days later, so work through your list before then.</p>'
           '<p>Keep an eye on what arrives by forwarding: each one is from someone who still has your old address. Change it with them too.</p>'
           '<p ' + _SRC + '>Source: Virgin Media, <a href="https://www.virginmedia.com/help/email-1/email-service-change" ' + _EXT + '>Email service change</a>, read 29 September 2026.</p>'},
  {'eyebrow': '/07 &mdash; FAKE JUNARA EMAILS', 'h2': 'Spotting fake &lsquo;Junara&rsquo; emails',
   'html': '<p>A change that touches every Virgin email address, with a deadline attached, is exactly what scammers wait for. Expect fake &lsquo;your email is closing, pay now&rsquo; messages &mdash; and fake &lsquo;update your details&rsquo; emails pretending to be your bank while you are busy changing your address.</p>'
           '<ul><li><strong>Virgin&rsquo;s own emails have no sign-up link.</strong> Virgin says none of its emails about the change contain a link to sign up to Junara, or ask for personal or payment details.</li>'
           '<li><strong>Junara says to pay only in your Junara account</strong>, never by phone or through a link in an unexpected email.</li>'
           '<li><strong>Type it in yourself.</strong> If you decide to sign up with Junara, type <strong>junara.com</strong> into your browser. To change your email with your bank, use its app or the number on your card.</li>'
           '<li><strong>Rushing is the giveaway.</strong> &lsquo;Act within 24 hours&rsquo;, a request for card details, or for a password: not genuine.</li></ul>'
           '<p><strong>Got one?</strong> Don&rsquo;t click anything in it. Forward it to <strong>report@phishing.gov.uk</strong>, the National Cyber Security Centre&rsquo;s free reporting address, then delete it.</p>'
           '<p><strong>Already clicked, paid or given details?</strong> Ring your bank straight away on the number on the back of your card. Then report it to <strong>Report Fraud</strong>, the national reporting service, at <a href="https://www.reportfraud.police.uk/" ' + _EXT + '>reportfraud.police.uk</a> or on <strong>0300 123 2040</strong> (in Scotland, call Police Scotland on 101). Change the password of any account you may have given away. If you&rsquo;d like a hand, see <a href="/scam-recovery/">scam recovery</a> or ring us on 01202 775566.</p>'
           '<p ' + _SRC + '>Sources: Virgin Media, <a href="https://www.virginmedia.com/help/email-1/email-service-change" ' + _EXT + '>Email service change</a>; Junara, <a href="https://junara.com/virginmedia/" ' + _EXT + '>Virgin Media customers</a>; NCSC, <a href="https://www.ncsc.gov.uk/collection/phishing-scams/report-scam-email" ' + _EXT + '>Report a scam email</a>. Read 29 September 2026.</p>'},
 ],
 'howToName': 'How to change your email address everywhere after moving',
 'howToSteps': [
  {'name': 'Forward the old address', 'text': 'Set up auto-forwarding on the old mailbox to your new address while it still works, so nothing is missed.'},
  {'name': 'Change it with your bank and money accounts', 'text': 'Bank, building society, credit cards, PayPal, pensions and insurance: change it in each one&rsquo;s own app or website, never through a link in an email.'},
  {'name': 'Change it with government and health', 'text': 'GOV.UK One Login, HMRC, the DVLA and your NHS login, and ask your GP surgery to update the email they hold.'},
  {'name': 'Change it for your home accounts', 'text': 'Energy, water, council tax, broadband, your mobile phone and TV Licensing.'},
  {'name': 'Change it for shopping and subscriptions', 'text': 'Amazon, eBay, supermarkets, streaming, newspapers, charities and memberships.'},
  {'name': 'Tell the people you email', 'text': 'Send family, friends, clubs and anyone else you email a message from your new address.'},
 ],
 'faqs': [
  {'q': 'Do I have to change my email address everywhere at once?', 'a': 'No. Set up forwarding on the old address first, so nothing is missed, then work through the list. Do the money, government and health accounts first, while the old address still works: many of them send a code to your current address before they let you change it.'},
  {'q': 'What happens if I leave an account on my old Virgin address?', 'a': 'Once the Virgin mailbox closes, password-reset emails, security codes and warnings sent to it never arrive. You may not notice until you need to get back into that account. Change it while the old address still works.'},
  {'q': 'How do I change the email on my NHS login?', 'a': 'Sign in to NHS login, choose Login and security settings, then Change next to your email, and follow the steps. NHS login&rsquo;s help says that if you lose access to the email address on your NHS login you have to set up a new one, so change it before your old address closes. Your GP surgery keeps its own record: ask them to update it too.'},
  {'q': 'How do I change my email address with HMRC and GOV.UK?', 'a': 'If you use GOV.UK One Login, sign in at home.account.gov.uk, where GOV.UK says you can change your sign-in details, including your email address. Then sign in to your HMRC personal tax account and check the email address it holds for you.'},
  {'q': 'Will forwarding keep working after my Junara date?', 'a': 'Virgin says auto-forwarding carries on even while your Virgin mailbox is suspended. It stops when the mailbox is deleted, 120 days after your sign-up date, so finish changing your address before then.'},
  {'q': 'How do I know if a Junara email is real?', 'a': 'Virgin says its emails about the change contain no link to sign up to Junara and never ask for personal or payment details, and Junara says to pay only in your Junara account, never by phone or an unexpected email link. If you want to sign up, type junara.com into your browser yourself.'},
  {'q': 'Where do I report a scam email?', 'a': 'Forward it to report@phishing.gov.uk, the National Cyber Security Centre&rsquo;s reporting address, then delete it. If you have paid or given details, ring your bank straight away, then report it to Report Fraud at reportfraud.police.uk or on 0300 123 2040 (in Scotland, Police Scotland on 101).'},
  {'q': 'Can you help me do it?', 'a': 'Yes. Ring us on 01202 775566 and we&rsquo;ll help you work through the important ones, agreed before we start. If we&rsquo;re moving your Virgin email for you (&pound;60 per address, including a full service of your PC with a written report), setting up the forwarding is part of it.'},
 ],
 'crossLinksHtml': '<p><strong>Related guides:</strong> <a href="/' + VIRGIN_TOOL_SLUG + '/">Move Virgin email to Gmail free</a> &middot; <a href="/' + GAPP_SLUG + '/">How to make a Google app password</a> &middot; <a href="/virgin-media-email-moving-to-junara/">Virgin Media email is moving to Junara</a> &middot; <a href="/move-plusnet-email-to-gmail/">Plusnet email is closing too</a> &middot; <a href="/ive-been-scammed-what-to-do/">Been scammed? What to do</a> &middot; <a href="/email-support/">Email support</a></p>',
})
