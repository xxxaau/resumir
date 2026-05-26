/**
 * tests/pdf-extract.test.mjs
 * Tests unitaris per a sidebar/pdf-extract.js
 * Execució: node --test tests/pdf-extract.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Mocks globals
// ---------------------------------------------------------------------------

/**
 * Crea un mock de pdfjsLib injectable al globalThis.
 * @param {Object} opts
 * @param {number} [opts.numPages=1]              Total de pàgines del document
 * @param {Array<Array<string>>} [opts.pageTexts] Array de pàgines, cadascuna amb array d'strings
 * @param {boolean} [opts.passwordRequired]       Llança PasswordException a getDocument().promise
 * @param {boolean} [opts.corrupt]                Llança Error genèric a getDocument().promise
 * @param {number}  [opts.loadingDelayMs]         Delay artificial per testejar timeouts
 * @param {string}  [opts.title]                  Títol retornat per getMetadata
 */
function makePdfjsMock({
    numPages = 1,
    pageTexts = [["sample text"]],
    passwordRequired = false,
    corrupt = false,
    loadingDelayMs = 0,
    title = "Mocked Doc",
} = {}) {
    let destroyed = false;
    return {
        version: "3.11.174-mock",
        GlobalWorkerOptions: { workerSrc: null },
        getDocument: () => ({
            promise: (async () => {
                if (loadingDelayMs > 0) await new Promise(r => setTimeout(r, loadingDelayMs));
                if (passwordRequired) {
                    const err = new Error("Password required");
                    err.name = "PasswordException";
                    throw err;
                }
                if (corrupt) throw new Error("Invalid PDF structure");
                return {
                    numPages,
                    getMetadata: async () => ({ info: { Title: title } }),
                    getPage: async (i) => ({
                        getTextContent: async () => ({
                            items: (pageTexts[i - 1] || []).map(s => ({ str: s }))
                        }),
                        cleanup: () => {}
                    }),
                    destroy: () => { destroyed = true; },
                    _wasDestroyed: () => destroyed,
                };
            })()
        })
    };
}

function installMocks(pdfjsMock) {
    global.pdfjsLib = pdfjsMock;
    global.ext = {
        runtime: { getURL: (path) => `chrome-extension://mock/${path}` }
    };
    // Reset el worker init flag perquè cada test parteixi de zero
    const mod = require("../sidebar/pdf-extract.js");
    mod._resetWorkerInit();
    return mod;
}

function cleanupMocks() {
    delete global.pdfjsLib;
    delete global.ext;
}

// ---------------------------------------------------------------------------
// isPdfUrl
// ---------------------------------------------------------------------------

test("isPdfUrl: detecta URLs amb .pdf al path", () => {
    const { isPdfUrl } = installMocks(makePdfjsMock());
    assert.equal(isPdfUrl("https://example.com/doc.pdf"), true);
    assert.equal(isPdfUrl("file:///C:/docs/article.pdf"), true);
    assert.equal(isPdfUrl("https://arxiv.org/pdf/2401.12345.pdf"), true);
    cleanupMocks();
});

test("isPdfUrl: detecta .pdf amb query params i fragments", () => {
    const { isPdfUrl } = installMocks(makePdfjsMock());
    assert.equal(isPdfUrl("https://example.com/doc.pdf?token=abc"), true);
    assert.equal(isPdfUrl("https://example.com/doc.pdf#page=3"), true);
    assert.equal(isPdfUrl("https://example.com/download?file=foo.pdf"), true);
    cleanupMocks();
});

test("isPdfUrl: rebutja URLs no-PDF", () => {
    const { isPdfUrl } = installMocks(makePdfjsMock());
    assert.equal(isPdfUrl("https://example.com/article"), false);
    assert.equal(isPdfUrl("https://example.com/page.html"), false);
    assert.equal(isPdfUrl("https://youtube.com/watch?v=abc"), false);
    cleanupMocks();
});

test("isPdfUrl: gestiona entrades invàlides sense petar", () => {
    const { isPdfUrl } = installMocks(makePdfjsMock());
    assert.equal(isPdfUrl(null), false);
    assert.equal(isPdfUrl(undefined), false);
    assert.equal(isPdfUrl(""), false);
    assert.equal(isPdfUrl("not a url"), false);
    assert.equal(isPdfUrl(42), false);
    cleanupMocks();
});

// ---------------------------------------------------------------------------
// extractPdfText — happy path
// ---------------------------------------------------------------------------

