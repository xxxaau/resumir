/**
 * tests/api.test.mjs
 * Tests unitaris per a sidebar/api.js (funcions pures)
 * Execució: node --test tests/api.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Carregar shared/models.js primer i exposar com a global
// (simula l'ordre de <script> al navegador: models.js → api.js)
const { CURATED_MODELS, DEFAULT_MODEL_ID, DEFAULT_MODEL_INFO, EUR_RATE } = require("../shared/models.js");
global.CURATED_MODELS = CURATED_MODELS;
global.DEFAULT_MODEL_INFO = DEFAULT_MODEL_INFO;
global.EUR_RATE = EUR_RATE;
const { getCuratedModelInfo } = require("../sidebar/api.js");

// ---------------------------------------------------------------------------
// getCuratedModelInfo
// ---------------------------------------------------------------------------

test("getCuratedModelInfo - model conegut retorna label i rpd correctes", () => {
    const info = getCuratedModelInfo("gemini-3.1-flash-lite");
    assert.equal(info.label, "Gemini 3.1 Flash Lite");
    assert.equal(info.rpd, 2000);
    assert.ok(info.priceIn > 0, "priceIn ha de ser positiu");
    assert.ok(info.priceOut > 0, "priceOut ha de ser positiu");
});

test("getCuratedModelInfo - model desconegut usa valors de fallback", () => {
    const info = getCuratedModelInfo("some-unknown-model-xyz");
    assert.equal(info.label, "some-unknown-model-xyz");
    assert.equal(info.rpd, 1500);
});

test("getCuratedModelInfo - variant -latest coincideix amb el model base", () => {
    const info = getCuratedModelInfo("gemini-2.5-flash-latest");
    assert.equal(info.label, "Gemini 2.5 Flash");
});

test("getCuratedModelInfo - gemini-2.5-pro té el RPD més baix (recursos limitats)", () => {
    const info = getCuratedModelInfo("gemini-2.5-pro");
    assert.equal(info.rpd, 50);
});

test("getCuratedModelInfo - gemini-3.1-flash-lite té el RPD més alt dels models curats", () => {
    const info = getCuratedModelInfo("gemini-3.1-flash-lite");
    assert.equal(info.rpd, 2000);
});

// ---------------------------------------------------------------------------
// CURATED_MODELS (estructura de dades)
// ---------------------------------------------------------------------------

test("CURATED_MODELS conté els models clau esperats", () => {
    assert.ok(CURATED_MODELS.length >= 1, "Ha d'haver-hi almenys un model");
    assert.ok(CURATED_MODELS.some(m => m.id === "gemini-3.5-flash"), "Ha d'existir gemini-3.5-flash");
    assert.ok(CURATED_MODELS.some(m => m.id === "gemini-3.1-flash-lite"), "Ha d'existir gemini-3.1-flash-lite");
    assert.ok(CURATED_MODELS.some(m => m.id === "gemini-2.5-pro"), "Ha d'existir gemini-2.5-pro");
});

test("CURATED_MODELS - tots els models tenen els camps requerits", () => {
    for (const model of CURATED_MODELS) {
        assert.ok(model.id, `Model sense id: ${JSON.stringify(model)}`);
        assert.ok(model.label, `Model sense label: ${model.id}`);
        assert.ok(typeof model.priceIn === "number", `priceIn no és número: ${model.id}`);
        assert.ok(typeof model.priceOut === "number", `priceOut no és número: ${model.id}`);
        assert.ok(typeof model.rpd === "number", `rpd no és número: ${model.id}`);
        assert.ok(typeof model.fallback === "boolean", `fallback no és booleà: ${model.id}`);
    }
});

test("CURATED_MODELS - el primer model és el model per defecte (gemini-3.1-flash-lite)", () => {
    assert.equal(CURATED_MODELS[0].id, "gemini-3.1-flash-lite");
});

// ---------------------------------------------------------------------------
// DEFAULT_MODEL_ID
// ---------------------------------------------------------------------------

test("DEFAULT_MODEL_ID és un ID vàlid dins CURATED_MODELS", () => {
    assert.ok(
        CURATED_MODELS.some(m => m.id === DEFAULT_MODEL_ID),
        `DEFAULT_MODEL_ID '${DEFAULT_MODEL_ID}' no és a CURATED_MODELS`
    );
});

test("DEFAULT_MODEL_ID és un string no buit", () => {
    assert.ok(typeof DEFAULT_MODEL_ID === "string" && DEFAULT_MODEL_ID.length > 0);
});

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

// ---------------------------------------------------------------------------
// Comprovació de la clau d'API (onboarding dins del panell)
// ---------------------------------------------------------------------------
import { createRequire as _createRequire } from "node:module";
const _api = _createRequire(import.meta.url)("../sidebar/api.js");

test("normalizeApiKey - treu espais, cometes i el prefix «Bearer»", () => {
    assert.equal(_api.normalizeApiKey("  AIzaABC  \n"), "AIzaABC");
    assert.equal(_api.normalizeApiKey('"AIzaABC"'), "AIzaABC");
    assert.equal(_api.normalizeApiKey("Bearer AIzaABC"), "AIzaABC");
    assert.equal(_api.normalizeApiKey(undefined), "");
});

test("looksLikeGeminiKey - reconeix el format AIza… sense bloquejar la resta", () => {
    assert.equal(_api.looksLikeGeminiKey("AIza" + "x".repeat(35)), true);
    assert.equal(_api.looksLikeGeminiKey("sk-1234"), false);
});

test("describeKeyCheck - cada codi dona un missatge accionable en català", () => {
    assert.equal(_api.describeKeyCheck(200).ok, true);
    assert.match(_api.describeKeyCheck(400).message, /no és vàlida/);
    assert.match(_api.describeKeyCheck(403).message, /rebutjat/);
    assert.match(_api.describeKeyCheck(429).message, /límit gratuït/);
    assert.match(_api.describeKeyCheck(503).message, /no està disponible/);
    assert.match(_api.describeKeyCheck(null).message, /connexió/);
    for (const code of [400, 403, 429, 503, null, 418]) assert.equal(_api.describeKeyCheck(code).ok, false);
});

test("verifyApiKey - una clau buida no fa cap petició", async () => {
    let called = false;
    global.fetch = async () => { called = true; return { status: 200 }; };
    const r = await _api.verifyApiKey("   ");
    assert.equal(r.ok, false);
    assert.equal(called, false);
});

test("verifyApiKey - envia la clau neta per capçalera i retorna ok amb un 200", async () => {
    let seen = null;
    global.fetch = async (url, opts) => { seen = { url, opts }; return { status: 200 }; };
    const r = await _api.verifyApiKey(" Bearer AIzaABC ");
    assert.equal(r.ok, true);
    assert.equal(r.key, "AIzaABC");
    assert.equal(seen.opts.headers["x-goog-api-key"], "AIzaABC");
    assert.ok(!seen.url.includes("AIzaABC"), "La clau no ha d'anar a la URL");
});

test("verifyApiKey - un error de xarxa dona el missatge de connexió", async () => {
    global.fetch = async () => { throw new TypeError("Failed to fetch"); };
    const r = await _api.verifyApiKey("AIzaABC");
    assert.equal(r.ok, false);
    assert.match(r.message, /connexió/);
});
