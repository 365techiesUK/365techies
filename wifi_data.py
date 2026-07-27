# -*- coding: utf-8 -*-
"""365 WiFi cluster - mesh buying guide, setup guide, troubleshooting, business WiFi,
and the UK-buildings/hot-weather page. Rendered by build_extra.build_new_page().

HOUSE RULES baked into this file (do not quietly drop them):
  * every price is an INDICATIVE UK STREET PRICE captured 22 July 2026 and is labelled as such
  * every sq ft / m2 figure is a MANUFACTURER CLAIM and is labelled as such, next to the number
  * nothing appears here that failed the July 2026 fact-check pass
  * no fabricated model numbers, no invented prices, no USD->GBP conversions
"""

PRICE_STAMP = ("Indicative UK street prices captured <strong>22 July 2026</strong> from the manufacturer&rsquo;s UK store or a named UK retailer. "
               "Prices move constantly &mdash; we have seen the same box swing 30&ndash;40% in three months, so treat these as a guide and check before you buy. "
               "We don&rsquo;t sell hardware and we earn nothing if you do.")

COVERAGE_NOTE = ("Coverage figures are the <strong>manufacturer&rsquo;s own claim</strong>, measured in open-plan, line-of-sight conditions. "
                 "A UK solid-brick house typically achieves a fraction of it.")

# ---------------------------------------------------------------------------
# Home mesh systems. Only rows that survived the fact-check are here.
# tier: budget band used by the filter.  six: has a 6GHz radio.  ports: fastest port class.
# ---------------------------------------------------------------------------
MESH = [
 {'brand': 'TP-Link', 'model': 'Deco M4', 'gen': 'Wi-Fi 5', 'class': 'AC1200 dual-band',
  'six': False, 'ports': 'Gigabit', 'portn': 1, 'price': '~&pound;109 (3-pack)', 'lo': 109, 'tier': 'a',
  'cover': 'TP-Link UK: 2,000&nbsp;sq&nbsp;ft (1-pack), 2,800&nbsp;sq&nbsp;ft (2-pack). No 3-pack figure published &mdash; TP-Link describe it only as suiting 3&ndash;5 bedroom houses.',
  'sub': 'HomeShield Basic free; paid tiers priced in USD only',
  'best': 'A tight budget, a flat or small terrace, on a line under 100&nbsp;Mbps.',
  'watch': 'Wi-Fi 5 and no dedicated backhaul radio, so every wireless hop roughly halves throughput. A 2018-era product still on sale because it is cheap.'},

 {'brand': 'TP-Link', 'model': 'Deco X50', 'gen': 'Wi-Fi 6', 'class': 'AX3000 dual-band',
  'six': False, 'ports': 'Gigabit', 'portn': 1, 'price': '~&pound;179 (3-pack), ~&pound;159 (2-pack)', 'lo': 179, 'tier': 'b',
  'cover': 'TP-Link UK: 4,500&nbsp;sq&nbsp;ft (2-pack), 6,500&nbsp;sq&nbsp;ft (3-pack).',
  'sub': 'HomeShield Basic free; paid tiers priced in USD only',
  'best': 'The default sensible buy for a UK three-bed semi on 100&ndash;500&nbsp;Mbps full fibre.',
  'watch': 'Gigabit-only ports cap it below a 1&nbsp;Gbps line, and the wireless backhaul shares 5&nbsp;GHz with your devices. Run Ethernet between nodes if you possibly can.'},

 {'brand': 'TP-Link', 'model': 'Deco BE25', 'gen': 'Wi-Fi 7', 'class': 'BE3600 dual-band',
  'six': False, 'ports': '2.5&nbsp;Gbps', 'portn': 2, 'price': '~&pound;199.99 (3-pack)', 'lo': 200, 'tier': 'b',
  'cover': 'TP-Link UK publishes no square-footage figure for this model. We are not going to invent one.',
  'sub': 'HomeShield Basic free; paid tiers priced in USD only',
  'best': 'Best-value way into Wi-Fi 7 for a UK home on 500&nbsp;Mbps&ndash;1&nbsp;Gbps. The 2.5&nbsp;Gbps ports are the real upgrade.',
  'watch': '&ldquo;Wi-Fi 7&rdquo; here means MLO and 4K-QAM across 2.4 and 5&nbsp;GHz only. There is <strong>no 6&nbsp;GHz radio</strong> &mdash; none of the headroom people associate with Wi-Fi 7.'},

 {'brand': 'TP-Link', 'model': 'Deco BE65', 'gen': 'Wi-Fi 7', 'class': 'BE9300 tri-band',
  'six': True, 'ports': '4 &times; 2.5&nbsp;Gbps', 'portn': 2, 'price': '~&pound;469 (3-pack)', 'lo': 469, 'tier': 'c',
  'cover': 'TP-Link UK publishes no square-footage figure for this model.',
  'sub': 'HomeShield Basic free; paid tiers priced in USD only',
  'best': 'The enthusiast sweet spot &mdash; a four-bed house on 1&nbsp;Gbps or better, with four 2.5G ports on every node.',
  'watch': 'Sold as the BE63 in the US, so American reviews and prices mislead. The price swung roughly &pound;470&ndash;&pound;675 within three months.'},

 {'brand': 'TP-Link', 'model': 'Deco BE85', 'gen': 'Wi-Fi 7', 'class': 'BE19000 tri-band',
  'six': True, 'ports': '10G + SFP+', 'portn': 3, 'price': '~&pound;746 (2-pack)', 'lo': 746, 'tier': 'd',
  'cover': 'No general figure published; TP-Link cite heatmap testing in a 4,600&nbsp;sq&nbsp;ft two-storey villa.',
  'sub': 'HomeShield Basic free; paid tiers priced in USD only',
  'best': 'Multi-gig fibre, a 10G NAS or a home lab. The SFP+ port is the differentiator.',
  'watch': 'Overkill for almost every UK home. Nothing in a normal house saturates 10G, and 6&nbsp;GHz barely survives a Victorian brick wall. You are buying ports, not coverage.'},

 {'brand': 'Netgear', 'model': 'Orbi 370 (RBE372/373)', 'gen': 'Wi-Fi 7', 'class': 'Dual-band, up to 3.6&nbsp;Gbps',
  'six': False, 'ports': '2.5&nbsp;Gbps', 'portn': 2, 'price': '~&pound;169.99 (2-pack), ~&pound;249.99 (3-pack)', 'lo': 170, 'tier': 'b',
  'cover': 'Netgear <strong>UK</strong>: 3,000&nbsp;sq&nbsp;ft (2-pack), 4,500&nbsp;sq&nbsp;ft (3-pack). Netgear&rsquo;s <strong>US</strong> page claims 6,000&nbsp;sq&nbsp;ft for the identical 3-pack.',
  'sub': 'NETGEAR Armor trial, then paid. No GBP price published.',
  'best': 'A two or three-bed home wanting the Orbi app and Netgear support at a sane price.',
  'watch': 'Only two ports on the router, and the WAN eats one. Netgear&rsquo;s history of moving features behind Armor is the real risk.'},

 {'brand': 'Netgear', 'model': 'Orbi 770 (RBE772/773)', 'gen': 'Wi-Fi 7', 'class': 'Tri-band, up to 11&nbsp;Gbps',
  'six': True, 'ports': '2.5&nbsp;Gbps', 'portn': 2, 'price': '~&pound;449.99 (2-pack), ~&pound;699.99 (3-pack)', 'lo': 450, 'tier': 'c',
  'cover': 'Netgear UK: 4,500&nbsp;sq&nbsp;ft (2-pack), 6,750&nbsp;sq&nbsp;ft (3-pack), up to 100 devices.',
  'sub': 'NETGEAR Armor trial, then paid',
  'best': 'A big detached or three-storey house where you genuinely cannot run Ethernet and need a dedicated backhaul radio.',
  'watch': 'Netgear discounts heavily, so the &ldquo;was&rdquo; price is theatre. If you can run Cat6 to each node, a cheaper tri-band does the same job.'},

 {'brand': 'Netgear', 'model': 'Orbi 970 (RBE972S/973S)', 'gen': 'Wi-Fi 7', 'class': 'Quad-band, up to 27&nbsp;Gbps',
  'six': True, 'ports': '10G', 'portn': 3, 'price': '~&pound;1,299.99 (2-pack), ~&pound;1,799.99 (3-pack)', 'lo': 1300, 'tier': 'd',
  'cover': 'Netgear UK: 5,400&nbsp;sq&nbsp;ft (2-pack), 8,200&nbsp;sq&nbsp;ft (3-pack).',
  'sub': 'NETGEAR Armor trial, then paid',
  'best': 'Very large period properties where cabling genuinely is impossible.',
  'watch': 'For this money a professional could cable the house and fit three ceiling access points, which would outperform it. We would have that conversation first.'},

 {'brand': 'Amazon eero', 'model': 'eero 7', 'gen': 'Wi-Fi 7', 'class': 'Up to 1.8&nbsp;Gbps wireless',
  'six': False, 'ports': '2.5&nbsp;GbE', 'portn': 2, 'price': '~&pound;169.99 (1-pack), ~&pound;349.99 (3-pack)', 'lo': 170, 'tier': 'b',
  'cover': 'eero: 2,000&nbsp;sq&nbsp;ft per unit; 120+ devices.',
  'sub': 'eero Plus optional; no GBP price published on eero&rsquo;s UK site',
  'best': 'Non-technical households. The simplest app in the category, by a distance.',
  'watch': 'Two ports means the WAN eats one on the gateway node. Amazon-owned, and the genuinely useful security and parental features sit behind eero Plus.'},

 {'brand': 'Amazon eero', 'model': 'eero Pro 7', 'gen': 'Wi-Fi 7', 'class': 'Tri-band, up to 3.9&nbsp;Gbps',
  'six': True, 'ports': '5&nbsp;GbE', 'portn': 3, 'price': '~&pound;549.99 (2-pack), ~&pound;699.99 (3-pack)', 'lo': 550, 'tier': 'd',
  'cover': 'eero: 2,000&nbsp;sq&nbsp;ft per unit, 200+ devices per unit.',
  'sub': 'eero Plus optional',
  'best': 'A larger home on 1&nbsp;Gbps+ that wants zero faff and 5&nbsp;GbE for a wired backbone.',
  'watch': 'Only two Ethernet ports per node at this price. The Deco BE65 gives you four 2.5G ports for less money.'},

 {'brand': 'Amazon eero', 'model': 'eero Max 7', 'gen': 'Wi-Fi 7', 'class': 'Tri-band, up to 4.3&nbsp;Gbps',
  'six': True, 'ports': '2 &times; 10G', 'portn': 3, 'price': '~&pound;1,149.99 (2-pack), ~&pound;1,699.99 (3-pack)', 'lo': 1150, 'tier': 'd',
  'cover': 'eero: up to 2,500&nbsp;sq&nbsp;ft (a 28&nbsp;ft radius) per unit, 250+ devices per unit.',
  'sub': 'eero Plus optional',
  'best': 'Multi-gig fibre plus a built-in Thread, Matter and Zigbee hub in one box.',
  'watch': 'Per-unit coverage is not dramatically better than the eero Pro 7. Buy it for the 10G ports and the smart-home hub, not for range.'},

 {'brand': 'ASUS', 'model': 'ZenWiFi BT8', 'gen': 'Wi-Fi 7', 'class': 'BE14000 tri-band',
  'six': True, 'ports': '2.5&nbsp;Gbps', 'portn': 2, 'price': 'from ~&pound;238.99', 'lo': 239, 'tier': 'c',
  'cover': 'ASUS UK: 3,000&nbsp;sq&nbsp;ft (1-pack), 5,900&nbsp;sq&nbsp;ft (2-pack).',
  'sub': '<strong>None.</strong> AiProtection Pro and parental controls are included with no ongoing fee',
  'best': 'Technically-minded buyers who want VLANs, a VPN client and server, AiMesh &mdash; and no security subscription, ever.',
  'watch': 'Only two ports per node. The app and web interface are far more complex than eero or Deco. UK stock and pricing are less consistent than TP-Link.'},

 {'brand': 'ASUS', 'model': 'ZenWiFi BQ16', 'gen': 'Wi-Fi 7', 'class': 'Quad-band, 25,000&nbsp;Mbps aggregate',
  'six': True, 'ports': '2 &times; 10&nbsp;Gbps', 'portn': 3, 'price': 'from ~&pound;454.99', 'lo': 455, 'tier': 'c',
  'cover': 'ASUS UK: 4,000&nbsp;sq&nbsp;ft (1-pack), 8,000&nbsp;sq&nbsp;ft (2-pack).',
  'sub': '<strong>None</strong>',
  'best': 'ASUS&rsquo;s no-subscription flagship &mdash; a genuine alternative to the Orbi 970 at roughly a third of the price.',
  'watch': 'One 6&nbsp;GHz radio plus <em>two</em> 5&nbsp;GHz radios and 2.4&nbsp;GHz &mdash; not two 6&nbsp;GHz radios, whatever you read elsewhere. ASUS flagship firmware usually needs a few updates to settle down.'},

 {'brand': 'Google', 'model': 'Nest Wifi Pro', 'gen': 'Wi-Fi 6E', 'class': '4200&nbsp;Mbps tri-band',
  'six': True, 'ports': 'Not verified', 'portn': 1, 'price': '~&pound;369.97 (3-pack, Amazon)', 'lo': 370, 'tier': 'c',
  'cover': 'Not verified for the UK listing &mdash; Google&rsquo;s UK store sits behind a consent wall we did not accept.',
  'sub': 'None required for core features',
  'best': 'Households already deep in Google Home and Nest. Each unit is a Matter and Thread border router.',
  'watch': 'A 2022 product. Google dropped compatibility with older Google Wifi units, and its commitment to the hardware line is uncertain. The cheapest prices around are marketplace listings.'},

 {'brand': 'devolo', 'model': 'Magic 2 WiFi 6 Next', 'gen': 'Wi-Fi 6 + powerline', 'class': 'Up to 3,000&nbsp;Mbps Wi-Fi, 2,400&nbsp;Mbps powerline backhaul',
  'six': False, 'ports': '2 &times; Gigabit', 'portn': 1, 'price': 'Starter Kit &pound;239.99, Multiroom Kit &pound;409.99, add-on adapter &pound;179.99 &mdash; devolo UK direct', 'lo': 240, 'tier': 'c',
  'cover': 'devolo market this by Mbps rather than square footage, so there is no coverage claim to quote.',
  'sub': 'None',
  'best': 'The genuine problem-solver for thick Victorian solid brick, stone cottages, converted garages and outbuildings on the same consumer unit.',
  'watch': 'Performance depends entirely on your house wiring. Old ring mains, RCD boundaries, a separate consumer unit or an extension lead can gut it. <strong>Never plug it into an extension lead.</strong>'},

 {'brand': 'Tenda', 'model': 'Nova MX12', 'gen': 'Wi-Fi 6', 'class': 'AX3000 dual-band',
  'six': False, 'ports': 'Gigabit', 'portn': 1, 'price': '3-pack from ~&pound;100.20', 'lo': 100, 'tier': 'a',
  'cover': 'Tenda claim up to 7,000&nbsp;sq&nbsp;ft (3-pack) &mdash; one of the least believable numbers in the category.',
  'sub': 'None',
  'best': 'Value-hunters wanting AX3000 mesh across a three or four-bed house.',
  'watch': 'No dedicated backhaul, and the firmware and app polish are well behind TP-Link.'},
]

_TIER_LABEL = {'a': 'Under &pound;150', 'b': '&pound;150&ndash;&pound;250', 'c': '&pound;250&ndash;&pound;700', 'd': '&pound;700+'}


def _mesh_cards():
    out = []
    for m in MESH:
        six = ('<span class="mchip mchip--yes">6&nbsp;GHz</span>' if m['six']
               else '<span class="mchip mchip--no">No 6&nbsp;GHz</span>')
        out.append(
          '<article class="mcard" data-tier="{tier}" data-six="{six6}" data-port="{portn}" data-lo="{lo}">'
          '<header class="mcard__top">'
          '<p class="mcard__brand">{brand}</p>'
          '<h3 class="mcard__model">{model}</h3>'
          '<p class="mcard__chips"><span class="mchip">{gen}</span>{six}<span class="mchip">{ports} ports</span></p>'
          '</header>'
          '<p class="mcard__price">{price}</p>'
          '<dl class="mcard__dl">'
          '<dt>Radios</dt><dd>{cls}</dd>'
          '<dt>Coverage <span class="mcard__claim">manufacturer claim</span></dt><dd>{cover}</dd>'
          '<dt>Subscription</dt><dd>{sub}</dd>'
          '<dt>Best for</dt><dd>{best}</dd>'
          '<dt class="mcard__wd">Watch out</dt><dd class="mcard__wv">{watch}</dd>'
          '</dl></article>'.format(tier=m['tier'], six6=('1' if m['six'] else '0'), portn=m['portn'], lo=m['lo'],
                                   brand=m['brand'], model=m['model'], gen=m['gen'], six=six, ports=m['ports'],
                                   price=m['price'], cls=m['class'], cover=m['cover'], sub=m['sub'],
                                   best=m['best'], watch=m['watch']))
    return "\n".join(out)


