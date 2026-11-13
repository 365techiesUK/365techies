# -*- coding: utf-8 -*-
"""/is-outlook-down/ (13 Nov 2026). Owner, the day after the Microsoft 365 outage of 12-13 Nov 2026: people are searching
"is outlook down" (Bing, 3 months to 10 Nov, BEFORE the outage: 18.5K impressions, UK 1.4K; "outlook outage" 29K,
"microsoft outage" 15K, "outlook down" 9K, "is microsoft down" 6K) and we had 60+ Outlook fix pages but none that answers
that question. One page, not a family: the live answer (Microsoft's own feed through our /api/status-check.php, the same
feed /is-it-down/ reads, plus a reach test from the visitor's browser), then what to do either way.

Facts checked 13 Nov 2026 and what is NOT claimed:
- Microsoft said it found no malicious activity: never "hacked".
- Microsoft's support page: the new Outlook syncs Gmail and Yahoo accounts to the Microsoft Cloud.
- Techies One Mail cannot reach an Outlook.com / Hotmail / Microsoft 365 mailbox while Microsoft is down. Said on the page.
- Colours are tokens only, so the light and dark themes both hold.
"""
import yt_watch
import techies_one_boxes as t1b

SLUG = "is-outlook-down"

# the Techies One Mail box (techies_one_boxes.insert places it after the section with this id)
t1b.PAGES[SLUG] = (t1b.ALT, "Keep a plan B for next time",
    "Our free Techies One Mail for Windows PCs reads your email straight from your provider, with nothing of Microsoft&rsquo;s "
    "in between. If your address is Gmail, Yahoo, BT, Sky or Virgin Media, it carries on when Outlook can&rsquo;t.",
    "It can&rsquo;t reach an Outlook.com, Hotmail or Microsoft 365 work mailbox while Microsoft itself is down: nothing can. "
    "Gmail, Yahoo, AOL and Virgin Media need an app password.")
t1b.PLACE_AFTER[SLUG] = "iod-video"

LIVE = '''    <section class="section section--alt" aria-label="Live Outlook status" id="iod-live">
      <div class="wrap" style="max-width:880px">
        <style>
        .iod{border:1px solid var(--line);border-radius:18px;background:var(--glass);padding:1.3rem 1.4rem}
        .iod__row{display:flex;gap:.9rem;align-items:flex-start;padding:.7rem 0;border-top:1px solid var(--line)}
        .iod__row:first-of-type{border-top:0;padding-top:.2rem}
        .iod__dot{flex:0 0 auto;width:1.05rem;height:1.05rem;border-radius:50%;margin-top:.3rem;background:var(--muted)}
        .iod__dot.ok{background:var(--ok)}.iod__dot.warn{background:var(--warn)}.iod__dot.down{background:var(--bad)}
        .iod__t{margin:0;font-weight:700;font-size:1.12rem;color:var(--ink)}
        .iod__d{margin:.2rem 0 0;color:var(--muted);font-size:.98rem;line-height:1.5}
        .iod__foot{margin:.9rem 0 0;font-size:.86rem;color:var(--muted)}
        .iod__btn{margin-top:.9rem}
        </style>
        <h2 class="section-title" data-title>Right now<span class="title-underline"></span></h2>
        <div class="iod" id="iod">
          <div class="iod__row"><span class="iod__dot" id="iod-ms-dot"></span><div>
            <p class="iod__t" id="iod-ms-t">Checking Microsoft&rsquo;s status feed&hellip;</p>
            <p class="iod__d" id="iod-ms-d">Microsoft publishes widespread Microsoft 365 problems on its public status page. We read it every couple of minutes.</p></div></div>
          <div class="iod__row"><span class="iod__dot" id="iod-you-dot"></span><div>
            <p class="iod__t" id="iod-you-t">Checking Outlook from your connection&hellip;</p>
            <p class="iod__d" id="iod-you-d">Your browser tries to reach Outlook on the web itself, so this is your line, not ours.</p></div></div>
          <p class="iod__foot"><span id="iod-when">Not checked yet.</span> Microsoft&rsquo;s own page: <a href="https://status.cloud.microsoft" target="_blank" rel="noopener">status.cloud.microsoft</a>. Its public feed lists widespread incidents only, so a problem with one account or one company won&rsquo;t show.</p>
          <p class="iod__btn"><button type="button" class="button secondary" id="iod-again">Check again</button> <a class="button secondary" href="/is-it-down/">Check 30 more services</a></p>
        </div>
        <noscript><p>The live check needs JavaScript. Microsoft&rsquo;s own status page is at <a href="https://status.cloud.microsoft">status.cloud.microsoft</a>.</p></noscript>
        <script>
        (function(){
          function $(i){return document.getElementById(i)}
          function set(p,cls,t,d){$('iod-'+p+'-dot').className='iod__dot '+cls;$('iod-'+p+'-t').textContent=t;if(d)$('iod-'+p+'-d').textContent=d}
          function feed(){
            if(!window.fetch){set('ms','','We couldn\\u2019t read the feed in this browser.','Open Microsoft\\u2019s status page below.');return}
            fetch('/api/status-check.php',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){
              var m=j&&j.ok&&j.services&&j.services.m365;
              if(!m){set('ms','','Microsoft\\u2019s feed didn\\u2019t answer just now.','Try again in a minute, or open Microsoft\\u2019s status page below.');return}
              if(m.s==='down'||m.s==='warn')set('ms',m.s==='down'?'down':'warn','Microsoft is reporting a problem with Microsoft 365.',m.d?('In Microsoft\\u2019s words: '+m.d):'Outlook, Teams and other Microsoft 365 services may be affected.');
              else if(m.s==='ok')set('ms','ok','Microsoft isn\\u2019t reporting a widespread problem.','If Outlook won\\u2019t work for you, it is more likely your account, your PC or your connection. The fixes are further down.');
              else set('ms','','Microsoft\\u2019s feed gave no clear answer.','Open Microsoft\\u2019s status page below.');
              var d=new Date();$('iod-when').textContent='Checked at '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+'.';
            }).catch(function(){set('ms','','We couldn\\u2019t read the feed just now.','Try again in a minute, or open Microsoft\\u2019s status page below.')});
          }
          function reach(){
            if(!window.fetch||!window.AbortController){set('you','','This browser can\\u2019t run the connection test.');return}
            var hosts=['outlook.office.com','outlook.live.com'],ok=0,done=0;
            hosts.forEach(function(h){var ac=new AbortController(),t=setTimeout(function(){ac.abort()},8000);
              fetch('https://'+h+'/favicon.ico',{mode:'no-cors',cache:'no-store',credentials:'omit',signal:ac.signal}).then(function(){ok++}).catch(function(){}).then(function(){clearTimeout(t);done++;
                if(done<hosts.length)return;
                if(ok===hosts.length)set('you','ok','Outlook on the web answers from your connection.','That only proves the front door opens. During an outage the sign-in page can load while mail still won\\u2019t arrive, so read Microsoft\\u2019s line above as well.');
                else if(ok)set('you','warn','Only part of Outlook on the web answered.','One of Outlook\\u2019s two web addresses didn\\u2019t reply from your connection.');
                else set('you','down','Outlook on the web didn\\u2019t answer from your connection.','If other websites open normally, the fault is at Microsoft\\u2019s end or somewhere between you and it.');
              })});
          }
          function run(){set('ms','','Checking Microsoft\\u2019s status feed\\u2026');set('you','','Checking Outlook from your connection\\u2026');feed();reach()}
          $('iod-again').addEventListener('click',run);run();setInterval(feed,120000);
        })();
        </script>
      </div>
    </section>
'''

