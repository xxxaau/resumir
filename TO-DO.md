## Veredicte executiu

**No apte per publicar tal qual**, ni a GitHub públic ni a marketplaces. La base tècnica és **sòlida** (manifest base+patch, SSRF guard a HN fetch, ext.js cross-browser, 13 fitxers de test, pre-release-check defensiu, `<UNTRUSTED_CONTENT>` contra prompt injection, MPL-2.0 amb llicències compatibles). Però hi ha **6 bloquejants compartits** detectats per múltiples agents que aturarien una primera publicació, i **~15 issues importants** que afectarien la imatge professional o la sostenibilitat com a projecte open source.

Esforç estimat: **6–9 dies de feina concentrada** per arribar a "ready to publish". Es pot dividir en 3 sprints curts.

---

## Bloquejants compartits (ordre obligat)

| # | Problema | Fitxers | Impacte |
|---|---------|---------|---------|
| **B1** | Manifests checked-in en mode `(DEV)` + gecko id `sergi.dev@xaudiera.xyz` | `manifest.base.json:3`, `manifest.json:3`, `manifest.firefox.patch.json:13` | Risc de pujar ZIP DEV a AMO. **L'id de gecko queda fixat per sempre a la primera publicació.** |
| **B2** | CSP `connect-src https://*` excessivament permissiu | `manifest.json:38`, tots els patches | AMO/CWS marquen revisió manual o rebutgen; deroguen la pròpia whitelist |
| **B3** | Username placeholder `xxxaau` als enllaços públics | README, CONTRIBUTING, manifests, `options/settings.js:163` | `homepage_url` 404 a la fitxa del store |
| **B4** | Fitxers privats committed: `.claude/`, `.agent/`, `.playwright-mcp/`, ZIPs de release, `project_audit_output*.txt`, `background.bundle.js` | Repo arrel | Filtra historial de navegació, configuracions internes |
| **B5** | `<all_urls>` com a *required* a Chromium tot i existir flux `optional_host_permissions` | `manifest.base.json:14-16` | Pantalla d'instal·lació espantosa; fricció a CWS |
| **B6** | Codi vendoritzat sense build instructions reproductibles per a AMO | `defuddle.js` (584 KB minified), `Readability.js` (92 KB), `scripts/copy-vendor.mjs` | AMO requereix font + passos per a tot codi minified |

---

## Sprint 1 — Preparar el primer push públic a GitHub *(~2 dies)*

**Objectiu:** repo publicable sense vergonyes ni filtracions.

- [x] **B3** Substituir `xxxaau` globalment pel handle real. `npm run manifests:gen` després.
- [x] **B4** Netejar el repo:
  - `git rm -r --cached .claude .agent .playwright-mcp docs/superpowers project_audit_output*.txt resumir-contingut-v*.zip background.bundle.js`
  - Afegir-los al `.gitignore` (alguns hi són però no des-trackejats)
  - Auditar la història: `git log --all -p | grep -iE "private_key|BEGIN PRIVATE|AIza[A-Za-z0-9_-]{35}"` — si surt res → `git filter-repo` abans del push
- [x] Moure `CLAUDE.md` i `STORAGE_ISOLATION.md` a `docs/internal/` (excloure del ZIP) o eliminar
- [x] Arreglar errors al `CONTRIBUTING.md`: "Fa canvis" → "Fes canvis", "Nova código" → català, inconsistència 56 vs 160 tests
- [x] Decidir idioma de docs: README en anglès amb `README.ca.md` per audiència ampla
- [x] Governança mínima: `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.yml`, `.github/PULL_REQUEST_TEMPLATE.md`
- [x] Capçaleres MPL als ~16 fitxers font propis (`/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0... */`)
- [x] README: retirar badges de stores trencats; afegir 2-3 captures reals a `img/`; afegir badge CI

---

## Sprint 2 — Hardening de codi i seguretat *(~3 dies)*

**Objectiu:** tancar forats que farien rebutjar l'extensió o exposarien usuaris.

### Crítics de seguretat

