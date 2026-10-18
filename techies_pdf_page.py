"""/techies-pdf/ - the Techies PDF product page and download (18 Oct 2026, owner: "go ahead with ... the download page").

Techies PDF is the third 365 Techies program (after 365 PC Manager and Techies One), picked from the 18 Oct research
(D:\\claude\\seo-research\\third-program-2026-10-18\\FINDINGS.md: Bing UK, 3 months - pdf editor 31.6K, merge pdf 22.8K,
compress pdf 14.1K, combine pdf 9.9K, free pdf editor 9.3K, edit pdf 9.1K, sign pdf 718). Its angle: everything happens
on the PC, nothing is uploaded, plain English, no adverts, signed. Source: D:\\claude\\techies-pdf (README there).

Rules, from what the program really does (0.1.0):
  - it ADDS text, signatures, drawings and highlights on top of a PDF; it can't change the words already in one, and
    the page says so wherever "editor" is used;
  - a signature is a picture of your signature (typed, drawn or from a photo), not a certified digital signature;
  - taking a password off needs the password: it never breaks a lock;
  - no PDF to Word and no reading words from scans (OCR) yet; Windows 10 and 11 (64-bit) only; its window is Microsoft
    Edge's app window (Edge comes with Windows);
  - it never contacts us or anyone else: no check-in, no update check (so: "come back here for new versions");
  - Save keeps the version before; the tools always save a new file and never change the original;
  - the pictures are the real program on made-up documents (techies-pdf/app/tests/make_shot_samples.py), and say so;
  - other companies' names only to say what it replaces or works with, with the trademark note; no star rating in the
    structured data (no user ratings collected).
The download, version and size come from downloads/tpdf/version.json, and the build stops if the installer is missing.
"""
import json
import os
import re

import build_pages as bp

SLUG = "techies-pdf"
NAME = "Techies PDF"
TAG = "v1"                    # pictures of 0.1.0 (18 Oct 2026). Cached for a year: a new look = a new tag
OG = f"/images/tpdf-og-{TAG}.jpg"
# the pictures' sizes at 1440 wide (tools/playwright-check/tpdf-shots.mjs at 1120 x 800, 2x, cropped to the content)
DIMS = {"home": 801, "sign": 1029, "join": 643, "pages": 724, "split": 707, "shrink": 977, "photos": 994, "words": 765,
        "password": 833}


def release():
    """The newest signed release: {url, path, ver, size, sha256, notes}, or None if version.json is unreadable, points
    elsewhere, or its installer is not in the site."""
    try:
        with open(os.path.join(bp.BASE, "downloads", "tpdf", "version.json"), encoding="utf-8") as f:
            v = json.load(f)
        url = v.get("url", "")
        if not re.fullmatch(r"https://365techies\.co\.uk/downloads/tpdf/TechiesPDF-Setup-[0-9.]+\.exe", url):
            return None
        path = url.replace("https://365techies.co.uk", "")
        if not os.path.isfile(os.path.join(bp.BASE, path.lstrip("/").replace("/", os.sep))):
            return None
        return {"url": url, "path": path, "ver": v["ver"], "size": int(v.get("size") or 0),
                "sha256": v.get("sha256", ""), "notes": v.get("notes", "")}
    except (OSError, ValueError, KeyError):
        return None


REL = release()
if not REL:
    raise SystemExit("techies_pdf_page: downloads/tpdf/version.json or its installer is missing - no product page without a download")
MB = f"{round(REL['size'] / 1_048_576)} MB"   # as Windows and Edge show it


def shot(name, alt, eager=False):
    base = f"/images/tpdf-{name}-{TAG}"
    lazy = "" if eager else ' loading="lazy"'
    return (f'<img src="{base}-720.webp" srcset="{base}-720.webp 720w, {base}-1440.webp 1440w" '
            f'sizes="(max-width:880px) 100vw, 640px" width="1440" height="{DIMS[name]}" alt="{alt}"{lazy} decoding="async">')


