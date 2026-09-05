# -*- coding: utf-8 -*-
"""SEO wave 9 (5 Sep 2026): the remaining eight pages from the measured BUILD queue.

Built the same day as wave 8, on the owner's decision to build the rest rather than
wait for the early-October measurement. The writer's advice was to measure first;
the owner reaffirmed, so this is the full remainder of the queue as the 5 Sep
planner listed it. Eight pages, one module, same depth as waves 5-8.

  cost-to-upgrade-office-to-windows-11          buyer / cost   (wave 4 crossover)
  transfer-microsoft-365-when-owner-leaves      process        (wave 5 M365 depth)
  onedrive-couldnt-merge-changes                symptom        (OneDrive)
  onedrive-file-locked-by-another-user          symptom        (OneDrive)
  onedrive-not-syncing-between-two-computers    symptom        (OneDrive)
  two-onedrive-accounts-personal-and-work       symptom        (OneDrive)
  teams-chat-files-disappeared                  symptom        (Teams)
  virgin-media-email-wont-add-to-new-outlook    symptom        (ISP email hub: virginmedia.com,
                                                                ntlworld.com, blueyonder.co.uk)

EDITORIAL GUARDS THAT MUST NOT BE UNDONE
  - PRICES: the cost page carries ONLY figures the site already publishes elsewhere -
    refurbished Dell from 510 (refurb pages), plans 18.25 / 24.38 per computer, M365
    4.85 per user - and NO figure for Windows 10 ESU, because /windows-10-esu-business-
    cost/ publishes none. No "average office" total, no per-PC labour price, no
    invented number of any kind. If a future edit adds a price, it has broken the page.
  - NO legal, company-law, employment-law, tax or contract advice on the owner-leaves
    page. It may say "that one is for your solicitor or accountant" and nothing more.
  - ISP email: Virgin Media's settings were VERIFIED 5 Sep 2026 against Virgin's own
    help pages (imap.virginmedia.com 993 SSL; smtp.virginmedia.com 465 SSL with
    authentication; full address as username). Virgin also states: no new addresses are
    created, and mailboxes are deleted 90 days after a customer leaves. Both are quoted
    as Virgin's statements, with the reader sent to Virgin's page as the final word.
  - Where a claim could not be verified it was made vaguer rather than more specific.
    Retention windows, menu labels in the new Outlook, and Teams UI details are stated
    at the level the writer was sure of. Vaguer-but-true beats specific-and-wrong.
  - No shop, no premises, no "pop in". Remote first, or we come to you.

Rendered by build_extra.build_new_page(). Separate module per wave, as ever.
"""

_RESET = ('Press the Windows key and R together and run <code>%localappdata%\\Microsoft\\'
          'OneDrive\\onedrive.exe /reset</code>. On some PCs the app lives under Program Files '
          'instead, in which case the same command with <code>C:\\Program Files\\Microsoft '
          'OneDrive\\onedrive.exe</code> is the one that works; use whichever is present. The '
          'icon disappears and returns within a couple of minutes.')

