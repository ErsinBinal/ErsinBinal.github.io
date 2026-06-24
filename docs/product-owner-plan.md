# Convivium Product Owner Plan

Last updated: 2026-06-24

## Product Thesis

Convivium is not a standard portfolio. It is a personal web laboratory where terminal navigation, essays, games, ritual tools, saved user traces, and a public Oracle channel live inside one coherent world.

The product goal is to preserve that strange charm while making the site easier to enter, safer to operate, and simpler to evolve.

## Product Areas

1. Entry and navigation
   - `index.html`
   - `assets/js/home-protocol.js`
   - Terminal onboarding, commands, route map, hidden world progression

2. Public AI and Oracle
   - `/oracle/`
   - `workers/oracle/src/index.js`
   - Browser requests must go through the Worker boundary.

3. Account, persistence, and dashboard
   - `/account/auth.html`
   - `/account/dashboard.html`
   - `assets/js/supabase-client.js`
   - Supabase Auth, profiles, scores, sessions, recommendations, world state

4. Content and publishing
   - `/pages/makaleler.html`
   - `/admin/`
   - Article publishing, SEO, sitemap, content taxonomy

5. Labs and playable experiences
   - Games, Barista/Bartender tools, Dart Skorbord, Bugy Studio, Candy_Pop prototypes

## Current Priorities

### P0: Operational Trust

- Keep the Cloudflare Worker as the only public AI boundary.
- Keep Supabase service-role secrets out of static files.
- Keep service worker precache versions aligned with HTML asset versions.
- Run `npm run check` before deploy when Node/npm is available.
- Update `sitemap.xml` whenever new public routes are added.

### P1: First-Visit Clarity

- Make `basla` and `help` explain the site in one screen.
- Keep the playful terminal layer, but expose obvious routes: Dossier, Oracle, Lab, Dashboard.
- Make login value visible: saved progress, scores, Oracle traces, recommendations.

### P2: Maintainability

- Split `home-protocol.js` into smaller modules once behavior stabilizes:
  - route map (`assets/js/home/routes.js` exists)
  - command registry
  - world state
  - oracle client
  - shell UI
  - persistence and auth sync
- Move large inline game scripts out of HTML only when there is a clear maintenance win.
- Keep manual cache version drift low through `npm run sync:cache`.

### P3: Measurement

- Track privacy-friendly product signals:
  - first command run
  - Oracle question submitted
  - route opened from terminal
  - login conversion
  - score or recommendation saved
  - dashboard return

## Release Checklist

- `npm run check`
- Confirm `service-worker.js` cache name changed when precache assets change.
- Confirm `scripts/validate-site-integrity.js` expected versions match current HTML.
- Confirm `index.html` Oracle endpoint points to the deployed Worker.
- Confirm CSP allows only required origins.
- Confirm sitemap includes public pages and excludes internal-only artifacts.
- Smoke-test:
  - `/`
  - `/pages/makaleler.html`
  - `/oracle/`
  - `/account/auth.html`
  - `/account/dashboard.html`
  - one game page

## Next Backlog

1. Add a small route taxonomy to the home page and terminal help.
2. Add a visible Oracle degraded/offline state.
3. Add release notes to `README.md`.
4. Decide whether Candy_Pop remains public-indexed or becomes a hidden prototype area.
5. Promote or archive Candy_Pop so prototype dependencies do not leak into the main product standard.
