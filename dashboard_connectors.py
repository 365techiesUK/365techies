# -*- coding: utf-8 -*-
"""Shared connector library for the dashboard pages.

HONESTY FRAME - read before editing.

The brief asked for drag-and-drop, saved display profiles and a connector
marketplace customers wire up themselves. None of that exists. These
dashboards are built to order, and both pages say so. A page implying
self-service today would be a false claim, and the credibility of every
other page on this site rests on not making those.

So this is the honest version of the same idea: a catalogue of what we CAN
connect to, what each one gives you, and where the catch is. That is true
today, it is genuinely useful to someone deciding whether this is worth a
conversation, and it carries real search surface - every platform name here
is something people search alongside "dashboard".

Each entry states its own limitation. A connector list where everything is
easy is a sales page; one that says "this vendor's cloud-only cameras will
not let anyone read them" is a reference someone trusts.
"""

# (key, label, what it gives you, the honest catch)
CONNECTORS = [
    ("energy", "Solar &amp; battery", "&#9889;",
     "Victron, and most inverters that publish an API or Modbus.",
     "We run our own business off a Victron system, so this is the one we know best."),
    ("elec", "Your electricity supplier", "&#128200;",
     "Half-hourly usage and tariff data where the supplier exposes it.",
     "Coverage varies by supplier. Some publish a proper API, some publish nothing at all."),
    ("cctv", "Cameras &amp; CCTV", "&#128247;",
     "Live views, motion events and clips copied off-site automatically.",
     "Most systems expose a stream. Some budget cloud-only cameras deliberately do not &mdash; we check yours first."),
    ("iot", "IoT sensors", "&#127777;",
     "Temperature, humidity, water leaks, door contacts, freezer alarms.",
     "Anything that speaks MQTT, Zigbee, Z-Wave or a documented API. Closed proprietary hubs are the hard ones."),
    ("net", "Network &amp; Wi-Fi", "&#128225;",
     "Access points, switches, PoE draw, channel utilisation, broadband health.",
     "RUCKUS, UniFi, Aruba and most business platforms. Depends what your controller version exposes."),
    ("vehicle", "Vehicles &amp; fleet", "&#128663;",
     "Location, mileage, fault codes and battery health from a diagnostics dongle.",
     "Via a standards-based OBD or telematics device, not by reverse-engineering a manufacturer app."),
    ("gps", "GPS &amp; route tracking", "&#128205;",
     "Where it is now, the route it took, distance covered, and a geofence that shouts when something leaves an area it should not.",
     "It is <strong>not a theft tracker</strong> &mdash; it is not hidden, it runs off the battery it monitors, and no insurer recognises it. A dedicated tracker still owns that job."),
    ("pet", "Pet &amp; asset trackers", "&#128054;",
     "The dog, the trailer, the tools &mdash; on the same map and the same alarm rules as everything else.",
     "Depends entirely on the tracker. Some publish their data properly; plenty of consumer collars keep it locked inside their own app. We check yours before promising anything."),
    ("slack", "Slack &amp; Teams", "&#128172;",
     "Alerts land where your team already is, instead of another app nobody opens.",
     "We use this ourselves &mdash; every booking and job on our own system pings Slack."),
    ("backup", "Backups &amp; PCs", "&#128190;",
     "Whether last night actually ran, disk health, updates, antivirus state.",
     "Already built &mdash; this is what 365 PC Manager reports into your portal."),
    ("mfg", "Machines &amp; production", "&#9881;",
     "Run hours, output counts, downtime and utilisation from PLCs or line controllers.",
     "Where the equipment publishes it. Older machines may need a sensor retrofit rather than software."),
    ("weather", "Weather", "&#127780;",
     "Forecast for your postcode, tied to whatever it should influence.",
     "Chosen per site &mdash; the point is what it drives, not the forecast itself."),
]

