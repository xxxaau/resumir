# Lliçons tècniques (registre per sessió)

Registre històric — **no es reescriu ni es retalla**, només s'hi afegeix una
entrada nova al capdamunt per sessió. Consulta aquest índex abans d'afegir-hi
res, per no duplicar una lliçó ja capturada. Es referencia per nom des
d'altres docs (p. ex. `CREAR-PLUGIN.md`).

## Índex

- Revisió del procés de release (passos, capçalera del CHANGELOG, §8 superada) — Sessió 2026-10-20
- Lletra responsiva de la barra lateral i captures/animació del web — Sessió 2026-10-15
- YouTube SPA, timedtext, la targeta de Firefox, la lectura biònica i la prova a Firefox real — Sessió 2026-10-14
- Fases B–E del pla UI/UX, revisió de prompts i prova de fum en navegador real — Sessió 2026-10-12
- Fase A del pla UI/UX + harness d'integració i tests de qualitat — Sessió 2026-10-11
- Auditoria funcional + catàleg de models — Sessió 2026-08-09
- Release v2.6.2 — Sessió 2026-07-27
- Release v2.6.1 — Sessió 2026-06-29
- Release v2.5.0 — Sessió 2026-06-12 (tarda)
- Cross-browser: side panel i detecció de navegador — Sessió 2026-06-12
- Auditoria pre-producció — Sessió 2026-06-10 (v2.4.0)
- Canvis — Sessió 2026-06-10 (plugins: Explica-ho fàcil + PDF ordenable)
- Canvis — Sessió 2026-06-09 (pre-producció)
- Fix — Sessió 2026-06-10: la "bombolla" dels botons del mapa
- Aprenentatges — Sessió v2.3.1+ (2026-06-05)
- Aprenentatges — Sessió v2.2.10 (2026-05-22)

---

# Revisió del procés de release — Sessió 2026-10-20

## La capçalera del CHANGELOG mal escrita falla en silenci
`changelog-lib.mjs` exigeix `## [X.Y.Z] - AAAA-MM-DD` (guionet ASCII, data ISO). Amb un guió
llarg (–) o sense data, la secció es tracta com «Sense publicar» i se salta: la versió nova no surt
a «Sobre l'extensió» i ni `npm test` ni `prerelease` (que només mira `includes("## [X.Y.Z]")`) ho
detecten. A més, cal passar `npm version X.Y.Z` explícit (no `patch`/`minor`): el tag el crea
`npm version`, així que el risc no és que el tag no coincideixi, sinó que la capçalera i l'argument
divergeixin.

## §8 de la sessió anterior queda superada
El «Workflow recomanat» (§8, més avall) té `npm run prod` duplicat i parla d'un pre-push hook i
d'un stash del mode DEV: ja no apliquen (els fitxers versionats són sempre PROD). El procés vigent
és `docs/RELEASE-PROCESS.md`; els passos: capçalera CHANGELOG → `update-changelog-html.mjs` →
`npm run check` + `npm audit --omit=dev` → commit de preparació → `npm version X.Y.Z -m
"chore: release v%s"` → build + prerelease + vendor:verify → verificar tag → push main + tag →
AMO manual.

## Pendent de confirmar
AMO: el bundle de la barra lateral va minificat; potser cal adjuntar el codi font a **cada**
pujada, no només a la primera (`RELEASE-PROCESS.md` §5.3 només ho diu del primer upload).

---

# Lletra responsiva de la barra lateral i captures/animació del web — Sessió 2026-10-15

## Un límit en `ch` amb lletra fixa no s'adapta en ampliar el panell

`#content > p, ul…` tenia `max-width: 72ch` (llegibilitat) amb la lletra a 15px
fixos: en una barra lateral ampla la columna s'aturava a ~600px i quedava un
buit. Solució: la base de lletra escala amb l'amplada del panell
(`--content-base-size: clamp(15px, calc(15px + (100vw - 500px) / 100), 20px)`);
com que el límit és en `ch`, la columna creix amb la lletra i no s'allarga la
línia. A la barra lateral `100vw` és l'amplada del panell, no cal cap *container query*.

## No llegeixis en px una variable CSS que conté `clamp()`

`applyBionicStyles` feia `parseFloat(getComputedStyle(el).getPropertyValue("--content-base-size"))`
i ho fixava en px inline. Amb `clamp()` el valor d'una propietat personalitzada
no es resol (surt el text `clamp(...)`), `parseFloat` dona `NaN` i cau al
fallback; i encara que funcionés, el px quedaria congelat en redimensionar.
Ara s'usa `calc(var(--content-base-size) * factor)`, que segueix l'amplada.

## Les captures del web: la barra d'eines necessita ≥ ~500px o es parteix en dues files

Els 11 botons de la barra necessiten ~480px; amb un panell de ~420px (com les
captures antigues) baixen de línia (`flex-wrap: wrap`). Captura la barra lateral
a 500px i **comprova-ho per codi**: tots els `.toolbar button` visibles han de
tenir el mateix `top` (el script falla si no). Afecta `hero.webp`, `mapa.webp` i `og.jpg`.

## Com es regeneren les captures (el generador antic es va esborrar)

`scripts/take-screenshots.mjs` es va treure (cap ús) i les captures actuals no
tenien generador. Ara hi ha `npm run web:captures` (mapa.webp + og.jpg) i
`npm run web:hero` (hero.webp animat; necessita `ffmpeg` amb `libwebp_anim`, o la
variable `FFMPEG`), sobre `scripts/web-captures-lib.mjs`. Recepta que hi ha al darrere:

- `npm ci`, `npm run dev:chromium` i `npx playwright install chromium` (Chrome
  estable ignora `--load-extension`; cal el Chromium de Playwright).