MESH_COMPARE = '''<style>
.mfilter{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin:0 0 1.6rem}
.mfilter button{font:600 .78rem/1 var(--font-mono,inherit);letter-spacing:.05em;text-transform:uppercase;color:var(--muted);background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:999px;padding:.6rem 1rem;cursor:pointer;transition:color .18s,border-color .18s,background .18s}
.mfilter button:hover{color:#fff;border-color:var(--cyan)}
.mfilter button[aria-pressed="true"]{color:#06121f;background:var(--cyan);border-color:var(--cyan)}
.mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem}
.mcard{border:1px solid var(--line);border-radius:16px;padding:1.15rem 1.25rem;background:rgba(255,255,255,.02);display:flex;flex-direction:column}
.mcard[hidden]{display:none}
.mcard__brand{font:600 .7rem/1 var(--font-mono,inherit);letter-spacing:.12em;text-transform:uppercase;color:var(--cyan);margin:0 0 .2rem}
.mcard__model{font-size:1.12rem;margin:0 0 .55rem;color:#fff}
.mcard__chips{display:flex;flex-wrap:wrap;gap:.35rem;margin:0 0 .8rem}
.mchip{font:600 .66rem/1 var(--font-mono,inherit);letter-spacing:.06em;text-transform:uppercase;padding:.35rem .55rem;border-radius:6px;background:rgba(255,255,255,.05);color:var(--muted);border:1px solid var(--line)}
.mchip--yes{color:var(--green);border-color:rgba(0,206,27,.35)}
.mchip--no{color:var(--faint)}
.mcard__price{font-family:var(--font-display,inherit);font-weight:600;color:#fff;font-size:1.02rem;margin:0 0 .9rem;padding-bottom:.9rem;border-bottom:1px solid var(--line)}
.mcard__dl{margin:0;font-size:.9rem}
.mcard__dl dt{font:600 .66rem/1 var(--font-mono,inherit);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin:.7rem 0 .25rem}
.mcard__dl dd{margin:0;color:#dfe9f7}
.mcard__claim{color:#e8c35a;text-transform:none;letter-spacing:0;font-weight:400}
.mcard__wd{color:var(--warn) !important}
.mcard__wv{color:#c9d6e8}
.mcount{text-align:center;color:var(--faint);font-size:.8rem;margin:1.2rem 0 0}
@media(max-width:600px){.mgrid{grid-template-columns:1fr}}
</style>
<div class="mfilter" role="group" aria-label="Filter mesh systems">
  <button type="button" data-mf="all" aria-pressed="true">Show all</button>
  <button type="button" data-mf="a" aria-pressed="false">Under &pound;150</button>
  <button type="button" data-mf="b" aria-pressed="false">&pound;150&ndash;&pound;250</button>
  <button type="button" data-mf="c" aria-pressed="false">&pound;250&ndash;&pound;700</button>
  <button type="button" data-mf="six" aria-pressed="false">Has 6&nbsp;GHz</button>
  <button type="button" data-mf="fast" aria-pressed="false">2.5G ports or better</button>
</div>
<div class="mgrid" id="mgrid">
''' + _mesh_cards() + '''
</div>
<p class="mcount" id="mcount" role="status" aria-live="polite"></p>
<script>
(function(){
  var grid=document.getElementById('mgrid'); if(!grid) return;
  var cards=[].slice.call(grid.querySelectorAll('.mcard'));
  var btns=[].slice.call(document.querySelectorAll('.mfilter button'));
  var count=document.getElementById('mcount');
  function apply(f){
    var n=0;
    cards.forEach(function(c){
      var ok = f==='all'
        || (f==='six'  && c.dataset.six==='1')
        || (f==='fast' && +c.dataset.port>=2)
        || c.dataset.tier===f;
      c.hidden=!ok; if(ok) n++;
    });
    count.textContent = n + (n===1?' system shown':' systems shown') + (f==='all'?'':' \\u00b7 tap Show all to reset');
  }
  btns.forEach(function(b){
    b.addEventListener('click',function(){
      btns.forEach(function(x){x.setAttribute('aria-pressed', x===b?'true':'false');});
      apply(b.dataset.mf);
    });
  });
  apply('all');
})();
</script>'''

# ---------------------------------------------------------------------------
# Node planner - deliberately conservative, and labelled as a rule of thumb.
# ---------------------------------------------------------------------------
NODE_PLANNER = '''<style>
.np{border:1px solid var(--line);border-radius:18px;padding:1.4rem 1.5rem;background:rgba(255,255,255,.02);max-width:760px;margin:0 auto}
.np__row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
.np label{display:block;font:600 .68rem/1 var(--font-mono,inherit);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-bottom:.4rem}
.np select{width:100%;padding:.7rem .8rem;border-radius:10px;border:1px solid var(--line);background:#0d1526;color:#fff;font-size:.95rem}
.np__checks{display:flex;flex-wrap:wrap;gap:1rem;margin:.2rem 0 1.2rem}
.np__checks label{display:flex;align-items:center;gap:.5rem;text-transform:none;letter-spacing:0;font-family:inherit;font-size:.9rem;font-weight:400;color:#dfe9f7;margin:0}
.np__out{border-top:1px solid var(--line);padding-top:1.2rem}
.np__big{font-family:var(--font-display,inherit);font-size:1.6rem;color:#fff;margin:0 0 .5rem}
.np__big span{color:var(--green)}
.np__note{color:#c9d6e8;font-size:.94rem;margin:.5rem 0 0}
.np__foot{color:var(--faint);font-size:.78rem;margin:1rem 0 0}
@media(max-width:600px){.np__row{grid-template-columns:1fr}}
</style>
<div class="np">
  <div class="np__row">
    <div>
      <label for="npType">What sort of property?</label>
      <select id="npType">
        <option value="modern">Post-2000 timber frame / plasterboard</option>
        <option value="cavity" selected>1930s&ndash;1990s cavity brick</option>
        <option value="solid">Victorian / Edwardian solid brick</option>
        <option value="stone">Stone, flint or cob cottage (450&nbsp;mm+)</option>
        <option value="flat">Flat or apartment</option>
        <option value="bungalow">Bungalow</option>
      </select>
    </div>
    <div>
      <label for="npFloors">Floors you need covered</label>
      <select id="npFloors">
        <option value="1">One</option>
        <option value="2" selected>Two</option>
        <option value="3">Three or more</option>
      </select>
    </div>
  </div>
  <div class="np__checks">
    <label><input type="checkbox" id="npFoil"> Foil-backed insulation, underfloor heating or a loft conversion</label>
    <label><input type="checkbox" id="npOut"> Garden office, garage or outbuilding</label>
    <label><input type="checkbox" id="npCable"> I could run one Ethernet cable if I had to</label>
  </div>
  <div class="np__out" role="status" aria-live="polite">
    <p class="np__big" id="npAnswer">&mdash;</p>
    <p class="np__note" id="npNote"></p>
  </div>
  <p class="np__foot">This is a <strong>rule of thumb</strong> built from measured attenuation data and field experience &mdash; not a survey. The only reliable method is measuring signal in the rooms that matter against a &minus;67&nbsp;dBm target. It costs nothing to ask us instead.</p>
</div>
<script>
(function(){
  var t=document.getElementById('npType'), f=document.getElementById('npFloors'),
      foil=document.getElementById('npFoil'), out=document.getElementById('npOut'),
      cab=document.getElementById('npCable'),
      ans=document.getElementById('npAnswer'), note=document.getElementById('npNote');
  if(!t) return;
  function calc(){
    var base={modern:1,cavity:1,solid:2,stone:3,flat:1,bungalow:1}[t.value];
    var floors=+f.value, n=base;
    if(t.value==='stone') n = base*Math.max(1,floors-0);
    else n = base + (floors-1);
    if(t.value==='bungalow') n = floors>1?2:1;
    if(t.value==='flat') n = floors>1?2:1;
    if(foil.checked) n += 1;
    var wired = (t.value==='solid'||t.value==='stone'||foil.checked||floors>=3);
    var total = n + (out.checked?1:0);
    var word = total===1 ? 'one unit' : (total + ' units');
    ans.innerHTML='Plan on <span>'+word+'</span> in total';
    var bits=[];
    if(t.value==='stone') bits.push('Stone and cob walls of 450&nbsp;mm or more are the hardest case in British housing, and there is no clean measured dataset for random rubble stone. Assume roughly one access point per room cluster.');
    if(t.value==='solid') bits.push('A 215&nbsp;mm Victorian solid wall costs you a great deal of signal, and a party wall or chimney breast should be treated as opaque at 5&nbsp;GHz. Think one unit per floor, on the landing or hallway.');
    if(foil.checked) bits.push('Foil-backed board, foil-faced insulation and underfloor heating foil act as a continuous metal layer. Assume vertical coverage between floors simply does not work, and plan per floor regardless of floor area.');
    if(out.checked) bits.push('The outbuilding is a separate job, not an extra mesh node. The path crosses masonry <em>and</em> modern low-E glass, which together can cost more signal than the whole rest of the house. Cable it, or use a proper outdoor link.');
    if(wired && cab.checked) bits.push('<strong>Since you can run a cable, do that first.</strong> One Ethernet run to a well-placed unit beats adding a third wireless node, every time &mdash; and it will cost you less.');
    else if(wired) bits.push('<strong>This property really wants wired backhaul.</strong> If a cable is genuinely impossible, a powerline-hybrid system is the honest fallback &mdash; but test it before you commit to it.');
    else bits.push('Wireless backhaul should be fine here. Put the second unit roughly halfway to the problem room, not in it.');
    note.innerHTML=bits.join(' ');
  }
  [t,f,foil,out,cab].forEach(function(el){el.addEventListener('change',calc);});
  calc();
})();
</script>'''

