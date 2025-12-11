const PRODUCTS_DATA_PATH = "assets/data/products_all.json";
const CONTENT_DATA_PATH = typeof CONTENT_PATH !== "undefined" ? CONTENT_PATH : "assets/data/content.json";

let productList = [];
let productMapCache = new Map();
let productPageHydrated = false;
let contentCache = null;
let currentProduct = null;

document.addEventListener("DOMContentLoaded", () => {
  rewriteProductAnchors();

  window.addEventListener("purvanti:page-hydrated", (event) => {
    const list = event?.detail?.products;
    if (Array.isArray(list) && list.length) {
      productList = list;
      productMapCache = mapProducts(list);
      rewriteProductAnchors();
    }
  });

  if (document.body.dataset.page === "product") {
    hydrateProductPage();
  }
});

function rewriteProductAnchors() {
  document.querySelectorAll('a[href*="/products/"]').forEach((anchor) => {
    const handle = extractHandle(anchor.getAttribute("href"));
    if (!handle) return;
    anchor.setAttribute("href", buildProductHref(handle));
    anchor.dataset.productHandle = handle;
    const storeHandle = () => {
      sessionStorage.setItem("purvanti:lastHandle", handle);
    };
    anchor.addEventListener("click", storeHandle);
    anchor.addEventListener("auxclick", storeHandle);
    anchor.addEventListener("mousedown", storeHandle);
  });
}

