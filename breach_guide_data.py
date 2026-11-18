"""/data-breaches/ rework (18 Nov 2026): the "I've been told I'm in a breach - now what?" guide.

Why: Bing UK, 3 months to 15 Nov 2026: "have i been pwned" 11,091 exact (+ "haveibeenpwned" 1,792),
"data breach" 1,428 exact / 20,063 broad. People who find their email in a breach need the next steps,
in order; the old page was a short template. Used by make_threat(extra_html=...) in build_extra.py.
Claim limits: we are not connected with Have I Been Pwned; never promise compensation; a breach of a
company does not mean your PC is infected.
18 Nov 2026 (later): "Recent UK breaches" list ("asos hacked" = 14,948 Bing UK searches in the quarter). Only what each
company said it lost: ASOS Oct 2026 (its statement, via Malwarebytes/BleepingComputer), Manchester Airports Group Aug 2026
(as reported: 8.7M, emails/phones/registrations/postcodes, no payment data), Harrods Sep 2025 (430K records via a third
party), Co-op 2025 (all 6.5M members), M&S 2025. Keep it dated; add the next big one the day it lands.
"""

TITLE = "Found in a Data Breach? What to Do Next | 365 Techies"

H1 = 'Found in a <em class="grad grad--green">data breach</em>? What to do next'

LEDE = ("Have I Been Pwned, a company email or a warning in your browser says your details were leaked. "
        "Here&rsquo;s what it means, what to do first, and what you can safely ignore.")

DESC = ("Told your email is in a data breach, or Have I Been Pwned lists you? What it means and what to do, "
        "in order: email first, passwords, scams to expect. Plain English.")

WHAT_HTML = ("<p>A data breach is when personal information &mdash; email addresses, passwords, phone numbers, "
             "addresses, card details &mdash; is stolen from a company&rsquo;s systems. The lists are then sold "
             "or dumped online, where criminals use them to try the same passwords on other accounts and to "
             "write more convincing scams.</p>"
             "<p><strong>Being in a breach does not mean anyone is inside your computer or your accounts.</strong> "
             "It means one company lost some of your details. What you do next decides whether that one leak "
             "stays one leak.</p>")