test("extractPdfText: extrau text de PDF amb 3 pàgines", async () => {
    const { extractPdfText } = installMocks(makePdfjsMock({
        numPages: 3,
        pageTexts: [
            ["First", "page", "content", "with enough text to pass the scanned-detection threshold"],
            ["Second", "page", "more", "content here that adds characters"],
            ["Third", "page", "wraps", "everything up nicely"]
        ]
    }));
    // Cal passar un ArrayBuffer per saltar el fetch
    const buf = new ArrayBuffer(8);
    const result = await extractPdfText(buf);
    assert.equal(result.pageCount, 3);
    assert.match(result.text, /First page content/);
    assert.match(result.text, /Second page more/);
    assert.match(result.text, /Third page wraps/);
    // Separador entre pàgines
    assert.match(result.text, /\n\n/);
    assert.equal(result.title, "Mocked Doc");
    assert.equal(result.metadata.extractedPages, 3);
    assert.equal(result.metadata.truncated, false);
    cleanupMocks();
});

test("extractPdfText: accepta Uint8Array directament", async () => {
    const longText = "Hello world this is sufficiently long text to pass scanned detection. ".repeat(3);
    const { extractPdfText } = installMocks(makePdfjsMock({
        numPages: 1,
        pageTexts: [[longText]]
    }));
    const u8 = new Uint8Array(16);
    const result = await extractPdfText(u8);
    assert.match(result.text, /Hello world/);
    cleanupMocks();
});

// ---------------------------------------------------------------------------
// extractPdfText — error paths
// ---------------------------------------------------------------------------

test("extractPdfText: PasswordException → code=PASSWORD", async () => {
    const { extractPdfText } = installMocks(makePdfjsMock({ passwordRequired: true }));
    await assert.rejects(
        extractPdfText(new ArrayBuffer(8)),
        (err) => err.code === "PASSWORD" && /contrasenya/i.test(err.message)
    );
    cleanupMocks();
});

test("extractPdfText: PDF corrupt → code=INVALID", async () => {
    const { extractPdfText } = installMocks(makePdfjsMock({ corrupt: true }));
    await assert.rejects(
        extractPdfText(new ArrayBuffer(8)),
        (err) => err.code === "INVALID" && /corrupt|invàlid/i.test(err.message)
    );
    cleanupMocks();
});

test("extractPdfText: PDF escanejat (text buit) → code=SCANNED", async () => {
    const { extractPdfText } = installMocks(makePdfjsMock({
        numPages: 5,
        pageTexts: [[""], [""], [""], [""], [""]]
    }));
    await assert.rejects(
        extractPdfText(new ArrayBuffer(8)),
        (err) => err.code === "SCANNED" && /escanejat/i.test(err.message)
    );
    cleanupMocks();
});

test("extractPdfText: massa pàgines → code=TOO_LARGE", async () => {
    const { extractPdfText } = installMocks(makePdfjsMock({ numPages: 1000 }));
    await assert.rejects(
        extractPdfText(new ArrayBuffer(8), { maxPages: 500 }),
        (err) => err.code === "TOO_LARGE" && err.pageCount === 1000
    );
    cleanupMocks();
});

test("extractPdfText: timeout durant loading → code=TIMEOUT", async () => {
    const { extractPdfText } = installMocks(makePdfjsMock({
        loadingDelayMs: 200
    }));
    await assert.rejects(
        extractPdfText(new ArrayBuffer(8), { timeoutMs: 50 }),
        (err) => err.code === "TIMEOUT"
    );
    cleanupMocks();
});

test("extractPdfText: pdfjsLib no carregat → code=NO_LIB", async () => {
    // No instal·lem el mock — pdfjsLib és undefined
    delete global.pdfjsLib;
    global.ext = { runtime: { getURL: () => "" } };
    const mod = require("../sidebar/pdf-extract.js");
    mod._resetWorkerInit();
    await assert.rejects(
        mod.extractPdfText(new ArrayBuffer(8)),
        (err) => err.code === "NO_LIB"
    );
    cleanupMocks();
});

test("extractPdfText: argument invàlid → code=INVALID_ARG", async () => {
    const { extractPdfText } = installMocks(makePdfjsMock());
    await assert.rejects(
        extractPdfText(42),
        (err) => err.code === "INVALID_ARG"
    );
    await assert.rejects(
        extractPdfText({}),
        (err) => err.code === "INVALID_ARG"
    );
    cleanupMocks();
});

// ---------------------------------------------------------------------------
// extractPdfText — fetch
// ---------------------------------------------------------------------------

test("extractPdfText: fetch fallat → code=FETCH_FAILED", async () => {
    const { extractPdfText } = installMocks(makePdfjsMock());
    const originalFetch = global.fetch;
    global.fetch = async () => { throw new Error("network down"); };
    try {
        await assert.rejects(
            extractPdfText("https://example.com/doc.pdf"),
            (err) => err.code === "FETCH_FAILED" && /network down/.test(err.message)
        );
    } finally {
        global.fetch = originalFetch;
        cleanupMocks();
    }
});

test("extractPdfText: fetch HTTP 404 → code=FETCH_FAILED", async () => {
    const { extractPdfText } = installMocks(makePdfjsMock());
    const originalFetch = global.fetch;
    global.fetch = async () => ({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) });
    try {
        await assert.rejects(
            extractPdfText("https://example.com/doc.pdf"),
            (err) => err.code === "FETCH_FAILED" && /404/.test(err.message)
        );
    } finally {
        global.fetch = originalFetch;
        cleanupMocks();
    }
});

