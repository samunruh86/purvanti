const PRODUCTS_PATH = "assets/data/products_all.json";
const CONTENT_PATH = "assets/data/content.json";

const sectionBuilders = {
  hero: renderHero,
  featured_collection: renderFeatured,
  banner_full: renderBanner,
  product_lifestyle_carousel: renderLifestyleCarousel,
  video_reels: renderVideoReels,
  endurance_grid: renderEnduranceGrid,
  brand_statement: renderStatement,
  blog_feature: renderBlogFeature,
  mission_video: renderMissionVideo,
  new_arrivals: renderNewArrivals,
  reviews_slider: renderReviews,
};

document.addEventListener("DOMContentLoaded", () => {
  rewriteCategoryAnchors();
  const pageType = document.body.dataset.page;
  if (pageType === "category") {
    hydrateCategoryPage();
    return;
  }

  const app = document.getElementById("app");
  if (!app) return;
  hydratePage(app);
});

async function hydratePage(app) {
  const loadingNote = document.getElementById("loading-note");

  try {
    const [content, products] = await Promise.all([
      fetchJSON(CONTENT_PATH),
      fetchJSON(PRODUCTS_PATH),
    ]);

    const homeSections = Array.isArray(content?.home) ? content.home : [];
    const categories = content?.categories || [];
    const productMap = mapProducts(products?.products || []);

    renderChrome(productMap, categories);

    homeSections.forEach((block) => {
      const builder = sectionBuilders[block.section];
      if (!builder) return;
      const node = builder(block, productMap);
      if (node) app.appendChild(node);
    });

    window.dispatchEvent(
      new CustomEvent("purvanti:page-hydrated", {
        detail: { products: uniqueProducts(productMap) },
      })
    );
  } catch (error) {
    console.error(error);
    if (app) {
      const err = document.createElement("p");
      err.textContent = "We could not load the page content right now.";
      app.appendChild(err);
    }
  } finally {
    loadingNote?.remove();
  }
}

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function mapProducts(list) {
  return list.reduce((map, item) => {
    if (item.id) map.set(item.id, item);
    if (item.handle) map.set(item.handle, item);
    return map;
  }, new Map());
}

function uniqueProducts(productMap) {
  return Array.from(new Set(productMap.values()));
}

function resolveAssetPath(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
  return `${getBasePath()}${path}`;
}

function getBasePath() {
  const path = window.location.pathname || "/";
  if (path.includes("/products/")) {
    return path.split("/products/")[0] + "/";
  }
  if (path.includes("product.html")) {
    return path.replace(/product\.html.*/i, "");
  }
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return "/";
  return path.slice(0, lastSlash + 1);
}

async function hydrateCategoryPage() {
  const loadingNote = document.getElementById("loading-note");
  const hero = document.getElementById("category-hero");
  const introTitle = document.getElementById("category-title");
  const introEyebrow = document.querySelector(".category-intro__eyebrow");
  const introHeadline = document.querySelector(".category-intro__headline");
  const countEl = document.querySelector("[data-category-count]");
  const listTarget = document.getElementById("category-products");

  try {
    const [content, products] = await Promise.all([
      fetchJSON(CONTENT_PATH),
      fetchJSON(PRODUCTS_PATH),
    ]);

    const categories = content?.categories || [];
    const productMap = mapProducts(products?.products || []);

    renderChrome(productMap, categories);

    const currentCategory = resolveCurrentCategory(categories);
    if (!currentCategory) {
      if (listTarget) listTarget.textContent = "Category not found.";
      return;
    }

    updateCategoryPrettyPath(currentCategory);
    const categoryName = currentCategory.category;
    const items = filterProductsByCategory(productMap, categoryName);

    renderCategoryHero(hero, currentCategory);
    if (introTitle) introTitle.textContent = categoryName || "Wellness Products";
    if (introEyebrow) introEyebrow.textContent = currentCategory.pre_header || "Plant Powered";
    if (introHeadline)
      introHeadline.textContent =
        currentCategory.tagline || "Daily supplements with benefits for you to feel good";
    if (countEl) {
      const count = items.length;
      countEl.textContent = `${count} product${count === 1 ? "" : "s"}`;
    }
    renderCategoryProducts(listTarget, items);
  } catch (error) {
    console.error(error);
    if (listTarget) {
      listTarget.textContent = "We couldn't load this category right now.";
    }
  } finally {
    loadingNote?.remove();
  }
}

function resolveCurrentCategory(categories) {
  if (!Array.isArray(categories) || !categories.length) return null;

  const params = new URLSearchParams(window.location.search);
  const fromParam = params.get("category") || params.get("slug");
  const pathLast = window.location.pathname.split("/").filter(Boolean).pop();
  const stored = getStoredCategorySlug();

  const candidates = [fromParam, pathLast, stored];
  const normalizedCategories = categories.map((cat) => ({
    ...cat,
    slug: normalizeCategorySlug(cat.category) || categorySlugFromHref(cat.cta_href),
  }));

  for (const candidate of candidates) {
    if (!candidate) continue;
    const slug = normalizeCategorySlug(candidate);
    const found = normalizedCategories.find((cat) => cat.slug === slug);
    if (found) return found;
  }

  return normalizedCategories[0] || null;
}

