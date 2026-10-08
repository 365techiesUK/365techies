# -*- coding: utf-8 -*-
"""365 PC Manager feature pages: one real problem each, solved on the page, with the free app as the quick check.

Owner, 8 Oct 2026: "pages on each individual feature ... research all the SEO, AI ... SERPs ... funnels into people
getting them to download it and install it", then "yes, draft those". The research (memory pcm-feature-pages-research):
our own Search Console says one-problem fix pages and free in-page tools earn (spec checker 841 clicks, printer
disappeared 123) while general how-to guides earn nothing, so each page here answers ONE search a person types, in the
shape of printer-disappeared-after-windows-update (built by build_extra.build_new_page from this data).

Every claim about the app is pinned to what the RELEASED app does (365 PC Manager v35, unchanged in v36 - released 8 Oct;
v36 moved all four under My PC in its new menu):
  Sound check  (Sound.cs)   where the sound goes, mute and volume, a test sound and a microphone test; names Bluetooth
                            headphones stuck in phone-call ("Hands-Free") mode from the format Windows reports. It never
                            changes the default device - it opens Windows' Sound settings.
  Screen check (Screens.cs) each screen's name and age, the size and refresh rate it runs at, its own size, and a better
                            setting when Windows offers one. It never changes the setting itself.
  Printers     (Ui.cs)      each printer as Windows sees it, documents stuck in the queue with a button that cancels only
                            those, and whether Windows' printing service is running.
  Power & running cost      on a laptop running on battery, the whole laptop; on a desktop, the processor (and an NVIDIA
                            graphics card) only - never the screen or disks; hour-by-hour history; your own price a unit;
                            the Eco / Everyday / Full speed modes.
NOT the v36 volume boost / equaliser: that only works on music and radio played in the app's own player - never claim
it makes YouTube, calls or games louder.

LIVE went True on 8 Oct 2026 with the released v36 app's own screens (it had held them back for the new look).
Preview locally: set PCM_FEATURE_PREVIEW=1 and build; build again without it before committing anything else.
The electricity price is Ofgem's cap for 1 Oct - 31 Dec 2026 (Direct Debit, GB average), read on ofgem.gov.uk on
8 Oct 2026: 26.32p a kWh, 54.83p a day standing charge. Update PRICE_P / PRICE_FROM each quarter.
"""

LIVE = True

PRICE_P = 26.32            # pence per kWh, Ofgem price cap, Direct Debit, GB average
PRICE_FROM = "1 October to 31 December 2026"
PRICE_SRC = '<a href="https://www.ofgem.gov.uk/information-consumers/energy-advice-households/get-energy-price-cap-standing-charges-and-unit-rates-region" rel="noopener" target="_blank">Ofgem</a>'

# the app screens: the released v36 app CATCHING each problem (a made-up sample PC), cropped to the page below its menu bar,
# 2x (scratchpad 8682606b art36/feat36.py). (file, width, height, alt, where it is in the app's menu)
SHOTS = {
    'sound':   ('/images/pcm-feat-sound-v36.webp', 1272, 1440, 'Sound check in 365 PC Manager saying the headphones are in phone-call mode, so sound is muffled: the Hands-Free headset is in use at 16 kHz mono, with a Play a test sound button', ('My PC', 'Sound check')),
    'screen':  ('/images/pcm-feat-screen-v36.webp', 1272, 1012, 'Screen check in 365 PC Manager saying a sharper or smoother setting is available: a 2560 x 1440 monitor running at 60 Hz that can do 144 Hz', ('My PC', 'Screen check')),
    'printer': ('/images/pcm-feat-printers-v36.webp', 1272, 864, 'Printers in 365 PC Manager saying 2 documents are stuck in the queue, with a Clear stuck documents button', ('My PC', 'Printers')),
    'power':   ('/images/pcm-feat-power-v36.webp', 1272, 1408, 'Power and running cost in 365 PC Manager: hours on in the last 30 days, the energy and roughly what it cost, the Eco, Everyday and Full speed modes and an hour-by-hour power history', ('My PC', 'Power &amp; running cost')),
    'radio':   ('/images/pcm-feat-radio-v36.webp', 1864, 890, 'Radio in 365 PC Manager: radio for listeners in the United Kingdom, with the Near you list of Dorset stations - Hot Radio, Forest FM, Radio Wimborne, Nation Radio South Coast, Heart Dorset - and buttons for the BBC stations', ('Music &amp; games', 'the Radio tab')),
    'passwords': ('/images/pcm-feat-passwords-v36.webp', 1292, 684, 'Scam check in 365 PC Manager: Has one of my passwords leaked? with a Check safely button, and Make me a strong password showing Nectar-Pelican-Sunflower-976% with Make another and Copy buttons', ('Safety', 'Scam check')),
    'qr':      ('/images/pcm-feat-qr-v36.webp', 1300, 670, 'The QR code maker in 365 PC Manager: a web address, phone number or note turned into a QR code, with Save as a picture, Copy and Print buttons', ('Internet &amp; email', 'More internet tools, then QR code maker')),
    'wificard': ('/images/pcm-feat-wificard-v36.webp', 1320, 724, 'The Guest Wi-Fi card in 365 PC Manager: the Wi-Fi name and password typed in, and a printable card with the QR code, the network name and the password', ('Internet &amp; email', 'More internet tools, then Guest Wi-Fi card')),
    'alarm':   ('/images/pcm-feat-alarm-v36.webp', 1132, 962, 'The wake-up alarm in 365 PC Manager: it rings at 07:00 on weekdays with Radio Wimborne, up to 40% volume, rising over 10 minutes from almost silent, with Try it now and Save buttons', ('Music &amp; games', 'Big view, then Alarms &amp; timers')),
    'hometimer': ('/images/pcm-feat-hometimer-v36.webp', 1132, 962, 'The Someone&rsquo;s home timer in 365 PC Manager: it plays Radio Wimborne from 08:00 until 10:30 every day at 35% volume, with Shift the times a little each day switched on, and Try it now and Save buttons', ('Music &amp; games', 'Big view, then Alarms &amp; timers')),
    'cds':     ('/images/pcm-feat-cds-v36.webp', 1272, 668, 'The CDs tab in 365 PC Manager on a PC with no CD drive: it explains that a plug-in USB CD drive works, under the music player (a sample library)', ('Music &amp; games', 'the CDs tab')),
}

# the picture's caption, where "catching it" doesn't fit
CAPS = {'radio': 'The real app (a sample PC).', 'passwords': 'The real app, on our office PC.', 'qr': 'The real app, on our office PC.', 'wificard': 'The real app (sample details).', 'alarm': 'The real app&rsquo;s alarm (a sample setting).', 'hometimer': 'The real app&rsquo;s timer (a sample setting).'}


def _app_box(key, head, what_html, setup_url, note=''):
    src, w, h, alt, where = SHOTS[key]
    return (f'<div class="pfa" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:1.3rem;align-items:center;margin:.4rem 0 0;padding:1.2rem 1.3rem;'
            f'border-radius:18px;border:1px solid rgba(29,151,227,.42);background:linear-gradient(135deg,rgba(29,151,227,.10),rgba(255,255,255,.02))">'
            f'<div><p class="mono" style="margin:0 0 .4rem;font-size:.72rem;letter-spacing:.08em;color:var(--cyan-soft)">FREE &middot; WINDOWS 10 &amp; 11 &middot; NO SIGN-UP</p>'
            f'<h3 style="margin:0 0 .5rem;font-size:1.25rem;line-height:1.25">{head}</h3>{what_html}'
            f'<p style="margin:.6rem 0 0;font-size:.92rem">In the app: <b>{where[0]}</b>, then <b>{where[1]}</b>.</p>'
            f'<p style="margin:1rem 0 0;display:flex;flex-wrap:wrap;gap:.6rem"><a class="button primary" href="{setup_url}" download data-pfa-dl="{key}" style="text-decoration:none">Download 365 PC Manager free &#8595;</a>'
            f'<a class="button secondary" href="/free-pc-health-check/" style="text-decoration:none">What else it checks</a></p>'
            f'<p style="margin:.7rem 0 0;font-size:.82rem;color:var(--muted)">Made by us, a family IT firm in Bournemouth since 1995, and digitally signed by 365 Techies Ltd.{note}</p></div>'
            f'<figure style="margin:0"><img src="{src}" width="{w}" height="{h}" alt="{alt}" loading="lazy" decoding="async" '
            f'style="display:block;width:100%;height:auto;border-radius:12px;border:1px solid rgba(125,170,220,.3);box-shadow:0 22px 50px -26px rgba(0,0,0,.8)">'
            f'<figcaption style="font-size:.72rem;color:var(--muted);margin-top:.4rem">{CAPS.get(key, "The real app catching it (a sample PC).")}</figcaption></figure></div>'
            f'<style>@media (max-width:820px){{.pfa{{grid-template-columns:1fr!important}}}}</style>'
            f'<script>(function(){{var a=document.querySelectorAll("[data-pfa-dl]");for(var i=0;i<a.length;i++)a[i].addEventListener("click",function(){{'
            f'try{{if(typeof window.gtag==="function")window.gtag("event","pcm_download_click",{{page:location.pathname,place:"feature_"+this.getAttribute("data-pfa-dl")}});}}catch(e){{}}}});}})();</script>')


def _call_us(what):
    return ('<p>' + what + ' Ring <strong>01202 775566</strong> or text 07520 615332, Monday to Friday, 9 to 5. With your permission we '
            'connect to your Windows PC and sort it while you watch: usually the same day, remote help from &pound;20, and no fix, no fee.</p>')


