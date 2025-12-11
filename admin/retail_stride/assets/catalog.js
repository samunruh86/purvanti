const PAGE_SIZE = 50;
const WINDOW_SIZE = 7;
const categoryListEl = document.querySelector('[data-category-list]');
const subcategoryListEl = document.querySelector('[data-subcategory-list]');
const resultCountEl = document.querySelector('[data-result-count]');
const productsGridEl = document.querySelector('[data-products-grid]');
const paginationEl = document.querySelector('[data-pagination]');
const appliedFiltersEl = document.querySelector('[data-applied-filters]');
const sortSelectEl = document.querySelector('[data-sort-select]');
const isCatalogAdminPage = typeof window !== 'undefined' && window.location.pathname.includes('catalog-admin');
const adminSessionFlags = new Map();
const ORIGINAL_INDEX_KEY = '__catalogOrderIndex';
const previewBannerEl = document.querySelector('[data-preview-banner]');
const previewBannerCloseEl = document.querySelector('[data-preview-banner-close]');
let adminSearchInput = null;
const alertUser = (message) => {
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message);
  }
};

const uploadMetaToGCS = async (
  metaObj,
  path,
  {
    endpoint = 'https://trigger-2gb-616502391258.us-central1.run.app',
    action = 'meta_to_return',
    headers = { 'Content-Type': 'application/json' },
    timeoutMs = 10000,
    vrbs = 1,
  } = {},
) => {
  if (!metaObj || typeof metaObj !== 'object') {
    throw new Error('uploadMetaToGCS: META must be a non-null object');
  }
  if (!path || typeof path !== 'string') {
    throw new Error('uploadMetaToGCS: PATH must be a non-empty string');
  }

  const payload = { action, args: { META: metaObj, PATH: path } };

  if (vrbs > 0) {
    // eslint-disable-next-line no-console
    console.log('uploadMetaToGCS: POST', endpoint, '| payload:', payload);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    // eslint-disable-next-line no-console
    console.error('uploadMetaToGCS: network error:', error?.message || error);
    throw new Error(`uploadMetaToGCS: network error: ${String(error?.message || error)}`);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    // eslint-disable-next-line no-console
    console.error('uploadMetaToGCS: HTTP error', response.status, text);
    throw new Error(`uploadMetaToGCS: HTTP ${response.status}${text ? ` - ${text}` : ''}`);
  }

  return true;
};

if (isCatalogAdminPage) {
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.add('catalog-admin-page');
  }
  previewBannerEl?.remove();
  const learnMoreSection = document.getElementById('learn-more');
  learnMoreSection?.remove();
}

if (!isCatalogAdminPage && previewBannerEl && previewBannerCloseEl) {
  previewBannerCloseEl.addEventListener('click', () => {
    previewBannerEl.classList.add('is-dismissed');
    previewBannerEl.addEventListener(
      'transitionend',
      () => {
        previewBannerEl.remove();
      },
      { once: true },
    );
  });
}

const supportsNativeLazyLoading = typeof HTMLImageElement !== 'undefined' && 'loading' in HTMLImageElement.prototype;
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';

let lazyImageObserver = null;

if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
  lazyImageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      const dataSrc = img.dataset.productSrc;
      if (!dataSrc) {
        observer.unobserve(img);
        return;
      }
      img.decoding = 'async';
      img.src = dataSrc;
      img.removeAttribute('data-product-src');
      observer.unobserve(img);
    });
  }, {
    rootMargin: '200px 0px',
    threshold: 0.01,
  });
}

const registerLazyImage = (img) => {
  if (!img) return;
  const dataSrc = img.dataset.productSrc;
  if (!dataSrc) return;

  if (supportsNativeLazyLoading) {
    img.loading = 'lazy';
    img.setAttribute('loading', 'lazy');
    img.decoding = 'async';
    img.src = dataSrc;
    img.removeAttribute('data-product-src');
    return;
  }

  if (lazyImageObserver) {
    img.src = TRANSPARENT_PIXEL;
    lazyImageObserver.observe(img);
    return;
  }

  img.src = dataSrc;
  img.decoding = 'async';
  img.removeAttribute('data-product-src');
};

