"""The battery health checker on /how-to-check-laptop-battery-health/ (19 Oct 2026). Owner: "do the battery health tool and
Short" - after the 19 Oct growth read ([[app-growth-read-2026-10-19]]): our free browser tools are what earn traffic and lead
into the apps, and "how to check laptop battery health" is 11,411 UK / 176,651 worldwide Bing searches a quarter.

The page already explains Windows' battery report (powercfg /batteryreport). This adds the step after it: drop the report
on the page and it is read IN THE BROWSER (js/battery-report.js, FileReader + DOMParser) - health, charge cycles, how fast
it's wearing, and Windows' own running-time estimate now against new. Nothing is uploaded; the only thing sent is an
anonymous "a report was read" analytics event with no battery figures in it.
The markup works without JavaScript (the two numbers can still be read off the report by hand; the page says how)."""
import hashlib, os

# the same content-hash cache-bust as build_pages._jsv (line endings folded to LF), worked out here so this module never
# depends on build_pages being imported first
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "js", "battery-report.js"), "rb") as _f:
    BATTV = hashlib.sha1(_f.read().replace(b"\r\n", b"\n")).hexdigest()[:8]

BATT_TOOL = """<div class="brc" id="check">
<style>
.brc{scroll-margin-top:calc(var(--header-h,72px) + var(--ticker-h,0px) + 2rem);max-width:980px}
.brc-drop{position:relative;display:flex;flex-direction:column;align-items:center;gap:.7rem;padding:1.6rem 1.2rem;border-radius:18px;
  border:2px dashed rgba(108,196,245,.55);background:linear-gradient(135deg,rgba(29,151,227,.10),rgba(255,255,255,.02));text-align:center;transition:background .2s,border-color .2s}
.brc-drop.is-over{border-color:var(--green);background:rgba(0,206,27,.10)}
.brc-drop svg{width:2.6rem;height:2.6rem;color:var(--cyan-soft)}
.brc-drop__big{margin:0;font-family:var(--font-display);font-weight:600;font-size:clamp(1.15rem,2.6vw,1.45rem);line-height:1.25;color:var(--ink)}
.brc-drop__or{margin:0;color:var(--muted);font-size:.9rem}
.brc-drop .button{cursor:pointer}
.brc-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.brc-priv{margin:.2rem 0 0;font-size:.86rem;color:var(--ink-3)}
.brc-priv b{color:var(--green-soft)}
.brc-manual{margin:1rem 0 0;border:1px solid var(--line);border-radius:14px;padding:.2rem 1rem}
.brc-manual summary{cursor:pointer;padding:.7rem 0;font-weight:600}
.brc-manual form{display:flex;flex-wrap:wrap;gap:.8rem 1rem;align-items:flex-end;padding:0 0 1rem}
.brc-manual label{display:flex;flex-direction:column;gap:.3rem;font-size:.9rem;color:var(--ink-3);flex:1 1 12rem;min-width:0}
.brc-manual input{font:inherit;color:var(--ink);background:rgba(255,255,255,.04);border:1px solid rgba(125,170,220,.35);border-radius:10px;padding:.6rem .8rem;width:100%;box-sizing:border-box}
.brc-out{margin-top:1.2rem;scroll-margin-top:calc(var(--header-h,72px) + var(--ticker-h,0px) + 1.5rem)}
.brc-res{border-radius:18px;padding:1.3rem 1.3rem 1rem;border:1px solid rgba(125,170,220,.3);background:var(--glass-deep)}
.brc-res--ok{border-color:rgba(0,206,27,.5)} .brc-res--warn{border-color:rgba(224,179,65,.6)} .brc-res--bad{border-color:rgba(224,86,63,.65)}
.brc-res__top{display:grid;grid-template-columns:150px minmax(0,1fr);gap:1.3rem;align-items:center}
.brc-ring{width:150px;height:150px}
.brc-ring__bg{fill:none;stroke:rgba(255,255,255,.1);stroke-width:12}
.brc-ring__fg{fill:none;stroke-width:12;stroke-linecap:round}
.brc-ok{stroke:var(--ok)} .brc-warn{stroke:var(--warn)} .brc-bad{stroke:var(--bad)}
.brc-ring__n{fill:var(--ink);font-family:var(--font-display);font-weight:600;font-size:28px;text-anchor:middle}
.brc-ring__s{fill:var(--muted);font-size:11px;text-anchor:middle;letter-spacing:.08em;text-transform:uppercase}
.brc-eyebrow{margin:0 0 .3rem;font-size:.72rem;letter-spacing:.08em;color:var(--cyan-soft);overflow-wrap:anywhere}
.brc-head{margin:0 0 .5rem;font-size:clamp(1.4rem,3vw,1.9rem);line-height:1.15}
.brc-res p{margin:.45rem 0;line-height:1.55}
.brc-lead{font-size:1.06rem}
.brc-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,10.5rem),1fr));gap:.7rem;margin:1.1rem 0 .4rem;padding:0}
.brc-facts div{border:1px solid var(--line);border-radius:12px;padding:.65rem .8rem;min-width:0}
.brc-facts dt{font-size:.78rem;color:var(--muted);letter-spacing:.03em}
.brc-facts dd{margin:.15rem 0 0;font-weight:700;font-size:1.08rem;overflow-wrap:anywhere}
.brc-facts dd.brc-small,.brc-small{font-weight:400;font-size:.8rem;color:var(--muted)}
.brc-trend{margin:1rem 0 .3rem}
.brc-trend svg{display:block;width:100%;height:auto}
.brc-trend figcaption{font-size:.8rem;color:var(--muted)}
.brc-g{stroke:rgba(255,255,255,.1);stroke-width:1} .brc-g--new{stroke:rgba(108,196,245,.55);stroke-dasharray:5 5}
.brc-ax{fill:var(--muted);font-size:12px}
.brc-line{fill:none;stroke:var(--cyan-soft);stroke-width:2.5;stroke-linejoin:round}
.brc-note{border-left:3px solid var(--warn);padding:.3rem 0 .3rem .8rem;color:var(--ink-3)}
.brc-app{margin-top:.9rem!important;padding-top:.8rem;border-top:1px solid var(--line)}
.brc-again{margin:.8rem 0 .2rem!important}
.brc-res--msg{border-color:rgba(224,179,65,.6)}
.brc-nojs{margin:.8rem 0 0;font-size:.9rem;color:var(--ink-3)}
.brc--js .brc-nojs{display:none}
@media (max-width:560px){.brc-res__top{grid-template-columns:1fr;justify-items:center;text-align:center}.brc-ring{width:132px;height:132px}.brc-res{padding:1.1rem .9rem .9rem}.brc-ax{font-size:22px}}
</style>
<div class="brc-drop" tabindex="0" role="group" aria-label="Read your battery report">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10.5v3"/><path d="M6 10.5v3M9.5 10.5v3"/></svg>
  <p class="brc-drop__big">Drop your <strong>battery-report.html</strong> here</p>
  <p class="brc-drop__or">or</p>
  <label class="button primary" for="brc-file">Choose the report</label>
  <input class="brc-file" id="brc-file" type="file" accept=".html,.htm,text/html">
  <p class="brc-priv"><b>Read here in your browser.</b> Your report is never uploaded or sent anywhere.</p>
</div>
<details class="brc-manual">
  <summary>Or type the two numbers from your report</summary>
  <form novalidate>
    <label for="brc-design">Design capacity (mWh)<input id="brc-design" inputmode="numeric" autocomplete="off" placeholder="for example 52,000"></label>
    <label for="brc-full">Full charge capacity (mWh)<input id="brc-full" inputmode="numeric" autocomplete="off" placeholder="for example 39,000"></label>
    <button type="submit" class="button primary">Work it out</button>
  </form>
</details>
<p class="brc-nojs">With JavaScript off, open the report, find <strong>Installed batteries</strong> and divide the full charge capacity by the design capacity.</p>
<div class="brc-out" hidden aria-live="polite"></div>
<script src="/js/battery-report.min.js?v=__BATTV__" defer></script>
</div>""".replace("__BATTV__", BATTV)

SECTION = {'eyebrow': '/03 &mdash; READ IT HERE', 'h2': 'Read your battery report here',
           'html': '<p>Made the report? Drop it below, or choose it from the folder Windows told you about, and we&rsquo;ll read it for you: the battery&rsquo;s '
                   'health, its charge cycles, how fast it&rsquo;s wearing and how long it lasts now against when it was new. It&rsquo;s read on your own computer, '
                   'in your browser.</p>' + BATT_TOOL}