# ============================================================ 1. Bluetooth headphones sound muffled
BT = {
    'slug': 'bluetooth-headphones-sound-muffled-on-pc',
    'title': 'Bluetooth Headphones Sound Muffled on PC? The Fix | 365 Techies',
    'metaDesc': 'Bluetooth headphones sound muffled or tinny on your Windows PC, often only on calls? Windows has put them in phone-call mode. Here is the fix.',
    'ogTitle': 'Bluetooth headphones sound muffled on your PC? Here&rsquo;s why',
    'crumbName': 'Bluetooth Headphones Sound Muffled',
    'eyebrow': '// BLUETOOTH HEADPHONES SOUND MUFFLED',
    'h1': 'Bluetooth headphones <em class="grad grad--cyan">sound muffled</em> on your PC?',
    'lede': 'Your headphones sounded fine yesterday and now they sound flat, tinny or like an old phone line. They are almost never broken: Windows has switched them into phone-call mode because something wants their microphone. Here&rsquo;s how to tell, and three ways to get proper sound back.',
    'chips': ['Usually a two-minute fix', 'Free sound check app', 'Windows specialists since 1995'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['See remote support', '/remote-support/'],
    'ctaHead': 'Still muffled? We&rsquo;ll sort it.', 'ctaSub': 'We connect to your Windows PC and get proper sound back while you watch, usually the same day. No fix, no fee. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Most likely cause', 'Windows has switched them to phone-call (&lsquo;Hands-Free&rsquo;) mode, because an app opened their microphone.'),
        ('Are the headphones broken?', 'Almost never. The same headphones sound normal again the moment the microphone is let go.'),
        ('Quickest fix', 'Choose the &lsquo;Headphones&rsquo; output, not &lsquo;Headset &hellip; Hands-Free&rsquo;, and use the laptop&rsquo;s own microphone for calls.'),
        ('Stop it for good', 'Untick &lsquo;Hands-free Telephony&rsquo; in the headphones&rsquo; Properties. The headset microphone then stops working on that PC; you can tick it again.'),
        ('Newer kit', 'Windows 11 24H2 with a PC and headset that both support Bluetooth LE Audio keeps stereo sound during calls.'),
        ('Free check', 'The Sound check in our free 365 PC Manager app names phone-call mode when it finds it.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; START HERE', 'h2': 'Muffled Bluetooth headphones on a PC? Start here',
         'html': '<p>If your Bluetooth headphones suddenly sound <strong>muffled, tinny, flat or like a phone call</strong> on your Windows PC, the cause is almost always the same: Windows has switched them out of their music mode and into their <strong>phone-call mode</strong>. It does that the moment any program opens the headphones&rsquo; microphone &mdash; a Teams or Zoom call, Discord, WhatsApp on the PC, a game&rsquo;s voice chat, or a website that asked to use your microphone.</p>'
                 '<p>You can see it for yourself. Click the <strong>speaker icon</strong> by the clock, then the small arrow next to the volume slider (on Windows 10, click the name above the slider). If your headphones appear twice &mdash; once as <strong>Headphones</strong> and once as <strong>Headset</strong> or <strong>Hands-Free</strong> &mdash; and the Headset one is ticked, that is your muffled sound.</p>'
                 '<p>It happens on Windows 10 and Windows 11, with every make: AirPods, Sony, Bose, Jabra, cheap earbuds alike. The fixes below are free and take a couple of minutes.</p>'},
        {'eyebrow': '/02 &mdash; WHY IT HAPPENS', 'h2': 'Why Windows makes them sound like a phone line',
         'html': '<p>Ordinary Bluetooth headphones have two ways of talking to a computer. <strong>Stereo mode</strong> sends good-quality music one way only, with the microphone switched off. <strong>Phone-call mode</strong> (Windows calls it Hands-Free) carries your voice both ways, but squeezes the sound down to mono at a much lower quality &mdash; roughly what a landline gives you. The two can&rsquo;t run at once on most headphones, so as soon as a program wants the microphone, Windows drops into phone-call mode and everything you hear goes muffled with it, music and game sound included.</p>'
                 '<p>The newer Bluetooth <strong>LE Audio</strong> standard fixes this: with Windows 11 version 24H2, a PC and headset that <em>both</em> support it keep stereo sound during calls. Most headphones and laptops in use today don&rsquo;t, so the fixes below are still the way.</p>'},
        {'eyebrow': '/03 &mdash; FIX 1', 'h2': 'Pick the stereo output, and a different microphone',
         'html': '<ol>'
                 '<li><strong>Choose the Headphones output.</strong> Click the speaker icon by the clock, then the arrow next to the volume slider, and pick <strong>Headphones (your headphones&rsquo; name)</strong>, not the one called Headset or Hands-Free. Or open <strong>Settings &gt; System &gt; Sound</strong> and choose it under Output.</li>'
                 '<li><strong>Give calls a different microphone.</strong> In the same Sound settings, under Input, choose the laptop&rsquo;s own microphone (often called Microphone Array) or a USB microphone, so programs stop grabbing the headset&rsquo;s.</li>'
                 '<li><strong>Tell your call program too.</strong> In Teams, Zoom or Discord, open its settings and set the speaker to your headphones and the microphone to the laptop or USB microphone. Programs remember their own choice and can ignore Windows&rsquo;.</li>'
                 '</ol><p>Play some music. If it sounds full again, you&rsquo;re done: the headphones were never broken.</p>'},
        {'eyebrow': '/04 &mdash; FIX 2', 'h2': 'Keeps switching back? Turn off phone-call mode for good',
         'html': '<p>If a program keeps flipping the headphones back into phone-call mode, you can switch that mode off for those headphones on this PC. The trade-off: their built-in microphone stops working on the PC (it still works with your phone), so use the laptop&rsquo;s microphone for calls.</p>'
                 '<ol><li><strong>Open the classic Devices and Printers window.</strong> Press <strong>Windows key + R</strong>, paste <strong>shell:::{A8A91A66-3A7D-4424-8D24-04E180695C7A}</strong> and press Enter.</li>'
                 '<li><strong>Open the headphones&rsquo; Properties.</strong> Right-click your headphones and choose <strong>Properties</strong>, then the <strong>Services</strong> tab.</li>'
                 '<li><strong>Untick Hands-free Telephony</strong> and press OK. Windows may take a few seconds to reconnect them.</li></ol>'
                 '<p>Changed your mind? Tick it again the same way and the headset microphone comes back.</p>'},
        {'eyebrow': '/05 &mdash; FIX 3', 'h2': 'Still muffled with no microphone in use?',
         'html': '<ul><li><strong>Remove and pair them again.</strong> In Settings &gt; Bluetooth &amp; devices, remove the headphones, put them in pairing mode and add them again. That clears a muddled connection.</li>'
                 '<li><strong>Update the Bluetooth driver.</strong> Get it from your PC or laptop maker&rsquo;s support page for your model, or from Windows Update &gt; Advanced options &gt; Optional updates.</li>'
                 '<li><strong>Turn off sound effects you didn&rsquo;t ask for.</strong> In Sound settings, open the headphones and switch off Audio enhancements, then compare.</li>'
                 '<li><strong>Use a headset with its own USB dongle for calls.</strong> Headsets that come with a small USB receiver don&rsquo;t use Bluetooth&rsquo;s phone-call mode at all, so they keep good sound and a microphone together.</li></ul>'},
        {'eyebrow': '/06 &mdash; THE QUICK WAY', 'h2': 'Let our free app check it for you',
         'html': '__APP_BOX_SOUND__'},
        {'eyebrow': '/07 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _call_us('If the sound is still muffled after all three fixes, or the headphones keep dropping out, it&rsquo;s worth a proper look.')
                 + '<p>It may also be the PC&rsquo;s own Bluetooth: older laptops and cheap plug-in Bluetooth adapters can struggle, and a modern adapter costs little. We&rsquo;ll tell you honestly which it is.</p>'},
    ],
    'howToName': 'How to fix muffled Bluetooth headphones on a Windows PC',
    'howToSteps': [
        {'name': 'Check which mode Windows is using', 'text': 'Click the speaker icon by the clock and the arrow next to the volume slider. If your headphones are listed twice and the Headset or Hands-Free one is ticked, Windows has put them in phone-call mode.'},
        {'name': 'Choose the Headphones output', 'text': 'Pick Headphones (your headphones&rsquo; name) instead, or choose it in Settings, System, Sound, under Output.'},
        {'name': 'Use a different microphone for calls', 'text': 'In Sound settings, under Input, choose the laptop&rsquo;s own microphone or a USB microphone, and set the same in Teams, Zoom or Discord.'},
        {'name': 'Turn off Hands-free Telephony if it keeps switching', 'text': 'Press Windows key + R, paste shell:::{A8A91A66-3A7D-4424-8D24-04E180695C7A}, right-click the headphones, choose Properties, then Services, and untick Hands-free Telephony. The headset microphone then stops working on that PC.'},
        {'name': 'Pair them again and update the Bluetooth driver', 'text': 'Remove the headphones in Settings, Bluetooth &amp; devices, pair them again, and get the latest Bluetooth driver from your PC maker or Windows Update&rsquo;s optional updates.'},
    ],
    'faqs': [
        {'q': 'Why do my headphones sound fine until I join a Teams or Zoom call?', 'a': '<p>Because the call opens the headphones&rsquo; microphone, and on most Bluetooth headphones Windows can only use the microphone in phone-call mode, which is mono and much lower quality. Set the call program&rsquo;s microphone to the laptop&rsquo;s own, and the headphones stay in stereo.</p>'},
        {'q': 'Why do my Bluetooth headphones sound muffled in games?', 'a': '<p>Usually a voice chat &mdash; Discord, or the game&rsquo;s own &mdash; has opened the headset microphone, so Windows switched to phone-call mode for everything, game sound included. Point the chat at another microphone, or untick Hands-free Telephony as in fix 2.</p>'},
        {'q': 'Will unticking Hands-free Telephony break anything?', 'a': '<p>Only the headphones&rsquo; own microphone on this PC: it stops working there. Sound to the headphones gets better, and they still work normally with your phone. Tick it again any time to undo it.</p>'},
        {'q': 'Are my headphones faulty?', 'a': '<p>Almost certainly not, if they sound fine on your phone or sound normal again once the call ends. That is phone-call mode, not a fault.</p>'},
        {'q': 'Does it happen with AirPods?', 'a': '<p>Yes. On a Windows PC, AirPods use the same two modes as any Bluetooth headphones, so they go muffled whenever a program uses their microphone.</p>'},
        {'q': 'Can I have good sound and the headset microphone at the same time?', 'a': '<p>With ordinary Bluetooth headphones, no &mdash; that is a limit of how they connect. A headset with its own USB dongle can, and so can a PC and headset that both support Bluetooth LE Audio on Windows 11 24H2.</p>'},
        {'q': 'Does this work on Windows 10?', 'a': '<p>Yes. The cause and the fixes are the same; only the Settings screens look a little different.</p>'},
        {'q': 'Can you fix it remotely?', 'a': '<p>Yes. With your permission we connect to your Windows PC, set the right sound devices and test them with you, usually the same day. Remote help is from &pound;20 and no fix, no fee. Ring 01202 775566.</p>'},
    ],
    'crossLinksHtml': '<p>Related help: <a href="/webcam-mic-test/">test your webcam and microphone</a>, <a href="/how-to-use-microsoft-teams/">using Microsoft Teams</a>, <a href="/free-pc-health-check/">the free 365 PC Manager app</a> and <a href="/remote-support/">remote support</a>.</p>',
}

