"""Tips by email (10 Oct 2026). Owner: "yes, build the website sign-up box".

365 Techies' own newsletter goes out from Techies One Mail on the office PC, and UK law (PECR) says a business mailing
only goes to people who agreed. This box is how people agree: an unticked "yes" box, then a "please confirm" email whose
button (on our own page, api/t1-signup.php) is the agreement itself. The app collects confirmed sign-ups from the
server and the server forgets them - see api/t1-signup-lib.php for the whole story.

BOX goes under every advice article (build_blog.make_post) and on /tips-by-email/, the page the confirm emails and the
"sign up again" links point at. The page is noindex: a sign-up form is not something anyone searches for.

The box sits between <!--tbe--> markers so the content hash can strip it (build_pages._VOLATILE): adding it to ~95
articles must not tell Google they all changed today. Keep the markers if you edit it.

The tick-box words are the consent record. They must match SU_CONSENT in api/t1-signup-lib.php word for word, and if
they change, SU_CONSENT gets a new date so every sign-up records what that person actually agreed to.
"""
import build_extra as _bx

CONSENT = ("Yes, please send me 365 Techies&rsquo; tips, news and offers by email, about once a month. "
           "I can unsubscribe at any time.")

BOX = r'''<!--tbe-->
    <section class="section tbe" aria-label="Tips by email" id="tips">
      <div class="wrap" style="max-width:680px">
        <form id="tbe-form" novalidate style="max-width:540px;margin:0 auto;display:flex;flex-direction:column;gap:.7rem;background:rgba(125,170,220,.05);border:1px solid rgba(125,170,220,.22);border-radius:16px;padding:1.4rem">
          <p class="mono" style="margin:0;color:var(--muted);font-size:.7rem;letter-spacing:.07em">// FREE &middot; TIPS BY EMAIL</p>
          <h2 style="margin:0;font-size:1.35rem;line-height:1.25">Get our tips by email</h2>
          <p style="margin:0;color:var(--muted)">About once a month: scams doing the rounds locally, simple fixes for everyday computer problems, and news and offers from us. Plain English, from the same family-run team since 1995.</p>
          <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" />
          <label for="tbe-name" class="mono" style="font-size:.68rem;letter-spacing:.06em;color:var(--muted)">YOUR FIRST NAME (OPTIONAL)</label>
          <input id="tbe-name" type="text" autocomplete="given-name" maxlength="80" style="width:100%;padding:.75rem .9rem;border-radius:10px;border:1px solid rgba(125,170,220,.32);background:rgba(10,20,40,.5);color:inherit;font:inherit;box-sizing:border-box" />
          <label for="tbe-email" class="mono" style="font-size:.68rem;letter-spacing:.06em;color:var(--muted)">YOUR EMAIL ADDRESS</label>
          <input id="tbe-email" type="email" required autocomplete="email" maxlength="160" placeholder="you@example.com" style="width:100%;padding:.75rem .9rem;border-radius:10px;border:1px solid rgba(125,170,220,.32);background:rgba(10,20,40,.5);color:inherit;font:inherit;box-sizing:border-box" />
          <label for="tbe-agree" style="display:flex;gap:.6rem;align-items:flex-start;cursor:pointer;line-height:1.45;margin-top:.2rem">
            <input id="tbe-agree" type="checkbox" style="flex:0 0 auto;width:1.25rem;height:1.25rem;margin:.12rem 0 0;accent-color:var(--cyan,#2bb3ff)" />
            <span>''' + CONSENT + r'''</span>
          </label>
          <button type="submit" id="tbe-go" class="button primary button--lg" style="width:100%;margin-top:.3rem">Send me the tips &#8594;</button>
          <p id="tbe-msg" role="status" aria-live="polite" style="margin:0;min-height:1em;font-size:.95rem;text-align:center"></p>
          <p style="margin:0;text-align:center;color:var(--muted);font-size:.85rem">We email you first to check it&rsquo;s really you. Your details stay with 365 Techies, never sold or shared. <a href="/privacy-policy/#tips-by-email" style="color:var(--cyan-soft,#6cc4f5);text-decoration:underline">How we look after them</a>.</p>
        </form>
      </div>
    </section>
    <script>
      (function () {
        var f = document.getElementById('tbe-form'); if (!f) return;
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var em = document.getElementById('tbe-email'), nm = document.getElementById('tbe-name'), ag = document.getElementById('tbe-agree'),
              btn = document.getElementById('tbe-go'), msg = document.getElementById('tbe-msg');
          function say(t) { msg.textContent = t; msg.style.color = 'var(--pbad,#e8637e)'; }
          var ev = (em.value || '').trim();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ev)) { say('Please pop in your email address.'); em.focus(); return; }
          if (!ag.checked) { say('Please tick the box to say yes.'); ag.focus(); return; }
          btn.disabled = true; var lbl = btn.textContent; btn.textContent = 'Sending…'; msg.textContent = '';
          fetch('/api/t1-signup.php', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ev, name: (nm.value || '').trim(), agree: true, website: (f.website && f.website.value) || '', page: location.pathname }) })
            .then(function (r) { return r.json(); })
            .then(function (d) {
              if (d && d.ok) {
                var box = document.createElement('div'); box.setAttribute('role', 'status'); box.style.cssText = 'text-align:center;padding:.4rem 0';
                var big = document.createElement('p'); big.style.cssText = 'font-size:1.2rem;font-weight:700;margin:0 0 .4rem;color:var(--pgood,#00ce1b)'; big.textContent = 'Nearly there! Please check your email.';
                var p1 = document.createElement('p'); p1.style.margin = '0 0 .4rem'; p1.appendChild(document.createTextNode('We’ve sent an email to '));
                var b = document.createElement('strong'); b.textContent = ev; p1.appendChild(b); p1.appendChild(document.createTextNode('. Open it and press the button to say yes.'));
                var p2 = document.createElement('p'); p2.style.cssText = 'margin:0;color:var(--muted);font-size:.92rem'; p2.textContent = 'Not there in a few minutes? Have a look in your junk or spam folder. Nothing is sent until you press that button.';
                box.appendChild(big); box.appendChild(p1); box.appendChild(p2); f.replaceChildren(box);
                try { if (typeof gtag === 'function') gtag('event', 'tips_signup', { page: location.pathname }); } catch (_e) {}
              } else {
                btn.disabled = false; btn.textContent = lbl;
                say(d && d.error === 'email' ? 'That email address doesn’t look quite right. Please check it.'
                  : d && d.error === 'agree' ? 'Please tick the box to say yes.'
                  : d && d.error === 'rate' ? 'One moment, please try again shortly.'
                  : 'Sorry, that didn’t go through. Please try again, or call us on 01202 775566.');
              }
            })
            .catch(function () { btn.disabled = false; btn.textContent = lbl; say('Couldn’t reach us just now. Please try again.'); });
        });
      })();
    </script>
<!--/tbe-->'''

