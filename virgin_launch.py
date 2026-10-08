# -*- coding: utf-8 -*-
"""The free Virgin email tools in 365 PC Manager v30 (launch branch virgin-launch, 29 Sep 2026).

Owner, 29 Sep 2026: the Virgin Media / blueyonder / ntlworld / virgin.net mailbox check and move are FREE for everyone
in 365 PC Manager, no sign-up, during the Junara switch; "Stuck? We'll do it for you" stays at GBP 60 per email address,
which includes a full service of the PC with a written report (the owner's price - never any other figure).

This module holds the pieces the Virgin pages share, so the price, the promises and the download link can never drift
apart between them:
  virgin_choices()        the two choices side by side: do it yourself free with the app / let us do it for GBP 60
  virgin_tool_page()      /virgin-email-mover/, the free tool's own page
  guide_task_head()       the short task header for the two new help guides (their data: virgin_guides_data.py)
build_extra.py imports it and passes PCM_SETUP_V30 in: ONE download link for every Virgin page, switched on launch day.

What the tools do is written from 365 Mail Mover's own README (tools/mail-mover, v2.2) and the lead's v30 brief: the
Virgin sign-in happens in a separate Chrome or Edge window with the mailbox's normal password; the mail is copied to the
PC first, then into Gmail over IMAP with a Google app password at up to 450 MB a day (Gmail takes about 500 MB a day
this way); labels under "Virgin Media", dates and read state kept, Spam and Trash left out, nothing on Virgin changed;
a folder-by-folder count check at the end. Google facts: support.google.com/accounts/answer/185833 and 185839, read
29 Sep 2026. Virgin/Junara facts: the pages that already carry them (read 25-26 Sep 2026) and the Virgin help page
re-read 29 Sep 2026.
"""
import build_pages as bp
from hub_ui import _dh_ico

VIRGIN_TOOL_SLUG = "virgin-email-mover"
GAPP_SLUG = "how-to-make-a-google-app-password"
ADDR_SLUG = "change-your-email-address-everywhere"
JUNARA = "/virgin-media-email-moving-to-junara/"
GMAIL_PAGE = "/move-virgin-media-email-to-gmail/"
# The 365 Email Mover browser add-on (Chrome Web Store item gfhaolhbpbjdfjgacpehimkjjnhcipjd, submitted 2 Oct 2026): it
# copies the mailbox in the customer's OWN browser, where they are already signed in, for when Virgin refuses the sign-in in
# the window the app opens ("can't sign you in just now", IDF-12B). 365 PC Manager then moves that copy into Gmail
# (Mail Mover v2.4 reads it from Downloads). EMPTY until Google approves the item - its store page is a dead end before
# that. Once approved, set it to "https://chromewebstore.google.com/detail/gfhaolhbpbjdfjgacpehimkjjnhcipjd" and rebuild
# (the same day: api/pcm.php PCM_MM_ADDON_URL, which switches on the app's own "Add to Chrome" button). It then shows in
# the free card on every Virgin page and as its own section on the tool page.
EMAIL_MOVER_ADDON_URL = "https://chromewebstore.google.com/detail/gfhaolhbpbjdfjgacpehimkjjnhcipjd"   # approved and published (Unlisted) 5 Oct 2026; owner: "switch both on now"

# the owner's GBP 60 move: what they get (the same promises the pages made before the free app, plus the PC service)
VM_US_TICKS = ("Every message and folder into Gmail, with the original dates",
               "Works even if Virgin won&rsquo;t give you an app password",
               "A full service of your PC, with a written health report",
               "Forwarding set up, and checked on your phone if you like",
               "Done remotely: we phone first, and you watch us start")
VM_US_SMALL = "For Windows PCs &middot; agreed before we start &middot; no fix, no fee &middot; we can usually start the same day, Mon&ndash;Fri 9&ndash;5"
# 1 Oct 2026: the card's ring-me-back form (js/forms.js posts it to the Slack lead relay; GA4 virgin_move_request)
VM_FORM_OK = "&#10003; Got it, thank you. We&rsquo;ll ring you, Mon&ndash;Fri 9&ndash;5. Nothing is booked until we&rsquo;ve spoken."

_VMC_CSS = """
.vmc{padding:1.3rem var(--pad-x) 2.4rem}
.vmc__in{max-width:1180px;margin:0 auto}
.vmc__grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:1.1rem;align-items:stretch}
.vmc__card{display:flex;flex-direction:column;padding:1.35rem 1.4rem 1.3rem;border-radius:24px;border:1px solid var(--hp-edge);background:radial-gradient(110% 80% at 100% 0%,color-mix(in srgb,var(--c1) 16%,transparent),transparent 62%),var(--hp-card)}
.vmc__card--lead{border-color:color-mix(in srgb,var(--c1) 58%,transparent);box-shadow:0 34px 70px -40px color-mix(in srgb,var(--c1) 85%,transparent)}
.vmc__tag{display:flex;align-items:center;gap:.6rem;margin:0 0 .6rem;font-family:var(--font-mono);font-size:.72rem;letter-spacing:.08em;line-height:1.35;color:color-mix(in srgb,var(--c2) 85%,#fff)}
.vmc__h{font-family:var(--font-display);font-weight:600;font-size:clamp(1.3rem,2.3vw,1.72rem);line-height:1.16;margin:0 0 .45rem;color:var(--hp-ink);text-wrap:balance}
.vmc__h b{color:#fff;font-weight:700}
.vmc__d{margin:0;color:var(--hp-body);font-size:1rem;line-height:1.5}
.vmc__cta{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem 1.1rem;margin:1rem 0 .6rem}
.vmc__cta .button{margin:0}
.vmc__note{margin:0;font-size:.88rem;line-height:1.5;color:var(--hp-soft)}
.vmc__note a,.vmc__list a,.vmc__also a{color:var(--cyan-soft)}
.vmc__list{list-style:none;margin:1rem 0 0;padding:1rem 0 0;border-top:1px solid var(--hp-edge);display:grid;gap:.6rem}
.vmc__list li{position:relative;padding-left:1.6rem;font-size:.94rem;line-height:1.45;color:var(--hp-body)}
.vmc__list li::before{content:"\\2713";position:absolute;left:0;top:0;color:#39d353;font-weight:700}
.vmc__list b{color:var(--hp-ink)}
.vmc__small{margin:.9rem 0 0;font-size:.8rem;line-height:1.5;color:var(--hp-soft)}
.vmc__more{margin:auto 0 0;padding-top:1rem}
.vmc__also{margin:1.1rem 0 0;font-size:.94rem;line-height:1.7;color:var(--hp-soft)}
@media (max-width:860px){.vmc__grid{grid-template-columns:1fr}}
.vmc__shots{margin:1.4rem 0 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.1rem}
.vmc__shots figure,.vms__grid figure{margin:0}
.vmc__shots img,.vms__grid img{display:block;width:100%;height:auto;border-radius:16px}
.vmc__shots figcaption,.vms__grid figcaption{margin:.45rem .3rem 0;font-size:.9rem;line-height:1.45;color:var(--hp-soft)}
.vmc__shots figcaption b,.vms__grid figcaption b{color:var(--hp-ink)}
.vmc__shotnote{margin:.8rem 0 0;font-size:.85rem;line-height:1.5;color:var(--hp-soft)}
@media (max-width:600px){.vmc__shots{grid-template-columns:1fr}.vmc__shots figure+figure{display:none}}
.vmc__dl-s{display:none}
.vmc__form{position:relative;margin:.35rem 0 0;padding:.95rem 1rem 1rem;border-radius:18px;border:1px solid var(--hp-edge);background:color-mix(in srgb,var(--hp-card) 70%,#000)}
.vmc__formh{margin:0 0 .7rem;font-weight:600;font-size:1rem;line-height:1.35;color:var(--hp-ink)}
.vmc__fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem .8rem}
.vmc__fields .field{margin:0;gap:.3rem}
.vmc__fields .field>span{margin:0;font-size:.86rem}
.vmc__fields .field input,.vmc__fields .field select{padding:.7rem .85rem;min-height:46px}
.vmc__send{width:100%;margin:.85rem 0 0;justify-content:center}
.vmc__status{margin:.6rem 0 0;font-size:.9rem;line-height:1.45}
.vmc__status:empty{display:none}
.vmc__formnote{margin:.55rem 0 0;font-size:.8rem;line-height:1.45;color:var(--hp-soft)}
@media (max-width:420px){.vmc__fields .vmc__wide{grid-column:1/-1}}
@media (max-width:600px){.vmc{padding-top:.8rem}.vmc__card{padding:1rem 1rem 1.05rem;border-radius:20px}.vmc__tag{display:none}.vmc__cta{margin:.8rem 0 .5rem}.vmc__cta .button{flex:1 1 100%;text-align:center;justify-content:center}.vmc__dl-l{display:none}.vmc__dl-s{display:inline}}
@media (max-width:600px){.taskhead__trust span:nth-child(n+3){display:none}.taskhead__lede{margin-bottom:.55rem}}
.vmc__d--after{margin:0 0 .75rem}
@media (max-width:600px){.taskhead .taskhead__trust{column-gap:.8rem;letter-spacing:0}}
"""

