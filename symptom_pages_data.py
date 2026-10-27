# -*- coding: utf-8 -*-
"""Everyday PC symptom pages (12 Oct 2026; owner: "go ahead with printer offline, touchpad and rotate screen").

Round-2 research (D:/claude/seo-research/pages-to-build-round2-2026-10-12.md), Bing, 3 months: "printer offline" 8,400
(UK 458), "printer says offline" 727; "touchpad not working" 9,000 (UK 824), "mouse pointer disappeared" 356; "how to rotate
screen" 6,100 (UK 637). None of the three had a page (checked against the sitemap first).

Steps checked against Microsoft Support on 12 Oct 2026:
  - Troubleshooting offline printer problems in Windows: the Get Help printer troubleshooter; Settings > Bluetooth & devices >
    Printers & scanners > the printer > Open print queue > Printer menu: untick Use Printer Offline and Pause Printing, Cancel
    all; restart the Print Spooler service.
  - Fix touchpad problems in Windows: Settings > Bluetooth & devices > Touchpad (on / off); update or reinstall the driver
    (Windows Update incl. optional updates; Device Manager > Human Interface Devices / Mice and other pointing devices).
  - Change your screen resolution and layout: Settings > System > Display > Display orientation (Orientation on Windows 10);
    Windows + O locks the orientation on devices that rotate.
Said with care, because they vary by maker: the touchpad key (Fn + an F key with a touchpad picture), HP's double-tap corner,
and Ctrl + Alt + arrow (an Intel graphics shortcut, switched off on many newer PCs).
"""

_CALL = ('<p>Still not right? Ring <strong>01202 775566</strong> or text 07520 615332, Monday to Friday, 9 to 5. With your '
         'permission we connect to your Windows PC and sort it while you watch: usually the same day, remote help from &pound;20, '
         'and no fix, no fee.{extra}</p>')

