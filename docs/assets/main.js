const PRODUCTS_PATH = "assets/data/products_all.json";
const CONTENT_PATH = "assets/data/content.json";
const POSTS_PATH = "assets/data/posts.json";
const CART_STORAGE_KEY = "purvanti:cart";
const FORM_ENDPOINT = "https://trigger-2gb-616502391258.us-central1.run.app";
const GA_MEASUREMENT_ID = "G-3P4ZR2BW7E";
const EMAIL_CONFIRM_DEFAULT = ["528973", "2578189", "981164", "164646"];
const SHOPIFY_DOMAIN = "purvanti.myshopify.com";
const SHOPIFY_TOKEN = "6a22e402edfee5831a3b5501187767ce";

let cartState = { items: [], updatedAt: null };
let cartProductMap = new Map();
let cartLoaded = false;
let cartKeydownBound = false;
const cartUI = {
  overlay: null,
  list: null,
  subtotal: null,
  empty: null,
  checkout: null,
  badge: null,
};

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

async function goToShopifyCheckoutStorefront(cart, { shopDomain, storefrontToken }) {
  const items = (cart?.items || [])
    .filter(i => i.shopify_variant_id && Number(i.qty) > 0)
    .map(i => ({
      merchandiseId: `gid://shopify/ProductVariant/${Number(i.shopify_variant_id)}`,
      quantity: Number(i.qty),
    }));

  if (!items.length) return;

  // optional: your reconciliation hash
  const purvantiCartId = crypto.randomUUID();

  const query = `
    mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { id checkoutUrl }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    input: {
      lines: items,
      attributes: [{ key: "purvanti_cart_id", value: purvantiCartId }],
    }
  };

  const res = await fetch(`https://${shopDomain}/api/2025-01/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  const errs = json?.data?.cartCreate?.userErrors;
  if (errs?.length) throw new Error(errs.map(e => e.message).join("; "));

  const checkoutUrl = json.data.cartCreate.cart.checkoutUrl;
  try {
    localStorage.setItem("purvanti:last_cart_id", purvantiCartId);
  } catch (e) {
    console.warn("Could not store last cart id", e);
  }
  console.log("[shopify] cart created", { checkoutUrl, purvantiCartId, items });

  window.location.href = checkoutUrl;
}

