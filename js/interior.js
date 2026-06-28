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
const HAS_GSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
const isMobile = () => window.innerWidth < 920;

if (HAS_GSAP) gsap.registerPlugin(ScrollTrigger);

/* ---------------- header + mobile menu ---------------- */
const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".mobile-menu-button");
const mobileMenu = document.querySelector(".mobile-menu");
const menuBackdrop = document.querySelector(".menu-backdrop");

let menuOpen = false;
let menuTl = null;

if (mobileMenu && HAS_GSAP && !REDUCED) {
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

/* ---------------- counters ---------------- */
function initCounters() {
  document.querySelectorAll(".stat-num").forEach((el) => {
    const target = parseFloat(el.dataset.count);
    if (isNaN(target)) return;
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const fmt = (v) => v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (!HAS_GSAP || REDUCED) { el.textContent = fmt(target); return; }
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
  const load = gsap.timeline({ defaults: { ease: "power3.out" } });
  load
    .from(".site-header", { y: -110, opacity: 0, duration: 0.8 })
    .from(".desktop-nav > a, .desktop-nav .nav-item", { y: -18, opacity: 0, duration: 0.5, stagger: 0.06 }, 0.3);

  const hero = document.querySelector(".page-hero");
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

  if (HAS_GSAP) {
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

/* ---------------- web forms → HubSpot Forms API (real lead capture, no server needed) ---------------- */
/* Submits straight to HubSpot's public forms endpoint from the browser, shows an on-page
   success state, and falls back to phone/text/email if anything goes wrong. Binds EVERY form. */
const HS_ENDPOINT = "https://api-eu1.hsforms.com/submissions/v3/integration/submit/148562638/7563b461-a18e-4193-9938-b505d05fcbad";
const FALLBACK = 'call <a href="tel:+441202775566">01202&nbsp;775566</a>, text <a href="sms:+447520615332">07520&nbsp;615332</a> or email <a href="mailto:help@365techies.co.uk">help@365techies.co.uk</a>';
document.querySelectorAll(".contact-form").forEach((form) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    if ((data.get("company_website") || "").toString().trim()) return; // honeypot: silently drop bots
    const get = (k) => (data.get(k) || "").toString().trim();
    const email = get("email"), name = get("name"), phone = get("phone");
    const extras = [];
    for (const [k, val] of data.entries()) {
      if (["name", "email", "phone", "company_website"].includes(k)) continue;
      const s = (val || "").toString().trim();
      if (s) extras.push(`${k}: ${s}`);
    }
    const fields = [];
    if (email) fields.push({ name: "email", value: email });
    if (name) fields.push({ name: "firstname", value: name });
    if (phone) fields.push({ name: "phone", value: phone });
    if (extras.length) fields.push({ name: "message", value: extras.join("\n") });
    const status = form.querySelector(".form-status");
    const btn = form.querySelector('button[type="submit"], button:not([type])');
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Sending…"; }
    try {
      const res = await fetch(HS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, context: { pageUri: location.href, pageName: document.title } }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      form.innerHTML =
        '<div class="form-success" role="status" aria-live="polite">' +
        "<h3>Thank you &mdash; we&rsquo;ve got your message.</h3>" +
        "<p>We reply within one working day (Mon&ndash;Fri, 9am&ndash;5pm). Need help sooner? " +
        'Call <a href="tel:+441202775566">01202 775566</a> or text <a href="sms:+447520615332">07520 615332</a>.</p></div>';
    } catch (err) {
      if (btn) { btn.disabled = false; if (btn.dataset.label) btn.textContent = btn.dataset.label; }
      if (status) status.innerHTML = "Sorry &mdash; we couldn&rsquo;t send that just now. Please " + FALLBACK + ".";
    }
  });
});

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
initCounters();
if (HAS_GSAP && !REDUCED) initUI();
// WebGL background only runs where a #tech-background canvas exists (homepage only now);
// interior/landing pages use the lightweight static CSS background — no Three.js fetch.
const bgCanvas = document.querySelector("#tech-background");
// Desktop only + deferred to idle (the Three.js background is ~1.2MB).
const WANT_BG = bgCanvas && !REDUCED && !LOW_POWER
  && window.innerWidth >= 920
  && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (WANT_BG) {
  if ("requestIdleCallback" in window) requestIdleCallback(() => initBackground(), { timeout: 3000 });
  else window.addEventListener("load", () => setTimeout(initBackground, 250));
} else if (bgCanvas) bgCanvas.remove();
