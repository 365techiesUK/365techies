# -*- coding: utf-8 -*-
"""Two guides added 16 Nov 2026 (owner: "go ahead with both ... optimize them for SEO, AI and everything").

  /what-is-a-passkey/          what a passkey is, whether to use one, how to make one on Windows, Google and Microsoft
  /windows-11-26h2-update/     what 26H2 is, how to get it, why a PC isn't offered it, and what not to do

Why these two: the gap check against another IT firm's site (16 Nov) found only two topics we lacked that people search
for. Bing Keyword Research, 16 Aug - 13 Nov 2026, exact, UK | world: "what is a passkey" 8,326 | 130,519, "passkeys"
2,469 | 10,097; "windows 11 26h2" 1,901 | 45,471, "install windows 11 on unsupported pc" 136 | 650.

Facts and where they come from (checked 16 Nov 2026):
  - NCSC, CYBERUK, April 2026: it will recommend passkeys wherever a service supports them, and two-step verification
    where it does not (the NCSC's own words as quoted by the FIDO Alliance and the trade press).
  - Windows 11 took third-party passkey managers (1Password, Bitwarden) from the November 2025 update:
    Settings > Accounts > Passkeys > Advanced options. Windows Hello still does the fingerprint, face or PIN check.
  - 26H2 was released at the end of September 2026 (29 or 30 Sep, sources differ) as an enablement package for 24H2 and
    25H2; Home and Pro are supported until October 2028; 25H2 until 12 October 2027; 24H2 Home and Pro ended 13 October
    2026 (Microsoft lifecycle; Windows Central, PCWorld, Pureinfotech).
  - Our own jobs, November 2026: four PCs already on 24H2 or 25H2 with BitLocker on rolled back with 0xC1900101 - 0x20017
    when 26H2 was run from the ISO; the logs pointed at BitLocker's TPM reseal (likely cause, not proven). No customer
    is named, and the page says "likely".
Said with care: no price invented (remote fixes are "usually GBP 60", the site's own line, and "we tell you the price
first"); nothing claims Microsoft supports an unsupported PC; no bypass commands are printed (we do that job ourselves,
after a backup); Apple devices are mentioned only as places a passkey can live (we don't support them).
"""
from new_pages_data import NEW_PAGES

_CALL = ('<p>Rather someone did it with you? Ring <strong>01202 775566</strong> or text 07520 615332, Monday to Friday, '
         '9 to 5. We can connect to your Windows PC and do it while you watch, anywhere in the UK. Remote fixes are usually '
         '&pound;60, and we tell you the price before we start. See <a href="/remote-support/">how remote support works</a>.</p>')