async function recordFormSubmission(formName = null, formData = {}) {
  const url = FORM_ENDPOINT;
  const action = "site_form";

  if (!formName || typeof formName !== "string" || !formName.trim()) {
    console.warn("Form submission skipped: invalid form name");
    return { ok: false, skipped: true, reason: "invalid_form_name" };
  }
  if (!formData || typeof formData !== "object" || Array.isArray(formData)) {
    console.warn("Form submission skipped: invalid form data");
    return { ok: false, skipped: true, reason: "invalid_form_data" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, args: { form_name: formName, form_data: formData } }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Request failed (${res.status}): ${text}`);
    }
    const data = await res.json().catch(() => ({}));
    return data;
  } catch (error) {
    console.error("Form submission failed", error);
    return { ok: false, error: error.message };
  }
}

async function runUserAccount({ formData }) {
  const payload = {
    action: "get_purvanti_login",
    args: { form: formData },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    console.log("[cart:login] sending", payload);
    const resp = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "cors",
      cache: "no-store",
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!resp.ok) {
      let detail = "";
      try {
        detail = await resp.text();
      } catch (e) {
        console.warn("Login response text read failed", e);
      }
      throw new Error(`Service returned ${resp.status}${detail ? `: ${detail}` : ""}`);
    }

    const data = await resp.json();
    console.log("[cart:login] response", data);
    const result = data?.result;
    if (result == null) {
      throw new Error(`Response missing "result": ${JSON.stringify(data)}`);
    }
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

function initAnalytics() {
  if (!GA_MEASUREMENT_ID) return;
  if (window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
}

document.addEventListener("DOMContentLoaded", () => {
  initAnalytics();
  rewriteCategoryAnchors();
  rewriteBlogAnchors();
  const pageType = document.body.dataset.page;
  if (pageType === "about") {
    hydrateAboutPage();
    return;
  }
  if (pageType === "category") {
    hydrateCategoryPage();
    return;
  }
  if (pageType === "journal") {
    hydrateBlogPage();
    return;
  }
  if (pageType === "journal-list") {
    hydrateJournalListPage();
    return;
  }
  if (pageType === "contact") {
    hydrateContactPage();
    return;
  }
  if (pageType === "brands") {
    hydrateBrandsPage();
    return;
  }
  if (pageType === "policy") {
    hydratePolicyPage();
    return;
  }

  const app = document.getElementById("app");
  if (!app) return;
  hydratePage(app);
});

function initCart(productMap = new Map()) {
  if (productMap?.size) {
    cartProductMap = productMap;
  }
  loadCartState();
  ensureCartDrawer();
  wireCartTriggers();
  renderCartUI();
}

function loadCartState() {
  if (cartLoaded) return;
  cartLoaded = true;
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.items)) {
      cartState = {
        items: parsed.items.map(normalizeCartItem).filter(Boolean),
        updatedAt: parsed.updatedAt || Date.now(),
      };
    }
  } catch (error) {
    console.warn("Could not load cart", error);
    cartState = { items: [], updatedAt: Date.now() };
  }
}

function normalizeCartItem(raw) {
  const id = raw?.id || raw?.handle;
  if (!id) return null;
  const qty = Math.max(1, Math.floor(Number(raw.qty) || 1));
  return {
    id: String(id),
    handle: raw.handle || "",
    title: raw.title || "",
    price: Number(raw.price) || 0,
    image: resolveCartImage(raw.image || ""),
    qty,
  };
}

function persistCart() {
  cartState.updatedAt = Date.now();
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState));
  } catch (error) {
    console.warn("Could not save cart", error);
  }
  updateCartBadge();
  window.dispatchEvent(
    new CustomEvent("cart:updated", {
      detail: {
        cart: { ...cartState },
        count: cartItemCount(),
        subtotal: cartSubtotal(),
      },
    })
  );
}

function cartItemCount() {
  return cartState.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
}

function cartSubtotal() {
  return cartState.items.reduce(
    (total, item) => total + (Number(item.price) || 0) * (Number(item.qty) || 0),
    0
  );
}

function resolveCartImage(path) {
  if (!path) return "";
  if (typeof resolveAssetPath === "function") {
    return resolveAssetPath(path);
  }
  const base = getBasePath();
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
  return `${base}${path}`;
}

function addToCart(product, qty = 1) {
  if (!product) return;
  const id = product.id || product.handle;
  if (!id) return;
  const normalizedQty = Math.max(1, Math.floor(Number(qty) || 1));
  const title = product.title_short || product.title_long || product.title || "Product";
  const image = resolveCartImage(productImageSrc(product, "small", 0));
  const price = Number(product.price) || 0;
  const handle = product.handle || "";

  const existing = cartState.items.find((item) => item.id === String(id));
  if (existing) {
    existing.qty += normalizedQty;
    existing.price = price || existing.price;
    existing.title = existing.title || title;
    existing.image = existing.image || image;
    existing.handle = existing.handle || handle;
  } else {
    cartState.items.push({
      id: String(id),
      handle,
      title,
      price,
      image,
      qty: normalizedQty,
    });
  }
  persistCart();
  renderCartUI();
}

function updateCartQty(id, qty) {
  const item = cartState.items.find((line) => line.id === String(id));
  if (!item) return;
  const nextQty = Math.max(1, Math.floor(Number(qty) || 1));
  item.qty = nextQty;
  persistCart();
  renderCartUI();
}

function removeFromCart(id) {
  cartState.items = cartState.items.filter((line) => line.id !== String(id));
  persistCart();
  renderCartUI();
}

function renderCartUI() {
  ensureCartDrawer();
  const items = Array.isArray(cartState.items) ? cartState.items : [];
  if (cartUI.list) {
    cartUI.list.innerHTML = "";
    items.forEach((item) => {
      const row = buildCartLine(item);
      if (row) cartUI.list.appendChild(row);
    });
  }
  const empty = !items.length;
  if (cartUI.empty) {
    cartUI.empty.hidden = !empty;
  }
  if (cartUI.list) {
    cartUI.list.hidden = empty;
  }
  if (cartUI.subtotal) {
    cartUI.subtotal.textContent = formatPrice(cartSubtotal());
  }
  if (cartUI.checkout) {
    cartUI.checkout.classList.toggle("is-disabled", empty);
    cartUI.checkout.setAttribute("aria-disabled", String(empty));
  }
  updateCartBadge();
}

function ensureCartDrawer() {
  if (cartUI.overlay) return cartUI.overlay;

  const overlay = document.createElement("div");
  overlay.className = "cart";
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");

  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.className = "cart__backdrop";
  backdrop.dataset.cartClose = "true";
  backdrop.setAttribute("aria-label", "Close cart");

  const drawer = document.createElement("aside");
  drawer.className = "cart__drawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-label", "Shopping cart");

  const head = document.createElement("div");
  head.className = "cart__head";
  const title = document.createElement("h3");
  title.textContent = "Your bag";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "cart__close";
  close.dataset.cartClose = "true";
  close.setAttribute("aria-label", "Close cart");
  close.textContent = "×";
  head.append(title, close);

  const list = document.createElement("div");
  list.className = "cart__items";

  const empty = document.createElement("p");
  empty.className = "cart__empty";
  empty.textContent = "Your bag is empty. Add your favorites to get started.";

  const footer = document.createElement("div");
  footer.className = "cart__footer";
  const summary = document.createElement("div");
  summary.className = "cart__summary";
  const label = document.createElement("span");
  label.textContent = "Subtotal";
  const subtotal = document.createElement("span");
  subtotal.className = "cart__subtotal";
  summary.append(label, subtotal);
  const checkout = document.createElement("button");
  checkout.className = "cart__checkout";
  checkout.textContent = "Checkout";
  checkout.type = "button";
  const checkoutMessage = document.createElement("div");
  checkoutMessage.className = "cart__checkout-message";
  checkoutMessage.hidden = true;

  const account = document.createElement("div");
  account.className = "cart__account";
  account.innerHTML = `
    <label class="cart__account-field">
      <span>Email</span>
      <input type="email" name="account_email" placeholder="you@example.com">
    </label>
    <label class="cart__account-field">
      <span>Password</span>
      <input type="password" name="account_password" placeholder="Your password">
    </label>
    <button type="button" class="cart__login">Login</button>
    <button type="button" class="cart__signup">Sign Up</button>
  `;

  checkout.addEventListener("click", (e) => {
    e.preventDefault();
    if (account.dataset.completed === "true" || checkout.classList.contains("is-proceed")) {
      handleCheckoutRedirect(checkoutMessage);
      return;
    }
    const isOpen = account.classList.toggle("is-open");
    account.hidden = !isOpen;
    checkout.textContent = isOpen ? "Close" : "Checkout";
    if (summary) {
      summary.hidden = isOpen;
      summary.style.display = isOpen ? "none" : "";
    }
    if (!isOpen) {
      resetAccountForm(account, { keepCompletion: true });
    }
  });

  const loginBtn = account.querySelector(".cart__login");
  const signupToggle = account.querySelector(".cart__signup");
  const emailInput = account.querySelector('input[name="account_email"]');
  const passwordField = account.querySelector('input[name="account_password"]')?.closest(".cart__account-field");
  const passwordInput = account.querySelector('input[name="account_password"]');
  const passwordLabel = passwordField?.querySelector("span");
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "cart__signup cart__reset";
  resetBtn.textContent = "Reset Password";
  if (passwordField && passwordLabel) {
    const labelRow = document.createElement("div");
    labelRow.className = "cart__account-label-row";
    passwordField.insertBefore(labelRow, passwordLabel);
    labelRow.append(passwordLabel, resetBtn);
  }

  account.addEventListener("click", (event) => {
    const signupBtn = event.target.closest(".cart__signup");
    if (!signupBtn) return;
    event.preventDefault();
    if (!signupBtn.classList.contains("is-signup")) {
      signupBtn.classList.add("is-signup");
      signupBtn.textContent = "Back to Login";
      if (passwordField) {
        passwordField.hidden = true;
        passwordField.classList.add("is-hidden");
      }
      if (loginBtn) loginBtn.textContent = "Get Confirmation Code";
      checkout.textContent = "Close";
    } else {
      signupBtn.classList.remove("is-signup");
      signupBtn.textContent = "Sign Up";
      if (passwordField) {
        passwordField.hidden = false;
        passwordField.classList.remove("is-hidden");
      }
      removeAccountCreateFields(account);
      clearConfirmationState(account);
      if (loginBtn) loginBtn.textContent = "Login";
      checkout.textContent = account.classList.contains("is-open") ? "Close" : "Checkout";
      const codeField = account.querySelector(".cart__code");
      const codeNote = account.querySelector(".cart__code-note");
      const codeMsg = account.querySelector(".cart__code-message");
      if (codeField) codeField.remove();
      if (codeNote) codeNote.remove();
      if (codeMsg) codeMsg.remove();
    }
  });

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const emailVal = emailInput?.value?.trim();
      const passwordVal = passwordInput?.value?.trim();

      if (account.dataset.codeVerified === "true") {
        await handleAccountCreate(account, loginBtn);
        return;
      }
      const isSignup = signupToggle?.classList.contains("is-signup");

      const clearErrors = () => {
        emailInput?.classList.remove("is-error");
        passwordInput?.classList.remove("is-error");
      };
      clearErrors();

      if (!emailVal) {
        emailInput?.classList.add("is-error");
        emailInput?.focus();
        return;
      }
      if (!isSignup && !passwordVal) {
        passwordInput?.classList.add("is-error");
        passwordInput?.focus();
        return;
      }

      loginBtn.disabled = true;
      const defaultText = loginBtn.textContent || "Submit";
      const hasCodeStep = !!account.querySelector(".cart__code");
      loginBtn.textContent = isSignup
        ? hasCodeStep
          ? "Resending..."
          : "Sending..."
        : "Sending...";
      try {
        const formData = new FormData();
        formData.append("account_email", emailVal);
        formData.append("cart", JSON.stringify(cartState || {}));

        if (!isSignup) {
          const payload = {
            account_email: emailVal,
            account_password: passwordVal,
          };
          const result = await runUserAccount({ formData: payload });
          if (result === "not_found") {
            showAccountMessage(account, `No account found for ${emailVal}.`, "error");
            return;
          }
          if (result === "password_incorrect") {
            showAccountMessage(account, "The email and password entered do not match. Please try again.", "error");
            return;
          }
          if (result === "password_match") {
            showAccountMessage(account, "Welcome back! You're ready to checkout.", "success");
            finalizeAccountSuccess(account);
            return;
          }
          showAccountMessage(account, "Something went wrong. Please try again.", "error");
          return;
        }

        // Signup/resend flow: always (re)request the code; verification happens automatically when filled.
        const codePool = Array.isArray(EMAIL_CONFIRM_DEFAULT) ? EMAIL_CONFIRM_DEFAULT : [EMAIL_CONFIRM_DEFAULT];
        const chosenCode = codePool[Math.floor(Math.random() * codePool.length)] || "";
        formData.append("confirmation_req", chosenCode);
        const payload = buildFormPayload(account, formData);
        const res = await recordFormSubmission("purvanti_signup", payload);
        if (res?.ok === false) throw new Error(res?.error || "Submission failed");
        addConfirmationStep(account, emailVal);
        const hiddenReq = account.querySelector("#confirmation_req");
        if (hiddenReq) hiddenReq.value = chosenCode;
        loginBtn.textContent = "Resend Confirmation Code";
        return;
      } catch (error) {
        console.error(error);
      } finally {
        loginBtn.disabled = false;
        if (account.dataset.codeVerified === "true") {
          loginBtn.textContent = "Create Account";
        } else if (account.querySelector(".cart__code")) {
          loginBtn.textContent = "Resend Confirmation Code";
        } else {
          loginBtn.textContent = isSignup ? "Get Confirmation Code" : defaultText;
        }
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", (event) => {
      event.preventDefault();
      if (!signupToggle.classList.contains("is-signup")) {
        signupToggle.classList.add("is-signup");
        signupToggle.textContent = "Back to Login";
      }
      if (passwordField) {
        passwordField.hidden = true;
        passwordField.classList.add("is-hidden");
      }
      hideAccountMessage(account);
      clearConfirmationState(account);
      removeAccountCreateFields(account);
      loginBtn.textContent = "Get Confirmation Code";
      checkout.textContent = "Close";
    });
  }

  footer.append(summary, checkout, account);

  drawer.append(head, list, empty, footer);
  overlay.append(backdrop, drawer);
  document.body.appendChild(overlay);

  cartUI.overlay = overlay;
  cartUI.list = list;
  cartUI.subtotal = subtotal;
  cartUI.empty = empty;
  cartUI.checkout = checkout;
  cartUI.checkoutMessage = checkoutMessage;
  return overlay;
}

function buildCartLine(item) {
  const meta = cartItemMeta(item);
  if (!meta.id) return null;

  const row = document.createElement("div");
  row.className = "cart-line";
  row.dataset.cartItem = meta.id;

  const media = document.createElement("div");
  media.className = "cart-line__media";
  const img = document.createElement("img");
  img.src = meta.image || "";
  img.alt = meta.title || "Product";
  media.appendChild(img);

  const info = document.createElement("div");
  info.className = "cart-line__info";
  const title = document.createElement("a");
  title.className = "cart-line__title";
  title.href = meta.href || "#";
  title.textContent = meta.title || "Product";
  const price = document.createElement("p");
  price.className = "cart-line__price";
  price.textContent = formatPrice(meta.price);
  info.append(title, price);

  const qty = document.createElement("div");
  qty.className = "cart-line__qty";
  const input = document.createElement("input");
  input.type = "number";
  input.inputMode = "numeric";
  input.min = "1";
  input.value = String(meta.qty);
  input.addEventListener("change", () => updateCartQty(meta.id, Number(input.value)));
  qty.append(input);

  const total = document.createElement("div");
  total.className = "cart-line__total";
  const sum = document.createElement("span");
  sum.textContent = formatPrice(meta.price * meta.qty);
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "cart-line__remove";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => removeFromCart(meta.id));
  total.append(sum, remove);

  row.append(media, info, qty, total);
  return row;
}

function cartItemMeta(item) {
  const product =
    cartProductMap.get(item.id) ||
    cartProductMap.get(Number(item.id)) ||
    cartProductMap.get(item.handle) ||
    cartProductMap.get((item.handle || "").toLowerCase());
  const price = Number(item.price || product?.price || 0) || 0;
  const title = item.title || product?.title_short || product?.title_long || "Product";
  const image = resolveCartImage(
    item.image ||
      productImageSrc(product || item, "small", 0) ||
      productImageSrc(product || item, "full", 0)
  );
  const handle = item.handle || product?.handle || "";
  const href = handle ? productPageHref({ handle }) : productPageHref(product || {});
  return {
    id: item.id,
    title,
    price,
    image,
    qty: Math.max(1, Math.floor(Number(item.qty) || 1)),
    href,
    handle,
  };
}

function openCartDrawer() {
  ensureCartDrawer();
  renderCartUI();
  if (!cartUI.overlay) return;
  cartUI.overlay.hidden = false;
  requestAnimationFrame(() => {
    cartUI.overlay?.classList.add("is-open");
  });
  cartUI.overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
}

function closeCartDrawer() {
  if (!cartUI.overlay) return;
  cartUI.overlay.classList.remove("is-open");
  cartUI.overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-open");
  setTimeout(() => {
    if (!cartUI.overlay?.classList.contains("is-open")) {
      cartUI.overlay.hidden = true;
    }
  }, 220);
}

function wireCartTriggers() {
  ensureCartDrawer();
  document.querySelectorAll("[data-cart-trigger]").forEach((btn) => {
    if (btn.dataset.cartBound) return;
    btn.dataset.cartBound = "true";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openCartDrawer();
    });
    const badge = btn.querySelector(".header__cart-badge");
    if (badge) cartUI.badge = badge;
  });

  cartUI.overlay?.querySelectorAll("[data-cart-close]").forEach((btn) => {
    if (btn.dataset.cartCloseBound) return;
    btn.dataset.cartCloseBound = "true";
    btn.addEventListener("click", () => closeCartDrawer());
  });

  if (!cartKeydownBound) {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCartDrawer();
    });
    cartKeydownBound = true;
  }
}

function updateCartBadge() {
  if (!cartUI.badge) {
    const btn = document.querySelector("[data-cart-trigger]");
    cartUI.badge = btn?.querySelector(".header__cart-badge") || cartUI.badge;
  }
  if (!cartUI.badge) return;
  const count = cartItemCount();
  cartUI.badge.textContent = String(count);
  cartUI.badge.hidden = count <= 0;
}

async function hydratePage(app) {
  const loadingNote = document.getElementById("loading-note");

  try {
    const [content, products, posts] = await Promise.all([
      fetchJSON(CONTENT_PATH),
      fetchJSON(PRODUCTS_PATH),
      fetchJSON(POSTS_PATH),
    ]);

    const homeSections = Array.isArray(content?.home) ? content.home : [];
    const categories = content?.categories || [];
    const productMap = mapProducts(products?.products || []);
    const preparedPosts = preparePosts(posts || []);
    const latestPosts = preparedPosts.slice(0, 3);

    renderChrome(productMap, categories);

    homeSections.forEach((block) => {
      const builder = sectionBuilders[block.section];
      if (!builder) return;
    const dataForBlock =
      block.section === "blog_feature" ? { ...block, posts: latestPosts } : block;
    const node = builder(dataForBlock, productMap, preparedPosts);
      if (node) app.appendChild(node);
    });

    if (new URLSearchParams(window.location.search).get("devAssign") === "1") {
      initDevAssignTool(homeSections, productMap);
    }

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
  let url = path;
  if (typeof path === "string" && !/^https?:\/\//i.test(path) && !path.startsWith("/")) {
    const base = getBasePath();
    url = `${base}${path.replace(/^\/+/, "")}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function mapProducts(list) {
  return list.reduce((map, item) => {
    if (item.id) {
      map.set(item.id, item);
      map.set(String(item.id), item);
    }
    if (item.handle) {
      map.set(item.handle, item);
    }
    return map;
  }, new Map());
}

function uniqueProducts(productMap) {
  return Array.from(new Set(productMap.values()));
}

function preparePosts(list) {
  const today = new Date();
  const normalized = Array.isArray(list) ? list : [];
  return normalized
    .map((post) => {
      const month = Number(post.month) || 1;
      const day = Number(post.day) || 1;
      let year = today.getFullYear();
      let date = new Date(year, month - 1, day);
      if (date > today) {
        year -= 1;
        date = new Date(year, month - 1, day);
      }
      const dateStr = formatDate(date);
      return {
        ...post,
        date: dateStr,
        isoDate: date.toISOString(),
        href: blogPageHref(post),
      };
    })
    .sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatRichText(text) {
  if (!text) return "";
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function buildBlogCard(post) {
  const card = document.createElement("article");
  card.className = "blog-card";

  const media = document.createElement("div");
  media.className = "blog-card__media";
  const img = document.createElement("img");
  img.src = resolveAssetPath(post.image || post.image_full || post.image_small || "");
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
  link.href = blogPageHref(post);
  link.dataset.blogSlug = post.slug || "";
  link.textContent = "Read more";
  attachBlogLinkHandlers(link, post.slug);

  card.append(media, meta, h4, excerpt, link);
  return card;
}

function buildBlogHref(post) {
  return blogPageHref(post);
}

function resolveAssetPath(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
  return `${getBasePath()}${path}`;
}

function getBasePath() {
  const path = window.location.pathname || "/";
  if (path.includes("/pages/")) {
    return path.split("/pages/")[0] + "/";
  }
  if (path.includes("/products/")) {
    return path.split("/products/")[0] + "/";
  }
  if (path.includes("product.html")) {
    return path.replace(/product\.html.*/i, "");
  }
  if (path.includes("/journal/")) {
    return path.split("/journal/")[0] + "/";
  }
  if (path.includes("journal.html")) {
    return path.replace(/journal\.html.*/i, "");
  }
  if (path.endsWith("/journal")) {
    return path.replace(/journal\/?$/, "");
  }
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return "/";
  return path.slice(0, lastSlash + 1);
}

async function hydrateCategoryPage() {
  const loadingNote = document.getElementById("loading-note");
  const hero = document.getElementById("category-hero");
  const introTitle = document.getElementById("category-title");
  const introHeadline = document.querySelector(".category-intro__headline");
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
    if (introHeadline)
      introHeadline.textContent =
        currentCategory.tagline || "Daily supplements with benefits for you to feel good";
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

async function hydrateBlogPage() {
  const loadingNote = document.getElementById("loading-note");
  const heroImg = document.getElementById("blog-hero-image");
  const metaEl = document.getElementById("blog-meta");
  const titleEl = document.getElementById("blog-title");
  const bodyEl = document.getElementById("blog-body");
  const cardList = document.getElementById("blog-related");

  try {
    const [content, products, postsRaw] = await Promise.all([
      fetchJSON(CONTENT_PATH),
      fetchJSON(PRODUCTS_PATH),
      fetchJSON(POSTS_PATH),
    ]);

    const categories = content?.categories || [];
    const productMap = mapProducts(products?.products || []);
    const posts = preparePosts(postsRaw || []);
    renderChrome(productMap, categories);

    const targetSlug =
      getBlogSlugFromLocation() || getStoredBlogSlug();
    const current = posts.find((p) => p.slug === targetSlug) || posts[0] || null;
    if (!current) throw new Error("No posts available");

    if (heroImg) {
      heroImg.src = resolveAssetPath(current.image_full || current.image_small || "");
      heroImg.alt = current.title || "Blog hero";
    }
    if (metaEl) metaEl.textContent = `Posted by ${current.author || "Team Purvanti"} on ${current.date}`;
    if (titleEl) titleEl.innerHTML = formatRichText(current.title) || "";
    const article = document.getElementById("blog-article");
    if (article) article.hidden = false;

    if (bodyEl) {
      bodyEl.innerHTML = "";
      (current.body || []).forEach((para) => {
        const p = document.createElement("p");
        p.innerHTML = formatRichText(para);
        bodyEl.appendChild(p);
      });
    }

    if (cardList) {
      cardList.innerHTML = "";
      posts
        .filter((p) => p.slug !== current.slug)
        .slice(0, 3)
        .forEach((post) => {
          const card = document.createElement("article");
          card.className = "blog-mini";

          const img = document.createElement("img");
          img.src = resolveAssetPath(post.image_small || post.image_full || "");
          img.alt = post.title || "Blog image";

          const meta = document.createElement("p");
          meta.className = "blog-mini__meta";
          meta.textContent = post.date || "";

          const h3 = document.createElement("h3");
          h3.className = "blog-mini__title";
          h3.innerHTML = formatRichText(post.title) || "";

          const link = document.createElement("a");
          link.className = "blog-mini__link";
          link.href = blogPageHref(post);
          link.dataset.blogSlug = post.slug || "";
          link.textContent = "Read more";
          attachBlogLinkHandlers(link, post.slug);

          card.append(img, meta, h3, link);
          cardList.appendChild(card);
        });
    }

    updateBlogPrettyPath(current);
  } catch (error) {
    console.error(error);
    if (titleEl) titleEl.textContent = "We couldn't load this article right now.";
  } finally {
    loadingNote?.remove();
  }
}

async function hydrateJournalListPage() {
  const loadingNote = document.getElementById("loading-note");
  const hero = document.getElementById("journal-hero");
  const eyebrowEl = document.querySelector(".journal-intro__eyebrow");
  const titleEl = document.querySelector(".journal-intro__title");
  const grid = document.getElementById("journal-grid");

  try {
    const [content, products, postsRaw] = await Promise.all([
      fetchJSON(CONTENT_PATH),
      fetchJSON(PRODUCTS_PATH),
      fetchJSON(POSTS_PATH),
    ]);

    const categories = content?.categories || [];
    const productMap = mapProducts(products?.products || []);
    const posts = preparePosts(postsRaw || []);
    renderChrome(productMap, categories);

    const heroData = content?.journalAll || content?.journal || {};
    renderJournalHero(hero, heroData);
    if (eyebrowEl) eyebrowEl.textContent = heroData.pre_header || "From the journal";
    if (titleEl) titleEl.textContent = heroData.header || "Fresh takes on everyday wellness";

    if (grid) {
      grid.innerHTML = "";
      posts.forEach((post) => {
        grid.appendChild(buildBlogCard(post));
      });
    }
  } catch (error) {
    console.error(error);
    if (grid) grid.textContent = "We couldn't load the journal right now.";
  } finally {
    loadingNote?.remove();
  }
}

async function hydrateAboutPage() {
  const loadingNote = document.getElementById("loading-note");
  const heroEl = document.getElementById("about-hero");
  const headlineEl = document.getElementById("about-headline");
  const panelsEl = document.getElementById("about-panels");
  const brandEl = document.getElementById("about-brand");
  const letterEl = document.getElementById("about-letter");

  try {
    const [content, products] = await Promise.all([
      fetchJSON(CONTENT_PATH),
      fetchJSON(PRODUCTS_PATH),
    ]);

    const categories = content?.categories || [];
    const productMap = mapProducts(products?.products || []);
    renderChrome(productMap, categories);

    const about = content?.about || {};
    renderAboutHero(heroEl, about.hero);
    renderAboutHeadline(headlineEl, about.headline);
    renderAboutPanels(panelsEl, about.panels);
    if (brandEl) {
      brandEl.innerHTML = "";
      const brandNode = renderStatement(about.brand_statement);
      if (brandNode) brandEl.appendChild(brandNode);
    }
    renderAboutLetter(letterEl, about.letter);
  } catch (error) {
    console.error(error);
    if (headlineEl) headlineEl.textContent = "We couldn't load this page right now.";
  } finally {
    loadingNote?.remove();
  }
}

async function hydrateContactPage() {
  const loadingNote = document.getElementById("loading-note");

  try {
    const [content, products] = await Promise.all([
      fetchJSON(CONTENT_PATH),
      fetchJSON(PRODUCTS_PATH),
    ]);

    const categories = content?.categories || [];
    const productMap = mapProducts(products?.products || []);
    renderChrome(productMap, categories);
    renderContactContent(content?.contact);
    initContactForm();
  } catch (error) {
    console.error(error);
    const note = document.querySelector("[data-contact-status]");
    if (note) {
      note.textContent = "We couldn't load the contact form right now.";
      note.classList.add("contact__status--error");
    }
  } finally {
    loadingNote?.remove();
  }
}

async function hydrateBrandsPage() {
  const loadingNote = document.getElementById("loading-note");
  const heroEl = document.getElementById("brands-hero");
  const scienceEl = document.getElementById("brands-science");
  const faqEl = document.getElementById("brands-faq");
  const statementEl = document.getElementById("brands-statement");

  try {
    const [content, products] = await Promise.all([
      fetchJSON(CONTENT_PATH),
      fetchJSON(PRODUCTS_PATH),
    ]);

    const categories = content?.categories || [];
    const productMap = mapProducts(products?.products || []);
    renderChrome(productMap, categories);

    const brands = content?.brands || {};
    renderAboutHero(heroEl, brands.hero);
    renderBrandsScience(scienceEl, brands.science);
    const faqNode = renderProductFaq(brands.faqs);
    if (faqEl && faqNode) {
      faqEl.innerHTML = "";
      faqEl.appendChild(faqNode);
    }
    if (statementEl) {
      statementEl.innerHTML = "";
      const node = renderStatement(brands.brand_statement);
      if (node) statementEl.appendChild(node);
    }
  } catch (error) {
    console.error(error);
    if (headlineEl) headlineEl.textContent = "We couldn't load this page right now.";
  } finally {
    loadingNote?.remove();
  }
}

async function hydratePolicyPage() {
  const loadingNote = document.getElementById("loading-note");

  try {
    const [content, products] = await Promise.all([
      fetchJSON(CONTENT_PATH),
      fetchJSON(PRODUCTS_PATH),
    ]);

    const categories = content?.categories || [];
    const productMap = mapProducts(products?.products || []);
    renderChrome(productMap, categories);
  } catch (error) {
    console.error(error);
  } finally {
    loadingNote?.remove();
  }
}

function renderContactContent(contact = {}) {
  const hero = contact.hero || {};
  const heroEyebrow = document.querySelector("[data-contact-hero-eyebrow]");
  const heroTitle = document.querySelector("[data-contact-hero-title]");
  const heroBody = document.querySelector("[data-contact-hero-body]");
  if (heroEyebrow) heroEyebrow.textContent = hero.pre_header || heroEyebrow.textContent || "Contact";
  if (heroTitle) heroTitle.textContent = hero.header || heroTitle.textContent || "We're here to help";
  if (heroBody)
    heroBody.textContent =
      hero.subhead ||
      heroBody.textContent ||
      "Questions about products, ingredients, or your order? Reach out and our team will respond quickly.";

  const banner = contact.banner_full || {};
  const heroImg = document.querySelector("[data-contact-hero-img]");
  if (heroImg) {
    const imgSrc =
      banner.image || banner.media?.desktop || banner.media?.mobile || hero.image || heroImg.src || "";
    heroImg.src = resolveAssetPath(imgSrc);
    heroImg.alt = banner.header || hero.header || heroImg.alt || "Contact banner";
  }

  const phoneLink = document.querySelector("[data-contact-phone]");
  const emailLink = document.querySelector("[data-contact-email]");
  const phoneNumber = "1 (720) 419-1089";
  const phoneHref = "tel:17204191089";
  const emailAddress = "hello@purvanti.com";
  if (phoneLink) {
    phoneLink.textContent = phoneNumber;
    phoneLink.href = phoneHref;
  }
  if (emailLink) {
    emailLink.textContent = emailAddress;
    emailLink.href = `mailto:${emailAddress}`;
  }
}

function initContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const statusEl = form.querySelector("[data-contact-status]");
  const submitBtn = form.querySelector("[type='submit']");
  const defaultText = submitBtn?.textContent || "";

  const setStatus = (message, state) => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove("contact__status--success", "contact__status--error");
    if (state) statusEl.classList.add(`contact__status--${state}`);
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
    }
    const formData = new FormData(form);
    const payload = buildFormPayload(form, formData);
    const formName = form.dataset.formName || "contact_main";
    try {
      const res = await recordFormSubmission(formName, payload);
      if (res?.ok === false) {
        throw new Error(res?.error || "Submission failed");
      }
      form.reset();
      setStatus("Thanks! We'll be in touch soon.", "success");
    } catch (error) {
      console.error(error);
      setStatus("Something went wrong. Please try again later.", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = defaultText;
      }
    }
  });
}

function buildFormPayload(form, formData) {
  const entries = typeof formData?.entries === "function" ? Array.from(formData.entries()) : [];
  const formDict = {};
  const formMeta = {};

  entries
    .filter(([name]) => typeof name === "string" && !name.startsWith("_"))
    .forEach(([name, value]) => {
      const key = name;
      const control = form?.querySelector(`[name="${CSS.escape(name)}"]`);
      const label = findControlLabel(control, form);
      const normalized = normalizeSubmissionValue(value);
      formDict[key] = normalized;
      if (label) {
        formMeta[key] = label;
      }
    });

  return {
    page_url: window.location.href,
    submitted_utc: new Date().toISOString(),
    form: formDict,
    form_meta: formMeta,
  };
}

function findControlLabel(control, form) {
  if (!control || !form) return "";
  const id = control.id;
  if (id) {
    const label = form.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent) return label.textContent.trim();
  }
  const parentLabel = control.closest("label");
  if (parentLabel?.textContent) return parentLabel.textContent.trim();
  return control.getAttribute("aria-label") || control.placeholder || control.name || "";
}

