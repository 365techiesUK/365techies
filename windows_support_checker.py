# -*- coding: utf-8 -*-
"""/is-my-windows-still-supported/ - a free in-page checker (11 Oct 2026; owner: "go ahead with all of them").

Why a tool, not a guide: our Search Console says free in-page tools earn worldwide (computer-spec-checker 841 clicks /
23,564 impressions in 28 days; wifi-signal-test 158; pc-benchmark 48) while general Windows guides earn nothing
(windows-10-end-of-life ~position 39, 0 clicks). So the page answers the question in one click, then points at the free
365 PC Manager, which reads the exact version from Windows and checks Windows 10 ESU enrolment.

What a browser can and cannot tell (Microsoft, learn.microsoft.com/microsoft-edge/web-platform/how-to-detect-win11,
checked 11 Oct 2026): navigator.userAgentData.getHighEntropyValues(['platformVersion']) in Edge, Chrome and Opera gives
1-10 for Windows 10, 13+ for Windows 11, 0 for 7/8/8.1. It does NOT say WHICH Windows 11 version, and Firefox/Safari
give nothing. So the page detects 10 vs 11, then asks the reader to pick the version Settings shows (or type the build).

Dates (Home, Pro, Pro Education, Pro for Workstations), learn.microsoft.com/windows/release-health/windows11-release-
information (updated 30 Sep 2026) - the same table 365 PC Manager uses (Spec.cs Win11End): 26H2 2028-10-10, 26H1
2028-03-14, 25H2 2027-10-12, 24H2 2026-10-13, 23H2 2025-11-11, 22H2 2024-10-08, 21H2 2023-10-10. Builds: 26300 26H2,
28000 26H1, 26200 25H2, 26100 24H2, 22631 23H2, 22621 22H2, 22000 21H2. Windows 10: support ended 14 Oct 2025;
consumer ESU to 12 Oct 2027, free by syncing settings or 1,000 Rewards points, else about $30, needs 22H2 + an admin
Microsoft account (microsoft.com/en-gb/windows/extended-security-updates). Windows 8.1 ended 10 Jan 2023; 7 on 14 Jan 2020.
GUARDS: never claim the page knows the Windows 11 version; Enterprise/Education get no date (longer support); the app
never enrols ESU or extends support - it reads and reports. Re-check the table each October (new version) and when
Microsoft changes ESU.
"""
import build_pages as bp
from build_extra import PCM_SETUP_V30
import pcm_feature_pages_data as _PFP

SLUG = "is-my-windows-still-supported"
CHECKED = "11 October 2026"

