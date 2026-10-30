"""Links to /free-pc-health-check/ from busy pages that had none in the article itself (30 Oct 2026). Owner: "add more links
to the free PC health check page".

Why these pages: the staff portal's visitor tally (30 days to 30 Oct) - /free-pc-health-check/ turns 28 of every 100 visitors
into a PC Manager download, the best on the site, but only ~140 people a month reach it. Every page already links to it from
the menus and footer; these busy pages had nothing in the article, where people actually read. Pages with an app box of their
own (pcm_problem_boxes, the tool pages) are left alone, and so is the Junara page (owner). Each line names only what the app
really does (the page's own description: updates, drives, backup, Wi-Fi, start-up and scams; the remote-access check).
A page filter: the section goes just before the page's FAQ section, and sends people to the page, not straight to the .exe.
"""
import build_pages as bp

# slug -> (section eyebrow, section heading, one sentence)
PAGES = {
    'why-computer-prices-have-gone-up': ('// BEFORE YOU REPLACE IT', 'Is your current PC really worn out?',
        'Before you pay today&rsquo;s prices, check the one you&rsquo;ve got. Our free Windows app shows in plain English whether '
        'it&rsquo;s up to date, how its drives are doing, whether it&rsquo;s backed up and what&rsquo;s slowing start-up.'),
    'link-safety-checker': ('// NOW CHECK THE PC ITSELF', 'Checked the link? Check your computer too',
        'Our free Windows app looks for the signs a scam leaves behind on a PC, such as remote-control programs you didn&rsquo;t '
        'mean to keep, and checks Windows updates and security in plain English.'),
    'spot-the-scam': ('// NOW CHECK YOUR OWN PC', 'Has a scam already got in?',
        'If you think you&rsquo;ve clicked something you shouldn&rsquo;t have, our free Windows app checks for remote-control programs '
        'and other warning signs, and tells you in plain English what it finds.'),
    'mesh-wifi-systems-uk': ('// BEFORE YOU BUY', 'Is it the Wi-Fi, or the computer?',
        'Our free Windows app reads your connection straight from Windows: signal strength, 2.4 or 5 GHz and link speed, along with '
        'the rest of the PC&rsquo;s health. Worth a look before you spend money on mesh.'),
    'free-courses': ('// ALSO FREE', 'A free health check for your computer',
        'Our free Windows app checks updates, drives, backup, Wi-Fi and start-up, and explains what it finds in plain English. '
        'No sign-up, and no fake errors.'),
    'computer-basics-course': ('// ALSO FREE', 'Keep an eye on your computer&rsquo;s health',
        'Our free Windows app checks the things this course mentions, such as updates, backup and storage, and says in plain English '
        'whether anything needs doing.'),
    'online-safety-course': ('// ALSO FREE', 'Check your own PC&rsquo;s safety',
        'Our free Windows app checks Windows updates and security, and looks for remote-control programs a scammer may have left '
        'behind, in plain English.'),
}

