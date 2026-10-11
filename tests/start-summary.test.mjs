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
// Regressió: ctx.setAbortController es crida SÍNCRONAMENT (abans del primer
// await), perquè el botó "atura" pugui abortar durant tota l'streaming i no
// només un cop la generació ja ha acabat (bug: sidebar.js no rebia
// l'AbortController fins que la promesa de startSummary es resolia).
// ---------------------------------------------------------------------------

test("startSummary - crida ctx.setAbortController síncronament, abans de qualsevol await", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });
    setupGlobals();

    let capturedController = null;
    const ctx = makeCtx({
        setAbortController: (ctrl) => { capturedController = ctrl; },
    });

    const promise = startSummary(ctx, null, false, false, true);
    // Una funció async corre síncronament fins al primer await: si
    // setAbortController es crida abans (com ha de ser), capturedController
    // ja ha de tenir valor AQUÍ, abans d'esperar la resolució de `promise`.
    assert.ok(capturedController instanceof AbortController,
        "setAbortController s'ha de cridar de forma síncrona, abans del primer await");

    const resolved = await promise;
    assert.equal(resolved, capturedController,
        "l'AbortController retornat en resoldre's ha de ser el mateix que es va capturar síncronament");
});

// ---------------------------------------------------------------------------
// Regressió: avortar durant el fetch del contingut de la pàgina (abans que
// comenci la crida al model) ara mostra "Generació aturada", en lloc de
// tornar en silenci sense cap missatge (inconsistent amb l'abort dins d'un
// stream actiu, que sí que l'ha mostrat sempre). Només reproduïble des que
// ctx.setAbortController permet capturar l'AbortController real.
// ---------------------------------------------------------------------------

test("startSummary - avortar durant el fetch de contingut mostra 'aturada' (no torna en silenci)", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });

    let capturedController = null;
    setupGlobals({
        getPageContent: async () => {
            capturedController.abort();
            return { title: "Test", url: "https://example.com", text: "text" };
        },
    });

    const ctx = makeCtx({
        setAbortController: (ctrl) => { capturedController = ctrl; },
    });
    await startSummary(ctx, null, false, false, true);

    assert.ok(ctx.errorDiv.textContent.includes("aturada"),
        `errorDiv ha de mostrar el missatge d'aturada, té: "${ctx.errorDiv.textContent}"`);
    assert.ok(!ctx.errorDiv.classList.contains("hidden"), "errorDiv ha de ser visible");
});

// ---------------------------------------------------------------------------
// Regressió: el preload d'un sol ús (PDF local) es neteja després de
// consumir-se, perquè no contamini un resum posterior d'una altra pestanya
// (bug: contentPreload no es reiniciava mai a sidebar.js).
// ---------------------------------------------------------------------------

test("startSummary - neteja el preload després de consumir-lo (PDF local no contamina el resum següent)", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });

    let preloadPromise = Promise.resolve({
        title: "Informe.pdf",
        text: "TEXT_EXCLUSIU_DEL_PDF_LOCAL",
        url: "pdf-local:informe.pdf",
    });

    const capturedTexts = [];
    setupGlobals({
        callGeminiStream: async (_k, _m, _p, text, _s, onChunk, onUsage) => {
            capturedTexts.push(text);
            onChunk("Resum.");
            onUsage({ promptTokenCount: 10, candidatesTokenCount: 5 });
            return { inputTokens: 10, outputTokens: 5, cacheTokens: 0 };
        },
        getPageContent: async () => ({
            title: "Pàgina normal",
            url: "https://example.com",
            text: "TEXT_DE_LA_PAGINA_NORMAL",
        }),
    });

    const ctx1 = makeCtx({
        getContentPreload: () => preloadPromise,
        clearContentPreload: () => { preloadPromise = null; },
    });
    await startSummary(ctx1, null, false, false, true);
    assert.ok(capturedTexts[0].includes("TEXT_EXCLUSIU_DEL_PDF_LOCAL"),
        "El primer resum ha d'usar el text del PDF local preloaded");
    assert.equal(preloadPromise, null,
        "El preload s'ha de netejar just després de consumir-lo");

    // Segon resum (altra pestanya, sense preload nou): NO ha de reutilitzar
    // el text del PDF anterior.
    const ctx2 = makeCtx({
        getContentPreload: () => preloadPromise, // ja null
        clearContentPreload: () => { preloadPromise = null; },
    });
    await startSummary(ctx2, null, false, false, true);
    assert.ok(!capturedTexts[1].includes("TEXT_EXCLUSIU_DEL_PDF_LOCAL"),
        "El segon resum NO ha de contenir el text del PDF local anterior");
    assert.ok(capturedTexts[1].includes("TEXT_DE_LA_PAGINA_NORMAL"),
        "El segon resum ha d'usar el contingut fresc de la pàgina");
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
// Regressió: si el fallback canvia a un model amb un context window més
// petit, el prompt s'ha de re-truncar per a AQUELL model (abans es truncava
// un sol cop per al model preferit i es reutilitzava tal qual, podent
// disparar un HTTP 400 no reintentable per al fallback i trencar tota la
// cadena de reintents).
// ---------------------------------------------------------------------------