TOOL = r'''    <section class="section" aria-label="Windows support checker" id="winchk">
      <div class="wrap" style="max-width:880px">
        <style>
          .wsc{border:1px solid rgba(125,170,220,.28);border-radius:18px;background:rgba(125,170,220,.06);padding:clamp(1.1rem,3vw,1.8rem)}
          .wsc__det{font-size:1.1rem;margin:0 0 1rem}
          .wsc__det strong{color:#fff}
          .wsc__lbl{display:block;font:600 .74rem/1.4 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:1rem 0 .45rem}
          .wsc__opts{display:flex;flex-wrap:wrap;gap:.45rem}
          .wsc__opts button{font:600 .92rem/1.2 var(--font-body);padding:.6rem .85rem;border-radius:10px;border:1px solid rgba(125,170,220,.35);background:rgba(10,22,44,.6);color:var(--ink-2);cursor:pointer;min-height:44px}
          .wsc__opts button[aria-pressed="true"]{border-color:var(--cyan);background:rgba(29,151,227,.18);color:#fff}
          .wsc__opts button.is-likely{border-color:rgba(29,151,227,.6)}
          .wsc__build{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
          .wsc__build input{font:500 1rem/1.2 var(--font-mono);padding:.6rem .8rem;border-radius:10px;border:1px solid rgba(125,170,220,.35);background:rgba(0,0,0,.25);color:#fff;width:12rem;max-width:100%;min-height:44px}
          .wsc__res{margin-top:1.3rem;padding:1.1rem 1.2rem;border-radius:14px;border:1px solid rgba(125,170,220,.3);background:rgba(10,22,44,.7)}
          .wsc__res h3{margin:0 0 .4rem;font-size:1.3rem}
          .wsc__res.good{border-color:rgba(0,206,27,.55)} .wsc__res.good h3{color:#5ee870}
          .wsc__res.warn{border-color:rgba(255,193,7,.6)} .wsc__res.warn h3{color:#ffd24a}
          .wsc__res.bad{border-color:rgba(255,99,99,.6)} .wsc__res.bad h3{color:#ff8a8a}
          .wsc__res ul{margin:.6rem 0 0;padding-left:1.2rem} .wsc__res li{margin:.3rem 0;color:var(--ink-3)}
          .wsc__small{font-size:.85rem;color:var(--muted);margin:.8rem 0 0}
        </style>
        <div class="wsc">
          <p class="eyebrow mono" style="margin:0 0 .5rem">// CHECK THIS PC</p>
          <p class="wsc__det" id="wscDet" aria-live="polite">Checking which Windows this is&hellip;</p>
          <span class="wsc__lbl" id="wscPickL">Now pick the version your PC shows (Settings &gt; System &gt; About)</span>
          <div class="wsc__opts" role="group" aria-labelledby="wscPickL" id="wscOpts">
            <button type="button" data-v="26H2">Windows 11 26H2</button>
            <button type="button" data-v="26H1">Windows 11 26H1</button>
            <button type="button" data-v="25H2">Windows 11 25H2</button>
            <button type="button" data-v="24H2">Windows 11 24H2</button>
            <button type="button" data-v="23H2">Windows 11 23H2</button>
            <button type="button" data-v="22H2">Windows 11 22H2</button>
            <button type="button" data-v="21H2">Windows 11 21H2</button>
            <button type="button" data-v="W10">Windows 10</button>
            <button type="button" data-v="W81">Windows 8.1</button>
            <button type="button" data-v="W7">Windows 7 or older</button>
          </div>
          <label class="wsc__lbl" for="wscBuild">Or type the OS build number (for example 26100.9550)</label>
          <div class="wsc__build"><input id="wscBuild" inputmode="decimal" autocomplete="off" placeholder="26100.9550"><button type="button" class="button secondary" id="wscGo">Check this build</button></div>
          <div class="wsc__res" id="wscRes" aria-live="polite" hidden></div>
          <p class="wsc__small">Dates are for Windows 11 Home and Pro (and Pro Education and Pro for Workstations), from Microsoft&rsquo;s release information, checked __CHECKED__. Enterprise and Education editions get longer. Nothing on this page is sent to us.</p>
        </div>
        <noscript><p>This checker needs JavaScript. To check by hand, press Windows key + R, type <strong>winver</strong> and press Enter, then compare the version with the table below.</p></noscript>
      </div>
      <script>
      (function(){
        var END={'26H2':'2028-10-10','26H1':'2028-03-14','25H2':'2027-10-12','24H2':'2026-10-13','23H2':'2025-11-11','22H2':'2024-10-08','21H2':'2023-10-10'};
        var BUILD={'26300':'26H2','28000':'26H1','26200':'25H2','26100':'24H2','22631':'23H2','22621':'22H2','22000':'21H2'};
        var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
        var det=document.getElementById('wscDet'), res=document.getElementById('wscRes'), opts=document.getElementById('wscOpts');
        function d(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
        function nice(s){var x=d(s);return x.getDate()+' '+MONTHS[x.getMonth()]+' '+x.getFullYear();}
        function left(s){var ms=d(s)-new Date();var days=Math.ceil(ms/86400000);if(days>60)return 'about '+Math.round(days/30.4)+' months from now';if(days>1)return days+' days from now';if(days>=0)return 'within a day';return '';}
        function show(cls,head,body,items){
          var h='<h3>'+head+'</h3><p style="margin:0">'+body+'</p>';
          if(items&&items.length){h+='<ul>';for(var i=0;i<items.length;i++)h+='<li>'+items[i]+'</li>';h+='</ul>';}
          res.className='wsc__res '+cls;res.innerHTML=h;res.hidden=false;
        }
        var UPD='Open <strong>Settings &gt; Windows Update</strong> and click <strong>Check for updates</strong>. Home and Pro PCs not managed by an IT department are moved to a newer version automatically.';
        var HOLD='Newer version not offered? Microsoft may be holding it back on this PC while it fixes a compatibility problem (a &ldquo;safeguard hold&rdquo;). Don&rsquo;t force it; it arrives once fixed.';
        function verdict(v){
          var b=opts.getElementsByTagName('button');for(var i=0;i<b.length;i++)b[i].setAttribute('aria-pressed',b[i].getAttribute('data-v')===v?'true':'false');
          if(END[v]){
            var e=END[v], now=new Date(), ended=d(e)<now, soon=!ended&&(d(e)-now)<183*86400000;
            if(ended) show('bad','Windows 11 '+v+': no longer getting updates','Its last security update was on '+nice(e)+'. Windows still works, but new security holes are no longer fixed.',[UPD,HOLD]);
            else if(soon) show('warn','Windows 11 '+v+': updates end soon','It gets its last security update on <strong>'+nice(e)+'</strong>, '+left(e)+'. Move to the newest version before then.',[UPD,HOLD]);
            else show('good','Windows 11 '+v+': supported','It gets security updates until <strong>'+nice(e)+'</strong>, '+left(e)+'. Keep installing the monthly updates.',['Keep Windows Update switched on, and restart when it asks so the updates finish installing.']);
          } else if(v==='W10'){
            show('warn','Windows 10: support ended on 14 October 2025','Windows 10 now only gets security fixes if the PC is enrolled in Microsoft&rsquo;s Extended Security Updates (ESU), which run to <strong>12 October 2027</strong>.',[
              'Enrol for free: in <strong>Settings &gt; Update &amp; Security &gt; Windows Update</strong>, choose the Extended Security Updates option. It&rsquo;s free if you sync your settings to a Microsoft account, or with 1,000 Microsoft Rewards points; otherwise about $30. It needs Windows 10 version 22H2. <a href="/windows-10-esu-free-enrolment-help/">Step by step</a>.',
              'Or move to Windows 11 if this PC can run it: <a href="/dell-this-pc-cant-run-windows-11/">what to do if it says it can&rsquo;t</a>.',
              'Already enrolled? Microsoft says coverage continues automatically to 12 October 2027.']);
          } else if(v==='W81'){
            show('bad','Windows 8.1: support ended on 10 January 2023','No security updates for over three years. It isn&rsquo;t safe for banking, email or shopping online.',['Move to a supported Windows: check whether this PC can take Windows 11, or replace it.']);
          } else if(v==='W7'){
            show('bad','Windows 7: support ended on 14 January 2020','No security updates for years, and most browsers no longer support it. It isn&rsquo;t safe to use online.',['Move to a supported Windows, or replace the PC. Keep it offline in the meantime if you still need an old program on it.']);
          }
        }
        opts.addEventListener('click',function(ev){var t=ev.target;if(t&&t.getAttribute&&t.getAttribute('data-v'))verdict(t.getAttribute('data-v'));});
        function byBuild(){
          var raw=(document.getElementById('wscBuild').value||'').replace(/[^0-9.]/g,''), major=raw.split('.')[0];
          if(BUILD[major])return verdict(BUILD[major]);
          var n=parseInt(major,10);
          if([10240,10586,14393,15063,16299,17134,17763,18362,18363,19041,19042,19043,19044,19045].indexOf(n)>=0)return verdict('W10');
          show('warn','We don&rsquo;t recognise build '+(major||'(blank)'),'Press Windows key + R, type <strong>winver</strong> and press Enter: the window shows the version and the OS build, for example &ldquo;Version 24H2 (OS Build 26100.9550)&rdquo;. Then pick the version above.',[]);
        }
        document.getElementById('wscGo').addEventListener('click',byBuild);
        document.getElementById('wscBuild').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();byBuild();}});
        function likely(list){var b=opts.getElementsByTagName('button');for(var i=0;i<b.length;i++)if(list.indexOf(b[i].getAttribute('data-v'))>=0)b[i].className='is-likely';}
        function say(h){det.innerHTML=h;}
        var ua=navigator.userAgent||'', uad=navigator.userAgentData;
        if(uad&&uad.getHighEntropyValues){
          uad.getHighEntropyValues(['platformVersion']).then(function(v){
            if(uad.platform!=='Windows'){say('This doesn&rsquo;t look like a Windows PC (your browser says <strong>'+(uad.platform||'another system')+'</strong>). Open this page on the Windows PC you want to check.');return;}
            var maj=parseInt(String(v.platformVersion||'0').split('.')[0],10);
            if(maj>=13){say('This PC is running <strong>Windows 11</strong>. Your browser can&rsquo;t see which version, so pick it below or type the build number.');likely(['26H2','26H1','25H2','24H2','23H2','22H2','21H2']);}
            else if(maj>0){say('This PC is running <strong>Windows 10</strong>.');verdict('W10');}
            else{say('This PC is running <strong>Windows 7, 8 or 8.1</strong>. Pick which below.');likely(['W81','W7']);}
          },function(){say('Your browser wouldn&rsquo;t say which Windows this is. Pick the version below, or type the build number.');});
        } else if(/Windows NT 10\.0/.test(ua)){
          say('This is <strong>Windows 10 or 11</strong> &mdash; this browser can&rsquo;t tell which (Edge or Chrome can). Pick the version below, or type the build number.');
        } else if(/Windows NT 6\.[123]/.test(ua)){
          say('This PC is running <strong>Windows 7, 8 or 8.1</strong>. Pick which below.');likely(['W81','W7']);
        } else if(/Mac|iPhone|iPad|Android|CrOS|Linux/.test(ua)){
          say('This doesn&rsquo;t look like a Windows PC. Open this page on the Windows PC you want to check, or pick its version below.');
        } else { say('Pick the version your PC shows below, or type the build number.'); }
      })();
      </script>
    </section>'''.replace('__CHECKED__', CHECKED)

