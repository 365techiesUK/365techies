# -*- coding: utf-8 -*-
"""/virgin-move-ready/ - the Virgin email move for customers with NO computer (owner, 31 Oct 2026).

Owner: "could we get it so we had that as a web page that they work through, and when they've actually got the app
passwords ready, then they contact us ... they give us those codes, and then basically we do the job and then charge
them for the move ... so I don't have to spend hours on the phone talking them through everything".

How the move works (365 Mail Mover v2.6 -Imap, tools/mail-mover/README.md): staff run it on OUR PC with two app
passwords - Google's (asked FIRST) and Virgin's - so nothing is done on the customer's iPhone, iPad or Android. That is
why this page exists despite the 29 Sep 2026 "no Apple support" rule: we never touch the device.
PUBLIC since 31 Oct 2026 (owner: "have all of this public ... so then all we do, we just get an inquiry with their app
passwords"): indexed, in the sitemap and the site search, and linked from the GBP 60 card on every Virgin page (any
device, virgin_launch.MOVE_STEPS). GBP 60 per address: the owner's price for this route ("charge us £60 on it").

Facts, read 31 Oct 2026:
  Virgin app password - ONLY in the My Virgin Media app (Account settings > Account details > Virgin Media Mail > Manage >
    Generate new App password); a new one means updating every app already using the old one; the app is described for
    "iPhone or Android handset" (virginmedia.com/help/broadband/manage-email-settings, /help/how-to-sign-into-virgin-media-app).
  Google app password - needs 2-Step Verification; myaccount.google.com/apppasswords (support.google.com/accounts/answer/185833).
  Virgin webmail auto forward - Settings cog > Email > Auto Forward > on, address, Keep a copy, Apply changes (Virgin help).
  A mailbox already moved to Junara uses imap.junara.com and the Junara password - a different conversation, so "text us first".
"""
import build_pages as bp
from virgin_launch import TASK_TRUST, TASK_PHONE_CSS, ADDR_SLUG, JUNARA, MOVE_STEPS, independent_byline, INDEPENDENT_SERVICE

SLUG = MOVE_STEPS.strip("/")   # /move-my-virgin-email/
# The owner's price for this move (GBP per email address). Empty: the page says the price is agreed first.
PHONE_MOVE_PRICE = "60"
SMS, SMS_SHOW = "+447520615332", "07520 615332"
TEL, TEL_SHOW = "+441202775566", "01202 775566"

FAQS = [
    ("Do I need a computer?",
     "No. You do the steps on this page on your iPhone, iPad or Android phone. We do the move itself on our own "
     "computers, and nothing is ever installed on your phone or tablet."),
    ("Is it safe to text you the two codes?",
     "They are app passwords: they only work in email programs, they can&rsquo;t be used to sign in to your Virgin or "
     "Google account or change anything, and you cancel both when we&rsquo;re done (steps 7 and 10). Never send us your "
     "normal passwords. Once we&rsquo;ve told you both codes work, you can delete the text."),
    ("How will I know everywhere I&rsquo;ve used my old email address?",
     "That&rsquo;s what your change list is for. While we copy your email, we note every organisation that has written "
     "to your old address. When the move is done we send you the list as a PDF, with banks, insurance, health, the "
     "council and bills first, and a box to tick for each. It also reminds you of the ones that often write by post, "
     "like your pension and the DVLA."),
    ("Will I lose any email?",
     "No. Nothing in your Virgin mailbox is deleted, moved or marked as read: we only copy it. Every folder arrives in "
     "Gmail under a label called Virgin Media, with its dates and read and unread kept. Spam and Bin are left out."),
    ("Why does my iPhone or iPad ask for my Virgin password?",
     "Virgin gives each mailbox just one app password, shared by every email app you use, and making a new one (step 5) "
     "cancels the old one. So a Mail app that was using the old one asks again. Type the new code in and it carries on "
     "as before: the same code works in your Mail app and for us at the same time. You can also read your email at "
     "mail.virginmedia.com."),
    ("What if I can&rsquo;t find the app password in the My Virgin Media app?",
     "Virgin only offers it for the main email address on the account, not for extra mailboxes. That&rsquo;s why step 1 "
     "checks for it first. If it isn&rsquo;t there, stop and text us. With a Windows PC we can still move it another way. "
     "With only a phone or tablet, we&rsquo;ll tell you straight if there&rsquo;s no way to do it."),
    ("What if I get stuck?",
     "Stop at that step and text or ring us: nothing is lost by stopping. Most people get stuck on Google&rsquo;s 2-Step "
     "Verification, and we can talk you through it."),
    ("My mailbox has already moved to Junara",
     "Then you don&rsquo;t need the Virgin code. Text us before you start: the move still works, but the steps are "
     "different. <a href=\"" + JUNARA + "\">What the Junara change means</a>."),
]


