# -*- coding: utf-8 -*-
"""
Parents' online-safety guide: the hub + the six platforms Dorset Police's guide does
NOT cover (YouTube/YouTube Kids, Xbox, PlayStation, Nintendo Switch, Minecraft, and
device-level Apple Screen Time / Google Family Link).

WHY THIS EXISTS (2026-08-18): Dorset Police published a 22-page PDF "Social media
parental controls and guidance" (12 platforms: Instagram, Facebook/Messenger,
Messenger Kids, TikTok, X, Reddit, Discord, Snapchat, WhatsApp, Telegram, Fortnite,
Roblox). It is good and official. It is also a PDF, undated per platform, and it skips
YouTube, every games console, Minecraft and the device-level controls that a techie
sets up first on any family visit. We COMPLEMENT it: credit + link to their guide
for the platforms they did, cover the six they didn't, on the web, per platform,
dated, verified.

EVERY STEP BELOW WAS CHECKED AGAINST THE VENDOR'S OWN CURRENT HELP PAGES ON
2026-08-18 (sources in each page's 'sources' list, rendered on the page). Menu names
are quoted as the vendor prints them. Where the vendor does not document a thing, the
page says so rather than guessing (e.g. no "Trusted-only" Minecraft menu - Mojang
documents Java "Chat mode": Shown / Commands Only / Hidden). When re-checking, update
CHECKED_ON and the sources; if a step no longer matches the app, fix it or remove it -
a wrong menu path in a child-safety guide is worse than none.

Ages/laws: UK. Under-13 accounts need a parent (Apple UK, Google). UK Online Safety
Act age-assurance prompts (from July 2025) are named where a parent will meet them.

Structure: each entry is a NEW_PAGES-style dict (build_extra pack assembler) with
howToSteps -> HowTo schema, faqs -> FAQPage, crossLinksHtml, and a 'sources' list we
render as an "Checked against" box. Registered from build_extra via PARENTS_PAGES.
"""

CHECKED_ON = "18 August 2026"
DORSET_GUIDE = "https://www.dorset.police.uk/police-forces/dorset-police/areas/campaigns/campaigns/social-media-user-guide/"

_CTA_HEAD = "Rather we set it up on the actual devices?"
_CTA_SUB = ("Call 01202 775566 or text 07520 615332, Mon&ndash;Fri 9&ndash;5. We&rsquo;ll set the controls up properly on your child&rsquo;s phone, tablet, console or PC "
            "&mdash; remotely, or at home across Bournemouth, Poole, Christchurch &amp; Dorset &mdash; and show you where everything lives, so you&rsquo;re in charge afterwards, not us. "
            "Free 15-minute phone chat first; no charge for advice.")

# The "it's already gone wrong" ladder - the same on every page. Real, checked organisations.
_HELP_LADDER = (
    '<div class="prose" style="border:1px solid rgba(232,99,126,.35);border-radius:14px;padding:1.1rem 1.3rem;margin:1.4rem 0;background:rgba(232,99,126,.06)">'
    '<p class="eyebrow mono" style="margin-top:0">// IF SOMETHING HAS ALREADY GONE WRONG</p>'
    '<ul style="margin:.4rem 0 0">'
    '<li><strong>A child is in immediate danger:</strong> call <strong>999</strong>. Otherwise Dorset Police on <strong>101</strong> or online at <a href="https://www.dorset.police.uk/" target="_blank" rel="noopener">dorset.police.uk</a>.</li>'
    '<li><strong>Someone online is talking to your child in a sexual way, or asking for images:</strong> report to <strong>CEOP</strong> (the police&rsquo;s child-protection command) at <a href="https://www.ceop.police.uk/Safety-Centre/" target="_blank" rel="noopener">ceop.police.uk</a>.</li>'
    '<li><strong>A nude or sexual image of an under-18 is online:</strong> <a href="https://www.childline.org.uk/info-advice/bullying-abuse-safety/online-mobile-safety/remove-nude-image-shared-online/" target="_blank" rel="noopener">Childline&rsquo;s Report Remove</a> can get it taken down, confidentially.</li>'
    '<li><strong>You want to talk it through with someone:</strong> the <strong>NSPCC helpline</strong> 0808 800 5000 for adults; <strong>Childline</strong> 0800 1111 for children and young people.</li>'
    '<li><strong>Bullying, scams or a compromised account:</strong> screenshot everything before you delete anything, then use the platform&rsquo;s report tool &mdash; and if the account is one we look after, ring us.</li>'
    '</ul></div>')

def _sources(items):
    """Render the 'checked against' box - the honesty device that makes this better than a PDF."""
    lis = "".join(f'<li><a href="{u}" target="_blank" rel="noopener">{t}</a></li>' for t, u in items)
    return (f'<div class="prose" style="border:1px solid var(--line);border-radius:14px;padding:1rem 1.3rem;margin:1.4rem 0;font-size:.95rem">'
            f'<p class="eyebrow mono" style="margin-top:0">// CHECKED AGAINST THE MAKER&rsquo;S OWN INSTRUCTIONS &middot; {CHECKED_ON}</p>'
            f'<p style="margin:.3rem 0 .5rem">Apps change their menus often. Every step on this page was checked against these official help pages on the date above. If a step no longer matches what you see, tell us on 01202 775566 and we&rsquo;ll fix it.</p>'
            f'<ul style="margin:0">{lis}</ul></div>')

def _dorset_note(what_they_cover):
    return (f'<p><strong>Dorset Police have covered {what_they_cover} in their own guide</strong> &mdash; the step-by-step for Instagram, Facebook, Messenger Kids, TikTok, X, Reddit, Discord, Snapchat, WhatsApp, Telegram, Fortnite and Roblox. '
            f'It&rsquo;s good and it&rsquo;s official; <a href="{DORSET_GUIDE}" target="_blank" rel="noopener">read it here</a>. This page covers what it doesn&rsquo;t.</p>')

PARENTS_PAGES = []

