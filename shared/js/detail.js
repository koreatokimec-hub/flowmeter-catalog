(() => {
  const stackedDetailPage = document.querySelector(".detail-page.has-stacked-header");
  if (stackedDetailPage) {
    const root = document.documentElement;
    const stack = stackedDetailPage.querySelector(".detail-header-stack");
    const syncHeaderHeight = () => {
      if (!stack) return;
      root.style.setProperty("--detail-stack-h", `${stack.offsetHeight}px`);
    };
    syncHeaderHeight();
    window.addEventListener("resize", syncHeaderHeight);
  }

  const viewerImg = document.querySelector("[data-viewer-img]");
  if (!viewerImg) return;

  const viewer = viewerImg.closest(".viewer");
  const frame = viewer?.querySelector(".viewer-frame");
  const caption = viewer?.querySelector("[data-viewer-caption]");
  const placeholder = viewer?.querySelector(".viewer-ph");
  const prevButton = viewer?.querySelector("[data-viewer-prev]");
  const nextButton = viewer?.querySelector("[data-viewer-next]");
  if (!viewer || !frame) return;

  if (prevButton) prevButton.style.display = "none";
  if (nextButton) nextButton.style.display = "none";

  const pageKey = (() => {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return "";
    return parts[parts.length - 2];
  })();

  const extList = ["png", "jpg", "jpeg", "webp", "gif", "svg"];
  const loadable = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });

  const keyVariants = (key) =>
    Array.from(new Set([key, key.toLowerCase(), key.toUpperCase()])).filter(Boolean);

  const buildCandidates = (key, maxIndex = 8) => {
    const dirs = [`../shared/img/${key}`, `../shared/img/guide/${key}`];
    const names = ["main", "cover", "01", "1"];

    for (let index = 1; index <= maxIndex; index += 1) {
      const n = String(index);
      const n2 = n.padStart(2, "0");
      const n3 = n.padStart(3, "0");
      names.push(
        `${key}_${n}`,
        `${key}_${n2}`,
        `${key}_${n3}`,
        `${key}_g_${n}`,
        `${key}_g_${n2}`,
        `${key}_g_${n3}`,
        `${key}-g_${n}`,
        `${key}-g_${n2}`,
        `${key}-g-${n}`,
        `${key}-g-${n2}`
      );
    }

    const out = [];
    for (const dir of dirs) {
      for (const name of names) {
        for (const ext of extList) {
          out.push(`${dir}/${name}.${ext}`);
        }
      }
    }
    return out;
  };

  const uniquePush = (bucket, seen, src, label) => {
    const value = (src || "").trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    bucket.push({ src: value, label: (label || "제품 이미지").trim() });
  };

  const blockImages = Array.from(document.querySelectorAll("[data-img]"));
  const seedImages = [];
  const seen = new Set();

  uniquePush(seedImages, seen, viewerImg.getAttribute("src"), "제품 이미지");
  for (const block of blockImages) {
    uniquePush(
      seedImages,
      seen,
      block.getAttribute("data-img"),
      block.getAttribute("data-caption") || block.querySelector("h2")?.textContent || "제품 이미지"
    );
  }

  const resolveImages = async () => {
    const valid = [];
    for (const item of seedImages) {
      if (await loadable(item.src)) valid.push(item);
    }

    if (valid.length >= 2 || !pageKey) return valid;

    for (const key of keyVariants(pageKey)) {
      for (const src of buildCandidates(key)) {
        if (seen.has(src)) continue;
        if (await loadable(src)) {
          valid.push({ src, label: "제품 이미지" });
          seen.add(src);
          if (valid.length >= 8) return valid;
        }
      }
    }

    return valid;
  };

  const setPlaceholderVisible = () => {
    if (placeholder) placeholder.style.display = "flex";
    viewerImg.style.display = "none";
  };

  const setImageVisible = () => {
    if (placeholder) placeholder.style.display = "none";
    viewerImg.style.display = "block";
  };

  let gallery = [];
  let currentIndex = 0;
  let thumbButtons = [];
  let lightbox = null;
  let lightboxStage = null;
  let lightboxImg = null;
  let lightboxClose = null;
  let lightboxCaption = null;

  const ensureLightbox = () => {
    if (lightbox) return;

    lightbox = document.createElement("div");
    lightbox.className = "viewer-lightbox";
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML = `
      <div class="viewer-lightbox__stage" role="dialog" aria-modal="true" aria-label="이미지 확대 보기">
        <button type="button" class="viewer-lightbox__close" aria-label="닫기">×</button>
        <img class="viewer-lightbox__img" alt="제품 이미지 확대" />
      </div>
      <p class="viewer-lightbox__caption"></p>
    `;

    document.body.appendChild(lightbox);
    lightboxStage = lightbox.querySelector(".viewer-lightbox__stage");
    lightboxImg = lightbox.querySelector(".viewer-lightbox__img");
    lightboxClose = lightbox.querySelector(".viewer-lightbox__close");
    lightboxCaption = lightbox.querySelector(".viewer-lightbox__caption");

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    lightboxStage?.addEventListener("click", (event) => event.stopPropagation());
    lightboxClose?.addEventListener("click", closeLightbox);
  };

  const syncLightbox = () => {
    if (!lightbox || !lightbox.classList.contains("is-open") || !gallery.length) return;
    const current = gallery[currentIndex];
    if (!current) return;

    if (lightboxImg) {
      lightboxImg.src = current.src;
      lightboxImg.alt = current.label || "제품 이미지";
    }
    if (lightboxCaption) {
      lightboxCaption.textContent = current.label || "제품 이미지";
    }
  };

  function openLightbox(index) {
    if (!gallery.length) return;
    ensureLightbox();
    currentIndex = Math.max(0, Math.min(index, gallery.length - 1));
    lightbox?.classList.add("is-open");
    lightbox?.setAttribute("aria-hidden", "false");
    syncLightbox();
    document.body.classList.add("is-lightbox-open");
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-lightbox-open");
  }

  const renderActive = (index) => {
    if (!gallery.length) {
      setPlaceholderVisible();
      if (caption) caption.textContent = "이미지 준비중";
      return;
    }

    currentIndex = Math.max(0, Math.min(index, gallery.length - 1));
    const current = gallery[currentIndex];

    viewerImg.src = current.src;
    viewerImg.alt = current.label || "제품 이미지";
    if (caption) caption.textContent = current.label || "제품 이미지";
    setImageVisible();
    syncLightbox();

    for (let i = 0; i < thumbButtons.length; i += 1) {
      thumbButtons[i].classList.toggle("is-active", i === currentIndex);
    }
  };

  const buildThumbs = () => {
    const oldThumbs = viewer.querySelector(".viewer-thumbs");
    if (oldThumbs) oldThumbs.remove();

    if (gallery.length < 1) {
      thumbButtons = [];
      return;
    }

    const thumbs = document.createElement("div");
    thumbs.className = "viewer-thumbs";
    thumbButtons = [];

    for (let i = 0; i < gallery.length; i += 1) {
      const item = gallery[i];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "viewer-thumb";
      button.setAttribute("aria-label", `${i + 1}번 이미지 보기`);

      const thumbImage = document.createElement("img");
      thumbImage.src = item.src;
      thumbImage.alt = item.label || `썸네일 ${i + 1}`;
      button.appendChild(thumbImage);

      button.addEventListener("click", () => renderActive(i));
      thumbButtons.push(button);
      thumbs.appendChild(button);
    }

    frame.insertAdjacentElement("afterend", thumbs);
  };

  viewerImg.addEventListener("error", setPlaceholderVisible);
  viewerImg.addEventListener("load", setImageVisible);

  frame.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLImageElement)) return;
    openLightbox(currentIndex);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLightbox();
    }
  });

  (async () => {
    gallery = await resolveImages();
    buildThumbs();
    renderActive(0);
  })();
})();

