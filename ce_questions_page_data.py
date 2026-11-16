# -*- coding: utf-8 -*-
"""/cyber-essentials-questions/ (16 Nov 2026; owner: "expand our Cyber Essentials page ... the questions and how to answer
each question and what information they need").

Every numbered question of the Cyber Essentials self-assessment, the "Danzell" question set (IASME booklet version 16,
April 2026, for assessments bought from 27 April 2026; NCSC Requirements for IT Infrastructure v3.3), in our own words:
what it asks, what to have ready, a sensible answer for a small firm, and the traps.

Source: IASME's free Self-Assessment Preparation Booklet (Danzell, v16), read 16 Nov 2026. 107 numbered items: A1 23,
A2 18, A3 3, A4 14, A5 10, A6 16, A7 18, A8 5. The questions are PARAPHRASED, never copied: the booklet is IASME's.
Automatic fails named in the booklet: A6.4, A6.5, A7.16, A7.17, and A7.15 when a listed service does offer MFA.
Experience line: one small consultancy we helped in November 2026 (not named; its portal showed 85 questions, and the
traps it hit are the ones listed). No price invented for preparation work; fees live on /cyber-essentials/.
Never "compliant" or "certified by us": only an IASME certification body awards the certificate.
"""
from new_pages_data import NEW_PAGES
import store_badges as _store

AF = ('<span style="display:inline-block;margin-left:.4rem;padding:.05rem .5rem;border-radius:999px;font-size:.78rem;'
      'font-weight:700;letter-spacing:.03em;background:rgba(229,72,77,.14);color:#e5484d;vertical-align:middle">'
      'AUTOMATIC FAIL</span>')


def q(num, title, asks, answer, trap=None, fail=False):
    """One question: a heading people can link to (#a4-1), what it asks, a sensible answer, and the trap."""
    anchor = num.split()[0].lower().replace('.', '-').rstrip('-')   # "A1.5 and A1.5.1" -> a1-5
    out = (f'<h3 id="{anchor}">{num} {title}{AF if fail else ""}</h3>'
           f'<p><strong>What it asks:</strong> {asks}</p>'
           f'<p><strong>A good answer:</strong> {answer}</p>')
    if trap:
        out += f'<p><strong>Watch out:</strong> {trap}</p>'
    return out


def qs(*items):
    return ''.join(q(*i) if len(i) < 6 else q(i[0], i[1], i[2], i[3], i[4], i[5]) for i in items)


_CALL = ('<p>We prepare small businesses for Cyber Essentials: we check every PC with our free app, switch on two-step '
         'sign-in on your accounts, tidy up what would fail, and go through the question set with you. You type the '
         'answers and sign the declaration yourself, and an independent IASME certification body marks it. That '
         'independence is the point of the certificate.</p>'
         '<p>Ring <strong>01202 775566</strong> or text 07520 615332, Monday to Friday, 9 to 5. Most of the work is done '
         'remotely, so we can help anywhere in the UK. We tell you the price before we start. See <a href="/cyber-essentials/">'
         'Cyber Essentials, ready all year</a> for the fees and what our business plans include.</p>')