# =====================================================================================
# HUB
# =====================================================================================
PARENTS_PAGES.append({
 'slug': 'parents-guide-online-safety',
 'title': 'Parental Controls Guide UK: Every App, Console & Device',
 'metaDesc': "Which apps does your child use? Pick them and get today's parental-control steps: YouTube, Xbox, PlayStation, Switch, Minecraft, iPhone & Android. Checked against the makers' own help.",
 'ogTitle': 'The parents&rsquo; guide to parental controls &mdash; every app, console and device',
 'crumbName': 'Parents&rsquo; Online Safety Guide',
 'eyebrow': '// PARENTS&rsquo; GUIDE &middot; CHECKED ' + CHECKED_ON.upper(),
 'h1': 'Parental controls, app by app &mdash; the steps as they are <em class="grad grad--cyan">today</em>',
 'lede': ('Every app and console has parental controls. Almost nobody sets them up, because the menus move, the guides go stale, and it always seems like a job for a rainy Sunday. '
          'This is the guide we wish existed: <strong>one page per app, the exact menu names as they are right now, checked against the maker&rsquo;s own instructions on the date shown</strong>, '
          'and honest about what a control does and doesn&rsquo;t do. Dorset Police published an excellent guide to the social apps this week &mdash; we&rsquo;ve linked it, and covered the things it doesn&rsquo;t: '
          'YouTube, the games consoles, Minecraft, and the phone-level controls that do more than any single app.'),
 'chips': ['Checked ' + CHECKED_ON, 'UK ages &amp; law', 'Family-run since 1995'],
 'primaryCta': ('Pick your child&rsquo;s apps', '#picker'), 'secondaryCta': ('Call 01202 775566', 'tel:+441202775566'),
 'ctaHead': _CTA_HEAD, 'ctaSub': _CTA_SUB,
 'schemaKind': 'article',
 'sections': [
  {'eyebrow': '/01 &mdash; START HERE', 'h2': 'Which apps and devices does your child actually use?',
   'html': (
    '<p>Don&rsquo;t read all of this. Tick what&rsquo;s in your house and go straight to those pages &mdash; each one stands alone, and each one is short enough to do with the device in your other hand.</p>'
    '<div id="picker" class="tile-grid" data-stagger style="margin:1rem 0 1.4rem">'
    '<a class="tile" href="/youtube-parental-controls/" style="text-decoration:none"><h3>&#9654;&#65039; YouTube &amp; YouTube Kids</h3><p>Supervised accounts, the three content levels, the Kids app timer and passcode, and the new teen supervision. The app most under-13s use most.</p></a>'
    '<a class="tile" href="/xbox-parental-controls-uk/" style="text-decoration:none"><h3>&#127918; Xbox</h3><p>Family group, screen time, age limits, &ldquo;ask a parent&rdquo; spending, who can talk to them &mdash; console, app and web, in the right order.</p></a>'
    '<a class="tile" href="/playstation-parental-controls-uk/" style="text-decoration:none"><h3>&#127918; PlayStation 5 &amp; 4</h3><p>Child accounts under a family manager, age level, monthly spend (default &pound;0), play time, and locking the console so it can&rsquo;t be undone.</p></a>'
    '<a class="tile" href="/nintendo-switch-parental-controls/" style="text-decoration:none"><h3>&#127918; Nintendo Switch &amp; Switch 2</h3><p>The Parental Controls app: play-time limit, bedtime, restriction level, and the Switch 2 GameChat gate for under-16s.</p></a>'
    '<a class="tile" href="/minecraft-parental-controls/" style="text-decoration:none"><h3>&#9635;&#65039; Minecraft</h3><p>Why it&rsquo;s really an Xbox-account setting even on a phone or PC: multiplayer, chat, Realms and Marketplace spending.</p></a>'
    '<a class="tile" href="/screen-time-and-family-link-parental-controls/" style="text-decoration:none"><h3>&#128241; iPhone / iPad &amp; Android</h3><p>Apple Screen Time and Google Family Link &mdash; the device-level controls that sit under every app. Set these first.</p></a>'
    '</div>'
    + _dorset_note('the social apps')
   )},
  {'eyebrow': '/02 &mdash; THE ORDER THAT WORKS', 'h2': 'Do it in this order and it takes an evening, not a month',
   'html': (
    '<ol>'
    '<li><strong>The device first.</strong> Apple Screen Time or Google Family Link governs <em>every</em> app on the phone or tablet at once &mdash; downtime, app limits, web filtering, purchases, who can message. Ten minutes here does more than an hour inside individual apps. <a href="/screen-time-and-family-link-parental-controls/">Start here.</a></li>'
    '<li><strong>Then the console</strong>, if there is one. Xbox, PlayStation and Switch each have a proper family system with play-time limits and spending caps &mdash; and every one of them can be locked with a PIN so the settings stay set. <a href="/xbox-parental-controls-uk/">Xbox</a> &middot; <a href="/playstation-parental-controls-uk/">PlayStation</a> &middot; <a href="/nintendo-switch-parental-controls/">Switch</a>.</li>'
    '<li><strong>Then the two or three apps that matter most</strong> in your house &mdash; usually YouTube plus whatever they talk to friends on. Don&rsquo;t try to do all twelve social apps in one go; do the ones they open every day.</li>'
    '<li><strong>Then the conversation.</strong> Every control on these pages can be undone by a determined teenager, and that&rsquo;s fine &mdash; the controls buy you time and remove the accidents; the conversation is what actually keeps them safe. Dorset Police&rsquo;s guide is good on this, and the NSPCC&rsquo;s <a href="https://www.nspcc.org.uk/keeping-children-safe/online-safety/" target="_blank" rel="noopener">online safety hub</a> is the best plain-English resource we know for talking about it.</li>'
    '</ol>'
    '<p>One honest thing before you start: <strong>none of this is a substitute for knowing what your child is doing</strong>. A control that&rsquo;s set and never revisited is a control that stopped working the day the app updated. Set them, then look again every school holiday &mdash; that&rsquo;s the whole trick.</p>'
   )},
  {'eyebrow': '/03 &mdash; UK AGES AND THE LAW', 'h2': 'The age rules you&rsquo;ll bump into (and the new age checks)',
   'html': (
    '<p>A few things trip parents up because they&rsquo;re UK-specific and recent:</p>'
    '<ul>'
    '<li><strong>Under 13.</strong> Apple (in the UK) and Google both say a child under 13 can&rsquo;t hold an ordinary account: it has to be created by a parent and sit inside a family group (Apple Family Sharing / Google Family Link). That&rsquo;s the door to <em>every</em> control on these pages, so it&rsquo;s worth doing properly rather than letting a child fib about a birth year &mdash; a fake age turns all the child protections off.</li>'
    '<li><strong>13 to 17.</strong> Teens can hold their own accounts, and supervision changes: Google emails both of you at 13, and (as Google puts it) &ldquo;children need parent approval to stop supervision until they turn 18&rdquo;. YouTube now offers a specific supervised teen account both sides agree to. Apple lets you set Screen Time on a teen&rsquo;s device from your own.</li>'
    '<li><strong>Age checks since July 2025.</strong> Under the UK Online Safety Act, platforms now have to check ages for adult content, so adults are being asked to prove they&rsquo;re over 18 &mdash; on Xbox (UK players started seeing prompts from July 2025), on Apple (a passport, driving licence, credit card or a PASS card such as CitizenCard), on YouTube (an age-estimation model, with ID or a selfie to prove otherwise). If <em>your</em> account gets prompted, that&rsquo;s this law working as intended, not a scam &mdash; but do it on the platform&rsquo;s own site or app, never from a link in a message.</li>'
    '<li><strong>Games ratings.</strong> The UK uses <strong>PEGI</strong> (3, 7, 12, 16, 18). Console age limits work off it; set the limit to your child&rsquo;s age and anything above needs your say-so.</li>'
    '</ul>'
   )},
  {'eyebrow': '/04 &mdash; WHEN IT&rsquo;S ALREADY GONE WRONG', 'h2': 'The people to call, in order', 'html': _HELP_LADDER +
    '<p>And us. We&rsquo;re an IT firm, not a helpline &mdash; but if the problem is a device or an account (something installed, a login taken over, a child&rsquo;s photos somewhere they shouldn&rsquo;t be), that <em>is</em> our job, and we&rsquo;ve done it gently for Dorset families since 1995. <strong>01202 775566</strong>.</p>'},
 ],
 'faqs': [
  {'q': 'Why did you write this when Dorset Police just published a guide?', 'a': 'Because theirs is good and ours is different. Dorset Police cover the twelve social and chat apps thoroughly, in a PDF. We&rsquo;ve linked it and not repeated it. Ours covers what theirs doesn&rsquo;t &mdash; YouTube, the games consoles, Minecraft, and the phone-level controls &mdash; on the web, one page per app, with the date each page was checked. Use both.'},
  {'q': 'How do I know these steps are current?', 'a': f'Each page has a &ldquo;checked against the maker&rsquo;s own instructions&rdquo; box with the date ({CHECKED_ON} at launch) and links to the exact official help pages the steps came from. When an app changes, we update the page and the date. If you spot a step that no longer matches your screen, ring us and we&rsquo;ll fix it that day.'},
  {'q': 'My child is 15 and will just turn all this off. Is there any point?', 'a': 'Yes, but a different one. For a 15-year-old, controls are less about locking and more about defaults, visibility and a conversation: bedtime downtime that both of you agreed to, spending that asks first, and supervision they consented to (YouTube&rsquo;s teen supervision, for instance, is designed to be agreed by both sides). Google&rsquo;s own rule is that a supervised child needs parental approval to stop supervision until 18 &mdash; but the honest answer is that trust and talking do most of the work at that age.'},
  {'q': 'Will you come and set this all up for us?', 'a': 'Yes &mdash; that&rsquo;s a normal job for us. Remotely, or at home across Bournemouth, Poole, Christchurch and Dorset. We set the controls up on the actual devices, write down where they live and what the passcodes are (for you, not us), and show you how to change them. Free 15-minute phone chat first on 01202 775566.'},
  {'q': 'Is any of this a substitute for talking to my child?', 'a': 'No, and we&rsquo;d be lying if we said so. Controls remove accidents and buy time; the conversation is what keeps children safe. Dorset Police&rsquo;s guide and the NSPCC&rsquo;s online-safety pages are both good on how to have it.'},
 ],
 'crossLinksHtml': ('<p>Related: our free <a href="/online-safety-course/">Staying Safe Online course</a> (scams, passwords, shopping safely &mdash; for grown-ups), '
                    '<a href="/family-it-support/">IT support for families</a>, and the <a href="/family/">365 Family View</a> for keeping a quiet eye on a relative&rsquo;s PC.</p>'),
})

