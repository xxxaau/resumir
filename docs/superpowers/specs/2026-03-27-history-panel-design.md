# D4 — Historial navegable des de la sidebar

## Context

L'extensió ja desa fins a 100 entrades d'historial d'ús (`usageHistory`) i fins a 30 dies de caché de resums (`summary_cache:<url>`). Fins ara no hi havia cap manera de tornar a consultar un resum passat des de la sidebar sense recarregar la pàgina original.

## Objectiu

Permetre a l'usuari navegar pels resums passats que es troben a la caché local, directament des de la sidebar, sense cap petició de xarxa addicional.

## Decisions de disseny

| Pregunta | Decisió |
|----------|---------|
| Enfocament UX | Panell d'historial que substitueix l'àrea de contingut (opció A) |
| Entrades visibles | Només les que tenen caché vàlida (timestamp present, dins els 30 dies) |
| Estat del resum carregat | Només lectura; el botó principal segueix actuant sobre la pestanya activa |
| Accés | Botó 🕐 a la barra inferior (`#footer-status`) |

## Arquitectura

### Fitxers afectats

| Fitxer | Canvi |
|--------|-------|
| `sidebar/cache.js` | Nova funció `listCachedSummaries()` |
| `sidebar/history.js` | **Nou mòdul** — renderització i lògica del panell |
| `sidebar/sidebar.html` | Botó `#historyBtn` al footer + div `#history-panel` |
| `sidebar/sidebar.css` | Estils del panell i les seves entrades |
| `sidebar/sidebar.js` | Wiring del botó `historyBtn` |
| `eslint.config.mjs` | Globals nous: `openHistoryPanel`, `closeHistoryPanel`, `listCachedSummaries` |
| `tests/history.test.mjs` | **Nou fitxer** — tests unitaris de `listCachedSummaries` |

### Flux de dades

```
[historyBtn click]
    → openHistoryPanel()
        → listCachedSummaries()          ← cache.js: storage.local.get()
        → renderHistoryPanel(entries)    ← history.js: DOM
        → amaga #content, mostra #history-panel

[clic a entrada]
    → loadHistoryEntry(entry)
        → formatTextToFragment(entry.summary)  ← ui.js (global existent)
        → insereix a #content
        → closeHistoryPanel()

[botó "← Tornar"]
    → closeHistoryPanel()
        → amaga #history-panel
        → restaura #content (estat preservat al DOM)
```

## Especificació per mòdul

### `cache.js` — `listCachedSummaries()`

```js
async function listCachedSummaries() {
    // Retorna array de {url, title, model, timestamp, summary}
    // ordenat per timestamp desc (més recent primer)
    // Descarta: entrades sense timestamp, entrades caducades (>30 dies)
}
```

Usa `storage.local.get(null)` per obtenir tots els keys i filtra els que comencen per `summary_cache:`.

### `history.js` — funcions públiques

- **`openHistoryPanel()`** — crida `listCachedSummaries`, renderitza el panell, amaga `#content`/`#loading`/`#error`, mostra `#history-panel`. Si no hi ha entrades, mostra missatge "Sense historial disponible".
- **`closeHistoryPanel()`** — amaga `#history-panel`, restaura la visibilitat de `#content` (o `#error` si hi havia error previ).
- **`loadHistoryEntry(entry)`** — renderitza `entry.summary` via `formatTextToFragment`, l'insereix a `#content`, fa `closeHistoryPanel()`.

### `sidebar.html` — canvis

```html
<!-- A #footer-status, al principi: -->
<button id="historyBtn" title="Historial" aria-label="Historial">🕐</button>
<span class="separator">|</span>

<!-- A #container, germà de #content: -->
<div id="history-panel" class="hidden"></div>
```

### `sidebar.js` — wiring

```js
document.getElementById("historyBtn")
    .addEventListener("click", openHistoryPanel);
```

## Comportament del panell

Cada entrada mostra:
- Títol (truncat a 50 caràcters si cal, amb `…`)
- Data relativa (ex: "fa 2 h", "ahir", "fa 3 dies")
- Model usat (ex: `gemini-2.0-flash`)

Un botó "← Tornar" al capdamunt del panell tanca sense carregar cap entrada.

Quan es carrega una entrada, el `#content` mostra el resum com si s'hagués generat ara: amb el mateix renderitzat Markdown. No es modifica cap estat de l'aplicació (no s'actualitza `currentMetadata`, no es canvia el model seleccionat).

## Tests

Fitxer: `tests/history.test.mjs`

| Test | Descripció |
|------|------------|
| 1 | `listCachedSummaries` descarta entrades sense timestamp |
| 2 | `listCachedSummaries` descarta entrades caducades (>30 dies) |
| 3 | `listCachedSummaries` retorna les entrades vàlides ordenades per data desc |
| 4 | `listCachedSummaries` retorna array buit si no hi ha caché vàlida |

Els tests de DOM (renderització del panell) no s'inclouen perquè la lògica de `formatTextToFragment` ja està coberta a `tests/ui.test.mjs`.

## Fora d'abast

- Cerca o filtratge de l'historial
- Eliminació individual d'entrades
- Paginació (màxim ~30 entrades donada la TTL de 30 dies)
- Indicador visual a la toolbar quan es visualitza un resum de l'historial
