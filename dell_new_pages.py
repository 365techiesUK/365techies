# -*- coding: utf-8 -*-
"""Six Dell pages from seo-research/dell-2026-10-13 (13 Oct 2026; owner: "do them all").

How-to pages around Dell's own tools (people search the tool; we answer the "how do I" honestly, Windows only):
  how-to-find-dell-service-tag-and-check-warranty  Bing UK: "dell service tag" 2,818 + "dell warranty check" 15,691 a quarter
  dell-supportassist-keeps-popping-up              Bing UK: "dell supportassist" 14,934 (a symptom page, not a verdict)
  how-to-update-dell-bios                          Bing UK: "dell bios update" 1,017 / world 13,593
Model pages in the existing "worth it" pattern (5410 / 5300 / 3510):
  dell-latitude-5420-worth-it-2026   Bing: 13,345 world / 717 UK
  dell-latitude-7420-worth-it-2026   Bing: 5,574 world / 256 UK
  dell-latitude-5440-worth-it-2026   Bing: 4,705 world / 445 UK

Sources (read 13 Oct 2026): Dell 'Locate Your Laptop's / Desktop's Service Tag' (label underneath / back or top of the
tower, ST and EX codes, F2 BIOS, SupportAssist home screen; don't post the tag publicly); Dell KB 000130711 (PowerShell
GWMI -Class Win32_Bios | select SerialNumber; WMIC deprecated, off by default from Windows 11 24H2); Dell KB 000130387
(SupportAssist for Home PCs: what it does; uninstall via Settings > Apps > Installed apps; modified 19 Apr 2026); Dell
SupportAssist for Home PCs user's guide (settings icon > Settings > Notifications, clear the box, Save; hardware issues and
urgent driver updates still shown); Dell KB 000131491 (no third-party removal tools; restart first); Dell KB 000134415
(suspend BitLocker before a BIOS update or Windows asks for the recovery key; Control Panel path); Dell KB 000124211 (BIOS
update methods, SupportAssist recommended, BIOS passwords can block some methods); Dell's BIOS video (battery present and
charger plugged in); Dell KB 000216539 (BIOS via Windows Update can fail on PCs with a separate graphics card).
Models: Latitude 5420 = 2021, 14in, 11th-gen Intel (our 5420-vs-5430 page); 7420 = 2021, 14in, 11th-gen Intel, LPDDR4x
memory soldered (8/16/32GB), M.2 2280 SSD (invgate itdb, Back Market); 5440 = 2023, 14in, 13th-gen Intel in most
configurations (some 12th-gen), memory in slots (Notebookcheck, Ubuntu certification). 11th and 13th gen are on Microsoft's
Windows 11 processor lists. Prices and guarantee = our own pages (5000 series from GBP 535, 7000 from GBP 520; 12-month
guarantee as standard, five years on a support plan).
"""
from new_pages_data import NEW_PAGES

_CALL = ('<p>Ring <strong>01202 775566</strong> or text 07520 615332, Monday to Friday, 9 to 5. With your permission we connect to your '
         'Windows PC and sort it while you watch: remote help from &pound;20, and no fix, no fee. We&rsquo;re an independent Dell '
         'specialist and a Dell reseller since 2001, not Dell itself.</p>')
_REFURB = ('<p>Prefer one that&rsquo;s already been checked? Our refurbished Latitudes are ex-business machines we test, securely wipe and fit '
           'with a brand-new Samsung Pro SSD, then set up for you, with a 12-month guarantee as standard or five years while you&rsquo;re on '
           'one of our support plans. See <a href="/refurbished-dell-laptops-bournemouth/">refurbished Dell laptops</a>.</p>')
CTA = ['Call 01202 775566', 'tel:+441202775566']