# ================================================================ 1. what is a passkey
NEW_PAGES.append({
    'slug': 'what-is-a-passkey',
    'title': 'What Is a Passkey? Should You Use One? Plain-English Guide',
    'metaDesc': 'A passkey lets you sign in with your fingerprint, face or PIN instead of a password. What it is, whether it is '
                'safe, and how to set one up on Windows.',
    'ogTitle': 'What is a passkey, and should you use one?',
    'crumbName': 'What Is a Passkey?',
    'eyebrow': '// &ldquo;CREATE A PASSKEY?&rdquo;',
    'h1': 'What is a <em class="grad grad--cyan">passkey</em>, and should you use one?',
    'lede': 'Google, Microsoft, Amazon and your bank have started asking you to &ldquo;create a passkey&rdquo;. A passkey lets '
            'you sign in with your fingerprint, your face or your device&rsquo;s PIN instead of typing a password. It is safer '
            'than a password and there is nothing to remember. Here is what it is, in plain English, and how to set one up.',
    'chips': ['No password to remember', 'Can&rsquo;t be phished', 'Recommended by the NCSC'],
    'primaryCta': ['How to set one up', '#s4'], 'secondaryCta': ['Is it safe?', '#s3'],
    'ctaHead': 'Rather we set it up with you?',
    'ctaSub': 'We can connect to your Windows PC and do it while you watch. We tell you the price before we start. Call '
              '01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it is', 'A way to sign in with your fingerprint, face or device PIN instead of a password.'),
        ('Is it safer?', 'Yes. There is no password to steal, guess or type into a fake website.'),
        ('Where it lives', 'On your phone or PC, or in a password manager that keeps your devices in step.'),
        ('Do I lose my password?', 'No. Your password and your other ways of signing in still work unless you remove them.'),
        ('Who recommends it', 'The UK&rsquo;s National Cyber Security Centre, wherever a service offers it.'),
        ('If you lose the device', 'Sign in another way, then make a new passkey. Keep your recovery details up to date.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; THE SHORT ANSWER', 'h2': 'What a passkey is',
         'html': '<p>A passkey is a replacement for a password. When you sign in, the website asks your phone or computer to '
                 'prove it is you, and your device checks in the way you already unlock it: a fingerprint, your face, or its '
                 'PIN. You never type anything the website could leak.</p>'
                 '<p>Behind the scenes, your device and the website each hold one half of a matching pair of keys. The website '
                 'keeps the half that is safe to share. Your device keeps the secret half and never sends it anywhere. So if '
                 'the company is hacked, there is no password of yours to steal.</p>'
                 '<p><strong>Your fingerprint or face never leaves your device.</strong> The website is only told &ldquo;yes, '
                 'this person unlocked the device&rdquo;. It never sees the fingerprint or the photo.</p>'},
        {'eyebrow': '/02 &mdash; WHY NOW', 'h2': 'Why you are suddenly being asked to create one',
         'html': '<p>The big companies have agreed on passkeys as the way to move people off passwords, and most of them now '
                 'offer one: Google, Microsoft, Apple, Amazon, PayPal, eBay, WhatsApp and a growing number of banks and '
                 'shops.</p>'
                 '<p>In April 2026 the UK&rsquo;s <strong>National Cyber Security Centre</strong>, part of GCHQ, said it will '
                 'recommend passkeys wherever a service supports them, and two-step verification where it does not. That is '
                 'the strongest official backing passkeys have had in the UK.</p>'
                 '<p>So the prompt you are seeing is genuine, as long as it comes from the real website or app, in its own '
                 'settings. See the scam warning further down.</p>'},
        {'eyebrow': '/03 &mdash; IS IT SAFE?', 'h2': 'Is a passkey safer than a password?',
         'html': '<ul>'
                 '<li><strong>It can&rsquo;t be phished.</strong> A passkey only works on the real website it was made for. A '
                 'fake &ldquo;bank&rdquo; page has nothing to ask you for, because there is no password or code to type.</li>'
                 '<li><strong>It can&rsquo;t be guessed or reused.</strong> Every passkey is different, and none of them is '
                 '&ldquo;Password123&rdquo;.</li>'
                 '<li><strong>A leak at the company doesn&rsquo;t expose you.</strong> They never had the secret half.</li>'
                 '<li><strong>Someone who steals it still needs your device and your fingerprint, face or PIN.</strong></li>'
                 '</ul>'
                 '<p>The weak point is your device&rsquo;s own lock. If your phone or PC opens with a PIN like 1234 or 0000, '
                 'so do your passkeys. Use a PIN nobody could guess.</p>'},
        {'eyebrow': '/04 &mdash; STEP BY STEP', 'h2': 'How to set up a passkey',
         'html': '<p>The steps are much the same everywhere. Do it on <strong>your own</strong> phone or PC, never a shared '
                 'one.</p>'
                 '<ol>'
                 '<li><strong>Sign in to the account the usual way</strong>, on the device you want the passkey on.</li>'
                 '<li><strong>Open the account&rsquo;s security settings</strong> and look for &ldquo;Passkeys&rdquo;, '
                 '&ldquo;Passkeys and security keys&rdquo; or &ldquo;Face, fingerprint, PIN or security key&rdquo;.</li>'
                 '<li><strong>Choose to create or add a passkey.</strong></li>'
                 '<li><strong>Your device asks for your fingerprint, face or PIN.</strong> That is it creating and locking the '
                 'passkey.</li>'
                 '<li><strong>Sign out and sign back in to test it.</strong> Choose the passkey option when it is offered.</li>'
                 '</ol>'
                 '<p><strong>Google:</strong> sign in at myaccount.google.com, choose <strong>Security</strong>, then '
                 '<strong>Passkeys and security keys</strong>. Android phones signed in to Google often have one already.</p>'
                 '<p><strong>Microsoft (Outlook.com, Hotmail, OneDrive):</strong> sign in at account.microsoft.com, choose '
                 '<strong>Security</strong>, then <strong>Manage how I sign in</strong>, then add <strong>Face, fingerprint, '
                 'PIN or security key</strong>.</p>'
                 '<p><strong>Don&rsquo;t remove your password or recovery details yet.</strong> Use the passkey for a few '
                 'weeks first, and make sure your recovery phone number and email address are up to date.</p>'},
        {'eyebrow': '/05 &mdash; ON A WINDOWS PC', 'h2': 'Passkeys on Windows 10 and 11',
         'html': '<p>On a Windows PC, a passkey is unlocked by <strong>Windows Hello</strong>: the same fingerprint, face or '
                 'PIN you use to sign in to the PC.</p>'
                 '<ul>'
                 '<li><strong>See your passkeys:</strong> on Windows 11, open <strong>Settings</strong>, then '
                 '<strong>Accounts</strong>, then <strong>Passkeys</strong>. You can remove one there.</li>'
                 '<li><strong>Use a password manager instead:</strong> since the November 2025 update, Windows 11 can keep '
                 'passkeys in 1Password or Bitwarden. Install the manager&rsquo;s own program, then switch it on in '
                 '<strong>Settings, Accounts, Passkeys, Advanced options</strong>. That way the passkey follows you to your '
                 'other devices.</li>'
                 '<li><strong>A passkey kept by Windows Hello alone stays on that PC.</strong> If the PC dies, that passkey '
                 'goes with it, which is why you keep another way to sign in.</li>'
                 '<li><strong>No fingerprint reader or camera?</strong> The Windows Hello PIN works just as well.</li>'
                 '<li><strong>Windows 10</strong> can use passkeys through Chrome or Edge, and can use one that lives on your '
                 'phone (see below).</li>'
                 '</ul>'},
        {'eyebrow': '/06 &mdash; MORE THAN ONE DEVICE', 'h2': 'Using a passkey from your phone on another computer',
         'html': '<p>If the passkey is on your phone and you are signing in on a PC, choose <strong>Use a phone or '
                 'tablet</strong> (the wording varies). The PC shows a QR code. Scan it with your phone&rsquo;s camera, '
                 'approve it with your fingerprint or face, and the PC is signed in. Both need Bluetooth switched on, which '
                 'proves the phone is really beside the computer.</p>'
                 '<p>Where a passkey is kept decides where it turns up:</p>'
                 '<ul>'
                 '<li><strong>Google Password Manager:</strong> your Android phones and Chrome, on any computer signed in to '
                 'your Google account.</li>'
                 '<li><strong>Apple&rsquo;s Passwords:</strong> your iPhone, iPad and Mac.</li>'
                 '<li><strong>A password manager such as 1Password or Bitwarden:</strong> everywhere you install it.</li>'
                 '<li><strong>Windows Hello:</strong> that one PC only.</li>'
                 '</ul>'},
        {'eyebrow': '/07 &mdash; WATCH OUT', 'h2': 'The scam to watch for',
         'html': '<p>A passkey can&rsquo;t be typed into a fake page, so scammers try a different trick: getting you to '
                 '<strong>approve their sign-in</strong>.</p>'
                 '<ul>'
                 '<li><strong>Never scan a QR code</strong> that someone sends you by email, text or WhatsApp to &ldquo;verify '
                 'your account&rdquo;. A real passkey QR code only appears on a screen in front of you, when you have just '
                 'chosen to sign in.</li>'
                 '<li><strong>Never approve a fingerprint or face prompt you didn&rsquo;t start.</strong></li>'
                 '<li><strong>Only create a passkey from inside the real website or app</strong>, from its own security '
                 'settings, never from a link in an email.</li>'
                 '<li><strong>Nobody genuine will ever phone you and ask you to create a passkey</strong> or read out a '
                 'code.</li>'
                 '</ul>'
                 '<p>Think you have approved something you shouldn&rsquo;t have? See <a href="/ive-been-scammed-what-to-do/">'
                 'I&rsquo;ve been scammed: what to do</a>.</p>'},
        {'eyebrow': '/08 &mdash; HONEST LIMITS', 'h2': 'What passkeys don&rsquo;t do yet',
         'html': '<ul>'
                 '<li><strong>Not every website has them.</strong> For the rest, use a long, different password for each, and '
                 '<a href="/how-to-set-up-two-factor-authentication/">two-step verification</a>.</li>'
                 '<li><strong>They don&rsquo;t all travel together.</strong> A passkey made on an iPhone stays with Apple, and '
                 'one made in Chrome stays with Google, unless you use a password manager that works on everything.</li>'
                 '<li><strong>The account is only as safe as its other ways in.</strong> If the password is still '
                 '&ldquo;Password123&rdquo; and there is no two-step check, a thief uses that door instead.</li>'
                 '<li><strong>Shared computers:</strong> don&rsquo;t create a passkey on a PC other people sign in to with the '
                 'same PIN.</li>'
                 '</ul>'
                 '<p>For the accounts that still need passwords, our free <a href="/password-generator/">password '
                 'generator</a> makes strong ones, and the <a href="/password-breach-checker/">breach checker</a> shows '
                 'whether an old one has leaked.</p>'},
        {'eyebrow': '/09 &mdash; RATHER WE HELPED?', 'h2': 'When to call us', 'html': _CALL},
    ],
    'howToName': 'How to set up a passkey',
    'howToSteps': [
        {'name': 'Sign in on your own device', 'text': 'Sign in to the account the usual way, on the phone or PC you want the passkey on.'},
        {'name': 'Open the security settings', 'text': 'In the account, open Security and find Passkeys, or Face, fingerprint, PIN or security key.'},
        {'name': 'Create the passkey', 'text': 'Choose to create or add a passkey, then confirm with your fingerprint, face or device PIN.'},
        {'name': 'Test it', 'text': 'Sign out, sign back in and choose the passkey option.'},
        {'name': 'Keep a way back in', 'text': 'Leave your password in place and check your recovery phone number and email address are up to date.'},
    ],
    'faqs': [
        {'q': 'What is a passkey in simple terms?', 'a': '<p>A way to sign in with your fingerprint, your face or your '
              'device&rsquo;s PIN instead of typing a password. Your device proves it is you, and no secret is sent to the '
              'website.</p>'},
        {'q': 'Is a passkey safer than a password?', 'a': '<p>Yes. It can&rsquo;t be guessed, reused or typed into a fake '
              'website, and a leak at the company doesn&rsquo;t expose it. The UK&rsquo;s National Cyber Security Centre '
              'recommends passkeys wherever a service supports them.</p>'},
        {'q': 'Should I create a passkey when Google or Microsoft asks?', 'a': '<p>Yes, if you are on your own phone or PC '
              'and the prompt is inside the real website or app. Keep your password and recovery details as well.</p>'},
        {'q': 'What happens if I lose my phone?', 'a': '<p>If the passkey was saved in your Google account, Apple account or '
              'a password manager, it comes back when you sign in on a new phone. If not, sign in another way and create a '
              'new passkey.</p>'},
        {'q': 'Does a passkey replace my password?', 'a': '<p>Not unless you choose to. In most accounts the password keeps '
              'working beside the passkey until you remove it.</p>'},
        {'q': 'Does the website get my fingerprint?', 'a': '<p>No. Your fingerprint or face is checked on your own device '
              'and never leaves it.</p>'},
        {'q': 'Can I use a passkey without a fingerprint reader?', 'a': '<p>Yes. Your device&rsquo;s PIN works: on a Windows '
              'PC that is the Windows Hello PIN.</p>'},
        {'q': 'Where are passkeys stored on Windows 11?', 'a': '<p>Open Settings, Accounts, Passkeys. They are kept by '
              'Windows Hello on that PC, or by a password manager if you have set one up there.</p>'},
        {'q': 'Is a passkey the same as two-step verification?', 'a': '<p>No, but it does the same job in one step: it needs '
              'your device and your fingerprint, face or PIN together.</p>'},
        {'q': 'Can a scammer get round a passkey?', 'a': '<p>Not by stealing it, but they may try to get you to approve their '
              'sign-in. Never scan a QR code you were sent, and never approve a prompt you didn&rsquo;t start.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/how-to-set-up-two-factor-authentication/">how to set up two-factor '
                      'authentication</a>, <a href="/password-manager-setup/">password manager setup</a>, '
                      '<a href="/password-generator/">password generator</a> and '
                      '<a href="/ive-been-scammed-what-to-do/">I&rsquo;ve been scammed: what to do</a>.</p>',
})