GUIDE_HTML = '''    <section class="section" aria-label="What to do if you are in a breach" id="what-to-do">
      <div class="wrap">
        <div class="prose" data-reveal>
          <p class="eyebrow mono">// FOUND IN A BREACH</p>
          <h2 class="section-title" data-title>What to do, in order<span class="title-underline"></span></h2>
          <p>Most people find out one of three ways: they type their email into <strong>Have I Been Pwned</strong>
          and it lists one or more breaches; a company emails to say it was attacked; or Chrome, Edge or an
          iPhone warns that a saved password &ldquo;was found in a data breach&rdquo;. The steps are the same.
          Do them in this order and you&rsquo;ve done what matters.</p>
          <ol style="list-style:decimal;padding-left:1.4rem;margin:0 0 1.4rem;display:grid;gap:.6rem;line-height:1.6">
            <li><strong>Find out what was taken.</strong> Have I Been Pwned lists the &ldquo;compromised data&rdquo;
            for each breach; a company&rsquo;s notice should say too. An email address alone is a nuisance.
            Passwords, dates of birth or card details need action. (The list below says what to do for each.)</li>
            <li><strong>Secure your email account first.</strong> Your email can reset every other password, so
            it&rsquo;s the one that matters most. Give it a new password you use nowhere else, and switch on
            <a href="/how-to-set-up-two-factor-authentication/">two-step sign-in</a>. Then check its recent
            sign-in activity and forwarding rules for anything you don&rsquo;t recognise.</li>
            <li><strong>Change the leaked password everywhere you used it.</strong> On the breached site, and on
            every other account where you used the same or a similar password. This is the step that stops
            criminals walking into your other accounts &mdash; they try leaked passwords on email, Amazon,
            PayPal and banks automatically.</li>
            <li><strong>Switch on two-step sign-in for banking, Amazon, PayPal and social media.</strong> With it
            on, a stolen password alone can&rsquo;t get anyone in. Where a site offers a
            <a href="/what-is-a-passkey/">passkey</a>, that&rsquo;s even better: there&rsquo;s no password to leak.</li>
            <li><strong>Expect scams that use the leaked details.</strong> Emails, texts and calls that quote your
            name, an old password or an order are common after a breach. Your bank will never ask you to move
            money to a &ldquo;safe account&rdquo;. If a call worries you, hang up and ring <strong>159</strong>,
            which connects you to your own bank.</li>
            <li><strong>Make the next breach harmless.</strong> A different password for every account is the
            whole cure, and a <a href="/how-to-use-a-password-manager/">password manager</a> makes that easy.
            Have I Been Pwned&rsquo;s free &ldquo;Notify me&rdquo; service emails you if your address turns up in
            a future breach.</li>
          </ol>

          <h3 id="recent">Recent UK breaches: were you affected?</h3>
          <p>The big ones people are searching for, newest first, with what the company said was taken. If you&rsquo;re a
          customer, the steps above apply, and step 5 (expect scams) matters most: criminals send fake &ldquo;you were
          affected&rdquo; emails after every big breach. <small>(Updated 18 November 2026.)</small></p>
          <ul>
            <li><strong>ASOS (October 2026).</strong> A staff login was stolen by trickery and customers&rsquo; basic
            personal information and contact details may have been accessed. ASOS said it doesn&rsquo;t believe card
            details or passwords were affected. Watch for fake ASOS emails and texts about orders or refunds.</li>
            <li><strong>Manchester Airports Group (August 2026).</strong> About 8.7 million customers of Manchester,
            Stansted and East Midlands airports were told their email address, phone number, vehicle registration and
            postcode were exposed. No payment details were held in that system, the company said. Expect fake parking
            refund and booking messages.</li>
            <li><strong>Harrods (September 2025).</strong> About 430,000 customer records, mostly names and contact
            details, were taken from a company that worked for Harrods. No passwords or payment details, Harrods
            said.</li>
            <li><strong>Co-op (2025).</strong> The details of all 6.5 million members were taken: names, addresses and
            contact details. No bank details or passwords.</li>
            <li><strong>M&amp;S (2025).</strong> Names, contact details, dates of birth and order histories were taken.
            No usable card details or passwords, M&amp;S said, though it asked customers to reset their password.</li>
          </ul>
          <p>Not on the list: the <a href="/is-outlook-down/">Microsoft 365 outage of 12&ndash;13 November 2026</a>, which
          Microsoft said was not an attack. For the wider picture, see <a href="/cyber-threats/">cyber attacks in the UK:
          what&rsquo;s happening</a>, and to be ready for the next one, our
          <a href="/be-ready-digital-checklist/">Be Ready digital checklist</a>.</p>

          <h3 id="by-data">What was leaked, and what to do about it</h3>
          <ul>
            <li><strong>Email address only:</strong> nothing to change. Expect more spam and phishing, and be
            wary of emails that seem to know you.</li>
            <li><strong>Password (even &ldquo;encrypted&rdquo; or &ldquo;hashed&rdquo;):</strong> change it on that
            site and anywhere you reused it. Treat a hashed password as leaked: weak ones are cracked quickly.</li>
            <li><strong>Phone number:</strong> expect scam texts and calls. Never act on a text link about a
            parcel, a bank or HMRC; go to the real site or app yourself.</li>
            <li><strong>Home address or date of birth:</strong> these help criminals pass security questions and
            apply for credit in your name. Check your credit file now and again with one of the free credit
            report services, and look out for post about accounts you didn&rsquo;t open.</li>
            <li><strong>Card details:</strong> tell your bank using the number on the back of your card, and
            check statements. Your bank can cancel and reissue the card.</li>
            <li><strong>Passport, driving licence or other ID:</strong> consider Cifas Protective Registration,
            which flags your name so lenders make extra checks before opening anything (there&rsquo;s a small
            fee). If you lose money, report it to Report Fraud.</li>
          </ul>

          <h3 id="safe-to-ignore">What you can safely ignore</h3>
          <ul>
            <li><strong>&ldquo;Your device has been hacked&rdquo; emails that quote an old password.</strong>
            They&rsquo;re a mass-mailed bluff built from breach lists:
            <a href="/youve-been-hacked-email-bitcoin-scam/">here&rsquo;s how that scam works</a>. Change the password
            if you still use it, and delete the email.</li>
            <li><strong>Old breaches for accounts you&rsquo;ve since closed</strong>, or where you&rsquo;ve already
            changed the password. Have I Been Pwned keeps the history for ever, so the list never gets shorter.</li>
            <li><strong>Paid &ldquo;dark web monitoring&rdquo; you didn&rsquo;t ask for.</strong> The free checks
            above tell you the same thing.</li>
          </ul>

          <h3 id="notice-real">Is the breach email itself real?</h3>
          <p>Criminals send fake breach notices too. Don&rsquo;t use a link in the email: go to the company&rsquo;s
          website or app yourself and change your password there. A real notice never asks for your password,
          card number or a payment.</p>

          <h3 id="pc-check">Do I need to get my computer checked?</h3>
          <p>Not because of a breach on its own. A company losing your details doesn&rsquo;t put anything on your
          PC. It&rsquo;s worth a check if you also clicked a link in a scam email, let someone connect to your
          computer, or see sign-ins you didn&rsquo;t make. Our free
          <a href="/free-pc-health-check/">365 PC Manager</a> checks the computer&rsquo;s security, updates and
          remote-access apps in a few minutes, and our <a href="/scam-recovery/">scam recovery service</a> cleans
          up properly if something is wrong. Not sure? Ring us on <a href="tel:+441202775566">01202 775566</a>.</p>

          <p><small>365 Techies is not connected with Have I Been Pwned. It&rsquo;s a free, independent service run
          by a security researcher, and it&rsquo;s the check we use ourselves. To check a single password
          privately, use our <a href="/password-breach-checker/">password breach checker</a>.</small></p>
        </div>
      </div>
    </section>'''

