# Revisió i Millores v2.1.0 — Pla d'Implementació

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir els bugs urgents (Q1), implementar les millores complexes urgents (Q2) i aplicar quick wins de manteniment (Q3) identificats a la revisió de l'extensió Resumir Contingut v2.1.0.

**Architecture:** Canvis distribuïts en tres grups independents per ordre de prioritat: Q1 (5 fixes trivials/fàcils), Q2 (3 millores urgents complexes), Q3 (4 quick wins). Els Q4 (backlog llarg termini) queden fora d'aquest pla. Tots els canvis segueixen TDD on hi ha lògica testable.

**Tech Stack:** JavaScript (ES modules + CommonJS hybrid), Node.js built-in test runner (`node:test`), browser WebExtensions MV3, esbuild, ESLint 9.

**Spec:** `docs/superpowers/specs/2026-03-27-revisio-millores-design.md`

---

## Mapa de fitxers afectats

| Fitxer | Tasques |
|--------|---------|
| `shared/models.js` | T1 (B1), T3 (B3+B5), T5 (A1) |
| `sidebar/summary.js` | T1 (B1), T3 (B3), T5 (A1), T7 (A3) |
| `sidebar/sidebar.js` | T2 (B2) |
| `sidebar/cache.js` | T4 (C4), T6 (A2) |
| `background.js` | T6 (A2) |
| `sidebar/ui.js` | T8 (C1) |
| `THIRD_PARTY.md` | T9 (C3) |
| `tests/api.test.mjs` | T1 (B1), T3 (B3+B5) |
| `tests/cache.test.mjs` | T4 (C4), T6 (A2) |
| `tests/summary.test.mjs` | T5 (A1) |
| `tests/ui.test.mjs` *(nou)* | T10 (C2) |

---

## Q1 — Alta urgència / Fàcil

---

### Task 1: B1 — Constant DEFAULT_MODEL_ID

**Files:**
- Modify: `shared/models.js`
- Modify: `sidebar/summary.js:65`
- Modify: `sidebar/sidebar.js:285`
- Test: `tests/api.test.mjs`

**Context:** `sidebar.js:285` usa `"gemini-2.0-flash"` i `summary.js:65` usa `"gemini-2.5-flash"` com a fallback del model per defecte. Cal unificar en una constant compartida.

- [ ] **Step 1: Escriure el test que falla**

Afegir al final de `tests/api.test.mjs`:

```js
// Carregar la constant (afegir al bloc d'imports existent)
// const { CURATED_MODELS, DEFAULT_MODEL_ID } = require("../shared/models.js");
// (substituir la línia d'import existent de CURATED_MODELS)

test("DEFAULT_MODEL_ID és un ID vàlid dins CURATED_MODELS", () => {
    assert.ok(
        CURATED_MODELS.some(m => m.id === DEFAULT_MODEL_ID),
        `DEFAULT_MODEL_ID '${DEFAULT_MODEL_ID}' no és a CURATED_MODELS`
    );
});

test("DEFAULT_MODEL_ID és un string no buit", () => {
    assert.ok(typeof DEFAULT_MODEL_ID === "string" && DEFAULT_MODEL_ID.length > 0);
});
```

**Nota:** Modificar la línia d'import existent a `tests/api.test.mjs` de:
```js
const { CURATED_MODELS } = require("../shared/models.js");
```
a:
```js
const { CURATED_MODELS, DEFAULT_MODEL_ID } = require("../shared/models.js");
```

- [ ] **Step 2: Verificar que el test falla**

```bash
node --test tests/api.test.mjs
```
Expected: FAIL amb `DEFAULT_MODEL_ID is not defined` o `Cannot destructure property 'DEFAULT_MODEL_ID'`.

- [ ] **Step 3: Afegir la constant a `shared/models.js`**

