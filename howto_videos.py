"""The 365 Techies YouTube how-tos (made 14 Oct 2026, Lily's voice, captions on YouTube) on the existing pages each one
answers (owner, 15 Oct 2026: put the how-to videos on the website - "start with one and two").

Why YouTube and not a copy on our own server: a play on the page counts as a view on the channel, and the channel is
where these films need the numbers (day one: 2-5 views each). Click-to-play on youtube-nocookie: nothing loads and no
cookie is set until the visitor presses play. Each block carries what the film says (its captions, word for word), the
free tools it mentions, and a VideoObject.

  /link-safety-checker/            scam film, straight after the checker (the film shows this checker in use)
  /phishing/                       scam film, after "Stay one step ahead" and its Malwarebytes line (the page had no UK
                                   reporting route at all)
  /how-to-free-up-storage-space/   clean-up film, inside the article before the first step (the film IS the how-to)
The PC specs film (YouTube T3t0g2Z9DVI, 1:47) waits for /computer-spec-checker/ (~25 Oct, after that page's baseline):
add it to VIDEOS and PLACES then. A new poster = a NEW file name (images are cached for a year).

18 Oct 2026 (owner: "post the how-tos on the website too"): the three 365 PC Manager 36.5 how-tos, each straight after
its page's "Start here" section, all filmed in Windows Sandbox:
  /documents-stuck-in-print-queue/               print queue film (public Sat 24 Oct 12:00)
  /stop-programs-starting-with-windows/          start-up film (public Mon 26 Oct 12:00)
  /is-someone-remotely-accessing-my-computer/    remote access film (public Thu 22 Oct 12:00)
They were scheduled, not yet public, when they went on the pages. A film with "live" waits on its own: until then the
poster says when it's out and the button does nothing (SCRIPT_LIVE), and its VideoObject is written only when the page
is built after "live" - or added by the same script in the browser once the time has passed, so no rebuild is needed.

20 Oct 2026 (owner: the printer page videos "from our YouTube channel ... the same way we did it on the PC Manager and the
Virgin email mover pages"): the EE hub printer film on /printer-wont-connect-to-ee-smart-hub/, straight after the guided
steps (the page reads explanation -> steps -> film -> detail), with its 27-second Short as a button underneath ("extra").
Real screens from a customer's hub, network names hidden. Made public by the owner before this went live.

21 Oct 2026: the Techies PDF how-to film (3:06, uploaded full quality) inside /how-to-scan-a-document/, before "Key points".
21 Oct 2026: the EE film swapped to its full-quality upload azwrRzEGMYo (the 20 Oct R7CE9j62tHs was a compressed copy).
21 Oct 2026 (owner: "do both, just go for it"): the OneDrive-taking-up-space film (2:03, 4K, filmed in the Hyper-V
studio) on /onedrive-taking-up-space/, straight after the guided steps, as on the EE page. Public before this went live.
22 Oct 2026 (owner: "do what's left, all of that"): the ten 21 Oct how-tos filmed in the Hyper-V studio, each on the page
it answers, scheduled: every film goes public at 11:00 on its day (23 Oct - 1 Nov) and its Short at 12:00. The clipboard
film has no page that answers it yet, so it is in VIDEOS only. Transcripts are the films' own voice scripts.
"""
import datetime
import json

import build_pages as bp
import yt_watch
from techies_one_boxes import _section_end

