# Convivium Site Agent Notes

## Project Shape

This repository is a mostly static GitHub Pages site for the Convivium personal/experimental web space. The root is reserved for the main entry point and GitHub Pages platform files. Canonical product pages live under purpose-based folders, with shared assets under `assets/`.

Important areas:

- `index.html`, `assets/js/home/routes.js`, and `assets/js/home-protocol.js`: main terminal-style landing page, route map, and command protocol.
- `/oracle/`: standalone oracle experience.
- `/pages/`: durable content such as articles and profile pages.
- `/games/`: playable experiences.
- `/tools/`: ritual tools, scoreboards, studios, and terminals.
- `/account/`: auth and dashboard pages.
- `/admin/`: admin-facing static surfaces.
- `workers/oracle/src/index.js`: Cloudflare Worker AI proxy for public command/oracle answers.
- `workers/oracle/README.md`: deploy notes for the Worker.
- `assets/js/*.js` and `assets/css/*.css`: shared frontend behavior and styling.
- `src/native/bugy-v3` and `scripts/`: native/game build helpers.

## Public AI Architecture

The website command shell must not connect to local developer agents or tools. Public AI support should use the Cloudflare Worker proxy in `workers/oracle/src/index.js`.

The Worker is the safety boundary:

- Browser requests go only to the Worker endpoint.
- Provider secrets stay in Cloudflare, never in static HTML or JS.
- The Worker can use Cloudflare Workers AI free allocation first.
- The Worker may fall back to a no-key public text provider when configured in code.
- If every provider fails, the site returns a local canned answer instead of breaking.

Do not expose local developer agents, shells, files, or repository write access to public browser clients.

## Local Workflow

Common commands:

- `npm run deploy:oracle`: deploy the Oracle Cloudflare Worker.
- `npm run sync:cache`: sync managed asset query versions into service worker checks.
- `npm run convert-images`: convert local image assets.
- `npm run build:bugy-v3-atlas`: build the Bugy v3 SVG atlas.

When adding public AI features, route browser requests through the Worker and keep provider secrets in Cloudflare environment variables or secrets.

## Style Notes

- The site uses Turkish UI copy in many places; keep new command/oracle text short, direct, and consistent with the existing terminal tone.
- Default to plain JavaScript, HTML, and CSS already present in the repo.
- Avoid introducing a new framework unless the requested feature genuinely needs it.
- Keep GitHub Pages constraints in mind: static files cannot serve `/api/*` endpoints by themselves.