PROPERTIES = [
    ("&#127968;", "Home", "Cameras, power, broadband, backups, the freezer in the garage."),
    ("&#127970;", "Business premises", "Wi-Fi estate, PoE headroom, machines, alarms, multi-site."),
    ("&#9973;", "Boat", "Batteries, bilge, shore power, position &mdash; the things that matter when you are not aboard."),
    ("&#128656;", "Campervan", "Leisure battery, solar, water, fridge, and whether it started this morning."),
    ("&#127958;", "Holiday home", "Heating, damp, leaks and arrivals, from two hundred miles away."),
]


def section():
    """The connector catalogue + property types, as one reusable block."""
    cards = []
    for key, label, icon, gives, catch in CONNECTORS:
        cards.append(
            '<div class="cn__card" data-k="%s">'
            '<div class="cn__ico" aria-hidden="true">%s</div>'
            '<h3>%s</h3><p class="cn__g">%s</p>'
            '<p class="cn__c"><strong>Worth knowing:</strong> %s</p>'
            '</div>' % (key, icon, label, gives, catch))

    props = []
    for icon, name, blurb in PROPERTIES:
        props.append('<div class="cn__prop"><span aria-hidden="true">%s</span><b>%s</b><em>%s</em></div>'
                     % (icon, name, blurb))

    return """
<section class="section section--alt" aria-label="What we can connect">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow eyebrow--center mono" data-reveal>// WHAT WE CAN CONNECT</p>
      <h2 class="section-title section-title--center" data-title>If it publishes its data,
        it can go on the screen<span class="title-underline"></span></h2>
      <p class="lede lede--center" data-reveal>Not a shopping list &mdash; a starting point.
        Each of these says what it gives you and where the catch is, because the catch is
        the bit that decides whether it is worth doing.</p>
    </div>
    <div class="cn__grid">{{CARDS}}</div>

    <div class="cn__props">
      <h3 class="cn__ph">Same idea, different building</h3>
      <div class="cn__prow">{{PROPS}}</div>
    </div>

    <p class="cn__note"><strong>How this actually works.</strong> You can arrange the screen
      yourself &mdash; there is a <a href="/portal/">dashboard studio in the 365 portal</a>, free
      to join, where you drag the tiles about and save the layout to your account. What you do
      not have to do is the wiring. Tell us what you have and what you want to see, and we
      connect it. If something on your list cannot be read, we tell you that before you have
      spent anything, because finding out afterwards is how these projects go wrong.</p>
  </div>
</section>

<style>
.cn__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:.7rem;max-width:1160px;margin:0 auto}
.cn__card{background:var(--panel,#0d1530);border:1px solid var(--line,#2a3b63);border-radius:13px;padding:1rem 1.05rem;transition:border-color .3s,transform .3s}
.cn__card:hover{border-color:var(--cyan,#1d97e3);transform:translateY(-2px)}
.cn__ico{font-size:1.5rem;line-height:1;margin-bottom:.5rem;display:inline-block;animation:cnFloat 4s ease-in-out infinite}
.cn__card:nth-child(2n) .cn__ico{animation-delay:.5s}
.cn__card:nth-child(3n) .cn__ico{animation-delay:1s}
@keyframes cnFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.cn__card h3{margin:0 0 .35rem;font-size:.95rem;color:var(--white,#f0f5fc)}
.cn__g{margin:0 0 .5rem;font-size:.82rem;line-height:1.55;color:var(--soft,#86b6e8)}
.cn__c{margin:0;font-size:.75rem;line-height:1.5;color:var(--mut,#9fb5d3);padding-top:.5rem;border-top:1px solid var(--line,#2a3b63)}
.cn__c strong{color:var(--soft,#86b6e8)}
.cn__props{max-width:1160px;margin:1.6rem auto 0}
.cn__ph{font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:var(--mut,#9fb5d3);text-align:center;margin:0 0 .8rem}
.cn__prow{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:.6rem}
.cn__prop{background:var(--panel,#0d1530);border:1px solid var(--line,#2a3b63);border-radius:12px;padding:.85rem;text-align:center}
.cn__prop span{font-size:1.6rem;display:block;line-height:1;margin-bottom:.4rem;animation:cnFloat 5s ease-in-out infinite}
.cn__prop b{display:block;color:var(--white,#f0f5fc);font-size:.88rem;margin-bottom:.25rem}
.cn__prop em{font-style:normal;font-size:.74rem;line-height:1.5;color:var(--mut,#9fb5d3)}
.cn__note{max-width:900px;margin:1.6rem auto 0;padding:.9rem 1.1rem;border-left:3px solid var(--cyan,#1d97e3);background:var(--panel,#0d1530);border-radius:0 10px 10px 0;font-size:.88rem;line-height:1.65;color:var(--soft,#86b6e8)}
@media (prefers-reduced-motion:reduce){.cn__ico,.cn__prop span{animation:none}.cn__card:hover{transform:none}}
</style>
""".replace("{{CARDS}}", "".join(cards)).replace("{{PROPS}}", "".join(props))