# ============================================================ 2. Monitor stuck at 60Hz
HZ = {
    'slug': 'monitor-stuck-at-60hz',
    'title': '144Hz Monitor Stuck at 60Hz in Windows 11? Fix | 365 Techies',
    'metaDesc': 'Bought a 144Hz or 165Hz monitor but Windows says 60Hz? It&rsquo;s usually one setting, the cable, or the socket it&rsquo;s plugged into. The fix, in order.',
    'ogTitle': 'Monitor stuck at 60Hz? Here&rsquo;s the fix',
    'crumbName': 'Monitor Stuck at 60Hz',
    'eyebrow': '// MONITOR STUCK AT 60HZ',
    'h1': 'Monitor <em class="grad grad--cyan">stuck at 60Hz</em>?',
    'lede': 'You paid for a 144Hz, 165Hz or 240Hz monitor, but Windows says 60Hz and games don&rsquo;t feel any smoother. The monitor is almost never faulty: it&rsquo;s a setting, the cable, the socket, or the graphics driver. Here&rsquo;s the order to check them in.',
    'chips': ['Usually a five-minute fix', 'Free screen check app', 'Gaming PC tune-ups in Dorset'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['Gaming PC tune-up', '/gaming-pc-tune-up/'],
    'ctaHead': 'Still stuck at 60Hz? We&rsquo;ll sort it.', 'ctaSub': 'We connect to your Windows PC and get the screen running at its proper rate while you watch. No fix, no fee. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Is the monitor faulty?', 'Rarely. Windows has set it to 60Hz, or the cable, socket or driver can&rsquo;t carry more.'),
        ('First check', 'Settings &gt; System &gt; Display &gt; Advanced display &gt; Choose a refresh rate.'),
        ('144Hz not in the list?', 'Then it&rsquo;s the cable, the socket or the graphics driver &mdash; work down the fixes below.'),
        ('Desktop trap', 'The screen plugged into the motherboard&rsquo;s socket instead of the graphics card&rsquo;s.'),
        ('Laptop trap', 'Some laptops drop the screen to 60Hz on battery: plug the charger in and check again.'),
        ('Free check', 'The Screen check in our free 365 PC Manager app shows the rate each screen runs at and the best one Windows offers.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; START HERE', 'h2': 'Monitor stuck at 60Hz? Start here',
         'html': '<p>When you plug in a new monitor, Windows usually starts it at a safe <strong>60Hz</strong> &mdash; sixty pictures a second &mdash; even if it can do 144Hz or more. So the first thing to check is simply what Windows has chosen.</p>'
                 '<p>On Windows 11, open <strong>Settings &gt; System &gt; Display &gt; Advanced display</strong>. Pick the right screen at the top if you have more than one, then look at <strong>Choose a refresh rate</strong>. On Windows 10 it&rsquo;s <strong>Settings &gt; System &gt; Display &gt; Advanced display settings</strong>.</p>'
                 '<p>If 144Hz (or whatever your monitor promises) is in that list, choose it and you&rsquo;re done. If the list stops at 60Hz, something between the computer and the screen can&rsquo;t carry more, and the fixes below find what.</p>'},
        {'eyebrow': '/02 &mdash; WHY IT HAPPENS', 'h2': 'Why a fast monitor runs at 60Hz',
         'html': '<ul><li><strong>Windows picked 60Hz.</strong> It plays safe with a new screen and never raises the rate on its own.</li>'
                 '<li><strong>The cable or socket can&rsquo;t carry it.</strong> Older HDMI sockets and cables often can&rsquo;t send more than 60Hz at higher resolutions, and many monitors only allow their top rate over DisplayPort.</li>'
                 '<li><strong>It&rsquo;s plugged into the wrong socket.</strong> On a desktop with a graphics card, the sockets near the USB ports belong to the motherboard, not the graphics card.</li>'
                 '<li><strong>The graphics driver is missing.</strong> If Windows is using its own basic display driver, it only offers 60Hz.</li>'
                 '<li><strong>Something in between limits it.</strong> Docking stations, USB-C hubs and adapters often cap the refresh rate.</li></ul>'},
        {'eyebrow': '/03 &mdash; THE FIXES', 'h2': 'Get it running at its proper rate, in order',
         'html': '<ol>'
                 '<li><strong>Choose the refresh rate.</strong> Settings &gt; System &gt; Display &gt; Advanced display &gt; Choose a refresh rate, and pick the highest. Windows asks whether to keep it; say yes if the picture looks right.</li>'
                 '<li><strong>Use the graphics card&rsquo;s socket.</strong> On a desktop, plug the monitor into the sockets on the graphics card &mdash; usually a row lower down on the back &mdash; not the ones beside the USB ports.</li>'
                 '<li><strong>Use the right cable.</strong> Use the DisplayPort cable that came with the monitor, or an HDMI cable marked Premium High Speed or Ultra High Speed into an HDMI 2.0 or 2.1 socket. Leave out adapters and docks while you test.</li>'
                 '<li><strong>Install the proper graphics driver.</strong> Right-click Start, choose Device Manager, open Display adapters. If it says Microsoft Basic Display Adapter, install the driver from NVIDIA, AMD or Intel, or your PC maker&rsquo;s support page.</li>'
                 '<li><strong>Check the monitor&rsquo;s own menu.</strong> Some monitors need their high-refresh or DisplayPort setting switched on in their own buttons-and-menu, and a few hide their top rate behind an overclock option. The manual says which.</li>'
                 '</ol><p>After each step, go back to Choose a refresh rate and see if the higher number has appeared.</p>'},
        {'eyebrow': '/04 &mdash; LAPTOPS', 'h2': 'On a laptop: check it on the charger',
         'html': '<p>Many laptops lower the screen&rsquo;s refresh rate on battery to make it last longer, and some show a <strong>Dynamic</strong> option that changes the rate on its own. Plug the charger in, then look at Choose a refresh rate again. For a second, external screen, the same cable and socket rules apply: a USB-C or Thunderbolt socket with DisplayPort, or the laptop&rsquo;s HDMI socket if it is HDMI 2.0 or newer.</p>'},
        {'eyebrow': '/05 &mdash; BLURRY TOO?', 'h2': 'Text blurry as well? Check the size',
         'html': '<p>A screen looks its sharpest at its own size &mdash; its <strong>native resolution</strong>, the one Windows marks <strong>(Recommended)</strong> under Settings &gt; System &gt; Display &gt; Display resolution. Running a 2560&nbsp;&times;&nbsp;1440 monitor at 1920&nbsp;&times;&nbsp;1080 makes text soft and fuzzy. If you lowered it to make things bigger, set it back to the recommended size and use <strong>Scale</strong> on the same page instead: it makes everything bigger without blurring.</p>'},
        {'eyebrow': '/06 &mdash; THE QUICK WAY', 'h2': 'Let our free app check it for you',
         'html': '__APP_BOX_SCREEN__'},
        {'eyebrow': '/07 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _call_us('If it still won&rsquo;t go above 60Hz with the right cable, socket and driver, or the picture flickers or goes blank at a higher rate, we&rsquo;ll find out why.')
                 + '<p>Building or upgrading a gaming PC? Our <a href="/gaming-pc-tune-up/">gaming PC tune-up</a> sets the screen, the drivers and the power settings up properly in one go.</p>'},
    ],
    'howToName': 'How to fix a monitor stuck at 60Hz in Windows',
    'howToSteps': [
        {'name': 'Choose the refresh rate in Windows', 'text': 'Open Settings, System, Display, Advanced display, pick the screen, and choose the highest rate under Choose a refresh rate.'},
        {'name': 'Plug into the graphics card&rsquo;s socket', 'text': 'On a desktop, connect the monitor to the sockets on the graphics card, usually a row lower down on the back, not the ones beside the USB ports.'},
        {'name': 'Use a DisplayPort or high-speed HDMI cable', 'text': 'Use the DisplayPort cable that came with the monitor, or an HDMI cable marked Premium High Speed or Ultra High Speed into an HDMI 2.0 or 2.1 socket, with no adapters or docks in between.'},
        {'name': 'Install the proper graphics driver', 'text': 'In Device Manager, under Display adapters, if it says Microsoft Basic Display Adapter, install the driver from NVIDIA, AMD or Intel or your PC maker.'},
        {'name': 'Check the monitor&rsquo;s own menu', 'text': 'Switch on the monitor&rsquo;s high-refresh or DisplayPort setting in its own menu if it has one, then check Choose a refresh rate again.'},
    ],
    'faqs': [
        {'q': 'How do I know my monitor is running at 144Hz?', 'a': '<p>Windows shows it: Settings &gt; System &gt; Display &gt; Advanced display, under Choose a refresh rate. Many monitors also show the rate in their own on-screen menu. Our free 365 PC Manager app shows the rate each screen is running at too.</p>'},
        {'q': 'Can HDMI do 144Hz?', 'a': '<p>Yes, with HDMI 2.0 or 2.1 at both ends and a cable marked Premium High Speed or Ultra High Speed. Older HDMI often stops at 60Hz at higher resolutions, and some monitors only offer their top rate over DisplayPort, so DisplayPort is the safer choice.</p>'},
        {'q': 'Why did it go back to 60Hz after an update or a restart?', 'a': '<p>Usually a graphics driver update reset the setting, or Windows briefly used its basic driver. Set it again in Advanced display; if the higher rate has gone from the list, reinstall the graphics driver.</p>'},
        {'q': 'Why does my laptop screen only show 60Hz?', 'a': '<p>Many laptops lower the rate on battery to save power. Plug the charger in and check again; a Dynamic option means the laptop changes it as it goes.</p>'},
        {'q': 'Is 60Hz bad for ordinary use?', 'a': '<p>No. For email, browsing and films, 60Hz is fine. A higher rate makes the pointer, scrolling and games feel smoother, which is why it matters most for gaming.</p>'},
        {'q': 'Does a higher refresh rate use more electricity?', 'a': '<p>A little, mostly through the graphics card working harder in games. See <a href="/how-much-does-it-cost-to-run-a-pc-uk/">what a PC costs to run</a> for the bigger picture.</p>'},
        {'q': 'Can you set it up for me?', 'a': '<p>Yes. We connect to your Windows PC remotely and set the screen, driver and settings up while you watch, usually the same day. Remote help is from &pound;20 and no fix, no fee. Ring 01202 775566.</p>'},
    ],
    'crossLinksHtml': '<p>Related help: <a href="/how-to-set-up-a-second-monitor/">setting up a second monitor</a>, <a href="/gaming-pc-tune-up/">gaming PC tune-up</a>, <a href="/gaming-pc-slow-wont-load-games/">games running slow</a>, <a href="/pc-benchmark/">free PC benchmark</a>, <a href="/computer-spec-checker/">check your PC&rsquo;s specs</a> and <a href="/free-pc-health-check/">the free 365 PC Manager app</a>.</p>',
}

# ============================================================ 3. Documents stuck in the print queue
PQ = {
    'slug': 'documents-stuck-in-print-queue',
    'title': 'Document Stuck in Print Queue, Won&rsquo;t Delete? Fix | 365 Techies',
    'metaDesc': 'A document stuck in the Windows print queue holds up everything behind it. How to clear it: Cancel all, restart the Print Spooler, then empty the queue.',
    'ogTitle': 'Document stuck in the print queue? Here&rsquo;s how to clear it',
    'crumbName': 'Document Stuck in Print Queue',
    'eyebrow': '// DOCUMENT STUCK IN THE PRINT QUEUE',
    'h1': 'Document <em class="grad grad--cyan">stuck in the print queue</em>?',
    'lede': 'Nothing will print, and one document sits in the queue saying Printing, Error or Deleting forever. That one stuck document is holding up everything behind it. Here&rsquo;s how to clear it, from a one-click cancel to emptying the queue by hand.',
    'chips': ['Usually a one-minute fix', 'Free printer check app', 'Windows specialists since 1995'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['See remote support', '/remote-support/'],
    'ctaHead': 'Still stuck? We&rsquo;ll clear it.', 'ctaSub': 'We connect to your Windows PC and get it printing again while you watch, often the same day. No fix, no fee. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Why nothing prints', 'One stuck document at the front of the queue holds up everything behind it.'),
        ('First fix', 'Open the print queue and choose Cancel all, then switch the printer off and on.'),
        ('Says &lsquo;Deleting&rsquo; forever?', 'Restart the PC, or restart the Print Spooler service.'),
        ('Last resort', 'Stop the Print Spooler and empty C:\\Windows\\System32\\spool\\PRINTERS.'),
        ('Will I lose anything?', 'Only the stuck print jobs. Your documents are untouched; print them again.'),
        ('Free check', 'The Printers tool in our free 365 PC Manager app shows stuck documents and cancels just those.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; START HERE', 'h2': 'Document stuck in the print queue? Start here',
         'html': '<p>Windows prints one document at a time, in order. If the one at the front gets stuck &mdash; the printer went offline halfway through, ran out of paper, or choked on a big file &mdash; <strong>everything behind it waits</strong>, and nothing comes out at all.</p>'
                 '<p>Most of the time, cancelling the stuck document is enough. On Windows 11, open <strong>Settings &gt; Bluetooth &amp; devices &gt; Printers &amp; scanners</strong>, click your printer, then <strong>Open print queue</strong>. Click the three dots and choose <strong>Cancel all</strong>, or right-click the stuck document and choose <strong>Cancel</strong>. Then switch the printer off for ten seconds and on again.</p>'
                 '<p>If the document still sits there saying <strong>Deleting</strong>, or comes back, Windows&rsquo; printing service itself is stuck, and the fixes below clear it.</p>'},
        {'eyebrow': '/02 &mdash; WHY IT HAPPENS', 'h2': 'Why print jobs get stuck',
         'html': '<ul><li><strong>The printer dropped off mid-job</strong> &mdash; switched off, asleep, or lost the Wi-Fi.</li>'
                 '<li><strong>Paper, ink or a jam</strong> stopped it, and the job didn&rsquo;t recover when you sorted it.</li>'
                 '<li><strong>A big or unusual file</strong> &mdash; a long PDF, a photo, a web page &mdash; was more than the driver could handle.</li>'
                 '<li><strong>The Print Spooler got stuck.</strong> That is the Windows service that holds the queue. When it hangs, it can&rsquo;t let go of the job.</li></ul>'},
        {'eyebrow': '/03 &mdash; THE FIXES', 'h2': 'Clear the queue, in order',
         'html': '<ol>'
                 '<li><strong>Cancel it in the print queue.</strong> Settings &gt; Bluetooth &amp; devices &gt; Printers &amp; scanners &gt; your printer &gt; Open print queue, then Cancel all. On Windows 10 it&rsquo;s Settings &gt; Devices &gt; Printers &amp; scanners.</li>'
                 '<li><strong>Switch the printer off and on.</strong> Leave it off for ten seconds, so it drops any half-received job.</li>'
                 '<li><strong>Restart the PC.</strong> A full restart restarts Windows&rsquo; printing service and clears most stuck jobs.</li>'
                 '<li><strong>Restart the Print Spooler.</strong> Press Windows key + R, type <strong>services.msc</strong> and press Enter. Find <strong>Print Spooler</strong>, right-click it and choose <strong>Restart</strong>.</li>'
                 '<li><strong>Empty the queue by hand.</strong> In the same Services window, right-click Print Spooler and choose <strong>Stop</strong>. Open <strong>C:\\Windows\\System32\\spool\\PRINTERS</strong> (Windows asks for permission; say Continue), delete everything inside it &mdash; not the folder itself &mdash; then go back and <strong>Start</strong> Print Spooler.</li>'
                 '</ol><p>Then print a test page. The files you deleted were only the stuck print jobs, never your documents.</p>'},
        {'eyebrow': '/04 &mdash; THE COMMAND WAY', 'h2': 'Prefer to type it? Three commands',
         'html': '<p>Step 5 can be done in one go. Click Start, type <strong>cmd</strong>, right-click Command Prompt and choose <strong>Run as administrator</strong>, then type these three lines, pressing Enter after each:</p>'
                 '<pre style="white-space:pre-wrap;overflow-x:auto;padding:.9rem 1rem;border-radius:10px;background:rgba(0,0,0,.35);border:1px solid rgba(125,170,220,.22)"><code>net stop spooler\ndel /Q /F /S "%systemroot%\\System32\\spool\\PRINTERS\\*"\nnet start spooler</code></pre>'
                 '<p>The first stops the printing service, the second deletes the stuck jobs, and the third starts it again.</p>'},
        {'eyebrow': '/05 &mdash; STILL NOT PRINTING?', 'h2': 'Queue clear but still not printing?',
         'html': '<p>If the queue is empty and new documents get stuck again, the printer itself is usually offline or its driver needs reinstalling. Our guides cover the common causes: <a href="/printer-disappeared-after-windows-update/">printer disappeared after a Windows update</a>, <a href="/why-does-my-printer-keep-disconnecting/">printer keeps disconnecting</a>, and <a href="/printer-support/">every printer problem, by symptom</a>.</p>'},
        {'eyebrow': '/06 &mdash; THE QUICK WAY', 'h2': 'Let our free app check it for you',
         'html': '__APP_BOX_PRINTER__'},
        {'eyebrow': '/07 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _call_us('If documents keep getting stuck, or the Print Spooler keeps stopping on its own, it&rsquo;s usually a printer driver that needs replacing properly.')},
    ],
    'howToName': 'How to clear a document stuck in the Windows print queue',
    'howToSteps': [
        {'name': 'Cancel it in the print queue', 'text': 'Open Settings, Bluetooth &amp; devices, Printers &amp; scanners, choose your printer, then Open print queue, and choose Cancel all.'},
        {'name': 'Switch the printer off and on', 'text': 'Leave the printer off for ten seconds so it drops any half-received job, then switch it on again.'},
        {'name': 'Restart the PC', 'text': 'A full restart restarts Windows&rsquo; printing service and clears most stuck jobs.'},
        {'name': 'Restart the Print Spooler', 'text': 'Press Windows key + R, type services.msc, find Print Spooler, right-click it and choose Restart.'},
        {'name': 'Empty the queue by hand', 'text': 'Stop Print Spooler, delete everything inside C:\\Windows\\System32\\spool\\PRINTERS (not the folder), then start Print Spooler again and print a test page.'},
    ],
    'faqs': [
        {'q': 'Why does it say Deleting but never goes?', 'a': '<p>Windows&rsquo; printing service, the Print Spooler, has got stuck holding the job. Restarting the PC or the Print Spooler usually lets it go; emptying the spool folder always does.</p>'},
        {'q': 'Will clearing the print queue delete my document?', 'a': '<p>No. The queue only holds a copy made for the printer. Your document is wherever you saved it; just print it again.</p>'},
        {'q': 'Is it safe to delete the files in spool\\PRINTERS?', 'a': '<p>Yes, with the Print Spooler stopped first. They are only waiting print jobs. Don&rsquo;t delete the PRINTERS folder itself or anything else in System32.</p>'},
        {'q': 'Why does it keep happening?', 'a': '<p>Usually a printer that drops off the Wi-Fi mid-job, or a driver that struggles with some files. Giving the printer a fixed connection and reinstalling its driver from the maker&rsquo;s website normally stops it.</p>'},
        {'q': 'What if the Print Spooler keeps stopping?', 'a': '<p>That points to a faulty printer driver. Removing the printer, deleting its driver and installing the maker&rsquo;s current one fixes most cases. We can do that remotely.</p>'},
        {'q': 'Does this work on Windows 10?', 'a': '<p>Yes. The Print Spooler and the spool folder are the same; on Windows 10 the printers are under Settings &gt; Devices &gt; Printers &amp; scanners.</p>'},
        {'q': 'Can you clear it remotely?', 'a': '<p>Yes. With your permission we connect to your Windows PC and get it printing while you watch, often the same day. Remote help is from &pound;20 and no fix, no fee. Ring 01202 775566.</p>'},
    ],
    'crossLinksHtml': '<p>Related help: <a href="/printer-support/">printer support</a>, <a href="/printer-disappeared-after-windows-update/">printer disappeared after a Windows update</a>, <a href="/why-does-my-printer-keep-disconnecting/">printer keeps disconnecting</a>, <a href="/how-to-set-up-a-printer/">how to set up a printer</a>, <a href="/free-pc-health-check/">the free 365 PC Manager app</a> and <a href="/remote-support/">remote support</a>.</p>',
}


