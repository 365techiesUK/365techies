"""Shared intent-first page pieces (26 Sep 2026): the styles, icons and review cards used by the
homepage-style layout on the Dell pages, the refurbished pages and the service pages. One copy,
imported by build_extra.py and build_pages.py. Reviews always come from reviews_data (the build
checks every quote)."""
import html as _dh_html
from reviews_data import pick

DELL_HUB_CSS = """
.dh{--hp-card:rgba(13,23,49,.66);--hp-card-hi:rgba(20,33,68,.78);--hp-edge:rgba(125,170,220,.17);--hp-edge-hi:rgba(125,190,240,.42);--hp-ink:#f2f8ff;--hp-body:#cbdcf1;--hp-soft:#9fb5d3;--hp-dark:#03101f}
.dh *{box-sizing:border-box}
.dh .hp-ico{--s:52px;flex:none;display:grid;place-items:center;width:var(--s);height:var(--s);border-radius:calc(var(--s)*.3);background:linear-gradient(145deg,var(--c2),var(--c1) 58%,color-mix(in srgb,var(--c1) 70%,#000));box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 -6px 12px rgba(0,0,0,.18),0 10px 22px -10px color-mix(in srgb,var(--c1) 80%,transparent);color:#fff}
.dh .hp-ico svg{width:52%;height:52%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.dh .hp-ico--sm{--s:34px}
.dh .hp-c-fix{--c1:#1d97e3;--c2:#79d0ff}.dh .hp-c-care{--c1:#0fb34a;--c2:#7af08e}.dh .hp-c-buy{--c1:#e59a00;--c2:#ffd978}.dh .hp-c-biz{--c1:#5b6cf0;--c2:#b3bcff}.dh .hp-c-teal{--c1:#0f9fa8;--c2:#79e6ec}
.dh a:focus-visible{outline:2px solid var(--cyan-soft);outline-offset:3px}
.dh-in{max-width:1180px;margin-inline:auto}
.dh-sec{padding-block:clamp(2.8rem,6vw,4.6rem);padding-inline:var(--pad-x)}
.dh-kicker{font-family:var(--font-mono);font-size:.74rem;letter-spacing:.14em;text-transform:uppercase;color:var(--cyan-soft);margin:0 0 .7rem}
.dh-h2{font-family:var(--font-display);font-weight:600;font-size:clamp(1.75rem,3.2vw,2.6rem);line-height:1.08;letter-spacing:-.012em;margin:0;color:var(--hp-ink);text-wrap:balance}
.dh-lede{margin:.75rem 0 0;max-width:60ch;color:var(--hp-body);font-size:1.03rem;line-height:1.6}
.dh-link{display:inline-flex;align-items:center;gap:.35rem;font-weight:600;font-size:.95rem;color:var(--cyan-soft);text-decoration:none}
.dh-link:hover{color:#fff}
.dh-btn{display:inline-flex;align-items:center;gap:.5rem;padding:.85rem 1.3rem;border-radius:999px;font-weight:700;font-size:.97rem;text-decoration:none;color:var(--hp-dark);background:linear-gradient(135deg,var(--c2),var(--c1));box-shadow:0 12px 26px -14px var(--c1),inset 0 1px 0 rgba(255,255,255,.4);transition:transform .2s}
.dh-btn:hover{transform:translateY(-2px)}
/* hero: headline left, the four choices right */
.dh-hero.page-hero{padding-bottom:clamp(2rem,4vw,3rem)}
.dh-hero__grid{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.04fr);gap:clamp(1.5rem,4vw,3.2rem);align-items:center}
.dh-hero.page-hero h1{font-size:clamp(2rem,3.7vw,3.1rem);margin-bottom:1rem}
.dh-hero .lede{margin:0;font-size:clamp(1rem,1.5vw,1.15rem);color:var(--hp-body)}
.dh-hero .page-hero__cta{margin-top:1.4rem;gap:.7rem}
.dh-rating{display:flex;flex-wrap:wrap;gap:.3rem 1rem;align-items:center;margin-top:1.1rem;font-size:.9rem;color:var(--hp-soft);text-decoration:none}
.dh-rating strong{color:var(--hp-ink)}
.dh-rating span[aria-hidden]{color:var(--gold);letter-spacing:.08em}
.dh .hp-intents{margin:0;padding:1.1rem;border-radius:28px;border:1px solid var(--hp-edge);background:linear-gradient(160deg,rgba(18,30,64,.62),rgba(8,15,34,.7));-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:0 40px 80px -40px rgba(0,0,0,.8)}
.dh .hp-intents__q{margin:.1rem .2rem .85rem;font-family:var(--font-display);font-weight:600;font-size:1.2rem;color:var(--hp-ink)}
.dh .hp-intents__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}
.dh .hp-intent{position:relative;display:flex;flex-direction:column;gap:.35rem;padding:1.05rem 1.1rem 1rem;border-radius:20px;border:1px solid var(--hp-edge);background:radial-gradient(120% 90% at 100% 0%,color-mix(in srgb,var(--c1) 17%,transparent),transparent 62%),var(--hp-card);text-decoration:none;color:var(--hp-body);transition:transform .22s cubic-bezier(.2,.8,.2,1),border-color .22s,box-shadow .22s}
.dh .hp-intent .hp-ico{margin-bottom:.45rem}
.dh .hp-intent__t{font-family:var(--font-display);font-weight:600;font-size:1.14rem;line-height:1.2;color:var(--hp-ink)}
.dh .hp-intent__d{font-size:.9rem;line-height:1.45}
.dh .hp-intent__p{margin-top:auto;padding-top:.5rem;font-family:var(--font-mono);font-size:.72rem;letter-spacing:.05em;color:color-mix(in srgb,var(--c2) 85%,#fff)}
.dh .hp-intent:hover,.dh .hp-intent:focus-visible{transform:translateY(-4px);border-color:color-mix(in srgb,var(--c1) 60%,transparent);box-shadow:0 22px 44px -22px color-mix(in srgb,var(--c1) 85%,transparent)}
.dh-quick{max-width:1180px;margin:clamp(1.2rem,2.4vw,1.8rem) auto 0;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .6rem;font-size:.88rem;color:var(--hp-soft)}
.dh-quick a{display:inline-flex;align-items:center;gap:.4rem;padding:.4rem .75rem;border-radius:999px;border:1px solid var(--hp-edge);background:rgba(9,18,40,.55);color:#dfe9f7;font-weight:600;text-decoration:none}
.dh-quick a svg{width:15px;height:15px;flex:none;color:var(--cyan-soft)}
.dh-quick a:hover{border-color:var(--hp-edge-hi);background:rgba(29,151,227,.12)}
/* proof */
.dh-proof{padding-block:clamp(1rem,2.4vw,1.8rem)}
.dh-proof .dh-in{border-block:1px solid var(--hp-edge);padding-block:clamp(1.2rem,2.4vw,1.7rem)}
.dh-facts{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem}
.dh-facts li{display:flex;flex-direction:column;gap:.2rem;padding-left:1rem;border-left:2px solid color-mix(in srgb,var(--c1) 70%,transparent)}
.dh-facts b{font-family:var(--font-display);font-weight:600;font-size:clamp(1.6rem,2.8vw,2.2rem);line-height:1;color:var(--hp-ink)}
.dh-facts b i{font-style:normal;color:var(--gold);font-size:.7em}
.dh-facts span{font-size:.88rem;color:var(--hp-soft);line-height:1.35}
.dh-indep{margin:1rem 0 0;font-size:.9rem;line-height:1.6;color:var(--hp-soft);max-width:80ch}
.dh-indep strong{color:var(--hp-body)}
/* refurbished machines */
.dh-buy{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:clamp(1.5rem,4vw,3.2rem);align-items:start}
@media (min-width:961px){.dh-photo{position:sticky;top:calc(var(--header-h) + var(--ticker-h) + 1.5rem)}}
.dh-photo{margin:0}
.dh-photo__frame{display:block;border-radius:22px;overflow:hidden;background:#f3f4f6;box-shadow:0 30px 60px -30px rgba(0,0,0,.8);border:1px solid rgba(255,255,255,.12)}
.dh-photo img{display:block;width:100%;height:auto}
.dh-photo figcaption{margin-top:.65rem;font-size:.8rem;line-height:1.5;color:var(--hp-soft)}
.dh-photo figcaption a{color:var(--cyan-soft);font-weight:600}
.dh-steps{list-style:none;margin:1.3rem 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.7rem;counter-reset:dhs}
.dh-steps li{counter-increment:dhs;position:relative;padding:2.4rem .9rem .9rem;border-radius:16px;border:1px solid var(--hp-edge);background:var(--hp-card)}
.dh-steps li::before{content:counter(dhs);position:absolute;left:.9rem;top:.85rem;width:1.35rem;height:1.35rem;border-radius:50%;display:grid;place-items:center;font:700 .75rem var(--font-mono);color:var(--hp-dark);background:linear-gradient(135deg,#ffd978,#e59a00)}
.dh-steps b{display:block;font-size:.92rem;color:var(--hp-ink)}
.dh-steps span{display:block;margin-top:.2rem;font-size:.8rem;line-height:1.4;color:var(--hp-soft)}
.dh-machines{list-style:none;margin:1.2rem 0 0;padding:0;display:grid;gap:.5rem}
.dh-machines a{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:.2rem 1rem;padding:.75rem 1rem;border-radius:14px;border:1px solid var(--hp-edge);background:var(--hp-card);text-decoration:none;transition:border-color .2s,transform .2s}
.dh-machines a:hover{border-color:rgba(255,217,120,.5);transform:translateX(3px)}
.dh-machines b{font-family:var(--font-display);font-weight:600;font-size:1.02rem;color:var(--hp-ink)}
.dh-machines small{grid-column:1;font-size:.82rem;color:var(--hp-soft)}
.dh-machines em{grid-row:1 / span 2;grid-column:2;font-style:normal;text-align:right;font-family:var(--font-display);font-weight:600;font-size:1.2rem;color:#ffd978}
.dh-machines em span{display:block;font-family:var(--font-mono);font-size:.66rem;letter-spacing:.1em;color:var(--hp-soft)}
.dh-ticks{list-style:none;margin:1.1rem 0 0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem 1rem}
.dh-ticks li{position:relative;padding-left:1.6rem;font-size:.93rem;line-height:1.45;color:var(--hp-body)}
.dh-ticks li::before{content:"\\2713";position:absolute;left:0;top:0;color:#39d353;font-weight:700}
.dh-buy__cta{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem 1.2rem;margin-top:1.3rem}
.dh-small{margin:.8rem 0 0;font-size:.8rem;color:var(--hp-soft)}
/* reviews */
.dh-quotes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;margin-top:1.4rem}
.dh-quote{margin:0;padding:1.2rem 1.25rem;border-radius:20px;border:1px solid var(--hp-edge);background:var(--hp-card);display:flex;flex-direction:column;gap:.6rem}
.dh-quote p{margin:0;color:var(--gold);letter-spacing:.08em;font-size:.95rem}
.dh-quote blockquote{margin:0;font-size:.95rem;line-height:1.55;color:#dbe7f6}
.dh-quote figcaption{margin-top:auto;font-size:.8rem;color:var(--hp-soft)}
.dh-quote figcaption strong{color:#dfe9f7}
/* the Dell index: open on desktop, folded into groups on phones (same idea as the phone footer) */
.dh-chips{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:1.1rem}
.dh-chips a{padding:.34rem .7rem;border-radius:999px;border:1px solid var(--hp-edge);font-family:var(--font-mono);font-size:.72rem;letter-spacing:.06em;color:#bcd0ea;text-decoration:none}
.dh-chips a:hover{border-color:var(--hp-edge-hi);color:#fff}
.dh-index{margin-top:1.6rem;columns:3 300px;column-gap:2.2rem}
.dh-fold{break-inside:avoid;margin:0 0 1.5rem}
.dh-fold summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:.8rem;cursor:auto;font-family:var(--font-display);font-weight:600;font-size:1.02rem;line-height:1.3;color:var(--hp-ink);padding-bottom:.55rem;margin-bottom:.55rem;border-bottom:1px solid var(--hp-edge)}
.dh-fold summary::-webkit-details-marker{display:none}
.dh-fold summary small{font-family:var(--font-mono);font-size:.7rem;font-weight:400;color:var(--hp-soft);white-space:nowrap}
.dh-fold ul{list-style:none;margin:0;padding:0;display:grid;gap:.4rem}
.dh-fold a{font-size:.9rem;line-height:1.4;color:#c8d8ee;text-decoration:none}
.dh-fold a:hover{color:#fff;text-decoration:underline}
@media (max-width:960px){
  .dh-hero__grid,.dh-buy{grid-template-columns:1fr}
  .dh-buy .dh-photo{order:2}
  .dh-facts{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:1.1rem}
  .dh-quotes{grid-template-columns:1fr}
}
@media (max-width:767px){
  .dh .hp-intents{padding:0;border:0;background:none;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
  .dh .hp-intents__grid{gap:.6rem}
  .dh .hp-intent{padding:.85rem .85rem .8rem;border-radius:18px}
  .dh .hp-intent .hp-ico{--s:42px;margin-bottom:.25rem}
  .dh .hp-intent__t{font-size:1rem}
  .dh .hp-intent__d{font-size:.82rem}
  .dh-ticks{grid-template-columns:1fr}
  .dh-steps{grid-template-columns:1fr}
  .dh-steps li{padding:.8rem .9rem .8rem 2.8rem}
  .dh-steps li::before{top:.85rem}
  .dh-chips{display:none}
  .dh-index{columns:1}
  .dh-fold{margin:0;border-bottom:1px solid var(--hp-edge)}
  .dh-fold summary{cursor:pointer;border:0;margin:0;padding:.95rem 0}
  .dh-fold summary::after{content:"+";font-family:var(--font-mono);color:var(--cyan-soft);font-size:1.1rem}
  .dh-fold[open] summary::after{content:"\\2212"}
  .dh-fold ul{padding-bottom:1rem}
}
@media (prefers-reduced-motion:reduce){.dh .hp-intent,.dh-btn,.dh-machines a{transition:none}}
"""

