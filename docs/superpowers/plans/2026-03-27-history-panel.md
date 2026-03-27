# D4 — Historial navegable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a navigable history panel to the sidebar that lets the user browse and reload past cached summaries without leaving the sidebar.

**Architecture:** A new `sidebar/history.js` module handles all history UI. A new `listCachedSummaries()` function in `cache.js` reads all `summary_cache:*` entries from `storage.local` and returns the valid (non-expired, with timestamp) ones sorted by date descending. A clock button in the footer opens the panel, which replaces the main content area; a "← Tornar" button closes it.

**Tech Stack:** WebExtensions API (`storage.local`, `storage.sync`), vanilla JS DOM, existing `formatTextToFragment()` global from `ui.js`.

---

## File Map

| File | Change |
|------|--------|
| `sidebar/cache.js` | Add `listCachedSummaries()` + export it |
| `sidebar/history.js` | **New** — `openHistoryPanel`, `closeHistoryPanel`, `loadHistoryEntry`, `_renderHistoryPanel`, `_relativeTime` |
| `sidebar/sidebar.html` | Add `#historyBtn` to footer, `#history-panel` div to container, `<script src="history.js">` |
| `sidebar/sidebar.css` | Add styles for `#history-panel`, `.history-*` |
| `sidebar/sidebar.js` | Wire `historyBtn` click → `openHistoryPanel` |
| `scripts/build-sidebar-bundle.mjs` | Add `sidebar/history.js` to `files` array before `sidebar.js` |
| `eslint.config.mjs` | Add 4 new globals to `extensionGlobals` |
| `tests/history.test.mjs` | **New** — 5 tests for `listCachedSummaries` |

---

## Task 1: `listCachedSummaries()` in `cache.js` (TDD)

**Files:**
- Modify: `sidebar/cache.js`
- Create: `tests/history.test.mjs`

### Background

`purgeStaleCacheEntries()` in `cache.js` (line 54) already uses `storage.local.get(null)` + filter on `summary_cache:` prefix. Follow the exact same pattern. The `CACHE_TTL_DAYS = 30` constant (line 4) is already defined. The `module.exports` guard is at line 114 — add `listCachedSummaries` there.

Tests use the same `createStorageMock()` pattern as `tests/cache.test.mjs`. The mock's `get(null)` call falls through to `return { ...store }` because `null` is neither a string nor an array.

---

- [ ] **Step 1.1: Create `tests/history.test.mjs` with 5 failing tests**

```js
/**
 * tests/history.test.mjs
 * Tests unitaris per a sidebar/cache.js: listCachedSummaries
 * Execució: node --test tests/history.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Mock de ext.storage.local (in-memory) — mateix patró que cache.test.mjs
// ---------------------------------------------------------------------------

function createStorageMock() {
    const store = {};
    return {
        async get(keys) {
            if (typeof keys === "string") return { [keys]: store[keys] };
            if (Array.isArray(keys)) return Object.fromEntries(keys.map(k => [k, store[k]]));
            return { ...store };  // handles null (get all)
        },
        async set(obj) { Object.assign(store, obj); },
        async remove(keys) {
            const ks = typeof keys === "string" ? [keys] : keys;
            ks.forEach(k => delete store[k]);
        },
        _clear() { Object.keys(store).forEach(k => delete store[k]); },
    };
}

const storageMock = createStorageMock();
global.ext = { storage: { local: storageMock } };

const { listCachedSummaries } = require("../sidebar/cache.js");

function clearStorage() { storageMock._clear(); }

function makeEntry(overrides = {}) {
    return {
        url: "https://example.com",
        title: "Test Title",
        summary: "Test summary content",
        model: "gemini-2.0-flash",
        timestamp: new Date().toISOString(),
        version: "1.0",
        stats: { input: 100, output: 50 },
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// listCachedSummaries
// ---------------------------------------------------------------------------

test("listCachedSummaries - descarta entrades sense timestamp", async () => {
    clearStorage();
    const entry = makeEntry();
    delete entry.timestamp;
    await storageMock.set({ "summary_cache:https://example.com": entry });
    const result = await listCachedSummaries();
    assert.equal(result.length, 0);
});

test("listCachedSummaries - descarta entrades caducades (>30 dies)", async () => {
    clearStorage();
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await storageMock.set({
        "summary_cache:https://old.com": makeEntry({ url: "https://old.com", timestamp: oldDate }),
    });
    const result = await listCachedSummaries();
    assert.equal(result.length, 0);
});

test("listCachedSummaries - retorna entrades vàlides ordenades per data desc", async () => {
    clearStorage();
    const now = Date.now();
    const older = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const newer = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();
    await storageMock.set({
        "summary_cache:https://older.com": makeEntry({ url: "https://older.com", timestamp: older }),
        "summary_cache:https://newer.com": makeEntry({ url: "https://newer.com", timestamp: newer }),
    });
    const result = await listCachedSummaries();
    assert.equal(result.length, 2);
    assert.equal(result[0].url, "https://newer.com");
    assert.equal(result[1].url, "https://older.com");
});

test("listCachedSummaries - retorna array buit si no hi ha caché vàlida", async () => {
    clearStorage();
    const result = await listCachedSummaries();
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 0);
});

test("listCachedSummaries - retorna array buit (no llança) si storage falla", async () => {
    const failMock = { async get() { throw new Error("Storage unavailable"); } };
    global.ext = { storage: { local: failMock } };
    const result = await listCachedSummaries();
    assert.equal(result.length, 0);
    // Restore
    global.ext = { storage: { local: storageMock } };
});
```

