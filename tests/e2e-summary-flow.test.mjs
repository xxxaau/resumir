/**
 * tests/e2e-summary-flow.test.mjs
 *
 * Test E2E del golden path complet:
 *   getPageContent (mock) → startSummary → callGeminiStream (fetch SSE mock)
 *   → saveSummaryCache (real) → saveUsageStats (real)
 *   → getSummaryCache confirma que la caché s'ha desat
 *
 * Execució: node --test tests/e2e-summary-flow.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createStorageMock } from "./helpers/storage-mock.mjs";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Helpers DOM mínims (reutilitzat de start-summary.test.mjs)
// ---------------------------------------------------------------------------

function makeEl() {
    return {
        textContent: "",
        style: {},
        classList: {
            _c: new Set(),
            add(...c)    { c.forEach(x => this._c.add(x)); },
            remove(...c) { c.forEach(x => this._c.delete(x)); },
            contains(c)  { return this._c.has(c); },
        },
        replaceChildren() { this._children = []; },
        appendChild(n)    { (this._children = this._children || []).push(n); return n; },
        querySelector()   { return null; },
        value: "",
        options: [],
        _children: [],
    };
}

function makeCtx(overrides = {}) {
    return {
        contentDiv:      makeEl(),
        errorDiv:        makeEl(),
        modelSelect:     { value: "gemini-2.0-flash", options: [], appendChild() {} },
        currentMetadata: { title: "", url: "", summary: "", fromCache: false },
        getSourceText:   () => "",
        setSourceText:   () => {},
        getContentPreload: () => null,
        isBionicEnabled:  () => false,
        getGlobalConfig:  () => ({}),
        onPageIdentified: () => {},
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Utilitat SSE: construeix un stream de Server-Sent Events Gemini
// ---------------------------------------------------------------------------

function buildGeminiSSEStream(chunks) {
    const lines = [];
    for (const text of chunks) {
        const payload = JSON.stringify({
            candidates: [{ content: { parts: [{ text }] } }],
            usageMetadata: {
                promptTokenCount: 100,
                candidatesTokenCount: chunks.reduce((s, c) => s + c.length, 0),
                cachedContentTokenCount: 0,
            },
        });
        lines.push(`data: ${payload}`);
        lines.push("");
    }
    return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Setup global compartit
// ---------------------------------------------------------------------------

const storageMock = createStorageMock();

function setupE2EGlobals() {
    global.ext = {
        storage: {
            sync:  {
                get: (k) => storageMock.get(k),
                set: async () => {},
            },
            local: storageMock,
        },
        tabs: {
            query: async () => [{ url: "https://example.com/article", title: "Article de Prova" }],
        },
        runtime: { openOptionsPage: () => {} },
    };

    global.CURATED_MODELS = [
        { id: "gemini-2.0-flash", fallback: true,  contextWindow: 100_000 },
        { id: "gemini-2.5-flash", fallback: false, contextWindow: 100_000 },
    ];
    global.DEFAULT_MODEL_ID         = "gemini-2.0-flash";
    global.DEFAULT_SYSTEM_PROMPT    = "Resumeix el contingut.";
    global.DEFAULT_DEEP_DIVE_PROMPT = "Anàlisi profunda.";
    global.DEFAULT_SCIENCE_PROMPT   = "Validació científica.";

    // getPageContent mockat (evita scripting.executeScript del navegador)
    global.getPageContent = async () => ({
        title:   "Article de Prova",
        url:     "https://example.com/article",
        text:    "Aquest és el contingut complet de l'article de prova. ".repeat(10),
    });

    // Utilitats UI — no-ops
    global.estimateTokens           = (t) => Math.ceil(t.length / 4);
    global.formatTextToFragment     = (t) => t;
    global.setGeneratingState       = () => {};
    global.startGenerationTimer     = () => Date.now();
    global.stopGenerationTimer      = () => {};
    global.updateTokenStats         = () => {};
    global.applyExtensionVisibility = () => {};
    global.applyExtensionOrder      = () => {};

    global.document = {
        getElementById: () => makeEl(),
        createElement:  () => makeEl(),
    };
}

// ---------------------------------------------------------------------------
// Càrrega de mòduls (un cop globals configurats)
// ---------------------------------------------------------------------------

setupE2EGlobals();
await storageMock.set({ modelName: "gemini-2.0-flash" });
await storageMock.set({ apiKey: "AIza_e2e_test_key" });

const { callGeminiStream }                    = require("../sidebar/api.js");
const { getSummaryCache, saveSummaryCache,
        saveUsageStats }                       = require("../sidebar/cache.js");
const { startSummary }                        = require("../sidebar/summary.js");

// Injectem les implementacions reals al context global (startSummary les busca com a globals)
global.getSummaryCache  = getSummaryCache;
global.saveSummaryCache = saveSummaryCache;
global.saveUsageStats   = saveUsageStats;
global.callGeminiStream = callGeminiStream;

// ---------------------------------------------------------------------------
// Test E2E #1: golden path complet amb stream SSE real
// ---------------------------------------------------------------------------

test("E2E: getPageContent → startSummary → cache → stats (golden path)", async () => {
    storageMock._clear();
    await storageMock.set({ modelName: "gemini-2.0-flash", apiKey: "AIza_e2e_test_key" });

    const sseChunks = ["Primera part del resum. ", "Segona part. ", "Conclusió."];
    const sseBody   = buildGeminiSSEStream(sseChunks);

    // Mock fetch amb stream SSE real (ReadableStream)
    const encoder = new TextEncoder();
    global.fetch = async (url) => {
        if (!String(url).includes("generativelanguage")) {
            throw new Error(`fetch no esperat: ${url}`);
        }
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode(sseBody));
                controller.close();
            },
        });
        return {
            ok: true,
            status: 200,
            headers: { get: (h) => h.toLowerCase() === "content-type" ? "text/event-stream" : null },
            body: stream,
        };
    };

    const ctx = makeCtx();
    const ac  = await startSummary(ctx, null, false, false, true);

    // 1. Ha de retornar un AbortController
    assert.ok(ac instanceof AbortController, "Ha de retornar un AbortController");

    // 2. El resum ha d'incloure els chunks SSE
    const expectedText = sseChunks.join("");
    assert.equal(ctx.currentMetadata.summary, expectedText,
        `El resum ha de ser "${expectedText}", és "${ctx.currentMetadata.summary}"`);

    // 3. La caché ha de contenir l'entrada
    const cached = await getSummaryCache("https://example.com/article");
    assert.ok(cached !== null, "La caché ha de tenir l'entrada després de la generació");
    assert.equal(cached.summary, expectedText, "El resum a la caché ha de coincidir");
    assert.equal(cached.url, "https://example.com/article");
    assert.equal(cached.model, "gemini-2.0-flash");

    // 4. L'historial d'ús ha de tenir una entrada
    const histData = await storageMock.get("usageHistory");
    assert.ok(Array.isArray(histData.usageHistory) && histData.usageHistory.length >= 1,
        "usageHistory ha de tenir almenys una entrada");
    const lastEntry = histData.usageHistory[0];
    assert.equal(lastEntry.url, "https://example.com/article");
    assert.equal(lastEntry.model, "gemini-2.0-flash");
});

// ---------------------------------------------------------------------------
// Test E2E #2: segon trigger retorna caché (sense nova crida a l'API)
// ---------------------------------------------------------------------------

test("E2E: segon trigger de la mateixa URL retorna resum de caché", async () => {
    // Partim de l'estat final del test anterior (caché ja poblada)
    // Si el test anterior ha fallat, reset i re-poblem manualment
    let cached = await getSummaryCache("https://example.com/article");
    if (!cached) {
        await saveSummaryCache(
            "https://example.com/article",
            "Article de Prova",
            "Resum pre-carregat a caché.",
            "gemini-2.0-flash",
            100, 50
        );
    }

    let apiCalled = false;
    global.fetch = async () => { apiCalled = true; throw new Error("No hauria de cridar fetch"); };

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true);

    assert.ok(!apiCalled, "El fetch de l'API NO s'ha de cridar si la caché és vàlida");
    assert.ok(ctx.currentMetadata.fromCache, "fromCache ha de ser true");
    assert.ok(ctx.currentMetadata.summary.length > 0, "El resum ha de venir de la caché");
});

// ---------------------------------------------------------------------------
// Test E2E #3: fallback de quota — primer model 429, segon model OK (stream SSE)
// ---------------------------------------------------------------------------

test("E2E: fallback de quota amb stream SSE — primer model 429, segon model OK", async () => {
    storageMock._clear();
    // favoriteModels inclou el segon model perquè buildFallbackList l'afegixi a la llista
    await storageMock.set({
        modelName: "gemini-2.0-flash",
        apiKey: "AIza_e2e_test_key",
        favoriteModels: ["gemini-2.5-flash"],
    });

    const modelsAttempted = [];
    const encoder = new TextEncoder();
    const sseBody = buildGeminiSSEStream(["Resum del model de fallback."]);

    global.fetch = async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("gemini-2.0-flash")) {
            modelsAttempted.push("gemini-2.0-flash");
            return {
                ok: false,
                status: 429,
                headers: { get: () => "application/json" },
                json: async () => ({ error: { message: "Quota exceeded" } }),
            };
        }
        if (urlStr.includes("gemini-2.5-flash")) {
            modelsAttempted.push("gemini-2.5-flash");
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(sseBody));
                    controller.close();
                },
            });
            return {
                ok: true,
                status: 200,
                headers: { get: (h) => h.toLowerCase() === "content-type" ? "text/event-stream" : null },
                body: stream,
            };
        }
        throw new Error(`fetch no esperat: ${url}`);
    };

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true);

    assert.ok(modelsAttempted.includes("gemini-2.0-flash"), "Ha d'intentar el primer model");
    assert.ok(modelsAttempted.includes("gemini-2.5-flash"), "Ha de fer fallback al segon model");
    assert.ok(ctx.currentMetadata.summary.includes("Resum del model de fallback."),
        `El resum ha de ser del model de fallback, és: "${ctx.currentMetadata.summary}"`);

    const cached = await getSummaryCache("https://example.com/article");
    assert.ok(cached !== null, "La caché ha de tenir el resum del model de fallback");
    assert.equal(cached.model, "gemini-2.5-flash", "La caché ha de registrar el model que ha funcionat");
});