VIDEO = '''    <section class="section" aria-label="Why a plan B helps" id="iod-video">
      <div class="wrap" style="max-width:880px">
        <h2 class="section-title" data-title>If your email is Gmail, it never stopped<span class="title-underline"></span></h2>
        <p>Outlook is a program for reading email. Your email itself lives with whoever gave you the address. If that is Google, Yahoo, BT, Sky or Virgin Media, a Microsoft outage doesn&rsquo;t touch it. What stops is the way in: the new Outlook reads Gmail and Yahoo accounts through Microsoft&rsquo;s own servers, so when those have a bad day your inbox can go quiet too.</p>
        <p>''' + yt_watch.button(yt_watch.OUTAGE_SHORT, "Watch: Outlook down? Your Gmail was fine (28 seconds)", "tall") + '''</p>
      </div>
    </section>
'''

INNER = '''
<h2 id="if-down">If Microsoft is down: what to do</h2>
<ol>
  <li><strong>Leave your settings alone.</strong> Don&rsquo;t change your password, remove your account or reinstall Outlook. None of that helps while the fault is at Microsoft&rsquo;s end, and it can leave you with a second problem once the service is back.</li>
  <li><strong>Work out where your email lives.</strong> Look at the address after the @ sign.
    <ul>
      <li><strong>gmail.com, yahoo.co.uk, btinternet.com, sky.com, virginmedia.com and the like:</strong> your email is with that provider and is still arriving. Read it on the provider&rsquo;s own website until Outlook is back: <a href="https://mail.google.com" target="_blank" rel="noopener">mail.google.com</a> for Gmail, <a href="https://mail.yahoo.com" target="_blank" rel="noopener">mail.yahoo.com</a> for Yahoo, and your provider&rsquo;s own sign-in page for the rest.</li>
      <li><strong>outlook.com, hotmail.com, live.co.uk, msn.com:</strong> your email is with Microsoft. No program, phone app or website can show it until Microsoft recovers.</li>
      <li><strong>A work or business address:</strong> if your firm uses Microsoft 365, it is with Microsoft too. Your IT person can see Microsoft&rsquo;s detailed notices in the Microsoft 365 admin centre.</li>
    </ul>
  </li>
  <li><strong>Don&rsquo;t expect the phone app to rescue you.</strong> Outlook on a phone talks to the same service. If the service is down, the app is down.</li>
  <li><strong>For anything urgent, ring or text.</strong> Tell the people who matter that your email is slow today.</li>
  <li><strong>Your emails are very unlikely to be lost.</strong> When a mail service can&rsquo;t accept a message, the sender&rsquo;s system keeps trying, usually for several days. Expect a backlog to arrive in a rush once things recover, possibly out of order.</li>
</ol>

<h2 id="if-you">If Microsoft says all is well: it is probably just you</h2>
<p>Microsoft&rsquo;s public feed shows widespread problems only. If it reads clear and Outlook still won&rsquo;t behave, start with the quickest test: open <a href="https://outlook.office.com" target="_blank" rel="noopener">outlook.office.com</a> (work) or <a href="https://outlook.live.com" target="_blank" rel="noopener">outlook.live.com</a> (personal) in your browser and sign in. If your email is there, your account is fine and the fault is the program on this PC. Then pick the page that matches what you see:</p>
<ul>
  <li><a href="/outlook-not-syncing/">Outlook isn&rsquo;t syncing or showing new email</a></li>
  <li><a href="/new-outlook-not-syncing/">The new Outlook isn&rsquo;t syncing</a></li>
  <li><a href="/outlook-keeps-asking-for-password/">Outlook keeps asking for your password</a></li>
  <li><a href="/outlook-cant-sign-in/">You can&rsquo;t sign in to Outlook</a></li>
  <li><a href="/outlook-not-responding/">Outlook is frozen or not responding</a></li>
  <li><a href="/outlook-wont-open-after-update/">Outlook won&rsquo;t open after an update</a></li>
  <li><a href="/outlook-not-sending-emails/">Emails won&rsquo;t send</a></li>
  <li><a href="/outlook-problems/">Every Outlook fix we&rsquo;ve written</a></li>
</ul>

<h2 id="nov-2026">The outage of 12 and 13 November 2026</h2>
<p>On Thursday 12 November 2026, from around midday US Eastern time, Outlook, Teams, SharePoint, OneDrive and Copilot began failing for Microsoft 365 users around the world. Problems ran into Friday 13 November, at least 18 hours for some people, before Microsoft reported that email delivery was returning to normal.</p>
<p>Microsoft&rsquo;s explanation was that the part of its servers that handles secure connections became overwhelmed and stopped processing requests. It said it had found no malicious activity behind the outage. It applied a configuration change and restarted the affected servers to recover.</p>
<p>We&rsquo;ll keep this section as a dated record. The live check at the top of the page is the one to trust for today.</p>
'''

