# -*- coding: utf-8 -*-
"""SEO wave 4 (1 Aug 2026): the laptop hardware-symptom cluster.

WHY THESE FOUR, AND WHY THIS SHAPE
----------------------------------
The 3-month GSC export to 29 Jul 2026 splits cleanly by page shape once you hold
position constant. At an identical average position of 7.2:

    problem-solving pages   13 pages  3,815 impr  53 clicks  1.39% CTR
    factual / comparison    10 pages  5,752 impr  30 clicks  0.52% CTR

The Dell buying-advice cluster generates the most impressions on the site and
converts worst - /are-dell-latitude-laptops-good/ sits at position 7.6 with 1,417
impressions and 2 clicks, because Google answers a yes/no question in the SERP and
the searcher never needs the page. Symptom pages cannot be answered that way: the
searcher has a broken machine and has to open something. All four pages below are
symptom pages, taken from the top-100 map (ranks 44, 49, 55, 68).

Every claim here is ordinary repair-bench knowledge - the torch test, the external
monitor test, powercfg /batteryreport, the DC-jack flex test. No invented specs, no
model-specific claims, no prices. Where a fault is not economically repairable the
page says so rather than implying a booking.

Rendered by build_extra.build_new_page(), same as SEO_WAVE_PAGES. Kept in its own
module on purpose: appending to seo_wave_data.py risks the trailing-comma bug that
bit wave 2 (`},,`), and a separate list makes it obvious what shipped when.
"""

CHIPS = ["No fix, no fee", "Rated 4.9 on Google", "Trading since 1995"]
CTA1 = ["Get it looked at", "/contact/"]
CTA2 = ["Call 01202 775566", "tel:+441202775566"]