const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (match) => {
  switch (match) {
    case '&':
      return '&amp;';
    case '<':
      return '&lt;';
    case '>':
      return '&gt;';
    case '"':
      return '&quot;';
    case "'":
      return '&#39;';
    default:
      return match;
  }
});

const escapeAttribute = escapeHTML;

const formatNumber = (value) => {
  if (value == null) return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(number);
};

const state = {
  categories: [],
  activeMain: null,
  activeSub: null,
  productsCache: new Map(),
  metaCache: new Map(),
  allProducts: [],
  filteredProducts: [],
  sort: 'popularity',
  page: 1,
  manualPromote: new Set(),
  manualRemove: new Set(),
  searchQuery: '',
};

const handleLoadError = (error) => {
  if (resultCountEl) {
    resultCountEl.textContent = 'Failed to load catalog data. Please try again later.';
  }
  // eslint-disable-next-line no-console
  console.error(error);
};

const loadManualConfig = async () => {
  const manualPath = '../assets/data/admin/manual.json';
  try {
    const response = await fetch(manualPath, { cache: 'no-store' });
    if (!response.ok) {
      if (response.status === 404) {
        state.manualPromote = new Set();
        state.manualRemove = new Set();
        return;
      }
      throw new Error(`Manual config HTTP ${response.status}`);
    }

    const data = await response.json();
    const promoteList = Array.isArray(data?.promote) ? data.promote : [];
    const removeList = Array.isArray(data?.demote) ? data.demote : [];

    const normalizeIds = (list) => {
      const items = Array.isArray(list) ? list : [];
      return items
        .map((item) => {
          if (item == null) return '';
          const str = String(item).trim();
          return str;
        })
        .filter((str) => str.length > 0);
    };

    state.manualPromote = new Set(normalizeIds(promoteList));
    state.manualRemove = new Set(normalizeIds(removeList));
  } catch (error) {
    state.manualPromote = new Set();
    state.manualRemove = new Set();
    // eslint-disable-next-line no-console
    console.warn('loadManualConfig: unable to load manual ordering', error);
  }
};

const annotateProductOrder = (products) => {
  if (!Array.isArray(products)) return;
  products.forEach((product, index) => {
    if (product && typeof product === 'object') {
      // Preserve original dataset order so we can fall back to it for manual overrides.
      // eslint-disable-next-line no-param-reassign
      product[ORIGINAL_INDEX_KEY] = index;
    }
  });
};

const fetchCategoryData = async (catMainId) => {
  if (!catMainId) return { products: [], meta: null };

  if (state.productsCache.has(catMainId)) {
    const cached = state.productsCache.get(catMainId);
    const cachedProducts = Array.isArray(cached?.products) ? cached.products : [];
    annotateProductOrder(cachedProducts);
    if (cached?.meta && !state.metaCache.has(catMainId)) {
      state.metaCache.set(catMainId, cached.meta);
    }
    return { products: cachedProducts, meta: cached?.meta ?? state.metaCache.get(catMainId) ?? null };
  }

  const response = await fetch(`../assets/data/products/${catMainId}.json`);
  if (!response.ok) throw new Error('Unable to load products');
  const data = await response.json();
  const fetchedProducts = Array.isArray(data?.products) ? data.products : [];
  annotateProductOrder(fetchedProducts);

  state.productsCache.set(catMainId, { products: fetchedProducts, meta: data?.meta ?? null });
  if (data?.meta) {
    state.metaCache.set(catMainId, data.meta);
    const index = state.categories.findIndex((category) => category.cat_main_id === catMainId);
    if (index >= 0) {
      state.categories[index] = {
        ...state.categories[index],
        ...data.meta,
        subs: data.meta.subs ?? state.categories[index].subs ?? [],
      };
    }
  }

  return { products: fetchedProducts, meta: data?.meta ?? null };
};

const getActiveCategoryMeta = () => {
  if (!state.activeMain) return null;
  const cachedMeta = state.metaCache.get(state.activeMain);
  if (cachedMeta) {
    return cachedMeta;
  }
  return state.categories.find((category) => category.cat_main_id === state.activeMain) ?? null;
};

const getActiveSubcategoryMeta = () => {
  if (!state.activeSub) return null;
  const categoryMeta = getActiveCategoryMeta();
  if (!categoryMeta?.subs) return null;
  return categoryMeta.subs.find((sub) => sub.cat_sub_id === state.activeSub) ?? null;
};