Afegir just sota la definició de `CURATED_MODELS` (línia 12, abans d'`ensureFavoriteModels`):

```js
/** Model usat per defecte si l'usuari no n'ha triat cap. */
const DEFAULT_MODEL_ID = "gemini-2.0-flash";
```

Actualitzar el bloc condicional d'export al final del fitxer (és dins un `if`):
```js
// Canviar (bloc complet):
if (typeof module !== "undefined" && module.exports) {
    module.exports = { CURATED_MODELS };
}
// Per:
if (typeof module !== "undefined" && module.exports) {
    module.exports = { CURATED_MODELS, DEFAULT_MODEL_ID };
}
```

- [ ] **Step 4: Actualitzar `sidebar/summary.js:65`**

```js
// Canviar:
let modelName = config.modelName || "gemini-2.5-flash";
// Per:
let modelName = config.modelName || DEFAULT_MODEL_ID;
```

- [ ] **Step 5: Actualitzar `sidebar/sidebar.js:285`**

```js
// Canviar:
let modelName = syncData.modelName || "gemini-2.0-flash";
// Per:
let modelName = syncData.modelName || DEFAULT_MODEL_ID;
```

**Nota:** `DEFAULT_MODEL_ID` es carrega via `<script src="../shared/models.js">` al `sidebar.html` i ja és global al navegador. No cal cap `import`.

- [ ] **Step 6: Verificar que els tests passen**

```bash
node --test tests/api.test.mjs
```
Expected: tots els tests PASS.

- [ ] **Step 7: Verificar tots els tests**

```bash
npm test
```
Expected: 58 tests PASS (56 existents + 2 nous).

- [ ] **Step 8: Commit**

```bash
git add shared/models.js sidebar/summary.js sidebar/sidebar.js tests/api.test.mjs
git commit -m "fix(models): unificar model per defecte a DEFAULT_MODEL_ID a shared/models.js"
```

---

### Task 2: B2 — Eliminar condicional duplicat al listener `storage.onChanged`

**Files:**
- Modify: `sidebar/sidebar.js:79-87`

**Context:** Les dues branques del `if/else` sobre `changes.apiKey` fan exactament el mateix (`window.location.reload()`). Confirmat: no hi ha cap requisit actiu de mostrar una UI diferent quan la clau s'elimina vs quan es canvia.

- [ ] **Step 1: Simplificar el bloc a `sidebar/sidebar.js`**

Localitzar el bloc (línies ~79-88):
```js
if (changes.apiKey && changes.apiKey.newValue !== changes.apiKey.oldValue) {
    // Only reload if API key actually changed (to avoid wiping summary on font change)
    if (changes.apiKey.newValue) {
        window.location.reload();
    } else {
        // If removed, we need to show the warning
        window.location.reload();
    }
}
```

Substituir per:
```js
if (changes.apiKey && changes.apiKey.newValue !== changes.apiKey.oldValue) {
    window.location.reload();
}
```

- [ ] **Step 2: Verificar tots els tests**

```bash
npm test
```
Expected: tots els tests PASS (canvi no afecta lògica testable).

- [ ] **Step 3: Commit**

```bash
git add sidebar/sidebar.js
git commit -m "fix(sidebar): eliminar condicional duplicat al listener apiKey (ambdues branques feien reload)"
```

---

### Task 3: B3 + B5 — Token limit per model i EUR_RATE a shared/models.js

**Files:**
- Modify: `shared/models.js` (afegir `contextWindow` i `EUR_RATE`)
- Modify: `sidebar/summary.js:189-193`
- Modify: `sidebar/api.js:5`
- Test: `tests/api.test.mjs`

**Context:** `safeLimit = 8000` tokens és massa conservador (articles llargs es truncuen); `EUR_RATE` és una constant flotant sense context.

- [ ] **Step 1: Escriure tests que fallen**

Primer, actualitzar la línia d'import a `tests/api.test.mjs` (línia ~14-16) per afegir `EUR_RATE`:
```js
// Canviar:
const { CURATED_MODELS, DEFAULT_MODEL_ID } = require("../shared/models.js");
// Per:
const { CURATED_MODELS, DEFAULT_MODEL_ID, EUR_RATE } = require("../shared/models.js");
```

Afegir al final de `tests/api.test.mjs`:

```js
test("CURATED_MODELS - tots els models tenen contextWindow (número positiu)", () => {
    for (const model of CURATED_MODELS) {
        assert.ok(
            typeof model.contextWindow === "number" && model.contextWindow > 0,
            `Model ${model.id} no té contextWindow`
        );
    }
});

test("EUR_RATE és exportada des de shared/models.js i és un número entre 0.5 i 1.5", () => {
    assert.ok(typeof EUR_RATE === "number", "EUR_RATE ha de ser número");
    assert.ok(EUR_RATE > 0.5 && EUR_RATE < 1.5, `EUR_RATE fora de rang: ${EUR_RATE}`);
});
```

- [ ] **Step 2: Verificar que els tests fallen**

```bash
node --test tests/api.test.mjs
```
Expected: FAIL als 2 nous tests.

- [ ] **Step 3: Afegir `contextWindow` i `EUR_RATE` a `shared/models.js`**

Substituir `CURATED_MODELS` per:

```js
/** Taxa de conversió USD → EUR. Font: referència editorial, actualitzar cada any. */
const EUR_RATE = 0.92; // 2025-Q1

const CURATED_MODELS = [
    { id: "gemini-2.5-pro",        label: "Gemini 2.5 Pro",        priceIn: 1.25, priceOut: 5.00,  rpd: 50,     contextWindow: 1_000_000, fallback: false },
    { id: "gemini-2.0-flash",      label: "Gemini 2.0 Flash",      priceIn: 0.10, priceOut: 0.40,  rpd: 1500,   contextWindow: 1_000_000, fallback: true  },
    { id: "gemini-2.5-flash",      label: "Gemini 2.5 Flash",      priceIn: 0.30, priceOut: 2.50,  rpd: 500,    contextWindow: 1_000_000, fallback: true  },
    { id: "gemma-3-27b-it",        label: "Gemma 3 (27B)",         priceIn: 0.15, priceOut: 0.15,  rpd: 2000,   contextWindow: 131_072,   fallback: true  },
    { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", priceIn: 0.07, priceOut: 0.30,  rpd: 999999, contextWindow: 1_000_000, fallback: true  },
];
```

Actualitzar el bloc condicional d'export al final del fitxer:
```js
// Canviar (bloc complet):
if (typeof module !== "undefined" && module.exports) {
    module.exports = { CURATED_MODELS, DEFAULT_MODEL_ID };
}
// Per:
if (typeof module !== "undefined" && module.exports) {
    module.exports = { CURATED_MODELS, DEFAULT_MODEL_ID, EUR_RATE };
}
```

- [ ] **Step 4: Eliminar `EUR_RATE` de `sidebar/api.js`**

Eliminar la línia 5:
```js
const EUR_RATE = 0.92; // USD → EUR fixed conversion rate
```

**Nota:** `EUR_RATE` ara és una global del navegador carregada via `shared/models.js` (el `<script>` el carrega abans que `api.js`). No cal cap canvi a `getCuratedModelInfo` — simplement llegirà la global.

- [ ] **Step 5: Actualitzar el token limit a `sidebar/summary.js`**

Localitzar (línies ~189-193):
```js
// Token Limit handling
const safeLimit = 8000;
const estimatedTokens = estimateTokens(pageText);
if (estimatedTokens > safeLimit) {
     const charLimit = safeLimit * 3.5;
     pageText = pageText.substring(0, charLimit) + "\n\n[... Text truncated due to model limits ...]";
}
```

Substituir per:
```js
// Token Limit handling — usar contextWindow del model triat (deixant 20% de marge)
// Nota: s'usa CURATED_MODELS.find() directament per evitar dep. creuada amb api.js en tests
const modelEntry = CURATED_MODELS.find(m => m.id === modelName);
const safeLimit = Math.floor(((modelEntry && modelEntry.contextWindow) || 200_000) * 0.8);
const estimatedTokens = estimateTokens(pageText);
if (estimatedTokens > safeLimit) {
    const charLimit = safeLimit * 4; // ~4 chars/token
    pageText = pageText.substring(0, charLimit) + "\n\n[... Text truncated due to model limits ...]";
}
```

**Nota:** S'usa `CURATED_MODELS.find()` en lloc de `getCuratedModelInfo()` perquè `getCuratedModelInfo` és definida a `api.js` i no retorna `contextWindow`. `CURATED_MODELS` ja és global al navegador (carregada via `shared/models.js`) i és mockejada als tests de summary.

- [ ] **Step 6: Verificar tests**

```bash
npm test
```
Expected: tots els tests PASS. El test de `CURATED_MODELS conté exactament 5 models` ha de continuar passant.

- [ ] **Step 7: Commit**

```bash
git add shared/models.js sidebar/summary.js sidebar/api.js tests/api.test.mjs
git commit -m "fix(models): token limit per model via contextWindow, EUR_RATE a shared/models.js"
```

---

### Task 4: C4 — Combinar dos reads seqüencials a `saveUsageStats`

**Files:**
- Modify: `sidebar/cache.js:44-77`
- Test: `tests/cache.test.mjs`

**Context:** `saveUsageStats` fa dos `await ext.storage.local.get` seqüencials que es poden combinar en un.

- [ ] **Step 1: Escriure un test que verifiqui el comportament actual**

El test `"saveUsageStats - crea una entrada a l'historial"` ja cobreix el comportament. Verificar que passa:

```bash
node --test tests/cache.test.mjs
```
Expected: tots els tests PASS.

- [ ] **Step 2: Refactoritzar `saveUsageStats` a `sidebar/cache.js`**

Localitzar les dues crides separades (línies ~46 i ~65) i combinar-les:

```js
async function saveUsageStats(inputTokens, outputTokens, isDeepDive, modelName, latency, title, url) {
    try {
        // Llegir stats i historial en una sola crida
        const data = await ext.storage.local.get(["stats", "usageHistory"]);
        const currentStats = data.stats || { articles: 0, tokens: 0 };

        const newStats = {
            articles: currentStats.articles + 1,
            tokens: Math.round(currentStats.tokens + inputTokens + outputTokens)
        };

        const historyEntry = {
            date: new Date().toISOString(),
            title: title || "No Title",
            url: url || "No URL",
            model: modelName,
            inputTokens: Math.round(inputTokens),
            outputTokens: Math.round(outputTokens),
            type: (isDeepDive || modelName.includes("pro")) ? "deep" : "lite",
            latency: latency
        };

        const history = data.usageHistory || [];
        history.unshift(historyEntry);

        // Mantenir màxim 100 entrades
        if (history.length > 100) history.pop();

        await ext.storage.local.set({ stats: newStats, usageHistory: history });
        return newStats;
    } catch (e) {
        console.error("Error saving statistics:", e);
        return null;
    }
}
```

- [ ] **Step 3: Verificar que els tests existents passen**

```bash
node --test tests/cache.test.mjs
```
Expected: tots els tests PASS (el comportament no ha canviat).

- [ ] **Step 4: Commit**

```bash
git add sidebar/cache.js
git commit -m "perf(cache): combinar dos reads seqüencials a saveUsageStats en un sol get"
```

---

## Q2 — Alta urgència / Difícil

---

### Task 5: A1 — Fallback de quota intel·ligent (respecta favorits, evita models cars)

**Files:**
- `shared/models.js` — ja modificat a Task 3 (camp `fallback`)
- Modify: `sidebar/summary.js:198`
- Test: `tests/summary.test.mjs`

**Context:** La lògica de fallback actual (`CURATED_MODELS.map(m => m.id)`) inclou `gemini-2.5-pro` (50 RPD, tarifa de pagament). Cal usar `fallback: true` per limitar el fallback a models segurs, i respectar els favorits de l'usuari com a primera opció.

**Prerequisit:** Task 3 completada (`fallback` field a `CURATED_MODELS`).

- [ ] **Step 1: Escriure els tests que fallen**

**Important:** Obrir `tests/summary.test.mjs`. El fitxer actual té a la línia 12:
```js
const { classifyError } = require("../sidebar/summary.js");
```
Cal **substituir les línies 12-12** per aquest bloc (l'ordre és crític: `CURATED_MODELS` ha d'estar com a global **abans** de `require("../sidebar/summary.js")`):

```js
// Carregar CURATED_MODELS com a global ABANS de carregar summary.js
// (summary.js accedeix a CURATED_MODELS com a global en buildFallbackList)
const { CURATED_MODELS } = require("../shared/models.js");
global.CURATED_MODELS = CURATED_MODELS;

const { classifyError, buildFallbackList } = require("../sidebar/summary.js");
```

```js
test("buildFallbackList - el model preferit va primer", () => {
    const list = buildFallbackList("gemini-2.5-pro", ["gemini-2.0-flash", "gemini-2.5-flash"]);
    assert.equal(list[0], "gemini-2.5-pro");
});

test("buildFallbackList - no duplica el model preferit", () => {
    const list = buildFallbackList("gemini-2.0-flash", ["gemini-2.0-flash", "gemini-2.5-flash"]);
    const occurrences = list.filter(m => m === "gemini-2.0-flash").length;
    assert.equal(occurrences, 1, "El model preferit no ha d'aparèixer duplicat");
});

test("buildFallbackList - no inclou models sense fallback:true", () => {
    const list = buildFallbackList("gemini-2.0-flash", ["gemini-2.0-flash"]);
    assert.ok(!list.includes("gemini-2.5-pro"), "gemini-2.5-pro no ha d'estar al fallback");
});

test("buildFallbackList - inclou models de CURATED_MODELS amb fallback:true com a darrer recurs", () => {
    // Si l'únic favorit és gemini-2.5-pro, els fallbacks de CURATED_MODELS s'afegeixen
    const list = buildFallbackList("gemini-2.5-pro", ["gemini-2.5-pro"]);
    assert.ok(list.includes("gemini-2.0-flash"), "Ha d'incloure flash com a fallback de CURATED_MODELS");
    assert.ok(list.includes("gemini-2.0-flash-lite"), "Ha d'incloure flash-lite com a fallback");
});
```

- [ ] **Step 2: Verificar que els tests fallen**

```bash
node --test tests/summary.test.mjs
```
Expected: FAIL amb `buildFallbackList is not defined`.

- [ ] **Step 3: Afegir `buildFallbackList` a `sidebar/summary.js`**

Afegir just abans de `startSummary`:

```js
/**
 * Construeix la llista de models a provar en cas de quota esgotada.
 * Prova primer els favorits de l'usuari, després els models de CURATED_MODELS amb fallback:true.
 * Mai duplica models.
 *
 * @param {string} preferredModel - Model triat per l'usuari
 * @param {string[]} favoriteIds - IDs dels models favorits de l'usuari
 * @returns {string[]} Llista ordenada de models a provar
 */
function buildFallbackList(preferredModel, favoriteIds) {
    const globalFallbacks = CURATED_MODELS
        .filter(m => m.fallback === true)
        .map(m => m.id);
    return [...new Set([preferredModel, ...favoriteIds, ...globalFallbacks])];
}
```

Afegir a l'export al final del fitxer:
```js
// Canviar:
module.exports = { classifyError };
// Per:
module.exports = { classifyError, buildFallbackList };
```

- [ ] **Step 4: Actualitzar la lògica de fallback a `startSummary` (summary.js ~línia 196-199)**

```js
// Canviar:
const modelsToTry = [...new Set([modelName, ...CURATED_MODELS.map(m => m.id)])];

// Per:
const { favoriteModels: favoriteIds = [] } = await ext.storage.sync.get({ favoriteModels: [] });
const modelsToTry = buildFallbackList(modelName, favoriteIds);
```

- [ ] **Step 5: Verificar tots els tests**

```bash
npm test
```
Expected: tots els tests PASS.

- [ ] **Step 6: Commit**

```bash
git add sidebar/summary.js shared/models.js tests/summary.test.mjs
git commit -m "fix(summary): fallback de quota respecta favorits i evita models cars (A1)"
```

---

### Task 6: A2 — Expiració de caché (TTL de 30 dies)

**Files:**
- Modify: `sidebar/cache.js`
- Modify: `background.js`
- Test: `tests/cache.test.mjs`

**Context:** Les entrades `summary_cache:${url}` no expiren mai. Cal afegir TTL i una funció de purga.

- [ ] **Step 1: Escriure els tests que fallen**

Afegir a `tests/cache.test.mjs` (el mock de `storage.local` ja existeix i suporta `get(null)`):

```js
// Necessitem la nova funció — afegir al destructuring existent:
// const { getSummaryCache, saveSummaryCache, saveUsageStats, purgeStaleCacheEntries } = require("../sidebar/cache.js");

test("getSummaryCache - retorna null per a entrades més velles que el TTL", async () => {
    clearStorage();
    const url = "https://old-article.com";
    // Desar una entrada amb timestamp de fa 31 dies
    const oldTimestamp = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await storageMock.set({
        [`summary_cache:${url}`]: { url, title: "Vell", summary: "Antic", timestamp: oldTimestamp, version: "1.0", stats: {} }
    });
    const result = await getSummaryCache(url);
    assert.equal(result, null, "Ha de retornar null per entrades expirades");
});

test("getSummaryCache - retorna l'entrada si és dins el TTL", async () => {
    clearStorage();
    const url = "https://fresh-article.com";
    await saveSummaryCache(url, "Fresc", "Resum fresc", "model", 10, 5);
    const result = await getSummaryCache(url);
    assert.ok(result !== null, "Ha de retornar l'entrada fresca");
});

test("purgeStaleCacheEntries - elimina entrades antigues i retorna el nombre eliminat", async () => {
    clearStorage();
    const oldTs = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const freshTs = new Date().toISOString();
    await storageMock.set({
        "summary_cache:https://old.com": { url: "https://old.com", title: "Vell", summary: "X", timestamp: oldTs, version: "1.0", stats: {} },
        "summary_cache:https://fresh.com": { url: "https://fresh.com", title: "Fresc", summary: "Y", timestamp: freshTs, version: "1.0", stats: {} },
        "stats": { articles: 5, tokens: 1000 }, // no és caché, no s'ha d'eliminar
    });
    const removed = await purgeStaleCacheEntries();
    assert.equal(removed, 1, "Ha d'eliminar 1 entrada expirada");
    const old = await getSummaryCache("https://old.com");
    assert.equal(old, null, "L'entrada vella ha de ser eliminada");
    const fresh = await getSummaryCache("https://fresh.com");
    assert.ok(fresh !== null, "L'entrada fresca ha de continuar");
});

test("purgeStaleCacheEntries - retorna 0 si no hi ha entrades a purgar", async () => {
    clearStorage();
    await saveSummaryCache("https://new.com", "Nou", "Resum", "model", 10, 5);
    const removed = await purgeStaleCacheEntries();
    assert.equal(removed, 0);
});
```

- [ ] **Step 2: Verificar que els tests fallen**

```bash
node --test tests/cache.test.mjs
```
Expected: FAIL (purgeStaleCacheEntries no existeix, getSummaryCache no comprova TTL).

- [ ] **Step 3: Implementar TTL a `getSummaryCache` i afegir `purgeStaleCacheEntries` a `sidebar/cache.js`**

Substituir `getSummaryCache`:
```js
const CACHE_TTL_DAYS = 30;

async function getSummaryCache(url) {
    try {
        const cacheKey = `summary_cache:${url}`;
        const cachedData = await ext.storage.local.get(cacheKey);
        const entry = cachedData[cacheKey];
        if (!entry) return null;
        // Verificar TTL
        if (entry.timestamp) {
            const ageMs = Date.now() - new Date(entry.timestamp).getTime();
            if (ageMs > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000) return null;
        }
        return entry;
    } catch (e) {
        console.error("Cache check failed:", e);
        return null;
    }
}
```

Afegir `purgeStaleCacheEntries` just sota `saveSummaryCache`:
```js
/**
 * Elimina les entrades de caché més velles que CACHE_TTL_DAYS.
 * Usa storage.local.get(null) per enumerar totes les claus.
 * @returns {number} Nombre d'entrades eliminades.
 */
async function purgeStaleCacheEntries() {
    try {
        const allData = await ext.storage.local.get(null);
        const cutoff = Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
        const keysToRemove = [];
        for (const [key, value] of Object.entries(allData)) {
            if (!key.startsWith("summary_cache:")) continue;
            const ts = value?.timestamp ? new Date(value.timestamp).getTime() : 0;
            if (ts < cutoff) keysToRemove.push(key);
        }
        if (keysToRemove.length > 0) {
            await ext.storage.local.remove(keysToRemove);
        }
        return keysToRemove.length;
    } catch (e) {
        console.error("Error purging stale cache:", e);
        return 0;
    }
}
```

Actualitzar l'export:
```js
module.exports = { getSummaryCache, saveSummaryCache, saveUsageStats, purgeStaleCacheEntries };
```

- [ ] **Step 4: Cridar `purgeStaleCacheEntries` des de la inicialització de `sidebar.js`**

El background service worker no té accés a `purgeStaleCacheEntries` (definida al bundle de la sidebar). La solució correcta: cridar-la des de `sidebar/sidebar.js` en carregar, on el mòdul ja és disponible.

A `sidebar/sidebar.js`, dins l'IIFE d'inicialització (línia ~279, just abans del `try {`), afegir:
```js
// Purgar caché expirada en segon pla (no bloquejant)
purgeStaleCacheEntries().catch(() => {});
```

- [ ] **Step 5: Verificar tots els tests**

```bash
npm test
```
Expected: tots els tests PASS.

- [ ] **Step 6: Commit**

```bash
git add sidebar/cache.js sidebar/sidebar.js tests/cache.test.mjs
git commit -m "fix(cache): afegir TTL de 30 dies i purgeStaleCacheEntries (A2)"
```

---

### Task 7: A3 — Streaming sense re-parse complet per chunk

**Files:**
- Modify: `sidebar/summary.js:203-215`

**Context:** Durant el streaming, `formatTextToFragment(currentMetadata.summary, ...)` re-parseja el DOM complet acumulat cada 100ms. Per resums llargs el cost és O(n). La solució: text pur durant el stream, Markdown complet al final.

**Nota:** Canvi de comportament visible: durant la generació, el text es mostrarà com a text pla (sense Markdown). El format final s'aplica quan l'stream acaba. És un trade-off acceptable: lleugeresa vs format en temps real.

- [ ] **Step 1: Localitzar el callback `onChunk` a `summary.js` (~línia 206)**

El bloc a modificar:
```js
let lastUpdate = 0;
// ...
await callGeminiStream(apiKey, tryModel, systemPrompt, pageText, signal, (chunkText) => {
    currentMetadata.summary += chunkText;
    const now = Date.now();
    if (now - lastUpdate > 100) {
      contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, bionicEnabled));
      lastUpdate = now;
    }
});
```

- [ ] **Step 2: Substituir per renderitzat de text pla durant el stream**

```js
let lastUpdate = 0;
contentDiv.classList.remove("hidden");
// ...
await callGeminiStream(apiKey, tryModel, systemPrompt, pageText, signal, (chunkText) => {
    currentMetadata.summary += chunkText;
    const now = Date.now();
    if (now - lastUpdate > 100) {
        // Text pla durant el streaming (ràpid, sense parse)
        contentDiv.textContent = currentMetadata.summary;
        lastUpdate = now;
    }
});
```

El `formatTextToFragment` complet ja es crida just després (línia ~243):
```js
contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, bionicEnabled));
```
Aquest és el renderitzat final correcte — ja existia i no cal canviar-lo.

- [ ] **Step 3: Verificar tots els tests**

```bash
npm test
```
Expected: tots els tests PASS (canvi no afecta tests unitaris — és UI-only).

- [ ] **Step 4: Test manual**

Obrir la sidebar, generar un resum d'un article llarg (ex: Wikipedia). Verificar:
- Durant la generació: el text apareix com a text pla continu (sense headers ni llistes formatades)
- Quan la generació acaba: el text es mostra amb Markdown complet (headers, llistes, negreta)

- [ ] **Step 5: Commit**

```bash
git add sidebar/summary.js
git commit -m "perf(summary): text pla durant streaming, Markdown complet al final (A3)"
```

---

## Q3 — Baixa urgència / Fàcil

---

### Task 8: C1 — Migració d'ordre de plugins per versió numèrica

**Files:**
- Modify: `sidebar/ui.js:57-65`

**Context:** Tres strings JSON hardcodejats detecten ordres antics. Cal migrar per versió numèrica.

- [ ] **Step 1: Modificar `applyExtensionOrder` a `sidebar/ui.js`**

Substituir el bloc de migració hardcoded (línies ~57-65):
```js
// Migrate old default orders to new default order
const oldDefault1 = JSON.stringify(["obsidian", "markdown", "deepdive", "bionic", "science"]);
const oldDefault2 = JSON.stringify(["deepdive", "science", "obsidian", "markdown", "bionic"]);
const oldDefault3 = JSON.stringify(["science", "deepdive", "obsidian", "markdown", "bionic"]);
const currentOrderStr = JSON.stringify(order);

if (currentOrderStr === oldDefault1 || currentOrderStr === oldDefault2 || currentOrderStr === oldDefault3) {
    order = ["resum", "science", "deepdive", "obsidian", "markdown", "bionic"];
    ext.storage.sync.set({ extensionOrder: order });
}
```

Per:
```js
// Migrar ordres antics a l'ordre per defecte actual.
// Si l'ordre no conté 'resum', és d'una versió anterior a v2.1 — reinicialitzar.
// Aquest bloc pot eliminar-se quan tots els usuaris actius hagin actualitzat a v2.2+.
if (!order.includes("resum")) {
    order = ["resum", "science", "deepdive", "obsidian", "markdown", "bionic"];
    ext.storage.sync.set({ extensionOrder: order });
}
```

- [ ] **Step 2: Verificar tots els tests**

```bash
npm test
```
Expected: tots els tests PASS.

- [ ] **Step 3: Commit**

```bash
git add sidebar/ui.js
git commit -m "refactor(ui): simplificar migració d'ordre de plugins (C1)"
```

---

### Task 9: C3 — Documentar versió de Readability.js a THIRD_PARTY.md

**Files:**
- Modify: `THIRD_PARTY.md`

**Context:** `Readability.js` (91KB) és un fitxer venedor sense versió documentada.

- [ ] **Step 1: Identificar la versió de Readability.js**

```bash
head -5 Readability.js
```
Buscar el número de versió al capçalera del fitxer o al comentari inicial.

- [ ] **Step 2: Actualitzar `THIRD_PARTY.md`**

Obrir `THIRD_PARTY.md` i afegir/actualitzar l'entrada de Readability amb la versió trobada i la URL de la font:

```markdown
## Readability.js

- **Versió:** [versió trobada al Step 1]
- **Font:** https://github.com/mozilla/readability
- **Llicència:** Apache 2.0
- **Ús:** Extracció de contingut llegible de pàgines web (sidebar/content.js)
- **Actualització:** Descarregar manualment de la release corresponent a GitHub
```

- [ ] **Step 3: Commit**

```bash
git add THIRD_PARTY.md
git commit -m "docs: documentar versió de Readability.js a THIRD_PARTY.md (C3)"
```

---

### Task 10: C2 — Tests per a `formatTextToFragment` i `formatBionicText`

**Files:**
- Create: `tests/ui.test.mjs`
- Modify: `package.json` (afegir jsdom com devDependency)

**Context:** `formatTextToFragment` i `formatBionicText` (`ui.js:224, 253`) són funcions pures sense cap test. Requereixen un DOM — afegir `jsdom` com a devDependency.

- [ ] **Step 1: Instal·lar jsdom**

```bash
npm install --save-dev jsdom
```

- [ ] **Step 2: Crear `tests/ui.test.mjs`**

```js
/**
 * tests/ui.test.mjs
 * Tests unitaris per a sidebar/ui.js (funcions de formatació de text)
 * Execució: node --test tests/ui.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

// Configurar DOM global via jsdom
const dom = new JSDOM("<!DOCTYPE html><body></body>");
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;

const require = createRequire(import.meta.url);

// ui.js necessita ext i CURATED_MODELS com a globals del navegador
// (les funcions de formatació no les usen, però el fitxer les referencia)
global.ext = { storage: { sync: { get: async () => ({}), set: async () => {} } } };
const { CURATED_MODELS } = require("../shared/models.js");
global.CURATED_MODELS = CURATED_MODELS;

const { formatTextToFragment, formatBionicText } = require("../sidebar/ui.js");

// ---------------------------------------------------------------------------
// formatBionicText
// ---------------------------------------------------------------------------

test("formatBionicText - retorna un fragment no buit per a text vàlid", () => {
    const frag = formatBionicText("Hola món");
    assert.ok(frag.childNodes.length > 0, "El fragment ha de tenir fills");
});

test("formatBionicText - el primer caràcter de cada paraula va en negreta", () => {
    const frag = formatBionicText("Test");
    const bold = frag.querySelector ? frag.querySelector("b") : frag.childNodes[0];
    assert.ok(bold, "Ha d'haver-hi un element <b>");
});

test("formatBionicText - text d'un sol caràcter resulta en un <b> amb el caràcter", () => {
    const frag = formatBionicText("A");
    // Primer fill ha de ser un <b>
    const b = Array.from(frag.childNodes).find(n => n.nodeName === "B");
    assert.ok(b, "Ha d'haver-hi un <b>");
    assert.equal(b.textContent, "A");
});

// ---------------------------------------------------------------------------
// formatTextToFragment — Markdown bàsic
// ---------------------------------------------------------------------------

test("formatTextToFragment - text buit retorna fragment buit", () => {
    const frag = formatTextToFragment("");
    assert.equal(frag.childNodes.length, 0);
});

test("formatTextToFragment - paràgraf simple genera un <p>", () => {
    const frag = formatTextToFragment("Hola món");
    const p = frag.querySelector("p");
    assert.ok(p, "Ha de generar un element <p>");
    assert.equal(p.textContent, "Hola món");
});

test("formatTextToFragment - # genera un <h1>", () => {
    const frag = formatTextToFragment("# Títol principal");
    const h1 = frag.querySelector("h1");
    assert.ok(h1, "Ha de generar <h1>");
    assert.equal(h1.textContent, "Títol principal");
});

test("formatTextToFragment - ## genera un <h2>", () => {
    const frag = formatTextToFragment("## Subtítol");
    const h2 = frag.querySelector("h2");
    assert.ok(h2, "Ha de generar <h2>");
});

test("formatTextToFragment - llista amb * genera <ul><li>", () => {
    const frag = formatTextToFragment("* Primer\n* Segon");
    const ul = frag.querySelector("ul");
    assert.ok(ul, "Ha de generar <ul>");
    const items = ul.querySelectorAll("li");
    assert.equal(items.length, 2);
    assert.equal(items[0].textContent, "Primer");
    assert.equal(items[1].textContent, "Segon");
});

test("formatTextToFragment - llista amb - genera <ul><li>", () => {
    const frag = formatTextToFragment("- Element A\n- Element B");
    const ul = frag.querySelector("ul");
    assert.ok(ul, "Ha de generar <ul>");
    assert.equal(ul.querySelectorAll("li").length, 2);
});

test("formatTextToFragment - **text** genera <strong>", () => {
    const frag = formatTextToFragment("Paraula **important** aquí");
    const strong = frag.querySelector("strong");
    assert.ok(strong, "Ha de generar <strong>");
    assert.equal(strong.textContent, "important");
});

test("formatTextToFragment - link Markdown [text](url) genera <a>", () => {
    const frag = formatTextToFragment("[Exemple](https://example.com)");
    const a = frag.querySelector("a");
    assert.ok(a, "Ha de generar <a>");
    assert.equal(a.href, "https://example.com/");
    assert.equal(a.textContent, "Exemple");
});

test("formatTextToFragment - URL bare genera <a>", () => {
    const frag = formatTextToFragment("Visita https://example.com avui");
    const a = frag.querySelector("a");
    assert.ok(a, "Ha de generar <a> per URL bare");
    assert.ok(a.href.startsWith("https://example.com"));
});

test("formatTextToFragment - mode biònic actiu afegeix <b> a les paraules", () => {
    const frag = formatTextToFragment("Paraula test", true);
    const boldElements = frag.querySelectorAll("b");
    assert.ok(boldElements.length > 0, "El mode biònic ha de generar elements <b>");
});
```

**Nota:** `ui.js` usa `module.exports` condicionalment. Cal verificar que exporta `formatTextToFragment` i `formatBionicText`. Si no ho fa, afegir-los a l'export del fitxer (similar a com es fa amb `classifyError` a `summary.js`).

Obrir `sidebar/ui.js` i verificar el bloc al final del fitxer. Si no existeix cap `module.exports`, afegir:
```js
// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { formatTextToFragment, formatBionicText };
}
```

- [ ] **Step 3: Verificar que els tests fallen (funcions no exportades)**

```bash
node --test tests/ui.test.mjs
```
Expected: FAIL (probablement `formatTextToFragment is not a function` fins que s'afegeix l'export).

- [ ] **Step 4: Afegir l'export a `sidebar/ui.js`** (si no existia)

- [ ] **Step 5: Verificar tots els tests del projecte**

```bash
npm test
```
Expected: tots els tests PASS (56 existents + nous de ui.test.mjs).

- [ ] **Step 6: Commit**

```bash
git add tests/ui.test.mjs sidebar/ui.js package.json package-lock.json
git commit -m "test(ui): afegir tests per formatTextToFragment i formatBionicText amb jsdom (C2)"
```

---

## Notes finals

**Q4 — Backlog (fora d'aquest pla):**
- D1: Refactor `summary.js` (356 línies → pipeline de funcions)
- D2: Refactor `ui.js` (550 línies → 3 mòduls)
- D3: Tests per `content.js` (requereix mock de `chrome.scripting`)
- D4: Historial navegable des de la sidebar (nova funcionalitat ROADMAP)
- D5: Publicació a Chrome Web Store (Fase F pendent)

**Ordre d'implementació recomanat:**
T1 → T3 → T2 → T4 → T5 → T6 → T7 → T8 → T9 → T10

Tasks T1 i T3 van primer perquè modifiquen `shared/models.js` del qual depenen T5 i T6.

**Verificació final:**
```bash
npm run prerelease
```
Expected: audit pre-release sense errors.
