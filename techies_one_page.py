"""/techies-one-mail/ - the Techies One Mail product page (10 Oct 2026). Owner: "make a product page for the techies one
mail ... SEO and AI and everything optimized ... research about alternative email clients ... replacing things like
Windows Mail and Outlook Express ... cheaper ... compared with Outlook and Outlook 365 ... next generation".

Everything on it comes from four research files written the same day (D:\\claude\\seo-research\\
techies-one-product-2026-10-10\\): microsoft.md (dates and UK prices, each with a primary source), competitors.md (what
the other programs cost and limit), serp.md (what people search, the page plan) and features.md (what the app REALLY
does, read from its code). Rules that come with them:
  - every claim about the app matches features.md: no "Is this a scam?" button, scam checks and rules run while a window
    is open, search is one folder at a time, no combined inbox, no POP, no .pst, Windows only, Gmail = app password;
  - Microsoft names are used only to say what it replaces or works with, never in a slogan, never with their logos, and
    the footnote says it is not made or endorsed by Microsoft (Microsoft's trademark guidance, CAP Code 3.41-3.43);
  - prices carry the date they were checked, and Microsoft 365 is compared only as "if you only pay for it for ad-free
    email" (CAP 3.33-3.39) - the owner keeps selling Microsoft 365, so the page never says "cancel it";
  - no star rating in the structured data (none collected from users; Google requires real user ratings).
The download, version and size come from downloads/t1/version.json through techies_one_boxes.release(), the same reader
the 9 fix-page boxes use, and the build stops if the installer is missing.
"""
import build_pages as bp
from techies_one_boxes import release

SLUG = "techies-one-mail"
NAME = "Techies One Mail"
VER_TAG = "v0131"               # in every picture name: pictures are cached for a year, so a new look needs new names
OG = f"/images/t1-og-{VER_TAG}.jpg"
CHECKED = "10 October 2026"     # the day the prices and dates below were checked

REL = release()
if not REL:
    raise SystemExit("techies_one_page: downloads/t1/version.json or its installer is missing - no product page without a download")
MB = f"{round(REL['size'] / 1_048_576)} MB"   # as Windows and Edge show it (17,801,880 bytes = 17 MB)


def shot(name, alt, eager=False):
    base = f"/images/t1-{name}-{VER_TAG}"
    lazy = "" if eager else ' loading="lazy"'
    return (f'<img src="{base}-720.webp" srcset="{base}-720.webp 720w, {base}-1440.webp 1440w" '
            f'sizes="(max-width:880px) 100vw, 720px" width="1440" height="900" alt="{alt}"{lazy} decoding="async">')


# The explainer film (made 10-11 Oct 2026: director/critic panels, the real app's demo mailbox, Lily's voice). A new cut
# gets a NEW file name (images are cached for a year). Owner, 11 Oct 2026: "put the film on the product page".
FILM = "/images/t1-mail-film-v2.mp4"
FILM_POSTER = "/images/t1-mail-film-poster-v2.jpg"
FILM_SECS = 78
FILM_UPLOADED = "2026-10-11"
FILM_SAYS = ("Techies One Mail: a free email program for Windows computers, from 365 Techies. If Windows Mail or Outlook "
             "Express stopped, your email is most likely still with your email company. In this made-up inbox, your "
             "daughter&rsquo;s email gets a green box: no warning signs. While you&rsquo;re reading, a fake tax refund email "
             "arrives. Techies One is open, so obvious scams go to Scams, and the sender is blocked. It tells you why, in plain "
             "English. The sender isn&rsquo;t the taxman. The link pretends to be a government website. It tries to rush you. "
             "It can get things wrong. You can put it back, or ask us. Type your email address, and it fills in the settings "
             "itself. Simple view gives you fewer, bigger buttons, and a green one that asks us to ring you back. We&rsquo;re "
             "a Bournemouth family firm. Download it free at 365techies.co.uk, or ring us if you&rsquo;d rather we set it up.")