test("startSummary - retrunca el prompt per model quan el fallback té un context window més petit", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-context-gran" });
    await localMock.set({ apiKey: "AIza_test_key" });

    const longText = "Paràgraf de contingut de prova. ".repeat(200); // ~6600 chars
    const promptsSent = {};
    setupGlobals({
        getSummaryCache: async () => null,
        saveSummaryCache: async () => true,
        saveUsageStats: async () => ({}),
        getPageContent: async () => ({
            title: "Test Page",
            url: "https://example.com",
            text: longText,
        }),
        CURATED_MODELS: [
            { id: "gemini-context-gran",  fallback: true, contextWindow: 1_000_000 },
            { id: "gemini-context-petit", fallback: true, contextWindow: 1_000 },
        ],
        callGeminiStream: async (_k, model, _p, text) => {
            promptsSent[model] = text;
            if (model === "gemini-context-gran") {
                const err = new Error("Quota exceeded");
                err.status = 429;
                throw err;
            }
            return { inputTokens: 10, outputTokens: 5, cacheTokens: 0 };
        },
    });

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true);

    assert.ok(!promptsSent["gemini-context-gran"].includes("Text truncated"),
        "El model amb context gran NO ha de rebre el prompt truncat");
    assert.ok(promptsSent["gemini-context-petit"].includes("Text truncated"),
        "El model amb context petit (fallback) SÍ ha de rebre el prompt retruncat per al seu límit");
    // Regressió: el tall no ha de deixar el wrapper <UNTRUSTED_CONTENT> obert.
    assert.ok(promptsSent["gemini-context-petit"].trim().endsWith("</UNTRUSTED_CONTENT>"),
        "Un prompt truncat ha d'acabar igualment amb el tancament </UNTRUSTED_CONTENT>");
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

// ---------------------------------------------------------------------------
// Regressió (0.1): sidebar.js re-renderitza currentMetadata.summary com a text
// en activar/desactivar la lectura biònica. Per al mapa conceptual i Anki el
// `summary` és un esquema/JSON: sense el tipus, l'extensió el pintava com a
// text i destruïa el panell. startSummary ha d'anotar currentMetadata.type.
// ---------------------------------------------------------------------------
for (const [label, args, expected] of [
    ["resum",       [false, false, true, false, false, false], "summary"],
    ["deepdive",    [true,  false, true, false, false, false], "deepdive"],
    ["science",     [false, true,  true, false, false, false], "science"],
    ["mapa",        [false, false, true, true,  false, false], "conceptmap"],
    ["explica-ho",  [false, false, true, false, true,  false], "simple"],
]) {
    test(`startSummary - anota currentMetadata.type = ${expected} (${label})`, async () => {
        resetStorage();
        await syncMock.set({ modelName: "gemini-2.0-flash" });
        await localMock.set({ apiKey: "AIza_test_key" });
        setupGlobals({
            getSummaryCache: async () => null,
            saveSummaryCache: async () => true,
            saveUsageStats: async () => ({}),
            callGeminiStream: async (_k, _m, _p, _t, _s, onChunk, onUsage) => {
                onChunk("- Node arrel\n  - Fill");
                onUsage({ promptTokenCount: 10, candidatesTokenCount: 5 });
                return { inputTokens: 10, outputTokens: 5, cacheTokens: 0 };
            },
        });
        // Globals que el harness base no defineix i només usen aquests modes
        global.DEFAULT_SIMPLE_PROMPT = "Explica-ho fàcil.";
        global.DEFAULT_CONCEPTMAP_PROMPT = "Mapa conceptual.";
        global.renderMarkmapInteractive = () => ({});
        const ctx = makeCtx();
        const [isDeepDive, isScience, isUser, isConceptMap, isSimple, isAnki] = args;
        await startSummary(ctx, null, isDeepDive, isScience, isUser, isConceptMap, isSimple, isAnki);
        assert.equal(ctx.currentMetadata.type, expected);
    });
}

