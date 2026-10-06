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

JS_V = "13"

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
_LOC_SVG = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" '
            'aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>'
            '<path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>')
_DIR_SVG = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" '
            'stroke-linejoin="round" aria-hidden="true"><path d="M3 11 21 3l-8 18-2-8-8-2z"/></svg>')
_PIN_SVG = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" '
            'stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/>'
            '<circle cx="12" cy="9.5" r="2.5"/></svg>')
_LIST_SVG = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" '
             'aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1" fill="currentColor"/>'
             '<circle cx="3.5" cy="12" r="1" fill="currentColor"/><circle cx="3.5" cy="18" r="1" fill="currentColor"/></svg>')
_MAP_SVG = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" '
            'stroke-linejoin="round" aria-hidden="true"><path d="m9 4-6 2.5v13L9 17l6 3 6-2.5v-13L15 7z"/><path d="M9 4v13M15 7v13"/></svg>')
_ADD_SVG = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" '
            'aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/></svg>')

HEAD = '''
  <link rel="stylesheet" href="/vendor/leaflet/leaflet.css" />
  <style>
    .ff,.ff-sheet{--ff-deep:#0a1420;--ff-water:#10202f;--ff-raise:#16293b;--ff-line:#1d3346;--ff-foam:#e8f1f2;--ff-mute:#8ea3b5;--ff-surf:#4fd8c4;--ff-glow:#7ff0de;--ff-dusk:#ffb066;--ff-ink:#04121a;--ff-r:18px;--ff-ease:cubic-bezier(.2,.8,.2,1)}
    .ff-sec .wrap{max-width:1120px}
    #finder{scroll-margin-top:5rem}
    /* 6 Oct 2026 phone revamp (owner: "it doesn't look very good ... animate it ... really super easy to use on the mobile
       phone in portrait"): the answer first. One fuel switch, one search bar, then a forecourt price display with the
       cheapest near you, the average and the tank bill, then slim rows; a List / Map switch on phones. */
    .ff-controls{display:grid;grid-template-columns:minmax(0,1fr);gap:.55rem;margin:0 0 .85rem}
    /* the fuel switch: a pill that slides to the fuel picked; swipes sideways when the screen is narrow */
    .ff-fuels{position:relative;display:flex;gap:.2rem;padding:.25rem;border-radius:999px;background:var(--ff-water);border:1px solid var(--ff-line);overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
    .ff-fuels::-webkit-scrollbar{display:none}
    .ff-fuels.more{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 2.2rem),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 2.2rem),transparent)}
    .ff-fuels button{position:relative;z-index:1;flex:1 0 auto;min-height:42px;padding:.4rem .95rem;border:0;border-radius:999px;background:transparent;color:var(--ff-mute);font:600 .95rem/1.1 var(--font-body,inherit);white-space:nowrap;cursor:pointer;transition:color .3s,transform .15s}
    .ff-fuels button:hover{color:var(--ff-foam)}
    .ff-fuels button:active{transform:scale(.95)}
    .ff-fuels button[aria-pressed="true"]{color:var(--ff-ink)}
    .ff-fuels button:focus-visible{outline:2px solid var(--ff-surf);outline-offset:1px}
    .ff-seg{position:absolute;z-index:0;top:.25rem;bottom:.25rem;left:0;width:0;border-radius:999px;background:linear-gradient(135deg,#9af5e8,var(--ff-surf));box-shadow:0 6px 18px -6px rgba(79,216,196,.75);transition:transform .38s var(--ff-ease),width .38s var(--ff-ease);pointer-events:none}
    .ff-seg.still{transition:none}
    .ff-short{display:none}
    @media (max-width:480px){.ff-fuels button{padding:.4rem .7rem}.ff-fuels .ff-long{display:none}.ff-fuels .ff-short{display:inline}}
    .ff:not(.ff-js) .ff-fuels button[aria-pressed="true"]{background:var(--ff-surf)}
    /* one search bar: near me, a postcode, how far */
    .ff-where{display:flex;flex-wrap:wrap;align-items:stretch;gap:.35rem;padding:.3rem;border-radius:16px;background:var(--ff-water);border:1px solid var(--ff-line);transition:border-color .2s,box-shadow .2s}
    .ff-where:focus-within{border-color:rgba(79,216,196,.7);box-shadow:0 0 0 3px rgba(79,216,196,.15)}
    .ff-gps{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:.4rem;min-height:44px;padding:0 .95rem;border:0;border-radius:12px;background:linear-gradient(135deg,#9af5e8,var(--ff-surf));color:var(--ff-ink);font:700 .95rem var(--font-body,inherit);cursor:pointer;transition:transform .15s,box-shadow .2s}
    .ff-gps:active{transform:scale(.96)}
    .ff-gps svg{width:18px;height:18px;flex:0 0 auto}
    .ff-gps.busy{animation:ffPulse 1s ease-out infinite}
    .ff-gps.busy svg{animation:ffSpin 1.1s linear infinite}
    .ff-where form{display:flex;flex:1 1 11rem;min-width:0;gap:.3rem}
    .ff-where input{flex:1 1 auto;min-width:0;min-height:44px;border:0;border-radius:12px;background:transparent;color:var(--ff-foam);font:600 1rem var(--font-body,inherit);padding:0 .55rem;text-transform:uppercase;outline:none}
    .ff-where input::placeholder{text-transform:none;color:var(--ff-mute);font-weight:400}
    .ff-where form button{flex:0 0 auto;min-height:44px;min-width:48px;padding:0 .75rem;border:0;border-radius:12px;background:var(--ff-raise);color:var(--ff-foam);font:700 .95rem var(--font-body,inherit);cursor:pointer;transition:background .2s,transform .15s}
    .ff-where form button:hover{background:#1f3a52}
    .ff-where form button:active{transform:scale(.95)}
    .ff-where select{flex:0 0 auto;min-height:44px;max-width:100%;border:1px solid var(--ff-line);border-radius:12px;background:var(--ff-raise);color:var(--ff-foam);font:600 .92rem var(--font-body,inherit);padding:0 .45rem;cursor:pointer}
    .ff-where select option{background:#0e1d2c}
    .ff-status{display:flex;align-items:baseline;gap:.5rem;color:var(--ff-mute);font-size:.88rem;line-height:1.45;margin:.05rem 0 0;min-height:1.3em}
    .ff-status::before{content:"";flex:0 0 8px;height:8px;border-radius:50%;background:var(--ff-surf);transform:translateY(-1px);animation:ffLive 2.2s ease-out infinite}
    .ff-status b{color:var(--ff-foam)}
    .ff-banner{border:1px solid var(--ff-dusk);background:rgba(255,176,102,.08);border-radius:12px;padding:.75rem 1rem;margin:0 0 1rem;font-size:.92rem;line-height:1.5}
    .ff-banner b{color:var(--ff-dusk)}
    /* the three answers: the price display (cheapest), the average, the tank */
    .ff-tiles{display:grid;grid-template-columns:minmax(0,1fr);gap:.6rem;margin:0 0 .9rem}
    .ff-tile{position:relative;overflow:hidden;background:var(--ff-water);border:1px solid var(--ff-line);border-radius:var(--ff-r);padding:.85rem 1rem}
    .ff-tl{margin:0;color:var(--ff-mute);font-size:.84rem;line-height:1.35}
    .ff-num{margin:.15rem 0;font-size:clamp(1.8rem,8vw,2.4rem);font-weight:800;line-height:1.05;color:var(--ff-foam);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
    .ff-num small{font-size:.45em;font-weight:600;color:var(--ff-mute);margin-left:.1em}
    .ff-ts{margin:0;color:var(--ff-mute);font-size:.86rem;line-height:1.45}
    .ff-ts b{color:var(--ff-foam)}
    .ff-t1{padding:1rem 1.05rem 1.05rem;border-color:rgba(79,216,196,.5);background:radial-gradient(130% 120% at 100% 0%,rgba(79,216,196,.18),transparent 55%),linear-gradient(180deg,#13293d,#0a1724);box-shadow:0 22px 44px -28px rgba(79,216,196,.75)}
    .ff-t1::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:16px 16px;-webkit-mask-image:linear-gradient(160deg,#000 10%,transparent 70%);mask-image:linear-gradient(160deg,#000 10%,transparent 70%)}
    .ff-t1 .ff-tl{position:relative;font-family:var(--font-mono,ui-monospace,monospace);font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ff-surf)}
    .ff-t1 .ff-tl small{display:block;margin-top:.15rem;letter-spacing:.04em;text-transform:none;font-size:.78rem;color:var(--ff-mute);font-family:var(--font-body,inherit)}
    .ff-led{position:relative;display:inline-flex;align-items:baseline;margin:.5rem 0 .55rem;padding:.15rem .75rem .25rem;border-radius:14px;background:#03070d;border:1px solid #1a2b3d;box-shadow:inset 0 0 26px rgba(0,0,0,.9),0 0 0 1px rgba(79,216,196,.08)}
    .ff-led b{font-family:var(--font-mono,ui-monospace,monospace);font-weight:500;font-size:clamp(2.7rem,15vw,3.9rem);line-height:1.08;letter-spacing:.02em;color:var(--ff-glow);text-shadow:0 0 14px rgba(79,216,196,.7),0 0 38px rgba(79,216,196,.32);font-variant-numeric:tabular-nums}
    .ff-led small{font-family:var(--font-mono,ui-monospace,monospace);font-size:1.25rem;color:var(--ff-glow);opacity:.8;margin-left:.15rem}
    .ff-t1 .ff-ts{position:relative;font-size:.95rem;color:#c7d6e2}
    .ff-t1 .ff-ts b{font-size:1.05rem}
    .ff-acts{position:relative;display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.8rem}
    .ff-btn{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;min-height:44px;padding:0 1.05rem;border-radius:999px;border:0;background:linear-gradient(135deg,#9af5e8,var(--ff-surf));color:var(--ff-ink)!important;font:700 .92rem var(--font-body,inherit);text-decoration:none!important;cursor:pointer;transition:transform .15s,box-shadow .2s}
    .ff-btn:hover{box-shadow:0 8px 22px -10px rgba(79,216,196,.9)}
    .ff-btn:active{transform:scale(.96)}
    .ff-btn svg{width:17px;height:17px}
    .ff-navchg{position:relative;display:block;margin:.6rem 0 0;padding:.3rem 0;border:0;background:none;color:var(--ff-mute);font:500 .84rem var(--font-body,inherit);text-align:left;cursor:pointer}
    .ff-navchg b{color:#c7d6e2;font-weight:600}
    .ff-navchg u{color:var(--ff-surf);text-underline-offset:2px}
    .ff-navchg:focus-visible{outline:2px solid var(--ff-surf);outline-offset:2px;border-radius:6px}
    .ff-nav-grid button[aria-pressed="true"]{border-color:var(--ff-surf);background:rgba(79,216,196,.12)}
    .ff-btn--ghost{background:rgba(79,216,196,.07);border:1px solid rgba(79,216,196,.45);color:var(--ff-foam)!important}
    .ff-btn--ghost:hover{background:rgba(79,216,196,.15);box-shadow:none}
    .ff-btn:focus-visible{outline:2px solid var(--ff-surf);outline-offset:2px}
    .ff-t2 .ff-num b,.ff-t3 .ff-num b{font-family:var(--font-display,inherit);font-weight:600;letter-spacing:-.01em}
    .ff-t2{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:.1rem .8rem}
    .ff-t2 .ff-tl,.ff-t2 .ff-ts{grid-column:1 / -1}
    .ff-t2 .ff-num{font-size:clamp(1.7rem,7vw,2.1rem)}
    .ff-t3{border-color:rgba(255,176,102,.38);background:radial-gradient(120% 130% at 100% 0%,rgba(255,176,102,.13),transparent 55%),var(--ff-water)}
    .ff-t3 .ff-num{color:var(--ff-dusk)}
    .ff-t3 .ff-num .ff-cur{font-size:.7em;margin-right:.05em}
    .ff-t3.nofit .ff-cur{display:none}
    /* vehicles: a row of chips (the menu stays underneath for anything that drives it, e.g. the reel camera) */
    .ff-veh{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;margin:.7rem 0 0}
    .ff-veh select{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
    .ff-vchips{display:flex;gap:.35rem;width:calc(100% + 2rem);margin:0 -1rem;padding:.15rem 1rem .25rem;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 .9rem,#000 calc(100% - 1.6rem),transparent);mask-image:linear-gradient(90deg,transparent 0,#000 .9rem,#000 calc(100% - 1.6rem),transparent)}
    .ff-vchips::-webkit-scrollbar{display:none}
    .ff-vchip{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.22rem;min-width:4.6rem;min-height:60px;padding:.4rem .5rem;border-radius:14px;border:1px solid var(--ff-line);background:rgba(255,255,255,.02);color:var(--ff-mute);font:600 .74rem/1.15 var(--font-body,inherit);text-align:center;cursor:pointer;transition:border-color .25s,background .25s,color .25s,transform .15s}
    .ff-vchip svg{width:28px;height:28px;transition:transform .35s var(--ff-ease)}
    .ff-vchip:active{transform:scale(.95)}
    .ff-vchip[aria-pressed="true"]{border-color:var(--ff-dusk);background:rgba(255,176,102,.14);color:var(--ff-foam)}
    .ff-vchip[aria-pressed="true"] svg{color:var(--ff-dusk);transform:translateY(-1px) scale(1.08)}
    .ff-vchip:focus-visible{outline:2px solid var(--ff-dusk);outline-offset:1px}
    .ff-own{display:inline-flex;align-items:center;gap:.4rem;color:var(--ff-mute);font-size:.9rem}
    .ff-own[hidden]{display:none}
    .ff-own input{width:6.5rem;min-height:44px;border-radius:12px;border:1px solid var(--ff-line);background:var(--ff-raise);color:var(--ff-foam);font:inherit;font-size:1rem;padding:.4rem .6rem}
    .ff-tskel{display:grid;gap:.55rem}
    .ff-tskel i{display:block;height:14px;border-radius:7px;background:linear-gradient(90deg,var(--ff-water) 0%,#1a3048 50%,var(--ff-water) 100%);background-size:200% 100%;animation:ffShim 1.2s linear infinite}
    .ff-tskel i:nth-child(1){width:45%}.ff-tskel i:nth-child(2){height:56px;width:62%;border-radius:12px}.ff-tskel i:nth-child(3){width:80%}
    .ff-tskel[hidden]{display:none}
    @media (min-width:700px){.ff-tiles{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)}.ff-t1{grid-row:span 2}}
    @media (min-width:1040px){.ff-tiles{grid-template-columns:minmax(0,1.15fr) minmax(0,.8fr) minmax(0,1.15fr)}.ff-t1{grid-row:auto}}
    .ff-tablewrap{overflow-x:auto;border:1px solid var(--ff-line);border-radius:16px;background:var(--ff-water)}
    .ff-table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:.95rem}
    .ff-table th,.ff-table td{padding:.6rem .8rem;border-bottom:1px solid var(--ff-line);text-align:left;vertical-align:top}
    .ff-table tbody tr:last-child td,.ff-table tbody tr:last-child th{border-bottom:0}
    .ff-table thead th{font-family:var(--mono,ui-monospace,monospace);font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--ff-mute);font-weight:600}
    .ff-table td small,.ff-table th small{display:block;color:var(--ff-mute);font-size:.78rem;font-weight:400}
    .ff-table tbody th{font-weight:600;color:var(--ff-foam)}
    .ff-table .ff-na{color:var(--ff-mute)}
    @media (max-width:430px){.ff-table th,.ff-table td{padding:.55rem .5rem}.ff-table thead th{letter-spacing:.02em}}
    .ff-table tr.mine th,.ff-table tr.mine td{background:rgba(255,176,102,.07)}
    .ff-today h2{margin-top:0}
    .ff-today h3{font-size:1.05rem;margin:1.4rem 0 .6rem}
    .ff-today p{max-width:72ch}
    .ff-twocol{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:1rem}
    .ff-stamp{font-family:var(--mono,ui-monospace,monospace);font-size:.8rem;color:var(--ff-mute)}
    .ff-answer{font-size:1.06rem;line-height:1.65}
    .ff-weeks small.up{color:var(--ff-dusk)}
    .ff-weeks small.dn{color:var(--ff-surf)}
    /* "are fuel prices going up or down": drawn by the script at the box's own width (readable labels on a phone) */
    .ff-trend{margin:1.2rem 0 1.2rem;padding:1rem 1rem .8rem;border:1px solid var(--ff-line);border-radius:16px;background:var(--ff-water)}
    .ff-ranges{display:flex;flex-wrap:wrap;gap:.4rem;margin:0 0 .7rem}
    .ff-ranges[hidden],.ff-ranges button[hidden]{display:none}
    .ff-ranges button{min-height:40px;padding:0 .9rem;border-radius:999px;border:1px solid var(--ff-line);background:transparent;color:var(--ff-foam);font:inherit;font-size:.88rem;cursor:pointer;transition:background .2s,color .2s}
    .ff-ranges button[aria-pressed="true"]{background:var(--ff-surf);border-color:var(--ff-surf);color:var(--ff-ink);font-weight:700}
    .ff-chart{position:relative;min-height:240px;outline:none;touch-action:pan-y}
    .ff-chart:focus-visible{box-shadow:0 0 0 2px var(--ff-surf);border-radius:8px}
    .ff-chart svg{display:block;width:100%;overflow:visible}
    .ff-chart .gl{stroke:var(--ff-line);stroke-width:1}
    .ff-chart text{fill:var(--ff-mute);font-size:11px;font-family:var(--mono,ui-monospace,monospace)}
    .ff-chart .lu,.ff-chart .ld{fill:none;stroke-width:2.4;stroke-linejoin:round;stroke-linecap:round}
    .ff-chart .lu{stroke:var(--ff-surf)}
    .ff-chart .ld{stroke:var(--ff-dusk)}
    .ff-chart .rec{fill:var(--ff-foam);font-size:10.5px}
    .ff-chart .cx{stroke:var(--ff-foam);stroke-width:1;opacity:.45}
    .ff-chart.pre .lu,.ff-chart.pre .ld{stroke-dasharray:1;stroke-dashoffset:1}
    .ff-chart.go .lu,.ff-chart.go .ld{stroke-dasharray:1;stroke-dashoffset:0;transition:stroke-dashoffset 1.5s cubic-bezier(.2,.7,.2,1)}
    .ff-chart .ff-wait{position:absolute;inset:0;display:grid;place-items:center;color:var(--ff-mute);font-size:.9rem}
    .ff-tip{position:absolute;top:0;z-index:2;pointer-events:none;padding:.35rem .6rem;border:1px solid var(--ff-line);border-radius:10px;background:#0e1d2c;color:var(--ff-foam);font-size:.8rem;line-height:1.45;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.4)}
    .ff-tip b{font-variant-numeric:tabular-nums}
    .ff-legend{display:flex;flex-wrap:wrap;gap:.4rem 1.1rem;margin:.6rem 0 0;color:var(--ff-mute);font-size:.86rem}
    .ff-legend i{display:inline-block;width:16px;height:3px;margin-right:.4rem;border-radius:2px;vertical-align:middle}
    .ff-chip{display:inline-block;padding:.15rem .55rem;border-radius:1em;border:1px solid var(--ff-line);font-size:.8rem;color:var(--ff-foam)}
    .ff-chip.ff-good{border-color:var(--ff-surf);color:var(--ff-surf)}
    .ff-chip.ff-bad{border-color:var(--ff-dusk);color:var(--ff-dusk)}
    .ff-pop{animation:ffPop .5s cubic-bezier(.2,.7,.2,1) both}
    /* the list and the map: side by side on a wide screen, a List / Map switch on a phone */
    .ff-listhead{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin:0 0 .55rem;min-height:40px;scroll-margin-top:calc(var(--header-h,76px) + var(--ticker-h,30px) + .5rem)}
    .ff-lh{margin:0;font-family:var(--font-mono,ui-monospace,monospace);font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ff-mute)}
    .ff-lh b{color:var(--ff-foam);font-weight:500}
    .ff-view{position:relative;display:inline-flex;flex:0 0 auto;padding:.2rem;border-radius:999px;background:var(--ff-water);border:1px solid var(--ff-line)}
    .ff-view button{position:relative;z-index:1;display:inline-flex;align-items:center;gap:.35rem;min-height:38px;padding:0 .85rem;border:0;border-radius:999px;background:transparent;color:var(--ff-mute);font:700 .86rem var(--font-body,inherit);cursor:pointer;transition:color .25s}
    .ff-view button svg{width:16px;height:16px}
    .ff-view button[aria-pressed="true"]{color:var(--ff-foam);background:var(--ff-raise);box-shadow:0 4px 12px -6px rgba(0,0,0,.6)}
    .ff-view button:focus-visible{outline:2px solid var(--ff-surf);outline-offset:1px}
    .ff-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:1rem;align-items:start}
    @media (min-width:700px){.ff-view{display:none}}
    @media (max-width:699px){
      .ff-grid{grid-template-columns:minmax(0,1fr)}
      .ff-grid[data-view="list"] .ff-mapwrap{display:none}
      .ff-grid[data-view="map"] #ff-list{display:none}
      .ff-grid[data-view="map"] .ff-mapwrap{animation:ffIn .35s var(--ff-ease) both}
    }
    .ff-list,.ff-top,.ff-areas{list-style:none;margin:0;padding:0;display:grid;gap:.45rem}
    /* one forecourt: brand badge (its rank on the corner), name and street, price and the tank; tap to open */
    .ff-item{position:relative;display:grid;grid-template-columns:2.7rem minmax(0,1fr) auto;gap:.1rem .75rem;align-items:center;padding:.65rem .8rem;border:1px solid var(--ff-line);border-radius:16px;background:var(--ff-water);cursor:pointer;animation:ffIn .45s var(--ff-ease) both;transition:border-color .2s,background .2s,transform .15s}
    .ff-item:hover{border-color:rgba(79,216,196,.55)}
    .ff-item:active{transform:scale(.99)}
    .ff-item:focus-visible{outline:2px solid var(--ff-surf);outline-offset:2px}
    .ff-item.open{border-color:rgba(79,216,196,.6);background:#122638}
    .ff-item.best{border-color:var(--ff-surf);background:linear-gradient(90deg,rgba(79,216,196,.12),var(--ff-water) 55%);box-shadow:0 12px 30px -22px rgba(79,216,196,.9)}
    .ff-logo{position:relative;display:grid;place-items:center;width:2.7rem;height:2.7rem;border-radius:13px;background:var(--c,#25405a);color:var(--t,#fff);font:700 1.05rem/1 var(--font-display,inherit);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
    .ff-logo i{position:absolute;top:-7px;left:-7px;min-width:1.3rem;height:1.3rem;padding:0 .25rem;border-radius:999px;background:var(--ff-deep);border:1px solid var(--ff-line);color:var(--ff-mute);font:500 .68rem/1.2rem var(--font-mono,ui-monospace,monospace);font-style:normal;text-align:center}
    .ff-item.best .ff-logo i{background:var(--ff-surf);border-color:var(--ff-surf);color:var(--ff-ink)}
    .ff-name{min-width:0;font-weight:700;color:var(--ff-foam);line-height:1.25}
    .ff-name small{display:block;margin-top:.12rem;font-weight:400;color:var(--ff-mute);font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ff-name small b{color:#c7d6e2;font-weight:600}
    @media (max-width:430px){.ff-lh2{display:none}}
    .ff-price{font-size:1.32rem;font-weight:800;color:var(--ff-foam);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap;line-height:1.1}
    .ff-item.best .ff-price{color:var(--ff-glow);text-shadow:0 0 14px rgba(79,216,196,.35)}
    .ff-price small{display:block;margin-top:.15rem;font-size:.72rem;font-weight:600;color:var(--ff-mute);letter-spacing:0;text-shadow:none}
    .ff-price small em{font-style:normal;color:var(--ff-dusk)}
    .ff-tagbest{display:inline-block;margin-left:.35rem;padding:.08rem .45rem;border-radius:999px;background:var(--ff-surf);color:var(--ff-ink);font:700 .62rem/1.4 var(--font-mono,ui-monospace,monospace);letter-spacing:.08em;text-transform:uppercase;vertical-align:.12em}
    /* opened: the full address, every fuel it sells, directions */
    .ff-x{grid-column:1 / -1;display:grid;grid-template-rows:0fr;transition:grid-template-rows .32s var(--ff-ease)}
    .ff-item.open .ff-x{grid-template-rows:1fr}
    .ff-x > div{overflow:hidden;min-height:0}
    .ff-xin{padding-top:.65rem;margin-top:.55rem;border-top:1px solid var(--ff-line)}
    .ff-xa{margin:0;color:#c7d6e2;font-size:.88rem;line-height:1.5}
    .ff-fu{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(6.5rem,100%),1fr));gap:.35rem;margin:.55rem 0 0;padding:0;list-style:none}
    .ff-fu li{padding:.4rem .55rem;border-radius:10px;background:rgba(255,255,255,.035);border:1px solid var(--ff-line);font-size:.78rem;color:var(--ff-mute);line-height:1.3}
    .ff-fu li b{display:block;font-size:1rem;color:var(--ff-foam);font-variant-numeric:tabular-nums}
    .ff-fu li.on{border-color:rgba(79,216,196,.55)}
    .ff-fu li.on b{color:var(--ff-glow)}
    .ff-x .ff-acts{margin-top:.6rem}
    .ff-more button{width:100%;min-height:48px;border-radius:14px;border:1px dashed var(--ff-line);background:transparent;color:var(--ff-foam);font:600 .95rem var(--font-body,inherit);cursor:pointer;transition:border-color .2s,background .2s}
    .ff-more button:hover{border-color:var(--ff-surf);background:rgba(79,216,196,.06)}
    .ff-empty{color:var(--ff-mute);padding:1rem;border:1px dashed var(--ff-line);border-radius:14px}
    .ff-skel{display:grid;grid-template-columns:2.7rem minmax(0,1fr) 3.5rem;gap:.75rem;align-items:center;padding:.75rem .8rem;border:1px solid var(--ff-line);border-radius:16px;background:var(--ff-water)}
    .ff-skel i{display:block;height:13px;border-radius:6px;background:linear-gradient(90deg,var(--ff-water) 0%,#1a3048 50%,var(--ff-water) 100%);background-size:200% 100%;animation:ffShim 1.2s linear infinite}
    .ff-skel i:first-child{height:2.7rem;border-radius:13px}
    .ff-skel i:last-child{height:22px}
    .ff-mapwrap{position:sticky;top:calc(var(--header-h,76px) + var(--ticker-h,30px) + .75rem)}
    #ff-map{height:min(70vh,580px);border-radius:var(--ff-r);border:1px solid var(--ff-line);background:var(--ff-deep)}
    @media (max-width:699px){.ff-mapwrap{position:static}#ff-map{height:min(64vh,560px)}}
    .ff-pin span{display:inline-block;transform:translate(-50%,-100%);background:var(--ff-water);color:var(--ff-foam);border:1px solid var(--ff-line);border-radius:8px;padding:2px 6px;font:700 12px/1.3 system-ui,sans-serif;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,.45);animation:ffDrop .55s cubic-bezier(.3,1.3,.5,1) both}
    .ff-pin.best span{background:var(--ff-surf);color:var(--ff-ink);border-color:var(--ff-surf)}
    .ff-me{width:16px;height:16px;border-radius:50%;background:#4ea1ff;border:3px solid #fff;box-shadow:0 0 0 2px rgba(78,161,255,.5);animation:ffPulseBlue 1.6s ease-out infinite}
    .ff-note{color:var(--ff-mute);font-size:.86rem;line-height:1.55;margin:1rem 0 0}
    .ff-note a{color:var(--ff-surf)}
    .ff-myarea{background:var(--ff-water);border:1px solid var(--ff-surf);border-radius:14px;padding:.75rem 1rem;margin:0 0 1rem;color:var(--ff-foam)}
    .ff-uk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:.9rem}
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
    .ff-top{grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr))}
    .ff-top li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.15rem .7rem;align-items:center;padding:.6rem .75rem;border:1px solid var(--ff-line);border-radius:12px;cursor:pointer;transition:border-color .2s}
    .ff-top li:hover,.ff-top li:focus-visible{border-color:var(--ff-surf);outline:none}
    .ff-top .ff-price{font-size:1.1rem}
    .leaflet-popup-content{font:14px/1.45 system-ui,sans-serif}
    @media (max-width:560px){
      .ff-where .ff-gps{flex:1 1 auto}
      .ff-where select{flex:0 1 auto}
      .ff-where form{order:3;flex:1 1 100%}
      .ff-bar{grid-template-columns:6.2rem minmax(0,1fr) auto}
    }
    /* a tool used standing at a car: on a phone the heading stays short so the switch and the answer are on screen */
    @media (max-width:767px){
      .page-hero h1,.taskhead h1{font-size:clamp(1.45rem,7vw,1.95rem);line-height:1.1;margin-bottom:.35rem}
      .page-hero .eyebrow,.taskhead .eyebrow{margin-bottom:.3rem}
      #finder{padding-top:.6rem}
      .page-hero{padding-top:calc(var(--header-h,76px) + var(--ticker-h,30px) + .9rem)}
      .taskhead__lede,.taskhead .page-hero__byline{display:none}
    }
    /* a phone with big text (6 Oct 2026, owner on a Galaxy S22: Chrome turns the text size into page zoom, 180-300 px
       wide): each control on its own row, each forecourt's price under its name */
    @media (max-width:300px){
      .ff-fuels button{padding:.4rem .7rem;font-size:.9rem}
      .ff-where .ff-gps,.ff-where select{flex:1 1 100%}
      .ff-item{grid-template-columns:2.3rem minmax(0,1fr);gap:.15rem .6rem;padding:.6rem .65rem}
      .ff-logo{width:2.3rem;height:2.3rem;border-radius:11px;font-size:.95rem}
      .ff-price{grid-column:2;text-align:left}
      .ff-acts .ff-btn{flex:1 1 100%}
      .ff-vchip{min-width:4.1rem}
      .ff-t2{grid-template-columns:minmax(0,1fr)}
      .ff-listhead{flex-wrap:wrap}
    }
    @media (max-width:260px){.ff-bar{grid-template-columns:minmax(0,1fr) auto;gap:.25rem .5rem}.ff-bl{grid-column:1 / -1}}
    /* a phone on its side: a shorter heading, the list and the map side by side (the grid above), a taller map */
    @media (max-height:500px) and (orientation:landscape){
      .page-hero .lede,.page-hero__chips,.page-hero__cta,.page-hero__byline,.taskhead__lede{display:none}
      .page-hero{padding-top:calc(var(--header-h,76px) + var(--ticker-h,30px) + .6rem);padding-bottom:0}
      .page-hero h1,.taskhead h1{font-size:1.5rem;margin-bottom:.3rem}
      #finder{padding-top:.6rem}
      .ff-led b{font-size:2.7rem}
      #ff-map{height:calc(100vh - var(--header-h,76px) - var(--ticker-h,30px) - 1.6rem)}
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
    /* the script moves both panels to <body> (the site's <main> is z-index 2, which kept them UNDER the phone's
       Call/Book/Text bar); on a phone they sit just above that bar, which is 4.6rem tall (styles.css). Seen 4 Oct. */
    @media (max-width:767px){.ff-sheet{bottom:calc(4.6rem + 10px + env(safe-area-inset-bottom));max-height:calc(100vh - 4.6rem - 24px);overflow-y:auto}}
    /* 6 Oct 2026: the fuel pages no longer carry that bar (build_pages.NO_DOCK, body.no-dock) - the panels sit at the bottom */
    @media (max-width:767px){body.no-dock .ff-sheet{bottom:calc(10px + env(safe-area-inset-bottom));max-height:calc(100vh - 24px)}}
    @media (max-width:1024px) and (max-height:500px) and (orientation:landscape){.ff-sheet{bottom:calc(10px + env(safe-area-inset-bottom))}}
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
    @keyframes ffSpin{to{transform:rotate(360deg)}}
    @keyframes ffLive{0%{box-shadow:0 0 0 0 rgba(79,216,196,.6)}70%,100%{box-shadow:0 0 0 7px rgba(79,216,196,0)}}
    @media (prefers-reduced-motion:reduce){.ff *,.ff *::before,.ff *::after{animation:none!important;transition:none!important}}
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
              <span class="ff-seg" aria-hidden="true"></span>
              <button type="button" data-f="E10" aria-pressed="true">Unleaded</button>
              <button type="button" data-f="B7" aria-pressed="false">Diesel</button>
              <button type="button" data-f="E5" aria-pressed="false" aria-label="Super unleaded"><span class="ff-long">Super unleaded</span><span class="ff-short">Super</span></button>
              <button type="button" data-f="SDV" aria-pressed="false" aria-label="Premium diesel"><span class="ff-long">Premium diesel</span><span class="ff-short">Premium</span></button>
            </div>
            <div class="ff-where">
              <button type="button" class="ff-gps" id="ff-gps">{_LOC_SVG}<span>Use my location</span></button>
              <form id="ff-pcform" autocomplete="on">
                <label for="ff-pc" class="sr-only">Postcode</label>
                <input id="ff-pc" name="postcode" inputmode="text" autocomplete="postal-code" placeholder="Postcode, e.g. BH8 8DQ" maxlength="9" />
                <button type="submit">Go</button>
              </form>
              <label for="ff-rad" class="sr-only">How far</label>
              <select id="ff-rad"></select>
            </div>
            <p id="ff-status" class="ff-status" aria-live="polite">Loading today&rsquo;s prices&hellip;</p>
          </div>
          <div id="ff-banner" class="ff-banner" hidden></div>
          <div class="ff-tiles" aria-live="polite">
            <div class="ff-tile ff-tskel" id="ff-tskel" aria-hidden="true"><i></i><i></i><i></i></div>
            <div class="ff-tile ff-t1" id="ff-t1" hidden><p class="ff-tl"></p><p class="ff-num ff-led"><b data-dp="1">&nbsp;</b><small>p</small></p><p class="ff-ts"></p>
              <div class="ff-acts"><a class="ff-btn" id="ff-t1-dir" href="#finder" target="_blank" rel="noopener">{_DIR_SVG}Directions</a><button type="button" class="ff-btn ff-btn--ghost" id="ff-t1-map">{_PIN_SVG}On the map</button></div>
              <button type="button" class="ff-navchg" id="ff-navchg" data-navchg>Directions open in <b class="ff-navname">your maps app</b> &middot; <u>Change</u></button></div>
            {tile(2, "ff-t2", "", 1)}
            {tile(3, "ff-t3", "&pound;", 2, '<div class="ff-veh"><label for="ff-vehicle" class="sr-only">Your vehicle</label><select id="ff-vehicle" tabindex="-1" aria-hidden="true"></select><div class="ff-vchips" id="ff-vchips" role="group" aria-label="Your vehicle"></div>'
                  '<span class="ff-own" id="ff-own-wrap" hidden><label for="ff-own">Litres</label><input id="ff-own" type="number" inputmode="numeric" min="5" max="1500" step="1" value="60" /></span></div>')}
          </div>
          <div class="ff-actions" id="ff-actions" hidden>
            <button type="button" class="ff-pill" data-ffshare>{_SHARE_SVG}Share</button>
            <button type="button" class="ff-pill ff-pill--add" data-ffa2hs>{_ADD_SVG}<span class="ff-a2hs-label">Add to home screen</span></button>
          </div>
          <div class="ff-listhead"><p class="ff-lh" id="ff-lh">Cheapest first</p>
            <div class="ff-view" id="ff-view" role="group" aria-label="Show as"><button type="button" data-v="list" aria-pressed="true">{_LIST_SVG}List</button><button type="button" data-v="map" aria-pressed="false">{_MAP_SVG}Map</button></div></div>
          <div class="ff-grid" id="ff-grid" data-view="list">
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
          <div class="ff-sheet ff-sheet--share" id="ff-navsheet" role="dialog" aria-labelledby="ff-nav-h" hidden>
            <div class="ff-sheet-body">
              <p class="ff-sheet-h" id="ff-nav-h">Get directions in&hellip;</p>
              <p class="ff-sheet-sub">Pick the app you drive with &mdash; we&rsquo;ll remember it. With your phone connected to Android Auto or Apple CarPlay, the route shows on your car&rsquo;s screen.</p>
              <div class="ff-share-grid ff-nav-grid" id="ff-nav-grid"></div>
            </div>
            <button type="button" class="ff-sheet-x" id="ff-nav-x" aria-label="Close">&times;</button>
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
    <section class="section ff-sec" id="ff-brands-sec" hidden aria-labelledby="ff-brands-h">
      <div class="wrap ff ff-today">
        <!--ssr:brands-->
      </div>
    </section>
    <section class="section ff-sec" id="ff-trend-sec" aria-labelledby="ff-trend-h">
      <div class="wrap ff ff-today">
        <h2 id="ff-trend-h">Are fuel prices going up or down?</h2>
        <!--ssr:trend-->
        <div class="ff-trend" id="ff-trend">
          <div class="ff-ranges" id="ff-ranges" role="group" aria-label="How far back" hidden>
            <button type="button" data-range="days" aria-pressed="false" hidden>Day by day</button>
            <button type="button" data-range="13" aria-pressed="false">3 months</button>
            <button type="button" data-range="52" aria-pressed="true">1 year</button>
            <button type="button" data-range="260" aria-pressed="false">5 years</button>
            <button type="button" data-range="all" aria-pressed="false">Since 2003</button>
          </div>
          <div class="ff-chart" id="ff-chart" tabindex="0" aria-describedby="ff-chart-note"><p class="ff-wait">Loading the chart&hellip;</p></div>
          <p class="ff-legend"><span><i style="background:var(--ff-surf)"></i>Unleaded petrol</span><span><i style="background:var(--ff-dusk)"></i>Diesel</span></p>
          <p class="ff-note" id="ff-chart-note" style="margin-top:.4rem">UK average pump price, pence a litre. Tap or hover over the chart for any week; on a keyboard, use the arrow keys.</p>
        </div>
        <!--ssr:trend2-->
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
          <div class="ff-card ff-wide"><h3>Cheapest forecourts in the UK right now</h3><ol id="ff-top10" class="ff-top"></ol><p class="ff-note">Prices set in the last two weeks. Tap one to see it on the map.</p></div>
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
                            "Average prices by nation and postcode area",
                            "Which supermarket has the cheapest fuel, across the UK and around Bournemouth",
                            "Are prices going up or down: the government's weekly UK averages since 2003, the records and the tax share"],
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
         "which is almost always a typing mistake. The cheapest in the whole UK counts only prices set in the last two weeks: "
         "an older price may still be right, but nobody should drive across the country on the strength of it. If our own "
         "copy is more than three hours old the page says so. Prices can change at any time, so always check the pump "
         "before you fill up."),
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
        ("Which supermarket has the cheapest fuel?",
         "It changes from day to day, so the &ldquo;which supermarket has the cheapest fuel&rdquo; section of this page ranks "
         "Asda, Tesco, Sainsbury&rsquo;s, Morrisons and the others by today&rsquo;s average price at their forecourts, from the "
         "government&rsquo;s Fuel Finder data, next to the big fuel brands such as BP, Shell and Esso, and says how much cheaper "
         "the supermarkets are taken together. Costco forecourts are for members only. A brand&rsquo;s forecourts are often run "
         "by different companies, so the cheapest one near you may not belong to the cheapest brand: the finder shows each one."),
        ("Are fuel prices going up or down?",
         "The &ldquo;going up or down&rdquo; section answers it from the government&rsquo;s weekly UK average pump prices, "
         "published every Tuesday: this week against last week, four weeks ago and a year ago, with the record highs and a "
         "chart going back to June 2003. It also gives the day-on-day change from our own daily figures for every forecourt, "
         "recorded since 4 October 2026."),
        ("How much of the price of petrol is tax?",
         "Two taxes make up a large part of it: fuel duty, a fixed amount a litre set by the government, and VAT at 20% on top "
         "of the whole price, duty included. Because duty is a fixed amount, its share falls as prices rise. The &ldquo;going up "
         "or down&rdquo; section works out this week&rsquo;s split from the government&rsquo;s own weekly figures."),
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