TABLE = '''    <section class="section section--alt" aria-label="Windows versions and their support dates">
      <div class="wrap" style="max-width:880px" data-reveal>
        <div class="section-head"><h2 class="section-title section-title--center">Every Windows version, and when its updates end<span class="title-underline title-underline--center"></span></h2></div>
        <div class="cmp-wrap" tabindex="0" role="group" aria-label="Support dates (scrolls sideways on a small screen)"><table class="cmp-table" style="min-width:0">
          <thead><tr><th scope="col">Version</th><th scope="col">OS build</th><th scope="col">Updates end (Home &amp; Pro)</th></tr></thead>
          <tbody>
            <tr><th scope="row">Windows 11, version 26H2</th><td>26300</td><td>10 October 2028</td></tr>
            <tr><th scope="row">Windows 11, version 26H1</th><td>28000</td><td>14 March 2028</td></tr>
            <tr><th scope="row">Windows 11, version 25H2</th><td>26200</td><td>12 October 2027</td></tr>
            <tr><th scope="row">Windows 11, version 24H2</th><td>26100</td><td>13 October 2026</td></tr>
            <tr><th scope="row">Windows 11, version 23H2</th><td>22631</td><td>Ended 11 November 2025</td></tr>
            <tr><th scope="row">Windows 11, version 22H2</th><td>22621</td><td>Ended 8 October 2024</td></tr>
            <tr><th scope="row">Windows 11, version 21H2</th><td>22000</td><td>Ended 10 October 2023</td></tr>
            <tr><th scope="row">Windows 10</th><td>19045 (22H2)</td><td>Ended 14 October 2025; ESU to 12 October 2027</td></tr>
            <tr><th scope="row">Windows 8.1</th><td>&ndash;</td><td>Ended 10 January 2023</td></tr>
            <tr><th scope="row">Windows 7</th><td>&ndash;</td><td>Ended 14 January 2020</td></tr>
          </tbody></table></div>
        <p style="font-size:.9rem;color:var(--muted);margin:.9rem 0 0;text-align:center">Sources: <a href="https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information" rel="noopener" target="_blank">Microsoft Windows 11 release information</a> and <a href="https://www.microsoft.com/en-gb/windows/extended-security-updates" rel="noopener" target="_blank">Windows 10 Extended Security Updates</a>, checked ''' + CHECKED + '''. Windows 11 26H1 comes only on certain new PCs. Enterprise and Education editions are supported for longer.</p>
      </div>
    </section>'''