FAQS = [
    ("Is Outlook down right now?",
     "The check at the top of this page reads Microsoft&rsquo;s own status feed and tests Outlook on the web from your connection, so it answers for this minute. Microsoft&rsquo;s public feed lists widespread incidents only: a fault with one account or one organisation won&rsquo;t appear there."),
    ("Will I lose emails sent to me while Outlook is down?",
     "It is very unlikely. When a mail service can&rsquo;t accept a message, the sender&rsquo;s system keeps trying, usually for several days. Messages sent to you during an outage normally arrive once the service recovers, sometimes late and out of order."),
    ("Can I still read my Gmail if Outlook is down?",
     "Yes. Gmail is Google&rsquo;s service, so sign in at mail.google.com. The new Outlook reads Gmail and Yahoo accounts through Microsoft&rsquo;s servers, which is why a Microsoft outage can stop them appearing in Outlook even though Gmail itself is working."),
    ("Does Outlook on my phone work when Outlook is down?",
     "Not if the fault is the Microsoft service. The phone app, the program on your PC and Outlook on the web all talk to the same servers. If only the program on your PC is broken, the phone app and the website will still work, which is a quick way to tell the two apart."),
    ("How long do Microsoft outages usually last?",
     "Most are over within a few hours. The outage that began on 12 November 2026 was unusually long, lasting at least 18 hours for some users before Microsoft reported that service was returning to normal."),
    ("Was the November 2026 outage a hack?",
     "Microsoft said it had found no malicious activity. Its explanation was that the part of its servers handling secure connections became overwhelmed and stopped processing requests."),
]


def add(info_page):
    info_page(
        slug=SLUG, crumb_name="Is Outlook Down?", eyebrow="OUTLOOK STATUS",
        h1='Is Outlook down, <em class="grad grad--green">or is it just you?</em>',
        title="Is Outlook Down? Live Microsoft 365 Status and What to Do",
        og_title="Is Outlook down, or is it just you? A live check",
        lede="A live check of Microsoft&rsquo;s own status feed, and of Outlook from your connection. Then what to do either way: when the fault is Microsoft&rsquo;s, and when it&rsquo;s your account or your PC.",
        desc="Is Outlook down right now? A live check of Microsoft's status feed and of Outlook from your own connection, what to do during a Microsoft 365 outage, and the fixes if it's just you.",
        chips=["Live check", "Microsoft&rsquo;s own feed", "Free, no sign-up"],
        hero_cta1=("See the live check", "#iod-live"), hero_cta2=("Call 01202 775566", "tel:+441202775566"),
        pre=LIVE + VIDEO, inner=INNER, faqs=FAQS)