# ============================================================ 4. What a PC costs to run (UK calculator)
def _p(watts, hours, days=1):
    """Cost in pence of `watts` for `hours` a day over `days`, at PRICE_P."""
    return watts / 1000.0 * hours * days * PRICE_P

def _money(pence):
    return ('&pound;%.2f' % (pence / 100)) if pence >= 100 else ('%.1fp' % pence)

def _year(pence_day):
    return '&pound;%d' % round(pence_day * 365 / 100)

# the worked examples: (what, watts while on, hours a day) - typical figures, said so on the page
_EX = [
    ('A laptop for email and browsing', 30, 6),
    ('An office desktop and its screen', 80, 8),
    ('A gaming PC and screen, 3 hours of games', 380, 3),
    ('A desktop left on day and night, mostly idle', 80, 24),
]
_EX_ROWS = "".join(
    f'<tr><th scope="row">{w}</th><td>{n}&nbsp;W, {h} hours a day</td><td>{_money(_p(n, 1))}</td><td>{_money(_p(n, h))}</td><td>{_year(_p(n, h))}</td></tr>'
    for w, n, h in _EX)

_CALC = ('<div class="pcc" id="pcc">'
         '<div class="pcc__in">'
         '<label class="pcc__f"><span>What kind of computer?</span><select id="pcc-kind">'
         '<option value="30">Laptop, email and browsing (about 30 W)</option>'
         '<option value="60">Laptop working hard (about 60 W)</option>'
         '<option value="80" selected>Office desktop and screen (about 80 W)</option>'
         '<option value="120">Gaming PC, browsing (about 120 W)</option>'
         '<option value="380">Gaming PC and screen, gaming (about 380 W)</option>'
         '<option value="550">High-end gaming PC, gaming (about 550 W)</option>'
         '<option value="custom">I know the watts</option></select></label>'
         '<label class="pcc__f"><span>Watts</span><input id="pcc-w" type="number" min="1" max="3000" step="1" value="80" inputmode="numeric"></label>'
         '<label class="pcc__f"><span>Hours a day</span><input id="pcc-h" type="number" min="0.5" max="24" step="0.5" value="8" inputmode="decimal"></label>'
         f'<label class="pcc__f"><span>Price a unit (p per kWh)</span><input id="pcc-p" type="number" min="1" max="100" step="0.01" value="{PRICE_P}" inputmode="decimal"></label>'
         '</div>'
         '<div class="pcc__out" aria-live="polite">'
         '<div><b id="pcc-hr">&ndash;</b><span>an hour</span></div><div><b id="pcc-day">&ndash;</b><span>a day</span></div>'
         '<div><b id="pcc-mo">&ndash;</b><span>a month</span></div><div><b id="pcc-yr">&ndash;</b><span>a year</span></div></div>'
         f'<p class="pcc__note">At your price a unit, from the watts and hours above. Standing charge not included: you pay that whether the PC is on or not. '
         f'The price filled in is the price cap for {PRICE_FROM} ({PRICE_SRC}, Direct Debit, average across Great Britain); your bill shows your own. Nothing you type leaves this page.</p>'
         '</div>'
         '<style>.pcc{margin:1rem 0 0;padding:1.2rem 1.25rem;border-radius:18px;border:1px solid rgba(29,151,227,.42);background:linear-gradient(135deg,rgba(29,151,227,.10),rgba(255,255,255,.02))}'
         '.pcc__in{display:grid;grid-template-columns:2fr 1fr 1fr 1.2fr;gap:.8rem}.pcc__f{display:flex;flex-direction:column;gap:.35rem;font-size:.86rem;color:var(--muted)}'
         '.pcc__f select,.pcc__f input{min-height:46px;padding:.55rem .7rem;border-radius:10px;border:1px solid rgba(125,170,220,.35);background:rgba(0,0,0,.3);color:var(--ink,#eaf4ff);font:inherit;font-size:1rem}'
         '.pcc__out{margin:1.1rem 0 0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.7rem}'
         '.pcc__out div{padding:.9rem .8rem;border-radius:14px;border:1px solid rgba(125,170,220,.22);background:rgba(255,255,255,.03);text-align:center}'
         '.pcc__out b{display:block;font-size:1.6rem;line-height:1.15;font-variant-numeric:tabular-nums;color:var(--ink,#eaf4ff)}'
         '.pcc__out span{display:block;margin-top:.2rem;font-size:.8rem;color:var(--muted)}'
         '.pcc__note{margin:.9rem 0 0;font-size:.8rem;line-height:1.5;color:var(--muted)}.pcc__note a{color:var(--cyan-soft)}'
         '@media (max-width:760px){.pcc__in{grid-template-columns:1fr 1fr}.pcc__in .pcc__f:first-child{grid-column:1/-1}.pcc__out{grid-template-columns:1fr 1fr}}</style>'
         '<script>(function(){var k=document.getElementById("pcc-kind"),w=document.getElementById("pcc-w"),h=document.getElementById("pcc-h"),p=document.getElementById("pcc-p");if(!k)return;'
         'function m(pence){if(!isFinite(pence)||pence<0)return "\\u2013";if(pence<100)return pence.toFixed(1)+"p";var l=pence/100;return "\\u00a3"+(l<10?l.toFixed(2):Math.round(l).toLocaleString("en-GB"));}'   # as the table: 0.1p, pennies under GBP 10, whole pounds above
         'function go(){var W=+w.value,H=Math.min(24,+h.value),P=+p.value,hr=W/1000*P,day=hr*H;'
         'document.getElementById("pcc-hr").textContent=m(hr);document.getElementById("pcc-day").textContent=m(day);'
         'document.getElementById("pcc-mo").textContent=m(day*365/12);document.getElementById("pcc-yr").textContent=m(day*365);}'
         'k.addEventListener("change",function(){if(k.value!=="custom")w.value=k.value;go();});'
         '[w,h,p].forEach(function(x){x.addEventListener("input",function(){if(x===w)k.value="custom";go();});});go();})();</script>')