function normalizeCategorySlug(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function categorySlugFromHref(href) {
  if (!href) return "";
  try {
    const url = new URL(href, window.location.origin);
    const param = url.searchParams.get("category") || url.searchParams.get("slug");
    if (param) return normalizeCategorySlug(param);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length) return normalizeCategorySlug(parts[parts.length - 1]);
  } catch (error) {
    console.error(error);
  }
  return normalizeCategorySlug(href);
}

function filterProductsByCategory(productMap, categoryName) {
  const slug = normalizeCategorySlug(categoryName);
  if (!slug) return [];
  return uniqueProducts(productMap).filter(
    (product) => normalizeCategorySlug(product.category) === slug
  );
}

function rewriteCategoryAnchors() {
  document.querySelectorAll('a[href*="category.html"]').forEach((anchor) => {
    const href = anchor.getAttribute("href");
    const slug = categorySlugFromHref(href);
    if (!slug) return;
    const storeSlug = () => {
      try {
        sessionStorage.setItem("purvanti:lastCategory", slug);
      } catch (error) {
        console.warn("Could not store category slug", error);
      }
    };
    anchor.addEventListener("click", storeSlug);
    anchor.addEventListener("auxclick", storeSlug);
    anchor.addEventListener("mousedown", storeSlug);
  });
}

function getStoredCategorySlug() {
  try {
    return sessionStorage.getItem("purvanti:lastCategory");
  } catch (error) {
    console.warn("Could not read stored category slug", error);
    return null;
  }
}

function updateCategoryPrettyPath(category) {
  if (!category) return;
  const slug = normalizeCategorySlug(category.category) || category.slug;
  if (!slug) return;
  const base = getBasePath().replace(/\/$/, "");
  const target = `${base}/category.html?category=${slug}`;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== target) {
    window.history.replaceState({}, "", target);
  }
}

function renderHero(data) {
  const section = document.createElement("section");
  section.className = "hero-block";
  section.setAttribute("data-section", "hero");

  const leftPane = document.createElement("div");
  leftPane.className = "hero-block__pane hero-block__pane--video";

  const leftMedia = document.createElement("div");
  leftMedia.className = "hero-block__media";

  const video = document.createElement("video");
  video.className = "hero-block__video";
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.poster = data.images?.[0] || "";

  if (data.video?.[0]) {
    const sourceDesktop = document.createElement("source");
    sourceDesktop.src = data.video[0];
    sourceDesktop.type = "video/mp4";
    sourceDesktop.media = "(min-width: 769px)";
    video.appendChild(sourceDesktop);
  }

  if (data.video?.[1]) {
    const sourceMobile = document.createElement("source");
    sourceMobile.src = data.video[1];
    sourceMobile.type = "video/mp4";
    sourceMobile.media = "(max-width: 768px)";
    video.appendChild(sourceMobile);
  }

  const fallback = document.createElement("img");
  fallback.className = "hero-block__fallback";
  fallback.alt = data.header || "hero background";
  fallback.src = data.images?.[0] || "";

  const shade = document.createElement("div");
  shade.className = "hero-block__shade";

  leftMedia.append(fallback, video, shade);

  const content = document.createElement("div");
  content.className = "hero-block__content";

  const copy = document.createElement("div");
  copy.className = "hero-block__copy";

  if (data.pre_header) {
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = data.pre_header;
    copy.appendChild(eyebrow);
  }

  if (data.header) {
    const title = document.createElement("h1");
    title.className = "title";
    title.textContent = data.header;
    copy.appendChild(title);
  }

  content.appendChild(copy);
  leftPane.append(leftMedia, content);

  const rightPane = document.createElement("div");
  rightPane.className = "hero-block__pane hero-block__pane--image";
  const rightImg = document.createElement("img");
  rightImg.src = data.images?.[0] || "";
  rightImg.alt = data.header || "hero image";
  rightPane.appendChild(rightImg);

  section.append(leftPane, rightPane);
  return section;
}