# 30 Oct 2026 (owner: "add the link to the Dell pages too"): the Dell pages with no link in the article, by kind. Left out
# on purpose: a Dell that won't turn on (caps-lock blinking, the F1 fan error), the swollen battery (stop using it), the hinge
# and emergency repair pages, the video page (no FAQ) and pages that already link to it in the article.
_DELL = {
    'buy': ('// BEFORE YOU BUY', 'How is the computer you have now doing?',
        'Before you replace it, our free Windows app shows in plain English whether your current PC is up to date, how its '
        'drives are doing, whether it&rsquo;s backed up and, on a laptop, how much charge the battery still holds.'),
    'upgrade': ('// CHECK YOUR OWN PC', 'Can yours move to Windows 11?',
        'Our free Windows app&rsquo;s <strong>This PC</strong> page says which Windows your PC has, until when it gets security updates '
        'and whether it can probably move to Windows 11 for free, along with how its drives are doing.'),
    'support': ('// SEE HOW IT&rsquo;S DOING FIRST', 'A free health check for your Dell',
        'Our free Windows app checks updates, drives, backup, Wi-Fi and start-up and explains what it finds in plain English. '
        'Handy before you ring us, and it shows your Dell&rsquo;s Service Tag too.'),
    'battery': ('// CHECK THE BATTERY', 'How much charge does yours really hold?',
        'On a laptop, our free Windows app reads Windows&rsquo; own measurement of the battery and shows its health and how many '
        'charge cycles it has done, along with the rest of the PC&rsquo;s health.'),
    'tag': ('// THE QUICK WAY', 'See the Service Tag without turning it over',
        'Our free Windows app shows your Dell&rsquo;s Service Tag on its <strong>This PC</strong> page, along with which Windows it has, '
        'until when it gets updates and a plain-English health check.'),
}
for _kind, _slugs in {
    'buy': 'are-dell-latitude-laptops-good dell-hardware dell-latitude-3510-refurbished-worth-it dell-latitude-5000-guide '
           'dell-latitude-5300-refurbished-worth-it dell-latitude-5410-worth-it-2026 dell-latitude-5420-vs-5430-which-to-buy '
           'dell-latitude-5420-worth-it-2026 dell-latitude-5440-worth-it-2026 dell-latitude-7000-guide dell-latitude-7420-worth-it-2026 '
           'dell-latitude-series-explained-3000-5000-7000 dell-optiplex-micro-sff-tower-which-to-buy dell-optiplex-vs-inspiron-desktop '
           'dell-precision-vs-latitude refurbished-dell-desktops-dorset refurbished-dell-laptops-bournemouth refurbished-dell-latitude-3000 '
           'refurbished-dell-latitude-5000 refurbished-dell-latitude-7000 refurbished-dell-optiplex-3000 refurbished-dell-optiplex-5000 '
           'refurbished-dell-optiplex-7000 refurbished-laptops-dorset refurbished-vs-new-laptop',
    'upgrade': 'dell-latitude-e5540-upgrade dell-latitude-e5550-upgrade dell-optiplex-7020-upgrade dell-optiplex-790-upgrade '
               'dell-optiplex-9020-upgrade dell-optiplex-990-upgrade windows-10-esu-or-upgrade-your-dell',
    'support': 'alienware-dell-g-series-repair-bournemouth dell-business-support-dorset dell-inspiron-repair-bournemouth '
               'dell-it-support-dorset dell-laptop-repair-bournemouth dell-laptop-repair-poole dell-laptop-servicing-bournemouth '
               'dell-monitor-dock-support-dorset dell-optiplex-repair-poole dell-out-of-warranty-repair '
               'dell-precision-workstation-repair-support-dorset dell-remote-support dell-same-day-support-dorset dell-support-bournemouth '
               'dell-support-plans dell-support-poole dell-supportassist-keeps-popping-up dell-vostro-repair-support-dorset '
               'dell-xps-repair-bournemouth how-to-update-dell-bios',
    'battery': 'dell-laptop-battery-replacement-dorset dell-latitude-charging-on-the-go how-long-do-dell-latitude-laptops-last',
    'tag': 'how-to-find-dell-service-tag-and-check-warranty',
}.items():
    for _s in _slugs.split():
        PAGES[_s] = _DELL[_kind]


def _section(slug):
    eyebrow, head, line = PAGES[slug]
    return ('    <section class="section" aria-label="Free PC health check" id="health-check-link">\n'
            '      <div class="wrap" style="max-width:980px">\n'
            '        <p class="eyebrow mono">' + eyebrow + '</p>\n'
            '        <h2 class="section-title" data-title>' + head + '<span class="title-underline"></span></h2>\n'
            '        <p>' + line + '</p>\n'
            '        <p style="margin:1rem 0 0"><a class="button primary" href="/free-pc-health-check/">Free PC health check &#8594;</a></p>\n'
            '      </div>\n    </section>\n')


def insert(slug, html):
    if slug not in PAGES or 'id="health-check-link"' in html:
        return html
    j = html.find('<section class="faq-section')
    if j < 0:
        raise SystemExit("health_check_links: no FAQ section on /%s/ - the link has nowhere to go" % slug)
    j = html.rfind('\n', 0, j) + 1
    return html[:j] + _section(slug) + html[j:]


bp.PAGE_FILTERS.append(insert)
