# -*- coding: utf-8 -*-
"""SEO wave 6 (1 Aug 2026): the print/scan cluster.

WHY THIS CLUSTER, AHEAD OF EVERYTHING ELSE IN THE QUEUE
-------------------------------------------------------
Measured, not assumed. Comparing clusters of identical age (all seeded 2026-07-09,
from git first-commit dates), clicks per page per quarter: Windows/file-sharing
1.67, printer/scan 1.46, Outlook 0.67, OneDrive 0.50, connectivity 0.18, ISP email
0.17, Sage 0.00. Print/scan is the second-best-yielding cluster on the site, and the
best one with pages still unbuilt. The same measurement cut the queue from 38 to 20
- see seo-research/deferred.json for what was dropped and why.

THE TRIAGE FORK IS LOAD-BEARING
-------------------------------
Three pages here plus two that already exist all answer "my scanning is broken", so
they were written to strict separate lanes and /printer-wont-scan-to-computer-windows-11/
opens by explicitly sending readers away:

  scan-to-folder-...    office MFP refused when signing in to a PC's shared folder
  printer-asking-...    blocked from INSTALLING by an admin password prompt
  printer-wont-scan-... the general Windows 11 case, and the router that routes people
  (existing) printer-prints-but-wont-scan-after-new-router  the router-change trigger
  (existing) shared-folders-not-working-...-24h2-update     PC-to-PC shares

Remove the fork and these compete with each other for one query. Keep the
crossLinksHtml pointing both ways.

Editorial guards that must not be undone:
  - SMB1, insecure guest logons and disabling SMB signing or the firewall appear
    ONLY as advice the reader will meet online and should refuse, never as a fix.
  - /printer-asking-for-admin-password/ must never describe bypassing, cracking or
    resetting a Windows password, and must never frame an employer's IT restriction
    as an obstacle to defeat. The answer there is "ask IT". The fact-checker treated
    any breach of this as reject-level.
  - No prices; no suggestion of a shop or premises (365 Techies has none - free
    collection only). Note the pages DO mention "a shop" meaning wherever the
    customer bought the PC; that is fine and is not a claim about 365 Techies.

Rendered by build_extra.build_new_page(). One module per wave.
"""

