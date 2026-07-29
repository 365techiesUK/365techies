# -*- coding: utf-8 -*-
"""Next-gen home dashboards - cameras, power, network and backups on one screen.

Third page in the dashboard family, after /custom-vrm-dashboards/ (solar) and
/custom-wifi-dashboards/ (business wireless). This one is the home version.

HONESTY FRAME, and it matters: these are BUILT TO ORDER, exactly like the
Victron ones. Nothing here is a product you can buy off a shelf today, and
the page must not imply otherwise. What already exists and is free is the
365 portal - so the funnel is honest: free portal now, bespoke dashboard if
you want the whole house on one screen.

The hook is the smart meter. Almost every household has been given one, and
almost nobody looks at it, because a number in kilowatt-hours on a plastic
display in the kitchen answers a question nobody asked. It is the perfect
foil: same promise, twenty years earlier, executed badly.
"""
import build_pages as bp
from build_pages import add, graph, crumb, webpage, service, faqpage, faq_html, cta, hero

SLUG = "next-gen-home-dashboards"

DEMO = r'''
<section class="section" aria-label="Live demo home dashboard">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow eyebrow--center mono" data-reveal>// LIVE DEMO &middot; SAMPLE HOME</p>
      <h2 class="section-title section-title--center" data-title>Your whole house, one screen,
        any device<span class="title-underline"></span></h2>
      <p class="lede lede--center" data-reveal>This is a sample home, not a real one &mdash; but
        it is built the way we build them. Watch the evening arrive.</p>
    </div>

    <div class="hd" id="hd">
      <div class="hd__top">
        <div class="hd__clock"><span id="hdTime">16:00</span><em id="hdDay">this evening</em></div>
        <button class="hd__btn" id="hdPlay" type="button">Pause</button>
      </div>

      <div class="hd__row">
        <div class="hd__card hd__card--wide">
          <h3>Cameras</h3>
          <div class="hd__cams" id="hdCams"></div>
          <p class="hd__sub" id="hdCamNote">All four recording. Nothing needs you.</p>
        </div>
        <div class="hd__card">
          <h3>Power</h3>
          <div class="hd__big"><span id="hdPower">0</span><em>W now</em></div>
          <div class="hd__bar2"><i id="hdBatt" style="width:80%"></i></div>
          <p class="hd__sub"><span id="hdBattTxt">Battery 80%</span></p>
        </div>
        <div class="hd__card">
          <h3>Broadband</h3>
          <div class="hd__big"><span id="hdNet">—</span><em>Mbps down</em></div>
          <p class="hd__sub" id="hdNetNote">Router up 41 days</p>
        </div>
      </div>

      <div class="hd__row">
        <div class="hd__card"><h3>Backups</h3>
          <div class="hd__ok" id="hdBk">&#10003;</div>
          <p class="hd__sub" id="hdBkNote">3 PCs backed up last night</p></div>
        <div class="hd__card"><h3>Doors &amp; windows</h3>
          <div class="hd__ok" id="hdDoor">&#10003;</div>
          <p class="hd__sub" id="hdDoorNote">All closed</p></div>
        <div class="hd__card"><h3>Freezer</h3>
          <div class="hd__big"><span id="hdFrz">-19</span><em>&deg;C</em></div>
          <p class="hd__sub">Normal</p></div>
        <div class="hd__card"><h3>Devices online</h3>
          <div class="hd__big"><span id="hdDev">24</span><em>of 24</em></div>
          <p class="hd__sub">Nothing missing</p></div>
      </div>

      <p class="hd__note" id="hdNote">A quiet afternoon. Nothing wants your attention.</p>
    </div>
  </div>
</section>

<style>
.hd{background:var(--panel,#0d1530);border:1px solid var(--line,#2a3b63);border-radius:16px;padding:1.1rem;max-width:1080px;margin:0 auto}
.hd__top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
.hd__clock span{font-family:var(--mono,monospace);font-size:1.9rem;font-weight:800;color:var(--white,#f0f5fc)}
.hd__clock em{display:block;font-style:normal;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:var(--mut,#9fb5d3);margin-top:.2rem}
.hd__btn{background:transparent;border:1px solid var(--line,#2a3b63);color:var(--soft,#86b6e8);border-radius:8px;padding:.45rem .85rem;font:inherit;font-size:.8rem;cursor:pointer}
.hd__row{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:.6rem;margin-bottom:.6rem}
.hd__card{background:#0b1226;border:1px solid var(--line,#2a3b63);border-radius:12px;padding:.8rem .9rem}
.hd__card--wide{grid-column:span 2}
.hd__card h3{margin:0 0 .5rem;font-size:.68rem;letter-spacing:.13em;text-transform:uppercase;color:var(--mut,#9fb5d3);font-weight:700}
.hd__big{line-height:1}
.hd__big span{font-size:1.9rem;font-weight:800;color:var(--white,#f0f5fc);font-variant-numeric:tabular-nums}
.hd__big em{font-style:normal;font-size:.7rem;color:var(--mut,#9fb5d3);margin-left:.3rem}
.hd__sub{margin:.45rem 0 0;font-size:.72rem;color:var(--mut,#9fb5d3)}
.hd__ok{font-size:1.7rem;color:var(--good,#39d353);line-height:1.1}
.hd__ok.is-bad{color:#e8637e}
.hd__cams{display:grid;grid-template-columns:repeat(4,1fr);gap:.35rem}
.hd__cam{aspect-ratio:4/3;border-radius:7px;background:#060b18;border:1px solid #1b2947;position:relative;overflow:hidden;transition:border-color .4s}
.hd__cam span{position:absolute;left:4px;bottom:3px;font-size:.55rem;color:#7d90ad;font-family:var(--mono,monospace)}
.hd__cam i{position:absolute;right:4px;top:4px;width:6px;height:6px;border-radius:50%;background:#39d353;box-shadow:0 0 6px #39d353}
.hd__cam.is-alert{border-color:#e0b341}
.hd__cam.is-alert i{background:#e0b341;box-shadow:0 0 8px #e0b341}
.hd__bar2{height:7px;border-radius:4px;background:#0b1226;border:1px solid var(--line,#2a3b63);overflow:hidden;margin-top:.5rem}
.hd__bar2 i{display:block;height:100%;background:linear-gradient(90deg,#1d97e3,#39d353);transition:width .6s}
.hd__note{margin:.8rem 0 0;padding:.65rem .9rem;border-left:3px solid var(--cyan,#1d97e3);background:#0b1226;border-radius:0 8px 8px 0;font-size:.85rem;color:var(--soft,#86b6e8);min-height:2.4em}
@media (max-width:620px){.hd__card--wide{grid-column:span 1}}
@media (prefers-reduced-motion:reduce){.hd__cam,.hd__bar2 i{transition:none}}
</style>

<script>
(function(){
  var wrap=document.getElementById('hdCams'); if(!wrap) return;
  var names=['Front door','Driveway','Back garden','Side gate'], cams=[];
  names.forEach(function(n){
    var d=document.createElement('div'); d.className='hd__cam';
    d.innerHTML='<i></i><span>'+n+'</span>'; wrap.appendChild(d); cams.push(d);
  });
  var t=0, playing=true, btn=document.getElementById('hdPlay');
  btn.addEventListener('click',function(){playing=!playing;btn.textContent=playing?'Pause':'Play';});
  var $=function(id){return document.getElementById(id);};

  function frame(){
    if(playing){ t+=0.02; if(t>9){ t=0; } }
    var h=16+t;                     // 16:00 -> 01:00
    var hh=Math.floor(h)%24, mm=Math.floor((h%1)*60);
    $('hdTime').textContent=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');

    // solar fades, house load rises as the evening comes in
    var solar=Math.max(0,Math.cos((h-13)/6));
    var load=520+Math.round(Math.sin(h)*90)+(h>17.5&&h<22?700:0);
    var net=Math.round(load-solar*2400);
    $('hdPower').textContent=(net>0?'+':'')+net;
    var batt=Math.max(18,Math.round(92-(h-16)*8));
    $('hdBatt').style.width=batt+'%';
    $('hdBattTxt').textContent='Battery '+batt+'%'+(batt<25?' — charging overnight':'');

    $('hdNet').textContent=(890+Math.round(Math.sin(h*3)*45));
    $('hdFrz').textContent=(-19+(Math.sin(h*2)>0.93?1:0));
    $('hdDev').textContent=(h>18.4&&h<18.9)?23:24;

    // one evening event: motion at the side gate, then it clears
    var alert=(h>19.1&&h<19.6);
    cams[3].className='hd__cam'+(alert?' is-alert':'');
    $('hdCamNote').textContent=alert?'Motion at the side gate — clip saved, and it is already off-site.'
                                    :'All four recording. Nothing needs you.';
    $('hdDoor').className='hd__ok'; $('hdDoorNote').textContent='All closed';
    var bkRun=(h>1&&h<2.5);
    $('hdBk').textContent='✓';
    $('hdBkNote').textContent=bkRun?'Running now':'3 PCs backed up last night';

    $('hdNote').textContent = alert
      ? 'Something moved at the side gate. You get one notification with the clip attached — not forty a day, which is why people switch these things off.'
      : (h>17.5&&h<22 ? 'Cooking, telly on, everyone home. The battery is carrying the evening so you are buying almost nothing at peak rate.'
      : (batt<25 ? 'Battery low, so it will charge overnight on the cheap rate and be full before breakfast.'
                 : 'A quiet afternoon. Nothing wants your attention.'));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
</script>
'''


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
         "The 365 portal is, and it already gives every customer bookings, reports and their own "
         "account area. A bespoke home dashboard is different: it is designed and built for your "
         "house, so it is quoted per home. There is no licence and no monthly per-camera fee - we "
         "would rather charge once for building it properly."),
        ("Why would I trust an IT firm with this rather than a security company?",
         "Because the hard part is not the cameras, it is everything talking to everything else "
         "reliably, and being told when it stops. That is thirty years of our trade. We have been "
         "doing this in Dorset since 1995, and we build the same kind of dashboards for Victron "
         "energy systems worldwide."),
    ]

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

        ' <section class="section section--alt"><div class="wrap wrap--narrow prose" data-reveal>',
        '<h2 class="section-title" data-title>Start free, and only pay if you want more'
        '<span class="title-underline"></span></h2>',
        '<p>We would rather you tried the free thing first, honestly.</p>',
        '<div class="table-wrap"><table class="table">',
        '<thead><tr><th></th><th>Your 365 portal</th><th>A bespoke home dashboard</th></tr></thead>'
        '<tbody>',
        '<tr><td><strong>Cost</strong></td><td>Free with support, and free to join</td>'
        '<td>Quoted once, per home</td></tr>',
        '<tr><td><strong>What it shows</strong></td><td>Bookings, your computers, reports, '
        'courses</td><td>Cameras, power, broadband, backups, doors, sensors &mdash; whatever '
        'your house has</td></tr>',
        '<tr><td><strong>Built for</strong></td><td>Everyone, the same</td><td>Your house '
        'specifically</td></tr>',
        '<tr><td><strong>Where</strong></td><td>365techies.co.uk/portal</td><td>Its own hosted '
        'address, any device, anywhere</td></tr>',
        '</tbody></table></div>',
        '<p>The portal is genuinely free and genuinely useful &mdash; <a href="/join/">join in '
        'about twenty seconds</a>, no card, no salesperson. If you later want the whole house on '
        'one screen, we build that to order.</p>',
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