VIDEOS = {
    "scam": dict(
        id="rPqYvX-HMI4", secs=97, uploaded="2026-10-14", poster="/images/howto-scam-email-poster-v1.jpg",
        name="Is This Email a Scam? How to Check It and Report It (UK)",
        desc=("A 97-second guide from 365 Techies: the warning signs of a scam email, checking a link without opening it, and "
              "where to report scam emails and texts in the UK (report@phishing.gov.uk and 7726)."),
        cap="1 min 37 s &middot; a spoken guide with captions &middot; the emails are made up",
        says=("Got an email that doesn&rsquo;t feel right? Here&rsquo;s how to check it in under a minute, and where to report "
              "it in the UK. It&rsquo;s free, and it helps stop the scammers. Step one: look for the warning signs. Scam emails "
              "pretend to be a company you know, like Royal Mail or your bank. They rush you, and ask you to click a link or pay "
              "a small fee. Here, the sender&rsquo;s address isn&rsquo;t really Royal Mail&rsquo;s, and it wants &pound;1.45 "
              "within 24 hours. That&rsquo;s a scam. While it&rsquo;s open, our free Techies One Mail app checks new emails for "
              "these signs, and moves likely scams to a Scams folder, with the reasons why. Step two: check a link before you "
              "click it. Copy the link, and paste it into our free Link Safety Checker. It only reads the address, and never "
              "opens the page. This one uses a number instead of a proper name, and it isn&rsquo;t secure. So don&rsquo;t click "
              "it. Step three: report it. Forward the email to report@phishing.gov.uk. That&rsquo;s the National Cyber Security "
              "Centre&rsquo;s free service. Then delete it. Got a scam text? Forward it to 7726. If you&rsquo;ve already "
              "clicked, paid, or shared your details, call your bank straight away on the number on the back of your card, and "
              "report it to Report Fraud. And you can practise spotting scams with our free quiz."),
        tools=[("link-safety-checker", "Link Safety Checker"), ("spot-the-scam", "Spot the Scam quiz"),
               ("techies-one-mail", "Techies One Mail for Windows")]),
    "free-up-space": dict(
        id="WgRs97MKctg", secs=90, uploaded="2026-10-14", poster="/images/howto-free-up-space-poster-v1.jpg",
        name="How to Free Up Space on Windows 11 (No Cleaner Apps Needed)",
        desc=("A 90-second guide from 365 Techies to Windows 11's own free clean-up tools: temporary files, cleanup "
              "recommendations, Storage Sense and Disk Clean-up. No downloads and no cleaner apps."),
        cap="1 min 30 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11 with made-up files",
        says=("Running out of space on your PC? Windows has free clean-up tools built in. No downloads, and no cleaner apps. "
              "Here&rsquo;s how to use them safely. Way one: temporary files. Open Settings, choose System, then Storage. "
              "Windows works out what&rsquo;s using your space. Here, it&rsquo;s found over four gigabytes it could clean up. "
              "Click Temporary files, and tick what you don&rsquo;t need. Careful with Downloads: those are your own files, so "
              "check them first. Then click Remove files, and Continue. Way two: cleanup recommendations. It lists large or "
              "unused files, and apps you might not need, so you decide what goes. Way three: Storage Sense. With it on, "
              "Windows clears out temporary files and old recycle bin files by itself, on a schedule you choose. For a deeper "
              "clean, search for Disk Clean-up. It shows how much it can free up. Tick what you want to remove, and click OK. "
              "We&rsquo;d already cleaned this PC, so there&rsquo;s very little left. Still running low? Something may be "
              "filling your drive. Our free 365 PC Manager app for Windows shows every drive&rsquo;s free space and health, "
              "and finds your biggest files. It&rsquo;s free, and it only takes a few minutes."),
        tools=[("free-pc-health-check", "365 PC Manager (free, for Windows)")]),
    "print-queue": dict(
        id="R0pRnJOLP7Y", secs=74, uploaded="2026-10-24", live="2026-10-24T12:00:00+01:00", out="Sat 24 Oct, 12:00",
        poster="/images/howto-print-queue-poster-v1.jpg",
        name="Printer Stuck? How to Clear the Print Queue in Windows 11",
        desc=("A 74-second guide from 365 Techies: clear documents stuck in the Windows 11 print queue with Settings and "
              "Cancel all, then what to try if it's still stuck - restarting the printer, the PC and the Print Spooler."),
        cap="1 min 14 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11 with a made-up printer",
        says=("Printer stuck, and nothing comes out? One stuck document holds up everything behind it. Here&rsquo;s how to "
              "clear it. Press the Windows key and I, to open Settings. Choose Bluetooth and devices, then Printers and "
              "scanners. Click your printer, then Open print queue. Here are three documents, all stuck. Choose Cancel all, "
              "and say yes. The queue is empty, so try printing again. Still stuck? Switch the printer off for ten seconds, "
              "then on again, and restart the PC. That restarts Windows&rsquo; printing service too. If a document still "
              "won&rsquo;t go, restart the Print Spooler. Press Windows and R, type services.msc, find Print Spooler, "
              "right-click it, and choose Restart. Or let our free app spot it. 365 PC Manager shows what&rsquo;s stuck in "
              "the queue, and Clear stuck documents cancels only those. Download it free at 365techies.co.uk."),
        tools=[("free-pc-health-check", "365 PC Manager (free, for Windows)")]),
    "startup": dict(
        id="5UdyyhMhK2s", secs=71, uploaded="2026-10-26", live="2026-10-26T12:00:00+00:00", out="Mon 26 Oct, 12:00",
        poster="/images/howto-startup-poster-v1.jpg",
        name="PC Slow to Start? How to Stop Programs Starting with Windows 11",
        desc=("A 71-second guide from 365 Techies: stop programs starting with Windows 11 in Settings, Apps, Startup - sort "
              "by start-up impact and switch off what you don't need - and the Windows 10 way, in Task Manager."),
        cap="1 min 11 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11",
        says=("PC slow to be ready when you switch it on? Programs starting by themselves could be why. Here&rsquo;s how to "
              "switch them off, free. Press the Windows key and I, to open Settings. Choose Apps, then Startup. Every switch "
              "is a program that starts by itself. Sort by startup impact, so the heaviest come first. Switch off the ones "
              "you don&rsquo;t need. Here, Microsoft Edge. You can still open it whenever you like. Leave your antivirus, "
              "drivers and OneDrive on. Here, Windows Security stays on. On Windows 10, it&rsquo;s in Task Manager. Press "
              "Control, Shift and Escape, then open Startup. Then restart, and see how much quicker it&rsquo;s ready. "
              "Changed your mind? Switch it back on in the same place. Our free app, 365 PC Manager, lists everything that "
              "starts with Windows too. It warns you before you switch off OneDrive, because that&rsquo;s often your only "
              "backup. Download it free at 365techies.co.uk."),
        tools=[("free-pc-health-check", "365 PC Manager (free, for Windows)")]),
    "remote-access": dict(
        id="NneYsh6iqpA", secs=87, uploaded="2026-10-22", live="2026-10-22T12:00:00+01:00", out="Thu 22 Oct, 12:00",
        poster="/images/howto-remote-access-poster-v1.jpg",
        name="Is Someone Remotely Accessing Your Computer? How to Check (Windows 11)",
        desc=("An 87-second guide from 365 Techies: how to check whether someone can get into your computer remotely - the "
              "hidden icons by the clock, installed apps by date, Remote Desktop - and how to cut them off."),
        cap="1 min 27 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11",
        says=("Mouse moving by itself? Someone from Microsoft or your bank been on your PC? Here&rsquo;s how to check, and "
              "cut them off. If it&rsquo;s happening right now, disconnect from the internet. Switch Wi-Fi off, or pull out "
              "the network cable. A remote connection can&rsquo;t work without it. Look at the icons by the clock. Click the "
              "little arrow to see the hidden ones. AnyDesk, TeamViewer and ScreenConnect often sit here. You can also press "
              "Control, Shift and Escape, and look in Task Manager&rsquo;s Processes. Open Settings, Apps, Installed apps, "
              "and sort by date installed. Look for anything new from the day of the call. Or search for its name. Here, "
              "there&rsquo;s no AnyDesk. Then check System, Remote Desktop. If it&rsquo;s on and you don&rsquo;t use it, "
              "switch it off. Home editions don&rsquo;t have it. If someone did get in, uninstall the program, run a full "
              "Windows Security scan, change your passwords from another device, and ring your bank if you paid. Our free "
              "app checks this in one go. 365 PC Manager shows whether a remote session is open right now, and every "
              "remote-control program on the PC. Download it free at 365techies.co.uk."),
        tools=[("free-pc-health-check", "365 PC Manager (free, for Windows)")]),
    "ee-printer": dict(
        id="azwrRzEGMYo", secs=115, uploaded="2026-10-21", poster="/images/howto-ee-printer-poster-v1.jpg",
        name="Printer Won't Connect to EE Smart Hub? The Fix (Compatible WiFi)",
        desc=("A 1 minute 55 second guide from 365 Techies, on a real EE hub: why printers say the wifi password is wrong "
              "(WPA3-Personal-Transition security), turning on EE's Compatible WiFi, and joining the printer to it - even "
              "one plugged into the computer by USB."),
        cap="1 min 55 s &middot; a spoken guide with captions &middot; a real EE hub and HP printer, network names hidden",
        says='Printer says your EE wifi password is wrong? It almost certainly isn&rsquo;t. Here&rsquo;s the fix we used on a real EE hub. On EE&rsquo;s newer hubs, the main wifi uses a security setting called WPA3-Personal-Transition. It&rsquo;s meant to let older devices in, but plenty of printers still can&rsquo;t join it. And because &ldquo;wrong password&rdquo; is the only error they have, that&rsquo;s what they tell you. On a computer connected to the hub, open a web browser, and go to 192.168.1.254. If it warns you the page isn&rsquo;t secure, that&rsquo;s normal for your own hub. Open the Wireless tile. Here, Compatible WiFi is switched off. Choose Change settings, and sign in with the admin password from the card on the back of the hub. Compatible WiFi is a second network, named after your main one, with -Comp on the end. Switch its 2.4GHz band on, and leave 5GHz off. Keep the security on WPA2, use a password of just letters and numbers, and save. Now run your printer&rsquo;s wireless setup, and choose the network ending in -Comp. Printer plugged into the computer by USB? On an HP, the printer&rsquo;s own software does it from the PC. Open Printer Setup &amp; Software, then Convert a USB connected printer to wireless. Choose to enter the settings yourself, pick the -Comp network, and type its password. That&rsquo;s it. The printer joins, and your laptop stays on the main wifi. Want us to do it for you? We&rsquo;ll sort it remotely for &pound;20. The full guide is at 365techies.co.uk.',
        tools=[],
        # the Short sits under the film; its own rule stops the film block's link style (.hvf a) restyling the button
        extra=('        <p style="text-align:center;margin:.3rem 0 0"><style>.hvf a.ytw{color:inherit;text-decoration:none}</style>'
               + yt_watch.button(yt_watch.EE_SHORT, "Or watch it in 27 seconds", shape="tall") + '</p>\n')),
    "techies-pdf": dict(
        id="Jd0PrHSWJQc", secs=186, uploaded="2026-10-21", poster="/images/howto-techies-pdf-poster-v1.jpg",
        name='Free PDF Editor for Windows 11: Sign, Merge, Split & Compress PDFs',
        desc='A 3-minute guide from 365 Techies to Techies PDF, the free PDF program for Windows 10 and 11: fill in and sign a PDF, join (merge) PDFs, turn, move or take out pages, split a PDF, make a PDF smaller for email, turn photos into a PDF, copy the words out and put a password on - all on your own PC, nothing uploaded.',
        cap="3 min 6 s &middot; a spoken guide with captions &middot; the real program on made-up documents",
        says='Need to sign a form, join some PDFs, or make one small enough to email? Here&rsquo;s how to do all of that for free, with Techies PDF. It&rsquo;s a free program for Windows 10 and 11, from 365 Techies. Everything happens on your own computer, so your documents are never uploaded anywhere. Download it from 365techies.co.uk. There&rsquo;s no account to make. Open it, and every job has its own big button. To fill in a form, press Open a PDF, and choose it. Then click in the boxes and type. Tick boxes work too. To sign it, press Add or edit signatures, then Add new signature. Type your name, draw it with the mouse, or use a photo of your signature. Put it on the line, make it the right size, and press Save. To join PDFs into one, just drop them onto the window. Put them in order with the arrows, and press Join them into one PDF. You get one tidy PDF, and the ones you started with aren&rsquo;t changed. Is a page upside down? Choose Turn, move or take out pages. Every page shows as a picture. Turn it the right way up with the round arrow. Take out the pages you don&rsquo;t need, move them around, and press Save the PDF. Only need some of the pages? Choose Take pages out into a new PDF. Type the pages you want, like 1-2, and press Save these pages. Or make a PDF for every page, and each one becomes its own file. Is a PDF too big to email? Choose Make a PDF smaller for email. Pick the PDF, start with Good for email, and press Make it smaller. Our PDF of holiday photos went from 27 MB to 1.3 MB. A smaller copy is saved, and your original stays as it was. Photographed a letter or a receipt? Choose Turn photos into a PDF. Put the photos in order, choose A4 pages, and press Make the PDF. Each photo goes on its own page, the right way up. Need the words, not the PDF? Choose Copy the words out of a PDF. All the words appear, ready to copy and paste into an email or a letter. Sending something private? Put a password on a copy before you email it. Type the password twice, and press Put the password on. Then tell the person the password by phone, not in the same email. Know the password? You can take it off again, too. Techies PDF adds text and signatures on top. It can&rsquo;t change the words already in a PDF. It&rsquo;s free, for Windows 10 and 11. Download it from 365techies.co.uk.',
        tools=[("techies-pdf", "Techies PDF (free, for Windows)")]),
    "onedrive-space": dict(
        id="bKebDq3gLow", secs=123, uploaded="2026-10-21", poster="/images/howto-onedrive-space-poster-v1.jpg",
        name="OneDrive Taking Up Space on Your PC? Free It Up Safely (Windows 11)",
        desc=("A 2-minute guide from 365 Techies, filmed on Windows 11 with a real OneDrive: why OneDrive fills the drive, "
              "right-click Free up space (the files stay in OneDrive), OneDrive's Files On-Demand button for every file at "
              "once, Storage Sense to keep it that way, and the one rule for work and shared folders."),
        cap="2 min 3 s &middot; a spoken guide with captions &middot; real Windows 11 and OneDrive, our own demo files",
        says="OneDrive filling up your PC? You don&rsquo;t have to switch it off, and you won&rsquo;t lose a single file. Here&rsquo;s how to get the space back, safely. OneDrive keeps your files in the cloud. But every file you open is downloaded to your PC as well, and it stays there. Over time, that fills the drive. On this PC, OneDrive is using 1.3 GB. Open File Explorer, and right-click OneDrive. Choose Free up space. The green ticks turn into blue clouds. The files are still there, and still in OneDrive. They just stop taking room on your PC. Back in Settings, OneDrive has gone from the list, and the free space has gone up by the same amount. Double-click any file, and it downloads the moment you need it. OneDrive&rsquo;s own settings can do the same for every file at once. Open Sync and backup, then Advanced settings. Under Files On-Demand, choose Free up disk space. To keep it that way, open Windows Settings, then System, then Storage, and switch on Storage Sense. Under Locally available cloud content, 30 days is a good choice. When the drive gets low, files you haven&rsquo;t opened in a month go back to the cloud, all by themselves. On a work computer, it&rsquo;s the same for the company&rsquo;s shared folders. Just never delete files to make room: that deletes them for everyone. That&rsquo;s it. Your files are safe in OneDrive, and your PC has its room back. Want us to do it for you? We&rsquo;ll sort it remotely. The full guide is at 365techies.co.uk.",
        tools=[]),
    'clear-history': dict(
        id='AnK0qN4ZyNI', secs=88, uploaded='2026-10-23', live='2026-10-23T11:00:00+01:00', out='Fri 23 Oct, 11:00',
        poster='/images/howto-clear-history-poster-v1.jpg',
        name='How to Clear Browsing History, Cache and Cookies in Microsoft Edge',
        desc='An 88-second guide from 365 Techies: clear your browsing history, cache and cookies in Microsoft Edge with Ctrl + Shift + Delete, remove just one site with Ctrl + H, and the same keys in Google Chrome.',
        cap='1 min 28 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11',
        says='Websites acting up, or just want to clear what you&rsquo;ve been looking at? Here&rsquo;s how to clear your browsing history, cache and cookies, in Microsoft Edge. Press Control, Shift and Delete, all together. The Delete browsing data box opens. First, choose a time range. To clear everything, pick All time. Browsing history is the list of sites you&rsquo;ve visited. Cached images and files are copies of pages, kept so they load faster. Cookies are small files that let websites remember you. Clear them, and you&rsquo;ll be signed out of most sites, so have your passwords handy. Tick what you want to clear, and choose Clear now. Just want to remove one site? Press Control and H to open your history, find the site, and delete it from the list. Using Google Chrome? The same three keys open its own Delete browsing data box, and it works the same way. So: Control, Shift and Delete, pick a time range, then Clear now. Need a hand with your PC? We&rsquo;ll sort it remotely. More free guides at 365techies.co.uk.',
        tools=[]),
    'ip-address': dict(
        id='0pYzz4Xup3o', secs=73, uploaded='2026-10-24', live='2026-10-24T11:00:00+01:00', out='Sat 24 Oct, 11:00',
        poster='/images/howto-ip-address-poster-v1.jpg',
        name='How to Find Your IP Address on Windows 11 (Both of Them)',
        desc='A 73-second guide from 365 Techies: find both of your IP addresses on Windows 11: the one on your home network (Settings, Network & internet, Properties) and the public one websites see.',
        cap='1 min 13 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11',
        says='Need to find your IP address? Your PC actually has two: one on your home network, and one the internet sees. Here&rsquo;s how to find both. For the one on your home network, open Settings, then Network and internet. Choose Properties at the top, for Wi-Fi or Ethernet. Scroll down, and your address is next to IPv4 address. It&rsquo;s four numbers, with dots between them. Websites see a different address: your broadband&rsquo;s public one. To see it, open your web browser, and go to ipinfo.io/what-is-my-ip. That address belongs to your broadband connection, so every device in your home shares it. So: Settings, Network and internet, Properties, for the one at home. ipinfo.io/what-is-my-ip, for the public one. Need a hand with your PC? We&rsquo;ll sort it remotely. More free guides at 365techies.co.uk.',
        tools=[]),
    'screenshot': dict(
        id='a1zmY3Dr478', secs=89, uploaded='2026-10-25', live='2026-10-25T11:00:00+00:00', out='Sun 25 Oct, 11:00',
        poster='/images/howto-screenshot-poster-v1.jpg',
        name='How to Take a Screenshot on Windows 11 (3 Easy Ways)',
        desc='An 89-second guide from 365 Techies: three ways to take a screenshot on Windows 11 - Windows + Shift + S, the Print Screen key and the Snipping Tool - and where to find it afterwards.',
        cap='1 min 29 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11',
        says='Need to show someone what&rsquo;s on your screen? Here&rsquo;s how to take a screenshot on Windows 11, three ways, and where to find it afterwards. The quickest way: press the Windows key, Shift and S, all together. The screen dims, and a bar appears at the top. Drag a box round the part you want, and let go. That&rsquo;s it. It&rsquo;s copied, ready to paste. In an email, a message or a document, press Control and V. It&rsquo;s saved for you, too. Open Pictures, then the Screenshots folder. On most keyboards, the Print Screen key opens the same snipping bar. Want the whole screen in one go? Press the Windows key and Print Screen. The screen flashes, and the picture goes straight into Screenshots. For more choices, open the Snipping Tool from the Start menu. Choose New, and pick a shape: a box, one window, the whole screen, or freehand. It can record a video of your screen, too. Press the Windows key, Shift and R, and pick the area to record. So, to recap: Windows, Shift and S, drag a box, then paste. Need a hand with your PC? We&rsquo;ll sort it remotely. More free guides at 365techies.co.uk.',
        tools=[]),
    'recover-files': dict(
        id='Dx79dYO4f9s', secs=84, uploaded='2026-10-26', live='2026-10-26T11:00:00+00:00', out='Mon 26 Oct, 11:00',
        poster='/images/howto-recover-files-poster-v1.jpg',
        name='How to Recover Deleted Files on Windows 11 (Recycle Bin, Ctrl + Z, OneDrive)',
        desc="An 84-second guide from 365 Techies: get a deleted file back on Windows 11 from the Recycle Bin, with Ctrl + Z, or from OneDrive's own recycle bin - and what to do if the bin was emptied.",
        cap='1 min 24 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11',
        says='Deleted a file by mistake? Don&rsquo;t panic. It&rsquo;s almost certainly still on your PC. Here&rsquo;s how to get it back. Files you delete go to the Recycle Bin first. Double-click it on your desktop. Find your file. The list shows where it came from, and when it was deleted. Right-click it, and choose Restore. It goes straight back to the folder it came from. Can&rsquo;t see it? Type part of its name in the search box, at the top. Only just deleted it? Press Control and Z straight away, and it comes right back. Files in OneDrive have a second recycle bin, online at onedrive.com. A personal account keeps deleted files there for 30 days. Emptied the Recycle Bin? Stop using the computer straight away, because new files can write over the old ones. And don&rsquo;t download random recovery programs. Call us first: we may still be able to get them back. So: open the Recycle Bin, right-click, Restore. Need a hand? We&rsquo;ll sort it remotely. More free guides at 365techies.co.uk.',
        tools=[]),
    'web-pop-ups': dict(
        id='BRntouWDjWM', secs=70, uploaded='2026-10-27', live='2026-10-27T11:00:00+00:00', out='Tue 27 Oct, 11:00',
        poster='/images/howto-web-pop-ups-poster-v1.jpg',
        name='How to Stop Website Pop-ups and Notifications in Microsoft Edge',
        desc='A 70-second guide from 365 Techies: stop website notification pop-ups in Microsoft Edge (Site permissions, Notifications, Ask before sending), remove a site you once allowed, and spot the scam ones.',
        cap='1 min 10 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11',
        says='Pop-ups appearing in the corner of your screen, even when the website&rsquo;s closed? They&rsquo;re usually website notifications. Here&rsquo;s how to stop them in Microsoft Edge. Click the three dots at the top right of Edge, and choose Settings. Choose Privacy, search, and services. Then Site permissions, All permissions, and Notifications. Turn off Ask before sending. Now websites can&rsquo;t even ask. Said yes to one before? It&rsquo;s listed under Allowed. Click the three dots next to it, and choose Remove. And a pop-up saying your PC is infected, with a number to call, is a scam. Don&rsquo;t ring it. Just close the browser. So: Edge Settings, Site permissions, Notifications, and turn off Ask before sending. Need a hand with your PC? We&rsquo;ll sort it remotely. More free guides at 365techies.co.uk.',
        tools=[]),
    'frozen-program': dict(
        id='G73XVM2223g', secs=72, uploaded='2026-10-28', live='2026-10-28T11:00:00+00:00', out='Wed 28 Oct, 11:00',
        poster='/images/howto-frozen-program-poster-v1.jpg',
        name='How to Close a Frozen Program on Windows 11 (Task Manager)',
        desc='A 72-second guide from 365 Techies: close a frozen program on Windows 11 with Task Manager (Ctrl + Shift + Esc, End task), and two other ways to open Task Manager.',
        cap='1 min 12 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11',
        says='Program frozen, and it won&rsquo;t close? Here&rsquo;s how to close it with Task Manager, without restarting your PC. Press Control, Shift and Escape, all together. Task Manager opens. A program that&rsquo;s stopped working says Not responding, at the top of its window. In Task Manager, click its name, then choose End task, at the top. It closes straight away. Anything you hadn&rsquo;t saved in it is lost, so give it a minute first, in case it&rsquo;s just busy. You can also right-click the taskbar, and choose Task Manager. And if the whole PC seems stuck, press Control, Alt and Delete, and choose Task Manager from there. So: Control, Shift and Escape, click the program, then End task. Need a hand with your PC? We&rsquo;ll sort it remotely. More free guides at 365techies.co.uk.',
        tools=[]),
    'clipboard': dict(
        id='SGlTnkESQ3A', secs=73, uploaded='2026-10-29', live='2026-10-29T11:00:00+00:00', out='Thu 29 Oct, 11:00',
        poster='/images/howto-clipboard-poster-v1.jpg',
        name='How to Use Clipboard History in Windows 11 (Windows + V)',
        desc='A 73-second guide from 365 Techies: turn on clipboard history in Windows 11 with Windows + V, paste from the list, pin things you use often and clear the rest.',
        cap='1 min 13 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11',
        says='Copied something, then copied something else, and lost the first one? Windows can remember everything you copy. Here&rsquo;s how to use clipboard history. Press the Windows key and V. The first time, choose Turn on. Now copy things as normal, with Control and C. When you want to paste, press the Windows key and V, instead of Control and V. Everything you&rsquo;ve copied is listed. Click the one you want. Pin anything you use often, like a phone number. Pinned items stay, even after you restart. Everything else clears when the PC restarts. To wipe the list now, choose Clear all. So: Windows and V, turn it on once, then paste from the list. Need a hand with your PC? We&rsquo;ll sort it remotely. More free guides at 365techies.co.uk.',
        tools=[]),
    'system-restore': dict(
        id='YmGqu9F-Ghc', secs=74, uploaded='2026-10-30', live='2026-10-30T11:00:00+00:00', out='Fri 30 Oct, 11:00',
        poster='/images/howto-system-restore-poster-v1.jpg',
        name='How to Use System Restore in Windows 11 (Turn It On First)',
        desc='A 74-second guide from 365 Techies: switch on System Restore in Windows 11, make a restore point, and undo a bad update or program - your documents and photos are not touched.',
        cap='1 min 14 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11',
        says='Something went wrong after an update, or a new program? System Restore can put Windows back how it was. But only if it&rsquo;s switched on, so let&rsquo;s check that first. Open the Start menu, type create a restore point, and open it. Choose your C drive, then Configure. Choose Turn on system protection, give it about 5% of the drive, and choose OK. Now choose Create, type a name you&rsquo;ll recognise, and choose Create again. Windows makes restore points by itself too, before big updates. To go back, open the same window, and choose System Restore. Pick a restore point, and follow the steps. Your documents and photos aren&rsquo;t touched. Programs and updates added since then are removed. Turn it on today, so it&rsquo;s there when you need it. Need a hand with your PC? We&rsquo;ll sort it remotely. More free guides at 365techies.co.uk.',
        tools=[]),
    'zip': dict(
        id='uvhGZjxuLcI', secs=70, uploaded='2026-10-31', live='2026-10-31T11:00:00+00:00', out='Sat 31 Oct, 11:00',
        poster='/images/howto-zip-poster-v1.jpg',
        name='How to Zip and Unzip Files in Windows 11 (No Software Needed)',
        desc='A 70-second guide from 365 Techies: zip files into one to send them (right-click, Compress to, ZIP File) and open a zip someone sent you (Extract all) in Windows 11, with nothing to install.',
        cap='1 min 10 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11',
        says='Need to send lots of files at once, or open a zip file someone sent you? Here&rsquo;s how to zip and unzip files in Windows 11, with nothing to install. Select the files. Hold Control, and click each one. Right-click them, choose Compress to, then ZIP file. Type a name, and press Enter. That one zip file holds them all, ready to attach to an email. Got a zip file? Right-click it, and choose Extract all. Choose Extract, and the files appear in a new folder, ready to use. Only open zip files you were expecting. Scammers hide viruses in them. So: right-click, Compress to, ZIP file. And to open one: right-click, Extract all. Need a hand with your PC? We&rsquo;ll sort it remotely. More free guides at 365techies.co.uk.',
        tools=[]),
    'split-screen': dict(
        id='C1Bc_0Za3Ts', secs=61, uploaded='2026-11-01', live='2026-11-01T11:00:00+00:00', out='Sun 1 Nov, 11:00',
        poster='/images/howto-split-screen-poster-v1.jpg',
        name='How to Split Your Screen in Windows 11 (3 Easy Ways)',
        desc='A 61-second guide from 365 Techies: put two windows side by side in Windows 11: drag a window to the edge, Windows key + arrow, or the snap layouts on the maximise button.',
        cap='1 min 1 s &middot; a spoken guide with captions &middot; filmed on a clean copy of Windows 11',
        says='Want two windows side by side? Here&rsquo;s how to split your screen in Windows 11, three easy ways. Drag a window by its top bar, right to the edge of the screen, and let go. It fills that half. Windows shows your other windows. Click one, and it fills the other half. Or press the Windows key and the left or right arrow. For more layouts, point at the maximise button, the square at the top right. Pick a layout, and a spot for the window. To go back, press the Windows key and the opposite arrow. So: drag a window to the edge, or press Windows and an arrow key. Need a hand with your PC? We&rsquo;ll sort it remotely. More free guides at 365techies.co.uk.',
        tools=[]),
}

