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
const { CURATED_MODELS, DEFAULT_MODEL_ID, EUR_RATE } = require("../shared/models.js");
global.CURATED_MODELS = CURATED_MODELS;
global.EUR_RATE = EUR_RATE;
const { getCuratedModelInfo } = require("../sidebar/api.js");

// ---------------------------------------------------------------------------
// getCuratedModelInfo
// ---------------------------------------------------------------------------

test("getCuratedModelInfo - model conegut retorna label i rpd correctes", () => {
    const info = getCuratedModelInfo("gemini-2.0-flash");
    assert.equal(info.label, "Gemini 2.0 Flash");
    assert.equal(info.rpd, 1500);
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

test("getCuratedModelInfo - gemini-2.0-flash-lite té RPD pràcticament il·limitat", () => {
    const info = getCuratedModelInfo("gemini-2.0-flash-lite");
    assert.ok(info.rpd > 100000, "Flash Lite ha de tenir RPD molt elevat");
});

// ---------------------------------------------------------------------------
// CURATED_MODELS (estructura de dades)
// ---------------------------------------------------------------------------

test("CURATED_MODELS conté exactament 5 models", () => {
    assert.equal(CURATED_MODELS.length, 5);
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

test("CURATED_MODELS - el primer model és el de major qualitat (gemini-2.5-pro)", () => {
    assert.equal(CURATED_MODELS[0].id, "gemini-2.5-pro");
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
