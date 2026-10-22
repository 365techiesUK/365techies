/* ==========================================================================
   365 TECHIES — shared interior-page script
   Three.js particle background + GSAP nav/reveal animations.
   Lighter than the homepage main.js (no scroll-scene choreography).
   ========================================================================== */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Only skip the WebGL background for users who've explicitly turned on Data Saver
// (reduced-motion is honoured separately at boot). It runs everywhere else, lighter on mobile.
const LOW_POWER = (() => {
  try { return !!(navigator.connection && navigator.connection.saveData); } catch (e) { return false; }
})();
/* GSAP + ScrollTrigger arrive via the desktop-only motion gate in <head>
   (phones never download them), so presence is checked LIVE, not cached. */
const hasGsap = () => typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
const isMobile = () => window.innerWidth < 920;

/* ---------------- header + mobile menu ---------------- */
const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".mobile-menu-button");
const mobileMenu = document.querySelector(".mobile-menu");
const menuBackdrop = document.querySelector(".menu-backdrop");

let menuOpen = false;
let menuTl = null;

function buildMenuTl() {
  if (menuTl || !mobileMenu || !hasGsap() || REDUCED) return;
  const links = mobileMenu.querySelectorAll(".mobile-menu__nav > a, .mobile-menu__nav > .m-group > summary");
  const btns = mobileMenu.querySelectorAll(".mobile-menu__plans .button");
  menuTl = gsap.timeline({
    paused: true,
    onReverseComplete: () => gsap.set([mobileMenu, menuBackdrop], { visibility: "hidden" }),
  })
    .to(menuBackdrop, { opacity: 1, duration: 0.35, ease: "power2.out" }, 0)
    .fromTo(mobileMenu, { xPercent: 100, x: 0 }, { xPercent: 0, x: 0, duration: 0.5, ease: "power3.out" }, 0)
    .fromTo(links, { x: 44, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: "power3.out" }, 0.16)
    .fromTo(btns, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.09, ease: "back.out(1.6)" }, 0.42);
}

function setMenu(open) {
  if (!mobileMenu) return;
  menuOpen = open;
  menuButton.classList.toggle("is-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  mobileMenu.setAttribute("aria-hidden", String(!open));
  document.body.classList.toggle("menu-open", open);
  if (menuTl) {
    if (open) { gsap.set([mobileMenu, menuBackdrop], { visibility: "visible" }); menuTl.timeScale(1).play(); }
    else menuTl.timeScale(1.6).reverse();
  } else {
    mobileMenu.style.visibility = open ? "visible" : "hidden";
    mobileMenu.style.transform = open ? "translateX(0)" : "translateX(100%)";
    menuBackdrop.style.visibility = open ? "visible" : "hidden";
    menuBackdrop.style.opacity = open ? "1" : "0";
  }
  if (open) { const f = mobileMenu.querySelector("a, button"); if (f) { try { f.focus(); } catch (e) {} } }
  else if (document.activeElement && mobileMenu.contains(document.activeElement)) { try { menuButton.focus(); } catch (e) {} }
}

if (menuButton) menuButton.addEventListener("click", () => setMenu(!menuOpen));
if (menuBackdrop) menuBackdrop.addEventListener("click", () => setMenu(false));
if (mobileMenu) {
  mobileMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
}
const headerLogo = document.querySelector(".header-bar .logo");
if (headerLogo) headerLogo.addEventListener("click", () => { if (menuOpen) setMenu(false); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) setMenu(false); });

