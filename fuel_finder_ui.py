"""
The fuel finder's markup and styling, shared by /fuel-prices/ (fuel_prices_page.py: the whole UK first) and
/bournemouth/fuel-prices/ (bournemouth_fuel_page.py: Bournemouth first). Owner, 4 Oct 2026: "do both pages ... one
focused on Bournemouth ... up to 100 miles ... or the whole UK ... the 365 techies one ... for the whole of the UK
straight away ... user friendly and mobile phone friendly ... animated as much as we can".

Behaviour lives in js/fuel-finder.js; data in api/bm-fuel.php (api/bm-fuel-lib.php). Bump JS_V when the script changes
(the URL is the cache key).

ANIMATION, and its off switch: prices count up, results slide in one after another, map pins drop, the nation bars grow
as they scroll into view, the location button pulses while it searches, and a skeleton shimmers while prices load.
A device set to reduce motion gets none of it (CSS below + the script checks the same setting).
"""

JS_V = "9"

import html as _html
import json as _json

# ONE list of vehicles, read by the page script (data-vehicles) AND by the server render (api/bm-fuel-ssr.php reads the
# same attribute out of the built page). Owner, 4 Oct: "small car ... family car ... van ... could you also have lorry
# or HGV ... expand that ... as a proper tool". Typical tanks, said as "about" on the page: motorbikes 12-20 L, small
# hatchbacks 40-45, family hatchbacks 50-55, SUVs and big estates 60-70, Transit/Crafter vans 75-80, motorhomes on a
# Ducato base 75-90, 7.5-tonne lorries 150-200, 44-tonne artic tractor units 400-680 (twin tanks to 1,000+).
# fuel: "petrol" | "diesel" | "any" - a lorry is never shown an unleaded bill, a motorbike never a diesel one.
VEHICLES = [
    {"k": "moto", "name": "Motorbike", "say": "a motorbike", "l": 15, "fuel": "petrol"},
    {"k": "small", "name": "Small car", "say": "a small car", "l": 40, "fuel": "any"},
    {"k": "family", "name": "Family car", "say": "a family car", "l": 55, "fuel": "any"},
    {"k": "suv", "name": "SUV / estate", "say": "an SUV or estate", "l": 70, "fuel": "any"},
    {"k": "van", "name": "Van", "say": "a van", "l": 80, "fuel": "any"},
    {"k": "motorhome", "name": "Motorhome", "say": "a motorhome", "l": 90, "fuel": "any"},
    {"k": "lorry", "name": "7.5-tonne lorry", "say": "a 7.5-tonne lorry", "l": 150, "fuel": "diesel"},
    {"k": "hgv", "name": "44-tonne HGV", "say": "an HGV", "l": 500, "fuel": "diesel"},
]

# Postcode areas by name, for "cheapest and dearest areas" (script AND server read data-areas, as above).
AREAS = {"AB": "Aberdeen", "AL": "St Albans", "B": "Birmingham", "BA": "Bath", "BB": "Blackburn", "BD": "Bradford", "BH": "Bournemouth",
    "BL": "Bolton", "BN": "Brighton", "BR": "Bromley", "BS": "Bristol", "BT": "Belfast", "CA": "Carlisle", "CB": "Cambridge", "CF": "Cardiff",
    "CH": "Chester", "CM": "Chelmsford", "CO": "Colchester", "CR": "Croydon", "CT": "Canterbury", "CV": "Coventry", "CW": "Crewe", "DA": "Dartford",
    "DD": "Dundee", "DE": "Derby", "DG": "Dumfries", "DH": "Durham", "DL": "Darlington", "DN": "Doncaster", "DT": "Dorchester", "DY": "Dudley",
    "E": "East London", "EC": "Central London", "EH": "Edinburgh", "EN": "Enfield", "EX": "Exeter", "FK": "Falkirk", "FY": "Blackpool",
    "G": "Glasgow", "GL": "Gloucester", "GU": "Guildford", "HA": "Harrow", "HD": "Huddersfield", "HG": "Harrogate", "HP": "Hemel Hempstead",
    "HR": "Hereford", "HS": "Outer Hebrides", "HU": "Hull", "HX": "Halifax", "IG": "Ilford", "IP": "Ipswich", "IV": "Inverness", "KA": "Kilmarnock",
    "KT": "Kingston upon Thames", "KW": "Kirkwall", "KY": "Kirkcaldy", "L": "Liverpool", "LA": "Lancaster", "LD": "Llandrindod Wells",
    "LE": "Leicester", "LL": "Llandudno", "LN": "Lincoln", "LS": "Leeds", "LU": "Luton", "M": "Manchester", "ME": "Medway", "MK": "Milton Keynes",
    "ML": "Motherwell", "N": "North London", "NE": "Newcastle", "NG": "Nottingham", "NN": "Northampton", "NP": "Newport", "NR": "Norwich",
    "NW": "North West London", "OL": "Oldham", "OX": "Oxford", "PA": "Paisley", "PE": "Peterborough", "PH": "Perth", "PL": "Plymouth",
    "PO": "Portsmouth", "PR": "Preston", "RG": "Reading", "RH": "Redhill", "RM": "Romford", "S": "Sheffield", "SA": "Swansea",
    "SE": "South East London", "SG": "Stevenage", "SK": "Stockport", "SL": "Slough", "SM": "Sutton", "SN": "Swindon", "SO": "Southampton",
    "SP": "Salisbury", "SR": "Sunderland", "SS": "Southend", "ST": "Stoke-on-Trent", "SW": "South West London", "SY": "Shrewsbury",
    "TA": "Taunton", "TD": "Galashiels", "TF": "Telford", "TN": "Tonbridge", "TQ": "Torquay", "TR": "Truro", "TS": "Teesside", "TW": "Twickenham",
    "UB": "Southall", "W": "West London", "WA": "Warrington", "WC": "Central London", "WD": "Watford", "WF": "Wakefield", "WN": "Wigan",
    "WR": "Worcester", "WS": "Walsall", "WV": "Wolverhampton", "YO": "York", "ZE": "Shetland"}


