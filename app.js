(() => {
  const galleryEl = document.getElementById("gallery");
  const galleryPanel = document.getElementById("gallery-panel");
  const aboutPanel = document.getElementById("about");
  const mainEl = document.getElementById("main");
  const catButtons = document.querySelectorAll(".cat");

  let activeCat = "commercial";
  let layouts = null;
  let images = {};

  // Fallback counts if layout.json missing (should not happen)
  const COUNTS = { commercial: 29, residential: 15, branding: 18, mirror: 8 };
  Object.keys(COUNTS).forEach((cat) => {
    images[cat] = [];
    for (let i = 0; i < COUNTS[cat]; i++) {
      images[cat].push(`assets/gallery/${cat}/${String(i).padStart(2, "0")}.jpg`);
    }
  });

  function renderGallery(cat) {
    galleryEl.classList.add("loading");
    galleryEl.innerHTML = "";

    const layout = layouts && layouts[cat];
    if (layout && layout.items && layout.items.length) {
      const gw = layout.galleryW;
      const gh = layout.galleryH;
      galleryEl.style.setProperty("--gal-w", gw);
      galleryEl.style.setProperty("--gal-h", gh);
      galleryEl.style.aspectRatio = `${gw} / ${gh}`;
      galleryEl.classList.add("masonry");
      galleryEl.classList.remove("fallback-rows");

      galleryEl.innerHTML = layout.items
        .map((item, i) => {
          const src = `assets/gallery/${cat}/${item.file}`;
          return `<figure style="--x:${item.x};--y:${item.y};--w:${item.w};--h:${item.h}" data-i="${i}"><img src="${src}" alt="Projekt ${
            i + 1
          }" width="${item.px_w || Math.round(item.w)}" height="${
            item.px_h || Math.round(item.h)
          }" loading="${i < 8 ? "eager" : "lazy"}" decoding="async" /></figure>`;
        })
        .join("");
    } else {
      // Simple stacked fallback
      galleryEl.classList.remove("masonry");
      galleryEl.classList.add("fallback-rows");
      galleryEl.style.removeProperty("--gal-w");
      galleryEl.style.removeProperty("--gal-h");
      galleryEl.style.aspectRatio = "";
      const list = images[cat] || [];
      galleryEl.innerHTML = list
        .map(
          (src, i) =>
            `<div class="gallery-row full"><figure><img src="${src}" alt="Projekt ${
              i + 1
            }" loading="${i < 8 ? "eager" : "lazy"}" decoding="async" /></figure></div>`
        )
        .join("");
    }

    galleryEl.classList.remove("loading");
  }

  function scrollMainTop() {
    mainEl.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showGallery(cat) {
    activeCat = cat;
    aboutPanel.hidden = true;
    galleryPanel.hidden = false;
    catButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.cat === cat);
    });
    renderGallery(cat);
    scrollMainTop();
  }

  function showAbout(scrollToContact) {
    galleryPanel.hidden = true;
    aboutPanel.hidden = false;
    catButtons.forEach((btn) => btn.classList.remove("active"));
    requestAnimationFrame(() => {
      if (scrollToContact) {
        const target = document.getElementById("kontakt");
        const top = target.offsetTop - 24;
        mainEl.scrollTo({ top, behavior: "smooth" });
      } else {
        scrollMainTop();
      }
    });
  }

  catButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      history.replaceState(null, "", location.pathname);
      showGallery(btn.dataset.cat);
    });
  });

  document.querySelectorAll(".top-nav a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const href = a.getAttribute("href");
      history.replaceState(null, "", href);
      showAbout(href === "#kontakt");
    });
  });

  document.getElementById("logo-home").addEventListener("click", (e) => {
    e.preventDefault();
    history.replaceState(null, "", location.pathname);
    showGallery(activeCat || "commercial");
  });

  const scrollByView = (dir) => {
    const amount = Math.max(320, mainEl.clientHeight * 0.7) * dir;
    mainEl.scrollBy({ top: amount, behavior: "smooth" });
  };
  document.getElementById("chev-up").addEventListener("click", () => scrollByView(-1));
  document.getElementById("chev-down").addEventListener("click", () => scrollByView(1));

  const form = document.getElementById("inquiry-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("inq-name").value.trim();
      const email = document.getElementById("inq-email").value.trim();
      const msg = document.getElementById("inq-msg").value.trim();
      const subject = encodeURIComponent("Poptávka — GRAFIKAPRODUKCE");
      const body = encodeURIComponent(
        `jméno: ${name}\nemail: ${email}\n\nzpráva:\n${msg}`
      );
      window.location.href = `mailto:lumir@grafikaprodukce.cz?subject=${subject}&body=${body}`;
    });
  }

  function applyHash() {
    const h = (location.hash || "").toLowerCase();
    if (h === "#onas" || h === "#o-nas" || h === "#about") showAbout(false);
    else if (h === "#kontakt" || h === "#contact") showAbout(true);
  }
  window.addEventListener("hashchange", applyHash);

  const start = () => {
    showGallery("commercial");
    applyHash();
  };

  // Prefer embedded data (works under file://). Optional fetch override when served over http(s).
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
      fetch("assets/layout.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("assets/manifest.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([layoutData, manifestData]) => {
      if (layoutData) layouts = layoutData;
      if (manifestData) images = manifestData;
      start();
    });
  } else {
    start();
  }
})();
