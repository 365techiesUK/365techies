# -*- coding: utf-8 -*-
"""SEO wave 5 (1 Aug 2026): the office file-sharing cluster.

Five pages answering five genuinely different questions that all look alike in a
keyword tool. They were written to strict, separate lanes precisely because of
that: the credentials PROMPT, the no-server ARCHITECTURE decision, WRITE
permissions, the MIXED Windows 10/11 office, and error 0x80004005 as the triage
hub. Written five-at-once would have produced five rewrites of each other and
cannibalised the lot - the same trap flagged for the printer-wifi cluster.

Process: one writer per page, then a hostile fact-checker per page told to default
to suspicion and hunt invented menu paths, setting names and version claims, then a
revise pass applying every MUST-FIX. Fixes applied per page: 5, 6, 5, 5, 3.

Editorial guards that must not be undone:
  - SMB1, insecure guest logons and disabling SMB signing appear ONLY as advice the
    reader will meet online and should refuse. They are never given as a fix. If a
    future edit turns those into instructions, it has broken the page.
  - No prices anywhere, and no suggestion of a shop or premises - collection only.
  - Where a claim could not be verified it was made vaguer rather than more
    specific. Vaguer-but-true beats specific-and-wrong.

Rendered by build_extra.build_new_page(), alongside SEO_WAVE_PAGES and
SEO_WAVE4_PAGES. Separate module per wave: appending to a shared list is what
caused the `},,` trailing-comma bug in wave 2.
"""

