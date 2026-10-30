# -*- coding: utf-8 -*-
"""Free in-browser test tools, each a page built by build_extra.build_new_page (tool first, then the fixes).

Owner, 12 Oct 2026: "go ahead with the keyboard test page", after the Bing keyword research
(D:/claude/seo-research/pages-to-build-2026-10-12.md): "keyboard test" 318,200 Bing searches in 3 months (UK 4,200),
"mouse test" 26,800 (UK 332). A tool that leads to repairs: "some keys don't work" becomes a laptop keyboard job.

The keyboard test reads KeyboardEvent.code (the physical key, whatever the layout) on a UK (ISO) keyboard picture. It keeps
nothing you type: only which keys have worked, in memory, until the page closes. What browsers can't see is said on the page:
Fn never reaches the computer; Windows opens Start on the Windows key and (Windows 11) the Snipping Tool on Print Screen, so
those may only light on release; laptop F keys often send volume/brightness instead (shown under "Other keys"); Alt Gr arrives
as Ctrl + Alt; Ctrl + W / Alt + F4 are taken by the browser or Windows before any page sees them.
The mouse box: buttons 0-4 (left, wheel, right, back, forward), wheel up/down, a double-click target, and a "bounce" note when
one button registers two presses under 70 ms apart (a worn switch's double-click).
"""

_CALL = ('<p>Still not right? Ring <strong>01202 775566</strong> or text 07520 615332, Monday to Friday, 9 to 5. With your '
         'permission we connect to your Windows PC and sort software problems while you watch: usually the same day, remote help '
         'from &pound;20, and no fix, no fee. If it&rsquo;s the keyboard itself, we collect the laptop free across Bournemouth, '
         'Christchurch, Poole and Dorset, tell you the price before any work, repair it and bring it back.</p>')

# ---------------------------------------------------------------- the tool
_KBT = ('<div class="kbt" id="kbt">'
        '<div class="kbt__top">'
        '<p class="kbt__now" aria-live="polite"><span class="kbt__lab">Last key</span><b id="kbt-key">&ndash;</b><span id="kbt-code" class="kbt__code"></span></p>'
        '<p class="kbt__count"><b id="kbt-n">0</b> of <span id="kbt-of">0</span> keys have worked</p>'
        '</div>'
        '<div class="kbt__wrap" id="kbt-wrap"><div class="kbt__pad" id="kbt-pad" tabindex="0" role="application" aria-label="Keyboard test. Press each key on your keyboard.">'
        '<div class="kbt__board" id="kbt-board"></div>'
        '<div class="kbt__start" id="kbt-start"><span>Click here, then press each key</span></div>'
        '</div></div>'
        '<p class="kbt__msg" id="kbt-msg" role="status"></p>'
        '<div class="kbt__other" id="kbt-otherwrap" hidden><span class="kbt__lab">Other keys</span><span id="kbt-other"></span></div>'
        '<div class="kbt__bar">'
        '<span class="kbt__legend"><span><i class="k0"></i>Not pressed yet</span><span><i class="k1"></i>Worked</span><span><i class="k2"></i>Pressed now</span><span><i class="k3"></i>Held down</span></span>'
        '<label class="kbt__np"><input type="checkbox" id="kbt-np" checked> Number pad</label>'
        '<button type="button" class="kbt__btn" id="kbt-reset">Start again</button>'
        '</div>'
        '<h3 class="kbt__h3">Mouse test</h3>'
        '<div class="kbt__mouse" id="kbt-mouse" aria-label="Mouse test area">'
        '<p class="kbt__mhint">Click, right-click, roll the wheel and press any side buttons in this box.</p>'
        '<div class="kbt__chips">'
        '<span class="kbt__chip" data-m="0">Left button</span><span class="kbt__chip" data-m="1">Wheel click</span>'
        '<span class="kbt__chip" data-m="2">Right button</span><span class="kbt__chip" data-m="up">Wheel up</span>'
        '<span class="kbt__chip" data-m="down">Wheel down</span><span class="kbt__chip" data-m="3">Back side button</span>'
        '<span class="kbt__chip" data-m="4">Forward side button</span><span class="kbt__chip kbt__dbl" data-m="dbl">Double-click here</span>'
        '</div>'
        '<p class="kbt__msg" id="kbt-mmsg" role="status"></p>'
        '</div>'
        '<p class="kbt__note">Nothing you type is kept or sent anywhere: the page only notes which keys worked, until you close it. '
        'To stop testing, click outside the keyboard picture, or press Esc three times.</p>'
        '</div>'
        '<style>'
        '.kbt{margin:1rem 0 0;padding:1.2rem 1.25rem;border-radius:18px;border:1px solid rgba(29,151,227,.42);background:linear-gradient(135deg,rgba(29,151,227,.10),rgba(255,255,255,.02))}'
        '.kbt__top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:.6rem 1.2rem;margin:0 0 .8rem}'
        '.kbt__now{margin:0;display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap}.kbt__now b{font:700 1.7rem/1.1 var(--font-body);color:var(--ink,#eaf4ff)}'
        '.kbt__lab{font-size:.8rem;color:var(--muted)}.kbt__code{font:400 .8rem var(--font-mono);color:var(--muted)}'
        '.kbt__count{margin:0;font-size:.95rem;color:var(--muted)}.kbt__count b{font-size:1.3rem;color:#4fd8c4}'
        '.kbt__wrap{overflow-x:auto;padding:4px;margin:0 -4px}'
        '.kbt__pad{position:relative;border-radius:14px;outline:none;padding:10px;background:rgba(0,0,0,.35);border:2px solid rgba(125,170,220,.25);width:max-content;min-width:100%;box-sizing:border-box;cursor:pointer}'
        '.kbt__pad.is-on{border-color:#4fd8c4;box-shadow:0 0 0 3px rgba(79,216,196,.18);cursor:default}'
        '.kbt__board{position:relative;margin:0 auto}'
        '.kbt__board .k{position:absolute;display:flex;align-items:center;justify-content:center;text-align:center;box-sizing:border-box;border-radius:7px;'
        'border:1px solid rgba(125,170,220,.28);background:#0d1726;color:#c9d6e8;font-family:var(--font-body);font-weight:600;line-height:1.05;user-select:none;transition:background .12s,border-color .12s}'
        '.kbt__board .k.ok{background:rgba(79,216,196,.22);border-color:#4fd8c4;color:#eafffb}'
        '.kbt__board .k.dn{background:#4fd8c4;border-color:#4fd8c4;color:#04121a}'
        '.kbt__board .k.held{background:#ffb066;border-color:#ffb066;color:#1a0d00}'
        '.kbt__board .k.dead{border-style:dashed;color:rgba(201,214,232,.45);background:transparent}'
        '.kbt__start{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(3,8,20,.55)}'
        '.kbt__start span{padding:.7rem 1.2rem;border-radius:999px;background:#4fd8c4;color:#04121a;font-weight:700;font-size:1.05rem;box-shadow:0 10px 30px -10px rgba(0,0,0,.8)}'
        '.kbt__pad.is-on .kbt__start{display:none}'
        '.kbt__msg{margin:.7rem 0 0;font-size:.92rem;color:#ffb066;min-height:1.2em}.kbt__msg:empty{min-height:0;margin:0}'
        '.kbt__other{margin:.7rem 0 0;display:flex;flex-wrap:wrap;gap:.4rem;align-items:center}.kbt__other[hidden]{display:none}'
        '.kbt__other #kbt-other{display:contents}.kbt__other .kbt__chip{min-height:32px;font-size:.85rem}'
        '.kbt__bar{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem 1rem;margin:.9rem 0 0}'
        '.kbt__legend{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem .9rem;font-size:.82rem;color:var(--muted)}.kbt__legend>span{white-space:nowrap}'
        '.kbt__legend i{display:inline-block;width:14px;height:14px;border-radius:4px;border:1px solid rgba(125,170,220,.35);margin-right:.35rem;vertical-align:-2px}'
        '.kbt__legend i.k1{background:rgba(79,216,196,.35);border-color:#4fd8c4}.kbt__legend i.k2{background:#4fd8c4}.kbt__legend i.k3{background:#ffb066;border-color:#ffb066}'
        '.kbt__np{display:inline-flex;align-items:center;gap:.4rem;font-size:.9rem;margin-left:auto;cursor:pointer}.kbt__np input{width:18px;height:18px;accent-color:#4fd8c4}'
        '.kbt__btn{min-height:44px;padding:.45rem 1rem;border-radius:999px;border:1px solid rgba(125,170,220,.45);background:rgba(0,0,0,.25);color:inherit;font:600 .92rem var(--font-body);cursor:pointer}'
        '.kbt__h3{margin:1.4rem 0 .5rem;font-size:1.15rem}'
        '.kbt__mouse{padding:1rem;border-radius:14px;border:2px dashed rgba(125,170,220,.35);background:rgba(0,0,0,.25);user-select:none}'
        '.kbt__mhint{margin:0 0 .7rem;font-size:.92rem;color:var(--muted)}'
        '.kbt__chips{display:flex;flex-wrap:wrap;gap:.5rem}'
        '.kbt__chip{display:inline-flex;align-items:center;min-height:42px;padding:.35rem .9rem;border-radius:999px;border:1px solid rgba(125,170,220,.3);background:#0d1726;color:#c9d6e8;font-size:.92rem;font-weight:600}'
        '.kbt__chip.ok{background:rgba(79,216,196,.22);border-color:#4fd8c4;color:#eafffb}.kbt__chip.dn{background:#4fd8c4;border-color:#4fd8c4;color:#04121a}'
        '.kbt__dbl{border-style:dashed;cursor:pointer}'
        '.kbt__note{margin:1rem 0 0;font-size:.82rem;line-height:1.5;color:var(--muted)}'
        '@media (max-width:520px){.kbt{padding:1rem .8rem}.kbt__np{margin-left:0}}'
        # on a narrow screen the keyboard scrolls sideways, so keep the start label in the part you can see
        '@media (max-width:760px){.kbt__start{justify-content:flex-start;padding-left:12px}.kbt__start span{max-width:calc(100vw - 90px);white-space:normal;font-size:.95rem}}'
        '@media (prefers-reduced-motion:reduce){.kbt__board .k{transition:none}}'
        '</style>'
        '<script>(function(){var pad=document.getElementById("kbt-pad"),board=document.getElementById("kbt-board"),wrap=document.getElementById("kbt-wrap");if(!pad||!board)return;'
        'function $(i){return document.getElementById(i);}'
        # the UK (ISO) keyboard: [code, label, x, y, w, h] in key widths; main block 0-15, arrows and friends 15.5-18.5, number pad 19-23
        'var K=[],NP={};'
        'function row(y,x,l,np){for(var i=0;i<l.length;i++){var k=l[i];if(k[0]==="_"){x+=k[1];continue;}K.push([k[0],k[1],x,y,k[2]||1,k[3]||1,np]);if(np)NP[k[0]]=1;x+=k[2]||1;}}'
        'function ch(s,p){var o=[];for(var i=0;i<s.length;i++)o.push([p+s.charAt(i),s.charAt(i)]);return o;}'
        'var F=[];for(var f=1;f<=12;f++){F.push(["F"+f,"F"+f]);if(f===4||f===8)F.push(["_",.5]);}'
        'row(0,0,[["Escape","Esc"],["_",1]].concat(F));'
        'row(1.25,0,[["Backquote","`"]].concat(ch("1234567890","Digit"),[["Minus","-"],["Equal","="],["Backspace","Backspace",2]]));'
        'row(2.25,0,[["Tab","Tab",1.5]].concat(ch("QWERTYUIOP","Key"),[["BracketLeft","["],["BracketRight","]"],["Enter","Enter",1.5]]));'
        'row(3.25,0,[["CapsLock","Caps Lock",1.75]].concat(ch("ASDFGHJKL","Key"),[["Semicolon",";"],["Quote","\'"],["Backslash","#"],["Enter","",1.25]]));'
        'row(4.25,0,[["ShiftLeft","Shift",1.25],["IntlBackslash","\\\\"]].concat(ch("ZXCVBNM","Key"),[["Comma",","],["Period","."],["Slash","/"],["ShiftRight","Shift",2.75]]));'
        'row(5.25,0,[["ControlLeft","Ctrl",1.25],["MetaLeft","Win",1.25],["AltLeft","Alt",1.25],["Space","Space",6.25],["AltRight","Alt Gr",1.25],["*Fn","Fn",1.25],["ContextMenu","Menu",1.25],["ControlRight","Ctrl",1.25]]);'
        'row(0,15.5,[["PrintScreen","PrtSc"],["ScrollLock","ScrLk"],["Pause","Pause"]]);'
        'row(1.25,15.5,[["Insert","Ins"],["Home","Home"],["PageUp","PgUp"]]);row(2.25,15.5,[["Delete","Del"],["End","End"],["PageDown","PgDn"]]);'
        'row(4.25,15.5,[["_",1],["ArrowUp","\\u2191"]]);row(5.25,15.5,[["ArrowLeft","\\u2190"],["ArrowDown","\\u2193"],["ArrowRight","\\u2192"]]);'
        'row(1.25,19,[["NumLock","Num"],["NumpadDivide","/"],["NumpadMultiply","*"],["NumpadSubtract","-"]],1);'
        'row(2.25,19,[["Numpad7","7"],["Numpad8","8"],["Numpad9","9"],["NumpadAdd","+",1,2]],1);row(3.25,19,[["Numpad4","4"],["Numpad5","5"],["Numpad6","6"]],1);'
        'row(4.25,19,[["Numpad1","1"],["Numpad2","2"],["Numpad3","3"],["NumpadEnter","Enter",1,2]],1);row(5.25,19,[["Numpad0","0",2],["NumpadDecimal","."]],1);'
        # friendly names for keys the picture doesn't have (media keys and the like)
        'var NM={AudioVolumeUp:"Volume up",AudioVolumeDown:"Volume down",AudioVolumeMute:"Mute",MediaPlayPause:"Play / pause",MediaTrackNext:"Next track",MediaTrackPrevious:"Previous track",MediaStop:"Stop",'
        'BrowserBack:"Back",BrowserForward:"Forward",BrowserHome:"Home page",BrowserSearch:"Search",BrowserRefresh:"Refresh",BrowserFavorites:"Favourites",LaunchMail:"Mail",LaunchApp1:"My computer",LaunchApp2:"Calculator",'
        'Power:"Power",Sleep:"Sleep",WakeUp:"Wake",MetaRight:"Right Win",Fn:"Fn",IntlRo:"Ro",IntlYen:"Yen"};'
        'var el={},lab={},ok={},dn={},since={},other={},np=window.innerWidth>=1000,act=false,escs=[];'
        'var npBox=$("kbt-np");npBox.checked=np;'
        'function build(){board.innerHTML="";el={};var u=lay();for(var i=0;i<K.length;i++){var k=K[i];if(k[6]&&!np)continue;var s=document.createElement("span");s.className="k"+(k[0].charAt(0)==="*"?" dead":"")+(ok[k[0]]?" ok":"");'
        's.textContent=k[1];s.title=k[0].charAt(0)==="*"?"Fn doesn\\u2019t send anything to the computer, so it never lights up":k[1]||"Enter";'
        's.style.left=k[2]*u+"px";s.style.top=k[3]*u+"px";s.style.width=(k[4]*u-4)+"px";s.style.height=(k[5]*u-4)+"px";s.style.fontSize=Math.max(9,Math.min(15,u*(k[1].length>4?.24:.32)))+"px";'
        'board.appendChild(s);(el[k[0]]=el[k[0]]||[]).push(s);if(k[1])lab[k[0]]=k[1];}count();}'
        'function lay(){var W=np?23:18.5,av=wrap.clientWidth-28,u=Math.max(26,Math.min(54,av/W));board.style.width=W*u+"px";board.style.height=6.25*u+"px";return u;}'
        'function count(){var n=0,t=0;for(var c in el){if(c.charAt(0)==="*")continue;t++;if(ok[c])n++;}$("kbt-n").textContent=n;$("kbt-of").textContent=t;}'
        'function nice(e){return lab[e.code]||NM[e.code]||(e.key&&e.key.length===1?e.key.toUpperCase():e.key)||e.code||"?";}'
        'function hit(e,down){var c=e.code||("key:"+e.key);ok[c]=1;'
        'if(el[c]){for(var i=0;i<el[c].length;i++){var s=el[c][i];s.classList.add("ok");s.classList.toggle("dn",down);if(!down)s.classList.remove("held");else if(e.repeat)s.classList.add("held");}}'
        'else if(!other[c]){other[c]=1;var o=document.createElement("span");o.className="kbt__chip ok";o.textContent=nice(e);$("kbt-other").appendChild(o);$("kbt-otherwrap").hidden=false;}'
        'if(down){dn[c]=1;if(!since[c])since[c]=Date.now();}else{delete dn[c];delete since[c];}'
        '$("kbt-key").textContent=nice(e);$("kbt-code").textContent=e.code||"";count();}'
        'document.addEventListener("keydown",function(e){if(!act)return;e.preventDefault();e.stopPropagation();'   # stopPropagation: the site's own shortcuts (/ opens search) stay quiet while testing
        'if(e.code==="Escape"){var t=Date.now();escs.push(t);escs=escs.filter(function(x){return t-x<1500;});if(escs.length>=3){escs=[];hit(e,false);pad.blur();return;}}hit(e,true);},true);'
        'document.addEventListener("keyup",function(e){if(!act)return;e.preventDefault();e.stopPropagation();hit(e,false);},true);'
        # a key held for 3 s that the person may not be pressing = the classic stuck key
        'setInterval(function(){var m="",t=Date.now();for(var c in since){if(t-since[c]>1000&&el[c])for(var i=0;i<el[c].length;i++)el[c][i].classList.add("held");'   # orange once held a second
        'if(!m&&t-since[c]>3000)m=(lab[c]||c)+" has been held down for a while. If you\\u2019re not pressing it, it may be stuck.";}$("kbt-msg").textContent=m;},500);'
        'function clearDown(){for(var c in dn){if(el[c])for(var i=0;i<el[c].length;i++)el[c][i].classList.remove("dn","held");}dn={};since={};}'
        'pad.addEventListener("focus",function(){act=true;pad.classList.add("is-on");});'
        'pad.addEventListener("blur",function(){act=false;pad.classList.remove("is-on");clearDown();});'
        'pad.addEventListener("mousedown",function(){if(!act)setTimeout(function(){pad.focus();},0);});'
        'window.addEventListener("blur",clearDown);'
        'npBox.addEventListener("change",function(){np=npBox.checked;build();});'
        '$("kbt-reset").addEventListener("click",function(){ok={};other={};clearDown();$("kbt-other").innerHTML="";$("kbt-otherwrap").hidden=true;$("kbt-key").textContent="\\u2013";$("kbt-code").textContent="";'
        'var cs=document.querySelectorAll(".kbt__chip[data-m]");for(var i=0;i<cs.length;i++)cs[i].classList.remove("ok","dn");$("kbt-mmsg").textContent="";build();});'
        'var rz;window.addEventListener("resize",function(){clearTimeout(rz);rz=setTimeout(build,150);});'
        # the mouse box
        'var mb=$("kbt-mouse"),last={},MN=["Left","Wheel","Right","Back","Forward"];'
        'function chip(m,on){var c=mb.querySelector("[data-m=\\""+m+"\\"]");if(!c)return;c.classList.add("ok");if(on!==undefined)c.classList.toggle("dn",on);}'
        'mb.addEventListener("mousedown",function(e){var b=e.button,t=Date.now();if(b>0)e.preventDefault();chip(b,true);'
        'if(last[b]&&t-last[b]<70)$("kbt-mmsg").textContent="The "+(MN[b]||"")+" button just registered two clicks only "+(t-last[b])+" ms apart. Try a few single clicks: if it keeps happening, the switch is wearing out.";last[b]=t;});'
        'mb.addEventListener("mouseup",function(e){if(e.button>2)e.preventDefault();chip(e.button,false);});'
        'mb.addEventListener("auxclick",function(e){if(e.button>0)e.preventDefault();});'
        'mb.addEventListener("contextmenu",function(e){e.preventDefault();});'
        'mb.addEventListener("dblclick",function(e){if(e.target.getAttribute("data-m")==="dbl")chip("dbl");});'
        'mb.addEventListener("wheel",function(e){e.preventDefault();if(e.deltaY<0)chip("up");else if(e.deltaY>0)chip("down");},{passive:false});'
        'build();})();</script>')

