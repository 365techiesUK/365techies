# -*- coding: utf-8 -*-
"""
Content for the three WiFi diagnosis playbooks. Structure lives in playbook_pages.py.

HOW THIS WAS WRITTEN, AND WHY THAT MATTERS FOR ANYONE EDITING IT
    Each page was drafted against the /ruckus-r510-unreliable-wifi-fix/ model and then
    put through a hostile fact-check whose only job was to find invented figures,
    technical errors and anything that would embarrass us in front of someone who knows
    the subject. It found 71 corrections across the three pages. The ones worth
    remembering, because they are easy to reintroduce:

      * Mobile handover between masts is measured in MILLISECONDS. A dropout lasting a
        minute is the router losing usable coverage and re-attaching to a new cell, not
        a handover. The first draft got this wrong; do not put it back.
      * Being listed in Victron's Recommended Software Integrator Program is a SOFTWARE
        listing. It must never be cited as backing for electrical or 12V advice - that
        implies an endorsement Victron has not given. "We run our own off-grid van" is
        the honest version, and it is enough.
      * Captive-portal session lengths are set by each site. No figure may be quoted.
      * Roaming is the CLIENT's decision. Every claim that infrastructure "hands over"
        a device has to survive that sentence.
      * UK mobile signal repeaters are legally distinct from WiFi boosters and are
        governed by the Wireless Telegraphy (Mobile Repeater) (Exemption) Regulations
        2022. Point readers at Ofcom's current guidance; quote no fine amounts.

    Anything that cannot be verified is either labelled as a rule of thumb in the
    sentence itself, or it is not here at all.

GENERATED once from the verified workflow output, then maintained by hand.
"""

# slug, card title, card blurb - the family nav on every playbook
FAMILY = [
    ("wifi-keeps-dropping", "WiFi keeps dropping at home", "Intermittent drops on a home broadband line: is it the WiFi, the line, or one misbehaving device?"),
    ("wifi-drops-moving-between-access-points", "WiFi drops as you walk about", "Several access points and a controller: sticky clients, roaming, and why turning the power up makes it worse."),
    ("campervan-wifi-keeps-dropping", "Campervan and motorhome WiFi", "Four links can drop in a vehicle &mdash; including the 12V supply nobody checks. Diagnose before you buy."),
]