# ============================================================ 1. Printer offline
PRINTER = {
    'slug': 'printer-offline',
    'title': 'Printer Offline? How to Get It Printing Again (Windows)',
    'metaDesc': 'Printer says offline on your Windows PC? Restart it, clear Use Printer Offline and stuck documents, restart the print service, then fix the Wi-Fi.',
    'ogTitle': 'Printer offline? How to get it printing again',
    'crumbName': 'Printer Offline',
    'eyebrow': '// PRINTER SAYS OFFLINE?',
    'h1': 'Printer <em class="grad grad--cyan">offline</em>? Get it printing again',
    'lede': 'The printer is switched on, but Windows says it&rsquo;s offline and nothing prints. Usually it has lost touch with the PC over Wi-Fi, a setting has switched it to offline, or a stuck document is blocking the queue. Here&rsquo;s how to get it printing again, quickest fixes first.',
    'chips': ['Quickest fixes first', 'Windows 11 and 10', 'Any make of printer'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Start with the quick fixes', '#s1'],
    'ctaHead': 'Still offline?',
    'ctaSub': 'With your permission we connect to your Windows PC, get the printer back online and print a test page while you watch. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('First', 'Switch the printer off and on, and restart the computer (Restart, not Shut down).'),
        ('The offline switch', 'In the print queue&rsquo;s Printer menu, untick Use Printer Offline and Pause Printing.'),
        ('Stuck documents', 'Cancel everything in the queue; one stuck job can hold up the rest.'),
        ('The print service', 'Restart the Print Spooler in Services.'),
        ('Wi-Fi printers', 'Check the printer is on your Wi-Fi; if the router changed, set the printer up again.'),
        ('Still offline', 'Remove the printer in Settings and add it again.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; QUICK FIXES', 'h2': 'Try these first',
         'html': '<ol>'
                 '<li><strong>Switch the printer off and on again,</strong> wait until it&rsquo;s fully ready, then try printing.</li>'
                 '<li><strong>Restart the computer.</strong> Use Restart, not Shut down, so Windows starts afresh.</li>'
                 '<li><strong>Run Windows&rsquo; printer troubleshooter:</strong> Settings, System, Troubleshoot, Other troubleshooters, Printer. It checks the usual causes and fixes many by itself.</li>'
                 '<li><strong>Check the cable or Wi-Fi:</strong> a USB printer needs its cable firmly in at both ends; a Wi-Fi printer usually shows a Wi-Fi light or a symbol on its screen when it&rsquo;s connected.</li>'
                 '</ol>'},
        {'eyebrow': '/02 &mdash; WINDOWS&rsquo; OFFLINE SETTING', 'h2': 'Switch off &ldquo;Use Printer Offline&rdquo; and clear the queue',
         'html': '<ol>'
                 '<li>Open <strong>Settings</strong>, then <strong>Bluetooth &amp; devices</strong>, then <strong>Printers &amp; scanners</strong>, and click your printer.</li>'
                 '<li>Choose <strong>Open print queue</strong>.</li>'
                 '<li>In the queue window&rsquo;s <strong>Printer</strong> menu, untick <strong>Use Printer Offline</strong> and <strong>Pause Printing</strong> if either is ticked.</li>'
                 '<li><strong>Cancel any documents waiting</strong> (the &hellip; menu, then Cancel all). One stuck document can block everything behind it; <a href="/documents-stuck-in-print-queue/">documents stuck in the print queue</a> has more.</li>'
                 '<li><strong>Make it the default printer</strong> in the same menu, so Windows doesn&rsquo;t send your printing to the wrong one.</li>'
                 '</ol>'},
        {'eyebrow': '/03 &mdash; THE PRINT SERVICE', 'h2': 'Restart Windows&rsquo; printing service',
         'html': '<p>Windows prints through a background service called the <strong>Print Spooler</strong>. If it has stopped or jammed, every printer shows as offline.</p>'
                 '<ol>'
                 '<li>Click Start, type <strong>services</strong> and open <strong>Services</strong>.</li>'
                 '<li>Find <strong>Print Spooler</strong> in the list, right-click it and choose <strong>Restart</strong> (or <strong>Start</strong> if it isn&rsquo;t running).</li>'
                 '<li>Try printing again.</li>'
                 '</ol>'},
        {'eyebrow': '/04 &mdash; WI-FI PRINTERS', 'h2': 'Wi-Fi printer offline? Check it&rsquo;s on your network',
         'html': '<ul>'
                 '<li><strong>Print the printer&rsquo;s own network report</strong> (usually from its settings menu or a button combination in its manual): it shows the Wi-Fi name it&rsquo;s connected to. If it&rsquo;s not your network, or says not connected, run the printer&rsquo;s wireless set-up again.</li>'
                 '<li><strong>New router, new broadband or a changed Wi-Fi password?</strong> The printer is still looking for the old one: see <a href="/printer-wont-connect-after-changing-broadband/">printer won&rsquo;t connect after changing broadband</a> and <a href="/printer-stopped-working-after-changing-wifi-password/">printer stopped after changing the Wi-Fi password</a>. Don&rsquo;t know the Wi-Fi password? <a href="/how-to-find-your-wifi-password/">Your PC can show it</a>.</li>'
                 '<li><strong>It drops off every few days?</strong> The router may be giving it a new address. See <a href="/why-does-my-printer-keep-disconnecting/">why does my printer keep disconnecting</a>.</li>'
                 '<li><strong>Printer asleep?</strong> Some printers go so deeply to sleep that Windows can&rsquo;t see them. Press a button on the printer to wake it, then try again.</li>'
                 '</ul>'},
        {'eyebrow': '/05 &mdash; START AFRESH', 'h2': 'Still offline? Remove it and add it again',
         'html': '<ol>'
                 '<li>Settings, Bluetooth &amp; devices, Printers &amp; scanners: click the printer and choose <strong>Remove</strong>.</li>'
                 '<li>Restart the computer.</li>'
                 '<li>Back in Printers &amp; scanners, choose <strong>Add device</strong> and pick the printer when it appears. If it doesn&rsquo;t, use the printer maker&rsquo;s own set-up software from their website.</li>'
                 '<li>Print a test page from the printer&rsquo;s settings in Windows.</li>'
                 '</ol>'
                 '<p>Printer vanished from the list after a Windows update? See <a href="/printer-disappeared-after-windows-update/">printer disappeared after a Windows update</a>.</p>'},
        {'eyebrow': '/06 &mdash; THE QUICK WAY', 'h2': 'Let our free app check the printers', 'html': '__APP_BOX_PRINTER__'},
        {'eyebrow': '/07 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _CALL.format(extra=' We can also come out locally, priced before we come, if the printer itself needs setting up again.')},
    ],
    'howToName': 'How to fix a printer that says offline in Windows',
    'howToSteps': [
        {'name': 'Restart the printer and the PC', 'text': 'Switch the printer off and on, then restart the computer (Restart, not Shut down).'},
        {'name': 'Run the printer troubleshooter', 'text': 'Settings, System, Troubleshoot, Other troubleshooters, Printer.'},
        {'name': 'Untick Use Printer Offline', 'text': 'Settings, Bluetooth & devices, Printers & scanners, the printer, Open print queue: in the Printer menu untick Use Printer Offline and Pause Printing, and cancel stuck documents.'},
        {'name': 'Restart the Print Spooler', 'text': 'Open Services, right-click Print Spooler and choose Restart.'},
        {'name': 'Check the Wi-Fi', 'text': 'Print the printer\u2019s network report and make sure it is on your Wi-Fi; run its wireless set-up again if not.'},
        {'name': 'Remove and add it again', 'text': 'Remove the printer in Printers & scanners, restart, then Add device.'},
    ],
    'faqs': [
        {'q': 'Why does my printer say offline when it&rsquo;s switched on?', 'a': '<p>Usually Windows has lost touch with it over Wi-Fi, Use Printer Offline has been ticked in the print queue, a stuck document is blocking the queue, or Windows&rsquo; Print Spooler service has stopped.</p>'},
        {'q': 'How do I change my printer from offline to online?', 'a': '<p>Open the print queue (Settings, Bluetooth &amp; devices, Printers &amp; scanners, your printer, Open print queue) and untick Use Printer Offline in the Printer menu. If it still says offline, restart the printer and the PC.</p>'},
        {'q': 'Why does my Wi-Fi printer keep going offline?', 'a': '<p>Often the router gives it a new address, or it sleeps too deeply. Setting a fixed address for the printer in the router usually stops it. See <a href="/why-does-my-printer-keep-disconnecting/">why does my printer keep disconnecting</a>.</p>'},
        {'q': 'Will reinstalling the printer lose anything?', 'a': '<p>No. Removing and adding the printer again only resets Windows&rsquo; link to it. Your documents are untouched.</p>'},
        {'q': 'Can you fix it remotely?', 'a': '<p>Usually, yes: with your permission we connect to your Windows PC and get the printer back online while you watch. If the printer itself needs setting up again, we can come out locally, priced before we come.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/documents-stuck-in-print-queue/">documents stuck in the print queue</a>, <a href="/why-does-my-printer-keep-disconnecting/">printer keeps disconnecting</a>, <a href="/printer-disappeared-after-windows-update/">printer disappeared after an update</a> and <a href="/printer-support/">printer help</a>.</p>',
}

# ============================================================ 2. Laptop touchpad not working
TOUCHPAD = {
    'slug': 'laptop-touchpad-not-working',
    'title': 'Laptop Touchpad Not Working? How to Fix It in Windows',
    'metaDesc': 'Laptop touchpad stopped working, or the pointer has vanished? It may just be switched off. The quick checks, the settings and the driver fixes, in order.',
    'ogTitle': 'Laptop touchpad not working? How to fix it',
    'crumbName': 'Laptop Touchpad Not Working',
    'eyebrow': '// TOUCHPAD STOPPED WORKING?',
    'h1': 'Laptop <em class="grad grad--cyan">touchpad</em> not working?',
    'lede': 'The pointer won&rsquo;t move, has disappeared, or the touchpad ignores taps. Most often it has simply been switched off, by a key, a setting or a mouse being plugged in. Here&rsquo;s how to get it back, quickest checks first, with a mouse or the keyboard if the touchpad is dead.',
    'chips': ['Often just switched off', 'Windows 11 and 10', 'No mouse needed'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Start with the quick checks', '#s1'],
    'ctaHead': 'Touchpad still not working?',
    'ctaSub': 'We sort settings and drivers remotely while you watch, and replace faulty touchpads, with the price agreed first. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Switched off by a key', 'Look for a key with a touchpad picture (often with Fn) and press it once.'),
        ('Switched off in Settings', 'Settings, Bluetooth &amp; devices, Touchpad: turn it on.'),
        ('A mouse plugged in', 'Some laptops turn the touchpad off when a mouse is connected; there&rsquo;s a setting to keep it on.'),
        ('Pointer vanished', 'Press Ctrl to find it, or plug in any USB mouse.'),
        ('Driver', 'Reinstall it from Device Manager, or install optional updates in Windows Update.'),
        ('Raised or bulging touchpad', 'Stop using the laptop and unplug it: a swollen battery can push the touchpad up.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; QUICK CHECKS', 'h2': 'Check it isn&rsquo;t just switched off',
         'html': '<ol>'
                 '<li><strong>The touchpad key:</strong> many laptops have a key with a touchpad picture, often one of the F keys used with <em>Fn</em>. Press it once and try the touchpad.</li>'
                 '<li><strong>A light in the corner:</strong> on some laptops, double-tapping the top-left corner of the touchpad switches it on and off, and a tiny light shows when it&rsquo;s off.</li>'
                 '<li><strong>Restart the laptop.</strong> Use Restart, not Shut down. A touchpad that stopped after the laptop woke from sleep often comes back.</li>'
                 '<li><strong>Clean, dry fingers and a clean touchpad.</strong> Damp fingers, hand cream or a dirty pad can make it jump or ignore you.</li>'
                 '</ol>'},
        {'eyebrow': '/02 &mdash; NO POINTER?', 'h2': 'No pointer? Get around without one',
         'html': '<ul>'
                 '<li><strong>Plug in any USB mouse</strong> while you try the fixes: almost every mouse works straight away.</li>'
                 '<li><strong>Or use the keyboard:</strong> press <em>Windows</em> + <em>I</em> to open Settings, type <strong>touchpad</strong> in its search box and press <em>Enter</em>. <em>Tab</em> moves between options and <em>Space</em> switches them on or off.</li>'
                 '<li><strong>Pointer there but you can&rsquo;t see it?</strong> Make it bigger (Settings, Accessibility, Mouse pointer and touch), or switch on <strong>Show location of pointer when I press the CTRL key</strong> in Settings, Bluetooth &amp; devices, Mouse, Additional mouse settings, Pointer Options.</li>'
                 '</ul>'},
        {'eyebrow': '/03 &mdash; THE SETTINGS', 'h2': 'Turn the touchpad on in Settings',
         'html': '<ol>'
                 '<li>Open <strong>Settings</strong>, then <strong>Bluetooth &amp; devices</strong>, then <strong>Touchpad</strong>.</li>'
                 '<li>Make sure the <strong>Touchpad</strong> switch is on.</li>'
                 '<li>Open the Touchpad options and tick <strong>Leave touchpad on when a mouse is connected</strong>, if you want both to work.</li>'
                 '<li>Check <strong>Taps</strong>: if tapping does nothing but clicking works, &ldquo;Tap with a single finger to single-click&rdquo; may be switched off.</li>'
                 '</ol>'
                 '<p>On Windows 10 it&rsquo;s Settings, Devices, Touchpad. Some laptops also have the maker&rsquo;s own touchpad settings, which can override Windows&rsquo;.</p>'},
        {'eyebrow': '/04 &mdash; THE DRIVER', 'h2': 'Update or reinstall the touchpad driver',
         'html': '<ol>'
                 '<li><strong>Install updates:</strong> Settings, Windows Update, Check for updates, then Advanced options, <strong>Optional updates</strong>, and install any touchpad or &ldquo;HID&rdquo; driver offered.</li>'
                 '<li><strong>Reinstall it:</strong> right-click Start, choose Device Manager, open <strong>Human Interface Devices</strong> or <strong>Mice and other pointing devices</strong>, right-click the touchpad (often called I2C HID Device, Precision Touchpad, Synaptics or ELAN), choose <strong>Uninstall device</strong>, then restart. Windows puts it back by itself.</li>'
                 '<li><strong>The laptop maker&rsquo;s driver:</strong> Dell, HP, Lenovo and the others have driver downloads for each model on their support websites.</li>'
                 '</ol>'},
        {'eyebrow': '/05 &mdash; WHEN IT&rsquo;S THE HARDWARE', 'h2': 'When it&rsquo;s the touchpad itself',
         'html': '<ul>'
                 '<li><strong>The touchpad is raised, won&rsquo;t click, or the case bulges:</strong> stop using the laptop and unplug it. A swollen battery can push the touchpad up from underneath, and it needs replacing safely: see <a href="/dell-xps-swollen-battery/">swollen laptop battery</a>.</li>'
                 '<li><strong>Something was spilled on it,</strong> or it works only in one area: the touchpad or its cable may be damaged.</li>'
                 '<li><strong>A USB mouse works but the touchpad never does,</strong> even after the driver fixes: the touchpad needs repairing. We can replace it, with the price agreed first.</li>'
                 '</ul>'
                 '<p>Want to check the mouse buttons and keys too? Our free <a href="/keyboard-test/">keyboard and mouse test</a> lights up every key and button that works.</p>'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _CALL.format(extra=' If the touchpad itself is faulty, we collect the laptop free across Bournemouth, Christchurch, Poole and Dorset, tell you the price before any work, repair it and bring it back.')},
    ],
    'howToName': 'How to fix a laptop touchpad that is not working',
    'howToSteps': [
        {'name': 'Press the touchpad key', 'text': 'Look for a key with a touchpad picture, often with Fn, and press it once.'},
        {'name': 'Restart the laptop', 'text': 'Use Restart, not Shut down.'},
        {'name': 'Turn it on in Settings', 'text': 'Settings, Bluetooth & devices, Touchpad: switch it on, and tick Leave touchpad on when a mouse is connected.'},
        {'name': 'Install optional updates', 'text': 'Settings, Windows Update, Advanced options, Optional updates: install any touchpad driver offered.'},
        {'name': 'Reinstall the driver', 'text': 'Device Manager, Human Interface Devices or Mice and other pointing devices: uninstall the touchpad and restart.'},
        {'name': 'Check for hardware faults', 'text': 'A raised touchpad or bulging case can mean a swollen battery: stop using the laptop and get it checked.'},
    ],
    'faqs': [
        {'q': 'Why has my laptop touchpad stopped working?', 'a': '<p>Usually it has been switched off with a key, in Settings, or by plugging in a mouse. A restart or a driver reinstall fixes most of the rest. If none of that works, the touchpad may be faulty.</p>'},
        {'q': 'How do I turn the touchpad back on without a mouse?', 'a': '<p>Press the touchpad key if your laptop has one. Or press Windows and I together, type touchpad, press Enter, then use Tab to reach the switch and Space to turn it on.</p>'},
        {'q': 'Why does the touchpad stop when I plug in a mouse?', 'a': '<p>Some laptops switch it off automatically. Tick Leave touchpad on when a mouse is connected in Settings, Bluetooth &amp; devices, Touchpad.</p>'},
        {'q': 'My mouse pointer has disappeared. What do I do?', 'a': '<p>Press the touchpad key or plug in a USB mouse to see if the pointer comes back. If it&rsquo;s there but hard to see, make it bigger in Settings, Accessibility, Mouse pointer and touch.</p>'},
        {'q': 'Is a raised touchpad dangerous?', 'a': '<p>It can be: a swollen battery can push the touchpad up. Stop using the laptop, unplug it, and have the battery replaced safely.</p>'},
        {'q': 'Can you fix a touchpad?', 'a': '<p>Yes. We sort settings and drivers remotely, and if the touchpad is faulty we collect the laptop locally, tell you the price before any work, and repair it.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/keyboard-test/">keyboard and mouse test</a>, <a href="/how-to-turn-off-sticky-keys/">how to turn off Sticky Keys</a>, <a href="/dell-xps-swollen-battery/">swollen laptop battery</a> and <a href="/laptop-repair/">laptop repair</a>.</p>',
}

# ============================================================ 3. Screen upside down or sideways
ROTATE = {
    'slug': 'screen-upside-down-or-sideways',
    'title': 'Screen Upside Down or Sideways? How to Rotate It Back',
    'metaDesc': 'Windows screen turned upside down or sideways? Put it back in seconds with Display orientation, or the shortcut some PCs have, and stop it happening again.',
    'ogTitle': 'Screen upside down or sideways? How to rotate it back',
    'crumbName': 'Screen Upside Down or Sideways',
    'eyebrow': '// SCREEN GONE THE WRONG WAY ROUND?',
    'h1': 'Screen <em class="grad grad--cyan">upside down</em> or sideways?',
    'lede': 'Everything on the screen has turned upside down or on its side, and the mouse goes the wrong way. It&rsquo;s almost always a shortcut pressed by accident or a setting, and it takes seconds to put back. Here&rsquo;s how, on Windows 11 and 10.',
    'chips': ['Takes seconds', 'Windows 11 and 10', 'Nothing is broken'],
    'primaryCta': ['Rotate it back', '#s1'], 'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
    'ctaHead': 'Still the wrong way round?',
    'ctaSub': 'With your permission we connect to your Windows PC and put the screen right while you watch. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('The setting', 'Settings, System, Display, Display orientation: choose Landscape.'),
        ('The quick shortcut', 'On some PCs, Ctrl + Alt + the Up arrow puts the screen back.'),
        ('Keep it', 'Windows asks if you want to keep the change: choose Keep changes, or it goes back after a few seconds.'),
        ('Two screens?', 'Click the screen that&rsquo;s wrong in Display settings before changing it.'),
        ('Tablet or 2-in-1', 'It may be turning itself: Windows + O, or Rotation lock in Quick Settings, stops that.'),
        ('Nothing is broken', 'It&rsquo;s only a setting. Your files and programs are fine.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; PUT IT BACK', 'h2': 'Rotate the screen back',
         'html': '<ol>'
                 '<li><strong>The quick try:</strong> hold <em>Ctrl</em> and <em>Alt</em> and press the <em>Up arrow</em>. On some PCs (with Intel graphics) this rotates the screen straight back. If nothing happens, your PC doesn&rsquo;t use that shortcut; use the next step.</li>'
                 '<li><strong>The setting:</strong> right-click an empty part of the desktop and choose <strong>Display settings</strong> (or Start, Settings, System, Display).</li>'
                 '<li>Under <strong>Scale &amp; layout</strong>, set <strong>Display orientation</strong> to <strong>Landscape</strong>. On Windows 10 it&rsquo;s called <strong>Orientation</strong>.</li>'
                 '<li>Windows asks whether to keep the change: choose <strong>Keep changes</strong>. If you do nothing, it goes back after a few seconds, which is a handy safety net.</li>'
                 '</ol>'
                 '<p><strong>The mouse goes the wrong way</strong> while the screen is upside down, which makes clicking awkward. Move it slowly, or use the keyboard: press <em>Windows</em> + <em>I</em> for Settings, type <strong>orientation</strong> in the search box and press <em>Enter</em>.</p>'},
        {'eyebrow': '/02 &mdash; MORE THAN ONE SCREEN', 'h2': 'Two screens? Pick the right one',
         'html': '<p>In Display settings, each screen is shown as a numbered box. Click <strong>Identify</strong> to see which number is which, click the screen that&rsquo;s the wrong way round, then change its Display orientation. If you turned a monitor on its side on purpose, choose <strong>Portrait</strong> for that one instead.</p>'},
        {'eyebrow': '/03 &mdash; STOP IT HAPPENING AGAIN', 'h2': 'Stop it happening again',
         'html': '<ul>'
                 '<li><strong>Tablets and 2-in-1 laptops</strong> turn the screen when you turn the device. Press <em>Windows</em> + <em>O</em>, or open Quick Settings (<em>Windows</em> + <em>A</em>) and switch on <strong>Rotation lock</strong>, to stop that.</li>'
                 '<li><strong>The Ctrl + Alt + arrow shortcut</strong> is easy to press by accident on PCs that have it. You can switch it off in the graphics settings program from Intel (Intel Graphics Command Center), if your PC has one.</li>'
                 '<li><strong>Keeps happening by itself?</strong> Update the graphics driver: Settings, Windows Update, Check for updates, then Optional updates, or from the PC maker&rsquo;s support website.</li>'
                 '</ul>'
                 '<p>Other things that switch on by accident, from zoomed-in screens to Sticky Keys, are on <a href="/how-to-turn-off-sticky-keys/">how to turn off Sticky Keys</a> and in our <a href="/windows-accessibility-features-guide/">accessibility guide</a>.</p>'},
        {'eyebrow': '/04 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL.format(extra='')},
    ],
    'howToName': 'How to rotate a Windows screen back the right way up',
    'howToSteps': [
        {'name': 'Try the shortcut', 'text': 'Hold Ctrl and Alt and press the Up arrow. It works on some PCs with Intel graphics.'},
        {'name': 'Open Display settings', 'text': 'Right-click the desktop and choose Display settings, or Start, Settings, System, Display.'},
        {'name': 'Choose Landscape', 'text': 'Under Scale & layout, set Display orientation to Landscape (Orientation on Windows 10).'},
        {'name': 'Keep the change', 'text': 'Choose Keep changes when Windows asks.'},
        {'name': 'Lock the rotation', 'text': 'On a tablet or 2-in-1, press Windows and O, or switch on Rotation lock in Quick Settings.'},
    ],
    'faqs': [
        {'q': 'Why did my screen turn upside down?', 'a': '<p>Usually a keyboard shortcut pressed by accident (Ctrl, Alt and an arrow key on PCs that have it), a change in Display settings, or a tablet or 2-in-1 rotating itself.</p>'},
        {'q': 'How do I rotate my screen back to normal?', 'a': '<p>Open Display settings (right-click the desktop), and set Display orientation to Landscape. On some PCs, Ctrl, Alt and the Up arrow does it in one go.</p>'},
        {'q': 'Why doesn&rsquo;t Ctrl + Alt + arrow work on my PC?', 'a': '<p>It&rsquo;s a shortcut from Intel&rsquo;s graphics software, and many newer PCs have it switched off or don&rsquo;t have it. Use Display orientation in Display settings instead.</p>'},
        {'q': 'How do I stop my laptop screen rotating by itself?', 'a': '<p>On a tablet or 2-in-1, press Windows and O, or switch on Rotation lock in Quick Settings (Windows and A).</p>'},
        {'q': 'Has anything been damaged?', 'a': '<p>No. It&rsquo;s only a display setting. Your files, programs and screen are fine.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/how-to-turn-off-sticky-keys/">how to turn off Sticky Keys</a>, <a href="/windows-accessibility-features-guide/">Windows accessibility features</a>, <a href="/monitor-stuck-at-60hz/">monitor stuck at 60Hz</a> and <a href="/dead-pixel-test/">dead pixel test</a>.</p>',
}


# ============================================================ 4. Laptop plugged in but not charging (12 Oct 2026, round 2)
# Bing: "laptop not charging" 1,100 a quarter, UK 229 (about a fifth). Microsoft Support, read 12 Oct 2026: "Use Smart charging
# in Windows" (a heart on the battery icon, "Fully Smart charged": charging paused below 100% on purpose; some makers switch it
# on; the steps to change it vary by maker) and "PC is charging slowly or discharging while it's plugged in" (the maker's own
# charger, the charging port, a cable / charger with enough power - "USB-C can support up to 5V, 3A, 15W" is not enough for a
# laptop that needs more; power-hungry accessories; charge while asleep or off). Reinstalling the battery driver from Device
# Manager is Microsoft's documented fix on Surface; on other laptops it is a common fix, said as such.
CHARGING = {
    'slug': 'laptop-plugged-in-not-charging',
    'title': 'Laptop Plugged In But Not Charging? What to Check',
    'metaDesc': 'Laptop says plugged in, not charging? It may be protecting the battery on purpose. The settings, charger and battery checks, and when to replace it.',
    'ogTitle': 'Laptop plugged in but not charging? What to check',
    'crumbName': 'Laptop Plugged In But Not Charging',
    'eyebrow': '// PLUGGED IN, NOT CHARGING?',
    'h1': 'Laptop plugged in but <em class="grad grad--cyan">not charging</em>?',
    'lede': 'The charger is in, but the battery says &ldquo;plugged in, not charging&rdquo;, charges slowly, or won&rsquo;t go past a certain percentage. Often the laptop is protecting the battery on purpose. Here&rsquo;s how to tell, and what to check next, before you buy a new battery or charger.',
    'chips': ['Often on purpose', 'Windows 11 and 10', 'Battery replacements, price first'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Is it on purpose?', '#s1'],
    'ctaHead': 'Still not charging?',
    'ctaSub': 'We check the settings remotely, and replace worn batteries and charging sockets with the price agreed first. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('A heart on the battery icon', 'Windows&rsquo; Smart charging is holding the battery below 100% on purpose, to make it last longer.'),
        ('Stops at 50 to 80%', 'A battery-care setting from the laptop maker is probably switched on.'),
        ('&ldquo;Charging slowly&rdquo;', 'The charger or cable isn&rsquo;t powerful enough, or isn&rsquo;t the laptop&rsquo;s own.'),
        ('Nothing at all', 'Try another wall socket, check the cable, and look for a loose or damaged plug.'),
        ('Worn-out battery', 'Windows&rsquo; battery report shows how much charge it still holds.'),
        ('Bulging case or raised touchpad', 'Stop using it and unplug it: a swollen battery needs replacing safely.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; IS IT ON PURPOSE?', 'h2': 'Check it isn&rsquo;t protecting the battery on purpose',
         'html': '<ul>'
                 '<li><strong>A heart on the battery icon:</strong> hover over the battery in the taskbar. If it shows a heart and says <strong>Fully Smart charged</strong>, Windows&rsquo; Smart charging has paused charging below 100% on purpose, to slow battery wear (<a href="https://support.microsoft.com/en-us/windows/experience/power-battery/use-smart-charging-in-windows" rel="noopener" target="_blank">Microsoft</a>). Nothing is wrong.</li>'
                 '<li><strong>It always stops at the same level,</strong> such as 50, 60 or 80%: most laptop makers have a battery-care setting that does this, in their own app or in the laptop&rsquo;s setup screen. Dell, HP, Lenovo and ASUS all have one.</li>'
                 '</ul>'
                 '<p>If the laptop mostly stays plugged in, leave it on: the battery will last longer. Switch it off in the maker&rsquo;s app before a trip, when you want a full charge.</p>'},
        {'eyebrow': '/02 &mdash; THE CHARGER', 'h2': 'Check the charger, cable and socket',
         'html': '<ol>'
                 '<li><strong>Use the laptop&rsquo;s own charger.</strong> If Windows says the PC is charging slowly, the charger or cable can&rsquo;t supply enough power: a phone charger, even a USB-C one, usually can&rsquo;t charge a laptop.</li>'
                 '<li><strong>The right socket:</strong> on laptops with several USB-C sockets, only some charge. Look for a charging symbol beside it.</li>'
                 '<li><strong>Look at the charger&rsquo;s light</strong> (if it has one), try another wall socket, and check the cable for kinks, splits or a scorched plug. Stop using a damaged charger.</li>'
                 '<li><strong>A loose plug:</strong> if it only charges when you hold the plug at an angle, the laptop&rsquo;s charging socket may be worn. That&rsquo;s a repair.</li>'
                 '<li><strong>Unplug power-hungry extras</strong> such as external drives, and let it charge while it&rsquo;s asleep or switched off.</li>'
                 '</ol>'},
        {'eyebrow': '/03 &mdash; RESET THE BATTERY READING', 'h2': 'Make Windows read the battery afresh',
         'html': '<ol>'
                 '<li><strong>Restart</strong> (Restart, not Shut down).</li>'
                 '<li><strong>A full power-off:</strong> shut down, unplug the charger, hold the power button for 15 seconds, then plug back in and start it.</li>'
                 '<li><strong>Reinstall the battery driver:</strong> with the charger plugged in, right-click Start, choose Device Manager, open <strong>Batteries</strong>, right-click <strong>Microsoft ACPI-Compliant Control Method Battery</strong>, choose <strong>Uninstall device</strong>, then restart. Windows puts it back by itself. Microsoft documents this fix for its own Surface laptops, and it often helps others.</li>'
                 '<li><strong>Update the laptop&rsquo;s firmware (BIOS)</strong> from the maker&rsquo;s support website or update app: charging is managed partly by the firmware.</li>'
                 '</ol>'},
        {'eyebrow': '/04 &mdash; IS THE BATTERY WORN OUT?', 'h2': 'Is the battery worn out?',
         'html': '<p>Batteries hold less charge as they age. Windows can tell you how much:</p>'
                 '<ol>'
                 '<li>Right-click Start and choose <strong>Terminal</strong> (Windows PowerShell on Windows 10).</li>'
                 '<li>Type <strong>powercfg /batteryreport</strong> and press <em>Enter</em>. It saves a report called <strong>battery-report.html</strong> in your user folder.</li>'
                 '<li>Open it and compare <strong>Design capacity</strong> with <strong>Full charge capacity</strong>. If the full charge is far below the design figure, the battery is worn and a new one will last much longer.</li>'
                 '</ol>'
                 '<p><strong>Bulging case, raised touchpad or a battery warning?</strong> Stop using the laptop and unplug it: see <a href="/dell-xps-swollen-battery/">swollen laptop battery</a>. Also see <a href="/laptop-shuts-down-at-30-percent-battery/">laptop shuts down at 30%</a> and <a href="/laptop-turns-off-when-unplugged/">laptop turns off when unplugged</a>.</p>'},
        {'eyebrow': '/05 &mdash; THE QUICK WAY', 'h2': 'Let our free app check the battery', 'html': '__APP_BOX_KEEP__'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _CALL.format(extra=' If the battery or charging socket is worn, we collect the laptop free across Bournemouth, Christchurch, Poole and Dorset, tell you the price before any work, replace it and bring it back. Dell laptop? See <a href="/dell-laptop-battery-replacement-dorset/">Dell battery replacement</a>.')},
    ],
    'howToName': 'How to fix a laptop that is plugged in but not charging',
    'howToSteps': [
        {'name': 'Check it is not on purpose', 'text': 'A heart on the battery icon (Fully Smart charged) or a fixed stopping point means a battery-care setting is on.'},
        {'name': 'Use the laptop’s own charger', 'text': 'Plug it into the charging socket, try another wall socket, and check the cable for damage.'},
        {'name': 'Do a full power-off', 'text': 'Shut down, unplug the charger, hold the power button for 15 seconds, then plug in and start.'},
        {'name': 'Reinstall the battery driver', 'text': 'Device Manager, Batteries, Microsoft ACPI-Compliant Control Method Battery: uninstall it and restart.'},
        {'name': 'Check the battery’s health', 'text': 'Run powercfg /batteryreport and compare Design capacity with Full charge capacity.'},
    ],
    'faqs': [
        {'q': 'Why does my laptop say plugged in, not charging?', 'a': '<p>Often it&rsquo;s on purpose: Windows&rsquo; Smart charging or the maker&rsquo;s battery-care setting stops charging early to make the battery last. Otherwise it&rsquo;s usually the charger, the socket or a worn battery.</p>'},
        {'q': 'Why does my laptop stop charging at 80%?', 'a': '<p>A battery-care setting is switched on, in the maker&rsquo;s app or the laptop&rsquo;s setup screen. Leave it on if the laptop mostly stays plugged in; switch it off when you need a full charge.</p>'},
        {'q': 'Can I charge my laptop with a phone charger?', 'a': '<p>Usually not: most phone chargers can&rsquo;t supply enough power, and Windows may say the PC is charging slowly. Use the laptop&rsquo;s own charger.</p>'},
        {'q': 'How do I check my laptop battery&rsquo;s health?', 'a': '<p>Run powercfg /batteryreport in Terminal and compare Design capacity with Full charge capacity in the report. Our free 365 PC Manager app shows the battery&rsquo;s wear on its This PC page.</p>'},
        {'q': 'Is it bad to leave a laptop plugged in all the time?', 'a': '<p>Laptops stop charging when the battery is full, and battery-care settings that stop at around 80% help it last longer if it&rsquo;s always plugged in.</p>'},
        {'q': 'Can you replace my laptop battery?', 'a': '<p>Yes. We collect the laptop locally, tell you the price before any work, fit the new battery and bring it back.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/how-to-make-your-laptop-battery-last-longer/">make your laptop battery last longer</a>, <a href="/laptop-shuts-down-at-30-percent-battery/">laptop shuts down at 30%</a>, <a href="/laptop-turns-off-when-unplugged/">laptop turns off when unplugged</a> and <a href="/dell-laptop-battery-replacement-dorset/">Dell battery replacement</a>.</p>',
}

# ============================================================ 5. Windows Update stuck (12 Oct 2026, round 2)
# Bing: "windows update stuck" 923 a quarter (UK 95). Microsoft Support, read 12 Oct 2026: "Fix issues by reinstalling the current
# version of Windows" - Settings > System > Recovery > Fix problems using Windows Update > Reinstall now; keeps apps, files and
# settings; needs Windows 11 with the February 2024 optional update or later; may be missing on work PCs; keep it plugged in and
# online; back up first. The Windows Update troubleshooter (Settings > System > Troubleshoot > Other troubleshooters).
# The app box: UpdateHealth (Program.cs) reads Windows' own update history - when the monthly update last installed, an update
# failing over and over, one waiting for a restart; it never installs, removes or changes anything.
UPDATES = {
    'slug': 'windows-update-stuck',
    'title': 'Windows Update Stuck? How to Get It Going Again',
    'metaDesc': 'Windows Update stuck downloading, at a percentage, or on Working on updates? How long to wait, the safe fixes in order, and Windows 11\'s built-in repair.',
    'ogTitle': 'Windows Update stuck? How to get it going again',
    'crumbName': 'Windows Update Stuck',
    'eyebrow': '// WINDOWS UPDATE STUCK?',
    'h1': 'Windows Update <em class="grad grad--cyan">stuck</em>?',
    'lede': 'It has sat at the same percentage for ages, keeps failing, or the PC is stuck on &ldquo;Working on updates&rdquo;. Updates are usually slow rather than broken. Here&rsquo;s how long to give it, what&rsquo;s safe to try, and the repair Windows 11 has built in.',
    'chips': ['How long to wait', 'Safe fixes first', 'Keeps your files'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['How long to wait', '#s1'],
    'ctaHead': 'Updates still stuck?',
    'ctaSub': 'With your permission we connect to your Windows PC, get the updates through and check nothing was lost. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('&ldquo;Working on updates, don&rsquo;t turn off&rdquo;', 'Leave it plugged in, and give it at least an hour or two before doing anything.'),
        ('Stuck downloading', 'Restart, check the internet and free space, pause and resume, and run the troubleshooter.'),
        ('Fails again and again', 'Note the error code in Update history, then try Fix problems using Windows Update.'),
        ('Repair Windows&rsquo; own files', 'In Terminal (Admin): DISM /Online /Cleanup-Image /RestoreHealth, then sfc /scannow.'),
        ('Fix problems using Windows Update', 'Settings, System, Recovery: reinstalls Windows 11 and keeps your files, apps and settings.'),
        ('Back up first', 'Before any repair, copy your important files somewhere safe.'),
        ('Don&rsquo;t force it', 'Switching off mid-update is the last resort, not the first.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; HOW LONG TO WAIT', 'h2': 'How long to give it',
         'html': '<p>The monthly updates usually take minutes. The big yearly ones can take an hour or more, and the percentage can sit still for a long time while Windows works in the background.</p>'
                 '<ul>'
                 '<li><strong>On the blue &ldquo;Working on updates&rdquo; screen:</strong> don&rsquo;t switch off. Plug a laptop in, and give it at least an hour or two.</li>'
                 '<li><strong>In Settings, stuck at a percentage:</strong> you can keep using the PC. Give it an hour, then try the fixes below.</li>'
                 '</ul>'},
        {'eyebrow': '/02 &mdash; STUCK IN SETTINGS', 'h2': 'Stuck downloading or installing',
         'html': '<ol>'
                 '<li><strong>Restart the computer</strong> (Restart, not Shut down), then Check for updates again.</li>'
                 '<li><strong>Check the internet</strong> is working, and that you&rsquo;re not on a phone hotspot with a data limit.</li>'
                 '<li><strong>Free up space:</strong> big updates need several gigabytes. Settings, System, Storage, <strong>Cleanup recommendations</strong>.</li>'
                 '<li><strong>Pause and resume:</strong> in Settings, Windows Update, choose <strong>Pause for 1 week</strong>, then <strong>Resume updates</strong>. It often restarts a stuck download cleanly.</li>'
                 '<li><strong>Run the Windows Update troubleshooter:</strong> Settings, System, Troubleshoot, Other troubleshooters, Windows Update.</li>'
                 '<li><strong>Unplug extras</strong> such as USB drives and docks, which can block an update.</li>'
                 '</ol>'},
        {'eyebrow': '/03 &mdash; FAILS AGAIN AND AGAIN', 'h2': 'An update fails again and again',
         'html': '<ol>'
                 '<li><strong>Find the error code:</strong> Settings, Windows Update, <strong>Update history</strong> shows each failed update with a code such as 0x800f0922. Microsoft&rsquo;s help pages explain most codes.</li>'
                 '<li><strong>Back up your important files</strong> to a USB drive or OneDrive first.</li>'
                 '<li><strong>Repair Windows&rsquo; own files:</strong> right-click Start, choose <strong>Terminal (Admin)</strong> and say Yes. Run <strong>DISM /Online /Cleanup-Image /RestoreHealth</strong>, which fetches good copies of damaged Windows files from Windows Update (stay online), then <strong>sfc /scannow</strong>, which checks every Windows file and puts back any that are damaged. Each can take a while, often 10 to 30 minutes; let them finish. Microsoft suggests this order (<a href="https://support.microsoft.com/en-us/topic/use-the-system-file-checker-tool-to-repair-missing-or-corrupted-system-files-79aa86cb-ca52-166a-92a3-966e85d4094e" rel="noopener" target="_blank">Microsoft</a>). If SFC still says it &ldquo;found corrupt files but was unable to fix some of them&rdquo;, go on to the next step.</li>'
                 '<li><strong>Use Windows 11&rsquo;s own repair:</strong> Settings, System, Recovery, <strong>Fix problems using Windows Update</strong>, then <strong>Reinstall now</strong>. It reinstalls the version of Windows you already have, repairs Windows&rsquo; own files, and keeps your files, apps and settings (<a href="https://support.microsoft.com/en-us/windows/deployment/install-upgrade/fix-issues-by-reinstalling-the-current-version-of-windows" rel="noopener" target="_blank">Microsoft</a>). Keep the PC plugged in and online until it finishes. It may not appear on PCs managed by a work or school.</li>'
                 '</ol>'
                 '<p><strong>The big yearly update keeps undoing itself?</strong> If it restarts, says &ldquo;Undoing changes made to your computer&rdquo; and goes back to the desktop, or Microsoft&rsquo;s installer says &ldquo;We couldn&rsquo;t update the system reserved partition&rdquo;, the usual cause is a full start-up partition, not a broken PC. We fixed exactly that on a customer&rsquo;s Dell in October 2026 (5 KB free, 15 MB needed): <a href="/we-couldnt-update-the-system-reserved-partition/">how to check it and free the space safely</a>.</p>'
                 '<p>365 PC Manager&rsquo;s full service runs the system file check itself: SFC first, DISM when SFC finds damage it can&rsquo;t fix, then SFC again, and it says in plain words when Windows needs the repair above (<a href="/free-pc-health-check/">the app</a>). Windows&rsquo; own record of every failed update, day by day, is in <a href="/reliability-monitor/">Reliability Monitor</a>.</p>'
                 '<p>Why updates sometimes cause trouble in the first place: <a href="/why-windows-updates-break-things/">why Windows updates break things</a>.</p>'},
        {'eyebrow': '/04 &mdash; STUCK ON THE BLUE SCREEN', 'h2': 'Stuck on &ldquo;Working on updates&rdquo; for hours',
         'html': '<p>Only if nothing has changed for several hours: hold the power button for about 10 seconds until the PC switches off, wait a moment, then switch it on again. Windows usually carries on, or says it couldn&rsquo;t complete the updates and undoes them, which is safe.</p>'
                 '<p>If it then won&rsquo;t start properly, see <a href="/laptop-stuck-on-logo-wont-boot/">laptop stuck on the logo and won&rsquo;t boot</a>, or ring us before trying anything else.</p>'},
        {'eyebrow': '/05 &mdash; THE QUICK WAY', 'h2': 'Let our free app check the updates', 'html': '__APP_BOX_UPDATES__'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL.format(extra='')},
    ],
    'howToName': 'How to fix Windows Update when it is stuck',
    'howToSteps': [
        {'name': 'Give it time', 'text': 'Big updates can take an hour or more. Leave a laptop plugged in.'},
        {'name': 'Restart and check again', 'text': 'Restart the PC (Restart, not Shut down), then Check for updates.'},
        {'name': 'Free space and pause', 'text': 'Free up space in Settings, System, Storage, then pause updates for a week and resume them.'},
        {'name': 'Run the troubleshooter', 'text': 'Settings, System, Troubleshoot, Other troubleshooters, Windows Update.'},
        {'name': 'Repair system files', 'text': 'In Terminal (Admin), run DISM /Online /Cleanup-Image /RestoreHealth, then sfc /scannow, and let each finish.'},
        {'name': 'Repair Windows', 'text': 'Back up first, then Settings, System, Recovery, Fix problems using Windows Update, Reinstall now.'},
    ],
    'faqs': [
        {'q': 'How long should a Windows update take?', 'a': '<p>Monthly updates usually take minutes. The big yearly updates can take an hour or more, and the percentage can stay still for a long time.</p>'},
        {'q': 'Is it safe to switch off during an update?', 'a': '<p>Avoid it. On the &ldquo;Working on updates&rdquo; screen, wait at least an hour or two. Only if nothing changes for several hours, hold the power button to switch off; Windows usually carries on or undoes the update.</p>'},
        {'q': 'Why does Windows Update keep failing?', 'a': '<p>Common causes are too little free space, a damaged update download or Windows file, or a device or driver the update doesn&rsquo;t like. Update history shows the error code. If it&rsquo;s the big yearly update that keeps undoing itself, check the hidden start-up partition: <a href="/we-couldnt-update-the-system-reserved-partition/">we couldn&rsquo;t update the system reserved partition</a>.</p>'},
        {'q': 'What does Fix problems using Windows Update do?', 'a': '<p>It reinstalls the version of Windows 11 you already have, repairing Windows&rsquo; own files, and keeps your files, apps and settings. Back up first anyway.</p>'},
        {'q': 'What does sfc /scannow do?', 'a': '<p>System File Checker checks every Windows file against a good copy and puts back any that are damaged or missing. Run it in Terminal (Admin), after DISM /Online /Cleanup-Image /RestoreHealth. It doesn&rsquo;t touch your own files or programs.</p>'},
        {'q': 'SFC found corrupt files but was unable to fix some of them. What now?', 'a': '<p>Run <strong>DISM /Online /Cleanup-Image /RestoreHealth</strong> with the PC online, which fetches good copies from Windows Update, then <strong>sfc /scannow</strong> again. If it still can&rsquo;t fix them, Fix problems using Windows Update (Settings, System, Recovery) reinstalls Windows and keeps your files, apps and settings.</p>'},
        {'q': 'Will I lose my files?', 'a': '<p>Not from the steps on this page. Back up before any repair, just in case.</p>'},
        {'q': 'Can you fix it remotely?', 'a': '<p>Usually, yes: with your permission we connect to your Windows PC and get the updates through while you watch.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/we-couldnt-update-the-system-reserved-partition/">the yearly update undoing itself (system reserved partition)</a>, <a href="/why-windows-updates-break-things/">why Windows updates break things</a>, <a href="/is-my-windows-still-supported/">is my Windows still supported?</a>, <a href="/secure-boot-certificates-expired/">Secure Boot certificates expired</a>, <a href="/why-does-my-pc-keep-crashing/">why does my PC keep crashing?</a>, <a href="/reliability-monitor/">Reliability Monitor</a> and <a href="/windows-11-support/">Windows 11 help</a>.</p>',
}

# ============================================================ 6. Forgot Windows password or PIN (12 Oct 2026, round 2)
# Bing: "forgot windows password" 822 a quarter (UK 49), "forgot pin windows 11" 212. Microsoft's own routes only (Microsoft
# Support, read 12 Oct 2026): "I forgot my PIN" (Microsoft accounts only; a local account signs in with its password, then
# resets the PIN in Settings); Microsoft account: "I forgot my password" or the reset page in any browser; local account: after a
# wrong password, OK > Reset password > security questions, or a password reset disk made earlier, or another administrator
# sets a new one; otherwise reset the device. Microsoft can't retrieve or get round a lost local password. No bypass tricks.
PASSWORD = {
    'slug': 'forgot-windows-password-or-pin',
    'title': 'Forgot Your Windows Password or PIN? How to Get Back In',
    'metaDesc': 'Locked out of your Windows PC? Reset a forgotten PIN or password the official way, for a Microsoft account or a local account, and avoid the scams.',
    'ogTitle': 'Forgot your Windows password or PIN? How to get back in',
    'crumbName': 'Forgot Windows Password or PIN',
    'eyebrow': '// LOCKED OUT OF WINDOWS?',
    'h1': 'Forgot your Windows <em class="grad grad--cyan">password or PIN</em>?',
    'lede': 'You&rsquo;ve forgotten the PIN or password for your Windows computer. Don&rsquo;t panic, and don&rsquo;t download anything that promises to &ldquo;crack&rdquo; it. These are Microsoft&rsquo;s own ways back in, and which one works depends on how you sign in.',
    'chips': ['Microsoft&rsquo;s own routes', 'Windows 11 and 10', 'No risky downloads'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Which account do I have?', '#s1'],
    'ctaHead': 'Still locked out?',
    'ctaSub': 'We can talk you through it on the phone, or collect the PC locally and help you back in without losing your files where that&rsquo;s possible. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Which account?', 'An email address on the sign-in screen means a Microsoft account; just a name usually means a local account.'),
        ('Forgot the PIN', 'Choose I forgot my PIN on the sign-in screen (Microsoft accounts).'),
        ('Microsoft account password', 'Choose I forgot my password, or reset it from another device on Microsoft&rsquo;s reset page.'),
        ('Local account password', 'After a wrong password, choose Reset password and answer your security questions.'),
        ('Still locked out', 'Another administrator on the PC, a password reset disk, or, last of all, resetting the PC.'),
        ('Avoid', '&ldquo;Password cracking&rdquo; downloads and cold callers offering to help: both are common scams.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHICH ACCOUNT?', 'h2': 'First, which kind of account do you have?',
         'html': '<ul>'
                 '<li><strong>A Microsoft account:</strong> the sign-in screen shows an email address under your name (often Outlook, Hotmail or Live). Most Windows 11 home PCs use one. The password is reset online.</li>'
                 '<li><strong>A local account:</strong> just a name, no email address. It only exists on this PC, so it&rsquo;s reset on the PC itself.</li>'
                 '<li><strong>A work or school PC:</strong> ask your IT department, who can reset it for you.</li>'
                 '</ul>'},
        {'eyebrow': '/02 &mdash; FORGOT THE PIN', 'h2': 'Forgot your PIN',
         'html': '<ul>'
                 '<li><strong>Microsoft account:</strong> on the sign-in screen, choose <strong>I forgot my PIN</strong>, confirm it&rsquo;s you with your Microsoft account (usually a code sent to your phone or email), then set a new PIN.</li>'
                 '<li><strong>Local account:</strong> choose <strong>Sign-in options</strong> and sign in with your password instead. Then set a new PIN in Settings, Accounts, Sign-in options.</li>'
                 '</ul>'},
        {'eyebrow': '/03 &mdash; MICROSOFT ACCOUNT', 'h2': 'Forgot a Microsoft account password',
         'html': '<ol>'
                 '<li>On the sign-in screen, choose <strong>I forgot my password</strong>, or on another device, go to <strong>account.live.com/password/reset</strong>.</li>'
                 '<li>Confirm it&rsquo;s you with the code Microsoft sends to the phone number or email address on the account.</li>'
                 '<li>Choose a new password, then sign in to the PC with it. The PC needs to be connected to the internet the first time.</li>'
                 '</ol>'
                 '<p>No longer have that phone or email? Microsoft&rsquo;s reset page offers a recovery form that asks questions only you would know.</p>'},
        {'eyebrow': '/04 &mdash; LOCAL ACCOUNT', 'h2': 'Forgot a local account password',
         'html': '<ol>'
                 '<li><strong>Security questions:</strong> type a wrong password, choose <strong>OK</strong>, then <strong>Reset password</strong>, and answer the security questions you set up when the account was made.</li>'
                 '<li><strong>A password reset disk:</strong> if you made one on a USB stick, choose <strong>Use a password reset disk</strong> instead.</li>'
                 '<li><strong>Another administrator:</strong> if someone else has an administrator account on the PC, they can sign in and set a new password for you: Control Panel, User Accounts, Manage another account, choose your account, Change the password.</li>'
                 '</ol>'
                 '<p>Microsoft can&rsquo;t look up or get round a lost local password. If none of these work, see the next section before doing anything drastic.</p>'},
        {'eyebrow': '/05 &mdash; STILL LOCKED OUT', 'h2': 'Still locked out? The last resort',
         'html': '<p>Resetting the PC gets you back in, but it can remove your programs and, depending on the choice, your files. If the drive is encrypted, it may also ask for the BitLocker recovery key: see <a href="/computer-asking-for-bitlocker-recovery-key/">computer asking for a BitLocker recovery key</a>. Talk to us first if there are photos or documents on the PC you can&rsquo;t lose.</p>'},
        {'eyebrow': '/06 &mdash; AVOID THE SCAMS', 'h2': 'Avoid the scams',
         'html': '<ul>'
                 '<li><strong>Don&rsquo;t download &ldquo;password removal&rdquo; or &ldquo;cracking&rdquo; programs</strong> from adverts or search results: many carry malware.</li>'
                 '<li><strong>Microsoft never rings out of the blue</strong> offering to fix your PC. Hang up, and never let a caller connect to your computer: see <a href="/gave-a-scammer-remote-access/">gave a scammer remote access?</a></li>'
                 '</ul>'},
        {'eyebrow': '/07 &mdash; NEXT TIME', 'h2': 'Make it easier next time',
         'html': '<ul>'
                 '<li><strong>Microsoft account:</strong> keep your phone number and a backup email up to date in your account&rsquo;s security settings.</li>'
                 '<li><strong>Local account:</strong> make a password reset disk (Control Panel, User Accounts, Create a password reset disk) and keep the USB stick somewhere safe.</li>'
                 '<li><strong>A password manager</strong> remembers your passwords behind one you know: see <a href="/password-manager-setup/">password manager set-up</a>.</li>'
                 '</ul>'},
        {'eyebrow': '/08 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': '<p>We can&rsquo;t connect remotely to a PC nobody can sign in to, but we can talk you through these steps on the phone, or collect the PC locally and help you back in, keeping your files where that&rsquo;s possible. Ring <strong>01202 775566</strong> or text 07520 615332, Monday to Friday, 9 to 5. For a business PC after someone has left, see <a href="/employee-left-dont-know-computer-password/">employee left and nobody knows the password</a>.</p>'},
    ],
    'howToName': 'How to get back into Windows after forgetting your password or PIN',
    'howToSteps': [
        {'name': 'Work out which account you have', 'text': 'An email address on the sign-in screen means a Microsoft account; just a name means a local account.'},
        {'name': 'Reset a forgotten PIN', 'text': 'Choose I forgot my PIN (Microsoft account), or sign in with your password and set a new PIN in Settings.'},
        {'name': 'Reset a Microsoft account password', 'text': 'Choose I forgot my password, or use account.live.com/password/reset on another device.'},
        {'name': 'Reset a local account password', 'text': 'After a wrong password, choose OK, then Reset password, and answer your security questions.'},
        {'name': 'Ask another administrator', 'text': 'Someone with an administrator account on the PC can set a new password in Control Panel, User Accounts.'},
    ],
    'faqs': [
        {'q': 'How do I get into my laptop if I forgot the password?', 'a': '<p>If it uses a Microsoft account, reset the password online and sign in with the new one. If it&rsquo;s a local account, answer your security questions after a wrong password, use a password reset disk, or ask another administrator on the PC to set a new password.</p>'},
        {'q': 'What do I do if I forgot my PIN?', 'a': '<p>Choose I forgot my PIN on the sign-in screen if you use a Microsoft account. With a local account, sign in with your password instead and set a new PIN in Settings.</p>'},
        {'q': 'Can Microsoft unlock my computer?', 'a': '<p>Microsoft can help you reset a Microsoft account password online, but it can&rsquo;t look up or get round a forgotten local account password.</p>'},
        {'q': 'Will resetting my PC delete everything?', 'a': '<p>It can remove your programs and, depending on the choice, your files. Use it as the last resort, and talk to us first if there&rsquo;s anything you can&rsquo;t lose.</p>'},
        {'q': 'Is password removal software safe?', 'a': '<p>Usually not: programs advertised to remove or crack Windows passwords often carry malware. Stick to Microsoft&rsquo;s own routes.</p>'},
        {'q': 'Can you help remotely?', 'a': '<p>Not while nobody can sign in, but we can talk you through it on the phone, or collect the PC locally and help you back in.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/password-manager-setup/">password manager set-up</a>, <a href="/computer-asking-for-bitlocker-recovery-key/">BitLocker recovery key</a>, <a href="/how-to-find-your-wifi-password/">find your Wi-Fi password</a>, <a href="/gave-a-scammer-remote-access/">gave a scammer remote access?</a> and <a href="/employee-left-dont-know-computer-password/">employee left, password unknown</a>.</p>',
}


# ============================================================ 7. We couldn't update the system reserved partition (15 Oct 2026)
# Owner, 15 Oct 2026: "do it all ... make it awesome", after we fixed this remotely on a customer's Dell Latitude 3520 the
# same day (26H2 failed with 0x80242016 and undid itself; EFI partition 96 MB with 5 KB free; removing the non-English boot
# fonts from BOTH font folders freed 25.1 MB; Windows Update then installed 26H2). Bing, 15 Jul - 12 Oct 2026: "we couldn't
# update system reserved partition" 885 (UK 71), "system reserved partition" 354, 0x800f0922 2.4K. Top 10 = Microsoft Q&A and
# partition-tool sellers pushing "extend the partition". Facts from our own runs (Judith Kent's PC, Aug 2026, and the Dell):
# Setup wants about 15 MB free there; the CJK fonts are 3-4 MB each; Dell keeps a second font set under EFI\Dell\SOS (its
# SupportAssist OS Recovery) and two BIOS recovery images of ~15 MB each. Commands are ONE LINE each with full paths and no
# variables carried between lines (15 Oct lesson: a two-line paste glued onto an unrun line deleted the English fonts too).
# Deliberately NOT told to the public: deleting the Dell BIOS images, bcdboot, resizing. Never Microsoft's `del *.*` recipe.
_PRE = ('<pre style="white-space:pre-wrap;overflow-wrap:anywhere;overflow-x:auto;padding:.9rem 1rem;border-radius:10px;background:rgba(0,0,0,.35);'
        'border:1px solid rgba(125,170,220,.22)"><code>')
RESERVED = {
    'slug': 'we-couldnt-update-the-system-reserved-partition',
    'title': 'We Couldn\'t Update the System Reserved Partition? Fix It',
    'metaDesc': '"This PC doesn\'t currently meet Windows 11 system requirements: we couldn\'t update the system reserved partition." What it really means, and the safe fix.',
    'ogTitle': 'We couldn\'t update the system reserved partition: the safe fix',
    'crumbName': 'System Reserved Partition Error',
    'eyebrow': '// WINDOWS UPDATE ERROR',
    'h1': 'We couldn&rsquo;t update the <em class="grad grad--cyan">system reserved partition</em>',
    'lede': 'The big yearly Windows update refuses to start, saying your PC &ldquo;doesn&rsquo;t currently meet Windows 11 system requirements&rdquo;, or it restarts, says it&rsquo;s undoing changes and gives up. Your PC is almost always fine. A tiny hidden partition Windows uses to start up has run out of room. Here&rsquo;s how to check, the safe way to free it, and the &ldquo;fixes&rdquo; to avoid.',
    'chips': ['Your files are safe', 'About 15 minutes', 'Fixed remotely'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Check it first', '#s3'],
    'ctaHead': 'Rather we did it?',
    'ctaSub': 'With your permission we connect to your Windows PC, free the space safely and get the update installed while you watch. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it means', 'Windows&rsquo; small start-up partition (the EFI partition) is nearly full. The update needs about 15 MB free there.'),
        ('The error codes', 'Often 0x800F0922 in Update history, or 0xC1900104 from Windows Setup.'),
        ('Is my PC too old?', 'No. On a PC that already runs Windows 11 this is the only &ldquo;requirement&rdquo; it is failing.'),
        ('What fills it', 'Start-up screen fonts in a dozen languages, and on Dell laptops a second set of fonts and two BIOS backup files.'),
        ('The safe fix', 'Remove the Chinese, Japanese and Korean start-up fonts, keep the four English ones, then run Windows Update again.'),
        ('Avoid', 'The old <code>del *.*</code> instructions, and partition tools that promise to enlarge it.'),
        ('Your files', 'Not touched. The fix only removes font files from the hidden partition.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHAT IT MEANS', 'h2': 'What the message really means',
         'html': '<p>You see it in one of two ways:</p>'
                 '<ul>'
                 '<li><strong>Windows 11 Setup or the Installation Assistant</strong> stops with &ldquo;This PC doesn&rsquo;t currently meet Windows 11 system requirements. Here&rsquo;s why: <strong>We couldn&rsquo;t update the system reserved partition.</strong>&rdquo;</li>'
                 '<li><strong>Windows Update</strong> downloads the yearly update, restarts, shows &ldquo;Undoing changes made to your computer&rdquo; and goes back to the desktop. Settings, Windows Update, Update history then lists it as <em>Failed to install</em> with an error code.</li>'
                 '</ul>'
                 '<p>Despite the wording, your PC isn&rsquo;t too old. On a modern PC the &ldquo;system reserved partition&rdquo; is the <strong>EFI system partition</strong>: a small hidden part of the drive, often only about 100 MB, that holds the files Windows needs to start. A version upgrade has to write new start-up files there and wants roughly <strong>15 MB free</strong>. When it hasn&rsquo;t got that, the upgrade either refuses to start or undoes itself after the restart.</p>'
                 '<p>Older PCs that were upgraded from Windows 10, and many laptops that came with a 100 MB partition from the factory, hit it most, and they hit it again at each yearly update.</p>'
                 '<p><strong>The error codes you may see:</strong> <strong>0x800F0922</strong> in Update history, which Microsoft says means either the PC couldn&rsquo;t reach Windows Update (a VPN can block it) or there isn&rsquo;t enough free space in the System Reserved partition (<a href="https://support.microsoft.com/en-us/windows/get-help-with-windows-upgrade-and-installation-errors-ea144c24-513d-a60e-40df-31ff78b3158a" rel="noopener" target="_blank">Microsoft</a>), and <strong>0xC1900104</strong> from Windows Setup. A yearly update that undoes itself can show a more general code too: on the Dell below it was 0x80242016. Whichever you have, the check in step 3 settles it in a minute.</p>'},
        {'eyebrow': '/02 &mdash; A REAL ONE', 'h2': 'What it looked like on a customer&rsquo;s Dell',
         'html': '<p>In October 2026 a customer&rsquo;s Dell Latitude 3520 kept failing the Windows 11 26H2 update: it restarted, undid the changes and went back to the desktop (Update history showed error 0x80242016). Running Microsoft&rsquo;s installer by hand then gave the &ldquo;couldn&rsquo;t update the system reserved partition&rdquo; message.</p>'
                 '<p>Its EFI partition was <strong>96 MB with 5 KB free</strong>. Inside: two Dell BIOS recovery files of about 15 MB each, Dell&rsquo;s own recovery tool with a full second set of start-up fonts, and Windows&rsquo; start-up fonts in a dozen languages, the Chinese, Japanese and Korean ones 3 to 4 MB each. Removing those foreign-language fonts from both font folders, and keeping the four English ones, left <strong>25 MB free</strong>. Windows Update then installed 26H2 at the next attempt, with every file and program still there. It took about fifteen minutes, done remotely.</p>'},
        {'eyebrow': '/03 &mdash; CHECK IT FIRST', 'h2': 'Check how full it is (changes nothing)',
         'html': '<p>Right-click <strong>Start</strong> and choose <strong>Terminal (Admin)</strong> (on Windows 10, <strong>Windows PowerShell (Admin)</strong>), say Yes, then paste these lines one at a time, pressing Enter after each:</p>'
                 + _PRE + 'mountvol Y: /s\nfsutil volume diskfree Y:\nGet-ChildItem Y:\\ -Recurse -Force -File | Sort-Object Length -Descending | Select-Object -First 12 FullName, Length</code></pre>'
                 '<p>The first line gives the hidden partition the letter Y: for now (if Y: is already in use, use another spare letter such as S: in every line). The second shows its size and free space: under about 15 MB free is your problem. The third lists the biggest files on it, so you can see what&rsquo;s filling it.</p>'
                 '<p>If <code>mountvol</code> gives an error instead, the PC may start the old (BIOS) way, where the partition is a visible &ldquo;System Reserved&rdquo; one instead; that&rsquo;s a job for us rather than a paste.</p>'},
        {'eyebrow': '/04 &mdash; THE SAFE FIX', 'h2': 'Free the space safely',
         'html': '<p>In the same window, paste this as <strong>one line</strong>. It removes only the foreign-language start-up fonts, from Windows&rsquo; font folder and, on a Dell, the recovery tool&rsquo;s font folder too, and keeps the four English fonts the start-up screens use:</p>'
                 + _PRE + 'Get-ChildItem \'Y:\\EFI\\Microsoft\\Boot\\Fonts\\*.ttf\',\'Y:\\EFI\\Dell\\SOS\\Fonts\\*.ttf\' -Force -ErrorAction SilentlyContinue | Where-Object { \'wgl4_boot.ttf\',\'segoe_slboot.ttf\',\'segoen_slboot.ttf\',\'segmono_boot.ttf\' -notcontains $_.Name } | Remove-Item -Force -Verbose</code></pre>'
                 '<p>Then check the space again and remove the letter:</p>'
                 + _PRE + 'fsutil volume diskfree Y:\nmountvol Y: /d</code></pre>'
                 '<ul>'
                 '<li><strong>Paste one line at a time.</strong> If a line sits unrun at the prompt when you paste the next, they join together and do something you didn&rsquo;t intend. Press Esc first to clear anything half-typed.</li>'
                 '<li><strong>Nothing else on that partition should be deleted.</strong> The fonts are only the lettering for the start-up and recovery screens; Windows keeps its own copies in C:\\Windows\\Boot\\Fonts.</li>'
                 '<li><strong>Restart, then run Windows Update again</strong> (Settings, Windows Update, Check for updates), or run the installer again. On a PC already on Windows 11 25H2, the 26H2 update is a small one that arrives through Windows Update, so you don&rsquo;t need to download Windows at all.</li>'
                 '</ul>'
                 '<p>Still under 15 MB free afterwards? Don&rsquo;t start deleting other files: on a Dell the big ones are the BIOS recovery images, and on any PC the rest are the files it needs to start. That&rsquo;s the point to ring us.</p>'},
        {'eyebrow': '/05 &mdash; WHAT NOT TO DO', 'h2': 'The &ldquo;fixes&rdquo; to avoid',
         'html': '<ul>'
                 '<li><strong>The old <code>del *.*</code> instructions.</strong> Many websites repeat an old Microsoft recipe: type <code>Y:</code>, then <code>cd EFI\\Microsoft\\Boot\\Fonts</code>, then <code>del *.*</code>. If the <code>cd</code> fails, or the window remembers a different folder on Y:, <code>del *.*</code> runs in the wrong place, and in the folder above the fonts that deletes the files your PC needs to start. It also skips hidden files, so it can free nothing while looking as though it worked. Use the full-path line above instead.</li>'
                 '<li><strong>Enlarging the partition with a partition tool.</strong> The top search results sell software that promises to make it bigger. To do it, the tool has to move your whole C: drive in a special start-up mode; if that is interrupted or goes wrong, the PC won&rsquo;t start, and nothing remote can reach it. Only ever with a full backup image first, ideally on a workbench. We do this in our workshop when a partition is genuinely too small to ever be enough.</li>'
                 '<li><strong>A clean install to &ldquo;get past it&rdquo;.</strong> It wipes your programs and settings for a problem that 15 minutes of tidying fixes.</li>'
                 '</ul>'
                 '<p>BitLocker: removing font files doesn&rsquo;t need BitLocker turning off, but before any work on the start-up side of a PC it&rsquo;s worth knowing where your recovery key is: see <a href="/computer-asking-for-bitlocker-recovery-key/">computer asking for a BitLocker recovery key</a>.</p>'},
        {'eyebrow': '/06 &mdash; WILL IT COME BACK?', 'h2': 'Will it happen again?',
         'html': '<p>It can. Yearly updates may copy the full set of fonts back, and a 100 MB partition is always tight. Check the free space again after the update has finished, and before next year&rsquo;s. Some makers&rsquo; update tools also write to this partition: on a Dell, put off installing <em>SupportAssist OS Recovery</em> updates until the Windows update is done, because that recovery tool keeps its files on the same partition.</p>'
                 '<p>If the upgrade gets past this but then only offers to keep <em>Nothing</em>, stop and don&rsquo;t continue: see <a href="/will-i-lose-files-upgrading-to-windows-11/">will I lose my files upgrading?</a> for why, and the safe way round it.</p>'},
        {'eyebrow': '/07 &mdash; THE QUICK WAY', 'h2': 'Let our app check it, and tidy it',
         'html': '<p>Version 36.4 of our free 365 PC Manager app checks this partition on its <strong>Windows Update</strong> page and says plainly when it&rsquo;s too full for the next update. Its <strong>full service</strong> now tidies it safely, taking out the start-up fonts for languages the PC doesn&rsquo;t use, and repairs damaged system files with Windows&rsquo; own tool. The Windows Update page itself only reads; the tidy happens when you run the full service.</p>__APP_BOX_UPDATES__'},
        {'eyebrow': '/08 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL.format(extra=' If the partition is simply too small to ever be enough, we can collect the PC and enlarge it safely on the bench, with a full backup first.')},
    ],
    'howToName': 'How to fix "We couldn\'t update the system reserved partition"',
    'howToSteps': [
        {'name': 'Open an admin terminal', 'text': 'Right-click Start and choose Terminal (Admin), or Windows PowerShell (Admin) on Windows 10.'},
        {'name': 'Check the free space', 'text': 'Run mountvol Y: /s, then fsutil volume diskfree Y:. Under about 15 MB free is the problem.'},
        {'name': 'Remove the foreign-language start-up fonts', 'text': 'Paste the one-line command that removes every .ttf in Y:\\EFI\\Microsoft\\Boot\\Fonts (and Y:\\EFI\\Dell\\SOS\\Fonts on a Dell) except wgl4_boot, segoe_slboot, segoen_slboot and segmono_boot.'},
        {'name': 'Check again and remove the letter', 'text': 'Run fsutil volume diskfree Y: to confirm 15 MB or more is free, then mountvol Y: /d.'},
        {'name': 'Restart and update', 'text': 'Restart, then Settings, Windows Update, Check for updates, or run the installer again.'},
    ],
    'faqs': [
        {'q': 'What is the system reserved partition?', 'a': '<p>A small hidden part of the drive that holds the files Windows needs to start. On older PCs it&rsquo;s labelled &ldquo;System Reserved&rdquo;; on modern ones it&rsquo;s the EFI system partition. The error message still uses the old name.</p>'},
        {'q': 'What do 0x800F0922 and 0xC1900104 mean?', 'a': '<p>Both can mean the system reserved (EFI) partition hasn&rsquo;t enough free space for the update. 0x800F0922 can also mean the PC couldn&rsquo;t reach Windows Update, for example because a VPN is on, so switch any VPN off and check the partition&rsquo;s free space as in step 3.</p>'},
        {'q': 'Why does it say my PC doesn&rsquo;t meet the requirements?', 'a': '<p>Windows Setup lists this space check on its requirements screen. If your PC already runs Windows 11, free space on that partition is the only requirement it is failing.</p>'},
        {'q': 'Is it safe to delete the boot fonts?', 'a': '<p>The foreign-language ones, yes: they only draw the start-up and recovery screens in Chinese, Japanese and Korean, and Windows keeps its own copies on C:. Keep the four English ones so those screens still show their text.</p>'},
        {'q': 'Will I lose my files?', 'a': '<p>No. The fix only removes font files from the hidden partition, and the yearly update itself keeps your files, apps and settings.</p>'},
        {'q': 'Can I just make the partition bigger?', 'a': '<p>It can be done, but it means moving the whole C: drive in a special start-up mode, and if that fails the PC won&rsquo;t start. Only with a full backup first, ideally on a workbench.</p>'},
        {'q': 'Will it come back next year?', 'a': '<p>It can, because yearly updates may restore the fonts and a 100 MB partition is always tight. Check the free space after each big update.</p>'},
        {'q': 'Can you fix it remotely?', 'a': '<p>Usually, yes: with your permission we connect to your Windows PC, free the space safely and get the update installed while you watch. Enlarging a partition that is simply too small is a workshop job, and we can collect.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/windows-update-stuck/">Windows Update stuck or failing</a>, <a href="/will-i-lose-files-upgrading-to-windows-11/">will I lose my files upgrading?</a>, <a href="/computer-asking-for-bitlocker-recovery-key/">computer asking for a BitLocker recovery key</a>, <a href="/secure-boot-certificates-expired/">Secure Boot certificates expired</a>, <a href="/is-my-windows-still-supported/">is my Windows still supported?</a> and <a href="/windows-11-support/">Windows 11 help</a>.</p>',
}


# ============================================================ 8-10. From the YouTube channel study (27 Oct 2026)
# Owner, 26 Oct 2026, after the channel + competitor study (memory youtube-competitor-study-2026-10-26): "build the first
# three". Each was checked against the live sitemap (790 URLs) and the nearest pages' H2s first: none had a page.
#   - Wi-Fi password: the biggest topic in the niche on YouTube (two Shorts at ~4M views each); Bing "how to find wifi
#     password" 11,327 UK / 59,648 world, 3 months to 21 Oct (seo-research/howto-batch-2026-10-21). Our own Short
#     (yt_watch.WIFI_SHORT) is filmed on the office Latitude. Steps = Microsoft Support "Find your Wi-Fi network password
#     in Windows" (KB 4023501, Windows 11 and 10 tabs), checked 27 Oct 2026; netsh is Windows' own command.
#   - Clipboard history: Bing "clipboard history" 6,696 UK / 66,594 world; the only 21 Oct how-to film with no page.
#     Facts = Microsoft Support "Clipboard in Windows" (checked 27 Oct 2026): Windows + V, Turn on, 25 items, 4 MB each,
#     text/HTML/bitmap, cleared on restart except pinned, Settings > System > Clipboard, sync tied to the account.
#   - Secure Boot certificates: new to us from the study (Zack Shutt's Short 561K in a day). Microsoft KB 5079373 (when the
#     certificates expire), KB 5068008 (FAQ), KB 5087130 (the status in Windows Security), KB 5068202 (the registry value
#     365 PC Manager's "Start-up certificates" row reads since v31), checked 27 Oct 2026: PCs keep starting and keep getting
#     normal updates; without the 2023 certificates they get no new start-up (early boot) protections; most personal PCs
#     get them automatically; some need maker firmware, perhaps only within the support period; never turn Secure Boot off;
#     only supported Windows versions get them (Windows 10 = ESU only). The last 2011 certificate (Windows Production PCA
#     2011) ran out on 19 Oct 2026, so the page speaks in the past tense.
WIFI = {
    'slug': 'how-to-find-your-wifi-password',
    'title': 'How to Find Your Wi-Fi Password on Windows 11 and 10',
    'metaDesc': 'Forgot your Wi-Fi password? If your Windows PC has joined the network before, it can show you. The steps for Windows 11 and 10, and where else to look.',
    'ogTitle': 'Forgot your Wi-Fi password? Your PC already knows it',
    'crumbName': 'Find Your Wi-Fi Password',
    'eyebrow': '// FORGOTTEN YOUR WI-FI PASSWORD?',
    'h1': 'Find your <em class="grad grad--cyan">Wi-Fi password</em> on your PC',
    'lede': 'A visitor wants your Wi-Fi, a new printer is asking for the password, and nobody can remember it. If your Windows PC has joined that network before, it already knows the password and can show you in under a minute. Nothing to download, nothing to install.',
    'chips': ['Under a minute', 'Windows 11 and 10', 'Nothing to install'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Show me the steps', '#s1'],
    'ctaHead': 'Still can&rsquo;t find it?',
    'ctaSub': 'We can find it with you remotely, connect the printer or tablet that needs it, or set a new password and reconnect everything. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Windows 11', 'Settings, Network &amp; internet, Wi-Fi, Manage known networks, your network, then Show next to Wi-Fi network password.'),
        ('Windows 10', 'Network and Sharing Center, your Wi-Fi, Wireless Properties, the Security tab, then tick Show characters.'),
        ('It works if', 'This PC has joined that network before: it remembers the password.'),
        ('No PC on it?', 'The original password is on the sticker or pull-out card on your broadband hub.'),
        ('Changed it and forgot?', 'Your broadband provider&rsquo;s app or the hub&rsquo;s own settings page can show it or set a new one.'),
        ('Keep it private', 'Anyone with the password can use your broadband, so share it with people you trust.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WINDOWS 11', 'h2': 'Windows 11: Settings shows it',
         'html': '<ol>'
                 '<li>Open <strong>Settings</strong>, then <strong>Network &amp; internet</strong>, then <strong>Wi-Fi</strong>.</li>'
                 '<li>Choose <strong>Manage known networks</strong> and click your network&rsquo;s name. (Connected to it now? <strong>Network &amp; internet</strong>, then <strong>Properties</strong> at the top, gets you to the same place.)</li>'
                 '<li>Next to <strong>Wi-Fi network password</strong>, choose <strong>Show</strong>. There&rsquo;s the password, and a QR code a phone can scan to join without typing anything.</li>'
                 '</ol>'
                 '<p>It works for any network this PC has joined before, even one it isn&rsquo;t connected to now. No <strong>Show</strong> button? Your copy of Windows 11 is an older version: the Windows 10 steps below work on it too.</p>'
                 '<p style="margin:.2rem 0 0">__YT_WIFI__</p>'},
        {'eyebrow': '/02 &mdash; WINDOWS 10', 'h2': 'Windows 10: the Wireless Properties box',
         'html': '<ol>'
                 '<li>Open <strong>Settings</strong>, then <strong>Network &amp; Internet</strong>, then <strong>Status</strong>, and choose <strong>Network and Sharing Center</strong>. (On Windows 11, open <strong>Control Panel</strong> from the Start menu, then <strong>Network and Internet</strong>, then <strong>Network and Sharing Center</strong>.)</li>'
                 '<li>Next to <strong>Connections</strong>, click your Wi-Fi network&rsquo;s name.</li>'
                 '<li>In the Wi-Fi Status box, choose <strong>Wireless Properties</strong>.</li>'
                 '<li>On the <strong>Security</strong> tab, tick <strong>Show characters</strong>. The password appears in the <strong>Network security key</strong> box.</li>'
                 '</ol>'
                 '<p>This way shows the network you&rsquo;re connected to now. If Windows asks for an administrator&rsquo;s password, sign in as the PC&rsquo;s main user, or ask whoever set the PC up.</p>'},
        {'eyebrow': '/03 &mdash; NO PC ON IT?', 'h2': 'No computer on that network? Look on the hub',
         'html': '<ul>'
                 '<li><strong>The sticker or card on your broadband hub.</strong> BT, Sky, Virgin Media, EE, TalkTalk and most other providers print the Wi-Fi name and password on a sticker on the back or underneath, or on a card that pulls out. It&rsquo;s the password the hub came with.</li>'
                 '<li><strong>A phone that&rsquo;s already connected.</strong> On most Android phones, open the Wi-Fi settings, tap the network you&rsquo;re on and choose <strong>Share</strong>: it shows a QR code another phone can scan, and many show the password underneath.</li>'
                 '<li><strong>Your broadband provider&rsquo;s app,</strong> or the hub&rsquo;s own settings page, can usually show the password or let you set a new one.</li>'
                 '</ul>'
                 '<p>Changed the password since, so the sticker no longer works? Any PC that has joined since the change has the new one: use the steps above on that PC.</p>'},
        {'eyebrow': '/04 &mdash; SHARE IT SAFELY', 'h2': 'Sharing it with visitors, safely',
         'html': '<ul>'
                 '<li><strong>Use the QR code.</strong> The one Windows 11 shows beside the password lets a visitor&rsquo;s phone join by pointing its camera at your screen, so you don&rsquo;t have to read the password out.</li>'
                 '<li><strong>Print a card</strong> for the spare room or the fridge: our free <a href="/wifi-qr-code-generator/">Wi-Fi QR code maker</a> makes one in your browser.</li>'
                 '<li><strong>Keep it to people you trust.</strong> Anyone with the password can use your broadband. Don&rsquo;t post it, or a photo of the sticker, online.</li>'
                 '<li><strong>Given it to someone you&rsquo;d rather hadn&rsquo;t got it?</strong> Set a new one in your provider&rsquo;s app or the hub&rsquo;s settings. Every device then needs the new one, printers included: see <a href="/printer-stopped-working-after-changing-wifi-password/">printer stopped working after changing the Wi-Fi password</a>.</li>'
                 '</ul>'
                 '__APP_BOX_WIFICARD__'},
        {'eyebrow': '/05 &mdash; STILL WON&rsquo;T CONNECT?', 'h2': 'Right password, but it still won&rsquo;t connect?',
         'html': '<ul>'
                 '<li><strong>A printer says the password is wrong</strong> when it isn&rsquo;t: usually the hub&rsquo;s newer security setting. See <a href="/printer-says-wifi-password-incorrect/">printer says the Wi-Fi password is incorrect</a>, and on an EE hub <a href="/printer-wont-connect-to-ee-smart-hub/">the Compatible Wi-Fi fix</a>.</li>'
                 '<li><strong>Capital letters count,</strong> and 0 and O, or 1 and l, are easy to mix up on a sticker. The QR code avoids that.</li>'
                 '<li><strong>It connects, then keeps dropping:</strong> see <a href="/wifi-keeps-dropping/">Wi-Fi keeps dropping</a>.</li>'
                 '<li><strong>A work laptop</strong> may hide the password, or sign in a different way: ask your IT department.</li>'
                 '</ul>'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _CALL.format(extra=' We can find the password with you, connect the printer, tablet or smart TV that needs it, or set a new password and reconnect everything. For Wi-Fi that doesn&rsquo;t reach every room, see <a href="/wifi-support/">Wi-Fi help</a>.')},
    ],
    'howToName': 'How to find your Wi-Fi password on a Windows PC',
    'howToSteps': [
        {'name': 'Windows 11: show it in Settings', 'text': 'Open Settings, Network &amp; internet, Wi-Fi, Manage known networks, click your network, then choose Show next to Wi-Fi network password.'},
        {'name': 'Windows 10, or no Show button', 'text': 'Open Network and Sharing Center, click your Wi-Fi, choose Wireless Properties, then on the Security tab tick Show characters.'},
        {'name': 'Look on the broadband hub', 'text': 'The original password is printed on the sticker or pull-out card on the back or underneath.'},
        {'name': 'Ask a connected phone or the provider&rsquo;s app', 'text': 'An Android phone on the network can share it as a QR code; your provider&rsquo;s app can usually show it or set a new one.'},
    ],
    'faqs': [
        {'q': 'How do I find my Wi-Fi password on my laptop?', 'a': '<p>On Windows 11, open Settings, Network &amp; internet, Wi-Fi, Manage known networks, click the network and choose Show next to Wi-Fi network password. On Windows 10, use Network and Sharing Center, Wireless Properties, Security, Show characters.</p>'},
        {'q': 'Can I see the password for a network I&rsquo;m not connected to?', 'a': '<p>Yes, if the PC has joined it before. On Windows 11, Manage known networks lists every saved network. On Windows 10, open Command Prompt and type <code>netsh wlan show profile name="Your network name" key=clear</code>: the password is next to Key Content. <code>netsh wlan show profiles</code> lists the saved names.</p>'},
        {'q': 'Where is the Wi-Fi password on my router?', 'a': '<p>On most UK broadband hubs it&rsquo;s on a sticker on the back or underneath, or a card that pulls out, often labelled Wireless key, Wi-Fi password or Network key. That&rsquo;s the original one: if it has been changed since, the PC that has joined since knows the new one.</p>'},
        {'q': 'Is it safe to show my Wi-Fi password?', 'a': '<p>On your own screen, yes. Just don&rsquo;t post it online or leave the QR code where strangers can scan it: anyone with the password can use your broadband.</p>'},
        {'q': 'Why can&rsquo;t I see a Show button?', 'a': '<p>Older versions of Windows 11 don&rsquo;t have it in Settings. Use the Network and Sharing Center route instead: it works on Windows 11 too, from Control Panel.</p>'},
        {'q': 'Can you help remotely?', 'a': '<p>Yes. With your permission we connect to your Windows PC, find the password with you and connect whatever needs it. Remote help from &pound;20, no fix, no fee.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/wifi-qr-code-generator/">Wi-Fi QR code maker</a>, <a href="/printer-says-wifi-password-incorrect/">printer says the Wi-Fi password is incorrect</a>, <a href="/printer-stopped-working-after-changing-wifi-password/">printer stopped after changing the Wi-Fi password</a>, <a href="/wifi-signal-test/">Wi-Fi signal test</a> and <a href="/wifi-troubleshooting/">Wi-Fi troubleshooting</a>.</p>',
}

CLIPBOARD = {
    'slug': 'clipboard-history-windows',
    'title': 'Clipboard History in Windows 11 and 10 (Windows + V)',
    'metaDesc': 'Copied something, then lost it? Windows can remember the last 25 things you copy. Turn on clipboard history with Windows + V, paste from it, pin and clear.',
    'ogTitle': 'Clipboard history: Windows can remember everything you copy',
    'crumbName': 'Clipboard History',
    'eyebrow': '// COPIED SOMETHING, THEN LOST IT?',
    'h1': 'Windows can remember <em class="grad grad--cyan">everything you copy</em>',
    'lede': 'You copied a phone number, then copied something else, and the number&rsquo;s gone. Normally the clipboard holds one thing at a time, but Windows has a clipboard history that keeps the last 25. It&rsquo;s built in and free: you just switch it on once.',
    'chips': ['Built into Windows', 'Windows 11 and 10', 'Two keys: Windows + V'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Turn it on', '#s1'],
    'ctaHead': 'Want a hand with it?',
    'ctaSub': 'We can set it up with you remotely, along with the other shortcuts that save time every day. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Open it', 'Press the Windows key and V together.'),
        ('First time', 'Choose Turn on. It remembers what you copy from then on.'),
        ('Paste from it', 'Windows + V instead of Ctrl + V, then click the one you want.'),
        ('How much', 'The last 25 things you copied: text, pictures and bits of web pages, up to 4 MB each.'),
        ('Keep something', 'Pin it. Pinned items stay after a restart; the rest clear.'),
        ('Clear it', 'Clear all at the top of the list, or Settings, System, Clipboard, Clear.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; TURN IT ON', 'h2': 'Turn clipboard history on',
         'html': '<ol>'
                 '<li>Press the <strong>Windows key</strong> and <strong>V</strong> together.</li>'
                 '<li>The first time, it says clipboard history is off: choose <strong>Turn on</strong>.</li>'
                 '</ol>'
                 '<p>That&rsquo;s it. From now on Windows remembers what you copy, though it can&rsquo;t bring back anything copied before you switched it on. The same switch is in <strong>Settings</strong>, <strong>System</strong>, <strong>Clipboard</strong>, as <strong>Clipboard history</strong>.</p>'},
        {'eyebrow': '/02 &mdash; USE IT', 'h2': 'Paste anything you copied earlier',
         'html': '<ol>'
                 '<li>Copy things as normal, with <strong>Ctrl + C</strong>, or right-click and <strong>Copy</strong>.</li>'
                 '<li>When you want to paste, press <strong>Windows + V</strong> instead of Ctrl + V.</li>'
                 '<li>Everything you&rsquo;ve copied is listed, newest at the top. Click the one you want and it goes in where your cursor is.</li>'
                 '</ol>'
                 '<p>It works in almost every program: emails, letters, web forms, even the search box. Ctrl + V still pastes the last thing you copied, as it always has.</p>'},
        {'eyebrow': '/03 &mdash; PIN AND CLEAR', 'h2': 'Pin what you use often, clear the rest',
         'html': '<ul>'
                 '<li><strong>Pin it.</strong> Press Windows + V, point at an item and choose the <strong>pin</strong> (on some versions it&rsquo;s under the <strong>&hellip;</strong> button). Pinned items stay even after you restart, so your address or a reference number is always two keys away.</li>'
                 '<li><strong>Delete one item:</strong> choose the <strong>&hellip;</strong> button next to it, then <strong>Delete</strong>.</li>'
                 '<li><strong>Clear the lot:</strong> choose <strong>Clear all</strong> at the top of the list. Your pinned items stay.</li>'
                 '<li><strong>A restart clears it too,</strong> apart from pinned items. It holds the last 25 things; older ones drop off as you copy more.</li>'
                 '</ul>'},
        {'eyebrow': '/04 &mdash; PRIVACY', 'h2': 'Passwords, bank details and shared PCs',
         'html': '<ul>'
                 '<li><strong>Everything you copy goes in the list,</strong> including a password or card number, until you restart, clear it or it drops off the end. On a PC other people use, press Windows + V afterwards and delete it.</li>'
                 '<li><strong>Many password managers</strong> keep the passwords they copy out of the history, and our free <a href="/free-pc-health-check/">365 PC Manager</a> app does the same with the passwords it makes.</li>'
                 '<li><strong>Syncing to your other PCs is off unless you turn it on.</strong> <strong>Clipboard history across your devices</strong> in Settings, System, Clipboard sends what you copy to your other Windows PCs signed in to the same Microsoft account. Leave it off unless you need it.</li>'
                 '</ul>'},
        {'eyebrow': '/05 &mdash; NOT WORKING?', 'h2': 'Windows + V does nothing?',
         'html': '<ul>'
                 '<li><strong>Check it&rsquo;s switched on:</strong> Settings, System, Clipboard, Clipboard history.</li>'
                 '<li><strong>A work or school PC</strong> may have it switched off by the IT department, with the setting greyed out. Ask them.</li>'
                 '<li><strong>The Windows key does nothing at all?</strong> Some keyboards, gaming ones especially, have a switch that turns it off. Check the keyboard for a lock key.</li>'
                 '<li><strong>The item isn&rsquo;t in the list:</strong> things copied before you turned it on, items over 4 MB and files copied in File Explorer don&rsquo;t appear.</li>'
                 '</ul>'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _CALL.format(extra=' We can switch on clipboard history and the other time-savers, such as <a href="/how-to-take-a-screenshot/">screenshots</a> and <a href="/how-to-set-up-a-second-monitor/">two windows side by side</a>, and show you how they work.')},
    ],
    'howToName': 'How to use clipboard history in Windows',
    'howToSteps': [
        {'name': 'Open clipboard history', 'text': 'Press the Windows key and V together.'},
        {'name': 'Turn it on', 'text': 'The first time, choose Turn on. Windows remembers what you copy from then on.'},
        {'name': 'Copy as normal', 'text': 'Copy things with Ctrl + C, or right-click and Copy.'},
        {'name': 'Paste from the list', 'text': 'Press Windows + V instead of Ctrl + V, and click the item you want.'},
        {'name': 'Pin or clear', 'text': 'Pin things you use often; choose Clear all to wipe the rest.'},
    ],
    'faqs': [
        {'q': 'How do I see my clipboard history?', 'a': '<p>Press the Windows key and V together. If it says clipboard history is off, choose Turn on: it lists what you copy from then on.</p>'},
        {'q': 'Can I get back something I copied yesterday?', 'a': '<p>Only if clipboard history was already on and the PC hasn&rsquo;t restarted since, or you pinned it. A restart clears everything except pinned items.</p>'},
        {'q': 'How many things does clipboard history keep?', 'a': '<p>The last 25 things you copied, each up to 4 MB: text, pictures and bits of web pages. Older ones drop off as you copy more, unless they&rsquo;re pinned.</p>'},
        {'q': 'Does clipboard history work on Windows 10?', 'a': '<p>Yes. Windows + V works the same way on an up-to-date Windows 10 PC.</p>'},
        {'q': 'Is clipboard history safe?', 'a': '<p>It stays on your PC unless you turn on syncing. Anything sensitive you copy sits in the list until you delete it, clear it or restart, so clear it on a shared PC.</p>'},
        {'q': 'Where is the clipboard in Windows 11?', 'a': '<p>There&rsquo;s no folder for it: press Windows + V to see it, and Settings, System, Clipboard for its settings.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/how-to-take-a-screenshot/">how to take a screenshot</a>, <a href="/how-to-set-up-a-second-monitor/">two windows side by side</a>, <a href="/keyboard-test/">keyboard test</a>, <a href="/password-manager-setup/">password manager set-up</a> and <a href="/windows-11-course-for-beginners/">Windows 11 for beginners</a>.</p>',
}

SECBOOT = {
    'slug': 'secure-boot-certificates-expired',
    'title': 'Secure Boot Certificates Expired? What It Means for Your PC',
    'metaDesc': 'Microsoft replaced the 2011 Secure Boot certificates in 2026. Your PC still starts, but needs the new ones for future protection. Check yours in a minute.',
    'ogTitle': 'Secure Boot certificates expired: is my PC still safe?',
    'crumbName': 'Secure Boot Certificates Expired',
    'eyebrow': '// SECURE BOOT CERTIFICATES',
    'h1': 'Secure Boot certificates <em class="grad grad--cyan">expired</em>: is my PC still safe?',
    'lede': 'You&rsquo;ve seen a headline, a message in Windows Security, or a caller telling you your PC&rsquo;s security certificates have expired. Here&rsquo;s the calm version: your PC still starts and still gets Windows updates. What it needs is Microsoft&rsquo;s new certificates, and most PCs get them by themselves. You can check yours in a minute.',
    'chips': ['Your PC still starts', 'Check in a minute', 'Windows 11 and 10'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Check my PC', '#s2'],
    'ctaHead': 'Want us to check it?',
    'ctaSub': 'With your permission we connect to your Windows PC, check Secure Boot and the certificates, install what Windows has waiting, and tell you plainly if it needs a BIOS update from the maker. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What expired', 'Microsoft&rsquo;s 2011 Secure Boot certificates: the first in June 2026, the last in October 2026.'),
        ('Does my PC still start?', 'Yes. It keeps starting, and keeps getting its normal Windows updates.'),
        ('What a PC without the new ones misses', 'Future security fixes for the start-up process, the part that stops hidden malware loading before Windows.'),
        ('How to check', 'Windows Security, Device security, Secure Boot. Fully updated is what you want.'),
        ('Most PCs', 'Get the new 2023 certificates by themselves through Windows Update. Some also need a BIOS update from the maker.'),
        ('Never', 'Turn Secure Boot off to get round it, or let a caller &ldquo;fix&rdquo; it for you.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHAT HAPPENED', 'h2': 'What actually expired, in plain English',
         'html': '<p>When a Windows PC switches on, <strong>Secure Boot</strong> checks that the first programs to load, before Windows itself, are genuine and haven&rsquo;t been tampered with. It does that with digital certificates from Microsoft, kept in the PC&rsquo;s own start-up software (the UEFI firmware).</p>'
                 '<p>The certificates in most PCs date from 2011, and they ran out during 2026: the first in June, and the one that checks Windows&rsquo; own start-up files in October. Microsoft made new 2023 certificates to replace them, and has been sending them out through Windows Update since 2025.</p>'
                 '<p><strong>A PC without the new ones still starts and still gets its normal Windows updates.</strong> What it can&rsquo;t get any more is new security fixes for the start-up process itself, so over time it&rsquo;s less protected against the rare kind of malware that hides there.</p>'},
        {'eyebrow': '/02 &mdash; CHECK YOURS', 'h2': 'Check yours in a minute',
         'html': '<ol>'
                 '<li>Click Start, type <strong>Windows Security</strong> and open it.</li>'
                 '<li>Choose <strong>Device security</strong>, then <strong>Secure Boot</strong>.</li>'
                 '<li>Read what it says:'
                 '<ul>'
                 '<li><strong>Fully updated</strong>, with a green tick: nothing to do.</li>'
                 '<li><strong>Not yet updated:</strong> the update should arrive by itself. Keep the PC online, install the latest Windows updates and restart when asked: see <a href="#s3">below</a>.</li>'
                 '<li><strong>A yellow warning:</strong> something on the PC, often its firmware, is holding the update up: see <a href="#s4">when the PC maker needs to help</a>.</li>'
                 '<li><strong>Requires action</strong>, in red: as it stands, the PC can no longer get start-up security updates. Microsoft&rsquo;s guidance is at aka.ms/getsecureboot, or ring us.</li>'
                 '</ul></li>'
                 '</ol>'
                 '<p>The free <a href="/free-pc-health-check/">365 PC Manager</a> app shows the same thing in plain words on its <strong>This PC</strong> page, as <strong>Start-up certificates</strong>. No Secure Boot section at all, or it says Secure Boot is off? See <a href="#s5">Windows 10, and PCs with Secure Boot off</a>.</p>'},
        {'eyebrow': '/03 &mdash; NOT YET UPDATED', 'h2': '&ldquo;Not yet updated&rdquo;? Let Windows Update finish',
         'html': '<ul>'
                 '<li><strong>Install every update:</strong> Settings, Windows Update, Check for updates. Install what&rsquo;s offered, including anything waiting for a restart.</li>'
                 '<li><strong>Restart, then check again.</strong> Part of the change happens during a restart, so it can take more than one.</li>'
                 '<li><strong>Give it time.</strong> Microsoft is sending the certificates out in stages, so a fully up-to-date PC may say Not yet updated for a while.</li>'
                 '<li><strong>Leave Secure Boot on.</strong> Microsoft is clear that switching it off to get round this weakens the PC&rsquo;s protection.</li>'
                 '</ul>'
                 '<p>Updates failing or stuck? See <a href="/windows-update-stuck/">Windows Update stuck or failing</a>.</p>'},
        {'eyebrow': '/04 &mdash; THE PC MAKER', 'h2': 'When the PC maker needs to help',
         'html': '<p>On some PCs the new certificates also need an update to the PC&rsquo;s own start-up software (the BIOS or UEFI firmware) from its maker. Dell, HP, Lenovo, ASUS and the other big makers have published pages listing which models need one.</p>'
                 '<ul>'
                 '<li><strong>Use the maker&rsquo;s own update app</strong>, such as Dell SupportAssist, HP Support Assistant or Lenovo Vantage, or its support website with your model or service tag.</li>'
                 '<li><strong>Have your BitLocker recovery key to hand</strong> before a BIOS update: some PCs ask for it on the next start. See <a href="/computer-asking-for-bitlocker-recovery-key/">computer asking for a BitLocker recovery key</a>.</li>'
                 '<li><strong>Plug a laptop in</strong> first, and don&rsquo;t switch off while a BIOS update runs.</li>'
                 '<li><strong>Older PCs:</strong> Microsoft notes that makers may only offer firmware updates for models still in their support period. If yours isn&rsquo;t offered one, it keeps working; it just won&rsquo;t get new start-up protections. That&rsquo;s worth weighing up next time you think about <a href="/worth-repairing-old-laptop/">repairing or replacing it</a>.</li>'
                 '</ul>'},
        {'eyebrow': '/05 &mdash; WINDOWS 10 AND SECURE BOOT OFF', 'h2': 'Windows 10, and PCs with Secure Boot off',
         'html': '<ul>'
                 '<li><strong>Windows 10:</strong> Microsoft only sends the new certificates to versions of Windows it still supports, so a Windows 10 PC gets them while it&rsquo;s enrolled in Extended Security Updates: see <a href="/windows-10-esu-free-enrolment-help/">Windows 10 ESU help</a>. Not enrolled? It won&rsquo;t get them, and it&rsquo;s missing far more important security fixes as well: see <a href="/is-my-windows-still-supported/">is my Windows still supported?</a> or ask about <a href="/windows-11-upgrade-service/">moving it to Windows 11</a>.</li>'
                 '<li><strong>Secure Boot off, or an older PC without it:</strong> the certificates don&rsquo;t come into it, and nothing changed for that PC in 2026. Secure Boot is worth having on, and Windows 11 expects it. Switching it on is a setting in the PC&rsquo;s start-up software that&rsquo;s best done with care: we can check whether yours can.</li>'
                 '</ul>'},
        {'eyebrow': '/06 &mdash; AVOID THE SCAMS', 'h2': 'Calls and pop-ups about &ldquo;expired certificates&rdquo;',
         'html': '<p>Scammers love a news story. Microsoft, your broadband provider and your bank will never ring you, or put up a pop-up with a phone number, to say your PC&rsquo;s certificates have expired. The real update comes through Windows Update, free, and nobody needs to connect to your computer for it.</p>'
                 '<ul>'
                 '<li><strong>Someone rings about it?</strong> Hang up. If you&rsquo;ve already let them connect, see <a href="/gave-a-scammer-remote-access/">gave a scammer remote access?</a></li>'
                 '<li><strong>A pop-up with a number to call</strong> is a scam: close the browser and don&rsquo;t ring it. See <a href="/scam-pop-up-help-poole/">scam pop-up help</a>.</li>'
                 '</ul>'},
        {'eyebrow': '/07 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _CALL.format(extra=' Not sure what yours says, stuck on Not yet updated, or showing a warning? We check Secure Boot and the certificates, install what Windows has waiting, and tell you plainly whether the PC needs a BIOS update from its maker.')},
    ],
    'howToName': 'How to check your PC has Microsoft&rsquo;s new Secure Boot certificates',
    'howToSteps': [
        {'name': 'Open Windows Security', 'text': 'Click Start, type Windows Security and open it.'},
        {'name': 'Check the Secure Boot status', 'text': 'Choose Device security, then Secure Boot. Fully updated means it already has the new certificates.'},
        {'name': 'Install updates and restart', 'text': 'Settings, Windows Update, Check for updates: install everything, and restart when asked.'},
        {'name': 'Check for a BIOS update', 'text': 'Use the PC maker&rsquo;s update app or support website. Have your BitLocker recovery key to hand first.'},
        {'name': 'On Windows 10', 'text': 'Enrol in Extended Security Updates, or move the PC to Windows 11: unsupported Windows doesn&rsquo;t get the certificates.'},
    ],
    'faqs': [
        {'q': 'Will my PC stop working because the Secure Boot certificates expired?', 'a': '<p>No. Microsoft says a PC without the new certificates still starts and runs normally, and standard Windows updates keep installing. It just can&rsquo;t receive new security fixes for the start-up process.</p>'},
        {'q': 'How do I know if my PC has the new certificates?', 'a': '<p>Open Windows Security, then Device security, then Secure Boot. Fully updated means it has them. The free 365 PC Manager app shows the same on its This PC page.</p>'},
        {'q': 'Do I need to do anything?', 'a': '<p>Usually not: most home PCs get the new certificates automatically through Windows Update. Install your updates and restart when asked. If Windows Security shows a warning, the PC may need a BIOS update from its maker.</p>'},
        {'q': 'Should I turn Secure Boot off?', 'a': '<p>No. Microsoft advises against switching Secure Boot off to get round the change: it weakens protection against malware that loads before Windows.</p>'},
        {'q': 'Does this affect Windows 10?', 'a': '<p>Windows 10 PCs get the new certificates only while they&rsquo;re enrolled in Extended Security Updates, because Microsoft only sends them to supported versions of Windows.</p>'},
        {'q': 'Someone rang to say my certificates have expired. Is it real?', 'a': '<p>No, it&rsquo;s a scam. The real update comes through Windows Update and nobody needs to connect to your PC. Hang up, and never let a cold caller connect to your computer.</p>'},
        {'q': 'What are the new certificates called?', 'a': '<p>They&rsquo;re the 2023 certificates, such as Windows UEFI CA 2023, which replaces the Microsoft Windows Production PCA 2011 certificate and the other 2011 ones.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/computer-asking-for-bitlocker-recovery-key/">BitLocker recovery key</a>, <a href="/is-my-windows-still-supported/">is my Windows still supported?</a>, <a href="/windows-10-end-of-life/">Windows 10 end of life</a>, <a href="/windows-update-stuck/">Windows Update stuck</a> and <a href="/computer-spec-checker/">free PC spec checker</a>.</p>',
}


# ============================================================ 11-12. From the Bing read (27 Oct 2026)
# Owner, 27 Oct 2026: "build all of them" (seo-research/site-optimise-2026-10-27/FINDINGS.md, proposals 2 and 5).
#   - Phone Link: Bing UK "phone link" 17,663 in 3 months to 24 Oct (217K world); the biggest Windows how-to in the niche on
#     YouTube (Microsoft Helps' Phone Link video 837K). Nothing on the site mentioned it. ANDROID ONLY (we give no Apple
#     help). Facts = Microsoft Support, checked 27 Oct 2026: "Phone Link requirements and setup" (Windows 10 October 2022
#     update or later, or Windows 11; Android 10 or later; same Wi-Fi; aka.ms/yourpc; same Microsoft account; QR code or
#     Pair manually), "Introducing Microsoft Phone Link and Link to Windows" (Link to Windows preinstalled on select
#     Samsung, HONOR, Surface Duo and OPPO phones; on Samsung it's in Quick Settings), "Manage mobile devices in Windows"
#     (Settings > Bluetooth & devices > Mobile devices > Add device; Show mobile device in File Explorer, Use as a connected
#     camera), "Troubleshooting photos in the Phone Link" (the 2,000 newest from Camera Roll and Screenshots, no videos) and
#     "Import photos and videos from phone to PC" (USB cable + the Photos app's Import).
#   - ntlworld / Blueyonder: Bing UK "ntlworld email login" ~9.7K + "ntlworld.com email login" 1.5K + "ntlworld email sign
#     in" 1.1K + "blueyonder email" 2,234, nearly all UK; Copilot cites us for "ntlworld email not working" (~82). The
#     Junara page covers the DECISION (owner, 27 Oct: leave that page alone); this one is the log-in / not-working page and
#     links to it. Facts = memory virgin-media-app-password (Virgin's manage-email-settings + email-service-change pages,
#     read 25-26 Sep 2026; Virgin Media O2 newsroom 9 Sep 2026): the four domains share Virgin Media Mail; webmail at
#     mail.virginmedia.com with the normal password; Outlook / phones need the app password from My Virgin Media (a new one
#     stops the old); IMAP imap.virginmedia.com 993 SSL, SMTP smtp.virginmedia.com 465 SSL, full address as user name; the
#     Junara date at least 45 days after Virgin's first email, then suspended (old mail still viewable), 120 days to
#     reactivate, then deleted; former customers go straight onto a paid plan; Virgin's emails have no sign-up link.
PHONELINK = {
    'slug': 'phone-link-android',
    'title': 'Phone Link: Connect Your Android Phone to Windows',
    'metaDesc': "Set up Phone Link to get your Android phone's photos, texts, calls and notifications on your Windows PC. Free, built into Windows, step by step.",
    'ogTitle': 'Phone Link: your Android phone on your Windows PC',
    'crumbName': 'Phone Link for Android',
    'eyebrow': '// YOUR PHONE, ON YOUR PC',
    'h1': 'Connect your Android phone with <em class="grad grad--cyan">Phone Link</em>',
    'lede': 'Your photos are on your phone, the texts keep pinging, and you&rsquo;re sat at the computer. Phone Link is Microsoft&rsquo;s free app, already on your Windows PC, that puts your Android phone&rsquo;s photos, texts, calls and notifications on the PC screen. Here&rsquo;s how to set it up and get your photos across.',
    'chips': ['Free, built into Windows', 'Android phones', 'About 5 minutes'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Set it up', '#s2'],
    'ctaHead': 'Rather we set it up with you?',
    'ctaSub': 'We do the PC side remotely while you hold the phone, and show you where your photos land. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it is', 'Microsoft&rsquo;s free app for linking an Android phone to a Windows PC: photos, texts, calls and notifications on the PC.'),
        ('You need', 'Windows 11, or Windows 10 with the October 2022 update or later; Android 10 or later; both on the same Wi-Fi.'),
        ('On the PC', 'Phone Link is already there: type <strong>Phone Link</strong> in the Start menu.'),
        ('On the phone', 'The <strong>Link to Windows</strong> app: already on many Samsung phones, otherwise free from Google Play.'),
        ('Photos', 'The newest 2,000 photos and screenshots. Videos and older photos go across with a USB cable.'),
        ('Changed your mind?', 'Remove the phone in Phone Link&rsquo;s settings and the link stops.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHAT IT DOES', 'h2': 'What Phone Link does',
         'html': '<ul>'
                 '<li><strong>Photos:</strong> the newest photos and screenshots from your phone, on the PC, ready to drag into a folder, an email or a document. No cable.</li>'
                 '<li><strong>Messages:</strong> read and reply to your phone&rsquo;s text messages with the PC&rsquo;s keyboard.</li>'
                 '<li><strong>Calls:</strong> make and answer phone calls through the PC&rsquo;s speakers and microphone (the PC needs Bluetooth).</li>'
                 '<li><strong>Notifications:</strong> your phone&rsquo;s alerts pop up on the PC, so the phone can stay in your bag.</li>'
                 '</ul>'
                 '<p>Some Samsung, HONOR and OPPO phones get extras, such as opening the phone&rsquo;s apps on the PC. The phone does the calling and texting, on your own phone plan, as it always does: the PC just shows it.</p>'},
        {'eyebrow': '/02 &mdash; SET IT UP', 'h2': 'Set up Phone Link, step by step',
         'html': '<p>Have the phone unlocked and on the same Wi-Fi as the PC, and know your Microsoft account password (the one you sign in to Windows or Outlook.com with).</p>'
                 '<ol>'
                 '<li><strong>On the PC:</strong> open the Start menu, type <strong>Phone Link</strong> and open it. Choose <strong>Android</strong> and sign in with your Microsoft account if it asks.</li>'
                 '<li><strong>On the phone:</strong> open the web browser and go to <strong>aka.ms/yourpc</strong>. It opens the <strong>Link to Windows</strong> app, or takes you to Google Play to get it free. On a Samsung phone it&rsquo;s often there already: swipe down from the top of the screen and look for <strong>Link to Windows</strong> in Quick Settings.</li>'
                 '<li>In Link to Windows, sign in with the <strong>same Microsoft account</strong> as the PC.</li>'
                 '<li><strong>On the PC,</strong> choose to pair with a <strong>QR code</strong>. Scan the code on the PC screen with the camera inside the Link to Windows app. (No camera handy? Choose <strong>Pair manually</strong> instead.)</li>'
                 '<li>The phone asks for permissions, such as photos and messages. Allow the ones for what you want on the PC: that&rsquo;s what lets them appear.</li>'
                 '<li>Press <strong>Done</strong> on the phone and go back to the PC. Your phone&rsquo;s name appears at the top of Phone Link.</li>'
                 '</ol>'
                 '<p><strong>Windows 11 shortcut:</strong> Settings, <strong>Bluetooth &amp; devices</strong>, <strong>Mobile devices</strong>, then <strong>Add device</strong> shows the QR code too. That route can also show the phone in File Explorer and use its camera as a webcam, under <strong>Manage devices</strong>.</p>'},
        {'eyebrow': '/03 &mdash; YOUR PHOTOS', 'h2': 'Get your phone&rsquo;s photos onto your PC',
         'html': '<ol>'
                 '<li>In Phone Link, choose <strong>Photos</strong> at the top.</li>'
                 '<li>Drag a photo onto the desktop or into a folder, or right-click it and choose <strong>Save as</strong>. Hold Ctrl to pick several.</li>'
                 '</ol>'
                 '<p>Phone Link shows the <strong>2,000 newest</strong> photos and screenshots from the phone&rsquo;s camera and Screenshots folders. It doesn&rsquo;t bring videos across. For videos, older photos or the whole lot at once, use the cable:</p>'
                 '<ol>'
                 '<li>Plug the phone into the PC with its charging cable (one that carries data, not a charge-only one).</li>'
                 '<li>Unlock the phone, tap the <strong>USB</strong> notification and choose <strong>File transfer</strong> (sometimes <strong>Transfer files</strong>).</li>'
                 '<li>On the PC, open the <strong>Photos</strong> app and choose <strong>Import</strong>, then your phone. Pick the photos and videos and import them.</li>'
                 '</ol>'
                 '<p>Then keep a second copy: a PC that holds the only copy of your photos is one fault away from losing them. See <a href="/how-to-back-up-your-photos/">how to back up your photos</a>.</p>'},
        {'eyebrow': '/04 &mdash; WON&rsquo;T CONNECT?', 'h2': 'Phone Link won&rsquo;t connect, or keeps dropping?',
         'html': '<ul>'
                 '<li><strong>Same Wi-Fi.</strong> Both need to be on the same network. A phone that has slipped onto mobile data, or the guest Wi-Fi, can&rsquo;t see the PC.</li>'
                 '<li><strong>Same Microsoft account</strong> on the phone&rsquo;s Link to Windows app and in Phone Link on the PC.</li>'
                 '<li><strong>Battery saving.</strong> Many phones stop apps in the background to save battery, and Link to Windows then drops off. In the phone&rsquo;s Settings, under Apps, Link to Windows, Battery, let it run in the background (the words vary by phone).</li>'
                 '<li><strong>Permissions.</strong> No photos or texts showing? Check Link to Windows is allowed to see them, in the phone&rsquo;s Settings under Apps.</li>'
                 '<li><strong>Updates.</strong> Update Link to Windows in Google Play and Phone Link in the Microsoft Store, then restart both.</li>'
                 '<li><strong>Calls won&rsquo;t work</strong> but the rest does? Calls go over Bluetooth: the PC needs Bluetooth switched on.</li>'
                 '<li><strong>A work PC</strong> may have Phone Link switched off by the IT department.</li>'
                 '</ul>'},
        {'eyebrow': '/05 &mdash; PRIVACY', 'h2': 'Is it safe, and how do I stop it?',
         'html': '<p>Phone Link is Microsoft&rsquo;s own app, and you choose what it can see when the phone asks for permissions. Two things to know:</p>'
                 '<ul>'
                 '<li><strong>Anyone using your PC</strong> can see your texts and photos while the phone is linked. On a shared family PC, think about whether that&rsquo;s what you want, or lock the PC when you walk away (Windows key + L).</li>'
                 '<li><strong>To stop it,</strong> open Phone Link&rsquo;s settings (the cog), find <strong>My devices</strong> and remove the phone. On the phone, open Link to Windows and remove the PC, or uninstall the app.</li>'
                 '</ul>'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _CALL.format(extra=' We do the PC side and talk you through the phone side, and show you where your photos land. This guide is for Android phones: we help with Windows PCs, not iPhones or Macs.')},
    ],
    'howToName': 'How to connect an Android phone to a Windows PC with Phone Link',
    'howToSteps': [
        {'name': 'Open Phone Link on the PC', 'text': 'Open the Start menu, type Phone Link, open it and choose Android. Sign in with your Microsoft account if it asks.'},
        {'name': 'Get Link to Windows on the phone', 'text': 'On the phone go to aka.ms/yourpc in the browser, open or install Link to Windows, and sign in with the same Microsoft account.'},
        {'name': 'Pair with the QR code', 'text': 'Choose to pair with a QR code on the PC and scan it with the camera in the Link to Windows app, or choose Pair manually.'},
        {'name': 'Allow the permissions', 'text': 'Allow the permissions the phone asks for, such as photos and messages, press Done, and go back to the PC.'},
        {'name': 'Open your photos', 'text': 'In Phone Link choose Photos and drag the ones you want into a folder. Use a USB cable and the Photos app for videos and older photos.'},
    ],
    'faqs': [
        {'q': 'Is Phone Link free?', 'a': '<p>Yes. Phone Link comes with Windows 11 and recent Windows 10, and the Link to Windows app is free on Google Play. Calls and texts use your own phone plan, as they always do.</p>'},
        {'q': 'Why can&rsquo;t I see all my photos in Phone Link?', 'a': '<p>It shows the 2,000 newest photos and screenshots from the phone&rsquo;s camera and Screenshots folders. For older photos, other folders or videos, plug the phone in with a USB cable and use Import in the Photos app.</p>'},
        {'q': 'Can I move videos with Phone Link?', 'a': '<p>No, Phone Link doesn&rsquo;t bring videos across. Plug the phone in with a USB cable, choose File transfer on the phone, and import them with the Photos app.</p>'},
        {'q': 'Does the phone need to be on the same Wi-Fi?', 'a': '<p>Yes, Microsoft asks for the phone and the PC to be on the same Wi-Fi network. Most connection problems are a phone that has slipped onto mobile data or a different network.</p>'},
        {'q': 'Does Phone Link work with an iPhone?', 'a': '<p>Microsoft makes an iPhone version with fewer features, but this guide covers Android phones, and our help is for Windows PCs, not iPhones or Macs.</p>'},
        {'q': 'Can you set it up for me remotely?', 'a': '<p>Yes. With your permission we connect to your Windows PC and do that side, and talk you through the phone: you scan the code and allow the permissions. Remote help from &pound;20, no fix, no fee.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/how-to-back-up-your-photos/">back up your photos</a>, <a href="/android-phone-course-for-beginners/">Android phone course for beginners</a>, <a href="/how-to-sign-a-pdf/">sign a PDF without printing it</a>, <a href="/emails-on-computer-but-not-phone/">emails on the computer but not the phone</a> and <a href="/webcam-mic-test/">webcam and microphone test</a>.</p>',
}

NTLWORLD = {
    'slug': 'ntlworld-blueyonder-email-not-working',
    'title': 'ntlworld or Blueyonder Email Not Working? Log In and Fix',
    'metaDesc': 'ntlworld, Blueyonder and virgin.net addresses are Virgin Media email. Where to log in, the app password Outlook and phones need, and the Junara change.',
    'ogTitle': 'ntlworld or Blueyonder email not working? Here is why',
    'crumbName': 'ntlworld &amp; Blueyonder Email',
    'eyebrow': '// NTLWORLD, BLUEYONDER, VIRGIN.NET',
    'h1': 'ntlworld or Blueyonder email <em class="grad grad--cyan">not working</em>?',
    'lede': 'You&rsquo;ve had the same ntlworld or Blueyonder address for twenty years and today it won&rsquo;t open, won&rsquo;t send, or keeps asking for a password. These addresses are Virgin Media email, and two things catch people out: the app password that Outlook and phones need, and the move to Junara. Here&rsquo;s how to log in, find out which it is, and fix it.',
    'chips': ['ntlworld, Blueyonder, virgin.net', 'Windows PCs', 'Quickest checks first'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Start with the checks', '#s2'],
    'ctaHead': 'Still can&rsquo;t get in?',
    'ctaSub': 'We sort it on your Windows PC while you watch, or move the whole mailbox to Gmail for you. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Whose email is it?', 'ntlworld.com, blueyonder.co.uk and virgin.net are all Virgin Media Mail, the same system as virginmedia.com.'),
        ('Log in on the web', 'mail.virginmedia.com, with the full email address and its password.'),
        ('Web fine, Outlook not?', 'Outlook, phones and tablets need a Virgin Media Mail <strong>app password</strong>, not the normal one.'),
        ('Moved to Junara?', 'Then you sign in at junara.com instead.'),
        ('Missed the Junara date?', 'The mailbox is suspended; you have 120 days to sign up before it&rsquo;s deleted for good.'),
        ('Emails about it', 'Virgin&rsquo;s emails have no sign-up link. Type junara.com yourself; never click one.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHOSE EMAIL IS IT?', 'h2': 'ntlworld and Blueyonder are Virgin Media email',
         'html': '<p>ntlworld addresses began with NTL&rsquo;s broadband, and Blueyonder with Telewest&rsquo;s. The two firms joined to become Virgin Media, and their email, with virgin.net, now all runs on <strong>Virgin Media Mail</strong>, the same system as virginmedia.com addresses.</p>'
                 '<p>So whatever the address says, the help, the settings and the log-in are Virgin Media&rsquo;s, and everything below applies to all of them.</p>'
                 '<p style="margin:.2rem 0 0">__YT_NTL__</p>'},
        {'eyebrow': '/02 &mdash; CHECK ONE', 'h2': 'Log in on the web first',
         'html': '<ol>'
                 '<li>Open your web browser, type <strong>mail.virginmedia.com</strong> into the address bar yourself, and press Enter.</li>'
                 '<li>Sign in with the <strong>whole email address</strong> (name@ntlworld.com, say, not just the name) and that mailbox&rsquo;s password.</li>'
                 '<li>Forgotten the password? Use the forgotten-password link on the sign-in page and follow Virgin&rsquo;s steps.</li>'
                 '</ol>'
                 '<p><strong>If it opens and your emails are there,</strong> the mailbox is fine and the problem is in Outlook or the phone: go to check two. <strong>If it says the account is suspended or moved,</strong> go to check three. <strong>If you&rsquo;ve already signed up with Junara,</strong> your mail now lives there: sign in at <strong>junara.com</strong> instead.</p>'},
        {'eyebrow': '/03 &mdash; CHECK TWO', 'h2': 'Works on the web, but not in Outlook or on the phone?',
         'html': '<p>Outlook, phones and tablets don&rsquo;t use your normal Virgin Media Mail password. They need a <strong>Virgin Media Mail app password</strong>, made in your Virgin Media account:</p>'
                 '<ol>'
                 '<li>Sign in to <strong>My Virgin Media</strong> (the My Virgin Media app on a phone is the surest place).</li>'
                 '<li>Go to <strong>Account settings</strong>, then <strong>Account details</strong>, and under Virgin Media Mail choose <strong>Manage</strong> next to <strong>Manage your Virgin Media Mail app password</strong>.</li>'
                 '<li>Choose <strong>Generate new App password</strong> and type it into Outlook, or the phone, where it asks for the password.</li>'
                 '</ol>'
                 '<p><strong>Careful:</strong> making a new app password stops the old one. Every phone and tablet already reading that mailbox will need the new one too, so list them first.</p>'
                 '<p>The settings, if Outlook asks: incoming <strong>imap.virginmedia.com</strong>, port 993, SSL; outgoing <strong>smtp.virginmedia.com</strong>, port 465, SSL; user name = the whole email address; password = the app password. Step-by-step for Outlook, including the second-mailbox trap: <a href="/virgin-media-email-wont-add-to-new-outlook/">Virgin Media email won&rsquo;t add to Outlook</a>.</p>'},
        {'eyebrow': '/04 &mdash; CHECK THREE', 'h2': 'Stopped suddenly? The move to Junara',
         'html': '<p>In September 2026 Virgin Media O2 announced it is handing all its email, ntlworld, Blueyonder and virgin.net included, to an email company called <strong>Junara</strong>. Virgin is emailing customers in batches, each with a sign-up date at least 45 days later. To keep the address, you sign up with Junara before that date.</p>'
                 '<ul>'
                 '<li><strong>If the date passed,</strong> the mailbox is suspended: Outlook shows send and receive errors, though old emails can still be seen. You then have <strong>120 days</strong> to sign up with Junara before the mailbox is deleted for good.</li>'
                 '<li><strong>Left Virgin Media</strong> but still use the address? It&rsquo;s included, and former customers go straight onto a paid Junara plan.</li>'
                 '<li><strong>Keep it or move it?</strong> That decision, with the costs, the deadlines and the fake-email warning, is on <a href="/virgin-media-email-moving-to-junara/">Virgin Media email moving to Junara</a>.</li>'
                 '</ul>'},
        {'eyebrow': '/05 &mdash; RATHER NOT DEPEND ON IT?', 'h2': 'Move it to Gmail, and keep every email',
         'html': '<p>If you&rsquo;ve left Virgin, have several old addresses in the house, or just want an address that doesn&rsquo;t depend on your broadband, you can move to a free Gmail address and take your emails and folders with you, while the old mailbox is still open.</p>'
                 '<p>Our free 365 PC Manager app does the copying on a Windows PC, or we do the whole move for &pound;60 per email address, agreed before we start: see <a href="/move-virgin-media-email-to-gmail/">move Virgin Media email to Gmail</a>.</p>'},
        {'eyebrow': '/06 &mdash; WATCH OUT', 'h2': 'Fake &ldquo;your email is closing&rdquo; messages',
         'html': '<p>Scammers know older ntlworld and Blueyonder addresses belong to people who&rsquo;d hate to lose them. Expect emails and texts saying your account closes today unless you click, pay or &ldquo;verify&rdquo;.</p>'
                 '<ul>'
                 '<li>Virgin&rsquo;s own emails about the change have <strong>no sign-up link</strong> in them.</li>'
                 '<li>Never pay, or type your password, through a link in an email or text, or over the phone to someone who rang you.</li>'
                 '<li>Type <strong>mail.virginmedia.com</strong> or <strong>junara.com</strong> into the browser yourself.</li>'
                 '<li>Already clicked and typed your password? Change it straight away and see <a href="/i-think-ive-been-hacked/">I think I&rsquo;ve been hacked</a>.</li>'
                 '</ul>'},
        {'eyebrow': '/07 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _CALL.format(extra=' We can get Outlook working with the app password, check where you stand with Junara, or move the mailbox to Gmail for you. We work on Windows PCs: we don&rsquo;t support email on Macs, iPads or iPhones.')},
    ],
    'howToName': 'How to fix ntlworld or Blueyonder email that has stopped working',
    'howToSteps': [
        {'name': 'Log in on the web', 'text': 'Type mail.virginmedia.com into your browser and sign in with the whole email address and its password. Signed up with Junara already? Sign in at junara.com.'},
        {'name': 'Fix Outlook or the phone with an app password', 'text': 'If the web works but Outlook or the phone does not, make a Virgin Media Mail app password in My Virgin Media and use it there. A new one stops the old one.'},
        {'name': 'Check your Junara date', 'text': 'Find Virgin&rsquo;s email about the change. If the sign-up date has passed, the mailbox is suspended: sign up with Junara within 120 days, or it is deleted.'},
        {'name': 'Keep it or move it', 'text': 'Sign up with Junara yourself at junara.com to keep the address, or move your emails to a free Gmail address while the mailbox is open.'},
    ],
    'faqs': [
        {'q': 'How do I log in to my ntlworld email?', 'a': '<p>Type mail.virginmedia.com into your browser and sign in with your whole ntlworld address and its password. ntlworld is Virgin Media email, so it&rsquo;s the same sign-in as virginmedia.com. If you&rsquo;ve signed up with Junara, sign in at junara.com instead.</p>'},
        {'q': 'Is Blueyonder email still working?', 'a': '<p>Yes, Blueyonder addresses still run on Virgin Media Mail, but they are part of Virgin&rsquo;s move to Junara. Each customer gets a sign-up date by email; after it, an address that hasn&rsquo;t been signed up is suspended and later deleted.</p>'},
        {'q': 'Why has my ntlworld email stopped working in Outlook?', 'a': '<p>Usually because Outlook needs a Virgin Media Mail app password rather than your normal password, or because the mailbox has been suspended after a missed Junara sign-up date. Log in at mail.virginmedia.com first: if that works, it&rsquo;s the app password.</p>'},
        {'q': 'Where do I get a Virgin Media app password?', 'a': '<p>In My Virgin Media (the app is the surest place): Account settings, Account details, then under Virgin Media Mail, Manage your Virgin Media Mail app password, Generate new App password. Making a new one stops the old one on every other device.</p>'},
        {'q': 'Is ntlworld email closing?', 'a': '<p>Virgin Media is handing all its email, ntlworld included, to Junara. You can keep the address by signing up with Junara before your date, move to another provider such as Gmail, or let it close. See <a href="/virgin-media-email-moving-to-junara/">Virgin Media email moving to Junara</a>.</p>'},
        {'q': 'Can you fix it for me remotely?', 'a': '<p>Yes, on a Windows PC. With your permission we connect while you watch, get Outlook working, or move the mailbox to Gmail for &pound;60 per address, agreed before we start.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/virgin-media-email-moving-to-junara/">Virgin Media email moving to Junara</a>, <a href="/virgin-media-email-wont-add-to-new-outlook/">Virgin Media email won&rsquo;t add to Outlook</a>, <a href="/move-virgin-media-email-to-gmail/">move Virgin Media email to Gmail</a>, <a href="/emails-on-computer-but-not-phone/">emails on the computer but not the phone</a> and <a href="/email-support/">email help</a>.</p>',
}


# ============================================================ 13-14. From the Unknown Tech channel study (27 Oct 2026)
# Owner, 27 Oct 2026: "build 1, 2 and 4 and do the Shorts" (seo-research/channel-ucunk-2026-10-27/FINDINGS.md). A Windows-
# customisation YouTube channel gets millions of views making Windows "look like" something else; the home-user version of
# that wish is what people search on Bing, and the site had no page for any of it:
#   - Spotlight: Bing "learn about this picture" 19.0K in 3 months to 24 Oct (UK 985) + "this pic icon" 4.7K, "learn about
#     this picture remove" 3.1K, "learn more about this picture" 2.3K; "windows spotlight" 15.9K (UK 882). Bing's top 10 is
#     forums and how-to blogs. Facts: Microsoft Learn "What's new in Windows 11, version 25H2" (the icon is part of Windows
#     Spotlight); Microsoft Q&A (switching the background to Picture, Solid colour or Slideshow removes the icon; no
#     supported setting keeps Spotlight and hides it); and the film-studio VM (Windows 11 Pro 26H2, 27 Oct 2026): clicking
#     the icon opens a Bing page about the picture in Edge; right-clicking it opens a panel with the picture's story, four
#     pictures to swap to, thumbs up / down and Learn more; a selected photo in File Explorer has Set as background in the
#     command bar;
#     right-clicking the desktop offers Next background and Explore background; on an unactivated PC the Background page
#     is greyed out ("You need to activate Windows before you can personalise your PC") but right-clicking a photo and
#     choosing Set as desktop background still works.
#   - Windows 11 like Windows 10: Bing "turn off dark mode" 4.9K (UK 488), "pin to taskbar" 6.0K (UK 503), "change mouse
#     pointer" 4.0K (UK 457), "move taskbar to left" 1.0K (UK 225) + "how to move taskbar to left" 1.1K, "taskbar
#     disappeared" 602; YouTube Shorts on moving the taskbar left 269K / 153K views. Facts: Microsoft Support "Customize the
#     Windows Start menu" (Taskbar behaviours > Taskbar alignment); Microsoft's Insider blog 15 May 2026 (Recommended renamed
#     Recent; the taskbar on any edge); the VM (26H2 26300.9711, a normal release, not Insider): Taskbar behaviours holds
#     Taskbar position (Bottom / Top / Left / Right) and Taskbar icon alignment; Start's Recent ticks (Show recently added apps / Show recent and suggested files / Show tips and app
#     recommendations), All with View: Category / Grid / List, Shift + right-click = the full menu. Built-in settings
#     only: customising apps are named, not recommended (we fix the PCs they break after big updates).
SPOTLIGHT = {
    'slug': 'learn-about-this-picture',
    'title': 'Learn About This Picture: What It Is and How to Remove It',
    'metaDesc': 'The Learn about this picture icon on your desktop is Windows Spotlight, from Microsoft, not a virus. What it does, and how to remove it in a minute.',
    'ogTitle': 'What is &ldquo;Learn about this picture&rdquo; on my desktop?',
    'crumbName': 'Learn About This Picture',
    'eyebrow': '// A NEW ICON ON YOUR DESKTOP?',
    'h1': 'What is <em class="grad grad--cyan">&ldquo;Learn about this picture&rdquo;</em> on my desktop?',
    'lede': 'An icon saying <strong>Learn about this picture</strong> has appeared on your desktop, and the picture behind it keeps changing. It isn&rsquo;t a virus, and nothing has been installed behind your back: it&rsquo;s <strong>Windows Spotlight</strong>, Microsoft&rsquo;s picture-of-the-day feature. Here&rsquo;s what it does, and how to get rid of it in under a minute.',
    'chips': ['Part of Windows, not a virus', 'Gone in a minute', 'Windows 11 and 10'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Remove it', '#s2'],
    'ctaHead': 'Rather we sorted it?',
    'ctaSub': 'With your permission we connect to your Windows PC and put your own photo back on the desktop, the lock screen too, while you watch. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it is', 'Windows Spotlight: Microsoft puts a new photo on your desktop, and the icon tells you about it.'),
        ('Is it safe?', 'Yes. It&rsquo;s part of Windows. Clicking it only opens a web page about the photo, in Microsoft Edge.'),
        ('Quickest way to remove it', 'Right-click one of your own photos and choose <strong>Set as desktop background</strong>. The icon goes with Spotlight.'),
        ('The Settings way', 'Settings, Personalisation, Background: choose <strong>Picture</strong>, <strong>Solid colour</strong> or <strong>Slideshow</strong>.'),
        ('Keep Spotlight, lose the icon?', 'Windows has no setting for that: the icon comes with Spotlight.'),
        ('The lock screen', 'It has its own Spotlight setting: Settings, Personalisation, Lock screen.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHAT IT IS', 'h2': 'It&rsquo;s Windows Spotlight, from Microsoft',
         'html': '<p><strong>Windows Spotlight</strong> swaps your desktop picture for a new photograph from Microsoft, usually a landscape somewhere in the world, and puts the <strong>Learn about this picture</strong> icon on the desktop to go with it. It&rsquo;s switched on by default on many new PCs, and some people find it turned on after an update, which is why it can seem to appear from nowhere.</p>'
                 '<ul>'
                 '<li><strong>Click the icon</strong> and Microsoft Edge opens a Bing page about the picture: where it was taken, and more like it. That&rsquo;s all it does: it doesn&rsquo;t change your files or your settings.</li>'
                 '<li><strong>Right-click it</strong> on newer versions of Windows 11 and a small panel opens instead, with the picture&rsquo;s story, a few other pictures to swap to, and a thumbs up or down to see more or fewer like it.</li>'
                 '<li><strong>Right-click the desktop</strong> and you&rsquo;ll also see <strong>Next background</strong> and <strong>Explore background</strong>: they belong to Spotlight too.</li>'
                 '</ul>'
                 '<p>If you like a new picture every day, there&rsquo;s nothing to fix. If you&rsquo;d rather have your own photo back, read on.</p>'},
        {'eyebrow': '/02 &mdash; THE QUICKEST WAY', 'h2': 'Remove it: put one of your own photos on the desktop',
         'html': '<ol>'
                 '<li>Open <strong>File Explorer</strong> (the yellow folder on the taskbar) and go to <strong>Pictures</strong>, or wherever your photos are.</li>'
                 '<li><strong>Right-click</strong> the photo you&rsquo;d like on your desktop.</li>'
                 '<li>Choose <strong>Set as desktop background</strong>. (Or click the photo once and choose <strong>Set as background</strong> along the top of the window.)</li>'
                 '</ol>'
                 '<p>Your photo fills the desktop, Spotlight switches off, and the <strong>Learn about this picture</strong> icon disappears. A grandchild, the dog, a favourite view: it&rsquo;s your desktop. This way works even when the Settings page is greyed out.</p>'
                 '<p style="margin:.2rem 0 0">__YT_SPOT__</p>'},
        {'eyebrow': '/03 &mdash; THE SETTINGS WAY', 'h2': 'Or switch Spotlight off in Settings',
         'html': '<ol>'
                 '<li><strong>Right-click</strong> an empty part of the desktop and choose <strong>Personalise</strong>, then <strong>Background</strong>. (Or Start, Settings, Personalisation, Background.)</li>'
                 '<li>Next to <strong>Personalise your background</strong>, change <strong>Windows spotlight</strong> to one of these:'
                 '<ul>'
                 '<li><strong>Picture:</strong> one photo that stays put. Choose one of Windows&rsquo; own, or <strong>Browse photos</strong> for one of yours.</li>'
                 '<li><strong>Solid colour:</strong> a plain background, the easiest for spotting your icons.</li>'
                 '<li><strong>Slideshow:</strong> your own photos from a folder you pick, changing as often as you like.</li>'
                 '</ul></li>'
                 '</ol>'
                 '<p>The icon goes as soon as you choose. Want Spotlight back one day? Choose <strong>Windows spotlight</strong> in the same list.</p>'
                 '<p><strong>Greyed out, with a message about activating Windows?</strong> Windows won&rsquo;t change these settings until it&rsquo;s activated: use the photo way in <a href="#s2">step two</a>, and see <a href="#s6">why it might not be activated</a>. On a work PC, the IT department may have locked the background.</p>'},
        {'eyebrow': '/04 &mdash; SPOTLIGHT WITHOUT THE ICON?', 'h2': 'Can I keep the pictures and lose the icon?',
         'html': '<p>Not with a setting: Windows treats the icon as part of Spotlight, so it&rsquo;s both or neither. You can drag the icon to a corner where it&rsquo;s out of the way.</p>'
                 '<p>Some websites suggest a registry change to hide it. We don&rsquo;t recommend that on a home PC: a slip in the registry can cause far more trouble than an icon, and an update can undo it anyway. If you like the changing pictures, a <strong>Slideshow</strong> of your own photos (above) gives you a different picture each day, with no icon.</p>'},
        {'eyebrow': '/05 &mdash; THE LOCK SCREEN', 'h2': 'The lock screen picture keeps changing too?',
         'html': '<p>The lock screen (the picture with the clock, before you sign in) has its own Spotlight setting, separate from the desktop:</p>'
                 '<ol>'
                 '<li>Open <strong>Settings</strong>, then <strong>Personalisation</strong>, then <strong>Lock screen</strong>.</li>'
                 '<li>Next to <strong>Personalise your lock screen</strong>, choose <strong>Picture</strong> or <strong>Slideshow</strong> instead of <strong>Windows spotlight</strong>.</li>'
                 '<li>Don&rsquo;t want the tips and facts written over it? Untick <strong>Get fun facts, tips, tricks and more on your lock screen</strong>.</li>'
                 '</ol>'},
        {'eyebrow': '/06 &mdash; IS IT A VIRUS?', 'h2': 'Is it a virus or a scam?',
         'html': '<p>No. The icon and the changing pictures are Microsoft&rsquo;s own, and clicking them only shows you information about the photo. Two things are worth knowing, though:</p>'
                 '<ul>'
                 '<li><strong>A pop-up that says your PC is infected</strong> and gives a phone number to call is a different thing altogether: that is a scam. Close the browser and never ring the number. See <a href="/scam-pop-up-help-poole/">scam pop-up help</a>.</li>'
                 '<li><strong>&ldquo;You need to activate Windows&rdquo;</strong> on the Background page means Windows thinks it isn&rsquo;t licensed: often after a new motherboard, or when a key bought cheaply online has been blocked. We can check what&rsquo;s going on.</li>'
                 '</ul>'},
        {'eyebrow': '/07 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _CALL.format(extra=' We put your own photo back on the desktop and the lock screen, tidy away the icons you don&rsquo;t use, and show you how to change it yourself next time.')},
    ],
    'howToName': 'How to remove Learn about this picture from the Windows desktop',
    'howToSteps': [
        {'name': 'Find a photo of your own', 'text': 'Open File Explorer and go to Pictures, or wherever your photos are.'},
        {'name': 'Set it as the background', 'text': 'Right-click the photo and choose Set as desktop background. Spotlight switches off and the icon goes.'},
        {'name': 'Or use Settings', 'text': 'Right-click the desktop, choose Personalise, then Background, and change Windows spotlight to Picture, Solid colour or Slideshow.'},
        {'name': 'Do the lock screen too', 'text': 'Settings, Personalisation, Lock screen: choose Picture or Slideshow instead of Windows spotlight.'},
    ],
    'faqs': [
        {'q': 'What is the Learn about this picture icon on my desktop?', 'a': '<p>It belongs to Windows Spotlight, Microsoft&rsquo;s feature that puts a new photo on your desktop. Clicking it tells you about the picture. It&rsquo;s part of Windows, not a virus.</p>'},
        {'q': 'How do I remove Learn about this picture?', 'a': '<p>Right-click one of your own photos and choose Set as desktop background, or go to Settings, Personalisation, Background and change Windows spotlight to Picture, Solid colour or Slideshow. The icon disappears straight away.</p>'},
        {'q': 'Can I delete the Learn about this picture icon?', 'a': '<p>Not on its own: there&rsquo;s no delete option, and Windows has no setting to keep Spotlight without it. Switching Spotlight off removes it.</p>'},
        {'q': 'Why does my desktop picture change every day?', 'a': '<p>That&rsquo;s Windows Spotlight. Choose Picture instead of Windows spotlight in Settings, Personalisation, Background, and the picture stays put.</p>'},
        {'q': 'Why can&rsquo;t I change my desktop background?', 'a': '<p>If the Background page is greyed out with a message about activating Windows, Windows won&rsquo;t change it until it&rsquo;s activated, but right-clicking a photo and choosing Set as desktop background still works. On a work PC, the IT department may have locked it.</p>'},
        {'q': 'Can you sort it out for me remotely?', 'a': '<p>Yes. With your permission we connect to your Windows PC and put your own photo back on the desktop and the lock screen. Remote help from &pound;20, no fix, no fee.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/make-windows-11-look-like-windows-10/">make Windows 11 feel like Windows 10</a>, <a href="/how-to-back-up-your-photos/">back up your photos</a>, <a href="/phone-link-android/">get your phone&rsquo;s photos onto your PC</a>, <a href="/windows-accessibility-features-guide/">bigger text and pointer</a> and <a href="/windows-11-course-for-beginners/">Windows 11 for beginners</a>.</p>',
}

W11LIKE10 = {
    'slug': 'make-windows-11-look-like-windows-10',
    'title': 'Make Windows 11 Look Like Windows 10 (Nothing to Install)',
    'metaDesc': 'Windows 11 feels all wrong? Put Start back on the left, turn off dark mode, tidy the Start menu and get the full right-click menu. Nothing to install.',
    'ogTitle': 'Make Windows 11 feel like Windows 10, without installing anything',
    'crumbName': 'Make Windows 11 Look Like Windows 10',
    'eyebrow': '// WINDOWS 11 FEELS ALL WRONG?',
    'h1': 'Make Windows 11 <em class="grad grad--cyan">feel like Windows 10</em>',
    'lede': 'You&rsquo;ve moved to Windows 11, or a new PC came with it, and nothing is where it used to be: the Start button is in the middle, the menu is full of suggestions and right-clicking shows half the options. You don&rsquo;t need extra software to feel at home again. These settings are already in Windows, each takes under a minute, and each can be put back.',
    'chips': ['Nothing to install', 'Each one under a minute', 'All can be undone'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Start with the Start button', '#s1'],
    'ctaHead': 'Rather we set it up the way you like?',
    'ctaSub': 'With your permission we connect to your Windows 11 PC and make these changes while you watch, then show you where everything is. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Start button on the left', 'Settings, Personalisation, Taskbar, Taskbar behaviours, Taskbar (icon) alignment: <strong>Left</strong>.'),
        ('Dark mode off', 'Settings, Personalisation, Colours, Choose your mode: <strong>Light</strong>.'),
        ('Your programs on the taskbar', 'Open the program, right-click its icon on the taskbar, <strong>Pin to taskbar</strong>.'),
        ('A calmer Start menu', 'Settings, Personalisation, Start: switch off the tips and suggestions.'),
        ('The full right-click menu', '<strong>Show more options</strong> at the bottom, or hold <strong>Shift</strong> as you right-click.'),
        ('Bigger pointer and text', 'Settings, Accessibility: Mouse pointer and touch, and Text size.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; THE START BUTTON', 'h2': 'Put the Start button back on the left',
         'html': '<ol>'
                 '<li><strong>Right-click</strong> an empty part of the taskbar (the bar along the bottom) and choose <strong>Taskbar settings</strong>.</li>'
                 '<li>Scroll down and click <strong>Taskbar behaviours</strong> to open it.</li>'
                 '<li>Next to <strong>Taskbar alignment</strong> (on the newest Windows 11 it&rsquo;s called <strong>Taskbar icon alignment</strong>), change <strong>Centre</strong> to <strong>Left</strong>.</li>'
                 '</ol>'
                 '<p>The Start button and your taskbar icons slide into the bottom-left corner, where they were in Windows 10, and the Start menu opens from there. Changed your mind? Choose <strong>Centre</strong> again.</p>'
                 '<p><strong>Want the whole taskbar at the top, or down one side?</strong> The newest version of Windows 11 (the 2026 update) adds <strong>Taskbar position</strong> to the same section: <strong>Bottom</strong>, <strong>Top</strong>, <strong>Left</strong> or <strong>Right</strong>. If yours doesn&rsquo;t show it, the PC hasn&rsquo;t had that update yet.</p>'
                 '<p style="margin:.2rem 0 0">__YT_W11LEFT__</p>'},
        {'eyebrow': '/02 &mdash; DARK MODE', 'h2': 'Turn dark mode off (or on)',
         'html': '<p>Black windows and menus where everything used to be white? That&rsquo;s dark mode. To change it:</p>'
                 '<ol>'
                 '<li>Open <strong>Settings</strong>, then <strong>Personalisation</strong>, then <strong>Colours</strong>.</li>'
                 '<li>Next to <strong>Choose your mode</strong>, pick <strong>Light</strong> (or <strong>Dark</strong>, if you prefer it).</li>'
                 '</ol>'
                 '<p><strong>Custom</strong> lets you have Windows one way and your programs the other. Word, Excel and Outlook have their own setting, under <strong>File</strong>, <strong>Account</strong> (in Outlook, <strong>Office Account</strong>), <strong>Office Theme</strong>.</p>'
                 '<p>Not dark mode, but a black screen with bright yellow or white text? That&rsquo;s high contrast, an accessibility setting: press <strong>Left Alt</strong> + <strong>Left Shift</strong> + <strong>Print Screen</strong> to switch it off. More in <a href="/windows-accessibility-features-guide/#accidental">switched one on by accident?</a></p>'},
        {'eyebrow': '/03 &mdash; YOUR PROGRAMS', 'h2': 'Pin your programs to the taskbar, and hide what you don&rsquo;t use',
         'html': '<ul>'
                 '<li><strong>Pin a program:</strong> open it as normal, then right-click its icon on the taskbar and choose <strong>Pin to taskbar</strong>. It stays there after you close it, one click away.</li>'
                 '<li><strong>Remove one:</strong> right-click it and choose <strong>Unpin from taskbar</strong>. The program isn&rsquo;t deleted, only the shortcut.</li>'
                 '<li><strong>A search box like Windows 10&rsquo;s:</strong> Settings, Personalisation, Taskbar, then under <strong>Taskbar items</strong> set <strong>Search</strong> to <strong>Search box</strong>. Or hide it.</li>'
                 '<li><strong>Widgets and Task view</strong> (the weather and news panel, and the button that shows every open window) can be switched off in the same place.</li>'
                 '</ul>'},
        {'eyebrow': '/04 &mdash; THE START MENU', 'h2': 'A calmer Start menu, with a list of everything',
         'html': '<p>Windows 11&rsquo;s Start menu mixes your programs with recent files and Microsoft&rsquo;s suggestions. To keep it to what you use:</p>'
                 '<ol>'
                 '<li>Open <strong>Settings</strong>, then <strong>Personalisation</strong>, then <strong>Start</strong>.</li>'
                 '<li>Switch off the suggestions. On newer PCs, untick <strong>Show tips and app recommendations</strong> (and <strong>Show recent and suggested files</strong>, if you&rsquo;d rather not see recent files) under <strong>Recent</strong>. On older ones, switch off <strong>Show recommendations for tips, shortcuts, new apps and more</strong>.</li>'
                 '<li>Rather not have the section at all? On newer PCs, switch <strong>Recent</strong> itself off: Start then shows just your pinned programs and the list of everything.</li>'
                 '</ol>'
                 '<p><strong>Missing Windows 10&rsquo;s A to Z list of programs?</strong> On newer PCs, open Start, scroll to <strong>All</strong>, and change <strong>View</strong> to <strong>List</strong>. On older ones, click <strong>All apps</strong> at the top right of the Start menu.</p>'
                 '<p>The section is called <strong>Recommended</strong> on some PCs and <strong>Recent</strong> on newer ones: Microsoft renamed it in 2026. Same thing.</p>'
                 '<p style="margin:.2rem 0 0">__YT_W11LIKE__</p>'},
        {'eyebrow': '/05 &mdash; RIGHT-CLICK', 'h2': 'Get the full right-click menu',
         'html': '<p>Windows 11 shortens the menu you get when you right-click, and moves the rest out of sight. Three ways to get all of it:</p>'
                 '<ul>'
                 '<li>Choose <strong>Show more options</strong> at the bottom of the menu.</li>'
                 '<li>Hold <strong>Shift</strong> while you right-click: the full Windows 10-style menu opens straight away.</li>'
                 '<li>Select a file and press <strong>Shift</strong> + <strong>F10</strong> on the keyboard.</li>'
                 '</ul>'
                 '<p>There&rsquo;s no setting to make the full menu the normal one. Registry changes that claim to do it exist, but we don&rsquo;t recommend them on a home PC.</p>'},
        {'eyebrow': '/06 &mdash; EASIER TO SEE', 'h2': 'A bigger pointer and bigger text',
         'html': '<ul>'
                 '<li><strong>Mouse pointer:</strong> Settings, <strong>Accessibility</strong>, <strong>Mouse pointer and touch</strong>. Drag <strong>Size</strong> to the right, and pick a colour that stands out if it helps.</li>'
                 '<li><strong>Text:</strong> Settings, <strong>Accessibility</strong>, <strong>Text size</strong>. Drag the slider, then press <strong>Apply</strong>.</li>'
                 '<li><strong>The desktop picture changes every day</strong>, with a <strong>Learn about this picture</strong> icon? That&rsquo;s Windows Spotlight: see <a href="/learn-about-this-picture/">how to put your own photo back</a>.</li>'
                 '</ul>'
                 '<p>More in our <a href="/windows-accessibility-features-guide/">Windows accessibility guide</a>.</p>'},
        {'eyebrow': '/07 &mdash; APPS THAT PROMISE THE OLD LOOK', 'h2': 'What about apps that bring back Windows 10?',
         'html': '<p>Programs such as <strong>Open-Shell</strong> (free, the successor to Classic Shell) and <strong>Start11</strong> (paid) go further than the settings above, right down to the old Start menu. They work by changing how Windows itself behaves, so a big Windows update can stop them working, and on the PCs we&rsquo;re asked to fix, that sometimes means a Start menu or taskbar that won&rsquo;t open.</p>'
                 '<p>Try the built-in settings first: for most people they&rsquo;re enough. If you do install one, get it from the maker&rsquo;s own website, never a download site, and keep it updated.</p>'},
        {'eyebrow': '/08 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _CALL.format(extra=' We make these changes with you on your PC, pin the programs you use, and show you where everything lives now. Upgrading from Windows 10? See our <a href="/windows-11-upgrade-service/">Windows 11 upgrade service</a>: your files come with you.')},
    ],
    'howToName': 'How to make Windows 11 look and feel like Windows 10',
    'howToSteps': [
        {'name': 'Move the Start button to the left', 'text': 'Right-click the taskbar, choose Taskbar settings, open Taskbar behaviours and set Taskbar alignment (Taskbar icon alignment on the newest Windows 11) to Left.'},
        {'name': 'Turn off dark mode', 'text': 'Settings, Personalisation, Colours: set Choose your mode to Light.'},
        {'name': 'Pin your programs', 'text': 'Open each program you use, right-click its taskbar icon and choose Pin to taskbar.'},
        {'name': 'Tidy the Start menu', 'text': 'Settings, Personalisation, Start: switch off the tips and recommendations, or Recent altogether. In Start, set All to View: List for an A to Z list.'},
        {'name': 'Use the full right-click menu', 'text': 'Choose Show more options, or hold Shift while you right-click.'},
    ],
    'faqs': [
        {'q': 'Can I make Windows 11 look exactly like Windows 10?', 'a': '<p>Not exactly with the built-in settings, but they get you most of the way: Start on the left, a plain Start menu, a search box, light mode and the full right-click menu. Third-party apps such as Open-Shell or Start11 go further, at the risk of breaking after big updates.</p>'},
        {'q': 'How do I move the Start button to the left in Windows 11?', 'a': '<p>Right-click the taskbar, choose Taskbar settings, open Taskbar behaviours, and set Taskbar alignment to Left. On the newest Windows 11 the setting is called Taskbar icon alignment.</p>'},
        {'q': 'Can I move the taskbar to the top or the side in Windows 11?', 'a': '<p>Yes, on the newest version of Windows 11 (the 2026 update): Settings, Personalisation, Taskbar, Taskbar behaviours, then Taskbar position: Bottom, Top, Left or Right. Older versions only let it sit along the bottom.</p>'},
        {'q': 'How do I get the old right-click menu in Windows 11?', 'a': '<p>Choose Show more options at the bottom of the menu, or hold Shift while you right-click to open the full menu straight away.</p>'},
        {'q': 'How do I turn off dark mode in Windows 11?', 'a': '<p>Settings, Personalisation, Colours, then set Choose your mode to Light. Word, Excel and Outlook have their own Office Theme under File, Account.</p>'},
        {'q': 'Can I go back to Windows 10?', 'a': '<p>Only in the first 10 days after upgrading, from Settings, System, Recovery, Go back. After that, going back means wiping the PC and starting again, so changing Windows 11&rsquo;s settings is usually the better answer.</p>'},
        {'q': 'Why are the Personalisation settings greyed out?', 'a': '<p>Usually because Windows isn&rsquo;t activated: it won&rsquo;t change the background or colours until it is. On a work PC, the IT department may have locked them.</p>'},
        {'q': 'Can you set it up for me?', 'a': '<p>Yes. With your permission we connect to your Windows 11 PC and make these changes while you watch. Remote help from &pound;20, no fix, no fee.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/learn-about-this-picture/">Learn about this picture on the desktop</a>, <a href="/windows-11-course-for-beginners/">Windows 11 for beginners</a>, <a href="/windows-accessibility-features-guide/">Windows accessibility guide</a>, <a href="/will-i-lose-files-upgrading-to-windows-11/">will I lose my files upgrading?</a> and <a href="/stop-programs-starting-with-windows/">stop programs starting with Windows</a>.</p>',
}


def symptom_pages(setup_url):
    """The pages, with the 365 PC Manager boxes filled in (the same boxes and wording as the feature pages)."""
    import pcm_feature_pages_data as pfp
    import yt_watch
    boxes = {
        # the same box and words as /wifi-qr-code-generator/ (pfp.tool_boxes)
        '__APP_BOX_WIFICARD__': pfp._app_box('wificard', 'Print a guest Wi-Fi card from your PC',
            '<p style="margin:0">Type your Wi-Fi name and password into our free app and it makes a card with the QR code, the network name and the password on it, ready to print or save as a picture. Visitors point their phone&rsquo;s camera at it and they&rsquo;re on. Your password isn&rsquo;t kept or sent anywhere.</p>', setup_url),
        '__YT_WIFI__': yt_watch.button(yt_watch.WIFI_SHORT, 'Watch it done in %s' % yt_watch.length(yt_watch.WIFI_SHORT[1]).replace('-second', ' seconds'), shape='tall'),
        '__YT_NTL__': yt_watch.button(yt_watch.NTL_SHORT, 'Watch the checks in %d seconds' % yt_watch.NTL_SHORT[1], shape='tall'),   # 27 Oct 2026, out 29 Oct
        # 28 Oct 2026: out 2, 3 and 4 Nov at 19:00 (hidden until then)
        '__YT_SPOT__': yt_watch.button(yt_watch.SPOT_SHORT, 'Watch it done in %d seconds' % yt_watch.SPOT_SHORT[1], shape='tall'),
        '__YT_W11LEFT__': yt_watch.button(yt_watch.W11LEFT_SHORT, 'Watch it done in %d seconds' % yt_watch.W11LEFT_SHORT[1], shape='tall'),
        '__YT_W11LIKE__': yt_watch.button(yt_watch.W11LIKE10_SHORT, 'Watch four changes in %d seconds' % yt_watch.W11LIKE10_SHORT[1], shape='tall'),
        '__APP_BOX_PRINTER__': pfp._app_box('printer', 'Printers: what&rsquo;s stuck, and one button to clear it',
            '<p style="margin:0">It lists every printer as Windows sees it, shows any documents stuck in the queue with a button that cancels only those, and tells you if Windows&rsquo; printing service has stopped. '
            'It only reads, until you press a button.</p>', setup_url, clip='printers'),
        '__APP_BOX_KEEP__': pfp._app_box('keepreplace', 'Keep it, upgrade it or replace it?',
            '<p style="margin:0">Its <strong>This PC</strong> page reads the facts from Windows, including the battery&rsquo;s wear, along with the drive, the memory, Windows 11 readiness and roughly how old the processor is. '
            'Then it gives a plain verdict &mdash; keep it, upgrade a part or replace it &mdash; and a drive that&rsquo;s failing always comes first: back up. No prices and no pressure.</p>', setup_url),
        '__APP_BOX_UPDATES__': pfp._app_box('updates', 'Windows Update: is it really getting updates?',
            '<p style="margin:0">It reads Windows&rsquo; own update history &mdash; the same list as Settings, Windows Update, Update history &mdash; and says in plain words when the monthly update last installed, whether one update is failing over and over, and whether an update is waiting for a restart. '
            'It never installs, removes or changes anything.</p>', setup_url),
    }
    out = []
    for d in (PRINTER, TOUCHPAD, ROTATE, CHARGING, UPDATES, PASSWORD, RESERVED, WIFI, CLIPBOARD, SECBOOT, PHONELINK, NTLWORLD, SPOTLIGHT, W11LIKE10):
        d = dict(d, sections=[dict(x) for x in d['sections']])
        for x in d['sections']:
            for k, v in boxes.items():
                x['html'] = x['html'].replace(k, v)
        out.append(d)
    return out


SYMPTOM_FLOWS = {
    PRINTER['slug']: {'h2': 'Get it back online, step by step', 'ask': 'Is it printing now?',
                      'tip': 'Print a test page from the program you were using.',
                      'h3s': 'Still offline after every step? That is a remote job.'},
    TOUCHPAD['slug']: {'h2': 'Get the touchpad working, step by step', 'ask': 'Does the touchpad work now?',
                       'tip': 'Try a two-finger scroll too, to be sure the driver is right.',
                       'h3s': 'Still dead after every step? That is a hardware job.'},
    ROTATE['slug']: {'h2': 'Put the screen the right way up, step by step', 'ask': 'Is it the right way up now?',
                     'tip': 'Restart once to be sure it stays that way.',
                     'h3s': 'Still the wrong way round? That is a remote job.'},
    CHARGING['slug']: {'h2': 'Get it charging, step by step', 'ask': 'Is it charging now?',
                       'tip': 'Leave it plugged in for 20 minutes and check the percentage has gone up.',
                       'h3s': 'Still not charging after every step? That is usually the battery or socket.'},
    UPDATES['slug']: {'h2': 'Get the updates through, step by step', 'ask': 'Has it got going?',
                      'tip': 'Check for updates once more afterwards: there may be another waiting.',
                      'h3s': 'Still stuck after every step? That is a remote job.'},
    PASSWORD['slug']: {'h2': 'Get back in, step by step', 'ask': 'Are you back in?',
                       'tip': 'Write the new password somewhere safe, or keep it in a password manager.',
                       'h3s': 'Still locked out? Ring us before you reset anything.'},
    RESERVED['slug']: {'h2': 'Free the space, step by step', 'ask': 'Did the update install?',
                       'tip': 'Check the free space again after the update, and before next year&rsquo;s.',
                       'h3s': 'Still under 15 MB free, or still failing? That is a remote job.'},
    # each step is another place to look, so "Not yet" moves on and "Yes" ends it
    WIFI['slug']: {'h2': 'Find the password, quickest way first', 'ask': 'Can you see the password?',
                   'yes': 'Yes, got it', 'no': 'Not yet',
                   'lede': 'One place to look at a time, quickest first. Tell it whether you found it and it shows the next place. Nothing here leaves your device.',
                   'h3f': 'Found it{mins}. Nice work.', 'plan_lead': 'Rather we looked after the Wi-Fi and printers for you?',
                   'tip': 'Use the QR code to get visitors on without reading the password out.',
                   'h3s': 'Still can&rsquo;t find it? That is a quick remote job.'},
    CLIPBOARD['slug']: {'h2': 'Set it up, step by step', 'mode': 'seq', 'yes': 'Done, next step', 'no': 'I am stuck here',
                        'last_yes': 'Done, all set', 'ask': 'Done that step?',
                        'lede': 'Work through it one step at a time: press <strong>Done</strong> when you have finished each step, or <strong>I am stuck here</strong> and we will take it from there. Nothing here leaves your device.',
                        'h3f': 'All set{mins}. Nice work.',
                        'tip': 'Pin your address and phone number: they&rsquo;ll always be two keys away.',
                        'h3s': 'Stuck at a step? We can set it up with you, remotely.'},
    SECBOOT['slug']: {'h2': 'Check it and sort it, step by step', 'ask': 'Does it say Fully updated?',
                      'yes': 'Yes, fully updated', 'no': 'Not yet',
                      'tip': 'Look again after next month&rsquo;s updates, to be sure it stays that way.',
                      'h3s': 'Still not updated after every step? That is a remote job.'},
    PHONELINK['slug']: {'h2': 'Set it up, step by step', 'mode': 'seq', 'yes': 'Done, next step', 'no': 'I am stuck here',
                        'last_yes': 'Done, all set', 'ask': 'Done that step?',
                        'lede': 'Work through it one step at a time: press <strong>Done</strong> when you have finished each step, or <strong>I am stuck here</strong> and we will take it from there. Nothing here leaves your device.',
                        'h3f': 'All linked{mins}. Nice work.',
                        'tip': 'Copy your photos into a folder, and keep a second copy: see how to back up your photos.',
                        'h3s': 'Stuck at a step? We can do the PC side with you, remotely.'},
    NTLWORLD['slug']: {'h2': 'Get your email back, step by step', 'ask': 'Is your email working now?',
                       'tip': 'Find Virgin&rsquo;s email about Junara and note your sign-up date.',
                       'h3s': 'Still not working after every step? That is a remote job.'},
    SPOTLIGHT['slug']: {'h2': 'Get rid of it, step by step', 'ask': 'Has the icon gone?',
                        'yes': 'Yes, it&rsquo;s gone', 'no': 'Not yet',
                        'tip': 'Do the lock screen too, in Settings, Personalisation, Lock screen.',
                        'h3s': 'Still there, or the settings are greyed out? That is a quick remote job.'},
    W11LIKE10['slug']: {'h2': 'Set it up, step by step', 'mode': 'seq', 'yes': 'Done, next step', 'no': 'I am stuck here',
                        'last_yes': 'Done, all set', 'ask': 'Done that step?',
                        'lede': 'Work through it one change at a time: press <strong>Done</strong> when you have finished each one, or <strong>I am stuck here</strong> and we will take it from there. Nothing here leaves your device.',
                        'h3f': 'All set{mins}. Welcome home.',
                        'tip': 'Pin the programs you use most, so they are always one click away.',
                        'h3s': 'Stuck at a step? We can set it up with you, remotely.'},
}
