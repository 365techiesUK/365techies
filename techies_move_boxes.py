"""Techies Move on the existing new-computer and backup pages (22 Oct 2026, with its launch: owner "link it all in").

A page filter (like techies_one_boxes): one box on the guide that answers the job itself, and a one-line mention on the
pages where it's an honest do-it-yourself option. Both go just before the page's FAQ section. Every line says only what
Techies Move 0.2.0 really does (techies_move_page.py docstring); the paid pages keep their own offer first.
"""
import re

import build_pages as bp
import techies_move_page as tmp

# the guide whose "No cloud? Use a drive" section is exactly what the program does
BOX = {"how-to-transfer-files-to-a-new-computer"}

# one honest line each; [square brackets] become the link to /techies-move/
MENTIONS = {
    "transfer-photos-to-a-new-computer-bournemouth":
        "Rather do it yourself? Our free [Techies Move] for Windows 10 and 11 copies your photos, documents, favourites and Outlook files across on a USB stick, and tells you what size of stick to buy. If it gets tricky, ring us and we&rsquo;ll take over.",
    "new-computer-setup":
        "Moving your own files across? Our free [Techies Move] copies your photos, documents, favourites and Outlook files from the old PC on a USB stick and puts them in the right places on the new one, ready for us to set up the rest.",
    "file-transfer":
        "On Windows 10 or 11 and happy to do it yourself? Our free [Techies Move] copies your folders, favourites and Outlook files to a new PC on a USB stick, and never deletes or overwrites anything.",
    "backup-support":
        "Want a simple backup on a USB stick at home? Our free [Techies Move] can keep a stick as your backup: it adds new and changed files when you press Back up now, keeps the earlier copies, and reminds you every week.",
}

STYLE = """        <style>
          .tmvbox{border:1px solid rgba(92,211,201,.3);border-radius:16px;background:rgba(92,211,201,.06);padding:clamp(1.1rem,3vw,1.8rem);display:grid;gap:.8rem}
          .tmvbox h2{margin:0}
          .tmvbox p{margin:0;line-height:1.6}
          .tmvbox ul{margin:0;padding-left:1.2rem;display:grid;gap:.35rem}
          .tmvbox .tmvbox__cta{display:flex;flex-wrap:wrap;gap:.6rem}
          .tmvbox .tmvbox__cta .button{flex:1 1 15rem;text-align:center}
          .tmvbox .tmvbox__small{font-size:.78rem;letter-spacing:.04em;color:var(--muted)}
          .tmvbox a:not([class]){color:var(--cyan);text-decoration:underline;text-underline-offset:2px}
          .tmvbox figure{margin:0;border-radius:12px;overflow:hidden;border:1px solid rgba(92,211,201,.3)}
          .tmvbox figure img{display:block;width:100%;height:auto}
        </style>
"""


def box():
    rel = tmp.REL
    return f"""    <section class="section tmvmove" aria-label="Techies Move" id="techies-move">
      <div class="wrap" style="max-width:880px">
{STYLE}        <div class="tmvbox">
          <p class="eyebrow mono">// OR LET OUR FREE PROGRAM DO IT</p>
          <h2>Move everything with Techies Move, free</h2>
          <p>Doing the drive route by hand means remembering every folder, your favourites and your email files. Our free program for Windows 10 and 11 does it for you, through a USB stick:</p>
          <figure>{tmp.shot("pack", "Techies Move on the old computer: This needs 267 MB, so a 16 GB USB stick or bigger is enough, the drive marked Room for all of it, and the six folders ticked (a made-up person&rsquo;s files)")}</figure>
          <ul>
            <li>Copies <strong>Desktop, Documents, Pictures, Videos, Music and Downloads</strong>, any folder you add, your <strong>favourites</strong> from Edge, Chrome and Firefox, and your <strong>Outlook files and signatures</strong>.</li>
            <li>Tells you <strong>what size of USB stick</strong> you need before you buy one.</li>
            <li>Lists the <strong>passwords you&rsquo;ll need</strong>, so you can check them while the old PC still works (it never copies passwords).</li>
            <li>Puts everything in the right places on the new PC, <strong>never deletes or writes over</strong> anything, then can keep the stick as your backup.</li>
          </ul>
          <p class="tmvbox__cta"><a class="button primary button--lg" href="{rel['path']}">Download Techies Move, free</a><a class="button secondary button--lg" href="/techies-move/">See how it works, with pictures</a></p>
          <p class="tmvbox__small mono">FOR WINDOWS 10 AND 11 PCs<span class="tmv-v"> &middot; VERSION {rel['ver']} &middot; {tmp.MB}</span> &middot; SIGNED BY 365 TECHIES LTD &middot; NOT FOR MAC</p>
        </div>
      </div>
    </section>
"""


def mention(slug):
    s = MENTIONS[slug].replace("[", '<a href="/techies-move/" style="color:var(--cyan);text-decoration:underline;'
                                    'text-underline-offset:2px">', 1).replace("]", "</a>", 1)
    return f"""    <section class="section tmvmention" aria-label="Do it yourself: Techies Move">
      <div class="wrap" style="max-width:880px">
        <p style="margin:0;padding:.9rem 1.1rem;border-left:3px solid #5cd3c9;background:rgba(92,211,201,.06);border-radius:0 10px 10px 0;line-height:1.6">{s}</p>
      </div>
    </section>
"""


def insert(slug, html):
    """The page filter: the box or the line just before the FAQ section; every other page untouched."""
    if slug not in BOX and slug not in MENTIONS:
        return html
    if 'id="techies-move"' in html or 'class="section tmvmention"' in html:
        return html
    j = html.find('<section class="faq-section')
    if j < 0:
        raise SystemExit("techies_move_boxes: no FAQ section on /%s/ - nowhere to put Techies Move" % slug)
    add = box() if slug in BOX else mention(slug)
    return html[:j] + add + "    " + html[j:]


bp.PAGE_FILTERS.append(insert)