def _attr_json(v):
    return _html.escape(_json.dumps(v, separators=(",", ":")), quote=True)

# Home-screen identity (owner 4 Oct: "share ... and add it to their phone ... so they can find it easily"). Icons drawn by
# the 4 Oct scratchpad make_fuel_icons.py: a teal pump on dark navy. ⚠ Never overwrite one in place (images are cached a
# year): draw a -v2. Each page has its own app.webmanifest (its own name and scope).
TOUCH_ICON = "/images/fuel-icon-180-v1.png"


def app_head(short_name):
    """What iPhones call the page on the home screen (they read this before the manifest), and the bar colour."""
    return (f'\n  <meta name="apple-mobile-web-app-title" content="{short_name}" />'
            '\n  <meta name="theme-color" content="#0a1420" />')

_SHARE_SVG = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" '
              'stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/>'
              '<path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>')
_ADD_SVG = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" '
            'aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/></svg>')

HEAD = '''
  <link rel="stylesheet" href="/vendor/leaflet/leaflet.css" />
  <style>
    .ff{--ff-deep:#0a1420;--ff-water:#10202f;--ff-line:#1d3346;--ff-foam:#e8f1f2;--ff-mute:#8ea3b5;--ff-surf:#4fd8c4;--ff-dusk:#ffb066;--ff-ink:#04121a}
    .ff-sec .wrap{max-width:1120px}
    .ff-controls{display:grid;gap:.75rem;margin:0 0 1rem}
    .ff-fuels{display:flex;flex-wrap:wrap;gap:.5rem}
    .ff-fuels button{min-height:46px;padding:.55rem 1.05rem;border-radius:999px;border:1px solid var(--ff-line);background:var(--ff-water);color:var(--ff-foam);font:inherit;font-size:.98rem;cursor:pointer;transition:background .25s,border-color .25s,color .25s,transform .15s}
    .ff-fuels button:active{transform:scale(.96)}
    .ff-fuels button[aria-pressed="true"]{background:var(--ff-surf);border-color:var(--ff-surf);color:var(--ff-ink);font-weight:700;box-shadow:0 6px 18px -8px rgba(79,216,196,.7)}
    .ff-where{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
    .ff-where button,.ff-where input,.ff-where select{min-height:46px;border-radius:12px;border:1px solid var(--ff-line);background:var(--ff-water);color:var(--ff-foam);font:inherit;font-size:1rem;padding:.5rem .85rem}
    .ff-where button{cursor:pointer}
    .ff-gps{background:var(--ff-surf)!important;border-color:var(--ff-surf)!important;color:var(--ff-ink)!important;font-weight:700;display:inline-flex;align-items:center;gap:.45rem}
    .ff-gps::before{content:"";width:12px;height:12px;border-radius:50%;background:var(--ff-ink);box-shadow:0 0 0 3px rgba(4,18,26,.25)}
    .ff-gps.busy{animation:ffPulse 1s ease-out infinite}
    .ff-where form{display:flex;gap:.4rem;flex:1 1 15rem;min-width:0}
    .ff-where input{flex:1 1 auto;min-width:0;text-transform:uppercase}
    .ff-where input::placeholder{text-transform:none;color:var(--ff-mute)}
    .ff-status{color:var(--ff-mute);font-size:.96rem;margin:.15rem 0 0;min-height:1.4em}
    .ff-status b{color:var(--ff-foam)}
    .ff-banner{border:1px solid var(--ff-dusk);background:rgba(255,176,102,.08);border-radius:12px;padding:.75rem 1rem;margin:0 0 1rem;font-size:.92rem;line-height:1.5}
    .ff-banner b{color:var(--ff-dusk)}
    .ff-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.65rem;margin:0 0 1.1rem}
    .ff-tile{position:relative;overflow:hidden;background:var(--ff-water);border:1px solid var(--ff-line);border-radius:16px;padding:.85rem 1rem}
    .ff-tile::before{content:"";position:absolute;inset:0 auto auto 0;width:100%;height:3px;background:linear-gradient(90deg,var(--ff-surf),transparent 70%)}
    .ff-tile.ff-t3::before{background:linear-gradient(90deg,var(--ff-dusk),transparent 70%)}
    .ff-tl{margin:0;color:var(--ff-mute);font-size:.86rem;line-height:1.35}
    .ff-num{margin:.2rem 0;font-size:clamp(1.9rem,6.5vw,2.7rem);font-weight:800;line-height:1.05;color:var(--ff-foam);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
    .ff-num small{font-size:.45em;font-weight:600;color:var(--ff-mute);margin-left:.1em}
    .ff-ts{margin:0;color:var(--ff-mute);font-size:.84rem;line-height:1.4}
    .ff-ts b{color:var(--ff-foam)}
    .ff-t3.nofit .ff-cur{display:none}
    .ff-veh{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;margin:.65rem 0 0}
    .ff-veh select{flex:1 1 12rem;min-height:44px;border-radius:12px;border:1px solid var(--ff-dusk);background:rgba(255,176,102,.08);color:var(--ff-foam);font:inherit;font-size:.95rem;padding:.45rem .7rem}
    .ff-veh select option{background:#0e1d2c;color:var(--ff-foam)}
    .ff-own{display:inline-flex;align-items:center;gap:.4rem;color:var(--ff-mute);font-size:.9rem}
    .ff-own[hidden]{display:none}
    .ff-own input{width:6.5rem;min-height:44px;border-radius:12px;border:1px solid var(--ff-line);background:var(--ff-water);color:var(--ff-foam);font:inherit;font-size:1rem;padding:.4rem .6rem}
    .ff-tablewrap{overflow-x:auto;border:1px solid var(--ff-line);border-radius:16px;background:var(--ff-water)}
    .ff-table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:.95rem}
    .ff-table th,.ff-table td{padding:.6rem .8rem;border-bottom:1px solid var(--ff-line);text-align:left;vertical-align:top}
    .ff-table tbody tr:last-child td,.ff-table tbody tr:last-child th{border-bottom:0}
    .ff-table thead th{font-family:var(--mono,ui-monospace,monospace);font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--ff-mute);font-weight:600}
    .ff-table td small,.ff-table th small{display:block;color:var(--ff-mute);font-size:.78rem;font-weight:400}
    .ff-table tbody th{font-weight:600;color:var(--ff-foam)}
    .ff-table .ff-na{color:var(--ff-mute)}
    .ff-table tr.mine th,.ff-table tr.mine td{background:rgba(255,176,102,.07)}
    .ff-today h2{margin-top:0}
    .ff-today h3{font-size:1.05rem;margin:1.4rem 0 .6rem}
    .ff-today p{max-width:72ch}
    .ff-twocol{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem}
    .ff-stamp{font-family:var(--mono,ui-monospace,monospace);font-size:.8rem;color:var(--ff-mute)}
    @media (max-width:600px){.ff-t3{grid-column:1 / -1}}
    .ff-chip{display:inline-block;padding:.15rem .55rem;border-radius:999px;border:1px solid var(--ff-line);font-size:.8rem;color:var(--ff-foam)}
    .ff-chip.ff-good{border-color:var(--ff-surf);color:var(--ff-surf)}
    .ff-chip.ff-bad{border-color:var(--ff-dusk);color:var(--ff-dusk)}
    .ff-pop{animation:ffPop .5s cubic-bezier(.2,.7,.2,1) both}
    .ff-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:1rem;align-items:start}
    @media (max-width:860px){.ff-grid{grid-template-columns:minmax(0,1fr)}}
    .ff-list,.ff-top,.ff-areas{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}
    .ff-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.15rem .8rem;align-items:center;padding:.7rem .85rem;border:1px solid var(--ff-line);border-radius:14px;background:var(--ff-water);cursor:pointer;animation:ffIn .45s cubic-bezier(.2,.7,.2,1) both;transition:border-color .2s,transform .2s}
    .ff-item:hover,.ff-item:focus-visible{border-color:var(--ff-surf);outline:none;transform:translateY(-1px)}
    .ff-item.best{border-color:var(--ff-surf);box-shadow:inset 3px 0 0 var(--ff-surf),0 10px 28px -18px rgba(79,216,196,.8)}
    .ff-rank{font-family:var(--mono,ui-monospace,monospace);color:var(--ff-mute);font-size:.8rem;width:1.6rem;text-align:center}
    .ff-name{font-weight:700;color:var(--ff-foam);overflow-wrap:anywhere}
    .ff-name small{display:block;font-weight:400;color:var(--ff-mute);font-size:.82rem}
    .ff-addr{color:var(--ff-mute);font-size:.86rem;grid-column:2;overflow-wrap:anywhere}
    .ff-price{font-size:1.35rem;font-weight:800;color:var(--ff-foam);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
    .ff-item.best .ff-price{color:var(--ff-surf)}
    .ff-price small{display:block;font-size:.72rem;font-weight:500;color:var(--ff-mute);letter-spacing:0}
    .ff-meta{grid-column:3;text-align:right;color:var(--ff-mute);font-size:.82rem;white-space:nowrap}
    .ff-dir{grid-column:2 / 4;font-size:.9rem}
    .ff-dir a{color:var(--ff-surf);display:inline-block;padding:.2rem 0}
    .ff-more button{width:100%;min-height:46px;border-radius:12px;border:1px dashed var(--ff-line);background:transparent;color:var(--ff-foam);font:inherit;cursor:pointer}
    .ff-empty{color:var(--ff-mute);padding:1rem;border:1px dashed var(--ff-line);border-radius:14px}
    .ff-skel{display:grid;gap:.45rem;padding:.9rem;border:1px solid var(--ff-line);border-radius:14px;background:var(--ff-water)}
    .ff-skel i{display:block;height:13px;border-radius:6px;background:linear-gradient(90deg,var(--ff-water) 0%,#1a3048 50%,var(--ff-water) 100%);background-size:200% 100%;animation:ffShim 1.2s linear infinite}
    .ff-skel i+i{width:60%}
    .ff-mapwrap{position:sticky;top:5rem}
    #ff-map{height:min(70vh,580px);border-radius:16px;border:1px solid var(--ff-line);background:var(--ff-deep)}
    @media (max-width:860px){.ff-mapwrap{position:static}#ff-map{height:55vh}}
    .ff-pin span{display:inline-block;transform:translate(-50%,-100%);background:var(--ff-water);color:var(--ff-foam);border:1px solid var(--ff-line);border-radius:8px;padding:2px 6px;font:700 12px/1.3 system-ui,sans-serif;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,.45);animation:ffDrop .55s cubic-bezier(.3,1.3,.5,1) both}
    .ff-pin.best span{background:var(--ff-surf);color:var(--ff-ink);border-color:var(--ff-surf)}
    .ff-me{width:16px;height:16px;border-radius:50%;background:#4ea1ff;border:3px solid #fff;box-shadow:0 0 0 2px rgba(78,161,255,.5);animation:ffPulseBlue 1.6s ease-out infinite}
    .ff-note{color:var(--ff-mute);font-size:.86rem;line-height:1.55;margin:1rem 0 0}
    .ff-note a{color:var(--ff-surf)}
    .ff-myarea{background:var(--ff-water);border:1px solid var(--ff-surf);border-radius:14px;padding:.75rem 1rem;margin:0 0 1rem;color:var(--ff-foam)}
    .ff-uk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:.9rem}
    .ff-card{background:var(--ff-water);border:1px solid var(--ff-line);border-radius:16px;padding:1rem 1.1rem}
    .ff-card h3{margin:0 0 .7rem;font-size:1.02rem;color:var(--ff-foam)}
    .ff-wide{grid-column:1 / -1}
    .ff-bars{display:grid;gap:.6rem}
    .ff-bar{display:grid;grid-template-columns:7.5rem minmax(0,1fr) auto;gap:.6rem;align-items:center;font-size:.92rem}
    .ff-bar.mine .ff-bl{color:var(--ff-surf);font-weight:700}
    .ff-bl{color:var(--ff-foam)}
    .ff-bt{position:relative;height:14px;background:#0b1825;border-radius:7px;overflow:hidden}
    .ff-bt::after{content:"";position:absolute;left:50%;top:-2px;bottom:-2px;width:2px;margin-left:-1px;background:var(--ff-mute);opacity:.7}
    .ff-bt i{position:absolute;top:0;bottom:0;width:0;transition:width 1.1s cubic-bezier(.2,.7,.2,1)}
    .ff-bt i.neg{right:50%;border-radius:7px 0 0 7px;background:linear-gradient(270deg,var(--ff-surf),#8be9dc)}
    .ff-bt i.pos{left:50%;border-radius:0 7px 7px 0;background:linear-gradient(90deg,var(--ff-dusk),#ffd3a8)}
    .ff-bv{font-variant-numeric:tabular-nums;font-weight:700;color:var(--ff-foam);text-align:right;line-height:1.15}
    .ff-bv small{display:block;font-weight:400;font-size:.74rem;color:var(--ff-mute)}
    .ff-areas li{display:flex;justify-content:space-between;gap:.6rem;padding:.4rem 0;border-bottom:1px solid var(--ff-line);font-size:.93rem;color:var(--ff-foam)}
    .ff-areas li:last-child{border-bottom:0}
    .ff-top{grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
    .ff-top li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.15rem .7rem;align-items:center;padding:.6rem .75rem;border:1px solid var(--ff-line);border-radius:12px;cursor:pointer;transition:border-color .2s}
    .ff-top li:hover,.ff-top li:focus-visible{border-color:var(--ff-surf);outline:none}
    .ff-top .ff-price{font-size:1.1rem}
    .leaflet-popup-content{font:14px/1.45 system-ui,sans-serif}
    @media (max-width:430px){
      .ff-fuels{display:grid;grid-template-columns:1fr 1fr}
      .ff-gps{width:100%;justify-content:center}
      .ff-where select{width:100%}
      .ff-bar{grid-template-columns:6.2rem minmax(0,1fr) auto}
    }
    .ff-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 1rem}
    .ff-pill{display:inline-flex;align-items:center;gap:.45rem;min-height:44px;padding:0 1.05rem;border-radius:999px;border:1px solid rgba(79,216,196,.5);background:rgba(79,216,196,.08);color:var(--ff-foam);font:inherit;font-size:.92rem;font-weight:600;cursor:pointer;transition:background .2s,transform .15s}
    .ff-pill:hover{background:rgba(79,216,196,.16)}
    .ff-pill:active{transform:scale(.97)}
    .ff-pill svg{width:18px;height:18px}
    .ff-pill--add{border-color:rgba(255,176,102,.55);background:rgba(255,176,102,.08)}
    .ff-pill--add:hover{background:rgba(255,176,102,.16)}
    .ff-sheet{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:1310;max-width:540px;margin:0 auto;display:grid;grid-template-columns:auto minmax(0,1fr);gap:.8rem;align-items:start;padding:1rem 2.6rem 1rem 1rem;border-radius:18px;border:1px solid var(--ff-line);background:#0e1d2c;color:var(--ff-foam);box-shadow:0 18px 50px rgba(0,0,0,.55);transform:translateY(24px);opacity:0;transition:transform .32s cubic-bezier(.2,.7,.2,1),opacity .32s}
    .ff-sheet.on{transform:none;opacity:1}
    .ff-sheet[hidden],.ff-actions[hidden],[data-ffa2hs][hidden]{display:none!important}
    .ff-sheet-ic{width:52px;height:52px;border-radius:13px;background:url(/images/fuel-icon-192-v1.png) center/cover;box-shadow:0 4px 14px rgba(0,0,0,.4)}
    .ff-sheet-h{margin:0;font-weight:700;font-size:1.02rem;line-height:1.3}
    .ff-sheet-sub{margin:.2rem 0 0;color:var(--ff-mute);font-size:.9rem;line-height:1.45}
    .ff-sheet-how{margin:.6rem 0 0;padding:.65rem .75rem;border-radius:12px;background:rgba(255,255,255,.05);font-size:.92rem;line-height:1.55}
    .ff-sheet-how svg{width:1.1em;height:1.1em;vertical-align:-.18em}
    .ff-sheet-btns{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.7rem}
    .ff-sheet-add{min-height:44px;padding:0 1.1rem;border:0;border-radius:999px;background:linear-gradient(135deg,#8ff3e4,var(--ff-surf));color:var(--ff-ink);font:inherit;font-weight:700;cursor:pointer}
    .ff-sheet-no{min-height:44px;padding:0 1rem;border:1px solid var(--ff-line);border-radius:999px;background:transparent;color:var(--ff-foam);font:inherit;cursor:pointer}
    .ff-sheet-x{position:absolute;top:.35rem;right:.35rem;width:44px;height:44px;border:0;background:transparent;color:var(--ff-mute);font-size:1.6rem;line-height:1;cursor:pointer}
    .ff-sheet--share{grid-template-columns:1fr}
    .ff-share-text{margin:.35rem 0 0;padding:.6rem .7rem;border-radius:12px;background:rgba(255,255,255,.05);color:var(--ff-mute);font-size:.86rem;line-height:1.5;max-height:7.5em;overflow:auto;white-space:pre-line}
    .ff-share-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem;margin-top:.7rem}
    .ff-share-grid a,.ff-share-grid button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.3rem;min-height:68px;padding:.4rem;border-radius:14px;border:1px solid var(--ff-line);background:rgba(255,255,255,.03);color:var(--ff-foam);font:inherit;font-size:.82rem;text-decoration:none;cursor:pointer}
    .ff-share-grid a:hover,.ff-share-grid button:hover{border-color:var(--ff-surf)}
    .ff-share-grid i{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;font-style:normal}
    .ff-share-grid svg{width:17px;height:17px}
    .ff-share-done{margin:.5rem 0 0;color:var(--ff-surf);font-size:.88rem;min-height:1.2em}
    .ff-pill:focus-visible,.ff-sheet button:focus-visible,.ff-share-grid a:focus-visible{outline:2px solid var(--ff-surf);outline-offset:2px}
    @keyframes ffIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    @keyframes ffPop{from{opacity:.35;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}
    @keyframes ffDrop{0%{opacity:0;transform:translate(-50%,-260%)}70%{opacity:1;transform:translate(-50%,-92%)}100%{transform:translate(-50%,-100%)}}
    @keyframes ffShim{from{background-position:200% 0}to{background-position:-200% 0}}
    @keyframes ffPulse{0%{box-shadow:0 0 0 0 rgba(79,216,196,.65)}100%{box-shadow:0 0 0 16px rgba(79,216,196,0)}}
    @keyframes ffPulseBlue{0%{box-shadow:0 0 0 0 rgba(78,161,255,.55)}100%{box-shadow:0 0 0 14px rgba(78,161,255,0)}}
    @media (prefers-reduced-motion:reduce){.ff *,.ff *::before{animation:none!important;transition:none!important}}
  </style>'''