- Com a `smoke-e2e.mjs`: context persistent amb l'extensió, Gemini simulat amb
  `ctx.route`, article servit a un domini fals (`https://quadern.example/…`) i la
  barra lateral oberta com a pestanya amb `chrome.tabs.query` pedaçat. Cal activar
  tots els plugins a `chrome.storage.sync` (`enableSimple`, `enableDeepdive`,
  `enableScience`, `enableConceptMap`, `enablePdf`, `enableAnki`, `enableObsidian`,
  `enableMarkdown`, `enableBionic`) i `theme: "solarized"` (fons crema).
- `page.screenshot()` **ignora** `Emulation.setDeviceMetricsOverride`: per a un
  DPR concret fes servir `cdp.send("Page.captureScreenshot")`.
- Composició en un `<canvas>` del mateix Chromium damunt la finestra antiga
  amb `globalCompositeOperation = "source-atop"` (respecta les cantonades
  arrodonides); sortida WebP/JPEG amb `canvas.toDataURL`.
- Amaga la barra de desplaçament (`scrollbar-width: none`) o surt a `og.jpg`.
- Mapa conceptual: «Desplegar / plegar tot» → «Ajustar a la vista» → «Reduir»
  (si no, els controls tapen nodes). El cronòmetre del peu surt a 0.0s si la
  resposta simulada és instantània: afegeix ~400ms de retard.
- Animació del hero: fotogrames amb `Page.captureScreenshot` (JPEG) de l'article
  i de la barra lateral, cursor dibuixat al canvas, i `ffmpeg` amb `concat` +
  `libwebp_anim` (`-fps_mode vfr -loop 3`). Per clicar un enllaç que es parteix en
  dues línies, clica el centre de l'**última** `getClientRects()`; el centre del
  `boundingBox` cau al forat entre línies i el clic no fa res.
- El bucle és finit (3 voltes) perquè s'aturi al darrer fotograma (accessibilitat);
  pesa ~1,5 MB, força més que l'estàtic (~200 KB) i el hero és la imatge principal.

---

# YouTube SPA, timedtext, la targeta de Firefox, la lectura biònica i la prova a Firefox real — Sessió 2026-10-14

## A YouTube, els globals `ytInitial*` poden ser del vídeo anterior

YouTube navega sense recarregar (SPA): després de clicar un altre vídeo,
`window.ytInitialPlayerResponse` i `ytInitialData` continuen sent els de la
**primera** càrrega, i es resumia el vídeo equivocat sense cap error. La font
fiable és `document.querySelector('#movie_player').getPlayerResponse()`
(API privada, sempre del vídeo actual); els globals només s'accepten si el seu
`videoId` coincideix amb el `?v=` de la URL (`readYoutubeCaptionMeta` a
`sidebar/extractors.js`). El mateix filtre per vídeo s'aplica a les URL de
timedtext.

## `performance.getEntriesByType()` no veu la petició de timedtext

YouTube buida el buffer de Resource Timing (`clearResourceTimings`) cada pocs
segons, així que la URL de subtítols que ha demanat el reproductor ja no hi és.
Un `PerformanceObserver` amb `{ type: 'resource', buffered: true }` rep les
entrades que queden i les noves en viu. Si CC ja estava actiu no es genera cap
petició nova: cal apagar-lo i tornar-lo a encendre per forçar-la
(`sidebar/content.js`). Vegeu també `MANTENIMENT.md`.

## Firefox: el quadre de la barra és opac i la targeta té el color del tema

A Firefox el contingut de la barra lateral és un quadre **opac**: unes
cantonades arrodonides fetes amb `border-radius` mostren el color del llenç, no
el de la targeta del navegador. Per fer-les invisibles, l'`html` es pinta amb el
color de la targeta (`--ff-card`), que es llegeix amb
`browser.theme.getCurrent(windowId).colors.sidebar` (sense cap permís) i es
torna a llegir a `theme.onUpdated` i quan canvia `prefers-color-scheme`.
`getCurrent` només dona la variant **clara** del tema: amb el sistema fosc i un
tema clar no ens en fiem i es cau a `Canvas` (`firefoxCardColor` a
`sidebar/utils.js`).

- **Propagació del fons:** si l'`html` no té fons, el del `body` es propaga al
  llenç i pinta també les cantonades. Per això el fons de la targeta va a
  l'`html`, i el desplaçament passa del document al `body` (`height: 100%`,
  `overflow-y: auto`) perquè les cantonades no marxin en fer scroll.
- **Només Firefox sense JS de detecció:** `@supports (-moz-appearance: none)`
  aplica el bloc només a Gecko; a Chromium no hi ha targeta.
- **Només macOS (correcció posterior, v2.7.1):** la targeta arrodonida és de
  macOS; a Windows/Linux la barra de Firefox és quadrada i el bloc deixava la
  cantonada mal pintada. Ara `theme.js` posa `data-os` (`mac`/`win`/`other`) a
  l'`<html>` i el CSS ho exigeix (`html[data-os="mac"]`); el CSS no pot
  detectar l'SO, així que cal un atribut.

## Els enllaços sobre el text han de funcionar a través de nodes (lectura biònica)