function renderFeatured(data, productMap) {
  const section = document.createElement("section");
  section.className = "featured";
  section.setAttribute("data-section", "featured-collection");

  const wrap = document.createElement("div");
  wrap.className = "wrap";

  const head = document.createElement("div");
  head.className = "featured__head";

  if (data.pre_header) {
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = data.pre_header;
    head.appendChild(eyebrow);
  }

  if (data.header) {
    const title = document.createElement("h2");
    title.className = "featured__headline";
    title.textContent = data.header;
    head.appendChild(title);
  }

  const carousel = document.createElement("div");
  carousel.className = "featured__carousel";

  const list = document.createElement("div");
  list.className = "featured__list";

  (data.product_ids || []).forEach((id) => {
    const product = productMap.get(id);
    if (!product) return;
    const card = renderProductCard(product);
    list.appendChild(card);
  });

  carousel.appendChild(list);
  wrap.append(head, carousel);

  if (data.cta_text && data.cta_href) {
    const ctaRow = document.createElement("div");
    ctaRow.className = "featured__cta-row";
    const cta = document.createElement("a");
    cta.className = "featured__cta";
    cta.href = data.cta_href;
    cta.textContent = data.cta_text;
    ctaRow.appendChild(cta);
    wrap.appendChild(ctaRow);
  }

  section.appendChild(wrap);
  return section;
}

function renderProductCard(product) {
  const card = document.createElement("a");
  card.className = "featured__card";
  card.href = productPageHref(product);

  const media = document.createElement("div");
  media.className = "featured__media";
  const img = document.createElement("img");
  img.src = product.media?.full?.[0] || "";
  img.alt = product.title_short || product.title_long || "Product";
  media.appendChild(img);

  const name = document.createElement("h3");
  name.className = "featured__name";
  name.textContent = product.title_short || product.title_long || "";

  const price = document.createElement("p");
  price.className = "featured__price";
  price.textContent = formatPrice(product.price);

  const view = document.createElement("span");
  view.className = "featured__view";
  view.textContent = "View Product";

  card.append(media, name, price, view);
  return card;
}

function renderBanner(data) {
  const section = document.createElement("section");
  section.className = "wide-banner";
  section.setAttribute("data-section", "banner-full");

  const media = document.createElement("div");
  media.className = "wide-banner__media";

  const picture = document.createElement("picture");
  if (data.media?.mobile) {
    const sourceMobile = document.createElement("source");
    sourceMobile.media = "(max-width: 768px)";
    sourceMobile.srcset = resolveAssetPath(data.media.mobile);
    picture.appendChild(sourceMobile);
  }

  const img = document.createElement("img");
  img.src = resolveAssetPath(data.media?.desktop || data.media?.mobile || "");
  img.alt = data.header || "Banner image";
  picture.appendChild(img);

  media.appendChild(picture);

  const content = document.createElement("div");
  content.className = "wide-banner__content";

  if (data.header) {
    const title = document.createElement("h2");
    title.className = "wide-banner__title";
    const marquee = document.createElement("div");
    marquee.className = "wide-banner__marquee";
    const text1 = document.createElement("span");
    text1.textContent = data.header;
    const text2 = document.createElement("span");
    text2.textContent = data.header;
    marquee.append(text1, text2);
    title.appendChild(marquee);
    content.appendChild(title);
  }

  if (data.cta_text && data.cta_href) {
    const cta = document.createElement("a");
    cta.className = "wide-banner__cta";
    cta.href = data.cta_href;
    cta.textContent = data.cta_text;
    content.appendChild(cta);
  }

  section.append(media, content);
  return section;
}

function productPageHref(product) {
  const handle = product?.handle || product?.id;
  if (handle) return `${getBasePath()}product.html#handle=${handle}`;
  return product?.url || "#";
}

function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return `$${amount.toFixed(2)}`;
}

function renderCategoryHero(target, category) {
  if (!target) return;
  target.hidden = false;
  target.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "category-hero__inner";

  const media = document.createElement("div");
  media.className = "category-hero__media";

  const video = document.createElement("video");
  video.className = "category-hero__video";
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.poster = resolveAssetPath(category.image || "assets/images/home-hero-full.jpg");
  const source = document.createElement("source");
  source.src = resolveAssetPath(category.video || "assets/videos/home-banner-bg.mp4");
  source.type = "video/mp4";
  video.appendChild(source);

  const mediaOverlay = document.createElement("div");
  mediaOverlay.className = "category-hero__overlay";

  const content = document.createElement("div");
  content.className = "category-hero__content";
  const eyebrow = document.createElement("p");
  eyebrow.className = "category-hero__eyebrow";
  eyebrow.textContent = category.pre_header || "Explore our";
  const title = document.createElement("h1");
  title.className = "category-hero__title";
  title.textContent = category.category || "Wellness Products";

  content.append(eyebrow, title);
  media.append(video, mediaOverlay);
  wrap.append(media, content);
  target.appendChild(wrap);
}

function renderCategoryProducts(target, products) {
  if (!target) return;
  target.innerHTML = "";

  const list = Array.isArray(products) ? products : [];
  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "category-grid__empty";
    empty.textContent = "No products found in this category.";
    target.appendChild(empty);
    return;
  }

  list.forEach((product) => {
    const card = renderCategoryProductCard(product);
    target.appendChild(card);
  });
}

