/* ==========================================================================
   365 TECHIES — control-centre background (Three.js) + UI choreography (GSAP)
   Scroll scenes (homepage v3): hero tunnel, the "What do you need?" tiles morph it on
   hover → home network beside "Fix it, look after it" → office network beside the plans
   → plan split → safe remote support beside the questions → the towns on the map → CTA ring
   ========================================================================== */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Only skip the WebGL background for Data Saver users (reduced-motion handled at boot);
// it runs everywhere else, lighter on mobile.
const LOW_POWER = (() => {
  try { return !!(navigator.connection && navigator.connection.saveData); } catch (e) { return false; }
})();
/* GSAP + ScrollTrigger arrive via the desktop-only motion gate in <head>
   (phones never download them), so presence is checked LIVE, not cached
   at module time — the libs usually land after this module has run. */
const hasGsap = () => typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
// Cached so per-frame callers never force a layout read (innerWidth flushes layout).
let _isMobile = window.innerWidth < 920;
const isMobile = () => _isMobile;
window.addEventListener("resize", () => { _isMobile = window.innerWidth < 920; }, { passive: true });

/* Scroll-driven scene intensities, tweened by ScrollTrigger, read by the
   render loop every frame. */
const fx = { home: 0, biz: 0, split: 0, safe: 0, converge: 0, map: 0 };

/* ==========================================================================
   HEADER + MOBILE MENU
   ========================================================================== */

const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".mobile-menu-button");
const mobileMenu = document.querySelector(".mobile-menu");
const menuBackdrop = document.querySelector(".menu-backdrop");
const mobileLinks = mobileMenu.querySelectorAll(".mobile-menu__nav > a, .mobile-menu__nav > .m-group > summary");
const mobilePlanButtons = mobileMenu.querySelectorAll(".mobile-menu__plans .button");

let menuOpen = false;
let menuTl = null;

function buildMenuTl() {
  if (menuTl || !hasGsap() || REDUCED) return;
  // visibility is flipped in setMenu(), NOT here — a .set() at position 0
  // renders immediately and would leave the backdrop covering the page.
  menuTl = gsap.timeline({
    paused: true,
    onReverseComplete: () => gsap.set([mobileMenu, menuBackdrop], { visibility: "hidden" }),
  })
    .to(menuBackdrop, { opacity: 1, duration: 0.35, ease: "power2.out" }, 0)
    // x:0 clears the px offset GSAP parses out of the CSS translateX(100%) fallback
    .fromTo(mobileMenu, { xPercent: 100, x: 0 }, { xPercent: 0, x: 0, duration: 0.5, ease: "power3.out" }, 0)
    .fromTo(mobileLinks,
      { x: 44, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.45, stagger: 0.055, ease: "power3.out" }, 0.16)
    .fromTo(mobilePlanButtons,
      { y: 22, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.09, ease: "back.out(1.6)" }, 0.42);
}

function setMenu(open) {
  menuOpen = open;
  menuButton.classList.toggle("is-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  mobileMenu.setAttribute("aria-hidden", String(!open));
  document.body.classList.toggle("menu-open", open);

  if (menuTl) {
    if (open) {
      gsap.set([mobileMenu, menuBackdrop], { visibility: "visible" });
      menuTl.timeScale(1).play();
    } else {
      menuTl.timeScale(1.6).reverse();
    }
  } else {
    // No-animation fallback
    mobileMenu.style.visibility = open ? "visible" : "hidden";
    mobileMenu.style.transform = open ? "translateX(0)" : "translateX(100%)";
    menuBackdrop.style.visibility = open ? "visible" : "hidden";
    menuBackdrop.style.opacity = open ? "1" : "0";
  }
  if (open) { const f = mobileMenu.querySelector("a, button"); if (f) { try { f.focus(); } catch (e) {} } }
  else if (document.activeElement && mobileMenu.contains(document.activeElement)) { try { menuButton.focus(); } catch (e) {} }
}

menuButton.addEventListener("click", () => setMenu(!menuOpen));
menuBackdrop.addEventListener("click", () => setMenu(false));
document.querySelector(".header-bar .logo").addEventListener("click", () => { if (menuOpen) setMenu(false); });
// Close the menu only on REAL links - a group header (summary) must open its
// section in place, never close the whole menu (that was the tap-tap-tap bug).
mobileMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

/* Accordion groups: animated open/close, one open at a time, reduced-motion aware */
const mGroups = mobileMenu.querySelectorAll(".m-group");
mGroups.forEach((g) => {
  const sum = g.querySelector("summary");
  const body = g.querySelector(".m-group__links");
  if (!sum || !body) return;
  sum.addEventListener("click", (e) => {
    e.preventDefault();
    const opening = !g.hasAttribute("open");
    // close any other open group (accordion) so the list never becomes a wall
    mGroups.forEach((o) => {
      if (o !== g && o.hasAttribute("open")) collapse(o);
    });
    if (opening) expand(g); else collapse(g);
  });
});
function expand(g) {
  const body = g.querySelector(".m-group__links");
  g.setAttribute("open", "");
  if (REDUCED) return;
  body.style.overflow = "hidden";
  body.style.maxHeight = "0px";
  body.style.opacity = "0";
  requestAnimationFrame(() => {
    body.style.transition = "max-height .34s cubic-bezier(.22,1,.36,1), opacity .3s ease";
    body.style.maxHeight = body.scrollHeight + "px";
    body.style.opacity = "1";
    setTimeout(() => { body.style.maxHeight = ""; body.style.overflow = ""; body.style.transition = ""; }, 380);
  });
}
function collapse(g) {
  const body = g.querySelector(".m-group__links");
  if (REDUCED) { g.removeAttribute("open"); return; }
  body.style.overflow = "hidden";
  body.style.maxHeight = body.scrollHeight + "px";
  requestAnimationFrame(() => {
    body.style.transition = "max-height .28s cubic-bezier(.55,0,.55,.2), opacity .24s ease";
    body.style.maxHeight = "0px";
    body.style.opacity = "0";
    setTimeout(() => {
      g.removeAttribute("open");
      body.style.maxHeight = ""; body.style.overflow = ""; body.style.transition = ""; body.style.opacity = "";
    }, 300);
  });
}
mobilePlanButtons.forEach((a) => a.addEventListener("click", () => setMenu(false)));
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) setMenu(false); });

/* open HubSpot chat from [data-open-chat] */
document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-open-chat]");
  if (!trigger) return;
  e.preventDefault();
  const hs = window.HubSpotConversations;
  if (hs && hs.widget && typeof hs.widget.open === "function") hs.widget.open();
  else window.location.href = "/contact/";
});

/* ==========================================================================
   GSAP UI ANIMATIONS
   ========================================================================== */

function initCounters() {
  document.querySelectorAll(".stat-num").forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const fmt = (v) => v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

    // Static on mobile too: skips per-stat ScrollTrigger setup (layout reads)
    if (!hasGsap() || REDUCED || isMobile()) { el.textContent = fmt(target); return; }

    const proxy = { v: 0 };
    gsap.to(proxy, {
      v: target,
      duration: 1.6,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
      onUpdate: () => { el.textContent = fmt(proxy.v); },
      onComplete: () => { el.textContent = fmt(target); },
    });
  });
}