# =====================================================================================
# 1. YOUTUBE + YOUTUBE KIDS
# =====================================================================================
PARENTS_PAGES.append({
 'slug': 'youtube-parental-controls',
 'title': 'YouTube Parental Controls UK: Kids App, Supervised & Teen',
 'metaDesc': "How to set up YouTube for a child today: supervised account content levels, YouTube Kids passcode, timer and blocking, and teen supervision. Steps checked against Google's own help.",
 'ogTitle': 'YouTube parental controls: the steps as they are today',
 'crumbName': 'YouTube Parental Controls',
 'eyebrow': '// YOUTUBE &amp; YOUTUBE KIDS &middot; CHECKED ' + CHECKED_ON.upper(),
 'h1': 'YouTube parental controls &mdash; supervised accounts, YouTube Kids and <em class="grad grad--cyan">teen supervision</em>',
 'lede': ('YouTube is the app most under-13s use most, and it has three quite different setups depending on age: <strong>YouTube Kids</strong> (a separate, walled app), a <strong>supervised account</strong> on the main YouTube app with a content level you choose, '
          'and &mdash; new &mdash; a <strong>supervised teen account</strong> that both parent and teenager agree to. Here&rsquo;s each one, with the menu names as Google prints them today, and the two things everyone gets wrong (the timer, and the age a supervised account switches to &ldquo;Most of YouTube&rdquo;).'),
 'chips': ['Checked ' + CHECKED_ON, 'Under-13, and 13&ndash;17', 'Google&rsquo;s own steps'],
 'primaryCta': ('Jump to the steps', '#step1'), 'secondaryCta': ('Call 01202 775566', 'tel:+441202775566'),
 'ctaHead': _CTA_HEAD, 'ctaSub': _CTA_SUB,
 'schemaKind': 'article',
 'howToName': 'Set up YouTube for a child under 13 with a content level',
 'howToSteps': [
  {'name': 'Create the child&rsquo;s Google account in Family Link', 'text': 'In the Family Link app, select your child&rsquo;s profile at the top left, then Add child, and follow the on-screen steps, signing in with your own Google account to give consent.'},
  {'name': 'Choose YouTube Kids or a supervised YouTube experience', 'text': 'For an under-13 Google offers two options: the separate YouTube Kids app, or a supervised experience on the main YouTube app. Younger children: Kids. Older primary and up: supervised.'},
  {'name': 'Pick the content level', 'text': 'In Family Link: your child > Controls > YouTube > Edit under YouTube settings (some app versions show Controls > Content restrictions > YouTube). Choose Explore (roughly 9+), Explore more (roughly 13+) or Most of YouTube (everything except 18+ and unsuitable content). Google sets no default, so choose deliberately.'},
  {'name': 'Or set it from the YouTube app', 'text': 'Signed in as the parent: You (bottom right) > Settings > Family Centre > your child > Edit next to Content settings.'},
  {'name': 'Turn on the time tools', 'text': 'In Family Centre > Time management you can set take-a-break and bedtime reminders and a daily limit on the Shorts feed (from March 2026, that limit can be set to zero).'},
 ],
 'sections': [
  {'eyebrow': '/01 &mdash; WHICH ONE?', 'h2': 'Three setups, by age', 'html': (
   '<ul>'
   '<li><strong>Roughly 4&ndash;8: YouTube Kids.</strong> A separate app with its own age bands (&ldquo;Preschool: ages 4 &amp; under&rdquo;, &ldquo;Younger: ages 5&ndash;8&rdquo;, &ldquo;Older: ages 9&ndash;12&rdquo;, or &ldquo;Approve content yourself&rdquo;), a passcode, a timer, and blocking. Search can be turned off entirely.</li>'
   '<li><strong>Roughly 9&ndash;12: a supervised account on the main YouTube app.</strong> A real Google account, created by you in Family Link, with a content level: <strong>Explore</strong> (&ldquo;generally aligns with content ratings for viewers 9+&rdquo;), <strong>Explore more</strong> (13+), or <strong>Most of YouTube</strong> (&ldquo;almost all videos&rdquo; except 18+). Google sets <em>no default</em> &mdash; you choose. Supervised children on the upper two levels can read comments but not write them.</li>'
   '<li><strong>13&ndash;17: a supervised teen account.</strong> New and worth knowing about: in the YouTube app, You &gt; Settings &gt; Family Centre &gt; <strong>Invite a teen</strong> &gt; Create invitation; the teen scans a QR code or link (they can equally invite you). Both sides have to agree, and either can turn it off. You then see the channels they own, their uploads, live-stream activity, comments and subscriptions, and can set take-a-break and bedtime reminders and a limit on Shorts scrolling.</li>'
   '</ul>'
   + _dorset_note('the social and chat apps')
  )},
  {'eyebrow': '/02 &mdash; YOUTUBE KIDS, STEP BY STEP', 'h2': 'The Kids app: passcode, timer, blocking, search off', 'html': (
   '<ol>'
   '<li><strong>Get into the parent settings.</strong> Tap Settings in the corner of the screen and complete the multiplication problem, or enter your custom passcode.</li>'
   '<li><strong>Set your own passcode</strong> (do this first &mdash; the maths sum is not a lock, a nine-year-old can do it): Settings &gt; the sum &gt; <strong>Create passcode</strong> &gt; a four-digit code &gt; confirm. If you forget it, Google&rsquo;s only reset is to uninstall and reinstall the app.</li>'
   '<li><strong>Timer:</strong> Settings &gt; passcode &gt; <strong>Set timer</strong> &gt; slide to a time &gt; <strong>START TIMER</strong>. To stop it early: Settings &gt; passcode &gt; <strong>EXIT TIMER</strong>. It&rsquo;s a session timer, not a daily allowance &mdash; it starts when you start it.</li>'
   '<li><strong>Block a video or a whole channel:</strong> tap <strong>More</strong> at the top of the video &gt; <strong>BLOCK</strong> &gt; &ldquo;Block this video&rdquo; or &ldquo;Block entire channel&rdquo; &gt; BLOCK &gt; enter the numbers or your passcode. To undo everything: Settings &gt; passcode &gt; your child&rsquo;s profile &gt; parent password &gt; UNBLOCK VIDEOS.</li>'
   '<li><strong>Turn search off:</strong> a parent setting; with it off &ldquo;your child can&rsquo;t search for videos&rdquo; and the profile&rsquo;s watch and search history is cleared. The &ldquo;Approve content only&rdquo; mode turns search off too.</li>'
   '<li>Also in the parent settings: turn off autoplay, clear or pause watch and search history, and a &ldquo;parent code&rdquo; for the TV app.</li>'
   '</ol>'
  )},
  {'eyebrow': '/03 &mdash; SUPERVISED ACCOUNT, STEP BY STEP', 'h2': 'Under-13 on the main YouTube app: the content level', 'html': (
   '<ol>'
   '<li><strong>Family Link app</strong> &gt; select your child at the top left &gt; <strong>Add child</strong> &gt; follow the steps and give consent by signing in as yourself. (On a new Android device, choose Create account at sign-in, enter the child&rsquo;s details, then sign in as parent to consent.)</li>'
   '<li>Choose <strong>YouTube Kids</strong> or the <strong>supervised experience</strong> when asked.</li>'
   '<li>Content level: Family Link &gt; child &gt; <strong>Controls</strong> &gt; <strong>YouTube</strong> &gt; <strong>Edit</strong> under YouTube settings (newer builds: Controls &gt; Content restrictions &gt; YouTube). Pick Explore / Explore more / Most of YouTube.</li>'
   '<li>Or from YouTube itself, signed in as the parent: <strong>You</strong> &gt; Settings &gt; <strong>Family Centre</strong> &gt; child &gt; Edit next to Content settings.</li>'
   '<li>Other supervised-account controls Google lists: block specific channels, clear or pause watch and search history, turn off autoplay; and under Family Centre&rsquo;s <strong>Time management</strong> tab, take-a-break and bedtime reminders and a daily Shorts limit.</li>'
   '</ol>'
   '<p><strong>The trap:</strong> at 13, Google emails you and your child (&ldquo;Ready to update your Google Account?&rdquo;). Nothing changes until the child chooses to update &mdash; and by Google&rsquo;s rule, a supervised child needs your approval to stop supervision until 18. But once they do update, YouTube&rsquo;s protections change to the teen ones. Know that day is coming and have the conversation before it.</p>'
  )},
  {'eyebrow': '/04 &mdash; TEENS', 'h2': 'Supervised teen accounts and the new age checks', 'html': (
   '<p>For 13&ndash;17s YouTube&rsquo;s answer is a <strong>supervised teen account</strong>: agreed by both sides (You &gt; Settings &gt; Family Centre &gt; Invite a teen), reversible by either, and giving you visibility rather than a lock. Separately, since 2025 YouTube runs an <strong>age-estimation model</strong> in the UK: if it thinks a user is under 18 it blocks age-restricted videos, turns break and bedtime reminders on by default, shows only non-personalised ads and makes autoplay opt-in. An adult wrongly caught by it can prove age with government ID, a credit card or a selfie through their Google Account &mdash; do that on Google&rsquo;s own pages, never from a link someone sends.</p>'
   + _sources([
     ('Google: create a Google Account for your child', 'https://support.google.com/families/answer/7103338?hl=en-GB'),
     ('Google: YouTube &amp; YouTube Kids options for your child', 'https://support.google.com/families/answer/10495678?hl=en-GB'),
     ('YouTube: content settings for supervised accounts', 'https://support.google.com/youtube/answer/10315823?hl=en-GB'),
     ('YouTube Kids: parental controls &amp; settings', 'https://support.google.com/youtubekids/answer/6172308?hl=en-GB'),
     ('YouTube Kids: set a custom passcode', 'https://support.google.com/youtubekids/answer/6292172?hl=en-GB'),
     ('YouTube Kids: block &amp; share content', 'https://support.google.com/youtubekids/answer/7178746?hl=en-GB'),
     ('YouTube Kids: the timer', 'https://support.google.com/youtubekids/answer/6130558?hl=en-GB'),
     ('YouTube: supervised teen account', 'https://support.google.com/youtube/answer/15253498?hl=en-GB'),
     ('YouTube: age estimation', 'https://support.google.com/youtube/answer/16422785?hl=en-GB'),
     ('Google: what happens when your child turns 13', 'https://support.google.com/families/answer/7106787?hl=en-GB'),
   ])
   + _HELP_LADDER
  )},
 ],
 'faqs': [
  {'q': 'YouTube Kids or a supervised account &mdash; which is safer?', 'a': 'Kids is more restrictive: a walled app with age bands, a passcode, a timer and search-off. A supervised account is the real YouTube with a content ceiling you choose (Explore, Explore more, Most of YouTube) &mdash; more content, more risk of something slipping through, but far less rebellion from a ten-year-old who feels &ldquo;too old for the baby app&rdquo;. Most families move from Kids to supervised around 8&ndash;10.'},
  {'q': 'What&rsquo;s the default content level for a supervised account?', 'a': 'There isn&rsquo;t one &mdash; Google&rsquo;s own page says it sets no default, so you choose. If you skipped that screen, check it now: Family Link &gt; child &gt; Controls &gt; YouTube.'},
  {'q': 'Is the YouTube Kids maths sum a real lock?', 'a': 'No. It stops a five-year-old; it does not stop a nine-year-old. Set a custom four-digit passcode (Settings &gt; the sum &gt; Create passcode) &mdash; and write it down somewhere your child can&rsquo;t find, because Google&rsquo;s only reset is to reinstall the app.'},
  {'q': 'Can I see what my teenager watches?', 'a': 'With a supervised teen account you see the channels they own and upload to, their live-stream activity, comments and subscriptions &mdash; not a minute-by-minute watch history. It has to be agreed by both of you and either can switch it off, which is by design: it&rsquo;s visibility with consent, not surveillance.'},
  {'q': 'My own YouTube keeps asking me to prove I&rsquo;m over 18. Is that a scam?', 'a': 'Probably not &mdash; since 2025 YouTube estimates ages in the UK under the Online Safety Act, and adults it misjudges get asked to verify with ID, a card or a selfie. Do it only inside YouTube or your Google Account, never from a link in an email or message. If in doubt, ring us before you upload anything.'},
 ],
 'crossLinksHtml': '<p>Part of our <a href="/parents-guide-online-safety/">parents&rsquo; guide to parental controls</a>. Set the phone-level controls first: <a href="/screen-time-and-family-link-parental-controls/">Screen Time &amp; Family Link</a>.</p>',
})