SIGNS = ["A breach notification email", "Have I Been Pwned lists your email",
         "&ldquo;Password found in a data breach&rdquo; warning", "Password-reset emails you didn&rsquo;t request",
         "Scams that know your name or an old password", "Sign-ins or orders you didn&rsquo;t make"]

FAQS = [
    ("Have I Been Pwned says I&rsquo;m in several breaches. Should I worry?",
     "It&rsquo;s very common: most people who&rsquo;ve been online for a few years are in several. Look at what each "
     "breach included. If a password was taken, change it on that site and anywhere you reused it, and switch on "
     "two-step sign-in for your email. If it was only your email address, there&rsquo;s nothing to change; just "
     "expect more spam."),
    ("Is Have I Been Pwned safe to use?",
     "Yes. It&rsquo;s a free, long-running service used by security professionals and governments, and searching "
     "only needs your email address, never a password. We&rsquo;re not connected with it, but it&rsquo;s the "
     "check we use ourselves."),
    ("Chrome or Edge says my password was found in a data breach. What should I do?",
     "Change that password on the site it names, and on any other account where you used the same one. The browser "
     "compares your saved passwords against known leaked lists without sending them in readable form, so the warning "
     "is genuine, not a scam pop-up."),
    ("Does being in a breach mean my computer has a virus?",
     "No. The breach happened on the company&rsquo;s systems, not your PC. Only get the computer checked if you also "
     "clicked a scam link, let someone connect to it, or see activity you didn&rsquo;t make."),
    ("Can I get compensation for a data breach?",
     "Sometimes. Under UK data protection law you can complain to the company and then to the Information "
     "Commissioner&rsquo;s Office, and you may be able to claim if you lost money or suffered distress. Be wary of "
     "firms that cold-call offering to claim for you."),
    ("How do I find out if a company&rsquo;s breach affected me?",
     "A company that loses personal data usually emails the people affected and posts a notice on its own website. Check "
     "the website directly rather than trusting an email that says you were affected, because fake breach notices are "
     "common. Have I Been Pwned also lists many large breaches once the data appears online."),
    ("What should I do after a breach?",
     "Secure your email first (new password, two-step sign-in), change the leaked password everywhere you used it, "
     "switch on two-step sign-in for banking and shopping accounts, and watch for scams that use your details."),
]

IFHIT = [("Secure your email", "New password used nowhere else, then two-step sign-in."),
         ("Change reused passwords", "On the breached site and every account that shared the password."),
         ("We help secure you", "We&rsquo;ll go through your accounts with you and set up proper protection.")]