def _step(n, title, body, tag=""):
    t = f' <span class="vr-tag">{tag}</span>' if tag else ""
    return (f'          <li class="vr-step" id="step-{n}"><span class="vr-n" aria-hidden="true">{n}</span>'
            f'<div class="vr-b"><h3 class="vr-h3">{title}{t}</h3>{body}</div></li>')


CSS = """    <style>
      .vr .dh-in{max-width:860px}
      .vr-three{list-style:none;margin:1.2rem 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem}
      .vr-three li{padding:1rem 1.1rem;border-radius:16px;border:1px solid var(--hp-edge);background:var(--hp-card);color:var(--hp-body);font-size:.97rem;line-height:1.5}
      .vr-three b{display:block;color:var(--hp-ink);font-size:1.05rem;margin-bottom:.25rem}
      .vr-three .vr-time{display:block;margin-top:.45rem;font-size:.86rem;color:var(--hp-soft)}
      .vr-steps{list-style:none;margin:1.2rem 0 0;padding:0;display:grid;gap:.85rem}
      .vr-step{display:flex;gap:.9rem;align-items:flex-start;padding:1.05rem 1.15rem;border-radius:18px;border:1px solid var(--hp-edge);background:var(--hp-card)}
      .vr-n{flex:0 0 auto;width:2.3rem;height:2.3rem;border-radius:50%;background:#1d97e3;color:#fff;font-weight:700;font-size:1.1rem;display:flex;align-items:center;justify-content:center}
      .vr-b{min-width:0;flex:1 1 auto}
      .vr-h3{margin:.2rem 0 .45rem;font-size:1.12rem;line-height:1.35;color:var(--hp-ink)}
      .vr-b p{margin:.35rem 0 0;color:var(--hp-body);font-size:1rem;line-height:1.6}
      .vr-b p.vr-small{font-size:.92rem;color:var(--hp-soft)}
      .vr-path{display:inline;font-weight:700;color:var(--hp-ink)}
      .vr-tag{display:inline-block;vertical-align:middle;margin-left:.35rem;padding:.1rem .55rem;border-radius:999px;border:1px solid var(--hp-edge);font-size:.78rem;font-weight:600;color:var(--hp-soft)}
      .vr-warn{margin:1.2rem 0 0;padding:1rem 1.15rem;border-radius:16px;border:1px solid rgba(224,179,65,.55);background:rgba(224,179,65,.08);color:var(--hp-body);font-size:1rem;line-height:1.6}
      .vr-warn b{color:var(--hp-ink)}
      .vr-check{margin:1rem 0 0;padding:0;list-style:none;display:grid;gap:.55rem}
      .vr-check li{position:relative;padding-left:1.9rem;color:var(--hp-body);font-size:1rem;line-height:1.55}
      .vr-check li::before{content:"\\2713";position:absolute;left:0;top:.05rem;width:1.35rem;height:1.35rem;border-radius:50%;background:rgba(0,206,27,.16);color:#00ce1b;font-weight:700;font-size:.85rem;display:flex;align-items:center;justify-content:center}
      .vr-check b{color:var(--hp-ink)}
      .vr-send{margin:1.1rem 0 0;display:flex;flex-wrap:wrap;gap:.7rem 1rem;align-items:center}
      .vr-send .button{margin:0}
      .vr-text{margin:.8rem 0 0;padding:.9rem 1rem;border-radius:14px;border:1px dashed var(--hp-edge);color:var(--hp-body);font-size:.97rem;line-height:1.7}
      .vr-text span{display:block}
      .vr-pay{margin:1.1rem 0 0;color:var(--hp-body);font-size:1rem;line-height:1.6}
      .vr a:not(.button){color:var(--cyan-soft)}
      .vr-b,.vr-check li,.vr-three li,.vr-warn{overflow-wrap:anywhere}   /* myaccount.google.com/apppasswords on a big-text phone */
      .vr .vr-small{font-size:.92rem}
      /* the change list preview: a white "sheet", as the printed list looks */
      .cl-card{margin:1.2rem 0 0;padding:1.05rem 1.2rem .9rem;border-radius:16px;background:#fff;color:#14213d;box-shadow:0 18px 40px -22px rgba(0,0,0,.6);max-width:560px}
      .cl-h{margin:0 0 .45rem;font-size:.8rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1d97e3}
      .cl-rows{list-style:none;margin:0;padding:0}
      .cl-rows li{display:flex;flex-wrap:wrap;align-items:center;gap:.25rem .6rem;padding:.5rem 0;border-bottom:1px solid #e3e9f2}
      .cl-box{flex:0 0 auto;width:16px;height:16px;border:2px solid #14213d;border-radius:3px}
      .cl-who{flex:1 1 auto;min-width:0;font-weight:700;overflow-wrap:anywhere}
      .cl-n{font-size:.85rem;color:#55607a}
      .cl-more{margin:.6rem 0 0;font-size:.88rem;color:#55607a}
      .cl-eg{margin:.45rem 0 0;font-size:.75rem;color:#8a93a8;text-align:right}
      @media (max-width:420px){.cl-n{flex-basis:100%;padding-left:calc(16px + .6rem)}}
      @media (max-width:760px){.vr-three{grid-template-columns:1fr}}
      @media (max-width:420px){.vr-step{flex-direction:column;gap:.55rem;padding:.95rem}.vr-send .button{flex:1 1 100%;justify-content:center;text-align:center}}
    </style>"""