FAQS = [
    ("Can you connect it to my electricity supplier?",
     "Where the supplier exposes the data, yes - half-hourly usage and tariff information can sit "
     "alongside your solar and battery so you can see what you are actually buying and when. "
     "Coverage varies a great deal by supplier: some publish a proper API, others publish nothing. "
     "We check yours before promising anything."),
    ("Can alerts go to Slack or Teams instead of another app?",
     "Yes, and we would usually recommend it. An alert that lands where your team already is gets "
     "read; an alert in a fourteenth app does not. We do this on our own systems - every booking "
     "and completed job on our internal setup pings Slack."),
    ("Can you read data from vehicles?",
     "From a standards-based diagnostics or telematics device, yes - location, mileage, fuel "
     "economy, fault codes and battery health. We work from documented interfaces rather than by "
     "reverse-engineering a manufacturer's app, because anything built that way breaks the next "
     "time they update it."),
    ("Can I see where the van is, and get told if it moves?",
     "Yes - live position, the route it took, the miles it covered, and geofences you draw "
     "yourself so the dashboard raises an alarm when something leaves an area, or when its "
     "signal drops. On a Victron system the GPS can come from the GX itself; on a vehicle it "
     "comes from a diagnostics or telematics device. Credit where it is due: Victron's own VRM "
     "portal already does geofencing and keeps a position history. What we add is your own "
     "screen, several vehicles on one map, and route history that does not expire after six "
     "months. <strong>It is not a theft tracker</strong>, and we will not sell it as one: it is "
     "not concealed, it runs off the battery bank it is watching, and no insurer recognises it."),
    ("Can I design my own dashboard and save layouts?",
     "Yes - there is a dashboard studio in the 365 portal, and it is free to join and play with. "
     "Drag the tiles where you want them, take off what you do not care about, save the layout to "
     "your account and it follows you to any device. Being precise about what is real in it: on a "
     "365 support plan the tiles about the computers we look after read your own account, and "
     "every other tile is clearly marked as a sample of what we could connect. Making one of "
     "those samples real - your cameras, your solar, your sensors - is still a build we do for "
     "you, because it needs someone to check what your equipment actually publishes first."),
    ("Does it work for a boat, a campervan or a holiday home?",
     "Those are some of the best uses for it, because they are the buildings you are not standing "
     "in. Batteries and bilge on a boat, leisure power and whether it started this morning on a "
     "campervan, heating and damp and leaks on a holiday home two hundred miles away."),
    ("What if something I want cannot be connected?",
     "We tell you before you have spent anything. Some equipment simply does not publish its data, "
     "and some budget cloud-only cameras deliberately prevent anyone else reading them. Finding "
     "that out afterwards is how these projects go wrong, so we check first."),
]