La lectura biònica parteix cada paraula en `<b>…</b>`: una cita `«…»` o una
marca `[1:05]` queda repartida en molts nodes de text, i qualsevol codi que
faci `nodeValue.match(…)` node a node no la troba. Va passar a les cites, a
les marques `[m:ss]` de YouTube i a les `(p. N)` dels PDF, i només es veia amb
la biònica activada (que l'usuari tenia, a les captures). Solució:
`linkTextMatches` (`sidebar/ui.js`) treballa sobre el text sencer del
contenidor, localitza l'inici i el final i fa `range.extractContents()` dins
d'un `<a>`; `linkQuotes` fa el mateix per element. A més, en activar o
desactivar la biònica el resum es torna a pintar i es perden tots els
enllaços: `relinkContent()` (`sidebar/sidebar.js`) els refà. Qualsevol
enllaçat nou ha de provar-se amb la biònica activada i en alternar-la.

## Provar l'extensió en un Firefox REAL (sense Playwright)

Playwright no carrega extensions a Firefox. Funciona WebDriver BiDi amb el
Firefox instal·lat: `firefox --headless --profile <perfil> --remote-debugging-port=9230
-remote-allow-system-access --no-remote`; al perfil, `user.js` amb
`xpinstall.signatures.required=false` i, per fixar l'UUID de les pàgines
`moz-extension://`, `extensions.webextensions.uuids`. Des d'un client
WebSocket: `session.new`, `webExtension.install {type:"path"}` amb la carpeta
dev (`build_firefox_dev/`). BiDi **no pot navegar** a `moz-extension://`: es
afegeix a una còpia de la carpeta un `probe-open.js` al `background.scripts`
que fa `browser.tabs.create({url: browser.runtime.getURL("sidebar/sidebar.html")})`,
i amb `-remote-allow-system-access` es pot fer `script.evaluate` dins la
pàgina de l'extensió (substituir `fetch` per un Gemini simulat, prémer botons,
llegir el DOM i el `CSS.highlights` de la pàgina). Va servir per descartar que
fallés l'API (permisos, `executeScript`, CSS Highlight) i trobar el bug real.
Els scripts eren a la carpeta temporal de la sessió; si es reutilitza, convé
convertir-ho en un `scripts/smoke-firefox.mjs`.

## Un camp de contrasenya fa saltar el gestor de contrasenyes

La clau d'API era un `<input type="password">` i Firefox oferia desar-la com a
contrasenya en sortir de la configuració. `autocomplete="off"` s'ignora per al
desat de contrasenyes. Solució: `type="text"` amb `-webkit-text-security: disc`
(Firefox i Chromium el suporten; comprovat a Firefox 158), més `data-lpignore`,
`data-1p-ignore`, `data-bwignore` i `data-form-type="other"`; si el navegador
no l'admet (`CSS.supports`) es manté `type="password"` perquè la clau no es
vegi mai (`hardenSecretInput` / `toggleSecretInput`, `shared/api-key.js`).

## El prompt per defecte ometia les cites dels vídeos

El prompt de Resum diu «no en citis de transcripcions (Auto) que semblin mal
transcrites»; amb transcripció automàtica el model deixava la secció «Cites»
buida i l'usuari ho veia com «no em mostra les cites del vídeo». En lloc de
canviar el prompt per defecte (versionat, amb avís de «nova versió» a qui l'ha
editat), `summary.js` afegeix en temps d'execució una instrucció addicional per
a vídeos amb marques de temps: omple «Cites» i comença cada cita amb la marca
`[m:ss]`, que `linkYoutubeTimes` ja converteix en enllaç. Les instruccions
addicionals prevalen sobre l'estructura (ho diu el prompt).

## Cites a Hacker News: el text citat pot ser de l'article, no dels comentaris

El resum d'un fil de HN barreja l'article enllaçat (que es descarrega des del
sidebar) i els comentaris (el DOM). La cita d'un comentari es ressalta a la
pàgina; la de l'article no hi és. Solució: si no es troba, s'obre l'article
amb un fragment de text (`textFragmentUrl`, `sidebar/utils.js`:
`#:~:text=inici,final`, amb `-` escapat com `%2D`) i el navegador la ressalta i
hi va tot sol (comprovat a Firefox 158).

## Procés: el mode DEV no ha de reescriure fitxers versionats

`npm run dev` reescrivia manifests i icones versionats (nom «(DEV)», gecko.id
de dev, icones taronges), cosa que obligava a no commitejar-los, a fer stash
abans de pujar i a descriure un hook pre-push que ni existia. Ara el mode DEV
es genera a `build_firefox_dev/` i `build_chromium_dev/` (ignorades per git) i
els fitxers versionats són sempre PROD. A més: `release.yml` falla si el tag no
coincideix amb la versió; `web-ext lint` revisa el paquet real (versió fixada);
`prerelease` té una llista de fitxers prohibits al ZIP (`.DS_Store`, mapes,
tests…); `ci.yml` comprova que `manifests:gen` no deixa diff; es va esborrar
`prepare-release.mjs` (no funcionava) i la doc ja només descriu la via
`npm version`. Els `.DS_Store` de macOS entraven al ZIP: `build.mjs` els salta.

---

# Fases B–E del pla UI/UX, revisió de prompts i prova de fum en navegador real — Sessió 2026-10-12

## Una prova de fum en un Chromium real troba el que jsdom no veu

