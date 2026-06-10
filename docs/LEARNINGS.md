# Canvis — Sessió 2026-06-10 (plugins: Explica-ho fàcil + PDF ordenable)

> Nou plugin de llenguatge planer, conversió del PDF en plugin ordenable, ordre
> per defecte centralitzat, i correcció del bug de visibilitat del botó.

## 1. Nou plugin "Explica-ho fàcil" (`simple`)
- Reescriu el contingut en llenguatge senzill per a algú sense coneixements previs.
- Botó bombeta ambre (`#explainSimpleBtn`, `#f59e0b`), tipus `simple` (💡) a l'historial.
- Render Markdown normal (com Resum), flag `isSimple` a `startSummary`/`doSummary`.
- Prompt editable + banner d'actualització + reset a Settings (`PROMPT_DEFAULTS_VERSION` 2→3).

## 2. PDF com a plugin ordenable
- El botó de PDF (id `selectpdf`, etiqueta "PDF") passa a plugin complet: toggle
  `enablePdf` (core, **actiu per defecte** com `resum`: `!== false`), `extension-item`
  amb moure amunt/avall, entrada al nav lateral i pestanya informativa (sense prompt).

## 3. Ordre per defecte centralitzat — `DEFAULT_EXTENSION_ORDER`
- Nova font de veritat única a `shared/defaults.js`: resum, selectpdf, simple,
  deepdive, science, conceptmap, obsidian, markdown, bionic.
- S'aplica com a fallback (`applyExtensionOrder(order || DEFAULT_EXTENSION_ORDER)`)
  a la sidebar i a opcions → ja no depèn de l'ordre fràgil del DOM HTML.

## 4. Bug: el botó "simple" no sortia a la sidebar (però sí a Settings)

### Causa arrel
`enableSimple` faltava a `CONFIG_KEYS` de `sidebar/sidebar.js` (la llista de claus
que la sidebar llegeix de `storage.sync`). `config.enableSimple` era `undefined` →
`applyExtensionVisibility` amagava el botó. Settings usa `ALL_CONFIG_KEYS` (una llista
diferent i completa), per això allà sí apareixia.

### Lliçó
- **Símptoma → diagnòstic:** "surt a Settings però no a la sidebar" = clau que falta a
  `CONFIG_KEYS`. Hi ha múltiples llistes de claus de config i totes han de contenir la
  nova `enable<Plugin>`. Documentat ara a `docs/CREAR-PLUGIN.md` (pas 4 + Trampes).

---

# Canvis — Sessió 2026-06-09 (pre-producció)

> Auditoria profunda pre-producció + millora del visor de PDF + redisseny del mapa conceptual a l'estil NotebookLM.

## 1. Auditoria de seguretat i codi (pre-release)
- **CSP**: afegits `img-src 'self' data:` i `font-src 'self'` als **patches de producció** (firefox/chromium prod) que no els tenien; **`file:` eliminat** de la CSP de Firefox (dev+prod) — el fetch de `file://` no funcionava ni amb `file:`, i `content.js` ja redirigeix els PDFs locals al botó selector. Afegit check a `pre-release-check.mjs` que verifica `img-src`/`font-src` als manifests generats (regressió permanent).
- **Validació SSRF**: `captionBaseUrl` (YouTube) validat contra llista blanca de dominis a `content.js`.
- **Missatges**: `sender.id === ext.runtime.id` al `runtime.onMessage` de `sidebar.js`.
- **Injecció de prompt**: es neutralitza el delimitador `</UNTRUSTED_CONTENT>` dins del contingut a `summary.js`.

