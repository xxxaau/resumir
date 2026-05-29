# Backlog de millores

Llista de millores pendents, no prioritzades. Cada entrada inclou context i criteris d'acceptació mínims.

---

~~Pestanya de PDF local no renderitza el PDF a Firefox~~ ✅ **Resolt a v2.3.0**

**Context (2026-05-25):** Quan l'usuari selecciona un PDF local mitjançant el botó "Selecciona PDF local", el flux fa:
1. Extreu el text del PDF amb pdf.js (al sidebar).
2. Obre una pestanya de fons amb `blob:` URL per consultar el PDF.
3. El resum es genera directament des del text extret (sense dependre de la pestanya).

**Problema:** Firefox no renderitza `blob:moz-extension://...` URLs al visor PDF nadiu.

**Solució implementada:**
- Pàgina personalitzada `sidebar/pdf-viewer.html` que rep el buffer del PDF via `storage.session` i el renderitza amb pdf.js.
- El buffer es passa com a base64 via `storage.session` amb clau `pdfViewer:<timestamp>`.
- Funciona a Firefox i Chromium sense regressió.

**Criteris d'acceptació (complerts ✅):**
- [x] La pestanya nova mostra el PDF seleccionat de manera llegible a Firefox.
- [x] El resum es genera correctament.
- [x] També funciona a Chromium (no regressió).

**Fitxers modificats:**
- `sidebar/sidebar.js` — flux del "Selecciona PDF local" (envia buffer a storage.session)
- `sidebar/pdf-viewer.html` + `sidebar/pdf-viewer.js` — pàgina nova de visualització
- `tests/e2e-pdf-local.mjs` — test actualitzat per al nou visor

---

~~Persistència de la clau API i historial entre recàrregues de l'extensió~~ ✅ **Resolt a v2.3.0**

**Símptoma observat (2026-05-25):** Quan es recarrega l'extensió (`about:debugging` → Recarrega, o `chrome://extensions` → refresh), sovint cal tornar a introduir la clau API de Gemini. L'historial de resums també sembla afectat de manera intermitent.

**Causes arrel identificades i resoltes:**
1. **Race condition** a la inicialització del sidebar: la migració `sync→local` i la lectura de la clau eren dues IIFE independents. Si l'init llegia abans que la migració copiés, la clau es donava per perduda. **Solució:** fusionar migració dins l'init, seqüencial.
2. **Falta `unlimitedStorage`:** `storage.local` té un límit de ~5-10MB. Amb 500 entrades de cache, omplir-lo feia que `set()` fallés silenciosament, perdent clau i cache. **Solució:** afegir `unlimitedStorage` al manifest.
3. **Pèrdua per remove/re-add i market uninstall:** esperada (storage bucket nou amb extension ID diferent). Limitació documentada a `docs/BUILD.md`.

**Criteris d'acceptació (complerts ✅):**
- [x] Després de recarregar l'extensió a Firefox i Chromium (mode prod instal·lat), la clau API persisteix.
- [x] L'historial de resums (`storage.local`) també persisteix.
- [x] No hi ha pèrdua per quota de storage gràcies a `unlimitedStorage`.
- [x] Si el problema és específic del mode DEV (extension ID canviant), documentar-ho a `docs/BUILD.md` com a limitació coneguda.

**Fitxers modificats:**
- `sidebar/sidebar.js` — migració fusionada dins l'init, mai esborra de `sync` si `local` ja té la clau
- `manifest.json` — afegit `unlimitedStorage`

---

~~Revisar i suprimir `set_dev_mode.ps1` en favor de `node scripts/set-mode.mjs`~~ ✅ **Resolt a v2.3.0**

**Criteris d'acceptació (complerts ✅):**
- [x] Comparació línia per línia dels dos scripts per a mode `dev` i `prod` — són equivalents.
- [x] `node scripts/set-mode.mjs dev` produeix el mateix resultat que `.\set_dev_mode.ps1 dev`
- [x] `node scripts/set-mode.mjs prod` produeix el mateix resultat que `.\set_dev_mode.ps1 prod`
- [x] `set_dev_mode.ps1` eliminat i `docs/BUILD.md` actualitzat.

**Fitxers modificats:**
- `set_dev_mode.ps1` (eliminat)
- `docs/BUILD.md` (actualitzat)

---

~~Migrar `build.ps1` i `release.ps1` a Node.js cross-platform~~ ✅ **Resolt a v2.3.0**

