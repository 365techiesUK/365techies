# -*- coding: utf-8 -*-
"""/driving-test/ - 365 Driving Test, the coming-soon page (4 Nov 2026).

Owner, 4 Nov 2026: "create that driving test page on the 365 Techies website ... don't upload the game yet ... just
don't have it link into the game ... put coming soon ... it's got to be AI and SEO optimized ... so we're found."

So: a real explainer of the three steps to a car licence (theory test with hazard perception, the practical test and
what the examiner marks, show me / tell me) plus a Coming soon panel in place of a Play button. Nothing links to the
app and no app files ship with this page.

WORDING RULES (owner + research in D:/claude/seo-research/driving-test-name-2026-11-04/):
- never "official", never DVSA as our branding, no DVSA logo, no pass promises or pass-rate claims;
- the disclaimer stays: practice only, not the real test, not connected with DVSA, book real tests on GOV.UK;
- routes are "practice routes on the roads round Poole test centre" - DVSA does not publish test routes;
- no price beyond "free to try" and "full pack coming"; live weather / buses / traffic are NOT claimed (later feature).

FACTS - every one checked on gov.uk on 4 Nov 2026 (re-check them if you edit this page):
- gov.uk/theory-test: two parts booked as one test, pass both; from your 17th birthday.
- gov.uk/theory-test/multiple-choice-questions: 50 questions in 57 minutes; 3 about a short silent video; flag and
  change answers; up to a 3-minute break before hazard perception.
- gov.uk/theory-test/hazard-perception-test: 14 clips, one with 2 developing hazards; up to 5 points each; clicking
  continuously or in a pattern scores nothing; one attempt per clip.
- gov.uk/theory-test/pass-mark-and-result: 43 of 50, 44 of 75; pass certificate number lasts 2 years.
- gov.uk/theory-test/revision-and-practice: questions based on The Highway Code, Know your traffic signs, Driving -
  the essential skills.
- gov.uk/driving-test/what-happens-during-test: 4 parts; "around 35 minutes" of driving (gov.uk changed this from the
  older "about 40 minutes"); independent driving 20 to 35 minutes by sat nav, traffic signs or both; no fault for a
  wrong turning; normal stop, pulling out from behind a parked vehicle, hill start; "might" be asked to do an emergency
  stop; one of three reversing exercises; routes are not published.
- gov.uk/driving-test/driving-test-faults-result: driving / serious / dangerous; pass = no more than 15 driving faults
  and no serious or dangerous fault.
- gov.uk/government/publications/car-show-me-tell-me-vehicle-safety-questions (OGL v3): 14 tell me + 7 show me; tell me
  before driving, show me while driving; one driving fault for one or both wrong.
- step-by-step sidebar on those pages: theory test GBP 23, driving test GBP 62 to 75 (prices change - not printed here
  beyond the FAQ link to GOV.UK).
- DVSA bulletin 13 Aug 2019 (content.govdelivery.com/accounts/UKDVSA/bulletins/257840f): Bournemouth driving test
  centre not re-opening; book at Poole, 4-20 Harwell Road, Nuffield Industrial Estate, BH17 0SA.
- Bournemouth theory test centre, Roddis House, Old Christchurch Road, BH1 1LG: the owner's brief + third-party
  listings (gov.uk only shows centres inside the booking service), hence the "check your booking" line.
"""
import build_pages as bp
from build_pages import add, graph, crumb, webpage, faqpage, faq_html, cta, hero, bc
from build_extra import _sec_block, _toc_chips

SLUG = "driving-test"
NAME = "365 Driving Test"
# Plain ASCII, <= 155 characters (snippet rules in snippets_data.py)
DESC = ("Free-to-try practice for the UK car theory test, hazard perception and a 3D mock driving test "
        "round Poole test centre. Coming soon from 365 Techies.")
TITLE = "365 Driving Test: Theory Test Practice &amp; Hazard Perception"
OG_TITLE = "365 Driving Test - theory test practice, hazard perception and a 3D mock driving test"

ASK_MAIL = "mailto:help@365techies.co.uk?subject=Tell%20me%20when%20365%20Driving%20Test%20is%20ready"
BOOK_DRIVING = "https://www.gov.uk/book-driving-test"
BOOK_THEORY = "https://www.gov.uk/book-theory-test"