# =====================================================================================
# 2. XBOX
# =====================================================================================
PARENTS_PAGES.append({
 'slug': 'xbox-parental-controls-uk',
 'title': 'Xbox Parental Controls UK: Screen Time, Spending & Chat',
 'metaDesc': "Set up an Xbox for a child today: family group, screen time, PEGI age limits, ask-a-parent spending and who can message them. Checked against Microsoft's own help.",
 'ogTitle': 'Xbox parental controls, the steps as they are today',
 'crumbName': 'Xbox Parental Controls',
 'eyebrow': '// XBOX SERIES X|S &amp; XBOX ONE &middot; CHECKED ' + CHECKED_ON.upper(),
 'h1': 'Xbox parental controls &mdash; screen time, age limits, spending and <em class="grad grad--cyan">who can talk to them</em>',
 'lede': ('Xbox has one of the most complete family systems of any console &mdash; and one of the most confusing to find, because the same settings live in three places: the console, the <strong>Xbox Family Settings</strong> phone app, and <strong>family.microsoft.com</strong>. '
          'Here&rsquo;s the whole thing in the order that works, with the menu names as Microsoft prints them today, and the one step that <em>only</em> works on the console (giving consent for a child account).'),
 'chips': ['Checked ' + CHECKED_ON, 'Console, app &amp; web', 'Microsoft&rsquo;s own steps'],
 'primaryCta': ('Jump to the steps', '#step1'), 'secondaryCta': ('Call 01202 775566', 'tel:+441202775566'),
 'ctaHead': _CTA_HEAD, 'ctaSub': _CTA_SUB,
 'schemaKind': 'article',
 'howToName': 'Set up Xbox parental controls for a child',
 'howToSteps': [
  {'name': 'Put the child in your Microsoft family group', 'text': 'Sign in as the family organiser at family.microsoft.com > Add a family member > choose Member for a child > enter their email or phone > Next. Or in the Xbox Family Settings app: the green Accounts icon > Add child > Create new account (or Add existing account > Send invitation).'},
  {'name': 'Give parental consent on the console', 'text': 'A new child account has 14 days to get consent or it is deleted. When the child is prompted, choose This Xbox, sign in as the organiser, tick My child can sign into non-Microsoft apps, and I accept. This step is console or web only - it cannot be done in the Family Settings app.'},
  {'name': 'Set screen time', 'text': 'Family Settings app > child tile > Screen time > under Schedule set Days of the week, Time limit (30-minute steps, or block the day) and Time range. Extra time today: Screen time > Activity > Add time now.'},
  {'name': 'Set the age limit for games and apps', 'text': 'On the console: Xbox button > Profile & system > Settings > Account > Family settings > Manage family members > the child > under Access to content choose the age level. It defaults to the birthdate on the account; anything above the limit needs your approval.'},
  {'name': 'Make spending ask a parent', 'text': 'Console: Family settings > Manage family members > the child > Privacy & online safety > Xbox Live privacy > View details & customize > Buy & download > Ask a parent = On. Web: family.microsoft.com > child > Spending > Ask to buy / Require approval.'},
  {'name': 'Decide who can talk to them', 'text': 'Console: Family settings > Manage family members > the child > Privacy & online safety > Xbox privacy > choose the Child, Teen or Adult defaults, or View details & customise. The child must sign out and in again for changes to apply.'},
 ],
 'sections': [
  {'eyebrow': '/01 &mdash; THE THREE PLACES', 'h2': 'Console, app or website? What each one is for', 'html': (
   '<ul>'
   '<li><strong>The console</strong> holds the full privacy grid and is the <em>only</em> place (with the website) you can give parental consent for a new child account. Xbox button &gt; Profile &amp; system &gt; Settings &gt; Account &gt; <strong>Family settings</strong>.</li>'
   '<li><strong>The Xbox Family Settings app</strong> (iOS/Android) is the everyday tool: screen time, content filters, who they can talk to, multiplayer, spending, friend approvals and an activity report &mdash; from your phone.</li>'
   '<li><strong>family.microsoft.com</strong> (also account.microsoft.com/family) is where you add people to the family group, set screen time across Windows and Xbox, and manage spending and &ldquo;ask to buy&rdquo;.</li>'
   '</ul>'
   + _dorset_note('Fortnite and Roblox &mdash; which run on Xbox too, so their guide and this page work together')
  )},
  {'eyebrow': '/02 &mdash; STEP BY STEP', 'h2': 'Family group, consent, screen time, age limits, spending, chat', 'html': (
   '<ol>'
   '<li><strong>Family group.</strong> family.microsoft.com, signed in as the organiser &gt; <strong>Add a family member</strong> &gt; Member &gt; their email or phone &gt; Next. Or the Family Settings app: green Accounts icon (top right) &gt; <strong>Add child</strong> &gt; Create new account &gt; get a new email address, name, birthdate; the app makes a gamertag &gt; Finish setting up.</li>'
   '<li><strong>Consent (console only).</strong> The child gets a prompt; select <strong>This Xbox</strong>, sign in as the organiser, tick &ldquo;My child can sign into non-Microsoft apps&rdquo;, <strong>I accept</strong>. Microsoft&rsquo;s own warning: a new child account has <strong>14 days</strong> to receive consent before it is deleted.</li>'
   '<li><strong>Screen time.</strong> App: child tile &gt; <strong>Screen time</strong> &gt; Schedule &gt; days, <strong>Time limit</strong> (30-minute increments, or full day, or block), <strong>Time range</strong> (From/To or Anytime). Web: account.microsoft.com/family &gt; child &gt; &ldquo;Windows, Xbox or Mobile&rdquo; tab &gt; a day &gt; Turn limits on. Note Microsoft&rsquo;s own caveat: time counts for as long as they&rsquo;re <em>signed in</em>, not just playing.</li>'
   '<li><strong>Age limit.</strong> Console: Family settings &gt; Manage family members &gt; child &gt; <strong>Access to content</strong> &gt; choose the age level (defaults from the account&rsquo;s birthdate). App: Settings &gt; Content restrictions &gt; Apply age filters. Requests for something above the limit arrive as &ldquo;Ask now&rdquo; and you can allow always or just once. Set it to your child&rsquo;s actual age &mdash; PEGI 12 for a twelve-year-old &mdash; and let the requests do the negotiating.</li>'
   '<li><strong>Spending.</strong> Console: child &gt; Privacy &amp; online safety &gt; <strong>Xbox Live privacy</strong> &gt; View details &amp; customize &gt; <strong>Buy &amp; download</strong> &gt; Ask a parent = On (the Child and Teen defaults set this for you). Web: family.microsoft.com &gt; child &gt; <strong>Spending</strong> &gt; Ask to buy / Require approval; you can also Add Money to a controlled balance.</li>'
   '<li><strong>Who can talk to them.</strong> Console: child &gt; Privacy &amp; online safety &gt; <strong>Xbox privacy</strong> &gt; Child / Teen / Adult defaults, or View details &amp; customise. App: <strong>Social</strong> tile (communication, following), <strong>Multiplayer</strong> tile (a toggle; per-game requests arrive under Notifications), <strong>Cross-network play</strong>, <strong>Clubs</strong>. The child must sign out and back in for it to take effect.</li>'
   '</ol>'
  )},
  {'eyebrow': '/03 &mdash; UK 2025&ndash;26', 'h2': 'The UK age checks, and honesty about the app', 'html': (
   '<p>Since 28 July 2025, UK Xbox players with an <em>adult</em> account age have been asked to verify they&rsquo;re over 18 (Microsoft&rsquo;s options include government ID, age estimation, a mobile-provider check or a credit-card check), and Microsoft said that from early 2026 unverified adult accounts would have social features limited to friends only. That&rsquo;s the UK Online Safety Act at work &mdash; a properly set-up <em>child</em> account is already restricted by the family settings and isn&rsquo;t the target. Do any verification at Microsoft&rsquo;s own address (aka.ms/XboxUKAgeVerification), never from a link in a message.</p>'
   '<p>One honesty note: Microsoft moves these menus. Some third-party reports in 2026 said Xbox options were being dropped from the general Microsoft Family Safety app; Microsoft&rsquo;s own live pages still show the Xbox tab as we write this. If what you see differs from this page, the console path is the constant &mdash; and tell us so we can update it.</p>'
   + _sources([
     ('Xbox Family Settings app: overview', 'https://support.xbox.com/en-GB/help/family-online-safety/family-settings-app/family-settings-app-info'),
     ('Xbox: add someone to your family in the app', 'https://support.xbox.com/en-GB/help/family-online-safety/family-settings-app/add-someone-to-family-in-the-Xbox-Family-Setting-app'),
     ('Xbox: manage online safety and privacy settings', 'https://support.xbox.com/en-GB/help/family-online-safety/online-safety/manage-online-safety-and-privacy-settings-xbox-one'),
     ('Xbox: set an age limit for content', 'https://support.xbox.com/en-GB/help/family-online-safety/online-safety/set-age-limit'),
     ('Microsoft: add people to your family group', 'https://support.microsoft.com/en-gb/family-safety/add-people-to-your-family-group'),
     ('Microsoft: set screen time limits across devices', 'https://support.microsoft.com/en-gb/family-safety/set-screen-time-limits-across-devices'),
     ('Microsoft: require kids to ask before buying', 'https://support.microsoft.com/en-gb/account-billing/require-kids-to-ask-before-buying-from-the-microsoft-store-on-xbox-ffa7554b-8681-0080-9c78-47d02386ec79'),
     ('Xbox Wire: age verification in the UK (28 Jul 2025)', 'https://news.xbox.com/en-us/2025/07/28/xbox-age-verification-uk/'),
   ])
   + _HELP_LADDER
  )},
 ],
 'faqs': [
  {'q': 'Why can&rsquo;t I finish setting up my child&rsquo;s account in the Family Settings app?', 'a': 'Because parental consent can only be given on the console or the web, not in the app &mdash; that&rsquo;s Microsoft&rsquo;s design. When the child gets the prompt, pick This Xbox, sign in as the organiser and accept. And don&rsquo;t leave it: a new child account is deleted after 14 days without consent.'},
  {'q': 'My child says the screen-time limit ran out while they weren&rsquo;t even playing.', 'a': 'They may be right &mdash; Microsoft&rsquo;s own note is that screen time counts for as long as the child is signed in, whether they&rsquo;re playing or the console&rsquo;s just on. Get them into the habit of signing out, and use Add time now in the app for genuine cases.'},
  {'q': 'What should I set the age limit to?', 'a': 'Their actual age &mdash; PEGI 12 for a twelve-year-old. Anything above it then arrives as a request you can allow once or always, which is a far better conversation than a blanket yes or no. Note it defaults to whatever birthdate is on the account, so a fibbed birth year quietly turns the limit off.'},
  {'q': 'Does Minecraft use these Xbox settings too?', 'a': 'Yes &mdash; even on a phone or PC. Minecraft&rsquo;s multiplayer, chat and Realms are governed by the child&rsquo;s Xbox privacy settings. See our <a href="/minecraft-parental-controls/">Minecraft page</a>.'},
  {'q': 'My own account is being asked to prove I&rsquo;m over 18. Why?', 'a': 'The UK Online Safety Act: since July 2025 Xbox asks adult accounts in the UK to verify age, and unverified adults may find social features limited to friends only. It&rsquo;s legitimate &mdash; but do it only via Microsoft&rsquo;s own address (aka.ms/XboxUKAgeVerification), never from a link someone sends you.'},
 ],
 'crossLinksHtml': '<p>Part of our <a href="/parents-guide-online-safety/">parents&rsquo; guide to parental controls</a>. Also: <a href="/minecraft-parental-controls/">Minecraft</a> (it uses these Xbox settings), <a href="/playstation-parental-controls-uk/">PlayStation</a>, <a href="/nintendo-switch-parental-controls/">Nintendo Switch</a>.</p>',
})

