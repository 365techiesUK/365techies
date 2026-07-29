# -*- coding: utf-8 -*-
"""Next-gen home dashboards - cameras, power, network and backups on one screen.

Third page in the dashboard family, after /custom-vrm-dashboards/ (solar) and
/custom-wifi-dashboards/ (business wireless). This one is the home version.

HONESTY FRAME, and it matters. The dashboards on THIS page - cameras, solar,
sensors, the freezer - are still BUILT TO ORDER, exactly like the Victron
ones, and the page must not imply otherwise.

What IS self-service since 2026-07-29 is the dashboard studio in the portal:
free to join, drag and save your own layout, with the tiles about the
computers we look after going live on a support plan and every other tile
clearly badged as a sample. So the funnel is three real tiers - free studio,
support plan, bespoke build - and the middle one must never be described as
though it reads a camera. See [[dashboard-product-plan]] in memory.

The hook is the smart meter. Almost every household has been given one, and
almost nobody looks at it, because a number in kilowatt-hours on a plastic
display in the kitchen answers a question nobody asked. It is the perfect
foil: same promise, twenty years earlier, executed badly.
"""
import build_pages as bp
from build_pages import add, graph, crumb, webpage, service, faqpage, faq_html, cta, hero
import dashboard_connectors as CONN

SLUG = "next-gen-home-dashboards"