_VMC_JS = """    <script>
    (function(){ var a=document.querySelectorAll('[data-vmc-dl]'); for(var i=0;i<a.length;i++) a[i].addEventListener('click',function(){
      try{ if(typeof window.gtag==='function') window.gtag('event','pcm_download_click',{page:location.pathname,place:'virgin_tools'}); }catch(e){} }); })();
    </script>"""


# Screens from 365 PC Manager v36 (8 Oct 2026, the signed release - its new menu shows the tool under Internet & email; v35's
# set 6 Oct, v30's 29 Sep): real renders of the app's own Virgin page with its made-up sample mailbox
# (yourname@virginmedia.com - never a customer's), in the laptop frame. Each has a 1200-wide and a 2080-wide file.
# Made by frame36.py (session 8682606b scratchpad art36; v35's by frame_v35.py, v30's by pcm/frame_v30_virgin.py); the share card by pcm/og_virgin_v30.py.
VIRGIN_SHOTS = {
    "check": ("Check my Virgin email", "How many emails, how big, and how many days the move will take. It only reads.",
              "365 PC Manager&rsquo;s Virgin email check: 37,150 emails, 2.6 GB, about 6 days to move into Gmail (a sample mailbox)"),
    "move": ("Move it to Gmail myself", "It carries on by itself, about 500&nbsp;MB a day. Switch the PC off and it carries on when it&rsquo;s back on.",
             "365 PC Manager putting Virgin email into Gmail: 8,400 of 37,150 emails in Gmail, with a Pause button (a sample mailbox)"),
    "done": ("When it has finished", "Every folder counted in Gmail against Virgin, so you can see it all arrived.",
             "365 PC Manager when the move has finished: every folder arrived in Gmail, counted folder by folder (a sample mailbox)"),
    "where": ("Where your address is used", "The companies that email you, to tick off as you change your address with each one.",
              "365 PC Manager&rsquo;s list of where your Virgin address is used: banks and other companies, with how many emails each sent (a sample mailbox)"),
    # 7 Oct 2026 (the /virgin-email-mover/ redo): the add-on route's two app screens (make_pics.py, same frame)
    "found": ("It finds your copy", "The add-on's copy is in Downloads, so Check my Virgin email reads it: no Virgin sign-in.",
              "365 PC Manager&rsquo;s Virgin email page: your Virgin email is already copied to this PC, with a Check my Virgin email button (a sample mailbox)"),
    "gmail": ("Make a Google app password, and start", "The app's button opens Google's page; type in your Gmail and the 16 letters.",
              "365 PC Manager&rsquo;s Gmail step: how to make a Google app password, then boxes for your Gmail address and the app password"),
}
VIRGIN_OG = "/images/pcm-virgin-og-v30.jpg"


def virgin_shot(key, sizes):
    t, x, alt = VIRGIN_SHOTS[key]
    return (f'<img src="/images/pcm-virgin-{key}-v36-1200.webp" srcset="/images/pcm-virgin-{key}-v36-1200.webp 1200w, '
            f'/images/pcm-virgin-{key}-v36.webp 2080w" sizes="{sizes}" width="1200" height="935" alt="{alt}" loading="lazy" decoding="async">')


def _vmc_stuck():
    """The free card's last line: what to do when Virgin won't let them sign in (the add-on first, once it is live)."""
    if EMAIL_MOVER_ADDON_URL:
        return ('If Virgin won&rsquo;t let you sign in, <a href="' + EMAIL_MOVER_ADDON_URL + '" target="_blank" rel="noopener">copy your email from the Chrome you already use</a> '
                'with our free 365 Email Mover add-on, or press &lsquo;Stuck? We&rsquo;ll do it for you&rsquo; and we&rsquo;ll move it for you.')
    return ('If Virgin won&rsquo;t let you sign in, press &lsquo;Stuck? We&rsquo;ll do it for you&rsquo; in the app or <a href="tel:+441202775566">ring us</a>, '
            'and we&rsquo;ll move it for you.')


def virgin_choices(setup_url, also_html="", how_href="/" + VIRGIN_TOOL_SLUG + "/", how_label="How it works, and what you need",
                   heading_level=2, shots=True, paid_first=False):
    """The two choices side by side (one above the other on a phone, the free one first). The GBP 60 card keeps the
    id move-for-me that the pages' own links point at; the free card is #do-it-free. shots: two app screens under them
    (the check and the move; one on a phone) - the tool page shows all four in its own section instead.
    paid_first (1 Oct 2026, the funnel read's one change for October, owner "do it now"): the GBP 60 move leads - first
    card, the glow, Text as the first button (texts are the biggest enquiry channel) and "Windows PCs only" in its
    opening line (one of three email-move enquiries was turned away as iPad/iPhone only). The free app card follows,
    its download a secondary button. The two Virgin search pages use it; the app's own page keeps the free card first."""
    h = "h%d" % heading_level
    ticks = "\n".join("            <li>%s</li>" % t for t in VM_US_TICKS)
    also = ('\n    <p class="vmc__also">' + also_html + '</p>') if also_html else ""
    if shots:
        figs = "\n".join(f'        <figure>{virgin_shot(k, "(max-width:600px) 100vw, (max-width:1240px) 48vw, 580px")}'
                         f'<figcaption><b>{VIRGIN_SHOTS[k][0]}</b> &middot; {VIRGIN_SHOTS[k][1]}</figcaption></figure>'
                         for k in ("check", "move"))
        also += (f'\n      <div class="vmc__shots" aria-label="What the free app looks like">\n{figs}\n      </div>'
                 f'\n      <p class="vmc__shotnote">Real screens from 365 PC Manager, with a made-up sample mailbox. '
                 f'<a href="/{VIRGIN_TOOL_SLUG}/#screens">See every screen &#8594;</a></p>')
    diy_lead = "" if paid_first else " vmc__card--lead"
    dl_btn = "secondary" if paid_first else "primary"
    diy_or = "Or do" if paid_first else "Do"
    if paid_first:
        # 6 Oct 2026 (owner: "trim it so the text button is on the first screen"): only the one condition sits between the
        # price and the buttons; the description follows them. Six phone lines above the buttons became one.
        paid_d = "<b>For Windows PCs only.</b>"
        paid_after = ("\n          <p class=\"vmc__d vmc__d--after\">We move every folder into Gmail for you, remotely. No app "
                      "passwords, no settings, nothing to learn, and the price includes a full service of your PC with a written report.</p>")
        paid_cta = ('<a class="button primary button--lg" href="sms:+447520615332">Text 07520 615332</a>'
                    '<a class="button secondary button--lg" href="tel:+441202775566">Call 01202 775566</a>')
    else:
        paid_d = ("No app passwords, no settings, nothing to learn. We move every folder into Gmail for you, remotely, and the "
                  "price includes a full service of your PC with a written report.")
        paid_after = ""
        paid_cta = ('<a class="button secondary button--lg" href="tel:+441202775566">Call 01202 775566</a>'
                    '<a class="dh-link" href="sms:+447520615332">Or text 07520 615332</a>')
    diy = f'''        <div class="vmc__card vmc__card--diy{diy_lead} hp-c-fix" id="do-it-free">
          <p class="vmc__tag"><span class="hp-ico hp-ico--sm">{_dh_ico("monitor")}</span>FREE &middot; NO SIGN-UP &middot; FOR WINDOWS PCs</p>
          <{h} class="vmc__h">{diy_or} it yourself, free, with 365&nbsp;PC&nbsp;Manager</{h}>
          <p class="vmc__d">Our free app moves your Virgin email into Gmail for you, no Virgin app password needed.</p>
          <p class="vmc__cta"><a class="button {dl_btn} button--lg" href="{setup_url}" download data-vmc-dl><span class="vmc__dl-l">Download free for Windows</span><span class="vmc__dl-s">Download free</span> &#8595;</a></p>
          <p class="vmc__note">For Windows PCs. You&rsquo;ll need a Gmail account and a <a href="/{GAPP_SLUG}/">Google app password</a>. Not for Macs. {_vmc_stuck()}</p>
          <ul class="vmc__list">
            <li><b>Check my Virgin email:</b> every folder, how many emails, how big, and how many days the move will take. It only reads.</li>
            <li><b>Move it to Gmail myself:</b> folders and dates kept. Gmail takes about 500&nbsp;MB a day, so a big mailbox takes a few days &mdash; it carries on by itself.</li>
            <li><b>Where your address is used:</b> the companies that email you, so you can change your address with each one.</li>
            <li><b>Stuck? We&rsquo;ll do it for you:</b> one tap asks us to ring you back.</li>
          </ul>
          <p class="vmc__more"><a class="dh-link" href="{how_href}">{how_label} &#8594;</a></p>
        </div>'''
    paid = f'''        <div class="vmc__card{" vmc__card--lead" if paid_first else ""} hp-c-care" id="move-for-me">
          <p class="vmc__tag"><span class="hp-ico hp-ico--sm">{_dh_ico("phone")}</span>DONE FOR YOU &middot; AGREED BEFORE WE START</p>
          <{h} class="vmc__h">Let us do it: <b>&pound;60</b> per email address</{h}>
          <p class="vmc__d">{paid_d}</p>
          <p class="vmc__cta">{paid_cta}</p>{paid_after}
          <form class="contact-form vmc__form" method="post" action="/api/form-relay.php" data-ga-event="virgin_move_request" data-success="{VM_FORM_OK}">
            <p class="vmc__formh">Or leave your number and we&rsquo;ll ring you</p>
            <input type="hidden" name="topic" value="Virgin email move (&pound;60 per address)" />
            <input type="text" name="company_website" tabindex="-1" autocomplete="one-time-code" style="position:absolute;left:-5000px" aria-hidden="true" />
            <div class="vmc__fields">
              <label class="field vmc__wide"><span>Your name</span><input type="text" name="name" id="vmc-name" autocomplete="name" required /></label>
              <label class="field vmc__wide"><span>Phone number</span><input type="tel" name="phone" id="vmc-phone" autocomplete="tel" inputmode="tel" required /></label>
              <label class="field"><span>Email addresses</span><select name="virgin_addresses" id="vmc-count"><option>1</option><option>2</option><option>3 or more</option></select></label>
              <label class="field"><span>Best time</span><select name="best_time" id="vmc-when"><option>Any time</option><option>Morning</option><option>Afternoon</option></select></label>
            </div>
            <button type="submit" class="button primary vmc__send">Ring me back</button>
            <p class="form-status vmc__status" role="status"></p>
            <p class="vmc__formnote">Nothing is booked and nothing to pay until we&rsquo;ve spoken. We only use your number to ring you about this.</p>
          </form>
          <ul class="vmc__list">
{ticks}
          </ul>
          <p class="vmc__small">{VM_US_SMALL}</p>
        </div>'''
    cards = (paid + "\n" + diy) if paid_first else (diy + "\n" + paid)
    return f'''    <section class="dh vmc" id="choose" aria-label="Two ways to move your Virgin email">
    <div class="vmc__in">
      <div class="vmc__grid">
{cards}
      </div>{also}
    </div>
    <style>{" ".join(l.strip() for l in _VMC_CSS.strip().splitlines())}</style>
{_VMC_JS}
    </section>'''


