# Registre de canvis

Tots els canvis importants d'aquest projecte es documenten en aquest fitxer.

El format està basat en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
i el projecte segueix el [Versionatge Semàntic](https://semver.org/spec/v2.0.0.html).

## [Sense publicar]

### Eliminat
- **Llibreria Defuddle (`defuddle.js`, ~571 KB)**: només s'usava per a Twitter/X
  i el scrape directe del DOM (`[data-testid="tweetText"]`) ja captura els fils
  igual de bé (tots dos llegeixen el mateix DOM renderitzat). L'extracció de
  Twitter/X passa a: scrape de tweets com a via primària + meta `og:description`
  com a fallback robust (HTML servit pel servidor, immune a canvis del DOM).
  Elimina 3 warnings recurrents d'AMO («Unsafe assignment to innerHTML» interns
  de la llibreria de tercers) i ~571 KB del paquet.

---

## [2.5.0] - 2026-06-12

### Arreglat
- **Chromium/Edge: el panell lateral s'obre des de la icona.** El Chromium modern
  (≥ ~140) també exposa un global `browser`, cosa que feia que la detecció de
  navegador (`typeof browser`) classifiqués Edge/Chrome com a Firefox i tot
  `ext.sidebar` fos un no-op silenciós (el panell no s'obria mai). La detecció ara
  usa `browser.sidebarAction` i s'exposa com a `ext.isFirefox` (única font de
  veritat). Tests de regressió que simulen el Chromium real (global `browser`
  present sense `sidebarAction`).
- **Selector de models llegible** a la barra inferior: la fletxa nativa del
  desplegable se superposava al nom del model a Chromium/Edge; ara hi ha un caret
  SVG propi amb espai reservat i el·lipsi.
- **Lectura biònica amb mida coherent a tot arreu**: la mida s'aplicava en `em`
  relatiu al pare (12px) i «Normal» es veia més petit que la lectura normal; a
  més, cada camí (toggle, streaming, historial) aplicava els estils pel seu
  compte. Ara un únic helper (`applyBionicStyles`) ancora la mida en px sobre
  `--content-base-size` (sidebar.css).
- **Twitter/X als paquets publicats**: `defuddle.js` no s'incloïa als ZIPs de
  producció i l'extracció de fils queia silenciosament al fallback.
- **Errors de permís reconeguts a Chromium/Edge**: el missatge «Cannot access
  contents of the page» no es detectava (només la variant de Firefox) i l'usuari
  veia l'error de permisos en pàgines HTTPS normals en lloc de la petició de
  permís.
