/* ==========================================================================
   365 TECHIES — control-centre background (Three.js) + UI choreography (GSAP)
   Scroll scenes: hero tunnel → home network → business grid → plan split
                  → security shield → CTA convergence
   ========================================================================== */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Only skip the WebGL background for Data Saver users (reduced-motion handled at boot);
// it runs everywhere else, lighter on mobile.
const LOW_POWER = (() => {
  try { return !!(navigator.connection && navigator.connection.saveData); } catch (e) { return false; }
})();
const HAS_GSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
const isMobile = () => window.innerWidth < 920;

if (HAS_GSAP) gsap.registerPlugin(ScrollTrigger);

/* Scroll-driven scene intensities, tweened by ScrollTrigger, read by the
   render loop every frame. */
const fx = { home: 0, biz: 0, split: 0, shield: 0, converge: 0 };

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

if (HAS_GSAP && !REDUCED) {
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
mobileLinks.forEach((a) => a.addEventListener("click", () => setMenu(false)));
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

    if (!HAS_GSAP || REDUCED) { el.textContent = fmt(target); return; }

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
  /* ---- page load: header + hero ---- */
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
    .from(".hero__chips li", { y: 16, opacity: 0, duration: 0.5, stagger: 0.08 }, 1.5)
    .from(".hero__console", { x: 70, opacity: 0, rotate: 4, duration: 0.9 }, 1.1)
    .from(".scroll-hint", { opacity: 0, duration: 0.8 }, 1.9);

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
  const scene = (sel, key) => {
    const el = document.querySelector(sel);
    if (!el) return;
    gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 25%", scrub: 0.8 },
    })
      .to(fx, { [key]: 1, duration: 0.32, ease: "none" })
      .to(fx, { [key]: 0, duration: 0.32, ease: "none" }, 0.68);
  };
  scene("#home-support", "home");
  scene("#business-support", "biz");
  scene("#plans", "split");
  scene("#security", "shield");

  /* CTA convergence ramps up and stays */
  gsap.to(fx, {
    converge: 1, ease: "none",
    scrollTrigger: { trigger: "#cta", start: "top 95%", end: "center 55%", scrub: 0.8 },
  });
}

/* ==========================================================================
   THREE.JS BACKGROUND
   ========================================================================== */