test("extractPdfText: fetch OK + parsing OK → retorna text", async () => {
    const { extractPdfText } = installMocks(makePdfjsMock({
        numPages: 2,
        pageTexts: [
            ["Fetched", "PDF", "content", "first page with enough characters to pass scanned detection"],
            ["Second", "page", "with", "more sufficient text"]
        ]
    }));
    const originalFetch = global.fetch;
    global.fetch = async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(64)
    });
    try {
        const result = await extractPdfText("https://example.com/doc.pdf");
        assert.equal(result.pageCount, 2);
        assert.match(result.text, /Fetched PDF content/);
    } finally {
        global.fetch = originalFetch;
        cleanupMocks();
    }
});

// ---------------------------------------------------------------------------
// Worker init
// ---------------------------------------------------------------------------

test("extractPdfText: inicialitza el worker amb ext.runtime.getURL", async () => {
    const longText = "enough text here to pass scanned detection threshold yes indeed. ".repeat(3);
    const pdfjsMock = makePdfjsMock({
        numPages: 1,
        pageTexts: [[longText]]
    });
    const { extractPdfText } = installMocks(pdfjsMock);
    await extractPdfText(new ArrayBuffer(8));
    assert.equal(pdfjsMock.GlobalWorkerOptions.workerSrc, "chrome-extension://mock/vendor/pdf.worker.min.js");
    cleanupMocks();
});

// ---------------------------------------------------------------------------
// Truncació suau
// ---------------------------------------------------------------------------

test("extractPdfText: respecta maxChars i marca truncated", async () => {
    // 3 pàgines de ~500 chars cadascuna, maxChars=600 → trunca després de pàgina 2
    const longPage = "word ".repeat(100);  // ~500 chars
    const { extractPdfText } = installMocks(makePdfjsMock({
        numPages: 3,
        pageTexts: [[longPage], [longPage], [longPage]]
    }));
    const result = await extractPdfText(new ArrayBuffer(8), { maxChars: 600 });
    assert.equal(result.metadata.truncated, true);
    assert.ok(result.metadata.extractedPages < 3, "no hauria d'haver processat les 3 pàgines");
    cleanupMocks();
});

// ---------------------------------------------------------------------------
// looksLikePdfByHead
// ---------------------------------------------------------------------------

test("looksLikePdfByHead: retorna true si Content-Type es application/pdf", async () => {
    const { looksLikePdfByHead } = require("../sidebar/pdf-extract.js");
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
        assert.equal(opts.method, "HEAD");
        return {
            ok: true,
            headers: { get: (k) => k.toLowerCase() === "content-type" ? "application/pdf" : null },
        };
    };
    try {
        const result = await looksLikePdfByHead("https://arxiv.org/pdf/2401.12345");
        assert.equal(result, true);
    } finally {
        globalThis.fetch = origFetch;
    }
});

test("looksLikePdfByHead: retorna false si Content-Type es text/html", async () => {
    const { looksLikePdfByHead } = require("../sidebar/pdf-extract.js");
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
        ok: true,
        headers: { get: () => "text/html; charset=utf-8" },
    });
    try {
        const result = await looksLikePdfByHead("https://example.com/page");
        assert.equal(result, false);
    } finally {
        globalThis.fetch = origFetch;
    }
});

test("looksLikePdfByHead: retorna false per URLs no-HTTPS sense fer fetch", async () => {
    const { looksLikePdfByHead } = require("../sidebar/pdf-extract.js");
    let fetchCalled = false;
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => { fetchCalled = true; return {}; };
    try {
        assert.equal(await looksLikePdfByHead("http://example.com/foo"), false);
        assert.equal(await looksLikePdfByHead("file:///tmp/x.pdf"), false);
        assert.equal(await looksLikePdfByHead(""), false);
        assert.equal(await looksLikePdfByHead(null), false);
        assert.equal(fetchCalled, false, "no s'ha de cridar fetch per URLs no-HTTPS");
    } finally {
        globalThis.fetch = origFetch;
    }
});

test("looksLikePdfByHead: retorna false (no llanca) si fetch falla", async () => {
    const { looksLikePdfByHead } = require("../sidebar/pdf-extract.js");
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error("network down"); };
    try {
        const result = await looksLikePdfByHead("https://example.com/x");
        assert.equal(result, false);
    } finally {
        globalThis.fetch = origFetch;
    }
});

test("looksLikePdfByHead: retorna false si resposta no-ok (404)", async () => {
    const { looksLikePdfByHead } = require("../sidebar/pdf-extract.js");
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
        ok: false,
        status: 404,
        headers: { get: () => "application/pdf" },
    });
    try {
        const result = await looksLikePdfByHead("https://example.com/missing");
        assert.equal(result, false);
    } finally {
        globalThis.fetch = origFetch;
    }
});
