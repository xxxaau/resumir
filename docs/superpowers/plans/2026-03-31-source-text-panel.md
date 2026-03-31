# Source Text Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afegir un botó a la barra inferior del sidebar que mostri el text planer enviat a la IA, permetent inspeccionar transcripcions de YouTube i contingut extret de qualsevol pàgina.

**Architecture:** Nou panell `#source-panel` paral·lel a `#history-panel`. Les funcions `openSourcePanel`/`closeSourcePanel` s'afegeixen a `history.js` (que ja gestiona panells), compartint un nou helper privat `_closePanel`. `sidebar.js` gestiona l'activació del botó via `updateSourceBtn()`, cridada cada cop que `currentSourceText` canvia.

**Tech Stack:** JavaScript vanilla (ES2020), DOM API, CSS custom properties existents.

---

## Fitxers modificats

| Fitxer | Canvi |
|--------|-------|
| `sidebar/sidebar.css` | Agrupar `#source-panel` amb `#history-panel`; nova regla `#source-panel pre` |
| `sidebar/sidebar.html` | Nou botó `#sourceTextBtn` + div `#source-panel` |
| `sidebar/history.js` | Helper `_closePanel`; refactor `closeHistoryPanel`; `openSourcePanel`, `closeSourcePanel` |
| `sidebar/sidebar.js` | Referència `sourceTextBtn`; `updateSourceBtn()`; actualitzar `ctx.setSourceText`; click handler |

---

## Task 1: CSS — panel i text pre-formatat

**Fitxers:**
- Modify: `sidebar/sidebar.css`

- [ ] **Step 1: Modificar el selector `#history-panel` per incloure `#source-panel`**

Localitza la regla `#history-panel` (és la única, al voltant de la línia 472). Substitueix:

```css
#history-panel {
  overflow-y: auto;
  padding: 4px 0;
  max-height: calc(100vh - 100px);
}
```

per:

```css
#history-panel, #source-panel {
  overflow-y: auto;
  padding: 4px 0;
  max-height: calc(100vh - 100px);
}
```

- [ ] **Step 2: Afegir la regla per al text pre-formatat**

Just after the `#history-panel, #source-panel` block, afegeix:

```css
#source-panel pre {
  white-space: pre-wrap;
  font-size: 12px;
  margin: 0;
  padding: 4px 0;
  color: var(--text-color);
  word-break: break-word;
}
```

- [ ] **Step 3: Verificar que els tests segueixen passant**

```bash
npm test
```

Expected: `pass 119` (cap test nou, cap regressió).

- [ ] **Step 4: Commit**

```bash
git add sidebar/sidebar.css
git commit -m "feat(source-panel): CSS per al panell de text planer"
```

---

## Task 2: HTML — botó i div del panell

**Fitxers:**
- Modify: `sidebar/sidebar.html`

- [ ] **Step 1: Afegir el botó `#sourceTextBtn`**

Localitza el `#history-cache-group` al footer:

```html
<span id="history-cache-group" style="display:inline-flex;align-items:center;gap:4px;">
  <span id="cache-badge" ...>⚡</span>
  <button id="historyBtn" ...>🕐</button>
</span>
```

Afegeix el nou botó **entre** el `cache-badge` i el `historyBtn`:

```html
<span id="history-cache-group" style="display:inline-flex;align-items:center;gap:4px;">
  <span id="cache-badge" style="visibility:hidden;" title="Resum en caché">⚡</span>
  <button
    id="sourceTextBtn"
    title="Veure text enviat a resumir"
    aria-label="Veure text enviat a resumir"
    disabled
    style="background:none;border:none;cursor:pointer;padding:0 2px;font-size:1em;color:var(--footer-text);line-height:1"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  </button>
  <button id="historyBtn" ...>🕐</button>
</span>
```

- [ ] **Step 2: Afegir el div `#source-panel`**

Localitza el `#history-panel` dins `#container`:

```html
<div id="history-panel" class="hidden"></div>
```

Afegeix `#source-panel` just a continuació:

```html
<div id="history-panel" class="hidden"></div>
<div id="source-panel" class="hidden"></div>
```

- [ ] **Step 3: Verificar tests**

```bash
npm test
```

Expected: `pass 119`.

- [ ] **Step 4: Commit**

```bash
git add sidebar/sidebar.html
git commit -m "feat(source-panel): botó i div del panell al HTML"
```

---

## Task 3: history.js — `_closePanel`, refactor i noves funcions

**Fitxers:**
- Modify: `sidebar/history.js`

- [ ] **Step 1: Afegir `_closePanel` i refactoritzar `closeHistoryPanel`**

Substitueix la funció `closeHistoryPanel` existent (línies 42-50):

```js
function closeHistoryPanel() {
    const historyPanel = document.getElementById("history-panel");
    historyPanel.classList.add("hidden");
    historyPanel.innerHTML = "";
    if (_previousVisible) {
        _previousVisible.classList.remove("hidden");
        _previousVisible = null;
    }
}
```

per:

```js
function _closePanel(panelEl) {
    panelEl.classList.add("hidden");
    panelEl.innerHTML = "";
    if (_previousVisible) {
        _previousVisible.classList.remove("hidden");
        _previousVisible = null;
    }
}

function closeHistoryPanel() {
    _closePanel(document.getElementById("history-panel"));
}
```

- [ ] **Step 2: Verificar tests (el refactor no ha de trencar res)**

```bash
npm test
```

Expected: `pass 119`.

- [ ] **Step 3: Afegir `openSourcePanel` i `closeSourcePanel`**

