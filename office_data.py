# Auto-assembled 2026-07-17 (audited): Microsoft Office wave 1 - OneDrive hub + 11 pages.
OFFICE_PAGES = [
 {
  "slug": "onedrive-problems",
  "title": "OneDrive Problems &amp; Fixes &mdash; Files Moved, Missing, Full or Stuck | 365 Techies",
  "metaDesc": "OneDrive moved your files, hid them or stopped syncing? Start here. Plain-English triage from a family-run Dorset firm supporting Microsoft software since 1995. Remote fixes from &pound;20.",
  "ogTitle": "OneDrive Problems: Files Moved, Missing, Full or Stuck &mdash; Start Here",
  "eyebrow": "OneDrive Help &mdash; Plain English, No Panic",
  "h1": "OneDrive problems, sorted &mdash; files moved, missing, full or stuck",
  "lede": "OneDrive did something to your files and you didn&rsquo;t ask it to. Take a breath &mdash; in almost every case your files are NOT lost, they&rsquo;ve just been moved, hidden or paused. Pick your symptom below and we&rsquo;ll walk you through the fix, the same way we&rsquo;ve been explaining Microsoft software since 1995 &mdash; including ten-plus years teaching it at our own Dorset Microsoft Education Resource Centre.",
  "chips": [
   "Files moved or missing",
   "Won&rsquo;t sync or account full",
   "Remote fixes from &pound;20"
  ],
  "ctaHead": "OneDrive done something odd? Let&rsquo;s untangle it together.",
  "ctaSub": "Remote help from &pound;20 &mdash; we always call before we connect, and you watch everything we do. Family-run in Bournemouth, 4.9 on Google, Monday to Friday 9am&ndash;5pm. Call 01202 775566 or text 07520 615332.",
  "sections": [
   {
    "eyebrow": "Start here",
    "h2": "Pick the symptom &mdash; each one has its own full fix page",
    "html": "<p>OneDrive ships on every Windows 11 PC, and it doesn&rsquo;t always wait to be asked before it starts rearranging things. Microsoft&rsquo;s own help for it is scattered across half a dozen separate articles, so we&rsquo;ve done the triage for you. Pick the line that sounds most like your problem &mdash; each links to a step-by-step page written the way we actually talk customers through it on the phone.</p><ul><li><strong><a href=\"/onedrive-moved-my-desktop-and-documents/\">Windows moved my Desktop and Documents into OneDrive</a></strong> &mdash; you never asked, and now everything lives under <code>C:\\Users\\&lt;name&gt;\\OneDrive\\...</code>. Your files are not lost. Here&rsquo;s why it happened and how to undo it safely &mdash; including the one dialog box that catches people out.</li><li><strong><a href=\"/files-missing-from-onedrive/\">Files missing from OneDrive, or folders that look empty</a></strong> &mdash; a ten-minute checklist ordered by likelihood: wrong account, cloud-only placeholders, another device, the Personal Vault and the recycle bin clocks.</li><li><strong><a href=\"/onedrive-full-cant-send-email/\">OneDrive is full &mdash; and now my email is bouncing</a></strong> &mdash; the storage-quota collision Microsoft never explains on one page, what the &ldquo;frozen account&rdquo; warnings actually mean, and the fastest ways back under the limit.</li><li><strong><a href=\"/stop-using-onedrive-without-losing-files/\">I want to stop using OneDrive &mdash; without losing anything</a></strong> &mdash; the safe order of operations for leaving OneDrive, with a clear table of what each step does and does not remove.</li><li><strong><a href=\"/excel-onedrive-sync-conflicts/\">Excel files conflicting, duplicating or not saving on OneDrive</a></strong> &mdash; the &ldquo;we couldn&rsquo;t merge the changes&rdquo; error, how to rescue the edits you thought you lost, and how to stop it happening again.</li></ul><p>One more that surprises people: if <em>Word</em> has started saving brand-new documents straight to the cloud with date-stamped names, that&rsquo;s a separate change &mdash; see <a href=\"/stop-word-saving-to-onedrive/\">stop Word saving to OneDrive</a>.</p>"
   },
   {
    "eyebrow": "Why it happens",
    "h2": "OneDrive isn&rsquo;t broken &mdash; it&rsquo;s doing what Microsoft told it to",
    "html": "<p>Most of the panic calls we take about OneDrive come down to one feature: <strong>Folder Backup</strong> (Microsoft also calls it Known Folder Move). When it&rsquo;s on, your Desktop, Documents and Pictures folders are <em>redirected</em> into the OneDrive folder &mdash; the files are moved, not copied and not deleted. Everything is still there; it just lives at <code>C:\\Users\\&lt;name&gt;\\OneDrive\\Desktop</code> instead of where you left it.</p><p>The bit that feels unfair: on recent Windows 11 (the 25H2 release), Folder Backup is switched on <em>automatically</em> when you sign in with a Microsoft account. It&rsquo;s opt-out, not opt-in &mdash; so a brand-new laptop, a reinstall or even a family member signing in can quietly move the folders without anyone choosing it. It&rsquo;s the single scenario we see most often on home and family PCs in Bournemouth and Poole.</p><p>So before anything else: your files have not been erased, and you have not been hacked. If that&rsquo;s your situation, go straight to <a href=\"/onedrive-moved-my-desktop-and-documents/\">OneDrive moved my Desktop and Documents</a> for the safe reversal &mdash; there is one wrongly-worded dialog on the way out that can leave folders looking empty, and we show you exactly which option to pick.</p>"
   },
   {
    "eyebrow": "Quick checklist",
    "h2": "OneDrive won&rsquo;t sync? Run these six checks first",
    "html": "<p>&ldquo;Not syncing&rdquo; has a handful of boring causes that account for most of the cases we see. Work down this list in order &mdash; none of these steps deletes anything.</p><ol><li><strong>Right account?</strong> Click the cloud icon in the taskbar tray, open Settings and check which email address is signed in. Then sign in at <strong>onedrive.com</strong> with the same address. Lots of people have both a personal and a work account &mdash; files &ldquo;missing&rdquo; are often just sitting in the other one.</li><li><strong>Is sync paused?</strong> The tray icon shows a pause symbol when it is. Click it and choose <strong>Resume syncing</strong>. Windows sometimes pauses OneDrive on battery-saver or metered connections without telling you.</li><li><strong>Is your storage full?</strong> A full account stops syncing altogether &mdash; and on a free 5GB Microsoft account it can bounce your email too. Check the storage bar in OneDrive&rsquo;s settings; if it&rsquo;s at the top, see <a href=\"/onedrive-full-cant-send-email/\">OneDrive full &mdash; can&rsquo;t send email</a>.</li><li><strong>Awkward file names or very deep folders?</strong> Files with characters like <code>&quot; * : &lt; &gt; ? / \\ |</code> in the name, or buried in extremely long folder paths, can refuse to sync while everything else carries on. Rename or shallow them and the queue usually clears.</li><li><strong>Restart OneDrive.</strong> Tray icon &gt; Settings gear &gt; <strong>Quit OneDrive</strong>, then relaunch it from the Start menu. Unglamorous, genuinely effective.</li><li><strong>Unlink and relink.</strong> OneDrive Settings &gt; Account &gt; <strong>Unlink this PC</strong>, then sign back in. This resets the sync relationship without deleting your local files or your cloud copies.</li></ol><p>Still stuck after all six? Microsoft&rsquo;s own <a href=\"https://support.microsoft.com/en-gb/onedrive\" rel=\"noopener\">OneDrive support pages</a> cover the deeper diagnostics &mdash; or skip the rabbit hole and <a href=\"/contact/\">have us look remotely from &pound;20</a>.</p>"
   },
   {
    "eyebrow": "Outage check",
    "h2": "Is OneDrive actually down?",
    "html": "<p>Occasionally it really is Microsoft&rsquo;s problem, not yours &mdash; and no amount of restarting on your side will fix a service outage. Before you spend an hour troubleshooting, spend thirty seconds checking: our free <a href=\"/is-it-down/\">Is It Down?</a> tool checks whether OneDrive and the rest of Microsoft 365 are having a wobble right now. If it is down, make a cup of tea and check back &mdash; your files in the cloud are still there, they&rsquo;re just temporarily unreachable.</p>"
   },
   {
    "eyebrow": "Worth knowing",
    "h2": "OneDrive is sync, not backup",
    "html": "<p>One honest warning while you&rsquo;re here: OneDrive keeps your devices <em>matching</em> &mdash; which means a deletion, a bad edit or ransomware on one machine syncs everywhere, faithfully. That&rsquo;s a different job from a real backup, which keeps independent copies you can wind back to. If everything you care about lives only in OneDrive, it&rsquo;s worth five minutes with our plain-English guide: <a href=\"/microsoft-365-backup-do-you-need-it/\">Microsoft 365 backup &mdash; do you actually need it?</a></p>"
   },
   {
    "eyebrow": "Fix it for me",
    "h2": "Rather have someone sort it while you watch?",
    "html": "<p>Every page in this section gives you the real fix steps for free &mdash; that&rsquo;s the deal. But some of these jobs are one-shot: pick the wrong option in the Folder Backup dialog and your Desktop looks empty; leave OneDrive in the wrong order and cloud-only files get stranded. If you&rsquo;d rather not gamble, we&rsquo;ll do it with you.</p><p>We&rsquo;ve supported Microsoft software since 1995 &mdash; and taught it for over ten years at our own Dorset Microsoft Education Resource Centre &mdash; so explaining this stuff without jargon is literally what we trained for. <a href=\"/dell-remote-support/\">Remote support is from &pound;20</a>: we call you first, you approve the connection, and you watch every click on your own screen. For businesses, <a href=\"/microsoft-365-support/\">managed Microsoft 365</a> at &pound;4.85 per user per month means storage quotas, accounts and sync settings are watched for you before they become a Tuesday-morning crisis.</p><p>Want it handled all year round? Our <a href=\"/monthly-it-support/\">home plan is &pound;18.25 per computer per month</a> and <a href=\"/business-it-support-plans/\">business plans start at &pound;24.38 per computer</a> &mdash; both include a written Service Report after every visit so you can see exactly what was checked and changed. We&rsquo;re remote-first with free local collection when a machine needs hands-on work, and we meet by appointment at Kinson Community Centre &mdash; there&rsquo;s no walk-in shop, so please do call first: 01202 775566, or text 07520 615332.</p>"
   }
  ],
  "faqs": [
   {
    "q": "Why did my files suddenly move into OneDrive?",
    "a": "Almost certainly OneDrive&rsquo;s Folder Backup feature, which redirects your Desktop, Documents and Pictures into the OneDrive folder. On recent Windows 11 (25H2) it switches on automatically when you sign in with a Microsoft account &mdash; opt-out, not opt-in. Your files are moved, not deleted. Our step-by-step page on undoing it safely is at /onedrive-moved-my-desktop-and-documents/."
   },
   {
    "q": "Has OneDrive deleted my files?",
    "a": "It&rsquo;s very unlikely. OneDrive moves and redirects files far more often than it removes them. The usual culprits are the wrong Microsoft account signed in, cloud-only placeholder files while you&rsquo;re offline, Folder Backup having relocated things, or a deletion synced from another device. Work through our checklist at /files-missing-from-onedrive/ before assuming the worst."
   },
   {
    "q": "OneDrive says it&rsquo;s syncing but nothing happens &mdash; what first?",
    "a": "Check, in order: the right account is signed in, sync isn&rsquo;t paused (look for a pause symbol on the tray icon), your storage isn&rsquo;t full, and no files have awkward characters in their names. Then quit and relaunch OneDrive from the tray icon. If it&rsquo;s still stuck, Unlink this PC and sign back in &mdash; that resets sync without deleting anything."
   },
   {
    "q": "Why can&rsquo;t I send or receive email when OneDrive is full?",
    "a": "A free Microsoft account shares one 5GB cloud allowance across OneDrive and email attachments. Go over it and Outlook.com can stop sending and receiving mail even though the mailbox itself isn&rsquo;t full &mdash; a collision Microsoft never explains on a single page. Our full guide, including how to get back under quota fast, is at /onedrive-full-cant-send-email/."
   },
   {
    "q": "Is OneDrive a backup?",
    "a": "Not really &mdash; it&rsquo;s sync. It keeps your devices matching, so a deletion or ransomware infection on one machine spreads to your other devices and the cloud copy. Version history and the recycle bin soften that, but they have time limits. Our honest guide to what OneDrive does and doesn&rsquo;t protect is at /microsoft-365-backup-do-you-need-it/."
   },
   {
    "q": "How do I stop using OneDrive without losing my files?",
    "a": "In the right order: make sure every cloud-only file has a real local copy first, turn off Folder Backup choosing the keep-on-this-PC option, then Unlink this PC, and only then uninstall if you want to. Done in that order, nothing is lost &mdash; done out of order, folders can appear empty. The full walkthrough is at /stop-using-onedrive-without-losing-files/."
   },
   {
    "q": "How can I tell if OneDrive is down rather than broken on my PC?",
    "a": "Check before you troubleshoot &mdash; our free /is-it-down/ tool shows whether OneDrive and the rest of Microsoft 365 are having a service outage right now. If Microsoft&rsquo;s end is down, your cloud files are safe but temporarily unreachable, and nothing you restart locally will change that."
   },
   {
    "q": "Why does Excel keep creating conflict or duplicate copies of my file?",
    "a": "Two devices or people saved different versions and OneDrive couldn&rsquo;t merge them, so it kept both rather than lose either. The fix &mdash; and how to rescue edits you thought had vanished using version history &mdash; is at /excel-onedrive-sync-conflicts/, along with the AutoSave and file-format settings that prevent it."
   },
   {
    "q": "Can you just fix my OneDrive problem for me?",
    "a": "Yes. Remote support is from &pound;20 &mdash; we call before we connect, and you watch everything on your own screen. If the machine needs hands-on work we collect it free locally. We&rsquo;re family-run, have supported Microsoft software since 1995, and we&rsquo;re on 01202 775566 (or text 07520 615332), Monday to Friday 9am&ndash;5pm."
   },
   {
    "q": "We&rsquo;re a business &mdash; can you stop OneDrive problems happening at all?",
    "a": "That&rsquo;s exactly what managed Microsoft 365 is for: &pound;4.85 per user per month and we watch storage quotas, accounts and sync configuration across your machines before they bite. Business support plans start at &pound;24.38 per computer per month, each visit documented in a written Service Report. Details at /business-it-support-plans/."
   }
  ],
  "schemaKind": "service",
  "serviceName": "OneDrive Problems Help &amp; Support",
  "howToName": "How to fix OneDrive sync problems",
  "howToSteps": [
   {
    "name": "Check the account and pause state",
    "text": "Click the OneDrive cloud icon in the taskbar tray. Confirm the signed-in email address is the account you expect (check onedrive.com with the same address), and resume syncing if a pause symbol is showing."
   },
   {
    "name": "Check your storage",
    "text": "Open OneDrive Settings and look at the storage bar. A full account stops syncing entirely &mdash; free up space or see our OneDrive-full guide if you&rsquo;re at the limit."
   },
   {
    "name": "Check file names and paths",
    "text": "Files with characters like quotes, colons or asterisks in the name, or files buried in very long folder paths, can refuse to sync. Rename them or move them to a shallower folder."
   },
   {
    "name": "Restart, then unlink and relink",
    "text": "Quit OneDrive from the tray icon and relaunch it from the Start menu. If it&rsquo;s still stuck, use Settings &gt; Account &gt; Unlink this PC and sign back in &mdash; this resets sync without deleting local or cloud files."
   }
  ],
  "crossLinksHtml": "<ul><li><a href=\"/onedrive-moved-my-desktop-and-documents/\">OneDrive moved my Desktop and Documents</a></li><li><a href=\"/files-missing-from-onedrive/\">Files missing from OneDrive</a></li><li><a href=\"/onedrive-full-cant-send-email/\">OneDrive full &mdash; can&rsquo;t send email</a></li><li><a href=\"/stop-using-onedrive-without-losing-files/\">Stop using OneDrive without losing files</a></li><li><a href=\"/excel-onedrive-sync-conflicts/\">Excel OneDrive sync conflicts</a></li><li><a href=\"/stop-word-saving-to-onedrive/\">Stop Word saving to OneDrive</a></li><li><a href=\"/microsoft-365-support/\">Microsoft 365 support</a></li><li><a href=\"/outlook-problems/\">Common Outlook problems</a></li><li><a href=\"/microsoft-365-backup-do-you-need-it/\">Microsoft 365 backup &mdash; do you need it?</a></li><li><a href=\"/is-it-down/\">Is it down? &mdash; live outage checker</a></li><li><a href=\"/onedrive-keeps-asking-to-sign-in/\">OneDrive keeps asking you to sign in</a></li><li><a href=\"/windows-11-cant-see-network-computers/\">Windows 11 can&rsquo;t see other computers on the network</a></li><li><a href=\"/sharepoint-not-syncing-file-explorer/\">SharePoint not syncing to File Explorer</a></li></ul>",
  "crumbName": "OneDrive Problems",
  "primaryCta": [
   "Talk to a Techie",
   "/contact/"
  ],
  "secondaryCta": [
   "Call 01202 775566",
   "tel:+441202775566"
  ]
 },
 {
  "slug": "onedrive-moved-my-desktop-and-documents",
  "title": "OneDrive Moved My Desktop &amp; Documents &mdash; How to Safely Undo It | 365 Techies",
  "metaDesc": "Windows 11 moved your Desktop and Documents into OneDrive without asking? Your files are NOT lost. Plain-English steps to safely turn off Folder Backup and put everything back &mdash; from a Dorset firm supporting Microsoft software since 1995.",
  "ogTitle": "OneDrive moved my Desktop and Documents &mdash; the safe way to undo it",
  "eyebrow": "OneDrive Problems",
  "h1": "OneDrive moved my Desktop and Documents &mdash; here&rsquo;s how to safely undo it",
  "lede": "First, breathe: your files are NOT lost. Windows turned on a feature called OneDrive Folder Backup and redirected your Desktop, Documents and Pictures into the OneDrive folder &mdash; it moved them, it didn&rsquo;t delete them. This page explains why it happened, exactly how to turn it off without emptying your Desktop by mistake, and how to move everything back where it was. We&rsquo;ve supported Microsoft software since 1995, and right now this is the single most common call we get.",
  "chips": [
   "Your files are NOT lost",
   "Safe step-by-step reversal",
   "Remote fix from &pound;20"
  ],
  "ctaHead": "Nervous about clicking the wrong option? Let us do it while you watch.",
  "ctaSub": "This is a one-shot job &mdash; the wrong choice in one dialog box leaves your Desktop looking empty. We&rsquo;ll undo Folder Backup and move your files back remotely from &pound;20, on the phone with you the whole time. Family-run in Bournemouth, 4.9 on Google, Mon&ndash;Fri 9&ndash;5.",
  "sections": [
   {
    "eyebrow": "Don&rsquo;t panic",
    "h2": "Your files are not lost &mdash; Windows moved them, it didn&rsquo;t delete them",
    "html": "<p>What happened has a name: <strong>OneDrive Folder Backup</strong> (Microsoft also calls it Known Folder Move). When it switches on, Windows <em>redirects</em> your Desktop, Documents, Pictures &mdash; and sometimes Music and Videos &mdash; so they live inside your OneDrive folder instead of their old locations. Everything that was at <code>C:\\Users\\&lt;name&gt;\\Documents</code> is now at <code>C:\\Users\\&lt;name&gt;\\OneDrive\\Documents</code>, and the same for your Desktop.</p><p>Nothing was copied and nothing was deleted &mdash; the folders themselves were re-pointed. That&rsquo;s why your files seem to have &ldquo;disappeared&rdquo; from where you expect them, why shortcuts and some older programs suddenly can&rsquo;t find their files, and why your OneDrive storage started filling up out of nowhere.</p><p>To confirm your files are safe right now: open File Explorer, click <strong>OneDrive</strong> in the left-hand panel, and look inside the Desktop and Documents folders there. You should see everything. If files genuinely aren&rsquo;t there either, that&rsquo;s a different problem &mdash; head to our <a href=\"/files-missing-from-onedrive/\">files missing from OneDrive</a> checklist instead.</p>"
   },
   {
    "eyebrow": "Why it happened",
    "h2": "You didn&rsquo;t ask for this &mdash; Windows 11 now turns it on for you",
    "html": "<p>You&rsquo;re not going mad and you didn&rsquo;t click something by accident. With the Windows 11 25H2 update, Microsoft made OneDrive Folder Backup switch on <strong>automatically</strong> when you sign in with a Microsoft account. It&rsquo;s opt-out, not opt-in &mdash; the choice is made for you unless you spot it and say no.</p><p>Microsoft&rsquo;s thinking is genuinely well-meant: with Folder Backup on, your documents survive a stolen laptop or a dead hard drive. But springing it on people has real consequences we see every week on family PCs around Bournemouth and Poole:</p><ul><li>Desktops rearranged or showing little cloud icons on everything;</li><li>the free 5GB of OneDrive storage filling up within days, followed by scary <strong>&ldquo;storage full&rdquo;</strong> emails &mdash; and eventually <a href=\"/onedrive-full-cant-send-email/\">email that stops sending and receiving</a>;</li><li>programs like accounts packages and photo editors losing track of files they&rsquo;ve used for years;</li><li>two computers signed into the same Microsoft account quietly merging their Desktops into one jumble.</li></ul><p>Microsoft changed the rules; you&rsquo;re just the one left sorting it out. The good news is the reversal is safe &mdash; as long as you do it in the right order and read one dialog box very carefully.</p>"
   },
   {
    "eyebrow": "The fix, part 1",
    "h2": "Turn off Folder Backup &mdash; and don&rsquo;t fall for the trap dialog",
    "html": "<p>Here&rsquo;s the safe way to stop OneDrive managing your folders:</p><ol><li>Click the <strong>OneDrive cloud icon</strong> in the system tray (bottom-right, near the clock &mdash; you may need to click the little up-arrow to find it).</li><li>Click the <strong>gear icon</strong> &rarr; <strong>Settings</strong>.</li><li>Go to <strong>Sync and backup</strong> &rarr; <strong>Manage backup</strong>.</li><li>Switch <strong>off</strong> the toggle for each folder &mdash; Desktop, Documents, Pictures, and any others that are on.</li></ol><p><strong>&#9888; The trap &mdash; read this before you click anything.</strong> When you turn a folder off, OneDrive may show a dialog with two very similar-sounding choices:</p><ul><li><strong>&ldquo;Keep files only in OneDrive&rdquo;</strong> &mdash; removes them from your computer. Your Desktop and Documents will look <em>empty</em> on the PC; the files exist only in the cloud.</li><li><strong>&ldquo;Keep files only on my PC&rdquo;</strong> &mdash; removes them from OneDrive and keeps them on the computer. For most people undoing this mess, <strong>this is the one you want</strong>.</li></ul><p>Nothing is destroyed either way &mdash; the files exist in one place or the other &mdash; but choosing the first option is exactly how people end up staring at a blank Desktop and assuming the worst. Read the wording slowly. If you&rsquo;re not sure, stop and <a href=\"/contact/\">give us a ring</a> before clicking &mdash; a two-minute call beats an afternoon of worry.</p>"
   },
   {
    "eyebrow": "The fix, part 2",
    "h2": "The gotcha Microsoft buries: your old files may stay in the OneDrive folder",
    "html": "<p>Here&rsquo;s the part Microsoft&rsquo;s own help page mentions almost in passing: when you stop backing up a folder, files that were <em>already</em> moved into OneDrive <strong>stay in the OneDrive folder</strong> &mdash; they don&rsquo;t automatically jump back to your device&rsquo;s Desktop or Documents. So after part 1, your real Desktop folder may still look thin while the files sit in <code>C:\\Users\\&lt;name&gt;\\OneDrive\\Desktop</code>.</p><p>Moving them back is a straightforward copy-and-paste job:</p><ol><li>Open <strong>File Explorer</strong> and go to <strong>OneDrive &rarr; Desktop</strong>.</li><li>Select everything (<strong>Ctrl+A</strong>) and cut it (<strong>Ctrl+X</strong>).</li><li>In the left panel, go to <strong>This PC &rarr; Desktop</strong> (the real one, at <code>C:\\Users\\&lt;name&gt;\\Desktop</code>) and paste (<strong>Ctrl+V</strong>).</li><li>Repeat for <strong>Documents</strong> and <strong>Pictures</strong>: from <code>C:\\Users\\&lt;name&gt;\\OneDrive\\Documents</code> to <code>C:\\Users\\&lt;name&gt;\\Documents</code>, and so on.</li></ol><p>Two tips from doing this on a lot of customer machines: if you have many gigabytes of photos, do Pictures last and let it finish before shutting down; and if Windows asks about replacing files with the same name, choose to keep both and sort duplicates out afterwards rather than guessing. Once everything&rsquo;s back, empty folders left behind in OneDrive can be deleted &mdash; which also frees up your cloud storage.</p>"
   },
   {
    "eyebrow": "One thing to know",
    "h2": "Should you turn it back on? An honest word before you go",
    "html": "<p>We&rsquo;re not anti-OneDrive &mdash; far from it. Folder Backup done <em>deliberately</em>, with enough storage and your say-so, is a genuinely useful safety net: if the laptop is stolen or the drive dies, your documents survive. Our objection is to it being switched on silently, not to the feature itself.</p><p>So before you close this page, one honest question: what <em>is</em> protecting your files now? If the answer is &ldquo;nothing&rdquo;, it&rsquo;s worth a think &mdash; our plain-English guide to <a href=\"/microsoft-365-backup-do-you-need-it/\">whether you need a Microsoft 365 backup</a> covers the difference between syncing and a real backup without any scare tactics.</p><p>And two related pages, depending on where you are with all this:</p><ul><li>Want OneDrive gone altogether? Don&rsquo;t just uninstall it &mdash; there&rsquo;s a right order that keeps every file. See <a href=\"/stop-using-onedrive-without-losing-files/\">how to stop using OneDrive without losing files</a>.</li><li>Is Word now saving <em>new</em> documents straight to OneDrive with odd date-based names? That&rsquo;s a separate change with its own off-switch: <a href=\"/stop-word-saving-to-onedrive/\">stop Word saving to OneDrive</a>.</li></ul><p>For everything else OneDrive has done to you, the <a href=\"/onedrive-problems/\">OneDrive problems hub</a> triages it by symptom.</p>"
   },
   {
    "eyebrow": "When to call us",
    "h2": "This is a one-shot job &mdash; we&rsquo;ll happily do it while you watch",
    "html": "<p>Everything above is the genuine fix &mdash; no software to buy, no tricks. But we&rsquo;ll be straight with you: the Manage backup dialog is a one-shot decision, and if several computers, a full OneDrive, or years of family photos are involved, it&rsquo;s completely reasonable not to want to be the one clicking.</p><p>We&rsquo;ve supported Microsoft software since 1995 and taught it for over 10 years at our own Dorset Microsoft Education Resource Centre &mdash; and undoing this exact change is currently the most common job we do. Here&rsquo;s how it works:</p><ul><li><strong><a href=\"/dell-remote-support/\">Remote support from &pound;20</a></strong> &mdash; we call you first, connect securely to your PC (any make, not just Dell), and put everything back while you watch on screen. Most Folder Backup reversals are done in one short session.</li><li><strong>Free local collection</strong> if the machine needs more hands-on work &mdash; we&rsquo;re remote-first with no walk-in shop, but we&rsquo;ll collect from homes across Bournemouth, Poole and Christchurch.</li><li><strong>Business PCs?</strong> On our <a href=\"/microsoft-365-support/\">managed Microsoft 365</a> service (&pound;4.85 per user, per month) we set OneDrive up properly across every machine &mdash; deliberately, with the right storage &mdash; so this never ambushes your staff again. Ongoing cover with a written Service Report after every visit is on our <a href=\"/monthly-it-support/\">monthly support plans</a> from &pound;18.25 per computer at home, or <a href=\"/business-it-support-plans/\">business plans</a> from &pound;24.38.</li></ul><p>Call <strong>01202 775566</strong> (Mon&ndash;Fri 9&ndash;5), or text <strong>07520 615332</strong> and we&rsquo;ll ring you back. Family-run since 1995, 4.9 on Google.</p>"
   }
  ],
  "faqs": [
   {
    "q": "Did OneDrive delete my files?",
    "a": "No. Folder Backup moves and redirects files rather than deleting them. Your Desktop, Documents and Pictures now live inside the OneDrive folder at C:\\Users\\&lt;name&gt;\\OneDrive\\... &mdash; open OneDrive in File Explorer and you should find everything. If files aren&rsquo;t there either, see our separate files-missing-from-OneDrive checklist, as that has different causes."
   },
   {
    "q": "Why did Windows move my files without asking?",
    "a": "With the Windows 11 25H2 update, Microsoft made OneDrive Folder Backup switch on automatically when you sign in with a Microsoft account &mdash; it&rsquo;s opt-out rather than opt-in. It&rsquo;s intended as a safety net, but many people never notice the choice being made and only discover it when their Desktop rearranges or their OneDrive storage fills up."
   },
   {
    "q": "Which option should I pick: &ldquo;Keep files only in OneDrive&rdquo; or &ldquo;Keep files only on my PC&rdquo;?",
    "a": "If you&rsquo;re undoing the move and want your files back on the computer, choose &ldquo;Keep files only on my PC&rdquo;. Choosing &ldquo;Keep files only in OneDrive&rdquo; removes them from the computer, which leaves your Desktop and Documents looking empty even though the files still exist in the cloud. Read the dialog slowly &mdash; the two options sound very similar."
   },
   {
    "q": "I turned off Folder Backup but my Desktop is still empty. Where are my files?",
    "a": "This is the gotcha Microsoft buries: files that were already moved stay in the OneDrive folder after you stop backing up &mdash; they don&rsquo;t jump back automatically. Open File Explorer, go to OneDrive &rarr; Desktop, cut everything, and paste it into This PC &rarr; Desktop. Repeat for Documents and Pictures."
   },
   {
    "q": "Will turning off Folder Backup delete anything from OneDrive?",
    "a": "No &mdash; turning off backup just stops OneDrive managing those folders. Files already uploaded stay in OneDrive until you move or delete them yourself. Nothing is destroyed at any point; the only risk is picking the dialog option that leaves files somewhere other than where you expected."
   },
   {
    "q": "Why is my OneDrive storage suddenly full?",
    "a": "Folder Backup uploads your Desktop, Documents and Pictures to the cloud, and a free Microsoft account only includes 5GB. A modest photo collection fills that quickly. Once you&rsquo;ve moved your files back and deleted them from OneDrive, the space frees up. If your account is already full and your email has started bouncing, see our OneDrive-full page &mdash; that needs sorting promptly."
   },
   {
    "q": "My programs can&rsquo;t find their files any more &mdash; is that the same problem?",
    "a": "Very likely, yes. When Folder Backup redirects Documents into OneDrive, older programs that stored their data by the old path can lose track of it. Once you turn off backup and move your files back to C:\\Users\\&lt;name&gt;\\Documents, most programs find their files again. If one still can&rsquo;t, we can usually re-point it in a short remote session."
   },
   {
    "q": "Should I just get rid of OneDrive completely?",
    "a": "You can, but don&rsquo;t simply uninstall it &mdash; done in the wrong order you can leave placeholder files behind that hold no actual data. There&rsquo;s a safe four-step sequence, covered on our stop-using-OneDrive-without-losing-files page. Also worth pausing on what protects your files afterwards: syncing isn&rsquo;t the same as a backup."
   },
   {
    "q": "Can you just do all this for me?",
    "a": "Happily &mdash; it&rsquo;s currently the most common job we do. We connect remotely from &pound;20, always calling you first, and put everything back while you watch on screen. Most reversals take one short session. Call 01202 775566 (Mon&ndash;Fri 9&ndash;5) or text 07520 615332. We&rsquo;re remote-first with free local collection if hands-on work is needed &mdash; no walk-in shop."
   },
   {
    "q": "Does this affect work computers too?",
    "a": "Yes &mdash; any Windows 11 PC signed in with a Microsoft account can be caught, and on business machines it can tangle with accounts packages and shared folders. For businesses we&rsquo;d rather set OneDrive up deliberately than fight it: our managed Microsoft 365 service is &pound;4.85 per user per month, and business support plans start from &pound;24.38 per computer, both with a written Service Report."
   }
  ],
  "schemaKind": "service",
  "serviceName": "OneDrive Folder Backup Reversal &amp; File Recovery Help",
  "howToName": "How to safely undo OneDrive moving your Desktop and Documents",
  "howToSteps": [
   {
    "name": "Confirm your files are safe",
    "text": "Open File Explorer and click OneDrive in the left panel. Your Desktop, Documents and Pictures files should all be inside the OneDrive folder &mdash; they were moved there by Folder Backup, not deleted."
   },
   {
    "name": "Open Manage backup in OneDrive settings",
    "text": "Click the OneDrive cloud icon in the system tray, then the gear icon, then Settings, then Sync and backup, then Manage backup. Switch off the toggle for Desktop, Documents, Pictures and any other folders that are on."
   },
   {
    "name": "Choose the right dialog option",
    "text": "If OneDrive asks, pick &ldquo;Keep files only on my PC&rdquo; to keep everything on the computer. &ldquo;Keep files only in OneDrive&rdquo; removes files from the PC and leaves your folders looking empty, even though nothing is destroyed."
   },
   {
    "name": "Move already-moved files back manually",
    "text": "Files already moved stay in the OneDrive folder after backup is turned off. In File Explorer, cut everything from OneDrive &rarr; Desktop and paste it into This PC &rarr; Desktop, then repeat for Documents and Pictures."
   }
  ],
  "crossLinksHtml": "<ul><li><a href=\"/onedrive-problems/\">OneDrive problems &amp; fixes &mdash; start here for any symptom</a></li><li><a href=\"/files-missing-from-onedrive/\">Files missing from OneDrive &mdash; the 10-minute checklist</a></li><li><a href=\"/stop-using-onedrive-without-losing-files/\">Stop using OneDrive without losing files</a></li><li><a href=\"/onedrive-full-cant-send-email/\">OneDrive full and email bouncing?</a></li><li><a href=\"/stop-word-saving-to-onedrive/\">Stop Word saving new documents to OneDrive</a></li><li><a href=\"/microsoft-365-backup-do-you-need-it/\">Do you actually need a Microsoft 365 backup?</a></li><li><a href=\"/microsoft-365-support/\">Microsoft 365 support for Dorset businesses</a></li><li><a href=\"/dell-remote-support/\">Remote support from &pound;20</a></li></ul>",
  "crumbName": "OneDrive Moved My Files",
  "primaryCta": [
   "Get It Fixed Remotely",
   "/dell-remote-support/"
  ],
  "secondaryCta": [
   "Call 01202 775566",
   "tel:+441202775566"
  ]
 },
 {
  "slug": "files-missing-from-onedrive",
  "title": "Files Missing From OneDrive? A Calm 10-Minute Checklist | 365 Techies",
  "metaDesc": "OneDrive files disappeared? They&rsquo;re usually hiding, not deleted. A calm 10-minute checklist &mdash; wrong account, cloud icons, recycle bin clocks &mdash; from Dorset techies supporting Microsoft software since 1995.",
  "ogTitle": "Files Missing From OneDrive? The Calm 10-Minute Checklist",
  "eyebrow": "OneDrive Help &mdash; Dorset",
  "h1": "Files Missing From OneDrive? Breathe &mdash; Then Work Through This",
  "lede": "Your files are almost certainly NOT lost. In most of the &ldquo;my OneDrive files have disappeared&rdquo; calls we take, the files are hiding &mdash; wrong account, cloud-only placeholders, or a folder that quietly moved &mdash; not deleted. This is the 10-minute checklist we walk Dorset customers through, ordered by what it actually turns out to be, written by a family firm that&rsquo;s supported Microsoft software since 1995.",
  "chips": [
   "Most &lsquo;missing&rsquo; files are just hiding",
   "Remote diagnosis from &pound;20",
   "Family-run since 1995 &middot; 4.9 on Google"
  ],
  "ctaHead": "Can&rsquo;t find them? Let us look before you pay for recovery software",
  "ctaSub": "A remote session from &pound;20 usually finds &ldquo;missing&rdquo; OneDrive files in minutes &mdash; and if they really are gone, we&rsquo;ll tell you straight rather than sell you false hope. Mon&ndash;Fri 9&ndash;5. Call 01202 775566 or text 07520 615332.",
  "sections": [
   {
    "eyebrow": "Start here",
    "h2": "Why your files are almost certainly not gone",
    "html": "<p>When files vanish from OneDrive, the mind jumps straight to &ldquo;deleted forever&rdquo;. In our experience it&rsquo;s nearly always something far less dramatic. Before you download recovery software or start a support ticket, give us ten minutes &mdash; this checklist is ordered by likelihood, based on what we actually find on real customers&rsquo; PCs. We&rsquo;ve supported Microsoft software since 1995 and taught it for over 10 years at our own Dorset Microsoft Education Resource Centre, and we walk customers through this exact list weekly.</p><p>The usual culprits, most common first:</p><ul><li>You&rsquo;re signed in to the <strong>wrong Microsoft account</strong> (far more common than you&rsquo;d think)</li><li>The files are <strong>cloud-only placeholders</strong> and you&rsquo;re offline &mdash; they look missing but aren&rsquo;t</li><li><strong>Folder Backup moved</strong> your Desktop and Documents without asking clearly</li><li><strong>Another device</strong> on the same account deleted them &mdash; and the deletion synced</li><li>They&rsquo;re in the <strong>Personal Vault</strong>, which hides its contents even from search</li><li>They&rsquo;re sitting in the <strong>OneDrive recycle bin</strong>, quietly counting down</li></ul><p>Work down the list in order. Microsoft&rsquo;s own help splits these answers across several separate articles; here they are in one place.</p>"
   },
   {
    "eyebrow": "Checks 1 &amp; 2",
    "h2": "The wrong account &mdash; and the cloud icons that fool everyone",
    "html": "<h3>Check 1: which Microsoft account are you actually in?</h3><p>Lots of people have two Microsoft accounts without realising &mdash; an old Hotmail or Outlook address plus a newer one, or a personal account and a work one. Each has its own completely separate OneDrive. Go to <strong>onedrive.com</strong> in a browser and sign in with <em>each</em> address you&rsquo;ve ever used. On the PC, click the little cloud icon near the clock, then the gear &gt; <strong>Settings</strong> &gt; <strong>Account</strong> to see which account the app is syncing. If your files appear under a different address, nothing was ever lost &mdash; you were just looking in the wrong cupboard.</p><h3>Check 2: cloud icons are not missing files</h3><p>OneDrive&rsquo;s <strong>Files On-Demand</strong> feature shows you everything in your cloud, but only downloads a file when you open it. A file with a <strong>cloud outline icon</strong> next to it in File Explorer is an online-only placeholder &mdash; it takes up almost no space on the disk and needs an internet connection to open. If you&rsquo;re offline, or OneDrive is signed out or paused, those files can appear to be empty, greyed out, or gone &mdash; and whole folders can look &ldquo;there but empty&rdquo;. Reconnect, sign back in, and they reappear. To keep something permanently on the machine, right-click it and choose <strong>Always keep on this device</strong>.</p>"
   },
   {
    "eyebrow": "Checks 3 &amp; 4",
    "h2": "OneDrive moved them &mdash; or another device deleted them",
    "html": "<h3>Check 3: Folder Backup relocated your Desktop and Documents</h3><p>OneDrive&rsquo;s Folder Backup feature redirects your Desktop, Documents and Pictures into OneDrive &mdash; and on recent Windows 11 setups it&rsquo;s often switched on during sign-in without you really noticing. Your files didn&rsquo;t vanish; they moved to <code>C:\\Users\\&lt;name&gt;\\OneDrive\\Desktop</code> and friends. If your desktop suddenly emptied or shortcuts stopped working, this is very likely your answer &mdash; we&rsquo;ve written a full walkthrough at <a href=\"/onedrive-moved-my-desktop-and-documents/\">OneDrive moved my Desktop and Documents</a>.</p><h3>Check 4: a deletion on any device syncs to every device</h3><p>OneDrive is a <em>sync</em> service, not a vault. If you (or a family member, or an old laptop being cleared out) delete a file on one device signed in to the same account, that deletion syncs everywhere within minutes. This catches people out when they retire an old PC: they tidy up its folders, not realising those folders are the same ones on the new machine. The good news is that synced deletions land in the OneDrive recycle bin &mdash; which is Check 6 below. It&rsquo;s also why sync is not the same thing as backup; we&rsquo;ve explained the difference honestly at <a href=\"/microsoft-365-backup-do-you-need-it/\">do you need Microsoft 365 backup?</a></p>"
   },
   {
    "eyebrow": "Check 5",
    "h2": "Personal Vault hides its files &mdash; even from search",
    "html": "<p>If the missing files were sensitive &mdash; scans of passports, financial documents &mdash; there&rsquo;s a fair chance you put them in OneDrive&rsquo;s <strong>Personal Vault</strong> and forgot. The Vault is deliberately invisible: per Microsoft&rsquo;s own documentation, files inside it <strong>never appear in OneDrive search results</strong>, so searching for the filename will draw a blank even though the file is safe and sound. Open OneDrive, click <strong>Personal Vault</strong>, and unlock it with your PIN or authenticator to see inside.</p><p>One more Vault quirk worth knowing: if a Vault file was deleted, it only shows up in the OneDrive recycle bin <em>after</em> you&rsquo;ve unlocked the Vault. So if you&rsquo;re about to check the recycle bin (next step) and the file might have lived in the Vault, unlock the Vault first &mdash; otherwise the recycle bin will appear to confirm your worst fears when it shouldn&rsquo;t.</p>"
   },
   {
    "eyebrow": "Check 6",
    "h2": "The recycle bin &mdash; with the real deadlines",
    "html": "<p>Go to <strong>onedrive.com</strong>, sign in, and click <strong>Recycle bin</strong> in the left menu. Deleted OneDrive files go here, not (only) to the Windows recycle bin on your PC &mdash; so even if you&rsquo;ve emptied the bin on the computer, check online. Tick the files and choose <strong>Restore</strong>; they go straight back where they came from.</p><p>Now the clocks, because this is where honesty matters. For <strong>personal (free or Microsoft 365) accounts</strong>, items in the OneDrive recycle bin are automatically deleted after <strong>30 days</strong>. For <strong>work or school accounts</strong>, the default is <strong>93 days</strong> unless your admin has changed it. We&rsquo;d love to give you one tidy number, but at the time of writing Microsoft&rsquo;s own help pages contradict each other &mdash; one says 93 days applies to personal accounts too. Our advice: <strong>assume 30, hope for 93</strong>. If the file matters, restore it today rather than testing which article is right.</p><p>One lookalike worth ruling out: if your OneDrive storage is over its limit, the account can end up frozen or read-only, which some people first notice as files seemingly misbehaving or refusing to open. If you&rsquo;ve had storage warnings, see <a href=\"/onedrive-full-cant-send-email/\">OneDrive is full</a>.</p>"
   },
   {
    "eyebrow": "Checks 7 &amp; 8",
    "h2": "The full rewind &mdash; and the honest truth about recovery software",
    "html": "<h3>Check 7: Restore your OneDrive (the 30-day rewind)</h3><p>If a lot went missing at once &mdash; a mass deletion, a sync gone wrong, even ransomware &mdash; OneDrive has a full-drive rollback. On onedrive.com go to <strong>Settings &gt; Restore your OneDrive</strong> and you can rewind your entire OneDrive to any point in the last 30 days. The catch: on personal accounts it&rsquo;s only available to <strong>Microsoft 365 subscribers</strong>, and on work accounts only where the organisation has it enabled. If you qualify, it&rsquo;s the closest thing OneDrive has to a time machine.</p><h3>Check 8: when it really is gone &mdash; the part nobody else tells you straight</h3><p>Once a file has been purged from the OneDrive recycle bin and any restore window has passed, <strong>Microsoft cannot get it back</strong>, and neither can we &mdash; anyone who promises otherwise is selling something. Data-recovery software that scans your hard drive is a <em>long shot</em> that can only ever work if a full copy of the file once existed on that disk. It is <strong>completely useless for cloud-only files</strong> &mdash; those cloud-icon placeholders never held the file&rsquo;s contents locally, so there&rsquo;s nothing on the disk to recover. You&rsquo;ll notice we don&rsquo;t link to any recovery downloads on this page: much of what ranks for these searches earns commission on the software it recommends. We don&rsquo;t, so you&rsquo;re getting the unvarnished version. If you do attempt local recovery, stop using that drive immediately &mdash; every new file written reduces the odds.</p>"
   },
   {
    "eyebrow": "When to call us",
    "h2": "If the checklist hasn&rsquo;t found them, let us look &mdash; from &pound;20",
    "html": "<p>Ten minutes of an experienced pair of eyes usually beats an evening of forum threads &mdash; and definitely beats paying for recovery software you may not need. We&rsquo;ll connect to your PC remotely (with you watching the whole time), run through the account, sync and recycle-bin checks properly, and tell you honestly where things stand. <a href=\"/dell-remote-support/\">Remote support starts from &pound;20</a>, Monday to Friday 9&ndash;5 &mdash; call <strong>01202 775566</strong> or text <strong>07520 615332</strong>. We can&rsquo;t promise recovery &mdash; nobody honestly can &mdash; but we can promise you a straight answer before you spend anything more.</p><p>If it turns out the files only ever lived on a failing local disk, remote won&rsquo;t cut it &mdash; we offer <strong>free local collection</strong> across the Bournemouth, Poole and wider Dorset area, diagnose first, and quote before any work. We&rsquo;re remote-first with no walk-in shop; if you&rsquo;d rather talk face to face, we meet by appointment at Kinson Community Centre.</p><p><strong>For businesses:</strong> missing files across a team is usually a retention-policy and admin-restore job, not a panic. On our <a href=\"/microsoft-365-support/\">managed Microsoft 365 service</a> (&pound;4.85 per user per month) we set sensible retention, know the admin-side restore routes, and help you <a href=\"/how-to-secure-your-microsoft-365-account/\">lock the account down</a> so it doesn&rsquo;t happen again. And if this scare has made you think about ongoing cover, our <a href=\"/monthly-it-support/\">home plan is &pound;18.25 a month per computer</a> and <a href=\"/business-it-support-plans/\">business plans start from &pound;24.38</a> &mdash; every session ends with a written Service Report so you can see exactly what we checked and changed.</p>"
   }
  ],
  "faqs": [
   {
    "q": "Why have my OneDrive files suddenly disappeared?",
    "a": "Usually they haven&rsquo;t. The most common causes we find are: signed in to the wrong Microsoft account, cloud-only placeholder files while offline, Folder Backup moving your Desktop and Documents into OneDrive, or a deletion on another device syncing across. Work through those four checks before assuming the worst &mdash; genuine permanent loss is the rare case."
   },
   {
    "q": "My OneDrive folders are there but empty &mdash; where are the files?",
    "a": "That&rsquo;s the classic Files On-Demand symptom. The folder structure syncs, but the files inside are cloud-only placeholders that need an internet connection to appear properly. Check you&rsquo;re online and that OneDrive is signed in and not paused (click the cloud icon by the clock). Also confirm at onedrive.com that you&rsquo;re in the right Microsoft account &mdash; a second account&rsquo;s OneDrive shows the same folder names with different contents."
   },
   {
    "q": "How long does OneDrive keep deleted files in the recycle bin?",
    "a": "Personal accounts: 30 days, then automatic permanent deletion. Work or school accounts: 93 days by default, unless your admin has changed it. Confusingly, Microsoft&rsquo;s own help pages contradict each other on the personal figure at the time of writing &mdash; one says 93 days. Our honest advice is to assume 30 and treat anything longer as a bonus: if the file matters, restore it today."
   },
   {
    "q": "I deleted files on my old laptop and they vanished from my new PC too. Why?",
    "a": "Both machines were syncing the same OneDrive, so the deletion synced everywhere &mdash; that&rsquo;s how sync works. The files should be in the recycle bin at onedrive.com, so restore them from there promptly. This is also the single best argument that OneDrive sync is not a backup on its own."
   },
   {
    "q": "Can I get files back after the OneDrive recycle bin has emptied?",
    "a": "Through Microsoft, no &mdash; once purged from the recycle bin and past any restore window, they&rsquo;re gone from the cloud. Two slim hopes remain: the &ldquo;Restore your OneDrive&rdquo; 30-day rewind (Microsoft 365 subscribers, or work accounts where it&rsquo;s enabled), and local disk-recovery on a PC where a full copy of the file once physically existed. Nobody can honestly promise either will work."
   },
   {
    "q": "Will data-recovery software get my OneDrive files back?",
    "a": "Only possibly &mdash; and only if a full copy of the file was ever downloaded to that computer. Cloud-only files (the ones with the cloud outline icon) never stored their contents on your disk, so no scanning tool can recover them, whatever its marketing says. Before you pay for recovery software, a &pound;20 remote session with us will tell you whether the file ever existed locally at all."
   },
   {
    "q": "I can&rsquo;t find my Personal Vault files anywhere &mdash; are they gone?",
    "a": "Probably not. Personal Vault files never appear in OneDrive search results by design, so searching the filename finds nothing even when the file is safe. Open OneDrive, unlock the Personal Vault with your PIN or authenticator, and look inside. If a Vault file was deleted, it only appears in the recycle bin after the Vault has been unlocked &mdash; so unlock first, then check."
   },
   {
    "q": "Is OneDrive a backup?",
    "a": "Not by itself &mdash; it&rsquo;s a sync service, and it faithfully syncs your mistakes too, including deletions and overwrites. The recycle bin and version history give you a safety margin, not a proper backup. We&rsquo;ve written an honest, no-scare guide on when that margin is enough and when it isn&rsquo;t at /microsoft-365-backup-do-you-need-it/."
   },
   {
    "q": "Could a full OneDrive make files look missing?",
    "a": "It can look that way, yes. When an account is over its storage limit for a while it can end up frozen or read-only, and files start misbehaving &mdash; not opening, not syncing, changes not saving. If you&rsquo;ve been getting storage warnings, sort that first: see our OneDrive-is-full guide. Also worth ruling out a service outage with our free /is-it-down/ checker."
   },
   {
    "q": "What does it cost to have you look at it?",
    "a": "Remote support starts from &pound;20 &mdash; we connect while you watch, run the checks properly, and give you a straight answer. If the problem turns out to be a failing local disk, collection is free across the Bournemouth and Poole area and we always diagnose and quote before any paid work. Mon&ndash;Fri 9&ndash;5, on 01202 775566, or text 07520 615332."
   }
  ],
  "schemaKind": "service",
  "serviceName": "OneDrive Missing Files Help",
  "howToName": "How to find files missing from OneDrive",
  "howToSteps": [
   {
    "name": "Check which Microsoft account you are in",
    "text": "Sign in at onedrive.com with every Microsoft account you have ever used, and check the account the OneDrive tray app is syncing under Settings &gt; Account. Files often live in a second, forgotten account."
   },
   {
    "name": "Rule out cloud placeholders and other devices",
    "text": "Files with a cloud outline icon are online-only placeholders that look empty when you are offline or signed out &mdash; reconnect and they reappear. Also remember a deletion on any device syncing the same account removes the file everywhere."
   },
   {
    "name": "Check the OneDrive recycle bin online",
    "text": "At onedrive.com open Recycle bin and restore what you need promptly. Assume 30 days retention on personal accounts (93 on work or school accounts by default) &mdash; Microsoft&rsquo;s own pages disagree on the exact figure, so do not wait."
   },
   {
    "name": "Use the full rewind or get honest help",
    "text": "Microsoft 365 subscribers can use Settings &gt; Restore your OneDrive to rewind the whole drive up to 30 days. If nothing has worked, a remote session from &pound;20 gets an experienced check before you pay for recovery software &mdash; call 01202 775566."
   }
  ],
  "crossLinksHtml": "<ul><li><a href=\"/onedrive-problems/\">OneDrive problems &mdash; the full triage hub</a></li><li><a href=\"/onedrive-moved-my-desktop-and-documents/\">OneDrive moved my Desktop and Documents</a></li><li><a href=\"/onedrive-full-cant-send-email/\">OneDrive is full (and now email won&rsquo;t send)</a></li><li><a href=\"/stop-using-onedrive-without-losing-files/\">Stop using OneDrive without losing files</a></li><li><a href=\"/microsoft-365-backup-do-you-need-it/\">Do you need Microsoft 365 backup?</a></li><li><a href=\"/microsoft-365-support/\">Microsoft 365 support &amp; management</a></li><li><a href=\"/is-it-down/\">Is it down? Free outage checker</a></li></ul>",
  "crumbName": "Files Missing From OneDrive",
  "primaryCta": [
   "Get It Fixed Remotely",
   "/dell-remote-support/"
  ],
  "secondaryCta": [
   "Call 01202 775566",
   "tel:+441202775566"
  ]
 },
 {
  "slug": "onedrive-full-cant-send-email",
  "title": "OneDrive Full &amp; Can&rsquo;t Send Email? The Fix, Step by Step | 365 Techies",
  "metaDesc": "OneDrive full, email bouncing, account frozen? Your files are not deleted. Plain-English fix from Dorset&rsquo;s family-run Microsoft specialists &mdash; remote help from &pound;20.",
  "ogTitle": "OneDrive Is Full &mdash; and Now Your Email Is Bouncing. Here&rsquo;s the Fix",
  "eyebrow": "OneDrive &amp; Microsoft storage",
  "h1": "OneDrive is full &mdash; and now your email is bouncing",
  "lede": "Take a breath: your files are NOT deleted, and your email account is not gone. A full OneDrive and broken Outlook.com email are the same problem wearing two hats &mdash; Microsoft just never explains the connection on one page. Below is the plain-English version: why it happens, the real deadlines, and the fastest way back under the limit. If you&rsquo;d rather not touch it, we&rsquo;ll sort it remotely from &pound;20 while you watch.",
  "chips": [
   "Your files are NOT deleted",
   "Remote fix from &pound;20",
   "Family-run since 1995"
  ],
  "ctaHead": "Never want to see this error again?",
  "ctaSub": "On our managed Microsoft 365 service (&pound;4.85 per user, per month) storage, licences and renewals are watched for you &mdash; so a full account never gets the chance to bounce your email. Family-run, supporting Microsoft software since 1995. Mon&ndash;Fri 9&ndash;5 on 01202 775566, or text 07520 615332.",
  "sections": [
   {
    "eyebrow": "The collision",
    "h2": "Why a full OneDrive stops your email working",
    "html": "<p>Here&rsquo;s the bit Microsoft splits across four different help pages. A free Microsoft account comes with <strong>5GB of cloud storage</strong>, and that pool is shared between your OneDrive files <em>and</em> the attachments sitting in your Outlook.com email. Your mailbox itself has a separate 15GB allowance &mdash; but the 5GB pool is the one that fills up first, usually with phone photos you didn&rsquo;t know were backing up.</p><p>And Microsoft&rsquo;s own rules are blunt: once your account is over its storage quota, you can&rsquo;t send <em>or receive</em> email through Outlook.com &mdash; even if your mailbox is nowhere near its own 15GB limit. New messages sent to you are returned to the sender, which is why people started telling you your email &ldquo;doesn&rsquo;t work&rdquo; before you noticed anything was wrong.</p><p>So the cure for your email problem lives in OneDrive, not in Outlook. (If your email is broken for a different reason &mdash; passwords, settings, the new Outlook app &mdash; see our guide to <a href=\"/outlook-problems/\">common Outlook problems</a> instead.)</p>"
   },
   {
    "eyebrow": "The countdown",
    "h2": "What actually happens when OneDrive fills up",
    "html": "<p>There is a timeline here, and knowing it stops the panic. None of it is instant, and nothing has been deleted yet.</p><ul><li><strong>The moment you go over:</strong> new uploads stop, phone photo backup stops, files stop syncing &mdash; and Outlook.com email starts bouncing.</li><li><strong>Around three months over the limit:</strong> Microsoft can freeze the account. Frozen means your existing files go <em>read-only</em> &mdash; you can still open and download everything, but you can&rsquo;t upload, edit or sync, and you can&rsquo;t send Teams messages with attachments.</li><li><strong>Around six months frozen:</strong> Microsoft says it <em>may</em> delete your OneDrive and everything in it &mdash; and once that happens, the files are non-recoverable. &ldquo;May&rdquo; is Microsoft&rsquo;s word, not a guarantee of a stay of execution. Don&rsquo;t gamble on it.</li></ul><p>Two reassurances worth repeating. First, <strong>frozen is not deleted</strong> &mdash; a frozen account with &ldquo;empty-looking&rdquo; folders on your PC is usually just sync being blocked, not lost data (if things genuinely look missing, start with <a href=\"/files-missing-from-onedrive/\">files missing from OneDrive</a>). Second, you can unfreeze it yourself today &mdash; the steps are below.</p>"
   },
   {
    "eyebrow": "Check it&rsquo;s genuine",
    "h2": "Is that &ldquo;your files will be erased&rdquo; email real?",
    "html": "<p>Microsoft really does send warning emails when your storage is full or your account is heading for a freeze &mdash; and because everyone knows that, scammers copy them almost pixel-for-pixel. The scary email in your inbox could be either.</p><p>The safe habit is simple: <strong>never click the links in the email itself</strong>. Instead, open your browser and type <strong>account.microsoft.com</strong> yourself, sign in, and look at the storage meter. If you&rsquo;re genuinely over the limit, you&rsquo;ll see it there in red &mdash; no email required. If the meter looks fine but the email insists you must &ldquo;verify your account&rdquo; or pay immediately, delete it.</p><p>While you&rsquo;re in there, it&rsquo;s a good moment to check your account security generally &mdash; our guide to <a href=\"/how-to-secure-your-microsoft-365-account/\">securing your Microsoft 365 account</a> takes about ten minutes to follow.</p>"
   },
   {
    "eyebrow": "The fix",
    "h2": "Get back under the limit &mdash; fastest wins first",
    "html": "<p>You don&rsquo;t need to delete everything &mdash; you need to find the handful of things eating the space. In order:</p><ol><li><strong>See what&rsquo;s using the space.</strong> Sign in at onedrive.com, open Settings, and look for the storage summary &mdash; it breaks down what&rsquo;s taking the room and can list your largest files. Nine times out of ten it&rsquo;s videos and phone camera backups.</li><li><strong>Move the big stuff off.</strong> Download the biggest files to your PC or an external drive, check they open, <em>then</em> delete them from OneDrive. One caution: a file with a little cloud icon next to it is an online-only placeholder &mdash; it holds no data on your PC. Download it properly (or right-click &gt; <em>Always keep on this device</em>) before you delete the cloud copy.</li><li><strong>Turn off camera upload if you never meant it.</strong> The OneDrive app on your phone quietly backs up every photo and video by default on many setups &mdash; lovely until it fills 5GB. Move the photos somewhere deliberate, then switch the upload off.</li><li><strong>Clear out jumbo email attachments.</strong> They count against the same 5GB pool. In Outlook.com, sort your mail by size and delete the old messages with huge attachments (save anything you need first).</li><li><strong>Empty the OneDrive recycle bin &mdash; this is the step everyone misses.</strong> Deleted files can carry on counting against your quota for up to 30 days until the bin is emptied. On onedrive.com, open the recycle bin and empty it.</li><li><strong>Then wait a little.</strong> Microsoft says storage changes can take up to a couple of hours to register. Don&rsquo;t panic-delete more because the meter hasn&rsquo;t moved in five minutes.</li></ol>"
   },
   {
    "eyebrow": "Unfreezing",
    "h2": "Account already frozen? How to unfreeze it",
    "html": "<p>If you&rsquo;ve had the freeze notice, go to onedrive.com in a browser and sign in &mdash; you&rsquo;ll be walked through your two options: get back under the limit by deleting files, or buy more storage. Either path unfreezes the account.</p><p>Before you delete anything, remember that read-only still means <strong>you can download everything</strong>. If there are irreplaceable files in there &mdash; family photos, business records &mdash; take a copy onto your own PC or an external drive first, belt and braces. (Frozen accounts are also a sharp reminder that OneDrive sync is not the same thing as a real backup &mdash; here&rsquo;s <a href=\"/microsoft-365-backup-do-you-need-it/\">why that distinction matters</a>.)</p><p>Once you&rsquo;re under quota or you&rsquo;ve added storage, allow up to a couple of hours for the account to thaw and email to start flowing again. If your freeze email mentioned a deadline date, please don&rsquo;t leave this to the last day &mdash; the six-month deletion clock is the one part of this with no undo button.</p><p>Stuck at any step &mdash; wrong account, can&rsquo;t sign in, meter won&rsquo;t budge? That&rsquo;s a ten-minute job for us by <a href=\"/dell-remote-support/\">secure remote session from &pound;20</a>. We call before we connect, and you watch everything we do.</p>"
   },
   {
    "eyebrow": "The decision",
    "h2": "Buy more storage, or fix it properly?",
    "html": "<p>Once you&rsquo;re unfrozen, decide how you&rsquo;ll stop this happening again. The honest comparison:</p><ul><li><strong>Tidy up every few months (free).</strong> Works fine if photos were the culprit and you&rsquo;ve turned camera upload off. Costs nothing but your time &mdash; and it will creep back if you don&rsquo;t.</li><li><strong>Pay Microsoft for more storage.</strong> A storage add-on or a Microsoft 365 Personal subscription (which includes 1TB) makes the problem go away for a monthly fee. Prices change often enough that we won&rsquo;t print them here &mdash; check microsoft.com for the current UK figures before you buy, and only ever buy from Microsoft directly.</li><li><strong>For a business: have someone watch it for you.</strong> On our <a href=\"/microsoft-365-support/\">managed Microsoft 365</a> service at &pound;4.85 per user, per month, storage quotas, licences and renewals are monitored &mdash; nobody on it ever finds out about a full account from a bounced invoice. Broader cover starts from &pound;24.38 per computer on our <a href=\"/business-it-support-plans/\">business support plans</a>.</li><li><strong>For a home PC:</strong> our <a href=\"/monthly-it-support/\">home support plan</a> is &pound;18.25 per computer, per month &mdash; we keep an eye on things like this, and you get a written Service Report after every session so you can see exactly what was checked.</li></ul><p>We&rsquo;ve supported Microsoft accounts and software since 1995, and taught it for over 10 years at our own Dorset Microsoft Education Resource Centre &mdash; so when we say the storage-full trap is one of the most common calls we get, it&rsquo;s from experience, not a script. We&rsquo;re remote-first with free local collection if a machine ever needs hands-on work; there&rsquo;s no walk-in shop, and we meet at Kinson Community Centre by appointment.</p>"
   }
  ],
  "faqs": [
   {
    "q": "Will Microsoft really delete my files?",
    "a": "Not immediately, and not without warning. Go over your storage limit for around three months and the account can be frozen (read-only). Microsoft says that after around six months frozen it may delete your OneDrive and everything in it &mdash; and once deleted, those files are non-recoverable. &ldquo;May&rdquo; is not a promise it won&rsquo;t, so treat the freeze notice as your deadline to act."
   },
   {
    "q": "My mailbox isn&rsquo;t full &mdash; so why can&rsquo;t I send or receive email?",
    "a": "Because a free Microsoft account has a shared 5GB cloud storage pool covering OneDrive files and email attachments, separate from the 15GB mailbox allowance. Once that shared pool is over quota, Outlook.com stops sending and receiving email even if the mailbox itself has plenty of room, and incoming messages are returned to the sender."
   },
   {
    "q": "I&rsquo;ve deleted loads of files but I&rsquo;m still over the limit. Why?",
    "a": "Two usual reasons. First, deleted files can keep counting against your quota for up to 30 days until you empty the OneDrive recycle bin &mdash; empty it at onedrive.com. Second, Microsoft says storage changes can take up to a couple of hours to show, so give the meter time before deleting anything else."
   },
   {
    "q": "What does a &ldquo;frozen&rdquo; OneDrive account actually mean?",
    "a": "Your existing files go read-only: you can still open and download everything, but you can&rsquo;t upload, edit or sync, and Teams messages with attachments are blocked. Frozen is not deleted &mdash; it&rsquo;s Microsoft applying the handbrake until you get back under the limit or buy storage."
   },
   {
    "q": "How long does it take to unfreeze my account?",
    "a": "Once you&rsquo;re back under the limit (or you&rsquo;ve bought more storage), Microsoft says the change can take up to a couple of hours to apply. Email starts flowing again once the account is out of the red."
   },
   {
    "q": "How do I know the &ldquo;your files will be erased&rdquo; email is genuine and not a scam?",
    "a": "Never click the links in the email. Type account.microsoft.com into your browser yourself, sign in, and check the storage meter. A genuine problem shows there in red; if the meter looks fine but the email demands urgent action or payment, it&rsquo;s a fake &mdash; delete it."
   },
   {
    "q": "How much storage do I actually get for free?",
    "a": "A free Microsoft account includes 5GB of cloud storage shared between OneDrive and your email attachments, plus a separate 15GB allowance for the Outlook.com mailbox itself. Paid Microsoft 365 plans include far more &mdash; Microsoft 365 Personal comes with 1TB."
   },
   {
    "q": "Can you just fix this for me?",
    "a": "Yes. We fix full and frozen OneDrive accounts by secure remote session from &pound;20 &mdash; we call before we connect, you watch everything, Mon&ndash;Fri 9&ndash;5. Businesses that never want this again can move to our managed Microsoft 365 at &pound;4.85 per user, per month, where storage and licences are watched for you."
   },
   {
    "q": "Should I just stop using OneDrive instead?",
    "a": "You can, but do it in the right order &mdash; done wrong, you can strand files in the cloud or empty your Desktop and Documents folders. Our guide to leaving OneDrive without losing files walks through the safe sequence step by step."
   }
  ],
  "schemaKind": "service",
  "serviceName": "OneDrive Full / Frozen Microsoft Account Fix",
  "howToName": "Fix a full OneDrive that is blocking your email",
  "howToSteps": [
   {
    "name": "Check your storage meter",
    "text": "Type account.microsoft.com into your browser (never click links in warning emails), sign in and check the storage meter to confirm the 5GB shared pool really is full."
   },
   {
    "name": "Remove the biggest space-eaters",
    "text": "At onedrive.com, use the storage summary to find your largest files &mdash; usually videos and phone photo backups. Download copies you want to keep, check they open, then delete the cloud copies. Delete jumbo email attachments in Outlook.com too."
   },
   {
    "name": "Empty the OneDrive recycle bin",
    "text": "Deleted files can keep counting against your quota for up to 30 days until the bin is emptied. Empty it at onedrive.com, then allow up to a couple of hours for the storage change to apply and email to resume."
   },
   {
    "name": "Unfreeze and decide long-term",
    "text": "If the account was frozen, sign in at onedrive.com and follow the prompts to unfreeze by deleting files or buying storage. Then choose a lasting fix: regular tidy-ups, a Microsoft storage plan, or managed Microsoft 365 from 365 Techies on 01202 775566."
   }
  ],
  "crossLinksHtml": "<ul><li><a href=\"/onedrive-problems/\">OneDrive problems &amp; fixes &mdash; start here</a></li><li><a href=\"/files-missing-from-onedrive/\">Files missing from OneDrive? The 10-minute checklist</a></li><li><a href=\"/onedrive-moved-my-desktop-and-documents/\">OneDrive moved my Desktop and Documents &mdash; the safe undo</a></li><li><a href=\"/stop-using-onedrive-without-losing-files/\">Stop using OneDrive without losing files</a></li><li><a href=\"/outlook-problems/\">Common Outlook problems (when it&rsquo;s not a storage issue)</a></li><li><a href=\"/is-it-down/\">Is OneDrive actually down? Check here</a></li><li><a href=\"/microsoft-365-backup-do-you-need-it/\">Microsoft 365 backup &mdash; do you need it?</a></li><li><a href=\"/how-to-secure-your-microsoft-365-account/\">How to secure your Microsoft 365 account</a></li><li><a href=\"/microsoft-365-support/\">Microsoft 365 support &amp; management</a></li></ul>",
  "crumbName": "OneDrive Full",
  "primaryCta": [
   "Talk to a Techie",
   "/contact/"
  ],
  "secondaryCta": [
   "Call 01202 775566",
   "tel:+441202775566"
  ]
 },
 {
  "slug": "stop-using-onedrive-without-losing-files",
  "title": "How to Stop Using OneDrive Without Losing Files &mdash; the Safe Order | 365 Techies",
  "metaDesc": "Leaving OneDrive is safe if you do four steps in the right order: real local copies first, Folder Backup off, unlink, then uninstall. Plain-English guide from a family-run Bournemouth firm &mdash; nothing gets deleted, and we&rsquo;ll do it remotely from &pound;20 if you&rsquo;d rather watch.",
  "ogTitle": "Leaving OneDrive safely: the four steps in the right order",
  "eyebrow": "OneDrive problems",
  "h1": "How to stop using OneDrive &mdash; without losing a single file",
  "lede": "You can leave OneDrive safely. None of the four steps below deletes your files &mdash; not turning off Folder Backup, not unlinking, not even uninstalling the app &mdash; <em>provided you do them in the right order</em>. The order is the part Microsoft never puts on one page, and it&rsquo;s the part people rightly worry about, because one step done too early can leave you staring at empty folders. This guide is for leaving OneDrive entirely. If you just want your Desktop and Documents back where they were after Windows moved them, that&rsquo;s a different (and smaller) job &mdash; see <a href=\"/onedrive-moved-my-desktop-and-documents/\">OneDrive moved my Desktop and Documents</a> instead. We&rsquo;ve been setting up &mdash; and un-setting-up &mdash; Microsoft software since 1995, so here&rsquo;s the sequence we actually use on customer machines.",
  "chips": [
   "Nothing here deletes your files &mdash; each step explained",
   "One-shot remote fix from &pound;20 &mdash; watch us do it",
   "Family-run since 1995 &mdash; 4.9 on Google"
  ],
  "ctaHead": "Nervous about doing this yourself? Fair enough &mdash; it&rsquo;s a one-shot job.",
  "ctaSub": "We&rsquo;ll do the whole sequence in one careful remote session from &pound;20, while you watch every click &mdash; and we always call before we connect. Call 01202 775566 or text 07520 615332, Mon&ndash;Fri 9&ndash;5. Remote-first across Bournemouth, Poole, Christchurch &amp; Dorset, with free local collection if a machine ever needs hands-on work &mdash; no walk-in shop, and no need for one.",
  "sections": [
   {
    "eyebrow": "Read this first",
    "h2": "Why the order matters more than the steps",
    "html": "<p>Every horror story about &ldquo;OneDrive deleted my files&rdquo; that we&rsquo;ve untangled on a real Dorset computer comes down to steps done out of sequence &mdash; usually unlinking or uninstalling <em>before</em> making sure the files actually existed on the PC. Here&rsquo;s the catch: with a feature called <strong>Files On-Demand</strong>, many of the files you see in your OneDrive folder aren&rsquo;t really on your computer at all. They&rsquo;re placeholders &mdash; tiny stand-ins that download the real file from the cloud when you open it. Stop syncing while your files are still placeholders and they become unreachable from that PC. Nothing is deleted &mdash; the real copies are still in the cloud &mdash; but it certainly <em>feels</em> like everything vanished.</p><p>So the safe order is simply: <strong>make everything real on your PC first, then untangle Desktop and Documents, then disconnect</strong>. Four steps, maybe twenty minutes plus download time.</p><p>Want a reversible trial separation before committing? Click the OneDrive cloud icon in the taskbar tray, open the settings gear, and choose <strong>Pause syncing</strong>. Nothing moves, nothing changes &mdash; OneDrive just stops for a few hours so you can see how the computer feels without it churning away. When you&rsquo;re ready to leave properly, carry on below.</p>"
   },
   {
    "eyebrow": "Step 1",
    "h2": "Make every file a real local copy first",
    "html": "<p>This is the step that makes everything after it safe &mdash; and the one every frustrated forum thread skips.</p><ol><li>Open <strong>File Explorer</strong> and find your OneDrive folder in the left-hand sidebar (usually at C:\\Users\\&lt;name&gt;\\OneDrive).</li><li>Look at the little status icons. A <strong>cloud outline</strong> means the file is online-only &mdash; a placeholder holding no data on your PC. A <strong>green tick</strong> means it&rsquo;s genuinely on the machine.</li><li>Right-click the top-level OneDrive folder itself and choose <strong>&ldquo;Always keep on this device&rdquo;</strong>. OneDrive will start downloading everything for real.</li><li>Wait until every icon shows a tick. Depending on how much you have and your broadband, this can take minutes or hours &mdash; let it finish. Check you have enough free disk space first; if the drive is nearly full, copy the OneDrive contents to an external drive instead and treat that as your local copy.</li></ol><p>Belt-and-braces option: once everything has ticks, copy the whole lot to a second location (an external drive is ideal) before going further. It&rsquo;s rarely strictly necessary, but nobody has ever regretted it &mdash; and if you take one habit away from this page, let it be that a second copy of anything important is never wasted effort.</p>"
   },
   {
    "eyebrow": "Step 2",
    "h2": "Turn off Folder Backup &mdash; and pick the right button",
    "html": "<p>If your Desktop, Documents or Pictures currently live <em>inside</em> the OneDrive folder, that&rsquo;s Folder Backup at work &mdash; Windows has redirected those folders into OneDrive rather than copying them. Newer Windows 11 machines often switch this on automatically when you sign in with a Microsoft account, so it&rsquo;s very possible nobody ever chose it. It has to come off <em>before</em> you unlink, or your everyday folders will still point into the OneDrive path afterwards.</p><ol><li>Click the OneDrive cloud in the tray, then the <strong>gear &gt; Settings</strong>.</li><li>Go to <strong>Sync and backup &gt; Manage backup</strong>.</li><li>Turn off backup for each folder listed &mdash; Desktop, Documents, Pictures and any others.</li></ol><p><strong>The trap to watch for:</strong> when you stop backing up a folder, OneDrive may ask what to do with the files, with options along the lines of keeping files <em>only in OneDrive</em> or keeping them <em>on this PC</em> (the exact wording varies a little between versions at the time of writing). Choose the option that keeps files <strong>on this PC</strong>. Choose the OneDrive-only option and your Desktop and Documents will look empty on the computer &mdash; the files aren&rsquo;t gone, but you&rsquo;ll have given yourself a fright and an extra job.</p><p>One more gotcha Microsoft buries in its own help pages: files that were already backed up can <strong>stay in the OneDrive folder</strong> rather than reappearing in your device folders. If your Desktop looks sparse after this step, open the OneDrive folder, and move the contents of its Desktop, Documents and Pictures folders back into C:\\Users\\&lt;name&gt;\\Desktop, C:\\Users\\&lt;name&gt;\\Documents and C:\\Users\\&lt;name&gt;\\Pictures. Our <a href=\"/onedrive-moved-my-desktop-and-documents/\">Folder Backup guide</a> walks through that move-back step by step if you&rsquo;d like more hand-holding.</p>"
   },
   {
    "eyebrow": "Step 3",
    "h2": "Unlink this PC &mdash; the actual goodbye",
    "html": "<p>This is the step that stops OneDrive syncing, and Microsoft&rsquo;s own support pages are clear about what it does and doesn&rsquo;t do: unlinking stops the sync relationship <strong>without deleting the files on your PC and without deleting the copies in the cloud</strong>. Both survive; they just stop talking to each other.</p><ol><li>Tray cloud icon <strong>&gt; gear &gt; Settings &gt; Account</strong>.</li><li>Click <strong>&ldquo;Unlink this PC&rdquo;</strong> and confirm.</li></ol><p>From this moment, the OneDrive folder on your computer becomes an ordinary folder full of ordinary files &mdash; every one of them real, because you did Step 1. Changes you make on the PC no longer go to the cloud, and nothing that happens in the cloud touches your PC.</p><p>Tidy-up: move the contents of the old OneDrive folder into your normal Documents, Pictures and so on (if Step 2 hasn&rsquo;t already done most of that), so nothing important is left living in a folder called OneDrive that no longer syncs. Your files in the cloud are still sitting safely at onedrive.com under the same Microsoft account &mdash; nothing you&rsquo;ve done so far has touched them.</p>"
   },
   {
    "eyebrow": "Step 4 &mdash; optional",
    "h2": "Uninstall OneDrive, or just leave it signed out",
    "html": "<p>Strictly optional. Once unlinked, OneDrive is inert &mdash; you can simply ignore it. If you&rsquo;d rather it were gone:</p><ol><li>Open <strong>Settings &gt; Apps &gt; Installed apps</strong>.</li><li>Find <strong>Microsoft OneDrive</strong>, click the three dots, choose <strong>Uninstall</strong>.</li></ol><p>Microsoft&rsquo;s own support page puts it plainly: &ldquo;You won&rsquo;t lose files or data by uninstalling OneDrive from your computer.&rdquo; Your local files stay exactly where they are, and anything still in the cloud remains available by signing in at onedrive.com in a browser.</p><p>One honest caution: you&rsquo;ll find scripts and registry tweaks online that promise to rip OneDrive out of Windows entirely. We don&rsquo;t recommend them on home or small-business machines &mdash; they can misbehave after Windows updates, and the standard uninstall above achieves everything that actually matters.</p><p>Last decision: what to do with the copies still in the cloud. There&rsquo;s no rush &mdash; we&rsquo;d suggest leaving them for a few weeks as a free safety net until you&rsquo;re confident everything is on your PC. After that, keep them, or sign in at onedrive.com and delete them; that&rsquo;s the one and only action in this whole process that removes anything, and it only happens if <em>you</em> choose it. If a full OneDrive has also frozen your Microsoft account or bounced your email, that&rsquo;s a separate problem with its own page: <a href=\"/onedrive-full-cant-send-email/\">OneDrive full and can&rsquo;t send email</a>.</p>"
   },
   {
    "eyebrow": "The anxiety-killer",
    "h2": "What each step does &mdash; and doesn&rsquo;t &mdash; delete",
    "html": "<p>Pin this to the fridge. Here&rsquo;s the whole process in one honest table:</p><table><thead><tr><th>Step</th><th>What changes</th><th>What is NOT deleted</th></tr></thead><tbody><tr><td><strong>Pause syncing</strong> (the trial run)</td><td>Syncing stops temporarily</td><td>Nothing &mdash; fully reversible</td></tr><tr><td><strong>1. Always keep on this device</strong></td><td>Placeholders become real local files</td><td>Nothing &mdash; it only downloads</td></tr><tr><td><strong>2. Turn off Folder Backup</strong></td><td>Desktop &amp; Documents point back at C:\\Users\\&lt;name&gt;\\&hellip;</td><td>Nothing, if you choose &ldquo;keep on this PC&rdquo; &mdash; some files may need moving back from the OneDrive folder</td></tr><tr><td><strong>3. Unlink this PC</strong></td><td>Syncing stops permanently</td><td>Nothing &mdash; local files stay, cloud copies stay</td></tr><tr><td><strong>4. Uninstall OneDrive</strong></td><td>The app is removed</td><td>Nothing &mdash; local files stay, cloud copies stay at onedrive.com</td></tr></tbody></table><p>The only thing in this entire process that ever deletes a file is you, choosing to empty the cloud afterwards. If files already seem to be missing before you&rsquo;ve started, stop here and work through <a href=\"/files-missing-from-onedrive/\">files missing from OneDrive</a> first &mdash; leaving OneDrive won&rsquo;t bring them back, but that checklist very often will.</p>"
   },
   {
    "eyebrow": "The honest bit",
    "h2": "What you give up by leaving &mdash; and the middle ground",
    "html": "<p>We&rsquo;re not anti-OneDrive, and it wouldn&rsquo;t be honest to send you off without saying what you&rsquo;re losing. A working OneDrive gives you an off-site copy of your documents if the PC is stolen or the drive dies, version history to rewind a mangled file, and a degree of ransomware rollback. Walk away and those go with it &mdash; so please put something in their place, whether that&rsquo;s an external drive you actually plug in, or a proper backup arrangement. And remember the flip side of the same truth: OneDrive sync was never a real backup anyway &mdash; our guide to <a href=\"/microsoft-365-backup-do-you-need-it/\">whether you need Microsoft 365 backup</a> explains why, and what genuine backup looks like.</p><p>There&rsquo;s also a middle ground most people are never shown: OneDrive configured <em>properly</em> &mdash; syncing what you choose, leaving your Desktop alone, signed into the right account. Half the people who ask us to remove OneDrive really just want it to stop doing things uninvited. We taught Microsoft software for over 10 years at our own Dorset Microsoft Education Resource Centre, and &ldquo;set it up the way I actually want&rdquo; is a &pound;20 remote session, not a lifestyle change.</p><p>Either way, here&rsquo;s how we can help: a one-off <a href=\"/dell-remote-support/\">remote session from &pound;20</a> to do the whole sequence &mdash; or the proper configuration &mdash; while you watch every click (we always call before we connect). For business machines, our <a href=\"/business-it-support-plans/\">business support plans from &pound;24.38 per computer</a> and managed Microsoft 365 at &pound;4.85 per user per month mean decisions like this get made deliberately across every machine, not by whatever Windows defaulted to. Home users can have the same watchful eye from &pound;18.25 per computer per month on a <a href=\"/monthly-it-support/\">monthly support plan</a> &mdash; including a written Service Report after each visit so you can see exactly what was checked and changed.</p>"
   }
  ],
  "faqs": [
   {
    "q": "Will I lose my files if I unlink OneDrive from my PC?",
    "a": "No. Unlinking stops the sync relationship and nothing more &mdash; Microsoft&rsquo;s own documentation confirms the files on your computer stay put and the copies in the cloud stay at onedrive.com. The one caveat: online-only placeholder files hold no data on the PC, which is why Step 1 of our sequence is making everything a real local copy before you unlink."
   },
   {
    "q": "Does uninstalling OneDrive delete my files?",
    "a": "No. Microsoft states plainly that you won&rsquo;t lose files or data by uninstalling OneDrive. Files already on your computer stay where they are, and anything in the cloud remains available by signing in at onedrive.com in a browser. Uninstalling only removes the app itself."
   },
   {
    "q": "What&rsquo;s the difference between pausing, unlinking and uninstalling OneDrive?",
    "a": "Pausing is a temporary, fully reversible stop &mdash; ideal as a trial run. Unlinking permanently disconnects that PC from the cloud while leaving both sets of files intact. Uninstalling removes the app entirely. None of the three deletes a single file, local or cloud."
   },
   {
    "q": "Why do I have to click &ldquo;Always keep on this device&rdquo; before anything else?",
    "a": "Because of Files On-Demand. Files showing a cloud outline icon are placeholders &mdash; they hold no actual data on your PC and download from the cloud when opened. If you unlink or uninstall while files are still placeholders, they become unreachable from that computer. &ldquo;Always keep on this device&rdquo; downloads everything for real first, which makes every later step safe."
   },
   {
    "q": "Will my Desktop and Documents empty out when I turn off Folder Backup?",
    "a": "Not if you pick the right option. When you stop backing up a folder, choose to keep files on this PC &mdash; not the OneDrive-only option. Even then, files that were already backed up can remain in the OneDrive folder rather than reappearing in your device folders, so you may need to move them back into C:\\Users\\&lt;name&gt;\\Desktop and C:\\Users\\&lt;name&gt;\\Documents manually. Our Folder Backup guide covers that move-back step by step."
   },
   {
    "q": "What happens to the files already in the cloud after I leave OneDrive?",
    "a": "They stay exactly where they are, at onedrive.com, under your Microsoft account. Leaving OneDrive on your PC doesn&rsquo;t touch them. We suggest keeping them for a few weeks as a free safety net, then deciding: keep them indefinitely, or sign in through a browser and delete them. That deletion is the only action in the whole process that removes anything, and only you can trigger it."
   },
   {
    "q": "What do I actually give up by leaving OneDrive?",
    "a": "Three genuinely useful things: an off-site copy of your documents if the PC dies or is stolen, version history to rewind a damaged file, and a measure of ransomware rollback. If you leave, put a real backup in their place &mdash; and bear in mind OneDrive sync was never a complete backup anyway. Our Microsoft 365 backup guide explains the difference honestly."
   },
   {
    "q": "Can I stop OneDrive taking over without removing it completely?",
    "a": "Yes, and it&rsquo;s often the better answer. OneDrive can be configured to sync only the folders you choose, leave your Desktop and Documents alone, and sign into the right account. About half the people who ask us to remove it really just want it tamed. That&rsquo;s a single &pound;20 remote session for us &mdash; we&rsquo;ve supported Microsoft software since 1995 and taught it for over 10 years at our own Dorset Microsoft Education Resource Centre."
   },
   {
    "q": "Can you just do all this for me?",
    "a": "Gladly &mdash; it&rsquo;s a one-shot job and exactly what our remote support is for. From &pound;20 we&rsquo;ll run the whole sequence in one careful session while you watch every click, and we always call before we connect. Call 01202 775566 or text 07520 615332, Mon&ndash;Fri 9&ndash;5. If a machine ever needs hands-on work, collection is free locally &mdash; we&rsquo;re remote-first with no walk-in shop, and can meet at the Kinson Community Centre by appointment."
   },
   {
    "q": "Should my business turn OneDrive off?",
    "a": "Usually not &mdash; for a business the honest answer is nearly always to set it up properly rather than remove it: the right folders syncing, the right accounts signed in, version history working for you. That&rsquo;s what our managed Microsoft 365 service (&pound;4.85 per user per month) and business support plans from &pound;24.38 per computer are for &mdash; deliberate decisions across every machine, with a written Service Report so you can see what was done."
   }
  ],
  "schemaKind": "service",
  "serviceName": "Safe OneDrive Removal &amp; Setup Help, Dorset",
  "howToName": "How to stop using OneDrive without losing files",
  "howToSteps": [
   {
    "name": "Make every file a real local copy",
    "text": "In File Explorer, right-click the top-level OneDrive folder and choose &ldquo;Always keep on this device&rdquo;. Wait until every file shows a green tick &mdash; cloud-outline icons are online-only placeholders holding no data on your PC. Check free disk space first, and ideally copy everything to an external drive as well."
   },
   {
    "name": "Turn off Folder Backup",
    "text": "OneDrive Settings &gt; Sync and backup &gt; Manage backup &mdash; stop backing up Desktop, Documents and Pictures, choosing the option that keeps files on this PC. If already-backed-up files linger in the OneDrive folder, move them back into C:\\Users\\&lt;name&gt;\\Desktop and C:\\Users\\&lt;name&gt;\\Documents."
   },
   {
    "name": "Unlink this PC",
    "text": "OneDrive Settings &gt; Account &gt; &ldquo;Unlink this PC&rdquo;. Syncing stops permanently, but nothing is deleted &mdash; local files stay on the computer and cloud copies stay at onedrive.com. The OneDrive folder becomes an ordinary folder; move its contents into your normal folders."
   },
   {
    "name": "Optionally uninstall OneDrive",
    "text": "Settings &gt; Apps &gt; Installed apps &gt; Microsoft OneDrive &gt; Uninstall. Microsoft confirms you won&rsquo;t lose files or data by uninstalling. Leave the cloud copies at onedrive.com as a safety net for a few weeks, then keep or delete them &mdash; and put a real backup in OneDrive&rsquo;s place."
   }
  ],
  "crossLinksHtml": "<ul><li><a href=\"/onedrive-problems/\">OneDrive problems &amp; fixes</a> &mdash; the full symptom-by-symptom triage hub.</li><li><a href=\"/onedrive-moved-my-desktop-and-documents/\">OneDrive moved my Desktop and Documents</a> &mdash; undo Folder Backup without leaving OneDrive entirely.</li><li><a href=\"/files-missing-from-onedrive/\">Files missing from OneDrive</a> &mdash; the 10-minute checklist to run before anything else if files already look gone.</li><li><a href=\"/onedrive-full-cant-send-email/\">OneDrive full and email bouncing</a> &mdash; when a full account freezes storage and blocks your email.</li><li><a href=\"/microsoft-365-backup-do-you-need-it/\">Do you need Microsoft 365 backup?</a> &mdash; why sync was never backup, and what to use instead.</li><li><a href=\"/dell-remote-support/\">Remote support from &pound;20</a> &mdash; we do the whole sequence while you watch.</li><li><a href=\"/microsoft-365-support/\">Microsoft 365 support</a> &mdash; accounts, licences and setup, handled properly.</li></ul>",
  "crumbName": "Stop Using OneDrive Safely",
  "primaryCta": [
   "Get It Fixed Remotely",
   "/dell-remote-support/"
  ],
  "secondaryCta": [
   "Call 01202 775566",
   "tel:+441202775566"
  ]
 },
 {
  "slug": "excel-onedrive-sync-conflicts",
  "title": "Excel &ldquo;We Couldn&rsquo;t Merge the Changes&rdquo; &mdash; Fix OneDrive Sync Conflicts &amp; Recover Your Edits | 365 Techies",
  "metaDesc": "Excel says it couldn&rsquo;t merge your changes? Your edits are almost never lost. Find the conflict copy, rescue work with Version History and stop it recurring &mdash; plain-English help from a Dorset IT firm.",
  "ogTitle": "Excel Couldn&rsquo;t Merge Your Changes? Your Edits Are Probably Safe",
  "eyebrow": "Excel &amp; OneDrive Help",
  "h1": "Excel Sync Conflicts on OneDrive &mdash; Recover Your Edits and Stop &ldquo;We Couldn&rsquo;t Merge the Changes&rdquo;",
  "lede": "First things first: when Excel says <em>&ldquo;we couldn&rsquo;t merge the changes&rdquo;</em> or <em>&ldquo;your file wasn&rsquo;t saved because we couldn&rsquo;t merge your changes&rdquo;</em>, your work is almost never gone. OneDrive keeps <strong>both</strong> versions of the file when it can&rsquo;t reconcile them &mdash; the trick is knowing where the second copy went. This page shows you how to find it, how to rescue edits with Version History, and how to stop the conflict happening again. If you&rsquo;d rather someone did it with you, we&rsquo;re a family-run Dorset IT firm that&rsquo;s supported Microsoft software since 1995 &mdash; remote help from &pound;20.",
  "chips": [
   "Family-run since 1995",
   "4.9 on Google",
   "Remote fixes from &pound;20"
  ],
  "ctaHead": "An afternoon of edits at stake?",
  "ctaSub": "One of our techies can remote in, find the surviving copy and merge your work back together &mdash; usually from &pound;20. Mon&ndash;Fri 9&ndash;5. Call 01202 775566 or text 07520 615332.",
  "sections": [
   {
    "eyebrow": "What&rsquo;s Actually Happening",
    "h2": "Why Excel says it couldn&rsquo;t merge your changes",
    "html": "<p>When a workbook lives in OneDrive or SharePoint, Excel and OneDrive quietly merge everyone&rsquo;s edits in the background &mdash; that&rsquo;s how two people can type into the same spreadsheet at once. A sync conflict happens when two copies of the file drift apart in ways the merge engine can&rsquo;t reconcile. The usual culprits:</p><ul><li><strong>Offline edits reconnecting.</strong> You worked on the train or through a Wi-Fi dropout, and by the time your laptop got back online, the cloud copy had moved on too.</li><li><strong>Two machines holding different snapshots.</strong> A laptop and a desktop (or an office PC and a home PC) each edited their own cached copy of the workbook before either finished syncing.</li><li><strong>A collaborator&rsquo;s connection dropping mid-save.</strong> Their half-uploaded changes and your changes land on the same cells, and Excel can&rsquo;t decide whose version wins.</li></ul><p>The important bit: this is not corruption, and it&rsquo;s not something you did wrong. Excel is refusing to guess &mdash; which is the safe behaviour &mdash; and OneDrive&rsquo;s response is to keep <em>both</em> versions rather than overwrite either one. Your job is simply to find the second copy, which is what the next section covers.</p><p>If nothing is syncing at all site-wide, it may not be your file &mdash; check the service itself with our free <a href=\"/is-it-down/\">Is It Down?</a> tool before you start troubleshooting.</p>"
   },
   {
    "eyebrow": "Recovery First",
    "h2": "Your edits are almost certainly not lost &mdash; find the conflict copy",
    "html": "<p>When OneDrive can&rsquo;t merge an Office file, it resolves the stand-off by keeping both versions. One stays under the original name; the other is saved as a duplicate <em>conflict copy</em>, typically in the same folder with something extra in the filename &mdash; often your computer&rsquo;s name or the word &ldquo;copy&rdquo;. So the edits you think vanished are usually sitting a few rows down in File Explorer.</p><ol><li><strong>Open the folder the workbook lives in</strong> (in File Explorer under your OneDrive folder, or at onedrive.com) and sort by <em>Date modified</em>.</li><li><strong>Look for a near-identical filename</strong> stamped with a PC name or &ldquo;copy&rdquo;, modified at the time you were working.</li><li><strong>Open both files side by side.</strong> One will hold your missing edits; the other holds everyone else&rsquo;s. Decide which is the keeper, copy any stray changes across, then rename or delete the spare so nobody edits the wrong one next week.</li></ol><p>Also check the Excel error message itself if it&rsquo;s still on screen &mdash; the &ldquo;a copy has been created&rdquo; wording usually tells you it has parked your version for you.</p><p>In our experience most conflicts are fully recoverable this way, though we won&rsquo;t pretend every single one is &mdash; if the copy simply isn&rsquo;t there, move on to Version History below, and if that fails too, <a href=\"/contact/\">give us a ring</a> before you do anything drastic.</p>"
   },
   {
    "eyebrow": "The Safety Net",
    "h2": "Rescue lost edits with Version History",
    "html": "<p>Every Office file stored on OneDrive or SharePoint keeps a trail of earlier versions, and it&rsquo;s the cleanest way to compare &ldquo;before&rdquo; and &ldquo;after&rdquo; when a conflict has muddled things. Two ways in:</p><ul><li><strong>From File Explorer or onedrive.com:</strong> right-click the workbook and choose <em>Version history</em>.</li><li><strong>From inside Excel:</strong> click the file&rsquo;s name in the title bar at the top of the window, then choose <em>Version History</em>.</li></ul><p>You&rsquo;ll see a dated list of saves. Open any version and it loads read-only alongside your current file, so you can eyeball the differences, copy rescued cells across, or click <em>Restore</em> to roll the whole workbook back. Nothing is overwritten when you open an old version to look &mdash; browsing is completely safe.</p><p>A quiet word of honesty while you&rsquo;re here: Version History is a brilliant safety net, but it is <strong>not</strong> a backup &mdash; if the file itself is deleted, overwritten by ransomware or lost with the account, the history goes with it. We&rsquo;ve written up <a href=\"/microsoft-365-backup-do-you-need-it/\">whether Microsoft 365 needs a separate backup</a> if that thought nags at you.</p>"
   },
   {
    "eyebrow": "Prevention",
    "h2": "Stop the conflicts happening again",
    "html": "<p>A one-off conflict is bad luck. Weekly conflicts mean something in the setup is fighting you. Work down this list:</p><ul><li><strong>Turn AutoSave on.</strong> The toggle sits at the top-left of Excel&rsquo;s window. With AutoSave on, changes stream to the cloud every few seconds, so two machines rarely drift far enough apart to collide. You can make it the default under <em>File &gt; Options &gt; Save</em>. If the toggle is greyed out, the file either isn&rsquo;t stored on OneDrive/SharePoint or is in the old format &mdash; see the next point.</li><li><strong>Convert legacy .xls files.</strong> Microsoft&rsquo;s co-authoring only works with .xlsx, .xlsm or .xlsb files stored on OneDrive, OneDrive for Business or SharePoint. An old .xls workbook can&rsquo;t merge changes at all &mdash; <em>File &gt; Save As</em> and pick <em>Excel Workbook (.xlsx)</em>. If you&rsquo;ve inherited a folder full of ancient spreadsheets, our <a href=\"/excel-spreadsheet-rescue/\">Excel spreadsheet rescue</a> service sorts them out properly.</li><li><strong>Use Excel for the web for busy shared sessions.</strong> When five people hammer the same sheet on month-end day, the browser version syncs fastest &mdash; the smaller the sync window, the smaller the chance of a conflict.</li><li><strong>Know how Files On-Demand behaves.</strong> Online-only files (the cloud icon) download when opened; edits made while you&rsquo;re offline queue up and sync later &mdash; which is exactly the moment conflicts are born. If you routinely work offline, expect to check for conflict copies when you reconnect.</li><li><strong>Reset the Office Document Cache if uploads wedge.</strong> When Excel forever says &ldquo;uploading&hellip;&rdquo; or &ldquo;upload pending&rdquo;, the local cache has usually jammed. Check nothing genuinely is waiting to upload, close all Office apps and pause OneDrive, then rename the folder at <code>C:\\Users\\&lt;name&gt;\\AppData\\Local\\Microsoft\\Office\\16.0\\OfficeFileCache</code> (paste <code>%localappdata%\\Microsoft\\Office\\16.0\\OfficeFileCache</code> into the File Explorer address bar to jump straight there). Office rebuilds a fresh cache on next launch.</li><li><strong>Keep shared workbooks off Dropbox, Google Drive and mapped network drives.</strong> Office co-authoring genuinely does not work there &mdash; only OneDrive and SharePoint support it. Files shared any other way <em>will</em> produce duplicate copies and lost-edit headaches, no matter how carefully everyone behaves.</li></ul>"
   },
   {
    "eyebrow": "Related Snag",
    "h2": "Locked for editing?",
    "html": "<p>A close cousin of the sync conflict: Excel announces the file is <em>&ldquo;locked for editing by another user&rdquo;</em> &mdash; sometimes claiming it&rsquo;s locked by <strong>you</strong>. Nine times out of ten it&rsquo;s a phantom lock: the file is genuinely open on another of your devices (including the Excel app on your phone), or Excel closed without releasing its lock.</p><ol><li><strong>Close the file everywhere</strong> &mdash; every PC, laptop, tablet and phone that might have it open, including browser tabs with Excel for the web.</li><li><strong>Wait a few minutes.</strong> Stale locks normally release on their own once every session has closed.</li><li><strong>Still locked?</strong> Clear the Office Document Cache using the steps in the prevention list above &mdash; a wedged cache is the usual cause of a lock that refuses to die.</li></ol><p>And a reminder from the same Microsoft guidance: if the file is an old .xls, it can&rsquo;t be co-authored at all, so one person opening it locks everyone else out by design. Converting to .xlsx fixes that permanently.</p>"
   },
   {
    "eyebrow": "When to Call Us",
    "h2": "If your team hits this weekly, the files live in the wrong place",
    "html": "<p>The steps above will rescue today&rsquo;s workbook. But if merge conflicts, duplicate copies and &ldquo;who&rsquo;s got the latest version?&rdquo; emails are a weekly event in your business, the real problem is usually structural: spreadsheets bouncing round as email attachments, living in Dropbox, or sitting on an old mapped drive &mdash; none of which can co-author. We taught Excel for over 10 years at our own Dorset Microsoft Education Resource Centre, and proper co-authoring is the number one thing small teams are never shown.</p><p>Here&rsquo;s how we help, honestly priced:</p><ul><li><strong>Remote rescue of a conflicted workbook</strong> &mdash; from &pound;20. We connect (with you watching), find the surviving copies, merge the edits back and leave the file tidy. See <a href=\"/dell-remote-support/\">how our remote support works</a> &mdash; it&rsquo;s the same friendly service whatever make of PC you own.</li><li><strong>Managed Microsoft 365</strong> &mdash; &pound;4.85 per user per month. We set up OneDrive and SharePoint properly, move your shared files somewhere they can actually co-author, and show the team how to use it. More on our <a href=\"/microsoft-365-support/\">Microsoft 365 support</a> page.</li><li><strong>Ongoing cover</strong> &mdash; <a href=\"/business-it-support-plans/\">business support plans</a> from &pound;24.38 a month per computer (home plans &pound;18.25), and every session ends with a written Service Report so you can see exactly what was done and why.</li></ul><p>We&rsquo;re remote-first &mdash; most Excel and OneDrive problems never need a visit &mdash; but we&rsquo;re local too: on-site around Bournemouth, Poole and Dorset when it helps, free local collection if hardware&rsquo;s involved, and meetings by appointment at Kinson Community Centre. No call centre; you&rsquo;ll get the same familiar faces each time. Mon&ndash;Fri 9&ndash;5 on 01202 775566, or text 07520 615332.</p>"
   }
  ],
  "faqs": [
   {
    "q": "Excel says it couldn&rsquo;t merge my changes &mdash; is my work gone?",
    "a": "Almost certainly not. When OneDrive can&rsquo;t merge an Office file it keeps both versions &mdash; one under the original name and one as a duplicate conflict copy, usually in the same folder with your computer&rsquo;s name or the word &ldquo;copy&rdquo; in the filename. Sort the folder by date modified and open both. If the copy isn&rsquo;t there, Version History is the next place to look. Most conflicts are fully recoverable, though we&rsquo;d never promise every single one is."
   },
   {
    "q": "What actually causes the &ldquo;we couldn&rsquo;t merge the changes&rdquo; error?",
    "a": "Two copies of the workbook drifted apart in ways Excel couldn&rsquo;t safely reconcile &mdash; typically offline edits reconnecting, a laptop and a desktop each holding a different cached snapshot, or a collaborator&rsquo;s connection dropping mid-save. Excel refuses to guess whose changes win, and OneDrive keeps both versions instead of overwriting either."
   },
   {
    "q": "Where does OneDrive put the conflict copy?",
    "a": "In the same folder as the original, under a near-identical name &mdash; typically with the computer&rsquo;s name or &ldquo;copy&rdquo; appended. Check in File Explorer under your OneDrive folder and at onedrive.com, sorting by date modified around the time you were working."
   },
   {
    "q": "How do I get an older version of my spreadsheet back?",
    "a": "Right-click the file in File Explorer or at onedrive.com and choose Version history, or click the file&rsquo;s name in Excel&rsquo;s title bar and choose Version History. Earlier versions open read-only so you can compare safely, copy rescued cells across, or restore the whole file."
   },
   {
    "q": "Is Version History the same as a backup?",
    "a": "No. It&rsquo;s a safety net attached to the file &mdash; if the file itself is deleted, encrypted by ransomware or lost with the account, the history goes with it. We&rsquo;ve written a plain-English guide on whether Microsoft 365 needs a separate backup at /microsoft-365-backup-do-you-need-it/."
   },
   {
    "q": "Can two people edit the same Excel file on Dropbox or Google Drive?",
    "a": "Not with Office&rsquo;s co-authoring, no. Real-time merging of changes only works for files stored on OneDrive, OneDrive for Business or SharePoint. Workbooks shared via Dropbox, Google Drive or a mapped network drive will produce duplicate copies and overwrite headaches sooner or later, however careful everyone is."
   },
   {
    "q": "Why is AutoSave greyed out or turning itself off?",
    "a": "AutoSave only works for files saved to OneDrive or SharePoint in a modern format. If the workbook is on your local disk, a network drive, or is an old .xls file, the toggle stays off. Save the file to OneDrive as .xlsx and the toggle comes to life; you can make AutoSave the default under File &gt; Options &gt; Save."
   },
   {
    "q": "Excel says the file is locked for editing &mdash; by me. What&rsquo;s going on?",
    "a": "A phantom lock. The file is usually still open on another of your devices &mdash; including the Excel app on a phone or a forgotten browser tab &mdash; or Excel closed without releasing its lock. Close it everywhere, wait a few minutes, and if it persists clear the Office Document Cache (the folder at %localappdata%\\Microsoft\\Office\\16.0\\OfficeFileCache) with all Office apps closed."
   },
   {
    "q": "Does the old .xls format make conflicts worse?",
    "a": "Yes. Co-authoring requires .xlsx, .xlsm or .xlsb files stored on OneDrive or SharePoint, so an .xls workbook can&rsquo;t merge changes at all &mdash; one person opening it locks everyone else out. Use File &gt; Save As to convert it, or if you&rsquo;ve a whole folder of legacy spreadsheets, our Excel spreadsheet rescue service can modernise the lot."
   },
   {
    "q": "What does it cost to have 365 Techies sort this out?",
    "a": "Remote help starts from &pound;20 &mdash; enough for us to connect, recover the conflict copies and merge your edits back while you watch. Managed Microsoft 365 is &pound;4.85 per user per month, and ongoing business support plans start from &pound;24.38 a month per computer with a written Service Report after every session. Diagnosis first, honest quote before any bigger job. Mon&ndash;Fri 9&ndash;5 on 01202 775566."
   }
  ],
  "schemaKind": "service",
  "serviceName": "Excel OneDrive sync conflict recovery and Microsoft 365 co-authoring setup",
  "howToName": "How to recover Excel changes after a OneDrive sync conflict",
  "howToSteps": [
   {
    "name": "Find the conflict copy",
    "text": "OneDrive keeps both versions when it cannot merge an Office file. Open the workbook&rsquo;s folder in File Explorer or at onedrive.com, sort by date modified, and look for a near-identical filename with your computer&rsquo;s name or the word copy added."
   },
   {
    "name": "Open Version History",
    "text": "Right-click the file in File Explorer or at onedrive.com and choose Version history, or click the file&rsquo;s name in Excel&rsquo;s title bar and choose Version History to see a dated list of earlier saves."
   },
   {
    "name": "Compare and rescue your edits",
    "text": "Open the conflict copy or an earlier version alongside the current file &mdash; old versions open read-only, so browsing is safe. Copy any missing edits into the keeper, then restore or tidy up so only one authoritative file remains."
   },
   {
    "name": "Prevent the next conflict",
    "text": "Turn AutoSave on, save the file as .xlsx on OneDrive or SharePoint (co-authoring does not work with .xls or on Dropbox, Google Drive or mapped drives), and use Excel for the web for busy multi-user sessions."
   }
  ],
  "crossLinksHtml": "<p>More OneDrive and Office help: <a href=\"/onedrive-problems/\">OneDrive problems &mdash; start here</a> &middot; <a href=\"/excel-spreadsheet-rescue/\">Excel spreadsheet rescue</a> &middot; <a href=\"/microsoft-365-backup-do-you-need-it/\">Does Microsoft 365 need a backup?</a> &middot; <a href=\"/microsoft-365-support/\">Microsoft 365 support</a> &middot; <a href=\"/outlook-problems/\">Outlook problems</a> &middot; <a href=\"/how-to-secure-your-microsoft-365-account/\">Secure your Microsoft 365 account</a> &middot; <a href=\"/monthly-it-support/\">Monthly IT support</a></p>",
  "crumbName": "Excel Sync Conflicts",
  "primaryCta": [
   "Get It Fixed Remotely",
   "/dell-remote-support/"
  ],
  "secondaryCta": [
   "Call 01202 775566",
   "tel:+441202775566"
  ]
 },
 {
  "slug": "excel-spreadsheet-rescue",
  "title": "Excel Spreadsheet Rescue &amp; Repair | 365 Techies Bournemouth",
  "metaDesc": "Broken, corrupt or crawling Excel workbook? Honest spreadsheet rescue from a family-run Dorset firm supporting Microsoft Office since 1995. Remote fixes from &pound;20.",
  "ogTitle": "Excel Spreadsheet Rescue &mdash; honest repair for the workbook your business runs on",
  "eyebrow": "Excel help for homes &amp; small businesses",
  "h1": "Excel spreadsheet rescue &mdash; when the workbook your business runs on breaks",
  "lede": "Plenty of Dorset businesses run on one giant spreadsheet built years ago by someone who has since left. When it won&rsquo;t open, throws #REF! errors everywhere or takes five minutes to load, work stops. We&rsquo;ve supported Microsoft Office since 1995 &mdash; and taught Excel for more than ten years at our own Dorset Microsoft Education Resource Centre &mdash; so we rescue spreadsheets calmly, honestly and usually remotely, from &pound;20.",
  "chips": [
   "Remote rescue from &pound;20",
   "Family-run since 1995",
   "4.9 on Google"
  ],
  "ctaHead": "Spreadsheet down and work stopped?",
  "ctaSub": "Call 01202 775566 (Mon&ndash;Fri 9&ndash;5) or text 07520 615332. We&rsquo;ll tell you quickly whether it&rsquo;s a &pound;20 remote fix, a bigger rescue job worth a quote &mdash; or, honestly, gone.",
  "sections": [
   {
    "eyebrow": "The problem",
    "h2": "The spreadsheet someone built years ago",
    "html": "<p>It started as a simple price list. Ten years later it runs the quoting, the stock, the wages calculation and half the filing system &mdash; and the person who built it left in 2019. Nobody dares touch it, there&rsquo;s no documentation, and this morning it either won&rsquo;t open, opens with errors, or has slowed to a crawl.</p><p>We see this every week. It&rsquo;s nothing to be embarrassed about &mdash; a spreadsheet that grew with the business is a sign the business grew. It just needs someone who has been working with Excel since the mid-nineties to untangle it without breaking what still works.</p><p>That&rsquo;s us. 365 Techies is a family-run Bournemouth firm that has supported Microsoft Office since 1995 and taught it for more than ten years at our own Dorset Microsoft Education Resource Centre. We don&rsquo;t just repair the file &mdash; we explain, in plain English, what went wrong and how to stop it happening again.</p>"
   },
   {
    "eyebrow": "What we fix",
    "h2": "The five spreadsheet disasters we rescue most",
    "html": "<p>Every rescue starts with a diagnosis, but almost all of them fall into one of these:</p><ul><li><strong>&ldquo;The file won&rsquo;t open&rdquo; or Excel reports it as corrupt.</strong> Sometimes Excel&rsquo;s built-in Open and Repair sorts it (see the free steps below). When that fails &mdash; which is exactly when most people find us &mdash; we work through deeper extraction options to pull your data and formulas out of the damaged file.</li><li><strong>#REF! carnage.</strong> Someone deleted a few rows, a column or a whole sheet, and now formulas across the workbook show #REF! instead of numbers. We trace what the broken references pointed at and rebuild them.</li><li><strong>Formulas overtyped with values.</strong> A well-meaning colleague typed this month&rsquo;s figures straight over the calculations. If the file lives on OneDrive or SharePoint, version history can often wind it back; if not, we rebuild the logic from an older copy or from the workbook&rsquo;s own structure.</li><li><strong>The 90MB monster that takes five minutes to open.</strong> Slow Excel is nearly always bloat: whole-column references, volatile formulas recalculating constantly, thousands of rows of invisible &ldquo;used range&rdquo;, and layers of stale conditional formatting. We slim the workbook down so it opens in seconds &mdash; without changing your numbers.</li><li><strong>Multi-user chaos.</strong> Conflict copies, &ldquo;locked for editing&rdquo; messages and a folder full of <em>Report-final-FINAL-v7.xlsx</em>. Usually the file is simply stored in the wrong place for teamwork &mdash; we set up proper Microsoft 365 co-authoring so everyone works in one live copy. If you&rsquo;re seeing &ldquo;we couldn&rsquo;t merge the changes&rdquo;, start with our guide to <a href=\"/excel-onedrive-sync-conflicts/\">Excel and OneDrive sync conflicts</a>.</li></ul>"
   },
   {
    "eyebrow": "Free fixes first",
    "h2": "Try this before you pay anyone &mdash; including us",
    "html": "<p>Fair&rsquo;s fair: some rescues are free and take two minutes. Try these first.</p><ul><li><strong>Make a copy of the broken file now.</strong> Before anything else. Every repair attempt should happen on a copy, never the only original.</li><li><strong>Open and Repair.</strong> In Excel choose File, then Open, then Browse to the file &mdash; but instead of double-clicking it, click it once, then click the small arrow next to the Open button and choose <strong>Open and Repair</strong>. Excel will offer to repair the workbook, or to extract just the data if repair fails. This is Microsoft&rsquo;s own built-in tool and it genuinely works on mild corruption.</li><li><strong>Check version history.</strong> If the file is stored on OneDrive or SharePoint, right-click it and choose Version history &mdash; you can open and restore an earlier copy from before the damage.</li><li><strong>Look for the recovered copy.</strong> If Excel crashed mid-edit, reopen Excel and check the Document Recovery pane on the left for an autosaved version.</li></ul><p><strong>When to stop:</strong> if Open and Repair fails, if the extracted data is missing sheets or formulas, or if the workbook is behaving strangely rather than refusing to open &mdash; stop saving, stop &ldquo;having a go&rdquo;, and call us. Repeated failed repair attempts on the original file can make things worse, and a &pound;20 remote look is cheaper than a rebuilt spreadsheet.</p>"
   },
   {
    "eyebrow": "How it works",
    "h2": "Remote-first, with free collection when hands-on is needed",
    "html": "<p>Almost every spreadsheet rescue happens over a secure remote session while you watch, from <strong>&pound;20</strong>. We always phone you before we connect &mdash; you&rsquo;ll never see your mouse moving without knowing exactly who&rsquo;s on the other end &mdash; and you see everything we do to your file as we do it.</p><p>If the problem turns out to be the computer rather than the spreadsheet &mdash; a failing drive, for instance &mdash; we collect the machine from you free of charge locally, sort it, and bring it back. We&rsquo;re not a walk-in shop, so there&rsquo;s no counter to queue at; if you&rsquo;d rather talk something through face to face, we meet by appointment at Kinson Community Centre.</p><p>Bigger jobs &mdash; a full workbook rebuild, untangling years of accumulated formulas, or moving a team onto proper co-authoring &mdash; get a diagnosis first and a plain quote before any work starts. No hourly meter quietly running.</p><p>Not in Dorset? Remote rescue works anywhere in the UK &mdash; the session looks exactly the same from Bournemouth or Berwick. See <a href=\"/dell-remote-support/\">how our remote support sessions work</a>.</p>"
   },
   {
    "eyebrow": "Why us",
    "h2": "The firm that taught Excel, not just Googled it",
    "html": "<p>Search &ldquo;Excel help UK&rdquo; and you&rsquo;ll find gig-economy listings, one-person helplines and repair-software adverts. Here&rsquo;s what we offer instead:</p><ul><li><strong>Supporting Microsoft Office since 1995.</strong> We were fixing spreadsheets when they arrived on floppy disks.</li><li><strong>We taught this for over ten years</strong> at our own Dorset Microsoft Education Resource Centre. Teaching Excel means we can explain the fix, not just perform it.</li><li><strong>Family-run, same faces every time.</strong> The person who rescues your workbook this month is the person who answers when you call back next year.</li><li><strong>4.9 on Google</strong> from Dorset homes and businesses.</li><li><strong>Call-before-connect.</strong> Nobody remotes into your machine without speaking to you first.</li></ul><p>Spreadsheet rescue often uncovers a wider Microsoft 365 question &mdash; which plan you&rsquo;re actually on, where files should live, whether anything is backed up. Our <a href=\"/microsoft-365-support/\">Microsoft 365 support hub</a> and honest guide to <a href=\"/microsoft-365-backup-do-you-need-it/\">whether you need Microsoft 365 backup</a> cover the follow-on questions we hear most.</p>"
   },
   {
    "eyebrow": "Pricing &amp; honesty",
    "h2": "What it costs &mdash; and what we won&rsquo;t promise",
    "html": "<p>Straight numbers, because vague pricing helps nobody:</p><ul><li><strong>Remote spreadsheet rescue from &pound;20</strong> &mdash; most single-file problems land here.</li><li><strong>Bigger rescue and rebuild jobs are quoted first</strong>, after a proper diagnosis. You approve the price before work starts.</li><li><strong>Ongoing cover:</strong> home plans at <strong>&pound;18.25 per computer per month</strong>, <a href=\"/business-it-support-plans/\">business support from &pound;24.38 per computer per month</a>, and <a href=\"/microsoft-365-support/\">managed Microsoft 365 at &pound;4.85 per user per month</a> &mdash; every plan visit ends with a written Service Report so you always know what was done and why. See our <a href=\"/monthly-it-support/\">monthly IT support plans</a> for how the cover works.</li><li>We&rsquo;re not VAT registered, so prices are what they say.</li></ul><p><strong>The honest-scope bit:</strong> no one can guarantee 100% recovery from a corrupt workbook &mdash; anyone who promises that is selling software, not a service. What we promise instead is speed and honesty: we&rsquo;ll tell you quickly what&rsquo;s recoverable, what it will cost, and &mdash; on the rare occasion the data really is gone &mdash; we&rsquo;ll say so plainly rather than charge you to find out slowly. Then we&rsquo;ll help you set things up so it can&rsquo;t happen twice.</p>"
   }
  ],
  "faqs": [
   {
    "q": "Can you fix a corrupt Excel file that won&rsquo;t open?",
    "a": "Very often, yes. We start with Microsoft&rsquo;s built-in Open and Repair (worth trying yourself first &mdash; steps are on this page), then move to deeper extraction methods if that fails. We can&rsquo;t guarantee every file &mdash; nobody honestly can &mdash; but we&rsquo;ll tell you quickly whether yours is recoverable before you spend real money."
   },
   {
    "q": "How much does a spreadsheet rescue cost?",
    "a": "Remote rescue starts from &pound;20, and most single-file problems are dealt with in one remote session. Bigger jobs &mdash; full rebuilds, de-bloating a huge workbook, setting up team co-authoring &mdash; are diagnosed first and quoted plainly before any work starts. We&rsquo;re not VAT registered, so the price you&rsquo;re quoted is the price."
   },
   {
    "q": "Do I have to bring my computer to you?",
    "a": "No &mdash; and we&rsquo;re not a walk-in shop, so please don&rsquo;t set off with it! Nearly all spreadsheet work happens over a secure remote session while you watch, and we always phone before we connect. If the machine itself needs hands-on work, we collect it free of charge locally. Prefer to meet? We see customers by appointment at Kinson Community Centre."
   },
   {
    "q": "Someone typed values over our formulas &mdash; can you get the formulas back?",
    "a": "If the file lives on OneDrive or SharePoint, version history usually lets us restore a copy from before the damage. If it&rsquo;s a purely local file, we look for earlier copies and backups, and where none exist we rebuild the formulas from the workbook&rsquo;s own logic. It&rsquo;s slower but very often possible."
   },
   {
    "q": "Why has our Excel workbook become so slow?",
    "a": "Almost always accumulated bloat: whole-column references, volatile formulas that recalculate constantly, a &ldquo;used range&rdquo; stretching thousands of empty rows, and layers of stale conditional formatting. We slim the workbook down without changing your figures &mdash; files that took minutes to open typically open in seconds afterwards."
   },
   {
    "q": "Can several people work in the same spreadsheet without conflict copies everywhere?",
    "a": "Yes &mdash; but only if the file is stored on OneDrive or SharePoint as part of Microsoft 365, which enables real co-authoring. Files on ordinary shared drives will keep producing locks and duplicate copies. We set this up properly as part of managed Microsoft 365 at &pound;4.85 per user per month, and our Excel and OneDrive sync conflicts guide explains the errors you&rsquo;ve probably been seeing."
   },
   {
    "q": "Do you run Excel training courses?",
    "a": "Not as a current product, no &mdash; though we taught Microsoft Office for more than ten years at our own Dorset Microsoft Education Resource Centre. What we do instead is explain every fix as we make it, so you and your team understand the workbook better after the rescue than before it."
   },
   {
    "q": "Is our business data safe with you?",
    "a": "We&rsquo;re a family-run Dorset firm &mdash; the same faces every time, supporting Microsoft software since 1995. Remote sessions happen while you watch, we always call before we connect, and your file never goes anywhere you haven&rsquo;t agreed to. If you&rsquo;d like the wider picture, see our guide to securing your Microsoft 365 account."
   },
   {
    "q": "We&rsquo;re not in Bournemouth &mdash; can you still help?",
    "a": "Yes. Spreadsheet rescue is remote-first, so it works anywhere in the UK from &pound;20 &mdash; the session is identical whether you&rsquo;re in Poole or Preston. Free collection for hands-on hardware work applies locally in the Bournemouth and wider Dorset area."
   }
  ],
  "schemaKind": "service",
  "serviceName": "Excel Spreadsheet Rescue",
  "howToName": "How to get a broken Excel spreadsheet rescued",
  "howToSteps": [
   {
    "name": "Stop and make a copy",
    "text": "Close the workbook and copy the file somewhere safe before any repair attempt. Every fix should happen on a copy, never the only original &mdash; repeated failed repairs can make corruption worse."
   },
   {
    "name": "Try the free fixes",
    "text": "In Excel use File &gt; Open &gt; Browse, select the file, click the arrow next to Open and choose Open and Repair. If the file lives on OneDrive or SharePoint, check its version history for a healthy earlier copy."
   },
   {
    "name": "Call or text us",
    "text": "Call 01202 775566 (Mon&ndash;Fri 9&ndash;5) or text 07520 615332 with the symptoms &mdash; the exact error message and where the file is stored. We&rsquo;ll say straight away whether it sounds like a &pound;20 remote fix or a quoted rescue job."
   },
   {
    "name": "Watch the rescue happen",
    "text": "We phone before we connect, then work on the file over a secure remote session while you watch. Bigger rebuilds get a plain quote first, and we finish with honest advice on stopping it happening again."
   }
  ],
  "crossLinksHtml": "<p>Related help: <a href=\"/excel-onedrive-sync-conflicts/\">Excel &amp; OneDrive sync conflicts</a> &middot; <a href=\"/onedrive-problems/\">OneDrive problems &amp; fixes</a> &middot; <a href=\"/microsoft-365-support/\">Microsoft 365 support</a> &middot; <a href=\"/microsoft-365-backup-do-you-need-it/\">Do you need Microsoft 365 backup?</a> &middot; <a href=\"/monthly-it-support/\">Monthly IT support plans</a> &middot; <a href=\"/how-to-secure-your-microsoft-365-account/\">Secure your Microsoft 365 account</a></p>",
  "crumbName": "Excel Spreadsheet Rescue",
  "primaryCta": [
   "Talk to a Techie",
   "/contact/"
  ],
  "secondaryCta": [
   "Call 01202 775566",
   "tel:+441202775566"
  ]
 },
 {
  "slug": "microsoft-word-wont-open",
  "title": "Microsoft Word Won&rsquo;t Open? The 5-Step Fix Ladder | 365 Techies",
  "metaDesc": "Word won&rsquo;t open, keeps crashing or only starts in safe mode? Work down our 5-step fix ladder &mdash; including the June 2026 bug that breaks Word opened from Sage. Remote help from &pound;20.",
  "ogTitle": "Microsoft Word won&rsquo;t open? Work down the 5-step fix ladder",
  "eyebrow": "Microsoft Word fix guide",
  "h1": "Microsoft Word won&rsquo;t open? Work down this ladder",
  "lede": "First, breathe: Word failing to start does not touch your documents &mdash; they are still safely on the disk. What follows is the five-rung triage ladder we actually run on customer machines, starting with the most likely cause in 2026: a Windows update that breaks Word when it&rsquo;s opened from Sage and other programs. We&rsquo;ve supported Word since 1995 and taught it for over 10 years at our own Dorset Microsoft Education Resource Centre &mdash; so every rung tells you plainly when to keep going and when to stop and call us.",
  "chips": [
   "Remote fix from &pound;20",
   "Supporting Word since 1995",
   "4.9 on Google &mdash; family-run"
  ],
  "ctaHead": "Stuck on a rung? We&rsquo;ll run the ladder for you",
  "ctaSub": "Secure remote session from &pound;20 &mdash; we always call before we connect, and you watch everything we do on your own screen. Mon&ndash;Fri 9&ndash;5. Call 01202 775566 or text 07520 615332.",
  "sections": [
   {
    "eyebrow": "Rung 1 &mdash; the June 2026 bug",
    "h2": "Word crashes when opened from Sage or another program? Check this first",
    "html": "<p>If Word opens fine when you start it yourself, but crashes or never appears when <em>another program</em> tries to open it &mdash; Sage producing an invoice or letter, a case-management or document-management system generating a file &mdash; stop right here. It is almost certainly not your fault, and nothing on your PC is broken.</p><p>The June 2026 Windows update (KB5094126 &mdash; Windows 11 builds 26100.8655 and 26200.8655, with Windows 10 and Server affected too) broke the behind-the-scenes plumbing, called OLE automation, that third-party programs use to launch Office. Microsoft has confirmed the problem: Word, Excel, PowerPoint and Access can all crash when opened <em>via</em> other software while behaving perfectly on their own.</p><p><strong>The workaround:</strong> open Word first, <em>then</em> open or generate the document from the other program. It feels daft, but it sidesteps the crash. At the time of writing Microsoft&rsquo;s permanent fix was still rolling out, so keep Windows Update current rather than uninstalling anything &mdash; removing the update also removes its security fixes.</p><p>Run Sage? This sits alongside another known clash we cover in <a href=\"/sage-50-wont-email-invoices-outlook/\">Sage 50 won&rsquo;t email invoices through Outlook</a>. If invoices are stuck and the workaround isn&rsquo;t enough, we can <a href=\"/dell-remote-support/\">connect remotely from &pound;20</a> and get you invoicing again.</p>"
   },
   {
    "eyebrow": "Rung 2 &mdash; safe mode",
    "h2": "Test Word in safe mode &mdash; the two-minute diagnosis",
    "html": "<p>Press <strong>Windows key + R</strong>, type <strong>winword /safe</strong> and press Enter (or hold <strong>Ctrl</strong> while clicking the Word icon and confirm safe mode). Safe mode starts Word with no add-ins and no custom template &mdash; the two things most likely to stop it opening.</p><ul><li><strong>Word opens in safe mode?</strong> Good news: Word itself is healthy. An add-in or your template is the culprit &mdash; carry on to the steps below and Rung 3.</li><li><strong>Word still won&rsquo;t open, even in safe mode?</strong> Skip to Rung 4 or Rung 5.</li></ul><p>To find a faulty add-in: in safe mode go to <strong>File &gt; Options &gt; Add-ins</strong>, set the Manage box at the bottom to <strong>COM Add-ins</strong>, click <strong>Go</strong>, and untick everything. Restart Word normally. If it opens, re-tick the add-ins one at a time, restarting between each, until the crash returns &mdash; the last one you enabled is your troublemaker. Word can also load items from its Startup folder at <strong>C:\\Users\\&lt;name&gt;\\AppData\\Roaming\\Microsoft\\Word\\STARTUP</strong> &mdash; move anything in there to your desktop temporarily and retest.</p><p><em>When to stop:</em> if the failing add-in is one your business relies on (Sage integration, PDF tools, a dictation add-in), don&rsquo;t just leave it off &mdash; that&rsquo;s the point to <a href=\"/contact/\">talk to a techie</a> so you keep both Word and the tool.</p>"
   },
   {
    "eyebrow": "Rung 3 &mdash; the template",
    "h2": "Rename Normal.dotm &mdash; safe, quick and surprisingly effective",
    "html": "<p>Normal.dotm is the hidden template every blank document is based on. When it gets corrupted, Word can hang or crash the moment it starts. Renaming it is completely safe: Word simply builds a fresh copy next time it opens. You lose any custom default fonts or macros you&rsquo;d saved into the template &mdash; never your documents.</p><ol><li>Close Word fully (check the Task Manager if in doubt).</li><li>Open File Explorer and paste <strong>%appdata%\\Microsoft\\Templates</strong> into the address bar &mdash; that&rsquo;s <strong>C:\\Users\\&lt;name&gt;\\AppData\\Roaming\\Microsoft\\Templates</strong> in full.</li><li>Right-click <strong>Normal.dotm</strong> and rename it to <strong>Normal.old</strong>.</li><li>Start Word. If it opens, the old template was the problem and you&rsquo;re done.</li></ol><p><em>When to stop:</em> if Word opens but your carefully built letterheads or macros lived in that template, keep the Normal.old file and give us a ring &mdash; the useful parts can often be rescued from it in a short <a href=\"/dell-remote-support/\">remote session from &pound;20</a>.</p>"
   },
   {
    "eyebrow": "Rung 4 &mdash; advanced",
    "h2": "Reset Word&rsquo;s registry Data key (with a proper backup first)",
    "html": "<p>This is the deep fix from Microsoft&rsquo;s own Word start-up troubleshooting guide &mdash; a guide Microsoft has now archived to its &ldquo;previous versions&rdquo; site, which is partly why so few pages mention it. It&rsquo;s labelled <strong>advanced</strong> for a reason: the registry controls the whole of Windows, so back up before you touch it, and if you&rsquo;re not comfortable, this is exactly the kind of one-shot job we do remotely from &pound;20 while you watch.</p><ol><li>Close Word. Press <strong>Windows key + R</strong>, type <strong>regedit</strong> and press Enter.</li><li>Navigate to <strong>HKEY_CURRENT_USER\\Software\\Microsoft\\Office\\16.0\\Word\\Data</strong>.</li><li>Right-click the <strong>Data</strong> key and choose <strong>Export</strong> &mdash; save the .reg file somewhere safe. That&rsquo;s your undo button: double-clicking it puts everything back.</li><li>Now right-click <strong>Data</strong> again and choose <strong>Delete</strong>, then restart Word.</li></ol><p>Word rebuilds the key with factory defaults. You&rsquo;ll lose your recent-files list and a few preferences &mdash; not documents, not templates. If Word still won&rsquo;t start, the neighbouring <strong>Options</strong> key is the next candidate: same export-then-delete routine.</p><p><em>When to stop:</em> if you&rsquo;ve never opened the Registry Editor before, don&rsquo;t make this your first solo flight &mdash; <a href=\"/contact/\">we&rsquo;ll do it with you on the line</a>.</p>"
   },
   {
    "eyebrow": "Rung 5 &mdash; repair Office",
    "h2": "Run an Office repair &mdash; the fix of last resort that usually works",
    "html": "<p>If nothing above has helped, let Windows repair the Office installation itself:</p><ol><li>Open <strong>Settings &gt; Apps &gt; Installed apps</strong>.</li><li>Find <strong>Microsoft 365</strong> (or Microsoft Office), click the three dots and choose <strong>Modify</strong>.</li><li>Try <strong>Quick Repair</strong> first &mdash; it takes a few minutes and needs no internet.</li><li>If Word still misbehaves, run the same steps again and choose <strong>Online Repair</strong>. This reinstalls Office over the internet, so allow time and a stable connection.</li></ol><p>Neither repair touches your documents, and your settings largely survive. Have your Microsoft account sign-in to hand in case Office asks you to sign back in afterwards &mdash; and if it then complains about licensing instead of crashing, that&rsquo;s a different problem with its own page: <a href=\"/microsoft-office-unlicensed-product-error/\">the Office &ldquo;Unlicensed Product&rdquo; error</a>.</p>"
   },
   {
    "eyebrow": "Crashed mid-edit?",
    "h2": "Word crashed while you were typing &mdash; your document is probably recoverable",
    "html": "<p>If Word died mid-sentence, don&rsquo;t panic and don&rsquo;t start retyping. When Word next opens successfully it usually shows the <strong>Document Recovery</strong> pane down the left-hand side, listing autosaved versions &mdash; open the newest, check it, and save it under a new name immediately. For a file that opens damaged, use Word&rsquo;s built-in repair: <strong>File &gt; Open &gt; Browse</strong>, select the document, then click the small arrow beside the Open button and choose <strong>Open and Repair</strong>. Microsoft&rsquo;s own &ldquo;Recover your Office files&rdquo; guide on support.microsoft.com covers the longer recovery routes.</p><p>And if Word isn&rsquo;t crashing so much as <strong>crawling or freezing</strong> (&ldquo;Not responding&rdquo; in the title bar), the culprits are usually the same suspects as this ladder: a slow add-in, an enormous document stuffed with images and tracked changes, a file sitting on a slow network location, or OneDrive syncing mid-save. On that last one &mdash; Word now saves new documents to OneDrive by default, which surprises a lot of people; see <a href=\"/stop-word-saving-to-onedrive/\">how to stop Word saving to OneDrive</a>.</p>"
   },
   {
    "eyebrow": "When to call us",
    "h2": "Honest advice: when it&rsquo;s worth handing this over",
    "html": "<p>Most Word start-up problems fall to one of the five rungs above &mdash; that&rsquo;s why we published them in full rather than hiding the answer behind a phone number. Call us when the ladder runs out, when the registry rung is a step too far, or when it&rsquo;s a work machine and every hour of downtime costs you money.</p><p>We&rsquo;re a family-run Dorset firm, supporting Microsoft software since 1995 &mdash; and we taught it for over 10 years at our own Dorset Microsoft Education Resource Centre. We&rsquo;re remote-first: a secure session <a href=\"/dell-remote-support/\">from &pound;20</a>, we call before we connect, and you watch everything on your own screen. If the machine itself needs hands-on work we collect it free locally &mdash; there&rsquo;s no walk-in shop, and honestly you don&rsquo;t need one for this.</p><p>If Word broke because of the Sage collision above, that&rsquo;s usually a sign nobody is watching your Microsoft estate. Our <a href=\"/microsoft-365-support/\">managed Microsoft 365</a> service is &pound;4.85 per user per month &mdash; licences, updates and known-issue workarounds handled before they stop your invoicing. For whole machines, our <a href=\"/monthly-it-support/\">home plans are &pound;18.25 per computer per month</a> and <a href=\"/business-it-support-plans/\">business plans from &pound;24.38 per computer</a>, and every session ends with a written Service Report so you can see exactly what was done. We&rsquo;re not VAT registered, so those are the prices you pay.</p>"
   }
  ],
  "faqs": [
   {
    "q": "Why does Word only crash when I open it from Sage or another program?",
    "a": "That&rsquo;s the June 2026 Windows update bug (KB5094126). It broke the OLE automation link that third-party software uses to launch Office, so Word, Excel, PowerPoint and Access can crash when started by another program yet work fine on their own. Microsoft has confirmed it. Workaround: open Word first, then generate or open the document &mdash; and keep Windows Update current so the fix arrives when it ships to your machine."
   },
   {
    "q": "Word opens in safe mode but not normally &mdash; what does that mean?",
    "a": "It means Word itself is healthy and the problem is something Word loads at start-up: a COM add-in, an item in the Word STARTUP folder, or a corrupted Normal.dotm template. Disable add-ins one at a time and rename Normal.dotm (Rungs 2 and 3 above) and you&rsquo;ll usually find the culprit within ten minutes."
   },
   {
    "q": "Will renaming Normal.dotm delete any of my documents?",
    "a": "No. Normal.dotm is only the blank-document template &mdash; your letters, reports and files are separate and untouched. The only things you can lose are custom default fonts, styles or macros saved into the template itself, and if you keep the renamed Normal.old file those can often be rescued from it later."
   },
   {
    "q": "Is deleting the Word Data registry key safe?",
    "a": "It&rsquo;s a Microsoft-documented fix, but treat it with respect: export the key first so you have a one-click undo, and only delete the Word Data key itself. Word rebuilds it with defaults &mdash; you lose the recent-files list and a few preferences, never documents. If you&rsquo;ve never used the Registry Editor, we&rsquo;d rather do it with you remotely from &pound;20 than have you guess."
   },
   {
    "q": "Word crashed while I was typing &mdash; is my document gone?",
    "a": "Usually not. Reopen Word and look for the Document Recovery pane, which lists autosaved versions &mdash; save the newest under a new name straight away. For a file that opens damaged, use File &gt; Open &gt; Browse, select it, then the arrow next to Open and choose Open and Repair. We can&rsquo;t promise every crash is recoverable, but most mid-edit crashes lose minutes, not the document."
   },
   {
    "q": "Does an Office Online Repair delete my files or my licence?",
    "a": "No. Online Repair reinstalls the Office programs over the internet; your documents are never part of that. Your subscription stays attached to your Microsoft account &mdash; just have your sign-in details handy in case Office asks you to sign back in afterwards."
   },
   {
    "q": "Word is slow or says &ldquo;Not responding&rdquo; rather than refusing to open &mdash; same fixes?",
    "a": "Mostly, yes. Safe mode and the add-in check (Rung 2) catch the majority of slow-Word cases. Beyond that, look at the document itself &mdash; huge images, years of tracked changes &mdash; and where it lives: files on slow network shares or mid-sync in OneDrive can make Word hang while saving."
   },
   {
    "q": "How much does it cost for you to fix this?",
    "a": "Remote support is from &pound;20 &mdash; most Word start-up problems are a single short session. We always call before we connect, and you watch the whole session on your own screen. We&rsquo;re open Monday to Friday, 9am&ndash;5pm: call 01202 775566 or text 07520 615332. Anything beyond remote reach is diagnosed first and quoted before work starts."
   },
   {
    "q": "Do you have a shop I can bring the computer to?",
    "a": "No walk-in shop &mdash; we&rsquo;re remote-first, which for a software problem like this is faster and cheaper anyway. If the machine needs hands-on work we collect it free locally across Bournemouth, Poole and the surrounding Dorset area, and we can meet by appointment at Kinson Community Centre. Businesses can book an on-site visit."
   },
   {
    "q": "Does the June 2026 bug affect Excel and PowerPoint too?",
    "a": "Yes &mdash; Microsoft&rsquo;s confirmation covers Word, Excel, PowerPoint and Access when they&rsquo;re launched from third-party software. The same workaround applies: open the Office program first, then open the document from the other application, until Microsoft&rsquo;s fix reaches your machine through Windows Update."
   }
  ],
  "schemaKind": "service",
  "serviceName": "Microsoft Word repair and remote support (Bournemouth &amp; Dorset)",
  "howToName": "How to fix Microsoft Word when it won&rsquo;t open",
  "howToSteps": [
   {
    "name": "Rule out the June 2026 update bug",
    "text": "If Word only crashes when launched from another program such as Sage, it&rsquo;s the confirmed KB5094126 Windows bug. Open Word first, then open the document from the other program, and keep Windows Update current."
   },
   {
    "name": "Test Word in safe mode",
    "text": "Press Windows key + R, type winword /safe and press Enter. If Word opens, disable COM add-ins via File &gt; Options &gt; Add-ins &gt; COM Add-ins &gt; Go, then re-enable them one at a time to find the faulty one."
   },
   {
    "name": "Rename the Normal.dotm template",
    "text": "Close Word, paste %appdata%\\Microsoft\\Templates into File Explorer&rsquo;s address bar, rename Normal.dotm to Normal.old and restart Word. Word rebuilds a fresh template; your documents are unaffected."
   },
   {
    "name": "Run an Office repair",
    "text": "Go to Settings &gt; Apps &gt; Installed apps &gt; Microsoft 365 &gt; Modify. Try Quick Repair first, then Online Repair if Word still fails. Neither touches your documents. Still stuck? Remote help from &pound;20 on 01202 775566."
   }
  ],
  "crossLinksHtml": "<p>Related guides: <a href=\"/stop-word-saving-to-onedrive/\">Stop Word saving to OneDrive</a> &middot; <a href=\"/sage-50-wont-email-invoices-outlook/\">Sage 50 won&rsquo;t email invoices through Outlook</a> &middot; <a href=\"/microsoft-office-unlicensed-product-error/\">Office &ldquo;Unlicensed Product&rdquo; error</a> &middot; <a href=\"/onedrive-problems/\">OneDrive problems</a> &middot; <a href=\"/outlook-problems/\">Outlook problems</a> &middot; <a href=\"/microsoft-365-support/\">Microsoft 365 support</a></p>",
  "crumbName": "Word Won&rsquo;t Open",
  "primaryCta": [
   "Get It Fixed Remotely",
   "/dell-remote-support/"
  ],
  "secondaryCta": [
   "Call 01202 775566",
   "tel:+441202775566"
  ]
 },
 {
  "slug": "stop-word-saving-to-onedrive",
  "title": "Stop Word Saving to OneDrive &mdash; Turn Off Cloud Saving in Word | 365 Techies",
  "metaDesc": "Word now saves new documents straight to OneDrive with a date for a name. Here is why it changed, where your files went, and the exact setting that puts saving back on your PC.",
  "ogTitle": "Stop Word Saving Everything to OneDrive &mdash; the 5-Minute Fix",
  "eyebrow": "Word &amp; OneDrive",
  "h1": "Stop Word Saving Everything to OneDrive",
  "lede": "You didn&rsquo;t change a setting &mdash; Word did. Recent versions of Word in Microsoft 365 now create new documents in the cloud automatically, switch AutoSave on, and name them after today&rsquo;s date. Your documents are not lost, and the off-switch takes about two minutes once you know where it is. Here is the honest, plain-English version &mdash; from a family-run Dorset firm that has supported Microsoft software since 1995.",
  "chips": [
   "Your documents are NOT lost",
   "2-minute fix &mdash; one tick box",
   "Remote help from &pound;20"
  ],
  "ctaHead": "Want every machine set up the right way in one go?",
  "ctaSub": "We&rsquo;ll connect remotely, find any documents Word has quietly saved to the cloud, and set the save behaviour you actually want &mdash; from &pound;20, while you watch. Family-run since 1995, rated 4.9 on Google. Mon&ndash;Fri 9&ndash;5 on 01202 775566, or text 07520 615332.",
  "sections": [
   {
    "eyebrow": "What changed",
    "h2": "You&rsquo;re not going mad &mdash; Word changed",
    "html": "<p>From version 2509 of Word for Windows (build 19221.20000 and later, rolling out since September 2025), Microsoft changed the default behaviour for brand-new documents. Instead of living on your PC until you choose to save them, new documents are now <strong>created in OneDrive (or SharePoint) automatically</strong>, with <strong>AutoSave switched on</strong> from the first keystroke, and given a <strong>date-based name</strong> like &ldquo;Document 2025-08-25&rdquo; rather than the old &ldquo;Document1&rdquo;.</p><p>That is why documents you never deliberately saved are turning up in your OneDrive, and why your recent files list is full of entries named after dates. Nothing is broken, and nothing has been deleted &mdash; Word is simply saving earlier, and somewhere different, than it used to.</p><p>A few honest boundaries on this, because Microsoft moves fast and the reporting has been muddled:</p><ul><li>At the time of writing this affects <strong>Word for Windows in Microsoft 365</strong> (the subscription version). It rolled out gradually, so two PCs in the same office can behave differently for a while.</li><li>It does <strong>not</strong> affect the one-off perpetual versions such as Office 2021 or Office 2024.</li><li>Microsoft has said the same behaviour is <em>expected</em> to come to Excel and PowerPoint &mdash; expected, not done. If your spreadsheets still save locally, that is why.</li></ul><p>If your complaint is different &mdash; Windows moved your <em>existing</em> Desktop and Documents folders into OneDrive &mdash; that is a separate change with its own fix: see <a href=\"/onedrive-moved-my-desktop-and-documents/\">OneDrive moved my Desktop and Documents</a>. This page deals with Word saving <em>new</em> documents to the cloud.</p>"
   },
   {
    "eyebrow": "Find your files",
    "h2": "Where your &ldquo;lost&rdquo; documents actually went",
    "html": "<p>Every document Word created this way is sitting in the <strong>OneDrive of whichever account Word was signed into</strong> &mdash; usually right in the top level of OneDrive, not in Documents. To find them:</p><ol><li>Open Word and click <strong>File &gt; Account</strong>. Note which account is signed in at the top left &mdash; this is the key step.</li><li>Go to <a href=\"https://onedrive.com\" rel=\"noopener\">onedrive.com</a> in your browser and sign in with <em>that same account</em>. Look in the root of your files for documents named like &ldquo;Document 2025-08-25&rdquo;.</li><li>In Word itself, <strong>File &gt; Open &gt; Recent</strong> lists them too &mdash; hover over an entry to see the full location.</li></ol><p><strong>The trap Microsoft doesn&rsquo;t mention:</strong> a lot of small-business PCs are signed into <em>two</em> Microsoft accounts &mdash; a personal one and a work one. Word saves these new documents to whichever account it happens to be using, so your invoice drafts can end up in a personal OneDrive (or your holiday letter in the company SharePoint) without you ever choosing that. If a document seems to have vanished, check the <em>other</em> account&rsquo;s OneDrive before you panic. We untangle exactly this on customer machines every week.</p><p>Once found, you can move any document back to your PC: open it, click <strong>File &gt; Save a Copy &gt; This PC</strong>, choose your folder, and give it a proper name. If lots of files are involved, it is quicker to select and download them from onedrive.com in one go.</p>"
   },
   {
    "eyebrow": "The fix",
    "h2": "Turn it off: make Word save to your PC again",
    "html": "<p>The off-switch exists &mdash; Microsoft just didn&rsquo;t put it anywhere obvious, and there is no dedicated Microsoft support page for it. Here is the full sequence:</p><ol><li>Open Word and click <strong>File &gt; Options</strong> (bottom left), then choose <strong>Save</strong> in the left-hand list.</li><li><strong>Untick</strong> &ldquo;Create new files in the cloud automatically&rdquo;. This is the setting that started all of this.</li><li><strong>Tick</strong> &ldquo;Save to Computer by default&rdquo; so the Save As screen offers your PC first, not OneDrive.</li><li>Check the <strong>Default local file location</strong> box just below it &mdash; set it to your usual folder, for example <code>C:\\Users\\&lt;name&gt;\\Documents</code>.</li><li>Click <strong>OK</strong>, then close and reopen Word.</li></ol><p>From now on, a new document behaves the way Word always used to: it lives in the app until <em>you</em> save it, and the Save As dialog points at your own Documents folder. Note this is a <strong>per-app, per-PC setting</strong> &mdash; if the change reaches Excel and PowerPoint on your machine later, they will each need the same treatment, and every computer in the office needs doing separately (or see the business section below for the one-hit version).</p><p>One thing to be aware of before you celebrate: with cloud saving off, <strong>AutoSave stops working for new documents</strong>, because AutoSave only functions on files stored in OneDrive or SharePoint. Word&rsquo;s traditional AutoRecover still runs in the background, but it is a crash-recovery net, not continuous saving &mdash; so get back into the habit of pressing <strong>Ctrl+S</strong> as you work.</p>"
   },
   {
    "eyebrow": "For businesses",
    "h2": "Switching it off across a whole business",
    "html": "<p>If you run more than a couple of PCs, walking round ticking boxes in each copy of Word doesn&rsquo;t scale &mdash; and the setting can be missed on the next new starter&rsquo;s machine. For Microsoft 365 business setups there is a proper central answer: Office <strong>Group Policy</strong> settings can control save behaviour across every machine at once, including the policy to hide Microsoft cloud file locations in Word&rsquo;s save screen entirely, so staff simply never see OneDrive as an option when saving.</p><p>Whether that is the right call depends on your business. Some firms genuinely want everything in SharePoint (shared access, version history, files that survive a stolen laptop); others have a compliance or client-confidentiality reason to keep certain documents local. The honest answer is usually a policy per team, not one blanket rule &mdash; and that is a conversation, not a tick box.</p><p>This is exactly the sort of thing our <a href=\"/microsoft-365-support/\">managed Microsoft 365 service</a> exists for: at &pound;4.85 per user per month we look after the tenant settings, licences and save policies so surprises like this get handled before your team loses a morning to them &mdash; and you get a written Service Report after the work so you can see exactly what was changed. For wider cover there are <a href=\"/business-it-support-plans/\">business support plans from &pound;24.38 per computer per month</a>. We&rsquo;re not VAT registered, so those are the prices you actually pay.</p>"
   },
   {
    "eyebrow": "The other side",
    "h2": "Before you switch it off: what cloud saving quietly gives you",
    "html": "<p>We&rsquo;re not here to tell you Microsoft was right to change this without asking &mdash; springing it on people was the mistake. But before you turn it off everywhere, it is only fair to say what you&rsquo;d be giving up, because saving to OneDrive does buy you real things:</p><ul><li><strong>AutoSave</strong> &mdash; every keystroke saved as you go, so a crash or power cut costs you nothing. It only works on files stored in OneDrive or SharePoint.</li><li><strong>Version history</strong> &mdash; roll a document back to how it looked an hour or a week ago. Genuinely useful the day someone deletes three pages by accident.</li><li><strong>An off-site copy</strong> &mdash; if the laptop is stolen or the hard drive dies, cloud-saved documents survive.</li></ul><p>A perfectly sensible middle path is: turn off the <em>automatic</em> cloud creation (so you stay in control and files get proper names), but keep saving important work into your OneDrive folder deliberately. And remember OneDrive sync is not the same thing as a real backup &mdash; we&rsquo;ve written honestly about the difference in <a href=\"/microsoft-365-backup-do-you-need-it/\">Microsoft 365 backup: do you need it?</a></p>"
   },
   {
    "eyebrow": "When to call us",
    "h2": "When it&rsquo;s worth handing this to a techie",
    "html": "<p>If the steps above have sorted you out &mdash; brilliant, that&rsquo;s the point of this page. But it&rsquo;s worth a call if:</p><ul><li>Documents have gone missing and checking both accounts&rsquo; OneDrives hasn&rsquo;t found them &mdash; before you assume the worst, see <a href=\"/files-missing-from-onedrive/\">files missing from OneDrive</a> or let us look. Your files are almost never actually gone.</li><li>The PC is signed into a tangle of personal and work accounts and you&rsquo;re no longer sure what is saving where.</li><li>You&rsquo;ve got several machines and want the save behaviour, OneDrive setup and backups done properly in one session.</li><li>Word itself is misbehaving beyond saving &mdash; crashing or refusing to start is a different problem with its own fix ladder: <a href=\"/microsoft-word-wont-open/\">Microsoft Word won&rsquo;t open</a>.</li></ul><p>We fix this sort of thing by <a href=\"/dell-remote-support/\">secure remote session from &pound;20</a> &mdash; we call before we connect, you watch everything we do, and most save-settings jobs are done well inside the first half hour. If a machine needs hands-on work we collect it free locally; we&rsquo;re remote-first with no walk-in shop, and meetings at Kinson Community Centre are by appointment. We&rsquo;ve supported Microsoft software since 1995 and taught it for over 10 years at our own Dorset Microsoft Education Resource Centre &mdash; we were teaching Word back when it saved to floppy disks, so a change of save location doesn&rsquo;t faze us.</p>"
   }
  ],
  "faqs": [
   {
    "q": "Why has Word suddenly started saving my documents to OneDrive?",
    "a": "Microsoft changed the default in Word for Windows from version 2509 (rolling out since September 2025). New documents are now created in OneDrive automatically with AutoSave on, instead of living on your PC until you choose to save. It is a deliberate Microsoft change, not something you did &mdash; and it can be turned off in File &gt; Options &gt; Save."
   },
   {
    "q": "Where did my Word document go? I never saved it anywhere.",
    "a": "It is almost certainly in the OneDrive of the account Word is signed into &mdash; check File &gt; Account in Word to see which, then sign into onedrive.com with that account and look in the top level of your files for documents named with a date, like &ldquo;Document 2025-08-25&rdquo;. Word&rsquo;s File &gt; Open &gt; Recent list will show the location too."
   },
   {
    "q": "Why are my documents named with today&rsquo;s date instead of Document1?",
    "a": "That is part of the same change. Because new documents are now saved to the cloud from the first keystroke, Word gives them an automatic date-based name such as &ldquo;Document 2025-08-25&rdquo; instead of the old temporary &ldquo;Document1&rdquo;. Once you rename a document, the name sticks as normal."
   },
   {
    "q": "How do I stop Word saving to OneDrive by default?",
    "a": "In Word, go to File &gt; Options &gt; Save. Untick &ldquo;Create new files in the cloud automatically&rdquo;, tick &ldquo;Save to Computer by default&rdquo;, and set your Default local file location to a folder like C:\\Users\\&lt;name&gt;\\Documents. Click OK and restart Word. It is a per-PC setting, so repeat it on each machine."
   },
   {
    "q": "Does this change affect Excel and PowerPoint too?",
    "a": "At the time of writing, no &mdash; the automatic cloud-save default applies to Word for Windows. Microsoft has said the same behaviour is expected to reach Excel and PowerPoint, but expected is not done. If your Excel files still save locally, nothing is wrong."
   },
   {
    "q": "I have Office 2021 or Office 2024 &mdash; will Word start doing this to me?",
    "a": "No. The change applies to the Microsoft 365 subscription version of Word, which updates itself continuously. The one-off perpetual versions such as Office 2021 and Office 2024 keep the traditional save behaviour."
   },
   {
    "q": "If I turn this off, do I lose AutoSave?",
    "a": "For new documents saved to your PC, yes &mdash; AutoSave only works on files stored in OneDrive or SharePoint. Word&rsquo;s AutoRecover still protects you against crashes, but it is not continuous saving, so press Ctrl+S regularly. A good middle path is to keep the automatic setting off but deliberately save important documents into OneDrive when you want AutoSave and version history."
   },
   {
    "q": "My document saved to the wrong OneDrive &mdash; a personal one instead of my work one. Why?",
    "a": "Many PCs are signed into both a personal Microsoft account and a work account, and Word saves new cloud documents to whichever account it is currently using. Check File &gt; Account in Word to see the active account, and look in the other account&rsquo;s OneDrive for the missing file. If your machine is a tangle of accounts, we can untangle it remotely from &pound;20."
   },
   {
    "q": "Can I turn this off for every computer in my business at once?",
    "a": "Yes &mdash; on Microsoft 365 business setups the save behaviour can be controlled centrally with Office Group Policy settings, including hiding cloud locations from the save screen entirely. We set this up as part of our managed Microsoft 365 service at &pound;4.85 per user per month, with a written Service Report showing what was changed."
   },
   {
    "q": "Is saving to OneDrive actually a bad thing?",
    "a": "Not in itself &mdash; cloud-saved files get AutoSave, version history and an off-site copy if the laptop dies or is stolen. The problem was Microsoft changing the default without asking. Choose deliberately: local by default with cloud for important work is a sensible setup for many people. Just remember OneDrive sync is not a true backup &mdash; see our honest guide on Microsoft 365 backup."
   }
  ],
  "schemaKind": "service",
  "serviceName": "Word and OneDrive save-settings help",
  "howToName": "Stop Word saving new documents to OneDrive",
  "howToSteps": [
   {
    "name": "Open Word&rsquo;s save options",
    "text": "In Word, click File &gt; Options in the bottom-left corner, then choose Save from the left-hand list."
   },
   {
    "name": "Untick automatic cloud creation",
    "text": "Untick &ldquo;Create new files in the cloud automatically&rdquo; &mdash; this is the setting that makes Word create new documents in OneDrive with a date-based name."
   },
   {
    "name": "Set your PC as the default",
    "text": "Tick &ldquo;Save to Computer by default&rdquo; and set the Default local file location to your usual folder, such as C:\\Users\\&lt;name&gt;\\Documents. Click OK and restart Word."
   },
   {
    "name": "Rescue documents already in the cloud",
    "text": "Check File &gt; Account to see which account Word uses, sign into that account at onedrive.com, and look for date-named documents in the top level. Open each one and use File &gt; Save a Copy &gt; This PC to bring it home."
   }
  ],
  "crossLinksHtml": "<p>Related help: <a href=\"/onedrive-problems/\">OneDrive problems &amp; fixes</a> &middot; <a href=\"/onedrive-moved-my-desktop-and-documents/\">OneDrive moved my Desktop and Documents</a> &middot; <a href=\"/files-missing-from-onedrive/\">Files missing from OneDrive</a> &middot; <a href=\"/microsoft-word-wont-open/\">Microsoft Word won&rsquo;t open</a> &middot; <a href=\"/microsoft-365-backup-do-you-need-it/\">Is OneDrive a backup?</a> &middot; <a href=\"/microsoft-365-support/\">Microsoft 365 support</a> &middot; <a href=\"/dell-remote-support/\">Remote support from &pound;20</a></p>",
  "crumbName": "Stop Word Saving to OneDrive",
  "primaryCta": [
   "Get It Fixed Remotely",
   "/dell-remote-support/"
  ],
  "secondaryCta": [
   "Call 01202 775566",
   "tel:+441202775566"
  ]
 },
 {
  "slug": "teams-keeps-opening-wrong-account",
  "title": "Teams Keeps Opening the Wrong Account? Here&rsquo;s the Real Fix | 365 Techies",
  "metaDesc": "Teams keeps signing into the wrong Microsoft account? One email can hold two identities. Plain-English fixes, plus the permanent cure &mdash; remote help from &pound;20.",
  "ogTitle": "Teams Keeps Opening the Wrong Account &mdash; the Fix Microsoft Never Wrote",
  "eyebrow": "Microsoft Teams &middot; Fix Guide",
  "h1": "Teams Keeps Opening the Wrong Account",
  "lede": "You click a meeting link, Teams opens&hellip; and it&rsquo;s the wrong you. No meeting, no chat history, sometimes a &ldquo;you don&rsquo;t have access&rdquo; message while a client waits. The usual cause is one email address living as two separate Microsoft accounts &mdash; and Microsoft has no single help page for it. We untangle this weekly for Dorset businesses; here&rsquo;s the plain-English version, including the permanent cure.",
  "chips": [
   "Family-run since 1995",
   "4.9 on Google",
   "Remote fix from &pound;20"
  ],
  "ctaHead": "Fed up fighting Teams for your own name?",
  "ctaSub": "We untangle mixed-up Microsoft accounts remotely from &pound;20 &mdash; we phone before we connect, and you watch every step. Mon&ndash;Fri 9&ndash;5 on 01202 775566, or text 07520 615332.",
  "sections": [
   {
    "eyebrow": "What&rsquo;s actually wrong",
    "h2": "One email address, two Microsoft accounts",
    "html": "<p>Here&rsquo;s the bit nobody on page one of Google explains properly: the <strong>same email address can exist as two completely separate Microsoft accounts</strong>. One is a <em>personal</em> Microsoft account (the kind used for Windows sign-in, Xbox, Skype, OneDrive personal). The other is a <em>work or school</em> account, created when you or your IT provider bought Microsoft 365 Business. Same address, two different identities &mdash; and Teams has to guess which one you mean.</p><p>The classic UK small-business version goes like this: years ago you created a personal Microsoft account using your business email, because that&rsquo;s the address you had. Later you bought Microsoft 365 for the business, which created a work account with the <em>same</em> address. Now every sign-in is a coin toss. Meeting links open the personal Teams, where the meeting doesn&rsquo;t exist. Microsoft&rsquo;s own Q&amp;A forums are full of exactly this &mdash; <em>&ldquo;I have somehow ended up with a personal and work account for the same email address&rdquo;</em> is a recurring thread title.</p><p>Two things worth knowing straight away. First, <strong>nothing is lost</strong> &mdash; both accounts and everything in them still exist; Teams is just opening the wrong door. Second, Microsoft does not offer a way to merge the two accounts into one, so the fix is about separating them cleanly, not combining them. We&rsquo;ve supported Microsoft software since 1995 and taught it for over 10 years at our own Dorset Microsoft Education Resource Centre &mdash; untangling mixed-up accounts is genuinely a weekly job for us.</p>"
   },
   {
    "eyebrow": "Try this first",
    "h2": "Quick fixes that usually get you into today&rsquo;s meeting",
    "html": "<p>These come from Microsoft&rsquo;s own community forums rather than an official help page (there isn&rsquo;t one), but they&rsquo;re what works on real customer machines:</p><ol><li><strong>Check which account Teams is actually using.</strong> Click your profile picture in the top-right corner of Teams. If it shows the wrong account, sign out from there &mdash; don&rsquo;t just close the window.</li><li><strong>At the sign-in prompt, choose deliberately.</strong> When an address is registered as both account types, Microsoft asks something like <em>&ldquo;Which account do you want to use?&rdquo;</em> with <strong>Work or school</strong> and <strong>Personal</strong> options. For business Teams, always pick <em>Work or school</em>. Many people click the first option for years without realising it&rsquo;s a choice.</li><li><strong>Sign out everywhere, then back in.</strong> Sign out of Teams, close it fully, and also check Windows Settings &gt; Accounts &gt; <em>Email &amp; accounts</em> and <em>Access work or school</em> for a stale entry pointing at the wrong identity. Users on Microsoft&rsquo;s forums also report that on company-managed (domain-joined) machines, cached credentials can quietly sign the old account straight back in &mdash; if that&rsquo;s you, it&rsquo;s worth a proper session with us rather than a fight.</li><li><strong>Give each account its own lane.</strong> A workaround Microsoft&rsquo;s Tech Community users swear by: use the <strong>desktop app for work</strong> and a <strong>browser (or separate browser profile) for personal</strong>. The two identities stop treading on each other overnight.</li><li><strong>Stuck meeting link right now?</strong> Right-click the link, open it in a private/incognito window, and either sign in with the correct account or join as a guest with your name. Not elegant &mdash; but you make the call.</li></ol>"
   },
   {
    "eyebrow": "The permanent cure",
    "h2": "Stop the two accounts sharing one email address",
    "html": "<p>The quick fixes manage the symptom. The permanent fix is to make sure your business email address belongs to <strong>only one</strong> Microsoft account &mdash; the work one. You do that by changing the sign-in address (the <em>alias</em>) on the personal account:</p><ol><li><strong>Sign in at account.microsoft.com with the personal account</strong> &mdash; pick <em>Personal</em> if it asks which one you mean.</li><li><strong>Take stock before you change anything.</strong> Check what lives in that personal account: OneDrive files, app or game purchases, subscriptions, old Skype history. Nothing in this process deletes them, but you want to know what&rsquo;s attached.</li><li><strong>Add a new alias.</strong> At the time of writing this lives under <em>Your info</em> &gt; <em>Manage how you sign in to Microsoft</em> (Microsoft moves furniture regularly). A free outlook.com address works fine.</li><li><strong>Make the new alias primary, then remove your business address</strong> from the personal account&rsquo;s alias list.</li></ol><p>From then on, your business email exists only as the work account. The &ldquo;which account?&rdquo; prompt disappears, Teams stops guessing, and meeting links open where they should. Your personal files and purchases stay put &mdash; you&rsquo;ve renamed the account&rsquo;s front door, not emptied the house. One honest caveat: because there&rsquo;s no merge tool, anything you want moved between the two accounts (OneDrive files, say) has to be copied across by hand. If that sounds like an afternoon you&rsquo;d rather not spend, it&rsquo;s a tidy remote job for us from &pound;20.</p>"
   },
   {
    "eyebrow": "Two odd variants",
    "h2": "Guest access gone wrong, and the mobile app",
    "html": "<p><strong>You&rsquo;re a guest in someone else&rsquo;s Teams and it always opens the wrong you.</strong> When a client or partner organisation invites you as a guest, their system links the invitation to whichever of your identities accepted it. If that association wedges &mdash; you accepted with the personal account, or an old account that no longer exists &mdash; no amount of signing out on your side fixes it. Per reports on Microsoft&rsquo;s forums, the reliable cure is on <em>their</em> side: their admin removes you as a guest from their directory and sends a fresh invitation, which you then accept with the correct work account. A slightly awkward email to send, but a two-minute job for their IT.</p><p><strong>The mobile app has its own moods.</strong> Users report that the Teams app on Android in particular can refuse to switch accounts, or keep reverting to the one you don&rsquo;t want. The usual sequence: sign out of all accounts in the app, close it, and sign back in choosing carefully &mdash; and if it still misbehaves, clearing the app&rsquo;s storage (or removing and reinstalling it) forces a genuinely fresh start. Your chats and files live on Microsoft&rsquo;s servers, not in the app, so a reinstall doesn&rsquo;t lose anything.</p><p>And if Office is also nagging you with an <a href=\"/microsoft-office-unlicensed-product-error/\">&ldquo;unlicensed product&rdquo; error</a>, that&rsquo;s very often the same root cause &mdash; Word and Excel signed into the wrong account too. Worth fixing both in one sitting.</p>"
   },
   {
    "eyebrow": "When to call us",
    "h2": "Twenty minutes of ours beats another missed meeting",
    "html": "<p>Everything above is genuinely doable yourself, and if it works, brilliant &mdash; that&rsquo;s why we wrote it down. But mixed-up Microsoft accounts have a talent for one more twist: the alias change that won&rsquo;t take, the company laptop that keeps resurrecting the old sign-in, the moment you&rsquo;re suddenly unsure which account your OneDrive files actually live in. That last one is exactly when to stop clicking and pick up the phone &mdash; guessing wrong with account changes is how people make a confusing problem into a painful one.</p><p><strong>We untangle mixed-up Microsoft accounts remotely from &pound;20.</strong> We&rsquo;re a family-run Bournemouth firm, supporting Microsoft software since 1995 &mdash; and we always phone before we connect, so you know it&rsquo;s us, and you watch everything we do on your screen. Most account untangles are a single session. No walk-in shop to queue at and no 24/7 call centre &mdash; just real people, Mon&ndash;Fri 9&ndash;5, on <a href=\"tel:+441202775566\">01202 775566</a> (or text 07520 615332 and we&rsquo;ll ring you back). If remote can&rsquo;t reach the problem, we collect locally for free.</p><p>While the account&rsquo;s open, it&rsquo;s also the perfect moment to <a href=\"/how-to-secure-your-microsoft-365-account/\">secure your Microsoft 365 account properly</a> &mdash; two accounts sharing one address usually means two sets of security settings nobody has looked at in years.</p>"
   },
   {
    "eyebrow": "For businesses",
    "h2": "Never fight identity problems alone again",
    "html": "<p>If your business hit this once, it will hit it again &mdash; a new starter signs in with the wrong account type, someone accepts a client&rsquo;s Teams invite with a personal login, a second-hand laptop arrives with someone else&rsquo;s identity cached. Account hygiene isn&rsquo;t a one-off fix; it&rsquo;s housekeeping.</p><p>That&rsquo;s the case for our <a href=\"/microsoft-365-support/\">managed Microsoft 365 service</a> at <strong>&pound;4.85 per user per month</strong>: we set up every user with the right account type from day one, keep licences assigned to the right identities, and when Teams does something strange, you ring us instead of a forum. Pair it with our <a href=\"/business-it-support-plans/\">business support plans from &pound;24.38 per computer per month</a> and the whole machine is covered &mdash; each visit or session ends with a written Service Report, so you can see exactly what was checked and changed. Same faces every time, too; you won&rsquo;t re-explain your setup to a stranger each month.</p><p>Moving to Microsoft 365 from another provider or an old setup? Account conflicts like this one are exactly what a properly planned <a href=\"/microsoft-365-migration/\">Microsoft 365 migration</a> is designed to avoid &mdash; identities sorted once, before anyone misses a meeting.</p>"
   }
  ],
  "faqs": [
   {
    "q": "Why does Microsoft think I have two accounts with the same email address?",
    "a": "Because you genuinely do. A personal Microsoft account and a work/school (Microsoft 365) account are separate systems, and the same email address can be registered in both &mdash; typically because a personal account was created with a business email years before Microsoft 365 was purchased. Teams then has to ask, or guess, which one you mean."
   },
   {
    "q": "Can Microsoft merge my personal and work accounts into one?",
    "a": "No &mdash; Microsoft provides no merge tool, and we&rsquo;d be misleading you to suggest one is coming. The fix is separation: change the personal account&rsquo;s sign-in address so your business email belongs only to the work account. Anything you want moved between accounts, such as OneDrive files, has to be copied across manually."
   },
   {
    "q": "Why does my meeting link open Teams with no meeting in it?",
    "a": "The link opened Teams signed into the wrong identity &mdash; usually the personal account, where the meeting doesn&rsquo;t exist. Quick rescue: right-click the link, open it in a private browser window, and sign in with the correct work account or join as a guest."
   },
   {
    "q": "How do I check which account Teams is signed into?",
    "a": "Click your profile picture in the top-right corner of Teams &mdash; the account name and email are shown there, along with the sign-out option. On the web, the same corner of teams.microsoft.com shows it. If it&rsquo;s wrong, sign out fully rather than just closing the window."
   },
   {
    "q": "Will removing my business email from my personal Microsoft account delete my files?",
    "a": "No. Changing or removing an alias renames how you sign in &mdash; it doesn&rsquo;t touch the account&rsquo;s contents. Your OneDrive files, purchases and subscriptions stay exactly where they are. Do take stock of what&rsquo;s in the account first, so you know which identity owns what."
   },
   {
    "q": "Why does my work laptop keep reverting to the old account after I sign out?",
    "a": "On company-managed (domain-joined) machines, users on Microsoft&rsquo;s forums report that cached credentials can sign the old identity straight back in after a sign-out. Clearing the stale entries under Windows Settings &gt; Accounts usually helps, but on managed machines this is worth doing with us on a remote session rather than by trial and error."
   },
   {
    "q": "I&rsquo;m a guest in a client&rsquo;s Teams and it always opens the wrong account. What fixes that?",
    "a": "The fix is on their side, per reports on Microsoft&rsquo;s own forums: their admin removes you as a guest from their directory and re-invites you, and you accept the fresh invitation with the correct account. Nothing you do on your own machine can reset that association."
   },
   {
    "q": "Is this why Word and Excel say &ldquo;unlicensed product&rdquo; too?",
    "a": "Very often, yes &mdash; Office signed into the personal account, which holds no Microsoft 365 licence, instead of the work account that does. Check File &gt; Account in Word to see which identity it&rsquo;s using, and see our unlicensed product error guide for the full fix."
   },
   {
    "q": "Can you fix this remotely, and what does it cost?",
    "a": "Yes &mdash; remote support starts from &pound;20, and most account untangles are a single session. We always phone before we connect so you know it&rsquo;s us, and you watch everything on your own screen. Call 01202 775566 (Mon&ndash;Fri 9&ndash;5) or text 07520 615332."
   },
   {
    "q": "Should I just create a brand-new email address instead?",
    "a": "Usually you don&rsquo;t need to. Changing the personal account&rsquo;s alias to a free outlook.com address achieves the same separation without abandoning your business email or anything attached to either account. Starting a whole new address creates more work than it saves in almost every case we see."
   }
  ],
  "schemaKind": "service",
  "serviceName": "Microsoft Teams Wrong Account Fix",
  "howToName": "How to stop Teams opening the wrong Microsoft account",
  "howToSteps": [
   {
    "name": "Check which account Teams is using",
    "text": "Click your profile picture in the top-right corner of Teams to see the signed-in account. If it is the wrong one, sign out fully from that menu rather than just closing the window."
   },
   {
    "name": "Choose deliberately at the sign-in prompt",
    "text": "When Microsoft asks whether the address is a Work or school account or a Personal account, pick Work or school for business Teams. Clear stale entries under Windows Settings &gt; Accounts if the wrong identity keeps returning."
   },
   {
    "name": "Give each account its own lane",
    "text": "Use the Teams desktop app for your work account and a browser or separate browser profile for the personal account, so the two identities stop conflicting. For a stuck meeting link, open it in a private browser window and sign in correctly."
   },
   {
    "name": "Separate the accounts permanently",
    "text": "Sign in to account.microsoft.com with the personal account, add a new alias such as a free outlook.com address, make it primary, and remove your business email from the personal account. Your business address then belongs only to the work account and the prompts stop."
   }
  ],
  "crossLinksHtml": "<ul><li><a href=\"/microsoft-office-unlicensed-product-error/\">Office says &ldquo;unlicensed product&rdquo;</a> &mdash; the same wrong-account mix-up, wearing a different error message</li><li><a href=\"/microsoft-365-support/\">Microsoft 365 support</a> &mdash; our hub for plans, problems and managed Microsoft 365 at &pound;4.85/user/mo</li><li><a href=\"/how-to-secure-your-microsoft-365-account/\">Secure your Microsoft 365 account</a> &mdash; worth doing while you have the account settings open</li><li><a href=\"/microsoft-365-migration/\">Microsoft 365 migration</a> &mdash; moving tenants or providers with identities sorted properly first</li><li><a href=\"/how-to-use-microsoft-teams/\">How to use Microsoft Teams</a> &mdash; the basics, once the right account is opening</li><li><a href=\"/dell-remote-support/\">Remote support from &pound;20</a> &mdash; how our call-before-connect remote sessions work</li></ul>",
  "crumbName": "Teams Wrong Account",
  "primaryCta": [
   "Get It Fixed Remotely",
   "/dell-remote-support/"
  ],
  "secondaryCta": [
   "Call 01202 775566",
   "tel:+441202775566"
  ]
 },
 {
  "slug": "microsoft-office-unlicensed-product-error",
  "title": "Fix the Office &ldquo;Unlicensed Product&rdquo; Error &mdash; Word &amp; Excel | 365 Techies",
  "metaDesc": "Word or Excel says &ldquo;Unlicensed Product&rdquo; but you pay for Microsoft 365? Plain-English fixes from a Dorset family firm supporting Office since 1995. Remote help from &pound;20.",
  "ogTitle": "Office Says &ldquo;Unlicensed Product&rdquo;? The Real Fixes, In Order",
  "eyebrow": "Microsoft Office &amp; 365 Problems",
  "h1": "Microsoft Office &ldquo;Unlicensed Product&rdquo; Error &mdash; the Real Fixes, in the Right Order",
  "lede": "Word&rsquo;s title bar suddenly shouts UNLICENSED PRODUCT, Excel says &ldquo;most features are turned off&rdquo;, and the invoice you were halfway through won&rsquo;t save. First, the good news: your documents are fine, and in most cases you already own a perfectly valid licence &mdash; Office has simply lost track of it. This page walks through the causes we actually find on Dorset customers&rsquo; machines, from the thirty-second checks to the deep fixes Microsoft quietly moved into its documentation archive.",
  "chips": [
   "Remote fix from &pound;20",
   "Supporting Office since 1995",
   "Rated 4.9 on Google"
  ],
  "ctaHead": "Work stopped dead by a licensing error?",
  "ctaSub": "We untangle Office activation problems remotely from &pound;20 &mdash; we call before we connect, and you watch everything we do. Family-run, Mon&ndash;Fri 9&ndash;5, on 01202 775566 or text 07520 615332.",
  "sections": [
   {
    "eyebrow": "First, breathe",
    "h2": "What &ldquo;Unlicensed Product&rdquo; actually means (and what it doesn&rsquo;t)",
    "html": "<p>The error wears several outfits depending on which app you&rsquo;re in: Word shows <strong>UNLICENSED PRODUCT</strong> in the title bar, Excel adds &ldquo;<strong>most features are turned off</strong>&rdquo;, and Microsoft&nbsp;365 sometimes says &ldquo;<strong>We couldn&rsquo;t verify your subscription</strong>&rdquo; or &ldquo;<strong>Product Deactivated</strong>&rdquo;. They are all the same underlying problem: Office phones home to check your licence, doesn&rsquo;t get the answer it wants, and drops into reduced-functionality mode &mdash; you can usually still open and print documents, but editing and saving are switched off.</p><p>Two things worth knowing before you touch anything:</p><ul><li><strong>Your files are not lost or damaged.</strong> Nothing on your computer has been deleted. The moment the licence check succeeds again, everything works exactly as before.</li><li><strong>It very often happens to people who are paying correctly.</strong> The most common causes we see are a wrong signed-in account, a stale credential left on the machine, or a renewal card that quietly expired &mdash; not piracy, and not a scam.</li></ul><p>One reason this error feels so hard to fix yourself: Microsoft&rsquo;s deeper troubleshooting guide for it was moved into the archived &ldquo;previous versions&rdquo; section of its documentation in early 2025, so the best fixes barely show up in a Google search any more. The junk-tool websites that rank instead will try to sell you software you don&rsquo;t need. You don&rsquo;t. Work down this page in order.</p>"
   },
   {
    "eyebrow": "Branch one &mdash; home &amp; personal",
    "h2": "You bought Microsoft 365 yourself: three quick checks",
    "html": "<p>If this is a home PC or a one-person business with a personal Microsoft&nbsp;365 subscription, start here &mdash; these three checks solve the majority of cases in under ten minutes.</p><h3>1. Has the subscription actually renewed?</h3><p>Sign in at <strong>account.microsoft.com/services</strong> (in a web browser, not in Office) and look at your Microsoft&nbsp;365 subscription. If it shows as expired, the usual culprit is a replaced or out-of-date bank card &mdash; the renewal payment silently failed. Update the payment method or renew, then in any Office app go to <strong>File &gt; Account &gt; Update Licence</strong> (or just sign out and back in).</p><h3>2. Are you signed into the <em>right</em> Microsoft account?</h3><p>This is the classic. Open Word and look at <strong>File &gt; Account</strong> &mdash; the name and email in the top corner is the account Office is checking for a licence. If a family member, an employee, or whoever set the PC up signed in with <em>their</em> account, Office is looking for a subscription that account doesn&rsquo;t have. Sign out, sign in with the account that actually pays for Microsoft&nbsp;365, and the error usually clears on restart.</p><h3>3. Is more than one copy of Office installed?</h3><p>Second-hand PCs and machines &ldquo;helpfully&rdquo; set up with a trial often have two Office installations fighting each other. Check <strong>Settings &gt; Apps &gt; Installed apps</strong>: if you see more than one Microsoft&nbsp;365 or Office entry, uninstall the ones you don&rsquo;t pay for, restart, and sign in again. Windows also has a built-in Microsoft&nbsp;365 activation troubleshooter in the <strong>Get Help</strong> app &mdash; search &ldquo;activation&rdquo; there and it will walk through the same checks automatically.</p>"
   },
   {
    "eyebrow": "Branch two &mdash; work &amp; business",
    "h2": "The licence belongs to a business: where it goes wrong",
    "html": "<p>On a work machine the same error has a different set of causes, because the licence lives in your organisation&rsquo;s Microsoft&nbsp;365 tenant rather than a personal account.</p><ul><li><strong>Wrong or stale work account.</strong> <strong>File &gt; Account</strong> again: is Office signed into the current work email, or an old address from before a rename, a migration, or a previous job? Sign out of the wrong identity completely, then sign in fresh. If the PC keeps flipping between a personal and a work account with the same email address, that&rsquo;s a known Microsoft tangle &mdash; our guide to <a href=\"/teams-keeps-opening-wrong-account/\">Teams opening the wrong account</a> explains the personal-vs-work account split and how to fix it for good.</li><li><strong>The licence was never assigned &mdash; or got unassigned.</strong> Paying for Microsoft&nbsp;365 Business isn&rsquo;t enough; each user needs the licence ticked against their name. Whoever has admin access should check <strong>admin.microsoft.com &gt; Users &gt; Active users</strong>, open the affected person, and confirm a Microsoft&nbsp;365 licence is assigned. Licences also drop off when a subscription&rsquo;s seat count is reduced or a renewal payment fails.</li><li><strong>Leftover credentials on a shared or second-hand PC.</strong> A machine that previously belonged to someone else often still carries their saved Office sign-in, and Office checks <em>that</em> licence instead of yours. The credential clean-up in the next section fixes this.</li><li><strong>The person who set it all up has left.</strong> If Office &mdash; or the whole Microsoft&nbsp;365 admin side &mdash; was registered under an ex-employee&rsquo;s account, you have a bigger untangling job than one error message. Start with our guide for when <a href=\"/employee-left-dont-know-computer-password/\">an employee leaves and you don&rsquo;t know the passwords</a>.</li></ul>"
   },
   {
    "eyebrow": "Branch three &mdash; the archived fixes",
    "h2": "The deeper fixes Microsoft moved to its archive",
    "html": "<p>When the quick checks don&rsquo;t clear it, the problem is usually a stale identity cached somewhere on the PC. These fixes come from Microsoft&rsquo;s own IT-professional guidance &mdash; the document that was retired to the documentation archive in February 2025, which is why almost nobody finds them any more. They work, but they are <strong>advanced</strong>: go carefully, and if any of this feels uncomfortable, a <a href=\"/dell-remote-support/\">remote session from &pound;20</a> is the sensible shortcut &mdash; we do these exact steps while you watch.</p><h3>Clear cached Office credentials</h3><p>Open <strong>Credential Manager</strong> (search for it in the Start menu), choose <strong>Windows Credentials</strong>, and remove every entry that starts with <strong>MicrosoftOffice16</strong>. Restart Office and sign in with the correct account &mdash; it now has no stale identity to fall back on.</p><h3>Disconnect old work or school accounts</h3><p>Go to <strong>Settings &gt; Accounts &gt; Access work or school</strong> and disconnect any account that shouldn&rsquo;t be there &mdash; old employers, previous IT setups, accounts nobody recognises. Office inherits these connections and will happily check the wrong one.</p><h3>Reset Office&rsquo;s identity cache (registry &mdash; advanced)</h3><p>Office keeps its known identities in the registry under <strong>HKCU\\Software\\Microsoft\\Office\\16.0\\Common\\Identity\\Identities</strong>. Deleting that key forces Office to rebuild it cleanly at the next sign-in. <strong>Before touching the registry, back it up</strong> (File &gt; Export in Registry Editor) &mdash; a wrong deletion elsewhere can cause real damage. If you&rsquo;re not confident here, stop and call us; this is a two-minute job for us and a nervy one for most people.</p><h3>The full activation reset</h3><p>For the genuinely stubborn cases, Microsoft provides a procedure to reset the activation state of Microsoft&nbsp;365 Apps completely &mdash; wiping every cached licence and identity so the machine starts from scratch. It&rsquo;s the licensing equivalent of a factory reset and it&rsquo;s the last resort we reach for in remote sessions when everything above has failed.</p>"
   },
   {
    "eyebrow": "Branch four &mdash; the environment",
    "h2": "When it&rsquo;s the computer, not the licence",
    "html": "<p>Sometimes the licence and accounts are perfect, but Office physically can&rsquo;t reach Microsoft&rsquo;s licensing service to prove it. Three things to rule out:</p><ul><li><strong>Wrong date and time.</strong> Licence checks are cryptographically time-stamped, so a PC whose clock has drifted badly (common after a flat motherboard battery on older machines) fails activation for no visible reason. Check <strong>Settings &gt; Time &amp; language</strong> and turn &ldquo;Set time automatically&rdquo; on.</li><li><strong>Firewall, VPN or security software in the way.</strong> Overzealous third-party firewalls, proxies and some VPNs block the connection Office uses to verify licences. Try temporarily pausing the VPN or security suite and clicking <strong>File &gt; Account &gt; Update Licence</strong> again &mdash; if it works, add an exception rather than leaving protection off.</li><li><strong>A broken Office installation.</strong> Windows updates and half-finished upgrades can damage Office&rsquo;s Click-to-Run plumbing. Go to <strong>Settings &gt; Apps &gt; Installed apps</strong>, find Microsoft&nbsp;365, choose <strong>Modify</strong>, and run <strong>Quick Repair</strong> first (fast, offline). If the error survives, run <strong>Online Repair</strong> &mdash; slower, needs internet, but rebuilds the installation properly without touching your documents or settings.</li></ul><p>One thing we&rsquo;ll say plainly because the rest of the internet won&rsquo;t: <strong>never fix this with a cheap product key from an online marketplace or a &ldquo;free activator&rdquo; tool</strong>. Grey-market keys get revoked &mdash; putting you right back here &mdash; and activator downloads are one of the most reliable ways to infect a business PC with malware. You already pay for Office; the fix is making it recognise that, not buying it twice.</p>"
   },
   {
    "eyebrow": "Never again",
    "h2": "How our customers stopped seeing this error altogether",
    "html": "<p>We&rsquo;ve handled Office licensing since Office&nbsp;95 &mdash; literally &mdash; and taught Microsoft Office for more than ten years at our own Dorset Microsoft Education Resource Centre. In all that time, the pattern hasn&rsquo;t changed: this error almost never strikes machines where somebody is actually watching the licences.</p><p>That&rsquo;s the honest pitch for <a href=\"/microsoft-365-support/\">managed Microsoft&nbsp;365</a> at <strong>&pound;4.85 per user per month</strong>: we assign the licences properly, watch the renewals so a dead card never silently kills your subscription, keep sign-ins tidy, and when we do any work you get a written Service Report explaining what was done and why. Nobody on the plan sits staring at &ldquo;Unlicensed Product&rdquo; on invoice day wondering who to ring &mdash; they already know.</p><p>For everything else, we&rsquo;re remote-first: a secure session <strong>from &pound;20</strong>, arranged with a call before we connect so you know it&rsquo;s really us, Mon&ndash;Fri 9&ndash;5. If a machine needs hands-on work we collect it free locally &mdash; we don&rsquo;t run a walk-in shop, but we do come to you. Not sure which Microsoft&nbsp;365 subscription you should even be paying for? Our plain-English guide to <a href=\"/which-microsoft-365-plan/\">choosing the right Microsoft&nbsp;365 plan</a> is the place to start, and if your business leans hard on spreadsheets, our <a href=\"/excel-spreadsheet-rescue/\">Excel spreadsheet rescue service</a> covers the workbooks the licence error was keeping you away from.</p>"
   }
  ],
  "faqs": [
   {
    "q": "Will I lose my documents while Office says Unlicensed Product?",
    "a": "No. Reduced-functionality mode disables editing and saving in the Office apps, but every file on your computer and in OneDrive is untouched. You can usually still open and print documents while you fix the licence, and everything returns to normal the moment activation succeeds."
   },
   {
    "q": "Why does Word say Unlicensed Product when I pay for Microsoft 365?",
    "a": "Nine times out of ten Office is signed into the wrong Microsoft account &mdash; check File &gt; Account to see which one it&rsquo;s using. The other common causes are a renewal payment that silently failed on an expired card, a licence that was never assigned to your user in a business subscription, or stale credentials cached on the PC."
   },
   {
    "q": "How do I check which account Office is signed into?",
    "a": "Open Word or Excel and go to File &gt; Account. The name and email shown at the top is the account Office checks for a licence. If it isn&rsquo;t the account that pays for your Microsoft 365 subscription, sign out there, sign back in with the right one, and restart the app."
   },
   {
    "q": "Excel says &ldquo;most features are turned off&rdquo; &mdash; is that a different problem?",
    "a": "No &mdash; it&rsquo;s the same licensing error with Excel&rsquo;s wording. Word shows UNLICENSED PRODUCT in the title bar, Excel says most features are turned off, and some machines show &ldquo;We couldn&rsquo;t verify your subscription&rdquo; or &ldquo;Product Deactivated&rdquo;. All of them respond to the same fixes, in the same order."
   },
   {
    "q": "What does &ldquo;We couldn&rsquo;t verify your subscription&rdquo; mean?",
    "a": "Office tried to confirm your licence with Microsoft and couldn&rsquo;t get a valid answer. That can mean the subscription lapsed, the signed-in account doesn&rsquo;t hold the licence, or the PC couldn&rsquo;t reach Microsoft&rsquo;s licensing service at all &mdash; a wrong system clock, a VPN or an overzealous firewall can all block the check."
   },
   {
    "q": "I bought a second-hand PC and Office demands activation &mdash; what now?",
    "a": "The previous owner&rsquo;s Office sign-in is almost certainly still cached on the machine. Remove any MicrosoftOffice16 entries in Credential Manager, disconnect unknown accounts under Settings &gt; Accounts &gt; Access work or school, then sign in with your own Microsoft 365 account. If the PC came with Office &ldquo;included&rdquo; but no legitimate subscription, you&rsquo;ll need your own &mdash; we can advise on the cheapest honest route."
   },
   {
    "q": "Our employee left and Office was licensed under their account &mdash; can we recover it?",
    "a": "Usually, yes. If you have Microsoft 365 admin access, reassign the licence to the right user in the admin centre and sign the machines into the correct accounts. If the leaver held the admin keys too, it&rsquo;s a bigger untangling job &mdash; our employee-left guide covers it, and we handle these takeovers regularly."
   },
   {
    "q": "Should I just buy a cheap Office key online to make the error go away?",
    "a": "Please don&rsquo;t. Grey-market keys are frequently revoked by Microsoft, which lands you straight back at Unlicensed Product, and &ldquo;activator&rdquo; downloads are a well-known malware source. In almost every case we see, the customer already owns a valid licence &mdash; the fix is getting Office to recognise it, which costs from &pound;20 remotely, not another licence."
   },
   {
    "q": "How quickly can you fix this remotely?",
    "a": "Most unlicensed-product cases are resolved in a single remote session from &pound;20 &mdash; we call first, connect securely while you watch, and work through the same checks on this page plus the deeper resets where needed. We&rsquo;re open Mon&ndash;Fri 9&ndash;5 on 01202 775566, or text 07520 615332. We won&rsquo;t promise a guaranteed same-day fix, but licensing jobs are usually quick ones."
   },
   {
    "q": "Can this error be prevented permanently?",
    "a": "Very nearly. On our managed Microsoft 365 plan at &pound;4.85 per user per month we assign licences correctly, watch renewals so a failed card payment never silently cancels your subscription, and keep account sign-ins tidy &mdash; the three causes behind almost every case of this error. Any work we do comes with a written Service Report."
   }
  ],
  "schemaKind": "service",
  "serviceName": "Microsoft Office Unlicensed Product Error Fix",
  "howToName": "How to fix the Microsoft Office &ldquo;Unlicensed Product&rdquo; error",
  "howToSteps": [
   {
    "name": "Check which account Office is using",
    "text": "Open Word or Excel and go to File &gt; Account. Make sure Office is signed into the Microsoft account that actually holds the Microsoft 365 subscription &mdash; sign out and back in with the right one if not."
   },
   {
    "name": "Confirm the subscription is active",
    "text": "For personal subscriptions, sign in at account.microsoft.com/services and check the subscription hasn't lapsed on an expired card. For business licences, confirm a licence is assigned to the user in the Microsoft 365 admin centre."
   },
   {
    "name": "Clear stale credentials and repair Office",
    "text": "Remove MicrosoftOffice16 entries in Credential Manager, disconnect old accounts under Settings &gt; Accounts &gt; Access work or school, then run Quick Repair (and Online Repair if needed) from Settings &gt; Apps &gt; Installed apps &gt; Microsoft 365 &gt; Modify."
   },
   {
    "name": "Get remote help if it persists",
    "text": "If the error survives, deeper fixes such as resetting Office's identity cache or full activation state are best done with help. 365 Techies fixes these remotely from &pound;20 &mdash; call 01202 775566, Mon&ndash;Fri 9&ndash;5."
   }
  ],
  "crossLinksHtml": "<ul><li><a href=\"/teams-keeps-opening-wrong-account/\">Teams keeps opening the wrong account</a> &mdash; the same personal-vs-work account tangle, on the Teams side</li><li><a href=\"/employee-left-dont-know-computer-password/\">An employee left and you don&rsquo;t know the passwords</a> &mdash; when the licences were set up in a leaver&rsquo;s name</li><li><a href=\"/which-microsoft-365-plan/\">Which Microsoft 365 plan do you actually need?</a> &mdash; plain-English guide before you renew anything</li><li><a href=\"/excel-spreadsheet-rescue/\">Excel spreadsheet rescue</a> &mdash; for the workbook the licence error was keeping you away from</li><li><a href=\"/microsoft-365-support/\">Microsoft 365 support</a> &mdash; the hub for every Office and 365 problem we cover</li><li><a href=\"/outlook-problems/\">Common Outlook problems</a> &mdash; if email is what&rsquo;s broken, start there instead</li></ul>",
  "crumbName": "Unlicensed Product Error",
  "primaryCta": [
   "Get It Fixed Remotely",
   "/dell-remote-support/"
  ],
  "secondaryCta": [
   "Call 01202 775566",
   "tel:+441202775566"
  ]
 },
 {
  "slug": "former-it-provider-controls-microsoft-365",
  "title": "Former IT Provider Controls Your Microsoft 365? How to Take It Back | 365 Techies",
  "metaDesc": "A former IT company still holds the admin keys to your Microsoft 365? Three honest routes to take back control of your own tenant &mdash; with or without their cooperation &mdash; from a family-run Dorset firm that takes over from other providers regularly.",
  "ogTitle": "Your old IT company controls your Microsoft 365. Here&rsquo;s how to take it back.",
  "eyebrow": "Microsoft 365 admin takeover",
  "h1": "Your former IT provider still controls your Microsoft 365 &mdash; here&rsquo;s how to take it back",
  "lede": "It&rsquo;s an uncomfortable discovery: the email platform your whole business runs on has admin keys, and they&rsquo;re in somebody else&rsquo;s hands &mdash; an IT company you&rsquo;ve left, are leaving, or simply lost touch with. First, breathe. Your mailboxes, files and licences are almost certainly intact, and the subscription belongs to your organisation, not to whoever set it up. There are three routes back to control, depending on what you still hold &mdash; and if you control your domain name, you have real leverage, because Microsoft&rsquo;s own processes are built around proving domain ownership. We&rsquo;re a family-run Bournemouth firm that has supported Dorset businesses since 1995, and taking over Microsoft 365 from an outgoing provider is a job we do regularly. Here&rsquo;s exactly how it works.",
  "chips": [
   "Family-run, supporting Dorset businesses since 1995",
   "We take over from other IT providers regularly",
   "4.9 on Google"
  ],
  "ctaHead": "Locked out of your own Microsoft 365 by an old IT provider?",
  "ctaSub": "Call 01202 775566 or text 07520 615332, Mon&ndash;Fri 9&ndash;5. We&rsquo;ll tell you honestly which route applies to you &mdash; often in one phone call, before you&rsquo;ve spent a penny. Remote-first, and we always call before we connect. On-site across Bournemouth, Poole, Christchurch &amp; Dorset when it&rsquo;s needed.",
  "sections": [
   {
    "eyebrow": "Start here",
    "h2": "First, check which lock-out this actually is",
    "html": "<p>There are three quite different ways to be locked out of Microsoft 365, and they need three different fixes. If you&rsquo;ve lost <em>your own</em> admin password or the phone that does your MFA codes, you want our guide to a <a href=\"/locked-out-microsoft-365-admin-account/\">locked-out Microsoft 365 admin account</a>. If you&rsquo;re moving your email to a different Microsoft 365 tenant altogether, that&rsquo;s a <a href=\"/microsoft-365-migration/\">Microsoft 365 migration</a>. This page is scenario three: <strong>a third party holds your keys</strong> &mdash; typically a former IT company, a consultant who moved on, or a provider you&rsquo;re part-way through leaving.</p><p>Two reassurances before anything else. First, nothing here means your data is at risk of vanishing: mailboxes, OneDrive files and Teams history sit in <em>your</em> tenant regardless of who administers it. Second, this is rarely hostage-taking. In our experience most handovers are amicable &mdash; the old provider is often just slow, disorganised, or waiting on a final invoice. The routes below work in every case, from the friendly to the frosty.</p><p>Which route applies depends on one question: <strong>what do you still hold?</strong> Some admin access? Route 1. None at all, but nobody else is admin either? Route 2. They hold Global Admin and won&rsquo;t hand it over? Route 3. Not sure which you are? That&rsquo;s a five-minute phone call &mdash; 01202 775566.</p>"
   },
   {
    "eyebrow": "Route 1 &mdash; the straightforward one",
    "h2": "You still have some admin access: lock the door from the inside",
    "html": "<p>If anyone in your business can sign in to the Microsoft 365 admin centre &mdash; even an account you&rsquo;d forgotten about &mdash; you can do this properly, today, in this order:</p><ol><li><strong>Create your own emergency admin first.</strong> Before removing anything, set up a Global Administrator account on your own domain, with a strong password and MFA on a phone <em>you</em> control. That way no later step can lock you out.</li><li><strong>Audit who holds the keys.</strong> In the admin centre, go to Users &gt; Active users and filter by admin role. Note every account with Global Administrator &mdash; especially any belonging to the old provider or named after their company.</li><li><strong>Remove or demote their accounts.</strong> Strip the admin roles, then block sign-in. Pause before deleting outright &mdash; occasionally an old admin account has services or licences hanging off it, so demote first and tidy later.</li><li><strong>Revoke the partner relationship.</strong> This is the step most people miss. An IT provider can administer your tenant <em>without any account in it</em>, through a reseller or delegated-admin (GDAP) relationship. At the time of writing this lives in the admin centre under Settings &gt; Partner relationships &mdash; Microsoft does move these menus around &mdash; and you can remove the delegated roles from there.</li><li><strong>Re-point the billing.</strong> If licences are billed through the old provider, they can lapse &mdash; or be cancelled &mdash; mid-divorce. Move the subscription onto your own payment details, or onto a new provider you actually trust.</li><li><strong>Sweep for leftovers.</strong> Old admin accounts sometimes leave forwarding rules or app permissions behind. Our guide to <a href=\"/how-to-secure-your-microsoft-365-account/\">securing your Microsoft 365 account</a> walks the full checklist.</li></ol><p>It&rsquo;s a one-shot job with a couple of traps in it, so if you&rsquo;d rather not click alone: we do exactly this remotely, from &pound;20, while you watch &mdash; and we always call before we connect.</p>"
   },
   {
    "eyebrow": "Route 2 &mdash; no admin at all",
    "h2": "Nobody has admin? Microsoft&rsquo;s takeover route for unmanaged tenants",
    "html": "<p>Sometimes there&rsquo;s no admin login on either side of the break-up &mdash; the person who set it up has vanished, or the tenant grew out of staff signing themselves up for free Microsoft services and no one ever formally administered it. Microsoft calls this an <strong>unmanaged tenant</strong>, and it documents an internal admin takeover process for exactly this situation.</p><p>The shape of it: you sign up for a free self-service Microsoft service (Power BI is the usual example) using your own work email address on the domain in question. From there, Microsoft&rsquo;s takeover wizard invites you to become the admin &mdash; and asks you to <strong>prove you own the domain by adding a TXT record to its DNS</strong>, at your domain registrar. Add the record, Microsoft verifies it, and you become the Global Administrator of your own tenant.</p><p>Notice what the proof is: not an old password, not the blessing of the previous IT company &mdash; <strong>control of the domain</strong>. This is why we say that if you control your domain name, you can win. It&rsquo;s also why the section below on domain ownership matters so much: if the old provider holds the registrar login too, that&rsquo;s the thing to untangle first.</p><p>One honest caveat: this route applies to genuinely unmanaged tenants. If the old provider still holds a working Global Admin account, the wizard won&rsquo;t quietly hand the tenant to you over their heads &mdash; that&rsquo;s Route 3.</p>"
   },
   {
    "eyebrow": "Route 3 &mdash; the hard case",
    "h2": "They hold Global Admin and won&rsquo;t cooperate",
    "html": "<p>This is the situation people fear, and it&rsquo;s the one with the least official paperwork &mdash; so here&rsquo;s the honest version. Per Microsoft support practice (this is how cases are actually handled, rather than a formal published procedure), you can raise a case with Microsoft support and ask for <strong>ownership verification</strong>, which is escalated through Microsoft&rsquo;s data-protection team. You&rsquo;ll be asked to prove the organisation&rsquo;s claim to the tenant &mdash; typically control of the domain&rsquo;s DNS or registrar account, plus company registration documents such as your Companies House record.</p><p>We won&rsquo;t dress this up: the outcome rests with Microsoft, there&rsquo;s no published timescale, and we&rsquo;ve never seen anyone credibly promise one. What genuinely improves your position:</p><ul><li><strong>Put your request in writing</strong> to the former provider &mdash; polite, specific, dated. Ask for Global Admin access, the domain registrar login, and written confirmation when their access is removed. Keep every reply.</li><li><strong>Check your contract.</strong> Many IT support agreements have off-boarding terms, and many stand-offs are really billing disputes wearing a scarier costume. Settling the final invoice often opens the door faster than any escalation.</li><li><strong>Gather your evidence early</strong> &mdash; registrar access, Companies House documents, proof the domain and email addresses are yours &mdash; so the Microsoft case starts strong rather than stalling on paperwork.</li><li><strong>Consider a solicitor&rsquo;s letter.</strong> We&rsquo;re not solicitors and this isn&rsquo;t legal advice, but where a provider is withholding access to a business&rsquo;s own systems, a short letter from yours often concentrates minds. Speak to your solicitor about whether it&rsquo;s warranted.</li></ul><p>Meanwhile, your day-to-day email usually keeps working throughout &mdash; this fight is about the keys, not the building.</p>"
   },
   {
    "eyebrow": "Check this before anything else",
    "h2": "The domain name is the real key &mdash; find out who holds it",
    "html": "<p>Every route above leans on one thing: <strong>control of your domain name</strong> (the bit after the @ in your email addresses). Route 2 proves ownership through DNS. Route 3&rsquo;s evidence starts with the registrar. So before you do anything else, find out where the domain is registered and whose name is on it.</p><p>Run a WHOIS lookup on your domain, or ask your web person which registrar it sits with, and check: can anyone in your business log in to that registrar account? It&rsquo;s remarkably common for a small business&rsquo;s domain to have been registered <em>by</em> the old IT provider &mdash; sometimes in the provider&rsquo;s own name &mdash; because that was easiest at the time. Nobody was being sinister; it was 2011 and everyone just wanted email working.</p><p>If the old provider holds the registrar login, that handover moves to the top of your list: ask for the account credentials or a formal transfer of the domain into an account you own. If the domain is registered in <em>their</em> name rather than the business&rsquo;s, that&rsquo;s precisely the moment to loop in your solicitor &mdash; and your Companies House records, invoices showing you&rsquo;ve paid for the domain, and years of public use of the email addresses all help establish whose domain it really is.</p><p>Once the domain is in your hands, everything else on this page gets easier.</p>"
   },
   {
    "eyebrow": "Free to take &mdash; and to share",
    "h2": "The leaving checklist: what to demand from any outgoing IT provider",
    "html": "<p>Whether your split is friendly or fraught, this is what a proper Microsoft 365 handover includes. Send it to the outgoing provider as a list; tick items off in writing.</p><ul><li><strong>Global Administrator access</strong> &mdash; a Global Admin account in your own name, on your own domain. Not their account renamed, not a promise.</li><li><strong>Domain registrar login</strong> &mdash; or a transfer of the domain into an account the business owns. This is the master key; don&rsquo;t leave without it.</li><li><strong>DNS control and a copy of the records</strong> &mdash; a simple export or screenshot of your DNS zone, so email doesn&rsquo;t silently break the day something changes.</li><li><strong>Backups</strong> &mdash; what was backed up, where it lives, how to reach it, and a handover copy. If the answer is &ldquo;Microsoft keeps it all&rdquo;, read our honest guide to <a href=\"/microsoft-365-backup-do-you-need-it/\">whether Microsoft 365 needs a backup</a> before accepting that.</li><li><strong>Licence inventory</strong> &mdash; which Microsoft 365 licences you have, who&rsquo;s assigned what, renewal dates, and who bills them.</li><li><strong>The wider password book</strong> &mdash; router and Wi-Fi admin, website hosting, antivirus console, and any other systems they managed for you.</li><li><strong>Written confirmation their access has been removed</strong> &mdash; admin accounts, the partner relationship, remote-access software on your machines, the lot.</li></ul><p>If a provider bristles at this list, that tells you something. When customers leave <em>us</em>, this is the handover they get &mdash; because it&rsquo;s simply what a professional exit looks like.</p>"
   },
   {
    "eyebrow": "How we work",
    "h2": "What happens when 365 Techies takes over",
    "html": "<p>We&rsquo;ve supported Dorset businesses since 1995, and taking over Microsoft 365 from an outgoing provider is routine work for us &mdash; here&rsquo;s exactly what happens, with no drama:</p><ul><li><strong>An honest triage call first.</strong> We work out which route you&rsquo;re in and what you already hold. If it turns out you can fix it yourself in ten minutes, we&rsquo;ll say so.</li><li><strong>Simple jobs, remotely, from &pound;20</strong> &mdash; removing old admin accounts and partner relationships while you watch. We always call before we connect, so you know it&rsquo;s us on your screen. Bigger untangles &mdash; domain disputes, Microsoft ownership cases &mdash; are quoted honestly after we&rsquo;ve seen what&rsquo;s involved, because guessing a fixed price for Route 3 would be a fiction.</li><li><strong>Then, if you want us as your new admin:</strong> <a href=\"/microsoft-365-support/\">managed Microsoft 365</a> at &pound;4.85 per user per month &mdash; licences assigned, renewals watched, admin access held properly in your name with us as delegated support, never the other way round. Broader cover via our <a href=\"/business-it-support-plans/\">business support plans</a> from &pound;24.38 per computer per month, with a written Service Report after each visit so you always know what was done and why. We&rsquo;re not VAT registered, so those are the prices you actually pay.</li><li><strong>Same faces every time.</strong> You&rsquo;ll deal with the same small family team on every call &mdash; the opposite of the experience that usually brings people to this page.</li></ul><p>Remote-first, with on-site visits across Bournemouth, Poole, Christchurch and the rest of Dorset when hands-on is needed, and by-appointment meetings at the Kinson Community Centre &mdash; no walk-in shop. Mon&ndash;Fri 9&ndash;5, on 01202 775566, or text 07520 615332. And when you eventually leave us? You get the checklist above, completed, in writing. That&rsquo;s the whole point.</p>"
   }
  ],
  "faqs": [
   {
    "q": "Can our old IT company legally keep control of our Microsoft 365?",
    "a": "We&rsquo;re not solicitors, so this isn&rsquo;t legal advice &mdash; but practically, the tenant and its data belong to your organisation, and Microsoft&rsquo;s ownership processes revolve around proving control of your domain and your company&rsquo;s registration documents, not around who clicked &ldquo;create&rdquo; years ago. Where a provider is withholding access, the routes on this page usually resolve it; where there&rsquo;s a genuine contract dispute, speak to your solicitor."
   },
   {
    "q": "Will our email stop working while we take back control?",
    "a": "It shouldn&rsquo;t. Removing admin accounts and partner relationships doesn&rsquo;t touch mailboxes, files or Teams &mdash; staff carry on working throughout. The genuine risks are billing (licences lapsing if they were billed through the old provider) and DNS changes, which is why re-pointing the billing and getting registrar access are on the checklist. Done in the right order, nobody in the business notices anything."
   },
   {
    "q": "What is a Global Administrator, in plain English?",
    "a": "The master key to your Microsoft 365. A Global Administrator can create and delete users, reset passwords, read billing, change security settings and grant access to mailboxes. It&rsquo;s normal for an IT provider to hold this while they look after you &mdash; and normal to take it back when they stop."
   },
   {
    "q": "What is a &ldquo;partner relationship&rdquo; and why does it matter?",
    "a": "Microsoft lets an IT provider administer your tenant through a reseller or delegated-admin (GDAP) relationship &mdash; without having any user account inside it. That means deleting &ldquo;their&rdquo; admin account isn&rsquo;t enough on its own. At the time of writing you can review and remove these under Settings &gt; Partner relationships in the Microsoft 365 admin centre, and it&rsquo;s the step most DIY takeovers miss."
   },
   {
    "q": "What if the old provider owns our domain name too?",
    "a": "Then that&rsquo;s job one, because the domain is the master key &mdash; Microsoft&rsquo;s takeover and ownership processes both prove your claim through DNS. Run a WHOIS lookup, find the registrar, and ask for the account login or a formal transfer into an account the business owns. If the domain was registered in the provider&rsquo;s own name, gather your Companies House records and invoices and consider a solicitor&rsquo;s letter."
   },
   {
    "q": "How long does Microsoft&rsquo;s ownership process take?",
    "a": "Honestly: the DNS-based takeover for unmanaged tenants can be quick once the TXT record is in place, but the support route through Microsoft&rsquo;s data-protection team has no published timescale, and we won&rsquo;t invent one. What speeds it up is arriving with your evidence ready &mdash; registrar access, DNS control and company registration documents."
   },
   {
    "q": "Can the old provider read our email right now?",
    "a": "Technically, a Global Administrator can grant themselves access to mailboxes &mdash; that&rsquo;s what the role is. In practice the overwhelming majority of IT providers are professionals and do no such thing, so don&rsquo;t panic; but it&rsquo;s exactly why a tidy handover ends with written confirmation their access is removed, and a pass through our guide to securing your Microsoft 365 account."
   },
   {
    "q": "Do we have to sign up with you to get help taking control back?",
    "a": "No. Plenty of businesses just want the keys back in their own hands, and we&rsquo;ll do that as a one-off &mdash; simple remote jobs from &pound;20, bigger untangles quoted honestly once we&rsquo;ve seen them. If you&rsquo;d then like us to run Microsoft 365 for you, it&rsquo;s &pound;4.85 per user per month managed, but there&rsquo;s no obligation and no hard sell."
   },
   {
    "q": "Our old IT person was an employee who left, not a company &mdash; same process?",
    "a": "Very similar, and often easier because the accounts are on your own domain. Audit the admin roles, remove theirs, check for partner relationships anyway, and change anything they knew. We&rsquo;ve a separate guide for the wider problem of an employee leaving with passwords in their head &mdash; and it pairs well with the leaving checklist on this page."
   },
   {
    "q": "Do you have an office we can visit to sort this out?",
    "a": "No walk-in premises &mdash; we&rsquo;re remote-first, which suits this job well since it all happens in the Microsoft 365 admin centre anyway. We visit businesses across Bournemouth, Poole, Christchurch and Dorset when on-site work is needed, and can meet at the Kinson Community Centre by appointment. Call 01202 775566 or text 07520 615332, Mon&ndash;Fri 9&ndash;5."
   }
  ],
  "schemaKind": "service",
  "serviceName": "Microsoft 365 Admin Takeover &amp; Provider Handover Service, Dorset",
  "howToName": "How to take back control of Microsoft 365 from a former IT provider",
  "howToSteps": [
   {
    "name": "Work out what you hold",
    "text": "Check whether anyone in the business can sign in to the Microsoft 365 admin centre, and run a WHOIS lookup to find out who controls your domain name at the registrar. These two answers decide which route applies &mdash; and the domain is the master key throughout."
   },
   {
    "name": "If you have admin access, lock the door from the inside",
    "text": "Create your own Global Administrator account first, then remove the old provider&rsquo;s admin accounts, revoke any reseller or delegated (GDAP) partner relationship under Settings &gt; Partner relationships, and move the billing onto your own payment details so licences don&rsquo;t lapse."
   },
   {
    "name": "If nobody has admin, use Microsoft&rsquo;s takeover for unmanaged tenants",
    "text": "Sign up for a free self-service Microsoft service with your work email, follow the admin takeover wizard, and prove you own the domain by adding a DNS TXT record at your registrar. Microsoft verifies the record and makes you the Global Administrator."
   },
   {
    "name": "If they won&rsquo;t cooperate, escalate with evidence &mdash; or hand it to us",
    "text": "Request access in writing, settle any genuine billing dispute, then raise a Microsoft support case for ownership verification with proof of domain control and your company registration documents. Or call 01202 775566 and we&rsquo;ll run the whole takeover for you &mdash; simple remote jobs from &pound;20, then managed Microsoft 365 at &pound;4.85 per user per month if you&rsquo;d like us to be your new admin."
   }
  ],
  "crossLinksHtml": "<ul><li><a href=\"/locked-out-microsoft-365-admin-account/\">Locked out of your Microsoft 365 admin account</a> &mdash; when it&rsquo;s your own password or MFA that&rsquo;s the problem, not a third party.</li><li><a href=\"/microsoft-365-migration/\">Microsoft 365 migration</a> &mdash; moving to a different tenant or provider properly, once the keys are yours.</li><li><a href=\"/how-to-secure-your-microsoft-365-account/\">How to secure your Microsoft 365 account</a> &mdash; the post-takeover sweep: MFA, forwarding rules and leftover access.</li><li><a href=\"/microsoft-365-backup-do-you-need-it/\">Does Microsoft 365 need a backup?</a> &mdash; the honest answer to &ldquo;Microsoft keeps it all, right?&rdquo; before you accept it from an outgoing provider.</li><li><a href=\"/employee-left-dont-know-computer-password/\">An employee left and you don&rsquo;t know the passwords</a> &mdash; the in-house cousin of this problem.</li><li><a href=\"/microsoft-365-support/\">Microsoft 365 support</a> &mdash; everything we do around Microsoft 365, managed from &pound;4.85 per user per month.</li><li><a href=\"/business-it-support-plans/\">Business IT support plans</a> &mdash; ongoing cover from &pound;24.38 per computer per month, with a written Service Report after each visit.</li></ul>",
  "crumbName": "Reclaim Your Microsoft 365",
  "primaryCta": [
   "Talk to a Techie",
   "/contact/"
  ],
  "secondaryCta": [
   "Call 01202 775566",
   "tel:+441202775566"
  ]
 }
]
