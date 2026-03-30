# Cache Badge + History Load Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a `⚡ En caché` badge in the sidebar toolbar when the current tab's URL has a cached summary, and let users click entries in the settings stats history table to load the cached summary in the sidebar instead of opening the original URL.

**Architecture:** Two independent components sharing `getSummaryCache(url)` from `sidebar/cache.js`. The badge is driven by tab-change listeners in `sidebar/sidebar.js`. The history-load flow uses `storage.local` key `pendingCacheLoad` as a message channel: the settings page writes the key, `background.js` opens the sidebar, `sidebar/sidebar.js` reads the key and calls the existing `loadHistoryEntry()` function.

**Tech Stack:** Vanilla JS, WebExtensions MV3 (`ext.*` wrapper in `ext.js`), `browser.storage.local`, `browser.tabs`.

---

## Mapa de fitxers

| Fitxer | Canvi |
|--------|-------|
| `sidebar/sidebar.html` | Afegir `#cache-badge` span a la toolbar |
| `sidebar/sidebar.css` | Estil per a `#cache-badge` |
| `sidebar/sidebar.js` | `updateCacheBadge()` + tab listeners + `pendingCacheLoad` handler |
| `background.js` | `storage.onChanged` listener per obrir sidebar quan apareix `pendingCacheLoad` |
| `options/settings-stats.js` | `renderHistoryTable`: canviar `<a>` per span clicable amb cache check |

---

## Task 1: Badge HTML + CSS

**Files:**
- Modify: `sidebar/sidebar.html`
- Modify: `sidebar/sidebar.css`

### Background

The toolbar is a `<div class="toolbar">` inside `#container`. The badge must go inside the toolbar, just before `#settingsBtn`, so it appears at the right edge. It uses `margin-left: auto` on `#settingsBtn` to push everything right — the badge needs to sit before that element to appear next to it. Hidden by default via `.hidden` class (already defined in `sidebar.css` as `display: none`).

- [ ] **Step 1.1: Afegir `#cache-badge` a `sidebar/sidebar.html`**

Localitza el botó `#settingsBtn` (aprox. línia 172). Insereix just **abans** d'ell:

```html
        <span id="cache-badge" class="hidden" title="Resum en caché">⚡ En caché</span>
```

El resultat ha de quedar:
```html
        <span id="cache-badge" class="hidden" title="Resum en caché">⚡ En caché</span>
        <button
          id="settingsBtn"
          ...
```

- [ ] **Step 1.2: Afegir estil a `sidebar/sidebar.css`**

Afegeix al **final** del fitxer:

```css
/* ── Cache badge ──────────────────────────────────────────── */
#cache-badge {
  font-size: 11px;
  color: var(--text-muted);
  align-self: center;
  white-space: nowrap;
  margin-right: 4px;
}
```

- [ ] **Step 1.3: Verificar sintaxi HTML**

```bash
node --check sidebar/sidebar.js
```