# page -> (film, where it goes, heading or None, intro). "after:<marker>" = straight after the section containing the
# marker; "before:<marker>" = just before the marker. With a heading it is a section of its own; with None it is a figure
# inside the page's article (the article's own headings carry it).
PLACES = {
    "link-safety-checker": ("scam", 'after:id="scamtool"', "Watch: check a scam email, then report it",
                            "This checker in use on a made-up scam email, then where to report scam emails and texts in the UK."),
    "phishing": ("scam", 'before:<section class="how" aria-label="If you have been hit"', "Watch: is this email a scam?",
                 "The warning signs, checking a link without opening it, and where to report it in the UK."),
    "how-to-free-up-storage-space": ("free-up-space", "before:<h2>See what is using the space</h2>", None,
                                     "Watch it done first: Windows 11&rsquo;s own clean-up tools, one at a time."),
    "documents-stuck-in-print-queue": ("print-queue", 'after:id="s1"', "Watch: clear a stuck print queue",
                                       "Windows 11&rsquo;s own Cancel all, filmed start to finish, then what to try if "
                                       "it&rsquo;s still stuck."),
    "stop-programs-starting-with-windows": ("startup", 'after:id="s1"', "Watch: switch off start-up programs",
                                            "Settings, Apps, Startup: sort by impact, switch off what you don&rsquo;t need, "
                                            "and leave the important ones on."),
    "is-someone-remotely-accessing-my-computer": ("remote-access", 'after:id="s1"',
                                                  "Watch: check for remote access, and cut them off",
                                                  "Where remote-control programs show up on a Windows 11 PC, and what to do "
                                                  "if someone did get in."),
    "how-to-scan-a-document": ("techies-pdf", "before:<h2>Key points</h2>", None,
                               "Scanned it? Watch how to join the pages into one PDF, make it small enough to email, and more, "
                               "free in Techies PDF (photos to PDF from 2:01)."),
    "printer-wont-connect-to-ee-smart-hub": ("ee-printer", 'after:id="fixflow"', "Watch: the fix on a real EE hub",
                                             "The whole fix in under 2 minutes: why the printer turns the password down, "
                                             "switching on Compatible WiFi, and joining the printer to it, even one "
                                             "plugged in by USB."),
    "onedrive-taking-up-space": ("onedrive-space", 'after:id="fixflow"', "Watch: free up the space, keep every file",
                                 "The whole fix in 2 minutes on a real OneDrive: Free up space, the one OneDrive setting, "
                                 "and Storage Sense, with Settings showing the space come back."),
    'how-to-take-a-screenshot': ('screenshot', 'before:<h2>Snip just part of the screen</h2>', None,
        'Watch it done first: three ways to take a screenshot on Windows 11, and where to find it afterwards.'),
    'how-to-recover-deleted-files': ('recover-files', 'before:<h2>Where to look first</h2>', None,
        'Watch it done first: the Recycle Bin, Ctrl + Z, and OneDrive&rsquo;s own recycle bin.'),
    'it-jargon-buster/cache': ('clear-history', 'before:<h2>How 365 Techies can help</h2>', None,
        'Watch: clear your browser&rsquo;s cache, cookies and history in Microsoft Edge (Google Chrome uses the same keys).'),
    'it-jargon-buster/cookies': ('clear-history', 'before:<h2>How 365 Techies can help</h2>', None,
        'Watch: clear cookies, cache and history in Microsoft Edge. Clearing cookies signs you out of most websites, so have your passwords handy.'),
    'it-jargon-buster/ip-address': ('ip-address', 'before:<h2>How 365 Techies can help</h2>', None,
        'Watch: find both of your IP addresses on Windows 11, the one on your home network and the public one websites see.'),
    'scam-pop-up-help-poole': ('web-pop-ups', 'after:id="s2"', 'Watch: stop website pop-ups in Edge',
        'Many pop-ups come from websites you once allowed to send notifications. Here&rsquo;s how to switch them off for good in Microsoft Edge.'),
    'why-does-my-pc-keep-crashing': ('frozen-program', 'after:id="fixflow"', 'Watch: one program frozen? Close it',
        'If it&rsquo;s one program that has stopped responding rather than the whole PC, close it with Task Manager, without restarting.'),
    'how-to-update-windows-safely': ('system-restore', 'before:<h2>Stay safe around big updates</h2>', None,
        'Before a big update, switch on System Restore: watch how to turn it on, make a restore point, and undo a bad change.'),
    'cant-open-attachments-in-outlook': ('zip', 'after:id="fixflow"', 'Watch: open a zip file, or zip files to send',
        'Got a .zip attachment? Right-click it and choose Extract all. And to send lots of files at once, zip them into one.'),
    'how-to-set-up-a-second-monitor': ('split-screen', 'before:<h2>Key points</h2>', None,
        'Watch: put two windows side by side in Windows 11, on one screen or across both.'),
}

