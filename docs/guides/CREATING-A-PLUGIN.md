# Com crear un plugin (tipus de contingut)

Aquesta guia documenta el procés complet per afegir un nou plugin a l'extensió "Resumir", incloent la configuració a la UI de settings, la integració a la sidebar i el sistema de cache multientry.

## Visió general

Un plugin a Resumir és un **tipus de contingut** que:

- Té un **toggle** a la pestanya "Plugins" de configuració per activar-lo/desactivar-lo
- Té un **botó** a la sidebar (si està activat)
- Té una **pestanya de configuració** pròpia amb un prompt editable i botons "Desar" / "Restaurar"
- Utilitza el **sistema de cache multientry** (clau `summary_cache:{url}:{type}`) per emmagatzemar resultats
- Es renderitza amb **`formatTextToFragment`** per defecte, o pot tenir un **renderitzador propi** (com `conceptmap.js` amb `renderMarkmapInteractive`)

## Fitxers a modificar (ordre recomanat)

| # | Fitxer | Què afegir |
|---|--------|-----------|
| 1 | `shared/defaults.js` | Constant del prompt per defecte |
| 2 | `shared/content-types.js` | Entrada a `CONTENT_TYPES` |
| 3 | `options/settings.html` | (a) Extension item a `#tab-extensions`; (b) Tab pane `#tab-{id}` |
| 4 | `options/settings.js` | Claus a `ALL_CONFIG_KEYS`, bindings de botons, toggle listener |
| 5 | `options/settings-options.js` | Camps al `saveOptions()`, `restoreOptions()`, funció reset |
| 6 | `sidebar/sidebar.html` | Botó a la sidebar |
| 7 | `sidebar/sidebar.js` | Click handler del botó |
| 8 | `sidebar/summary.js` | Paràmetre `is{Plugin}`, prompt branching, contentType tag |
| 9 | `sidebar/ui.js` | `applyExtensionVisibility()`, `extensionIdToButtonId` |
| 10 | `sidebar/cache.js` | Normalment no cal tocar-lo (ja itera `CONTENT_TYPES`) |

## Patró visual (settings.html)

### A) Extension item a `#tab-extensions`

Cada plugin apareix com un element dins `.extensions-list`. Patró:

```html
<div class="extension-item">
  <div class="extension-icon icon-{color}">
    <!-- SVG de 24x24 -->
  </div>
  <div class="extension-info">
    <div class="extension-name">{Nom del plugin}</div>
    <div class="extension-desc">{Descripció breu}</div>
  </div>
  <div class="extension-actions" data-extension-id="{id}">
    <button class="btn-icon btn-move-up" title="Moure amunt">
      <svg><!-- icona fletxa amunt --></svg>
    </button>
    <button class="btn-icon btn-move-down" title="Moure avall">
      <svg><!-- icona fletxa avall --></svg>
    </button>
    <label class="switch">
      <input type="checkbox" id="enable{Plugin}" />
      <span class="slider round"></span>
    </label>
    <button class="btn-icon" data-target="{id}" title="Configuració">
      <svg><!-- icona engranatge --></svg>
    </button>
  </div>
</div>
```

Colors disponibles per `.extension-icon`: `icon-blue`, `icon-green`, `icon-orange`, `icon-purple`, `icon-gray`.

### B) Tab pane de configuració

Cada plugin té una pestanya amb ID `#tab-{id}`. Patró:

```html
<div id="tab-{id}" class="tab-pane">
  <h1 class="page-title">Configuració de {Nom}</h1>
  <div class="section">
    <div class="form-group">
      <label for="{id}Prompt">Prompt de {Nom}</label>
      <textarea id="{id}Prompt" class="form-control" rows="20"
        placeholder="Descripció del rol..."></textarea>
      <div class="help-text">
        Instruccions que s'enviaran al model per generar {funció}.
      </div>
    </div>
    <div class="section-actions">
      <button id="save{Plugin}" class="btn btn-primary">Desar</button>
      <button id="reset{Plugin}" class="btn btn-secondary">Restaurar</button>
    </div>
  </div>
</div>
```