SEO_WAVE5_PAGES = [{'slug': 'windows-11-network-credentials-shared-folder',
  'title': 'Windows 11 Keeps Asking for Network Credentials',
  'metaDesc': 'Windows 11 asking for network credentials every time you open a shared folder? Here '
              'is why the prompt returns and how to save the login so it sticks.',
  'ogTitle': 'Why Windows 11 Keeps Asking for Network Credentials',
  'crumbName': 'Network Credentials Prompt',
  'eyebrow': '// OFFICE FILE SHARING',
  'h1': 'Windows 11 keeps asking for network credentials to access a shared folder',
  'lede': 'You click the shared folder, the same grey box appears, you type the same password, and '
          'tomorrow morning it asks again. It is one of the most common jobs we get called about '
          'in small Dorset offices, and it is almost never a fault with the network. It is Windows '
          'failing to work out who you are on the other computer, or failing to hold on to the '
          'answer once you have given it. Here is what the box is really asking, what to type in '
          'it, and how to make it stop coming back without weakening your office network.',
  'ctaHead': 'Still getting the credentials box?',
  'ctaSub': 'We fix office file sharing for businesses across Bournemouth, Poole and Dorset, '
            'usually remotely without anyone leaving their desk. Call 01202 775566.',
  'serviceName': 'Office File Sharing Support',
  'sections': [{'eyebrow': '/01 &mdash; WHY IT ASKS',
                'h2': 'What the Enter network credentials box is actually asking for',
                'html': '<p>The box marked <strong>Enter network credentials</strong> is not an '
                        'error message. It is Windows telling you, fairly politely, that it does '
                        'not know who you are on the other computer.</p><p>When you open a shared '
                        'folder, your PC connects to the machine hosting it and has to prove you '
                        'are allowed in. It offers the details you are already signed in with '
                        '&mdash; your username and password on your own computer. If the hosting '
                        'machine has an account with exactly the same username <em>and</em> the '
                        'same password, you are let straight through and no prompt ever appears. '
                        'If it does not, there is nothing sensible to fall back on, so Windows '
                        'stops and asks you.</p><p>Older versions of Windows would quietly drop to '
                        'a guest connection at that point, which is why a folder that opened '
                        'without any fuss on an old office PC now demands a login. Current Windows '
                        'will not do that by default, because guest access means anyone who can '
                        'reach the network can read the files.</p><p>Two useful things follow. '
                        'First, this is a question about <em>accounts</em>, not about cables, WiFi '
                        'or the folder itself &mdash; if the machine were genuinely unreachable '
                        'you would get a very different message. Second, typing the right details '
                        'once should be the end of it. If you are typing them every morning, '
                        'either what you are typing is not quite right, or Windows is not keeping '
                        'it. The rest of this page deals with both.</p>'},
               {'eyebrow': '/02 &mdash; THE USERNAME BOX',
                'h2': 'The username format that trips almost everyone up',
                'html': '<p>Most repeat prompts come down to the username box. Windows accepts '
                        'whatever you type, sends it, gets refused, and puts the box back in front '
                        'of you. The message you get back is usually no more helpful than '
                        '&lsquo;the user name or password is incorrect&rsquo;, which does not tell '
                        'you that the username was in the wrong format rather than simply '
                        'wrong.</p><p>A bare name like <code>sarah</code> is ambiguous. Windows '
                        'may send it qualified with your own computer&rsquo;s name, which the '
                        'machine at the other end has no way to authenticate, so it is refused. '
                        'Naming the machine explicitly removes the guesswork. In a small office '
                        'with no server, the account you need exists only on the machine that owns '
                        'the share, so that is the one to name. The format is the computer name, a '
                        'backslash, then the username on that computer &mdash; for example '
                        '<code>OFFICE-PC\\sarah</code>.</p><p>Getting that name exactly right '
                        'matters more than it sounds. The name on the sign-in screen is a display '
                        'name, and the folder under <code>C:\\Users</code> is often a shortened '
                        'version of it, so neither is reliable evidence. On the computer hosting '
                        'the share, sign in as the account you intend to use over the network, '
                        'open Command Prompt from the Start menu and type <code>whoami</code>. It '
                        'prints the computer name and the local account name in precisely the form '
                        'the credentials box wants &mdash; but only for whoever is signed in at '
                        'that moment, so on a machine signed in as someone else it hands you the '
                        'wrong account. If the computer name is all you need, '
                        '<code>hostname</code> prints that on its own.</p><p>There is one big '
                        'exception. If the hosting computer is signed in with a Microsoft account '
                        'rather than a local account, the name it expects is normally the '
                        'Microsoft account email address with that account&rsquo;s password, and '
                        'some setups want it written as <code>MicrosoftAccount\\</code> followed '
                        'by the email. <code>whoami</code> will not show you that email either; it '
                        'prints the shortened local profile name instead. That mismatch catches '
                        'out a great many people, and it is the main reason we suggest keeping a '
                        'plain local account on whichever machine holds the shared files. One last '
                        'detail: an account with no password at all cannot normally be used over '
                        'the network, because by default Windows only lets a blank-password '
                        'account sign in at the keyboard, never over the network.</p>'},
               {'eyebrow': '/03 &mdash; CREDENTIAL MANAGER',
                'h2': 'Saving the login properly so Windows stops asking',
                'html': '<p>The prompt has a tick box marked <strong>Remember my '
                        'credentials</strong>. Leave it unticked and the details only survive '
                        'until you sign out or restart, which is why a folder that behaved all '
                        'Tuesday afternoon asks again on Wednesday morning.</p><p>Ticking it '
                        'writes an entry into Credential Manager, the small vault Windows keeps '
                        'for each user profile. You can also add the entry yourself before you go '
                        'anywhere near the folder, which is often cleaner: open Start, type '
                        '<code>Credential Manager</code>, choose <strong>Windows '
                        'Credentials</strong>, then <strong>Add a Windows credential</strong>. '
                        'Fill in the network address (the name of the computer holding the share), '
                        'the username in the <code>PCNAME\\user</code> form covered above, and the '
                        'password.</p><p>The part people miss is that the entry is matched against '
                        'the address you connect with. A credential saved for '
                        '<code>OFFICE-PC</code> is not used when you type an address like '
                        '<code>\\\\192.168.1.20</code> into File Explorer, and the other way '
                        'round, because as far as Windows is concerned those are two different '
                        'places. If you sometimes use a mapped drive and sometimes browse by name, '
                        'either save an entry for each form you genuinely use or, better, settle '
                        'on one and use it everywhere.</p><p>Two more things worth knowing. The '
                        'vault belongs to your Windows profile, so if two people share a PC and '
                        'sign in separately, each needs their own saved entry. And if you want to '
                        'see what is already stored, <code>cmdkey /list</code> in Command Prompt '
                        'shows the lot in one go, which is far quicker than scrolling through '
                        'Control Panel.</p>'},
               {'eyebrow': '/04 &mdash; WHEN IT GOES STALE',
                'h2': 'Why a saved credential that worked for months suddenly stops',
                'html': '<p>A saved credential is a copy of a password taken at one moment in '
                        'time. Nothing keeps it in step with the machine at the other end, so it '
                        'fails quietly and the prompt returns as if nothing had ever been saved. '
                        'These are the causes we see most often:</p><ul><li><strong>The password '
                        'changed on the hosting computer</strong> and the saved copy did not. '
                        'Windows keeps offering the old one, so you are prompted every time, and '
                        'on a machine with lockout settings all those wrong attempts can lock the '
                        'account out completely.</li><li><strong>Someone changed their '
                        'PIN</strong> and assumed that changed the password. It does not. A PIN '
                        'only unlocks that one device; network sign-in still uses the account '
                        'password.</li><li><strong>A Microsoft account password was '
                        'changed</strong> online, on a phone or another PC, which instantly makes '
                        'every saved copy elsewhere wrong.</li><li><strong>The host was renamed, '
                        'or its address changed</strong> because the router handed out a different '
                        'one, so the stored entry no longer matches what you are connecting '
                        'to.</li><li><strong>The account was deleted and recreated</strong> with '
                        'the same name. Windows treats that as an entirely different account '
                        'underneath, so permissions granted to the old one no longer '
                        'apply.</li></ul><p>The repair is the same in every case and is worth '
                        'doing thoroughly rather than tidily. Delete <em>every</em> stored entry '
                        'mentioning that machine, including near-duplicates saved against the IP '
                        'address and anything left over from an old mapped drive. Restart, open '
                        'the share once, enter the correct details and tick the box. One clean '
                        'entry beats three competing ones, and competing entries are the usual '
                        'reason a saved credential seems to be ignored.</p>'},
               {'eyebrow': '/05 &mdash; THE PERMANENT FIX',
                'h2': 'Matching accounts, and the shortcuts that are not worth taking',
                'html': '<p>If you would rather never see the box again, the tidiest arrangement '
                        'in a small office without a server is to make the accounts match. Create '
                        'an account on the computer holding the shared folder using the same '
                        'username and the same password as the person who needs access, give that '
                        'account permission on the folder, and Windows passes the details through '
                        'on its own. No prompt, nothing saved, nothing to go stale &mdash; until '
                        'someone changes a password, and then you change it in both '
                        'places.</p><p>Where several people need the same folder, one dedicated '
                        'account on the host machine, something like <code>officefiles</code> with '
                        'a proper password, is easier to look after. Save it once in Credential '
                        'Manager on each PC and you are finished. Keep it a local account rather '
                        'than a Microsoft one, simply because local accounts behave predictably '
                        'over a network.</p><p>What we would ask you not to do is take the advice '
                        'that appears first in most forums: switch off password protected sharing, '
                        'allow insecure guest logons, or turn SMB1 back on. Those do make the '
                        'prompt vanish, but only by removing the check rather than answering it. '
                        'On a business network that means anything connected &mdash; a '
                        'visitor&rsquo;s laptop, a phone on the office WiFi, an infected device '
                        '&mdash; can reach files that should be private, and SMB1 in particular is '
                        'the route several well-known ransomware outbreaks travelled. The prompt '
                        'is doing its job; it just needs the right answer.</p><p>There is also a '
                        'point where saving credentials machine by machine stops being sensible. '
                        'Once more than a handful of PCs need the same files, shared storage with '
                        'its own user list, or moving the files into Microsoft 365, removes the '
                        'problem instead of managing it.</p>'}],
  'faqs': [{'q': 'What username should I type in the Windows 11 network credentials box?',
            'a': 'Not just the person name. A bare name is ambiguous: Windows may send it '
                 'qualified with your own computer name, which the machine at the other end cannot '
                 'authenticate, so it is refused. Name the machine holding the folder too, in the '
                 'form PCNAME\\username. On that computer, sign in as the account you intend to '
                 'use over the network, open Command Prompt and type whoami. It prints both names '
                 'in the right format, but only for whoever is signed in at the time; hostname '
                 'gives the computer name alone. With a Microsoft account, the email address is '
                 'usually what it wants.'},
           {'q': 'Why does Windows 11 keep asking even after I tick Remember my credentials?',
            'a': 'Usually because there are competing entries. Windows matches a saved login '
                 'against the exact address you connect with, so an entry saved for the computer '
                 'name is ignored when you connect by IP address, and an old mapped drive can '
                 'leave a third entry behind. Open Credential Manager, remove every entry '
                 'mentioning that machine, restart, then connect once and save it again. A single '
                 'clean entry is far more reliable than several near-duplicates.'},
           {'q': 'Where do I find Credential Manager in Windows 11?',
            'a': 'Open the Start menu and type Credential Manager, then choose Windows '
                 'Credentials. From there you can see what is stored, remove entries that are out '
                 'of date, and use Add a Windows credential to create one yourself. Enter the '
                 'network address as the computer name of the machine holding the share, the '
                 'username in the PCNAME\\user form, and the password. To list everything quickly '
                 'instead, type cmdkey /list in Command Prompt.'},
           {'q': 'Should I turn off password protected sharing to stop the prompt?',
            'a': 'We would not recommend it on a business network. It stops the prompt by removing '
                 'the check rather than answering it, which means any device that can reach your '
                 'network can reach those files, including a visitor laptop or a phone on the '
                 'office WiFi. The same applies to advice about allowing insecure guest logons or '
                 'switching SMB1 back on, which is worse still given its history with ransomware. '
                 'Matching the accounts up properly is a small job on a couple of machines and '
                 'leaves the files protected.'},
           {'q': 'Why has the saved network password suddenly stopped working?',
            'a': 'Something changed at the other end. The most common cause is a password change '
                 'on the machine hosting the folder, or a Microsoft account password changed on a '
                 'phone or another PC. Changing a Windows PIN is a common red herring, because the '
                 'PIN only unlocks that device while network access still uses the account '
                 'password. A renamed computer, a new address from the router, or an account '
                 'deleted and recreated will all do it too.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/share-files-small-office-without-server/">Sharing files without a '
                    'server</a> &middot; <a '
                    'href="/shared-folder-read-only-cant-save-windows-11/">Shared folder is '
                    'read-only</a> &middot; <a '
                    'href="/windows-11-cant-access-windows-10-shared-folder/">Windows 11 cannot '
                    'open a Windows 10 share</a> &middot; <a '
                    'href="/fix-shared-folder-error-0x80004005/">Error 0x80004005 explained</a> '
                    '&middot; <a href="/mapped-network-drive-keeps-disconnecting/">Mapped drive '
                    'keeps disconnecting</a></p>'},
 {'slug': 'share-files-small-office-without-server',
  'title': 'Small Office File Sharing Without a Server | 365 Techies',
  'metaDesc': 'An honest comparison of the three ways a small office can share files without a '
              'server: a shared folder, a NAS box, or cloud storage.',
  'ogTitle': 'Small Office File Sharing Without a Server: Folder, NAS or Cloud',
  'crumbName': 'Office File Sharing',
  'eyebrow': '// OFFICE FILE SHARING',
  'h1': 'How to share files between computers in a small office without a server',
  'lede': 'You do not need a server to share files properly. What you do need is a decision, made '
          'on purpose, about where your files are going to live. There are three honest options '
          'for an office with no server, and each of them is right for somebody. This page sets '
          'out what each one really costs you in money, in reliability and in hassle, so you can '
          'choose before the choice gets made for you by accident.',
  'ctaHead': 'Not sure which of the three fits your office?',
  'ctaSub': 'Tell us how many of you there are, what sort of files you work on and who works away '
            'from the office. We will tell you honestly which one we would use, set it up properly '
            'and move your files across. Call 01202 775566.',
  'serviceName': 'Office File Sharing Setup',
  'sections': [{'eyebrow': '/01 &mdash; THE DEFAULT DRIFT',
                'h2': 'What almost every small office does first',
                'html': '<p>Very few small businesses sit down and choose a file sharing system. '
                        'What normally happens is this: someone needs a document that lives on the '
                        'accounts PC, so a folder gets shared. Then a second folder. Then that one '
                        'machine quietly becomes where everything important lives &mdash; quotes, '
                        'invoices, job photos, the customer list &mdash; and nobody ever actually '
                        'decided that.</p><p>It works, right up until it doesn&rsquo;t. The person '
                        'whose PC it is goes on holiday and shuts it down. It drops off to sleep '
                        'at half five and nobody can reach it. Somebody new joins and can see '
                        'everything, including the payroll folder, because there was never a '
                        'sensible way to give them only part of it. Eventually the machine is '
                        'replaced and the whole office filing cabinet has to move with it, in a '
                        'hurry, with a folder or two missed.</p><p>There is a security tail to '
                        'this as well. When a home-grown share starts misbehaving, a lot of the '
                        'advice you will find online tells you to switch old, insecure options '
                        'back on to make the computers talk to each other again. That advice often '
                        'works, and it quietly leaves your office easier to attack. If you are '
                        'choosing now, you can avoid ever being in that position.</p>'},
               {'eyebrow': '/02 &mdash; OPTION A',
                'h2': 'Sharing a folder from one of your PCs',
                'html': '<p>This is the cheapest option, because you already own everything. One '
                        'computer holds the files and the others reach it across the office '
                        'network. For two or three people sitting in the same room, working on '
                        'ordinary documents, it can be a perfectly reasonable answer &mdash; as '
                        'long as you go in with your eyes open about what you are agreeing '
                        'to.</p><ul><li><strong>Cost shape:</strong> nothing up front. The cost '
                        'turns up later, as somebody&rsquo;s time, when it breaks or has to '
                        'move.</li><li><strong>Availability:</strong> that PC has to be powered on '
                        'and awake. Nobody needs to be signed in to it, but sleep settings, '
                        'someone shutting it down on their way out, and a machine left switched '
                        'off after a restart all take the files away from everyone '
                        'else.</li><li><strong>Who sees what:</strong> possible, but fiddly. In '
                        'practice most offices end up with one big share that everybody can open, '
                        'which is fine until it is not.</li><li><strong>Backup:</strong> none by '
                        'default. Every file the business owns is sitting on one drive, in one '
                        'box, under one desk.</li><li><strong>Working from home:</strong> '
                        'effectively no, not in any way we would be happy to set '
                        'up.</li><li><strong>Growth:</strong> Windows Home and Pro allow 20 '
                        'file-sharing connections at once, and it is a licensing ceiling rather '
                        'than a performance one, so it arrives as a wall rather than a slowdown. '
                        'The nearer limit in practice is that the machine is somebody&rsquo;s '
                        'workstation first, so their work and everyone else&rsquo;s file access '
                        'compete for the same computer.</li></ul><p>The one that catches people '
                        'out is replacement. The day that PC is retired, everything the business '
                        'has ever produced has to be moved across, usually on a busy morning, with '
                        'everyone waiting on you.</p>'},
               {'eyebrow': '/03 &mdash; OPTION B',
                'h2': 'A NAS box on the office network',
                'html': '<p>A NAS is a small, always-on box with hard drives in it that plugs into '
                        'your router or switch and does exactly one job: hold files for everybody. '
                        'Nobody logs into it to check their email, and nobody switches it off at '
                        'half five on their way out. The boxes sold for this are built for your '
                        'situation &mdash; a few members of staff, one office, no IT department in '
                        'the building.</p><ul><li><strong>Cost shape:</strong> a one-off purchase '
                        'for the box and its drives, then very little until it is due for '
                        'replacement several years later. It does not get more expensive when you '
                        'hire.</li><li><strong>Availability:</strong> on all the time, using very '
                        'little electricity, completely independent of anybody&rsquo;s '
                        'desktop.</li><li><strong>Who sees what:</strong> proper accounts and '
                        'groups. Accounts folder for the directors, jobs folder for everyone, and '
                        'it stays that way when someone new '
                        'starts.</li><li><strong>Speed:</strong> as fast as your office network, '
                        'which for very large files is a different world from broadband. This is '
                        'where a NAS beats cloud &mdash; a shared PC is on the same network and is '
                        'no slower.</li><li><strong>Growth:</strong> comfortable well past the '
                        'point where a shared PC gives up.</li></ul><p>Two honest warnings. A NAS '
                        'with two drives set up as a mirror protects you from one drive failing '
                        '&mdash; check it is a mirror, because the same box can be set up to '
                        'combine the two drives for capacity instead, which leaves you worse off '
                        'than one drive. Either way it does nothing about fire, theft, ransomware '
                        'or somebody deleting the wrong folder, so it still needs a backup that '
                        'leaves the building. And reaching it from home means opening a door into '
                        'your office network, which is worth doing carefully rather than by '
                        'following the first guide that comes up.</p>'},
               {'eyebrow': '/04 &mdash; OPTION C',
                'h2': 'Cloud storage: OneDrive, SharePoint or Google Drive',
                'html': '<p>Here the files live in a data centre and each PC keeps itself in step '
                        'with them. The desktop apps make it look like an ordinary folder or drive '
                        'in File Explorer, so staff carry on working the way they already do. If '
                        'you are paying for Microsoft 365 or Google Workspace, you are very '
                        'probably paying for this already and not using '
                        'it.</p><ul><li><strong>Cost shape:</strong> a monthly amount per person '
                        'that goes up every time you hire and never stops. Nothing to buy, nothing '
                        'to replace, nothing to insure.</li><li><strong>Availability:</strong> not '
                        'tied to any machine in your building. If the office is shut, or the power '
                        'is off, or someone is sitting in a customer&rsquo;s car park, the files '
                        'are still there.</li><li><strong>Who sees what:</strong> good control per '
                        'folder, plus version history, so a document somebody has overwritten can '
                        'usually be rolled back.</li><li><strong>Working from home:</strong> this '
                        'is the option that was designed for it. The others are being talked into '
                        'it.</li><li><strong>Growth:</strong> adding a person is an admin job that '
                        'takes minutes, not a hardware job.</li></ul><p>The trap worth knowing '
                        'about is that personal storage and company storage are not the same '
                        'thing. Files in a member of staff&rsquo;s own personal Microsoft or '
                        'Google account belong to them, and you have no route to them at all once '
                        'they leave. Files in their work account&rsquo;s OneDrive or Drive do '
                        'belong to the business, but only an administrator can get at them, and '
                        'only for a limited window before they are cleared. Files in a shared team '
                        'library are simply still there for whoever is left. Getting that right at '
                        'the start saves a genuinely awkward conversation later. Cloud also leans '
                        'on your broadband, so if you move very large files all day it is worth '
                        'checking what your line can really do.</p>'},
               {'eyebrow': '/05 &mdash; CHOOSING',
                'h2': 'Which one is right for your office',
                'html': '<p>There is no universal answer, but there are patterns we see over and '
                        'over in Dorset offices.</p><ul><li><strong>Two or three of you, one room, '
                        'ordinary documents, nobody works from home:</strong> a shared folder is '
                        'defensible &mdash; provided you add a real backup and everybody knows '
                        'which machine it depends on.</li><li><strong>Anybody works from home, '
                        'from a van, or from a customer&rsquo;s site:</strong> start with cloud. '
                        'Every other option spends its life fighting you.</li><li><strong>Large '
                        'files &mdash; video, CAD, surveys, scanned archives &mdash; or broadband '
                        'you would not describe as good:</strong> a NAS for the heavy work, with '
                        'cloud for the everyday documents.</li><li><strong>Growing, hiring, or '
                        'being asked about data protection by your own customers:</strong> cloud '
                        'for documents, with a NAS or a separate cloud backup sitting behind '
                        'it.</li></ul><p>Whichever way you lean, ask four questions before anybody '
                        'buys anything. Where does the second copy live, and has anyone ever '
                        'tested getting a file back from it? What happens the day the person who '
                        'set it all up is not available? What happens when a member of staff '
                        'leaves? And could you carry on working if the office was shut for a week? '
                        'A setup that answers all four is a good setup, whichever of the three it '
                        'is built on.</p>'}],
  'faqs': [{'q': 'Do I really need a server for a small office?',
            'a': 'Almost certainly not. Servers made sense when there was no realistic '
                 'alternative, but a small office today has two better-value routes: a NAS box for '
                 'files that stay in the building, or cloud storage for files that need to follow '
                 'people around. Both are cheaper to get started with and have far less to go '
                 'wrong. The cost shapes differ, though: a NAS is a one-off purchase, cloud a '
                 'monthly amount per person for as long as you employ them. The usual exception is '
                 'a piece of trade or accounts software that specifically demands one, which is '
                 'worth checking before you decide anything else.'},
           {'q': 'Is it OK to just share a folder from one of our computers?',
            'a': 'For two or three people in one room it can be, as long as you accept the '
                 'conditions that come with it. That PC has to stay powered on and awake, '
                 'everybody usually ends up able to open everything, nothing is backed up unless '
                 'you arrange it separately, and replacing the machine means moving the whole '
                 'office filing cabinet in an afternoon. If any of those already sound like a '
                 'problem, they will be a considerably bigger one in a year&rsquo;s time.'},
           {'q': 'NAS or cloud &mdash; which is better for a small business?',
            'a': 'It depends on where your people are and how large your files are. If staff work '
                 'from home or out on site, cloud wins, because nothing is tied to your building. '
                 'If you shift big video, drawings or scans all day, or your broadband is poor, a '
                 'NAS wins, because everything moves at network speed instead of broadband speed. '
                 'Plenty of small offices sensibly run both: cloud for documents, a NAS holding a '
                 'local copy and taking the backups.'},
           {'q': 'If our files are in the cloud, are they backed up?',
            'a': 'Not in the way most people assume. Cloud storage keeps your files available and '
                 'usually keeps version history, so a document someone has overwritten can often '
                 'be recovered. What it does not reliably do is protect you from a deletion nobody '
                 'notices for months, or from an account being taken over. Treat the cloud as '
                 'where your files live, and arrange a separate backup of it. The same logic '
                 'applies to a NAS: two mirrored drives protect against a drive failing, not '
                 'against fire, theft or ransomware.'},
           {'q': 'What happens to our files when a member of staff leaves?',
            'a': 'That depends entirely on where the files were kept. Anything in a shared team or '
                 'company library stays with the business, and you simply remove that '
                 'person&rsquo;s access. Files in their work account&rsquo;s own OneDrive or Drive '
                 'belong to the business too, but only an administrator can reach them, and only '
                 'for a limited window before they are cleared. Anything in their own personal '
                 'Microsoft or Google account belongs to them, and you have no route to it at all. '
                 'A folder shared from their desk PC has its own version of the problem.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/windows-11-network-credentials-shared-folder/">Windows 11 asking for '
                    'network credentials</a> &middot; <a '
                    'href="/shared-folder-read-only-cant-save-windows-11/">Shared folder is '
                    'read-only</a> &middot; <a '
                    'href="/windows-11-cant-access-windows-10-shared-folder/">Windows 11 cannot '
                    'open a Windows 10 share</a> &middot; <a '
                    'href="/fix-shared-folder-error-0x80004005/">Error 0x80004005 explained</a> '
                    '&middot; <a href="/server-network-support/">Server and network support</a> '
                    '&middot; <a href="/cloud-backup/">Cloud backup</a></p>'},
 {'slug': 'shared-folder-read-only-cant-save-windows-11',
  'title': 'Shared Folder Read-Only in Windows 11 | 365 Techies',
  'metaDesc': 'Staff can open files on the network share but every save fails. Here is why a '
              'Windows 11 shared folder goes read-only, and how to fix it properly.',
  'ogTitle': 'Shared Folder Read-Only in Windows 11: Why Every Save Fails',
  'crumbName': 'Shared Folder Read-Only',
  'eyebrow': '// OFFICE FILE SHARING',
  'h1': 'Shared folder read-only in Windows 11: staff can open files but cannot save',
  'lede': 'Everyone can see the folder. Everyone can open the files. But the moment anyone presses '
          'Save, Windows says the file is read-only or that they do not have permission to save in '
          'this location. Nine times out of ten this is not a broken network. It is a mismatch '
          'between the two separate permission layers Windows puts on every share, and once you '
          "know where to look it is usually a few minutes' work.",
  'ctaHead': 'Still read-only after all that?',
  'ctaSub': 'We can look at the share with you remotely, or collect the machine free of charge if '
            'it needs hands on it. Call 01202 775566.',
  'serviceName': 'Network File Sharing Support',
  'sections': [{'eyebrow': '/01 &mdash; TWO PERMISSION LAYERS',
                'h2': 'Why a folder can look perfectly shared and still refuse to save',
                'html': '<p>A shared folder in Windows has <strong>two separate permission '
                        'layers</strong>, and almost every read-only share has them set to '
                        'different things.</p>\n'
                        '<p>The first is the <strong>share permission</strong>. It lives on the '
                        'share itself and only applies to people arriving over the network. It has '
                        'three settings: Read, Change and Full Control. Shared through the '
                        'Advanced Sharing box, the starting point is usually Read for Everyone '
                        '&mdash; exactly the setting that lets staff open a file and then refuses '
                        'the save.</p>\n'
                        '<p>The second is the <strong>file-system permission</strong> on the '
                        'folder and the files inside it, found on the Security tab. This layer '
                        'also applies to someone sitting at the machine itself, and it is far more '
                        'detailed: Read, Write, Modify, Full control and so on.</p>\n'
                        '<p>Windows decides what you may do by comparing the two and applying '
                        '<strong>whichever is more restrictive</strong>. Full control on the '
                        'Security tab counts for nothing if the share above it says Read. That is '
                        'the whole trick, and it explains the maddening symptom: the folder looks '
                        'perfectly shared, the Security tab looks generous, and the save still '
                        'fails.</p>\n'
                        '<p>It also gives you a useful clue. If the file saves fine for someone '
                        'sitting at the computer hosting it, but for nobody else, look at the '
                        'share layer first &mdash; it is the only layer a local user never goes '
                        'through.</p>'},
               {'eyebrow': '/02 &mdash; CHECK BOTH LAYERS',
                'h2': 'How to check the share layer and the security layer',
                'html': '<p>Both layers are checked on the computer that <em>hosts</em> the folder '
                        '&mdash; the server, or whichever PC the drive is in &mdash; not on the '
                        'machine that cannot save, and you will need an administrator sign-in '
                        'there.</p>\n'
                        '<p>Right-click the shared folder, choose <code>Properties</code>, then '
                        'open the <strong>Sharing</strong> tab. Click <code>Advanced '
                        'Sharing</code> and then <code>Permissions</code>. This is the share '
                        'layer. The person or group who needs to save requires '
                        '<strong>Change</strong>, not just Read.</p>\n'
                        '<p>Now move to the <strong>Security</strong> tab in the same window. This '
                        'is the file-system layer, and the same person or group needs '
                        '<strong>Modify</strong> to create, edit and save. Read &amp; execute '
                        'alone is enough to open a document and nothing more.</p>\n'
                        '<p>Three things catch people out. A <strong>Deny</strong> entry usually '
                        'beats an Allow, and a Deny set directly on the folder always does &mdash; '
                        'so one old Deny against a group someone happens to be in can block them '
                        'even though every other entry says yes. A subfolder can have inheritance '
                        'switched off, so it quietly keeps old permissions while the parent gets '
                        'fixed. And someone newly added to a staff group only picks up the access '
                        'after signing out and back in, because Windows works from the group list '
                        'it collected at sign-in.</p>\n'
                        '<p>One exception: if the folder lives on a NAS box or a drive plugged '
                        'into the router, none of the above applies &mdash; those devices keep '
                        'their own users and their own read or read-write setting in a web admin '
                        'page, and that is where the change must be made.</p>'},
               {'eyebrow': '/03 &mdash; THE FILE IS ALREADY OPEN',
                'h2': 'When it is not permissions at all: locks and stale lock files',
                'html': '<p>Sometimes the permissions are perfectly fine. The file is simply '
                        '<strong>already open somewhere else</strong>, and Windows will not let '
                        'two people write to the same document at once.</p>\n'
                        '<p>Word and Excel handle that by offering you the file read-only, usually '
                        'with a message naming whoever has it. Treat the name as a hint rather '
                        'than a fact &mdash; Office reads it out of a small hidden file it left '
                        'beside the document, and that file is often a leftover from a machine '
                        'switched off mid-edit rather than a colleague sitting at their desk.</p>\n'
                        '<p>When an Office file is opened, a small hidden companion file appears '
                        'alongside it with a name beginning <code>~$</code>. It disappears on a '
                        'clean close. If the program crashes, a laptop drops off the Wi-Fi, or '
                        'somebody shuts the lid and goes home, that companion can be left behind '
                        'and the document stays locked for everyone else long after the person has '
                        'gone.</p>\n'
                        '<p>On the host computer you can see what is really happening. Open '
                        '<strong>Computer Management</strong>, then System Tools, then '
                        '<strong>Shared Folders</strong>, then <strong>Open Files</strong>. It '
                        'lists every file currently open across the network and the account '
                        'holding it. A stale lock can be cleared from there &mdash; but do it '
                        'carefully, because closing a file somebody genuinely has open loses '
                        'whatever they had not yet saved.</p>'},
               {'eyebrow': '/04 &mdash; THE FILE ITSELF',
                'h2': 'The read-only tick, Protected View and Office&rsquo;s own locks',
                'html': '<p>If one particular file is read-only while everything else in the same '
                        'folder saves happily, the fault is on the file, not on the share.</p>\n'
                        '<p>The oldest culprit is the <strong>read-only attribute</strong>. '
                        'Right-click the file, choose Properties, and look at the tick box on the '
                        'General tab. Files pick this up when restored from a backup, extracted '
                        'from a zip, or copied off read-only media, and it travels with the file '
                        'wherever it goes. Clear the tick and save again. The same tick on a '
                        '<em>folder</em> behaves differently and tends to reappear on its own '
                        '&mdash; that one is not your problem, so leave it be.</p>\n'
                        '<p>Office then adds locks of its own, and they are easily mistaken for a '
                        'network fault:</p>\n'
                        '<ul>\n'
                        '<li><strong>Protected View</strong> &mdash; a yellow bar across the top '
                        'with an Enable Editing button. Common on anything that arrived by email '
                        'or download, and nothing to do with permissions.</li>\n'
                        '<li><strong>Marked as Final</strong> &mdash; somebody set this '
                        'deliberately; the bar offers Edit Anyway.</li>\n'
                        '<li><strong>Always Open Read-Only</strong>, and Excel&rsquo;s read-only '
                        'recommendation &mdash; both saved inside the file itself, often years ago '
                        'by someone who has since left.</li>\n'
                        '</ul>\n'
                        '<p>Each of these announces itself and gives you an obvious way past. A '
                        'genuine permission problem does not: it lets you type happily for twenty '
                        'minutes and only objects when you press Save.</p>'},
               {'eyebrow': '/05 &mdash; RESCUE THE WORK',
                'h2': 'Save a copy now, then fix the cause without wrecking your security',
                'html': '<p>Before anything else, rescue the work in front of you. Do not close '
                        'the document. In Word or Excel use <code>File</code> then <code>Save a '
                        'Copy</code> (or Save As), put it in Documents on the local machine, and '
                        'put the date and your initials in the name. Only then close it. Work that '
                        'exists only on screen is one stray click away from gone.</p>\n'
                        '<p>Treat that copy as a stopgap rather than a fix. Two people keeping '
                        'local copies of the same spreadsheet for a week is how a small business '
                        'ends up with three versions of the price list and no idea which is right. '
                        'Agree who owns the master, and get the share itself sorted the same '
                        'day.</p>\n'
                        '<p>You will also find advice online telling you to enable SMB1, switch on '
                        'insecure guest access, turn off SMB signing, or hand Everyone full '
                        'control on both layers. Please do not. SMB1 is the ancient version of the '
                        'file-sharing protocol behind some of the worst ransomware outbreaks of '
                        'the last decade, and modern Windows no longer installs it. Guest access '
                        'hands the same rights to anyone who can reach the box, with no account '
                        'name attached to anything they do &mdash; and current versions of Windows '
                        'block insecure guest logons by default for exactly that reason. Signing '
                        'is what stops traffic between the PC and the share being tampered with. '
                        'And Everyone with full control means any compromised device on your '
                        'network can encrypt or delete the lot, and nothing in the permissions '
                        'stands between one infected PC and every file you own. Each of these '
                        'makes the save work by making the business less safe.</p>'}],
  'faqs': [{'q': 'Why can I open files on the shared folder but not save them?',
            'a': 'Because Windows applies two different permission layers to a network share and '
                 'gives you whichever is the more restrictive. The share permission (Read, Change '
                 'or Full Control) sits on the share and only applies over the network. The '
                 'file-system permission on the Security tab sits on the folder and its files. If '
                 'the share says Read, you can open anything and save nothing, however generous '
                 'the Security tab looks. Check the share layer first.'},
           {'q': 'What is the difference between share permissions and security permissions in '
                 'Windows 11?',
            'a': 'Share permissions apply only to people connecting over the network and come in '
                 'three levels: Read, Change and Full Control. Security permissions are the '
                 'file-system permissions on the Security tab, they apply to everybody including '
                 'someone sitting at the machine, and they are much more detailed. Windows '
                 'combines the two and enforces the stricter result, which is why a folder can be '
                 'shared correctly and still refuse every save.'},
           {'q': 'How do I find out who has a file open on our network drive?',
            'a': 'On the computer that hosts the shared folder, open Computer Management, then '
                 'System Tools, then Shared Folders, then Open Files. It lists every file '
                 'currently open over the network and the account holding it. If the name looks '
                 'wrong, it is often a stale lock left by a crash or a laptop that dropped off the '
                 'network rather than a person still working. Clearing it is possible, but '
                 'anything they had not saved is lost, so check with them first.'},
           {'q': 'Word says the document is read-only but the folder is not. What should I do?',
            'a': 'That points at the file rather than the share. Check the read-only tick box on '
                 "the file's Properties, General tab, which files often pick up from backups and "
                 'zip archives. Then look for an Office message bar: Protected View, Marked as '
                 'Final and Always Open Read-Only all make a document read-only, and each offers a '
                 'button to carry on editing. If you need the work now, use Save a Copy into your '
                 'own Documents folder and sort the original afterwards.'},
           {'q': 'Is it safe to give Everyone full control to fix a read-only shared folder?',
            'a': 'No. It makes the save work by removing the protection rather than fixing the '
                 'fault. Everyone means every account that can sign in anywhere on your network, '
                 'so anything that gets onto one PC inherits full rights over the whole share, and '
                 'nothing in the share stops it spreading to every file. Grant the specific staff '
                 'group Change on the share and Modify on the Security tab instead. That takes the '
                 'same five minutes, fixes the same problem, and keeps the damage from any one '
                 'compromised account inside what that group can reach.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/windows-11-network-credentials-shared-folder/">Windows 11 asking for '
                    'network credentials</a> &middot; <a '
                    'href="/share-files-small-office-without-server/">Sharing files without a '
                    'server</a> &middot; <a '
                    'href="/windows-11-cant-access-windows-10-shared-folder/">Windows 11 cannot '
                    'open a Windows 10 share</a> &middot; <a '
                    'href="/fix-shared-folder-error-0x80004005/">Error 0x80004005 explained</a> '
                    '&middot; <a '
                    'href="/restrict-staff-access-to-shared-folders-windows-11/">Restricting staff '
                    'access to folders</a> &middot; <a '
                    'href="/who-has-a-file-open-on-shared-drive/">Who has a file open</a></p>'},
 {'slug': 'windows-11-cant-access-windows-10-shared-folder',
  'title': "Windows 11 Can't Open Windows 10 Shared Folder | 365 Techies",
  'metaDesc': 'New Windows 11 PCs often cannot open a shared folder on an older Windows 10 '
              'machine. Here is why it happens in mixed offices, and how to fix it safely.',
  'ogTitle': 'Why your new Windows 11 PC cannot open the Windows 10 shared folder',
  'crumbName': 'Win 11 to Win 10 Share',
  'eyebrow': '// OFFICE FILE SHARING',
  'h1': 'Windows 11 cannot open a shared folder on a Windows 10 PC',
  'lede': 'Your new Windows 11 machine can see the older Windows 10 computer on the network but '
          'will not open its shared folder, while every other PC in the office gets in without '
          'complaint. It is almost never a fault on the old machine. It is what happens when a '
          'stricter version of Windows meets a share that was set up in looser times &mdash; and '
          'it is turning up in offices all over Bournemouth, Poole and Dorset as PCs get replaced '
          'one at a time.',
  'ctaHead': 'Two versions of Windows, one shared folder',
  'ctaSub': 'We sort mixed-age office networks properly &mdash; real accounts and sensible '
            'permissions, not a security setting switched off and forgotten about. Most cases we '
            'can handle remotely; where we need the machine, collection is free across '
            'Bournemouth, Poole and Dorset. Call 01202 775566.',
  'serviceName': 'Office File Sharing Support',
  'sections': [{'eyebrow': '/01 &mdash; WHAT CHANGED',
                'h2': 'Why the new PC is the only one that cannot get in',
                'html': '<p>This is one of the most common calls we get from Dorset offices at the '
                        'moment, and it almost always follows the same pattern. A new Windows 11 '
                        'machine arrives to replace an ageing one, everything else on it works, '
                        'and yet the folder the whole office has shared from an older Windows 10 '
                        'computer for years simply will not open.</p><p>Nothing has gone wrong '
                        'with the share. What has changed is the machine asking for it. Older '
                        'Windows was content to fall back to a very relaxed way of connecting when '
                        'a share did not insist on a proper login &mdash; effectively knocking on '
                        'the door and being waved in without giving a name. Current Windows will '
                        'not do that. If the Windows 10 PC has never been set up to challenge for '
                        'a real username and password, the new machine has nothing valid to offer '
                        'and the connection stops there.</p><p>The second half of the problem is '
                        'who the new PC thinks it is. Most new machines are set up with a '
                        'Microsoft account, so the name it presents is not a name the old computer '
                        'has ever heard of. In a small office with no server, every PC keeps its '
                        'own separate list of users, and a share can only recognise accounts that '
                        'live on the machine hosting it.</p><p>The symptoms are usually one of '
                        'these: the old computer appears under Network but double-clicking it '
                        'throws an error, or a login box appears and rejects details you know are '
                        'correct, or the folder opens from every PC in the office except the '
                        'newest one.</p>'},
               {'eyebrow': '/02 &mdash; THE ADVICE TO SKIP',
                'h2': 'Why we will not switch SMB1 or guest access back on',
                'html': '<p>Search for this error and the top answers are nearly always the same '
                        'three: turn SMB1 back on, switch on insecure guest logons, or relax the '
                        'signing requirement. They are popular because they work instantly. They '
                        'are also the wrong trade.</p><p><strong>SMB1</strong> is the original '
                        'file-sharing protocol, designed in the 1980s and long since replaced. '
                        'Turning it on is not a per-folder change: the tick box in Windows '
                        'Features installs the listening server component alongside the client, '
                        'and it was that server part ransomware used to jump from machine to '
                        'machine across office networks. You reopen that door on every computer '
                        'you enable it on, not only for the folder you were trying to '
                        'reach.</p><p><strong>Insecure guest access</strong> cuts both ways. If '
                        'turning it on makes the folder open, that tells you the share itself is '
                        'already handing files to any device that can reach it &mdash; a '
                        'visitor&rsquo;s laptop, a compromised phone on the office Wi-Fi, '
                        'something plugged into a spare socket in reception &mdash; with no record '
                        'of who did what. And the setting you switch on the new PC tells it to '
                        'connect to any file server that asks for no identity, with no signing or '
                        'encryption, which is exactly what a rogue device on the network needs to '
                        'intercept the traffic or serve up a fake share. Losing that record of who '
                        'opened, changed or deleted what matters a great deal if you ever have to '
                        'explain an incident to a client or an insurer.</p><p>The honest summary '
                        'is that these settings make the message go away by removing the check '
                        'that raised it. If someone has already applied them to get you working, '
                        'it is worth putting the share on a proper footing and turning them back '
                        'off &mdash; an hour of work, not a rebuild.</p>'},
               {'eyebrow': '/03 &mdash; SEE VS OPEN',
                'h2': 'Work out which of the two faults you actually have',
                'html': '<p>Before changing anything, work out which of two quite different faults '
                        'you have, because they need different fixes. The quickest way is to type '
                        'the address by hand rather than browsing to it. Press the Windows key and '
                        'R together, type <code>\\\\PCNAME</code> using the old computer&rsquo;s '
                        'name, and press Enter. Then try the same thing with its IP address, for '
                        'example <code>\\\\192.168.1.20</code>.</p><ul><li><strong>Both give '
                        '&lsquo;network path not found&rsquo;</strong> &mdash; that is a discovery '
                        'or name lookup problem. If the IP address opens the share and the name '
                        'does not, the share itself is healthy and only the name lookup is '
                        'failing.</li><li><strong>A login box appears and refuses you</strong> '
                        '&mdash; that is an accounts and permissions problem, and the next section '
                        'is the one you want.</li></ul><p>Two settings on the new PC are worth '
                        'checking either way. In Settings, under Network &amp; internet, open the '
                        'properties of the connection in use and make sure the network profile is '
                        'Private rather than Public. A newly set up PC, or any PC after a router '
                        'change, often treats the office network as public, which switches file '
                        'sharing off by design. In the advanced sharing settings, network '
                        'discovery and file and printer sharing should be on for the private '
                        'profile.</p><p>That test is deliberately built on typing the address '
                        'rather than on whether the old computer shows up in the Network window. '
                        'Do not judge anything by that list. It has been unreliable for years, and '
                        'plenty of perfectly healthy shares never appear in it.</p>'},
               {'eyebrow': '/04 &mdash; THE PROPER FIX',
                'h2': 'Give the new machine a real account to log in with',
                'html': '<p>The fix that lasts is to give the new machine a real account to log in '
                        'with on the computer that holds the folder. One thing to plan for first: '
                        'if password protected sharing is currently switched off on the Windows 10 '
                        'PC, that is why everyone else gets in without being asked. The moment you '
                        'turn it on, every one of those machines will start asking for a username '
                        'and password too. Create an account for each person before you make the '
                        'change, do it at a quiet time rather than first thing on a Monday, and '
                        'expect to visit each PC once to enter <code>PCNAME\\username</code> and '
                        'tick the box to remember it.</p><p>On the Windows 10 '
                        'PC:</p><ul><li>Create a local user account with a proper password &mdash; '
                        'ideally one per person rather than a single shared login. Leave password '
                        'protected sharing switched on.</li><li>Open the folder&rsquo;s properties '
                        'and set permissions in <em>both</em> places: the Sharing tab and the '
                        'Security tab. Windows applies whichever is more restrictive, which is why '
                        'granting full control on the share alone so often changes '
                        'nothing.</li><li>Give each account only what it needs. Most people need '
                        'to read and write in one folder, not full control of the '
                        'drive.</li></ul><p>Then on the Windows 11 machine, connect by typing '
                        '<code>\\\\PCNAME\\ShareName</code> rather than browsing for it. When the '
                        'login box appears, enter the username as <code>PCNAME\\username</code> '
                        '&mdash; the computer name, a backslash, then the account you just '
                        'created, because left to itself Windows tends to offer your Microsoft '
                        'account. Tick the box to remember the details.</p><p>If it still refuses, '
                        'a wrong password may already be cached from an earlier attempt. Open '
                        'Credential Manager from Control Panel, look under Windows Credentials, '
                        'remove any saved entry for that computer, then try again. Once it '
                        'connects reliably you can map it to a drive letter so it returns each '
                        'morning.</p>'},
               {'eyebrow': '/05 &mdash; THE BIGGER PICTURE',
                'h2': 'What piecemeal PC replacement does to your office files',
                'html': '<p>It is worth stepping back, because this error is usually a symptom of '
                        'something larger. Replacing computers one at a time is a sensible way to '
                        'manage cash flow, but it leaves the office files sitting on whichever '
                        'machine happens to be oldest &mdash; and now that Windows 10 support '
                        'ended in October 2025, that may well be the one no longer receiving '
                        'security updates, unless it is enrolled in Extended Security Updates, '
                        'which for home versions runs to October 2026. Worth checking rather than '
                        'assuming &mdash; Windows Update will tell you.</p><p>A few honest '
                        'questions. If that computer failed this afternoon, where is the copy of '
                        'the files? Does everyone lose access the moment the person at that desk '
                        'switches it off? Could you say today who has permission to what? A share '
                        'held together by loose settings tends to fail quietly rather than '
                        'loudly.</p><p>There is no single right answer. Some offices are best '
                        'served by keeping the shared folder on one computer and doing it '
                        'properly: a supported version of Windows, real accounts, sensible '
                        'permissions and a backup somebody has actually tested. Others do better '
                        'with a small network drive. Plenty of the Dorset businesses we look after '
                        'have moved the whole lot into Microsoft 365, so files follow people '
                        'between the office, home and their phone and this class of problem '
                        'disappears.</p><p>What we would not do is choose for you from a web page. '
                        'It depends on how many people share the files, how large they are, '
                        'whether anyone works away, and what your business already pays for. That '
                        'is a conversation, not a form.</p>'}],
  'faqs': [{'q': 'Why can all our other computers open the shared folder and only the new Windows '
                 '11 PC cannot?',
            'a': 'Because the older machines were set up in the same era as the share and were '
                 'content to connect the loose way it expects. The new PC will not do that. It '
                 'insists on presenting a real username and password, and unless an account exists '
                 'on the Windows 10 computer for it to use, it has nothing valid to send. Nothing '
                 'has broken on the old machine &mdash; the new one simply holds a higher '
                 'standard, and that share was never asked to meet it before.'},
           {'q': 'The forums all say to enable SMB1 or guest access. Will that fix it?',
            'a': 'It usually does work, which is exactly why the advice spreads so widely. It '
                 'works by switching off the check that stopped you, leaving the connection '
                 'unidentified and unprotected on every machine you apply it to. SMB1 in '
                 'particular is the protocol ransomware used to spread across office networks, '
                 'which is why Microsoft removed it. Creating a real account on the Windows 10 PC '
                 'takes about the same amount of time and leaves you safe afterwards.'},
           {'q': 'Windows keeps asking for a username and password and will not accept mine. What '
                 'should I type?',
            'a': 'Put the computer name in front of the username &mdash; '
                 '<code>PCNAME\\username</code>, using the name of the PC that holds the folder. '
                 'Left to itself, Windows 11 tends to offer your Microsoft account, which the '
                 'older machine has no record of. The account and password must exist on the '
                 'computer hosting the share, and that account needs permission on both the '
                 'Sharing tab and the Security tab of the folder. If it still fails, delete any '
                 'saved entry for that PC in Credential Manager and try again.'},
           {'q': 'I get error 0x80070035, the network path was not found. Is that the same '
                 'problem?',
            'a': 'Not quite. That message usually means the new PC could not reach the other '
                 'computer by name at all, rather than being turned away once it got there. Try '
                 'the IP address instead, for example <code>\\\\192.168.1.20</code>. If that opens '
                 'the share, you have a name lookup problem. If it prompts for a login, you are '
                 'back to the accounts issue. It is also worth checking the network profile is set '
                 'to Private and that both machines are on the same network rather than one '
                 'sitting on a guest Wi-Fi.'},
           {'q': 'Do we have to replace the Windows 10 PC to sort this out?',
            'a': 'Not in order to fix the error &mdash; that is a configuration job and can be '
                 'done on either machine. It is worth knowing, though, that Windows 10 stopped '
                 'receiving its normal security updates in October 2025, unless that PC is '
                 'enrolled in Extended Security Updates, which for home versions runs to October '
                 '2026. Check Windows Update rather than assuming. Either way, if that machine '
                 'holds the whole office&rsquo;s files, the sharing fault is the smaller of your '
                 'two problems.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/windows-11-network-credentials-shared-folder/">Windows 11 asking for '
                    'network credentials</a> &middot; <a '
                    'href="/share-files-small-office-without-server/">Sharing files without a '
                    'server</a> &middot; <a '
                    'href="/shared-folder-read-only-cant-save-windows-11/">Shared folder is '
                    'read-only</a> &middot; <a href="/fix-shared-folder-error-0x80004005/">Error '
                    '0x80004005 explained</a> &middot; <a '
                    'href="/windows-11-cant-see-network-computers/">Windows 11 cannot see network '
                    'computers</a> &middot; <a href="/windows-10-end-of-life/">Windows 10 end of '
                    'life</a></p>'},
 {'slug': 'fix-shared-folder-error-0x80004005',
  'title': 'Windows Error 0x80004005 Shared Folder Fix | 365 Techies',
  'metaDesc': 'Error 0x80004005 means Windows failed without saying why. Use this ordered '
              'checklist to find the real cause of a shared folder failure.',
  'ogTitle': 'Windows error 0x80004005: what it means and how to fix it',
  'crumbName': 'Error 0x80004005',
  'eyebrow': '// OFFICE FILE SHARING',
  'h1': 'Windows cannot access shared folder, error 0x80004005',
  'lede': 'If Windows has told you it cannot access a shared folder and handed you error '
          '0x80004005, you have not actually been told what is wrong. That code means unspecified '
          'error. This page explains why the single-answer fixes online so often fail, then gives '
          'you an ordered way to work out which underlying cause is yours before you change '
          'anything.',
  'ctaHead': 'Still stuck on 0x80004005?',
  'ctaSub': 'Tell us what you have already tried and what changed just before it started. Most '
            'shared folder faults can be diagnosed in a remote session, so nobody has to be '
            'without a computer. Call 01202 775566.',
  'serviceName': 'Shared Folder Diagnostics',
  'sections': [{'eyebrow': '/01 &mdash; WHAT THE CODE MEANS',
                'h2': '0x80004005 is Windows saying it failed, without saying why',
                'html': '<p><code>0x80004005</code> is one of the least helpful things Windows can '
                        'put on a screen. Translated, it means <strong>unspecified error</strong>. '
                        'Windows is telling you that an operation failed and that it either does '
                        'not know the reason or has not passed the reason back to the window you '
                        'are looking at.</p><p>That is why the same code turns up in completely '
                        'unrelated situations. People see <code>0x80004005</code> when Windows '
                        'Update fails, when a zip file refuses to extract, when a virtual machine '
                        'will not start, and when File Explorer cannot open '
                        '<code>\\\\OFFICE-PC\\Accounts</code>. It is not the fingerprint of one '
                        'particular fault. It is closer to a shrug.</p><p>This has two practical '
                        'consequences. The first is that any article claiming '
                        '<code>0x80004005</code> means one specific thing, and that one setting '
                        'change cures it, is guessing. That change may genuinely have worked for '
                        'the person who wrote it, on their network, for their cause &mdash; which '
                        'is not necessarily yours. The second consequence is more useful: because '
                        'the code carries no information, <em>you</em> have to supply it, by '
                        'narrowing down which underlying cause applies before you alter a single '
                        'setting. The rest of this page is that narrowing-down process, in order, '
                        'starting with the checks that rule out the most possibilities in the '
                        'least time.</p>'},
               {'eyebrow': '/02 &mdash; NARROW IT DOWN',
                'h2': 'Four questions to answer before you change anything',
                'html': '<p>A shared folder that answers with <code>0x80004005</code> is nearly '
                        'always failing for one of five reasons: the host device is not reachable, '
                        'its name is not resolving, Windows is presenting the wrong sign-in '
                        'details, the permissions genuinely do not include you, or the device at '
                        'the far end is too old for the way Windows now talks to it. The four '
                        'questions below usually narrow those five down to one, and the section '
                        'after them turns that into an ordered set of '
                        'checks.</p><ul><li><strong>Is it one computer or all of them?</strong> If '
                        'everyone has lost the share, look at the host or the network. If it is '
                        'one person, look at that computer and that user '
                        'account.</li><li><strong>Is it one folder or every share on that '
                        'host?</strong> One folder failing while others still open points at that '
                        'folder&rsquo;s permissions. Everything on the host failing points at '
                        'reachability, credentials or the host itself.</li><li><strong>Is it one '
                        'user or every user on that computer?</strong> Signing in as a different '
                        'person on the same machine separates a user-level problem, such as saved '
                        'credentials, from a machine-level one.</li><li><strong>What changed, and '
                        'when?</strong> A Windows feature update, a password change, a new router, '
                        'a replaced computer, a new NAS box, new security software. This code '
                        'rarely appears out of a clear sky.</li></ul><p>Write the answers down '
                        'before you start clicking. In a small Dorset office that takes ten '
                        'minutes and routinely saves an afternoon.</p>'},
               {'eyebrow': '/03 &mdash; THE ORDER TO WORK IN',
                'h2': 'The elimination ladder, cheapest check first',
                'html': '<p>Work down this list in order and stop at the first rung that fails. '
                        'That rung is where your real fault lives, and the ones below it are '
                        'irrelevant until it is dealt with. There are five rungs, one for each of '
                        'the five causes above.</p><ul><li><strong>One: is the host awake and '
                        'reachable?</strong> A desktop that has gone to sleep, a NAS switched off '
                        'at the wall, a machine that never came back after a power cut, or a '
                        'laptop not on the office VPN all produce a failure to access rather than '
                        'an explanation.</li><li><strong>Two: does the address work when the name '
                        'does not?</strong> If <code>\\\\192.168.1.20\\Shared</code> opens and '
                        '<code>\\\\OFFICE-PC\\Shared</code> does not, that usually points at name '
                        'resolution rather than permissions. There is one exception worth knowing: '
                        'connecting by name and connecting by address can authenticate in '
                        'different ways, so on a business network with a domain the same symptom '
                        'can also mean an authentication fault. If the address works, treat name '
                        'resolution as the first suspect, but do not rule out rung '
                        'three.</li><li><strong>Three: is Windows offering the wrong '
                        'identity?</strong> Windows remembers the details it first used for a '
                        'server and keeps reusing them, so after a password change they can be '
                        'stale. Those saved entries sit in Credential Manager, under Windows '
                        'Credentials. Removing the entry for that server is safe and reversible, '
                        'but on its own it often changes nothing, because Windows also holds the '
                        'existing connection to that host open and will not ask you afresh until '
                        'that connection is dropped. Disconnect any mapped drive pointing at that '
                        'host, then sign out and back in, or restart, before you try again. A '
                        'drive set to reconnect at sign-in will keep re-presenting the old details '
                        'until it is disconnected properly.</li><li><strong>Four: do the '
                        'permissions actually include you?</strong> Sharing has two independent '
                        'layers, the share permissions and the underlying file and folder '
                        'permissions, and the more restrictive wins. Check both at the host, not '
                        'from the computer that is complaining.</li><li><strong>Five: is the far '
                        'end too old for the way Windows now connects?</strong> If the host is '
                        'reachable, the name resolves, the credentials are current and the '
                        'permissions include you, the remaining suspect is the device itself '
                        '&mdash; which is what the next section deals with.</li></ul>'},
               {'eyebrow': '/04 &mdash; ADVICE TO IGNORE',
                'h2': 'The popular fixes that trade your security for access',
                'html': '<p>Search this code and you will soon be told to re-enable SMB1, switch '
                        'on insecure guest logons, turn off SMB signing, or paste in a registry '
                        'value that does one of those. These changes often do restore access, '
                        'which is why they spread. They restore it by removing a protection, so it '
                        'is worth knowing what you give up.</p><ul><li><strong>SMB1 is the old '
                        'file-sharing protocol Windows no longer installs by default</strong>, for '
                        'good reason: it is the protocol family the 2017 ransomware outbreaks '
                        'spread across office networks with. Turning it back on for one old device '
                        're-opens that door for every machine you have.</li><li><strong>Insecure '
                        'guest access means unauthenticated access.</strong> Your computer stops '
                        'checking who it is talking to, which is exactly what an attacker on the '
                        'same network needs to impersonate your server and be handed your '
                        'files.</li><li><strong>Turning off the firewall or your security software '
                        'is a test, not a fix.</strong> If access returns with it off, that is '
                        'useful information, but the proper response is a specific rule for that '
                        'traffic.</li><li><strong>Granting everyone full control</strong> is the '
                        'usual shortcut when permissions are the cause. It is also how one '
                        'infected laptop encrypts the whole company&rsquo;s shared '
                        'drive.</li></ul><p>The people posting these fixes are not malicious. A '
                        'workaround that suits one home PC is simply a poor fit for a business '
                        'holding client data.</p>'},
               {'eyebrow': '/05 &mdash; WHEN IT IS THE KIT',
                'h2': 'Old hardware, tightened defaults, and knowing when to stop',
                'html': '<p>A good share of the business cases we see are not really Windows '
                        'faults. They are a modern computer refusing to talk to an ageing device '
                        'in the way that device expects. The usual suspects are a NAS box bought '
                        'years ago, a USB drive plugged into a router, an office printer with a '
                        'scan-to-folder feature, or one old machine kept alive for a single piece '
                        'of software.</p><p>Recent Windows releases have deliberately tightened '
                        'the defaults for file sharing, expecting connections to be properly '
                        'authenticated and protected. Nothing changed at your NAS or printer; '
                        'Windows simply no longer accepts the weaker conversation it used to '
                        'tolerate. That is why a setup which ran happily for years can break the '
                        'week after a feature update with nobody having touched it.</p><p>The '
                        'right answers here are boring and durable. Check for firmware for the '
                        'device, because many manufacturers added modern sharing support years ago '
                        'and it has never been applied. Create a proper named account on the '
                        'device rather than leaning on guest access. Or accept that kit which '
                        'cannot be updated has reached the end of its life on a business network. '
                        'If that box is also the only place a set of files exists, deal with the '
                        'backup problem first.</p><p>If you have worked down the ladder and still '
                        'see <code>0x80004005</code>, stop before changing security settings on a '
                        'hunch. A fault that survives an ordered elimination usually needs someone '
                        'looking at both ends at once.</p>'}],
  'faqs': [{'q': 'What does error 0x80004005 mean when Windows cannot access a shared folder?',
            'a': 'It means unspecified error. It is Windows reporting that something failed while '
                 'telling you nothing about what. The same code appears when Windows Update fails '
                 'or a zip file will not extract, so it is not specific to file sharing at all. In '
                 'practice it tells you a request to the other computer did not succeed, and you '
                 'have to work out why by elimination rather than by looking the code up.'},
           {'q': 'Why do the fixes I found online not work for me?',
            'a': 'Because each was written for one particular cause, and yours may be a different '
                 'one. A page saying this code means a permissions problem is only right for the '
                 'readers whose fault really was permissions. Everyone else changes a setting, '
                 'sees no improvement, and moves on to the next page. Working out which cause '
                 'applies to you first, then fixing that, is slower to start and much faster to '
                 'finish.'},
           {'q': 'Should I enable SMB1 or insecure guest logons to get my shared folder back?',
            'a': 'We would strongly advise against it on a business network. Both restore access '
                 'by switching off a protection rather than by fixing the fault. SMB1 is the old '
                 'protocol that ransomware spread across office networks with in 2017, and guest '
                 'access means your computer stops verifying what it is connecting to. If a device '
                 'only works with those settings, the honest answer is that the device needs '
                 'firmware, reconfiguring, or replacing.'},
           {'q': 'Our shared folder stopped working after a Windows update and nothing changed at '
                 'our end. Why?',
            'a': 'Something did change, just not at the end you were watching. Recent Windows '
                 'versions have tightened what they will accept when connecting to a shared '
                 'folder, expecting connections to be properly authenticated and protected. An '
                 'older NAS, router-attached drive or printer that relied on the weaker '
                 'arrangement is suddenly refused. The device is unchanged; the rules it has to '
                 'meet are not.'},
           {'q': 'Can 365 Techies sort this out without taking our computers away?',
            'a': 'Usually, yes. Network sharing faults are diagnosed by comparing what the two '
                 'ends are doing, and that can normally be done in a remote session while you '
                 'carry on working, with nobody left without a machine. Where hardware turns out '
                 'to be at fault we collect it free of charge, and our no fix, no fee promise '
                 'applies. Call 01202 775566 and tell us what changed.'}],
  'chips': ['No fix, no fee', 'Rated 4.9 on Google', 'Trading since 1995'],
  'primaryCta': ['Get it looked at', '/contact/'],
  'secondaryCta': ['Call 01202 775566', 'tel:+441202775566'],
  'schemaKind': 'service',
  'crossLinksHtml': '<p><strong>Related guides:</strong> <a '
                    'href="/windows-11-network-credentials-shared-folder/">Windows 11 asking for '
                    'network credentials</a> &middot; <a '
                    'href="/share-files-small-office-without-server/">Sharing files without a '
                    'server</a> &middot; <a '
                    'href="/shared-folder-read-only-cant-save-windows-11/">Shared folder is '
                    'read-only</a> &middot; <a '
                    'href="/windows-11-cant-access-windows-10-shared-folder/">Windows 11 cannot '
                    'open a Windows 10 share</a> &middot; <a '
                    'href="/shared-folders-not-working-after-windows-11-24h2-update/">Shared '
                    'folders after the 24H2 update</a></p>'}]