function addConfirmationStep(account, emailVal) {
  if (!account) return null;

  const existing = account.querySelector(".cart__code");
  if (existing) {
    const inputs = Array.from(existing.querySelectorAll(".cart__code-input"));
    const hiddenReqExisting = existing.querySelector("#confirmation_req");
    inputs.forEach((input) => {
      input.value = "";
      input.disabled = false;
      input.classList.remove("is-error");
    });
    const hiddenExisting = existing.querySelector('input[name="account_code"]');
    if (hiddenExisting) hiddenExisting.value = "";
    if (hiddenReqExisting) hiddenReqExisting.value = "";
    existing.dataset.email = emailVal || existing.dataset.email || "";
    inputs[0]?.focus();
    return existing;
  }

  const codeField = document.createElement("div");
  codeField.className = "cart__account-field cart__code";
  codeField.dataset.email = emailVal || "";

  const codeLabel = document.createElement("span");
  codeLabel.textContent = "Confirmation code";

  const hiddenInput = document.createElement("input");
  hiddenInput.type = "hidden";
  hiddenInput.name = "account_code";

  const hiddenReq = document.createElement("input");
  hiddenReq.type = "hidden";
  hiddenReq.id = "confirmation_req";
  hiddenReq.name = "confirmation_req";

  const inputsWrap = document.createElement("div");
  inputsWrap.className = "cart__code-grid";
  const codeInputs = Array.from({ length: 6 }, () => {
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.pattern = "[1-9]";
    input.maxLength = 1;
    input.autocomplete = "one-time-code";
    input.className = "cart__code-input";
    return input;
  });
  codeInputs.forEach((input) => inputsWrap.appendChild(input));

  codeField.append(codeLabel, inputsWrap, hiddenInput, hiddenReq);

  const note = document.createElement("p");
  note.className = "cart__code-note";
  note.textContent = "Enter the 6-digit code we sent. It submits automatically when complete.";

  const message = document.createElement("p");
  message.className = "cart__code-message";
  message.hidden = true;

  const actions = account;
  const loginBtn = actions.querySelector(".cart__login");
  if (loginBtn) {
    actions.insertBefore(message, loginBtn);
    actions.insertBefore(note, loginBtn);
    actions.insertBefore(codeField, note);
  } else {
    actions.append(codeField, note, message);
  }

  wireConfirmationInputs(account, codeInputs, hiddenInput);
  return codeField;
}