DEMO = r"""
<section class="section" aria-label="Live demo home dashboard">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow eyebrow--center mono" data-reveal>// LIVE DEMO &middot; SAMPLE HOME &middot; SWIPE OR USE THE ARROWS</p>
      <h2 class="section-title section-title--center" data-title>Three screens, one glance,
        any device<span class="title-underline"></span></h2>
      <p class="lede lede--center" data-reveal>A sample home, built the way we build them.
        Swipe between screens, or press the expand button for the full-screen wall view.</p>
    </div>

    <div class="hd" id="hd">
      <div class="hd__top">
        <div class="hd__clock"><span id="hdTime">16:00</span><em id="hdScreen">Overview</em></div>
        <div class="hd__ctl">
          <button class="hd__btn" id="hdPrev" type="button" aria-label="Previous screen">&#8249;</button>
          <div class="hd__dots" id="hdDots" role="tablist" aria-label="Dashboard screens"></div>
          <button class="hd__btn hd__btn--pulse" id="hdNext" type="button" aria-label="Next screen">&#8250;</button>
          <button class="hd__btn" id="hdFs" type="button" aria-label="Full screen">&#9974;</button>
          <button class="hd__btn" id="hdPlay" type="button" aria-label="Pause">&#10073;&#10073;</button>
        </div>
      </div>

      <div class="hd__viewport" id="hdViewport">
        <div class="hd__track" id="hdTrack">

          <!-- SCREEN 1 - overview -->
          <div class="hd__screen" role="tabpanel" aria-label="Overview">
            <div class="hd__row">
              <div class="hd__card hd__card--wide">
                <h3><svg class="ic ic--spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" class="ic-f"/></svg> Cameras</h3>
                <div class="hd__cams" id="hdCams"></div>
                <p class="hd__sub" id="hdCamNote">All four recording. Nothing needs you.</p>
              </div>
              <div class="hd__card">
                <h3><svg class="ic ic--flash" viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg> Power</h3>
                <div class="hd__big"><span id="hdPower">0</span><em>W now</em></div>
                <div class="hd__bar2"><i id="hdBatt" style="width:80%"></i></div>
                <p class="hd__sub" id="hdBattTxt">Battery 80%</p>
              </div>
              <div class="hd__card">
                <h3><svg class="ic ic--wave" viewBox="0 0 24 24"><path d="M4 14a8 8 0 0 1 16 0"/><path d="M7 17a5 5 0 0 1 10 0"/><circle cx="12" cy="20" r="1.4" class="ic-f"/></svg> Broadband</h3>
                <div class="hd__big"><span id="hdNet">—</span><em>Mbps</em></div>
                <p class="hd__sub" id="hdNetNote">Router up 41 days</p>
              </div>
            </div>
            <div class="hd__row">
              <div class="hd__card"><h3><svg class="ic" viewBox="0 0 24 24"><path d="M4 7h16v12H4z"/><path d="M4 7l8-4 8 4"/></svg> Backups</h3>
                <div class="hd__ok" id="hdBk">&#10003;</div><p class="hd__sub" id="hdBkNote">3 PCs backed up last night</p></div>
              <div class="hd__card"><h3><svg class="ic" viewBox="0 0 24 24"><path d="M5 21V6l7-3 7 3v15"/><path d="M9 21v-7h6v7"/></svg> Doors</h3>
                <div class="hd__ok" id="hdDoor">&#10003;</div><p class="hd__sub" id="hdDoorNote">All closed</p></div>
              <div class="hd__card"><h3><svg class="ic ic--cool" viewBox="0 0 24 24"><path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9"/></svg> Freezer</h3>
                <div class="hd__big"><span id="hdFrz">-19</span><em>&deg;C</em></div><p class="hd__sub">Normal</p></div>
              <div class="hd__card"><h3><svg class="ic ic--blink" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/></svg> Devices</h3>
                <div class="hd__big"><span id="hdDev">24</span><em>of 24</em></div><p class="hd__sub">Nothing missing</p></div>
            </div>
          </div>

          <!-- SCREEN 2 - cameras -->
          <div class="hd__screen" role="tabpanel" aria-label="Cameras">
            <div class="hd__cams hd__cams--big" id="hdCamsBig"></div>
            <p class="hd__note" id="hdCamBigNote">Every camera, live. Clips copy off-site automatically, so a stolen recorder is not a lost clip.</p>
          </div>

          <!-- SCREEN 3 - weather + energy -->
          <div class="hd__screen" role="tabpanel" aria-label="Weather and energy">
            <div class="hd__row">
              <div class="hd__card hd__card--wide hd__wx">
                <h3><svg class="ic ic--float" viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.4"/><path d="M6 18h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1"/></svg> Weather &mdash; <span id="wxPlace">your postcode</span></h3>
                <div class="hd__wxnow"><span id="wxTemp">14</span><em>&deg;C</em>
                  <div class="hd__wxd"><b id="wxDesc">Cloudy</b><span id="wxSub">Feels like 12&deg; &middot; wind 11mph</span></div></div>
                <div class="hd__wxrow" id="wxDays"></div>
              </div>
              <div class="hd__card">
                <h3><svg class="ic ic--flash" viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg> Today</h3>
                <div class="hd__big"><span id="wxGen">0.0</span><em>kWh made</em></div>
                <p class="hd__sub" id="wxSaved">Used at home rather than exported</p>
              </div>
            </div>
            <p class="hd__note">Weather comes from whichever source is best for your postcode &mdash; and it matters, because tomorrow&rsquo;s forecast is what decides whether the battery charges tonight.</p>
          </div>

        </div>
      </div>

      <p class="hd__note" id="hdNote">A quiet afternoon. Nothing wants your attention.</p>
    </div>
  </div>
</section>

<style>
.hd{background:var(--panel,#0d1530);border:1px solid var(--line,#2a3b63);border-radius:16px;padding:1.1rem;max-width:1080px;margin:0 auto}
.hd__top{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem;flex-wrap:wrap}
.hd__clock span{font-family:var(--mono,monospace);font-size:1.9rem;font-weight:800;color:var(--white,#f0f5fc)}
.hd__clock em{display:block;font-style:normal;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:var(--mut,#9fb5d3);margin-top:.2rem}
.hd__ctl{display:flex;align-items:center;gap:.4rem}
.hd__btn{background:transparent;border:1px solid var(--line,#2a3b63);color:var(--soft,#86b6e8);border-radius:8px;min-width:38px;height:34px;font:inherit;font-size:1rem;cursor:pointer;line-height:1}
.hd__btn:hover,.hd__btn:focus-visible{border-color:var(--cyan,#1d97e3);color:var(--cyan,#1d97e3)}
.hd__btn--pulse{animation:hdPulse 2.4s ease-in-out infinite}
@keyframes hdPulse{0%,100%{box-shadow:0 0 0 0 rgba(29,151,227,.5)}50%{box-shadow:0 0 0 7px rgba(29,151,227,0)}}
.hd__dots{display:flex;gap:.3rem;padding:0 .3rem}
.hd__dots button{width:8px;height:8px;padding:0;border-radius:50%;border:0;background:#2a3b63;cursor:pointer}
.hd__dots button[aria-selected="true"]{background:var(--cyan,#1d97e3);width:20px;border-radius:4px}
.hd__viewport{overflow:hidden;border-radius:12px;touch-action:pan-y}
.hd__track{display:flex;transition:transform .45s cubic-bezier(.4,0,.2,1)}
.hd__screen{min-width:100%;flex:0 0 100%}
.hd__row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.6rem;margin-bottom:.6rem}
.hd__card{background:#0b1226;border:1px solid var(--line,#2a3b63);border-radius:12px;padding:.8rem .9rem}
.hd__card--wide{grid-column:span 2}
.hd__card h3{margin:0 0 .5rem;font-size:.68rem;letter-spacing:.13em;text-transform:uppercase;color:var(--mut,#9fb5d3);font-weight:700;display:flex;align-items:center;gap:.4rem}
.ic{width:15px;height:15px;flex:0 0 15px;fill:none;stroke:var(--cyan,#1d97e3);stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.ic .ic-f{fill:var(--cyan,#1d97e3);stroke:none}
.ic--spin{animation:icSpin 9s linear infinite;transform-origin:50% 50%}
@keyframes icSpin{to{transform:rotate(360deg)}}
.ic--flash{animation:icFlash 2.6s ease-in-out infinite}
@keyframes icFlash{0%,100%{opacity:1}45%{opacity:.35}}
.ic--wave path{animation:icWave 2.2s ease-in-out infinite}
.ic--wave path:nth-child(2){animation-delay:.25s}
@keyframes icWave{0%,100%{opacity:.35}50%{opacity:1}}
.ic--cool{animation:icSpin 22s linear infinite;transform-origin:50% 50%}
.ic--blink{animation:icFlash 4s ease-in-out infinite}
.ic--float{animation:icFloat 3.4s ease-in-out infinite}
@keyframes icFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
.hd__big{line-height:1}
.hd__big span{font-size:1.9rem;font-weight:800;color:var(--white,#f0f5fc);font-variant-numeric:tabular-nums}
.hd__big em{font-style:normal;font-size:.7rem;color:var(--mut,#9fb5d3);margin-left:.3rem}
.hd__sub{margin:.45rem 0 0;font-size:.72rem;color:var(--mut,#9fb5d3)}
.hd__ok{font-size:1.7rem;color:var(--good,#39d353);line-height:1.1}
.hd__cams{display:grid;grid-template-columns:repeat(4,1fr);gap:.35rem}
.hd__cams--big{grid-template-columns:repeat(2,1fr);gap:.6rem}
.hd__cam{aspect-ratio:4/3;border-radius:7px;background:#060b18;border:1px solid #1b2947;position:relative;overflow:hidden;transition:border-color .4s}
.hd__cam::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(29,151,227,.08) 50%,transparent 55%);animation:icScan 5.5s linear infinite}
@keyframes icScan{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}
.hd__cam span{position:absolute;left:5px;bottom:4px;font-size:.58rem;color:#7d90ad;font-family:var(--mono,monospace);z-index:2}
.hd__cam i{position:absolute;right:5px;top:5px;width:6px;height:6px;border-radius:50%;background:#39d353;box-shadow:0 0 6px #39d353;z-index:2}
.hd__cam.is-alert{border-color:#e0b341}
.hd__cam.is-alert i{background:#e0b341;box-shadow:0 0 9px #e0b341;animation:icFlash 1s ease-in-out infinite}
.hd__bar2{height:7px;border-radius:4px;background:#0b1226;border:1px solid var(--line,#2a3b63);overflow:hidden;margin-top:.5rem}
.hd__bar2 i{display:block;height:100%;background:linear-gradient(90deg,#1d97e3,#39d353);transition:width .6s}
.hd__wxnow{display:flex;align-items:center;gap:.7rem;margin:.2rem 0 .6rem}
.hd__wxnow span{font-size:2.4rem;font-weight:800;color:var(--white,#f0f5fc);line-height:1}
.hd__wxnow em{font-style:normal;font-size:.9rem;color:var(--mut,#9fb5d3);align-self:flex-start;margin-top:.25rem}
.hd__wxd b{display:block;color:var(--white,#f0f5fc);font-size:.9rem}
.hd__wxd span{font-size:.72rem;color:var(--mut,#9fb5d3)}
.hd__wxrow{display:grid;grid-template-columns:repeat(5,1fr);gap:.4rem}
.hd__wxday{background:#0d1530;border:1px solid var(--line,#2a3b63);border-radius:8px;padding:.45rem .3rem;text-align:center}
.hd__wxday b{display:block;font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;color:var(--mut,#9fb5d3)}
.hd__wxday u{display:block;text-decoration:none;font-size:.95rem;font-weight:800;color:var(--white,#f0f5fc);margin-top:.2rem}
.hd__note{margin:.8rem 0 0;padding:.65rem .9rem;border-left:3px solid var(--cyan,#1d97e3);background:#0b1226;border-radius:0 8px 8px 0;font-size:.85rem;color:var(--soft,#86b6e8);min-height:2.4em}

/* GAME MODE - fullscreen strips everything back to the data */
.hd:fullscreen{max-width:none;width:100%;height:100%;border-radius:0;border:0;padding:2.2rem 3rem;display:flex;flex-direction:column;justify-content:center;background:radial-gradient(ellipse at 50% 0%,#12203f 0%,#070c1a 70%)}
.hd:fullscreen .hd__clock span{font-size:3.4rem}
.hd:fullscreen .hd__card{padding:1.3rem 1.5rem;border-radius:16px}
.hd:fullscreen .hd__big span{font-size:3.2rem}
.hd:fullscreen .hd__card h3{font-size:.82rem}
.hd:fullscreen .ic{width:20px;height:20px;flex-basis:20px}
.hd:fullscreen .hd__note{font-size:1.05rem;padding:1rem 1.2rem}
.hd:fullscreen .hd__wxnow span{font-size:4rem}
.hd:fullscreen .hd__btn{min-width:48px;height:44px;font-size:1.2rem}
@media (max-width:620px){.hd__card--wide{grid-column:span 1}.hd__cams--big{grid-template-columns:1fr}.hd__clock span{font-size:1.5rem}}
@media (prefers-reduced-motion:reduce){.hd__track{transition:none}.ic,.hd__cam::after,.hd__btn--pulse{animation:none!important}}
</style>

<script>
(function(){
  var root=document.getElementById('hd'); if(!root) return;
  var track=document.getElementById('hdTrack'), vp=document.getElementById('hdViewport');
  var screens=track.children, N=screens.length, cur=0, t=0, playing=true;
  var $=function(i){return document.getElementById(i);};
  var LABELS=['Overview','Cameras','Weather & energy'];

  // dots
  var dots=$('hdDots');
  for(var d=0;d<N;d++){(function(k){
    var b=document.createElement('button'); b.type='button'; b.setAttribute('role','tab');
    b.setAttribute('aria-label','Screen '+(k+1)+': '+LABELS[k]);
    b.addEventListener('click',function(){go(k);}); dots.appendChild(b);
  })(d);}

  function go(i){
    cur=(i+N)%N;
    track.style.transform='translateX(-'+(cur*100)+'%)';
    $('hdScreen').textContent=LABELS[cur];
    [].forEach.call(dots.children,function(b,k){b.setAttribute('aria-selected',k===cur?'true':'false');});
    // once the visitor has driven it themselves, stop nudging
    $('hdNext').classList.remove('hd__btn--pulse');
  }
  $('hdNext').addEventListener('click',function(){go(cur+1);});
  $('hdPrev').addEventListener('click',function(){go(cur-1);});
  root.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'){go(cur+1);} else if(e.key==='ArrowLeft'){go(cur-1);}
  });
  root.tabIndex=0;

  // swipe
  var x0=null;
  vp.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});
  vp.addEventListener('touchend',function(e){
    if(x0===null) return;
    var dx=e.changedTouches[0].clientX-x0;
    if(Math.abs(dx)>45) go(cur+(dx<0?1:-1));
    x0=null;
  },{passive:true});

  // fullscreen "game mode"
  $('hdFs').addEventListener('click',function(){
    if(document.fullscreenElement){ document.exitFullscreen(); }
    else if(root.requestFullscreen){ root.requestFullscreen().catch(function(){}); }
  });
  $('hdPlay').addEventListener('click',function(){
    playing=!playing; this.innerHTML=playing?'&#10073;&#10073;':'&#9654;';
  });

  // cameras on both screens
  var names=['Front door','Driveway','Back garden','Side gate'], cams=[], camsBig=[];
  [['hdCams',cams],['hdCamsBig',camsBig]].forEach(function(pair){
    var host=$(pair[0]); if(!host) return;
    names.forEach(function(n){
      var el=document.createElement('div'); el.className='hd__cam';
      el.innerHTML='<i></i><span>'+n+'</span>'; host.appendChild(el); pair[1].push(el);
    });
  });

  // 5-day forecast strip (sample)
  var days=['Wed','Thu','Fri','Sat','Sun'], temps=[16,18,15,13,17];
  var wx=$('wxDays');
  days.forEach(function(d,i){
    var el=document.createElement('div'); el.className='hd__wxday';
    el.innerHTML='<b>'+d+'</b><u>'+temps[i]+'&deg;</u>'; wx.appendChild(el);
  });

  function frame(){
    if(playing){ t+=0.02; if(t>9){ t=0; } }
    var h=16+t, hh=Math.floor(h)%24, mm=Math.floor((h%1)*60);
    $('hdTime').textContent=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');

    var solar=Math.max(0,Math.cos((h-13)/6));
    var load=520+Math.round(Math.sin(h)*90)+(h>17.5&&h<22?700:0);
    var net=Math.round(load-solar*2400);
    $('hdPower').textContent=(net>0?'+':'')+net;
    var batt=Math.max(18,Math.round(92-(h-16)*8));
    $('hdBatt').style.width=batt+'%';
    $('hdBattTxt').textContent='Battery '+batt+'%'+(batt<25?' \u2014 charging overnight':'');
    $('hdNet').textContent=(890+Math.round(Math.sin(h*3)*45));
    $('hdFrz').textContent=(-19+(Math.sin(h*2)>0.93?1:0));
    $('hdDev').textContent=(h>18.4&&h<18.9)?23:24;
    $('wxGen').textContent=(solar*14+2).toFixed(1);
    $('wxTemp').textContent=Math.round(15-(h-16)*0.7);

    var alert=(h>19.1&&h<19.6);
    [cams,camsBig].forEach(function(set){ if(set[3]) set[3].className='hd__cam'+(alert?' is-alert':''); });
    $('hdCamNote').textContent=alert?'Motion at the side gate \u2014 clip saved, already off-site.'
                                    :'All four recording. Nothing needs you.';
    $('hdNote').textContent = alert
      ? 'Something moved at the side gate. One notification, with the clip attached \u2014 not forty a day, which is why people switch these things off.'
      : (h>17.5&&h<22 ? 'Cooking, telly on, everyone home. The battery is carrying the evening, so you are buying almost nothing at peak rate.'
      : (batt<25 ? 'Battery low, so it charges overnight on the cheap rate and is full before breakfast.'
                 : 'A quiet afternoon. Nothing wants your attention.'));
    requestAnimationFrame(frame);
  }
  go(0); requestAnimationFrame(frame);
})();
</script>
"""