function extractHandle(href) {
  const match = href && href.match(/products\/([^/?#]+)/i);
  return match ? match[1] : null;
}

async function hydrateProductPage() {
  if (productPageHydrated) return;
  productPageHydrated = true;

  const hero = document.getElementById("product-hero");
  const sectionsTarget = document.getElementById("product-sections");
  const loading = document.getElementById("loading-note");

  try {
    await Promise.all([ensureProducts(), ensureContent()]);
    const product = resolveProduct();
    if (!product) throw new Error("Product not found");
    currentProduct = product;

    updatePrettyPath(product);
    const categories = contentCache?.categories || [];
    renderChrome(productMapCache, categories);
    renderProductHero(hero, product);
    renderProductSections(sectionsTarget);
  } catch (error) {
    console.error(error);
    if (hero) {
      hero.hidden = false;
      hero.textContent = "We couldn't load that product.";
    }
  } finally {
    loading?.remove();
  }
}

async function ensureProducts() {
  if (productList.length && productMapCache.size) return;
  const data = await fetchJSON(PRODUCTS_DATA_PATH);
  productList = data?.products || [];
  productMapCache = mapProducts(productList);
}

async function ensureContent() {
  if (contentCache) return contentCache;
  contentCache = await fetchJSON(CONTENT_DATA_PATH);
  return contentCache;
}

function resolveProduct() {
  const handle = getHandleFromLocation();
  if (handle) {
    const key = decodeURIComponent(handle);
    const keyLower = key.toLowerCase();
    const found =
      productMapCache.get(key) ||
      productMapCache.get(keyLower) ||
      productList.find(
        (p) =>
          p.id === key ||
          (p.id || "").toLowerCase() === keyLower ||
          (p.handle || "").toLowerCase() === keyLower
      );
    console.log("[product-page] lookup candidate:", {
      key,
      keyLower,
      foundHandle: found?.handle,
      foundId: found?.id,
    });
    if (found) return found;
  }
  return productList[0];
}

function setImageWithFade(img, src, alt) {
  if (!img) return;
  img.classList.add("image-fade");
  if (typeof alt === "string") img.alt = alt;
  img.classList.remove("is-loaded");
  const markLoaded = () => {
    img.classList.add("is-loaded");
    img.removeEventListener("load", markLoaded);
    img.removeEventListener("error", markLoaded);
  };
  img.addEventListener("load", markLoaded);
  img.addEventListener("error", markLoaded);
  img.src = src || "";
  if (img.complete && img.naturalWidth) {
    requestAnimationFrame(markLoaded);
  }
}

function getHandleFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const fromParam = params.get("handle");
  if (fromParam) return fromParam;

  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const fromHash = hashParams.get("handle");
    if (fromHash) return fromHash;
  }

  const match = window.location.pathname.match(/\/products\/([^/?#]+)/i);
  if (match) return match[1];

  const ref = document.referrer || "";
  if (ref) {
    const refHandle = extractHandle(ref) || new URLSearchParams(ref.split("?")[1] || "").get("handle");
    if (refHandle) {
      return refHandle;
    }
  }

  const stored = sessionStorage.getItem("purvanti:lastHandle");
  if (stored) return stored;

  return null;
}

function updatePrettyPath(product) {
  const handle = product?.handle || product?.id;
  if (!handle) return;

  const base = getBasePath().replace(/\/$/, "");
  const prettyPath = `${base}/products/${handle}`;
  const hash = window.location.hash || "";
  const hashValue = hash.replace(/^#/, "");
  const onlyHandleHash = hashValue && hashValue === `handle=${handle}`;
  const target = onlyHandleHash ? prettyPath : `${prettyPath}${hash}`;

  if (window.location.pathname !== prettyPath) {
    window.history.replaceState({}, "", target);
  }
}

function renderProductHero(hero, product) {
  if (!hero) return;

  const mainImg = hero.querySelector("[data-product-main]");
  const thumbWrap = hero.querySelector("[data-product-thumbs]");
  const title = hero.querySelector("[data-product-title]");
  const pill = hero.querySelector("[data-product-pill]");
  const summary = hero.querySelector("[data-product-summary]");
  const price = hero.querySelector("[data-product-price]");
  const crumb = hero.querySelector("[data-product-crumb]");
  const detailsWrap = hero.querySelector("[data-product-details]");
  const detailsToggle = hero.querySelector("[data-details-toggle]");
  const cartBtn = hero.querySelector("[data-product-cart]");
  const crumbHome = hero.querySelector("[data-crumb-home]");
  const crumbCollection = hero.querySelector("[data-crumb-collection]");
  const qtyInput = hero.querySelector("[data-qty-input]");
  const qtyMinus = hero.querySelector("[data-qty-minus]");
  const qtyPlus = hero.querySelector("[data-qty-plus]");

  const nameText =
    product.title_long || product.title_short || product.title || "Product";
  if (title) title.textContent = product.title_short || nameText;
  document.title = `${nameText} | Purvanti`;

  if (crumb) crumb.textContent = product.title_long || nameText;

  if (pill) {
    const brand = product.brand || product.category || "";
    pill.textContent = brand || "";
    pill.style.display = brand ? "" : "none";
  }

  if (summary) summary.textContent = summarize(product.summary || product.description);

  if (price) price.textContent = formatPrice(product.price);

  const ratingWrap = hero.querySelector("[data-product-rating]");
  if (ratingWrap) {
    const ratingValue = product.rating || 5;
    const reviews = product.reviews || product.reviews_count || 0;
    const stars = "★★★★★".slice(0, Math.max(0, Math.min(5, Math.round(ratingValue))));
    ratingWrap.innerHTML = `<span class="stars">${stars}</span><span class="count">(${reviews} reviews)</span>`;
  }

  const base = getBasePath();
  if (crumbHome) crumbHome.href = `${base}`;
  if (crumbCollection) crumbCollection.href = `${base}collections/frontpage`;

  let clampQty = () => 1;
  if (qtyInput) {
    qtyInput.value = "1";
    clampQty = () => {
      const val = Math.max(1, Number(qtyInput.value) || 1);
      qtyInput.value = String(val);
      return val;
    };
    qtyMinus?.addEventListener("click", () => {
      qtyInput.value = String(Math.max(1, (Number(qtyInput.value) || 1) - 1));
    });
    qtyPlus?.addEventListener("click", () => {
      qtyInput.value = String((Number(qtyInput.value) || 1) + 1);
    });
    qtyInput.addEventListener("change", clampQty);
  }

  if (detailsWrap && detailsToggle) {
    const list = document.createElement("ul");
    (product.bullets || []).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    detailsWrap.innerHTML = "";
    detailsWrap.appendChild(list);
    const toggleOpen = () => {
      const isHidden = detailsWrap.hasAttribute("hidden");
      if (isHidden) {
        detailsWrap.removeAttribute("hidden");
        detailsToggle.classList.add("is-open");
      } else {
        detailsWrap.setAttribute("hidden", "true");
        detailsToggle.classList.remove("is-open");
      }
    };
    detailsToggle.addEventListener("click", toggleOpen);
  }

  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      const qty = clampQty();
      if (typeof addToCart === "function") {
        addToCart(product, qty);
        openCartDrawer?.();
      }
      cartBtn.classList.add("is-active");
      cartBtn.textContent = "Added to bag";
      setTimeout(() => {
        cartBtn.classList.remove("is-active");
        cartBtn.textContent = "ADD TO CART";
      }, 1200);
    });
  }

  const media = productMediaLocal(product);
  const fullImages = media.full;
  const smallImages = media.mobile;
  const mainImages = fullImages.length ? fullImages : smallImages;
  const thumbImages = smallImages.length ? smallImages : mainImages;
  setupGallery(thumbImages, mainImg, thumbWrap, nameText, mainImages);

  hero.hidden = false;
}

function renderProductSections(target) {
  if (!target || !contentCache) return;
  const blocks = Array.isArray(contentCache.product) ? contentCache.product : [];
  target.innerHTML = "";
  blocks.forEach((block) => {
    if (block.section === "banner_full") {
      const node = renderBanner(block);
      if (node) target.appendChild(node);
    }
    if (block.section === "faqs") {
      const node = renderProductFaq(block);
      if (node) target.appendChild(node);
    }
    if (block.section === "lifestyle_50_50") {
      const node = renderProduct5050(block);
      if (node) target.appendChild(node);
    }
    if (block.section === "product_reviews") {
      const node = renderProductReviews(block);
      if (node) target.appendChild(node);
    }
  });
}

function renderProductFaq(block) {
  const items = Array.isArray(block.items) ? block.items : [];
  if (!items.length) return null;

  const section = document.createElement("section");
  section.className = "product-faq";
  section.setAttribute("data-section", "faqs");

  const wrap = document.createElement("div");
  wrap.className = "product-faq__wrap";

  if (block.pre_header) {
    const eyebrow = document.createElement("p");
    eyebrow.className = "product-faq__eyebrow";
    eyebrow.textContent = block.pre_header;
    wrap.appendChild(eyebrow);
  }

  if (block.title) {
    const title = document.createElement("h3");
    title.className = "product-faq__title";
    title.textContent = block.title;
    wrap.appendChild(title);
  }

  const list = document.createElement("div");
  list.className = "product-faq__list";

  items.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "product-faq__item";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "product-faq__question";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", `faq-answer-${idx}`);
    btn.textContent = item.question || "Question";

    const icon = document.createElement("span");
    icon.className = "product-faq__icon";
    icon.textContent = "+";
    btn.appendChild(icon);

    const answer = document.createElement("div");
    answer.className = "product-faq__answer";
    answer.id = `faq-answer-${idx}`;
    answer.hidden = true;
    answer.textContent = item.answer || "";

    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      btn.classList.toggle("is-open", !expanded);
      answer.hidden = expanded;
    });

    row.append(btn, answer);
    list.appendChild(row);
  });

  wrap.appendChild(list);
  section.appendChild(wrap);
  return section;
}