function initUI() {
  /* ---- page load: header + hero (DESKTOP ONLY) ----
     On mobile the hero H1/sub is the LCP element; a .from() intro re-hides the
     already-painted text and replays it once the GSAP CDN arrives, which gates
     LCP on a third-party request + a ~1s tween (measured ~2s of render delay).
     Mobile therefore keeps the first CSS paint and skips the intro entirely.
     GSAP also arrives async now (motion gate) — if it lands late, skip the
     intro rather than re-hide content the visitor is already reading. */
  if (!isMobile() && performance.now() < 2500) {
    const load = gsap.timeline({ defaults: { ease: "power3.out" } });

    load
      .from(".site-header", { y: -110, opacity: 0, duration: 0.8 })
      .from(".desktop-nav > a, .desktop-nav .nav-item", {
        y: -18, opacity: 0, duration: 0.5, stagger: 0.07,
      }, 0.3)
      .from(".hero__eyebrow", { y: 24, opacity: 0, duration: 0.6 }, 0.45)
      .from(".hero__title .line-inner", {
        yPercent: 118, duration: 1.05, stagger: 0.13, ease: "power4.out",
      }, 0.55)
      .from(".hero__sub", { y: 36, opacity: 0, duration: 0.8 }, 1.05)
      .from(".hero-buttons .button", {
        y: 28, opacity: 0, scale: 0.92, duration: 0.65, stagger: 0.12, ease: "back.out(1.7)",
      }, 1.25)
      .from(".hp-intents", { x: 40, opacity: 0, duration: 0.9 }, 1.0)
      .from(".hp-quickbar > *", { y: 14, opacity: 0, duration: 0.5, stagger: 0.06 }, 1.5);
  }

  /* ---- header darkens after scrolling past the hero top ---- */
  ScrollTrigger.create({
    start: 70,
    onEnter: () => header.classList.add("is-scrolled"),
    onLeaveBack: () => header.classList.remove("is-scrolled"),
  });

  /* ---- section titles: blur-to-sharp rise + glowing underline ---- */
  gsap.utils.toArray("[data-title]").forEach((title) => {
    const underline = title.querySelector(".title-underline");
    const tl = gsap.timeline({
      scrollTrigger: { trigger: title, start: "top 85%" },
      defaults: { ease: "power3.out" },
    });
    tl.from(title, { y: 52, opacity: 0, filter: "blur(10px)", duration: 0.85 });
    if (underline) tl.from(underline, { scaleX: 0, duration: 0.7, ease: "power2.inOut" }, 0.35);
  });

  /* ---- generic fade-up reveals ---- */
  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: "top 88%" },
      y: 34, opacity: 0, duration: 0.75, ease: "power3.out",
    });
  });

  /* ---- staggered child reveals (chips, app tiles, security cards) ---- */
  gsap.utils.toArray("[data-stagger]").forEach((wrap) => {
    gsap.from(wrap.children, {
      scrollTrigger: { trigger: wrap, start: "top 88%" },
      y: 26, opacity: 0, duration: 0.55, stagger: 0.07, ease: "power3.out",
    });
  });

  /* ---- plan cards: slide in from the sides, then reveal contents ---- */
  const planCards = [
    { el: document.querySelector(".plan-card--home"), fromX: -90 },
    { el: document.querySelector(".plan-card--business"), fromX: 90 },
  ];
  planCards.forEach(({ el, fromX }) => {
    if (!el) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 82%" },
      defaults: { ease: "power3.out" },
    });
    tl.from(el, { x: fromX, opacity: 0, scale: 0.97, duration: 0.85 })
      .from(el.querySelector(".plan-card__price"), { opacity: 0, y: 18, duration: 0.5 }, 0.45)
      .from(el.querySelectorAll(".plan-card__features li"), {
        opacity: 0, x: -16, duration: 0.4, stagger: 0.07,
      }, 0.55)
      .from(el.querySelector(".plan-card__cta"), { opacity: 0, y: 14, duration: 0.45 }, ">-0.15");
  });

  /* ---- button hover micro-interaction ---- */
  if (window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".button, .nav-cta, .nav-sos").forEach((button) => {
      button.addEventListener("mouseenter", () => gsap.to(button, { scale: 1.05, duration: 0.25, ease: "power2.out" }));
      button.addEventListener("mouseleave", () => gsap.to(button, { scale: 1, duration: 0.3, ease: "power2.out" }));
    });
  }

  /* ---- scroll scene intensities for the Three.js layer ---- */
  const scene = (sel, key, start = "top 80%", end = "bottom 25%", ramp = 0.32) => {
    const el = document.querySelector(sel);
    if (!el) return;
    gsap.timeline({
      scrollTrigger: { trigger: el, start, end, scrub: 0.8 },
    })
      .to(fx, { [key]: 1, duration: ramp, ease: "none" })
      .to(fx, { [key]: 0, duration: ramp, ease: "none" }, 1 - ramp);
  };
  /* fx.* is read only by the desktop-only WebGL render loop — on mobile these
     scrub triggers (the costliest, layout-reading kind) would animate nothing. */
  if (!isMobile()) {
    /* homepage v3: the page is mostly cards, which hide what is behind them, so each scene
       is timed to a piece of OPEN page and the background draws it in that space */
    scene("#help .hp-head", "home", "top 92%", "bottom 8%", 0.25); // beside "Fix it, look after it..."
    scene("#plans .hp-head", "biz", "top 92%", "bottom 8%", 0.25); // beside the plans heading
    scene("#plans", "split"); // dots part so the plan cards read cleanly
    scene("#faq", "safe", "top 85%", "bottom 15%", 0.25); // safe remote support, under "Before you call"
    scene("#areas .hp-map", "map", "top 90%", "bottom 10%", 0.25); // the real towns on the map

    /* CTA convergence ramps up and stays */
    gsap.to(fx, {
      converge: 1, ease: "none",
      scrollTrigger: { trigger: "#cta", start: "top 95%", end: "center 55%", scrub: 0.8 },
    });
  }
}

/* ==========================================================================
   THREE.JS BACKGROUND
   ========================================================================== */

