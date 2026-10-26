"""Watch-it-on-YouTube buttons (19 Oct 2026). Owner: "on our high traffic pages ... have we got it so our YouTube videos are
on there, so we get views on our YouTube from there?" - the busy pages played self-hosted copies, which earn the channel
nothing. A button here opens the YouTube video in one pop-up player (youtube-nocookie, click-to-play: nothing loads and no
cookie is set until it's pressed), so every play is a view on the channel.

The 9-second silent clips stay as the moving preview; the button sits under them and offers the voiced YouTube version.
A video with "live" (scheduled on YouTube, not out yet) keeps its button hidden until that time: the script shows it once
the time has passed, so no rebuild is needed on the day. The HTML is the same whenever the page is built (the button is
always written hidden), so a rebuild never changes a page's content hash.

⚠ A "live" time must never be EARLIER than YouTube's real publish time (a button would open a private video). For a
schedule after the clocks go back (25 Oct 2026) the time is written in GMT (+00:00): if Studio stored "Local Time"
(GMT+01:00) the video is out an hour before the button, never after.
"""
import html

# The 365 PC Manager 36.5 problem Shorts (reels/pcm-365-2026-10-18, the Chatterbox voice), keyed by the 9-second clip they
# match (images/pcm-clip-<key>.mp4). Scheduled by the owner for 12:00 (checked in Studio, 18 Oct).
# key: (YouTube id, seconds, live, title)
# ⚠ 26 Oct 2026: startup, remote and windows were re-made (the v3 redo, reels/shorts-redo-2026-10-26) and swapped into the
# same slots as NEW uploads; the old copies went private and the owner deletes them. A swap always means a new id here.
PCM_SHORTS = {
    "battery": ("C4PH6jjz3M8", 23, "2026-10-21T12:00:00+01:00", "Laptop Battery Worn Out? See How Much Charge It Really Holds"),
    "isitdown": ("0Q6_z8NGpg4", 27, "2026-10-23T12:00:00+01:00", "Is It Down, or Just You? Check Both Ends at Once"),
    "printers": ("SU95a-qFKEQ", 27, "2026-10-25T12:00:00+00:00", "Printer Stuck? Clear the Print Queue in One Click"),
    "startup": ("bxOmIs-dENY", 28, "2026-10-27T12:00:00+00:00", "PC Slow to Start? See What Starts With Windows"),
    "remote": ("jVAjtBp7Y0w", 31, "2026-10-29T12:00:00+00:00", "Is Someone Connected to Your PC? Check in Seconds"),
    "windows": ("f-oSGkTWx58", 31, "2026-10-31T12:00:00+00:00", "Still on Windows 10? Check Where You Stand"),
    "devices": ("Q-PDQCw1D3E", 28, "2026-11-02T12:00:00+00:00", "What's Actually on Your Wi-Fi? Find Every Device"),
    "shares": ("fWhESteHDk8", 29, "2026-11-04T12:00:00+00:00", "Shared Folder or Network Drive Won't Open? Find Out Why"),
    "officelicence": ("DOPM26kIBfQ", 26, "2026-11-06T12:00:00+00:00", "Word or Excel Says \"Unlicensed Product\"? Here's Why"),
    "gaming": ("fhaF9cUdILQ", 28, "2026-11-08T12:00:00+00:00", "Games Running Slow? Check What's Costing Frames"),
    "alarm": ("7lovougDN4w", 25, "2026-11-10T12:00:00+00:00", "Can Your Laptop Wake You Up? Yes, Here's How"),
}
# The full 365 PC Manager tour (4:54), scheduled by the owner for Thu 29 Oct 11:00.
PCM_TOUR = ("y9far6n8Vr0", 294, "2026-10-29T11:00:00+00:00", "365 PC Manager: the Free PC Health Check App for Windows (Full Tour)")
# The Techies One film (1:51, public since 18 Oct): the same cut as images/t1-suite-film-v1.mp4.
T1_FILM = ("AqKPq0a-qNo", 111, None, "Techies One: free email, letters, sums and files in one simple Windows program")
# The Virgin Media -> Junara Short (37.6 s, reels/shorts-2026-10-15 info-a; facts re-checked on Virgin's page 19 Oct 2026).
# Owner, 19 Oct: "Publish the private Junara Short and add it to the page".
# The Spec Checker Short (30.9 s, reels/shorts-2026-10-15 cuts: the checker + its benchmark on a real PC; matched against
# js/spec-checker.js 19 Oct) - made PUBLIC 19 Oct (owner: "put that short live ... get views ... when people go to our
# page") - and the full PC specs how-to it is cut from (1:47, public since 14 Oct).
SPEC_SHORT = ("_GVi_FQNeAM", 31, None, "Check Your PC Free and Score It Out of 100")
PC_SPECS_FILM = ("T3t0g2Z9DVI", 107, None, "How to Check Your PC Specs - 3 Free Ways (Windows 11)")
# 19 Oct: the owner SCHEDULED it for Tue 20 Oct 12:00 (checked in Studio) rather than publishing it straight away.
JUNARA_SHORT = ("phVgRXXbePs", 38, "2026-10-20T12:00:00+01:00", "Virgin Media Email Is Moving to Junara: What to Do")

PLAY = ('<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#ff0033"/>'
        '<path d="M19 15l15 9-15 9z" fill="#fff"/></svg>')