SEO_WAVE9_PAGES = [
 {'slug': 'cost-to-upgrade-office-to-windows-11',
  'title': 'Cost to Upgrade an Office to Windows 11 (UK) | 365 Techies',
  'metaDesc': 'What upgrading an office to Windows 11 really costs in the UK: the three separate bills, which machines need replacing, and the costs nobody budgets for.',
  'ogTitle': 'What It Costs to Upgrade an Office to Windows 11',
  'crumbName': 'Office Windows 11 Cost',
  'eyebrow': '// WINDOWS 11 FOR BUSINESS',
  'h1': 'What it costs to upgrade an office to Windows 11',
  'lede': 'Windows 10 stopped receiving security updates in October 2025, and every office that '
          'has not moved yet is now working out what moving costs. The honest answer is that it '
          'is not one bill but three, and the size of each depends entirely on what is sitting '
          'on the desks. Some of your machines will upgrade for nothing but an hour of '
          'someone&rsquo;s time. Some cannot run Windows 11 at all and have to be replaced. And '
          'the third bill &mdash; the one nobody budgets for &mdash; is the software and the '
          'printers that turn out to depend on the old machines. Here is how to count each one '
          'before you commit to any of them.',
  'ctaHead': 'Want the three bills counted for your office?',
  'ctaSub': 'We check every machine, tell you which can upgrade and which cannot, and quote the '
            'rest per computer before anything happens &mdash; across Bournemouth, Poole and '
            'Dorset. Call 01202 775566.',
  'serviceName': 'Office Windows 11 Upgrade Planning',
  'sections': [
   {'eyebrow': '/01 &mdash; THREE BILLS',
    'h2': 'Machines that cannot, machines that can, and the day itself',
    'html': '<p>Every quote for an office upgrade is really three separate sums, and it pays to '
            'keep them apart, because they are decided by different things and you have '
            'different amounts of control over each.</p><ul><li><strong>Machines that cannot '
            'run Windows 11.</strong> Windows 11 needs a processor from roughly 2018 onwards, '
            'a security chip called TPM 2.0, and modern firmware. A PC that lacks any of them '
            'will not take the upgrade, whatever you do to it. Microsoft&rsquo;s own PC Health '
            'Check tool tells you in a minute, per machine. These have to be replaced, and '
            'this is usually the largest of the three bills.</li><li><strong>Machines that '
            'can.</strong> For these the upgrade itself is free. What it costs is time: a '
            'backup first, an hour or two per machine mostly spent waiting, a check afterwards '
            'that everything still works, and someone to do it who will notice when it does '
            'not.</li><li><strong>The day itself.</strong> Whoever does the work, the office '
            'is disrupted while it happens, and something always turns up that nobody knew '
            'depended on the old setup. Section 04 is about that, and it is where the '
            'surprises live.</li></ul><p>Count the first group before anything else. It is the '
            'number that turns this from a chore into a purchase.</p>'},
   {'eyebrow': '/02 &mdash; THE REPLACEMENTS',
    'h2': 'What a replacement machine actually costs, and the choice inside it',
    'html': '<p>For the machines that cannot upgrade, the cost is a purchase, and there is a '
            'real choice to make about what kind. For office work &mdash; email, documents, '
            'accounts, the browser &mdash; there are broadly three routes.</p><ul><li><strong>'
            'Refurbished business-class machines.</strong> Ex-corporate Dell desktops and '
            'laptops, built for a five-year office life and typically a couple of years into '
            'it, with a warranty. On our own refurbished pages these start from &pound;510, '
            'and for most desk jobs they are the sensible middle.</li><li><strong>New '
            'business-class machines.</strong> The same class of hardware, new, with a longer '
            'warranty ahead of it. On our hardware page new business Dells start above a '
            'thousand pounds. Worth it where the machine will be worked hard or has to last '
            'the full five years.</li><li><strong>New consumer laptops.</strong> The high-street '
            'route, often cheaper on the ticket than a refurbished business machine. They are '
            'built to a different standard &mdash; plastic hinges, soldered memory, a shorter '
            'life under daily office use &mdash; and in our experience they cost more over '
            'five years than they save on day one.</li></ul><p>Whichever route, three things '
            'decide whether a machine will last the distance: 16&nbsp;GB of memory rather '
            'than 8, a solid-state drive rather than a spinning one, and a warranty you can '
            'actually claim on. A machine bought without those is a machine you will be '
            'replacing again.</p>'},
   {'eyebrow': '/03 &mdash; THE FREE ONES',
    'h2': 'What the free upgrade still costs you',
    'html': '<p>For a machine that passes the health check, Microsoft charges nothing for '
            'Windows 11. That does not make the upgrade free; it makes the software free. '
            'What it still costs is care, and skipping the care is how a free upgrade turns '
            'into a lost afternoon.</p><ul><li><strong>A backup first, every time.</strong> '
            'The upgrade almost always keeps files and programs, and &ldquo;almost&rdquo; is '
            'the word to plan around. A machine with no backup is a machine you are '
            'gambling with.</li><li><strong>The keys and passwords you will need.</strong> '
            'Drive encryption recovery keys, the licence keys for any software that asks for '
            'one on reinstall, the account details for Microsoft 365. Collect them before '
            'you start, not when a screen is asking for them.</li><li><strong>Drivers and '
            'peripherals.</strong> The upgrade takes an hour or two of mostly waiting. The '
            'time you notice is afterwards, when the label printer or the scanner or the '
            'second screen behaves differently and needs a driver from the maker&rsquo;s '
            'site.</li><li><strong>Someone doing it who knows what &ldquo;normal&rdquo; '
            'looks like.</strong> The person who notices that the accounts package is '
            'slower, or that the shared drive is asking for a password it never asked for '
            'before, is the difference between a quiet upgrade and a week of small '
            'complaints.</li></ul><p>Done in sequence, with the office warned, the free '
            'machines are genuinely the easy part. Done on a Friday afternoon with no '
            'backup, they are not.</p>'},
   {'eyebrow': '/04 &mdash; THE COSTS NOBODY BUDGETS',
    'h2': 'The software and the printers that were secretly holding the office up',
    'html': '<p>The bill that surprises people is never the machines. It is the discovery, '
            'on the day, of everything that quietly depended on the old ones. Some of these '
            'are cheap to fix and some are the real cost of the whole project, and you want '
            'to find them before the day, not on it.</p><ul><li><strong>The one old program.'
            '</strong> The accounts package from a decade ago, the stock system, the label '
            'software. Most can be made to run on Windows 11; a few cannot, and those need a '
            'plan &mdash; a current version, a replacement, or an old machine kept off the '
            'network for that one job. We have written the whole diagnosis up separately, '
            'and it is worth reading before you count anything else.</li><li><strong>Printers '
            'and scanners.</strong> Printing usually survives. Scanning to a shared folder '
            'often does not, because Windows 11 is stricter about how a scanner is allowed '
            'to sign in to a PC. It is fixable, and it is a known, recurring cost of the '
            'day.</li><li><strong>The NAS or the shared drive.</strong> An older network '
            'storage box can vanish from the network after the move, for the same '
            'security-tightening reasons. Again fixable; again worth knowing in advance.'
            '</li><li><strong>Downtime.</strong> A desk without a working computer is a '
            'person not working. Staggering the office over several days costs nothing and '
            'avoids the whole team stopping at once.</li><li><strong>Buying time instead.'
            '</strong> Microsoft sells Extended Security Updates for Windows 10 as a paid '
            'bridge for businesses that cannot move yet. It is not a fix and it is not '
            'forever, but for an office with a genuine reason to wait it is a legitimate '
            'line in the budget. We have written up what it involves separately.</li></ul>'},
   {'eyebrow': '/05 &mdash; HOW WE COUNT IT',
    'h2': 'How we would price it for your office, and what happens after',
    'html': '<p>We would rather count than guess, so this is what we actually do. We check '
            'every machine in the office &mdash; remotely where we can, in person where we '
            'cannot &mdash; and give you the three lists: which can upgrade, which cannot, '
            'and what is attached to each that needs care on the day. Then we quote it per '
            'machine, in writing, before anything is touched. Replacements are priced from '
            'the refurbished and new options above, with the trade-offs spelled out; the '
            'upgrade work and the day itself are quoted as time. You see the whole number '
            'before you say yes.</p><p>Afterwards is where an upgrade either pays off or '
            'does not. A machine that is kept updated, backed up and looked at regularly '
            'lasts its five years; one that is left alone starts collecting problems again '
            'within months. If you are on one of our support plans &mdash; per computer, '
            'business from &pound;24.38 a month, no lock-in &mdash; we plan the upgrade into '
            'your service visits and the looking-after is already covered. If you are not, '
            'it is a one-off job, quoted the same way, and the offer of a plan is there '
            'afterwards without any pressure to take it. Either way, the call is free and '
            'the counting is the useful part.</p>'}],
  'faqs': [
   {'q': 'Do we actually have to upgrade to Windows 11?',
    'a': 'Windows 10 stopped receiving security updates in October 2025, so a Windows 10 '
         'office is now running without protection against anything discovered since. For '
         'a business that handles customer data, that is a real risk rather than a '
         'theoretical one. Microsoft sells paid Extended Security Updates as a bridge for '
         'offices that genuinely cannot move yet, but it is a bridge, not a destination.'},
   {'q': 'Is the Windows 11 upgrade itself free?',
    'a': 'Yes, for any machine that meets the requirements &mdash; a processor from roughly '
         '2018 onwards, a TPM 2.0 security chip and modern firmware. Microsoft charges '
         'nothing for the software. What it costs is the time to back up, upgrade and check '
         'each machine, and whatever turns out to need attention afterwards.'},
   {'q': 'Refurbished or new for the machines that cannot upgrade?',
    'a': 'For ordinary office work, a refurbished business-class machine &mdash; from '
         '&pound;510 on our own pages &mdash; is usually the sensible middle: built for a '
         'five-year office life, a couple of years into it, with a warranty. New '
         'business-class hardware makes sense where a machine will be worked hard or must '
         'last the full five years. The high-street consumer laptop is the route we would '
         'steer an office away from, whatever the ticket price.'},
   {'q': 'How much does the office lose while it happens?',
    'a': 'Per machine, an hour or two of mostly waiting for the ones that upgrade, and a '
         'swap for the ones that are replaced. The cost is in stopping everyone at once, '
         'which there is no reason to do: staggered over a few days, with the office warned '
         'and a backup taken first, most people lose a coffee break.'},
   {'q': 'What is the cost people most often forget?',
    'a': 'The one old program. An accounts package or a stock system that has run for a '
         'decade may not open on Windows 11, and finding that out on the day is what turns '
         'a planned upgrade into an emergency. Find it first: we have a separate guide to '
         'what can be made to run, what cannot, and what to do about each.'}],
  'chips': ['Quoted per machine', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get the office counted', '/contact/'],
  # 5 Sep 2026: the hand-off is to the SERVICE this visit is about, not a second phone link -
  # every symptom page pointed only at /contact/, and the service pages earned 43 clicks of 888.
  # The number is still in ctaSub and the header.
  'secondaryCta': ['Windows 11 upgrade service', '/windows-11-upgrade-service/'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/old-program-wont-open-on-windows-11/">Old program won&rsquo;t open '
                    'on Windows 11</a> &middot; <a href="/windows-10-end-of-life/">Windows 10 '
                    'end of life</a> &middot; <a href="/windows-10-esu-business-cost/">Windows '
                    '10 Extended Security Updates for business</a> &middot; <a '
                    'href="/dell-this-pc-cant-run-windows-11/">This PC can&rsquo;t run Windows '
                    '11</a> &middot; <a href="/refurbished-dell-desktops-dorset/">Refurbished '
                    'Dell desktops</a> &middot; <a href="/windows-11-upgrade-service/">Windows '
                    '11 upgrade service</a></p>'},

 {'slug': 'transfer-microsoft-365-when-owner-leaves',
  'title': 'Transfer Microsoft 365 When the Owner Leaves | 365 Techies',
  'metaDesc': 'The person who set up Microsoft 365 is leaving. What their account holds, the order to hand it over in, and the two mistakes that lock a business out.',
  'ogTitle': 'Transferring Microsoft 365 When the Owner Leaves the Company',
  'crumbName': 'M365 Owner Handover',
  'eyebrow': '// MICROSOFT 365 SUPPORT',
  'h1': 'Transferring Microsoft 365 when the owner leaves the company',
  'lede': 'The person who set Microsoft 365 up is retiring, selling up, or moving on &mdash; and '
          'their login is the one everything hangs off. It is the administrator, it is the '
          'billing contact, it is very possibly the only account that can add or remove anyone '
          'else, and the code that proves it is them arrives on their personal phone. Handled '
          'in the right order this is a morning&rsquo;s work. Handled in the wrong order, or '
          'after they have gone, it is how a business ends up locked out of its own email. '
          'Here is what that account actually holds, the order to move it in, and the two '
          'mistakes to avoid.',
  'ctaHead': 'Owner leaving and Microsoft 365 in their name?',
  'ctaSub': 'We do the technical handover for businesses across Bournemouth, Poole and Dorset '
            '&mdash; roles, billing, mailbox, files and sign-in &mdash; usually remotely. Call '
            '01202 775566.',
  'serviceName': 'Microsoft 365 Ownership Handover',
  'sections': [
   {'eyebrow': '/01 &mdash; WHAT THE ACCOUNT HOLDS',
    'h2': 'Everything that quietly lives in the owner&rsquo;s login',
    'html': '<p>A Microsoft 365 account that was created by the person who set the business '
            'up is rarely just a mailbox. Over the years it accumulates roles that nobody '
            'wrote down, and three of them depend on a phone that is about to walk out of '
            'the door.</p><ul><li><strong>The Global Administrator role.</strong> The power '
            'to add and remove people, reset passwords, change settings, and hand out every '
            'other role. Very often it is the <em>only</em> account that has it.</li><li>'
            '<strong>The billing relationship.</strong> The subscription is paid from a card '
            'or an account in someone&rsquo;s name, and the renewal notices go to their '
            'address.</li><li><strong>The domain.</strong> Your email address ends in your '
            'company&rsquo;s name because that domain was verified from this account, and '
            'the login to the company that registers the domain is often the '
            'owner&rsquo;s personal one.</li><li><strong>The second factor.</strong> The '
            'authenticator app or the text-message code that proves it is really them lands '
            'on their personal phone. Every one of the powers above is behind '
            'it.</li><li><strong>Years of business email</strong>, a OneDrive full of company '
            'files, and ownership of the Teams, groups and SharePoint sites the office '
            'runs on.</li></ul><p>None of that is a problem while they are still here and '
            'still answering their phone. The whole job is to move it before that stops '
            'being true.</p>'},
   {'eyebrow': '/02 &mdash; THE ORDER',
    'h2': 'The handover, in the order that cannot lock you out',
    'html': '<p>The sequence matters more than any single step. Done in this order, at no '
            'point is there only one person who can get in.</p><ol><li><strong>Make a second '
            'Global Administrator first.</strong> Before anything else, a real, named person '
            'who is staying gets the Global Administrator role, sets up their own second '
            'factor on their own phone, and signs in to prove it works. Alongside it, keep an '
            'emergency admin account whose details are written down and stored somewhere '
            'safe &mdash; a sealed envelope in the safe is not old-fashioned, it is exactly '
            'right &mdash; for the day both phones are lost.</li><li><strong>Move the '
            'billing.</strong> In the admin centre&rsquo;s billing area, add the new person '
            'as a billing administrator and change the payment method and the contact that '
            'renewal notices go to. The exact screens move about; the principle does '
            'not.</li><li><strong>Secure the domain.</strong> Find out who holds the login '
            'for the company that registers your domain, and make sure it is the business, '
            'with a recovery address that is not the leaver&rsquo;s personal one. Losing the '
            'domain login is the one mistake that cannot be undone from inside Microsoft '
            '365.</li><li><strong>Check nothing else routes through their phone.</strong> '
            'Recovery phone numbers on the tenant, the second factor on any shared '
            'accounts, the alerts Microsoft sends when something is wrong.</li><li><strong>'
            'Write down the licences.</strong> What is paid for, who has what, and when it '
            'renews. Ten minutes now saves an argument later.</li><li><strong>Only then '
            'deal with the leaver&rsquo;s own account.</strong> Section 03.</li></ol>'},
   {'eyebrow': '/03 &mdash; THE MAILBOX AND THE FILES',
    'h2': 'What to do with their email, their OneDrive and the things they own',
    'html': '<p>Once the powers have moved, the leaver&rsquo;s own account can be dealt '
            'with calmly, and the guiding rule is: <strong>do not delete it until everything '
            'in it has somewhere else to be.</strong></p><ul><li><strong>The mailbox.</strong> '
            'The usual answer is to convert it to a shared mailbox. The years of email stay '
            'searchable, chosen people can read it and reply from the address, it no longer '
            'needs a licence, and nobody has to know the leaver&rsquo;s password. Forwarding '
            'new mail to a colleague, with an automatic reply saying who now looks after '
            'what, covers the transition.</li><li><strong>Their OneDrive.</strong> Anything '
            'in it that belongs to the business moves to a shared location &mdash; a '
            'SharePoint library or a Teams channel &mdash; before the account goes. '
            'Microsoft keeps a departed user&rsquo;s OneDrive reachable to an administrator '
            'for a limited period after the account is deleted, and how long is set by '
            'policy, so treat that as a safety net rather than a plan.</li><li><strong>'
            'Ownership of Teams, groups and sites.</strong> Anything the leaver owned needs a '
            'new owner named, or the office will discover one day that nobody can add a '
            'member to the team it works in.</li><li><strong>The address itself.</strong> '
            'Customers will keep writing to it for years. Keep it alive as the shared '
            'mailbox, or as an alias on whoever inherits the role.</li></ul><p>Then, and only '
            'then, remove the licence and the account.</p>'},
   {'eyebrow': '/04 &mdash; THE TWO MISTAKES',
    'h2': 'The two ways this locks a business out, and what to do if it already has',
    'html': '<p>Almost every locked-out business we meet made one of two mistakes, and both '
            'are made with good intentions.</p><ul><li><strong>Removing the only '
            'administrator before making another.</strong> Someone tidies up the leaver&rsquo;s '
            'account on their last day, and with it goes the only login that can create an '
            'administrator. Nobody notices until the next time someone needs adding or a '
            'password resetting.</li><li><strong>Leaving the second factor on a phone that '
            'has gone.</strong> The account still exists, the password is known, and every '
            'sign-in stops at a code that is being sent to a phone the business no longer '
            'has. We have written this one up on its own, because it is that common.'
            '</li></ul><p>If it has already happened, do not panic and do not start guessing '
            'at recovery options that could make it worse. First, ask the leaver. Most '
            'people will happily spend twenty minutes on the phone doing a handover they '
            'did not realise was needed. If they cannot be reached, or the parting was not '
            'friendly, Microsoft has a process for a business that can prove it owns the '
            'domain to regain control of its tenant. It works, it involves paperwork and '
            'patience rather than a quick fix, and it is much easier with someone who has '
            'been through it before. If a previous IT provider holds the keys instead of a '
            'former owner, that is a related problem we have also written up.</p>'},
   {'eyebrow': '/05 &mdash; WHAT WE DO, AND WHAT WE DON&rsquo;T',
    'h2': 'The technical handover is our job; the sale is not',
    'html': '<p>We do the whole technical side of this, usually in one or two remote '
            'sessions with whoever is taking over: the new administrator and the emergency '
            'account, the billing contact, the domain check, the second factor moved to the '
            'right phones, the mailbox converted, the files moved to shared places, the '
            'ownership of teams and sites reassigned, and a one-page record of what is '
            'licensed and who holds what. When the leaver is still around we bring them into '
            'the session so nothing depends on a password being read out. When they are '
            'not, we work the recovery route with you.</p><p>What we do not do is advise on '
            'the sale, the shareholding, the employment side or the contracts &mdash; who is '
            'entitled to what, what must be kept for how long, what the leaver may take with '
            'them. Those are for your solicitor or your accountant, and we will happily work '
            'alongside them. Our job is that when the answer comes back, the systems are '
            'ready to do what it says.</p><p>If you would like Microsoft 365 looked after '
            'properly afterwards rather than left in one person&rsquo;s name again, we do '
            'that too, per user, without a contract. The first conversation is free either '
            'way.</p>'}],
  'faqs': [
   {'q': 'Can we keep the leaver&rsquo;s email address?',
    'a': 'Yes, and you almost certainly should &mdash; customers will keep writing to it for '
         'years. The usual route is to convert the mailbox to a shared mailbox, which keeps '
         'all the old email searchable, lets chosen staff read and reply from the address, '
         'and no longer needs a licence. An alias on a colleague&rsquo;s mailbox does the '
         'same for the address alone.'},
   {'q': 'What happens to their OneDrive files?',
    'a': 'Move anything that belongs to the business into a shared location before the '
         'account is removed. Microsoft keeps a departed user&rsquo;s OneDrive reachable to '
         'an administrator for a limited period afterwards, set by policy, but that is a '
         'safety net rather than a plan. Once the window closes the files are gone.'},
   {'q': 'They have already left, and they had the only administrator login',
    'a': 'Ask them first; most people will do a twenty-minute handover once they realise it '
         'is needed. If they cannot be reached, Microsoft has a process for a business that '
         'can prove it owns the domain to regain control of its tenant. It involves '
         'paperwork and patience rather than a quick fix, and it goes more smoothly with '
         'someone who has done it before.'},
   {'q': 'Do we lose the licences or the subscription?',
    'a': 'No. The subscription belongs to the organisation&rsquo;s tenant, not to the '
         'person, and it carries on. What has to change is who administers it and who pays '
         'for it &mdash; the billing contact and payment method &mdash; so the renewal does '
         'not fail on a card that has been cancelled.'},
   {'q': 'Can the new owner just use the old login?',
    'a': 'They can, and it is the wrong answer. The second factor is on the old owner&rsquo;s '
         'phone, the password is now known to someone outside the business, and everything '
         'done under that login is recorded as the old owner doing it. Give the new person '
         'their own account with the administrator role and their own second factor, and '
         'retire the old one properly.'}],
  'chips': ['Remote in most cases', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it handed over properly', '/contact/'],
  # 5 Sep 2026: the hand-off is to the SERVICE this visit is about, not a second phone link -
  # every symptom page pointed only at /contact/, and the service pages earned 43 clicks of 888.
  # The number is still in ctaSub and the header.
  'secondaryCta': ['Microsoft 365 support', '/microsoft-365-support/'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/locked-out-microsoft-365-admin-account/">Locked out of the Microsoft '
                    '365 admin account</a> &middot; <a '
                    'href="/former-it-provider-controls-microsoft-365/">Former IT provider still '
                    'controls Microsoft 365</a> &middot; <a '
                    'href="/what-to-do-when-an-employee-leaves/">When an employee leaves</a> '
                    '&middot; <a href="/business-email-when-closing-your-company/">Business '
                    'email when closing a company</a> &middot; <a '
                    'href="/take-over-email-domain-after-buying-business/">Taking over email '
                    'after buying a business</a> &middot; <a '
                    'href="/microsoft-365-support/">Microsoft 365 support</a></p>'},

 {'slug': 'onedrive-couldnt-merge-changes',
  'title': 'OneDrive Couldn&rsquo;t Merge the Changes? Fix It | 365 Techies',
  'metaDesc': 'Word or Excel says it could not merge the changes in an Office file. Your work is not lost. Save a copy first, then why it happens and how to stop it.',
  'ogTitle': 'OneDrive: We Couldn&rsquo;t Merge the Changes in an Office File',
  'crumbName': 'Couldn&rsquo;t Merge Changes',
  'eyebrow': '// ONEDRIVE SUPPORT',
  'h1': 'OneDrive says it couldn&rsquo;t merge the changes in an Office file',
  'lede': 'You press save and Word or Excel comes back with a box: it could not merge the '
          'changes, would you like to save a copy? It is one of the more alarming messages in '
          'Office, because it sounds like your afternoon&rsquo;s work is about to vanish. It is '
          'not. It means two versions of the file now exist &mdash; the one on your screen and '
          'the one in the cloud &mdash; and Office does not know how to combine them. Here is '
          'the one thing to do before anything else, what actually causes it, and how to make '
          'it stop coming back.',
  'ctaHead': 'Still getting the merge error every time you save?',
  'ctaSub': 'We sort OneDrive and Office sync for homes and businesses across Bournemouth, '
            'Poole and Dorset &mdash; usually remotely, in one short session. Call 01202 '
            '775566.',
  'serviceName': 'OneDrive and Office Sync Support',
  'sections': [
   {'eyebrow': '/01 &mdash; FIRST, KEEP YOUR WORK',
    'h2': 'Before you click anything: save a copy somewhere else',
    'html': '<p>Do not close the file, do not click the option that sounds like it will '
            'overwrite something, and do not try to fix the sync while the document is '
            'open. First make your version safe. Use <em>File</em>, then <em>Save a '
            'Copy</em> or <em>Save As</em>, and put it on the Desktop with a new name '
            '&mdash; <em>proposal-mine.docx</em>, anything. The moment that copy exists, '
            'nothing on this page can lose your work.</p><p>Then look at what the cloud '
            'has. Open OneDrive in a web browser and open the same file there. Sometimes it '
            'is identical to yours, sometimes it is missing your last hour, and sometimes '
            'it has a colleague&rsquo;s changes that you do not. Now you can decide calmly: '
            'keep yours, keep theirs, or open both side by side and merge the difference by '
            'hand. Office offers the same choice in its own words &mdash; keep both, keep '
            'your version, or keep the copy in the cloud &mdash; and keeping both is never '
            'wrong.</p><p>What you are seeing is not corruption. The file is fine. It is a '
            'disagreement about which of two versions is the real one, and you have just '
            'made sure you are holding one of them.</p>'},
   {'eyebrow': '/02 &mdash; WHAT CAUSES IT',
    'h2': 'How a file ends up with two versions that Office cannot reconcile',
    'html': '<p>Office can merge simple changes from two places when it is allowed to '
            'watch both happen &mdash; that is co-authoring. The merge fails when it was '
            'not watching, or when the file contains something it cannot merge. Nearly '
            'every case is one of these.</p><ul><li><strong>You edited it on two devices.'
            '</strong> Open on the laptop, edited on the desktop, saved on both. Each save '
            'raced the other to the cloud.</li><li><strong>Someone else edited it outside '
            'co-authoring.</strong> A colleague opened the same file in desktop Excel with '
            'AutoSave off, or from an emailed copy, and saved over the cloud version while '
            'yours was open.</li><li><strong>OneDrive was paused or offline while the file '
            'was open.</strong> You worked through a train journey; the cloud copy moved on '
            'without you; the first save on reconnecting collided with it.</li><li><strong>'
            'The file contains something Office cannot merge.</strong> Macros, some legacy '
            'features, and above all the old formats &mdash; <em>.xls</em> and <em>.doc</em> '
            'rather than <em>.xlsx</em> and <em>.docx</em>. Old-format files cannot '
            'co-author at all, so every simultaneous edit becomes a collision.</li><li>'
            '<strong>One folder, two OneDrives.</strong> A folder synced to a personal '
            'OneDrive on one PC and a work one on another produces this endlessly.</li></ul>'},
   {'eyebrow': '/03 &mdash; WHEN IT HAPPENS EVERY TIME',
    'h2': 'The tangled cache that repeats the error on every save',
    'html': '<p>If the message comes back on every save of every file, the collision is not '
            'in your documents any more &mdash; it is in the bookkeeping. Office keeps a '
            'local cache of files on their way to the cloud, and when that cache gets '
            'tangled it reports a merge problem for files that have no conflict at all.</p>'
            '<p>Clearing it is safe once your open work is saved. Close every Office '
            'program. Then either use the button Office provides for it &mdash; in <em>File</em>, '
            '<em>Options</em>, under <em>Save</em>, there is an option to delete the cached '
            'files &mdash; or, with Office fully closed, the Office document cache folder '
            'under your local Office data can be removed and it rebuilds itself on the next '
            'open. Then pause OneDrive from its icon by the clock and resume it, so it '
            're-checks its own queue. If it still misbehaves, sign out of OneDrive and back '
            'in.</p><p>One habit worth building while you are at it: look at the OneDrive '
            'icon before you start a long editing session. If it is paused or showing a '
            'problem, sort that first, because a file edited for three hours while sync was '
            'stopped is a merge error waiting to happen.</p>'},
   {'eyebrow': '/04 &mdash; STOP IT COMING BACK',
    'h2': 'Four habits that end merge errors for good',
    'html': '<ul><li><strong>Turn AutoSave on and leave it on.</strong> The switch at the '
            'top-left of Word and Excel. With it on, every change goes to the cloud as you '
            'make it and Office can see what everyone is doing. With it off, you are '
            'saving in large lumps that collide.</li><li><strong>One file, one place.</strong> '
            'Everyone opens the document from the shared location &mdash; the OneDrive or '
            'SharePoint folder &mdash; never from an emailed copy or a download. An emailed '
            'copy is a fork, and forks do not merge.</li><li><strong>Use the modern '
            'formats.</strong> Save old <em>.xls</em> and <em>.doc</em> files as '
            '<em>.xlsx</em> and <em>.docx</em> once, and the collisions from that source '
            'stop. Spreadsheets with macros need the macro-enabled format and still will not '
            'co-author; those want one owner at a time.</li><li><strong>For shared '
            'spreadsheets, edit in the browser.</strong> Excel in the browser co-authors '
            'cleanly and cannot be opened with AutoSave off. For a workbook that six people '
            'poke at all day, it is the calmer home.</li></ul><p>If the file that keeps '
            'colliding is a business-critical one &mdash; the accounts workbook, the job '
            'sheet &mdash; that is worth a proper look at how the office shares it, and it '
            'is routine work for us: one remote session, while you watch.</p>'},
   {'eyebrow': '/05 &mdash; THE COPIES IT LEAVES',
    'h2': 'What to do with the &ldquo;conflict&rdquo; copies afterwards',
    'html': '<p>After a collision you will often find two files where there was one: the '
            'original, and a copy whose name has your computer&rsquo;s name or the word '
            '<em>conflict</em> added to the end. OneDrive made it deliberately, to keep both '
            'versions rather than guess. It is not a fault; it is the safety net working.'
            '</p><p>Open both, decide which is right &mdash; or merge them &mdash; and '
            'delete the other. Do it soon: left for a month, nobody remembers which was '
            'which, and the office ends up with two half-right versions of the same '
            'document being edited by different people. If you find a lot of them, that is '
            'a sign that one of the causes in section 02 is still in play, and the fix is '
            'the habit, not the tidy-up.</p><p>Version history is your friend here too. '
            'Right-click a file in OneDrive and choose <em>Version history</em> and you can '
            'see and restore earlier saves, which is a calmer way to recover a lost paragraph '
            'than comparing conflict copies by eye.</p>'}],
  'faqs': [
   {'q': 'Have I lost my work?',
    'a': 'No. The version on your screen is still there until you close it, which is why '
         'the first step is to save a copy to the Desktop with a new name before doing '
         'anything else. The other version is in OneDrive, and its version history holds '
         'earlier saves too. Between the three, nothing is gone.'},
   {'q': 'Which copy should I keep?',
    'a': 'Open both. If one simply has more of the recent work, keep that one. If each has '
         'changes the other lacks &mdash; yours and a colleague&rsquo;s &mdash; keep both '
         'and merge by hand, or accept Office&rsquo;s offer to keep both and merge later. '
         'Keeping both is never the wrong choice; overwriting is the one to avoid.'},
   {'q': 'It says another user changed the file, but nobody else has it',
    'a': 'The other user is usually you on another device, or OneDrive itself replaying an '
         'earlier save from a laptop that was offline. Occasionally it is a colleague who '
         'opened a copy from an email. Check the version history in OneDrive: it names who '
         'saved what and when.'},
   {'q': 'Does this mean the file is corrupt?',
    'a': 'No. A merge error is a disagreement between two versions, not damage to either. '
         'Genuinely damaged Office files produce a different, more dramatic message about '
         'the file being unreadable. If you ever see that one, stop and ring us before '
         'trying repairs; version history usually has a clean copy from before it happened.'},
   {'q': 'It happens on every file, every time I save',
    'a': 'Then the collision is in Office&rsquo;s local cache rather than in your documents. '
         'Save your open work, close every Office program, clear the document cache using '
         'the option under File, Options, Save, then pause and resume OneDrive. If it '
         'persists after that, sign out of OneDrive and back in, or ring us and we will do '
         'it with you.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  # 5 Sep 2026: the hand-off is to the SERVICE this visit is about, not a second phone link -
  # every symptom page pointed only at /contact/, and the service pages earned 43 clicks of 888.
  # The number is still in ctaSub and the header.
  'secondaryCta': ['Microsoft 365 support', '/microsoft-365-support/'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/excel-onedrive-sync-conflicts/">Excel sync conflicts</a> &middot; '
                    '<a href="/onedrive-not-syncing-between-two-computers/">OneDrive not syncing '
                    'between two computers</a> &middot; <a '
                    'href="/two-onedrive-accounts-personal-and-work/">Two OneDrive accounts on one '
                    'PC</a> &middot; <a href="/stop-word-saving-to-onedrive/">Stop Word saving to '
                    'OneDrive</a> &middot; <a href="/onedrive-problems/">OneDrive problems</a></p>'},

 {'slug': 'onedrive-file-locked-by-another-user',
  'title': 'OneDrive File Locked by Another User? Fix It | 365 Techies',
  'metaDesc': 'OneDrive or SharePoint says a file is locked for editing by another user, but nobody has it open. Where the lock comes from and how to clear it.',
  'ogTitle': 'OneDrive File Locked for Editing by Another User, But Nobody Has It Open',
  'crumbName': 'File Locked by Another User',
  'eyebrow': '// ONEDRIVE SUPPORT',
  'h1': 'OneDrive file locked for editing by another user &mdash; but nobody has it open',
  'lede': 'You open the spreadsheet and Excel tells you it is locked for editing by a '
          'colleague. You ask across the office; they closed it an hour ago. Or it names you. '
          'Or it names someone who left last year. The lock is real &mdash; something is '
          'holding the file &mdash; but the something is rarely a person sitting with it '
          'open. Here is where the lock actually comes from, the ten-minute rule that clears '
          'most of them, and what to do about the ones that stay.',
  'ctaHead': 'File still locked after all that?',
  'ctaSub': 'We sort OneDrive and SharePoint for businesses across Bournemouth, Poole and '
            'Dorset &mdash; usually remotely, in one short session. Call 01202 775566.',
  'serviceName': 'OneDrive and SharePoint File Support',
  'sections': [
   {'eyebrow': '/01 &mdash; WHERE THE LOCK COMES FROM',
    'h2': 'Four things that hold a file, and only one of them is a person',
    'html': '<p>When a file lives in OneDrive or SharePoint and someone opens it in the '
            'desktop version of Word or Excel, the service can place a short-term lock on '
            'it so two people do not save over each other. Modern files with AutoSave on '
            'do not need the lock, because everyone edits together. The lock appears when '
            'something has stopped that from being possible.</p><ul><li><strong>A crashed or '
            'interrupted session.</strong> Excel closed unexpectedly, a laptop lid was shut, '
            'the Wi-Fi dropped mid-save. The program is gone but the service has not yet '
            'heard, and it keeps the lock for a while in case the person comes back. This is '
            'the commonest case by a distance.</li><li><strong>You, somewhere else.</strong> '
            'The same file open on your phone, on another PC, in a browser tab you forgot, '
            'or previewed in a Teams tab. To the service, that is another user.</li><li>'
            '<strong>A file that cannot co-author.</strong> Old formats &mdash; <em>.xls</em>, '
            '<em>.doc</em> &mdash; files with macros, and anything opened with AutoSave off '
            'fall back to one-at-a-time editing, and the first person in holds it until they '
            'close it.</li><li><strong>A check-out.</strong> Some SharePoint libraries are '
            'set to require files to be checked out before editing. A checked-out file is '
            'locked to that person until they check it in, and if they have left, it stays '
            'that way until an owner intervenes.</li></ul>'},
   {'eyebrow': '/02 &mdash; THE TEN-MINUTE RULE',
    'h2': 'Wait, and find out who really has it',
    'html': '<p>A lock left by an interrupted session clears itself after a short while '
            '&mdash; roughly ten minutes is a good working figure. So the first move is '
            'unglamorous: make a cup of tea. Meanwhile you can open the file read-only and '
            'copy anything you urgently need out of it.</p><p>If it is still locked '
            'afterwards, find out who genuinely has it. Open the file&rsquo;s location in a '
            'web browser rather than in File Explorer. In OneDrive or SharePoint, the '
            'file&rsquo;s details pane shows who last modified it and who it is shared with, '
            'and opening it in the browser shows who is currently in it. That is the truth; '
            'the name in the desktop error is a best guess that can be hours out of date.'
            '</p><p>If the name is a colleague, ask them to close it everywhere &mdash; the '
            'phone counts, the second monitor counts, the browser tab from this morning '
            'counts. If the name is yours, section 03. If the name is someone who has left, '
            'section 04. And if the file is on an old-fashioned shared drive rather than in '
            'OneDrive, the tools are different and we have a separate guide for that.</p>'},
   {'eyebrow': '/03 &mdash; WHEN IT IS YOU',
    'h2': 'Finding the copy of yourself that is holding it',
    'html': '<p>Being told you have locked a file against yourself is common enough to be '
            'funny once. The service is right: some device signed in as you has the file '
            'open, and it is usually one of these.</p><ul><li><strong>Another computer.</strong> '
            'The office desktop still has it open from yesterday; the laptop at home never '
            'shut it. Close it there, or if you cannot get to that machine, sign it out of '
            'Office remotely from your Microsoft account&rsquo;s device list.</li><li>'
            '<strong>Your phone or tablet.</strong> The Office or OneDrive app opened it '
            'last week and has held it since. Close the app fully, not just switch away from '
            'it.</li><li><strong>A browser tab.</strong> The file open in Excel in the '
            'browser, three windows back.</li><li><strong>Teams.</strong> A Teams tab or '
            'preview pane counts as having it open.</li></ul><p>Close all of them, wait the '
            'ten minutes, try again. If it still names you, sign out of OneDrive on this '
            'PC and back in, which drops any stale session it was holding on your behalf.'
            '</p>'},
   {'eyebrow': '/04 &mdash; THE ONES THAT STAY',
    'h2': 'Stale locks, check-outs, and the leftover lock file',
    'html': '<p>A lock that outlives the ten-minute rule and has no live owner needs a '
            'little more.</p><ul><li><strong>A file checked out to someone who has gone.'
            '</strong> In a library that requires check-out, an owner of the site can '
            'discard the check-out from the library&rsquo;s settings, which releases the '
            'file and keeps the last checked-in version. That is a site-owner job, and it '
            'is one of the things to do when someone leaves.</li><li><strong>The leftover '
            'lock file.</strong> When Word or Excel opens a document, it creates a small '
            'hidden companion file in the same folder whose name starts with <code>~$</code>. '
            'A crash can leave it behind, and while it exists Office believes the document '
            'is open. With the document definitely closed everywhere, show hidden files in '
            'that folder and delete the <code>~$</code> file. It is safe; Office recreates it '
            'next time.</li><li><strong>A lock the service will not drop.</strong> Rare, but '
            'it happens. Copy the file to a new name, carry on working in the copy, and '
            'delete the original once its lock finally clears. Nothing is lost and nobody is '
            'waiting.</li></ul><p>If locks like this are a weekly event in your office, the '
            'cause is almost always one of the habits in section 05, and that is a '
            'ten-minute conversation rather than a recurring emergency.</p>'},
   {'eyebrow': '/05 &mdash; STOP IT HAPPENING',
    'h2': 'The habits that make locks rare',
    'html': '<ul><li><strong>Modern formats.</strong> Save old <em>.xls</em> and <em>.doc</em> '
            'files as <em>.xlsx</em> and <em>.docx</em> and they can co-author instead of '
            'locking.</li><li><strong>AutoSave on.</strong> With it on, several people can '
            'be in the same file at once and nobody holds it.</li><li><strong>Open from the '
            'shared place.</strong> Not from an emailed copy, not from a download.</li><li>'
            '<strong>Shut down, do not just close the lid.</strong> A laptop that goes to '
            'sleep with a file open is the single biggest source of stale locks.</li><li>'
            '<strong>Only require check-out where it is truly needed.</strong> It is the '
            'right setting for a document that must have one author at a time; it is the '
            'wrong default for a whole library.</li><li><strong>Include it in leaving.</strong> '
            'When someone goes, an owner checks their files in and reassigns what they '
            'owned, or the office inherits their locks.</li></ul><p>If you would rather have '
            'this set up properly than remember it, we do that: one remote session, while you '
            'watch, across Bournemouth, Poole and Dorset.</p>'}],
  'faqs': [
   {'q': 'Nobody has the file open, so why does it say it is locked?',
    'a': 'Because a lock is left behind when a session ends badly &mdash; a crash, a laptop '
         'lid shut, the Wi-Fi dropping mid-save &mdash; and the service keeps it for a '
         'while in case the person comes back. Wait about ten minutes and try again. If it '
         'persists, open the file&rsquo;s location in a browser: the details there show '
         'who truly has it, which the desktop error often gets wrong.'},
   {'q': 'How long does the lock last?',
    'a': 'A lock from an interrupted session usually clears itself within about ten '
         'minutes of the program going away. A lock from a file genuinely open somewhere '
         'lasts until that copy is closed. A check-out lasts until the file is checked in '
         'or a site owner discards the check-out.'},
   {'q': 'Can I just make a copy and work in that?',
    'a': 'Yes, and for an urgent job it is the right move: open read-only, save a copy '
         'under a new name, carry on. Just remember to reconcile it with the original once '
         'the lock clears, or the office ends up with two versions. Version history on the '
         'original will show you anything that changed in the meantime.'},
   {'q': 'It says the other user is me',
    'a': 'Then some device signed in as you has it open: another computer, your phone, a '
         'browser tab, a Teams preview. Close it everywhere, wait the ten minutes, and if it '
         'still names you, sign out of OneDrive on this PC and back in to drop the stale '
         'session.'},
   {'q': 'It is checked out to someone who left the company',
    'a': 'An owner of the SharePoint site can discard the check-out from the library&rsquo;s '
         'settings, which releases the file and keeps the last checked-in version. It is '
         'worth doing for everything that person had checked out at once, and it belongs on '
         'the list of things to do whenever someone leaves.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  # 5 Sep 2026: the hand-off is to the SERVICE this visit is about, not a second phone link -
  # every symptom page pointed only at /contact/, and the service pages earned 43 clicks of 888.
  # The number is still in ctaSub and the header.
  'secondaryCta': ['Microsoft 365 support', '/microsoft-365-support/'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/who-has-a-file-open-on-shared-drive/">Who has a file open on the '
                    'shared drive</a> &middot; <a '
                    'href="/sharepoint-not-syncing-file-explorer/">SharePoint not syncing to File '
                    'Explorer</a> &middot; <a href="/excel-onedrive-sync-conflicts/">Excel sync '
                    'conflicts</a> &middot; <a href="/onedrive-problems/">OneDrive problems</a> '
                    '&middot; <a href="/what-to-do-when-an-employee-leaves/">When an employee '
                    'leaves</a></p>'},

 {'slug': 'onedrive-not-syncing-between-two-computers',
  'title': 'OneDrive Not Syncing Between Two Computers | 365 Techies',
  'metaDesc': 'The same OneDrive on a desktop and a laptop, and a file saved on one never appears on the other. Which PC is at fault, how to tell fast, and the fix.',
  'ogTitle': 'OneDrive Not Syncing Between Two Computers on the Same Account',
  'crumbName': 'OneDrive Two Computers',
  'eyebrow': '// ONEDRIVE SUPPORT',
  'h1': 'OneDrive not syncing between two computers on the same account',
  'lede': 'You save a file on the desktop, walk to the laptop, and it is not there. Or it '
          'arrives an hour later. Or the Desktop folder on one machine is full of things the '
          'other has never seen. Both computers are signed in to the same OneDrive, so it '
          'feels like they should simply agree. The thing to understand is that they never '
          'talk to each other at all &mdash; each one talks only to the cloud &mdash; and '
          'that turns a baffling problem into a quick one, because it means exactly one of '
          'the two machines is not doing its half. Here is how to tell which in a minute.',
  'ctaHead': 'Two computers still disagreeing?',
  'ctaSub': 'We sort OneDrive for homes and businesses across Bournemouth, Poole and Dorset '
            '&mdash; usually remotely, in one short session. Call 01202 775566.',
  'serviceName': 'OneDrive Sync Support',
  'sections': [
   {'eyebrow': '/01 &mdash; THE ONE-MINUTE TEST',
    'h2': 'Look at the cloud first, and it tells you which computer is at fault',
    'html': '<p>Nothing goes from one PC to the other. The desktop sends its changes up to '
            'OneDrive; the laptop fetches them down. So when a file is missing, one of two '
            'legs has failed, and the cloud itself is the referee.</p><p>Open OneDrive in a '
            'web browser &mdash; the personal one at OneDrive&rsquo;s own site, or your work '
            'one through the Microsoft 365 portal &mdash; and look for the file.</p><ul><li>'
            '<strong>It is there in the browser.</strong> Then the sending computer did its '
            'job. The problem is on the computer that is not receiving it: section '
            '03.</li><li><strong>It is not there.</strong> Then it never left the computer '
            'it was saved on. The problem is on the sender: section 02.</li></ul><p>That is '
            'the whole diagnosis, and it is worth doing before touching a setting on either '
            'machine, because the two fixes are different and doing the wrong one wastes '
            'an hour. While you are in the browser, note the time the file was last '
            'modified there: it tells you how far behind the slow computer is.</p>'},
   {'eyebrow': '/02 &mdash; THE SENDER',
    'h2': 'When the file never left the computer it was saved on',
    'html': '<p>Go to the computer you saved the file on and look at the OneDrive cloud icon '
            'by the clock. Its state is the answer.</p><ul><li><strong>Not signed in, or '
            'signed in to a different account.</strong> A grey icon, or a personal OneDrive '
            'where the work one should be. Sign in to the right one.</li><li><strong>Paused.'
            '</strong> OneDrive pauses itself on a metered connection &mdash; a phone '
            'hotspot, some broadband that reports itself that way &mdash; and when a laptop '
            'drops into battery saver. Both are switches in its settings under Sync and '
            'backup.</li><li><strong>A red cross.</strong> Some files have problems. Click '
            'the icon and choose <em>View sync problems</em>: a name that is too long, a '
            'character Windows accepts but OneDrive does not, a file that is open and '
            'locked, or a file too large. Fix the named file and the queue moves.</li><li>'
            '<strong>Saved outside OneDrive.</strong> The file is in a folder that looks '
            'like OneDrive but is not &mdash; a local Documents folder on a PC where '
            'Documents is not backed up. Section 04 is about that trap.</li></ul><p>Once the '
            'icon is a plain cloud with a tick, watch the browser: the file should appear '
            'within seconds for a document and within minutes for something large.</p>'},
   {'eyebrow': '/03 &mdash; THE RECEIVER',
    'h2': 'When the cloud has it and the other computer does not',
    'html': '<p>The cloud copy exists, so the sending side is fine. On the computer that '
            'cannot see the file, these are the usual reasons, in order.</p><ul><li>'
            '<strong>It is signed in to a different OneDrive.</strong> Personal on one PC, '
            'work on the other, and they are separate services with separate files. Click '
            'the cloud icon and check the account name.</li><li><strong>The folder is not '
            'selected on this PC.</strong> OneDrive lets each computer choose which folders '
            'to sync. In its settings under Account, <em>Choose folders</em> shows what this '
            'machine takes; a folder unticked here simply never arrives.</li><li><strong>'
            'The file is there, as a placeholder.</strong> Files On-Demand shows files that '
            'live in the cloud with a blue cloud icon in File Explorer, and downloads them '
            'when opened. Look for the icon before deciding it is missing.</li><li><strong>'
            'The PC has not been awake.</strong> A laptop that was shut since yesterday has '
            'not fetched anything since yesterday. Give it a minute after waking.</li><li>'
            '<strong>OneDrive is not running.</strong> Closed by hand, or stopped starting '
            'with Windows. Start it from the Start menu and check it is set to start at '
            'sign-in.</li></ul>'},
   {'eyebrow': '/04 &mdash; THE TRAPS',
    'h2': 'The places two computers on one account quietly diverge',
    'html': '<p>Two machines can be perfectly healthy and still disagree, because of a '
            'setting that was made on one and not the other.</p><ul><li><strong>Desktop and '
            'Documents backup on one PC only.</strong> OneDrive can take over the Desktop, '
            'Documents and Pictures folders so they live in the cloud. If that was switched '
            'on for the desktop and never for the laptop, the desktop&rsquo;s Desktop is in '
            'OneDrive and the laptop&rsquo;s Desktop is just a local folder. Files saved to '
            '&ldquo;the Desktop&rdquo; on the laptop go nowhere. The setting is under Sync '
            'and backup, <em>Manage backup</em>, and it should match on both '
            'machines.</li><li><strong>Two OneDrives, one folder each.</strong> A personal '
            'OneDrive on the home PC and a work one on the office PC will never share a '
            'file. We have a separate guide to sorting that out.</li><li><strong>Conflict '
            'copies.</strong> If both machines edited the same file while one was offline, '
            'OneDrive keeps both and names one after the computer. Neither is lost; you '
            'just have to pick.</li><li><strong>A renamed computer.</strong> After a rename '
            'or a reset, OneDrive may treat the machine as new and start a fresh setup with '
            'default folder choices.</li></ul>'},
   {'eyebrow': '/05 &mdash; RESET AND PROVE IT',
    'h2': 'Resetting OneDrive, then testing with one file',
    'html': '<p>If both sides look healthy and a file still will not cross, reset OneDrive '
            'on the computer that is misbehaving. It is safe: it clears the app&rsquo;s own '
            'records and makes it re-check every file against the cloud, and it deletes '
            'nothing. Check <em>View sync problems</em> first so that anything waiting to '
            'upload is not left behind. Sign out and back in first; if that is not enough, '
            'the reset. ' + _RESET + ' On a large OneDrive it then spends a while '
            're-checking, and files show as syncing without much data moving.</p><p>Then '
            'prove it rather than assume it. Create a small text file on computer A, in a '
            'folder both machines sync. Watch it appear in the browser. Watch it appear on '
            'computer B. Edit it on B; watch the edit come back to A. Thirty seconds, and '
            'you know both legs work. If one leg fails, you know exactly which computer to '
            'look at, and the sections above tell you where.</p>'}],
  'faqs': [
   {'q': 'Do both computers need to be on at the same time?',
    'a': 'No. Each computer talks only to the cloud, never to the other. The desktop sends '
         'its changes up whenever it is on; the laptop fetches them down whenever it is on. '
         'They can be a week apart and still end up with the same files.'},
   {'q': 'The file is in OneDrive in the browser but not on my laptop',
    'a': 'Then the sender is fine and the laptop is the one to look at. Check it is signed '
         'in to the same OneDrive, that the folder is ticked under Choose folders, and '
         'whether the file is actually there as a blue-cloud placeholder waiting to be '
         'downloaded. If all three check out, sign out of OneDrive on the laptop and back '
         'in.'},
   {'q': 'The file has a blue cloud icon &mdash; is it synced or not?',
    'a': 'It is synced. A blue cloud means the file lives in the cloud and will download '
         'the moment you open it; a green tick means it is also stored on this computer. '
         'Both are healthy. Right-click a folder and choose Always keep on this device if '
         'you want it downloaded in advance for use offline.'},
   {'q': 'One computer has my Desktop in OneDrive and the other does not',
    'a': 'That is the Desktop and Documents backup switched on for one machine only. Under '
         'OneDrive&rsquo;s settings, Sync and backup, Manage backup, set it the same way on '
         'both. Until then, anything saved to the Desktop on the machine without it stays '
         'local and never reaches the other.'},
   {'q': 'How long should syncing take?',
    'a': 'Seconds for a document, a few minutes for something large, and longer on a slow '
         'connection or when OneDrive is re-checking a big library after a reset. If a '
         'small file has not crossed in five minutes, something is wrong rather than slow, '
         'and the one-minute test at the top tells you on which side.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  # 5 Sep 2026: the hand-off is to the SERVICE this visit is about, not a second phone link -
  # every symptom page pointed only at /contact/, and the service pages earned 43 clicks of 888.
  # The number is still in ctaSub and the header.
  'secondaryCta': ['Microsoft 365 support', '/microsoft-365-support/'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a href="/onedrive-problems/">OneDrive '
                    'problems</a> &middot; <a href="/files-missing-from-onedrive/">Files missing '
                    'from OneDrive</a> &middot; <a '
                    'href="/onedrive-moved-my-desktop-and-documents/">OneDrive moved my Desktop '
                    'and Documents</a> &middot; <a '
                    'href="/two-onedrive-accounts-personal-and-work/">Two OneDrive accounts on one '
                    'PC</a> &middot; <a href="/onedrive-couldnt-merge-changes/">OneDrive '
                    'couldn&rsquo;t merge the changes</a></p>'},

 {'slug': 'two-onedrive-accounts-personal-and-work',
  'title': 'Two OneDrive Accounts: Files in the Wrong One | 365 Techies',
  'metaDesc': 'A personal OneDrive and a work OneDrive on one PC, and files keep landing in the wrong one. Tell them apart, move files safely, and set which owns what.',
  'ogTitle': 'Two OneDrive Accounts on One PC and Files in the Wrong One',
  'crumbName': 'Two OneDrive Accounts',
  'eyebrow': '// ONEDRIVE SUPPORT',
  'h1': 'Two OneDrive accounts on one PC, and files keep going to the wrong one',
  'lede': 'There is a personal OneDrive and a work one on the same computer, two cloud icons '
          'by the clock, two folders in File Explorer with nearly the same name, and the '
          'documents keep ending up in whichever one you did not mean. Holiday photos in the '
          'company&rsquo;s cloud; the quarterly figures in your personal one. It is not '
          'carelessness &mdash; Office and Windows make the choice for you, quietly, based on '
          'rules nobody explained. Here is how to tell the two apart, how to move files '
          'between them without losing anything, and how to make each one own what it '
          'should.',
  'ctaHead': 'Two OneDrives still tangled?',
  'ctaSub': 'We set OneDrive up properly for homes and businesses across Bournemouth, Poole '
            'and Dorset &mdash; usually remotely, while you watch. Call 01202 775566.',
  'serviceName': 'OneDrive Account Support',
  'sections': [
   {'eyebrow': '/01 &mdash; TWO CLOUDS',
    'h2': 'Two separate services that happen to share a name',
    'html': '<p>The personal OneDrive comes with a Microsoft account &mdash; the one used for '
            'Windows itself, Xbox, or an outlook.com address. The work one comes with '
            'Microsoft 365 through an employer or your own business. They share a name, an '
            'icon and a look, and nothing else: different servers, different logins, '
            'different owners. In File Explorer the personal one is called simply '
            '<em>OneDrive</em>, or <em>OneDrive - Personal</em>; the work one carries the '
            'organisation&rsquo;s name, <em>OneDrive - Company Name</em>. By the clock, two '
            'cloud icons: hover over each and it says which is which.</p><p>The difference '
            'that matters most is ownership. The work OneDrive belongs to the business. Its '
            'administrators can see what is in it, and when you leave, it is theirs to '
            'close &mdash; the files in it go with the account. The personal one is yours, '
            'with the free allowance Microsoft gives it, which is small. Keeping personal '
            'things out of the work one and work things out of the personal one is not '
            'tidiness; it is knowing who can reach what, and what survives a change of '
            'job.</p>'},
   {'eyebrow': '/02 &mdash; WHY FILES GO ASTRAY',
    'h2': 'The three rules that pick a OneDrive for you',
    'html': '<ul><li><strong>Office saves to whichever account it is signed in to.</strong> '
            'Word and Excel are signed in to one Microsoft account at a time &mdash; the '
            'name at the top-right &mdash; and their default save location follows it. '
            'Signed in as the personal account, every new document offers the personal '
            'OneDrive first. Many people never look at the location line and press '
            'Save.</li><li><strong>Only one OneDrive can own the Desktop.</strong> OneDrive '
            'can take over the Desktop, Documents and Pictures folders so they live in the '
            'cloud. Only one of the two accounts can do that on a given PC. Whichever '
            'claimed them &mdash; often the personal one, because it was set up first when '
            'Windows was installed &mdash; receives everything ever saved to the Desktop or '
            'Documents, work included.</li><li><strong>Apps have their own ideas.</strong> '
            'The phone&rsquo;s camera upload goes to the personal OneDrive. Files shared in '
            'Teams go to the work one. A scanner app, a screenshot tool, a download folder '
            'that was moved years ago &mdash; each has a destination baked in.</li></ul><p>'
            'So a file is rarely put in the wrong OneDrive by a person. It is put there by '
            'a default, and the fix is to change the default rather than to keep moving '
            'files afterwards.</p>'},
   {'eyebrow': '/03 &mdash; MOVING FILES SAFELY',
    'h2': 'Getting things into the right OneDrive without losing them',
    'html': '<p>Moving between the two is done in File Explorer, and it is safe if you do it '
            'the boring way.</p><ul><li><strong>Cut and paste, or drag, between the two '
            'OneDrive folders in File Explorer.</strong> Not from a web browser, and not by '
            'downloading and re-uploading. Explorer knows both folders are OneDrive and '
            'handles the change properly.</li><li><strong>Let both finish.</strong> After a '
            'move, the source OneDrive has to record the removal and the destination has to '
            'upload the arrival. Watch both icons return to a plain cloud before shutting '
            'the PC down. A large move on a slow connection can take an hour; that is '
            'normal.</li><li><strong>Expect sharing to break.</strong> A file that was shared '
            'from the personal OneDrive by link is a different file once it lives in the '
            'work one. Anyone who had the old link needs a new one.</li><li><strong>Expect '
            'version history to reset.</strong> The moved file starts fresh; the old '
            'versions stay with the old location until it is emptied. If a file has a '
            'history you care about, keep it where it is or accept the loss '
            'knowingly.</li><li><strong>Never move by deleting.</strong> Deleting from one '
            'and re-creating in the other loses history, sharing and, if anything goes '
            'wrong halfway, the file.</li></ul>'},
   {'eyebrow': '/04 &mdash; SET WHO OWNS WHAT',
    'h2': 'Making each OneDrive own what it should, so it stops happening',
    'html': '<p>Decide first, then set it. For most people the sensible split is: personal '
            'OneDrive for photos, family and anything you would want to keep after leaving a '
            'job; work OneDrive for work, and nothing else.</p><ul><li><strong>Give the '
            'Desktop and Documents to the right account.</strong> In the OneDrive settings '
            'of the account that should own them, under Sync and backup, <em>Manage '
            'backup</em>, switch them on. If the other account already holds them, switch '
            'them off there first; OneDrive will not let both claim them. For a work PC that '
            'is usually the work account; for a family PC that does some work, it is a '
            'genuine choice.</li><li><strong>Sign Office in to the account you work in.'
            '</strong> The name at the top-right of Word. If you use both, the account '
            'switcher there is the habit to build, and the location line on the Save screen '
            'is the thing to glance at.</li><li><strong>Set where Office saves by default.'
            '</strong> In Word or Excel, under File, Options, Save, you can choose to save '
            'to this PC by default and pick the folder, which takes the guesswork out '
            'entirely.</li><li><strong>On a PC that two people share</strong>, or that mixes '
            'a household and a business, separate Windows user accounts is the clean answer: '
            'each person&rsquo;s OneDrives, each person&rsquo;s defaults, no crossing.</li>'
            '</ul>'},
   {'eyebrow': '/05 &mdash; LEAVING ONE BEHIND',
    'h2': 'Unlinking a OneDrive without losing the files in it',
    'html': '<p>When you leave a job, or simply stop using one of the two, unlink it rather '
            'than leaving a dead account on the PC. But do one thing first, because Files '
            'On-Demand makes this the step where people lose things.</p><p>Many of the '
            'files in a OneDrive folder are placeholders &mdash; the blue-cloud icon &mdash; '
            'that live in the cloud and download only when opened. Unlink the account and '
            'those placeholders vanish with it; only files actually stored on the PC remain. '
            'So before unlinking, right-click the OneDrive folder and choose <em>Always keep '
            'on this device</em>, wait for every icon to turn to a green tick, and only then '
            'unlink, from the account&rsquo;s settings under Account, <em>Unlink this '
            'PC</em>. The folder and its files stay on the disk as ordinary files.</p><p>For '
            'a work account you are leaving, remember the files belong to the employer: take '
            'what is yours to take, and ask if unsure. For a personal account being retired, '
            'check its size against the free allowance first &mdash; if it is over, Microsoft '
            'may have frozen it, and files in a frozen account should be downloaded '
            'before anything else is changed.</p>'}],
  'faqs': [
   {'q': 'Can I merge the two OneDrives into one?',
    'a': 'No &mdash; they are separate services from separate accounts and cannot be joined. '
         'What you can do is move the files between them in File Explorer until each holds '
         'what it should, then set the defaults so new files go to the right place. That is '
         'what this page walks through.'},
   {'q': 'Which OneDrive is backing up my Desktop?',
    'a': 'Only one can. Click each cloud icon by the clock, open its settings, and look '
         'under Sync and backup, Manage backup: the account with the Desktop, Documents and '
         'Pictures switches on is the one that owns them. Everything saved to the Desktop '
         'goes there, whichever account you meant.'},
   {'q': 'My phone photos have gone into the work OneDrive',
    'a': 'Then the OneDrive app on the phone is signed in to the work account, or its '
         'camera upload is set to it. In the app, check which account is active and where '
         'camera upload points, and switch it to the personal one. The photos already '
         'uploaded can be moved in File Explorer on the PC.'},
   {'q': 'If I leave my job, do I lose the files in the work OneDrive?',
    'a': 'The work OneDrive belongs to the employer and is closed when your account is. '
         'Anything personal in it should be moved to your personal OneDrive before you go, '
         'and anything that is the business&rsquo;s should stay. If in doubt about a file, '
         'ask; it is easier before the account closes than after.'},
   {'q': 'Can I have both on one PC at all?',
    'a': 'Yes: one personal account and one or more work accounts can run side by side, '
         'each with its own folder and icon. What you cannot have is two personal accounts '
         'at once, or both accounts owning the Desktop and Documents folders.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  # 5 Sep 2026: the hand-off is to the SERVICE this visit is about, not a second phone link -
  # every symptom page pointed only at /contact/, and the service pages earned 43 clicks of 888.
  # The number is still in ctaSub and the header.
  'secondaryCta': ['Microsoft 365 support', '/microsoft-365-support/'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/onedrive-moved-my-desktop-and-documents/">OneDrive moved my Desktop '
                    'and Documents</a> &middot; <a '
                    'href="/stop-using-onedrive-without-losing-files/">Stop using OneDrive '
                    'without losing files</a> &middot; <a href="/files-missing-from-onedrive/">'
                    'Files missing from OneDrive</a> &middot; <a '
                    'href="/onedrive-not-syncing-between-two-computers/">OneDrive not syncing '
                    'between two computers</a> &middot; <a '
                    'href="/teams-keeps-opening-wrong-account/">Teams keeps opening the wrong '
                    'account</a></p>'},

 {'slug': 'teams-chat-files-disappeared',
  'title': 'Files Shared in Teams Chat Disappeared? | 365 Techies',
  'metaDesc': 'A file someone sent in a Teams chat has vanished. Where chat files really live, why they disappear, how to get one back, and where to store them instead.',
  'ogTitle': 'File Shared in a Teams Chat Disappeared &mdash; Where Did It Go?',
  'crumbName': 'Teams Chat Files Gone',
  'eyebrow': '// MICROSOFT TEAMS SUPPORT',
  'h1': 'A file shared in a Teams chat has disappeared &mdash; where did it go?',
  'lede': 'A colleague sent you the spreadsheet in a Teams chat last month. Today the message '
          'is still there but the file is not: a broken tile, an error saying it could not be '
          'found, or an empty Files tab. Nothing you did removed it, and it feels like Teams '
          'has simply lost it. It has not &mdash; Teams never had it. A file in a chat is a '
          'link to a file that lives somewhere else, and once you know where, the '
          'disappearances make sense and most of them can be reversed.',
  'ctaHead': 'Still can&rsquo;t find the file?',
  'ctaSub': 'We support Microsoft Teams, SharePoint and OneDrive for businesses across '
            'Bournemouth, Poole and Dorset &mdash; usually remotely. Call 01202 775566.',
  'serviceName': 'Microsoft Teams and SharePoint Support',
  'sections': [
   {'eyebrow': '/01 &mdash; WHERE CHAT FILES LIVE',
    'h2': 'Teams shows you a link; the file lives in someone&rsquo;s OneDrive',
    'html': '<p>When a file is dropped into a chat &mdash; a one-to-one chat or a group chat '
            '&mdash; Teams uploads it to the <em>sender&rsquo;s</em> OneDrive, into a folder '
            'named for Teams chat files, and shares it with the people in the chat. The tile '
            'in the conversation is a link to that copy. The file is the sender&rsquo;s. It '
            'lives in their account, under their rules, and it goes wherever their account '
            'goes.</p><p>Files posted in a <em>channel</em> are different. Those go into the '
            'team&rsquo;s SharePoint site, in a folder named after the channel, and they '
            'belong to the team rather than to any one person. That is the whole reason '
            'channels exist for shared work, and it is the point section 05 comes back '
            'to.</p><p>So &ldquo;the file disappeared from Teams&rdquo; really means '
            '&ldquo;the link in Teams no longer reaches the file&rdquo;, and there are only '
            'a handful of ways that happens.</p>'},
   {'eyebrow': '/02 &mdash; THE FIVE REASONS',
    'h2': 'Why a chat file stops being reachable',
    'html': '<ul><li><strong>The sender deleted or moved it.</strong> They tidied their '
            'OneDrive, or moved the file into a different folder, and the link broke. Their '
            'recycle bin usually still has a deleted file for a limited period &mdash; long '
            'enough, in most cases, to get it back.</li><li><strong>The sender has left.'
            '</strong> When someone&rsquo;s account is closed, their OneDrive is kept '
            'reachable to an administrator for a period set by policy, and then removed. '
            'Every file they ever shared in a chat goes with it.</li><li><strong>The sharing '
            'was revoked or the link expired.</strong> The sender, or an administrator, '
            'removed your access, or a sharing policy put a time limit on the link. The file '
            'exists; you can no longer open it.</li><li><strong>A retention or expiry policy '
            'removed the message.</strong> Organisations can set chat messages to expire '
            'after a period. When the message goes, so does the tile.</li><li><strong>You '
            'are looking in the wrong place.</strong> A file shared in a meeting&rsquo;s chat '
            'is in that meeting, not in your one-to-one chat with the same person. And the '
            'newer Teams lays out its Files views differently from the old one, so a file '
            'that has not moved can look as if it has.</li></ul>'},
   {'eyebrow': '/03 &mdash; GETTING IT BACK',
    'h2': 'Recovering a chat file, from easiest to hardest',
    'html': '<ol><li><strong>Search first.</strong> In Teams, search the file name; in '
            'OneDrive and SharePoint, search again. Files that have moved rather than gone '
            'turn up here, and so do copies other people saved.</li><li><strong>Ask the '
            'sender to look in their OneDrive.</strong> The folder for Teams chat files is '
            'the first place, their recycle bin the second. A restore from the bin puts the '
            'file back where it was and usually mends the original link. Ask them to '
            're-share it either way.</li><li><strong>Check the meeting.</strong> Open the '
            'meeting in the calendar and look at its chat and files. Files shared during a '
            'call live there.</li><li><strong>If the sender has left</strong>, an '
            'administrator can reach the departed person&rsquo;s OneDrive during the '
            'retention window and copy the file out. That window is the whole game: the '
            'sooner it is asked for, the more likely it is still there. We have written up '
            'the leaver handover separately, because this is one of the things it should '
            'include.</li><li><strong>If a policy removed it</strong>, it is a question for '
            'whoever administers Microsoft 365 for you. Depending on the settings there may '
            'be a retained copy; there may not.</li></ol><p>What will not work is looking '
            'harder inside Teams. Teams holds the link; the file was never in it.</p>'},
   {'eyebrow': '/04 &mdash; THE NEW TEAMS',
    'h2': 'When nothing has moved but the layout has',
    'html': '<p>Microsoft replaced the Teams application with a rebuilt one, and it arranges '
            'the Files views differently. A file that was easy to find in the old layout '
            '&mdash; under the Files tab at the top of a chat, say &mdash; can appear to have '
            'vanished simply because the tab is elsewhere or shows a different selection. '
            'Before assuming loss, scroll the chat itself to the message the file was '
            'attached to: if the tile opens, nothing is gone.</p><p>The same applies to a '
            'chat that has been hidden or archived rather than deleted, to a group chat that '
            'was renamed, and to a chat with someone whose name has changed. The messages '
            'and their links are intact; the way in has changed. Search by file name rather '
            'than by navigating, and most of these &ldquo;disappearances&rdquo; resolve in a '
            'minute.</p>'},
   {'eyebrow': '/05 &mdash; STOP STORING WORK IN CHAT',
    'h2': 'Chat is a conversation, not a filing cabinet',
    'html': '<p>Everything above follows from one fact: a chat file belongs to the person '
            'who sent it. That is fine for a quick look at a draft. It is the wrong home for '
            'anything the office will need next year, because the office does not own it '
            '&mdash; a colleague does, and colleagues tidy up, change roles and leave.</p><p>'
            'The habit that fixes it is small. Anything that matters gets uploaded to the '
            'team&rsquo;s channel or straight to the SharePoint library, and the chat gets a '
            'link to it. Then the file belongs to the team, it has one home, its version '
            'history is in one place, and nobody&rsquo;s departure takes it with them. For '
            'the office it is a one-line rule: <em>if it matters, it goes in the channel.</em>'
            '</p><p>If your Teams and SharePoint were set up in a hurry and nobody is sure '
            'where anything is supposed to live, that is a common state and a short job to '
            'straighten out. We do it remotely, with whoever runs the office, and we have '
            'written a plain-English guide to how OneDrive, SharePoint and Teams fit '
            'together for exactly this conversation.</p>'}],
  'faqs': [
   {'q': 'Who owns a file shared in a Teams chat?',
    'a': 'The person who sent it. Teams uploads chat files to the sender&rsquo;s own '
         'OneDrive and shares them with the chat; the tile you see is a link to that copy. '
         'Files posted in a channel are different: those go into the team&rsquo;s SharePoint '
         'site and belong to the team.'},
   {'q': 'Can I recover a chat file someone deleted?',
    'a': 'Usually, if you act soon. Ask the sender to look in their OneDrive recycle bin: '
         'a deleted file stays there for a limited period and a restore puts it back and '
         'generally mends the link. If they cannot find it, search OneDrive and SharePoint '
         'by name in case it was moved rather than deleted.'},
   {'q': 'The person who sent it has left the company',
    'a': 'Their OneDrive stays reachable to an administrator for a period after their '
         'account is closed, set by policy, and then it is removed for good. Ask whoever '
         'administers Microsoft 365 for you to copy the file out while that window is open. '
         'The sooner the better; after the window there is nothing to recover.'},
   {'q': 'I can see the message, but the file will not open',
    'a': 'Then the file exists and your access to it has gone &mdash; sharing revoked, a '
         'link that expired, or the file moved to a folder that was not shared. Ask the '
         'sender to share it again. If they have left, the administrator route above '
         'applies.'},
   {'q': 'Should we share files in chat at all?',
    'a': 'For a quick look, yes. For anything the office will need again, no: upload it '
         'to the team&rsquo;s channel or SharePoint library and put a link in the chat. '
         'Then it belongs to the team, has one home and one version history, and survives '
         'anyone leaving.'}],
  'chips': ['Remote in most cases', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  # 5 Sep 2026: the hand-off is to the SERVICE this visit is about, not a second phone link -
  # every symptom page pointed only at /contact/, and the service pages earned 43 clicks of 888.
  # The number is still in ctaSub and the header.
  'secondaryCta': ['Microsoft 365 support', '/microsoft-365-support/'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/onedrive-sharepoint-teams-explained/">OneDrive, SharePoint and Teams '
                    'explained</a> &middot; <a href="/how-to-use-microsoft-teams/">How to use '
                    'Microsoft Teams</a> &middot; <a '
                    'href="/transfer-microsoft-365-when-owner-leaves/">Microsoft 365 when the '
                    'owner leaves</a> &middot; <a href="/what-to-do-when-an-employee-leaves/">'
                    'When an employee leaves</a> &middot; <a '
                    'href="/sharepoint-not-syncing-file-explorer/">SharePoint not syncing to File '
                    'Explorer</a> &middot; <a href="/teams-keeps-opening-wrong-account/">Teams '
                    'keeps opening the wrong account</a></p>'},

 {'slug': 'virgin-media-email-wont-add-to-new-outlook',
  'title': 'Virgin Media Email Won&rsquo;t Add to New Outlook | 365 Techies',
  'metaDesc': 'The new Outlook will not add your Virgin Media, ntlworld or blueyonder email. Why it struggles, the settings Virgin publishes, and the fallback.',
  'ogTitle': 'Virgin Media Email Won&rsquo;t Add to the New Outlook',
  'crumbName': 'Virgin Media &amp; New Outlook',
  'eyebrow': '// EMAIL SUPPORT',
  'h1': 'Virgin Media email won&rsquo;t add to the new Outlook',
  'lede': 'The new Outlook &mdash; the one with the toggle in the corner &mdash; either spins '
          'for a minute and gives up on your Virgin Media address, adds it and then never '
          'fetches a single message, or announces that something went wrong without saying '
          'what. Classic Outlook had the account for years without complaint. The address '
          'still works in a web browser. This page covers virginmedia.com, ntlworld.com and '
          'blueyonder.co.uk addresses alike, because they are all Virgin Media email now: why '
          'the new Outlook struggles with them, the settings Virgin itself publishes, and the '
          'fallback that always works.',
  'ctaHead': 'Still won&rsquo;t add?',
  'ctaSub': 'We set up email in Outlook and on phones for people across Bournemouth, Poole '
            'and Dorset &mdash; usually remotely, while you watch. Call 01202 775566.',
  'serviceName': 'Email Setup and Support',
  'sections': [
   {'eyebrow': '/01 &mdash; WHY THE NEW OUTLOOK STRUGGLES',
    'h2': 'A different program that adds accounts a different way',
    'html': '<p>The new Outlook is not an update to the old one. It is a separate program, '
            'built from the web version, and it adds accounts through Microsoft&rsquo;s own '
            'service rather than directly from your PC. For a Microsoft or Google address '
            'that is seamless. For an address from a broadband provider it has to guess the '
            'settings, and the guess is often wrong: it picks the old POP method instead of '
            'IMAP, tries a port the provider has retired, or leaves the outgoing server '
            'without the sign-in Virgin requires. The result is the spinning circle, or an '
            'account that appears but stays empty.</p><p>Two more things about Virgin '
            'addresses in particular. First, Virgin no longer creates new email addresses '
            '&mdash; its own help pages say so &mdash; and states that it deletes mailboxes '
            '90 days after a customer leaves. An address that stopped working after a '
            'broadband switch may therefore be gone rather than misconfigured, and section '
            '02 is how to find out. Second, ntlworld and blueyonder addresses are older '
            'Virgin brands that now run through Virgin Media&rsquo;s email service; Virgin&rsquo;s '
            'guidance for them is to use an email app signed in with your My Virgin Media '
            'details, so everything on this page applies to them too.</p>'},
   {'eyebrow': '/02 &mdash; PROVE THE ACCOUNT',
    'h2': 'Two minutes that tell you whether the account or Outlook is at fault',
    'html': '<p>Before touching Outlook, sign in to Virgin Media&rsquo;s webmail through My '
            'Virgin Media with the full address and the password.</p><ul><li><strong>Webmail '
            'refuses the password.</strong> The account is the problem; no Outlook setting '
            'will help until it is sorted. Reset the password through My Virgin Media and '
            'try again. If the account has been closed &mdash; the 90-day rule after leaving '
            'Virgin &mdash; webmail will tell you so, and the address is not coming '
            'back.</li><li><strong>Webmail opens and the mail is there.</strong> The account '
            'is fine and Outlook is at fault. That is the usual outcome and the good one; '
            'section 03 fixes it.</li></ul><p>While you are in webmail, check the newest '
            'message&rsquo;s date. If mail is still arriving there, nothing is lost and the '
            'job is purely to get Outlook to see it.</p>'},
   {'eyebrow': '/03 &mdash; ADD IT BY HAND',
    'h2': 'The settings Virgin publishes, entered manually',
    'html': '<p>Remove the failed account from the new Outlook if it half-added, then add it '
            'again, and this time do not let Outlook guess. In its settings, under Accounts, '
            'choose to add an account, enter the address, and when it fails or offers the '
            'choice, take the manual or advanced route and pick <strong>IMAP</strong>, not '
            'POP.</p><p>At the time of writing, Virgin Media&rsquo;s own help pages give '
            'these settings: incoming server <code>imap.virginmedia.com</code> on port 993 '
            'with SSL; outgoing server <code>smtp.virginmedia.com</code> on port 465 with '
            'SSL; the username is your full email address; the password is your Virgin '
            'Media email password; and the outgoing server requires authentication with the '
            'same address and password. Enter each one yourself rather than accepting what '
            'Outlook filled in. Providers change these occasionally, so if it still refuses, '
            'check them against Virgin&rsquo;s own email settings page rather than a forum '
            'post &mdash; and if anything on this page ever disagrees with Virgin&rsquo;s, '
            'Virgin is right.</p><p>Once it connects, the folders fill over a few minutes. '
            'One thing worth knowing: the new Outlook works by copying an IMAP mailbox '
            'through Microsoft&rsquo;s servers, which is what lets it show your mail '
            'anywhere. If you would rather your Virgin mail did not pass through Microsoft '
            'at all, the classic Outlook in section 04 connects directly.</p>'},
   {'eyebrow': '/04 &mdash; THE FALLBACK',
    'h2': 'Classic Outlook still works, and it is one toggle away',
    'html': '<p>If the new Outlook will not take the account however carefully the settings '
            'are entered &mdash; it happens, and it is not you &mdash; switch back. The '
            'toggle at the top-right of the new Outlook returns you to classic Outlook, '
            'which adds provider accounts the way it always has and is still supported. '
            'Add the Virgin account there with the same manual IMAP settings. We have a '
            'separate guide to the switch, including what to do if the toggle has gone '
            'missing.</p><p>Two other things that often unstick a stubborn account. If it '
            'added but shows nothing, remove it and add it again from scratch rather than '
            'editing; the new Outlook hides half of an account&rsquo;s settings and editing '
            'rarely reaches the wrong one. And if the account adds but cannot send, the '
            'outgoing server is the culprit almost every time: port 465, SSL, and sign-in '
            'required, exactly as Virgin states.</p><p>If you would rather not spend an '
            'evening on it, this is a fifteen-minute job for us over a remote session, '
            'while you watch and keep the password to yourself.</p>'},
   {'eyebrow': '/05 &mdash; THE BIGGER QUESTION',
    'h2': 'Is it worth keeping a broadband provider&rsquo;s email?',
    'html': '<p>Once Outlook is working again, spend five minutes on this. Virgin has said '
            'two things plainly on its own pages: it does not create new addresses any more, '
            'and it deletes a mailbox 90 days after the customer leaves. Both are the '
            'provider telling you that the address is tied to the broadband, not to you. '
            'Switch supplier &mdash; for a better deal, or because you move &mdash; and the '
            'address you have given the bank, the GP and every online shop has three months '
            'to live.</p><p>The alternative is an address that is independent of who '
            'supplies your internet &mdash; Gmail or Outlook.com for most people &mdash; with '
            'the Virgin address kept alive and forwarding into it while friends, banks and '
            'shops are moved across at your own pace. Nothing is lost and it does not have '
            'to happen in one go. We have written up exactly how to do that move, and we do '
            'it for people remotely, setting Outlook and the phone up properly at the same '
            'time.</p><p>None of it is urgent today. Get Outlook working first. But if you '
            'are still on Virgin broadband and thinking of leaving, do the move before you '
            'switch, not after.</p>'}],
  'faqs': [
   {'q': 'What are the Virgin Media email settings for Outlook?',
    'a': 'At the time of writing, Virgin&rsquo;s own pages give: IMAP incoming '
         'imap.virginmedia.com on port 993 with SSL; outgoing smtp.virginmedia.com on port '
         '465 with SSL, with authentication using your full address and password; the '
         'username is your full email address. Choose IMAP, not POP. If Outlook still '
         'refuses, check them against Virgin&rsquo;s email settings page, which is the final '
         'word.'},
   {'q': 'Do ntlworld and blueyonder addresses use the same settings?',
    'a': 'They are older Virgin brands whose email now runs through Virgin Media&rsquo;s '
         'service, and Virgin&rsquo;s guidance for them is to use an email app signed in '
         'with your My Virgin Media details. In practice that means the same servers and '
         'the same manual IMAP setup as a virginmedia.com address. If in doubt, Virgin&rsquo;s '
         'own settings page is the reference.'},
   {'q': 'Can I go back to the old Outlook?',
    'a': 'Yes. The toggle at the top-right of the new Outlook switches back to classic '
         'Outlook, which is still supported and adds provider accounts the way it always '
         'did. For a stubborn Virgin account it is often the quickest route, and we have a '
         'separate guide to the switch.'},
   {'q': 'I have left Virgin Media &mdash; is my email gone?',
    'a': 'Virgin states on its own pages that it deletes mailboxes 90 days after a customer '
         'leaves. Inside that window, sign in to webmail through My Virgin Media and move '
         'what you need &mdash; forwarding to a new address, and copying important messages '
         'out. After it, the address and its contents are gone and there is no route back.'},
   {'q': 'Should I move to Gmail or Outlook.com instead?',
    'a': 'If you might ever change broadband supplier, yes, and sooner rather than later: '
         'a provider&rsquo;s address lives only as long as the account. The move can be '
         'gradual &mdash; the new address in place, the Virgin one forwarding into it &mdash; '
         'and we have written up the steps and do it for people remotely.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  # 5 Sep 2026: the hand-off is to the SERVICE this visit is about, not a second phone link -
  # every symptom page pointed only at /contact/, and the service pages earned 43 clicks of 888.
  # The number is still in ctaSub and the header.
  'secondaryCta': ['Email support', '/email-support/'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/move-virgin-media-email-to-gmail/">Moving Virgin Media email to '
                    'Gmail</a> &middot; <a href="/how-to-go-back-to-classic-outlook/">Going back '
                    'to classic Outlook</a> &middot; <a '
                    'href="/outlook-cant-add-account-new-outlook/">New Outlook can&rsquo;t add '
                    'an account</a> &middot; <a '
                    'href="/btinternet-email-wont-add-to-new-outlook/">BT email and the new '
                    'Outlook</a> &middot; <a href="/sky-email-wont-add-to-new-outlook/">Sky '
                    'email and the new Outlook</a> &middot; <a '
                    'href="/plusnet-email-wont-add-to-new-outlook/">Plusnet email and the new '
                    'Outlook</a> &middot; <a href="/talktalk-email-not-working-android/">'
                    'TalkTalk email on Android</a></p>'},
]
