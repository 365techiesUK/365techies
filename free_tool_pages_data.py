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
    'crossLinksHtml': '<p>Related: <a href="/how-to-turn-off-sticky-keys/">how to turn off Sticky Keys</a>, <a href="/webcam-mic-test/">webcam, mic and speaker test</a>, <a href="/computer-spec-checker/">check your PC&rsquo;s specs</a>, <a href="/computer-fault-checker/">the computer fault checker</a> and <a href="/free-tools/">all our free tools</a>.</p>',
}

TOOL_PAGES = [KEYBOARD]

TOOL_FLOWS = {
    KEYBOARD['slug']: {'h2': 'Get a dead key working, step by step', 'ask': 'Does the key work now?',
                       'tip': 'Run the keyboard test above again to check every key.',
                       'h3s': 'Still dead after every step? That is a hardware job.',
                       'list_section': 2},   # the "A key doesn't work" list, not the how-to-use steps
}
