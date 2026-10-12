# -*- coding: utf-8 -*-
"""Accessibility symptom pages: a Windows setting that switched on by accident, put right on the page.

Owner, 12 Oct 2026: "go ahead with the sticky keys page", after the Bing keyword research
(D:/claude/seo-research/pages-to-build-2026-10-12.md): "sticky keys" 38,700 Bing searches in 3 months (UK 3,000), and
"turn off sticky keys" / "how to turn off sticky keys" / "sticky keys turn off" about 15,000 between them; "turn off narrator"
1,800; "how to turn off high contrast mode" 909; "turn off magnifier" 410. Our accessibility guide covers turning features ON;
this page is the "it came on by itself" symptom, the shape that earns for us.

Every step was checked on 12 Oct 2026 against Microsoft's own pages:
  - Windows keyboard shortcuts for accessibility: Shift five times = Sticky Keys on or off; right Shift for eight seconds =
    Filter Keys; Num Lock for five seconds = Toggle Keys; Windows + Esc ends Magnifier; Windows + Ctrl + C = colour filters;
    left Alt + left Shift + Print Screen = high contrast.
  - Make your keyboard easier to use: Windows 11 = Windows + U (or Start > Settings > Accessibility) > Keyboard;
    Windows 10 = Start > Settings > Ease of Access > Keyboard.
  - Windows 11 Quick Settings (Windows + A) > Accessibility includes a Sticky keys switch.
The shortcut options ("Keyboard shortcut for Sticky keys" on Windows 11, "Allow the shortcut key to start Sticky Keys" on
Windows 10) and "Turn off Sticky keys when two keys are pressed at the same time" are the settings' own wording.
Windows + Ctrl + Enter (Narrator) and Windows + Ctrl + O (On-Screen Keyboard) are Microsoft's standard shortcuts.
"""

_CALL = ('<p>Still not right? Ring <strong>01202 775566</strong> or text 07520 615332, Monday to Friday, 9 to 5. With your '
         'permission we connect to your Windows PC and sort it while you watch: usually the same day, remote help from &pound;20, '
         'and no fix, no fee. If the keyboard itself is faulty, we collect it free across Bournemouth, Christchurch, Poole and '
         'Dorset, repair it and bring it back.</p>')

