/**
 * tests/api.test.mjs
 * Tests unitaris per a sidebar/api.js (funcions pures)
 * Execució: node --test tests/api.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getCuratedModelInfo, CURATED_MODELS } = require("../sidebar/api.js");

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
    }
});

test("CURATED_MODELS - el primer model és el de major qualitat (gemini-2.5-pro)", () => {
    assert.equal(CURATED_MODELS[0].id, "gemini-2.5-pro");
});