// ---------------------------------------------------------------------------
// Regressió (0.5): un timeout d'inactivitat (TimeoutError) és reintentable amb
// el model següent, i si l'usuari no ha aturat res no se li diu que sí.
// ---------------------------------------------------------------------------
test("startSummary - timeout d'inactivitat: prova el model següent", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });

    const modelsTried = [];
    setupGlobals({
        getSummaryCache: async () => null,
        saveSummaryCache: async () => true,
        saveUsageStats: async () => ({}),
        CURATED_MODELS: [
            { id: "gemini-2.0-flash", fallback: true, contextWindow: 100_000 },
            { id: "gemini-2.5-flash", fallback: true, contextWindow: 100_000 },
        ],
        callGeminiStream: async (_k, model, _p, _t, _s, onChunk, onUsage) => {
            modelsTried.push(model);
            if (model === "gemini-2.0-flash") {
                throw new DOMException("Idle timeout", "TimeoutError");
            }
            onChunk("Resum del segon model.");
            onUsage({ promptTokenCount: 10, candidatesTokenCount: 5 });
            return { inputTokens: 10, outputTokens: 5, cacheTokens: 0 };
        },
    });

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true);

    assert.deepEqual(modelsTried, ["gemini-2.0-flash", "gemini-2.5-flash"]);
    assert.ok(ctx.currentMetadata.summary.includes("Resum del segon model."));
});

test("startSummary - AbortError sense aturada de l'usuari no diu 'aturada per l'usuari'", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });

    setupGlobals({
        getSummaryCache: async () => null,
        CURATED_MODELS: [{ id: "gemini-2.0-flash", fallback: true, contextWindow: 100_000 }],
        callGeminiStream: async () => {
            throw new DOMException("The operation was aborted.", "AbortError");
        },
    });

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true);

    assert.ok(!ctx.errorDiv.textContent.includes("aturada per l'usuari"),
        `No s'ha de culpar l'usuari, té: "${ctx.errorDiv.textContent}"`);
    assert.ok(ctx.errorDiv.textContent.length > 0, "Ha de mostrar algun error");
});

// ---------------------------------------------------------------------------
// Regressió (0.4): si tots els models fallen per 503 no es pot dir «quota».
// ---------------------------------------------------------------------------
function setupAllFail(makeErr) {
    setupGlobals({
        getSummaryCache: async () => null,
        CURATED_MODELS: [
            { id: "gemini-2.0-flash", fallback: true, contextWindow: 100_000 },
            { id: "gemini-2.5-flash", fallback: true, contextWindow: 100_000 },
        ],
        callGeminiStream: async (_k, model) => { throw makeErr(model); },
    });
}

test("startSummary - tots els models fallen per 503: missatge de servei, no de quota", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });
    setupAllFail(() => Object.assign(new Error("overloaded"), { status: 503 }));

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true);

    assert.ok(ctx.errorDiv.textContent.includes("no està disponible"),
        `Ha de dir que el servei no està disponible, té: "${ctx.errorDiv.textContent}"`);
    assert.ok(!ctx.errorDiv.textContent.includes("quota"));
});

test("startSummary - tots els models amb timeout: missatge de connexió", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });
    setupAllFail(() => new DOMException("Idle timeout", "TimeoutError"));

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true);

    assert.ok(ctx.errorDiv.textContent.includes("ha expirat"),
        `Ha de parlar d'expiració, té: "${ctx.errorDiv.textContent}"`);
});

test("startSummary - barreja de 429 i 503: si algun model ha topat amb quota, es diu quota", async () => {
    resetStorage();
    await syncMock.set({ modelName: "gemini-2.0-flash" });
    await localMock.set({ apiKey: "AIza_test_key" });
    setupAllFail((model) => Object.assign(new Error("x"), {
        status: model === "gemini-2.0-flash" ? 429 : 503,
    }));

    const ctx = makeCtx();
    await startSummary(ctx, null, false, false, true);

    assert.ok(ctx.errorDiv.textContent.includes("quota"),
        `Ha de dir quota, té: "${ctx.errorDiv.textContent}"`);
});
