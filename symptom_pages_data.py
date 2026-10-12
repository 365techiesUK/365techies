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


def symptom_pages(setup_url):
    """The pages, with the 365 PC Manager Printers box filled in (the same box and wording as the feature pages)."""
    import pcm_feature_pages_data as pfp
    box = pfp._app_box('printer', 'Printers: what&rsquo;s stuck, and one button to clear it',
        '<p style="margin:0">It lists every printer as Windows sees it, shows any documents stuck in the queue with a button that cancels only those, and tells you if Windows&rsquo; printing service has stopped. '
        'It only reads, until you press a button.</p>', setup_url)
    out = []
    for d in (PRINTER, TOUCHPAD, ROTATE):
        d = dict(d, sections=[dict(x) for x in d['sections']])
        for x in d['sections']:
            x['html'] = x['html'].replace('__APP_BOX_PRINTER__', box)
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
}