/* Accordion groups: animated open/close, one open at a time, reduced-motion aware */
(() => {
  const RED = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();
  const groups = mobileMenu ? mobileMenu.querySelectorAll(".m-group") : [];
  const expand = (g) => {
    const body = g.querySelector(".m-group__links");
    g.setAttribute("open", "");
    if (RED || !body) return;
    body.style.overflow = "hidden"; body.style.maxHeight = "0px"; body.style.opacity = "0";
    requestAnimationFrame(() => {
      body.style.transition = "max-height .34s cubic-bezier(.22,1,.36,1), opacity .3s ease";
      body.style.maxHeight = body.scrollHeight + "px"; body.style.opacity = "1";
      setTimeout(() => { body.style.maxHeight = ""; body.style.overflow = ""; body.style.transition = ""; }, 380);
    });
  };
  const collapse = (g) => {
    const body = g.querySelector(".m-group__links");
    if (RED || !body) { g.removeAttribute("open"); return; }
    body.style.overflow = "hidden"; body.style.maxHeight = body.scrollHeight + "px";
    requestAnimationFrame(() => {
      body.style.transition = "max-height .28s cubic-bezier(.55,0,.55,.2), opacity .24s ease";
      body.style.maxHeight = "0px"; body.style.opacity = "0";
      setTimeout(() => {
        g.removeAttribute("open");
        body.style.maxHeight = ""; body.style.overflow = ""; body.style.transition = ""; body.style.opacity = "";
      }, 300);
    });
  };
  groups.forEach((g) => {
    const sum = g.querySelector("summary");
    if (!sum) return;
    sum.addEventListener("click", (e) => {
      e.preventDefault();
      const opening = !g.hasAttribute("open");
      groups.forEach((o) => { if (o !== g && o.hasAttribute("open")) collapse(o); });
      if (opening) expand(g); else collapse(g);
    });
  });
})();

/* ---------------- counters ---------------- */
function initCounters() {
  document.querySelectorAll(".stat-num").forEach((el) => {
    const target = parseFloat(el.dataset.count);
    if (isNaN(target)) return;
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const fmt = (v) => v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (!hasGsap() || REDUCED) { el.textContent = fmt(target); return; }
    const proxy = { v: 0 };
    gsap.to(proxy, {
      v: target, duration: 1.6, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => { el.textContent = fmt(proxy.v); },
      onComplete: () => { el.textContent = fmt(target); },
    });
  });
}

/* ---------------- UI animations ---------------- */
function initUI() {
  /* Intro timelines only make sense right after first paint. GSAP now arrives
     async (motion gate) — if it lands late, re-hiding content the visitor is
     already reading would be jarring, so skip the intros and keep only the
     scroll-driven reveals. */
  const FRESH_PAINT = performance.now() < 2500;
  if (FRESH_PAINT) {
  const load = gsap.timeline({ defaults: { ease: "power3.out" } });
  load
    .from(".site-header", { y: -110, opacity: 0, duration: 0.8 })
    .from(".desktop-nav > a, .desktop-nav .nav-item", { y: -18, opacity: 0, duration: 0.5, stagger: 0.06 }, 0.3);
  }

  const hero = FRESH_PAINT ? document.querySelector(".page-hero") : null;
  if (hero) {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.35 });
    const bc = hero.querySelector(".breadcrumb");
    const eb = hero.querySelector(".eyebrow");
    const h1 = hero.querySelector("h1");
    const lede = hero.querySelector(".lede");
    const cta = hero.querySelectorAll(".page-hero__cta > *");
    const chips = hero.querySelectorAll(".page-hero__chips li");
    if (bc) tl.from(bc, { y: 16, opacity: 0, duration: 0.5 }, 0);
    if (eb) tl.from(eb, { y: 18, opacity: 0, duration: 0.5 }, 0.05);
    if (h1) tl.from(h1, { y: 40, opacity: 0, filter: "blur(8px)", duration: 0.9 }, 0.12);
    if (lede) tl.from(lede, { y: 28, opacity: 0, duration: 0.7 }, 0.3);
    if (cta.length) tl.from(cta, { y: 24, opacity: 0, scale: 0.94, duration: 0.6, stagger: 0.1, ease: "back.out(1.6)" }, 0.45);
    if (chips.length) tl.from(chips, { y: 14, opacity: 0, duration: 0.45, stagger: 0.07 }, 0.6);
  }

  ScrollTrigger.create({
    start: 70,
    onEnter: () => header && header.classList.add("is-scrolled"),
    onLeaveBack: () => header && header.classList.remove("is-scrolled"),
  });

  gsap.utils.toArray("[data-title]").forEach((title) => {
    const underline = title.querySelector(".title-underline");
    const tl = gsap.timeline({ scrollTrigger: { trigger: title, start: "top 85%" }, defaults: { ease: "power3.out" } });
    tl.from(title, { y: 50, opacity: 0, filter: "blur(10px)", duration: 0.85 });
    if (underline) tl.from(underline, { scaleX: 0, duration: 0.7, ease: "power2.inOut" }, 0.35);
  });

  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    gsap.from(el, { scrollTrigger: { trigger: el, start: "top 88%" }, y: 34, opacity: 0, duration: 0.75, ease: "power3.out" });
  });

  gsap.utils.toArray("[data-stagger]").forEach((wrap) => {
    gsap.from(wrap.children, { scrollTrigger: { trigger: wrap, start: "top 88%" }, y: 26, opacity: 0, duration: 0.55, stagger: 0.07, ease: "power3.out" });
  });

  if (window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".button, .nav-cta, .nav-sos").forEach((b) => {
      b.addEventListener("mouseenter", () => gsap.to(b, { scale: 1.05, duration: 0.25, ease: "power2.out" }));
      b.addEventListener("mouseleave", () => gsap.to(b, { scale: 1, duration: 0.3, ease: "power2.out" }));
    });
  }
}