STICKY = {
    'slug': 'how-to-turn-off-sticky-keys',
    'title': 'How to Turn Off Sticky Keys in Windows 11 and 10',
    'metaDesc': 'Sticky Keys keeps popping up, or Shift seems stuck? Turn it off in seconds, stop the shortcut turning it back on, and fix Filter Keys too.',
    'ogTitle': 'How to turn off Sticky Keys, and stop it coming back',
    'crumbName': 'Turn Off Sticky Keys',
    'eyebrow': '// KEYS ACTING STRANGELY?',
    'h1': 'How to turn off <em class="grad grad--cyan">Sticky Keys</em>',
    'lede': 'Shift or Ctrl seems stuck down, letters turn into shortcuts, or a box keeps asking &ldquo;Do you want to turn on Sticky Keys?&rdquo; Here&rsquo;s how to switch it off in Windows 11 and 10, stop it coming back, and sort the other settings that switch on by accident.',
    'chips': ['Takes 30 seconds', 'Windows 11 and 10', 'Nothing to download'],
    'primaryCta': ['Turn it off now', '#s1'], 'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
    'ctaHead': 'Keyboard still not right?',
    'ctaSub': 'With your permission we connect to your Windows PC and sort it while you watch. If the keyboard itself is faulty, we collect it free locally, repair it and bring it back. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Quickest way off', 'Press the Shift key five times in a row: that shortcut switches Sticky Keys on and off.'),
        ('In Settings', 'Windows + U opens Accessibility settings. Choose Keyboard and switch Sticky keys off.'),
        ('Stop the pop-up', 'In the Sticky keys options, switch off the keyboard shortcut, so five presses of Shift do nothing.'),
        ('Keys need holding down?', 'That&rsquo;s Filter Keys. Holding the right Shift for eight seconds turns it on; switch it off on the same page.'),
        ('Beeps on Caps Lock?', 'That&rsquo;s Toggle Keys. Holding Num Lock for five seconds turns it on; it&rsquo;s on the same page.'),
        ('Who it&rsquo;s for', 'People who find it hard to press two keys at once. If it helps you, keep it on and just turn off the shortcut.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; TURN IT OFF', 'h2': 'Turn off Sticky Keys in Windows 11 and 10',
         'html': '<ol>'
                 '<li><strong>The quickest way:</strong> press the <em>Shift</em> key five times in a row. Windows uses that shortcut to switch Sticky Keys on and off, and plays a sound when it does.</li>'
                 '<li><strong>Windows 11, from the taskbar:</strong> press <em>Windows</em> + <em>A</em> to open Quick Settings, choose <strong>Accessibility</strong> and switch <strong>Sticky keys</strong> off. If Accessibility isn&rsquo;t there, use the next step.</li>'
                 '<li><strong>Windows 11, in Settings:</strong> press <em>Windows</em> + <em>U</em> (or Start, Settings, Accessibility), choose <strong>Keyboard</strong> and switch <strong>Sticky keys</strong> off.</li>'
                 '<li><strong>Windows 10:</strong> Start, Settings, <strong>Ease of Access</strong>, <strong>Keyboard</strong>, and switch <strong>Sticky Keys</strong> off.</li>'
                 '</ol>'
                 '<p>Shift, Ctrl, Alt and the Windows key now work normally again: you hold one down while you press the other key.</p>'},
        {'eyebrow': '/02 &mdash; STOP IT COMING BACK', 'h2': 'Stop Sticky Keys turning itself back on',
         'html': '<p>It almost always comes back because something pressed <em>Shift</em> five times: a game that uses Shift, someone resting a hand on the keyboard, or a cat walking across it. Switch off that shortcut and it can&rsquo;t happen again:</p>'
                 '<ol>'
                 '<li><strong>Windows 11:</strong> Settings, Accessibility, Keyboard, then click <strong>Sticky keys</strong> itself (not its switch) to see its options, and switch off <strong>Keyboard shortcut for Sticky keys</strong>.</li>'
                 '<li><strong>Windows 10:</strong> Settings, Ease of Access, Keyboard. Under Sticky Keys, untick <strong>Allow the shortcut key to start Sticky Keys</strong>.</li>'
                 '<li><strong>If the box pops up again</strong> before you&rsquo;ve done that, choose <strong>No</strong>. The box itself has a link to the same setting.</li>'
                 '</ol>'
                 '<p>If Sticky Keys helps you, keep it on and use its options instead: <strong>Turn off Sticky keys when two keys are pressed at the same time</strong> gets it out of the way when someone else uses the keyboard.</p>'},
        {'eyebrow': '/03 &mdash; IS IT STICKY KEYS?', 'h2': 'How to tell it&rsquo;s Sticky Keys',
         'html': '<ul>'
                 '<li>Pressing <em>Shift</em>, <em>Ctrl</em>, <em>Alt</em> or the Windows key once makes it act as if it&rsquo;s still held down, so the next letter turns into a shortcut or a capital.</li>'
                 '<li>A short beep or click each time you press one of those keys.</li>'
                 '<li>A box asking <em>&ldquo;Do you want to turn on Sticky Keys?&rdquo;</em> after pressing Shift several times.</li>'
                 '<li>A small Sticky Keys icon on the taskbar, if Windows is set to show one.</li>'
                 '</ul>'
                 '<p>Sticky Keys is a real help for people who find it hard to press two keys together, for example with arthritis or after a stroke: <em>Ctrl</em>, then <em>C</em>, instead of both at once. It only becomes a nuisance when it switches on by accident. Our <a href="/windows-accessibility-features-guide/">Windows accessibility guide</a> covers it and the other features worth turning on.</p>'},
        {'eyebrow': '/04 &mdash; KEYS NEED HOLDING DOWN?', 'h2': 'Keys need holding down, or nothing types: Filter Keys',
         'html': '<p>If you have to hold a key before a letter appears, or quick presses are ignored, <strong>Filter Keys</strong> is on. Holding the right <em>Shift</em> key for eight seconds switches it on, which is easy to do without noticing.</p>'
                 '<p>Turn it off in the same place as Sticky Keys: Settings, Accessibility (Ease of Access on Windows 10), Keyboard, and switch <strong>Filter keys</strong> off. Its options underneath let you switch off its keyboard shortcut too.</p>'
                 '<p>A beep every time you press <em>Caps Lock</em>? That&rsquo;s <strong>Toggle Keys</strong>, which holding <em>Num Lock</em> for five seconds switches on. It&rsquo;s on the same page.</p>'},
        {'eyebrow': '/05 &mdash; OTHER ACCIDENTS', 'h2': 'The other settings that switch on by accident',
         'html': '<ul>'
                 '<li><strong>Everything zoomed in (Magnifier):</strong> <em>Windows</em> + <em>Esc</em>.</li>'
                 '<li><strong>The computer is talking (Narrator):</strong> <em>Windows</em> + <em>Ctrl</em> + <em>Enter</em>.</li>'
                 '<li><strong>Black screen with bright text (high contrast):</strong> <em>Left Alt</em> + <em>Left Shift</em> + <em>Print Screen</em>.</li>'
                 '<li><strong>Screen gone black and white, or odd colours (colour filters):</strong> <em>Windows</em> + <em>Ctrl</em> + <em>C</em>, or Settings, Accessibility, Colour filters.</li>'
                 '</ul>'},
        {'eyebrow': '/06 &mdash; NOT STICKY KEYS?', 'h2': 'Not Sticky Keys? Other reasons a keyboard plays up',
         'html': '<ul>'
                 '<li><strong>@ and &ldquo; swapped, or # types something else:</strong> the keyboard is set to US English. In Settings, Time &amp; language, Language &amp; region (Time &amp; Language, Language on Windows 10), make sure English (United Kingdom) has the <strong>United Kingdom</strong> keyboard and remove the US one. <em>Windows</em> + <em>Space</em> switches between keyboards if there&rsquo;s more than one.</li>'
                 '<li><strong>A laptop types numbers instead of letters:</strong> some laptops turn part of the keyboard into a number pad when <em>Num Lock</em> is on. Press <em>Num Lock</em> (on some laptops <em>Fn</em> + <em>Num Lock</em>).</li>'
                 '<li><strong>The F keys change the volume or brightness instead:</strong> the laptop&rsquo;s Fn lock is on. On many laptops <em>Fn</em> + <em>Esc</em> switches it; look for a small padlock on the Esc key.</li>'
                 '<li><strong>One key repeats, or won&rsquo;t work at all:</strong> it may be crumbs or a fault. Use the On-Screen Keyboard (<em>Windows</em> + <em>Ctrl</em> + <em>O</em>) to keep typing, and get the keyboard checked.</li>'
                 '</ul>'},
        {'eyebrow': '/07 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL},
    ],
    'howToName': 'How to turn off Sticky Keys in Windows',
    'howToSteps': [
        {'name': 'Open Accessibility settings', 'text': 'Press the Windows key and U together, or go to Start, Settings, Accessibility (Ease of Access on Windows 10).'},
        {'name': 'Open Keyboard', 'text': 'Choose Keyboard.'},
        {'name': 'Switch off Sticky keys', 'text': 'Turn the Sticky keys switch off. Shift, Ctrl, Alt and the Windows key work normally again.'},
        {'name': 'Turn off its shortcut', 'text': 'Open the Sticky keys options and switch off the keyboard shortcut, so pressing Shift five times cannot turn it back on.'},
        {'name': 'Check Filter keys too', 'text': 'If keys need holding down before they type, switch Filter keys off on the same page.'},
    ],
    'faqs': [
        {'q': 'How do I turn off Sticky Keys quickly?', 'a': '<p>Press the Shift key five times in a row. Or press the Windows key and U together, choose Keyboard and switch Sticky keys off.</p>'},
        {'q': 'Why does Sticky Keys keep turning on?', 'a': '<p>Something is pressing Shift five times: a game that uses Shift, a hand resting on the key, or a pet. Switch off the keyboard shortcut in the Sticky keys options and it stops.</p>'},
        {'q': 'How do I stop the Sticky Keys pop-up?', 'a': '<p>On Windows 11, switch off Keyboard shortcut for Sticky keys (Settings, Accessibility, Keyboard, then Sticky keys). On Windows 10, untick Allow the shortcut key to start Sticky Keys (Settings, Ease of Access, Keyboard).</p>'},
        {'q': 'What is Sticky Keys for?', 'a': '<p>It lets you press keyboard shortcuts one key at a time, such as Ctrl and then C, instead of holding both. It helps people who find pressing two keys together hard.</p>'},
        {'q': 'Why do I have to hold keys down before they type?', 'a': '<p>That&rsquo;s Filter Keys, which ignores quick presses. Holding the right Shift key for eight seconds switches it on. Turn it off in Settings, Accessibility (Ease of Access on Windows 10), Keyboard.</p>'},
        {'q': 'Is it bad to leave Sticky Keys on?', 'a': '<p>No. It only changes how Shift, Ctrl, Alt and the Windows key behave. If it helps you, keep it on and just turn off the shortcut that switches it on and off.</p>'},
        {'q': 'Can you sort it for me?', 'a': '<p>Yes. With your permission we connect to your Windows PC and put it right while you watch, usually the same day. If a key is physically faulty, we can repair the keyboard.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/windows-accessibility-features-guide/">Windows accessibility features</a>, <a href="/computer-fault-checker/">the computer fault checker</a>, <a href="/computer-help-for-seniors/">computer help for seniors</a> and <a href="/computer-repairs/">computer repairs</a>.</p>',
}

ACCESS_PAGES = [STICKY]

# the fix-it-with-me flow (build_extra.FIX_FLOW_PAGES): it picks the page's best step list itself
ACCESS_FLOWS = {
    STICKY['slug']: {'h2': 'Turn Sticky Keys off, step by step', 'ask': 'Are the keys behaving now?',
                     'tip': 'Type a sentence with a capital letter to be sure Shift works normally.',
                     'h3s': 'Still behaving strangely after every step? That is a remote job.'},
}