_DH_A = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'

_DH_ICONS = {
    "wrench": '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    "monitor": '<rect x="2" y="3.5" width="20" height="13.5" rx="2.5"/><path d="M8 21h8M12 17v4"/>',
    "shield": '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M9 12l2 2 4-4"/>',
    "laptop": '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.3 2.6a1 1 0 0 1-.9 1.4H3.6a1 1 0 0 1-.9-1.4L4 16"/>',
    "briefcase": '<rect x="2.5" y="7" width="19" height="14" rx="2.5"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M2.5 13h19"/>',
    "alert": '<path d="M21.7 18l-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>',
    "clock": '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
    "book": '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2.5z"/><path d="M8 7h8M8 11h6"/>',
    "user": '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
    "star": '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/>',
    "phone": '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    "power": '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
    "bug": '<rect x="7" y="7" width="10" height="13" rx="5"/><path d="M12 7V4M9 4l1.5 2M15 4l-1.5 2M3 13h4M17 13h4M4 8l3 2M20 8l-3 2M4 19l3-2M20 19l-3-2"/>',
    "gauge": '<path d="M12 14l4-4"/><path d="M3.5 18a9 9 0 1 1 17 0"/>',
    "home": '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    "calendar": '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    "wifi": '<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01"/>',
    "mail": '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="M3 6l9 7 9-7"/>',
    "cloud": '<path d="M7 18a4.5 4.5 0 0 1-.8-8.9A6 6 0 0 1 17.8 9.5 4 4 0 0 1 17 18z"/>',
}