`npm run smoke:e2e` (`scripts/smoke-e2e.mjs`) carrega `build_chromium_dev` com a
extensió (`--headless=new` + `launchPersistentContext`), simula Gemini amb
`page.route` i obre la barra lateral com a pàgina normal (sobreescrivint
`chrome.tabs.query` perquè vegi una pestanya d'article). Dues trampes:
- `route.fulfill({contentType: "text/html"})` **sense `charset=utf-8`** fa que la
  pàgina es descodifiqui com a latin1: el text d'origen sortia amb mojibake i la
  verificació de cites donava ⚠ — no era un bug del producte sinó de la prova.
- Playwright pot esperar una versió de Chromium que no és descarregada; el
  script cau al Chromium més nou de `~/Library/Caches/ms-playwright`.

## El preload de la pàgina impedia reutilitzar la memòria cau (bug real)

`startSummary` només consultava la memòria cau si `!pageData`, però la barra
lateral precarrega la pàgina activa en obrir-se: el primer clic **sempre**
regenerava i gastava tokens. El test que ho va destapar buscava una altra cosa
(el títol «Regenerar»): escriure el test pel comportament esperat, no pel cas
que ja funciona.

## `saveOptions` congelava els prompts per defecte

Desava el literal de tots els prompts a `storage.sync`, així que qui havia premut
«Desar» un cop quedava amb el text antic per sempre, o rebia un avís fals de
«personalitzat». Ara un prompt igual al default no es desa i els defaults retirats
es reconeixen per hash (`LEGACY_PROMPT_HASHES`, FNV-1a de `promptHash`): **en
canviar un default, afegeix-hi el hash del text que retires** (no substituir-lo).

## Els prompts tenen ancoratges que el codi cerca

El mapa conceptual es retalla amb tres regex sobre el text del prompt (`Màxim N
nivells…`, `Segon nivell: a-b…`, regla «9. Opcionalment…»). Una d'elles feia anys
que no coincidia (la regla era la 10). S'ha extret `buildConceptMapPrompt` i
`tests/default-prompts.test.mjs` aplica les regex al prompt REAL.

## Procés

- No encadenis `commit && push` darrere d'un `npm test | grep`: un grep que no
  falla (o una suposició d'ordre) va deixar passar dos tests en vermell a `main`.
  Comprova `# fail 0` abans de commitejar.
- Els DOM de prova de `tests/*.test.mjs` no tenen `focus()`: guarda'l amb
  `typeof x.focus === "function"` com fa la resta del codi.
- Els fitxers de tema (`:root` / `[data-actual-theme]`) poden tenir hex; fora
  d'ells, el ratchet de `quality-colors` obliga a usar tokens.

---

# Fase A del pla UI/UX + harness d'integració i tests de qualitat — Sessió 2026-10-11

## `sidebar.js` no es podia provar: un harness jsdom amb `vm.Script` ho resol

`sidebar.js` viu dins un `DOMContentLoaded` i depèn de 15+ globals d'altres
scripts, així que els bugs de la barra lateral (biònica, historial, avís de
prompt) no tenien cap cobertura. `tests/helpers/sidebar-harness.mjs` carrega
`sidebar.html` i els seus scripts reals dins jsdom, en l'ordre del HTML, amb
una API d'extensió simulada. Dos detalls que fan o desfan el harness:

- **Cal `vm.Script(...).runInContext(dom.getInternalVMContext())`, no
  `window.eval`.** Els `const`/`let` de nivell superior d'un `<script>` real
  comparteixen l'àmbit lèxic global; amb `eval` indirecte cada script en té
  un de propi i els altres no hi arriben. Les funcions globals sí que són
  propietats de `window` i es poden substituir (p. ex. `getPageContent`).
- **No despatxis `DOMContentLoaded` a mà si el document encara s'està
  analitzant:** jsdom ja el dispara i `sidebar.js` s'inicialitzava dues
  vegades (listeners duplicats: «Copiar» escrivia al porta-retalls dos cops).
  Va aparèixer com un `2 !== 1` aparentment sense relació.

## Tests de qualitat com a ratchet, no com a llista de desitjos

`quality-contrast`, `quality-html` i `quality-copy` codifiquen l'estat actual
com a llista de fallades conegudes (o màxims de recompte) i exigeixen que
**segueixin existint**: un parell de colors que ja passa fa fallar el test
fins que el treus de la llista, i un recompte que baixa obliga a abaixar el
màxim. Així la deuda només es pot escurçar, i un canvi de CSS que empitjora
el contrast no passa desapercebut. El primer pas va confirmar l'auditoria
manual: de ~40 parells només 2 estaven mal classificats a la llista.

## Verificar «falla sense el fix» també als tests d'integració

Amb `git stash` del fitxer font no n'hi ha prou quan el fix és en un fitxer
amb altres canvis: desactivar el fix amb un `sed` temporal (o canviant el nom
del hook) i comprovar que el test cau, després restaurar. Així es va
descobrir que el test de l'Historial passava pels motius equivocats fins que
es va arreglar el doble init del harness.

## Dos errors de l'auditoria que va caçar la revisió

El contrast del color Crema proposat (`#8a6a00`) tampoc passava AA (4,43:1);
calia `#806000`. I «Regenerar al segon clic de Resumir» no era un bug sinó
una funció volguda. Calcular el contrast i llegir el flux abans de proposar el
fix evita arreglar el que no està trencat.

---

# Auditoria funcional + catàleg de models — Sessió 2026-08-09

## Workflow que ha funcionat bé: 3 agents en paral·lel + contrastar amb els tests existents

Auditoria de tot `sidebar/`, `options/`, `shared/`, `background.js`, `ext.js`
(sense navegador) repartida en 3 agents Explore en paral·lel, cadascun amb
l'encàrrec explícit de llegir el codi sencer del seu bloc **i** els tests
corresponents, buscant discrepàncies entre el que es testeja i el que fa el
codi actual. Ha tret 20+ troballes reals (3 de greus) en una sola passada,
incloent-hi bugs que existien des de feia temps però quedaven emmascarats
entre si (l'abort trencat amagava que, un cop arreglat, calia revisar també
el que passava en avortar a mig bucle de fallback).

## Un grep de "sense ús" no detecta l'ús indirecte via paràmetre reanomenat

En netejar icones sense ús a `shared/icons.js`, `grep -rn "MARKMAP_ICONS\.close"`
no va trobar cap resultat → semblava mort. Però `MARKMAP_ICONS` sencer es
passa com a **argument** a una funció injectada a la pàgina
(`executeScriptSafe({func: fullscreenOverlayFunc, args: [..., MARKMAP_ICONS]})`),
i dins d'aquesta funció el paràmetre es diu `icons` (no `MARKMAP_ICONS`) —
`icons.close` hi és ben viu. **Lliçó:** abans d'eliminar una propietat
"sense ús" d'un objecte que es passa sencer com a argument enlloc (sobretot
via `executeScriptSafe`/`func:`, on el receptor pot reanomenar els paràmetres
lliurement), cal buscar també per l'ús del paràmetre local al punt de
recepció, no només pel nom original de l'objecte. Detectat i revertit just
abans de commitejar-ho.

## Una alarma de severitat "urgent, viu ara mateix" es verifica traçant el codi, no assumint-la

L'advisor va marcar com a regressió activa un `break` al bucle de fallback
que semblava poder deixar caure un resum buit sense avisar, arran del fix de
l'abort. Traçant el codi real (quins `await` hi ha entre cada check de
`signal.aborted`) es va veure que el camí és, de fet, inabastable amb
l'estructura actual (cap `await` entre el check previ al bucle i el primer
`break`; qualsevol abort dins d'una petició ja el capturava el catch
existent). El primer test escrit per "demostrar-ho" passava igual sense el
fix — senyal clar que testejava el camí equivocat. **Lliçó:** una alarma de
severitat alta es contrasta traçant els `await` reals del codi, no assumint-la
pel seu to; i un test que passa amb i sense el fix no és evidència que el fix
sigui correcte — és evidència que cal repensar el test (o el diagnòstic). El
guard defensiu es va mantenir igualment (barat, sense risc), però documentat
com a tal, no com a "fix d'un bug viu".