/* ---------------- Three.js background ---------------- */
async function initBackground() {
  let THREE;
  try { THREE = await import("three"); } catch { return; }
  const canvas = document.querySelector("#tech-background");
  if (!canvas) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch { canvas.remove(); return; }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070d22, 0.04);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 8;

  function glowTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  const sprite = glowTexture();

  const mobile = isMobile();
  const COUNT = mobile ? 320 : 820;
  const baseSize = mobile ? 0.16 : 0.13;
  const SPREAD = { x: 26, y: 16, z: 22 };
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const cCyan = new THREE.Color(0x1d97e3), cGreen = new THREE.Color(0x00ce1b), cBlue = new THREE.Color(0x324a6d);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * SPREAD.x;
    positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD.z;
    const r = Math.random();
    const col = r < 0.55 ? cCyan : r < 0.78 ? cBlue : cGreen;
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({ size: baseSize, map: sprite, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const field = new THREE.Points(geo, mat);
  const group = new THREE.Group(); group.add(field); scene.add(group);

  // connection web
  const pts = [];
  const wc = mobile ? 54 : 120;
  for (let i = 0; i < wc; i++) pts.push(new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 10));
  const verts = [];
  for (let i = 0; i < wc; i++) for (let j = i + 1; j < wc; j++) if (pts[i].distanceTo(pts[j]) < 3.4) { verts.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z); }
  const webGeo = new THREE.BufferGeometry();
  webGeo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  const web = new THREE.LineSegments(webGeo, new THREE.LineBasicMaterial({ color: 0x0b73b5, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(web);

  if (hasGsap()) {
    gsap.to(group.rotation, { y: Math.PI * 0.6, x: Math.PI * 0.1, ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1 } });
    gsap.to(camera.position, { z: 6, ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1 } });
  }

  let mouseX = 0, mouseY = 0;
  window.addEventListener("mousemove", (e) => { mouseX = (e.clientX / window.innerWidth - 0.5) * 0.7; mouseY = (e.clientY / window.innerHeight - 0.5) * 0.7; }, { passive: true });

  const clock = new THREE.Clock();
  let rafId = null;
  let _bgPaused = false;
  function render() {
    rafId = requestAnimationFrame(render);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    field.rotation.y += dt * 0.05;
    field.rotation.x += dt * 0.02;
    group.rotation.z += dt * 0.008;
    web.rotation.y -= dt * 0.015;
    mat.opacity = 0.82 + Math.sin(t * 0.9) * 0.14;
    mat.size = baseSize + Math.sin(t * 0.6) * (baseSize * 0.14);
    web.material.opacity = 0.14 + (Math.sin(t * 0.5) + 1) * 0.06;
    camera.position.x += (mouseX - camera.position.x) * 0.04;
    camera.position.y += (-mouseY - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  render();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
    else if (!rafId && !_bgPaused) { clock.getDelta(); render(); }
  });
  window.addEventListener("scroll", () => {
    const past = window.scrollY > window.innerHeight * 3;
    if (past && !_bgPaused) { _bgPaused = true; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }
    else if (!past && _bgPaused) { _bgPaused = false; if (!rafId && !document.hidden) { clock.getDelta(); render(); } }
  }, { passive: true });
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 2));
  });
}

/* ---------------- web forms ----------------
   Form capture lives in js/forms.js ONLY (HubSpot + Slack relay + honeypot +
   full-field capture). A second handler here used to double-submit every
   lead to HubSpot — never re-add one. */

