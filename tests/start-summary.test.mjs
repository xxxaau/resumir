/**
 * tests/start-summary.test.mjs
 * Tests unitaris per a sidebar/summary.js: startSummary
 * Execució: node --test tests/start-summary.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createStorageMock } from "./helpers/storage-mock.mjs";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Helpers DOM mínims
// ---------------------------------------------------------------------------

function makeEl() {
    return {
        textContent: "",
        style: { setProperty() {}, removeProperty() {} },
        classList: {
            _c: new Set(),
            add(...c) { c.forEach(x => this._c.add(x)); },
            remove(...c) { c.forEach(x => this._c.delete(x)); },
            contains(c) { return this._c.has(c); },
        },
        replaceChildren() { this._children = []; },
        appendChild(n) { (this._children = this._children || []).push(n); return n; },
        querySelector() { return null; },
        value: "",
        options: [],
        _children: [],
    };
}

function makeCtx(overrides = {}) {
    return {
        contentDiv: makeEl(),
        errorDiv: makeEl(),
        modelSelect: { value: "gemini-2.0-flash", options: [], appendChild() {} },
        currentMetadata: { title: "", url: "", summary: "", fromCache: false },
        getSourceText: () => "",
        setSourceText: () => {},
        getContentPreload: () => null,
        isBionicEnabled: () => false,
        getGlobalConfig: () => ({}),
        onPageIdentified: () => {},
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Globals per defecte
// ---------------------------------------------------------------------------

const syncMock = createStorageMock();
const localMock = createStorageMock();

function resetStorage() {
    syncMock._clear();
    localMock._clear();
}

function setupGlobals(overrides = {}) {
    global.ext = {
        storage: {
            sync: {
                get: (keys) => syncMock.get(keys),
                set: async () => {},
            },
            local: localMock,
        },
        tabs: {
            query: async () => [{ url: "https://example.com", title: "Test Page" }],
        },
        runtime: { openOptionsPage: () => {} },
    };

    global.CURATED_MODELS = [
        { id: "gemini-2.0-flash", fallback: true,  contextWindow: 100_000 },
        { id: "gemini-2.5-flash", fallback: false, contextWindow: 100_000 },
    ];
    global.DEFAULT_MODEL_ID      = "gemini-2.0-flash";
    global.DEFAULT_SYSTEM_PROMPT = "Resumeix el contingut.";
    global.DEFAULT_DEEP_DIVE_PROMPT = "Anàlisi profunda.";
    global.DEFAULT_SCIENCE_PROMPT   = "Validació científica.";
    global.DEFAULT_BIONIC = { fixation: 20, font: "system-ui, sans-serif", weight: "600", fontSize: "1.2em", lineHeight: "1.5" };

    // Cache & stats — per defecte no hi ha caché i tots els saves retornen OK
    global.getSummaryCache  = async () => null;
    global.saveSummaryCache = async () => true;
    global.saveUsageStats   = async () => ({});

    // API stream — per defecte retorna un chunk i metadata d'ús
    global.callGeminiStream = async (_key, _model, _prompt, _text, _signal, onChunk, onUsage) => {
        onChunk("Resum generat.");
        onUsage({ promptTokenCount: 100, candidatesTokenCount: 50 });
        return { inputTokens: 100, outputTokens: 50, cacheTokens: 0 };
    };

    // Contingut pàgina
    global.getPageContent = async () => ({
        title: "Test Page",
        url: "https://example.com",
        text: "Contingut de la pàgina de prova.",
    });

    // Utilitats UI
    global.estimateTokens         = (t) => Math.ceil(t.length / 4);
    global.formatTextToFragment   = (t) => t;
    global.setGeneratingState     = () => {};
    global.startGenerationTimer   = () => Date.now();
    global.stopGenerationTimer    = () => {};
    global.updateTokenStats       = () => {};
    global.applyExtensionVisibility = () => {};
    global.applyExtensionOrder    = () => {};

    // DOM global minimal
    global.document = {
        getElementById: (id) => {
            const shared = {
                loading:            makeEl(),
                "footer-status":    makeEl(),
                "requests-remaining": makeEl(),
                "model-select":     makeEl(),
            };
            return shared[id] || makeEl();
        },
        createElement: () => makeEl(),
    };

    // Sobreescriptures puntuals per a cada test
    Object.assign(global, overrides);
}

// Carreguem el mòdul un cop, amb globals ja configurats
setupGlobals();
await syncMock.set({ modelName: "gemini-2.0-flash" });
await localMock.set({ apiKey: "AIza_test_key" });

const { startSummary } = require("../sidebar/summary.js");

// ---------------------------------------------------------------------------
// Guard: retorna null si no hi ha iniciació vàlida
// ---------------------------------------------------------------------------

test("startSummary - retorna null si cap flag d'inici actiu", async () => {
    resetStorage();
    const ctx = makeCtx();
    const result = await startSummary(ctx, null, false, false, false);
    assert.equal(result, null);
});

// ---------------------------------------------------------------------------
// Error [001]: manca API key
// ---------------------------------------------------------------------------

test("startSummary - mostra error [001] si no hi ha API key", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    // localMock buit → apiKey undefined
    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true);
    assert.ok(
        ctx.errorDiv.textContent.includes("[001]"),
        `errorDiv ha de contenir [001], té: "${ctx.errorDiv.textContent}"`
    );
    assert.ok(!ctx.errorDiv.classList.contains("hidden"), "errorDiv ha de ser visible");
});

// ---------------------------------------------------------------------------
// Error [002]: cap pestanya activa
// ---------------------------------------------------------------------------

test("startSummary - mostra error [002] si no hi ha pestanya activa", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });
    setupGlobals({
        "ext": {
            storage: {
                sync: { get: (k) => syncMock.get(k), set: async () => {} },
                local: localMock,
            },
            tabs: { query: async () => [] },
            runtime: { openOptionsPage: () => {} },
        }
    });
    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true);
    assert.ok(ctx.errorDiv.textContent.includes("[002]"),
        `errorDiv ha de contenir [002], té: "${ctx.errorDiv.textContent}"`);
});

// ---------------------------------------------------------------------------
// Cache hit: retorna resum de caché sense cridar l'API
// ---------------------------------------------------------------------------

test("startSummary - retorna el resum de caché si existeix", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });

    let apiCalled = false;
    setupGlobals({
        getSummaryCache: async () => ({
            title: "Test Page",
            url: "https://example.com",
            summary: "Resum de la caché",
            model: "gemini-2.0-flash",
            timestamp: new Date().toISOString(),
        }),
        callGeminiStream: async () => { apiCalled = true; return {}; },
    });

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true);

    assert.ok(!apiCalled, "L'API NO s'ha de cridar quan hi ha caché");
    assert.ok(ctx.currentMetadata.fromCache, "fromCache ha de ser true");
    assert.equal(ctx.currentMetadata.summary, "Resum de la caché");
});

// ---------------------------------------------------------------------------
// Golden path: genera resum i desa a caché
// ---------------------------------------------------------------------------

test("startSummary - golden path: crida API, actualitza currentMetadata i desa caché", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });

    let cacheSaved = false;
    let statsSaved = false;
    setupGlobals({
        getSummaryCache: async () => null,
        saveSummaryCache: async () => { cacheSaved = true; return true; },
        saveUsageStats: async () => { statsSaved = true; return {}; },
        callGeminiStream: async (_k, _m, _p, _t, _s, onChunk, onUsage) => {
            onChunk("Primer chunk. ");
            onChunk("Segon chunk.");
            onUsage({ promptTokenCount: 120, candidatesTokenCount: 30 });
            return { inputTokens: 120, outputTokens: 30, cacheTokens: 0 };
        },
    });

    const ctx = makeCtx();
    const ac = await startSummary(ctx, null, false, false, true);

    assert.ok(ac instanceof AbortController, "Ha de retornar un AbortController");
    assert.ok(ctx.currentMetadata.summary.includes("Primer chunk."), "El resum ha d'incloure els chunks");
    assert.ok(cacheSaved, "saveSummaryCache ha de ser cridada");
    assert.ok(statsSaved, "saveUsageStats ha de ser cridada");
});

// ---------------------------------------------------------------------------
// Fallback de quota: el primer model falla (429) i prova el segon
// ---------------------------------------------------------------------------

test("startSummary - fallback de quota: prova el segon model si el primer falla 429", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });

    const modelsTried = [];
    setupGlobals({
        getSummaryCache: async () => null,
        saveSummaryCache: async () => true,
        saveUsageStats: async () => ({}),
        CURATED_MODELS: [
            { id: "gemini-2.0-flash", fallback: true,  contextWindow: 100_000 },
            { id: "gemini-2.5-flash", fallback: true, contextWindow: 100_000 },
        ],
        callGeminiStream: async (_k, model, _p, _t, _s, onChunk, onUsage) => {
            modelsTried.push(model);
            if (model === "gemini-2.0-flash") {
                const err = new Error("Quota exceeded");
                err.status = 429;
                throw err;
            }
            onChunk("Resum del segon model.");
            onUsage({ promptTokenCount: 100, candidatesTokenCount: 40 });
            return { inputTokens: 100, outputTokens: 40, cacheTokens: 0 };
        },
    });

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true);

    assert.ok(modelsTried.includes("gemini-2.0-flash"), "Ha de provar el primer model");
    assert.ok(modelsTried.includes("gemini-2.5-flash"), "Ha de provar el segon model com a fallback");
    assert.ok(ctx.currentMetadata.summary.includes("Resum del segon model."),
        "El resum ha de ser del segon model");
});

// ---------------------------------------------------------------------------
// Tots els models fallen: mostra error [003]
// ---------------------------------------------------------------------------

test("startSummary - mostra error [003] si tots els models fallen per quota", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });

    setupGlobals({
        getSummaryCache: async () => null,
        CURATED_MODELS: [
            { id: "gemini-2.0-flash", fallback: true, contextWindow: 100_000 },
        ],
        callGeminiStream: async () => {
            const err = new Error("Quota exceeded");
            err.status = 429;
            throw err;
        },
    });

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true);

    // classifyError detecta "quota" al missatge [003] i mostra el missatge de quota
    assert.ok(
        ctx.errorDiv.textContent.includes("quota") || ctx.errorDiv.textContent.includes("models"),
        `errorDiv ha de mostrar error de quota, té: "${ctx.errorDiv.textContent}"`
    );
});

// ---------------------------------------------------------------------------
// Abort: l'usuari cancel·la la generació
// ---------------------------------------------------------------------------

test("startSummary - abort: mostra missatge d'aturada si l'usuari cancel·la", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });

    let abortControllerRef = null;
    setupGlobals({
        getSummaryCache: async () => null,
        callGeminiStream: async () => {
            // Simulem que l'abort arriba durant el stream
            abortControllerRef?.abort();
            const err = new Error("AbortError");
            err.name = "AbortError";
            throw err;
        },
    });

    const ctx = makeCtx();
    // Capturem l'AbortController per avortar des de fora
    // Aquí simulem que l'abort es produeix des de dins del stream
    const resultPromise = startSummary(ctx, null, false, false, true);
    await resultPromise;

    assert.ok(
        ctx.errorDiv.textContent.toLowerCase().includes("aturad") ||
        ctx.errorDiv.textContent.toLowerCase().includes("interromp"),
        `errorDiv ha de mostrar missatge d'aturada, té: "${ctx.errorDiv.textContent}"`
    );
});

// ---------------------------------------------------------------------------
// Deep dive: usa el prompt de deep dive
// ---------------------------------------------------------------------------

test("startSummary - deep dive: crida API amb el prompt de deep dive", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });

    let usedPrompt = null;
    setupGlobals({
        getSummaryCache: async () => null,
        saveSummaryCache: async () => true,
        saveUsageStats: async () => ({}),
        callGeminiStream: async (_k, _m, prompt, _t, _s, onChunk, onUsage) => {
            usedPrompt = prompt;
            onChunk("Anàlisi profunda.");
            onUsage({ promptTokenCount: 200, candidatesTokenCount: 80 });
            return { inputTokens: 200, outputTokens: 80, cacheTokens: 0 };
        },
    });

    const ctx = makeCtx();
    await startSummary(ctx, null, true, false, true); // isDeepDive = true

    assert.equal(usedPrompt, global.DEFAULT_DEEP_DIVE_PROMPT,
        "Ha d'usar el prompt de deep dive");
});

// ---------------------------------------------------------------------------
// Override text (selecció de text)
// ---------------------------------------------------------------------------

test("startSummary - overrideText: usa el text de selecció en lloc del contingut de la pàgina", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });

    let textSentToApi = null;
    let pageContentCalled = false;
    setupGlobals({
        getSummaryCache: async () => null,
        saveSummaryCache: async () => true,
        saveUsageStats: async () => ({}),
        getPageContent: async () => { pageContentCalled = true; return { title: "T", url: "u", text: "p" }; },
        callGeminiStream: async (_k, _m, _p, text, _s, onChunk, onUsage) => {
            textSentToApi = text;
            onChunk("Resum selecció.");
            onUsage({ promptTokenCount: 50, candidatesTokenCount: 20 });
            return { inputTokens: 50, outputTokens: 20, cacheTokens: 0 };
        },
    });

    const ctx = makeCtx();
    await startSummary(ctx, "Text seleccionat per l'usuari.", false, false, true);

    assert.ok(!pageContentCalled, "getPageContent NO s'ha de cridar si hi ha overrideText");
    assert.ok(textSentToApi?.includes("Text seleccionat per l'usuari."),
        "El text de selecció ha d'arribar a l'API");
});