# =====================================================================================
# 3. PLAYSTATION
# =====================================================================================
PARENTS_PAGES.append({
 'slug': 'playstation-parental-controls-uk',
 'title': 'PS5 & PS4 Parental Controls UK: Age, Spending, Play Time',
 'metaDesc': "Set up a PlayStation for a child today: child account, age level, monthly spend (default £0), play time, chat limits and locking the console. Checked against Sony's own help.",
 'ogTitle': 'PlayStation parental controls, the steps as they are today',
 'crumbName': 'PlayStation Parental Controls',
 'eyebrow': '// PS5 &amp; PS4 &middot; CHECKED ' + CHECKED_ON.upper(),
 'h1': 'PlayStation parental controls &mdash; child accounts, age level, spending and <em class="grad grad--cyan">play time</em>',
 'lede': ('Sony&rsquo;s system is tidy once you know the shape: one adult is the <strong>family manager</strong>, each child under 18 gets their own <strong>child account</strong> under them, and every control &mdash; age level for games, a monthly spending limit (default &pound;0), chat and sharing, play time, even web browsing &mdash; is set per child from the console, from playstation.com, or from the <strong>PlayStation Family app</strong>. '
          'And then you lock the console so the settings can&rsquo;t be quietly undone. Here&rsquo;s each step with the menu names Sony prints today.'),
 'chips': ['Checked ' + CHECKED_ON, 'PS5 &amp; PS4', 'Sony&rsquo;s own steps'],
 'primaryCta': ('Jump to the steps', '#step1'), 'secondaryCta': ('Call 01202 775566', 'tel:+441202775566'),
 'ctaHead': _CTA_HEAD, 'ctaSub': _CTA_SUB,
 'schemaKind': 'article',
 'howToName': 'Set up PlayStation parental controls for a child',
 'howToSteps': [
  {'name': 'Create the child account under your family', 'text': 'On the web: sign in to Account Management > Family Management > Set Up Now > Add a Child (first time) and follow the steps. On PS5: profile icon > Switch User > Add User > Get Started > Create an Account. On PS4: Settings > Parental Controls/Family Management > Family Management > Set Up Now > Create User.'},
  {'name': 'Open the child&rsquo;s parental controls', 'text': 'PS5: Settings > Family and Parental Controls > Family Management > the child. PS4: Settings > Parental Controls/Family Management > Family Management. Web: Account Management > Family Management > child > Edit.'},
  {'name': 'Set the restriction level or age level', 'text': 'PS5 presets: Late Teens or Older, Early Teens, Child - or set Age Level for Games individually (a child can start content rated the same as or lower than their age), Age Level for Blu-ray/DVD, and Web Browsing.'},
  {'name': 'Set spending and communication', 'text': 'Monthly Spending Limit (default £0, charged to the family manager) and Communication and User-Generated Content (Restrict turns off text and voice chat and content sharing).'},
  {'name': 'Set play time', 'text': 'PS5: Family Management > child > set a Time Zone > Playtime Settings: Restrict Playtime, When Playtime Ends (Notify Only or Log Out), Duration and Playable Hours > Save.'},
  {'name': 'Lock the console', 'text': 'PS5: Settings > Family and Parental Controls > PS5 Console Restrictions > Change Your Console Restriction Passcode (4 digits) and set User Creation and Guest Login to Not Allowed. PS4: PS4 System Restrictions > Change System Restriction Passcode; New User Creation and Guest Login > Not Allowed.'},
 ],
 'sections': [
  {'eyebrow': '/01 &mdash; THE SHAPE OF IT', 'h2': 'One family manager, one child account per child', 'html': (
   '<p>Sony&rsquo;s rule: <strong>each child under 18 needs a separate child account</strong>, and they all sit under one adult &mdash; the family manager. That adult&rsquo;s wallet is what any spending draws on, which is why the child&rsquo;s spending limit defaults to &pound;0. You manage everything from three equivalent places: the console (Settings &gt; <strong>Family and Parental Controls</strong> on PS5), <strong>playstation.com &gt; Account Management &gt; Family Management</strong>, or the <strong>PlayStation Family</strong> phone app (which also shows what they&rsquo;re playing right now and lets you approve extra-time requests).</p>'
   + _dorset_note('Fortnite and Roblox &mdash; both on PlayStation too')
  )},
  {'eyebrow': '/02 &mdash; STEP BY STEP', 'h2': 'Account, age level, spending, chat, play time', 'html': (
   '<ol>'
   '<li><strong>Child account.</strong> Web: Account Management &gt; <strong>Family Management</strong> &gt; Set Up Now &gt; <strong>Add a Child</strong>. PS5: profile icon &gt; Switch User &gt; Add User &gt; Get Started &gt; Create an Account. PS4: Settings &gt; Parental Controls/Family Management &gt; Family Management &gt; Set Up Now &gt; Create User. Or the PlayStation Family app &gt; Set Up Your Family.</li>'
   '<li><strong>Find the controls.</strong> PS5: Settings &gt; Family and Parental Controls &gt; Family Management &gt; the child. PS4: Settings &gt; Parental Controls/Family Management. Web: Family Management &gt; child &gt; Edit.</li>'
   '<li><strong>Restriction level.</strong> PS5 offers presets &mdash; <strong>Late Teens or Older</strong>, <strong>Early Teens</strong>, <strong>Child</strong> &mdash; or set each control yourself: <strong>Age Level for Games</strong> (they can start content rated at or below their age), Age Level for Blu-ray Disc and DVD, <strong>Use of PlayStation VR / VR2</strong> (Sony: &ldquo;not for use by children under 12&rdquo;), <strong>Web Browsing</strong>, and <strong>Age Filtering for Online Content</strong>.</li>'
   '<li><strong>Spending.</strong> <strong>Monthly Spending Limit</strong> &mdash; default &pound;0, and anything you allow comes out of the family manager&rsquo;s wallet. Under <strong>Allowed Games</strong> you&rsquo;ll see exception requests for games above the age level.</li>'
   '<li><strong>Chat and sharing.</strong> <strong>Communication and User-Generated Content</strong> &gt; Restrict turns off text and voice chat and content sharing in one go. That&rsquo;s the right default for a young child; for a teen you&rsquo;ll probably loosen it and rely on the friends list.</li>'
   '<li><strong>Play time.</strong> PS5: Family Management &gt; child &gt; set a <strong>Time Zone</strong> first, then <strong>Playtime Settings</strong>: Restrict Playtime (Restrict / Do Not Restrict), <strong>When Playtime Ends</strong> (Notify Only, or Log Out), <strong>Duration and Playable Hours</strong> &gt; Save. Extra-time requests come to you in the app, on the console or on the web.</li>'
   '<li><strong>Lock it.</strong> PS5: Settings &gt; Family and Parental Controls &gt; <strong>PS5 Console Restrictions</strong> &gt; Change Your Console Restriction Passcode (4 digits) and <strong>User Creation and Guest Login &gt; Not Allowed</strong> &mdash; otherwise a child simply makes a new, unrestricted user. Optionally a login passcode too: Settings &gt; Users and Accounts &gt; Login Settings &gt; Set a PS5 Login Passcode. PS4: <strong>PS4 System Restrictions</strong> &gt; Change System Restriction Passcode; New User Creation and Guest Login &gt; Not Allowed.</li>'
   '</ol>'
   '<p>Sony&rsquo;s UK pages describe the age-level rule but don&rsquo;t print a PEGI-by-PEGI table, so we won&rsquo;t invent one: the practical setting is <em>your child&rsquo;s actual age</em>, and the Allowed Games requests handle the rest.</p>'
   + _sources([
     ('PlayStation: set up a family on PSN', 'https://www.playstation.com/en-gb/support/account/playstation-family-account-set-up/'),
     ('PlayStation: PS5 parental controls and spending limits', 'https://www.playstation.com/en-gb/support/account/ps5-parental-controls-spending-limits/'),
     ('PlayStation: play time controls', 'https://www.playstation.com/en-gb/support/account/play-time-controls-playstation/'),
     ('PlayStation: stop parental controls being changed', 'https://www.playstation.com/en-gb/support/account/prevent-parental-control-change/'),
     ('PlayStation: the PlayStation Family app', 'https://www.playstation.com/en-gb/support/account/ps-family-app/'),
     ('PlayStation: safety guide for parents', 'https://www.playstation.com/en-gb/support/account/safety-parents-guide/'),
   ])
   + _HELP_LADDER
  )},
 ],
 'faqs': [
  {'q': 'My child made a new user on the PS5 and got round everything. How?', 'a': 'Because User Creation and Guest Login was left allowed. PS5: Settings &gt; Family and Parental Controls &gt; PS5 Console Restrictions &gt; set it to Not Allowed and change the console restriction passcode. That single step is what makes the rest stick.'},
  {'q': 'What is the default spending limit on a child account?', 'a': '&pound;0 &mdash; and anything you raise it to is charged to the family manager&rsquo;s wallet, not to a card of the child&rsquo;s. Set a small monthly figure if you want to allow pocket-money purchases without an argument every time.'},
  {'q': 'Play time keeps letting them finish the match. Is that a bug?', 'a': 'No &mdash; When Playtime Ends has two options: Notify Only (a warning, but play continues) or Log Out (it actually stops). Notify Only is the default many parents leave on without realising. Change it in Playtime Settings.'},
  {'q': 'Can I do all this from my phone?', 'a': 'Yes: the PlayStation Family app covers playtime schedules and extra-time requests, spending limits, age rating, communication and privacy, plus activity reports and what they&rsquo;re playing right now.'},
 ],
 'crossLinksHtml': '<p>Part of our <a href="/parents-guide-online-safety/">parents&rsquo; guide to parental controls</a>. Also: <a href="/xbox-parental-controls-uk/">Xbox</a>, <a href="/nintendo-switch-parental-controls/">Nintendo Switch</a>, and set the phone first: <a href="/screen-time-and-family-link-parental-controls/">Screen Time &amp; Family Link</a>.</p>',
})