NEW_PAGES.append({
 'slug': 'how-to-find-dell-service-tag-and-check-warranty',
 'title': 'How to Find Your Dell Service Tag and Check the Warranty',
 'metaDesc': 'Where the Dell service tag is on a laptop or desktop, how to read it in Windows or the BIOS, and how to check your Dell warranty with it.',
 'ogTitle': 'How to find your Dell service tag and check the warranty',
 'crumbName': 'Find Your Dell Service Tag',
 'eyebrow': '// DELL SERVICE TAG &amp; WARRANTY',
 'h1': 'How to find your <em class="grad grad--cyan">Dell service tag</em> and check the warranty',
 'lede': 'Every Dell has a service tag: a short code that tells Dell exactly which machine it is, with its parts, drivers and warranty. It&rsquo;s printed on the computer, and Windows can read it too. Here&rsquo;s where to find it, and how to check what warranty is left.',
 'chips': ['Dell&rsquo;s own steps', 'Laptop and desktop', 'Independent Dell specialists'],
 'primaryCta': CTA, 'secondaryCta': ['Read it in Windows', '#s2'],
 'ctaHead': 'Need a hand with your Dell?', 'ctaSub': 'Ring us and talk to a person. Family-run in Bournemouth since 1995, a Dell reseller since 2001.',
 'schemaKind': 'howto',
 'sections': [
  {'eyebrow': '/01 &mdash; ON THE COMPUTER', 'h2': 'Where the service tag is printed',
   'html': '<ul><li><strong>Laptops:</strong> underneath, on a sticker or etched into the metal. Look for <strong>ST</strong> (the service tag) and <strong>EX</strong> (the Express Service Code).</li>'
           '<li><strong>Desktops:</strong> on the back of the tower, and often on a black sticker with white letters on the top.</li></ul>'
           '<p>The Express Service Code is the same code written as numbers only, for Dell&rsquo;s phone menus. Source: Dell, <a href="https://www.dell.com/support/contents/en-us/category/product-support/self-support-knowledgebase/locate-service-tag/" rel="noopener" target="_blank">find your service tag</a>.</p>'},
  {'eyebrow': '/02 &mdash; IN WINDOWS', 'h2': 'Read it in Windows if the label has worn off',
   'html': '<ol><li>Right-click the <strong>Start</strong> button and choose <strong>Terminal</strong> (on Windows 10, <strong>Windows PowerShell</strong>).</li>'
           '<li>Type <strong>GWMI -Class Win32_Bios | select SerialNumber</strong> and press Enter.</li>'
           '<li>The <strong>SerialNumber</strong> it shows is your service tag.</li></ol>'
           '<p>If it says GWMI isn&rsquo;t recognised, type <strong>Get-CimInstance Win32_BIOS | Select-Object SerialNumber</strong> instead. The old <em>wmic</em> command is switched off from Windows 11 version 24H2, which is why Dell now points to PowerShell (Dell article 000130711).</p>'
           '<p>Two other ways: restart and tap <strong>F2</strong> as it starts to open the BIOS, where the service tag is on the overview page (leave without changing anything); or open <strong>SupportAssist</strong> from the Start menu, which shows it on its main screen.</p>'},
  {'eyebrow': '/03 &mdash; THE WARRANTY', 'h2': 'Check the Dell warranty with the service tag',
   'html': '<ol><li>Go to <strong>dell.com/support</strong> in your browser, typed in yourself.</li>'
           '<li>Type the service tag into the box (or let Dell detect the PC).</li>'
           '<li>Open the warranty details for that machine: Dell shows the type of cover and when it ends.</li></ol>'
           '<p><strong>Keep the tag to yourself:</strong> it&rsquo;s linked to the machine&rsquo;s Dell record, so Dell advises not to post it, or photos of the label, online.</p>'},
  {'eyebrow': '/04 &mdash; SECOND-HAND DELLS', 'h2': 'Bought it second-hand or refurbished?',
   'html': '<p>The warranty check shows what&rsquo;s left of the machine&rsquo;s original Dell cover. On an older ex-business laptop that has usually run out, so check before you rely on it.</p>' + _REFURB},
  {'eyebrow': '/05 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': '<p>If the warranty has ended and the Dell needs a repair, or you can&rsquo;t find the tag at all, we can help.</p>' + _CALL},
 ],
 'howToName': 'How to find a Dell service tag',
 'howToSteps': [
  {'name': 'Look on the computer', 'text': 'Laptops: underneath, on a sticker or etched into the metal (ST). Desktops: on the back or the top of the tower.'},
  {'name': 'Or read it in Windows', 'text': 'Right-click Start, open Terminal, type GWMI -Class Win32_Bios | select SerialNumber and press Enter. The serial number is the service tag.'},
  {'name': 'Or open the BIOS', 'text': 'Restart and tap F2 as it starts; the service tag is on the overview page. Leave without changing anything.'},
  {'name': 'Check the warranty', 'text': 'Type the service tag into dell.com/support and open the warranty details for that machine.'},
 ],
 'faqs': [
  {'q': 'Where is the service tag on a Dell laptop?', 'a': '<p>Underneath, on a sticker or etched into the metal, next to ST. The EX number beside it is the Express Service Code, the same code as numbers only.</p>'},
  {'q': 'How do I find my Dell service tag without the sticker?', 'a': '<p>Right-click Start, open Terminal and type <strong>GWMI -Class Win32_Bios | select SerialNumber</strong>. Or tap F2 as the PC starts to see it in the BIOS, or open SupportAssist.</p>'},
  {'q': 'How do I check my Dell warranty?', 'a': '<p>Type the service tag into dell.com/support and open the warranty details for that machine. Dell shows the type of cover and the end date.</p>'},
  {'q': 'Is the serial number the same as the service tag?', 'a': '<p>On a Dell, yes: Windows reports the service tag as the computer&rsquo;s serial number.</p>'},
  {'q': 'Is it safe to share my Dell service tag?', 'a': '<p>Give it to Dell or a repairer you trust when they ask, but don&rsquo;t post it or a photo of the label online: it&rsquo;s linked to the machine&rsquo;s Dell record.</p>'},
 ],
 'crossLinksHtml': '<p>Related help: <a href="/how-to-update-dell-bios/">updating a Dell BIOS safely</a>, <a href="/dell-supportassist-keeps-popping-up/">SupportAssist keeps popping up</a>, <a href="/dell-out-of-warranty-repair/">out-of-warranty Dell repair</a>, <a href="/dell-it-support-dorset/">Dell support and repair in Dorset</a>.</p>',
})