WIFI_PAGES = [

# ===========================================================================
# 1. MESH BUYING GUIDE (pillar)
# ===========================================================================
{'slug': 'mesh-wifi-systems-uk',
 'title': 'Mesh WiFi UK: Honest Buying Guide & Model Comparison | 365 Techies',
 'metaDesc': 'Which mesh WiFi system actually suits a UK home? Compare real models with July 2026 UK prices, honest coverage figures, ISP mesh vs buying your own '
             '&mdash; and when mesh is the wrong answer entirely. From a Dorset IT firm since 1995.',
 'ogTitle': 'Mesh WiFi in UK Homes &mdash; An Honest Buying Guide | 365 Techies',
 'crumbName': 'Mesh WiFi Buying Guide',
 'eyebrow': '// MESH WIFI &middot; UK BUYING GUIDE',
 'h1': 'Mesh WiFi for <em class="grad grad--cyan">UK homes</em>, honestly compared',
 'lede': 'Most mesh guides are rewritten spec sheets with an affiliate link. This one is written for British houses &mdash; solid brick, foil-backed insulation, '
         'party walls and all &mdash; by a family-run Dorset IT firm that has been fixing real WiFi since 1995. We don&rsquo;t sell hardware, so we have nothing to '
         'gain from telling you to buy some. Sometimes the honest answer is one cable and a better-placed router.',
 'chips': ['Prices checked July 2026', 'No affiliate links', 'We don&rsquo;t sell hardware'],
 'primaryCta': ['Ask us what your house needs', '/contact/'],
 'secondaryCta': ['Test your WiFi first', '/wifi-signal-test/'],
 'ctaHead': 'Not sure which of these your house actually needs?',
 'ctaSub': 'Tell us the property, the broadband package and where it goes wrong, and we&rsquo;ll tell you straight &mdash; including when the answer is &ldquo;don&rsquo;t buy '
           'anything, move your router&rdquo;. Homes and businesses across Bournemouth, Poole, Christchurch and Dorset.',
 'serviceName': 'Mesh WiFi advice, supply and installation',
 'schemaKind': 'service',
 'sections': [

  {'eyebrow': '/01 &mdash; BEFORE YOU SPEND ANYTHING',
   'h2': 'Three checks that save most people the money',
   'html': '<p>Before you compare a single product, do these. They take ten minutes and they routinely save people two or three hundred pounds.</p>'
           '<ol><li><strong>Plug a laptop into the router with a cable and run a speed test.</strong> That number is your ceiling. If it is slow on the cable, '
           'nothing wireless will fix it &mdash; you have a broadband problem, not a WiFi problem, and no mesh system in existence adds speed your line isn&rsquo;t '
           'delivering.</li>'
           '<li><strong>Move the router and re-test.</strong> A router on the floor of the front hall, inside a cupboard, at one end of the house is the single most '
           'common cause of bad WiFi in Britain. Central, high, out in the open. This is free.</li>'
           '<li><strong>Test a modern phone in the bad room.</strong> If a new phone is fine and only the eight-year-old laptop struggles, the network isn&rsquo;t the '
           'problem &mdash; the device is. TP-Link&rsquo;s own small print says performance varies by &ldquo;client limitations, including rated performance, location, '
           'connection quality, and client condition&rdquo;.</li></ol>'
           '<p>Our free <a href="/wifi-signal-test/">365 WiFi Optimizer</a> will measure the connection live in each room while you walk around, so you can see '
           'where it actually falls apart rather than guessing.</p>'},

  {'eyebrow': '/02 &mdash; THE COVERAGE NUMBERS ON THE BOX',
   'h2': 'Why &ldquo;up to 6,500 sq ft&rdquo; means very little here',
   'html': '<p>Coverage claims are marketing, not measurement. There is <strong>no UK or EU standard test method</strong> behind them. They are generated in open-plan, '
           'line-of-sight conditions &mdash; which is to say, not in a British house.</p>'
           '<p>You don&rsquo;t have to take our word for it. Here is the same manufacturer, the same product code, two different websites:</p>'
           '<ul><li>Netgear&rsquo;s <strong>UK</strong> page claims <strong>4,500&nbsp;sq&nbsp;ft</strong> for the Orbi RBE373 three-pack.</li>'
           '<li>Netgear&rsquo;s <strong>US</strong> page claims <strong>6,000&nbsp;sq&nbsp;ft</strong> for the identical three-pack.</li></ul>'
           '<p>Same box. Same manufacturer. Thirty-three per cent apart. That is the level of precision you are dealing with.</p>'
           '<p>The physics is simple and unforgiving. Every 3&nbsp;dB of loss halves the signal power; every 6&nbsp;dB is like doubling the distance to the router. A '
           'solid Victorian brick wall can cost you tens of decibels &mdash; so one wall can be the equivalent of moving thirty times further away. And it gets worse '
           'the higher the frequency, which means the shiny 6&nbsp;GHz band on a Wi-Fi 7 system is the <em>worst</em> of the three at getting through British masonry.</p>'
           '<p><strong>Our working rule: halve the manufacturer&rsquo;s figure, or take a third of it, for a UK solid-wall house.</strong> That is our rule of thumb '
           'from doing this for years, not a measurement &mdash; and we&rsquo;d rather label it honestly than dress it up. There is much more detail on '
           '<a href="/wifi-uk-buildings-heat/">why UK houses kill WiFi</a>.</p>'},

  {'eyebrow': '/03 &mdash; THE FIVE RULES',
   'h2': 'Five buying rules that matter more than the brand',
   'html': '<ol><li><strong>Ethernet backhaul beats everything.</strong> A wired three-pack at around &pound;179 will outperform a &pound;700 system running over '
           'wireless backhaul in most UK houses. If you can get one cable between two points, do that before you spend a penny more on radios.</li>'
           '<li><strong>Node count beats node power.</strong> Three modest units beat two expensive ones through solid walls. Radio power is capped by law; the number '
           'and placement of radios is not.</li>'
           '<li><strong>Match the ports to your line.</strong> On 100&ndash;500&nbsp;Mbps, gigabit ports are fine. On 1&nbsp;Gbps or better, insist on 2.5&nbsp;Gbps '
           'ports or you have capped yourself below what you&rsquo;re paying for.</li>'
           '<li><strong>&ldquo;Wi-Fi 7&rdquo; does not always mean 6&nbsp;GHz.</strong> The Deco BE25, Orbi 370 and eero 7 are all dual-band &mdash; genuinely Wi-Fi 7, '
           'genuinely no 6&nbsp;GHz radio. You still get MLO, 4K-QAM and usually faster ports, which are real. You do not get the headroom people imagine they are '
           'buying. Check before you pay a premium for the badge.</li>'
           '<li><strong>Powerline hybrids are right in exactly one situation.</strong> Thick Victorian walls, stone cottages and outbuildings on the same consumer '
           'unit. Everywhere else they are the wrong answer.</li></ol>'},

  {'eyebrow': '/04 &mdash; COMPARE THE MODELS',
   'h2': 'Every system we can stand behind, compared',
   'html': '<p>Filter by budget, or by what actually matters &mdash; whether it has a 6&nbsp;GHz radio, and whether the ports can keep up with a fast line. '
           'Every model here survived a fact-check against the manufacturer&rsquo;s own UK pages in July 2026. Anything we could not verify was cut rather than '
           'guessed at, and we say so underneath.</p>'
           + MESH_COMPARE +
           '<p class="cmp-foot">' + PRICE_STAMP + '<br>' + COVERAGE_NOTE + '</p>'
           '<p><strong>What we cut, and why.</strong> We are not recommending the <strong>Deco XE75</strong>: TP-Link&rsquo;s own UK page flags it as being phased out '
           'and points buyers at the Deco X50 instead. We dropped a widely-repeated Tenda Nova MX3 price because we could not find it on any UK source and it '
           'wasn&rsquo;t credible. We left the <strong>Linksys Velop Pro 7</strong> out of the grid because the same three-pack was &pound;399.99 from a marketplace '
           'seller and &pound;639.95 sold by Amazon directly &mdash; that spread on identical stock tells you something. And we have not quoted a price for anything '
           'we could only find on eBay.</p>'},

  {'eyebrow': '/05 &mdash; HOW MANY UNITS?',
   'h2': 'How many nodes does your house actually need?',
   'html': '<p>The honest answer depends far more on <em>what your walls are made of</em> than on floor area &mdash; which is exactly what the box never asks you. '
           'This works from the same measured attenuation data as the rest of the page.</p>' + NODE_PLANNER},

  {'eyebrow': '/06 &mdash; IS WI-FI 7 WORTH IT?',
   'h2': 'Wi-Fi 7 in 2026: worth paying for, or not?',
   'html': '<p>Short version: <strong>buy Wi-Fi 7 for the 2.5&nbsp;Gbps ports, not for the WiFi.</strong> If it costs about &pound;20 more than the Wi-Fi 6 equivalent '
           'and brings faster ports, take it. If it costs &pound;400 more, don&rsquo;t.</p>'
           '<p>The headline Wi-Fi 7 feature is the 320&nbsp;MHz channel, and it exists <strong>only in the 6&nbsp;GHz band</strong>. In the UK the licence-exempt '
           'lower 6&nbsp;GHz band runs 5925&ndash;6425&nbsp;MHz &mdash; 500&nbsp;MHz in total &mdash; so in practice there is room for roughly one clean 320&nbsp;MHz '
           'channel. Both ends have to be Wi-Fi 7 for any of it to happen.</p>'
           '<p><strong>The regulatory position, stated accurately:</strong> higher-power outdoor 6&nbsp;GHz WiFi under automated frequency coordination has been '
           '<em>decided</em> by Ofcom, but it is <strong>not yet in force</strong>. Applications open on 1 September 2026 and the enabling regulations are expected in '
           'autumn 2026. Ofcom&rsquo;s July 2026 statement also splits the upper band, prioritising 6425&ndash;6585&nbsp;MHz for WiFi. If anyone tells you they can '
           'give you standard-power outdoor 6&nbsp;GHz WiFi today, they are ahead of the law.</p>'
           '<p>And the practical catch: 6&nbsp;GHz is the worst of the three bands at getting through masonry. On 203&nbsp;mm concrete the measured loss is about '
           '55&nbsp;dB at 5&nbsp;GHz and 63&nbsp;dB at 6&nbsp;GHz. <strong>In British housing, Wi-Fi 6E and Wi-Fi 7 are same-room technologies.</strong> Selling a '
           'Wi-Fi 7 mesh as the fix for a stone cottage is selling the wrong solution.</p>'
           '<p>Client devices are arriving &mdash; the iPhone 17 lists Wi-Fi 7 &mdash; but the tablets, televisions, printers and cameras in a real house are years '
           'behind, and they are what clog a network.</p>'},

  {'eyebrow': '/07 &mdash; ISP MESH VS BUYING YOUR OWN',
   'h2': 'Should you just take the pods your provider offers?',
   'html': '<p>Often, yes &mdash; and this is the section the affiliate sites don&rsquo;t write, because there is no commission in it.</p>'
           '<p><strong>The maths.</strong> A &pound;6-a-month add-on is &pound;72 a year. A capable three-pack was around &pound;179 outright in July 2026. So the '
           'break-even is roughly two and a half years &mdash; but that is not the whole story.</p>'
           '<p><strong>What the ISP gives you that retail cannot:</strong> a contractual speed-per-room guarantee, money back if they can&rsquo;t deliver it, and '
           '&mdash; the valuable part &mdash; the provider owning the problem instead of you.</p>'
           '<ul><li><strong>Sky WiFi Max</strong> &mdash; from &pound;6/month, free when bundled with Gigafast+. Up to three Max Pods. Guarantee: a minimum '
           '10&nbsp;Mb/s per room on Superfast 35, Superfast, Full Fibre 75 and Full Fibre 100; 25&nbsp;Mb/s per room on Ultrafast, Full Fibre 150/300/500 and '
           'Gigafast. <strong>The hub and pods are loaned, not sold</strong> &mdash; they go back when you leave.</li>'
           '<li><strong>BT Complete WiFi Plus</strong> &mdash; one disc to start, up to two more if blackspots remain, and a &pound;100 one-off bill credit if they '
           'cannot fix it. BT publish no monthly price on their own page.</li>'
           '<li><strong>EE WiFi Enhancer</strong> &mdash; one Smart WiFi device to start, up to two more, same &pound;100 credit. Included in some plans or added as a '
           'monthly extra; EE publish no standalone price.</li>'
           '<li><strong>Virgin Media, TalkTalk, Vodafone and Plusnet</strong> all offer something similar. We are not quoting figures we could not verify on their own '
           'pages &mdash; ask them what is included and what it costs.</li></ul>'
           '<p><strong>The trap worth repeating:</strong> ISP discs and pods only work with that provider&rsquo;s own hub. Second-hand ISP discs on eBay are '
           'frequently useless to the buyer. If you switch provider, they stop being your problem and start being landfill.</p>'},

  {'eyebrow': '/08 &mdash; BUDGETS',
   'h2': 'What each budget actually buys you',
   'html': '<ul><li><strong>Under &pound;100 &mdash; often one better router, and that is often the right answer.</strong> A capable Wi-Fi 6 router was around '
           '&pound;68&ndash;&pound;75 in July 2026. With the average usable English home at about 96&nbsp;m&sup2;, one modern router placed centrally and high covers '
           'most of it. This fixes &ldquo;my ISP box is six years old and it lives behind the telly&rdquo;. It does not fix a three-storey Victorian terrace.</li>'
           '<li><strong>Under &pound;100 &mdash; or spend nothing at all.</strong> If your provider offers a per-room guarantee, your first call is to them, not to a '
           'shop.</li>'
           '<li><strong>&pound;100&ndash;&pound;200 &mdash; entry mesh, Wi-Fi 6, gigabit class.</strong> Real radios in the far corners, one network name, automatic '
           'roaming. It buys you coverage. It does not buy you more internet than your line delivers.</li>'
           '<li><strong>&pound;200&ndash;&pound;400 &mdash; Wi-Fi 7, or a serious two-pack.</strong> The sweet spot for 900&nbsp;Mbps+ full fibre &mdash; and again, '
           'the 2.5&nbsp;GbE ports are usually the real reason to buy, not the Wi-Fi 7 badge.</li>'
           '<li><strong>&pound;400&ndash;&pound;800 &mdash; tri-band flagship.</strong> You are buying a dedicated backhaul radio and fast ports. Honestly: for most '
           'UK homes on 150&ndash;500&nbsp;Mbps, this tier buys bragging rights rather than a different experience.</li>'
           '<li><strong>Above &pound;800 is almost always the wrong shape of spend.</strong> Eight hundred pounds of mesh in an uncabled house will underperform about '
           '&pound;250 of decent access point plus a professional Ethernet run. If you are at this budget, spend some of it on cable.</li></ul>'},

  {'eyebrow': '/09 &mdash; WHEN NOT TO BUY MESH',
   'h2': 'Six times mesh is the wrong answer',
   'html': '<p>We are not going to bury this at the bottom in small print.</p>'
           '<ol><li><strong>When the line is the bottleneck.</strong> If a wired test shows 8&nbsp;Mbps down, no mesh, extender or powerline changes that number. '
           'Ever.</li>'
           '<li><strong>When one better-placed router would do it.</strong> Moving the router, or replacing a six-year-old ISP box with a modern one, fixes a large '
           'share of homes for a tenth of the price of mesh.</li>'
           '<li><strong>When one Ethernet cable solves it.</strong> A single run feeding one well-placed access point beats a three-node wireless mesh, for less '
           'money, every time.</li>'
           '<li><strong>When the problem is one device.</strong> An eight-year-old single-stream laptop will be slow on a &pound;700 mesh.</li>'
           '<li><strong>When the problem is congestion, not coverage.</strong> In a flat with twenty neighbouring networks, adding more of your own radios makes the '
           'airtime worse. Moving devices to 5&nbsp;GHz, choosing a clean channel and <em>reducing</em> transmit power is free and works better.</li>'
           '<li><strong>When you want coverage in a garage, garden office or barn.</strong> That is a cable or an outdoor link, not a mesh job. Indoor nodes pointed '
           'at a brick wall do not reach outbuildings.</li></ol>'},

  {'eyebrow': '/10 &mdash; EXTENDERS & POWERLINE',
   'h2': 'Extenders, &ldquo;boosters&rdquo; and powerline &mdash; the honest truth',
   'html': '<p><strong>A single-radio extender halves your throughput before anything else goes wrong.</strong> It has to receive and re-transmit on the same channel '
           'and cannot do both at once. That is physics, not a design flaw. This is not just a consumer problem &mdash; Ubiquiti&rsquo;s own professional guidance '
           'cites close to 50% loss per wireless hop and recommends no more than two hops.</p>'
           '<p>Extenders also don&rsquo;t create signal. Plug one in where the signal is already poor and you rebroadcast a poor signal. The correct place is roughly '
           'halfway &mdash; which is usually not where the dead spot is, which is why people are disappointed.</p>'
           '<p>Priced honestly, a &pound;27 extender is a perfectly reasonable &pound;27 fix for one dead corner where you need email and a doorbell camera to work. '
           'It is not a network upgrade, and nobody should sell it to you as one.</p>'
           '<p><strong>The marketplace &ldquo;WiFi boosters&rdquo; are largely worthless.</strong> Consumer reporting on the brands sold as UltraXtend, SuperBoost, '
           'WiFiBoost and similar describes cheap single-band repeaters sold at &pound;100+ that can be had for about &pound;40 elsewhere, through rotating company '
           'names with no phone number and no real returns address. <strong>There is no such thing as a passive plug-in &ldquo;signal amplifier&rdquo;.</strong> If it '
           'has no aerials, no configuration and no meaningful power draw, it does nothing at all.</p>'
           '<p><strong>Powerline, fairly.</strong> For around &pound;40, a wired link to one room without lifting a floorboard is a genuinely good deal &mdash; when '
           'it works. It works well when both adapters are on the same ring main, plugged <strong>directly into wall sockets</strong>, on reasonably modern wiring. It '
           'fails or crawls across different circuits, through extension leads and surge strips (the filtering strips the signal), on a garage with its own submain, '
           'and usually will not link at all across a separate consumer unit. Field experience is roughly 40&ndash;50% throughput loss across a second RCD.</p>'
           '<p>One thing installers forget: powerline radiates across roughly 1.8&ndash;86&nbsp;MHz on unshielded mains wiring. <strong>Don&rsquo;t fit it for a radio '
           'amateur or a shortwave listener, or next door to one.</strong> If a neighbour reports new interference after you fit it, take it out.</p>'
           '<p>Our rule: treat powerline as a &pound;40 experiment with a no-quibble return, not a designed solution. Test it on the day. If it links below about '
           '100&nbsp;Mbps, take it out and price the cable.</p>'},

  {'eyebrow': '/11 &mdash; WHAT WE&rsquo;D ACTUALLY DO',
   'h2': 'What we&rsquo;d do in your house',
   'html': '<p>This is opinion, clearly labelled as opinion.</p>'
           '<p>For most UK homes we would spend <strong>&pound;179 on a sensible Wi-Fi 6 three-pack and &pound;3 on an Ethernet cable</strong>, run that cable to the '
           'worst-served node, and put the money we saved towards fixing the actual bottleneck &mdash; which is usually the broadband package or a nine-year-old '
           'laptop.</p>'
           '<p>For a Victorian terrace or a stone cottage we would stop thinking about mesh altogether and think about <strong>one access point per floor, wired</strong>. '
           'It costs less than a flagship mesh, it works, and it keeps working.</p>'
           '<p>For a garden office we would put in <strong>external-grade Cat6 in ducting</strong> and be done with it for the next twenty years.</p>'
           '<p>If you want us to look at yours, we cover Bournemouth, Poole, Christchurch and the wider Dorset area, and we&rsquo;ll tell you if the answer is '
           '&ldquo;you don&rsquo;t need us&rdquo;. See also our <a href="/mesh-wifi-setup-guide/">step-by-step setup guide</a>, our '
           '<a href="/wifi-troubleshooting/">fault-finding guide</a>, and <a href="/business-wifi-installation/">business WiFi</a> if this is for an office.</p>'},

  {'eyebrow': '/12 &mdash; OUR HONESTY LEDGER',
   'h2': 'What on this page is a claim, and what is a measurement',
   'html': '<p>We think every page like this should have one of these. Most don&rsquo;t.</p>'
           '<ul><li><strong>Every square-footage figure</strong> above is the manufacturer&rsquo;s own claim, measured in open-plan conditions. The evidence that they '
           'are soft is on this page: the same Netgear three-pack is 4,500&nbsp;sq&nbsp;ft on the UK site and 6,000&nbsp;sq&nbsp;ft on the US one.</li>'
           '<li><strong>Every &ldquo;supports X devices&rdquo; figure</strong> is a vendor lab claim. TP-Link themselves state that real capacity is generally less '
           'than the maximum.</li>'
           '<li><strong>Our &ldquo;halve or third the coverage claim&rdquo; rule</strong> is our rule of thumb, not a measurement.</li>'
           '<li><strong>The node-count planner</strong> is a rule of thumb built from measured attenuation data plus field experience. The only reliable method is a '
           'survey.</li>'
           '<li><strong>The ~50% loss per wireless hop and the 40&ndash;50% powerline loss across a second RCD</strong> are typical field experience corroborated by '
           'vendor guidance, not standards figures.</li>'
           '<li><strong>All prices</strong> were captured on 22 July 2026 and move constantly.</li></ul>'
           '<p>If any figure here is out of date or wrong, <a href="/contact/">tell us and we will fix it</a>. We would rather publish less than publish something we '
           'cannot stand behind.</p>'},
 ],
 'faqs': [
  {'q': 'Does mesh WiFi work through thick brick walls and foil insulation?',
   'a': 'It works around them, not through them &mdash; that&rsquo;s the whole trick. A 215&nbsp;mm solid brick wall costs serious signal at 5&nbsp;GHz and foil-backed plasterboard behaves like a metal sheet, so no single router beats them. Mesh works by placing nodes so the signal takes short hops through doorways and hallways instead of fighting masonry. In solid-wall and foil-insulated houses, wire the nodes together if you possibly can &mdash; wireless backhaul through the very walls that caused the problem is the most common DIY mistake. Full detail: <a href="/wifi-uk-buildings-heat/">what UK walls cost your WiFi</a>.'},
    {'q': 'How many mesh nodes do I need for a 3-bed house in the UK?',
   'a': 'For a typical 1930s&ndash;1990s cavity-brick three-bed semi over two floors, a router plus one or two nodes is usually right. For a Victorian solid-brick '
        'terrace over three floors, plan on one unit per floor and wire them if you can. For a stone cottage with 450&nbsp;mm walls, think one unit per room cluster. '
        'Floor area matters far less than what the walls are made of &mdash; which is why the coverage figure on the box is close to useless in Britain.'},
  {'q': 'Is mesh WiFi better than an extender?',
   'a': 'Yes, meaningfully. A single-radio extender receives and re-transmits on the same channel and cannot do both at once, so it roughly halves throughput before '
        'anything else goes wrong. Mesh systems keep a separate radio or a cable for the link between units. That said, a &pound;27 extender is a fair fix for one '
        'dead corner where you just need email and a doorbell to work &mdash; it just isn&rsquo;t a network upgrade.'},
  {'q': 'Do I need Wi-Fi 7, or is Wi-Fi 6 enough?',
   'a': 'For most UK homes, Wi-Fi 6 is enough. Buy Wi-Fi 7 if it brings 2.5&nbsp;Gbps ports for a small premium and you are on a fast line &mdash; the ports are the '
        'real upgrade. Be aware that several &ldquo;Wi-Fi 7&rdquo; systems are dual-band with no 6&nbsp;GHz radio at all, and that 6&nbsp;GHz is the worst of the '
        'three bands at getting through British brick. In a solid-wall house it is effectively a same-room technology.'},
  {'q': 'Should I take my broadband provider&rsquo;s WiFi pods instead of buying my own?',
   'a': 'Often yes. Sky WiFi Max starts at &pound;6/month with a guaranteed minimum speed per room; BT and EE offer discs with a &pound;100 credit if they cannot fix '
        'your blackspots. You are paying for the provider to own the problem, which has real value. The catch is that the kit is usually loaned, and ISP pods only '
        'work with that provider&rsquo;s hub &mdash; so they are worthless if you switch.'},
  {'q': 'Will mesh WiFi make my internet faster?',
   'a': 'No. Mesh improves coverage, not the speed of your broadband line. If a laptop plugged into the router with a cable is slow, that is your ceiling and no '
        'wireless kit will raise it. Always run a wired speed test before you buy anything &mdash; it is the single most useful ten minutes you can spend.'},
  {'q': 'Does mesh WiFi work in a Victorian house with solid brick walls?',
   'a': 'It can, but wireless backhaul between nodes struggles badly through 215&nbsp;mm solid brick, and a party wall or chimney breast should be treated as opaque '
        'at 5&nbsp;GHz. In those houses the honest answer is usually one access point per floor with an Ethernet cable between them, or a powerline-hybrid system if '
        'cabling is genuinely impossible. A flagship wireless mesh is the expensive way to be disappointed.'},
  {'q': 'Can mesh WiFi reach my garden office?',
   'a': 'Usually not. The path crosses at least one masonry wall and one modern low-E glazed unit, and coated glass alone can be worth 20&ndash;35&nbsp;dB &mdash; far '
        'more than plain glass. Together that is often more loss than the entire rest of the house. The reliable answers, in order, are external-grade Cat6 in '
        'ducting, fibre for long runs, or a point-to-point link with genuine outdoor line of sight. Pointing a bridge through a coated window throws most of the '
        'signal away.'},
  {'q': 'Do you sell mesh WiFi systems?',
   'a': 'No. We are an IT support firm, not a reseller, and we earn nothing from anything listed on this page. We are happy to advise on what suits your property, '
        'install and configure whatever you buy, or run the cabling that usually turns out to be the better answer.'},
 ],
 'crossLinksHtml': '<p><strong>Next steps:</strong> <a href="/mesh-wifi-setup-guide/">set it up properly, ISP by ISP</a> &middot; '
                   '<a href="/wifi-troubleshooting/">fix WiFi that is already misbehaving</a> &middot; '
                   '<a href="/wifi-uk-buildings-heat/">why UK walls and hot weather break WiFi</a> &middot; '
                   '<a href="/business-wifi-installation/">business WiFi in Dorset</a> &middot; '
                   '<a href="/wifi-signal-test/">test your signal live, free</a></p>'},

# ===========================================================================
# 2. SETUP GUIDE (HowTo schema)
# ===========================================================================
{'slug': 'mesh-wifi-setup-guide',
 'title': 'Mesh WiFi Setup Guide UK: Step by Step, ISP by ISP | 365 Techies',
 'metaDesc': 'How to set up mesh WiFi properly in a UK home: router placement, AP mode vs bridge mode on BT, Sky, Virgin, Plusnet and TalkTalk, wired backhaul, '
             'channels, IoT devices and security. Nine ordered steps, with what to test after each one.',
 'ogTitle': 'How to Set Up Mesh WiFi Properly &mdash; UK ISP-by-ISP Guide | 365 Techies',
 'crumbName': 'Mesh WiFi Setup Guide',
 'eyebrow': '// SETUP GUIDE &middot; UK ISPs',
 'h1': 'How to set up mesh WiFi <em class="grad grad--cyan">properly</em>',
 'lede': 'Most mesh systems are installed in ten minutes and then quietly underperform for years. This is the order we actually work in, what to test after each '
         'step, and the specific settings for BT, EE, Sky, Virgin Media, Plusnet, TalkTalk and Vodafone hubs. Nothing here needs a tool more exotic than a network '
         'cable.',
 'chips': ['9 ordered steps', 'Every major UK ISP', 'Test after each step'],
 'primaryCta': ['Get us to set it up', '/contact/'],
 'secondaryCta': ['Compare mesh systems first', '/mesh-wifi-systems-uk/'],
 'ctaHead': 'Would you rather we just did it?',
 'ctaSub': 'We set up mesh networks properly &mdash; placed, wired where it matters, channels planned, IoT devices onboarded and the whole thing documented and '
           'handed over. Remote where possible, in person across Bournemouth, Poole and Dorset where it isn&rsquo;t.',
 'serviceName': 'Mesh WiFi setup and configuration',
 'schemaKind': 'service',
 'howToName': 'How to set up a mesh WiFi system in a UK home',
 'howToSteps': [
   {'name': 'Take a baseline first', 'text': 'Plug a laptop into the router with a cable and run a speed test. That is your ceiling. Photograph the label on the base of the router before you change anything, and walk the property recording signal strength room by room.'},
   {'name': 'Fix the router placement', 'text': 'Move the router central, high and out in the open, away from cupboards, mirrors, TVs and microwaves. Re-survey. If placement fixed the problem, stop here.'},
   {'name': 'Choose your topology', 'text': 'Decide between leaving the ISP hub in charge with your mesh in access-point mode, or putting the hub into modem or bridge mode. Check whether your landline depends on the hub before you change anything.'},
   {'name': 'Set modem or bridge mode if needed', 'text': 'Follow the procedure for your specific ISP hub. Virgin, BT Business, Plusnet and others each differ, and several UK hubs have no bridge mode at all.'},
   {'name': 'Sort the backhaul', 'text': 'Order of preference: Ethernet, then existing coax, then powerline, then wireless. Never run wireless backhaul through the one wall you already know is the problem.'},
   {'name': 'Plan the network names', 'text': 'Use one network name across all bands, with a separate 2.4 GHz network for smart-home devices that cannot see 5 GHz.'},
   {'name': 'Set channels and widths manually', 'text': 'Use channel 1, 6 or 11 at 20 MHz on 2.4 GHz, and 80 MHz on 5 GHz. Near airports, ports and the coast, pin 5 GHz to a non-radar channel.'},
   {'name': 'Place and add nodes one at a time', 'text': 'Put each node roughly halfway to the problem, not in the dead spot. Pair it in the same room as the main unit, then move it, then test before unboxing the next one.'},
   {'name': 'Lock it down and hand it over', 'text': 'Change the admin password, set WPA3 or WPA2/WPA3, disable WPS, turn on automatic firmware updates, and set up an isolated guest network. Then document what you did.'},
 ],
 'sections': [

  {'eyebrow': '/00 &mdash; READ THIS FIRST',
   'h2': 'Two things to check before you touch anything',
   'html': '<div class="callout"><p><strong>Ask about the landline first.</strong> On BT, EE and similar Digital Voice services the telephone registers to the ISP '
           'hub itself. Putting that hub into bridge mode, or bypassing it, <strong>stops the landline working &mdash; including 999 calls from that handset</strong>. '
           'This catches people out constantly, and it matters most in exactly the households least able to cope with it. Check before you change the topology, not '
           'after.</p></div>'
           '<div class="callout"><p><strong>Photograph the label on the base of the router now.</strong> Admin password, default network name, WiFi key, serial '
           'number. Bridge and modem-mode changes can lock you out of the web interface, and that sticker is often the only way back in.</p></div>'},

  {'eyebrow': '/01 &mdash; BASELINE',
   'h2': 'Step 1: measure before you change anything',
   'html': '<ol><li>Plug a laptop into a LAN port on the ISP router with a cable and run a speed test. <strong>This is your ceiling.</strong> Everything else is about '
           'how much of it you can deliver to a room.</li>'
           '<li>Write down your provider and package, the exact hub model from the base label, and whether the line is full fibre (an Openreach ONT box on the wall), '
           'FTTC over the phone socket, or Virgin coax.</li>'
           '<li>Walk the property with a signal meter and record the reading in each room. Our free <a href="/wifi-signal-test/">365 WiFi Optimizer</a> does this live '
           'in the browser. As a scale: &minus;30 to &minus;55&nbsp;dBm is excellent, &minus;55 to &minus;67 is fine for video calls and streaming, &minus;67 to '
           '&minus;75 is marginal, and worse than &minus;75 is effectively unusable.</li>'
           '<li>Mark the dead spots on a rough floor plan. You are going to want this later to prove you fixed them.</li>'
           '<li>Note where the master socket, ONT or coax entry is. It is very often the worst possible place in the house &mdash; which is precisely why the router '
           'ended up there.</li></ol>'},

  {'eyebrow': '/02 &mdash; PLACEMENT',
   'h2': 'Step 2: move the router (this is often the whole fix)',
   'html': '<ul><li><strong>Central, not cornered.</strong> A router in the front hall of a terrace throws half its signal into the street.</li>'
           '<li><strong>Off the floor</strong> &mdash; waist height or higher, on a shelf. Ofcom&rsquo;s own advice is a table or shelf rather than the floor.</li>'
           '<li><strong>Out in the open.</strong> Never inside a media cabinet, a metal-doored meter cupboard, a fitted wardrobe or the understairs cupboard.</li>'
           '<li><strong>Away from</strong> microwave ovens, halogen lamps, dimmer switches, speakers, televisions and monitors &mdash; that list is Ofcom&rsquo;s '
           '&mdash; and also mirrors, wall-mounted TVs, fridge-freezers and hot water tanks.</li>'
           '<li>If it has external aerials, point them in <strong>different directions</strong> rather than all straight up. It helps between floors.</li>'
           '<li>If the socket is in the wrong place, move the router rather than accepting it: on full fibre, run Ethernet from the ONT to the router (up to 100&nbsp;m '
           'is fine); on FTTC, fit a data extension; on Virgin, a coax relocation is a chargeable engineer visit.</li></ul>'
           '<p><strong>Re-survey now.</strong> If placement fixed it, stop &mdash; you may not need mesh at all. We would rather tell you that than sell you three '
           'boxes.</p>'},

  {'eyebrow': '/03 &mdash; TOPOLOGY',
   'h2': 'Step 3: decide who is in charge of the network',
   'html': '<p>There are four sensible shapes, in increasing order of hassle:</p>'
           '<ul><li><strong>A.</strong> ISP hub alone, better placed. Try this first.</li>'
           '<li><strong>B.</strong> ISP hub plus your mesh in <strong>access-point mode</strong>. No double NAT, you lose a few vendor app features. '
           '<strong>This is the fallback that works on every UK ISP</strong> and it is what we use most often.</li>'
           '<li><strong>C.</strong> ISP hub in modem/bridge mode, your kit doing everything. Cleanest result, but it kills the hub&rsquo;s WiFi and usually its '
           'landline features.</li>'
           '<li><strong>D.</strong> Your own router straight onto the ONT, hub removed entirely. Best on full fibre, needs the provider&rsquo;s authentication '
           'details, and loses any hub-dependent landline.</li></ul>'
           '<p><strong>Understand double NAT before you choose.</strong> Two routers in series interfere with port forwarding, VPNs, some streaming and some gaming '
           '(an Xbox will report Strict or Moderate NAT). It does <em>not</em> slow down normal browsing, so it is not the disaster forums make out. But if you run a '
           'VPN to the office, a NAS, CCTV with remote viewing or a VoIP phone system, don&rsquo;t accept it.</p>'},

  {'eyebrow': '/04 &mdash; ISP BY ISP',
   'h2': 'Step 4: modem and bridge mode, provider by provider',
   'html': '<p class="note"><strong>Verified July 2026 &mdash; check your exact model on the day.</strong> Availability changes with firmware and hardware revision, '
           'and providers do move things.</p>'
           '<ul><li><strong>Virgin Media (Hub 3, 4, 5 and Super Hub 1/2/2AC):</strong> connect by cable, browse to <code>192.168.0.1</code>, log in with the '
           '<em>settings</em> password from the base of the hub (not the WiFi key), then Modem Mode &rarr; Enable &rarr; Apply Changes, and wait several minutes. '
           'Afterwards the hub&rsquo;s WiFi is off and its interface moves to <code>192.168.100.1</code>. <strong>Connect your router to Ethernet port 1 only</strong> '
           '&mdash; ports 2 to 4 stop working. Power-cycle the hub after connecting so it picks up the new WAN address.</li>'
           '<li><strong>Virgin Hub 5x:</strong> Virgin state modem mode is <strong>not currently available</strong>. Use access-point mode, or ask them to swap you to '
           'a Hub 5.</li>'
           '<li><strong>BT residential Smart Hub 2:</strong> no bridge or modem-only mode. The <strong>Business</strong> Smart Hub 2 does have one (Hub Manager &rarr; '
           'Advanced Settings &rarr; Broadband &rarr; Routing &rarr; Enable Bridging). On residential BT, use access-point mode or go direct to the ONT.</li>'
           '<li><strong>BT and EE on full fibre:</strong> the ONT is only a media converter &mdash; there is nothing to bridge. Run ONT to your router&rsquo;s WAN '
           'port and configure PPPoE. <strong>Ask your provider for the correct credentials &mdash; never guess them on someone else&rsquo;s account.</strong> Leave '
           'VLAN tagging off on genuine Openreach lines.</li>'
           '<li><strong>EE Smart Hub / Smart Hub Plus:</strong> no bridge mode. Turn the hub&rsquo;s WiFi off and run your kit as access points, or (if there is no '
           'Digital Voice) go direct to the ONT.</li>'
           '<li><strong>Sky Broadband Hub:</strong> cannot be bridged. Sky uses DHCP rather than PPPoE, and some lines need DHCP Option 61 with a client ID. Option 61 '
           'support is patchy &mdash; present on many ASUS and Netgear routers, absent across much of TP-Link&rsquo;s consumer range. <strong>Check before you buy a '
           'router for a Sky line.</strong></li>'
           '<li><strong>Plusnet Hub Two (FTTC):</strong> <code>192.168.1.254</code> &rarr; Advanced Setting &rarr; Broadband &rarr; Internet &rarr; Bridging &rarr; '
           'Enabled. Then cable from one of the first three LAN ports to your router&rsquo;s WAN port and set up PPPoE with your Plusnet credentials. On Plusnet Full '
           'Fibre, go straight to the ONT instead.</li>'
           '<li><strong>TalkTalk (Sagemcom hub):</strong> no true bridge mode. If TalkTalk supplied an eero on Full Fibre, the eero itself can be bridged. Otherwise, '
           'access-point mode with the Sagemcom&rsquo;s WiFi disabled.</li>'
           '<li><strong>Vodafone:</strong> treat as an access-point-mode provider unless you can confirm otherwise with Vodafone for that specific hub and '
           'package.</li></ul>'
           '<p><strong>Access-point mode &mdash; the universal fallback.</strong> Leave the ISP hub handling DHCP and NAT. Set the mesh to Access Point, Bridge or '
           '&ldquo;use existing router&rdquo;. Cable the mesh&rsquo;s WAN port into a hub LAN port. <strong>Disable the hub&rsquo;s 2.4 and 5&nbsp;GHz radios '
           'completely</strong> &mdash; not just hide them. Give the mesh a different network name from the hub&rsquo;s old one so you can always prove which network '
           'a device is really on.</p>'},

  {'eyebrow': '/05 &mdash; BACKHAUL',
   'h2': 'Step 5: how the units talk to each other',
   'html': '<p>Order of preference: <strong>Ethernet &rarr; existing coax &rarr; powerline &rarr; wireless.</strong> TP-Link&rsquo;s own wording is that &ldquo;a '
           'wired connection is more stable and faster than a wireless backhaul&rdquo;, and they sell the wireless ones.</p>'
           '<ul><li>Cat5e is fine &mdash; 100&nbsp;m maximum run, and it carries 2.5&nbsp;Gbps the whole way. Use Cat6 on new installs if it costs little more. '
           '<strong>Do not pay for Cat7 or Cat8 in a house</strong>; it is money for nothing.</li>'
           '<li>Practical routes: skirting trunking, UV-stable cable up an outside wall, through the loft into upstairs bedrooms, or alongside an existing aerial run. '
           'Solid-core in the walls, stranded patch leads for the last metre. Keep data cable about 50&nbsp;mm away from parallel mains and cross it at 90&deg;.</li>'
           '<li><strong>Check the property first.</strong> Many houses built from the 2000s onwards already have network sockets terminating in a hall or loft '
           'cupboard. Two minutes with a cable tester can save you a node.</li>'
           '<li>Powerline only where Ethernet is impossible, and <strong>always directly into a wall socket</strong> &mdash; never an extension lead, surge strip or '
           'UPS. Expect a big drop across separate circuits and close to nothing across a separate consumer unit.</li>'
           '<li>Coax networking is rarely right in the UK &mdash; most homes have no in-house coax backbone, and standard TV splitters block it.</li></ul>'
           '<p><strong>The single most common DIY mistake:</strong> running wireless backhaul through the one wall you already know is the problem. You get full bars '
           'and terrible speed, and it is baffling until you realise the node is only as good as its link home.</p>'},

  {'eyebrow': '/06 &mdash; NETWORK NAMES & SMART DEVICES',
   'h2': 'Step 6: one network name, and the smart-home trap',
   'html': '<p><strong>Default to one network name across all bands</strong> with band steering, so devices roam properly instead of clinging to the wrong one.</p>'
           '<p>Then there is the exception that generates more support calls than anything else on this page. A great deal of smart-home kit &mdash; plugs, bulbs, '
           'video doorbells, robot vacuums, older printers, thermostats, garage door openers, cheap cameras &mdash; is <strong>2.4&nbsp;GHz only</strong>. During '
           'setup they scan 2.4&nbsp;GHz only, and if the phone running the app is sitting on 5&nbsp;GHz, pairing fails with a misleading &ldquo;wrong '
           'password&rdquo; error. Nothing is wrong with your password.</p>'
           '<p><strong>A UK-specific gotcha almost nobody mentions:</strong> the UK permits 2.4&nbsp;GHz channels 1&ndash;13, but many US-designed smart devices only '
           'support 1&ndash;11 and literally cannot see a network on channel 12 or 13. If a device insists it &ldquo;cannot find&rdquo; a network that is plainly '
           'working, check the channel before you check anything else.</p>'
           '<ul><li><strong>Clean fix:</strong> a dedicated 2.4&nbsp;GHz network for smart devices, where your system supports one.</li>'
           '<li><strong>Quick fix:</strong> temporarily disable 5&nbsp;GHz or create a temporary 2.4&nbsp;GHz guest network, join the phone to it, pair the device, '
           'then re-enable. Most devices remember the name and password, not the band.</li>'
           '<li><strong>Naming:</strong> one clear main name plus <code>-IoT</code> and <code>-Guest</code>. Avoid your house number, your business name and address, '
           'or the router model. Never leave the manufacturer default.</li>'
           '<li>Keep the name and password <strong>identical on every node</strong> and on any access point you have kept.</li></ul>'},

  {'eyebrow': '/07 &mdash; CHANNELS',
   'h2': 'Step 7: channels and widths (set them manually)',
   'html': '<ul><li><strong>2.4&nbsp;GHz: channel 1, 6 or 11 only, at 20&nbsp;MHz.</strong> Using 40&nbsp;MHz on 2.4&nbsp;GHz in a terrace or a block of flats is '
           'antisocial and self-defeating &mdash; you will interfere with your neighbours and they with you.</li>'
           '<li>Pick the 2.4&nbsp;GHz channel by scanning from the middle of the property and weighting by <em>signal strength</em>, not the number of networks. One '
           'very strong neighbour on channel 6 is worse than four weak ones on channel 1.</li>'
           '<li><strong>5&nbsp;GHz: 80&nbsp;MHz is the sensible default.</strong> Drop to 40&nbsp;MHz if lots of strong neighbours overlap. 160&nbsp;MHz is worth '
           'trying only in a detached property, because in the UK a 160&nbsp;MHz block almost always includes radar-sharing channels.</li>'
           '<li><strong>Radar channels, explained properly.</strong> UK 5&nbsp;GHz splits into channels 36&ndash;48 (no radar detection required, 200&nbsp;mW), '
           '52&ndash;64 (indoor only, radar detection and power control required), 100&ndash;140 (indoor and outdoor, up to 1&nbsp;W, radar detection required) and '
           '149&ndash;165 (no radar detection, 200&nbsp;mW). Before using a radar-sharing channel the equipment must listen for at least 60 seconds, must stop '
           'transmitting <strong>within 10 seconds</strong> of detecting radar, and must then avoid that channel for at least 30 minutes.</li>'
           '<li><strong>The Dorset rule:</strong> near an airport, a Met Office radar, a port or an exposed coastal site &mdash; which covers a great deal of this '
           'county &mdash; pin 5&nbsp;GHz to a non-radar channel and accept slightly more neighbour congestion. It is the difference between a network that '
           'occasionally vanishes for a minute and one that doesn&rsquo;t.</li>'
           '<li><strong>6&nbsp;GHz</strong> is licence-exempt in the UK from 5925&ndash;6425&nbsp;MHz and essentially empty of neighbours &mdash; excellent for '
           'backhaul and same-room speed, poor through walls. Treat it as a same-room band.</li>'
           '<li><strong>Set channels manually.</strong> Auto-channel re-scans and hops, and each hop is a short outage. Re-check every 6&ndash;12 months.</li></ul>'},

  {'eyebrow': '/08 &mdash; PLACING NODES',
   'h2': 'Step 8: place the nodes, one at a time',
   'html': '<ul><li><strong>Halfway, not in the dead spot.</strong> This is the most common mistake by a distance. A node placed where there is no signal has nothing '
           'to relay.</li>'
           '<li><strong>Distance ceiling on wireless backhaul:</strong> TP-Link suggest no more than about 15&nbsp;m between Deco units; Netgear suggest planning to '
           'about two-thirds of a node&rsquo;s maximum range so coverage overlaps. If the nodes are wired, distance stops mattering entirely.</li>'
           '<li><strong>Count walls, not metres.</strong> One stud wall is cheap. One solid brick wall is expensive. Two solid walls plus a chimney breast is fatal '
           'to 5&nbsp;GHz. Prefer hallways and landings with line of sight through doorways.</li>'
           '<li>Same height as the main unit, in the open, away from metal cabinets, microwaves and USB 3.0 devices. A shelf beats a socket behind a bed.</li>'
           '<li><strong>Add nodes one at a time:</strong> set up the main unit and confirm internet &rarr; power the first satellite <em>in the same room</em>, let it '
           'join and update its firmware &rarr; move it to position &rarr; check the link quality in the app &rarr; only then open the next box.</li>'
           '<li><strong>What good looks like:</strong> TP-Link recommend at least two bars between units. As an engineering guide, aim for &minus;60&nbsp;dBm or '
           'better node-to-node, and treat worse than about &minus;70&nbsp;dBm as needing to move the node <em>closer to the router</em> &mdash; not further towards '
           'the dead spot, which is the instinct and is wrong.</li>'
           '<li>Name every node something meaningful: &ldquo;Landing&rdquo;, &ldquo;Kitchen&rdquo;, &ldquo;Loft office&rdquo;. Future you will be grateful.</li>'
           '<li><strong>After each node, walk the survey again</strong> and speed-test both next to the node and in the room it was meant to fix. Fast at the node but '
           'poor in the room means the position is wrong. Poor even at the node means the backhaul is the problem.</li></ul>'},

  {'eyebrow': '/09 &mdash; SECURITY & HANDOVER',
   'h2': 'Step 9: lock it down before you call it finished',
   'html': '<ul><li><strong>Change the router&rsquo;s admin password.</strong> Three random words plus a number or symbol, stored in a password manager rather than on '
           'a sticky note under the hub.</li>'
           '<li><strong>Set WPA3</strong>, or WPA2/WPA3 transitional if older devices need it. WPA3 has been mandatory for newly certified devices since July 2020. '
           'Never leave WEP or WPA/TKIP enabled.</li>'
           '<li>Change the WiFi password from the one on the label if it has ever been photographed, given to a tradesperson, or if the router is second-hand. '
           '<strong>Length beats complexity.</strong></li>'
           '<li><strong>Disable WPS.</strong> It is not part of WPA3 certification and it is a known weak point.</li>'
           '<li>Turn off remote management and UPnP unless something genuinely needs them.</li>'
           '<li><strong>Enable automatic firmware updates</strong> on the router and every node &mdash; and check they are actually applying. Look up the '
           'manufacturer&rsquo;s end-of-support date too: an unsupported router is a permanent open door, and no amount of good configuration closes it.</li>'
           '<li><strong>Set up a guest network with client isolation.</strong> Give it its own password and change it now and then. The trades and the cleaner should '
           'not have your main password.</li>'
           '<li>Segregate true set-and-forget devices &mdash; cameras, plugs, sensors, doorbells. <strong>One caveat:</strong> on some consumer kit the &ldquo;IoT '
           'network&rdquo; is a convenience band-split rather than genuine isolation, so check whether your vendor documents actual separation. And leave '
           'Chromecast, AirPlay, Sonos, smart TVs and printers on the main network unless your router supports cross-network discovery, or they will simply vanish '
           'from everyone&rsquo;s phones.</li>'
           '<li><strong>Business note:</strong> under Cyber Essentials, an ISP-provided home router is out of scope for a homeworker &mdash; but a router the '
           '<em>business</em> supplies is in scope and must meet the firewall requirements. Worth knowing before you buy kit for staff.</li></ul>'},

  {'eyebrow': '/10 &mdash; THE ORDER',
   'h2': 'The order, and what to test after each step',
   'html': '<p>Baseline &rarr; placement &rarr; topology (check for double NAT: is the second router&rsquo;s WAN address a private one?) &rarr; backhaul (confirm the '
           'links come up at 1&nbsp;Gb/s, not 100&nbsp;Mb/s &mdash; a 100&nbsp;Mb/s link on gigabit kit almost always means a damaged pair) &rarr; nodes, one at a '
           'time &rarr; network names (walk the property and confirm the phone holds one name) &rarr; channels (leave it 24 hours, then check the logs for radar '
           'events and auto-channel changes) &rarr; security (try to reach a main-network device from the guest network &mdash; it should fail) &rarr; onboard the '
           'awkward devices last and test end-to-end (does the doorbell notification actually arrive on a phone that is on mobile data?) &rarr; document and hand '
           'over.</p>'
           '<p><strong>Realistic targets to aim for:</strong> &minus;55&nbsp;dBm or better in the main living and working rooms; at least 50&ndash;60% of your wired '
           'baseline over WiFi in the same room as a node; and no dead zones where a video call drops. <strong>Never promise the headline package speed over WiFi '
           'anywhere</strong> &mdash; if an installer does, be suspicious.</p>'
           '<p><strong>Change one thing at a time, with a test in between.</strong> Change five things at once and you cannot reproduce the fix, or diagnose the '
           'regression next week.</p>'},
 ],
 'faqs': [
  {'q': 'Can I put my Sky router into modem mode for mesh WiFi?',
   'a': 'No &mdash; Sky&rsquo;s hubs have no bridge or modem-only mode. The reliable route on Sky is access-point mode: leave the Sky hub in charge of the connection, cable your mesh&rsquo;s main unit into it, switch the mesh to AP/bridge mode and turn the hub&rsquo;s own WiFi radios off. If you&rsquo;d rather replace the hub entirely, Sky uses DHCP rather than a username/password, and some lines need DHCP option&nbsp;61 support &mdash; patchy on consumer routers, so check before buying one for a Sky line.'},
    {'q': 'Should I put my ISP router in bridge mode or use access point mode?',
   'a': 'Access-point mode is the safer default and works on every UK provider: the ISP hub keeps handling the connection, your mesh handles the WiFi, and you '
        'disable the hub&rsquo;s radios completely. Bridge or modem mode gives a slightly cleaner result but is unavailable on several UK hubs &mdash; including the '
        'residential BT Smart Hub 2, the Sky hub and the Virgin Hub 5x &mdash; and it will stop a Digital Voice landline working, including 999 calls from that '
        'handset.'},
  {'q': 'How do I put a Virgin Media hub into modem mode?',
   'a': 'Connect by cable, browse to 192.168.0.1 and sign in with the settings password printed on the base of the hub (not the WiFi key), then choose Modem Mode, '
        'enable it and apply. Wait several minutes. Afterwards the hub&rsquo;s WiFi is off and its interface moves to 192.168.100.1, and you must use Ethernet port 1 '
        '&mdash; ports 2 to 4 stop working. Note that Virgin state modem mode is not currently available on the Hub 5x.'},
  {'q': 'Why won&rsquo;t my smart plug or video doorbell connect to my WiFi?',
   'a': 'Almost always because the device is 2.4&nbsp;GHz-only and the phone running the setup app is on 5&nbsp;GHz &mdash; which usually shows up as a misleading '
        '&ldquo;wrong password&rdquo; error. Join the phone to a 2.4&nbsp;GHz network temporarily and pair again. If it still cannot see the network, check the '
        '2.4&nbsp;GHz channel: the UK allows channels 1&ndash;13 but many US-designed devices only support 1&ndash;11 and are blind to 12 and 13.'},
  {'q': 'Where should I put my mesh WiFi nodes?',
   'a': 'Roughly halfway between the router and the problem area &mdash; not in the dead spot itself, which is the most common mistake. Keep them at the same sort of '
        'height as the main unit, out in the open, and count walls rather than metres: one stud wall is cheap, one solid brick wall is expensive. Add them one at a '
        'time, pairing each in the same room as the main unit before moving it into place.'},
  {'q': 'Do I need to run Ethernet between mesh nodes?',
   'a': 'You do not have to, but it is the single biggest improvement available. Wireless backhaul shares airtime with your devices and loses close to half its '
        'throughput per hop. If you can get one cable between two points &mdash; through a loft, along a skirting or up an outside wall &mdash; it will outperform '
        'spending several hundred pounds more on radios.'},
  {'q': 'What WiFi channel should I use in the UK?',
   'a': 'On 2.4&nbsp;GHz use channel 1, 6 or 11 at 20&nbsp;MHz width, chosen by signal strength rather than the number of neighbouring networks. On 5&nbsp;GHz, '
        '80&nbsp;MHz is the sensible default. Near airports, ports or the coast &mdash; much of Dorset &mdash; pin 5&nbsp;GHz to a non-radar channel, because radar '
        'detection will otherwise knock you off the channel for at least half an hour at a time.'},
 ],
 'crossLinksHtml': '<p><strong>Related:</strong> <a href="/mesh-wifi-systems-uk/">which mesh system to buy</a> &middot; '
                   '<a href="/wifi-troubleshooting/">fault-finding when it goes wrong</a> &middot; '
                   '<a href="/wifi-uk-buildings-heat/">walls, insulation and hot weather</a> &middot; '
                   '<a href="/wifi-signal-test/">measure your signal, free</a></p>'},

# ===========================================================================
# 3. TROUBLESHOOTING
# ===========================================================================
{'slug': 'wifi-troubleshooting',
 'title': 'Why Is My WiFi Slow? UK Fault-Finding Guide | 365 Techies',
 'metaDesc': 'Symptom-by-symptom WiFi troubleshooting for UK homes and small offices &mdash; slow WiFi, drop-outs at the same time daily, WiFi calling failures, '
             'stuttering video calls, smart devices dropping off and radar interference. Diagnose it properly before you spend anything.',
 'ogTitle': 'Why Is My WiFi Slow? A UK Fault-Finding Guide | 365 Techies',
 'crumbName': 'WiFi Troubleshooting',
 'eyebrow': '// FAULT-FINDING &middot; HOMES & SMALL OFFICES',
 'h1': 'Why is my WiFi slow? <em class="grad grad--cyan">Find the real fault</em>',
 'lede': 'Nearly every &ldquo;bad WiFi&rdquo; call turns out to be one of about a dozen faults, and most of them are not the WiFi at all. This is the order we '
         'diagnose in and the fixes that actually work &mdash; including the honest moment where the answer is &ldquo;your broadband line is the bottleneck and no '
         'equipment will change that&rdquo;.',
 'chips': ['Diagnose before you buy', 'Symptom &rarr; cause &rarr; fix', 'Free tools listed'],
 'primaryCta': ['Get it fixed properly', '/contact/'],
 'secondaryCta': ['Measure your signal free', '/wifi-signal-test/'],
 'ctaHead': 'Tried all this and it&rsquo;s still wrong?',
 'ctaSub': 'That is genuinely what we are for. We diagnose properly rather than guessing, and we will tell you when the problem is your line, your device or your '
           'walls rather than selling you a box. No-fix-no-fee, across Bournemouth, Poole, Christchurch and Dorset.',
 'serviceName': 'WiFi fault diagnosis and repair',
 'schemaKind': 'service',
 'sections': [

  {'eyebrow': '/01 &mdash; DIAGNOSE FIRST',
   'h2': 'Seven tests, in this order, before you change anything',
   'html': '<p>Changing settings before you have measured anything is how people end up three hours in with a worse network than they started with. Do these first '
           'and <strong>write down three numbers each time &mdash; download, upload and ping</strong>.</p>'
           '<ol><li><strong>Wired versus wireless</strong>, in the same spot, in the same minute. This single test splits every fault into &ldquo;the line&rdquo; or '
           '&ldquo;the WiFi&rdquo;.</li>'
           '<li><strong>At the router versus in the problem room</strong>, recording band, channel and signal strength each time.</li>'
           '<li><strong>11am versus 8&ndash;10pm.</strong> Congestion faults only appear in the evening.</li>'
           '<li><strong>Latency and packet loss</strong>, not just megabits. Most &ldquo;slow&rdquo; complaints are actually latency complaints.</li>'
           '<li><strong>Latency <em>under load</em></strong> &mdash; start a big download and watch the ping. This is the test almost nobody runs and it explains '
           'more faults than any other.</li>'
           '<li><strong>The provider&rsquo;s status page.</strong> Ten seconds, and it occasionally ends the whole investigation.</li>'
           '<li><strong>On copper lines only</strong>, the master test socket &mdash; and only where the faceplate has a horizontal split across it. If there is no '
           'horizontal bar, do not unscrew it.</li></ol>'},

  {'eyebrow': '/02 &mdash; THE SYMPTOM MATRIX',
   'h2': 'Find your symptom',
   'html': '<div class="cmp-wrap"><table class="cmp-table"><thead><tr><th>Symptom</th><th>Usual cause</th><th>What actually fixes it</th></tr></thead><tbody>'
           '<tr><th>Fast on Ethernet, slow on WiFi</th><td>Device sitting on 2.4&nbsp;GHz; wrong channel width; an old device; a single-radio extender in the '
           'path</td><td>Check which band the device is on. Set 2.4&nbsp;GHz to 20&nbsp;MHz and 5&nbsp;GHz to 80&nbsp;MHz. Test a second modern device from the same '
           'spot. Remove plug-in extenders.</td></tr>'
           '<tr><th>Fine in one room, dead in another</th><td>The building &mdash; solid brick, foil-backed board, concrete, low-E glass. Or the router is in a '
           'cupboard</td><td>Measure, don&rsquo;t guess. Reposition the router first, then run one Ethernet cable to a well-placed access point. A cable costs about '
           '&pound;3 and is usually the best value fix available.</td></tr>'
           '<tr><th>Drops out at the same time every day</th><td>Almost never WiFi. A scheduled reboot, a DHCP lease expiring, parental-control downtime, or '
           'household electrics switching on</td><td><strong>Read the router&rsquo;s event log</strong> &mdash; it distinguishes a broadband resync from a wireless '
           'event. Check the DHCP lease time and look for a second DHCP server. Correlate the time with what switches on.</td></tr>'
           '<tr><th>WiFi calling won&rsquo;t work</th><td>Not provisioned; no registered 999 address; UDP 500/4500 blocked; SIP ALG enabled</td><td>In order: confirm '
           'provisioning with the network, register the emergency address, update the handset, then allow outbound UDP 500 and 4500 and disable SIP ALG. If the '
           'toggle is missing entirely, no router change will help.</td></tr>'
           '<tr><th>Video calls stutter but downloads are fine</th><td>Bufferbloat, or a saturated upload &mdash; cloud backup and file sync are the usual '
           'culprits</td><td>Enable Smart Queue Management (fq_codel or CAKE) with a shaper just below your real line rate, then re-test. Check what is uploading in '
           'the background. Prefer 5&nbsp;GHz and use split tunnelling on VPNs.</td></tr>'
           '<tr><th>Phone clings to a distant node</th><td>Roaming is the <em>device&rsquo;s</em> decision, not the network&rsquo;s. Usually over-powered '
           'nodes</td><td>Enable 802.11k/v/r where supported, set a minimum-signal threshold around &minus;70 to &minus;75&nbsp;dBm, disable the slowest legacy '
           'rates, and turn the transmit power <em>down</em> on over-powered nodes. Some devices simply refuse to roam.</td></tr>'
           '<tr><th>Smart-home devices keep dropping off</th><td>2.4&nbsp;GHz-only devices; auto-channel moving under them; WPA3 or mandatory PMF; the address pool '
           'running out</td><td><strong>Pin the 2.4&nbsp;GHz channel manually</strong> &mdash; the only durable fix with a smart home. Use WPA2 or transitional mode '
           'on 2.4&nbsp;GHz. Widen the DHCP pool: many ISP hubs ship with only 32&ndash;64 addresses, after which devices &ldquo;connect but have no '
           'internet&rdquo;.</td></tr>'
           '<tr><th>The printer keeps vanishing</th><td>Client isolation (on by default on most guest networks) breaking discovery; or it changed address after a '
           'power cut</td><td>Same network and subnet? Client isolation off? Then give the printer a fixed address reservation and add it by IP address rather than '
           'by automatic discovery.</td></tr>'
           '<tr><th>Everything slows when the neighbours get home</th><td>Either radio congestion or provider backhaul congestion &mdash; completely different '
           'fixes</td><td><strong>Run a wired test at 8&ndash;10pm.</strong> Still slow on the cable? It is the provider, and no WiFi change helps. Fine on the '
           'cable? Radio congestion: pick 1/6/11 manually at 20&nbsp;MHz and consider reducing transmit power.</td></tr>'
           '<tr><th>Buffering on one TV only</th><td>The TV&rsquo;s radio is usually the cheapest component in the set, and it is often in a wall unit</td><td>Check '
           'the TV&rsquo;s network screen for band and signal. Streaming needs far less than people think &mdash; if it has 25&nbsp;Mbps and still buffers, bandwidth '
           'is not the problem. Wire it, or add a streaming stick with a better radio.</td></tr>'
           '<tr><th>5&nbsp;GHz drops for a minute, 2.4&nbsp;GHz unaffected</th><td><strong>Radar detection &mdash; not a fault.</strong> Common near airports, ports '
           'and the coast</td><td>Confirm from the router log that radar was detected, then pin 5&nbsp;GHz to a non-radar channel, or drop from 160 to 80&nbsp;MHz so '
           'the radio is not forced into the radar range. <strong>Never defeat this in firmware &mdash; it is a legal condition of using the band.</strong></td></tr>'
           '<tr><th>Some sites load, others don&rsquo;t</th><td>Name resolution, not WiFi &mdash; especially if mobile data loads the same sites '
           'fine</td><td>Check whether the address resolves. Also check provider-level filtering and parental profiles before changing anything. Set the resolver on '
           'the <em>router</em>, not per device. On a business network, be careful &mdash; changing this can bypass required filtering.</td></tr>'
           '<tr><th>Port forwarding does nothing; console says Strict NAT</th><td>Double NAT, or carrier-grade NAT</td><td>Check the router&rsquo;s WAN address. A '
           'private address means self-inflicted double NAT &mdash; put the ISP hub in modem mode. An address in the 100.64.x.x range means carrier-grade NAT, and '
           '<strong>no local change fixes it</strong>: you need the provider to give you a public address, or an outbound-only remote-access product.</td></tr>'
           '<tr><th>&ldquo;The internet is down&rdquo;</th><td>The line, not the WiFi</td><td>Check the broadband light, the provider&rsquo;s status page, and a '
           'wired device. On copper, repeated resyncs get managed by the network and can permanently reduce your speed &mdash; fix the noise source rather than '
           'rebooting daily.</td></tr>'
           '</tbody></table></div>'},

  {'eyebrow': '/03 &mdash; INTERFERENCE',
   'h2': 'Interference: what actually matters in a UK home',
   'html': '<ul><li><strong>Microwave ovens</strong> leak around 2.45&nbsp;GHz, and the peak sits over 2.4&nbsp;GHz channels 9&ndash;11 &mdash; so channel 1 is the '
           'least affected. This is a genuine, measurable effect for the two minutes the oven runs.</li>'
           '<li><strong>Baby monitors:</strong> DECT models work around 1.9&nbsp;GHz and do <em>not</em> affect WiFi at all. The 2.4&nbsp;GHz frequency-hopping ones '
           'hop across the whole band and genuinely do. It is worth knowing which you have before blaming it.</li>'
           '<li><strong>Cheap analogue 2.4&nbsp;GHz cameras and video senders</strong> transmit continuously and are among the worst offenders in any house.</li>'
           '<li><strong>USB 3.0 ports, external drives and unshielded cables</strong> radiate broadband noise centred right in the 2.4&nbsp;GHz band. Move any '
           '2.4&nbsp;GHz hub or dongle away from them &mdash; this one surprises people.</li>'
           '<li><strong>Neighbouring networks</strong> are usually the dominant interferer in flats and terraces, and there is no setting that removes them.</li></ul>'
           '<p><strong>An honest limitation:</strong> a WiFi analyser app only shows you <em>networks</em>. If the noise floor is raised with no networks visible, the '
           'source is something that isn&rsquo;t WiFi &mdash; and proving what needs either a spectrum analyser or the patient business of switching suspects off one '
           'at a time.</p>'},

  {'eyebrow': '/04 &mdash; FREE TOOLS',
   'h2': 'The free diagnostic kit we actually use',
   'html': '<ul><li><strong>A UK-hosted speed test with a bufferbloat grade</strong> &mdash; run it wired, not over WiFi.</li>'
           '<li><strong>A broadband quality monitor</strong> that logs latency and loss over days. Evidence over a week is what gets a line fault taken seriously.</li>'
           '<li><strong>Windows:</strong> <code>netsh wlan show interfaces</code> for live band, channel and signal; <code>netsh wlan show wlanreport</code> for a '
           'full connection history; <code>ipconfig /flushdns</code> and <code>pathping</code>.</li>'
           '<li><strong>macOS:</strong> hold Option and click the WiFi icon for signal and noise; Wireless Diagnostics for a full scan.</li>'
           '<li><strong>The router&rsquo;s own event log</strong> &mdash; by far the most under-used tool in home networking. It tells you whether you lost the '
           'broadband or lost the WiFi, which is the whole question.</li>'
           '<li><strong>A 10&nbsp;m patch lead.</strong> Unglamorous, and it settles more arguments than any app.</li>'
           '<li>Our own free tools: the <a href="/wifi-signal-test/">365 WiFi Optimizer</a> for live signal quality, the '
           '<a href="/broadband-speed-checker/">broadband speed test</a>, and <a href="/is-it-down/">is it down?</a> to check whether a service is broken for everyone '
           'or just you.</li></ul>'},

  {'eyebrow': '/05 &mdash; WHEN IT IS THE LINE',
   'h2': 'When it is the line, not the WiFi',
   'html': '<p>This is the section that costs us work and we are writing it anyway.</p>'
           '<p><strong>If a wired test at the router shows 8&nbsp;Mbps down and 0.7&nbsp;Mbps up, no mesh, extender or powerline adapter changes that number.</strong> '
           'Not a better one. Not a more expensive one. The honest advice is to look at the package, the provider, or whether full fibre has reached your street '
           '&mdash; not at hardware.</p>'
           '<p><strong>Copper lines and stability management:</strong> if a line keeps resyncing, the network automatically makes it more stable and slower &mdash; '
           'interleaving adds a few milliseconds of latency, and banding typically drops the sync speed by 10&ndash;20% to buy reliability. Fix the noise source '
           'first, then ask the provider to reset it. Rebooting the router every day because it feels better is the fastest way to a permanently slower line.</p>'
           '<p><strong>Your right to leave, stated accurately:</strong> Ofcom&rsquo;s speed codes of practice let you exit &mdash; but only with providers signed up '
           'to them, only where speed falls below the <strong>minimum guaranteed</strong> figure (not the advertised average), and only where the fault is on the '
           'provider&rsquo;s network. In-home WiFi problems do not qualify, and anyone telling you otherwise is setting you up for a disappointing phone call.</p>'},
 ],
 'faqs': [
  {'q': 'Why is my WiFi slow at night but fine in the morning?',
   'a': 'Run a wired speed test at 8&ndash;10pm. If the wired test is also slow, it is congestion on your provider&rsquo;s network and no WiFi change will help &mdash; '
        'log wired tests at fixed times for a week before raising a fault. If the wired test is fine, it is radio congestion from neighbouring networks: set '
        '2.4&nbsp;GHz manually to channel 1, 6 or 11 at 20&nbsp;MHz, move 5&nbsp;GHz to a quieter channel, and consider reducing transmit power.'},
  {'q': 'Why does my 5GHz WiFi drop out for a minute at a time?',
   'a': 'Most likely radar detection. UK regulations require equipment on certain 5&nbsp;GHz channels to stop transmitting within 10 seconds of detecting radar and '
        'then avoid that channel for at least 30 minutes. It is not a fault. Confirm it in the router log, then pin 5&nbsp;GHz to a non-radar channel &mdash; '
        'especially near airports, ports and the coast, which covers much of Dorset.'},
  {'q': 'My video calls stutter but downloads are fast. Why?',
   'a': 'Almost always bufferbloat or a saturated upload rather than a lack of bandwidth. Start a large download and watch your ping: if idle latency of around '
        '15&nbsp;ms climbs to 250&nbsp;ms under load, that is the signature. Enable Smart Queue Management on the router with a shaper set slightly below your real '
        'line rate, and check whether cloud backup or file sync is quietly using all of your upload.'},
  {'q': 'How do I know if the problem is my WiFi or my broadband?',
   'a': 'Plug a laptop into the router with a cable and run a speed test in the same minute as a wireless test. If both are slow, it is the line or the provider. If '
        'the wired test is fast and the wireless one is not, it is the WiFi, and then it becomes a question of where in the house and on which band. This one test '
        'saves more wasted money than anything else on the page.'},
  {'q': 'Why do my smart plugs and cameras keep disconnecting?',
   'a': 'The most common cause is auto-channel selection quietly moving your 2.4&nbsp;GHz network under devices that do not cope well with it. Pin the 2.4&nbsp;GHz '
        'channel manually &mdash; that is the only durable fix in a smart home. Also check the address pool: many ISP hubs only hand out 32 to 64 addresses, and once '
        'exhausted devices appear connected but have no internet.'},
 ],
 'crossLinksHtml': '<p><strong>Related:</strong> <a href="/wifi-signal-test/">measure your signal live</a> &middot; '
                   '<a href="/mesh-wifi-systems-uk/">which mesh system to buy</a> &middot; '
                   '<a href="/mesh-wifi-setup-guide/">set it up properly</a> &middot; '
                   '<a href="/wifi-uk-buildings-heat/">walls, insulation and hot weather</a></p>'},

# ===========================================================================
# 4. BUSINESS WIFI
# ===========================================================================
{'slug': 'business-wifi-installation',
 'title': 'Business WiFi Installation Dorset: Real Costs | 365 Techies',
 'metaDesc': 'What business WiFi installation actually costs in Dorset and what a proper job includes &mdash; VLANs, fast roaming, captive portals, licence traps, '
             'PoE budgets and the cabling that costs more than the access points. Honest July 2026 pricing from a Bournemouth IT firm.',
 'ogTitle': 'Business WiFi in Dorset &mdash; What It Costs and What It Should Include | 365 Techies',
 'crumbName': 'Business WiFi Installation',
 'eyebrow': '// BUSINESS WIFI &middot; DORSET',
 'h1': 'Business WiFi that <em class="grad grad--cyan">actually holds up</em>',
 'lede': 'A three-pack off Amazon will cover a small office right up until the day it doesn&rsquo;t &mdash; the guest network isn&rsquo;t isolated, nobody can say '
         'whether it is patched, and the handhelds drop every time someone walks between rooms. This page explains what genuinely separates business WiFi from '
         'consumer mesh, what a proper installation includes, and what it really costs.',
 'chips': ['No licence traps', 'Cabling costed honestly', 'Certification in writing'],
 'primaryCta': ['Book a site survey', '/contact/'],
 'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
 'ctaHead': 'Want a straight quote for your premises?',
 'ctaSub': 'We survey first, design against measured coverage rather than a coverage map, and show you the cabling cost separately so you can see where the money '
           'goes. Offices, shops, cafes, holiday lets, care homes and practices across Bournemouth, Poole, Christchurch and Dorset.',
 'serviceName': 'Business WiFi survey, installation and support',
 'schemaKind': 'service',
 'sections': [

  {'eyebrow': '/01 &mdash; WHY NOT A THREE-PACK?',
   'h2': 'Six real differences between business WiFi and consumer mesh',
   'html': '<ol><li><strong>VLANs and genuine guest isolation.</strong> The big one. It is what keeps the guest network, the card terminals and the office network '
           'genuinely separate &mdash; and it is what your cyber-insurance questionnaire and any card-payment assessment will ask about.</li>'
           '<li><strong>Fast roaming (802.11k/v/r).</strong> Handover in milliseconds rather than a full re-authentication, which is the difference between a call '
           'surviving a walk down a corridor and not.</li>'
           '<li><strong>Captive portals and guest terms</strong> &mdash; a proper splash page, time limits and bandwidth caps.</li>'
           '<li><strong>Centralised firmware and configuration.</strong> This is how you answer &ldquo;are we patched?&rdquo; without visiting every ceiling.</li>'
           '<li><strong>The licence question</strong> &mdash; see below. It is the single biggest hidden cost in this market.</li>'
           '<li><strong>PoE cabling.</strong> One cable per access point carrying both data and power, which is why the cabling usually costs more than the '
           'hardware.</li></ol>'},

  {'eyebrow': '/02 &mdash; ROAMING, HONESTLY',
   'h2': 'Fast roaming, and what it can&rsquo;t do',
   'html': '<p>802.11k gives a device a list of neighbouring access points. 802.11v lets the network suggest it moves. 802.11r pre-authenticates so the handover takes '
           'milliseconds instead of a full re-authentication &mdash; roughly 200&ndash;300&nbsp;ms down to under 50.</p>'
           '<p>Two caveats worth having up front. First, <strong>802.11r upsets some older devices, printers and handheld scanners</strong>, so it is entirely normal '
           'to enable it on the staff and voice network and leave it off on a legacy one. Second, and more important: <strong>roaming is ultimately the device&rsquo;s '
           'decision.</strong> The network can advise; it cannot compel. Good placement with sensible overlap does more than any checkbox in the controller.</p>'},

  {'eyebrow': '/03 &mdash; LICENCES',
   'h2': 'The licence trap, platform by platform',
   'html': '<p>This is where budgets get ruined in year three. We are stating each of these only at the confidence we can actually support.</p>'
           '<ul><li><strong>Cisco Meraki (full)</strong> &mdash; a mandatory per-access-point licence. Devices stop passing traffic after the grace period. Budget the '
           'licence for the life of the estate, not just the boxes. <a href="/meraki-licence-expiry-what-happens/">What actually happens when a Meraki licence expires</a> &mdash; from their own documentation.</li>'
           '<li><strong>Meraki Go</strong> &mdash; confirmed no licensing or subscription fees. But <strong>Meraki Go is not Meraki</strong>: Cisco confirm the two '
           'cannot be managed together, so the upgrade path is rip-and-replace.</li>'
           '<li><strong>Netgear Insight</strong> &mdash; one year included on the WAX610, renewing after. The access point keeps working locally without a '
           'subscription; what lapses is the cloud management.</li>'
           '<li><strong>TP-Link Omada</strong> &mdash; the controller page states free cloud access with no licence fees. A paid tier exists.</li>'
           '<li><strong>Ubiquiti UniFi</strong> &mdash; widely understood to have no per-device subscription, and that matches our experience.</li>'
           '<li><strong>Cambium</strong> &mdash; cnMaestro Essentials is free in Cambium&rsquo;s own words. The X tier is a paid upgrade.</li>'
           '<li><strong>HPE Instant On, Ruckus and Zyxel Nebula</strong> &mdash; all market a free or no-licence tier, and we could not verify the details closely '
           'enough in July 2026 to publish specifics. Ask the supplier to put the licence position in writing.</li></ul>'
           '<p><strong>Ask any supplier one question:</strong> &ldquo;what stops working, and when, if I never pay you again?&rdquo; The answer tells you what you are '
           'really buying.</p>'},

  {'eyebrow': '/04 &mdash; POE AND CABLING',
   'h2': 'The bit that costs more than the access points',
   'html': '<p>Modern Wi-Fi 7 access points are hungry. A current tri-band unit draws around <strong>24&nbsp;W</strong> at maximum &mdash; so eight of them is about '
           '<strong>192&nbsp;W of PoE</strong> before you power a single phone or camera. A cheap eight-port switch with a 65&nbsp;W total budget will not run four '
           'of them. <strong>Check the switch&rsquo;s total power budget, not just its port count.</strong></p>'
           '<p>Almost no business access point includes a power injector in the box, which is a classic wasted-visit item on install day.</p>'
           '<p><strong>Cabling is the real cost.</strong> UK installers commonly quote from around &pound;65 per Cat6 data point, with &pound;75&ndash;&pound;120 '
           'typical on straightforward commercial work. Let us do the arithmetic in public for a six-access-point office:</p>'
           '<ul><li>Six mid-range access points: around &pound;510</li>'
           '<li>Six data points at &pound;65&ndash;&pound;120: &pound;390&ndash;&pound;720</li>'
           '<li>A 16-port PoE switch: around &pound;171</li>'
           '<li>A gateway with a proper firewall: around &pound;171</li></ul>'
           '<p>That is roughly &pound;850 of hardware and &pound;390&ndash;&pound;720 of cabling, plus survey, configuration, commissioning and labour. '
           '<strong>The access points are under 40% of the job. Any quote where the access points are most of the cost is a quote with no cabling in it.</strong></p>'
           '<p><em>Hardware figures above are from Ubiquiti&rsquo;s UK store in July 2026. Their pages do not state whether prices include VAT, so treat the basis as '
           'unstated &mdash; and note we are not VAT registered, so our own quotes carry no VAT.</em></p>'
           '<p>Costs that wreck budgets if nobody mentions them: containment and fire-stopping across compartment walls, working at height, out-of-hours working in '
           'retail and hospitality, making good after chasing, a comms cabinet and a protected mains spur, and a UPS.</p>'},

  {'eyebrow': '/05 &mdash; WIRED BEATS WIRELESS',
   'h2': 'Wired backhaul beats wireless mesh, always',
   'html': '<p>Every wireless hop roughly halves throughput. This is not our opinion &mdash; Ubiquiti&rsquo;s own guidance says mesh should supplement a wired '
           'network, recommends a maximum of two wireless hops, cites close to 50% loss per hop, and sets a target of at least &minus;60&nbsp;dBm back to the parent '
           'unit.</p>'
           '<p>Wireless mesh is legitimate for outbuildings, listed walls, marquees and temporary sites. It is a compromise you accept, not a design you choose.</p>'
           '<p><strong>Worth saying plainly: if a supplier proposes wireless mesh for a building where cable could be run, they are saving themselves labour at your '
           'expense.</strong></p>'
           '<p><strong>Placement:</strong> mount high, central, horizontal on the ceiling. Never above suspended-ceiling metal trays, inside metal cabinets, or behind '
           'foil-backed insulation. <strong>More modest access points placed well beat fewer expensive ones placed badly</strong> &mdash; every time, and it is '
           'usually cheaper too.</p>'},

  {'eyebrow': '/06 &mdash; WHAT A PROPER JOB INCLUDES',
   'h2': 'What professional installation should actually include',
   'html': '<ul><li>A <strong>predictive design from a floor plan</strong> plus a physical walk of the building &mdash; not a coverage map from a brochure.</li>'
           '<li>A <strong>post-install validation survey</strong> with measured coverage in the locations that matter, rather than a speed test in the room with the '
           'router in it.</li>'
           '<li><strong>Cabling certification in writing, per point.</strong> This is the single most commonly omitted item, and it is the one that proves the '
           'installation is sound.</li>'
           '<li><strong>Documented handover:</strong> network diagram, address scheme, VLAN and network-name list, credentials <em>handed to you</em>, a device '
           'inventory with serial numbers, and firmware versions.</li>'
           '<li>A guest network genuinely isolated from the internal one, sensible transmit power rather than everything at maximum, and a channel plan.</li></ul>'
           '<p><strong>What we exclude, and say so up front:</strong> making good decoration, any mains electrical work (that is an electrician&rsquo;s job), and '
           'improving a broadband line that is the real bottleneck.</p>'
           '<p><strong>A fair guarantee.</strong> We will commit to a minimum measured speed in named locations. We will not promise blanket &ldquo;whole-building '
           'coverage&rdquo;, because nobody can honestly deliver that &mdash; and note that the big providers have moved to exactly this per-room model '
           'themselves.</p>'
           '<p>If you capture email addresses on a guest portal, you are processing personal data and need a lawful basis, a privacy notice and a retention period. '
           'That is general information rather than legal advice, but it is worth raising before the portal goes live rather than after.</p>'},

  {'eyebrow': '/07 &mdash; SECOND-HAND KIT',
   'h2': 'Second-hand business kit: the risks nobody mentions',
   'html': '<ul><li><strong>Cloud-locked hardware is the biggest risk.</strong> Used kit still claimed to a previous owner&rsquo;s account cannot be added to yours. '
           'The only fix is the original owner releasing it &mdash; which requires them to still exist, still have the account, and still care.</li>'
           '<li><strong>End-of-life firmware is a security problem</strong>, not a feature problem. For any business handling card or personal data, an unpatched '
           'access point is a finding waiting to happen. Check the model against our <a href="/business-access-point-end-of-life/">access-point end-of-support tables</a> before you buy.</li>'
           '<li><strong>Controller lock-in:</strong> old units often only work with old controller software, which then blocks you from adopting anything new. <a href="/wifi-controller-end-of-life/">Why the controller is usually the real deadline</a>.</li>'
           '<li><strong>Regulatory domains differ by country</strong>, and the UK&rsquo;s 6&nbsp;GHz position moved as recently as July 2026. Buy UK stock from a UK '
           'supplier.</li>'
           '<li>No warranty and no support path &mdash; a refurbished unit that saves &pound;40 costs a site visit when it dies in month four.</li></ul>'
           '<p><strong>Where used kit is defensible:</strong> identical spares for a fleet you already run and that is still supported, lab gear, and non-cloud-managed '
           'switches. Even then, check the claim status and the firmware support date before money changes hands.</p>'},
 ],
 'faqs': [
  {'q': 'How much does business WiFi installation cost in the UK?',
   'a': 'For a small office or shop, roughly &pound;350&ndash;&pound;600 of hardware gets you a properly managed network with a gateway, a PoE switch and two access '
        'points &mdash; before cabling. A four-to-six access point installation across two floors is typically &pound;700&ndash;&pound;1,400 of hardware and '
        '&pound;1,500&ndash;&pound;3,000 all-in once cabling, survey and commissioning are included. UK data cabling commonly runs from &pound;65 per point. If the '
        'access points are most of the quote, the cabling has been left out.'},
  {'q': 'What is the difference between business WiFi and a consumer mesh system?',
   'a': 'Genuine guest isolation and VLANs, fast roaming standards so devices hand over cleanly, captive portals, centralised firmware management so you can prove '
        'you are patched, and PoE so one cable carries data and power. For a single-floor office of a handful of people, good consumer kit may genuinely be enough '
        '&mdash; and we will say so. It stops being enough the moment you need to separate guests from card payments or answer a security questionnaire.'},
  {'q': 'Do business access points need a subscription?',
   'a': 'It depends entirely on the platform, and it is the biggest hidden cost in this market. Full Cisco Meraki requires a mandatory per-access-point licence and '
        'devices stop passing traffic when it lapses. Meraki Go has no fees. Netgear Insight includes a year then renews. Ubiquiti UniFi and TP-Link Omada are '
        'generally licence-free. Always ask a supplier: what stops working, and when, if I never pay you again?'},
  {'q': 'Can I use mesh WiFi in my business instead of cabling?',
   'a': 'You can, but every wireless hop roughly halves throughput &mdash; Ubiquiti&rsquo;s own guidance cites close to 50% loss per hop and a two-hop maximum. '
        'Wireless mesh is a legitimate compromise for outbuildings, listed walls and temporary sites. If cable can be run and a supplier still proposes wireless '
        'mesh, they are saving themselves labour rather than saving you money.'},
  {'q': 'Do you install business WiFi in Bournemouth and Poole?',
   'a': 'Yes. We are a family-run IT firm based in Bournemouth, trading since 1995, and we cover Poole, Christchurch and the wider Dorset area &mdash; offices, '
        'shops, cafes, holiday lets, care homes and practices. We survey before quoting, show the cabling cost separately, and hand over full documentation and '
        'credentials at the end.'},
 ],
 'crossLinksHtml': '<p><strong>Related:</strong> <a href="/monthly-it-support/">monthly IT support for business</a> &middot; '
                   '<a href="/wifi-uk-buildings-heat/">building fabric and heat</a> &middot; '
                   '<a href="/mesh-wifi-setup-guide/">setup guide</a> &middot; '
                   '<a href="/wifi-troubleshooting/">fault-finding</a></p>'},

# ===========================================================================
# 5. UK BUILDINGS + HOT WEATHER
# ===========================================================================
{'slug': 'wifi-uk-buildings-heat',
 'title': 'Why UK Houses Kill WiFi: Walls, Insulation & Hot Weather | 365 Techies',
 'metaDesc': 'Measured signal loss through brick, concrete and low-E glass, what foil-backed insulation really does to WiFi, how many nodes UK housing needs &mdash; '
             'and why routers fail every July. Practical guidance for British housing stock from a Dorset IT firm.',
 'ogTitle': 'Why UK Houses Kill WiFi &mdash; Walls, Insulation and Hot Weather | 365 Techies',
 'crumbName': 'UK Buildings & Hot Weather',
 'eyebrow': '// BUILDING FABRIC &middot; HEAT',
 'h1': 'Why <em class="grad grad--cyan">British houses</em> are so hard on WiFi',
 'lede': 'Coverage claims are generated in open-plan, timber-framed, plasterboard buildings. British housing is solid brick, stone, party walls, concrete floors and '
         '&mdash; increasingly &mdash; foil-backed insulation and coated glass that behave like metal. This page explains what your walls actually cost you, and why '
         'a surprising number of &ldquo;broadband faults&rdquo; are simply a hot router in July.',
 'chips': ['Measured figures, sourced', 'Claims labelled as claims', 'Heat section included'],
 'primaryCta': ['Ask us about your property', '/contact/'],
 'secondaryCta': ['Measure your signal free', '/wifi-signal-test/'],
 'ctaHead': 'Old house, thick walls, or a garden office that never works?',
 'ctaSub': 'These are the jobs we enjoy most, and they are almost never solved by buying a bigger box. We survey, measure and tell you honestly what will and '
           'won&rsquo;t work &mdash; across Bournemouth, Poole, Christchurch and rural Dorset.',
 'serviceName': 'WiFi survey and design for difficult buildings',
 'schemaKind': 'service',
 'sections': [

  {'eyebrow': '/01 &mdash; HOW TO READ THE NUMBERS',
   'h2': 'What a decibel actually costs you',
   'html': '<p>Signal loss is measured in decibels, and decibels are logarithmic &mdash; which is why the numbers below are more brutal than they look.</p>'
           '<ul><li><strong>3&nbsp;dB halves the power.</strong> 10&nbsp;dB leaves you a tenth. 20&nbsp;dB leaves you a hundredth.</li>'
           '<li><strong>Every 6&nbsp;dB is equivalent to doubling the distance</strong> from the router. So a 30&nbsp;dB wall is roughly like moving the device '
           'thirty-two times further away.</li></ul>'
           '<p>There is <strong>no UK or EU standard test method</strong> behind the coverage figure on a box. The only meaningful design target is the signal at the '
           'device: the long-standing professional planning figure is <strong>&minus;67&nbsp;dBm at the edge of coverage</strong>, with 15&ndash;20% overlap between '
           'cells. Above about &minus;75&nbsp;dBm a device will connect but will not deliver anything like its rated speed &mdash; which is exactly the state that '
           'produces &ldquo;full bars and nothing works&rdquo;.</p>'
           '<p><strong>And frequency runs the wrong way for modern equipment:</strong> the same wall costs more decibels the higher the band. The 6&nbsp;GHz band on '
           'a Wi-Fi 6E or Wi-Fi 7 system is the <em>worst</em> of the three at getting through old British masonry, even though it is the fastest. This is why '
           'expensive new kit sometimes performs worse than the old router in a period property.</p>'
           '<p>Even the international standards bodies now acknowledge this: the ITU building-entry-loss model formally splits buildings into &ldquo;traditional&rdquo; '
           'and &ldquo;thermally efficient&rdquo; populations, and states that where modern thermally-efficient methods are used &mdash; metallised glass, foil-backed '
           'panels &mdash; the loss is significantly higher.</p>'},

  {'eyebrow': '/02 &mdash; MEASURED LOSS',
   'h2': 'What common materials actually cost',
   'html': '<p>These are laboratory specimens, not your wall &mdash; but they show the shape of the problem.</p>'
           '<div class="cmp-wrap"><table class="cmp-table"><thead><tr><th>Material</th><th>5&nbsp;GHz</th><th>6&nbsp;GHz</th></tr></thead><tbody>'
           '<tr><th>Reinforced concrete, 203&nbsp;mm</th><td>55&nbsp;dB</td><td>63&nbsp;dB</td></tr>'
           '<tr><th>Plain concrete, 203&nbsp;mm</th><td>48&nbsp;dB</td><td>54&nbsp;dB</td></tr>'
           '<tr><th>Concrete, 102&nbsp;mm</th><td>22&nbsp;dB</td><td>25&nbsp;dB</td></tr>'
           '<tr><th>Brick-faced concrete</th><td>41&nbsp;dB</td><td>48&nbsp;dB</td></tr>'
           '<tr><th>Brick-faced masonry block</th><td>32&nbsp;dB</td><td>43&nbsp;dB</td></tr>'
           '<tr><th>Brick <span class="mcard__claim">thickness not stated in source</span></th><td>15&nbsp;dB</td><td>15&nbsp;dB</td></tr>'
           '<tr><th>Masonry block</th><td>15&nbsp;dB</td><td>16&nbsp;dB</td></tr>'
           '<tr><th>Dry timber, 38&nbsp;mm</th><td>4&nbsp;dB</td><td>4&nbsp;dB</td></tr>'
           '<tr><th>Plain glass, 6&nbsp;mm</th><td>1&nbsp;dB</td><td>1&nbsp;dB</td></tr>'
           '</tbody></table></div>'
           '<p class="cmp-foot">Derived from published measured construction-material data. The source does not state specimen thickness for brick and block, so '
           '<strong>do not read &ldquo;brick = 15&nbsp;dB&rdquo; as applying to a 215&nbsp;mm Victorian solid wall</strong> &mdash; the real figure is several times '
           'higher. We have deliberately omitted a 2.4&nbsp;GHz column because we could not reconcile it with the source&rsquo;s stated method.</p>'
           '<p><strong>Modern glass is the standout, and almost nobody expects it.</strong> Plain glass costs about 1&nbsp;dB. Low-emissivity coated glass &mdash; '
           'effectively universal on replacement windows since the mid-2000s &mdash; has been measured at over 30&nbsp;dB. One comparison gives ordinary glass 1&nbsp;dB '
           'against low-E at 25&nbsp;dB at 3.5&nbsp;GHz. <strong>A modern coated window is worth 20&ndash;35&nbsp;dB.</strong> That is why your WiFi will not reach '
           'the conservatory, the patio or the garden office, and why the conservatory is frequently the worst-covered room in an otherwise efficient house.</p>'},

  {'eyebrow': '/03 &mdash; WALL BY WALL',
   'h2': 'British housing stock, wall by wall',
   'html': '<ul><li><strong>Solid-brick Victorian and Edwardian walls</strong> are typically 215&nbsp;mm or 328&nbsp;mm plus plaster. Plan on roughly '
           '30&ndash;40&nbsp;dB at 5&nbsp;GHz per wall &mdash; <em>an inference from the measured table above, not a measurement of that wall type</em>. Two of those '
           'and 5&nbsp;GHz is finished.</li>'
           '<li><strong>Party walls</strong> in terraces and semis: treat as opaque at 5 and 6&nbsp;GHz. Never plan on reaching through one.</li>'
           '<li><strong>Stone cottages</strong> &mdash; Purbeck and Portland limestone, granite, sandstone &mdash; commonly have 450&ndash;600&nbsp;mm rubble-filled '
           'walls. There is no clean measured dataset for random rubble stone, and we are not going to invent one. Rule of thumb: one access point per room cluster, '
           'wired from the start.</li>'
           '<li><strong>Flint and cob</strong>, typically 450&ndash;900&nbsp;mm, hold moisture &mdash; and water is the strongest absorber in this frequency range, '
           'so damp walls attenuate more than dry ones and vary with the season. No verified figure exists for cob.</li>'
           '<li><strong>Chimney breasts</strong> are solid masonry columns running the full height of the house. There is a permanent dead zone directly behind them '
           'on every floor. Move the node; turning the power up will not help.</li>'
           '<li><strong>Concrete floors</strong> &mdash; 1960s and 70s flats, beam-and-block, modern slabs: assume vertical coverage between floors does not work. '
           'Steel reinforcement mesh has a spacing far smaller than the wavelength, so it behaves as a solid conductive sheet.</li>'
           '<li><strong>Expanded metal lath</strong> in late-Victorian to post-war ceilings and partitions is effectively a Faraday screen per room. The giveaway '
           'symptom: signal dies at exactly the wall line with no gradient, and 2.4&nbsp;GHz behaves no better than 5&nbsp;GHz.</li>'
           '<li><strong>Extensions:</strong> the old external wall is now an internal wall &mdash; and it is still 215&nbsp;mm of solid brick. Treat it as an '
           'external wall when planning.</li></ul>'},

  {'eyebrow': '/04 &mdash; WHY NEW HOUSES CAN BE WORSE',
   'h2': 'Thermal upgrades: why a &ldquo;better&rdquo; house is often worse for WiFi',
   'html': '<p>This surprises people, and it is one of the most useful things on this page.</p>'
           '<ul><li><strong>Foil-backed plasterboard and foil-faced insulation</strong> present a continuous aluminium layer. Published figures vary so wildly that '
           'we will give you the mechanism rather than a number: it is a metal sheet, and radio does not go through metal sheets.</li>'
           '<li><strong>Loft insulation with a foil membrane</strong> caps the house horizontally.</li>'
           '<li><strong>Underfloor heating</strong> &mdash; the problem is the foil-faced board under the screed and any steel mesh, not the pipes. Assume no vertical '
           'coverage and put an access point on each floor.</li>'
           '<li><strong>Low-E glazing</strong> at 20&ndash;35&nbsp;dB, as above.</li></ul>'
           '<p><strong>The diagnostic question we always ask:</strong> did coverage get dramatically worse after new windows, external wall insulation, a loft '
           'conversion or underfloor heating? If so, the building fabric changed &mdash; not your broadband. People spend months arguing with their provider about '
           'this.</p>'
           '<p><strong>Never</strong> cut, pierce or remove foil-backed insulation, vapour barriers or coated glazing to improve signal. It breaches the thermal and '
           'vapour-control design, can cause condensation within the structure, and may breach building regulations. Move the antenna instead &mdash; it is cheaper '
           'and it is legal.</p>'},

  {'eyebrow': '/05 &mdash; HOW MANY ACCESS POINTS',
   'h2': 'Node counts, outbuildings and listed buildings',
   'html': '<p><strong>Rules of thumb &mdash; every one of these is a rule of thumb, not a measurement:</strong></p>'
           '<ul><li>Post-2000 timber-frame semi, around 80&ndash;100&nbsp;m&sup2;: router plus one node, wireless backhaul acceptable.</li>'
           '<li>1930s cavity-brick semi, around 100&nbsp;m&sup2;: router plus one or two.</li>'
           '<li>Victorian solid-brick terrace over three floors: one access point per floor, wired. The staircase is your only propagation path.</li>'
           '<li>Stone cottage with 450&nbsp;mm walls: one per one or two rooms, wired.</li>'
           '<li><strong>Anything with foil-backed board, metal lath, underfloor heating foil or concrete floors:</strong> per floor and per zone, wired, regardless '
           'of floor area.</li>'
           '<li>Bungalows have no vertical problem but a long horizontal run through a spine wall. One central unit often does a 1930s bungalow; a long 1960s one '
           'with masonry internal walls needs two, at opposite thirds.</li></ul>'
           '<p><strong>Keep 2.4&nbsp;GHz switched on in old housing stock.</strong> Do not let anyone talk you into disabling it &mdash; in a solid-wall house it is '
           'often the only band that reaches.</p>'
           '<p><strong>Garden offices and outbuildings.</strong> The path usually crosses at least one 215&ndash;330&nbsp;mm masonry wall <em>and</em> one low-E '
           'glazed unit &mdash; easily 50&ndash;70&nbsp;dB combined at 5&nbsp;GHz. This is a building-fabric problem, not a product problem, and no mesh system '
           'solves it. In order of preference: external-grade or direct-burial Cat6 in ducting to an access point in the outbuilding; fibre for long runs or '
           'lightning exposure; a point-to-point link with <strong>genuine external line of sight</strong> &mdash; mounting one on an internal windowsill pointing '
           'through coated glass throws away 20&ndash;35&nbsp;dB before it starts; or a separate mobile broadband service.</p>'
           '<p><strong>Garages</strong> are usually single-skin with a metal door acting as a reflector &mdash; the fix is a cabled access point inside, not a '
           'stronger signal from the house. <strong>Steel container offices</strong> are close to a sealed Faraday cage: the antenna has to be outside the metal '
           'skin, cabled through a gland.</p>'
           '<p><strong>A legal point that catches people out:</strong> a new electrical circuit supplying a detached outbuilding is notifiable under building '
           'regulations in England and Wales and needs a registered electrician or prior notification. <strong>Data cabling alone is not notifiable; power is.</strong> '
           'Any external Ethernet run also needs surge protection.</p>'
           '<p><strong>Listed buildings:</strong> the guidance is mitigation, minimisation and reversibility &mdash; route through existing voids and service routes, '
           'and use skirtings and mouldings as concealed paths. Upgrading wiring does not automatically require consent, but cutting into original plasterwork, '
           'stonework or beams alters the fabric and can. <strong>Speak to the local conservation officer first: unauthorised works to a listed building are a '
           'criminal offence.</strong> Anyone who tells you cabling &ldquo;never&rdquo; needs consent is not someone to take advice from.</p>'},

  {'eyebrow': '/06 &mdash; HOT WEATHER',
   'h2': 'Why your WiFi gets worse every July',
   'html': '<p>Every summer we take calls that follow the same pattern: fine in the morning, degrading through the afternoon, better overnight, router hot to the '
           'touch, and &ldquo;it fixes itself if I turn it off for ten minutes&rdquo;. <strong>A genuine line fault does not follow the sun.</strong></p>'
           '<p>Three separate things are happening, and it is worth separating them:</p>'
           '<ol><li><strong>Thermal throttling</strong> &mdash; the processor slows down or the radio reduces its transmit power. Throughput drops and range '
           'shrinks.</li>'
           '<li><strong>Instability</strong> &mdash; watchdog resets, spontaneous reboots, dropped connections.</li>'
           '<li><strong>Permanent life reduction</strong> &mdash; and this is the one nobody mentions. Heat ages the power supply long before it kills the '
           'chipset.</li></ol>'
           '<p><strong>The arithmetic on that last point:</strong> electrolytic capacitor life roughly doubles for every 10&nbsp;&deg;C cooler you run. A component '
           'rated 5,000 hours at 105&nbsp;&deg;C lasts 20,000 at 85&nbsp;&deg;C. <strong>A router run 15&nbsp;&deg;C hotter than it needs to be fails in year three '
           'instead of year six.</strong> Battery backup kit is worse still &mdash; life roughly halves for every 10&nbsp;&deg;C above 25&nbsp;&deg;C, against a '
           'three-to-five year design life. A UPS in a hot airing cupboard is a consumable.</p>'
           '<p><strong>Ratings versus real UK conditions.</strong> Consumer mesh is typically rated <strong>0&ndash;40&nbsp;&deg;C</strong> &mdash; we have verified '
           'that on TP-Link&rsquo;s own UK page for the Deco X50. Forty degrees is the ceiling, not a comfortable operating point. Meanwhile a UK loft in a heatwave '
           'is far outside all of it: trade sources put loft air at 40&ndash;50&nbsp;&deg;C routinely, a roof-ventilation case study records 60&nbsp;&deg;C while '
           'outside air was 35&nbsp;&deg;C, and roof undersides reach 70&ndash;80&nbsp;&deg;C. <em>Those are trade and case-study figures rather than a controlled '
           'national study &mdash; but the direction is not in doubt.</em> Conservatories and glazed garden rooms are the second worst location.</p>'},

  {'eyebrow': '/07 &mdash; PLACEMENT & COOLING',
   'h2': 'Where equipment fails in summer, and what to do',
   'html': '<p><strong>The placements that cause summer faults:</strong> airing and meter cupboards (no ventilation, plus a hot cylinder); sunlit windowsills; on top '
           'of or underneath a TV, set-top box, console, amplifier or NAS; sealed AV cabinets with a glass door and no rear cut-out; equipment stacked so each unit '
           'blocks the next one&rsquo;s vents; soft surfaces &mdash; TP-Link&rsquo;s own guidance says not to place units on paper, cloth or fabric, and carpet is a '
           'common offender; dust blanketing the heatsinks; and anything active left in a loft.</p>'
           '<p><strong>Are fans and cooling pads sensible, or snake oil?</strong> Genuinely useful, with a caveat. A cheap cooling pad or small fan blowing across '
           'the case does increase heat transfer from a passively-cooled device, and they cost around &pound;10&ndash;&pound;20. <strong>But it is second best.</strong> '
           'Moving the device out of the cupboard, off the sofa, out of the sun or off the top of the television is free, permanent, and does more. Fix the placement '
           'first, and use a fan only where the cabinet genuinely cannot be relocated.</p>'
           '<p><strong>Snake oil:</strong> &ldquo;signal-boosting&rdquo; heatsinks and stick-on cooling accessories sold on the basis that they improve throughput. '
           'Cooling restores performance that heat took away. It does not add performance the device never had.</p>'
           '<div class="callout"><p><strong>Never</strong> pour water over equipment, put it in a fridge or freezer, or use a freezer block or damp cloth. '
           'Condensation on live electronics is an electric shock and fire risk. There is no safe &ldquo;just be careful&rdquo; version of this &mdash; don&rsquo;t '
           'do it. Equally, never cover equipment, run it under blankets or cushions, or seal it in an unventilated cabinet.</p></div>'
           '<p><strong>The UK-specific one that costs people permanently:</strong> on copper and FTTC lines, avoid repeatedly power-cycling the router. Repeated '
           'resyncs are read as line instability and can leave you on a <em>permanently</em> lower speed. You can genuinely slow your own line for good by rebooting '
           'it every hot afternoon.</p>'
           '<p><strong>For businesses:</strong> PoE delivers up to 60&nbsp;W or 90&nbsp;W per port on modern standards, and the losses show up as heat in the copper. '
           'Industry guidance recommends keeping the temperature rise from power delivery to 15&nbsp;&deg;C above ambient, leaving cables unbundled where possible, '
           'and limiting bundles where not. <strong>Do not coil surplus PoE cable</strong> &mdash; cut it to length. And remember a switch with a 150&nbsp;W power '
           'budget in a sealed cupboard is a 150&nbsp;W heater.</p>'
           '<p><strong>One thing that is <em>not</em> happening:</strong> heat does not meaningfully weaken the radio signal over household distances. The failure is '
           'in the electronics, not the propagation. Worth knowing before you spend an afternoon on the phone to your provider.</p>'},
 ],
 'faqs': [
  {'q': 'Does mesh WiFi work through thick brick walls and foil insulation?',
   'a': 'Mesh doesn&rsquo;t punch through solid brick or foil-backed board &mdash; nothing consumer does. What it changes is the route: several modest radios placed so the signal hops through doorways and along hallways rather than through masonry. That&rsquo;s why node placement beats node power in British housing, and why the honest answer for foil-heavy or 450&nbsp;mm-stone properties is wired backhaul between nodes, or one access point per floor on a cable.'},
    {'q': 'Why won&rsquo;t my WiFi go through my walls?',
   'a': 'Because British walls are mostly masonry. A 215&nbsp;mm Victorian solid brick wall can cost roughly 30&ndash;40&nbsp;dB at 5&nbsp;GHz, and since every '
        '6&nbsp;dB is equivalent to doubling the distance from the router, one wall can be like moving thirty times further away. Party walls and chimney breasts '
        'should be treated as opaque. The fix is another access point on the far side, ideally on a cable &mdash; not a more powerful router, because transmit power '
        'is capped by law.'},
  {'q': 'Does foil-backed insulation block WiFi?',
   'a': 'Yes, substantially. Foil-backed plasterboard, foil-faced insulation board, foil loft membranes and the foil layer under underfloor heating all present a '
        'continuous metal layer, and radio does not pass through metal sheets. This is why some modern or recently-upgraded homes have far worse coverage than older '
        'ones. Never cut or pierce it to improve signal &mdash; move the access point instead.'},
  {'q': 'Why is my WiFi bad in my conservatory or garden office?',
   'a': 'Low-emissivity coated glass, standard on replacement windows since the mid-2000s, has been measured at over 30&nbsp;dB of loss against about 1&nbsp;dB for '
        'plain glass. Combined with a masonry wall, the path to a garden office can easily cost 50&ndash;70&nbsp;dB. No mesh system solves this. The reliable answer '
        'is external-grade Cat6 in ducting, or a point-to-point link with genuine outdoor line of sight &mdash; pointing one through a coated window throws most of '
        'the signal away.'},
  {'q': 'Can hot weather affect my WiFi?',
   'a': 'Yes, but not the way people assume. Heat does not weaken the radio signal over household distances &mdash; it degrades the equipment. Consumer mesh is '
        'typically rated to 40&nbsp;&deg;C, and equipment throttles, becomes unstable or reboots above that. The classic pattern is fine in the morning, worse '
        'through the afternoon, fine again overnight, with the router hot to the touch. A genuine line fault does not follow the sun.'},
  {'q': 'Is it safe to put a router in the loft?',
   'a': 'It is a poor idea in the UK. Trade sources put loft air at 40&ndash;50&nbsp;&deg;C routinely in summer, with roof undersides at 70&ndash;80&nbsp;&deg;C '
        '&mdash; well beyond the 0&ndash;40&nbsp;&deg;C rating typical of consumer equipment. Heat also shortens the life of the power supply dramatically: running '
        '15&nbsp;&deg;C hotter than necessary can roughly halve how long it lasts. If equipment must live in a loft, it should be rated for it and ventilated.'},
  {'q': 'How many WiFi access points does a Victorian house need?',
   'a': 'As a rule of thumb, one per floor in a three-storey solid-brick terrace, wired together, because the staircase is effectively the only path signal can take. '
        'A stone cottage with 450&nbsp;mm walls needs roughly one per one or two rooms. Floor area matters far less than construction &mdash; which is exactly what '
        'the coverage figure on the box ignores.'},
 ],
 'crossLinksHtml': '<p><strong>Related:</strong> <a href="/mesh-wifi-systems-uk/">which mesh system to buy</a> &middot; '
                   '<a href="/mesh-wifi-setup-guide/">setup guide</a> &middot; '
                   '<a href="/wifi-troubleshooting/">fault-finding</a> &middot; '
                   '<a href="/business-wifi-installation/">business WiFi</a> &middot; '
                   '<a href="/rural-and-farm-wifi-dorset/">rural and hard-to-reach WiFi</a></p>'},
]

