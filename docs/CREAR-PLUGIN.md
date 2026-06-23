# Com crear un nou plugin (extensió)

Guia pas a pas per afegir una nova funcionalitat al sistema d'extensions de la sidebar.

## Arquitectura general

L'extensió utilitza un sistema de **feature toggles estàtic**: tots els plugins estan
compilats dins l'extensió i l'usuari els activa/desactiva i reordena des de Settings.
No hi ha descobriment dinàmic de plugins.

Cada plugin consta de:

- Un **botó** a la toolbar de la sidebar
- **Lògica JS** en un o més fitxers
- Un **toggle** a la pàgina de configuració
- **Claus de storage** per persistir l'estat

## Checklist ràpid

> ⚠️ **El pas que sempre s'oblida (pas 4).** La clau `enable<Plugin>` s'ha de
> registrar a **TOTES** les llistes que llegeixen config de `storage.sync`, no
> només a `applyExtensionVisibility`. Si falta a `CONFIG_KEYS` de `sidebar.js`,
> el botó **no apareix a la sidebar** encara que sí surti a Settings. Vegeu el
> pas 4 i la secció "Trampes conegudes".

**Sidebar (toolbar + comportament):**
1. Afegir botó a `sidebar/sidebar.html` (+ `<script>` si té fitxer JS propi) — la seva icona és la **font de veritat** (vegeu «la icona viu a 3 llocs»)
2. Registrar ID a `sidebar/ui.js` → `extensionIdToButtonId`
3. Afegir visibilitat a `applyExtensionVisibility()` (`sidebar/ui.js`)
4. **Registrar la clau `enable<Plugin>` a TOTES les llistes de config** (vegeu sota)
5. Afegir l'ID a `DEFAULT_EXTENSION_ORDER` (`shared/defaults.js`) a la posició desitjada
6. Afegir event listener a `sidebar/sidebar.js`

**Opcions (toggle + ordre + persistència):**
7. Afegir l'`extension-item` (toggle + moure amunt/avall) a `options/settings.html` — **mateixa icona** que la sidebar
8. Afegir l'entrada a l'array `extensions` de `options/settings-sidebar.js` (nav lateral) — **mateixa icona** que la sidebar
9. Registrar `enable<Plugin>` a `ALL_CONFIG_KEYS` i `extensionToggles` (`options/settings.js`)
10. Save/restore de la clau a `options/settings-options.js`

**Si té prompt configurable** (com simple/science/deepdive): seguir també la
guia de 9 passos de prompts a `shared/defaults.js` (constant `DEFAULT_*_PROMPT`,
versió, migració, banner, pestanya de config, reset).

### Pas 4 en detall — les llistes de claus de config

Quan afegeixes `enable<Plugin>`, ha d'aparèixer a **totes** aquestes (si no, el
comportament divergeix entre sidebar i settings):

| Fitxer | Llista | Si falta… |
|---|---|---|
| `sidebar/sidebar.js` | `CONFIG_KEYS` | **el botó no surt a la sidebar** (símptoma del bug "simple") |
| `sidebar/ui.js` | el `storage.sync.get([...])` inline del fallback dins `resetUI` | el botó no surt en el camí de refresc sense config |
| `options/settings.js` | `ALL_CONFIG_KEYS` | el toggle no carrega bé a Settings |
| `options/settings.js` | `extensionToggles` | el canvi del toggle no refresca la sidebar en viu |

### L'altre pas que s'oblida — la icona viu a 3 llocs

> ⚠️ La icona d'un plugin està **duplicada com a SVG inline en tres fitxers**. Si
> en canvies una i no les altres, la icona surt **diferent segons on es miri**
> (bug recurrent: s'havia canviat al toolbar i al tab Plugins però NO a la llista
> "Plugins actius"). El **path SVG ha de ser idèntic** a totes tres.

| Fitxer | Ubicació | On es veu |
|---|---|---|
| `sidebar/sidebar.html` | botó `#<plugin>Btn` del toolbar | barra de la sidebar — **FONT DE VERITAT** |
| `options/settings.html` | `div.extension-icon` de l'`extension-item` (tab Plugins) | badge de la llista de plugins |
| `options/settings-sidebar.js` | camp `icon` de l'objecte a l'array `extensions` | nav lateral "Plugins actius" de Settings |

A més, l'historial usa un **emoji** a part (`shared/content-types.js`, camp `icon`):
NO és l'SVG, és un altre estil/context.