function renderCategoryProductCard(product) {
  const card = document.createElement("a");
  card.className = "category-card";
  card.href = productPageHref(product);

  const media = document.createElement("div");
  media.className = "category-card__media";
  const img = document.createElement("img");
  img.src = product.media?.full?.[0] || "";
  img.alt = product.title_short || product.title_long || "Product";
  media.appendChild(img);

  const body = document.createElement("div");
  body.className = "category-card__body";
  const name = document.createElement("h3");
  name.className = "category-card__name";
  name.textContent = product.title_short || product.title_long || "Product";
  const meta = document.createElement("div");
  meta.className = "category-card__meta";
  const brand = document.createElement("p");
  brand.className = "category-card__brand";
  brand.textContent = product.brand || product.category || "";
  const price = document.createElement("p");
  price.className = "category-card__price";
  price.textContent = formatPrice(product.price);
  meta.append(brand, price);

  body.append(name, meta);
  card.append(media, body);
  return card;
}

function renderLifestyleCarousel(data, productMap) {
  const slides = Array.isArray(data.slides) ? data.slides : [];
  if (!slides.length) return null;

  const palette = ["#ff5a5f", "#009f4d", "#2d7cf6"];
  const section = document.createElement("section");
  section.className = "lifestyle-slider";
  section.setAttribute("data-section", "product-lifestyle-carousel");

  const slidesWrap = document.createElement("div");
  slidesWrap.className = "lifestyle-slider__slides";

  const dots = document.createElement("div");
  dots.className = "lifestyle-slider__dots";

  const slideNodes = slides.map((item, idx) => {
    const product = productMap.get(item.product_id) || {};
    const slide = document.createElement("div");
    slide.className = "lifestyle-slide";

    const productPane = document.createElement("div");
    productPane.className = "lifestyle-slide__product";
    productPane.style.backgroundColor = palette[idx % palette.length];

    const productImg = document.createElement("img");
    productImg.src = product.media?.full?.[0] || "";
    productImg.alt = product.title_short || product.title_long || "Product";

    const name = document.createElement("h3");
    name.className = "lifestyle-slide__name";
    name.textContent = product.title_short || product.title_long || "";

    const price = document.createElement("p");
    price.className = "lifestyle-slide__price";
    price.textContent = formatPrice(product.price);

    productPane.append(productImg, name, price);

    const lifePane = document.createElement("div");
    lifePane.className = "lifestyle-slide__image";

    const lifeImg = document.createElement("img");
    lifeImg.src = item.lifestyle_image || "";
    lifeImg.alt = item.headline || "Lifestyle";

    const headline = document.createElement("h3");
    headline.className = "lifestyle-slide__headline";
    headline.textContent = item.headline || "";

    lifePane.append(lifeImg, headline);
    slide.append(productPane, lifePane);

    const dot = document.createElement("button");
    dot.className = "lifestyle-slider__dot";
    dot.type = "button";
    dot.addEventListener("click", () => setActive(idx));
    dots.appendChild(dot);

    slidesWrap.appendChild(slide);
    return slide;
  });

  const nav = document.createElement("div");
  nav.className = "lifestyle-slider__nav";

  const prevBtn = navButton("prev", () => setActive(currentIndex - 1));
  const nextBtn = navButton("next", () => setActive(currentIndex + 1));

  nav.append(prevBtn, nextBtn);

  let currentIndex = 0;
  function setActive(target) {
    if (!slideNodes.length) return;
    currentIndex =
      (target + slideNodes.length) % slideNodes.length;
    slideNodes.forEach((node, i) => {
      node.classList.toggle("is-active", i === currentIndex);
      dots.children[i]?.classList.toggle("is-active", i === currentIndex);
    });
  }

  setActive(0);
  section.append(slidesWrap, nav, dots);
  return section;
}

function navButton(direction, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "lifestyle-slider__btn";
  btn.setAttribute("aria-label", direction === "next" ? "Next slide" : "Previous slide");
  btn.addEventListener("click", onClick);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#111");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("d", direction === "next" ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  svg.appendChild(path);
  btn.appendChild(svg);
  return btn;
}