# =====================================================================================
# 4. NINTENDO SWITCH
# =====================================================================================
PARENTS_PAGES.append({
 'slug': 'nintendo-switch-parental-controls',
 'title': 'Nintendo Switch & Switch 2 Parental Controls UK (2026)',
 'metaDesc': "Set up a Switch or Switch 2 for a child today: the Parental Controls app, play-time limit, bedtime, restriction level, PIN, eShop spending, GameChat rule. From Nintendo's own help.",
 'ogTitle': 'Nintendo Switch parental controls, the steps as they are today',
 'crumbName': 'Nintendo Switch Parental Controls',
 'eyebrow': '// SWITCH &amp; SWITCH 2 &middot; CHECKED ' + CHECKED_ON.upper(),
 'h1': 'Nintendo Switch &amp; Switch 2 parental controls &mdash; play time, bedtime, restriction level, <em class="grad grad--cyan">PIN</em>',
 'lede': ('Nintendo&rsquo;s controls are the simplest of the three consoles &mdash; and the one that catches parents out is that <strong>they&rsquo;re set for the console, not the user</strong>: whatever you set applies to whoever picks it up. '
          'There&rsquo;s a free phone app (<strong>Nintendo Switch Parental Controls</strong>) that does play-time limits and bedtime beautifully, a console-side PIN for the restriction level, and one thing that lives elsewhere entirely: spending, which is on the Nintendo Account, not the console. Switch 2 uses the same app and menus, plus a new rule about GameChat for under-16s.'),
 'chips': ['Checked ' + CHECKED_ON, 'Switch &amp; Switch 2', 'Nintendo&rsquo;s own steps'],
 'primaryCta': ('Jump to the steps', '#step1'), 'secondaryCta': ('Call 01202 775566', 'tel:+441202775566'),
 'ctaHead': _CTA_HEAD, 'ctaSub': _CTA_SUB,
 'schemaKind': 'article',
 'howToName': 'Set up Nintendo Switch parental controls',
 'howToSteps': [
  {'name': 'Link the console to the Parental Controls app', 'text': 'Install the free Nintendo Switch Parental Controls app (iOS/Android), sign in with your Nintendo Account, and follow the steps to link it to the console (a registration code appears on the console).'},
  {'name': 'Set play time and bedtime in the app', 'text': 'App > Parental Controls (lower right) > Play Time Limit (none up to 6 hours; Set Days Individually for different weekdays), Bedtime (between 16:00 and 23:45), Suspend Software at Set Time > tap the red Save button. Extend today by 5, 15 or 30 minutes, or turn it off for the day, from the app.'},
  {'name': 'Set the restriction level on the console', 'text': 'System Settings > Parental Controls > Parental Controls Settings > Restriction Level > Teen, Child, Young Child or Custom (Restricted Software by age rating, Free Communication With Others, VR Mode, Posting Screenshots/Videos on Social Networks) > choose a PIN of 4 to 8 digits.'},
  {'name': 'Restrict spending on the Nintendo Account', 'text': 'Sign in to your Nintendo Account as the parent > Family Group > the child > tick Spending Restrictions and/or Age-Based Purchase Restrictions > Save changes. This is not in the console PIN controls.'},
  {'name': 'On a Switch 2, decide about GameChat', 'text': 'For a child under 16 to use GameChat, a parent must first allow it in the Nintendo Switch Parental Controls app.'},
 ],
 'sections': [
  {'eyebrow': '/01 &mdash; THE APP', 'h2': 'Play-time limit and bedtime, from your phone', 'html': (
   '<ol>'
   '<li>Install <strong>Nintendo Switch Parental Controls</strong> (free, iOS/Android), sign in with your Nintendo Account, and link it to the console when prompted.</li>'
   '<li>In the app tap <strong>Parental Controls</strong> (lower right).</li>'
   '<li><strong>Play Time Limit</strong>: from none up to <strong>6 hours</strong>, and <strong>Set Days Individually</strong> if weekends differ. When it&rsquo;s up you can extend by 5, 15 or 30 minutes, or turn it off for the day, from your phone &mdash; which is the whole reason this beats nagging.</li>'
   '<li><strong>Bedtime</strong>: any time between <strong>16:00 and 23:45</strong>. <strong>Suspend Software at Set Time</strong> decides whether the game actually stops or just warns.</li>'
   '<li>Tap the red <strong>Save</strong> button. The app also shows daily play time per game &mdash; the most useful conversation-starter on this page.</li>'
   '</ol>'
   + _dorset_note('Fortnite and Roblox &mdash; both on Switch too')
  )},
  {'eyebrow': '/02 &mdash; THE CONSOLE', 'h2': 'Restriction level and PIN', 'html': (
   '<ol>'
   '<li>On the console: <strong>System Settings</strong> &gt; <strong>Parental Controls</strong> &gt; <strong>Parental Controls Settings</strong> &gt; <strong>Restriction Level</strong>.</li>'
   '<li>Pick a preset or <strong>Custom</strong>. Nintendo&rsquo;s UK presets, as printed: <strong>Teen</strong> restricts games rated for 17+ and leaves posting and free communication on; <strong>Child</strong> restricts 13+ and turns posting and free communication off; <strong>Young Child</strong> restricts 8+ with the same. Custom lets you set <strong>Restricted Software</strong> (by age rating), <strong>Free Communication With Others</strong>, <strong>VR Mode (3D Visuals)</strong>, and <strong>Posting Screenshots/Videos on Social Networks</strong> individually.</li>'
   '<li>Choose a <strong>PIN of 4 to 8 digits</strong>. Remember: the settings are <em>per console</em>, so they apply to whoever picks it up &mdash; including you.</li>'
   '</ol>'
   '<p>Nintendo UK prints its presets as &ldquo;17+/13+/8+&rdquo; rather than PEGI numbers; on your console the age list will show the UK ratings.</p>'
  )},
  {'eyebrow': '/03 &mdash; SPENDING, AND SWITCH 2', 'h2': 'eShop spending lives on the account, and the GameChat rule', 'html': (
   '<p><strong>Spending is not in the console PIN menu.</strong> It&rsquo;s on the Nintendo Account: sign in as the parent &gt; <strong>Family Group</strong> &gt; the child &gt; tick <strong>Spending Restrictions</strong> and/or <strong>Age-Based Purchase Restrictions</strong> &gt; Save changes. Parents create Nintendo Accounts for children aged 15 and under; a 16+ can have their own account added to the family group as supervised.</p>'
   '<p><strong>Switch 2</strong> uses the same Parental Controls app and the same console menus &mdash; Nintendo says the app links with both consoles. What&rsquo;s new is <strong>GameChat</strong>, and Nintendo&rsquo;s rule is plain: for a child <strong>under 16</strong> to use it, a parent must first allow it in the Parental Controls app. Decide that deliberately; voice and video chat with strangers is the single biggest change the Switch 2 brings into a child&rsquo;s bedroom.</p>'
   + _sources([
     ('Nintendo UK: set up parental controls on Switch 2', 'https://www.nintendo.com/en-gb/Support/Parental-Controls/How-to-Set-Up-Adjust-or-Remove-Parental-Controls-on-Nintendo-Switch-2-2843839.html'),
     ('Nintendo UK: set up parental controls on Switch', 'https://www.nintendo.com/en-gb/Support/Parental-Controls/How-to-Set-Up-Adjust-or-Remove-Parental-Controls-on-Nintendo-Switch-1494771.html'),
     ('Nintendo UK: parental controls overview &amp; FAQ', 'https://www.nintendo.com/en-gb/Support/Parental-Controls/Parental-Controls-for-Nintendo-Switch-2-and-Nintendo-Switch-Overview-FAQ-1494768.html'),
     ('Nintendo UK: the Parental Controls app', 'https://www.nintendo.com/en-gb/Hardware/Nintendo-Switch-Parental-Controls/Nintendo-Switch-2-Nintendo-Switch-Parental-Controls-2873385.html'),
     ('Nintendo UK: eShop restrictions', 'https://www.nintendo.com/en-gb/Support/Troubleshooting/How-to-Set-Nintendo-eShop-Restrictions-1406403.html'),
   ])
   + _HELP_LADDER
  )},
 ],
 'faqs': [
  {'q': 'The play-time limit stops me too. Can I set it per child?', 'a': 'No &mdash; Nintendo&rsquo;s controls are per console, not per user, so they apply to whoever picks it up. Most parents live with it, or turn the limit off for the day from the app when it&rsquo;s their turn.'},
  {'q': 'Where do I stop eShop spending?', 'a': 'Not in the console PIN menu &mdash; on the Nintendo Account website: Family Group &gt; the child &gt; Spending Restrictions and/or Age-Based Purchase Restrictions.'},
  {'q': 'What&rsquo;s different on the Switch 2?', 'a': 'Same app, same menus. The new thing is GameChat (voice and video chat): for a child under 16 to use it a parent has to allow it in the Parental Controls app first. Decide that on purpose.'},
  {'q': 'What if my child works out the PIN?', 'a': 'Change it (4 to 8 digits &mdash; use eight, not four), and note the app tells you when settings are changed on the console. Nintendo also lets you reset a forgotten PIN through the app or their support pages.'},
 ],
 'crossLinksHtml': '<p>Part of our <a href="/parents-guide-online-safety/">parents&rsquo; guide to parental controls</a>. Also: <a href="/xbox-parental-controls-uk/">Xbox</a>, <a href="/playstation-parental-controls-uk/">PlayStation</a>, <a href="/minecraft-parental-controls/">Minecraft</a>.</p>',
})

