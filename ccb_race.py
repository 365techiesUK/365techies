# -*- coding: utf-8 -*-
"""The load race for the website-rebuild case study.

WHY IT EXISTS. A page arguing "we build fast websites" that is itself three
tables and some prose argues against itself. This replays the two REAL measured
load sequences in real time, side by side: the new site finishes in 461ms and
the reader then sits watching the old one for another 1.8 seconds. Nobody needs
that explained afterwards - it is the one part of the page that proves the point
instead of asserting it.

RULES IT HAS TO KEEP
- Every millisecond here is measured, from baseline-2026-07-30.json. If those
  are ever re-measured, change them HERE and in the tables in
  ccb_rebuild_case_study.py together, or the page contradicts itself.
- prefers-reduced-motion gets the finished state immediately, not a jerky one.
- Fixed track height, so nothing shifts while it runs. A layout shift on a page
  about Core Web Vitals would be its own punchline.
- It auto-plays ONCE when scrolled into view, then only on request. Animation
  looping beside body text is hostile to anyone trying to read.
- The outcome goes into an aria-live region, so it is not purely visual.
- Pip positions are percentages of the shared 2,225ms scale and are computed in
  the comments below, not guessed:
      old ttfb  1320/2225 = 59.3%   old fcp 1808/2225 = 81.3%
      new ttfb    97/2225 =  4.4%   new fcp  544/2225 = 24.4%

It lives in its own module because it is one long HTML/CSS/JS literal, and
splicing that through a shell mangles the escapes - which it already did once.
"""

