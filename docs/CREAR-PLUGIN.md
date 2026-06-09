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

1. Afegir botó a `sidebar/sidebar.html`
2. Registrar ID a `sidebar/ui.js` → `extensionIdToButtonId`
3. Afegir visibilitat a `applyExtensionVisibility()`
4. Afegir a l'array `extensionOrder` per defecte
5. Crear fitxer JS dedicat + `<script>` tag
6. Afegir event listener a `sidebar/sidebar.js`
7. Afegir toggle a `options/settings.html`
8. Afegir claus a `options/settings-options.js`

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
    "obsidian": "obsidianBtn",
    "markdown": "copyBtn",
    "deepdive": "deepDiveBtn",
    "bionic": "bionicBtn",
    "science": "scienceBtn",
    "conceptmap": "conceptMapBtn",
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

### 4. Ordre per defecte

Afegir l'ID d'extensió a l'array `extensionOrder` per defecte. Buscar on es defineix
l'ordre inicial (normalment a `options/settings-order.js` o `shared/defaults.js`)
i afegir `"elmeuplugin"` a la posició desitjada:

```javascript
["resum", "science", "deepdive", "conceptmap", "bionic", "obsidian", "markdown", "elmeuplugin"]
```

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

**Nota:** Per defecte, els plugins nous estan **desactivats** (`=== true` en lloc de `!== false`).

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

## Consideracions addicionals

### Dependències externes

Si el plugin necessita llibreries externes (com d3.js per conceptmap):

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
- Executar `npm test` -- tots 207+ tests han de passar
- Afegir tests propis a `tests/` si el plugin té lògica parsejable

## Fitxers de referència

| Fitxer | Rol |
|---|---|
| `sidebar/sidebar.html` | Botons toolbar + scripts |
| `sidebar/ui.js` | Mapa IDs, visibilitat, ordre |
| `sidebar/sidebar.js` | Event listeners, `doSummary` |
| `sidebar/conceptmap.js` | Exemple complet de plugin |
| `sidebar/sidebar.css` | Estils compartits |
| `sidebar/content.js` | `executeScriptSafe()` |
| `options/settings.html` | Toggles i configuració |
| `options/settings-options.js` | Save/load/reset settings |
| `options/settings-order.js` | Drag & drop ordre |
| `manifest.json` | Permisos, `web_accessible_resources` |
| `eslint.config.mjs` | Globals per funcions exposades |