TASK_TRUST = ['<a href="/reviews/">&#9733; 4.9 on Google</a>', "Family-run since 1995", "Real people on 01202 775566"]
# a phone shows the first two only, on one line, so the choice below starts higher
TASK_PHONE_CSS = "<style>@media (max-width:600px){.taskhead__trust span:nth-child(n+3){display:none}.taskhead__lede{margin-bottom:.55rem}}</style>"

# ============================================================ Junara: what it costs (coordinator's SEO brief, 29 Sep 2026)
# Searchers ask "how much does Junara email cost" far more than anything else (Search Console, 24 h to 29 Sep 2026).
# Junara publishes NO Virgin price. The only Junara price made public is the Isle of Man one: when Manx Telecom handed
# manx.net email to Junara (Oct 2025) it cost GBP 6.50 a month or GBP 65 a year per mailbox, discounted from GBP 7.50 /
# GBP 79 - both sources below read 29 Sep 2026 and both give those figures. Always attributed, never stated as Virgin's
# price. SHOW_MANX_PRECEDENT = False takes every mention off the Junara page (cost section, facts table, FAQ) at once.
SHOW_MANX_PRECEDENT = True
_EXT = 'rel="noopener" target="_blank"'
MANX_SOURCES = ('<a href="https://www.ispreview.co.uk/index.php/2025/10/manx-telecom-scraps-free-email-and-migrates-users-to-paid-platform.html" ' + _EXT + '>ISPreview, 22 October 2025</a>'
                ' and <a href="https://www.manxradio.com/news/isle-of-man-news/manxnet-emails-will-no-longer-be-free/" ' + _EXT + '>Manx Radio, 21 October 2025</a>')
MANX_COST_HTML = ('<div style="margin:1.1rem 0;padding:1rem 1.15rem;border-radius:14px;border:1px solid rgba(125,170,220,.28);background:rgba(255,255,255,.03)">'
                  '<p style="margin:0 0 .55rem"><strong>The only Junara price made public so far</strong> is from the Isle of Man. When Manx Telecom moved its '
                  'manx.net email to Junara in late 2025, keeping an address cost <strong>&pound;6.50 a month or &pound;65 a year per mailbox</strong> &mdash; '
                  'a discounted price, normally &pound;7.50 a month or &pound;79 a year. Virgin&rsquo;s price may be different: check it in the sign-up before '
                  'you pay.</p>'
                  '<p style="margin:0 0 .55rem"><strong>What that could mean for a household</strong>, if Virgin&rsquo;s price turned out the same: two '
                  'mailboxes at &pound;65 a year is &pound;130 a year, every year, once any free period ends.</p>'
                  '<p style="margin:0;font-size:.85rem;color:var(--muted)">Manx prices from ' + MANX_SOURCES + '.</p></div>') if SHOW_MANX_PRECEDENT else ''
MANX_FAQ_TAIL = (' Junara hasn&rsquo;t published a Virgin price. The only Junara price made public so far is from the Isle of Man, where '
                 'manx.net addresses moved to Junara in late 2025 at &pound;6.50 a month or &pound;65 a year per mailbox (discounted from '
                 '&pound;7.50 and &pound;79). Virgin&rsquo;s may differ.') if SHOW_MANX_PRECEDENT else ''
MANX_WHO_TAIL = (' It also took over the manx.net email addresses from Manx Telecom in the Isle of Man in 2025.'
                 if SHOW_MANX_PRECEDENT else '')

_SRC_VMO2 = '<a href="https://news.virginmediao2.co.uk/helping-customers-understand-upcoming-changes-to-their-virgin-media-email-services/" ' + _EXT + '>Virgin Media O2</a>'
_SRC_VM = '<a href="https://www.virginmedia.com/help/email-1/email-service-change" ' + _EXT + '>Virgin Media</a>'
_SRC_JN = '<a href="https://junara.com/virginmedia/" ' + _EXT + '>Junara</a>'
JUNARA_FACTS = [
    ("What is happening", "Virgin Media is closing its own email service and handing it to Junara", _SRC_VMO2),
    ("Who Junara are", "An email company, part of the Atmail group", _SRC_JN),
    ("Which addresses", "virginmedia.com, blueyonder.co.uk, ntlworld.com and virgin.net", _SRC_VM),
    ("Free period", "12 months if you still have Virgin broadband, TV or a landline, plus a 99p transfer fee; 18 months if you have told Virgin you need extra support", _SRC_VMO2),
    ("After that", "A paid plan, monthly or yearly, for each mailbox. The price is shown only in the sign-up; aliases come free", _SRC_JN),
    ("Already left Virgin", "Paid from the start", _SRC_VMO2),
] + ([("A price to compare", "Isle of Man, 2025: &pound;6.50 a month or &pound;65 a year per mailbox (discounted)", '<a href="https://www.ispreview.co.uk/index.php/2025/10/manx-telecom-scraps-free-email-and-migrates-users-to-paid-platform.html" ' + _EXT + '>ISPreview</a>')] if SHOW_MANX_PRECEDENT else []) + [
    ("Your deadline", "At least 45 days from Virgin&rsquo;s first email: the date is in that email", _SRC_VM),
    ("If you miss it", "The mailbox is suspended, you get 120 more days to sign up, then it is deleted for good", _SRC_VM),
    ("Webmail afterwards", "Sign in at junara.com or webmail.junara.com; your account at account.junara.com", _SRC_JN),
    ("Or move it instead", 'Gmail is free: <a href="/' + VIRGIN_TOOL_SLUG + '/">our free app moves it</a>, or <a href="#move-for-me">we do it for &pound;60</a>', ""),
]


def junara_facts_html():
    rows = "\n".join('              <tr><th scope="row">' + a + '</th><td>' + b
                     + ((' <small class="jfacts__src">(' + c + ')</small>') if c else '') + '</td></tr>'
                     for a, b, c in JUNARA_FACTS)
    return f'''    <section class="section" id="facts" aria-labelledby="facts-title" style="padding-top:.4rem">
      <div class="wrap" style="max-width:900px;margin:0 auto">
        <h2 class="section-title section-title--center" id="facts-title" style="font-size:clamp(1.35rem,2.6vw,1.8rem)">Virgin Media email and Junara: the facts</h2>
        <div class="price-table-wrap" tabindex="0" role="group" aria-label="The facts (scrolls sideways on a small screen)"><table class="price-table price-table--facts"><tbody>
{rows}
            </tbody></table></div>
        <p style="text-align:center;font-size:.85rem;color:var(--muted);margin:.8rem 0 0">Checked against Virgin Media&rsquo;s, Virgin Media O2&rsquo;s and Junara&rsquo;s own pages. Updated 29 September 2026.</p>
      </div>
      <style>.jfacts__src{{display:inline;font-size:.78rem;color:var(--muted)}}.jfacts__src a{{color:var(--muted)}}</style>
    </section>'''


def guide_task_head(d, crumbs):
    """build_extra.EMAIL_MOVE_V2 handler for the two new guides: the short task header, so the steps start on the
    first phone screen (the guide's section 1 is 'the short version')."""
    return "    " + TASK_PHONE_CSS + "\n" + bp.task_head(crumbs, d['h1'], d['lede'], trust=TASK_TRUST), ""   # style first: .taskhead + .section