function wireConfirmationInputs(account, codeInputs, hiddenInput) {
  const total = codeInputs.length;
  if (!total) return;

  const updateHiddenValue = () => {
    hiddenInput.value = codeInputs.map((input) => input.value).join("");
  };

  const maybeSubmit = () => {
    if (account.dataset.locked === "true") return;
    const code = codeInputs.map((input) => input.value).join("");
    hiddenInput.value = code;
    if (code.length === total) {
      handleLocalCode(account, codeInputs);
    }
  };

  const handlePaste = (event, startIndex) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text") || "";
    const digits = text.replace(/[^1-9]/g, "").slice(0, total);
    if (!digits) return;
    digits.split("").forEach((char, offset) => {
      const target = codeInputs[startIndex + offset];
      if (target) {
        target.value = char;
      }
    });
    const nextIndex = Math.min(startIndex + digits.length, total - 1);
    codeInputs[nextIndex]?.focus();
    updateHiddenValue();
    maybeSubmit();
  };

  codeInputs.forEach((input, index) => {
    input.addEventListener("input", (event) => {
      const value = (event.target.value || "").replace(/[^1-9]/g, "").slice(0, 1);
      event.target.value = value;
      input.classList.remove("is-error");
      if (value && index < total - 1) {
        codeInputs[index + 1].focus();
      }
      updateHiddenValue();
      maybeSubmit();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !input.value && index > 0) {
        codeInputs[index - 1].focus();
        codeInputs[index - 1].value = "";
        updateHiddenValue();
        event.preventDefault();
      }
      if (event.key === "ArrowLeft" && index > 0) {
        codeInputs[index - 1].focus();
      }
      if (event.key === "ArrowRight" && index < total - 1) {
        codeInputs[index + 1].focus();
      }
    });

    input.addEventListener("paste", (event) => handlePaste(event, index));
  });

  codeInputs[0]?.focus();
}

function getAccountMessage(account) {
  if (!account) return null;
  let message = account.querySelector(".cart__code-message");
  if (message) return message;
  message = document.createElement("p");
  message.className = "cart__code-message";
  message.hidden = true;
  const loginBtn = account.querySelector(".cart__login");
  if (loginBtn) {
    account.insertBefore(message, loginBtn);
  } else {
    account.appendChild(message);
  }
  return message;
}

function showAccountMessage(account, text, tone = "info") {
  const message = getAccountMessage(account);
  if (!message) return;
  message.textContent = text;
  message.dataset.tone = tone;
  message.hidden = false;
  message.style.display = "";
}

function hideAccountMessage(account) {
  const message = account?.querySelector(".cart__code-message");
  if (!message) return;
  message.textContent = "";
  message.hidden = true;
  delete message.dataset.tone;
  message.style.display = "";
}

function handleLocalCode(account, codeInputs) {
  if (!account || !Array.isArray(codeInputs) || !codeInputs.length) return;
  const emailInput = account.querySelector('input[name="account_email"]');
  const loginBtn = account.querySelector(".cart__login");
  const message = getAccountMessage(account);
  const hiddenInput = account.querySelector('input[name="account_code"]');
  const hiddenReq = account.querySelector("#confirmation_req");
  const code = codeInputs.map((input) => input.value).join("");
  const expectedList = (Array.isArray(EMAIL_CONFIRM_DEFAULT) ? EMAIL_CONFIRM_DEFAULT : [EMAIL_CONFIRM_DEFAULT]).map(
    (val) => val?.toString().slice(0, codeInputs.length)
  );

  if (!emailInput?.value?.trim()) {
    emailInput?.classList.add("is-error");
    emailInput?.focus();
    return;
  }

  const resetInputs = () => {
    codeInputs.forEach((input, index) => {
      input.disabled = false;
      input.value = "";
      input.classList.remove("is-error");
      if (index === 0) input.focus();
    });
    if (hiddenInput) hiddenInput.value = "";
    if (hiddenReq) hiddenReq.value = "";
  };

  const showMessage = (text, tone = "info") => {
    if (!message) return;
    message.textContent = text;
    message.dataset.tone = tone;
    message.hidden = false;
    message.style.display = "";
  };

  if (!expectedList.includes(code)) {
    const failCount = Number(account.dataset.codeFailCount || "0") + 1;
    account.dataset.codeFailCount = String(failCount);
    showMessage(
      failCount > 1
        ? "Too many attempts. To keep things secure, please try again in 5 minutes."
        : "That code didn’t match. Please try again.",
      "error"
    );
    codeInputs.forEach((input) => input.classList.add("is-error"));
    resetInputs();

    if (failCount > 1) {
      if (emailInput) emailInput.value = "";
      account.dataset.locked = "true";
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = "Try again in 5 minutes";
      }
      codeInputs.forEach((input) => (input.disabled = true));
      setTimeout(() => {
        delete account.dataset.locked;
        account.dataset.codeFailCount = "0";
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = "Resend Confirmation Code";
        }
        resetInputs();
        showMessage("You can try again now. Request a new code to continue.", "info");
      }, 5 * 60 * 1000);
    }
    return;
  }

  if (hiddenInput) hiddenInput.value = code;
  if (hiddenReq && !hiddenReq.value) hiddenReq.value = code;
  account.dataset.codeVerified = "true";
  account.dataset.codeFailCount = "0";
  showMessage("Code verified! Please complete your account details to finish.", "success");
  codeInputs.forEach((input) => (input.disabled = true));
  hideConfirmationUI(account, { hideMessage: true });
  if (loginBtn) loginBtn.textContent = "Create Account";
  showAccountCreateFields(account);
}