const renderMainCategories = () => {
  if (!categoryListEl) return;
  if (isCatalogAdminPage) {
    ensureAdminSearchBar();
  }
  categoryListEl.innerHTML = '';
  state.categories.forEach((category) => {
    const isActive = category.cat_main_id === state.activeMain;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'catalog-category-pill';
    button.dataset.catMain = category.cat_main_id;
    const label = escapeHTML(category.category_main || 'Category');
    button.innerHTML = `<span class="catalog-pill__label">${label}</span>`;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
    button.addEventListener('click', () => {
      const wasActive = state.activeMain === category.cat_main_id;
      if (wasActive) {
        if (!isCatalogAdminPage) return;
        state.activeMain = null;
        state.activeSub = null;
        state.page = 1;
        renderMainCategories();
        renderSubcategories();
        loadAllProducts().catch(handleLoadError);
        return;
      }
      state.activeMain = category.cat_main_id;
      state.activeSub = null;
      state.page = 1;
      renderMainCategories();
      renderSubcategories();
      loadProductsForCategory(category.cat_main_id).catch(handleLoadError);
    });
    categoryListEl.appendChild(button);
  });
};

const renderSubcategories = () => {
  if (!subcategoryListEl) return;
  subcategoryListEl.innerHTML = '';
  const categoryMeta = getActiveCategoryMeta();
  const subs = categoryMeta?.subs ?? [];

  if (!subs.length) {
    subcategoryListEl.classList.add('is-empty');
    return;
  }

  subcategoryListEl.classList.remove('is-empty');
  subs.forEach((sub) => {
    const isActive = state.activeSub === sub.cat_sub_id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'catalog-category-pill catalog-subcategory-pill';
    button.dataset.catSub = sub.cat_sub_id;
    const label = escapeHTML(sub.category_sub || 'Subcategory');
    button.innerHTML = `<span class="catalog-pill__label">${label}</span>`;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
    button.addEventListener('click', () => {
      const willActivate = state.activeSub !== sub.cat_sub_id;
      state.activeSub = willActivate ? sub.cat_sub_id : null;
      state.page = 1;
      renderSubcategories();
      applyFilters();
    });
    subcategoryListEl.appendChild(button);
  });
};

const ensureAdminSearchBar = () => {
  if (!isCatalogAdminPage) return;
  if (adminSearchInput) return;
  const pillsRow = categoryListEl;
  if (!pillsRow || !pillsRow.parentElement) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'catalog-admin-search';

  const input = document.createElement('input');
  input.type = 'search';
  input.id = 'catalog-admin-search-input';
  input.className = 'catalog-admin-search__input';
  input.placeholder = 'Search products…';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', 'Search products');
  input.value = state.searchQuery;
  input.addEventListener('input', (event) => {
    const value = typeof event.target.value === 'string' ? event.target.value : '';
    state.searchQuery = value;
    applyFilters();
  });

  wrapper.appendChild(input);
  pillsRow.insertAdjacentElement('afterend', wrapper);
  adminSearchInput = input;
};

const loadAllProducts = async () => {
  const ids = state.categories.map((category) => category?.cat_main_id).filter((id) => typeof id === 'string' && id.length > 0);
  if (!ids.length) {
    state.allProducts = [];
    state.filteredProducts = [];
    state.activeSub = null;
    state.page = 1;
    renderSubcategories();
    applyFilters();
    return;
  }

  if (resultCountEl) {
    resultCountEl.textContent = 'Loading all products…';
  }
  state.allProducts = [];
  state.filteredProducts = [];
  renderProducts();
  renderPagination();

  const results = await Promise.all(
    ids.map(async (catMainId) => {
      try {
        const { products } = await fetchCategoryData(catMainId);
        return products || [];
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('loadAllProducts: failed to load category', catMainId, error);
        return [];
      }
    }),
  );

  const combined = results.flat();
  state.allProducts = combined;
  state.filteredProducts = combined;
  state.activeSub = null;
  state.page = 1;
  renderSubcategories();
  applyFilters();
};

const getProductId = (product) => {
  if (!product || product.id == null) return null;
  const id = String(product.id).trim();
  return id.length ? id : null;
};

