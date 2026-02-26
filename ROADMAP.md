# Roadmap & Improvement Proposals

Aquest document recull propostes per optimitzar l'extensió (Eficiència, Velocitat, Cost) i millorar-ne la funcionalitat.

## 🐛 Known Issues & Bugs

- (Cap error crític conegut actualment)

## 🛡️ Millores Tècniques i Manteniment

### 1. Sèrie 1.2.x – Refinament versió Firefox

- **Estat:** ✅ Completat (v1.2.1)
- **Objectiu:** polir l'extensió actual per a Firefox abans d'obrir el meló multi-navegador.
- **v1.2.1 — Resultats:**
  - ✅ Refactoritzat `sidebar.js` (632 → 230 línies): extret `stats.js`, `summary.js`, `renderApiKeyWarning()` a `ui.js`.
  - ✅ Millorats missatges d'error amb `classifyError()` (401/403, 429, permisos, contingut buit).
  - ✅ Ampliats tests (15 → 23): `estimateTokens`, `getCuratedModelInfo`, `classifyError`.
  - ✅ Documentada arquitectura actualitzada al `README`.

### 2. Sèrie 1.3.x – Preparació multi-navegador (només Firefox)

- **Estat:** ✅ Completat
- **Objectiu:** preparar el codi perquè sigui fàcilment portable, mantenint com a target principal Firefox.
- **Resultats:**
  - ✅ `ext.js` completat amb branca Chromium `sidePanel` (open, close, getViews, setPanelBehavior).
  - ✅ `background.js` registra `setPanelBehavior()` per a Chromium.
  - ✅ `README` documentat amb taula de compatibilitat cross-browser.
  - ✅ Tot el codi JS queda preparat per Chromium — només falten manifest + build.

### 3. Milestone 2.0.0 – Versió per navegadors basats en Chromium

- **Estat:** 📝 Planificat (no iniciat)
- **Objectiu:** portar l'extensió a Chrome/Edge/Brave reutilitzant al màxim la lògica actual.
- **Navegadors objectiu:** Chrome ≥ 116 (sidePanel API), Edge, Brave, Opera.

#### Fase A — Manifest Chromium (`manifest.chromium.json`)

> Crear un manifest MV3 natiu per a Chromium mantenint el de Firefox intacte.

- [ ] Crear `manifest.chromium.json` a l'arrel del projecte, basat en `manifest.json`, amb les diferències següents:
  - **Eliminar** la clau `browser_specific_settings` (específica de Gecko/Firefox).
  - **Eliminar** la clau `sidebar_action` (no existeix a Chromium).
  - **Substituir** `"permissions": ["menus"]` per `"permissions": ["contextMenus"]` (Firefox usa `menus`, Chromium usa `contextMenus`).
  - **Afegir** el permís `"sidePanel"` a `permissions`.
  - **Afegir** la clau `"side_panel"` amb `{ "default_path": "sidebar/sidebar.html" }`.
  - **Substituir** `"background": { "scripts": ["ext.js", "background.js"] }` per `"background": { "service_worker": "background.bundle.js", "type": "module" }` (Chromium no admet `scripts` array, cal un sol service worker).
  - **Canviar** `optional_host_permissions` a `host_permissions` si cal (revisar compatibilitat).
- [ ] Validar el manifest resultant amb `chrome://extensions` en mode desenvolupador.

#### Fase B — Completar `ext.js` per a sidePanel

> El wrapper `ext.js` ja gestiona `menus` vs `contextMenus`. Cal completar-lo per cobrir `sidePanel`.

- [ ] Implementar `ext.sidebar.open()` per a Chromium: cridar `chrome.sidePanel.open({ windowId })` (disponible Chrome 116+).
- [ ] Implementar `ext.sidebar.close()` per a Chromium: no existeix `sidePanel.close()` natiu; documentar la limitació o usar workaround amb `sidePanel.setOptions({ enabled: false })`.
- [ ] Adaptar `ext.sidebar.getViews()`: a Chromium `extension.getViews({ type: "sidebar" })` no funciona. Alternativa: mantenir estat intern (variable `isPanelOpen`) o usar `chrome.runtime.getContexts()` (Chrome 116+).
- [ ] Afegir a `ext.sidebar` la funció `setPanelBehavior()` per cridar `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`.