CSS = """    <style>
      .t1p{--t1edge:rgba(125,170,220,.24);--t1fill:rgba(125,170,220,.06)}
      .t1p-shot{margin:0;border:1px solid var(--t1edge);border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 18px 50px rgba(0,0,0,.35)}
      .t1p-shot img{display:block;width:100%;height:auto}
      .t1p-cap{margin:.5rem 0 0;font-size:.82rem;color:var(--muted);text-align:center}
      .t1p-film{position:relative;border:1px solid var(--t1edge);border-radius:14px;overflow:hidden;background:#060c1c;box-shadow:0 18px 50px rgba(0,0,0,.35);aspect-ratio:16/9}
      .t1p-film video{display:block;width:100%;height:100%;object-fit:cover;background:#060c1c}
      .t1p-play{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;border:0;padding:0 0 7%;background:transparent;cursor:pointer}
      .t1p-play span{display:flex;align-items:center;gap:.6rem;background:rgba(6,12,28,.86);color:#fff;font-weight:700;font-size:1.05rem;padding:.85rem 1.4rem .85rem 1.1rem;border-radius:999px;border:1.5px solid rgba(255,255,255,.25);box-shadow:0 12px 32px rgba(0,0,0,.45);transition:transform .2s ease}
      .t1p-play:hover span,.t1p-play:focus-visible span{transform:scale(1.05)}
      .t1p-play svg{width:2.1rem;height:2.1rem;flex:none}
      .t1p-film.on .t1p-play{display:none}
      .t1p-play .short{display:none}
      @media (max-width:520px){.t1p-play .long{display:none}.t1p-play .short{display:inline}.t1p-play span{font-size:.95rem;padding:.6rem 1.1rem .6rem .8rem}.t1p-play svg{width:1.7rem;height:1.7rem}}
      .t1p-says{margin:.7rem 0 0;font-size:.9rem}
      .t1p-says summary{cursor:pointer;color:var(--muted)}
      .t1p-says p{margin:.5rem 0 0;line-height:1.6}
      .t1p-dl{max-width:880px;margin:0 auto;border:1px solid var(--t1edge);border-radius:16px;background:var(--t1fill);padding:clamp(1.1rem,3vw,1.8rem);display:flex;flex-direction:column;gap:.8rem}
      .t1p-dl h2,.t1p h2{margin:0}
      .t1p-dl p{margin:0}
      .t1p-btns{display:flex;flex-wrap:wrap;gap:.6rem}
      .t1p-btns .button{flex:1 1 15rem;text-align:center}
      .t1p-meta{font-size:.78rem;letter-spacing:.04em;color:var(--muted)}
      .t1p-steps{margin:0;padding:0;list-style:none;display:grid;gap:.45rem}
      .t1p-swipe{display:none;font-size:.8rem;color:var(--muted);margin:0 0 .4rem}
      @media (max-width:700px){.t1p-swipe{display:block}}
      .t1p-steps li{line-height:1.5}
      .t1p details{border:1px solid var(--t1edge);border-radius:10px;padding:.6rem .9rem}
      .t1p details summary{cursor:pointer;font-weight:600}
      .t1p details p{margin:.5rem 0 0}
      .t1p-wrap{max-width:1100px;margin:0 auto}
      .t1p-lede{max-width:46rem;color:var(--muted);font-size:1.05rem;line-height:1.6;margin:.4rem 0 1.4rem}
      .t1p-tbl{overflow-x:auto;border:1px solid var(--t1edge);border-radius:12px}
      .t1p-tbl table{width:100%;border-collapse:collapse;min-width:640px;font-size:.95rem}
      .t1p-tbl th,.t1p-tbl td{padding:.65rem .8rem;text-align:left;vertical-align:top;border-bottom:1px solid var(--t1edge);line-height:1.45}
      .t1p-tbl thead th{font-size:.78rem;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);background:var(--t1fill)}
      .t1p-tbl tbody tr:last-child td{border-bottom:0}
      .t1p-tbl .us td{background:rgba(0,206,27,.07)}
      .t1p-tbl th[scope=row]{font-weight:700}
      .t1p-src{font-size:.8rem;color:var(--muted);margin:.6rem 0 0}
      .t1p p a:not([class]),.t1p li a:not([class]),.t1p td a:not([class]){color:var(--cyan);text-decoration:underline;text-underline-offset:2px}
      .t1p p a:not([class]):hover,.t1p li a:not([class]):hover,.t1p td a:not([class]):hover{color:#fff}
      .t1p-feats{display:grid;gap:clamp(1.6rem,4vw,2.8rem)}
      .t1p-feat{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:clamp(1rem,3vw,2.2rem);align-items:center}
      .t1p-feat:nth-child(even) .t1p-feat__txt{order:2}
      .t1p-feat h3{margin:0 0 .4rem;font-size:clamp(1.2rem,2.4vw,1.5rem)}
      .t1p-feat p{margin:0 0 .5rem;line-height:1.6}
      .t1p-feat .t1p-prob{font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--cyan-soft,#6cc4f5);margin:0 0 .35rem}
      .t1p-more{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr));gap:.9rem;margin-top:1.6rem}
      .t1p-more div{border:1px solid var(--t1edge);border-radius:12px;padding:.9rem 1rem;background:var(--t1fill)}
      .t1p-more b{display:block;margin-bottom:.25rem}
      .t1p-more span{color:var(--muted);font-size:.95rem;line-height:1.5}
      .t1p-list{margin:0;padding-left:1.2rem;display:grid;gap:.4rem;max-width:52rem}
      .t1p-list li{line-height:1.55}
      .t1p-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));gap:1.2rem}
      .t1p-card{border:1px solid var(--t1edge);border-radius:14px;padding:1.1rem 1.2rem;background:var(--t1fill)}
      .t1p-card h3{margin:0 0 .5rem;font-size:1.15rem}
      .t1p-tm{font-size:.78rem;color:var(--muted);max-width:60rem;margin:1.6rem auto 0;text-align:center;line-height:1.5}
      @media (max-width:860px){.t1p-feat{grid-template-columns:1fr}.t1p-feat:nth-child(even) .t1p-feat__txt{order:0}}
    </style>
"""


def hero():
    return f"""{CSS}    <section class="page-hero dh dh-hero t1p" aria-label="Introduction">
      <div class="dh-hero__grid">
        <div>
          <nav class="breadcrumb" aria-label="Breadcrumb">{bp.bc_sub("Email Support", "/email-support/", NAME)}</nav>
          <p class="eyebrow mono">// FREE EMAIL PROGRAM FOR WINDOWS 10 &amp; 11 (64-BIT) &middot; SIGNED BY 365 TECHIES LTD</p>
          <h1><em class="grad grad--cyan">Techies One Mail</em>: the free, simple replacement for Windows Mail and Outlook Express</h1>
          <p class="lede"><strong>Techies One Mail</strong> is a free email, calendar and address book program for Windows 10 and 11 PCs, made by 365 Techies, the family-run IT firm in Bournemouth. It has the settings for BT, Sky, Plusnet, Gmail, Yahoo, AOL and Outlook.com built in, warns you about scam emails in plain English, and has a big-button view. The program is free, with no adverts.</p>
          <div class="page-hero__cta">
            <a href="#download" class="button primary button--lg">Download it free</a>
            <a href="tel:+441202775566" class="button secondary button--lg">Rather we set it up? 01202 775566</a>
          </div>
          <a class="dh-rating" href="/reviews/"><span><span aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span> <strong>Our firm is rated 4.9 on Google</strong></span><span>365 Techies &middot; family-run since 1995</span></a>
          <p class="page-hero__byline mono"><span class="page-hero__byline-by">By the </span><a href="/meet-the-team/">365 Techies team</a> &middot; Reviewed __LASTMOD_HUMAN__</p>
        </div>
        <figure id="video" style="margin:0">
          <div class="t1p-film" data-t1film>
            <video controls playsinline preload="none" poster="{FILM_POSTER}" width="1920" height="1080" aria-label="Techies One Mail in {FILM_SECS} seconds: what it does, with a spoken guide and captions"><source src="{FILM}" type="video/mp4"></video>
            <button class="t1p-play" type="button" aria-label="Play the {FILM_SECS}-second film about Techies One Mail"><span><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#00ce1b"/><path d="M19 15l15 9-15 9z" fill="#fff"/></svg><b class="long">Watch: what it does, in {FILM_SECS} seconds</b><b class="short">Watch the film ({FILM_SECS} s)</b></span></button>
          </div>
          <figcaption class="t1p-cap">The real program, with a spoken guide and captions. The people and emails are made-up samples, apart from us.</figcaption>
          <details class="t1p-says"><summary>What the film says</summary><p>{FILM_SAYS}</p></details>
        </figure>
        <script>(function(){{var f=document.querySelector("[data-t1film]");if(!f)return;var v=f.querySelector("video"),b=f.querySelector(".t1p-play");v.controls=false;b.addEventListener("click",function(){{f.classList.add("on");v.controls=true;v.play();}});v.addEventListener("play",function(){{f.classList.add("on");}});}})();</script>
      </div>
    </section>"""