**Criteris d'acceptació (complerts ✅):**
- [x] `scripts/build.mjs` cobreix tots els casos de `build.ps1` (sidebar bundle, exclusió de JS individuals, ZIP output).
- [x] `scripts/build.mjs` és **superior**: inclou `vendor/` directori (pdf.js), elimina `icons/dev/` i `icons/prod/` del paquet, llista completa de sidecars.
- [x] `scripts/release.mjs` creat: backup opcional → set-mode prod → build → restauració del mode original.
- [x] `node scripts/release.mjs --target firefox --no-backup --skip-dev-restore` cobreix tots els flags.
- [x] `build.ps1`, `release.ps1`, `scripts/pwsh-runner.mjs` eliminats.
- [x] `docs/BUILD.md`, `docs/CHANGELOG.md`, `package.json`, `.github/workflows/release.yml` actualitzats.

**Fitxers modificats:**
- `build.ps1` (eliminat)
- `release.ps1` (eliminat)
- `set_dev_mode.ps1` (eliminat)
- `scripts/pwsh-runner.mjs` (eliminat)
- `scripts/release.mjs` (nou)
- `scripts/build.mjs` (referència corregida a `set-mode.mjs`)
- `package.json` (scripts `release*` ara apunten a `scripts/release.mjs`)
- `.github/workflows/release.yml` (node en lloc de pwsh, `build/` prefix als ZIPs)
- `docs/BUILD.md` (actualitzat)
- `docs/CHANGELOG.md` (actualitzat)

---

## Interfície d'usuari multidioma (i18n)

**Context (2026-05-27):** Actualment tota la interfície d'usuari està en català dur — ~200+ cadenes repartides entre ~18 fitxers (3 HTML + 15 JS). No existeix cap infraestructura d'internacionalització: ni `_locales/`, ni `default_locale` als manifests, ni `chrome.i18n`, ni `__MSG__` als HTML.

La decisió d'idioma ja es va identificar com a pendent al TO-DO.md (veure «Decisions estratègiques», punt 3), i el README descriu l'extensió com a catalana. L'objectiu és habilitar contribucions externes d'idiomes i preparar l'extensió per a un públic internacional.

**Comportament esperat:**
- L'extensió detecta l'idioma del navegador i mostra la UI en l'idioma corresponent.
- Si l'idioma del navegador no està disponible, es mostra el català (idioma per defecte).
- Totes les cadenes visibles a la UI són traduïbles: sidebar, settings, visor PDF, botons, etiquetes, missatges d'error, menús contextuals, nom/descripció del manifest.
- Els system prompts de l'IA (`shared/defaults.js`) es mantenen en català (instrueixen la IA en català independentment de l'idioma UI) o es tradueixen segons decisió de disseny.

**Abast:**
- `_locales/ca/messages.json` — traducció catalana (completa)
- `_locales/en/messages.json` — traducció anglesa (completa)
- `_locales/es/messages.json` — traducció castellana (opcional, fase 2)

**Evolució tècnica (proposta):**
1. Crear `_locales/{ca,en}/messages.json` amb totes les claus de traducció.
2. Afegir `"default_locale": "ca"` a tots els manifests (`manifest.base.json`, `manifest.chromium.json`, patches).
3. Substituir cadenes en HTML per `__MSG_*__` (sidebar/sidebar.html, options/settings.html, sidebar/pdf-viewer.html).
4. Afegir `ext.i18n.getMessage(key, ...args)` a `ext.js` com a wrapper cross-browser de `chrome.i18n.getMessage`.
5. Substituir cadenes hardcoded als JS per crides a `ext.i18n.getMessage()`.
6. Decidir el tractament dels system prompts de l'IA (mantenir en català o traduir-los).
7. Actualitzar build pipeline per validar que totes les claus `__MSG__` existeixin als messages.json.

**Criteris d'acceptació:**
- [ ] `_locales/` creat amb `ca` i `en` (mínim).
- [ ] `default_locale` present a tots els manifests.
- [ ] Totes les cadenes UI són substituïdes per claus i18n.
- [ ] L'extensió funciona correctament en navegador configurat en català i en anglès.
- [ ] No hi ha regressió visual ni funcional.
- [ ] Les cadenes noves es poden afegir sense tocar codi (només afegir clau als messages.json).
- [ ] Els tests existents continuen passant (207/207).

**Fitxers probables a modificar:**
- `_locales/ca/messages.json` (nou)
- `_locales/en/messages.json` (nou)
- `ext.js` (wrapper `ext.i18n.getMessage`)
- `sidebar/sidebar.html`, `options/settings.html`, `sidebar/pdf-viewer.html`
- `sidebar/ui.js`, `sidebar/summary.js`, `sidebar/sidebar.js`, `sidebar/history.js`, `sidebar/content.js`, `sidebar/api.js`, `sidebar/pdf-viewer.js`, `sidebar/cache.js`, `background.js`
- `options/settings-options.js`, `options/settings-cache.js`, `options/settings-models.js`
- `shared/content-types.js`
- `manifest.base.json` (+ patches)
- `scripts/pre-release-check.mjs` (validació de claus i18n)