- **Mapa conceptual: enquadrament inicial més allunyat** (escala d'autofit 0.78):
  el mapa es veu sencer per defecte, sense haver d'allunyar el zoom amb la roda.
- **Errors més clars en pàgines restringides** (nou codi `[011]`): s'explica el
  motiu real (pàgina restringida o permís denegat) en lloc de suggerir recarregar.

### Canviat
- **Permisos: `<all_urls>` ara és requerit a la instal·lació** (abans era opcional
  en temps d'execució): resumir ja no demana permís lloc a lloc. ⚠️ En
  actualitzar, el navegador demana re-aprovar els permisos — és normal i només
  passa una vegada.
- A Chromium el clic a la icona usa el comportament natiu del panell
  (`openPanelOnActionClick`); el listener d'acció només es registra a Firefox
  (són mútuament excloents a Chromium).

### Accessibilitat
- Focus de teclat visible al selector de models (WCAG 2.4.7), que amb el caret
  personalitzat hauria quedat invisible.

### Desenvolupament
- `npm run dev:chromium`: genera la carpeta desempaquetada per provar a
  Edge/Chrome (el `manifest.json` de l'arrel és el de Firefox i no funciona a
  Chromium).
- Proposta de valor i pla de comunicació (`docs/COMUNICACIO.md`); literals d'AMO
  i CWS alineats; README reescrit amb crèdits a les llibreries open source
  (Readability, Defuddle, pdf.js, markmap+D3).

---

## [2.4.1] - 2026-06-10

### Canviat
- **CI/Node:** `node-version` 20 → 22 als workflows (Node 20 és EOL),
  `softprops/action-gh-release` v2 → v3 (node24-native) i eliminada l'env var
  pont `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`; `engines.node` >=18 → >=20.
- **Migració de prompts versionada per-prompt** (`PROMPT_VERSIONS`): evita banners
  falsos de "nova versió del prompt" quan només canvia un prompt. Lògica extreta a
  una funció pura testejada (`computePromptMigration`, 8 casos nous).
- **Llengua:** verbs dels botons unificats a **infinitiu** (guia de Comunicació
  Clara de Gencat) i castellanismes corregits ("Desar" per "Guardar", "memòria cau"
  per "caché", "claudàtors" per "corxers", "ressaltarà", "a la barra lateral").

### Accessibilitat
- **Mapa conceptual operable amb teclat**: toggles amb `tabindex`/`role=button`/
  `aria-label` i Enter/Espai; vista a pantalla completa com a diàleg modal real
  (`role=dialog`, focus al botó de tancar, focus trap i restauració del focus).
- **Contrast** del tema solarized a WCAG AA (text i text secundari).
- `aria-pressed` als botons commutables (biònic, desplega/plega tot), `aria-current`
  al nav de configuració, i historial operable amb teclat.

### Seguretat
- **Mapa a pantalla completa**: es demana confirmació abans d'injectar l'overlay si
  la pestanya activa no coincideix amb l'origen del mapa (evita filtrar el contingut
  a una pàgina diferent).

---

## [2.4.0] - 2026-06-10

### Afegit
- **Nou plugin "Explica-ho fàcil":** reescriu el contingut en llenguatge senzill i
  planer, assumint que l'usuari no té coneixements previs del tema. Botó bombeta
  (ambre) a la toolbar, tipus de contingut `simple` (💡) a l'historial, prompt
  editable amb banner d'actualització i reset a Settings. (minor)
- **Lectura de PDF com a plugin ordenable:** el botó de PDF local passa a ser un
  plugin complet (id `selectpdf`, etiqueta "PDF"): toggle `enablePdf` (actiu per
  defecte), entrada a la llista de Plugins amb moure amunt/avall, nav lateral i
  pestanya informativa. Ara es pot activar/desactivar i reordenar. (minor)

### Canviat
- **Ordre per defecte dels plugins** centralitzat a `DEFAULT_EXTENSION_ORDER`
  (`shared/defaults.js`): resum, PDF, Explica-ho fàcil, aprofundiment, validació
  científica, mapa conceptual, Obsidian, Markdown, lectura biònica. S'aplica com a
  fallback quan no hi ha ordre desat (substitueix la dependència de l'ordre del
  DOM). Els usuaris amb ordre personalitzat el conserven. (minor)

### Corregit
- **Auditoria pre-producció (2026-06-10):**
  - **Botons dels banners d'actualització de prompts morts per CSP:** els 8 botons
    usaven `onclick` inline, que la CSP de MV3 (`script-src 'self'`) bloqueja a les
    pàgines d'extensió. Ara van amb `data-attributes` + binding delegat a
    `settings.js`. La guia de `shared/defaults.js` (pas 6) actualitzada. (patch)
  - **Recursió infinita a l'export PNG del mapa (mode dev):** un wrapper top-level
    `buildConceptMapFilename` a `conceptmap.js` sobreescrivia la util global i es
    cridava a si mateix amb scripts separats. Eliminat. (patch)
  - **Prompts d'Aprofundiment i Validació científica sense bloc SEGURETAT:** ara
    expliquen al model que `<UNTRUSTED_CONTENT>` són dades, no instruccions
    (`PROMPT_DEFAULTS_VERSION` → 4); regex de neutralització del delimitador més
    tolerant (espais/guions). (patch)
  - **Botons nous actius durant la generació:** `conceptMapBtn`, `explainSimpleBtn` i
    `selectPdfBtn` ara es desactiven mentre es genera (abans, clicar-los aturava la
    generació en curs). (patch)
  - **Fuita de listeners en reobrir el mapa a pantalla completa:** la reobertura ara
    tanca la instància anterior via `close()` (desregistra mousemove/mouseup/keydown/
    pagehide); `close()` també cancel·la el tween en curs. (patch)
  - **TypeError al visor PDF:** fletxes de teclat amb el PDF encara no carregat. (patch)
- **Accessibilitat (auditoria):** `aria-label` als 9 toggles de plugins i focus
  visible al switch (abans invisibles per a lectors de pantalla i teclat);
  `prefers-reduced-motion` respectat a la sidebar, al tween del mapa i a l'overlay;
  contrast de les icones ambre/verd apujat a ≥3:1 en temes clars (WCAG 1.4.11);
  `role=status/alert` i `aria-label` al visor PDF; missatge PDF-016 coherent amb el
  tooltip del botó. (patch)
- **El botó "Explica-ho fàcil" no apareixia a la sidebar:** la clau `enableSimple`
  faltava a `CONFIG_KEYS` de `sidebar.js`, així que `config.enableSimple` era
  `undefined` i s'amagava el botó (a Settings sí sortia, perquè usa una llista de
  claus diferent). Afegida `enableSimple` (i `enablePdf`) a `CONFIG_KEYS`.
  Documentat com a trampa a `docs/CREAR-PLUGIN.md`. (patch)