STYLE = """    <style>
      .hvf{max-width:880px;margin:0 auto}
      .hvf-film{position:relative;aspect-ratio:16/9;border:1px solid rgba(125,170,220,.3);border-radius:14px;overflow:hidden;background:#060c1c;box-shadow:0 18px 50px rgba(0,0,0,.35)}
      .hvf-play{position:absolute;inset:0;display:block;width:100%;height:100%;border:0;padding:0;background:#060c1c;cursor:pointer}
      .hvf-play img{display:block;width:100%;height:100%;object-fit:cover;transition:filter .3s ease}
      .hvf-play:hover img,.hvf-play:focus-visible img{filter:brightness(1.08)}
      .hvf-play>span{position:absolute;right:4%;bottom:6%;display:flex;align-items:center;gap:.6rem;white-space:nowrap;background:rgba(6,12,28,.9);color:#fff;font-weight:700;font-size:1.05rem;padding:.8rem 1.4rem .8rem 1.05rem;border-radius:999px;border:1.5px solid rgba(255,255,255,.25);box-shadow:0 12px 32px rgba(0,0,0,.45);transition:transform .2s ease}
      .hvf-play:hover>span,.hvf-play:focus-visible>span{transform:scale(1.05)}
      .hvf-play svg{width:2rem;height:2rem;flex:none}
      .hvf-play .s{display:none}
      @media (max-width:520px){.hvf-play .l{display:none}.hvf-play .s{display:inline}.hvf-play>span{right:3%;bottom:4%;gap:.45rem;font-size:.85rem;padding:.4rem .8rem .4rem .45rem}.hvf-play svg{width:1.4rem;height:1.4rem}}
      .hvf-film iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
      .hvf .hvf-cap{margin:.5rem 0 0;font-size:.85rem;color:var(--muted);text-align:center}
      .hvf a{color:var(--cyan,#6cc4f5);text-decoration:underline;text-underline-offset:2px}
      .hvf .hvf-says{margin:.7rem 0 0;font-size:.92rem}
      .hvf-says summary{cursor:pointer;color:var(--muted)}
      .hvf .hvf-says p{margin:.5rem 0 0;font-size:.92rem;line-height:1.6}
      .hvf--in{margin:0 0 1.8rem}
      .hvf--in .hvf-intro{margin:0 0 .8rem;font-weight:600}
    </style>
"""