**Regla:** en canviar una icona, fes `grep` del path antic a `sidebar/` i `options/`
per confirmar que no en queda cap còpia abans de tancar.

## Pas a pas detallat

### 1. Botó a `sidebar/sidebar.html`

Afegir un `<button>` dins el bloc `<div id="toolbarButtons">` amb icona SVG:

```html
<button id="elMeuPluginBtn" class="icon-btn" title="El meu plugin" aria-label="El meu plugin">
  <svg viewBox="0 0 24 24" fill="none" class="icon" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="..." />
  </svg>
</button>
```

**Convencions:**

- ID: `nomPluginBtn` (camelCase + Btn)
- Classe: `icon-btn`
- Sempre incloure `title` i `aria-label`
- SVG amb `viewBox="0 0 24 24"`, classe `icon`, `aria-hidden="true"`

**Referència real** (conceptmap, `sidebar/sidebar.html:108`):

```html
<button id="conceptMapBtn" class="icon-btn" title="Mapa conceptual" aria-label="Mapa conceptual">
```

### 2. Registrar ID a `sidebar/ui.js`

Afegir l'entrada al mapa `extensionIdToButtonId` (`sidebar/ui.js:78`):

```javascript
const extensionIdToButtonId = {
    "resum": "summarizeBtn",
    "selectpdf": "selectPdfBtn",
    "obsidian": "obsidianBtn",
    "markdown": "copyBtn",
    "deepdive": "deepDiveBtn",
    "bionic": "bionicBtn",
    "science": "scienceBtn",
    "conceptmap": "conceptMapBtn",
    "simple": "explainSimpleBtn",
    "elmeuplugin": "elMeuPluginBtn",  // ← afegir aquí
};
```

L'ID d'extensió (clau) s'usa internament per l'ordre i la visibilitat.
L'ID del botó (valor) ha de coincidir amb l'`id` de l'HTML.

### 3. Visibilitat a `applyExtensionVisibility()`

Afegir un bloc dins la funció `applyExtensionVisibility(config)` a `sidebar/ui.js:17`:

```javascript
const elMeuPluginBtnEl = document.getElementById("elMeuPluginBtn");
if (elMeuPluginBtnEl) {
    elMeuPluginBtnEl.style.display = config.enableElMeuPlugin ? "flex" : "none";
}
```

**Patró:** `config.enable<NomPlugin>` → `display: "flex"` o `"none"`.

### 4. Claus de config (vegeu el checklist) + 5. Ordre per defecte

**5. Ordre per defecte.** Hi ha **una sola font de veritat**: la constant
`DEFAULT_EXTENSION_ORDER` a `shared/defaults.js`. Afegeix l'ID d'extensió a la
posició desitjada:

```javascript
const DEFAULT_EXTENSION_ORDER = ["resum", "selectpdf", "simple", "deepdive", "science", "conceptmap", "obsidian", "markdown", "bionic"];
```

Aquesta constant s'aplica com a fallback quan l'usuari no té cap ordre desat,
tant a la sidebar (`sidebar/ui.js` i `sidebar/sidebar.js` criden
`applyExtensionOrder(config.extensionOrder || DEFAULT_EXTENSION_ORDER)`) com a la
pàgina d'opcions (`options/settings-options.js` → `restoreOptions`). No cal
reordenar blocs HTML: `applyExtensionOrder` reordena el DOM segons aquest array.

> Els usuaris que ja tenen un `extensionOrder` desat **conserven el seu ordre**;
> els plugins nous que no hi siguin s'afegeixen al final. Per veure el nou ordre
> per defecte, cal restablir l'ordre (moure qualsevol plugin) o esborrar la clau.

### 5. Fitxer JS dedicat

Per lògica complexa, crear un fitxer separat (p.ex. `sidebar/elmeuplugin.js`).

**Estructura recomanada** (basada en `sidebar/conceptmap.js`):

```javascript
/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. */

// sidebar/elmeuplugin.js
// Descripció breu del plugin.

/**
 * Funció principal del plugin.
 * @param {string} text - Text d'entrada
 * @param {Object} options - Configuració opcional
 * @returns {DocumentFragment}
 */
function renderElMeuPlugin(text, options = {}) {
    const fragment = document.createDocumentFragment();
    if (!text || typeof text !== "string") return fragment;
    // ... lògica del plugin ...
    return fragment;
}
```

**Convencions:**