PROOF = """    <section class="dh dh-sec dh-proof" aria-label="The deal, in four facts">
      <div class="dh-in">
        <ul class="dh-facts">
          <li class="hp-c-care"><b>&pound;0</b><span>for the program, with no adverts</span></li>
          <li class="hp-c-fix"><b>Signed</b><span>by 365 Techies Ltd, checked by Windows</span></li>
          <li class="hp-c-buy"><b>A person</b><span>to ring: 01202 775566, Mon to Fri 9 to 5; any paid work is priced first</span></li>
          <li class="hp-c-biz"><b>4.9<i aria-hidden="true">&#9733;</i></b><span>the firm behind it, on Google</span></li>
        </ul>
      </div>
    </section>"""

STEPS = [
    ("Download it", f"Press the Download button. The file is called TechiesOneMail-Setup-{REL['ver']}.exe and is signed by 365 Techies Ltd."),
    ("Open the file", "It installs for you in a few seconds and needs no administrator password. It only adds itself (a Start menu entry and, if you like, a desktop icon) and doesn&rsquo;t change anything else on the PC."),
    ("Type your email address", "Techies One recognises BT, Sky, Plusnet, Gmail, Yahoo, AOL and Outlook.com addresses and fills in all the technical settings itself."),
    ("Type your password, or sign in with Microsoft", "Before saving, it checks it can both receive and send. Your email appears straight away, because it is still with your provider."),
]


def download():
    steps = "".join(f"<li><strong>{i}. {n}.</strong> {t}</li>" for i, (n, t) in enumerate(STEPS, 1))
    return f"""    <section class="section t1p" id="download" aria-label="Download Techies One Mail">
      <div class="wrap">
        <div class="t1p-dl">
          <p class="eyebrow mono">// DOWNLOAD &middot; FREE &middot; WINDOWS 10 &amp; 11</p>
          <h2>Get Techies One Mail</h2>
          <p>The program is free for everyone, at home or at work, with as many email addresses as you like. No account to make with us, no trial, no adverts.</p>
          <div class="t1p-btns">
            <a class="button primary button--lg" href="{REL['path']}" download>Download Techies One Mail (Windows)</a>
            <a class="button secondary button--lg" href="tel:+441202775566">Rather we set it up? 01202 775566</a>
          </div>
          <p class="t1p-meta mono">FOR WINDOWS 10 AND 11 (64-BIT)<span class="t1v"> &middot; VERSION {REL['ver']} &middot; {MB}</span> &middot; DIGITALLY SIGNED BY 365 TECHIES LTD &middot; NOT FOR MAC, IPHONE OR ANDROID</p>
          <ol class="t1p-steps">{steps}</ol>
          <details>
            <summary>What will Windows say when I open it?</summary>
            <p>Usually nothing: it&rsquo;s digitally signed by 365 Techies Ltd. But a brand-new program can get a warning or two while Windows gets to know it. <strong>When downloading</strong>, Edge may say the file &ldquo;isn&rsquo;t commonly downloaded&rdquo;: press the three dots next to it, choose <strong>Keep</strong>, then <strong>Show more</strong> and <strong>Keep anyway</strong>. <strong>When you open it</strong>, you may see a blue &ldquo;Windows protected your PC&rdquo; box: choose <strong>More info</strong>, check that the Publisher line says <strong>365 Techies Ltd</strong>, then choose <strong>Run anyway</strong>. If the publisher says anything else, don&rsquo;t run it, and ring us.</p>
          </details>
          <details>
            <summary>Will I lose my old emails?</summary>
            <p>Usually not. If your old program used the normal setting (IMAP), your emails are kept with your email provider, so they appear in Techies One Mail, folders and all, as soon as you add your address. Outlook Express and Windows Live Mail were often set to the older &ldquo;POP&rdquo; setting instead, which kept email only on the old PC, and Techies One can&rsquo;t open those copies. If that might be you, <a href="/contact/">ask us</a> before you remove the old program or PC.</p>
          </details>
        </div>
      </div>
    </section>"""


HISTORY = f"""    <section class="section section--alt t1p" aria-labelledby="t1-what-happened">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// WHY YOUR OLD EMAIL PROGRAM STOPPED</p>
        <h2 id="t1-what-happened">What happened to Windows Mail, Outlook Express and Windows Live Mail?</h2>
        <p class="t1p-lede">Each was Microsoft&rsquo;s free email program for its time, and each has ended. For most people the email itself is still with their email provider, waiting for a program that can open it. The exception is an old program set to the &ldquo;POP&rdquo; setting, which kept email only on that PC.</p>
        <div class="t1p-tbl">
          <table>
            <thead><tr><th scope="col">Program</th><th scope="col">Came with</th><th scope="col">What happened</th></tr></thead>
            <tbody>
              <tr><th scope="row">Outlook Express</th><td>Windows XP</td><td>Ended with Windows XP on 8 April 2014. Windows Vista replaced it with Windows Mail, and no later Windows has included it.</td></tr>
              <tr><th scope="row">Windows Mail (Vista)</th><td>Windows Vista</td><td>Ended with Vista on 11 April 2017.</td></tr>
              <tr><th scope="row">Windows Live Mail 2012</th><td>A free download for Windows 7</td><td>Support ended on 10 January 2017. In 2016 it lost its direct link to Hotmail and Outlook.com (people could still connect it another way), and on 16 September 2024 Outlook.com stopped accepting plain passwords from any program that can&rsquo;t use Microsoft&rsquo;s modern sign-in, which ended that too.</td></tr>
              <tr><th scope="row">Mail and Calendar</th><td>Windows 10 and 11</td><td>Support ended on 31 December 2024. Microsoft says it can no longer send or receive email, and points people to the new Outlook.</td></tr>
            </tbody>
          </table>
        </div>
        <p class="t1p-src">Dates from Microsoft&rsquo;s support and lifecycle pages and, for the 2016 Hotmail change, press reports at the time; checked {CHECKED}.</p>
        <p style="margin-top:1.2rem;max-width:52rem;line-height:1.6"><strong>A warning about &ldquo;Outlook Express for Windows 11&rdquo; downloads.</strong> Microsoft no longer offers Outlook Express or Windows Live Mail anywhere, so a website offering them is not Microsoft, and old copies get no security fixes. Many people also call Outlook.com or the new Outlook &ldquo;Outlook Express&rdquo;: if that&rsquo;s the one you mean, it is still going, and our <a href="/outlook-problems/">Outlook help</a> covers it.</p>
      </div>
    </section>"""

