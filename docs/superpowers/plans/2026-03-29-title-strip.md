# Title Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afegir una franja sticky sota la toolbar que mostra el títol de la pàgina resumida com a link, visible durant la càrrega i el resum.

**Architecture:** Element DOM estàtic `#page-title-strip` afegit a sidebar.html. sidebar.js exposa `showPageTitleStrip(title, url)` i `hidePageTitleStrip()`, i passa `onPageIdentified` al ctx perquè summary.js el cridi en conèixer títol+URL. history.js manipula directament l'element com ja fa amb els altres elements del DOM.

**Tech Stack:** HTML/CSS/JS vanilla — sense dependències noves. Tests: Node.js built-in `node:test`.

---

### Task 1: HTML i CSS — estructura de la franja

**Files:**
- Modify: `sidebar/sidebar.html:192` (inserir `#page-title-strip` entre `.toolbar` i `#history-back-bar`)
- Modify: `sidebar/sidebar.css` (afegir estils al final de la secció de layout)

- [ ] **Step 1: Afegir l'element HTML a sidebar.html**

Busca la línia que conté `<div id="history-back-bar"` i insereix just **abans**:

```html
      <div id="page-title-strip" class="hidden">
        <a id="page-title-link" href="#" target="_blank" rel="noopener noreferrer"></a>
      </div>
```

El bloc `#history-back-bar` existent queda just a sota.

- [ ] **Step 2: Afegir estils CSS a sidebar.css**

Busca el comentari `#history-back-bar {` i insereix just **abans**:

```css
#page-title-strip {
  padding: 5px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-color);
  position: sticky;
  top: 0;
  z-index: 10;
}

#page-title-link {
  display: block;
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: none;
}

#page-title-link:hover {
  text-decoration: underline;
}

```

- [ ] **Step 3: Verificar visualment**