- [ ] **Step 1.2: Run tests — expect failure**

```bash
node --test tests/history.test.mjs
```

Expected: `TypeError: listCachedSummaries is not a function` (or similar — function does not exist yet)

- [ ] **Step 1.3: Add `listCachedSummaries()` to `sidebar/cache.js`**

Insert the following function **after** `purgeStaleCacheEntries` (after line 72) and **before** `saveUsageStats`:

```js
/**
 * Retorna totes les entrades de caché vàlides (amb timestamp i dins TTL),
 * ordenades per data descendent (més recent primer).
 * @returns {Array<{url, title, model, timestamp, summary}>}
 */
async function listCachedSummaries() {
    try {
        const allData = await ext.storage.local.get(null);
        const cutoff = Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
        const entries = [];
        for (const [key, value] of Object.entries(allData)) {
            if (!key.startsWith("summary_cache:")) continue;
            if (!value?.timestamp) continue;
            const ts = new Date(value.timestamp).getTime();
            if (ts < cutoff) continue;
            entries.push({
                url: value.url,
                title: value.title,
                model: value.model,
                timestamp: value.timestamp,
                summary: value.summary,
            });
        }
        entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return entries;
    } catch (e) {
        console.error("Error listing cached summaries:", e);
        return [];
    }
}
```

Also update the `module.exports` line at the bottom of `cache.js` (currently line 115):

```js
// Before:
module.exports = { getSummaryCache, saveSummaryCache, saveUsageStats, purgeStaleCacheEntries };

// After:
module.exports = { getSummaryCache, saveSummaryCache, saveUsageStats, purgeStaleCacheEntries, listCachedSummaries };
```

- [ ] **Step 1.4: Run tests — expect all 5 to pass**

```bash
node --test tests/history.test.mjs
```

Expected output: 5 passing tests, 0 failing.

- [ ] **Step 1.5: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all tests pass (currently 96 tests).

- [ ] **Step 1.6: Commit**

```bash
git add sidebar/cache.js tests/history.test.mjs
git commit -m "feat(cache): afegir listCachedSummaries per a l'historial navegable"
```

---

## Task 2: New module `sidebar/history.js`

**Files:**
- Create: `sidebar/history.js`

### Background

This module depends on these globals (all defined before it loads):
- `listCachedSummaries` — from `cache.js`
- `formatTextToFragment` — from `ui.js`
- `ext` — from `ext.js`

`_previousVisible` is a module-level variable that snapshots the visible element when the panel opens, so `closeHistoryPanel` can restore it.

For bionic reading: the sidebar stores the current bionic state in `storage.local` as `isBionicActive` (boolean). The fixation ratio comes from `storage.sync` as `bionicFixation` (integer 0–100, default 30 → 0.30 ratio). If bionic is disabled, `formatTextToFragment` is called with `false` and the default fixation.

No DOM tests for this module (the DOM rendering logic is straightforward; `formatTextToFragment` is already tested in `tests/ui.test.mjs`).

---

- [ ] **Step 2.1: Create `sidebar/history.js`**