SEO_WAVE6_PAGES = [{'slug': 'scan-to-folder-stopped-working-after-windows-update',
  'title': 'Scan to Folder Stopped After a Windows Update | 365 Techies',
  'metaDesc': 'Your office printer stopped scanning to a shared folder after a Windows update. Why '
              'printing still works, what to check, and the fix that lasts.',
  'ogTitle': 'Scan to Folder Stopped Working After a Windows Update',
  'crumbName': 'Scan to Folder Stopped',
  'eyebrow': '// PRINTER &amp; SCANNER SUPPORT',
  'h1': 'Scan to folder stopped working after a Windows update',
  'lede': 'The office printer still prints everything you send it, but press Scan and the file '
          'never lands in the folder on the PC. Nobody touched the printer. The only thing that '
          'changed was a Windows update on the computer &mdash; and that is exactly the point. '
          'Your scanner has to sign in to that PC to drop a file into a shared folder, and Windows '
          'has been quietly getting fussier about who it lets in. Here is what really changed, '
          'what to check on each side, and the fix that will not fall over at the next update.',
  'ctaHead': 'Scanner still refusing to file anything?',
  'ctaSub': 'We sort office printers and shared folders for businesses across Bournemouth, Poole '
            'and Dorset &mdash; usually remotely, in one short session. Call 01202 775566.',
  'serviceName': 'Office Printer and Scan-to-Folder Support',
  'sections': [{'eyebrow': '/01 &mdash; WHY ONLY SCANNING BROKE',
                'h2': 'Why printing still works when scanning to the folder does not',
                'html': '<p>Printing and scanning to a folder are two entirely different '
                        'operations that happen to run through the same box. When you print, your '
                        'PC pushes a job out to the printer and the printer prints it. Scan to '
                        'folder works the other way round: the machine has to reach back across '
                        'the network, <strong>sign in to your PC as though it were a member of '
                        'staff</strong>, and write a file into a shared folder. Different '
                        'direction, different protocol, different permissions &mdash; which is why '
                        'one half can carry on faultlessly while the other stops dead.</p><p>The '
                        'half that stopped is the sign-in. Windows uses a protocol called SMB for '
                        'shared folders, and Microsoft has spent recent years steadily raising the '
                        'bar on what it accepts: connections now have to be signed so they cannot '
                        'be tampered with, anonymous &lsquo;guest&rsquo; logins are refused, and '
                        'the original 1990s version of the protocol is long gone. Office '
                        'multifunction printers are often years behind that curve. The scanning '
                        'half of their firmware tends to be written once, shipped, and rarely '
                        'revisited.</p><p>So the honest summary is this: the update did not break '
                        'your printer. Your scanner is asking exactly the same question it asked '
                        'last week &mdash; Windows has simply stopped accepting that way of '
                        'asking. Nothing is damaged, no scans are lost, and the folder is still '
                        'sitting where it always was.</p>'},
               {'eyebrow': '/02 &mdash; ON THE PC',
                'h2': 'What to check on the computer that holds the folder',
                'html': '<p>Start on the computer &mdash; that is where the change happened. Work '
                        'through these before touching the printer.</p><ul><li><strong>The share '
                        'itself.</strong> Right-click the folder, open Properties and check the '
                        'Sharing tab still shows a network path.</li><li><strong>The network '
                        'profile.</strong> After a large update Windows may treat the network as '
                        'brand new and mark it Public, which switches file and printer sharing '
                        'off. It should be Private.</li><li><strong>The account the scanner signs '
                        'in as.</strong> Does it still exist, and has the password changed or '
                        'expired? If the colleague whose login the scanner borrowed changed theirs '
                        'on Tuesday, scanning died on Tuesday.</li><li><strong>Microsoft account '
                        'switches.</strong> If that user has moved from a local account to a '
                        'Microsoft account, what they type each morning is a PIN, and a PIN cannot '
                        'be used to sign in to a share.</li><li><strong>Blank passwords.</strong> '
                        'An account with no password has never worked over the network &mdash; '
                        'Windows only allows those at the keyboard &mdash; so if that is what the '
                        'address book holds, it was never the thing that was working. What may '
                        'have been working is the share accepting a connection that proved nothing '
                        'at all, and that is one of the doors recent Windows has '
                        'closed.</li></ul><p>One warning about testing: not from a PC that already '
                        'has the share open, since Windows may reuse a login saved months ago. Use '
                        'a different computer and type the scanner&rsquo;s credentials when asked '
                        '&mdash; refused there too and the fault is on the PC, accepted and it is '
                        'the scanner&rsquo;s settings. Check the PC is not asleep at the time, '
                        'either.</p>'},
               {'eyebrow': '/03 &mdash; ON THE SCANNER',
                'h2': 'What to check in the scanner&rsquo;s own address book entry',
                'html': '<p>Every office MFP keeps its scan destinations in an address book. On '
                        'most machines you can edit it far more comfortably from the '
                        'printer&rsquo;s built-in web page &mdash; type its address into a browser '
                        'on any PC on the network &mdash; than on the touchscreen. Note what is '
                        'there before you change anything.</p><p>Any one of the details it holds '
                        'can be the fault.</p><ul><li><strong>Where it is sending.</strong> If the '
                        'destination is stored as a numeric address rather than the PC&rsquo;s '
                        'name, and that PC has since been given a different one, the scanner is '
                        'knocking on an empty door. A renamed share or a tidied-away subfolder '
                        'breaks it the same way.</li><li><strong>The username.</strong> Many '
                        'machines need it written as the PC name, a backslash, then the account '
                        '&mdash; <code>OFFICE-PC\\scanner</code>. Some have a separate domain or '
                        'workgroup box that must be filled in, or deliberately left '
                        'empty.</li><li><strong>The password.</strong> Never trust the row of '
                        'dots; most machines show a placeholder whether or not anything real sits '
                        'behind it. Retype it, and check the field has not truncated it &mdash; '
                        'some accept fewer characters than Windows does.</li></ul><p>While you are '
                        'in there, find the setting for which version of SMB the machine uses and '
                        'choose the newest it offers. Then check the manufacturer&rsquo;s site for '
                        'firmware &mdash; newer SMB support is exactly the sort of thing that '
                        'turns up in a free update.</p>'},
               {'eyebrow': '/04 &mdash; THE FIX THAT LASTS',
                'h2': 'Give the scanner its own account on the PC',
                'html': '<p>The fix that lasts is to stop the scanner borrowing a person&rsquo;s '
                        'login and give it one of its own. On the PC that holds the folder, create '
                        'a local account &mdash; call it <code>scanner</code> &mdash; give it a '
                        'proper password, set that password not to expire, and put those details '
                        'in the printer&rsquo;s address book entry. Two reasons it earns the '
                        'twenty minutes:</p><ul><li><strong>Nobody&rsquo;s password change can '
                        'break it again.</strong> Staff change passwords, hand in notice, have '
                        'accounts disabled. A dedicated account sails through all of that, and a '
                        'refused sign-in named <code>scanner</code> is obvious in the '
                        'logs.</li><li><strong>It can only reach one folder.</strong> Grant it '
                        'access to the scan folder and nothing else, on the sharing permissions '
                        'and the folder&rsquo;s security permissions both. A password held in a '
                        'printer that any member of staff can reach through its admin page &mdash; '
                        'and that has to be written down somewhere to be entered &mdash; should '
                        'not also open your accounts folder.</li></ul><p>Windows 11 Home lacks the '
                        'graphical account tools, so on Home the never-expires part is a one-line '
                        'PowerShell job using <code>Set-LocalUser</code>. Record the password in '
                        'your password manager.</p><p>Meanwhile, scan to email or scan to a USB '
                        'stick keeps the office moving, and scan to email is worth keeping '
                        'permanently as a backstop &mdash; though on Microsoft 365 it needs care, '
                        'as Microsoft has been retiring the simple password-based sending older '
                        'scanners rely on.</p>'},
               {'eyebrow': '/05 &mdash; THE BAD ADVICE',
                'h2': 'The workaround the internet will offer you, and what it costs',
                'html': '<p>Search this problem and you will be told, confidently and often, to '
                        'put SMB1 back, to turn off the requirement for signed connections, or to '
                        'switch on guest access. The guest setting people quote is usually the '
                        'wrong one anyway &mdash; it governs how your PC connects out to other '
                        'machines, not how the scanner connects in &mdash; and the version that '
                        'does apply means anything reaching the PC can write into that share '
                        'without proving who it is. Two of the three will have you scanning by '
                        'lunchtime. All three are a poor trade for a business, and it is worth '
                        'knowing why before anyone does it to your PC.</p><p>None of them are '
                        'scanner settings. They are settings for the whole computer. Turning off '
                        'signing does not loosen one connection from one printer &mdash; it '
                        'loosens every connection that PC makes and accepts, so anyone who gets '
                        'onto your network can sit in the middle of your file traffic. Allowing '
                        'guest logins means anything that reaches the machine can write into that '
                        'share without proving who it is. And SMB1 is the protocol at the heart of '
                        'the ransomware outbreaks that stopped hospitals and factories a few years '
                        'ago.</p><p>The point is the ratio: you weaken every share on that '
                        'computer to accommodate one device that could usually be fixed properly '
                        'instead. If the machine genuinely cannot be brought up to date &mdash; '
                        'and some cannot &mdash; the conversation to have is with whoever supplies '
                        'or maintains it. On a lease or a service contract, keeping it able to '
                        'talk to current Windows is reasonably their job as much as '
                        'yours.</p><p>If you would rather not spend an afternoon on it, this is '
                        'routine work for us: usually one remote session while you watch, or a '
                        'visit anywhere across Bournemouth, Poole and Dorset.</p>'}],
  'faqs': [{'q': 'Why can the printer still print if it can&rsquo;t scan to the folder?',
            'a': 'Printing goes one way and scanning to a folder goes the other. Your PC sends '
                 'print jobs out to the printer, which needs no permission from anything. Scanning '
                 'to a folder means the printer connects back to your PC, proves who it is, and '
                 'writes a file &mdash; a completely separate route with a sign-in at the end of '
                 'it. A Windows update that tightens how sign-ins to shared folders work therefore '
                 'stops scanning without touching printing at all.'},
           {'q': 'Do we need to buy a new printer?',
            'a': 'Almost certainly not. Nothing has failed &mdash; the machine is asking to sign '
                 'in the same way it always has, and Windows has stopped accepting that method. In '
                 'most cases the fix is a dedicated account on the PC and a corrected address book '
                 'entry on the printer, which costs nothing but time. It is worth checking the '
                 'manufacturer&rsquo;s site for firmware too, because newer SMB support does '
                 'sometimes arrive that way. Replacement is a last resort, not a first move.'},
           {'q': 'Can we just uninstall the Windows update?',
            'a': 'There is usually a short window after a large update in which Windows will roll '
                 'it back, and yes, that would restore scanning. We would not advise it. These are '
                 'deliberate security changes rather than bugs, so the update will return and you '
                 'will be in the same position with less time to plan. You would also be leaving '
                 'the machine without recent security fixes in the meantime. Fixing the sign-in '
                 'takes about the same effort and it stays fixed.'},
           {'q': 'Everyone online says to turn SMB1 back on &mdash; is that safe?',
            'a': 'It is the most common advice online and the one we would push back on hardest. '
                 'SMB1 is the old file-sharing protocol that the big ransomware outbreaks spread '
                 'through, and switching it back on affects the whole computer, not just the '
                 'connection from your scanner. You would be reopening a known route into every '
                 'share on that PC to save reconfiguring one address book entry. If your machine '
                 'truly cannot do anything newer, talk to whoever supplies it before you weaken '
                 'the computer.'},
           {'q': 'What can we do today while the folder is being sorted?',
            'a': 'Two things work immediately and neither depends on the shared folder. Scan to '
                 'email sends each scan as an attachment from the printer itself, and scan to a '
                 'USB stick puts the file straight onto a memory stick at the machine. Both are '
                 'worth setting up anyway as a fallback. In the background, ring us on 01202 '
                 '775566 and we will usually sort the folder in one remote session while you watch '
                 '&mdash; or come out to you if the printer needs hands on it.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/printer-wont-scan-to-computer-windows-11/">Printer will not scan to '
                    'your computer</a> &middot; <a '
                    'href="/printer-prints-but-wont-scan-after-new-router/">Prints but will not '
                    'scan after a new router</a> &middot; <a '
                    'href="/shared-folders-not-working-after-windows-11-24h2-update/">Shared '
                    'folders after the 24H2 update</a> &middot; <a '
                    'href="/windows-11-network-credentials-shared-folder/">Windows 11 asking for '
                    'network credentials</a> &middot; <a href="/printer-support/">Printer support</a></p>'},
 {'slug': 'printer-asking-for-admin-password',
  'title': 'Printer Asking for an Admin Password? | 365 Techies',
  'metaDesc': 'Windows asking for an administrator password to install a printer is the security '
              'working. Here is what to do on a work laptop and at home.',
  'ogTitle': 'Printer Keeps Asking for an Admin Password to Install',
  'crumbName': 'Printer Admin Password',
  'eyebrow': '// PRINTER &amp; SCANNER SUPPORT',
  'h1': 'Printer keeps asking for an administrator password to install',
  'lede': 'You have the printer, you have the cable or the network details, and Windows stops you '
          'dead at a box demanding an administrator password &mdash; one you either never had or '
          'cannot remember. It is a maddening place to be, particularly when the same printer is '
          'working perfectly well for everybody else. The reassuring part is that nothing is '
          'broken: that box is Windows protecting itself, and it appears because adding a printer '
          'means installing software. What happens next depends almost entirely on whose computer '
          'it is. Here is the work laptop case, the home PC with the forgotten password, and the '
          'installers that ask over and over.',
  'ctaHead': 'Stuck at the password box?',
  'ctaSub': 'We install printers and untangle account problems for homes and businesses across '
            'Bournemouth, Poole and Dorset, usually remotely and often the same day. Call 01202 '
            '775566.',
  'serviceName': 'Printer Installation Support',
  'sections': [{'eyebrow': '/01 &mdash; WHY IT ASKS',
                'h2': 'Why installing a printer needs an administrator at all',
                'html': '<p>A printer feels like a piece of hardware, so being asked for a '
                        'password to add one comes as a surprise. Adding a printer is not really a '
                        'hardware job, though. It puts a <strong>driver</strong> into Windows '
                        '&mdash; a small piece of software that sits underneath your programs, '
                        'loads with the computer and is allowed to talk directly to the '
                        'machine.</p><p>That is exactly what the administrator barrier exists to '
                        'control. Anything that installs software or writes into the protected '
                        'parts of Windows sets off the same check: the screen dims, everything '
                        'stops, and the computer waits for a person with authority to approve it. '
                        'It is the moment software that should not be there has to announce '
                        'itself.</p><p>Printing in particular has been tightened over the last few '
                        'years. Serious flaws were found in the way Windows handled printer '
                        'drivers, and the response was to require administrator approval to '
                        'install them &mdash; including for printers shared from another computer '
                        'or a server, which staff often used to be able to add on their own. If a '
                        'printer that took one click on an older office PC now stops and demands a '
                        'password, that change is usually why.</p><p>The useful thing to take from '
                        'all this is that the prompt is not a fault. Nothing is broken, the '
                        'printer is fine, and running the installer a fourth time will not wear it '
                        'down. Windows is doing its job and waiting for an answer it can '
                        'accept.</p>'},
               {'eyebrow': '/02 &mdash; WHICH ACCOUNT',
                'h2': 'Standard or administrator, and which password Windows actually wants',
                'html': '<p>Windows has two everyday kinds of account. An '
                        '<strong>administrator</strong> can install software and change how the '
                        'computer works. A <strong>standard</strong> account can use the computer '
                        'normally &mdash; open files, print, browse &mdash; but cannot install '
                        'anything that writes into Windows itself, which is most desktop software '
                        'and every printer driver. Work machines hand out standard accounts on '
                        'purpose; home PCs often end up that way by accident.</p><p>The prompt '
                        'itself is a fair guide. Nearly always, if it offers only Yes or No, you '
                        'are already an administrator and clicking Yes is all that is needed. If '
                        'it asks you to type a user name and password, you are on a standard '
                        'account and Windows wants somebody else&rsquo;s details &mdash; though on '
                        'some managed machines administrators are made to type their password '
                        'too.</p><p>To check properly, open <code>Settings</code>, then '
                        '<code>Accounts</code>, then <code>Your info</code>. If you are an '
                        'administrator, the word appears under your name. <code>Other users</code> '
                        'in the same place lists the other accounts on the machine, and where '
                        'Windows shows an account type you will see it there. On a work laptop '
                        'that page is often restricted, which is itself a fair sign the machine is '
                        'managed.</p><p>Be clear, too, about which password is wanted, because '
                        'this catches people out more than anything else. It is the sign-in '
                        'password of an administrator account <em>on that computer</em>. It is not '
                        'your email password, not the WiFi key, not the code printed on the '
                        'router, and not anything belonging to the printer. If that administrator '
                        'signs in with a Microsoft account, it is the Microsoft password &mdash; '
                        'the one attached to the email address on screen, which people rarely type '
                        'because they use a PIN instead. Where that administrator has a PIN or a '
                        'fingerprint set up on the machine, the prompt will often take one of '
                        'those instead.</p>'},
               {'eyebrow': '/03 &mdash; WORK LAPTOPS',
                'h2': 'If it is a work laptop, ask IT &mdash; and here is exactly what to ask for',
                'html': '<p>If the computer was issued by your employer, assume the password is '
                        'being held back deliberately. The signs are easy to spot: you sign in '
                        'with a work email address, parts of <code>Settings</code> say that some '
                        'settings are managed by your organisation, or <code>Accounts</code> shows '
                        'a work or school connection.</p><p>The reason is not that anyone '
                        'distrusts you. A standard account is one of the strongest defences a '
                        'business has, because anything nasty that reaches your machine inherits '
                        'your rights and no more &mdash; it cannot quietly install itself. UK '
                        'schemes such as Cyber Essentials expect ordinary staff accounts not to '
                        'carry administrator rights. On many managed estates the password is '
                        'different on every machine, so there is nothing to hand out even if they '
                        'wanted to.</p><p>So ask, and make it easy to say yes. One message with '
                        'all of this saves three days of back and forth:</p><ul><li>the '
                        'printer&rsquo;s make and model, exactly as written on the '
                        'front</li><li>whether it plugs into your laptop by USB or sits on the '
                        'office network</li><li>the printer&rsquo;s name or address, if its own '
                        'screen shows one</li><li>whether colleagues already print to it, and '
                        'which of them</li><li>what you actually need to do &mdash; print, scan, '
                        'or both</li></ul><p>What not to do is go hunting for a way round it. '
                        'Driver downloads from search results are a well-worn route for fake '
                        'installers, and on a monitored estate attempts to raise your own rights '
                        'are visible to IT. If you are the owner and the real problem is that '
                        'nobody ever answers, that is a different conversation, and one we are '
                        'glad to have.</p>'},
               {'eyebrow': '/04 &mdash; THE FORGOTTEN ONE',
                'h2': 'At home, when the administrator password has simply been forgotten',
                'html': '<p>The home version is a different problem. The administrator account '
                        'exists and it belongs to you, but the password has gone &mdash; usually '
                        'because the machine was set up years ago and everybody has signed in with '
                        'a PIN or a fingerprint ever since.</p><p>Start by working out what kind '
                        'of account it is. If the administrator signs in with an email address, it '
                        'is a Microsoft account, and the password is the one for that email. '
                        'Microsoft&rsquo;s own account recovery, using the recovery email address '
                        'or mobile number already on the account, is the proper way back in '
                        '&mdash; done on Microsoft&rsquo;s own website and nowhere else.</p><p>If '
                        'it is a local account with no email behind it, there is no online '
                        'recovery, and what is available depends entirely on what was set up the '
                        'day the account was created. Before assuming the worst, look under '
                        '<code>Settings</code>, <code>Accounts</code>, <code>Other users</code>: a '
                        'surprising number of home PCs carry a second administrator account that '
                        'nobody has touched since a shop or a relative set the machine '
                        'up.</p><p>What we will not do is tell you how to strip a password off, '
                        'and we would be wary of anyone who will. Those tools are the same ones a '
                        'thief would use, a fair number of the downloads are malware, and on a '
                        'machine with device encryption switched on you can end up locked out of '
                        'your own photos and documents, asked for a recovery key you have never '
                        'seen.</p><p>If nobody can reach an administrator account at all, the '
                        'printer is the least of it &mdash; nothing can be installed, updated or '
                        'repaired on that machine again. That is worth putting right properly, and '
                        'we collect free of charge.</p>'},
               {'eyebrow': '/05 &mdash; THE ENDLESS PROMPT',
                'h2': 'Why the manufacturer&rsquo;s installer asks over and over, and a leaner way '
                      'round',
                'html': '<p>Manufacturer downloads are rarely a single program. One file typically '
                        'carries the print driver, a separate scanning driver, a status monitor, a '
                        'background service, an updater and sometimes a browser extra. Each part '
                        'that writes into the system can raise its own approval, so on a standard '
                        'account you meet the password box again and again for what looked like '
                        'one installation.</p><p>It also explains the half-finished results. If a '
                        'prompt is cancelled part way through, some installers carry on regardless '
                        'and report success while the printer never appears in the list, which '
                        'quite reasonably leads people to run the whole thing again.</p><p>There '
                        'is a leaner route worth trying first. Windows has printing support built '
                        'in, and many recent printers, network ones especially, can be added '
                        'through <code>Settings</code>, <code>Bluetooth &amp; devices</code>, '
                        '<code>Printers &amp; scanners</code> and <code>Add device</code> without '
                        'the manufacturer&rsquo;s suite at all. It works when Windows already has '
                        'a suitable driver of its own, which covers a lot of recent network '
                        'printers. If it still stops and asks for a password, Windows has to bring '
                        'in a new driver, and that is the same barrier again rather than a fault. '
                        'You also give up extras such as ink warnings or the fancier scanning '
                        'options, but you get printing. And while you wait for anyone, phones and '
                        'tablets can usually print straight to a network printer on their own, '
                        'which has rescued more than one deadline.</p><p>One thing to avoid. '
                        'Plenty of advice online tells you to weaken or switch off the protections '
                        'around driver installation. Those changes undo the fix that closed the '
                        'printing flaws, handing anything running on your machine a clean route to '
                        'install software with full privileges &mdash; a day of convenience traded '
                        'for the exact hole that was shut. On a work laptop they are also very '
                        'likely to be blocked and logged.</p>'}],
  'faqs': [{'q': 'I am the only person who uses this computer, so why am I not the administrator?',
            'a': 'Being the only user does not make you one. Every Windows account is given a type '
                 'when it is created, and it is common for a shop, a relative or an IT team to set '
                 'up an administrator account for themselves and leave you a standard account for '
                 'day to day use. Open <code>Settings</code>, then <code>Accounts</code>, then '
                 '<code>Your info</code> to see which yours is, and <code>Other users</code> to '
                 'see what else exists on the machine. On a work laptop that page is often '
                 'restricted, which is a sign in itself that the machine is managed.'},
           {'q': 'Is there any way to install the printer without the administrator password?',
            'a': 'Sometimes, though not by getting round the password. Windows has its own '
                 'printing support built in, so a modern network printer can often be added '
                 'through <code>Settings</code>, <code>Printers &amp; scanners</code>, <code>Add '
                 'device</code> without the manufacturer&rsquo;s software at all. That works when '
                 'Windows already has a suitable driver of its own; if it still asks for a '
                 'password, a new driver has to be brought in and you are at the same barrier. '
                 'Phones and tablets can usually print to it directly too.'},
           {'q': 'My IT department will not give me the password. Are they being difficult?',
            'a': 'Almost certainly not. Keeping administrator rights away from everyday accounts '
                 'is normal practice and is what UK schemes such as Cyber Essentials expect. On '
                 'many managed laptops the password is unique to that one machine anyway, so there '
                 'is nothing to pass on. The productive move is to ask them to install it for you, '
                 'and to send everything they need in one message &mdash; make, model, how it '
                 'connects, and whether colleagues already print to it.'},
           {'q': 'I typed an administrator password and it still would not install. What now?',
            'a': 'A few things cause that. The account you used may not actually be an '
                 'administrator. The password may belong to a different account from the one named '
                 'on the prompt. An earlier cancelled attempt may have left part of a driver '
                 'behind that the new one trips over. On a work laptop, policy can also block '
                 'driver installs no matter whose password is entered &mdash; that is deliberate, '
                 'and only your IT team can lift it.'},
           {'q': 'Can you fix this remotely, or do you need to take the computer away?',
            'a': 'Most printer installations we deal with are done remotely while you watch, which '
                 'is much the quickest route when an administrator account is available. Where the '
                 'password is genuinely lost, or the machine needs work in front of us, we collect '
                 'free of charge across Bournemouth, Poole and Dorset. A short call on 01202 '
                 '775566 will usually tell you which of the two it is.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a href="/how-to-set-up-a-printer/">How '
                    'to set up a printer</a> &middot; <a '
                    'href="/printer-wont-scan-to-computer-windows-11/">Printer will not scan to '
                    'your computer</a> &middot; <a href="/printer-support/">Printer '
                    'support</a></p>'},
 {'slug': 'printer-wont-scan-to-computer-windows-11',
  'title': "Printer Won't Scan to Computer Windows 11 | 365 Techies",
  'metaDesc': "Printer prints but won't scan on Windows 11? The usual cause is the basic driver "
              'Windows installs. Plain-English fixes from 365 Techies, Bournemouth.',
  'ogTitle': "Printer Won't Scan to Your Computer on Windows 11? Start Here",
  'crumbName': "Printer Won't Scan (Win 11)",
  'eyebrow': '// PRINTER &amp; SCANNER SUPPORT',
  'h1': "Printer Won't Scan to Your Computer on Windows 11? Here's Where to Start",
  'lede': 'Your printer prints without complaint, but ask it to scan and nothing arrives &mdash; '
          'or the scan option has vanished from Windows 11 altogether. It is one of the more '
          'common calls we take, and the cause is rarely the scanner itself. Most cases come down '
          'to the driver Windows fitted on its own, a piece of software that has to be listening '
          'on your PC, or something on the computer quietly blocking the printer&rsquo;s side of '
          'the conversation. Here is how to tell which one you have, in plain English.',
  'ctaHead': 'Still no scanner?',
  'ctaSub': 'We sort scanning faults remotely most weeks &mdash; you watch every step, and '
            'it&rsquo;s no fix, no fee. Call 01202 775566 and we&rsquo;ll take a look together.',
  'serviceName': 'Printer and Scanner Support',
  'sections': [{'eyebrow': '/01 &mdash; START HERE',
                'h2': "First, check you're on the right page",
                'html': '<p>This page is for the everyday version of the problem: the printer '
                        'prints perfectly, but scanning to the computer fails, hangs partway, or '
                        'the scan option has quietly vanished from Windows 11. Nothing obvious '
                        'changed, and the printer&rsquo;s own screen looks normal.</p><p>Before '
                        'you spend an evening on it, three situations belong on a different page. '
                        'If one of these is yours, the advice below will not fix '
                        'it:</p><ul><li><strong>It stopped the day you changed router or '
                        'broadband.</strong> Printing often carries on while scanning stops dead, '
                        'for reasons specific to that change. We have a separate guide for that '
                        'one.</li><li><strong>You are in an office and the scan is meant to land '
                        'in a shared folder on a server or another PC.</strong> That is a '
                        'file-sharing and permissions fault wearing a scanner costume, and it has '
                        'its own guide. One warning in advance: you will find forum advice telling '
                        'you to switch SMB1 back on or allow insecure guest logons. Both are real '
                        'reductions in your security, and Microsoft left them off for good '
                        'reason.</li><li><strong>Windows demands an administrator username and '
                        'password before you can install the software or run the scan.</strong> '
                        'That is a permissions question rather than a scanning one, and again, '
                        'separate page.</li></ul><p>Everything else &mdash; one computer or a '
                        'handful, printer on USB or WiFi, printing happily and scanning not '
                        '&mdash; is what the rest of this page is for.</p>'},
               {'eyebrow': '/02 &mdash; THE USUAL CAUSE',
                'h2': 'The driver Windows fits by itself prints, but often cannot scan',
                'html': '<p>Connect a printer and Windows 11 usually finds it and sets it up '
                        'within seconds, with no disc and no download. That is genuinely clever, '
                        'and it is also where most of these calls begin. The driver Windows fits '
                        'on its own is built around <strong>printing</strong> &mdash; a common '
                        'language nearly every modern printer understands. Scanning is a separate '
                        'half of the machine, and on many models it needs the manufacturer&rsquo;s '
                        'own components before Windows, or any scanning app, can see a scanner at '
                        'all.</p><p>Some newer all-in-ones do scan through Windows&rsquo; built-in '
                        'support with nothing extra installed. Plenty don&rsquo;t, and when they '
                        'don&rsquo;t the symptom is exactly what you have: flawless printing, and '
                        'a scanner no app on the computer can find.</p><p>The check takes a '
                        'minute. In Windows Settings, go to <strong>Bluetooth &amp; '
                        'devices</strong> and then <strong>Printers &amp; scanners</strong>. If '
                        'your machine only ever appears as a printer, and Windows&rsquo; own '
                        'scanning tools say no scanner is connected, you almost certainly have the '
                        'print-only setup.</p><p>The fix is the manufacturer&rsquo;s full software '
                        'package. On the maker&rsquo;s own support site, type in your exact model '
                        'number, choose Windows 11, and download the <strong>full</strong> package '
                        'rather than anything labelled basic or driver-only. Take it from the '
                        'manufacturer and nowhere else: the general driver-download sites are one '
                        'of the surest ways we know of picking up something nasty.</p>'},
               {'eyebrow': '/03 &mdash; WHERE YOU PRESS START',
                'h2': 'Start the scan at the computer, not at the printer',
                'html': '<p>There are two families of scanning app on a Windows 11 PC. Windows has '
                        'its own &mdash; the long-standing Windows Fax and Scan, and the newer '
                        'Scan app, which on some machines has to be fetched from the Microsoft '
                        'Store first. Then there is the manufacturer&rsquo;s app, which arrives '
                        'with that full package. Names vary by brand, but HP Smart, Epson '
                        'ScanSmart, Brother iPrint&amp;Scan and Canon IJ Scan Utility are the sort '
                        'of thing you are looking for.</p><p>Now the part that catches almost '
                        'everybody. Pressing <strong>scan to computer</strong> at the printer is '
                        'not the same operation as scanning from the PC. The printer is not '
                        'posting a file to some general address. It is calling a piece of the '
                        'manufacturer&rsquo;s software that has to be installed on your computer, '
                        'running, and registered to that particular printer. If that helper was '
                        'never installed, or lost its registration after an update or a reinstall, '
                        'or the computer is asleep, the panel simply reports that it cannot find a '
                        'computer. On some makes the option also has to be switched on from the '
                        'software, and it can switch itself back off unless you tick the setting '
                        'that keeps it enabled.</p><p>So try it the other way round: open a '
                        'scanning app on the computer and start the scan from there. If that works '
                        'while the printer&rsquo;s own button doesn&rsquo;t, you have learned '
                        'exactly where the fault sits. Plenty of our customers simply keep the '
                        'computer-first habit, because it is the more dependable of the two.</p>'},
               {'eyebrow': '/04 &mdash; USB OR NETWORK',
                'h2': 'USB and network faults look identical, but they are not',
                'html': '<p>The message on screen is the same either way &mdash; no scanner found '
                        '&mdash; so it helps to know which kind of problem you are '
                        'chasing.</p><p><strong>If the printer is on a USB cable:</strong> plug it '
                        'straight into the computer rather than through a hub, a monitor or a '
                        'laptop dock, and try a different port. Then try a different cable if you '
                        'have one. Printer cables are often long, old and coiled behind furniture, '
                        'and they do fail. If scanning works from cold but stops after the laptop '
                        'has been asleep, Windows&rsquo; USB power-saving is a fair suspect '
                        '&mdash; it can put ports to sleep, and not everything wakes '
                        'gracefully.</p><p><strong>If the printer is on WiFi or a network '
                        'cable:</strong> the two devices have to be on the same network. A printer '
                        'sitting on a guest network, or a laptop connected to one, cannot be '
                        'scanned from no matter how healthy both look. The other common one is a '
                        'moving address: leave a printer switched off for a week and the router '
                        'may hand it a different one when it comes back, while the software on the '
                        'PC is still looking for the old address. Settle that by giving the '
                        'printer a fixed address in its own settings, by reserving one for it on '
                        'the router, or simply by re-running the manufacturer&rsquo;s setup so it '
                        'finds the printer again.</p><p>One quick test is worth a great deal here. '
                        'If you can borrow a USB cable and connect the printer directly for a '
                        'single scan, you will know within two minutes whether you have a scanner '
                        'problem or a network problem.</p>'},
               {'eyebrow': '/05 &mdash; THE QUIET BLOCKER',
                'h2': 'Security suites and VPNs block the very thing scanning needs',
                'html': '<p>Printing is mostly your computer talking outwards. Scanning leans much '
                        'harder on the two devices being able to find and reach each other in both '
                        'directions &mdash; Windows&rsquo; own network scanning and the '
                        'manufacturer&rsquo;s scan-to-PC helper both need the printer to be able '
                        'to reach your computer, not just the other way round. A firewall that '
                        'quietly allows printing while blocking that side of the conversation '
                        'produces exactly the fault we see often, where printing has never missed '
                        'a beat and scanning has never once worked on that machine.</p><p>A full '
                        'internet security suite &mdash; the sort that replaces Windows&rsquo; own '
                        'firewall with one of its own &mdash; will often allow the printing and '
                        'block the rest without saying a word about it. To test that, and only to '
                        'test it, turn the suite&rsquo;s firewall off for a moment while you are '
                        'on your own network at home or in the office, try one scan, then turn it '
                        'straight back on. If the scan worked you have your answer, but leaving '
                        'the firewall off is not the fix. Use the suite&rsquo;s own list of '
                        'trusted devices or allowed applications to permit the printer and its '
                        'scanning software. Same result, none of the exposure.</p><p>VPN software '
                        'on the computer deserves the same test. Many VPN apps send everything '
                        'down the tunnel and cut the computer off from other devices on the local '
                        'network, and your printer is one of those devices. Disconnect the VPN '
                        'briefly and try the scan again.</p><p>If you have worked through all of '
                        'this and the scanner still is not there, that is a fair point to stop. '
                        'This is the sort of job we finish remotely most weeks, in one short '
                        'session, with you watching every step we take.</p>'}],
  'faqs': [{'q': 'Why does my printer print perfectly but refuse to scan?',
            'a': 'Because they are two separate halves of the same machine, and Windows treats '
                 'them separately. The driver Windows installs automatically is built for '
                 "printing, and on many models the scanner needs the manufacturer's own components "
                 'before any app can see it. Printing therefore works from the moment you plug the '
                 'printer in, while scanning waits for software that was never installed. Fitting '
                 "the full package from the maker's support site is the usual cure."},
           {'q': 'The scan option has disappeared since a Windows update. What happened?',
            'a': 'A large Windows update, or anything that removes and re-adds the printer, can '
                 'leave you with the basic setup Windows fits by itself rather than the '
                 "manufacturer's full package. The printer comes back, printing works, and the "
                 'scanning parts quietly do not return. Reinstalling the full software package for '
                 'your exact model normally puts the scan option back, and it is worth removing '
                 'the printer first so the new install starts cleanly.'},
           {'q': 'Is the built-in Windows scanning app enough on its own?',
            'a': 'Windows Fax and Scan and the Scan app are perfectly good for a quick one-page '
                 'scan, but they can only see a scanner whose Windows-side components are already '
                 "installed, so they are not a way round the driver problem. The manufacturer's "
                 'own app usually handles the document feeder, multi-page PDFs and paper sizes '
                 'more comfortably. Install the full package first, then use whichever of the two '
                 'you get on with.'},
           {'q': 'My printer says it cannot find my computer when I press Scan. Why?',
            'a': 'Scanning started at the printer works differently from scanning started at the '
                 "PC. The printer is calling a piece of the manufacturer's software that must be "
                 'installed on your computer, running, and registered to that printer, so if it '
                 'was never installed or has lost its registration, the panel reports no computer '
                 'found. A sleeping computer gives the same message. Try starting the scan from '
                 'the computer instead; if that works, only the listening software needs '
                 'attention.'},
           {'q': 'Could my antivirus really be stopping a scan?',
            'a': 'Yes, and it is one of the more common causes we find. Scanning needs your '
                 'computer to accept an incoming connection from the printer, and a full security '
                 'suite with its own firewall will often permit printing while silently blocking '
                 'that. Turn the firewall off briefly as a test only, then put it straight back on '
                 "and add the printer and its software to the suite's trusted list instead. A VPN "
                 'app on the computer can cut off local devices in much the same way.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/printer-prints-but-wont-scan-after-new-router/">If it started after a '
                    'new router</a> &middot; <a '
                    'href="/scan-to-folder-stopped-working-after-windows-update/">If it scans to a '
                    'shared network folder</a> &middot; <a '
                    'href="/printer-asking-for-admin-password/">Blocked by an admin password</a> '
                    '&middot; <a href="/printer-support/">Printer support</a></p>'}]