function resolveAsset(path) {
  if (typeof resolveAssetPath === "function") return resolveAssetPath(path);
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
  return `${getBasePath()}${path}`;
}

function buildProductHref(handle) {
  return `${getBasePath()}product.html#handle=${handle}`;
}

function renderProduct5050(block) {
  const cards = Array.isArray(block.cards) ? block.cards.slice(0, 2) : [];
  if (!cards.length) return null;

  const section = document.createElement("section");
  section.className = "product-5050";
  section.setAttribute("data-section", "lifestyle-50-50");

  const grid = document.createElement("div");
  grid.className = "product-5050__grid";

  cards.forEach((card) => {
    const panel = document.createElement("a");
    panel.className = "product-5050__panel";
    panel.href = card.cta_href || "#";
    panel.style.backgroundImage = `url(${resolveAsset(card.image)})`;

    const textWrap = document.createElement("div");
    textWrap.className = "product-5050__text";

    const title = document.createElement("h3");
    title.textContent = card.title || "";

    const cta = document.createElement("span");
    cta.className = "product-5050__cta";
    cta.textContent = card.cta_text || "";

    textWrap.append(title, cta);
    panel.appendChild(textWrap);
    grid.appendChild(panel);
  });

  section.appendChild(grid);
  return section;
}

function renderProductReviews(block) {
  const reviews = currentProduct?.reviews_data || [];
  if (!reviews.length) return null;

  const section = document.createElement("section");
  section.className = "product-reviews";
  section.setAttribute("data-section", "product-reviews");

  const wrap = document.createElement("div");
  wrap.className = "product-reviews__wrap";

  if (block.pre_header || block.headline) {
    const header = document.createElement("div");
    header.className = "product-reviews__head";
    if (block.pre_header) {
      const eyebrow = document.createElement("p");
      eyebrow.className = "product-reviews__eyebrow";
      eyebrow.textContent = block.pre_header;
      header.appendChild(eyebrow);
    }
    if (block.headline) {
      const title = document.createElement("h3");
      title.className = "product-reviews__title";
      title.textContent = block.headline;
      header.appendChild(title);
    }
    wrap.appendChild(header);
  }

  const row = document.createElement("div");
  row.className = "product-reviews__row";

  const media = document.createElement("div");
  media.className = "product-reviews__media";
  const img = document.createElement("img");
  img.src = resolveAsset(block.lifestyle_image);
  img.alt = block.headline || "Customer story";
  media.appendChild(img);

  const callout = document.createElement("div");
  callout.className = "product-reviews__callout";

  const stars = document.createElement("div");
  stars.className = "product-reviews__stars";
  stars.textContent = "★★★★★";

  const quote = document.createElement("p");
  quote.className = "product-reviews__quote";

  const author = document.createElement("p");
  author.className = "product-reviews__author";

  const dots = document.createElement("div");
  dots.className = "product-reviews__dots";

  callout.append(stars, quote, author, dots);

  row.append(media, callout);
  wrap.appendChild(row);
  section.appendChild(wrap);

  let current = 0;

  const setActive = (idx) => {
    current = (idx + reviews.length) % reviews.length;
    const review = reviews[current];
    quote.textContent = `"${review.text || ""}"`;
    author.textContent = `- ${review.name || "Customer"}`;
    dots.querySelectorAll("button").forEach((btn, i) => {
      btn.classList.toggle("is-active", i === current);
    });
  };

  reviews.forEach((_, idx) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "product-reviews__dot";
    dot.addEventListener("click", () => setActive(idx));
    dots.appendChild(dot);
  });

  setActive(0);

  return section;
}