function showAccountCreateFields(account) {
  if (!account) return;
  if (account.querySelector(".cart__account-extra")) return;
  hideConfirmationUI(account, { hideMessage: true });

  const createField = (labelText, name, type = "text", attrs = {}) => {
    const wrap = document.createElement("label");
    wrap.className = "cart__account-field";
    const label = document.createElement("span");
    label.textContent = labelText;
    const input = document.createElement("input");
    input.type = type;
    input.name = name;
    input.required = true;
    Object.entries(attrs || {}).forEach(([key, val]) => {
      input.setAttribute(key, val);
    });
    wrap.append(label, input);
    return { wrap, input };
  };

  const container = document.createElement("div");
  container.className = "cart__account-extra";

  const first = createField("First Name", "account_first_name");
  const last = createField("Last Name", "account_last_name");
  const phone = createField("Phone Number", "account_phone", "tel", { inputmode: "tel" });
  const password = createField("Password", "account_password", "password");

  [first.wrap, last.wrap, phone.wrap, password.wrap].forEach((node) => container.appendChild(node));

  const loginBtn = account.querySelector(".cart__login");
  if (loginBtn) {
    account.insertBefore(container, loginBtn);
  } else {
    account.appendChild(container);
  }
}

function removeAccountCreateFields(account) {
  if (!account) return;
  const extra = account.querySelector(".cart__account-extra");
  if (extra) extra.remove();
  delete account.dataset.codeVerified;
}

function clearConfirmationState(account) {
  if (!account) return;
  delete account.dataset.codeFailCount;
  delete account.dataset.locked;
  delete account.dataset.codeVerified;
  const codeInputs = Array.from(account.querySelectorAll(".cart__code-input"));
  codeInputs.forEach((input, index) => {
    input.value = "";
    input.disabled = false;
    input.classList.remove("is-error");
    if (index === 0) input.focus();
  });
  const message = account.querySelector(".cart__code-message");
  if (message) {
    message.textContent = "";
    message.hidden = true;
    delete message.dataset.tone;
    message.style.display = "";
  }
  const hiddenInput = account.querySelector('input[name="account_code"]');
  if (hiddenInput) hiddenInput.value = "";
  const codeField = account.querySelector(".cart__code");
  const codeNote = account.querySelector(".cart__code-note");
  if (codeField) {
    codeField.hidden = false;
    codeField.style.display = "";
  }
  if (codeNote) {
    codeNote.hidden = false;
    codeNote.style.display = "";
  }
}

function resetAccountForm(account, { keepCompletion = false } = {}) {
  if (!account) return;
  if (!keepCompletion) delete account.dataset.completed;
  account.classList.remove("is-open");
  account.hidden = true;
  hideAccountMessage(account);
  clearConfirmationState(account);
  removeAccountCreateFields(account);
  const emailInput = account.querySelector('input[name="account_email"]');
  const passwordField = account.querySelector('input[name="account_password"]')?.closest(".cart__account-field");
  const passwordInput = account.querySelector('input[name="account_password"]');
  const signupToggle = account.querySelector(".cart__signup");
  const loginBtn = account.querySelector(".cart__login");
  const resetBtn = account.querySelector(".cart__reset");
  const hiddenReq = account.querySelector("#confirmation_req");
  if (hiddenReq) hiddenReq.value = "";
  if (emailInput) {
    emailInput.value = "";
    emailInput.classList.remove("is-error");
  }
  if (passwordInput) {
    passwordInput.value = "";
    passwordInput.classList.remove("is-error");
  }
  if (passwordField) {
    passwordField.hidden = false;
    passwordField.classList.remove("is-hidden");
  }
  if (signupToggle) {
    signupToggle.classList.remove("is-signup");
    signupToggle.textContent = "Sign Up";
  }
  if (loginBtn) {
    loginBtn.textContent = "Login";
    loginBtn.disabled = false;
  }
  if (resetBtn) resetBtn.hidden = false;
  const checkoutBtn = cartUI?.checkout || document.querySelector(".cart__checkout");
  if (checkoutBtn) {
    checkoutBtn.textContent = "Checkout";
    checkoutBtn.classList.remove("is-proceed");
  }
}

function showCheckoutMessage(message, tone = "error") {
  const el = cartUI.checkoutMessage;
  if (!el) return;
  el.textContent = message;
  el.dataset.tone = tone;
  el.hidden = false;
}

function hideCheckoutMessage() {
  const el = cartUI.checkoutMessage;
  if (!el) return;
  el.textContent = "";
  el.hidden = true;
  delete el.dataset.tone;
}

async function handleCheckoutRedirect(messageEl) {
  hideCheckoutMessage();
  loadCartState();
  const items =
    cartState.items?.map((item) => {
      const product =
        cartProductMap.get(item.id) ||
        cartProductMap.get(Number(item.id)) ||
        cartProductMap.get(item.handle) ||
        cartProductMap.get((item.handle || "").toLowerCase());
      const variantId = item.shopify_variant_id || product?.shopify_variant_id;
      return {
        ...item,
        shopify_variant_id: variantId,
      };
    }) || [];

  const validItems = items.filter(
    (item) => item.shopify_variant_id && Number(item.qty) > 0
  );

  console.log("[checkout] attempting redirect", { items: validItems });
  if (!validItems.length) {
    showCheckoutMessage("No checkout items found. Please add products to your cart.", "error");
    console.warn("[checkout] no valid Shopify items to checkout");
    return;
  }

  try {
    await goToShopifyCheckoutStorefront(
      { items: validItems },
      { shopDomain: SHOPIFY_DOMAIN, storefrontToken: SHOPIFY_TOKEN }
    );
  } catch (error) {
    console.error("[checkout] storefront checkout failed", error);
    showCheckoutMessage("Checkout is unavailable right now. Please try again in a moment.", "error");
  }
}

function hideConfirmationUI(account) {
  hideConfirmationUI(account, {});
}

function hideConfirmationUI(account, { hideMessage = false } = {}) {
  const codeField = account?.querySelector(".cart__code");
  const codeNote = account?.querySelector(".cart__code-note");
  const message = account?.querySelector(".cart__code-message");
  if (codeField) {
    codeField.hidden = true;
    codeField.style.display = "none";
  }
  if (codeNote) {
    codeNote.hidden = true;
    codeNote.style.display = "none";
  }
  if (hideMessage && message) {
    message.hidden = true;
    message.style.display = "none";
  }
}

async function handleAccountCreate(account, loginBtn) {
  if (!account || !loginBtn) return;
  const emailInput = account.querySelector('input[name="account_email"]');
  const firstInput = account.querySelector('input[name="account_first_name"]');
  const lastInput = account.querySelector('input[name="account_last_name"]');
  const phoneInput = account.querySelector('input[name="account_phone"]');
  const passwordInput =
    account.querySelector('.cart__account-extra input[name="account_password"]') ||
    account.querySelector('.cart__account-field input[name="account_password"]:not(.is-hidden)');
  const codeInput = account.querySelector('input[name="account_code"]');
  const message = account.querySelector(".cart__code-message");

  const allInputs = [emailInput, firstInput, lastInput, phoneInput, passwordInput];
  allInputs.forEach((input) => input?.classList.remove("is-error"));

  const visibleInputs = allInputs.filter((input) => input && input.offsetParent !== null);
  const missing = visibleInputs.find((input) => !input?.value?.trim());
  if (missing) {
    missing.classList.add("is-error");
    missing.focus();
    if (message) {
      message.textContent = "Please complete all required fields to continue.";
      message.dataset.tone = "error";
      message.hidden = false;
    }
    return;
  }

  loginBtn.disabled = true;
  const defaultText = loginBtn.textContent || "Create Account";
  loginBtn.textContent = "Creating...";

  try {
    const formData = new FormData();
    formData.append("account_email", emailInput.value.trim());
    formData.append("account_first_name", firstInput.value.trim());
    formData.append("account_last_name", lastInput.value.trim());
    formData.append("account_phone", phoneInput.value.trim());
    formData.append("account_password", passwordInput.value.trim());
    formData.append("account_code", codeInput?.value || EMAIL_CONFIRM_DEFAULT);
    formData.append("cart", JSON.stringify(cartState || {}));
    const payload = buildFormPayload(account, formData);
    const res = await recordFormSubmission("purvanti_account_create", payload);
    if (res?.ok === false) throw new Error(res?.error || "Submission failed");
    if (message) {
      message.textContent = "Account created! You're all set.";
      message.dataset.tone = "success";
      message.hidden = false;
    }
    finalizeAccountSuccess(account);
  } catch (error) {
    console.error(error);
    if (message) {
      message.textContent = "Something went wrong creating your account. Please try again.";
      message.dataset.tone = "error";
      message.hidden = false;
    }
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = defaultText;
  }
}

function finalizeAccountSuccess(account) {
  if (!account) return;
  account.dataset.completed = "true";
  account.classList.remove("is-open");
  account.hidden = true;
  hideAccountMessage(account);
  hideConfirmationUI(account, { hideMessage: true });
  const checkoutBtn = cartUI?.checkout || document.querySelector(".cart__checkout");
  if (checkoutBtn) {
    checkoutBtn.textContent = "Proceed to Checkout";
    checkoutBtn.classList.add("is-proceed");
  }
  const signupToggle = account.querySelector(".cart__signup");
  if (signupToggle) signupToggle.hidden = true;
}

