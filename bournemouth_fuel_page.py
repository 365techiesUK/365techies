"""
/bournemouth/fuel-prices/ - the cheapest petrol and diesel near you, Bournemouth and around (4 Oct 2026).

WHY
Owner, 4 Oct 2026: "an app that shows you where the petrol and diesel is cheapest locally ... from a postcode or on a
phone it will use the GPS ... build it under Bournemouth365". Honest expectation set the same day: Google's results
for "cheapest petrol Bournemouth" are held by programmatic sites with a page per station (fuel-finder.uk,
stationwatch.co.uk, petrolfinder.uk) and Google Maps shows pump prices itself, so this is a FACEBOOK-LED local tool
(the Bournemouth365 page's ~39,500 followers, a weekly "cheapest in BCP" post), not an SEO play. No per-station pages.

DATA: api/bm-fuel.php -> api/bm-fuel-lib.php (cron-refreshed store; see that file's header for sources and the
honesty rules). Until the government's Fuel Finder feed is wired the store is a PARTIAL preview from the retailers' own
feeds, and the page says so in a banner built from the store's own source list.

PRIVACY: GPS never leaves the phone - the page downloads every station in the area and works out distances itself.
A postcode goes to our own endpoint in a POST body (not in any access log) and on to postcodes.io; nothing stores it.

HIDDEN until the owner says go AND the official feed is wired: PUBLIC = False -> noindex,follow (so not in
sitemap.xml) + nosearch (not in the site search or llms.txt). Not linked from the Bournemouth365 hub yet.
"""
import build_pages as _bp
from build_pages import add, graph, crumb_sub, webpage, faqpage, faq_html, hero, bc_sub
import bournemouth_places as _pl

_SLUG = "bournemouth/fuel-prices"
PUBLIC = False
# Flip to True in the same commit that wires the official adapter in api/bm-fuel-lib.php: the FAQ's source answer
# and the attribution line follow it.
OFFICIAL = True   # 4 Oct 2026: the live server pulled 290 forecourts from Fuel Finder at 19:30

_TITLE = "Cheapest Petrol & Diesel Near Bournemouth: Live Prices"
_DESC = ("The cheapest petrol and diesel near you in Bournemouth, Poole, Christchurch and around: live pump prices, "
         "nearest first or cheapest first, from your postcode or your phone's location. Free, no adverts.")

