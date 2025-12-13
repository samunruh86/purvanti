Cart Overview
=============

Purpose
-------
Lightweight, fully client-side cart and account prompt used across all pages. State lives in localStorage; no backend checkout. All UI and logic live in `docs/assets/main.js` and share styling from `assets/style.css`.

Where it appears
----------------
- Cart trigger: nav cart icon (only nav action left) opens a slide-out drawer on every page.
- Add-to-cart: product page “ADD TO CART” (with qty) and inline add buttons on cards (category/home/featured/arrivals/endurance) add qty 1 and merge if already present.

State & storage
---------------
- Stored under `purvanti:cart` in localStorage: `{ items: [{ id, qty, price, title_short, image }], updatedAt }`.
- Totals are derived on the fly (sum of qty * price); currency formatting via `formatPrice`.

Drawer UI
---------
- Header: title + close.
- Lines: thumbnail, title, price, qty adjust (clamped to 1+), remove button, line subtotal. Empty state text when no items.
- Footer: subtotal and a “Checkout” button that toggles an inline auth panel.

Auth panel (cart footer)
------------------------
- Always available via Checkout (button text toggles “Close” when open).
- Modes: Login (email + password) and Sign Up (email only, password hidden). Toggle via “Sign Up” / “Back to Login”.
- Submit flows:
  - Login: sends email/password + cart to `GCS_ENDPOINT` with action `purvanti_login`.
  - Sign Up: sends email + cart to `purvanti_signup`, reveals a 6-digit confirmation code input; button becomes “Resend Confirmation Code”.
  - Confirmation code: six single-digit fields auto-submit to `purvanti_confirm_code` (email + cart + code) when filled; resend re-triggers `purvanti_signup`.
- UI details: code inputs styled as six boxes; inline note instructs the user. Inputs show error styling if missing required data.

Events & wiring
---------------
- Drawer open/close toggles body overlay; cart badge updates via `cart:updated` helper usage.
- Cart is hydrated on DOMContentLoaded; missing products are skipped gracefully.
- All assets resolved locally (`assets/images/products/small/{id}-primary.png` fallback logic).

Constraints & notes
-------------------
- Static site only; no real checkout. All submissions go to `GCS_ENDPOINT` with an action payload.
- No search/account icons in nav; cart is the sole header action.
- Category grids capped at 4 columns; toolbar hidden.
