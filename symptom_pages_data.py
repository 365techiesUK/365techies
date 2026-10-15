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
                 '<li><strong>New router, new broadband or a changed Wi-Fi password?</strong> The printer is still looking for the old one: see <a href="/printer-wont-connect-after-changing-broadband/">printer won&rsquo;t connect after changing broadband</a> and <a href="/printer-stopped-working-after-changing-wifi-password/">printer stopped after changing the Wi-Fi password</a>.</li>'
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
                 '<li><strong>Use Windows 11&rsquo;s own repair:</strong> Settings, System, Recovery, <strong>Fix problems using Windows Update</strong>, then <strong>Reinstall now</strong>. It reinstalls the version of Windows you already have, repairs Windows&rsquo; own files, and keeps your files, apps and settings (<a href="https://support.microsoft.com/en-us/windows/deployment/install-upgrade/fix-issues-by-reinstalling-the-current-version-of-windows" rel="noopener" target="_blank">Microsoft</a>). Keep the PC plugged in and online until it finishes. It may not appear on PCs managed by a work or school.</li>'
                 '</ol>'
                 '<p><strong>The big yearly update keeps undoing itself?</strong> If it restarts, says &ldquo;Undoing changes made to your computer&rdquo; and goes back to the desktop, or Microsoft&rsquo;s installer says &ldquo;We couldn&rsquo;t update the system reserved partition&rdquo;, the usual cause is a full start-up partition, not a broken PC. We fixed exactly that on a customer&rsquo;s Dell in October 2026 (5 KB free, 15 MB needed): <a href="/we-couldnt-update-the-system-reserved-partition/">how to check it and free the space safely</a>.</p>'
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
        {'name': 'Repair Windows', 'text': 'Back up first, then Settings, System, Recovery, Fix problems using Windows Update, Reinstall now.'},
    ],
    'faqs': [
        {'q': 'How long should a Windows update take?', 'a': '<p>Monthly updates usually take minutes. The big yearly updates can take an hour or more, and the percentage can stay still for a long time.</p>'},
        {'q': 'Is it safe to switch off during an update?', 'a': '<p>Avoid it. On the &ldquo;Working on updates&rdquo; screen, wait at least an hour or two. Only if nothing changes for several hours, hold the power button to switch off; Windows usually carries on or undoes the update.</p>'},
        {'q': 'Why does Windows Update keep failing?', 'a': '<p>Common causes are too little free space, a damaged update download or Windows file, or a device or driver the update doesn&rsquo;t like. Update history shows the error code. If it&rsquo;s the big yearly update that keeps undoing itself, check the hidden start-up partition: <a href="/we-couldnt-update-the-system-reserved-partition/">we couldn&rsquo;t update the system reserved partition</a>.</p>'},
        {'q': 'What does Fix problems using Windows Update do?', 'a': '<p>It reinstalls the version of Windows 11 you already have, repairing Windows&rsquo; own files, and keeps your files, apps and settings. Back up first anyway.</p>'},
        {'q': 'Will I lose my files?', 'a': '<p>Not from the steps on this page. Back up before any repair, just in case.</p>'},
        {'q': 'Can you fix it remotely?', 'a': '<p>Usually, yes: with your permission we connect to your Windows PC and get the updates through while you watch.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/we-couldnt-update-the-system-reserved-partition/">the yearly update undoing itself (system reserved partition)</a>, <a href="/why-windows-updates-break-things/">why Windows updates break things</a>, <a href="/is-my-windows-still-supported/">is my Windows still supported?</a>, <a href="/why-does-my-pc-keep-crashing/">why does my PC keep crashing?</a> and <a href="/windows-11-support/">Windows 11 help</a>.</p>',
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
    'crossLinksHtml': '<p>Related: <a href="/password-manager-setup/">password manager set-up</a>, <a href="/computer-asking-for-bitlocker-recovery-key/">BitLocker recovery key</a>, <a href="/gave-a-scammer-remote-access/">gave a scammer remote access?</a> and <a href="/employee-left-dont-know-computer-password/">employee left, password unknown</a>.</p>',
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
                 '<p>Older PCs that were upgraded from Windows 10, and many laptops that came with a 100 MB partition from the factory, hit it most, and they hit it again at each yearly update.</p>'},
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
        {'eyebrow': '/07 &mdash; THE QUICK WAY', 'h2': 'Let our free app watch the updates', 'html': '__APP_BOX_UPDATES__'},
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
        {'q': 'Why does it say my PC doesn&rsquo;t meet the requirements?', 'a': '<p>Windows Setup lists this space check on its requirements screen. If your PC already runs Windows 11, free space on that partition is the only requirement it is failing.</p>'},
        {'q': 'Is it safe to delete the boot fonts?', 'a': '<p>The foreign-language ones, yes: they only draw the start-up and recovery screens in Chinese, Japanese and Korean, and Windows keeps its own copies on C:. Keep the four English ones so those screens still show their text.</p>'},
        {'q': 'Will I lose my files?', 'a': '<p>No. The fix only removes font files from the hidden partition, and the yearly update itself keeps your files, apps and settings.</p>'},
        {'q': 'Can I just make the partition bigger?', 'a': '<p>It can be done, but it means moving the whole C: drive in a special start-up mode, and if that fails the PC won&rsquo;t start. Only with a full backup first, ideally on a workbench.</p>'},
        {'q': 'Will it come back next year?', 'a': '<p>It can, because yearly updates may restore the fonts and a 100 MB partition is always tight. Check the free space after each big update.</p>'},
        {'q': 'Can you fix it remotely?', 'a': '<p>Usually, yes: with your permission we connect to your Windows PC, free the space safely and get the update installed while you watch. Enlarging a partition that is simply too small is a workshop job, and we can collect.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/windows-update-stuck/">Windows Update stuck or failing</a>, <a href="/will-i-lose-files-upgrading-to-windows-11/">will I lose my files upgrading?</a>, <a href="/computer-asking-for-bitlocker-recovery-key/">computer asking for a BitLocker recovery key</a>, <a href="/is-my-windows-still-supported/">is my Windows still supported?</a> and <a href="/windows-11-support/">Windows 11 help</a>.</p>',
}


def symptom_pages(setup_url):
    """The pages, with the 365 PC Manager boxes filled in (the same boxes and wording as the feature pages)."""
    import pcm_feature_pages_data as pfp
    boxes = {
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
    for d in (PRINTER, TOUCHPAD, ROTATE, CHARGING, UPDATES, PASSWORD, RESERVED):
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
}
