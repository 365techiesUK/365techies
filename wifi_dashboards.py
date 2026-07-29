# -*- coding: utf-8 -*-
"""Custom Wi-Fi & mesh dashboards - the flagship service page, with a live demo.

Sister page to /custom-vrm-dashboards/. Same commercial model (bespoke, built
by us, quote-based, worldwide) applied to business wireless instead of solar.

The argument, and it is the same one the R510 playbook makes: every vendor
controller shows you COVERAGE, because coverage is easy to draw and looks
reassuring. Almost none of them put the things that actually cause faults on
one screen - channel utilisation, PoE headroom, noise floor, and how all
three move together as a building fills up. So a floor can be green
everywhere and unusable at 11am, and nobody can explain why.

The demo below is synthetic and says so. It models an 18-AP estate through a
working day, with a deliberate fault built in: AP 07 sits on a congested
channel and its clients suffer while its signal stays strong - the exact
failure a coverage map cannot show you.
"""
import build_pages as bp
from build_pages import add, graph, crumb, webpage, service, faqpage, faq_html, cta, hero

SLUG = "custom-wifi-dashboards"

DEMO = r"""
<section class="section" aria-label="Live demo dashboard">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow eyebrow--center mono" data-reveal>// LIVE DEMO &middot; SAMPLE DATA &middot; SWIPE OR USE THE ARROWS</p>
      <h2 class="section-title section-title--center" data-title>Three screens, built around the
        faults<span class="title-underline"></span></h2>
      <p class="lede lede--center" data-reveal>Eighteen access points through a working day.
        Watch the floor fill, then swipe to see exactly why one access point goes red while
        its signal stays perfect.</p>
    </div>

    <div class="wd" id="wd">
      <div class="wd__bar">
        <div class="wd__clock"><span id="wdTime">08:00</span><em id="wdScreen">Estate</em></div>
        <div class="wd__kpis">
          <div class="wd__kpi"><b id="wdClients">0</b><span>clients</span></div>
          <div class="wd__kpi"><b id="wdUtil">0%</b><span>worst channel</span></div>
          <div class="wd__kpi"><b id="wdPoe">0W</b><span>PoE draw</span></div>
          <div class="wd__kpi"><b id="wdAlert">0</b><span>needs a look</span></div>
        </div>
        <div class="wd__ctl">
          <button class="wd__btn" id="wdPrev" type="button" aria-label="Previous screen">&#8249;</button>
          <div class="wd__dots" id="wdDots" role="tablist" aria-label="Dashboard screens"></div>
          <button class="wd__btn wd__btn--pulse" id="wdNext" type="button" aria-label="Next screen">&#8250;</button>
          <button class="wd__btn" id="wdFs" type="button" aria-label="Full screen">&#9974;</button>
          <button class="wd__btn" id="wdPlay" type="button" aria-label="Pause">&#10073;&#10073;</button>
        </div>
      </div>

      <div class="wd__viewport" id="wdViewport"><div class="wd__track" id="wdTrack">

        <div class="wd__screen" role="tabpanel" aria-label="Estate">
          <div class="wd__grid" id="wdGrid" role="list" aria-label="Access point estate"></div>
          <div class="wd__chart">
            <canvas id="wdCanvas" width="1100" height="210" aria-label="Channel utilisation and client count through the day"></canvas>
            <div class="wd__legend">
              <span><i style="background:#1d97e3"></i>clients on site</span>
              <span><i style="background:#e0b341"></i>worst channel utilisation</span>
              <span><i style="background:#e8637e"></i>where people start complaining</span>
            </div>
          </div>
        </div>

        <div class="wd__screen" role="tabpanel" aria-label="Channels">
          <p class="wd__h">2.4GHz has three non-overlapping channels. Here is who is using them.</p>
          <div class="wd__chan" id="wdChan"></div>
          <p class="wd__note">The pale bars are radios we do not own &mdash; vehicles, neighbours,
            equipment nobody thinks of as a radio. You cannot channel-plan around them, only
            around each other. This is what a coverage map cannot show you.</p>
        </div>

        <div class="wd__screen" role="tabpanel" aria-label="PoE budget">
          <p class="wd__h">Switch PoE budget &mdash; the number that decides whether an upgrade is possible.</p>
          <div class="wd__poe">
            <div class="wd__poebar"><i id="wdPoeNow"></i><u id="wdPoeAfter"></u></div>
            <div class="wd__poekeys">
              <span><i style="background:#1d97e3"></i>drawing now <b id="wdPoeA">0W</b></span>
              <span><i style="background:#e0b341"></i>after an all-R550 upgrade <b id="wdPoeB">337W</b></span>
              <span><i style="background:#e8637e"></i>a 370W switch ceiling</span>
            </div>
          </div>
          <p class="wd__note">Eighteen access points at 802.3at want roughly 337&nbsp;W. That sits
            inside a 370&nbsp;W switch and outside a 195&nbsp;W one &mdash; which is why the switch,
            not the access point, is usually the real purchase.</p>
        </div>

      </div></div>

      <p class="wd__note" id="wdNote">Everything is green. Nobody has arrived yet.</p>
    </div>
  </div>
</section>

<style>
.wd{background:var(--panel,#0d1530);border:1px solid var(--line,#2a3b63);border-radius:16px;padding:1.1rem;max-width:1160px;margin:0 auto}
.wd__bar{display:flex;flex-wrap:wrap;gap:1rem;align-items:center;justify-content:space-between;margin-bottom:1rem}
.wd__clock{font-family:var(--mono,ui-monospace,monospace);line-height:1}
.wd__clock span{font-size:1.9rem;font-weight:800;color:var(--white,#f0f5fc)}
.wd__clock em{display:block;font-style:normal;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:var(--mut,#9fb5d3);margin-top:.25rem}
.wd__kpis{display:flex;gap:1.4rem;flex-wrap:wrap}
.wd__kpi b{display:block;font-size:1.35rem;font-weight:800;color:var(--white,#f0f5fc);font-variant-numeric:tabular-nums}
.wd__kpi span{font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;color:var(--mut,#9fb5d3)}
.wd__ctl{display:flex;align-items:center;gap:.4rem}
.wd__btn{background:transparent;border:1px solid var(--line,#2a3b63);color:var(--soft,#86b6e8);border-radius:8px;min-width:38px;height:34px;font:inherit;font-size:1rem;cursor:pointer;line-height:1}
.wd__btn:hover,.wd__btn:focus-visible{border-color:var(--cyan,#1d97e3);color:var(--cyan,#1d97e3)}
.wd__btn--pulse{animation:wdPulse 2.4s ease-in-out infinite}
@keyframes wdPulse{0%,100%{box-shadow:0 0 0 0 rgba(29,151,227,.5)}50%{box-shadow:0 0 0 7px rgba(29,151,227,0)}}
.wd__dots{display:flex;gap:.3rem;padding:0 .3rem}
.wd__dots button{width:8px;height:8px;padding:0;border-radius:50%;border:0;background:#2a3b63;cursor:pointer}
.wd__dots button[aria-selected="true"]{background:var(--cyan,#1d97e3);width:20px;border-radius:4px}
.wd__viewport{overflow:hidden;border-radius:12px;touch-action:pan-y}
.wd__track{display:flex;transition:transform .45s cubic-bezier(.4,0,.2,1)}
.wd__screen{min-width:100%;flex:0 0 100%}
.wd__h{margin:0 0 .7rem;font-size:.82rem;color:var(--soft,#86b6e8)}
.wd__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:.5rem;margin-bottom:1rem}
.wd__ap{background:#0b1226;border:1px solid var(--line,#2a3b63);border-radius:10px;padding:.5rem .55rem;transition:border-color .4s,background .4s}
.wd__ap b{display:block;font-family:var(--mono,monospace);font-size:.7rem;color:var(--mut,#9fb5d3);letter-spacing:.06em}
.wd__ap i{display:block;font-style:normal;font-size:1.15rem;font-weight:800;color:var(--white,#f0f5fc);font-variant-numeric:tabular-nums;line-height:1.3}
.wd__ap u{display:block;text-decoration:none;font-size:.6rem;letter-spacing:.08em;text-transform:uppercase;color:var(--mut,#9fb5d3)}
.wd__ap.is-warn{border-color:#e0b341;background:#1d1704}
.wd__ap.is-bad{border-color:#e8637e;background:#2a0f18}
.wd__ap.is-bad i{color:#ff9db1}
.wd__chart canvas{width:100%;height:auto;display:block}
.wd__legend{display:flex;gap:1.2rem;flex-wrap:wrap;margin-top:.5rem;font-size:.7rem;color:var(--mut,#9fb5d3)}
.wd__legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:.35rem;vertical-align:middle}
.wd__chan{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem}
.wd__ch{background:#0b1226;border:1px solid var(--line,#2a3b63);border-radius:10px;padding:.7rem}
.wd__ch b{display:block;font-family:var(--mono,monospace);font-size:.72rem;color:var(--mut,#9fb5d3);margin-bottom:.5rem}
.wd__stack{display:flex;flex-direction:column-reverse;gap:2px;height:120px;justify-content:flex-start}
.wd__seg{border-radius:2px;background:#1d97e3;transition:height .6s}
.wd__seg.foreign{background:rgba(134,182,232,.28)}
.wd__ch u{display:block;text-decoration:none;margin-top:.5rem;font-size:.7rem;color:var(--mut,#9fb5d3)}
.wd__ch.is-bad{border-color:#e8637e}
.wd__poe{margin:.4rem 0 .8rem}
.wd__poebar{position:relative;height:34px;border-radius:8px;background:#0b1226;border:1px solid var(--line,#2a3b63);overflow:hidden}
.wd__poebar i{position:absolute;left:0;top:0;bottom:0;background:#1d97e3;transition:width .6s;display:block}
.wd__poebar u{position:absolute;top:0;bottom:0;border-right:2px dashed #e0b341;display:block}
.wd__poebar::after{content:"";position:absolute;top:0;bottom:0;right:0;border-right:2px solid #e8637e}
.wd__poekeys{display:flex;gap:1.2rem;flex-wrap:wrap;margin-top:.6rem;font-size:.72rem;color:var(--mut,#9fb5d3)}
.wd__poekeys i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:.35rem}
.wd__poekeys b{color:var(--white,#f0f5fc);margin-left:.3rem}
.wd__note{margin:.9rem 0 0;padding:.7rem .9rem;border-left:3px solid var(--cyan,#1d97e3);background:#0b1226;border-radius:0 8px 8px 0;font-size:.86rem;color:var(--soft,#86b6e8);min-height:2.6em}
.wd:fullscreen{max-width:none;width:100%;height:100%;border-radius:0;border:0;padding:2rem 3rem;display:flex;flex-direction:column;justify-content:center;background:radial-gradient(ellipse at 50% 0%,#12203f 0%,#070c1a 70%)}
.wd:fullscreen .wd__clock span{font-size:3.2rem}
.wd:fullscreen .wd__kpi b{font-size:2.2rem}
.wd:fullscreen .wd__note{font-size:1.05rem}
.wd:fullscreen .wd__stack{height:200px}
.wd:fullscreen .wd__btn{min-width:48px;height:44px;font-size:1.2rem}
@media (max-width:640px){.wd__kpis{gap:1rem}.wd__kpi b{font-size:1.1rem}.wd__chan{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.wd__track{transition:none}.wd__btn--pulse{animation:none}.wd__seg,.wd__poebar i{transition:none}}
</style>

<script>
(function(){
  var root=document.getElementById('wd'); if(!root) return;
  var track=document.getElementById('wdTrack'), vp=document.getElementById('wdViewport');
  var N3=track.children.length, cur=0, LAB=['Estate','Channels','PoE budget'];
  var $=function(i){return document.getElementById(i);};
  var dots=$('wdDots');
  for(var d=0;d<N3;d++){(function(k){
    var b=document.createElement('button'); b.type='button'; b.setAttribute('role','tab');
    b.setAttribute('aria-label','Screen '+(k+1)+': '+LAB[k]);
    b.addEventListener('click',function(){go(k);}); dots.appendChild(b);
  })(d);}
  function go(i){
    cur=(i+N3)%N3; track.style.transform='translateX(-'+(cur*100)+'%)';
    $('wdScreen').textContent=LAB[cur];
    [].forEach.call(dots.children,function(b,k){b.setAttribute('aria-selected',k===cur?'true':'false');});
    $('wdNext').classList.remove('wd__btn--pulse');
  }
  $('wdNext').addEventListener('click',function(){go(cur+1);});
  $('wdPrev').addEventListener('click',function(){go(cur-1);});
  root.tabIndex=0;
  root.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight')go(cur+1); else if(e.key==='ArrowLeft')go(cur-1);
  });
  var x0=null;
  vp.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});
  vp.addEventListener('touchend',function(e){
    if(x0===null)return; var dx=e.changedTouches[0].clientX-x0;
    if(Math.abs(dx)>45) go(cur+(dx<0?1:-1)); x0=null;
  },{passive:true});
  $('wdFs').addEventListener('click',function(){
    if(document.fullscreenElement) document.exitFullscreen();
    else if(root.requestFullscreen) root.requestFullscreen().catch(function(){});
  });
  var playing=true;
  $('wdPlay').addEventListener('click',function(){playing=!playing;this.innerHTML=playing?'&#10073;&#10073;':'&#9654;';});

  // --- estate ---
  var g=$('wdGrid'), N=18, aps=[], hist=[], t=0, BAD=6;
  for(var i=0;i<N;i++){
    var el=document.createElement('div'); el.className='wd__ap'; el.setAttribute('role','listitem');
    el.innerHTML='<b>AP '+String(i+1).padStart(2,'0')+'</b><i>0</i><u>clients</u>';
    g.appendChild(el);
    aps.push({el:el,n:el.querySelector('i'),u:el.querySelector('u'),base:0.5+Math.random()*0.9});
  }
  // --- channel map ---
  var chans=[1,6,11], chEls=[];
  chans.forEach(function(c){
    var el=document.createElement('div'); el.className='wd__ch';
    el.innerHTML='<b>Channel '+c+'</b><div class="wd__stack"></div><u></u>';
    $('wdChan').appendChild(el);
    chEls.push({el:el,stack:el.querySelector('.wd__stack'),lab:el.querySelector('u')});
  });
  var cv=$('wdCanvas'), cx=cv.getContext('2d');

  function curve(h){
    if(h<8.5)return 0.04; if(h<10)return 0.04+(h-8.5)*0.42;
    if(h<13)return 0.66+(h-10)*0.10; if(h<14)return 0.96;
    if(h<17)return 0.96-(h-14)*0.07; if(h<18.5)return 0.75-(h-17)*0.42; return 0.06;
  }
  function frame(){
    if(playing){ t+=0.055; if(t>10.5){t=0;hist=[];} }
    var h=8+t, load=curve(h), total=0, worst=0, poe=0, alerts=0;
    for(var i=0;i<N;i++){
      var a=aps[i], c=Math.max(0,Math.round(load*a.base*11));
      var util=Math.min(99,Math.round((c/11)*55+(i===BAD?34+load*30:Math.random()*6)));
      total+=c; poe+=12.6; if(util>worst)worst=util;
      a.n.textContent=c; a.u.textContent=util>72?util+'% busy':'clients';
      a.el.className='wd__ap'+(util>72?' is-bad':(util>55?' is-warn':''));
      if(util>72)alerts++;
    }
    $('wdTime').textContent=String(Math.floor(h)).padStart(2,'0')+':'+String(Math.floor((h%1)*60)).padStart(2,'0');
    $('wdClients').textContent=total; $('wdUtil').textContent=worst+'%';
    $('wdPoe').textContent=Math.round(poe)+'W'; $('wdAlert').textContent=alerts;

    // channel stacks: ours vs radios we do not own (ch11 is where the stock sits)
    chEls.forEach(function(ch,k){
      var ours=Math.round(load*(k===2?4:6)), foreign=(k===2?Math.round(6+load*11):Math.round(1+load*2));
      ch.stack.innerHTML='';
      for(var q=0;q<ours;q++){var s=document.createElement('div');s.className='wd__seg';s.style.height='6px';ch.stack.appendChild(s);}
      for(var q2=0;q2<foreign;q2++){var s2=document.createElement('div');s2.className='wd__seg foreign';s2.style.height='6px';ch.stack.appendChild(s2);}
      ch.lab.textContent=ours+' ours &middot; '+foreign+' not ours';
      ch.lab.innerHTML=ours+' ours &middot; <strong>'+foreign+' not ours</strong>';
      ch.el.className='wd__ch'+(foreign>8?' is-bad':'');
    });

    // poe screen
    var nowW=Math.round(poe+2*18.71), after=337, ceil=370;
    $('wdPoeNow').style.width=Math.min(100,nowW/ceil*100)+'%';
    $('wdPoeAfter').style.left=Math.min(100,after/ceil*100)+'%';
    $('wdPoeA').textContent=nowW+'W';

    $('wdNote').textContent = worst>72
      ? 'AP 07 is at '+worst+'% channel utilisation while its signal stays strong. Every coverage map on site says this corner is fine. It is not \u2014 the air is full, and no amount of extra signal fixes that.'
      : (worst>55?'The floor is filling and channel utilisation is climbing. This is where complaints usually start, about an hour before anyone reports it.'
                 :'Everything is green. Nobody has arrived yet.');
    hist.push([total,worst]); if(hist.length>170)hist.shift();
    draw(); requestAnimationFrame(frame);
  }
  function draw(){
    var W=cv.width,H=cv.height; cx.clearRect(0,0,W,H);
    cx.strokeStyle='rgba(255,255,255,.06)';cx.lineWidth=1;
    for(var y=0;y<=4;y++){var yy=18+y*(H-36)/4;cx.beginPath();cx.moveTo(0,yy);cx.lineTo(W,yy);cx.stroke();}
    cx.strokeStyle='rgba(232,99,126,.55)';cx.setLineDash([5,5]);cx.beginPath();
    var ty=H-18-(72/100)*(H-36);cx.moveTo(0,ty);cx.lineTo(W,ty);cx.stroke();cx.setLineDash([]);
    if(hist.length<2)return;
    var step=W/169;
    function line(idx,max,col,fill){
      cx.beginPath();
      for(var i=0;i<hist.length;i++){var x=i*step,y=H-18-(Math.min(hist[i][idx],max)/max)*(H-36); i?cx.lineTo(x,y):cx.moveTo(x,y);}
      cx.strokeStyle=col;cx.lineWidth=2.2;cx.stroke();
      if(fill){cx.lineTo((hist.length-1)*step,H-18);cx.lineTo(0,H-18);cx.closePath();cx.fillStyle=fill;cx.fill();}
    }
    line(0,140,'#1d97e3','rgba(29,151,227,.13)'); line(1,100,'#e0b341',null);
  }
  go(0); requestAnimationFrame(frame);
})();
</script>
"""