CSS = """    <style>
      .tpp{--tpedge:rgba(125,170,220,.24);--tpfill:rgba(125,170,220,.06)}
      .tpp [id]{scroll-margin-top:96px}
      .tpp-shot{margin:0;border:1px solid var(--tpedge);border-radius:14px;overflow:hidden;background:#f4f3f3;box-shadow:0 18px 50px rgba(0,0,0,.35)}
      .tpp-shot img{display:block;width:100%;height:auto}
      .tpp-cap{margin:.5rem 0 0;font-size:.82rem;color:var(--muted);text-align:center}
      .tpp-dl{max-width:880px;margin:0 auto;border:1px solid var(--tpedge);border-radius:16px;background:var(--tpfill);padding:clamp(1.1rem,3vw,1.8rem);display:flex;flex-direction:column;gap:.8rem}
      .tpp-dl h2,.tpp h2{margin:0}
      .tpp-dl p{margin:0}
      .tpp-btns{display:flex;flex-wrap:wrap;gap:.6rem}
      .tpp-btns .button{flex:1 1 15rem;text-align:center}
      .tpp-meta{font-size:.78rem;letter-spacing:.04em;color:var(--muted)}
      .tpp-steps{margin:0;padding:0;list-style:none;display:grid;gap:.45rem}
      .tpp-steps li{line-height:1.5}
      .tpp details{border:1px solid var(--tpedge);border-radius:10px;padding:.6rem .9rem}
      .tpp details summary{cursor:pointer;font-weight:600}
      .tpp details p{margin:.5rem 0 0}
      .tpp-wrap{max-width:1100px;margin:0 auto}
      .tpp-lede{max-width:46rem;color:var(--muted);font-size:1.05rem;line-height:1.6;margin:.4rem 0 1.4rem}
      .tpp p a:not([class]),.tpp li a:not([class]),.tpp td a:not([class]){color:var(--cyan);text-decoration:underline;text-underline-offset:2px}
      .tpp p a:not([class]):hover,.tpp li a:not([class]):hover,.tpp td a:not([class]):hover{color:#fff}
      .tpp-parts{list-style:none;margin:1.2rem 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.7rem}
      @media (max-width:860px){.tpp-parts{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media (max-width:300px){.tpp-parts{grid-template-columns:1fr}}
      .tpp-parts a{display:flex;flex-direction:column;gap:.35rem;height:100%;box-sizing:border-box;border:1px solid var(--tpedge);border-radius:12px;padding:.85rem .9rem;background:var(--tpfill);color:inherit;text-decoration:none;transition:border-color .2s ease,background .2s ease}
      .tpp-parts a:hover,.tpp-parts a:focus-visible{border-color:var(--cyan);background:rgba(29,151,227,.12)}
      .tpp-parts svg{width:1.9rem;height:1.9rem;color:var(--cyan-soft,#6cc4f5)}
      .tpp-parts b{font-size:1.05rem}
      .tpp-parts span{color:var(--muted);font-size:.9rem;line-height:1.4}
      .tpp-feats{display:grid;gap:clamp(1.6rem,4vw,2.8rem)}
      .tpp-feat{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:clamp(1rem,3vw,2.2rem);align-items:center}
      .tpp-feat:nth-child(even) .tpp-feat__txt{order:2}
      .tpp-feat h3{margin:0 0 .4rem;font-size:clamp(1.2rem,2.4vw,1.5rem)}
      .tpp-feat p{margin:0 0 .5rem;line-height:1.6}
      .tpp-feat .tpp-prob{font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--cyan-soft,#6cc4f5);margin:0 0 .35rem}
      .tpp-list{margin:0;padding-left:1.2rem;display:grid;gap:.4rem;max-width:52rem}
      .tpp-list li{line-height:1.55}
      .tpp-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));gap:1.2rem}
      .tpp-card{border:1px solid var(--tpedge);border-radius:14px;padding:1.1rem 1.2rem;background:var(--tpfill)}
      .tpp-card h3{margin:0 0 .5rem;font-size:1.15rem}
      .tpp-tm{font-size:.78rem;color:var(--muted);max-width:60rem;margin:1.6rem auto 0;text-align:center;line-height:1.5}
      @media (max-width:860px){.tpp-feat{grid-template-columns:1fr}.tpp-feat:nth-child(even) .tpp-feat__txt{order:0}}
    </style>
"""


def hero():
    return f"""{CSS}    <section class="page-hero dh dh-hero tpp" aria-label="Introduction">
      <div class="dh-hero__grid">
        <div>
          <nav class="breadcrumb" aria-label="Breadcrumb">{bp.bc_sub("Free Tools", "/free-tools/", NAME)}</nav>
          <p class="eyebrow mono">// FREE FOR WINDOWS 10 &amp; 11 &middot; NOTHING UPLOADED &middot; SIGNED BY 365 TECHIES LTD</p>
          <h1><em class="grad grad--cyan">Techies PDF</em>: the free PDF editor for Windows that keeps your files on your PC</h1>
          <p class="lede"><strong>Techies PDF</strong> is a free program for Windows 10 and 11 from 365 Techies, the family-run IT firm in Bournemouth. <strong>Fill in and sign</strong> a PDF form without printing it, <strong>join</strong> PDFs into one, <strong>turn, move or take out</strong> pages, <strong>shrink</strong> a PDF so it can be emailed, turn <strong>photos into a PDF</strong>, copy the words out, and put a <strong>password</strong> on. All on your own computer: your documents are never uploaded anywhere. No adverts, no account, no watermark.</p>
          <div class="page-hero__cta">
            <a href="#download" class="button primary button--lg">Download it free</a>
            <a href="tel:+441202775566" class="button secondary button--lg">Rather we set it up? 01202 775566</a>
          </div>
          <a class="dh-rating" href="/reviews/"><span><span aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span> <strong>Our firm is rated 4.9 on Google</strong></span><span>365 Techies &middot; family-run since 1995</span></a>
          <p class="page-hero__byline mono"><span class="page-hero__byline-by">By the </span><a href="/meet-the-team/">365 Techies team</a> &middot; Reviewed __LASTMOD_HUMAN__</p>
        </div>
        <figure style="margin:0">
          <div class="tpp-shot">{shot("sign", "Techies PDF with a club membership form filled in on screen: name, address, phone, email, a ticked box, the date and a signature on the signature line, with Save as, Save a copy and Print at the top (a made-up sample)", eager=True)}</div>
          <figcaption class="tpp-cap">The real program: a form filled in and signed, ready to save. The club and the person are made up.</figcaption>
        </figure>
      </div>
    </section>"""


