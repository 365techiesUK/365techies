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
                 '<li><strong>Screen upside down or sideways:</strong> see <a href="/screen-upside-down-or-sideways/">how to rotate it back</a>.</li>'
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

# ============================================================ 2. Dyslexia-friendly fonts and settings (12 Oct 2026, "do everything")
# Bing: "dyslexia font" 4,600 a quarter (UK 620), "open dyslexic font" 1,800, "dyslexic font" 1,600, "dyslexia friendly
# fonts" 894. Advice from the British Dyslexia Association's Dyslexia Style Guide 2023 (cdn.bdadyslexia.org.uk, read 12 Oct
# 2026): sans serif (Arial, Comic Sans; also Verdana, Tahoma, Century Gothic, Trebuchet, Calibri, Open Sans), 12-14 pt
# (16-19 px) or larger, bold not underline or italics, cream or a soft pastel rather than white, dark text, left aligned and
# not justified. Edge: F9 opens Immersive Reader (Text size, Text spacing, Text column style, Page themes; Line focus 1/3/5;
# Picture dictionary; Translate; Read Aloud) - Microsoft Support, read 12 Oct 2026.
_BDA = '<a href="https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/BDA-Style-Guide-2023.pdf" rel="noopener" target="_blank">British Dyslexia Association&rsquo;s style guide</a>'
_DYS = ('<div class="dys" id="dys">'
        '<div class="dys__ctl">'
        '<label>Font <select id="dys-font">'
        '<option value="Arial,Helvetica,sans-serif">Arial</option><option value="Verdana,Geneva,sans-serif">Verdana</option>'
        '<option value="\'Comic Sans MS\',\'Comic Sans\',cursive">Comic Sans</option><option value="Tahoma,Geneva,sans-serif">Tahoma</option>'
        '<option value="\'Century Gothic\',\'Apple Gothic\',sans-serif">Century Gothic</option><option value="\'Trebuchet MS\',sans-serif">Trebuchet</option>'
        '<option value="Calibri,Carlito,sans-serif">Calibri</option><option value="Georgia,\'Times New Roman\',serif">Georgia (a serif font, to compare)</option>'
        '</select></label>'
        '<label>Size <input type="range" id="dys-size" min="14" max="32" step="1" value="19"><output id="dys-size-o">19 px</output></label>'
        '<label>Line spacing <input type="range" id="dys-lh" min="1.2" max="2.4" step="0.1" value="1.6"><output id="dys-lh-o">1.6</output></label>'
        '<label>Letter spacing <input type="range" id="dys-ls" min="0" max="0.2" step="0.01" value="0.03"><output id="dys-ls-o">a little</output></label>'
        '<label>Word spacing <input type="range" id="dys-ws" min="0" max="0.5" step="0.05" value="0.1"><output id="dys-ws-o">a little</output></label>'
        '</div>'
        '<fieldset class="dys__bg"><legend>Background</legend>'
        '<label><input type="radio" name="dys-bg" value="#fbf5e6" checked><i style="background:#fbf5e6"></i>Cream</label>'
        '<label><input type="radio" name="dys-bg" value="#fffbd1"><i style="background:#fffbd1"></i>Pale yellow</label>'
        '<label><input type="radio" name="dys-bg" value="#e3f0fb"><i style="background:#e3f0fb"></i>Pale blue</label>'
        '<label><input type="radio" name="dys-bg" value="#e6f5e3"><i style="background:#e6f5e3"></i>Pale green</label>'
        '<label><input type="radio" name="dys-bg" value="#fde9dd"><i style="background:#fde9dd"></i>Peach</label>'
        '<label><input type="radio" name="dys-bg" value="#ffffff"><i style="background:#fff"></i>White</label>'
        '<label><input type="radio" name="dys-bg" value="#1e1e1e"><i style="background:#1e1e1e"></i>Dark</label>'
        '</fieldset>'
        '<textarea id="dys-text" class="dys__text" spellcheck="false" aria-label="Text to read: type or paste your own">'
        'Reading should feel comfortable. Try a few fonts, then make the text bigger, add a little space between the lines, and pick a background colour. '
        'When this paragraph is easy to read, write down what you chose, and set the same things on your computer using the steps below. '
        'You can paste your own text in here too: a letter, an email or a page from a website.</textarea>'
        '<p class="dys__sum" id="dys-sum" aria-live="polite"></p>'
        '<p class="dys__note">A font that isn&rsquo;t on your device shows in a similar one. Nothing you type is sent anywhere; your choices are remembered on this device only.</p>'
        '</div>'
        '<style>'
        '.dys{margin:1rem 0 0;padding:1.2rem 1.25rem;border-radius:18px;border:1px solid rgba(29,151,227,.42);background:linear-gradient(135deg,rgba(29,151,227,.10),rgba(255,255,255,.02))}'
        '.dys__ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr));gap:.8rem 1rem}'
        '.dys__ctl label{display:flex;flex-direction:column;gap:.35rem;font-size:.86rem;color:var(--muted)}'
        '.dys__ctl select{min-height:46px;padding:.5rem .6rem;border-radius:10px;border:1px solid rgba(125,170,220,.35);background:rgba(0,0,0,.3);color:var(--ink,#eaf4ff);font:inherit;font-size:1rem}'
        '.dys__ctl input[type=range]{accent-color:#4fd8c4;width:100%}.dys__ctl output{color:var(--ink,#eaf4ff);font-size:.9rem}'
        '.dys__bg{margin:1rem 0 0;padding:0;border:0;min-width:0;display:flex;flex-wrap:wrap;gap:.45rem}'
        '.dys__bg legend{float:left;width:100%;margin:0 0 .45rem;padding:0;font-size:.86rem;color:var(--muted)}'
        '.dys__bg label{display:inline-flex;align-items:center;gap:.45rem;min-height:44px;padding:.4rem .8rem;border-radius:999px;border:1px solid rgba(125,170,220,.35);background:rgba(0,0,0,.25);font-size:.92rem;cursor:pointer}'
        '.dys__bg input{position:absolute;opacity:0;width:1px;height:1px}.dys__bg i{width:18px;height:18px;border-radius:50%;border:1px solid rgba(0,0,0,.35)}'
        '.dys__bg label:has(input:checked){border-color:#4fd8c4;background:rgba(79,216,196,.18)}.dys__bg label:has(input:focus-visible){outline:2px solid #4fd8c4}'
        '.dys__text{display:block;width:100%;box-sizing:border-box;margin:1rem 0 0;min-height:16rem;padding:1.1rem 1.2rem;border-radius:14px;border:1px solid rgba(125,170,220,.35);'
        'background:#fbf5e6;color:#1f1f1f;font-family:Arial,Helvetica,sans-serif;font-size:19px;line-height:1.6;text-align:left;resize:vertical}'
        '.dys__sum{margin:.8rem 0 0;font-size:.92rem}.dys__note{margin:.5rem 0 0;font-size:.8rem;color:var(--muted)}'
        '@media (max-width:520px){.dys{padding:1rem .8rem}}'
        '</style>'
        '<script>(function(){var T=document.getElementById("dys-text");if(!T)return;function $(i){return document.getElementById(i);}'
        'var o={font:"Verdana,Geneva,sans-serif",size:19,lh:1.6,ls:.03,ws:.1,bg:"#fbf5e6"};try{var s=JSON.parse(localStorage.getItem("dys1")||"null");if(s)for(var k in o)if(s.hasOwnProperty(k))o[k]=s[k];}catch(e){}'
        'function amt(v,a,b){return v<=0?"none":v<a?"a little":v<b?"more":"a lot";}'
        'function apply(){T.style.fontFamily=o.font;T.style.fontSize=o.size+"px";T.style.lineHeight=o.lh;T.style.letterSpacing=o.ls+"em";T.style.wordSpacing=o.ws+"em";'
        'T.style.background=o.bg;T.style.color=o.bg==="#1e1e1e"?"#f2f2f2":"#1f1f1f";'
        '$("dys-size-o").textContent=o.size+" px";$("dys-lh-o").textContent=(+o.lh).toFixed(1);$("dys-ls-o").textContent=amt(o.ls,.05,.12);$("dys-ws-o").textContent=amt(o.ws,.15,.3);'
        'var f=$("dys-font"),bgn="";for(var i=0;i<f.options.length;i++)if(f.options[i].value===o.font)f.selectedIndex=i;'
        'var r=document.getElementsByName("dys-bg");for(var j=0;j<r.length;j++){r[j].checked=r[j].value===o.bg;if(r[j].checked)bgn=r[j].parentNode.textContent;}'
        '$("dys-sum").textContent="Your choice: "+f.options[f.selectedIndex].text.replace(/ \\(.*\\)/,"")+", "+o.size+" px (about "+Math.round(o.size*.75)+" point), line spacing "+(+o.lh).toFixed(1)+", "+bgn.toLowerCase()+" background.";'
        'try{localStorage.setItem("dys1",JSON.stringify(o));}catch(e){}}'
        '$("dys-font").addEventListener("change",function(){o.font=this.value;apply();});'
        '[["dys-size","size"],["dys-lh","lh"],["dys-ls","ls"],["dys-ws","ws"]].forEach(function(p){var el=$(p[0]);el.value=o[p[1]];el.addEventListener("input",function(){o[p[1]]=+el.value;apply();});});'
        'var r=document.getElementsByName("dys-bg");for(var i=0;i<r.length;i++)r[i].addEventListener("change",function(){if(this.checked){o.bg=this.value;apply();}});'
        'apply();})();</script>')