def tool(mode, radius, home=None):
    """The finder + the UK picture. mode "uk" | "local"; radius miles or "uk"; home (lat, lon, label) or None."""
    home_attrs = ''
    if home:
        home_attrs = f' data-home-lat="{home[0]}" data-home-lon="{home[1]}" data-home-label="{home[2]}"'
    tile = lambda i, cls, pre, dp, extra="": (f'<div class="ff-tile {cls}" id="ff-t{i}" hidden><p class="ff-tl"></p>'
                                    f'<p class="ff-num">{('<span class="ff-cur">' + pre + '</span>') if pre else ''}<b data-dp="{dp}">&nbsp;</b>{"" if pre else "<small>p</small>"}</p><p class="ff-ts"></p>{extra}</div>')
    return f'''    <section class="section ff-sec" id="finder" aria-label="Find the cheapest fuel">
      <div class="wrap">
        <div id="ff" class="ff" data-mode="{mode}" data-radius="{radius}"{home_attrs} data-vehicles="{_attr_json(VEHICLES)}" data-areas="{_attr_json(AREAS)}">
          <div class="ff-controls">
            <div class="ff-fuels" role="group" aria-label="Fuel">
              <button type="button" data-f="E10" aria-pressed="true">Unleaded</button>
              <button type="button" data-f="B7" aria-pressed="false">Diesel</button>
              <button type="button" data-f="E5" aria-pressed="false">Super unleaded</button>
              <button type="button" data-f="SDV" aria-pressed="false">Premium diesel</button>
            </div>
            <div class="ff-where">
              <button type="button" class="ff-gps" id="ff-gps">Use my location</button>
              <form id="ff-pcform" autocomplete="on">
                <label for="ff-pc" class="sr-only">Postcode</label>
                <input id="ff-pc" name="postcode" inputmode="text" autocomplete="postal-code" placeholder="or postcode, e.g. BH8 8DQ" maxlength="9" />
                <button type="submit">Go</button>
              </form>
              <label for="ff-rad" class="sr-only">How far</label>
              <select id="ff-rad"></select>
            </div>
            <p id="ff-status" class="ff-status" aria-live="polite">Loading today&rsquo;s prices&hellip;</p>
          </div>
          <div id="ff-banner" class="ff-banner" hidden></div>
          <div class="ff-tiles" aria-live="polite">
            {tile(1, "ff-t1", "", 1)}
            {tile(2, "ff-t2", "", 1)}
            {tile(3, "ff-t3", "&pound;", 2, '<div class="ff-veh"><label for="ff-vehicle" class="sr-only">Your vehicle</label><select id="ff-vehicle"></select>'
                  '<span class="ff-own" id="ff-own-wrap" hidden><label for="ff-own">Litres</label><input id="ff-own" type="number" inputmode="numeric" min="5" max="1500" step="1" value="60" /></span></div>')}
          </div>
          <div class="ff-actions" id="ff-actions" hidden>
            <button type="button" class="ff-pill" data-ffshare>{_SHARE_SVG}Share</button>
            <button type="button" class="ff-pill ff-pill--add" data-ffa2hs>{_ADD_SVG}<span class="ff-a2hs-label">Add to home screen</span></button>
          </div>
          <div class="ff-grid">
            <ol id="ff-list" class="ff-list" aria-label="Cheapest first"></ol>
            <div class="ff-mapwrap"><div id="ff-map" role="region" aria-label="Map of the forecourts"></div></div>
          </div>
          <p id="ff-src" class="ff-note"></p>
          <p class="ff-note">Your exact location stays on your phone: the page asks our server only for prices around a point rounded to about 10&nbsp;km, then works out the distances itself. A postcode is looked up through our own server and is not stored.</p>
          <div class="ff-sheet" id="ff-a2hs" role="dialog" aria-labelledby="ff-a2hs-h" hidden>
            <span class="ff-sheet-ic" aria-hidden="true"></span>
            <div class="ff-sheet-body">
              <p class="ff-sheet-h" id="ff-a2hs-h">Keep the cheapest fuel one tap away</p>
              <p class="ff-sheet-sub">Put it on your home screen: live prices near you, straight from an icon.</p>
              <div class="ff-sheet-how" id="ff-a2hs-how" aria-live="polite" hidden></div>
              <div class="ff-sheet-btns"><button type="button" class="ff-sheet-add" id="ff-a2hs-add">Add to home screen</button><button type="button" class="ff-sheet-no" id="ff-a2hs-no">Not now</button></div>
            </div>
            <button type="button" class="ff-sheet-x" id="ff-a2hs-x" aria-label="Close">&times;</button>
          </div>
          <div class="ff-sheet ff-sheet--share" id="ff-share" role="dialog" aria-labelledby="ff-share-h" hidden>
            <div class="ff-sheet-body">
              <p class="ff-sheet-h" id="ff-share-h">Share</p>
              <p class="ff-share-text" id="ff-share-text"></p>
              <div class="ff-share-grid" id="ff-share-grid"></div>
              <p class="ff-share-done" id="ff-share-done" aria-live="polite"></p>
            </div>
            <button type="button" class="ff-sheet-x" id="ff-share-x" aria-label="Close">&times;</button>
          </div>
        </div>
      </div>
    </section>
    <section class="section ff-sec" id="ff-fill-sec" aria-labelledby="ff-fill-h">
      <div class="wrap ff">
        <h2 id="ff-fill-h">What it costs to fill up</h2>
        <p class="ff-note" id="ff-fill-sub" style="margin-top:0">A full tank from empty, at the average price of unleaded and diesel.</p>
        <div class="ff-tablewrap"><table class="ff-table" id="ff-fill">
          <thead><tr><th scope="col">Vehicle</th><th scope="col">Tank</th><th scope="col">Unleaded</th><th scope="col">Diesel</th></tr></thead>
          <tbody id="ff-fill-body"><!--ssr:fill--></tbody>
        </table></div>
        <p class="ff-note">Tank sizes are typical for each kind of vehicle; yours is in the handbook. Most people top up from about a quarter of a tank, so their bill is a little less. Lorries run on diesel and motorbikes on petrol, so those show one price.</p>
      </div>
    </section>
    <section class="section ff-sec" id="ff-today-sec" aria-labelledby="ff-today-h">
      <div class="wrap ff ff-today">
        <!--ssr:today-->
      </div>
    </section>
    <section class="section ff-sec" id="ff-uk" hidden aria-labelledby="ff-uk-h">
      <div class="wrap ff">
        <h2 id="ff-uk-h">The UK picture</h2>
        <p id="ff-uk-sub" class="ff-note" style="margin-top:0"></p>
        <p id="ff-myarea" class="ff-myarea" hidden></p>
        <div class="ff-uk-grid">
          <div class="ff-card"><h3>The four nations</h3><div id="ff-nations" class="ff-bars"></div><p class="ff-note">Average (median) price in each, against the UK average (the line in the middle).</p></div>
          <div class="ff-card"><h3>Cheapest areas</h3><ol id="ff-cheap-areas" class="ff-areas"></ol><p class="ff-note">Average price by postcode area.</p></div>
          <div class="ff-card"><h3>Dearest areas</h3><ol id="ff-dear-areas" class="ff-areas"></ol><p class="ff-note">Average price by postcode area.</p></div>
          <div class="ff-card ff-wide"><h3>Cheapest forecourts in the UK right now</h3><ol id="ff-top10" class="ff-top"></ol><p class="ff-note">Tap one to see it on the map.</p></div>
        </div>
      </div>
    </section>
    <script src="/vendor/leaflet/leaflet.js" defer></script>
    <script src="/vendor/protomaps/protomaps-leaflet.js" defer></script>
    <script src="/vendor/leaflet/touch-friendly.js?v=20260819c" defer></script>
    <script src="/js/fuel-finder.js?v={JS_V}" defer></script>'''