function renderVideoReels(data, productMap) {
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) return null;

  const section = document.createElement("section");
  section.className = "video-reels";
  section.setAttribute("data-section", "video-reels");

  const header = document.createElement("div");
  header.className = "video-reels__header";

  if (data.title) {
    const title = document.createElement("h3");
    title.className = "video-reels__title";
    title.textContent = data.title;
    header.appendChild(title);
  }

  const viewport = document.createElement("div");
  viewport.className = "video-reels__viewport";

  const nav = document.createElement("div");
  nav.className = "video-reels__nav";

  const track = document.createElement("div");
  track.className = "video-reels__track";

  const dots = document.createElement("div");
  dots.className = "video-reels__dots";

  const slides = items.map((item, idx) => {
    const product = productMap.get(item.product_id) || {};
    const slide = document.createElement("div");
    slide.className = "video-reels__slide";

    const media = document.createElement("div");
    media.className = "video-reels__media";

    const video = document.createElement("video");
    video.poster = item.poster || "";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.src = item.video || "";

    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "video-reels__btn video-reels__btn--play";
    playBtn.setAttribute("aria-label", "Play or pause");
    playBtn.textContent = "||";
    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePlay(video, playBtn);
    });

    const muteBtn = document.createElement("button");
    muteBtn.type = "button";
    muteBtn.className = "video-reels__btn video-reels__btn--mute";
    muteBtn.setAttribute("aria-label", "Mute or unmute");
    muteBtn.textContent = "M";
    muteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      video.muted = !video.muted;
      muteBtn.textContent = video.muted ? "M" : "S";
    });

    media.append(video, playBtn, muteBtn);

    const card = document.createElement("div");
    card.className = "video-reels__card";

    const pImg = document.createElement("img");
    pImg.src = product.media?.full?.[0] || "";
    pImg.alt = product.title_short || product.title_long || "Product";

    const cardText = document.createElement("div");
    cardText.className = "video-reels__card-text";

    const pName = document.createElement("p");
    pName.className = "video-reels__card-name";
    pName.textContent = product.title_short || product.title_long || "";

    const pPrice = document.createElement("p");
    pPrice.className = "video-reels__card-price";
    pPrice.textContent = formatPrice(product.price);

    cardText.append(pName, pPrice);
    card.append(pImg, cardText);

    slide.append(media, card);

    slide.addEventListener("click", () => setActive(idx));

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "video-reels__dot";
    dot.addEventListener("click", () => setActive(idx));
    dots.appendChild(dot);

    track.appendChild(slide);
    return { slide, video, playBtn, muteBtn, dot };
  });

  function updateTrackPadding() {
    const first = slides[0]?.slide;
    if (!first) return;
    const slideWidth = first.offsetWidth;
    const pad = Math.max(0, (viewport.clientWidth - slideWidth) / 2);
    track.style.paddingLeft = `${pad}px`;
    track.style.paddingRight = `${pad}px`;
  }

  updateTrackPadding();
  window.addEventListener("resize", () => {
    updateTrackPadding();
    centerSlide(slides[current]?.slide);
  });

  viewport.append(nav, track);
  section.append(header, viewport, dots);

  const prev = document.createElement("button");
  prev.className = "video-reels__nav-btn";
  prev.setAttribute("aria-label", "Previous reel");
  prev.textContent = "<";
  prev.addEventListener("click", (e) => {
    e.stopPropagation();
    setActive(current - 1);
  });

  const next = document.createElement("button");
  next.className = "video-reels__nav-btn";
  next.setAttribute("aria-label", "Next reel");
  next.textContent = ">";
  next.addEventListener("click", (e) => {
    e.stopPropagation();
    setActive(current + 1);
  });

  nav.append(prev, next);

  let current = 0;

  function setActive(targetIndex) {
    if (!slides.length) return;
    current = (targetIndex + slides.length) % slides.length;
    slides.forEach(({ slide, video, playBtn, muteBtn, dot }, idx) => {
      const active = idx === current;
      slide.classList.toggle("is-active", active);
      dot.classList.toggle("is-active", active);
      if (active) {
        centerSlide(slide);
        video.muted = video.muted ?? true;
        video.play().catch(() => {});
        playBtn.textContent = "||";
        muteBtn.textContent = video.muted ? "M" : "S";
      } else {
        video.pause();
      }
    });
  }

  function togglePlay(video, control) {
    if (video.paused) {
      video.play().catch(() => {});
      control.textContent = "||";
    } else {
      video.pause();
      control.textContent = ">";
    }
  }

  function centerSlide(slide) {
    const targetOffset = slide.offsetLeft + slide.offsetWidth / 2 - viewport.clientWidth / 2;
    track.style.transform = `translateX(${-targetOffset}px)`;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        slides.forEach(({ video }) => video.pause());
      } else {
        setActive(current);
      }
    });
  }, { threshold: 0.25 });

  observer.observe(section);
  requestAnimationFrame(() => setActive(0));
  return section;
}

function renderEnduranceGrid(data, productMap) {
  const ids = Array.isArray(data.product_ids) ? data.product_ids : [];
  if (!ids.length) return null;

  const section = document.createElement("section");
  section.className = "endurance";
  section.setAttribute("data-section", "endurance-grid");

  const head = document.createElement("div");
  head.className = "endurance__head";

  if (data.title) {
    const title = document.createElement("h3");
    title.className = "endurance__title";
    title.textContent = data.title;
    head.appendChild(title);
  }

  const grid = document.createElement("div");
  grid.className = "endurance__layout";

  ids.forEach((id) => {
    const product = productMap.get(id);
    if (!product) return;
    grid.appendChild(buildEnduranceCard(product));
  });

  section.append(head, grid);
  return section;
}