## Decisions de preferència (ordre, comportament per defecte) es pregunten, no es decideixen dins d'una neteja

Dos "bugs" de l'auditoria (`sortModelsByPriority` posant un model més nou
abans que el per defecte; `ensureFavoriteModels` tornant a afegir sempre el
model per defecte) eren en realitat decisions de disseny documentades al
codi mateix (un comentari deia explícitament "assegura que sempre inclou el
model per defecte"). Es van plantejar com a pregunta explícita a l'usuari
abans de tocar-los, en lloc de "corregir-los" silenciosament dins d'un batch
de neteja.

---

# Release v2.6.2 — Sessió 2026-07-27

## El fetch de l'article de HN calia moure'l al sidebar (CORS als content scripts)

En resumir un fil de HN només s'enviava la discussió, mai el text de l'article
enllaçat. **Causa arrel:** el fetch es feia dins la funció injectada al
content-script (`extractHackerNewsFromDOM`, món isolated); a Chromium/Edge (MV3)
el navegador bloqueja per CORS els `fetch` cross-origin fets des d'un content
script, i el fetch fallava en silenci (`articleText` sempre buit). El test antic
no ho detectava perquè mockejava `fetch` perquè llancés, en lloc de simular una
resposta real.

**Fix:** `extractHackerNewsFromDOM` (a `extractors.js`) passa a ser síncrona i
només llegeix el DOM, retornant `{ title, comments, articleUrl }`. El fetch es
mou a `content.js` → `fetchLinkedArticleText(url)`, executat al context del
**sidebar**, on `host_permissions: <all_urls>` treu la restricció CORS — el
mateix patró ja usat pel fetch de PDF.

**Lliçó:** qualsevol `fetch` de contingut extern injectat via
`executeScriptSafe({func: ...})` hereta les restriccions CORS del content
script, encara que l'extensió tingui `<all_urls>`. El permís només s'aplica de
debò des del context de l'extensió (sidebar/background), no des de la pàgina.

## De pas: bug latent al guard SSRF (màscara de bits incorrecta)

En reescriure el fetch, es va detectar que `isPrivateOrReservedIPInline` (versió
antiga, amb màscares de bits) no detectava mai `192.168.0.0/16` ni
`100.64.0.0/10` — la comparació de bits estava mal construïda i sempre donava
`false` per a aquests rangs. **Fix:** reescrit per comparació directa d'octets
(`a === 192 && b === 168`, etc.), molt més llegible i verificable a cop d'ull.
**Lliçó:** les màscares de bits per a rangs CIDR són fàcils d'encertar en un test
puntual i fallar silenciosament en producció; per a un guard de seguretat,
prioritza la comparació explícita per octets sobre l'aritmètica de bits, encara
que sigui més verbosa.

## `redirect: "manual"` trencava articles legítims (calia validar la URL final)

El primer intent del fix bloquejava tota redirecció (`redirect: "manual"` +
rebuig si `resp.type === "opaqueredirect"`), pensat com a guard SSRF. Però molts
articles legítims redirigeixen (paret de consentiment, geolocalització, `www.`),
i quedaven bloquejats igual que un atac. **Fix:** `redirect: "follow"` +
revalidació del guard SSRF sobre `resp.url` (la destinació final), no només
sobre la URL inicial. **Lliçó:** un guard SSRF no pot assumir que la primera URL
sigui l'única that importa — cal revalidar després de seguir redireccions, o
el guard bloqueja casos legítims sense aportar seguretat real (els salts
intermedis, sense credencials, no filtren res igualment).

## Provar en viu a Edge no és carregar l'extensió al navegador principal

Carregar `build_chromium_dev` a l'Edge habitual de l'usuari **va penjar la
màquina sencera dues vegades** (un cop en carregar-la, un cop en obrir-la via la
icona). La causa NO era el fix: mesurat amb un harness Playwright
(`chromium.launchPersistentContext` amb `channel: "msedge"`) sobre el mateix
build, el side panel carrega en 337 ms, el heap es manté a 3-4 MB, ~700 MB en 12
processos estables, cap reinici del service worker. La causa real era pressió de
memòria de la màquina (15,6 GB totals, 78% en ús ja abans d'obrir Edge, amb
Firefox + Outlook + 2 sessions de Claude Code al damunt): un Edge nou hi entra en
intercanvi a disc i penja tot el sistema, no només el navegador.

**Lliçó:** per validar canvis en viu a Edge, usa un harness Playwright controlat
(límit dur de RAM + mort automàtica del procés) en lloc de carregar l'extensió al
navegador de treball habitual — evita perdre temps de màquina i permet mesurar
amb Navigation Timing des de dins de la pàgina (cronometrar amb `execSync`
síncron des de Node dona xifres falses, perquè bloqueja el propi bucle
d'esdeveniments del harness). Vegeu memòria persistent
`live-browser-testing-harness` i `tests/repro-hn-extract.mjs` com a exemple
reutilitzable.

---

# Release v2.6.1 — Sessió 2026-06-29

## El botó Anki es desactivava i no es reactivava (simetria de `setGeneratingState`)

`setGeneratingState(true, …)` desactiva tots els botons de `allActionBtns`
(inclòs `ankiBtn`) mentre es genera. En acabar (branca `else`) i a `resetUI`, els
botons es reactiven **un per un** — i `ankiBtn` hi faltava als dos llocs. Quedava
penjat en `disabled=true` mentre hi havia un resum a la sidebar.

**Fix:** afegir `ankiBtn.disabled = false` a les dues branques de reactivació.
**Lliçó:** la llista que DESACTIVA (`allActionBtns`) i el codi que REACTIVA han
d'estar sincronitzats; si afegeixes un botó d'acció, toca'l als dos llocs. Test de
regressió a `tests/ui.test.mjs` (es van exportar `setGeneratingState`/`resetUI`).

## La build dev d'Edge era indistingible de la store (no era un bug de build)

«Dev a Edge no agafa l'última versió»: `dev:chromium` SÍ generava codi fresc
(verificat amb `grep` del fix a la carpeta acabada de generar). El problema real
era que `build_chromium_dev` tenia el mateix `name` i `version` que l'extensió de
la store ("Resumir" v2.6.0) → a `edge://extensions` no es podia saber quina
provaves. **Fix:** `dev-chromium.mjs` força `name = "Resumir (DEV)"` al manifest
generat (idempotent; NO toca `manifest.base.json`, el repo queda net).

**Lliçó:** abans de buscar un bug de build, verifica QUÈ estàs carregant; dues
extensions amb el mateix nom a `edge://extensions` són una trampa silenciosa.

## La carpeta dev queda desfasada després d'un bump

`build_chromium_dev` es genera des de `manifest.base.json` en el moment del
`dev:chromium`; un bump posterior no l'actualitza (versió vella a Edge). **Fix:**
`release.mjs` afegeix un pas 5/5 que la regenera en restaurar el mode DEV;
documentat també a RELEASE-PROCESS (POST-RELEASE) per al flux manual
(`npm run dev:chromium`). El flux manual (`npm version` + `npm run build`) NO
passa per `release.mjs` — per això cal el pas manual a la checklist.

---

# Release v2.5.0 — Sessió 2026-06-12 (tarda)

## El hook `postversion` deixa els manifests fora del commit taggejat

`npm version` executa: `preversion` → bump → **`version`** → commit+tag →
`postversion`. El sync de manifests era a `postversion` → quedava *staged però
fora del commit taggejat* → el workflow de release (tags `v*`) compilava amb la
versió antiga i fallava. **Fix:** el sync va al hook `version` (package.json),
que s'executa abans del commit i els fitxers staged hi queden inclosos.
Recuperació: moure el tag (`git tag -fa vX.Y.Z HEAD` + push `--force`) mentre
la release no s'hagi publicat.

**Lliçó general:** un hook que fa `git add` només té efecte si corre ABANS del
commit. I verifica sempre el contingut del commit taggejat
(`git show vX.Y.Z:manifest.json`), no només el working tree.

## Els checks que escanegen el repo han d'excloure artefactes

`pre-release-check.mjs` escanejava `build_chromium_dev/` (carpeta dev nova) i
disparava un fals positiu de `console.log` als vendors copiats. Les exclusions
per prefix (`rel.startsWith("vendor")`) no cobreixen còpies dins d'altres
directoris — exclou els directoris d'artefactes (`build*`) a l'arrel del
recorregut, no per camí relatiu.

---

# Cross-browser: side panel i detecció de navegador — Sessió 2026-06-12

> Proves a Edge: la icona de l'extensió no obria el side panel. Després de
> diverses hipòtesis, la causa arrel era la detecció de navegador a `ext.js`.

## 1. (CRÍTIC) El global `browser` existeix també a Chromium/Edge modern

`ext.js` detectava Firefox amb `const isFirefox = typeof browser !== 'undefined'`.
Però **Chrome ≥ ~140 / Edge també exposen un global `browser`** (verificat: Chrome
148 → `typeof browser === "object"`). Per tant `isFirefox` era `true` a Chromium i
**tot `ext.sidebar` agafava la branca de Firefox**:
- `setPanelBehavior` → no-op → `openPanelOnActionClick` mai es posava a `true`.
- `open()`/`toggle()` → cridaven `sidebarAction` (inexistent a Chromium) → no-op
  silenciós: `open()` "es resol OK" però el panell no apareix; o el clic no fa res
  i no hi ha cap error.

Afectava **tota** l'obertura del sidebar a Chromium (icona, menú contextual
"Resumir", càrrega des de caché), no només el toggle.

**Fix:** detectar Firefox per l'API que de fet cal distingir, no pel namespace:
```js
const isFirefox = typeof browser !== "undefined" &&
                  typeof browser.sidebarAction !== "undefined";
```
`sidebarAction` només existeix a Firefox; Chromium usa `sidePanel`.

**Lliçó:** MAI detectis Firefox amb `typeof browser`. Detecta per una API
exclusiva (`browser.sidebarAction`, `runtime.getBrowserInfo`). Test de regressió a
`tests/ext.test.mjs` ("REGRESSIÓ Chromium amb global `browser` present"): simula el
Chromium REAL amb `global.browser` present però sense `sidebarAction`. Els tests
antics feien `delete global.browser`, que NO reproduïa la condició real i per això
no haurien detectat el bug.

## 2. `openPanelOnActionClick` i `action.onClicked` són mútuament excloents (Chromium)

A Chromium no es poden combinar: amb `openPanelOnActionClick:true`, l'`onClicked`
no es dispara. Estratègia: a **Chromium** el navegador obre/tanca el panell natiu
(`setPanelBehavior({openPanelOnActionClick:true})`, SENSE listener); a **Firefox**
es registra `action.onClicked` → `sidebarAction.toggle()` (gate amb
`typeof ext.runtime.getBrowserInfo === "function"`). Driblar `sidePanel.open()`
manualment des d'`onClicked` és poc fiable a Edge (es resol però no obre).

## 3. El missatge d'error de host permission difereix per navegador

`scripting.executeScript` sense permís: Firefox diu "Missing host permission",
Chromium/Edge diu "Cannot access contents of the page…". `executeScriptSafe`
(`sidebar/content.js`) ara comprova les dues variants per demanar el permís i
reintentar.

## 4. Càrrega en dev i reproducció

- A **Edge/Chrome** cal carregar `build_chromium_dev` (`npm run dev:chromium`), NO
  l'arrel: el `manifest.json` de l'arrel és el de Firefox (sense side_panel ni
  service worker). A **Firefox** sí que es carrega l'arrel.
- `<all_urls>` a Chromium NOMÉS pot anar a `optional_host_permissions`, mai a
  `optional_permissions` (error "Permission '<all_urls>' is unknown").
- Reproducció fiable: Playwright `chromium.launchPersistentContext` +
  `--load-extension=build_chromium_dev` (headful) i llegir
  `chrome.sidePanel.getPanelBehavior()`/`getOptions()` des del service worker.

## 5. Recordatori de testing cross-browser

Les regressions cross-browser només es capturen si els tests simulen les dues
plataformes amb la condició REAL de cada una (incloent el global `browser` present
a Chromium). En tocar `ext.js`/`background.js`, regenerar `background.bundle.js` i
`npm test` (cobreix Firefox i Chromium via mocks).

---

# Auditoria pre-producció — Sessió 2026-06-10 (v2.4.0)

> Auditoria exhaustiva amb 4 revisors paral·lels (seguretat, codi, accessibilitat/UI,
> integritat funcional) abans del release. 2 bloquejants trobats i arreglats (87f7bab).

## Bloquejants trobats

### 1. `onclick` inline = botó mort a pàgines d'extensió MV3

Els 8 botons dels banners d'actualització de prompts usaven `onclick="..."`. La CSP
de MV3 (`script-src 'self'`) **bloqueja tots els handlers inline** a les pàgines
d'extensió — els botons no feien literalment res. El patró venia de la guia inline
de `shared/defaults.js`, que el documentava com a exemple (!): un patró trencat
documentat es replica (el plugin "simple" el va copiar tal qual).

**Lliçó:** a pàgines d'extensió MV3, MAI `onclick`/`onchange` inline; sempre
`addEventListener` (idealment delegat amb `data-attributes`). Les guies també
s'auditen: un mal exemple a la documentació és una fàbrica de bugs.

### 2. Wrapper top-level que ombreja una global = recursió infinita (només en dev!)

`conceptmap.js` declarava `function buildConceptMapFilename() { return
window.buildConceptMapFilename(...) }`. En script clàssic, la declaració top-level
**sobreescriu** `window.buildConceptMapFilename` (assignada abans per
`conceptmap-filename.js`) → es crida a si mateixa → stack overflow. El pervers: al
bundle de producció l'ordre de hoisting feia que **funcionés**; només petava en dev
amb scripts separats.

**Lliçó:** la classe de bugs "divergeix entre dev (scripts separats) i prod
(bundle concatenat)" existeix i és traïdora en les DUES direccions. No declarar
mai funcions top-level amb el mateix nom que una global d'un altre fitxer; si un
fitxer exposa una util a `window`, els consumidors la criden via `window.X`.

## Altres lliçons de l'auditoria

- **El bloc SEGURETAT d'`<UNTRUSTED_CONTENT>` ha d'anar a TOTS els prompts** que
  reben contingut de pàgina. Aprofundiment i Científica embolcallaven el contingut
  amb les etiquetes però el prompt no explicava al model què signifiquen → mitigació
  inoperant. Checklist de prompt nou: bloc SEGURETAT inclòs sempre.
- **Cada botó d'acció nou s'ha d'afegir a `allActionBtns`** (`ui.js`,
  setGeneratingState) i a les reactivacions: si no, queda actiu durant una generació
  i clicar-lo l'atura (fa de "stop" d'un altre botó).