# One copy of the script per block; it finds its own block through document.currentScript.
SCRIPT = ('<script>(function(){var s=document.currentScript,w=s&&s.parentNode,f=w&&w.querySelector("[data-hvf]");if(!f)return;'
          'var b=f.querySelector(".hvf-play");b.addEventListener("click",function(){var i=document.createElement("iframe");'
          'i.setAttribute("allow","accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture");'
          'i.setAttribute("allowfullscreen","");i.setAttribute("title",f.getAttribute("data-title"));'
          'i.src="https://www.youtube-nocookie.com/embed/"+f.getAttribute("data-hvf")+"?autoplay=1&rel=0&playsinline=1&cc_load_policy=1&cc_lang_pref=en";'
          'f.innerHTML="";f.appendChild(i);i.focus();});})();</script>')

# The same for a film that isn't public yet (it has "live"): before that moment the button is off and says when it's
# out, and the "Watch on YouTube" link waits too; once it has passed it plays as normal and the waiting VideoObject
# (type text/plain) is added as real structured data. Films without "live" keep SCRIPT, so their pages don't change.
SCRIPT_LIVE = ('<script>(function(){var s=document.currentScript,w=s&&s.parentNode,f=w&&w.querySelector("[data-hvf]");if(!f)return;'
               'var b=f.querySelector(".hvf-play"),lv=Date.parse(f.getAttribute("data-live")),o=f.getAttribute("data-out"),'
               'y=w.querySelector(".hvf-yt"),d=w.querySelector("script.hvf-ld");'
               'if(Date.now()<lv){b.disabled=true;b.style.cursor="default";b.setAttribute("aria-label","New video, out "+o);'
               'b.querySelector(".l").textContent="New video: out "+o;b.querySelector(".s").textContent="Out "+o.split(",")[0];'
               'if(y){y.removeAttribute("href");y.removeAttribute("target");y.style.cssText="text-decoration:none;color:inherit";y.textContent="On YouTube from "+o;}return;}'
               'if(d){var j=document.createElement("script");j.type="application/ld+json";j.text=d.text;d.parentNode.replaceChild(j,d);}'
               'b.addEventListener("click",function(){var i=document.createElement("iframe");'
               'i.setAttribute("allow","accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture");'
               'i.setAttribute("allowfullscreen","");i.setAttribute("title",f.getAttribute("data-title"));'
               'i.src="https://www.youtube-nocookie.com/embed/"+f.getAttribute("data-hvf")+"?autoplay=1&rel=0&playsinline=1&cc_load_policy=1&cc_lang_pref=en";'
               'f.innerHTML="";f.appendChild(i);i.focus();});})();</script>')


