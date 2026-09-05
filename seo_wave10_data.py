# -*- coding: utf-8 -*-
"""Wave 10 (2026-09-05): the after-a-scam service, and the sextortion email doing the rounds.

Trigger: two clean-up-and-report jobs in one week (one existing customer, one new), and a
forwarded copy of the email itself - the ShinyHunters / CarGurus / "$2000 in Litecoin" template.
The advice side of scams was already covered site-wide; the SERVICE (clean the computer, write
the report the bank asks for) was described nowhere. Rendered by build_extra.build_new_page().

Facts checked 2026-09-05: APP reimbursement rules apply to payments from 7 October 2024, cap
£85,000 per claim, optional excess up to £100 (not for vulnerable customers), claims within
13 months, Faster Payments and CHAPS, most claims settled within five business days (PSR).
CarGurus breach by ShinyHunters reported February 2026 (Have I Been Pwned). Keep hedged."""

SEO_WAVE10_PAGES = [
 {'slug': 'scam-recovery',
  'title': 'Scam Recovery: Clean-Up &amp; Report for Your Bank | Dorset',
  'metaDesc': 'Been scammed? We check and clean your computer remotely, write the plain-English report your bank asks for, and make sure it cannot happen again.',
  'ogTitle': 'Been Scammed? Computer Clean-Up and a Report for Your Bank',
  'crumbName': 'Scam Recovery',
  'eyebrow': '// AFTER A SCAM',
  'h1': 'Been scammed? We clean the computer and write the report your bank asks for',
  'lede': 'Two things happen after a scam that nobody warns you about: the bank wants to know the computer is safe before it puts things right, and you want to know it can never happen again. We do both, remotely, the same day where we can &mdash; and we write it all up in plain English so you can send it straight to the bank.',
  'ctaHead': 'Scammed this week? Start here.',
  'ctaSub': 'Call 01202 775566 (Mon&ndash;Fri, 9am&ndash;5pm) and a patient local person will tell you the next step, then check the computer on a secure remote session while you watch. Anywhere in the UK.',
  'serviceName': 'Scam Recovery: Computer Clean-Up and Bank Report',
  'sections': [
   {'eyebrow': '// THE FIRST HOUR',
    'h2': 'Before anything else: the first hour',
    'html': '<p>If money has gone, or someone has been on your computer, do these before you do anything with us. They matter more than the clean-up.</p>'
            '<ol><li><strong>Ring your bank on 159.</strong> It&rsquo;s the UK&rsquo;s safe line to your own bank and it works from any phone. Tell them exactly what happened; they can freeze cards, stop payments and start a claim.</li>'
            '<li><strong>Stop all contact with the scammer.</strong> Don&rsquo;t reply, don&rsquo;t pay a &ldquo;fee&rdquo; to get money back (that is the second scam), and keep the messages as evidence.</li>'
            '<li><strong>Change your important passwords from a different device</strong> &mdash; a phone or another computer &mdash; starting with email and banking. Not on the computer the scammer touched.</li>'
            '<li><strong>Don&rsquo;t use online banking on that computer</strong> until it has been checked. Most banks will say the same, and some will block it until they know the device is clean.</li>'
            '<li><strong>Report it.</strong> Action Fraud on <strong>0300 123 2040</strong> (in Scotland, Police Scotland on 101). Forward scam emails to <strong>report@phishing.gov.uk</strong> and scam texts to <strong>7726</strong>, free.</li></ol>'
            '<p>Our step-by-step guide covers every type of scam in order: <a href="/ive-been-scammed-what-to-do/">I&rsquo;ve been scammed &mdash; what to do right now</a>. Then call us, and we take it from here.</p>'},
   {'eyebrow': '// THE CLEAN-UP',
    'h2': 'What we actually check and remove',
    'html': '<p>Scammers rarely leave a computer the way they found it. In a remote session &mdash; we phone you first, you watch every move on your own screen &mdash; we go through the places they hide things:</p>'
            '<ul><li><strong>Remote-access programs</strong> they installed to get in, and any &ldquo;support&rdquo; tools they left behind so they could come back.</li>'
            '<li><strong>Malware and browser add-ons</strong> &mdash; including the extensions that watch what you type on banking pages.</li>'
            '<li><strong>Hidden changes</strong>: new user accounts, email forwarding rules that quietly copy your mail to them, weakened security settings, saved passwords they may have read.</li>'
            '<li><strong>Your protection</strong> &mdash; Windows Security switched back on and up to date, updates installed, and a full scan run to confirm the machine is clean.</li>'
            '<li><strong>Your accounts</strong> &mdash; new passwords where they matter, two-factor authentication switched on, and unknown sign-ins removed from your email.</li></ul>'
            '<p>Most clean-ups are a single remote session. We tell you what we found in plain English, and what it means &mdash; no jargon, no lectures; this happens to sensible people every week. If the machine genuinely can&rsquo;t be worked on remotely &mdash; it won&rsquo;t start, or the scammer locked it &mdash; that is a technical job we can come out for across Bournemouth, Poole, Christchurch and Dorset.</p>'},
   {'eyebrow': '// THE REPORT',
    'h2': 'The report for your bank, and why it matters',
    'html': '<p>After a remote-access or malware scam, many banks want evidence that the computer has been checked before they restore online banking or settle a claim. So we write it down properly. Your report sets out:</p>'
            '<ul><li><strong>What happened</strong>, in your words and ours &mdash; the call, the pop-up, the email &mdash; with dates and times.</li>'
            '<li><strong>What we found</strong> on the computer: the programs, changes and traces the scammer left.</li>'
            '<li><strong>What we removed and changed</strong>, and confirmation that the machine was clean and protected when we finished.</li>'
            '<li><strong>Who we are</strong> &mdash; a named, established local IT firm the bank can ring.</li></ul>'
            '<p>Why it helps: since 7 October 2024, UK banks have had to reimburse most victims of &ldquo;authorised push payment&rdquo; scams &mdash; where you were tricked into sending money by bank transfer &mdash; up to &pound;85,000 per claim, usually within five business days, with the option of a &pound;100 excess and a 13-month window to claim. The main exception is where the bank believes the customer ignored obvious warnings. A clear, dated account of what was done to you, and of the fact that your computer was compromised and then professionally cleaned, is the kind of evidence that supports a claim &mdash; and it answers the question every bank asks before switching online banking back on.</p>'
            '<p>One honest line: the decision is the bank&rsquo;s, not ours, and we can&rsquo;t promise a refund. What we can promise is that your side of the story arrives written down, in order, by someone who looked.</p>'},
   {'eyebrow': '// WHAT WE SEE',
    'h2': 'The scams we clean up after, most weeks',
    'html': '<ul><li><strong>&ldquo;We&rsquo;re calling from Microsoft / BT / your bank.&rdquo;</strong> The caller talks you into installing a remote-access program, then &ldquo;finds&rdquo; problems, or moves money &ldquo;to a safe account&rdquo;. If you let anyone in, our <a href="/gave-a-scammer-remote-access/">gave-a-scammer-remote-access guide</a> is the first hour, and this page is what happens next.</li>'
            '<li><strong>The frozen &ldquo;your computer is infected&rdquo; pop-up</strong> with a phone number. Nothing is wrong with the computer; the danger is the phone call. See <a href="/scam-pop-up-help-poole/">scam pop-ups</a>.</li>'
            '<li><strong>The &ldquo;you&rsquo;ve been hacked, pay in Bitcoin&rdquo; email</strong> that names a real data breach and claims to have recorded you. It&rsquo;s a mass-mailed bluff &mdash; but people pay, and people click. We&rsquo;ve written it up: <a href="/youve-been-hacked-email-bitcoin-scam/">the &ldquo;you&rsquo;ve been hacked&rdquo; email, explained</a>.</li>'
            '<li><strong>Fake bank, HMRC and delivery texts</strong> that lead to a convincing copy of a real website, where a password or card number is typed in.</li>'
            '<li><strong>Marketplace and purchase scams</strong> &mdash; the deposit for the car or the holiday let that doesn&rsquo;t exist. Less to clean up, more to document for the bank.</li></ul>'
            '<p>Whatever it was, the pattern is the same: stop the bleeding with the bank, make the computer safe, write it down, then make sure it can&rsquo;t happen twice.</p>'},
   {'eyebrow': '// NEVER TWICE',
    'h2': 'So it doesn&rsquo;t happen again',
    'html': '<p>The clean-up ends with the three changes that stop most repeat scams: <strong>two-factor authentication</strong> on email and banking, so a stolen password is useless on its own; a <strong>password manager</strong> so no password is reused; and one rule for the household &mdash; <strong>nobody who rings you out of the blue gets remote access, ever</strong>. We help you set all three up before we sign off.</p>'
            '<p>For the habits, our free <a href="/online-safety-course/">online safety course</a> is six short lessons written for exactly this, and the <a href="/spot-the-scam/">Spot the Scam quiz</a> is a gentle way to practise. If it would help to have someone to ask &ldquo;is this safe?&rdquo; before clicking, that is what our <a href="/home-it-support-plans/">home support plan</a> is for &mdash; &pound;18.25 a month per computer, rolling monthly, cancel anytime, with unlimited remote help. And if it&rsquo;s a parent you&rsquo;re worried about, <a href="/worried-about-a-parent-being-scammed/">this page is for you</a>.</p>'}],
  'faqs': [
   {'q': 'How much does the clean-up and report cost?', 'a': 'We tell you the price before we start, and it doesn&rsquo;t change &mdash; most clean-ups are a single remote session, and the report is part of the job, not an extra. Call 01202 775566 and we&rsquo;ll quote it on the phone once we know what happened.'},
   {'q': 'Will the bank definitely refund me if I have your report?', 'a': 'No one can promise that, and we won&rsquo;t. The reimbursement rules are strong &mdash; most authorised push payment victims are refunded, up to &pound;85,000, usually within five business days &mdash; but the decision is the bank&rsquo;s, and it looks at whether obvious warnings were ignored. A clear written record of what happened and what was found on your computer is evidence that helps; it isn&rsquo;t a verdict.'},
   {'q': 'Does the computer need wiping and starting again?', 'a': 'Usually not. In most cases we can remove what the scammer installed, undo the changes and confirm the machine is clean. If they had deep access for a long time, or installed something we can&rsquo;t fully trust, we&rsquo;ll say so and recommend a fresh install &mdash; with your files kept safe first.'},
   {'q': 'I&rsquo;m not in Dorset. Can you still help?', 'a': 'Yes. The check, the clean-up and the report are all done on a secure remote session, so we help people anywhere in the UK. We phone you first, you watch everything on your own screen, and our access ends the moment we&rsquo;re finished.'},
   {'q': 'I paid the scammer in gift cards or cryptocurrency &mdash; is that covered?', 'a': 'Sadly the bank reimbursement rules cover bank transfers, not gift cards, cash or cryptocurrency, so that money is much harder to recover &mdash; report it to Action Fraud anyway, and tell your bank if a card was used to buy the vouchers. The computer still needs checking, and the report still helps if any other payment is in dispute.'}],
  'chips': ['Remote, same day where we can', 'Report written for your bank', 'Rated 4.9 on Google'],
  'primaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'secondaryCta': ['Start SOS remote support', '/sos/'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related:</strong> <a href="/ive-been-scammed-what-to-do/">I&rsquo;ve been scammed &mdash; what to do</a> &middot; <a href="/gave-a-scammer-remote-access/">Gave a scammer remote access</a> &middot; <a href="/i-think-ive-been-hacked/">I think I&rsquo;ve been hacked</a> &middot; <a href="/youve-been-hacked-email-bitcoin-scam/">The &ldquo;you&rsquo;ve been hacked&rdquo; email</a> &middot; <a href="/virus-removal/">Virus &amp; malware removal</a> &middot; <a href="/online-safety/">Online safety hub</a></p>'},

 {'slug': 'youve-been-hacked-email-bitcoin-scam',
  'title': '&ldquo;You&rsquo;ve Been Hacked&rdquo; Email Wants Bitcoin? It&rsquo;s a Bluff (UK)',
  'metaDesc': 'The email saying you have been hacked, naming a real breach and demanding Bitcoin, is a mass-mailed bluff. What it is, what to do, and when to worry.',
  'ogTitle': 'The &ldquo;You&rsquo;ve Been Hacked&rdquo; Email That Wants Bitcoin: It&rsquo;s a Bluff',
  'crumbName': 'Hacked-email scam',
  'eyebrow': '// SCAM EMAIL, EXPLAINED',
  'h1': 'The &ldquo;you&rsquo;ve been hacked&rdquo; email that wants Bitcoin: it&rsquo;s a bluff',
  'lede': 'It says a hacking group got into a real company&rsquo;s database, then into your devices, recorded you through your camera, and will send the videos to everyone you know unless you pay within 48 hours in Bitcoin or Litecoin. The 2026 version names ShinyHunters and CarGurus and asks for $2,000. It is a template, sent to millions of addresses from a leaked list. Nobody recorded you.',
  'ctaHead': 'Rattled by one of these? Call us.',
  'ctaSub': 'A patient local person will look at the email with you, check whether anything real is behind it, and &mdash; if you clicked or paid &mdash; make the computer safe and write it up for your bank. 01202 775566, Mon&ndash;Fri 9am&ndash;5pm.',
  'serviceName': 'Scam Email Check and Advice',
  'sections': [
   {'eyebrow': '// LINE BY LINE',
    'h2': 'What the email claims, and what is actually true',
    'html': '<p>The current wave reads, in part: <em>&ldquo;We are the ShinyHunters hacking group &hellip; We gained access to the CarGurus.com database where you have an account and easily accessed your email &hellip; we installed an exploit on your devices &hellip; We managed to record you &hellip; Send us $2000 in Litecoin &hellip; You have 48 hours.&rdquo;</em> Earlier versions named other companies and asked for Bitcoin; the shape never changes.</p>'
            '<p><strong>What&rsquo;s true:</strong> your email address was in a data breach. The CarGurus breach was real &mdash; reported in February 2026, millions of records &mdash; and that is how they got your address. Some versions also show an old password of yours, because the same leaked lists contain passwords from older breaches.</p>'
            '<p><strong>What&rsquo;s false:</strong> everything else. Being in a company&rsquo;s customer list does not give anyone access to your devices. There is no exploit, no recording, no video, no &ldquo;wallet generated for you&rdquo;, and no 48-hour clock. The same message went to everyone on the list, whether or not they own a webcam.</p>'},
   {'eyebrow': '// WHY IT FEELS REAL',
    'h2': 'How the email is built to frighten you',
    'html': '<ul><li><strong>A real breach, named.</strong> You may even have had a breach notice from the company. That is the hook: one true fact lends the rest its weight.</li>'
            '<li><strong>An old password of yours.</strong> Alarming to see &mdash; but it proves only that a password leaked years ago, not that anyone is inside your computer now. If you still use it anywhere, that is the one real problem in the email.</li>'
            '<li><strong>Sent &ldquo;from&rdquo; your own address.</strong> The sender line of an email can be forged as easily as the return address on an envelope. It does not mean your account was used.</li>'
            '<li><strong>Shame and a deadline.</strong> Adult websites, family, colleagues, 48 hours, &ldquo;do not contact the police&rdquo;. Every line is there to stop you thinking or asking anyone.</li>'
            '<li><strong>Cryptocurrency.</strong> Untraceable and irreversible &mdash; which is why it&rsquo;s never a bank transfer.</li></ul>'
            '<p>If you find yourself checking the webcam light, that is the email working as designed. It is doing that to a great many people this month.</p>'},
   {'eyebrow': '// WHAT TO DO',
    'h2': 'What to do, and what not to do',
    'html': '<ol><li><strong>Don&rsquo;t pay, don&rsquo;t reply, don&rsquo;t click anything in it.</strong> Paying marks you as someone who pays; more emails follow.</li>'
            '<li><strong>Forward it to report@phishing.gov.uk</strong>, then delete it. The National Cyber Security Centre uses those reports to take down the campaign&rsquo;s infrastructure.</li>'
            '<li><strong>If it shows a password you still use anywhere, change it now</strong> &mdash; on every account where you used it &mdash; and switch on two-factor authentication for email and banking. Our free tool explains <a href="/password-breach-checker/">whether it&rsquo;s safe to check a leaked password</a>.</li>'
            '<li><strong>Run a scan for peace of mind.</strong> Windows Security&rsquo;s full scan, or Malwarebytes, will find nothing &mdash; and that nothing is worth having.</li>'
            '<li><strong>Tell someone.</strong> The email relies on silence. A family member, a friend, or us: 01202 775566.</li></ol>'
            '<p>You do not need to close your email account, buy a new computer, or cover the camera &mdash; though a sticker over a webcam never hurt anyone.</p>'},
   {'eyebrow': '// WHEN TO WORRY',
    'h2': 'The situations that are not a bluff',
    'html': '<p>Three cases change the advice, and it&rsquo;s worth being honest about them.</p>'
            '<ul><li><strong>You paid.</strong> Ring your bank on 159 straight away if a card or transfer was involved, report to Action Fraud on 0300 123 2040, and keep the email. Cryptocurrency payments are rarely recoverable, but reporting still matters.</li>'
            '<li><strong>You clicked a link or opened an attachment in it</strong>, or you had already let someone connect to your computer recently. Treat the machine as possibly compromised: change passwords from a different device, don&rsquo;t use online banking on it, and have it checked. That is our <a href="/scam-recovery/">scam recovery service</a> &mdash; a remote check, a clean-up, and a written report for your bank if it asks.</li>'
            '<li><strong>Someone really does have intimate images of you</strong> &mdash; usually from a person you spoke to online, not from a mass email. That is a different crime, and there is real help: adults can contact the Revenge Porn Helpline; anyone under 18 can use Childline&rsquo;s Report Remove tool; and the police on 101 take it seriously. Don&rsquo;t pay; paying never ends it.</li></ul>'},
   {'eyebrow': '// NEXT TIME',
    'h2': 'Spotting the next one in five seconds',
    'html': '<p>The test that beats every version of this email: <strong>does it want money in cryptocurrency, gift cards or a &ldquo;safe account&rdquo;, and does it want it fast and quietly?</strong> Then it&rsquo;s a scam, whatever it knows about you. Real companies, real police and real banks don&rsquo;t work that way.</p>'
            '<p>Our free <a href="/online-safety-course/">online safety course</a> covers scam emails, texts and calls in six short lessons, and the <a href="/spot-the-scam/">Spot the Scam quiz</a> lets you practise on real examples. If a check-in with a patient human would help, that is what we&rsquo;re for.</p>'}],
  'faqs': [
   {'q': 'The email shows my real password. Doesn&rsquo;t that prove they got in?', 'a': 'It proves the password leaked in a past data breach and ended up on a list &mdash; nothing more. If you still use that password anywhere, change it today and switch on two-factor authentication; if you don&rsquo;t, it&rsquo;s a museum piece. Either way, nobody is inside your computer because of it.'},
   {'q': 'It was sent from my own email address. Has my account been hacked?', 'a': 'Almost certainly not. The &ldquo;from&rdquo; line is forged &mdash; it&rsquo;s a trick to make the email feel like proof. Check your account&rsquo;s recent sign-ins if you want reassurance, and turn on two-factor authentication so a stolen password alone can never get someone in.'},
   {'q': 'Can they really see me through the webcam?', 'a': 'Not from an email. Taking over a camera needs software running on your computer, and being on a company&rsquo;s customer list doesn&rsquo;t put any there. A full scan with Windows Security or Malwarebytes will confirm it. A sticker over the lens is fine if it helps you sleep.'},
   {'q': 'Should I report it to the police?', 'a': 'Forward the email to report@phishing.gov.uk, which is the quickest useful thing. If you paid or lost money, report to Action Fraud on 0300 123 2040 (Police Scotland 101). The email tells you not to contact the police precisely because it works less well when you do.'},
   {'q': 'I paid. What now?', 'a': 'Don&rsquo;t pay again, however the next email threatens. Ring your bank on 159 if a card or bank transfer was involved, report to Action Fraud, and keep everything. If you also clicked or installed anything, have the computer checked &mdash; that&rsquo;s our scam recovery service, remote, with a report for the bank.'}],
  'chips': ['Mass-mailed template', 'Nobody recorded you', 'Delete it, then check your passwords'],
  'primaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'secondaryCta': ['Scam recovery service', '/scam-recovery/'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related:</strong> <a href="/scam-recovery/">Scam recovery: clean-up and a report for your bank</a> &middot; <a href="/ive-been-scammed-what-to-do/">I&rsquo;ve been scammed &mdash; what to do</a> &middot; <a href="/i-think-ive-been-hacked/">I think I&rsquo;ve been hacked</a> &middot; <a href="/password-breach-checker/">Leaked password checker</a> &middot; <a href="/phishing/">Phishing, explained</a> &middot; <a href="/online-safety-course/">Free online safety course</a></p>'},
]