function buildEnduranceCard(product) {
  const card = document.createElement("div");
  card.className = "endurance-card";

  const media = document.createElement("div");
  media.className = "endurance-card__media";

  const img = document.createElement("img");
  img.src = product.media?.full?.[0] || "";
  img.alt = product.title_short || product.title_long || "Product";
  media.appendChild(img);

  const name = document.createElement("h4");
  name.className = "endurance-card__name";
  name.textContent = product.title_short || product.title_long || "";

  const meta = document.createElement("p");
  meta.className = "endurance-card__meta";
  meta.textContent = `${product.brand || ""}`;

  const rating = document.createElement("div");
  rating.className = "endurance-card__rating";
  const stars = document.createElement("span");
  stars.textContent = "★★★★★";
  const reviewCount = document.createElement("span");
  reviewCount.textContent = `(${product.reviews || 0} reviews)`;
  rating.append(stars, reviewCount);

  const price = document.createElement("p");
  price.className = "endurance-card__price";
  price.textContent = formatPrice(product.price);

  const cta = document.createElement("a");
  cta.className = "endurance-card__cta";
  cta.href = productPageHref(product);
  cta.textContent = "View product";

  card.append(media, name, meta, rating, price, cta);
  return card;
}

function renderStatement(data) {
  const section = document.createElement("section");
  section.className = "statement";
  section.setAttribute("data-section", "brand-statement");

  if (data.title) {
    const title = document.createElement("h2");
    title.className = "statement__title";
    title.textContent = data.title;
    section.appendChild(title);
  }

  if (data.body) {
    const body = document.createElement("p");
    body.className = "statement__body";
    body.textContent = data.body;
    section.appendChild(body);
  }

  if (data.cta_text && data.cta_href) {
    const cta = document.createElement("a");
    cta.className = "statement__cta";
    cta.href = data.cta_href;
    cta.textContent = data.cta_text;
    section.appendChild(cta);
  }

  return section;
}

function renderBlogFeature(data) {
  const posts = Array.isArray(data.posts) ? data.posts : [];
  if (!posts.length) return null;

  const section = document.createElement("section");
  section.className = "blog";
  section.setAttribute("data-section", "blog-feature");

  const head = document.createElement("div");
  head.className = "blog__head";

  const title = document.createElement("h3");
  title.className = "blog__title";
  title.textContent = data.title || "Latest from the journal";
  head.appendChild(title);

  if (data.cta_text && data.cta_href) {
    const cta = document.createElement("a");
    cta.className = "blog__cta";
    cta.href = data.cta_href;
    cta.textContent = data.cta_text;
    head.appendChild(cta);
  }

  const grid = document.createElement("div");
  grid.className = "blog__grid";

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "blog-card";

    const media = document.createElement("div");
    media.className = "blog-card__media";
    const img = document.createElement("img");
    img.src = post.image || "";
    img.alt = post.title || "Blog image";
    media.appendChild(img);

    const meta = document.createElement("p");
    meta.className = "blog-card__meta";
    meta.textContent = post.date || "";

    const h4 = document.createElement("h4");
    h4.className = "blog-card__title";
    h4.textContent = post.title || "";

    const excerpt = document.createElement("p");
    excerpt.className = "blog-card__excerpt";
    excerpt.textContent = post.excerpt || "";

    const link = document.createElement("a");
    link.className = "blog-card__link";
    link.href = post.href || "#";
    link.textContent = "Read more";

    card.append(media, meta, h4, excerpt, link);
    grid.appendChild(card);
  });

  section.append(head, grid);
  return section;
}

function renderMissionVideo(data) {
  const section = document.createElement("section");
  section.className = "mission";
  section.setAttribute("data-section", "mission-video");

  const video = document.createElement("video");
  video.className = "mission__video";
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.src = data.video || "";

  const shade = document.createElement("div");
  shade.className = "mission__shade";

  const content = document.createElement("div");
  content.className = "mission__content";

  if (data.pre_header) {
    const eyebrow = document.createElement("p");
    eyebrow.className = "mission__eyebrow";
    eyebrow.textContent = data.pre_header;
    content.appendChild(eyebrow);
  }

  if (data.header) {
    const title = document.createElement("h2");
    title.className = "mission__title";
    title.textContent = data.header;
    content.appendChild(title);
  }

  if (data.cta_text && data.cta_href) {
    const cta = document.createElement("a");
    cta.className = "mission__cta";
    cta.href = data.cta_href;
    cta.textContent = data.cta_text;
    content.appendChild(cta);
  }

  section.append(video, shade, content);
  return section;
}

function renderNewArrivals(data, productMap) {
  const ids = Array.isArray(data.product_ids) ? data.product_ids : [];
  if (!ids.length) return null;

  const section = document.createElement("section");
  section.className = "arrivals";
  section.setAttribute("data-section", "new-arrivals");

  const head = document.createElement("div");
  head.className = "arrivals__head";
  const title = document.createElement("h3");
  title.className = "arrivals__title";
  title.textContent = data.title || "Top new arrivals";
  head.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "arrivals__grid";

  ids.forEach((id) => {
    const product = productMap.get(id);
    if (!product) return;
    grid.appendChild(buildArrivalCard(product));
  });

  section.append(head, grid);
  return section;
}