def build():
    faqs = [
        ("What is wrong with the smart meter I already have?",
         "Nothing, except that it answers a question almost nobody asked. It shows electricity in "
         "kilowatt-hours on a small display in the kitchen, and most people stop looking within a "
         "fortnight. It cannot tell you a camera stopped recording three weeks ago, that last "
         "night's backup failed, or that the freezer is climbing. A dashboard is not a bigger "
         "smart meter - it is the whole house on one screen."),
        ("Can you put my existing cameras on it?",
         "Usually, and that is the first thing we check rather than promise. Most modern CCTV "
         "systems expose a stream or an API we can read. Some cheaper cloud-only cameras "
         "deliberately do not, and if yours is one of those we will tell you before you have "
         "spent anything."),
        ("Do I have to buy new equipment?",
         "Often not. We would rather read what you already own than sell you a shelf of new kit. "
         "The point of the dashboard is to make what is already in your house useful, and a fair "
         "number of jobs need nothing new at all."),
        ("Where does it live, and can I see it away from home?",
         "It is hosted by us on its own address, so it works from anywhere on any device - phone "
         "on the train, laptop abroad, tablet in the kitchen. Nothing depends on a manufacturer's "
         "app deciding to keep supporting your model."),
        ("Is this free?",
         "Part of it genuinely is. The dashboard studio in the 365 portal is free to join and "
         "play with - arrange the tiles, save the layout, keep it. On a 365 Home Support plan "
         "(&pound;18.25 a month per computer) the tiles about the computers we look after go live "
         "and read your own account. A bespoke home dashboard - your cameras, your solar, your "
         "sensors on one screen - is a different job, designed and built for your house, so it is "
         "quoted per home. There is no licence and no monthly per-camera fee; we would rather "
         "charge once for building it properly."),
        ("Can I try one before I commit to anything?",
         "Yes, and we would rather you did. Join the 365 Club free, open the dashboard studio in "
         "your portal and build a screen. Every tile in there is marked either live or sample, so "
         "you always know which numbers are real, and you can send us a design you like and ask "
         "what it would take to build it for real."),
        ("Why would I trust an IT firm with this rather than a security company?",
         "Because the hard part is not the cameras, it is everything talking to everything else "
         "reliably, and being told when it stops. That is thirty years of our trade. We have been "
         "doing this in Dorset since 1995, and we build the same kind of dashboards for Victron "
         "energy systems worldwide."),
    ]
    faqs = faqs + CONN.FAQS

    body = "\n".join([
        DEMO,

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Forget the smart meter'
        '<span class="title-underline"></span></h2>',
        '<p>You almost certainly have one. It sits in the kitchen showing a number in kilowatt-'
        'hours, and you probably stopped looking at it within a fortnight. That is not because '
        'you are uninterested in your home &mdash; it is because it answers a question nobody '
        'asked.</p>',
        '<p>It cannot tell you that a camera stopped recording three weeks ago. Or that last '
        'night&rsquo;s backup failed. Or that the freezer in the garage has been climbing for two '
        'days. It measures one thing, in one unit, in one room.</p>',
        '<p><strong>A proper dashboard is not a bigger smart meter.</strong> It is everything that '
        'matters about your house &mdash; cameras, power, broadband, backups, doors, the freezer '
        '&mdash; on one screen, from anywhere, on whatever device is in your hand.</p>',
        '</div></section>',

        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Why people turn this sort of thing off'
        '<span class="title-underline"></span></h2>',
        '<p>Most people have already tried. An app per device, a notification for every passing '
        'cat, four logins, and within a month everything is muted and nobody looks at any of '
        'it.</p>',
        '<p>We build them the other way round. <strong>The dashboard is quiet by default and only '
        'speaks when something actually needs you.</strong> Motion at the side gate at nine in the '
        'evening is worth one notification with the clip attached. A branch moving in the wind is '
        'not worth any.</p>',
        '<div class="table-wrap"><table class="table">',
        '<thead><tr><th>The usual way</th><th>How we build it</th></tr></thead><tbody>',
        '<tr><td>An app per manufacturer</td><td>One screen, one address, any device</td></tr>',
        '<tr><td>Notifications for everything</td><td>Notifications for things that matter, '
        'and silence otherwise</td></tr>',
        '<tr><td>You have to remember to check</td><td>It tells you &mdash; including when '
        'something has quietly stopped working</td></tr>',
        '<tr><td>Stops working when a manufacturer drops your model</td><td>Hosted by us, '
        'reading your kit directly</td></tr>',
        '<tr><td>Footage only on the recorder in the garage</td><td>Clips copied off-site '
        'automatically, so a stolen box is not a lost clip</td></tr>',
        '</tbody></table></div>',
        '</div></section>',

        CONN.section(),

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Three ways in, and the first one is free'
        '<span class="title-underline"></span></h2>',
        '<p>You do not have to take our word for any of this. There is a <strong>dashboard studio '
        'in the 365 portal</strong>: drag the tiles where you want them, take off what you do not '
        'care about, save the layout to your account and it is there on your phone too. '
        '<a href="/join/">Joining takes about twenty seconds</a> &mdash; no card, no '
        'salesperson.</p>',
        # four columns will not squeeze into a phone: this is the site's established
        # wide-comparison pattern (scrolls in its own container, 640px floor)
        '<div class="price-table-wrap"><table class="price-table">',
        '<thead><tr><th></th><th>Free 365 member</th><th>On 365 Home Support</th>'
        '<th>A bespoke home dashboard</th></tr></thead><tbody>',
        '<tr><td><strong>Cost</strong></td><td>Free to join</td>'
        '<td>&pound;18.25 a month per computer</td><td>Quoted once, per home</td></tr>',
        '<tr><td><strong>Arrange it yourself</strong></td><td>Yes &mdash; and the layout is saved '
        'to your account</td><td>Yes</td><td>We lay it out with you, then adjust it after a '
        'fortnight of real use</td></tr>',
        '<tr><td><strong>What is actually live</strong></td><td>Nothing &mdash; every tile is a '
        'clearly marked sample</td><td>The computers we look after: health, backups, storage, '
        'protection, your next visit, your written reports, your saved Wi-Fi surveys</td>'
        '<td>Whatever your house has that publishes its data &mdash; cameras, power, broadband, '
        'doors, sensors, the freezer</td></tr>',
        '<tr><td><strong>Where</strong></td><td colspan="2">In your portal, on any device</td>'
        '<td>Its own hosted address, any device, anywhere</td></tr>',
        '</tbody></table></div>',
        '<p><strong>The bit we will not blur.</strong> Inside the portal a tile is either marked '
        '<em>live</em>, in which case it is reading your own account, or <em>sample</em>, in which '
        'case the numbers are made up and nothing is plugged in behind it. Your cameras and your '
        'solar are not going to appear in there by magic &mdash; connecting those is the bespoke '
        'build, and it starts with us checking what your equipment actually publishes.</p>',
        '<p><strong>No licence, and no monthly fee per camera.</strong> We would rather charge '
        'once for building it properly than meter you forever for something we already made.</p>',
        '</div></section>',

        ' <section class="section"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Why an IT firm, and why this one'
        '<span class="title-underline"></span></h2>',
        '<p>The cameras are the easy part. The hard part is everything talking to everything else '
        'reliably, staying online, and telling you when it stops &mdash; which is our trade rather '
        'than a sideline.</p>',
        '<p>We have been doing this in Dorset <strong>since 1995</strong>. We build the same kind '
        'of dashboards for <a href="/custom-vrm-dashboards/">Victron energy systems</a> worldwide, '
        'and for <a href="/custom-wifi-dashboards/">business wireless networks</a>. This is the '
        'home version of work we already do every week.</p>',
        '<p>And the same honest caveat as the others: if we look at your house and conclude a '
        'dashboard would not add much, we will say so. It happens, and it costs you nothing to '
        'ask.</p>',
        '</div></section>',

        faq_html(faqs),
        cta("Curious? It costs nothing to ask",
            "Tell us what you have &mdash; cameras, solar, an alarm, a house full of gadgets that "
            "do not talk to each other &mdash; and we will tell you honestly what could go on one "
            "screen, and what it would take.",
            primary=("Call 01202 775566", "tel:+441202775566"),
            secondary=("Join the free portal", "/join/")),
    ])

    def schema(s):
        return graph([
            crumb(s, "Home Dashboards"),
            webpage(s, "Next-Gen Home Dashboards",
                    "Bespoke home dashboards showing cameras, power, broadband, backups and "
                    "sensors on one screen, from any device."),
            service(s, "Custom Home Dashboards",
                    "Bespoke hosted dashboards for the home - CCTV, energy, broadband, backups "
                    "and sensors on a single screen, accessible from any device.",
                    "Home monitoring dashboard"),
            faqpage(s, faqs),
        ])

    content = "\n".join([
        hero("", "// NEXT-GEN HOME DASHBOARDS",
             'Forget the smart meter. <em class="grad grad--cyan">Your whole house</em>, '
             'one screen',
             "Cameras, power, broadband, backups, doors and the freezer in the garage &mdash; on "
             "one screen, from any device, anywhere. Quiet until something actually needs you. "
             "Built to order by a Dorset family firm, doing this since 1995.",
             cta1=("Talk to a human: 01202 775566", "tel:+441202775566"),
             cta2=("See the live demo", "#hd"),
             chips=["Works with the kit you already own", "Any device, anywhere",
                    "No licence, no per-camera fee"]),
        body,
    ])

    add(slug=SLUG,
        title="Next-Gen Home Dashboards | Forget the Smart Meter",
        desc="Cameras, power, broadband, backups and sensors on one screen from any device. "
             "Built to order in Dorset since 1995. Quiet until something needs you.",
        og_title="Next-Gen Home Dashboards | 365 Techies",
        schema=schema, content=content)


build()
