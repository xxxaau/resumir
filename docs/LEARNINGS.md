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

El hook `pre-push` validava `'"Resumir contingut (DEV)"'` però el nom de
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
