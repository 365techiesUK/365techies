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

DEMO = r'''
<section class="section" aria-label="Live demo dashboard">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow eyebrow--center mono" data-reveal>// LIVE DEMO &middot; SAMPLE DATA</p>
      <h2 class="section-title section-title--center" data-title>A dashboard built around the
        faults, not the coverage<span class="title-underline"></span></h2>
      <p class="lede lede--center" data-reveal>Eighteen access points through a working day.
        Watch what happens to the floor as it fills &mdash; and which single access point is
        causing it. Sample data, but modelled on a real estate.</p>
    </div>

    <div class="wd" id="wd">
      <div class="wd__bar">
        <div class="wd__clock"><span id="wdTime">08:00</span><em>site time</em></div>
        <div class="wd__kpis">
          <div class="wd__kpi"><b id="wdClients">0</b><span>clients</span></div>
          <div class="wd__kpi"><b id="wdUtil">0%</b><span>worst channel</span></div>
          <div class="wd__kpi"><b id="wdPoe">0W</b><span>PoE draw</span></div>
          <div class="wd__kpi"><b id="wdAlert">0</b><span>needs a look</span></div>
        </div>
        <button class="wd__btn" id="wdPlay" type="button" aria-label="Pause or play the demo">Pause</button>
      </div>

      <div class="wd__grid" id="wdGrid" role="list" aria-label="Access point estate"></div>

      <div class="wd__chart">
        <canvas id="wdCanvas" width="1100" height="230" aria-label="Channel utilisation and client count through the day"></canvas>
        <div class="wd__legend">
          <span><i style="background:#1d97e3"></i>clients on site</span>
          <span><i style="background:#e0b341"></i>worst channel utilisation</span>
          <span><i style="background:#e8637e"></i>the threshold where people complain</span>
        </div>
      </div>

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
.wd__btn{background:transparent;border:1px solid var(--line,#2a3b63);color:var(--soft,#86b6e8);border-radius:8px;padding:.5rem .9rem;font:inherit;font-size:.8rem;cursor:pointer}
.wd__btn:hover{border-color:var(--cyan,#1d97e3);color:var(--cyan,#1d97e3)}
.wd__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:.5rem;margin-bottom:1rem}
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
.wd__note{margin:.9rem 0 0;padding:.7rem .9rem;border-left:3px solid var(--cyan,#1d97e3);background:#0b1226;border-radius:0 8px 8px 0;font-size:.86rem;color:var(--soft,#86b6e8);min-height:2.6em}
@media (max-width:640px){.wd__kpis{gap:1rem}.wd__kpi b{font-size:1.1rem}}
@media (prefers-reduced-motion:reduce){.wd__ap{transition:none}}
</style>

<script>
(function(){
  var g=document.getElementById('wdGrid'); if(!g) return;
  var N=18, aps=[], hist=[], t=0, playing=true;
  // AP 07 is the planted fault: a congested channel, strong signal. Exactly the
  // failure a coverage map cannot show you, which is the whole point of the demo.
  var BAD=6;
  for(var i=0;i<N;i++){
    var el=document.createElement('div');
    el.className='wd__ap'; el.setAttribute('role','listitem');
    el.innerHTML='<b>AP '+String(i+1).padStart(2,'0')+'</b><i>0</i><u>clients</u>';
    g.appendChild(el);
    aps.push({el:el,n:el.querySelector('i'),u:el.querySelector('u'),base:0.5+Math.random()*0.9});
  }
  var cv=document.getElementById('wdCanvas'), cx=cv.getContext('2d');
  var elT=document.getElementById('wdTime'), elC=document.getElementById('wdClients'),
      elU=document.getElementById('wdUtil'), elP=document.getElementById('wdPoe'),
      elA=document.getElementById('wdAlert'), elN=document.getElementById('wdNote'),
      btn=document.getElementById('wdPlay');
  btn.addEventListener('click',function(){playing=!playing;btn.textContent=playing?'Pause':'Play';});

  function curve(h){ // people on site through a trading day
    if(h<8.5) return 0.04;
    if(h<10) return 0.04+(h-8.5)*0.42;
    if(h<13) return 0.66+(h-10)*0.10;
    if(h<14) return 0.96;
    if(h<17) return 0.96-(h-14)*0.07;
    if(h<18.5) return 0.75-(h-17)*0.42;
    return 0.06;
  }
  function frame(){
    if(playing){ t+=0.055; if(t>10.5){ t=0; hist=[]; } }
    var h=8+t, load=curve(h), total=0, worst=0, poe=0, alerts=0;
    for(var i=0;i<N;i++){
      var a=aps[i];
      var c=Math.max(0,Math.round(load*a.base*11));
      // the fault: AP07's channel is congested regardless of its own client count,
      // because it is sharing air with radios we do not own
      var util=Math.min(99,Math.round((c/11)*55 + (i===BAD ? 34+load*30 : Math.random()*6)));
      total+=c; poe+=12.6; if(util>worst) worst=util;
      a.n.textContent=c;
      a.u.textContent = util>72 ? util+'% busy' : 'clients';
      a.el.className='wd__ap'+(util>72?' is-bad':(util>55?' is-warn':''));
      if(util>72) alerts++;
    }
    elT.textContent=String(Math.floor(h)).padStart(2,'0')+':'+String(Math.floor((h%1)*60)).padStart(2,'0');
    elC.textContent=total; elU.textContent=worst+'%'; elP.textContent=Math.round(poe)+'W'; elA.textContent=alerts;
    elN.textContent = worst>72
      ? 'AP 07 is at '+worst+'% channel utilisation while its signal stays strong. Every coverage map on site says this corner is fine. It is not - the air is full, and no amount of extra signal fixes that.'
      : (worst>55 ? 'The floor is filling and channel utilisation is climbing. This is the point at which complaints usually start, roughly an hour before anyone reports it.'
                  : 'Everything is green. Nobody has arrived yet.');
    hist.push([total,worst]); if(hist.length>170) hist.shift();
    draw();
    requestAnimationFrame(frame);
  }
  function draw(){
    var W=cv.width,H=cv.height; cx.clearRect(0,0,W,H);
    cx.strokeStyle='rgba(255,255,255,.06)'; cx.lineWidth=1;
    for(var y=0;y<=4;y++){var yy=20+y*(H-40)/4;cx.beginPath();cx.moveTo(0,yy);cx.lineTo(W,yy);cx.stroke();}
    cx.strokeStyle='rgba(232,99,126,.55)'; cx.setLineDash([5,5]); cx.beginPath();
    var ty=H-20-(72/100)*(H-40); cx.moveTo(0,ty); cx.lineTo(W,ty); cx.stroke(); cx.setLineDash([]);
    if(hist.length<2) return;
    var step=W/169;
    function line(idx,max,col,fill){
      cx.beginPath();
      for(var i=0;i<hist.length;i++){
        var x=i*step, y=H-20-(Math.min(hist[i][idx],max)/max)*(H-40);
        i?cx.lineTo(x,y):cx.moveTo(x,y);
      }
      cx.strokeStyle=col; cx.lineWidth=2.2; cx.stroke();
      if(fill){ cx.lineTo((hist.length-1)*step,H-20); cx.lineTo(0,H-20); cx.closePath();
        cx.fillStyle=fill; cx.fill(); }
    }
    line(0,140,'#1d97e3','rgba(29,151,227,.13)');
    line(1,100,'#e0b341',null);
  }
  requestAnimationFrame(frame);
})();
</script>
'''


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