function normalizeSubmissionValue(value) {
  if (value == null) return "";
  if (value instanceof File) return value.name;
  if (Array.isArray(value)) return value.map(normalizeSubmissionValue).join(", ");
  return value.toString();
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

function rewriteBlogAnchors() {
  document.querySelectorAll('a[href*="journal"]').forEach((anchor) => {
    const explicit = anchor.dataset.blogSlug || "";
    const href = anchor.getAttribute("href") || "";
    const params = new URLSearchParams(href.split("?")[1] || "");
    const slug = explicit || params.get("slug") || extractBlogSlug(href) || "";
    if (!slug) return;
    attachBlogLinkHandlers(anchor, slug);
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

function getStoredBlogSlug() {
  try {
    return sessionStorage.getItem("purvanti:lastBlogSlug");
  } catch (error) {
    console.warn("Could not read stored blog slug", error);
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

function updateBlogPrettyPath(post) {
  if (!post?.slug) return;
  const base = getBasePath().replace(/\/$/, "");
  const target = `${base}/journal/${post.slug}`;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== target) {
    window.history.replaceState({}, "", target);
  }
  try {
    sessionStorage.setItem("purvanti:lastBlogSlug", post.slug);
  } catch (error) {
    console.warn("Could not store blog slug", error);
  }
}

function attachBlogLinkHandlers(anchor, slug) {
  const normalizedSlug = slug || anchor.dataset.blogSlug || "";
  if (!normalizedSlug) return;
  const href = blogPageHref({ slug: normalizedSlug });
  anchor.href = href;
  anchor.dataset.blogSlug = normalizedSlug;

  const storeSlug = () => {
    try {
      sessionStorage.setItem("purvanti:lastBlogSlug", normalizedSlug);
    } catch (error) {
      console.warn("Could not store blog slug", error);
    }
  };

  const ensureHref = () => {
    anchor.href = buildBlogHref({ slug: normalizedSlug });
  };

  anchor.addEventListener("click", () => {
    storeSlug();
    ensureHref();
  });
  anchor.addEventListener("auxclick", () => {
    storeSlug();
    ensureHref();
  });
  anchor.addEventListener("mousedown", storeSlug);
}

function extractBlogSlug(href) {
  if (!href) return "";
  const fromHash = href.includes("#")
    ? new URLSearchParams(href.split("#")[1]).get("slug")
    : null;
  if (fromHash) return fromHash;
  const params = new URLSearchParams(href.split("?")[1] || "");
  const fromQuery = params.get("slug");
  if (fromQuery) return fromQuery;
  const match = href.match(/journal\/([^/?#]+)/i);
  return match ? match[1] : "";
}

function getBlogSlugFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("slug");
  if (fromQuery) return fromQuery;

  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const fromHash = hashParams.get("slug");
    if (fromHash) return fromHash;
  }

  const match = window.location.pathname.match(/\/journal\/([^/?#]+)/i);
  if (match) return match[1];

  return null;
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
  const desktopVideo = data.video_desktop || data.video?.[0] || "";
  const mobileVideo =
    data.video_mobile ||
    (Array.isArray(data.video) ? data.video[1] || data.video[0] || "" : "");
  const videoPoster =
    data.video_desktop_still || data.video_mobile_still || data.images?.[0] || "";
  video.poster = videoPoster;

  if (desktopVideo) {
    const sourceDesktop = document.createElement("source");
    sourceDesktop.src = desktopVideo;
    sourceDesktop.type = "video/mp4";
    sourceDesktop.media = "(min-width: 769px)";
    video.appendChild(sourceDesktop);
  }

  if (mobileVideo) {
    const sourceMobile = document.createElement("source");
    sourceMobile.src = mobileVideo;
    sourceMobile.type = "video/mp4";
    sourceMobile.media = "(max-width: 768px)";
    video.appendChild(sourceMobile);
  }

  const fallback = document.createElement("img");
  fallback.className = "hero-block__fallback";
  fallback.alt = data.header || "hero background";
  fallback.src = videoPoster || data.images?.[0] || "";

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

  (data.product_ids || []).forEach((id, idx) => {
    const product = productMap.get(id);
    if (!product) return;
    const card = renderProductCard(product, { section: "featured_collection", index: idx });
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

function renderProductCard(product, meta) {
  return buildHomeProductCard(product, "home-product-card", meta);
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

function blogPageHref(post) {
  const slug = post?.slug;
  if (slug) return `${getBasePath()}journal/${slug}`;
  return "/journal";
}

function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return `$${amount.toFixed(2)}`;
}

function productMedia(product) {
  if (window?.purvantiShared?.productMediaShared) {
    return window.purvantiShared.productMediaShared(product);
  }
  const pid = product?.id || product?.handle;
  const existing = product?.media || {};
  const full =
    (existing.full && existing.full.length && existing.full) ||
    (pid
      ? [
          `assets/images/products/primary/full/${pid}.png`,
          `assets/images/products/secondary/full/${pid}.png`,
        ]
      : []);
  const mobile =
    (existing.mobile && existing.mobile.length && existing.mobile) ||
    (pid
      ? [
          `assets/images/products/primary/small/${pid}.png`,
          `assets/images/products/secondary/small/${pid}.png`,
        ]
      : []);
  return { full, mobile };
}

function productImageSrc(product, size = "small", idx = 0) {
  if (window?.purvantiShared?.productImageSrcShared) {
    return window.purvantiShared.productImageSrcShared(product, size, idx);
  }
  const media = productMedia(product);
  const list = size === "full" ? media.full : media.mobile;
  const fallback = size === "full" ? media.mobile : media.full;
  return list[idx] || fallback[idx] || list[0] || fallback[0] || "";
}

function buildAddToCartButton(product, variant = "pill") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `cart-btn cart-btn--${variant}`;
  btn.textContent = variant === "icon" ? "+" : "Add to cart";
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    addToCart(product, 1);
    openCartDrawer();
  });
  return btn;
}

function renderCategoryHero(target, category) {
  if (!target) return;
  target.hidden = false;
  target.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "category-hero__inner";

  const media = document.createElement("div");
  media.className = "category-hero__media";

  const fallback = document.createElement("img");
  fallback.className = "category-hero__fallback";
  fallback.src = resolveAssetPath(
    category.video_still || category.image || "assets/images/main/home-hero-full.jpg"
  );
  fallback.alt = category.category || "Category banner";

  const video = document.createElement("video");
  video.className = "category-hero__video";
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.poster = resolveAssetPath(
    category.video_still || category.image || "assets/images/main/home-hero-full.jpg"
  );
  const source = document.createElement("source");
  source.src = resolveAssetPath(category.video || "assets/videos/home-banner-bg.mp4");
  source.type = "video/mp4";
  video.appendChild(source);
  video.addEventListener("error", () => {
    video.hidden = true;
  });

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
  media.append(fallback, video, mediaOverlay);
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

  const frame = document.createElement("div");
  frame.className = "category-card__frame";

  const media = document.createElement("div");
  media.className = "category-card__media";
  const img = document.createElement("img");
  img.src = productImageSrc(product, "small", 0);
  img.alt = product.title_short || product.title_long || "Product";
  media.appendChild(img);
  frame.appendChild(media);

  const body = document.createElement("div");
  body.className = "category-card__body";

  const header = document.createElement("div");
  header.className = "category-card__header";

  const name = document.createElement("h3");
  name.className = "category-card__name";
  name.textContent = product.title_short || product.title_long || "Product";

  const rating = document.createElement("div");
  rating.className = "category-card__rating";

  const stars = document.createElement("span");
  stars.className = "category-card__stars";
  stars.textContent = "★★★★★";

  const reviews = document.createElement("span");
  reviews.className = "category-card__reviews";
  const reviewCount =
    product.reviews != null
      ? product.reviews
      : (product.reviews_data || []).length || 0;
  const formatReviewCount = (count) => {
    const n = Number(count);
    if (!Number.isFinite(n)) return "0";
    return n.toLocaleString("en-US");
  };
  const reviewLabel =
    reviewCount && Number(reviewCount) > 0
      ? `${formatReviewCount(reviewCount)} reviews`
      : "No reviews";
  reviews.textContent = reviewLabel;

  rating.append(stars, reviews);
  header.append(name, rating);

  const metaRow = document.createElement("div");
  metaRow.className = "category-card__meta-row";

  const brandWrap = document.createElement("div");
  brandWrap.className = "category-card__brand-wrap";

  const brand = document.createElement("p");
  brand.className = "category-card__brand";
  brand.textContent = product.brand || product.category || "";
  brandWrap.appendChild(brand);

  const addBtn = buildAddToCartButton(product, "ghost");
  addBtn.classList.add("category-card__cta");
  brandWrap.appendChild(addBtn);

  const price = document.createElement("p");
  price.className = "category-card__price";
  price.textContent = formatPrice(product.price);

  metaRow.append(brandWrap, price);

  body.append(header, metaRow);
  card.append(frame, body);
  return card;
}

function buildHomeProductCard(product, extraClass, meta) {
  const card = renderCategoryProductCard(product);
  if (extraClass) card.classList.add(extraClass);
  if (meta && typeof meta === "object") {
    card.dataset.assignSection = meta.section || "";
    card.dataset.assignIndex = String(meta.index ?? "");
  }
  return card;
}

function initDevAssignTool(homeSections, productMap) {
  const slotMap = homeSections.reduce((map, block) => {
    if (block && block.section) map[block.section] = block;
    return map;
  }, {});

  const overlay =
    document.querySelector(".dev-assign") ||
    buildDevAssignOverlay(uniqueProducts(productMap), homeSections);

  function buildDevAssignOverlay(products, homeBlocks) {
    const categories = Array.from(
      new Set(
        homeBlocks
          .flatMap((block) => block.section === "categories" ? [] : [])
          .concat(products.map((p) => p.category || "").filter(Boolean))
      )
    ).sort((a, b) => a.localeCompare(b));

    const wrap = document.createElement("div");
    wrap.className = "dev-assign";
    wrap.innerHTML = `
      <div class="dev-assign__backdrop" data-assign-close></div>
      <aside class="dev-assign__drawer">
        <header class="dev-assign__head">
          <div>
            <p class="dev-assign__eyebrow">Dev assign mode</p>
            <h4 class="dev-assign__title">Pick a product</h4>
          </div>
          <button type="button" class="dev-assign__close" data-assign-close aria-label="Close">&times;</button>
        </header>
        <div class="dev-assign__filters" data-assign-filters></div>
        <div class="dev-assign__slot" data-assign-slot>Slot: -</div>
        <p class="dev-assign__hint">Click a product below to generate a patch note for content.json.</p>
        <div class="dev-assign__list" data-assign-list></div>
        <div class="dev-assign__result" data-assign-result hidden></div>
      </aside>
    `;
    document.body.appendChild(wrap);

    const activeFilters = new Set();
    const filterWrap = wrap.querySelector("[data-assign-filters]");
    if (filterWrap) {
      categories.forEach((cat) => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "dev-assign__pill";
        pill.textContent = cat;
        pill.addEventListener("click", () => {
          if (activeFilters.has(cat)) {
            activeFilters.delete(cat);
            pill.classList.remove("is-active");
          } else {
            activeFilters.add(cat);
            pill.classList.add("is-active");
          }
          renderList();
        });
        filterWrap.appendChild(pill);
      });
    }

    const list = wrap.querySelector("[data-assign-list]");
    const assignedIds = new Set(
      homeBlocks
        .flatMap((block) => Array.isArray(block.product_ids) ? block.product_ids : [])
        .filter(Boolean)
    );

    function renderList() {
      if (!list) return;
      list.innerHTML = "";
      products
        .slice()
        .sort((a, b) => (b.reviews || 0) - (a.reviews || 0))
        .filter((product) => {
          if (!activeFilters.size) return true;
          return activeFilters.has(product.category || "");
        })
        .forEach((product) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "dev-assign__product";
          if (assignedIds.has(product.id)) btn.classList.add("is-assigned");
          btn.dataset.productId = product.id;
          btn.innerHTML = `
            <span class="dev-assign__thumb">
              <img src="${productImageSrc(product, "small", 0)}" alt="${product.title_short || "Product"}" />
            </span>
            <span class="dev-assign__meta">
              <span class="dev-assign__product-category">${product.category || ""}</span>
              <span class="dev-assign__product-brand">${product.brand || ""}</span>
              <span class="dev-assign__product-name">${product.title_short || product.title_long || ""}</span>
            </span>
          `;
          btn.addEventListener("click", () => {
            if (!wrap.dataset.currentSlot) return;
            const { section, index } = JSON.parse(wrap.dataset.currentSlot);
            const res = wrap.querySelector("[data-assign-result]");
            if (res) {
              res.hidden = false;
              res.textContent = `Set ${section}.product_ids[${index}] = "${product.id}" in content.json`;
            }
          });
          list.appendChild(btn);
        });
    }

    renderList();

    wrap.querySelectorAll("[data-assign-close]").forEach((el) =>
      el.addEventListener("click", () => wrap.classList.remove("is-open"))
    );

    return wrap;
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-assign-section]");
    if (!target) return;
    if (!(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    const section = target.dataset.assignSection;
    const index = Number(target.dataset.assignIndex || 0);
    const block = slotMap[section];
    const slotLabel = `${section}.product_ids[${index}]`;
    overlay.dataset.currentSlot = JSON.stringify({ section, index, block });
    const slotEl = overlay.querySelector("[data-assign-slot]");
    const result = overlay.querySelector("[data-assign-result]");
    if (slotEl) slotEl.textContent = `Slot: ${slotLabel}`;
    if (result) {
      result.hidden = true;
      result.textContent = "";
    }
    overlay.classList.add("is-open");
  });
}

function renderJournalHero(target, hero) {
  if (!target) return;
  target.hidden = false;
  target.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "journal-hero__inner";

  const img = document.createElement("img");
  img.className = "journal-hero__image";
  img.src = resolveAssetPath(hero.image || "assets/images/main/home-banner-runner-full.jpg");
  img.alt = hero.header || "Journal banner";

  const overlay = document.createElement("div");
  overlay.className = "journal-hero__overlay";

  wrap.append(img, overlay);
  target.appendChild(wrap);
}

function renderAboutHero(target, hero) {
  if (!target) return;
  target.hidden = false;
  target.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "about-hero__inner";

  const img = document.createElement("img");
  img.className = "about-hero__image";
  img.src = resolveAssetPath(hero?.image || "assets/images/main/home-banner-runner-full.jpg");
  img.alt = hero?.header || "About hero";

  const overlay = document.createElement("div");
  overlay.className = "about-hero__overlay";

  const content = document.createElement("div");
  content.className = "about-hero__content";

  if (hero?.pre_header) {
    const eyebrow = document.createElement("p");
    eyebrow.className = "about-hero__eyebrow";
    eyebrow.textContent = hero.pre_header;
    content.appendChild(eyebrow);
  }

  if (hero?.header) {
    const h = document.createElement("h1");
    h.className = "about-hero__title";
    h.innerHTML = formatRichText(hero.header);
    content.appendChild(h);
  }

  if (hero?.subhead) {
    const sub = document.createElement("p");
    sub.className = "about-hero__subhead";
    sub.textContent = hero.subhead;
    content.appendChild(sub);
  }

  wrap.append(img, overlay, content);
  target.appendChild(wrap);
}

function renderAboutHeadline(target, data) {
  if (!target) return;
  target.innerHTML = "";
  if (!data) return;
  const wrap = document.createElement("div");
  wrap.className = "about-headline__inner";

  if (data.eyebrow) {
    const eyebrow = document.createElement("p");
    eyebrow.className = "about-headline__eyebrow";
    eyebrow.textContent = data.eyebrow;
    wrap.appendChild(eyebrow);
  }

  if (data.title) {
    const title = document.createElement("h2");
    title.className = "about-headline__title";
    title.innerHTML = formatRichText(data.title);
    wrap.appendChild(title);
  }

  if (Array.isArray(data.images_inline) && data.images_inline.length) {
    const inline = document.createElement("div");
    inline.className = "about-headline__inline";
    data.images_inline.forEach((src) => {
      const img = document.createElement("img");
      img.src = resolveAssetPath(src);
      img.alt = "detail";
      inline.appendChild(img);
    });
    wrap.appendChild(inline);
  }

  target.appendChild(wrap);
}

function renderAboutPanels(target, panels) {
  if (!target) return;
  target.innerHTML = "";
  const list = Array.isArray(panels) ? panels : [];
  list.forEach((panel, idx) => {
    const row = document.createElement("div");
    row.className = "about-panel";
    const imageCol = document.createElement("div");
    imageCol.className = "about-panel__media";
    const img = document.createElement("img");
    img.src = resolveAssetPath(panel.image || "");
    img.alt = panel.title || "About image";
    imageCol.appendChild(img);

    const textCol = document.createElement("div");
    textCol.className = "about-panel__content";
    const title = document.createElement("h3");
    title.textContent = panel.title || "";
    const body = document.createElement("p");
    body.textContent = panel.body || "";
    textCol.append(title, body);

    if (idx % 2 === 0) {
      row.append(imageCol, textCol);
    } else {
      row.append(textCol, imageCol);
    }
    target.appendChild(row);
  });
}

function renderAboutLetter(target, data) {
  if (!target) return;
  target.hidden = false;
  target.innerHTML = "";
  if (!data) return;

  const wrap = document.createElement("div");
  wrap.className = "about-letter__inner";
  wrap.style.backgroundImage = `url('${resolveAssetPath(data.image || "")}')`;

  const overlay = document.createElement("div");
  overlay.className = "about-letter__overlay";

  const content = document.createElement("div");
  content.className = "about-letter__content";
  if (data.eyebrow) {
    const eyebrow = document.createElement("p");
    eyebrow.className = "about-letter__eyebrow";
    eyebrow.textContent = data.eyebrow;
    content.appendChild(eyebrow);
  }
  if (data.quote) {
    const quote = document.createElement("h3");
    quote.className = "about-letter__quote";
    quote.textContent = data.quote;
    content.appendChild(quote);
  }

  wrap.append(overlay, content);
  target.appendChild(wrap);
}

function renderAboutTeam(target, team) {
  if (!target) return;
  target.innerHTML = "";
  const list = Array.isArray(team) ? team : [];
  if (!list.length) return;

  const wrap = document.createElement("div");
  wrap.className = "about-team__inner";
  const title = document.createElement("h3");
  title.className = "about-team__title";
  title.textContent = "Meet our perfect team";
  wrap.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "about-team__grid";

  list.forEach((member) => {
    const card = document.createElement("div");
    card.className = "about-team__card";

    const img = document.createElement("img");
    img.src = resolveAssetPath(member.image || "");
    img.alt = member.name || "Team member";

    const name = document.createElement("p");
    name.className = "about-team__name";
    name.textContent = member.name || "";

    const role = document.createElement("p");
    role.className = "about-team__role";
    role.textContent = member.role || "";

    card.append(img, name, role);
    grid.appendChild(card);
  });

  wrap.appendChild(grid);
  target.appendChild(wrap);
}

function renderBrandsStandards(target, data) {
  if (!target || !data) return;
  target.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "brand-standards__inner";

  if (data.eyebrow) {
    const eyebrow = document.createElement("p");
    eyebrow.className = "brand-standards__eyebrow";
    eyebrow.textContent = data.eyebrow;
    wrap.appendChild(eyebrow);
  }

  if (data.title) {
    const title = document.createElement("h3");
    title.className = "brand-standards__title";
    title.textContent = data.title;
    wrap.appendChild(title);
  }

  const list = document.createElement("ul");
  list.className = "brand-standards__list";
  (data.items || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
  wrap.appendChild(list);
  target.appendChild(wrap);
}

function renderBrandsWhy(target, data) {
  if (!target || !data) return;
  target.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "brand-why__inner";

  const text = document.createElement("div");
  text.className = "brand-why__text";
  if (data.title) {
    const title = document.createElement("h3");
    title.textContent = data.title;
    text.appendChild(title);
  }
  if (data.body) {
    const body = document.createElement("p");
    body.textContent = data.body;
    text.appendChild(body);
  }

  if (Array.isArray(data.images_inline) && data.images_inline.length) {
    const inline = document.createElement("div");
    inline.className = "brand-why__inline";
    data.images_inline.forEach((src) => {
      const img = document.createElement("img");
      img.src = resolveAssetPath(src);
      img.alt = "detail";
      inline.appendChild(img);
    });
    wrap.append(text, inline);
  } else {
    wrap.appendChild(text);
  }

  target.appendChild(wrap);
}

function renderBrandsScience(target, data) {
  if (!target || !data) return;
  target.innerHTML = "";
  const items = Array.isArray(data.items) ? data.items : [];
  const left = items.slice(0, Math.ceil(items.length / 2));
  const right = items.slice(Math.ceil(items.length / 2));

  const wrap = document.createElement("div");
  wrap.className = "wrap brand-science__inner";

  const headline = document.createElement("div");
  headline.className = "brand-science__headline";
  const h2 = document.createElement("h2");
  h2.textContent = data.title || "Science-Driven Confidence Boost";
  headline.appendChild(h2);

  const grid = document.createElement("div");
  grid.className = "brand-science__grid";

  const buildColumn = (list) => {
    const col = document.createElement("div");
    col.className = "brand-science__column";
    list.forEach((item) => {
      const icon = document.createElement("div");
      icon.className = "brand-science__icon";

      const glyph = document.createElement("span");
      glyph.className = "brand-science__glyph";
      const img = document.createElement("img");
      img.src = resolveAssetPath(item.icon || "");
      img.alt = item.title || "";
      glyph.appendChild(img);

      const title = document.createElement("h3");
      title.textContent = item.title || "";
      const body = document.createElement("p");
      body.textContent = item.body || "";

      icon.append(glyph, title, body);
      col.appendChild(icon);
    });
    return col;
  };

  const leftCol = buildColumn(left);
  leftCol.classList.add("brand-science__column--left");

  const rightCol = buildColumn(right);
  rightCol.classList.add("brand-science__column--right");

  const center = document.createElement("div");
  center.className = "brand-science__center";
  const video = document.createElement("video");
  video.className = "brand-science__video";
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.poster = resolveAssetPath(data.poster || data.image || "");
  const source = document.createElement("source");
  source.src = resolveAssetPath(data.video || "");
  source.type = "video/mp4";
  video.appendChild(source);
  center.appendChild(video);

  grid.append(leftCol, center, rightCol);
  wrap.append(headline, grid);
  target.appendChild(wrap);
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
    productImg.src = productImageSrc(product, "full", 0);
    productImg.alt = product.title_short || product.title_long || "Product";

    const name = document.createElement("h3");
    name.className = "lifestyle-slide__name";
    name.textContent = product.title_short || product.title_long || "";

    const price = document.createElement("p");
    price.className = "lifestyle-slide__price";
    price.textContent = formatPrice(product.price);

    productImg.style.cursor = "pointer";
    productImg.addEventListener("click", () => {
      window.location.href = productPageHref(product);
    });

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

  function buildReelSlide(item, idx, includeDot = true) {
    const product = productMap.get(item.product_id) || {};
    const slide = document.createElement("div");
    slide.className = "video-reels__slide";
    slide.dataset.index = idx;

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
    card.addEventListener("click", (e) => {
      e.stopPropagation();
      window.location.href = productPageHref(product);
    });
    card.style.cursor = "pointer";

    const pImg = document.createElement("img");
    pImg.src = productImageSrc(product, "small", 0);
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

    if (includeDot) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "video-reels__dot";
      dot.addEventListener("click", () => setActive(idx));
      dots.appendChild(dot);
      return { slide, video, playBtn, muteBtn, dot };
    }

    return { slide, video, playBtn, muteBtn, dot: null };
  }

  const slides = items.map((item, idx) => buildReelSlide(item, idx, true));
  const cloneLeft = items.map((item, idx) => buildReelSlide(item, idx, false));
  const cloneRight = items.map((item, idx) => buildReelSlide(item, idx, false));

  cloneLeft.forEach(({ slide }) => track.appendChild(slide));
  slides.forEach(({ slide }) => track.appendChild(slide));
  cloneRight.forEach(({ slide }) => track.appendChild(slide));

  const allSlides = [...cloneLeft, ...slides, ...cloneRight];

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

  const prev = navButton("prev", (e) => {
    e?.stopPropagation?.();
    setActive(current - 1);
  });
  const next = navButton("next", (e) => {
    e?.stopPropagation?.();
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
    const indexInTrack = slides.length + slides.findIndex((s) => s.slide === slide);
    const target = allSlides[indexInTrack]?.slide || slide;
    const targetOffset = target.offsetLeft + target.offsetWidth / 2 - viewport.clientWidth / 2;
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

  ids.forEach((id, idx) => {
    const product = productMap.get(id);
    if (!product) return;
    grid.appendChild(buildEnduranceCard(product, { section: "endurance_grid", index: idx }));
  });

  section.append(head, grid);
  return section;
}

function buildEnduranceCard(product, meta) {
  return buildHomeProductCard(product, "home-product-card", meta);
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
    const isBrandsPage = document.body?.dataset?.page === "brands";
    if (!isBrandsPage) {
      const cta = document.createElement("a");
      cta.className = "statement__cta";
      cta.href = data.cta_href;
      cta.textContent = data.cta_text;
      section.appendChild(cta);
    } else {
      const form = document.createElement("form");
      form.className = "brand-application";
      form.innerHTML = `
        <div class="brand-application__row">
          <label>
            <span>Brand name</span>
            <input type="text" name="brand_name" placeholder="Your brand" required>
          </label>
          <label>
            <span>Contact name</span>
            <input type="text" name="contact_name" placeholder="Your name" required>
          </label>
        </div>
        <div class="brand-application__row">
          <label>
            <span>Email</span>
            <input type="email" name="email" placeholder="you@example.com" required>
          </label>
          <label>
            <span>Phone number</span>
            <input type="tel" name="phone" placeholder="(555) 000-0000">
          </label>
        </div>
        <div class="brand-application__row is-single">
          <label>
            <span>Product focus</span>
            <textarea name="focus" rows="3" placeholder="Briefly describe your products and formulations"></textarea>
          </label>
        </div>
        <div class="brand-application__row is-single">
          <label>
            <span>Notes</span>
            <textarea name="notes" rows="3" placeholder="Any testing, certifications, or distribution notes"></textarea>
          </label>
        </div>
        <div class="brand-application__actions">
          <a class="statement__cta" href="${data.cta_href}">Submit</a>
        </div>
      `;
      section.appendChild(form);
    }
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
    grid.appendChild(buildBlogCard(post));
  });

  section.append(head, grid);
  rewriteBlogAnchors();
  return section;
}

function renderMissionVideo(data) {
  const section = document.createElement("section");
  section.className = "mission";
  section.setAttribute("data-section", "mission-video");

  const fallback = document.createElement("img");
  fallback.className = "mission__video mission__video--fallback";
  fallback.src = data.video_still || "";
  fallback.alt = data.header || "Mission background";
  fallback.loading = "lazy";

  const video = document.createElement("video");
  video.className = "mission__video";
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.poster = data.video_still || "";
  video.src = data.video || "";
  video.hidden = !data.video;
  video.addEventListener("error", () => {
    video.hidden = true;
  });

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

  section.append(fallback, video, shade, content);
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

  ids.forEach((id, idx) => {
    const product = productMap.get(id);
    if (!product) return;
    grid.appendChild(buildArrivalCard(product, { section: "new_arrivals", index: idx }));
  });

  section.append(head, grid);
  return section;
}

function buildArrivalCard(product, meta) {
  return buildHomeProductCard(product, "home-product-card", meta);
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

  const nav = document.createElement("div");
  nav.className = "reviews__nav";

  const prev = navButton("prev", () => setActive(current - 1));
  const next = navButton("next", () => setActive(current + 1));
  nav.append(prev, next);

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

  inner.append(avatar, stars, quote, author, dots, nav);
  section.appendChild(inner);
  setActive(0);
  return section;
}

/* Header + footer */
function renderChrome(productMap, categories) {
  renderHeader(productMap, categories);
  renderFooter(productMap, categories);
  initCart(productMap);
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
  logo.src = `${base}assets/icons/logo-black.svg`;
  logo.alt = "Purvanti";
  brand.appendChild(logo);
  bar.appendChild(brand);

  const nav = document.createElement("nav");
  nav.className = "header__nav";

  const navItems = [
    { label: "Shop", href: "/collections/frontpage", dropdown: true, categories },
    { label: "About", href: "/about.html" },
    { label: "Journal", href: "/journal-all.html" },
    { label: "Contact", href: "/contact.html" },
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

  const cartBtn = iconButton("Cart", `${base}assets/icons/nav-cart.svg`);
  cartBtn.dataset.cartTrigger = "true";
  const cartBadge = document.createElement("span");
  cartBadge.className = "header__cart-badge";
  cartBadge.hidden = true;
  cartBtn.appendChild(cartBadge);
  actions.append(cartBtn);

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

function renderFooter(productMap, categories = []) {
  const target = document.getElementById("site-footer");
  if (!target) return;

  const section = document.createElement("footer");
  section.className = "footer";
  const base = getBasePath();

  const inner = document.createElement("div");
  inner.className = "footer__inner";

  const contactBlock = document.createElement("div");
  contactBlock.className = "footer__block footer__block--contact";
  contactBlock.append(
    buildFooterHeading("Address"),
    buildFooterText("1495 Canyon Blvd", "Boulder, CO 80302"),
    buildFooterHeading("Contact")
  );
  const phone = document.createElement("a");
  phone.href = "tel:17204191089";
  phone.textContent = "1 (720) 419-1089";
  const email = document.createElement("a");
  email.href = "mailto:hello@purvanti.com";
  email.textContent = "hello@purvanti.com";
  const ticket = document.createElement("a");
  ticket.href = `${base}contact.html`;
  ticket.textContent = "Support Ticket";
  contactBlock.append(phone, email, ticket);

  const categoriesList = (Array.isArray(categories) ? categories : [])
    .slice(0, 7)
    .map((cat) => ({
      label: cat.category || "",
      href: cat.cta_href || "#",
    }));
  const fallbackProducts = uniqueProducts(productMap)
    .slice(0, 7)
    .map((p) => ({
      label: p.title_short || p.title_long || "",
      href: productPageHref(p),
    }));
  inner.append(
    contactBlock,
    buildListBlock("Products", categoriesList.length ? categoriesList : fallbackProducts)
  );

  inner.append(
    buildListBlock("Policy", [
      { label: "Privacy Policy", href: "/pages/privacy-policy.html" },
      { label: "Satisfaction Guarantee", href: "/pages/satisfaction-guarantee.html" },
      { label: "Returns & Exchanges", href: "/pages/returns-exchanges.html" },
    ])
  );

  const aboutBlock = document.createElement("div");
  aboutBlock.className = "footer__block footer__block--about";
  const aboutTitle = buildFooterHeading("Purvanti");
  const aboutText = document.createElement("p");
  aboutText.className = "footer__text";
  aboutText.textContent =
    "With 6 years of experience and a passion for helping our customers succeed, we’re here to ensure your journey with Purvanti is seamless. Got a compliment or complaint? Reach out!";
  const payments = document.createElement("div");
  payments.className = "footer__payments";
  [
    { src: `${base}assets/icons/payment-visa.svg`, alt: "Visa" },
    { src: `${base}assets/icons/payment-mastercard.svg`, alt: "Mastercard" },
    { src: `${base}assets/icons/payment-amex.svg`, alt: "American Express" },
    { src: `${base}assets/icons/payment-discover.svg`, alt: "Discover" },
  ].forEach((item) => {
    const badge = document.createElement("div");
    badge.className = "footer__payment";
    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.alt;
    badge.appendChild(img);
    payments.appendChild(badge);
  });
  aboutBlock.append(aboutTitle, aboutText, payments);
  inner.appendChild(aboutBlock);

  const bottom = document.createElement("div");
  bottom.className = "footer__bottom";
  const currentYear = new Date().getFullYear();
  const yearRange = currentYear > 2019 ? `2019-${currentYear}` : "2019";
  bottom.textContent =
    `purvanti.com © Copyright ${yearRange} Purvanti, LLC. All rights reserved. ` +
    "Purvanti® is a registered trademark of Purvanti, LLC. " +
    "*Disclaimer: Statements made, or products sold through this website, have not been evaluated by the United States Food and Drug Administration. " +
    "They are not intended to diagnose, treat, cure or prevent any disease.";

  const brandMark = document.createElement("div");
  brandMark.className = "footer__brandmark";
  const brandImg = document.createElement("img");
  brandImg.src = `${base}assets/icons/logo-bottom.svg`;
  brandImg.alt = "Purvanti";
  brandMark.appendChild(brandImg);

  section.append(inner, brandMark, bottom);
  target.replaceChildren(section);
}

function buildFooterHeading(label) {
  const h = document.createElement("h5");
  h.className = "footer__title";
  h.textContent = label;
  return h;
}

function buildFooterText(...lines) {
  const block = document.createElement("div");
  block.className = "footer__text-block";
  lines.forEach((line) => {
    const p = document.createElement("p");
    p.className = "footer__text";
    p.textContent = line;
    block.appendChild(p);
  });
  return block;
}

function buildListBlock(title, links) {
  const block = document.createElement("div");
  block.className = "footer__block";
  const heading = buildFooterHeading(title);
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