async function initBackground() {
  let THREE;
  try {
    THREE = await import("three");
  } catch {
    return; // CDN unavailable — site works fine without the canvas
  }

  const canvas = document.querySelector("#tech-background");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    canvas.remove();
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

  /* SECURITY shield — rings + icosahedron core + aura */
  const shieldGroup = new THREE.Group();
  const shieldMats = [];
  const addShieldMat = (mat, baseOpacity) => { mat.userData.base = baseOpacity; shieldMats.push(mat); return mat; };

  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(1.75, 0.022, 8, 72),
    addShieldMat(new THREE.MeshBasicMaterial({
      color: 0x1d97e3, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }), 0.85),
  );
  const ringB = new THREE.Mesh(
    new THREE.TorusGeometry(1.45, 0.016, 8, 72),
    addShieldMat(new THREE.MeshBasicMaterial({
      color: 0x00ce1b, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }), 0.6),
  );
  ringB.rotation.x = Math.PI / 2.4;
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.0, 1),
    addShieldMat(new THREE.MeshBasicMaterial({
      color: 0x00ce1b, wireframe: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }), 0.5),
  );
  const aura = new THREE.Sprite(
    addShieldMat(new THREE.SpriteMaterial({
      map: sprite, color: 0x00b536, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }), 0.3),
  );
  aura.scale.set(6, 6, 1);
  shieldGroup.add(ringA, ringB, core, aura);
  shieldGroup.userData.mats = shieldMats;
  shieldGroup.visible = false;
  scene.add(shieldGroup);

  /* responsive constellation placement */
  function placeGroups() {
    const m = isMobile();
    homeGroup.position.set(m ? 0 : 4.7, m ? 0.6 : 0.1, 1.4);
    homeGroup.scale.setScalar(m ? 0.62 : 1);
    bizGroup.position.set(m ? 0 : -4.7, m ? 0.6 : 0.1, 1.4);
    bizGroup.scale.setScalar(m ? 0.62 : 1);
    shieldGroup.position.set(0, 0.3, 1.6);
  }
  placeGroups();

  /* ---------------- scroll + mouse camera motion ---------------- */
  if (HAS_GSAP) {
    gsap.to(camera.position, {
      z: 5,
      ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1 },
    });
    gsap.to(fieldGroup.rotation, {
      y: Math.PI * 0.85,
      x: Math.PI * 0.12,
      ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1 },
    });
  }

  let mouseX = 0, mouseY = 0;
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 0.7;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 0.7;
  }, { passive: true });

  /* ---------------- render loop ---------------- */
  const clock = new THREE.Clock();
  let zDrift = 0;
  let rafId = null;
  let _bgPaused = false;

  const sceneGroups = [
    { group: homeGroup, key: "home" },
    { group: bizGroup, key: "biz" },
    { group: shieldGroup, key: "shield" },
  ];

  function render() {
    rafId = requestAnimationFrame(render);

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    /* tunnel drift — strongest in the hero, eases off as you scroll */
    const heroBoost = Math.max(0, 1 - window.scrollY / Math.max(window.innerHeight, 1));
    zDrift += dt * (0.22 + heroBoost * 1.1);

    const split = fx.split;
    const conv = fx.converge;
    const swirl = t * 0.22;
    const halfZ = SPREAD.z / 2;

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

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
    }
    fieldGeo.attributes.position.needsUpdate = true;

    field.rotation.y += dt * 0.05;
    web.rotation.y -= dt * 0.016;
    webMat.opacity = 0.14 * (1 - split * 0.8) * (1 - conv * 0.7);

    /* converged particles sit closer to the camera — slim them down so the
       CTA halo glows without smothering the text */
    fieldMat.size = PARTICLE_SIZE * (1 - conv * 0.45);
    fieldMat.opacity = 0.85 * (1 - conv * 0.3);

    /* constellations fade/scale with their scroll scene */
    sceneGroups.forEach(({ group, key }) => {
      const v = fx[key];
      group.visible = v > 0.02;
      if (!group.visible) return;
      group.userData.mats.forEach((m) => { m.opacity = m.userData.base * v; });
      const s = (0.78 + 0.22 * v) * (isMobile() ? 0.62 : 1);
      if (group !== shieldGroup) group.scale.setScalar(s);
      if (group.userData.hubMesh) {
        group.userData.hubMesh.rotation.y += dt * 0.8;
        group.userData.hubMesh.rotation.x += dt * 0.35;
      }
      group.rotation.y = Math.sin(t * 0.18) * 0.12;
    });

    /* wifi rings ripple outward from the home hub */
    homeRings.forEach((ring) => {
      const p = (t * 0.4 + ring.userData.phase) % 1;
      ring.scale.setScalar(0.25 + p * 2.1);
      ring.material.opacity = (1 - p) * 0.42 * fx.home;
    });

    /* shield breathes and slowly rotates */
    if (shieldGroup.visible) {
      const pulse = 1 + Math.sin(t * 2.1) * 0.035;
      shieldGroup.scale.setScalar((0.7 + 0.3 * fx.shield) * pulse);
      ringA.rotation.z += dt * 0.25;
      ringB.rotation.z -= dt * 0.32;
      core.rotation.y += dt * 0.4;
      core.rotation.x += dt * 0.18;
    }

    /* mouse parallax */
    camera.position.x += (mouseX - camera.position.x) * 0.04;
    camera.position.y += (-mouseY - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

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
    placeGroups();
  });
}

/* ==========================================================================
   BOOT
   ========================================================================== */

initCounters();

if (HAS_GSAP && !REDUCED) {
  initUI();
}

// Desktop only: the Three.js background is ~1.2MB, so skip it on mobile/tablet,
// reduced-motion and Data Saver, and defer the load to idle so it never competes
// with first paint or interactivity. Phones/tablets just get the CSS background.
const WANT_BG = !REDUCED && !LOW_POWER
  && window.innerWidth >= 920
  && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (WANT_BG) {
  const startBg = () => initBackground();
  if ("requestIdleCallback" in window) requestIdleCallback(startBg, { timeout: 3000 });
  else window.addEventListener("load", () => setTimeout(startBg, 250));
} else {
  const canvas = document.querySelector("#tech-background");
  if (canvas) canvas.remove();
}
