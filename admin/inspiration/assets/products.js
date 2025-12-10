// Lightweight data loader and DOM binder for products_all.json and content.json across index and product pages.
(function () {
  // Relative paths so they work on GitHub Pages subpaths
  const DATA_URL = "assets/data/products_all.json";
  const CONTENT_URL = "assets/data/content.json";
  const LEGACY_SLOT_MAP_DEFAULT = {
    "womens-multi-capsules": "pr160265",
    "mens-multi-capsules": "pr680073",
    "boost-energy-capsules": "pr290626",
    "stress-relief-capsules": "pr377534",
    "hair-skin-nails-capsules": "pr188026",
    "immunity-boost-capsules": "pr253894",
    "collagen-capsules": "pr136188",
  };

  let cache;
  let contentCache;

  const getHomeSection = (content, key) =>
    (content?.home || []).find((section) => section.section === key);

  const fmtPrice = (value) => `$${Number(value || 0).toFixed(2)}`;

  const summarize = (text) => {
    if (!text) return "";
    const clean = text.trim();
    const firstPara = clean.split("\n\n")[0] || clean.split("\n")[0];
    return firstPara.trim();
  };

  const normalizeProduct = (raw) => {
    const title = raw.title || raw.title_long || raw.title_short || raw.handle || raw.id;
    return {
      ...raw,
      title,
      title_long: raw.title_long || raw.title_short || title,
      title_short: raw.title_short || raw.title_long || title,
      summary: raw.summary || summarize(raw.description),
      benefits: raw.benefits || raw.bullets || [],
      rating: raw.rating || 5,
      reviews_count: raw.reviews_count || raw.reviews || 0,
    };
  };

  const getHandleFromHref = (href) => {
    const match = href && href.match(/products\/([^/?#]+)/i);
    return match ? match[1] : null;
  };

  const getHandleFromPath = () => {
    const match = window.location.pathname.match(/\/products\/([^/?#]+)/i);
    return match ? match[1] : null;
  };

  const loadProducts = async () => {
    if (cache) return cache;
    const res = await fetch(DATA_URL);
    const data = await res.json();
    const list = (data.products || []).map(normalizeProduct);
    const map = {};
    list.forEach((p) => {
      if (p.id) map[p.id] = p;
      if (p.handle) map[p.handle] = p;
    });
    cache = { list, map };
    return cache;
  };

  const loadContent = async () => {
    if (contentCache) return contentCache;
    try {
      const res = await fetch(CONTENT_URL);
      contentCache = await res.json();
    } catch (err) {
      console.warn("Content JSON not found", err);
      contentCache = {};
    }
    return contentCache;
  };

  const applyAliases = (products, aliases) => {
    if (!aliases) return;
    Object.entries(aliases).forEach(([legacy, target]) => {
      const product =
        products.map[target] ||
        products.list.find((p) => p.id === target || p.handle === target);
      if (product) {
        products.map[legacy] = product;
      }
    });
  };

  const localizeProductLinks = () => {
    document.querySelectorAll('a[href*="products/"]').forEach((anchor) => {
      const handle = getHandleFromHref(anchor.getAttribute("href"));
      if (!handle) return;
      anchor.setAttribute("href", `product.html?handle=${handle}`);
    });
  };

  const interceptProductClicks = () => {
    document.addEventListener("click", (event) => {
      const anchor = event.target.closest && event.target.closest('a[href*="products/"]');
      if (!anchor) return;
      const handle = getHandleFromHref(anchor.getAttribute("href"));
      if (!handle) return;
      event.preventDefault();
      window.location.href = `product.html?handle=${handle}`;
    });
  };

  const rewriteHomeProducts = (products) => {
    localizeProductLinks();
    const anchors = document.querySelectorAll('a[href*="products/"]');
    anchors.forEach((anchor) => {
      const handle = getHandleFromHref(anchor.getAttribute("href"));
      if (!handle) return;
      const product = products.map[handle] || products.map[`${handle}`];
      if (product && (product.handle || product.id)) {
        anchor.setAttribute("href", `product.html?handle=${product.handle || product.id}`);
      } else {
        anchor.setAttribute("href", `product.html?handle=${handle}`);
      }
      if (!product) return;

      // Update title text nearby
      const titleEl =
        anchor.querySelector(".wt-products-slider__product__title") ||
        anchor.querySelector(".card__title, h3") ||
        anchor.closest("div")?.querySelector(".wt-dot__title");
      if (titleEl) titleEl.textContent = product.title_short || product.title;

      // Update price fields
      const priceEls = (anchor.closest(".price") || anchor.parentElement)?.querySelectorAll(
        ".price-item"
      );
      if (priceEls && priceEls.length) {
        priceEls.forEach((el) => (el.textContent = fmtPrice(product.price)));
      }

      // Update images (force same src for hover/secondary to avoid mismatched art)
      const imgs = anchor.querySelectorAll("img");
      if (imgs.length) {
        const primarySrc =
          product.media?.full?.[0] ||
          product.media?.mobile?.[0] ||
          product.media?.full?.[1] ||
          product.media?.mobile?.[1];
        imgs.forEach((img) => {
          const src = primarySrc;
          if (src) {
            img.src = src;
            img.removeAttribute("srcset");
            img.alt = product.title;
          }
        });
      }
    });
  };

  const buildList = (items) => {
    const ul = document.createElement("ul");
    items.forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      ul.appendChild(li);
    });
    return ul;
  };

  const patchProductPage = (products) => {
    const params = new URLSearchParams(window.location.search);
    const hintedHandle =
      params.get("handle") ||
      getHandleFromPath() ||
      document.querySelector("[data-product-handle]")?.getAttribute("data-product-handle");
    const handle = hintedHandle || products.list[0]?.id;
    const product = products.map[handle] || products.list[0];
    if (!product) return;

    // Show pretty URL without breaking static hosting (product.html still served)
    const prettyPath = `/products/${product.handle || handle}`;
    if (window.location.pathname !== prettyPath) {
      window.history.replaceState(null, "", `${prettyPath}${window.location.search}${window.location.hash}`);
    }

    document.title = product.title;

    const nameEl = document.querySelector(".wt-product__name");
    if (nameEl) nameEl.textContent = product.title;

    const brandEl = document.querySelector(".wt-product__brand__name");
    if (brandEl) {
      const dietary = product.labels?.dietary?.[0];
      brandEl.textContent = dietary || product.brand || product.category || "";
    }

    const crumbEl = document.querySelector(".breadcrumbs__list .breadcrumbs__item:last-child");
    if (crumbEl) crumbEl.textContent = product.title;

    const featureList = document.querySelector(".wt-product__feature-tags ul");
    if (featureList) {
      featureList.innerHTML = "";
      const tags = product.labels?.feature_tags || (product.category ? [product.category] : []);
      tags.forEach((tag) => {
        const li = document.createElement("li");
        li.className = "f-button__list__item";
        const label = document.createElement("label");
        label.className = "f-button__list__link";
        label.textContent = tag;
        li.appendChild(label);
        featureList.appendChild(li);
      });
    }

    const summaryEl = document.querySelector(".wt-product__text-block");
    if (summaryEl) {
      summaryEl.textContent = product.summary || "";
    }

    const priceEls = document.querySelectorAll(".price-item");
    priceEls.forEach((el) => (el.textContent = fmtPrice(product.price)));

    // Benefits list
    document.querySelectorAll(".wt-collapse").forEach((collapse) => {
      const title = collapse.querySelector(".wt-collapse__trigger__title")?.textContent?.trim();
      if (title?.toUpperCase().includes("BENEFITS")) {
        const target = collapse.querySelector(".wt-collapse__target__content");
        if (target) {
          target.innerHTML = "";
          target.appendChild(buildList(product.benefits || []));
        }
      }
      if (title?.toUpperCase().includes("HOW TO TAKE") || title?.toUpperCase().includes("INGREDIENT")) {
        collapse.remove();
      }
    });

    // Gallery images
    const galleryImgs = document.querySelectorAll(".wt-product__gallery img.wt-product__img");
    const mediaFull = product.media?.full || [];
    galleryImgs.forEach((img, idx) => {
      const src = mediaFull[idx] || mediaFull[0];
      if (src) {
        img.src = src;
        img.alt = product.title;
        img.removeAttribute("srcset");
      }
    });

    const thumbImgs = document.querySelectorAll(".thumbs-list img");
    const mediaMobile = product.media?.mobile?.length ? product.media.mobile : mediaFull;
    thumbImgs.forEach((img, idx) => {
      const src = mediaMobile[idx] || mediaMobile[0] || mediaFull[0];
      if (src) {
        img.src = src;
        img.alt = product.title;
      }
    });
  };

  const renderFeaturedCollection = (products, content) => {
    const wrapper = document.querySelector("[data-featured-collection]");
    if (!wrapper) return;

    const featured = getHomeSection(content, "featured_collection");
    if (!featured || !featured.product_ids?.length || !featured.header) {
      wrapper.closest("section")?.remove();
      return;
    }

    const items = featured.product_ids.map((id) => products.map[id]);
    if (!items.length || items.some((item) => !item)) {
      wrapper.closest("section")?.remove();
      return;
    }

    const preHeaderEl = wrapper.querySelector("[data-featured-preheader]");
    if (preHeaderEl) {
      preHeaderEl.textContent = featured.pre_header || "";
      preHeaderEl.style.display = featured.pre_header ? "" : "none";
    }

    const headerEl = wrapper.querySelector("[data-featured-header]");
    if (headerEl) headerEl.textContent = featured.header || "";

    const ctaEl = wrapper.querySelector("[data-featured-cta]");
    if (ctaEl) {
      if (featured.cta_href && featured.cta_text) {
        ctaEl.href = featured.cta_href;
        ctaEl.textContent = featured.cta_text;
        ctaEl.style.display = "";
      } else {
        ctaEl.style.display = "none";
      }
    }

    const track = wrapper.querySelector("[data-featured-track]");
    if (!track) return;
    track.innerHTML = "";

    let missingMedia = false;
    items.forEach((product) => {
      const primaryImage = product?.media?.full?.[0] || product?.media?.mobile?.[0];
      if (!product || !primaryImage) {
        missingMedia = true;
        return;
      }

      const card = document.createElement("a");
      card.className = "featured-collection__card";
      card.href = `product.html?handle=${product.handle || product.id}`;
      card.setAttribute("data-product-id", product.id || product.handle || "");

      const media = document.createElement("div");
      media.className = "featured-collection__media";
      const img = document.createElement("img");
      img.src = primaryImage;
      img.alt = product.title;
      media.appendChild(img);

      const name = document.createElement("p");
      name.className = "featured-collection__name";
      name.textContent = product.title_short || product.title;

      const price = document.createElement("p");
      price.className = "featured-collection__price";
      price.textContent = fmtPrice(product.price);

      const link = document.createElement("span");
      link.className = "featured-collection__link";
      link.textContent = "View product";

      card.append(media, name, price, link);
      track.appendChild(card);
    });

    if (!track.children.length || missingMedia) {
      wrapper.closest("section")?.remove();
    }
  };

  const renderNewArrivals = (products, content) => {
    const section = document.getElementById("new-arrivals");
    if (!section) return;
    const track = section.querySelector("[data-new-arrivals-track]");
    const btnPrev = section.querySelector("[data-new-arrivals-prev]");
    const btnNext = section.querySelector("[data-new-arrivals-next]");
    if (!track) return;

    const configuredIds =
      content?.home?.find((s) => s.section === "new_arrivals")?.product_ids || [];
    const arrivals = configuredIds.length
      ? configuredIds.map((id) => products.map[id]).filter(Boolean)
      : products.list.filter((p) => (p.collections || []).includes("new-arrivals"));
    if (!arrivals.length) {
      section.style.display = "none";
      return;
    }

    track.innerHTML = "";
    arrivals.forEach((product) => {
      const card = document.createElement("div");
      card.className = "new-arrivals__card";

      const link = document.createElement("a");
      link.href = `product.html?handle=${product.handle || product.id}`;
      link.style.textDecoration = "none";
      link.style.color = "inherit";

      const media = document.createElement("div");
      media.className = "new-arrivals__media";
      const img = document.createElement("img");
      img.src = product.media?.full?.[0] || product.media?.mobile?.[0] || "";
      img.alt = product.title;
      media.appendChild(img);

      const body = document.createElement("div");
      body.className = "new-arrivals__body";

      const title = document.createElement("div");
      title.className = "new-arrivals__title-text";
      title.textContent = product.title;

      const meta = document.createElement("div");
      meta.className = "new-arrivals__meta";
      meta.textContent = product.summary || product.description || "";

      const rating = document.createElement("div");
      rating.className = "new-arrivals__rating";
      const stars = document.createElement("span");
      stars.className = "new-arrivals__stars";
      const ratingValue = product.rating || 5;
      stars.textContent = "★★★★★".slice(0, Math.round(ratingValue));
      const reviews = document.createElement("span");
      reviews.textContent = `(${product.reviews_count || 5} reviews)`;
      rating.append(stars, reviews);

      const price = document.createElement("div");
      price.className = "new-arrivals__price";
      price.textContent = fmtPrice(product.price);

      const cta = document.createElement("button");
      cta.className = "new-arrivals__cta";
      cta.type = "button";
      cta.textContent = "Add to Cart";
      cta.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = `product.html?handle=${product.handle || product.id}`;
      });

      body.append(title, meta, rating, price, cta);
      link.append(media, body);
      card.appendChild(link);
      track.appendChild(card);
    });

    const scrollAmount = () => {
      const card = track.querySelector(".new-arrivals__card");
      return card ? card.getBoundingClientRect().width + 16 : 300;
    };
    btnPrev?.addEventListener("click", () => {
      track.scrollLeft -= scrollAmount();
    });
    btnNext?.addEventListener("click", () => {
      track.scrollLeft += scrollAmount();
    });
  };

  const renderEnduranceGrid = (products, content) => {
    const grid = document.querySelector("[data-endurance-grid]");
    if (!grid) return;
    const configuredIds =
      content?.home?.find((s) => s.section === "endurance_grid")?.product_ids || [];
    const items = configuredIds.length
      ? configuredIds.map((id) => products.map[id]).filter(Boolean)
      : products.list.filter((p) => (p.collections || []).includes("endurance"));
    if (!items.length) {
      grid.closest(".endurance-grid").style.display = "none";
      return;
    }
    grid.innerHTML = "";
    items.forEach((product, idx) => {
      const card = document.createElement("div");
      card.className = "endurance-card" + (idx % 2 === 1 ? " accent" : "");
      const link = document.createElement("a");
      link.href = `product.html?handle=${product.handle || product.id}`;
      link.style.textDecoration = "none";
      link.style.color = "inherit";

      const media = document.createElement("div");
      media.className = "endurance-card__media";
      const img = document.createElement("img");
      img.src = product.media?.full?.[0] || product.media?.mobile?.[0] || "";
      img.alt = product.title;
      media.appendChild(img);

      const body = document.createElement("div");
      body.className = "endurance-card__body";

      const title = document.createElement("div");
      title.className = "endurance-card__title";
      title.textContent = product.title;

      const meta = document.createElement("div");
      meta.className = "endurance-card__meta";
      meta.textContent = product.summary || product.description || "";

      const rating = document.createElement("div");
      rating.className = "endurance-card__rating";
      const stars = document.createElement("span");
      stars.className = "endurance-card__stars";
      const ratingValue = product.rating || 5;
      stars.textContent = "★★★★★".slice(0, Math.round(ratingValue));
      const reviews = document.createElement("span");
      reviews.textContent = `(${product.reviews_count || 5} reviews)`;
      rating.append(stars, reviews);

      const price = document.createElement("div");
      price.className = "endurance-card__price";
      price.textContent = fmtPrice(product.price);

      const cta = document.createElement("button");
      cta.className = "endurance-card__cta";
      cta.type = "button";
      cta.textContent = "Add to Cart";
      cta.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = `product.html?handle=${product.handle || product.id}`;
      });

      body.append(title, meta, rating, price, cta);
      link.append(media, body);
      card.append(link);
      grid.append(card);
    });
  };

  const init = async () => {
    try {
      localizeProductLinks();
      interceptProductClicks();
      const [content, products] = await Promise.all([loadContent(), loadProducts()]);
      applyAliases(products, content?.product_slots || LEGACY_SLOT_MAP_DEFAULT);
      if (document.body.classList.contains("template-index")) {
        renderFeaturedCollection(products, content);
        rewriteHomeProducts(products);
        renderNewArrivals(products, content);
        renderEnduranceGrid(products, content);
      }
      if (document.body.classList.contains("template-product-womens") || document.body.classList.contains("template-product")) {
        patchProductPage(products);
      }
    } catch (err) {
      console.error("Failed to load products", err);
    }
  };

  document.addEventListener("DOMContentLoaded", init);
})();