/* ---------------- open HubSpot chat from [data-open-chat] ---------------- */
document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-open-chat]");
  if (!trigger) return;
  e.preventDefault();
  const hs = window.HubSpotConversations;
  if (hs && hs.widget && typeof hs.widget.open === "function") {
    hs.widget.open();
  } else {
    window.location.href = "/contact/";
  }
});

/* ---------------- boot ---------------- */
/* GSAP is injected desktop-only by the head motion gate and usually lands
   after this module runs — boot the animations on motion-ready. On phones
   (html.no-motion) it never loads: reveals render visible, counters are
   static, and the menu uses the CSS-transition fallback. */
let _motionBooted = false;
function bootMotion() {
  if (_motionBooted || !hasGsap() || REDUCED) return;
  _motionBooted = true;
  gsap.registerPlugin(ScrollTrigger);
  buildMenuTl();
  initUI();
  initCounters();
}

if (hasGsap() && !REDUCED) {
  bootMotion(); // initCounters runs inside
} else {
  initCounters(); // static path — final values painted immediately
  window.addEventListener("motion-ready", bootMotion, { once: true });
}
// WebGL background only runs where a #tech-background canvas exists (homepage only now);
// interior/landing pages use the lightweight static CSS background — no Three.js fetch.
const bgCanvas = document.querySelector("#tech-background");
// Desktop only + deferred to idle (the Three.js background is ~1.2MB).
const WANT_BG = bgCanvas && !REDUCED && !LOW_POWER
  && window.innerWidth >= 920
  && window.matchMedia("(hover: hover)").matches;
if (WANT_BG) {
  if ("requestIdleCallback" in window) requestIdleCallback(() => initBackground(), { timeout: 3000 });
  else window.addEventListener("load", () => setTimeout(initBackground, 250));
} else if (bgCanvas) bgCanvas.remove();

/* ---------------- an app download tapped on a phone, tablet or Mac: send it to the computer ----------------
   14 Oct 2026 (download walk-through): 44% of visitors are on a phone or tablet (portal Live, 7 days), and our two apps
   are Windows programs, so a tap on Download there only saved an .exe the device can't open. Off Windows, a tap on any
   365 PC Manager / Techies One Mail installer link opens this panel instead: send yourself the page link (the device's
   own share sheet), email it, or copy it - or download the file anyway. Windows PCs download exactly as before.
   The click is cancelled in the WINDOW capture phase, before the visitors beacon (document capture) sees it, so the
   beacon doesn't count it as a download; sending the link fires tt:send, which the beacon counts as /~send/<app><page>. */