## 2. Codi mort eliminat
- `stats.js`: `getTodayRequestCount`, `getTotalTodayCount` (deprecated), `refreshRemainingOnModelChange` (no-op).
- `ext.js`: `getViews` (0 cridadors).
- Feature de bloqueig per quota abandonada: `startCountdown`, `runCountdownTimer`, `stopCountdownTimer`, `countdownInterval`, branca `blockedUntil` (queda neteja única de la clau heretada).
- `summary.js`: bloc mort `requests-remaining` (id inexistent).
- Globals òrfens a `eslint.config.mjs`.
- `shared/icons.js` afegit a `build-sidebar-bundle.mjs` (`files` + `BUNDLED_SRCS`) — abans funcionava per atzar.

## 3. Lectura biònica — defaults unificats
- Nova font de veritat `DEFAULT_BIONIC` a `shared/defaults.js`: fixació **20%**, font sistema, gruix **600**, mida **1.2em**, interlineat **1.5**. Tots els consumidors (summary/sidebar/history/options) hi apunten → s'acaba la divergència 30/35/700.
- Opcions: slider fixació **5–60%**, gruixos **500/600/700/800**, 5 stacks de font universals (sense detecció de SO).
- Fix race: els estils biònics s'apliquen **abans** de l'streaming (1a obertura ja surt amb la mida correcta) i es passa `bionicFixation` al render final.

## 4. Visor de PDF — text seleccionable
- Afegida **capa de text** de pdf.js (`renderTextLayer` + `--scale-factor` amb mida CSS, no física) sobre el canvas → text seleccionable/copiable. Cancel·lació de la task en re-render. (`pdf-viewer.html`/`.js`).

## 5. Mapa conceptual — estil NotebookLM
- **Controls**: 4 botons circulars (toggle desplegar/plegar-tot, +, −, descarregar) a **baix-dreta**; pantalla completa / tancar a **dalt-dreta**. Botons sense ombra (plans, vora subtil).
- **Colors per PROFUNDITAT** (no branca/fulla): paleta `DEPTH_SOLID`/`DEPTH_GRAD` (0 lavanda · 1 blau · 2 verd · 3+ verd clar) amb degradat vertical subtil.
- **Toggle**: chevron SVG (no caràcter de text), ben centrat.
- **Contacte arestes**: surten de la dreta del cercle toggle (`width+18`).
- **Clic a la pastilla** desplega **un sol nivell** (pan-safe via `didPan`); **autofit en desplegar**.
- **Plegat per defecte**: només nivells **0 i 1** visibles.
- Títol de pantalla completa = text del **primer node**; **animació** d'obertura (fade + scale).
- Tipografia: pes 400, stack de sistema.
- **Prompt**: desenvolupa fins a **4 nivells** (`PROMPT_DEFAULTS_VERSION` → 2).

## ⚠️ Pendents per a la propera sessió
- ~~**"Bombolla" dels botons de la sidebar**~~ **RESOLT (2026-06-10)**: vegeu la secció següent.
- Validació visual general del mapa i del visor a **Chrome i Firefox**.
- Release (prod/tag/push) el tanca en Sergi.

---

# Fix — Sessió 2026-06-10: la "bombolla" dels botons del mapa

## Problema

Els botons de control del mapa conceptual mostraven un requadre arrodonit de color de fons **dins** del botó, al voltant de la icona (la "bombolla"). Diversos intents previs (aplanar el botó, treure el `box-shadow`) no la van eliminar perquè apuntaven al **botó**, no a la icona.

## Causa arrel

El selector descendent `.markmap-container svg` (pensat per al llenç del mapa) també atrapava els **SVG de les icones** dels botons de control, i els aplicava `background: var(--bg-color)`, `border: 1px solid var(--border-color)` i `border-radius: 8px`. El mateix passava amb `.markmap-container svg line` (`stroke-opacity: 0.6`), que esblanqueïa les icones +/−/descarregar.