function buildArrivalCard(product) {
  const card = document.createElement("a");
  card.className = "arrivals-card";
  card.href = productPageHref(product);
  card.style.textDecoration = "none";
  card.style.color = "inherit";

  const media = document.createElement("div");
  media.className = "arrivals-card__media";
  const img = document.createElement("img");
  img.src = product.media?.full?.[0] || "";
  img.alt = product.title_short || product.title_long || "Product";
  media.appendChild(img);

  const body = document.createElement("div");
  body.className = "arrivals-card__body";

  const name = document.createElement("h4");
  name.className = "arrivals-card__name";
  name.textContent = product.title_short || product.title_long || "";

  const meta = document.createElement("p");
  meta.className = "arrivals-card__meta";
  meta.textContent = product.brand || "";

  const rating = document.createElement("div");
  rating.className = "arrivals-card__rating";
  const stars = document.createElement("span");
  stars.textContent = "★★★★★";
  const reviews = document.createElement("span");
  reviews.textContent = `(${product.reviews || 0} reviews)`;
  rating.append(stars, reviews);

  const price = document.createElement("p");
  price.className = "arrivals-card__price";
  price.textContent = formatPrice(product.price);

  const cta = document.createElement("a");
  cta.className = "arrivals-card__cta";
  cta.href = productPageHref(product);
  cta.textContent = "View product";

  body.append(name, meta, rating, price, cta);
  card.append(media, body);
  return card;
}

function renderReviews(data) {
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) return null;

  const section = document.createElement("section");
  section.className = "reviews";
  section.setAttribute("data-section", "reviews-slider");

  const inner = document.createElement("div");
  inner.className = "reviews__inner";

  const avatar = document.createElement("img");
  avatar.className = "reviews__avatar";

  const stars = document.createElement("div");
  stars.className = "reviews__stars";
  stars.textContent = "★★★★★";

  const quote = document.createElement("p");
  quote.className = "reviews__quote";

  const author = document.createElement("p");
  author.className = "reviews__author";

  const dots = document.createElement("div");
  dots.className = "reviews__dots";

  let current = 0;

  function setActive(idx) {
    current = (idx + items.length) % items.length;
    const item = items[current];
    avatar.src = item.image || "";
    avatar.alt = item.author || "Reviewer";
    quote.textContent = item.quote || "";
    author.textContent = item.author || "";
    dots.childNodes.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === current);
    });
  }

  items.forEach((item, idx) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "reviews__dot";
    dot.addEventListener("click", () => setActive(idx));
    dots.appendChild(dot);
  });

  inner.append(avatar, stars, quote, author, dots);
  section.appendChild(inner);
  setActive(0);
  return section;
}

/* Header + footer */
function renderChrome(productMap, categories) {
  renderHeader(productMap, categories);
  renderFooter(productMap);
}

function renderHeader(productMap, categories) {
  const target = document.getElementById("site-header");
  if (!target) return;

  const frag = document.createDocumentFragment();
  const base = getBasePath();

  const header = document.createElement("header");
  header.className = "site-header";

  const bar = document.createElement("div");
  bar.className = "header__bar";

  const brand = document.createElement("a");
  brand.className = "header__brand";
  brand.href = "/";
  const logo = document.createElement("img");
  logo.src = `${base}assets/svgs/logo-black.svg`;
  logo.alt = "Purvanti";
  brand.appendChild(logo);
  bar.appendChild(brand);

  const nav = document.createElement("nav");
  nav.className = "header__nav";

  const navItems = [
    { label: "Shop", href: "/collections/frontpage", dropdown: true, categories },
    { label: "About", href: "/pages/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/pages/contact" },
  ];

  navItems.forEach((item) => {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;
    if (item.dropdown) {
      link.dataset.dropdown = "true";
      const dropdown = buildNavDropdown(item.categories, productMap);
      if (dropdown) {
        const wrapper = document.createElement("div");
        wrapper.className = "header__nav-item";
        wrapper.dataset.dropdown = "true";
        wrapper.append(link, dropdown);
        nav.appendChild(wrapper);
        return;
      }
    }
    nav.appendChild(link);
  });

  const actions = document.createElement("div");
  actions.className = "header__actions";

  const searchBtn = iconButton("Search", `${base}assets/svgs/nav-search.svg`);
  const accountBtn = iconButton("Account", `${base}assets/svgs/nav-person.svg`);
  const cartBtn = iconButton("Cart", `${base}assets/svgs/nav-cart.svg`);
  actions.append(searchBtn, accountBtn, cartBtn);

  const menuToggle = document.createElement("button");
  menuToggle.className = "header__icon-btn header__menu-toggle";
  menuToggle.setAttribute("aria-label", "Toggle navigation");
  menuToggle.textContent = "☰";
  menuToggle.addEventListener("click", () => {
    nav.classList.toggle("is-open");
  });

  bar.append(nav, actions, menuToggle);
  header.appendChild(bar);

  frag.appendChild(header);
  target.replaceChildren(frag);
  rewriteCategoryAnchors();

  // Expose header height so dropdown can align to full width position
  requestAnimationFrame(() => {
    const h = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty("--header-height", `${h}px`);
  });
}