_INNER = '''          <h2>What you get</h2>
          <ul>
            <li><strong>Scam warnings</strong>: the calls, texts and emails our customers in Bournemouth, Christchurch and Poole are actually getting, and what they look like.</li>
            <li><strong>Simple fixes</strong> for the things we get asked about most: slow computers, printers, Wi-Fi, email and passwords.</li>
            <li><strong>News and offers</strong>: new free tools and courses, what we&rsquo;re up to, and now and then an offer on our services.</li>
          </ul>
          <h2>How often</h2>
          <p>About once a month. Every email has an unsubscribe link at the bottom, and you can also just reply &ldquo;STOP&rdquo;.</p>
          <h2>Your details</h2>
          <p>We send our tips ourselves, from our own office, not through a mailing-list company. We never sell it or share it. We don&rsquo;t put anything in our emails that tracks whether you open them. The <a href="/privacy-policy/#tips-by-email">privacy policy</a> has the full details.</p>
          <p>Need help now rather than tips? Call us on <a href="tel:+441202775566">01202 775566</a> or <a href="/contact/">send us a message</a>.</p>'''

_FAQS = [
    ("Why do I have to confirm by email?",
     "So that nobody can sign you up without you knowing. Until you press the button in our email, you are not on the list, and if you never press it we forget your address after a week."),
    ("I signed up but no email came. What now?",
     "Give it a few minutes, then look in your junk or spam folder. It comes from info@365techies.co.uk. Still nothing? Call us on 01202 775566 and we will sort it out."),
    ("How do I stop the emails?",
     "Press the unsubscribe link at the bottom of any of our emails, or reply STOP. Either way, we take you off the list."),
    ("Do I need to be a customer?",
     "No. Anyone is welcome, wherever you are. Our scam warnings are written with Dorset in mind, but the advice works anywhere."),
]

_bx.info_page(
    slug="tips-by-email", crumb_name="Tips by email",
    h1="Free tips by email",
    eyebrow="// TIPS BY EMAIL",
    lede="Free tips from 365 Techies, about once a month: local scam warnings, simple fixes, and news and offers from us. In plain English, and you can stop them at any time.",
    desc="Sign up for free tips by email from 365 Techies: local scam warnings, simple computer fixes, news and offers, about once a month. Unsubscribe at any time.",
    chips=["Free", "About once a month", "Unsubscribe any time"],
    pre=BOX, inner=_INNER, faqs=_FAQS, task=True, robots="noindex,follow",
)
