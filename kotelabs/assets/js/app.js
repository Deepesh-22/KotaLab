/**
 * KotaLabs — app.js
 * Progressive enhancement only. With JS disabled the page is still readable
 * (see the <noscript> block in the HTML) — nothing critical depends on this file.
 *
 * Modules, in order:
 *   1. config
 *   2. preloader
 *   3. header (stuck state + scroll progress)
 *   4. full-screen menu
 *   5. line-mask reveals  (hero on load, sections on scroll)
 *   6. manifesto (word-by-word illumination while pinned)
 *   7. process rail
 *   8. counters
 *   9. marquee
 *  10. accordions (pricing inclusions)
 *  11. magnetic buttons
 *  12. contact form → WhatsApp
 *  13. misc (year stamps)
 *  14. lazy Three.js hero
 */

(function () {
  "use strict";

  // tells the inline failsafe in the HTML that the UI is alive
  window.__KL_BOOTED = true;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ------------------------------------------------------------------ */
  /* 1. Config — edit in one place                                       */
  /* ------------------------------------------------------------------ */
  const SITE = {
    whatsapp: "917898140600", // Vansh — where the contact form is sent
    loaderMinMs: 900,
    loaderMaxMs: 3200,
  };

  /* ------------------------------------------------------------------ */
  /* 2. Preloader                                                        */
  /* ------------------------------------------------------------------ */
  const loader = document.getElementById("loader");
  const loaderNum = document.getElementById("loader-num");
  const loaderBar = document.getElementById("loader-bar");
  const loaderStatus = document.getElementById("loader-status");
  const loaderWords = loader ? Array.from(loader.querySelectorAll(".loader__word span")) : [];

  const startHero = () => {
    document.querySelectorAll(".hero .line").forEach((line) => line.classList.add("is-in"));
  };

  const finishLoading = () => {
    if (!loader) {
      document.body.classList.remove("is-loading");
      startHero();
      return;
    }
    loader.classList.add("is-done");
    document.body.classList.remove("is-loading");
    loader.setAttribute("aria-hidden", "true");
    // let the loader fade before the hero animates in
    window.setTimeout(startHero, reduceMotion ? 0 : 120);
    window.setTimeout(() => loader.remove(), 900);
  };

  if (loader && !reduceMotion) {
    document.body.classList.add("is-loading");
    const t0 = performance.now();
    let shown = 0;
    let finished = false;

    const statuses = [
      [0, "Preparing the scene"],
      [25, "Building the shards"],
      [55, "Loading type"],
      [80, "Almost there"],
      [96, "Welcome"],
    ];

    const tick = () => {
      // monotonic ramp in fixed steps — never stalls short of 97
      const next = Math.min(97, shown + Math.random() * 8 + 4);
      shown = next;
      const pct = Math.round(shown);
      if (loaderNum) loaderNum.textContent = String(pct);
      if (loaderBar) loaderBar.style.width = pct + "%";

      const wordIndex = Math.min(loaderWords.length - 1, Math.floor((pct / 100) * loaderWords.length));
      loaderWords.forEach((w, i) => w.classList.toggle("on", i <= wordIndex));

      if (loaderStatus) {
        for (let i = statuses.length - 1; i >= 0; i--) {
          if (pct >= statuses[i][0]) {
            loaderStatus.textContent = statuses[i][1];
            break;
          }
        }
      }

      if (shown < 97) {
        window.setTimeout(tick, 85);
      } else {
        complete();
      }
    };

    const complete = () => {
      if (finished) return;
      finished = true;
      const elapsed = performance.now() - t0;
      const wait = Math.max(0, SITE.loaderMinMs - elapsed);
      window.setTimeout(() => {
        if (loaderNum) loaderNum.textContent = "100";
        if (loaderBar) loaderBar.style.width = "100%";
        loaderWords.forEach((w) => w.classList.add("on"));
        if (loaderStatus) loaderStatus.textContent = "Ready";
        window.setTimeout(finishLoading, 220);
      }, wait);
    };

    // never trap the user behind the loader
    window.setTimeout(complete, SITE.loaderMaxMs);
    window.setTimeout(tick, 120);

    // start counting once fonts are ready (or 1.2s at worst)
    // fonts arriving late must not hold the page hostage
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (!finished && shown < 40) shown = 40; });
    }
  } else {
    // reduced motion (or no loader in the DOM): skip straight to the content
    document.body.classList.remove("is-loading");
    if (loader) loader.remove();
    startHero();
  }

  /* ------------------------------------------------------------------ */
  /* 3. Header + scroll progress                                         */
  /* ------------------------------------------------------------------ */
  const header = document.querySelector(".header");
  const progressBar = document.querySelector(".header__progress");
  const fab = document.querySelector(".wa-fab");

  let scrollQueued = false;
  const onScrollFrame = () => {
    scrollQueued = false;
    const y = window.scrollY;
    if (header) header.classList.toggle("is-stuck", y > 24);
    if (fab) fab.classList.toggle("is-visible", y > 380);
    if (progressBar) {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progressBar.style.setProperty("--p", String(Math.min(1, y / max)));
    }
    updateManifesto();
  };
  const onScroll = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(onScrollFrame);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  /* ------------------------------------------------------------------ */
  /* 4. Full-screen menu                                                 */
  /* ------------------------------------------------------------------ */
  const burger = document.querySelector(".burger");
  const menu = document.querySelector(".mobile-menu");

  if (burger && menu) {
    const setMenu = (open) => {
      burger.setAttribute("aria-expanded", String(open));
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-hidden", String(!open));
      document.body.classList.toggle("is-locked", open);
      if (open) {
        const first = menu.querySelector("a, button");
        if (first) first.focus({ preventScroll: true });
      }
    };
    burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        setMenu(false);
        burger.focus();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 5. Line-mask reveals                                                */
  /* ------------------------------------------------------------------ */
  const revealTargets = document.querySelectorAll("[data-reveal], [data-lines]");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((el) => el.classList.add("is-in"));
    document.querySelectorAll(".line").forEach((l) => l.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );

    revealTargets.forEach((el) => {
      // anything already in the first viewport reveals immediately
      if (el.getBoundingClientRect().top < window.innerHeight * 0.95) {
        el.classList.add("is-in");
      } else {
        io.observe(el);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 6. Manifesto — words light up as the section is scrolled            */
  /* ------------------------------------------------------------------ */
  const manifestoEl = document.querySelector("[data-manifesto]");
  const manifestoSection = document.querySelector(".manifesto");
  let words = [];

  if (manifestoEl) {
    const text = manifestoEl.textContent.trim().replace(/\s+/g, " ");
    manifestoEl.textContent = "";
    const frag = document.createDocumentFragment();
    text.split(" ").forEach((word, i) => {
      const span = document.createElement("span");
      span.className = "w";
      span.textContent = word;
      frag.appendChild(span);
      frag.appendChild(document.createTextNode(" "));
      words.push(span);
      if (i === 3 || i === 9 || i === 17) span.classList.add("w--accent");
    });
    manifestoEl.appendChild(frag);

    if (reduceMotion) {
      words.forEach((w) => w.classList.add("is-lit"));
    }
  }

  function updateManifesto() {
    if (!words.length || !manifestoSection || reduceMotion) return;
    const rect = manifestoSection.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return;
    const p = Math.min(1, Math.max(0, -rect.top / total));
    const lit = Math.round(p * words.length);
    for (let i = 0; i < words.length; i++) {
      words[i].classList.toggle("is-lit", i < lit);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 7. Process rail                                                     */
  /* ------------------------------------------------------------------ */
  const steps = document.querySelectorAll(".process__step");
  if (steps.length && "IntersectionObserver" in window && !reduceMotion) {
    const stepIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          steps.forEach((s) => s.classList.remove("is-active"));
          entry.target.classList.add("is-active");
        });
      },
      { rootMargin: "-42% 0px -48% 0px" }
    );
    steps.forEach((s) => stepIO.observe(s));
  } else {
    steps.forEach((s) => s.classList.add("is-active"));
  }

  /* ------------------------------------------------------------------ */
  /* 8. Counters                                                         */
  /* ------------------------------------------------------------------ */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window && !reduceMotion) {
    const countIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const end = parseFloat(el.dataset.count);
          const suffix = el.dataset.suffix || "";
          const dur = 1100;
          const t0 = performance.now();
          const step = (now) => {
            const p = Math.min((now - t0) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            const val = end % 1 === 0 ? Math.round(end * eased) : (end * eased).toFixed(1);
            el.textContent = val + suffix;
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          countIO.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((c) => countIO.observe(c));
  }

  /* ------------------------------------------------------------------ */
  /* 9. Marquee (duplicate the group for a seamless loop)                */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll(".marquee__track").forEach((track) => {
    const group = track.querySelector(".marquee__group");
    if (!group) return;
    const clone = group.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  });

  /* ------------------------------------------------------------------ */
  /* 10. Accordions                                                      */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll(".acc").forEach((acc) => {
    const btn = acc.querySelector(".acc__btn");
    if (!btn) return;

    const setOpen = (open) => {
      acc.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    };

    // desktop: show inclusions up front; phones: keep the card short
    if (acc.hasAttribute("data-open-desktop") && window.matchMedia("(min-width: 860px)").matches) {
      setOpen(true);
    }

    btn.addEventListener("click", () => setOpen(!acc.classList.contains("is-open")));
  });

  /* ------------------------------------------------------------------ */
  /* 11. Magnetic buttons                                                */
  /* ------------------------------------------------------------------ */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".btn, .wa-fab").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width;
        const y = (e.clientY - r.top - r.height / 2) / r.height;
        el.style.transform = `translate(${x * 6}px, ${y * 5 - 2}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 12. Contact form → WhatsApp                                         */
  /* ------------------------------------------------------------------ */
  const form = document.getElementById("project-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const phoneField = form.querySelector("#phone");
      if (phoneField) {
        const digits = phoneField.value.replace(/\D/g, "");
        phoneField.setCustomValidity(
          digits.length >= 10 && digits.length <= 13 ? "" : "Please enter a 10-digit mobile number."
        );
      }
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const get = (k) => (data.get(k) || "").toString().trim();
      const lines = [
        `Hi KotaLabs! I'm ${get("name") || "—"}.`,
        get("phone") ? `Phone: ${get("phone")}` : null,
        get("business") ? `Business: ${get("business")}` : null,
        get("budget") ? `Budget: ${get("budget")}` : null,
        get("brief") ? `About the project: ${get("brief")}` : null,
        "",
        "Sent from kotelabs.com",
      ].filter(Boolean);

      window.open(`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
      const status = document.getElementById("form-status");
      if (status) {
        status.textContent = "Opened WhatsApp with your details. If it didn't open, tap the WhatsApp button.";
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 12b. Scroll colour grade + footer wordmark                          */
  /* ------------------------------------------------------------------ */
  const root = document.documentElement;
  const wordmark = document.querySelector(".footer__wordmark");

  const gradeOnScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, window.scrollY / max));
    root.style.setProperty("--grade", p.toFixed(4));
    // hue swings out and back so every section feels like part of one grade
    root.style.setProperty("--grade-hue", (Math.sin(p * Math.PI) * 78).toFixed(1) + "deg");
  };
  window.addEventListener("scroll", gradeOnScroll, { passive: true });
  gradeOnScroll();

  if (wordmark) {
    if (reduceMotion) {
      wordmark.classList.add("is-in");
    } else {
      // NB: the wordmark is clipped to hide itself before the reveal, and an
      // IntersectionObserver never fires on a fully clipped element — so the
      // trigger is a plain scroll-position check instead.
      const checkWordmark = () => {
        if (wordmark.classList.contains("is-in")) return;
        const r = wordmark.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
          wordmark.classList.add("is-in");
          window.removeEventListener("scroll", checkWordmark);
        }
      };
      window.addEventListener("scroll", checkWordmark, { passive: true });
      window.addEventListener("resize", checkWordmark, { passive: true });
      checkWordmark();
    }
  }

  /* ------------------------------------------------------------------ */
  /* 13. Year stamps                                                     */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ------------------------------------------------------------------ */
  /* 14. Lazy Three.js hero                                              */
  /* ------------------------------------------------------------------ */
  const heroCanvas = document.getElementById("scene");
  if (heroCanvas && !reduceMotion) {
    const load3d = () => {
      if (window.__kotelabsHero) return;
      const script = document.createElement("script");
      script.type = "module";
      script.src = heroCanvas.dataset.src || "assets/js/hero-scene.js";
      script.onerror = () => heroCanvas.remove();
      document.head.appendChild(script);
    };

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((en) => en.isIntersecting)) {
            load3d();
            io.disconnect();
          }
        },
        { rootMargin: "400px" }
      );
      io.observe(heroCanvas);
    } else {
      load3d();
    }
  }

  onScrollFrame();
})();