async function initBackground() {
  let THREE;
  try {
    THREE = await import("three");
  } catch {
    initLiteBackground(document.querySelector("#tech-background")); // no Three.js: the light version
    return;
  }

  const canvas = document.querySelector("#tech-background");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    initLiteBackground(canvas); // no WebGL: the light version
    return;
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070d22, 0.035);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 9;

  /* soft round glow sprite for particles + nodes */
  function glowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  const sprite = glowTexture();

  /* ---------------- particle field ---------------- */
  const mobile = isMobile();
  const COUNT = mobile ? 300 : 900;
  const SPREAD = { x: 26, y: 16, z: 22 };

  const base = new Float32Array(COUNT * 3);
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);

  /* brand colours from 365techies.co.uk */
  const cCyan = new THREE.Color(0x1d97e3);
  const cGreen = new THREE.Color(0x00ce1b);
  const cBlue = new THREE.Color(0x324a6d);

  for (let i = 0; i < COUNT; i++) {
    base[i * 3] = (Math.random() - 0.5) * SPREAD.x;
    base[i * 3 + 1] = (Math.random() - 0.5) * SPREAD.y;
    base[i * 3 + 2] = (Math.random() - 0.5) * SPREAD.z;
    const r = Math.random();
    const col = r < 0.55 ? cCyan : r < 0.78 ? cBlue : cGreen;
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  positions.set(base);

  /* per-particle convergence target: a loose double-ring vortex */
  const ringTarget = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const a = i * 2.399963; // golden angle — even angular spread
    const r = 2.1 + (i % 50) / 50 * 1.6;
    ringTarget[i * 3] = Math.cos(a) * r;
    ringTarget[i * 3 + 1] = Math.sin(a) * r * 0.62;
    ringTarget[i * 3 + 2] = 0.1 + (i % 7) * 0.14; // keep the vortex away from the camera
  }

  const fieldGeo = new THREE.BufferGeometry();
  fieldGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  fieldGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const PARTICLE_SIZE = mobile ? 0.16 : 0.13;
  const fieldMat = new THREE.PointsMaterial({
    size: PARTICLE_SIZE,
    map: sprite,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const field = new THREE.Points(fieldGeo, fieldMat);
  const fieldGroup = new THREE.Group();
  fieldGroup.add(field);
  scene.add(fieldGroup);

  /* ---------------- network web (glowing connection lines) ---------------- */
  const webPoints = [];
  const webCount = mobile ? 50 : 110;
  for (let i = 0; i < webCount; i++) {
    webPoints.push(new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 10,
    ));
  }
  const webVerts = [];
  for (let i = 0; i < webCount; i++) {
    for (let j = i + 1; j < webCount; j++) {
      if (webPoints[i].distanceTo(webPoints[j]) < 3.4) {
        webVerts.push(webPoints[i].x, webPoints[i].y, webPoints[i].z);
        webVerts.push(webPoints[j].x, webPoints[j].y, webPoints[j].z);
      }
    }
  }
  const webGeo = new THREE.BufferGeometry();
  webGeo.setAttribute("position", new THREE.Float32BufferAttribute(webVerts, 3));
  const webMat = new THREE.LineBasicMaterial({
    color: 0x0b73b5, transparent: true, opacity: 0.16,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const web = new THREE.LineSegments(webGeo, webMat);
  fieldGroup.add(web);

  /* ---------------- constellation builder ---------------- */
  function makeNetwork({ nodes, edges, nodeColor, lineColor, hub = 0 }) {
    const group = new THREE.Group();
    const mats = [];

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.Float32BufferAttribute(nodes.flat(), 3));
    const nodeMat = new THREE.PointsMaterial({
      size: 0.34, map: sprite, color: nodeColor,
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    nodeMat.userData.base = 1;
    mats.push(nodeMat);
    group.add(new THREE.Points(nodeGeo, nodeMat));
    group.userData.nodeMat = nodeMat;

    const lineVerts = [];
    edges.forEach(([a, b]) => {
      lineVerts.push(...nodes[a], ...nodes[b]);
    });
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lineVerts, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: lineColor, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    lineMat.userData.base = 0.55;
    mats.push(lineMat);
    group.add(new THREE.LineSegments(lineGeo, lineMat));

    // hub marker: small rotating wireframe octahedron
    const hubMat = new THREE.MeshBasicMaterial({
      color: nodeColor, wireframe: true, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    hubMat.userData.base = 0.8;
    mats.push(hubMat);
    const hubMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), hubMat);
    hubMesh.position.set(...nodes[hub]);
    group.add(hubMesh);
    group.userData.hubMesh = hubMesh;

    group.userData.mats = mats;
    group.visible = false;
    scene.add(group);
    return group;
  }

  /* HOME network — router hub with household devices */
  const homeGroup = makeNetwork({
    nodes: [
      [0, 0, 0],          // router hub
      [-1.8, 0.9, 0.2],   // laptop
      [1.7, 1.1, -0.2],   // printer
      [0.1, 2.1, 0.3],    // cloud / email
      [-1.5, -1.2, -0.2], // phone
      [1.6, -1.0, 0.3],   // tv
      [0.0, -2.1, 0.0],   // games console
    ],
    edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]],
    nodeColor: 0x1d97e3,
    lineColor: 0x0b73b5,
  });

  /* Wi-Fi pulse rings around the home hub */
  const homeRings = [];
  for (let i = 0; i < 3; i++) {
    const rm = new THREE.Mesh(
      new THREE.RingGeometry(0.96, 1.0, 48),
      new THREE.MeshBasicMaterial({
        color: 0x00ce1b, transparent: true, opacity: 0, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    rm.userData.phase = i / 3;
    homeGroup.add(rm);
    homeRings.push(rm);
  }

  /* BUSINESS network — staff grid + cloud + shield nodes */
  const bizNodes = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      bizNodes.push([(c - 1) * 1.5, (r - 1) * 1.3, (Math.random() - 0.5) * 0.4]);
    }
  }
  bizNodes.push([0, 2.7, -0.3]); // 9: Microsoft 365 cloud
  bizNodes.push([0, -2.6, 0.2]); // 10: security shield
  const bizEdges = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      if (c < 2) bizEdges.push([i, i + 1]);
      if (r < 2) bizEdges.push([i, i + 3]);
    }
  }
  bizEdges.push([7, 9], [9, 4], [1, 10], [10, 4]);
  const bizGroup = makeNetwork({
    nodes: bizNodes, edges: bizEdges, hub: 4,
    nodeColor: 0x00ce1b, lineColor: 0x00a82a,
  });

  /* SAFE REMOTE SUPPORT (homepage v3, beside "Before you call"): your laptop on the left and our
     techie's screen on the right. The phone rings first, the padlock clicks shut, then the
     connection runs and your screen gets a tick. Loops every 7 seconds. (Replaced the abstract
     rings-and-globe "shield" on the owner's request, 25 Sep 2026: it said nothing about the business.) */
  const safeGroup = new THREE.Group();
  const safeMats = [];
  const safeMat = (color, base) => {
    const m = new THREE.LineBasicMaterial({
      color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    m.userData.base = base;
    safeMats.push(m);
    return m;
  };
  /* line art; each path is drawn twice, a hair apart, so 1px WebGL lines read as a firmer stroke */
  const safeLines = (paths, mat, parent = safeGroup) => {
    const v = [];
    for (const [pts, closed] of paths) {
      const n = closed ? pts.length : pts.length - 1;
      for (const d of [0, 0.012]) {
        for (let i = 0; i < n; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          v.push(a[0] + d, a[1] + d, 0, b[0] + d, b[1] + d, 0);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    parent.add(new THREE.LineSegments(g, mat));
  };
  const rrect = (x0, y0, x1, y1, r) => {
    const p = [];
    const corner = (cx, cy, a0) => {
      for (let k = 0; k <= 4; k++) { const a = a0 + (k / 4) * (Math.PI / 2); p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    };
    corner(x1 - r, y1 - r, 0); corner(x0 + r, y1 - r, Math.PI / 2);
    corner(x0 + r, y0 + r, Math.PI); corner(x1 - r, y0 + r, Math.PI * 1.5);
    return p;
  };
  const arcPts = (cx, cy, r, a0, a1, n = 14) =>
    Array.from({ length: n + 1 }, (_, k) => { const a = a0 + ((a1 - a0) * k) / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const SY = -0.55; // centres the drawing on its anchor

  /* your laptop (left, blue) */
  safeLines([
    [rrect(-2.55, -0.15 + SY, -0.95, 0.95 + SY, 0.08), true],
    [[[-2.75, -0.25 + SY], [-0.75, -0.25 + SY], [-0.6, -0.42 + SY], [-2.9, -0.42 + SY]], true],
  ], safeMat(0x1d97e3, 0.95));
  /* our techie's screen, with a person on it (right, green) */
  safeLines([
    [rrect(0.95, -0.05 + SY, 2.55, 1.0 + SY, 0.06), true],
    [[[1.75, -0.05 + SY], [1.75, -0.3 + SY]], false],
    [[[1.4, -0.3 + SY], [2.1, -0.3 + SY]], false],
    [arcPts(1.75, 0.62 + SY, 0.15, 0, Math.PI * 2, 18), true],
    [arcPts(1.75, 0.1 + SY, 0.32, 0.3, Math.PI - 0.3, 12), false],
  ], safeMat(0x00ce1b, 0.95));
  /* the tick that appears on your screen once connected */
  const tickMat = safeMat(0x39d353, 1);
  safeLines([[[[-2.05, 0.4 + SY], [-1.85, 0.2 + SY], [-1.45, 0.68 + SY]], false]], tickMat);
  /* the link between the two screens */
  const linkMat = safeMat(0x6cc4f5, 0.55);
  safeLines([[[[-0.9, 0.45 + SY], [-0.27, 0.45 + SY]], false], [[[0.27, 0.45 + SY], [0.9, 0.45 + SY]], false]], linkMat);
  /* the padlock in the middle: body, keyhole, and a shackle that drops shut */
  const lockMat = safeMat(0xffc933, 0.95);
  safeLines([
    [rrect(-0.2, 0.3 + SY, 0.2, 0.6 + SY, 0.05), true],
    [arcPts(0, 0.48 + SY, 0.04, 0, Math.PI * 2, 10), true],
    [[[0, 0.44 + SY], [0, 0.37 + SY]], false],
  ], lockMat);
  const shackle = new THREE.Group();
  safeLines([[[[-0.13, 0.55 + SY], ...arcPts(0, 0.6 + SY, 0.13, Math.PI, 0, 14), [0.13, 0.55 + SY]], false]], lockMat, shackle);
  safeGroup.add(shackle);
  const lockGlowMat = new THREE.SpriteMaterial({
    map: sprite, color: 0xffb400, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const lockGlow = new THREE.Sprite(lockGlowMat);
  lockGlow.position.set(0, 0.45 + SY, 0);
  lockGlow.scale.set(1.3, 1.3, 1);
  safeGroup.add(lockGlow);
  /* the phone that rings first (top centre), with call waves either side */
  const phoneMat = safeMat(0xcdeeff, 0.9);
  safeLines([
    [rrect(-0.15, 1.0 + SY, 0.15, 1.52 + SY, 0.05), true],
    [[[-0.05, 1.07 + SY], [0.05, 1.07 + SY]], false],
  ], phoneMat);
  const waveMats = [0, 1, 2].map((k) => {
    const m = safeMat(0x79d0ff, 0.9);
    const r = 0.28 + k * 0.14;
    safeLines([[arcPts(0, 1.26 + SY, r, -0.55, 0.55, 8), false], [arcPts(0, 1.26 + SY, r, Math.PI - 0.55, Math.PI + 0.55, 8), false]], m);
    return m;
  });
  /* data moving both ways once the padlock is shut */
  const SAFE_DOTS = 10;
  const safeDotGeo = new THREE.BufferGeometry();
  safeDotGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SAFE_DOTS * 3), 3));
  const safeDotMat = new THREE.PointsMaterial({
    size: 0.16, map: sprite, color: 0xbfe8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  safeGroup.add(new THREE.Points(safeDotGeo, safeDotMat));
  safeGroup.userData.mats = safeMats;
  safeGroup.visible = false;
  scene.add(safeGroup);

  /* one 7-second story: ring (0-26%), lock (26-36%), connected (36-90%), reset */
  function updateSafe(t, v, fit) {
    const p = (t % 7) / 7;
    const ss = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
    const open = p < 0.26 ? 1 : p < 0.36 ? 1 - ss((p - 0.26) / 0.1) : p > 0.92 ? ss((p - 0.92) / 0.08) : 0;
    const live = p < 0.36 ? 0 : p > 0.9 ? 1 - ss((p - 0.9) / 0.1) : ss((p - 0.36) / 0.08);
    waveMats.forEach((m, k) => {
      m.opacity = m.userData.base * v * (p < 0.26 ? Math.max(0, Math.sin((p / 0.26) * Math.PI * 3 - k * 0.7)) : 0);
    });
    phoneMat.opacity = phoneMat.userData.base * v * (p < 0.3 ? 1 : 0.35);
    shackle.position.y = 0.12 * open;
    lockMat.opacity = lockMat.userData.base * v * (0.6 + 0.4 * (1 - open));
    lockGlowMat.opacity = v * (0.12 + 0.55 * Math.max(0, 1 - Math.abs(p - 0.36) / 0.07));
    linkMat.opacity = linkMat.userData.base * v * (0.25 + 0.75 * live);
    tickMat.opacity = tickMat.userData.base * v * ss((p - 0.45) / 0.06) * (p > 0.9 ? 1 - ss((p - 0.9) / 0.1) : 1);
    const dp = safeDotGeo.attributes.position.array;
    for (let i = 0; i < SAFE_DOTS; i++) {
      const dir = i % 2 ? 1 : -1;
      const u = (i / SAFE_DOTS + t * 0.35) % 1;
      dp[i * 3] = dir > 0 ? -0.9 + 1.8 * u : 0.9 - 1.8 * u;
      dp[i * 3 + 1] = 0.45 + SY + dir * 0.035;
      dp[i * 3 + 2] = 0;
    }
    safeDotGeo.attributes.position.needsUpdate = true;
    safeDotMat.opacity = v * live;
    safeDotMat.size = 0.16 * Math.max(0.5, Math.min(1, fit * 1.3));
  }

  /* ================= homepage v3 background (26 Sep 2026) =================
     1. scroll scenes are drawn in OPEN page space: the new page is mostly cards, which hide
        whatever is behind them, so each scene measures its spot from the live layout
     2. the four "What do you need?" tiles each morph the whole background on hover or focus
     3. at "Across Bournemouth, Poole & Dorset" the dots fly into the real towns on the map
     4. lively in the hero, calmer behind the reading parts further down */

  document.documentElement.classList.add("has-webgl");
  let VW = window.innerWidth, VH = window.innerHeight;
  const _v = new THREE.Vector3(), _d = new THREE.Vector3(), _w = new THREE.Vector3();
  const TAN_HALF = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  /* world point on the plane z = Z under screen pixel (sx, sy); camera must be current */
  function screenToWorld(sx, sy, Z, out) {
    _v.set((sx / VW) * 2 - 1, 1 - (sy / VH) * 2, 0.5).unproject(camera);
    _d.copy(_v).sub(camera.position).normalize();
    return out.copy(camera.position).addScaledVector(_d, (Z - camera.position.z) / _d.z);
  }
  /* world units per CSS pixel on the plane z = Z */
  const unitsPerPx = (Z) => (2 * (camera.position.z - Z) * TAN_HALF) / VH;
  const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const box = (el) => (el ? el.getBoundingClientRect() : null);

  /* ---------------- 1. anchored scroll scenes ---------------- */
  const Z_SCENE = 1.4;
  /* the empty part of a section's heading row: right of the heading, from the section's
     top padding down to the row's link, if it has one */
  function headSpace(secSel) {
    const sec = document.querySelector(secSel);
    const head = sec && sec.querySelector(".hp-head");
    if (!head || !head.firstElementChild) return null;
    const s = box(sec), h = box(head), first = box(head.firstElementChild);
    const link = head.querySelector(":scope > .hp-link");
    return { l: first.right + 40, r: h.right, t: s.top + 18, b: link ? box(link).top - 10 : h.bottom };
  }
  /* the empty space under "Before you call", beside the questions */
  function faqSpace() {
    const col = document.querySelector("#faq .hp-faq > div");
    const list = document.querySelector("#faq .faq-wrap");
    if (!col || !list) return null;
    const c = box(col), L = box(list);
    if (L.left < c.right) return null; // one-column layout: no empty space beside the questions
    return { l: c.left, r: c.right, t: c.bottom + 16, b: Math.max(L.bottom, c.bottom + 200) };
  }
  const ANCHOR = { home: () => headSpace("#help"), biz: () => headSpace("#plans"), safe: faqSpace };
  const NATURAL = { home: [3.9, 4.2], biz: [3.9, 6.0], safe: [6.0, 2.4] }; // world size at scale 1
  /* the fixed header covers the top of the window */
  let HEAD = 0;
  const measureHead = () => { const h = document.querySelector(".site-header"); HEAD = h ? h.getBoundingClientRect().bottom : 0; };
  measureHead();
  /* place a scene in its open space; returns the scale, or 0 when there is no room.
     The drawing keeps one size (from the whole space) but stays inside the part of that space
     that is actually on screen, and fades as that part gets too small for it: on a short window
     the space can run off the bottom, and centring on the whole space put the drawing half out
     of view (seen in the owner's side pane, 1107x543, 26 Sep 2026). */
  function fitTo(group, key) {
    const a = ANCHOR[key]();
    group.userData.room = 0;
    if (!a) return 0;
    const w = a.r - a.l, fullH = a.b - a.t;
    if (w < 150 || fullH < 110) return 0;
    const upp = unitsPerPx(Z_SCENE), [nw, nh] = NATURAL[key];
    const s = Math.min((w * upp) / nw, (fullH * upp) / nh, 1.1);
    const halfPx = (nh * s) / upp / 2;
    const top = Math.max(a.t, HEAD + 8), bot = Math.min(a.b, VH - 72); // clear of the floating "Text size" button
    group.userData.room = smooth((bot - top - halfPx * 2 + 60) / 60); // 1 once the whole drawing fits in view
    if (group.userData.room <= 0) return 0;
    const cy = Math.min(Math.max((a.t + a.b) / 2, top + halfPx), bot - halfPx);
    screenToWorld((a.l + a.r) / 2, cy, Z_SCENE, group.position);
    return s;
  }
  const sceneGroups = [
    { group: homeGroup, key: "home" },
    { group: bizGroup, key: "biz" },
    { group: safeGroup, key: "safe" },
  ];

  /* ---------------- 2. "What do you need?" tile morphs ---------------- */
  const Z_INT = 1.0;
  const intent = { fix: 0, care: 0, buy: 0, biz: 0 };
  const TINT = {
    fix: new THREE.Color(0x79d0ff), care: new THREE.Color(0x7af08e),
    buy: new THREE.Color(0xffd978), biz: new THREE.Color(0xb3bcff),
  };
  let hoverKey = null, hoverEl = null, leaveTimer = 0, tileBox = null;
  document.querySelectorAll(".hp-intent").forEach((el) => {
    const key = ["fix", "care", "buy", "biz"].find((k) => el.classList.contains("hp-c-" + k));
    if (!key) return;
    const on = () => { clearTimeout(leaveTimer); hoverKey = key; hoverEl = el; };
    const off = () => {
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => { if (hoverEl === el) hoverKey = null; }, 160);
    };
    el.addEventListener("pointerenter", on);
    el.addEventListener("focus", on);
    el.addEventListener("pointerleave", off);
    el.addEventListener("blur", off);
  });
  const baseColors = colors.slice();
  let colorsDirty = false;

  /* "Buy a computer": the dots draw a laptop around the whole screen (fractions of the viewport) */
  const LAPTOP = [
    [0.05, 0.15, 0.95, 0.15], [0.95, 0.15, 0.95, 0.855], [0.95, 0.855, 0.05, 0.855], [0.05, 0.855, 0.05, 0.15],
    [0.03, 0.875, 0.97, 0.875], [0.97, 0.875, 1.0, 0.945], [1.0, 0.945, 0.0, 0.945], [0.0, 0.945, 0.03, 0.875],
    [0.44, 0.91, 0.56, 0.91],
  ];
  const buySeg = new Uint8Array(COUNT), buyT = new Float32Array(COUNT), jit = new Float32Array(COUNT * 2);
  for (let i = 0; i < COUNT * 2; i++) jit[i] = Math.random() - 0.5;
  function planLaptop() {
    const L = LAPTOP.map(([a, b, c, d]) => Math.hypot((c - a) * VW, (d - b) * VH));
    const total = L.reduce((p, q) => p + q, 0);
    let seg = 0, acc = 0;
    for (let i = 0; i < COUNT; i++) {
      const s = ((i + 0.5) / COUNT) * total;
      while (seg < L.length - 1 && s > acc + L[seg]) { acc += L[seg]; seg++; }
      buySeg[i] = seg;
      buyT[i] = (s - acc) / L[seg];
    }
  }
  planLaptop();
  const segW = new Float32Array(LAPTOP.length * 6);

  /* "IT for my business": an office network around the edges, with data moving along it */
  const BIZ_NODES = [[0.06, 0.17], [0.3, 0.16], [0.5, 0.15], [0.7, 0.16], [0.94, 0.17],
    [0.03, 0.52], [0.487, 0.52], [0.97, 0.52],
    [0.06, 0.9], [0.3, 0.91], [0.5, 0.92], [0.7, 0.91], [0.94, 0.9]];
  const BIZ_EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 8], [4, 7], [7, 12],
    [8, 9], [9, 10], [10, 11], [11, 12], [2, 6], [6, 10]];
  const nodeW = new Float32Array(BIZ_NODES.length * 3);
  const bizLineGeo = new THREE.BufferGeometry();
  bizLineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(BIZ_EDGES.length * 6), 3));
  const bizLineMat = new THREE.LineBasicMaterial({
    color: 0x9aa6ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const bizLines = new THREE.LineSegments(bizLineGeo, bizLineMat);
  bizLines.visible = false;
  scene.add(bizLines);
  const PACKETS = 22;
  const packetGeo = new THREE.BufferGeometry();
  packetGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PACKETS * 3), 3));
  const packetMat = new THREE.PointsMaterial({
    size: 0.2, map: sprite, color: 0xdfe3ff, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const packets = new THREE.Points(packetGeo, packetMat);
  packets.visible = false;
  scene.add(packets);
  /* each dot gets its own spot in a soft round node (fixed per dot, so nodes glow rather than spin) */
  const bizA = new Float32Array(COUNT), bizR = new Float32Array(COUNT), bizS = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    bizA[i] = Math.random() * 6.283;
    bizR[i] = 2 + Math.sqrt(Math.random()) * 11;
    bizS[i] = (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.4);
  }
  const packetEdge = Array.from({ length: PACKETS }, (_, i) => i % BIZ_EDGES.length);
  const packetU = Array.from({ length: PACKETS }, () => Math.random());

  /* "Fix my computer": a scan line sweeps down the screen; dots light up as it passes, then go green */
  const bandTex = (() => {
    const c = document.createElement("canvas");
    c.width = 4; c.height = 128;
    const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, "rgba(121,208,255,0)");
    gr.addColorStop(0.42, "rgba(121,208,255,0.3)");
    gr.addColorStop(0.5, "rgba(235,250,255,1)");
    gr.addColorStop(0.58, "rgba(121,208,255,0.3)");
    gr.addColorStop(1, "rgba(121,208,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 128);
    return new THREE.CanvasTexture(c);
  })();
  const band = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: bandTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  band.visible = false;
  scene.add(band);
  let bandPx = -1e4;

  /* "Look after it for me": Wi-Fi rings ripple out from that tile across the screen */
  const careRings = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.993, 1, 160), new THREE.MeshBasicMaterial({
      color: 0x7af08e, transparent: true, opacity: 0, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    m.visible = false;
    scene.add(m);
    careRings.push(m);
  }
  const ringP = [0, 0, 0, 0];
  let ringMaxPx = 1;

  /* ---------------- 3. the towns on the areas map ---------------- */
  const Z_MAP = 0.5;
  const mapSvg = document.querySelector(".hp-map svg");
  let mapPts = null, mapTowns = [], mapInfo = null;
  if (mapSvg && mapSvg.viewBox && mapSvg.viewBox.baseVal) {
    const vb = mapSvg.viewBox.baseVal;
    mapTowns = [...mapSvg.querySelectorAll(".town circle")]
      .filter((c) => !c.classList.contains("pulse"))
      .map((c) => ({ x: +c.getAttribute("cx"), y: +c.getAttribute("cy"), hub: c.classList.contains("core") }));
    if (mapTowns.length > 1) {
      const PER_TOWN = 24, PER_HUB = 44, PER_SPOKE = 10;
      const info = [];
      mapTowns.forEach((tw, ti) => {
        const n = tw.hub ? PER_HUB : PER_TOWN;
        for (let k = 0; k < n; k++) {
          info.push({ kind: 0, town: ti, a: Math.random() * 6.283, r: 2 + Math.pow(Math.random(), 0.7) * (tw.hub ? 20 : 13), sp: 0.3 + Math.random() * 0.5 });
        }
      });
      const hubIdx = Math.max(0, mapTowns.findIndex((tw) => tw.hub));
      mapTowns.forEach((tw, ti) => {
        if (ti === hubIdx) return;
        for (let k = 0; k < PER_SPOKE; k++) info.push({ kind: 1, town: ti, u: k / PER_SPOKE, sp: 0.12 + Math.random() * 0.05 });
      });
      const N = info.length;
      const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), start = new Float32Array(N * 3);
      const cHub = new THREE.Color(0x39d353), cTown = new THREE.Color(0x6cc4f5), cFlow = new THREE.Color(0xcdeeff);
      info.forEach((p, i) => {
        const c = p.kind === 1 ? cFlow : mapTowns[p.town].hub ? cHub : cTown;
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        start[i * 3] = (Math.random() - 0.5) * 20;
        start[i * 3 + 1] = (Math.random() - 0.5) * 13;
        start[i * 3 + 2] = -5 + Math.random() * 7;
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      mapPts = new THREE.Points(g, new THREE.PointsMaterial({
        size: 0.09, map: sprite, vertexColors: true, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      mapPts.visible = false;
      scene.add(mapPts);
      mapInfo = { vb, info, start, hubIdx, townW: new Float32Array(mapTowns.length * 3) };
    }
  }

  /* ---------------- 4. scroll motion, calmer than before ---------------- */
  if (hasGsap()) {
    gsap.to(camera.position, {
      z: 7.2,
      ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1 },
    });
    gsap.to(fieldGroup.rotation, {
      y: Math.PI * 0.3,
      x: Math.PI * 0.05,
      ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1 },
    });
  }

  let mouseX = 0, mouseY = 0;
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 0.7;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 0.7;
  }, { passive: true });

  /* ?bgdebug in the address exposes the scene state for testing */
  if (/bgdebug/.test(location.search)) {
    window.__hpbg = {
      fx, intent,
      get groups() {
        return sceneGroups.map(({ group, key }) => ({ key, vis: group.visible, v: +(group.userData.v || 0).toFixed(2), fit: +(group.userData.fit || 0).toFixed(3),
          anchor: ANCHOR[key](), pos: group.position.toArray().map((n) => +n.toFixed(2)), scale: +group.scale.x.toFixed(3) }));
      },
      get map() { return mapPts ? { vis: mapPts.visible, v: fx.map } : null; },
      get cam() { return camera.position.toArray().map((n) => +n.toFixed(2)); },
    };
  }

  /* ---------------- render loop ---------------- */
  const clock = new THREE.Clock();
  let zDrift = 0;
  let rafId = null;
  let _bgPaused = false;
  const M = new THREE.Matrix4(), INV = new THREE.Matrix4();

  function render() {
    rafId = requestAnimationFrame(render);

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    /* camera first, so everything measured this frame uses where it actually is */
    camera.position.x += (mouseX - camera.position.x) * 0.04;
    camera.position.y += (-mouseY - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    /* lively in the hero, calmer once you are reading further down */
    const heroBoost = Math.max(0, 1 - window.scrollY / Math.max(VH, 1));
    const calm = 1 - heroBoost;
    zDrift += dt * (0.18 + heroBoost * 1.15);

    /* tile morphs ease in and out */
    const ease = Math.min(1, dt * 3.2);
    for (const k in intent) intent[k] += ((hoverKey === k ? 1 : 0) - intent[k]) * ease;
    const iMax = Math.max(intent.fix, intent.care, intent.buy, intent.biz);
    if (hoverEl && (hoverKey || iMax > 0.003)) { // measured only while a morph is showing
      const r = hoverEl.getBoundingClientRect();
      tileBox = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, h: r.height };
      if (r.bottom < 0) hoverKey = null; // scrolled away with the pointer still over it
    }
    const doInt = iMax > 0.003 && tileBox;
    const eBuy = smooth(intent.buy), eBiz = smooth(intent.biz);

    field.rotation.y += dt * (0.05 - 0.03 * calm);
    web.rotation.y -= dt * 0.016;
    fieldGroup.updateMatrixWorld(true);

    const split = fx.split;
    const conv = fx.converge;
    const swirl = t * 0.22;
    const halfZ = SPREAD.z / 2;

    let e = null, tintR = 0, tintG = 0, tintB = 0, tintK = 0, upp = 0;
    if (doInt) {
      M.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(field.matrixWorld);
      e = M.elements;
      INV.copy(field.matrixWorld).invert();
      let sum = 0;
      for (const k in intent) {
        tintR += TINT[k].r * intent[k]; tintG += TINT[k].g * intent[k]; tintB += TINT[k].b * intent[k]; sum += intent[k];
      }
      tintR /= sum; tintG /= sum; tintB /= sum;
      tintK = 0.5 * iMax;
      upp = unitsPerPx(Z_INT);
      if (eBuy > 0.001) {
        LAPTOP.forEach(([a, b, c, d], s) => {
          screenToWorld(a * VW, b * VH, Z_INT, _w); segW[s * 6] = _w.x; segW[s * 6 + 1] = _w.y; segW[s * 6 + 2] = _w.z;
          screenToWorld(c * VW, d * VH, Z_INT, _w); segW[s * 6 + 3] = _w.x; segW[s * 6 + 4] = _w.y; segW[s * 6 + 5] = _w.z;
        });
      }
      if (eBiz > 0.001) {
        BIZ_NODES.forEach(([nx, ny], n) => {
          screenToWorld(nx * VW, ny * VH, Z_INT, _w);
          nodeW[n * 3] = _w.x; nodeW[n * 3 + 1] = _w.y; nodeW[n * 3 + 2] = _w.z;
        });
      }
      bandPx = (-0.08 + 1.16 * ((t * 0.5) % 1)) * VH;
      ringMaxPx = Math.max(
        Math.hypot(tileBox.cx, tileBox.cy), Math.hypot(VW - tileBox.cx, tileBox.cy),
        Math.hypot(tileBox.cx, VH - tileBox.cy), Math.hypot(VW - tileBox.cx, VH - tileBox.cy));
      for (let k = 0; k < 4; k++) ringP[k] = (t * 0.42 + k / 4) % 1;
    }
    const ie = INV.elements;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      let x = base[i3];
      let y = base[i3 + 1];
      let z = base[i3 + 2] + zDrift;
      z = ((z + halfZ) % SPREAD.z + SPREAD.z) % SPREAD.z - halfZ; // wrap depth

      if (split > 0.001) {
        x += Math.sign(x || 1) * split * 5.2;
        y *= 1 - split * 0.25;
      }
      if (conv > 0.001) {
        const k = conv * 0.88;
        const a = i * 2.399963 + swirl;
        const r = 2.1 + (i % 50) / 50 * 1.6;
        x += (Math.cos(a) * r - x) * k;
        y += (Math.sin(a) * r * 0.62 - y) * k;
        z += (ringTarget[i3 + 2] - z) * k;
      }

      if (doInt) {
        /* formations: a world-space target, brought into the field's own (rotating) space */
        let wx = 0, wy = 0, wz = 0, k = 0;
        if (eBuy > 0.001) {
          const s = buySeg[i] * 6, u = buyT[i];
          wx = segW[s] + (segW[s + 3] - segW[s]) * u + jit[i * 2] * 0.05;
          wy = segW[s + 1] + (segW[s + 4] - segW[s + 1]) * u + jit[i * 2 + 1] * 0.05;
          wz = segW[s + 2] + (segW[s + 5] - segW[s + 2]) * u;
          k = eBuy;
        } else if (eBiz > 0.001) {
          const n = (i % BIZ_NODES.length) * 3;
          const a = bizA[i] + t * bizS[i];
          const rr = bizR[i] * upp;
          wx = nodeW[n] + Math.cos(a) * rr;
          wy = nodeW[n + 1] + Math.sin(a) * rr;
          wz = nodeW[n + 2];
          k = eBiz;
        }
        if (k > 0) {
          const lx = ie[0] * wx + ie[4] * wy + ie[8] * wz + ie[12];
          const ly = ie[1] * wx + ie[5] * wy + ie[9] * wz + ie[13];
          const lz = ie[2] * wx + ie[6] * wy + ie[10] * wz + ie[14];
          x += (lx - x) * k; y += (ly - y) * k; z += (lz - z) * k;
        }

        /* colours: tint toward the tile, then the scan line / ripple highlights */
        let r = baseColors[i3], g = baseColors[i3 + 1], b = baseColors[i3 + 2];
        r += (tintR - r) * tintK; g += (tintG - g) * tintK; b += (tintB - b) * tintK;
        if (intent.fix > 0.003 || intent.care > 0.003) {
          const w = e[3] * x + e[7] * y + e[11] * z + e[15];
          const px = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w * 0.5 + 0.5) * VW;
          const py = (0.5 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / w * 0.5) * VH;
          if (intent.fix > 0.003) {
            const dd = py - bandPx;
            const after = dd < 0 ? Math.exp(dd / 240) * 0.85 * intent.fix : 0;
            const hit = Math.max(0, 1 - Math.abs(dd) / 36) * intent.fix;
            r += (0.22 - r) * after; g += (1 - g) * after; b += (0.4 - b) * after;
            r += (1 - r) * hit; g += (1 - g) * hit; b += (1 - b) * hit;
          }
          if (intent.care > 0.003) {
            const dd = Math.hypot(px - tileBox.cx, py - tileBox.cy);
            let hit = 0;
            for (let q = 0; q < 4; q++) hit += Math.max(0, 1 - Math.abs(dd - ringP[q] * ringMaxPx) / 42) * (1 - ringP[q]);
            hit = Math.min(1, hit) * intent.care;
            r += (0.6 - r) * hit; g += (1 - g) * hit; b += (0.65 - b) * hit;
          }
        }
        colors[i3] = r; colors[i3 + 1] = g; colors[i3 + 2] = b;
      }

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
    }
    fieldGeo.attributes.position.needsUpdate = true;
    if (doInt) {
      fieldGeo.attributes.color.needsUpdate = true;
      colorsDirty = true;
    } else if (colorsDirty) {
      colors.set(baseColors);
      fieldGeo.attributes.color.needsUpdate = true;
      colorsDirty = false;
    }

    webMat.opacity = 0.14 * (1 - split * 0.8) * (1 - conv * 0.7) * (1 - 0.5 * calm) * (1 - 0.7 * Math.max(eBuy, eBiz));

    /* converged particles sit closer to the camera — slim them down so the
       CTA halo glows without smothering the text */
    /* (the CTA text now sits in its own card, so the ring can stay fuller; and the ring is
       the page's closing moment, so "calm" does not dim it) */
    fieldMat.size = PARTICLE_SIZE * (1 - conv * 0.15);
    fieldMat.opacity = Math.min(1, 0.85 * (1 - 0.4 * calm * (1 - conv)) * (1 - 0.5 * fx.map) * (1 + 0.2 * iMax));

    /* scroll scenes: each sits in its own open space (or, for the home network, under the
       "Look after it" tile while it is pointed at) */
    sceneGroups.forEach(({ group, key }) => {
      let v = fx[key], s = 0;
      if (key === "home" && intent.care > v && tileBox) {
        v = intent.care * 0.9;
        screenToWorld(tileBox.cx, tileBox.cy, Z_SCENE, group.position);
        s = Math.min(1, (tileBox.h * 2.2 * unitsPerPx(Z_SCENE)) / NATURAL.home[1]);
      } else if (v > 0.02) {
        s = fitTo(group, key);
        v = s ? v * group.userData.room : 0;
      }
      group.userData.v = v;
      group.visible = v > 0.02;
      if (!group.visible) return;
      group.userData.fit = s;
      group.userData.mats.forEach((m) => { m.opacity = m.userData.base * v; });
      if (group.userData.nodeMat) group.userData.nodeMat.size = 0.34 * Math.max(0.5, Math.min(1, s * 1.2));
      group.scale.setScalar(s * (0.82 + 0.18 * v));
      if (group.userData.hubMesh) {
        group.userData.hubMesh.rotation.y += dt * 0.8;
        group.userData.hubMesh.rotation.x += dt * 0.35;
      }
      group.rotation.y = group === safeGroup ? 0 : Math.sin(t * 0.18) * 0.12; // the flat drawing stays square-on
    });

    /* wifi rings ripple outward from the home hub */
    homeRings.forEach((ring) => {
      const p = (t * 0.4 + ring.userData.phase) % 1;
      ring.scale.setScalar(0.25 + p * 2.1);
      ring.material.opacity = (1 - p) * 0.42 * (homeGroup.userData.v || 0);
    });

    /* safe remote support: ring, lock, connect */
    if (safeGroup.visible) updateSafe(t, safeGroup.userData.v, safeGroup.userData.fit || 1);

    /* tile morph extras: scan line, Wi-Fi ripples, office links and data packets */
    band.visible = intent.fix > 0.003 && !!tileBox;
    if (band.visible) {
      const u = unitsPerPx(Z_INT);
      screenToWorld(VW / 2, bandPx, Z_INT, band.position);
      band.scale.set(VW * 1.15 * u, 110 * u, 1);
      band.material.opacity = 0.72 * intent.fix;
    }
    careRings.forEach((m, q) => {
      m.visible = intent.care > 0.003 && !!tileBox;
      if (!m.visible) return;
      screenToWorld(tileBox.cx, tileBox.cy, Z_INT, m.position);
      m.scale.setScalar(Math.max(0.01, ringP[q] * ringMaxPx * unitsPerPx(Z_INT)));
      m.material.opacity = Math.pow(1 - ringP[q], 1.5) * 0.5 * intent.care;
    });
    bizLines.visible = packets.visible = eBiz > 0.003 && !!tileBox;
    if (bizLines.visible) {
      const lp = bizLineGeo.attributes.position.array;
      BIZ_EDGES.forEach(([a, b], q) => {
        lp[q * 6] = nodeW[a * 3]; lp[q * 6 + 1] = nodeW[a * 3 + 1]; lp[q * 6 + 2] = nodeW[a * 3 + 2];
        lp[q * 6 + 3] = nodeW[b * 3]; lp[q * 6 + 4] = nodeW[b * 3 + 1]; lp[q * 6 + 5] = nodeW[b * 3 + 2];
      });
      bizLineGeo.attributes.position.needsUpdate = true;
      bizLineMat.opacity = 0.4 * eBiz;
      const pp = packetGeo.attributes.position.array;
      for (let q = 0; q < PACKETS; q++) {
        const [a, b] = BIZ_EDGES[packetEdge[q]];
        const u = (packetU[q] + t * 0.45) % 1;
        pp[q * 3] = nodeW[a * 3] + (nodeW[b * 3] - nodeW[a * 3]) * u;
        pp[q * 3 + 1] = nodeW[a * 3 + 1] + (nodeW[b * 3 + 1] - nodeW[a * 3 + 1]) * u;
        pp[q * 3 + 2] = nodeW[a * 3 + 2];
      }
      packetGeo.attributes.position.needsUpdate = true;
      packetMat.opacity = 0.9 * eBiz;
    }

    /* the towns: dots fly in from the field and settle exactly behind the map's own dots,
       with a steady flow out from Bournemouth to every town */
    if (mapPts) {
      const v = fx.map;
      mapPts.visible = v > 0.01;
      if (mapPts.visible) {
        const { vb, info, start, hubIdx, townW } = mapInfo;
        const r = mapSvg.getBoundingClientRect();
        const kx = r.width / vb.width, ky = r.height / vb.height;
        mapTowns.forEach((tw, ti) => {
          screenToWorld(r.left + (tw.x - vb.x) * kx, r.top + (tw.y - vb.y) * ky, Z_MAP, _w);
          townW[ti * 3] = _w.x; townW[ti * 3 + 1] = _w.y; townW[ti * 3 + 2] = _w.z;
        });
        const u2 = unitsPerPx(Z_MAP) * kx;
        const k = smooth(v * 1.35);
        const mp = mapPts.geometry.attributes.position.array;
        info.forEach((p, i) => {
          let tx, ty, tz;
          if (p.kind === 0) {
            const a = p.a + t * p.sp;
            tx = townW[p.town * 3] + Math.cos(a) * p.r * u2;
            ty = townW[p.town * 3 + 1] + Math.sin(a) * p.r * u2;
            tz = townW[p.town * 3 + 2];
          } else {
            const u = (p.u + t * p.sp) % 1;
            tx = townW[hubIdx * 3] + (townW[p.town * 3] - townW[hubIdx * 3]) * u;
            ty = townW[hubIdx * 3 + 1] + (townW[p.town * 3 + 1] - townW[hubIdx * 3 + 1]) * u;
            tz = townW[p.town * 3 + 2];
          }
          mp[i * 3] = start[i * 3] + (tx - start[i * 3]) * k;
          mp[i * 3 + 1] = start[i * 3 + 1] + (ty - start[i * 3 + 1]) * k;
          mp[i * 3 + 2] = start[i * 3 + 2] + (tz - start[i * 3 + 2]) * k;
        });
        mapPts.geometry.attributes.position.needsUpdate = true;
        mapPts.material.opacity = Math.min(1, v * 1.3);
      }
    }

    renderer.render(scene, camera);
  }
  render();

  /* pause when the tab is hidden */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId && !_bgPaused) {
      clock.getDelta();
      render();
    }
  });
  // Background animates the FULL length of the page on desktop (it's desktop-only and
  // deferred to idle). It only pauses when the browser tab is hidden (handled above),
  // so there's no frozen frame and no "stops half-way down" effect.

  window.addEventListener("resize", () => {
    const w = window.innerWidth, h = window.innerHeight; // read layout once
    VW = w; VH = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 2));
    planLaptop();
    measureHead();
  });
}

