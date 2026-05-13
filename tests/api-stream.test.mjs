/**
 * tests/api-stream.test.mjs
 * Tests unitaris per al SSE parser de callGeminiStream (sidebar/api.js)
 * Execució: node --test tests/api-stream.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ReadableStream } from "node:stream/web";

const require = createRequire(import.meta.url);
const { CURATED_MODELS, EUR_RATE } = require("../shared/models.js");
global.CURATED_MODELS = CURATED_MODELS;
global.EUR_RATE = EUR_RATE;
const { callGeminiStream } = require("../sidebar/api.js");

const DUMMY_KEY   = "key-test";
const DUMMY_MODEL = "gemini-2.0-flash";
const ABORT       = new AbortController().signal;

// Crea un ReadableStream a partir de fragments de text ja codificats
function makeStream(...chunks) {
    const enc = new TextEncoder();
    return new ReadableStream({
        start(ctrl) {
            for (const c of chunks) ctrl.enqueue(enc.encode(c));
            ctrl.close();
        }
    });
}

// Substitueix global.fetch amb una resposta mockejada
function mockFetch(stream, status = 200) {
    global.fetch = async () => ({
        ok:         status >= 200 && status < 300,
        status,
        statusText: status === 200 ? "OK" : "HTTP Error",
        headers:    { get: (h) => h.toLowerCase() === "content-type" ? "text/event-stream" : null },
        json:       async () => ({ error: { message: `Error ${status}` } }),
        body:       stream
    });
}

// Línia SSE ben formada
function dataLine(obj) {
    return `data: ${JSON.stringify(obj)}\n\n`;
}

// ---------------------------------------------------------------------------
// Cas bàsic: un sol chunk amb un sol fragment de text
// ---------------------------------------------------------------------------
test("callGeminiStream - un chunk retorna el text esperat via onChunk", async () => {
    const payload = dataLine({ candidates: [{ content: { parts: [{ text: "hola" }] } }] });
    mockFetch(makeStream(payload));

    const chunks = [];
    await callGeminiStream(DUMMY_KEY, DUMMY_MODEL, "", "", ABORT, t => chunks.push(t), null);
    assert.deepEqual(chunks, ["hola"]);
});

// ---------------------------------------------------------------------------
// Línia data: dividida entre 2 chunks (buffer del parser)
// ---------------------------------------------------------------------------
test("callGeminiStream - línia data: partida entre dos chunks es processa correctament", async () => {
    const line = dataLine({ candidates: [{ content: { parts: [{ text: "hola món" }] } }] });
    // Partim la línia per la meitat per simular un chunk tallat a meitat de xarxa
    const mid = Math.floor(line.length / 2);
    mockFetch(makeStream(line.slice(0, mid), line.slice(mid)));

    const chunks = [];
    await callGeminiStream(DUMMY_KEY, DUMMY_MODEL, "", "", ABORT, t => chunks.push(t), null);
    assert.deepEqual(chunks, ["hola món"]);
});

// ---------------------------------------------------------------------------
// Sentinel [DONE] final s'ignora sense error
// ---------------------------------------------------------------------------
test("callGeminiStream - sentinel [DONE] s'ignora sense excepció", async () => {
    const payload = dataLine({ candidates: [{ content: { parts: [{ text: "fi" }] } }] })
                  + "data: [DONE]\n\n";
    mockFetch(makeStream(payload));

    const chunks = [];
    await assert.doesNotReject(
        callGeminiStream(DUMMY_KEY, DUMMY_MODEL, "", "", ABORT, t => chunks.push(t), null)
    );
    assert.deepEqual(chunks, ["fi"]);
});

// ---------------------------------------------------------------------------
// part.thought: true s'ignora (thinking models)
// ---------------------------------------------------------------------------
test("callGeminiStream - part.thought:true s'ignora", async () => {
    const payload = dataLine({
        candidates: [{
            content: {
                parts: [
                    { text: "raonament intern", thought: true },
                    { text: "resposta real" }
                ]
            }
        }]
    });
    mockFetch(makeStream(payload));

    const chunks = [];
    await callGeminiStream(DUMMY_KEY, DUMMY_MODEL, "", "", ABORT, t => chunks.push(t), null);
    assert.deepEqual(chunks, ["resposta real"]);
});

// ---------------------------------------------------------------------------
// usageMetadata crida onUsage amb els valors correctes
// ---------------------------------------------------------------------------
test("callGeminiStream - usageMetadata crida onUsage correctament", async () => {
    const usage = { promptTokenCount: 10, candidatesTokenCount: 20, cachedContentTokenCount: 5 };
    const payload = dataLine({ candidates: [{ content: { parts: [{ text: "x" }] } }], usageMetadata: usage });
    mockFetch(makeStream(payload));

    let capturedUsage = null;
    const result = await callGeminiStream(
        DUMMY_KEY, DUMMY_MODEL, "", "", ABORT,
        () => {},
        meta => { capturedUsage = meta; }
    );

    assert.deepEqual(capturedUsage, usage);
    assert.equal(result.inputTokens, 10);
    assert.equal(result.outputTokens, 20);
    assert.equal(result.cacheTokens, 5);
});

// ---------------------------------------------------------------------------
// usageMetadata absent → retorna zeros
// ---------------------------------------------------------------------------
test("callGeminiStream - sense usageMetadata retorna zeros", async () => {
    const payload = dataLine({ candidates: [{ content: { parts: [{ text: "x" }] } }] });
    mockFetch(makeStream(payload));

    const result = await callGeminiStream(DUMMY_KEY, DUMMY_MODEL, "", "", ABORT, () => {}, null);
    assert.equal(result.inputTokens, 0);
    assert.equal(result.outputTokens, 0);
    assert.equal(result.cacheTokens, 0);
});

// ---------------------------------------------------------------------------
// Error HTTP 401 llança missatge classificable
// ---------------------------------------------------------------------------
test("callGeminiStream - HTTP 401 llança error amb codi [007]", async () => {
    mockFetch(null, 401);
    await assert.rejects(
        callGeminiStream(DUMMY_KEY, DUMMY_MODEL, "", "", ABORT, () => {}, null),
        err => {
            assert.ok(err.message.includes("[007]"), `Missatge sense [007]: ${err.message}`);
            assert.ok(err.message.includes("401"), `Missatge sense 401: ${err.message}`);
            return true;
        }
    );
});

// ---------------------------------------------------------------------------
// Error HTTP 429 llança missatge classificable
// ---------------------------------------------------------------------------
test("callGeminiStream - HTTP 429 llança error amb codi [007]", async () => {
    mockFetch(null, 429);
    await assert.rejects(
        callGeminiStream(DUMMY_KEY, DUMMY_MODEL, "", "", ABORT, () => {}, null),
        err => {
            assert.ok(err.message.includes("[007]"), `Missatge sense [007]: ${err.message}`);
            assert.ok(err.message.includes("429"), `Missatge sense 429: ${err.message}`);
            return true;
        }
    );
});

// ---------------------------------------------------------------------------
// Error HTTP 500 llança missatge classificable
// ---------------------------------------------------------------------------
test("callGeminiStream - HTTP 500 llança error amb codi [007]", async () => {
    mockFetch(null, 500);
    await assert.rejects(
        callGeminiStream(DUMMY_KEY, DUMMY_MODEL, "", "", ABORT, () => {}, null),
        err => {
            assert.ok(err.message.includes("[007]"), `Missatge sense [007]: ${err.message}`);
            assert.ok(err.message.includes("500"), `Missatge sense 500: ${err.message}`);
            return true;
        }
    );
});

// ---------------------------------------------------------------------------
// Múltiples fragments de text en un sol chunk
// ---------------------------------------------------------------------------
test("callGeminiStream - múltiples parts en un sol chunk criden onChunk per cadascuna", async () => {
    const payload = dataLine({
        candidates: [{
            content: {
                parts: [{ text: "un" }, { text: "dos" }, { text: "tres" }]
            }
        }]
    });
    mockFetch(makeStream(payload));

    const chunks = [];
    await callGeminiStream(DUMMY_KEY, DUMMY_MODEL, "", "", ABORT, t => chunks.push(t), null);
    assert.deepEqual(chunks, ["un", "dos", "tres"]);
});