# ============================================================ /virgin-email-mover/
# 7 Oct 2026 REDO (owner: "the PC manager has obviously been all updated now and we've got the mail mover extension for
# Chrome ... pictures ... easier ... a short video how to ... move your Virgin emails ... pretty slick"). The page now
# leads with the route that works on real Virgin mailboxes: the 365 Email Mover add-on copies the mailbox in the
# customer's own Chrome (Tom Wilson's 37,344 emails, 5 Oct 2026), then 365 PC Manager v35 moves that copy into Gmail.
# Every picture and every frame of the video is a REAL screen: the add-on's popup (0.2.2), its Chrome Web Store page,
# and the released v35 app's own Virgin screens, with made-up sample mailboxes (scratchpad 8682606b vem/: make_pics.py,
# make_video.py). The app's own sign-in window is now the fallback (Virgin's check often stops it - IDF-12B).
# v2 (same day, owner: "a voiceover ... a woman talking"): Kokoro's British voice Emma reads each step (make_vo.py), each
# scene lasts as long as its line, and there is a phone-shaped 720x1280 cut (phones get it: the wide one's text is tiny there).
VEM_VIDEO = "/images/vem-howto-v3.mp4"
VEM_VIDEO_TALL = "/images/vem-howto-tall-v3.mp4"
VEM_POSTER = "/images/vem-howto-poster-v2.webp"
VEM_POSTER_TALL = "/images/vem-howto-poster-tall-v2.webp"
VEM_VIDEO_SECS = 85   # the lede says "An 85-second video": mind the a/an if this changes
VEM_VIDEO_DATE = "2026-10-08"
VEM_URL = "https://365techies.co.uk/" + VIRGIN_TOOL_SLUG + "/"
VEM_SHARE_TEXT = "Moving off Virgin Media email? This free tool from 365 Techies moves it all into Gmail, and there's a short video showing how:"

TOOL_FAQS = [
    ("How do I move my Virgin Media email to Gmail?",
     "On a Windows PC, with two free tools from us. Add the 365 Email Mover to Chrome, open your Virgin email in Chrome and "
     "press Copy my email to this PC. Then in 365 PC Manager open Internet &amp; email, then Virgin email - free, press Check my Virgin "
     "email, add your Gmail address and a <a href=\"/" + GAPP_SLUG + "/\">Google app password</a>, and start. It copies "
     "every folder into Gmail, carries on by itself each day, and checks at the end that everything arrived. The video on "
     "this page shows every step. Or we do the whole move for you for &pound;60 per email address, including a full "
     "service of your PC with a written report."),
    ("Is it free?",
     "Yes. The 365 Email Mover add-on and 365 PC Manager are both free, with no sign-up and no card: checking your Virgin "
     "mailbox, moving it to Gmail and the list of where your address is used. We make it free because a lot of people are "
     "being asked to pay to keep an address they have had for years. If you would rather we did the whole move for you, "
     "that is &pound;60 per email address, agreed before we start, and it includes a full service of your PC with a "
     "written report."),
    ("Do I need a Virgin app password?",
     "No. The 365 Email Mover add-on copies your email from Virgin Media&rsquo;s own webmail in your Chrome, where you are "
     "already signed in, so there is no app password and no new sign-in. That is why it also works for a second mailbox on "
     "the account, which Virgin often won&rsquo;t give an app password since the Virgin Media O2 ID change."),
    ("Why do I need a Google app password?",
     "It is how Gmail lets a program on your PC put email into your account. You make it once in your Google Account, "
     "which needs 2-Step Verification switched on, and you can delete it when the move has finished. Our <a href=\"/"
     + GAPP_SLUG + "/\">step-by-step guide</a> shows you how."),
    ("Does it work in Microsoft Edge?",
     "Yes. Edge adds extensions from the Chrome Web Store: open the 365 Email Mover&rsquo;s page in Edge, press Allow "
     "extensions from other stores when Edge asks, then Add to Chrome. Then open your Virgin email in Edge and carry on "
     "exactly as in Chrome."),
    ("How long does it take?",
     "Copying your email out of Virgin takes about a minute for every 500 emails. Moving it into Gmail takes longer, because "
     "Gmail accepts only about 500 MB a day of email copied in this way, then refuses more for up to a day. So the app "
     "sends a little under that each day and carries on by itself. A few hundred MB goes across the same day; 3 GB takes "
     "about a week. The check tells you your own number before you start."),
    ("Will I lose any emails?",
     "No. Nothing is deleted from Virgin: the add-on and the app copy. At the end the app counts every folder in Gmail "
     "against the original and shows you any difference. Spam and Deleted items are left out on purpose, and Gmail keeps "
     "only one copy of two identical emails, so a slightly lower count in Gmail can be normal."),
    ("Does it work for blueyonder, ntlworld and virgin.net addresses?",
     "Yes. blueyonder.co.uk, ntlworld.com and virgin.net addresses all run on Virgin Media&rsquo;s email system, with the "
     "same webmail, so the add-on and the app treat them exactly like a virginmedia.com address."),
    ("Will it delete anything from my Virgin mailbox?",
     "No. The add-on and the check only read, and the move copies. Nothing in your Virgin mailbox is moved, deleted or "
     "marked as read, so it all stays exactly where it is until you decide what to do with the Virgin address."),
    ("Will my folders and dates come across?",
     "Yes. Each Virgin folder becomes a Gmail label under &lsquo;Virgin Media&rsquo;, and every email keeps its original "
     "date and whether you had read it. Spam and Deleted items are left out. At the end the app counts each folder in "
     "Gmail against the original, so you can see everything arrived."),
    ("Where is the copy saved, and when can I delete it?",
     "In your Downloads folder, in files whose names start with mm365. Leave them there until 365 PC Manager says every "
     "folder arrived in Gmail, then delete them. You can remove the add-on from Chrome&rsquo;s Extensions page at the same "
     "time, and delete the Google app password."),
    ("Can it move a second Virgin mailbox?",
     "Yes, one at a time. When the first has finished moving, delete its copy (the mm365 files in Downloads), sign in to "
     "the second mailbox in Virgin&rsquo;s webmail, copy it with the add-on, and move it with the app in the same way."),
    ("Does it move my contacts and calendar?",
     "No, it moves your email and folders. If you keep contacts in Virgin&rsquo;s webmail and want them in Gmail too, ring "
     "us and we will help you bring them across."),
    ("Does it work on a Mac, iPad or phone?",
     "No. 365 PC Manager is a Windows app, for Windows 10 and 11 desktops and laptops, and it is the part that puts your "
     "email into Gmail. Our &pound;60 move is done by connecting to your PC, and our remote support covers Windows PCs "
     "only, so we can&rsquo;t do it on a Mac, iPad or phone either."),
    # 29 Sep 2026: the first real-Virgin sign-in in the app's own window was paused by Virgin's check (ref IDF-12B)
    ("Virgin says it can&rsquo;t sign me in just now. What do I do?",
     "That is Virgin&rsquo;s own security check. It sometimes pauses a sign-in from a browser window it hasn&rsquo;t seen "
     "before, such as the window 365 PC Manager can open. Don&rsquo;t keep trying, and don&rsquo;t press Register: use the "
     "365 Email Mover add-on instead, in the Chrome you already read your Virgin email in, so there is nothing to sign in "
     "to. Or press &lsquo;Stuck? We&rsquo;ll do it for you&rsquo; in the app, or ring 01202 775566, and we move it for you "
     "&mdash; &pound;60 per email address, agreed before we start, including a full service of your PC with a written "
     "report."),
    ("A new Chrome window says &lsquo;Sign in to Chrome&rsquo;. Should I?",
     "No need: just ignore it. That only happens if you let 365 PC Manager open its own window for the Virgin sign-in "
     "instead of using the add-on. That window is separate from your normal browser and its saved passwords, and the app "
     "tidies it away afterwards."),
    ("My mailbox has already moved to Junara. Will it still work?",
     "The add-on and the app read Virgin Media&rsquo;s own webmail. If you have already signed up and your mailbox has "
     "moved to Junara, ring us before you start and we will look at it with you. If you haven&rsquo;t decided yet, see "
     "<a href=\"" + JUNARA + "\">keep it or move it?</a>"),
    ("What do the add-on and the app send to 365 Techies?",
     "Never your emails, your passwords or your contacts. The add-on sends nothing at all: the copy goes into your Downloads "
     "folder, and the move goes from there to Gmail through your own PC. Like the rest of 365 PC Manager, the app checks in "
     "about once an hour with your PC&rsquo;s health basics, as described on <a href=\"/free-pc-health-check/\">the app&rsquo;s "
     "page</a>. If you press &lsquo;Stuck? We&rsquo;ll do it for you&rsquo;, it sends us your name, your phone number and "
     "the size of your mailbox, so we can ring you back."),
]

# ---- the steps, each with the screen you see at that point (part 1 in Chrome, part 2 in 365 PC Manager)
_POP_SIZES = {"ready": 872, "copying": 698, "done": 924}
def _pop(key, alt):
    return (f'<img src="/images/vem-popup-{key}-v1.webp" width="720" height="{_POP_SIZES[key]}" alt="{alt}" '
            f'loading="lazy" decoding="async">')
_STORE_PIC = ('<img src="/images/vem-store-v1-1200.webp" srcset="/images/vem-store-v1-1200.webp 1200w, /images/vem-store-v1.webp 2260w" '
              'sizes="(max-width:860px) 92vw, 560px" width="1200" height="213" alt="The 365 Email Mover on the Chrome Web Store, '
              'with its Add to Chrome button" loading="lazy" decoding="async">')
