# -*- coding: utf-8 -*-
"""SEO wave 7 (1 Aug 2026): business-event pages + the Sage migration test.

WHAT MAKES THIS BATCH DIFFERENT FROM WAVES 4-6
----------------------------------------------
The earlier waves risked fabricated menu paths. These five sit next to genuinely
LEGAL questions - closing a company, buying a business, a death in the family,
taking on staff - so the hostile reviewer's top-priority category was professional
overreach, not fabrication. It found four breaches across three pages (plus three
fabrications and eight inaccuracies); 18 fixes were applied in total.

⚠️ EDITORIAL GUARDS THAT MUST NOT BE UNDONE
  - NO legal, probate, estate, tax, company-law or employment-law advice anywhere.
    These pages may say "that one is for your solicitor or accountant" and nothing
    further. Several sentences that read like instructions ("how long you are
    required to keep any of it") are deliberately followed by exactly that handoff -
    do not "tidy" them into advice.
  - /wipe-deceased-relatives-laptop-pass-on/ is a BEREAVEMENT page. It must lead
    with getting the data off BEFORE wiping, because wiping is irreversible and
    families lose photographs this way. Section 1 is "Before you wipe it, get the
    contents off" and the first cross-link is the recovery page, labelled "Read
    first". Do not reorder either. Tone stays plain and calm; no prices appear on
    this page at all, by design.
  - /sage-instant-accounts-windows-11/ must never state Sage version numbers,
    product tiers or end-of-support dates. It describes the situation generally on
    purpose.

WHY THE SAGE PAGE EXISTS AT ALL
-------------------------------
It is an explicit test, not a safe bet. The Sage cluster measures 0.00 clicks per
page (three pages, nine impressions in three months, ranking fine at positions
5-11) - a demand problem, not a ranking one. It survived re-qualification only
because it is a forced-migration decision with commercial intent rather than
another symptom page. If it does not earn, do not build more Sage pages.

Rendered by build_extra.build_new_page(). One module per wave.
"""