(function () {
  const ua = navigator.userAgent || "";
  const uad = navigator.userAgentData;
  const isWin = /Windows NT|Win64|WOW64/.test(ua) || (uad && uad.platform === "Windows");
  if (isWin) return;
  const APPS = {
    pcm: { re: /365-pc-manager-setup[^/?#]*\.exe([?#]|$)/i, name: "365 PC Manager", page: "/free-pc-health-check/#download" },
    t1: { re: /TechiesOneMail-Setup[^/?#]*\.exe([?#]|$)/i, name: "Techies One Mail", page: "/techies-one-mail/#download" },
    tpdf: { re: /TechiesPDF-Setup[^/?#]*\.exe([?#]|$)/i, name: "Techies PDF", page: "/techies-pdf/#download" },
    tmove: { re: /TechiesMove-Setup[^/?#]*\.exe([?#]|$)/i, name: "Techies Move", page: "/techies-move/#download" },
  };
  const device = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "iPad"
    : /iPhone|iPod/.test(ua) ? "iPhone"
    : /Android/.test(ua) ? (/Mobile/.test(ua) ? "phone" : "tablet")
    : /CrOS/.test(ua) ? "Chromebook"
    : /Macintosh/.test(ua) ? "Mac" : "device";
  let panel = null, back = null;

  function close() {
    if (!panel) return;
    panel.remove(); panel = null;
    document.documentElement.classList.remove("dlsend-open");
    if (back) { try { back.focus(); } catch (e) {} back = null; }
  }
  function sent(app, how) {
    document.dispatchEvent(new CustomEvent("tt:send", { detail: { app, how } }));
  }
  function open(app, link) {
    close();
    const a = APPS[app], url = location.origin + a.page;
    const subject = a.name + " for my computer";
    const body = a.name + " - free for Windows 10 and 11. Open this on the computer to download it:\n" + url;
    if (!document.getElementById("dlsend-css")) {
      const st = document.createElement("style");
      st.id = "dlsend-css";
      st.textContent =
        ".dlsend{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(3,6,16,.72);padding:1rem}"
        + "@media (min-width:640px){.dlsend{align-items:center}}"
        + ".dlsend__box{position:relative;width:100%;max-width:30rem;max-height:calc(100vh - 2rem);overflow:auto;background:#0e1730;color:#eef3fb;border:1px solid rgba(120,160,230,.28);border-radius:1.2rem;padding:1.5rem 1.3rem 1.2rem;box-shadow:0 20px 60px rgba(0,0,0,.55)}"
        + ".dlsend__kick{font:600 .72rem/1.4 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.12em;color:#4fb3ff;margin:0 0 .5rem}"
        + ".dlsend__box h2{font-size:1.45rem;line-height:1.2;margin:0 2rem .6rem 0;color:#fff}"
        + ".dlsend__box p{margin:0 0 1rem;line-height:1.5}"
        + ".dlsend__btns{display:grid;gap:.6rem;margin:0 0 1rem}"
        + ".dlsend__btns .button{width:100%;justify-content:center;text-align:center}"
        + ".dlsend__x{position:absolute;top:.6rem;right:.6rem;width:2.6rem;height:2.6rem;border-radius:50%;border:1px solid rgba(120,160,230,.3);background:transparent;color:#eef3fb;font-size:1.4rem;line-height:1;cursor:pointer}"
        + ".dlsend__small{font-size:.88rem;color:#a9b6cc;margin:0!important}.dlsend__small a{color:#a9b6cc}"
        + "html.dlsend-open{overflow:hidden}";
      document.head.appendChild(st);
    }
    panel = document.createElement("div");
    panel.className = "dlsend";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "dlsend-h");
    const canShare = typeof navigator.share === "function";
    panel.innerHTML =
      '<div class="dlsend__box">'
      + '<button type="button" class="dlsend__x" aria-label="Close">&times;</button>'
      + '<p class="dlsend__kick">// FOR A WINDOWS PC</p>'
      + '<h2 id="dlsend-h">Send it to your computer</h2>'
      + '<p>' + a.name + ' is a Windows program, so it won&rsquo;t install on this ' + device
      + '. Send yourself the link, then open it on your Windows 10 or 11 PC or laptop to download it.</p>'
      + '<div class="dlsend__btns">'
      + (canShare ? '<button type="button" class="button primary" data-dlsend="share">Send me the link</button>' : '')
      + '<a class="button ' + (canShare ? 'secondary' : 'primary') + '" data-dlsend="email" href="mailto:?subject='
      + encodeURIComponent(subject) + '&amp;body=' + encodeURIComponent(body) + '">Email me the link</a>'
      + '<button type="button" class="button secondary" data-dlsend="copy">Copy the link</button>'
      + '</div>'
      + '<p class="dlsend__small"><a data-dlsend="anyway" href="' + link.getAttribute("href").replace(/"/g, "&quot;")
      + '" download>Download the Windows file here anyway</a></p>'
      + '</div>';
    back = link;
    document.body.appendChild(panel);
    document.documentElement.classList.add("dlsend-open");
    panel.addEventListener("click", (e) => {
      if (e.target === panel || e.target.closest(".dlsend__x")) { close(); return; }
      const b = e.target.closest("[data-dlsend]");
      if (!b) return;
      const how = b.getAttribute("data-dlsend");
      if (how === "share") {
        navigator.share({ title: subject, text: body.split("\n")[0], url }).then(() => sent(app, "share")).catch(() => {});
      } else if (how === "email") {
        sent(app, "email");
      } else if (how === "copy") {
        const done = () => { b.textContent = "Copied ✓ - paste it into an email or message to yourself"; sent(app, "copy"); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => { window.prompt("Copy this link:", url); sent(app, "copy"); });
        else { window.prompt("Copy this link:", url); sent(app, "copy"); }
      } else if (how === "anyway") {
        setTimeout(close, 300);
      }
    });
    panel.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    const first = panel.querySelector("[data-dlsend]");
    if (first) { try { first.focus(); } catch (e) {} }
  }

  window.addEventListener("click", (e) => {
    const link = e.target && e.target.closest && e.target.closest("a[href]");
    if (!link || link.closest(".dlsend")) return;
    const href = link.getAttribute("href") || "";
    const app = Object.keys(APPS).find((k) => APPS[k].re.test(href));
    if (!app) return;
    e.preventDefault();
    open(app, link);
  }, true);

  /* 18 Oct 2026 (portal Live, 7 days: 40% of visitors on a phone or tablet, and ONE link sent to a computer): the panel
     only opened for someone who tapped "Download ... for Windows", and on a phone people pass that button by. Off Windows
     every installer button now says what it does there. Only its words change: the link, the panel above, the beacon's
     cancel and the /~send/ count are exactly as before. Buttons a page adds later (the benchmark's result) are caught too. */
  const sendLabel = /^(iPhone|iPad|phone|tablet)$/.test(device) ? "Send it to my computer" : "Send it to my Windows PC";
  function relabel() {
    document.querySelectorAll('a[href*=".exe"]').forEach((a) => {
      if (a.dataset.dlsendLbl || a.closest(".dlsend")) return;
      const href = a.getAttribute("href") || "";
      if (!Object.keys(APPS).some((k) => APPS[k].re.test(href))) return;
      if (!/^\s*Download/i.test(a.textContent || "")) return;   // every installer button starts "Download" (18 Oct: 90 on the site)
      a.dataset.dlsendLbl = "1";
      a.textContent = sendLabel + " →";
      if (a.hasAttribute("aria-label")) a.setAttribute("aria-label", sendLabel);
    });
  }
  relabel();
  if ("MutationObserver" in window && document.body) {
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; relabel(); });
    }).observe(document.body, { childList: true, subtree: true });
  }
})();

/* ---------------- an app download on a Windows PC: the steps, at the moment they're needed ----------------
   18 Oct 2026 (portal, 7 days: ~43 PC Manager download clicks, 20 new installs - more than half never got installed):
   the install steps lived only under the button on each app's own page. Now any installer download on a Windows PC, on
   any page (the app boxes, the benchmark and Wi-Fi results, the Virgin and email pages), brings up a small card under
   the header with the steps and the two warnings Windows may show - worded as /free-pc-health-check/#download and
   /techies-one-mail/#download word them. It never blocks the download, takes focus or counts anything. */
(function () {
  const ua = navigator.userAgent || "";
  const uad = navigator.userAgentData;
  const isWin = /Windows NT|Win64|WOW64/.test(ua) || (uad && uad.platform === "Windows");
  if (!isWin) return;
  const APPS = {
    pcm: { re: /365-pc-manager-setup[^/?#]*\.exe([?#]|$)/i, name: "365 PC Manager", help: "/free-pc-health-check/#download",
      last: "<b>It opens and checks your PC.</b> Your health score comes up in plain English, and after that it&rsquo;s in your Start menu." },
    t1: { re: /TechiesOneMail-Setup[^/?#]*\.exe([?#]|$)/i, name: "Techies One Mail", help: "/techies-one-mail/#download",
      last: "<b>Type your email address.</b> It fills in the settings itself for BT, Sky, Plusnet, Gmail, Yahoo, AOL and Outlook.com." },
    tpdf: { re: /TechiesPDF-Setup[^/?#]*\.exe([?#]|$)/i, name: "Techies PDF", help: "/techies-pdf/#download",
      last: "<b>Open a PDF, or choose a job.</b> Fill in and sign, join, shrink for email: each has its own big button." },
    tmove: { re: /TechiesMove-Setup[^/?#]*\.exe([?#]|$)/i, name: "Techies Move", help: "/techies-move/#download",
      last: "<b>Choose OLD or NEW computer.</b> On the old PC it says what size of USB stick you need; on the new one it puts it all back." },
  };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let card = null;

  function close() {
    if (!card) return;
    card.remove(); card = null;
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape") close(); }
  function show(app, href) {
    close();
    const a = APPS[app];
    let file = href.split(/[?#]/)[0].split("/").pop() || "";
    try { file = decodeURIComponent(file); } catch (e) {}
    if (!document.getElementById("dlhelp-css")) {
      const st = document.createElement("style");
      st.id = "dlhelp-css";
      st.textContent =
        ".dlhelp{position:fixed;z-index:1250;top:calc(var(--header-h,76px) + var(--ticker-h,0px) + .75rem);right:1rem;width:min(25rem,calc(100vw - 2rem));max-height:calc(100vh - var(--header-h,76px) - 2rem);overflow:auto;"
        + "background:#0e1730;color:#eef3fb;border:1px solid rgba(120,160,230,.32);border-radius:1.1rem;padding:1.1rem 1.15rem 1rem;box-shadow:0 20px 60px rgba(0,0,0,.55);font-size:.92rem;line-height:1.5}"
        + "@media (prefers-reduced-motion:no-preference){.dlhelp{animation:dlhelp-in .25s ease-out}@keyframes dlhelp-in{from{opacity:0;transform:translateY(-8px)}}}"
        + ".dlhelp__kick{font:600 .7rem/1.4 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.12em;color:#4fb3ff;margin:0 2.4rem .35rem 0}"
        + ".dlhelp h2{font-size:1.15rem;line-height:1.25;margin:0 2.4rem .6rem 0;color:#fff}"
        + ".dlhelp ol{margin:0 0 .7rem;padding-left:1.4rem;display:grid;gap:.45rem;list-style:decimal outside}.dlhelp li{display:list-item;list-style:inherit;padding-left:.15rem}.dlhelp li::marker{color:#4fb3ff;font-weight:700}.dlhelp b{color:#fff}"
        + ".dlhelp code{font:600 .8rem ui-monospace,Menlo,Consolas,monospace;color:#cfe3ff;word-break:break-all}"
        + ".dlhelp__warn{border-top:1px solid rgba(120,160,230,.22);padding-top:.6rem;font-size:.84rem;color:#c3cfe2}.dlhelp__warn p{margin:0 0 .45rem}"
        + ".dlhelp__warn a{color:#7cc4ff}"
        + ".dlhelp__x{position:absolute;top:.55rem;right:.55rem;width:2.3rem;height:2.3rem;border-radius:50%;border:1px solid rgba(120,160,230,.3);background:transparent;color:#eef3fb;font-size:1.3rem;line-height:1;cursor:pointer}"
        + ".dlhelp__x:focus-visible,.dlhelp a:focus-visible{outline:2px solid #4fb3ff;outline-offset:2px}";
      document.head.appendChild(st);
    }
    card = document.createElement("div");
    card.className = "dlhelp";
    card.setAttribute("role", "status");
    card.setAttribute("aria-live", "polite");
    card.innerHTML =
      '<button type="button" class="dlhelp__x" aria-label="Close the install steps">&times;</button>'
      + '<p class="dlhelp__kick">// DOWNLOADING ' + a.name.toUpperCase() + '</p>'
      + '<h2>Three quick steps</h2>'
      + '<ol><li><b>Open the file.</b> It&rsquo;s called <code>' + esc(file) + '</code>. Your browser shows it at the top or bottom of the window, or it&rsquo;s in your Downloads folder.</li>'
      + '<li><b>Let it install.</b> It takes a few seconds and needs no administrator password.</li>'
      + '<li>' + a.last + '</li></ol>'
      + '<div class="dlhelp__warn">'
      + '<p><b>Edge says it &ldquo;isn&rsquo;t commonly downloaded&rdquo;?</b> Press the three dots next to it, choose Keep, then Show more and Keep anyway.</p>'
      + '<p><b>A blue &ldquo;Windows protected your PC&rdquo; box?</b> Choose More info, check the publisher says 365 Techies Ltd, then Run anyway. If it says anything else, don&rsquo;t run it.</p>'
      + '<p><a href="' + a.help + '">More help with installing</a></p></div>';
    card.querySelector(".dlhelp__x").addEventListener("click", close);
    document.body.appendChild(card);
    document.addEventListener("keydown", onKey);
  }

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented) return;
    const link = e.target && e.target.closest && e.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    const app = Object.keys(APPS).find((k) => APPS[k].re.test(href));
    if (app) show(app, href);
  });
})();

// Reading-progress bar: long guides only (4+ content sections), motion-safe.
// A 2px gradient line at the very top tracking scroll position.
(function () {
  if (REDUCED) return;
  if (document.querySelectorAll("main .section").length < 4) return;
  const bar = document.createElement("div");
  bar.className = "read-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  const paint = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  };
  let raf = 0;
  window.addEventListener("scroll", () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; paint(); });
  }, { passive: true });
  paint(); // deep links (#s5 etc.) land mid-page — show the true position immediately
})();