def virgin_phone_page():
    name = "We Move Your Virgin Email"
    desc = ("Virgin Media, blueyonder, ntlworld or virgin.net email moved to Gmail from your iPhone, iPad, Android or PC. "
            "£60, with a list of every place to update.")
    crumbs = bp.bc_sub("Email Support", "/email-support/", name)
    head = "    " + TASK_PHONE_CSS + "\n" + bp.task_head(
        crumbs, 'Move your Virgin email to Gmail, <em class="grad grad--cyan">no computer needed</em>',
        "Do these steps on your iPhone, iPad, Android phone or computer, then text us two codes. We move every email into "
        "Gmail for you, and give you a list of every place that has your old address.",
        trust=TASK_TRUST[:2] + ["Nothing on Virgin is deleted"])
    head = independent_byline(head, INDEPENDENT_SERVICE)   # 1 Nov 2026: Netcraft / Edge, see virgin_launch.py
    price = (f"The move costs <b>&pound;{PHONE_MOVE_PRICE} per email address</b>, agreed before we start."
             if PHONE_MOVE_PRICE else "We agree the price with you before we start.")
    overview = f'''    <section class="dh dh-sec vr" id="how" aria-labelledby="how-title">
      <div class="dh-in">
        <p class="dh-kicker">How it works</p>
        <h2 class="dh-h2" id="how-title">Three parts, and you only do two of them</h2>
        <ol class="vr-three">
          <li><b>1. Get ready</b>Steps 1 to 3: the app, a Gmail address and Google&rsquo;s security check.<span class="vr-time">Once, any time &middot; about 15 minutes</span></li>
          <li><b>2. Make two codes and text them to us</b>Steps 4 to 6, all in one go.<span class="vr-time">On a weekday &middot; about 5 minutes</span></li>
          <li><b>3. We do the move</b>We copy every folder into Gmail and send you your <a href="#change-list">change list</a>: every place to give your new address. Then steps 7 to 11.<span class="vr-time">A few days, without you</span></li>
        </ol>
        <p class="vr-pay">{price} We send the invoice when the move is finished, and you pay by bank transfer.</p>
        <p class="vr-warn" style="border-color:var(--hp-edge);background:var(--hp-card)"><b>No Windows PC, just a phone, tablet or Mac?</b> This is the way: our app is for Windows PCs, so we do the move for you, on our own computers. <b>Got a Windows PC and want to do it yourself?</b> Our free <a href="/virgin-email-mover/">365 PC Manager</a> app moves it for you, free.</p>
        <h3 class="vr-h3" style="margin-top:1.4rem">Before you start, check this is for you</h3>
        <ul class="vr-check">
          <li>Your address ends in <b>virginmedia.com, blueyonder.co.uk, ntlworld.com or virgin.net</b>.</li>
          <li>It&rsquo;s the <b>main email on your Virgin Media account</b>. Virgin won&rsquo;t make the code we need for an extra mailbox on the account, so if yours is an extra one, text us first.</li>
          <li>You can <b>sign in to the My Virgin Media app</b>. Virgin only makes the code in that app.</li>
          <li>Your mailbox <b>hasn&rsquo;t moved to Junara</b> yet. If it has, text us first: it still works, but the steps are different.</li>
          <li>You have a <b>mobile phone</b> for Google&rsquo;s security texts.</li>
        </ul>
      </div>
    </section>'''
    part1 = "\n".join([
        f'''    <section class="dh dh-sec vr" id="get-ready" aria-labelledby="ready-title" style="padding-top:0">
      <div class="dh-in">
        <p class="dh-kicker">Part 1 &middot; any time</p>
        <h2 class="dh-h2" id="ready-title">Get ready</h2>
        <ol class="vr-steps" start="1">''',
        _step(1, "Get the My Virgin Media app and sign in",
              "<p>On an iPhone, find <b>My Virgin Media</b> in the App Store. On an Android phone, find it in Google Play. "
              "Sign in with your My Virgin Media username and password.</p>"
              # Tom Wilson's app had no app-password option (Sep 2026): a SECOND mailbox on the account. Find out here,
              # in five minutes, not after the rest - and without generating one (that would break their Mail app).
              "<p><b>Then check the code is on offer.</b> Tap <span class=\"vr-path\">Account settings</span>, then "
              "<span class=\"vr-path\">Account details</span>, and look under Virgin Media Mail for "
              "<b>Manage your Virgin Media Mail app password</b>. Don&rsquo;t tap Generate yet. If it isn&rsquo;t there, "
              "stop and text us: Virgin only offers it for the main email on the account.</p>"
              "<p class=\"vr-small\">Only have an iPad? Look for it in the App Store on your iPad. If it isn&rsquo;t there, or "
              "it won&rsquo;t sign you in, text us before going any further.</p>", "iPhone, iPad, Android"),
        _step(2, "Have a Gmail address",
              "<p>Already use Gmail? Skip this step.</p>"
              "<p>If not, make one in the <b>Gmail</b> app or at <b>accounts.google.com</b>. Choose an address you&rsquo;re "
              "happy to keep for good, and keep its password safe.</p>"),
        _step(3, "Turn on Google&rsquo;s 2-Step Verification",
              "<p>Google only gives out the code we need once this is on. Open <b>myaccount.google.com</b>, search for "
              "<span class=\"vr-path\">2-Step Verification</span> and follow the steps. Google texts a code to your mobile "
              "to check it&rsquo;s you.</p>"
              "<p><b>Then check Google will make the code.</b> Open <b>myaccount.google.com/apppasswords</b>. If you see a "
              "box to type an app name, you&rsquo;re ready: don&rsquo;t create one yet. If it says the setting isn&rsquo;t "
              "available for your account, text us.</p>"
              "<p class=\"vr-small\">Already on? Skip this step. Google&rsquo;s own help: "
              "<a href=\"https://support.google.com/accounts/answer/185839\" target=\"_blank\" rel=\"noopener\">turn on 2-Step Verification</a>. "
              "This is the step most people get stuck on: text us if you do.</p>"),
        '''        </ol>
      </div>
    </section>'''])
    part2 = "\n".join([
        f'''    <section class="dh dh-sec vr" id="codes" aria-labelledby="codes-title" style="padding-top:0">
      <div class="dh-in">
        <p class="dh-kicker">Part 2 &middot; on a weekday, all in one go</p>
        <h2 class="dh-h2" id="codes-title">Make two codes and text them to us</h2>
        <p class="vr-warn"><b>Do steps 4, 5 and 6 together, Monday to Friday, 9 to 5,</b> so we can start straight away. Virgin gives each mailbox only one code, shared by all your email apps, so making a new one (step 5) cancels the old one. If the Mail app on your iPhone or iPad then asks for your Virgin password, type the new code in there too: the same code works for your Mail app and for us at the same time.</p>
        <ol class="vr-steps" start="4">''',
        _step(4, "Make your Google code",
              "<p>Open <b>myaccount.google.com/apppasswords</b> and sign in if it asks. Type a name such as "
              "<b>365 Mail Mover</b> and tap <span class=\"vr-path\">Create</span>.</p>"
              "<p>Google shows a code of 16 letters. Copy it (press and hold it, then tap Copy) or write it down before you "
              "close the box.</p>"),
        _step(5, "Make your Virgin code",
              "<p>In the My Virgin Media app, tap <span class=\"vr-path\">Account settings</span>, then "
              "<span class=\"vr-path\">Account details</span>. Under Virgin Media Mail, tap "
              "<span class=\"vr-path\">Manage</span>, then <span class=\"vr-path\">Generate new App password</span>.</p>"
              "<p>Copy the password it shows, or write it down.</p>"
              "<p class=\"vr-small\">If your Mail app asks for your Virgin password afterwards, type this same code in there.</p>"),
        _step(6, "Text us both codes",
              f"<p>Send one text to <b>{SMS_SHOW}</b> with these four things:</p>"
              "<p class=\"vr-text\"><span>Your Virgin email address</span><span>Your Gmail address</span>"
              "<span>The Google code (16 letters)</span><span>The Virgin code</span></p>"
              f"<div class=\"vr-send\"><a class=\"button primary\" href=\"sms:{SMS}\">Text us: {SMS_SHOW}</a>"
              f"<a class=\"button secondary\" href=\"tel:{TEL}\">Or ring {TEL_SHOW} and read them out</a></div>"
              "<p class=\"vr-small\">Only ever send these two codes, never your normal passwords. They only work in email "
              "programs, and you cancel both when we&rsquo;re done.</p>"),
        '''        </ol>
      </div>
    </section>'''])
    part3 = '''    <section class="dh dh-sec vr" id="we-move-it" aria-labelledby="move-title" style="padding-top:0">
      <div class="dh-in">
        <p class="dh-kicker">Part 3 &middot; we take it from here</p>
        <h2 class="dh-h2" id="move-title">What we do</h2>
        <ul class="vr-check">
          <li><b>We check both codes straight away</b>, and text you if one doesn&rsquo;t work.</li>
          <li><b>We copy every folder off Virgin</b>, usually within the hour. Nothing on Virgin is deleted, moved or marked as read. Spam and Bin are left out.</li>
          <li><b>Gmail takes them in over the next few days</b>, because Google limits how much it accepts each day. They appear under a label called <b>Virgin Media</b>, with their folders, dates, and read and unread kept.</li>
          <li><b>We send you your change list</b>: every organisation that emails your old address, the important ones first (more below).</li>
          <li><b>We text you when it&rsquo;s finished</b>, after checking every folder arrived.</li>
        </ul>
      </div>
    </section>'''
    # owner, 31 Oct 2026: "their whole life set up on it ... it's like changing your telephone number" - the part that
    # worries older customers most, so the page shows it. Mail Mover v2.6 Write-ChangeList makes it from senders.json.
    sample = [("Your bank", "214", "Oct 2026"), ("Your building society", "96", "Oct 2026"), ("Home insurance", "38", "Sep 2026"),
              ("Your GP surgery", "18", "Oct 2026"), ("The council", "15", "Sep 2026"), ("Your energy supplier", "72", "Oct 2026")]
    rows = "".join(f'<li><span class="cl-box" aria-hidden="true"></span><span class="cl-who">{w}</span><span class="cl-n">{n} emails &middot; last {d}</span></li>' for w, n, d in sample)
    changelist = f'''    <section class="dh dh-sec vr" id="change-list" aria-labelledby="cl-title" style="padding-top:0">
      <div class="dh-in">
        <p class="dh-kicker">Included with your move</p>
        <h2 class="dh-h2" id="cl-title">Your change list: every place that has your old address</h2>
        <p class="dh-lede">If you&rsquo;ve had your Virgin address for years, your bank, your doctor, the council and your energy supplier all write to it. Changing it can feel like changing your phone number, so we make it easy to see what needs doing.</p>
        <p class="vr-pay">While we copy your email, we note every organisation that has written to your old address. When the move is done we send you the list, the important ones first, with a box to tick as you give each one your new address. It comes as a PDF you can print or keep on your tablet.</p>
        <div class="cl-card" role="img" aria-label="A made-up example of the change list: your bank, your building society, home insurance, your GP surgery, the council and your energy supplier, each with a tick box">
          <p class="cl-h">Do these first</p>
          <ul class="cl-rows">{rows}</ul>
          <p class="cl-more">&hellip; then shopping, apps and subscriptions, travel and everyone else.</p>
          <p class="cl-eg">A made-up example</p>
        </div>
        <h3 class="vr-h3" style="margin-top:1.3rem">What&rsquo;s on it</h3>
        <ul class="vr-check">
          <li><b>Every organisation that emails you</b>, grouped: banks and money, insurance and pensions, health, government and council, and bills first.</li>
          <li><b>How many emails each has sent, and when the last one came</b>, so you can see which matter.</li>
          <li><b>The ones you haven&rsquo;t heard from in years</b>, set apart: probably no longer needed.</li>
          <li><b>A reminder of the ones that often write by post</b>, like your pension, the DVLA and your GP, so nothing is missed.</li>
          <li><b>How to change it safely</b>: always on their own website or app, never through a link in an email or text.</li>
        </ul>
        <p class="vr-small" style="margin-top:.8rem;color:var(--hp-soft)">Friends and family aren&rsquo;t listed: we just tell you how many people write to you, and the easy way to give them all your new address at once.</p>
      </div>
    </section>'''
    part4 = "\n".join([
        f'''    <section class="dh dh-sec vr" id="after" aria-labelledby="after-title" style="padding-top:0">
      <div class="dh-in">
        <p class="dh-kicker">Part 3 &middot; when we text you</p>
        <h2 class="dh-h2" id="after-title">Finish off</h2>
        <ol class="vr-steps" start="7">''',
        _step(7, "Cancel the Virgin code",
              "<p>Do this as soon as we text that your email is copied. In the My Virgin Media app, go back to the same place "
              "as step 5 and tap <span class=\"vr-path\">Generate new App password</span> again. Making it cancels the code "
              "you sent us.</p>"
              "<p class=\"vr-small\">Still reading your Virgin email in your phone or tablet&rsquo;s Mail app? Type this "
              "newest code in there when it asks.</p>", "when we say it&rsquo;s copied"),
        _step(8, "Read your email in Gmail",
              "<p>Install the <b>Gmail</b> app from the App Store or Google Play and sign in. Your old emails appear under "
              "<b>Virgin Media</b> as Gmail takes them in.</p>"),
        _step(9, "Send new Virgin email on to Gmail",
              "<p>In Safari or Chrome, go to <b>mail.virginmedia.com</b> and sign in. Tap the "
              "<span class=\"vr-path\">Settings</span> cog, then <span class=\"vr-path\">Email</span>, then "
              "<span class=\"vr-path\">Auto Forward</span>. Switch it on, type your Gmail address, switch on "
              "<span class=\"vr-path\">Keep a copy</span>, and tap <span class=\"vr-path\">Apply changes</span>.</p>"
              "<p class=\"vr-small\">Stuck? Text us and we&rsquo;ll talk you through it.</p>"),
        _step(10, "Cancel the Google code",
              "<p>When we text that the move is finished, open <b>myaccount.google.com/apppasswords</b> and tap the bin "
              "next to <b>365 Mail Mover</b>.</p>", "when it&rsquo;s finished"),
        _step(11, "Work through your change list",
              "<p>Give each place on your <a href=\"#change-list\">change list</a> your new address, the important ones first, "
              "and tick them off. There&rsquo;s no rush to do them all in one day.</p>"
              f"<p class=\"vr-small\">More help: <a href=\"/{ADDR_SLUG}/\">change your email address everywhere</a>.</p>"),
        '''        </ol>
      </div>
    </section>'''])
    content = "\n".join([head, CSS, overview, part1, part2, part3, changelist, part4, bp.faq_html(FAQS),
                         bp.cta("Stuck on a step?", "Stop where you are and text or ring us. Real people answer, Monday to Friday, 9 to 5.",
                                primary=(f"Text us: {SMS_SHOW}", f"sms:{SMS}"), secondary=(f"Call {TEL_SHOW}", f"tel:{TEL}"))])

    def schema(s, _d=desc, _n=name):
        return bp.graph([bp.crumb_sub(s, "Email Support", "email-support", _n), bp.webpage(s, _n, _d), bp.faqpage(s, FAQS)])

    # public (31 Oct 2026): indexed, in the sitemap and the site search
    bp.add(slug=SLUG, title="We Move Your Virgin Email to Gmail From Any Device", desc=desc,
           og_title="We move your Virgin email to Gmail, from any device", schema=schema, content=content)
