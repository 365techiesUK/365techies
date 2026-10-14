# -*- coding: utf-8 -*-
# /ai/case-studies/ — the evidence page. HOUSE RULES THIS PAGE LIVES OR DIES BY:
# every date below is a real git first-commit date from this repo; every count
# is owner-confirmed or code-verified; NO invented percentages, time savings or
# outcomes (doc 05 s17.3: no synthetic proof — if we didn't measure it, it
# isn't here). Where a system is deterministic automation rather than AI, the
# copy SAYS SO — "AI only where it earns its place" is the proof point, not a
# weakness. Competitive context (internal): none of the 5 closest local rivals
# publishes a single verifiable case study (seo-research/local-top5-2026-08-10.md).
# These are our own systems, so no customer permission is needed; client case
# studies (Beckox, Keith Motors) join ONLY after launch/working per their gates.

PAGE = {
    "slug": "ai/case-studies",
    "name": "Case Studies",
    "title": "AI & Automation Case Studies — Real Systems, Real Dates | 365 Techies",
    "desc": ("Not promises - shipped systems with dates. The automation and AI running 365 Techies' "
             "own business every day: booking rescue, review pipeline, live energy dashboards."),
    "eyebrow": "AI &amp; Automation &middot; Evidence",
    "h1": "Case studies with dates, not adjectives",
    "hero_lede": ("Anyone can say &ldquo;AI transforms your business&rdquo;. We&rsquo;d rather show you "
                  "the systems running <em>our own</em> business right now &mdash; what each one does, when it "
                  "shipped, and where a human stays in charge. Every date below is real. Where a number "
                  "wasn&rsquo;t measured, it isn&rsquo;t here."),
    "chips": ["Our own systems, dated", "No invented numbers", "A person approves the big stuff"],
    "cta_primary": {"label": "Tell us what's wasting your time", "href": "/ai/start/"},
    "cta_secondary": {"label": "Call 01202 775566", "href": "tel:+441202775566"},
    "service_desc": None,
    "pricing": {
        "subscription_line": "Monthly service &mdash; confirmed with your quote",
        "build_line": "One-off design and build &mdash; quoted by complexity.",
        "note": ("Every system on this page started exactly the way yours would: a problem described "
                 "in plain English, then a scoped build."),
    },
    "sections": [
        {"h2": "Why we case-study ourselves first",
         "html": ("<p>We looked at every AI company serving Bournemouth, Poole and Dorset and could not "
                  "find one published case study a reader could actually verify. We&rsquo;re not going to add "
                  "to that pile. Our first case studies are the systems we run our own company on &mdash; "
                  "because you can see them working, we can show the real dates, and nobody had to "
                  "approve a press release. Client case studies will join this page as projects launch, "
                  "with the client&rsquo;s permission and their numbers, not ours.</p>"
                  "<p>One more honest note: some of what follows is <strong>deterministic automation rather "
                  "than AI</strong> &mdash; rules, not guesses. We label which is which, because knowing when "
                  "<em>not</em> to use AI is most of the job.</p>")},
        {"h2": "Case study: the enquiry that used to vanish",
         "html": ("<p><strong>Type: deterministic automation, live since 1 August 2026.</strong></p>"
                  "<p><strong>The problem.</strong> Someone picks a service on our booking page, chooses a "
                  "time, types their name and phone number &mdash; then never enters the emailed confirmation "
                  "code. Before this system, that person left <em>no trace at all</em>. The warmest lead a "
                  "website makes, gone silently.</p>"
                  "<p><strong>What we built.</strong> The booking system now parks those details safely the "
                  "moment they&rsquo;re typed. A scheduled job sweeps every fifteen minutes; anything older "
                  "than twenty-five minutes triggers one alert to our team chat &mdash; name, service, the "
                  "slot they wanted &mdash; so a human can ring back while the enquiry is still warm. It "
                  "reports each person exactly once, never texts anyone, and clears itself after 24 "
                  "hours.</p>"
                  "<p><strong>Where the human stays in charge.</strong> The system never contacts the "
                  "customer. It tells <em>us</em>, and a person decides.</p>"
                  "<p><strong>Verifiable.</strong> Try it: start a booking at "
                  "<a href=\"/book-service/\">book-service</a> and abandon it. We&rsquo;ll be the ones who "
                  "call you.</p>")},
        {"h2": "Case study: the review request that sends itself",
         "html": ("<p><strong>Type: deterministic automation, live since 25 July 2026.</strong></p>"
                  "<p><strong>The problem.</strong> The best moment to ask for a Google review is shortly "
                  "after a job is finished &mdash; and it&rsquo;s exactly the moment a busy technician forgets.</p>"
                  "<p><strong>What we built.</strong> When a job is marked complete, a review invitation "
                  "queues automatically and sends from our own mail server about half an hour later &mdash; "
                  "inside sociable hours only. The system tracks what it has asked so nobody is asked "
                  "twice, and a heartbeat file proves every run happened, because &ldquo;it ran and found "
                  "nothing&rdquo; and &ldquo;it never ran&rdquo; should never look the same.</p>"
                  "<p><strong>Where the human stays in charge.</strong> A person marks the job complete; "
                  "the automation only handles the remembering.</p>"
                  "<p><strong>Verifiable.</strong> The reviews it gathers are on our Google profile &mdash; and on "
                  "our <a href=\"/reviews/\">reviews page</a>, which only ever shows words verified against "
                  "Google&rsquo;s own records.</p>")},
        {"h2": "Case study: live data from a camper van, on a public webpage",
         "html": ("<p><strong>Type: systems integration with live data, live since 2 July 2026.</strong></p>"
                  "<p><strong>The problem.</strong> Off-grid electrical systems &mdash; boats, vans, cabins &mdash; "
                  "generate rich live data that usually stays locked inside an installer&rsquo;s app.</p>"
                  "<p><strong>What we built.</strong> Our own camper van&rsquo;s Victron energy system streams "
                  "its live state &mdash; battery, solar, consumption &mdash; through a secure server-side "
                  "connection onto <a href=\"/custom-vrm-dashboards/\">public dashboard pages</a>, with the "
                  "access token held server-side where a visitor can never reach it, and a cache layer "
                  "so a burst of visitors costs the van nothing. Victron accepted 365 Techies as a "
                  "<strong>Recommended Software Integrator</strong> on the strength of this work.</p>"
                  "<p><strong>Where the human stays in charge.</strong> The integration is read-only by "
                  "design &mdash; the public page can see the van; nothing on the internet can touch it.</p>"
                  "<p><strong>Verifiable.</strong> The dashboard is live on this site right now &mdash; "
                  "<a href=\"/custom-vrm-dashboards/\">watch the van think</a>.</p>")},
        # 14 Oct 2026 (owner: "start one and two" on the AI-brief review): our own apps as the proof of AI-built
        # software. Dates/counts from git (downloads/pcm/version.json: public download 4 Sep, 10 versions 1.0.24 ->
        # 1.0.40 from 7 Sep to 13 Oct; downloads/t1/version.json: first signed download 10 Oct, 0.13.1-0.13.4 by 11
        # Oct) and the 14 Oct checks (sandbox-tests/, winget PRs #451360/#452150, av-submissions/). Say "passed
        # Microsoft's checks", never "listed on winget" until a moderator merges.
        {"h2": "Case study: our own Windows apps, built with AI and checked before they ship",
         "html": ("<p><strong>Type: software written with AI coding tools. 365 PC Manager public since 4 September "
                  "2026; Techies One Mail since 10 October 2026.</strong></p>"
                  "<p><strong>The problem.</strong> Small firms are told AI can write a program in an afternoon. "
                  "It can write it. Whether it installs cleanly on a stranger&rsquo;s PC, gets past their antivirus "
                  "and keeps working after every update is a different question &mdash; and that&rsquo;s the part "
                  "that takes care.</p>"
                  "<p><strong>What we built.</strong> Two free Windows programs, written in-house with AI coding "
                  "tools: <a href=\"/free-pc-health-check/\">365 PC Manager</a>, a plain-English health check for "
                  "your PC, and <a href=\"/techies-one-mail/\">Techies One Mail</a>, a simple email program with "
                  "scam warnings. Both update themselves. PC Manager had ten public releases between 7 September "
                  "and 13 October 2026; Techies One Mail went from its first signed download to four updates in "
                  "two days (10 and 11 October), the last one adding All inboxes.</p>"
                  "<p><strong>How we check them before anyone gets them.</strong></p>"
                  "<ul><li>Both programs and their installers are digitally signed by 365 Techies Ltd, so Windows "
                  "shows our name, not &ldquo;unknown publisher&rdquo;.</li>"
                  "<li><strong>14 October 2026:</strong> both installed on a brand-new copy of Windows in a sandbox. "
                  "Each opened by itself, and uninstalling left nothing behind.</li>"
                  "<li><strong>14 October 2026:</strong> both downloaded through Microsoft Edge onto a clean Windows: "
                  "no download warning and no &ldquo;Windows protected your PC&rdquo; box. (We proved the test was "
                  "real: Microsoft&rsquo;s own SmartScreen test file did get a warning.)</li>"
                  "<li><strong>October 2026:</strong> both passed every automatic check Microsoft runs for its "
                  "Windows Package Manager, including a test install in Microsoft&rsquo;s own sandbox.</li>"
                  "<li>New releases go to the antivirus makers our customers use most &mdash; F-Secure (TalkTalk "
                  "SuperSafe), AVG and Avast, and Norton &mdash; to be checked before anyone&rsquo;s download is "
                  "blocked. The latest went on 14 October 2026.</li></ul>"
                  "<p><strong>Where the human stays in charge.</strong> AI writes code; a person decides what "
                  "ships. Nothing reaches a customer until it has passed these checks and we have signed it "
                  "ourselves.</p>"
                  "<p><strong>Verifiable.</strong> Download either program, then right-click the file &rarr; "
                  "Properties &rarr; Digital Signatures: it says 365 Techies Ltd. Or open either download page on "
                  "your phone and tap Download: it offers to send the link to your computer instead. That fix was "
                  "found, built, tested on four kinds of device and live in a single night, on 14 October 2026.</p>")},
        {"h2": "Where AI itself earns its place",
         "html": ("<p>The systems above are mostly rules &mdash; and proud of it. AI enters where judgement "
                  "or language is the job:</p>"
                  "<ul><li><strong>AI voice agents</strong> &mdash; answering calls in natural language, taking "
                  "bookings and messages, handing anything unusual to a person. <a href=\"/ai/voice-agents/\">"
                  "From &pound;95/month</a>.</li>"
                  "<li><strong>Drafting and summarising</strong> &mdash; enquiry summaries, reply drafts, report "
                  "wording &mdash; always with a person approving before anything consequential happens.</li>"
                  "<li><strong>Our own engineering</strong> &mdash; much of the software on this page, and both our "
                  "Windows apps, was built in-house with AI coding tools, then checked before it shipped (the "
                  "case study above shows how). We sell what we practise.</li></ul>"
                  "<p>That split &mdash; rules where rules win, AI where AI wins, humans in charge of both &mdash; "
                  "is the whole philosophy. It&rsquo;s also why nothing on this page needed a disclaimer.</p>")},
    ],
    "faqs": [
        {"q": "Are these case studies real?",
         "a": ("Yes &mdash; they are the systems running 365 Techies itself, with real ship dates from our "
               "own version-control history. You can test three of them from this website today: abandon a "
               "booking and see who calls you, watch the live van dashboard, or download one of our apps and "
               "check its digital signature.")},
        {"q": "Why are there no customer case studies yet?",
         "a": ("Because we publish evidence, not anecdotes. Client AI projects will appear here once "
               "they&rsquo;re launched and working, with the client&rsquo;s permission and their measured "
               "results &mdash; not before. In a market where nobody publishes verifiable proof, we&rsquo;d "
               "rather be slow and checkable than fast and vague.")},
        {"q": "Would my system be identical to these?",
         "a": ("No &mdash; and be wary of anyone who says otherwise. These show the shape of our work: "
               "understand the workflow, automate the mechanical part, add AI only where it earns its "
               "place, and keep a person in charge of anything consequential. Your build is scoped "
               "around your workflow and quoted individually.")},
    ],
    "final_cta": {
        "h2": "Got a job these remind you of?",
        "lede": ("Describe the repetitive work in plain English &mdash; we&rsquo;ll tell you honestly whether "
                 "it wants rules, AI, or a person, and quote the build around your answer."),
    },
}