_DISCLAIMER = ('<p style="margin:0"><strong>Practice only.</strong> 365 Driving Test is not the real test and is not '
               'connected with DVSA (the Driver and Vehicle Standards Agency). Book your real tests on GOV.UK: '
               '<a href="%s" rel="noopener">book your theory test</a> and <a href="%s" rel="noopener">book your driving test</a>.</p>'
               % (BOOK_THEORY, BOOK_DRIVING))

_SOON = '''    <section class="section section--alt" id="coming-soon" aria-label="Coming soon">
      <style>
      .dt-soon{max-width:980px;margin:0 auto}
      .dt-soon__badge{display:inline-block;padding:.35rem .9rem;border-radius:999px;border:1px solid rgba(29,151,227,.5);background:rgba(29,151,227,.12);color:var(--cyan-soft,#6cc4f5);font-size:.8rem;letter-spacing:.09em;margin:0 0 .9rem}
      .dt-parts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:1rem;margin:1.4rem 0}
      .dt-part{border:1px solid rgba(125,170,220,.22);border-radius:16px;background:rgba(125,170,220,.05);padding:1.2rem 1.3rem}
      .dt-part h3{margin:0 0 .5rem;font-size:1.15rem}
      .dt-part p{margin:0;color:var(--muted)}
      .dt-soon ul.dt-list{margin:.4rem 0 1rem;padding-left:1.2rem}
      .dt-soon ul.dt-list li{margin:.3rem 0}
      .dt-note{margin-top:1.2rem;font-size:.95rem}
      .dt-note a,.dt-soon .callout a:not(.button){color:var(--cyan);text-decoration:underline}
      </style>
      <div class="wrap dt-soon">
        <div class="callout callout--info callout--center" data-reveal>
          <p class="dt-soon__badge mono">COMING SOON</p>
          <h2 class="section-title section-title--center" style="margin-top:0">Coming soon: what&rsquo;s in 365 Driving Test<span class="title-underline title-underline--center"></span></h2>
          <p class="callout__lede">We&rsquo;re finishing it now. There&rsquo;s nothing to play yet, so there&rsquo;s no Play button. Want to know the day it&rsquo;s ready? Send us a quick email and we&rsquo;ll tell you.</p>
          <p class="callout__row">
            <a class="button primary button--lg" href="''' + ASK_MAIL + '''">Tell me when it&rsquo;s ready</a>
            <a class="button secondary button--lg" href="/contact/">Or use our contact form</a>
          </p>
        </div>
        <div class="dt-parts" data-stagger>
          <div class="dt-part"><h3>Mock theory tests</h3><p>50 questions in 57 minutes, with 43 to pass, like the real thing. Every question is our own, written from the Highway Code, and every answer shows the Highway Code rule number so you can look it up.</p></div>
          <div class="dt-part"><h3>Hazard perception practice</h3><p>Clips made in our own 3D world. Click when a hazard starts to develop: the earlier you click, the more you score, from 5 down to 1. Click in a rhythm or non-stop and you score 0, just as in the real test.</p></div>
          <div class="dt-part"><h3>A 3D mock driving test</h3><p>Drive with a voiced examiner on six practice routes on the roads round Poole test centre and six round Bournemouth. Sat nav and spoken directions, show me / tell me questions, pulling up on the left and moving off, the emergency stop, and a fault sheet at the end.</p></div>
        </div>
        <div class="prose" data-reveal>
          <p><strong>Free to try.</strong> The free taster gives you the first practice route, one full mock theory test and one go at the hazard perception clips. A full pack with everything else is coming later.</p>
          <p><strong>Plays on</strong> a phone, a tablet or a PC, in your web browser. Use touch, a keyboard and mouse, or an Xbox controller.</p>
          <div class="callout dt-note">''' + _DISCLAIMER + '''</div>
        </div>
      </div>
    </section>'''