_HEAD = '''
  <link rel="stylesheet" href="/vendor/leaflet/leaflet.css" />
  <style>
    .bfp{max-width:1100px}
    .bfp-controls{display:grid;gap:.8rem;margin:0 0 1rem}
    .bfp-fuels{display:flex;flex-wrap:wrap;gap:.5rem}
    .bfp-fuels button{min-height:44px;padding:.55rem 1rem;border-radius:999px;border:1px solid var(--b365-line);background:var(--b365-water);color:var(--b365-foam);font:inherit;font-size:.95rem;cursor:pointer}
    .bfp-fuels button[aria-pressed="true"]{background:var(--b365-surf);border-color:var(--b365-surf);color:#04121a;font-weight:650}
    .bfp-where{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
    .bfp-where button,.bfp-where input,.bfp-where select{min-height:44px;border-radius:10px;border:1px solid var(--b365-line);background:var(--b365-water);color:var(--b365-foam);font:inherit;font-size:1rem;padding:.5rem .8rem}
    .bfp-where button{cursor:pointer}
    .bfp-where .bfp-gps{background:var(--b365-surf);border-color:var(--b365-surf);color:#04121a;font-weight:650}
    .bfp-where form{display:flex;gap:.4rem;flex:1 1 15rem;min-width:0}
    .bfp-where input{flex:1 1 auto;min-width:0;text-transform:uppercase}
    .bfp-where input::placeholder{text-transform:none}
    .bfp-status{color:var(--b365-mute);font-size:.95rem;margin:.2rem 0 0;min-height:1.4em}
    .bfp-banner{border:1px solid var(--b365-dusk);background:rgba(255,176,102,.08);border-radius:12px;padding:.8rem 1rem;margin:0 0 1rem;font-size:.95rem;line-height:1.5}
    .bfp-banner b{color:var(--b365-dusk)}
    .bfp-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.6rem;margin:0 0 1rem}
    .bfp-summary .b365-tile{padding:.75rem .85rem}
    .bfp-summary .b365-num{font-size:clamp(1.7rem,6vw,2.6rem)}
    .bfp-summary .b365-sub{font-size:.85rem;line-height:1.4}
    @media (max-width:600px){.bfp-banner{font-size:.85rem;padding:.6rem .8rem}}
    /* A tool, used standing at a car: on a phone the hero keeps only its headline so the fuel buttons and
       "Use my location" sit on the first screen. Page-scoped (HEAD_EXTRA is this page only). */
    @media (max-width:767px){
      .page-hero .lede,.page-hero__chips,.page-hero__cta,.page-hero__byline{display:none}
      .page-hero{padding-bottom:0}
      #finder{padding-top:.75rem}
    }
    .bfp-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:1rem;align-items:start}
    @media (max-width:860px){.bfp-grid{grid-template-columns:minmax(0,1fr)}.bfp-mapwrap{order:-1}}
    .bfp-list{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}
    .bfp-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.2rem .8rem;align-items:center;padding:.7rem .85rem;border:1px solid var(--b365-line);border-radius:12px;background:var(--b365-water);cursor:pointer}
    .bfp-item:focus-visible,.bfp-item:hover{border-color:var(--b365-surf);outline:none}
    .bfp-item.best{border-color:var(--b365-surf);box-shadow:inset 3px 0 0 var(--b365-surf)}
    .bfp-rank{font-family:var(--mono,ui-monospace,monospace);color:var(--b365-mute);font-size:.8rem;width:1.6rem;text-align:center}
    .bfp-name{font-weight:650;color:var(--b365-foam);overflow-wrap:anywhere}
    .bfp-addr{color:var(--b365-mute);font-size:.88rem;grid-column:2;overflow-wrap:anywhere}
    .bfp-price{font-size:1.35rem;font-weight:700;color:var(--b365-foam);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
    .bfp-item.best .bfp-price{color:var(--b365-surf)}
    .bfp-meta{grid-column:3;text-align:right;color:var(--b365-mute);font-size:.82rem;white-space:nowrap}
    .bfp-dir{grid-column:2 / 4;font-size:.88rem}
    .bfp-dir a{color:var(--b365-surf)}
    .bfp-mapwrap{position:sticky;top:5rem}
    #bfp-map{height:min(70vh,560px);border-radius:14px;border:1px solid var(--b365-line);background:var(--b365-deep)}
    @media (max-width:860px){.bfp-mapwrap{position:static}#bfp-map{height:52vh}}
    .bfp-pin span{display:inline-block;transform:translate(-50%,-100%);background:var(--b365-water);color:var(--b365-foam);border:1px solid var(--b365-line);border-radius:8px;padding:2px 6px;font:600 12px/1.3 system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.4)}
    .bfp-pin.best span{background:var(--b365-surf);color:#04121a;border-color:var(--b365-surf)}
    .bfp-me{width:16px;height:16px;border-radius:50%;background:#4ea1ff;border:3px solid #fff;box-shadow:0 0 0 2px rgba(78,161,255,.5)}
    .bfp-src{color:var(--b365-mute);font-size:.85rem;line-height:1.55;margin:1rem 0 0}
    .bfp-empty{color:var(--b365-mute);padding:1rem;border:1px dashed var(--b365-line);border-radius:12px}
    .leaflet-popup-content{font:14px/1.45 system-ui,sans-serif}
  </style>'''