```js
// sidebar/history.js
// History panel: browse and reload cached summaries from the sidebar

/** Stores which element was visible before the panel opened, for restoration. */
let _previousVisible = null;

/**
 * Opens the history panel.
 * Hides current content areas, loads cached summaries, renders the list.
 */
async function openHistoryPanel() {
    const historyPanel = document.getElementById("history-panel");
    const contentDiv   = document.getElementById("content");
    const loadingDiv   = document.getElementById("loading");
    const errorDiv     = document.getElementById("error");

    // Snapshot visible element (content or error) for restoration on close
    _previousVisible = null;
    if (!contentDiv.classList.contains("hidden")) _previousVisible = contentDiv;
    else if (!errorDiv.classList.contains("hidden")) _previousVisible = errorDiv;

    // Hide all content areas
    contentDiv.classList.add("hidden");
    loadingDiv.classList.add("hidden");
    errorDiv.classList.add("hidden");

    // Build and show panel
    const entries = await listCachedSummaries();
    _renderHistoryPanel(historyPanel, entries);
    historyPanel.classList.remove("hidden");
}

/**
 * Closes the history panel and restores the previously visible element.
 */
function closeHistoryPanel() {
    const historyPanel = document.getElementById("history-panel");
    historyPanel.classList.add("hidden");
    historyPanel.innerHTML = "";
    if (_previousVisible) {
        _previousVisible.classList.remove("hidden");
        _previousVisible = null;
    }
}

/**
 * Loads a cached entry into the content area with current bionic settings,
 * then closes the history panel.
 * @param {{summary: string}} entry
 */
async function loadHistoryEntry(entry) {
    const contentDiv = document.getElementById("content");
    const localData = await ext.storage.local.get({ isBionicActive: false });
    const bionicEnabled = localData.isBionicActive === true;
    let fixation = 0.45;
    if (bionicEnabled) {
        const syncData = await ext.storage.sync.get({ bionicFixation: 30 });
        fixation = syncData.bionicFixation / 100;
    }
    contentDiv.replaceChildren(formatTextToFragment(entry.summary, bionicEnabled, fixation));
    contentDiv.classList.remove("hidden");
    closeHistoryPanel();
}

/**
 * Renders the history panel DOM with a back button and entry list.
 * @param {HTMLElement} panel
 * @param {Array} entries
 */
function _renderHistoryPanel(panel, entries) {
    panel.innerHTML = "";

    const header = document.createElement("div");
    header.className = "history-header";
    const backBtn = document.createElement("button");
    backBtn.className = "history-back-btn";
    backBtn.textContent = "\u2190 Tornar";
    backBtn.addEventListener("click", closeHistoryPanel);
    header.appendChild(backBtn);
    panel.appendChild(header);

    if (entries.length === 0) {
        const empty = document.createElement("p");
        empty.className = "history-empty";
        empty.textContent = "Sense historial disponible.";
        panel.appendChild(empty);
        return;
    }

    const list = document.createElement("ul");
    list.className = "history-list";
    for (const entry of entries) {
        const li = document.createElement("li");
        li.className = "history-item";

        const titleEl = document.createElement("span");
        titleEl.className = "history-item-title";
        const rawTitle = entry.title || entry.url || "Sense t\xEDtol";
        titleEl.textContent = rawTitle.length > 50 ? rawTitle.slice(0, 50) + "\u2026" : rawTitle;

        const metaEl = document.createElement("span");
        metaEl.className = "history-item-meta";
        metaEl.textContent = _relativeTime(entry.timestamp) + " \xB7 " + (entry.model || "");

        li.appendChild(titleEl);
        li.appendChild(metaEl);
        li.addEventListener("click", () => loadHistoryEntry(entry));
        list.appendChild(li);
    }
    panel.appendChild(list);
}

/**
 * Returns a human-readable relative time string for an ISO timestamp.
 * @param {string} isoString
 * @returns {string}
 */
function _relativeTime(isoString) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return diffMin <= 1 ? "fa 1 min" : `fa ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return diffH === 1 ? "fa 1 h" : `fa ${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return "ahir";
    return `fa ${diffD} dies`;
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { openHistoryPanel, closeHistoryPanel, loadHistoryEntry };
}
```

- [ ] **Step 2.2: Verify the file has no syntax errors**

```bash
node --check sidebar/history.js
```

Expected: no output (clean).

- [ ] **Step 2.3: Commit**

```bash
git add sidebar/history.js
git commit -m "feat(history): nou mòdul history.js — panell d'historial navegable"
```

---

## Task 3: HTML + CSS changes

**Files:**
- Modify: `sidebar/sidebar.html`
- Modify: `sidebar/sidebar.css`

### Background

The footer (`#footer-status`, line 199) uses `display: flex; justify-content: space-between`. Adding items at the end extends the flex row. The history button must be styled to match footer font size (11px) and use `var(--footer-text)` color with no border/background.

`#history-panel` is inside `#container` (which has `padding-bottom: 40px` to avoid the fixed footer). It must grow to fill available space and scroll if the list is long.

The `<script src="history.js">` tag goes **between** `summary.js` and `sidebar.js`.

---

- [ ] **Step 3.1: Add `#historyBtn` to `#footer-status` in `sidebar/sidebar.html`**