PROVIDERS = [
    ("BT", "btinternet.com, btopenworld.com", "Your normal BT email password", "BT Basic email (kept after leaving BT broadband) only works on bt.com, in no email program. <a href=\"/btinternet-email-wont-add-to-new-outlook/\">More about BT email</a>."),
    ("Sky", "sky.com", "Your Sky iD password", "Changed it lately? Use &ldquo;Unlock your emails&rdquo; on sky.com first. <a href=\"/sky-email-wont-add-to-new-outlook/\">More about Sky email</a>."),
    ("Plusnet", "name@username.plus.com", "Your Plusnet mailbox password", "Older force9 and free-online addresses may need the settings typed in. Plusnet is moving its email to Greenby; if yours has moved, ask us for the new settings. <a href=\"/plusnet-email-wont-add-to-new-outlook/\">More about Plusnet</a>."),
    ("Virgin Media", "virginmedia.com, ntlworld.com, blueyonder.co.uk, virgin.net", "A Virgin Media app password, made in the My Virgin Media app", "Making a new one stops the old one working on your other devices, and Virgin often won&rsquo;t give one for a second mailbox (ask us if that happens). Virgin email is moving to Junara: <a href=\"/virgin-media-email-moving-to-junara/\">what that means</a>."),
    ("Gmail", "gmail.com, googlemail.com", "A Google app password", "Needs Google&rsquo;s 2-Step Verification switched on first. The app shows you where to make one."),
    ("Yahoo and AOL", "yahoo.co.uk, yahoo.com, aol.com and others", "A Yahoo or AOL app password", "Made under Account security on the Yahoo or AOL website."),
    ("Outlook.com and Hotmail", "outlook.com, hotmail.co.uk, live.co.uk, msn.com and others", "Sign in on Microsoft&rsquo;s own page", "Techies One never sees your Microsoft password. Microsoft&rsquo;s page may call the app &ldquo;unverified&rdquo; while we finish Microsoft&rsquo;s checks. Your Outlook calendar syncs both ways."),
    ("Work addresses on Microsoft 365", "your company&rsquo;s own address", "Sign in on Microsoft&rsquo;s own page", "Your company&rsquo;s IT administrator will usually need to approve the app, and to switch on &ldquo;SMTP AUTH&rdquo; sending for your mailbox (it&rsquo;s off on many small-business setups). If that&rsquo;s us, just ring."),
    ("Other providers (including TalkTalk)", "any other address", "Usually your normal password", "Techies One looks up the settings itself, or you can type them in. We haven&rsquo;t yet tested every provider, TalkTalk included, so if it won&rsquo;t connect, ring us."),
]


def providers():
    rows = "".join(f"<tr><th scope=\"row\">{n}</th><td>{a}</td><td>{h}</td><td>{note}</td></tr>" for n, a, h, note in PROVIDERS)
    return f"""    <section class="section t1p" aria-labelledby="t1-works-with">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// WORKS WITH YOUR EMAIL ADDRESS</p>
        <h2 id="t1-works-with">Will it work with my email address?</h2>
        <p class="t1p-lede">Almost certainly. You type your address and Techies One fills in the settings. What you need to sign in depends on who your email is with:</p>
        <div class="t1p-tbl">
          <table>
            <thead><tr><th scope="col">Email from</th><th scope="col">Addresses ending</th><th scope="col">How you sign in</th><th scope="col">Good to know</th></tr></thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
        <p class="t1p-src">It reads email that is kept on your provider&rsquo;s server (IMAP), so your phone and PC show the same email. It doesn&rsquo;t do the older POP setting, and Apple iCloud email isn&rsquo;t supported.</p>
      </div>
    </section>"""