SEO_WAVE7_PAGES = [{'slug': 'sage-instant-accounts-windows-11',
  'title': 'Sage Instant Accounts on Windows 11 | 365 Techies',
  'metaDesc': 'Sage Instant Accounts often will not install on a new Windows 11 PC. Here are your '
              'realistic options and how to rescue years of historic data safely.',
  'ogTitle': 'Sage Instant Accounts Won&rsquo;t Work on Windows 11? Your Real Options',
  'crumbName': 'Sage Instant on Windows 11',
  'eyebrow': '// BUSINESS IT',
  'h1': 'Sage Instant Accounts won&rsquo;t work on Windows 11',
  'lede': 'You&rsquo;ve bought a new PC, and the accounts software your business has run on for '
          'years refuses to install. This is not a fault you can simply fix &mdash; it&rsquo;s a '
          'decision. Here are the real options, their honest trade-offs, and the part most people '
          'overlook: getting years of historic data off the old machine before it fails.',
  'ctaHead': 'Rescue the data first, decide second',
  'ctaSub': 'We can take a verified copy of everything off the old machine, check it opens, and '
            'talk you through the options before anything is switched off. Free collection across '
            'Bournemouth, Poole and Dorset.',
  'serviceName': 'Business IT Support',
  'sections': [{'eyebrow': '/01 &mdash; WHAT&rsquo;S HAPPENING',
                'h2': 'Why the new PC won&rsquo;t run it',
                'html': '<p>Sage Instant Accounts is long-discontinued software. It was written '
                        'for versions of Windows that came and went years ago, and support for it '
                        'ended a long time back. When a new Windows 11 machine refuses to install '
                        'it, throws an error partway through, or installs but then won&rsquo;t '
                        'open, nothing has gone wrong in the usual sense &mdash; you are simply '
                        'asking a modern operating system to run something built for a much older '
                        'one.</p><p>That matters because it changes what a sensible response looks '
                        'like. With a normal fault there is a fix: a setting, an update, a '
                        'reinstall. Here there is often no fix at all. No update is coming for a '
                        'product this old, and there is no support line for software that is no '
                        'longer sold or supported. Any workaround you find is something you are '
                        'doing <em>to</em> the software, not something anyone supports &mdash; and '
                        'if it stops working next month, there is nobody to escalate it '
                        'to.</p><p>The other thing worth understanding early: the software and the '
                        'data are two separate things. The program is replaceable &mdash; there '
                        'are plenty of current accounting packages. Your <strong>years of ledgers, '
                        'invoices, customers and year-end figures</strong> are not. Almost '
                        'everyone arrives at this problem thinking about the program, and leaves '
                        'realising the data was the thing that actually mattered.</p>'},
               {'eyebrow': '/02 &mdash; DO THIS FIRST',
                'h2': 'Get a verified copy of the data off the old machine',
                'html': '<p>Before you try any workaround, before you buy anything, before you let '
                        'anyone wipe or reuse the old computer &mdash; secure the data. The '
                        'machine running your accounts is, by definition, old. It has done years '
                        'of service, and hardware of that age fails without much warning. If it '
                        'dies while you are still weighing up options, the decision gets made for '
                        'you, badly.</p><p>What that means in practice:</p><ul><li>Take a full '
                        'copy of the whole machine, not just the folder you think the accounts '
                        'live in. Older software scatters things in places you would not '
                        'guess.</li><li>Use the accounting software&rsquo;s own backup routine as '
                        'well, while the old PC still runs. It packages the data the way the '
                        'program expects it.</li><li>Keep at least two copies in two places '
                        '&mdash; an external drive and somewhere off the premises or in reputable '
                        'cloud storage.</li><li><strong>Verify it.</strong> A copy nobody has '
                        'opened is a hope, not a backup. Restore it somewhere and check that it '
                        'genuinely loads and the figures look right.</li></ul><p>That last point '
                        'is the one people skip, and it is the one that bites. We have seen backup '
                        'routines run faithfully for years and turn out to have been copying an '
                        'empty folder the whole time. Nobody looked, because nobody had needed to '
                        'until the day they did.</p>'},
               {'eyebrow': '/03 &mdash; THE OPTIONS',
                'h2': 'Your four realistic routes, honestly compared',
                'html': '<p><strong>Keep the old machine alive, read-only.</strong> Stop using it '
                        'day to day, take it off the internet, and keep it purely to look things '
                        'up. This is cheap and it works &mdash; but only for as long as the '
                        'hardware lasts, and an ageing PC left online is a genuine security risk '
                        'to the rest of your network. Treat it as a temporary reference, never as '
                        'something you depend on.</p><p><strong>Run the old software in some '
                        'compatibility arrangement.</strong> There are ways to coax older programs '
                        'into running on modern Windows, including running an older system inside '
                        'a virtual machine on the new PC. Sometimes it works well. Often it is '
                        'fiddly, and printing, PDFs, emailing invoices and anything touching the '
                        'network are where it tends to fall over. Be clear-eyed about this one: it '
                        'is unsupported, it can break with a Windows update, and you would be '
                        'running your books on something with no safety net underneath '
                        'it.</p><p><strong>Move to current accounting software.</strong> The '
                        'proper answer for anything ongoing. Modern packages are supported and run '
                        'on current Windows, so you are not fighting the machine every time '
                        'something changes. It costs effort to move and there is a learning curve, '
                        'but it ends the problem rather than postponing it &mdash; and whether '
                        'your current setup still meets your filing obligations is a question for '
                        'your accountant.</p><p><strong>Do both.</strong> The route most '
                        'businesses actually take: new software for live work, plus a safe, '
                        'well-labelled archive of the old data for looking back.</p>'},
               {'eyebrow': '/04 &mdash; THE HISTORIC DATA',
                'h2': 'What happens to years of old records either way',
                'html': '<p>This is the question people ask last and should ask first. How much '
                        'history comes across varies a lot from package to package, and it is one '
                        'of the first things to ask before you choose. In many cases you move the '
                        'balances and your customer, supplier and product lists, and the detailed '
                        'year-by-year transaction history stays behind &mdash; but check that with '
                        'the software&rsquo;s supplier or your accountant rather than assuming '
                        'either way.</p><p>That history does not vanish, but it stops being '
                        'something you can simply click into. So plan for it deliberately rather '
                        'than discovering the gap in eighteen months:</p><ul><li>While the old '
                        'software still runs, export or print the reports you would ever want to '
                        'look back at &mdash; trial balances, year-end summaries, ledgers, VAT '
                        'reports &mdash; to PDF and, where you can, to spreadsheet '
                        'format.</li><li>Do it for every year you hold, not just the recent '
                        'ones.</li><li>Store those exports somewhere ordinary and future-proof, '
                        'with the raw backup files kept alongside them.</li><li>Label the folders '
                        'clearly enough that someone else could find the 2016 year-end without '
                        'ringing you.</li></ul><p>A PDF and a spreadsheet will still open in '
                        'twenty years. A backup file from discontinued software may not open at '
                        'all without the discontinued software &mdash; and by then the machine '
                        'that ran it will be long gone.</p><p>How long you are required to keep '
                        'any of it is a question for your accountant, not for us. Ask them before '
                        'you delete or dispose of anything.</p>'},
               {'eyebrow': '/05 &mdash; HOW WE HELP',
                'h2': 'What we do when you call us about this',
                'html': '<p>We handle the IT side, and we are straight about where that line sits. '
                        'We are not accountants and we won&rsquo;t advise you on which package '
                        'suits your books, what you must retain, or anything tax-related. Talk to '
                        'your accountant &mdash; they will very often have a strong preference '
                        'about the software anyway, and asking them first makes everything '
                        'simpler.</p><p>What we do:</p><ul><li>Collect the old machine &mdash; '
                        'free collection across Bournemouth, Poole and Dorset &mdash; and take a '
                        'full, verified copy of it before anything else is '
                        'attempted.</li><li>Check whether the old software can be made to run in a '
                        'contained way on the new PC, and tell you honestly if it can&rsquo;t or '
                        'shouldn&rsquo;t.</li><li>Export your historic reports while the old '
                        'system is still willing to produce them.</li><li>Set the new PC up '
                        'properly, move your files, email and printers across, and get the '
                        'replacement software installed and running.</li><li>Make sure the new '
                        'setup is genuinely backed up, so you are not having this same '
                        'conversation again in ten years&rsquo; time.</li></ul><p>We have been '
                        'doing this in Dorset since 1995, so we have watched a great many accounts '
                        'systems reach the end of the road. There is no fix, no fee &mdash; if we '
                        'can&rsquo;t get somewhere useful, you don&rsquo;t pay for the attempt. '
                        'Ring 01202 775566 and we&rsquo;ll talk it through before you commit to '
                        'anything.</p>'}],
  'faqs': [{'q': 'Can I make Sage Instant Accounts run on Windows 11?',
            'a': '<p>Sometimes, using a compatibility arrangement or by running an older system '
                 'inside a virtual machine on the new PC. But be realistic: the software is '
                 'discontinued and unsupported, so nobody is obliged to make it work and nothing '
                 'is guaranteed to keep working. Printing, emailing invoices and network features '
                 'are the usual sticking points. It is a reasonable way to read old data. It is a '
                 'poor foundation for running your business accounts going forward.</p>'},
           {'q': 'Will I lose all my old accounts data if I move to new software?',
            'a': '<p>Not if you plan for it. The data itself is safe as long as you take a '
                 'verified copy off the old machine first. What typically doesn&rsquo;t carry into '
                 'new software is the full detailed transaction history &mdash; you generally move '
                 'over balances plus your customer and supplier lists. The answer is to export the '
                 'reports you might ever want, year by year, to PDF and spreadsheet while the old '
                 'program still runs. Do that before the old PC is retired.</p>'},
           {'q': 'Can I just keep using the old computer for the accounts?',
            'a': '<p>You can, but treat it as a short-term measure and preferably keep it offline. '
                 'The machine is old and will fail eventually, usually without warning, and an '
                 'ageing PC that is still online is a real security risk to the rest of your '
                 'network. Keeping it as a read-only reference for looking things up is sensible. '
                 'Depending on it for live, day-to-day bookkeeping is a risk that grows every '
                 'month you leave it.</p>'},
           {'q': 'How long do I need to keep my old accounting records?',
            'a': '<p>That is a question for your accountant, not for an IT company &mdash; '
                 'retention requirements depend on your circumstances and we won&rsquo;t guess at '
                 'them. What we would say from the IT side is simple: ask them before you delete '
                 'or dispose of anything, and until you have their answer, keep the lot. Storage '
                 'is cheap and irreversible deletion is not. Get a verified copy made first, then '
                 'have the conversation.</p>'},
           {'q': 'What should I do first if the old PC is still working?',
            'a': '<p>Back it up properly, today, before you experiment with anything at all. Take '
                 'a full copy of the whole machine, run the accounting software&rsquo;s own backup '
                 'routine as well, and keep copies in two separate places. Then verify the backup '
                 'by actually opening it, because a backup nobody has tested is only a hope. Once '
                 'the data is genuinely safe, you can take your time deciding which route suits '
                 'you. Not before.</p>'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get in touch', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a href="/data-recovery/">Data '
                    'recovery</a> &middot; <a '
                    'href="/how-to-prepare-business-for-windows-11/">Preparing a business for '
                    'Windows 11</a> &middot; <a href="/windows-11-support/">Windows 11 support</a> '
                    '&middot; <a href="/business-it-consultancy/">Business IT consultancy</a></p>'},
 {'slug': 'business-email-when-closing-your-company',
  'title': 'Business Email When Closing Your Company | 365 Techies',
  'metaDesc': 'Closing your company? Here is what happens to your business email and domain, and '
              'the order to sort it in so you keep years of correspondence.',
  'ogTitle': 'What Happens to Business Email When You Close Your Company',
  'crumbName': 'Email When Closing a Company',
  'eyebrow': '// BUSINESS IT WIND-DOWN',
  'h1': 'What Happens to Your Business Email When You <em class="grad grad--cyan">Close Your '
        'Company</em>',
  'lede': 'Winding a business down is a long list of jobs, and the email tends to sit near the '
          'bottom of it &mdash; right up until the day it stops and takes years of correspondence '
          'with it. Here is the sensible order: find the domain, find out who really controls it, '
          'take a complete copy of the mail, then decide what to keep. Family-run in Bournemouth '
          'since 1995, rated 4.9 on Google.',
  'ctaHead': 'Closing your business and worried about the email?',
  'ctaSub': 'We can take a full, checked copy of every mailbox, work out who actually controls '
            'your domain and set up forwarding that carries on working &mdash; calmly, in the '
            'right order. Call the Bournemouth team on 01202 775566.',
  'serviceName': 'Business Email, Domain & Data Handover',
  'sections': [{'eyebrow': '/01 &mdash; THE DOMAIN',
                'h2': 'Your domain is the thing everything else hangs off',
                'html': '<p>When a business closes, the thing that decides whether email keeps '
                        'arriving is not the company at all &mdash; it is the <strong>domain '
                        'name</strong>. Your domain is a separate registration held with a '
                        'registrar, on its own renewal cycle, and it carries on renewing (or '
                        'quietly lapses) independently of anything happening to the business. '
                        'Nothing about winding down automatically cancels it, and nothing '
                        'automatically preserves it either.</p><p>That cuts both ways. A domain '
                        'that renews against a company card will stop renewing when that account '
                        'is closed, and one that renews against someone&rsquo;s personal card can '
                        'keep quietly renewing for years after everything else has gone &mdash; so '
                        'the question is not what will happen by accident, but which of the two '
                        'you have and which you actually want.</p><p>So the first job is to locate '
                        'the domain properly: which registrar holds it, when it next comes up for '
                        'renewal, and which card or direct debit pays for it. A public WHOIS '
                        'lookup will normally tell you the registrar and the renewal date even if '
                        'the login is long lost. Whether you keep the domain or let it go is a '
                        'decision for later &mdash; for now, the point is simply that you know '
                        'where it lives and what is keeping it alive.</p>'},
               {'eyebrow': '/02 &mdash; WHO HOLDS THE KEYS',
                'h2': 'The part that catches people out: who actually controls the accounts',
                'html': '<p>The single biggest delay in a tidy wind-down is discovering that the '
                        'person who controls the domain registrar account and the Microsoft 365 '
                        'tenant is not you. Very often it is a former IT provider, the web '
                        'designer who built the site years ago, or a member of staff who set the '
                        'whole thing up on a login of their own. Registered in their name, billed '
                        'to their card, with the notification address pointing somewhere you '
                        'cannot see.</p><p>That is not a disaster, but it takes the longest to '
                        'unpick, so start it on day one and get on with everything else alongside '
                        'it. What you are trying to establish is:</p><ul><li>Who is listed as the '
                        'registered holder of the domain, and which registrar it sits '
                        'with.</li><li>Who holds a <strong>Global Administrator</strong> account '
                        'on your Microsoft 365 tenant &mdash; or the control panel login, if your '
                        'mail is with a web host.</li><li>Which card or direct debit each of those '
                        'renews against.</li></ul><p>Ask in writing, politely, and ask early. Most '
                        'providers hand things over without fuss &mdash; but do it while relations '
                        'are good and while you still have a working mailbox on the domain, '
                        'because the verification messages that confirm a handover are usually '
                        'sent to an address on the very domain you are trying to take control '
                        'of.</p>'},
               {'eyebrow': '/03 &mdash; GET THE MAIL OUT',
                'h2': 'Take a complete copy of the mail before anything is switched off',
                'html': '<p>Almost everything else on this page can be undone. Deleted mailbox '
                        'data usually cannot. So before a single licence is cancelled or a mailbox '
                        'removed, take a full export &mdash; and then open it and check it '
                        'genuinely works.</p><p>Make sure the copy covers:</p><ul><li>Every '
                        'mailbox, not just yours &mdash; including staff who have already '
                        'left.</li><li>The shared addresses like info@, accounts@ and sales@, '
                        'which often have no licence of their own and are the first thing '
                        'forgotten.</li><li>Calendars and contacts as well as the messages '
                        'themselves.</li><li>Anything else living in the same accounts &mdash; '
                        'files in OneDrive or SharePoint, and Teams conversations, are separate '
                        'exports again.</li></ul><p>How you export depends on the setup. A desktop '
                        'copy of Outlook can usually save a mailbox out to a single data file, and '
                        'a mailbox hosted with a web provider can often be copied by connecting a '
                        'desktop mail program and dragging everything into local folders. '
                        'Depending on your subscription and permissions, some tenants can also '
                        'export mailboxes centrally using Microsoft&rsquo;s admin and compliance '
                        'tools &mdash; that is not available on every plan, so confirm it works on '
                        'yours before you rely on it rather than exporting from the desktop. Not '
                        'every version of Outlook offers the same options either, so check what '
                        'yours can do first. Keep two copies, in two different places.</p><p>How '
                        'long you need to keep any of it is a question for your accountant or '
                        'solicitor rather than for us. Our job is making sure you physically have '
                        'it.</p>'},
               {'eyebrow': '/04 &mdash; WHEN THE MAILBOXES STOP',
                'h2': 'What actually happens when nobody is paying for the mailboxes',
                'html': '<p>Mailboxes are separate from the domain, and they usually stop for one '
                        'of two reasons: somebody stops paying, or whoever controls the tenant '
                        'switches them off. With Microsoft 365, cancelling the subscription or '
                        'letting it lapse takes the mailboxes out of service &mdash; sign-in stops '
                        'working, Outlook stops syncing, and mail sent to those addresses starts '
                        'bouncing straight back to whoever sent it. Removing a single user&rsquo;s '
                        'licence has much the same effect for that person, even while the rest of '
                        'the subscription carries on.</p><p>There is normally a limited window '
                        'after a subscription ends before the data is removed for good, but how '
                        'long that window is varies, and it is not something to build a plan '
                        'around. Work on the basis that once you cancel, the contents are going '
                        '&mdash; which is exactly why the export in the previous step comes '
                        'first.</p><p>The real trap is what else those addresses are quietly '
                        'attached to. A work email address is very often the recovery address for '
                        'the bank, the accounting software, the phone and broadband accounts, the '
                        'website hosting, social media pages and the domain registrar itself. If '
                        'the mailbox dies while those still point at it, the password reset link '
                        'goes to a mailbox that no longer exists. Work through your logins and '
                        'move each one to an address that will still be there afterwards &mdash; '
                        'ideally before you cancel anything at all.</p>'},
               {'eyebrow': '/05 &mdash; KEEP IT OR LET IT GO',
                'h2': 'Keeping the domain alive cheaply, or letting it go entirely',
                'html': '<p>Once the mail is safely out, there are two honest choices, and both '
                        'are fine.</p><p><strong>Keep the domain.</strong> It stays registered, '
                        'and instead of a full set of mailboxes you point it at simple forwarding '
                        'or at one modest mailbox. Anything still sent to the old addresses then '
                        'lands somewhere a human will see it, rather than bouncing. That is one '
                        'annual renewal instead of a licence per person, and it is worth it if you '
                        'may trade again, if the name is tied to you personally, or if you would '
                        'rather nobody else picked it up. If the domain is registered to the '
                        'company rather than to you, whether it can be moved into your own name is '
                        'one for your solicitor or accountant &mdash; we only handle the technical '
                        'side once that is settled. A catch-all that accepts anything at the '
                        'domain will collect a lot of spam, so a handful of named forwards is '
                        'tidier.</p><p><strong>Let it go.</strong> Perfectly reasonable when the '
                        'trading name is finished &mdash; just be clear about what it means. Once '
                        'a registration lapses and is released, anybody can register that domain, '
                        'and whoever does can receive mail sent to those addresses. So before you '
                        'let that happen, make certain every login and subscription has been moved '
                        'off it, tell your key contacts the new address, and leave forwarding or '
                        'an auto-reply running for a good while first.</p><p>Whichever you choose, '
                        'make it a decision rather than an accident: put a personal email address '
                        'on the registrar account, and note the renewal date somewhere that is not '
                        'a work calendar about to be deleted.</p>'}],
  'faqs': [{'q': 'What happens to my business email when I close my company?',
            'a': 'Nothing happens automatically &mdash; and that is the problem. The mailboxes '
                 'keep running until somebody stops paying for them, at which point sign-in fails '
                 'and incoming mail bounces. The domain keeps renewing on its own separate cycle '
                 'until a payment fails or you cancel it. The outcome is therefore entirely down '
                 'to what you do and in what order: get a complete copy of the mail out first, '
                 'then deal with the mailboxes, then decide about the domain.'},
           {'q': 'Can I keep my business email address after the company has closed?',
            'a': 'Usually yes, as long as you keep the domain registered. You do not have to keep '
                 'paying for full mailboxes to do it &mdash; the domain can be pointed at simple '
                 'forwarding, or at a single modest mailbox, so anything sent to the old addresses '
                 'still reaches you somewhere you will see it. Many people keep the domain for a '
                 'year or two purely so nothing gets lost, then let it go once the messages have '
                 'dried up.'},
           {'q': 'How do I download all my emails before the Microsoft 365 subscription ends?',
            'a': 'Do it before you cancel anything, not after. A desktop copy of Outlook can '
                 'normally save a mailbox out to a single data file you keep locally. Depending on '
                 'your subscription and permissions, some tenants can also export mailboxes '
                 'centrally using Microsoft&rsquo;s admin and compliance tools, but that is not '
                 'available on every plan, so confirm it works on yours before you rely on it. '
                 'Cover every mailbox, including shared ones like info@ and accounts@, take '
                 'calendars and contacts too, and check the export is complete before switching '
                 'anything off.'},
           {'q': 'What happens to my domain name when the company is wound up?',
            'a': 'From an IT point of view, nothing changes by itself: the domain sits with a '
                 'registrar and simply keeps renewing until a payment fails or somebody cancels '
                 'it. What matters practically is who is named on the registration and whose card '
                 'pays for it &mdash; if that is a company card about to be closed, the domain '
                 'will lapse with no warning. Whether the domain counts as an asset of the '
                 'business is a question for your solicitor or accountant.'},
           {'q': 'My old IT company controls our domain and email &mdash; how do I get it back?',
            'a': 'Start this one first, because it takes the longest. Ask in writing for the '
                 'registrar details, confirmation of who is listed as the domain holder, and '
                 'administrator access to the mail platform. Do it while you still have a working '
                 'mailbox on the domain, since the verification messages tend to be sent there. If '
                 'you are getting nowhere, we deal with this sort of handover regularly and can '
                 'talk to them on your behalf &mdash; call <strong>01202 775566</strong>.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get in touch', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/take-over-email-domain-after-buying-business/">Taking over a domain '
                    'after buying a business</a> &middot; <a '
                    'href="/business-email-down-domain-expired/">Business email down after a '
                    'domain expired</a> &middot; <a href="/email-migration/">Email migration</a> '
                    '&middot; <a href="/former-it-provider-controls-microsoft-365/">When a former '
                    'IT provider holds the keys</a></p>'},
 {'slug': 'take-over-email-domain-after-buying-business',
  'title': 'Taking Over Email After Buying a Business | 365 Techies',
  'metaDesc': 'Bought a small business and need control of its domain and email? Here is what to '
              'ask the seller for and what to do when nobody has the logins.',
  'ogTitle': 'Taking Over the Email and Domain After Buying a Business',
  'crumbName': 'Email After Acquisition',
  'eyebrow': '// BUSINESS IT',
  'h1': 'Taking over the email and domain after buying a business',
  'lede': 'You have bought the business. Now you need the email working, and you have discovered '
          'that nobody can quite say who holds the domain. It is one of the most common loose ends '
          'in a small business sale, and it is very rarely a technical problem &mdash; it is a '
          'question of who has which login, and whether they are still willing to answer the '
          'phone. Here is how to work out what you actually acquired, what to ask the seller for '
          'before you complete, and what your options are when the passwords have genuinely gone '
          'missing.',
  'ctaHead': 'Bought a business and locked out of its email?',
  'ctaSub': 'We untangle domains and mailboxes for new owners across Bournemouth, Poole and Dorset '
            '&mdash; working out who holds what, and getting control back where it belongs. Call '
            '01202 775566 for a straight answer.',
  'serviceName': 'Business Email and Domain Handover',
  'sections': [{'eyebrow': '/01 &mdash; WHAT YOU BOUGHT',
                'h2': 'Work out what you have actually acquired',
                'html': '<p>Before you chase anyone for a password, be clear about what changed '
                        'hands. Three separate things get bundled together in most people&rsquo;s '
                        'heads, and a sale can include any combination of '
                        'them.</p><ul><li><strong>The domain name itself</strong> &mdash; the part '
                        'after the @ sign, registered through a provider and renewed on a cycle. '
                        'This is the asset that matters most.</li><li><strong>The platform the '
                        'mailboxes run on</strong> &mdash; a Microsoft or Google subscription, or '
                        'mailboxes bundled in with the web hosting. The messages physically live '
                        'here.</li><li><strong>The individual addresses</strong> &mdash; info@, '
                        'accounts@, the previous owner&rsquo;s own address, plus any forwarders '
                        'and aliases that nobody has ever written down.</li></ul><p>It is entirely '
                        'possible to buy a trading name, a customer list and a van, and not to '
                        'have bought the domain at all. It is equally possible for the domain to '
                        'be included on paper while the account it sits inside belongs to somebody '
                        'who was never part of the sale. What the agreement says you acquired is a '
                        'question for your solicitor; what you can actually sign into is the '
                        'question we can help with, and the two are not always the same '
                        'thing.</p><p>Start by writing down every email address you have seen the '
                        'business use &mdash; on invoices, on the website, on signage, in the '
                        'Google listing, on the quotes in the filing cabinet. That list is the '
                        'true scope of the job.</p>'},
               {'eyebrow': '/02 &mdash; TWO SEPARATE KEYS',
                'h2': 'The domain and the mailboxes are two different locks',
                'html': '<p>This is where most handovers come unstuck. There are two locks, they '
                        'are usually held in two different places, and being handed the key to one '
                        'tells you nothing at all about the other.</p><p><strong>Control of the '
                        'domain</strong> lives in an account at the provider it is registered '
                        'with. Whoever can sign in there decides where the domain points &mdash; '
                        'which mail platform receives the messages, where the website loads from, '
                        'and whether the domain gets renewed at all. This is the master '
                        'control.</p><p><strong>Control of the mailboxes</strong> lives on '
                        'whatever platform hosts them, under an administrator account. Whoever '
                        'holds that can create and remove mailboxes, reset passwords and read what '
                        'is stored in them.</p><p>You can very easily end up holding one without '
                        'the other. A seller who hands over the mailbox administrator login has '
                        'given you the messages, but if a former web designer still holds the '
                        'domain account, mail for the business can be redirected somewhere else at '
                        'any time without your say-so, and nothing on your side will stop it. The '
                        'reverse is far more comfortable: with the domain firmly under your '
                        'control you can always rebuild mailboxes, even if the old ones are lost '
                        'entirely.</p><p>If you can only secure one of the two before completion, '
                        'secure the domain.</p>'},
               {'eyebrow': '/03 &mdash; THE HANDOVER',
                'h2': 'How a handover normally works, in outline',
                'html': '<p>Providers differ in the detail, but in outline a handover has two '
                        'halves.</p><p><strong>The domain.</strong> Either the existing account '
                        'changes hands &mdash; the seller passes over the sign-in and you update '
                        'the contact details, the billing card and the recovery options to yours '
                        '&mdash; or the domain is moved out into an account of your own, which '
                        'normally means the current provider releasing it and the receiving '
                        'provider pulling it across. Separately from where the domain is managed, '
                        'there is a record of who the registered holder is, and bringing that into '
                        'your name is its own step. Do not assume that moving a domain between '
                        'providers has changed the name on it.</p><p><strong>The '
                        'mailboxes.</strong> Either you take over the existing subscription and '
                        'its administrator account, or you set up your own and copy the contents '
                        'across before switching the mail routing over to it.</p><p>Order matters '
                        'far more than speed. The mail routing is the switch that decides where '
                        'new messages land, so it goes last, once the destination is genuinely '
                        'ready and tested. Old mailboxes are best left running alongside for a '
                        'while rather than closed on the day &mdash; suppliers, banks and '
                        'customers carry on writing to whatever address they have on file for '
                        'months afterwards, and a bounced message from a business that has just '
                        'changed hands looks worse than it deserves to.</p>'},
               {'eyebrow': '/04 &mdash; BEFORE COMPLETION',
                'h2': 'What to ask the seller for before you complete',
                'html': '<p>Everything on this page becomes ten times harder once the money has '
                        'changed hands. While the seller still wants the sale to go through, ask '
                        'for the following in writing.</p><ul><li>Which provider the domain is '
                        'registered with, the email address that account signs in with, and when '
                        'the renewal falls due.</li><li>Who the registered holder of the domain '
                        'currently is &mdash; the business, the previous owner personally, or a '
                        'third party.</li><li>Which card or account pays the renewal, and whether '
                        'it belongs to somebody who is leaving.</li><li>Which platform the '
                        'mailboxes sit on, and who the administrator is.</li><li>A full list of '
                        'mailboxes, shared mailboxes, aliases, forwarders and distribution lists, '
                        'including any that quietly point at a personal address.</li><li>Where the '
                        'website is hosted, and where the DNS records are actually managed &mdash; '
                        'frequently a different place again.</li><li>Whether any two-step '
                        'verification is tied to a mobile number or authenticator app belonging to '
                        'somebody leaving, and the name of the web designer or IT provider who set '
                        'it all up.</li></ul><p>Then ask for one short screen-share in which the '
                        'seller signs into each account in front of you. Nothing exposes a missing '
                        'login faster. If a password cannot be produced on that call, it does not '
                        'exist &mdash; and you have found out while you still have some '
                        'leverage.</p>'},
               {'eyebrow': '/05 &mdash; NO LOGINS',
                'h2': 'When the seller genuinely cannot get in',
                'html': '<p>This is the version of the problem we see most often when a new owner '
                        'calls us. The domain was registered years ago by a web designer using '
                        'their own account, or an IT provider set the mail platform up under their '
                        'own provider account, or the only sign-in is a personal address the '
                        'previous owner stopped using two phones ago. It is common, and it is '
                        'often recoverable &mdash; and sometimes it is not, which is worth knowing '
                        'early either way. Work through it in this order.</p><ul><li><strong>Ask, '
                        'politely and early.</strong> Plenty of third parties hand things over '
                        'without any fuss when a new owner approaches them properly, so start '
                        'there rather than assuming the worst.</li><li><strong>Gather the evidence '
                        'first.</strong> Some providers will look at a request like this and some '
                        'will not, and it usually comes down to what you can show about the '
                        'business&rsquo;s connection to the account. Pull the paperwork together '
                        'before you start &mdash; old renewal invoices, the card that paid, '
                        'correspondence, company records &mdash; because you will be asked for it '
                        'and it is far harder to find later.</li><li><strong>Find the renewal '
                        'date.</strong> A domain nobody is paying for eventually lapses and '
                        'becomes available to anyone. Knowing the date turns a vague worry into a '
                        'deadline you can plan around.</li><li><strong>Protect the day to day '
                        'meanwhile.</strong> Even without full account access there are usually '
                        'steps that keep mail reaching the business while the rest is '
                        'untangled.</li></ul><p>If it turns into a dispute about ownership rather '
                        'than a technical problem, that is your solicitor&rsquo;s ground, not '
                        'ours. And in a small number of cases the pragmatic answer is a fresh '
                        'domain and a planned change of address for customers &mdash; '
                        'nobody&rsquo;s first choice, but better than an indefinite standstill. We '
                        'will tell you plainly which of those you are looking at.</p>'}],
  'faqs': [{'q': 'How do I find out who a business domain is registered with?',
            'a': 'A public lookup will usually show which provider the domain is registered '
                 'through and when it is due for renewal, which is normally enough to know who you '
                 'need to approach. The name behind it is often withheld for privacy, so the '
                 'lookup tells you where the account lives rather than whose it is. Old renewal '
                 'invoices in the business paperwork are frequently the quickest route to the '
                 'account itself. We can run those checks for you and explain what they show.'},
           {'q': 'The seller says the web designer holds the domain. What happens now?',
            'a': 'In most cases a polite approach from the new owner settles it, and the designer '
                 'either passes the account across or releases the domain. Where that does not '
                 'happen, providers may consider a request like this, and it tends to rest on '
                 'evidence linking the business to the account, so gather renewal invoices, '
                 'payment records and correspondence before you start. If it becomes a dispute '
                 'about who owns what, that is a matter for your solicitor rather than for us. '
                 'Meanwhile, find the renewal date, because that is the clock you are working to.'},
           {'q': 'Can we keep the same email addresses after buying the business?',
            'a': 'Almost always, yes, provided you end up in control of the domain. The addresses '
                 'themselves are only names on that domain, so once the domain sits in your '
                 'account you can recreate any address you need, even if the original mailboxes '
                 'have been lost. Keeping them matters more than people expect: those addresses '
                 'are printed on invoices, on vehicles, in business listings, and in the address '
                 'book of every customer and supplier the business has ever dealt with.'},
           {'q': 'Should I take over the existing email account or set up a new one?',
            'a': 'Both approaches work. Taking over the existing subscription is quicker and '
                 'nothing has to be copied, but you inherit whatever state it was left in, '
                 'including dormant staff accounts and billing tied to the seller. Setting up your '
                 'own gives you a clean slate with billing and administration in your name, at the '
                 'cost of copying the mail across first. Where the platform was originally set up '
                 'under an outside provider account, a fresh setup is often simpler than '
                 'untangling it.'},
           {'q': 'What happens to emails sent to the previous owner after the sale?',
            'a': 'Decide this deliberately rather than letting it happen by default. Personal mail '
                 'will keep arriving at a work address for months, and what should be done with '
                 'the contents of a departing owner mailbox is a question for your solicitor, not '
                 'a technical one. On the practical side, the options run from keeping the mailbox '
                 'live and monitored, to redirecting it to someone in the business, to an '
                 'automatic reply giving the new contact. Agree the approach with the seller in '
                 'advance.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get in touch', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/business-email-when-closing-your-company/">Business email when a '
                    'company closes</a> &middot; <a '
                    'href="/former-it-provider-controls-microsoft-365/">When a former IT provider '
                    'holds the keys</a> &middot; <a '
                    'href="/locked-out-microsoft-365-admin-account/">Locked out of the Microsoft '
                    '365 admin account</a> &middot; <a href="/email-migration/">Email '
                    'migration</a></p>'},
 {'slug': 'new-employee-laptop-setup',
  'title': 'New Employee Laptop Setup for Small Business | 365 Techies',
  'metaDesc': 'A practical joiner checklist for small businesses in Dorset: the laptop, the '
              'accounts, day-one access and security, set up right the first time.',
  'ogTitle': 'New Employee Laptop Setup: The Joiner Checklist',
  'crumbName': 'New Employee Laptop Setup',
  'eyebrow': '// BUSINESS IT',
  'h1': 'New Employee Laptop Setup: The Joiner Checklist',
  'lede': 'Taking someone on is the moment your business IT either gets set up properly or quietly '
          'stores up a problem for later. Done well, a new starter&rsquo;s laptop, accounts and '
          'access are straightforward; done ad hoc, they take years to unpick. This is the joiner '
          'checklist &mdash; the mirror image of what to do when an employee leaves &mdash; in the '
          'order it actually happens, written for small businesses in Bournemouth, Poole and '
          'across Dorset.',
  'ctaHead': 'Someone starting soon?',
  'ctaSub': 'Tell us the start date and what the role needs, and we&rsquo;ll set up the laptop, '
            'the accounts and the access properly &mdash; and leave you a record you can use on '
            'the day they eventually leave. Family-run in Bournemouth since 1995, with free '
            'collection across Dorset.',
  'serviceName': 'New Starter IT Setup for Small Businesses',
  'sections': [{'eyebrow': '/01 &mdash; THE DEVICE',
                'h2': 'Start With a Laptop That Belongs to the Business',
                'html': '<p>The first decision is the one people skip: whose laptop is it. A '
                        'machine the business bought, on the business&rsquo;s own account, is the '
                        'only version of this that ends well. Everything else &mdash; a personal '
                        'laptop the new starter already owns, a spare from a director&rsquo;s '
                        'house, the machine the last person handed back &mdash; creates a problem '
                        'that only shows up later, usually on the day you need the device '
                        'back.</p><p>A personally owned laptop sits outside whatever you use to '
                        'manage company machines. You are relying on the owner to keep it patched '
                        'and protected, and anything saved locally on it is a copy you cannot see '
                        'or account for. If you do want to allow personal devices, what you can '
                        'ask of them &mdash; and what you would need agreed in writing &mdash; is '
                        'a question for your HR adviser or solicitor. Our part is making sure the '
                        'work itself lives in your business accounts rather than on their hard '
                        'drive.</p><p>A hand-me-down is a different trap: it is usually still '
                        'signed in to somebody else&rsquo;s accounts, still holding their files '
                        'and saved browser passwords, and often old enough that the battery and '
                        'the warranty are both spent. If you are reusing a device, check first '
                        'that anything the business still needs from the previous user has been '
                        'recovered &mdash; local files, anything only stored in a locally cached '
                        'mailbox, licence or software details &mdash; because a reset cannot be '
                        'undone. Once you are sure, reset it back to a clean state and set it up '
                        'under the new person&rsquo;s own business account. It is also worth '
                        'knowing that consumer editions of Windows are not really built to be '
                        'joined to a business account or managed centrally, so an off-the-shelf '
                        'laptop bought in a hurry can be awkward to bring properly into a business '
                        'setup.</p>'},
               {'eyebrow': '/02 &mdash; ACCOUNTS &amp; LICENCES',
                'h2': 'Set the Accounts Up in Your Own Tenant, Not Someone&rsquo;s Personal Login',
                'html': '<p>This is the mistake that costs small businesses the most, and it '
                        'almost never looks like a mistake at the time. Someone needs an email '
                        'address in a hurry, so it gets created under whichever login is nearest '
                        '&mdash; a director&rsquo;s personal Microsoft account, an old '
                        'subscription belonging to whoever used to look after the computers, or '
                        'the new starter setting themselves up with an address they already '
                        'own.</p><p>What that quietly does is put your business email, files and '
                        'licences inside an account your business does not control. When the '
                        'person holding it leaves, or simply forgets the password, the mailbox and '
                        'the subscription go with them. Getting control of a tenant nobody can '
                        'sign in to is possible, but it is slow and evidence-heavy at exactly the '
                        'moment you can least afford it.</p><p>Do it the boring way instead. Your '
                        'business has its own Microsoft 365 tenant on your own domain name, with '
                        'the administrator account held by the business rather than by one '
                        'individual. Each employee gets their own named account and their own '
                        'licence, assigned to them and paid for on a business payment method. The '
                        'same rule applies to everything else they sign up to for work &mdash; '
                        'accounting software, cloud storage, supplier portals, the odd online '
                        'tool. If it is registered to somebody&rsquo;s personal email address, it '
                        'is not really yours.</p>'},
               {'eyebrow': '/03 &mdash; DAY-ONE ACCESS',
                'h2': 'What They Should &mdash; and Should Not &mdash; Have on Day One',
                'html': '<p>The instinct on someone&rsquo;s first morning is to give them '
                        'everything so they are not sitting there blocked. It feels helpful, and '
                        'it is the reason so many small businesses end up with every member of '
                        'staff able to open the payroll folder.</p><p>Day one should cover what '
                        'the job genuinely needs: their own mailbox and calendar, the shared '
                        'folders or sites for their team, the specific apps their role uses, the '
                        'printer and the WiFi. Set those up before they arrive, so their first '
                        'hour is work rather than waiting.</p><p>Hold back the things that are '
                        'hard to unwind. A new starter does not need administrator rights on their '
                        'own laptop, and they certainly do not need administrator rights over your '
                        'Microsoft 365. Keep finance, payroll and HR folders, banking and card '
                        'details, the domain and website logins and any shared password vault out '
                        'of the initial setup. None of that is about trust &mdash; it is that '
                        'access is easy to grant and awkward to take back, and every extra '
                        'permission is one more thing to remember when they eventually move '
                        'on.</p><p>Resist the shared login too. If your team has one account that '
                        'everybody uses for a system, adding one more person to it makes the '
                        'eventual clean-up harder. Separate accounts per person are the whole '
                        'reason a leaver process can work at all.</p>'},
               {'eyebrow': '/04 &mdash; SECURITY BASICS',
                'h2': 'Do the Security Once, Rather Than Retrofitting It',
                'html': '<p>Security done at setup is quick and almost invisible. The same '
                        'security retrofitted six months later means interrupting somebody '
                        'mid-job, resetting things they have come to rely on and explaining why '
                        'the rules have changed. Do it once, before the laptop reaches '
                        'them.</p><p>The basics worth building in from the '
                        'start:</p><ul><li><strong>Multi-factor authentication</strong> switched '
                        'on for their business account before the first sign-in, so it is simply '
                        'how the job works rather than a change imposed later.</li><li><strong>A '
                        'password manager</strong> from day one, so nobody ever has to tell them '
                        'the password everybody shares.</li><li><strong>Disk encryption</strong> '
                        'enabled, with the recovery key stored by the business and not on a note '
                        'in the laptop bag.</li><li><strong>Automatic updates and reputable '
                        'security software</strong> left switched on, and reporting somewhere a '
                        'person actually looks.</li><li><strong>Work saved into your business '
                        'cloud storage</strong> rather than a local desktop folder, so nothing '
                        'important lives only on that one machine.</li><li><strong>A screen '
                        'lock</strong>, plus five minutes on phishing, fake invoices and the boss '
                        'apparently messaging from an unfamiliar number.</li></ul><p>None of this '
                        'is exotic, and none of it needs a big budget. It is simply far easier to '
                        'do on a machine nobody is using yet.</p>'},
               {'eyebrow': '/05 &mdash; THE RECORD',
                'h2': 'Write Down What You Set Up &mdash; the Leaver Process Depends On It',
                'html': '<p>The last step takes minutes and is the one that pays for the whole '
                        'exercise: write down what you set up. A joiner record does not need to be '
                        'sophisticated &mdash; one document or spreadsheet, kept somewhere the '
                        'business controls, listing:</p><ul><li>the device, with make, model and '
                        'serial number, and who owns it;</li><li>the accounts created and the '
                        'email address in use;</li><li>the licences assigned to that '
                        'person;</li><li>the shared folders, sites and systems they were given '
                        'access to;</li><li>the third-party apps and supplier portals they hold a '
                        'login for;</li><li>the phone, SIM, dongles, keys or fobs handed '
                        'over;</li><li>where the disk encryption recovery key is '
                        'stored.</li></ul><p>This is the mirror image of our leaver checklist, and '
                        'it is why the two belong together. Everything on that page &mdash; '
                        'blocking sign-in, keeping the mailbox, reassigning files, reclaiming the '
                        'licence, recovering the device &mdash; quietly assumes somebody knows '
                        'what the person had. When nobody wrote it down, offboarding becomes '
                        'detective work: a licence still being billed months on, a supplier portal '
                        'only they could get into, a laptop nobody can unlock. Keep the record '
                        'current as roles change, and the day somebody hands in their notice '
                        'becomes an afternoon of admin rather than a fortnight of surprises.</p>'}],
  'faqs': [{'q': 'Can a new employee just use their own laptop for work?',
            'a': 'They can, and plenty of small businesses start out that way, but it puts company '
                 'data on a machine you do not own and cannot manage centrally. Whether personal '
                 'devices are allowed at all, and on what terms, is a policy question for your HR '
                 'adviser or solicitor. On the IT side the rule is simple: keep the work inside '
                 'your business accounts and cloud storage so nothing important lives only on '
                 'their hardware. A business-owned laptop is far simpler, and far easier to get '
                 'back.'},
           {'q': 'Should I set up a new starter&rsquo;s Microsoft 365 account under my own login?',
            'a': 'No, and it is the most expensive shortcut we see. Accounts and licences should '
                 'live in your own Microsoft 365 tenant, on your own domain, with the '
                 'administrator account held by the business rather than by one person. Set up '
                 'under somebody&rsquo;s personal login, the mailbox and the subscription belong '
                 'to whoever holds that login &mdash; so when they leave, or forget the password, '
                 'getting control back is slow and stressful.'},
           {'q': 'What access should a new employee get on their first day?',
            'a': 'Enough to do the job, and no more: their own mailbox and calendar, the shared '
                 'folders or sites their team uses, the apps the role needs, the printer and the '
                 'WiFi. Leave out administrator rights on the laptop, administrator rights over '
                 'your Microsoft 365, finance, payroll and HR folders, banking details, domain and '
                 'website logins and any shared password vault. Access is easy to add when it is '
                 'genuinely needed and awkward to take back once given.'},
           {'q': 'Can we give a leaver&rsquo;s old laptop to a new starter?',
            'a': 'Yes, as long as anything the business still needs has been taken off it first '
                 '&mdash; a wipe cannot be reversed &mdash; and it is then reset back to a clean '
                 'state. Handed over as it is, the new person inherits the previous '
                 'employee&rsquo;s accounts, files and saved browser passwords, and you inherit '
                 'the support calls that follow. Take an honest look at its age while you are '
                 'there &mdash; a spent battery and an expired warranty tend to cost more in lost '
                 'time than the machine saved.'},
           {'q': 'How far in advance should we set up a new employee&rsquo;s laptop?',
            'a': 'Before their start date rather than on it. Ordering a device, creating accounts, '
                 'assigning licences and getting the security in place each involve small waits, '
                 'and doing all of it while somebody sits watching is the version that gets '
                 'rushed. As soon as you know a start date, that is the point to get the setup '
                 'booked in. Tell us what the role needs and we can have the laptop ready to hand '
                 'over, with a record of what was set up.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get in touch', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/what-to-do-when-an-employee-leaves/">The mirror of this: when an '
                    'employee leaves</a> &middot; <a '
                    'href="/employee-left-dont-know-computer-password/">A leaver whose password '
                    'nobody knows</a> &middot; <a href="/microsoft-365-support/">Microsoft 365 '
                    'support</a> &middot; <a href="/business-it-support-plans/">Business IT '
                    'support plans</a></p>'},
 {'slug': 'wipe-deceased-relatives-laptop-pass-on',
  'title': "How to Wipe a Deceased Relative's Laptop | 365 Techies",
  'metaDesc': 'Get the photos and documents off first, then wipe properly. A calm, plain guide to '
              'clearing a laptop that belonged to someone who has died.',
  'ogTitle': 'Wiping a laptop that belonged to someone who has died',
  'crumbName': "Wipe a Late Relative's Laptop",
  'eyebrow': '// BEREAVEMENT SUPPORT',
  'h1': 'Wiping a laptop that belonged to someone who has died',
  'lede': 'If you are clearing a laptop that belonged to someone who has died, there is one thing '
          'to do before the wipe: get the contents off it. Wiping cannot be undone, and '
          'photographs and documents nobody knew were there go with it. This page covers that '
          'first, then what a proper wipe actually involves, and how to hand the machine on to '
          'someone who will use it.',
  'ctaHead': 'Talk to us before you wipe anything',
  'ctaSub': 'Free collection across Bournemouth, Poole and Dorset. We will look at the contents '
            'first and get off what is there, then clear the laptop properly. Call 01202 775566 '
            'whenever you are ready &mdash; there is no rush.',
  'serviceName': 'Secure Laptop Wiping and Data Recovery',
  'sections': [{'eyebrow': '/01 &mdash; BEFORE ANYTHING ELSE',
                'h2': 'Before you wipe it, get the contents off',
                'html': '<p>We would ask you to read this part before you do anything else, '
                        'because it is the one step that cannot be taken back.</p><p>Wiping a '
                        'laptop is permanent. The moment it is done, everything on it is gone '
                        '&mdash; photographs, letters, scanned paperwork, videos, saved messages, '
                        'address books, and all the small ordinary files nobody thinks about until '
                        'they are missing. Families very often wipe a machine quickly, in the '
                        'middle of clearing a house, and only realise months later that the only '
                        'copies of certain photographs were on it. That loss is not recoverable, '
                        'and it is a hard one to sit with.</p><p>So before the wipe, take the '
                        'contents off. In practice that means copying everything of value onto an '
                        'external drive, a memory stick or a cloud account of your own, and then '
                        'checking that you can actually open what you have copied. If the laptop '
                        'is locked, if you are not sure what is on it, or if you would simply '
                        'rather someone else did the looking, that is a normal and reasonable '
                        'thing to ask for help with.</p><p>We have a separate page about '
                        'recovering the contents of a late relative&rsquo;s laptop, and we would '
                        'suggest starting there. Nothing here is urgent. The laptop can sit in a '
                        'cupboard for as long as you need it to.</p>'},
               {'eyebrow': '/02 &mdash; THE PASSWORD',
                'h2': 'The password is usually not the obstacle you fear',
                'html': '<p>A great many people put this job off because they do not know the '
                        'password, and assume that makes the laptop impossible to clear. For '
                        'wiping, that is often not the barrier people fear &mdash; though not '
                        'always.</p><p>Modern laptops have a built-in way of resetting themselves '
                        'that sits underneath the normal sign-in screen. It does not need the '
                        'account password, because it is not trying to get into the account '
                        '&mdash; it is throwing the account away along with everything else. Which '
                        'means wiping is often the easy part and reading the contents is the hard '
                        'part: the opposite of what most people expect.</p><p><strong>The '
                        'consequence matters.</strong> Not knowing the password is not a reason to '
                        'rush into a wipe, and it is not a reason to assume the photographs are '
                        'already lost. Getting into a machine to read what is on it is a different '
                        'job with a different set of answers. On many newer laptops the drive is '
                        'also encrypted, which makes that job one worth handing to someone who '
                        'does it regularly rather than experimenting with on a machine you cannot '
                        'replace. That encryption matters for the wipe too. If the laptop asks for '
                        'a recovery key before it will reset, or a Mac asks for the original '
                        'owner&rsquo;s account details, stop there rather than guessing &mdash; '
                        'that is a different job, and a machine can end up locked in a way that '
                        'leaves it no use to anyone.</p><p>If you do happen to have the password, '
                        'or you find it written down somewhere, keep a note of it until the laptop '
                        'has been dealt with. It makes everything that follows simpler.</p>'},
               {'eyebrow': '/03 &mdash; WHAT WIPING MEANS',
                'h2': 'What &ldquo;properly wiped&rdquo; actually means',
                'html': '<p>Dragging files to the bin and emptying it is not a wipe. It removes '
                        'the signposts to the data rather than the data itself, and on an older '
                        'machine ordinary recovery software can bring a great deal of it back. The '
                        'same is true of deleting the old user account, or simply setting up a '
                        'fresh account for whoever is taking the laptop on &mdash; the previous '
                        'files are still sitting there underneath.</p><p>A proper wipe means the '
                        'whole drive is cleared and the operating system put back to the state it '
                        'was in when the laptop was new. Windows laptops and recent Macs both have '
                        'something like this built in: a reset that offers to remove everything '
                        'rather than keep the files. Some versions offer a further option to clean '
                        'the drive more thoroughly as well, which takes considerably longer but is '
                        'the sensible choice when the machine is leaving the family.</p><p>For a '
                        'laptop going to a relative, a friend or a charity, that built-in reset '
                        'with everything removed is generally enough. Where a machine held '
                        'business records, client information or anything you would be uneasy '
                        'about, the safer route is to have the drive erased to a recognised '
                        'standard, or removed and replaced altogether.</p>'},
               {'eyebrow': '/04 &mdash; ACCOUNTS',
                'h2': 'Accounts signed in on the laptop are a separate matter',
                'html': '<p>Clearing the drive deals with the laptop itself. It does not deal with '
                        'the accounts that were signed in on it. Email, cloud storage, photo '
                        'libraries, subscriptions, online shopping and password managers all live '
                        'on someone else&rsquo;s servers, and they carry on existing after the '
                        'machine has been reset.</p><p>That cuts two ways. First, anything kept '
                        'only in the cloud &mdash; photographs that were syncing automatically, '
                        'documents saved online rather than on the drive &mdash; will not be '
                        'preserved by copying files off the laptop, so it deserves its own look '
                        'before anything is closed down. Second, where accounts were left signed '
                        'in, it is worth signing out of them or removing them, from another device '
                        'if need be, rather than leaving it to the wipe alone. Some machines, '
                        'Apple ones in particular, can stay tied to the original owner&rsquo;s '
                        'account even after being erased, and that is far easier to sort out '
                        'before the laptop leaves your hands than afterwards.</p><p>Most large '
                        'providers do have a process for the account of someone who has died. They '
                        'differ from one company to the next and they change over time, so check '
                        'that provider&rsquo;s own bereavement or help pages rather than anything '
                        'read second hand.</p>'},
               {'eyebrow': '/05 &mdash; PASSING IT ON',
                'h2': 'Passing it on, donating or recycling',
                'html': '<p>A working laptop that has been properly cleared is a genuinely useful '
                        'thing to give away. A grandchild starting a course, a neighbour without a '
                        'computer, a local charity, a community reuse or repair scheme, a school '
                        '&mdash; there are more places that will welcome a tidy, working machine '
                        'than most people imagine. It is a kinder ending than a drawer.</p><p>A '
                        'few practical points when you hand it over:</p><ul><li>Say plainly what '
                        'it is &mdash; roughly how old, whether the battery still holds a charge, '
                        'and whether the operating system is still supported.</li><li>After the '
                        'reset, charge it and check it starts up to the fresh setup screen, so the '
                        'next person is not handed a puzzle.</li><li>Include the power lead. It is '
                        'the thing most often left behind.</li><li>If the machine is genuinely '
                        'past use, electrical items belong at a household waste recycling point '
                        'rather than in the bin, and some charities will take a non-working laptop '
                        'for parts.</li></ul><p>One last thing, said kindly: whose laptop it is, '
                        'and who is entitled to what was on it, is a question for whoever is '
                        'handling the estate rather than for us. Our part is the technical side '
                        '&mdash; getting the contents off safely, and clearing the machine '
                        'properly once you are ready.</p>'}],
  'faqs': [{'q': 'Do I need the password to wipe a deceased relative&rsquo;s laptop?',
            'a': 'Usually not, though not always. The reset built into a modern laptop sits '
                 'beneath the sign-in screen and does not need the account password, because it '
                 'removes the account along with everything else. Reading what is on the machine '
                 'is generally the harder job, not clearing it. Some laptops ask for a recovery '
                 'key, and some Macs ask for the original owner&rsquo;s account, before they will '
                 'reset at all &mdash; if that happens, it is worth asking rather than guessing. '
                 'Either way, a locked laptop is no reason to rush.'},
           {'q': 'Will wiping the laptop delete the photos for good?',
            'a': 'Yes, permanently. A wipe is not a deletion you can undo, and once the drive has '
                 'been cleared there is nothing left for us or anyone else to bring back. That is '
                 'why we ask families to copy the photographs, documents and videos off first '
                 '&mdash; onto an external drive, a memory stick or a cloud account of their own '
                 '&mdash; and to check the copies actually open before the reset is run. There is '
                 'no hurry. The laptop can wait as long as you need.'},
           {'q': 'Is deleting the files and emptying the recycle bin enough?',
            'a': 'No. Emptying the bin removes the pointers to a file rather than the file itself, '
                 'and ordinary recovery software can often bring a good deal of it back, '
                 'particularly on older machines. Deleting the old user account, or setting up a '
                 'new one for whoever is taking the laptop on, leaves the previous data sitting '
                 'there too. A proper wipe clears the whole drive and puts the operating system '
                 'back to how it was when the machine was new.'},
           {'q': 'What happens to the email and cloud accounts after the laptop is wiped?',
            'a': 'They are a separate matter. Email, cloud storage and photo libraries live on the '
                 'provider&rsquo;s servers rather than on the laptop, so they carry on after a '
                 'reset &mdash; and anything held only online will not be saved by copying files '
                 'off the machine. Most large providers do have a process for the account of '
                 'someone who has died, but they vary from one company to another and they change, '
                 'so check that provider&rsquo;s own bereavement pages.'},
           {'q': 'Can you wipe the laptop for us?',
            'a': 'Yes. We can collect it free of charge from anywhere in Bournemouth, Poole and '
                 'Dorset, go through the contents first and copy off what is on it, and then clear '
                 'the machine properly so it can be passed on, donated or recycled. We do not have '
                 'a shop, so collection is simply how we work. If you would rather we only '
                 'recovered the contents and left the wipe to you, that is fine as well. Call '
                 '01202 775566 when you are ready.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get in touch', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/recover-photos-deceased-relatives-laptop/">Read first: recovering '
                    'photos and files</a> &middot; <a href="/data-recovery/">Data recovery</a> '
                    '&middot; <a href="/how-to-wipe-and-recycle-old-computer/">Wiping and '
                    'recycling an old computer</a> &middot; <a href="/secure-it-disposal/">Secure '
                    'IT disposal</a></p>'}]
