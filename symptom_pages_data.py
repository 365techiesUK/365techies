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


# ============================================================ 15-19. PC-problem sweep (28 Oct 2026)
# Owner: "keyword research on Bing ... YouTube API ... see if we can do some more pages", then "yes build all five".
# Research: D:/claude/seo-research/pcm-problems-2026-10-28/FINDINGS.md. Bing Keyword Research, 3 months to 24 Oct 2026, UK:
# "system restore" 12,423, "reset this pc" 10,406, "windows backup app" 2,472, "smart app control" 2,180, "blue screen" 1,562
# + "blue screen of death" 567 + "critical process died" 77, "antimalware service executable" 1,676. None had a page (sitemap
# and H2s checked; /why-does-my-pc-keep-crashing/ covers crashes in general but no stop codes, so the blue screen page is
# about the code on the screen and links there). Each page carries the app box for the check the app really does
# (Ui.cs build 47: Safety > System Restore row; Photos & files > Backup; My PC > What keeps going wrong; Programs check).

# ============================================================ 15. System Restore or Reset this PC
RESTORE = {
    'slug': 'system-restore-vs-reset-this-pc',
    'title': 'System Restore or Reset this PC? Which One, What You Lose',
    'metaDesc': 'System Restore, Reset this PC, or the repair that keeps everything? What each one does to your files and programs, and which to try first.',
    'ogTitle': 'System Restore or Reset this PC: which one, and what you lose',
    'crumbName': 'System Restore or Reset this PC?',
    'eyebrow': '// SOMETHING WENT WRONG IN WINDOWS',
    'h1': 'System Restore or <em class="grad grad--cyan">Reset this PC</em>?',
    'lede': 'Windows has three ways to put itself right, and they are very different. System Restore takes Windows back to an earlier day and leaves your files alone. The Windows Update repair reinstalls Windows and keeps everything. Reset this PC starts Windows again from scratch, and your programs go. Try them in that order, lightest first.',
    'chips': ['Lightest fix first', 'What each one removes', 'Back up before a reset'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Which one to use', '#s1'],
    'ctaHead': 'Not sure which one your PC needs?',
    'ctaSub': 'With your permission we connect to your Windows PC, back up your files first, and use the lightest fix that works. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('System Restore', 'Takes Windows, programs and drivers back to an earlier day. <strong>Your files stay</strong>. It can be undone.'),
        ('Fix problems using Windows Update', 'Windows 11 only. Reinstalls Windows and <strong>keeps your files, programs and settings</strong>.'),
        ('Reset this PC, Keep my files', 'Fresh Windows. <strong>Your files stay; your programs and settings go</strong>.'),
        ('Reset this PC, Remove everything', 'Fresh Windows with <strong>nothing of yours left</strong>. For selling or giving away the PC.'),
        ('Before any of them', 'Copy your photos and documents to a USB drive or OneDrive.'),
        ('No restore points?', 'System Restore is switched off on many PCs. Switch it on now, for next time.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHICH ONE', 'h2': 'Which one to use',
         'html': '<ul>'
                 '<li><strong>It went wrong after an update, a new program or a new driver:</strong> <strong>System Restore</strong>, to a day before it happened.</li>'
                 '<li><strong>Windows itself is misbehaving, and System Restore didn&rsquo;t help or has no restore points:</strong> on Windows 11, <strong>Fix problems using Windows Update</strong>.</li>'
                 '<li><strong>It&rsquo;s been slow and odd for months, or a virus has been in it:</strong> <strong>Reset this PC</strong> and <strong>Keep my files</strong>, after a backup.</li>'
                 '<li><strong>You&rsquo;re selling it, giving it away or recycling it:</strong> <strong>Reset this PC</strong> and <strong>Remove everything</strong>, with the drive cleaned.</li>'
                 '</ul>'
                 '<p>The rule of thumb: start with the fix that changes least. You can always go further; you can&rsquo;t un-reset a PC.</p>'},
        {'eyebrow': '/02 &mdash; SYSTEM RESTORE', 'h2': 'System Restore: back to an earlier day',
         'html': '<p>A <strong>restore point</strong> is a snapshot of Windows&rsquo; own settings, programs and drivers. Windows usually makes one before an update or a new driver, and you can make one yourself. Going back to it undoes the changes made since. Your documents, photos and emails are not touched.</p>'
                 '<ol>'
                 '<li>Click Start, type <strong>restore point</strong> and open <strong>Create a restore point</strong>.</li>'
                 '<li>On the System Protection tab, click <strong>System Restore</strong>, then <strong>Next</strong>.</li>'
                 '<li>Pick a restore point from <strong>before</strong> the problem started. <strong>Scan for affected programs</strong> lists what will be removed (programs installed since) and what may come back.</li>'
                 '<li>Click <strong>Next</strong>, then <strong>Finish</strong>. The PC restarts, and it can take 15 minutes or more. Leave a laptop plugged in.</li>'
                 '</ol>'
                 '<p><strong>Changed your mind?</strong> Open System Restore again and choose <strong>Undo System Restore</strong>. (A restore run from the blue recovery screen can&rsquo;t be undone.)</p>'
                 '<p><strong>Windows won&rsquo;t start?</strong> After two or three failed starts Windows opens its recovery screen by itself. Choose <strong>Troubleshoot</strong>, <strong>Advanced options</strong>, <strong>System Restore</strong>.</p>'},
        {'eyebrow': '/03 &mdash; NO RESTORE POINTS?', 'h2': 'No restore points? Switch System Restore on now',
         'html': '<p>System Restore is <strong>switched off</strong> on many new Windows 11 PCs, so when something goes wrong there&rsquo;s nothing to go back to. Switch it on today, for next time:</p>'
                 '<ol>'
                 '<li>Open <strong>Create a restore point</strong> as above.</li>'
                 '<li>Select the Windows drive (usually <strong>C:</strong>), click <strong>Configure</strong>, choose <strong>Turn on system protection</strong>, and set Max Usage to about 5 to 10 per cent of the drive.</li>'
                 '<li>Click <strong>OK</strong>, then <strong>Create</strong> to make the first restore point now.</li>'
                 '</ol>'
                 '<p>It isn&rsquo;t a backup: restore points live on the same drive and don&rsquo;t include your files. If the drive fails, they go with it.</p>'},
        {'eyebrow': '/04 &mdash; THE REPAIR THAT KEEPS EVERYTHING', 'h2': 'Fix problems using Windows Update (Windows 11)',
         'html': '<p>Windows 11 can reinstall itself without touching your files, programs or settings. It repairs Windows&rsquo; own files, which fixes a lot of strange behaviour, and it&rsquo;s the step to try before a reset.</p>'
                 '<ol>'
                 '<li>Open <strong>Settings</strong>, <strong>System</strong>, <strong>Recovery</strong>.</li>'
                 '<li>Next to <strong>Fix problems using Windows Update</strong>, click <strong>Reinstall now</strong>.</li>'
                 '<li>Keep the PC plugged in and online. It downloads Windows, then restarts to install it, which takes an hour or so.</li>'
                 '</ol>'
                 '<p>It may not show on a PC that a work or school manages. More on Windows&rsquo; own repairs in <a href="/windows-update-stuck/">Windows Update stuck</a>.</p>'},
        {'eyebrow': '/05 &mdash; RESET THIS PC', 'h2': 'Reset this PC: what you keep and what goes',
         'html': '<p>Reset reinstalls Windows from scratch. Both choices remove <strong>every program you installed</strong>, including Microsoft Office, printer software and anything you paid for, and put Windows&rsquo; settings back to how they came.</p>'
                 '<ul>'
                 '<li><strong>Keep my files</strong> keeps what&rsquo;s in your own folders, such as Documents, Pictures and the Desktop. Windows leaves a list of the programs it removed on the desktop, so you know what to put back.</li>'
                 '<li><strong>Remove everything</strong> deletes your files too. Choose <strong>Clean data</strong> (or <strong>Clean the drive</strong>) if the PC is leaving you, so files can&rsquo;t be recovered.</li>'
                 '</ul>'
                 '<ol>'
                 '<li><strong>Back up first.</strong> Copy your photos and documents to a USB drive or OneDrive, even with Keep my files. Note your email and other passwords, and find your Microsoft Office details.</li>'
                 '<li>Open <strong>Settings</strong>, <strong>System</strong>, <strong>Recovery</strong>, and click <strong>Reset PC</strong>. (Windows 10: Settings, Update &amp; Security, Recovery, <strong>Get started</strong>.)</li>'
                 '<li>Choose Keep my files or Remove everything.</li>'
                 '<li><strong>Cloud download</strong> fetches a fresh copy of Windows from Microsoft (several gigabytes) and is the better choice if Windows is damaged. <strong>Local reinstall</strong> uses the copy already on the PC.</li>'
                 '<li>Check the summary, then click <strong>Reset</strong>. Allow an hour or two, plugged in.</li>'
                 '</ol>'
                 '<p>If the drive is encrypted, Windows may ask for the BitLocker recovery key part-way through: <a href="/computer-asking-for-bitlocker-recovery-key/">where to find it</a>. Can&rsquo;t get into Windows at all? Hold <strong>Shift</strong> while you click <strong>Restart</strong> on the sign-in screen, then Troubleshoot, Reset this PC.</p>'},
        {'eyebrow': '/06 &mdash; THE QUICK WAY', 'h2': 'Let our free app check before you start', 'html': '__APP_BOX_RESTORE__'},
        {'eyebrow': '/07 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _CALL.format(extra=' Before any reset we copy your files somewhere safe and note your programs, then put back the ones you use. Want it done properly in one go? See our <a href="/windows-reinstall/">Windows reinstall service</a>.')},
    ],
    'howToName': 'How to choose between System Restore and Reset this PC',
    'howToSteps': [
        {'name': 'Back up your files', 'text': 'Copy your photos and documents to a USB drive or OneDrive before any repair.'},
        {'name': 'Try System Restore', 'text': 'Start, type restore point, open Create a restore point, click System Restore and pick a day before the problem.'},
        {'name': 'Repair Windows and keep everything', 'text': 'On Windows 11: Settings, System, Recovery, Fix problems using Windows Update, Reinstall now.'},
        {'name': 'Reset and keep your files', 'text': 'Settings, System, Recovery, Reset PC, Keep my files, then Cloud download. Your programs will need reinstalling.'},
        {'name': 'Switch System Restore on for next time', 'text': 'In Create a restore point, select C:, click Configure, Turn on system protection, then Create.'},
    ],
    'faqs': [
        {'q': 'Does System Restore delete my files?', 'a': '<p>No. It takes Windows&rsquo; settings, programs and drivers back to an earlier day and leaves your documents, photos and emails alone. Programs installed since the restore point are removed.</p>'},
        {'q': 'Does Reset this PC delete my programs?', 'a': '<p>Yes, with either choice. Keep my files keeps your own files but removes every program you installed, so you&rsquo;ll need to reinstall Office, printer software and the rest. Windows leaves a list of them on the desktop.</p>'},
        {'q': 'What is the difference between System Restore and Reset this PC?', 'a': '<p>System Restore goes back to a snapshot of Windows from an earlier day and keeps your files and most programs. Reset this PC reinstalls Windows from scratch and removes your programs, and can remove your files too.</p>'},
        {'q': 'Why are there no restore points?', 'a': '<p>System Restore is switched off on many PCs. Search for Create a restore point, select C:, click Configure and choose Turn on system protection. Restore points are also deleted when the space set aside for them fills up.</p>'},
        {'q': 'Can I undo System Restore?', 'a': '<p>Yes, if it was run from Windows: open System Restore again and choose Undo System Restore. A restore run from the recovery screen can&rsquo;t be undone.</p>'},
        {'q': 'Should I choose Cloud download or Local reinstall?', 'a': '<p>Cloud download fetches a fresh copy of Windows and is better when Windows itself is damaged. Local reinstall is quicker on a slow connection. Both end in the same place.</p>'},
        {'q': 'How long does Reset this PC take?', 'a': '<p>Usually an hour or two, sometimes longer on an older PC with a hard drive. Keep a laptop plugged in and don&rsquo;t switch it off part-way.</p>'},
        {'q': 'Can you do it for me?', 'a': '<p>Yes. With your permission we connect to your Windows PC, back up your files first, and use the lightest fix that works. Remote help from &pound;20, no fix, no fee.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/windows-update-stuck/">Windows Update stuck</a>, <a href="/blue-screen-stop-codes/">blue screen stop codes</a>, <a href="/what-windows-backup-backs-up/">what the Windows Backup app backs up</a>, <a href="/why-does-my-pc-keep-crashing/">why does my PC keep crashing?</a>, <a href="/how-to-speed-up-a-slow-computer/">speeding up a slow computer</a> and <a href="/computer-asking-for-bitlocker-recovery-key/">BitLocker recovery key</a>.</p>',
}

# ============================================================ 16. Blue screen stop codes
# Stop code names and numbers as Windows reports them (Microsoft's bug check code reference): 0xEF CRITICAL_PROCESS_DIED,
# 0xA IRQL_NOT_LESS_OR_EQUAL, 0x133 DPC_WATCHDOG_VIOLATION, 0x1A MEMORY_MANAGEMENT, 0x50 PAGE_FAULT_IN_NONPAGED_AREA,
# 0x3B SYSTEM_SERVICE_EXCEPTION, 0x139 KERNEL_SECURITY_CHECK_FAILURE, 0x116 VIDEO_TDR_FAILURE, 0x124 WHEA_UNCORRECTABLE_ERROR,
# 0x7B INACCESSIBLE_BOOT_DEVICE, 0x154 UNEXPECTED_STORE_EXCEPTION. Causes are said as "usually", never as a diagnosis.
BSOD = {
    'slug': 'blue-screen-stop-codes',
    'title': 'Blue Screen Stop Codes: What Yours Means and What to Do',
    'metaDesc': 'CRITICAL_PROCESS_DIED, IRQL_NOT_LESS_OR_EQUAL, MEMORY_MANAGEMENT? What the stop code on a blue (or black) screen usually means, and the fixes in order.',
    'ogTitle': 'Blue screen stop codes: what yours means and what to do',
    'crumbName': 'Blue Screen Stop Codes',
    'eyebrow': '// BLUE SCREEN, OR BLACK?',
    'h1': 'Blue screen <em class="grad grad--cyan">stop codes</em>: what yours means',
    'lede': 'The PC stopped with &ldquo;Your device ran into a problem and needs to restart&rdquo; and a code in capitals. That code is the most useful clue you&rsquo;ll get. Here&rsquo;s what the common ones usually mean, how to find the code again after the restart, and what to try, in order.',
    'chips': ['The common codes', 'Find it after the restart', 'Fixes in order'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Look up your code', '#s1'],
    'ctaHead': 'Still getting blue screens?',
    'ctaSub': 'With your permission we connect to your Windows PC, read its crash record and dump files, and find what&rsquo;s behind it. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Once, then never again', 'Not worth worrying about. Note the code in case it comes back.'),
        ('Missed the code?', 'Reliability Monitor and Event Viewer keep it after the restart.'),
        ('Driver codes', 'IRQL_NOT_LESS_OR_EQUAL, SYSTEM_SERVICE_EXCEPTION, DPC_WATCHDOG_VIOLATION: update or roll back drivers.'),
        ('Memory codes', 'MEMORY_MANAGEMENT, PAGE_FAULT_IN_NONPAGED_AREA: run Windows Memory Diagnostic.'),
        ('Windows or drive codes', 'CRITICAL_PROCESS_DIED, UNEXPECTED_STORE_EXCEPTION: repair Windows files and check the drive.'),
        ('Back up first', 'Repeated blue screens can mean a drive on its way out. Copy your files today.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; THE CODES', 'h2': 'What the common stop codes usually mean',
         'html': '<p>Each code says what Windows was doing when it had to stop, not always why. These are the ones we see most, with the number Windows records alongside (you&rsquo;ll need it in step 2):</p>'
                 '<ul>'
                 '<li><strong>CRITICAL_PROCESS_DIED</strong> (0xEF): a part of Windows it can&rsquo;t run without stopped. Usually damaged Windows files, a failing drive, or a driver. Repair Windows&rsquo; files and check the drive.</li>'
                 '<li><strong>IRQL_NOT_LESS_OR_EQUAL</strong> (0xA): a driver tried to use memory it shouldn&rsquo;t. Usually a driver, sometimes faulty memory. Update or roll back recent drivers.</li>'
                 '<li><strong>DPC_WATCHDOG_VIOLATION</strong> (0x133): a driver took too long to answer. Often the drive&rsquo;s own driver or its firmware. Install the maker&rsquo;s storage and chipset updates.</li>'
                 '<li><strong>MEMORY_MANAGEMENT</strong> (0x1A): Windows found its memory in a state it didn&rsquo;t expect. Often faulty memory (RAM). Run Windows Memory Diagnostic.</li>'
                 '<li><strong>PAGE_FAULT_IN_NONPAGED_AREA</strong> (0x50): something asked for memory that wasn&rsquo;t there. Faulty memory, a driver, or security software.</li>'
                 '<li><strong>SYSTEM_SERVICE_EXCEPTION</strong> (0x3B): a driver or a part of Windows went wrong. The file named on the screen (if there is one) points to the driver.</li>'
                 '<li><strong>KERNEL_SECURITY_CHECK_FAILURE</strong> (0x139): Windows found its own data damaged. Drivers, faulty memory or damaged Windows files.</li>'
                 '<li><strong>VIDEO_TDR_FAILURE</strong> (0x116): the graphics card stopped answering. Update the graphics driver from the maker; on a desktop, check the card isn&rsquo;t overheating.</li>'
                 '<li><strong>WHEA_UNCORRECTABLE_ERROR</strong> (0x124): the hardware itself reported an error. Overheating, a failing part, or settings pushed beyond the maker&rsquo;s (overclocking).</li>'
                 '<li><strong>UNEXPECTED_STORE_EXCEPTION</strong> (0x154): usually the drive, sometimes security software. Check the drive&rsquo;s health first.</li>'
                 '<li><strong>INACCESSIBLE_BOOT_DEVICE</strong> (0x7B): Windows couldn&rsquo;t reach its own drive while starting. A failing drive, a changed setting in the BIOS, or an update gone wrong.</li>'
                 '</ul>'
                 '<p><strong>Is the screen black, not blue?</strong> Windows 11 changed it in 2025: up-to-date PCs show the same message and code on a black screen. Everything on this page applies.</p>'},
        {'eyebrow': '/02 &mdash; FIND THE CODE AGAIN', 'h2': 'Missed the code? Windows wrote it down',
         'html': '<ol>'
                 '<li>Click Start, type <strong>reliability</strong> and open <strong>View reliability history</strong>.</li>'
                 '<li>Click the day with a red cross, then the line that says <strong>Windows</strong> and <strong>Shut down unexpectedly</strong> (or <strong>Windows stopped working</strong>), and choose <strong>View technical details</strong>.</li>'
                 '<li>The code is next to <strong>BCCode</strong>, as a number: <strong>ef</strong> is 0xEF (CRITICAL_PROCESS_DIED), <strong>1a</strong> is 0x1A, and so on. Match it to the list above.</li>'
                 '</ol>'
                 '<p>Event Viewer has it too: Windows Logs, <strong>System</strong>, an event from <strong>BugCheck</strong> (ID 1001). More on reading the record in <a href="/reliability-monitor/">Reliability Monitor</a>.</p>'},
        {'eyebrow': '/03 &mdash; WHAT TO TRY, IN ORDER', 'h2': 'What to try, in order',
         'html': '<ol>'
                 '<li><strong>Back up your files</strong> to a USB drive or OneDrive. If the drive is the cause, it may not last.</li>'
                 '<li><strong>Undo what changed.</strong> Started after an update, a new program, a new device or a driver? Uninstall it, or use <a href="/system-restore-vs-reset-this-pc/">System Restore</a> to a day before.</li>'
                 '<li><strong>Get the updates.</strong> Settings, Windows Update, then <strong>Advanced options</strong>, <strong>Optional updates</strong> for drivers. For graphics, storage and chipset drivers, the PC or part maker&rsquo;s own site is usually newer.</li>'
                 '<li><strong>Check the drive:</strong> <a href="/how-to-check-ssd-health/">how to check your drive&rsquo;s health</a>.</li>'
                 '<li><strong>Test the memory:</strong> Start, type <strong>Windows Memory Diagnostic</strong>, choose <strong>Restart now and check for problems</strong>. Any error reported means faulty memory.</li>'
                 '<li><strong>Repair Windows&rsquo; files:</strong> in Terminal (Admin), <strong>DISM /Online /Cleanup-Image /RestoreHealth</strong>, then <strong>sfc /scannow</strong>. Step by step in <a href="/windows-update-stuck/">Windows Update stuck</a>.</li>'
                 '<li><strong>Check it isn&rsquo;t overheating:</strong> a laptop on a bed or a dusty desktop can stop with hardware codes. See <a href="/laptop-overheating/">laptop overheating</a>.</li>'
                 '</ol>'},
        {'eyebrow': '/04 &mdash; IT WON&rsquo;T START', 'h2': 'When it blue-screens before Windows starts',
         'html': '<p>After two or three failed starts Windows opens <strong>Automatic Repair</strong>. Choose <strong>Advanced options</strong>, then:</p>'
                 '<ul>'
                 '<li><strong>Troubleshoot</strong>, <strong>Advanced options</strong>, <strong>Uninstall Updates</strong>, if it started after an update.</li>'
                 '<li><strong>System Restore</strong>, if there&rsquo;s a restore point from before.</li>'
                 '<li><strong>Startup Settings</strong>, <strong>Restart</strong>, then <strong>4</strong> for Safe Mode, which starts Windows with only its own drivers. If it&rsquo;s fine there, a driver or a program is the cause.</li>'
                 '</ul>'
                 '<p>Stuck on the maker&rsquo;s logo instead? See <a href="/laptop-stuck-on-logo-wont-boot/">laptop stuck on the logo</a>.</p>'},
        {'eyebrow': '/05 &mdash; THE QUICK WAY', 'h2': 'Let our free app read the crash record', 'html': '__APP_BOX_BSOD__'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _CALL.format(extra=' We can read the dump files Windows saves at each blue screen, which name the driver involved. If it&rsquo;s hardware, we collect the PC and test it on the bench: see <a href="/computer-repairs/">computer repairs</a>.')},
    ],
    'howToName': 'How to fix a blue screen from its stop code',
    'howToSteps': [
        {'name': 'Find the stop code', 'text': 'Note the code on the screen, or open View reliability history, click the red cross and View technical details: the BCCode is the code.'},
        {'name': 'Back up your files', 'text': 'Copy your photos and documents somewhere safe in case the drive is failing.'},
        {'name': 'Undo what changed', 'text': 'Uninstall a recent program, driver or update, or use System Restore to a day before.'},
        {'name': 'Update drivers', 'text': 'Settings, Windows Update, Advanced options, Optional updates, and the PC maker\u2019s own drivers.'},
        {'name': 'Test the drive and memory', 'text': 'Check the drive\u2019s health, and run Windows Memory Diagnostic.'},
        {'name': 'Repair Windows files', 'text': 'In Terminal (Admin), run DISM /Online /Cleanup-Image /RestoreHealth, then sfc /scannow.'},
    ],
    'faqs': [
        {'q': 'What causes a blue screen?', 'a': '<p>Usually a driver, faulty memory, a failing drive, damaged Windows files or overheating. The stop code narrows it down; the list on this page says what each common one usually means.</p>'},
        {'q': 'Is one blue screen something to worry about?', 'a': '<p>Not usually. A single one after an update or a new device often never comes back. Note the code; if it happens again, work through the steps.</p>'},
        {'q': 'What does CRITICAL_PROCESS_DIED mean?', 'a': '<p>A part of Windows that it can&rsquo;t run without stopped unexpectedly. Damaged Windows files, a failing drive and drivers are the usual causes: repair Windows&rsquo; files with DISM and sfc /scannow, and check the drive&rsquo;s health.</p>'},
        {'q': 'How do I find the stop code after the PC restarted?', 'a': '<p>Open View reliability history, click the day with the red cross, the Shut down unexpectedly line, then View technical details. The BCCode is the stop code as a number.</p>'},
        {'q': 'Why is my blue screen black?', 'a': '<p>Windows 11 changed it in 2025. Up-to-date PCs show the same message and stop code on a black background.</p>'},
        {'q': 'Can a virus cause a blue screen?', 'a': '<p>It can, but it&rsquo;s much less common than drivers and hardware. Two security programs running at once are a more likely cause than a virus.</p>'},
        {'q': 'Will I lose my files?', 'a': '<p>Not from a blue screen itself. But a failing drive can cause them, so back up your files as soon as you can.</p>'},
        {'q': 'Can you fix it remotely?', 'a': '<p>Usually we can find the cause remotely by reading the crash record and dump files. If it&rsquo;s a hardware fault, we collect the PC and repair it on the bench.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/why-does-my-pc-keep-crashing/">why does my PC keep crashing?</a>, <a href="/reliability-monitor/">Reliability Monitor</a>, <a href="/system-restore-vs-reset-this-pc/">System Restore or Reset this PC?</a>, <a href="/how-to-check-ssd-health/">checking your drive&rsquo;s health</a>, <a href="/laptop-overheating/">laptop overheating</a> and <a href="/laptop-stuck-on-logo-wont-boot/">stuck on the logo</a>.</p>',
}

# ============================================================ 17. Antimalware Service Executable
# MsMpEng.exe = Microsoft Defender Antivirus's own engine (Microsoft Learn). Set-MpPreference -ScanAvgCPULoadFactor: the most a
# scan should use, default 50 (scheduled and custom scans; not real-time). Tamper protection blocks switching Defender off by
# registry. With another antivirus registered Windows puts Defender in passive mode by itself.
DEFENDER = {
    'slug': 'antimalware-service-executable-high-cpu',
    'title': 'Antimalware Service Executable High CPU or Disk? Fix It',
    'metaDesc': 'Antimalware Service Executable slowing your PC? It\'s Microsoft Defender scanning. When to let it finish, the real causes, and fixes that keep you protected.',
    'ogTitle': 'Antimalware Service Executable using high CPU or disk: what to do',
    'crumbName': 'Antimalware Service Executable',
    'eyebrow': '// SOMETHING IS EATING THE PC',
    'h1': 'Antimalware Service Executable <em class="grad grad--cyan">slowing your PC</em>?',
    'lede': 'Task Manager shows Antimalware Service Executable near the top, the fan is roaring and everything is slow. It&rsquo;s not a virus: it&rsquo;s Microsoft Defender, Windows&rsquo; own antivirus, doing a scan. Usually it settles by itself. When it doesn&rsquo;t, there&rsquo;s a reason, and switching your antivirus off isn&rsquo;t the fix.',
    'chips': ['Not a virus', 'Why it gets busy', 'Fixes that keep you safe'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Why it gets busy', '#s1'],
    'ctaHead': 'Still slow after all that?',
    'ctaSub': 'With your permission we connect to your Windows PC, find what&rsquo;s keeping Defender busy and sort it, without leaving you unprotected. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it is', 'MsMpEng.exe: Microsoft Defender, the antivirus built into Windows.'),
        ('Busy for 10 to 30 minutes', 'A scan, often after an update or first thing in the morning. Let it finish.'),
        ('Busy all day, every day', 'Two security programs, a huge folder it keeps rescanning, or a slow hard drive.'),
        ('Lower its share', 'PowerShell (Admin): Set-MpPreference -ScanAvgCPULoadFactor 30.'),
        ('Don&rsquo;t switch it off', 'Registry tricks are blocked by tamper protection and leave the PC unprotected.'),
        ('Old hard drive?', 'Disk at 100 per cent is usually the drive, not Defender. An SSD fixes it for good.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHAT IT IS', 'h2': 'What Antimalware Service Executable is, and why it gets busy',
         'html': '<p>It&rsquo;s the engine of <strong>Microsoft Defender Antivirus</strong>; its file is called <strong>MsMpEng.exe</strong>. It checks each file as it&rsquo;s opened, downloaded or copied, and scans the whole PC from time to time. Both use the processor and the drive.</p>'
                 '<p>It gets busy for good reasons: a <strong>scan</strong> (Windows runs them when it thinks you&rsquo;re not using the PC, which on a PC that&rsquo;s only switched on when you need it, means while you are), <strong>after a Windows update</strong> or a new set of virus definitions, and when you <strong>copy or unzip lots of files</strong>.</p>'
                 '<p><strong>Is it really Defender?</strong> In Task Manager, right-click it and choose <strong>Open file location</strong>. The real one is in a folder under <strong>C:\\ProgramData\\Microsoft\\Windows Defender\\Platform</strong> (or <strong>C:\\Program Files\\Windows Defender</strong> on older PCs). Anywhere else: ring us.</p>'},
        {'eyebrow': '/02 &mdash; FIRST', 'h2': 'First: let it finish',
         'html': '<ol>'
                 '<li>Open <strong>Windows Security</strong> (Start, type Windows Security), then <strong>Virus &amp; threat protection</strong>. If a scan is running, it shows here with its progress.</li>'
                 '<li>Leave the PC on and plugged in for 30 minutes. A quick scan takes minutes; a full scan on a big drive can take an hour or more.</li>'
                 '<li>Restart afterwards and check Task Manager again. If it&rsquo;s quiet now, that was all it was.</li>'
                 '</ol>'
                 '<p>Leaving the PC switched on for an hour once a week, plugged in and idle, gives Defender its chance to scan when you don&rsquo;t need the PC.</p>'},
        {'eyebrow': '/03 &mdash; BUSY ALL THE TIME', 'h2': 'Busy all the time? The usual causes',
         'html': '<ul>'
                 '<li><strong>Two security programs.</strong> Norton, McAfee or another antivirus alongside Defender, or an old one that was never removed properly. Normally Windows puts Defender to rest when another is in charge; when that goes wrong, they fight. Keep one: uninstall the other in Settings, Apps, then restart.</li>'
                 '<li><strong>Something it keeps rescanning:</strong> a big folder that changes all the time, such as a game library, a backup drive or a folder of virtual machines. See the next section.</li>'
                 '<li><strong>A slow hard drive.</strong> If Task Manager shows the <strong>disk</strong> at 100 per cent, not the processor, the drive is the bottleneck: an old spinning hard drive struggles with any scan. Replacing it with an SSD fixes it for good: <a href="/hard-drive-upgrade/">hard drive upgrade</a>.</li>'
                 '<li><strong>Something was found.</strong> Check Protection history in Windows Security: a threat it keeps finding and removing can keep it busy.</li>'
                 '<li><strong>Windows itself is behind.</strong> Install every update, including Defender&rsquo;s own, then restart.</li>'
                 '</ul>'},
        {'eyebrow': '/04 &mdash; FIXES THAT KEEP YOU SAFE', 'h2': 'Make it lighter, without switching it off',
         'html': '<ol>'
                 '<li><strong>Lower how much of the processor a scan may use.</strong> Right-click Start, choose <strong>Terminal (Admin)</strong>, say Yes, and type <strong>Set-MpPreference -ScanAvgCPULoadFactor 30</strong>. Scans then aim for about 30 per cent instead of 50, so they take longer but you notice them less. It doesn&rsquo;t change the checking of each file as it&rsquo;s opened.</li>'
                 '<li><strong>Leave a folder out, only if you trust everything in it.</strong> Windows Security, Virus &amp; threat protection, Manage settings, <strong>Exclusions</strong>. A game library from Steam or a folder of your own work files, perhaps; never Downloads, the Desktop or a whole drive. Anything in an excluded folder isn&rsquo;t checked at all.</li>'
                 '</ol>'
                 '<p><strong>What not to do:</strong> switch Defender off with a registry change or a &ldquo;tweak&rdquo; program. Tamper protection blocks most of them, the rest leave your PC with no antivirus at all, and the guides that suggest them are often older than Windows 11.</p>'},
        {'eyebrow': '/05 &mdash; THE QUICK WAY', 'h2': 'Let our free app check what&rsquo;s protecting the PC', 'html': '__APP_BOX_DEFENDER__'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL.format(extra=' We find what&rsquo;s keeping Defender busy and sort it with one antivirus left on duty. For a slow PC in general, see <a href="/how-to-speed-up-a-slow-computer/">speeding up a slow computer</a>.')},
    ],
    'howToName': 'How to stop Antimalware Service Executable slowing your PC',
    'howToSteps': [
        {'name': 'Let the scan finish', 'text': 'Open Windows Security, Virus & threat protection, and leave the PC on and plugged in until any scan finishes.'},
        {'name': 'Keep one antivirus', 'text': 'If another antivirus is installed alongside Defender, uninstall one of them in Settings, Apps, and restart.'},
        {'name': 'Install updates', 'text': 'Install every Windows and Defender update, then restart.'},
        {'name': 'Lower the scan share', 'text': 'In Terminal (Admin), type Set-MpPreference -ScanAvgCPULoadFactor 30.'},
        {'name': 'Check the drive', 'text': 'If the disk shows 100 per cent in Task Manager, an old hard drive is the bottleneck: an SSD fixes it.'},
    ],
    'faqs': [
        {'q': 'What is Antimalware Service Executable?', 'a': '<p>It&rsquo;s Microsoft Defender Antivirus, the antivirus built into Windows. Its file is MsMpEng.exe. It checks files as they&rsquo;re opened and scans the PC from time to time.</p>'},
        {'q': 'Is Antimalware Service Executable a virus?', 'a': '<p>No, not the real one. Right-click it in Task Manager and choose Open file location: it should be in a Windows Defender folder under ProgramData or Program Files.</p>'},
        {'q': 'Why is it using so much CPU?', 'a': '<p>Usually a scan, often after an update. If it&rsquo;s busy all day, the usual causes are a second security program fighting it, a large folder it keeps rescanning, or a slow hard drive.</p>'},
        {'q': 'Can I disable Antimalware Service Executable?', 'a': '<p>Not safely. It&rsquo;s your antivirus. If you install another antivirus, Windows rests Defender by itself. Lower its scan share instead, as on this page.</p>'},
        {'q': 'Why is my disk at 100 per cent?', 'a': '<p>On a PC with an old spinning hard drive, almost any scan or update fills the disk. Replacing it with an SSD is the fix that lasts.</p>'},
        {'q': 'Does Norton or McAfee replace Defender?', 'a': '<p>Yes, while it&rsquo;s installed and up to date, Windows puts Defender in the background. If its subscription runs out, switch Defender back on or renew: don&rsquo;t keep both running in full.</p>'},
        {'q': 'Can you fix it remotely?', 'a': '<p>Usually, yes: with your permission we connect to your Windows PC and find what&rsquo;s keeping it busy while you watch.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/how-to-speed-up-a-slow-computer/">speeding up a slow computer</a>, <a href="/why-is-my-computer-slow/">why is my computer slow?</a>, <a href="/how-to-choose-antivirus/">choosing antivirus</a>, <a href="/virus-threat-protection-managed-by-your-organization/">virus &amp; threat protection is managed by your organisation</a>, <a href="/stop-programs-starting-with-windows/">stop programs starting with Windows</a> and <a href="/smart-app-control-blocked-an-app/">Smart App Control blocked an app</a>.</p>',
}

# ============================================================ 18. Smart App Control blocked an app
# Microsoft Support (Smart App Control FAQ): Windows 11 22H2+, on clean installs; Evaluation / On / Off; no per-app exceptions;
# switching it off has been one-way on most PCs (back on only after a reinstall or reset). Different from SmartScreen's
# "Windows protected your PC" (which has Run anyway).
SAC = {
    'slug': 'smart-app-control-blocked-an-app',
    'title': 'Smart App Control Blocked an App? What It Means, What to Do',
    'metaDesc': 'Smart App Control blocked an app that may be unsafe? Why it happens, why there\'s no Allow button, and your safe choices before switching it off.',
    'ogTitle': 'Smart App Control blocked an app: what it means and what to do',
    'crumbName': 'Smart App Control Blocked an App',
    'eyebrow': '// WINDOWS BLOCKED A PROGRAM',
    'h1': 'Smart App Control <em class="grad grad--cyan">blocked an app</em>?',
    'lede': 'You tried to open or install something and Windows 11 said &ldquo;Smart App Control blocked an app that may be unsafe&rdquo;, with no button to run it anyway. That&rsquo;s deliberate, and it doesn&rsquo;t always mean the program is harmful. Here&rsquo;s why it happens, your safe choices, and what switching it off really means.',
    'chips': ['Why there&rsquo;s no Allow button', 'Safe choices first', 'Off can be one-way'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Your choices', '#s2'],
    'ctaHead': 'Not sure whether to trust it?',
    'ctaSub': 'With your permission we connect to your Windows 11 PC, check the program and install it the safe way. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it is', 'A Windows 11 protection that only lets programs run that Microsoft knows to be safe, or that are signed by their maker.'),
        ('No Allow button', 'On purpose: it has no exceptions list. It&rsquo;s on, or it&rsquo;s off.'),
        ('Try first', 'The newest version from the maker&rsquo;s own website, or the Microsoft Store version.'),
        ('Switching it off', 'Windows Security, App &amp; browser control, Smart App Control settings, Off.'),
        ('Off can be one-way', 'On most PCs it can only be switched back on by resetting Windows.'),
        ('Not the same as SmartScreen', '&ldquo;Windows protected your PC&rdquo; is SmartScreen, and does have Run anyway.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHY IT BLOCKED IT', 'h2': 'Why Smart App Control blocks programs',
         'html': '<p>Smart App Control is a Windows 11 protection that checks every program before it runs. It lets a program through when Microsoft&rsquo;s cloud service knows it to be safe, or when its maker has <strong>signed</strong> it with a certificate. Anything it can&rsquo;t vouch for is blocked.</p>'
                 '<p>So it blocks plenty of harmless things: small free tools, older programs, things written by one person, and programs whose makers never paid for a signing certificate. It&rsquo;s strict on purpose, because it&rsquo;s aimed at people who mostly use well-known programs.</p>'
                 '<p>It&rsquo;s only switched on for PCs that started with a <strong>fresh copy of Windows 11</strong> (a new PC, or a reset). PCs upgraded from Windows 10 have it off. When it&rsquo;s new it runs in <strong>Evaluation</strong> mode, watching how you use the PC, then switches itself on or off.</p>'
                 '<p><strong>Not the same as &ldquo;Windows protected your PC&rdquo;.</strong> That blue box is SmartScreen, checking downloads, and it has <strong>More info</strong>, <strong>Run anyway</strong>. Smart App Control has no such button.</p>'},
        {'eyebrow': '/02 &mdash; YOUR CHOICES', 'h2': 'Your safe choices, before switching anything off',
         'html': '<ol>'
                 '<li><strong>Get it from the maker&rsquo;s own website</strong>, not a download site, and get the newest version. Many makers sign their newer versions, which Smart App Control lets through.</li>'
                 '<li><strong>Look for it in the Microsoft Store.</strong> Store programs are checked and run without being blocked.</li>'
                 '<li><strong>Look for an alternative</strong> that does the same job and is well known: there usually is one.</li>'
                 '<li><strong>Ask the maker</strong> whether a signed version is coming. Small makers often add it when people ask.</li>'
                 '<li><strong>Not sure where it came from?</strong> Don&rsquo;t run it. Delete it, and check the PC: see <a href="/how-to-know-if-computer-has-virus/">how to tell if your computer has a virus</a>.</li>'
                 '</ol>'},
        {'eyebrow': '/03 &mdash; SWITCHING IT OFF', 'h2': 'Switching Smart App Control off, and what that means',
         'html': '<p>If you trust the program and need it, you can switch Smart App Control off:</p>'
                 '<ol>'
                 '<li>Open <strong>Windows Security</strong> (Start, type Windows Security).</li>'
                 '<li>Choose <strong>App &amp; browser control</strong>, then <strong>Smart App Control settings</strong>.</li>'
                 '<li>Choose <strong>Off</strong>.</li>'
                 '</ol>'
                 '<p><strong>Think before you do.</strong> On most PCs, once it&rsquo;s off, the only way to switch it back on is to <a href="/system-restore-vs-reset-this-pc/">reset Windows</a>. If the settings page still lets you choose On again after switching it off, your Windows is newer and it isn&rsquo;t one-way.</p>'
                 '<p>With it off, the PC is still protected by Microsoft Defender and SmartScreen, as almost every Windows 10 PC always has been. It&rsquo;s one layer less, not none.</p>'},
        {'eyebrow': '/04 &mdash; THE QUICK WAY', 'h2': 'Check Windows&rsquo; other protections are on', 'html': '__APP_BOX_SAC__'},
        {'eyebrow': '/05 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL.format(extra=' We check the program is what it claims to be, and find a signed version or a safe alternative where there is one.')},
    ],
    'howToName': 'What to do when Smart App Control blocks an app',
    'howToSteps': [
        {'name': 'Get the newest version from the maker', 'text': 'Download it from the maker\u2019s own website, not a download site. Newer versions are often signed.'},
        {'name': 'Try the Microsoft Store', 'text': 'Search the Microsoft Store for the program or a well-known alternative.'},
        {'name': 'Ask the maker', 'text': 'Ask whether a signed version is available or coming.'},
        {'name': 'Switch it off only if you trust it', 'text': 'Windows Security, App & browser control, Smart App Control settings, Off. On most PCs it can only be switched back on by resetting Windows.'},
    ],
    'faqs': [
        {'q': 'Why did Smart App Control block my app?', 'a': '<p>Because Microsoft couldn&rsquo;t vouch for it and it isn&rsquo;t signed by its maker. That happens to plenty of harmless programs, especially small or older ones.</p>'},
        {'q': 'Can I allow just one app?', 'a': '<p>No. Smart App Control has no exceptions list: it&rsquo;s on or off. Try a signed version from the maker&rsquo;s website or the Microsoft Store first.</p>'},
        {'q': 'Can I turn Smart App Control back on?', 'a': '<p>On most PCs, only by resetting Windows. Newer versions of Windows 11 are changing this: if the setting still offers On after you switch it off, yours can.</p>'},
        {'q': 'Is it safe to turn Smart App Control off?', 'a': '<p>Microsoft Defender and SmartScreen still protect the PC, as on almost every Windows 10 PC. It&rsquo;s one layer less, so only do it for a program you trust.</p>'},
        {'q': 'Why is Smart App Control off and greyed out?', 'a': '<p>It&rsquo;s only available on PCs that started with a fresh copy of Windows 11. PCs upgraded from Windows 10, or where it was switched off, show it off.</p>'},
        {'q': 'What is the difference between Smart App Control and SmartScreen?', 'a': '<p>SmartScreen checks downloads and websites, and its &ldquo;Windows protected your PC&rdquo; box has Run anyway. Smart App Control checks every program as it runs and has no way round it.</p>'},
        {'q': 'Can you help?', 'a': '<p>Yes. With your permission we connect to your Windows 11 PC, check the program and install it the safe way. Remote help from &pound;20, no fix, no fee.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/old-program-wont-open-on-windows-11/">an old program won&rsquo;t open on Windows 11</a>, <a href="/virus-threat-protection-managed-by-your-organization/">virus &amp; threat protection is managed by your organisation</a>, <a href="/how-to-choose-antivirus/">choosing antivirus</a>, <a href="/antimalware-service-executable-high-cpu/">Antimalware Service Executable slowing the PC</a> and <a href="/link-safety-checker/">is this link safe?</a></p>',
}

# ============================================================ 19. What the Windows Backup app backs up
# Microsoft Support (Back up your Windows PC / Windows Backup): Folders (Desktop, Documents, Pictures, Music, Videos via
# OneDrive folder backup), Apps, Settings, Credentials; needs a Microsoft account; restores when setting up a new PC with
# the same account. Not a system image, no external-drive target. File History (Control Panel) still backs up to a drive.
WINBACKUP = {
    'slug': 'what-windows-backup-backs-up',
    'title': 'What Does the Windows Backup App Actually Back Up?',
    'metaDesc': 'Windows Backup copies some folders to OneDrive, plus app and settings lists. What it leaves out, why it isn\'t a full backup, and how to fill the gaps.',
    'ogTitle': 'What the Windows Backup app actually backs up (and what it doesn\'t)',
    'crumbName': 'What Windows Backup Backs Up',
    'eyebrow': '// IS MY PC BACKED UP?',
    'h1': 'What does <em class="grad grad--cyan">Windows Backup</em> actually back up?',
    'lede': 'Windows 11 has an app called Windows Backup, and it&rsquo;s easy to assume it backs up the whole PC. It doesn&rsquo;t. It copies a few folders to OneDrive and remembers your apps and settings, so a new PC can be set up like the old one. Here&rsquo;s exactly what it covers, what it leaves out, and the simple way to fill the gaps.',
    'chips': ['What it copies', 'What it leaves out', 'A second copy that&rsquo;s yours'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['What it copies', '#s1'],
    'ctaHead': 'Want it set up properly?',
    'ctaSub': 'With your permission we connect to your Windows PC, set up a backup that covers everything that matters, and test that it reads back. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Folders', 'Desktop, Documents, Pictures, Music and Videos, copied to OneDrive.'),
        ('Apps', 'A list of your apps, so a new PC can offer to put them back. Not the programs themselves.'),
        ('Settings and passwords', 'Windows preferences, and saved Wi-Fi and other sign-in details.'),
        ('Left out', 'Downloads, other drives, other folders, and a copy of Windows and your programs.'),
        ('The catch', 'It uses OneDrive: 5 GB free, and a file deleted on the PC is deleted there too.'),
        ('Fill the gap', 'File History to a USB drive: a second copy that&rsquo;s yours, with older versions.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHAT IT COPIES', 'h2': 'What Windows Backup copies',
         'html': '<p>Open it from Start (type <strong>Windows Backup</strong>) or <strong>Settings</strong>, <strong>Accounts</strong>, <strong>Windows backup</strong>. It needs a Microsoft account, and it has four parts:</p>'
                 '<ul>'
                 '<li><strong>Folders:</strong> Desktop, Documents, Pictures, Music and Videos. These are copied to <strong>OneDrive</strong> and stay in step with it, which is the same thing as OneDrive folder backup.</li>'
                 '<li><strong>Apps:</strong> a list of the apps on the PC and the ones pinned to Start and the taskbar, so a new PC can offer to put them back. Store apps come back; most other programs, such as Office or printer software, you reinstall yourself.</li>'
                 '<li><strong>Settings:</strong> things like your desktop picture, language, accessibility and other preferences.</li>'
                 '<li><strong>Credentials:</strong> saved Wi-Fi passwords and other sign-in details Windows keeps.</li>'
                 '</ul>'
                 '<p>It shines when you get a <strong>new PC</strong>: sign in with the same Microsoft account during set-up, choose to restore, and your folders, apps and settings come across.</p>'},
        {'eyebrow': '/02 &mdash; WHAT IT LEAVES OUT', 'h2': 'What it leaves out',
         'html': '<ul>'
                 '<li><strong>Downloads</strong>, and any folder that isn&rsquo;t one of the five, such as a folder you made on C: for your accounts.</li>'
                 '<li><strong>Other drives</strong>, such as a D: drive or a USB drive.</li>'
                 '<li><strong>Windows and your programs.</strong> It isn&rsquo;t a copy of the whole PC (a &ldquo;system image&rdquo;): if the drive fails, you start with fresh Windows and reinstall.</li>'
                 '<li><strong>Emails kept on the PC</strong> by older email programs, in files outside those folders. Email that lives online, such as Outlook.com, Gmail or Microsoft 365, is already kept by the provider.</li>'
                 '<li><strong>Anything over your OneDrive space.</strong> The free plan is 5 GB, which photos fill quickly. When it&rsquo;s full, new files stop being copied.</li>'
                 '</ul>'},
        {'eyebrow': '/03 &mdash; THE CATCH', 'h2': 'The catch: OneDrive is a mirror, not a separate copy',
         'html': '<p>Because the folders stay in step with OneDrive, <strong>delete a file on the PC and it&rsquo;s deleted in OneDrive too</strong>. A file that gets damaged, or locked by ransomware, is replaced by the damaged copy online. OneDrive&rsquo;s recycle bin and version history can rescue you for a while (30 days for deleted files on a personal account), but it isn&rsquo;t the same as a copy kept apart.</p>'
                 '<p>It also changes where your files live: once it&rsquo;s on, your Desktop and Documents are inside the OneDrive folder. If that surprised you, see <a href="/onedrive-moved-my-desktop-and-documents/">OneDrive moved my Desktop and Documents</a>.</p>'},
        {'eyebrow': '/04 &mdash; FILL THE GAP', 'h2': 'Fill the gap: a second copy on a USB drive',
         'html': '<p>The simple, solid set-up for a home PC is <strong>two copies</strong>: OneDrive for convenience, and a USB drive you own. Windows still has File History built in for that:</p>'
                 '<ol>'
                 '<li>Plug in a USB drive bigger than your files (the app below tells you how big they are).</li>'
                 '<li>Click Start, type <strong>File History</strong> and open it (it&rsquo;s in Control Panel).</li>'
                 '<li>Check it has found the drive and click <strong>Turn on</strong>. Under <strong>Exclude folders</strong> and <strong>Advanced settings</strong> you can choose how often it copies and how long it keeps old versions.</li>'
                 '<li>To get something back, open File History and click <strong>Restore personal files</strong>, or right-click a folder, Properties, <strong>Previous Versions</strong>.</li>'
                 '</ol>'
                 '<p>File History copies your user folders, and keeps <strong>older versions</strong>, so a file deleted or spoiled last week is still there. Plug the drive in regularly, and keep it unplugged in between, so ransomware can&rsquo;t reach it. For photos in particular, see <a href="/how-to-back-up-your-photos/">how to back up your photos</a>.</p>'},
        {'eyebrow': '/05 &mdash; THE QUICK WAY', 'h2': 'Let our free app check your backup', 'html': '__APP_BOX_BACKUP__'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _CALL.format(extra=' We set up a backup that covers everything that matters to you, and test that a file reads back. For businesses, see <a href="/backup-support/">backup support</a>.')},
    ],
    'howToName': 'How to make sure your Windows PC is properly backed up',
    'howToSteps': [
        {'name': 'Check Windows Backup', 'text': 'Settings, Accounts, Windows backup: see which folders are copied to OneDrive.'},
        {'name': 'Check your OneDrive space', 'text': 'Make sure OneDrive has room for your folders; the free plan is 5 GB.'},
        {'name': 'Add a USB drive copy', 'text': 'Plug in a USB drive, open File History and click Turn on.'},
        {'name': 'Cover the other folders', 'text': 'Move files from Downloads, other drives or your own folders into Documents or Pictures, so they are copied.'},
        {'name': 'Test it', 'text': 'Restore one file from File History or OneDrive to be sure the copy reads back.'},
    ],
    'faqs': [
        {'q': 'Does Windows Backup back up everything?', 'a': '<p>No. It copies Desktop, Documents, Pictures, Music and Videos to OneDrive, and remembers your apps, settings and saved passwords. Downloads, other drives, other folders, Windows itself and your programs aren&rsquo;t copied.</p>'},
        {'q': 'Does Windows Backup back up to an external drive?', 'a': '<p>No, it only uses OneDrive. For a copy on a USB drive, use File History, which is still in Windows 11 in Control Panel.</p>'},
        {'q': 'Does Windows Backup back up my programs?', 'a': '<p>It saves a list of them so a new PC can offer to put them back. Store apps come back; most other programs need reinstalling.</p>'},
        {'q': 'Is OneDrive a backup?', 'a': '<p>Partly. It keeps a copy online, but it stays in step with the PC: delete or damage a file and the change reaches OneDrive too. Its recycle bin and version history help for a while. A second copy on a USB drive covers what it can&rsquo;t.</p>'},
        {'q': 'Why does Windows Backup say my OneDrive is full?', 'a': '<p>The free OneDrive plan is 5 GB, and your folders are bigger. Either buy more space (Microsoft 365 includes 1 TB), back up fewer folders, or use File History to a USB drive instead.</p>'},
        {'q': 'How do I restore from Windows Backup on a new PC?', 'a': '<p>During the new PC&rsquo;s set-up, sign in with the same Microsoft account and choose to restore from your old PC. Your folders, apps list and settings come across.</p>'},
        {'q': 'Can you set up my backup?', 'a': '<p>Yes. With your permission we connect to your Windows PC, set up a backup that covers your important files, and test that it works. Remote help from &pound;20.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/how-to-back-up-your-photos/">how to back up your photos</a>, <a href="/onedrive-moved-my-desktop-and-documents/">OneDrive moved my Desktop and Documents</a>, <a href="/stop-using-onedrive-without-losing-files/">stop using OneDrive without losing files</a>, <a href="/onedrive-taking-up-space/">OneDrive taking up space</a>, <a href="/system-restore-vs-reset-this-pc/">System Restore or Reset this PC?</a> and <a href="/cloud-backup/">cloud backup</a>.</p>',
}

# ============================================================ 20-22. Programs like ours (29 Oct 2026)
# Owner: "research PC service tools like our PC manager ... top five", then "yes build the CCleaner and HP Lenovo pages".
# Research: D:/claude/seo-research/pc-tools-competitors-2026-10-29/FINDINGS.md. Bing Keyword Research, 3 months, UK:
# "ccleaner" 46,833, "hp support assistant" 39,165, "lenovo vantage" 8,400 (the Dell one already has a page:
# dell-supportassist-keeps-popping-up). The app's own verdicts (programs-rules.json, build 47) agree with these pages:
# HP Support Assistant and Lenovo Vantage "ok"; CCleaner "not_needed" (it includes a registry cleaner). Never a ranking of
# programs (no league tables): the CCleaner page compares it with what Windows already does, not with rivals.
# Facts: CCleaner 5.33 (Aug-Sep 2017) was compromised at its maker, fixed in 5.34 (Cisco Talos, widely reported);
# Microsoft Defender has flagged CCleaner installers as a potentially unwanted app (bundled offers, BleepingComputer);
# Microsoft's support policy for registry cleaning utilities (support.microsoft.com KB 2563254). HP and Lenovo steps are
# said with care: menu names change between versions.

CCLEANER = {
    'slug': 'do-i-need-ccleaner',
    'title': 'Do You Still Need CCleaner? What Windows Does for Free',
    'metaDesc': 'Is CCleaner safe, and do you need it? What it does, what Windows 10 and 11 already do for free, the registry cleaner question, and how to remove it.',
    'ogTitle': 'Do you still need CCleaner? What Windows already does for free',
    'crumbName': 'Do I Need CCleaner?',
    'eyebrow': '// CCLEANER',
    'h1': 'Do you still need <em class="grad grad--cyan">CCleaner</em>?',
    'lede': 'For years CCleaner was the first thing many people put on a new PC. It&rsquo;s a legitimate program, but Windows 10 and 11 now do most of its job for free, and its registry cleaner is the part Microsoft says it doesn&rsquo;t support. Here&rsquo;s what it does, what Windows already does, and how to decide.',
    'chips': ['What Windows does free', 'The registry question', 'Keep it or remove it'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['What Windows does free', '#s3'],
    'ctaHead': 'Want a second opinion on what&rsquo;s on your PC?',
    'ctaSub': 'With your permission we connect to your Windows PC, look at what&rsquo;s installed and tidy it safely. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Is it safe?', 'It&rsquo;s a legitimate program. Download it only from ccleaner.com and untick any offers.'),
        ('Do you need it?', 'Usually not: Windows 10 and 11 clear junk files, manage startup and uninstall programs for free.'),
        ('The registry cleaner', 'Microsoft says it doesn&rsquo;t support registry cleaners. Leave that part alone.'),
        ('Junk files', 'Settings, System, Storage: Cleanup recommendations, and switch on Storage Sense.'),
        ('Slow PC?', 'Cleaning rarely fixes it. The usual causes are startup programs, a full or failing drive, or an old hard drive.'),
        ('Removing it', 'Settings, Apps, Installed apps, CCleaner, Uninstall. Cancel any paid plan with CCleaner too.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHAT IT DOES', 'h2': 'What CCleaner does',
         'html': '<p>CCleaner clears temporary files, browser history and caches, and offers a <strong>registry cleaner</strong>, a startup manager and an uninstaller. Its &ldquo;Health Check&rdquo; runs several of these in one go. The paid versions, sold as yearly subscriptions, add automatic cleaning, monitoring and driver updates.</p>'
                 '<p>All of that is real. The question in 2026 is whether you need a separate program for it.</p>'},
        {'eyebrow': '/02 &mdash; IS IT SAFE?', 'h2': 'Is CCleaner safe?',
         'html': '<p>CCleaner is a legitimate program from a well-known company. Three things are worth knowing:</p>'
                 '<ul>'
                 '<li><strong>The 2017 incident.</strong> Attackers got into the maker&rsquo;s systems and hid malware inside the official CCleaner 5.33, downloaded by millions between August and September 2017. It was found by Cisco&rsquo;s security team and fixed in 5.34. It was a one-off, but it shows why to download only from the maker&rsquo;s own site and keep programs updated.</li>'
                 '<li><strong>Offers during installation.</strong> Microsoft Defender has flagged CCleaner installers as a &ldquo;potentially unwanted app&rdquo; because they offered other software as they installed. Read each screen and untick anything you didn&rsquo;t ask for.</li>'
                 '<li><strong>The registry cleaner.</strong> Microsoft&rsquo;s own support policy says it doesn&rsquo;t support registry cleaning programs, that problems they cause may not be fixable without reinstalling Windows, and that the registry doesn&rsquo;t need cleaning for a PC to run well (<a href="https://support.microsoft.com/en-us/topic/2563254" rel="noopener" target="_blank">Microsoft</a>).</li>'
                 '</ul>'},
        {'eyebrow': '/03 &mdash; WHAT WINDOWS DOES FREE', 'h2': 'What Windows 10 and 11 already do for free',
         'html': '<div class="tblwrap"><table><thead><tr><th>CCleaner job</th><th>Where Windows does it</th></tr></thead><tbody>'
                 '<tr><td>Clear temporary and junk files</td><td>Settings, System, Storage, <strong>Cleanup recommendations</strong> or <strong>Temporary files</strong>. Switch on <strong>Storage Sense</strong> to do it automatically.</td></tr>'
                 '<tr><td>Clear browser history and cache</td><td>In the browser: Ctrl + Shift + Delete in Edge, Chrome and Firefox.</td></tr>'
                 '<tr><td>Stop programs starting with Windows</td><td>Settings, Apps, <strong>Startup</strong>, or Task Manager&rsquo;s Startup apps tab.</td></tr>'
                 '<tr><td>Uninstall programs</td><td>Settings, Apps, <strong>Installed apps</strong>.</td></tr>'
                 '<tr><td>Update drivers</td><td>Windows Update, including <strong>Optional updates</strong>, and the PC maker&rsquo;s own app.</td></tr>'
                 '<tr><td>Clean the registry</td><td>Not needed, and not supported by Microsoft.</td></tr>'
                 '</tbody></table></div>'
                 '<p>Step by step: <a href="/how-to-free-up-storage-space/">freeing up storage space</a> and <a href="/stop-programs-starting-with-windows/">stopping programs starting with Windows</a>.</p>'},
        {'eyebrow': '/04 &mdash; SLOW PC?', 'h2': 'If you got it because the PC is slow',
         'html': '<p>Deleting junk files frees space, but it rarely makes a PC faster. What usually does:</p>'
                 '<ul>'
                 '<li>Fewer programs starting with Windows.</li>'
                 '<li>Enough free space on the C: drive (aim for at least 15 per cent).</li>'
                 '<li>Replacing an old spinning hard drive with an SSD, the biggest single speed-up for an older PC: <a href="/hard-drive-upgrade/">hard drive upgrade</a>.</li>'
                 '<li>Checking the drive isn&rsquo;t failing: <a href="/how-to-check-ssd-health/">how to check your drive&rsquo;s health</a>.</li>'
                 '</ul>'
                 '<p>More in <a href="/how-to-speed-up-a-slow-computer/">how to speed up a slow computer</a>.</p>'},
        {'eyebrow': '/05 &mdash; KEEP IT OR REMOVE IT', 'h2': 'Keep it or remove it?',
         'html': '<p><strong>Keeping it is fine</strong> if you like it: use the cleaning, leave the registry cleaner alone, keep it updated, and say no to offers when it updates.</p>'
                 '<p><strong>To remove it:</strong> Settings, Apps, Installed apps, find <strong>CCleaner</strong>, then <strong>Uninstall</strong>, and restart. Paying for it? Cancel the subscription with CCleaner as well, or it may renew.</p>'
                 '<p>If you&rsquo;d like one place that tells you what&rsquo;s actually wrong instead of cleaning everything, that&rsquo;s why we made our free app, below.</p>'},
        {'eyebrow': '/06 &mdash; THE QUICK WAY', 'h2': 'Let our free app say what&rsquo;s worth keeping', 'html': '__APP_BOX_CCLEANER__'},
        {'eyebrow': '/07 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL.format(extra=' We look at what&rsquo;s installed, remove what isn&rsquo;t needed and set up Windows&rsquo; own clean-up, so nothing extra has to run.')},
    ],
    'howToName': 'How to clean up a Windows PC without CCleaner',
    'howToSteps': [
        {'name': 'Clear junk files', 'text': 'Settings, System, Storage: open Cleanup recommendations or Temporary files, and switch on Storage Sense.'},
        {'name': 'Clear browser data', 'text': 'In the browser, press Ctrl + Shift + Delete and choose what to clear.'},
        {'name': 'Cut startup programs', 'text': 'Settings, Apps, Startup: switch off what you do not need at start-up.'},
        {'name': 'Remove unused programs', 'text': 'Settings, Apps, Installed apps: uninstall what you no longer use.'},
        {'name': 'Leave the registry alone', 'text': 'Microsoft does not support registry cleaners, and Windows does not need one.'},
    ],
    'faqs': [
        {'q': 'Is CCleaner safe to use?', 'a': '<p>It&rsquo;s a legitimate program. Download it only from ccleaner.com, untick offers during installation, keep it updated and leave its registry cleaner alone.</p>'},
        {'q': 'Do I need CCleaner on Windows 11?', 'a': '<p>Usually not. Windows 11 clears junk files with Storage Sense and Cleanup recommendations, manages startup apps and uninstalls programs for free.</p>'},
        {'q': 'Should I use the registry cleaner?', 'a': '<p>No. Microsoft says it doesn&rsquo;t support registry cleaning programs and that problems they cause may need Windows reinstalling. The registry doesn&rsquo;t need cleaning.</p>'},
        {'q': 'Was CCleaner hacked?', 'a': '<p>In 2017 attackers hid malware in the official CCleaner 5.33. It was found and fixed in 5.34 within weeks. Current versions aren&rsquo;t affected; it&rsquo;s a reminder to download only from the maker and keep programs updated.</p>'},
        {'q': 'Will CCleaner make my PC faster?', 'a': '<p>Rarely by much. Fewer startup programs, enough free space and an SSD in place of an old hard drive make far more difference.</p>'},
        {'q': 'How do I uninstall CCleaner?', 'a': '<p>Settings, Apps, Installed apps, CCleaner, Uninstall, then restart. Cancel any paid subscription with CCleaner too.</p>'},
        {'q': 'Can you tidy my PC for me?', 'a': '<p>Yes. With your permission we connect to your Windows PC, remove what isn&rsquo;t needed and set up Windows&rsquo; own clean-up. Remote help from &pound;20, no fix, no fee.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/how-to-free-up-storage-space/">freeing up storage space</a>, <a href="/how-to-speed-up-a-slow-computer/">speeding up a slow computer</a>, <a href="/stop-programs-starting-with-windows/">stop programs starting with Windows</a>, <a href="/antimalware-service-executable-high-cpu/">Antimalware Service Executable slowing the PC</a>, <a href="/hp-support-assistant-keeps-popping-up/">HP Support Assistant pop-ups</a> and <a href="/lenovo-vantage-keeps-popping-up/">Lenovo Vantage pop-ups</a>.</p>',
}

HPSA = {
    'slug': 'hp-support-assistant-keeps-popping-up',
    'title': 'HP Support Assistant Keeps Popping Up? Turn It Down or Off',
    'metaDesc': 'HP Support Assistant notifications every day? How to switch them off, what you lose if you uninstall it, and how to remove it properly.',
    'ogTitle': 'HP Support Assistant keeps popping up? Turn it down or off',
    'crumbName': 'HP Support Assistant Pop-ups',
    'eyebrow': '// HP SUPPORT ASSISTANT',
    'h1': 'HP Support Assistant <em class="grad grad--cyan">keeps popping up</em>?',
    'lede': 'HP Support Assistant is HP&rsquo;s own app on most HP laptops and desktops. It offers driver and BIOS updates, checks the battery and hardware, and shows your warranty. Its pop-ups can get repetitive. You can quieten them, or remove the app altogether. Here&rsquo;s what each choice means.',
    'chips': ['Quieten it', 'Keep it or remove it', 'Nothing lost that matters'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Turn the notifications off', '#s2'],
    'ctaHead': 'Not sure what to keep on your HP?',
    'ctaSub': 'With your permission we connect to your Windows PC and sort it with you: what to keep, what to remove, and the updates done. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it is', 'HP&rsquo;s own app: driver and BIOS updates, battery and hardware checks, warranty.'),
        ('Quieten it', 'In the app: the settings (gear) icon, then Notifications. Or Windows Settings, System, Notifications.'),
        ('Remove it', 'Settings, Apps, Installed apps: HP Support Assistant, then HP Support Solutions Framework.'),
        ('What you lose', 'An easy way to get HP&rsquo;s BIOS updates. Windows Update still brings most drivers.'),
        ('Want it back?', 'Download it free from HP&rsquo;s own website at any time.'),
        ('A pop-up with a phone number?', 'In the web browser, that&rsquo;s a scam, not HP. Close it and don&rsquo;t ring.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHAT IT IS', 'h2': 'What HP Support Assistant does',
         'html': '<p>HP Support Assistant comes on most HP PCs. It checks HP&rsquo;s website for <strong>driver, BIOS and software updates</strong> for your exact model, runs <strong>battery and hardware checks</strong>, shows your <strong>warranty</strong>, and links to HP&rsquo;s support. Newer HP PCs may also have the <strong>myHP</strong> app, which does some of the same jobs.</p>'
                 '<p>It&rsquo;s genuine and useful. The trouble is how often it wants your attention.</p>'},
        {'eyebrow': '/02 &mdash; TURN IT DOWN', 'h2': 'Turn off HP Support Assistant notifications',
         'html': '<ol>'
                 '<li>Open <strong>HP Support Assistant</strong> from the Start menu.</li>'
                 '<li>Click the <strong>settings</strong> icon (a gear), then <strong>Notifications</strong>, and switch off the pop-up and tray alerts you don&rsquo;t want.</li>'
                 '<li>If they still appear, switch them off in Windows too: <strong>Settings</strong>, <strong>System</strong>, <strong>Notifications</strong>, then turn <strong>HP Support Assistant</strong> off. Do the same for any other HP app that nags.</li>'
                 '</ol>'
                 '<p>The menu names differ a little between versions. Windows&rsquo; own switch always works, because it blocks the app&rsquo;s notifications at Windows&rsquo; end.</p>'},
        {'eyebrow': '/03 &mdash; REMOVE IT', 'h2': 'Uninstall HP Support Assistant properly',
         'html': '<ol>'
                 '<li>Open <strong>Settings</strong>, <strong>Apps</strong>, <strong>Installed apps</strong>.</li>'
                 '<li>Find <strong>HP Support Assistant</strong>, choose <strong>Uninstall</strong>, and follow the steps.</li>'
                 '<li>Then uninstall <strong>HP Support Solutions Framework</strong>, the background part it leaves behind, if it&rsquo;s listed.</li>'
                 '<li><strong>Restart</strong> the PC.</li>'
                 '</ol>'
                 '<p>Use Windows&rsquo; own uninstall, not a third-party &ldquo;remover&rdquo;. You can download HP Support Assistant again free from HP&rsquo;s website whenever you want it back.</p>'},
        {'eyebrow': '/04 &mdash; KEEP IT OR NOT?', 'h2': 'Should you keep it?',
         'html': '<p><strong>Keep it</strong> if you&rsquo;d like HP to offer BIOS updates and check the battery for you: it&rsquo;s the easiest way to keep an HP&rsquo;s firmware current, and BIOS updates fix real problems.</p>'
                 '<p><strong>Remove it</strong> if the pop-ups bother you more than they help. Windows Update still brings most HP drivers, and HP&rsquo;s website has the BIOS for your model when you need it. Before a BIOS update on a PC with BitLocker, suspend BitLocker first: see <a href="/computer-asking-for-bitlocker-recovery-key/">BitLocker recovery key</a>.</p>'},
        {'eyebrow': '/05 &mdash; IS IT REALLY HP?', 'h2': 'A pop-up asking you to ring &ldquo;HP&rdquo;?',
         'html': '<p>HP Support Assistant runs in its own window from the Start menu. A <strong>web browser</strong> pop-up saying your HP is infected and giving a phone number to ring is a scam, not HP: close the browser and don&rsquo;t ring the number. Already rang and let someone in? See <a href="/gave-a-scammer-remote-access/">gave a scammer remote access</a>.</p>'},
        {'eyebrow': '/06 &mdash; THE QUICK WAY', 'h2': 'Let our free app say what&rsquo;s worth keeping', 'html': '__APP_BOX_MAKERAPP__'},
        {'eyebrow': '/07 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL.format(extra=' We can quieten or remove the HP apps you don&rsquo;t want and do the BIOS update safely, BitLocker included.')},
    ],
    'howToName': 'How to stop HP Support Assistant notifications',
    'howToSteps': [
        {'name': 'Open HP Support Assistant', 'text': 'Open HP Support Assistant from the Start menu.'},
        {'name': 'Switch off its notifications', 'text': 'Click the settings (gear) icon, then Notifications, and switch off the alerts you do not want.'},
        {'name': 'Block them in Windows', 'text': 'Settings, System, Notifications: turn HP Support Assistant off.'},
        {'name': 'Or uninstall it', 'text': 'Settings, Apps, Installed apps: uninstall HP Support Assistant, then HP Support Solutions Framework, and restart.'},
    ],
    'faqs': [
        {'q': 'How do I stop HP Support Assistant pop-ups?', 'a': '<p>In the app, click the settings (gear) icon, then Notifications, and switch them off. If they continue, Settings, System, Notifications, and turn HP Support Assistant off.</p>'},
        {'q': 'Can I uninstall HP Support Assistant?', 'a': '<p>Yes. Settings, Apps, Installed apps: uninstall HP Support Assistant, then HP Support Solutions Framework, and restart. You can download it again free from HP.</p>'},
        {'q': 'Do I need HP Support Assistant?', 'a': '<p>No, Windows works without it. It&rsquo;s the easiest way to get HP&rsquo;s BIOS updates and battery checks, so keep it if you value those.</p>'},
        {'q': 'Is HP Support Assistant a virus?', 'a': '<p>No, it&rsquo;s HP&rsquo;s own program, installed with the PC. A browser pop-up telling you to ring HP is a scam, though.</p>'},
        {'q': 'What is HP Support Solutions Framework?', 'a': '<p>The background part of HP Support Assistant. If you uninstall the app, uninstall this too.</p>'},
        {'q': 'Can you sort it for me?', 'a': '<p>Yes. With your permission we connect to your Windows PC and sort it while you watch. Remote help from &pound;20, no fix, no fee.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/lenovo-vantage-keeps-popping-up/">Lenovo Vantage pop-ups</a>, <a href="/dell-supportassist-keeps-popping-up/">Dell SupportAssist pop-ups</a>, <a href="/do-i-need-ccleaner/">do I need CCleaner?</a>, <a href="/how-to-check-laptop-battery-health/">laptop battery health</a> and <a href="/computer-asking-for-bitlocker-recovery-key/">BitLocker recovery key</a>.</p>',
}

VANTAGE = {
    'slug': 'lenovo-vantage-keeps-popping-up',
    'title': 'Lenovo Vantage Keeps Popping Up? Turn It Down or Off',
    'metaDesc': 'Lenovo Vantage messages and pop-ups? How to switch them off, what to set before you remove it (the battery setting), and how to uninstall it.',
    'ogTitle': 'Lenovo Vantage keeps popping up? Turn it down or off',
    'crumbName': 'Lenovo Vantage Pop-ups',
    'eyebrow': '// LENOVO VANTAGE',
    'h1': 'Lenovo Vantage <em class="grad grad--cyan">keeps popping up</em>?',
    'lede': 'Lenovo Vantage is Lenovo&rsquo;s own app on most Lenovo laptops. It handles updates, the warranty and handy laptop settings, including how the battery charges. Its messages and offers can get repetitive. You can quieten them, or remove it, but set the battery the way you want first.',
    'chips': ['Quieten it', 'The battery setting', 'Keep it or remove it'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Turn the messages off', '#s2'],
    'ctaHead': 'Not sure what to keep on your Lenovo?',
    'ctaSub': 'With your permission we connect to your Windows PC and sort it with you: what to keep, what to remove, and the updates done. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it is', 'Lenovo&rsquo;s own app: updates, warranty, battery and other laptop settings.'),
        ('Quieten it', 'In Vantage: its settings or preferences, Messages, switch off app features and marketing.'),
        ('Block it in Windows', 'Settings, System, Notifications: turn Lenovo Vantage off.'),
        ('Before removing it', 'Set the battery charging mode the way you want: changing it later needs Vantage.'),
        ('Remove it', 'Settings, Apps, Installed apps: Lenovo Vantage, then Lenovo Vantage Service.'),
        ('Want it back?', 'It&rsquo;s free in the Microsoft Store.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHAT IT IS', 'h2': 'What Lenovo Vantage does',
         'html': '<p>Lenovo Vantage comes on most Lenovo laptops and desktops. It checks for <strong>driver, BIOS and software updates</strong> for your model, shows the <strong>warranty</strong>, and holds settings Windows doesn&rsquo;t have, such as the <strong>battery charging mode</strong> (stopping at around 80 per cent to make the battery last longer), keyboard backlight and camera privacy. Business ThinkPads often have <strong>Lenovo Commercial Vantage</strong> instead, which does the same jobs without the offers.</p>'},
        {'eyebrow': '/02 &mdash; TURN IT DOWN', 'h2': 'Turn off Lenovo Vantage messages',
         'html': '<ol>'
                 '<li>Open <strong>Lenovo Vantage</strong> from the Start menu.</li>'
                 '<li>Open its <strong>settings</strong> or <strong>preferences</strong> (the gear, or the arrow by your name at the top right, depending on the version), find <strong>Messages</strong>, and switch off the app feature and marketing messages.</li>'
                 '<li>If messages still appear, switch them off in Windows: <strong>Settings</strong>, <strong>System</strong>, <strong>Notifications</strong>, then turn <strong>Lenovo Vantage</strong> off.</li>'
                 '<li>Want it not to start with Windows at all? <strong>Settings</strong>, <strong>Apps</strong>, <strong>Startup</strong>, and switch it off there.</li>'
                 '</ol>'
                 '<p>Lenovo moves these menus between versions, so the names may differ slightly on yours.</p>'},
        {'eyebrow': '/03 &mdash; BEFORE YOU REMOVE IT', 'h2': 'First: set the battery the way you want',
         'html': '<p>On many Lenovo laptops, Vantage is where you choose how the battery charges: full to 100 per cent, or a <strong>conservation</strong> or threshold mode that stops earlier so the battery wears more slowly, which is good for a laptop that&rsquo;s plugged in most of the time. Without Vantage you can&rsquo;t change it, so set it first.</p>'
                 '<p>Unsure how worn the battery is already? See <a href="/how-to-check-laptop-battery-health/">how to check laptop battery health</a>.</p>'},
        {'eyebrow': '/04 &mdash; REMOVE IT', 'h2': 'Uninstall Lenovo Vantage properly',
         'html': '<ol>'
                 '<li>Open <strong>Settings</strong>, <strong>Apps</strong>, <strong>Installed apps</strong>.</li>'
                 '<li>Find <strong>Lenovo Vantage</strong> and choose <strong>Uninstall</strong>.</li>'
                 '<li>Then uninstall <strong>Lenovo Vantage Service</strong>, the background part, if it&rsquo;s listed.</li>'
                 '<li><strong>Restart</strong> the PC.</li>'
                 '</ol>'
                 '<p>You can get Lenovo Vantage back free from the <strong>Microsoft Store</strong> at any time. Driver and BIOS updates are also on Lenovo&rsquo;s support website, and Windows Update brings most drivers.</p>'},
        {'eyebrow': '/05 &mdash; KEEP IT OR NOT?', 'h2': 'Should you keep it?',
         'html': '<p><strong>Keep it</strong> if you use its battery mode, want Lenovo&rsquo;s BIOS updates offered to you, or like its keyboard and camera settings. Quieten the messages instead.</p>'
                 '<p><strong>Remove it</strong> if you never open it and the messages bother you. Windows runs perfectly well without it.</p>'},
        {'eyebrow': '/06 &mdash; THE QUICK WAY', 'h2': 'Let our free app say what&rsquo;s worth keeping', 'html': '__APP_BOX_MAKERAPP__'},
        {'eyebrow': '/07 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL.format(extra=' We can set the battery mode, quieten or remove the Lenovo apps you don&rsquo;t want, and do the BIOS update safely, BitLocker included.')},
    ],
    'howToName': 'How to stop Lenovo Vantage messages and pop-ups',
    'howToSteps': [
        {'name': 'Open Lenovo Vantage', 'text': 'Open Lenovo Vantage from the Start menu.'},
        {'name': 'Switch off its messages', 'text': 'Open its settings or preferences, find Messages and switch off app feature and marketing messages.'},
        {'name': 'Block it in Windows', 'text': 'Settings, System, Notifications: turn Lenovo Vantage off.'},
        {'name': 'Set the battery first', 'text': 'If you will remove Vantage, choose the battery charging mode you want before you do.'},
        {'name': 'Or uninstall it', 'text': 'Settings, Apps, Installed apps: uninstall Lenovo Vantage, then Lenovo Vantage Service, and restart.'},
    ],
    'faqs': [
        {'q': 'How do I stop Lenovo Vantage pop-ups?', 'a': '<p>In Vantage, open its settings or preferences, find Messages and switch off the app feature and marketing messages. If they continue, Settings, System, Notifications, and turn Lenovo Vantage off.</p>'},
        {'q': 'Can I uninstall Lenovo Vantage?', 'a': '<p>Yes. Settings, Apps, Installed apps: uninstall Lenovo Vantage, then Lenovo Vantage Service, and restart. It&rsquo;s free to reinstall from the Microsoft Store.</p>'},
        {'q': 'Do I need Lenovo Vantage?', 'a': '<p>No, Windows works without it. Keep it if you use its battery charging mode or want Lenovo&rsquo;s BIOS updates offered to you.</p>'},
        {'q': 'What happens to the battery setting if I remove Vantage?', 'a': '<p>Set it the way you want first: Vantage is where you change it, so you&rsquo;d need Vantage back to change it again.</p>'},
        {'q': 'Is Lenovo Vantage safe?', 'a': '<p>Yes, it&rsquo;s Lenovo&rsquo;s own app. Keep it updated, as you would any program.</p>'},
        {'q': 'Can you sort it for me?', 'a': '<p>Yes. With your permission we connect to your Windows PC and sort it while you watch. Remote help from &pound;20, no fix, no fee.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/hp-support-assistant-keeps-popping-up/">HP Support Assistant pop-ups</a>, <a href="/dell-supportassist-keeps-popping-up/">Dell SupportAssist pop-ups</a>, <a href="/do-i-need-ccleaner/">do I need CCleaner?</a>, <a href="/how-to-check-laptop-battery-health/">laptop battery health</a> and <a href="/how-to-make-your-laptop-battery-last-longer/">making your laptop battery last longer</a>.</p>',
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
        # 28 Oct 2026 (PC-problem sweep): what the app really shows for each (Ui.cs, build 47)
        '__APP_BOX_RESTORE__': pfp._app_box('winsafety', 'Before you restore or reset: two checks',
            '<p style="margin:0">Its <strong>Safety</strong> page says whether <strong>System Restore</strong> is switched on, and the date of the newest restore point Windows made, so you know whether there&rsquo;s a day to go back to. '
            'Its <strong>Backup</strong> page (under Photos &amp; files) says which backup is on and when it last finished, and how big your important files are, so you know a reset can&rsquo;t take anything you haven&rsquo;t copied. It only reads.</p>', setup_url),
        '__APP_BOX_BSOD__': pfp._app_box('reliability', 'What keeps going wrong: every blue screen, in plain words',
            '<p style="margin:0">It reads the same record as Reliability Monitor and puts it in plain words: blue screens and unexpected shutdowns in the last 90 days, which programs crashed or froze in the last 30, updates that failed, and Windows&rsquo; own stability score. '
            'Fixed something? <strong>Start a fresh list</strong> counts from now, so you can see whether the blue screens come back. It never guesses at a cause, and a button opens Reliability Monitor for the stop code.</p>', setup_url),
        '__APP_BOX_DEFENDER__': pfp._app_box('programs', 'Programs check: is more than one antivirus running?',
            '<p style="margin:0">It reads Windows&rsquo; own register of security programs and says which one is protecting the PC, and warns when <strong>two are protecting at once</strong> &mdash; the usual reason Defender never settles &mdash; or when one is switched on but <strong>out of date</strong>, often a subscription that has ended. '
            'It also lists programs the PC doesn&rsquo;t need, such as tune-up tools and driver updaters, each with the reason. It only reads: you remove things in Settings.</p>', setup_url),
        '__APP_BOX_SAC__': pfp._app_box('winsafety', 'Safety settings: is the rest of Windows&rsquo; protection on?',
            '<p style="margin:0">Whatever you decide about Smart App Control, the app checks the protections that stay: which antivirus is on duty (and Defender&rsquo;s <strong>tamper protection</strong>), <strong>SmartScreen</strong>&rsquo;s check on downloads and whether a policy switched it off, the &ldquo;allow this app to make changes?&rdquo; question, and memory integrity. '
            'It doesn&rsquo;t read Smart App Control itself: that&rsquo;s in Windows Security, as above. Each button opens the right Windows setting.</p>', setup_url),
        # 29 Oct 2026 (programs like ours): the Programs check's own verdicts (programs-rules.json) - CCleaner "not needed",
        # the PC makers' apps "fine to keep"
        '__APP_BOX_CCLEANER__': pfp._app_box('programs', 'Programs check: what&rsquo;s worth keeping on your PC',
            '<p style="margin:0">It looks through your installed programs and names the ones the PC doesn&rsquo;t need &mdash; tune-up and registry cleaners (CCleaner included), driver updaters, adware and programs that no longer get security fixes &mdash; each with the reason in plain English. '
            'It also says which security program is protecting the PC, and warns when two are running at once. It doesn&rsquo;t clean anything itself: you remove things in Settings, or we can do it with you.</p>', setup_url),
        '__APP_BOX_MAKERAPP__': pfp._app_box('programs', 'Programs check: what&rsquo;s worth keeping on your PC',
            '<p style="margin:0">It looks through your installed programs and says which are fine to keep &mdash; the PC maker&rsquo;s own app, HP&rsquo;s, Lenovo&rsquo;s or Dell&rsquo;s, is one of them &mdash; and which the PC doesn&rsquo;t need: tune-up tools, driver updaters, adware and programs that no longer get security fixes, each with the reason. '
            'It also says which security program is protecting the PC. It only reads: you remove things in Settings.</p>', setup_url),
        '__APP_BOX_BACKUP__': pfp._app_box('backup', 'Backup: is it on, and would your files fit on a drive?',
            '<p style="margin:0">It says which backup is switched on &mdash; File History, OneDrive folder backup or Windows 7&rsquo;s Backup and Restore &mdash; and when it last finished, how big your important files are, and how much space each drive has, so you can see whether a USB drive would hold them. '
            '<strong>Test my backup</strong> opens one real file from the backup and checks it reads back. It never deletes anything without asking.</p>', setup_url),
    }
    out = []
    for d in (PRINTER, TOUCHPAD, ROTATE, CHARGING, UPDATES, PASSWORD, RESERVED, WIFI, CLIPBOARD, SECBOOT, PHONELINK, NTLWORLD, SPOTLIGHT, W11LIKE10, RESTORE, BSOD, DEFENDER, SAC, WINBACKUP, CCLEANER, HPSA, VANTAGE):
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
    RESTORE['slug']: {'h2': 'Put Windows right, lightest fix first', 'ask': 'Is it working properly now?',
                      'tip': 'Switch System Restore on, and make a restore point, for next time.',
                      'h3s': 'Still wrong after every step? Ring us before you reset.'},
    BSOD['slug']: {'h2': 'Stop the blue screens, step by step', 'ask': 'Has it stopped happening?',
                   'tip': 'Give it a week, then look at Reliability Monitor again to be sure.',
                   'h3s': 'Still blue-screening? That is a job for the crash dump files.'},
    DEFENDER['slug']: {'h2': 'Calm it down, step by step', 'ask': 'Has it settled down?',
                       'tip': 'Leave the PC on and plugged in for an hour once a week, so scans run while you are away.',
                       'h3s': 'Still busy all day? That is a remote job.'},
    SAC['slug']: {'h2': 'Get the program running safely, step by step', 'ask': 'Is it running now?',
                  'tip': 'Keep the installer from the maker&rsquo;s own site, so you can reinstall it later.',
                  'h3s': 'Still blocked, and not sure about switching it off? Ring us.'},
    WINBACKUP['slug']: {'h2': 'Check your backup, step by step', 'mode': 'seq', 'yes': 'Done, next step', 'no': 'I am stuck here',
                        'last_yes': 'Done, all covered', 'ask': 'Done that step?',
                        'lede': 'Work through it one step at a time: press <strong>Done</strong> when you have finished each step, or <strong>I am stuck here</strong> and we will take it from there. Nothing here leaves your device.',
                        'h3f': 'All covered{mins}. Nice work.',
                        'tip': 'Plug the USB drive in once a week, and keep it unplugged in between.',
                        'h3s': 'Stuck at a step? We can set it up with you, remotely.'},
    CCLEANER['slug']: {'h2': 'Tidy the PC the Windows way, step by step', 'mode': 'seq', 'yes': 'Done, next step', 'no': 'I am stuck here',
                       'last_yes': 'Done, all tidy', 'ask': 'Done that step?',
                       'lede': 'Work through it one step at a time: press <strong>Done</strong> when you have finished each step, or <strong>I am stuck here</strong> and we will take it from there. Nothing here leaves your device.',
                       'h3f': 'All tidy{mins}. Nice work.',
                       'tip': 'Switch on Storage Sense, so the junk files clear themselves from now on.',
                       'h3s': 'Stuck at a step? We can tidy it with you, remotely.'},
    HPSA['slug']: {'h2': 'Quieten it, step by step', 'ask': 'Has it gone quiet?',
                   'yes': 'Yes, it&rsquo;s quiet', 'no': 'Not yet',
                   'tip': 'Check for HP BIOS updates now and then, or keep the app for that alone.',
                   'h3s': 'Still popping up? That is a quick remote job.'},
    VANTAGE['slug']: {'h2': 'Quieten it, step by step', 'ask': 'Has it gone quiet?',
                      'yes': 'Yes, it&rsquo;s quiet', 'no': 'Not yet',
                      'tip': 'If the laptop is plugged in most of the time, use the battery conservation mode.',
                      'h3s': 'Still popping up? That is a quick remote job.'},
}
