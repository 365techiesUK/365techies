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

# the owner's GBP 60 move: what they get (the same promises the pages made before the free app, plus the PC service)
VM_US_TICKS = ("Every message and folder into Gmail, with the original dates",
               "Works even if Virgin won&rsquo;t give you an app password",
               "A full service of your PC, with a written health report",
               "Forwarding set up, and checked on your phone if you like",
               "Done remotely: we phone first, and you watch us start")
VM_US_SMALL = "Agreed before we start &middot; no fix, no fee &middot; we can usually start the same day, Mon&ndash;Fri 9&ndash;5"

_VMC_CSS = """
.vmc{padding:1.3rem var(--pad-x) 2.4rem}
.vmc__in{max-width:1180px;margin:0 auto}
.vmc__grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:1.1rem;align-items:stretch}
.vmc__card{display:flex;flex-direction:column;padding:1.35rem 1.4rem 1.3rem;border-radius:24px;border:1px solid var(--hp-edge);background:radial-gradient(110% 80% at 100% 0%,color-mix(in srgb,var(--c1) 16%,transparent),transparent 62%),var(--hp-card)}
.vmc__card--diy{border-color:color-mix(in srgb,var(--c1) 58%,transparent);box-shadow:0 34px 70px -40px color-mix(in srgb,var(--c1) 85%,transparent)}
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
.vmc__dl-s{display:none}
@media (max-width:600px){.vmc{padding-top:.8rem}.vmc__card{padding:1rem 1rem 1.05rem;border-radius:20px}.vmc__tag{display:none}.vmc__cta{margin:.8rem 0 .5rem}.vmc__cta .button{flex:1 1 100%;text-align:center;justify-content:center}.vmc__dl-l{display:none}.vmc__dl-s{display:inline}}
@media (max-width:600px){.taskhead__trust span:nth-child(n+3){display:none}.taskhead__lede{margin-bottom:.55rem}}
"""

_VMC_JS = """    <script>
    (function(){ var a=document.querySelectorAll('[data-vmc-dl]'); for(var i=0;i<a.length;i++) a[i].addEventListener('click',function(){
      try{ if(typeof window.gtag==='function') window.gtag('event','pcm_download_click',{page:location.pathname,place:'virgin_tools'}); }catch(e){} }); })();
    </script>"""