STYLE = ('<style>.ytw{display:inline-flex;align-items:center;gap:.55rem;max-width:100%;box-sizing:border-box;margin:.65rem 0 0;'
         'padding:.45rem 1rem .45rem .5rem;border-radius:999px;border:1px solid rgba(29,151,227,.55);background:rgba(29,151,227,.12);'
         'color:inherit;font-weight:700;font-size:.9rem;line-height:1.3;text-decoration:none;transition:background .2s ease,border-color .2s ease}'
         '.ytw[hidden]{display:none!important}.ytw svg{width:1.6rem;height:1.6rem;flex:none}'
         '.ytw:hover,.ytw:focus-visible{background:rgba(29,151,227,.26);border-color:#1d97e3}'
         '.ytw-dlg{padding:0;border:0;border-radius:16px;background:#060c1c;max-width:none;max-height:none;overflow:visible}'
         '.ytw-dlg::backdrop{background:rgba(2,6,16,.84)}'
         '.ytw-dlg__v{border-radius:16px;overflow:hidden;background:#060c1c}'
         '.ytw-dlg__v--tall{width:min(92vw,calc(86vh * 9 / 16),506px);aspect-ratio:9/16}'
         '.ytw-dlg__v--wide{width:min(94vw,calc(84vh * 16 / 9),1100px);aspect-ratio:16/9}'
         '.ytw-dlg__v iframe{display:block;width:100%;height:100%;border:0}'
         '.ytw-dlg__x{position:absolute;top:-.7rem;right:-.7rem;z-index:1;width:2.75rem;height:2.75rem;border-radius:50%;'
         'border:1.5px solid rgba(255,255,255,.4);background:#0b1430;color:#fff;font-size:1.7rem;line-height:1;cursor:pointer}'
         '.ytw-dlg__x:hover,.ytw-dlg__x:focus-visible{background:#1d97e3}</style>')

# Runs once per page however many buttons it has (window.__ytw): shows each button whose time has come, and opens the
# one pop-up player (made on first use) instead of leaving the page. Esc, the X or a click outside closes it and stops it.
SCRIPT = ('<script>(function(){if(window.__ytw)return;window.__ytw=1;'
          'function go(){var now=Date.now();document.querySelectorAll("a[data-ytw]").forEach(function(a){'
          'var l=a.getAttribute("data-ytw-live");if(l&&now<Date.parse(l))return;a.hidden=false;'
          'a.addEventListener("click",function(e){var d=dlg();if(!d.showModal)return;e.preventDefault();play(d,a);});});}'
          'function dlg(){var d=document.getElementById("ytwdlg");if(d)return d;d=document.createElement("dialog");d.id="ytwdlg";'
          'd.className="ytw-dlg";d.setAttribute("aria-label","Video");'
          'd.innerHTML=\'<button type="button" class="ytw-dlg__x" aria-label="Close the video">&times;</button><div class="ytw-dlg__v"></div>\';'
          'document.body.appendChild(d);if(!d.showModal)return d;d.querySelector(".ytw-dlg__x").addEventListener("click",function(){d.close();});'
          'd.addEventListener("click",function(e){if(e.target===d)d.close();});'
          'd.addEventListener("close",function(){d.querySelector(".ytw-dlg__v").innerHTML="";});return d;}'
          'function play(d,a){var v=d.querySelector(".ytw-dlg__v"),id=a.getAttribute("data-ytw"),i=document.createElement("iframe");'
          'v.className="ytw-dlg__v ytw-dlg__v--"+(a.getAttribute("data-ytw-shape")||"wide");'
          'i.src="https://www.youtube-nocookie.com/embed/"+id+"?autoplay=1&rel=0&playsinline=1";i.title=a.getAttribute("data-ytw-title");'
          'i.setAttribute("allow","accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture");'
          'i.setAttribute("allowfullscreen","");v.innerHTML="";v.appendChild(i);d.showModal();}'
          'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();})();</script>')


# The EE hub printer Short (27 s, reels/ee-printer-howto-2026-10-20, John Sims' real hub with the network names hidden),
# under the full EE film on /printer-wont-connect-to-ee-smart-hub/ (howto_videos "ee-printer"). Uploaded 20 Oct 2026.
EE_SHORT = ("cX0HoFSRIfI", 27, None, "Printer says your EE wifi password is wrong?")


# The Techies PDF how-to film (3:06, reels/techies-pdf-howto-2026-10-19, the real program on made-up documents), in the
# /techies-pdf/ hero. Uploaded full quality 21 Oct 2026; techies_pdf_page carries its VideoObject.
TPDF_FILM = ("Jd0PrHSWJQc", 186, None, 'Free PDF Editor for Windows 11: Sign, Merge, Split & Compress PDFs')


# 23 Oct 2026: the classic Outlook Short, under the film on /download-classic-outlook/ and the switch-back page
CLASSIC_OUTLOOK_SHORT = ("v-rXygnZhak", 25, None, "No Classic Outlook on Your New PC? Here's Where to Get It")


def length(secs):
    """'27-second' / '4-minute' style wording for a button."""
    return "%d-second" % secs if secs < 90 else "%d-minute" % round(secs / 60)


def button(video, label, shape="wide"):
    """A link to the video on YouTube (it works without the script); the script opens it in the pop-up instead. A video
    that isn't out yet is written hidden, with its time, and shown by the script once that time has passed."""
    vid, secs, live, title = video
    href = ("https://www.youtube.com/shorts/" if shape == "tall" else "https://www.youtube.com/watch?v=") + vid
    when = ' data-ytw-live="%s" hidden' % live if live else ""
    return ('<a class="ytw" href="%s" target="_blank" rel="noopener" data-ytw="%s" data-ytw-shape="%s" data-ytw-title="%s"%s>'
            '%s<span>%s</span></a>%s%s' % (href, vid, shape, html.escape(title + " (YouTube)"), when, PLAY, label, STYLE, SCRIPT))


def pcm_short(clip):
    """The button under a 365 PC Manager 9-second clip, or '' if that clip has no YouTube Short."""
    v = PCM_SHORTS.get(clip)
    return button(v, "Watch the %s video, with sound" % length(v[1]), shape="tall") if v else ""