NEW_PAGES.append({
    'slug': 'cyber-essentials-questions',
    'title': 'Cyber Essentials Questions Explained: How to Answer Each One',
    'metaDesc': 'Every Cyber Essentials self-assessment question (Danzell, April 2026) in plain English: what it asks, '
                'what to have ready, and the answers that fail.',
    'ogTitle': 'The Cyber Essentials questions, explained one by one',
    'crumbName': 'Cyber Essentials Questions',
    'eyebrow': '// THE DANZELL QUESTION SET, APRIL 2026',
    'h1': 'Cyber Essentials questions, <em class="grad grad--green">explained one by one</em>',
    'lede': 'The Cyber Essentials self-assessment is a list of just over a hundred questions about your devices, accounts and '
            'settings. Most are easy once you know what the assessor wants to read. Here is every question in the current '
            '&ldquo;Danzell&rdquo; set, in plain English: what it asks, what to have ready, a sensible answer for a small '
            'business, and the answers that fail you automatically. Our free app, 365 PC Manager, answers most of the '
            'computer questions for you.',
    'chips': ['All 107 questions', 'The 5 automatic fails', 'What to gather first'],
    'primaryCta': ['The automatic fails', '#s2'], 'secondaryCta': ['What to gather first', '#s3'],
    'ctaHead': 'Rather go through it with us?',
    'ctaSub': 'We check your PCs and accounts, fix what would fail and go through the questions with you. You sign it, an '
              'independent assessor marks it. Call 01202 775566.',
    'schemaKind': 'howto',
    'atAGlance': [
        ('What it is', 'The self-assessment for the UK government&rsquo;s Cyber Essentials certificate, answered online in IASME&rsquo;s portal.'),
        ('Current version', '&ldquo;Danzell&rdquo; (booklet version 16), for assessments bought from 27 April 2026.'),
        ('How many questions', '107 numbered items in eight sections. The portal hides the ones that don&rsquo;t apply, so a small firm sees fewer.'),
        ('Automatic fails', 'Updates late (A6.4, A6.5), two-step sign-in missing on a cloud service (A7.16, A7.17), or a service wrongly listed as having none (A7.15).'),
        ('Who signs it', 'A director, owner or board member. Not your IT company.'),
        ('Free help for the PC questions', 'Our free app, 365 PC Manager, checks each Windows PC against the questions a computer can answer.'),
        ('Time allowed','Six months from purchase to finish, by IASME&rsquo;s checkout terms.'),
    ],
    'sections': [
        {'eyebrow': '/01 &mdash; HOW IT WORKS', 'h2': 'How the question set works',
         'html': '<p>When you buy a Cyber Essentials assessment from IASME (or through a certification body) you get a login '
                 'to an online portal. The questions come in eight sections: your organisation, scope, insurance, firewalls, '
                 'secure configuration, security updates, user access and malware protection. You answer them, a director '
                 'signs the declaration, and an independent assessor marks it.</p>'
                 '<p>The current set is called <strong>Danzell</strong>. It replaced &ldquo;Willow&rdquo; for any assessment '
                 'bought from <strong>27 April 2026</strong>, and it goes with the NCSC&rsquo;s <em>Requirements for IT '
                 'Infrastructure v3.3</em>. IASME publishes the whole set free as a preparation booklet, so you can read '
                 'every question before you pay.</p>'
                 '<p><strong>Most questions want a short description, not a yes.</strong> The assessor is checking that what '
                 'you describe meets the rule. &ldquo;Yes&rdquo; on its own often gets sent back. One or two sentences about '
                 'what you actually do is the right length.</p>'
                 '<p>The portal shows only the questions that apply to you. A one-person consultancy we helped in November '
                 '2026 had 85 in its portal, because answers like &ldquo;no servers&rdquo; and &ldquo;no remote access to '
                 'the router&rdquo; hide the follow-ups.</p>'},
        {'eyebrow': '/02 &mdash; READ THIS FIRST', 'h2': 'The answers that fail you automatically',
         'html': '<p>Since April 2026 five answers end the assessment on their own, however well you answer the rest:</p>'
                 '<ul>'
                 '<li><strong>A6.4:</strong> critical and high-risk updates for Windows, macOS, phones, and your router or '
                 'firewall firmware not installed within <strong>14 days</strong> of release.</li>'
                 '<li><strong>A6.5:</strong> the same 14 days for every program and app: browsers, Office, PDF readers, '
                 'Zoom, and anything else installed.</li>'
                 '<li><strong>A7.16:</strong> two-step sign-in (MFA) missing on any <strong>administrator</strong> account of '
                 'a cloud service that offers it.</li>'
                 '<li><strong>A7.17:</strong> MFA missing on any <strong>user</strong> account of a cloud service that offers '
                 'it.</li>'
                 '<li><strong>A7.15:</strong> listing a cloud service as &ldquo;has no MFA&rdquo; when it does have it.</li>'
                 '</ul>'
                 '<p>The 14 days must hold <strong>all the time</strong>, not just on the day you submit. Microsoft&rsquo;s '
                 'fixes come out on the second Tuesday of each month, so each month&rsquo;s are due two weeks later. Our '
                 '<a href="/cyber-essentials/#requirements">Cyber Essentials page</a> works out this month&rsquo;s '
                 'deadline for you.</p>'},
        {'eyebrow': '/03 &mdash; BEFORE YOU START', 'h2': 'What to gather before you open the portal',
         'html': '<p>Half an hour collecting these saves most of the back and forth:</p>'
                 '<ol>'
                 '<li><strong>Company details:</strong> exact legal name, company number, registered address, and any other '
                 'addresses you work from.</li>'
                 '<li><strong>Every computer:</strong> make, and the exact Windows edition and version (for example '
                 '&ldquo;Windows 11 Pro 25H2&rdquo;: press Windows key + R, type <code>winver</code>). Macs: the macOS '
                 'version. Include staff&rsquo;s own laptops if they use them for work.</li>'
                 '<li><strong>Every phone and tablet</strong> that gets work email or apps: make and system version. Staff-owned '
                 'phones count too.</li>'
                 '<li><strong>The router or firewall</strong> at each office: make and model. Home routers are left out.</li>'
                 '<li><strong>Every cloud service</strong> you sign in to for work: Microsoft 365 or Google Workspace, '
                 'accounting, banking portals, CRM, website hosting, domain registrar, file sharing, video calls, and your '
                 'social media accounts.</li>'
                 '<li><strong>For each cloud service:</strong> is two-step sign-in on for every person, administrators '
                 'included?</li>'
                 '<li><strong>Your browsers, antivirus, email program and office software</strong>, with version numbers.</li>'
                 '<li><strong>Who has administrator rights</strong> on each PC and each cloud service.</li>'
                 '</ol>'
                 '<h3 id="pc-manager">Let 365 PC Manager answer the computer questions</h3>'
                 '<p>Most of the computer side of the question set can be read straight off each PC. Our free Windows app, '
                 '<a href="/free-pc-health-check/">365 PC Manager</a>, does it for you: open it on each computer and go to '
                 '<strong>Safety, Cyber Essentials readiness</strong>. Every check says <strong>ready</strong> or '
                 '<strong>what to fix</strong>, in plain English, with a button to the right Windows setting. Fix what it '
                 'flags, run it again, and you can answer these questions with confidence:</p>'
                 '<ul>'
                 '<li>Windows version and edition, and whether it still gets updates (Windows 10: whether it is in Extended Security Updates) <em>(helps with A2.6, A6.1)</em></li>'
                 '<li>Windows Firewall on for private and public networks <em>(helps with A4.1, A4.1.1)</em></li>'
                 '<li>Programs you don&rsquo;t need, and why each one isn&rsquo;t needed <em>(helps with A5.1)</em></li>'
                 '<li>Spare accounts (Guest and the built-in Administrator) switched off <em>(helps with A5.2)</em></li>'
                 '<li>PIN length (6 or more) and the lock after 10 wrong guesses <em>(helps with A5.10, A7.10)</em></li>'
                 '<li>This month&rsquo;s Windows update installed within 14 days, automatic updates on, and updates waiting for a restart <em>(helps with A6.4, A6.4.1)</em></li>'
                 '<li>Programs that need updating, and programs that no longer get fixes <em>(helps with A6.2, A6.5, A6.6)</em></li>'
                 '<li>Whether you are signed in as an administrator, and how many administrator accounts there are <em>(helps with A7.6, A7.7, A7.8)</em></li>'
                 '<li>Antivirus on and up to date, only one antivirus running, and harmful sites and downloads blocked (SmartScreen) <em>(helps with A6.2.2, A8.1, A8.2, A8.3)</em></li>'
                 '</ul>'
                 '<p>Switch on <strong>Stay ready all year round</strong> and it re-checks the PC every few hours, reminds you '
                 'before each month&rsquo;s update deadline, and keeps a dated record you can save for your assessor or '
                 'insurer.</p>'
                 '<p><strong>What no PC can show</strong>, so you still check these yourself: the office router and its '
                 'password (A4.2 to A4.11), two-step sign-in on your cloud accounts (A7.14 to A7.17), phones and tablets '
                 '(A2.8, A8.4, A8.5), auto-run for USB sticks (A5.8), and your written processes for starters, leavers and '
                 'admin rights (A7.1 to A7.5). The app gets the computers ready; it doesn&rsquo;t certify anything. Only an '
                 'IASME certification body awards the certificate.</p>'
                 '<p><a class="button primary" href="/free-pc-health-check/#download">Download 365 PC Manager free</a>'
                 + _store.badge('pcm') + '</p>'},   # 16 Nov 2026 (owner): the Microsoft Store badge beside it
        {'eyebrow': '/04 &mdash; SECTION A1', 'h2': 'Your organisation (A1.1 to A1.16)',
         'html': '<p>Easy questions, but the certificate is printed from them, so get them exactly right.</p>' + qs(
             ('A1.1', 'Organisation name', 'Your legal name, as it should appear on the certificate. One legal entity, up '
              'to 150 characters; you can add a trading name.', 'The name exactly as Companies House has it, for example '
              '&ldquo;Example Widgets Ltd t/a Example Print&rdquo;.', 'Other companies in the group go in A1.6.1, and '
              'can&rsquo;t be added after the certificate is issued.'),
             ('A1.2', 'Type of organisation', 'Limited company, LLP, sole trader, charity, partnership and so on.',
              'Pick the one that matches your legal form.'),
             ('A1.3', 'Number of employees', 'Everyone who works for you, including volunteers, agency staff and '
              'contractors who can get at your data.', 'The real head count. It also sets your fee band.',
              'Leaving out contractors with a company login is a common slip.'),
             ('A1.4', 'Registration number', 'Your company number, digits and letters only.', 'The Companies House '
              'number with no spaces. Sole traders and partnerships type &ldquo;none&rdquo;.'),
             ('A1.5 and A1.5.1', 'Registered and operating addresses', 'Your registered address, and any addresses you '
              'work from if different.', 'The registered office, then each office or unit you use. Staff home addresses '
              'are not included.'),
             ('A1.6 and A1.6.1', 'More than one legal entity', 'Whether other companies share this assessment, and their '
              'names, numbers and addresses.', 'Usually &ldquo;No&rdquo;. If yes, list each one: they must share the same '
              'network and the same director signing off.'),
             ('A1.7', 'Main business', 'Your sector, from a list.', 'The nearest match, or Other with a few words.'),
             ('A1.8', 'Website', 'Your website, or a Facebook or LinkedIn page if you have no site.', 'Your main web '
              'address.'),
             ('A1.9', 'Renewal or first time', 'Whether you have held Cyber Essentials before.', '&ldquo;Renewal&rdquo; '
              'only if you held it before.'),
             ('A1.10 to A1.10.5', 'Why you are applying', 'Your two main reasons (a contract, a government contract, '
              'customers, your insurer, a regulator, a grant, or to improve security), then who asked for it.',
              'The two real reasons, and the name of the customer, contract, grant body or regulator if one asked.',
              'Leave out protectively marked bid numbers and any customer you are contracted to keep confidential.'),
             ('A1.11', 'Read the requirements?', 'Whether you have read the NCSC&rsquo;s <em>Requirements for IT '
              'Infrastructure v3.3</em>.', '&ldquo;Yes&rdquo;, after reading it. It is about 20 pages and answers most '
              'of the harder questions below.'),
             ('A1.12', 'Spoken to an NCSC Cyber Advisor?', 'Whether an NCSC-assured Cyber Advisor helped you.',
              '&ldquo;No&rdquo; unless one did. Your ordinary IT company is not a Cyber Advisor unless the NCSC lists it.'),
             ('A1.13 to A1.16', 'Contact and research questions', 'Whether IASME can contact you after a breach or for '
              'research, where you heard about the scheme, and whether you use the NCSC&rsquo;s free Early Warning '
              'service.', 'Your choice; none of these affects the result. Early Warning is free and worth signing up to.'),
         )},
        {'eyebrow': '/05 &mdash; SECTION A2', 'h2': 'Scope: what the certificate covers (A2.1 to A2.10)',
         'html': '<p>The scope is the list of everything the certificate covers. Most small firms should choose the '
                 '<strong>whole organisation</strong>: it is simpler, and the free cyber insurance is designed around it. '
                 'You can never leave out staff computers, phones or cloud services.</p>' + qs(
             ('A2.1', 'Whole or part of the organisation', 'Whether the assessment covers everything or only part.',
              '&ldquo;Whole organisation&rdquo;.', 'Part (a &ldquo;sub-set&rdquo;) is only allowed when the left-out part '
              'is cut off by a firewall or VLAN. Leaving out a department because it is messy doesn&rsquo;t count.'),
             ('A2.2 to A2.2.2', 'Describing a partial scope', 'If you chose part, what is in, what is out, and how it is '
              'separated.', 'Skip if you chose whole organisation. Otherwise name the sub-set and how it is cut off, for '
              'example &ldquo;test network, separated by firewall&rdquo;.', 'Windows Firewall, security groups and '
              'software methods are not accepted as the dividing line.'),
             ('A2.3 to A2.3.2', 'Networks at your locations', 'Whether your networks are used at the addresses in A1.5.1, '
              'and whether each site has its own internet line.', '&ldquo;Yes&rdquo; and &ldquo;Yes&rdquo; for a single '
              'office with its own broadband. If sites link to each other, describe how.'),
             ('A2.4', 'Networks in scope', 'A list of your networks by name, place and purpose.', '&ldquo;Office network '
              'at our Poole office, used by all staff&rdquo;. No IP addresses or technical detail.'),
             ('A2.4.1 and A2.4.2', 'Home and remote workers', 'How many staff work from home or on the move, and how they '
              'connect.', 'Anyone allowed to work away from the office at all counts. For example &ldquo;3; home '
              'broadband using their own routers, connecting to Microsoft 365 over the internet&rdquo;.'),
             ('A2.5', 'Network equipment', 'Make, model and number of each router or firewall in scope.', '&ldquo;1 x BT '
              'Business Smart Hub 2&rdquo;, or whatever your office has. Home workers: say in the notes that they rely '
              'on Windows Firewall.', 'Never list home routers. Switches and Wi-Fi access points that don&rsquo;t route '
              'internet traffic are not needed.'),
             ('A2.5.1', 'Equipment that separates a sub-set', 'Partial scope only: the firewall or router that cuts the '
              'sub-set off.', 'Skip for whole organisation.'),
             ('A2.6', 'Laptops and desktops', 'How many, which make, and the exact operating system, edition and version, '
              'staff-owned ones included.', '&ldquo;6 Dell laptops, Windows 11 Pro 25H2; 1 HP desktop, Windows 11 Pro '
              '25H2&rdquo;.', 'The Windows edition and version are required. Windows 10 after 14 October 2025 only passes '
              'with Microsoft&rsquo;s paid Extended Security Updates.'),
             ('A2.6.1', 'Thin clients', 'Simple terminals used to reach virtual desktops.', '&ldquo;None&rdquo; for '
              'almost every small firm.'),
             ('A2.7', 'Servers', 'Physical and virtual servers and their operating systems.', '&ldquo;None&rdquo; if '
              'everything is in Microsoft 365 or Google. Otherwise, for example, &ldquo;1 x Windows Server 2022&rdquo;.',
              'A Windows Server 2012 or older box fails on its own: it no longer gets fixes.'),
             ('A2.8', 'Phones and tablets', 'How many, which make, and the system version, for every phone or tablet '
              'that reaches work email or apps.', '&ldquo;4 Samsung phones, Android 16; 2 iPhones, iOS 26&rdquo;.',
              'Staff-owned phones with work email on them are in scope. A phone too old for updates fails.'),
             ('A2.9', 'Cloud services', 'Every online service you use for work that holds or handles your data.',
              'A full list: Microsoft 365 or Google Workspace, your accounting software, banking, CRM, website hosting, '
              'domain registrar, file sharing, video calls, payment providers, and LinkedIn, Facebook and other social '
              'accounts.', 'Social media counts as a cloud service. Every service listed here needs two-step sign-in later '
              '(A7.14 to A7.17), so the list matters.'),
             ('A2.10', 'Who is responsible for IT', 'The name and role of the person in charge of your IT.', 'A director '
              'or staff member, for example &ldquo;Jane Smith, Operations Director&rdquo;.', 'It must be someone in your '
              'organisation. Your outsourced IT company can&rsquo;t be named here.'),
         )},
        {'eyebrow': '/06 &mdash; SECTION A3', 'h2': 'The free cyber insurance (A3.1 to A3.3)',
         'html': '<p>Organisations with a UK head office and a turnover under &pound;20 million can opt in to cyber insurance '
                 'that comes with the certificate at no extra cost. These answers go to the insurance broker and don&rsquo;t '
                 'affect your result.</p>' + qs(
             ('A3.1', 'Eligible?', 'Whether your head office is in the UK or Crown Dependencies and turnover is under '
              '&pound;20 million.', 'Yes or no, honestly.'),
             ('A3.2', 'Opt in?', 'Whether you want the included insurance.', 'Usually &ldquo;Yes&rdquo;: it costs nothing '
              'extra. Read what it covers on IASME&rsquo;s site.'),
             ('A3.3', 'Email for the documents', 'Where the broker sends the policy.', 'A shared address that will still '
              'work next year, such as accounts@ or office@.'),
         )},
        {'eyebrow': '/07 &mdash; SECTION A4', 'h2': 'Firewalls (A4.1 to A4.11)',
         'html': '<p>A firewall sits between your devices and the internet. In an office that is the router or a separate '
                 'firewall box, and every laptop and desktop also needs its own software firewall switched on (Windows '
                 'Firewall counts). For a home worker on a router you don&rsquo;t supply, the laptop&rsquo;s firewall is the '
                 'one that matters.</p>' + qs(
             ('A4.1', 'Boundary firewalls', 'Whether there is a firewall between your networks, devices and the internet.',
              '&ldquo;Yes. The office router has its firewall on, and Windows Firewall is on every laptop.&rdquo;'),
             ('A4.1.1 and A4.1.2', 'Software firewall on every computer', 'Whether every computer and server has its own '
              'firewall on, even behind the office router.', '&ldquo;Yes. Windows Firewall is on for every network type on '
              'all PCs.&rdquo;', 'Windows, macOS and common Linux all have one, so &ldquo;not available&rdquo; is almost '
              'never true.'),
             ('A4.2', 'Router default password changed', 'Whether the admin password the router or firewall came with has '
              'been changed.', '&ldquo;Yes&rdquo;, once you have changed it.', 'This includes routers that arrive with a '
              'unique password printed on a sticker. Home workers relying on Windows Firewall: this means their own sign-in '
              'password.'),
             ('A4.2.1', 'How you change it', 'A short description of how the firewall password is changed.', '&ldquo;Our '
              'IT support signs in to the router&rsquo;s admin page from inside the office and changes it; the new '
              'password is kept in our password manager.&rdquo;'),
             ('A4.3', 'Firewall password strength', 'Which rule the admin password meets: MFA with 8+ characters, 8+ with '
              'common passwords blocked, 12+ characters, or passwordless.', 'Usually &ldquo;C: at least 12 '
              'characters&rdquo;. Make it long and random and keep it in a password manager.'),
             ('A4.4', 'Changed if compromised', 'Whether you change it straight away if you know or suspect it has leaked.',
              '&ldquo;Yes&rdquo;, and know how (A4.2.1).'),
             ('A4.5', 'A process for managing the firewall', 'Whether opening anything to the internet (&ldquo;opening a '
              'port&rdquo;) needs a reason.', '&ldquo;Yes. Nothing is opened without a business reason agreed by a '
              'director.&rdquo;'),
             ('A4.6', 'Rules reviewed in the last 12 months', 'Whether you have checked the firewall rules this year, and '
              'how.', '&ldquo;Yes, reviewed with our IT support on [date]. Any rule no longer needed is removed.&rdquo;',
              'Do the review before you answer. Old rules from a departed system are what assessors worry about.'),
             ('A4.7', 'Unauthenticated inbound connections', 'Whether the firewall lets anything in from the internet '
              'without a login.', '&ldquo;No&rdquo;. Most firewalls block inbound by default; check yours.',
              'Old port forwards for a camera system or remote desktop are the usual culprits.'),
             ('A4.8', 'Approving allowed inbound connections', 'How any opening is approved and written down.', '&ldquo;None '
              'are needed.&rdquo; Or, if you have one, what it is, why, and which director signed it off.'),
             ('A4.9 to A4.11', 'Router settings reachable from the internet', 'Whether the router&rsquo;s admin page can be '
              'reached from outside, and if so why and how it is protected.', '&ldquo;No&rdquo; for most small firms. '
              'If yes, there must be a written reason and MFA, or a short list of allowed IP addresses with a strong '
              'password.', 'Some IT companies switch remote admin on and forget it. Ask yours.'),
         )},
        {'eyebrow': '/08 &mdash; SECTION A5', 'h2': 'Secure configuration (A5.1 to A5.10)',
         'html': '<p>New computers and services come with things switched on that you don&rsquo;t need: spare accounts, '
                 'trial software, auto-run. This section asks you to tidy them up and lock devices properly.</p>' + qs(
             ('A5.1', 'Unused software removed', 'Whether software and services you don&rsquo;t use have been removed from '
              'every device and cloud service, and how.', '&ldquo;Yes. Each PC is checked in Settings, Apps when it is set '
              'up and every six weeks; anything not used for work is removed.&rdquo;', 'Manufacturer extras and expired '
              'antivirus trials on new laptops count. Remove them before you answer.'),
             ('A5.2', 'Only necessary accounts', 'Whether every device and service has only the accounts actually in use.',
              '&ldquo;Yes. Guest and spare accounts are disabled; leavers are removed the day they go.&rdquo;'),
             ('A5.3', 'Default passwords changed', 'Whether every account on every device has had its default password '
              'changed to one that meets the rules.', '&ldquo;Yes. Every account has its own password of 12 or more '
              'characters, or a password with two-step sign-in.&rdquo;'),
             ('A5.4', 'Services you host for others', 'Whether you run anything that lets staff or customers reach '
              'private data over the internet: your own VPN, mail server or web app.', '&ldquo;No&rdquo; if all you use '
              'is Microsoft 365 or Google and other people&rsquo;s cloud services.', 'If yes, A5.5 to A5.7 ask how you '
              'protect it.'),
             ('A5.5 to A5.7', 'Protecting a service you host', 'How people sign in to it, how passwords are changed if '
              'compromised, and how guessing is stopped.', 'MFA is the best answer. Without MFA: 12+ character passwords, '
              'or 8+ with common ones blocked, plus throttling or a lock after 10 wrong tries.'),
             ('A5.8', 'Auto-run off', 'Whether files on USB sticks or downloads can run without anyone choosing to.',
              '&ldquo;Yes. AutoPlay is off, or set to ask every time.&rdquo; On Windows 11: Settings, Bluetooth &amp; '
              'devices, AutoPlay.', 'Asking each time is acceptable.'),
             ('A5.9', 'Devices lock', 'Whether a password, PIN or fingerprint is needed to use each device.', '&ldquo;Yes. '
              'Every laptop and phone needs a PIN, password, fingerprint or face to unlock, and locks when left.&rdquo;'),
             ('A5.10', 'How devices unlock', 'What unlocks them, and what stops guessing.', '&ldquo;Windows Hello '
              'fingerprint or a PIN of at least 6 digits; Windows locks after 10 wrong attempts. Phones: fingerprint or '
              'face with a 6-digit passcode.&rdquo;', 'A 4-digit PIN fails. A 6-digit PIN is only allowed when it just '
              'unlocks the device.'),
         )},
        {'eyebrow': '/09 &mdash; SECTION A6', 'h2': 'Security updates (A6.1 to A6.7)',
         'html': '<p>The section with two automatic fails. Everything must still be getting fixes from its maker, '
                 'everything must be licensed, and high-risk fixes must go in within 14 days.</p>' + qs(
             ('A6.1', 'Supported operating systems', 'Whether every device, router firmware included, still gets security '
              'fixes from its maker.', '&ldquo;Yes. All PCs run Windows 11 25H2, phones are on current Android and iOS, '
              'and the router gets firmware updates.&rdquo;', 'Windows 10 without paid ESU fails, and so do older Windows '
              '11 versions once support ends: <a href="/is-my-windows-still-supported/">check yours</a>.'),
             ('A6.2', 'Supported software', 'Whether every program, extension and framework still gets fixes.', '&ldquo;Yes. '
              'Software is reviewed when PCs are serviced and anything unsupported is removed.&rdquo;', 'Old Office 2016, '
              'Java 8 and abandoned browser add-ons are typical fails.'),
             ('A6.2.1', 'Browsers, with versions', 'Each browser installed and its version.', '&ldquo;Google Chrome 157, '
              'Microsoft Edge 157&rdquo;.', 'Fewer browsers means less to list and keep updated.'),
             ('A6.2.2', 'Malware protection, with versions', 'Each antivirus product and its version.', '&ldquo;Microsoft '
              'Defender Antivirus (built into Windows 11)&rdquo;, or your paid product and version.'),
             ('A6.2.3', 'Email programs, with versions', 'Each email program on devices or servers.', '&ldquo;Microsoft '
              'Outlook (Microsoft 365 Apps for business)&rdquo;, or &ldquo;Gmail in the browser&rdquo;.', 'Outlook 2016 '
              'and 2019 are out of support.'),
             ('A6.2.4', 'Office software, with versions', 'The programs you create documents with.', '&ldquo;Microsoft 365 '
              'Apps for business&rdquo; or &ldquo;Google Workspace&rdquo;.'),
             ('A6.3 and A6.3.1', 'Unlicensed or unsupported', 'Whether anything is unlicensed or out of support, and if '
              'so, what.', '&ldquo;No&rdquo;.', 'A home Microsoft 365 Family licence used for business is not licensed for '
              'business use, and nor is unactivated Windows. Free and open-source software is fine if you follow its '
              'licence.'),
             ('A6.4', 'Operating system and firmware updates in 14 days', 'Whether every critical or high-risk fix for '
              'operating systems and router or firewall firmware goes in within 14 days of release, always.', '&ldquo;Yes. '
              'Windows Update is automatic on every PC and checked monthly; the router updates its firmware '
              'automatically.&rdquo;', 'Only answer yes if it is true every month. Feature updates are not required, '
              'security fixes are.', True),
             ('A6.4.1 and A6.4.2', 'Automatic operating system updates', 'Whether automatic updates are on, and how you '
              'meet 14 days where they are not.', '&ldquo;Yes, automatic on all devices.&rdquo; If a server is updated '
              'by hand, say who does it and how often.'),
             ('A6.5', 'Program and app updates in 14 days', 'The same 14 days for every application, extensions included.',
              '&ldquo;Yes. Browsers, Microsoft 365 and phone apps update themselves; other programs are checked '
              'fortnightly.&rdquo;', 'Programs that never update themselves (PDF editors, old utilities) are what catch '
              'people out. Remove what you can.', True),
             ('A6.5.1 and A6.5.2', 'Automatic program updates', 'Whether apps update automatically, and how the rest are '
              'kept within 14 days.', '&ldquo;Yes, wherever the program offers it; the rest are checked every two '
              'weeks.&rdquo;'),
             ('A6.6', 'Unsupported software removed', 'Whether software that no longer gets fixes has been taken off.',
              '&ldquo;Yes&rdquo;, after removing it.'),
             ('A6.7', 'Unsupported software you must keep', 'If something old is essential, how it is cut off from the '
              'internet.', '&ldquo;Not applicable: no unsupported software is used.&rdquo;', 'Kept but still online means '
              'you can&rsquo;t certify the whole organisation.'),
         )},
        {'eyebrow': '/10 &mdash; SECTION A7', 'h2': 'User access and two-step sign-in (A7.1 to A7.17)',
         'html': '<p>Who has accounts, who has administrator rights, how passwords are handled, and two-step sign-in on '
                 'every cloud service. Two automatic fails live here.</p>' + qs(
             ('A7.1', 'Approving new accounts', 'How a new account is approved before it is created.', '&ldquo;A director '
              'approves every new starter&rsquo;s accounts by email before IT creates them.&rdquo;'),
             ('A7.2', 'Unique logins', 'Whether every account needs its own login, with no sharing.', '&ldquo;Yes. Everyone '
              'has their own accounts; nothing is shared.&rdquo;', 'A shared &ldquo;office@&rdquo; login that several '
              'people sign in to is a fail. Use a shared mailbox instead.'),
             ('A7.3', 'Leavers', 'How you remove or disable accounts when someone leaves.', '&ldquo;On their last day a '
              'director disables their Microsoft 365 account, removes them from every service on our list, and changes '
              'any passwords they knew.&rdquo;'),
             ('A7.4', 'Only the access people need', 'How you make sure people only reach what their job needs.', '&ldquo;'
              'Access to folders and systems is given by role and reviewed when someone changes job.&rdquo;'),
             ('A7.5', 'Approving administrator access', 'The process for giving someone admin rights.', '&ldquo;Only a '
              'director can approve admin rights, and only for someone who needs them for IT work.&rdquo;'),
             ('A7.6', 'Separate admin accounts', 'How you make sure admin work is done in a separate account, on PCs and '
              'cloud services.', '&ldquo;Everyone works in a standard account. Installing software needs a separate '
              'administrator account. Microsoft 365 admin is done from a separate admin login.&rdquo;', 'The most common '
              'fail we see on small firms: the everyday Windows account is an administrator. Fix it before you answer.'),
             ('A7.7', 'No email or browsing as admin', 'How you stop admin accounts being used for email and the web.',
              '&ldquo;Admin accounts have no mailbox and are used only to install or change settings. Downloads are done '
              'in the standard account.&rdquo;', 'A written rule and staff awareness is acceptable; you don&rsquo;t need '
              'special software.'),
             ('A7.8 and A7.9', 'Tracking and reviewing admins', 'Whether you keep a list of who has admin rights and review '
              'it.', '&ldquo;Yes. A list of admin accounts is kept and reviewed every quarter; rights no longer needed are '
              'removed.&rdquo;'),
             ('A7.10', 'Stopping password guessing', 'How password systems are protected from guessing.', '&ldquo;Windows '
              'locks an account after 10 wrong attempts; our cloud services use MFA and limit sign-in attempts.&rdquo;'),
             ('A7.11', 'Password quality controls', 'Which technical rule controls password quality.', '&ldquo;MFA on all '
              'cloud services; a minimum of 12 characters elsewhere.&rdquo;'),
             ('A7.12', 'Helping people pick good passwords', 'How you encourage unique, strong passwords.', '&ldquo;Staff '
              'are told to use three random words or the password manager&rsquo;s generator, never to reuse a password, '
              'and we provide a password manager. We don&rsquo;t force regular changes or complexity rules.&rdquo;',
              'Forcing a change every 90 days and symbol rules are now discouraged by the NCSC.'),
             ('A7.13', 'When a password is compromised', 'Whether you have a process to change it quickly.', '&ldquo;Yes. '
              'Staff report it straight away; the password is changed and the account&rsquo;s sessions are signed '
              'out.&rdquo;'),
             ('A7.14', 'Do all your cloud services offer MFA?', 'Whether every service on your A2.9 list has two-step '
              'sign-in available.', 'Usually &ldquo;Yes&rdquo;: almost every service does. If one can link to Microsoft or '
              'Google sign-in for MFA, that counts and must be set up.'),
             ('A7.15', 'Services with no MFA', 'The services that offer no two-step sign-in at all.', 'Only list a service '
              'after checking its security settings properly. IASME keeps a list of services and their MFA.', 'Listing a '
              'service that does offer MFA is an automatic fail.', True),
             ('A7.16', 'MFA on every administrator', 'Whether every administrator account on every cloud service uses '
              'MFA.', '&ldquo;Yes&rdquo;, once it is on for every admin account.', 'Check the hosting, domain registrar and '
              'social media logins too, not just Microsoft 365.', True),
             ('A7.17', 'MFA on every user', 'Whether every user of every cloud service uses MFA.', '&ldquo;Yes&rdquo;, once '
              'everyone has it on.', 'One member of staff without it on one service fails the whole assessment. Our '
              '<a href="/how-to-set-up-two-factor-authentication/">two-factor guide</a> shows how.', True),
         )},
        {'eyebrow': '/11 &mdash; SECTION A8', 'h2': 'Malware protection (A8.1 to A8.5)',
         'html': '<p>Every device needs protection from malware. Windows and Mac computers use antivirus; phones and tablets '
                 'are protected by only installing apps from the official store. Most firms answer both A and B.</p>' + qs(
             ('A8.1', 'How devices are protected', 'Which method you use: antivirus (A), installing only approved apps from '
              'a store (B), or something else.', '&ldquo;A and B: antivirus on all computers, and phones install apps '
              'only from Google Play and the App Store.&rdquo;'),
             ('A8.2', 'Antivirus kept up to date', 'Whether the antivirus updates as its maker recommends and blocks '
              'malware it finds.', '&ldquo;Yes. Microsoft Defender updates automatically and real-time protection is '
              'on.&rdquo;', 'Microsoft Defender is accepted. An expired trial of another product that has switched '
              'Defender off is not.'),
             ('A8.3', 'Harmful websites blocked', 'Whether the antivirus or browser warns about or blocks malicious '
              'websites.', '&ldquo;Yes. Microsoft Defender SmartScreen is on in Windows and Edge, and Safe Browsing is on '
              'in Chrome.&rdquo;'),
             ('A8.4', 'No unsigned apps', 'For phones and tablets: whether people are stopped from installing unsigned '
              'apps.', '&ldquo;Yes. No phone is rooted or jailbroken, and installing from unknown sources is off.&rdquo;'),
             ('A8.5', 'A list of approved apps', 'Whether you keep a list of approved apps and people only install those, '
              'staff-owned phones included.', '&ldquo;Yes. Approved work apps are listed (Outlook, Teams, Authenticator, '
              'our accounts app); staff are told not to install others for work.&rdquo;', 'A written list and a clear rule '
              'are enough; device management software is optional.'),
         )},
        {'eyebrow': '/12 &mdash; FROM OUR OWN JOBS', 'h2': 'The mistakes we see most',
         'html': '<p>From preparing small businesses for the April 2026 rules, including a one-person consultancy in '
                 'November 2026:</p>'
                 '<ul>'
                 '<li><strong>The everyday account is an administrator</strong> (A7.6, A7.7). Almost every laptop bought in '
                 'a shop is set up this way. Add a separate admin account and make your own a standard one.</li>'
                 '<li><strong>A 4-digit PIN</strong> (A5.10). Windows Hello allows it; Cyber Essentials needs 6.</li>'
                 '<li><strong>Manufacturer extras and expired antivirus trials</strong> left on new laptops (A5.1, A8.2).</li>'
                 '<li><strong>Two-step sign-in missing on one forgotten service</strong> (A7.16, A7.17): the domain '
                 'registrar, the old website login, a social media account.</li>'
                 '<li><strong>Answering &ldquo;yes&rdquo; before the fix is done.</strong> The declaration says your answers '
                 'are true now. Fix first, answer second.</li>'
                 '<li><strong>Updates waiting for a restart</strong> (A6.4). Installed but not restarted can mean not '
                 'applied. Restart before you submit.</li>'
                 '</ul>'},
        {'eyebrow': '/13 &mdash; RATHER WE HELPED?', 'h2': 'Getting ready with us', 'html': _CALL},
    ],
    'howToName': 'How to answer the Cyber Essentials self-assessment',
    'howToSteps': [
        {'name': 'Read the question set first', 'text': 'Download IASME&rsquo;s free preparation booklet for the Danzell question set and read the NCSC requirements v3.3.'},
        {'name': 'Gather your lists', 'text': 'List every computer, phone, router and cloud service with makes and versions, and who has administrator rights.'},
        {'name': 'Check each PC with 365 PC Manager', 'text': 'Run the free app&rsquo;s Cyber Essentials readiness page on every Windows PC and note what it flags.'},
        {'name': 'Fix what would fail', 'text': 'Turn on two-step sign-in everywhere, install updates, remove unused and unsupported software, and separate admin accounts.'},
        {'name': 'Answer in the portal', 'text': 'Describe what you actually do in a sentence or two for each question, rather than just answering yes.'},
        {'name': 'Sign and submit', 'text': 'A director checks the answers, signs the declaration and submits it to be marked.'},
    ],
    'faqs': [
        {'q': 'How many questions are in Cyber Essentials?', 'a': '<p>The Danzell question set has 107 numbered items in '
              'eight sections. The portal hides the ones that don&rsquo;t apply to you, so a small business usually sees '
              'between 80 and 90.</p>'},
        {'q': 'What is the Danzell question set?', 'a': '<p>The current version of the Cyber Essentials self-assessment, '
              'used for assessments bought from 27 April 2026. It goes with the NCSC&rsquo;s Requirements for IT '
              'Infrastructure v3.3 and replaced the Willow question set.</p>'},
        {'q': 'Which Cyber Essentials questions are an automatic fail?', 'a': '<p>A6.4 and A6.5 (high-risk updates not '
              'installed within 14 days), A7.16 and A7.17 (two-step sign-in missing for administrators or users of a cloud '
              'service), and A7.15 if you list a service as having no two-step sign-in when it does.</p>'},
        {'q': 'Can I see the Cyber Essentials questions before I pay?', 'a': '<p>Yes. IASME publishes the full question set '
              'as a free preparation booklet, as a PDF or a spreadsheet.</p>'},
        {'q': 'Do I have to include home workers&rsquo; routers?', 'a': '<p>No. Routers in staff homes that your organisation '
              'didn&rsquo;t supply are left out. Home workers rely on the software firewall on their laptop, which must be '
              'on.</p>'},
        {'q': 'Do staff-owned phones count for Cyber Essentials?', 'a': '<p>Yes, if they reach work email, files or apps. '
              'List them in A2.8 with make and system version, and they must still get updates.</p>'},
        {'q': 'Does social media count as a cloud service?', 'a': '<p>Yes. Business accounts on LinkedIn, Facebook, X and '
              'similar must be listed in A2.9 and need two-step sign-in.</p>'},
        {'q': 'Can my IT company fill in the Cyber Essentials questions for me?', 'a': '<p>They can help you prepare and '
              'explain each question, but a director, owner or board member must check the answers and sign the '
              'declaration, and question A2.10 must name someone inside your organisation.</p>'},
        {'q': 'Is Windows 10 allowed for Cyber Essentials?', 'a': '<p>Only with Microsoft&rsquo;s Extended Security Updates '
              'in place. Without them, Windows 10 has been unsupported since 14 October 2025 and fails.</p>'},
        {'q': 'Is there a free tool to check my PC for Cyber Essentials?', 'a': '<p>Yes. Our free Windows app, 365 PC '
              'Manager, has a Cyber Essentials readiness page that checks the firewall, spare accounts, PIN length, the lock '
              'after wrong guesses, programs not needed, the 14-day Windows update, automatic updates, unsupported programs, '
              'administrator accounts and antivirus. It can&rsquo;t check your router, cloud accounts or phones, and it '
              'doesn&rsquo;t certify anything.</p>'},
        {'q': 'How long do I have to finish the assessment?', 'a': '<p>IASME&rsquo;s terms give six months from purchase. '
              'After that the account is closed and the fee is not refunded.</p>'},
    ],
    'crossLinksHtml': '<p>Related: <a href="/cyber-essentials/">Cyber Essentials, ready all year</a> (fees and our business '
                      'plans), <a href="/cybersecurity-checklist/">cyber security checklist</a>, '
                      '<a href="/how-to-set-up-two-factor-authentication/">how to set up two-factor authentication</a>, '
                      '<a href="/is-my-windows-still-supported/">is my Windows still supported?</a> and '
                      '<a href="/password-manager-setup/">password manager setup</a>.</p>',
})