## Patró de codi (settings.js)

```js
// ALL_CONFIG_KEYS (llegeix tots els settings en un sol batch)
const ALL_CONFIG_KEYS = [
    // ... claus existents ...
    "enable{Plugin}", "{id}Prompt",
    // ...
];

// Bind save button
bindClick("save{Plugin}", saveOptions);

// Bind reset button
bindClick("reset{Plugin}", reset{Plugin}Prompt);

// Extension toggle → update sidebar
const extensionToggles = [
    // ... existents ...
    "enable{Plugin}",
];
```

## Patró de codi (settings-options.js)

```js
// saveOptions()
enable{Plugin}: document.querySelector("#enable{Plugin}").checked,
{id}Prompt: document.querySelector("#{id}Prompt").value,

// restoreOptions()
document.querySelector("#enable{Plugin}").checked = syncData && syncData.enable{Plugin} === true;
document.querySelector("#{id}Prompt").value =
  (syncData && syncData.{id}Prompt !== undefined)
    ? syncData.{id}Prompt
    : DEFAULT_{PLUGIN}_PROMPT;

// Reset function
function reset{Plugin}Prompt() {
    document.querySelector("#{id}Prompt").value = DEFAULT_{PLUGIN}_PROMPT;
    showStatus("Prompt de {Nom} restaurat al valor per defecte.");
}
```

## Botó a la sidebar (sidebar.html)

```html
<button id="{id}Btn" class="feature-btn" title="{Nom}">
  <!-- SVG icona 20x20 -->
  <span class="btn-label">{Nom}</span>
</button>
```

## Sidebar wiring (sidebar.js)

```js
// Referència al botó
const {id}Btn = document.getElementById("{id}Btn");

// Click handler
if ({id}Btn) {
    {id}Btn.addEventListener("click", () => {
        doSummary(null, false, false, true, false, false, true /* is{Plugin}=true */);
    });
}
```

Nota: `doSummary` té paràmetres posicionals: `(overrideText, isDeepDive, isRefresh, isUserInitiated, isConceptMap, ...)`. Quan s'afegeixi un nou flag, cal afegir-lo al final de la signatura tant a `doSummary()` com a `startSummary()`.

## Prompt branching (summary.js)

```js
// Signatura
async function startSummary(ctx, overrideText = null,
    isDeepDive = false, isScience = false,
    isUserInitiated = false, isConceptMap = false, is{Plugin} = false)

// System prompt
let systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
if (isDeepDive) {
    systemPrompt = config.deepDivePrompt || DEFAULT_DEEP_DIVE_PROMPT;
} else if (is{Plugin}) {
    systemPrompt = config.{id}Prompt || DEFAULT_{PLUGIN}_PROMPT;
}

// Content type tag (per cache i stats)
const contentType = isConceptMap ? "conceptmap"
    : is{Plugin} ? "{id}"
    : isScience ? "science"
    : isDeepDive ? "deepdive"
    : "summary";
```

## Renderització

- Si el plugin utilitza el renderitzador per defecte (`formatTextToFragment`), no cal cap fitxer addicional.
- Si necessita un renderitzador propi (com el mapa conceptual amb `renderMarkmapInteractive`), crea un fitxer a `sidebar/{id}.js` i afegeix-lo al bundle a `scripts/build-sidebar-bundle.mjs`.

## Sidebar visibility (ui.js)

```js
function applyExtensionVisibility(config) {
    // ... existents ...
    const {id}BtnEl = document.getElementById("{id}Btn");
    if ({id}BtnEl) {
        {id}BtnEl.style.display = config.enable{Plugin} === true ? "flex" : "none";
    }
}

// Extension order mapping
const extensionIdToButtonId = {
    // ... existents ...
    "{id}": "{id}Btn",
};
```