RACE = '''    <section class="section" aria-label="Watch the difference" id="race">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// PRESS PLAY AND WAIT</p>
          <h2 class="section-title section-title--center" data-title>Both sites loading, at the
            speed they really did<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Real time, real measurements. The new site has
            finished before the old one has drawn anything at all.</p>
        </div>

        <div class="rc" id="rc">
          <div class="rc__lane">
            <div class="rc__head"><span class="rc__tag rc__tag--old">Old &middot; WordPress</span>
              <span class="rc__ms" id="rcMsOld">0 ms</span></div>
            <div class="rc__track">
              <div class="rc__fill rc__fill--old" id="rcOld"></div>
              <span class="rc__pip" style="left:59.3%"><i></i><b>server answers</b></span>
              <span class="rc__pip" style="left:81.3%"><i></i><b>first paint</b></span>
            </div>
            <p class="rc__done" id="rcDoneOld">&nbsp;</p>
          </div>

          <div class="rc__lane">
            <div class="rc__head"><span class="rc__tag rc__tag--new">New &middot; static</span>
              <span class="rc__ms" id="rcMsNew">0 ms</span></div>
            <div class="rc__track">
              <div class="rc__fill rc__fill--new" id="rcNew"></div>
              <span class="rc__pip" style="left:4.4%"><i></i><b>server</b></span>
              <span class="rc__pip" style="left:24.4%"><i></i><b>first paint</b></span>
            </div>
            <p class="rc__done" id="rcDoneNew">&nbsp;</p>
          </div>

          <p class="rc__scale mono">both lanes share one scale &mdash; full width = 2,225 ms</p>
          <div class="rc__ctrl">
            <button class="button sm" id="rcGo" type="button">&#9654; Replay</button>
            <span class="rc__live mono" id="rcLive" role="status" aria-live="polite"></span>
          </div>
        </div>
      </div>
    </section>

<style>
.rc{max-width:900px;margin:0 auto;background:var(--panel,#0d1530);border:1px solid var(--line,#2a3b63);border-radius:14px;padding:1.15rem 1.2rem}
.rc__lane{margin-bottom:1.3rem}
.rc__head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.4rem;gap:.6rem}
.rc__tag{font-size:.8rem;font-weight:600}
.rc__tag--old{color:var(--mut,#9fb5d3)}
.rc__tag--new{color:#6fc2f5}
.rc__ms{font-family:var(--mono,monospace);font-size:.78rem;color:var(--soft,#86b6e8);font-variant-numeric:tabular-nums}
.rc__track{position:relative;height:26px;border-radius:7px;background:rgba(159,181,211,.10)}
.rc__fill{height:100%;width:0;border-radius:7px}
.rc__fill--old{background:linear-gradient(90deg,rgba(159,181,211,.45),rgba(159,181,211,.72))}
.rc__fill--new{background:linear-gradient(90deg,rgba(29,151,227,.55),#1d97e3)}
.rc__pip{position:absolute;top:0;height:100%;pointer-events:none}
.rc__pip i{position:absolute;top:0;left:0;width:2px;height:100%;background:rgba(240,245,252,.5)}
.rc__pip b{position:absolute;top:calc(100% + 5px);left:0;transform:translateX(-50%);white-space:nowrap;font-family:var(--mono,monospace);font-size:.56rem;letter-spacing:.06em;text-transform:uppercase;color:var(--mut,#9fb5d3);font-weight:400}
.rc__done{margin:1.6rem 0 0;min-height:1.25em;font-size:.82rem;color:var(--soft,#86b6e8)}
.rc__done strong{color:var(--white,#f0f5fc)}
.rc__scale{font-size:.6rem;letter-spacing:.08em;text-transform:uppercase;color:var(--mut,#9fb5d3);text-align:center;margin:.1rem 0 .9rem}
.rc__ctrl{display:flex;align-items:center;gap:.7rem;justify-content:center;flex-wrap:wrap}
.rc__live{font-size:.7rem;color:var(--mut,#9fb5d3)}
@media (prefers-reduced-motion:reduce){.rc__fill{transition:none}}
</style>
<script>
(function(){
  var OLD={load:2225}, NEW={load:461}, MAX=2225;
  var elO=document.getElementById("rcOld"), elN=document.getElementById("rcNew");
  var msO=document.getElementById("rcMsOld"), msN=document.getElementById("rcMsNew");
  var dO=document.getElementById("rcDoneOld"), dN=document.getElementById("rcDoneNew");
  var go=document.getElementById("rcGo"), live=document.getElementById("rcLive");
  var box=document.getElementById("rc");
  if(!elO||!elN||!go||!box) return;
  var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion:reduce)").matches;
  var running=false;

  function paint(t){
    var o=Math.min(t,OLD.load), n=Math.min(t,NEW.load);
    elO.style.width=(o/MAX*100)+"%"; elN.style.width=(n/MAX*100)+"%";
    msO.textContent=Math.round(o)+" ms"; msN.textContent=Math.round(n)+" ms";
    if(t>=NEW.load && dN.getAttribute("data-set")!=="1"){ dN.setAttribute("data-set","1");
      dN.innerHTML="<strong>Done.</strong> Fully loaded in 461&nbsp;ms."; }
    if(t>=OLD.load && dO.getAttribute("data-set")!=="1"){ dO.setAttribute("data-set","1");
      dO.innerHTML="<strong>Done.</strong> 2,225&nbsp;ms &mdash; 4.8&times; longer."; }
  }
  function finish(){
    running=false; go.disabled=false; go.innerHTML="&#9654; Replay";
    live.textContent="Finished. New site 461 ms, old site 2,225 ms.";
  }
  function run(){
    if(running) return;
    running=true; go.disabled=true; go.innerHTML="running\\u2026";
    dO.setAttribute("data-set",""); dN.setAttribute("data-set","");
    dO.innerHTML="&nbsp;"; dN.innerHTML="&nbsp;";
    live.textContent="Loading both sites in real time\\u2026";
    if(reduce){ paint(MAX); finish(); return; }
    var t0=null;
    function step(ts){
      if(t0===null) t0=ts;
      var t=ts-t0; paint(t);
      if(t<MAX){ requestAnimationFrame(step); } else { paint(MAX); finish(); }
    }
    requestAnimationFrame(step);
  }
  go.addEventListener("click",run);

  var seen=false;
  if("IntersectionObserver" in window){
    var io=new IntersectionObserver(function(es){
      for(var i=0;i<es.length;i++){
        if(es[i].isIntersecting && !seen){ seen=true; io.disconnect(); setTimeout(run,320); }
      }
    },{threshold:0});
    io.observe(box);
  } else { paint(MAX); finish(); }
})();
</script>'''