Afegeix les dues noves funcions just before la línia `// Export per a entorn Node.js`:

```js
/**
 * Obre el panell de text planer enviat a resumir.
 * @param {string} text - Text planer a mostrar
 */
function openSourcePanel(text) {
    const sourcePanel  = document.getElementById("source-panel");
    const historyPanel = document.getElementById("history-panel");
    const contentDiv   = document.getElementById("content");
    const loadingDiv   = document.getElementById("loading");
    const errorDiv     = document.getElementById("error");
    const backBar      = document.getElementById("history-back-bar");
    const titleStrip   = document.getElementById("page-title-strip");

    // Tancar history panel si estava obert (sense restaurar estat)
    historyPanel.classList.add("hidden");
    historyPanel.innerHTML = "";

    if (backBar)    backBar.classList.add("hidden");
    if (titleStrip) titleStrip.classList.add("hidden");

    // Capturar element visible per a restauració
    _previousVisible = null;
    if (!contentDiv.classList.contains("hidden")) _previousVisible = contentDiv;
    else if (!errorDiv.classList.contains("hidden")) _previousVisible = errorDiv;

    contentDiv.classList.add("hidden");
    loadingDiv.classList.add("hidden");
    errorDiv.classList.add("hidden");

    // Construir panell
    sourcePanel.innerHTML = "";

    const header = document.createElement("div");
    header.className = "history-header";

    const backBtn = document.createElement("button");
    backBtn.className = "history-back-btn";
    backBtn.textContent = "\u2190 Tornar";
    backBtn.addEventListener("click", closeSourcePanel);

    const label = document.createElement("span");
    label.style.cssText = "margin-left:8px;font-size:0.85em;color:var(--text-muted);";
    label.textContent = "Text enviat a resumir";

    header.appendChild(backBtn);
    header.appendChild(label);
    sourcePanel.appendChild(header);

    const pre = document.createElement("pre");
    pre.textContent = text;
    sourcePanel.appendChild(pre);

    sourcePanel.classList.remove("hidden");
}

/**
 * Tanca el panell de text planer i restaura la vista anterior.
 */
function closeSourcePanel() {
    _closePanel(document.getElementById("source-panel"));
}
```

- [ ] **Step 4: Actualitzar `module.exports`**

Localitza la línia final d'exports:

```js
module.exports = { openHistoryPanel, closeHistoryPanel, loadHistoryEntry };
```

Substitueix per:

```js
module.exports = { openHistoryPanel, closeHistoryPanel, loadHistoryEntry, openSourcePanel, closeSourcePanel };
```

- [ ] **Step 5: Verificar tests**

```bash
npm test
```

Expected: `pass 119`.

- [ ] **Step 6: Commit**

```bash
git add sidebar/history.js
git commit -m "feat(source-panel): openSourcePanel i closeSourcePanel a history.js"
```

---

## Task 4: sidebar.js — activació del botó i click handler

**Fitxers:**
- Modify: `sidebar/sidebar.js`

- [ ] **Step 1: Afegir la referència al botó**

Localitza el bloc de referències al principi del `DOMContentLoaded` (línies 3-12, on estan `historyBtn`, `modelSelect`, etc.). Afegeix just after `historyBtn`:

```js
const historyBtn = document.getElementById("historyBtn");
const sourceTextBtn = document.getElementById("sourceTextBtn");
```

- [ ] **Step 2: Afegir `updateSourceBtn` i actualitzar `ctx.setSourceText`**

Localitza la funció `hidePageTitleStrip` (al voltant de línia 31). Afegeix `updateSourceBtn` just after:

```js
function updateSourceBtn() {
    if (sourceTextBtn) sourceTextBtn.disabled = !currentSourceText;
}
```

Localitza la definició de `ctx` (al voltant de línia 37). Substitueix la línia `setSourceText`:

```js
setSourceText: (t) => { currentSourceText = t; },
```

per:

```js
setSourceText: (t) => { currentSourceText = t; updateSourceBtn(); },
```

- [ ] **Step 3: Afegir el click handler**

Localitza el listener del `historyBtn` (al voltant de línia 240):

```js
if (historyBtn) historyBtn.addEventListener("click", openHistoryPanel);
```

Afegeix just after:

```js
if (sourceTextBtn) sourceTextBtn.addEventListener("click", () => {
    if (!currentSourceText) return;
    openSourcePanel(currentSourceText);
});
```

- [ ] **Step 4: Verificar tests**

```bash
npm test
```

Expected: `pass 119`.

- [ ] **Step 5: Commit**

```bash
git add sidebar/sidebar.js
git commit -m "feat(source-panel): activació botó i click handler a sidebar.js"
```

---

## Verificació manual final

Després de tots els commits:

1. Obre l'extensió en mode dev (ja activat)
2. Navega a qualsevol pàgina web i clica "Resumir"
3. Un cop acabat el resum, el botó 📄 de la barra inferior ha d'estar **actiu**
4. Clica el botó 📄 → ha d'aparèixer el panell "Text enviat a resumir" amb el text planer
5. El text ha de mostrar-se en monospace, amb salts de línia preservats
6. Clica "← Tornar" → ha de tornar al resum
7. Navega a YouTube, resumeix un vídeo amb transcripció → verifica que el text mostra la transcripció completa
8. Obre l'historial (🕐), després clica el botó 📄 → l'historial ha de desaparèixer i mostrar el text planer; "← Tornar" torna al resum (no a l'historial)
9. Comprova que el botó 📄 és **desactivat** en obrir un sidebar nou sense resumir res