- **"Bombolla" a les icones dels botons del mapa conceptual:** el selector
  descendent `.markmap-container svg` pintava fons/vora als SVG de les icones dels
  botons de control (visible amb temes no blancs com solarized). Escopat amb `> svg`
  + resets a la còpia del fullscreen. (patch)

---

## [2.3.1] - 2026-05-29

### Afegit
- **Script interactiu de preparació de release:** `npm run prepare-release` guia
  l'usuari pas a pas (branca, commit, PROD, prerelease, build, bump, tag, push)
  amb confirmació a cada pas. (minor)
- **Suport de GitHub Sponsors:** FUNDING.yml, badge al README i docs/SPONSORS.md. (minor)

### Canviat
- **Release pipeline (`release.yml`):** ara executa `prerelease` (17 checks) i
  `vendor:verify` abans de crear el GitHub Release. (minor)
- **`docs/BUILD.md`:** actualitzat amb el nou flux interactiu i test count. (minor)
- **`docs/CONTRIBUTING.md`:** actualitzats requeriments, tests (233+) i estructura. (minor)
- **`docs/PRIVACY_POLICY.md`:** actualitzada data i correcció storage.local. (minor)
- **`docs/README.md`:** netejat — eliminades referències a fitxers inexistents. (minor)

### Eliminat
- **Pestanya d'estadístiques eliminada:** s'han tret `options/settings-stats.js`,
  `tests/settings-stats.test.mjs` i `tests/stats-period.test.mjs` (codi no mantingut).
  Les estadístiques bàsiques (tokens, cache) es mostren al sidebar. (minor)

---

## [2.3.0] - 2026-05-25

### Afegit
- **Suport per resumir fitxers PDF amb capa de text** (issue: extensió no funcionava amb PDFs). Implementat amb pdf.js 3.11.174 (legacy UMD) vendoritzat a `vendor/`.
  - **PDFs remots HTTPS:** detecció automàtica per extensió `.pdf` o per `Content-Type: application/pdf` (HEAD probe d'1 round-trip per URLs sospitoses sense extensió, p. ex. `arxiv.org/pdf/123`).
  - **PDFs locals (`file://`) i HTTP:** nou botó "Selecciona PDF local" a la barra d'eines del sidebar (file picker via `<input type="file">` + `FileReader`, sense cap accés de xarxa).
  - **Codis d'error UI:** `[PDF-010]` protegit, `[PDF-011]` invàlid, `[PDF-012]` escanejat (OCR no suportat), `[PDF-013]` massa gran, `[PDF-014]` timeout, `[PDF-015]` fetch fallit, `[PDF-016]` no-HTTPS (suggereix botó local amb pulse visual), `[PDF-019]` altres.
  - **Límits:** màx 500 pàgines, 2M caràcters, timeout 60s d'extracció + 15s de fetch.
- **Nova pestanya amb el PDF seleccionat:** en seleccionar un PDF local, s'obre una pestanya de fons amb el PDF per consultar-lo (limitació: Firefox no renderitza `blob:` URLs d'extensions al visor PDF nadiu). (minor)