def _dh_ico(name):
    return '<svg viewBox="0 0 24 24" %s aria-hidden="true" focusable="false">%s</svg>' % (_DH_A, _DH_ICONS[name])


def _dell_hub_quotes(*names):
    """Review cards from reviews_data (never retyped: the build checks every quote against it)."""
    out = []
    for q, n in pick(*names):
        out.append('          <figure class="dh-quote"><p aria-label="Rated 5 out of 5">&#9733;&#9733;&#9733;&#9733;&#9733;</p>'
                   f'<blockquote>&ldquo;{_dh_html.escape(q, quote=False)}&rdquo;</blockquote>'
                   f'<figcaption><strong>{_dh_html.escape(n, quote=False)}</strong> &middot; Google review</figcaption></figure>')
    return "\n".join(out)


# ============================================ EMAIL MOVE BOX + CHOICE TILES (26 Sep 2026)
# The owner's price for moving someone's email off a closing provider (Virgin Media and its old brands
# blueyonder / ntlworld / virgin.net, and Plusnet) into Gmail: GBP 60 per email address, agreed before we
# start, whichever route the job needs. One box, used by /move-virgin-media-email-to-gmail/, the Junara page
# and /email-support/, so the price and promises can never drift apart between them.
EMAIL_MOVE_TICKS = ("Every message and folder copied into Gmail",
                    "Forwarding set up while the old address still works",
                    "Checked on your computer, and your phone if you like",
                    "Done remotely: we phone first, and you watch every step")