#### Fase C — Background: migrar a Service Worker

> Firefox permet `"background.scripts"` (persistent), Chromium exigeix un únic `service_worker` (event-driven).

- [ ] Crear `background.bundle.js` (o usar un bundler senzill) que importi `ext.js` + `background.js` en un sol fitxer. Alternativa: usar ES modules amb `import` si el manifest usa `"type": "module"`.
- [ ] Revisar `background.js` per assegurar que la lògica és compatible amb service workers (no persistent):
  - No hi ha estat global mutable que es perdi entre despertades → ✅ (el codi actual ja és event-driven amb listeners).
  - Les API utilitzades (`ext.menus.create`, `ext.storage.local.set`, `ext.runtime.sendMessage`) són compatibles amb service workers.
- [ ] Registrar el `sidePanel` a `ext.runtime.onInstalled`: cridar `ext.sidebar.setPanelBehavior()` perquè el clic a l'acció obri el side panel.
- [ ] Afegir `chrome.sidePanel.setOptions({ path: "sidebar/sidebar.html" })` al listener `onInstalled` si cal.

#### Fase D — Build i empaquetament multi-navegador

> Automatitzar la generació de paquets separats per Firefox i Chromium.

- [ ] Crear un script de build (`build.ps1` o `build.js`) que:

  1. Llegeixi un paràmetre `--target firefox|chromium|all`.
  2. Per a **Firefox**: copiï `manifest.json` i empaqueti el ZIP com fa `make_zip_v4.py` actual.
  3. Per a **Chromium**: copiï `manifest.chromium.json` com `manifest.json`, generi `background.bundle.js` (concatenació o bundling de `ext.js` + `background.js`), i empaqueti el ZIP resultant.
  4. Generi ZIPs amb nomenclatura clara: `resumir-contingut-vX.Y.Z-firefox.zip` i `resumir-contingut-vX.Y.Z-chromium.zip`.

- [ ] Actualitzar `make_zip_v4.py` o substituir-lo pel nou script unificat.
- [ ] Actualitzar `.gitignore` per incloure els artefactes de build Chromium (`background.bundle.js`, ZIPs Chromium).

#### Fase E — Actualitzar tooling de desenvolupament

> Adaptar els scripts auxiliars perquè funcionin amb ambdós targets.

- [ ] Actualitzar `set_dev_mode.ps1`:
  - Afegir suport per a `manifest.chromium.json` (la línia `$json.browser_specific_settings.gecko.id` falla si la clau no existeix).
  - Acceptar un paràmetre `-Target firefox|chromium` per aplicar la transformació al manifest correcte.
- [ ] Actualitzar el workflow `.agent/workflows/work_procedure.md` per documentar com carregar l'extensió a Chrome (`chrome://extensions → Load unpacked`) a més de Firefox.
- [ ] Actualitzar el workflow `.agent/workflows/release_procedure.md` per incloure els passos de publicació a Chrome Web Store (CWS).

#### Fase F — Proves, validació i publicació CWS

- [ ] Provar manualment a Chrome: carregar l'extensió sense empaquetar, verificar:
  - Obertura del side panel des del botó d'acció (toolbar).
  - Menú contextual ("Resumir text seleccionat", "Resumir contingut").
  - Generació de resums (API Gemini/Gemma).
  - Canvi de tema (clar/fosc/sistema).
  - Pàgina de configuració (`options_ui`).
  - Exportació a Obsidian.
  - Plugins (reordenació, visibilitat).
  - Estadístiques d'ús.
- [ ] Provar a Edge i Brave (Chromium-based) per confirmar compatibilitat.
- [ ] Executar els tests existents a `tests/test.html` verificant que la lògica compartida continua passant.
- [ ] Crear un compte de desenvolupador a Chrome Web Store (si no existeix).
- [ ] Preparar les captures de pantalla, descripció i privadesa per a la fitxa CWS.
- [ ] Publicar la primera versió Chromium a CWS.
- [ ] Actualitzar `README.md` amb instal·lacions per a Firefox **i** Chromium.