HOWTO = '''    <section class="section" aria-label="How to check your Windows version by hand">
      <div class="wrap prose" style="max-width:880px" data-reveal>
        <p class="eyebrow mono">// CHECK IT BY HAND</p>
        <h2>Find your exact version in ten seconds</h2>
        <ol>
          <li>Press the <strong>Windows key + R</strong>, type <strong>winver</strong> and press Enter.</li>
          <li>The window says, for example, <strong>Version 24H2 (OS Build 26100.9550)</strong>. The part before the brackets is your version.</li>
          <li>Or open <strong>Settings &gt; System &gt; About</strong> and look under <em>Windows specifications</em> for Edition, Version and OS build.</li>
        </ol>
        <p>A version that has reached the end of its updates still works, but security holes found after that date are not fixed. On Windows 11 the answer is usually just to let Windows Update move you to the newest version. On Windows 10, the choice is the free Extended Security Updates enrolment, moving to Windows 11 if the PC can run it, or a new PC.</p>
      </div>
    </section>'''


def page():
    box = _PFP._app_box('updates', 'Windows Update, read from Windows itself',
        '<p style="margin:0">Our free app reads the exact Windows version from Windows itself, says whether the monthly updates are actually arriving and how long this version will keep getting them, and on Windows 10 checks whether this PC is really enrolled in Extended Security Updates. '
        'It reads and reports: it doesn&rsquo;t enrol you in anything or change Windows.</p>', PCM_SETUP_V30)
    app = ('    <section class="section" aria-label="The free app">\n      <div class="wrap" style="max-width:980px">\n'
           '        <p class="eyebrow mono">// THE EXACT ANSWER</p>\n        <h2 style="margin:0 0 1rem">Want the exact version and your ESU status?</h2>\n'
           '        ' + box + '\n      </div>\n    </section>')
    faqs = [
        ("Is Windows 10 still supported?",
         "Microsoft&rsquo;s free support for Windows 10 ended on 14 October 2025. A Windows 10 PC only gets security fixes now if it is enrolled in Extended Security Updates, which run to 12 October 2027 and are free if you sync your settings to a Microsoft account or use 1,000 Microsoft Rewards points (otherwise about $30). <a href=\"/windows-10-esu-free-enrolment-help/\">How to enrol</a>."),
        ("What happens when my Windows version stops getting updates?",
         "Windows keeps working, but any security hole found after that date stays open. That matters most for anything you do online: email, banking and shopping. Moving to a supported version closes the gap."),
        ("How do I update to the newest Windows 11 version?",
         "Open Settings, then Windows Update, and click Check for updates. Microsoft moves Home and Pro PCs that aren&rsquo;t managed by an IT department to the newer version automatically. If it isn&rsquo;t offered, Microsoft may be holding it back on that PC for a compatibility problem; don&rsquo;t force it."),
        ("Why can&rsquo;t this page tell exactly which Windows 11 version I have?",
         "Browsers only share whether a PC runs Windows 10 or Windows 11, not which version, and Firefox and Safari don&rsquo;t share even that. Press Windows key + R, type winver and press Enter to see your version, then pick it on the checker."),
        ("Do Enterprise and Education editions have the same dates?",
         "No. Windows 11 Enterprise and Education versions are supported for 36 months instead of 24, so their dates are later. The dates here are for Home, Pro, Pro Education and Pro for Workstations."),
    ]
    content = "\n".join([
        bp.hero(bp.bc("Is My Windows Still Supported?"), "// FREE WINDOWS SUPPORT CHECKER",
                'Is your Windows <em class="grad grad--cyan">still supported?</em>',
                "One click tells you whether this PC runs Windows 10 or 11; pick the version it shows and you get the date its security updates end, in plain words, with what to do next. Nothing is sent to us.",
                cta1=("Check this PC", "#winchk"), cta2=("Windows 10 ESU help", "/windows-10-esu-free-enrolment-help/"),
                chips=["Instant &amp; free", "Microsoft&rsquo;s own dates", "Checked " + CHECKED]),
        TOOL,
        TABLE,
        HOWTO,
        app,
        bp.faq_html(faqs),
        bp.cta("Updates stuck, or not sure what to do?",
               "If Windows Update keeps failing, a newer version is never offered, or you&rsquo;re weighing up ESU against a new PC, we check it remotely while you watch. Remote help from &pound;20, no fix, no fee.",
               primary=("Call 01202 775566", "tel:+441202775566"), secondary=("Windows 11 support", "/windows-11-support/")),
    ])
    desc = "Free checker: is your Windows still getting security updates? See whether this PC runs Windows 10 or 11, the date its updates end, and what to do next."

    def schema(s, _desc=desc, _faqs=faqs):
        return bp.graph([bp.crumb(s, "Is My Windows Still Supported?"), bp.webpage(s, "Is My Windows Still Supported? Free Checker", _desc),
                         {"@type": "WebApplication", "name": "365 Techies Windows Support Checker", "applicationCategory": "UtilitiesApplication",
                          "operatingSystem": "Web", "url": bp.SITE + "/" + s + "/", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"}},
                         bp.faqpage(s, _faqs)])
    bp.add(slug=SLUG, title="Is My Windows Still Supported? Free Checker | 365 Techies", desc=desc,
           og_title="Is My Windows Still Supported? Check in One Click", schema=schema, content=content)


page()