_TOOL = '''    <section class="section b365" id="finder" aria-label="Find the cheapest fuel">
      <div class="wrap bfp">
        <div class="bfp-controls">
          <div class="bfp-fuels" role="group" aria-label="Fuel">
            <button type="button" data-f="E10" aria-pressed="true">Unleaded</button>
            <button type="button" data-f="B7" aria-pressed="false">Diesel</button>
            <button type="button" data-f="E5" aria-pressed="false">Super unleaded</button>
            <button type="button" data-f="SDV" aria-pressed="false">Premium diesel</button>
          </div>
          <div class="bfp-where">
            <button type="button" class="bfp-gps" id="bfp-gps">&#9673; Use my location</button>
            <form id="bfp-pcform" autocomplete="on">
              <label for="bfp-pc" class="sr-only">Postcode</label>
              <input id="bfp-pc" name="postcode" inputmode="text" autocomplete="postal-code" placeholder="or postcode, e.g. BH8 8DQ" maxlength="9" />
              <button type="submit">Go</button>
            </form>
            <label for="bfp-rad" class="sr-only">Distance</label>
            <select id="bfp-rad">
              <option value="2">within 2 miles</option>
              <option value="5" selected>within 5 miles</option>
              <option value="10">within 10 miles</option>
              <option value="20">within 20 miles</option>
            </select>
          </div>
          <p id="bfp-status" class="bfp-status" aria-live="polite">Loading today&rsquo;s prices&hellip;</p>
        </div>
        <div id="bfp-banner" class="bfp-banner" hidden></div>
        <div id="bfp-summary" class="bfp-summary" aria-live="polite"></div>
        <div class="bfp-grid">
          <ol id="bfp-list" class="bfp-list" aria-label="Cheapest first"></ol>
          <div class="bfp-mapwrap"><div id="bfp-map" role="region" aria-label="Map of the stations"></div></div>
        </div>
        <p id="bfp-src" class="bfp-src"></p>
        <p class="bfp-src">Your location stays on your phone: the page downloads every station in the area and works out the distances itself. A postcode is looked up through our own server and is not stored.</p>
      </div>
    </section>
    <script src="/vendor/leaflet/leaflet.js" defer></script>
    <script src="/vendor/protomaps/protomaps-leaflet.js" defer></script>
    <script src="/vendor/leaflet/touch-friendly.js?v=20260819c" defer></script>
    <script>
    (function(){
      var FUEL_NAME={E10:'Unleaded',B7:'Diesel',E5:'Super unleaded',SDV:'Premium diesel'};
      var HOME={la:50.7208,lo:-1.8794,label:'Bournemouth town centre'};   /* The Square */
      var DATA=null, fuel='E10', radius=5, centre=HOME, map=null, layer=null, meMarker=null, markers={};
      try{var f=localStorage.getItem('bfp-fuel'); if(FUEL_NAME[f]) fuel=f;}catch(e){}
      var $=function(id){return document.getElementById(id);};
      function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
      function miles(a,b,c,d){var R=3958.8,r=Math.PI/180,x=Math.sin((c-a)*r/2),y=Math.sin((d-b)*r/2);
        var h=x*x+Math.cos(a*r)*Math.cos(c*r)*y*y;return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));}
      function hm(t){var d=new Date(t*1000),n=new Date(),hh=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
        var y=new Date(n.getTime()-864e5);
        if(d.toDateString()===n.toDateString())return hh;
        if(d.toDateString()===y.toDateString())return hh+' yesterday';
        return hh+' on '+d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});}
      function inArea(la,lo){var a=DATA&&DATA.area;return a&&lo>=a[0]&&lo<=a[2]&&la>=a[1]&&la<=a[3];}
      function status(t){$('bfp-status').textContent=t;}
      function pressFuel(){[].forEach.call(document.querySelectorAll('.bfp-fuels button'),function(b){b.setAttribute('aria-pressed',b.getAttribute('data-f')===fuel?'true':'false');});}

      function within(la,lo,r,f){
        var out=[];(DATA.stations||[]).forEach(function(s){if(s.p[f]==null)return;var d=miles(la,lo,s.la,s.lo);if(d<=r)out.push({s:s,d:d,p:s.p[f]});});
        out.sort(function(a,b){return a.p-b.p||a.d-b.d;});return out;}

      function summary(){
        var html='';
        ['E10','B7'].forEach(function(f){var r=within(HOME.la,HOME.lo,6,f);if(!r.length)return;var b=r[0];
          html+='<div class="b365-tile"><p class="b365-sub" style="margin:0">Cheapest '+FUEL_NAME[f].toLowerCase()+' near Bournemouth</p>'+
            '<p class="b365-num" style="margin:.2rem 0">'+b.p.toFixed(1)+'<small>p</small></p>'+
            '<p class="b365-sub" style="margin:0">'+esc(b.s.b)+', '+esc(b.s.a)+' &middot; of '+r.length+' stations within 6 miles</p></div>';});
        $('bfp-summary').innerHTML=html;
      }

      function banner(){
        var el=$('bfp-banner');
        if(!DATA.partial){el.hidden=true;return;}
        var inc=[],miss=[];
        (DATA.sources||[]).forEach(function(s){if(s.id==='official')return;
          if(s.ok&&(s.total==null||s.total>=5)){if(s.n>0)inc.push(s.label);}else miss.push(s.label);});
        el.innerHTML='<b>Preview &mdash; not every forecourt yet.</b> These prices come from the retailers that still publish their own feeds'+
          (inc.length?' ('+esc(inc.join(', '))+')':'')+'. '+(miss.length?'Not included: '+esc(miss.join(', '))+', and most independent forecourts. ':'')+
          'So the cheapest here may not be the cheapest near you. The government&rsquo;s full feed, with every forecourt, is being switched on.';
        el.hidden=false;
      }

      function sources(){
        var t='Prices last fetched at '+hm(DATA.fetched_at)+'.';
        if(DATA.stale)t='These prices were last fetched at '+hm(DATA.fetched_at)+' and may be out of date.';
        if(DATA.mode==='official'){t+=' From the government&rsquo;s Fuel Finder service: forecourts must report a price change within 30 minutes. Contains public sector information licensed under the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" rel="noopener">Open Government Licence v3.0</a>.';}
        else{var parts=[];(DATA.sources||[]).forEach(function(s){if(s.ok&&s.n>0&&s.updated)parts.push(esc(s.label)+'&rsquo;s list from '+hm(s.updated));});
          if(parts.length)t+=' '+parts.join('; ')+'.';}
        t+=' Always check the price on the pump before you fill up.';
        $('bfp-src').innerHTML=t;
      }

      function ensureMap(){
        if(map||typeof L==='undefined'||typeof protomapsL==='undefined')return !!map;
        map=L.map('bfp-map',{zoomControl:true});
        if(window.makeTouchFriendly)makeTouchFriendly(map);
        protomapsL.leafletLayer({url:'/vendor/protomaps/uk.pmtiles',flavor:'dark',maxDataZoom:10,attribution:''}).addTo(map);
        protomapsL.leafletLayer({url:'/vendor/protomaps/southcoast.pmtiles',flavor:'dark',maxDataZoom:14,minZoom:11,bounds:[[50.45,-2.98],[51.15,-0.90]],
          attribution:'<a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a> &copy; <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
        layer=L.layerGroup().addTo(map);
        return true;
      }

      function popup(s){
        var rows='';['E10','E5','B7','SDV'].forEach(function(f){if(s.p[f]!=null)rows+='<br>'+FUEL_NAME[f]+': <b>'+s.p[f].toFixed(1)+'p</b>'+(s.pt&&s.pt[f]?' <small>from '+hm(s.pt[f])+'</small>':'');});
        return '<b>'+esc(s.b)+'</b>'+(s.n?'<br>'+esc(s.n):'')+'<br>'+esc(s.a)+(s.pc?', '+esc(s.pc):'')+rows+
          '<br><a href="https://www.google.com/maps/dir/?api=1&destination='+s.la+','+s.lo+'" target="_blank" rel="noopener">Directions</a>';
      }

      function drawMap(r){
        if(!ensureMap())return setTimeout(function(){drawMap(r);},250);
        layer.clearLayers();markers={};
        r.forEach(function(x,i){
          var m=L.marker([x.s.la,x.s.lo],{icon:L.divIcon({className:'bfp-pin'+(i===0?' best':''),html:'<span>'+x.p.toFixed(1)+'</span>',iconSize:null}),
            zIndexOffset:i===0?1000:-i,title:x.s.b+' '+x.p.toFixed(1)+'p'}).bindPopup(popup(x.s));
          layer.addLayer(m);markers[x.s.id]=m;});
        if(meMarker){map.removeLayer(meMarker);meMarker=null;}
        if(centre!==HOME)meMarker=L.marker([centre.la,centre.lo],{icon:L.divIcon({className:'',html:'<div class="bfp-me"></div>',iconSize:[16,16],iconAnchor:[8,8]}),interactive:false}).addTo(map);
        var dLat=radius/69,dLon=radius/(69*Math.cos(centre.la*Math.PI/180));
        map.fitBounds([[centre.la-dLat,centre.lo-dLon],[centre.la+dLat,centre.lo+dLon]]);
      }

      function render(){
        if(!DATA)return;
        var r=within(centre.la,centre.lo,radius,fuel);
        var list=$('bfp-list');
        status('Cheapest '+FUEL_NAME[fuel].toLowerCase()+' within '+radius+' miles of '+centre.label+(centre.acc?' (accurate to about '+centre.acc+' m)':'')+': '+r.length+' station'+(r.length===1?'':'s')+'.');
        if(!r.length){list.innerHTML='<li class="bfp-empty">No stations within '+radius+' miles have a '+FUEL_NAME[fuel].toLowerCase()+' price in today&rsquo;s data. Try a bigger distance.</li>';}
        else list.innerHTML=r.slice(0,15).map(function(x,i){
          return '<li class="bfp-item'+(i===0?' best':'')+'" tabindex="0" data-id="'+esc(x.s.id)+'">'+
            '<span class="bfp-rank">'+(i+1)+'</span><span class="bfp-name">'+esc(x.s.b)+'</span>'+
            '<span class="bfp-price">'+x.p.toFixed(1)+'p</span>'+
            '<span class="bfp-addr">'+esc(x.s.a)+(x.s.pt&&x.s.pt[fuel]?' &middot; price from '+hm(x.s.pt[fuel]):'')+'</span><span class="bfp-meta">'+x.d.toFixed(1)+' mi</span>'+
            '<span class="bfp-dir"><a href="https://www.google.com/maps/dir/?api=1&destination='+x.s.la+','+x.s.lo+'" target="_blank" rel="noopener">Directions</a></span></li>';}).join('');
        drawMap(r);
      }

      function focusStation(id){var m=markers[id];if(!m||!map)return;map.setView(m.getLatLng(),Math.max(map.getZoom(),14));m.openPopup();
        if(window.innerWidth<=860)$('bfp-map').scrollIntoView({behavior:'smooth',block:'center'});}

      $('bfp-list').addEventListener('click',function(e){if(e.target.closest('a'))return;var li=e.target.closest('.bfp-item');if(li)focusStation(li.getAttribute('data-id'));});
      $('bfp-list').addEventListener('keydown',function(e){if(e.key!=='Enter'&&e.key!==' ')return;var li=e.target.closest('.bfp-item');if(li){e.preventDefault();focusStation(li.getAttribute('data-id'));}});
      [].forEach.call(document.querySelectorAll('.bfp-fuels button'),function(b){b.addEventListener('click',function(){fuel=b.getAttribute('data-f');try{localStorage.setItem('bfp-fuel',fuel);}catch(e){}pressFuel();render();});});
      $('bfp-rad').addEventListener('change',function(){radius=+this.value;render();});

      $('bfp-gps').addEventListener('click',function(){
        if(!navigator.geolocation){status('This browser cannot share its location. Try a postcode instead.');return;}
        status('Finding where you are…');
        navigator.geolocation.getCurrentPosition(function(p){
          var la=p.coords.latitude,lo=p.coords.longitude;
          if(!inArea(la,lo)){status('You look to be outside the area this covers (Weymouth to Chichester, up to Salisbury, and the Isle of Wight).');return;}
          centre={la:la,lo:lo,label:'you',acc:Math.round(p.coords.accuracy)};render();
        },function(err){status(err.code===1?'Location was not allowed. You can type a postcode instead.':'Your location could not be found just now. Try a postcode instead.');},
        {enableHighAccuracy:true,timeout:15000,maximumAge:60000});
      });

      $('bfp-pcform').addEventListener('submit',function(e){
        e.preventDefault();var v=$('bfp-pc').value.trim();if(!v)return;
        status('Looking up '+v.toUpperCase()+'…');
        fetch('/api/bm-fuel.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pc:v})})
          .then(function(r){return r.json();}).then(function(j){
            if(!j.ok){status(j.error==='format'?'That does not look like a postcode. Try one like BH8 8DQ, or just BH8.':'We could not find that postcode. Check it, or try just the first part, like BH8.');return;}
            if(!j.in_area){status(j.pc+' is outside the area this covers (Weymouth to Chichester, up to Salisbury, and the Isle of Wight).');return;}
            centre={la:j.la,lo:j.lo,label:j.pc+(j.district?' (the middle of the district)':'')};render();
          }).catch(function(){status('The postcode lookup did not answer. Please try again in a moment.');});
      });

      pressFuel();
      fetch('/api/bm-fuel.php').then(function(r){return r.json();}).then(function(d){
        if(!d||!d.ok){status('Prices are not available just now. Please try again in a few minutes.');return;}
        DATA=d;banner();summary();sources();render();
      }).catch(function(){status('Prices could not be loaded. Please check your connection and try again.');});
    })();
    </script>'''