function iconButton(label, iconSrc) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "header__icon-btn";
  btn.setAttribute("aria-label", label);
  if (iconSrc) {
    const img = document.createElement("img");
    img.src = iconSrc;
    img.alt = "";
    btn.appendChild(img);
  } else {
    btn.textContent = label[0];
  }
  return btn;
}

function renderFooter(productMap) {
  const target = document.getElementById("site-footer");
  if (!target) return;

  const section = document.createElement("footer");
  section.className = "footer";
  const base = getBasePath();

  const inner = document.createElement("div");
  inner.className = "footer__inner";

  const brandBlock = document.createElement("div");
  const brandTitle = document.createElement("h4");
  brandTitle.className = "footer__brand";
  brandTitle.textContent = "Purvanti";
  const brandText = document.createElement("p");
  brandText.className = "footer__text";
  brandText.textContent =
    "Modern wellness essentials crafted for daily performance and recovery.";
  brandBlock.append(brandTitle, brandText);
  inner.appendChild(brandBlock);

  const footerProducts = uniqueProducts(productMap)
    .slice(0, 6)
    .map((p) => ({
      label: p.title_short || p.title_long || "",
      href: productPageHref(p),
    }));
  inner.appendChild(buildListBlock("Products", footerProducts));

  inner.appendChild(
    buildListBlock("Info", [
      { label: "FAQ", href: "/pages/faq" },
      { label: "About Us", href: "/pages/about" },
      { label: "Our Mission", href: "/pages/mission" },
      { label: "Contact", href: "/pages/contact" },
    ])
  );

  const aboutBlock = document.createElement("div");
  const aboutTitle = document.createElement("h5");
  aboutTitle.className = "footer__title";
  aboutTitle.textContent = "About Purvanti";
  const aboutText = document.createElement("p");
  aboutText.className = "footer__text";
  aboutText.textContent =
    "Natural, science-backed essentials for energy, recovery, and daily vitality. We craft clean supplements you can trust every single day.";
  aboutBlock.append(aboutTitle, aboutText);
  inner.appendChild(aboutBlock);

  const bottom = document.createElement("div");
  bottom.className = "footer__bottom";
  bottom.innerHTML = `<span>© ${new Date().getFullYear()} Purvanti</span><span>Fuel your body, sustain the planet.</span>`;
  const payments = document.createElement("div");
  payments.className = "footer__payments";
  [
    `${base}assets/svgs/payment-visa.svg`,
    `${base}assets/svgs/payment-mastercard.svg`,
    `${base}assets/svgs/payment-amex.svg`,
    `${base}assets/svgs/payment-apple.svg`,
    `${base}assets/svgs/payment-discover.svg`,
  ].forEach((src) => {
    const badge = document.createElement("div");
    badge.className = "footer__payment";
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Payment option";
    badge.appendChild(img);
    payments.appendChild(badge);
  });
  bottom.appendChild(payments);

  const brandMark = document.createElement("div");
  brandMark.className = "footer__brandmark";
  const logoWhite = document.createElement("img");
  logoWhite.src = `${base}assets/svgs/logo-bottom.svg`;
  logoWhite.alt = "Purvanti";
  brandMark.appendChild(logoWhite);

  section.append(inner, bottom, brandMark);
  target.replaceChildren(section);
}

function buildListBlock(title, links) {
  const block = document.createElement("div");
  const heading = document.createElement("h5");
  heading.className = "footer__title";
  heading.textContent = title;
  const list = document.createElement("ul");
  list.className = "footer__links";
  links.forEach((link) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.label;
    li.appendChild(a);
    list.appendChild(li);
  });
  block.append(heading, list);
  return block;
}

function buildNavDropdown(categories, productMap) {
  if (!Array.isArray(categories) || !categories.length) return null;
  const panel = document.createElement("div");
  panel.className = "nav-dropdown";

  const list = document.createElement("div");
  list.className = "nav-dropdown__list";

  categories.forEach((cat) => {
    const item = document.createElement("a");
    item.className = "nav-dropdown__item";
    item.href = cat.cta_href || "#";

    const img = document.createElement("img");
    img.src = resolveAssetPath(cat.image || "");
    img.alt = cat.category || "Category";

    const text = document.createElement("div");
    text.className = "nav-dropdown__text";
    const catLabel = document.createElement("p");
    catLabel.className = "nav-dropdown__category";
    catLabel.textContent = cat.category || "";
    text.append(catLabel);

    item.append(img, text);
    list.appendChild(item);
  });

  if (!list.children.length) return null;
  panel.appendChild(list);
  return panel;
}