- **L'overlay del MAIN world ha d'exposar el seu `close()`** (`__mmClose`) perquè una
  reobertura pugui desregistrar els listeners de window/document de la instància
  anterior; un simple `.remove()` els deixa penjats per sempre a la pàgina amfitriona.
- **Auditar amb subagents paral·lels per dimensió** (seguretat/codi/a11y/funcional)
  troba coses que una passada única no veu: els 2 bloquejants els van trobar 2
  revisors diferents amb tècniques diferents (lectura CSP vs test empíric amb Node/vm).

## Diferit conscientment (backlog per a properes versions)

**Fet a la sessió 2026-06-10 (post-v2.4.0)** — vegeu CHANGELOG [Sense publicar]:
- ~~Navegació per teclat al mapa + focus trap del fullscreen~~ ✓
- ~~Paleta solarized a AA~~ ✓
- ~~Passada lingüística (infinitiu + castellanismes)~~ ✓ (convenció: **infinitiu**, guia Gencat)
- ~~Versionat per-prompt de les migracions~~ ✓ (`PROMPT_VERSIONS` + funció pura testejada)
- ~~Check d'URL abans d'injectar l'overlay al MAIN world~~ ✓
- ~~Historial navegable amb teclat; `aria-pressed`; `alert()`→errorDiv~~ ✓
- ~~Node 20 deprecat als workflows~~ ✓ (node 22 + action-gh-release v3)

