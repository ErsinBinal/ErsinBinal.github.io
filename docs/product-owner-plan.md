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

## Advanced feature / algorithm track (2026-07-27)

A PO-level review proposing algorithmically rich features that fit the
deterministic-offline, framework-free DNA — see
[İleri Algoritma Önerileri (PO)](ileri-algoritma-onerileri-po.md). Flagship
recommendation: **A1 Sinyal Atlası** (content graph + Personalized PageRank
navigation) — the missing engine behind the N3 "Yaşayan Atlas" goal and the
direct fix for the new-visitor discovery problem in the technical review. Second
flagship: **A2 Prosedürel Kalıntı Grameri** (shape grammar + Wave Function
Collapse), extending the procedural holo work.

## Zekânın Saygıduruşu — Kazı Evi (2026-08-23)

Beş bağımsız yaratıcı yönelim + adversaryal fizibilite turu + jüri sıralamasından
sentezlenen büyük dönem programı — see
[Zekânın Saygıduruşu — Kazı Evi](zekanin-saygidurusu-buyuk-plan.md).
15 amiral gemisi önerisinden 5'i kaldı; elenenlerin gerekçeleri belgede kayıtlı.

**İmza:** gerekçeni seyredilebilir kılmak · senin hakkındaki ölçüyü sana yazdırmak ·
yenilebileceğini kabul etmek.

**Yasa:** kazı > üretim > taklit. Site İÇERİK hakkında sır tutabilir, MEKANİZMA
hakkında asla. Determinizm öğrenmeyi değil, GİZLİ öğrenmeyi yasaklar.

**Zorunlu ön koşul:** Faz -1 — yayın ritüeli otomasyonu (bugün bir sürüm bumpı
7 elle dokunuş; uzun bir yol haritası ~110 mekanik düzenleme demek).

**Amiral gemileri:** Z1 TORTU (580 commit'lik gerçek jeolojiyi kaz — üretim–bakım
makasını kalıcı kapatan tek dilim) · Z2 İZ + `step` · Z3 SİGİL (terminalde bugün
sıfır History API çağrısı var) · Z4 ARŞİV·0212 (yerel siber tarih korpusu + offline
BM25) · Z5 OKKAM (MDL düellosu).

Bu program A1/A2/B1/B4'ü kısmen yutar: B1 artık Z4.3, A1/A2 ise Z2'nin emitörleri
olarak yeniden çerçevelendi. WASM, logprobs, gömü katmanı, 3B WFC ve `/net` üzerinde
DPLL ölçülmüş gerekçelerle plandan çıkarıldı.