def build():
    faqs = [
        ("What does a custom Wi-Fi dashboard show that my controller doesn't?",
         "Vendor controllers are built around coverage, because coverage is easy to draw and "
         "looks reassuring. What they rarely put on one screen is channel utilisation, PoE "
         "headroom, noise floor and client counts moving together over time. That combination is "
         "what explains a floor that is green everywhere and unusable at eleven in the morning."),
        ("Do you replace my existing controller?",
         "No. We read from what you already have and present it properly. Your controller stays "
         "exactly where it is, doing its job - we are adding a view, not another system to "
         "manage, and nothing we build changes how your wireless runs."),
        ("Will this work with RUCKUS, UniFi, Aruba or Meraki?",
         "It depends on what your platform exposes and how, which is the first thing we check "
         "and the first thing we would tell you if the answer were no. Most business wireless "
         "platforms offer an API or an export; some are far more generous than others. We will "
         "not promise a build before we have confirmed we can read your data."),
        ("What does it cost?",
         "It is quoted per site, because a two-access-point office and an eighteen-access-point "
         "sales floor across two acres are not the same job. We publish no price for this work - "
         "we would rather give you a real number after seeing what you have than a fake one on a "
         "web page."),
        ("Do you only do this for customers in Dorset?",
         "No. Dashboards are built and delivered remotely, so this is a service we provide "
         "anywhere - the same way our custom Victron dashboards run for customers well outside "
         "the UK. On-site survey work is Dorset and the surrounding counties."),
        ("Why would I want this rather than just replacing the access points?",
         "Because replacing the access points is the expensive way to find out what was wrong. "
         "A dashboard that shows channel utilisation and PoE headroom over a fortnight will "
         "usually tell you whether new hardware would help at all - and quite often the honest "
         "answer is that it would not."),
    ]

    body = "\n".join([
        DEMO,

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Why coverage maps keep letting people down'
        '<span class="title-underline"></span></h2>',
        '<p>Every wireless controller draws you a coverage map, because coverage is easy to '
        'measure, easy to colour in, and reassuring to look at. Green everywhere, job done.</p>',
        '<p>The trouble is that <strong>coverage is almost never the fault</strong>. A floor can '
        'have flawless signal in every corner and still be unusable at eleven in the morning, '
        'because the channel is full &mdash; of your own access points talking over each other, '
        'of the building next door, or of equipment nobody thought of as a radio at all.</p>',
        '<p>Signal strength and usability look identical on a coverage map. That is the whole '
        'problem, and it is why so many estates get replaced without anything getting better.</p>',
        '</div></section>',

        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>What we put on the screen instead'
        '<span class="title-underline"></span></h2>',
        '<div class="table-wrap"><table class="table">',
        '<thead><tr><th>What we show</th><th>Why it earns its place</th></tr></thead><tbody>',
        '<tr><td><strong>Channel utilisation over time</strong></td>'
        '<td>The single best predictor of complaints, and the one most often missing. It tells '
        'you the air is full an hour before anyone reports it.</td></tr>',
        '<tr><td><strong>PoE draw against switch budget</strong></td>'
        '<td>Shows headroom before you add the camera, the door controller or the next access '
        'point &mdash; rather than discovering the ceiling during a trading day.</td></tr>',
        '<tr><td><strong>Noise floor, and how it moves</strong></td>'
        '<td>If interference rises and falls with what is in the building, that is a fact you '
        'can act on rather than a theory you can argue about.</td></tr>',
        '<tr><td><strong>Clients per AP, not just totals</strong></td>'
        '<td>Two access points holding everything while sixteen idle is a design problem, and '
        'invisible in a site-wide number.</td></tr>',
        '<tr><td><strong>Reboots and uptime per unit</strong></td>'
        '<td>An access point that restarts more than its neighbours is telling you something &mdash; '
        'usually power, occasionally heat.</td></tr>',
        '<tr><td><strong>Multi-site fleet view</strong></td>'
        '<td>Every branch on one screen, worst-first, so the estate tells you where to look '
        'instead of waiting for someone to ring.</td></tr>',
        '</tbody></table></div>',
        '<p>None of it is exotic. It is simply the set of numbers an engineer actually asks for '
        'when diagnosing a floor &mdash; put on one screen, kept over time, and made to explain '
        'itself.</p>',
        '</div></section>',

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>We have done this before, on something harder'
        '<span class="title-underline"></span></h2>',
        '<p>This is not a new idea for us. We build <a href="/custom-vrm-dashboards/">custom '
        'Victron dashboards</a> for off-grid power systems worldwide &mdash; and we run our own '
        'business off one, because our office is a van. Those dashboards do for solar and battery '
        'exactly what this does for wireless: take a platform that shows you what it was designed '
        'to show, and add the numbers the owner actually needs.</p>',
        '<p>You can see the thinking that sits behind this applied to a real wireless problem in '
        'our <a href="/ruckus-r510-unreliable-wifi-fix/">R510 field playbook</a> &mdash; a '
        'step-by-step diagnosis of an eighteen access point estate, written for an IT manager and '
        'given away in full.</p>',
        '</div></section>',

        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>How it works, and what it costs'
        '<span class="title-underline"></span></h2>',
        '<ol>',
        '<li><strong>We check we can read your data.</strong> First conversation, before anything '
        'is promised. Some platforms are generous, some are not, and we will tell you which yours '
        'is.</li>',
        '<li><strong>We agree what belongs on the screen.</strong> Your problems, not a template. '
        'A dashboard that shows everything shows nothing.</li>',
        '<li><strong>We build it and you use it for a fortnight.</strong> Real data, real days. '
        'That is when you find out whether it answers the question you actually had.</li>',
        '<li><strong>We adjust it.</strong> Everyone changes something after two weeks of looking '
        'at their own numbers. That is the point.</li>',
        '</ol>',
        '<p><strong>Cost is quoted per site.</strong> We publish no price for this, because a '
        'two-access-point office and an eighteen access point sales floor are not the same job, '
        'and a number on a web page would be a made-up one. It is not a licence and there is no '
        'per-access-point fee.</p>',
        '<p>And the honest caveat, which is the same one on everything else we write: if a '
        'fortnight of your own data shows the estate is fine and the switches are the constraint, '
        'that is what the dashboard will tell you &mdash; and you will have saved considerably '
        'more than it cost.</p>',
        '</div></section>',

        faq_html(faqs),
        cta("Talk it through &mdash; no visit, no obligation",
            "Tell us what platform you run and what the complaint is, and we will tell you "
            "honestly whether a dashboard would help. If it would not, we will say so.",
            primary=("Call 01202 775566", "tel:+441202775566"),
            secondary=("Send us a message", "/contact/")),
    ])

    def schema(s):
        return graph([
            crumb(s, "Custom Wi-Fi Dashboards"),
            webpage(s, "Custom Wi-Fi & Mesh Dashboards",
                    "Bespoke business wireless dashboards showing channel utilisation, PoE "
                    "headroom and noise floor over time."),
            service(s, "Custom Wi-Fi & Mesh Network Dashboards",
                    "Bespoke dashboards built on top of your existing wireless controller, "
                    "showing the measurements that explain faults rather than coverage maps.",
                    "Network monitoring dashboard"),
            faqpage(s, faqs),
        ])

    content = "\n".join([
        hero(bp.crumbs_html("Custom Wi-Fi Dashboards") if hasattr(bp, "crumbs_html") else "",
             "// CUSTOM DASHBOARDS &middot; BUSINESS WI-FI",
             'Custom <em class="grad grad--cyan">Wi-Fi &amp; mesh dashboards</em>, built around '
             'your actual faults',
             "Your controller shows you coverage. We build you the screen that shows channel "
             "utilisation, PoE headroom and noise floor over time &mdash; the numbers that "
             "actually explain why a floor with perfect signal is unusable at eleven in the "
             "morning.",
             cta1=("Talk to a human: 01202 775566", "tel:+441202775566"),
             cta2=("See the live demo", "#wd"),
             chips=["Built on your existing controller", "Multi-site fleet view",
                    "Quoted per site &mdash; no licence"]),
        body,
    ])

    add(slug=SLUG,
        title="Custom Wi-Fi & Mesh Dashboards for Business",
        desc="Your controller shows coverage. We build the dashboard that shows channel "
             "utilisation, PoE headroom and noise floor - the numbers that explain faults.",
        og_title="Custom Wi-Fi & Mesh Dashboards | 365 Techies",
        schema=schema, content=content)


build()
