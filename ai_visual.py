# -*- coding: utf-8 -*-
"""Premium visual layer for the /ai/ section.

Three things live here:

  AI_CSS      route-scoped styles + keyframes. Injected once per AI page, so
              nothing lands in the global stylesheet and no other route pays
              for it (blueprint doc 05 s38.2). Every animation is neutralised
              under prefers-reduced-motion at the bottom of the block.

  SCENES      one bespoke animated hero illustration per page, composed from
              the small SVG vocabulary below rather than hand-drawn, so the
              ten scenes stay visually consistent. They ride the site's
              existing .course-scene container (fixed 5/3 aspect ratio, so
              they reserve their space and cannot shift layout).

  ICON_FOR    heading-keyword -> icon name, mapping section titles onto the
              site's existing ico() line-art set.

Design intent: "365 Techies with a more advanced operational layer" (doc 05
s19.1) - operational motifs that show real process state (a request flowing
into a structured task, an approval landing, a call becoming a booking),
never neural-network confetti or glowing brains.
"""

# --------------------------------------------------------------------------
# CSS - route-scoped. Class prefix .ai- everywhere.
# --------------------------------------------------------------------------
AI_CSS = """<style>
/* ---- /ai/ premium layer (route-scoped; see ai_visual.py) ---- */
.ai-sec{position:relative}
.ai-sec__head{display:flex;align-items:flex-start;gap:.95rem;margin-bottom:1.05rem}
.ai-badge{flex:none;width:46px;height:46px;border-radius:14px;display:grid;place-items:center;
  background:linear-gradient(150deg,rgba(29,151,227,.18),rgba(29,151,227,.04));
  border:1px solid rgba(108,196,245,.28);box-shadow:0 6px 18px rgba(3,12,30,.45);position:relative}
.ai-badge svg{width:23px;height:23px;color:var(--cyan-soft);position:relative;z-index:1}
.ai-badge::after{content:"";position:absolute;inset:-1px;border-radius:inherit;
  border:1px solid rgba(108,196,245,.5);opacity:0;animation:aiRing 4.5s ease-out infinite;animation-delay:var(--d,0s)}
@keyframes aiRing{0%{opacity:.55;transform:scale(1)}55%,100%{opacity:0;transform:scale(1.28)}}
.ai-sec__head h2{margin:0;flex:1}
.ai-sec__head .title-underline{display:block}

/* card grid - one concept per card, icon leads */
.ai-cards{list-style:none;margin:1.2rem 0 0;padding:0;display:grid;gap:1rem;
  grid-template-columns:repeat(auto-fit,minmax(255px,1fr))}
.ai-cards li{position:relative;padding:1.25rem 1.3rem;border-radius:var(--r-lg);
  background:var(--glass-deep);border:1px solid var(--line);overflow:hidden;
  transition:transform .28s ease,border-color .28s ease,box-shadow .28s ease}
.ai-cards li::before{content:"";position:absolute;left:0;top:0;height:2px;width:100%;
  background:linear-gradient(90deg,transparent,var(--cyan),transparent);
  transform:translateX(-100%);transition:transform .5s ease}
.ai-cards li:hover,.ai-cards li:focus-within{transform:translateY(-4px);
  border-color:rgba(108,196,245,.42);box-shadow:0 18px 40px rgba(3,10,26,.5)}
.ai-cards li:hover::before,.ai-cards li:focus-within::before{transform:translateX(0)}
.ai-cards .ai-cardico{width:30px;height:30px;color:var(--cyan-soft);margin-bottom:.7rem;display:block}
.ai-cards li:hover .ai-cardico{animation:aiNudge .6s ease}
@keyframes aiNudge{40%{transform:translateY(-3px) rotate(-4deg)}100%{transform:none}}
.ai-cards h3{font-size:1.06rem;color:#fff;margin:0 0 .45rem;line-height:1.3}
.ai-cards p,.ai-cards li>span{font-size:.95rem;color:var(--muted);margin:0;display:block;line-height:1.6}
.ai-cards a{color:var(--cyan-soft)}

/* checklist with a drawn tick */
.ai-checks{list-style:none;margin:1.1rem 0 0;padding:0;display:grid;gap:.72rem}
.ai-checks li{position:relative;padding-left:2.1rem;color:var(--ink-3);font-size:.97rem;line-height:1.6}
.ai-checks li svg{position:absolute;left:0;top:.15rem;width:19px;height:19px;color:var(--green-soft)}
.ai-checks li svg path{stroke-dasharray:26;stroke-dashoffset:26;animation:aiTick .7s ease forwards;animation-delay:var(--d,0s)}
@keyframes aiTick{to{stroke-dashoffset:0}}

/* numbered step rail */
.ai-steps{list-style:none;margin:1.3rem 0 0;padding:0;display:grid;gap:.85rem;position:relative}
.ai-steps::before{content:"";position:absolute;left:19px;top:12px;bottom:12px;width:2px;
  background:linear-gradient(180deg,transparent,rgba(108,196,245,.34),transparent)}
.ai-steps li{position:relative;padding:.95rem 1.15rem .95rem 3.35rem;border-radius:var(--r-md);
  background:rgba(12,22,48,.5);border:1px solid var(--line)}
.ai-steps .ai-step__n{position:absolute;left:8px;top:.95rem;width:24px;height:24px;border-radius:50%;
  display:grid;place-items:center;font-family:var(--font-mono);font-size:.72rem;color:var(--bg);
  background:var(--cyan-soft);box-shadow:0 0 0 4px rgba(7,13,34,1),0 0 14px rgba(108,196,245,.5)}
.ai-steps h3{font-size:1rem;color:#fff;margin:0 0 .3rem}
.ai-steps p{font-size:.94rem;color:var(--muted);margin:0;line-height:1.6}

/* hero + section scenes */
.ai-scene{position:relative;aspect-ratio:5/3;border-radius:var(--r-lg);overflow:hidden;
  background:radial-gradient(120% 100% at 70% 10%,rgba(29,151,227,.13),transparent 62%),
  linear-gradient(165deg,rgba(13,27,52,.8),rgba(7,15,32,.9));border:1px solid var(--line)}
.ai-scene svg{position:absolute;inset:0;width:100%;height:100%}
.ai-nd{fill:#0b1d3a;stroke:#6cc4f5;stroke-width:2}
.ai-ln{stroke:rgba(108,196,245,.42);stroke-width:2;fill:none}
.ai-tx{fill:#9fb5d3;font-family:'IBM Plex Mono',monospace;font-size:9px}
.ai-tx--hi{fill:#eaf4ff}
.ai-glow{filter:drop-shadow(0 0 6px rgba(108,196,245,.6))}
.ai-dash{stroke-dasharray:5 9;animation:aiRun 2.6s linear infinite}
@keyframes aiRun{to{stroke-dashoffset:-56}}
.ai-pulse{animation:aiPulse 3.2s ease-in-out infinite;animation-delay:var(--d,0s);transform-origin:center}
@keyframes aiPulse{0%,100%{opacity:.55}50%{opacity:1}}
.ai-beat{animation:aiBeat 3.6s ease-in-out infinite;animation-delay:var(--d,0s);transform-origin:center}
@keyframes aiBeat{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}
.ai-rise{animation:aiRise 5s ease-in-out infinite;animation-delay:var(--d,0s)}
@keyframes aiRise{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.ai-draw{stroke-dasharray:var(--len,120);stroke-dashoffset:var(--len,120);
  animation:aiDraw 2.4s ease forwards;animation-delay:var(--d,.2s)}
@keyframes aiDraw{to{stroke-dashoffset:0}}
.ai-fade{opacity:0;animation:aiFade .7s ease forwards;animation-delay:var(--d,1s)}
@keyframes aiFade{to{opacity:1}}
.ai-travel{offset-path:var(--path);animation:aiTravel 4s linear infinite;animation-delay:var(--d,0s)}
@keyframes aiTravel{0%{offset-distance:0%;opacity:0}
  8%{opacity:1}88%{opacity:1}100%{offset-distance:100%;opacity:0}}

/* showcase - a section that IS one real asset gets a panel and a way in */
.ai-show{position:relative;padding:1.4rem 1.5rem;border-radius:var(--r-lg);
  background:linear-gradient(158deg,rgba(16,32,62,.72),rgba(8,16,36,.86));
  border:1px solid rgba(108,196,245,.24);overflow:hidden}
.ai-show::after{content:"";position:absolute;right:-40px;top:-40px;width:150px;height:150px;border-radius:50%;
  background:radial-gradient(circle,rgba(29,151,227,.18),transparent 68%);pointer-events:none}
.ai-show p{position:relative;z-index:1}
.ai-show__go{display:inline-flex;align-items:center;gap:.5rem;margin-top:.9rem;padding:.6rem 1.05rem;
  border-radius:var(--r-pill);background:rgba(29,151,227,.14);border:1px solid rgba(108,196,245,.42);
  color:var(--cyan-soft);font-size:.93rem;text-decoration:none;position:relative;z-index:1;
  transition:background .25s ease,transform .25s ease}
.ai-show__go:hover{background:rgba(29,151,227,.25);transform:translateX(3px)}
.ai-show__go svg{width:16px;height:16px}
.ai-show__go .ai-arrow{animation:aiArrow 1.9s ease-in-out infinite}
@keyframes aiArrow{0%,100%{transform:translateX(0)}50%{transform:translateX(3px)}}

/* proof strip */
.ai-proof{display:grid;gap:.8rem;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin:1.2rem 0 0;
  list-style:none;padding:0}
.ai-proof li{padding:.9rem 1rem;border-radius:var(--r-md);border:1px dashed rgba(108,196,245,.3);
  background:rgba(11,20,44,.45);font-size:.92rem;color:var(--ink-3)}
.ai-proof strong{display:block;color:#fff;font-size:.98rem;margin-bottom:.25rem}

@media (prefers-reduced-motion:reduce){
  .ai-badge::after,.ai-dash,.ai-pulse,.ai-beat,.ai-rise,.ai-travel,.ai-show__go .ai-arrow{animation:none}
  .ai-show__go{transition:none}
  .ai-cards li:hover .ai-cardico{animation:none}
  .ai-draw,.ai-checks li svg path{animation:none;stroke-dashoffset:0}
  .ai-fade{animation:none;opacity:1}
  .ai-cards li{transition:none}
}
</style>"""