def _faqs():
    if OFFICIAL:
        src = ("From the government&rsquo;s Fuel Finder service. Since February 2026 the law (the Motor Fuel Price (Open Data) "
               "Regulations 2025) requires every fuel retailer in the UK to report a change in its pump prices within 30 "
               "minutes, and the government publishes them as open data. We fetch them every half hour.")
    else:
        src = ("While this page is in preview, from the retailers that still publish their own price feeds under the "
               "Competition and Markets Authority&rsquo;s 2023 open-data scheme. That does not yet include every "
               "forecourt, and the banner at the top lists who is missing. The government&rsquo;s Fuel Finder feed, "
               "which every UK forecourt must report to by law, replaces it before the page opens.")
    return [
        ("Where do these prices come from?", src),
        ("How up to date are the prices?",
         "We fetch fresh prices every half hour, and the line under the map says exactly when. Each price shows the time "
         "the forecourt set it. A price a forecourt has not confirmed for more than six weeks is left out rather than shown "
         "as current, and if our own copy is more than three hours old the page says so. Prices can change at any time, so "
         "always check the pump before you fill up."),
        ("Does the page know where I am?",
         "Only on your own phone or computer. When you tap Use my location, your browser gives the page your position and the "
         "page works out the distances itself from a list of every station in the area; your location is never sent to us. "
         "A postcode is looked up through our own server, which asks the free postcodes.io service and keeps no record of it."),
        ("Why might the price at the pump be different?",
         "Forecourts change prices during the day, and a change reaches the data a little after it reaches the pump. The "
         "price on the pump is the one you pay."),
        ("What are E10, E5 and B7?",
         "E10 is standard unleaded petrol (up to 10% bioethanol); E5 is super unleaded (up to 5%), which some older cars need. "
         "B7 is standard diesel (up to 7% biodiesel). Premium diesel is each brand&rsquo;s higher-grade diesel."),
        ("Which area does it cover?",
         "Bournemouth, Poole and Christchurch and around them: roughly Weymouth and Dorchester to Chichester, up to Salisbury, "
         "and the Isle of Wight, the same area as our street map."),
    ]