FEATS = [
    ("scam-warning", "Scam emails are the biggest worry",
     "Warnings about scams, in plain English",
     "Every email you open is checked on your PC for the tell-tale signs of a scam: a fake Royal Mail, HMRC or bank sender, a link that goes somewhere other than it says, a dangerous attachment, or pressure words like &ldquo;within 24 hours&rdquo;. It tells you exactly why. While Techies One is open, obvious scams go to a Scams folder and the sender is blocked; anyone you&rsquo;ve emailed before is never moved to Scams. Like any checker it can get things wrong, so if in doubt, ask us.",
     "A yellow &ldquo;Be careful with this email&rdquo; box explaining that a link hides where it goes and the email uses pressure words, with buttons to move it to Scams or ask 365 Techies (a made-up sample)"),
    ("inbox-genuine", "&ldquo;Is this really from them?&rdquo;",
     "It tells you when it finds no warning signs, too",
     "When it finds no warning signs, a green box says so and gives the reasons it looks all right: for example, that your email provider confirmed which address it really came from, or that you&rsquo;ve written to that person before. No checker is perfect, so if an email asks for money, bank details or a code, check by phone first. Pictures from the internet stay hidden until you choose to show them, so senders can&rsquo;t tell when you&rsquo;ve opened their email.",
     "An email from Sarah Pritchard with a green box: no warning signs found, your email provider confirmed it really came from family.example (a made-up sample)"),
    ("add-bt-email", "Settings, ports and passwords put people off",
     "Type your address; it does the rest",
     "Techies One knows the settings for the big UK providers, so there are no server names or port numbers to look up. It tells you which password it needs (BT&rsquo;s normal one, or a Gmail app password) and checks everything works before it saves.",
     "Adding a btinternet.com address: Techies One says it knows the settings and only asks for the BT email password (a made-up sample)"),
    ("clean-up", "Years of newsletters and junk",
     "Clean up your inbox in minutes",
     "Clean up lists everyone who fills your inbox, biggest first: mailing lists, emails you never open, senders gone quiet for over a year. Unsubscribe from genuine newsletters in one press (it refuses on anything suspicious, because that would tell a scammer your address works), delete or archive all of a sender&rsquo;s emails at once, or send a whole company to Junk from now on. Deleted email goes to Deleted, so nothing is lost by mistake.",
     "The Clean up screen listing each sender with how many emails they sent, a mailing list tag, and Unsubscribe and Delete all buttons (a made-up sample)"),
    ("address-book", "An address book you never had time to make",
     "An address book that fills itself in",
     "The people who email you, and everyone you email, go into your address book by themselves (newsletters and scam senders are left out), sorted into groups: Family, Health, Clubs &amp; groups, Businesses &amp; services and more. Email a whole group in one go, block someone in one press, or bring in contacts from Outlook, Gmail or any contacts file (.csv or .vcf).",
     "The address book with groups for Family, Health, Clubs and groups and Businesses, and Email, Edit and Block buttons beside each person (a made-up sample)"),
    ("calendar", "Appointments in one place",
     "A calendar that can keep your phone in step",
     "A clear month calendar with reminders (they pop up while Techies One is open on your screen). Sign in with an Outlook.com or Hotmail address and your Outlook calendar syncs both ways, so a dentist appointment you add on the PC also appears on a phone that shows your Outlook calendar. With other addresses the calendar is kept on your PC. Add the UK bank holidays in one click, or a school-terms or bin-day calendar from a link.",
     "The calendar for October 2026 with a dentist appointment, book club, a flu jab and a family visit, the next appointments listed under Coming up, and the UK bank holidays calendar on the right (a made-up sample)"),
    ("simple-view", "Too many buttons",
     "Big buttons and big text when you want them",
     "Simple view keeps just the everyday buttons (reading, writing, replying, deleting and reporting scams), bigger, with a green &ldquo;Get help&rdquo; button that asks one of us to ring you back. Text size goes up to extra large, there&rsquo;s a dark mode, and it can read an email out loud using Windows&rsquo; own voice.",
     "Simple view: a toolbar of large buttons for New email, Delete, Report scam, Reply, Forward, Explain this and Print, with a green Get help button (a made-up sample)"),
]


def features():
    blocks = []
    for name, prob, h, body, alt in FEATS:
        blocks.append(f"""          <div class="t1p-feat">
            <div class="t1p-feat__txt">
              <p class="t1p-prob mono">{prob}</p>
              <h3>{h}</h3>
              <p>{body}</p>
            </div>
            <figure style="margin:0"><div class="t1p-shot">{shot(name, alt)}</div></figure>
          </div>""")
    more = [
        ("Undo send", "Choose up to 30 seconds to change your mind after pressing Send."),
        ("Send later and snooze", "Have an email go tomorrow at 8am, or put one away until next week (your PC needs to be on, with Techies One running, at that time)."),
        ("Rules", "Always move emails from someone into a folder, or mark them read."),
        ("Several addresses, one window", "BT, Gmail and a work address together, each in its own colour."),
        ("Mail Mover", "Copy all your email from one address to another (say, Plusnet to Gmail), folder by folder, without deleting anything. A big mailbox can take a few days."),
        ("Templates and a signature", "Save the replies you write again and again; add a signature with a small logo."),
        ("Club newsletters", "Send a newsletter to a club or your customers, paced to stay within your provider&rsquo;s usual limits, with a proper unsubscribe line and no tracking."),
        ("Outlook&rsquo;s shortcuts", "Ctrl+N, Ctrl+R and the rest work as they did in Outlook."),
        ("An optional writing helper", "If you switch it on and add your own key from Anthropic (the company that makes the Claude AI), it can help you write a reply or explain an email. Anthropic charges each use to your account with them, usually a few pence, and the email you ask about is sent to Anthropic to do it. It&rsquo;s off until you switch it on, and everything else works without it."),
    ]
    more_html = "".join(f"<div><b>{t}</b><span>{d}</span></div>" for t, d in more)
    return f"""    <section class="section t1p" id="features" aria-labelledby="t1-features">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// WHAT IT DOES</p>
        <h2 id="t1-features">What it does that the old programs didn&rsquo;t</h2>
        <p class="t1p-lede">Email programs have looked much the same for twenty years. Techies One Mail was built around the problems our customers actually ring us about: scams, settings that won&rsquo;t take, an inbox they can&rsquo;t keep on top of, and too many buttons.</p>
        <div class="t1p-feats">
{chr(10).join(blocks)}
        </div>
        <h3 style="margin:2.4rem 0 0">And the everyday things you&rsquo;d expect</h3>
        <div class="t1p-more">{more_html}</div>
      </div>
    </section>"""


COMPARE = [
    ("us", "Techies One Mail (365 Techies)", "Free", "No limit on addresses and no adverts. Catches: Windows only; no POP or offline reading; scam checks and the blocked list work only while it&rsquo;s open on screen", "Yes: ring 01202 775566 (Mon to Fri 9 to 5) or press Get help in the app. Checking a problem is free; any work is priced before we start", "Windows 10 and 11 (64-bit)"),
    ("", "New Outlook (Microsoft)", "Free with adverts in the inbox; no adverts with Microsoft 365, from &pound;19.99 a year (Basic)", "The free version shows adverts", "Call-back for paying Microsoft 365 subscribers", "Windows 10 and 11"),
    ("", "Classic Outlook (Microsoft 365 Personal)", "&pound;84.99 a year, which also includes Word, Excel and 1 TB of storage", "Needs a subscription, or Office Home &amp; Business 2024 (&pound;249.99 one-off); Office Home 2024 doesn&rsquo;t include it", "Call-back for paying subscribers", "Windows (Mac has its own Outlook)"),
    ("", "Thunderbird (Mozilla)", "Free, funded by donations", "No limits; blocking a sender needs a filter", "Community forums", "Windows, Mac, Linux and Android"),
    ("", "eM Client", "Free for home use; Personal &pound;42.95 a year or &pound;64.95 once", "Free version: 2 email addresses, home use, 1 computer", "VIP support on paid plans", "Windows and Mac"),
    ("", "Mailbird", "Free; Premium &pound;3.44 a month (billed yearly) or &pound;74.75 once", "Free version: 1 address; the calendar, contacts, combined inbox and blocking are Premium", "VIP email support on Premium", "Windows and Mac"),
    ("", "OE Classic", "Free; Pro US$19 a year", "Some features are in Pro", "No UK phone support", "Windows"),
]