_LAP = "(max-width:860px) 92vw, 600px"

def _vem_steps(setup_url):
    add = (f'<a class="button primary" href="{EMAIL_MOVER_ADDON_URL}" target="_blank" rel="noopener" data-vem-addon>'
           f'Add the Email Mover to Chrome &#8599;</a>')
    dl = f'<a class="button secondary" href="{setup_url}" download data-vmc-dl>Download 365 PC Manager &#8595;</a>'
    chrome = [
        ("Add the free 365 Email Mover to Chrome",
         "It&rsquo;s on the Chrome Web Store: press <b>Add to Chrome</b>, then <b>Add extension</b>. Using Microsoft Edge? "
         "It works there too &mdash; Edge first asks you to <b>Allow extensions from other stores</b>.",
         add, "store", _STORE_PIC),
        ("Open your Virgin email and click the 365 button",
         "Open Virgin Media&rsquo;s webmail in Chrome and sign in as you normally do. Click the <b>365 Email Mover</b> button "
         "at the top right of Chrome &mdash; if you can&rsquo;t see it, it&rsquo;s under the jigsaw-piece button. Then press "
         "<b>Copy my email to this PC</b>. (<b>Check my mailbox first</b> only counts, if you&rsquo;d like to see the size.)",
         "", "pop", _pop("ready", "The 365 Email Mover add-on, signed in as yourname@virginmedia.com, with its Copy my email to this PC button")),
        ("Leave the tab open while it copies",
         "It copies about 500 emails a minute into your Downloads folder, so a big mailbox takes an hour or two. You can "
         "carry on using your PC, and if the page reloads it carries on by itself. Nothing in your Virgin mailbox is changed, "
         "and nothing is sent to us.",
         "", "pop", _pop("copying", "The 365 Email Mover copying: 289 of 322 emails, 90 per cent, about a minute to go (a sample mailbox)")),
        ("When it says Copied, go to 365 PC Manager",
         "Your copy is in the Downloads folder, in files starting <code>mm365</code>. Leave them there until your email is "
         "in Gmail. The add-on tells you what to press next.",
         "", "pop", _pop("done", "The 365 Email Mover finished: 322 emails copied to Downloads, with the next steps in 365 PC Manager")),
    ]
    app = [
        ("Open Internet &amp; email, then Virgin email &ndash; free",
         "No 365 PC Manager yet? It&rsquo;s free for Windows 10 and 11. The app spots your copy straight away: press "
         "<b>Check my Virgin email</b> and it reads the copy, so there&rsquo;s no Virgin sign-in.",
         dl, "lap", virgin_shot("found", _LAP)),
        ("See how much there is, and how long it will take",
         "Every folder, how many emails, the size, and how many days the move into Gmail will take. Then press "
         "<b>Next: Move it to Gmail myself</b>.",
         "", "lap", virgin_shot("check", _LAP)),
        ("Make a Google app password, and start",
         "On the Gmail account you&rsquo;re moving to, switch on 2-Step Verification and make an app password: the "
         "app&rsquo;s <b>Open Google app passwords</b> button takes you there, and <a href=\"/" + GAPP_SLUG + "/\">our "
         "guide</a> shows every screen. Type in your Gmail address and the 16 letters, then press <b>Start moving my email</b>.",
         "", "lap", virgin_shot("gmail", _LAP)),
        ("It carries on by itself",
         "Gmail takes about 500&nbsp;MB a day, so a big mailbox takes a few days. Use your PC as normal. If you switch it "
         "off, it carries on when it&rsquo;s back on, and it never sends the same email twice.",
         "", "lap", virgin_shot("move", _LAP)),
        ("Check it all arrived",
         "When it finishes, the app counts every folder in Gmail against Virgin. Your folders are labels under "
         "&lsquo;Virgin Media&rsquo;, with their dates, and read or unread as they were.",
         "", "lap", virgin_shot("done", _LAP)),
        ("Change your address everywhere",
         "<b>Where your address is used</b> lists the companies that email you, so you can change your address with each "
         "one. Set up forwarding on the Virgin mailbox while it still works. <a href=\"/" + ADDR_SLUG + "/\">How to change "
         "it everywhere</a>.",
         "", "lap", virgin_shot("where", _LAP)),
    ]
    return chrome, app

def _strip(h):
    import re, html
    return html.unescape(re.sub(r"<[^>]+>", "", h)).replace(" ", " ")


