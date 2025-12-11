Shopping Cart Implementation Plan
=================================

Goal
----
Add a client-side shopping cart experience across the site: users can add products, view the cart via nav icon, adjust quantities, see subtotals/totals, remove items, and click a checkout button (no backend checkout yet).

Scope & Constraints
-------------------
- Static site (GitHub Pages), no backend. Cart state must live in browser (localStorage).
- Product data comes from `assets/data/products_all.json` (id, handle, price, titles, media).
- Cart UI must be reachable from all pages; nav cart icon should open it.
- Use existing styling patterns (header/footer, cards, buttons) and local product images.

Milestones
----------
1) Data & State
- Define cart storage schema (e.g., `{ items: [{id, qty, priceAtAdd, title_short, image_small}], updatedAt }`).
- Implement cart utility module in `assets/main.js` or a new `assets/cart.js` for: load/save to localStorage, add/update/remove, compute totals, and event dispatch (e.g., `cart:updated`).
- Ensure product lookup uses product ID/handle and existing image helper (`assets/images/products/small/{id}-primary.png`).

2) Add-to-Cart Hooks
- On product page, wire “ADD TO CART” to add current product with selected qty; show quick feedback.
- On product cards (home/category/journal lists if present), add “Add to cart” or icon button that adds with qty 1. Respect existing card layouts (may be icon-only for compact cards).
- Prevent duplicates by merging quantities when adding the same product.

3) Cart UI Shell
- Add cart trigger to nav (reuse existing cart icon). Clicking opens a slide-over/drawer.
- Create cart drawer markup (e.g., appended to `body`): header with title and close, list area, footer with subtotal and checkout button.
- Style to match site (use existing colors/spacing; translucent backdrop, scrollable list, sticky footer).

4) Cart Line Items
- Render each item with small product image, title, price, qty control (+/– or select), line subtotal, and remove (trash/x).
- Qty change updates totals immediately and persists to storage; block qty < 1.
- Remove button deletes the line and re-renders; show empty state when no items.

5) Totals & Checkout CTA
- Compute subtotal as sum(qty * price); display formatted.
- Checkout button links to placeholder (e.g., `/checkout` or `#`) with disabled state when empty. No backend implementation required.

6) Navigation Integration
- Nav cart icon should reflect item count (badge) and open the drawer.
- Ensure cart loads on page hydration across all pages (home, product, category, journal, about).
- Dispatch/listen to a global event (`cart:updated`) so other components can refresh badges without reloading.

7) Persistence & Edge Cases
- Load cart from localStorage on DOMContentLoaded; fall back to empty cart.
- Handle missing product ids gracefully (skip render but keep storage consistent).
- Clamp qty to integers >=1; handle price missing by using 0 and flag for QA.

8) QA Checklist
- Add from product page (qty 1/2+) updates drawer and badge.
- Add same product twice merges qty.
- Qty change updates line subtotal and total.
- Remove clears line; empty state shows; badge clears.
- Nav icon opens drawer on all pages.
- Images load from local paths (`assets/images/products/small/{id}-primary.png`).
- Totals correct for multiple products; currency format maintained.

Notes
-----
- Keep all changes in `docs/`; no server code.
- Prefer vanilla JS; avoid new dependencies.
- Reuse existing button/card classes where possible for visual consistency.