PC = {
    'slug': 'how-much-does-it-cost-to-run-a-pc-uk',
    'title': 'How Much Does It Cost to Run a PC? UK Calculator | 365 Techies',
    'metaDesc': f'What your PC or gaming PC costs to run at today&rsquo;s UK price cap ({PRICE_P}p a unit): an hour, a day, a year. Free calculator, plus the easy ways to cut it.',
    'ogTitle': 'How much does your PC cost to run? UK calculator',
    'crumbName': 'What a PC Costs to Run',
    'eyebrow': '// WHAT A PC COSTS TO RUN, UK PRICES',
    'h1': 'How much does your PC <em class="grad grad--cyan">cost to run</em>?',
    'lede': f'Pick your kind of computer, how long it&rsquo;s on and your price a unit, and the calculator works out the cost an hour, a day, a month and a year at UK prices. Filled in with today&rsquo;s price cap of {PRICE_P}p a unit.',
    'chips': ['Free calculator', 'UK price cap, October 2026', 'Nothing you type is sent anywhere'],
    'primaryCta': ['Download the free app', '__PCM_SETUP__'], 'secondaryCta': ['Gaming PC tune-up', '/gaming-pc-tune-up/'],
    'ctaHead': 'Want to know exactly what yours uses?', 'ctaSub': 'Our free 365 PC Manager app records the power your PC uses, hour by hour, and what it costs at your own price a unit.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Price a unit used', f'{PRICE_P}p a kWh, Ofgem&rsquo;s price cap for {PRICE_FROM} (Direct Debit, GB average).'),
        ('A laptop, 6 hours a day', f'About {_year(_p(30, 6))} a year at 30 watts.'),
        ('An office desktop and screen, 8 hours a day', f'About {_year(_p(80, 8))} a year at 80 watts.'),
        ('A gaming PC, 3 hours of games a day', f'About {_year(_p(380, 3))} a year at 380 watts.'),
        ('Left on day and night', f'An 80-watt desktop idling around the clock: about {_year(_p(80, 24))} a year.'),
        ('Biggest saving', 'Let it sleep, and switch it off overnight. A sleeping PC uses a watt or two.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; THE CALCULATOR', 'h2': 'Work out what your PC costs to run',
         'html': '<p>Choose the kind of computer, or type its watts if you know them, then how many hours a day it&rsquo;s on. The figures are typical; yours will differ with what you do on it, and the app below measures the real thing.</p>' + _CALC},
        {'eyebrow': '/02 &mdash; WORKED EXAMPLES', 'h2': f'What typical PCs cost at {PRICE_P}p a unit',
         'html': '<div class="price-table-wrap" tabindex="0" role="group" aria-label="Running costs (scrolls sideways on a small screen)"><table class="price-table price-table--facts"><thead><tr><th scope="col">Computer</th><th scope="col">Power and use</th><th scope="col">An hour</th><th scope="col">A day</th><th scope="col">A year</th></tr></thead><tbody>'
                 + _EX_ROWS + '</tbody></table></div>'
                 f'<p style="font-size:.85rem;color:var(--muted)">Typical figures, at {PRICE_P}p a unit, without the standing charge. Price from {PRICE_SRC}, {PRICE_FROM}.</p>'},
        {'eyebrow': '/03 &mdash; WHAT USES IT', 'h2': 'Where the power goes',
         'html': '<ul><li><strong>The graphics card, when you game.</strong> In a gaming PC it uses more than everything else put together while a game runs, and very little when you&rsquo;re just browsing.</li>'
                 '<li><strong>The processor.</strong> Busy when you&rsquo;re working it, idling the rest of the time.</li>'
                 '<li><strong>The screen.</strong> Usually 15 to 40 watts for a desktop monitor, more for a big or very bright one.</li>'
                 '<li><strong>Being left on.</strong> An idle desktop still draws tens of watts, all day and all night. Asleep, it&rsquo;s a watt or two.</li></ul>'
                 '<p>The size of the power supply doesn&rsquo;t set the bill: a 750-watt supply only gives the parts what they ask for.</p>'},
        {'eyebrow': '/04 &mdash; CUT THE COST', 'h2': 'Easy ways to cut it',
         'html': '<ol><li><strong>Let it sleep.</strong> Settings &gt; System &gt; Power: put the screen and the PC to sleep after 10 to 15 minutes.</li>'
                 '<li><strong>Switch it off overnight.</strong> Modern PCs don&rsquo;t mind being switched off, and they start in seconds.</li>'
                 '<li><strong>Use a power-saving mode for everyday work.</strong> Email, browsing and films don&rsquo;t need full speed.</li>'
                 '<li><strong>Cap the frame rate in games.</strong> A game running at hundreds of frames a second on a 144Hz screen burns power for nothing.</li>'
                 '<li><strong>Turn the screen&rsquo;s brightness down a little.</strong> It&rsquo;s easier on the eyes too.</li></ol>'},
        {'eyebrow': '/05 &mdash; MEASURE YOURS', 'h2': 'Measure what yours really uses',
         'html': '<p>A plug-in energy meter between the wall and the PC&rsquo;s plug gives the whole figure, screen included. Or let the app below measure as you go:</p>__APP_BOX_POWER__'},
    ],
    'howToName': 'How to work out what a PC costs to run',
    'howToSteps': [
        {'name': 'Find the watts', 'text': 'Use a plug-in energy meter, the 365 PC Manager app, or a typical figure: about 30 watts for a laptop, 80 for an office desktop and screen, 380 for a gaming PC and screen while gaming.'},
        {'name': 'Multiply by the hours', 'text': 'Watts times hours a day, divided by 1,000, gives the units (kWh) it uses a day.'},
        {'name': 'Multiply by your price a unit', 'text': f'Units times your price a unit gives the cost a day. The October to December 2026 price cap is {PRICE_P}p a unit.'},
        {'name': 'Multiply by 365', 'text': 'Cost a day times 365 gives the cost a year. Leave the standing charge out: you pay it either way.'},
    ],
    'faqs': [
        {'q': 'How much does a gaming PC cost to run an hour?', 'a': f'<p>A gaming PC and screen drawing about 380 watts while gaming costs about {_money(_p(380, 1))} an hour at {PRICE_P}p a unit. A high-end one drawing 550 watts, about {_money(_p(550, 1))} an hour.</p>'},
        {'q': 'Is it cheaper to leave a PC on or switch it off?', 'a': f'<p>Switch it off, or let it sleep. An 80-watt desktop left on day and night costs about {_year(_p(80, 24))} a year; asleep it uses a watt or two. Starting up again uses very little.</p>'},
        {'q': 'Does a PC use electricity when it is switched off?', 'a': '<p>A very small amount while it&rsquo;s plugged in, usually well under a watt or two. Switching off at the wall stops even that.</p>'},
        {'q': 'Is the standing charge included?', 'a': '<p>No. You pay the standing charge whether the PC is on or not, so it isn&rsquo;t part of what the PC costs to run.</p>'},
        {'q': 'Does a bigger power supply mean a bigger bill?', 'a': '<p>No. A power supply only provides what the parts ask for, so a 1,000-watt supply in a PC drawing 200 watts uses about 200 watts.</p>'},
        {'q': 'What price a unit should I use?', 'a': f'<p>The unit rate on your electricity bill. If you&rsquo;re on the standard variable tariff, it&rsquo;s close to the price cap: {PRICE_P}p a unit for {PRICE_FROM}, on average, paying by Direct Debit.</p>'},
        {'q': 'Why does 365 PC Manager show a lower figure on my desktop?', 'a': '<p>On a desktop the app measures the processor and an NVIDIA graphics card, which Windows and the card report, but not the screen, disks or the rest of the PC. A plug-in meter at the wall gives the whole figure. On a laptop running on battery, the app reads the whole laptop.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/pc-benchmark/">free PC benchmark</a>, <a href="/computer-spec-checker/">check your PC&rsquo;s specs</a>, <a href="/gaming-pc-tune-up/">gaming PC tune-up</a>, <a href="/monitor-stuck-at-60hz/">monitor stuck at 60Hz</a>, <a href="/will-a-power-cut-damage-my-computer/">will a power cut damage my computer?</a> and <a href="/free-pc-health-check/">the free 365 PC Manager app</a>.</p>',
}

# ============================================================ 5. The radio on a computer (v36's Radio)
RD = {
    'slug': 'how-to-listen-to-the-radio-on-your-computer',
    'title': 'Listen to the Radio on Your Computer (UK) | 365 Techies',
    'metaDesc': 'Listen to BBC, Heart and your local radio free on a Windows PC or laptop: BBC Sounds, Global Player, Radioplayer or our free app. Plus fixes for no sound.',
    'ogTitle': 'How to listen to the radio on your computer',
    'crumbName': 'Listen to the Radio on Your Computer',
    'eyebrow': '// THE RADIO ON YOUR COMPUTER',
    'h1': 'How to listen to the <em class="grad grad--cyan">radio</em> on your computer',
    'lede': 'Every UK station plays free on a Windows PC or laptop, with no aerial and no licence. BBC stations play on BBC Sounds, Heart, Capital, Classic FM and the other Global stations on Global Player, and most of the rest, local stations included, on Radioplayer or the station&rsquo;s own website. Here&rsquo;s the easy way to each, and what to do if there&rsquo;s no sound.',
    'chips': ['Free, no aerial needed', 'Free radio app for Windows', 'Windows specialists since 1995'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['See remote support', '/remote-support/'],
    'ctaHead': 'Want it set up for you?', 'ctaSub': 'We connect to your Windows PC and set up your favourite stations, one click each, while you watch. Usually the same day. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Does it cost anything?', 'No. Listening is free, and you don&rsquo;t need a TV licence for radio. It only uses some of your broadband.'),
        ('BBC stations', 'BBC Sounds, at bbc.co.uk/sounds, with a free BBC account (the same one as BBC iPlayer).'),
        ('Heart, Capital, Classic FM, Smooth, LBC', 'Global Player, at globalplayer.com. Global keeps its stations to its own player.'),
        ('Most other UK stations', 'Radioplayer, at radioplayer.co.uk, or the station&rsquo;s own website. Local and community stations nearly all have a Listen live button.'),
        ('No sound?', 'Check the volume, where the sound is going (speakers, headphones or a TV), and that the browser tab isn&rsquo;t muted.'),
        ('Easiest of all', 'Our free 365 PC Manager app lists the stations near you and plays them in one click.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; START HERE', 'h2': 'The quickest way: in your web browser',
         'html': '<p>You don&rsquo;t need to install anything to listen to the radio on a computer. Open your web browser &mdash; Edge, Chrome or Firefox &mdash; and go to the station&rsquo;s own player:</p>'
                 '<ul><li><strong>BBC stations</strong> (Radio 2, Radio 4, 5 Live, your local BBC station such as Radio Solent): go to <strong>bbc.co.uk/sounds</strong>, choose <strong>Stations</strong>, pick one and press play. You&rsquo;ll be asked to sign in with a free <strong>BBC account</strong> &mdash; if you use BBC iPlayer, it&rsquo;s the same one.</li>'
                 '<li><strong>Heart, Capital, Classic FM, Smooth, LBC, Gold and Radio X</strong>: these belong to Global, which plays them on its own <strong>Global Player</strong> at <strong>globalplayer.com</strong>.</li>'
                 '<li><strong>Most other UK stations</strong>: <strong>Radioplayer</strong> at <strong>radioplayer.co.uk</strong>, set up by the BBC and commercial radio together, puts hundreds of stations in one place. Or search for the station&rsquo;s name: almost every station&rsquo;s website has a <strong>Listen live</strong> button.</li></ul>'
                 '<p>Found one you like? Press <strong>Ctrl + D</strong> to bookmark it, so next time it&rsquo;s one click.</p>'},
        {'eyebrow': '/02 &mdash; LOCAL RADIO', 'h2': 'Local radio around Bournemouth, Poole and Dorset',
         'html': '<p>Local stations are the ones people miss most when they move to listening on a computer. Around here they include <strong>BBC Radio Solent</strong> (on BBC Sounds), <strong>Heart Dorset</strong> (on Global Player), <strong>Greatest Hits Radio Dorset</strong>, <strong>Hot Radio</strong>, <strong>Nation Radio South Coast</strong>, <strong>Wave 105</strong>, and community stations such as <strong>Forest FM</strong> and <strong>Radio Wimborne</strong>, which play on their own websites.</p>'
                 '<p>Search for the station&rsquo;s name and &ldquo;listen live&rdquo;, and check you&rsquo;ve landed on the station&rsquo;s own website before you press play.</p>'},
        {'eyebrow': '/03 &mdash; THE EASY WAY', 'h2': 'Or let our free app find them for you',
         'html': '__APP_BOX_RADIO__'},
        {'eyebrow': '/04 &mdash; NO SOUND?', 'h2': 'No sound, or it keeps stopping?',
         'html': '<ul><li><strong>Check where the sound is going.</strong> Click the speaker icon by the clock: make sure it isn&rsquo;t muted, then use the arrow next to the volume slider to pick your speakers or headphones &mdash; not a TV that&rsquo;s switched off or headphones in a drawer.</li>'
                 '<li><strong>Check the browser tab isn&rsquo;t muted.</strong> A small crossed-out speaker on the tab means it is: right-click the tab and choose <strong>Unmute site</strong> (or Unmute tab).</li>'
                 '<li><strong>Press play yourself.</strong> Browsers don&rsquo;t let a page start sound on its own, so a radio player can sit there silently until you press its play button.</li>'
                 '<li><strong>Stops and starts?</strong> That&rsquo;s the internet connection struggling. Move nearer the router, close other tabs (videos especially), or plug the computer into the router with a cable. Our <a href="/wifi-signal-test/">Wi-Fi signal test</a> shows how good your signal is.</li>'
                 '<li><strong>&ldquo;Not available in your area&rdquo;?</strong> Many stations can only be played in the UK, because their music licences only cover UK listeners.</li></ul>'
                 '<p>No sound from anything at all, not just the radio? See our <a href="/bluetooth-headphones-sound-muffled-on-pc/">muffled headphones fix</a>, or ring us.</p>'},
        {'eyebrow': '/05 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _call_us('If the radio won&rsquo;t play, there&rsquo;s no sound from the computer at all, or you&rsquo;d just like your favourite stations set up as one-click buttons, we&rsquo;re happy to help.')},
    ],
    'howToName': 'How to listen to the radio on a Windows computer',
    'howToSteps': [
        {'name': 'Open your web browser', 'text': 'Open Edge, Chrome or Firefox. You don&rsquo;t need to install anything.'},
        {'name': 'Go to the right player for the station', 'text': 'BBC stations: bbc.co.uk/sounds, signed in with a free BBC account. Heart, Capital, Classic FM, Smooth and LBC: globalplayer.com. Most others: radioplayer.co.uk or the station&rsquo;s own website.'},
        {'name': 'Press play', 'text': 'Choose the station and press its play button. Browsers wait for you to press play before they make any sound.'},
        {'name': 'Bookmark it', 'text': 'Press Ctrl + D to bookmark the page, so next time the station is one click away.'},
        {'name': 'No sound? Check the output', 'text': 'Click the speaker icon by the clock, make sure it isn&rsquo;t muted, and pick your speakers or headphones. Right-click the browser tab and choose Unmute site if it is muted.'},
    ],
    'faqs': [
        {'q': 'Is listening to the radio on a computer free?', 'a': '<p>Yes. The stations are free to listen to and you don&rsquo;t need a TV licence for radio. It uses some of your broadband: roughly 30 to 150 MB an hour, depending on the station&rsquo;s sound quality, which home broadband handles easily.</p>'},
        {'q': 'Why do I have to sign in to BBC Sounds?', 'a': '<p>The BBC asks everyone to sign in with a free BBC account to listen on BBC Sounds. If you watch BBC iPlayer, you already have one: use the same email and password.</p>'},
        {'q': 'Why can&rsquo;t I find Heart or Classic FM on other radio apps?', 'a': '<p>Global, which owns Heart, Capital, Classic FM, Smooth, LBC, Gold and Radio X, plays them on its own Global Player (globalplayer.com) rather than other apps. The BBC does the same with BBC Sounds.</p>'},
        {'q': 'Can I listen to my local station?', 'a': '<p>Almost always. Local BBC stations are on BBC Sounds, and nearly every local and community station has a Listen live button on its own website. Around Bournemouth that includes Radio Solent, Heart Dorset, Greatest Hits Radio Dorset, Hot Radio, Forest FM and Radio Wimborne.</p>'},
        {'q': 'Can I wake up to the radio on my computer?', 'a': '<p>Yes, with our free 365 PC Manager app: its wake-up alarm starts the radio or your music almost silent and lets it rise gently. BBC and Global stations play only in their own apps, so they can&rsquo;t be used as alarms; other stations can.</p>'},
        {'q': 'Can I listen to UK radio when I&rsquo;m abroad?', 'a': '<p>Some stations, not all. Many can only be played in the UK, because their music licences only cover UK listeners.</p>'},
        {'q': 'Is a radio app safe to install?', 'a': '<p>Stick to the broadcasters&rsquo; own players and apps you trust. Our free 365 PC Manager is digitally signed by 365 Techies Ltd, a family IT firm in Bournemouth since 1995, and has no adverts.</p>'},
        {'q': 'Can you set it up for me?', 'a': '<p>Yes. With your permission we connect to your Windows PC and set up your favourite stations as one-click buttons while you watch, usually the same day. Remote help is from &pound;20 and no fix, no fee. Ring 01202 775566.</p>'},
    ],
    'crossLinksHtml': '<p>Related help: <a href="/how-to-set-an-alarm-on-your-computer/">waking up to the radio on your computer</a>, <a href="/make-your-house-look-lived-in-while-away/">a radio on a timer while you&rsquo;re away</a>, <a href="/how-to-play-a-cd-on-windows-11/">playing CDs on Windows 11</a>, <a href="/bluetooth-headphones-sound-muffled-on-pc/">muffled headphones</a>, <a href="/wifi-signal-test/">Wi-Fi signal test</a>, <a href="/free-pc-health-check/">the free 365 PC Manager app</a> and <a href="/remote-support/">remote support</a>.</p>',
}

# ============================================================ 6. CDs on Windows 11 (v36's CDs)
CD = {
    'slug': 'how-to-play-a-cd-on-windows-11',
    'title': 'How to Play a CD on Windows 11 (and Copy It) | 365 Techies',
    'metaDesc': 'CD won&rsquo;t play on Windows 11, or your laptop has no CD drive? How to play and copy CDs on Windows 11, step by step, with free tools and a cheap USB drive.',
    'ogTitle': 'How to play a CD on Windows 11',
    'crumbName': 'Play a CD on Windows 11',
    'eyebrow': '// CDs ON WINDOWS 11',
    'h1': 'How to play a <em class="grad grad--cyan">CD</em> on Windows 11',
    'lede': 'Put the CD in and Windows 11&rsquo;s Media Player should start it. If nothing happens, open Media Player and choose the CD, or open it from File Explorer. And if your laptop has no CD drive &mdash; most new ones don&rsquo;t &mdash; a plug-in USB CD drive, usually under &pound;25, works straight away. Here&rsquo;s each step, and how to copy your CDs onto the computer.',
    'chips': ['Works with any USB CD drive', 'Free CD player and copier', 'Windows specialists since 1995'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['See remote support', '/remote-support/'],
    'ctaHead': 'CDs still won&rsquo;t play? We&rsquo;ll sort it.', 'ctaSub': 'We connect to your Windows PC, get the CD drive working and set up your music, while you watch. Usually the same day. No fix, no fee. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('To play a CD', 'Put it in. If nothing starts, open Media Player from the Start menu and choose the CD, or open the CD drive in File Explorer.'),
        ('No CD drive?', 'Most new laptops have none. A USB CD or DVD drive, usually under &pound;25, plugs in and works with no setup.'),
        ('The old Windows Media Player', 'Still there on Windows 11 as Windows Media Player Legacy, and can be added from Optional features if it&rsquo;s missing.'),
        ('Copying CDs', 'Media Player copies to AAC, FLAC, WMA or ALAC, but not MP3. The old Windows Media Player and our free app copy to MP3.'),
        ('Not recognised?', 'Check the drive appears under This PC, plug a USB drive straight into the computer, and try a different CD.'),
        ('Free check', 'Our free 365 PC Manager app plays CDs, copies them to MP3 with the song names, and tells you if there&rsquo;s no drive.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; START HERE', 'h2': 'Playing a CD on Windows 11, step by step',
         'html': '<ol><li><strong>Put the CD in</strong>, label side up. Give it ten seconds or so to spin up. Windows may ask what to do with audio CDs: choose <strong>Play audio CD</strong>.</li>'
                 '<li><strong>Nothing happened?</strong> Click Start, type <strong>Media Player</strong> and open it. The CD appears in its list on the left: choose it and press <strong>Play</strong>.</li>'
                 '<li><strong>Or use File Explorer.</strong> Open File Explorer (the folder on the taskbar), click <strong>This PC</strong> and double-click the CD drive. Double-click <strong>Track01</strong> to start playing.</li></ol>'
                 '<p>Prefer the old Windows Media Player you know? It&rsquo;s still in Windows 11 as <strong>Windows Media Player Legacy</strong> &mdash; type that name in the Start menu. If it isn&rsquo;t there, open <strong>Settings &gt; System &gt; Optional features</strong> (on some versions, <strong>Settings &gt; Apps &gt; Optional features</strong>), choose <strong>View features</strong>, search for <strong>Windows Media Player Legacy</strong>, tick it and choose <strong>Next</strong>, then <strong>Add</strong>.</p>'},
        {'eyebrow': '/02 &mdash; NO CD DRIVE?', 'h2': 'No CD drive on your laptop? A USB one works',
         'html': '<p>Most laptops made in the last few years have no CD drive, and many desktops don&rsquo;t either. You don&rsquo;t need a new computer: a <strong>USB CD or DVD drive</strong> &mdash; a slim box with a USB lead, usually under &pound;25 &mdash; plugs into any USB socket and Windows uses it straight away, with nothing to install.</p>'
                 '<ul><li>Plug it <strong>straight into the computer</strong>, not into a USB hub or the keyboard: CD drives need more power than a hub gives.</li>'
                 '<li>Some come with a <strong>Y-shaped lead with two USB plugs</strong>: if the drive won&rsquo;t spin, plug in both.</li>'
                 '<li>Newer laptops may only have the small, oval <strong>USB-C</strong> sockets: buy a drive with a USB-C lead, or use a small adapter.</li></ul>'},
        {'eyebrow': '/03 &mdash; NOT RECOGNISED?', 'h2': 'CD won&rsquo;t play or isn&rsquo;t recognised?',
         'html': '<ul><li><strong>Is the drive there?</strong> In File Explorer, click This PC. You should see a <strong>DVD RW Drive</strong> or similar. If it&rsquo;s missing, unplug a USB drive and plug it into a different socket; for a built-in drive, restart the computer.</li>'
                 '<li><strong>Try another CD.</strong> A scratched or dirty disc can fail. Wipe it gently from the centre outwards with a soft cloth.</li>'
                 '<li><strong>Some CDs from the early 2000s</strong> were copy-protected and refuse to play on computers. If one CD fails and others play, that may be why.</li>'
                 '<li><strong>Choose what happens when you put a CD in.</strong> Open <strong>Settings &gt; Bluetooth &amp; devices &gt; AutoPlay</strong> and set <strong>Audio CD</strong> to play it.</li>'
                 '<li><strong>Plays but no sound?</strong> Click the speaker icon by the clock and check the volume and where the sound is going &mdash; see our <a href="/how-to-listen-to-the-radio-on-your-computer/">radio guide&rsquo;s no-sound checks</a>.</li></ul>'},
        {'eyebrow': '/04 &mdash; COPY YOUR CDS', 'h2': 'Copy your CDs onto the computer',
         'html': '<p>Copying (or &ldquo;ripping&rdquo;) your CDs means you can play them without the disc, on the computer or a phone. Three free ways:</p>'
                 '<ul><li><strong>Media Player</strong> (Windows 11&rsquo;s own): choose the CD and press <strong>Rip CD</strong>. It saves to AAC, FLAC, WMA or ALAC &mdash; but not MP3. Choose the format in its Settings first.</li>'
                 '<li><strong>Windows Media Player Legacy</strong>: open <strong>Rip settings &gt; Format &gt; MP3</strong>, then <strong>Rip CD</strong>. MP3 plays on almost anything.</li>'
                 '<li><strong>Our free 365 PC Manager app</strong>: copies to MP3 and looks up the album, artist and song names for you.</li></ul>'
                 '<p>Either way, the songs land in your <strong>Music</strong> folder. Copy that folder to a USB stick or OneDrive too, so the music is safe if the computer ever fails.</p>'},
        {'eyebrow': '/05 &mdash; THE QUICK WAY', 'h2': 'Our free app plays and copies CDs',
         'html': '__APP_BOX_CDS__'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _call_us('If the CD drive isn&rsquo;t recognised, or you&rsquo;d like your whole CD shelf copied onto the computer and kept safe, we can help.')},
    ],
    'howToName': 'How to play a CD on Windows 11',
    'howToSteps': [
        {'name': 'Put the CD in', 'text': 'Put the CD in the drive, label side up, and give it about ten seconds. If Windows asks what to do with audio CDs, choose Play audio CD.'},
        {'name': 'Open Media Player if nothing happens', 'text': 'Click Start, type Media Player and open it. Choose the CD in its list on the left and press Play.'},
        {'name': 'Or open the CD in File Explorer', 'text': 'Open File Explorer, click This PC, double-click the CD drive and double-click Track01.'},
        {'name': 'No CD drive? Plug in a USB one', 'text': 'Plug a USB CD or DVD drive straight into the computer, not a hub. If it has two USB plugs, use both. Windows uses it with nothing to install.'},
        {'name': 'Still not recognised?', 'text': 'Check the drive appears under This PC, try another USB socket and another CD, and in Settings, Bluetooth and devices, AutoPlay, set Audio CD to play.'},
    ],
    'faqs': [
        {'q': 'Does Windows 11 still play CDs?', 'a': '<p>Yes. Windows 11&rsquo;s Media Player plays audio CDs, and the old Windows Media Player is still available as Windows Media Player Legacy. What many new computers lack is the CD drive itself.</p>'},
        {'q': 'My laptop has no CD drive. What do I need?', 'a': '<p>A USB CD or DVD drive, usually under &pound;25. It plugs into a USB socket and works straight away. Check whether your laptop has the usual rectangular USB sockets or only the small oval USB-C ones, and buy a drive to match.</p>'},
        {'q': 'Where has Windows Media Player gone?', 'a': '<p>Windows 11 has a newer app called Media Player. The old one is still there as Windows Media Player Legacy: type that in the Start menu, or add it from Settings, Optional features, View features.</p>'},
        {'q': 'Can Windows 11 copy a CD to MP3?', 'a': '<p>Not with the new Media Player, which copies to AAC, FLAC, WMA or ALAC. Windows Media Player Legacy can (Rip settings, Format, MP3), and so can our free 365 PC Manager app.</p>'},
        {'q': 'Why does one CD play and another not?', 'a': '<p>Usually a scratched or dirty disc. A few CDs from the early 2000s were also copy-protected in ways that stop them playing on computers.</p>'},
        {'q': 'Is it legal to copy my own CDs in the UK?', 'a': '<p>Strictly, UK law has had no exception for copying your own CDs since 2015, when the High Court overturned the one brought in the year before. In practice, copying music you own for your own listening is widely done; never share or sell the copies.</p>'},
        {'q': 'Will my copied songs have their names?', 'a': '<p>Media Player and Windows Media Player Legacy look the names up online when they can. Our free app looks the album, artist and song names up on MusicBrainz, the free online music encyclopaedia, and lets you correct them.</p>'},
        {'q': 'Can you copy all my CDs for me?', 'a': '<p>Yes. We can set it up remotely so copying each CD is one click, or do the whole shelf for you. Remote help is from &pound;20 and no fix, no fee. Ring 01202 775566.</p>'},
    ],
    'crossLinksHtml': '<p>Related help: <a href="/how-to-listen-to-the-radio-on-your-computer/">listening to the radio on your computer</a>, <a href="/how-to-back-up-your-photos/">backing up your photos</a>, <a href="/transfer-photos-to-a-new-computer-bournemouth/">moving to a new computer</a>, <a href="/free-pc-health-check/">the free 365 PC Manager app</a> and <a href="/remote-support/">remote support</a>.</p>',
}

# ============================================================ 7. A house that looks and sounds lived-in (v36's timer)
LV = {
    'slug': 'make-your-house-look-lived-in-while-away',
    'title': 'Make Your Home Look Lived-In While You&rsquo;re Away | 365 Techies',
    'metaDesc': 'Going away? Police-backed ways to make your home look and sound lived-in: lamps and a radio on timers, post and curtains sorted, and a free PC radio timer.',
    'ogTitle': 'Make your house look lived-in while you&rsquo;re away',
    'crumbName': 'Make Your House Look Lived-In',
    'eyebrow': '// GOING AWAY? MAKE IT LOOK LIVED-IN',
    'h1': 'Make your house look <em class="grad grad--cyan">lived-in</em> while you&rsquo;re away',
    'lede': 'Most burglars are opportunists looking for an empty house, so the aim is simple: make yours look and sound as if someone&rsquo;s home. Police advice is lamps and a radio on timers, no post piling up, curtains and the garden left looking normal, and every door and window properly locked. Here&rsquo;s the full checklist, and a free way to put the radio on a timer using your computer.',
    'chips': ['Police-backed checklist', 'Free radio timer for your PC', 'Bournemouth family firm since 1995'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['See remote support', '/remote-support/'],
    'ctaHead': 'Want it set up before you go?', 'ctaSub': 'We connect to your Windows PC and set the radio timer up with you, test it, and check the PC will wake for it. Usually the same day. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('The biggest wins', 'A lamp on a timer in the evening, a radio playing when someone would normally be in, and no post or parcels piling up.'),
        ('Which radio station?', 'Police suggest a talk station: voices sound like people at home having a conversation. Keep it at normal speaking volume.'),
        ('Timer plugs', 'A plug-in timer for a lamp or a radio costs a few pounds. Many digital ones have a random setting, so the times vary.'),
        ('Using your computer', 'Our free 365 PC Manager plays the radio or your music between set times, shifting them a little each day. The PC can sleep, but must stay switched on.'),
        ('Post and deliveries', 'Ask a neighbour to clear the post and parcels, or use Royal Mail&rsquo;s paid Keepsafe service. Cancel milk and papers.'),
        ('Keep it quiet', 'Don&rsquo;t post that you&rsquo;re away until you&rsquo;re back, and keep your home address off the outside of luggage labels.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; START HERE', 'h2': 'The going-away checklist',
         'html': '<p>Secured by Design, the police&rsquo;s own crime-prevention initiative, puts it simply: most burglars want to get in quickly, take something and get out, so an empty-looking house is what they look for. Make yours look lived-in, and make it hard to get into:</p>'
                 '<ul><li><strong>Lights on timers.</strong> A lamp in the front room on a plug-in timer for the evening, and perhaps one upstairs later on. Not a light on all day and night: that looks just as empty.</li>'
                 '<li><strong>A radio on a timer.</strong> Voices from inside at the times someone would usually be in &mdash; there&rsquo;s more on this below.</li>'
                 '<li><strong>No post piling up.</strong> Ask a neighbour to push post right through the letterbox and take in parcels, or use Royal Mail&rsquo;s paid Keepsafe service, which holds your post until you&rsquo;re back. Cancel milk and newspapers.</li>'
                 '<li><strong>Curtains as normal.</strong> Closed curtains in the daytime are a giveaway. Leave them as you would during the day, or ask a neighbour to open and close them.</li>'
                 '<li><strong>A tidy garden and the bins.</strong> Cut the grass just before you go, and ask a neighbour to put your bins out and back on collection day. A car on the drive helps, if a neighbour can use it.</li>'
                 '<li><strong>Lock up, and hide the keys.</strong> Lock every door and window, take the keys out of the locks and put them somewhere safe, away from the letterbox. Set the burglar alarm if you have one.</li>'
                 '<li><strong>Valuables out of sight.</strong> Laptops, tablets and jewellery away from windows; important documents locked away or left with family.</li>'
                 '<li><strong>Keep it quiet.</strong> Share the holiday photos when you&rsquo;re home, not while you&rsquo;re away, and keep your address on the inside of luggage labels.</li>'
                 '<li><strong>Tell one trusted neighbour.</strong> Give them your mobile number and, if you&rsquo;re happy to, a key.</li></ul>'},
        {'eyebrow': '/02 &mdash; THE RADIO', 'h2': 'Why a radio on a timer helps, and how to set one up',
         'html': '<p>A burglar checking a house often listens at the door or a window. Voices inside are a reason to move on, which is why police advice includes a radio on a timer &mdash; ideally a <strong>talk station</strong>, so it sounds like people chatting rather than a radio left on.</p>'
                 '<p><strong>With a plug-in timer and a radio</strong> (the classic way):</p>'
                 '<ol><li>Plug the timer into a socket near the front of the house, and the radio into the timer.</li>'
                 '<li>Tune the radio to a talk station and set the volume to ordinary speaking level: loud enough to hear at the front door, not across the street.</li>'
                 '<li>Set the timer for the times someone would normally be in &mdash; say late morning and early evening. If it&rsquo;s a digital timer with a <strong>random</strong> setting, use it, so the times aren&rsquo;t the same every day.</li>'
                 '<li>Leave the radio <strong>switched on</strong> at its own switch, so it plays whenever the timer gives it power. Test it a day or two before you go.</li></ol>'
                 '<p>Smart plugs and smart bulbs do the same from a phone app, and many have an &ldquo;away&rdquo; mode that varies the times by itself. We can <a href="/cctv-smart-home/">set up smart lights and cameras</a> for you.</p>'},
        {'eyebrow': '/03 &mdash; USING YOUR COMPUTER', 'h2': 'No timer plug? Let your computer play the radio',
         'html': '__APP_BOX_HOMETIMER__'},
        {'eyebrow': '/04 &mdash; FOR A PET', 'h2': 'Company for a pet left at home',
         'html': '<p>The same timer works on ordinary days for a dog or cat left at home. Many dogs settle better with voices in the house, and council advice on barking dogs suggests leaving a radio on low &mdash; a talk station, or calm music rather than anything loud and heavy. Keep the volume gentle, or the neighbours will hear it too.</p>'
                 '<p>A radio is company, not care: the RSPCA advises not leaving a dog alone for more than four hours.</p>'},
        {'eyebrow': '/05 &mdash; WHAT IT COSTS', 'h2': 'What it costs to leave the computer on',
         'html': '<p>Very little. Playing the radio, with the screen off, a laptop uses roughly 8 to 15 watts and a typical desktop 40 to 80 watts; asleep in between, a watt or three. With the radio on for four hours a day, that comes to roughly <strong>1p to 3p a day for a laptop</strong> and <strong>5p to 10p a day for a desktop</strong> at the current price cap of 26.32p a unit. A radio on a timer plug uses even less.</p>'
                 '<p>Want the exact figure for your own computer? Try our <a href="/how-much-does-it-cost-to-run-a-pc-uk/">PC running cost calculator</a>.</p>'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _call_us('If you&rsquo;d like the radio timer set up and tested before you go, or you&rsquo;d like smart lights or a camera you can check from your phone, we&rsquo;re happy to help.')},
    ],
    'howToName': 'How to make your house look and sound lived-in while you are away',
    'howToSteps': [
        {'name': 'Put a lamp on a timer', 'text': 'Plug a lamp in the front room into a timer set for the evening, and perhaps one upstairs for later. Don&rsquo;t leave lights on all day and night.'},
        {'name': 'Put a radio on a timer', 'text': 'Plug a radio into a timer near the front of the house, tuned to a talk station at speaking volume, set for times someone would usually be in. Or use the Someone&rsquo;s home timer in the free 365 PC Manager app.'},
        {'name': 'Stop the post piling up', 'text': 'Ask a neighbour to clear the post and parcels, or use Royal Mail&rsquo;s paid Keepsafe service, and cancel milk and newspapers.'},
        {'name': 'Leave the house looking normal', 'text': 'Leave curtains as they are in the daytime, cut the grass before you go, and ask a neighbour to put the bins out and back.'},
        {'name': 'Lock up and keep it quiet', 'text': 'Lock every door and window, hide the keys away from the letterbox, set the alarm, and don&rsquo;t post that you&rsquo;re away until you&rsquo;re back.'},
    ],
    'faqs': [
        {'q': 'Does leaving a radio on really put burglars off?', 'a': '<p>It helps as one part of making a house look occupied, which is why police advice includes lamps and radios on timers. Most burglars are opportunists looking for an empty house; voices inside and a lamp coming on in the evening make yours look like the wrong choice. It&rsquo;s no substitute for good locks and an alarm.</p>'},
        {'q': 'Talk radio or music?', 'a': '<p>Talk, if you can: police advice is that voices sound like people at home having a conversation. Music is better than silence.</p>'},
        {'q': 'Should I leave a light on all the time?', 'a': '<p>No. A light left on day and night looks as empty as one never switched on. Put lamps on timers for the evening, the way you&rsquo;d use them yourself.</p>'},
        {'q': 'Will my computer switch itself on for the radio?', 'a': '<p>If it&rsquo;s asleep, yes: the free 365 PC Manager app wakes it a minute or so early using Windows&rsquo; own wake timer, as long as the power plan allows wake timers (the app shows this and can switch them on). If the computer is switched off, nothing can run. A laptop must be left plugged in.</p>'},
        {'q': 'What if the internet goes off while I&rsquo;m away?', 'a': '<p>Then the radio can&rsquo;t play, because it comes over the internet. If your broadband is unreliable, set the timer to play your own songs instead: they&rsquo;re on the computer, so they play either way.</p>'},
        {'q': 'Can I use BBC Radio 4 or LBC?', 'a': '<p>Not in our app: the BBC and Global (which runs LBC, Heart and Classic FM) only let their stations play in their own apps. Use another station or your own music, or put a real radio tuned to Radio 4 on a timer plug.</p>'},
        {'q': 'Is it safe to leave the computer on while I&rsquo;m away?', 'a': '<p>Yes, much like leaving the broadband router on. It sleeps between plays. Leave it on a hard surface with its air vents clear, not on a bed or in a cupboard.</p>'},
        {'q': 'Can you set it up for me?', 'a': '<p>Yes. With your permission we connect to your Windows PC, set the timer, test it with you and check the PC will wake for it, usually the same day. Remote help is from &pound;20 and no fix, no fee. Ring 01202 775566.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/how-to-listen-to-the-radio-on-your-computer/">listening to the radio on your computer</a>, <a href="/how-to-set-an-alarm-on-your-computer/">a wake-up alarm on your computer</a>, <a href="/cctv-smart-home/">CCTV and smart home setup</a>, <a href="/lost-or-stolen-laptop-what-to-do/">lost or stolen laptop</a>, <a href="/how-much-does-it-cost-to-run-a-pc-uk/">what a PC costs to run</a> and <a href="/free-pc-health-check/">the free 365 PC Manager app</a>. The checklist follows the advice of <a href="https://www.securedbydesign.com/" rel="noopener" target="_blank">Secured by Design</a>, the police&rsquo;s crime-prevention initiative.</p>',
}

# ============================================================ 8. An alarm on a laptop or PC (v36's wake-up alarm)
AL = {
    'slug': 'how-to-set-an-alarm-on-your-computer',
    'title': 'How to Set an Alarm on Your Laptop or PC | 365 Techies',
    'metaDesc': 'Set an alarm on a Windows laptop or PC: the Clock app, why its alarm stays silent when the PC sleeps, and a free alarm that wakes it gently with the radio.',
    'ogTitle': 'How to set an alarm on your laptop or PC',
    'crumbName': 'Set an Alarm on Your Computer',
    'eyebrow': '// AN ALARM ON YOUR COMPUTER',
    'h1': 'How to set an <em class="grad grad--cyan">alarm</em> on your laptop or PC',
    'lede': 'Windows has an alarm built in: the Clock app. The catch is that it only goes off while the computer is awake, and only with its own chimes &mdash; so if the PC has gone to sleep, nothing happens. Here&rsquo;s how to set it, how to stop it failing silently, and a free alarm that wakes the PC itself and starts the radio or your music softly, getting gently louder.',
    'chips': ['Built into Windows 10 &amp; 11', 'Free radio alarm app', 'Windows specialists since 1995'],
    'primaryCta': ['Call 01202 775566', 'tel:+441202775566'], 'secondaryCta': ['See remote support', '/remote-support/'],
    'ctaHead': 'Want it set up for you?', 'ctaSub': 'We connect to your Windows PC, set your alarm, test it with you and check the PC will wake for it. Usually the same day. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Built into Windows', 'The Clock app: Start, type Clock, then Alarm and Add an alarm. Free, nothing to install.'),
        ('The catch', 'Clock alarms only go off while the computer is awake. If it has gone to sleep, the alarm stays silent.'),
        ('Stop it failing silently', 'Keep the computer plugged in, stop it sleeping for the night, and check the volume and speakers.'),
        ('Waking to the radio or your music', 'The Clock app only has its own sounds. Our free 365 PC Manager plays a radio station or your songs.'),
        ('Gentle wake-up', 'Our app starts almost silent and rises to the volume you choose, over 3 to 30 minutes.'),
        ('Asleep is fine with our app', 'It wakes the PC a minute early on its own. A laptop must be plugged in, and nothing can wake a PC that&rsquo;s switched off.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; START HERE', 'h2': 'Set an alarm with Windows&rsquo; Clock app',
         'html': '<ol><li>Click <strong>Start</strong>, type <strong>Clock</strong> and open the Clock app. (On Windows 10 it may be called <strong>Alarms &amp; Clock</strong>.)</li>'
                 '<li>Choose <strong>Alarm</strong> on the left, then <strong>Add an alarm</strong> (the <strong>+</strong> button).</li>'
                 '<li>Set the time and give it a name if you like. Tick <strong>Repeat alarm</strong> and choose the days, or leave it for just once.</li>'
                 '<li>Pick a <strong>sound</strong> and a <strong>snooze time</strong>, then choose <strong>Save</strong>.</li></ol>'
                 '<p>Each alarm has an on/off switch, so you can keep your usual ones and switch them off for the weekend. Before you rely on it, read the next part: the Clock app warns that its notifications only show if the PC is awake.</p>'},
        {'eyebrow': '/02 &mdash; IT DIDN&rsquo;T GO OFF?', 'h2': 'Why the alarm didn&rsquo;t go off, and how to fix it',
         'html': '<p>Almost always, the computer had gone to <strong>sleep</strong>. The Clock app can&rsquo;t wake it, so the alarm passes in silence. To make it reliable:</p>'
                 '<ul><li><strong>Keep it awake for the night.</strong> Open <strong>Settings &gt; System &gt; Power &amp; battery</strong> (on a desktop, just <strong>Power</strong>; on Windows 10, <strong>Power &amp; sleep</strong>), open <strong>Screen and sleep</strong> (<strong>Screen, sleep &amp; hibernate timeouts</strong> on newer versions), and set the <strong>sleep</strong> setting for when it&rsquo;s plugged in to <strong>Never</strong>. Letting the <strong>screen</strong> turn off is fine.</li>'
                 '<li><strong>Keep a laptop plugged in, with the lid open.</strong> Closing the lid usually sends a laptop to sleep.</li>'
                 '<li><strong>Check the sound.</strong> Click the speaker icon by the clock: not muted, the volume up, and the sound going to speakers that are switched on &mdash; not headphones on the bedside table.</li>'
                 '<li><strong>Test it.</strong> Set an alarm for two minutes&rsquo; time, walk away, and listen.</li></ul>'
                 '<p>Leaving a computer awake all night costs very little, but it does cost something. If you&rsquo;d rather it slept, use an alarm that can wake it, like ours below.</p>'},
        {'eyebrow': '/03 &mdash; THE GENTLE WAY', 'h2': 'Wake up to the radio, getting gently louder',
         'html': '__APP_BOX_ALARM__'},
        {'eyebrow': '/04 &mdash; PHONE OR COMPUTER?', 'h2': 'Phone or computer: which makes the better alarm?',
         'html': '<p>For most people a phone by the bed is the simplest alarm. A computer earns its place when it&rsquo;s in the bedroom or the kitchen with proper speakers: you can wake to your favourite station or your own music at a sensible volume, without a phone under the pillow. It&rsquo;s also handy as a second alarm for important mornings &mdash; an early flight, a hospital appointment &mdash; in case the phone&rsquo;s been silenced.</p>'},
        {'eyebrow': '/05 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _call_us('If your alarm keeps failing, the computer won&rsquo;t wake, or there&rsquo;s no sound, we&rsquo;ll find out why and set it up properly with you.')},
    ],
    'howToName': 'How to set an alarm on a Windows laptop or PC',
    'howToSteps': [
        {'name': 'Open the Clock app', 'text': 'Click Start, type Clock and open the Clock app (Alarms &amp; Clock on Windows 10).'},
        {'name': 'Add an alarm', 'text': 'Choose Alarm, then Add an alarm. Set the time, tick Repeat alarm and choose the days, pick a sound and a snooze time, and choose Save.'},
        {'name': 'Stop the computer sleeping', 'text': 'The Clock app only rings while the computer is awake. In Settings, System, Power and battery, set sleep when plugged in to Never for the night, and keep a laptop plugged in with the lid open.'},
        {'name': 'Check the sound', 'text': 'Make sure the volume is up, not muted, and going to speakers that are switched on. Test with an alarm two minutes ahead.'},
        {'name': 'Or use an alarm that wakes the PC', 'text': 'The free 365 PC Manager app wakes the computer from sleep a minute early and starts the radio or your music, rising gently to the volume you choose.'},
    ],
    'faqs': [
        {'q': 'Why didn&rsquo;t my alarm go off on my laptop?', 'a': '<p>Usually because the laptop was asleep: closing the lid or leaving it idle sends it to sleep, and the Clock app&rsquo;s alarms only sound while it&rsquo;s awake. Keep it plugged in with the lid open and sleep set to Never for the night, or use an alarm that can wake it.</p>'},
        {'q': 'Will an alarm work if the computer is asleep?', 'a': '<p>Not the Clock app&rsquo;s. Our free 365 PC Manager&rsquo;s wake-up alarm wakes the computer a minute early using Windows&rsquo; own wake timer, as long as it&rsquo;s plugged in. Nothing can ring on a computer that&rsquo;s switched off.</p>'},
        {'q': 'Can I wake up to the radio or my own music?', 'a': '<p>Not with the Clock app, which only has its own sounds. Our free app plays a radio station, your favourite songs, all your music shuffled, or a playlist.</p>'},
        {'q': 'Can the alarm get louder gradually?', 'a': '<p>Yes, with our app: it starts almost silent and rises to the volume you choose over 3, 5, 10, 15, 20 or 30 minutes &mdash; or starts straight at that volume if you prefer.</p>'},
        {'q': 'What if the internet is down in the morning?', 'a': '<p>Our app won&rsquo;t fail silently: if the station won&rsquo;t play, your songs play instead, and if there are none, Windows&rsquo; own alarm sound. It also turns Windows&rsquo; sound up to at least 30% if it was muted or very low.</p>'},
        {'q': 'Can I wake up to BBC Radio 2 or Heart?', 'a': '<p>Not in our app: the BBC and Global (Heart, Capital, Classic FM, Smooth) only let their stations play in their own apps, so they can&rsquo;t be alarms. Choose another station, or your own music.</p>'},
        {'q': 'What happens if I sleep through it?', 'a': '<p>The Clock app snoozes for the time you chose. Our app shows a Good morning window with Stop and Snooze (10 minutes), and switches itself off after an hour.</p>'},
        {'q': 'Can you set it up for me?', 'a': '<p>Yes. With your permission we connect to your Windows PC, set the alarm, test it with you and check the computer wakes for it, usually the same day. Remote help is from &pound;20 and no fix, no fee. Ring 01202 775566.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/how-to-listen-to-the-radio-on-your-computer/">listening to the radio on your computer</a>, <a href="/make-your-house-look-lived-in-while-away/">a radio on a timer while you&rsquo;re away</a>, <a href="/how-much-does-it-cost-to-run-a-pc-uk/">what a PC costs to run</a>, <a href="/free-pc-health-check/">the free 365 PC Manager app</a> and <a href="/remote-support/">remote support</a>.</p>',
}

# the step-by-step panels (build_extra FIX_FLOW_PAGES format); the calculator page has none
FLOWS = {
    BT['slug']: {'h2': 'Get proper sound back, step by step', 'ask': 'Do they sound right now?', 'tip': 'Play some music, then join a test call to be sure it stays right.',
                 'h3s': 'Still muffled after every step? That is a remote job.'},
    HZ['slug']: {'h2': 'Get it off 60Hz, step by step', 'ask': 'Is the higher refresh rate there now?', 'tip': 'Choose it in Advanced display, then restart once to be sure it sticks.',
                 'h3s': 'Still stuck at 60Hz after every step? That is a remote job.'},
    PQ['slug']: {'h2': 'Clear the queue, step by step', 'ask': 'Is it printing now?', 'tip': 'Print a test page from the program you were using.',
                 'h3s': 'Still stuck after every step? That is a remote job.'},
    AL['slug']: {'h2': 'Get your alarm going off, step by step', 'ask': 'Did it go off?', 'tip': 'Test it with an alarm two minutes ahead before you rely on it.',
                 'h3s': 'Still silent after every step? That is a remote job.'},
    CD['slug']: {'h2': 'Get your CD playing, step by step', 'ask': 'Is it playing now?', 'tip': 'Set Audio CD to play in AutoPlay, so next time it starts by itself.',
                 'h3s': 'Still won&rsquo;t play after every step? That is a remote job.'},
}


def pages(setup_url):
    """The four pages, ready for build_extra.build_new_page, with the download link and the app boxes filled in."""
    boxes = {
        '__APP_BOX_SOUND__': _app_box('sound', 'Sound check: what Windows is really doing with your sound',
            '<p style="margin:0">It shows where your sound is going &mdash; laptop speakers, headphones, a TV &mdash; whether it&rsquo;s muted, the volume and a live level bar, with a test sound and a microphone test. '
            'If Bluetooth headphones are stuck in phone-call mode, it says so by name. It never changes anything itself: it opens Windows&rsquo; Sound settings so you choose.</p>', setup_url),
        '__APP_BOX_SCREEN__': _app_box('screen', 'Screen check: is your screen at its sharpest and smoothest?',
            '<p style="margin:0">For every screen it shows the name and year it was made, the size and refresh rate it&rsquo;s running at, its own best size, and a better setting when Windows offers one. '
            'It never changes the setting itself &mdash; it opens Display settings, and Windows puts the old setting back if the screen goes blank.</p>', setup_url),
        '__APP_BOX_PRINTER__': _app_box('printer', 'Printers: what&rsquo;s stuck, and one button to clear it',
            '<p style="margin:0">It lists every printer as Windows sees it, shows any documents stuck in the queue with a button that cancels only those, and tells you if Windows&rsquo; printing service has stopped. '
            'It only reads, until you press a button.</p>', setup_url),
        '__APP_BOX_RADIO__': _app_box('radio', 'Radio: the stations near you, one click each',
            '<p style="margin:0">It lists the stations for the country your PC is in, with the ones <strong>near you</strong> first and a heart to keep your favourites, and plays them in one click. '
            'BBC and Global stations open in BBC Sounds and Global Player, because those broadcasters keep them to their own apps. The equaliser and Volume boost work on the music and stations it plays itself, and it can wake you with the radio.</p>', setup_url),
        '__APP_BOX_CDS__': _app_box('cds', 'CDs: play them, and copy them to MP3',
            '<p style="margin:0">Put a CD in and it plays. It can also copy the CD, saving every song as an MP3 in your Music folder, with the album, artist and song names looked up for you on MusicBrainz (only the disc&rsquo;s ID is sent, and you can correct the names). '
            'No CD drive? It says so, and tells you what to plug in.</p>', setup_url),
        '__APP_BOX_HOMETIMER__': _app_box('hometimer', 'Someone&rsquo;s home: the radio on a timer, from your PC',
            '<p style="margin:0">Choose the times and days, the radio station or your own songs, and the volume. It plays between those times, and with <strong>Shift the times a little each day</strong> on, they move by up to 20 minutes each day so it never looks automatic. '
            'The PC can be asleep: it wakes itself a minute or so early (a laptop must be plugged in), but it can&rsquo;t if it&rsquo;s switched off. It never interrupts music someone is playing. BBC and Global stations can&rsquo;t be used, as they only play in their own apps.</p>', setup_url),
        '__APP_BOX_ALARM__': _app_box('alarm', 'A wake-up alarm that wakes the PC too',
            '<p style="margin:0">Choose the time and the days (or just once), then what plays: a <strong>radio station</strong>, your favourite songs, all your music shuffled, or a playlist. It starts <strong>almost silent and rises</strong> to the volume you choose over 3 to 30 minutes, and a Good morning window has <strong>Stop</strong> and <strong>Snooze</strong> (10 minutes). '
            'It won&rsquo;t fail silently: it turns Windows&rsquo; sound up if it&rsquo;s muted or very low, plays your songs if the station won&rsquo;t start, and Windows&rsquo; alarm sound if there are none. The PC can be asleep &mdash; it wakes itself a minute early (leave a laptop plugged in) &mdash; but not switched off. BBC and Global stations can&rsquo;t be alarms.</p>', setup_url),
        '__APP_BOX_POWER__': _app_box('power', 'Power &amp; running cost: what yours really uses',
            '<p style="margin:0">It records the power as it goes, hour by hour, and shows what it cost at your own price a unit, with Eco, Everyday and Full speed modes to cut it. '
            'On a laptop running on battery it reads the whole laptop; on a desktop, the processor and an NVIDIA graphics card &mdash; not the screen or disks, and it says so.</p>', setup_url),
    }
    out = []
    for d in (BT, HZ, PQ, PC, RD, CD, LV, AL):
        d = dict(d, sections=[dict(s) for s in d['sections']])
        for k in ('title', 'metaDesc', 'ogTitle'):   # plain apostrophes: these also go into JSON-LD and meta tags
            d[k] = d[k].replace('&rsquo;', "'")
        for s in d['sections']:
            for k, v in boxes.items(): s['html'] = s['html'].replace(k, v)
        d['primaryCta'] = [d['primaryCta'][0], d['primaryCta'][1].replace('__PCM_SETUP__', setup_url)]
        out.append(d)
    return out


# ---- the free tool pages whose job the app also does: an app box after "What next" (wave 5, 8 Oct 2026)
def tool_boxes(setup_url):
    """slug -> the section to insert on that tool page."""
    pw_tail = ('<p style="margin:.6rem 0 0">Everything happens on your PC: nothing typed or made there is sent anywhere or kept, and a password you copy is kept out of Windows&rsquo; clipboard history.</p>')
    boxes = {
        'password-generator': _app_box('passwords', 'Make strong passwords on your PC',
            '<p style="margin:0">Our free app makes the same kind of password &mdash; three random words, a number and a symbol, following the UK National Cyber Security Centre&rsquo;s advice &mdash; with one click, and four words if you want it even stronger. It also checks whether a password has leaked, and rates how strong one is as you type.</p>' + pw_tail, setup_url),
        'password-strength-checker': _app_box('passwords', 'Check and make passwords on your PC',
            '<p style="margin:0">Our free app rates a password as you type it into its leak check: an honest estimate that looks for the most-used passwords, common words and patterns first, then length &mdash; and it checks the password against known data breaches too. And when one isn&rsquo;t strong enough, it makes a new one &mdash; three random words, a number and a symbol &mdash; with one click.</p>' + pw_tail, setup_url),
        'password-breach-checker': _app_box('passwords', 'Check for leaked passwords from your PC',
            '<p style="margin:0">Our free app runs the same private check: it scrambles your password on your PC and sends only the first five characters of the scramble to the Have I Been Pwned database, so the password itself never leaves the computer. If one has leaked, it makes you a strong new one with one click.</p>' + pw_tail, setup_url),
        'qr-code-generator': _app_box('qr', 'Make QR codes on your PC',
            '<p style="margin:0">Our free app has a QR code maker for a web address, a phone number or a short note &mdash; for a poster, a letter or the club newsletter. It&rsquo;s made on your PC with nothing fetched from anywhere, and you can save it as a picture, copy it or print it straight away.</p>', setup_url),
        'wifi-qr-code-generator': _app_box('wificard', 'Print a guest Wi-Fi card from your PC',
            '<p style="margin:0">Type your Wi-Fi name and password into our free app and it makes a card with the QR code, the network name and the password on it, ready to print or save as a picture. Visitors point their phone&rsquo;s camera at it and they&rsquo;re on. Your password isn&rsquo;t kept or sent anywhere.</p>', setup_url),
    }
    return {slug: ('    <section class="section" aria-label="In our free app" id="in-the-app">\n      <div class="wrap">\n'
                   '        <p class="eyebrow mono">// ALSO IN OUR FREE WINDOWS APP</p>\n'
                   '        <h2 class="section-title" data-title>Prefer it on your PC?<span class="title-underline"></span></h2>\n'
                   '        ' + box + '\n      </div>\n    </section>\n') for slug, box in boxes.items()}


def tool_insert(content, section):
    """Put the app section straight after the tool's What next cards (before its FAQs); else at the end."""
    for mark in ('    <section class="faq-section', '<section class="faq-section'):
        i = content.find(mark)
        if i >= 0:
            return content[:i] + section + content[i:]
    return content + '\n' + section
