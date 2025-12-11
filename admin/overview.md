## Repo Overview
This repo has two main areas: the `docs/` folder holds the live static site and the `admin/` folder contains references. The production site in `docs/` was copied from the Spotify-themed reference located at `admin/inspiration/`, which is kept as an untouched source—do not edit anything inside `admin/inspiration/`; all site changes belong in `docs/`.

Keep the codebase clean and legible: favor simple, descriptive names across HTML, CSS, and JS, and avoid unnecessary complexity so future edits stay straightforward. Follow the existing patterns in `docs/` to keep structure and naming consistent.

Site content is driven by data files under `docs/assets/data/`: general copy and page text live in `content.json`, while product listings come from `products_all.json`. Update those JSON files to change visible content rather than altering the template source.