PROOF = """    <section class="dh dh-sec dh-proof" aria-label="The deal, in four facts">
      <div class="dh-in">
        <ul class="dh-facts">
          <li class="hp-c-care"><b>&pound;0</b><span>for the program, with no adverts or watermark</span></li>
          <li class="hp-c-fix"><b>On your PC</b><span>your PDFs are never uploaded, to us or anyone</span></li>
          <li class="hp-c-buy"><b>Signed</b><span>by 365 Techies Ltd, checked by Windows</span></li>
          <li class="hp-c-biz"><b>A person</b><span>to ring: 01202 775566, Mon to Fri 9 to 5; any paid work is priced first</span></li>
        </ul>
      </div>
    </section>"""

STEPS = [
    ("Download it", f"Press the Download button. The file is called TechiesPDF-Setup-{REL['ver']}.exe and is signed by 365 Techies Ltd."),
    ("Open the file", "It installs in a few seconds and needs no administrator password. It adds a Start menu entry, a desktop icon if you like, and Techies PDF to the &ldquo;Open with&rdquo; list for PDF files. It doesn&rsquo;t change your usual PDF program."),
    ("Open a PDF, or choose a job", "Press <strong>Open a PDF</strong> (or drop one onto the window) to read, fill in or sign it, or pick a job such as <strong>Join PDFs together</strong> or <strong>Make a PDF smaller for email</strong>. To open a PDF straight into Techies PDF, right-click it and choose <strong>Open with</strong>."),
]


def download():
    steps = "".join(f"<li><strong>{i}. {n}.</strong> {t}</li>" for i, (n, t) in enumerate(STEPS, 1))
    return f"""    <section class="section tpp" id="download" aria-label="Download Techies PDF">
      <div class="wrap">
        <div class="tpp-dl">
          <p class="eyebrow mono">// DOWNLOAD &middot; FREE &middot; WINDOWS 10 &amp; 11</p>
          <h2>Get Techies PDF</h2>
          <p>The program is free for everyone, at home or at work: no trial, no account to make with us, no adverts, no watermark on your PDFs and no daily limit.</p>
          <div class="tpp-btns">
            <a class="button primary button--lg" href="{REL['path']}" download>Download Techies PDF (Windows)</a>
            <a class="button secondary button--lg" href="tel:+441202775566">Rather we set it up? 01202 775566</a>
          </div>
          <p class="tpp-meta mono">FOR WINDOWS 10 AND 11 (64-BIT)<span class="tpv"> &middot; VERSION {REL['ver']} &middot; {MB}</span> &middot; DIGITALLY SIGNED BY 365 TECHIES LTD &middot; NOT FOR MAC, IPHONE OR ANDROID</p>
          <ol class="tpp-steps">{steps}</ol>
          <details>
            <summary>What will Windows say when I open it?</summary>
            <p>Usually nothing: it&rsquo;s digitally signed by 365 Techies Ltd. But a brand-new program can get a warning or two while Windows gets to know it. <strong>When downloading</strong>, Edge may say the file &ldquo;isn&rsquo;t commonly downloaded&rdquo;: press the three dots next to it, choose <strong>Keep</strong>, then <strong>Show more</strong> and <strong>Keep anyway</strong>. <strong>When you open it</strong>, you may see a blue &ldquo;Windows protected your PC&rdquo; box: choose <strong>More info</strong>, check that the Publisher line says <strong>365 Techies Ltd</strong>, then choose <strong>Run anyway</strong>. If the publisher says anything else, don&rsquo;t run it, and ring us.</p>
          </details>
          <details>
            <summary>Will it take over from my usual PDF program?</summary>
            <p>No. It adds itself to the <strong>Open with</strong> list, so you can choose it when you want it, and your PDFs keep opening in whatever they open in now. If you&rsquo;d like Techies PDF to open every PDF, choose it in Windows Settings, under <strong>Apps</strong> and then <strong>Default apps</strong>.</p>
          </details>
        </div>
      </div>
    </section>"""