PLAYBOOKS = [
{
    "slug": "wifi-keeps-dropping",
    "tool": {
        "eyebrow": "MEASURE IT, DO NOT GUESS",
        "head": "Score every room in ten minutes, before you spend anything",
        "body": """Our <a href="/wifi-signal-test/">free WiFi test</a> runs in a browser with no sign-up and scores each room in the house. It turns &ldquo;it keeps dropping upstairs&rdquo; into numbers you can put in the drop diary &mdash; and numbers are what a provider acts on when a description gets nowhere.""",
        "href": "/wifi-signal-test/",
        "btn": "Run the free test",
    },
    "crumb": "WiFi Keeps Dropping",
    "title": "WiFi Keeps Dropping? Find the Real Cause First",
    "schema_name": "WiFi Keeps Dropping: The Diagnosis Playbook",
    "og_title": "WiFi Keeps Dropping? Diagnose It Before You Replace Anything",
    "desc": "WiFi keeps dropping out? Tell a WiFi fault from a broadband fault, log the pattern that proves it, and find out what not to buy.",
    "eyebrow": "// HOME DIAGNOSIS PLAYBOOK",
    "h1": """WiFi keeps <em class="grad grad--cyan">dropping</em>? Diagnose it before you replace anything""",
    "lede": "WiFi that drops for a few seconds and comes back is one of the hardest faults to pin down, because it has usually gone by the time anyone looks at it. This page is the method we use: separate a WiFi fault from a broadband fault, log the pattern so it can be proved, then decide whether it is your kit, your line or your provider — before you buy anything.",
    "chips": [
        "Free method, no sign-up",
        "Written for UK homes",
        "We tell you when not to spend",
    ],
    "cta_head": "Still dropping after all that?",
    "cta_sub": "Send us a week of your drop diary and a photo of the router&rsquo;s lights. We will tell you whether it is the line, the kit or the house &mdash; no charge for the answer, and no obligation.",
    "cta_secondary": ("Home support plans", "/home-it-support-plans/"),
    "sections": [
        {
            "h2": "One device, or everything in the house?",
            "kind": "triage",
            "html": """<ul>
<li><strong>You genuinely cannot tell yet.</strong> Next time it goes, do not touch anything for sixty seconds. Look at a second device in a different room, and look at the router&rsquo;s broadband light. Those two glances decide which half of this page you need, and they cost you nothing.</li>
<li><strong>One device drops and everything else in the house carries on.</strong> The fault is on that device, not on the router. Go straight to the table further down &mdash; a laptop and a phone drop for different reasons, and both are normally fixed in a settings menu rather than with money.</li>
<li><strong>Everything dies at the same moment, including anything plugged in with a cable.</strong> Then this is not a WiFi fault at all. The next section is the important one for you: you are looking at the broadband line or the router itself.</li>
<li><strong>Nothing is connecting at all right now, and it has been dead for a while.</strong> That is an outage rather than an intermittent fault, and it needs a different first hour. Our <a href="/broadband-down/">broadband down</a> guide is written with businesses in mind, but the order of the checks is the same at home.</li>
<li><strong>It never actually disconnects &mdash; pages just crawl and video stalls.</strong> Different fault, different page. Go to <a href="/wifi-troubleshooting/">WiFi troubleshooting</a> instead of reading on here.</li>
<li><strong>It only happens in one room, upstairs, or down the end of the garden.</strong> That is coverage, and coverage kit genuinely does fix coverage. Read <a href="/mesh-wifi-systems-uk/">mesh WiFi systems</a>.</li>
<li><strong>This is a business, with staff, and probably an access point or two on the ceiling.</strong> The causes and the fixes are different. Go to <a href="/office-wifi-keeps-dropping-out/">business WiFi that keeps dropping out</a>.</li>
<li><strong>You are in a motorhome, a campervan or on a boat.</strong> A mobile signal behaves nothing like a fixed line, and most of what follows assumes a fixed line. Read <a href="/campervan-wifi-keeps-dropping/">campervan WiFi that keeps dropping</a> instead.</li>
</ul>""",
        },
        {
            "h2": "Did the broadband drop, or did the WiFi drop?",
            "kind": "prose",
            "html": """<p>This is the whole page in one question, and it is the one that usually gets skipped. Two completely different faults produce the identical complaint &mdash; &ldquo;the WiFi keeps dropping&rdquo; &mdash; and until you know which one you have, everything you try afterwards is a guess.</p>
<p><strong>A WiFi drop</strong> is a break in the short wireless hop between your device and the router. The broadband line underneath it never moves.</p>
<p><strong>A broadband drop</strong> is the line itself letting go and re-establishing. The WiFi is working perfectly the whole time &mdash; there is simply nothing on the other end of it.</p>
<p><strong>The test takes one drop and no equipment.</strong> Plug one computer into the router with an Ethernet cable and leave it there. If you have no cable and nothing to plug in, the next best thing is a phone or tablet sat on the router itself, close enough that signal strength cannot possibly be the issue. Then wait for the fault.</p>
<ul>
<li><strong>The wired machine keeps working while the wireless devices drop.</strong> That is a WiFi fault. The line is fine.</li>
<li><strong>The wired machine dies at exactly the same instant as everything else.</strong> That is the line or the router. No amount of WiFi kit will touch it.</li>
<li><strong>The device sat on top of the router drops too.</strong> Same conclusion, one step less certain &mdash; but if it cannot hold a connection from six inches away, distance is not your problem.</li>
</ul>
<p><strong>What a line resync actually looks like.</strong> The router&rsquo;s broadband light &mdash; the one usually labelled broadband, DSL, internet or WAN, depending on the make &mdash; goes out, flashes, or changes colour, and then settles again after a gap while the line retrains. On copper connections that gap is commonly a minute or two, though it varies by line and by provider, so treat that as a rough expectation rather than a specification. Every device in the house loses the internet at the same second, and they all come back at the same second. On full fibre, where there is no copper line to resync, a drop usually shows on the small box the fibre enters the house through, or as the router losing its connection to the provider.</p>
<p><strong>What a wireless disconnect looks like.</strong> The broadband light never wavers. The wired machine never notices. Devices go one at a time, or the ones furthest away go while the ones nearby stay, and they often reconnect on their own within a few seconds.</p>
<p><strong>Where to find the evidence.</strong> Most routers and ISP hubs keep an event log, and it is the thing people are least likely to have opened. Sign in to the router from a browser on the home network &mdash; the address and the default password are usually printed on a sticker on the underside &mdash; and look under a status, advanced, or troubleshooting section. It will be called something like event log, connection log, system log or helpdesk. Menu names differ on every make and change between firmware versions, so hunt rather than follow instructions from a web page.</p>
<p>What you are hunting for is a repeating pair of entries showing the connection going down and coming back up, with a time against each one. Those timestamps are worth more than any speed test, because they are the only record that survives the fault ending. Copy out a week of them and you have something a provider can act on.</p>""",
        },
        {
            "h2": "The drop diary",
            "kind": "steps",
            "html": """<ol>
<li><strong>Start a note on your phone, or a sheet of paper by the router.</strong> Whichever you will actually use at half past nine on a Tuesday evening when it happens again. The best diagnostic tool in this fault is a biro.</li>
<li><strong>Record the date and the time to the minute.</strong> Not &ldquo;evening&rdquo;. Not &ldquo;yesterday&rdquo;. The minute is what turns a complaint into a pattern, and patterns are what get fixed.</li>
<li><strong>Record who it happened to and where they were.</strong> Back bedroom, kitchen, sofa. If every entry names the same room, you are looking at coverage and you should be on the <a href="/mesh-wifi-systems-uk/">mesh systems page</a> instead.</li>
<li><strong>Record whether it was one device or all of them.</strong> This is the single most valuable column. A diary where one column says &ldquo;laptop only&rdquo; twelve times has already told you the answer.</li>
<li><strong>Record wired or wireless.</strong> If a cabled device is in the house, note whether it dropped too, every single time. This is the column that decides whether your provider has a case to answer.</li>
<li><strong>Record what was happening.</strong> A video call, a film streaming, a large upload, or nothing at all. Drops that only ever land during calls point somewhere quite different from drops that happen when the house is asleep.</li>
<li><strong>Record how long it lasted, and what ended it.</strong> Came back on its own after ten seconds is a different fault from needed the router restarting. Be honest about which one it was, including the times you restarted the router out of habit before waiting to see.</li>
<li><strong>Add the objective record: a continuous ping from a wired machine.</strong> This sounds technical and is not. On a Windows PC, open Command Prompt and type <strong>ping -t 1.1.1.1</strong> then press Enter. On a Mac, open Terminal and type <strong>ping 1.1.1.1</strong>. Leave the window open in a corner of the screen. While the connection is healthy it sends one small message a second and prints the reply. When the connection breaks the replies stop and you get &ldquo;Request timed out&rdquo; lines instead; when it comes back, the replies resume. One warning, because it catches people out: <strong>do not count those timeout lines as seconds.</strong> Windows waits up to four seconds for each unanswered reply, so a short run of timeout lines can cover far more time than it appears to. Note the clock time when the replies stop and when they return, or photograph the window. Run the same thing on a wireless device at the same time and the comparison writes itself.</li>
<li><strong>Keep it for three to seven days before you ring anyone.</strong> That is a rule of thumb rather than a rule &mdash; the point is simply to cover a full weekend as well as weekdays, because household patterns and neighbourhood patterns are completely different on a Saturday.</li>
</ol>""",
        },
        {
            "h2": "When the drops run to a timetable",
            "kind": "prose",
            "html": """<p>Once you have a week of entries, read down the time column before you read anything else. Intermittent faults are less random than they feel &mdash; a good many of them only look random until somebody writes them down.</p>
<p><strong>The same time every night.</strong> A drop that keeps to a schedule usually has something scheduling it. Check the router for an automatic reboot timer, a WiFi schedule, or a parental-control window that switches the wireless off and back on. Check whether anything in the house is on a plug timer, including the router itself. If nothing on your side explains it, the remaining candidates are a neighbour&rsquo;s equipment coming on at a fixed hour, or maintenance on your provider&rsquo;s side. Any of those is findable; none of them is fixed by new hardware.</p>
<p><strong>Only when it rains, or in the day or two afterwards.</strong> On a copper line this is the classic signature of moisture getting into a joint somewhere outside &mdash; at a pole, in a footway box, or where the line enters the building. It is commonly reported and it is the pattern engineers recognise fastest, though we would not claim every rain-linked fault has that cause. If your diary shows drops clustering with the weather, say so explicitly when you report it. It changes what gets tested.</p>
<p><strong>Only when the microwave, a baby monitor or a camera is running.</strong> The 2.4&nbsp;GHz band is crowded, and there are two different things going on in it. A microwave oven genuinely radiates near 2.4&nbsp;GHz and interferes with WiFi while it runs; so do some baby monitors and older cordless gear, though plenty of monitors use other frequencies entirely and are innocent. Cameras and video doorbells are a different story &mdash; they are usually WiFi devices themselves, so they compete for airtime on the band rather than jamming it. Either way it affects wireless only, a wired machine sails through it, and the fix is channel choice or moving the router, not a new router.</p>
<p><strong>Worse when the house is full.</strong> More people means more devices, more neighbouring networks in the evening, and a busier band. Again, wireless only. If your diary shows the line itself dropping when the house is full, that is a coincidence of timing rather than a cause, and the line is still the thing to chase.</p>
<p><strong>And one honest warning about nightly reboots.</strong> On copper broadband &mdash; anything still running over a phone line rather than fibre to the property &mdash; the network runs an automatic line management system. It watches each line for disconnections and errors over time, and where it sees a lot of them it will generally settle that line onto a more cautious profile: a lower connection rate, or more error correction, traded for stability. That behaviour exists to keep unreliable lines usable, and it is doing its job. But it means a router rebooted every night is a line disconnected every night, and over weeks that can leave you on a more cautious profile than you started with. We are describing how line management generally works rather than quoting any figure, because the thresholds are not published. The practical point stands: a nightly reboot treats the symptom, hides the pattern, and can cost you speed you do not get back without asking for the profile to be reset.</p>""",
        },
        {
            "h2": "One device or all of them?",
            "kind": "table",
            "html": """<div class="cmp-wrap"><table class="cmp-table">
<thead><tr><th>What you see</th><th>What it usually means</th><th>What to do</th></tr></thead>
<tbody>
<tr><th scope="row">Only one laptop drops. Everything else is fine.</th><td>Windows power saving switching the wireless adapter off to save battery, or an old or generic wireless driver. Common on laptops that drop after the lid has been closed or when the battery is low.</td><td>In Device Manager, open the wireless adapter&rsquo;s properties and turn off the option allowing the computer to switch the device off to save power. Then get the wireless driver from the laptop maker&rsquo;s own support site rather than relying on Windows Update.</td></tr>
<tr><th scope="row">Only one phone drops, or it flips to mobile data on its own.</th><td>Phone-side network switching. Both Android and iPhone will fall back to mobile data when they judge the WiFi to be poor. On an iPhone this is WiFi Assist, which quietly routes app traffic over mobile while staying joined to the network. To you it just looks like the WiFi dropped.</td><td>On an iPhone the switch is in Settings under Mobile Data, near the bottom of the list &mdash; not in the WiFi settings. On Android it goes by different names depending on the maker, such as adaptive connectivity, smart network switch or auto-switch to mobile network, so search the settings rather than follow a fixed path. Turn it off while you test, then forget the network and rejoin it. If the drops stop, it was never the router.</td></tr>
<tr><th scope="row">Everything drops together, wired devices included.</th><td>The broadband line or the router. Nothing wireless is involved at all.</td><td>Open the router&rsquo;s event log and find the disconnect entries. Keep the drop diary above for a week, then report it with the timestamps. See the last section for how to make that report stick.</td></tr>
<tr><th scope="row">Only devices upstairs or at the far end of the house drop.</th><td>Coverage. The signal is not reaching reliably, so devices hang on at the edge and let go.</td><td>This is a different fault with a different fix, and coverage kit genuinely solves it. Measure it room by room first with our <a href="/wifi-signal-test/">free WiFi signal test</a>, then read <a href="/mesh-wifi-systems-uk/">mesh WiFi systems</a>.</td></tr>
<tr><th scope="row">It only ever happens on video calls.</th><td>Congestion or interference rather than a hard drop. Calls are the least forgiving thing on a home network &mdash; a two-second gap that nobody notices while streaming will end a call.</td><td>Test on 5&nbsp;GHz rather than 2.4&nbsp;GHz if your router offers both, move away from microwaves and monitors, and try the same call on a cable. If the cable is clean, it is wireless, and it is fixable without replacing the line.</td></tr>
<tr><th scope="row">It started right after a new device joined the network.</th><td>Often an address clash. The router hands out addresses from a pool, and a device with a fixed address set by hand &mdash; frequently a printer or a camera &mdash; can end up holding one the router later gives to something else.</td><td>Restart the router and the new device and see whether it settles. If it recurs, take the fixed address off whichever device has one and let the router allocate it, or move that address outside the router&rsquo;s pool.</td></tr>
<tr><th scope="row">The extender&rsquo;s network drops, but the main one is steady.</th><td>A single-band extender has one radio, so it receives and resends on the same channel and roughly halves what gets through. Devices also cling to an extender long after they have walked back into good main-router signal.</td><td>Unplug the extender for a day and see whether the complaints move or vanish. If they vanish, do not simply buy a better extender &mdash; either move the router, or read <a href="/mesh-wifi-systems-uk/">mesh WiFi systems</a>, which is a different design and does not fail the same way.</td></tr>
</tbody>
</table></div>""",
        },
        {
            "h2": "The purchase that almost never fixes this",
            "kind": "trap",
            "html": """<p>Here is the trap, and it is an expensive one. A mesh system, a booster, an extender, a new router with more aerials &mdash; every one of those sits <em>behind</em> your broadband line. They improve how the signal travels around your house. They can do absolutely nothing about a line that keeps letting go, because when the line drops, the mesh drops with it, in perfect health, distributing nothing.</p>
<p>It is the wasted purchase we see most often in this fault, and it is an easy one to make, because the symptom genuinely does feel like weak WiFi. Devices stall, they say &ldquo;connected, no internet&rdquo;, they recover when you walk nearer the router purely because that is when the line happened to come back. Buy the kit, install it, and for the first day or two it will seem better. Then the pattern returns unchanged and the money has gone.</p>
<p>Telling them apart before you spend takes one drop, not one purchase. If a device on a cable, or a device sat on the router itself, dies at the same instant as everything else, coverage kit will not help you and you should not buy any. If the wired machine sails through while the wireless devices fall over, then and only then is coverage worth spending on &mdash; and even then, measure the weak rooms first so you know how much you need.</p>""",
        },
        {
            "h2": "When it IS your provider &mdash; and how to make the report stick",
            "kind": "dontbuy",
            "html": """<p>If your evidence points at the line, the next problem is not technical. It is getting the fault accepted. &ldquo;It keeps dropping&rdquo; is one of the most common things a support desk hears, and the standard response &mdash; restart the router, run a speed test, we can see no fault on the line &mdash; is designed for the caller who has nothing written down. An intermittent fault is invisible to a live line test, because by the time anyone runs one, the line is up.</p>
<p>What changes the conversation is evidence that exists whether or not the fault is happening at that moment:</p>
<ul>
<li><strong>The drop diary, read out with dates and times.</strong> Twelve dated entries beat any adjective. If they cluster &mdash; every night at the same hour, every time it rains &mdash; lead with that, because it tells the person on the phone what kind of fault it is.</li>
<li><strong>The wired test, stated plainly.</strong> &ldquo;A computer connected by Ethernet cable loses the connection at exactly the same moment as the wireless devices&rdquo; removes their easiest explanation in one sentence.</li>
<li><strong>The router&rsquo;s own connection log.</strong> The disconnect and reconnect entries, with timestamps, ideally photographed or copied out. This is your equipment&rsquo;s own record, not your impression of events.</li>
<li><strong>What you have already ruled out.</strong> Say that you have restarted, that you have tried a different device, and that the fault follows the line rather than any one device. It stops the first ten minutes being spent on things you did last week.</li>
</ul>
<p>What to ask for, in this order: a line test while you are on the phone; a check of the line&rsquo;s recent error and disconnection history, which they can see and you cannot; and, if the pattern is physical &mdash; weather-linked, or worsening over months &mdash; an engineer visit to inspect the external line and its joints rather than another remote reset. If the line has been put on a cautious profile because of repeated dropouts, ask what happens to that profile once the underlying fault is repaired.</p>
<p>And be realistic about the record. Ask them to log the fault with a reference number every time you call, even when the call ends with nothing done. A pattern of logged calls is what eventually escalates a fault; three unlogged conversations count for nothing.</p>
<p>On money: there is an automatic compensation scheme in the UK covering things such as total loss of service, missed engineer appointments and delayed starts. It is a voluntary industry scheme rather than a universal right &mdash; most of the large providers have signed up to it, but not every provider has. We are deliberately not printing amounts or qualifying periods here, because they change, and because intermittent drops are treated differently from a complete loss of service. Check the current position with your provider, or on Ofcom&rsquo;s own site, rather than trusting a figure on any web page including this one.</p>
<p>If you have kept the diary, done the wired test and still cannot get anywhere, ring us on 01202 775566 and talk it through. Often the useful thing we do is not technical at all &mdash; it is telling you which of your entries is the one worth leading with. We would rather more people could win this argument themselves.</p>""",
        },
    ],
    "faqs": [
        ("Why does my WiFi keep dropping out?", "Because two different faults produce the same complaint. Either the wireless hop between your devices and the router is breaking, or the broadband line itself is dropping and taking the wireless with it. Separate them before anything else: leave one device plugged in with an Ethernet cable, or sat right beside the router, and see whether it survives the next drop. If it does, the fault is wireless. If it dies too, the line is your problem."),
        ("Why does my internet keep cutting out at the same time every night?", "A drop that keeps to a schedule usually has something scheduling it. Look for a router reboot timer, a WiFi off-schedule, a parental-control window, or a plug timer. If nothing on your side explains it, the remaining suspects are a neighbour's equipment switching on at a fixed hour, or maintenance on your provider's side. Note the exact minute for several nights running before you ring anyone."),
        ("How do I know if it's my router or my broadband provider?", "Watch a wired device and the router's broadband light through one drop. If a cabled machine keeps working and the light stays steady, the line is fine and the fault is inside your house. If everything dies at once and the broadband light flickers or changes colour, the line is resyncing, and that is your provider's territory. The router's own event log will normally show the same disconnection with a timestamp."),
        ("Will a mesh system or WiFi booster stop my WiFi dropping?", "Only if the cause is coverage. Mesh systems and extenders fix weak signal in far corners of a house. They sit behind your broadband line, so they can do nothing about a line that keeps resyncing, and they will drop right along with everything else. If a device on a cable dies at the same instant as your wireless devices, coverage kit will not help. Prove it is coverage before spending."),
        ("Why does my laptop keep disconnecting from WiFi when other devices are fine?", "When one device drops and the rest carry on, the device is the fault. On Windows laptops the usual cause is power saving switching the wireless adapter off to save battery, often after the lid has been closed or the battery has run low. Old or generic wireless drivers do the same thing. In Device Manager, turn off power saving for the adapter, then install the driver from the laptop maker's support site."),
        ("Why does my phone drop WiFi and switch to mobile data?", "Both iPhone and Android fall back to mobile data when they judge a WiFi connection to be poor, which looks exactly like the WiFi dropping. On an iPhone the feature is WiFi Assist, and the switch is in Settings under Mobile Data rather than in the WiFi settings. On Android it has different names depending on the manufacturer, so search the settings for the option that switches to mobile data automatically. Turn it off while you test."),
        ("Should I reboot my router every night to stop it dropping?", "We would not. On copper broadband, an automatic line management system watches each line for disconnections and errors, and a line that keeps dropping tends to be settled onto a more cautious, slower profile for stability. A nightly reboot is a nightly disconnection. Over weeks it can leave you worse off than you started, and it erases the very pattern you need in order to get the real fault repaired."),
        ("How many times a day is it normal for broadband to drop?", "There is no official figure and providers judge it case by case. In our experience a healthy connection holds for days or weeks between resyncs, and drops you notice several times a day are worth reporting. What decides whether a fault gets accepted is not the number itself but the evidence behind it: dated, timed entries showing a pattern, plus a wired test proving it is not your wireless."),
        ("Can I get money back if my broadband keeps dropping?", "There is an automatic compensation scheme in the UK covering things like total loss of service, missed engineer appointments and delayed installations. It is voluntary, so most large providers have signed up but not all have, and the qualifying rules, waiting periods and amounts change over time. Intermittent drops are also treated differently from a full loss of service. Check the current position with your provider or on Ofcom's own site rather than trusting a figure on a web page."),
    ],
},
{
    "slug": "wifi-drops-moving-between-access-points",
    "tool": {
        "eyebrow": "THE WALK TEST, WITHOUT THE KIT HIRE",
        "head": "Walk the route and record what people actually get",
        "body": """Our <a href="/wifi-signal-test/">free WiFi test</a> has a business mode built for exactly this: walk your fixed route, record each spot, and keep the result as a branded PDF. It will not replace a controller survey, but it gives you the before-and-after evidence that settles whether a change helped.""",
        "href": "/wifi-signal-test/",
        "btn": "Open the business mode",
    },
    "crumb": "Roaming and Sticky Clients",
    "title": "WiFi Drops When Moving Between Access Points",
    "schema_name": "WiFi Drops When Moving Between Access Points",
    "og_title": "WiFi Drops When You Walk Around? Roaming, Diagnosed Properly",
    "desc": "Devices cling to the wrong access point and sessions die mid-walk. The walk test that finds it, and why louder access points make it worse.",
    "eyebrow": "// ROAMING PLAYBOOK &middot; FOR IT MANAGERS",
    "h1": """WiFi drops when you <em class="grad grad--cyan">walk around</em> the building?""",
    "lede": "Staff walk from the office to the warehouse and their session dies, then recovers a few seconds later. The infrastructure looks perfect in the controller. This page explains the one fact that makes sense of it: roaming is decided by the client device, not by your access points. Then it gives you the ordered walk test that finds the fault.",
    "chips": [
        "Roaming is the client&rsquo;s decision",
        "Vendor-neutral",
        "We sell no vendor&rsquo;s kit",
    ],
    "cta_head": "Want someone to walk the floor with you?",
    "cta_sub": "We survey multi-access-point sites across Dorset and Hampshire, and we will tell you honestly if the answer is configuration rather than hardware &mdash; that answer costs you nothing to hear.",
    "cta_secondary": ("Business WiFi installation", "/business-wifi-installation/"),
    "sections": [
        {
            "h2": "Which fault is this really?",
            "kind": "triage",
            "html": """<p>Six complaints get described in the same words. Only one of them is a roaming fault, and the fix for the other five is somewhere else entirely. Find yours before you change a single setting.</p>
<ul>
<li><strong>It only fails when someone is walking.</strong> Sitting at a desk, everything is fine. Cross the building on a call or a stock lookup and the session dies, then recovers a few seconds later in a new spot. That is a roaming fault, and this is the page for it &mdash; keep reading.</li>
<li><strong>Access points drop off the controller on a timetable, whether anyone is moving or not.</strong> The same units, at roughly the same times, often overnight or on the hour. That is an infrastructure fault and nothing to do with roaming. Start with <a href="/access-points-dropping-off-controller/">access points dropping off the controller</a>.</li>
<li><strong>One area is always bad, standing still as well as walking.</strong> The far corner, the loading bay, the meeting room at the end. That is coverage or interference, not roaming. Measure it properly with our <a href="/wifi-signal-test/">free WiFi signal test</a> first, and if the hole is real it is a design job &mdash; see <a href="/business-wifi-installation/">business WiFi installation</a>.</li>
<li><strong>One router, or two or three standalone access points, no controller.</strong> Devices moving between separately configured boxes behave differently from devices moving around a managed estate. Go to <a href="/office-wifi-keeps-dropping-out/">office WiFi keeps dropping out</a>.</li>
<li><strong>A home or small-office mesh system rather than a managed estate.</strong> Different kit, different settings, different answers. Start with our <a href="/mesh-wifi-setup-guide/">mesh WiFi setup guide</a>.</li>
<li><strong>Wired machines stutter at the same moments.</strong> If a desktop on a cable hesitates when the walkers complain, the WiFi is a bystander and the problem is upstream. Start at <a href="/broadband-down/">broadband down</a>.</li>
</ul>""",
        },
        {
            "h2": "Why your laptop clings to an access point two rooms away",
            "kind": "prose",
            "html": """<p>Here is the fact that makes the rest of this page make sense, and the reason roaming projects so often disappoint: <strong>the client decides when to roam. The access point does not.</strong></p>
<p>Your controller can encourage, hint, advertise neighbours and, on some platforms, actively nudge a device towards the door. Most platforms also offer a blunter tool: a minimum signal level below which the controller simply disconnects the client and makes it associate again. That forces a fresh decision &mdash; it does not make the decision. A client you have kicked off is free to reconnect to the very access point it was just removed from, and often does.</p>
<p>And most clients use a stubborn rule: <em>stay where you are until this connection becomes genuinely poor</em>. Not &ldquo;move when something better appears&rdquo; &mdash; that is a different rule, and few clients implement it. So a laptop that has walked past three nearer access points carries on talking to the one above the desk it left, because that link is still, just about, working.</p>
<p>&ldquo;Just about working&rdquo; is where the damage happens. As the signal weakens, the client and the access point negotiate down to slower and slower data rates. Retries climb. The same email, the same stock lookup, the same Teams call now needs several times the airtime it needed at the desk &mdash; and it is taking that airtime from everyone else on the same radio.</p>
<p>The user is not disconnected. They are being starved. Then, somewhere near the far end of the walk, the link finally fails, the device re-associates, and everything is fine again.</p>
<p>That is why the complaint is usually described as a cliff edge and the data rarely shows one. It is a slow starve with an abrupt ending. The user reports the ending.</p>
<p>It also explains one of the things that most frustrates IT managers about this fault: <strong>new access points change what the estate offers, not what the client decides</strong>. You can replace every unit in the building and the same laptop will make the same bad choice, faster.</p>""",
        },
        {
            "h2": "The ordered diagnosis: walk it, then read it",
            "kind": "steps",
            "html": """<ol>
<li><strong>Pick one fixed route and write it down.</strong> Same start, same finish, same doors, same walking pace. Number eight to twelve stopping points along it &mdash; the desk, the corridor, the top of the stairs, the aisle head, the packing bench. Everything below is worthless without a route you can repeat exactly, because you are going to walk it again after every change.</li>
<li><strong>Take two test devices, not one.</strong> A current laptop or phone, and one example of the oldest kit that actually has the problem: a handheld scanner, a VoIP handset, a legacy tablet. They will behave completely differently, and that difference <em>is</em> the diagnosis. A route walked with only a new laptop will tell you the estate is fine.</li>
<li><strong>Record which access point each device is associated with at every numbered point.</strong> Your controller shows this in the client list &mdash; the access point name and the signal it is hearing from that client. Write it down point by point, for both devices. This single table is the whole test.</li>
<li><strong>Mark where handover actually happened against where it should have happened.</strong> If the device is still on access point 1 while you are standing directly underneath access point 4, you have your answer and it is not a coverage problem. Note the signal level at the moment it finally let go &mdash; that number is the client&rsquo;s own threshold, revealed.</li>
<li><strong>Check transmit power across the estate, before anything else.</strong> This is one of the most common self-inflicted roaming faults in a managed network. If every radio is turned up near maximum, every access point is audible from everywhere, so no client ever reaches the point where its current link feels bad enough to leave. An estate that shouts has no cell edges &mdash; and roaming needs cell edges to happen at.</li>
<li><strong>Check the minimum and basic data rates.</strong> If the lowest legacy rates are still enabled, a client can hang on at a barely usable rate from a very long way away, which is exactly the behaviour you are trying to stop. Raising the minimum rate turns the edge of each cell into a real edge. Raise it in steps, and watch the oldest kit at every step, because the oldest kit is what those low rates were left on for.</li>
<li><strong>Check band steering &mdash; whether it is on, and how hard it pushes.</strong> Moving a dual-band client to 5GHz is usually right. But steering aggressively onto a band with shorter reach can leave a device hanging on the edge of a 5GHz cell in a spot where the 2.4GHz radio would have served it perfectly well. Look for devices that are on 5GHz at a signal level you would not accept.</li>
<li><strong>Check 802.11k, 802.11v and 802.11r: supported, enabled, and on which SSIDs.</strong> 802.11k gives a client a neighbour list so it does not have to scan blindly. 802.11v lets the network suggest a better access point &mdash; a suggestion the client may simply ignore. 802.11r speeds up the reconnection once the client has decided to move, which is what matters for voice. None of the three takes the decision away from the client. They make the client&rsquo;s decision better informed and quicker to act on, which is not the same thing and is worth saying out loud before you promise anyone a fix.</li>
<li><strong>Work out which clients stick.</strong> Sort the complaints by device model rather than by location. It is usually the oldest and cheapest radios: handheld scanners, older Android tablets, budget laptops with basic wireless cards. Many enterprise handhelds carry their own roaming thresholds in the device or MDM configuration, documented in the manufacturer&rsquo;s admin guide. That one setting often matters more than anything you can change on the controller.</li>
<li><strong>Only now change something &mdash; one thing, in one area.</strong> Then walk the same route again, with the same two devices, and compare it against the table you already have. If you change three settings across the whole estate in one evening, you will never know which one mattered, or which one you will have to undo on a trading day.</li>
</ol>""",
        },
        {
            "h2": "The double trap nobody warns you about",
            "kind": "trap",
            "html": """<p><strong>Trap one: turning the power up makes roaming worse.</strong> This catches a lot of people, because it is the exact opposite of instinct &mdash; devices are dropping, so surely they need more signal. What more signal actually buys you is an estate where every access point can be heard from everywhere, and therefore an estate where no client ever feels the need to leave the one it has. The coverage map looks superb. The floor roams like treacle. The usual fix for sticky clients is to turn power <em>down</em>, in steps, until each cell has a real boundary that a walking device can feel. It feels wrong to do. It is what works.</p>
<p><strong>Trap two runs the other way: enabling fast roaming across the whole estate can take your oldest kit offline.</strong> 802.11r in particular is commonly reported to break association for some legacy handhelds, barcode scanners and older VoIP handsets &mdash; they either refuse to join the SSID at all, or join and fall off repeatedly. Vendor documentation does warn that client support varies, and that some older clients may refuse to associate once fast transition is advertised; what nobody publishes is a per-model list, so the only way to know is to test. It is very model-specific: two scanners from the same manufacturer, two firmware revisions apart, can behave differently.</p>
<p>So the change that transforms the office can be the change that stops the warehouse working &mdash; and it will not look connected, because the person who ticked the box is not the person picking stock. Enable it on one SSID, in one area, and watch the oldest device you own for a full working day before you go estate-wide. If it turns out you need fast roaming for the office and cannot have it on the handhelds, a separate SSID for the legacy kit is a legitimate design decision, not an admission of defeat.</p>""",
        },
        {
            "h2": "Warehouses, workshops and multi-floor buildings",
            "kind": "prose",
            "html": """<p>An open-plan office is the easy version of this problem. Roaming faults get their real character from buildings full of metal, stock and floors.</p>
<p><strong>Racking reflects rather than blocks.</strong> Steel racking, roller shutters, mesh cages and stacked metal stock bounce signal around instead of politely absorbing it. Signal travels down an aisle far better than it travels across one, so a device three aisles away can hear an access point more clearly than a device two racks away. The client picks whatever it hears best, which in a warehouse is regularly not the nearest thing. Coverage maps drawn on a floor plan do not describe this well.</p>
<p><strong>The building changes every week.</strong> A full warehouse and an empty warehouse are two different radio environments. Pallets of liquid absorb, pallets of metal reflect, and an aisle that was clear in January is a wall in November. A survey done against empty racking describes a building that will not exist when you are busy. If your roaming complaints rise and fall with stock levels, that is not coincidence &mdash; and it is not something you fix once and forget.</p>
<p><strong>The scanners are stuck on the worst band.</strong> A great deal of handheld scanning kit still in daily use is 2.4GHz only. Greater reach sounds like an advantage and is the opposite here: bigger cells overlap more, boundaries blur, and a scanner can hold a distant access point from halfway across a building. It is also the congested band, sharing three non-overlapping channels with everything else in the postcode. So the devices with the least capable radios end up on the band with the most noise and the loosest edges.</p>
<p><strong>And floors leak, badly.</strong> A ceiling-mounted access point radiates upwards and downwards as well as outwards. To a client standing on the ground floor, the unit on the first floor can look like a perfectly reasonable option &mdash; sometimes the best one, if it is closer in a straight line through the slab than anything on its own floor. Between-floor drops are often a device that roamed <em>upstairs</em> at the bottom of the stairwell and then walked away from what it had chosen. Stairwells, lift lobbies and mezzanines are where this shows up, and the fault is rarely where the user says it happened.</p>""",
        },
        {
            "h2": "Where each fault shows itself",
            "kind": "table",
            "html": """<table class="table">
<thead><tr><th>Symptom</th><th>Likely cause</th><th>First thing to check</th></tr></thead>
<tbody>
<tr><td><strong>Laptop keeps the far access point after walking</strong></td><td>Classic sticky client in an estate with no real cell edges</td><td>Transmit power across the whole estate, then the minimum data rate. Look for &ldquo;every access point audible from everywhere&rdquo;.</td></tr>
<tr><td><strong>Only the scanners drop</strong></td><td>Old 2.4GHz-only radios running their own roaming rules</td><td>The handheld&rsquo;s own roam threshold in the device or MDM configuration, in the manufacturer&rsquo;s admin guide &mdash; before you touch the controller.</td></tr>
<tr><td><strong>Drops at exactly the same spot every time</strong></td><td>Not a roaming fault. A coverage hole or a local interference source at that point</td><td>Walk that spot with a signal test rather than a controller view. If the hole is real, it is a design fix, not a setting.</td></tr>
<tr><td><strong>Drops between floors</strong></td><td>Floor-to-floor bleed: the client roamed on to the floor above, then walked away from it</td><td>Which access point the device is associated with <em>while it is in the stairwell</em> &mdash; not where it finally lets go.</td></tr>
<tr><td><strong>Everything roams fine but calls break up mid-walk</strong></td><td>The handover completes, but takes longer than real-time audio can survive</td><td>Whether fast transition (802.11r) is enabled on that SSID, and whether those specific handsets actually support it.</td></tr>
<tr><td><strong>New access points made no difference</strong></td><td>The access points were never the fault</td><td>The client side. Roaming is the client&rsquo;s decision, and the refresh did not change a single client. Check whether power went <em>up</em> during the swap.</td></tr>
</tbody>
</table>""",
        },
        {
            "h2": "How to prove a change actually worked",
            "kind": "prose",
            "html": """<p>Roaming is an easy fault to convince yourself you have fixed, because the evidence is a walking human being with an opinion. Two people can walk the same corridor an hour apart and come back with opposite verdicts, both honestly reported.</p>
<p>So make the test boring and repeatable:</p>
<ul>
<li><strong>Same route, same numbered points, same order.</strong> The one you wrote down before you changed anything.</li>
<li><strong>Same two devices</strong> &mdash; the modern one and the awkward old one. Swapping the test device invalidates the comparison completely.</li>
<li><strong>Same time of day, and note the stock level.</strong> In a warehouse, a full aisle and an empty aisle are different buildings. Record which you had.</li>
<li><strong>One change between walks.</strong> If you must batch changes because you only get one evening, at least write the batch down in order, so you can unpick it.</li>
<li><strong>Give it a full working day before you believe it.</strong> Roaming faults hide behind quiet periods. A Tuesday morning proves very little.</li>
<li><strong>Ask the same people.</strong> Not &ldquo;is the WiFi better?&rdquo;, which gets you a mood. Ask whether the specific thing that broke &mdash; the call between the office and the bay, the scan at the far rack &mdash; happened again today.</li>
</ul>
<p>Keep the previous configuration written down somewhere that is not the controller you are editing. The change you make at seven in the evening is the change you will want to reverse at half past eight the next morning, and by then nobody remembers what the power level used to be.</p>""",
        },
        {
            "h2": "What new hardware will and will not fix",
            "kind": "dontbuy",
            "html": """<p>We would rather you spent an afternoon than a budget, so here is the honest version.</p>
<p>A new access point is a better thing for a client to choose. It is not a reason for the client to choose it. That one sentence explains why estates get replaced and the complaint survives the replacement intact.</p>
<p>New hardware, on its own, does not fix any of these:</p>
<ul>
<li><strong>A laptop or scanner that will not let go until its link is nearly dead.</strong> Same decision, made about newer equipment.</li>
<li><strong>An estate turned up too loud.</strong> This one gets actively worse, because a refresh usually arrives with more available transmit power and gets commissioned near the top of it.</li>
<li><strong>Legacy basic rates left enabled from an installation nobody now remembers.</strong> Those come across in the config migration.</li>
<li><strong>A handheld with its own roaming threshold set in the device.</strong> Nothing you buy for the ceiling touches that setting.</li>
<li><strong>Racking, stock and floor slabs.</strong> The building does not care what generation the radio is.</li>
</ul>
<p>A properly powered-down, well-placed estate with sane minimum data rates will usually out-roam a louder, newer one. That work costs an afternoon and a walk test, and quite often it is the end of the matter.</p>
<p><strong>When a redesign genuinely is the answer:</strong> there are real coverage holes that no amount of tuning will close, because there is no access point anywhere near them. There is not enough capacity for the number of devices now on the floor, which is a different fault wearing the same coat. Or the kit is old enough that it cannot offer modern roaming assistance at all, and the controller cannot be brought forward to a version that can. Those are honest reasons to spend, and in those cases the sequence is survey first, design second, hardware last &mdash; see <a href="/business-wifi-installation/">business WiFi installation</a>. If you would rather check the coverage yourself before anyone quotes you for anything, our <a href="/wifi-signal-test/">free WiFi signal test</a> runs in a browser and costs nothing.</p>""",
        },
    ],
    "faqs": [
        ("Does mesh WiFi fix roaming problems?", "No, and it can make them harder to diagnose. Mesh describes how access points talk to each other, usually wirelessly, not how a client chooses between them. The client still decides when to leave. A mesh system also puts your backhaul over the air: on a dual-band system that backhaul competes directly with your users for airtime, and even a tri-band system with a dedicated backhaul radio still spends spectrum on it. If you already have cabled access points and a controller, mesh is a step backwards."),
        ("Will WiFi 6 fix devices that will not roam?", "Not by itself. WiFi 6 improves how efficiently many devices share airtime, which is a real gain on a busy floor, but it does not take the roaming decision away from the client. An old scanner clinging to a distant access point will cling to a WiFi 6 one just as firmly. If your estate is being replaced anyway, newer kit usually has better roaming assistance to offer, but the device still has to accept it."),
        ("At what signal level should a device hand over to the next access point?", "There is no fixed figure you can enforce, because each client vendor sets its own threshold and is not obliged to publish it. As a design rule of thumb, wireless designers commonly aim for around -67 dBm at the edge of every cell where roaming or voice matters, with adjacent cells overlapping at that level. Client roam triggers are looser and vary widely by chipset, with commonly quoted figures somewhere between -70 dBm and -80 dBm. Treat all of those as design guidance rather than a setting. What matters more is that a cell edge exists at all."),
        ("Why do only the barcode scanners drop off the WiFi?", "Because they are usually the oldest radios on the estate, often 2.4GHz only, and many enterprise handhelds carry their own roaming thresholds set in the device or MDM configuration rather than on your controller. 2.4GHz also reaches further, so a scanner can hold a distant access point from halfway across a warehouse. Check the handheld manufacturer's admin guide for its roam trigger before you change anything centrally."),
        ("What is a sticky client?", "A device that stays associated with an access point long after a nearer one became the better choice. It is not really a fault in the device. Most clients are built to hold on until the current link becomes genuinely poor, rather than to move the moment something better appears, so the connection degrades quietly for a long time before anything visibly breaks. Users describe that ending as a sudden drop."),
        ("Should I turn my access points up or down to fix roaming?", "Down, in most cases, which is the opposite of most people's instinct. If every access point is audible from everywhere, no client ever reaches the point where its current link feels bad enough to leave. Roaming needs cell edges, and an estate turned up loud has none. Reduce power in steps, re-walk your test route after each step, and check you have not opened a genuine coverage hole."),
        ("Do I need 802.11k, 802.11v and 802.11r turned on?", "They help, but none of them takes the decision away from the client. 802.11k gives a device a list of neighbouring access points so it does not have to scan blindly. 802.11v lets the network suggest a better one, which the client is free to ignore. 802.11r speeds up the reconnection once the client has decided to move. Enable them one area at a time, because older handhelds are commonly reported to fail with 802.11r."),
        ("Why does my WiFi drop when I walk between floors?", "Usually because the device roamed on to an access point on the floor above or below, then walked away from it. Ceiling-mounted units radiate upwards and downwards as well as outwards, so a client standing in a stairwell can pick a unit on another floor as its best option. Check which access point the device is associated with while it is in the stairwell, not where it finally drops."),
    ],
},
{
    "slug": "campervan-wifi-keeps-dropping",
    "tool": {
        "eyebrow": "TEN MINUTES, ONE DEFINITE ANSWER",
        "head": "Test the pitch and the hub before you order anything",
        "body": """The two-test check in the booster section takes ten minutes with our <a href="/broadband-speed-checker/">free speed checker</a> &mdash; no app, no sign-up. If the site&rsquo;s hub is slow too, you have just saved yourself the cost of a booster that could not have helped.""",
        "href": "/broadband-speed-checker/",
        "btn": "Run the free speed test",
    },
    "crumb": "Campervan WiFi",
    "title": "Campervan WiFi Keeps Dropping? Diagnose It First",
    "schema_name": "Campervan WiFi Keeps Dropping: The Diagnosis Playbook",
    "og_title": "Campervan WiFi Keeps Dropping? Find the Real Culprit",
    "desc": "Four links can drop in a vehicle and they fail differently. Work out which one before you buy a booster &mdash; including the 12V trap.",
    "eyebrow": "// VEHICLE PLAYBOOK",
    "h1": """Campervan WiFi keeps dropping? Find the <em class="grad grad--cyan">real culprit</em> before you buy more kit""",
    "lede": "In a vehicle there are four separate connections that can drop, and they fail in completely different ways. It is easy to blame the WiFi and buy a booster for a fault in an entirely different link. This page shows you how to tell them apart before you spend anything. The one that is easiest to miss is not radio at all: it is the 12V supply.",
    "chips": [
        "We run our own off-grid van",
        "Four links, four different faults",
        "No affiliate links",
    ],
    "cta_head": "Fitting out a van and want it right first time?",
    "cta_sub": "We look after our own off-grid vehicle and build Victron monitoring dashboards, so we are happy to sanity-check a plan before you order anything &mdash; even if the honest answer is that you need less than you thought.",
    "cta_secondary": ("Off-grid internet", "/off-grid-internet/"),
    "sections": [
        {
            "h2": "Which link is actually dropping?",
            "kind": "triage",
            "html": """<ul>
<li><strong>Everything on board loses connection at the same moment, phones and laptops together.</strong> That is not five devices failing at once &mdash; it is the one thing they all share. Either the router restarted, or its link to the mast dropped. Watch the router&rsquo;s own lights during the next drop: if it runs through a boot sequence, this is a power question and not a signal one.</li>
<li><strong>One device drops while another sitting beside it stays connected.</strong> Link 1, the short hop from your device to your own router, inside a metal box. Older laptop WiFi cards and anything tucked in a locker suffer first. Moving the router usually fixes it, and it costs nothing.</li>
<li><strong>Full bars on the router, but pages will not load.</strong> Link 2, your router to the mobile mast. Signal strength only tells you the mast can be heard. It says nothing about whether the mast has capacity left, or whether your allowance has been used up or throttled. A strong signal to a congested mast looks perfect right up until you try to use it.</li>
<li><strong>Only the campsite network misbehaves; your own mobile data is fine on the same pitch.</strong> Link 3, the site&rsquo;s access point to your pitch &mdash; or, more often, the single connection sitting behind it. Those two need separating before you spend anything, because kit fitted to the van can help with the first and can do nothing at all about the second. The booster section below shows how to tell them apart in ten minutes.</li>
<li><strong>Drops after you park under trees, beside a building, or when you reposition the van.</strong> Link 4, where a satellite dish is fitted. Satellite needs a genuinely clear view of the sky, and the part of the sky it needs is not always straight up. A branch that looks harmless can sit exactly in the path.</li>
<li><strong>Drops that line up with the fridge, the inverter, the kettle or starting the engine.</strong> Power, not WiFi. This is the one almost nobody checks, and it has a section of its own below.</li>
<li><strong>You are in a house, flat or office rather than a vehicle.</strong> Different fault, different page &mdash; start with <a href="/wifi-troubleshooting/">WiFi troubleshooting</a>, or <a href="/office-wifi-keeps-dropping-out/">office WiFi that keeps dropping out</a> if it is a workplace.</li>
<li><strong>A static caravan, lodge or park home with its own fixed line.</strong> That is a broadband fault rather than a vehicle one &mdash; <a href="/broadband-down/">broadband down? start here</a>.</li>
<li><strong>A boat on a mooring.</strong> Same instincts, different constraints &mdash; see <a href="/broadband-to-a-boat-mooring/">getting broadband to a boat mooring</a>.</li>
<li><strong>A shepherd&rsquo;s hut, annexe or outbuilding that never moves.</strong> A fixed link from the main property beats mobile data every time &mdash; see <a href="/wifi-for-a-shepherds-hut/">WiFi for a shepherd&rsquo;s hut</a> or <a href="/wifi-in-a-granny-annexe/">WiFi in a granny annexe</a>.</li>
</ul>""",
        },
        {
            "h2": "When it drops tells you what it is",
            "kind": "prose",
            "html": """<p>Before you buy anything, spend two days writing down <em>when</em> it went rather than how bad it felt. In a vehicle the timing is more diagnostic than any measurement, because each of the four links fails on its own schedule.</p>
<p><strong>Fine at two in the morning, unusable from about six in the evening, worse at weekends and in school holidays.</strong> That is contention, and it is almost never your equipment. A campsite often has one connection &mdash; sometimes an ordinary domestic line &mdash; shared across every pitch. When the site fills up and everyone starts streaming after dinner, that single line is the ceiling for all of them at once. Your kit is working properly; there is simply nothing left to hand it.</p>
<p><strong>Drops while you are driving, then comes back on its own after a minute or two.</strong> It is worth being precise here, because the usual explanation is wrong. Handing over from one mast to the next is fast &mdash; the interruption is measured in milliseconds, and you would never see it as a dropout. A gap of a minute means something else: the router lost usable coverage altogether and had to find and re-attach to a new cell. That is what happens in cuttings, wooded valleys and the long rural gaps between masts. Switching between 4G and 5G takes longer than moving between two cells of the same type, so patchy 5G can make the experience worse rather than better. The sting is that even a very brief break kills anything live &mdash; a call, a video meeting, a VPN &mdash; because those sessions do not survive an interruption, so a short radio problem feels like a long one.</p>
<p><strong>Drops at a regular interval on site WiFi, and reconnecting fixes it until it happens again.</strong> That is not a fault at all. It is the captive portal, the login page with the terms you accepted, timing your session out. The length is set by the site, so it varies from one to the next. Some sites also cap how many devices one pitch may use, so the phone that logs in knocks the tablet off. Nothing you buy stops this, and a booster simply gives you a stronger connection to the same portal.</p>
<p><strong>Drops when the engine starts, when the fridge cuts in, or around the moment you notice the lights flicker.</strong> Stop looking at the radio side entirely. That is the 12V supply, and it is the next section.</p>""",
        },
        {
            "h2": "The 12V trap nobody checks",
            "kind": "trap",
            "html": """<p>A router does not have to lose power to fall over. It only has to see the supply dip below the point where its internal regulator gives up, at which point it restarts and everything on board loses connection at the same instant. That looks exactly like a signal problem, and it is not one.</p>
<p>What makes it so hard to catch is that cabin lighting is a poor witness. Many modern LED fittings are regulated and hold their brightness a long way down the range, so by the time you can see them dim the supply has often already fallen past what a router will tolerate. Add a compressor fridge cutting in, an inverter starting, or a kettle on a long thin cable run, and you get a brief sag that nothing in the van displays. The tell is that the drops correlate with <em>appliances</em> rather than with location or signal.</p>
<p>Chase it by measuring the supply at the router&rsquo;s own terminals while the heaviest load in the van is running &mdash; not at the battery, and not at rest. Voltage measured at rest tells you almost nothing, because the loss happens in the cable, the fuse holder and the connections between the two. Every piece of equipment has its own cut-off, so read your router&rsquo;s manual for its stated input range rather than trusting a figure from a forum. We run our own off-grid van on a Victron system, so this is a fault we have been on the wrong end of ourselves. It is nearly always a thin feed, a tired crimp or a shared fuse, and hardly ever the router.</p>""",
        },
        {
            "h2": "The metal box problem",
            "kind": "prose",
            "html": """<p>A van body is a very good radio shield. Steel panels, aluminium skins, foil-faced insulation board and metallised window film all do much the same thing to a WiFi signal, and they do it in every direction. Put a router in a locker and you have asked it to broadcast out of a metal box, through more metal.</p>
<p>This matters differently for each link. For Link 1 &mdash; your laptop or phone to your own router &mdash; the fix is usually free: move the router. As a rule of thumb, if shifting it half a metre towards a window noticeably changes what your devices see, the vehicle itself is part of the problem, and no equipment upgrade will out-muscle bodywork. Height and line of sight beat transmit power inside a small space.</p>
<p>For Link 2 &mdash; your router to the mast &mdash; an external antenna is where money genuinely earns its keep, because it puts the receiving element outside the shield instead of inside it. A roof mount with a clear horizon is the honest version of this. It is worth being equally clear about where it does <em>not</em> help: an external antenna does little for a congested mast, nothing for an exhausted data allowance, and nothing whatsoever for a campsite&rsquo;s overloaded connection. It addresses weak signal, and mainly weak signal.</p>
<p>Two rules of thumb are worth knowing before you order. First, keep the antenna cable as short as the mount allows &mdash; thin coax gives back some of what the antenna gained, and a long run of cheap cable can cancel out the upgrade entirely. Second, a window mount is a real compromise rather than a bodge: it gets the antenna past the bodywork without drilling the roof, and for people who only need it parked up rather than in motion it is often enough.</p>""",
        },
        {
            "h2": "The booster trap",
            "kind": "trap",
            "html": """<p>A WiFi booster amplifies the link between you and the campsite&rsquo;s access point. That is all it does. It cannot create bandwidth the campsite has not got, and it cannot make the site&rsquo;s own connection any larger. If forty vans are sharing one domestic-grade line, a stronger signal to a saturated uplink changes nothing except how quickly you reach the same ceiling.</p>
<p>You can settle this before you spend a penny. Run a speed test standing near the site&rsquo;s hub &mdash; usually reception, the bar or the shop &mdash; then run the same test back at your pitch. If the pitch is slow and the hub is fast, that is a signal problem and a booster is a reasonable purchase. If <em>both</em> are slow, the site&rsquo;s connection is the limit, and no aerial, booster or repeater will improve it. Our <a href="/broadband-speed-checker/">free speed checker</a> runs in a browser and needs no sign-up, so this is a ten-minute test with a definite answer.</p>
<p>Do it twice more if you can: once at eight in the evening, once early the following morning. A site that is quick at 7am and unusable at 8pm has a capacity problem, and capacity problems belong to the site to fix rather than to you to buy your way around.</p>""",
        },
        {
            "h2": "Which fix matches which fault",
            "kind": "table",
            "html": """<table class="table">
<thead><tr><th>Symptom</th><th>Most likely link</th><th>What actually helps</th></tr></thead>
<tbody>
<tr><td>Fine at 2am, unusable at 8pm</td><td>Link 3 &mdash; the campsite&rsquo;s own connection</td><td>Nothing fitted to the van. Use your own mobile data at peak times, or do large downloads early.</td></tr>
<tr><td>Drops while driving, returns by itself</td><td>Link 2 &mdash; coverage lost, then re-attaching to a new cell</td><td>A roof antenna helps where signal is weak. Nothing removes the gaps where there is no usable coverage at all.</td></tr>
<tr><td>Drops at a regular interval on site WiFi</td><td>Link 3 &mdash; captive portal session expiring</td><td>Re-accept the terms to reconnect. Move anything that matters onto your own connection.</td></tr>
<tr><td>Drops when the fridge or inverter runs</td><td>Power &mdash; the 12V feed</td><td>Measure at the router&rsquo;s terminals under load. Look at cable size, the fuse holder and every crimp between battery and router.</td></tr>
<tr><td>Strong signal, but nothing loads</td><td>Link 2 or Link 3 &mdash; congestion, cap or throttle</td><td>Check your data allowance first, then compare a speed test at the site hub with one at the pitch.</td></tr>
<tr><td>Works outside the van, not inside</td><td>Link 1 &mdash; the vehicle body</td><td>Move the router to a window or higher position. If that helps, an external or window-mounted antenna is the permanent version.</td></tr>
</tbody>
</table>""",
        },
        {
            "h2": "Do not buy this yet",
            "kind": "dontbuy",
            "html": """<p>Most of what gets ordered after a bad week on site turns out to be the wrong thing for the fault that caused the bad week. Roughly in the order we see them go wrong:</p>
<ul>
<li><strong>A booster, for a congestion fault.</strong> Easy to order after a bad weekend, and useless if the site&rsquo;s own line is the limit. Do the two-speed-test check above first; if the site&rsquo;s hub is slow as well, put your money away.</li>
<li><strong>Satellite, for occasional weekends on serviced sites.</strong> If you are on hookup at a proper site a handful of times a year, satellite is a lot of kit, a lot of roof and a real power draw to solve a problem a phone hotspot handles most of the time.</li>
<li><strong>A new router, for a 12V fault.</strong> If the supply sags under load, the new one will restart in exactly the same places as the old one, and you will have paid to reproduce the fault.</li>
<li><strong>A bigger data plan, for a mast problem.</strong> More allowance does nothing when the mast is congested or the signal cannot reach into the van.</li>
<li><strong>A mobile signal repeater, before checking you are allowed to use it.</strong> This is a different device from a WiFi booster: it amplifies the mobile signal itself. In the UK a repeater may only be used without a licence if it meets Ofcom&rsquo;s technical requirements, under the Wireless Telegraphy (Mobile Repeater) (Exemption) Regulations 2022, and Ofcom publishes a list of devices that have been tested against them. The conditions depend on how and where the device is used, so check Ofcom&rsquo;s current guidance before ordering anything, particularly from overseas.</li>
</ul>
<p>The fixes that work most often are free or nearly free: move the router away from metal, use your own mobile data instead of the site&rsquo;s WiFi at peak times, and sort out the 12V feed. Plenty of people who do those three find there is nothing left to buy.</p>
<p>The calculation genuinely changes if you work from a vehicle full time. When a dropped call costs you a client, redundancy stops being a luxury, and having two independent routes to the internet becomes the whole point. That is the situation where satellite starts to make sense on its own merits &mdash; we set out what it does and does not do on our <a href="/starlink-internet/">Starlink internet</a> page. Even then, fix the power and the antenna position first: satellite hardware draws considerably more than a mobile router, and an unstable 12V supply will restart it just as happily.</p>""",
        },
    ],
    "faqs": [
        ("Why is campsite WiFi so slow?", "Usually because the whole site shares one connection, often an ordinary domestic line, across every pitch. It is fine at breakfast and collapses in the evening when everyone streams. The access point near your pitch can show full strength while the line behind it is full. A booster amplifies the signal, not the line, so it changes nothing. Test at the site hub and at your pitch: if both are slow, it is the site's connection."),
        ("Does a WiFi booster work in a campervan?", "Sometimes, for one specific fault. A booster helps when the campsite's signal is genuinely weak at your pitch but strong nearer the hub. It does nothing when the site's own connection is saturated, and nothing at all for your mobile data. Prove which one you have by running the same speed test at the hub and at the pitch before you order. If both readings are slow, save your money."),
        ("Why does my 4G router keep restarting?", "In a vehicle, power is the first suspect rather than the router. A 12V supply that sags when the fridge, inverter or starter motor draws current can dip below the router's minimum input and trigger a restart, without the cabin lights visibly dimming. Check the voltage at the router's own terminals while a heavy load runs, and check the manual for its stated input range. Thin cable, tired crimps and shared fuses cause most of it."),
        ("Can I use Starlink in a motorhome?", "People do, and it works where mobile coverage does not. Two honest caveats. It needs a genuinely clear view of the sky, so wooded pitches and tall buildings are a problem. And it draws considerably more power than a mobile router, which matters on a leisure battery. Whether a given kit may be used while moving, or away from a registered address, depends on the hardware and the plan, so check the current terms with the provider before buying."),
        ("Why does my campervan WiFi keep dropping while driving?", "Usually because the router lost usable coverage, not because of handover. Moving between two masts takes milliseconds and you would not notice it. A gap lasting a minute means the router had to find and re-attach to a new cell, which is what happens in valleys, cuttings and rural notspots. Switching between 4G and 5G takes longer than moving between cells of the same type. A roof antenna helps where signal is weak, but nothing fixes a stretch with no coverage."),
        ("Why does the campsite WiFi keep logging me out?", "Your session on the site's captive portal is expiring. That is the login page with the terms you accepted when you first connected. Sites set their own session length, and some limit how many devices one pitch may use, so a phone logging in can knock a tablet off. Reconnecting and re-accepting the terms is the only fix available to you. Keep anything important on your own mobile data."),
        ("Should I use campsite WiFi or my own mobile data?", "Site WiFi for large downloads when the site is quiet, your own data for anything that matters. Campsite connections are shared and unpredictable at peak times, and captive portals drop sessions without warning. Your own mobile connection takes a little more setting up but is far more consistent, and you control it. Many people find that switching to their own data in the evenings removes the problem they were about to spend money on."),
        ("Do I need a roof antenna for my motorhome?", "Only if weak signal is your actual fault. An external antenna moves the receiving element outside the metal bodywork, which genuinely helps when the mast is distant or the van is well insulated with foil-backed board. It does little for a congested mast and nothing for an exhausted data allowance or a slow campsite line. Keep the cable run short, because thin coax gives back some of what the antenna gained."),
    ],
},
]