**Per què va costar dies de detectar:** amb el tema clar, `--bg-color` (#f9f9fb) sobre el botó blanc és pràcticament invisible — semblava arreglat. Amb el tema **solarized** de l'usuari, `--bg-color` és beix (#f2f0e5) i la bombolla es veia clarament.

## Fix

- `sidebar.css`: escopar amb combinador de fill (`.markmap-container > svg`, també les regles de `line`/`.markmap-node`/`.markmap-toggle`) perquè només afectin el llenç del mapa.
- `conceptmap.js` (fullscreen overlay, còpia duplicada): afegit `background:transparent!important;border:none!important;border-radius:0!important` a `.markmap-fs-btn svg` com a defensa contra regles `svg { ... }` de la pàgina amfitriona.

## Lliçons

- **Un selector descendent sobre `svg` dins d'un contenidor amb botons és una trampa:** les icones també són SVG. Escopar sempre el llenç amb `>`.
- **Validar visualment amb TOTS els temes** (light/dark/solarized/soft-gray): un bug de fons pot ser invisible amb un tema i evident amb un altre. Reproduir amb el tema de l'usuari abans de donar res per arreglat.

---

# Aprenentatges — Sessió v2.3.1+ (2026-06-05)

> Unificació del sistema d'icones SVG, correcció del parseig de DOIs, i consistència visual entre vistes.

---

## 1. SVG compartit entre sidebar i fullscreen overlay

### Problema

Els botons de control del mapa conceptual tenien SVG inline duplicat a `conceptmap.js` i al fullscreen overlay (dins `fullscreenOverlayFunc`). Cada canvi d'icona requeria tocar dos llocs.

### Solució

- Crear `shared/icons.js` amb un objecte `MARKMAP_ICONS` que conté només el `path`/`line`/`polyline` dels SVG (sense wrapper `<svg>`).
- La sidebar l'importa com a script global (`<script src="../shared/icons.js">`).
- El fullscreen el rep com a 3r argument de `executeScript` (`args: [text, pageTitle, MARKMAP_ICONS]`).
- Ambdós wrappers (`makeBtn`, `mkBtn`) fan `DOMParser` + `document.importNode` per crear el SVG sense `innerHTML`.

### Lliçons

- **Les icones són strings serialitzables** — encaixen perfectament a `args` de `executeScript`.
- **`parseFromString` + `importNode`** evita `innerHTML` i passa els checks d'AMO (no `eval`/`innerHTML` dinàmic).
- **`stroke-linecap="round"` i `stroke-linejoin="round"`** es posen al wrapper `<svg>`, no a cada icona individual.

### ⚠️ DUPLICACIÓ CRÍTICA DEL RENDERER (llegir abans de tocar el mapa conceptual)

El renderer SVG del mapa conceptual està **DUPLICAT a propòsit** en dos llocs:

1. `sidebar/markmap-native.js` — el renderer de la **sidebar** (s'exposa a `window.markmapNative`).
2. `sidebar/conceptmap.js` → funció `fullscreenOverlayFunc` — una **còpia inline** per a la vista de **pantalla completa**.

**Per què la duplicació:** `fullscreenOverlayFunc` se serialitza a string i s'injecta al **món MAIN** de la pàgina via `executeScript`. En aquell context NO existeix `window.markmapNative` (viu a la sidebar, no a la pàgina), per tant tota la lògica de parseig, layout, fold, colors, clic i pan s'ha de duplicar dins la funció.

**REGLA OBLIGATÒRIA:** qualsevol canvi al comportament o aspecte del mapa (colors branca/fulla, color d'arestes, profunditat de plegat per defecte, handler de clic a la pastilla, llindar de pan/`didPan`, layout, toggle) **s'ha d'aplicar als DOS fitxers alhora**, o les dues vistes divergiran (és el bug que portem arrossegant). Tots dos fitxers porten un comentari d'avís a la capçalera.

**Decisions actuals (han de coincidir als dos llocs):** colors per branca (`#c3d4f5`) / fulla (`#c9f0d9`), arestes `#c7cbe0`; plegat per defecte a profunditat ≥ 3 (mostra 4 nivells); clic a la pastilla desplega **un sol nivell**; controls circulars estil NotebookLM (toggle desplegar/plegar-tot, +, −, descarregar) en columna a **baix-dreta**, i botó de pantalla completa / tancar a **dalt-dreta**.

**Millora futura recomanada:** injectar `markmap-native.js` a la pàgina (`executeScript({files, world:'MAIN'})`) i fer que la pantalla completa reusi `window.markmapNative`, eliminant la duplicació del tot.

---

## 2. Parseig de DOIs amb punts al path

### Problema

El regex `[^\s,;.!?<>"')\]]+` truncava DOIs amb punts al mig (ex. `10.1007/978-981-10-5035-0_12`).

### Solució

Regex de dos passos a `sidebar/ui.js:278`:
```
[^\s<>"')\]]*[^\s<>"')\].,;!?]
```
1. Greedy match de caràcters no-separador (`[^\s<>"')\]]*`)
2. Requereix que el darrer caràcter no sigui puntuació final (`[^\s<>"')\].,;!?]`)

### Lliçó

- **Els DOIs són URLs, no paraules.** Un regex que funciona per paraules no funciona per DOIs.
- **L'ordre dels caràcters al conjunt exclòs importa:** `.,;!?` al final, no al principi.

---

## 3. Botons planers vs botons amb bombolla

### Problema

Els botons de control del mapa conceptual tenien estil "bombolla" (circulars, ombra, fons blanc) mentre els botons de la toolbar de la sidebar eren planers (quadrats, sense ombra, fons transparent). Inconsistència visual.

### Solució (aplicada però pendent de verificació local)

- `.markmap-control-btn`: 32×32, `padding: 4px`, `border-radius: 4px`, `background: transparent`, hover amb `background-color: var(--button-hover)`.
- `.markmap-fs-btn` (fullscreen): mateixos valors amb `!important`, colors hardcoded (`#e0e0e0` per hover, `#100f0f` per text).
- SVG dins botons: 24×24 per coincidir amb els de la toolbar.

### Pendent

- **Verificar per què no s'apliquen en local** (probablement cache del sidebar panel de Firefox — tancar i obrir la sidebar després de recarregar l'extensió).

---

## 4. Accessibilitat en botons del fullscreen

### Problema detectat a code review

El `mkBtn` del fullscreen overlay no posava `aria-label`, mentre que el `makeBtn` de la sidebar sí.

### Fix

`b.setAttribute('aria-label', ttl);` afegit al `mkBtn` del fullscreen, al costat de `b.title`.

### Lliçó

- **Quan es duplica codi entre sidebar i fullscreen, cal revisar accessibilitat als dos llocs.** La sidebar té el context de l'extensió; el fullscreen s'injecta al MAIN world, però els lectors de pantalla hi funcionen igual.

---

## 5. Manteniment de manifests

### Problema detectat a code review

`manifest.base.json`, `manifest.chromium.patch.json` i `manifest.firefox.patch.json` havien perdut el newline final arran d'edicions anteriors.

### Lliçó

- **POSIX newline final** és una convenció que evita difs bruts en futures edicions. Els editors moderns ho fan automàticament, però quan s'usen eines d'edició programàtica cal verificar-ho.
- Els manifests generats (`manifest.json`, `manifest.chromium.json`) deriven dels patches — cal mantenir els patches nets.

---

# Aprenentatges — Sessió v2.2.10 (2026-05-22)

Notes tècniques i decisions de disseny derivades de la sessió que va portar a la
release v2.2.10. Document viu — ampliar quan apareguin patrons reutilitzables.

---

## 1. Mapes conceptuals: del baseline al pill

### Símptoma original (Bug 1 + Bug 2)

- Text invisible o de mal color en tema fosc del sidebar.
- A la vista de pantalla completa, els colors del text quedaven sobreescrits
  per CSS de la pàgina amfitriona (Tailwind reset, design systems...).
- Desencaix entre el `<text>` i els `<line>` (edges) quan les etiquetes eren
  llargues o tenien caràcters amples.

### Diagnòstic

1. **`fill="currentColor"`** als `<text>` sobreescrivia `var(--text-color)`
   del CSS (currentColor té més especificitat com a atribut SVG).
2. **Regles CSS orfes** (`.markmap-container svg text { fill: white !important }`)
   restaven d'una versió anterior amb pills i no s'havien netejat.
3. **Mesura del text per aproximació** (`label.length * 0.55em`) divergia molt
   de la realitat amb fonts proporcionals.
4. **`executeScript` MAIN world** no permet importar mòduls ni accedir al
   scope del sidebar — el codi de l'overlay s'ha de **serialitzar com a string**.

### Solució

- Eliminar `fill="currentColor"` i deixar que CSS apliqui.
- Eliminar regles CSS obsoletes.
- **Redisseny complet** estil pill (NotebookLM):
  - `<rect>` arrodonit com a fons del node.
  - Text negre fix `#1a1a1a` (els pills són pastels clars → contrast garantit
    a tots els temes de l'extensió).
  - Mesura amb `canvas.getContext("2d").measureText(label).width` (singleton
    creat un cop, reutilitzat).
  - `<style>` inline dins el `<svg>` amb `!important` per protegir contra
    reset CSS de la pàgina amfitriona.

### Lliçons

- **L'estilat SVG és complicat**: atributs (`fill="..."`), `currentColor`, CSS
  amb selectors específics, `!important` i el shadow DOM del MAIN world
  interactuen de manera no òbvia. Quan calgui robustesa, **`<style>` inline
  dins el `<svg>` és la millor defensa**.
- **Els pills són menys depenents del tema** que el text "nu": codifiquen
  jerarquia visualment (color per profunditat) i fan irrellevant el tema
  actiu de l'extensió.
- **Canvis grans entre versions deixen CSS orfe**: cada cop que es canvia
  l'estructura DOM/SVG d'un component, cal fer una passada per `sidebar.css`
  i eliminar regles obsoletes (o queden silenciosament aplicades en
  contextos imprevistos).
- **`canvas.measureText` és la manera correcta de mesurar text per a
  layouts** — l'aproximació `len * em` falla amb fonts proporcionals, números,
  signes de puntuació amples (`.` és estret, `M` és ample), i caràcters
  combinats (accents catalans).

---

## 2. Codi serialitzat per `executeScript`

### Problema

L'overlay de pantalla completa del mapa s'executa al MAIN world de la pàgina
amfitriona per evitar conflictes amb el CSP del sidebar. Però `executeScript`
**serialitza la funció com a string** abans d'injectar-la, així que **no pot
referenciar res del scope exterior** (constants, mòduls, `window` del sidebar).

### Solució

Per a constants i lògica pura que s'usen a **tots dos llocs** (sidebar +
overlay), tenim dues estratègies:

1. **Funció pura compartida** (preferit quan és possible): crear un fitxer
   independent (`sidebar/conceptmap-filename.js`) que exposi la funció via
   `window.X` global i `module.exports` per als tests. El sidebar la usa via
   `window.X`. L'overlay **no la pot usar** (s'executa fora del context del
   sidebar) i ha de **duplicar la lògica inline**.

2. **Duplicació inline acceptada**: per al codi que viu dins de
   `executeScript`, duplicar és inevitable. Documentar-ho clarament al codi i
   marcar amb `// ⚠ Mirror of sidebar/X.js — keep in sync`.

### Lliçó

- **`executeScript` és una frontera de procés**, no només de scope. Tracta-la
  com si fos una crida RPC amb arguments serializables.
- Si una funció ha de viure als dos costats, **escriu-la una vegada com a
  funció pura testejable** i accepta la duplicació al MAIN world. La font de
  veritat (i els tests) viuen al sidebar.

---

## 3. Transcripcions YouTube: 3 vies de fallback

### Símptoma (Bug 3)

A v2.2.x les transcripcions YouTube fallaven en vídeos amb subtítols
**auto-generats** (ASR-only). Resposta HTTP 200 amb body buit.

### Diagnòstic

YouTube té múltiples camins per servir subtítols. El primer (`baseUrl`
extret de `ytInitialPlayerResponse`) sovint torna buit per a ASR. Calen
fallbacks.

### Solució: 3 vies en cascada

**Via A** — `baseUrl` directe extret de `ytInitialPlayerResponse`:
```
https://www.youtube.com/api/timedtext?v=...&caps=asr&...
```
Resposta JSON (format `json3`). Funciona per a subtítols **manuals**.

**Via B** — Variants del `timedtext`:
```
?fmt=json3   → JSON estructurat (fallback principal)
?fmt=srv3    → SRV3 XML antic
?fmt=cru     → format brut amb XML
```
S'iteren les variants fins que una torni dades no-buides. Es va afegir un
parser XML per als formats que no són JSON.

**Via C** — `youtubei/v1/get_transcript` (API interna del player):
```
POST https://www.youtube.com/youtubei/v1/get_transcript?key=INNERTUBE_API_KEY
Body: { context: INNERTUBE_CONTEXT, params: "..." }
```
Els valors `INNERTUBE_API_KEY`, `INNERTUBE_CONTEXT` i `params` s'extreuen
del DOM de la pàgina. És el camí més robust però el que canvia més sovint.

### Lliçó

- **Les API internes de plataformes grans (YouTube, Twitter, etc.) tenen
  múltiples camins per servir les mateixes dades**. Els que sembla que
  "haurien de funcionar" sovint tornen buits per certs subtipus de
  contingut. **Sempre tenir fallbacks.**
- Quan respongui HTTP 200 amb body buit, **no fallar silenciosament** —
  considerar-ho un error recuperable i provar la via següent.
- **Documentar quina via va funcionar** als logs (sense PII) per facilitar
  el diagnòstic quan canviï l'API.

---

## 4. Naming de fitxers descarregats

### Decisió

A v2.2.10 vam canviar el format del nom del PNG del mapa conceptual de
`YYYYMMDD_<pageTitle truncat 20>.png` a `YYYYMMDD_word1_word2.png` basat en
el **títol arrel del mapa** (`root.label`), no en el títol de la pestanya.

### Motiu

- El títol de la pestanya és sovint **ambigu** ("YouTube", "Reddit",
  "Article — Title | Site"), no descriu el contingut del mapa.
- El títol arrel del mapa és **generat pel model** i descriu directament el
  contingut conceptual.
- 2 paraules clau són **més útils per a buscar fitxers** que un títol
  truncat arbitràriament.

### Algorisme

1. NFD + strip diacrítics (`història` → `historia`)
2. Lowercase
3. Reemplaça no alfanumèric per espais
4. Filtra stop-words **multilingües** ca/es/en
5. Filtra tokens d'1 caràcter (resol `Web 2.0` → `web` correctament)
6. Trunca cada token a 20 chars (evita filenames absurds)
7. Agafa els 2 primers tokens vàlids
8. Fallback: `YYYYMMDD_mapa.png` si cap token sobreviu

### Lliçó

- **Els noms de fitxer són UX**. Un format consistent i previsible
  (`data_paraula_paraula`) facilita organitzar descàrregues en local.
- **Filtrar stop-words multilingües** és cabdal en una extensió
  multilingüe. Mantenir la llista a un sol lloc i ampliar segons calgui.
- **Tokens d'1 char són soroll** la majoria de vegades (`2`, `0`, `a`),
  però si tenen significat (`22e`) s'haurien de filtrar amb regles
  específiques (la nostra heurística genèrica funciona prou bé).

---

## 5. Mode DEV ↔ PROD sense PowerShell

### Problema

Algunes màquines Windows gestionades tenen `MachinePolicy: Restricted`, que
bloqueja l'execució de scripts PowerShell **fins i tot amb
`-ExecutionPolicy Bypass`**. El script `set_dev_mode.ps1` original fallava.

### Solució

Port complet a Node.js: `scripts/set-mode.mjs`. Els scripts npm `dev` i
`prod` ara hi apunten directament:

```json
"dev": "node scripts/set-mode.mjs dev",
"prod": "node scripts/set-mode.mjs prod"
```

### Lliçó

- **Evitar PowerShell per a scripts d'eines del projecte** quan Node ja és
  una dependència. Node és multiplataforma i no té restriccions de policy.
- **Mantenir l'API CLI compatible** (`set-mode.mjs dev` ↔ `set_dev_mode.ps1 dev`)
  perquè els pre-push hooks, els workflows CI i la documentació no
  necessitin canvis simultanis.

---

## 6. Pre-push hook: validar literals exactes

### Problema

El hook `pre-push` validava `'"Resumir (DEV)"'` però el nom de
l'extensió havia canviat a `"Resumir (DEV)"`. Resultat: el hook **mai
disparava** i no protegia contra push accidental amb mode DEV.

### Lliçó

- **Els hooks que validen literals s'han d'actualitzar quan canvien els
  literals**. Recomanable substituir el match exacte per una regex més
  laxa: `grep -qE '"Resumir[^"]*\(DEV\)"'`.
- **Provar el hook periòdicament** (executar-lo manualment) per detectar
  bugs silenciosos com aquest.

---

## 7. Pre-release check: 17/17 com a gate

### Estat actual

`scripts/pre-release-check.mjs` executa 17 checks automàtics abans de
permetre una release. Inclou:

- Manifests: name, gecko.id, versió sincronitzada, permisos
- AMO: no `eval()`, no `Function()`, no `innerHTML` dinàmic
- Qualitat: no `console.log` en JS de producció
- Seguretat: no secrets, API key per header, no `?key=` a URLs
- Accessibilitat: `lang="ca"` a tots els `<html>`
- Tests: `npm test` (0 fails)
- ZIPs: existeixen i mida < 4 MB
- CHANGELOG té entrada per a la versió actual
- `npm audit` sense vulnerabilitats de producció
- Models: validació de `CURATED_MODELS`
- ZIP: tot `<script src="...">` referenciat existeix al paquet

### Lliçó

- **Tenir un gate automàtic abans de tag/push és essencial** quan es
  publica a stores que tarden dies a revisar (AMO). Els errors caçats
  abans del push estalvien dies de re-submissió.
- El check més útil pràcticament és el **darrer** ("tot `<script src>`
  existeix al paquet") — captura errors de bundling que altrament només
  es detectarien quan un usuari real instal·la l'extensió.

---

## 8. Workflow recomanat per a sessions futures

Resum del workflow que va funcionar bé en aquesta sessió:

1. **DEV mode actiu durant tot el desenvolupament** (`npm run dev`).
2. **Bug per commit** — cada bug fix en un commit atòmic amb missatge
   descriptiu. Facilita revert selectiu si cal.
3. **Validació manual abans del bump** — l'usuari prova la build DEV
   manualment als navegadors abans de qualsevol acció de release.
4. **`npm run prod`** per restaurar manifests i icones.
5. **`npm version patch --no-git-tag-version`** (regenera manifests i HTML
   del changelog via hook `postversion`).
6. **`npm run build` + `npm run prerelease`** (17/17 OK).
7. **Commit del bump versionatge únic** (`chore: bump vX.Y.Z`).
8. **Tag annotated** (`git tag -a vX.Y.Z -m "..."`).
9. **Push main + tag** (el hook hauria de deixar passar perquè ja és PROD).
10. **GitHub Release** amb notes detallades + ZIPs adjunts.
11. **AMO upload manual** (necessita 2FA del compte).
12. **Actualitzar documentació** post-release (README, docs específics,
    aquest fitxer).