NEW_PAGES.append({
 'slug': 'dell-supportassist-keeps-popping-up',
 'title': 'Dell SupportAssist Keeps Popping Up? Turn It Down or Off',
 'metaDesc': 'Dell SupportAssist notifications every day? How to switch them off in its settings, what you lose if you do, and how to uninstall it safely.',
 'ogTitle': 'Dell SupportAssist keeps popping up? Turn it down or off',
 'crumbName': 'Dell SupportAssist Pop-ups',
 'eyebrow': '// DELL SUPPORTASSIST',
 'h1': 'Dell SupportAssist <em class="grad grad--cyan">keeps popping up</em>?',
 'lede': 'SupportAssist is Dell&rsquo;s own maintenance app: it checks for driver and BIOS updates, scans for hardware problems and helps you contact Dell. Its reminders can get repetitive. You can turn most of them off in its own settings, or remove the app altogether. Here&rsquo;s what each choice means.',
 'chips': ['Dell&rsquo;s own steps', 'Keep it or remove it', 'Independent Dell specialists'],
 'primaryCta': CTA, 'secondaryCta': ['Turn the notifications off', '#s2'],
 'ctaHead': 'Not sure what to keep on your Dell?', 'ctaSub': 'Ring us and we&rsquo;ll look at it with you, remotely on your Windows PC.',
 'schemaKind': 'howto',
 'sections': [
  {'eyebrow': '/01 &mdash; WHAT IT IS', 'h2': 'What Dell SupportAssist does',
   'html': '<p>Dell describes SupportAssist for Home PCs as a monitoring and maintenance app. It keeps an eye on the PC&rsquo;s condition, offers driver, BIOS and software updates, scans for problems, warns about hardware that may be about to fail, and can open a support request with Dell. Most Dell home PCs come with it.</p>'
           '<p style="font-size:.85rem;color:var(--muted)">Source: Dell, <a href="https://www.dell.com/support/kbdoc/000130387" rel="noopener" target="_blank">SupportAssist for Home PCs: overview and common questions</a> (updated 19 April 2026).</p>'},
  {'eyebrow': '/02 &mdash; TURN IT DOWN', 'h2': 'Turn off SupportAssist notifications',
   'html': '<ol><li>Open <strong>SupportAssist</strong> from the Start menu (you need to be signed in as an administrator).</li>'
           '<li>Click the <strong>settings</strong> icon at the top right, then <strong>Settings</strong>, then <strong>Notifications</strong>.</li>'
           '<li>Clear the box for notifications and click <strong>Save</strong>.</li></ol>'
           '<p>Dell&rsquo;s guide says it will still tell you about <strong>hardware problems and urgent driver updates</strong> found during a scan, even with notifications off. The menu names can differ a little between versions.</p>'},
  {'eyebrow': '/03 &mdash; REMOVE IT', 'h2': 'Uninstall SupportAssist safely',
   'html': '<ol><li>Open <strong>Settings</strong>, then <strong>Apps</strong>, then <strong>Installed apps</strong>.</li>'
           '<li>Find <strong>Dell SupportAssist</strong>, click the three dots or the entry, then <strong>Uninstall</strong>.</li>'
           '<li>Follow the steps, then <strong>restart</strong>.</li></ol>'
           '<p>If it won&rsquo;t uninstall, restart first and try again. Dell advises <strong>not</strong> to use third-party removal tools. You can download it again free from Dell&rsquo;s support site whenever you want it back.</p>'},
  {'eyebrow': '/04 &mdash; KEEP IT OR NOT?', 'h2': 'Should you keep it?',
   'html': '<p><strong>Keep it</strong> if you&rsquo;d like Dell to offer BIOS and driver updates and check the hardware for you: it&rsquo;s the easiest way to keep a Dell&rsquo;s firmware current.</p>'
           '<p><strong>Remove it</strong> if the reminders bother you more than they help. Windows Update still brings many Dell drivers, and you can get BIOS updates from Dell&rsquo;s website when you need them (see <a href="/how-to-update-dell-bios/">how to update a Dell BIOS safely</a>). Business PCs often use Dell Command | Update instead.</p>'},
  {'eyebrow': '/05 &mdash; IS IT REALLY DELL?', 'h2': 'A pop-up asking you to ring &ldquo;Dell&rdquo;?',
   'html': '<p>SupportAssist runs inside its own window from the Start menu. A <strong>browser</strong> pop-up saying your Dell is infected and giving a phone number to ring is a scam, not Dell: close the browser and don&rsquo;t ring the number. If you already rang and let someone in, see <a href="/ive-been-scammed-what-to-do/">I&rsquo;ve been scammed: what to do</a>.</p>'},
  {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL},
 ],
 'howToName': 'How to stop Dell SupportAssist notifications',
 'howToSteps': [
  {'name': 'Open SupportAssist', 'text': 'Open SupportAssist from the Start menu, signed in as an administrator.'},
  {'name': 'Open its notification settings', 'text': 'Click the settings icon at the top right, then Settings, then Notifications.'},
  {'name': 'Switch them off', 'text': 'Clear the notifications box and click Save. Urgent hardware and driver alerts may still appear.'},
  {'name': 'Or uninstall it', 'text': 'Settings, then Apps, then Installed apps: uninstall Dell SupportAssist, then restart.'},
 ],
 'faqs': [
  {'q': 'How do I stop Dell SupportAssist pop-ups?', 'a': '<p>Open SupportAssist, click the settings icon at the top right, then Settings, then Notifications, clear the box and click Save. Dell still shows urgent hardware and driver alerts.</p>'},
  {'q': 'Can I uninstall Dell SupportAssist?', 'a': '<p>Yes. Settings, then Apps, then Installed apps, then Dell SupportAssist, then Uninstall, and restart. You can download it again free from Dell whenever you like.</p>'},
  {'q': 'Do I need Dell SupportAssist?', 'a': '<p>No, Windows works without it. It&rsquo;s the easiest way to get Dell&rsquo;s BIOS updates and hardware checks, so keep it if you value those; remove it if the reminders bother you.</p>'},
  {'q': 'Is a pop-up telling me to ring Dell real?', 'a': '<p>Not if it&rsquo;s in your web browser with a phone number: that&rsquo;s a scam. SupportAssist runs in its own window. Close the browser and don&rsquo;t ring.</p>'},
 ],
 'crossLinksHtml': '<p>Related help: <a href="/how-to-update-dell-bios/">updating a Dell BIOS safely</a>, <a href="/how-to-find-dell-service-tag-and-check-warranty/">finding your Dell service tag</a>, <a href="/dell-remote-support/">remote Dell support</a>, <a href="/dell-it-support-dorset/">Dell support and repair in Dorset</a>.</p>',
})