def compare():
    rows = "".join(('<tr class="us">' if c else "<tr>") + f'<th scope="row">{n}</th><td>{p}</td><td>{l}</td><td>{s}</td><td>{w}</td></tr>'
                   for c, n, p, l, s, w in COMPARE)
    return f"""    <section class="section section--alt t1p" id="compare" aria-labelledby="t1-compare">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// HOW IT COMPARES</p>
        <h2 id="t1-compare">How it compares with Outlook, Thunderbird and the others</h2>
        <p class="t1p-lede">Prices as each maker shows them in the UK. They change, so check before you buy.</p>
        <p class="t1p-swipe" aria-hidden="true">Swipe the table sideways to see every column &rarr;</p>
        <div class="t1p-tbl">
          <table>
            <thead><tr><th scope="col">Program</th><th scope="col">What it costs</th><th scope="col">Limits and catches</th><th scope="col">A person to talk to</th><th scope="col">Runs on</th></tr></thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
        <p class="t1p-src">Prices and limits checked on each maker&rsquo;s own website on {CHECKED}. Mailbird&rsquo;s prices were shown as discounts and may change. OE Classic is priced in US dollars.</p>
        <div class="t1p-two" style="margin-top:1.6rem">
          <div class="t1p-card"><h3>When something else suits you better</h3><ul class="t1p-list">
            <li><strong>You need a Mac, Android phone or Linux version:</strong> Thunderbird (Mac, Linux and Android), or eM Client or Mailbird (Mac).</li>
            <li><strong>You rely on Outlook&rsquo;s .pst archives, add-ins, shared mailboxes or Exchange features</strong> at work: classic Outlook.</li>
            <li><strong>You want to read email with no internet connection,</strong> or your old mailbox only works with POP: Thunderbird or Outlook.</li>
            <li><strong>Your old emails are only on your PC</strong> (Outlook Express or Windows Live Mail set to POP): OE Classic, which its maker says can bring in those old files, or ask us to move them for you.</li>
          </ul></div>
          <div class="t1p-card"><h3>When Techies One Mail is the better fit</h3><ul class="t1p-list">
            <li>You want something simple that warns you about scams and blocks a sender in one press, free.</li>
            <li>Your email is BT, Sky, Plusnet, Gmail, Yahoo, AOL or Outlook.com, and you just want it working on your PC.</li>
            <li>You&rsquo;d like a real person in Dorset to ring when you&rsquo;re stuck (checking the problem is free; we agree a price before any work).</li>
          </ul></div>
        </div>
      </div>
    </section>"""


MICROSOFT365 = f"""    <section class="section t1p" aria-labelledby="t1-m365">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// THE COST QUESTION</p>
        <h2 id="t1-m365">Do I need to pay for Microsoft 365 just for email?</h2>
        <p class="t1p-lede">No. You never needed Microsoft 365 to read BT, Sky, Gmail or Outlook.com email on a PC. Here is what each option gets you (Microsoft&rsquo;s UK prices on {CHECKED}):</p>
        <ul class="t1p-list">
          <li><strong>The new Outlook, free:</strong> works with most addresses, but shows adverts in your inbox.</li>
          <li><strong>Microsoft 365 Basic, &pound;1.99 a month or &pound;19.99 a year:</strong> takes the adverts away and gives a 100 GB Outlook.com mailbox. No desktop Word or Excel.</li>
          <li><strong>Microsoft 365 Personal, &pound;84.99 a year:</strong> adds classic Outlook, Word, Excel and PowerPoint on your computer and 1 TB of OneDrive storage. Family is &pound;104.99 a year for up to six people.</li>
          <li><strong>Techies One Mail, free:</strong> no adverts, for email, a calendar and an address book.</li>
        </ul>
        <p style="margin-top:1rem;max-width:52rem;line-height:1.6">So if you only pay for Microsoft 365 to get email on your PC without adverts, Techies One Mail does that for nothing. One check first if your address is Outlook.com or Hotmail: the free mailbox holds 15 GB, and Microsoft 365 raises it to 100 GB. If yours is bigger than 15 GB, stopping Microsoft 365 would stop your email, so ask us before you change anything.</p>
        <p style="margin-top:1rem;max-width:52rem;line-height:1.6">Keep Microsoft 365 if you use Word, Excel or OneDrive to back up your photos: it is good value for those. If you&rsquo;re on our <a href="/home-it-support-plans/">home support plan</a> (&pound;18.25 a month per computer), we can add Microsoft 365 for &pound;4.85 a month per user and set it up for you. See <a href="/which-microsoft-365-plan/">which Microsoft 365 plan</a> or <a href="/contact/">ask us</a>.</p>
      </div>
    </section>"""

SAFETY = """    <section class="section section--alt t1p" aria-labelledby="t1-safe">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// SAFE TO USE</p>
        <h2 id="t1-safe">Is it safe to put my email password into it?</h2>
        <div class="t1p-two">
          <div class="t1p-card"><h3>Your email and passwords</h3><ul class="t1p-list">
            <li>Your email goes straight between your PC and your email provider. It never passes through 365 Techies.</li>
            <li>Passwords are locked with Windows&rsquo; own protection, so they only open for you, on that PC.</li>
            <li>For Outlook.com and Hotmail you sign in on Microsoft&rsquo;s own page; Techies One never sees that password.</li>
            <li>Only secure, encrypted connections to your provider are allowed.</li>
          </ul></div>
          <div class="t1p-card"><h3>What it tells us, and updates</h3><ul class="t1p-list">
            <li>To hear about updates it checks in with us when it starts and every few hours. It sends only a random install number, its version, your Windows version and which kinds of provider you use (for example BT or Gmail). Never your addresses, emails, contacts or passwords. Details are in our <a href="/privacy-policy/">privacy policy</a>.</li>
            <li>The website sees your internet address when it checks in; we keep only the country, and delete an install we haven&rsquo;t heard from for a year.</li>
            <li>Nothing else goes to us unless you press Get help, which sends the name, phone number and message you type.</li>
            <li>When you add an address it doesn&rsquo;t already know, it looks up the settings using only the part after the @ (for example example.co.uk).</li>
            <li>If you switch on the optional AI writing helper, the email you ask about goes to Anthropic.</li>
            <li>The installer and every update are digitally signed by 365 Techies Ltd. Before an update installs, Techies One checks it is genuinely ours, and throws it away if not.</li>
            <li>It tells you when there&rsquo;s an update and installs it when you press Update now.</li>
          </ul></div>
        </div>
      </div>
    </section>"""