const getAdminFlagsForProduct = (product) => {
  const productId = getProductId(product);
  const sessionFlags = productId ? adminSessionFlags.get(productId) : null;
  const manualPromote = productId ? state.manualPromote.has(productId) : false;
  const manualRemove = productId ? state.manualRemove.has(productId) : false;
  const productPromote = Boolean(product?.promote);
  const productRemove = Boolean(product?.demote);

  const hasSessionPromote = sessionFlags != null && Object.prototype.hasOwnProperty.call(sessionFlags, 'promote');
  const hasSessionRemove = sessionFlags != null && Object.prototype.hasOwnProperty.call(sessionFlags, 'demote');

  const promote = hasSessionPromote
    ? Boolean(sessionFlags.promote)
    : Boolean(manualPromote || productPromote);
  const remove = hasSessionRemove
    ? Boolean(sessionFlags.demote)
    : Boolean(manualRemove || productRemove);

  return { promote, remove };
};

const getProductOrderIndex = (product) => {
  const value = product?.[ORIGINAL_INDEX_KEY];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return Number.MAX_SAFE_INTEGER;
};

const compareAdminPriority = (a, b) => {
  const aFlags = getAdminFlagsForProduct(a);
  const bFlags = getAdminFlagsForProduct(b);

  if (aFlags.remove !== bFlags.remove) {
    return aFlags.remove ? 1 : -1;
  }
  if (aFlags.remove && bFlags.remove) {
    return getProductOrderIndex(a) - getProductOrderIndex(b);
  }

  if (aFlags.promote !== bFlags.promote) {
    return aFlags.promote ? -1 : 1;
  }
  if (aFlags.promote && bFlags.promote) {
    return getProductOrderIndex(a) - getProductOrderIndex(b);
  }

  return 0;
};

const matchesSearch = (product, term) => {
  if (!term) return true;
  if (!product || typeof product !== 'object') return false;

  const haystacks = [
    product.title,
    product.brand,
    product.src_id,
    product.id,
    product.category_main,
    product.category_sub,
  ];

  return haystacks.some((value) => {
    if (value == null) return false;
    const text = String(value).toLowerCase();
    return text.includes(term);
  });
};

const applySort = (products) => {
  const baseComparator = (() => {
    switch (state.sort) {
      case 'price-asc':
        return (a, b) => (a.price ?? 0) - (b.price ?? 0);
      case 'price-desc':
        return (a, b) => (b.price ?? 0) - (a.price ?? 0);
      case 'rating-desc':
        return (a, b) => (b.rating ?? 0) - (a.rating ?? 0);
      case 'reviews-desc':
        return (a, b) => (b.reviews ?? 0) - (a.reviews ?? 0);
      case 'popularity':
      default:
        return (a, b) => (b.volume ?? 0) - (a.volume ?? 0);
    }
  })();

  return [...products].sort((a, b) => {
    const adminOrder = compareAdminPriority(a, b);
    if (adminOrder !== 0) return adminOrder;
    const baseOrder = baseComparator(a, b);
    if (baseOrder !== 0) return baseOrder;
    return getProductOrderIndex(a) - getProductOrderIndex(b);
  });
};

const renderResultCount = (shown) => {
  if (!resultCountEl) return;
  if (!state.activeMain) {
    const shownLabel = formatNumber(shown);
    resultCountEl.innerHTML = `Showing <strong>${shownLabel}</strong> across all categories`;
    return;
  }

  const categoryMeta = getActiveCategoryMeta();
  const categoryName = escapeHTML(categoryMeta?.category_main || 'Selected category');
  const shownLabel = formatNumber(shown);

  if (state.activeSub) {
    const subMeta = getActiveSubcategoryMeta();
    const subName = escapeHTML(subMeta?.category_sub || 'Selected subcategory');
    resultCountEl.innerHTML = `Showing <strong>${shownLabel}</strong> in <strong>${subName}</strong>`;
    return;
  }

  resultCountEl.innerHTML = `Showing <strong>${shownLabel}</strong> in <strong>${categoryName}</strong>`;
};