> **Nota de compatibilitat:** Tot el codi de la sidebar (`sidebar.js`, `api.js`, `cache.js`, `content.js`, `ui.js`, `utils.js`), la pàgina de configuració (`settings.js`) i `theme.js` ja utilitzen l'abstracció `ext.*` o la detecció `browser`/`chrome` pròpia — **no necessiten canvis** per funcionar a Chromium.

### 4. Migració a TypeScript

- **Prioritat:** Baixa (Millora no urgent)
- **Benefici:** Major robustesa del codi, tipat estàtic per a les estructures de dades.

---

## 🚀 Noves Funcionalitats

---

## ✅ Implementat

### Abstracció d'API de Navegador (`ext.*`)

- **Estat:** ✅ Implementat
- **Detalls:** S'ha creat un wrapper genèric `ext` a l'script global per independitzar l'extensió de `browser.*` i preparar el camí cap a manifest V3 i `chrome.*`.

### Consolidació de Visibilitat i Ordre de Plugins

- **Estat:** ✅ Implementat
- **Detalls:** L'ordenació i funcionalitat manual dels plugins (Markdown, Obsidian, validació) està centralitzada de forma modular. L'ordre pre-configurat es respecta integralment de la `sidebar` i menú.

### Unificació d'emmagatzematge (`sync`)

- **Estat:** ✅ Implementat (v1.1.7)
- **Detalls:** S'ha completat la convergència del 100% l'opcions globals d'usuari a `storage.sync` (temes, habilitació de botons específics).

### Validació d'Evidència Científica

- **Estat:** ✅ Implementat
- **Detalls:** Funcionalitat per qüestionar i validar la validesa científica de les afirmacions del contingut contrastant-les amb evidència científica i bases de dades acadèmiques (ex: PubMed, Semantic Scholar).

### Reordenació de Plugins
- **Estat:** ✅ Implementat (v1.1.5)
- **Detalls:** Els usuaris poden establir un ordre visual preferit per a les integracions internes de la barra.

### Gràfics i Estadístiques Avançades
- **Estat:** ✅ Implementat (v1.1.5)
- **Detalls:** Quadres de comandament analítics per als usuaris amb un estimat de temps humanitzat i un gràfic de dies actius.

### 2. Tests Unitaris

- **Estat:** ✅ Implementat (v1.1.4)
- **Detalls:** Tests d'integració bàsics a `tests/test.html` i lògica separada a `utils.js`.

### 3. Integració Obsidian (Fix Producció)

- **Estat:** ✅ Implementat (v1.1.4)
- **Detalls:** Solucionat l'error de CSP utilitzant `browser.tabs.update`.

### 3. Sistema de Memòria Cau (Cache) Local

- **Estat:** ✅ Implementat
- **Detalls:** Ús de `browser.storage.local` per guardar resums i metadades, evitant regeneració de tokens.

### 4. Detecció d'Idioma (Forçat a Català)

- **Estat:** ✅ Implementat
- **Detalls:** System Prompt configurat per respondre SEMPRE en Català, independentment de l'idioma original.

### 5. Configuració de Temes i Mode Fosc

- **Estat:** ✅ Implementat
- **Detalls:** Suport per temes Clar/Fosc/Sistema automàtic a `theme.js`.

### 6. Integració amb Menú Contextual

- **Estat:** ✅ Implementat
- **Detalls:** Opcions "Resumir text seleccionat" i "Resumir contingut" al menú de clic dret (`background.js`).

### 7. Streaming de Resposta

- **Estat:** ✅ Implementat
- **Detalls:** Ús de Server-Sent Events (SSE).

### 8. Pre-càrrega Especulativa

- **Estat:** ✅ Implementat

### 9. Historial de Resums

- **Estat:** ✅ Implementat

### 10. Compressió de Prompts

- **Estat:** ✅ Implementat / En curs
- **Detalls:** System Prompt optimitzat definit a `sidebar.js`.

### 11. Navegació Històrica des de Sidebar

- **Estat:** Proposta
- **Detalls:** Permetre navegar per l'historial de resums i recuperar-los directament des de la barra lateral.

## 🗑️ Descartat / No Prioritari

- **Xat amb la Pàgina (Q&A):** Descartat per simplificar l'abast.
- **Suport PDF Local:** Descartat (no urgent).
