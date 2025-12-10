const ON_CHANGE_DEBOUNCE_TIMER = 300;

const PUB_SUB_EVENTS = {
  cartUpdate: "cart-update",
  cartDrawerOpen: "cart-drawer-open",
  cartDrawerClose: "cart-drawer-close",
  quickBuyDrawerOpen: "quick-buy-drawer-open",
  quickBuyDrawerClose: "quick-buy-drawer-close",
  quantityUpdate: "quantity-update",
  variantChange: "variant-change",
  cartError: "cart-error",
};

let subscribers = {};
function subscribe(eventName, callback) {
  return (
    subscribers[eventName] === void 0 && (subscribers[eventName] = []),
    (subscribers[eventName] = [...subscribers[eventName], callback]),
    function () {
      subscribers[eventName] = subscribers[eventName].filter(
        (cb) => cb !== callback
      );
    }
  );
}
function publish(eventName, data) {
  subscribers[eventName] &&
    subscribers[eventName].forEach((callback) => {
      callback(data);
    });
}
//# sourceMappingURL=/cdn/shop/t/8/assets/pubsub.js.map?v=158357773527763999511755630984

let activeOptions = {};
function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t), (t = setTimeout(() => fn.apply(this, args), wait));
  };
}
function getStyleProperty(element, property) {
  return window.getComputedStyle(element).getPropertyValue(property);
}
typeof window.Shopify > "u" && (window.Shopify = {}),
  (Shopify.bind = function (fn, scope) {
    return function () {
      return fn.apply(scope, arguments);
    };
  }),
  (Shopify.setSelectorByValue = function (selector, value) {
    for (let i = 0, count = selector.options.length; i < count; i++) {
      const option = selector.options[i];
      if (value == option.value || value == option.innerHTML)
        return (selector.selectedIndex = i), i;
    }
  }),
  (Shopify.addListener = function (target, eventName, callback) {
    target.addEventListener
      ? target.addEventListener(eventName, callback, !1)
      : target.attachEvent(`on${eventName}`, callback);
  }),
  (Shopify.postLink = function (path, options) {
    options = options || {};
    const method = options.method || "post",
      params = options.parameters || {},
      form = document.createElement("form");
    form.setAttribute("method", method), form.setAttribute("action", path);
    for (const key in params) {
      const hiddenField = document.createElement("input");
      hiddenField.setAttribute("type", "hidden"),
        hiddenField.setAttribute("name", key),
        hiddenField.setAttribute("value", params[key]),
        form.appendChild(hiddenField);
    }
    document.body.appendChild(form),
      form.submit(),
      document.body.removeChild(form);
  }),
  (Shopify.CountryProvinceSelector = function (
    country_domid,
    province_domid,
    options
  ) {
    (this.countryEl = document.getElementById(country_domid)),
      (this.provinceEl = document.getElementById(province_domid)),
      (this.provinceContainer = document.getElementById(
        options.hideElement || province_domid
      )),
      Shopify.addListener(
        this.countryEl,
        "change",
        Shopify.bind(this.countryHandler, this)
      ),
      this.initCountry(),
      this.initProvince();
  }),
  (Shopify.CountryProvinceSelector.prototype = {
    initCountry() {
      const value = this.countryEl.getAttribute("data-default");
      Shopify.setSelectorByValue(this.countryEl, value), this.countryHandler();
    },
    initProvince() {
      const value = this.provinceEl.getAttribute("data-default");
      value &&
        this.provinceEl.options.length > 0 &&
        Shopify.setSelectorByValue(this.provinceEl, value);
    },
    countryHandler(e) {
      var opt = this.countryEl.options[this.countryEl.selectedIndex];
      const raw = opt.getAttribute("data-provinces"),
        provinces = JSON.parse(raw);
      if (
        (this.clearOptions(this.provinceEl), provinces && provinces.length == 0)
      )
        this.provinceContainer.style.display = "none";
      else {
        for (let i = 0; i < provinces.length; i++) {
          var opt = document.createElement("option");
          (opt.value = provinces[i][0]),
            (opt.innerHTML = provinces[i][1]),
            this.provinceEl.appendChild(opt);
        }
        this.provinceContainer.style.display = "";
      }
    },
    clearOptions(selector) {
      for (; selector.firstChild; ) selector.removeChild(selector.firstChild);
    },
    setOptions(selector, values) {
      for (let i = 0, count = values.length; i < values.length; i++) {
        const opt = document.createElement("option");
        (opt.value = values[i]),
          (opt.innerHTML = values[i]),
          selector.appendChild(opt);
      }
    },
  });
class QuantityCounter extends HTMLElement {
  constructor() {
    super(), (this.changeEvent = new Event("change", { bubbles: !0 }));
  }
  connectedCallback() {
    (this.counterEl = this.querySelector(".js-counter-quantity")),
      (this.increaseBtn = this.querySelector(".js-counter-increase")),
      (this.decreaseBtn = this.querySelector(".js-counter-decrease")),
      (this.min = parseInt(this.counterEl.min) || 1),
      (this.max = parseInt(this.counterEl.max) || 999),
      this.increaseBtn.addEventListener("click", this.onIncrease.bind(this)),
      this.decreaseBtn.addEventListener("click", this.onDecrease.bind(this));
  }
  onIncrease() {
    const currentValue = parseInt(this.counterEl.value);
    currentValue < this.max && this.updateValue(currentValue + 1);
  }
  onDecrease() {
    const currentValue = parseInt(this.counterEl.value);
    this.dataset.cart && (this.min = 0),
      currentValue > this.min && this.updateValue(currentValue - 1);
  }
  updateValue(value) {
    (this.counterEl.value = value),
      this.counterEl.dispatchEvent(this.changeEvent);
  }
}
window.customElements.define("quantity-counter", QuantityCounter);
function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}
function toggleTabindex(elements) {
  elements.forEach((el) => {
    const tabindex = el.getAttribute("tabindex");
    el.setAttribute("tabindex", tabindex === "0" ? "-1" : "0");
  });
}
function setTabindex(elements, tabindex) {
  elements.forEach((el) => {
    el.setAttribute("tabindex", tabindex);
  });
}
function addEventListeners(element, events, handler) {
  events.forEach((event) => element.addEventListener(event, handler));
}
document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute("role", "button"),
    summary.setAttribute(
      "aria-expanded",
      summary.parentNode.hasAttribute("open")
    ),
    summary.nextElementSibling.getAttribute("id") &&
      summary.setAttribute("aria-controls", summary.nextElementSibling.id),
    summary.addEventListener("click", (event) => {
      event.currentTarget.setAttribute(
        "aria-expanded",
        !event.currentTarget.closest("details").hasAttribute("open")
      );
    }),
    !summary.closest("header-drawer, menu-drawer") &&
      summary.parentElement.addEventListener("keyup", onKeyUpEscape);
});
const trapFocusHandlers = {};
function trapFocus(container, elementToFocus = container) {
  const elements = getFocusableElements(container),
    first = elements[0],
    last = elements[elements.length - 1];
  removeTrapFocus(),
    (trapFocusHandlers.focusin = (event) => {
      (event.target !== container &&
        event.target !== last &&
        event.target !== first) ||
        document.addEventListener("keydown", trapFocusHandlers.keydown);
    }),
    (trapFocusHandlers.focusout = function () {
      document.removeEventListener("keydown", trapFocusHandlers.keydown);
    }),
    (trapFocusHandlers.keydown = function (event) {
      event.code.toUpperCase() === "TAB" &&
        (event.target === last &&
          !event.shiftKey &&
          (event.preventDefault(), first.focus()),
        (event.target === container || event.target === first) &&
          event.shiftKey &&
          (event.preventDefault(), last.focus()));
    }),
    document.addEventListener("focusout", trapFocusHandlers.focusout),
    document.addEventListener("focusin", trapFocusHandlers.focusin),
    elementToFocus.focus(),
    elementToFocus.tagName === "INPUT" &&
      ["search", "text", "email", "url"].includes(elementToFocus.type) &&
      elementToFocus.value &&
      elementToFocus.setSelectionRange(0, elementToFocus.value.length);
}
function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener("focusin", trapFocusHandlers.focusin),
    document.removeEventListener("focusout", trapFocusHandlers.focusout),
    document.removeEventListener("keydown", trapFocusHandlers.keydown),
    elementToFocus && elementToFocus.focus();
}
function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== "ESCAPE") return;
  const openDetailsElement = event.target.closest("details[open]");
  if (!openDetailsElement) return;
  const summaryElement = openDetailsElement.querySelector("summary");
  openDetailsElement.removeAttribute("open"),
    summaryElement.setAttribute("aria-expanded", !1),
    summaryElement.focus();
}
class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
  }
  async connectedCallback() {
    const handleIntersection = (entries, observer) => {
      entries[0].isIntersecting &&
        (observer.unobserve(this),
        fetch(this.dataset.url)
          .then((response) => response.text())
          .then((text) => {
            const html = document.createElement("div");
            html.innerHTML = text;
            const recommendations = html.querySelector(
              "product-recommendations"
            );
            recommendations &&
              recommendations.innerHTML.trim().length &&
              (this.innerHTML = recommendations.innerHTML),
              html.querySelector(".grid__item") &&
                this.classList.add("product-recommendations--loaded");
          })
          .catch((e) => {
            console.error(e);
          }));
    };
    new IntersectionObserver(handleIntersection.bind(this), {
      rootMargin: "0px 0px 400px 0px",
    }).observe(this);
  }
}
customElements.define("product-recommendations", ProductRecommendations),
  document.addEventListener("DOMContentLoaded", () => {
    const BUTTON_SELECTOR = ".wt-hero-video__sound-toggle",
      BUTTON_TOGGLE_CLASS = "wt-hero-video__sound-toggle--unmuted";
    document.querySelectorAll(BUTTON_SELECTOR).forEach((button) => {
      button.addEventListener("click", () => {
        const parent = button.parentElement;
        if (!parent) return;
        let video = null;
        if (
          ((video = Array.from(parent.children).find(
            (el) => el.tagName === "VIDEO"
          )),
          !video)
        ) {
          const heroVideoContainer = Array.from(parent.children).find(
            (el) =>
              el.classList && el.classList.contains("hero--video-background")
          );
          heroVideoContainer &&
            (video = heroVideoContainer.querySelector("video"));
        }
        if (!video) {
          const grandparent = parent.closest("video-controls");
          console.log(grandparent),
            (video = Array.from(grandparent.children).find(
              (el) => el.tagName === "VIDEO"
            ));
        }
        video &&
          ((video.muted = !video.muted),
          button.classList.toggle(BUTTON_TOGGLE_CLASS, !video.muted));
      });
    });
  });
//# sourceMappingURL=/cdn/shop/t/8/assets/global.js.map?v=17280903995563450061758180355