SECTIONS = [
    {'eyebrow': '/01 &mdash; THE THREE STEPS', 'h2': 'The three steps to a full car licence',
     'html': '<p>Getting your full car licence in Great Britain comes down to three things. Most people can start learning at 17.</p>'
             '<ol>'
             '<li><strong>A provisional driving licence.</strong> You need one to have lessons, to practise on the road, and to book your theory test.</li>'
             '<li><strong>The theory test.</strong> One test in two parts: multiple-choice questions, then hazard perception. You book and take them together, and you have to pass both. You can take it from your 17th birthday.</li>'
             '<li><strong>The practical driving test.</strong> You can only book it once you&rsquo;ve passed your theory test. Your theory pass certificate number lasts 2 years, so you need to pass the practical within that time or take the theory test again.</li>'
             '</ol>'
             '<p>There&rsquo;s no set number of lessons you must have before you take your test. The sections below explain what happens in each test, and how 365 Driving Test lets you practise for it.</p>'
             '<p>Paying for lessons for someone in the family? The theory test is the part they can practise for anywhere, any time, and it&rsquo;s the step that has to be passed before a practical test can even be booked.</p>'},
    {'eyebrow': '/02 &mdash; THEORY TEST', 'h2': 'The theory test: 50 questions in 57 minutes',
     'html': '<p>The first part of the theory test is <strong>50 multiple-choice questions</strong>, and you have <strong>57 minutes</strong>. To pass this part you need <strong>43 out of 50</strong>.</p>'
             '<ul>'
             '<li>Each question shows on a screen with several possible answers. You pick the right one.</li>'
             '<li>Three of the questions are about a short, silent video of normal driving, such as a town centre or a country road. You can watch it as many times as you like.</li>'
             '<li>You can flag a question to come back to, and change any answer before you finish. You don&rsquo;t have to use the full 57 minutes.</li>'
             '<li>You can have a break of up to 3 minutes before the hazard perception part starts.</li>'
             '</ul>'
             '<p>The questions are based on three books: <em>The Highway Code</em>, <em>Know your traffic signs</em> and <em>Driving &ndash; the essential skills</em>.</p>'
             '<p><strong>How our mock theory test works:</strong> 50 questions against a 57-minute clock, with 43 to pass. The questions are our own, written from the Highway Code, not copies of the real test&rsquo;s. After each test you see what you got wrong, the right answer, and the Highway Code rule number it comes from.</p>'},
    {'eyebrow': '/03 &mdash; HAZARD PERCEPTION', 'h2': 'Hazard perception: 14 clips, 44 out of 75 to pass',
     'html': '<p>The second part of the theory test is the hazard perception test. You watch <strong>14 video clips</strong> of everyday road scenes. Every clip has at least one <strong>developing hazard</strong>, and one clip has two, so there are 15 to find.</p>'
             '<p>A developing hazard is something that would make you act, by slowing down or changing direction. A car parked at the side of the road isn&rsquo;t one. The same car is one when its indicator comes on and it starts to pull out in front of you.</p>'
             '<ul>'
             '<li>You score up to <strong>5 points</strong> for each developing hazard. The sooner you click once it starts to develop, the higher the score.</li>'
             '<li>You don&rsquo;t lose points for a wrong click. But if you click non-stop or in a pattern, you score nothing for that clip.</li>'
             '<li>You get one go at each clip. You can&rsquo;t go back or change your clicks.</li>'
             '<li>That&rsquo;s 75 points in all, and you need <strong>44</strong> to pass.</li>'
             '</ul>'
             '<p><strong>How our hazard clips work:</strong> they&rsquo;re made in our own 3D world, not taken from the real test, so they look different. The scoring follows the same idea: 5 points for an early click, down to 1 for a late one, and 0 if you click in a rhythm or keep clicking.</p>'},
    {'eyebrow': '/04 &mdash; PRACTICAL TEST', 'h2': 'The practical driving test: what the examiner marks',
     'html': '<p>The car driving test has four parts, and it&rsquo;s the same test in a manual or an automatic. You drive for <strong>around 35 minutes</strong>.</p>'
             '<ol>'
             '<li><strong>An eyesight check.</strong> You read a number plate from 20 metres (20.5 metres for an old-style plate). Fail it and the test ends there.</li>'
             '<li><strong>Two &lsquo;show me, tell me&rsquo; questions</strong> about looking after the car (more on these below).</li>'
             '<li><strong>Your general driving</strong> in different road and traffic conditions (not on motorways), including <strong>20 to 35 minutes of independent driving</strong>. You follow a sat nav, traffic signs, or both. The examiner tells you which, and sets the sat nav up for you. Take a wrong turning and you don&rsquo;t get a fault for it: the examiner helps you back on the route.</li>'
             '<li><strong>One reversing exercise:</strong> parallel parking, parking in a bay, or pulling up on the right, reversing about two car lengths and rejoining the traffic.</li>'
             '</ol>'
             '<p>You&rsquo;ll also be asked to <strong>pull over and pull away</strong>: a normal stop at the side of the road, pulling out from behind a parked car, and a hill start. You might be asked to do an <strong>emergency stop</strong>.</p>'
             '<h3>Minors, serious and dangerous faults</h3>'
             '<ul>'
             '<li>A <strong>driving fault</strong> (a &ldquo;minor&rdquo;) isn&rsquo;t potentially dangerous, but the same one again and again can become a serious fault.</li>'
             '<li>A <strong>serious fault</strong> is something potentially dangerous.</li>'
             '<li>A <strong>dangerous fault</strong> involves actual danger to you, the examiner, the public or property.</li>'
             '</ul>'
             '<p>You pass with <strong>15 or fewer driving faults and no serious or dangerous faults</strong>.</p>'
             '<p><strong>How our 3D mock test works:</strong> a voiced examiner gives you directions, with a sat nav on screen. You pull up on the left and move off, do the emergency stop, answer show me / tell me questions, and get a fault sheet at the end marked the same way: minors, serious and dangerous, with the same pass rule.</p>'},
    {'eyebrow': '/05 &mdash; SHOW ME, TELL ME', 'h2': 'Show me, tell me questions',
     'html': '<p>At the start of your test, before you drive off, the examiner asks you one <strong>&lsquo;tell me&rsquo;</strong> question: you explain how you&rsquo;d do a safety check. While you&rsquo;re driving, they ask one <strong>&lsquo;show me&rsquo;</strong> question: you show them how you&rsquo;d do something, such as washing the windscreen or switching on the dipped headlights.</p>'
             '<p>Get one or both wrong and it&rsquo;s one driving fault. But if your driving becomes dangerous, or potentially dangerous, while you answer the &lsquo;show me&rsquo; question, you fail.</p>'
             '<p>The questions come from a list DVSA publishes: 14 &lsquo;tell me&rsquo; and 7 &lsquo;show me&rsquo;. Some &lsquo;tell me&rsquo; questions need the bonnet open, such as checking the oil, the coolant or the brake fluid. Read the full list, with the answers, on GOV.UK: '
             '<a href="https://www.gov.uk/government/publications/car-show-me-tell-me-vehicle-safety-questions" rel="noopener">car &lsquo;show me, tell me&rsquo; vehicle safety questions</a>.</p>'
             '<p><strong>In 365 Driving Test</strong> the examiner asks questions from that published list, which DVSA makes free to reuse under the Open Government Licence. You answer the &lsquo;tell me&rsquo; one before you set off and the &lsquo;show me&rsquo; one on the move, as in the real test.</p>'},
    {'eyebrow': '/06 &mdash; POOLE &amp; BOURNEMOUTH', 'h2': 'Taking your tests in Poole and Bournemouth',
     'html': '<h3>Your practical test: Poole</h3>'
             '<p>Bournemouth&rsquo;s driving test centre closed in 2019 and didn&rsquo;t re-open, and DVSA told learners to book at Poole instead. Car driving tests for the area are taken at <strong>Poole driving test centre, 4&ndash;20 Harwell Road, Nuffield Industrial Estate, Poole BH17 0SA</strong>.</p>'
             '<p>DVSA doesn&rsquo;t publish its test routes, so nobody can tell you the exact route you&rsquo;ll get. What you can do is get used to the kind of roads round the test centre. That&rsquo;s why 365 Driving Test has <strong>six practice routes on the roads round Poole test centre</strong>, plus six round Bournemouth. TheyThey&rsquo;re practice routes we&rsquo;ve made, not the real test routes.rsquo;re our own practice routes, made to help you get to know the area.</p>'
             '<h3>Your theory test: Bournemouth</h3>'
             '<p>Theory tests for the area are taken at the <strong>Bournemouth theory test centre, Roddis House, Old Christchurch Road, Bournemouth BH1 1LG</strong>, in the town centre. Always check the address on your booking confirmation.</p>'},
    {'eyebrow': '/07 &mdash; WHO MAKES IT', 'h2': 'Who makes 365 Driving Test',
     'html': '<p>We&rsquo;re <strong>365 Techies</strong>, an IT support company in Bournemouth, family-run since 1995. Most days we look after people&rsquo;s computers. We also make our own software, like the free <a href="/free-pc-health-check/">365 PC Manager</a> app, and our own games, like <a href="/play-driving-game-online-free/">365 Coast Run</a>, a 3D driving game along the Dorset coast.</p>'
             '<p>365 Driving Test is built with the same 3D know-how, set in Bournemouth and Poole. It&rsquo;s there to help you practise, so the real thing feels familiar. It doesn&rsquo;t replace lessons with a driving instructor, and it isn&rsquo;t the real test.</p>'},
]