def web_app(url, name, desc, publisher_id):
    """The tool as a WebApplication node (what it is, that it is free, who runs it) - for search engines and AI answers."""
    return {"@type": "WebApplication", "@id": url + "#app", "name": name, "url": url, "description": desc,
            "applicationCategory": "TravelApplication", "operatingSystem": "Any (web browser)", "isAccessibleForFree": True,
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"},
            "featureList": ["Live pump prices from every UK forecourt (government Fuel Finder data)",
                            "Cheapest first, by postcode or location, 2 to 100 miles or the whole UK",
                            "Fill-up cost for a motorbike, car, van, motorhome, 7.5-tonne lorry or HGV",
                            "Average prices by nation and postcode area"],
            "publisher": {"@id": publisher_id}}


def faqs(where):
    """`where`: "around Bournemouth" or "anywhere in the UK" - the one line that differs between the two pages."""
    return [
        ("Where do these prices come from?",
         "From the government&rsquo;s Fuel Finder service. Since February 2026 the law (the Motor Fuel Price (Open Data) "
         "Regulations 2025) requires every fuel retailer in the UK to report a change in its pump prices within 30 minutes, "
         "and the government publishes them as open data. We fetch them every half hour."),
        ("How up to date are the prices?",
         "We fetch fresh prices every half hour, and the line under the map says exactly when. Each price shows the time the "
         "forecourt set it. A price a forecourt has not confirmed for more than six weeks is left out rather than shown as "
         "current, and so is one far from every other in the country (more than 15% below or 30% above the UK average), "
         "which is almost always a typing mistake. If our own copy is more than three hours old the page says so. Prices can "
         "change at any time, so always check the pump before you fill up."),
        ("Does the page know where I am?",
         "Only roughly, and only if you tap Use my location. Your phone gives the page your position; the page asks our server "
         "for prices around a point rounded to about 10 km and works out the exact distances itself, so your exact location is "
         "never sent to us. A postcode is looked up through our own server, which asks the free postcodes.io service and "
         "keeps no record of it."),
        ("What is the average price of petrol and diesel in the UK today?",
         "The figures in the &ldquo;fuel prices today&rdquo; section of this page are worked out from every forecourt "
         "reporting to the government&rsquo;s Fuel Finder service and are updated every half hour. The average is the "
         "median: half the forecourts charge less and half more, so a handful of motorway services cannot drag it up. The "
         "table also shows the cheapest price in the country and how many forecourts reported each fuel."),
        ("How much does it cost to fill up a car, a van or an HGV?",
         "The &ldquo;what it costs to fill up&rdquo; table shows every kind of vehicle at today&rsquo;s average price of "
         "unleaded and diesel. Typical tanks: a motorbike about 15 litres, a small car 40, a family car 55, an SUV or estate "
         "70, a van such as a Transit or Crafter 80, a motorhome 90, a 7.5-tonne lorry 150 and a 44-tonne HGV about 500 "
         "(some artics carry twin tanks of 1,000 litres or more). Pick yours in the fill-up box, or type your own tank size, "
         "and every price on the page shows what a full tank costs."),
        ("Where is fuel cheapest in the UK?",
         "It changes day to day, so the &ldquo;fuel prices today&rdquo; section compares England, Scotland, Wales and "
         "Northern Ireland and lists the cheapest and dearest postcode areas from today&rsquo;s prices; Northern Ireland "
         "has had the lowest averages in the data we have seen. Supermarket forecourts are often the cheapest locally, and "
         "motorway services the dearest."),
        ("How are the fill-up cost and the saving worked out?",
         "The fill-up cost is your vehicle&rsquo;s tank, in litres, at the price shown, from empty; most people top up from a "
         "quarter of a tank, so their bill is a little less. The saving is the same tank at the cheapest price against the "
         "average (median) price in the area you are looking at. For the whole UK, the box shows a tank at the UK average "
         "price and the range from the cheapest postcode area to the dearest, because the cheapest single forecourt in the "
         "country is rarely one you would drive to. Lorries are only shown diesel bills and motorbikes petrol."),
        ("Why might the price at the pump be different?",
         "Forecourts change prices during the day, and a change reaches the data a little after it reaches the pump. The "
         "price on the pump is the one you pay."),
        ("What are E10, E5 and B7?",
         "E10 is standard unleaded petrol (up to 10% bioethanol); E5 is super unleaded (up to 5%), which some older cars need. "
         "B7 is standard diesel (up to 7% biodiesel). Premium diesel is each brand&rsquo;s higher-grade diesel."),
        ("Which areas does it cover?",
         f"Every forecourt in the UK that reports to the government&rsquo;s service: England, Scotland, Wales and Northern "
         f"Ireland. Search {where}, or choose the whole UK to see the cheapest in the country."),
    ]