SEO_WAVE4_PAGES = [

    # ---------------------------------------------------------------- 1 ----
    {
        "slug": "laptop-screen-flickers-then-goes-black",
        "title": "Laptop Screen Flickers Then Goes Black? Real Fixes",
        "metaDesc": "Laptop screen flickering then going black is usually the backlight, the display cable at the hinge, or the graphics driver. Two free tests tell you which.",
        "ogTitle": "Laptop Screen Flickers Then Goes Black &mdash; What It Actually Means",
        "crumbName": "Screen Flickers Then Black",
        "eyebrow": "// LAPTOP DISPLAY FAULTS",
        "h1": "Laptop Screen Flickers, Then Goes Black? Here's What's Really Happening",
        "lede": "It flickers for a second, maybe twice, then the screen goes dark &mdash; but you can still hear the fan, and the power light is on. That last detail matters more than anything: the laptop is still running, so this is a display fault, not a dead laptop. There are three realistic causes, and two free tests you can do in the next five minutes that will tell you which one you have before anybody opens the case.",
        "chips": CHIPS,
        "ctaHead": "Want us to look at it?",
        "ctaSub": "We diagnose display faults every week and will tell you honestly whether it is worth repairing. Free collection across Dorset, and no fix means no fee. Call 01202 775566.",
        "serviceName": "Laptop Screen and Display Repair",
        "sections": [
            {
                "eyebrow": "/01 &mdash; THE SYMPTOM",
                "h2": "Still running, just not showing you anything",
                "html": "<p>The pattern is nearly always the same. The screen flickers &mdash; sometimes a flash, sometimes a rolling shimmer &mdash; and then goes black. The backlight glow disappears with it, so the screen looks properly off rather than dark grey. Meanwhile the laptop is plainly still alive: the fan spins, the keyboard backlight stays on, the power LED is lit, and if you press the caps lock key the little light still toggles.</p><p>That combination is genuinely good news. A laptop that has crashed, overheated or lost its motherboard does not sit there humming with a working caps lock light. Something between the graphics output and your eyes has failed, and that is a much shorter list of parts than \"the laptop is broken\".</p><p>The three realistic causes, in the order we actually see them on the bench: the <strong>backlight</strong> has failed, the <strong>display cable</strong> has been damaged where it passes through the hinge, or the <strong>graphics driver</strong> has fallen over. The first two are hardware and need opening up. The third is free to rule out and takes two minutes, which is why it is worth doing first.</p>",
            },
            {
                "eyebrow": "/02 &mdash; THE TORCH TEST",
                "h2": "Is the picture still there, just unlit?",
                "html": "<p>This is the single most useful test in laptop display diagnosis, it costs nothing, and it takes about thirty seconds.</p><p>With the laptop switched on and the screen apparently black, take a bright torch &mdash; your phone light is fine &mdash; and shine it at the screen from a steep angle, close up. Move it slowly around, and look very carefully for a faint image: the Windows login box, a wallpaper, a cursor, anything.</p><p><strong>If you can faintly see an image</strong>, the panel and the graphics chip are both working and producing a picture. What has failed is the backlight that lights the panel from behind. On most laptops made in the last fifteen years that means the LED backlight strip or the small circuit that drives it &mdash; and that is a panel-level repair.</p><p><strong>If there is genuinely nothing there</strong>, no ghost of an image at any angle, then no picture is reaching the panel at all. That points at the display cable, the panel itself, or the graphics output. The next test separates those.</p><p>Do this in a dim room. In daylight a faint backlit-off image is very easy to miss, and a false negative here sends you down the wrong path.</p>",
            },
            {
                "eyebrow": "/03 &mdash; THE EXTERNAL MONITOR TEST",
                "h2": "Splitting the laptop from the screen",
                "html": "<p>Plug the laptop into an external monitor or a TV &mdash; HDMI, DisplayPort or USB-C, whatever it has. Then press the Windows key and P together and choose <em>Duplicate</em> or <em>Second screen only</em>. You may be doing this blind; that is fine, the key combination works whether you can see it or not.</p><p><strong>If the external screen shows a normal desktop</strong>, everything upstream is healthy. Windows is running, the graphics chip is fine, the motherboard is fine. The fault is in the lid: the panel, the backlight, or the cable feeding them. This is the most common outcome, and it is also the most repairable.</p><p><strong>If the external screen is black too</strong>, the problem is further back &mdash; the graphics output, the driver, or the machine is not really running as well as it appears. Try booting into Safe Mode, which loads a basic display driver instead of the manufacturer's. If Safe Mode gives you a picture on the laptop's own screen, you have a driver fault rather than a hardware one, and rolling the display driver back usually settles it.</p><p>Between the torch test and the monitor test you can place almost every one of these faults without a screwdriver, which is exactly why we ask customers to try both before booking anything in.</p>",
            },
            {
                "eyebrow": "/04 &mdash; THE HINGE CABLE",
                "h2": "When the flicker follows the lid",
                "html": "<p>There is one more pattern worth knowing, because it is common and it is very distinctive: the flicker changes when you move the screen.</p><p>The cable carrying the picture from the motherboard to the panel runs up through the hinge. Every time the laptop is opened and closed, that cable flexes. Over several years of daily use the conductors inside can crack, and a cracked conductor makes contact intermittently &mdash; which is exactly what a flicker is.</p><p>The tell is simple. Open and close the lid slowly while the laptop is on and watch what happens. If the picture flickers, returns, or goes black at a particular angle and comes back at another, the cable is the prime suspect rather than the panel. Same if pressing gently around the hinge or the screen bezel changes anything.</p><p>This one is worth catching early. A display cable is one of the cheaper parts in a laptop, and replacing it is a much smaller job than replacing a panel. Left alone, a failing cable does not heal &mdash; it goes from occasional flicker to permanently black, and people often assume by then that the whole screen has died.</p><p>One important caveat: if your laptop is more than a decade old and uses a CCFL backlight rather than LED, there is an inverter board in the mix as well. Almost everything sold since roughly 2010 is LED-backlit and has no inverter, so on a modern machine this is not the answer &mdash; but on a genuinely old laptop it still is.</p>",
            },
            {
                "eyebrow": "/05 &mdash; WHAT IT COSTS YOU TO GET WRONG",
                "h2": "When it is worth fixing, and when it honestly isn't",
                "html": "<p>We will say this plainly, because it is the part most repair pages skip: not every one of these is worth repairing.</p><p>A display cable on a mainstream laptop is usually a sensible repair. A replacement panel on a mid-range machine often is too. But on a laptop that is already eight or nine years old, with a worn battery and a slow mechanical hard drive, spending money on a panel to keep a machine that will frustrate you in other ways within the year is not good value &mdash; and we will tell you that rather than take the work.</p><p>What is almost always worth doing, whatever you decide about the laptop, is getting your files off it. A display fault does not touch your data. The drive is fine, the documents and photos are all still there, and they can be recovered and moved to a new machine regardless of whether the screen ever works again. If you are weighing up a repair, that part is not urgent in the way people fear.</p><p>If you would rather not open anything yourself, that is exactly what we are for. We collect free across Bournemouth, Poole and Dorset, tell you what it is before we do anything, and if we cannot fix it you do not pay.</p>",
            },
        ],
        "faqs": [
            {
                "q": "My laptop screen flickers then goes black but the laptop is still on. Is it broken?",
                "a": "The laptop is not broken in the sense people usually fear. If the fan is still spinning and the power light is on, the computer itself is running normally and the fault is between the graphics output and the screen. That is a much smaller repair than a dead motherboard, and your files are completely unaffected. Shine a torch at the screen at a steep angle in a dim room: if you can faintly see an image, the picture is still being produced and only the backlight has failed.",
            },
            {
                "q": "Why does the flickering change when I move the laptop screen?",
                "a": "Because the cable carrying the picture up to the panel runs through the hinge and flexes every time you open and close the lid. After a few years the conductors inside can crack, and a cracked conductor makes contact intermittently depending on the angle. If the picture comes and goes as you move the lid, or if pressing near the hinge changes anything, the display cable is the likely cause rather than the screen itself. It is one of the cheaper parts in a laptop and worth catching before it fails completely.",
            },
            {
                "q": "The external monitor works but the laptop screen stays black. What does that tell me?",
                "a": "It tells you the valuable half of the diagnosis. Windows, the graphics chip and the motherboard are all working properly, because they are successfully driving a display. The fault is therefore inside the lid: the panel, the backlight or the cable feeding them. That is the most common result of this test and also the most repairable. It also means you can keep using the laptop on an external screen in the meantime if you need to.",
            },
            {
                "q": "Could this just be a graphics driver problem?",
                "a": "It can be, and it is worth ruling out first because it costs nothing. Boot into Safe Mode, which loads a basic display driver instead of the manufacturer's one. If the laptop screen behaves normally in Safe Mode, you are looking at a driver fault rather than failed hardware, and rolling the display driver back to the previous version usually settles it. If Safe Mode is just as black, the problem is physical.",
            },
            {
                "q": "Will I lose my photos and documents if the screen has failed?",
                "a": "No. A display fault does not touch the drive, so everything on the laptop is intact. Whether you repair the screen, move the files to a new machine, or simply use the laptop on an external monitor, your data is safe and recoverable. This is worth knowing before you make a decision under pressure, because the fear of losing everything pushes people into repairs that are not always the sensible option for the age of the machine.",
            },
        ],
        "crossLinksHtml": "<p><strong>Related guides:</strong> <a href=\"/laptop-wont-turn-on-no-lights/\">Laptop won't turn on, no lights</a> &middot; <a href=\"/laptop-screen-repair-cost-bournemouth/\">Laptop screen repair costs</a> &middot; <a href=\"/laptop-repair/\">Laptop repair</a> &middot; <a href=\"/data-recovery/\">Data recovery</a></p>",
        "primaryCta": CTA1,
        "secondaryCta": CTA2,
        "schemaKind": "service",
    },

    # ---------------------------------------------------------------- 2 ----
    {
        "slug": "laptop-shuts-down-at-30-percent-battery",
        "title": "Laptop Shuts Down at 30% Battery? Here's Why",
        "metaDesc": "A laptop that dies at 30% has worn battery cells, not a software bug. The percentage is an estimate, and one weak cell hits cut-off while the gauge lies.",
        "ogTitle": "Why Your Laptop Shuts Down at 30% Battery",
        "crumbName": "Shuts Down at 30%",
        "eyebrow": "// LAPTOP BATTERY FAULTS",
        "h1": "Laptop Shuts Down Suddenly at 30% Battery? The Percentage Is Lying to You",
        "lede": "It says 30 percent, sometimes 40, and then without warning the laptop drops dead as though you pulled the plug &mdash; no shutdown, no warning, no low-battery message. This is one of the most misdiagnosed faults we see, because everybody assumes it is a software or calibration problem. It is almost never either. Here is what is actually happening inside the battery, and why recalibrating it will not save you.",
        "chips": CHIPS,
        "ctaHead": "Not sure if the battery is worth replacing?",
        "ctaSub": "We will check the real capacity against the design capacity and tell you honestly whether it is the battery or something else. Free collection across Dorset. Call 01202 775566.",
        "serviceName": "Laptop Battery Diagnosis and Replacement",
        "sections": [
            {
                "eyebrow": "/01 &mdash; THE SYMPTOM",
                "h2": "Instant death, not a shutdown",
                "html": "<p>The detail that matters is <em>how</em> it stops. A laptop that runs out of charge properly warns you, then hibernates or shuts down in an orderly way. What you are describing is different: the screen goes off mid-sentence, as though the power was physically cut. When you plug it back in and start it up, Windows often complains that it was not shut down correctly.</p><p>That is not a battery running empty. That is a battery hitting its protection cut-off.</p><p>It usually happens under load, too. People notice it when a video call starts, when something begins rendering, or when the fans spin up &mdash; not while the laptop sits idle on a desk. That pattern is a strong clue, and it points directly at the real cause.</p>",
            },
            {
                "eyebrow": "/02 &mdash; WHY THE PERCENTAGE IS WRONG",
                "h2": "The gauge is an estimate, not a measurement",
                "html": "<p>Your laptop cannot directly measure how much energy is left in the battery. There is no fuel float in there. What it does instead is estimate, using the voltage it can see plus a learned model of how much capacity that battery pack is supposed to hold.</p><p>When the pack is new, that estimate is accurate, because the model matches reality. As the cells age, they lose capacity &mdash; and, crucially, they do not lose it evenly. One cell in the pack degrades faster than the others. That weak cell is still counted in the estimate as though it were healthy.</p><p>So the gauge does its sum, decides there is 30 percent left, and reports that in good faith. But the weak cell has already sagged close to its minimum safe voltage. The moment you ask for more current &mdash; a video call, a big spreadsheet, the fans kicking in &mdash; that cell's voltage drops below the safety threshold, and the battery's protection circuit disconnects the pack instantly to avoid damaging it.</p><p>The laptop does not shut down. The power is simply removed. That is why it behaves exactly like yanking the mains lead out, and why there is never a warning.</p>",
            },
            {
                "eyebrow": "/03 &mdash; CHECK IT YOURSELF",
                "h2": "The battery report, in one command",
                "html": "<p>Windows will tell you the truth about your battery, and you do not need to install anything.</p><p>Open the Start menu, type <strong>cmd</strong>, and open Command Prompt. Type this and press enter:</p><p><code>powercfg /batteryreport</code></p><p>It will save an HTML file and tell you where &mdash; usually in your user folder. Open that file in your browser and look for two numbers near the top: <strong>Design Capacity</strong> and <strong>Full Charge Capacity</strong>.</p><p>Design capacity is what the battery held when it was made. Full charge capacity is what it actually holds now, when completely full. Divide the second by the first and you have the real health of your battery.</p><p>If full charge capacity is down around half of design capacity or lower, you have your answer, and no amount of software will change it. The report also includes a battery life estimate history further down, which shows the decline over time &mdash; it is often a fairly stark graph.</p><p>On a Mac, the equivalent is holding Option and clicking the Apple menu, then System Information, then Power, where you will find cycle count and condition.</p>",
            },
            {
                "eyebrow": "/04 &mdash; WHY RECALIBRATION WON'T FIX IT",
                "h2": "The advice everybody gives, and why it disappoints",
                "html": "<p>Search this problem and you will be told to recalibrate: charge to 100 percent, discharge fully, charge again. It is offered as a cure. It is not one, and it is worth understanding why so you do not waste an evening on it.</p><p>Recalibration re-teaches the gauge. It lets the battery controller re-learn where full and empty actually sit, so the percentage it reports lines up better with reality. That is genuinely useful &mdash; if your problem is a <em>lying gauge</em>.</p><p>But it does nothing whatsoever to the cells. It adds no capacity, repairs no chemistry, and revives no weak cell. If your battery is worn, recalibration will make it report the truth more accurately &mdash; which usually means it now says 5 percent when it dies instead of 30. The laptop still dies at the same point. You have fixed the number, not the battery.</p><p>That is still mildly useful, because at least the warnings become honest. But if you were hoping to get your runtime back, this is not the route, and anyone promising otherwise is guessing.</p>",
            },
            {
                "eyebrow": "/05 &mdash; WHAT TO DO ABOUT IT",
                "h2": "Replacement, and the one safety point that matters",
                "html": "<p>A worn battery is a consumable, not a fault. Laptop batteries are generally expected to hold most of their capacity for a few hundred full charge cycles, and after three or four years of daily use a noticeable drop is completely normal. Replacing it is routine work and restores the machine properly.</p><p>Two things are worth saying before you order one yourself. First, quality varies enormously with cheap third-party packs, and a poor cell pack in a sealed laptop is a genuinely bad trade. Second, and more importantly:</p><p><strong>If the battery is swollen, stop using the laptop.</strong> The signs are a trackpad that has started to sit proud or click oddly, a base that no longer sits flat on the desk, or a gap opening between the case panels. A swollen lithium battery is a safety issue, not a performance one. Do not press it, do not puncture it, and do not leave it charging unattended. Get it out of the machine.</p><p>If you would rather someone else handled it, we replace laptop batteries routinely, we will check the real capacity figures first so you are not replacing a healthy battery for nothing, and we will tell you if the shutdowns turn out to be something else entirely. Free collection across Bournemouth, Poole and Dorset, and no fix means no fee.</p>",
            },
        ],
        "faqs": [
            {
                "q": "Why does my laptop shut down at 30% battery instead of 0%?",
                "a": "Because the percentage is an estimate, not a measurement. Your laptop works out the figure from voltage plus a learned model of how much the pack should hold. As cells age they lose capacity unevenly, and one weak cell can reach its minimum safe voltage while the gauge still believes there is 30 percent left. The battery's protection circuit then disconnects the pack instantly to avoid damage, which is why it feels like the power was cut rather than a shutdown.",
            },
            {
                "q": "Will recalibrating the battery fix the early shutdown?",
                "a": "No, and this is the most common disappointment with this fault. Recalibration re-teaches the gauge so the reported percentage matches reality more closely, but it does nothing to the cells themselves. It adds no capacity and revives no worn cell. After recalibrating, a worn battery typically dies at 5 percent instead of 30 percent, which is more honest but no more useful. The runtime does not come back.",
            },
            {
                "q": "How do I check whether my laptop battery is actually worn out?",
                "a": "Open Command Prompt and run powercfg /batteryreport. Windows saves an HTML file and tells you where. Open it and compare Design Capacity with Full Charge Capacity: the first is what the battery held when new, the second is what it holds now. If the current figure is around half the design figure or lower, the battery is worn and no software change will help. On a Mac, hold Option, click the Apple menu, then System Information and Power.",
            },
            {
                "q": "Is it dangerous to keep using a laptop that shuts down early?",
                "a": "The early shutdown itself is not dangerous, though you will lose unsaved work. What is dangerous is a swollen battery, which sometimes accompanies a badly worn one. If your trackpad has started sitting proud or clicking oddly, the base no longer sits flat, or the case panels are separating, stop using the laptop and have the battery removed. Do not press it or puncture it, and do not leave it charging unattended.",
            },
            {
                "q": "How long should a laptop battery last before this happens?",
                "a": "Laptop batteries are consumables. They generally hold most of their capacity for a few hundred full charge cycles, so after three or four years of daily use a noticeable drop is normal rather than a fault. Heat shortens that life considerably, which is why laptops that live on a bed or a sofa, or that run hot under load, tend to reach this point sooner. Replacement is routine work, not a sign the laptop is finished.",
            },
        ],
        "crossLinksHtml": "<p><strong>Related guides:</strong> <a href=\"/laptop-turns-off-when-unplugged/\">Laptop only works plugged in</a> &middot; <a href=\"/laptop-wont-turn-on-no-lights/\">Laptop won't turn on, no lights</a> &middot; <a href=\"/laptop-repair/\">Laptop repair</a></p>",
        "primaryCta": CTA1,
        "secondaryCta": CTA2,
        "schemaKind": "service",
    },

    # ---------------------------------------------------------------- 3 ----
    {
        "slug": "laptop-shuts-off-when-moved",
        "title": "Laptop Shuts Off When You Move It? Find the Cause",
        "metaDesc": "A laptop that cuts out when moved has a loose physical connection. One question narrows it down fast: does it happen on mains, on battery, or on both?",
        "ogTitle": "Laptop Shuts Off When You Move It &mdash; Finding the Loose Connection",
        "crumbName": "Shuts Off When Moved",
        "eyebrow": "// INTERMITTENT POWER FAULTS",
        "h1": "Laptop Shuts Off When You Move It? That's a Loose Connection, and It's Findable",
        "lede": "Pick it up, shift it on your lap, nudge it across the desk &mdash; and it dies instantly. Put it down, press the power button, and it comes back as though nothing happened. Faults that respond to movement feel random and alarming, but they are actually one of the more logical problems to track down, because physical movement can only affect physical connections. One question narrows the field enormously.",
        "chips": CHIPS,
        "ctaHead": "Rather not chase it yourself?",
        "ctaSub": "Intermittent power faults are fiddly to find but very fixable once located. We collect free across Dorset, diagnose properly, and if we cannot fix it you pay nothing.",
        "serviceName": "Laptop Power Fault Diagnosis",
        "sections": [
            {
                "eyebrow": "/01 &mdash; THE ONE QUESTION",
                "h2": "Mains only, battery only, or both?",
                "html": "<p>Before anything else, work out which power source the fault follows. It takes five minutes and it eliminates most of the possibilities in one go.</p><p><strong>Test one:</strong> unplug the charger completely and run the laptop on battery alone. Move it, tilt it, lift it. Does it cut out?</p><p><strong>Test two:</strong> if the battery is removable, take it out and run on the mains lead alone. Move it again. Does it cut out?</p><p>Now read off the answer:</p><ul><li><strong>Only on mains</strong> &mdash; the charging circuit is the suspect: the power socket where the lead plugs in, or the lead itself.</li><li><strong>Only on battery</strong> &mdash; the battery connection is the suspect: the contacts, the connector, or the pack.</li><li><strong>On both</strong> &mdash; the fault is further inside, past the point where the two power sources merge. Usually memory, a cable, or the board itself.</li></ul><p>Almost nobody does this test before searching for answers, and it is genuinely the difference between a targeted repair and guesswork.</p>",
            },
            {
                "eyebrow": "/02 &mdash; MAINS ONLY",
                "h2": "The DC jack, and why it fails so often",
                "html": "<p>If the laptop only cuts out when running from the charger, look at where the power lead enters the machine.</p><p>The socket the charger plugs into &mdash; the DC jack &mdash; is soldered to a circuit board, and it takes physical abuse that nothing else in the laptop takes. Every time the lead is plugged in, pulled out at an angle, tripped over, or leant against a sofa cushion, that force goes through those solder joints. Over years, they crack.</p><p>A cracked joint still touches most of the time, which is why the laptop works normally when it is sitting still. Move it, and the crack opens for a fraction of a second, power is lost, and the machine dies instantly.</p><p>The tells are worth knowing. Wiggle the plug gently where it enters the laptop while it is running: if the charging light flickers or the machine cuts out, you have found it. Some people notice the plug feels loose or sits at a different angle than it used to, or that they have started propping the lead in a particular position to keep it charging &mdash; that habit is itself a symptom.</p><p>Rule out the cheap thing first, though: try a different charger if you can borrow one. Charger leads fail internally near the plug ends, and a broken cable behaves identically to a broken socket for a fraction of the repair cost.</p>",
            },
            {
                "eyebrow": "/03 &mdash; BATTERY ONLY",
                "h2": "Contacts, connectors and worn packs",
                "html": "<p>If it only cuts out on battery, the connection between the pack and the laptop is the place to look.</p><p>On older laptops with a removable battery this is often simple. The pack connects through a row of metal contacts, and those can tarnish, collect dust, or lose spring tension over the years. Removing the battery, checking the contacts on both sides are clean and undamaged, and refitting it firmly resolves a fair number of these. If the pack has ever been dropped or the laptop carried by its edges, the retaining clips may also have loosened so the pack no longer seats tightly.</p><p>On modern laptops the battery is internal and connects with a small plug on the motherboard. Those can work loose, particularly after previous service work, but getting to it means opening the case.</p><p>Do not overlook the obvious alternative: a badly worn battery can also cut out under movement, because movement usually coincides with the machine doing something and drawing more current. If the pack is old, run <code>powercfg /batteryreport</code> from Command Prompt and compare Full Charge Capacity with Design Capacity before assuming the connection is at fault.</p>",
            },
            {
                "eyebrow": "/04 &mdash; ON BOTH",
                "h2": "Memory, cables and board flex",
                "html": "<p>If the laptop cuts out on mains and on battery, the fault sits past the point where both supplies join, and the list is short.</p><p><strong>Loose memory.</strong> RAM modules sit in sprung slots and are held by clips. A module that is not fully seated, or one whose contacts have tarnished, can lose connection under vibration &mdash; and a laptop that loses its memory stops instantly, with no shutdown. This is one of the more common causes and one of the easier to correct: on machines with an access panel, reseating the modules firmly is straightforward.</p><p><strong>Internal cables.</strong> Drives, keyboards and daughterboards connect with ribbon cables and small connectors. Any of these working loose can cause an abrupt stop.</p><p><strong>Board flex.</strong> This is the least welcome answer. Laptop motherboards are thin, and a laptop that has been dropped, or carried open by one corner, or used on soft surfaces where the base twists, can develop cracked solder joints on the board itself. The symptom is exactly what you are seeing, and the repair is specialist work that is not always economic on an older machine.</p><p>There is a useful narrowing test here. Set the laptop on a flat, hard surface and press gently on different areas of the base while it runs &mdash; the palm rest, near the hinges, over the memory hatch. If a particular spot reproduces the cut-out reliably, that is where to look, and it saves a great deal of blind dismantling.</p>",
            },
            {
                "eyebrow": "/05 &mdash; WHY IT'S WORTH SORTING",
                "h2": "Sudden power loss is rough on your data",
                "html": "<p>There is a reason we do not tell people to live with this one.</p><p>An abrupt power cut is not a shutdown. Windows does not get the chance to finish writing what it was doing, and files that were mid-write can be left incomplete or corrupted. Do it once and you will very likely get away with it. Do it repeatedly over months, and the odds catch up &mdash; usually with the file system, occasionally with something you cared about.</p><p>So while an intermittent power fault feels like an annoyance rather than an emergency, it is quietly a data risk. If you are going to leave it for a while, make sure whatever matters on that laptop is backed up somewhere else first.</p><p>The good news is that these faults are genuinely fixable. A DC jack is a common repair, memory reseating costs almost nothing, and even the more awkward ones can usually be identified precisely once the machine is open. What they are not is a reason to write off an otherwise good laptop, which is what a lot of people quietly assume when a machine starts behaving unpredictably.</p><p>If you would rather hand it over: free collection across Bournemouth, Poole and Dorset, an honest answer about whether it is worth repairing, and no fix means no fee.</p>",
            },
        ],
        "faqs": [
            {
                "q": "Why does my laptop turn off when I pick it up or move it?",
                "a": "Because movement can only affect physical connections, so something inside is making contact intermittently. The quickest way to narrow it down is to work out which power source the fault follows: run it on battery alone and move it, then on the mains lead alone and move it. If it only cuts out on mains the charging socket is the suspect, if only on battery it is the battery connection, and if both then the fault is further inside, usually memory or the board.",
            },
            {
                "q": "How do I know if the DC power jack is broken?",
                "a": "With the laptop running from the charger, gently wiggle the plug where it enters the machine. If the charging light flickers or the laptop cuts out, the socket or the lead is at fault. Other tells are a plug that feels looser than it used to, or a habit you have developed of propping the lead at a particular angle to keep it charging. Before assuming the socket, try a different charger if you can borrow one, because charger leads fail internally near the plug ends and behave identically.",
            },
            {
                "q": "Can loose RAM make a laptop shut off instantly?",
                "a": "Yes, and it is one of the more common causes when the fault happens on both mains and battery. Memory modules sit in sprung slots held by clips, and a module that is not fully seated or has tarnished contacts can lose connection under vibration. A laptop that loses its memory stops instantly with no shutdown sequence, exactly matching the symptom. On machines with an access panel, reseating the modules firmly is a quick thing to try.",
            },
            {
                "q": "Is it safe to keep using a laptop that cuts out when moved?",
                "a": "It will not hurt you, but it is quietly rough on your data. Each abrupt power loss interrupts whatever Windows was writing at that moment, and files caught mid-write can be left incomplete or corrupted. One occurrence is usually harmless, but repeated cut-outs over months raise the odds of file system damage. If you plan to live with it for a while, make sure anything that matters is backed up somewhere off that laptop.",
            },
            {
                "q": "Is a laptop that shuts off when moved worth repairing?",
                "a": "Usually yes. A power socket replacement is common repair-bench work, and reseating memory costs almost nothing. The one answer that is sometimes not economic is a cracked solder joint on the motherboard itself, which happens on laptops that have been dropped or carried open by one corner. A proper diagnosis tells you which you have before you spend anything, which is why we will not quote this one blind.",
            },
        ],
        "crossLinksHtml": "<p><strong>Related guides:</strong> <a href=\"/laptop-turns-off-when-unplugged/\">Laptop only works plugged in</a> &middot; <a href=\"/laptop-wont-turn-on-no-lights/\">Laptop won't turn on, no lights</a> &middot; <a href=\"/laptop-repair/\">Laptop repair</a> &middot; <a href=\"/data-recovery/\">Data recovery</a></p>",
        "primaryCta": CTA1,
        "secondaryCta": CTA2,
        "schemaKind": "service",
    },

    # ---------------------------------------------------------------- 4 ----
    {
        "slug": "laptop-stuck-on-logo-wont-boot",
        "title": "Laptop Stuck on the Manufacturer Logo? What to Do",
        "metaDesc": "Stuck on the Dell, HP or Lenovo logo? Unplug every USB device first, then check whether the BIOS can still see the drive. Both checks are free.",
        "ogTitle": "Laptop Stuck on the Manufacturer Logo and Won't Boot",
        "crumbName": "Stuck on Logo",
        "eyebrow": "// BOOT FAILURES",
        "h1": "Laptop Stuck on the Manufacturer Logo? Start With the Free Checks",
        "lede": "The Dell, HP or Lenovo logo appears, and then nothing &mdash; no spinning dots, no Windows, no error. Just the logo, indefinitely. It is a genuinely frightening screen because it gives you nothing to work with, but it narrows down further than you would think, and the first two things to try cost nothing and risk nothing. Work through them in order before anybody talks to you about reinstalling Windows.",
        "chips": CHIPS,
        "ctaHead": "Need the files off it?",
        "ctaSub": "A laptop that will not boot almost always still has your data intact. We recover first and repair second, collect free across Dorset, and no fix means no fee.",
        "serviceName": "Laptop Boot Failure and Data Recovery",
        "sections": [
            {
                "eyebrow": "/01 &mdash; WHAT THE LOGO MEANS",
                "h2": "How far it got before it stopped",
                "html": "<p>The logo screen is more informative than it looks. Reaching it means the laptop powered up, the processor started, the memory passed its basic check and the firmware ran. That is a lot of hardware confirmed working &mdash; considerably more than a laptop showing a black screen and nothing else.</p><p>What happens immediately after the logo is the handover: the firmware looks for a bootable drive, finds the Windows boot files on it, and passes control to Windows. Sitting on the logo means the machine got as far as that handover and then stalled.</p><p>So the fault is in a short list: the firmware cannot find a drive to boot from, it found the drive but the boot files are damaged, or something is interfering with the search. All three are worth separating before you assume the worst, because two of them are commonly fixable without losing anything.</p><p>One thing to avoid while you work through this: repeatedly forcing the laptop off with the power button. It is understandable, but each forced power-off during a boot attempt is another chance to interrupt a write and add corruption to whatever is already wrong. Give each attempt a few minutes before intervening.</p>",
            },
            {
                "eyebrow": "/02 &mdash; UNPLUG EVERYTHING",
                "h2": "The free fix that works more often than it should",
                "html": "<p>Do this first, because it costs nothing and it genuinely resolves a good proportion of these.</p><p>Unplug every single external device: USB sticks, external hard drives, phones on charge, printers, docking stations, SD cards left in the slot, even USB hubs and wireless dongles. Leave only the charger. Then restart.</p><p>The reason is boot order. The firmware works down a list of places to look for an operating system, and many laptops are set to try USB devices before the internal drive. A USB stick that is not bootable can leave the machine sitting there having found <em>something</em>, waiting, and getting nowhere. An SD card left in the reader does the same thing. So does a phone that presents itself as storage.</p><p>People dismiss this because the device in question has been plugged in for months without trouble &mdash; but a firmware update, a battery change or a settings reset can alter the boot order underneath you, and then the same harmless USB stick becomes the thing stopping your laptop.</p><p>If it boots normally with everything unplugged, reconnect the devices one at a time to identify the culprit, and then either leave that one out during startup or change the boot order in the firmware settings so the internal drive is tried first.</p>",
            },
            {
                "eyebrow": "/03 &mdash; CAN THE BIOS STILL SEE THE DRIVE?",
                "h2": "The single most important question",
                "html": "<p>This is the check that separates an inconvenience from a serious problem, and it takes two minutes.</p><p>Restart the laptop and press the firmware key repeatedly as soon as you power on &mdash; usually F2 on Dell, F10 on HP, F1 or Enter on Lenovo, and it is normally printed briefly on the logo screen. That gets you into the BIOS or UEFI settings, which run independently of Windows.</p><p>Find the system information or storage page and look for your drive. You are answering one question: <strong>is the drive listed?</strong></p><p><strong>If the drive is listed</strong>, the hardware is alive and being detected. Your problem is almost certainly the Windows boot files rather than the disk, which is very often repairable, and your data is in place. This is the good outcome.</p><p><strong>If the drive is not listed at all</strong> &mdash; the slot shows empty or none &mdash; the laptop genuinely cannot see the disk. That means a failed drive, or a failed connection to it. This is the outcome that needs care, and it is the point at which we would ask you to stop trying things.</p><p>Note that being listed is not a clean bill of health; a drive can be detected and still be failing. But a drive that has vanished from the firmware entirely is unambiguous.</p>",
            },
            {
                "eyebrow": "/04 &mdash; IF THE DRIVE IS THERE",
                "h2": "Repairing the boot, without reinstalling",
                "html": "<p>A detected drive that will not boot usually means the boot configuration is damaged &mdash; commonly after a Windows update was interrupted, a power loss mid-update, or a failed driver change.</p><p>Windows has a built-in repair for exactly this. Interrupting the boot three times in a row (power on, and as soon as the logo appears hold the power button until it switches off, three times) triggers the recovery environment on the fourth attempt. From there, Advanced options gives you <strong>Startup Repair</strong>, which rebuilds the boot files without touching your documents.</p><p>Worth knowing: this deliberate triple-interrupt is the one time forcing the laptop off is the right move, and it is different from the panicked repeated power-cycling warned about earlier &mdash; here you are intentionally invoking a recovery feature.</p><p>If Startup Repair does not succeed, System Restore from the same menu will roll the machine back to a point before the problem, and again leaves your files alone.</p><p>What we would avoid at this stage is any option described as reset, refresh or reinstall. Those can and do remove your data, and there is no need to reach for them while gentler options remain and before anything has been backed up. If the repair options have failed, the sensible next move is to get the files off the drive first and worry about the operating system afterwards &mdash; not the other way round.</p>",
            },
            {
                "eyebrow": "/05 &mdash; IF THE DRIVE HAS VANISHED",
                "h2": "Stop, and protect the data",
                "html": "<p>If the firmware cannot see the drive, the most valuable thing you can do is stop.</p><p>A failing drive has a limited number of good attempts left in it. Every power-on, every boot attempt, every retry uses some of them &mdash; and on a mechanical drive that is physically deteriorating, repeated attempts can turn a recoverable situation into an unrecoverable one. The instinct to keep trying is completely natural and it is the single most expensive mistake people make with this fault.</p><p>Listen to the machine, too. Repetitive clicking or a rhythmic buzzing from a mechanical hard drive is a mechanical failure in progress, and it is the clearest possible signal to power down and leave it alone. Solid state drives fail silently by comparison, so no noise does not mean no problem.</p><p>The important thing to hold on to is that a drive the laptop cannot boot from is not the same as data that is gone. Files are very often fully recoverable from a drive that will not start Windows, either by reading it in another machine or, in more serious cases, through specialist recovery. What determines the outcome is usually how much it was hammered before someone stopped.</p><p>We do this work regularly, and we would always rather see a laptop early than after a fortnight of retries. Free collection across Bournemouth, Poole and Dorset, we tell you what we find before doing anything chargeable, and no fix means no fee.</p>",
            },
        ],
        "faqs": [
            {
                "q": "Why is my laptop stuck on the manufacturer logo and not loading Windows?",
                "a": "Reaching the logo means the processor, memory and firmware are all working, and the machine stalled at the point where it hands over to Windows. That narrows it to three things: it cannot find a drive to boot from, it found the drive but the Windows boot files are damaged, or an external device is interfering with the search. Start by unplugging every USB device and SD card and restarting, because that resolves a surprising number of them for free.",
            },
            {
                "q": "Why would a USB stick stop my laptop booting?",
                "a": "Because the firmware works down a list of places to look for an operating system, and many laptops are set to try USB devices before the internal drive. A USB stick, external drive, SD card or even a phone on charge can leave the machine sitting there having found something it cannot boot from. It often surprises people because the device has been plugged in for months, but a firmware update or settings reset can change the boot order underneath you.",
            },
            {
                "q": "How do I check whether my laptop can still see its hard drive?",
                "a": "Restart and press the firmware key repeatedly as you power on, usually F2 on Dell, F10 on HP, F1 or Enter on Lenovo. In the BIOS or UEFI settings, find the system information or storage page and look for the drive. If it is listed, the hardware is alive and the problem is likely the Windows boot files, which is usually repairable with your data intact. If the slot shows empty, the laptop genuinely cannot see the disk and you should stop trying to boot it.",
            },
            {
                "q": "Can I fix a laptop stuck on the logo without losing my files?",
                "a": "Often yes, if the drive is still detected. Interrupting the boot three times in a row triggers the Windows recovery environment on the fourth attempt, and from Advanced options, Startup Repair rebuilds the boot files without touching your documents. System Restore from the same menu is the next option. Avoid anything described as reset, refresh or reinstall while gentler options remain, because those can remove your data.",
            },
            {
                "q": "My laptop is clicking and stuck on the logo. What should I do?",
                "a": "Power it off and stop trying. Repetitive clicking or rhythmic buzzing from a mechanical hard drive indicates a mechanical failure in progress, and every further boot attempt risks turning a recoverable situation into an unrecoverable one. The data is very often still retrievable at this stage, either by reading the drive in another machine or through specialist recovery, but the outcome depends heavily on how much the drive was used after the noise started.",
            },
        ],
        "crossLinksHtml": "<p><strong>Related guides:</strong> <a href=\"/laptop-clicking-noise-wont-turn-on/\">Laptop making a clicking noise</a> &middot; <a href=\"/laptop-wont-turn-on-no-lights/\">Laptop won't turn on, no lights</a> &middot; <a href=\"/data-recovery/\">Data recovery</a> &middot; <a href=\"/laptop-repair/\">Laptop repair</a></p>",
        "primaryCta": CTA1,
        "secondaryCta": CTA2,
        "schemaKind": "service",
    },
]