### Corregit
- **Race condition en migració de clau API:** la migració `sync→local` i la lectura de la clau eren dues IIFE independents. L'init podia llegir abans que la migració copiés la clau, mostrant "clau no configurada" tot i tenir-la. Ara la migració és seqüencial dins l'init, i mai s'esborra de `sync` si `local` ja la té. (minor)
- **Pèrdua silenciosa de dades per quota de storage:** `storage.local` té un límit de ~5-10MB; en exhaurir-lo, les dades (clau, cache, historial) es perdien sense avís. Afegit `unlimitedStorage` al manifest per eliminar el límit. (minor)
- **CORS en PDFs remots HTTPS:** el fetch directe des del sidebar fallava per CORS en servidors sense `Access-Control-Allow-Origin`. Ara se sol·licita el permís `<all_urls>` sota gest d'usuari i es reintenta; amb `host_permissions` concedit, Firefox/Chromium no apliquen CORS al fetch d'extensió. (minor)
- **Local PDF: error [006] al obrir pestanya blob:** el resum de PDFs locals fallava perquè `getPageContent()` no podia extreure text de la pestanya blob. Solucionat: el text extret es passa via `contentPreload` amb prefix `pdf-local:`, i el pipeline l'usa directament sense dependre de la pestanya activa. (minor)
- **Botó PDF en segona posició:** afegit `selectPdfBtn` al mapatge `extensionIdToButtonId` de `applyExtensionOrder` amb migració automàtica per a usuaris amb ordre desat. (minor)
- **Preload abans que caché:** la comprovació del `contentPreload` es fa ara abans de la caché, evitant que un PDF local obtingui un resum en caché de la pàgina web activa. (minor)

### Canviat
- **CSP `connect-src` relaxada amb `https:`** (afegit a `manifest.{base,json,chromium,firefox.patch,chromium.patch,firefox.prod.patch,chromium.prod.patch}.json`) per permetre descàrrega de PDFs remots des de qualsevol origen HTTPS. La política `file:` i `http:` queda explícitament exclosa per principi de mínim privilegi. Veure `docs/SECURITY.md` per a la justificació completa i mitigacions. (minor)
- **Models ordenats per prioritat:** la llista de models ara segueix l'ordre flash-lite > flash > pro > gemma, amb versions recents primer dins cada família. Afecta el selector de la sidebar, la llista de configuració i l'ordre de fallback automàtic.
- **Build i release 100% Node.js:** eliminats `set_dev_mode.ps1`, `build.ps1`, `release.ps1` i `scripts/pwsh-runner.mjs`. Les comandes `npm run dev`/`prod`/`build`/`release` ara usen scripts Node.js directament (`scripts/set-mode.mjs`, `scripts/build.mjs`, `scripts/release.mjs`). La CI/CD (`release.yml`) també s'ha actualitzat per usar `node scripts/build.mjs`. (minor)

### Seguretat
- pdf.js configurat amb opcions CSP-safe: `isEvalSupported: false`, `disableFontFace: true`, `useSystemFonts: false`, `verbosity: 0`. (minor)
- Worker pdf.js carregat des d'origen extensió (`runtime.getURL`), mai remot. (minor)
- **Avís important per als usuaris anteriors a v2.2**: Si heu instal·lat l'extensió abans de la versió 2.2, la vostra clau API de Gemini pot haver estat emmagatzemada a `storage.sync` (sincronitzada entre dispositius). A partir de la v2.2, la clau es guarda exclusivament a `storage.local`. Es recomana **rotar la clau API** des de Google AI Studio com a precaució.

---

## [2.2.10] - 2026-05-22

### Corregit
- **Bug 1 — Llegibilitat del mapa conceptual en tema fosc**: el text dels nodes ara és sempre llegible a tots els temes (clar, fosc, sèpia, gris). Les opcions `textColor`/`toggleBgColor` es resolen des de variables CSS i s'incrusten directament al SVG exportat a PNG. (minor)
- **Bug 2 — Mapa conceptual redissenyat amb estil pill (NotebookLM)**:
  - Substituïts els nodes baseline + text per pills `<rect>` arrodonits estil NotebookLM.
  - Paleta pastel jeràrquica idèntica a tots els temes: lila (root) → blau → verd clar → verd menta.
  - Text fix `#1a1a1a` centrat verticalment dins el pill (`dominant-baseline=central`).
  - Mesura precisa del text amb `canvas.measureText` (resol desencaixos entre baseline i edges).
  - Toggle estil NotebookLM: cercle blanc amb glyph `<`/`>` tintat amb el color del pill.
  - Edges connecten extrem dret del pare amb extrem esquerre del fill (opacitat plena).
  - Mateix renderitzador a sidebar i a pàgina completa.