const renderAppliedFilters = () => {
  if (!appliedFiltersEl) return;
  appliedFiltersEl.innerHTML = '';

  const filters = [];
  const subMeta = getActiveSubcategoryMeta();
  if (subMeta) {
    filters.push({
      label: subMeta.category_sub || 'Selected subcategory',
      onRemove: () => {
        state.activeSub = null;
        state.page = 1;
        applyFilters();
      },
    });
  }

  filters.forEach((filter) => {
    const chip = document.createElement('div');
    chip.className = 'catalog-chip';
    const label = document.createElement('span');
    label.textContent = filter.label;
    chip.appendChild(label);
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', `Remove filter ${filter.label}`);
    removeButton.textContent = '×';
    removeButton.addEventListener('click', filter.onRemove);
    chip.appendChild(removeButton);
    appliedFiltersEl.appendChild(chip);
  });
};

const bindAdminMetaHandlers = (card, product) => {
  if (!isCatalogAdminPage) return;
  if (!card || !product) return;

  const rawId = product.id == null ? '' : String(product.id).trim();
  if (!rawId) return;

  const promoteEl = card.querySelector('[data-product-promote]');
  const removeEl = card.querySelector('[data-product-remove]');
  const promoteToggle = promoteEl instanceof HTMLInputElement ? promoteEl : null;
  const removeToggle = removeEl instanceof HTMLInputElement ? removeEl : null;
  if (!promoteToggle && !removeToggle) return;

  const toggles = [promoteToggle, removeToggle].filter(Boolean);
  let isSaving = false;

  const persistMeta = async (changedToggle, previousValue, previousFlags) => {
    if (isSaving) return;
    isSaving = true;
    toggles.forEach((toggle) => {
      if (toggle) toggle.disabled = true;
    });

    const currentFlags = adminSessionFlags.get(rawId);
    const meta = {
      product_id: rawId,
      promote: Boolean(currentFlags?.promote),
      demote: Boolean(currentFlags?.demote),
    };

    const path = `Main/retailstride/admin/products/${rawId}`;

    try {
      await uploadMetaToGCS(meta, path);
      toggles.forEach((toggle) => {
        if (toggle) toggle.disabled = false;
      });
      isSaving = false;
      applyFilters();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to upload product meta to GCS', error);
      if (changedToggle && typeof previousValue === 'boolean') {
        changedToggle.checked = previousValue;
      }
      if (rawId) {
        if (previousFlags) {
          adminSessionFlags.set(rawId, previousFlags);
        } else {
          adminSessionFlags.delete(rawId);
        }
      }
      toggles.forEach((toggle) => {
        if (toggle) toggle.disabled = false;
      });
      isSaving = false;
      applyFilters();
      alertUser('Unable to save product changes. Please try again.');
    }
  };

  const currentFlags = getAdminFlagsForProduct(product);
  if (promoteToggle) promoteToggle.checked = currentFlags.promote;
  if (removeToggle) removeToggle.checked = currentFlags.remove;

  const handleToggleChange = (toggle) => {
    toggle.addEventListener('change', () => {
      const previousValue = !toggle.checked;
      const previousFlags = rawId ? adminSessionFlags.get(rawId) : undefined;
      const nextFlags = {
        promote: Boolean(promoteToggle?.checked),
        demote: Boolean(removeToggle?.checked),
      };
      if (rawId) {
        adminSessionFlags.set(rawId, nextFlags);
      }
      void persistMeta(toggle, previousValue, previousFlags);
    });
  };

  toggles.forEach((toggle) => {
    handleToggleChange(toggle);
  });
};