FAQS = [
    ("Is 365 Driving Test the real theory test?",
     "No. It&rsquo;s for practice only. It isn&rsquo;t the real test and it isn&rsquo;t connected with DVSA. "
     "Book your real theory test on GOV.UK: <a href=\"%s\">book your theory test</a>." % BOOK_THEORY),
    ("Are the theory questions the ones in the real test?",
     "No. We write our own questions from the Highway Code, and every answer gives you the Highway Code rule number so you can read the rule for yourself. "
     "They cover the same ground, but they aren&rsquo;t copies of the real test&rsquo;s questions."),
    ("Can I practise the Poole driving test routes?",
     "DVSA doesn&rsquo;t publish its test routes, so nobody can give you the real ones. 365 Driving Test has six practice routes on the roads round "
     "Poole test centre on Harwell Road, plus six round Bournemouth, so the area feels familiar when you go for your test."),
    ("How is the practical test marked?",
     "With driving faults (minors), serious faults and dangerous faults. You pass with 15 or fewer driving faults and no serious or dangerous faults. "
     "Our 3D mock test gives you a fault sheet at the end, marked the same way."),
    ("Does it work on my phone?",
     "Yes. It runs in your web browser on a phone, a tablet or a PC. You can play with touch, a keyboard and mouse, or an Xbox controller."),
    ("How much does it cost?",
     "It&rsquo;s free to try: the first practice route, one full mock theory test and one go at the hazard perception clips. A full pack with everything else is coming later."),
    ("When is it out?",
     "Soon. We&rsquo;re finishing it now and haven&rsquo;t set a date, so we won&rsquo;t promise one. "
     "<a href=\"%s\">Email us</a> and we&rsquo;ll tell you when it&rsquo;s ready." % ASK_MAIL),
    ("Where do I book my real tests?",
     "On GOV.UK: <a href=\"%s\">book your theory test</a>, then, once you&rsquo;ve passed it, <a href=\"%s\">book your driving test</a>. "
     "GOV.UK shows the current fees when you book." % (BOOK_THEORY, BOOK_DRIVING)),
    ("Is there still a driving test centre in Bournemouth?",
     "Not for car practical tests. Bournemouth&rsquo;s driving test centre closed in 2019, and car tests for the area are taken at Poole, "
     "4&ndash;20 Harwell Road, BH17 0SA. Theory tests are still taken in Bournemouth, at Roddis House on Old Christchurch Road."),
]