- **Bug 3 — Transcripcions de YouTube tornen a funcionar**: afegides Via B (variants `json3`/`srv3`/`cru` del timedtext) i Via C (`youtubei/v1/get_transcript` amb `INNERTUBE_API_KEY` i `INNERTUBE_CONTEXT` extrets del DOM). Quan els subtítols no es poden carregar pel mètode habitual, l'extensió ara prova rutes alternatives abans de fallar.

### Canviat
- **Nou format del nom de fitxer del PNG del mapa conceptual**: `YYYYMMDD_word1_word2.png` derivat del títol arrel del mapa (no del títol de la pestanya). Normalització NFD + strip diacrítics + lowercase + alfanumèric, amb stop-words ca/es/en filtrats. Fallback `_mapa.png` si cap token vàlid. (minor)

### Intern
- Nou fitxer `sidebar/conceptmap-filename.js` amb la funció pura compartida entre sidebar i overlay de pantalla completa. (minor)
- 15 nous tests unitaris per a la generació de noms de fitxer (`tests/conceptmap-filename.test.mjs`). Suite total: 222/222 passen. (minor)
- Nou `scripts/set-mode.mjs` (port Node de `set_dev_mode.ps1`) per evitar restriccions de `MachinePolicy` a PowerShell. Els scripts npm `dev`/`prod` ara hi apunten. (minor)

---

## [2.2.9] - 2026-05-22

### Canviat
- **Mapa conceptual interactiu reescrit des de zero**: substituïdes les llibreries de tercers `d3.min.js`, `markmap-lib.js` i `markmap-view.js` (~640 KB) per un renderitzador SVG natiu propi (`sidebar/markmap-native.js`, ~22 KB). Mateixa funcionalitat (zoom, pan, plegat de branques, exportació a PNG i pàgina completa) sense dependències externes.
- Eliminat camp no estàndard `author_email` del manifest (Firefox emetia warning). (minor)
- Eliminat `web_accessible_resources` del manifest Firefox (ja no calen els vendors a la pàgina). (minor)

### Seguretat
- **Zero warnings a la revisió d'AMO**: el codi nou no utilitza `innerHTML` dinàmic, `eval()` ni `Function()` — totes operacions DOM via `createElementNS` i `DOMParser`. Això elimina els 6 warnings que retardaven la revisió de l'extensió.
- Reducció significativa de superfície d'atac: tot el codi de visualització és auditable i prop de 95% més petit que les llibreries substituïdes. (minor)

### Intern
- Nou fitxer `sidebar/markmap-native.js` integrat al bundle del sidebar. (minor)
- `scripts/build.mjs`, `scripts/build-sidebar-bundle.mjs`, `scripts/pre-release-check.mjs` i `eslint.config.mjs` netejats de referències a vendors eliminats. (minor)

---

## [2.2.8] - 2026-05-22

### Corregit
- **Crític**: els scripts del sidebar no s'incloïen al paquet de release a causa d'un regex fràgil al bundler que es va trencar amb l'ordre de scripts introduït a v2.2.5. Resultat: en instal·lacions des d'AMO, la sidebar no responia als botons (configuració, historial, mode biònic) i la bottom bar no es mostrava. Afectava v2.2.5, v2.2.6 i v2.2.7.
- Les llibreries `d3.min.js`, `markmap-lib.js` i `markmap-view.js` ara s'inclouen al ZIP de release (abans referenciades al HTML però absents al paquet). (minor)
- `conceptmap.js` integrat al bundle del sidebar per simplificar el manteniment i reduir el nombre de requests. (minor)

### Intern
- Nou patcher robust de `sidebar.html`: elimina explícitament els scripts del bundle (per llista coneguda) en lloc de dependre d'un regex frágil. (minor)
- Nou check #13 al pre-release-check: smoke-test del ZIP verifica que tot script referenciat als HTML existeix dins del paquet abans de publicar. (minor)

---

## [2.2.7] - 2026-05-22