ICONS = {
    "sign": '<path d="M4 20h16"/><path d="M6 16c2-4 4-9 6-9 1.6 0 .4 5-1 7 2-1.5 3-2.5 4-2.5.8 0 .6 1.6 1.4 1.6.7 0 1.4-.6 2.1-1.1"/>',
    "join": '<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><path d="M11 8h4v3"/>',
    "pages": '<rect x="4" y="3" width="7" height="9" rx="1.2"/><rect x="13" y="3" width="7" height="9" rx="1.2"/><path d="M7 17a5 5 0 0 0 10 0M17 17l-2-2M17 17l2-2"/>',
    "split": '<rect x="3" y="3" width="8" height="18" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    "shrink": '<path d="M4 4l6 6M10 5v5H5M20 20l-6-6M14 19v-5h5M20 4l-6 6M19 10h-5V5M4 20l6-6M5 14h5v5"/>',
    "photos": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="9" r="1.3"/>',
    "words": '<path d="M5 5h14M5 9h14M5 13h9M5 17h6M16 15l3 3-3 3"/>',
    "password": '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2"/>',
}
PARTS = [
    ("sign", "Fill in &amp; sign", "Type into forms, sign, add text, highlight"),
    ("join", "Join PDFs", "Put two or more PDFs into one"),
    ("pages", "Turn &amp; move pages", "Fix upside-down pages, change the order, take pages out"),
    ("split", "Take pages out", "Save just the pages you need, or one PDF per page"),
    ("shrink", "Make it smaller", "Shrink a big PDF so it can be emailed"),
    ("photos", "Photos to PDF", "Letters, receipts and forms from your phone"),
    ("words", "Copy the words", "Get the text out to paste somewhere else"),
    ("password", "Passwords", "Lock a PDF, or unlock one you have the password for"),
]


