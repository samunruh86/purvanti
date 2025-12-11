## Repo Overview
Fast orientation
----------------
- Live site is in `docs/`; reference assets live in `admin/inspiration/` and must stay untouched. Make all edits inside `docs/`.
- Data-driven structure: `docs/assets/data/content.json` controls page sections (home, product, journal, about). `docs/assets/data/products_all.json` holds product data and IDs. Blog posts live in `docs/assets/data/posts.json`.
- Entry points: `docs/index.html` (home), `docs/product.html` (product detail), `docs/category.html` (category template), `docs/journal.html` (single post), `docs/journal-all.html` (all posts), `docs/about.html` (about page). All share `assets/main.js`, `assets/products.js`, and `assets/style.css`.
- Assets are local: images under `docs/assets/images/**` and product photos under `docs/assets/images/products/{full,small}/<productId>-primary|secondary.png`; icons in `docs/assets/icons/`.
- Hosting: deployed as a static site via GitHub Pages from the `docs/` directory. No build step or server—what’s in `docs/` is what ships.

Rendering pipeline
------------------
- `assets/main.js` hydrates static shells using JSON data. It maps products from `products_all.json`, renders nav/footer, and builds sections via dedicated render functions.
- Blog/journal: posts come from `posts.json`; per-post pages use `journal/<slug>` URLs; the journal listing is `journal-all.html`.
- Product pages (`assets/products.js`) hydrate via product ID/handle. Product images resolve from product ID if media arrays are missing.
- Nav links: About → `/about.html`; Journal → `/journal-all.html`; product links use hash/query handles and rewrite to pretty `/products/<handle>` paths.

Editing guidance
----------------
- Prefer updating JSON data over hardcoding copy. Use existing render helpers (e.g., `renderStatement`, `buildBlogCard`, product card builders) to keep styles consistent.
- When adding assets, place them under `docs/assets/images/...` (or `products/full` / `products/small` for product photos) and reference with relative paths in JSON.
- Keep JS changes minimal and descriptive; the site is plain JS/HTML/CSS—no build step.
- Avoid touching `admin/inspiration/`; it is a frozen reference. Keep naming clear and match existing patterns for class names and data keys.
