# Registre de canvis

Tots els canvis importants d'aquest projecte es documenten en aquest fitxer.

El format està basat en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
i el projecte segueix el [Versionatge Semàntic](https://semver.org/spec/v2.0.0.html).

## [Sense publicar]

### Seguretat
- **Avís important per als usuaris anteriors a v2.2**: Si heu instal·lat l'extensió abans de la versió 2.2, la vostra clau API de Gemini pot haver estat emmagatzemada a `storage.sync` (sincronitzada entre dispositius). A partir de la v2.2, la clau es guarda exclusivament a `storage.local`. Es recomana **rotar la clau API** des de Google AI Studio com a precaució.

---

## [2.2.5] - 2026-05-22

### Afegit
- El nom del fitxer PNG exportat del mapa conceptual ara usa el format `YYYYMMDD_<titular>.png` (titular abreujat a 20 caràcters)

### Canviat
- L'extensió passa a anomenar-se "Resumir" (mode DEV: "Resumir (DEV)")
- Configuració del mapa conceptual: eliminades les opcions de profunditat, branques, expandir tot i mostrar descripcions (ara es controlen des del prompt)
- Lectura biònica: interlineat per defecte canviat a 1.5, gruix de negreta per defecte canviat a 600 (semi-negreta)
- La icona del mapa conceptual a configuració ara coincideix amb el botó de la sidebar

### Eliminat
- Eliminada l'opció d'idiomes preferits de YouTube a configuració (la selecció d'idioma ara és automàtica)

---

## [2.2.4] - 2026-04-27

### Afegit
- Indicador de càrrega animat amb punts durant la generació del resum
- Refactorització de l'extracció de transcripcions de YouTube: extracció MAIN world (Pas 1) + fallback via API (Pas 2)
- Suport per a `prerenderedText` quan `playerCaptionsTracklistRenderer` és buit
- Lectura directa de la transcripció des de `ytInitialData` sense obrir el panell
- Protecció contra injecció de prompts: embolcall `<UNTRUSTED_CONTENT>` al prompt del sistema
- Clau API migrada de `storage.sync` a `storage.local` per millor aïllament de seguretat

### Corregit
- El panell de transcripció de YouTube no s'obria en navegar a un vídeo
- Detecció de la transcripció de YouTube molt més robusta
- Els punts de càrrega ara s'amaguen en rebre el primer chunk d'streaming (sense parpelleig d'estat buit)
- La toolbar es manté visible en visualitzar entrades de l'historial de caché
- La barra de tornada s'amaga en tancar panells per tornar a la vista principal
- Alineació de la barra del botó de tornada amb la toolbar; menú amagat en visualitzar panells

### Canviat
- Disposició reordenada en visualitzar un resum de caché
- La classe CSS `.hidden` ara sempre amaga elements independentment de l'especificitat

---

## [2.2.3] - 2026-04-23

### Afegit
- Millores a l'extracció de transcripcions ASR (autogenerades) de YouTube
- Comptador diari per a estadístiques precises per període
- Límit de l'historial d'estadístiques augmentat de 100 a 1.000 entrades
- Tests de persistència: validen la integritat de les dades entre actualitzacions de versió

### Corregit
- Lectura de transcripcions de YouTube des de `ytInitialData` (suport ASR complet)
- Detecció de la pista activa en l'extracció de transcripcions de YouTube
- Gestor `onInstalled`: evita menús contextuals duplicats en actualitzar
- Fuites de memòria en la caché i els bindings de botons
- Fallback del model API ampliat; missatges d'error de l'API millorats

### Rendiment
- Temps d'inici de la sidebar millorat
- Crides API: afegits timeouts i fiabilitat millorada
- Estadístiques: lectures de `getDailyStats` unificades en una sola crida `storage.get`

### Canviat
- Nom al manifest de producció corregit (ja no inclou l'etiqueta `DEV`)
- Globals d'ESLint corregits; hook de lint pre-commit afegit

---

## [2.2.2] - 2026-04-22

### Afegit
- Les operacions de caché ara usen un índex de resums per a purga i llistat més ràpids
- Embolcall de PowerShell multiplataforma (`build.ps1`) amb comprovació d'existència de l'script
- Changelog injectat automàticament a `settings.html` en fer un bump de versió (script `postversion`)
- Ordres de build i release per a Firefox/Chromium documentades a `BUILD.md`

### Corregit
- Fallback de l'índex de caché: purga i llistat funcionen correctament quan falta l'índex
- Bindings de botons de la pàgina d'opcions corregits
- El manifest de producció de Chromium ja no conté la clau de Chrome incrustada
- Estil biònic extret en un helper dedicat; renderització del resum endurit
- Bindings d'esdeveniments de settings refactoritzats; gestió del pageSize endurit

### Canviat
- El flux de release conserva el mode dev/prod original i escriu fitxers de patch JSON sense BOM
- Directoris de còpia de seguretat del build (`build_*/`) exclosos de git

---

## [2.2.1] - 2026-04-07

### Afegit
- Barra inferior millorada: visualització de l'ús de tokens amb millores d'UX

### Corregit
- Globals d'ESLint per als prompts per defecte corregits
- Ús de stream a `summary.js` corregit

### Canviat
- Settings refactoritzades: valors per defecte i UI simplificats
- Manifests regenerats en mode PROD (el nom ja no conté `DEV`)

---

## [2.2.0] - 2026-04-01

### Afegit
- Panell de text font: visualitza el text pla enviat a la IA per a la resumització
- Extracció de contingut de Twitter/X via la biblioteca Defuddle amb fallback de scraping DOM
- Hacker News: eliminat el límit de comentaris; afegida la càrrega de l'article enllaçat
- Readability.js carregat en el context de la sidebar per a la càrrega d'articles de HN
- Insígnia de caché: insígnia clicable que mostra l'estat de caché a la toolbar
- Estadístiques: selector de període (7d / 30d / 6m / 1a) per a KPIs, gràfic i taula
- Estadístiques: columnes per a tokens d'entrada, tokens de sortida, encerts de caché i ms mitjans
- Comptatge real de tokens des de `usageMetadata` de l'API de Gemini (substitueix les estimacions)
- Historial d'estadístiques: càrrega de resum de caché directament a la sidebar (no només obre l'URL)
- Barra de títol de pàgina: barra adhesiva que mostra el títol de la pàgina actual durant la resumització
- Panell d'historial: llista navegable de resums anteriors a la sidebar
- `listCachedSummaries` per al panell d'historial

### Corregit
- Caché: TTL de 30 dies amb `purgeStaleCacheEntries` per a entrades caducades
- Caché: `clearCache` ara esborra totes les claus `summary_cache:*`, no només les indexades
- Resum: div de contingut visible durant l'streaming (estava amagat fins al final)
- Resum: el fallback de quota respecta els models favorits i evita els models cars
- Models: límit de tokens per model via `contextWindow`; `EUR_RATE` mogut a `shared/models.js`
- Sidebar: condicional duplicat eliminat del listener `apiKey`
- Estadístiques: guardia per a dates invàlides; format `toLocaleString` per als tokens
- Estadístiques: funcions d'agrupació setmanal/mensual (`getMondayOfWeek`, `filterHistoryByPeriod`)

### Rendiment
- Streaming: text pla durant l'streaming, renderització completa de Markdown en finalitzar
- Caché: dues lectures seqüencials de `saveUsageStats` combinades en una sola `storage.get`
- Models: `favoriteModels` llegit a la inicialització, evitant una crida extra a `storage.sync`

### Canviat
- `defuddle` afegit com a dependència npm de vendor (fixat a `^0.14.0`)
- El bundle de la sidebar inclou `history.js`

---

## [2.1.0] - 2026-03-04

### Afegit
- Sistema de models favorits: fixa els models de Gemini preferits al capdamunt de la llista
- Script de comprovació pre-release (`scripts/pre-release-check.mjs`) amb auditoria automatitzada
- Bundle de la sidebar per a Chromium amb esbuild (`scripts/build-sidebar-bundle.mjs`)
- CI/CD: fluxos de treball de GitHub Actions per a lint, tests i release
- ESLint integrat a tot el projecte; executor de tests natiu de Node.js (56 tests, 0 errors)
- `CURATED_MODELS` unificat a `shared/models.js` com a font de veritat única
- Estat biònic gestionat via classe CSS (sense estils inline)
- Icones pregenerides a `img/`; `set_dev_mode.ps1` millorat
- `shared/defaults.js` extret per als valors de prompt per defecte

### Corregit
- `getCuratedModelInfo` corregit per a variants de model
- Compatibilitat de build per a Linux (GitHub Actions `ubuntu-latest`)

### Canviat
- `settings.js` dividit en 8 submòduls temàtics
- Creació de ZIP en Node.js pur (eliminada la dependència de Python)
- Estratègia de manifest: `manifest.base.json` + fitxers de patch per objectiu
- Procediment de release simplificat amb `npm run prerelease`

---

## [2.0.0] - 2026-02-26

### Afegit
- Suport per a Chromium (Chrome, Edge, Brave) amb `side_panel` de Manifest V3
- Build dual-objectiu: ZIPs separats per a Firefox i Chromium
- Empaquetat ZIP compatible amb AMO (separadors de ruta amb barra endavant)
- `ext.js`: capa d'abstracció cross-browser unificada (Firefox `browser.*` / Chromium `chrome.*`)
- Bundle esbuild per al service worker en segon pla (requisit de Chromium per a mòduls ES)

### Canviat
- Extensió portada de Firefox-only a MV3 cross-browser complet

---

## [1.2.1] - 2026-02-26

### Corregit
- Correccions menors i millores d'estabilitat abans de la reescriptura 2.0

---

## [1.1.7] - 2026-02-25

### Afegit
- Plugin de Validació Científica

---

## [1.1.5] - 2026-02-23

### Corregit
- Correccions de permisos i metadades del manifest
- Llegendes dels camps de plantilla afegides a les opcions

---

## [1.1.4] - 2026-02-13

### Corregit
- Correccions de la integració amb Obsidian
- `utils.js` refactoritzat
- Lectura biònica millorada amb fixació configurable i algorisme basat en regles
- Nous temes: Sépia i Gris Suau

---

## [1.1.2] - 2026-02-13

### Afegit
- Exportació al vault d'Obsidian: llançament silenciós (sense diàleg de confirmació)

### Canviat
- Neteja de la UI de la sidebar

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
