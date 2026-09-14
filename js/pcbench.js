/* PC benchmark tool (PCBENCH_TOOL in build_pages.py, on three pages). Was inline until 14 Sep 2026 (performance audit item 3): 29 KB that blocked the HTML parser now loads deferred and cached.
   Source of truth: this file. Minified by esbuild into pcbench.min.js; the page links it with a content-hash ?v=. */
(function(){
  var root=document.getElementById('bm'); if(!root) return;
  var KERNEL="function K(seed,n){var x=seed>>>0,acc=0;for(var i=0;i<n;i++){x^=(x<<13);x=x>>>0;x^=(x>>>17);x^=(x<<5);x=x>>>0;acc+=(x&255);if((i&1023)===0){acc+=Math.sqrt(x%1000)|0;}}return acc>>>0;}";
  var CPUW=KERNEL+"onmessage=function(e){var ms=e.data,t0=performance.now(),it=0,last=t0;for(;;){K(12345+it,200000);it+=200000;var now=performance.now();if(now-last>140){postMessage({t:0,v:it/((now-t0)/1000)});last=now;}if(now-t0>=ms)break;}postMessage({t:1,v:it/((performance.now()-t0)/1000)});};";
  var MEMW="onmessage=function(){var MB=1048576,src=new Uint8Array(16*MB),dst=new Uint8Array(16*MB),i;for(i=0;i<src.length;i+=4096)src[i]=i&255;var t0=performance.now(),bytes=0,acc=0,last=t0;for(;;){dst.set(src);bytes+=src.length;for(i=0;i<dst.length;i+=65536)acc+=dst[i];var now=performance.now();if(now-last>160){postMessage({t:0,v:(bytes/MB)/((now-t0)/1000)});last=now;}if(now-t0>=1400)break;}postMessage({t:1,v:(bytes/MB)/((performance.now()-t0)/1000)+(acc&0)});};";
  var startBtn=root.querySelector('#bm-start'), running=root.querySelector('#bm-running'), phaseEl=root.querySelector('#bm-phase'), liveEl=root.querySelector('#bm-live'), prog=root.querySelector('#bm-prog');
  var results=root.querySelector('#bm-results'), canvas=root.querySelector('#bm-canvas'), busy=false;
  var cores=navigator.hardwareConcurrency||4, LAST={};
  function gpuName(){ try{ var gl=document.createElement('canvas').getContext('webgl'); if(!gl) return null; var ext=gl.getExtension('WEBGL_debug_renderer_info'); return ext?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):null; }catch(e){ return null; } }
  function osName(){ var u=navigator.userAgent; if(/Windows/i.test(u))return 'Windows'; if(/Android/i.test(u))return 'Android'; if(/iPhone|iPad/i.test(u))return 'iOS'; if(/Mac/i.test(u))return 'macOS'; if(/CrOS/i.test(u))return 'ChromeOS'; if(/Linux/i.test(u))return 'Linux'; return null; }
  function browserName(){ var u=navigator.userAgent; if(/Edg\//.test(u))return 'Edge'; if(/OPR|Opera/.test(u))return 'Opera'; if(/SamsungBrowser/.test(u))return 'Samsung Internet'; if(/Chrome\//.test(u))return 'Chrome'; if(/Firefox\//.test(u))return 'Firefox'; if(/Safari\//.test(u))return 'Safari'; return null; }
  var DEVLINE='';
  (function(){ var chips=[]; var os=osName(); if(os)chips.push('<b>'+os+'</b>');
    var br=browserName(); if(br)chips.push('<b>'+br+'</b>');
    chips.push('<b>'+cores+'</b> CPU threads');
    if(navigator.deviceMemory)chips.push('<b>'+navigator.deviceMemory+'&nbsp;GB+</b> RAM (approx)');
    if(screen&&screen.width)chips.push('<b>'+screen.width+'&times;'+screen.height+'</b>');
    var g=gpuName(); if(g){ g=g.replace(/ANGLE \(|\)$/g,'').split(',').slice(0,2).join(','); if(g.length>46)g=g.slice(0,44)+'…'; chips.push('<b>'+g.replace(/</g,'&lt;')+'</b>'); }
    root.querySelector('#bm-device').innerHTML=chips.map(function(c){return '<span class="bm-chip">'+c+'</span>';}).join('');
    DEVLINE=[os,br,(cores+' threads'),(navigator.deviceMemory?navigator.deviceMemory+'GB+ RAM':null)].filter(Boolean).join(' · '); })();
  function worker(src,msg,tmo,onP){ return new Promise(function(res,rej){ try{ var u=URL.createObjectURL(new Blob([src],{type:'application/javascript'})); var w=new Worker(u); var t=setTimeout(function(){ try{w.terminate();}catch(e){} rej(new Error('timeout')); },tmo||20000);
    w.onmessage=function(e){ var d=e.data; if(d&&d.t===1){ clearTimeout(t); try{w.terminate();}catch(x){} URL.revokeObjectURL(u); res(d.v); } else if(d&&d.t===0){ if(onP)onP(d.v); } };
    w.onerror=function(){ clearTimeout(t); try{w.terminate();}catch(x){} rej(new Error('worker')); };
    w.postMessage(msg); }catch(e){ rej(e); } }); }
  function cryptoTest(onP){ if(!(window.crypto&&crypto.subtle&&crypto.subtle.digest)) return Promise.resolve(null);
    var buf=new Uint8Array(8*1048576); for(var i=0;i<buf.length;i+=512)buf[i]=(i*13)&255;
    var t0=performance.now(), mb=0;
    function step(){ return crypto.subtle.digest('SHA-256',buf).then(function(){ mb+=8; var el=performance.now()-t0; var rate=mb/(el/1000); if(onP)onP(rate); return el<1200?step():rate; }); }
    return step().catch(function(){ return null; }); }
  /* Graphics: shade N full-screen passes of a deliberately heavy fragment shader, make the GPU finish
     (readPixels is a hard sync point), time it, and grow N until each batch is GPU-bound. The result is
     pixels shaded per second - it does not care whether the screen is 60 Hz or 240 Hz, whether the tab is
     in front, or how the browser paces frames. The old version counted frames per second and could score a
     workstation like an office PC whenever the first second included shader compilation. */
  function gpuTest(onP){ return new Promise(function(res){ var gl;
    try{ gl=canvas.getContext('webgl',{powerPreference:'high-performance'})||canvas.getContext('experimental-webgl'); }catch(e){}
    if(!gl){ res(null); return; }
    function sh(t,s){ var o=gl.createShader(t); gl.shaderSource(o,s); gl.compileShader(o); return gl.getShaderParameter(o,gl.COMPILE_STATUS)?o:null; }
    var vs=sh(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');
    var fs=sh(gl.FRAGMENT_SHADER,'precision mediump float;uniform float u;void main(){vec2 q=gl_FragCoord.xy*0.02;float v=0.0;for(int k=1;k<=24;k++){v+=sin(q.x*float(k)*0.37+u)*cos(q.y*0.61-u*float(k));}gl_FragColor=vec4(0.1+0.5*abs(sin(u+v)),0.25+0.45*abs(v*0.05),0.55+0.35*abs(cos(u-v)),0.35);}');
    if(!vs||!fs){ res(null); return; }
    var pr=gl.createProgram(); gl.attachShader(pr,vs); gl.attachShader(pr,fs); gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){ res(null); return; }
    gl.useProgram(pr);
    var buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    var loc=gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    var uu=gl.getUniformLocation(pr,'u');
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    var px=canvas.width*canvas.height, n=4, t0=performance.now(), lastP=t0, samples=[], pix=new Uint8Array(4);
    function median(){ if(!samples.length) return 0; var c=samples.slice().sort(function(a,b){return a-b;}); return c[c.length>>1]; }
    function batch(){
      var a=performance.now();
      gl.clearColor(0.03,0.05,0.13,1); gl.clear(gl.COLOR_BUFFER_BIT);
      for(var i=0;i<n;i++){ gl.uniform1f(uu,(a/1000)*1.7+i*0.37); gl.drawArrays(gl.TRIANGLES,0,3); }
      gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pix);
      var now=performance.now(), dt=now-a, el=now-t0;
      if(el>500) samples.push(n*px/(dt/1000));                 /* the first half second is warm-up and shader compilation */
      if(dt<40) n=Math.ceil(n*1.6); else if(dt>120) n=Math.max(2,Math.floor(n*0.6));
      if(onP&&now-lastP>300){ onP(fmtG(median())+' &middot; '+n+' passes per batch'); lastP=now; }
      if(el>=3200||samples.length>=60){ res({gpix:median()}); return; }
      setTimeout(batch,0);                                       /* lets the live readout paint between batches */
    }
    batch(); }); }
  function fmtG(v){ return v>=1e9?((v/1e9).toFixed(1)+' Gpix/s'):(Math.round(v/1e6)+' Mpix/s'); }
  function storeTest(){ if(!('caches' in window)) return Promise.resolve(null);
    var data=new Uint8Array(4*1048576); for(var i=0;i<data.length;i+=1024)data[i]=(i*7)&255;
    var blob=new Blob([data]), c;
    return caches.open('tt-bench').then(function(cc){ c=cc; var t0=performance.now(), p=Promise.resolve();
      [0,1,2].forEach(function(k){ p=p.then(function(){ return c.put('/tt-bench-'+k,new Response(blob.slice(0))); }); });
      return p.then(function(){ var w=12/((performance.now()-t0)/1000); var r0=performance.now(), q=Promise.resolve();
        [0,1,2].forEach(function(k){ q=q.then(function(){ return c.match('/tt-bench-'+k).then(function(x){ return x.arrayBuffer(); }); }); });
        return q.then(function(){ var r=12/((performance.now()-r0)/1000); caches.delete('tt-bench'); return {w:w,r:r}; }); }); })
    .catch(function(){ try{ caches.delete('tt-bench'); }catch(e){} return null; }); }
  var GPU_REF=4.57e+10;   /* pixels shaded per second that scores 100 (a high-end desktop card); 8 points off per halving */
  function logScore(v,ref,base,mult){ if(v==null||!(v>0)) return null; var s=Math.round(base+mult*(Math.log(v/ref)/Math.log(2))); return Math.max(5,Math.min(100,s)); }
  function band(s){ return s>=60?'g':(s>=40?'a':'p'); }
  function fmtM(v){ return Math.round(v/1e6)+' M ops/s'; }
  function setPhase(txt,pct){ phaseEl.innerHTML=txt; prog.style.width=pct+'%'; }
  function live(txt){ liveEl.innerHTML=txt||'&nbsp;'; }
  startBtn.addEventListener('click',function(){
    if(busy) return;
    if(!window.Worker||!window.Blob){ phaseEl.textContent='Your browser can’t run the benchmark — please try a modern browser.'; running.hidden=false; return; }
    busy=true; startBtn.disabled=true; results.hidden=true; running.hidden=false; canvas.hidden=true; live('');
    var R={single:null,multi:null,crypto:null,mem:null,gpu:null,store:null};
    setPhase('1/6 &mdash; Single-core processor speed',5);
    worker(CPUW,1500,0,function(v){ live(Math.round(v/1e6)+' M ops/s'); }).then(function(v){ R.single=v;
      setPhase('2/6 &mdash; All '+cores+' processor threads together',20); live('');
      var n=Math.min(cores,64), rates=[], jobs=[];
      for(var i=0;i<n;i++){ (function(i){ rates[i]=0; jobs.push(worker(CPUW,1500,0,function(v){ rates[i]=v; var s=rates.reduce(function(a,b){return a+b;},0); live(Math.round(s/1e6)+' M ops/s combined'); }).catch(function(){return 0;})); })(i); }
      return Promise.all(jobs); }).then(function(arr){ R.multi=arr.reduce(function(a,b){return a+b;},0)||null;
      setPhase('3/6 &mdash; Encryption speed (SHA-256)',38); live('');
      return cryptoTest(function(v){ live(Math.round(v)+' MB/s hashed'); }); }).then(function(cv){ R.crypto=cv;
      setPhase('4/6 &mdash; Memory speed',52); live('');
      return worker(MEMW,0,20000,function(v){ live((v/1000).toFixed(1)+' GB/s'); }).catch(function(){return null;}); }).then(function(m){ R.mem=m;
      setPhase('5/6 &mdash; Graphics stress test (enjoy the show)',66); live(''); canvas.hidden=false;
      return gpuTest(function(txt){ live(txt); }); }).then(function(g){ R.gpu=g; canvas.hidden=true;
      setPhase('6/6 &mdash; Storage speed',88); live('');
      return storeTest(); }).then(function(st){ R.store=st; setPhase('Crunching your results&hellip;',100); live('');
      setTimeout(function(){ render(R); },400);
    }).catch(function(){ render(R); });
  });
  /* ---- community chart: opt-in, anonymous, one result per device, nothing shown below the floor ---- */
  var CHART=null, PCT=null;
  function devNonce(){ try{ var d=localStorage.getItem('tt_bench_dev'); if(d&&/^[A-Za-z0-9_-]{8,40}$/.test(d)) return d; var a=new Uint8Array(12); window.crypto.getRandomValues(a); d=''; for(var i=0;i<a.length;i++) d+='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[a[i]%62]; localStorage.setItem('tt_bench_dev',d); return d; }catch(e){ return 'anon'+Math.floor(Math.random()*1e9); } }
  function drawChart(overall){
    var box=root.querySelector('#bm-chart'), line=root.querySelector('#bm-chart-line'), sub=root.querySelector('#bm-chart-sub'), hist=root.querySelector('#bm-hist'), axis=root.querySelector('#bm-hist-axis');
    if(!box||!CHART||!CHART.ok) return;
    if(!CHART.enough){ hist.hidden=true; axis.hidden=true; sub.textContent=''; PCT=null;
      line.innerHTML=CHART.count+' result'+(CHART.count===1?'':'s')+' so far &middot; the chart appears at '+CHART.floor+'.<small>Every result is an opted-in, anonymous run of this page on a real computer. Add yours below.</small>'; box.hidden=false; return; }
    var mx=Math.max.apply(null,CHART.hist)||1, me=Math.min(19,Math.floor(overall/5)), h='';
    for(var i=0;i<20;i++){ h+='<i class="'+(i===me?'me':'')+'" style="height:'+Math.max(2,Math.round(100*CHART.hist[i]/mx))+'%" title="'+(i*5)+'-'+(i*5+4)+': '+CHART.hist[i]+'"></i>'; }
    hist.innerHTML=h; hist.hidden=false; axis.hidden=false;
    var below=Math.round(100*(CHART.cdf[Math.max(0,overall-1)]||0)); PCT=below;
    sub.textContent='('+CHART.count.toLocaleString()+' computers, last 12 months)';
    line.innerHTML='Faster than <b>'+below+'%</b> of the computers tested here.<small>Median score '+CHART.median+'. Each computer counts once, its latest run.</small>';
    box.hidden=false; }
  function loadChart(overall){ if(!window.fetch) return; fetch('/api/bench-stats.php?m='+Math.floor(Date.now()/60000)).then(function(r){return r.ok?r.json():null;}).then(function(d){ CHART=d; drawChart(overall); }).catch(function(){}); }
  function render(R){
    running.hidden=true; busy=false; startBtn.disabled=false; startBtn.textContent='Run it again';
    var S={ single:logScore(R.single,300e6,70,30), multi:logScore(R.multi,1800e6,70,12), crypto:logScore(R.crypto,900,70,20),
            mem:logScore(R.mem,11000,70,25), gpu:(R.gpu?logScore(R.gpu.gpix,GPU_REF,100,8):null),
            store:(R.store?logScore(0.6*R.store.w+0.4*R.store.r,350,70,20):null) };
    var parts=[[S.single,0.22],[S.multi,0.22],[S.crypto,0.08],[S.mem,0.13],[S.gpu,0.20],[S.store,0.15]].filter(function(p){return p[0]!=null;});
    if(!parts.length){ root.querySelector('#bm-verdict').innerHTML='<p>The benchmark couldn&rsquo;t run in this browser &mdash; try Chrome or Edge, or <a href="/contact/">ask us</a> to check your computer properly.</p>'; results.hidden=false; return; }
    var tw=parts.reduce(function(a,p){return a+p[1];},0);
    var overall=Math.round(parts.reduce(function(a,p){return a+p[0]*p[1];},0)/tw);
    LAST={scores:S, overall:overall, raw:R};
    var top=root.querySelector('.bm-top').parentNode;
    top.classList.remove('bm-good','bm-avg','bm-poor');
    top.classList.add(overall>=60?'bm-good':(overall>=40?'bm-avg':'bm-poor'));
    root.querySelector('#bm-score').textContent=overall;
    var v;
    if(overall>=90) v={g:'Workstation class',m:'A seriously fast machine &mdash; the kind of score a high-end workstation or gaming PC gets. Nothing here needs speeding up; the job is keeping it this way, and catching the one thing (a filling drive, a missed update, no backup) that quietly undoes it.'};
    else if(overall>=80) v={g:'Blazing fast',m:'This is a quick machine &mdash; everything should feel instant. If it doesn&rsquo;t, something else (startup programs, updates, malware) is slowing it down, and that&rsquo;s fixable.'};
    else if(overall>=60) v={g:'Running well',m:'A healthy, capable computer for everyday work. Keep it maintained and it&rsquo;ll stay that way.'};
    else if(overall>=40) v={g:'Room for improvement',m:'Usable, but you&rsquo;re waiting on it more than you should be. A tune-up &mdash; and often a simple upgrade &mdash; makes a machine like this feel new again.'};
    else v={g:'Struggling',m:'This machine is holding you back every day. Before you bin it: an SSD or memory upgrade often transforms a slow computer for a fraction of the cost of a new one &mdash; and if it really is time, we supply refurbished business-grade Dells from &pound;510.'};
    LAST.band=v.g;
    root.querySelector('#bm-verdict').innerHTML='<p class="bm-verdict-g">'+v.g+'</p><p>'+v.m+'</p>';
    root.querySelector('#bm-scale-me').style.left=Math.max(2,Math.min(98,overall))+'%';
    function row(label,score,stat){ if(score==null) return '<div class="bm-row"><div class="bm-row-h"><b>'+label+'</b><span>not available in this browser</span></div></div>';
      return '<div class="bm-row"><div class="bm-row-h"><b>'+label+'</b><span>'+stat+' &middot; <b style="color:#fff">'+score+'</b>/100</span></div><div class="bm-bar-wrap"><div class="bm-bar '+band(score)+'" data-w="'+score+'"></div></div></div>'; }
    root.querySelector('#bm-rows').innerHTML=
      row('Single-core CPU',S.single,R.single?fmtM(R.single):'')+
      row('Multi-core CPU ('+cores+' threads)',S.multi,R.multi?fmtM(R.multi):'')+
      row('Encryption (SHA-256)',S.crypto,R.crypto?Math.round(R.crypto)+' MB/s':'')+
      row('Memory speed',S.mem,R.mem?(Math.round(R.mem/1000*10)/10)+' GB/s':'')+
      row('Graphics (WebGL)',S.gpu,R.gpu?fmtG(R.gpu.gpix):'')+
      row('Storage (via browser)',S.store,R.store?(Math.round(R.store.w)+' MB/s write'):'');
    var histEl=root.querySelector('#bm-history'); histEl.innerHTML='';
    try{ var hist=JSON.parse(localStorage.getItem('tt_bench_hist')||'[]');
      if(hist.length){ var prev=hist[hist.length-1]; var diff=overall-prev.s; var when=new Date(prev.d).toLocaleDateString();
        var cls=diff>=0?' bm-note-good':''; var arrow=diff>0?('up <b>+'+diff+'</b>'):(diff<0?('down <b>'+diff+'</b>'):'<b>unchanged</b>');
        histEl.innerHTML='<div class="bm-note'+cls+'"><b>Since your last run</b> ('+when+', scored '+prev.s+'): '+arrow+' point'+(Math.abs(diff)===1?'':'s')+'. '+(diff>0?'Nice — whatever changed, it&rsquo;s working.':(diff<0?'If it keeps sliding, something&rsquo;s creeping in — a tune-up will find it.':''))+'</div>'; }
      hist.push({d:Date.now(), s:overall}); localStorage.setItem('tt_bench_hist',JSON.stringify(hist.slice(-6)));
    }catch(e){}
    var notes=[];
    if(navigator.deviceMemory&&navigator.deviceMemory<=4) notes.push('<b>Low memory:</b> your machine reports around '+navigator.deviceMemory+'&nbsp;GB of RAM &mdash; a memory upgrade is one of the cheapest, most effective speed boosts.');
    if(cores<=2) notes.push('<b>Ageing processor:</b> only '+cores+' threads &mdash; modern Windows and browsers really want more. Worth weighing a repair against a <a href="/repair-or-replace-advisor/">replacement</a>.');
    if(S.store!=null&&S.store<40) notes.push('<b>Slow storage:</b> this pattern usually means an old-style hard drive or a tired SSD &mdash; an SSD upgrade is the single biggest upgrade for a slow computer.');
    if(S.gpu==null) notes.push('<b>Graphics test unavailable:</b> your browser blocked WebGL, so graphics weren&rsquo;t scored.');
    var notesEl=root.querySelector('#bm-notes');
    notesEl.innerHTML=notes.map(function(n){return '<div class="bm-note">'+n+'</div>';}).join('');
    if(navigator.getBattery){ try{ navigator.getBattery().then(function(b){ if(b&&b.charging===false){ var d=document.createElement('div'); d.className='bm-note'; d.innerHTML='<b>On battery power:</b> laptops usually run faster plugged in &mdash; connect the charger and run it again for your best score.'; notesEl.appendChild(d); } }).catch(function(){}); }catch(e){} }
    PCT=null; loadChart(overall);
    var addBtn0=root.querySelector('#bm-add'); if(addBtn0){ addBtn0.disabled=false; addBtn0.textContent='Add my score to the chart'; root.querySelector('#bm-submit').classList.remove('done'); }
    var fix=root.querySelector('#bm-fix');
    if(overall>=60) fix.innerHTML='<h3>Keep it this way &mdash; a 365 support plan from &pound;18.25 a month</h3><p>Regular servicing is why our customers&rsquo; computers stay fast for years: a full service every six weeks, Windows, driver and app updates, security and backup checked, and a written Service Report every time. <b>Home &pound;18.25 per computer a month, business from &pound;24.38</b> &mdash; rolling monthly, no lock-in.</p><div class="bm-fix-cta"><a class="button primary" href="/monthly-it-support/">See Plans &amp; Prices &#8594;</a><a class="button bm-ghost" href="/free-pc-health-check/">Start free with 365 PC Manager</a></div>';
    else fix.innerHTML='<h3>Don&rsquo;t put up with a slow computer</h3><p>We speed up machines like this every week &mdash; a tune-up from &pound;65, an SSD or memory upgrade, or an honest &ldquo;it&rsquo;s time&rdquo; and a refurbished business-grade Dell from &pound;510. Then a <b>365 support plan from &pound;18.25 per computer a month</b> keeps it serviced every six weeks so it never slides back.</p><div class="bm-fix-cta"><a class="button primary" href="/contact/">Make mine faster &#8594;</a><a class="button bm-ghost" href="/monthly-it-support/">See Plans &amp; Prices</a></div>';
    results.hidden=false;
    root.querySelector('#bm-ring').style.strokeDashoffset=(339.292*(1-overall/100)).toFixed(1);
    window.ttToolDone&&window.ttToolDone("pc-benchmark");
    requestAnimationFrame(function(){ setTimeout(function(){ root.querySelectorAll('.bm-bar').forEach(function(b){ b.style.width=b.getAttribute('data-w')+'%'; }); },60); });
    try{ results.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
  }
  function bandColor(s){ return s>=60?'#2ecc71':(s>=40?'#f1c40f':'#e74c3c'); }
  root.querySelector('#bm-dl').addEventListener('click',function(){
    if(!LAST.scores) return;
    var cv=document.createElement('canvas'); cv.width=1080; cv.height=760; var x=cv.getContext('2d');
    x.fillStyle='#070d22'; x.fillRect(0,0,1080,760);
    x.strokeStyle='rgba(125,170,220,0.25)'; x.lineWidth=2; x.strokeRect(14,14,1052,732);
    x.fillStyle='#1d97e3'; x.font='700 26px "IBM Plex Mono", Consolas, monospace'; x.fillText('365 TECHIES',60,74);
    x.fillStyle='#9fb5d3'; x.font='16px "IBM Plex Mono", Consolas, monospace'; x.fillText('// FREE PC BENCHMARK',60,102);
    x.fillStyle=bandColor(LAST.overall); x.font='800 170px Archivo, Arial, sans-serif'; x.fillText(String(LAST.overall),60,300);
    x.fillStyle='#9fb5d3'; x.font='600 30px Archivo, Arial, sans-serif'; x.fillText('/100',60+x.measureText('').width+ (String(LAST.overall).length*95),300);
    x.fillStyle=bandColor(LAST.overall); x.font='800 40px Archivo, Arial, sans-serif'; x.fillText(LAST.band,60,368);
    x.fillStyle='#9fb5d3'; x.font='19px Archivo, Arial, sans-serif'; x.fillText(DEVLINE.slice(0,52),60,412);
    x.fillText(new Date().toLocaleDateString(),60,442);
    if(PCT!=null){ x.fillStyle='#2ecc71'; x.font='600 20px Archivo, Arial, sans-serif'; x.fillText('Faster than '+PCT+'% of computers tested at 365techies.co.uk',60,478); }
    var rows=[['Single-core CPU',LAST.scores.single],['Multi-core CPU',LAST.scores.multi],['Encryption',LAST.scores.crypto],['Memory',LAST.scores.mem],['Graphics',LAST.scores.gpu],['Storage',LAST.scores.store]];
    var y=120;
    rows.forEach(function(r){ var s=r[1];
      x.fillStyle='#eaf4ff'; x.font='600 22px Archivo, Arial, sans-serif'; x.fillText(r[0],560,y);
      if(s==null){ x.fillStyle='#9fb5d3'; x.font='18px Archivo, Arial, sans-serif'; x.fillText('n/a',985,y); }
      else{ x.fillStyle='rgba(255,255,255,0.12)'; x.fillRect(560,y+12,400,10);
        x.fillStyle=bandColor(s); x.fillRect(560,y+12,400*s/100,10);
        x.fillStyle='#eaf4ff'; x.font='700 20px Archivo, Arial, sans-serif'; x.fillText(String(s),985,y+2); }
      y+=62; });
    x.fillStyle='#eaf4ff'; x.font='700 26px Archivo, Arial, sans-serif'; x.fillText('How fast is YOUR computer?',60,640);
    x.fillStyle='#1d97e3'; x.font='700 28px Archivo, Arial, sans-serif'; x.fillText('365techies.co.uk/pc-benchmark',60,680);
    x.fillStyle='#9fb5d3'; x.font='17px Archivo, Arial, sans-serif'; x.fillText('Free · no downloads · IT support for homes & businesses since 1995',60,714);
    try{ var a=document.createElement('a'); a.download='365-benchmark-score-'+LAST.overall+'.png'; a.href=cv.toDataURL('image/png'); a.click(); }catch(e){}
  });
  root.querySelector('#bm-copy').addEventListener('click',function(){
    if(!LAST.scores) return; var S=LAST.scores;
    function p(n,v){ return v==null?'':(n+' '+v+' · '); }
    var txt='My 365 Techies PC Benchmark score: '+LAST.overall+'/100 ('+LAST.band+')'+(PCT!=null?' - faster than '+PCT+'% of computers tested there':'')+'\n'+
      (p('Single-core',S.single)+p('Multi-core',S.multi)+p('Encryption',S.crypto)+p('Memory',S.mem)+p('Graphics',S.gpu)+p('Storage',S.store)).replace(/ · $/,'')+'\n'+
      'Test yours free: https://365techies.co.uk/pc-benchmark/';
    var btn=this; function ok(){ btn.textContent='Copied!'; btn.classList.add('done'); setTimeout(function(){ btn.textContent='Copy my results'; btn.classList.remove('done'); },1800); }
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(ok).catch(function(){}); }
    else{ var ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); ok(); }catch(e){} document.body.removeChild(ta); }
  });
  var addBtn=root.querySelector('#bm-add');
  if(addBtn) addBtn.addEventListener('click',function(){
    if(!LAST.scores||!window.fetch) return; var S=LAST.scores, note=root.querySelector('#bm-add-note');
    function reset(){ addBtn.disabled=false; addBtn.textContent='Add my score to the chart'; }
    addBtn.disabled=true; addBtn.textContent='Adding…';
    var body={v:2,score:LAST.overall,sub:{single:S.single,multi:S.multi,crypto:S.crypto,mem:S.mem,gpu:S.gpu,store:S.store},threads:cores,os:osName()||'other',browser:browserName()||'other',gpu:(gpuName()||'').slice(0,60),dev:devNonce()};
    fetch('/api/bench-submit.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(j&&j.ok){ addBtn.textContent='Added, thank you'; root.querySelector('#bm-submit').classList.add('done'); note.textContent='Your run is in: '+j.count+' result'+(j.count===1?'':'s')+' so far'+(j.enough?'.':' - the chart appears at 50.'); if(j.enough){ setTimeout(function(){ loadChart(LAST.overall); },900); } }
        else if(j&&j.err==='rate'){ reset(); var m=Math.max(1,Math.ceil((j.retry_s||60)/60)); note.textContent='This computer was added recently - it counts once. Try again in '+m+' minute'+(m===1?'':'s')+'.'; }
        else { reset(); note.textContent='That did not go through ('+((j&&j.err)||'error')+'). You can try again.'; }
      }).catch(function(){ reset(); });
  });
  /* measurement: clicks on the plan panel's links (plans, app, contact, refurbs) */
  root.addEventListener('click',function(e){ var a=e.target.closest('#bm-fix a'); if(!a) return;
    try{ if(window.gtag&&localStorage.getItem('tt_internal')!=='1') gtag('event','plan_cta',{place:'benchmark',target:a.getAttribute('href'),score:LAST.overall||0,page:location.pathname}); }catch(x){} });
  /* Share my score: the share sheet where the browser has one (phones, Windows Chrome/Edge); elsewhere it copies */
  var shareBtn=root.querySelector('#bm-share');
  if(shareBtn) shareBtn.addEventListener('click',function(){
    if(!LAST.scores) return; var S=LAST.scores; function p(n,v){ return v==null?'':(n+' '+v+' · '); }
    var txt='My 365 Techies PC Benchmark score: '+LAST.overall+'/100 ('+LAST.band+')'+(PCT!=null?' - faster than '+PCT+'% of computers tested there':'')+' - '+
      (p('Single-core',S.single)+p('Multi-core',S.multi)+p('Memory',S.mem)+p('Graphics',S.gpu)+p('Storage',S.store)).replace(/ · $/,'')+'. Test yours free:';
    var url='https://365techies.co.uk/pc-benchmark/';
    if(navigator.share){ navigator.share({title:'My PC Benchmark score: '+LAST.overall+'/100',text:txt,url:url}).catch(function(){}); return; }
    var btn=shareBtn, full=txt+' '+url;
    function ok(){ btn.textContent='Copied — paste it anywhere'; btn.classList.add('done'); setTimeout(function(){ btn.textContent='Share my score'; btn.classList.remove('done'); },2200); }
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(full).then(ok).catch(function(){}); }
    else{ var ta=document.createElement('textarea'); ta.value=full; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); ok(); }catch(e){} document.body.removeChild(ta); }
  });
})();