# ---- a link box to the new guide on the related pages, straight before "Frequently asked questions"
BOX_PAGES = {
    "cyber-essentials":
        ("// THE QUESTIONS, ONE BY ONE", "Filling in the self-assessment? Every question in the April 2026 Danzell set, "
         "what it asks, and the five answers that fail you automatically.", "/cyber-essentials-questions/",
         "Cyber Essentials questions explained"),
}
_FAQ = ' aria-label="Frequently asked questions"'


def _box(slug):
    eyebrow, words, href, label = BOX_PAGES[slug]
    return f"""    <section class="section" aria-label="Related guide" id="ce-questions-guide">
      <div class="wrap" style="max-width:880px">
        <div style="padding:1.1rem 1.25rem;border:1px solid rgba(43,217,74,.35);border-radius:14px;background:rgba(43,217,74,.06)">
          <p class="eyebrow mono" style="margin:0 0 .35rem">{eyebrow}</p>
          <p style="margin:0 0 .75rem;line-height:1.6">{words}</p>
          <p style="margin:0"><a class="button primary" href="{href}">{label}</a></p>
        </div>
      </div>
    </section>
"""


def insert_box(slug, html):
    if slug not in BOX_PAGES or 'id="ce-questions-guide"' in html:
        return html
    i = html.find(_FAQ)
    start = html.rfind("<section", 0, i) if i >= 0 else -1
    if start < 0:
        raise SystemExit("ce_questions_page_data: no FAQ section on /%s/" % slug)
    line = html.rfind("\n", 0, start) + 1
    return html[:line] + _box(slug) + html[line:]