- Funcions globals (no modules, no bundler)
- Retornar `DocumentFragment` per inserir a la sidebar
- Capçalera MPL 2.0

Afegir el `<script>` tag a `sidebar/sidebar.html` **abans** de `sidebar.js`:

```html
<script src="elmeuplugin.js"></script>
<script src="sidebar.js"></script>
```

**Important:** L'ordre de càrrega importa. `sidebar.js` ha de ser l'últim.

Si el plugin exposa funcions globals, afegir-les a `eslint.config.mjs` dins `globals`:

```javascript
globals: {
    renderElMeuPlugin: "readonly",
}
```

### 6. Event listener a `sidebar/sidebar.js`

Connectar el botó amb l'acció. Hi ha dos patrons:

**Patró A** -- Usa `doSummary` (si el plugin processa text de la pàgina via API):

```javascript
const elMeuPluginBtn = document.getElementById("elMeuPluginBtn");
if (elMeuPluginBtn) {
    elMeuPluginBtn.addEventListener("click", () => {
        doSummary(null, false, false, true, false, true); // afegir paràmetre
    });
}
```

**Patró B** -- Acció independent (si no necessita l'API):

```javascript
const elMeuPluginBtn = document.getElementById("elMeuPluginBtn");
if (elMeuPluginBtn) {
    elMeuPluginBtn.addEventListener("click", async () => {
        // Lògica pròpia
    });
}
```

**Referència real** (conceptmap, `sidebar/sidebar.js:263`):

```javascript
conceptMapBtn.addEventListener("click", () => {
    doSummary(null, false, false, true, true);
});
```

### 7. Toggle a `options/settings.html`

Afegir un bloc dins la secció d'extensions amb el toggle switch:

```html
<div class="extension-actions" data-extension-id="elmeuplugin">
  <label class="switch">
    <input type="checkbox" id="enableElMeuPlugin" />
    <span class="slider round"></span>
  </label>
  <span class="sr-only">El meu plugin</span>
</div>
```

Si el plugin té configuració addicional (prompt, estil...), afegir els camps
corresponents dins una secció `<details>` o similar.

### 8. Claus storage a `options/settings-options.js`

**Guardar** (dins l'objecte de `saveOptions`):

```javascript
enableElMeuPlugin: document.querySelector("#enableElMeuPlugin").checked,
```

**Carregar** (dins `restoreOptions`):

```javascript
document.querySelector("#enableElMeuPlugin").checked = data.enableElMeuPlugin === true;
```

**Nota — estat per defecte:**
- Plugins **opcionals** → desactivats per defecte: `data.enableX === true` (cal opt-in).
- Plugins **core** (resum, PDF) → actius per defecte: `data.enableX !== false` i el
  `<input>` HTML porta l'atribut `checked`. La visibilitat a `applyExtensionVisibility`
  ha d'usar la mateixa lògica (`config.enableX !== false`).

Si el plugin té un prompt personalitzat, afegir també:

```javascript
// Guardar
elMeuPluginPrompt: document.querySelector("#elMeuPluginPrompt").value,

// Carregar
if (data.elMeuPluginPrompt !== undefined)
    document.querySelector("#elMeuPluginPrompt").value = data.elMeuPluginPrompt;
else
    document.querySelector("#elMeuPluginPrompt").value = DEFAULT_ELMEUPLUGIN_PROMPT;

// Reset
function resetElMeuPluginPrompt() {
    document.querySelector("#elMeuPluginPrompt").value = DEFAULT_ELMEUPLUGIN_PROMPT;
}
```

## Tipus de contingut, prompt i cache (`content-types.js` + `summary.js`)

Si el plugin és un **mode de resum** (processa el text de la pàgina via l'API, com
science/deepdive/conceptmap), a més del cablejat de la toolbar cal connectar-lo al
pipeline de generació i a la cache:

**1. Registra el tipus a `shared/content-types.js`.** Afegeix una entrada a
`CONTENT_TYPES`. La cache és multientry amb clau `summary_cache:{url}:{type}`, i
`sidebar/cache.js` itera `CONTENT_TYPES`, així que normalment no s'ha de tocar.

**2. Prompt branching i tag de `contentType` a `sidebar/summary.js`.** Afegeix el
flag `is<Plugin>` al final de la signatura de `startSummary()` (i de `doSummary()`),
tria el prompt i etiqueta el `contentType` (s'usa per a la cache i les estadístiques):

```javascript
// signatura (afegir el flag nou AL FINAL)
async function startSummary(ctx, overrideText = null,
    isDeepDive = false, isScience = false,
    isUserInitiated = false, isConceptMap = false, isSimple = false, is<Plugin> = false)

// selecció del prompt
let systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
if (isDeepDive) systemPrompt = config.deepDivePrompt || DEFAULT_DEEP_DIVE_PROMPT;
else if (is<Plugin>) systemPrompt = config.<id>Prompt || DEFAULT_<PLUGIN>_PROMPT;

// tag de contentType (cache + stats)
const contentType = isConceptMap ? "conceptmap"
    : is<Plugin> ? "<id>"
    : isScience ? "science"
    : isDeepDive ? "deepdive"
    : "summary";
```

> Els flags de `doSummary`/`startSummary` són **posicionals**: afegeix el nou
> SEMPRE al final per no desplaçar els existents.

**3. Renderització.** Per defecte el resultat es pinta amb `formatTextToFragment`.
Si el plugin necessita un renderitzador propi (com el mapa conceptual amb
`renderMarkmapInteractive`), crea `sidebar/<id>.js` i afegeix-lo al bundle.

## Consideracions addicionals

### Dependències externes

Si el plugin necessita llibreries externes:

1. Col·locar els fitxers `.js` al **directori arrel** de l'extensió
2. Afegir-los a `sidebar/sidebar.html` com a `<script>` tags
3. Si cal injectar-los a la pàgina web, afegir a `manifest.json`:

```json
"web_accessible_resources": [
    {
        "resources": ["la-meva-lib.js"],
        "matches": ["<all_urls>"]
    }
]
```

### Injecció a la pàgina web

Si el plugin necessita injectar contingut al DOM de la pàgina (com el fullscreen
del conceptmap):

- Usar `executeScriptSafe()` de `sidebar/content.js`
- **Sempre** afegir `world: "MAIN"` per accedir al context de la pàgina
- Retornar **valors serialitzables** (strings, números, booleans) -- mai objectes complexos
- Firefox requereix que el retorn sigui "structured-clonable"

> ⚠️ **Duplicació del renderer del mapa conceptual.** Com que la funció injectada
> al món MAIN (p.ex. `fullscreenOverlayFunc` a `conceptmap.js`) NO pot accedir a
> `window.markmapNative`, el renderer del mapa està **duplicat** entre
> `sidebar/markmap-native.js` (sidebar) i la còpia inline de `conceptmap.js`
> (pantalla completa). **Tot canvi de render/colors/fold/clic s'ha d'aplicar als
> dos llocs** o les vistes divergiran. Vegeu el detall a `docs/LEARNINGS.md`.

```javascript
await executeScriptSafe({
    target: { tabId },
    world: "MAIN",
    func: (data) => {
        // Codi que s'executa a la pàgina
        return 'success';  // ← sempre string simple
    },
    args: [dades]
});
```

### Compatibilitat Firefox / Chromium

- Usar `ext.` (polyfill) en lloc de `browser.` o `chrome.`
- Firefox: `scripting.executeScript` amb `files:` pot fallar amb
  `non-structured-clonable data` -- usar `func:` + `fetch()` + `<script>` tag
- Provar sempre als dos navegadors

### CSS

- Botons toolbar: classe `icon-btn` (hereta estils de `sidebar/sidebar.css`)
- Controls de plugin: classe `markmap-control-btn` per botons circulars estil Material
- Usar variables CSS existents (`--text-color`, `--bg-color`, `--error-color`)
- Assignar un color d'icona propi a `sidebar/sidebar.css` usant l'escala Flexoki (p.ex. `#conceptMapBtn { color: #bc5215; /* Flexoki Orange */ }`).

### Icones

Totes les icones segueixen l'estil **Lucide**: 24×24, stroke-width 2, round caps/joins, `fill="none"`, `stroke="currentColor"`.

Les icones compartides entre múltiples components van a **`shared/icons.js`** (carregat automàticament a la sidebar). Consulta la skill [`creating-icons`](../.opencode/skills/creating-icons/SKILL.md) per la guia completa de:
- Patró `makeBtn()` per botons de control amb SVG
- Com passar icones a funcions serialitzades (fullscreen overlay)
- Diferència entre icones compartides vs inline
- Checklist per afegir una icona nova

### Lint i tests

- Executar `npx eslint sidebar/elmeuplugin.js` abans de cometre
- Afegir globals a `eslint.config.mjs` si cal
- Executar `npm test` -- tots els tests (243) han de passar
- Afegir tests propis a `tests/` si el plugin té lògica parsejable

## Trampes conegudes (casos reals)

### El botó surt a Settings però NO a la sidebar

**Causa:** la clau `enable<Plugin>` no és a `CONFIG_KEYS` de `sidebar/sidebar.js`.
La sidebar llegeix la config amb aquesta llista; si la clau hi falta,
`config.enable<Plugin>` és `undefined` i `applyExtensionVisibility` amaga el botó.
Settings usa una llista diferent (`ALL_CONFIG_KEYS`), per això allà sí surt.

**Fix:** afegir la clau a `CONFIG_KEYS` (i a totes les llistes del pas 4).
Va passar amb el plugin "Explica-ho fàcil" (2026-06-10). Vegeu `docs/LEARNINGS.md`.

### Una regla CSS de SVG pinta "bombolla" a les icones dels botons

Un selector descendent sobre `svg` dins d'un contenidor amb botons (p.ex.
`.markmap-container svg { background: ... }`) també atrapa els SVG de les icones
dels botons de control. Escopa sempre el llenç amb el combinador de fill (`> svg`).
Va passar amb els controls del mapa conceptual. Validar amb **tots els temes**
(light/dark/solarized): un fons espuri pot ser invisible en un tema i evident en
un altre. Vegeu `docs/LEARNINGS.md`.

### `onclick` inline a les pàgines d'extensió = botó mort (CSP MV3)

La CSP de MV3 (`script-src 'self'`) bloqueja **tots** els handlers inline
(`onclick`, `onchange`...) a les pàgines d'extensió, sense error visible (només
una violació CSP a la consola). Sempre `addEventListener` des d'un fitxer JS;
per a grups de botons, binding delegat amb `data-attributes` (vegeu
`bannerResets` a `options/settings.js`). Va passar amb els 8 botons dels banners
de prompts (auditoria 2026-06-10).

### No declaris funcions top-level amb el nom d'una global d'un altre fitxer

En script clàssic, `function foo() { return window.foo(...) }` top-level
**sobreescriu** `window.foo` i es crida a si mateixa (recursió infinita). I el
comportament pot divergir entre dev (scripts separats) i producció (bundle
concatenat, ordre de hoisting diferent): pot funcionar a prod i petar a dev o a
l'inrevés. Si un fitxer exposa una util a `window`, crida-la sempre com a
`window.nomUtil(...)` sense redeclarar-la.

### Checklist extra per a botons d'acció i prompts

- Botó d'acció nou → afegir-lo a `allActionBtns` de `setGeneratingState`
  (`sidebar/ui.js`) i a les reactivacions (else-branch + `resetUI`); si no, queda
  actiu durant una generació i clicar-lo l'atura.
- Prompt nou que rep contingut de pàgina → ha d'incloure SEMPRE el bloc
  «SEGURETAT: ... <UNTRUSTED_CONTENT> ...» (copia'l de `DEFAULT_SYSTEM_PROMPT`).
  Les etiquetes sense l'explicació al prompt no protegeixen de res.

## Fitxers de referència

| Fitxer | Rol |
|---|---|
| `sidebar/sidebar.html` | Botons toolbar + scripts |
| `sidebar/ui.js` | Mapa IDs, visibilitat, aplicació de l'ordre |
| `sidebar/sidebar.js` | Event listeners, `doSummary`, **`CONFIG_KEYS`** |
| `sidebar/conceptmap.js` | Exemple complet de plugin |
| `sidebar/sidebar.css` | Estils compartits + color de cada botó |
| `sidebar/content.js` | `executeScriptSafe()` |
| `shared/defaults.js` | **`DEFAULT_EXTENSION_ORDER`**, prompts per defecte, guia de prompts |
| `options/settings.html` | `extension-item` (toggle) + pestanyes de config |
| `options/settings.js` | `ALL_CONFIG_KEYS`, `extensionToggles`, binds |
| `options/settings-options.js` | Save/load/reset settings |
| `options/settings-sidebar.js` | Array `extensions` del nav lateral + `checkboxId` |
| `options/settings-order.js` | Drag & drop ordre |
| `manifest.json` | Permisos, `web_accessible_resources` |
| `eslint.config.mjs` | Globals per funcions/constants exposades |