class DrawerNavSection extends HTMLElement {
  constructor() {
    super(),
      (this.headerParentLinkClass = "wt-header__nav-teaser__link--parent"),
      (this.pageOverlayClass = "menu-drawer-overlay"),
      (this.triggerQuery = [
        ".wt-header__menu-trigger",
        `.${this.headerParentLinkClass}`,
        ".wt-drawer__close",
        `.${this.pageOverlayClass}`,
      ].join(", ")),
      (this.triggers = () => document.querySelectorAll(this.triggerQuery)),
      (this.getHeaderHeight = () =>
        getStyleProperty(document.querySelector(".wt-header"), "height")),
      (this.headerMenu = document.querySelector(".wt-header--v3")),
      (this.menuToggleButton = document.querySelector(
        ".wt-header__menu-trigger"
      )),
      (this.closeButton = this.querySelector(".wt-drawer__close")),
      (this.isOpen = !1),
      (this.triggerElement = null),
      (this.isAlwaysMobile = () =>
        document.body.classList.contains("mobile-nav")),
      (this.desktopBreakpoint = 1200),
      (this.isDesktop = () =>
        window.matchMedia(`(min-width: ${this.desktopBreakpoint}px)`).matches);
  }
  connectedCallback() {
    this.init();
  }
  openMobileSubmenu(linkValue) {
    const menuParentLinks = document.querySelectorAll(
        ".wt-page-nav-mega__link--parent"
      ),
      classParentActiveMobile = "submenu-opened";
    menuParentLinks.forEach((link) => {
      if (
        (link.classList.remove(classParentActiveMobile),
        link.attributes?.href?.value === linkValue)
      ) {
        link.classList.add(classParentActiveMobile);
        const subMenuLinks = link.nextElementSibling.querySelectorAll(
          'a[data-menu-level="2"]'
        );
        setTabindex(subMenuLinks, "0");
      }
    });
  }
  handleTabindex() {
    const linksLvl1 = this.querySelectorAll('a[data-menu-level="1"]');
    this.isAlwaysMobile() ||
      setTabindex(linksLvl1, this.isDesktop() ? "0" : "-1");
  }
  updateAriaStateForTriggers() {
    document
      .querySelectorAll("[aria-controls='wt-drawer-nav']")
      .forEach((trigger) => {
        const isOpen = this.isOpen;
        trigger.setAttribute("aria-expanded", isOpen);
      });
  }
  temporaryHideFocusVisible() {
    document.body.classList.add("no-focus-visible");
  }
  openMenu(e) {
    (this.isOpen = !0),
      (this.triggerElement = e.currentTarget),
      this.closeButton.setAttribute("tabindex", "0"),
      this.closeButton.focus(),
      this.temporaryHideFocusVisible();
  }
  closeSubmenus() {
    this.querySelectorAll(".submenu-opened").forEach((submenu) => {
      submenu.classList.remove("submenu-opened");
      const subMenuLinksLevel2 = submenu.nextElementSibling.querySelectorAll(
        'a[data-menu-level="2"]'
      );
      setTabindex(subMenuLinksLevel2, "-1");
      const subMenuLinksLevel3 = submenu.nextElementSibling.querySelectorAll(
        'a[data-menu-level="3"]'
      );
      setTabindex(subMenuLinksLevel3, "-1");
    });
  }
  closeMenu() {
    (this.isOpen = !1),
      this.triggerElement.focus(),
      (this.triggerElement = null),
      this.closeButton.setAttribute("tabindex", "-1"),
      this.closeSubmenus(),
      this.temporaryHideFocusVisible();
  }
  toggleMenu(e) {
    e.preventDefault(),
      this.isOpen ? this.closeMenu(e) : this.openMenu(e),
      this.updateAriaStateForTriggers();
    const linksLvl1 = this.querySelectorAll('a[data-menu-level="1"]'),
      menuMobileFooterLinks = this.querySelectorAll(
        "a.wt-page-nav-mega__aside-list__link"
      );
    toggleTabindex(linksLvl1),
      toggleTabindex(menuMobileFooterLinks),
      this.toggleMenuButtonAttr();
    const drawerTopPadding = document.querySelectorAll("body.nav-drawer-big")
        .length
        ? 0
        : this.getHeaderHeight(),
      drawerBodeEl = document.querySelector(".wt-drawer__content"),
      activeNavBodyClass = "menu-open",
      activeOverlayBodyClass = "menu-drawer-overlay-on";
    e.currentTarget.classList.contains("wt-header__nav-teaser__link--parent") &&
      this.openMobileSubmenu(e.currentTarget.attributes?.href?.value),
      document.body.classList.toggle(activeNavBodyClass),
      document.body.classList.toggle(activeOverlayBodyClass),
      drawerBodeEl.style.setProperty("padding-top", drawerTopPadding);
  }
  toggleMenuButtonAttr() {
    const dataOpen =
      this.menuToggleButton.dataset.open === "true" ? "false" : "true";
    this.menuToggleButton.dataset.open = dataOpen;
  }
  toggleThirdOptionMenu() {
    const menuButton = document.querySelector(
      ".wt-header__icon.wt-header__menu-trigger.wt-icon"
    );
    if (this.headerMenu) {
      const dataOpen = menuButton.dataset.open === "true" ? "false" : "true";
      menuButton.dataset.open = dataOpen;
    }
  }
  getFocusableElements() {
    const focusableElementsSelector =
        "button, [href], input, select, [tabindex]",
      focusableElements = () =>
        Array.from(this.querySelectorAll(focusableElementsSelector)).filter(
          (el) => !el.hasAttribute("disabled") && el.tabIndex >= 0
        );
    return {
      focusableElements,
      first: focusableElements()[0],
      last: focusableElements()[focusableElements().length - 1],
    };
  }
  init() {
    if (!document.querySelector(`.${this.pageOverlayClass}`)) {
      const overlay = document.createElement("div");
      overlay.classList.add(this.pageOverlayClass),
        document.body.appendChild(overlay);
    }
    this.handleTabindex(),
      window.addEventListener("resize", this.handleTabindex.bind(this)),
      this.addEventListener("keydown", (e) => {
        const isTabPressed =
            e.key === "Tab" || e.keyCode === 9 || e.code === "Tab",
          { first, last, focusableElements } = this.getFocusableElements();
        (e.key === "Escape" || e.keyCode === 27 || e.code === "Escape") &&
          this.isOpen &&
          this.toggleMenu(e),
          (!this.isDesktop() || this.isAlwaysMobile()) &&
            isTabPressed &&
            (e.shiftKey && document.activeElement === first
              ? (last.focus(), e.preventDefault())
              : !e.shiftKey &&
                document.activeElement === last &&
                (first.focus(), e.preventDefault()));
      }),
      this.triggers().forEach((trigger) => {
        trigger.addEventListener("click", (e) => {
          this.toggleMenu(e), this.toggleThirdOptionMenu();
        });
      });
  }
}
customElements.define("drawer-nav", DrawerNavSection);
class MegaMenuSection extends HTMLElement {
  constructor() {
    super(),
      (this.menuParentItems = this.querySelectorAll(
        ".wt-page-nav-mega__item--parent"
      )),
      (this.menuParentLinks = this.querySelectorAll(
        ".wt-page-nav-mega__link--parent"
      )),
      (this.menuSubmenuParentLinks = this.querySelectorAll(
        ".wt-page-nav-mega__sublist__link--parent"
      )),
      (this.classParentActiveMobile = "submenu-opened"),
      (this.classParentActiveDesk = "dropdown-opened"),
      (this.classBodyActiveDesk = "dropdown-open-desk"),
      (this.isAlwaysMobile = () =>
        document.querySelector("page-header").dataset.alwaysMobileMenu ===
        "true"),
      (this.desktopBreakpoint = 1200),
      (this.isDesktop = () =>
        window.matchMedia(`(min-width: ${this.desktopBreakpoint}px)`).matches),
      (this.currentlyActiveSubmenu = null),
      (this.enableSubmenuLinkInDrawer =
        this.dataset.enableSubmenuLinkInDrawer === "");
  }
  connectedCallback() {
    this.init();
  }
  toggleParentMob(el) {
    const { menuParentLinks, classParentActiveMobile } = this,
      subMenuLinksLevel2 = el.nextElementSibling.querySelectorAll(
        "[data-menu-level='2']"
      );
    toggleTabindex(subMenuLinksLevel2),
      menuParentLinks.forEach((link) => {
        if (link !== el) {
          link.classList.remove(classParentActiveMobile);
          const otherSubMenuWrapper = link.nextElementSibling,
            otherSubMenuLinksLevel2 = otherSubMenuWrapper.querySelectorAll(
              "[data-menu-level='2']"
            ),
            otherSubMenuLinksLevel3 = otherSubMenuWrapper.querySelectorAll(
              "[data-menu-level='3']"
            );
          link.classList.remove(classParentActiveMobile),
            setTabindex(otherSubMenuLinksLevel2, "-1"),
            setTabindex(otherSubMenuLinksLevel3, "-1");
        } else
          el.classList.toggle(classParentActiveMobile),
            el.classList.contains(classParentActiveMobile) ||
              el.nextElementSibling
                .querySelectorAll(".submenu-opened")
                .forEach((submenuLink) => {
                  submenuLink.classList.remove("submenu-opened");
                  const nestedSubMenuLinks =
                    submenuLink.nextElementSibling.querySelectorAll(
                      'a[data-menu-level="3"]'
                    );
                  setTabindex(nestedSubMenuLinks, "-1");
                });
      });
  }
  toggleSubmenuMob(el) {
    const { menuSubmenuParentLinks, classParentActiveMobile } = this,
      subMenuLinksLevel3 = el.nextElementSibling.querySelectorAll(
        "[data-menu-level='3']"
      );
    toggleTabindex(subMenuLinksLevel3),
      menuSubmenuParentLinks.forEach((link) => {
        if (link !== el) {
          link.classList.remove(classParentActiveMobile);
          const otherSubMenuLinksLevel3 =
            link.nextElementSibling.querySelectorAll("[data-menu-level='3']");
          link.classList.remove(classParentActiveMobile),
            setTabindex(otherSubMenuLinksLevel3, "-1");
        } else el.classList.toggle(classParentActiveMobile);
      });
  }
  hasClassMobileNav() {
    return document.body.classList.contains("mobile-nav");
  }
  isMobileMenu() {
    return (
      !window.matchMedia("(min-width: 1200px)").matches ||
      this.hasClassMobileNav()
    );
  }
  initTabindex() {
    if (this.isDesktop() && !this.isAlwaysMobile()) {
      const parentLinks = this.querySelectorAll('a[data-menu-level="1"]');
      setTabindex(parentLinks, "0");
    }
  }
  init() {
    const {
      menuParentLinks,
      menuSubmenuParentLinks,
      menuParentItems,
      classBodyActiveDesk,
      classParentActiveDesk,
    } = this;
    menuParentLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        ((this.isMobileMenu() && !this.enableSubmenuLinkInDrawer) ||
          (this.isMobileMenu() &&
            e.target.tagName !== "SPAN" &&
            this.enableSubmenuLinkInDrawer)) &&
          (e.preventDefault(), this.toggleParentMob(link));
      });
    }),
      menuSubmenuParentLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
          ((this.isMobileMenu() && !this.enableSubmenuLinkInDrawer) ||
            (this.isMobileMenu() &&
              e.target.tagName !== "SPAN" &&
              this.enableSubmenuLinkInDrawer)) &&
            (e.preventDefault(), this.toggleSubmenuMob(link));
        });
      }),
      this.initTabindex();
    const toggleSubmenuDesk = (item) => {
        const headerElement = document.querySelector(".wt-header"),
          headerHeight = headerElement.offsetHeight;
        headerElement.style.setProperty(
          "--mega-menu-top-position",
          `${headerHeight}px`
        );
        const submenuLinks = item
          .querySelector('a[data-menu-level="1"]')
          .nextElementSibling.querySelectorAll(
            'a[data-menu-level="2"],a[data-menu-level="3"]'
          );
        this.isDesktop() &&
          !this.isAlwaysMobile() &&
          setTabindex(
            submenuLinks,
            item.classList.contains(classParentActiveDesk) ? "0" : "-1"
          );
      },
      leftSubmenuClass = "submenu--left";
    menuParentItems.forEach((item) => {
      let removeClassesTimer;
      const removeBodyClassIfNoItemHovered = () => {
        document.querySelector(`.${classParentActiveDesk}`) ||
          document.body.classList.remove(classBodyActiveDesk);
      };
      addEventListeners(item, ["mouseover", "focusin"], () => {
        removeClassesTimer && clearTimeout(removeClassesTimer),
          document.body.classList.add(classBodyActiveDesk),
          item.classList.add(classParentActiveDesk);
        const xCoords = item.getBoundingClientRect().x,
          windowWidth = window.innerWidth,
          isElementInSecondHalfOfWindow = xCoords > windowWidth / 2;
        item.classList.toggle(leftSubmenuClass, isElementInSecondHalfOfWindow),
          toggleSubmenuDesk(item);
      }),
        addEventListeners(item, ["mouseout", "focusout"], () => {
          removeClassesTimer = setTimeout(() => {
            item.classList.remove(classParentActiveDesk),
              item.classList.remove(leftSubmenuClass),
              toggleSubmenuDesk(item),
              removeBodyClassIfNoItemHovered();
          }, 50);
        });
    });
  }
}
customElements.define("mega-menu-section", MegaMenuSection);
class CollapsibleSection extends HTMLElement {
  constructor() {
    super(),
      this.extractOptionsFromURL(),
      (this.previousWidth = window.innerWidth),
      (this.selectorInteractiveElements =
        "button, [href], input, select, [tabindex]"),
      (this.triggerClass = ".wt-collapse__trigger"),
      (this.classActiveTrigger = "wt-collapse__trigger--active"),
      (this.openAttr = this.dataset.open),
      (this.accordionSet = this.dataset.accordionSet),
      (this.mobileOnly = this.hasAttribute("data-mobile-only")),
      (this.breakpoint = 900),
      (this.trigger = this.querySelector(this.triggerClass)),
      (this.content = this.querySelector(".wt-collapse__target")),
      (this.handleDelegatedEvent = this.handleDelegatedEvent.bind(this)),
      (this.handleResize = this.handleResize.bind(this)),
      (this.hasVariantMetafields = this.dataset.hasVariantMetafields === ""),
      this.hasVariantMetafields &&
        (this.variantJson = JSON.parse(
          this.querySelector("[data-variants-metafields]").textContent
        )),
      (this.hasVariantFileMetafields =
        this.dataset.hasVariantFileMetafields === ""),
      this.hasVariantFileMetafields &&
        ((this.variantJson = JSON.parse(
          this.querySelector("[data-variants-file-metafields]").textContent
        )),
        (this.linkElements = this.querySelectorAll("a")));
  }
  static get observedAttributes() {
    return ["data-open"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    name === "data-open" &&
      oldValue !== newValue &&
      this.handleAriaAndTabindex();
  }
  connectedCallback() {
    this.initialize(),
      (this.updateTabContent = this.updateTabContent.bind(this)),
      document.addEventListener("click", this.handleDelegatedEvent),
      this.mobileOnly && window.addEventListener("resize", this.handleResize),
      (this.hasVariantMetafields || this.hasVariantFileMetafields) &&
        window.addEventListener("variantChangeEnd", this.updateTabContent);
  }
  updateTabContent(e) {
    let newContent = null;
    if (!this.closest(`[data-section-id="${e.target.dataset.section}"]`))
      return;
    const variantId = String(e.target.currentVariant.id),
      currentVariantInfo = this.variantJson?.variants?.find(
        (el) => el.id === variantId
      );
    if (this.hasVariantMetafields) {
      newContent = this.variantJson?.content;
      for (const metafield of currentVariantInfo.metafields) {
        const { placeholder_name, value } = metafield;
        newContent = newContent.replaceAll(placeholder_name, value);
      }
      const contentEl = this.querySelector(".wt-collapse__target__content");
      contentEl && (contentEl.innerHTML = newContent);
    } else if (this.hasVariantFileMetafields) {
      const updateLink = (link, jsonKey) => {
        const hasLinkCustomName = link.dataset.customName === "",
          newUrl =
            currentVariantInfo[jsonKey] !== ""
              ? currentVariantInfo[jsonKey]
              : this.variantJson[jsonKey];
        if (newUrl) link.classList.remove("wt-collapse__file--hidden");
        else {
          link.classList.add("wt-collapse__file--hidden");
          return;
        }
        if (((link.href = newUrl), !hasLinkCustomName)) {
          const fileUrlArray = newUrl.split("/"),
            fileName = fileUrlArray[fileUrlArray.length - 1].split("?")[0];
          fileName && (link.querySelector("span").innerText = fileName);
        }
      };
      this.linkElements &&
        this.linkElements.forEach((link) => {
          switch (link.dataset.fileIndex) {
            case "1":
              updateLink(link, "fileUrl1");
              break;
            case "2":
              updateLink(link, "fileUrl2");
              break;
            case "3":
              updateLink(link, "fileUrl3");
              break;
          }
        });
    }
  }
  disconnectedCallback() {
    document.removeEventListener("click", this.handleDelegatedEvent),
      this.mobileOnly &&
        window.removeEventListener("resize", this.handleResize),
      this.hasVariantMetafields &&
        window.removeEventListener("variantChangeEnd", this.updateTabContent);
  }
  isOpen() {
    return this.dataset.open === "true";
  }
  isMobileView() {
    return window.innerWidth < this.breakpoint;
  }
  getInteractiveElements(container) {
    return Array.from(
      container.querySelectorAll(this.selectorInteractiveElements)
    ).filter((el) => !el.hasAttribute("disabled"));
  }
  handleAriaAndTabindex() {
    this.isOpen()
      ? (this.trigger.setAttribute("aria-expanded", "true"),
        this.setTabindex(this.getInteractiveElements(this.content), "0"))
      : (this.trigger.setAttribute("aria-expanded", "false"),
        this.setTabindex(this.getInteractiveElements(this.content), "-1")),
      this.mobileOnly && !this.isMobileView()
        ? (this.setTabindex(this.getInteractiveElements(this.content), "0"),
          this.trigger.setAttribute("tabindex", "-1"))
        : this.trigger.setAttribute("tabindex", "0");
  }
  setTabindex(elements, value) {
    elements.forEach((el) => el.setAttribute("tabindex", value));
  }
  extractOptionsFromURL() {
    const currentURL = window.location.href,
      pattern = /option\.([^&]+)/g,
      matches = currentURL?.match(pattern),
      result = {};
    matches?.forEach((item) => {
      const [key, value] = item.split("="),
        decodedValue = decodeURIComponent(value).replace("+", " "),
        option = key.split(".")[1];
      result.hasOwnProperty(option)
        ? result[option].push(decodedValue)
        : (result[option] = [decodedValue]);
    }),
      (activeOptions = result);
  }
  toggleState() {
    const isOpen = this.isOpen();
    (this.dataset.open = isOpen ? "false" : "true"),
      this.trigger.classList.toggle(this.classActiveTrigger);
  }
  toggleAccordion() {
    const accordionPanels = document.querySelectorAll(
      `collapsible-section[data-accordion-set="${this.accordionSet}"]`
    );
    this.isOpen()
      ? this.toggleState()
      : (accordionPanels.forEach((panelEl) => {
          if (panelEl !== this) {
            panelEl.dataset.open = "false";
            const panelTrigger = panelEl.querySelector(this.triggerClass);
            panelTrigger &&
              panelTrigger.classList.remove(this.classActiveTrigger);
          }
        }),
        (this.dataset.open = "true"),
        this.trigger.classList.add(this.classActiveTrigger));
  }
  handleDelegatedEvent(event) {
    const trigger = event.target.closest(this.triggerClass);
    !trigger ||
      !this.contains(trigger) ||
      (this.accordionSet ? this.toggleAccordion() : this.toggleState());
  }
  handleResize() {
    const currentWidth = window.innerWidth;
    currentWidth !== this.previousWidth &&
      ((this.previousWidth = currentWidth),
      this.isMobileView()
        ? this.enableCollapsible()
        : this.disableCollapsible());
  }
  enableCollapsible() {
    this.openAttr === "true"
      ? ((this.dataset.open = "true"),
        this.trigger.classList.add(this.classActiveTrigger))
      : ((this.dataset.open = "false"),
        this.trigger.classList.remove(this.classActiveTrigger)),
      this.trigger.setAttribute("tabindex", "0"),
      this.handleAriaAndTabindex();
  }
  disableCollapsible() {
    (this.dataset.open = "true"),
      this.trigger.classList.remove(this.classActiveTrigger),
      this.trigger.setAttribute("aria-expanded", "false"),
      this.setTabindex(this.getInteractiveElements(this.content), "0"),
      this.trigger.setAttribute("tabindex", "-1");
  }
  initialize() {
    this.mobileOnly
      ? this.isMobileView()
        ? this.enableCollapsible()
        : this.disableCollapsible()
      : (this.openAttr === "true" &&
          this.trigger.classList.add(this.classActiveTrigger),
        this.trigger.setAttribute("tabindex", "0"),
        this.handleAriaAndTabindex());
  }
}
customElements.define("collapsible-section", CollapsibleSection);
class JsLink extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    (this.handleClickOrEnter = this.handleClickOrEnter.bind(this)),
      (this.handleMouseWheelClick = this.handleMouseWheelClick.bind(this)),
      (this.worksOnlyForMobile = !!this.dataset.mobile),
      this.initialize();
  }
  initialize() {
    this.addEventListener("click", this.handleClickOrEnter),
      this.addEventListener("mousedown", this.handleMouseWheelClick);
  }
  removeEventListeners() {
    this.removeEventListener("click", this.handleClickOrEnter),
      this.removeEventListener("mousedown", this.handleMouseWheelClick);
  }
  handleClickOrEnter(e) {
    if (this.worksOnlyForMobile && window.innerWidth > 600) return;
    const href = this.getAttribute("href"),
      target = this.getAttribute("target");
    e.type === "click"
      ? target === "_blank"
        ? window.open(href, target)
        : (window.location = href)
      : e.type === "mousedown" &&
        (e.preventDefault(), e.button === 1 && window.open(href, "_blank"));
  }
  handleMouseWheelClick(e) {
    if (this.worksOnlyForMobile && window.innerWidth > 600) return;
    const href = this.getAttribute("href");
    e.type === "mousedown" &&
      (e.preventDefault(), e.button === 1 && window.open(href, "_blank"));
  }
  disconnectedCallback() {
    this.removeEventListeners();
  }
}
customElements.define("js-link", JsLink);
class ModalDialog extends HTMLElement {
  constructor() {
    super(),
      (this._onModalCloseClick = this._onModalCloseClick.bind(this)),
      (this._onKeyUp = this._onKeyUp.bind(this)),
      (this._onKeyDown = this._onKeyDown.bind(this)),
      (this._onPointerUp = this._onPointerUp.bind(this)),
      (this._onClick = this._onClick.bind(this)),
      (this.getFocusableElements = this.getFocusableElements.bind(this));
  }
  connectedCallback() {
    this.moved || ((this.moved = !0), document.body.appendChild(this));
    const modalCloseButton = this.querySelector('[id^="ModalClose-"]');
    modalCloseButton &&
      modalCloseButton.addEventListener("click", this._onModalCloseClick),
      this.addEventListener("keyup", this._onKeyUp),
      this.addEventListener("keydown", this._onKeyDown),
      this.classList.contains("media-modal")
        ? this.addEventListener("pointerup", this._onPointerUp)
        : this.addEventListener("click", this._onClick);
  }
  disconnectedCallback() {
    const modalCloseButton = this.querySelector('[id^="ModalClose-"]');
    modalCloseButton &&
      modalCloseButton.removeEventListener("click", this._onModalCloseClick),
      this.removeEventListener("keyup", this._onKeyUp),
      this.removeEventListener("keydown", this._onKeyDown),
      this.classList.contains("media-modal")
        ? this.removeEventListener("pointerup", this._onPointerUp)
        : this.removeEventListener("click", this._onClick);
  }
  temporaryHideFocusVisible() {
    document.body.classList.add("no-focus-visible");
  }
  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector(".template-popup");
    document.body.classList.add("overflow-hidden"),
      this.setAttribute("open", ""),
      popup && popup.loadContent();
    const modalCloseButton = this.querySelector('[id^="ModalClose-"]');
    modalCloseButton &&
      (modalCloseButton.setAttribute("tabindex", "0"),
      modalCloseButton.focus(),
      this.temporaryHideFocusVisible());
    const { focusableElements } = this.getFocusableElements();
    focusableElements.forEach((el) => el.setAttribute("tabindex", "0")),
      window.pauseAllMedia?.();
  }
  hide() {
    document.body.classList.remove("overflow-hidden"),
      document.body.dispatchEvent(new CustomEvent("modalClosed")),
      this.removeAttribute("open"),
      this.openedBy &&
        typeof this.openedBy.focus == "function" &&
        (this.openedBy.focus(), this.temporaryHideFocusVisible()),
      (this.openedBy = null);
    const { focusableElements } = this.getFocusableElements();
    focusableElements.forEach((el) => el.setAttribute("tabindex", "-1")),
      window.pauseAllMedia?.();
  }
  getFocusableElements() {
    const focusableElements = Array.from(
      this.querySelectorAll(
        'button, [href], [role="button"], a, input, select, textarea'
      )
    ).filter(
      (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden")
    );
    return {
      focusableElements,
      first: focusableElements[0],
      last: focusableElements[focusableElements.length - 1],
    };
  }
  _onModalCloseClick(event) {
    this.hide(!1);
  }
  _onKeyUp(event) {
    event.code.toUpperCase() === "ESCAPE" && this.hide();
  }
  _onKeyDown(event) {
    const isTabPressed =
        event.key === "Tab" || event.keyCode === 9 || event.code === "Tab",
      { first, last } = this.getFocusableElements();
    (event.key === "Escape" ||
      event.keyCode === 27 ||
      event.code === "Escape") &&
      this.hide(),
      isTabPressed &&
        (event.shiftKey
          ? (document.activeElement === first ||
              document.activeElement === this) &&
            (event.preventDefault(), last.focus())
          : document.activeElement === last &&
            (event.preventDefault(), first.focus()));
  }
  _onPointerUp(event) {
    event.pointerType === "mouse" &&
      !event.target.closest("deferred-media, product-model") &&
      this.hide();
  }
  _onClick(event) {
    event.target === this && this.hide();
  }
}
customElements.define("modal-dialog", ModalDialog);
class ModalOpener extends HTMLElement {
  constructor() {
    super();
    const button = this.querySelector("button");
    button &&
      button.addEventListener("click", () => {
        const modal = document.querySelector(this.getAttribute("data-modal"));
        modal && modal.show(button);
      });
  }
}
customElements.define("modal-opener", ModalOpener);
class CartNotification extends HTMLElement {
  constructor() {
    super(),
      (this.notification = document.getElementById("cart-notification")),
      (this.header = document.querySelector("sticky-header")),
      (this.onBodyClick = this.handleBodyClick.bind(this)),
      this.notification.addEventListener(
        "keyup",
        (evt) => evt.code === "Escape" && this.close()
      ),
      this.querySelectorAll('button[type="button"]').forEach((closeButton) =>
        closeButton.addEventListener("click", this.close.bind(this))
      );
  }
  open() {
    this.notification.classList.add("animate", "active"),
      this.notification.addEventListener(
        "transitionend",
        () => {
          this.notification.focus(), trapFocus(this.notification);
        },
        { once: !0 }
      ),
      document.body.addEventListener("click", this.onBodyClick);
  }
  close() {
    this.notification.classList.remove("active"),
      document.body.removeEventListener("click", this.onBodyClick),
      removeTrapFocus(this.activeElement);
  }
  renderContents(parsedState) {
    (this.cartItemKey = parsedState.key),
      this.getSectionsToRender().forEach((section) => {
        document.getElementById(section.id).innerHTML =
          this.getSectionInnerHTML(
            parsedState.sections[section.id],
            section.selector
          );
      }),
      this.header && this.header.reveal(),
      this.open();
  }
  getSectionsToRender() {
    return [
      {
        id: "cart-notification-product",
        selector: `[id="cart-notification-product-${this.cartItemKey}"]`,
      },
      { id: "cart-notification-button" },
      { id: "cart-icon-bubble" },
    ];
  }
  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }
  handleBodyClick(evt) {
    const target = evt.target;
    if (target !== this.notification && !target.closest("cart-notification")) {
      const disclosure = target.closest("details-disclosure, header-menu");
      (this.activeElement = disclosure
        ? disclosure.querySelector("summary")
        : null),
        this.close();
    }
  }
  setActiveElement(element) {
    this.activeElement = element;
  }
}
customElements.define("cart-notification", CartNotification);
function fetchConfig(type = "json") {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: `application/${type}`,
    },
  };
}
document.body.addEventListener("keydown", function (e) {
  const target = e.target,
    isThumbnail = target.getAttribute("role") === "thumbnail",
    isEnter = e.code === "Enter" || e.key === "Enter" || e.keyCode === 13,
    isTab = e.code === "Tab" || e.key === "Tab" || e.keyCode === 9,
    isSpace = e.code === "Space" || e.key === " " || e.keyCode === 32,
    isSearch = target.dataset.search;
  isTab && document.body.classList.remove("no-focus-visible");
  const keyboardSupport =
    (target.getAttribute("role") === "button" ||
      target.getAttribute("role") === "option" ||
      target.tagName === "A" ||
      (target.tagName === "INPUT" &&
        ["radio", "checkbox"].includes(target.type)) ||
      target.tagName === "LABEL" ||
      target.tagName === "JS-LINK" ||
      isThumbnail) &&
    (isEnter || isSpace);
  if (keyboardSupport && !isThumbnail)
    isEnter && (isSearch || e.preventDefault(), e.stopPropagation()),
      isSpace && (isSearch || e.preventDefault()),
      target.click();
  else if (keyboardSupport && isThumbnail) {
    let slideNumber;
    const mainSliderElement = document.querySelector("[data-gallery]"),
      mainSlides = mainSliderElement.querySelectorAll("li"),
      thumbSlideMediaId = e.target.dataset.slideMediaId;
    if (
      (mainSlides.forEach((slide, id) => {
        slide.dataset.mediaId === thumbSlideMediaId && (slideNumber = id);
      }),
      mainSliderElement)
    ) {
      const swiperInstance = mainSliderElement.swiper;
      if (swiperInstance) {
        swiperInstance.slideTo(slideNumber), swiperInstance.slideReset();
        const currentSlide = mainSlides[slideNumber],
          currentSlideBtn = currentSlide?.querySelector("button"),
          currentSlideVideo = currentSlide?.querySelector("video"),
          currentSlideImg = currentSlide?.querySelector("a");
        currentSlideBtn?.focus(),
          currentSlideVideo?.focus(),
          currentSlideImg?.click();
      } else console.error("Swiper instance not found on the element");
    } else console.error("Swiper element not found");
  }
}),
  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("drawers-animated"),
      document.querySelectorAll(".swiper").forEach((swiperEl) => {
        const swiperInstance = swiperEl.swiper;
        swiperInstance && swiperInstance.update();
      });
  });
