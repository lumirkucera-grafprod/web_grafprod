(() => {
  const galleryEl = document.getElementById("gallery");
  const galleryPanel = document.getElementById("gallery-panel");
  const galleryStatus = document.getElementById("gallery-status");
  const aboutPanel = document.getElementById("about");
  const mainEl = document.getElementById("main");
  const catButtons = document.querySelectorAll(".cat");
  const navLinks = document.querySelectorAll(".top-nav a");
  const scrollEdge = document.getElementById("scroll-edge");
  const scrollHint = document.getElementById("scroll-hint");
  const chevDown = document.getElementById("chev-down");
  const toast = document.getElementById("toast");

  const HINT_KEY = "gp-navrh-scroll-hint";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktopScroll = window.matchMedia("(min-width: 961px)");

  let activeCat = "commercial";
  let layouts = null;
  let images = {};
  let toastTimer = 0;

  const CAT_LABEL = {
    commercial: "Komerční interiéry",
    residential: "Rezidenční interiéry",
    branding: "Grafický design",
    mirror: "Grafika prosvětlená zrcadlem",
  };
  const CAT_ALT = {
    commercial: "Komerční interiér",
    residential: "Rezidenční interiér",
    branding: "Grafický design",
    mirror: "Grafika prosvětlená zrcadlem",
  };
  /* Captions from the grafický design PDF, y in the same gallery points as layout.json. */
  const BRANDING_COPY = [
    { y: 0, text: "Navrhneme a realizujeme kompletní branding" },
    { y: 1392.73, text: "Vytvoříme pro vás značku, logo" },
    {
      y: 1918.84,
      text: "Navrhneme design a vyrobíme prostředky pro vaši\nin-store komunikaci",
    },
    {
      y: 3758.59,
      text: "Vytvoříme pro vás vizuální identitu a aplikujeme do reálného i digitálního světa. Navrhneme obaly, katalogy, prezentace, bannery nebo grafiku na auta tak, aby každé setkání s vaší firmou zanechalo perfektní dojem.",
    },
  ];

  const COUNTS = { commercial: 29, residential: 15, branding: 18, mirror: 8 };
  Object.keys(COUNTS).forEach((cat) => {
    images[cat] = [];
    for (let i = 0; i < COUNTS[cat]; i++) {
      images[cat].push(`assets/gallery/${cat}/${String(i).padStart(2, "0")}.jpg`);
    }
  });

  function assetUrl(path) {
    return new URL(path, document.baseURI).href;
  }

  function scrollBehavior() {
    return reduceMotion.matches ? "auto" : "smooth";
  }

  function photoPhrase(n) {
    if (n === 1) return "1 fotografie";
    if (n >= 2 && n <= 4) return `${n} fotografie`;
    return `${n} fotografií`;
  }

  function altText(cat, index) {
    return `${CAT_ALT[cat] || "Projekt"} ${index + 1}`;
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function brandingCopyMarkup() {
    return BRANDING_COPY.map((block) => {
      return `<p class="gallery-copy" style="--y:${block.y};--stack:${Math.round(block.y)}">${esc(block.text)}</p>`;
    }).join("");
  }

  function hintSeen() {
    try {
      return sessionStorage.getItem(HINT_KEY) === "1";
    } catch (err) {
      return false;
    }
  }

  function markHintSeen() {
    try {
      sessionStorage.setItem(HINT_KEY, "1");
    } catch (err) {
      /* private mode */
    }
    scrollHint.hidden = true;
    chevDown.classList.remove("hint-pulse");
  }

  function scrollMetrics() {
    if (desktopScroll.matches) {
      return {
        top: mainEl.scrollTop,
        height: mainEl.scrollHeight,
        view: mainEl.clientHeight,
      };
    }
    const el = document.scrollingElement || document.documentElement;
    return { top: el.scrollTop, height: el.scrollHeight, view: window.innerHeight };
  }

  function updateScrollAffordance() {
    const { top, height, view } = scrollMetrics();
    const overflow = height - view > 32;
    const atBottom = top + view >= height - 28;
    scrollEdge.classList.toggle("is-on", overflow && !atBottom);

    const showHint = overflow && top < 28 && !hintSeen();
    scrollHint.hidden = !showHint;
    const pulse = showHint && desktopScroll.matches && !reduceMotion.matches;
    chevDown.classList.toggle("hint-pulse", pulse);
    if (top > 48) markHintSeen();
  }

  let affordanceRaf = 0;
  function scheduleAffordance() {
    if (affordanceRaf) return;
    affordanceRaf = requestAnimationFrame(() => {
      affordanceRaf = 0;
      updateScrollAffordance();
    });
  }

  function renderGallery(cat) {
    galleryEl.classList.add("loading");
    galleryEl.innerHTML = "";

    const layout = layouts && layouts[cat];
    let count = 0;
    if (layout && layout.items && layout.items.length) {
      const gw = layout.galleryW;
      const gh = layout.galleryH;
      galleryEl.style.setProperty("--gal-w", gw);
      galleryEl.style.setProperty("--gal-h", gh);
      galleryEl.style.aspectRatio = `${gw} / ${gh}`;
      galleryEl.classList.add("masonry");
      galleryEl.classList.remove("fallback-rows");
      count = layout.items.length;

      galleryEl.innerHTML = layout.items
        .map((item, i) => {
          const src = assetUrl(`assets/gallery/${cat}/${item.file}`);
          const alt = esc(altText(cat, i));
          return `<figure style="--x:${item.x};--y:${item.y};--w:${item.w};--h:${item.h};--stack:${Math.round(item.y)}" data-i="${i}"><img src="${src}" alt="${alt}" width="${item.px_w || Math.round(item.w)}" height="${
            item.px_h || Math.round(item.h)
          }" loading="${i < 8 ? "eager" : "lazy"}" decoding="async" /></figure>`;
        })
        .join("");
      if (cat === "branding") galleryEl.insertAdjacentHTML("beforeend", brandingCopyMarkup());
    } else {
      galleryEl.classList.remove("masonry");
      galleryEl.classList.add("fallback-rows");
      galleryEl.style.removeProperty("--gal-w");
      galleryEl.style.removeProperty("--gal-h");
      galleryEl.style.aspectRatio = "";
      const list = images[cat] || [];
      count = list.length;
      galleryEl.innerHTML = (cat === "branding" ? brandingCopyMarkup() : "") + list
        .map((src, i) => {
          const alt = esc(altText(cat, i));
          return `<div class="gallery-row full"><figure><img src="${assetUrl(src)}" alt="${alt}" loading="${
            i < 8 ? "eager" : "lazy"
          }" decoding="async" /></figure></div>`;
        })
        .join("");
    }

    const label = CAT_LABEL[cat] || cat;
    galleryEl.setAttribute("aria-label", `${label}, ${photoPhrase(count)}`);
    if (galleryStatus) galleryStatus.textContent = `${label}, ${photoPhrase(count)}`;
    galleryEl.classList.remove("loading");
  }

  function setNavActive(key) {
    navLinks.forEach((a) => {
      const on = a.dataset.nav === key;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  function scrollToTop() {
    const behavior = scrollBehavior();
    if (desktopScroll.matches) mainEl.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
  }

  function scrollToEl(el) {
    if (!el) {
      scrollToTop();
      return;
    }
    const behavior = scrollBehavior();
    if (desktopScroll.matches) {
      const top = el.getBoundingClientRect().top - mainEl.getBoundingClientRect().top + mainEl.scrollTop - 24;
      mainEl.scrollTo({ top: Math.max(0, top), behavior });
    } else {
      const top = el.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top: Math.max(0, top), behavior });
    }
  }

  function showGallery(cat) {
    activeCat = cat;
    aboutPanel.hidden = true;
    galleryPanel.hidden = false;
    catButtons.forEach((btn) => {
      const on = btn.dataset.cat === cat;
      btn.classList.toggle("active", on);
      if (on) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
    setNavActive(null);
    renderGallery(cat);
    scrollToTop();
    requestAnimationFrame(scheduleAffordance);
  }

  function showAbout(target) {
    galleryPanel.hidden = true;
    aboutPanel.hidden = false;
    catButtons.forEach((btn) => {
      btn.classList.remove("active");
      btn.removeAttribute("aria-current");
    });
    const navKey = target === "inquiry" ? "poptavka" : target === "contact" ? "kontakt" : "onas";
    setNavActive(navKey);
    if (galleryStatus) galleryStatus.textContent = "";
    requestAnimationFrame(() => {
      if (target === "inquiry") scrollToEl(document.getElementById("poptavka"));
      else if (target === "contact") scrollToEl(document.getElementById("kontakt"));
      else scrollToTop();
      requestAnimationFrame(scheduleAffordance);
    });
  }

  catButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      history.replaceState(null, "", location.pathname);
      showGallery(btn.dataset.cat);
    });
  });

  navLinks.forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const key = a.dataset.nav;
      const hash = key === "onas" ? "#onas" : key === "kontakt" ? "#kontakt" : "#poptavka";
      history.replaceState(null, "", hash);
      if (key === "poptavka") showAbout("inquiry");
      else if (key === "kontakt") showAbout("contact");
      else showAbout("about");
    });
  });

  document.getElementById("logo-home").addEventListener("click", (e) => {
    e.preventDefault();
    history.replaceState(null, "", location.pathname);
    showGallery(activeCat || "commercial");
  });

  const scrollByView = (dir) => {
    const amount = Math.max(280, (desktopScroll.matches ? mainEl.clientHeight : window.innerHeight) * 0.7) * dir;
    const behavior = scrollBehavior();
    if (desktopScroll.matches) mainEl.scrollBy({ top: amount, behavior });
    else window.scrollBy({ top: amount, behavior });
  };
  document.getElementById("chev-up").addEventListener("click", () => scrollByView(-1));
  document.getElementById("chev-down").addEventListener("click", () => {
    markHintSeen();
    scrollByView(1);
  });

  mainEl.addEventListener("scroll", scheduleAffordance, { passive: true });
  window.addEventListener("scroll", scheduleAffordance, { passive: true });
  window.addEventListener("resize", scheduleAffordance);
  if (typeof ResizeObserver === "function") {
    const ro = new ResizeObserver(scheduleAffordance);
    ro.observe(galleryEl);
    ro.observe(document.body);
  }

  function isTypingTarget(el) {
    if (!el || !el.closest) return false;
    return Boolean(el.closest("input, textarea, select, [contenteditable='true']"));
  }

  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (isTypingTarget(e.target)) return;
    const behavior = e.repeat || reduceMotion.matches ? "auto" : "smooth";
    const view = desktopScroll.matches ? mainEl.clientHeight : window.innerHeight;
    const go = (top) => {
      if (desktopScroll.matches) mainEl.scrollTo({ top, behavior });
      else window.scrollTo({ top, behavior });
    };
    const by = (delta) => {
      if (desktopScroll.matches) mainEl.scrollBy({ top: delta, behavior });
      else window.scrollBy({ top: delta, behavior });
    };
    const max = desktopScroll.matches
      ? mainEl.scrollHeight
      : (document.scrollingElement || document.documentElement).scrollHeight;
    if (e.key === "PageDown") by(Math.round(view * 0.9));
    else if (e.key === "PageUp") by(-Math.round(view * 0.9));
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(max);
    else if (e.key === "ArrowDown") by(Math.round(Math.max(48, view * 0.12)));
    else if (e.key === "ArrowUp") by(-Math.round(Math.max(48, view * 0.12)));
    else return;
    e.preventDefault();
  });

  function showToast(message, tone) {
    toast.hidden = false;
    toast.dataset.tone = tone || "ok";
    toast.textContent = message;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 7000);
  }

  function setFieldError(input, message) {
    const err = document.getElementById(`${input.id}-error`);
    if (!err) return;
    if (message) {
      input.setAttribute("aria-invalid", "true");
      err.hidden = false;
      err.textContent = message;
    } else {
      input.removeAttribute("aria-invalid");
      err.hidden = true;
      err.textContent = "";
    }
  }

  const form = document.getElementById("poptavka");
  const nameInput = document.getElementById("inq-name");
  const emailInput = document.getElementById("inq-email");
  const msgInput = document.getElementById("inq-msg");
  const emailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

  [nameInput, emailInput, msgInput].forEach((input) => {
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") setFieldError(input, "");
    });
  });

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const msg = msgInput.value.trim();
      const nameMsg = name ? "" : "Doplňte jméno.";
      const emailMsg = emailOk(email) ? "" : "Zadejte platný e-mail.";
      const msgMsg = msg ? "" : "Napište zprávu.";
      setFieldError(nameInput, nameMsg);
      setFieldError(emailInput, emailMsg);
      setFieldError(msgInput, msgMsg);
      const firstInvalid = nameMsg ? nameInput : emailMsg ? emailInput : msgMsg ? msgInput : null;
      if (firstInvalid) {
        firstInvalid.focus({ preventScroll: true });
        scrollToEl(firstInvalid);
        showToast("Zkontrolujte prosím vyplněná pole.", "error");
        return;
      }
      const subject = encodeURIComponent("Poptávka — GRAFIKAPRODUKCE");
      const body = encodeURIComponent(`jméno: ${name}\nemail: ${email}\n\nzpráva:\n${msg}`);
      const href = `mailto:lumir@grafikaprodukce.cz?subject=${subject}&body=${body}`;
      showToast("Děkujeme. Zpráva je připravená v e-mailu — po odeslání se vám ozveme.", "ok");
      window.location.href = href;
    });
  }

  function applyHash() {
    let h = location.hash || "";
    try {
      h = decodeURIComponent(h);
    } catch (err) {
      /* keep raw hash */
    }
    h = h.toLowerCase();
    if (h === "#onas" || h === "#o-nas" || h === "#about") showAbout("about");
    else if (h === "#kontakt" || h === "#contact") showAbout("contact");
    else if (h === "#poptavka" || h === "#poptávka" || h === "#inquiry") showAbout("inquiry");
  }
  window.addEventListener("hashchange", applyHash);

  const start = () => {
    showGallery("commercial");
    applyHash();
    requestAnimationFrame(scheduleAffordance);
  };

  if (typeof window.GP_LAYOUT === "object" && window.GP_LAYOUT) {
    layouts = window.GP_LAYOUT;
  }
  if (typeof window.GP_MANIFEST === "object" && window.GP_MANIFEST) {
    images = window.GP_MANIFEST;
  }

  const canFetch =
    typeof location !== "undefined" &&
    (location.protocol === "http:" || location.protocol === "https:");

  if (canFetch) {
    Promise.all([
      fetch(assetUrl("assets/layout.json"))
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(assetUrl("assets/manifest.json"))
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([layoutData, manifestData]) => {
      if (layoutData) layouts = layoutData;
      if (manifestData) images = manifestData;
      start();
    });
  } else {
    start();
  }
})();