LIMITS = """    <section class="section t1p" aria-labelledby="t1-limits">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// HONEST LIMITS</p>
        <h2 id="t1-limits">What it can&rsquo;t do (yet)</h2>
        <ul class="t1p-list">
          <li><strong>Windows PCs only.</strong> There&rsquo;s no Mac, iPhone, iPad or Android version. Your phone keeps using its own email app, and both stay in step because your email is kept at your provider.</li>
          <li><strong>It checks new email while it&rsquo;s open on your screen.</strong> Scam checks, rules, the blocked and junk lists, new-email alerts and calendar reminders only work while a Techies One window is open and not minimised. When it&rsquo;s closed or minimised, your provider&rsquo;s own spam filter keeps working, and Techies One catches up as soon as you open it.</li>
          <li><strong>Send later needs your PC on.</strong> Emails set to send later wait on your PC and go at that time if it&rsquo;s on and Techies One is running (it keeps running when you close its window); otherwise they go when you next open it.</li>
          <li><strong>Search looks through one folder at a time,</strong> including old email in that folder, and shows the newest 40 matches. There&rsquo;s no single combined inbox yet: Favourites shows each inbox one under another.</li>
          <li><strong>No new folders yet.</strong> You can move email into the folders you already have, but you can&rsquo;t make, rename or delete folders in Techies One, or flag an email by hand.</li>
          <li><strong>No Outlook data files.</strong> It can&rsquo;t open .pst archives or run Outlook add-ins, and it doesn&rsquo;t repair Outlook: it replaces it for everyday email.</li>
          <li><strong>No POP or offline reading.</strong> It reads email kept on your provider&rsquo;s server, so it needs an internet connection.</li>
          <li><strong>Gmail, Yahoo, AOL and Virgin Media need an app password,</strong> and work addresses on Microsoft 365 usually need an administrator to approve the app and switch on sending (SMTP AUTH) for the mailbox.</li>
          <li><strong>Google Calendar shows read-only</strong> for now (from its private link). Outlook.com calendars sync both ways.</li>
        </ul>
      </div>
    </section>"""


def growing():
    return f"""    <section class="section section--alt t1p" id="whats-new" aria-labelledby="t1-new">
      <div class="wrap t1p-wrap">
        <div class="t1p-two">
          <div>
            <p class="eyebrow mono">// IT KEEPS GETTING BETTER</p>
            <h2 id="t1-new">Built by us, improved on request</h2>
            <p style="line-height:1.6">Techies One Mail is made and looked after by 365 Techies in Dorset, and it grows with what people ask for. Want it to do something it doesn&rsquo;t? Press <strong>Get help</strong> in the app, ring 01202 775566 or <a href="/contact/">send us a message</a>, and tell us. Updates arrive in the program itself: it tells you when there&rsquo;s a new version.</p>
          </div>
          <div class="t1p-card">
            <h3>What&rsquo;s new</h3>
            <p style="margin:0 0 .4rem"><strong>Version {REL['ver']}, {CHECKED}.</strong> {REL['notes'].replace("'", "&rsquo;")}</p>
            <p style="margin:0;color:var(--muted);font-size:.95rem">Next on our list (no dates yet): checking for scams with the window closed, searching every folder at once, and making your own folders.</p>
          </div>
        </div>
      </div>
    </section>"""


WHO = """    <section class="section t1p" aria-labelledby="t1-who">
      <div class="wrap t1p-wrap">
        <p class="eyebrow mono">// WHO MAKES IT</p>
        <h2 id="t1-who">Who makes Techies One Mail?</h2>
        <p style="max-width:52rem;line-height:1.6">365 Techies Ltd, a family-run IT support firm looking after homes and small businesses in Bournemouth, Christchurch and Poole since 1995. We spend our days helping people with their email, which is why we built a program that avoids the problems we&rsquo;re asked about most. We also make <a href="/free-pc-health-check/">365 PC Manager</a>, a free health check for Windows PCs. Ring 01202 775566, Monday to Friday, 9am to 5pm, or read <a href="/about/">more about us</a>.</p>
      </div>
    </section>"""