- [x] **B2** Restringir CSP: `connect-src 'self' https://generativelanguage.googleapis.com` (el fetch HN s'executa al content script, no necessita `connect-src` ampli)
- [x] **B5** Treure `<all_urls>` de `host_permissions` a Chromium, deixar-lo només a `optional_host_permissions`
- [x] **B1** Verificar canvi DEV→PROD complet: `set_dev_mode.ps1 prod` ha de reescriure també `manifest.base.json.name`. Afegir validació al `pre-release-check.mjs` que el `name` no contingui "DEV" i que `gecko.id` no contingui "dev"
- [x] **B6** `scripts/verify-vendor.mjs`: comprovi SHA-256 esperat de `defuddle.js` i `Readability.js`. Registrar versió + hash a `THIRD_PARTY.md` o `vendor.lock.json`
- [x] Avisar al CHANGELOG/README que usuaris pre-2.2 haurien de **rotar la clau API** (la migració `sync→local` no purga l'historial sincronitzat)

### Bugs cross-browser

- [x] `background.js:39`: `ext.menus.removeAll(callback)` — Firefox usa Promise. Canviar a `await ext.menus.removeAll()`
- [x] `background.js:1-13`: toggle side-panel a Chromium trencat (`getViews()` retorna `[]`). Substituir per `setPanelBehavior({openPanelOnActionClick:true})` i deixar el clic obrir natiu
- [x] `scripts/merge-manifest.mjs:30-31`: deduplicar arrays amb `Set` per evitar permisos duplicats
- [x] `sidebar/api.js:33`: `encodeURIComponent(modelName)` a la URL
- [x] `sidebar/summary.js:283-298`: classificar errors per `response.status` en lloc de match a `e.message`
- [x] `sidebar/api.js:80-130`: validar `Content-Type: text/event-stream`; afegir límit de bytes acumulats (~5 MB)
- [x] `sidebar/content.js:99-122`: `fetch(..., { redirect: "manual" })` per evitar redireccions a IP privada (DNS-rebinding)
- [x] `sidebar/cache.js:21`: `clearCache` ha d'esborrar tota clau `summary_cache:*`, no només les de l'índex

### Quick wins de codi

- [x] Substituir `innerHTML = ""` per `replaceChildren()` a `sidebar/history.js:52,104,134,208,226`
- [x] Corregir `PRIVACY_POLICY.md:35`: la transcripció YouTube s'extreu via DOM/`ytInitialData`, no via `fetch`
- [x] Eliminar `Readability.js` del càrrec global de `sidebar.html:248` — estalvi ~92 KB d'execució a l'obertura
- [x] `sidebar/api.js:26`: moure el fallback `priceIn: 0.10` a `shared/models.js`
- [x] Race condition a migració `storage.sync→local` (`sidebar.js:72-80`): serialitzar amb flag `apiKeyMigrated`

---

## Sprint 3 — Tests, CI i preparació de marketplaces *(~2-4 dies)*

**Objectiu:** suite de qualitat fiable per a releases freqüents + tots els assets de listing.

### Tests i CI

- [x] **CRÍTIC CI**: afegir `npm run prerelease` al CI (`ci.yml`) — ara no s'executa mai automàticament
- [x] **CRÍTIC CI**: afegir `web-ext lint` al CI — essencial per AMO
- [x] Test E2E mínim: mock `fetch` Gemini amb stream SSE → valida `getPageContent → startSummary → cache → stats` end-to-end via jsdom
- [x] Tests per `startSummary` (446 línies sense cobrir): golden path, fallback de quota, abort, deep-dive
- [x] Tests mínims per `sidebar.js`, `background.js`, `options/settings.js`, `sidebar/history.js`
- [x] CI matrix: afegir `windows-latest` (`strategy.matrix.os`)
- [x] Cobertura: `node --experimental-test-coverage` o `c8`, badge al README
- [x] ESLint: baixar `--max-warnings` a 0; afegir `eslint-plugin-security`; `no-restricted-syntax` per `innerHTML`
- [x] Pre-release-check ampliat: ZIPs existeixen, mida < 4 MB, estructura AMO-compliant, CHANGELOG té `## [X.Y.Z]`, `git status` net, `npm audit --omit=dev`
- [x] Helper compartit `tests/helpers/storage-mock.mjs` (duplicat a 4 fitxers)
- [x] Afegir `background.bundle.js` i `sidebar/sidebar.bundle.js` al `.gitignore`

### Assets de marketplaces (manca tot)

- [ ] Captures de pantalla: 3-5 imatges CWS (1280×800) i AMO (750×442). Sidebar amb resum, lectura biònica, options
- [ ] Promo tile CWS: 440×280 small
- [ ] **Privacy Policy hostejada com a URL pública** (GitHub Pages): AMO/CWS rebutgen `.md` cru
- [x] `BUILD.md` per AMO "source code submission": `npm ci && npm run prod && npm run build`, Node ≥18, esbuild `^0.27.3`
- [ ] Descripcions de listing curta (≤132 chars CWS) i llarga, en anglès
- [ ] Permission justifications per al formulari CWS: `<all_urls>`, `scripting`, `activeTab`, `tabs`, `storage`
- [ ] Single Purpose justification (CWS): "Summarize the active web page using Google Gemini AI"
- [ ] Categoria decidida per cada store
- [ ] CHANGELOG complet (entrades 2.0.0–2.2.3 amb resum mínim, no "see git log")

---

## Decisions estratègiques (cal decidir-les tu)

1. **Gecko ID definitiu**: `sergi@xaudiera.xyz` o `resumir-contingut@xaudiera.xyz`? Un cop publicat a AMO **no canvia mai més**.
2. **`strict_min_version`**: ara és 142.0, `CONTRIBUTING.md` diu "115+". Baixar a 139.0 (mínim per `data_collection_permissions`) ampliarà base d'usuaris.
3. **Idioma UI**: mantenir català + obrir issue per a `_locales/` i contribucions externes, o afegir anglès ja?
4. **Defuddle**: 584 KB sempre al ZIP tot i usar-se només a Twitter/X. Confirmar si es pot excloure del ZIP.
5. **Build PowerShell → `.mjs`**: baixa la barrera per a contributors Linux/Mac.

---

## Mètriques de "ready to publish"

- [ ] `npm run prerelease` passa incloent prod-mode + lint 0 warnings + manifest validation + ZIP smoke-test
- [ ] CI passa a Ubuntu **i Windows** amb `web-ext lint` verd
- [ ] Test E2E del golden path verd
- [ ] Cap match a `xxxaau`, `(DEV)`, `sergi.dev@`, `https://*` al ZIP de producció
- [ ] Assets de listing preparats a `docs/listing/`
- [ ] Privacy Policy hostejada a URL pública
- [ ] Tag `v2.3.0` amb CHANGELOG complet

---

## Resum d'esforç

| Sprint | Durada estimada | Sortida |
|--------|----------------|---------|
| 1 — Repo públic net | ~2 dies | Push a GitHub sense filtracions |
| 2 — Hardening | ~3 dies | Codi robust per als revisors de stores |
| 3 — Tests + listing | ~2-4 dies | Submissió a AMO i CWS completa |
| **Total** | **~7-9 dies** | |

---

## Troballes per eix (detall)

### Seguretat
- **CRÍTIC**: CSP `connect-src https://*` (tots els patches) — superfície innecessàriament àmplia
- **IMPORTANT**: `<all_urls>` required a Chromium — `manifest.base.json:14-16`
- **IMPORTANT**: migració `storage.sync→local` de l'API key — race condition a 2 sidebars obertes simultàniament (`sidebar.js:72-80`)
- **IMPORTANT**: `sidebar/content.js:99-122` — fetch HN sense `redirect: "manual"` (DNS-rebinding parcial)
- **IMPORTANT**: vendor sense hash verificable — `defuddle.js` i `Readability.js`
- **MENOR**: falta validació `Content-Type: text/event-stream` a `api.js:80-90`
- **MENOR**: falta límit de bytes acumulats del stream Gemini (`api.js:96-130`)
- **MENOR**: `PRIVACY_POLICY.md:35` descriu extracció YouTube via `fetch` quan és via DOM
- **POSITIU**: `formatTextToFragment` usa `createElement`+`textContent` — cap XSS al render del LLM
- **POSITIU**: `<UNTRUSTED_CONTENT>` al system prompt protegeix contra prompt injection
- **POSITIU**: cap secret hardcoded, API key a `storage.local` amb `input[type=password]`

### Codi i arquitectura
- **CRÍTIC**: `background.js:39` — callback API a Firefox on cal Promise (race de menús)
- **CRÍTIC**: toggle side-panel Chromium inert — `background.js:1-13`, `ext.js:88`
- **IMPORTANT**: `sidebar/api.js:33` — model URL sense `encodeURIComponent`
- **IMPORTANT**: `summary.js:283-298` — retry/fallback per substring de missatge, no per status HTTP
- **IMPORTANT**: `cache.js:21` — `clearCache` no neteja entrades orfes
- **IMPORTANT**: `build-sidebar-bundle.mjs:46-67` — bundling per concatenació, fràgil amb ESM real
- **IMPORTANT**: `build.ps1:113-122` — esborra `sidebar/*.js` per als dos targets; verificar patch HTML Firefox
- **MENOR**: `shared/models.js:7` — `EUR_RATE = 0.92` hardcoded sense check d'edat
- **MENOR**: mescla català/anglès als comentaris del codi
- **POSITIU**: arquitectura manifest base+patch és neta i mantenible
- **POSITIU**: `ext.js` prim amb tests dedicats

### Tests i CI
- **CRÍTIC**: `ci.yml` no executa `npm run prerelease`
- **CRÍTIC**: `release.yml` no executa `web-ext lint` ni `npm run lint`
- **CRÍTIC**: `startSummary` (funció central, 446 línies) sense cap test
- **CRÍTIC**: cap test E2E del golden path complet
- **IMPORTANT**: `eslint.config.mjs` — `--max-warnings 50` massa permissiu; manca `eslint-plugin-security`
- **IMPORTANT**: mocks de storage duplicats a 4 fitxers de test
- **IMPORTANT**: sense mesura de cobertura (cap `c8`/nyc)
- **POSITIU**: `api-stream.test.mjs` exemplar — mock SSE realista amb splits de buffer
- **POSITIU**: `persistence.test.mjs` simula migracions reals

### Open source
- **CRÍTIC**: `xxxaau` placeholder a README, CONTRIBUTING, manifests, settings.js
- **CRÍTIC**: `.claude/`, `.agent/`, `.playwright-mcp/` trackejats amb logs privats
- **CRÍTIC**: ZIPs de release i artefactes de build committed
- **IMPORTANT**: falta `CODE_OF_CONDUCT.md`, ISSUE/PR templates
- **IMPORTANT**: `CONTRIBUTING.md` amb errors lingüístics i inconsistències
- **IMPORTANT**: `CHANGELOG.md` incomplet (versions 2.0.0–2.2.3 sense detall)
- **IMPORTANT**: capçaleres MPL absents als fitxers font
- **IMPORTANT**: build script PowerShell-only (barrera per a contributors)
- **POSITIU**: llicència MPL-2.0 coherent; MIT (defuddle) + Apache-2.0 (Readability) compatibles

### Marketplaces
- **BLOCKER**: manifests checked-in en mode DEV
- **BLOCKER**: gecko id `sergi.dev@` — irreversible un cop publicat
- **BLOCKER**: CSP `https://*` — probable revisió manual o rebuig
- **BLOCKER**: vendor minified sense BUILD.md per a AMO
- **MAJOR**: `strict_min_version: 142.0` incoherent amb "Firefox 115+" a CONTRIBUTING
- **MAJOR**: `data_collection_permissions` sense Privacy Policy URL pública
- **MAJOR**: cap asset de listing preparat (captures, promo, descripcions)