At the end of `#footer-status`, just before the closing `</div>` tag (after the `requests-remaining` span, line ~237), add:

```html
      <span class="separator">|</span>
      <button
        id="historyBtn"
        title="Historial"
        aria-label="Historial"
        style="background:none;border:none;cursor:pointer;padding:0 2px;font-size:1em;color:var(--footer-text);line-height:1"
      >🕐</button>
```

- [ ] **Step 3.2: Add `#history-panel` div to `#container` in `sidebar/sidebar.html`**

After the `#error` div (line 196), add:

```html
      <div id="history-panel" class="hidden"></div>
```

- [ ] **Step 3.3: Add `<script src="history.js">` in `sidebar/sidebar.html`**

Between `summary.js` and `sidebar.js` (currently lines 247–248):

```html
    <script src="summary.js"></script>
    <script src="history.js"></script>
    <script src="sidebar.js"></script>
```

- [ ] **Step 3.4: Add history panel styles to `sidebar/sidebar.css`**

Append at the end of the file:

```css
/* ── History panel ─────────────────────────────────────────── */
#history-panel {
  overflow-y: auto;
  padding: 4px 0;
}

.history-header {
  padding: 4px 0 8px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 4px;
}

.history-back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.85em;
  padding: 4px 0;
}

.history-back-btn:hover {
  color: var(--text-color);
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.history-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  border-radius: 4px;
}

.history-item:hover {
  background: var(--button-hover);
}

.history-item-title {
  font-size: 0.9em;
  color: var(--text-color);
}

.history-item-meta {
  font-size: 0.75em;
  color: var(--text-muted);
}

.history-empty {
  font-size: 0.85em;
  color: var(--text-muted);
  text-align: center;
  padding: 24px 0;
}
```

- [ ] **Step 3.5: Commit**

```bash
git add sidebar/sidebar.html sidebar/sidebar.css
git commit -m "feat(sidebar): afegir #history-panel i #historyBtn al footer"
```

---

## Task 4: Wiring + build config + ESLint

**Files:**
- Modify: `sidebar/sidebar.js`
- Modify: `scripts/build-sidebar-bundle.mjs`
- Modify: `eslint.config.mjs`

---

- [ ] **Step 4.1: Wire `historyBtn` in `sidebar/sidebar.js`**

In the `DOMContentLoaded` callback, add the `historyBtn` variable declaration near the other button declarations (lines 3–11). After `const scienceBtn = ...` (line 10), add:

```js
    const historyBtn = document.getElementById("historyBtn");
```

Then add the event listener near the other button listeners (after `settingsBtn.addEventListener`, line ~221):

```js
    if (historyBtn) historyBtn.addEventListener("click", openHistoryPanel);
```

- [ ] **Step 4.2: Add `history.js` to `scripts/build-sidebar-bundle.mjs`**

In the `files` array (lines 30–41), insert `sidebar/history.js` **between** `summary.js` and `sidebar.js`:

```js
// Before:
    resolve(root, "sidebar/summary.js"),
    resolve(root, "sidebar/sidebar.js"),

// After:
    resolve(root, "sidebar/summary.js"),
    resolve(root, "sidebar/history.js"),
    resolve(root, "sidebar/sidebar.js"),
```

- [ ] **Step 4.3: Add globals to `eslint.config.mjs`**

In `extensionGlobals` (the object starting at line 5), add a new comment block after the `sidebar/content.js` section at the end:

```js
    // sidebar/cache.js (afegir a la secció existent)
    listCachedSummaries: "readonly",
    // sidebar/history.js
    openHistoryPanel: "readonly",
    closeHistoryPanel: "readonly",
    loadHistoryEntry: "readonly",
```

- [ ] **Step 4.4: Run full test suite**

```bash
npm test
```

Expected: all 101 tests pass (96 existing + 5 new history tests).

- [ ] **Step 4.5: Run linter**

```bash
npm run lint
```

Expected: 0 errors, ≤50 warnings (no new errors introduced).

- [ ] **Step 4.6: Commit**

```bash
git add sidebar/sidebar.js scripts/build-sidebar-bundle.mjs eslint.config.mjs
git commit -m "feat(history): wiring historyBtn, afegir history.js al bundle i globals ESLint"
```

---

## Verification

After all tasks are complete, verify the feature works end-to-end:

1. Open the extension sidebar on any web page
2. Click the summarize button (▶) to generate a summary
3. Reload the sidebar on a different page, generate another summary
4. Click the 🕐 button in the footer — the history panel should appear with the two entries
5. Click an entry — the cached summary loads in the content area
6. Click "← Tornar" — the panel closes and the previous content is restored
7. Run `npm run build` and verify the Chromium bundle builds without errors