def icon(k):
    return (f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true">{ICONS[k]}</svg>')


def overview():
    tiles = "".join(f'<li><a class="tpp-part" href="#{k}">{icon(k)}<b>{n}</b><span>{d}</span></a></li>' for k, n, d in PARTS)
    return f"""    <section class="section section--alt tpp" id="features" aria-labelledby="tpp-features">
      <div class="wrap tpp-wrap">
        <p class="eyebrow mono">// WHAT IT DOES</p>
        <h2 id="tpp-features">The PDF jobs people ring us about, in one simple program</h2>
        <p class="tpp-lede">A form to sign, a letter that needs to go as one PDF, a scan that came out upside down, an attachment too big to send. Each job has its own big button and plain words, and you choose where the result is saved.</p>
        <figure style="margin:0;max-width:880px"><div class="tpp-shot">{shot("home", "The Techies PDF start screen: Open a PDF to read, fill in or sign, and buttons for Join PDFs together, Turn, move or take out pages, Take pages out into a new PDF, Make a PDF smaller for email, Turn photos into a PDF, Copy the words out of a PDF and Put a password on or take one off")}</div></figure>
        <ul class="tpp-parts">{tiles}</ul>
      </div>
    </section>"""


# (anchor id = the picture's name, the problem, heading, what it does, the picture's alt text)
FEATS = [
    ("sign", "A form to fill in, sign and send back",
     "Fill in and sign a PDF without printing it",
     "Open the PDF and type straight into its boxes, tick its boxes, and press <strong>Add or edit signatures</strong> to sign: type your name in a handwriting style, draw it with the mouse or a finger, or use a photo of your signature. Put it on the line, make it bigger or smaller, and press <strong>Save</strong>. If the PDF has no boxes to type in (a scanned form, say), <strong>Text</strong> puts words anywhere on the page. <strong>Highlight</strong> and <strong>Draw</strong> are there too, and <strong>Print</strong> when it has to go on paper.",
     "A club membership form filled in and signed in Techies PDF, with the signature on the signature line (a made-up sample)"),
    ("join", "Several PDFs that should go as one",
     "Join PDFs into one",
     "Choose the PDFs (or drop them onto the window), put them in order with the arrows, and press <strong>Join them into one PDF</strong>. Insurance certificates, bank statements, a CV and its references: one tidy file to send. The PDFs you started with stay as they were.",
     "Join PDFs together: a car insurance certificate, a schedule and an MOT certificate in order, with Join them into one PDF (made-up samples)"),
    ("pages", "A page upside down, or one you don&rsquo;t need",
     "Turn, move or take out pages",
     "Every page shows as a picture. Turn a page with the round arrows, move it earlier or later (or drag it), and take out the blank or unwanted ones, then save. Scanned letters that came out upside down are put right in two clicks.",
     "Turn, move or take out pages: four pages of a letter, page 3 turned the right way up and page 4 marked Taken out, with Save the PDF (a made-up sample)"),
    ("split", "Only some of the pages are needed",
     "Save just the pages you need, or one PDF per page",
     "Type the pages you want, like <strong>1-3, 5</strong>, and they&rsquo;re saved as a new PDF. Or press <strong>Make a PDF for every page</strong> and each page becomes its own file, named so you can tell them apart.",
     "Take pages out into a new PDF: pages 1-2 typed in, with Save these pages, and Make 4 PDFs for one PDF per page (a made-up sample)"),
    ("shrink", "&ldquo;The attachment is too big to send&rdquo;",
     "Make a PDF smaller for email",
     "Most email can only take about 20 to 25 MB, and a PDF of phone photos or scans is often bigger. Choose <strong>Good for email</strong> (pictures stay clear and sharp), <strong>Smaller</strong> or <strong>Smallest</strong>, and a smaller copy is saved beside it. Our made-up PDF of five holiday photos went from 27 MB to 1.3 MB. A PDF that&rsquo;s mostly words is usually small already, and if it can&rsquo;t be made smaller it tells you so, rather than giving you a bigger one.",
     "Make a PDF smaller for email: a 27 MB PDF of holiday photos made 1.3 MB, 95% smaller, with the choices Good for email, Smaller and Smallest (a made-up sample)"),
    ("photos", "Letters and receipts photographed on a phone",
     "Turn photos into a PDF",
     "Choose the photos (or drop them in), put them in order, and choose <strong>A4 pages</strong> for printing or sending to an office, or pages the size of each photo. Every photo goes the right way up, one per page. iPhone photos (HEIC) need turning into JPG first: <a href=\"/heic-photos-wont-open-on-windows/\">here&rsquo;s how</a>.",
     "Turn photos into a PDF: two photos of a receipt and a boiler service sheet as pages 1 and 2, with A4 pages chosen (made-up samples)"),
    ("words", "You need the words, not the PDF",
     "Copy the words out of a PDF",
     "All the words, page by page, ready to <strong>Copy</strong> and paste into an email or a letter, or to save as a text file. If a PDF is a scan (a picture of a page), there are no words to copy, and Techies PDF says so rather than giving you nothing.",
     "Copy the words out of a PDF: the words of a letter shown page by page, with Copy all the words and Save as a text file (a made-up sample)"),
    ("password", "Sending something private",
     "Put a password on a PDF, or take one off",
     "Put a password on a copy before you email it (it&rsquo;s locked with AES-256, the strongest kind PDFs use), and tell the person the password by phone or text, not in the same email. Got a PDF that asks for a password every time? Type the password once and a copy is saved that opens straight away. Taking a password off needs the password: Techies PDF never breaks a lock.",
     "Put a password on: the password typed twice, a warning to keep it safe because nobody can open the PDF without it, and Put the password on (a made-up sample)"),
]


def feat_blocks():
    out = []
    for fid, prob, h, body, alt in FEATS:
        out.append(f"""          <div class="tpp-feat" id="{fid}">
            <div class="tpp-feat__txt">
              <p class="tpp-prob mono">{prob}</p>
              <h3>{h}</h3>
              <p>{body}</p>
            </div>
            <figure style="margin:0"><div class="tpp-shot">{shot(fid, alt)}</div></figure>
          </div>""")
    return "\n".join(out)


def jobs():
    return f"""    <section class="section tpp" aria-labelledby="tpp-jobs">
      <div class="wrap tpp-wrap">
        <p class="eyebrow mono">// EVERY JOB, WITH PICTURES</p>
        <h2 id="tpp-jobs">How each job works</h2>
        <p class="tpp-lede">The pictures are the real program on made-up documents. Every job saves a new file where you choose and leaves the PDF you started with as it was.</p>
        <div class="tpp-feats">
{feat_blocks()}
        </div>
      </div>
    </section>"""


PRIVATE = """    <section class="section section--alt tpp" aria-labelledby="tpp-private">
      <div class="wrap tpp-wrap">
        <p class="eyebrow mono">// WHY NOT A FREE PDF WEBSITE?</p>
        <h2 id="tpp-private">Why not just use a free PDF website?</h2>
        <p class="tpp-lede">Most free PDF websites work by uploading your document to their computers, doing the job there and sending it back. That&rsquo;s fine for a takeaway menu. It&rsquo;s not what you want for a passport form, a bank statement, a medical letter or a customer&rsquo;s details.</p>
        <div class="tpp-two">
          <div class="tpp-card"><h3>Techies PDF</h3><ul class="tpp-list">
            <li>Everything happens on your own PC. Your PDFs never leave it, so there&rsquo;s nothing to upload and nothing to wait for.</li>
            <li>No account, no adverts, no watermark on what you save, and no &ldquo;two free jobs a day&rdquo;.</li>
            <li>Works without the internet, once it&rsquo;s installed.</li>
            <li>Big, plain buttons for each job, from a firm in Dorset you can ring.</li>
          </ul></div>
          <div class="tpp-card"><h3>A typical free PDF website</h3><ul class="tpp-list">
            <li>Your document goes to the company&rsquo;s computers, usually abroad, under their privacy policy.</li>
            <li>Often limits on file size or how many jobs a day, a watermark, or a nudge to pay monthly.</li>
            <li>Needs a good internet connection for every job, both ways.</li>
            <li>Lots of options and adverts to find your way past.</li>
          </ul></div>
        </div>
        <p style="margin-top:1rem;max-width:52rem;line-height:1.6">Your PC can already open PDFs, usually in Microsoft Edge, and that&rsquo;s fine for reading one. Techies PDF adds the jobs in one place: signing and filling in, joining, turning and taking out pages, shrinking, photos into a PDF and passwords.</p>
      </div>
    </section>"""

SAFETY = """    <section class="section tpp" aria-labelledby="tpp-safe">
      <div class="wrap tpp-wrap">
        <p class="eyebrow mono">// SAFE TO USE</p>
        <h2 id="tpp-safe">Is it safe to open my PDFs with it?</h2>
        <div class="tpp-two">
          <div class="tpp-card"><h3>Your documents</h3><ul class="tpp-list">
            <li>Your PDFs are read and saved on your own computer. They are never sent to 365 Techies or anyone else.</li>
            <li>The jobs (joining, shrinking, pages, photos, passwords) always save a new file, so the PDF you started with is never changed.</li>
            <li>When you press <strong>Save</strong> on a PDF you&rsquo;ve filled in or signed, the version before is kept on your PC as well, in case you need it back.</li>
            <li>Programs hidden inside a PDF (scripts) never run in Techies PDF.</li>
          </ul></div>
          <div class="tpp-card"><h3>What it tells us</h3><ul class="tpp-list">
            <li>Nothing. Techies PDF doesn&rsquo;t check in with us, count you, or send anything anywhere.</li>
            <li>It remembers the PDFs you opened lately (on your PC only, to show on its start screen); you can take any of them off the list.</li>
            <li>The installer is digitally signed by 365 Techies Ltd, so Windows can check it&rsquo;s really ours and hasn&rsquo;t been changed.</li>
            <li>Because it never contacts us, it doesn&rsquo;t update itself: new versions will be on this page.</li>
          </ul></div>
        </div>
      </div>
    </section>"""

LIMITS = """    <section class="section section--alt tpp" aria-labelledby="tpp-limits">
      <div class="wrap tpp-wrap">
        <p class="eyebrow mono">// HONEST LIMITS</p>
        <h2 id="tpp-limits">What it can&rsquo;t do (yet)</h2>
        <ul class="tpp-list">
          <li><strong>It can&rsquo;t change the words already in a PDF.</strong> It adds things on top: your typing in the form&rsquo;s boxes, new text anywhere on a page, signatures, highlights and drawings. To reword a letter, change the document it came from (a Word file, say) and make the PDF again.</li>
          <li><strong>No PDF to Word yet,</strong> and it can&rsquo;t read the words in a scan (a picture of a page). Copy the words works on PDFs made from typed documents.</li>
          <li><strong>A signature is a picture of your signature,</strong> not a certified digital signature. That&rsquo;s accepted for most everyday forms, but some documents, such as a will, must be signed on paper. If in doubt, ask whoever sent you the form.</li>
          <li><strong>Taking a password off needs the password.</strong> If it&rsquo;s been forgotten, Techies PDF can&rsquo;t open the PDF, and nor can we.</li>
          <li><strong>Shrinking works on pictures.</strong> PDFs of photos and scans come down a lot; a PDF that&rsquo;s mostly words is usually small already.</li>
          <li><strong>iPhone photos (HEIC) need turning into JPG</strong> before they can go into a PDF (<a href="/heic-photos-wont-open-on-windows/">how to open HEIC photos on Windows</a>).</li>
          <li><strong>Windows 10 and 11 PCs only (64-bit).</strong> No Mac, iPhone, iPad or Android version. Its window is a Microsoft Edge window, which comes with Windows.</li>
        </ul>
      </div>
    </section>"""


def growing():
    return f"""    <section class="section tpp" id="whats-new" aria-labelledby="tpp-new">
      <div class="wrap tpp-wrap">
        <div class="tpp-two">
          <div>
            <p class="eyebrow mono">// IT KEEPS GETTING BETTER</p>
            <h2 id="tpp-new">Built by us, improved on request</h2>
            <p style="line-height:1.6">Techies PDF is made and looked after by 365 Techies in Dorset, and it grows with what people ask for, as our other programs have. Want it to do something it doesn&rsquo;t? Ring 01202 775566 or <a href="/contact/">send us a message</a>. New versions are put on this page.</p>
          </div>
          <div class="tpp-card">
            <h3>What&rsquo;s in it</h3>
            <p style="margin:0 0 .4rem"><strong>Version {REL['ver']}.</strong> {REL['notes'].replace("'", "&rsquo;")}</p>
            <p style="margin:0;color:var(--muted);font-size:.95rem">Things we&rsquo;d like to add (no dates yet): PDF to Word, and reading the words in scans.</p>
          </div>
        </div>
      </div>
    </section>"""


WHO = """    <section class="section section--alt tpp" aria-labelledby="tpp-who">
      <div class="wrap tpp-wrap">
        <p class="eyebrow mono">// WHO MAKES IT</p>
        <h2 id="tpp-who">Who makes Techies PDF?</h2>
        <p style="max-width:52rem;line-height:1.6">365 Techies Ltd, a family-run IT support firm looking after homes and small businesses in Bournemouth, Christchurch and Poole since 1995. We also make <a href="/free-pc-health-check/">365 PC Manager</a>, a free health check for Windows PCs, and <a href="/techies-one-mail/">Techies One</a>, a free program for email, photos, letters and sums. Techies PDF shows PDFs with Mozilla&rsquo;s open-source PDF.js, the same engine Firefox uses. Ring 01202 775566, Monday to Friday, 9am to 5pm, or read <a href="/about/">more about us</a>.</p>
      </div>
    </section>"""

FAQS = [
    ("Is Techies PDF really free?",
     "Yes. The program costs nothing: no trial, no adverts, no watermark on what you save, no daily limit and no account to make with us. If you&rsquo;d like us to set it up or sort out a problem, that&rsquo;s a paid job (remote jobs from &pound;20), and we agree the price with you before we start."),
    ("Is there a free PDF editor for Windows?",
     "Yes: Techies PDF, free for Windows 10 and 11. It fills in and signs forms, adds text, highlights and drawings, joins PDFs, turns, moves and takes out pages, shrinks PDFs for email, turns photos into a PDF, copies the words out and puts on or takes off a password. It can&rsquo;t change the words already in a PDF: it adds things on top."),
    ("How do I sign a PDF on Windows?",
     "Open the PDF in Techies PDF, press <strong>Add or edit signatures</strong> at the top right, and type your name in a handwriting style, draw it, or use a photo of your signature. Place it on the line, resize it if you need to, and press <strong>Save</strong>. It&rsquo;s a picture of your signature, which is accepted for most everyday forms; some documents, like a will, must be signed on paper."),
    ("How do I fill in a PDF form?",
     "Open it in Techies PDF and click in its boxes to type, and tick its tick boxes. Then press <strong>Save</strong>. If the form has no boxes (a scan, for example), press <strong>Text</strong> and click where the words should go."),
    ("How do I combine PDF files into one?",
     "Choose <strong>Join PDFs together</strong>, pick the PDFs (or drop them onto the window), put them in order with the arrows and press <strong>Join them into one PDF</strong>. You choose where the new PDF is saved, and the ones you started with aren&rsquo;t changed."),
    ("How do I make a PDF smaller to email?",
     "Choose <strong>Make a PDF smaller for email</strong>, pick the PDF and press <strong>Make it smaller</strong>. Start with <strong>Good for email</strong>; if it&rsquo;s still too big, try <strong>Smaller</strong> or <strong>Smallest</strong>. It works by making the pictures in the PDF smaller, so PDFs of photos and scans come down the most."),
    ("How do I rotate a page in a PDF and save it?",
     "Choose <strong>Turn, move or take out pages</strong>, pick the PDF, press the round arrow under the page until it&rsquo;s the right way up, then press <strong>Save the PDF</strong>."),
    ("How do I turn photos into a PDF?",
     "Choose <strong>Turn photos into a PDF</strong>, pick the photos, put them in order and press <strong>Make the PDF</strong>. Each photo goes on its own page, the right way up, on A4 or at the photo&rsquo;s own size. iPhone (HEIC) photos need turning into JPG first."),
    ("How do I remove a password from a PDF?",
     "If you know the password: choose <strong>Put a password on or take one off</strong>, pick the PDF, type its password and press <strong>Take the password off</strong>. A copy is saved that opens without asking. Techies PDF can&rsquo;t remove a password you don&rsquo;t know, and no honest program can."),
    ("Can I edit the text in a PDF?",
     "Not the words that are already there: Techies PDF adds text, signatures, highlights and drawings on top, and fills in forms. To change the wording, edit the document the PDF was made from and save it as a PDF again (Techies One&rsquo;s Letters can save letters as PDFs)."),
    ("Do I need Adobe Acrobat to fill in or sign a PDF?",
     "No. Techies PDF fills in and signs PDFs for free, and joins, shrinks and rearranges them too. You&rsquo;d only need a paid PDF program for things Techies PDF doesn&rsquo;t do yet, such as changing a PDF&rsquo;s own words or turning a scan into words you can copy."),
    ("Does Techies PDF upload my documents?",
     "No. Everything happens on your own PC. Your PDFs aren&rsquo;t sent to 365 Techies or anyone else, and the program doesn&rsquo;t check in with us at all."),
    ("Does it work on a Mac, iPad or phone?",
     "No, it&rsquo;s for Windows 10 and 11 (64-bit) PCs only."),
]

TRADEMARK = """    <section class="section tpp" aria-label="Trademarks">
      <div class="wrap"><p class="tpp-tm">Microsoft, Windows, Microsoft Edge and Word are trademarks of the Microsoft group of companies. Adobe and Acrobat are trademarks of Adobe. iPhone, iPad and Mac are trademarks of Apple Inc. Android is a trademark of Google LLC. Mozilla and Firefox are trademarks of the Mozilla Foundation. Other names belong to their owners. Techies PDF is made by 365 Techies Ltd and is not made, endorsed or supported by any company named here.</p></div>
    </section>"""

TITLE = "Techies PDF | Free PDF Editor for Windows, Nothing Uploaded"
DESC = ("Free PDF editor for Windows 10 and 11: fill in and sign forms, combine and compress PDFs, rotate pages and turn "
        "photos into a PDF. Nothing is uploaded.")


def build():
    content = "\n".join([
        hero(), PROOF, download(), overview(), jobs(), PRIVATE, SAFETY, LIMITS, growing(), WHO, bp.faq_html(FAQS),
        bp.cta("Rather we set it up for you?", "We can install Techies PDF and show you round, over the phone or on a visit. It&rsquo;s a paid job, from &pound;20 remotely, and we agree the price before we start.",
               primary=("Call 01202 775566", "tel:+441202775566"), secondary=("Send us a message", "/contact/")),
        TRADEMARK,
    ])

    def schema(s, _d=DESC):
        app = {
            "@type": "SoftwareApplication", "@id": f"{bp.SITE}/{s}/#app", "name": NAME,
            "operatingSystem": "Windows 10 (64-bit), Windows 11", "applicationCategory": "UtilitiesApplication",
            "description": ("A free PDF program for Windows 10 and 11 PCs, made by 365 Techies: read, fill in and sign PDF forms, "
                            "add text, highlights and drawings, join PDFs, turn, move and take out pages, save some pages as a new "
                            "PDF, make a PDF smaller for email, turn photos into a PDF, copy the words out, and put a password on "
                            "or take one off (with the password). Everything happens on the PC; nothing is uploaded."),
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP", "availability": "https://schema.org/InStock"},
            "isAccessibleForFree": True, "inLanguage": "en-GB",
            "downloadUrl": REL["url"], "softwareVersion": REL["ver"], "fileSize": MB.replace(" ", ""),
            "featureList": ["Fill in PDF forms and sign them (typed, drawn or a photo of your signature)",
                            "Add text, highlights and drawings to any PDF", "Join PDFs into one",
                            "Turn, move and take out pages", "Save some pages as a new PDF, or one PDF per page",
                            "Make a PDF smaller for email", "Turn photos into a PDF (A4 or photo size)",
                            "Copy the words out of a PDF", "Put a password on a PDF (AES-256), or take one off with the password",
                            "Works on the PC: nothing uploaded, no account, no adverts, no watermark"],
            "screenshot": [f"{bp.SITE}/images/tpdf-{n}-{TAG}-1440.webp" for n in ["sign", "home"] + [f[0] for f in FEATS[1:]]],
            "publisher": {"@id": bp.SITE + "/#business"}, "provider": {"@id": bp.SITE + "/#business"},
            "datePublished": "2026-10-18", "url": f"{bp.SITE}/{s}/",
        }
        return bp.graph([bp.crumb_sub(s, "Free Tools", "free-tools", NAME),
                         bp.webpage(s, NAME, _d, image=bp.SITE + OG), app,
                         bp.howto_node(s, "How to install Techies PDF", [(n, re.sub(r"<[^>]+>", "", t)) for n, t in STEPS]),
                         bp.faqpage(s, FAQS)])

    bp.add(slug=SLUG, title=TITLE, desc=DESC,
           og_title="Techies PDF: the free PDF editor for Windows that keeps your files on your PC", schema=schema,
           content=content, og_image=bp.SITE + OG)


build()