### Corregit
- Afegit `web_accessible_resources` al manifest Firefox per permetre la injecció de les llibreries del mapa conceptual (`d3.min.js`, `markmap-lib.js`, `markmap-view.js`) a pàgines web externes. Sense aquesta declaració, Firefox bloquejava la injecció i el mode pantalla completa del mapa conceptual fallava amb error CSP. (minor)

---

## [2.2.6] - 2026-05-22

### Corregit
- Eliminat `incognito: "split"` del manifest (no suportat per Firefox) (minor)
- Substituït el constructor `Function` per `eval` indirecte a `conceptmap.js` (millora de seguretat) (minor)
- Restaurades les icones blaves de producció a `icons/prod/` i `icons/` (minor)
- Les subcarpetes `icons/dev/` i `icons/prod/` ja no s'inclouen als ZIPs de release (minor)
- Ruta del `CHANGELOG.md` corregida a `docs/CHANGELOG.md` als scripts de build (minor)

---

## [2.2.5] - 2026-05-22

### Afegit
- El nom del fitxer PNG exportat del mapa conceptual ara usa el format `YYYYMMDD_<titular>.png` (titular abreujat a 20 caràcters) (minor)

### Canviat
- L'extensió passa a anomenar-se "Resumir" (mode DEV: "Resumir (DEV)")
- Configuració del mapa conceptual: eliminades les opcions de profunditat, branques, expandir tot i mostrar descripcions (ara es controlen des del prompt) (minor)
- Lectura biònica: interlineat per defecte canviat a 1.5, gruix de negreta per defecte canviat a 600 (semi-negreta) (minor)
- La icona del mapa conceptual a configuració ara coincideix amb el botó de la sidebar (minor)