//# sourceMappingURL=/cdn/shop/t/8/assets/base.js.map?v=75303937523758771721755865348

const SCROLL_ANIMATION_TRIGGER_CLASSNAME = "scroll-trigger",
  SCROLL_ANIMATION_OFFSCREEN_CLASSNAME = "scroll-trigger--offscreen",
  SCROLL_ANIMATION_CANCEL_CLASSNAME = "scroll-trigger--cancel";
function onIntersection(elements, observer) {
  elements.forEach((element, index) => {
    if (element.isIntersecting) {
      const elementTarget = element.target;
      elementTarget.classList.contains(SCROLL_ANIMATION_OFFSCREEN_CLASSNAME) &&
        (elementTarget.classList.remove(SCROLL_ANIMATION_OFFSCREEN_CLASSNAME),
        elementTarget.hasAttribute("data-cascade") &&
          elementTarget.setAttribute("style", `--animation-order: ${index};`)),
        observer.unobserve(elementTarget);
    } else
      element.target.classList.add(SCROLL_ANIMATION_OFFSCREEN_CLASSNAME),
        element.target.classList.remove(SCROLL_ANIMATION_CANCEL_CLASSNAME);
  });
}
function getQueryRoot(rootEl) {
  return rootEl && typeof rootEl.querySelectorAll == "function"
    ? rootEl
    : document;
}
function initializeScrollAnimationTrigger(
  rootEl = document,
  isDesignModeEvent = !1
) {
  const root = getQueryRoot(rootEl),
    animationTriggerElements = Array.from(
      root.getElementsByClassName(SCROLL_ANIMATION_TRIGGER_CLASSNAME)
    );
  if (animationTriggerElements.length === 0) return;
  if (isDesignModeEvent) {
    animationTriggerElements.forEach((element) => {
      element.classList.add("scroll-trigger--design-mode");
    });
    return;
  }
  const observer = new IntersectionObserver(onIntersection, {
    rootMargin: "0px 0px -50px 0px",
  });
  animationTriggerElements.forEach((element) => observer.observe(element));
}
window.addEventListener("DOMContentLoaded", () => {
  initializeScrollAnimationTrigger();
}),
  Shopify.designMode &&
    (document.addEventListener("shopify:section:load", (event) =>
      initializeScrollAnimationTrigger(event.target, !0)
    ),
    document.addEventListener("shopify:section:reorder", () =>
      initializeScrollAnimationTrigger(document, !0)
    ));
//# sourceMappingURL=/cdn/shop/t/8/assets/animations.js.map?v=102153372917360354541760363838

class AnnouncementBar extends HTMLElement {
  constructor() {
    super(),
      (this.currentIndex = 0),
      (this.touchStartX = 0),
      (this.touchEndX = 0),
      (this.announcementBar = this.querySelector(
        "#wt-announcement__container"
      )),
      (this.announcementInterval = null),
      (this.changeAnnouncement = this.changeAnnouncement.bind(this)),
      (this.previousAnnouncement = this.previousAnnouncement.bind(this)),
      (this.handleTouchStart = this.handleTouchStart.bind(this)),
      (this.handleTouchMove = this.handleTouchMove.bind(this)),
      (this.handleTouchEnd = this.handleTouchEnd.bind(this)),
      (this.hideForOneDay = this.hideForOneDay.bind(this)),
      (this.restartInterval = this.restartInterval.bind(this)),
      (this.isMobileView = this.isMobileView.bind(this));
  }
  connectedCallback() {
    this.announcementBar?.classList.contains(
      "wt-announcement__container--marquee"
    ) ||
      ((this.announcementInterval = setInterval(this.changeAnnouncement, 5e3)),
      this.announcementBar &&
        (this.announcementBar.addEventListener(
          "touchstart",
          this.handleTouchStart,
          { passive: !0 }
        ),
        this.announcementBar.addEventListener(
          "touchmove",
          this.handleTouchMove,
          { passive: !0 }
        ),
        this.announcementBar.addEventListener("touchend", this.handleTouchEnd, {
          passive: !0,
        }),
        this.announcementBar.addEventListener(
          "touchstart",
          () => clearInterval(this.announcementInterval),
          { passive: !0 }
        ),
        this.announcementBar.addEventListener(
          "touchend",
          this.restartInterval,
          { passive: !0 }
        ))),
      this.announcementBar &&
        (this.announcementBar.style.transition = "transform 0.5s ease-in-out"),
      (this.closeButton = this.querySelector(".wt-announcement__close")),
      this.closeButton &&
        this.closeButton.addEventListener("click", this.hideForOneDay),
      window.addEventListener("resize", this.handleResize.bind(this));
  }
  handleResize() {
    window.innerWidth >= 900 &&
      this.announcementBar &&
      ((this.announcementBar.style.transform = "translateX(0)"),
      (this.currentIndex = 0));
  }
  isMobileView() {
    return window.innerWidth < 900;
  }
  restartInterval() {
    clearInterval(this.announcementInterval),
      (this.announcementInterval = setInterval(this.changeAnnouncement, 5e3));
  }
  hideForOneDay() {
    const oneDayLater = new Date().getTime() + 864e5;
    localStorage.setItem("wt-announcement-hidden", oneDayLater),
      (this.style.display = "none");
  }
  changeAnnouncement() {
    if (!this.isMobileView()) return;
    const totalSlides = this.announcementBar?.children.length;
    this.currentIndex = (this.currentIndex + 1) % totalSlides;
    const newPosition = -(this.currentIndex * 100);
    this.announcementBar &&
      (this.announcementBar.style.transform = `translateX(${newPosition}vw)`),
      this.currentIndex === 0 &&
        this.announcementBar &&
        setTimeout(() => {
          (this.announcementBar.style.transition = "none"),
            (this.announcementBar.style.transform = "translateX(0)"),
            (this.currentIndex = 0),
            setTimeout(() => {
              this.announcementBar.style.transition =
                "transform 0.5s ease-in-out";
            }, 0);
        }, 490);
  }
  previousAnnouncement() {
    const totalSlides = this.announcementBar?.children.length;
    this.currentIndex = (this.currentIndex - 1 + totalSlides) % totalSlides;
    const newPosition = -(this.currentIndex * 100);
    this.announcementBar &&
      (this.announcementBar.style.transform = `translateX(${newPosition}vw)`);
  }
  handleTouchStart(e) {
    this.isMobileView() && (this.touchStartX = e.touches[0].clientX);
  }
  handleTouchMove(e) {
    this.isMobileView() && (this.touchEndX = e.touches[0].clientX);
  }
  handleTouchEnd() {
    Math.abs(this.touchEndX - this.touchStartX) > 30 &&
      (this.touchEndX < this.touchStartX
        ? this.changeAnnouncement()
        : this.previousAnnouncement());
  }
  disconnectedCallback() {
    clearInterval(this.announcementInterval),
      this.announcementBar.removeEventListener(
        "touchstart",
        this.handleTouchStart
      ),
      this.announcementBar.removeEventListener(
        "touchmove",
        this.handleTouchMove
      ),
      this.announcementBar.removeEventListener("touchend", this.handleTouchEnd),
      window.removeEventListener("resize", this.handleResize.bind(this));
  }
}
customElements.define("announcement-bar", AnnouncementBar);
//# sourceMappingURL=/cdn/shop/t/8/assets/announcement-bar.js.map?v=22178151112189850721755630977

class PageHeaderSection extends HTMLElement {
  constructor() {
    super(),
      (this.isSticky = this.dataset.sticky === "true"),
      (this.isStickyAlways = this.dataset.stickyAlways === "true"),
      (this.isTransparent = this.dataset.transparent === "true"),
      (this.isAlwaysMobileMenu = this.dataset.alwaysMobileMenu === "true"),
      (this.hideOverSelector = this.dataset.hideOverSelector || null),
      (this.classBodyAlwaysMobileMenu = "mobile-nav"),
      (this.header = document.querySelector(".page-header")),
      (this.desktopMenuTrigger = document.querySelector(
        ".wt-header__sticky-menu-trigger"
      )),
      (this.desktopMenuBar = document.querySelector(".wt-drawer--nav")),
      (this.enabledClass = "sticky-enabled"),
      (this.showClass = "sticky-show"),
      (this.desktopHeaderWithMenuBarClass =
        "page-header--sticky-show-menubar-lg");
  }
  connectedCallback() {
    this.init();
  }
  disconnectedCallback() {
    this.disableStickyHeader();
  }
  getHeaderHeight() {
    return this.header ? this.header.offsetHeight : 0;
  }
  getHideOverTarget() {
    return this.hideOverSelector
      ? this._hideOverTarget && document.body.contains(this._hideOverTarget)
        ? this._hideOverTarget
        : ((this._hideOverTarget =
            document.querySelector(this.hideOverSelector) || null),
          this._hideOverTarget)
      : null;
  }
  shouldHideOverSection() {
    const target = this.getHideOverTarget();
    if (!target || !this.header) return !1;
    const rect = target.getBoundingClientRect(),
      headerH = this.getHeaderHeight(),
      EPS = 1;
    return rect.top < headerH - EPS && rect.bottom > EPS;
  }
  attachResizeHandler() {
    (this._onResize = () => {
      this.scrollHandler?.();
    }),
      window.addEventListener("resize", this._onResize, { passive: !0 });
  }
  detachResizeHandler() {
    this._onResize &&
      (window.removeEventListener("resize", this._onResize),
      (this._onResize = null));
  }
  enableStickyHeader() {
    if (!this.header) {
      console.error("Header element not found for enabling sticky header");
      return;
    }
    document.body.classList.add("page-header-sticky");
    let prevScrollpos = window.pageYOffset;
    const isDesktop = window.matchMedia("(min-width: 1200px)").matches,
      isMenuBarOpen = () =>
        this.header.classList.contains(this.desktopHeaderWithMenuBarClass),
      isHeaderWithDesktopNav = !document.body.classList.contains("mobile-nav"),
      allLLevelsLinks =
        this.desktopMenuBar?.querySelectorAll("a[data-menu-level]"),
      onlyLevel1Links = this.desktopMenuBar?.querySelectorAll(
        "a[data-menu-level='1']"
      ),
      header = document.querySelector("#header"),
      calculateNavbarTopMargin = () => {
        const navbar = document.querySelector("#wt-drawer-nav");
        if (!navbar || !header) return 0;
        let marginTop = 0;
        return (
          navbar.offsetHeight > header.offsetHeight
            ? (marginTop = header.offsetHeight - navbar.offsetHeight)
            : (marginTop = Math.abs(navbar.offsetHeight - header.offsetHeight)),
          navbar.style.setProperty("--top-margin", `${marginTop}px`),
          marginTop
        );
      },
      calculateStickyFiltersTopOffset = (value = 0) => {
        const stickyFilters = document.querySelector(
            ".collection__sticky-header"
          ),
          plpWrapper = document.querySelector(".collection-grid-section");
        if (stickyFilters && plpWrapper) {
          const offset = value ?? `${this.header.offsetHeight}px`;
          plpWrapper.style.setProperty("--filters-sticky-offset", offset);
        }
      };
    calculateNavbarTopMargin(), calculateStickyFiltersTopOffset();
    const stickyHeader = {
      show: () => {
        this.header && this.header.classList.add(this.showClass),
          (stickyHeader.visible = !0),
          stickyHeader.handleBehavior(),
          calculateNavbarTopMargin(),
          calculateStickyFiltersTopOffset();
      },
      hide: () => {
        this.header && this.header.classList.remove(this.showClass),
          (stickyHeader.visible = !1),
          stickyHeader.handleBehavior(),
          calculateStickyFiltersTopOffset(0);
      },
      enable: () => {
        this.header && this.header.classList.add(this.enabledClass),
          (stickyHeader.enabled = !0),
          stickyHeader.handleBehavior();
      },
      disable: () => {
        this.header &&
          this.header.classList.remove(this.enabledClass, this.showClass),
          (stickyHeader.enabled = !1),
          stickyHeader.handleBehavior();
      },
      enabled: !1,
      visible: !0,
      handleBehavior: () => {
        isHeaderWithDesktopNav &&
          isDesktop &&
          this.header &&
          (stickyHeader.log(),
          !isMenuBarOpen() &&
            stickyHeader.enabled &&
            setTabindex(allLLevelsLinks, "-1"),
          isMenuBarOpen() &&
            stickyHeader.enabled &&
            setTabindex(allLLevelsLinks, "0"),
          stickyHeader.enabled
            ? this.desktopMenuTrigger &&
              setTabindex([this.desktopMenuTrigger], "0")
            : (setTabindex(onlyLevel1Links, "0"),
              this.desktopMenuTrigger &&
                setTabindex([this.desktopMenuTrigger], "-1")));
      },
      log: () => {},
    };
    (this.scrollHandler = () => {
      const currentScrollPos = window.pageYOffset;
      this.shouldHideOverSection()
        ? stickyHeader.hide()
        : this.isStickyAlways || prevScrollpos > currentScrollPos
        ? stickyHeader.show()
        : stickyHeader.hide(),
        (prevScrollpos = currentScrollPos);
    }),
      window.addEventListener("scroll", this.scrollHandler, { passive: !0 }),
      this.attachResizeHandler(),
      this.desktopMenuTrigger?.addEventListener("click", (e) => {
        e.preventDefault(),
          this.desktopMenuBar?.classList.toggle("wt-drawer--nav-show"),
          this.desktopMenuTrigger?.classList.toggle(
            "wt-header__sticky-menu-trigger--active"
          ),
          this.header?.classList.toggle(this.desktopHeaderWithMenuBarClass),
          stickyHeader.handleBehavior();
      });
    const sentinel = document.querySelector(".sticky-header__threshold"),
      handleStickySentinel = (entries) => {
        entries.forEach(({ isIntersecting }) => {
          isIntersecting ? stickyHeader.disable() : stickyHeader.enable();
        });
      };
    (this.stickyHeaderObserver = new IntersectionObserver(
      handleStickySentinel,
      {
        root: null,
        rootMargin: `${this.isStickyAlways ? "-160" : "-100"}px 0px 0px 0px`,
        threshold: 0,
      }
    )),
      sentinel && this.stickyHeaderObserver.observe(sentinel);
  }
  disableStickyHeader() {
    this.header &&
      (this.header.classList.remove(
        this.enabledClass,
        this.showClass,
        this.desktopHeaderWithMenuBarClass
      ),
      document.body.classList.remove("page-header-sticky"),
      this.desktopMenuBar?.classList.remove("wt-drawer--nav-show"),
      this.desktopMenuTrigger?.classList.remove(
        "wt-header__sticky-menu-trigger--active"
      )),
      this.scrollHandler &&
        (window.removeEventListener("scroll", this.scrollHandler),
        (this.scrollHandler = null)),
      this.detachResizeHandler(),
      this.stickyHeaderObserver &&
        (this.stickyHeaderObserver.disconnect(),
        (this.stickyHeaderObserver = null));
  }
  init() {
    this.isSticky ? this.enableStickyHeader() : this.disableStickyHeader();
  }
}
customElements.define("page-header", PageHeaderSection);
//# sourceMappingURL=/cdn/shop/t/8/assets/page-header.js.map?v=142257850170683884231760020339