# ================================================================ 2. Windows 11 26H2
NEW_PAGES.append({
    'slug': 'windows-11-26h2-update',
    'title': 'Windows 11 26H2: How to Get It, and Why It Isn&rsquo;t Offered',
    'metaDesc': 'Windows 11 26H2 is out. How to check your version, how to get the update, why your PC is not being offered '
                'it, and the mistake that makes it roll back.',
    'ogTitle': 'Windows 11 26H2: how to get it, and why your PC isn&rsquo;t offered it',
    'crumbName': 'Windows 11 26H2 Update',
    'eyebrow': '// WINDOWS 11, VERSION 26H2',
    'h1': 'Windows 11 <em class="grad grad--cyan">26H2</em>: how to get it, and why your PC isn&rsquo;t offered it',
    'lede': 'Windows 11 version 26H2 came out at the end of September 2026. It is a small update, but it matters: it is the '
            'version Microsoft will keep patching until October 2028. Here is how to see which version you have, how to get '
            '26H2, why Windows Update may not be offering it, and the one way of installing it we would avoid.',
    'chips': ['Supported to October 2028', 'One restart from 24H2 or 25H2', 'Check your version first'],
    'primaryCta': ['How to get it', '#s3'], 'secondaryCta': ['Not offered it?', '#s4'],
    'ctaHead': 'Rather we did it for you?',
    'ctaSub': 'We can connect to your PC and do the update with you, after checking your backup. We tell you the price before '
              'we start. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it is', 'This year&rsquo;s version of Windows 11, released at the end of September 2026.'),
        ('How big', 'From 24H2 or 25H2 it is a small switch-on update and one restart.'),
        ('Why bother', 'Home and Pro on 26H2 get security updates until October 2028.'),
        ('If you stay on 25H2', 'Updates stop after 12 October 2027.'),
        ('If you are on 24H2', 'Home and Pro stopped getting updates on 13 October 2026. Update now.'),
        ('Cost', 'Free from Microsoft, through Windows Update.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHAT IT IS', 'h2': 'What Windows 11 26H2 is, and what changed',
         'html': '<p>Each autumn Microsoft gives Windows 11 a new version number. <strong>26H2</strong> means &ldquo;2026, '
                 'second half&rdquo;. It was released at the end of September 2026 and is being offered to PCs in stages, so '
                 'not everyone saw it on day one.</p>'
                 '<p>It is a quiet release. Most of what is new had already arrived through the monthly updates: more ways to '
                 'size the Start menu and a run of smaller improvements. If you are on 24H2 or 25H2, your PC already has nearly all of it, and 26H2 '
                 'just switches the rest on.</p>'
                 '<p><strong>The reason to install it is the support dates, not the features.</strong></p>'},
        {'eyebrow': '/02 &mdash; CHECK FIRST', 'h2': 'Which version have you got, and is it still supported?',
         'html': '<p>Press the <strong>Windows key and R</strong>, type <code>winver</code> and press Enter. A small box '
                 'shows the version, such as &ldquo;Version 25H2&rdquo;.</p>'
                 '<table style="width:100%;border-collapse:collapse;margin:1rem 0">'
                 '<thead><tr><th style="text-align:left;padding:.5rem .6rem;border-bottom:1px solid rgba(125,170,220,.35)">'
                 'Your version</th><th style="text-align:left;padding:.5rem .6rem;border-bottom:1px solid rgba(125,170,220,.35)">'
                 'Security updates for Home and Pro</th></tr></thead><tbody>'
                 '<tr><td style="padding:.5rem .6rem">22H2 or 23H2</td><td style="padding:.5rem .6rem">Ended (23H2 in November 2025)</td></tr>'
                 '<tr><td style="padding:.5rem .6rem">24H2</td><td style="padding:.5rem .6rem">Ended 13 October 2026</td></tr>'
                 '<tr><td style="padding:.5rem .6rem">25H2</td><td style="padding:.5rem .6rem">Until 12 October 2027</td></tr>'
                 '<tr><td style="padding:.5rem .6rem"><strong>26H2</strong></td><td style="padding:.5rem .6rem"><strong>Until October 2028</strong></td></tr>'
                 '</tbody></table>'
                 '<p>A PC on a version that has ended still works, but it no longer gets security fixes. Still on Windows 10? '
                 'See <a href="/is-my-windows-still-supported/">is my Windows still supported?</a></p>'},
        {'eyebrow': '/03 &mdash; STEP BY STEP', 'h2': 'How to get Windows 11 26H2',
         'html': '<p>Do it through <strong>Windows Update</strong>. It is the safe route and, from 24H2 or 25H2, it takes a '
                 'few minutes and one restart.</p>'
                 '<ol>'
                 '<li><strong>Back up anything you could not replace</strong>, and plug a laptop in.</li>'
                 '<li><strong>Open Settings, then Windows Update.</strong></li>'
                 '<li><strong>Turn on &ldquo;Get the latest updates as soon as they&rsquo;re available&rdquo;.</strong></li>'
                 '<li><strong>Select Check for updates and install everything it finds</strong>, restarting when asked. '
                 'Repeat until it says you are up to date. 26H2 needs the recent monthly updates in place first.</li>'
                 '<li><strong>Look for &ldquo;Windows 11, version 26H2 is available&rdquo;</strong> and select '
                 '<strong>Download and install</strong>.</li>'
                 '<li><strong>Restart when it asks.</strong> Then run <code>winver</code> again to check it says 26H2.</li>'
                 '</ol>'
                 '<p>From 22H2 or 23H2 the same button does a full upgrade, which takes longer: allow an hour or more and '
                 'leave the PC alone while it works.</p>'},
        {'eyebrow': '/04 &mdash; NOT OFFERED IT?', 'h2': 'Why Windows Update isn&rsquo;t offering 26H2',
         'html': '<ul>'
                 '<li><strong>It hasn&rsquo;t reached you yet.</strong> Microsoft offers it in stages. Turning on &ldquo;Get the '
                 'latest updates as soon as they&rsquo;re available&rdquo; moves you up the queue.</li>'
                 '<li><strong>Other updates are waiting.</strong> Install every update on offer and check again, twice. See '
                 '<a href="/windows-update-stuck/">Windows Update stuck</a> if one won&rsquo;t install.</li>'
                 '<li><strong>Microsoft is holding it back for your PC.</strong> If a driver or program on your make of PC '
                 'clashes with 26H2, Microsoft pauses the offer until it is fixed. Waiting is the right thing to do.</li>'
                 '<li><strong>The drive is nearly full.</strong> Free up some space first.</li>'
                 '<li><strong>The PC is managed by work or a school</strong>, which decides when it arrives.</li>'
                 '<li><strong>The PC isn&rsquo;t on Microsoft&rsquo;s supported list.</strong> Some PCs were put on Windows 11 '
                 'although their processor is too old for Microsoft&rsquo;s rules. Windows Update will not offer those a new '
                 'version. See the last section.</li>'
                 '</ul>'},
        {'eyebrow': '/05 &mdash; WHAT WE WOULD AVOID', 'h2': 'Don&rsquo;t force it with the download or the installer',
         'html': '<p>Microsoft also offers 26H2 as a download (an &ldquo;ISO&rdquo; file) and through its Installation '
                 'Assistant. On a PC that is <strong>already on 24H2 or 25H2</strong>, we would not use either.</p>'
                 '<p>In November 2026 we saw four PCs that had been upgraded that way fail at the first restart and roll '
                 'back to the old version after about an hour, with the error <strong>0xC1900101 - 0x20017</strong>. All '
                 'four had BitLocker (device encryption) switched on, and the setup logs pointed at BitLocker&rsquo;s check of '
                 'the PC&rsquo;s security chip. That is the likely cause; we have not proved it. The same PCs are the kind '
                 'that update in one restart through Windows Update.</p>'
                 '<p>So: <strong>use Windows Update and be patient.</strong> If a download really is the only way, know where '
                 'your <a href="/computer-asking-for-bitlocker-recovery-key/">BitLocker recovery key</a> is before you '
                 'start, and have a backup.</p>'},
        {'eyebrow': '/06 &mdash; IF IT GOES WRONG', 'h2': 'After the update, and going back',
         'html': '<ul>'
                 '<li><strong>Check for updates again</strong> afterwards. There is usually a newer monthly update waiting.</li>'
                 '<li><strong>Something not right?</strong> For 10 days you can go back: <strong>Settings, System, Recovery, '
                 'Go back</strong>. After a small switch-on update from 24H2 or 25H2 there is little to undo, and removing '
                 'the latest update does the same job.</li>'
                 '<li><strong>&ldquo;We couldn&rsquo;t update the system reserved partition&rdquo;?</strong> That has its own '
                 'fix: <a href="/we-couldnt-update-the-system-reserved-partition/">see the steps</a>.</li>'
                 '<li><strong>It rolled back by itself?</strong> Note the error code on the screen or in Windows Update&rsquo;s '
                 'history. It tells us where it failed.</li>'
                 '</ul>'},
        {'eyebrow': '/07 &mdash; OLDER PCS', 'h2': 'A PC that &ldquo;doesn&rsquo;t meet the requirements&rdquo;',
         'html': '<p>Plenty of good PCs from about 2016 and 2017 run Windows 11 well but have a processor Microsoft does not '
                 'list. They are stuck on the version they were given, and Windows Update will never offer them 26H2.</p>'
                 '<p>These can often be brought up to 26H2 by hand, keeping your programs and files. It is not something '
                 'Microsoft supports, so be clear about what it means:</p>'
                 '<ul>'
                 '<li>It needs a full backup first, and it does not work on every PC.</li>'
                 '<li>Monthly security updates then arrive as normal, but each <em>new yearly version</em> has to be put on '
                 'by hand again.</li>'
                 '<li>Windows may show a note that the PC doesn&rsquo;t meet the requirements.</li>'
                 '<li>Microsoft could close the route in a future version.</li>'
                 '</ul>'
                 '<p>We do this remotely for customers, after checking the PC and the backup, and we tell you plainly if a '
                 'PC is too old to be worth it. Very old PCs, from before about 2010, cannot run current Windows 11 at '
                 'all.</p>' + _CALL},
    ],
    'howToName': 'How to update to Windows 11 26H2',
    'howToSteps': [
        {'name': 'Check your version', 'text': 'Press the Windows key and R, type winver and press Enter.'},
        {'name': 'Back up and plug in', 'text': 'Back up anything you could not replace, and plug a laptop in.'},
        {'name': 'Install every waiting update', 'text': 'Open Settings, Windows Update, turn on Get the latest updates as soon as they are available, and install everything on offer.'},
        {'name': 'Download and install 26H2', 'text': 'When Windows 11, version 26H2 is available appears, select Download and install.'},
        {'name': 'Restart and check', 'text': 'Restart when asked, then run winver again to confirm it says 26H2.'},
    ],
    'faqs': [
        {'q': 'When was Windows 11 26H2 released?', 'a': '<p>At the end of September 2026. It is offered to PCs in stages, so '
              'some see it weeks later.</p>'},
        {'q': 'Is Windows 11 26H2 free?', 'a': '<p>Yes. It comes through Windows Update at no charge.</p>'},
        {'q': 'How long is Windows 11 26H2 supported?', 'a': '<p>Home and Pro get security updates until October 2028.</p>'},
        {'q': 'How do I get 26H2 now?', 'a': '<p>Open Settings, Windows Update, turn on &ldquo;Get the latest updates as soon '
              'as they&rsquo;re available&rdquo;, install every update, then select Download and install when 26H2 is '
              'offered.</p>'},
        {'q': 'Why is my PC not being offered 26H2?', 'a': '<p>Usually because it has not reached your PC yet, other updates '
              'are waiting, Microsoft has paused it for your model, or the PC is not on Microsoft&rsquo;s supported list.</p>'},
        {'q': 'Do I have to install 26H2?', 'a': '<p>Not straight away if you are on 25H2, which is supported until 12 October '
              '2027. If you are on 24H2 or older, yes: Home and Pro no longer get security updates.</p>'},
        {'q': 'How long does the update take?', 'a': '<p>From 24H2 or 25H2, a few minutes and one restart. From 22H2 or 23H2 '
              'it is a full upgrade: allow an hour or more.</p>'},
        {'q': 'What does error 0xC1900101 - 0x20017 mean?', 'a': '<p>The upgrade failed at its first restart and Windows put '
              'the old version back. We have seen it when 26H2 was installed from the download on PCs with BitLocker on. '
              'Use Windows Update instead.</p>'},
        {'q': 'Can I install 26H2 on an unsupported PC?', 'a': '<p>Often, by hand, but Microsoft does not support it and '
              'Windows Update will not offer it. It needs a backup first, and future versions have to be done by hand '
              'too.</p>'},
        {'q': 'Will 26H2 delete my files?', 'a': '<p>No. It keeps your files, programs and settings. Back up first anyway, as '
              'with any big update.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/is-my-windows-still-supported/">is my Windows still supported?</a>, '
                      '<a href="/how-to-update-windows-safely/">how to update Windows safely</a>, '
                      '<a href="/windows-update-stuck/">Windows Update stuck</a> and '
                      '<a href="/computer-asking-for-bitlocker-recovery-key/">BitLocker recovery key</a>.</p>',
})