Obre `sidebar.html` al navegador (o recarrega l'extensió en mode dev) i comprova que l'element existeix al DOM però és invisible (`hidden`). DevTools → Elements → cerca `page-title-strip`.

- [ ] **Step 4: Commit**

```bash
git add sidebar/sidebar.html sidebar/sidebar.css
git commit -m "feat(title-strip): afegir #page-title-strip al HTML i CSS"
```

---

### Task 2: Funcions JS i ctx — sidebar.js

**Files:**
- Modify: `sidebar/sidebar.js` (afegir funcions + ctx.onPageIdentified)

- [ ] **Step 1: Escriure el test de comportament DOM**

Obre `tests/ui.test.mjs` (o crea'l si no existeix; comprova primer amb `ls tests/`).

Afegeix al fitxer de tests existent (o crea un nou `tests/sidebar-title-strip.test.mjs`):

```js
// tests/sidebar-title-strip.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

function setupDOM() {
    const dom = new JSDOM(`<!DOCTYPE html>
    <body>
      <div id="page-title-strip" class="hidden">
        <a id="page-title-link" href="#" target="_blank"></a>
      </div>
    </body>`);
    return dom.window.document;
}

function showPageTitleStrip(title, url) {
    const strip = document.getElementById("page-title-strip");
    const link  = document.getElementById("page-title-link");
    if (!strip || !link) return;
    link.textContent = title || url;
    link.href = url || "#";
    strip.classList.remove("hidden");
}

function hidePageTitleStrip() {
    const strip = document.getElementById("page-title-strip");
    if (strip) strip.classList.add("hidden");
}

test("showPageTitleStrip mostra la franja amb títol i URL", () => {
    const doc = setupDOM();
    global.document = doc;
    showPageTitleStrip("Títol de prova", "https://example.com/pagina");
    const strip = doc.getElementById("page-title-strip");
    const link  = doc.getElementById("page-title-link");
    assert.ok(!strip.classList.contains("hidden"));
    assert.equal(link.textContent, "Títol de prova");
    assert.equal(link.href, "https://example.com/pagina");
});

test("showPageTitleStrip fa servir la URL com a fallback si no hi ha títol", () => {
    const doc = setupDOM();
    global.document = doc;
    showPageTitleStrip("", "https://example.com/pagina");
    const link = doc.getElementById("page-title-link");
    assert.equal(link.textContent, "https://example.com/pagina");
});

test("hidePageTitleStrip oculta la franja", () => {
    const doc = setupDOM();
    global.document = doc;
    showPageTitleStrip("Títol", "https://example.com");
    hidePageTitleStrip();
    const strip = doc.getElementById("page-title-strip");
    assert.ok(strip.classList.contains("hidden"));
});
```

- [ ] **Step 2: Executar els tests per verificar que fallen**

```bash
node --test tests/sidebar-title-strip.test.mjs
```

Expected: FAIL — les funcions no estan a sidebar.js encara (els tests les defineixen inline, han de passar igualment). Si passen, avança.

- [ ] **Step 3: Afegir `showPageTitleStrip` i `hidePageTitleStrip` a sidebar.js**

A `sidebar.js`, just **després** de la línia `let globalConfigCache = {};` (línia ~20), afegeix:

```js
    function showPageTitleStrip(title, url) {
        const strip = document.getElementById("page-title-strip");
        const link  = document.getElementById("page-title-link");
        if (!strip || !link) return;
        link.textContent = title || url;
        link.href = url || "#";
        strip.classList.remove("hidden");
    }

    function hidePageTitleStrip() {
        const strip = document.getElementById("page-title-strip");
        if (strip) strip.classList.add("hidden");
    }
```

- [ ] **Step 4: Afegir `onPageIdentified` al ctx**

Busca el bloc `const ctx = {` a sidebar.js i afegeix la propietat al final (abans del `}`):

```js
        onPageIdentified: (title, url) => showPageTitleStrip(title, url),
```

El ctx queda:
```js
    const ctx = {
        contentDiv,
        errorDiv,
        modelSelect,
        currentMetadata,
        getSourceText: () => currentSourceText,
        setSourceText: (t) => { currentSourceText = t; },
        getContentPreload: () => contentPreload,
        isBionicEnabled: () => isBionicEnabled,
        getGlobalConfig: () => globalConfigCache,
        onPageIdentified: (title, url) => showPageTitleStrip(title, url),
    };
```

- [ ] **Step 5: Executar tots els tests**

```bash
npm test
```

Expected: 101 pass, 0 fail (els nous tests del fitxer `sidebar-title-strip.test.mjs` també han de passar).

- [ ] **Step 6: Commit**

```bash
git add sidebar/sidebar.js tests/sidebar-title-strip.test.mjs
git commit -m "feat(title-strip): showPageTitleStrip / hidePageTitleStrip + ctx.onPageIdentified"
```

---

### Task 3: Cridar `ctx.onPageIdentified` des de summary.js

**Files:**
- Modify: `sidebar/summary.js` — dos punts: path de cache (línia ~115) i path normal (línia ~195)

- [ ] **Step 1: Path de cache (resum servit de memòria cau)**

Busca el bloc on es fa `currentMetadata.fromCache = true;` (~línia 115). Just **després** afegeix:

```js
                if (ctx.onPageIdentified) {
                    ctx.onPageIdentified(currentMetadata.title, currentMetadata.url);
                }
```

El bloc queda:
```js
                currentMetadata.title = cachedEntry.title || tabs[0].title;
                currentMetadata.url = currentUrl;
                currentMetadata.summary = cachedEntry.summary;
                currentMetadata.fromCache = true;

                if (ctx.onPageIdentified) {
                    ctx.onPageIdentified(currentMetadata.title, currentMetadata.url);
                }

                contentDiv.replaceChildren(formatTextToFragment(cachedEntry.summary));
```

- [ ] **Step 2: Path normal (generació nova)**

Busca el bloc on es fa `currentMetadata.fromCache = false;` (~línia 197). Just **després** afegeix:

```js
        if (ctx.onPageIdentified) {
            ctx.onPageIdentified(currentMetadata.title, currentMetadata.url);
        }
```

El bloc queda:
```js
        currentMetadata.title = pageData.title;
        currentMetadata.url = overrideText ? "seleccio:" + pageData.url : pageData.url;
        currentMetadata.summary = "";
        currentMetadata.fromCache = false;

        if (ctx.onPageIdentified) {
            ctx.onPageIdentified(currentMetadata.title, currentMetadata.url);
        }

        let pageText = pageData.text;
```

- [ ] **Step 3: Executar tots els tests**

```bash
npm test
```

Expected: tots els tests passen. Si summary.js té tests, comprova que segueixen passant.

- [ ] **Step 4: Commit**

```bash
git add sidebar/summary.js
git commit -m "feat(title-strip): cridar onPageIdentified des de summary.js (cache + generació)"
```

---

### Task 4: history.js — amagar en obertura, actualitzar en càrrega d'entrada

**Files:**
- Modify: `sidebar/history.js` — `openHistoryPanel` i `loadHistoryEntry`

- [ ] **Step 1: Amagar la franja en `openHistoryPanel`**

A `openHistoryPanel`, just **després** de la línia `if (backBar) backBar.classList.add("hidden");` (que ja existeix), afegeix:

```js
    // Amaga la franja de títol quan s'obre l'historial
    const titleStrip = document.getElementById("page-title-strip");
    if (titleStrip) titleStrip.classList.add("hidden");
```

- [ ] **Step 2: Actualitzar la franja en `loadHistoryEntry`**

A `loadHistoryEntry`, just **després** de la línia `if (backBar) backBar.classList.remove("hidden");` (al final de la funció), afegeix:

```js
    // Actualitza la franja de títol amb les dades de l'entrada d'historial
    const titleStrip = document.getElementById("page-title-strip");
    const titleLink  = document.getElementById("page-title-link");
    if (titleStrip && titleLink) {
        titleLink.textContent = entry.title || entry.url || "";
        titleLink.href = entry.url || "#";
        titleStrip.classList.remove("hidden");
    }
```

- [ ] **Step 3: Executar tots els tests**

```bash
npm test
```

Expected: 101+ pass, 0 fail.

- [ ] **Step 4: Commit final**

```bash
git add sidebar/history.js
git commit -m "feat(title-strip): amagar en historial, actualitzar en loadHistoryEntry"
```

---

### Task 5: Verificació manual i neteja

- [ ] **Step 1: Recarregar l'extensió en mode dev**

Assegura't que estàs en mode dev:
```bash
npm run dev
```
Recarrega l'extensió a `about:debugging` (Firefox) o `chrome://extensions` (Chromium).

- [ ] **Step 2: Provar els escenaris**

Comprova manualment:
1. **Generació nova**: obre una pàgina, clica resumir → la franja apareix immediatament amb el títol mentre es carrega, es manté quan el resum és visible.
2. **Cache**: navega a una pàgina ja resumida, clica resumir → la franja apareix.
3. **Scroll sticky**: genera un resum llarg, fes scroll avall → la franja queda ancorada a dalt.
4. **Historial**: obre el panell d'historial → la franja desapareix. Clica una entrada → la franja apareix amb el títol de l'entrada. Clica "← Tornar a l'historial" → la franja desapareix.
5. **Nou resum**: amb una franja visible, genera un nou resum → el títol s'actualitza.

- [ ] **Step 3: Verificar que `.gitignore` inclou `.superpowers/`**

```bash
grep ".superpowers" .gitignore || echo "FALTA afegir .superpowers/ al .gitignore"
```

Si falta:
```bash
echo ".superpowers/" >> .gitignore
git add .gitignore
git commit -m "chore: afegir .superpowers/ al .gitignore"
```

- [ ] **Step 4: Executar npm test final**

```bash
npm test
```

Expected: tots els tests passen.