EMAIL_MOVE_SMALL = "Agreed before we start &middot; no fix, no fee &middot; usually the same day, Mon&ndash;Fri 9&ndash;5"
_EMAIL_MOVE_CSS = """      .vm-offer{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:1.1rem;margin-top:1.2rem}
      .vm-price{padding:1.4rem 1.4rem 1.3rem;border-radius:24px;border:1px solid transparent;background:radial-gradient(90% 70% at 100% 0%,rgba(15,179,74,.18),transparent 65%) padding-box,linear-gradient(#0c1630,#0c1630) padding-box,linear-gradient(135deg,#7af08e,#0fb34a 45%,#1d97e3) border-box;box-shadow:0 34px 70px -38px rgba(15,179,74,.6)}
      .vm-price__num{display:flex;align-items:baseline;gap:.5rem;margin:0}
      .vm-price__num b{font-family:var(--font-display);font-weight:600;font-size:clamp(2.6rem,5vw,3.4rem);line-height:1;color:#fff}
      .vm-price__num span{color:var(--hp-soft);font-size:1rem}
      .vm-ticks{grid-template-columns:1fr;margin-top:1rem}
      .vm-alt{padding:1.3rem 1.35rem;border-radius:24px;border:1px solid var(--hp-edge);background:var(--hp-card)}
      .vm-alt p{margin:0 0 .8rem;font-size:.93rem;line-height:1.55;color:var(--hp-body)}
      .vm-alt .vm-alt__h{margin:0 0 .35rem;font-family:var(--font-display);font-weight:600;font-size:1.05rem;color:var(--hp-ink)}
      @media (max-width:860px){.vm-offer{grid-template-columns:1fr}}"""