def virgin_choices(setup_url, also_html="", how_href="/" + VIRGIN_TOOL_SLUG + "/", how_label="How it works, and what you need",
                   heading_level=2):
    """The two choices side by side (one above the other on a phone, the free one first). The GBP 60 card keeps the
    id move-for-me that the pages' own links point at; the free card is #do-it-free."""
    h = "h%d" % heading_level
    ticks = "\n".join("            <li>%s</li>" % t for t in VM_US_TICKS)
    also = ('\n    <p class="vmc__also">' + also_html + '</p>') if also_html else ""
    return f'''    <section class="dh vmc" id="choose" aria-label="Two ways to move your Virgin email">
    <div class="vmc__in">
      <div class="vmc__grid">
        <div class="vmc__card vmc__card--diy hp-c-fix" id="do-it-free">
          <p class="vmc__tag"><span class="hp-ico hp-ico--sm">{_dh_ico("monitor")}</span>FREE &middot; NO SIGN-UP &middot; FOR WINDOWS PCs</p>
          <{h} class="vmc__h">Do it yourself, free, with 365&nbsp;PC&nbsp;Manager</{h}>
          <p class="vmc__d">Our free app moves your Virgin email into Gmail for you, no Virgin app password needed.</p>
          <p class="vmc__cta"><a class="button primary button--lg" href="{setup_url}" download data-vmc-dl><span class="vmc__dl-l">Download free for Windows</span><span class="vmc__dl-s">Download free</span> &#8595;</a></p>
          <p class="vmc__note">For Windows PCs. You&rsquo;ll need a Gmail account and a <a href="/{GAPP_SLUG}/">Google app password</a>. On a Mac? <a href="tel:+441202775566">Call us</a>.</p>
          <ul class="vmc__list">
            <li><b>Check my Virgin email:</b> every folder, how many emails, how big, and how many days the move will take. It only reads.</li>
            <li><b>Move it to Gmail myself:</b> folders and dates kept. Gmail takes about 500&nbsp;MB a day, so a big mailbox takes a few days &mdash; it carries on by itself.</li>
            <li><b>Where your address is used:</b> the companies that email you, so you can change your address with each one.</li>
            <li><b>Stuck? We&rsquo;ll do it for you:</b> one tap asks us to ring you back.</li>
          </ul>
          <p class="vmc__more"><a class="dh-link" href="{how_href}">{how_label} &#8594;</a></p>
        </div>
        <div class="vmc__card hp-c-care" id="move-for-me">
          <p class="vmc__tag"><span class="hp-ico hp-ico--sm">{_dh_ico("phone")}</span>DONE FOR YOU &middot; AGREED BEFORE WE START</p>
          <{h} class="vmc__h">Let us do it: <b>&pound;60</b> per email address</{h}>
          <p class="vmc__d">We move every folder into Gmail for you, remotely. The price includes a full service of your PC, with a written report.</p>
          <p class="vmc__cta"><a class="button secondary button--lg" href="tel:+441202775566">Call 01202 775566</a><a class="dh-link" href="sms:+447520615332">Or text 07520 615332</a></p>
          <ul class="vmc__list">
{ticks}
          </ul>
          <p class="vmc__small">{VM_US_SMALL}</p>
        </div>
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
TOOL_FAQS = [
    ("How do I move my Virgin Media email to Gmail?",
     "On a Windows PC: download our free 365 PC Manager app, choose Check my Virgin email and sign in to Virgin in the window "
     "it opens, make a <a href=\"/" + GAPP_SLUG + "/\">Google app password</a> for your Gmail, then choose Move it to Gmail "
     "myself. It copies every folder into Gmail, carries on by itself each day, and checks at the end that everything "
     "arrived. Or we do the whole move for you for &pound;60 per email address, including a full service of your PC with a "
     "written report."),
    ("Is it free?",
     "Yes. Checking your Virgin mailbox, moving it to Gmail and the list of where your address is used are all free in "
     "365 PC Manager, with no sign-up and no card. We make it free because a lot of people are being asked to pay to keep "
     "an address they have had for years. If you would rather we did the whole move for you, that is &pound;60 per email "
     "address, agreed before we start, and it includes a full service of your PC with a written report."),
    ("Do I need a Virgin app password?",
     "No. When the app asks, a browser window opens at Virgin&rsquo;s own webmail and you sign in there with your Virgin "
     "address and its normal password, the one you use for webmail. That is why it also works for a second mailbox on the "
     "account, which Virgin often won&rsquo;t give an app password since the Virgin Media O2 ID change."),
    ("Why do I need a Google app password?",
     "It is how Gmail lets a program on your PC put email into your account. You make it once in your Google Account, "
     "which needs 2-Step Verification switched on, and you can delete it when the move has finished. Our <a href=\"/"
     + GAPP_SLUG + "/\">step-by-step guide</a> shows you how."),
    ("How long does it take?",
     "It depends on the size of your mailbox, because Gmail accepts only about 500 MB a day of email copied in this way, then refuses more for up to a day. So the app "
     "sends a little under that each day and carries on by itself. A few hundred MB goes across the same day; 3 GB takes "
     "about a week. The check tells you your own number before you start."),
    ("Will I lose any emails?",
     "No. Nothing is deleted from Virgin: the app copies. At the end it counts every folder in Gmail against the original "
     "and shows you any difference. Spam and Deleted items are left out on purpose, and Gmail keeps only one copy of two "
     "identical emails, so a slightly lower count in Gmail can be normal."),
    ("Does it work for blueyonder, ntlworld and virgin.net addresses?",
     "Yes. blueyonder.co.uk, ntlworld.com and virgin.net addresses all run on Virgin Media&rsquo;s email system, with the "
     "same webmail, so the app treats them exactly like a virginmedia.com address."),
    ("Will it delete anything from my Virgin mailbox?",
     "No. The check only reads, and the move copies. Nothing in your Virgin mailbox is moved, deleted or marked as read, "
     "so it all stays exactly where it is until you decide what to do with the Virgin address."),
    ("Will my folders and dates come across?",
     "Yes. Each Virgin folder becomes a Gmail label under &lsquo;Virgin Media&rsquo;, and every email keeps its original "
     "date and whether you had read it. Spam and Deleted items are left out. At the end the app counts each folder in "
     "Gmail against the original, so you can see everything arrived."),
    ("Can it move a second Virgin mailbox?",
     "Yes. When the Virgin sign-in window opens, sign in with that mailbox&rsquo;s own address and password. The app "
     "moves one mailbox at a time, so do them one after the other."),
    ("Does it move my contacts and calendar?",
     "No, it moves your email and folders. If you keep contacts in Virgin&rsquo;s webmail and want them in Gmail too, ring "
     "us and we will help you bring them across."),
    ("Does it work on a Mac, iPad or phone?",
     "No. 365 PC Manager is a Windows app, for Windows 10 and 11 desktops and laptops. On a Mac, or with only a phone or "
     "tablet, ring us on 01202 775566: the move itself happens between the two email accounts, so we can do it for you."),
    ("A new Chrome window says &lsquo;Sign in to Chrome&rsquo;. Should I?",
     "No need: just ignore it. The app opens its own separate browser window for the Virgin sign-in, so it never touches "
     "your normal browser or its saved passwords, and it tidies that window away afterwards."),
    ("My mailbox has already moved to Junara. Will it still work?",
     "The app reads Virgin Media&rsquo;s own webmail. If you have already signed up and your mailbox has moved to Junara, "
     "ring us before you start and we will look at it with you. If you haven&rsquo;t decided yet, see <a href=\""
     + JUNARA + "\">keep it or move it?</a>"),
    ("What does the app send to 365 Techies?",
     "Never your emails, your passwords or your contacts: the move goes from Virgin to Gmail through your own PC. Like the "
     "rest of 365 PC Manager, it checks in about once an hour with your PC&rsquo;s health basics, as described on <a "
     "href=\"/free-pc-health-check/\">the app&rsquo;s page</a>. If you press &lsquo;Stuck? We&rsquo;ll do it for you&rsquo;, "
     "it sends us your name, your phone number and the size of your mailbox, so we can ring you back."),
]

TOOL_STEPS = [
    ("Download and install 365 PC Manager", "It is free, with no sign-up. If Windows shows a blue &lsquo;protected your PC&rsquo; box, click More info and check the publisher says 365 Techies Ltd."),
    ("Choose Check my Virgin email", "A browser window opens at Virgin&rsquo;s webmail. Sign in with your Virgin address and its normal password. You then see every folder, how many emails, the size, and how many days the move will take. Nothing is changed."),
    ("Make a Google app password", "On the Gmail account you are moving to: switch on 2-Step Verification, then make an app password."),
    ("Choose Move it to Gmail myself", "Type in your Gmail address and the app password, and start. It copies your mail to the PC, then sends it into Gmail, about 500 MB a day, carrying on by itself. Leave the PC on if you can."),
    ("Check it arrived", "When it finishes, the app counts each folder in Gmail against the original. Your folders are labels under &lsquo;Virgin Media&rsquo;."),
    ("Change your address everywhere", "Choose Where your address is used, change your address with each company, and set up forwarding on the Virgin mailbox while it still works."),
]


def virgin_tool_page(setup_url):
    slug = VIRGIN_TOOL_SLUG
    name = "Free Virgin Email Mover"
    desc = ("Free Windows app: check your Virgin Media, blueyonder, ntlworld or virgin.net mailbox and move it to Gmail, "
            "no Virgin app password. Or we do it for £60.")
    crumbs = bp.bc_sub("Email Support", "/email-support/", name)
    head = bp.task_head(crumbs, 'Move your Virgin Media email to Gmail, <em class="grad grad--cyan">free</em>',
                        "Our free Windows app checks your Virgin Media, blueyonder, ntlworld or virgin.net mailbox and moves it to "
                        "Gmail, no Virgin app password needed. Or we do it for you:",
                        trust=TASK_TRUST[:2] + ["Signed by 365 Techies Ltd", "Windows 10 &amp; 11"])
    choices = virgin_choices(setup_url, how_href="#how", how_label="How to use it, step by step",
        also_html=('Deciding whether to keep your Virgin address? <a href="' + JUNARA + '">Keep it or move it</a> &middot; '
                   'moving by hand instead: <a href="' + GMAIL_PAGE + '">the Thunderbird guide</a> &middot; '
                   '<a href="#need">what you need</a> &middot; <a href="#safety">is it safe?</a>'))
    cards = [
        ("hp-c-fix", "gauge", "Check my Virgin email", "Every folder, how many emails and how big, and how many days the move will take. It only reads: nothing is changed."),
        ("hp-c-care", "mail", "Move it to Gmail myself", "No Virgin app password needed. Folders become labels, dates and read/unread are kept, and it carries on by itself each day until it is done."),
        ("hp-c-biz", "book", "Where your address is used", "A list of the companies that email you &mdash; the bank, the shops, the subscriptions &mdash; so you can change your address with each one."),
        ("hp-c-buy", "phone", "Stuck? We&rsquo;ll do it for you", "One tap sends us your name and number and we ring you back. The move is &pound;60 per address, with a full PC service included."),
    ]
    cards_html = "\n".join(
        f'          <li class="{c}"><span class="hp-ico">{_dh_ico(i)}</span><h3>{t}</h3><p>{x}</p></li>' for c, i, t, x in cards)
    what = f'''    <section class="dh dh-sec vmt" id="what" aria-labelledby="what-title">
      <div class="dh-in">
        <p class="dh-kicker">What it does</p>
        <h2 class="dh-h2" id="what-title">Four free tools for a Virgin mailbox</h2>
        <p class="dh-lede">They are part of <a href="/free-pc-health-check/">365 PC Manager</a>, our free app for Windows PCs. Everything runs on your own computer.</p>
        <ul class="vmt__cards">
{cards_html}
        </ul>
      </div>
      <style>
        .vmt__cards{{list-style:none;margin:1.4rem 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem}}
        .vmt__cards li{{padding:1.15rem 1.2rem;border-radius:20px;border:1px solid var(--hp-edge);background:var(--hp-card)}}
        .vmt__cards .hp-ico{{--s:44px;margin-bottom:.7rem}}
        .vmt__cards h3{{font-family:var(--font-display);font-weight:600;font-size:1.1rem;line-height:1.25;margin:0 0 .35rem;color:var(--hp-ink)}}
        .vmt__cards p{{margin:0;font-size:.93rem;line-height:1.5;color:var(--hp-body)}}
        .vmt a{{color:var(--cyan-soft)}}
        @media (max-width:960px){{.vmt__cards{{grid-template-columns:repeat(2,minmax(0,1fr))}}}}
        @media (max-width:600px){{.vmt__cards{{grid-template-columns:1fr}}}}
      </style>
    </section>'''
    how_long = '''    <section class="section" id="how-long" aria-label="How long it takes, and why">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// HOW LONG IT TAKES</p>
          <h2 class="section-title section-title--center" data-title>How long it takes, and why<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="prose" data-reveal style="max-width:760px;margin:0 auto">
          <p>Gmail accepts only about <strong>500&nbsp;MB a day</strong> of email copied into it this way. Go past that and it refuses more for up to a day &mdash; which is why moves done by hand so often stop part-way with an error. The app sends a little under the limit each day and then waits, so it never trips it.</p>
          <p>First it copies your mail out of Virgin onto your PC, which takes from a few minutes to a few hours depending on the size. Then Gmail&rsquo;s limit sets the pace:</p>
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
          <li><strong>A Windows 10 or 11 PC</strong>, desktop or laptop. On a Mac? <a href="tel:+441202775566">Call us</a>.</li>
          <li><strong>Google Chrome or Microsoft Edge</strong> on it. Edge comes with Windows, so you almost certainly have it.</li>
          <li><strong>Your Virgin email address and its normal password</strong>, the one you use for Virgin webmail. Not an app password.</li>
          <li><strong>A Gmail account with 2-Step Verification on</strong>, and a <a href="/{GAPP_SLUG}/">Google app password</a> for it.</li>
          <li><strong>Room on the PC</strong> for about as much again as your mailbox, because the mail is copied to your PC first. The check shows the size.</li>
          <li><strong>Time before your date:</strong> a few days for a big mailbox.</li>
        </ul>
      </div>
    </section>'''
    steps_html = "\n".join(f'            <li><strong>{t}.</strong> {x}</li>' for t, x in TOOL_STEPS)
    how = f'''    <section class="section" id="how" aria-label="How to use it, step by step">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// STEP BY STEP</p>
          <h2 class="section-title section-title--center" data-title>How to use it, step by step<span class="title-underline title-underline--center"></span></h2>
        </div>
        <div class="prose" data-reveal style="max-width:760px;margin:0 auto">
          <ol>
{steps_html}
          </ol>
          <p>Our guides for two of those steps: <a href="/{GAPP_SLUG}/">how to make a Google app password</a>, and <a href="/{ADDR_SLUG}/">changing your email address everywhere</a> afterwards.</p>
        </div>
      </div>
    </section>'''
    safety = '''    <section class="section section--alt" id="safety" aria-label="Is it safe?">
      <div class="wrap split-2">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">// IS IT SAFE?</p>
          <h2 class="section-title" data-title>Your email, your PC, your passwords<span class="title-underline"></span></h2>
          <p>We are a family IT firm in Bournemouth, here since 1995, and our name is on this app. It was built for the same job we do for customers every week &mdash; the difference is that you can run it yourself.</p>
          <p>If anything looks wrong, stop and ring us on <strong>01202 775566</strong>. Real people answer, Monday to Friday, 9 to 5.</p>
        </div>
        <ul class="checklist" data-stagger>
          <li><strong>It runs on your own PC.</strong> Your emails go from Virgin to Gmail through your computer, never through our servers.</li>
          <li><strong>We never see your passwords.</strong> You sign in to Virgin in the window the app opens, and the Google app password is kept encrypted on your PC.</li>
          <li><strong>The check only reads.</strong> Nothing in your Virgin mailbox is moved, deleted or marked as read.</li>
          <li><strong>Signed by 365 Techies Ltd.</strong> The app is digitally signed, and it refuses to run an email mover that isn&rsquo;t signed by us too.</li>
          <li><strong>Easy to tidy up.</strong> Remove the app any time from Settings, then Apps. Delete the Google app password when the move has finished.</li>
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
          <p>It is for <strong>Windows PCs only</strong>. On a Mac, or with only a phone or tablet, <a href="tel:+441202775566">ring us</a>. If your Virgin mailbox is already suspended, ring us before you start. Plusnet address? That is a different move: <a href="/move-plusnet-email-to-gmail/">Plusnet email to Gmail</a>.</p>
        </div>
      </div>
    </section>'''
    download = f'''    <section class="section section--alt" id="download" aria-label="Download 365 PC Manager">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow eyebrow--center mono" data-reveal>// GET IT</p>
          <h2 class="section-title section-title--center" data-title>Get 365 PC Manager, free<span class="title-underline title-underline--center"></span></h2>
          <p class="lede lede--center" data-reveal>Free for Windows 10 &amp; 11 &middot; no sign-up &middot; digitally signed by 365 Techies Ltd. Already have the app? It updates itself.</p>
        </div>
        <p style="text-align:center;margin:1.4rem 0" data-reveal><a class="button primary button--lg" href="{setup_url}" download data-vmc-dl>Download free for Windows &#8595;</a></p>
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
    content = "\n".join([head, choices, what, how_long, need, how, safety, who, download, related, bp.faq_html(TOOL_FAQS),
                         bp.cta("Rather we just did it for you?", "We move every folder into Gmail for you, remotely, for &pound;60 per email address, agreed before we start &mdash; and it includes a full service of your PC with a written report.",
                             primary=("Call 01202 775566", "tel:+441202775566"), secondary=("Text us: 07520 615332", "sms:+447520615332"))])

    def schema(s, _d=desc, _n=name):
        return bp.graph([bp.crumb_sub(s, "Email Support", "email-support", _n), bp.webpage(s, _n, _d),
                         bp.howto_node(s, "How to move Virgin Media email to Gmail with 365 PC Manager", [(t, x) for t, x in TOOL_STEPS]),
                         bp.faqpage(s, TOOL_FAQS)])
    bp.add(slug=slug, title="Move Virgin Media Email to Gmail Free, No App Password", desc=desc,
        og_title="Move your Virgin Media email to Gmail, free", schema=schema, content=content)
