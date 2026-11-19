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
        addEventListener() {},
        setAttribute() {},
        append(...nodes) { nodes.forEach(n => (this._children = this._children || []).push(n)); },
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
    global.setLoadingStage = (m) => { (global.__stages = global.__stages || []).push(m); };
    global.announceStatus = () => {};
    global.isProseType = (t) => t !== "conceptmap" && t !== "anki";
    global.applyExtensionVisibility = () => {};
    global.applyExtensionOrder     = () => {};

    global.document = {
        getElementById: () => makeEl(),
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
Object.assign(global, require("../sidebar/utils.js"));

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
// Regressió: si el model no retorna cap targeta vàlida, NO es cacheja el
// resultat (abans es guardava igualment, deixant una entrada d'Historial
// permanentment trencada i irrecuperable) i es mostra un error a l'usuari.
// ---------------------------------------------------------------------------

test("anki pipeline - sense targetes vàlides: NO cacheja i mostra error", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash", ankiLang: "ca" });
    await localMock.set({ apiKey: "AIza_test_key" });

    let cacheSaved = false;
    setupGlobals({
        getSummaryCache: async () => null,
        saveSummaryCache: async () => { cacheSaved = true; return true; },
        saveUsageStats: async () => ({}),
        callGeminiStream: async (_k, _m, _p, _t, _s, onChunk, onUsage) => {
            onChunk("Ho sento, no puc generar targetes d'això.");
            onUsage({ promptTokenCount: 50, candidatesTokenCount: 20 });
            return { inputTokens: 50, outputTokens: 20, cacheTokens: 0 };
        },
    });

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true, false, false, true);

    assert.ok(!cacheSaved, "saveSummaryCache NO s'ha de cridar sense targetes vàlides");
    assert.ok(ctx.errorDiv.textContent.length > 0, "S'ha de mostrar un missatge d'error");
    assert.ok(!ctx.errorDiv.classList.contains("hidden"), "errorDiv ha de ser visible");
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

// ---------------------------------------------------------------------------
// Test 6: Afinar (focus) NO exclou les preguntes existents
// ---------------------------------------------------------------------------

test("anki - Afinar (focus) NO exclou les preguntes existents", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash", ankiLang: "ca", ankiPacket: 5 });
    await localMock.set({ apiKey: "AIza_test_key" });

    let captured = null;
    global.window = { __ankiPageText: "Contingut de prova per generar targetes." };
    setupGlobals({
        callGeminiStream: async (_k, _m, prompt, _t, _s, onChunk) => {
            captured = prompt;
            onChunk('[{"q":"NOVA?","a":"R"}]');
            return { inputTokens: 1, outputTokens: 1, cacheTokens: 0 };
        },
    });
    global.window = { __ankiPageText: "Contingut de prova per generar targetes." };

    global.setAnkiCards([{ q: "EXISTENT?", a: "1" }]);
    const ctx = { contentDiv: makeEl(), errorDiv: makeEl(), getGlobalConfig: () => ({}) };

    await global.generateMoreAnkiCards(ctx, "dates i xifres");

    assert.ok(captured && captured.includes("dates i xifres"), "ha d'incloure el focus");
    assert.ok(!captured.includes("EXISTENT?"), "amb focus NO ha d'excloure les existents");
});

// ---------------------------------------------------------------------------
// Test 7: Generar més (sense focus) SÍ exclou les existents
// ---------------------------------------------------------------------------

test("anki - Generar més (sense focus) SÍ exclou les existents", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash", ankiLang: "ca", ankiPacket: 5 });
    await localMock.set({ apiKey: "AIza_test_key" });

    let captured = null;
    setupGlobals({
        callGeminiStream: async (_k, _m, prompt, _t, _s, onChunk) => {
            captured = prompt;
            onChunk('[{"q":"NOVA?","a":"R"}]');
            return { inputTokens: 1, outputTokens: 1, cacheTokens: 0 };
        },
    });
    global.window = { __ankiPageText: "Contingut de prova." };

    global.setAnkiCards([{ q: "EXISTENT?", a: "1" }]);
    const ctx = { contentDiv: makeEl(), errorDiv: makeEl(), getGlobalConfig: () => ({}) };

    await global.generateMoreAnkiCards(ctx, "");

    assert.ok(captured && captured.includes("EXISTENT?"), "sense focus ha d'excloure les existents");
});

// ---------------------------------------------------------------------------
// Regressió: guard de re-entrada. Un doble clic a "Genera més"/"Afinar"
// mentre la primera petició encara està en curs no ha de disparar una
// segona crida concurrent (podia duplicar/entrellaçar targetes i botons
// que es recreen a cada render podien perdre l'estat "disabled").
// ---------------------------------------------------------------------------