const renderProducts = () => {
  if (!productsGridEl) return;
  const start = (state.page - 1) * PAGE_SIZE;
  const pageProducts = state.filteredProducts.slice(start, start + PAGE_SIZE);
  const viewingAllCategories = !state.activeMain;
  const hasAnyProducts = state.filteredProducts.length > 0;

  productsGridEl.classList.add('is-transitioning');
  requestAnimationFrame(() => {
    productsGridEl.innerHTML = '';
    if (viewingAllCategories && !hasAnyProducts && state.allProducts.length === 0) {
      const prompt = document.createElement('div');
      prompt.className = 'catalog-empty';
      prompt.innerHTML = `
        <h3>Loading catalog</h3>
        <p>Fetching products across all categories…</p>
      `;
      productsGridEl.appendChild(prompt);
      requestAnimationFrame(() => {
        productsGridEl.classList.remove('is-transitioning');
      });
      return;
    }

    if (!pageProducts.length) {
      const empty = document.createElement('div');
      empty.className = 'catalog-empty';
      empty.innerHTML = `
        <h3>No matching products</h3>
        <p>Adjust your filters or try a different search.</p>
      `;
      productsGridEl.appendChild(empty);
    } else {
      pageProducts.forEach((product) => {
        const card = document.createElement('article');
        card.className = 'catalog-product-card';
        const badgeLabel = (() => {
          if (typeof product.volume === 'number' && product.volume >= 1200) return 'Top Seller';
          if (typeof product.reviews === 'number' && product.reviews >= 1000) return 'Popular';
          if (typeof product.rating === 'number' && product.rating >= 4.7) return 'Best Rated';
          return '';
        })();
        const productTitle = escapeHTML(product.title || 'Untitled product');
        const productBrand = escapeHTML(product.brand ?? 'Unknown brand');
        const rawSrcId = product.src_id == null ? '' : String(product.src_id).trim();
        const safeSrcId = escapeHTML(rawSrcId);
        const srcIdClass = (() => {
          if (!rawSrcId) return '';
          const lower = rawSrcId.slice(0, 2).toLowerCase();
          if (lower === 'ss') return ' catalog-product-card__source-pill--ss';
          if (lower === 'fa') return ' catalog-product-card__source-pill--fa';
          return '';
        })();
        const sourcePill = isCatalogAdminPage && safeSrcId
          ? `<span class="catalog-product-card__source-pill${srcIdClass}">${safeSrcId}</span>`
          : '';
        const productImage = escapeAttribute(product.image || '');
        const imageAttributes = productImage
          ? `src="${TRANSPARENT_PIXEL}" data-product-src="${productImage}"`
          : `src="${TRANSPARENT_PIXEL}"`;
        const rawProductId = product.id == null ? '' : String(product.id);
        const safeProductId = escapeAttribute(rawProductId);
        const productIdAttr = safeProductId ? ` data-product-id="${safeProductId}"` : '';
        const promoteFieldName = safeProductId ? `product_promote_${safeProductId}` : 'promote';
        const removeFieldName = safeProductId ? `product_remove_${safeProductId}` : 'demote';
        const actionsClass = isCatalogAdminPage
          ? 'catalog-product-card__actions catalog-product-card__actions--admin'
          : 'catalog-product-card__actions';
        const actionMarkup = isCatalogAdminPage
          ? `
              <label class="catalog-admin-switch">
                <input
                  type="checkbox"
                  id="promote"
                  name="${promoteFieldName}"
                  class="catalog-admin-switch__input"
                  data-product-promote${productIdAttr}
                >
                <span class="catalog-admin-switch__track" aria-hidden="true"></span>
                <span class="catalog-admin-switch__label">Promote</span>
              </label>
              <label class="catalog-admin-switch">
                <input
                  type="checkbox"
                  id="demote"
                  name="${removeFieldName}"
                  class="catalog-admin-switch__input"
                  data-product-remove${productIdAttr}
                >
                <span class="catalog-admin-switch__track" aria-hidden="true"></span>
                <span class="catalog-admin-switch__label">Demote</span>
              </label>
            `
          : `
              <button
                type="button"
                class="catalog-product-card__cta"
                data-login-trigger
              >
                <span class="catalog-product-card__cta-icon catalog-product-card__cta-icon--locked" aria-hidden="true"></span>
                <span class="catalog-product-card__cta-icon catalog-product-card__cta-icon--unlocked" aria-hidden="true"></span>
                <span class="catalog-product-card__cta-label">Unlock Price</span>
              </button>
            `;
        card.innerHTML = `
          <div class="catalog-product-card__media">
            ${sourcePill}
            <img ${imageAttributes} alt="${productTitle}" class="catalog-product-card__image">
            ${badgeLabel ? `<span class="catalog-product-card__badge">${badgeLabel}</span>` : ''}
          </div>
          <div class="catalog-product-card__details">
            <span class="catalog-product-card__brand">${productBrand}</span>
            <h3 class="catalog-product-card__title" title="${escapeAttribute(product.title || 'Product title')}">${productTitle}</h3>
            <div class="${actionsClass}">
              ${actionMarkup}
            </div>
          </div>
        `;
        productsGridEl.appendChild(card);
        const imageEl = card.querySelector('.catalog-product-card__image');
        registerLazyImage(imageEl);
        bindAdminMetaHandlers(card, product);
      });
    }
    requestAnimationFrame(() => {
      productsGridEl.classList.remove('is-transitioning');
    });
  });
};

