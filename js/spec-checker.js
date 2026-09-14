/* PC spec checker tool (/computer-spec-checker/). Was inline in build_extra.py SPECCHECK_TOOL until 14 Sep 2026 (performance audit item 3): 22 KB that blocked the HTML parser on every visit now loads deferred and cached.
   Source of truth: this file. Minified by esbuild into spec-checker.min.js; the page links it with a content-hash ?v=. */
(function(){
  var root=document.getElementById('spc'); if(!root) return;
  function $(s){return root.querySelector(s);}
  function step(k,st){ var el=$('.spc-step[data-step="'+k+'"]'); if(!el) return; el.classList.remove('is-on','is-done'); if(st) el.classList.add('is-'+st); }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var D={rows:[]}; /* flat row list reused for copy-text and the PNG sheet */
  var CARDS=[
    ['os','&#128187;','Operating system &amp; browser'],
    ['cpu','&#9881;&#65039;','Processor'],
    ['gpu','&#127918;','Graphics'],
    ['ram','&#129520;','Memory (RAM)'],
    ['disp','&#128421;&#65039;','Display'],
    ['store','&#128190;','Storage'],
    ['batt','&#128267;','Battery &amp; power'],
    ['net','&#127760;','Network'],
    ['av','&#127908;','Camera, mic &amp; sound'],
    ['loc','&#127757;','Locale']
  ];
  var grid=$('#spc-grid');
  CARDS.forEach(function(c){
    grid.insertAdjacentHTML('beforeend','<div class="spc-card" data-c="'+c[0]+'"><h3><span class="spc-ico">'+c[1]+'</span>'+c[2]+'</h3><div class="spc-rows"></div></div>');
  });
  function card(id){return grid.querySelector('[data-c="'+id+'"] .spc-rows');}
  function put(cid,label,val,approx){
    if(val==null||val==='')return;
    card(cid).insertAdjacentHTML('beforeend','<div class="spc-row"><b>'+label+'</b><span>'+esc(val)+(approx?'<span class="spc-approx">'+esc(approx)+'</span>':'')+'</span></div>');
    D.rows.push([label,String(val)+(approx?' ('+approx+')':'')]);
  }
  function putRaw(cid,html){card(cid).insertAdjacentHTML('beforeend',html);}
  /* ---------- gatherers (every one guarded — missing APIs degrade to honest text) ---------- */
  function parseUA(){
    var ua=navigator.userAgent||'', o={os:'',browser:'',amb:false};
    if(/Windows NT 10\.0/.test(ua)){o.os='Windows 10 or 11';o.amb=true;}
    else if(/Windows NT 6\.3/.test(ua))o.os='Windows 8.1';
    else if(/Windows NT 6\.1/.test(ua))o.os='Windows 7';
    else if(/iPhone|iPad/.test(ua))o.os='iOS / iPadOS';
    else if(/Android (\d+)/.test(ua))o.os='Android '+ua.match(/Android (\d+)/)[1];
    else if(/Mac OS X (\d+[._]\d+)/.test(ua))o.os='macOS '+ua.match(/Mac OS X (\d+[._]\d+)/)[1].replace('_','.');
    else if(/CrOS/.test(ua))o.os='ChromeOS';
    else if(/Linux/.test(ua))o.os='Linux';
    var m;
    if((m=ua.match(/Edg\/([\d.]+)/)))o.browser='Microsoft Edge '+m[1].split('.')[0];
    else if((m=ua.match(/OPR\/([\d.]+)/)))o.browser='Opera '+m[1].split('.')[0];
    else if((m=ua.match(/Firefox\/([\d.]+)/)))o.browser='Firefox '+m[1].split('.')[0];
    else if((m=ua.match(/Chrome\/([\d.]+)/)))o.browser='Chrome '+m[1].split('.')[0];
    else if((m=ua.match(/Version\/([\d.]+).*Safari/)))o.browser='Safari '+m[1].split('.')[0];
    return o;
  }
  function osInfo(cb){
    var base=parseUA();
    var out={os:base.os,browser:base.browser,arch:'',bit:'',model:'',win10:false,win11:false,amb:base.amb};
    try{
      if(navigator.userAgentData&&navigator.userAgentData.getHighEntropyValues){
        navigator.userAgentData.getHighEntropyValues(['platformVersion','architecture','bitness','model']).then(function(d){
          var p=navigator.userAgentData.platform||'';
          if(p==='Windows'){
            var maj=parseInt((d.platformVersion||'0').split('.')[0],10);
            if(maj>=13){out.os='Windows 11';out.win11=true;out.amb=false;}
            else if(maj>0){out.os='Windows 10';out.win10=true;out.amb=false;}
          }else if(p==='macOS'&&d.platformVersion){out.os='macOS '+d.platformVersion;}
          else if(p==='Chrome OS'){out.os='ChromeOS';}
          if(d.architecture){out.arch=d.architecture;out.bit=d.bitness||'';}
          if(d.model)out.model=d.model;
          cb(out);
        },function(){cb(out);});
        return;
      }
    }catch(e){}
    cb(out);
  }
  function gpuInfo(){
    var out={gpu:'',api:'None detected',maxTex:null,soft:false,ok:false};
    try{
      var c2=document.createElement('canvas'), gl=c2.getContext('webgl2'), ver='WebGL 2';
      if(!gl){ var c1=document.createElement('canvas'); gl=c1.getContext('webgl')||c1.getContext('experimental-webgl'); ver='WebGL 1'; }
      if(gl){
        out.ok=true; out.api=ver;
        var r='';
        var ext=gl.getExtension('WEBGL_debug_renderer_info');
        try{ r=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):(gl.getParameter(gl.RENDERER)||''); }catch(e2){}
        r=String(r||'');
        var m=r.match(/ANGLE \((.+)\)/); if(m)r=m[1];
        r=r.replace(/\(0x[0-9A-Fa-f]+\)/g,'')
           .replace(/Direct3D\d+|D3D\d+|vs_\d+_\d+|ps_\d+_\d+/g,'')
           .replace(/^(NVIDIA|AMD|Intel|Apple|Qualcomm|ARM|Microsoft|Google),\s+/i,'')
           .replace(/,?\s*(Unspecified Version|OpenGL( ES)? [\d.]+.*|Metal)\s*$/i,'')
           .replace(/,\s*(,|$)/g,'$1').replace(/\s{2,}/g,' ').replace(/[,\s]+$/,'').trim();
        out.gpu=r;
        out.soft=/swiftshader|llvmpipe|software|basic render/i.test(r);
        out.maxTex=gl.getParameter(gl.MAX_TEXTURE_SIZE);
      }
    }catch(e){}
    return out;
  }
  function webgpuInfo(cb){
    var done=false, t=setTimeout(function(){ if(!done){done=true;cb(null);} },1500);
    try{
      if(navigator.gpu&&navigator.gpu.requestAdapter){
        navigator.gpu.requestAdapter().then(function(a){
          if(done)return; done=true; clearTimeout(t);
          cb(a?'Yes':'Adapter unavailable');
        },function(){ if(!done){done=true;clearTimeout(t);cb(null);} });
      }else{ done=true; clearTimeout(t); cb('Not supported'); }
    }catch(e){ if(!done){done=true;clearTimeout(t);cb(null);} }
  }
  function refreshRate(cb){
    /* rAF freezes in hidden/background tabs — a done-flag + timeout stops the scan stalling */
    var done=false;
    function fin(v){ if(done)return; done=true; cb(v); }
    var guard=setTimeout(function(){fin(null);},2500);
    try{
      if(document.hidden){ clearTimeout(guard); fin(null); return; }
      var ts=[],n=0;
      function f(t){ if(done)return; ts.push(t); if(++n<50){requestAnimationFrame(f);} else {
        clearTimeout(guard);
        var ds=[]; for(var i=1;i<ts.length;i++){var d=ts[i]-ts[i-1]; if(d>1&&d<100)ds.push(d);}
        if(!ds.length){fin(null);return;}
        ds.sort(function(a,b){return a-b;});
        var hz=1000/ds[Math.floor(ds.length/2)];
        var common=[60,75,90,120,144,165,240], best=Math.round(hz);
        for(var j=0;j<common.length;j++){ if(Math.abs(common[j]-hz)<4){best=common[j];break;} }
        fin(best);
      } }
      requestAnimationFrame(f);
    }catch(e){ clearTimeout(guard); fin(null); }
  }
  /* ---------- the scan ---------- */
  var SCANLINES=['Identifying your operating system…','Reading your graphics card…','Counting processor cores…','Measuring your screen…','Checking the battery…','Listening to the network…','Compiling your report…'];
  var scanTimer=null,scanGen=0;
  function runScan(){
    scanGen++;
    D={rows:[]};
    Array.prototype.forEach.call(grid.querySelectorAll('.spc-rows'),function(x){x.innerHTML='';});
    Array.prototype.forEach.call(grid.querySelectorAll('.spc-card'),function(c){c.classList.remove('in');});
    $('#spc-verdict').hidden=true; $('#spc-actions').hidden=true; $('#spc-flags').innerHTML='';
    step('scan','on'); step('bench',''); step('share','');
    var sl=$('#spc-scanline'), si=0; sl.style.display='';
    if(scanTimer)clearInterval(scanTimer);
    scanTimer=setInterval(function(){ sl.textContent=SCANLINES[si%SCANLINES.length]; si++; },420);
    var g=scanGen, os=null, hz=null, wgpu=null, done=0, NEED=3;
    function maybe(){ if(++done<NEED)return; finish(g,os,hz,wgpu); }
    osInfo(function(o){os=o;maybe();});
    refreshRate(function(h){hz=h;maybe();});
    webgpuInfo(function(w){wgpu=w;maybe();});
  }
  function finish(g,os,hz,wgpu){
    if(g!==scanGen)return; /* a newer scan superseded this one */
    clearInterval(scanTimer);
    var g=gpuInfo();
    /* OS card */
    put('os','System',os.os||'Unknown',os.amb?'this browser hides which Windows':null);
    if(os.model)put('os','Device model',os.model);
    put('os','Browser',os.browser||'Unknown');
    if(os.arch)putRaw('os','<div class="spc-row"><b>Architecture</b><span>'+esc(os.arch)+(os.bit?' &middot; '+esc(os.bit)+'-bit':'')+'</span></div>');
    if(os.arch)D.rows.push(['Architecture',os.arch+(os.bit?' · '+os.bit+'-bit':'')]);
    put('os','Cookies enabled',navigator.cookieEnabled?'Yes':'No');
    /* CPU */
    var cores=navigator.hardwareConcurrency||null;
    put('cpu','Processor threads',cores?cores+' logical cores':'Hidden by this browser');
    put('cpu','Exact model','Hidden from websites','browsers never reveal CPU names — run our benchmark to measure real speed');
    /* GPU */
    put('gpu','Graphics card',g.gpu||(g.ok?'Name hidden by this browser':'No 3D support detected'));
    put('gpu','3D API',g.api+(wgpu==='Yes'?' + WebGPU':''));
    if(g.maxTex)put('gpu','Max texture size',g.maxTex+' px');
    if(g.soft)put('gpu','Hardware acceleration','OFF — running in software');
    /* RAM */
    var dm=navigator.deviceMemory;
    if(dm!=null){ put('ram','Memory available to sites',(dm>=8?'8 GB or more':'about '+dm+' GB'),'browsers round down and cap this — the real total may be higher'); }
    else put('ram','Memory','Hidden by this browser','Chrome and Edge reveal an approximate figure');
    /* Display */
    var w=screen.width||0,h=screen.height||0,dpr=window.devicePixelRatio||1,dispNote=dpr!==1?('scaled '+Math.round(dpr*100)+'% — drawn at '+w+' × '+h):null;
    if(!w||!h){ w=window.innerWidth; h=window.innerHeight; dispNote='browser window size — the screen kept its size private'; }
    put('disp','Resolution',Math.round(w*dpr)+' × '+Math.round(h*dpr)+' px',dispNote);
    if(hz)put('disp','Refresh rate','~'+hz+' Hz','measured live just now');
    put('disp','Colour depth',(screen.colorDepth||24)+'-bit');
    var gamut='sRGB'; try{ if(matchMedia('(color-gamut: rec2020)').matches)gamut='Rec.2020 (very wide)'; else if(matchMedia('(color-gamut: p3)').matches)gamut='Display-P3 (wide)'; }catch(e){}
    put('disp','Colour gamut',gamut);
    try{ put('disp','HDR',matchMedia('(dynamic-range: high)').matches?'Supported':'Standard'); }catch(e){}
    put('disp','Touchscreen',(navigator.maxTouchPoints>0)?('Yes — '+navigator.maxTouchPoints+' touch points'):'No');
    /* Storage */
    try{
      if(navigator.storage&&navigator.storage.estimate){
        navigator.storage.estimate().then(function(est){
          if(g!==scanGen)return;
          if(est&&est.quota){ var gb=est.quota/1073741824; put('store','Space this browser can use',(gb>=1?gb.toFixed(0)+' GB':(gb*1024).toFixed(0)+' MB'),'a rough hint of free disk space — not an exact reading'); }
          else put('store','Storage','No estimate available');
        },function(){if(g===scanGen)put('store','Storage','No estimate available');});
      } else put('store','Storage','Hidden by this browser');
    }catch(e){put('store','Storage','Hidden by this browser');}
    /* Battery */
    try{
      if(navigator.getBattery){
        navigator.getBattery().then(function(b){
          if(g!==scanGen)return;
          var pct=Math.round(b.level*100);
          var mains=(b.charging&&pct>=100); /* Chromium reports 100%+charging on battery-less desktops too */
          putRaw('batt','<div class="spc-row"><b>Charge</b><span>'+(mains?'On mains — battery full, or none fitted':pct+'% '+(b.charging?'⚡ charging':'on battery'))+'</span></div>');
          putRaw('batt','<div class="spc-batt"><div class="spc-battfill" style="background:'+(pct>50?'#2ecc71':(pct>20?'#f1c40f':'#e74c3c'))+'"></div></div>');
          D.rows.push(['Power',mains?'On mains — battery full, or none fitted':pct+'% '+(b.charging?'(charging)':'(on battery)')]);
          setTimeout(function(){ var f=root.querySelector('.spc-battfill'); if(f)f.style.width=pct+'%'; },120);
          if(!b.charging&&b.dischargingTime&&isFinite(b.dischargingTime)&&b.dischargingTime>0&&b.dischargingTime<86400)put('batt','Time remaining','~'+Math.round(b.dischargingTime/60)+' min','browser estimate');
        },function(){if(g===scanGen)put('batt','Battery','Not readable here');});
      } else put('batt','Battery','Hidden by this browser','desktops have none; Firefox & Safari hide it for privacy');
    }catch(e){put('batt','Battery','Not readable here');}
    /* Network */
    put('net','Status',navigator.onLine?'Online':'Offline');
    try{
      var c=navigator.connection;
      if(c){ if(c.effectiveType)put('net','Connection class',String(c.effectiveType).toUpperCase(),'as judged by the browser');
        if(c.downlink)put('net','Estimated speed','~'+c.downlink+' Mbps','rough browser estimate — run our speed test for the real figure');
        if(c.rtt)put('net','Latency estimate','~'+c.rtt+' ms'); }
      else put('net','Details','Hidden by this browser');
    }catch(e){}
    /* AV devices */
    try{
      if(navigator.mediaDevices&&navigator.mediaDevices.enumerateDevices){
        navigator.mediaDevices.enumerateDevices().then(function(ds){
          if(g!==scanGen)return;
          var n={videoinput:0,audioinput:0,audiooutput:0};
          ds.forEach(function(d){ if(n[d.kind]!=null)n[d.kind]++; });
          put('av','Cameras',n.videoinput||'None detected');
          put('av','Microphones',n.audioinput||'None detected');
          if(n.audiooutput)put('av','Speakers / outputs',n.audiooutput);
          putRaw('av','<div class="spc-row"><b>Names</b><span>Hidden until you grant permission<span class="spc-approx">counts only — test them on our <a href="/webcam-mic-test/" style="color:var(--cyan,#37c2c2)">webcam &amp; mic tester</a></span></span></div>');
        },function(){if(g===scanGen)put('av','Devices','Not readable here');});
      } else put('av','Devices','Hidden by this browser');
    }catch(e){}
    try{ var AC=window.AudioContext||window.webkitAudioContext; if(AC){ var ac=new AC(); put('av','Audio sample rate',(ac.sampleRate/1000)+' kHz'); ac.close(); } }catch(e){}
    /* Locale */
    put('loc','Language',(navigator.languages&&navigator.languages[0])||navigator.language||'');
    try{ put('loc','Time zone',Intl.DateTimeFormat().resolvedOptions().timeZone||''); }catch(e){}
    /* verdict + flags */
    var sl=$('#spc-scanline'); sl.style.display='none';
    var v=$('#spc-verdict');
    var bits=[];
    if(os.os)bits.push('<em>'+esc(os.os)+'</em>');
    if(cores)bits.push('<em>'+cores+' threads</em>');
    if(g.gpu)bits.push('<em>'+esc(g.gpu)+'</em>');
    bits.push('<em>'+Math.round(w*dpr)+'×'+Math.round(h*dpr)+(hz?' @ ~'+hz+'Hz':'')+'</em>');
    v.innerHTML='This machine: '+bits.join(' &middot; ');
    v.hidden=false;
    window.ttToolDone&&window.ttToolDone("computer-spec-checker");
    var fl=$('#spc-flags');
    if(os.win10)fl.insertAdjacentHTML('beforeend','<div class="spc-flag spc-flag--bad">&#9888;&#65039; <strong>You&rsquo;re on Windows 10 &mdash; it stopped getting security updates in October 2025.</strong> Every day online is riskier. See <a href="/windows-10-end-of-life/">your options</a> &mdash; many machines upgrade free, and we can check yours. Your routes are <a href="#windows-11">below</a>.</div>');
    if(os.win11)fl.insertAdjacentHTML('beforeend','<div class="spc-flag spc-flag--good">&#10004;&#65039; Windows 11 &mdash; you&rsquo;re on the current, supported Windows. Good.</div>');
    if(os.amb)fl.insertAdjacentHTML('beforeend','<div class="spc-flag spc-flag--warn">This browser won&rsquo;t say whether you&rsquo;re on Windows 10 or 11. Worth checking &mdash; Windows 10 is <a href="/windows-10-end-of-life/">out of security updates</a>. (Start &rarr; Settings &rarr; System &rarr; About.)</div>');
    if(g.soft)fl.insertAdjacentHTML('beforeend','<div class="spc-flag spc-flag--warn">&#9888;&#65039; <strong>Graphics are running in software</strong> &mdash; your real graphics card isn&rsquo;t being used. That makes everything feel slow; often a driver problem. <a href="/contact/">We fix this remotely</a>.</div>');
    if(dm!=null&&dm<=4)fl.insertAdjacentHTML('beforeend','<div class="spc-flag spc-flag--warn">Your browser reports about '+dm+' GB of memory. If the machine feels slow, a RAM or SSD upgrade is often the cheapest fix &mdash; <a href="/computer-tune-up/">worth a look</a>.</div>');
    $('#spc-actions').hidden=false;
    step('scan','done'); step('bench','on');
    /* tell the Windows 11 block further down what the scan found */
    window.__spcOS={os:os.os||'',win10:!!os.win10,win11:!!os.win11,amb:!!os.amb,gpu:(g.gpu||'')};
    try{ document.dispatchEvent(new CustomEvent('spc:done',{detail:window.__spcOS})); }catch(e){}
    /* staggered card reveal */
    Array.prototype.forEach.call(grid.querySelectorAll('.spc-card'),function(c,i){ setTimeout(function(){c.classList.add('in');},80+i*110); });
  }
  /* ---------- export ---------- */
  function sheetText(){
    var t='MY COMPUTER — SPEC SHEET\nChecked with 365techies.co.uk/computer-spec-checker/\n'+new Date().toLocaleString()+'\n\n';
    D.rows.forEach(function(r){ t+=r[0]+': '+r[1].replace(/<[^>]*>/g,'')+'\n'; });
    t+='\nNote: browsers hide some detail (exact RAM, serials, temperatures) by design.\n365 Techies · 01202 775566 · help@365techies.co.uk';
    return t;
  }
  $('#spc-copy').addEventListener('click',function(){
    var b=this;
    function done(ok){ b.textContent=ok?'Copied ✓':'Copy failed'; setTimeout(function(){b.textContent='Copy as text';},1800); }
    try{ navigator.clipboard.writeText(sheetText()).then(function(){done(true);},function(){done(false);}); }catch(e){ done(false); }
  });
  $('#spc-dl').addEventListener('click',function(){
    try{
      var rows=D.rows, W=1080, rowH=46, top=210, H=top+rows.length*rowH+150;
      var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
      var x=cv.getContext('2d');
      x.fillStyle='#0b1020'; x.fillRect(0,0,W,H);
      x.fillStyle='#37c2c2'; x.fillRect(0,0,W,6);
      x.fillStyle='#ffffff'; x.font='800 44px Archivo, Arial, sans-serif'; x.fillText('My Computer — Spec Sheet',48,86);
      x.fillStyle='#9aa6c2'; x.font='400 22px Arial'; x.fillText('Read live in the browser · '+new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}),48,124);
      x.strokeStyle='rgba(255,255,255,0.12)'; x.beginPath(); x.moveTo(48,160); x.lineTo(W-48,160); x.stroke();
      rows.forEach(function(r,i){
        var y=top+i*rowH;
        x.fillStyle='#9aa6c2'; x.font='400 22px Arial'; x.fillText(r[0],48,y);
        x.fillStyle='#ffffff'; x.font='600 22px Arial';
        var val=r[1].replace(/<[^>]*>/g,''); if(val.length>58)val=val.slice(0,57)+'…';
        x.textAlign='right'; x.fillText(val,W-48,y); x.textAlign='left';
      });
      var fy=H-70;
      x.fillStyle='#37c2c2'; x.font='700 24px Arial'; x.fillText('365 Techies',48,fy);
      x.fillStyle='#9aa6c2'; x.font='400 20px Arial'; x.fillText('365techies.co.uk/computer-spec-checker/ · 01202 775566 · Friendly IT help, Dorset',48,fy+30);
      var a=document.createElement('a'); a.download='my-computer-specs.png'; a.href=cv.toDataURL('image/png'); a.click();
    }catch(e){ alert('Sorry — the download didn’t work in this browser. Use “Copy as text” instead.'); }
  });
  $('#spc-again').addEventListener('click',runScan);
  /* step 2 lives further down the page, so wire it once the whole document exists */
  function wireBench(){
    var b=$('#spc-bench'), bench=document.getElementById('benchtool'), bmStart=document.getElementById('bm-start'), bmRes=document.getElementById('bm-results');
    if(!b) return; if(!bench||!bmStart){ b.hidden=true; return; }
    b.addEventListener('click',function(){ bench.scrollIntoView({behavior:'smooth',block:'start'}); if(!bmRes||bmRes.hidden){ setTimeout(function(){ bmStart.click(); },650); } });
    if(bmRes&&window.MutationObserver) new MutationObserver(function(){ if(!bmRes.hidden){ step('scan','done'); step('bench','done'); step('share','on'); } }).observe(bmRes,{attributes:true,attributeFilter:['hidden']});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wireBench); else wireBench();
  runScan();
})();
