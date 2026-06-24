# Convivium Repository Standards

Last updated: 2026-06-24

## Route Layout

Root stays reserved for GitHub Pages platform files, compatibility redirects, and the main entry point:

- `index.html`
- `offline.html`
- `service-worker.js`
- `manifest.json`
- `robots.txt`
- `sitemap.xml`
- legacy redirect wrappers such as `TheOracle.html`

Canonical product pages live under purpose-based folders:

- `pages/`: articles, profile, durable content pages
- `games/`: playable game experiences
- `tools/`: ritual tools, scoreboards, studios, terminals
- `oracle/`: Oracle experience
- `account/`: auth and user dashboard
- `admin/`: private/admin-facing static surfaces
- `Candy_Pop/`: existing commerce prototype area until it is promoted or archived

New public pages should not be added to the repository root. If an old URL must keep working, add a small redirect wrapper in root and put the real page in the canonical folder.

## Frontend Files

New page behavior should go in `assets/js/` and new styling should go in `assets/css/`.

Inline `<script>` and `<style>` blocks are allowed only for:

- legacy pages waiting for extraction
- tiny redirect wrappers
- JSON-LD structured data
- page bootstraps that cannot reasonably live elsewhere

## Routing

Main shell routes live in `assets/js/home/routes.js`. New command-shell routes should be added there first, then consumed from `assets/js/home-protocol.js`.

Do not hard-code old root page URLs in new code. Use canonical paths such as `/games/ash-runner.html` and `/oracle/`.

## Cache Versions

Asset query versions must remain aligned across HTML, `service-worker.js`, and `scripts/validate-site-integrity.js`.

Use:

```bash
npm run sync:cache
npm run sync:cache:bump
```

Then run:

```bash
npm run check
```

## CDN Policy

Do not use CDN `latest` tags. Pin versions explicitly.

Preferred order:

1. Local vendored asset under `assets/vendor/`
2. Exact CDN version
3. Major-version CDN only for existing legacy pages, with a backlog item to pin it

## Public AI Boundary

Browser code must never call model providers directly. Public AI requests go through `workers/oracle/src/index.js`.

No browser page may expose local shells, files, developer tools, or repository write access.