test("anki - generateMoreAnkiCards: una crida concurrent mentre la primera és en curs s'ignora", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash", ankiLang: "ca", ankiPacket: 5 });
    await localMock.set({ apiKey: "AIza_test_key" });

    let callCount = 0;
    let resolveFirst;
    const firstCallGate = new Promise(r => { resolveFirst = r; });
    setupGlobals({
        callGeminiStream: async (_k, _m, _p, _t, _s, onChunk) => {
            callCount++;
            await firstCallGate; // manté la primera crida "en curs" fins que el test la desbloqueja
            onChunk('[{"q":"NOVA?","a":"R"}]');
            return { inputTokens: 1, outputTokens: 1, cacheTokens: 0 };
        },
    });
    global.window = { __ankiPageText: "Contingut de prova." };
    global.setAnkiCards([]);
    const ctx = { contentDiv: makeEl(), errorDiv: makeEl(), getGlobalConfig: () => ({}) };

    const p1 = global.generateMoreAnkiCards(ctx, "");
    const p2 = global.generateMoreAnkiCards(ctx, ""); // concurrent, s'ha d'ignorar
    resolveFirst();
    await Promise.all([p1, p2]);

    assert.equal(callCount, 1,
        "callGeminiStream NOMÉS s'ha de cridar un cop; la crida concurrent s'ha d'ignorar");
});

// ---------------------------------------------------------------------------
// N06: «Generar més» amb text llarg → es trunca segons el context del model
// ---------------------------------------------------------------------------

test("anki - generateMoreAnkiCards: trunca el text segons el context window del model", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash", ankiLang: "ca", ankiPacket: 5 });
    await localMock.set({ apiKey: "AIza_test_key" });

    let capturedText = null;
    setupGlobals({
        callGeminiStream: async (_k, _m, _p, text, _s, onChunk) => {
            capturedText = text;
            onChunk('[{"q":"NOVA?","a":"R"}]');
            return { inputTokens: 10, outputTokens: 5, cacheTokens: 0 };
        },
    });
    // Context petit per forçar el truncament (80 % de 100 = 80 tokens ≈ 320 chars)
    global.CURATED_MODELS = [{ id: "gemini-2.0-flash", contextWindow: 100 }];
    global.window = {
        __ankiPageText: "x".repeat(5000),
        __ankiMeta: { url: "https://example.com/a", title: "A" },
    };
    global.setAnkiCards([]);
    const ctx = { contentDiv: makeEl(), errorDiv: makeEl(), getGlobalConfig: () => ({}) };

    await global.generateMoreAnkiCards(ctx, "");

    assert.ok(capturedText.includes("Text truncated due to model limits"),
        "el text enviat ha d'anar truncat per al model");
    assert.ok(capturedText.endsWith("</UNTRUSTED_CONTENT>"),
        "el bloc UNTRUSTED no pot quedar obert");
});

// ---------------------------------------------------------------------------
// N06: fallback de models, estadístiques i persistència de les targetes noves
// ---------------------------------------------------------------------------

test("anki - generateMoreAnkiCards: si el model preferit falla, prova el següent i desa a caché i stats", async () => {
    resetStorage();
    await syncMock.set({ modelName: "m-bad", ankiLang: "ca", ankiPacket: 5 });
    await localMock.set({ apiKey: "AIza_test_key" });

    const calls = [];
    let cached = null;
    let stats = null;
    setupGlobals({
        buildFallbackList: () => ["m-bad", "m-good"],
        callGeminiStream: async (_k, model, _p, _t, _s, onChunk) => {
            calls.push(model);
            if (model === "m-bad") throw new Error("quota exceeded");
            onChunk('[{"q":"NOVA?","a":"R"}]');
            return { inputTokens: 50, outputTokens: 20, cacheTokens: 0 };
        },
        saveSummaryCache: async (url, title, content, model, input, output, type) => {
            cached = { url, title, content, model, input, output, type };
            return true;
        },
        saveUsageStats: async (input, output, type, model) => {
            stats = { input, output, type, model };
            return {};
        },
    });
    global.window = {
        __ankiPageText: "Contingut de prova.",
        __ankiMeta: { url: "https://example.com/a", title: "A" },
    };
    global.setAnkiCards([]);
    const ctx = { contentDiv: makeEl(), errorDiv: makeEl(), getGlobalConfig: () => ({}) };

    await global.generateMoreAnkiCards(ctx, "");

    assert.deepEqual(calls, ["m-bad", "m-good"], "ha de provar el model següent");
    assert.equal(global.getAnkiCards().length, 1, "la targeta del model bo s'ha d'afegir");
    assert.ok(cached, "s'ha de desar a la memòria cau");
    assert.equal(cached.type, "anki");
    assert.equal(cached.model, "m-good");
    assert.ok(cached.content.startsWith("<!--anki-->\n"));
    assert.ok(cached.content.includes("NOVA?"), "la caché ha de contenir la targeta nova");
    assert.deepEqual(stats, { input: 50, output: 20, type: "anki", model: "m-good" });
});