def email_move_box(kicker, h2, alt_lines, ticks=EMAIL_MOVE_TICKS, small=EMAIL_MOVE_SMALL):
    """The GBP 60 'we move it for you' box (id move-for-me): price and ticks on the left, alt_lines (the
    other choices, as <p> lines) on the right."""
    lis = "\n".join("              <li>" + t + "</li>" for t in ticks)
    alt = "\n".join("            " + l for l in alt_lines)
    return ('    <section class="dh dh-sec" id="move-for-me" aria-labelledby="move-for-me-title">\n'
            '      <div class="dh-in">\n'
            '        <p class="dh-kicker">' + kicker + '</p>\n'
            '        <h2 class="dh-h2" id="move-for-me-title">' + h2 + '</h2>\n'
            '        <div class="vm-offer">\n'
            '          <div class="vm-price hp-c-care">\n'
            '            <p class="vm-price__num"><b>&pound;60</b><span>per email address</span></p>\n'
            '            <ul class="dh-ticks vm-ticks">\n' + lis + '\n'
            '            </ul>\n'
            '            <p class="dh-small">' + small + '</p>\n'
            '            <div class="dh-buy__cta"><a class="dh-btn" href="tel:+441202775566">Call 01202 775566</a>'
            '<a class="dh-link" href="sms:+447520615332">Or text 07520 615332</a></div>\n'
            '          </div>\n'
            '          <div class="vm-alt">\n' + alt + '\n'
            '          </div>\n'
            '        </div>\n'
            '      </div>\n'
            '      <style>\n' + _EMAIL_MOVE_CSS + '\n'
            '      </style>\n'
            '    </section>')