def build():
    lede = ("Mock theory tests, hazard perception clips and a 3D mock driving test with a voiced examiner round Poole test centre, "
            "in your web browser. Coming soon, free to try. Practice only: not the real test, not connected with DVSA.")
    content = "\n".join([
        hero(bc(NAME), "// 365 DRIVING TEST &middot; COMING SOON",
             '365 Driving Test: <em class="grad grad--cyan">theory test practice</em> and a 3D mock test',
             lede, cta1=("Tell me when it&rsquo;s ready", "#coming-soon"), cta2=("How the tests work", "#s1"),
             chips=["Free to try", "Phone, PC or controller", "Practice routes round Poole"]),
        _SOON,
        _toc_chips(SECTIONS),
        "\n".join(_sec_block(s, i) for i, s in enumerate(SECTIONS)),
        faq_html(FAQS),
        cta("Want to know when it&rsquo;s ready?",
            "Send us a quick email and we&rsquo;ll tell you the day 365 Driving Test is out. Ready for the real thing? Book it on GOV.UK.",
            primary=("Tell me when it&rsquo;s ready", ASK_MAIL), secondary=("Book your driving test on GOV.UK", BOOK_DRIVING)),
    ])

    def schema(s):
        return graph([crumb(s, NAME), webpage(s, NAME, DESC), faqpage(s, FAQS)])

    add(slug=SLUG, title=TITLE, desc=DESC, og_title=OG_TITLE, schema=schema, content=content)


build()
