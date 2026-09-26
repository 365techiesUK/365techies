# Choice tiles for the email pages' first screen (26 Sep 2026 review): (colour, icon, title, line, tag, href).
# Two per page when it has a step helper and closing panel (build_extra adds "Fix it with me" and
# "Fix it for me" in front), four when it has neither.
EMAIL_HERO_TILES = {
 'business-email-down-domain-expired': [
  ('hp-c-biz', 'alert', 'Is the domain the problem?', 'A quick WHOIS and MX check confirms it', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'clock', 'Renew before it&rsquo;s gone', '.uk gives 90 days; .com about 30 before extra fees', 'KNOW YOUR WINDOW', '#s3'),
 ],
 'business-email-when-closing-your-company': [
  ('hp-c-fix', 'mail', 'Copy the mail first', 'Every mailbox, shared ones too, before anything goes', 'BEFORE YOU CANCEL', '#s3'),
  ('hp-c-care', 'user', 'Who controls the domain?', 'It takes longest to unpick, so start it now', 'START ON DAY ONE', '#s2'),
  ('hp-c-biz', 'briefcase', 'Keep the domain or let it go', 'Cheap forwarding, or a planned, tidy goodbye', 'TWO HONEST CHOICES', '#s5'),
  ('hp-c-buy', 'cloud', 'Want us to copy the mail?', 'A full, checked copy of every mailbox', 'EMAIL MIGRATION', '/email-migration/'),
 ],
 'cant-open-attachments-in-outlook': [
  ('hp-c-biz', 'laptop', 'Save it to your Desktop', 'Then open it from there, away from Outlook', 'TRY THIS FIRST', '#s1'),
  ('hp-c-buy', 'wrench', 'Nothing opens at all?', 'Empty Outlook&rsquo;s hidden temporary files folder', 'HIDDEN FOLDER', '#s3'),
 ],
 'cant-send-btinternet-email-new-outlook': [
  ('hp-c-biz', 'mail', 'The right BT send settings', 'mail.btinternet.com, port 465, SSL, authentication on', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'alert', 'Left BT Broadband?', 'Free Basic email won&rsquo;t work in Outlook at all', 'EX-BT CUSTOMER?', '#s3'),
 ],
 'emails-on-computer-but-not-phone': [
  ('hp-c-biz', 'mail', 'Run the three quick checks', 'Webmail, refresh, search: find which cause you have', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'phone', 'Set up email on your phone', 'Add the account again the right way, as IMAP', 'STEP BY STEP', '/how-to-set-up-email-on-your-phone/'),
 ],
 'how-to-add-gmail-to-outlook': [
  ('hp-c-biz', 'user', 'Try Sign in with Google', 'Add Gmail the simple way and skip app passwords', 'CHECK THIS FIRST', '#s1'),
  ('hp-c-buy', 'shield', 'Make a Google app password', 'Switch on 2-Step Verification, then create one', 'MANUAL SETUP', '#s2'),
 ],
 'how-to-go-back-to-classic-outlook': [
  ('hp-c-biz', 'power', 'Flip the toggle off', 'Top-right of new Outlook, then Switch back', 'QUICKEST WAY', '#s1'),
  ('hp-c-buy', 'wrench', 'No toggle to flip?', 'Help tab, Start menu or one registry value', '3 ALTERNATIVES', '#s2'),
 ],
 'new-outlook-blank-screen': [
  ('hp-c-biz', 'monitor', 'Work through the five fixes', 'Graphics driver, cache, add-ins, in the safe order', 'START HERE', '#s2'),
  ('hp-c-buy', 'mail', 'Switch back to classic', 'Keep reading your email while the new one is fixed', 'WORKAROUND', '/how-to-go-back-to-classic-outlook/'),
 ],
 'new-outlook-emails-stuck-in-drafts': [
  ('hp-c-biz', 'mail', 'Get it sending again', 'Resend, update, then re-add the account', 'START GENTLE', '#s4'),
  ('hp-c-buy', 'monitor', 'Back to classic Outlook', 'It has a proper Outbox you can actually see', 'NEEDS OFFICE LICENCE', '/how-to-go-back-to-classic-outlook/'),
 ],
 'new-outlook-missing-features': [
  ('hp-c-biz', 'book', 'What&rsquo;s still missing', 'Old add-ins, some rules, PST files: check your list', 'CHECK THIS FIRST', '#s1'),
  ('hp-c-buy', 'monitor', 'Switch back to classic', 'One toggle, top right, and your mail stays put', 'ONE TOGGLE', '#s2'),
 ],
 'new-outlook-no-send-receive-button': [
  ('hp-c-biz', 'mail', 'Press F9 to sync now', 'Or View, then Sync: checks the server straight away', 'NO BUTTON NEEDED', '#s1'),
  ('hp-c-buy', 'monitor', 'Want the button back?', 'Classic Outlook still has Send/Receive', 'CLASSIC OUTLOOK', '/how-to-go-back-to-classic-outlook/'),
 ],
 'new-outlook-not-syncing': [
  ('hp-c-biz', 'mail', 'Force a sync right now', 'Press F9, then check the offline setting', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'clock', 'Still stalling every hour?', 'Re-add the account or go back to classic', 'IF IT KEEPS HAPPENING', '#s3'),
 ],
 'new-outlook-only-showing-recent-emails': [
  ('hp-c-biz', 'cloud', 'Is my old mail still there?', 'Webmail shows what&rsquo;s really on the server', '2 MINUTES', '#s2'),
  ('hp-c-buy', 'clock', 'Widen the sync window', 'Set Outlook to keep the longest range of mail', 'THE SETTING', '#s3'),
 ],
 'new-outlook-search-not-working': [
  ('hp-c-biz', 'clock', 'Older emails not found?', 'Widen Days of email to save, then let it sync', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'monitor', 'Using classic Outlook?', 'Classic searches a PC index you can rebuild', 'CLASSIC OUTLOOK?', '/outlook-search-not-finding-old-emails/'),
 ],
 'new-outlook-wont-open': [
  ('hp-c-biz', 'wrench', 'Rename two cache folders', 'Olk and OneAuth &mdash; your email stays safe', 'REVERSIBLE FIX', '#s2'),
  ('hp-c-buy', 'monitor', 'Opens to a blank screen?', 'Graphics, cache or add-in fixes for a white window', 'SIMILAR PROBLEM', '/new-outlook-blank-screen/'),
 ],
 'onedrive-full-cant-send-email': [
  ('hp-c-biz', 'cloud', 'Get back under the limit', 'Find the big files, move them off, empty the bin', 'FASTEST WINS FIRST', '#s4'),
  ('hp-c-buy', 'shield', 'Scary &lsquo;files erased&rsquo; email?', 'Check it&rsquo;s genuine without clicking its links', 'SCAM CHECK', '#s3'),
 ],
 'outlook-add-in-not-loading': [
  ('hp-c-biz', 'wrench', 'Switch the add-in back on', 'Re-tick it, or rescue it from Disabled Items', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'monitor', 'Moved to the new Outlook?', 'Older add-ins only work in classic Outlook', 'NEW OUTLOOK?', '/how-to-go-back-to-classic-outlook/'),
 ],
 'outlook-app-asking-to-sign-in-android': [
  ('hp-c-biz', 'wrench', 'Clear the Outlook cache', 'Safe to do &mdash; it doesn&rsquo;t remove your account', 'TRY THIS FIRST', '#s2'),
  ('hp-c-buy', 'alert', 'Why it keeps looping', 'Cache, battery savers, the clock or your network', '4 COMMON CAUSES', '#s1'),
 ],
 'outlook-app-crashing-android': [
  ('hp-c-biz', 'phone', 'Update WebView and Chrome', 'Microsoft&rsquo;s own first fix, from the Play Store', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'mail', 'Opens but won&rsquo;t sync?', 'Not crashing, just not updating? Start here', 'NOT SYNCING?', '/outlook-not-syncing-android/'),
 ],
 'outlook-autocomplete-not-working': [
  ('hp-c-biz', 'wrench', 'Switch suggestions back on', 'One tick box under File, Options, Mail', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'user', 'Contacts gone as well?', 'If your address book is missing too, start here', 'CONTACTS MISSING?', '/outlook-contacts-missing/'),
 ],
 'outlook-calendar-appointments-disappearing': [
  ('hp-c-biz', 'calendar', 'Check Outlook on the web', 'It shows if they&rsquo;re hidden or truly deleted', 'CHECK THIS FIRST', '#s1'),
  ('hp-c-buy', 'wrench', 'Hidden by a view filter?', 'Reset the view &mdash; your appointments stay put', 'NOTHING DELETED', '#s2'),
 ],
 'outlook-calendar-not-syncing': [
  ('hp-c-biz', 'calendar', 'Is it a local PST calendar?', 'Only account calendars can reach your phone', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'phone', 'Email syncs, no calendar?', 'IMAP and POP carry email only, not calendars', 'IMAP OR POP?', '#s1'),
 ],
 'outlook-can-send-but-not-receive': [
  ('hp-c-biz', 'clock', 'Run the quick checks', 'Work Offline, F9, Junk, the Other tab, a full mailbox', '5 MINUTES', '#s2'),
  ('hp-c-buy', 'wrench', 'Check the incoming server', 'Right server name and port, and no rule moving mail', 'IF STILL NOTHING', '#s3'),
 ],
 'outlook-cannot-open-the-outlook-window': [
  ('hp-c-biz', 'wrench', 'Run /resetnavpane', 'Rebuilds the layout file &mdash; your email is untouched', 'TRY THIS FIRST', '#s2'),
  ('hp-c-buy', 'user', 'Make a fresh profile', 'The last resort, done without losing your mail', 'LAST RESORT', '/recreate-outlook-profile-without-losing-emails/'),
 ],
 'outlook-cant-add-account-new-outlook': [
  ('hp-c-biz', 'wrench', 'Add it the right way', 'IMAP on, normal sign-in, app password only if asked', 'STEP BY STEP', '#s2'),
  ('hp-c-buy', 'mail', 'Got a BT email address?', 'BT email has its own fix for the new Outlook', 'BTINTERNET.COM', '/btinternet-email-wont-add-to-new-outlook/'),
 ],
 'outlook-cant-sign-in': [
  ('hp-c-biz', 'shield', 'Try a private window', 'Rules out a stale sign-in cookie in seconds', 'START HERE', '#s2'),
  ('hp-c-buy', 'monitor', 'Desktop app keeps looping?', 'Clear the saved sign-in and reset new Outlook', 'DESKTOP OUTLOOK', '/outlook-stuck-in-sign-in-loop/'),
 ],
 'outlook-com-not-syncing': [
  ('hp-c-biz', 'laptop', 'Using the Outlook program?', 'Work Offline off, password re-entered, then F9', 'DESKTOP APP', '#s2'),
  ('hp-c-buy', 'mail', 'Check where mail is hiding', 'Rules, Junk, blocked senders and a full mailbox', 'IN THE BROWSER', '#s3'),
 ],
 'outlook-contacts-missing': [
  ('hp-c-biz', 'cloud', 'Are they really gone?', 'Check Outlook on the web &mdash; if there, they&rsquo;re safe', 'CHECK THIS FIRST', '#s1'),
  ('hp-c-buy', 'user', 'Get them back on screen', 'Right folder, reset view, then a fresh sync', '6 STEPS', '#s2'),
 ],
 'outlook-data-file-cannot-be-accessed': [
  ('hp-c-biz', 'wrench', 'Rebuild the offline file', 'Rename the .ost and Outlook makes a fresh one', 'IMAP / MICROSOFT 365', '#s2'),
  ('hp-c-buy', 'alert', 'On a POP account?', 'Your .pst is the only copy &mdash; don&rsquo;t delete it', 'POP EMAIL?', '/outlook-pst-cannot-be-accessed/'),
 ],
 'outlook-error-0x8004010b': [
  ('hp-c-biz', 'wrench', 'Set the right data file', 'Data Files tab, Set as Default, restart Outlook', 'START HERE', '#s2'),
  ('hp-c-buy', 'shield', 'Rebuilding the profile?', 'Back up any local-only PST files first', 'PROTECT YOUR DATA', '#s3'),
 ],
 'outlook-error-0x8004060c': [
  ('hp-c-biz', 'gauge', 'Free space, then compact', 'Empty Deleted Items, clear big files, Compact Now', 'THE KEY STEP', '#s2'),
  ('hp-c-buy', 'alert', 'Deleted mail, still full?', 'Deleting alone doesn&rsquo;t shrink the file', 'READ THIS FIRST', '#s1'),
 ],
 'outlook-error-0x80040610': [
  ('hp-c-biz', 'mail', 'Clear the stuck message', 'Go offline, move it to Drafts, shrink the attachment', 'DO THIS FIRST', '#s2'),
  ('hp-c-buy', 'wrench', 'Error keeps coming back?', 'Repair the data file with scanpst, then compact it', 'IF IT RETURNS', '#s3'),
 ],
 'outlook-error-0x80042108': [
  ('hp-c-biz', 'wrench', 'Check server name and port', 'Then test the account, the antivirus and the clock', 'STEP BY STEP', '#s2'),
  ('hp-c-buy', 'shield', 'Worried about lost email?', 'It&rsquo;s all still waiting safely on the server', 'NOTHING IS LOST', '#s1'),
 ],
 'outlook-error-0x80042109': [
  ('hp-c-biz', 'wrench', 'Fix the outgoing settings', 'Tick authentication, then set the right port', 'STEP BY STEP', '#s2'),
  ('hp-c-buy', 'mail', 'BT email won&rsquo;t send?', 'BT has its own settings: see the BT fix', 'BTINTERNET.COM', '/cant-send-btinternet-email-new-outlook/'),
 ],
 'outlook-error-0x800ccc0e': [
  ('hp-c-biz', 'wrench', 'Check server and ports', 'IMAP 993, POP 995, SMTP 587 or 465, plus one tick', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'user', 'Password recently changed?', 'Clear the old password Outlook is still using', 'PASSWORD CHANGED?', '/outlook-password-not-working/'),
 ],
 'outlook-error-0x800ccc1a': [
  ('hp-c-biz', 'wrench', 'Check the secure ports', 'The port and the encryption setting must agree', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'shield', 'Gmail or Microsoft account?', 'Remove and re-add it for the modern sign-in', 'RE-ADD THE ACCOUNT', '#s3'),
 ],
 'outlook-error-0x800ccc78': [
  ('hp-c-biz', 'mail', 'Turn on outgoing sign-in', 'Tick &lsquo;My outgoing server requires authentication&rsquo;', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'wrench', 'Still stuck in the Outbox?', 'More reasons Outlook won&rsquo;t send, and the fixes', 'NOT SENDING?', '/outlook-stuck-in-outbox/'),
 ],
 'outlook-error-0x800ccc90': [
  ('hp-c-biz', 'user', 'Changed your password?', 'Retype the new one in Outlook&rsquo;s account settings', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'mail', 'Using Gmail in Outlook?', 'Gmail needs Google sign-in or an app password', 'GMAIL USER?', '/how-to-add-gmail-to-outlook/'),
 ],
 'outlook-indexing-stuck': [
  ('hp-c-biz', 'gauge', 'Rebuild the search index', 'Then leave Outlook open until it finishes', 'START HERE', '#s2'),
  ('hp-c-buy', 'book', 'Search misses some emails?', 'Widen the scope and lift the 250-result cap', 'MISSING RESULTS?', '/outlook-search-not-returning-all-results/'),
 ],
 'outlook-keeps-asking-for-password': [
  ('hp-c-biz', 'user', 'Clear the saved password', 'Remove Outlook&rsquo;s old logins in Credential Manager', 'STEP BY STEP', '#s2'),
  ('hp-c-buy', 'mail', 'Virgin Media address?', 'Outlook needs a Virgin Media app password', 'VIRGINMEDIA.COM', '/virgin-media-email-wont-add-to-new-outlook/'),
 ],
 'outlook-modern-authentication-not-working': [
  ('hp-c-biz', 'user', 'Update Office, clear logins', 'Two steps you can do yourself on your own PC', 'NO ADMIN NEEDED', '#s2'),
  ('hp-c-buy', 'monitor', 'Using the new Outlook?', 'Sign-in loops there have a different fix', 'NEW OUTLOOK?', '/outlook-stuck-in-sign-in-loop/'),
 ],
 'outlook-needs-to-repair-your-profile': [
  ('hp-c-biz', 'user', 'Build a fresh mail profile', 'Server mail re-downloads, so nothing is lost', 'THE RELIABLE FIX', '#s2'),
  ('hp-c-buy', 'alert', 'Information store error?', 'Two quick fixes to try before a new profile', 'TRY THESE FIRST', '#s3'),
 ],
 'outlook-not-responding': [
  ('hp-c-biz', 'alert', 'Frozen right now?', 'Wait a minute, then force-close and try safe mode', 'START HERE', '#s2'),
  ('hp-c-buy', 'shield', 'Is my email at risk?', 'Almost none of these steps touch your mail', 'SAFETY CHECK', '#s3'),
 ],
 'outlook-not-sending-emails': [
  ('hp-c-biz', 'wrench', 'Check the outgoing settings', 'Server name, port and the authentication tick', 'STEP BY STEP', '#s2'),
  ('hp-c-buy', 'mail', 'BT email won&rsquo;t send?', 'BT has its own settings: see the BT fix', 'BTINTERNET.COM', '/cant-send-btinternet-email-new-outlook/'),
 ],
 'outlook-not-showing-new-emails': [
  ('hp-c-biz', 'mail', 'Force the sync first', 'Press F9, check Work Offline, reset the view', 'INSTANT AND SAFE', '#s2'),
  ('hp-c-buy', 'cloud', 'Rebuild the offline copy', 'Clear offline items or rebuild the OST cache', 'IF IT PERSISTS', '#s3'),
 ],
 'outlook-not-syncing': [
  ('hp-c-biz', 'power', 'Turn off Work Offline', 'One click on the Send / Receive tab, then press F9', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'monitor', 'Using the new Outlook?', 'Sync problems there have their own fix', 'NEW OUTLOOK?', '/new-outlook-not-syncing/'),
 ],
 'outlook-not-syncing-android': [
  ('hp-c-biz', 'power', 'Set battery to Unrestricted', 'Stop Android putting Outlook to sleep', 'MOST IMPORTANT STEP', '#s2'),
  ('hp-c-buy', 'alert', 'Why it only syncs when open', 'Battery savers, data limits and swiping it closed', 'WHY IT HAPPENS', '#s1'),
 ],
 'outlook-opens-then-closes': [
  ('hp-c-biz', 'wrench', 'Start it in Safe Mode', 'One test tells you if an add-in is to blame', 'CHECK THIS FIRST', '#s1'),
  ('hp-c-buy', 'monitor', 'New Outlook closing too?', 'Reset its cache folders &mdash; your mail stays safe', 'NEW OUTLOOK', '#s3'),
 ],
 'outlook-ost-file-corrupt': [
  ('hp-c-biz', 'wrench', 'Rebuild the OST safely', 'Rename it and let Outlook re-download your mail', 'RENAME, DON&rsquo;T DELETE', '#s2'),
  ('hp-c-buy', 'shield', 'Error keeps coming back?', 'Stop antivirus locking the file mid-sync', 'STOP IT RECURRING', '#s3'),
 ],
 'outlook-out-of-office-not-working': [
  ('hp-c-biz', 'user', 'Is your account POP or IMAP?', 'The button only exists on Microsoft 365 mail', 'CHECK THIS FIRST', '#s1'),
  ('hp-c-buy', 'calendar', 'Set it up the right way', 'Dates, external replies, or a POP/IMAP workaround', 'ALL ACCOUNT TYPES', '#s2'),
 ],
 'outlook-password-not-working': [
  ('hp-c-biz', 'cloud', 'Does webmail accept it?', 'Prove your password is fine in 30 seconds', 'CHECK THIS FIRST', '#s1'),
  ('hp-c-buy', 'wrench', 'Clear the saved password', 'Remove old Outlook entries in Credential Manager', 'A COUPLE OF MINUTES', '#s2'),
 ],
 'outlook-problems': [
  ('hp-c-fix', 'book', 'Find your problem', 'Every Outlook fix, grouped by what you&rsquo;re seeing', 'START HERE', '#s1'),
  ('hp-c-care', 'clock', 'New Outlook not syncing?', 'Force a sync and stop it stalling again', 'NEW OUTLOOK', '/new-outlook-not-syncing/'),
  ('hp-c-biz', 'user', 'Keeps asking for password?', 'Why Outlook loops on your password, and the fix', 'PASSWORD LOOP', '/outlook-keeps-asking-for-password/'),
  ('hp-c-buy', 'phone', 'Rather we just fix it?', 'Free remote check, then a price agreed first', 'FROM &pound;20', '/remote-support/'),
 ],
 'outlook-pst-cannot-be-accessed': [
  ('hp-c-biz', 'wrench', 'Find, unlock and repair it', 'Check the path, move it out of OneDrive, run scanpst', '5 STEPS IN ORDER', '#s2'),
  ('hp-c-buy', 'alert', 'Scanpst won&rsquo;t run?', 'What to do when the repair tool fails', 'IF REPAIR FAILS', '/outlook-scanpst-not-working/'),
 ],
 'outlook-rules-not-working': [
  ('hp-c-biz', 'alert', 'Rules stop on their own?', 'Check the size limit and client-only rules', 'CHECK THIS FIRST', '#s1'),
  ('hp-c-buy', 'monitor', 'Using the new Outlook?', 'Rules work differently there &mdash; see this guide', 'NEW OUTLOOK?', '/outlook-rules-not-working-new-outlook/'),
 ],
 'outlook-rules-not-working-new-outlook': [
  ('hp-c-biz', 'wrench', 'Rebuild your rules', 'Recreate them in Settings, switch on, run on old mail', 'STEP BY STEP', '#s2'),
  ('hp-c-buy', 'monitor', 'Need a desktop-only rule?', 'Scripts and PST moves still need classic Outlook', 'CLASSIC OUTLOOK', '/how-to-go-back-to-classic-outlook/'),
 ],
 'outlook-running-slow': [
  ('hp-c-biz', 'gauge', 'Test it in safe mode', 'Fast with add-ins off? Then an add-in is the cause', 'QUICK TEST', '#s1'),
  ('hp-c-buy', 'wrench', 'Slim down the data file', 'Empty bulky folders and trim the offline copy', 'DEEPER FIXES', '#s2'),
 ],
 'outlook-scanpst-not-working': [
  ('hp-c-biz', 'wrench', 'Won&rsquo;t recognise the file?', 'Clear read-only, then browse to the real file', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'cloud', 'Repairing an .ost file?', 'Rebuild it from the server instead of ScanPST', 'OST FILE?', '/outlook-ost-file-corrupt/'),
 ],
 'outlook-search-greyed-out': [
  ('hp-c-biz', 'wrench', 'Two quick checks first', 'Start Windows Search, stop running as admin', 'CHECK THESE FIRST', '#s1'),
  ('hp-c-buy', 'book', 'Rebuild the search index', 'When search runs but finds little or nothing', 'RUNS IN BACKGROUND', '#s2'),
 ],
 'outlook-search-not-finding-old-emails': [
  ('hp-c-biz', 'clock', 'Only the last year showing?', 'Move the offline slider to All and let it sync', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'monitor', 'Using the new Outlook?', 'It has no index to rebuild &mdash; the fix is different', 'NEW OUTLOOK?', '/new-outlook-search-not-working/'),
 ],
 'outlook-search-not-returning-all-results': [
  ('hp-c-biz', 'gauge', 'Search every mailbox', 'Widen the scope, then lift the 250-result cap', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'monitor', 'Using the new Outlook?', 'These settings are classic-only; see the new guide', 'NEW OUTLOOK?', '/new-outlook-search-not-working/'),
 ],
 'outlook-shared-mailbox-not-showing': [
  ('hp-c-biz', 'clock', 'Only just given access?', 'Fully restart Outlook and give it up to an hour', 'CHECK THIS FIRST', '#s1'),
  ('hp-c-buy', 'briefcase', 'Add it by hand', 'Steps for classic Outlook, then the new Outlook', 'WORK EMAIL', '#s2'),
 ],
 'outlook-shared-mailbox-sent-items': [
  ('hp-c-biz', 'briefcase', 'Fix it for the whole team', 'One Microsoft 365 setting saves sent mail centrally', 'RECOMMENDED', '#s2'),
  ('hp-c-buy', 'wrench', 'No admin access?', 'A registry setting fixes it on one PC', 'ONE PC ONLY', '#s3'),
 ],
 'outlook-signature-not-showing': [
  ('hp-c-biz', 'mail', 'Missing on replies?', 'Set it for new messages AND replies in classic Outlook', 'CLASSIC OUTLOOK', '#s2'),
  ('hp-c-buy', 'monitor', 'New Outlook or webmail?', 'Turn it on under Settings, Accounts, Signatures', 'NEW OUTLOOK', '#s3'),
 ],
 'outlook-stuck-in-outbox': [
  ('hp-c-biz', 'mail', 'Clear the stuck message', 'Go offline, move it to Drafts, swap the file for a link', 'STEP BY STEP', '#s2'),
  ('hp-c-buy', 'alert', 'Nothing sends at all?', 'That&rsquo;s usually the outgoing server, not the Outbox', 'NOT JUST ONE EMAIL?', '/outlook-not-sending-emails/'),
 ],
 'outlook-stuck-in-sign-in-loop': [
  ('hp-c-biz', 'user', 'Clear, reset and re-add', 'Five steps, in order, that break the sign-in loop', 'START HERE', '#s2'),
  ('hp-c-buy', 'mail', 'Using classic Outlook?', 'Password prompts in older Outlook have their own fix', 'CLASSIC OUTLOOK', '/outlook-keeps-asking-for-password/'),
 ],
 'outlook-stuck-on-loading-profile': [
  ('hp-c-biz', 'wrench', 'End the stuck Office tasks', 'Clear half-closed processes in Task Manager', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'alert', 'Hangs in safe mode too?', 'The next steps when safe mode won&rsquo;t open', 'SAFE MODE FAILS?', '/outlook-wont-open-in-safe-mode/'),
 ],
 'outlook-wont-open-after-update': [
  ('hp-c-biz', 'wrench', 'Start it in safe mode', 'Windows key + R, type outlook /safe, press Enter', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'monitor', 'Using the new Outlook?', 'These steps are for classic &mdash; new has its own', 'NEW OUTLOOK?', '/new-outlook-wont-open/'),
 ],
 'outlook-wont-open-in-safe-mode': [
  ('hp-c-biz', 'wrench', 'Repair Office first', 'Quick Repair, then Online Repair if it&rsquo;s still stuck', 'START HERE', '#s2'),
  ('hp-c-buy', 'shield', 'Worried about your emails?', 'What&rsquo;s safe to touch, and what to back up first', 'PROTECT YOUR DATA', '#s3'),
 ],
 'outlook-working-offline-wont-turn-off': [
  ('hp-c-biz', 'power', 'Click Work Offline once', 'Send / Receive tab, far right &mdash; un-highlight it', 'ONE CLICK', '#s1'),
  ('hp-c-buy', 'wifi', 'Button greyed out?', 'Five checks, from your internet to a fresh profile', 'IF IT WON&rsquo;T BUDGE', '#s2'),
 ],
 'plusnet-email-wont-add-to-new-outlook': [
  ('hp-c-biz', 'mail', 'Type the settings in by hand', 'IMAP and SMTP details, and which password to use', 'NO APP PASSWORD', '#s2'),
  ('hp-c-buy', 'cloud', 'Move it to Gmail instead', 'A mailbox that won&rsquo;t move again after Greenby', 'PLUSNET IS CLOSING', '/move-plusnet-email-to-gmail/'),
 ],
 'recreate-outlook-profile-without-losing-emails': [
  ('hp-c-biz', 'alert', 'Got a POP account?', 'Back up the .pst first &mdash; it may be the only copy', 'CHECK THIS FIRST', '#s1'),
  ('hp-c-buy', 'wrench', 'Make a fresh profile', 'Safe steps from Control Panel, old one kept', '7 STEPS', '#s2'),
 ],
 'sage-50-wont-email-invoices-outlook': [
  ('hp-c-biz', 'briefcase', 'Put classic Outlook back', 'Toggle off, set the default app, point Sage at it', '3 STEPS', '#s3'),
  ('hp-c-buy', 'mail', 'Send without Outlook', 'Set Sage to Webmail (SMTP) and skip Outlook', 'LONGER-TERM FIX', '#s4'),
 ],
 'sky-email-wont-add-to-new-outlook': [
  ('hp-c-biz', 'mail', 'The settings Sky publishes', 'imap.tools.sky.com 993 and smtp.tools.sky.com 465, SSL', 'CHECK THIS FIRST', '#s4'),
  ('hp-c-buy', 'clock', 'Left Sky broadband?', 'Keep your @sky.com address &mdash; sign in every 6 months', 'EX-SKY CUSTOMER?', '#s6'),
 ],
 'take-over-email-domain-after-buying-business': [
  ('hp-c-fix', 'briefcase', 'Ask the seller for this', 'The logins and details to get before you complete', 'BEFORE COMPLETION', '#s4'),
  ('hp-c-care', 'shield', 'Secure the domain first', 'It&rsquo;s the master key to the business email', 'IF YOU CAN ONLY DO ONE', '#s2'),
  ('hp-c-biz', 'alert', 'Nobody has the logins?', 'Often recoverable &mdash; here&rsquo;s the order to work in', 'NO LOGINS', '#s5'),
  ('hp-c-buy', 'cloud', 'Moving the mail across?', 'Copy the old mailboxes before switching over', 'EMAIL MIGRATION', '/email-migration/'),
 ],
 'talktalk-email-not-working-android': [
  ('hp-c-biz', 'mail', 'Check webmail first', 'Two minutes tells you: the account or the phone?', 'CHECK THIS FIRST', '#s2'),
  ('hp-c-buy', 'phone', 'The setup that works now', 'Remove it and re-add it by hand as IMAP', 'IMAP, NOT POP', '#s3'),
 ],
 'virgin-media-email-wont-add-to-new-outlook': [
  ('hp-c-biz', 'phone', 'Get the app password first', 'Made in the My Virgin Media app, not in webmail', 'OUTLOOK NEEDS IT', '#s3'),
  ('hp-c-buy', 'alert', 'Virgin email is moving', 'Keep paying Junara, or move to an address you own?', 'ACT BEFORE THE DATE', '/virgin-media-email-moving-to-junara/'),
 ],
 'youve-been-hacked-email-bitcoin-scam': [
  ('hp-c-fix', 'shield', 'What to do right now', 'Don&rsquo;t pay, report it, change any reused password', 'START HERE', '#s3'),
  ('hp-c-care', 'alert', 'Already paid or clicked?', 'Ring your bank on 159, then get the PC checked', 'ACT TODAY', '#s4'),
  ('hp-c-biz', 'book', 'Is any of it true?', 'What the email claims, line by line', 'IT&rsquo;S A BLUFF', '#s1'),
  ('hp-c-buy', 'wrench', 'Scam recovery service', 'A remote check, clean-up and a report for your bank', 'IF YOU CLICKED', '/scam-recovery/'),
 ],
}