# =====================================================================================
# 5. MINECRAFT
# =====================================================================================
PARENTS_PAGES.append({
 'slug': 'minecraft-parental-controls',
 'title': 'Minecraft Parental Controls: Chat, Multiplayer & Spending',
 'metaDesc': "Minecraft's parental controls are really Xbox-account settings, even on a phone or PC. Manage multiplayer, chat, Realms and spending for a child today. Checked against Mojang.",
 'ogTitle': 'Minecraft parental controls, the steps as they are today',
 'crumbName': 'Minecraft Parental Controls',
 'eyebrow': '// MINECRAFT (BEDROCK &amp; JAVA) &middot; CHECKED ' + CHECKED_ON.upper(),
 'h1': 'Minecraft parental controls &mdash; why it&rsquo;s an Xbox setting, and how to manage <em class="grad grad--cyan">chat and multiplayer</em>',
 'lede': ('The thing that confuses every parent: <strong>Minecraft&rsquo;s parental controls aren&rsquo;t in Minecraft.</strong> Mojang&rsquo;s own words: &ldquo;Minecraft uses Microsoft and Xbox family safety features to manage parental controls even if you do not play Minecraft on an Xbox.&rdquo; '
          'So a child playing on an iPad, a phone or a PC is governed by the <em>Xbox privacy settings</em> on their Microsoft child account &mdash; multiplayer, chat, Realms, and Marketplace spending all live there. Here&rsquo;s where, plus the in-game chat settings that do exist.'),
 'chips': ['Checked ' + CHECKED_ON, 'Bedrock &amp; Java', 'Mojang &amp; Microsoft&rsquo;s own steps'],
 'primaryCta': ('Jump to the steps', '#step1'), 'secondaryCta': ('Call 01202 775566', 'tel:+441202775566'),
 'ctaHead': _CTA_HEAD, 'ctaSub': _CTA_SUB,
 'schemaKind': 'article',
 'howToName': 'Set up Minecraft parental controls for a child',
 'howToSteps': [
  {'name': 'Put the child in a Microsoft family group', 'text': 'family.microsoft.com > Create a family group > Add a family member (a new child account or an existing email), or the Xbox Family Settings app > Add Child. Only parent accounts can change the settings.'},
  {'name': 'Set multiplayer, friends and cross-play', 'text': 'On xbox.com, Privacy & online safety for the child > the Xbox and Windows 10 devices Online Safety tab: You can join multiplayer games (covers multiplayer, Realms and servers), You can join cross-network play, You can add friends and follow others. Sign the child out of Minecraft first, then Submit.'},
  {'name': 'Set who can talk to them', 'text': 'Same place, the Privacy tab: You can communicate outside of Xbox with voice & text - Everyone, Friends or Block. Choosing Friends limits incoming chat to the friends list.'},
  {'name': 'On an Xbox console, allow clubs for Realms', 'text': 'Privacy & online safety > Xbox privacy > View details & customise > Friends & clubs > You can create or join clubs = Allow (Realms need it); Communication & multiplayer > join multiplayer games and cross-network play = Allow.'},
  {'name': 'Manage Marketplace spending', 'text': 'family.microsoft.com > the child > Spending (Add Money; Ask to buy / Require approval), or the Xbox Family Settings app > child > Spending. Then sign out of Minecraft and restart it.'},
  {'name': 'In-game chat settings', 'text': 'Java: Options > Chat Settings > Chat mode: Shown, Commands Only or Hidden. Bedrock: the Filter Profanity toggle under Settings > General is on by default and cannot be turned off on a child account.'},
 ],
 'sections': [
  {'eyebrow': '/01 &mdash; THE ONE THING TO UNDERSTAND', 'h2': 'It&rsquo;s the Xbox account, whatever they play on', 'html': (
   '<p>Every modern Minecraft (Bedrock on phones, tablets, consoles and Windows; Java on PC) signs in with a Microsoft account, and a <em>child</em> Microsoft account carries Xbox privacy settings whether or not there&rsquo;s an Xbox in the house. Those settings decide whether your child can join multiplayer, join a Realm or server, add friends, and who can talk to them by voice or text. Mojang: only parent accounts can modify them, and they don&rsquo;t provide parental controls for Minecraft versions older than 1.16.4 or for modded versions.</p>'
   '<p>So the setup is: <strong>family group first</strong> (family.microsoft.com &gt; Create a family group &gt; Add a family member, or the Xbox Family Settings app &gt; Add Child), <strong>then the Xbox privacy settings</strong>, then spending. If you&rsquo;ve already done our <a href="/xbox-parental-controls-uk/">Xbox page</a>, most of this is done.</p>'
   + _dorset_note('Fortnite and Roblox &mdash; the other two big building/battle games')
  )},
  {'eyebrow': '/02 &mdash; STEP BY STEP', 'h2': 'Multiplayer, chat, Realms, spending', 'html': (
   '<ol>'
   '<li><strong>Multiplayer and friends</strong> (Bedrock, on the web): xbox.com &gt; Privacy &amp; online safety &gt; the child &gt; <strong>Xbox and Windows 10 devices Online Safety</strong> tab &gt; &ldquo;You can join multiplayer games&rdquo; (this one covers multiplayer, Realms <em>and</em> servers), &ldquo;You can join cross-network play&rdquo;, &ldquo;You can add friends and follow others&rdquo;. Sign the child out of Minecraft and close it first, then <strong>Submit</strong>. Java adds &ldquo;Others can send you friend requests&rdquo;.</li>'
   '<li><strong>Who can talk to them:</strong> the <strong>Privacy</strong> tab &gt; &ldquo;You can communicate outside of Xbox with voice &amp; text&rdquo; &gt; Everyone / Friends / Block. Mojang&rsquo;s note: choosing <strong>Friends</strong> limits incoming chat to players on the friends list &mdash; for most children that&rsquo;s the right setting.</li>'
   '<li><strong>On an Xbox console:</strong> Privacy &amp; online safety &gt; Xbox privacy &gt; View details &amp; customise &gt; <strong>Friends &amp; clubs</strong> &gt; &ldquo;You can create or join clubs&rdquo; = Allow (Realms need it); <strong>Communication &amp; multiplayer</strong> &gt; join multiplayer games and cross-network play = Allow. In the Family Settings app: Settings &gt; <strong>Manage Minecraft</strong> under Content restrictions &gt; Allow game play, Multiplayer, Clubs.</li>'
   '<li><strong>Marketplace spending:</strong> family.microsoft.com &gt; child &gt; <strong>Spending</strong> (Add Money to a controlled balance; Ask to buy / Require approval), or the app &gt; child &gt; Spending. Then sign out of Minecraft and restart it.</li>'
   '<li><strong>In the game itself:</strong> Java: <strong>Options &gt; Chat Settings &gt; Chat mode</strong>: Shown, Commands Only, or Hidden. Java 1.19.1+ also has Player Reporting in the pause menu, which can hide another player&rsquo;s messages. Bedrock: <strong>Filter Profanity</strong> (Settings &gt; General) is on by default and can&rsquo;t be turned off on a child account.</li>'
   '</ol>'
   '<p>An honesty note: you&rsquo;ll see &ldquo;trusted-only chat&rdquo; mentioned on forums. Mojang doesn&rsquo;t document a setting by that name, so we don&rsquo;t print it as a menu &mdash; the real levers are the Xbox <em>Friends</em> communication setting above and Java&rsquo;s Chat mode.</p>'
   + _sources([
     ('Mojang: set up Microsoft family groups for parental controls', 'https://help.minecraft.net/hc/en-us/articles/4408968616077-Set-Up-Microsoft-Family-Groups-for-Parental-Controls-in-Minecraft'),
     ('Mojang: managing multiplayer access for a child account', 'https://help.minecraft.net/hc/en-us/articles/24302916594701-Managing-Multiplayer-Game-Access-for-a-Child-Account-in-Minecraft'),
     ('Mojang: managing child social settings using Xbox settings online', 'https://help.minecraft.net/hc/en-us/articles/6985971367309'),
     ('Mojang: managing spending for child accounts in Marketplace', 'https://help.minecraft.net/hc/en-us/articles/24302243825677'),
     ('Mojang: chat settings for Java Edition', 'https://help.minecraft.net/hc/en-us/articles/43045760611469'),
     ('Mojang: Minecraft social features and child safety', 'https://help.minecraft.net/hc/en-us/articles/360058605852'),
     ('Xbox: safety settings to access Minecraft features', 'https://support.xbox.com/en-GB/help/family-online-safety/online-safety/manage-a-members-safety-settings-to-access-minecraft-features'),
   ])
   + _HELP_LADDER
  )},
 ],
 'faqs': [
  {'q': 'My child plays on an iPad. Why are you talking about Xbox?', 'a': 'Because Minecraft signs in with a Microsoft account, and a child Microsoft account carries Xbox privacy settings whether or not you own an Xbox. Multiplayer, chat, Realms and friends are all controlled there. It&rsquo;s Mojang&rsquo;s design, not ours.'},
  {'q': 'My child says they can&rsquo;t join their friend&rsquo;s Realm.', 'a': 'Two settings gate it: &ldquo;You can join multiplayer games&rdquo; must be allowed, and on console &ldquo;You can create or join clubs&rdquo; must be Allow (Realms use clubs under the hood). Change them at xbox.com or on the console, then sign the child out of Minecraft and back in.'},
  {'q': 'How do I stop strangers talking to my child in Minecraft?', 'a': 'Set &ldquo;You can communicate outside of Xbox with voice &amp; text&rdquo; to Friends (or Block) in the child&rsquo;s Xbox privacy settings. Mojang confirms Friends limits incoming chat to the friends list. On Java you can also set Chat mode to Commands Only or Hidden.'},
  {'q': 'How do I stop Marketplace spending?', 'a': 'family.microsoft.com &gt; the child &gt; Spending &gt; turn on Ask to buy / Require approval, and only add money to their balance deliberately. Then restart Minecraft.'},
 ],
 'crossLinksHtml': '<p>Part of our <a href="/parents-guide-online-safety/">parents&rsquo; guide to parental controls</a>. Do the <a href="/xbox-parental-controls-uk/">Xbox settings</a> first &mdash; they are these settings.</p>',
})