DYSLEXIA = {
    'slug': 'dyslexia-friendly-computer-settings',
    'title': 'Dyslexia Fonts and Settings: Make Your PC Easier to Read',
    'metaDesc': 'The fonts, colours and spacing the British Dyslexia Association recommends, how to set them on a Windows PC, and a free reading box to try them out.',
    'ogTitle': 'Dyslexia-friendly fonts and settings for your computer',
    'crumbName': 'Dyslexia-Friendly Settings',
    'eyebrow': '// DYSLEXIA-FRIENDLY COMPUTER SETTINGS',
    'h1': 'Dyslexia-friendly <em class="grad grad--cyan">fonts and settings</em>',
    'lede': 'Try fonts, sizes, spacing and background colours in the reading box until text feels easier, then set the same things on your Windows PC, along with read aloud, Immersive Reader and voice typing. Everything here is free and already on your computer.',
    'chips': ['Try it before you change anything', 'British Dyslexia Association advice', 'Free, built into Windows'],
    'primaryCta': ['Try the reading box', '#s1'], 'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
    'ctaHead': 'Want it all set up for you?',
    'ctaSub': 'We can set up a Windows PC so reading and writing are easier, from fonts and colours to read aloud and voice typing. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('Fonts', 'Plain, sans serif fonts such as Arial, Verdana, Calibri or Comic Sans, as the British Dyslexia Association suggests.'),
        ('Size', '12 to 14 point (about 16 to 19 pixels on screen) or bigger.'),
        ('Background', 'Cream or a soft pastel rather than bright white; everyone&rsquo;s best colour is different.'),
        ('Emphasis', 'Bold rather than underline or italics, and text lined up on the left.'),
        ('Have it read to you', 'Microsoft Edge&rsquo;s Read aloud (Ctrl + Shift + U) and Immersive Reader (F9).'),
        ('Write by speaking', 'Voice typing: Windows + H.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; TRY IT', 'h2': 'Find the settings that suit you',
         'html': '<p>Change the font, size, spacing and background below until the paragraph is comfortable to read. Paste in your own text if you like. When it feels right, note down what you chose, shown under the box.</p>' + _DYS},
        {'eyebrow': '/02 &mdash; WHAT HELPS', 'h2': 'What the British Dyslexia Association recommends',
         'html': f'<p>The {_BDA} suggests:</p>'
                 '<ul>'
                 '<li><strong>Sans serif fonts,</strong> such as Arial and Comic Sans, or Verdana, Tahoma, Century Gothic, Trebuchet, Calibri and Open Sans: the letters look less crowded.</li>'
                 '<li><strong>12 to 14 point</strong> (16 to 19 pixels on screen), or bigger if you prefer.</li>'
                 '<li><strong>Bold for emphasis,</strong> not underlining or italics, which can make words run together.</li>'
                 '<li><strong>Cream or a soft pastel background</strong> rather than white, which can look too dazzling, with dark text.</li>'
                 '<li><strong>Text lined up on the left,</strong> not spread out to both edges.</li>'
                 '</ul>'
                 '<p>Everyone is different, which is why the box above lets you try. Special dyslexia fonts such as OpenDyslexic are free to download, and some people like them; the style guide recommends ordinary sans serif fonts, so try both and keep what works.</p>'},
        {'eyebrow': '/03 &mdash; SET IT UP ON WINDOWS', 'h2': 'Set it up on your Windows PC',
         'html': '<ul>'
                 '<li><strong>Bigger text everywhere:</strong> Settings, Accessibility, Text size. Drag the slider and press Apply.</li>'
                 '<li><strong>Web pages your way, in Microsoft Edge:</strong> press <em>F9</em> (or the book icon in the address bar) for Immersive Reader. Its <strong>Text preferences</strong> change the text size, spacing and page colour, <strong>Line focus</strong> shows one, three or five lines at a time, and <strong>Picture dictionary</strong> shows a picture of a word.</li>'
                 '<li><strong>Have it read to you:</strong> in Edge, press <em>Ctrl</em> + <em>Shift</em> + <em>U</em> to read the page aloud. In Word, use <strong>Read Aloud</strong> on the Review tab.</li>'
                 '<li><strong>Word documents your way:</strong> on the <strong>View</strong> tab, <strong>Immersive Reader</strong> changes the column width, page colour, line focus and text spacing, and can split words into syllables.</li>'
                 '<li><strong>Your favourite font in every new Word document:</strong> on the Home tab, click the small arrow in the Font group, choose the font and size, then <strong>Set As Default</strong> and <strong>All documents</strong>.</li>'
                 '<li><strong>Write by speaking:</strong> press <em>Windows</em> + <em>H</em> and talk; your words appear as text.</li>'
                 '<li><strong>Spelling help:</strong> Settings, Time &amp; language, Typing: switch on <strong>Autocorrect misspelled words</strong> and <strong>Highlight misspelled words</strong>.</li>'
                 '<li><strong>Find where you&rsquo;re typing:</strong> Settings, Accessibility, Text cursor makes the cursor thicker and easier to see.</li>'
                 '</ul>'
                 '<p>More built-in help is in our <a href="/windows-accessibility-features-guide/">Windows accessibility guide</a>.</p>'},
        {'eyebrow': '/04 &mdash; PHONES AND TABLETS', 'h2': 'On an Android phone or tablet',
         'html': '<p>Settings, Accessibility has <strong>Font size</strong> and <strong>Display size</strong>, and <strong>Select to Speak</strong>, which reads out whatever you tap. Google&rsquo;s free <strong>Reading mode</strong> app shows articles in your choice of font, size and colour, and can read them aloud. Menus vary a little between makes of phone.</p>'},
        {'eyebrow': '/05 &mdash; WANT A HAND?', 'h2': 'We can set it up for you',
         'html': '<p>We can set all of this up on a Windows PC, remotely while you watch, and show you how to use it. Ring <strong>01202 775566</strong> or text 07520 615332, Monday to Friday, 9 to 5. See also our <a href="/it-support-for-disabled-people/">accessible IT support</a>.</p>'},
    ],
    'howToName': 'How to make a Windows PC easier to read with dyslexia',
    'howToSteps': [
        {'name': 'Find your settings', 'text': 'Try fonts, sizes, spacing and background colours until text is comfortable, and note them down.'},
        {'name': 'Make text bigger', 'text': 'Settings, Accessibility, Text size: drag the slider and press Apply.'},
        {'name': 'Use Immersive Reader', 'text': 'In Microsoft Edge press F9 for Immersive Reader, and set the text size, spacing and page colour.'},
        {'name': 'Have text read aloud', 'text': 'In Edge press Ctrl, Shift and U; in Word use Read Aloud on the Review tab.'},
        {'name': 'Write by speaking', 'text': 'Press Windows and H together and talk; your words appear as text.'},
    ],
    'faqs': [
        {'q': 'What font is best for dyslexia?', 'a': '<p>The British Dyslexia Association suggests plain sans serif fonts such as Arial, Verdana, Calibri, Tahoma, Century Gothic, Trebuchet or Comic Sans. Everyone is different, so try a few in the reading box on this page.</p>'},
        {'q': 'Is OpenDyslexic better?', 'a': '<p>Some people find it helps and it&rsquo;s free to download. The British Dyslexia Association&rsquo;s style guide recommends ordinary sans serif fonts, so try both and keep what works for you.</p>'},
        {'q': 'What background colour is best for dyslexia?', 'a': '<p>Cream or a soft pastel rather than bright white is the usual advice, with dark text. The best colour is personal, so try them in the reading box.</p>'},
        {'q': 'How do I get my computer to read text aloud?', 'a': '<p>In Microsoft Edge, press Ctrl, Shift and U to read a web page aloud. In Word, use Read Aloud on the Review tab. Narrator (Windows, Ctrl and Enter) reads everything on the screen.</p>'},
        {'q': 'How do I change the default font in Word?', 'a': '<p>On the Home tab, click the small arrow in the Font group, choose the font and size, then click Set As Default and choose All documents.</p>'},
        {'q': 'Can you set this up for me?', 'a': '<p>Yes. With your permission we connect to your Windows PC, set it all up while you watch, and show you how to use it.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/windows-accessibility-features-guide/">Windows accessibility features</a>, <a href="/assistive-technology-at-home/">assistive technology at home</a>, <a href="/visual-timer/">visual timer</a> and <a href="/it-support-for-disabled-people/">accessible IT support</a>.</p>',
}

# ============================================================ 3. Assistive technology at home (12 Oct 2026, "do everything")
# Bing: "assistive technology" 3,900 a quarter, UK 749 (about a fifth); "what is assistive technology" 563. Facts checked
# 12 Oct 2026: AbilityNet free IT support for older and disabled people, 0300 180 0028, volunteers by phone or at home
# (abilitynet.org.uk); VAT: equipment designed solely for disabled people can be zero-rated for an eligible disabled person's
# personal use; ordinary laptops / tablets / phones only as part of an assistive technology system with specialist software
# pre-installed (GOV.UK VAT Notice 701/7, HMRC VRDP16000); Access to Work (GOV.UK) helps with support at work.
ASSISTIVE = {
    'slug': 'assistive-technology-at-home',
    'title': 'Assistive Technology at Home: What&rsquo;s Free on Your PC',
    'metaDesc': 'Assistive technology that is already free on Windows PCs and Android phones, the gadgets worth buying, free help from AbilityNet, and VAT relief.',
    'ogTitle': 'Assistive technology at home: what is free, and what to buy',
    'crumbName': 'Assistive Technology at Home',
    'eyebrow': '// ASSISTIVE TECHNOLOGY AT HOME',
    'h1': 'Assistive technology at home: <em class="grad grad--cyan">what&rsquo;s already free</em>',
    'lede': 'Much of the technology that helps people see, hear, type, read and remember is already built into your Windows computer or Android phone, free. Here&rsquo;s what&rsquo;s there, the gadgets worth buying, where to get free advice, and how VAT relief works.',
    'chips': ['Free on Windows and Android', 'Gadgets worth buying', 'Free advice and VAT relief'],
    'primaryCta': ['What&rsquo;s free on Windows', '#s2'], 'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
    'ctaHead': 'Want it set up for you or a relative?',
    'ctaSub': 'We set up Windows PCs and Android phones so they&rsquo;re easier to use, patiently and at your pace. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it is', 'Anything that helps you keep doing things for yourself: from glasses and hearing aids to settings, apps and gadgets.'),
        ('Free on Windows', 'Bigger text, Magnifier, Narrator, live captions, voice typing, read aloud, Sticky Keys and more.'),
        ('Free on Android', 'TalkBack, Select to Speak, Magnification, Live Transcribe, Sound Amplifier and Voice Access.'),
        ('Worth buying', 'A big-key keyboard, a trackball mouse, a headset for voice typing, a bigger screen.'),
        ('Free advice', 'AbilityNet&rsquo;s free IT help for older and disabled people: 0300 180 0028.'),
        ('VAT relief', 'Equipment designed for disabled people can be VAT-free for eligible people; ordinary laptops usually don&rsquo;t qualify.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; WHAT IT IS', 'h2': 'What counts as assistive technology',
         'html': '<p>Assistive technology is anything that helps someone keep doing things for themselves despite a disability, an illness or getting older. The <a href="https://www.who.int/news-room/fact-sheets/detail/assistive-technology" rel="noopener" target="_blank">World Health Organization</a> counts everything from glasses and hearing aids to wheelchairs and software.</p>'
                 '<p>On a computer or phone it means the settings, apps and gadgets that make it easier to see the screen, hear sound, type, use the mouse, read, or remember things. A lot of it is already there, free.</p>'},
        {'eyebrow': '/02 &mdash; FREE ON WINDOWS', 'h2': 'Free on your Windows computer',
         'html': '<div class="price-table-wrap" tabindex="0" role="group" aria-label="Free Windows features (scrolls sideways on a small screen)"><table class="price-table price-table--facts"><thead><tr><th scope="col">If you find it hard to&hellip;</th><th scope="col">Try (free, built in)</th></tr></thead><tbody>'
                 '<tr><th scope="row">See the screen</th><td>Bigger text, a bigger mouse pointer, Magnifier (<em>Windows</em> + <em>plus</em>), high contrast, and Narrator to read the screen aloud.</td></tr>'
                 '<tr><th scope="row">Hear</th><td>Live captions for videos and calls, and mono audio for one-ear listening.</td></tr>'
                 '<tr><th scope="row">Type</th><td>Voice typing (<em>Windows</em> + <em>H</em>), and Sticky Keys to press shortcuts one key at a time.</td></tr>'
                 '<tr><th scope="row">Use the mouse</th><td>Voice access on Windows 11, and Mouse keys, which move the pointer with the number keys.</td></tr>'
                 '<tr><th scope="row">Read</th><td>Read aloud and Immersive Reader in Microsoft Edge, and Read Aloud in Word.</td></tr>'
                 '<tr><th scope="row">Remember the day or time</th><td>Our free <a href="/dementia-clock/">day and date clock</a> and <a href="/visual-timer/">visual timer</a>, and alarms on the computer.</td></tr>'
                 '</tbody></table></div>'
                 '<p>Step-by-step instructions are in our <a href="/windows-accessibility-features-guide/">Windows accessibility guide</a>, with <a href="/dyslexia-friendly-computer-settings/">dyslexia-friendly settings</a> and <a href="/how-to-turn-off-sticky-keys/">how to turn off Sticky Keys</a> if one comes on by accident. For a free screen reader with more features than Narrator, many people use NVDA.</p>'},
        {'eyebrow': '/03 &mdash; FREE ON ANDROID', 'h2': 'Free on Android phones and tablets',
         'html': '<p>In Settings, then Accessibility (menus vary a little between makes):</p>'
                 '<ul>'
                 '<li><strong>TalkBack</strong> reads out everything on the screen; <strong>Select to Speak</strong> reads just what you tap.</li>'
                 '<li><strong>Magnification</strong>, plus <strong>Font size</strong> and <strong>Display size</strong> to make everything bigger.</li>'
                 '<li><strong>Live Transcribe</strong> turns speech around you into text, and <strong>Live Caption</strong> captions videos and calls.</li>'
                 '<li><strong>Sound Amplifier</strong> makes speech clearer through headphones.</li>'
                 '<li><strong>Voice Access</strong> controls the phone by voice.</li>'
                 '</ul>'},
        {'eyebrow': '/04 &mdash; WORTH BUYING', 'h2': 'Gadgets worth buying',
         'html': '<ul>'
                 '<li><strong>A big-key or high-contrast keyboard,</strong> with large, bold letters that are easier to see.</li>'
                 '<li><strong>A trackball or a bigger mouse,</strong> which some people with arthritis or a tremor find easier than a normal mouse or a touchpad.</li>'
                 '<li><strong>A headset with a microphone,</strong> for clearer voice typing and video calls.</li>'
                 '<li><strong>A bigger screen or a monitor stand,</strong> so text is larger and at a comfortable height.</li>'
                 '<li><strong>Good speakers or a soundbar,</strong> for clearer speech than tiny laptop speakers.</li>'
                 '</ul>'
                 '<p>Try before you buy where you can: what suits one person can be awkward for another.</p>'},
        {'eyebrow': '/05 &mdash; FREE ADVICE AND VAT', 'h2': 'Free advice, VAT relief and help at work',
         'html': '<ul>'
                 '<li><strong>AbilityNet</strong> gives free IT help to older and disabled people, by phone or with a volunteer who can visit: call <strong>0300 180 0028</strong> or see <a href="https://abilitynet.org.uk/" rel="noopener" target="_blank">abilitynet.org.uk</a>.</li>'
                 '<li><strong>VAT relief:</strong> equipment designed solely for disabled people can be bought without VAT by an eligible disabled person for their own use. Ordinary laptops, tablets and phones only qualify as part of an assistive technology system with specialist software already installed. GOV.UK explains who qualifies in <a href="https://www.gov.uk/guidance/reliefs-from-vat-for-disabled-and-older-people-notice-7017" rel="noopener" target="_blank">VAT Notice 701/7</a>.</li>'
                 '<li><strong>At work:</strong> <a href="https://www.gov.uk/access-to-work" rel="noopener" target="_blank">Access to Work</a> can help pay for equipment and support you need to do your job.</li>'
                 '</ul>'},
        {'eyebrow': '/06 &mdash; WE CAN SET IT UP', 'h2': 'We can set it up for you',
         'html': '<p>We set up Windows PCs and Android devices so they&rsquo;re easier to use: bigger text, the right settings, voice typing and read aloud, and the gadgets plugged in and working. Remotely while you watch, or in person locally, priced before we come. Ring <strong>01202 775566</strong> or text 07520 615332, or see our <a href="/it-support-for-disabled-people/">accessible IT support</a>.</p>'},
    ],
    'howToName': 'How to find assistive technology that is already on your computer',
    'howToSteps': [
        {'name': 'Open Accessibility settings', 'text': 'On Windows, press the Windows key and U together. On Android, open Settings, then Accessibility.'},
        {'name': 'Make things easier to see', 'text': 'Try bigger text, a bigger pointer, Magnifier and high contrast.'},
        {'name': 'Make things easier to hear', 'text': 'Switch on live captions or mono audio.'},
        {'name': 'Type and read differently', 'text': 'Use voice typing (Windows and H) and read aloud in Microsoft Edge.'},
        {'name': 'Get free advice', 'text': 'AbilityNet gives free IT help to older and disabled people on 0300 180 0028.'},
    ],
    'faqs': [
        {'q': 'What counts as assistive technology?', 'a': '<p>Anything that helps someone keep doing things for themselves: glasses and hearing aids, but also computer settings, apps and gadgets such as voice typing, a screen reader or a big-key keyboard.</p>'},
        {'q': 'Is assistive technology free?', 'a': '<p>A lot of it is: Windows and Android include bigger text, magnifiers, screen readers, captions and voice typing at no cost. Specialist software and gadgets cost extra.</p>'},
        {'q': 'Can I buy a computer without VAT if I&rsquo;m disabled?', 'a': '<p>Usually not an ordinary computer on its own. It can qualify as part of an assistive technology system with specialist software already installed, bought by an eligible disabled person for their own use. GOV.UK&rsquo;s VAT Notice 701/7 explains the rules.</p>'},
        {'q': 'Does Windows have a free screen reader?', 'a': '<p>Yes: Narrator, built in (Windows, Ctrl and Enter). NVDA is a popular free screen reader with more features.</p>'},
        {'q': 'Who can help me choose?', 'a': '<p>AbilityNet gives free advice to older and disabled people on 0300 180 0028. We can set up whatever you choose on a Windows PC or Android device.</p>'},
        {'q': 'Do you set up Apple devices?', 'a': '<p>No. We&rsquo;re Windows and Android specialists, so we set up Windows PCs and Android phones and tablets, and we&rsquo;ll say so honestly up front.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/windows-accessibility-features-guide/">Windows accessibility features</a>, <a href="/dyslexia-friendly-computer-settings/">dyslexia-friendly settings</a>, <a href="/how-to-turn-off-sticky-keys/">turn off Sticky Keys</a>, <a href="/dementia-clock/">day and date clock</a> and <a href="/it-support-for-disabled-people/">accessible IT support</a>.</p>',
}

ACCESS_PAGES = [STICKY, DYSLEXIA, ASSISTIVE]

# the fix-it-with-me flow (build_extra.FIX_FLOW_PAGES): it picks the page's best step list itself
ACCESS_FLOWS = {
    STICKY['slug']: {'h2': 'Turn Sticky Keys off, step by step', 'ask': 'Are the keys behaving now?',
                     'tip': 'Type a sentence with a capital letter to be sure Shift works normally.',
                     'h3s': 'Still behaving strangely after every step? That is a remote job.'},
}