customElements.get("page-header-image-video") ||
  customElements.define(
    "page-header-image-video",
    class extends HTMLElement {
      constructor() {
        super(),
          (this.section = this.closest("section")),
          (this.showLogoClass = "wt-header__logo--show");
      }
      connectedCallback() {
        this.init(),
          document.addEventListener(
            "shopify:section:load",
            this.handleAdminEditing.bind(this)
          ),
          document.addEventListener(
            "shopify:section:unload",
            this.handleAdminEditing.bind(this)
          ),
          document.addEventListener(
            "shopify:section:reorder",
            this.handleAdminEditing.bind(this)
          );
      }
      handleAdminEditing() {
        this.init();
      }
      init() {
        const logoWrapper = document.querySelector(".wt-header__logo");
        this.isTransparentHeaderEnabled()
          ? (this.setTopMargin(),
            this.observeHeader(),
            logoWrapper?.classList.add(this.showLogoClass))
          : (this.resetTopMargin(), this.resetTopMargin());
      }
      resetTopMargin() {
        this.section.style.marginTop = "0";
      }
      removeObserver() {
        this.observer && (this.observer.disconnect(), (this.observer = null));
      }
      resetTopMargin() {
        this.section.style.marginTop = "0";
      }
      disconnectedCallback() {
        this.removeObserver(),
          document.removeEventListener(
            "shopify:section:load",
            this.handleAdminEditing.bind(this)
          ),
          document.removeEventListener(
            "shopify:section:unload",
            this.handleAdminEditing.bind(this)
          ),
          document.removeEventListener(
            "shopify:section:reorder",
            this.handleAdminEditing.bind(this)
          );
      }
      isValidSectionsOrder() {
        const pageHeader = document.body.querySelector("header.page-header"),
          currentSection = this.section;
        if (pageHeader && currentSection) {
          let sibling = pageHeader.nextElementSibling;
          for (; sibling && sibling.tagName.toLowerCase() !== "section"; )
            sibling = sibling.nextElementSibling;
          return sibling === currentSection;
        }
        return !1;
      }
      isTransparentHeaderEnabled() {
        const header = document.querySelector(".wt-header");
        return this.isValidSectionsOrder() && !!header?.dataset.transparent;
      }
      observeHeader() {
        const header = document.querySelector(".wt-header"),
          activeTransparentClass = "wt-header--transparent";
        (this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              entry.isIntersecting
                ? header.classList.add(activeTransparentClass)
                : header.classList.remove(activeTransparentClass);
            });
          },
          { root: null, threshold: 0.05 }
        )),
          this.observer.observe(this);
      }
      getHeaderHeight() {
        return document.querySelector("header.page-header").offsetHeight;
      }
      calculateOffset() {
        const headerHeight = this.getHeaderHeight();
        return this.isTransparentHeaderEnabled() ? headerHeight : 0;
      }
      setTopMargin() {
        const offset = this.calculateOffset();
        (this.section.style.marginTop = `-${offset}px`),
          this.section.style.setProperty(
            "--top-header-space",
            `${this.getHeaderHeight()}px`
          );
      }
    }
  );
//# sourceMappingURL=/cdn/shop/t/8/assets/page-header-image-video.js.map?v=38964043904736764351755630980

customElements.get("low-power-video") ||
  customElements.define(
    "low-power-video",
    class extends HTMLElement {
      constructor() {
        super();
      }
      connectedCallback() {
        (this.video_section = this.querySelector(".wt-video")),
          (this.video_background_section = this.querySelector(
            ".hero--video-background"
          )),
          this.video_section
            ? this.checkAndPlayVideoSection(this.video_section)
            : this.video_background_section &&
              this.checkAndPlayBackgroundVideoSection(
                this.video_background_section
              );
      }
      checkAndPlayBackgroundVideoSection(video_background_section) {
        const hero_overlay =
            video_background_section.querySelector(".hero__overlay"),
          video_element = video_background_section.querySelector("video");
        video_element &&
          (hero_overlay.addEventListener("touchstart", () =>
            this.playVideo(video_element)
          ),
          hero_overlay.addEventListener("click", () =>
            this.playVideo(video_element)
          ));
      }
      checkAndPlayVideoSection(video) {
        const video_element = video.querySelector("video");
        video_element &&
          (video.addEventListener("touchstart", () =>
            this.playVideo(video_element)
          ),
          video.addEventListener("click", () => this.playVideo(video_element)));
      }
      playVideo(video_element) {
        video_element.playing || video_element.play();
      }
      disconnectedCallback() {
        if (
          (this.video_section &&
            (this.video_section.removeEventListener(
              "touchstart",
              this.playVideo
            ),
            this.video_section.removeEventListener("click", this.playVideo)),
          this.video_background_section)
        ) {
          const hero_overlay =
              this.video_background_section.querySelector(".hero__overlay"),
            video_element =
              this.video_background_section.querySelector("video");
          video_element &&
            (hero_overlay.removeEventListener("touchstart", () =>
              this.playVideo(video_element)
            ),
            hero_overlay.removeEventListener("click", () =>
              this.playVideo(video_element)
            ));
        }
      }
    }
  );
//# sourceMappingURL=/cdn/shop/t/8/assets/low-power-video.js.map?v=113310982665918287461755630979

customElements.get("color-swatch") ||
  customElements.define(
    "color-swatch",
    class extends HTMLElement {
      constructor() {
        super();
      }
      connectedCallback() {
        this.initialize();
      }
      initialize() {
        this.initProperites(), this.initButtons(), this.initCounter();
      }
      initProperites() {
        const node = this;
        (this.isProductVariations = node.dataset.productVariations === ""),
          (this.areFiltersActive = node.dataset.activeFilters === ""),
          (this.container = node.querySelector(".card__container")),
          (this.adnotation = node.querySelector(".card")),
          (this.titleAdnotation = node.querySelector(".card__title a")),
          (this.color_swatcher_container = this.container.querySelector(
            ".card__color-swatcher--container"
          )),
          (this.color_swatcher_wrappers = this.container.querySelectorAll(
            ".color-swatcher--wrapper"
          )),
          (this.color_swatcher_counter = this.container.querySelector(
            ".color-swatcher--counter"
          )),
          ([this.img, this.hover_img] =
            this.container.querySelectorAll(".card__img")),
          (this.titleEl = node.querySelector(".card__title")),
          (this.video = this.querySelector("video")),
          (this.clicked_href = this.adnotation.getAttribute("href")),
          (this.clicked_img = this.img?.getAttribute("src")),
          (this.clicked_srcset = this.img?.getAttribute("srcset")),
          (this.clicked_hover_img = this.hover_img?.getAttribute("src")),
          (this.clicked_hover_srcset = this.hover_img?.getAttribute("srcset")),
          (this.quickAdds = this.querySelectorAll("quick-add")),
          (this.loader = this.querySelector(".card__loader")),
          (this.optionsAsColorSwatches =
            this.color_swatcher_container?.dataset.optionsAsColorSwatches?.split(
              ","
            ) || []);
      }
      initCounter() {
        this.color_swatcher_wrappers?.length > 4 &&
          ((this.color_swatcher_counter.innerHTML += `+ ${
            this.color_swatcher_wrappers.length - 4
          }`),
          this.color_swatcher_container.addEventListener("mouseover", () =>
            this.showAllWrappers()
          ));
      }
      showAllWrappers() {
        this.color_swatcher_wrappers.forEach((wrapper) =>
          wrapper.classList.remove("hidden")
        ),
          this.color_swatcher_counter.classList.add("hidden");
      }
      initButtons() {
        (this.isCheckedOption = 0),
          (this.isCheckedActiveFilter = !1),
          this.color_swatcher_wrappers &&
            (this.sortButtons(),
            this.color_swatcher_wrappers.forEach((wrapper, index) => {
              const button = wrapper.querySelector(".color-swatcher"),
                attributes = this.getButtonAttributes(button),
                tooltip = wrapper.querySelector(".color-swatcher--tooltip");
              if (
                (index > 3 && wrapper.classList.add("hidden"),
                !this.isCheckedActiveFilter)
              ) {
                const isActiveSwatch = button.dataset.activeSwatch === "";
                this.isProductVariations && this.areFiltersActive
                  ? this.dataset.currentVariantHandle ===
                      attributes.button_product_handle &&
                    (this.handleClickEvent(wrapper, attributes),
                    (this.isCheckedActiveFilter = !0))
                  : isActiveSwatch &&
                    (this.handleClickEvent(wrapper, attributes),
                    (this.isCheckedActiveFilter = !0));
              }
              this.assignWrapperEvents(wrapper, attributes, tooltip);
            })),
          this.color_swatcher_container &&
            this.color_swatcher_container.addEventListener("mouseleave", () =>
              this.restoreAttributes()
            );
      }
      getButtonAttributes(button) {
        return {
          dataColor: button.getAttribute("data-color"),
          button_href: button.getAttribute("data-href"),
          button_img: button.getAttribute("data-img"),
          button_srcset: button.getAttribute("data-srcset"),
          button_hover: button.getAttribute("data-hover"),
          button_hover_srcset: button.getAttribute("data-hover-srcset"),
          button_product_handle: button.getAttribute("data-product-handle"),
        };
      }
      assignWrapperEvents(wrapper, attributes, tooltip) {
        wrapper.addEventListener("click", () =>
          this.handleClickEvent(wrapper, attributes)
        ),
          wrapper.addEventListener("keydown", (e) => {
            e.key === "Enter" && this.handleClickEvent(wrapper, attributes);
          }),
          wrapper.addEventListener("mouseover", () =>
            this.handleMouseOverEvent(wrapper, attributes, tooltip)
          ),
          wrapper.addEventListener("mouseout", () =>
            this.handleMouseOutEvent(tooltip)
          );
      }
      handleClickEvent(
        wrapper,
        {
          button_href,
          button_img,
          button_hover,
          button_srcset,
          button_hover_srcset,
          button_product_handle,
        }
      ) {
        button_img &&
          (this.showLoader(),
          this.img.classList.remove("hidden"),
          (this.img.onload = () => {
            this.hideLoader(), (this.img.onload = null);
          }),
          this.setAttributes(this.adnotation, { href: button_href }),
          this.setAttributes(this.img, { src: button_img }),
          this.setAttributes(this.img, { srcset: button_srcset }),
          this.setAttributes(this.adnotation, { href: button_href }),
          this.setAttributes(this.titleAdnotation, { href: button_href }),
          this.quickAdds?.forEach((quickAdd) => {
            quickAdd.setAttribute("data-product-handle", button_product_handle),
              (quickAdd.querySelector("button").dataset.productUrl =
                button_href);
          }),
          this.price && (this.price.innerHTML = button_price),
          this.checkHoverImage(button_hover, button_hover_srcset),
          this.color_swatcher_wrappers.forEach((wrap) => {
            wrap.classList.remove("active");
          }),
          (this.clicked_href = button_href),
          (this.clicked_img = button_img),
          (this.clicked_srcset = button_srcset),
          (this.clicked_hover_img = button_hover),
          (this.clicked_hover_srcset = button_hover_srcset),
          wrapper.classList.add("active"),
          this.video?.classList.add("hidden"),
          (this.isVideoHidden = !0));
      }
      showLoader() {
        this.loader.classList.remove("hidden"),
          (this.loader.innerHTML = '<div class="spinner-ring"></div>'),
          this.img && (this.img.style.opacity = 0);
      }
      hideLoader() {
        this.loader.classList.add("hidden"),
          (this.loader.innerHTML = ""),
          this.img && (this.img.style.opacity = 1);
      }
      handleMouseOverEvent(
        wrapper,
        {
          button_href,
          button_img,
          button_hover,
          button_srcset,
          button_hover_srcset,
        },
        tooltip
      ) {
        (!this.img?.src?.includes(button_img) ||
          this.img?.classList.contains("hidden")) &&
          (this.showLoader(),
          this.img.classList.remove("hidden"),
          (this.img.onload = () => {
            this.hideLoader(), (this.img.onload = null);
          }),
          this.setAttributes(this.adnotation, { href: button_href }),
          this.setAttributes(this.img, { src: button_img }),
          this.setAttributes(this.img, { srcset: button_srcset }),
          this.setAttributes(this.titleAdnotation, { href: button_href })),
          this.checkHoverImage(button_hover, button_hover_srcset),
          tooltip.classList.remove("hidden"),
          this.setTooltipPosition(tooltip);
      }
      handleMouseOutEvent(tooltip) {
        tooltip.classList.add("hidden"),
          tooltip.classList.remove(
            "color-swatcher--tooltip-left",
            "color-swatcher--tooltip-right"
          );
      }
      setTooltipPosition(tooltip) {
        const coords = tooltip.getBoundingClientRect(),
          screenWidth = window.innerWidth;
        coords &&
          (coords.x < 0
            ? tooltip.classList.add("color-swatcher--tooltip-left")
            : coords.right > screenWidth &&
              tooltip.classList.add("color-swatcher--tooltip-right"));
      }
      setFirstOptionActive() {
        const wrapper = this.color_swatcher_wrappers[0];
        if (wrapper) {
          const button = wrapper.querySelector(".color-swatcher"),
            attributes = this.getButtonAttributes(button);
          this.setAttributes(this.adnotation, { href: attributes.button_href }),
            this.setAttributes(this.titleAdnotation, {
              href: attributes.button_href,
            }),
            this.setAttributes(this.img, { src: attributes.button_img }),
            this.setAttributes(this.img, { srcset: attributes.button_srcset }),
            this.checkHoverImage(
              attributes.button_hover,
              attributes.button_hover_srcset
            ),
            wrapper.classList.add("active");
        }
      }
      restoreAttributes() {
        this.setAttributes(this.adnotation, { href: this.clicked_href }),
          this.setAttributes(this.titleAdnotation, { href: this.clicked_href }),
          this.setAttributes(this.img, { src: this.clicked_img }),
          this.setAttributes(this.img, { srcset: this.clicked_srcset }),
          this.checkHoverImage(
            this.clicked_hover_img,
            this.clicked_hover_srcset
          );
      }
      sortButtons() {
        if (this.color_swatcher_wrappers) {
          const newArr = Array.from(this.color_swatcher_wrappers).sort(
            (a, b) => {
              const classA = a.classList?.contains("unavailable"),
                classB = b.classList?.contains("unavailable");
              return classA && !classB ? 1 : !classA && classB ? -1 : 0;
            }
          );
          this.color_swatcher_container &&
            (this.color_swatcher_container.innerHTML = ""),
            newArr.forEach((el) => this.color_swatcher_container.append(el)),
            this.createCounterSpan(),
            (this.color_swatcher_wrappers = this.container.querySelectorAll(
              ".color-swatcher--wrapper"
            )),
            (this.color_swatcher_counter = this.container.querySelector(
              ".color-swatcher--counter"
            ));
        }
      }
      createCounterSpan() {
        const counter_span = document.createElement("span");
        counter_span.classList.add("color-swatcher--counter"),
          this.color_swatcher_container?.appendChild(counter_span);
      }
      setAttributes(element, attrs) {
        for (let key in attrs) element?.setAttribute(key, attrs[key]);
      }
      checkHoverImage(button_hover, button_hover_srcset) {
        button_hover &&
          this.hover_img &&
          (this.setAttributes(this.hover_img, { src: button_hover }),
          button_hover_srcset &&
            this.setAttributes(this.hover_img, {
              srcset: button_hover_srcset,
            }));
      }
    }
  );
//# sourceMappingURL=/cdn/shop/t/8/assets/color-swatch.js.map?v=70441894731430056471760535799

customElements.get("drawer-select") ||
  customElements.define(
    "drawer-select",
    class extends HTMLElement {
      constructor() {
        super(),
          (this.optionId = this.dataset.optionId),
          (this.currentVariant = this.dataset.currentVariant),
          (this.optionTitleLabel = this.querySelector(
            ".wt-product__option__title .value"
          )),
          (this.trigger = this.querySelector(".wt-select__trigger")),
          (this.triggerLabel = this.trigger?.querySelector(
            ".wt-select__trigger__label"
          )),
          (this.options = this.querySelectorAll(
            ".wt-select__item:not(.wt-select__item--disabled)"
          )),
          (this.optionName = this.querySelector(
            ".wt-product__option__title .label"
          ).innerText),
          (this.form = document.querySelector(
            `form[data-type=add-to-cart-form]:has(input[name='id'][value='${this.currentVariant}'])`
          )),
          (this.inputType = this.dataset.inputType),
          (this.body = document.body),
          (this.container = this.querySelector(".wt-select__drawer")),
          (this.closeButton = this.querySelector(".wt-select__drawer__close")),
          (this.isDrawerOpen = !1),
          (this.pageOverlayClass = "page-overlay"),
          (this.pageBodyActiveClass = "wt-select-opened"),
          (this.activeOverlayBodyClass = `${this.pageOverlayClass}-on`),
          (this.openDrawer = this.openDrawer.bind(this)),
          (this.closeDrawer = this.closeDrawer.bind(this)),
          (this.handleInteractionOutside =
            this.handleInteractionOutside.bind(this)),
          (this._keyDownHandler = this._keyDownHandler.bind(this)),
          (this.setOption = this.setOption.bind(this)),
          (this.setCheckboxOption = this.setCheckboxOption.bind(this)),
          (this.setTextOption = this.setTextOption.bind(this)),
          (this._handleTabindex = this._handleTabindex.bind(this));
      }
      connectedCallback() {
        this.inputType === "dropdown"
          ? (this._init(), this.preselectFirstOption())
          : this.inputType === "text"
          ? this.setupTextListeners()
          : this.setupCheckboxListeners();
      }
      disconnectedCallback() {
        this.cleanupListeners();
      }
      createOverlay() {
        this.querySelector(`.${this.pageOverlayClass}`)
          ? (this.overlay = this.querySelector(`.${this.pageOverlayClass}`))
          : ((this.overlay = document.createElement("div")),
            this.overlay.classList.add(this.pageOverlayClass),
            this.appendChild(this.overlay));
      }
      addEventListeners() {
        this.trigger.addEventListener("click", this.openDrawer),
          this.closeButton.addEventListener("click", this.closeDrawer),
          this.container.addEventListener("keydown", this._keyDownHandler),
          this.options.forEach((option) => {
            option.addEventListener("click", this.setOption);
          }),
          this.overlay.addEventListener("click", this.closeDrawer);
      }
      setupCheckboxListeners() {
        (this.inputCheckbox = this.querySelector(".form-checkbox__input")),
          this.inputCheckbox.addEventListener("click", this.setCheckboxOption);
      }
      setupTextListeners() {
        (this.inputText = this.querySelector(".wt-product__option__text")),
          this.inputText.addEventListener("change", this.setTextOption);
      }
      cleanupListeners() {
        this.inputType === "dropdown"
          ? (this.trigger.removeEventListener("click", this.openDrawer),
            this.closeButton.removeEventListener("click", this.closeDrawer),
            this.container.removeEventListener("keydown", this._keyDownHandler),
            this.options.forEach((option) => {
              option.removeEventListener("click", this.setOption);
            }),
            this.overlay.removeEventListener("click", this.closeDrawer))
          : this.inputCheckbox.removeEventListener(
              "click",
              this.setCheckboxOption
            );
      }
      openDrawer() {
        this.container.classList.add("wt-select__drawer--open"),
          this.overlay.classList.remove("hidden"),
          this.body.classList.add(this.activeOverlayBodyClass),
          this.body.classList.add(this.pageBodyActiveClass),
          (this.isDrawerOpen = !0),
          this._handleTabindex(),
          document.addEventListener("click", this.handleInteractionOutside);
      }
      closeDrawer() {
        this.container.classList.remove("wt-select__drawer--open"),
          this.overlay.classList.add("hidden"),
          this.body.classList.remove(this.activeOverlayBodyClass),
          this.body.classList.remove(this.pageBodyActiveClass),
          (this.isDrawerOpen = !1),
          this._handleTabindex(),
          document.removeEventListener("click", this.handleInteractionOutside);
      }
      handleInteractionOutside(event) {
        if (this.isDrawerOpen) {
          const clickInsideDrawer = this.container.contains(event.target),
            clickOnTrigger = this.trigger.contains(event.target),
            clickOption = Array.from(this.options).some((option) =>
              option.contains(event.target)
            );
          ((!clickInsideDrawer && !clickOnTrigger) || clickOption) &&
            this.closeDrawer();
        }
      }
      getFocusableElements() {
        const focusableElements = Array.from(
          this.container.querySelectorAll(
            'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]'
          )
        );
        return {
          first: focusableElements[0],
          last: focusableElements[focusableElements.length - 1],
        };
      }
      setOption(event) {
        const target = event.currentTarget || event,
          value = target.dataset.value.trim();
        (this.triggerLabel.innerHTML = `<span class="value">${value}</span>`),
          (this.optionTitleLabel.innerHTML = value),
          this.options.forEach((option) => {
            option.classList.remove("wt-select__item--current"),
              option.setAttribute("aria-selected", "false");
          }),
          target.classList.add("wt-select__item--current"),
          target.setAttribute("aria-selected", "true"),
          this.updateHiddenInput(value),
          this.closeDrawer();
      }
      setCheckboxOption(event) {
        const target = event.currentTarget || event;
        console.log(target);
        const value = target.checked ? target.value : "";
        this.updateHiddenInput(value);
      }
      setTextOption(event) {
        const value = (event.currentTarget || event).value;
        this.updateHiddenInput(value);
      }
      preselectFirstOption() {
        const currentOption = this.container.querySelector(
          ".wt-select__item--current"
        );
        currentOption
          ? this.setOption(currentOption)
          : this.options[0] && this.setOption(this.options[0]);
      }
      updateHiddenInput(value) {
        let hiddenInput = this.form?.querySelector(
          `input[type="hidden"][name="properties[${this.optionName}]"]`
        );
        hiddenInput ||
          ((hiddenInput = document.createElement("input")),
          (hiddenInput.type = "hidden"),
          (hiddenInput.name = `properties[${this.optionName}]`),
          this.form?.appendChild(hiddenInput)),
          (hiddenInput.value = value);
      }
      _init() {
        this.createOverlay(), this._handleTabindex(), this.addEventListeners();
      }
      _keyDownHandler(e) {
        const isTabPressed = e.key === "Tab" || e.keyCode === 9;
        if (
          ((e.key === "Escape" || e.keyCode === 27) &&
            this.isDrawerOpen &&
            (this.closeDrawer(), this.trigger.focus()),
          this.isDrawerOpen && isTabPressed)
        ) {
          const { first, last } = this.getFocusableElements();
          e.shiftKey && document.activeElement === first
            ? (last.focus(), e.preventDefault())
            : !e.shiftKey &&
              document.activeElement === last &&
              (first.focus(), e.preventDefault());
        }
      }
      _handleTabindex() {
        this.container
          .querySelectorAll(".wt-select__item, .wt-select__drawer__close")
          .forEach((el) => {
            el.setAttribute("tabindex", this.isDrawerOpen ? "0" : "-1");
          });
      }
    }
  );