# --------------------------------------------------------------------------
# scene vocabulary - small primitives, composed into the ten scenes
# --------------------------------------------------------------------------
def _svg(inner):
    return ('<svg class="ai-scene__svg" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet"'
            ' aria-hidden="true" focusable="false">' + inner + "</svg>")


def _card(x, y, w, h, label="", lines=2, cls="", d=0):
    """A little UI card: rounded rect + a title bar + skeleton lines."""
    out = [f'<g class="{cls}" style="--d:{d}s">',
           f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="#0a1a35" stroke="#3f6ea3" stroke-width="1.6"/>']
    if label:
        out.append(f'<text class="ai-tx ai-tx--hi" x="{x + 10}" y="{y + 17}">{label}</text>')
    ly = y + (28 if label else 16)
    for i in range(lines):
        w2 = w - 20 - (14 if i % 2 else 0)
        out.append(f'<rect x="{x + 10}" y="{ly + i * 11}" width="{w2}" height="4" rx="2" fill="#24456f"/>')
    out.append("</g>")
    return "".join(out)


def _node(cx, cy, r, glyph="", d=0, beat=True):
    cls = "ai-nd ai-glow" + ("" if not beat else "")
    g = [f'<g class="{"ai-beat" if beat else ""}" style="--d:{d}s">',
         f'<circle class="{cls}" cx="{cx}" cy="{cy}" r="{r}"/>']
    if glyph:
        g.append(f'<text class="ai-tx ai-tx--hi" x="{cx}" y="{cy + 4}" text-anchor="middle">{glyph}</text>')
    g.append("</g>")
    return "".join(g)


def _link(d_attr, dash=True, d=0):
    cls = "ai-ln" + (" ai-dash" if dash else "")
    return f'<path class="{cls}" style="--d:{d}s" d="{d_attr}"/>'


def _tick(cx, cy, r=13, d=1.2):
    return (f'<g class="ai-fade" style="--d:{d}s">'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="rgba(0,206,27,.14)" stroke="#5fe07a" stroke-width="1.8"/>'
            f'<path d="M{cx - 5} {cy} l3.4 3.6 L{cx + 6} {cy - 4.6}" fill="none" stroke="#5fe07a"'
            f' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>')


def _person(cx, cy, s=1.0, d=0):
    return (f'<g class="ai-rise" style="--d:{d}s">'
            f'<circle cx="{cx}" cy="{cy - 6 * s}" r="{5 * s}" fill="none" stroke="#9fb5d3" stroke-width="1.8"/>'
            f'<path d="M{cx - 8 * s} {cy + 8 * s} a{8 * s} {8 * s} 0 0 1 {16 * s} 0" fill="none"'
            f' stroke="#9fb5d3" stroke-width="1.8" stroke-linecap="round"/></g>')


def _label(x, y, text, hi=False):
    return f'<text class="ai-tx{" ai-tx--hi" if hi else ""}" x="{x}" y="{y}">{text}</text>'


# --------------------------------------------------------------------------
# the ten scenes
# --------------------------------------------------------------------------
def _scene_hub():
    """A messy enquiry becomes a structured, approved task."""
    return _svg(
        _label(28, 30, "ENQUIRY IN")
        + _card(24, 40, 96, 62, "email", 3, "ai-rise", 0)
        + _link("M126 72 H176", d=0)
        + _node(196, 72, 20, "AI", 0.2)
        + _link("M216 72 H268", d=0.6)
        + _label(268, 30, "STRUCTURED TASK", True)
        + _card(266, 40, 110, 62, "job #1042", 3, "", 0)
        + _link("M196 92 V132", dash=False)
        + _label(150, 152, "HUMAN APPROVES")
        + _tick(196, 150, 15, 1.4)
        + _link("M216 150 H300", d=1.1)
        + _card(300, 128, 76, 44, "CRM", 2, "", 0)
        + _label(24, 208, "one request &#183; one path &#183; one record")
    )


def _scene_automations():
    """Systems that did not talk, now exchanging exactly what they should."""
    parts = [_label(24, 26, "BEFORE &#183; MANUAL")]
    for i, x in enumerate((30, 110, 190)):
        parts.append(_card(x, 36, 62, 40, "", 2, "", 0))
        parts.append(_person(x + 31, 96, 0.7, i * 0.4))
    parts.append(_label(24, 128, "AFTER &#183; CONNECTED", True))
    parts += [
        _link("M60 176 H150", d=0),
        _link("M210 176 H300", d=0.5),
        _node(60, 176, 17, "@", 0),
        _node(180, 176, 21, "flow", 0.3),
        _node(320, 176, 17, "CRM", 0.6),
        _link("M180 155 V138", dash=False),
        _tick(180, 126, 11, 1.5),
        _label(246, 60, "no re-typing,"),
        _label(246, 74, "no chasing,"),
        _label(246, 88, "same every time", True),
    ]
    return _svg("".join(parts))


def _scene_agents():
    """A bounded agent: tools it may use, and the approval it must ask for."""
    parts = [_node(120, 120, 30, "agent", 0)]
    tools = (("mail", 250, 52), ("CRM", 296, 120), ("docs", 250, 188))
    for i, (nm, x, y) in enumerate(tools):
        parts.append(_link(f"M150 120 Q{(150 + x) / 2} {(120 + y) / 2} {x - 20} {y}", d=i * 0.7))
        parts.append(_node(x, y, 18, nm, 0.3 + i * 0.4))
    parts += [
        _link("M120 90 V56", dash=False),
        _label(58, 40, "BOUNDED BY YOUR RULES"),
        _tick(120, 44, 13, 1.2),
        _label(58, 186, "asks before it acts"),
        _label(58, 200, "on anything that counts", True),
    ]
    return _svg("".join(parts))


def _scene_voice():
    """A call answered, captured and turned into a booking."""
    parts = [
        _label(26, 28, "CALL AT 7:42PM"),
        f'<g class="ai-rise"><rect x="26" y="40" width="52" height="76" rx="12" fill="#0a1a35"'
        f' stroke="#3f6ea3" stroke-width="1.8"/><rect x="44" y="52" width="16" height="3" rx="1.5" fill="#24456f"/>'
        f'<circle cx="52" cy="102" r="5" fill="none" stroke="#6cc4f5" stroke-width="1.6"/></g>',
    ]
    # three widening "sound" arcs leaving the handset, each pulsing a beat later
    for i in range(3):
        parts.append(f'<path class="ai-pulse" style="--d:{i * .45}s" fill="none" stroke="rgba(108,196,245,.5)"'
                     f' stroke-width="2" stroke-linecap="round"'
                     f' d="M{92 + i * 11} {66 - i * 5} q7 {12 + i * 5} 0 {24 + i * 10}"/>')
    parts += [
        _node(160, 78, 21, "AI", 0.2),
        _link("M181 78 H236", d=0.4),
        _card(236, 46, 138, 64, "captured", 3, "", 0),
        _link("M300 112 V150", dash=False),
        _card(236, 152, 138, 52, "callback booked", 2, "", 0),
        _tick(212, 178, 13, 1.4),
        _label(26, 150, "answers, captures,"),
        _label(26, 164, "books &#8212; then hands"),
        _label(26, 178, "anything human to you", True),
    ]
    return _svg("".join(parts))


def _scene_consultancy():
    """Mapping a real process, then measuring the baseline."""
    parts = [_label(24, 26, "YOUR PROCESS TODAY")]
    xs = (40, 108, 176, 244, 312)
    for i, x in enumerate(xs):
        parts.append(_node(x, 74, 15, str(i + 1), i * 0.35))
        if i < len(xs) - 1:
            parts.append(_link(f"M{x + 15} 74 H{xs[i + 1] - 15}", d=i * 0.3))
    parts += [
        f'<circle class="ai-beat" cx="176" cy="74" r="27" fill="none" stroke="#5fe07a"'
        f' stroke-width="1.8" stroke-dasharray="4 5"/>',
        _label(120, 128, "bottleneck found", True),
        _label(24, 168, "BASELINE MEASURED"),
        f'<path class="ai-draw ai-ln" style="--len:300;--d:.6s" stroke="#5fe07a" fill="none"'
        f' d="M28 208 L100 200 L172 186 L244 190 L316 166"/>',
        _card(292, 96, 84, 48, "hrs / week", 2, "", 0),
    ]
    return _svg("".join(parts))


def _scene_training():
    """A team getting confident, with safe habits."""
    parts = [_card(112, 44, 176, 96, "your workflow", 4, "", 0)]
    for i, x in enumerate((72, 200, 328)):
        parts.append(_person(x, 186, 1.15, i * 0.5))
    parts += [
        _link("M72 168 V150", dash=False), _link("M200 168 V146", dash=False), _link("M328 168 V150", dash=False),
        _link("M112 92 H72 V150", d=0.2), _link("M288 92 H328 V150", d=0.5),
        _tick(200, 118, 13, 1.2),
        _label(24, 30, "SAFE, PRACTICAL HABITS", True),
        _label(148, 224, "on your real jobs"),
    ]
    return _svg("".join(parts))


def _scene_tools():
    """A live dashboard drawing itself."""
    parts = [
        _card(24, 34, 150, 60, "estimator", 2, "", 0),
        _card(24, 106, 150, 60, "AI OS demo", 2, "", 0.2),
        f'<rect x="192" y="34" width="184" height="132" rx="9" fill="#0a1a35" stroke="#3f6ea3" stroke-width="1.6"/>',
        _label(204, 52, "LIVE DASHBOARD", True),
        f'<path class="ai-draw" style="--len:260;--d:.4s" fill="none" stroke="#6cc4f5" stroke-width="2.2"'
        f' stroke-linecap="round" d="M204 140 L236 118 L268 126 L300 96 L332 104 L364 74"/>',
    ]
    for i, x in enumerate((236, 268, 300, 332, 364)):
        parts.append(f'<circle class="ai-fade" style="--d:{1.2 + i * .12}s" cx="{x}"'
                     f' cy="{[118, 126, 96, 104, 74][i]}" r="3" fill="#6cc4f5"/>')
    parts += [_label(24, 196, "try them yourself &#8212; nothing to install"),
              _tick(352, 190, 12, 1.6)]
    return _svg("".join(parts))


def _scene_industries():
    """Three trades, one shared operational spine."""
    parts = [_link("M200 44 V196", dash=False)]
    for i, (nm, y) in enumerate((("professional", 66), ("property &amp; trades", 120), ("marine &amp; energy", 174))):
        side = -1 if i % 2 == 0 else 1
        x = 200 + side * 92
        parts.append(_link(f"M200 {y} H{x + (18 if side < 0 else -18)}", d=i * 0.5))
        parts.append(_node(x, y, 18, "", 0.2 + i * 0.4))
        parts.append(_label(x - 52 if side < 0 else x + 26, y + 4, nm))
    parts += [_node(200, 44, 14, "", 0), _node(200, 196, 14, "", 0.6),
              _label(150, 224, "same rails, different work", True)]
    return _svg("".join(parts))


def _scene_learn():
    """Plain-English guidance, building up."""
    parts = []
    for i in range(4):
        parts.append(_card(30 + i * 12, 150 - i * 30, 190, 34, "", 1, "ai-rise", i * 0.4))
    parts += [
        _node(320, 76, 22, "?", 0.2),
        _link("M298 76 H240", d=0.3),
        _tick(320, 150, 14, 1.3),
        _label(276, 196, "start here"),
        _label(24, 224, "no jargon, no sales pitch", True),
    ]
    return _svg("".join(parts))


def _scene_start():
    """The enquiry form becoming a tracked job."""
    return _svg(
        _card(30, 44, 140, 130, "your problem", 5, "", 0)
        + _link("M176 108 H228", d=0)
        + _node(250, 108, 20, "&#10003;", 0.2)
        + _link("M272 108 H316", d=0.5)
        + _card(312, 76, 66, 64, "AIO-", 2, "", 0)
        + _label(28, 206, "a person reads every one", True)
        + _tick(345, 172, 13, 1.4)
    )


SCENES = {
    "ai": _scene_hub(),
    "ai/automations": _scene_automations(),
    "ai/agents": _scene_agents(),
    "ai/voice-agents": _scene_voice(),
    "ai/consultancy": _scene_consultancy(),
    "ai/training": _scene_training(),
    "ai/tools": _scene_tools(),
    "ai/industries": _scene_industries(),
    "ai/learn": _scene_learn(),
    "ai/start": _scene_start(),
}


# --------------------------------------------------------------------------
# heading keyword -> icon (uses the site's existing ico() set)
# --------------------------------------------------------------------------
ICON_FOR = [
    (("voicemail", "call", "phone", "ring"), "phone"),
    (("team", "staff", "people", "who it", "adopt"), "users"),
    (("local", "same local", "family"), "home"),
    (("problem", "wasting", "eat", "repetitive", "manual"), "clock"),
    (("system", "connect", "integrat", "talk to each"), "flow"),
    (("agent", "bounded", "assistant"), "robot"),
    (("human", "approval", "control", "limit", "safeguard", "paper trail"), "shield"),
    (("proof", "evidence", "case", "already"), "eye"),
    (("measure", "baseline", "working", "report"), "monitor"),
    (("quote", "scope", "price", "cost", "shapes"), "briefcase"),
    (("secure", "safe", "privacy", "risk"), "lock"),
    (("train", "learn", "course", "guide", "start here"), "spark"),
    (("industr", "sector", "trade", "marine", "property"), "van"),
    (("tool", "demo", "calculator", "dashboard"), "cpu"),
    (("workflow", "process", "step", "how we", "before and after"), "bolt"),
    (("email", "enquir", "message", "inbox"), "mail"),
    (("document", "paperwork", "missing"), "server"),
    (("book", "diary", "appointment", "schedul"), "check"),
    (("microsoft", "365", "copilot", "cloud"), "cloud"),
    (("ready", "next", "talk", "contact"), "handshake"),
]


def icon_for(heading):
    h = heading.lower()
    for keys, name in ICON_FOR:
        if any(k in h for k in keys):
            return name
    return "spark"