const renderPagination = () => {
  if (!paginationEl) return;
  paginationEl.innerHTML = '';
  if (!state.filteredProducts.length) return;

  const totalPages = Math.max(1, Math.ceil(state.filteredProducts.length / PAGE_SIZE));

  const makeButton = (label, page, disabled = false, isActive = false, kind = 'page') => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.paginationButton = kind;
    if (disabled) button.disabled = true;
    if (isActive) {
      button.classList.add('is-active');
      if (kind === 'page') {
        button.setAttribute('aria-current', 'page');
      }
    }
    if (kind === 'page') {
      button.setAttribute('aria-label', `Go to page ${page}`);
    } else if (kind === 'previous') {
      button.setAttribute('aria-label', 'Go to previous page');
    } else if (kind === 'next') {
      button.setAttribute('aria-label', 'Go to next page');
    }
    button.addEventListener('click', () => {
      state.page = page;
      renderProducts();
      renderPagination();
      if (productsGridEl) {
        const { top } = productsGridEl.getBoundingClientRect();
        window.scrollTo({
          top: top + window.scrollY - 120,
          behavior: 'smooth',
        });
      }
    });
    paginationEl.appendChild(button);
  };

  makeButton('‹ Previous', Math.max(1, state.page - 1), state.page === 1, false, 'previous');

  const start = Math.max(1, state.page - Math.floor(WINDOW_SIZE / 2));
  const end = Math.min(totalPages, start + WINDOW_SIZE - 1);

  for (let page = start; page <= end; page += 1) {
    makeButton(String(page), page, false, page === state.page, 'page');
  }

  makeButton('Next ›', Math.min(totalPages, state.page + 1), state.page === totalPages, false, 'next');
};

const applyFilters = () => {
  if (!state.activeMain && state.activeSub) {
    state.activeSub = null;
  }

  const baseProducts = Array.isArray(state.allProducts) ? state.allProducts : [];

  const subFiltered = baseProducts.filter((product) => {
    if (!state.activeSub) return true;
    return product.cat_sub_id === state.activeSub;
  });

  const searchTerm = typeof state.searchQuery === 'string' ? state.searchQuery.trim().toLowerCase() : '';
  const searchFiltered = searchTerm
    ? subFiltered.filter((product) => matchesSearch(product, searchTerm))
    : subFiltered;

  const sorted = applySort(searchFiltered);
  state.filteredProducts = sorted;
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  if (!Number.isFinite(state.page) || state.page < 1) {
    state.page = 1;
  }

  renderResultCount(sorted.length);
  renderAppliedFilters();
  renderProducts();
  renderPagination();
};

const loadProductsForCategory = async (catMainId) => {
  try {
    const { products } = await fetchCategoryData(catMainId);
    state.allProducts = products;
    renderSubcategories();
    applyFilters();
  } catch (error) {
    throw error;
  }
};

const handleSortChange = () => {
  state.sort = sortSelectEl?.value || 'popularity';
  state.page = 1;
  applyFilters();
};

const loadCategories = async () => {
  const response = await fetch('../assets/data/categories/map.json');
  if (!response.ok) throw new Error('Unable to load categories');
  const data = await response.json();
  state.categories = Array.isArray(data) ? data : [];
  state.activeMain = state.categories[0]?.cat_main_id ?? null;
  state.activeSub = null;
  state.page = 1;
  renderMainCategories();
  renderSubcategories();
  if (state.activeMain) {
    await loadProductsForCategory(state.activeMain);
  } else {
    applyFilters();
  }
};

const initCatalog = async () => {
  try {
    sortSelectEl?.addEventListener('change', handleSortChange);
    await loadManualConfig();
    await loadCategories();
  } catch (error) {
    handleLoadError(error);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCatalog);
} else {
  initCatalog();
}