### Eliminat
- Eliminada l'opció d'idiomes preferits de YouTube a configuració (la selecció d'idioma ara és automàtica) (minor)

---

## [2.2.4] - 2026-04-27

### Afegit
- Indicador de càrrega animat amb punts durant la generació del resum (minor)
- Refactorització de l'extracció de transcripcions de YouTube: extracció MAIN world (Pas 1) + fallback via API (Pas 2) (minor)
- Suport per a `prerenderedText` quan `playerCaptionsTracklistRenderer` és buit (minor)
- Lectura directa de la transcripció des de `ytInitialData` sense obrir el panell (minor)
- **Protecció contra injecció de prompts**: embolcall `<UNTRUSTED_CONTENT>` al prompt del sistema
- **Clau API migrada de `storage.sync` a `storage.local`** per millor aïllament de seguretat

### Corregit
- El panell de transcripció de YouTube no s'obria en navegar a un vídeo (minor)
- Detecció de la transcripció de YouTube molt més robusta (minor)
- Els punts de càrrega ara s'amaguen en rebre el primer chunk d'streaming (sense parpelleig d'estat buit) (minor)
- La toolbar es manté visible en visualitzar entrades de l'historial de caché (minor)
- La barra de tornada s'amaga en tancar panells per tornar a la vista principal (minor)
- Alineació de la barra del botó de tornada amb la toolbar; menú amagat en visualitzar panells (minor)

### Canviat
- Disposició reordenada en visualitzar un resum de caché (minor)
- La classe CSS `.hidden` ara sempre amaga elements independentment de l'especificitat (minor)

---

## [2.2.3] - 2026-04-23

### Afegit
- Millores a l'extracció de transcripcions ASR (autogenerades) de YouTube (minor)
- Comptador diari per a estadístiques precises per període (minor)
- Límit de l'historial d'estadístiques augmentat de 100 a 1.000 entrades (minor)
- Tests de persistència: validen la integritat de les dades entre actualitzacions de versió (minor)

### Corregit
- Lectura de transcripcions de YouTube des de `ytInitialData` (suport ASR complet) (minor)
- Detecció de la pista activa en l'extracció de transcripcions de YouTube (minor)
- Gestor `onInstalled`: evita menús contextuals duplicats en actualitzar (minor)
- Fuites de memòria en la caché i els bindings de botons (minor)
- Fallback del model API ampliat; missatges d'error de l'API millorats (minor)

### Rendiment
- Temps d'inici de la sidebar millorat (minor)
- Crides API: afegits timeouts i fiabilitat millorada (minor)
- Estadístiques: lectures de `getDailyStats` unificades en una sola crida `storage.get` (minor)

### Canviat
- Nom al manifest de producció corregit (ja no inclou l'etiqueta `DEV`) (minor)
- Globals d'ESLint corregits; hook de lint pre-commit afegit (minor)

---

## [2.2.2] - 2026-04-22

### Afegit
- Les operacions de caché ara usen un índex de resums per a purga i llistat més ràpids (minor)
- Embolcall de PowerShell multiplataforma (`build.ps1`) amb comprovació d'existència de l'script (minor)
- Changelog injectat automàticament a `settings.html` en fer un bump de versió (script `postversion`) (minor)
- Ordres de build i release per a Firefox/Chromium documentades a `BUILD.md` (minor)

### Corregit
- Fallback de l'índex de caché: purga i llistat funcionen correctament quan falta l'índex (minor)
- Bindings de botons de la pàgina d'opcions corregits (minor)
- El manifest de producció de Chromium ja no conté la clau de Chrome incrustada (minor)
- Estil biònic extret en un helper dedicat; renderització del resum endurit (minor)
- Bindings d'esdeveniments de settings refactoritzats; gestió del pageSize endurit (minor)

### Canviat
- El flux de release conserva el mode dev/prod original i escriu fitxers de patch JSON sense BOM (minor)
- Directoris de còpia de seguretat del build (`build_*/`) exclosos de git (minor)

---

## [2.2.1] - 2026-04-07

### Afegit
- Barra inferior millorada: visualització de l'ús de tokens amb millores d'UX (minor)

### Corregit
- Globals d'ESLint per als prompts per defecte corregits (minor)
- Ús de stream a `summary.js` corregit (minor)

### Canviat
- Settings refactoritzades: valors per defecte i UI simplificats (minor)
- Manifests regenerats en mode PROD (el nom ja no conté `DEV`) (minor)

---

## [2.2.0] - 2026-04-01

### Afegit
- Panell de text font: visualitza el text pla enviat a la IA per a la resumització (minor)
- **Extracció de contingut de Twitter/X** via la biblioteca Defuddle amb fallback de scraping DOM
- Hacker News: eliminat el límit de comentaris; afegida la càrrega de l'article enllaçat (minor)
- Readability.js carregat en el context de la sidebar per a la càrrega d'articles de HN (minor)
- Insígnia de caché: insígnia clicable que mostra l'estat de caché a la toolbar (minor)
- Estadístiques: selector de període (7d / 30d / 6m / 1a) per a KPIs, gràfic i taula (minor)
- Estadístiques: columnes per a tokens d'entrada, tokens de sortida, encerts de caché i ms mitjans (minor)
- **Comptatge real de tokens des de `usageMetadata`** de l'API de Gemini (substitueix les estimacions)
- Historial d'estadístiques: càrrega de resum de caché directament a la sidebar (no només obre l'URL) (minor)
- Barra de títol de pàgina: barra adhesiva que mostra el títol de la pàgina actual durant la resumització (minor)
- **Panell d'historial**: llista navegable de resums anteriors a la sidebar
- `listCachedSummaries` per al panell d'historial (minor)

### Corregit
- Caché: TTL de 30 dies amb `purgeStaleCacheEntries` per a entrades caducades (minor)
- Caché: `clearCache` ara esborra totes les claus `summary_cache:*`, no només les indexades (minor)
- Resum: div de contingut visible durant l'streaming (estava amagat fins al final) (minor)
- Resum: el fallback de quota respecta els models favorits i evita els models cars (minor)
- Models: límit de tokens per model via `contextWindow`; `EUR_RATE` mogut a `shared/models.js` (minor)
- Sidebar: condicional duplicat eliminat del listener `apiKey` (minor)
- Estadístiques: guardia per a dates invàlides; format `toLocaleString` per als tokens (minor)
- Estadístiques: funcions d'agrupació setmanal/mensual (`getMondayOfWeek`, `filterHistoryByPeriod`) (minor)

### Rendiment
- Streaming: text pla durant l'streaming, renderització completa de Markdown en finalitzar (minor)
- Caché: dues lectures seqüencials de `saveUsageStats` combinades en una sola `storage.get` (minor)
- Models: `favoriteModels` llegit a la inicialització, evitant una crida extra a `storage.sync` (minor)

### Canviat
- `defuddle` afegit com a dependència npm de vendor (fixat a `^0.14.0`) (minor)
- El bundle de la sidebar inclou `history.js` (minor)

---

## [2.1.0] - 2026-03-04

### Afegit
- **Sistema de models favorits**: fixa els models de Gemini preferits al capdamunt de la llista
- Script de comprovació pre-release (`scripts/pre-release-check.mjs`) amb auditoria automatitzada (minor)
- Bundle de la sidebar per a Chromium amb esbuild (`scripts/build-sidebar-bundle.mjs`) (minor)
- CI/CD: fluxos de treball de GitHub Actions per a lint, tests i release (minor)
- ESLint integrat a tot el projecte; executor de tests natiu de Node.js (56 tests, 0 errors) (minor)
- `CURATED_MODELS` unificat a `shared/models.js` com a font de veritat única (minor)
- Estat biònic gestionat via classe CSS (sense estils inline) (minor)
- Icones pregenerides a `img/`; `set_dev_mode.ps1` millorat (minor)
- `shared/defaults.js` extret per als valors de prompt per defecte (minor)

### Corregit
- `getCuratedModelInfo` corregit per a variants de model (minor)
- Compatibilitat de build per a Linux (GitHub Actions `ubuntu-latest`) (minor)

### Canviat
- `settings.js` dividit en 8 submòduls temàtics (minor)
- Creació de ZIP en Node.js pur (eliminada la dependència de Python) (minor)
- Estratègia de manifest: `manifest.base.json` + fitxers de patch per objectiu (minor)
- Procediment de release simplificat amb `npm run prerelease` (minor)

---

## [2.0.0] - 2026-02-26

### Afegit
- **Suport per a Chromium (Chrome, Edge, Brave)** amb `side_panel` de Manifest V3
- Build dual-objectiu: ZIPs separats per a Firefox i Chromium (minor)
- Empaquetat ZIP compatible amb AMO (separadors de ruta amb barra endavant) (minor)
- `ext.js`: capa d'abstracció cross-browser unificada (Firefox `browser.*` / Chromium `chrome.*`) (minor)
- Bundle esbuild per al service worker en segon pla (requisit de Chromium per a mòduls ES) (minor)

### Canviat
- Extensió portada de Firefox-only a MV3 cross-browser complet (minor)

---

## [1.2.1] - 2026-02-26

### Corregit
- Correccions menors i millores d'estabilitat abans de la reescriptura 2.0 (minor)

---

## [1.1.7] - 2026-02-25

### Afegit
- Plugin de Validació Científica

---

## [1.1.5] - 2026-02-23

### Corregit
- Correccions de permisos i metadades del manifest (minor)
- Llegendes dels camps de plantilla afegides a les opcions (minor)

---

## [1.1.4] - 2026-02-13

### Corregit
- Correccions de la integració amb Obsidian (minor)
- `utils.js` refactoritzat (minor)
- Lectura biònica millorada amb fixació configurable i algorisme basat en regles (minor)
- Nous temes: Sépia i Gris Suau (minor)

---

## [1.1.2] - 2026-02-13

### Afegit
- Exportació al vault d'Obsidian: llançament silenciós (sense diàleg de confirmació) (minor)

### Canviat
- Neteja de la UI de la sidebar (minor)

---

## [1.0.3] - Versió inicial

### Afegit
- Resumització de pàgines web usant l'API de Google Gemini (streaming SSE)
- Sidebar de Firefox (Manifest V3 `sidebar_action`)
- Mode de lectura biònica
- Múltiples temes (sistema, clar, fosc)
- Estadístiques d'ús (tokens diaris i quota)
- Integració d'exportació a Obsidian
- Sistema de plugins (activar/desactivar/reordenar)

---

## Guia per a col·laboradors

- Actualitza la versió a `package.json` en fer un bump de release
- Afegeix una secció `## [X.Y.Z] - YYYY-MM-DD` a aquest fitxer
- Usa `git tag vX.Y.Z` per als releases a `main`
- Segueix els [Conventional Commits](https://www.conventionalcommits.org/)

Format de commit: `type(scope): description`
- `feat:` nova funcionalitat
- `fix:` correcció d'error
- `security:` millora de seguretat
- `docs:` documentació
- `chore:` manteniment, dependències
- `test:` millores de tests
- `perf:` millores de rendiment
