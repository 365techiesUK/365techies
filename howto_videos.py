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
        id="R7CE9j62tHs", secs=115, uploaded="2026-10-20", poster="/images/howto-ee-printer-poster-v1.jpg",
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
    "printer-wont-connect-to-ee-smart-hub": ("ee-printer", 'after:id="fixflow"', "Watch: the fix on a real EE hub",
                                             "The whole fix in under 2 minutes: why the printer turns the password down, "
                                             "switching on Compatible WiFi, and joining the printer to it, even one "
                                             "plugged in by USB."),
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
