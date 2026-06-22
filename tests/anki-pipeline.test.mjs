/**
 * tests/anki-pipeline.test.mjs
 * Tests d'integració del pipeline Anki: flag isAnki, selecció de prompt,
 * contentType i desviació del render a setAnkiCards.
 * Execució: node --test tests/anki-pipeline.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createStorageMock } from "./helpers/storage-mock.mjs";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Helpers DOM mínims (mateixos que a start-summary.test.mjs)
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
// Storage mocks
// ---------------------------------------------------------------------------

const syncMock = createStorageMock();
const localMock = createStorageMock();

function resetStorage() {
    syncMock._clear();
    localMock._clear();
}

// ---------------------------------------------------------------------------
// Configuració de globals
// ---------------------------------------------------------------------------

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
        { id: "gemini-2.0-flash", fallback: true, contextWindow: 100_000 },
    ];
    global.DEFAULT_MODEL_ID        = "gemini-2.0-flash";
    global.DEFAULT_SYSTEM_PROMPT   = "Resumeix el contingut.";
    global.DEFAULT_DEEP_DIVE_PROMPT = "Anàlisi profunda.";
    global.DEFAULT_SCIENCE_PROMPT   = "Validació científica.";
    global.DEFAULT_BIONIC = { fixation: 20, font: "system-ui, sans-serif", weight: "600", fontSize: "1.2em", lineHeight: "1.5" };

    global.getSummaryCache  = async () => null;
    global.saveSummaryCache = async () => true;
    global.saveUsageStats   = async () => ({});

    global.callGeminiStream = async (_key, _model, _prompt, _text, _signal, onChunk, onUsage) => {
        onChunk('[{"q":"P","a":"R"}]');
        onUsage({ promptTokenCount: 50, candidatesTokenCount: 20 });
        return { inputTokens: 50, outputTokens: 20, cacheTokens: 0 };
    };

    global.getPageContent = async () => ({
        title: "Test Page",
        url: "https://example.com",
        text: "Contingut de la pàgina de prova.",
    });

    global.estimateTokens          = (t) => Math.ceil(t.length / 4);
    global.formatTextToFragment    = (t) => t;
    global.renderMarkmapInteractive = () => makeEl();
    global.setGeneratingState      = () => {};
    global.startGenerationTimer    = () => Date.now();
    global.stopGenerationTimer     = () => {};
    global.updateTokenStats        = () => {};
    global.applyExtensionVisibility = () => {};
    global.applyExtensionOrder     = () => {};

    global.document = {
        getElementById: (_id) => makeEl(),
        createElement: () => makeEl(),
    };

    Object.assign(global, overrides);
}

// ---------------------------------------------------------------------------
// Càrrega de mòduls — ordre important: primer globals, després require
// ---------------------------------------------------------------------------

// Globals Anki i defaults com a globals del bundle
Object.assign(global, require("../sidebar/anki.js"));
Object.assign(global, require("../shared/defaults.js"));

// El renderAnkiPanel real crida document.createElement → substituïm per un stub
// que deixa que setAnkiCards (real) s'executi sense problemes de DOM
global.renderAnkiPanel = () => {};

setupGlobals();
await syncMock.set({ modelName: "gemini-2.0-flash", ankiLang: "ca" });
await localMock.set({ apiKey: "AIza_test_key" });

const { startSummary } = require("../sidebar/summary.js");

// ---------------------------------------------------------------------------
// Test 1: prompt conté "català" i "JSON" quan ankiLang=ca
// ---------------------------------------------------------------------------

test("anki pipeline - el prompt conté 'català' i 'JSON' (ankiLang=ca)", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash", ankiLang: "ca" });
    await localMock.set({ apiKey: "AIza_test_key" });

    let capturedPrompt = null;
    setupGlobals({
        getSummaryCache: async () => null,
        saveSummaryCache: async () => true,
        saveUsageStats: async () => ({}),
        callGeminiStream: async (_k, _m, prompt, _t, _s, onChunk, onUsage) => {
            capturedPrompt = prompt;
            onChunk('[{"q":"P","a":"R"}]');
            onUsage({ promptTokenCount: 50, candidatesTokenCount: 20 });
            return { inputTokens: 50, outputTokens: 20, cacheTokens: 0 };
        },
    });

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true, false, false, true);

    assert.ok(capturedPrompt !== null, "El prompt no pot ser null");
    assert.ok(
        capturedPrompt.includes("català"),
        `El prompt ha de contenir 'català', té: "${capturedPrompt.substring(0, 200)}"`
    );
    assert.ok(
        capturedPrompt.toLowerCase().includes("json"),
        `El prompt ha de contenir 'JSON', té: "${capturedPrompt.substring(0, 200)}"`
    );
});

// ---------------------------------------------------------------------------
// Test 2: contentType === "anki" a la caché i estadístiques
// ---------------------------------------------------------------------------

test("anki pipeline - contentType és 'anki'", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash", ankiLang: "ca" });
    await localMock.set({ apiKey: "AIza_test_key" });

    let savedContentType = null;
    setupGlobals({
        getSummaryCache: async () => null,
        saveSummaryCache: async (_url, _title, _summary, _model, _in, _out, contentType) => {
            savedContentType = contentType;
            return true;
        },
        saveUsageStats: async () => ({}),
        callGeminiStream: async (_k, _m, _p, _t, _s, onChunk, onUsage) => {
            onChunk('[{"q":"P","a":"R"}]');
            onUsage({ promptTokenCount: 50, candidatesTokenCount: 20 });
            return { inputTokens: 50, outputTokens: 20, cacheTokens: 0 };
        },
    });

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true, false, false, true);

    assert.equal(savedContentType, "anki", `contentType ha de ser 'anki', té: "${savedContentType}"`);
});

// ---------------------------------------------------------------------------
// Test 3: getAnkiCards() té 1 targeta amb q="P"
// ---------------------------------------------------------------------------

test("anki pipeline - setAnkiCards ha processat la resposta del model (1 targeta)", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash", ankiLang: "ca" });
    await localMock.set({ apiKey: "AIza_test_key" });

    setupGlobals({
        getSummaryCache: async () => null,
        saveSummaryCache: async () => true,
        saveUsageStats: async () => ({}),
        callGeminiStream: async (_k, _m, _p, _t, _s, onChunk, onUsage) => {
            onChunk('[{"q":"P","a":"R"}]');
            onUsage({ promptTokenCount: 50, candidatesTokenCount: 20 });
            return { inputTokens: 50, outputTokens: 20, cacheTokens: 0 };
        },
    });

    // Reiniciem l'estat Anki abans del test
    global.setAnkiCards([]);

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true, false, false, true);

    const cards = global.getAnkiCards();
    assert.equal(cards.length, 1, `Ha d'haver-hi 1 targeta, n'hi ha: ${cards.length}`);
    assert.equal(cards[0].q, "P", `La pregunta ha de ser 'P', és: "${cards[0].q}"`);
});

// ---------------------------------------------------------------------------
// Test 4: ankiLang="en" → el prompt conté "English" i NO "català"
// Depèn que "ankiLang" estigui a la llista de claus de storage.sync.get;
// si no hi és, config.ankiLang seria undefined i el prompt usaria el default
// català, fent fallar les dues assertions.
// ---------------------------------------------------------------------------

test("anki pipeline - ankiLang='en' → el prompt conté 'English' i no 'català'", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash", ankiLang: "en" });
    await localMock.set({ apiKey: "AIza_test_key" });

    let capturedPrompt = null;
    setupGlobals({
        getSummaryCache: async () => null,
        saveSummaryCache: async () => true,
        saveUsageStats: async () => ({}),
        callGeminiStream: async (_k, _m, prompt, _t, _s, onChunk, onUsage) => {
            capturedPrompt = prompt;
            onChunk('[{"q":"P","a":"R"}]');
            onUsage({ promptTokenCount: 50, candidatesTokenCount: 20 });
            return { inputTokens: 50, outputTokens: 20, cacheTokens: 0 };
        },
    });

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true, false, false, true);

    assert.ok(capturedPrompt !== null, "El prompt no pot ser null");
    assert.ok(
        capturedPrompt.includes("English"),
        `El prompt ha de contenir 'English', té: "${capturedPrompt.substring(0, 300)}"`
    );
    assert.ok(
        !capturedPrompt.includes("català"),
        `El prompt NO ha de contenir 'català' quan ankiLang=en, té: "${capturedPrompt.substring(0, 300)}"`
    );
});

// ---------------------------------------------------------------------------
// Test 5: guard — retorna null si isAnki=false i cap altre flag actiu
// ---------------------------------------------------------------------------

test("anki pipeline - guard: retorna null sense flags actius (comportament existent no trencat)", async () => {
    resetStorage();
    const ctx = makeCtx();
    const result = await startSummary(ctx, null, false, false, false, false, false, false);
    assert.equal(result, null, "Ha de retornar null si no hi ha cap flag actiu");
});