def intent_tiles(tiles, indent="            "):
    """Choice tiles that go somewhere: (colour class, icon, title, line, tag, href)."""
    return "\n".join(
        indent + f'<a class="hp-intent {c}" href="{href}"><span class="hp-ico">{_dh_ico(i)}</span><span class="hp-intent__t">{t}</span>'
        f'<span class="hp-intent__d">{dd}</span><span class="hp-intent__p">{p}</span></a>'
        for c, i, t, dd, p, href in tiles)


# ============================================ SHARED FIRST SCREEN (26 Sep 2026)
# The intent-first first screen used across the site (homepage v3 standard): breadcrumb, H1, the page's own
# lede, call first, the rating line, and four choice tiles beside it. build_extra's _email_hero is the same
# markup; this copy lets build_pages / build_local pages use it without importing build_extra.
def intent_hero(crumbs, eyebrow, h1, lede, cta1, cta2, tiles, question="What would you like to do?",
                rating_note="Family-run since 1995 &middot; no fix, no fee"):
    css = " ".join(l.strip() for l in DELL_HUB_CSS.strip().splitlines())
    return f'''    <style>{css}</style>
    <section class="page-hero dh dh-hero" aria-label="Introduction">
      <div class="dh-hero__grid">
        <div>
          <nav class="breadcrumb" aria-label="Breadcrumb">{crumbs}</nav>
          <p class="eyebrow mono">{eyebrow}</p>
          <h1>{h1}</h1>
          <p class="lede">{lede}</p>
          <div class="page-hero__cta">
            <a href="{cta1[1]}" class="button primary button--lg">{cta1[0]}</a>
            <a href="{cta2[1]}" class="button secondary button--lg">{cta2[0]}</a>
          </div>
          <a class="dh-rating" href="/reviews/"><span><span aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span> <strong>Rated 4.9 on Google</strong></span><span>{rating_note}</span></a>
          <p class="page-hero__byline mono"><span class="page-hero__byline-by">By the </span><a href="/meet-the-team/">365 Techies team</a> &middot; Reviewed __LASTMOD_HUMAN__</p>
        </div>
        <nav class="hp-intents" aria-label="{question}">
          <p class="hp-intents__q">{question}</p>
          <div class="hp-intents__grid">
{intent_tiles(tiles)}
          </div>
        </nav>
      </div>
    </section>'''


def proof_strip(items):
    """Four facts under the first screen: (colour class, big figure, small line)."""
    lis = "\n".join(f'          <li class="{c}"><b>{b}</b><span>{s}</span></li>' for c, b, s in items)
    return f'''    <section class="dh dh-sec dh-proof" aria-label="Why people choose us">
      <div class="dh-in">
        <ul class="dh-facts">
{lis}
        </ul>
      </div>
    </section>'''


def quotes_block(kicker, h2, *names):
    """Three review cards from reviews_data (the build checks every quote against it)."""
    return f'''    <section class="dh dh-sec" aria-label="Reviews">
      <div class="dh-in">
        <p class="dh-kicker">{kicker}</p>
        <h2 class="dh-h2">{h2}</h2>
        <div class="dh-quotes">
{_dell_hub_quotes(*names)}
        </div>
        <p style="margin:1.1rem 0 0"><a class="dh-link" href="/reviews/">Read more reviews &#8594;</a></p>
      </div>
    </section>'''
