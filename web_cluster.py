# "Website help" directory - mirrors the Dell/Office cluster pattern.
# Rendered on /web-design-hosting/ and /website-rebuild/ (the two web pillars).
import re as _re

_WEB_CLUSTER = [
 ("Website rescue", [
   ("web-designer-disappeared", "Your web designer vanished", "Ghosted, retired or gone bust &mdash; the calm UK recovery playbook."),
   ("website-held-hostage", "Website held hostage", "Designer withholding your domain or logins? Your escalation path."),
   ("website-hacked-what-to-do", "Website hacked", "The calm first-hour checklist for UK small businesses."),
   ("slow-wordpress-site-fix-or-rebuild", "Slow WordPress site", "Fix it or rebuild it? The honest 20-minute triage."),
 ]),
 ("Thinking of a change", [
   ("outgrown-wix-squarespace", "Outgrown Wix or Squarespace", "When the monthly builder fees stop making sense."),
   ("static-site-vs-wordpress-small-business", "Static site vs WordPress", "Which actually suits a small business &mdash; in plain English."),
   ("website-maintenance-cost-uk", "What upkeep really costs", "An honest look at UK website maintenance costs."),
   ("website-rebuild", "Rebuild without losing rankings", "The SEO-safe migration pillar &mdash; how we move a site over."),
 ]),
 ("Proof &amp; performance", [
   ("how-we-rebuilt-our-website", "How we rebuilt our own site", "WordPress to hand-built &mdash; the numbers, honestly."),
   ("website-speed-local-seo", "Speed &amp; local SEO", "Why a fast site wins local customers &mdash; and how to check yours."),
   ("website-checker", "Free website checker", "Speed, SSL and health in about a minute, no sign-up."),
   ("web-design-hosting", "Web design &amp; hosting", "The full service &mdash; site, hosting, email and support from one firm."),
   ("web-care", "365 Web Care", "One monthly plan &mdash; we host it, secure it, back it up and keep it running."),
 ]),
 ("Websites for your trade", [
   ("websites-for-builders-tradesmen", "Websites for trades", "Builders and tradespeople: a site that wins the next job."),
   ("free-tools", "All our free tools", "39 free checkers and utilities, no sign-up."),
 ]),
 ("Online booking", [
   ("simplybook-integration", "Custom SimplyBook integration", "Your booking screens, your emails, your brand &mdash; SimplyBook invisible behind them."),
   ("simplybook-integration-traps", "Six SimplyBook traps", "What bit us on a live system &mdash; symptom, cause and fix."),
   ("simplybook-custom-booking-page", "Replace the booking widget", "Your own booking page, without exposing an API key."),
   ("book-service", "Our own booking page", "The live proof &mdash; book a visit through the integration we built."),
 ]),
]
_WEB_CHIP = {"Website rescue": "Rescue", "Thinking of a change": "Switching",
             "Proof &amp; performance": "Proof", "Websites for your trade": "Trades",
             "Online booking": "Booking"}


def _web_cluster_section(exclude=()):
    ex = set(exclude)

    def anchor(t):
        return 'wc-' + _re.sub(r'[^a-z0-9]+', '-', t.replace('&amp;', 'and').lower()).strip('-')

    chips, groups = "", ""
    for gtitle, cards in _WEB_CLUSTER:
        cards = [c for c in cards if c[0] not in ex]
        if not cards:
            continue
        a = anchor(gtitle)
        chips += f'          <a href="#{a}">{_WEB_CHIP.get(gtitle, gtitle.split()[0])}</a>\n'
        items = "\n".join(
            f'            <a href="/{s2}/"><strong>{t}</strong><span>{b}</span></a>' for s2, t, b in cards)
        groups += (f'        <div class="dell-dir-group" id="{a}">\n'
                   f'          <h3>{gtitle}</h3>\n'
                   f'          <div class="dell-dir">\n{items}\n          </div>\n'
                   f'        </div>\n')
    return ('    <section class="blog-section section--alt" aria-label="Website help" id="web-help">\n'
            '      <div class="wrap">\n'
            '        <div class="section-head">\n'
            '          <p class="eyebrow eyebrow--center mono" data-reveal>// WEBSITE HELP &middot; RESCUE, REBUILD &amp; HONEST ADVICE</p>\n'
            '          <h2 class="section-title section-title--center" data-title>Browse all our website help<span class="title-underline title-underline--center"></span></h2>\n'
            '          <p class="lede lede--center" data-reveal>Stuck, switching, or just weighing it up &mdash; it&rsquo;s all here, from a firm that rebuilt its own site the hard way. Jump to what you need, or <a href="/contact/">talk to a techie</a>.</p>\n'
            '        </div>\n'
            '        <div class="dell-dir-chips mono" data-reveal>\n' + chips + '        </div>\n'
            + groups +
            '      </div>\n'
            '    </section>')