NEW_PAGES.append({
 'slug': 'how-to-update-dell-bios',
 'title': 'How to Update a Dell BIOS Safely: Steps and BitLocker',
 'metaDesc': 'Updating the BIOS on a Dell laptop or desktop: the safe way with SupportAssist or Dell\'s download, why to suspend BitLocker first, and what not to do.',
 'ogTitle': 'How to update a Dell BIOS safely',
 'crumbName': 'Update a Dell BIOS Safely',
 'eyebrow': '// DELL BIOS UPDATE',
 'h1': 'How to update a <em class="grad grad--cyan">Dell BIOS</em> safely',
 'lede': 'A BIOS update fixes bugs and security holes in the firmware that starts your Dell. It&rsquo;s routine, but it&rsquo;s the one update you mustn&rsquo;t interrupt, and on a PC with BitLocker it can ask for the recovery key unless you suspend BitLocker first. Here&rsquo;s the safe way, from Dell&rsquo;s own guidance.',
 'chips': ['Dell&rsquo;s own steps', 'The BitLocker trap', 'Independent Dell specialists'],
 'primaryCta': CTA, 'secondaryCta': ['Before you start', '#s1'],
 'ctaHead': 'Rather we did it?', 'ctaSub': 'We can update the BIOS for you remotely, with BitLocker handled properly. Remote help from &pound;20.',
 'schemaKind': 'howto',
 'sections': [
  {'eyebrow': '/01 &mdash; BEFORE YOU START', 'h2': 'Three things to do first',
   'html': '<ol><li><strong>Plug in the charger.</strong> On a laptop, Dell says the battery must be in and the charger plugged in for the whole update.</li>'
           '<li><strong>Suspend BitLocker.</strong> Control Panel, then System and Security, then BitLocker Drive Encryption, then <strong>Suspend protection</strong>. If you skip this on a PC with BitLocker, Windows asks for the 48-digit recovery key at the next restart (Dell article 000134415). Know where your key is first: <a href="/computer-asking-for-bitlocker-recovery-key/">finding a BitLocker recovery key</a>.</li>'
           '<li><strong>Save your work and close programs.</strong> The PC restarts during the update.</li></ol>'
           '<p>If a BIOS password is set, some update methods won&rsquo;t run until it&rsquo;s removed (Dell article 000124211).</p>'},
  {'eyebrow': '/02 &mdash; THE EASY WAY', 'h2': 'Update with SupportAssist',
   'html': '<ol><li>Open <strong>SupportAssist</strong> from the Start menu.</li>'
           '<li>Run its updates check and choose the <strong>BIOS</strong> update if it&rsquo;s offered.</li>'
           '<li>Let it restart. The screen shows Dell&rsquo;s BIOS update with a progress bar, and the fans may get loud. <strong>Leave it alone</strong> until Windows is back.</li></ol>'
           '<p>Dell recommends this route for most people because it picks the right update for your exact model.</p>'},
  {'eyebrow': '/03 &mdash; THE MANUAL WAY', 'h2': 'Or download it from Dell',
   'html': '<ol><li>Go to <strong>dell.com/support</strong>, typed in yourself, and enter your service tag or let Dell detect the PC (<a href="/how-to-find-dell-service-tag-and-check-warranty/">finding the service tag</a>).</li>'
           '<li>Open <strong>Drivers &amp; Downloads</strong> and set the category to <strong>BIOS</strong>.</li>'
           '<li>Download the latest BIOS for <em>that</em> machine, run it, and let the PC restart and finish.</li></ol>'},
  {'eyebrow': '/04 &mdash; WHAT NOT TO DO', 'h2': 'What not to do during a BIOS update',
   'html': '<ul><li>Don&rsquo;t switch off, unplug or close the lid while it runs.</li>'
           '<li>Don&rsquo;t install a BIOS meant for a different model.</li>'
           '<li>Don&rsquo;t go back to an older BIOS unless Dell&rsquo;s notes tell you to.</li></ul>'},
  {'eyebrow': '/05 &mdash; AFTERWARDS', 'h2': 'After the update',
   'html': '<p>Check BitLocker is protecting the drive again: Control Panel, then BitLocker Drive Encryption. If it still says suspended, click <strong>Resume protection</strong>.</p>'
           '<p>If Windows Update offers a Dell BIOS update and it keeps failing, Dell notes this can happen on PCs with a separate graphics card because BitLocker isn&rsquo;t suspended for it; suspend BitLocker yourself and try again, or use SupportAssist (Dell article 000216539).</p>'},
  {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': '<p>If the PC now asks for a recovery key you can&rsquo;t find, or won&rsquo;t start after an update, ring us before you try anything else.</p>' + _CALL},
 ],
 'howToName': 'How to update a Dell BIOS safely',
 'howToSteps': [
  {'name': 'Plug in and save your work', 'text': 'On a laptop, plug in the charger with the battery in. Save your work and close programs.'},
  {'name': 'Suspend BitLocker', 'text': 'Control Panel, then System and Security, then BitLocker Drive Encryption, then Suspend protection. Know where your recovery key is first.'},
  {'name': 'Run the update', 'text': 'Use SupportAssist, or download the BIOS for your service tag from dell.com/support, and run it.'},
  {'name': 'Leave it alone', 'text': 'Let the PC restart and finish without switching off or closing the lid.'},
  {'name': 'Check BitLocker again', 'text': 'In Control Panel, BitLocker Drive Encryption, resume protection if it still says suspended.'},
 ],
 'faqs': [
  {'q': 'Is it safe to update the BIOS on a Dell?', 'a': '<p>Yes, if you follow Dell&rsquo;s steps: charger plugged in, BitLocker suspended, and nothing interrupted while it runs.</p>'},
  {'q': 'Why is my Dell asking for a BitLocker recovery key after a BIOS update?', 'a': '<p>Because BitLocker wasn&rsquo;t suspended first. Type the 48-digit key from your Microsoft account or where your work keeps it; see <a href="/computer-asking-for-bitlocker-recovery-key/">finding a BitLocker recovery key</a>.</p>'},
  {'q': 'How do I update the BIOS on a Dell laptop?', 'a': '<p>With the charger plugged in and BitLocker suspended, use SupportAssist&rsquo;s updates check, or download the BIOS for your service tag from dell.com/support and run it.</p>'},
  {'q': 'What happens if a BIOS update is interrupted?', 'a': '<p>The PC may not start. Don&rsquo;t keep switching it on and off: ring us or Dell.</p>'},
 ],
 'crossLinksHtml': '<p>Related help: <a href="/computer-asking-for-bitlocker-recovery-key/">computer asking for a BitLocker recovery key</a>, <a href="/how-to-find-dell-service-tag-and-check-warranty/">finding your Dell service tag</a>, <a href="/dell-supportassist-keeps-popping-up/">SupportAssist keeps popping up</a>, <a href="/dell-this-pc-cant-run-windows-11/">this Dell can&rsquo;t run Windows 11</a>.</p>',
})


def _model(slug, model, year, cpu, extra_who, checks, upg, price_line, faq_price, cross):
    return {
     'slug': slug,
     'title': 'Dell Latitude %s Worth It in 2026? Honest Verdict' % model,
     'metaDesc': 'Is the Dell Latitude %s worth buying in 2026? Who it suits, what to check on a used one, Windows 11, and tested refurbished options.' % model,
     'ogTitle': 'Dell Latitude %s in 2026: still worth buying?' % model,
     'crumbName': 'Dell Latitude %s - Worth It?' % model,
     'eyebrow': '// DELL LATITUDE &middot; HONEST BUYER VERDICT',
     'h1': 'Is the Dell Latitude %s <em class="grad grad--cyan">worth it in 2026</em>?' % model,
     'lede': 'Yes, at the right price and in good condition. The Latitude %s is a %s 14-inch business laptop on %s, which runs Windows 11 and handles office work, Microsoft 365 and video calls comfortably. Buy it on condition, not the badge: here&rsquo;s what to check.' % (model, year, cpu),
     'chips': ['Independent Dell specialists', 'Dell reseller since 2001', 'No-fix-no-fee repairs'],
     'primaryCta': CTA, 'secondaryCta': ['What to check', '#s3'],
     'ctaHead': 'Not sure which Latitude to buy?', 'ctaSub': 'Talk to a real technician before you spend a penny. Call 01202 775566 and we&rsquo;ll tell you honestly whether the %s fits.' % model,
     'schemaKind': 'service', 'serviceName': 'Refurbished Dell Latitude Sales &amp; Buyer Advice',
     'sections': [
      {'eyebrow': '// THE VERDICT', 'h2': 'Is the Dell Latitude %s worth it in 2026?' % model,
       'html': '<p><strong>Yes, at the right price and in good condition.</strong> The Latitude %s is a %s 14-inch business laptop on %s. For email, Microsoft 365, browsing and Teams or Zoom it&rsquo;s plenty, and its processor is on Microsoft&rsquo;s Windows 11 supported list.</p>'
               '<p>Where people get caught out is condition: a worn battery, a small drive or no warranty. See where it sits in the range in our <a href="/dell-latitude-series-explained-3000-5000-7000/">Latitude 3000, 5000 and 7000 series</a> guide.</p>' % (model, year, cpu)},
      {'eyebrow': '// WHO IT&rsquo;S FOR', 'h2': 'Who it suits', 'html': '<ul><li>Home and hybrid workers living in Microsoft 365, a browser and video calls.</li><li>Small businesses kitting out staff without new-laptop prices.</li>' + extra_who +
       '</ul><p>Not for gaming, video editing or CAD: the built-in graphics aren&rsquo;t made for heavy 3D work. See <a href="/dell-precision-vs-latitude/">Precision vs Latitude</a>.</p>'},
      {'eyebrow': '// BEFORE YOU BUY', 'h2': 'What to check on a used Latitude %s' % model, 'html': '<ul>' + checks + '</ul>'},
      {'eyebrow': '// UPGRADES', 'h2': 'Memory and storage', 'html': upg},
      {'eyebrow': '// THE SAFER BUY', 'h2': 'The safer option: a tested refurbished Latitude', 'html': price_line + _REFURB},
     ],
     'howToName': 'How to buy a used Dell Latitude %s safely' % model,
     'howToSteps': [
      {'name': 'Check the battery', 'text': 'Ask for the battery health, or run Windows\' battery report (powercfg /batteryreport) and compare full charge capacity with design capacity.'},
      {'name': 'Check the drive', 'text': 'Make sure the SSD is a sensible size, ideally 256GB or more, and healthy.'},
      {'name': 'Check the exact specification', 'text': 'Confirm the processor and memory on the listing match the machine, in Windows Settings, System, About.'},
      {'name': 'Check for a business lock', 'text': 'Make sure there is no BIOS password or company management lock from a former owner.'},
      {'name': 'Insist on a warranty', 'text': 'Buy from a seller who tests and guarantees the machine.'},
     ],
     'faqs': [
      {'q': 'Is the Dell Latitude %s still worth buying in 2026?' % model, 'a': '<p>Yes, at the right price and in good condition. It&rsquo;s a %s 14-inch business laptop on %s that runs Windows 11. Judge it on the battery, drive and warranty.</p>' % (year, cpu)},
      {'q': 'Can the Dell Latitude %s run Windows 11?' % model, 'a': '<p>Yes. Its processor is on Microsoft&rsquo;s Windows 11 supported list, and business Latitudes have the TPM security chip Windows 11 needs.</p>'},
      {'q': 'How much should I pay for a Latitude %s?' % model, 'a': faq_price},
      {'q': 'What should I check before buying a used Latitude %s?' % model, 'a': '<p>The battery health, the drive size and health, that the processor and memory match the listing, and that there&rsquo;s no BIOS or company lock. In Bournemouth or Poole we&rsquo;re happy to look one over.</p>'},
     ],
     'crossLinksHtml': '<p>More Dell Latitude buying help: ' + cross + ', <a href="/are-dell-latitude-laptops-good/">are Dell Latitude laptops good?</a>, <a href="/how-long-do-dell-latitude-laptops-last/">how long they last</a> and <a href="/how-to-check-laptop-battery-health/">how to check a laptop&rsquo;s battery health</a>.</p>',
    }


_CHK = ('<li><strong>The battery.</strong> Run Windows&rsquo; battery report and compare full charge capacity with design capacity: '
        '<a href="/how-to-check-laptop-battery-health/">how to check laptop battery health</a>.</li>'
        '<li><strong>The drive.</strong> Ideally 256GB or more, and healthy.</li>'
        '<li><strong>No warranty on a private sale.</strong> If it dies in a fortnight, it&rsquo;s your problem.</li>'
        '<li><strong>A former company&rsquo;s lock.</strong> Check there&rsquo;s no BIOS password or management lock left on it.</li>')

NEW_PAGES.append(_model('dell-latitude-5420-worth-it-2026', '5420', '2021', '11th-generation Intel Core',
    '<li>Anyone replacing an older Windows 10 laptop who wants Windows 11 without buying new.</li>',
    _CHK + '<li><strong>5420 or 5430?</strong> The 5430 is the 2022 update with a newer processor; see <a href="/dell-latitude-5420-vs-5430-which-to-buy/">5420 vs 5430</a>.</li>',
    '<p>Like the rest of the Latitude 5000 range, the 5420 is easy to keep going: a faster or bigger SSD is the single best upgrade. More in our <a href="/dell-latitude-5000-guide/">Latitude 5000 series guide</a>.</p>',
    '<p>Our tested, refurbished Latitude 5000-series laptops start from <strong>&pound;535</strong>, with a new 1TB Samsung 990 PRO SSD, setup and data transfer.</p>',
    '<p>It depends on condition, drive and warranty. Our tested refurbished Latitude 5000-series laptops start from &pound;535 with a new SSD, setup and a guarantee.</p>',
    '<a href="/dell-latitude-5420-vs-5430-which-to-buy/">Latitude 5420 vs 5430</a>, <a href="/dell-latitude-5440-worth-it-2026/">the newer 5440</a>, <a href="/dell-latitude-5410-worth-it-2026/">the older 5410</a>'))

NEW_PAGES.append(_model('dell-latitude-7420-worth-it-2026', '7420', '2021', '11th-generation Intel Core',
    '<li>People who carry a laptop every day and want the lighter, better-finished 7000 range.</li>',
    _CHK + '<li><strong>The memory, above all.</strong> The 7420&rsquo;s memory is soldered to the board, so the amount it has (8, 16 or 32GB) is what it keeps forever. Buy 16GB or more.</li>',
    '<p>The memory can&rsquo;t be upgraded: it&rsquo;s soldered on. The SSD can (an M.2 2280 drive), so a small drive isn&rsquo;t a deal-breaker. More in our <a href="/dell-latitude-7000-guide/">Latitude 7000 series guide</a>.</p>',
    '<p>Our tested, refurbished Latitude 7000-series laptops start from <strong>&pound;520</strong>, with a new 1TB Samsung 990 PRO SSD, setup and data transfer.</p>',
    '<p>It depends on condition, memory and warranty: never pay extra for a low-memory 7420, because the memory can&rsquo;t be added later. Our tested refurbished Latitude 7000-series laptops start from &pound;520.</p>',
    '<a href="/dell-latitude-7000-guide/">Latitude 7000 series guide</a>, <a href="/dell-latitude-5420-worth-it-2026/">the Latitude 5420</a>'))

NEW_PAGES.append(_model('dell-latitude-5440-worth-it-2026', '5440', '2023', '13th-generation Intel Core in most versions',
    '<li>Anyone who wants a newer Latitude with years of Windows 11 ahead of it.</li>',
    _CHK + '<li><strong>The exact processor.</strong> Most 5440s have a 13th-generation Intel Core chip, but some were built with 12th-generation chips; check Settings, System, About.</li>',
    '<p>The 5440&rsquo;s memory sits in slots in common versions, so it can usually be upgraded (DDR4 or DDR5 depending on the processor), and the SSD can be swapped too. More in our <a href="/dell-latitude-5000-guide/">Latitude 5000 series guide</a>.</p>',
    '<p>Our tested, refurbished Latitude 5000-series laptops start from <strong>&pound;535</strong>; a 5440, being newer, costs more, so ask us for today&rsquo;s price.</p>',
    '<p>As a newer model it costs more than a 5420. Our tested refurbished Latitude 5000-series laptops start from &pound;535; ring us for today&rsquo;s price on a 5440.</p>',
    '<a href="/dell-latitude-5420-worth-it-2026/">the Latitude 5420</a>, <a href="/dell-latitude-5420-vs-5430-which-to-buy/">5420 vs 5430</a>, <a href="/dell-latitude-5000-guide/">Latitude 5000 series guide</a>'))