KEYBOARD = {
    'slug': 'keyboard-test',
    'title': 'Keyboard Test: Check Which Keys Work, Free Online',
    'metaDesc': 'Free keyboard test: press each key and watch it light up on a UK keyboard, so you can see which keys don\'t work. Mouse buttons too. Nothing is sent.',
    'ogTitle': 'Free keyboard test: which of your keys work?',
    'crumbName': 'Keyboard Test',
    'eyebrow': '// FREE KEYBOARD AND MOUSE TEST',
    'h1': 'Free <em class="grad grad--cyan">keyboard test</em>: which keys work?',
    'lede': 'Click the keyboard below, then press each key on yours. Every key that works lights up, so the ones that don&rsquo;t stand out straight away. There&rsquo;s a mouse test too. Nothing you type is kept or sent anywhere.',
    'chips': ['Free, nothing to install', 'UK keyboard layout', 'Mouse test included'],
    'primaryCta': ['Start the test', '#s1'], 'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
    'ctaHead': 'A key still not working?',
    'ctaSub': 'We sort software problems remotely while you watch, and replace faulty laptop keyboards, with the price agreed first. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'webApp': '365 Techies Keyboard Test',
    'atAGlance': [
        ('How to use it', 'Click the keyboard picture, then press every key. Keys that work turn green.'),
        ('A key turns orange', 'It&rsquo;s being held down. If you aren&rsquo;t pressing it, it may be stuck.'),
        ('Fn never lights up', 'Normal: the Fn key doesn&rsquo;t send anything to the computer.'),
        ('Private', 'Nothing you type is kept or sent anywhere.'),
        ('Mouse', 'Left, right and wheel clicks, the wheel and side buttons, and it spots a mouse that double-clicks by itself.'),
        ('Laptop keys dead, USB keyboard fine', 'Then the laptop&rsquo;s own keyboard is faulty. We can replace it.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; THE TEST', 'h2': 'Test your keyboard: press every key',
         'html': '<p>Click the keyboard picture so it has a green outline, then press each key on your keyboard in turn. Keys turn green once they&rsquo;ve worked, so any key still grey at the end didn&rsquo;t reach the computer. No number pad on your keyboard? Untick <strong>Number pad</strong>. On a tablet it tests a keyboard plugged in or connected by Bluetooth; the on-screen keyboard can&rsquo;t be tested.</p>' + _KBT},
        {'eyebrow': '/02 &mdash; KEYS THAT WON&rsquo;T LIGHT UP', 'h2': 'Some keys won&rsquo;t light up, and that&rsquo;s normal',
         'html': '<ul>'
                 '<li><strong>Fn:</strong> the keyboard handles it itself and never tells the computer, so it never lights up on any test.</li>'
                 '<li><strong>The Windows key:</strong> Windows opens the Start menu. It should light up first; click the keyboard picture again afterwards.</li>'
                 '<li><strong>Print Screen:</strong> Windows 11 opens the Snipping Tool instead, so the key may only light up as you let go.</li>'
                 '<li><strong>F1 to F12 on a laptop:</strong> many laptops make them change the volume or brightness first. Those show under <strong>Other keys</strong>. Hold <em>Fn</em> and press the F key to test the F key itself.</li>'
                 '<li><strong>Alt Gr:</strong> Windows reports it as Ctrl and Alt together, so the left Ctrl lights up too.</li>'
                 '<li><strong>Ctrl + W and Alt + F4:</strong> the browser or Windows act on these before any web page sees them, and they close the page. Test Ctrl, W, Alt and F4 one at a time.</li>'
                 '</ul>'},
        {'eyebrow': '/03 &mdash; A KEY DOESN&rsquo;T WORK', 'h2': 'A key doesn&rsquo;t work: what to try',
         'html': '<ol>'
                 '<li><strong>Restart the computer.</strong> Use Restart, not Shut down, so Windows starts afresh.</li>'
                 '<li><strong>Check Sticky Keys and Filter Keys.</strong> If keys need holding down, or Shift seems stuck, a setting has switched on by accident: see <a href="/how-to-turn-off-sticky-keys/">how to turn off Sticky Keys</a>.</li>'
                 '<li><strong>Keys type the wrong symbols?</strong> If @ and &ldquo; are swapped, the keyboard is set to US English, not the keyboard. The <a href="/how-to-turn-off-sticky-keys/#s6">same page</a> shows how to put it back to United Kingdom.</li>'
                 '<li><strong>Wireless keyboard:</strong> new batteries first, then plug its receiver into another USB port, or remove and pair it again in Bluetooth settings.</li>'
                 '<li><strong>Wired keyboard:</strong> try another USB port, and another keyboard if you have one.</li>'
                 '<li><strong>Crumbs and dust:</strong> switch off, turn the keyboard upside down and tap it gently, or use a can of compressed air between the keys.</li>'
                 '<li><strong>Something spilled on it:</strong> switch off and unplug straight away, turn it upside down to drain, and don&rsquo;t dry it with heat. On a laptop, leave it off and get it checked: sticky drinks keep doing damage.</li>'
                 '<li><strong>Laptop keys not working?</strong> Plug in a USB keyboard. If that works, the laptop&rsquo;s own keyboard is faulty and needs replacing.</li>'
                 '<li><strong>Reinstall the keyboard driver:</strong> right-click Start, choose Device Manager, open <strong>Keyboards</strong>, right-click your keyboard, choose <strong>Uninstall device</strong>, then restart. Windows puts it back by itself.</li>'
                 '</ol>'},
        {'eyebrow': '/04 &mdash; THE MOUSE', 'h2': 'Mouse double-clicking, or not clicking?',
         'html': '<ul>'
                 '<li><strong>It double-clicks when you click once:</strong> the switch inside is wearing out. The mouse test above spots it. A new mouse is the cure; they&rsquo;re cheap.</li>'
                 '<li><strong>Double-clicks don&rsquo;t register:</strong> the double-click speed may be set too fast. On Windows 11: Settings, Bluetooth &amp; devices, Mouse, <strong>Additional mouse settings</strong>, then the double-click speed slider on the Buttons tab.</li>'
                 '<li><strong>The pointer jumps or stops:</strong> new batteries, the receiver in a USB port near the mouse, and a plain non-shiny surface or a mouse mat.</li>'
                 '<li><strong>A laptop touchpad stopped working:</strong> it may have been switched off with a key (look for a touchpad picture on one of the F keys), or in Settings, Bluetooth &amp; devices, Touchpad.</li>'
                 '</ul>'},
        {'eyebrow': '/05 &mdash; LAPTOP KEYBOARD REPAIR', 'h2': 'Laptop keyboard faulty? We can replace it',
         'html': '<p>If a USB keyboard works but the laptop&rsquo;s own keys don&rsquo;t, the laptop keyboard needs replacing. We collect laptops free across Bournemouth, Christchurch, Poole and Dorset, tell you the price before any work, fit the new keyboard and bring it back. Older laptop? Our <a href="/repair-or-replace-advisor/">repair or replace advisor</a> helps you decide whether it&rsquo;s worth it.</p>'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL},
    ],
    'howToName': 'How to test your keyboard online',
    'howToSteps': [
        {'name': 'Open the keyboard test', 'text': 'Open the free keyboard test on this page in your web browser.'},
        {'name': 'Click the keyboard picture', 'text': 'Click the picture so it has a green outline: it only listens while it has.'},
        {'name': 'Press every key', 'text': 'Press each key on your keyboard in turn. Keys that work turn green.'},
        {'name': 'Look for grey keys', 'text': 'Any key still grey did not reach the computer. Fn never lights up, which is normal.'},
        {'name': 'Test the mouse', 'text': 'Click, right-click, roll the wheel and press the side buttons in the mouse box.'},
    ],
    'faqs': [
        {'q': 'Does the keyboard test record what I type?', 'a': '<p>No. It only notes which keys have worked, and only until you close the page. Nothing is kept or sent anywhere.</p>'},
        {'q': 'Why doesn&rsquo;t the Fn key light up?', 'a': '<p>The keyboard handles Fn itself and never tells the computer, so no keyboard test can see it. That&rsquo;s normal.</p>'},
        {'q': 'Why did the page close when I pressed some keys?', 'a': '<p>Ctrl + W and Alt + F4 are taken by the browser or Windows before any web page sees them, and they close the page. Test those keys one at a time.</p>'},
        {'q': 'How do I test a laptop keyboard?', 'a': '<p>The same way: click the keyboard picture and press each key. Untick Number pad if your laptop doesn&rsquo;t have one. If some keys don&rsquo;t work, plug in a USB keyboard: if that works, the laptop&rsquo;s own keyboard is faulty.</p>'},
        {'q': 'Why do some keys type the wrong symbol?', 'a': '<p>Usually the keyboard is set to US English instead of United Kingdom, which swaps @ and &ldquo; among others. See <a href="/how-to-turn-off-sticky-keys/#s6">how to put the keyboard back to United Kingdom</a>.</p>'},
        {'q': 'Why does my mouse double-click when I click once?', 'a': '<p>The switch under the button is wearing out. The mouse test on this page spots it. A new mouse is the cure.</p>'},
        {'q': 'Can you fix a laptop keyboard?', 'a': '<p>Yes. We collect the laptop free across Bournemouth, Christchurch, Poole and Dorset, tell you the price before any work, replace the keyboard and bring it back.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/laptop-touchpad-not-working/">laptop touchpad not working</a>, <a href="/how-to-turn-off-sticky-keys/">how to turn off Sticky Keys</a>, <a href="/webcam-mic-test/">webcam, mic and speaker test</a>, <a href="/computer-spec-checker/">check your PC&rsquo;s specs</a>, <a href="/computer-fault-checker/">the computer fault checker</a> and <a href="/free-tools/">all our free tools</a>.</p>',
}

# ================================================================ 2. Speaker and headphone test (12 Oct 2026, "do everything")
# Bing: "speaker test" 60,000 a quarter (UK 2,000), "headphone test" 10,200 (UK 899), "left right audio test" 1,300 (UK 171).
# Web Audio tones only (no recordings): a three-note chime panned hard left, hard right or centre; 12 notes stepping left to
# right; a low (100 Hz) and a high (4 kHz, quieter) tone. A loudness slider scales everything; nothing is recorded or sent.
_SPK = ('<div class="spk" id="spk">'
        '<div class="spk__stage" aria-hidden="true">'
        '<div class="spk__side" id="spk-l"><span class="spk__ico">&#128264;</span><b>Left</b></div>'
        '<div class="spk__mid"><span class="spk__dot" id="spk-dot"></span></div>'
        '<div class="spk__side" id="spk-r"><span class="spk__ico">&#128264;</span><b>Right</b></div>'
        '</div>'
        '<div class="spk__btns">'
        '<button type="button" class="spk__b" data-t="left">Play left</button>'
        '<button type="button" class="spk__b" data-t="right">Play right</button>'
        '<button type="button" class="spk__b" data-t="both">Play both</button>'
        '<button type="button" class="spk__b" data-t="sweep">Left to right</button>'
        '<button type="button" class="spk__b" data-t="low">Low sound (bass)</button>'
        '<button type="button" class="spk__b" data-t="high">High sound</button>'
        '<button type="button" class="spk__b spk__stop" data-t="stop">Stop</button>'
        '</div>'
        '<label class="spk__vol">Loudness <input type="range" id="spk-vol" min="5" max="100" value="40" aria-label="How loud the test sounds play"></label>'
        '<p class="spk__msg" id="spk-msg" aria-live="polite">Turn your volume down a little before you start, especially with headphones on.</p>'
        '<p class="spk__note">The sounds are made in your browser. Nothing is recorded or sent anywhere.</p>'
        '</div>'
        '<style>'
        '.spk{margin:1rem 0 0;padding:1.2rem 1.25rem;border-radius:18px;border:1px solid rgba(29,151,227,.42);background:linear-gradient(135deg,rgba(29,151,227,.10),rgba(255,255,255,.02))}'
        '.spk__stage{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:1rem;margin:0 0 1rem}'
        '.spk__side{display:flex;flex-direction:column;align-items:center;gap:.3rem;min-width:84px;padding:.8rem .6rem;border-radius:16px;border:1px solid rgba(125,170,220,.3);background:#0d1726;transition:background .15s,border-color .15s}'
        '.spk__side b{font-size:1rem}.spk__ico{font-size:2rem;line-height:1}'
        '.spk__side.on{background:rgba(79,216,196,.25);border-color:#4fd8c4;box-shadow:0 0 0 4px rgba(79,216,196,.15)}'
        '.spk__mid{position:relative;height:6px;border-radius:3px;background:rgba(125,170,220,.25)}'
        '.spk__dot{position:absolute;top:50%;left:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:#4fd8c4;opacity:0;transition:left .2s linear,opacity .2s}'
        '.spk__dot.on{opacity:1}'
        '.spk__btns{display:flex;flex-wrap:wrap;gap:.55rem}'
        '.spk__b{min-height:48px;padding:.5rem 1.05rem;border-radius:999px;border:1px solid rgba(79,216,196,.55);background:rgba(79,216,196,.12);color:inherit;font:600 1rem var(--font-body);cursor:pointer}'
        '.spk__b:hover{background:rgba(79,216,196,.22)}.spk__stop{border-color:rgba(125,170,220,.45);background:rgba(0,0,0,.25)}'
        '.spk__vol{display:flex;align-items:center;gap:.7rem;margin:1rem 0 0;font-size:.92rem;color:var(--muted)}.spk__vol input{flex:1;max-width:320px;accent-color:#4fd8c4}'
        '.spk__msg{margin:.8rem 0 0;font-size:.95rem;min-height:1.3em}'
        '.spk__note{margin:.6rem 0 0;font-size:.8rem;color:var(--muted)}'
        '@media (max-width:520px){.spk{padding:1rem .8rem}.spk__side{min-width:64px}.spk__ico{font-size:1.6rem}}'
        '@media (prefers-reduced-motion:reduce){.spk__dot,.spk__side{transition:none}}'
        '</style>'
        '<script>(function(){var box=document.getElementById("spk");if(!box)return;function $(i){return document.getElementById(i);}'
        'var ctx=null,cur=[],timers=[];'
        'function ac(){if(!ctx){var A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ctx=new A();}if(ctx.state==="suspended")ctx.resume();return ctx;}'
        'function vol(){return +$("spk-vol").value/100*.5;}'
        'function panner(c,v){if(c.createStereoPanner){var p=c.createStereoPanner();p.pan.value=v;p.connect(c.destination);return p;}'
        'var q=c.createPanner();q.panningModel="equalpower";q.setPosition(v,0,1-Math.abs(v));q.connect(c.destination);return q;}'
        'function note(c,f,t,d,pv,g){var o=c.createOscillator(),e=c.createGain();o.type="sine";o.frequency.value=f;'
        'e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(g,t+.03);e.gain.setValueAtTime(g,t+Math.max(.04,d-.09));e.gain.linearRampToValueAtTime(0,t+d);'
        'o.connect(e);e.connect(panner(c,pv));o.start(t);o.stop(t+d+.03);cur.push(o);}'
        'function light(l,r){$("spk-l").classList.toggle("on",!!l);$("spk-r").classList.toggle("on",!!r);}'
        'function stop(){for(var i=0;i<cur.length;i++){try{cur[i].stop();}catch(e){}}cur=[];for(var j=0;j<timers.length;j++)clearTimeout(timers[j]);timers=[];light(0,0);$("spk-dot").classList.remove("on");}'
        'function later(fn,ms){timers.push(setTimeout(fn,ms));}'
        'var SAY={left:"You should hear it only on the left. If it came from both sides, Mono audio may be on, or the speakers are one box.",'
        'right:"You should hear it only on the right. Nothing? See \\u201cOnly one side works\\u201d below.",both:"You should hear it from both sides equally, in the middle.",'
        'sweep:"The notes should move from your left ear to your right.",low:"A deep hum. Laptop and phone speakers can barely play it: that\\u2019s normal.",'
        'high:"A high whistle. If you can\\u2019t hear it, try a little louder: many people hear very high sounds less well as they get older."};'
        'function play(t){var c=ac();if(!c){$("spk-msg").textContent="This browser can\\u2019t play test sounds.";return;}stop();var n=c.currentTime+.05,g=vol(),i;'
        'if(t==="stop"){$("spk-msg").textContent="";return;}'
        'if(t==="left"||t==="right"||t==="both"){var pv=t==="left"?-1:t==="right"?1:0,ch=[523.25,659.25,783.99];'
        'for(var r=0;r<2;r++)for(i=0;i<3;i++)note(c,ch[i],n+r*1.05+i*.3,.28,pv,g);light(t!=="right",t!=="left");later(function(){light(0,0);},2200);}'
        'else if(t==="sweep"){var dot=$("spk-dot");dot.classList.add("on");for(i=0;i<12;i++){(function(i){var v=-1+i*2/11;note(c,i%2?659.25:523.25,n+i*.25,.22,v,g);'
        'later(function(){dot.style.left=(i/11*100)+"%";light(v<.3,v>-.3);},i*250);})(i);}later(function(){dot.classList.remove("on");dot.style.left="50%";light(0,0);},3200);}'
        'else if(t==="low"){note(c,100,n,1.6,0,Math.min(1,g*1.6));light(1,1);later(function(){light(0,0);},1700);}'
        'else if(t==="high"){note(c,4000,n,1.2,0,g*.35);light(1,1);later(function(){light(0,0);},1300);}'
        '$("spk-msg").textContent=SAY[t]||"";}'
        'var bs=box.querySelectorAll(".spk__b");for(var i=0;i<bs.length;i++)bs[i].addEventListener("click",function(){play(this.getAttribute("data-t"));});'
        '})();</script>')

SPEAKER = {
    'slug': 'speaker-and-headphone-test',
    'title': 'Speaker &amp; Headphone Test: Left, Right &amp; Bass (Free)',
    'metaDesc': 'Free speaker and headphone test: play a sound on the left, then the right, then both, plus a bass check. Find out which side isn\'t working, and why.',
    'ogTitle': 'Free speaker and headphone test: left, right and bass',
    'crumbName': 'Speaker and Headphone Test',
    'eyebrow': '// FREE SPEAKER AND HEADPHONE TEST',
    'h1': 'Free <em class="grad grad--cyan">speaker and headphone</em> test',
    'lede': 'Play a sound on the left, then the right, then both, and check the bass. You&rsquo;ll know in seconds whether a side has stopped working, the headphones are the wrong way round, or a setting is to blame. Nothing to install, nothing recorded.',
    'chips': ['Left, right and both', 'Bass and treble check', 'Nothing to install'],
    'primaryCta': ['Start the test', '#s1'], 'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
    'ctaHead': 'Sound still not right?',
    'ctaSub': 'With your permission we connect to your Windows PC and sort the sound while you watch, usually the same day. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'webApp': '365 Techies Speaker and Headphone Test',
    'atAGlance': [
        ('How to use it', 'Press Play left, then Play right, then Play both. Each should come only from that side.'),
        ('Sound in both ears on the left test', 'Mono audio may be on, or the speakers are a single box. Both are fine.'),
        ('One side silent', 'Push the plug fully in, check Windows&rsquo; left and right balance, then try another device.'),
        ('No bass on a laptop', 'Normal: small speakers can barely play deep sounds.'),
        ('Can&rsquo;t hear the high sound', 'Try a little louder. Many people hear very high sounds less well with age.'),
        ('Private', 'The sounds are made in your browser. Nothing is recorded or sent.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; THE TEST', 'h2': 'Test your speakers or headphones',
         'html': '<p>Turn the volume down a little first, put the headphones on the right way round (look for L and R), then press each button. The speaker on screen lights up on the side that should be playing.</p>' + _SPK},
        {'eyebrow': '/02 &mdash; WHAT YOU SHOULD HEAR', 'h2': 'What you should hear',
         'html': '<ul>'
                 '<li><strong>Play left:</strong> three notes, twice, only in your left ear or from the left speaker. <strong>Play right</strong> is the same on the right.</li>'
                 '<li><strong>Play both:</strong> the same notes from both sides at once, so they seem to come from the middle.</li>'
                 '<li><strong>Left to right:</strong> twelve notes that move from your left ear to your right. If they all sound in the same place, Mono audio is on or the sound is coming from one box.</li>'
                 '<li><strong>Low sound:</strong> a deep hum. Laptop, tablet and phone speakers can barely play it, so near-silence there is normal; headphones and proper speakers should play it.</li>'
                 '<li><strong>High sound:</strong> a high whistle. If you can&rsquo;t hear it, try a little louder. Many people hear very high sounds less well as they get older, which is natural and not a fault with the speakers.</li>'
                 '</ul>'},
        {'eyebrow': '/03 &mdash; ONLY ONE SIDE WORKS', 'h2': 'Only one side works',
         'html': '<ol>'
                 '<li><strong>Push the plug fully in.</strong> A headphone plug that&rsquo;s only half in plays one side. Try it in the other socket, or clean any fluff out of the socket.</li>'
                 '<li><strong>Check Windows&rsquo; balance.</strong> On Windows 11: Settings, System, Sound, click your speakers or headphones, and make sure the <strong>Left channel</strong> and <strong>Right channel</strong> sliders match.</li>'
                 '<li><strong>Check Mono audio.</strong> It sends the same sound to both ears, which helps if you hear better in one ear. If you want proper left and right, switch it off: Settings, Accessibility, Audio, Mono audio.</li>'
                 '<li><strong>Try the headphones on another device,</strong> such as a phone. If one side is still silent there, the headphones or their cable are faulty.</li>'
                 '<li><strong>Bluetooth headphones sound muffled or tinny?</strong> They may be stuck in phone-call mode: see <a href="/bluetooth-headphones-sound-muffled-on-pc/">Bluetooth headphones sound muffled on a PC</a>.</li>'
                 '</ol>'},
        {'eyebrow': '/04 &mdash; NO SOUND AT ALL', 'h2': 'No sound at all',
         'html': '<ol>'
                 '<li><strong>Volume and mute:</strong> press <em>Windows</em> + <em>A</em> and check the volume slider isn&rsquo;t at zero or muted.</li>'
                 '<li><strong>The right speakers chosen:</strong> in the same panel, click the arrow beside the volume slider and pick the speakers or headphones you&rsquo;re using. Windows often switches to a TV or monitor that has no speakers.</li>'
                 '<li><strong>One program muted:</strong> Settings, System, Sound, <strong>Volume mixer</strong> shows each program&rsquo;s own volume.</li>'
                 '<li><strong>Restart the computer.</strong> Use Restart, not Shut down.</li>'
                 '<li><strong>Run the audio troubleshooter:</strong> Settings, System, Troubleshoot, Other troubleshooters, Audio.</li>'
                 '<li><strong>Reinstall the sound driver:</strong> right-click Start, Device Manager, open <strong>Sound, video and game controllers</strong>, right-click your sound device, <strong>Uninstall device</strong>, then restart. Windows puts it back by itself.</li>'
                 '</ol>'},
        {'eyebrow': '/05 &mdash; THE QUICK WAY', 'h2': 'Let our free app check the sound',
         'html': '__APP_BOX_SOUND__'},
        {'eyebrow': '/06 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL.replace('If it&rsquo;s the keyboard itself, we collect', 'If the speakers or headphone socket are faulty, we collect')},
    ],
    'howToName': 'How to test your speakers or headphones',
    'howToSteps': [
        {'name': 'Turn the volume down a little', 'text': 'Start quiet, especially with headphones on, and put them on the right way round.'},
        {'name': 'Play left, then right', 'text': 'Each should come only from that side.'},
        {'name': 'Play both and the sweep', 'text': 'Both should sound from the middle; the sweep should move from left to right.'},
        {'name': 'Check the bass and treble', 'text': 'Small laptop speakers barely play the low sound, which is normal.'},
        {'name': 'Fix a silent side', 'text': 'Push the plug fully in, match the left and right channel sliders in Windows, and try the headphones on another device.'},
    ],
    'faqs': [
        {'q': 'Why do I only hear sound in one ear?', 'a': '<p>Usually the plug isn&rsquo;t fully in, Windows&rsquo; left and right balance is uneven, or one side of the headphones has failed. Try them on a phone: if one side is still silent, the headphones are faulty.</p>'},
        {'q': 'Why does the left test play in both ears?', 'a': '<p>Mono audio is on (Settings, Accessibility, Audio), or the sound is coming from a single speaker such as a laptop, TV or soundbar.</p>'},
        {'q': 'Why can&rsquo;t I hear the low sound on my laptop?', 'a': '<p>Small laptop and tablet speakers can barely play deep sounds. That&rsquo;s normal. Headphones or proper speakers should play it.</p>'},
        {'q': 'How loud should I set it?', 'a': '<p>Start low, especially with headphones on, and turn up until the notes are comfortable. You don&rsquo;t need it loud to tell left from right.</p>'},
        {'q': 'Can it test my microphone too?', 'a': '<p>This page tests what you hear. Our <a href="/webcam-mic-test/">webcam and mic test</a> checks your microphone and camera.</p>'},
        {'q': 'Can you fix my laptop speakers?', 'a': '<p>Yes. We check the settings and driver remotely first. If the speakers or headphone socket are faulty, we collect the laptop locally, tell you the price before any work, and repair it.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/no-sound-on-computer/">no sound on your computer</a>, <a href="/bluetooth-headphones-sound-muffled-on-pc/">Bluetooth headphones sound muffled</a>, <a href="/webcam-mic-test/">webcam and mic test</a>, <a href="/keyboard-test/">keyboard test</a>, <a href="/windows-accessibility-features-guide/">Windows accessibility features</a> and <a href="/free-tools/">all our free tools</a>.</p>',
}

# ================================================================ 3. Visual timer (12 Oct 2026, "do everything")
# Bing: "visual timer" 7,800 a quarter (UK 692), "visual timers" 800, "visual timer online" 725; "focus timer" 5,500 (UK 433).
# A disc that shrinks as time runs out (conic-gradient), minutes:seconds, presets, start / pause / reset, full screen with the
# screen kept on, a gentle chime at the end (Web Audio), no flashing. Timing comes from the clock (an end time), not from
# counting ticks, so a background tab still ends on time. Choices in localStorage 'vt1'.
_VT_FACE = ('<div class="vt__face"><div class="vt__disc"></div><div class="vt__ticks"></div></div>'
            '<div class="vt__time">10:00</div>')
_VT = ('<div class="vt" id="vt">'
       '<div class="vt__show" id="vt-show" role="timer" aria-live="off">' + _VT_FACE + '</div>'
       '<div class="vt__presets" role="group" aria-label="Choose a time">'
       + ''.join('<button type="button" class="vt__p" data-m="%d">%d min</button>' % (m, m) for m in (1, 2, 5, 10, 15, 20, 25, 30, 45, 60)) +
       '</div>'
       '<div class="vt__row"><label class="vt__min">Or type minutes <input type="number" id="vt-min" min="1" max="240" step="1" value="10" inputmode="numeric"></label></div>'
       '<div class="vt__ctrl"><button type="button" class="button primary vt__go" id="vt-go">Start</button>'
       '<button type="button" class="vt__btn" id="vt-reset">Reset</button><button type="button" class="vt__btn" id="vt-full">Full screen</button></div>'
       '<fieldset class="vt__opts"><legend>Colour</legend>'
       '<label><input type="radio" name="vt-col" value="#e5484d" checked> Red</label><label><input type="radio" name="vt-col" value="#2f80ed"> Blue</label>'
       '<label><input type="radio" name="vt-col" value="#2fb36d"> Green</label><label><input type="radio" name="vt-col" value="#9b5de5"> Purple</label></fieldset>'
       '<fieldset class="vt__opts"><legend>Options</legend>'
       '<label><input type="checkbox" id="vt-snd" checked> Gentle sound at the end</label><label><input type="checkbox" id="vt-num" checked> Show minutes and seconds</label></fieldset>'
       '<p class="vt__note">Works on any computer, laptop or tablet. Your choices are remembered on this device only.</p>'
       '</div>'
       '<div class="vt-full" id="vt-fullbox" role="dialog" aria-modal="true" aria-label="Visual timer" tabindex="-1" hidden>'
       '<div class="vt__show vt__show--big">' + _VT_FACE + '</div>'
       '<div class="vt-bar"><button type="button" id="vt-go2">Pause</button><button type="button" id="vt-x">Close</button></div></div>'
       '<style>'
       '.vt{margin:1rem 0 0;padding:1.2rem 1.25rem;border-radius:18px;border:1px solid rgba(29,151,227,.42);background:linear-gradient(135deg,rgba(29,151,227,.10),rgba(255,255,255,.02))}'
       '.vt__show{display:flex;flex-direction:column;align-items:center;gap:.6rem;padding:1rem 0}'
       '.vt__face{position:relative;width:min(72vw,320px);aspect-ratio:1;border-radius:50%;background:#fff;box-shadow:0 0 0 10px #0b1019,0 18px 40px -18px rgba(0,0,0,.8)}'
       '.vt__disc{position:absolute;inset:6%;border-radius:50%;background:conic-gradient(var(--vtc,#e5484d) var(--vtd,360deg),transparent 0)}'
       '.vt__ticks{position:absolute;inset:0;border-radius:50%;background:repeating-conic-gradient(#0b1019 0 1.2deg,transparent 1.2deg 30deg);'
       '-webkit-mask:radial-gradient(circle,transparent 88%,#000 88.5%);mask:radial-gradient(circle,transparent 88%,#000 88.5%)}'
       '.vt__time{font:700 clamp(2rem,7vw,3rem)/1 var(--font-body);font-variant-numeric:tabular-nums;color:var(--ink,#eaf4ff)}'
       '.vt.no-num .vt__time,.vt-full.no-num .vt__time{visibility:hidden}'
       '.vt__presets{display:flex;flex-wrap:wrap;justify-content:center;gap:.45rem;margin:.4rem 0 0}'
       '.vt__p{min-height:44px;min-width:70px;padding:.4rem .8rem;border-radius:999px;border:1px solid rgba(125,170,220,.4);background:#0d1726;color:inherit;font:600 .95rem var(--font-body);cursor:pointer}'
       '.vt__p.on{background:rgba(79,216,196,.22);border-color:#4fd8c4}'
       '.vt__row{display:flex;justify-content:center;margin:.8rem 0 0}.vt__min{display:flex;align-items:center;gap:.6rem;font-size:.92rem;color:var(--muted)}'
       '.vt__min input{width:90px;min-height:44px;padding:.4rem .6rem;border-radius:10px;border:1px solid rgba(125,170,220,.35);background:rgba(0,0,0,.3);color:var(--ink,#eaf4ff);font:inherit;font-size:1.05rem}'
       '.vt__ctrl{display:flex;flex-wrap:wrap;justify-content:center;gap:.6rem;margin:1rem 0 0}.vt__go{min-height:52px;min-width:150px;font-size:1.1rem}'
       '.vt__btn{min-height:52px;padding:.5rem 1.2rem;border-radius:999px;border:1px solid rgba(125,170,220,.45);background:rgba(0,0,0,.25);color:inherit;font:600 1rem var(--font-body);cursor:pointer}'
       '.vt__opts{margin:1rem 0 0;padding:0;border:0;min-width:0;display:flex;flex-wrap:wrap;gap:.5rem .6rem}'
       '.vt__opts legend{float:left;width:100%;margin:0 0 .45rem;padding:0;font-size:.86rem;color:var(--muted)}'
       '.vt__opts label{display:inline-flex;align-items:center;gap:.5rem;min-height:44px;padding:.45rem .85rem;border-radius:999px;border:1px solid rgba(125,170,220,.35);background:rgba(0,0,0,.25);font-size:.95rem;cursor:pointer}'
       '.vt__opts input{width:20px;height:20px;margin:0;accent-color:#4fd8c4;flex:none}'
       '.vt__note{margin:.9rem 0 0;font-size:.82rem;color:var(--muted)}'
       '.vt-full{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:#05080f}.vt-full[hidden]{display:none!important}.vt-full:focus{outline:none}'
       '.vt__show--big .vt__face{width:min(74vh,86vw)}.vt__show--big .vt__time{font-size:clamp(2.4rem,9vh,5rem)}'
       '.vt-bar{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:.6rem;padding:.6rem;border-radius:16px;background:rgba(28,30,34,.94);transition:opacity .4s}'
       '.vt-full.is-idle .vt-bar{opacity:0;pointer-events:none}.vt-full.is-idle{cursor:none}'
       '.vt-bar button{min-height:52px;padding:.5rem 1.2rem;border-radius:12px;border:1px solid rgba(128,128,128,.55);background:rgba(128,128,128,.18);color:#fff;font:600 1.05rem var(--font-body);cursor:pointer}'
       '.vt__done .vt__time{color:#ffb066}'
       '@media (prefers-reduced-motion:reduce){.vt-bar{transition:none}}'
       '</style>'
       '<script>(function(){var V=document.getElementById("vt"),FB=document.getElementById("vt-fullbox");if(!V||!FB||!document.body)return;document.body.appendChild(FB);'
       'function $(i){return document.getElementById(i);}'
       'var o={m:10,col:"#e5484d",snd:1,num:1};try{var s=JSON.parse(localStorage.getItem("vt1")||"null");if(s)for(var k in o)if(s.hasOwnProperty(k))o[k]=s[k];}catch(e){}'
       'function save(){try{localStorage.setItem("vt1",JSON.stringify(o));}catch(e){}}'
       'var total=o.m*60000,left=total,end=0,run=false,tm=null,lock=null,idle,title0=document.title;'
       'var discs=document.querySelectorAll(".vt__disc"),times=document.querySelectorAll(".vt__time"),shows=[V,FB];'
       'function fmt(ms){var s=Math.ceil(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+":"+(m<10?"0":""):"")+m+":"+(x<10?"0":"")+x;}'
       'function draw(){var d=total?Math.max(0,left)/total*360:0,t=left>0?fmt(left):"Time\\u2019s up";for(var i=0;i<discs.length;i++){discs[i].style.setProperty("--vtd",d+"deg");discs[i].style.setProperty("--vtc",o.col);}'
       'for(var j=0;j<times.length;j++)times[j].textContent=t;for(var q=0;q<2;q++){shows[q].classList.toggle("no-num",!o.num);shows[q].classList.toggle("vt__done",left<=0);}'
       'document.title=run?fmt(left)+" \\u2013 visual timer":title0;$("vt-go").textContent=run?"Pause":(left<total&&left>0?"Carry on":"Start");$("vt-go2").textContent=run?"Pause":"Start";}'
       'function tick(){left=end-Date.now();if(left<=0){left=0;run=false;clearInterval(tm);tm=null;chime();unlock();}draw();}'
       'function start(){if(left<=0)left=total;end=Date.now()+left;run=true;clearInterval(tm);tm=setInterval(tick,250);wake();draw();}'
       'function pause(){if(!run)return;left=end-Date.now();run=false;clearInterval(tm);tm=null;unlock();draw();}'
       'function reset(){pause();total=o.m*60000;left=total;draw();}'
       'function setMin(m){m=Math.max(1,Math.min(240,Math.round(+m||10)));o.m=m;save();$("vt-min").value=m;var ps=V.querySelectorAll(".vt__p");for(var i=0;i<ps.length;i++)ps[i].classList.toggle("on",+ps[i].getAttribute("data-m")===m);reset();}'
       'var ctx=null;function chimeReady(){try{var A=window.AudioContext||window.webkitAudioContext;if(A&&!ctx)ctx=new A();if(ctx&&ctx.state==="suspended")ctx.resume();}catch(e){}}'   # a click unlocks sound for the end chime
       'function chime(){if(!o.snd)return;try{chimeReady();if(!ctx)return;'
       'var n=ctx.currentTime+.05,f=[783.99,659.25,523.25];for(var r=0;r<2;r++)for(var i=0;i<3;i++){var os=ctx.createOscillator(),g=ctx.createGain(),t=n+r*1.4+i*.35;os.type="sine";os.frequency.value=f[i];'
       'g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.2,t+.03);g.gain.exponentialRampToValueAtTime(.001,t+.9);os.connect(g);g.connect(ctx.destination);os.start(t);os.stop(t+.95);}}catch(e){}}'
       'function wake(){try{if("wakeLock" in navigator&&!lock)navigator.wakeLock.request("screen").then(function(l){lock=l;l.addEventListener("release",function(){lock=null;});},function(){});}catch(e){}}'
       'function unlock(){if(lock){try{lock.release();}catch(e){}lock=null;}}'
       'document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible"&&run){tick();wake();}});'
       # the presets, the minutes box, the buttons
       'var ps=V.querySelectorAll(".vt__p");for(var i=0;i<ps.length;i++)ps[i].addEventListener("click",function(){setMin(this.getAttribute("data-m"));});'
       '$("vt-min").addEventListener("change",function(){setMin(this.value);});'
       '$("vt-go").addEventListener("click",function(){chimeReady();run?pause():start();});'
       '$("vt-reset").addEventListener("click",reset);'
       'var cols=document.getElementsByName("vt-col");for(var c=0;c<cols.length;c++){cols[c].checked=cols[c].value===o.col;cols[c].addEventListener("change",function(){if(this.checked){o.col=this.value;save();draw();}});}'
       '$("vt-snd").checked=!!o.snd;$("vt-snd").addEventListener("change",function(){o.snd=this.checked?1:0;save();});'
       '$("vt-num").checked=!!o.num;$("vt-num").addEventListener("change",function(){o.num=this.checked?1:0;save();draw();});'
       # full screen: the same timer, filling the window (and the screen where the browser allows)
       'function fsEl(){return document.fullscreenElement||document.webkitFullscreenElement||null;}'
       'function bar(){FB.classList.remove("is-idle");clearTimeout(idle);idle=setTimeout(function(){FB.classList.add("is-idle");},4000);}'
       'function openFull(){chimeReady();FB.hidden=false;document.documentElement.style.overflow="hidden";var r=FB.requestFullscreen||FB.webkitRequestFullscreen;if(r){try{var p=r.call(FB);if(p&&p.then)p.then(null,function(){});}catch(e){}}if(!run)start();bar();try{FB.focus();}catch(e){}}'
       'function closeFull(){if(fsEl()){var x=document.exitFullscreen||document.webkitExitFullscreen;try{if(x)x.call(document);}catch(e){}}FB.hidden=true;document.documentElement.style.overflow="";}'
       'var wasFs=false;function fsc(){var on=!!fsEl();if(wasFs&&!on&&!FB.hidden)closeFull();wasFs=on;}document.addEventListener("fullscreenchange",fsc);document.addEventListener("webkitfullscreenchange",fsc);'
       '$("vt-full").addEventListener("click",openFull);$("vt-x").addEventListener("click",function(e){e.stopPropagation();closeFull();});'
       '$("vt-go2").addEventListener("click",function(e){e.stopPropagation();run?pause():start();bar();});'
       'FB.addEventListener("mousemove",bar);FB.addEventListener("touchstart",bar,{passive:true});FB.addEventListener("click",bar);'
       'document.addEventListener("keydown",function(e){if(FB.hidden)return;if(e.key==="Escape")closeFull();else if(e.key===" "||e.code==="Space"){e.preventDefault();run?pause():start();}bar();});'
       'setMin(o.m);})();</script>')

TIMER = {
    'slug': 'visual-timer',
    'title': 'Visual Timer: Free Full-Screen Countdown You Can See',
    'metaDesc': 'A free visual timer: a coloured circle that shrinks as time runs out, full screen on any computer or tablet. For homework, focus, cooking and ADHD.',
    'ogTitle': 'A free visual timer you can see across the room',
    'crumbName': 'Visual Timer',
    'eyebrow': '// A FREE VISUAL TIMER',
    'h1': 'A free <em class="grad grad--cyan">visual timer</em>',
    'lede': 'A coloured circle that shrinks as the time runs out, so you can see at a glance how long is left without reading numbers. Pick a time, press Start, and open it full screen on any computer, laptop or tablet. Free, no sign-up, no adverts.',
    'chips': ['See time passing', 'Full screen', 'Gentle sound at the end'],
    'primaryCta': ['Start a timer', '#s1'], 'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
    'ctaHead': 'Want a spare laptop set up as a timer or clock?',
    'ctaSub': 'We can set up an old Windows laptop as a visual timer or a day and date clock for home or a classroom. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'webApp': '365 Techies Visual Timer',
    'atAGlance': [
        ('How it works', 'The coloured part of the circle shrinks as time passes. When it&rsquo;s gone, time&rsquo;s up.'),
        ('Times', '1 minute to 4 hours: tap a preset or type the minutes.'),
        ('At the end', 'A gentle three-note chime, if you leave the sound on. No flashing.'),
        ('Full screen', 'Fills the screen and asks the device to keep it on while the timer runs.'),
        ('Colours', 'Red, blue, green or purple, with or without the minutes and seconds.'),
        ('Private', 'Nothing is sent anywhere. Your choices are remembered on this device only.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; THE TIMER', 'h2': 'Set the timer',
         'html': '<p>Tap a time, or type the minutes, then press <strong>Start</strong>. <strong>Full screen</strong> makes the circle as big as the screen; tap it to show the Pause and Close buttons, or press the space bar to pause.</p>' + _VT},
        {'eyebrow': '/02 &mdash; WAYS TO USE IT', 'h2': 'Ways people use a visual timer',
         'html': '<ul>'
                 '<li><strong>Homework and revision:</strong> 20 or 25 minutes of work, then a 5-minute break.</li>'
                 '<li><strong>Focus sessions:</strong> work until the colour has gone, rest, repeat. Seeing the time shrink makes it easier to keep going, and to stop.</li>'
                 '<li><strong>Screen time:</strong> &ldquo;when the red has gone, the tablet goes off&rdquo; is easier to accept than an argument.</li>'
                 '<li><strong>Taking turns and getting ready:</strong> children can see how long until their turn, or until it&rsquo;s time to leave.</li>'
                 '<li><strong>Cooking, exercise and meetings:</strong> anything where you want to see the time left from across the room.</li>'
                 '</ul>'
                 '<p>Teachers use visual timers in classrooms, and many people with ADHD or autism find a timer they can see easier to use than one they have to read. For someone living with dementia, our <a href="/dementia-clock/">day and date clock</a> may help more.</p>'},
        {'eyebrow': '/03 &mdash; ON A SPARE SCREEN', 'h2': 'Use an old laptop or tablet as a timer',
         'html': '<ol>'
                 '<li><strong>Plug it in,</strong> so it doesn&rsquo;t go flat halfway through.</li>'
                 '<li><strong>Bookmark this page,</strong> or add it to the home screen on a tablet. Your colour, sound and last time are remembered.</li>'
                 '<li><strong>Press Full screen.</strong> In Chrome and Edge the timer asks the device to keep the screen on while it runs.</li>'
                 '<li><strong>Turn the sound up a little,</strong> so the chime is heard from across the room.</li>'
                 '</ol>'},
        {'eyebrow': '/04 &mdash; WANT A HAND?', 'h2': 'We can set it up for you',
         'html': '<p>We can turn an old Windows laptop into a timer or a clock for home or a classroom. Ring <strong>01202 775566</strong> or text 07520 615332, Monday to Friday, 9 to 5. With your permission we connect remotely and set it up while you watch.</p>'},
    ],
    'howToName': 'How to use the visual timer',
    'howToSteps': [
        {'name': 'Choose a time', 'text': 'Tap a preset, from 1 to 60 minutes, or type the minutes you want.'},
        {'name': 'Press Start', 'text': 'The coloured part of the circle starts to shrink.'},
        {'name': 'Go full screen', 'text': 'Press Full screen so it can be seen from across the room.'},
        {'name': 'Pause or reset', 'text': 'Tap the screen for Pause and Close, or press the space bar to pause.'},
        {'name': 'Listen for the end', 'text': 'A gentle chime plays when the colour has gone, if the sound is on.'},
    ],
    'faqs': [
        {'q': 'What is a visual timer?', 'a': '<p>A timer that shows time passing as a shrinking coloured shape, so you can see how long is left at a glance, without reading numbers.</p>'},
        {'q': 'Is it free?', 'a': '<p>Yes. No sign-up, no adverts, and nothing is sent anywhere.</p>'},
        {'q': 'Does it keep going if I switch to another tab?', 'a': '<p>Yes. It works out the time from the clock, so it ends on time even if the tab is in the background. The chime plays when it ends, as long as the page is still open.</p>'},
        {'q': 'Can I use it for longer than an hour?', 'a': '<p>Yes. Type up to 240 minutes in the minutes box.</p>'},
        {'q': 'Does it flash at the end?', 'a': '<p>No. It plays a gentle chime, if the sound is on, and shows &ldquo;Time&rsquo;s up&rdquo;. Nothing flashes.</p>'},
        {'q': 'Does it help with ADHD?', 'a': '<p>Many people with ADHD find a timer they can see easier to use than one they have to read, but everyone is different: try it for a week and see.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/dementia-clock/">day and date clock</a>, <a href="/windows-accessibility-features-guide/">Windows accessibility features</a>, <a href="/how-to-set-an-alarm-on-your-computer/">set an alarm on your computer</a> and <a href="/free-tools/">all our free tools</a>.</p>',
}

# ================================================================ 4. Dead pixel / screen test (12 Oct 2026, "do everything")
# Bing: "dead pixel test" 116,200 a quarter (UK 1,100). Solid colours full screen, tap or arrow for the next; a black-to-white
# gradient for banding. Deliberately NO flashing "pixel fixer": fast flashing can trigger seizures in photosensitive epilepsy.
_DPT = ('<div class="dpt" id="dpt">'
        '<div class="dpt__sw" role="group" aria-label="Colours in the test">'
        '<span style="background:#000" title="Black"></span><span style="background:#fff" title="White"></span><span style="background:#f00" title="Red"></span>'
        '<span style="background:#0f0" title="Green"></span><span style="background:#00f" title="Blue"></span><span style="background:#808080" title="Grey"></span>'
        '<span style="background:linear-gradient(90deg,#000,#fff)" title="Black to white"></span></div>'
        '<p class="dpt__go"><button type="button" class="button primary" id="dpt-go">Start the full-screen test</button></p>'
        '<p class="dpt__how">Tap the screen, or press the space bar or an arrow key, for the next colour. Press Esc, or tap the last colour, to finish. Nothing flashes.</p>'
        '</div>'
        '<div class="dpt-full" id="dpt-full" role="dialog" aria-modal="true" aria-label="Screen test" tabindex="-1" hidden><p class="dpt-hint" id="dpt-hint"></p></div>'
        '<style>'
        '.dpt{margin:1rem 0 0;padding:1.2rem 1.25rem;border-radius:18px;border:1px solid rgba(29,151,227,.42);background:linear-gradient(135deg,rgba(29,151,227,.10),rgba(255,255,255,.02))}'
        '.dpt__sw{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:.5rem}.dpt__sw span{display:block;aspect-ratio:4/3;border-radius:10px;border:1px solid rgba(125,170,220,.35)}'
        '.dpt__go{margin:1rem 0 0;text-align:center}.dpt__go .button{font-size:1.1rem;min-height:52px}'
        '.dpt__how{margin:.8rem 0 0;font-size:.9rem;color:var(--muted);text-align:center}'
        '.dpt-full{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483000;cursor:pointer}.dpt-full[hidden]{display:none!important}.dpt-full:focus{outline:none}'
        '.dpt-hint{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);margin:0;padding:.55rem 1rem;border-radius:12px;background:rgba(20,22,26,.85);color:#fff;font:600 .95rem var(--font-body);max-width:calc(100% - 32px);text-align:center;transition:opacity .5s}'
        '.dpt-hint.gone{opacity:0}'
        '@media (max-width:520px){.dpt{padding:1rem .8rem}.dpt__sw{grid-template-columns:repeat(4,minmax(0,1fr))}}'
        '@media (prefers-reduced-motion:reduce){.dpt-hint{transition:none}}'
        '</style>'
        '<script>(function(){var F=document.getElementById("dpt-full"),H=document.getElementById("dpt-hint");if(!F||!document.body)return;document.body.appendChild(F);'
        'var C=[["#000","Black: look for bright dots, and light leaking in at the edges"],["#fff","White: look for black or coloured dots"],["#f00","Red"],["#0f0","Green"],["#00f","Blue"],'
        '["#808080","Grey: look for patches that are lighter or darker"],["linear-gradient(90deg,#000,#fff)","Black to white: look for stripes instead of a smooth fade"]],i=0,ht;'
        'function show(){F.style.background=C[i][0];H.textContent=(i+1)+" of "+C.length+" \\u00b7 "+C[i][1]+(i===C.length-1?" \\u00b7 tap to finish":"");H.classList.remove("gone");clearTimeout(ht);ht=setTimeout(function(){H.classList.add("gone");},3000);}'
        'function fsEl(){return document.fullscreenElement||document.webkitFullscreenElement||null;}'
        'function open(){i=0;F.hidden=false;document.documentElement.style.overflow="hidden";var r=F.requestFullscreen||F.webkitRequestFullscreen;if(r){try{var p=r.call(F);if(p&&p.then)p.then(null,function(){});}catch(e){}}show();try{F.focus();}catch(e){}}'
        'function close(){if(fsEl()){var x=document.exitFullscreen||document.webkitExitFullscreen;try{if(x)x.call(document);}catch(e){}}F.hidden=true;document.documentElement.style.overflow="";}'
        'function next(d){i+=d;if(i>=C.length){close();return;}if(i<0)i=0;show();}'
        'var was=false;function fsc(){var on=!!fsEl();if(was&&!on&&!F.hidden)close();was=on;}document.addEventListener("fullscreenchange",fsc);document.addEventListener("webkitfullscreenchange",fsc);'
        'document.getElementById("dpt-go").addEventListener("click",open);F.addEventListener("click",function(){next(1);});'
        'document.addEventListener("keydown",function(e){if(F.hidden)return;var k=e.key;if(k==="Escape"){close();return;}'
        'if(k===" "||k==="ArrowRight"||k==="ArrowDown"||k==="Enter"){e.preventDefault();next(1);}else if(k==="ArrowLeft"||k==="ArrowUp"){e.preventDefault();next(-1);}});'
        '})();</script>')

DEADPIXEL = {
    'slug': 'dead-pixel-test',
    'title': 'Dead Pixel Test: Check Your Screen Full Screen, Free',
    'metaDesc': 'Free dead pixel test: fill your screen with black, white, red, green and blue to spot dead or stuck pixels, light bleed and banding. Nothing flashes.',
    'ogTitle': 'Free dead pixel test for any screen',
    'crumbName': 'Dead Pixel Test',
    'eyebrow': '// FREE SCREEN TEST',
    'h1': 'Free <em class="grad grad--cyan">dead pixel</em> test',
    'lede': 'Fill your screen with one colour at a time to spot dead or stuck pixels, light leaking in at the edges, and patchy or stripy areas. Ideal for a new laptop or monitor while you can still send it back. Nothing to install, and nothing flashes.',
    'chips': ['One colour at a time', 'Laptops, monitors and TVs', 'No flashing'],
    'primaryCta': ['Start the test', '#s1'], 'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
    'ctaHead': 'Found a fault on your screen?',
    'ctaSub': 'We can check whether it&rsquo;s the screen or a setting, and replace laptop screens, with the price agreed first. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'webApp': '365 Techies Dead Pixel Test',
    'atAGlance': [
        ('How to use it', 'Clean the screen, press Start, then tap for each colour and look closely.'),
        ('Dead pixel', 'A dot that stays black on every colour. It usually can&rsquo;t be fixed.'),
        ('Stuck pixel', 'A dot that stays one bright colour. It sometimes clears by itself.'),
        ('Light at the edges', 'On the black screen, in a dark room: backlight bleed. A little is normal on many screens.'),
        ('Stripes in the fade', 'Banding: often a colour setting or cable, sometimes the screen.'),
        ('New screen?', 'Test it straight away. Within 30 days you can reject faulty goods under the Consumer Rights Act.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; THE TEST', 'h2': 'Test your screen for dead pixels',
         'html': '<p>Wipe the screen with a soft, dry cloth first: a speck of dust looks just like a dead pixel. Turn the brightness up, then start the test and look closely at each colour, corner to corner.</p>' + _DPT},
        {'eyebrow': '/02 &mdash; WHAT YOU&rsquo;RE LOOKING FOR', 'h2': 'What each fault looks like',
         'html': '<ul>'
                 '<li><strong>Dead pixel:</strong> a tiny dot that stays black on every colour, easiest to see on white.</li>'
                 '<li><strong>Stuck pixel:</strong> a dot that stays red, green or blue whatever the colour, easiest to see on black.</li>'
                 '<li><strong>Bright (hot) pixel:</strong> a white dot on the black screen.</li>'
                 '<li><strong>Backlight bleed:</strong> pale patches of light at the edges or corners of the black screen, best seen in a dark room. A little is normal on many screens; large bright patches are not.</li>'
                 '<li><strong>Patchy areas:</strong> parts of the grey screen lighter or darker than the rest.</li>'
                 '<li><strong>Banding:</strong> stripes in the black-to-white fade instead of a smooth change. Often a colour setting or the cable; sometimes the screen.</li>'
                 '</ul>'},
        {'eyebrow': '/03 &mdash; WHAT TO DO', 'h2': 'Found one? What to do',
         'html': '<ol>'
                 '<li><strong>Make sure it&rsquo;s not dust.</strong> Wipe gently and test again.</li>'
                 '<li><strong>Give a stuck pixel a few days.</strong> Stuck pixels sometimes clear by themselves with normal use. Dead pixels usually don&rsquo;t.</li>'
                 '<li><strong>Don&rsquo;t press on the screen</strong> or use a &ldquo;pixel fixer&rdquo; that flashes colours quickly. Pressing can damage the screen, and fast flashing can trigger seizures in people with photosensitive epilepsy, which is why this test never flashes.</li>'
                 '<li><strong>Bought it in the last 30 days?</strong> Under the Consumer Rights Act you can reject faulty goods for a refund within 30 days. Whether a single pixel counts as a fault is often decided by the maker&rsquo;s pixel policy, so ask the retailer straight away.</li>'
                 '<li><strong>Check the cable and settings for banding.</strong> Try another cable or port, and make sure the screen runs at its own best resolution and refresh rate: see <a href="/monitor-stuck-at-60hz/">monitor stuck at 60Hz</a>.</li>'
                 '<li><strong>A laptop screen with lines, patches or many dead pixels</strong> usually needs a new screen. We can fit one, with the price agreed first.</li>'
                 '</ol>'},
        {'eyebrow': '/04 &mdash; THE QUICK WAY', 'h2': 'Check your screen&rsquo;s settings with our free app',
         'html': '__APP_BOX_SCREEN__'},
        {'eyebrow': '/05 &mdash; WHEN TO CALL US', 'h2': 'When to call us', 'html': _CALL.replace('If it&rsquo;s the keyboard itself, we collect', 'If it&rsquo;s the laptop screen itself, we collect')},
    ],
    'howToName': 'How to test a screen for dead pixels',
    'howToSteps': [
        {'name': 'Clean the screen', 'text': 'Wipe it with a soft, dry cloth: dust looks like a dead pixel.'},
        {'name': 'Turn the brightness up', 'text': 'Faults are easier to see at full brightness.'},
        {'name': 'Start the full-screen test', 'text': 'The screen fills with one colour at a time.'},
        {'name': 'Look closely at each colour', 'text': 'Black dots on white are dead pixels; coloured dots on black are stuck pixels; light at the edges on black is backlight bleed.'},
        {'name': 'Check the fade', 'text': 'Stripes in the black-to-white fade are banding.'},
    ],
    'faqs': [
        {'q': 'How do I check my screen for dead pixels?', 'a': '<p>Clean the screen, turn the brightness up, and start the full-screen test on this page. Look for dots that stay black on white, or stay coloured on black.</p>'},
        {'q': 'What&rsquo;s the difference between a dead and a stuck pixel?', 'a': '<p>A dead pixel stays black on every colour. A stuck pixel stays one colour, such as red or green. Stuck pixels sometimes clear by themselves; dead pixels usually don&rsquo;t.</p>'},
        {'q': 'Can a dead pixel be fixed?', 'a': '<p>Usually not. A stuck pixel may clear with normal use over a few days. Don&rsquo;t press on the screen or use flashing &ldquo;fixers&rdquo;: pressing can damage it, and fast flashing can trigger seizures in people with photosensitive epilepsy.</p>'},
        {'q': 'Is a dead pixel covered by the warranty?', 'a': '<p>It depends on the maker&rsquo;s pixel policy. Within 30 days of buying, the Consumer Rights Act lets you reject faulty goods, so test a new screen straight away and tell the retailer.</p>'},
        {'q': 'Why is there light at the edges of the black screen?', 'a': '<p>That&rsquo;s backlight bleed. A little is normal on many LCD screens and is easiest to see in a dark room. Large, bright patches can be a fault.</p>'},
        {'q': 'Can I test a TV with it?', 'a': '<p>Yes: open this page in the TV&rsquo;s web browser, or connect a laptop to the TV and test full screen.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/monitor-stuck-at-60hz/">monitor stuck at 60Hz</a>, <a href="/keyboard-test/">keyboard test</a>, <a href="/speaker-and-headphone-test/">speaker and headphone test</a>, <a href="/computer-spec-checker/">check your PC&rsquo;s specs</a> and <a href="/free-tools/">all our free tools</a>.</p>',
}


# ================================================================ 5. Refresh rate test (12 Oct 2026, round 2)
# Bing: "refresh rate test" 3,700 a quarter (UK 193); "ufo test" 25,800 is another site's name, so it's never used here.
# The browser draws once per screen refresh (requestAnimationFrame), so the median gap between frames over ~2.5 s gives the Hz
# of the screen the window is on. Steadiness = share of gaps within 15% of the median; unsteady -> say so. Two lanes: a block
# moving every frame and one moving every other frame (what half the Hz looks like). Reduced motion: lanes still, test runs.
_RRT = ('<div class="rrt" id="rrt">'
        '<div class="rrt__big" aria-live="polite"><b id="rrt-hz">&ndash;</b><span>Hz</span></div>'
        '<p class="rrt__msg" id="rrt-msg">Measuring&hellip; keep this window on screen.</p>'
        '<p class="rrt__go"><button type="button" class="button primary" id="rrt-go">Measure again</button></p>'
        '<div class="rrt__lanes" aria-hidden="true">'
        '<p class="rrt__lab">Every frame (your screen&rsquo;s full speed)</p><div class="rrt__lane"><span class="rrt__blk" id="rrt-a"></span></div>'
        '<p class="rrt__lab">Every other frame (half the speed)</p><div class="rrt__lane"><span class="rrt__blk" id="rrt-b"></span></div>'
        '</div>'
        '<p class="rrt__note">It measures the screen this window is on. Nothing is sent anywhere.</p>'
        '</div>'
        '<style>'
        '.rrt{margin:1rem 0 0;padding:1.2rem 1.25rem;border-radius:18px;border:1px solid rgba(29,151,227,.42);background:linear-gradient(135deg,rgba(29,151,227,.10),rgba(255,255,255,.02));text-align:center}'
        '.rrt__big{display:flex;justify-content:center;align-items:baseline;gap:.4rem}.rrt__big b{font:700 clamp(3.5rem,14vw,6rem)/1 var(--font-body);color:#4fd8c4;font-variant-numeric:tabular-nums}'
        '.rrt__big span{font-size:1.6rem;font-weight:700;color:var(--ink,#eaf4ff)}'
        '.rrt__msg{margin:.6rem auto 0;max-width:40rem;font-size:1rem}.rrt__go{margin:1rem 0 0}.rrt__go .button{min-height:52px;font-size:1.05rem}'
        '.rrt__lanes{margin:1.4rem 0 0;text-align:left}.rrt__lab{margin:.8rem 0 .35rem;font-size:.85rem;color:var(--muted)}'
        '.rrt__lane{position:relative;height:44px;border-radius:10px;background:#0b1019;overflow:hidden;border:1px solid rgba(125,170,220,.25)}'
        '.rrt__blk{position:absolute;top:6px;left:0;width:32px;height:32px;border-radius:7px;background:#4fd8c4;will-change:transform}'
        '.rrt__lane:nth-of-type(2) .rrt__blk{background:#ffb066}'
        '.rrt__note{margin:1rem 0 0;font-size:.8rem;color:var(--muted)}'
        '@media (max-width:520px){.rrt{padding:1rem .8rem}}'
        '</style>'
        '<script>(function(){var R=document.getElementById("rrt");if(!R||!window.requestAnimationFrame)return;function $(i){return document.getElementById(i);}'
        'var COMMON=[24,30,48,50,60,72,75,90,100,120,144,165,170,175,180,200,240,280,300,360,480],t=[],run=false,lastT=0,n=0,x=0,xb=0,'
        'rm=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;'
        'function near(h){var b=COMMON[0];for(var i=0;i<COMMON.length;i++)if(Math.abs(COMMON[i]-h)<Math.abs(b-h))b=COMMON[i];return b;}'
        'function finish(){run=false;var g=[];for(var i=11;i<t.length;i++)g.push(t[i]-t[i-1]);if(g.length<20){$("rrt-msg").textContent="Couldn\\u2019t measure: keep this window on screen and press Measure again.";return;}'
        'var s=g.slice().sort(function(a,b){return a-b;}),med=s[Math.floor(s.length/2)],hz=1000/med,ok=0;for(var j=0;j<g.length;j++)if(Math.abs(g[j]-med)<med*.15)ok++;'
        'var n2=near(hz),steady=ok/g.length>=.7;$("rrt-hz").textContent=Math.abs(n2-hz)<hz*.04?n2:Math.round(hz);'
        'var m="Your screen is refreshing about "+Math.round(hz)+" times a second.";'
        'if(!steady)m+=" The measurement was a little unsteady: close other tabs and busy programs, then measure again.";'
        'else if(n2<=60)m+=" If your monitor or laptop is sold as 90, 120, 144 Hz or more, it\\u2019s running slower than it can: see the steps below.";'
        'else m+=" That\\u2019s a high refresh rate: motion should look smooth.";$("rrt-msg").textContent=m;}'
        'function frame(ts){if(run){t.push(ts);if(ts-t[0]>2500)finish();}'
        'if(!rm){var lane=R.querySelector(".rrt__lane"),w=lane?lane.clientWidth-32:300,dt=lastT?Math.min(100,ts-lastT):16;lastT=ts;x=(x+dt*.48)%Math.max(1,w);n++;if(n%2===0)xb=x;'
        '$("rrt-a").style.transform="translateX("+x.toFixed(1)+"px)";$("rrt-b").style.transform="translateX("+xb.toFixed(1)+"px)";}'
        'requestAnimationFrame(frame);}'
        'function start(){t=[];run=true;$("rrt-hz").textContent="\\u2013";$("rrt-msg").textContent="Measuring\\u2026 keep this window on screen.";}'
        '$("rrt-go").addEventListener("click",start);'
        'document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible"&&run)start();});'
        'setTimeout(start,600);requestAnimationFrame(frame);})();</script>')

REFRESH = {
    'slug': 'refresh-rate-test',
    'title': 'Refresh Rate Test: What Hz Is Your Screen Really Running?',
    'metaDesc': 'Free refresh rate test: see how many hertz your screen is really running at, and how to switch it to its full 120, 144 or 165 Hz in Windows.',
    'ogTitle': 'Free refresh rate test: what Hz is your screen running?',
    'crumbName': 'Refresh Rate Test',
    'eyebrow': '// FREE REFRESH RATE TEST',
    'h1': 'Free <em class="grad grad--cyan">refresh rate</em> test',
    'lede': 'See how many times a second your screen is really refreshing, in hertz (Hz), and compare smooth and half-speed motion side by side. Bought a 144 Hz monitor or a gaming laptop? Check it isn&rsquo;t stuck at 60. Nothing to install.',
    'chips': ['Measures in seconds', 'Any screen, any browser', 'How to fix a 60 Hz screen'],
    'primaryCta': ['Test my screen', '#s1'], 'secondaryCta': ['Gaming PC tune-up', '/gaming-pc-tune-up/'],
    'ctaHead': 'Screen still stuck at 60 Hz?',
    'ctaSub': 'With your permission we connect to your Windows PC and get the screen running at its full speed while you watch. Call 01202 775566 or text 07520 615332.',
    'schemaKind': 'howto',
    'webApp': '365 Techies Refresh Rate Test',
    'atAGlance': [
        ('What it measures', 'How many times a second the screen this window is on redraws: its refresh rate, in hertz.'),
        ('Most screens', '60 Hz. Gaming monitors and laptops are often 120, 144, 165 Hz or more.'),
        ('Says 60 on a 144 Hz monitor?', 'Windows, the cable or the port is holding it back. The fix is usually one setting.'),
        ('The setting', 'Settings, System, Display, Advanced display, Choose a refresh rate.'),
        ('Laptop on battery', 'Some laptops drop to 60 Hz on battery or in battery saver to save power. That&rsquo;s normal.'),
        ('Unsteady result', 'Close other tabs and busy programs, then measure again.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; THE TEST', 'h2': 'Test your screen&rsquo;s refresh rate',
         'html': '<p>The test starts by itself and takes a few seconds. Keep this window on the screen you want to test, and don&rsquo;t scroll while it measures. Two screens? Drag the window to the other one and press <strong>Measure again</strong>.</p>' + _RRT},
        {'eyebrow': '/02 &mdash; WHAT IT MEANS', 'h2': 'What the number means',
         'html': '<ul>'
                 '<li><strong>60 Hz</strong> is normal for most office monitors, TVs and everyday laptops.</li>'
                 '<li><strong>120 to 165 Hz</strong> is common on gaming monitors and gaming laptops: scrolling and games look noticeably smoother.</li>'
                 '<li><strong>240 Hz and above</strong> is for fast competitive games.</li>'
                 '<li><strong>The two moving blocks</strong> show the difference: the top one moves on every refresh, the bottom one on every other, which is what half your screen&rsquo;s speed looks like.</li>'
                 '</ul>'},
        {'eyebrow': '/03 &mdash; STUCK AT 60 HZ?', 'h2': 'Get it running at its full speed',
         'html': '<ol>'
                 '<li><strong>Choose the higher rate in Windows:</strong> Settings, System, Display, <strong>Advanced display</strong>, then <strong>Choose a refresh rate</strong>. Pick the highest number offered. Windows puts the old setting back by itself if the screen goes blank.</li>'
                 '<li><strong>Use the right cable and socket:</strong> DisplayPort, or the HDMI cable that came with the monitor. An old HDMI cable, an adapter, or the motherboard&rsquo;s socket instead of the graphics card&rsquo;s can cap it at 60 Hz.</li>'
                 '<li><strong>Laptops:</strong> plug the charger in and switch off battery saver; some laptops run at 60 Hz on battery to save power.</li>'
                 '<li><strong>Update the graphics driver</strong> from NVIDIA, AMD or Intel, or the laptop maker.</li>'
                 '</ol>'
                 '<p>Every step, in detail: <a href="/monitor-stuck-at-60hz/">monitor stuck at 60Hz</a>.</p>'},
        {'eyebrow': '/04 &mdash; THE QUICK WAY', 'h2': 'Let our free app check your screens', 'html': '__APP_BOX_SCREEN__'},
        {'eyebrow': '/05 &mdash; WHEN TO CALL US', 'h2': 'When to call us',
         'html': _CALL.replace(' If it&rsquo;s the keyboard itself, we collect the laptop free across Bournemouth, Christchurch, Poole and Dorset, tell you the price before any work, repair it and bring it back.', ' Gaming PC? Our <a href="/gaming-pc-tune-up/">gaming PC tune-up</a> sets the screen, drivers and power settings up properly.')},
    ],
    'howToName': 'How to check and fix your screen’s refresh rate',
    'howToSteps': [
        {'name': 'Run the test', 'text': 'Keep this window on the screen you want to test; the result shows in a few seconds.'},
        {'name': 'Compare with the monitor’s rating', 'text': 'Check the refresh rate your monitor or laptop is sold as, such as 144 Hz.'},
        {'name': 'Choose the higher rate in Windows', 'text': 'Settings, System, Display, Advanced display, Choose a refresh rate.'},
        {'name': 'Check the cable and socket', 'text': 'Use DisplayPort or the monitor’s own HDMI cable, plugged into the graphics card.'},
        {'name': 'Measure again', 'text': 'Run the test again to see the new rate.'},
    ],
    'faqs': [
        {'q': 'How do I check my monitor&rsquo;s refresh rate?', 'a': '<p>Run the test on this page, or look in Settings, System, Display, Advanced display, where Windows shows the refresh rate it&rsquo;s using.</p>'},
        {'q': 'Why is my 144 Hz monitor running at 60 Hz?', 'a': '<p>Usually the refresh rate hasn&rsquo;t been chosen in Windows, or the cable or socket can&rsquo;t carry more than 60 Hz. See <a href="/monitor-stuck-at-60hz/">monitor stuck at 60Hz</a>.</p>'},
        {'q': 'Is the test accurate?', 'a': '<p>It measures how often your browser draws the page, which follows the screen&rsquo;s refresh rate. If other programs are busy the result can wobble; close them and measure again.</p>'},
        {'q': 'Why does my laptop show 60 Hz on battery?', 'a': '<p>Many laptops lower the refresh rate on battery or in battery saver to save power. Plug the charger in and measure again.</p>'},
        {'q': 'Does a higher refresh rate matter for everyday use?', 'a': '<p>It makes scrolling and moving windows look smoother, and matters most for games. For email and browsing, 60 Hz is fine.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/monitor-stuck-at-60hz/">monitor stuck at 60Hz</a>, <a href="/dead-pixel-test/">dead pixel test</a>, <a href="/gaming-pc-tune-up/">gaming PC tune-up</a>, <a href="/pc-benchmark/">free PC benchmark</a> and <a href="/free-tools/">all our free tools</a>.</p>',
}


def tool_pages(setup_url):
    """The tool pages, with the 365 PC Manager boxes filled in (pcm_feature_pages_data._app_box: the same box and wording
    as the feature pages, so every claim stays pinned to what the released app does)."""
    import pcm_feature_pages_data as pfp
    boxes = {
        '__APP_BOX_SOUND__': pfp._app_box('sound', 'Sound check: what Windows is really doing with your sound',
            '<p style="margin:0">It shows where your sound is going &mdash; laptop speakers, headphones, a TV &mdash; whether it&rsquo;s muted, the volume and a live level bar, with a test sound and a microphone test. '
            'If Bluetooth headphones are stuck in phone-call mode, it says so by name. It never changes anything itself: it opens Windows&rsquo; Sound settings so you choose.</p>', setup_url),
        '__APP_BOX_SCREEN__': pfp._app_box('screen', 'Screen check: is your screen at its sharpest and smoothest?',
            '<p style="margin:0">For every screen it shows the name and year it was made, the size and refresh rate it&rsquo;s running at, its own best size, and a better setting when Windows offers one. '
            'It never changes the setting itself &mdash; it opens Display settings, and Windows puts the old setting back if the screen goes blank.</p>', setup_url),
    }
    out = []
    for d in (KEYBOARD, SPEAKER, TIMER, DEADPIXEL, REFRESH):
        d = dict(d, sections=[dict(x) for x in d['sections']])
        for x in d['sections']:
            for k, v in boxes.items():
                x['html'] = x['html'].replace(k, v)
        out.append(d)
    return out


TOOL_FLOWS = {
    KEYBOARD['slug']: {'h2': 'Get a dead key working, step by step', 'ask': 'Does the key work now?',
                       'tip': 'Run the keyboard test above again to check every key.',
                       'h3s': 'Still dead after every step? That is a hardware job.',
                       'list_section': 2},   # the "A key doesn't work" list, not the how-to-use steps
    SPEAKER['slug']: {'h2': 'Get both sides working, step by step', 'ask': 'Do both sides work now?',
                      'tip': 'Play left and right again to be sure.',
                      'h3s': 'Still one side silent after every step? That is a remote job, or new headphones.',
                      'list_section': 2},   # "Only one side works"
}