FAQS = [
    ("Is Techies One Mail really free?",
     "Yes. The program costs nothing: no charge, no trial, no adverts and no account to make with us, and you can add as many email addresses as you like. Two optional things can cost money. The AI writing helper is charged by Anthropic for each use, if you switch it on with your own key. And if you&rsquo;d like us to set it up or sort out a problem, that&rsquo;s a paid job (remote jobs from &pound;20), and we agree the price with you before we start."),
    ("What replaced Windows Mail in Windows 11?",
     "Microsoft ended support for its Mail and Calendar app on 31 December 2024 and now offers the new Outlook, which is free but shows adverts unless you pay for Microsoft 365. Techies One Mail is a free alternative without adverts."),
    ("Can I still use Outlook Express on Windows 11?",
     "No. Outlook Express came with Windows XP and ended in 2014, and Microsoft doesn&rsquo;t offer it any more. Websites offering it for Windows 11 are not Microsoft and the copies get no security fixes. Techies One Mail is a modern, free replacement."),
    ("Can I still use Windows Live Mail with Windows 11?",
     "Not safely. Support ended in January 2017, so it gets no security fixes; it no longer works with Hotmail or Outlook.com; and it can&rsquo;t use the modern sign-in Outlook.com and Hotmail now need. Microsoft no longer offers it, so download sites offering it are not Microsoft."),
    ("Is there a free alternative to Outlook?",
     "Yes: Techies One Mail, Thunderbird and the free versions of eM Client and Mailbird all work on Windows. Techies One Mail explains each scam warning in plain English, blocks a sender in one press for free, and comes from a UK firm you can ring. The comparison table above shows the limits of each."),
    ("Can I use email on my PC without paying for Microsoft 365?",
     "Yes. You don&rsquo;t need Microsoft 365 to use BT, Sky, Gmail or Outlook.com email on a PC. Techies One Mail is free and has no adverts. Keep Microsoft 365 if you use Word, Excel or OneDrive backup."),
    ("Does it work with BT, Sky, Virgin Media and Plusnet email?",
     "Yes, with two exceptions: BT Basic email, which BT only allows on bt.com, and Virgin Media mailboxes that Virgin won&rsquo;t give an app password for (often a second mailbox). BT and Sky use your normal password, Plusnet your mailbox password, and Virgin Media an app password from the My Virgin Media app."),
    ("What is the easiest email program for older people?",
     "Look for big, clear buttons, large text and warnings about scams. Techies One Mail has a Simple view with bigger buttons, three text sizes, read-aloud and a Get help button that asks a real person at 365 Techies to ring you back (any paid help is priced before we start)."),
    ("How do I block someone sending me emails?",
     "Open one of their emails and press Block sender. From then on, whenever Techies One is open on your screen, anything new they send is moved to your Scams folder, and your phone sees it there too. It doesn&rsquo;t stop their emails reaching your provider, so a new one can show on your phone until Techies One next checks. You can unblock them from the address book at any time."),
    ("Will I lose my old emails if I switch?",
     "Usually not. If your old program used the normal setting (IMAP), your emails are kept with your email provider, so they appear in Techies One Mail, folders and all, as soon as you add your address. Outlook Express and Windows Live Mail were often set to the older POP setting instead, which kept email only on the old PC, and Techies One can&rsquo;t open those copies. If that might be you, ask us before you remove the old program or PC."),
    ("Is it safe to put my email password into it?",
     "Yes. Passwords are locked with Windows&rsquo; own protection on your PC and never sent to us, and your email goes straight between your PC and your provider. The program is digitally signed by 365 Techies Ltd."),
    ("Does it work on a Mac, iPad or phone?",
     "No, it is for Windows 10 and 11 (64-bit) PCs only. Your phone or tablet keeps using its own email app, and everything stays in step because your email is kept at your provider."),
]

TRADEMARK = """    <section class="section t1p" aria-label="Trademarks">
      <div class="wrap"><p class="t1p-tm">Microsoft, Microsoft 365, Microsoft Edge, Outlook, Outlook Express, Hotmail, OneDrive, Word, Excel, PowerPoint, Windows and Windows Live are trademarks of the Microsoft group of companies. Thunderbird is a trademark of the Mozilla Foundation. Other names belong to their owners. Techies One Mail is made by 365 Techies Ltd and is not made, endorsed or supported by Microsoft or any other company named here.</p></div>
    </section>"""

DESC = ("Techies One Mail: a free email program for Windows 10 and 11 that replaces Windows Mail and Outlook Express. "
        "BT, Sky and Gmail ready, with scam warnings.")


def build():
    content = "\n".join([
        hero(), PROOF, download(), HISTORY, providers(), features(), compare(), MICROSOFT365, SAFETY, LIMITS, growing(),
        WHO, bp.faq_html(FAQS),
        bp.cta("Rather we set it up for you?", "We can install Techies One Mail, add your email addresses and show you round, over the phone or on a visit. It&rsquo;s a paid job, from &pound;20 remotely, and we agree the price before we start.",
               primary=("Call 01202 775566", "tel:+441202775566"), secondary=("Send us a message", "/contact/")),
        TRADEMARK,
    ])

    def schema(s, _d=DESC):
        app = {
            "@type": "SoftwareApplication", "@id": f"{bp.SITE}/{s}/#app", "name": NAME,
            "operatingSystem": "Windows 10 (64-bit), Windows 11", "applicationCategory": "CommunicationApplication",
            "description": ("A free email, calendar and address book program for Windows 10 and 11 PCs, made by 365 Techies. "
                            "It replaces Windows Mail, Outlook Express and Windows Live Mail, has the settings for BT, Sky, Plusnet, "
                            "Gmail, Yahoo, AOL and Outlook.com built in, warns about scam emails in plain English and has a big-button view."),
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP", "availability": "https://schema.org/InStock"},
            "isAccessibleForFree": True, "inLanguage": "en-GB",
            "downloadUrl": REL["url"], "softwareVersion": REL["ver"], "fileSize": MB.replace(" ", ""),
            "featureList": ["Plain-English scam warnings and a Scams folder", "One-press block sender",
                            "Clean up: unsubscribe and remove old email in bulk", "Address book that fills itself in, with groups",
                            "Calendar with two-way Outlook.com sync and UK bank holidays", "Simple view with big buttons and large text",
                            "Undo send, send later and snooze", "Mail Mover: copy all email from one address to another"],
            "screenshot": [f"{bp.SITE}/images/t1-{n}-{VER_TAG}-1440.webp" for n, *_ in FEATS],
            "publisher": {"@id": bp.SITE + "/#business"}, "provider": {"@id": bp.SITE + "/#business"},
            "datePublished": "2026-10-10", "url": f"{bp.SITE}/{s}/",
        }
        video = {"@type": "VideoObject", "@id": f"{bp.SITE}/{s}/#video", "name": "Techies One Mail in %d seconds" % FILM_SECS,
                 "description": ("What Techies One Mail does: plain-English scam warnings, adding a BT address, Simple view and "
                                 "Get help, from 365 Techies in Bournemouth. The real program with a made-up demo mailbox."),
                 "thumbnailUrl": [bp.SITE + FILM_POSTER], "uploadDate": FILM_UPLOADED,
                 "duration": "PT%dM%dS" % (FILM_SECS // 60, FILM_SECS % 60), "contentUrl": bp.SITE + FILM,
                 "embedUrl": f"{bp.SITE}/{s}/#video", "inLanguage": "en-GB", "publisher": {"@id": bp.SITE + "/#business"}}
        app["subjectOf"] = {"@id": f"{bp.SITE}/{s}/#video"}
        return bp.graph([bp.crumb_sub(s, "Email Support", "email-support", NAME),
                         bp.webpage(s, NAME, _d, image=bp.SITE + OG), app, video,
                         bp.howto_node(s, "How to install Techies One Mail", STEPS),
                         bp.faqpage(s, FAQS)])

    bp.add(slug=SLUG, title="Techies One Mail | Free Replacement for Windows Mail", desc=DESC,
           og_title="Techies One Mail: the free, simple email program for Windows", schema=schema, content=content,
           og_image=bp.SITE + OG)


build()