//# sourceMappingURL=/cdn/shop/t/8/assets/drawer-select.js.map?v=29189407719080657991755630983

customElements.get("model-element") ||
  customElements.define(
    "model-element",
    class extends HTMLElement {
      constructor() {
        super(),
          this.initialize(),
          (this.showModelBound = this.showModel.bind(this)),
          (this.closeButtonBound = this.closeButton.bind(this));
      }
      connectedCallback() {
        (this.modelBtn = this.querySelector(".model-btn")),
          this.modelBtn?.addEventListener("click", this.showModelBound);
      }
      disconnectedCallback() {
        this.modelBtn?.removeEventListener("click", this.showModelBound);
      }
      getFocusableElements() {
        const focusableElementsSelector =
            "button, [href], input, select, [tabindex], iframe",
          focusableElements = () =>
            Array.from(
              this.modelContainer.querySelectorAll(focusableElementsSelector)
            ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex >= 0);
        return {
          focusableElements,
          first: focusableElements()[0],
          last: focusableElements()[focusableElements().length - 1],
        };
      }
      initialize() {
        const els = this.querySelectorAll('[data-model="true"]');
        (this.elsArr = Array.from(els)),
          (this.ul = this.querySelectorAll("ul")),
          (this.modelContainer = document.querySelector(".model-container")),
          (this.modelWrapper = this.modelContainer?.querySelector(".model")),
          (this.closeBtn = this.modelContainer?.querySelector(".close-btn")),
          (this.iframe = this.querySelector("iframe")),
          this.modelContainer.addEventListener("keydown", (e) => {
            const isTabPressed =
                e.key === "Tab" || e.keyCode === 9 || e.code === "Tab",
              { first, last } = this.getFocusableElements();
            (e.key === "Escape" || e.keyCode === 27 || e.code === "Escape") &&
              this.closeBtn.click(),
              isTabPressed &&
                (e.shiftKey && document.activeElement === first
                  ? (last.focus(), e.preventDefault())
                  : !e.shiftKey &&
                    document.activeElement === last &&
                    (first.focus(), e.preventDefault()));
          });
      }
      showModel(e) {
        (this.trigger = e.currentTarget),
          (document.body.style.overflow = "hidden"),
          (this.backBtn = this.modelWrapper.querySelector(
            ".hero__button--link"
          )),
          this.backBtn?.addEventListener("click", this.closeButtonBound),
          this.closeBtn?.addEventListener("click", this.closeButtonBound),
          (this.modelViewer =
            this.querySelector("model-viewer") || this.iframe),
          this.modelWrapper?.insertBefore(
            this.modelViewer.cloneNode(!0),
            this.backBtn
          ),
          this.modelContainer?.classList.remove("hidden"),
          this.closeBtn.setAttribute("tabindex", "0"),
          this.closeBtn.focus();
      }
      closeButton(e) {
        e?.stopPropagation(),
          (document.body.style.overflow = "auto"),
          this.modelContainer?.classList.add("hidden"),
          this.backBtn?.removeEventListener("click", this.closeButtonBound),
          this.closeBtn?.removeEventListener("click", this.closeButtonBound);
        const elementToRemove =
          this.modelWrapper.querySelector("model-viewer") ||
          this.modelWrapper.querySelector("iframe");
        elementToRemove && this.modelWrapper.removeChild(elementToRemove),
          this.closeBtn.setAttribute("tabindex", "-1"),
          this.trigger?.focus();
      }
    }
  ),
  (window.ProductModel = {
    loadShopifyXR() {
      if (!window.Shopify || typeof Shopify.loadFeatures !== "function") {
        return;
      }
      Shopify.loadFeatures([
        {
          name: "shopify-xr",
          version: "1.0",
          onLoad: this.setupShopifyXR.bind(this),
        },
      ]);
    },
    setupShopifyXR(errors) {
      if (!errors) {
        if (!window.ShopifyXR) {
          document.addEventListener("shopify_xr_initialized", () =>
            this.setupShopifyXR()
          );
          return;
        }
        document
          .querySelectorAll('[id^="ProductJSON-"]')
          .forEach((modelJSON) => {
            window.ShopifyXR.addModels(JSON.parse(modelJSON.textContent)),
              modelJSON.remove();
          }),
          window.ShopifyXR.setupXRElements();
      }
    },
  }),
  window.addEventListener("DOMContentLoaded", () => {
    window.ProductModel && window.ProductModel.loadShopifyXR();
  });
//# sourceMappingURL=/cdn/shop/t/8/assets/model_element.js.map?v=158477732829452102971755630982

customElements.get("localization-form") ||
  customElements.define(
    "localization-form",
    class extends HTMLElement {
      constructor() {
        super(),
          (this.elements = {
            input: this.querySelector(
              'input[name="locale_code"], input[name="country_code"]'
            ),
            button: this.querySelector("button"),
            panel: this.querySelector(".disclosure__list-wrapper"),
          }),
          this.elements.button?.addEventListener(
            "click",
            this.openSelector.bind(this)
          ),
          this.elements.button?.addEventListener(
            "focusout",
            this.closeSelector.bind(this)
          ),
          this.addEventListener("keyup", this.onContainerKeyUp.bind(this)),
          this.querySelectorAll("a").forEach((item) =>
            item.addEventListener("click", this.onItemClick.bind(this))
          );
      }
      hidePanel() {
        this.elements.button.setAttribute("aria-expanded", "false"),
          this.elements.panel.setAttribute("hidden", !0);
      }
      onContainerKeyUp(event) {
        event.code.toUpperCase() === "ESCAPE" &&
          this.elements.button.getAttribute("aria-expanded") != "false" &&
          (this.hidePanel(),
          event.stopPropagation(),
          this.elements.button.focus());
      }
      onItemClick(event) {
        event.preventDefault();
        const form = this.querySelector("form");
        (this.elements.input.value = event.currentTarget.dataset.value),
          form && form.submit(),
          this.hidePanel();
      }
      openSelector() {
        this.elements.button.focus(),
          this.elements.panel.toggleAttribute("hidden"),
          this.elements.button.setAttribute(
            "aria-expanded",
            (
              this.elements.button.getAttribute("aria-expanded") === "false"
            ).toString()
          );
      }
      closeSelector(event) {
        const isChild =
          this.elements.panel.contains(event.relatedTarget) ||
          this.elements.button.contains(event.relatedTarget);
        (!event.relatedTarget || !isChild) && this.hidePanel();
      }
    }
  );
//# sourceMappingURL=/cdn/shop/t/8/assets/localization-form.js.map?v=68653642382058027111755630977

customElements.get("variant-dropdown") ||
  customElements.define(
    "variant-dropdown",
    class extends HTMLElement {
      constructor() {
        super(),
          (this.body = document.querySelector("body")),
          (this.overlay = this.previousElementSibling),
          (this.dropdownButton = this.querySelector(
            ".wt-product__option__dropdown"
          )),
          (this.dropdownIcon = this.dropdownButton.querySelector("svg")),
          (this.container = this.querySelector(".wt-product__option__body")),
          (this.drawerList = this.querySelector(".drawer__list")),
          (this.closeButton = this.querySelector(".drawer__list-nav__close")),
          (this.isDrawerOpen = !1),
          (this.featuredProductSection = this.closest(".wt-featured-product")),
          (this.isInsideFeaturedProductSection =
            this.featuredProductSection !== null),
          (this.featuredProductSectionActiveClass =
            "wt-featured-product--active-variant-dropdown"),
          (this.classOpen = "open"),
          (this.classHidden = "hidden"),
          (this.classBodyOverlayed = "variant-dropdown-page-overlay");
      }
      connectedCallback() {
        this._init();
      }
      openDrawer() {
        this.dropdownIcon.classList.add(this.classOpen),
          this.container.classList.add(this.classOpen),
          this.overlay.classList.remove(this.classHidden),
          this.body.classList.add(this.classBodyOverlayed),
          (this.isDrawerOpen = !0),
          this.isInsideFeaturedProductSection &&
            this.featuredProductSection.classList.add(
              this.featuredProductSectionActiveClass
            ),
          this._handleTabindex(),
          document.addEventListener("click", this.handleInteractionOutside);
      }
      closeDrawer() {
        this.container.classList.remove(this.classOpen),
          this.overlay.classList.add(this.classHidden),
          this.body.classList.remove(this.classBodyOverlayed),
          this.dropdownIcon.classList.remove(this.classOpen),
          (this.isDrawerOpen = !1),
          this.isInsideFeaturedProductSection &&
            this.featuredProductSection.classList.remove(
              this.featuredProductSectionActiveClass
            ),
          this._handleTabindex(),
          document.removeEventListener("click", this.handleInteractionOutside);
      }
      handleInteractionOutside(event) {
        if (this.isDrawerOpen) {
          const clickInsideDrawer = this.container.contains(event.target),
            clickOption = this.drawerList.contains(event.target);
          ((!clickInsideDrawer && event.target !== this.dropdownButton) ||
            clickOption) &&
            this.closeDrawer();
        }
      }
      addEventListeners() {
        this.dropdownButton.addEventListener("click", (event) => {
          event.stopPropagation(), this.openDrawer();
        }),
          this.closeButton.addEventListener("click", () => {
            this.closeDrawer();
          }),
          this.container.addEventListener("keydown", this._keyDownHandler);
      }
      removeEventListeners() {
        this.dropdownButton.removeEventListener("click", () => {
          this.openDrawer();
        }),
          this.closeButton.removeEventListener("click", () => {
            this.closeDrawer();
          });
      }
      disconnectedCallback() {
        this.removeEventListeners();
      }
      temporaryHideFocusVisible() {
        document.body.classList.add("no-focus-visible");
      }
      getFocusableElements() {
        const focusableElementsSelector =
            "button, [href], input, select, [tabindex]",
          focusableElements = () =>
            Array.from(
              this.container.querySelectorAll(focusableElementsSelector)
            ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex >= 0);
        return {
          focusableElements,
          first: focusableElements()[0],
          last: focusableElements()[focusableElements().length - 1],
        };
      }
      _handleTabindex() {
        const interactivElements = this.container.querySelectorAll(
          ".drawer__list__link, .drawer__list-nav__close"
        );
        setTabindex(interactivElements, this.isDrawerOpen ? "0" : "-1");
      }
      _keyDownHandler(e) {
        const isTabPressed =
            e.key === "Tab" || e.keyCode === 9 || e.code === "Tab",
          { first, last } = this.getFocusableElements();
        (e.key === "Escape" || e.keyCode === 27 || e.code === "Escape") &&
          this.isDrawerOpen &&
          this.closeDrawer(),
          this.isDrawerOpen &&
            isTabPressed &&
            (e.shiftKey && document.activeElement === first
              ? (last.focus(), e.preventDefault())
              : !e.shiftKey &&
                document.activeElement === last &&
                (first.focus(), e.preventDefault()));
      }
      _init() {
        (this.openDrawer = this.openDrawer.bind(this)),
          (this.closeDrawer = this.closeDrawer.bind(this)),
          (this._keyDownHandler = this._keyDownHandler.bind(this)),
          (this.handleInteractionOutside =
            this.handleInteractionOutside.bind(this)),
          this._handleTabindex(),
          this.addEventListeners();
      }
    }
  );
//# sourceMappingURL=/cdn/shop/t/8/assets/variant-dropdown.js.map?v=121557104270648694461755630982