# ---- a short box on the pages these two guides answer the next question for, straight before "Frequently asked
# questions" (as ost_to_pst_page_data does after "Fix it with me"). Every other page is untouched.
BOX_PAGES = {
    "how-to-set-up-two-factor-authentication":
        ("// NEW: PASSKEYS", "Being asked to &ldquo;create a passkey&rdquo;? It does the job of two-step verification in "
         "one step, with your fingerprint, face or PIN.", "/what-is-a-passkey/", "What a passkey is, in plain English"),
    "password-manager-setup":
        ("// NEW: PASSKEYS", "Passkeys are replacing passwords on Google, Microsoft and many banks, and a password manager "
         "can keep them for you.", "/what-is-a-passkey/", "What a passkey is, in plain English"),
    "is-my-windows-still-supported":
        ("// WINDOWS 11, VERSION 26H2", "On Windows 11 24H2 or older? Version 26H2 is supported until October 2028, and "
         "from 24H2 or 25H2 it is one restart.", "/windows-11-26h2-update/", "How to get 26H2, step by step"),
    "how-to-update-windows-safely":
        ("// WINDOWS 11, VERSION 26H2", "Windows 11 version 26H2 is out. How to get it through Windows Update, and the way "
         "of installing it we would avoid.", "/windows-11-26h2-update/", "How to get 26H2, step by step"),
    "windows-update-stuck":
        ("// WINDOWS 11, VERSION 26H2", "Waiting for Windows 11 version 26H2, or did it roll back? Why it isn&rsquo;t offered, "
         "and what error 0xC1900101 means.", "/windows-11-26h2-update/", "Windows 11 26H2: how to get it"),
}
_FAQ = ' aria-label="Frequently asked questions"'


def _box(slug):
    eyebrow, words, href, label = BOX_PAGES[slug]
    return f"""    <section class="section" aria-label="Related guide" id="next-guide">
      <div class="wrap" style="max-width:880px">
        <div style="padding:1.1rem 1.25rem;border:1px solid rgba(125,170,220,.35);border-radius:14px;background:rgba(125,170,220,.06)">
          <p class="eyebrow mono" style="margin:0 0 .35rem">{eyebrow}</p>
          <p style="margin:0 0 .75rem;line-height:1.6">{words}</p>
          <p style="margin:0"><a class="button primary" href="{href}">{label}</a></p>
        </div>
      </div>
    </section>
"""


def insert_box(slug, html):
    if slug not in BOX_PAGES or 'id="next-guide"' in html:
        return html
    i = html.find(_FAQ)
    start = html.rfind("<section", 0, i) if i >= 0 else -1
    if start < 0:
        raise SystemExit("passkey_26h2_pages_data: no FAQ section on /%s/" % slug)
    line = html.rfind("\n", 0, start) + 1
    return html[:line] + _box(slug) + html[line:]


def register(bp):
    bp.PAGE_FILTERS.append(insert_box)