# ---- 16 Nov 2026 (owner: "a really long page ... easier way to click between sections ... a progress monitor"):
# a slim bar that sticks under the header once the reader is past the contents chips. It shows the current section,
# a progress line, previous/next section buttons and a Contents panel (all 13 sections, ticked once read, with the
# number of questions in each) holding a "Go to question" box (A7.17 -> #a7-17; a sub-question such as A1.10.3 goes
# to the heading that covers it). Built from the page's own sections at run time, so it follows any edit. No script:
# nothing shows and the contents chips still work. Colours come from the theme variables, so light and dark both work.
NAV_HTML = r'''<div class="ceqnav" id="ceqnav" hidden>
  <div class="ceqnav__in">
    <button type="button" class="ceqnav__step" id="ceqnav-prev" aria-label="Previous section">&#8249;</button>
    <button type="button" class="ceqnav__now" id="ceqnav-open" aria-expanded="false" aria-controls="ceqnav-panel">
      <span class="ceqnav__count mono" id="ceqnav-count">01/13</span>
      <span class="ceqnav__title" id="ceqnav-title">How the question set works</span>
      <span class="ceqnav__more mono">Contents &#9662;</span>
    </button>
    <button type="button" class="ceqnav__step" id="ceqnav-next" aria-label="Next section">&#8250;</button>
  </div>
  <div class="ceqnav__track" aria-hidden="true"><span class="ceqnav__fill" id="ceqnav-fill"></span></div>
  <div class="ceqnav__panel" id="ceqnav-panel" hidden>
    <form class="ceqnav__find" id="ceqnav-find" role="search">
      <label for="ceqnav-q">Go to question</label>
      <input id="ceqnav-q" type="text" inputmode="text" autocomplete="off" spellcheck="false" placeholder="e.g. A7.17">
      <button type="submit" class="button primary">Go</button>
      <p class="ceqnav__msg" id="ceqnav-msg" role="status"></p>
    </form>
    <p class="ceqnav__read mono" id="ceqnav-read">0% read</p>
    <ol class="ceqnav__list" id="ceqnav-list"></ol>
    <button type="button" class="ceqnav__top" id="ceqnav-top">&#8593; Back to the top</button>
  </div>
</div>
<style>
section[id^="s"],h3[id]{scroll-margin-top:9.5rem}
.ceqnav{position:fixed;left:0;right:0;top:76px;z-index:49;background:var(--bg-2);border-bottom:1px solid var(--line);box-shadow:var(--shadow-1);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.ceqnav[hidden]{display:none!important}
.ceqnav__in{max-width:1120px;margin:0 auto;padding:.35rem 16px;display:flex;align-items:center;gap:.4rem}
.ceqnav__step{flex:none;width:2.4rem;height:2.4rem;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--ink);font-size:1.35rem;line-height:1;cursor:pointer}
.ceqnav__step:disabled{opacity:.35;cursor:default}
.ceqnav__now{flex:1;min-width:0;display:flex;align-items:center;gap:.6rem;padding:.45rem .8rem;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer;text-align:left;font:inherit}
.ceqnav__count{flex:none;color:var(--green);font-weight:700;font-size:.85rem}
.ceqnav__title{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.ceqnav__more{flex:none;color:var(--muted);font-size:.78rem;letter-spacing:.06em}
.ceqnav__step:hover,.ceqnav__now:hover{border-color:var(--cyan)}
.ceqnav button:focus-visible,.ceqnav input:focus-visible,.ceqnav a:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
.ceqnav__track{height:3px;background:var(--line)}
.ceqnav__fill{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--cyan),var(--green))}
.ceqnav__panel{max-width:1120px;margin:0 auto;padding:.9rem 16px 1rem;max-height:min(70vh,640px);overflow:auto;overscroll-behavior:contain}
.ceqnav__find{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:0 0 .6rem}
.ceqnav__find label{flex-basis:100%;font-weight:700}
.ceqnav__find input{flex:1 1 8rem;min-width:0;max-width:16rem;padding:.55rem .75rem;border-radius:10px;border:1px solid var(--line);background:var(--bg-2);color:var(--ink);font:inherit}
.ceqnav__find .button{padding:.55rem 1.1rem;min-height:0}
.ceqnav__msg{flex-basis:100%;margin:0;color:var(--muted);font-size:.9rem;min-height:1.2em}
.ceqnav__read{margin:0 0 .4rem;color:var(--muted);font-size:.8rem;letter-spacing:.06em}
.ceqnav__list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));gap:.3rem .8rem}
.ceqnav__list a{display:flex;gap:.55rem;align-items:baseline;padding:.45rem .55rem;border-radius:10px;color:var(--ink);text-decoration:none;line-height:1.35}
.ceqnav__list a:hover{background:var(--line)}
.ceqnav__list a[aria-current="true"]{background:var(--line);box-shadow:inset 3px 0 0 var(--green)}
.ceqnav__tick{flex:none;width:1.1rem;color:var(--green);font-weight:700}
.ceqnav__n{flex:none;color:var(--muted);font-size:.8rem}
.ceqnav__q{display:block;color:var(--muted);font-size:.82rem}
.ceqnav__top{margin-top:.7rem;border:0;background:none;color:var(--cyan);font:inherit;font-weight:600;cursor:pointer;padding:.3rem 0}
.ceq-flash{animation:ceqflash 1.6s ease-out 1}
@keyframes ceqflash{0%{background:rgba(43,217,74,.28)}100%{background:transparent}}
@media (max-width:767px){.ceqnav__more{display:none}.ceqnav__in{padding:.3rem 10px}.ceqnav__now{padding:.4rem .6rem}.ceqnav__panel{max-height:62vh}}
@media (prefers-reduced-motion:reduce){.ceq-flash{animation:none}}
</style>
<script>
(function(){
  var nav=document.getElementById('ceqnav'); if(!nav) return;
  var secs=[].slice.call(document.querySelectorAll('section[id]')).filter(function(s){return /^s\d+$/.test(s.id)&&s.querySelector('h2');});
  if(secs.length<4) return;
  var hdr=document.querySelector('.site-header'), toc=document.querySelector('nav.toc');
  var $=function(id){return document.getElementById(id);};
  var list=$('ceqnav-list'), panel=$('ceqnav-panel'), open=$('ceqnav-open');
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var total=secs.length, pad=function(n){return (n<10?'0':'')+n;};
  var titles=secs.map(function(s){return s.querySelector('h2').textContent.replace(/\s*\(.*?\)\s*$/,'').trim();});
  // every heading that names a question: its codes, so a sub-question finds the heading that covers it
  var heads=[].slice.call(document.querySelectorAll('h3[id]')).map(function(h){
    var m=h.textContent.match(/A\d+(?:\.\d+)+/g)||[];
    return {el:h, codes:m.map(function(c){return c.slice(1).split('.').map(Number);})};
  }).filter(function(h){return h.codes.length;});
  var cmp=function(a,b){for(var i=0;i<Math.max(a.length,b.length);i++){var x=a[i]||0,y=b[i]||0;if(x!==y)return x-y;}return 0;};
  var links=secs.map(function(s,i){
    var li=document.createElement('li'), a=document.createElement('a'), n=s.querySelectorAll('h3[id^="a"]').length;
    var r=(s.querySelector('h2').textContent.match(/\((A[^)]*)\)/)||[])[1];
    a.href='#'+s.id;
    a.innerHTML='<span class="ceqnav__tick" aria-hidden="true"></span><span class="ceqnav__n mono">'+pad(i+1)+'</span><span>'+titles[i]+
      (n?'<span class="ceqnav__q">'+(r?r+' &middot; ':'')+n+(n===1?' question':' questions')+'</span>':'')+'</span>';
    a.addEventListener('click',function(e){e.preventDefault();go(s);close();});
    li.appendChild(a); list.appendChild(li); return a;
  });
  function top(){var b=hdr?hdr.getBoundingClientRect().bottom:0;return Math.max(0,b);}
  function go(el,flash){
    var y=el.getBoundingClientRect().top+window.pageYOffset-top()-nav.offsetHeight-12;
    window.scrollTo({top:Math.max(0,y),behavior:reduce?'auto':'smooth'});
    if(history.replaceState) history.replaceState(null,'','#'+el.id);
    if(flash){el.classList.remove('ceq-flash');void el.offsetWidth;el.classList.add('ceq-flash');}
    el.setAttribute('tabindex','-1'); setTimeout(function(){try{el.focus({preventScroll:true});}catch(_){}} ,reduce?0:450);
  }
  function close(){panel.hidden=true;open.setAttribute('aria-expanded','false');}
  open.addEventListener('click',function(){var o=panel.hidden;panel.hidden=!o;open.setAttribute('aria-expanded',String(o));if(o){$('ceqnav-msg').textContent='';setTimeout(function(){$('ceqnav-q').focus();},30);}});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!panel.hidden){close();open.focus();}});
  document.addEventListener('click',function(e){if(!panel.hidden&&!nav.contains(e.target))close();});
  $('ceqnav-prev').addEventListener('click',function(){if(cur>0)go(secs[cur-1]);});
  $('ceqnav-next').addEventListener('click',function(){if(cur<total-1)go(secs[cur+1]);});
  $('ceqnav-top').addEventListener('click',function(){close();window.scrollTo({top:0,behavior:reduce?'auto':'smooth'});});
  $('ceqnav-find').addEventListener('submit',function(e){
    e.preventDefault(); var msg=$('ceqnav-msg'), v=$('ceqnav-q').value.trim().toUpperCase().replace(/[\s,-]+/g,'.').replace(/^A?\.?/,'');
    if(!/^\d+(\.\d+)*$/.test(v)){msg.textContent='Type a question number, such as A7.17.';return;}
    var t=v.split('.').map(Number), best=null;
    heads.forEach(function(h){var c=h.codes[0]; if(c[0]===t[0]&&cmp(c,t)<=0&&(!best||cmp(c,best.codes[0])>0))best=h;
      h.codes.forEach(function(k){if(cmp(k,t)===0)best=h;});});
    if(!best){msg.textContent='There is no question A'+v+'. The sections run from A1 to A8.';return;}
    msg.textContent=''; close(); go(best.el,true);
  });
  var cur=-1, ticking=false;
  function update(){
    ticking=false;
    var t=top(); nav.style.top=t+'px';
    var show=toc?toc.getBoundingClientRect().bottom<t:window.pageYOffset>600;
    var last=secs[total-1].getBoundingClientRect();
    if(last.bottom<t+40) show=false;
    if(nav.hidden===show){nav.hidden=!show; if(!show)close();}
    var line=t+nav.offsetHeight+40, c=0;
    for(var i=0;i<total;i++){if(secs[i].getBoundingClientRect().top<=line)c=i;}
    // how far the reading line (just under the bar) has travelled from the first section's top to the last one's end
    var p=Math.min(1,Math.max(0,(line-secs[0].getBoundingClientRect().top)/(last.bottom-secs[0].getBoundingClientRect().top)));
    $('ceqnav-fill').style.width=(p*100).toFixed(1)+'%'; $('ceqnav-read').textContent=Math.round(p*100)+'% read';
    if(c!==cur){
      cur=c; $('ceqnav-count').textContent=pad(c+1)+'/'+pad(total); $('ceqnav-title').textContent=titles[c];
      links.forEach(function(a,i){a.setAttribute('aria-current',i===c?'true':'false');a.firstChild.textContent=i<c?'✓':'';});
      $('ceqnav-prev').disabled=c===0; $('ceqnav-next').disabled=c===total-1;
    }
  }
  function onScroll(){if(!ticking){ticking=true;requestAnimationFrame(update);}}
  window.addEventListener('scroll',onScroll,{passive:true}); window.addEventListener('resize',onScroll);
  update();
})();
</script>
'''


def insert_nav(slug, html):
    if slug != 'cyber-essentials-questions' or 'id="ceqnav"' in html:
        return html
    i = html.rfind('</body>')
    return html[:i] + NAV_HTML + html[i:]


def register(bp):
    bp.PAGE_FILTERS.append(insert_box)
    bp.PAGE_FILTERS.append(insert_nav)