function summarize(text) {
  if (!text) return "";
  const clean = text.trim();
  const first = clean.split("\n\n")[0] || clean.split("\n")[0];
  return first.trim();
}

function setupGallery(images, mainImg, thumbWrap, altText, mainImages = []) {
  const galleryImages = images.length ? images : [mainImg?.src || ""];
  const mainSet = mainImages.length ? mainImages : galleryImages;
  if (mainImg) {
    setImageWithFade(mainImg, mainSet[0] || galleryImages[0] || "", altText || "Product");
  }

  if (!thumbWrap) return;
  thumbWrap.innerHTML = "";

  galleryImages.slice(0, 4).forEach((src, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "product-hero__thumb";
    const img = document.createElement("img");
    setImageWithFade(img, src, `${altText} view ${idx + 1}`);
    btn.appendChild(img);

    btn.addEventListener("click", () => {
      if (mainImg) {
        setImageWithFade(mainImg, mainSet[idx] || src, altText);
      }
      thumbWrap
        .querySelectorAll(".product-hero__thumb")
        .forEach((node) => node.classList.remove("is-active"));
      btn.classList.add("is-active");
    });

    if (idx === 0) btn.classList.add("is-active");
    thumbWrap.appendChild(btn);
  });
}

function productMediaLocal(product) {
  const pid = product?.id || product?.handle;
  const existing = product?.media || {};
  const fullRaw =
    (existing.full && existing.full.length && existing.full) ||
    (pid
      ? [
          `assets/images/products/full/${pid}-primary.png`,
          `assets/images/products/full/${pid}-secondary.png`,
        ]
      : []);
  const mobileRaw =
    (existing.mobile && existing.mobile.length && existing.mobile) ||
    (pid
      ? [
          `assets/images/products/small/${pid}-primary.png`,
          `assets/images/products/small/${pid}-secondary.png`,
        ]
      : []);
  return {
    full: fullRaw.map(resolveAssetPathLocal),
    mobile: mobileRaw.map(resolveAssetPathLocal),
  };
}

function resolveAssetPathLocal(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
  const pathname = window.location.pathname || "/";
  if (pathname.includes("/products/")) {
    return `${pathname.split("/products/")[0]}/${path}`;
  }
  if (pathname.includes("product.html")) {
    return pathname.replace(/product\.html.*/i, path);
  }
  const lastSlash = pathname.lastIndexOf("/");
  const base = lastSlash === -1 ? "/" : pathname.slice(0, lastSlash + 1);
  return `${base}${path}`;
}