/* ==========================================================================
   LIGHT BACKGROUND (phones, tablets, and any browser without the WebGL layer)
   Three slow colour glows and a few drifting dots, drawn at quarter resolution on a
   2D canvas; CSS scales it up, which also softens it. No download, ~24 fps, paused
   while the tab is hidden or the canvas is switched off by the accessibility menu.
   ========================================================================== */

function initLiteBackground(canvas) {
  if (!canvas) return;
  let ctx = null;
  try { ctx = canvas.getContext("2d"); } catch (e) { ctx = null; }
  if (!ctx) { canvas.remove(); return; }
  canvas.style.willChange = "transform"; // its own layer: redrawing it never repaints the page
  const SCALE = 0.25;
  let w = 1, h = 1;
  const glows = [
    { c: "29,151,227", a: 0.3, r: 0.8, x: 0.12, y: 0.16, sx: 0.12, sy: 0.07, p: 0 },
    { c: "0,206,27", a: 0.13, r: 0.65, x: 0.9, y: 0.5, sx: 0.08, sy: 0.12, p: 2.1 },
    { c: "91,108,240", a: 0.2, r: 0.85, x: 0.35, y: 0.98, sx: 0.14, sy: 0.05, p: 4.2 },
  ];
  /* each glow is painted ONCE into its own small canvas; frames just move it */
  const paintGlows = () => {
    glows.forEach((g) => {
      const R = Math.max(2, Math.round(g.r * Math.max(w, h)));
      const c = g.img || document.createElement("canvas");
      c.width = c.height = R * 2;
      const x = c.getContext("2d");
      const grad = x.createRadialGradient(R, R, 0, R, R, R);
      grad.addColorStop(0, "rgba(" + g.c + "," + g.a + ")");
      grad.addColorStop(1, "rgba(" + g.c + ",0)");
      x.fillStyle = grad;
      x.fillRect(0, 0, R * 2, R * 2);
      g.img = c; g.R = R;
    });
  };
  const size = () => {
    w = Math.max(1, Math.round(window.innerWidth * SCALE));
    h = Math.max(1, Math.round(window.innerHeight * SCALE));
    canvas.width = w;
    canvas.height = h;
    paintGlows();
  };
  size();
  window.addEventListener("resize", size, { passive: true });
  const dots = Array.from({ length: 24 }, (_, i) => ({
    x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 0.9,
    s: 0.004 + Math.random() * 0.008, tw: Math.random() * 6.283,
    c: i % 5 === 0 ? "57,211,83" : "108,196,245",
  }));
  /* ~12 fps on a timer rather than every animation frame: the drift is slow, and the
     browser then only repaints when the canvas actually changes */
  let timer = 0, n = 0;
  function tick() {
    timer = setTimeout(tick, 83);
    if (++n % 45 === 0 && getComputedStyle(canvas).display === "none") return; // turned off (a11y menu)
    const t = performance.now() / 1000;
    const drift = Math.min(1, window.scrollY / (window.innerHeight * 4)) * 0.18;
    ctx.clearRect(0, 0, w, h);
    for (const g of glows) {
      const cx = (g.x + Math.sin(t * 0.11 + g.p) * g.sx) * w;
      const cy = (g.y + Math.cos(t * 0.09 + g.p) * g.sy - drift) * h;
      ctx.drawImage(g.img, cx - g.R, cy - g.R);
    }
    for (const d of dots) {
      d.y -= d.s * 0.083;
      if (d.y < -0.03) { d.y = 1.03; d.x = Math.random(); }
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t * 1.2 + d.tw);
      ctx.fillStyle = "rgb(" + d.c + ")";
      ctx.beginPath();
      ctx.arc(d.x * w, d.y * h, d.r, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  tick();
  document.addEventListener("visibilitychange", () => {
    clearTimeout(timer);
    if (!document.hidden) tick();
  });
}

/* ==========================================================================
   BOOT
   ========================================================================== */

/* The motion gate in <head> only injects GSAP/ScrollTrigger on desktop and
   dispatches "motion-ready" once both are in. On phones (html.no-motion) the
   libs never load: reveals render visible, counters set their final values,
   and the mobile menu uses the CSS-transition fallback. If the libs somehow
   beat this module (hot cache), boot immediately. */
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

// Desktop only: the Three.js background is ~1.2MB, so skip it on mobile/tablet,
// reduced-motion and Data Saver, and defer the load to idle so it never competes
// with first paint or interactivity. Phones/tablets just get the CSS background.
const WANT_BG = !REDUCED && !LOW_POWER
  && window.innerWidth >= 920
  && window.matchMedia("(hover: hover)").matches;
if (WANT_BG) {
  const startBg = () => initBackground();
  if ("requestIdleCallback" in window) requestIdleCallback(startBg, { timeout: 3000 });
  else window.addEventListener("load", () => setTimeout(startBg, 250));
} else {
  // Phones, tablets and the rest get the light version (see initLiteBackground): no
  // download, started once the page is idle so it never competes with the first paint.
  const canvas = document.querySelector("#tech-background");
  if (canvas && !REDUCED && !LOW_POWER) {
    const startLite = () => initLiteBackground(canvas);
    if ("requestIdleCallback" in window) requestIdleCallback(startLite, { timeout: 2500 });
    else window.addEventListener("load", () => setTimeout(startLite, 250));
  } else if (canvas) canvas.remove();
}