# =====================================================================================
# 6. DEVICE-LEVEL: APPLE SCREEN TIME + GOOGLE FAMILY LINK
# =====================================================================================
PARENTS_PAGES.append({
 'slug': 'screen-time-and-family-link-parental-controls',
 'title': 'Screen Time & Family Link: Phone-Level Parental Controls UK',
 'metaDesc': "The controls under every app: Apple Screen Time and Google Family Link. Downtime, app limits, web filtering, purchases, who can message. Set these first. Checked against Apple and Google.",
 'ogTitle': 'Screen Time &amp; Family Link: the phone-level controls to set first',
 'crumbName': 'Screen Time &amp; Family Link',
 'eyebrow': '// IPHONE, IPAD &amp; ANDROID &middot; CHECKED ' + CHECKED_ON.upper(),
 'h1': 'Screen Time and Family Link &mdash; the controls under <em class="grad grad--cyan">every app</em>, so set them first',
 'lede': ('If you do one thing from this whole guide, do this one. Apple&rsquo;s <strong>Screen Time</strong> and Google&rsquo;s <strong>Family Link</strong> sit underneath every app on the phone or tablet: downtime and bedtime, per-app limits, web filtering, purchase approval, who can message during the day and at night, and (on Apple) age ratings for everything installed. '
          'Ten minutes here does more than an hour inside individual apps &mdash; and both now default to safer settings for under-18s. Steps below are as Apple and Google print them today (Apple&rsquo;s pages reference iOS 26; Google&rsquo;s the current Family Link).'),
 'chips': ['Checked ' + CHECKED_ON, 'iOS 26 &amp; current Family Link', 'UK ages &amp; law'],
 'primaryCta': ('Jump to the steps', '#step1'), 'secondaryCta': ('Call 01202 775566', 'tel:+441202775566'),
 'ctaHead': _CTA_HEAD, 'ctaSub': _CTA_SUB,
 'schemaKind': 'article',
 'howToName': 'Set up device-level parental controls on a child&rsquo;s phone or tablet',
 'howToSteps': [
  {'name': 'iPhone/iPad: put the child in Family Sharing, then open Screen Time', 'text': 'In the UK an under-13 needs a parent to create their Apple Account inside a Family Sharing group. Then on your own device: Settings > Family > the child > Screen Time > Continue and follow the prompts (Web Content, app ratings, media ratings); or Settings > Screen Time > under Family tap the child.'},
  {'name': 'iPhone/iPad: Downtime and App Limits', 'text': 'Screen Time > the child > App & Website Activity on > Downtime > Scheduled (Every Day or Customize Days) with a start and end; Block at Downtime decides blocked vs dimmed. App Limits > Add Limit > pick apps or categories > Next > set the time.'},
  {'name': 'iPhone/iPad: Communication Limits and Content & Privacy', 'text': 'Communication Limits > During Screen Time (Contacts Only / Contacts & Groups with at Least One Contact / Everyone) and During Downtime (Specific Contacts). Content & Privacy Restrictions > iTunes & App Store Purchases (Don&rsquo;t Allow), Allowed Apps & Features, App Store, Media, Web & Games (ratings; Web Content: Unrestricted / Limit Adult Websites / Only Approved Websites).'},
  {'name': 'iPhone/iPad: lock it with a Screen Time passcode', 'text': 'Screen Time > the child > Manage Screen Time > Lock Screen Time Settings > a four-digit code. Turn on Ask to Buy under Settings > Family > the child.'},
  {'name': 'Android: supervise the child in Family Link', 'text': 'Family Link app > Add child > follow the steps, signing in as the parent to give consent. Then Family Link > the child > Controls.'},
  {'name': 'Android: app approvals, ratings, screen time, downtime', 'text': 'Controls > Google Play > Purchases & download approvals > Require approval for: All content / Paid content only / In-app purchases only / Never; and the highest content rating for Apps & games, Movies and TV. Screen time > Time limits > Daily limit > set per day. Screen time > Schedules > turn on Downtime and/or School time (calls and texts stay available).'},
 ],
 'sections': [
  {'eyebrow': '/01 &mdash; WHY FIRST', 'h2': 'One place, every app', 'html': (
   '<p>An app&rsquo;s own controls only ever govern that app. The phone&rsquo;s controls govern the phone: they can put the whole device to bed at nine, cap TikTok at 45 minutes, stop a &pound;40 in-app purchase, filter the web browser, and decide who can text during school. Both Apple and Google have also moved to <strong>safer defaults for under-18s</strong> &mdash; Apple turns on Communication Safety and Web Content limits by default on a child&rsquo;s device, and Google&rsquo;s supervision now needs parental approval to switch off until 18. So this page is the foundation everything else on the guide sits on.</p>'
   + _dorset_note('the individual social apps')
  )},
  {'eyebrow': '/02 &mdash; IPHONE &amp; IPAD: SCREEN TIME', 'h2': 'Family Sharing, Downtime, App Limits, Communication Limits, Content &amp; Privacy, passcode', 'html': (
   '<ol>'
   '<li><strong>The account.</strong> Apple&rsquo;s UK rule: a child under 13 can&rsquo;t create an Apple Account without a parent, and must be in a <strong>Family Sharing</strong> group. Teens 13&ndash;17 can have their own account and you can still set Screen Time on their device. Setup path: Settings &gt; <strong>Family</strong> &gt; the child &gt; <strong>Screen Time</strong> &gt; Continue &gt; follow the prompts for Web Content, Apps (a rating like 4+, 9+&hellip; or Don&rsquo;t Allow) and media ratings. Turn on <strong>Ask To Buy</strong> from the same Family screen.</li>'
   '<li><strong>Downtime.</strong> Settings &gt; Screen Time &gt; the child &gt; turn on <strong>App &amp; Website Activity</strong> &gt; <strong>Downtime</strong> &gt; Turn On Downtime Until Tomorrow, or <strong>Scheduled</strong> &gt; Every Day or Customize Days &gt; start and end. <strong>Block at Downtime</strong> decides whether apps are actually blocked or just dimmed &mdash; turn it on for a young child.</li>'
   '<li><strong>App Limits.</strong> Screen Time &gt; <strong>App Limits</strong> &gt; Add Limit &gt; choose categories or apps &gt; Next &gt; set the time (Customize Days if weekends differ). <strong>Always Allowed</strong> is where you keep Phone, Messages and the apps that must never be locked.</li>'
   '<li><strong>Communication Limits.</strong> Screen Time &gt; <strong>Communication Limits</strong> &gt; During Screen Time: <strong>Contacts Only</strong> / Contacts &amp; Groups with at Least One Contact / Everyone; During Downtime: <strong>Specific Contacts</strong>. You can also manage the child&rsquo;s contacts from here.</li>'
   '<li><strong>Content &amp; Privacy Restrictions.</strong> Screen Time &gt; the child &gt; <strong>Content &amp; Privacy Restrictions</strong> &gt; enter your Screen Time passcode &gt; turn on. Then: <strong>iTunes &amp; App Store Purchases</strong> &gt; Don&rsquo;t Allow; <strong>Allowed Apps &amp; Features</strong>; <strong>App Store, Media, Web and Games</strong> &gt; ratings for apps, films, TV, music, and <strong>Web Content</strong> &gt; Unrestricted / <strong>Limit Adult Websites</strong> / Only Approved Websites; plus Game Center, <strong>Intelligence &amp; Siri</strong>, Privacy, and Allow Changes To (so passcode, account and cellular settings can&rsquo;t be altered).</li>'
   '<li><strong>Lock it.</strong> Screen Time &gt; the child &gt; <strong>Manage Screen Time</strong> &gt; <strong>Lock Screen Time Settings</strong> &gt; a four-digit passcode (change it under Change Screen Time Passcode). On iOS 18.5+ Apple can notify you when the passcode is used; on iOS 26 a child can <em>request an exception</em> to a limit rather than nagging.</li>'
   '</ol>'
  )},
  {'eyebrow': '/03 &mdash; ANDROID: FAMILY LINK', 'h2': 'Supervision, app approvals, ratings, screen time, downtime, location', 'html': (
   '<ol>'
   '<li><strong>Supervise.</strong> Family Link app &gt; <strong>Add child</strong> &gt; follow the steps and give consent by signing in as yourself. Google&rsquo;s rule: supervision is for children under 13 (&ldquo;or the applicable age in your country&rdquo;), and children need parent approval to stop it until 18.</li>'
   '<li><strong>App approvals.</strong> Family Link &gt; the child &gt; <strong>Controls</strong> &gt; <strong>Google Play</strong> &gt; under Purchases &amp; download approvals tap <strong>Require approval for</strong> &gt; All content / Paid content only / In-app purchases only / Never. (Apps you&rsquo;ve already approved, and Family Library apps, don&rsquo;t ask again.)</li>'
   '<li><strong>Content ratings.</strong> Same screen: choose the highest maturity level for <strong>Apps &amp; games, Movies, and TV</strong>, and whether Books can include explicit content. Google shows your region&rsquo;s rating scale.</li>'
   '<li><strong>Screen time.</strong> Family Link &gt; the child &gt; <strong>Screen time</strong> &gt; <strong>Time limits</strong> &gt; Daily limit on &gt; Weekly schedule &gt; a day &gt; the amount (Apply to all days of the week) &gt; Done. Note Google&rsquo;s wording: daily limits apply to <em>each</em> Android device or Chromebook the child uses.</li>'
   '<li><strong>Bedtime.</strong> Screen time &gt; <strong>Schedules</strong> &gt; turn on <strong>Downtime</strong> and/or <strong>School time</strong> (Google&rsquo;s current names for what used to be called Bedtime); calls and texts stay available.</li>'
   '<li><strong>Location.</strong> Family Link &gt; <strong>Location</strong> &gt; the child, once you&rsquo;ve turned on Location sharing for them. Talk about this one with an older child rather than switching it on silently.</li>'
   '<li><strong>At 13</strong> Google emails you both; the child can keep supervision by ignoring it, or choose &ldquo;Update your account&rdquo; &mdash; but still needs your approval to stop supervision until 18.</li>'
   '</ol>'
  )},
  {'eyebrow': '/04 &mdash; UK 2025&ndash;26', 'h2': 'The age checks you&rsquo;ll meet, and what&rsquo;s new', 'html': (
   '<p><strong>Apple, UK:</strong> adults now have to confirm they&rsquo;re 18 or older to use certain features &mdash; with a credit card, passport, driving licence, or a PASS card (CitizenCard, My ID Card, TOTUM ID, Young Scot). Until an adult confirms, Apple treats the account like a minor&rsquo;s: <strong>Web Content Filter and Communication Safety are on automatically</strong>. That&rsquo;s a good thing for a child&rsquo;s device and a mild nuisance on yours; do the confirmation only in Settings, never from a link. <strong>Google:</strong> Family Link&rsquo;s schedules are now called Downtime and School time; and YouTube&rsquo;s age estimation applies in the UK (see our <a href="/youtube-parental-controls/">YouTube page</a>).</p>'
   + _sources([
     ('Apple UK: use parental controls to manage your child&rsquo;s iPhone or iPad (Apr 2026)', 'https://support.apple.com/en-gb/105121'),
     ('Apple UK: use Screen Time to manage your child&rsquo;s iPhone or iPad (Jul 2026)', 'https://support.apple.com/en-gb/108806'),
     ('Apple: set schedules with Screen Time (iOS 26 guide)', 'https://support.apple.com/en-gb/guide/iphone/iphb0c7313c9/ios'),
     ('Apple: Screen Time passcode', 'https://support.apple.com/en-gb/guide/iphone/iph272b4c4bd/ios'),
     ('Apple: Communication Limits', 'https://support.apple.com/en-gb/guide/iphone/iph4df1c0dad/ios'),
     ('Apple: set up parental controls with Family Sharing', 'https://support.apple.com/en-gb/guide/iphone/iph00ba7d632/ios'),
     ('Apple UK: age requirements for managing an Apple Account (Apr 2026)', 'https://support.apple.com/en-gb/126788'),
     ('Google: create a Google Account for your child', 'https://support.google.com/families/answer/7103338?hl=en-GB'),
     ('Google: manage your child&rsquo;s screen time', 'https://support.google.com/families/answer/7103340?hl=en-GB'),
     ('Google: Downtime and School time schedules', 'https://support.google.com/families/answer/15938652?hl=en-GB'),
     ('Google: Google Play controls', 'https://support.google.com/families/answer/7103028?hl=en-GB'),
     ('Google: purchase approvals', 'https://support.google.com/families/answer/7039872?hl=en-GB'),
     ('Google: what happens when your child turns 13', 'https://support.google.com/families/answer/7106787?hl=en-GB'),
   ])
   + _HELP_LADDER
  )},
 ],
 'faqs': [
  {'q': 'Screen Time or the app&rsquo;s own controls &mdash; which first?', 'a': 'Screen Time (or Family Link). It governs every app at once &mdash; bedtime, limits, purchases, web filtering, who can message. Then do the two or three apps your child lives in. Doing it the other way round means redoing work.'},
  {'q': 'My child is 14 with their own iPhone. Can I still use Screen Time?', 'a': 'Yes. Teens 13&ndash;17 can have their own Apple Account, and you can set Screen Time on their device (Settings &gt; Screen Time, then a Screen Time passcode they don&rsquo;t know), or through Family Sharing if they&rsquo;re in your group. At that age agree the settings together &mdash; iOS 26 even lets them request an exception rather than argue.'},
  {'q': 'What&rsquo;s the difference between Downtime and App Limits?', 'a': 'Downtime is a schedule &mdash; the whole device goes quiet between two times (only Always Allowed apps and calls work). App Limits are per-app or per-category daily allowances. Most families want both: bedtime Downtime plus a limit on the two or three time-sinks.'},
  {'q': 'Family Link&rsquo;s bedtime option has vanished. Where did it go?', 'a': 'It&rsquo;s been renamed: Screen time &gt; Schedules &gt; Downtime (and a separate School time). Same job.'},
  {'q': 'My own iPhone is asking me to prove I&rsquo;m 18. Why?', 'a': 'The UK age rules: Apple asks adults to confirm they&rsquo;re over 18 for certain features, using a card, passport, driving licence or a PASS card, and treats unconfirmed accounts like a minor&rsquo;s (web filter and Communication Safety on). It&rsquo;s legitimate &mdash; do it only inside Settings, never from a link in a message.'},
 ],
 'crossLinksHtml': '<p>Part of our <a href="/parents-guide-online-safety/">parents&rsquo; guide to parental controls</a>. Next: <a href="/youtube-parental-controls/">YouTube</a>, then the console you own: <a href="/xbox-parental-controls-uk/">Xbox</a> &middot; <a href="/playstation-parental-controls-uk/">PlayStation</a> &middot; <a href="/nintendo-switch-parental-controls/">Switch</a>.</p>',
})
