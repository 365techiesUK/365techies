# "Everything Microsoft Office" directory - mirrors the Dell cluster pattern.
# Rendered on /microsoft-365-support/, /outlook-problems/ and /onedrive-problems/.
import re as _re

_OFFICE_CLUSTER = [
 ("Outlook", [
   ("outlook-problems", "Outlook problems &amp; fixes", "The full triage hub &mdash; classic Outlook, new Outlook, Outlook.com and Android."),
   ("common-outlook-problems-and-fixes", "Common Outlook problems", "The everyday faults and their plain-English fixes."),
   ("how-to-go-back-to-classic-outlook", "Go back to classic Outlook", "New Outlook not for you? The honest way back."),
   ("recreate-outlook-profile-without-losing-emails", "Rebuild an Outlook profile", "Without losing a single email."),
 ]),
 ("OneDrive", [
   ("onedrive-problems", "OneDrive problems &amp; fixes", "Files moved, missing, full or stuck &mdash; start here."),
   ("onedrive-moved-my-desktop-and-documents", "OneDrive moved my files", "Windows did it without asking &mdash; the safe way back."),
   ("files-missing-from-onedrive", "Files missing from OneDrive", "The ten-minute checklist, ordered by likelihood."),
   ("onedrive-full-cant-send-email", "OneDrive full &amp; email bouncing", "The storage collision Microsoft never explains in one place."),
   ("stop-using-onedrive-without-losing-files", "Leave OneDrive safely", "The right order of steps, with nothing lost."),
 ]),
 ("Word &amp; Excel", [
   ("microsoft-word-wont-open", "Word won&rsquo;t open", "From quick fixes to document recovery."),
   ("stop-word-saving-to-onedrive", "Stop Word saving to the cloud", "Make Save work the way you expect again."),
   ("excel-onedrive-sync-conflicts", "Excel sync conflicts", "&ldquo;We couldn&rsquo;t merge the changes&rdquo; &mdash; rescuing the edits you thought you lost."),
   ("excel-spreadsheet-rescue", "Excel spreadsheet rescue", "Broken, corrupt or built by someone who left &mdash; we&rsquo;ll get it working."),
 ]),
 ("Teams, licensing &amp; accounts", [
   ("teams-keeps-opening-wrong-account", "Teams opens the wrong account", "Work vs personal untangled for good."),
   ("microsoft-office-unlicensed-product-error", "&ldquo;Unlicensed product&rdquo; error", "Why Office locks itself and the honest ways back."),
   ("how-to-use-microsoft-teams", "Teams, explained", "The plain-English starter for calls, chat and files."),
   ("how-to-secure-your-microsoft-365-account", "Secure your 365 account", "The checks that stop a hijack before it starts."),
 ]),
 ("Microsoft 365 for business", [
   ("microsoft-365-support", "Microsoft 365, managed", "Set up, migrated, secured and supported &mdash; from &pound;4.85 per user."),
   ("former-it-provider-controls-microsoft-365", "Reclaim your Microsoft 365", "When the old IT company still holds your keys."),
   ("microsoft-365-migration", "Microsoft 365 migration", "Moving mail and files without the drama."),
   ("microsoft-365-backup-do-you-need-it", "Do you need 365 backup?", "The honest answer about what Microsoft does and doesn&rsquo;t keep."),
   ("which-microsoft-365-plan", "Which 365 plan?", "Home vs Family vs Business &mdash; picked in plain English."),
   ("locked-out-microsoft-365-admin-account", "Locked-out admin account", "Getting control of your tenant back."),
 ]),
]
_OFFICE_CHIP = {"Outlook": "Outlook", "OneDrive": "OneDrive", "Word &amp; Excel": "Word/Excel",
                "Teams, licensing &amp; accounts": "Teams+", "Microsoft 365 for business": "Business"}


def _office_cluster_section(exclude=()):
    ex = set(exclude)

    def anchor(t):
        return 'mo-' + _re.sub(r'[^a-z0-9]+', '-', t.replace('&amp;', 'and').lower()).strip('-')

    chips, groups = "", ""
    for gtitle, cards in _OFFICE_CLUSTER:
        cards = [c for c in cards if c[0] not in ex]
        if not cards:
            continue
        a = anchor(gtitle)
        chips += f'          <a href="#{a}">{_OFFICE_CHIP.get(gtitle, gtitle.split()[0])}</a>\n'
        items = "\n".join(
            f'            <a href="/{s2}/"><strong>{t}</strong><span>{b}</span></a>' for s2, t, b in cards)
        groups += (f'        <div class="dell-dir-group" id="{a}">\n'
                   f'          <h3>{gtitle}</h3>\n'
                   f'          <div class="dell-dir">\n{items}\n          </div>\n'
                   f'        </div>\n')
    return ('    <section class="blog-section section--alt" aria-label="Everything Microsoft Office" id="office-help">\n'
            '      <div class="wrap">\n'
            '        <div class="section-head">\n'
            '          <p class="eyebrow eyebrow--center mono" data-reveal>// EVERYTHING MICROSOFT OFFICE &middot; SUPPORTED SINCE 1995 &middot; TAUGHT FOR 10+ YEARS</p>\n'
            '          <h2 class="section-title section-title--center" data-title>Browse all our Microsoft Office help<span class="title-underline title-underline--center"></span></h2>\n'
            '          <p class="lede lede--center" data-reveal>Thirty years of Office, all in one place &mdash; from a firm that taught it at our own Dorset Microsoft Education Resource Centre. Jump to what you need, or <a href="/contact/">talk to a techie</a>.</p>\n'
            '        </div>\n'
            '        <div class="dell-dir-chips mono" data-reveal>\n' + chips + '        </div>\n'
            + groups +
            '      </div>\n'
            '    </section>')