customElements.get("variant-options") ||
  customElements.define(
    "variant-options",
    class extends HTMLElement {
      whenLoaded = Promise.all([customElements.whenDefined("gallery-section")]);
      constructor() {
        super(),
          this.addEventListener("change", this.onVariantChange),
          this.addEventListener("keydown", this.onKeyDown),
          (this.container = document.querySelector(
            `section[data-product-handle="${this.getAttribute(
              "data-product-handle"
            )}"]`
          ));
      }
      connectedCallback() {
        this.whenLoaded.then(() => {
          this.initialize();
        });
      }
      disconnectedCallback() {}
      initialize() {
        this.updateOptions(),
          this.updateMasterId(),
          this.updateGallery(),
          this.updateVariantStatuses(),
          this.updateDropdownButtons();
      }
      onKeyDown(event) {
        (event.key === "Enter" || event.keyCode === 13) &&
          event.target.querySelector("input")?.click();
      }
      onVariantChange() {
        const variantChangeStartEvent = new CustomEvent("variantChangeStart", {
          bubbles: !0,
          composed: !0,
        });
        this.dispatchEvent(variantChangeStartEvent),
          this.updateOptions(),
          this.updateMasterId(),
          this.updateGallery(),
          this.toggleAddButton(!0, "", !1),
          this.updatePickupAvailability(),
          this.removeErrorMessage(),
          this.updateVariantStatuses(),
          this.updateDropdownButtons(),
          this.currentVariant
            ? (this.updateMedia(),
              (this.lenOfVariantOptions =
                document.querySelectorAll("variant-options").length),
              this.lenOfVariantOptions === 1 && this.updateURL(),
              this.updateVariantInput(),
              this.renderProductInfo(),
              this.updateShareUrl())
            : (this.toggleAddButton(!0, "", !0), this.setUnavailable());
        const variantChangeEndEvent = new CustomEvent("variantChangeEnd", {
          bubbles: !0,
          composed: !0,
        });
        this.dispatchEvent(variantChangeEndEvent);
      }
      updateGallery() {
        const mediaGallery = document.getElementById(
          `MediaGallery-${this.dataset.section}`
        );
        let media_id = !1;
        this.currentVariant &&
          this.currentVariant.featured_media &&
          (media_id = this.currentVariant.featured_media.id),
          mediaGallery?.filterSlides(this.options, media_id, !0);
      }
      updateDropdownButtons() {
        const fieldsets = Array.from(
          this.querySelectorAll(".wt-product__option")
        );
        (this.options = fieldsets.map(
          (fieldset) =>
            Array.from(fieldset.querySelectorAll("input")).find(
              (radio) => radio.checked
            )?.value || ""
        )),
          fieldsets.forEach((fieldset) => {
            const dropdown = fieldset.querySelector(
              ".wt-product__option__dropdown"
            );
            if (dropdown) {
              const checkedInput = fieldset.querySelector(
                "fieldset input:checked"
              );
              if (!checkedInput) return;
              const isInputDisabled =
                checkedInput?.classList.contains("disabled");
              dropdown.classList.toggle(
                "wt-product__option__dropdown--unavailable",
                isInputDisabled
              );
            }
          });
      }
      updateOptions() {
        const fieldsets = Array.from(
          this.querySelectorAll(".wt-product__option")
        );
        (this.options = fieldsets.map(
          (fieldset) =>
            Array.from(fieldset.querySelectorAll("input")).find(
              (radio) => radio.checked
            )?.value || ""
        )),
          (this.checkedOptions = fieldsets.map(
            (fieldset) =>
              Array.from(fieldset.querySelectorAll("input")).find(
                (radio) => radio.checked
              ) || ""
          )),
          fieldsets.forEach((fieldset, index) => {
            const selectedOption = this.options[index];
            if (!selectedOption) return;
            fieldset.querySelector(
              ".wt-product__option__title .value"
            ).innerHTML = selectedOption;
            const dropdownSpan = fieldset.querySelector(
              ".wt-product__option__dropdown span"
            );
            dropdownSpan && (dropdownSpan.innerHTML = selectedOption);
          });
      }
      updateMasterId() {
        this.currentVariant = this.getVariantData()?.find(
          (variant) =>
            !variant.options
              .map((option, index) => this.options[index] === option)
              .includes(!1)
        );
      }
      updateMedia() {
        if (
          !this.currentVariant ||
          (this.setAttribute("data-variant-id", this.currentVariant?.id),
          !this.currentVariant.featured_media)
        )
          return;
        this.setAttribute(
          "data-featured-image",
          this.currentVariant?.featured_media?.preview_image?.src
        ),
          this.setAttribute(
            "data-featured-image-id",
            this.currentVariant?.featured_media?.id
          );
        const modalContent = document.querySelector(
          `#ProductModal-${this.dataset.section} .product-media-modal__content`
        );
        if (!modalContent) return;
        const newMediaModal = modalContent.querySelector(
          `[data-media-id="${this.currentVariant.featured_media.id}"]`
        );
        modalContent.prepend(newMediaModal);
      }
      updateURL() {
        !this.currentVariant ||
          this.dataset.updateUrl === "false" ||
          window.history.replaceState(
            {},
            "",
            `${this.dataset.url}?variant=${this.currentVariant.id}`
          );
      }
      updateShareUrl() {
        const shareButton = document.getElementById(
          `Share-${this.dataset.section}`
        );
        !shareButton ||
          !shareButton.updateUrl ||
          shareButton.updateUrl(
            `${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`
          );
      }
      updateVariantInput() {
        document
          .querySelectorAll(
            `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
          )
          .forEach((productForm) => {
            const input = productForm.querySelector('input[name="id"]');
            (input.value = this.currentVariant.id),
              input.dispatchEvent(new Event("change", { bubbles: !0 }));
          });
      }
      updateVariantStatuses() {
        const selectedOptionOneVariants = this.variantData?.filter(
            (variant) => variant.available === !0
          ),
          inputWrappers = [...this.querySelectorAll(".product-form__input")],
          checkedInputs = [
            ...this.querySelectorAll(".product-form__input :checked"),
          ],
          checkedInputsValues = [
            ...this.querySelectorAll(".product-form__input :checked"),
          ].map((input) => input.getAttribute("value")),
          previousSelectedOptions = [];
        inputWrappers.forEach((option, index) => {
          if (index === 0 && this.currentVariant?.options.length > 1) return;
          const optionInputs = [
              ...option.querySelectorAll('input[type="radio"], option'),
            ],
            previousOptionSelected =
              inputWrappers[index - 1]?.querySelector(":checked")?.value;
          previousSelectedOptions.push(previousOptionSelected);
          const availableOptionInputsValue = selectedOptionOneVariants
            .filter((variant) =>
              index === 2
                ? variant.available &&
                  variant.option1 === previousSelectedOptions[0] &&
                  variant.option2 === previousSelectedOptions[1]
                : variant.available &&
                  variant[`option${index}`] === previousOptionSelected
            )
            .map((variantOption) => variantOption[`option${index + 1}`]);
          this.setInputAvailability(
            optionInputs,
            availableOptionInputsValue,
            checkedInputsValues,
            index,
            checkedInputs
          );
        });
      }
      setInputAvailability(
        listOfOptions,
        listOfAvailableOptions,
        checkedInputsValues,
        index,
        checkedInputs
      ) {
        function containsSubarray(arr, subarr) {
          return arr.join(",").includes(subarr.join(","));
        }
        const checkedValues = checkedInputsValues.slice(0, index),
          listOfAvailableVariants = this.getVariantData().filter((variant) => {
            if (containsSubarray(variant.options, checkedValues)) return !0;
          }),
          isPreviousOptionChecked =
            checkedInputs.find(
              (input) => input.dataset.position === `${index}`
            ) || index === 0;
        listOfOptions.forEach((input) => {
          if (!isPreviousOptionChecked) return;
          listOfAvailableOptions.includes(input.getAttribute("value"))
            ? input.classList.remove("disabled")
            : input.classList.add("disabled");
          let inputOccurs = !1;
          listOfAvailableVariants.forEach((variant) => {
            variant.options.includes(input.getAttribute("value")) &&
              (inputOccurs = !0);
          }),
            inputOccurs || input.classList.add("disabled");
        });
      }
      updatePickupAvailability() {
        const pickUpAvailability = document.querySelector(
          "pickup-availability"
        );
        pickUpAvailability &&
          ((pickUpAvailability.dataset.variantId = this.currentVariant?.id),
          this.currentVariant && this.currentVariant.available
            ? pickUpAvailability.fetchAvailability(this.currentVariant.id)
            : (pickUpAvailability.removeAttribute("available"),
              (pickUpAvailability.innerHTML = "")));
      }
      removeErrorMessage() {
        const section = this.closest("section");
        if (!section) return;
        const productForm = section.querySelector("product-form");
        try {
          productForm?.handleErrorMessage();
        } catch (err) {
          console.log(err);
        }
      }
      renderProductInfo() {
        const requestedVariantId = this.currentVariant?.id,
          sectionId = this.dataset.originalSection
            ? this.dataset.originalSection
            : this.dataset.section;
        fetch(
          `${this.dataset.url}?variant=${requestedVariantId}&section_id=${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        )
          .then((response) => response.text())
          .then((responseText) => {
            if (this.currentVariant?.id !== requestedVariantId) return;
            const html = new DOMParser().parseFromString(
                responseText,
                "text/html"
              ),
              destination = document.getElementById(
                `price-${this.dataset.section}`
              ),
              source = html.getElementById(
                `price-${
                  this.dataset.originalSection
                    ? this.dataset.originalSection
                    : this.dataset.section
                }`
              ),
              skuSource = html.getElementById(
                `Sku-${
                  this.dataset.originalSection
                    ? this.dataset.originalSection
                    : this.dataset.section
                }`
              ),
              skuDestination = document.getElementById(
                `Sku-${this.dataset.section}`
              ),
              inventorySource = html.getElementById(
                `Inventory-${
                  this.dataset.originalSection
                    ? this.dataset.originalSection
                    : this.dataset.section
                }`
              ),
              inventoryDestination = document.getElementById(
                `Inventory-${this.dataset.section}`
              );
            source && destination && (destination.innerHTML = source.innerHTML),
              inventorySource &&
                inventoryDestination &&
                (inventoryDestination.innerHTML = inventorySource.innerHTML),
              skuSource &&
                skuDestination &&
                ((skuDestination.innerHTML = skuSource.innerHTML),
                skuDestination.classList.toggle(
                  "visibility-hidden",
                  skuSource.classList.contains("visibility-hidden")
                ));
            const price = document.getElementById(
              `price-${this.dataset.section}`
            );
            price && price.classList.remove("visibility-hidden"),
              inventoryDestination &&
                inventoryDestination.classList.toggle(
                  "visibility-hidden",
                  inventorySource.innerText === ""
                );
            const addButtonUpdated = html.getElementById(
              `ProductSubmitButton-${sectionId}`
            );
            this.toggleAddButton(
              addButtonUpdated ? addButtonUpdated.hasAttribute("disabled") : !0,
              window.variantStrings.soldOut
            ),
              publish(PUB_SUB_EVENTS.variantChange, {
                data: { sectionId, html, variant: this.currentVariant },
              });
          });
      }
      toggleAddButton(disable = !0, text, modifyClass = !0) {
        const productForm = document.getElementById(
          `product-form-${this.dataset.section}`
        );
        if (!productForm) return;
        const addButton = productForm.querySelector('[name="add"]'),
          addButtonText = productForm.querySelector('[name="add"] > span');
        addButton &&
          (disable
            ? (addButton.setAttribute("disabled", "disabled"),
              text && (addButtonText.textContent = text))
            : (addButton.removeAttribute("disabled"),
              (addButtonText.textContent = window.variantStrings.addToCart)));
      }
      setUnavailable() {
        const button = document.getElementById(
            `product-form-${this.dataset.section}`
          ),
          addButton = button.querySelector('[name="add"]'),
          addButtonText = button.querySelector('[name="add"] > span'),
          price = document.getElementById(`price-${this.dataset.section}`),
          inventory = document.getElementById(
            `Inventory-${this.dataset.section}`
          ),
          sku = document.getElementById(`Sku-${this.dataset.section}`);
        addButton &&
          ((addButtonText.textContent = window.variantStrings.unavailable),
          price && price.classList.add("visibility-hidden"),
          inventory && inventory.classList.add("visibility-hidden"),
          sku && sku.classList.add("visibility-hidden"));
      }
      getVariantData() {
        return (
          (this.variantData =
            this.variantData ||
            JSON.parse(
              this.querySelector('[type="application/json"]').textContent
            )),
          this.variantData
        );
      }
    }
  );
//# sourceMappingURL=/cdn/shop/t/8/assets/variants.js.map?v=97759376859081925071759388683

customElements.get("product-form") ||
  customElements.define(
    "product-form",
    class extends HTMLElement {
      constructor() {
        super(),
          (this.form = this.querySelector("form")),
          (this.formInput = this.form?.querySelector("[name=id]")),
          this.formInput && (this.formInput.disabled = !1),
          this.form?.addEventListener(
            "submit",
            this.onSubmitHandler.bind(this)
          ),
          (this.cart = document.querySelector("cart-drawer")),
          (this.cartType = this.cart?.dataset.cartType || "page"),
          (this.submitButton = this.querySelector('[type="submit"]')),
          (this.body = document.querySelector("body")),
          document.querySelector("cart-drawer") &&
            this.submitButton?.setAttribute("aria-haspopup", "dialog"),
          (this.hideErrors = this.dataset.hideErrors === "true"),
          (this.handleErrorMessage = this.handleErrorMessage.bind(this)),
          (this.redirectAfterSubmit = this.redirectAfterSubmit.bind(this)),
          (this.disableLoadingInButton =
            this.disableLoadingInButton.bind(this));
      }
      closeComplementaryProduct() {
        const complementaryOverlayPage = document.querySelector(
          ".wt__quick-buy--page-overlay"
        );
        this.body.classList.contains("quick-buy-page-overlay") &&
          this.body.classList.remove("quick-buy-page-overlay"),
          complementaryOverlayPage.classList.contains(
            "wt__quick-buy--page-overlay--open"
          ) &&
            complementaryOverlayPage.classList.remove(
              "wt__quick-buy--page-overlay--open"
            );
      }
      onSubmitHandler(evt) {
        if (
          (evt.preventDefault(),
          this.submitButton.getAttribute("aria-disabled") === "true")
        )
          return;
        this.handleErrorMessage(),
          this.cart?.setActiveElement(document.activeElement);
        const loader = this.querySelector(".loading-overlay__spinner");
        this.submitButton.setAttribute("aria-disabled", !0),
          this.submitButton.classList.add("loading"),
          loader && loader.classList.remove("hidden");
        const config = fetchConfig("javascript");
        (config.headers["X-Requested-With"] = "XMLHttpRequest"),
          delete config.headers["Content-Type"];
        const formData = new FormData(this.form);
        this.cart && typeof this.cart.getSectionsToRender == "function"
          ? formData.append(
              "sections",
              this.cart.getSectionsToRender().map((section) => section.id)
            )
          : formData.append("sections", []),
          formData.append("sections_url", window.location.pathname),
          (config.body = formData),
          fetch(`${routes.cart_add_url}`, config)
            .then((response) => response.json())
            .then((response) => {
              if (response.status) {
                publish(PUB_SUB_EVENTS.cartError, {
                  source: "product-form",
                  productVariantId: formData.get("id"),
                  errors: response.errors || response.description,
                  message: response.message,
                }),
                  this.handleErrorMessage(response.description),
                  (this.error = !0);
                const soldOutMessage =
                  this.submitButton.querySelector(".sold-out-message");
                if (
                  (this.dispatchEvent(
                    new CustomEvent("cart-drawer:refresh", {
                      detail: { response },
                      bubbles: !0,
                      composed: !0,
                    })
                  ),
                  !soldOutMessage)
                )
                  return;
                this.submitButton.setAttribute("aria-disabled", !0),
                  this.submitButton
                    .querySelector("span")
                    .classList.add("hidden"),
                  soldOutMessage.classList.remove("hidden");
                return;
              } else if (!this.cart) {
                window.location = window.routes.cart_url;
                return;
              }
              this.error ||
                publish(PUB_SUB_EVENTS.cartUpdate, {
                  source: "product-form",
                  productVariantId: formData.get("id"),
                  cartData: response,
                }),
                (this.error = !1);
              const quickAddModal = this.closest("quick-add-modal");
              if (quickAddModal)
                document.body.addEventListener(
                  "modalClosed",
                  () => {
                    setTimeout(() => {
                      this.redirectAfterSubmit(response);
                    });
                  },
                  { once: !0 }
                ),
                  this.cartType === "drawer" && quickAddModal.hide(!0);
              else {
                const isClosedCart = !document.body.classList.contains(
                  "page-overlay-cart-on"
                );
                this.redirectAfterSubmit(response, isClosedCart);
              }
            })
            .catch((e) => {
              console.error(e),
                e instanceof TypeError &&
                  e.message.includes("'cart-drawer'") &&
                  location.reload();
            })
            .finally(() => {
              if (
                (this.cart &&
                  this.cart.classList.contains("is-empty") &&
                  this.cart.classList.remove("is-empty"),
                this.submitButton.removeAttribute("aria-disabled"),
                this.error)
              ) {
                this.disableLoadingInButton();
                return;
              }
              (this.quick_add_container = document.querySelector(
                ".wt__quick-buy__container"
              )),
                (this.quick_add_overlay = document.querySelector(
                  ".wt__quick-buy--page-overlay"
                )),
                (this.quick_add_product =
                  this.quick_add_container.querySelector(".wt-product")),
                (this.loader = this.quick_add_container.querySelector(
                  ".wt__quick-buy-loader"
                )),
                this.quick_add_container.classList.contains("hidden") ||
                  (this.quick_add_product?.remove(),
                  this.quick_add_container.classList.remove(
                    "wt__quick-buy__container--open"
                  ),
                  this.quick_add_overlay.classList.remove(
                    "wt__quick-buy--page-overlay--open"
                  ),
                  document.body.classList.remove("quick-buy-page-overlay"),
                  this.loader.classList.remove("hidden")),
                setTimeout(() => {
                  this.disableLoadingInButton();
                }, 200);
            });
      }
      disableLoadingInButton() {
        this.submitButton.classList.remove("loading"),
          this.querySelector(".loading-overlay__spinner").classList.add(
            "hidden"
          );
      }
      redirectAfterSubmit(response, isClosedCart = !0) {
        const body = document.body,
          isCartPage = body.classList.contains("template-cart");
        if (this.cartType === "drawer" && isCartPage)
          document
            .querySelector(".wt__quick-buy--page-overlay")
            .classList.remove("wt__quick-buy--page-overlay--open"),
            body.classList.remove("quick-buy-page-overlay");
        else if (this.cartType === "drawer") {
          this.cart.renderContents(response, isClosedCart);
          return;
        }
        window.location = window.routes.cart_url;
      }
      handleErrorMessage(errorMessage = !1) {
        this.hideErrors ||
          ((this.errorMessageWrapper =
            this.errorMessageWrapper ||
            this.querySelector(".product-form__error-message-wrapper")),
          this.errorMessageWrapper &&
            ((this.errorMessage =
              this.errorMessage ||
              this.errorMessageWrapper.querySelector(
                ".product-form__error-message"
              )),
            this.errorMessageWrapper.toggleAttribute("hidden", !errorMessage),
            errorMessage && (this.errorMessage.textContent = errorMessage)));
      }
    }
  );
//# sourceMappingURL=/cdn/shop/t/8/assets/product-form.js.map?v=146113715940201324501755631078

customElements.get("quick-add") ||
  customElements.define(
    "quick-add",
    class extends HTMLElement {
      getFocusableElements(parent) {
        const focusableElementsSelector =
            "button:not(.wt-product__sticky-buy__button), [href], input:not(.disabled):not([type='hidden']), select, .close-btn",
          focusableElements = () =>
            Array.from(
              parent.querySelectorAll(focusableElementsSelector)
            ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex >= 0);
        return {
          focusableElements,
          first: focusableElements()[0],
          last: focusableElements()[focusableElements().length - 1],
        };
      }
      connectedCallback() {
        (this.add_button = this.querySelector("button")),
          (this.isDrawerOpen = !1),
          (this.isMobile = window.innerWidth < 768),
          this.add_button &&
            this.add_button.addEventListener("click", (e) => {
              const cardLink = e.currentTarget
                .closest(".card__picture-container")
                ?.querySelector("a.card");
              (this.product_url =
                this.add_button.getAttribute("data-product-url")),
                (this.currentTrigger = cardLink),
                this.fetchProduct(this.product_url);
            }),
          (this.handleInteractionOutside =
            this.handleInteractionOutside.bind(this)),
          (this.getFocusableElements = this.getFocusableElements.bind(this)),
          this.lastFeaturedImage,
          this.firstMedia,
          this.hasFirstMediaImg,
          (this.fetchProduct = this.fetchProduct.bind(this)),
          (this.galleryObserver = this.galleryObserver.bind(this)),
          (this.observerCallback = this.observerCallback.bind(this)),
          (this.disconnectObserver = this.disconnectObserver.bind(this)),
          (this.removeButtonEventListener =
            this.removeButtonEventListener.bind(this));
      }
      fetchProduct(product_url) {
        (this.lastFeaturedImage = null),
          (this.firstMedia = null),
          (this.hasFirstMediaImg = null),
          (this.quick_add = document.querySelector(".wt__quick-buy")),
          (this.quick_add_container = document.querySelector(
            ".wt__quick-buy__container"
          )),
          (this.quick_add_wrapper = document.querySelector(
            ".wt__quick-buy--wrapper"
          )),
          (this.quick_add_product = this.quick_add.querySelector(
            ".wt__quick-buy--product"
          )),
          (this.close_button = this.quick_add.querySelector(".close-btn")),
          (this.loader = this.quick_add.querySelector(".wt__quick-buy-loader")),
          (this.page_overlay = document.querySelector(
            ".wt__quick-buy--page-overlay"
          )),
          (this.body = document.body);
        const controller = new AbortController(),
          signal = controller.signal;
        this.quick_add_wrapper
          .querySelectorAll(".wt-product")
          ?.forEach((product) => product.remove()),
          this.quick_add.classList.remove("hidden"),
          this.body.classList.add("quick-buy-page-overlay"),
          this.page_overlay.classList.add("wt__quick-buy--page-overlay--open"),
          (this.interactiveEelements = () =>
            this.quick_add_container.querySelectorAll()),
          this.quick_add_container.classList.add(
            "wt__quick-buy__container--open"
          ),
          this.close_button.addEventListener("click", () => {
            controller.abort(),
              this.closeCart(),
              this.close_button.setAttribute("tabindex", "-1"),
              this.currentTrigger?.focus();
          }),
          this.quick_add_container.addEventListener("keydown", (e) => {
            const isTabPressed =
                e.key === "Tab" || e.keyCode === 9 || e.code === "Tab",
              { first, last } = this.getFocusableElements(
                this.quick_add_container
              );
            (e.key === "Escape" || e.keyCode === 27 || e.code === "Escape") &&
              this.close_button.click(),
              isTabPressed &&
                (e.shiftKey && document.activeElement === first
                  ? (last.focus(), e.preventDefault())
                  : !e.shiftKey &&
                    document.activeElement === last &&
                    (first.focus(), e.preventDefault()));
          }),
          fetch(product_url, { signal })
            .then((res) => res.text())
            .then((res) => {
              this.loader.classList.add("hidden");
              const htmlDocument = new DOMParser().parseFromString(
                res,
                "text/html"
              );
              (this.productMain =
                htmlDocument.querySelector(".wt-product__main")),
                (this.productCard = htmlDocument.querySelector(".wt-product")),
                (this.productInfo =
                  htmlDocument.querySelector(".wt-product__info")),
                this.productMain
                  .querySelectorAll(".scroll-trigger.animate--slide-in")
                  ?.forEach((element) =>
                    element.classList.remove(
                      "scroll-trigger",
                      "animate--slide-in"
                    )
                  ),
                this.removeElements(
                  this.productCard,
                  "collapsible-section",
                  "[not-quick-add]",
                  ".product__inventory",
                  ".share-icons__container",
                  "#gallery-loader",
                  "pickup-availability",
                  ".wt-product__sku",
                  ".wt-product__feature-icons"
                );
              const newVariantId =
                this.productCard.querySelector("variant-options");
              newVariantId &&
                ((newVariantId.dataset.updateUrl = "false"),
                this.updateAttribute(
                  newVariantId,
                  "data-original-section",
                  newVariantId.getAttribute("data-section")
                ),
                this.updateAttribute(
                  newVariantId,
                  "data-section",
                  `quick-${newVariantId.getAttribute("data-section")}`
                ));
              const productGallery =
                this.productCard.querySelector("gallery-section");
              (productGallery.style.display = "none"),
                (this.images = productGallery.querySelectorAll("img")),
                this.updateAttribute(
                  productGallery,
                  "id",
                  `MediaGallery-${newVariantId?.getAttribute("data-section")}`
                );
              const firstImageFromGallery = productGallery.querySelector("li");
              firstImageFromGallery &&
                ((this.firstMedia = firstImageFromGallery),
                (this.playBtn = this.firstMedia.querySelector(".model-btn")),
                this.playBtn && this.playBtn.setAttribute("tabindex", "0"),
                (this.video = this.firstMedia.querySelector("video")),
                this.video && this.video.setAttribute("tabindex", "0"),
                (this.hasFirstMediaImg =
                  !!firstImageFromGallery.querySelector("img"))),
                firstImageFromGallery
                  ?.querySelector("img")
                  ?.removeAttribute("srcset");
              const imageContainer = document.createElement("div");
              imageContainer.setAttribute("class", "product-image");
              const productDetails = document.createElement("div");
              productDetails.setAttribute("class", "wt-product__details");
              const productAbout = document.createElement("div");
              productAbout.setAttribute("class", "product-info");
              const title = this.productInfo.querySelector(".wt-product__name");
              if (title) {
                const aElement = document.createElement("a");
                (aElement.textContent = title.textContent),
                  (aElement.href = this.product_url),
                  (title.innerHTML = ""),
                  title.appendChild(aElement),
                  title.setAttribute("tabindex", "0");
              }
              this.productInfo
                .querySelectorAll(
                  ".wt-product__brand, .wt-product__name, .wt-rating, .wt-product__price, .product__tax"
                )
                .forEach((product) => productAbout.appendChild(product)),
                (imageContainer.innerHTML =
                  firstImageFromGallery?.innerHTML || ""),
                productDetails.appendChild(imageContainer),
                productDetails.appendChild(productAbout),
                this.productInfo.prepend(productDetails),
                this.galleryObserver();
              const mainProductPrice =
                this.productCard.querySelector(".wt-product__price");
              this.updateAttribute(
                mainProductPrice,
                "id",
                `price-${newVariantId?.getAttribute("data-section")}`
              );
              const allFieldSets =
                this.productCard.querySelectorAll("fieldset");
              this.updateFieldSets(allFieldSets);
              const addBtn =
                this.productCard.querySelector('button[name="add"]');
              this.updateAttribute(
                addBtn,
                "id",
                `ProductSubmitButton-${newVariantId?.getAttribute(
                  "data-section"
                )}`
              );
              const form = this.productCard.querySelector(
                'form[method="post"][data-type="add-to-cart-form"]'
              );
              this.updateAttribute(
                form,
                "id",
                `product-form-${newVariantId?.getAttribute("data-section")}`
              );
              const viewAllDetailsContainer =
                this.quick_add_wrapper.querySelector(
                  ".wt__quick-buy__view-all-container"
                );
              this.quick_add_wrapper.removeChild(viewAllDetailsContainer),
                (this.quick_add_wrapper.innerHTML +=
                  this.productCard.outerHTML),
                this.quick_add_wrapper.append(viewAllDetailsContainer);
              const giftCardInput = this.quick_add_wrapper.querySelector(
                '[name="properties[__shopify_send_gift_card_to_recipient]"]'
              );
              giftCardInput && giftCardInput.removeAttribute("disabled"),
                this.addViewAllDetailsButton(),
                (this.isDrawerOpen = !0),
                publish(PUB_SUB_EVENTS.quickBuyDrawerOpen, {
                  source: "quick-add",
                }),
                this.close_button.setAttribute("tabindex", "0"),
                this.close_button.focus(),
                document.addEventListener(
                  "click",
                  this.handleInteractionOutside
                );
            })
            .catch((error) => {
              error.name === "AbortError"
                ? console.error("Fetch aborted")
                : console.error("Fetch error:", error);
            });
      }
      addViewAllDetailsButton() {
        const viewAllDetailsContainer = this.quick_add_wrapper.querySelector(
            ".wt__quick-buy__view-all-container"
          ),
          link = viewAllDetailsContainer.querySelector("a");
        (link.href = this.product_url),
          link.setAttribute("tabindex", "0"),
          viewAllDetailsContainer.classList.remove("hidden");
      }
      hideViewAllDetailsButton() {
        this.quick_add_wrapper
          .querySelector(".wt__quick-buy__view-all-container")
          .classList.add("hidden");
      }
      galleryObserver() {
        const config = {
          attributes: !0,
          childList: !0,
          subtree: !0,
          characterData: !0,
        };
        (this.observer = new MutationObserver(this.observerCallback)),
          this.observer.observe(this.quick_add_wrapper, config);
      }
      observerCallback(mutations) {
        for (const mutation of mutations)
          if (mutation.target.localName === "variant-options") {
            this.quick_add = document.querySelector(".wt__quick-buy");
            const variantOptions =
                this.quick_add.querySelector("variant-options"),
              imageContainer = this.quick_add.querySelector(".product-image"),
              image = imageContainer.querySelector("img"),
              formInput = this.quick_add.querySelector('form input[name="id"]');
            if (
              (variantOptions.getAttribute("data-variant-id") &&
                ((formInput.value =
                  variantOptions.getAttribute("data-variant-id")),
                formInput.setAttribute(
                  "value",
                  variantOptions.getAttribute("data-variant-id")
                )),
              variantOptions.getAttribute("data-featured-image") &&
                this.lastFeaturedImage !==
                  variantOptions.getAttribute("data-featured-image"))
            ) {
              if (
                (image?.setAttribute(
                  "src",
                  variantOptions.getAttribute("data-featured-image")
                ),
                image?.removeAttribute("srcset"),
                (this.lastFeaturedImage = variantOptions.getAttribute(
                  "data-featured-image"
                )),
                imageContainer.children[0]?.nodeName !== "IMG" &&
                  imageContainer.children[0]?.nodeName !== "A")
              ) {
                const newImage = document.createElement("img");
                newImage.setAttribute(
                  "class",
                  "wt-product__img  wt-product__img--zoom-cursor"
                ),
                  newImage.setAttribute(
                    "src",
                    variantOptions.getAttribute("data-featured-image")
                  ),
                  newImage.removeAttribute("srcset"),
                  (imageContainer.innerHTML = ""),
                  imageContainer.appendChild(newImage);
              } else
                image.setAttribute(
                  "src",
                  variantOptions.getAttribute("data-featured-image")
                ),
                  image.removeAttribute("srcset");
              this.lastFeaturedImage = variantOptions.getAttribute(
                "data-featured-image"
              );
            } else {
              const hasFirstMediaModel =
                this.firstMedia?.querySelector("model-element");
              (!this.hasFirstMediaImg || hasFirstMediaModel) &&
                (imageContainer.innerHTML = this.firstMedia?.innerHTML);
            }
            break;
          }
      }
      handleInteractionOutside(event) {
        this.isDrawerOpen &&
          event.target === this.page_overlay &&
          this.closeCart();
      }
      closeCart() {
        publish(PUB_SUB_EVENTS.quickBuyDrawerClose, { source: "quick-add" }),
          this.quick_add
            .querySelector(".wt__quick-buy-loader")
            .classList.remove("hidden");
        const product = this.quick_add.querySelector(".wt-product");
        product && product.remove(),
          this.body.classList.remove("quick-buy-page-overlay"),
          this.page_overlay.classList.remove(
            "wt__quick-buy--page-overlay--open"
          ),
          this.quick_add_container.classList.remove(
            "wt__quick-buy__container--open"
          ),
          (this.isDrawerOpen = !1),
          this.hideViewAllDetailsButton(),
          document.removeEventListener("click", this.handleInteractionOutside),
          this.disconnectObserver(),
          this.removeButtonEventListener();
      }
      removeElements(element, ...selectors) {
        selectors.forEach((selector) => {
          element.querySelectorAll(selector).forEach((el) => el.remove());
        });
      }
      updateAttribute(element, attribute, value) {
        element && element.setAttribute(attribute, value);
      }
      updateFieldSets(fieldSets) {
        fieldSets.forEach((fieldset) => {
          const inputRadios = fieldset.querySelectorAll('input[type="radio"]'),
            labels = fieldset.querySelectorAll("label");
          inputRadios.forEach((radio) => {
            this.updateAttribute(
              radio,
              "id",
              `quick-${radio.getAttribute("id")}`
            ),
              this.updateAttribute(
                radio,
                "form",
                `product-form-${radio.getAttribute("id")}`
              );
          }),
            labels.forEach((label) => {
              this.updateAttribute(
                label,
                "for",
                `quick-${label.getAttribute("for")}`
              );
            });
        });
      }
      disconnectObserver() {
        this.observer?.disconnect();
      }
      removeButtonEventListener() {
        this.add_button &&
          this.add_button.removeEventListener("click", () =>
            this.fetchProduct(this.product_url)
          );
      }
      disconnectedCallback() {
        this.disconnectObserver(), this.removeButtonEventListener();
      }
    }
  );
//# sourceMappingURL=/cdn/shop/t/8/assets/quick-add.js.map?v=167860903500772870611755631079

(function () {
  const Swiper = window.Swiper;
  const ANIMATION_CLASSES = ["scroll-trigger", "animate--slide-in"],
    ANIMATION_MOBILE_DISABLED_CLASS = "disabled-on-mobile";
  function getSlideAnimTarget(slide) {
    const directDiv = slide.querySelector(":scope > div");
    if (directDiv) return directDiv;
    const first = slide.firstElementChild;
    return first && first.tagName === "DIV" ? first : null;
  }
  function markInitialVisibleSlides(
    swiper,
    {
      disableOnMobile = !1,
      cascade = !0,
      animClasses = ANIMATION_CLASSES,
      mobileDisabledClass = ANIMATION_MOBILE_DISABLED_CLASS,
      cascadeAttrName = "data-cascade",
      orderVarName = "--animation-order",
      orderStart = 1,
      force = !1,
    } = {}
  ) {
    if (!swiper || !swiper.slides || swiper.slides.length === 0) {
      console.warn(
        "markInitialVisibleSlides(): swiper or slides doesn't exist",
        {
          swiper: !!swiper,
          slides: !!swiper?.slides,
          slidesLength: swiper?.slides?.length,
        }
      );
      return;
    }
    if (swiper.__initAnimated && !force) return;
    swiper.slides.forEach((slide) => {
      const target = getSlideAnimTarget(slide);
      target &&
        (target.classList.remove(
          ...animClasses,
          ...(disableOnMobile ? [mobileDisabledClass] : [])
        ),
        cascade &&
          (target.removeAttribute(cascadeAttrName),
          target.style.removeProperty(orderVarName)));
    });
    let visible = Array.from(swiper.slides).filter((slide) =>
      slide.classList.contains("swiper-slide-visible")
    );
    if (visible.length === 0) {
      let inViewCount = 1;
      const spv = swiper.params?.slidesPerView;
      if (typeof spv == "number") inViewCount = Math.max(1, spv);
      else
        try {
          inViewCount = Math.max(
            1,
            Math.round(
              typeof swiper.slidesPerViewDynamic == "function"
                ? swiper.slidesPerViewDynamic("current", !0)
                : 1
            )
          );
        } catch {
          inViewCount = 1;
        }
      const start = swiper.activeIndex ?? 0;
      visible = Array.from({ length: inViewCount })
        .map((_, i) => swiper.slides[start + i])
        .filter(Boolean);
    }
    visible.forEach((slide, i) => {
      const target = getSlideAnimTarget(slide);
      target &&
        (target.classList.add(
          ...animClasses,
          ...(disableOnMobile ? [mobileDisabledClass] : [])
        ),
        cascade &&
          (target.setAttribute(cascadeAttrName, ""),
          target.style.setProperty(orderVarName, String(orderStart + i))));
    }),
      (swiper.__initAnimated = !0);
  }
  customElements.get("slideshow-section") ||
    customElements.define(
      "slideshow-section",
      class extends HTMLElement {
        constructor() {
          super(),
            (this.swiper = null),
            (this.configuration = null),
            (this.handleKeyboard = this.handleKeyboard.bind(this));
        }
        handleTabindex(swiper) {
          const isSlidesGroup = this.hasAttribute("data-slides-group"),
            focusableSelectors =
              "a, button, input, textarea, select, [tabindex]",
            totalSlides = swiper.slides.length,
            slidesPerView = swiper.params.slidesPerView;
          swiper && totalSlides > slidesPerView
            ? swiper.slides.forEach((slide) => {
                if (isSlidesGroup) {
                  const slideRect = slide.getBoundingClientRect(),
                    swiperRect = this.getBoundingClientRect(),
                    isFullyVisible =
                      slideRect.left >= swiperRect.left &&
                      slideRect.right <= swiperRect.right &&
                      slideRect.top >= swiperRect.top &&
                      slideRect.bottom <= swiperRect.bottom;
                  slide.querySelectorAll(focusableSelectors).forEach((el) => {
                    isFullyVisible
                      ? el.setAttribute("tabindex", "0")
                      : el.setAttribute("tabindex", "-1"),
                      el.hasAttribute("data-omit-tabindex") &&
                        el.setAttribute("tabindex", "-1");
                  });
                } else
                  swiper.slides.forEach((slide2) => {
                    slide2
                      .querySelectorAll(focusableSelectors)
                      .forEach((el) => {
                        el.setAttribute("tabindex", "-1");
                      });
                  }),
                    swiper.slides[swiper.activeIndex]
                      ?.querySelectorAll(focusableSelectors)
                      .forEach((el) => {
                        el.setAttribute(
                          "tabindex",
                          el.hasAttribute("data-omit-tabindex") ? "-1" : "0"
                        );
                      });
              })
            : swiper.slides.forEach((slide) => {
                slide.querySelectorAll(focusableSelectors).forEach((el) => {
                  el.setAttribute(
                    "tabindex",
                    el.hasAttribute("data-omit-tabindex") ? "-1" : "0"
                  );
                });
              });
        }
        handleKeyboard(event) {
          const keyCode = event.keyCode || event.which,
            focusedElement = document.activeElement;
          if (this.swiper && this.swiper.el.contains(focusedElement))
            switch (keyCode) {
              case 37:
                this.swiper.slidePrev();
                break;
              case 39:
                this.swiper.slideNext();
                break;
            }
        }
        connectedCallback() {
          this.readConfiguration(),
            (this.initializeOrDestroySwiperForBrands =
              this.initializeOrDestroySwiperForBrands.bind(this)),
            (this.centerNavigation = this.centerNavigation.bind(this)),
            (this.shouldSkipCenterNavMethod =
              this.dataset.skipCenterNavMethod === "true"),
            window.innerWidth < 900 && !this.swiper && this.swiperInitilize(),
            window.addEventListener("resize", this.centerNavigation),
            this.dataset.brands === "true"
              ? window.addEventListener(
                  "resize",
                  this.initializeOrDestroySwiperForBrands
                )
              : this.configuration.enableOnMedia
              ? (window.addEventListener(
                  "resize",
                  this.matchResolution.bind(this)
                ),
                (this.breakpoint = window.matchMedia(
                  this.configuration.enableOnMedia
                )),
                this.matchResolution())
              : this.swiper || this.swiperInitilize(),
            window.addEventListener("keydown", this.handleKeyboard);
        }
        disconnectedCallback() {
          window.removeEventListener(
            "resize",
            this.initializeOrDestroySwiperForBrands
          ),
            window.removeEventListener("resize", this.centerNavigation),
            window.removeEventListener("keydown", this.handleKeyboard);
        }
        initializeOrDestroySwiperForBrands() {
          window.innerWidth < 900
            ? this.swiper || this.swiperInitilize()
            : this.swiper && this.swiperDestroy();
        }
        centerNavigation() {
          if (window.innerWidth < 900 || this.shouldSkipCenterNavMethod) return;
          const picture = this.querySelector("picture")?.classList.contains(
            "hero__pic--mobile"
          )
            ? this.querySelectorAll("picture")[1]
            : this.querySelector("picture");
          if (picture) {
            const boundingClientRectPic = picture.getBoundingClientRect();
            this.querySelectorAll(".wt-slider__nav-btn").forEach(
              (btn) =>
                (btn.style.top = `${22 + boundingClientRectPic.height / 2}px`)
            );
          }
        }
        _cleanupSlideAnimations(swiper) {
          swiper.slides.forEach((slide) => {
            const target = getSlideAnimTarget(slide);
            target &&
              (target.classList.remove(
                ...ANIMATION_CLASSES,
                ANIMATION_MOBILE_DISABLED_CLASS
              ),
              target.removeAttribute("data-cascade"),
              target.style.removeProperty("--animation-order"));
          }),
            (swiper.__initAnimated = !1);
        }
        _syncInitialAnimations(swiper, { force = !1 } = {}) {
          const animationEnabled = !!this.configuration.enableAnimation,
            disableOnMobile = !!this.configuration.disableAnimationOnMobile;
          if (!animationEnabled) {
            this._cleanupSlideAnimations(swiper);
            return;
          }
          setTimeout(() => {
            markInitialVisibleSlides(swiper, { disableOnMobile, force });
          }, 0);
        }
        readConfiguration() {
          const default_configuration = {
              autoHeight: !1,
              slidesPerView: 1,
              autoplay: !1,
              threshold: 5,
              watchSlidesProgress: !0,
              enableAnimation: !1,
              disableAnimationOnMobile: !1,
              pagination: {
                el: ".swiper-pagination",
                renderBullet(index, className) {
                  return `<span class="${className} swiper-pagination-bullet--svg-animation"><svg width="20" height="20" viewBox="0 0 28 28"><circle class="svg__circle" cx="14" cy="14" r="12" fill="none" stroke-width="2"></circle><circle class="svg__circle-inner" cx="14" cy="14" r="5" stroke-width="2"></circle></svg></span>`;
                },
              },
              navigation: {
                nextEl: ".wt-slider__nav-next",
                prevEl: ".wt-slider__nav-prev",
              },
              scrollbar: !1,
              on: {
                afterInit: (swiper) => {
                  this._syncInitialAnimations(swiper, { force: !1 });
                  const dataSwiper = this.querySelector("[data-swiper]"),
                    dataSwiperContainer = this.querySelector(
                      "[data-swiper-container]"
                    );
                  dataSwiper?.classList.remove("loading"),
                    dataSwiperContainer?.classList.remove("loading"),
                    this.centerNavigation(),
                    this.handleTabindex(swiper);
                },
                resize: (swiper) => {
                  this._syncInitialAnimations(swiper, { force: !0 });
                },
                slideChangeTransitionEnd: (swiper) => {
                  this.handleTabindex(swiper);
                },
              },
            },
            get_custom_configuration = this.querySelector(
              "[data-swiper-configuration]"
            )?.innerHTML,
            custom_configuration = get_custom_configuration
              ? JSON.parse(get_custom_configuration)
              : {};
          if (
            ((this.configuration = {
              ...default_configuration,
              ...custom_configuration,
            }),
            this.configuration.autoplay)
          ) {
            if (window.innerWidth < 900)
              var override_configuration = { autoplay: !1 };
            this.configuration = {
              ...this.configuration,
              ...override_configuration,
            };
          }
        }
        matchResolution() {
          this.breakpoint.matches === !0
            ? this.swiper || this.swiperInitilize()
            : this.swiper && this.swiperDestroy();
        }
        swiperInitilize() {
          if (this.swiper) return;
          const containerEl = this.querySelector("[data-swiper]"),
            wrapperEl = this.querySelector("[data-swiper-container]"),
            slideEls = this.querySelectorAll("[data-swiper-slide]");
          if (!containerEl || !wrapperEl) {
            console.warn(
              "[slideshow-section] Missing required elements for Swiper init.",
              { container: !!containerEl, wrapper: !!wrapperEl }
            );
            return;
          }
          slideEls.forEach((el) => {
            el.classList.remove(
              ...ANIMATION_CLASSES,
              ANIMATION_MOBILE_DISABLED_CLASS
            );
          }),
            containerEl.classList.add("swiper", "wt-slider__container"),
            wrapperEl.classList.add("swiper-wrapper", "wt-slider__wrapper"),
            slideEls.forEach((el) =>
              el.classList.add("swiper-slide", "wt-slider__slide")
            );
          const paginationEl =
              this.querySelector(".wt-slider__pagination") ||
              this.querySelector(".swiper-pagination"),
            nextEl =
              this.querySelector(".wt-slider__nav-next--featured") ||
              this.querySelector(".wt-slider__nav-next"),
            prevEl =
              this.querySelector(".wt-slider__nav-prev--featured") ||
              this.querySelector(".wt-slider__nav-prev"),
            cfg = { ...this.configuration };
          if (paginationEl || cfg.pagination) {
            const resolvedPagEl =
              paginationEl ||
              (typeof cfg.pagination?.el == "string"
                ? this.querySelector(cfg.pagination.el)
                : cfg.pagination?.el);
            resolvedPagEl
              ? (cfg.pagination = {
                  clickable: !0,
                  ...(cfg.pagination || {}),
                  el: resolvedPagEl,
                })
              : delete cfg.pagination;
          }
          if (nextEl || prevEl || cfg.navigation) {
            const resolvedNext =
                nextEl ||
                (typeof cfg.navigation?.nextEl == "string"
                  ? this.querySelector(cfg.navigation.nextEl)
                  : cfg.navigation?.nextEl),
              resolvedPrev =
                prevEl ||
                (typeof cfg.navigation?.prevEl == "string"
                  ? this.querySelector(cfg.navigation.prevEl)
                  : cfg.navigation?.prevEl);
            resolvedNext && resolvedPrev
              ? (cfg.navigation = {
                  ...(cfg.navigation || {}),
                  nextEl: resolvedNext,
                  prevEl: resolvedPrev,
                })
              : delete cfg.navigation;
          }
          if (cfg.scrollbar) {
            const resolvedScrollbarEl =
              typeof cfg.scrollbar.el == "string"
                ? this.querySelector(cfg.scrollbar.el)
                : cfg.scrollbar.el;
            resolvedScrollbarEl
              ? (cfg.scrollbar = {
                  ...(cfg.scrollbar || {}),
                  el: resolvedScrollbarEl,
                })
              : delete cfg.scrollbar;
          }
          this.swiper = new Swiper(containerEl, cfg);
        }
        swiperDestroy() {
          this.swiper &&
            ((this.swiper.__initAnimated = !1),
            this.querySelector("[data-swiper]").classList.remove(
              "swiper",
              "wt-slider__container"
            ),
            this.querySelector("[data-swiper-container]").classList.remove(
              "swiper-wrapper",
              "wt-slider__wrapper"
            ),
            this.querySelectorAll("[data-swiper-slide]").forEach(function (e) {
              e.classList.remove("swiper-slide", "wt-slider__slide");
            }),
            this.swiper.destroy(),
            this.querySelector(".swiper-pagination") &&
              (this.querySelector(".swiper-pagination").innerHTML = ""),
            (this.swiper = null));
        }
        slideTo(slide) {
          this.swiper.autoplay.stop();
          const index = Array.from(slide.parentNode.children).indexOf(slide);
          this.swiper.slideTo(index);
        }
      }
    );
  //# sourceMappingURL=/cdn/shop/t/8/assets/slider.js.map?v=104837963741301092741760474640
})();

customElements.get("products-slider") ||
  customElements.define(
    "products-slider",
    class extends HTMLElement {
      constructor() {
        super();
      }
      connectedCallback() {
        this.interval = setInterval(() => {
          const mainSliderContainer = this.querySelector(
              ".wt-products-slider__slider--products [data-swiper]"
            ),
            promoSliderContainer = this.querySelector(
              ".wt-products-slider__slider--promo [data-swiper]"
            ),
            mainSlider = mainSliderContainer?.swiper,
            promoSlider = promoSliderContainer?.swiper;
          mainSlider &&
            promoSlider &&
            (clearInterval(this.interval),
            this.initializeSync(mainSlider, promoSlider));
        }, 100);
      }
      initializeSync(mainSlider, promoSlider) {
        const updateCssVariables = (slider) => {
          const activeSlide = slider.slides[slider.activeIndex];
          if (activeSlide) {
            const cssVariableValue = getComputedStyle(activeSlide)
              .getPropertyValue("--slide-text-color")
              .trim();
            this.style.setProperty("--slider-bullets-color", cssVariableValue);
          }
        };
        updateCssVariables(mainSlider),
          updateCssVariables(promoSlider),
          mainSlider.on("slideChange", () => {
            promoSlider.slideTo(mainSlider.activeIndex),
              updateCssVariables(mainSlider);
          }),
          promoSlider.on("slideChange", () => {
            mainSlider.slideTo(promoSlider.activeIndex),
              updateCssVariables(promoSlider);
          });
      }
      disconnectedCallback() {
        this.interval && clearInterval(this.interval);
      }
    }
  );
//# sourceMappingURL=/cdn/shop/t/8/assets/products-slider.js.map?v=48113802913706239211755630983

customElements.get("scrolling-text-banner") ||
  customElements.define(
    "scrolling-text-banner",
    class extends HTMLElement {
      constructor() {
        super(),
          (this.spacing = 20),
          (this.speedFactor = 10),
          (this.speed = 100),
          (this.mobileBreakpoint = 600),
          (this.mobileSpeedFactor = 0.7),
          (this.resizeObserver = null);
      }
      connectedCallback() {
        this.spacing =
          parseInt(this.getAttribute("data-spacing")) || this.spacing;
        const speedInput = parseInt(this.getAttribute("data-speed")) || 5;
        (this.speed = this.mapSpeed(speedInput)),
          (this.mobileSpeedFactor =
            parseFloat(this.getAttribute("data-mobile-speed-factor")) ||
            this.mobileSpeedFactor),
          this.initializeScrollingText(),
          this.observeResizing();
      }
      disconnectedCallback() {
        this.resizeObserver && this.resizeObserver.disconnect();
      }
      mapSpeed(input) {
        return 30 + 270 * ((input - 1) / 9);
      }
      getAdjustedSpeed() {
        return window.innerWidth < this.mobileBreakpoint
          ? this.speed * this.mobileSpeedFactor
          : this.speed;
      }
      initializeScrollingText() {
        const heroTitle = this.querySelector(".hero__title");
        if (!heroTitle) {
          console.error(
            "No `.hero__title` element found inside the scrolling-text-banner component."
          );
          return;
        }
        const textContent = heroTitle.textContent.trim();
        if (!textContent) {
          console.error(
            "No text content found inside the `.hero__title` element."
          );
          return;
        }
        heroTitle.innerHTML = "";
        const scrollingContainer = document.createElement("div");
        scrollingContainer.classList.add("scrolling-container"),
          heroTitle.appendChild(scrollingContainer);
        for (let i = 0; i < 2; i++) {
          const wrapper = document.createElement("div");
          wrapper.classList.add("scrolling-wrapper");
          for (let j = 0; j < 10; j++) {
            const textWrapper = document.createElement("div");
            textWrapper.classList.add("scrolling-text"),
              (textWrapper.textContent = textContent),
              (textWrapper.style.marginRight = `${this.spacing}px`),
              wrapper.appendChild(textWrapper);
          }
          scrollingContainer.appendChild(wrapper);
        }
        this.setAnimationSpeed(scrollingContainer);
      }
      setAnimationSpeed(scrollingContainer) {
        requestAnimationFrame(() => {
          const wrappers =
            scrollingContainer.querySelectorAll(".scrolling-wrapper");
          if (wrappers.length !== 2) return;
          const wrapperWidth = wrappers[0].offsetWidth,
            adjustedSpeed = this.getAdjustedSpeed(),
            duration = wrapperWidth / adjustedSpeed;
          (scrollingContainer.style.width = `${wrapperWidth * 2}px`),
            wrappers.forEach((wrapper, index) => {
              (wrapper.style.animationDuration = `${duration}s`),
                (wrapper.style.animationDelay = `${-index * duration}s`);
            });
        });
      }
      observeResizing() {
        const heroTitle = this.querySelector(".hero__title");
        heroTitle &&
          ((this.resizeObserver = new ResizeObserver(() => {
            this.recalculateAnimation();
          })),
          this.resizeObserver.observe(heroTitle));
      }
      recalculateAnimation() {
        const scrollingContainer = this.querySelector(".scrolling-container");
        scrollingContainer && this.setAnimationSpeed(scrollingContainer);
      }
    }
  );
//# sourceMappingURL=/cdn/shop/t/8/assets/scrolling-text-banner.js.map?v=49273406416254809081755630979

customElements.get("parallax-section") ||
  customElements.define(
    "parallax-section",
    class extends HTMLElement {
      constructor() {
        super(), (this.images = this.querySelectorAll(".wt-parallax__img"));
      }
      connectedCallback() {
        this.init();
      }
      decorateImages() {
        this.querySelectorAll(".wt-parallax__gallery__item").forEach(
          (item, index) => {
            item
              .querySelector(".wt-parallax__img")
              .classList.add(
                `wt-parallax__img--${index % 2 === 0 ? "odd" : "even"}`
              );
          }
        );
      }
      rotateOnScroll() {
        const { images } = this,
          maxRotation = parseInt(this.dataset.rotation, 10) || 5;
        document.addEventListener("scroll", function () {
          images.forEach((image) => {
            const imageRect = image.getBoundingClientRect(),
              windowHeight = window.innerHeight;
            if (imageRect.top < windowHeight) {
              let visiblePercent =
                  ((windowHeight - imageRect.top) / windowHeight) * 100,
                rotationDegree = Math.min(
                  (visiblePercent / 100) * maxRotation,
                  maxRotation
                );
              image.classList.contains("wt-parallax__img--odd") &&
                (rotationDegree *= -1),
                window.requestAnimationFrame(() => {
                  image.style.transform = `translate3d(0px, 0px, 0px) rotate(${rotationDegree}deg)`;
                });
            }
          });
        });
      }
      init() {
        this.decorateImages(), this.rotateOnScroll();
      }
    }
  );
//# sourceMappingURL=/cdn/shop/t/8/assets/parallax.js.map?v=22701632425930398101755630983

customElements.get("video-controls") ||
  customElements.define(
    "video-controls",
    class extends HTMLElement {
      constructor() {
        super();
      }
      connectedCallback() {
        (this.video = this.querySelector("video")),
          (this.hasVideoClickToggle = this.dataset.videoClick !== "false"),
          (this.productsContainer = this.querySelector(
            ".shoppable-video__products"
          )),
          (this.controlButton = this.querySelector(
            ".shoppable-video__control-button"
          )),
          (this.togglePlayPause = this.togglePlayPause.bind(this)),
          (this.toggleVideoIcon = this.toggleVideoIcon.bind(this)),
          this.addEventListeners(),
          this.controlButton && this.video && this.toggleVideoIcon();
      }
      addEventListeners() {
        this.controlButton &&
          this.controlButton.addEventListener("click", this.togglePlayPause),
          this.video &&
            this.hasVideoClickToggle &&
            this.video.addEventListener("click", this.togglePlayPause),
          this.controlButton &&
            this.video &&
            (this.video.addEventListener("play", this.toggleVideoIcon),
            this.video.addEventListener("pause", this.toggleVideoIcon));
      }
      removeEventListeners() {
        this.controlButton &&
          this.controlButton.removeEventListener("click", this.togglePlayPause),
          this.video &&
            this.hasVideoClickToggle &&
            this.video.removeEventListener("click", this.togglePlayPause),
          this.controlButton &&
            this.video &&
            (this.video.removeEventListener("play", this.toggleVideoIcon),
            this.video.removeEventListener("pause", this.toggleVideoIcon));
      }
      toggleVideoIcon() {
        const isPlaying = !this.video.paused;
        this.controlButton.classList.toggle(
          "shoppable-video__control-button--play",
          isPlaying
        ),
          this.controlButton.classList.toggle(
            "shoppable-video__control-button--pause",
            !isPlaying
          );
      }
      togglePlayPause(e) {
        e.preventDefault();
        const videoElement = this.video;
        videoElement &&
          (videoElement.paused || videoElement.ended
            ? videoElement.play()
            : videoElement.pause());
      }
      disconnectedCallback() {
        this.removeEventListeners();
      }
    }
  );
//# sourceMappingURL=/cdn/shop/t/8/assets/video-controls.js.map?v=87767895239177767981755630977

customElements.get("video-reels") ||
  customElements.define(
    "video-reels",
    class extends HTMLElement {
      constructor() {
        super(),
          (this.activeClass = "active"),
          (this.swiper = this.querySelector(".wt-slider__container"));
      }
      connectedCallback() {
        this.init();
      }
      updateAllVideosSound(swiper) {
        const soundOn = swiper.el.dataset.sound === "on";
        swiper.slides.forEach((slide) => {
          let video = slide.querySelector("video");
          video && (video.muted = !soundOn);
        });
      }
      observeSection() {
        const observerOptions = {
          root: null,
          rootMargin: "0px",
          threshold: 0.1,
        };
        new IntersectionObserver((entries, observer) => {
          entries.forEach((entry) => {
            const video = this.querySelector(".swiper-slide-active video");
            video && (entry.isIntersecting ? video.play() : video.pause());
          });
        }, observerOptions).observe(this);
      }
      handleSoundToggle(swiper) {
        swiper.slides.forEach((slide, index) => {
          const button = slide.querySelector(".wt-video__sound-toggle"),
            video = slide.querySelector("video"),
            that = this;
          button.addEventListener("click", function () {
            video &&
              (video.muted
                ? ((video.muted = !1), (swiper.el.dataset.sound = "on"))
                : ((video.muted = !0), (swiper.el.dataset.sound = "off")),
              that.updateAllVideosSound(swiper));
          });
        });
      }
      pasueAllVideos() {
        this.querySelectorAll("video").forEach((video) => {
          video.pause();
        });
      }
      playVideoInActiveSlide(swiper) {
        const sound = swiper.el.dataset.sound,
          activeSlideVideo =
            this.findActiveSlide(swiper)?.querySelector("video");
        activeSlideVideo &&
          ((activeSlideVideo.muted = sound !== "on"),
          setTimeout(() => {
            activeSlideVideo.play().catch((err) => {
              console.warn("Autoplay was prevented:", err);
            });
          }, 100));
      }
      findActiveSlide(swiper) {
        return swiper.slides[swiper.activeIndex];
      }
      toggleActiveClass(swiper) {
        const activeSlide = this.findActiveSlide(swiper);
        swiper.slides.forEach((slide) => {
          slide.classList.remove(this.activeClass),
            activeSlide === slide && slide.classList.add(this.activeClass);
        });
      }
      handleSlideChange(swiper) {
        this.pasueAllVideos(),
          this.toggleActiveClass(swiper),
          this.playVideoInActiveSlide(swiper);
      }
      addVideoEventHandlers(swiper) {
        const that = this;
        swiper.on("slideChange", (swp) => that.handleSlideChange(swp));
      }
      checkSwiperInitialization() {
        const swiperContainer = this.swiper,
          mySwiperInstance = swiperContainer.swiper;
        swiperContainer.classList.contains("swiper-initialized") &&
          (this.addVideoEventHandlers(mySwiperInstance),
          this.handleSlideChange(mySwiperInstance),
          this.handleSoundToggle(mySwiperInstance),
          this.observeSection(),
          clearInterval(this.checkInterval));
      }
      init() {
        this.checkInterval = setInterval(
          this.checkSwiperInitialization.bind(this),
          500
        );
      }
    }
  );
// Inject partials referenced via include markers so nav/footer render.
document.addEventListener("DOMContentLoaded", () => {
  const includes = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_COMMENT,
    null
  );

  while (walker.nextNode()) {
    const value = walker.currentNode.nodeValue;
    if (value && value.trim().startsWith("include:")) {
      const path = value.trim().replace("include:", "").trim();
      if (path) {
        includes.push({ comment: walker.currentNode, path });
      }
    }
  }

  includes.forEach(({ comment, path }) => {
    fetch(path)
      .then((response) => (response.ok ? response.text() : Promise.reject()))
      .then((html) => {
        const template = document.createElement("template");
        template.innerHTML = html;

        template.content.querySelectorAll("script").forEach((script) => {
          const replacement = document.createElement("script");
          [...script.attributes].forEach(({ name, value }) =>
            replacement.setAttribute(name, value)
          );
          replacement.textContent = script.textContent;
          script.replaceWith(replacement);
        });

        comment.parentNode?.insertBefore(
          template.content.cloneNode(true),
          comment.nextSibling
        );
      })
      .catch(() => {});
  });
});
//# sourceMappingURL=/cdn/shop/t/8/assets/video-reels.js.map?v=32279595380026792771755631078