**Residus menors — fets 2026-06-10:**
- ~~`#cache-badge` operable amb teclat~~ ✓ (icones de tipus amb role/tabindex/Enter).
- ~~Feedback d'Obsidian no enganyós~~ ✓ (el ✓ només si la pestanya s'obre bé; abans
  es mostrava sempre, fins i tot amb error). El `confirm` "Obsidian no configurat" era
  codi mort (`vault` sempre té default "Obsidian") — **eliminat el 2026-07-03** (bloc
  `if (!vault)` de `sidebar/sidebar.js`; l'`anki.js` sí manté un check viu perquè
  comprova `!ankiVault && !obsidianVault` abans del default).
- Tractament "vós" als errors: **DESCARTAT a consciència** — l'extensió és personal i
  informal; es manté "tu" (la guia Gencat avala "tu" en contextos informals).

**Pendent:**
- **pdf.js 3.11→4.x** (CVE-2024-4367, doblement mitigat avui: `isEvalSupported:false` + CSP).
  Reservat per a una sessió dedicada: és un canvi de binaris vendoritzats amb canvis
  d'API i cal verificar visor + extracció al navegador real.

---

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

## 7. Pre-release check: 18/18 com a gate

### Estat actual

`scripts/pre-release-check.mjs` executa 18 checks automàtics abans de
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
- **Els checks de qualitat només han de cobrir l'HTML/JS que s'embala.**
  L'auditoria `lang="ca"` falsava-positivava amb els fixtures de
  connectors (`tests/fixtures/connectors/*.html`), que són snapshots de
  webs externes amb el seu `lang` original (en, o cap) i no s'envien als
  usuaris. Va aparèixer amb v2.6.0 (els fixtures es van afegir després de
  v2.5.0). Solució: excloure `tests/` de l'auditoria d'HTML, no tocar els
  fixtures (forçar-hi `lang="ca"` trencaria els tests d'extracció).

---

## 8. Workflow recomanat per a sessions futures

Resum del workflow que va funcionar bé en aquesta sessió:

1. **DEV mode actiu durant tot el desenvolupament** (`npm run dev`).
2. **Bug per commit** — cada bug fix en un commit atòmic amb missatge
   descriptiu. Facilita revert selectiu si cal.
3. **Validació manual abans del bump** — l'usuari prova la build DEV
   manualment als navegadors abans de qualsevol acció de release.
4. **`npm run prod`** per restaurar manifests i icones.
5. **`npm run prod`** per posar manifests i icones en PROD; obrir el
   CHANGELOG (`[Sense publicar]` → `[X.Y.Z] - data`) i commit
   `chore: prepara vX.Y.Z` (arbre net abans del bump).
6. **`npm version minor -m "chore: release v%s"`**. ⚠️ El sync de
   manifests + HTML del changelog va al hook **`version`** (NO
   `postversion`): així els fitxers bumpejats queden DINS del commit
   taggejat. Amb `postversion` quedaven fora del tag i la release
   compilava amb la versió antiga (fallada de v2.5.0). El bump **crea el
   commit i el tag d'una tirada** (no cal `git tag` manual).
7. **`npm run build` + `npm run prerelease`** (18/18 OK) + `npm run
   vendor:verify` + `npx web-ext lint` (rèplica local del que farà la CI).
8. **Push main + tag** (`git push origin main && git push origin vX.Y.Z`).
   El tag dispara `release.yml`, que reconstrueix des de la font i publica
   la GitHub Release amb els ZIPs. ⚠️ Si has tornat a `npm run dev`, el
   pre-push hook bloqueja: stash temporal del mode DEV (vegeu
   `RELEASE-PROCESS.md`).
9. **AMO upload manual** (necessita 2FA del compte) + actualitzar les URLs
   del listing si han canviat.
10. **Actualitzar documentació** post-release (README, docs específics,
    aquest fitxer).

---

## 9. El web propi (`/web`) és un subprojecte: aïllar-lo del tooling de l'extensió

### Estat actual
El web propi (Eleventy) viu a `/web`, dins el mateix repo que l'extensió. El
tooling de l'extensió **escaneja tot el repo des de l'arrel** i no coneix
l'entorn del web:

- `npm run lint` = `eslint . --ext .js,.mjs` → linta TOT, inclòs `/web`.
- `npm run prerelease` (`scripts/pre-release-check.mjs`) recull fitxers des de
  l'arrel (només exclou `node_modules`, `.git`, `build*`).
- `web-ext lint --source-dir .` (a `ci.yml` i `release.yml`) escaneja l'arrel.

### Què va passar (2026-06-26)
En arribar `/web` a `main`, la **CI va quedar vermella**: ESLint petava amb
`no-undef` (`console` a `web/scripts/sync-content.mjs`, `document` a
`web/src/js/zoom.js`) perquè aplicava la config de l'extensió (globals de
navegador via `<script>`) a fitxers de Node/navegador del web.

### Lliçó / com evitar barreres
- **Qualsevol codi nou fora de l'extensió (com `/web`) s'ha d'excloure** del
  lint i del web-ext lint de l'extensió, o donar-li la seva pròpia config.
- Fet: `web/**` als `ignores` d'`eslint.config.mjs` i a `--ignore-files` del
  `web-ext lint` (`ci.yml` + `release.yml`).
- `pre-release-check.mjs` no va petar perquè només mira `.js` (no `.mjs`) i
  `/web` no té `.html` (només `.njk`); si hi afegeixes `.js`/`.html` que no
  s'embalen, revisa que no disparin els checks (console.log, lang="ca", etc.).
- Regla general: el tooling de l'extensió cobreix només l'extensió. El web té
  el seu propi `package.json` i build (vegeu la nota de memòria del web propi).