def virgin_tool_page(setup_url):
    slug = VIRGIN_TOOL_SLUG
    name = "Free Virgin Email Mover"
    desc = ("Free Windows app: check your Virgin Media, blueyonder, ntlworld or virgin.net mailbox and move it to Gmail, "
            "no Virgin app password. Or we do it for £60.")
    crumbs = bp.bc_sub("Email Support", "/email-support/", name)
    head = bp.task_head(crumbs, 'Move your Virgin Media email to Gmail, <em class="grad grad--cyan">free</em>',
                        "Our free Chrome add-on copies your Virgin Media, blueyonder, ntlworld or virgin.net email, and our free "
                        "Windows app moves it into Gmail. No Virgin app password, no sign-up. Watch how, or let us do it for you.",
                        trust=TASK_TRUST[:2] + ["Signed by 365 Techies Ltd", "Windows 10 &amp; 11"])
    watch = f'''    <section class="dh dh-sec vw" id="watch" aria-labelledby="watch-title">
      <div class="dh-in">
        <p class="dh-kicker">Watch it done</p>
        <h2 class="dh-h2" id="watch-title">The whole move, start to finish</h2>
        <p class="dh-lede">Two free tools from us: the <b>365 Email Mover</b> copies your Virgin email in Chrome, then <b>365 PC Manager</b> moves it into Gmail. An {VEM_VIDEO_SECS}-second video of the real screens (a made-up sample mailbox), with a spoken guide and captions.</p>
        <div class="vw__box" id="vembox">
          <video id="vemvid" controls playsinline preload="none" poster="{VEM_POSTER}" width="1280" height="720" data-tall="{VEM_VIDEO_TALL}" data-tallposter="{VEM_POSTER_TALL}" aria-label="How to move Virgin Media email to Gmail with the 365 Email Mover and 365 PC Manager, step by step, with a spoken guide and captions">
            <source src="{VEM_VIDEO}" type="video/mp4" />
          </video>
          <button type="button" class="vw__play" id="vemplay" aria-label="Play the how-to video ({VEM_VIDEO_SECS} seconds)"><span>&#9654;</span></button>
        </div>
        <ol class="vw__three">
          <li><b>Copy it in Chrome</b> with the 365 Email Mover add-on</li>
          <li><b>Move it into Gmail</b> with 365 PC Manager</li>
          <li><b>Check it all arrived</b>, folder by folder</li>
        </ol>
        <p class="vw__cta"><a class="button primary" href="{EMAIL_MOVER_ADDON_URL}" target="_blank" rel="noopener" data-vem-addon>Add the Email Mover to Chrome &#8599;</a><a class="button secondary" href="{setup_url}" download data-vmc-dl>Download 365 PC Manager &#8595;</a></p>
        <p class="vw__note">Prefer pictures? <a href="#how">Every step below, with the screen you&rsquo;ll see</a> &middot; <a href="#move-for-me">or let us do it for &pound;60</a></p>
        <div class="vw__more">
          <div class="vw__qr" id="vemqr">
            <canvas id="vemqrc" width="320" height="320" role="img" aria-label="QR code that opens this page on your phone"></canvas>
            <div><p class="vw__mh">Watch it on your phone</p><p>Point your phone&rsquo;s camera at the code to open this page there &mdash; handy for following the video while you do it on the PC.</p></div>
          </div>
          <div class="vw__share">
            <p class="vw__mh">Know someone moving off Virgin email?</p>
            <p>Send them this page, free to use:</p>
            <div class="vw__sb">
              <a class="vw__sbtn vw__sbtn--wa" data-vemshare="whatsapp" href="https://wa.me/?text={{VEM_WA}}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.52 3.49A11.53 11.53 0 0012.05 0C5.6 0 .35 5.24.34 11.69c0 2.06.54 4.07 1.56 5.85L.24 24l6.6-1.73a11.71 11.71 0 005.2 1.32h.01c6.45 0 11.7-5.24 11.7-11.69a11.6 11.6 0 00-3.23-8.41zm-8.47 18.21h-.01a9.6 9.6 0 01-4.9-1.34l-.35-.21-3.64.96.97-3.55-.23-.36a9.62 9.62 0 01-1.47-5.13c0-5.31 4.33-9.63 9.65-9.63a9.58 9.58 0 016.81 2.83 9.53 9.53 0 012.82 6.81c0 5.31-4.33 9.62-9.65 9.62zm5.42-7.32c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.09 3.2 5.07 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35z"/></svg>WhatsApp</a>
              <a class="vw__sbtn vw__sbtn--fb" data-vemshare="facebook" href="https://www.facebook.com/sharer/sharer.php?u={{VEM_FB}}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.96h-1.52c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>Facebook</a>
              <a class="vw__sbtn" data-vemshare="email" href="mailto:?subject={{VEM_SUBJ}}&amp;body={{VEM_BODY}}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm9 7.2L4 7.3V17h16V7.3l-8 4.9zM5.2 7l6.8 4.2L18.8 7H5.2z"/></svg>Email</a>
              <button type="button" class="vw__sbtn" data-vemshare="copy" id="vemcopy"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a1 1 0 010-1.4l3.5-3.5a3 3 0 114.2 4.2l-2 2a1 1 0 01-1.4-1.4l2-2a1 1 0 10-1.4-1.4l-3.5 3.5a1 1 0 01-1.4 0zm2.8-2.8a1 1 0 010 1.4l-3.5 3.5a3 3 0 11-4.2-4.2l2-2a1 1 0 011.4 1.4l-2 2a1 1 0 101.4 1.4l3.5-3.5a1 1 0 011.4 0z"/></svg><span>Copy the link</span></button>
              <button type="button" class="vw__sbtn" data-vemshare="native" id="vemnative" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16a3 3 0 00-2.4 1.2l-6.7-3.4a3 3 0 000-1.6l6.7-3.4A3 3 0 1015 7a3 3 0 00.1.8L8.4 11.2a3 3 0 100 3.6l6.7 3.4A3 3 0 1018 16z"/></svg>More ways&hellip;</button>
            </div>
          </div>
        </div>
      </div>
      <style>
        .vw__box{{position:relative;max-width:980px;margin:1.3rem auto 0;border-radius:20px;overflow:hidden;border:1px solid var(--hp-edge);box-shadow:0 34px 80px -30px rgba(0,0,0,.75);background:#090e20;aspect-ratio:16/9}}
        .vw__box video{{display:block;width:100%;height:100%;object-fit:contain;background:#090e20}}
        .vw__play{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(7,13,34,.18);border:0;cursor:pointer;padding:0}}
        .vw__play span{{width:84px;height:84px;border-radius:50%;background:rgba(29,151,227,.95);color:#fff;display:flex;align-items:center;justify-content:center;font-size:2rem;padding-left:6px;box-shadow:0 14px 34px rgba(0,0,0,.5);transition:transform .15s ease}}
        .vw__play:hover span,.vw__play:focus-visible span{{transform:scale(1.07)}}
        .vw__play:focus-visible{{outline:3px solid var(--cyan-soft);outline-offset:-3px}}
        .vw__three{{list-style:none;counter-reset:vw;max-width:980px;margin:1.1rem auto 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem}}
        .vw__three li{{counter-increment:vw;position:relative;padding:.85rem 1rem .85rem 3.1rem;border-radius:16px;border:1px solid var(--hp-edge);background:var(--hp-card);font-size:.95rem;line-height:1.4;color:var(--hp-body)}}
        .vw__three li::before{{content:counter(vw);position:absolute;left:.9rem;top:50%;transform:translateY(-50%);width:1.65rem;height:1.65rem;border-radius:50%;background:#1d97e3;color:#fff;font-weight:700;font-size:.9rem;display:flex;align-items:center;justify-content:center}}
        .vw__three b{{color:var(--hp-ink)}}
        .vw__cta{{display:flex;flex-wrap:wrap;justify-content:center;gap:.7rem 1rem;margin:1.3rem 0 0}}
        .vw__cta .button{{margin:0}}
        .vw__note{{text-align:center;margin:.9rem 0 0;font-size:.92rem;color:var(--hp-soft)}}
        .vw a:not(.button){{color:var(--cyan-soft)}}
        @media (max-width:760px){{.vw__three{{grid-template-columns:1fr}}.vw__play span{{width:68px;height:68px;font-size:1.6rem}}}}
        .vw__box.is-tall{{max-width:420px;aspect-ratio:9/16}}
        .vw__more{{max-width:980px;margin:1.5rem auto 0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:1rem}}
        .vw__qr,.vw__share{{padding:1.1rem 1.2rem;border-radius:18px;border:1px solid var(--hp-edge);background:var(--hp-card)}}
        .vw__qr{{display:flex;align-items:center;gap:1.1rem}}
        .vw__qr[hidden]{{display:none}}
        .vw__qr canvas{{flex:0 0 auto;width:132px;height:132px;border-radius:10px;background:#fff}}
        .vw__mh{{margin:0 0 .3rem;font-weight:700;font-size:1.02rem;line-height:1.35;color:var(--hp-ink)}}
        .vw__qr p,.vw__share p{{margin:0;font-size:.92rem;line-height:1.5;color:var(--hp-body)}}
        .vw__share p+p{{margin-top:0}}
        .vw__sb{{display:flex;flex-wrap:wrap;gap:.55rem;margin:.8rem 0 0}}
        .vw__sbtn{{display:inline-flex;align-items:center;gap:.45rem;min-height:44px;padding:.55rem .95rem;border-radius:999px;border:1px solid var(--hp-edge);background:rgba(255,255,255,.04);color:var(--hp-ink);font:inherit;font-weight:600;font-size:.92rem;line-height:1.2;text-decoration:none;cursor:pointer}}
        .vw__sbtn:hover,.vw__sbtn:focus-visible{{border-color:var(--cyan-soft);background:rgba(29,151,227,.12)}}
        .vw__sbtn svg{{width:18px;height:18px;fill:currentColor;flex:0 0 auto}}
        .vw__sbtn--wa svg{{fill:#25d366}}
        .vw__sbtn--fb svg{{fill:#1877f2}}
        .vw__sbtn[hidden]{{display:none}}
        .vw a.vw__sbtn{{color:var(--hp-ink)}}
        @media (max-width:760px){{.vw__more{{grid-template-columns:1fr}}}}
        @media (hover:none) and (pointer:coarse){{.vw__qr{{display:none}}}}
        @media (max-width:600px){{.vw__cta .button{{flex:1 1 100%;justify-content:center;text-align:center}}}}
      </style>
      <script>
        (function(){{
          var v=document.getElementById('vemvid'), b=document.getElementById('vemplay'); if(!v||!b) return;
          function hide(){{ b.style.display='none'; }}
          b.addEventListener('click',function(){{ hide(); try{{ var p=v.play(); if(p&&p.catch) p.catch(function(){{}}); }}catch(e){{}}
            try{{ if(typeof window.gtag==='function') window.gtag('event','vem_video_play',{{page:location.pathname}}); }}catch(e){{}} }});
          v.addEventListener('play',hide);
          /* a phone held upright gets the phone-shaped video: the wide one's captions are tiny at that size (nothing has loaded yet: preload=none) */
          try{{ if(window.matchMedia&&matchMedia('(max-width:600px) and (orientation:portrait)').matches){{
            var sv=v.querySelector('source'); sv.src=v.getAttribute('data-tall'); v.poster=v.getAttribute('data-tallposter');
            v.setAttribute('width','720'); v.setAttribute('height','1280'); document.getElementById('vembox').classList.add('is-tall'); v.load(); }} }}catch(e){{}}
          /* the scan-me QR for computers: opens this page, at the video, on the phone */
          (function(){{
            var box=document.getElementById('vemqr'), cv=document.getElementById('vemqrc'); if(!box||!cv) return;
            if(window.matchMedia&&matchMedia('(hover:none) and (pointer:coarse)').matches){{ box.hidden=true; return; }}
            var URL='{VEM_URL}?utm_source=qr&utm_medium=page#watch';
            function draw(){{ try{{ var q=window.qrcode(0,'M'); q.addData(URL); q.make();
              var n=q.getModuleCount(), size=cv.width, cell=Math.floor(size/(n+4)), off=Math.floor((size-cell*n)/2), x=cv.getContext('2d');
              x.fillStyle='#ffffff'; x.fillRect(0,0,size,size); x.fillStyle='#070d22';
              for(var r=0;r<n;r++) for(var c=0;c<n;c++) if(q.isDark(r,c)) x.fillRect(off+c*cell,off+r*cell,cell,cell); }}catch(e){{ box.hidden=true; }} }}
            function load(){{ if(window.qrcode){{ draw(); return; }} var sc=document.createElement('script'); sc.src='/js/vendor/qrcode-generator-1.4.4-qrcode.js?v=1'; sc.onload=draw; sc.onerror=function(){{ box.hidden=true; }}; document.head.appendChild(sc); }}
            if('IntersectionObserver' in window){{ var io=new IntersectionObserver(function(en){{ if(en[0].isIntersecting){{ io.disconnect(); load(); }} }},{{rootMargin:'400px'}}); io.observe(box); }} else load();
          }})();
          /* share: WhatsApp / Facebook / email are plain links; Copy the link; More ways = the phone's own share menu */
          (function(){{
            function ga(how){{ try{{ if(typeof window.gtag==='function') window.gtag('event','vem_share',{{method:how,page:location.pathname}}); }}catch(e){{}} }}
            var sh=document.querySelectorAll('[data-vemshare]'); for(var i=0;i<sh.length;i++) sh[i].addEventListener('click',function(){{ ga(this.getAttribute('data-vemshare')); }});
            var cp=document.getElementById('vemcopy'), url='{VEM_URL}?utm_source=link&utm_medium=share';
            if(cp) cp.addEventListener('click',function(){{ var sp=cp.querySelector('span');
              function done(t){{ sp.textContent=t; setTimeout(function(){{ sp.textContent='Copy the link'; }},2500); }}
              try{{ navigator.clipboard.writeText(url).then(function(){{ done('Link copied'); }},function(){{ done('Select and copy: '+url); }}); }}catch(e){{ done('Select and copy: '+url); }} }});
            var nb=document.getElementById('vemnative');
            if(nb&&navigator.share){{ nb.hidden=false; nb.addEventListener('click',function(){{
              navigator.share({{title:'Move your Virgin Media email to Gmail, free',text:{{share_text_js}},url:'{VEM_URL}?utm_source=native&utm_medium=share'}}).catch(function(){{}}); }}); }}
          }})();
          document.addEventListener('click',function(e){{ var t=e.target&&e.target.closest?e.target.closest('[data-vmc-dl]'):null;
            if(!t||t.closest('#watch,#choose')) return;
            try{{ if(typeof window.gtag==='function') window.gtag('event','pcm_download_click',{{page:location.pathname,place:'virgin_tools'}}); }}catch(e2){{}} }});
          var a=document.querySelectorAll('[data-vem-addon]'); for(var i=0;i<a.length;i++) a[i].addEventListener('click',function(){{
            try{{ if(typeof window.gtag==='function') window.gtag('event','vem_addon_click',{{page:location.pathname}}); }}catch(e){{}} }});
        }})();
      </script>
    </section>'''
    from urllib.parse import quote
    share_text_js = '"' + VEM_SHARE_TEXT.replace("\\", "\\\\").replace('"', '\\"') + '"'
    watch = (watch.replace("{VEM_WA}", quote(VEM_SHARE_TEXT + " " + VEM_URL + "?utm_source=whatsapp&utm_medium=share", safe=""))
                  .replace("{VEM_FB}", quote(VEM_URL + "?utm_source=facebook&utm_medium=share", safe=""))
                  .replace("{VEM_SUBJ}", quote("Move your Virgin Media email to Gmail, free", safe=""))
                  .replace("{VEM_BODY}", quote(VEM_SHARE_TEXT + "\n\n" + VEM_URL + "?utm_source=email&utm_medium=share", safe=""))
                  .replace("{share_text_js}", share_text_js))
    choices = virgin_choices(setup_url, how_href="#how", how_label="How to use it, step by step", shots=False,
        also_html=('Deciding whether to keep your Virgin address? <a href="' + JUNARA + '">Keep it or move it</a> &middot; '
                   'moving by hand instead: <a href="' + GMAIL_PAGE + '">the Thunderbird guide</a> &middot; '
                   '<a href="#need">what you need</a> &middot; <a href="#safety">is it safe?</a>'))
    chrome, app = _vem_steps(setup_url)

    def step_li(n, t, x, btn, kind, pic):
        b = f'\n              <p class="vst__btn">{btn}</p>' if btn else ""
        return f'''          <li class="vst__step">
            <div class="vst__txt">
              <p class="vst__n" aria-hidden="true">{n}</p>
              <h4 class="vst__h">{t}</h4>
              <p class="vst__p">{x}</p>{b}
            </div>
            <figure class="vst__pic vst__pic--{kind}">{pic}</figure>
          </li>'''
    li_c = "\n".join(step_li(i + 1, *s) for i, s in enumerate(chrome))
    li_a = "\n".join(step_li(len(chrome) + i + 1, *s) for i, s in enumerate(app))
    how = f'''    <section class="dh dh-sec vst" id="how" aria-labelledby="how-title">
      <div class="dh-in">
        <p class="dh-kicker" id="screens">Step by step</p>
        <h2 class="dh-h2" id="how-title">How to move it, with the screens you&rsquo;ll see</h2>
        <p class="dh-lede">Real screens from the 365 Email Mover and 365 PC Manager, with a made-up sample mailbox. About ten minutes of your time; the rest happens by itself.</p>
        <h3 class="vst__part"><span>Part 1 &middot; in Chrome</span> Copy your Virgin email onto your PC</h3>
        <ol class="vst__list">
{li_c}
        </ol>
        <h3 class="vst__part"><span>Part 2 &middot; in 365 PC Manager</span> Move it into Gmail</h3>
        <ol class="vst__list" start="{len(chrome) + 1}">
{li_a}
        </ol>
        <div class="vst__alt">
          <p><b>No Chrome or Edge?</b> Press <b>Check my Virgin email</b> without a copy and 365 PC Manager opens Virgin&rsquo;s sign-in in a window of its own. Virgin&rsquo;s security check often stops sign-ins in a new window (&ldquo;Sorry, we can&rsquo;t sign you in just now&rdquo;): if it does, don&rsquo;t keep trying &mdash; use the add-on, or <a href="#move-for-me">let us do it for you</a>.</p>
        </div>
      </div>
      <style>
        .vst__part{{display:flex;flex-wrap:wrap;align-items:baseline;gap:.2rem .8rem;font-family:var(--font-display);font-weight:600;font-size:clamp(1.15rem,2.1vw,1.4rem);line-height:1.25;margin:2.1rem 0 .9rem;color:var(--hp-ink);scroll-margin-top:90px}}
        .vst__part span{{font-family:var(--font-mono);font-weight:500;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in srgb,var(--c2,#1d97e3) 85%,#fff)}}
        .vst__list{{list-style:none;margin:0;padding:0;display:grid;gap:1.1rem}}
        .vst__step{{display:grid;grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);gap:1.5rem;align-items:center;padding:1.3rem 1.4rem;border-radius:22px;border:1px solid var(--hp-edge);background:var(--hp-card)}}
        .vst__n{{margin:0 0 .55rem;width:2.15rem;height:2.15rem;border-radius:50%;background:#1d97e3;color:#fff;font-weight:700;font-size:1rem;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px -8px rgba(29,151,227,.8)}}
        .vst__h{{font-family:var(--font-display);font-weight:600;font-size:clamp(1.12rem,1.9vw,1.32rem);line-height:1.25;margin:0 0 .45rem;color:var(--hp-ink);text-wrap:balance}}
        .vst__p{{margin:0;font-size:1rem;line-height:1.55;color:var(--hp-body)}}
        .vst__p b,.vst__alt b{{color:var(--hp-ink)}}
        .vst__p code{{font-size:.9em;padding:.05em .35em;border-radius:6px;background:rgba(255,255,255,.07)}}
        .vst a:not(.button){{color:var(--cyan-soft)}}
        .vst__btn{{margin:.95rem 0 0}}
        .vst__btn .button{{margin:0}}
        .vst__pic{{margin:0;display:flex;justify-content:center}}
        .vst__pic img{{display:block;max-width:100%;height:auto}}
        .vst__pic--pop img{{width:340px;border-radius:14px;border:1px solid rgba(125,170,220,.32);box-shadow:0 26px 54px -24px rgba(0,0,0,.8)}}
        .vst__pic--store img{{width:100%;border-radius:12px;border:1px solid rgba(125,170,220,.32);box-shadow:0 22px 48px -26px rgba(0,0,0,.8)}}
        .vst__pic--lap img{{width:100%}}
        .vst__alt{{margin:1.4rem 0 0;padding:1rem 1.2rem;border-radius:16px;border:1px dashed var(--hp-edge);font-size:.95rem;line-height:1.55;color:var(--hp-soft)}}
        .vst__alt p{{margin:0}}
        @media (max-width:860px){{.vst__step{{grid-template-columns:1fr;gap:1rem;padding:1.1rem 1.05rem}}.vst__pic--pop img{{width:min(340px,100%)}}}}
        @media (max-width:600px){{.vst__btn .button{{display:flex;justify-content:center;text-align:center}}}}
      </style>
    </section>'''
    how_long = '''    <section class="section" id="how-long" aria-label="How long it takes, and why">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// HOW LONG IT TAKES</p>
          <h2 class="section-title section-title--center" data-title>How long it takes, and why<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="prose" data-reveal style="max-width:760px;margin:0 auto">
          <p>Copying your email out of Virgin is quick: the add-on does about <strong>500 emails a minute</strong>. Moving it into Gmail is what takes days, because Gmail accepts only about <strong>500&nbsp;MB a day</strong> of email copied into it this way. Go past that and it refuses more for up to a day &mdash; which is why moves done by hand so often stop part-way with an error. The app sends a little under the limit each day and then waits, so it never trips it.</p>
        </div>
        <div class="price-table-wrap" tabindex="0" role="group" aria-label="How long a move takes (scrolls sideways on a small screen)" style="max-width:640px;margin:1.2rem auto 0"><table class="price-table price-table--facts"><tbody>
              <tr><th scope="row">Up to about 450&nbsp;MB</th><td>The same day</td></tr>
              <tr><th scope="row">1&nbsp;GB</th><td>2 to 3 days</td></tr>
              <tr><th scope="row">3&nbsp;GB</th><td>About a week</td></tr>
              <tr><th scope="row">5&nbsp;GB</th><td>About 12 days</td></tr>
            </tbody></table></div>
        <div class="prose" data-reveal style="max-width:760px;margin:1.2rem auto 0">
          <p>The check tells you the exact size of your mailbox and the number of days before you start. <strong>Leave the PC switched on if you can.</strong> If you switch it off, the move carries on by itself the next time you switch it on, and it never sends the same email twice. Start well before the date in your email from Virgin.</p>
          <p style="font-size:.85rem;color:var(--muted)">Source: Google, <a href="https://knowledge.workspace.google.com/admin/gmail/gmail-bandwidth-limits" rel="noopener" target="_blank">Gmail bandwidth limits</a> (500&nbsp;MB a day uploaded over IMAP), read 29 September 2026.</p>
        </div>
      </div>
    </section>'''
    need = f'''    <section class="section section--alt" id="need" aria-label="What you need">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">// WHAT YOU NEED</p>
          <h2 class="section-title" data-title>What you need before you start<span class="title-underline"></span></h2>
          <p>Nothing you have to buy. Most people have everything already, apart from the Google app password, which takes about five minutes to make.</p>
          <p>Don&rsquo;t have a Gmail account yet? Make one free with Google first, and use a password you don&rsquo;t use anywhere else. Want to keep your Virgin address instead? That means signing up with Junara: <a href="{JUNARA}#s3">what it costs</a>.</p>
        </div>
        <ul class="checklist" data-stagger>
          <li><strong>A Windows 10 or 11 PC</strong>, desktop or laptop. It doesn&rsquo;t run on a Mac.</li>
          <li><strong>Google Chrome or Microsoft Edge</strong>, where you can open your Virgin email. Edge comes with Windows.</li>
          <li><strong>Your Virgin email, signed in</strong> on Virgin&rsquo;s webmail as usual. Not an app password.</li>
          <li><strong>A Gmail account with 2-Step Verification on</strong>, and a <a href="/{GAPP_SLUG}/">Google app password</a> for it.</li>
          <li><strong>Room on the PC</strong> for about as much again as your mailbox, because the mail is copied to your PC first. The check shows the size.</li>
          <li><strong>Time before your date:</strong> a few days for a big mailbox.</li>
        </ul>
      </div>
    </section>'''
    safety = '''    <section class="section section--alt" id="safety" aria-label="Is it safe?">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">// IS IT SAFE?</p>
          <h2 class="section-title" data-title>Your email, your PC, your passwords<span class="title-underline"></span></h2>
          <p>We are a family IT firm in Bournemouth, here since 1995, and our name is on the add-on and the app. They were built for the same job we do for customers every week &mdash; the difference is that you can do it yourself.</p>
          <p>If anything looks wrong, stop and ring us on <strong>01202 775566</strong>. Real people answer, Monday to Friday, 9 to 5.</p>
        </div>
        <ul class="checklist" data-stagger>
          <li><strong>It runs on your own PC.</strong> Your emails go from Virgin to Gmail through your computer, never through our servers.</li>
          <li><strong>We never see your passwords.</strong> The add-on works in the Chrome where you&rsquo;re already signed in to Virgin, and the Google app password is kept encrypted on your PC.</li>
          <li><strong>Nothing in Virgin is changed.</strong> The add-on and the check only read: nothing is moved, deleted or marked as read.</li>
          <li><strong>Ours, and signed.</strong> The add-on is published by 365 Techies on the Chrome Web Store and works only on Virgin Media&rsquo;s webmail. The app is digitally signed by 365 Techies Ltd.</li>
          <li><strong>Easy to tidy up.</strong> When it&rsquo;s done, delete the mm365 files from Downloads, remove the add-on from Chrome&rsquo;s Extensions page, and delete the Google app password.</li>
        </ul>
      </div>
    </section>'''
    who = f'''    <section class="section" id="who" aria-label="Who it is for">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// WHO IT&rsquo;S FOR</p>
          <h2 class="section-title section-title--center" data-title>Who it&rsquo;s for<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="prose" data-reveal style="max-width:760px;margin:0 auto">
          <p>Anyone with a <strong>virginmedia.com, blueyonder.co.uk, ntlworld.com or virgin.net</strong> address who wants their email in Gmail. Virgin is handing all four to a company called Junara: to keep the address you sign up with Junara and pay for each mailbox after any free period, or you move it once, to an address that stays yours whoever supplies your broadband. <a href="{JUNARA}">What is happening, and your deadline</a>.</p>
          <p>It works <strong>without a Virgin app password</strong>, so it suits the many people who can&rsquo;t get one since the Virgin Media O2 ID change &mdash; most often for a second mailbox on the account.</p>
          <p>It is for <strong>Windows PCs only</strong>, and so is our remote support: we don&rsquo;t support Macs, iPads or iPhones. If your Virgin mailbox is already suspended, ring us before you start. Plusnet address? That is a different move: <a href="/move-plusnet-email-to-gmail/">Plusnet email to Gmail</a>.</p>
        </div>
      </div>
    </section>'''
    download = f'''    <section class="section section--alt" id="download" aria-label="Get the two free tools">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// GET THEM</p>
          <h2 class="section-title section-title--center" data-title>Get the two free tools<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Free &middot; no sign-up &middot; the app is for Windows 10 &amp; 11 and digitally signed by 365 Techies Ltd. Already have the app? It updates itself.</p>
        </div>
        <p style="display:flex;flex-wrap:wrap;justify-content:center;gap:.8rem 1rem;margin:1.4rem 0" data-reveal><a class="button primary button--lg" href="{EMAIL_MOVER_ADDON_URL}" target="_blank" rel="noopener" data-vem-addon>Add the Email Mover to Chrome &#8599;</a><a class="button secondary button--lg" href="{setup_url}" download data-vmc-dl>Download 365 PC Manager &#8595;</a></p>
        <details class="prose" data-reveal style="max-width:640px;margin:1.2rem auto 0;color:var(--muted);font-size:.92rem">
          <summary style="cursor:pointer;color:var(--ink-3)">Windows says &ldquo;protected your PC&rdquo;? What that means, and how to check it&rsquo;s really ours</summary>
          <p style="margin-top:.7rem">Windows SmartScreen shows that blue box for <em>any</em> program it hasn&rsquo;t seen many people download yet &mdash; even signed ones. To check the file is genuinely ours: click <strong>More info</strong> and look for the publisher <strong>365 Techies Ltd</strong>, then <strong>Run anyway</strong>. If it says &ldquo;Unknown publisher&rdquo;, don&rsquo;t run it &mdash; ring us on 01202 775566.</p>
          <p>Or right-click the file &rarr; Properties &rarr; Digital Signatures: it should show <strong>365 Techies Ltd</strong>. If you&rsquo;d rather we set it up for you, ring us.</p>
        </details>
        <p style="text-align:center;color:var(--muted);font-size:.95rem;margin-top:1.2rem" data-reveal>Rather not do it yourself? <a href="#move-for-me">We move it for you for &pound;60 per address</a>, with a full PC service included.</p>
      </div>
    </section>'''
    related = f'''    <section class="section" aria-label="Related">
      <div class="wrap prose" data-reveal style="max-width:860px;margin:0 auto">
        <p class="eyebrow mono">// RELATED</p>
        <p><strong>Related guides:</strong> <a href="{JUNARA}">Virgin Media email is moving to Junara: keep it or move it?</a> &middot; <a href="{GMAIL_PAGE}">Moving Virgin Media email to Gmail, step by step</a> &middot; <a href="/{GAPP_SLUG}/">How to make a Google app password</a> &middot; <a href="/{ADDR_SLUG}/">Change your email address everywhere</a> &middot; <a href="/virgin-media-email-wont-add-to-new-outlook/">Virgin Media email and the new Outlook</a> &middot; <a href="/email-support/">Email support</a></p>
      </div>
    </section>'''
    content = "\n".join([head, watch, choices, how, how_long, need, safety, who, download, related, bp.faq_html(TOOL_FAQS),
                         bp.cta("Rather we just did it for you?", "We move every folder into Gmail for you, remotely, for &pound;60 per email address, agreed before we start &mdash; and it includes a full service of your PC with a written report.",
                             primary=("Call 01202 775566", "tel:+441202775566"), secondary=("Text us: 07520 615332", "sms:+447520615332"))])

    steps = [(_strip(t), _strip(x)) for t, x, *_ in chrome + app]

    def schema(s, _d=desc, _n=name, _steps=steps):
        video = {"@type": "VideoObject", "@id": bp.SITE + "/" + s + "/#video",
                 "name": "How to move Virgin Media email to Gmail, free",
                 "description": ("The 365 Email Mover add-on copies a Virgin Media mailbox in Chrome, then the free 365 PC Manager "
                                 "app moves it into Gmail and checks every folder arrived. Real screens, a made-up sample mailbox, a spoken guide."),
                 "thumbnailUrl": [bp.SITE + VEM_POSTER, bp.SITE + "/images/vem-howto-poster-v2.jpg"],
                 "uploadDate": VEM_VIDEO_DATE, "duration": "PT1M25S",
                 "contentUrl": bp.SITE + VEM_VIDEO, "embedUrl": bp.SITE + "/" + s + "/#watch",
                 "publisher": {"@type": "Organization", "name": "365 Techies", "logo": {"@type": "ImageObject", "url": bp.SITE + "/logo.jpg"}}}
        return bp.graph([bp.crumb_sub(s, "Email Support", "email-support", _n), bp.webpage(s, _n, _d, image=VIRGIN_OG),
                         video,
                         bp.howto_node(s, "How to move Virgin Media email to Gmail with the 365 Email Mover and 365 PC Manager", _steps),
                         bp.faqpage(s, TOOL_FAQS)])
    bp.add(slug=slug, title="Move Virgin Media Email to Gmail Free, No App Password", desc=desc,
        og_title="Move your Virgin Media email to Gmail, free", schema=schema, content=content, og_image=VIRGIN_OG)