(No hi ha linter HTML; la revisió és visual. Assegura't que el fitxer HTML sigui vàlid obrint-lo mentalment: cada `<span>` ha de tenir el `</span>` corresponent. La línia afegida és `<span id="cache-badge" class="hidden" title="Resum en caché">⚡ En caché</span>` — és autotancada correctament.)

- [ ] **Step 1.4: Suite de tests**

```bash
npm test
```

Expected: tots els tests passen (cap canvi de lògica).

- [ ] **Step 1.5: Commit**

```bash
git add sidebar/sidebar.html sidebar/sidebar.css
git commit -m "feat(sidebar): afegir badge #cache-badge a la toolbar (HTML+CSS)"
```

---

## Task 2: `updateCacheBadge` + listeners de tab a `sidebar/sidebar.js`

**Files:**
- Modify: `sidebar/sidebar.js`

### Background

`sidebar/sidebar.js` és l'orquestrador. S'executa dins `DOMContentLoaded`. Té accés a `getSummaryCache(url)` (definida a `sidebar/cache.js`, carregada prèviament via `<script>` a `sidebar.html`).

Les APIs de tabs (`ext.tabs.query`, `ext.tabs.onActivated`, `ext.tabs.onUpdated`) funcionen en pàgines de sidebar de Firefox i Chromium.

`ext.tabs.onActivated` dispara quan l'usuari canvia de tab (rep `{ tabId, windowId }`).
`ext.tabs.onUpdated` dispara quan un tab navega (rep `tabId, changeInfo, tab`); `changeInfo.url` només apareix quan la URL canvia.

Cal cridar `updateCacheBadge` en 3 moments:
1. Inicialització (URL del tab actiu actual)
2. Canvi de tab actiu (`tabs.onActivated`)
3. Navegació dins el tab actiu (`tabs.onUpdated` si `changeInfo.url` i `tab.active`)
4. Après de generar un resum (la URL ara és en caché)

- [ ] **Step 2.1: Afegir funció `updateCacheBadge` a `sidebar/sidebar.js`**

Al final del bloc `DOMContentLoaded`, just **abans** del listener de `settingsBtn.addEventListener("click", ...)` (aprox. línia 243), afegeix:

```js
    async function updateCacheBadge(url) {
        const badge = document.getElementById("cache-badge");
        if (!badge || !url) return;
        const cached = await getSummaryCache(url);
        badge.classList.toggle("hidden", !cached);
    }
```

- [ ] **Step 2.2: Afegir listeners de tab just després de `updateCacheBadge`**

Just **després** de la funció `updateCacheBadge` (i abans de `settingsBtn.addEventListener`), afegeix:

```js
    ext.tabs.onActivated.addListener(async (activeInfo) => {
        try {
            const tab = await ext.tabs.get(activeInfo.tabId);
            updateCacheBadge(tab.url);
        } catch (e) {}
    });

    ext.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.url && tab.active) updateCacheBadge(tab.url);
    });
```

- [ ] **Step 2.3: Cridar `updateCacheBadge` a la inicialització**

Localitza el bloc `async IIFE` al final del fitxer (aprox. línia 295):
```js
    (async () => {
        // Purgar caché expirada en segon pla (no bloquejant)
        purgeStaleCacheEntries().catch(() => {});
```

Just **després** de `purgeStaleCacheEntries().catch(() => {});`, afegeix:

```js
        // Inicialitzar badge de caché per a la URL del tab actiu
        ext.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            if (tabs[0]?.url) updateCacheBadge(tabs[0].url);
        }).catch(() => {});
```

- [ ] **Step 2.4: Actualitzar badge després de generar un resum**

Localitza el bloc `doSummary` (aprox. línia 51):
```js
        isGenerating = true;
        startSummary(ctx, overrideText, isDeepDive, isScience, isUserInitiated).then(ctrl => {
            abortController = ctrl;
        }).finally(() => {
            isGenerating = false;
            abortController = null;
        });
```

Substitueix el `.finally` per:
```js
        isGenerating = true;
        startSummary(ctx, overrideText, isDeepDive, isScience, isUserInitiated).then(ctrl => {
            abortController = ctrl;
        }).finally(() => {
            isGenerating = false;
            abortController = null;
            if (currentMetadata.url) updateCacheBadge(currentMetadata.url);
        });
```

- [ ] **Step 2.5: Verificar sintaxi**

```bash
node --check sidebar/sidebar.js
```

Expected: cap output (net).

- [ ] **Step 2.6: Suite de tests**

```bash
npm test
```

Expected: tots els tests passen.

- [ ] **Step 2.7: Commit**

```bash
git add sidebar/sidebar.js
git commit -m "feat(sidebar): badge de caché per a la URL activa del tab"
```

---

## Task 3: Handler de `pendingCacheLoad` a `sidebar/sidebar.js`

**Files:**
- Modify: `sidebar/sidebar.js`

### Background

El patró `pendingCacheLoad` és idèntic al ja existent `pendingSummary` (línies 279-291 de `sidebar.js`):
- A la inicialització: comprovar si la clau ja existeix (sidebar oberta quan s'escriu la clau)
- Al listener `storage.onChanged`: detectar quan la clau apareix (sidebar ja oberta)

`loadHistoryEntry(entry)` és la funció de `sidebar/history.js` (carregada via `<script>`) que renderitza el resum en el `#content` div.

- [ ] **Step 3.1: Afegir check de `pendingCacheLoad` a la inicialització**

Localitza (aprox. línia 279):
```js
    // Check for pending summary on load (context menu while sidebar was closed)
    ext.storage.local.get("pendingSummary").then(data => {
        if (data.pendingSummary) {
            boundTrigger(data.pendingSummary);
            ext.storage.local.remove("pendingSummary");
        }
    });
```

Just **després** d'aquest bloc, afegeix:

```js
    // Check for pending cache load on init (settings page wrote key while sidebar was closed)
    ext.storage.local.get("pendingCacheLoad").then(data => {
        if (data.pendingCacheLoad) {
            const url = data.pendingCacheLoad;
            ext.storage.local.remove("pendingCacheLoad");
            getSummaryCache(url).then(entry => {
                if (entry) loadHistoryEntry(entry);
            });
        }
    });
```

- [ ] **Step 3.2: Afegir handler al listener `storage.onChanged` existent**

Localitza el listener existent (aprox. línia 287):
```js
    // Watch for pendingSummary changes (reliable fallback for Chrome sidePanel timing)
    ext.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.pendingSummary && changes.pendingSummary.newValue) {
            boundTrigger(changes.pendingSummary.newValue);
            ext.storage.local.remove("pendingSummary");
        }
    });
```

Substitueix per:
```js
    // Watch for pendingSummary and pendingCacheLoad (reliable fallback for Chrome sidePanel timing)
    ext.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.pendingSummary && changes.pendingSummary.newValue) {
            boundTrigger(changes.pendingSummary.newValue);
            ext.storage.local.remove("pendingSummary");
        }
        if (area === "local" && changes.pendingCacheLoad?.newValue) {
            const url = changes.pendingCacheLoad.newValue;
            ext.storage.local.remove("pendingCacheLoad");
            getSummaryCache(url).then(entry => {
                if (entry) loadHistoryEntry(entry);
            });
        }
    });
```

- [ ] **Step 3.3: Verificar sintaxi**

```bash
node --check sidebar/sidebar.js
```

Expected: cap output.

- [ ] **Step 3.4: Suite de tests**

```bash
npm test
```

Expected: tots els tests passen.

- [ ] **Step 3.5: Commit**

```bash
git add sidebar/sidebar.js
git commit -m "feat(sidebar): handler pendingCacheLoad per carregar resum des de stats"
```

---

## Task 4: `background.js` obre la sidebar quan apareix `pendingCacheLoad`

**Files:**
- Modify: `background.js`

### Background

`background.js` usa `ext.*` (wrapper cross-browser definit a `ext.js`). El fitxer complet és breu (76 línies): registra menús i gestiona clics d'acció.

`ext.storage.onChanged` és `browser.storage.onChanged` (Firefox) o `chrome.storage.onChanged` (Chromium). El listener rep `(changes, area)`.

`ext.sidebar.open()` sense arguments obre la sidebar per a la finestra activa (patró ja usat al fitxer).

- [ ] **Step 4.1: Afegir listener `storage.onChanged` a `background.js`**

Llegeix el fitxer. Afegeix al **final** del fitxer:

```js
// Obrir la sidebar quan la pàgina de stats demana carregar un resum en caché
ext.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.pendingCacheLoad?.newValue) {
        ext.sidebar.open();
    }
});
```

- [ ] **Step 4.2: Verificar sintaxi**

```bash
node --check background.js
```

Expected: cap output.

- [ ] **Step 4.3: Suite de tests**

```bash
npm test
```

Expected: tots els tests passen.

- [ ] **Step 4.4: Commit**

```bash
git add background.js
git commit -m "feat(background): obrir sidebar en pendingCacheLoad des de stats"
```

---

## Task 5: `renderHistoryTable` — span clicable amb cache check

**Files:**
- Modify: `options/settings-stats.js`

### Background

La funció `renderHistoryTable(history)` (aprox. línia 306) genera files per a l'historial de peticions. Cada fila té dues columnes: data i títol. El títol actualment és un `<a href="entry.url">` que obre la URL original.

Substitució: si `entry.url` existeix, crear un `<span>` estilitzat com a enllaç. Al clic:
1. Comprova si la URL té un resum en caché **vàlid** (dins 30 dies TTL).
   - La settings page NO té accés a `getSummaryCache()` (de `sidebar/cache.js`). Cal replicar la lògica inline: llegir `summary_cache:{url}` de `storage.local` i comprovar TTL.
2. Si en caché: escriu `ext.storage.local.set({ pendingCacheLoad: entry.url })` → el background obre la sidebar.
3. Si NO en caché (entrada d'`usageHistory` antiga o caché expirada): `window.open(entry.url, "_blank")` com a fallback.

Entrades sense `entry.url` es deixen com a text pla (igual que ara).

- [ ] **Step 5.1: Substituir el bloc URL de `renderHistoryTable` a `options/settings-stats.js`**

Llegeix el fitxer. Localitza dins `renderHistoryTable` el bloc:
```js
        if (entry.url) {
            const a = document.createElement("a");
            a.href = entry.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = prefix + (entry.title || "Sense títol");
            tdTitle.appendChild(a);
        } else {
            tdTitle.textContent = prefix + (entry.title || "Sense títol");
        }
```

Substitueix per:
```js
        if (entry.url) {
            const titleSpan = document.createElement("span");
            titleSpan.style.cssText = "cursor:pointer;color:var(--primary-color);text-decoration:underline;";
            titleSpan.textContent = prefix + (entry.title || "Sense títol");
            titleSpan.addEventListener("click", async () => {
                const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
                const cacheKey = `summary_cache:${entry.url}`;
                const data = await ext.storage.local.get(cacheKey);
                const cached = data[cacheKey];
                const isCached = cached && cached.timestamp &&
                    (Date.now() - new Date(cached.timestamp).getTime()) < CACHE_TTL_MS;
                if (isCached) {
                    await ext.storage.local.set({ pendingCacheLoad: entry.url });
                } else {
                    window.open(entry.url, "_blank");
                }
            });
            tdTitle.appendChild(titleSpan);
        } else {
            tdTitle.textContent = prefix + (entry.title || "Sense títol");
        }
```

- [ ] **Step 5.2: Verificar sintaxi**

```bash
node --check options/settings-stats.js
```

Expected: cap output.

- [ ] **Step 5.3: Suite de tests**

```bash
npm test
```

Expected: tots els tests passen (el canvi és DOM-heavy, els tests existents comproven lògica de dades, no DOM).

- [ ] **Step 5.4: Commit**

```bash
git add options/settings-stats.js
git commit -m "feat(stats): historial carrega resum a la sidebar en comptes d'obrir URL"
```

---

## Self-Review

**Spec coverage:**
- ✅ Badge `⚡ En caché` a la toolbar → Task 1 + 2
- ✅ Badge actualitza en canvi de tab → Task 2 (tab listeners)
- ✅ Badge actualitza després de generar resum → Task 2 (finally)
- ✅ Historial stats → load cached summary en sidebar → Task 3 + 4 + 5
- ✅ Fallback `window.open` si no hi ha caché → Task 5
- ✅ Sidebar tancada quan es clica → Task 4 (background obre sidebar) + Task 3 (init check)
- ✅ Sidebar ja oberta → Task 3 (`storage.onChanged` dispara igualment)

**Placeholder scan:** Cap TBD ni TODO.

**Type consistency:** `pendingCacheLoad` (string: URL) consistent entre Task 3 (lectura), Task 4 (disparador), Task 5 (escriptura). `getSummaryCache(url)` retorna `entry` o `null` — `loadHistoryEntry(entry)` espera un objecte amb `{ summary, title, url }` — l'objecte retornat per `getSummaryCache` té aquests camps. ✅