def _is_live(v):
    return "live" not in v or datetime.datetime.now(datetime.timezone.utc) >= datetime.datetime.fromisoformat(v["live"])


def _mins(secs):
    return "%d min %d s" % (secs // 60, secs % 60) if secs % 60 else "%d min" % (secs // 60)


def _node(slug, v):
    words = v["says"]
    for a, b in (("&rsquo;", "'"), ("&pound;", "£"), ("&amp;", "&")):
        words = words.replace(a, b)
    return {"@context": "https://schema.org", "@type": "VideoObject", "@id": "%s/%s/#howto-film" % (bp.SITE, slug),
            "name": v["name"], "description": v["desc"],
            "thumbnailUrl": [bp.SITE + v["poster"], "https://i.ytimg.com/vi/%s/maxresdefault.jpg" % v["id"]],
            "uploadDate": v["uploaded"], "duration": "PT%dM%dS" % (v["secs"] // 60, v["secs"] % 60),
            "embedUrl": "https://www.youtube.com/embed/" + v["id"], "transcript": words, "inLanguage": "en-GB",
            "publisher": {"@id": bp.SITE + "/#business"}}


def _inner(slug, v, intro, heading):
    m = _mins(v["secs"])
    tools = [(s, t) for s, t in v["tools"] if s != slug]
    more = ("        <p class=\"hvf-cap\">Free tools in the film: %s</p>\n"
            % " &middot; ".join('<a href="/%s/">%s</a>' % (s, t) for s, t in tools)) if tools else ""
    head = ('        <h2 id="howto-film-h" style="margin:0 0 .4rem">%s</h2>\n'
            '        <p style="margin:0 0 1rem;color:var(--muted)">%s</p>\n' % (heading, intro)) if heading else \
           '        <p class="hvf-intro">%s</p>\n' % intro
    gated = "live" in v
    ld = json.dumps(_node(slug, v))
    if gated:   # the structured data goes BEFORE the script, which must find it already parsed
        ld = ('<script type="application/ld+json">%s</script>' if _is_live(v) else
              '<script type="text/plain" class="hvf-ld">%s</script>') % ld
    return (head +
        '        <div class="hvf-film" data-hvf="%s" data-title="%s"%s>\n'
        % (v["id"], v["name"], ' data-live="%s" data-out="%s"' % (v["live"], v["out"]) if gated else "") +
        '          <button class="hvf-play" type="button" aria-label="Play the %s video: %s">' % (m, v["name"]) +
        '<img src="%s" width="1280" height="720" alt="" loading="lazy" decoding="async">' % v["poster"] +
        '<span><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#00ce1b"/><path d="M19 15l15 9-15 9z" fill="#fff"/></svg>'
        '<b class="l">Watch the video (%s)</b><b class="s">Watch (%s)</b></span></button>\n' % (m, m) +
        '        </div>\n'
        '        <p class="hvf-cap">%s &middot; <a%s href="https://www.youtube.com/watch?v=%s" target="_blank" rel="noopener">Watch on YouTube</a></p>\n'
        % (v["cap"], ' class="hvf-yt"' if gated else "", v["id"]) + more + v.get("extra", "") +
        '        <details class="hvf-says"><summary>What the video says</summary><p>%s</p></details>\n' % v["says"] +
        ('        ' + ld + '\n        ' + SCRIPT_LIVE + '\n' if gated else
         '        ' + SCRIPT + '\n'
         '        <script type="application/ld+json">%s</script>\n' % ld))


def insert(slug, html):
    """The page filter: the film at its chosen place on the PLACES pages; every other page untouched."""
    if slug not in PLACES or 'id="howto-film"' in html:
        return html
    key, where, heading, intro = PLACES[slug]
    v = VIDEOS[key]
    mode, marker = where.split(":", 1)
    i = html.find(marker)
    if i < 0:
        raise SystemExit("howto_videos: no %r on /%s/" % (marker, slug))
    if heading is None:
        block = '<figure class="hvf hvf--in" id="howto-film">\n' + STYLE + _inner(slug, v, intro, None) + '        </figure>\n'
    else:
        block = ('    <section class="section" id="howto-film" aria-labelledby="howto-film-h">\n' + STYLE +
                 '      <div class="wrap hvf">\n' + _inner(slug, v, intro, heading) + '      </div>\n    </section>\n')
    if mode == "before":
        ls = html.rfind("\n", 0, i) + 1
        if not html[ls:i].strip():   # the marker starts its line: go in above the whole line, indent and all
            i = ls
        return html[:i] + block + html[i:]
    start = html.rfind("<section", 0, i + 1)
    end = _section_end(html, start)
    if end < 0:
        raise SystemExit("howto_videos: section not closed on /%s/" % slug)
    return html[:end] + "\n" + block + html[end:]


bp.PAGE_FILTERS.append(insert)
