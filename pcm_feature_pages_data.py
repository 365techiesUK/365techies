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
    'sound':   ('/images/pcm-feat-sound-v36.webp', 1272, 1440, 'Sound check in 365 PC Manager saying the headphones are in phone-call mode, so sound is muffled: the Hands-Free headset is in use at 16 kHz mono, with a Play a test sound button', 'Sound check'),
    'screen':  ('/images/pcm-feat-screen-v36.webp', 1272, 1012, 'Screen check in 365 PC Manager saying a sharper or smoother setting is available: a 2560 x 1440 monitor running at 60 Hz that can do 144 Hz', 'Screen check'),
    'printer': ('/images/pcm-feat-printers-v36.webp', 1272, 864, 'Printers in 365 PC Manager saying 2 documents are stuck in the queue, with a Clear stuck documents button', 'Printers'),
    'power':   ('/images/pcm-feat-power-v36.webp', 1272, 1408, 'Power and running cost in 365 PC Manager: hours on in the last 30 days, the energy and roughly what it cost, the Eco, Everyday and Full speed modes and an hour-by-hour power history', 'Power &amp; running cost'),
}


def _app_box(key, head, what_html, setup_url, note=''):
    src, w, h, alt, where = SHOTS[key]
    return (f'<div class="pfa" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:1.3rem;align-items:center;margin:.4rem 0 0;padding:1.2rem 1.3rem;'
            f'border-radius:18px;border:1px solid rgba(29,151,227,.42);background:linear-gradient(135deg,rgba(29,151,227,.10),rgba(255,255,255,.02))">'
            f'<div><p class="mono" style="margin:0 0 .4rem;font-size:.72rem;letter-spacing:.08em;color:var(--cyan-soft)">FREE &middot; WINDOWS 10 &amp; 11 &middot; NO SIGN-UP</p>'
            f'<h3 style="margin:0 0 .5rem;font-size:1.25rem;line-height:1.25">{head}</h3>{what_html}'
            f'<p style="margin:.6rem 0 0;font-size:.92rem">In the app: <b>My PC</b>, then <b>{where}</b>.</p>'
            f'<p style="margin:1rem 0 0;display:flex;flex-wrap:wrap;gap:.6rem"><a class="button primary" href="{setup_url}" download data-pfa-dl="{key}" style="text-decoration:none">Download 365 PC Manager free &#8595;</a>'
            f'<a class="button secondary" href="/free-pc-health-check/" style="text-decoration:none">What else it checks</a></p>'
            f'<p style="margin:.7rem 0 0;font-size:.82rem;color:var(--muted)">Made by us, a family IT firm in Bournemouth since 1995, and digitally signed by 365 Techies Ltd.{note}</p></div>'
            f'<figure style="margin:0"><img src="{src}" width="{w}" height="{h}" alt="{alt}" loading="lazy" decoding="async" '
            f'style="display:block;width:100%;height:auto;border-radius:12px;border:1px solid rgba(125,170,220,.3);box-shadow:0 22px 50px -26px rgba(0,0,0,.8)">'
            f'<figcaption style="font-size:.72rem;color:var(--muted);margin-top:.4rem">The real app catching it (a sample PC).</figcaption></figure></div>'
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

# the step-by-step panels (build_extra FIX_FLOW_PAGES format); the calculator page has none
FLOWS = {
    BT['slug']: {'h2': 'Get proper sound back, step by step', 'ask': 'Do they sound right now?', 'tip': 'Play some music, then join a test call to be sure it stays right.',
                 'h3s': 'Still muffled after every step? That is a remote job.'},
    HZ['slug']: {'h2': 'Get it off 60Hz, step by step', 'ask': 'Is the higher refresh rate there now?', 'tip': 'Choose it in Advanced display, then restart once to be sure it sticks.',
                 'h3s': 'Still stuck at 60Hz after every step? That is a remote job.'},
    PQ['slug']: {'h2': 'Clear the queue, step by step', 'ask': 'Is it printing now?', 'tip': 'Print a test page from the program you were using.',
                 'h3s': 'Still stuck after every step? That is a remote job.'},
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
        '__APP_BOX_POWER__': _app_box('power', 'Power &amp; running cost: what yours really uses',
            '<p style="margin:0">It records the power as it goes, hour by hour, and shows what it cost at your own price a unit, with Eco, Everyday and Full speed modes to cut it. '
            'On a laptop running on battery it reads the whole laptop; on a desktop, the processor and an NVIDIA graphics card &mdash; not the screen or disks, and it says so.</p>', setup_url),
    }
    out = []
    for d in (BT, HZ, PQ, PC):
        d = dict(d, sections=[dict(s) for s in d['sections']])
        for k in ('title', 'metaDesc', 'ogTitle'):   # plain apostrophes: these also go into JSON-LD and meta tags
            d[k] = d[k].replace('&rsquo;', "'")
        for s in d['sections']:
            for k, v in boxes.items(): s['html'] = s['html'].replace(k, v)
        d['primaryCta'] = [d['primaryCta'][0], d['primaryCta'][1].replace('__PCM_SETUP__', setup_url)]
        out.append(d)
    return out