def _content(b365_band):
    prose = '''
          <h2 id="method">How this works</h2>
          <p>Pick a fuel, then tap <strong>Use my location</strong> or type a postcode. The list shows the cheapest stations within the distance you choose, cheapest first, with the nearest first where two prices are the same. Tap a station to see it on the map with all its prices, or <strong>Directions</strong> to open your maps app.</p>
          <p>The two numbers at the top are the cheapest unleaded and diesel within six miles of Bournemouth town centre, worked out from the same data each time the page loads.</p>
          <p>Nothing here is guessed. A station shows only the prices it reported, and if a list could not be fetched, or has stopped updating, it is left out and named rather than shown with old numbers.</p>'''
    return "\n".join([
        hero(bc_sub("Bournemouth365", "/bournemouth/", "Fuel Prices"),
             "// BOURNEMOUTH365",
             'The cheapest fuel <em class="grad grad--cyan">near you</em>',
             "Live petrol and diesel prices around Bournemouth, Poole and Christchurch, cheapest first, from your postcode or your phone&rsquo;s location. Free, no adverts, nothing to sign up to.",
             cta1=("Find the cheapest near me", "#finder"),
             cta2=("More from Bournemouth365", "/bournemouth/"),
             chips=["Live pump prices", "Your location stays on your phone", "No adverts"]),
        _TOOL,
        '    <section class="section">\n      <div class="wrap">\n        <div class="prose">' + prose + '\n        </div>\n      </div>\n    </section>',
        faq_html(_faqs()),
        b365_band,
    ])


def _schema(s):
    return graph([
        crumb_sub(s, "Bournemouth365", "bournemouth", "Fuel Prices"),
        _pl.published(webpage(s, _TITLE, _DESC, about=[_pl.BOURNEMOUTH, _pl.BCP])),
        _pl.ORG,
        faqpage(s, _faqs()),
    ])


def register(b365_band):
    _bp.HEAD_EXTRA[_SLUG] = _HEAD
    add(
        slug=_SLUG,
        title=_TITLE,
        desc=_DESC,
        og_title="The cheapest petrol and diesel near you | Bournemouth365",
        schema=_schema,
        content=_content(b365_band),
        robots=None if PUBLIC else "noindex,follow",
    )
    page = next(p for p in _bp.PAGES if p.get("slug") == _SLUG)
    page["nosearch"] = not PUBLIC
